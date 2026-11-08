/* G-Procure PP-salygos - pasiūlymo formos kainų lentelė iš rengėjo kiekių žiniaraščio (2026-11-08; naudotojo užduotis - kainų lentelė iš
   Excel, sprendimas „Abu būdai, siūlo pagal kiekį“). Be DI, tik naršyklėje.

   Išmatuota su 21 viešu CVP IS paketu (2026-11-08): 14-oje kainų lentelė pasiūlymo formoje (1-11 pozicijų), 5-iuose - atskiras Excel su
   formulėmis kaip formos priedas (18-41 pozicija; darbų žiniaraštis, prekių sąrašas, draudimo rizikos). Todėl du būdai:
     - „forma“: pozicijos (pavadinimas, matavimo vienetai, kiekis) įrašomos į pasiūlymo formos kainų lentelę vietoj šablono eilučių
       „1.“, „2.“, „...“; įkainio ir kainos langeliai lieka tušti tiekėjui;
     - „priedas“: rengėjo Excel failas pridedamas be pakeitimų kaip „Pasiūlymo formos 1 priedas“, o formos lentelėje - viena eilutė su
       nuoroda į jį.
   Siūloma pagal pozicijų skaičių (iki RIBA - forma), galutinai renkasi rengėjas.

   Kertinė taisyklė: planuojami įkainiai ir kainos (iš jų matyti numatoma vertė) niekada neperkeliami. Jei jie užpildyti Excel faile, failo
   pridėti priedu negalima (būdas „priedas“ neleidžiamas), kol rengėjas jų neištrins; į formą perkeliami tik pavadinimai, vienetai ir kiekiai.
   Paslėpti lapai, eilutės ir stulpeliai su duomenimis - taip pat kliūtis priedui (jie būtų paskelbti kartu su failu).

   API (window.GP_KAINU_LENTELE):
     skaitykXlsx(buf, failas)   -> { kandidatai: [M], lapai, klaida } (reikia window.XLSX - SheetJS)
     isBloku(blokai, failas)    -> { kandidatai: [M] } - DOCX lentelės iš GP_DOK blokų (langeliai `cells`)
     raskLentele(eilutes)       -> { antraste, st, eilutes } | null - viena lentelė iš langelių matricos
     rekomenduojamasBudas(M)    -> 'forma' | 'priedas'
     kliutysPriedui(M)          -> [tekstas] - kodėl Excel failo negalima pridėti priedu
     irasyk(xmlDoc, M, o)       -> ataskaita | null - įrašo į pasiūlymo formos kainų lentelę (-es)
   M: { failas, lapas, eilutes: [{ nr, pav, en, vnt, kiekis, dalis, grupe }], kiekioRusis, kiekioTekstas, kainos: { uzpildyta, vietos, formules },
        tiekejo: [stulpelių pavadinimai], paslepta: { lapai, eilutes, stulpeliai }, dalys: [numeriai], xlsx }
*/
(function(root){
  'use strict';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const XML_NS = 'http://www.w3.org/XML/1998/namespace';
  const RIBA = 20;                  // iki tiek pozicijų - siūloma pasiūlymo formos lentelė, daugiau - Excel priedas
  const MAX_EIL = 2000;             // daugiau eilučių neskaitome (priedui failas vis tiek pridedamas kaip yra)
  const VERTIMO_ZYMA = 'Įrašykite vertimą į anglų kalbą.';
  const KIEKIO_RUSYS = {
    maksimalus: { lt: 'Maksimalus kiekis', en: 'Maximum amount' },
    preliminarus: { lt: 'Preliminarus kiekis', en: 'Preliminary amount' },
    konkretus: { lt: 'Konkretus kiekis', en: 'Precise amount' }
  };
  const PRIEDO_PAV = { lt: 'Pasiūlymo formos 1 priedas', en: 'Annex 1 to the Tender form', pavLt: 'Kainų lentelė', pavEn: 'Price table' };

  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ \s]+/g, ' ').trim();
  const bruksniai = s => String(s == null ? '' : s).replace(/[–—]/g, '-');
  const tekstasL = c => { const v = c && typeof c === 'object' ? (c.w != null ? c.w : c.v) : c; return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); };

  /* ---------- Stulpelių atpažinimas (antraštės tekstas be diakritikų) ---------------------------------------------------------------- */
  // tiekėjo pildomi stulpeliai („Gamintojas ir modelis (nurodo Tiekėjas)“) - ne kaina; pasiūlymo formos lentelėje tokių nėra
  const TIEKEJO_RE = /(nurodo|pildo|uzpildo|iraso|irasys|siulo)\s+tiekej|tiekejo\s+(siulom|pildom)|to be (filled|completed|indicated) by the (supplier|tenderer)/;
  // kaina, kurią pildo tiekėjas (įkainis, kaina); suma - tik su PVM ar EUR be PVM nuoroda („Suma, Eur be PVM“), ne parametras („Draudimo suma, Eur“)
  const KAINA_RE = /(ikain|kain[aoųu]\b|kainos|price|rate\b|unit cost)/;
  const SUMA_RE = /(^|\s)(suma|sum|amount|total|is viso)\b.*\b(pvm|vat)\b/;
  const KIEKIS_RE = /(kiek|quantit|\bqty\b)/;
  const VNT_RE = /^(mato|matavimo|mat\.?)\s*(vnt|vienet)|^vnt\.?($|\s|\/)|^vienetai($|\s|\/)|measurement unit|^units?($|\s)|^uom($|\s)/;
  const NR_RE = /^(eil\.?\s*(nr\.?)?|ei\.?\s*nr\.?|nr\.?|no\.?|#|poz\.?|pozicija|item no\.?)(\s*\/\s*(no\.?|nr\.?))?$/;
  const PAV_RE = /(pavadinim|pirkimo objekt|^objektas|preke|prekes|paslaug|darb(ai|u|o|as)\b|aprasym|description|\bitems?\b|\bname\b|\bgoods\b|\bservices?\b|\bworks?\b)/;
  const DALIS_RE = /^(pirkimo\s+)?(objekto\s+)?dal(is|ies)(\s+nr\.?)?$|^\b(part|lot)\b/;
  const EN_RE = /(english|anglu|angliskai|\(en\)|\ben\b|\bname in en)/;

  function stulpeliai(antraste){
    const st = { nr: -1, pav: -1, en: -1, vnt: -1, kiekis: -1, dalis: -1, kaina: [], tiekejo: [], kiti: [] };
    antraste.forEach((t0, i) => {
      const t = norm(t0);
      if (!t) return;
      if (KIEKIS_RE.test(t) && !KAINA_RE.test(t)){ if (st.kiekis < 0) st.kiekis = i; else st.kiti.push(i); return; }
      if ((KAINA_RE.test(t) || SUMA_RE.test(t)) && !/(procent|percent|%)/.test(t)){ st.kaina.push(i); return; }
      if (TIEKEJO_RE.test(t)){ st.tiekejo.push(i); return; }
      if (VNT_RE.test(t)){ if (st.vnt < 0) st.vnt = i; else st.kiti.push(i); return; }
      if (DALIS_RE.test(t)){ if (st.dalis < 0) st.dalis = i; return; }
      if (NR_RE.test(t) && t.length <= 20){ if (st.nr < 0) st.nr = i; return; }
      if (PAV_RE.test(t) && st.pav < 0){ st.pav = i; return; }
      if (PAV_RE.test(t) && st.en < 0 && EN_RE.test(t)){ st.en = i; return; }
      st.kiti.push(i);
    });
    // pavadinimo stulpelis be atpažįstamo žodžio („Draudimo rizikos“): kainų lentelėje - pirmas kitas stulpelis po eilės numerio
    if (st.pav < 0 && st.kaina.length && st.nr >= 0){ const k = st.kiti.find(i => i > st.nr); if (k != null){ st.pav = k; st.kiti = st.kiti.filter(i => i !== k); } }
    return st;
  }
  // kiekių ar kainų lentelė: pozicijos pavadinimas ir kiekis arba tiekėjo pildoma kaina (vien vienetų nepakanka - klasifikatoriai, sąrašai)
  const tinka = st => st.pav >= 0 && (st.kiekis >= 0 || st.kaina.length > 0);
  const balas = st => ['nr', 'pav', 'vnt', 'kiekis', 'dalis'].filter(k => st[k] >= 0).length + (st.kaina.length ? 1 : 0);

  /* Kiekio rūšis iš antraštės („Preliminarus kiekis“, „Maksimalus kiekis“, „Konkretus kiekis“) - siūlymas */
  function kiekioRusis(t){
    const n = norm(t);
    if (/maksimal|maximum/.test(n)) return 'maksimalus';
    if (/preliminar|numatom|apytiksl|estimated|approximate/.test(n)) return 'preliminarus';
    if (/konkret|tiksl|precise|exact/.test(n)) return 'konkretus';
    return null;
  }

  /* Romėniški ir arabiški dalių numeriai („I“, „2“, „2 dalis“, „II dalis“, „Lot 3“) */
  const ROM = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  function dalisIs(t){
    const n = norm(t).replace(/[.,;:]+$/, '');
    if (!n) return null;
    let m = /^(\d{1,2})(\s|$|\s*dal|\s*-)/.exec(n) || /(?:dalis|dalies|part|lot)\s*(?:nr\.?\s*)?(\d{1,2})\b/.exec(n);
    if (m) return +m[1] || null;
    // romėniški - tik didžiosiomis („II“, „IV dalis“) arba po žodžio „dalis“ / „part“ / „lot“: mažoji „x“ - pildoma vieta, ne dešimta dalis
    m = (/^([IVX]{1,4})(\s|$|\s*dal|\s*-)/.test(String(t).trim()) ? /^([ivx]{1,4})/.exec(n) : null) || /(?:dalis|dalies|part|lot)\s*([ivx]{1,4})\b/.exec(n);
    return m && ROM[m[1]] ? ROM[m[1]] : null;
  }
  /* Lapo pavadinimas kaip dalis: „1 dalis“, „I dalis“, „Dalis 2“, „Lot 1“, „Part II“ (kitaip - null) */
  const lapoDalis = v => /(^|\s)(dal(is|ies)|part|lot)(\s|$)/i.test(norm(v)) ? dalisIs(v) : null;

  const SUMOS_RE = /^(is viso|isviso|viso|bendra (suma|kaina|pasiulymo kaina)|suma\b|total|pvm\b|vat\b|pasiulymo kaina|kaina su pvm|kaina be pvm|grand total|subtotal|tarpine suma)/;
  const NUMERIU_EIL = cells => { const sk = cells.filter(c => c !== ''); return sk.length >= 3 && sk.every((c, i) => String(c) === String(i + 1)); };

  /* Viena lentelė iš langelių matricos: rows - [[{ t, v, f, skaicius }]] (t - rodomas tekstas). Antraštė - eilutė per pirmas 25, kurioje
     atpažinta daugiausia stulpelių (būtini: pavadinimas ir kiekis ar vienetai); dvieilutė antraštė - sujungiama. */
  function raskLentele(rows){
    let geriausia = null;
    const lim = Math.min(rows.length, 25);
    for (let r = 0; r < lim; r++){
      const a = (rows[r] || []).map(c => c ? c.t : '');
      const kand = [a];
      if (rows[r + 1]) kand.push(a.map((x, i) => (x + ' ' + ((rows[r + 1][i] || {}).t || '')).trim()));
      kand.forEach((h, k) => {
        const st = stulpeliai(h);
        if (!tinka(st)) return;
        const b = balas(st) - k * 0.5;
        if (!geriausia || b > geriausia.b) geriausia = { r: r + k, st, antraste: h, b };
      });
    }
    if (!geriausia) return null;
    const { st } = geriausia, out = [];
    let tuscios = 0;
    for (let r = geriausia.r + 1; r < rows.length && out.length < MAX_EIL; r++){
      const row = rows[r] || [];
      const tx = i => i >= 0 && row[i] ? row[i].t : '';
      const vis = row.map(c => c ? c.t : '');
      if (!vis.some(x => x !== '')){ if (++tuscios >= 20) break; continue; }
      tuscios = 0;
      if (NUMERIU_EIL(vis)) continue;                              // stulpelių numerių eilutė „1 | 2 | 3 | 4“
      const pav = tx(st.pav), pirmas = vis.find(x => x !== '') || '';
      if (vis.filter(x => x !== '').slice(0, 2).some(x => SUMOS_RE.test(norm(x)))) break;   // sumų eilutės - lentelės galas
      if (!pav) continue;
      const kiekis = tx(st.kiekis), vnt = tx(st.vnt), nr = tx(st.nr);
      // grupės antraštė: be kiekio ir vienetų (kai tokie stulpeliai yra), o be jų - be eilės numerio ir be kitų duomenų eilutėje
      const grupe = st.kiekis >= 0 || st.vnt >= 0 ? !kiekis && !vnt : !nr && vis.filter(x => x !== '').length <= 1;
      out.push({ nr, pav, en: tx(st.en), vnt, kiekis, kiekisSk: st.kiekis >= 0 && row[st.kiekis] ? row[st.kiekis].skaicius : null,
                 dalis: st.dalis >= 0 ? dalisIs(tx(st.dalis)) : null, grupe, r });
    }
    // grupės eilutė tik tada, kai po jos yra pozicijų (paskutinė „grupė“ be pozicijų - pastaba ar paaiškinimas, ne lentelės dalis)
    while (out.length && out[out.length - 1].grupe) out.pop();
    const poz = out.filter(e => !e.grupe);
    if (!poz.length) return null;
    // kiekių lentelė - kiekiai dažniausiai skaičiai (reikalavimų, rizikų ar funkcijų sąrašuose stulpelis „kiekis“ - tekstas ar balai)
    if (st.kiekis >= 0 && poz.filter(e => e.kiekisSk != null || /^\d/.test(e.kiekis)).length < poz.length / 2) return null;
    // kainų lentelė be kiekio - kainos langeliai tušti arba formulės (pildo tiekėjas)
    if (st.kiekis < 0 && !poz.some(e => st.kaina.some(c => { const x = (rows[e.r] || [])[c]; return !x || x.t === '' || x.f || x.skaicius === 0; }))) return null;
    // kiti stulpeliai su duomenimis („Draudimo suma“, „Išskaita“) - pasiūlymo formos lentelėje jų nėra
    const kitiSu = st.kiti.filter(i => (geriausia.antraste[i] || '').trim() && out.some(e => !e.grupe && rows[e.r] && rows[e.r][i] && rows[e.r][i].t !== ''));
    return { antraste: geriausia.antraste, st, r: geriausia.r, eilutes: out, kitiSu };
  }

  /* Kainos langeliai: užpildyta reikšmė (skaičius, ne formulė, ne 0) - iš jos matyti numatoma vertė */
  function kainuBusena(rows, L){
    const K = { uzpildyta: 0, vietos: [], formules: 0 };
    L.st.kaina.forEach(c => {
      L.eilutes.forEach(e => {
        const x = (rows[e.r] || [])[c];
        if (!x) return;
        if (x.f) { K.formules++; return; }
        if (x.skaicius != null && x.skaicius !== 0){ K.uzpildyta++; if (K.vietos.length < 5) K.vietos.push(L.antraste[c] + ', ' + (e.r + 1) + ' eil.'); }
      });
    });
    return K;
  }

  /* ---------- Excel (SheetJS) --------------------------------------------------------------------------------------------------------- */
  function skaitykXlsx(buf, failas){
    const X = root.XLSX;
    if (!X) throw new Error('Excel skaitymo biblioteka neįsikėlė');
    const wb = X.read(buf, { type: 'array', cellFormula: true, cellStyles: true, cellDates: false });
    const info = (wb.Workbook && wb.Workbook.Sheets) || [];
    const lapai = [], kandidatai = [];
    const pasleptiLapai = [];
    wb.SheetNames.forEach((vardas, si) => {
      const ws = wb.Sheets[vardas];
      const hidden = info[si] && info[si].Hidden ? true : false;
      const ref = ws && ws['!ref'];
      if (!ref){ lapai.push({ vardas, hidden, tuscias: true }); return; }
      const rg = X.utils.decode_range(ref);
      const rows = [];
      let skaiciu = 0;
      const eilIki = Math.min(rg.e.r, rg.s.r + MAX_EIL + 50);
      for (let r = rg.s.r; r <= eilIki; r++){
        const row = [];
        for (let c = rg.s.c; c <= Math.min(rg.e.c, rg.s.c + 60); c++){
          const cell = ws[X.utils.encode_cell({ r, c })];
          if (!cell){ row.push(null); continue; }
          const sk = cell.t === 'n' && isFinite(cell.v) ? cell.v : null;
          if (sk != null) skaiciu++;
          row.push({ t: tekstasL(cell), v: cell.v, f: cell.f || null, skaicius: sk });
        }
        rows.push(row);
      }
      // paslėptos eilutės ir stulpeliai su duomenimis (jie būtų paskelbti kartu su failu)
      const hr = (ws['!rows'] || []).map((x, i) => x && x.hidden ? i : -1).filter(i => i >= 0 && rows[i - rg.s.r] && rows[i - rg.s.r].some(c => c && c.t !== ''));
      const hc = (ws['!cols'] || []).map((x, i) => x && x.hidden ? i : -1).filter(i => i >= 0 && rows.some(row => row[i - rg.s.c] && row[i - rg.s.c].t !== ''));
      if (hidden && rows.some(row => row.some(c => c && c.t !== ''))) pasleptiLapai.push(vardas);
      lapai.push({ vardas, hidden, eiluciu: rows.length, skaiciu, pasleptosEil: hr.length, pasleptiSt: hc.length });
      if (hidden) return;
      const L = raskLentele(rows);
      if (!L) return;
      kandidatai.push(modelis(failas, vardas, L, kainuBusena(rows, L), { xlsx: true, lapoDalis: lapoDalis(vardas) }));
    });
    const paslepta = { lapai: pasleptiLapai, eilutes: lapai.reduce((a, l) => a + (l.pasleptosEil || 0), 0), stulpeliai: lapai.reduce((a, l) => a + (l.pasleptiSt || 0), 0) };
    kandidatai.forEach(M => { M.paslepta = paslepta; });
    // lapai kaip dalys („1 dalis“, „2 dalis“): kai kiekvienas kandidatas - kito numerio dalis, sujungiama į vieną modelį su dalimis
    const sujungtas = sujunkDalimis(kandidatai);
    return { kandidatai: sujungtas ? [sujungtas].concat(kandidatai) : kandidatai, lapai, klaida: '' };
  }
  function sujunkDalimis(K){
    if (K.length < 2 || !K.every(M => M.lapoDalis)) return null;
    const nr = K.map(M => M.lapoDalis);
    if (new Set(nr).size !== nr.length) return null;
    const S = Object.assign({}, K[0], { lapas: K.map(M => M.lapas).join(', '), eilutes: [], sujungta: true });
    K.slice().sort((a, b) => a.lapoDalis - b.lapoDalis).forEach(M => M.eilutes.forEach(e => S.eilutes.push(Object.assign({}, e, { dalis: M.lapoDalis }))));
    S.kainos = { uzpildyta: K.reduce((a, M) => a + M.kainos.uzpildyta, 0), vietos: K.reduce((a, M) => a.concat(M.kainos.vietos), []).slice(0, 5), formules: K.reduce((a, M) => a + M.kainos.formules, 0) };
    S.tiekejo = [...new Set(K.reduce((a, M) => a.concat(M.tiekejo), []))];
    S.dalys = [...new Set(S.eilutes.map(e => e.dalis))].sort((a, b) => a - b);
    return S;
  }
  function modelis(failas, lapas, L, kainos, o){
    const eilutes = L.eilutes.map(e => ({ nr: e.nr, pav: bruksniai(e.pav), en: bruksniai(e.en), vnt: e.vnt, kiekis: kiekioTekstas(e.kiekis, e.kiekisSk), dalis: e.dalis, grupe: e.grupe }));
    const kt = L.st.kiekis >= 0 ? L.antraste[L.st.kiekis] : '';
    const dalys = [...new Set(eilutes.filter(e => e.dalis).map(e => e.dalis))].sort((a, b) => a - b);
    return { failas, lapas, eilutes, kiekioRusis: kiekioRusis(kt), kiekioTekstas: kt, kainos: kainos || { uzpildyta: 0, vietos: [], formules: 0 },
             tiekejo: L.st.tiekejo.map(i => L.antraste[i]).filter(Boolean), papildomi: (L.kitiSu || []).map(i => L.antraste[i]), paslepta: { lapai: [], eilutes: 0, stulpeliai: 0 },
             dalys, xlsx: !!(o && o.xlsx), lapoDalis: (o && o.lapoDalis) || null, beVienetu: L.st.vnt < 0, beKiekio: L.st.kiekis < 0 };
  }
  /* Kiekis lietuvišku formatu („1 200“, „2,5“); tekstas („pagal poreikį“) - kaip įrašytas */
  function kiekioTekstas(t, sk){
    if (sk != null && isFinite(sk)) return new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 3 }).format(sk).replace(/ | /g, ' ');
    return String(t || '').trim();
  }

  /* ---------- DOCX ar ODT lentelės iš GP_DOK blokų (`cells` - visi eilutės langeliai) ---------------------------------------------- */
  function isBloku(blokai, failas){
    const pagal = new Map();
    (blokai || []).forEach(b => {
      if (!b || !b.loc || b.loc.table == null || !Array.isArray(b.cells)) return;
      if (!pagal.has(b.loc.table)) pagal.set(b.loc.table, []);
      pagal.get(b.loc.table).push(b);
    });
    const kandidatai = [];
    pagal.forEach((bb, ti) => {
      const rows = bb.sort((a, b) => a.loc.row - b.loc.row).map(b => b.cells.map(c => {
        const t = String(c || '').replace(/\s+/g, ' ').trim();
        const sk = /^-?\d[\d\s.,]*$/.test(t) && root.GP_MONEY ? root.GP_MONEY.parseSkaicius(t) : null;
        return { t, v: t, f: null, skaicius: sk };
      }));
      const L = raskLentele(rows);
      if (L) kandidatai.push(modelis(failas, (ti + 1) + '-oji lentelė', L, kainuBusena(rows, L), { xlsx: false }));
    });
    return { kandidatai, lapai: [], klaida: '' };
  }

  const pozicijos = M => (M && M.eilutes || []).filter(e => !e.grupe);
  /* Siūlomas būdas: Excel priedas, kai pozicijų daugiau nei RIBA arba lentelėje yra stulpelių, kurių formos lentelėje nėra (tiekėjo pildomi,
     papildomi duomenys), ar nėra kiekio; kitaip - formos lentelė. Iš Word lentelės - visada forma (priedu pridedamas tik Excel). */
  const rekomenduojamasBudas = M => !M || !M.xlsx ? 'forma'
    : (pozicijos(M).length > RIBA || (M.tiekejo || []).length || (M.papildomi || []).length || M.beKiekio) ? 'priedas' : 'forma';
  /* Kodėl siūloma - žmogui */
  function budoPriezastis(M){
    if (!M) return '';
    const n = pozicijos(M).length;
    if (!M.xlsx) return 'pozicijos iš Word lentelės - įrašomos į pasiūlymo formą';
    const p = [];
    if (n > RIBA) p.push(`pozicijų ${n} - daugiau nei ${RIBA}`);
    if ((M.tiekejo || []).length) p.push(`yra tiekėjo pildomų stulpelių (${M.tiekejo.join(', ')}), kurių formos lentelėje nėra`);
    if ((M.papildomi || []).length) p.push(`yra stulpelių, kurių formos lentelėje nėra (${M.papildomi.join(', ')})`);
    if (M.beKiekio) p.push('lentelėje nėra kiekio stulpelio');
    return p.length ? p.join('; ') : `pozicijų ${n} - ne daugiau kaip ${RIBA}, jos telpa pasiūlymo formos lentelėje`;
  }
  function kliutysPriedui(M){
    const out = [];
    if (!M) return out;
    if (!M.xlsx) out.push('pozicijos perkeltos iš Word ar kito dokumento lentelės - priedu pridedamas tik Excel failas');
    if (M.kainos.uzpildyta) out.push(`Excel faile užpildyti įkainiai ar kainos (${M.kainos.uzpildyta} lang.: ${M.kainos.vietos.join('; ')}) - iš jų matyti numatoma vertė; ištrinkite juos Excel programoje ir įkelkite failą iš naujo`);
    const p = M.paslepta || {};
    if (p.lapai.length) out.push(`paslėpti lapai su duomenimis (${p.lapai.join(', ')}) - jie būtų paskelbti kartu su failu`);
    if (p.eilutes || p.stulpeliai) out.push(`paslėptos eilutės ar stulpeliai su duomenimis (eilučių ${p.eilutes}, stulpelių ${p.stulpeliai}) - jie būtų paskelbti kartu su failu`);
    return out;
  }

  /* ---------- Įrašymas į pasiūlymo formą --------------------------------------------------------------------------------------------- */
  const vaikai = (el, ln) => el ? Array.from(el.childNodes).filter(x => x.nodeType === 1 && (!ln || x.localName === ln)) : [];
  const vaikas = (el, ln) => vaikai(el, ln)[0] || null;
  const visi = (el, ln) => el ? Array.from(el.getElementsByTagNameNS(W, ln)) : [];
  const tekstas = el => visi(el, 't').map(t => t.textContent).join('');
  const naujas = (doc, ln) => doc.createElementNS(W, 'w:' + ln);
  const raudonas = r => visi(r, 'color').some(c => /^FF0000$/i.test(c.getAttributeNS(W, 'val') || c.getAttribute('w:val') || ''));

  /* Kainų lentelės pasiūlymo formoje: pirmoje eilutėje - „Matavimo vienetai“ ir „kiekis“ (DPS LT forma - be jų, neliečiama) */
  function kainuLenteles(doc){
    const body = visi(doc, 'body')[0];
    return vaikai(body, 'tbl').filter(tbl => {
      const t = norm(tekstas(vaikai(tbl, 'tr')[0]));
      return /matavimo vienet/.test(t) && /kiek/.test(t) && /(ikain|kaina)/.test(t);
    });
  }
  /* Teksto atkarpos keitimas per kelias Word atkarpas (w:t): [nuo, iki) -> naujas tekstas (į pirmą paliestą atkarpą) */
  function keisk(ts, nuo, iki, naujasT){
    let pos = 0, irasyta = false;
    ts.forEach(t => {
      const s = t.textContent, a = pos, b = pos + s.length;
      pos = b;
      if (b <= nuo || a >= iki){ return; }
      const pr = s.slice(0, Math.max(0, nuo - a)), po = s.slice(Math.max(0, Math.min(s.length, iki - a)));
      t.textContent = pr + (irasyta ? '' : naujasT) + po;
      t.setAttributeNS(XML_NS, 'xml:space', 'preserve');
      irasyta = true;
    });
  }
  function keiskRe(p, re, naujasF){
    const ts = visi(p, 't'), s = ts.map(t => t.textContent).join('');
    const m = re.exec(s);
    if (!m) return false;
    keisk(ts, m.index, m.index + m[0].length, typeof naujasF === 'function' ? naujasF(m) : naujasF);
    return true;
  }
  /* Antraštės kiekio langelis: „Maksimalus / Preliminarus/Konkretus kiekis (įrašyti)“ -> pasirinkta rūšis; EN - „Maximum / Preliminary /
     Precise amount (to be entered)“. Raudoni likučiai, kuriuose liko tik skyriklis („/“, tarpai), - pajuodinami, kai raudonų raidžių nebėra. */
  function kiekioAntraste(tbl, rusis){
    const R = KIEKIO_RUSYS[rusis];
    const tr0 = vaikai(tbl, 'tr')[0];
    let pakeista = false;
    vaikai(tr0, 'tc').forEach(tc => {
      if (!/kiek/i.test(tekstas(tc))) return;
      visi(tc, 'p').forEach(p => {
        if (R){
          if (keiskRe(p, /Maksimalus\s*\/\s*Preliminarus\s*\/\s*Konkretus\s+kiekis\s*/, R.lt + ' ')) pakeista = true;
          keiskRe(p, /\(įrašyti\)\s*/, '');
          if (keiskRe(p, /Maximum\s*\/\s*P\s*reliminary\s*\/\s*P\s*recise\s+amount\s*/, R.en + ' ')) pakeista = true;
          keiskRe(p, /\(to be entered\)\s*/, '');
        }
        // tušti raudoni likučiai (tarpai) ir skyriklis „/“ - juodi, jei raudonų raidžių neliko
        const rr = visi(p, 'r').filter(r => raudonas(r));
        if (rr.length && rr.every(r => /^[\s/]*$/.test(tekstas(r)))) rr.forEach(r => visi(r, 'color').forEach(c => c.parentNode.removeChild(c)));
      });
    });
    return pakeista;
  }
  /* Langelio tekstas: pirmoje pastraipoje - viena atkarpa (formatas - iš eilutės „1.“ atkarpos), kitos pastraipos pašalinamos.
     dalys: [{ t, raudona, b }] */
  function langelis(doc, tc, dalys, rPr0){
    const ps = vaikai(tc, 'p');
    const p = ps[0] || tc.appendChild(naujas(doc, 'p'));
    ps.slice(1).forEach(x => tc.removeChild(x));
    vaikai(p).forEach(x => { if (x.localName !== 'pPr') p.removeChild(x); });
    (dalys || []).forEach(d => {
      if (!d.t) return;
      const r = naujas(doc, 'r');
      const rPr = rPr0 ? rPr0.cloneNode(true) : naujas(doc, 'rPr');
      visi(rPr, 'color').forEach(c => c.parentNode.removeChild(c));
      if (d.b && !vaikas(rPr, 'b')){ const b = naujas(doc, 'b'); rPr.insertBefore(b, vaikas(rPr, 'rFonts') ? vaikas(rPr, 'rFonts').nextSibling : rPr.firstChild); }
      if (d.raudona){ const c = naujas(doc, 'color'); c.setAttributeNS(W, 'w:val', 'FF0000'); const po = ['sz', 'szCs', 'highlight', 'u', 'effect', 'vertAlign', 'lang'].map(x => vaikas(rPr, x)).find(Boolean); rPr.insertBefore(c, po || null); }
      if (rPr.childNodes.length) r.appendChild(rPr);
      const t = naujas(doc, 't'); t.setAttributeNS(XML_NS, 'xml:space', 'preserve'); t.textContent = bruksniai(d.t);
      r.appendChild(t); p.appendChild(r);
    });
  }
  function valykKlona(tr){
    visi(tr, 'bookmarkStart').concat(visi(tr, 'bookmarkEnd'), visi(tr, 'commentRangeStart'), visi(tr, 'commentRangeEnd'), visi(tr, 'commentReference'))
      .forEach(x => x.parentNode && x.parentNode.removeChild(x));
    [tr, ...Array.from(tr.getElementsByTagName('*'))].forEach(x => Array.from(x.attributes || []).forEach(a => {
      if (a.localName === 'paraId' || a.localName === 'textId') x.removeAttributeNode(a);
    }));
    return tr;
  }
  /* Matavimo vienetai angliškai (dvikalbėms formoms) - dažniausi; kitaip - raudonas nurodymas įrašyti vertimą */
  const VNT_EN = { 'vnt': 'pcs.', 'vnt.': 'pcs.', 'kompl': 'set', 'kompl.': 'set', 'komplektas': 'set', 'm': 'm', 'km': 'km', 'm2': 'm2', 'm²': 'm²', 'm3': 'm3', 'm³': 'm³',
    'kg': 'kg', 't': 't', 'l': 'l', 'val': 'h', 'val.': 'h', 'h': 'h', 'mėn': 'month', 'mėn.': 'month', 'men.': 'month', 'd': 'day', 'd.': 'day', 'dien.': 'day', 'para': 'day',
    'metai': 'year', 'm.': 'year', 'paslauga': 'service', 'kartas': 'time', 'k.': 'time', 'objektas': 'object', 'proj.': 'project', 'projektas': 'project', 'ha': 'ha', 'pak.': 'pack', 'pakuotė': 'pack' };
  const vntEn = v => VNT_EN[String(v || '').trim().toLowerCase()] || null;
  const romenu = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n);

  /* o: { budas: 'forma' | 'priedas', kiekioRusis, dalys: n (pirkimo objekto dalių skaičius), objektas: { lt, en } (priedo eilutei) }
     -> { lentelės, eiluciu, grupiu, beVertimo, budas, dalimis, kiekioAntraste } | { klaida } | null (formoje kainų lentelės nėra) */
  function irasyk(doc, M, opts){
    const o = opts || {};
    const L = kainuLenteles(doc);
    if (!L.length || !M) return null;
    const dalys = o.dalys >= 2 ? o.dalys : 0;
    const poz = pozicijos(M);
    // pasiskirstymas pagal lenteles: viena lentelė - visos pozicijos; kelios (dalims) - pagal pozicijų dalį
    let rinkiniai;
    if (o.budas === 'priedas') rinkiniai = L.map(() => null);
    else if (L.length === 1 && !dalys) rinkiniai = [M.eilutes];
    else if (dalys && L.length === dalys){
      if (!M.eilutes.every(e => e.grupe || e.dalis)) return { klaida: 'dalys', tekstas: 'ne visos pozicijos priskirtos pirkimo objekto dalims' };
      if (M.eilutes.some(e => e.dalis && e.dalis > dalys)) return { klaida: 'dalys', tekstas: `pozicijų dalių numeriai didesni už dalių skaičių (${dalys})` };
      rinkiniai = L.map((_, k) => {
        const out = [];
        M.eilutes.forEach((e, i) => {
          if (e.grupe){ const kita = M.eilutes.slice(i + 1).find(x => !x.grupe); if (kita && kita.dalis === k + 1) out.push(e); }
          else if (e.dalis === k + 1) out.push(e);
        });
        return out;
      });
      if (rinkiniai.some(x => !x.some(e => !e.grupe))) return { klaida: 'dalys', tekstas: 'kai kuriai pirkimo objekto daliai pozicijų nėra' };
    }
    else return { klaida: 'dalys', tekstas: 'formos kainų lentelių skaičius nesutampa su pirkimo objekto dalimis' };
    const R = { lenteles: L.length, eiluciu: 0, grupiu: 0, beVertimo: 0, budas: o.budas === 'priedas' ? 'priedas' : 'forma', dalimis: !!dalys, kiekioAntraste: false };
    L.forEach((tbl, k) => {
      const dvikalbis = /object of the procurement/i.test(tekstas(vaikai(tbl, 'tr')[0]));
      if (kiekioAntraste(tbl, o.kiekioRusis)) R.kiekioAntraste = true;
      const eil = vaikai(tbl, 'tr');
      const duom = eil.slice(1).filter(tr => /^\s*(\d+\.|\.\.\.|…)\s*$/.test(tekstas(vaikai(tr, 'tc')[0] || tr)) && vaikai(tr, 'tc').length >= 4);
      if (!duom.length) return;
      const proto = duom[0], po = duom[duom.length - 1].nextSibling;
      const r0 = visi(vaikai(proto, 'tc')[0], 'r')[0];
      const rPr0 = r0 && vaikas(r0, 'rPr') ? vaikas(r0, 'rPr') : null;
      const nauja = (pildyk) => { const tr = valykKlona(proto.cloneNode(true)); const tcs = vaikai(tr, 'tc'); pildyk(tcs); return tr; };
      const ikelti = [];
      if (o.budas === 'priedas'){
        const ob = o.objektas || {};
        const lt = `${ob.lt || 'Pirkimo objektas'} (pagal Pasiūlymo formos 1 priedą „${PRIEDO_PAV.pavLt}“)`;
        const en = `${ob.en || ob.lt || 'Object of the Procurement'} (according to ${PRIEDO_PAV.en} “${PRIEDO_PAV.pavEn}”)`;
        ikelti.push(nauja(tcs => {
          langelis(doc, tcs[0], [{ t: '1.' }], rPr0);
          langelis(doc, tcs[1], dvikalbis ? [{ t: lt + ' / ' + en }] : [{ t: lt }], rPr0);
          for (let i = 2; i < tcs.length - 1; i++) langelis(doc, tcs[i], [{ t: '-' }], rPr0);
          langelis(doc, tcs[tcs.length - 1], [], rPr0);
        }));
        R.eiluciu++;
      } else {
        let n = 0;
        rinkiniai[k].forEach(e => {
          if (e.grupe){
            ikelti.push(nauja(tcs => {
              langelis(doc, tcs[0], [], rPr0);
              langelis(doc, tcs[1], [{ t: e.pav + (dvikalbis && e.en ? ' / ' + e.en : ''), b: true }], rPr0);
              for (let i = 2; i < tcs.length; i++) langelis(doc, tcs[i], [], rPr0);
            }));
            R.grupiu++;
            return;
          }
          n++;
          ikelti.push(nauja(tcs => {
            langelis(doc, tcs[0], [{ t: n + '.' }], rPr0);
            const pavD = [{ t: e.pav }];
            if (dvikalbis){ if (e.en) pavD.push({ t: ' / ' + e.en }); else { pavD.push({ t: ' / ' }, { t: VERTIMO_ZYMA, raudona: true }); R.beVertimo++; } }
            langelis(doc, tcs[1], pavD, rPr0);
            const vEn = dvikalbis && e.vnt ? vntEn(e.vnt) : null;
            langelis(doc, tcs[2], !e.vnt ? [] : dvikalbis ? (vEn ? [{ t: e.vnt + ' / ' + vEn }] : [{ t: e.vnt + ' / ' }, { t: VERTIMO_ZYMA, raudona: true }]) : [{ t: e.vnt }], rPr0);
            if (dvikalbis && e.vnt && !vEn) R.beVertimo++;
            langelis(doc, tcs[3], e.kiekis ? [{ t: e.kiekis }] : [], rPr0);
            for (let i = 4; i < tcs.length; i++) langelis(doc, tcs[i], [], rPr0);
          }));
        });
        R.eiluciu += n;
      }
      duom.forEach(tr => tbl.removeChild(tr));
      ikelti.forEach(tr => tbl.insertBefore(tr, po && po.parentNode === tbl ? po : null));
    });
    // „Koreguojama pagal poreikį:“ - rengėjo nurodymas: lentelė užpildyta, todėl pašalinamas
    const body = visi(doc, 'body')[0];
    let pasalinta = 0;
    vaikai(body, 'p').forEach(p => { if (/^koreguojama pagal poreiki:/.test(norm(tekstas(p))) && visi(p, 'drawing').length === 0){ body.removeChild(p); pasalinta++; } });
    R.koreguojamaPasalinta = pasalinta;
    return R;
  }

  root.GP_KAINU_LENTELE = { RIBA, KIEKIO_RUSYS, PRIEDO_PAV, VERTIMO_ZYMA, skaitykXlsx, isBloku, raskLentele, stulpeliai, kiekioRusis, dalisIs,
    rekomenduojamasBudas, budoPriezastis, kliutysPriedui, pozicijos, irasyk, kainuLenteles, vntEn, romenu, norm };
})(typeof window !== 'undefined' ? window : this);
