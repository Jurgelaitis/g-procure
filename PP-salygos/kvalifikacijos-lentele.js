/* ============================================================================
 * G-Procure  PP-salygos/kvalifikacijos-lentele.js   (GP_KVAL_LENTELE)
 * ----------------------------------------------------------------------------
 * Kvalifikacijos reikalavimų lentelės perkėlimas iš įkelto dokumento į SPS 2 lentelę (naudotojo pasiūlymas 2026-10-14:
 * „jeigu pridedamas ... kvalifikaciniai reikalavimai dokumentas, SPS kvalifikacijos lentelės turi būti užpildomos
 * automatiškai ir kokybiškai“). Iki tol 2 žingsnis klausdavo „Kokią teisę verstis veikla turi turėti tiekėjas?“,
 * „Kokius dokumentus ... pateikti?“ ir 3.7 p. „X“ vietų, nors tie patys reikalavimai jau buvo įkeltame dokumente, o
 * finansinio ir techninio pajėgumo eilutės likdavo tuščios.
 *
 * Be DI ir be serverio: DOCX skaitomas naršyklėje (JSZip), tekstas perkeliamas pažodžiui, su pusjuodžiu, kursyvu ir
 * pabraukimu, tokia pačia eilučių tvarka. Ką modulis tik SIŪLO (grupė, kai šaltinyje jos antraštės nėra; ar eilutė -
 * specialisto reikalavimas 3.7 p.), rodoma su pagrindu ir keičiama žmogaus; perkėlimą patvirtina žmogus.
 *
 * Nuo 2026-10-18 (naudotojo pasiūlymas - dokumentus įkelti jau 1 žingsnyje) - ir PDF (tekstas pagal pdf.js teksto sluoksnio
 * geometriją, be formatavimo) ir žaliųjų (aplinkosaugos) reikalavimų lentelė -> SPS 3 lentelė.
 *
 *   skaityk(buf, vardas)        -> Promise<{ lenteles: [Modelis], zaliuju: [Modelis], zalieji, ispejimai }> (DOCX)
 *   skaitykXml(xml, numXml, v)  -> tas pats be ZIP (testams)
 *   skaitykPdf(buf, vardas)     -> Promise<tas pats> iš PDF (reikia pdfjsLib); pdfLenteles(puslapiai, vardas) - be pdf.js (testams)
 *   irasykZaliuosius(doc, M)    -> sugeneruoto SPS žaliųjų lentelės (3 lentelė) šablono eilutės pakeičiamos; ataskaita arba null
 *   grupe(tekstas)              -> { grupe, pagrindas } | { grupe: null }
 *   specialistas(tekstas)       -> { taip, pagrindas }
 *   numeriai(M, pakeitimai)     -> eilutės su SPS numeriais, grupėmis ir specialistais (tas pats, kas bus dokumente)
 *   punktai(nr, budas)          -> „2, 3, 4 ir 5“ / „2 ir/ar 3 ir/ar 4“ / „2, 3 and 4“ / „2 and/or 3“
 *   pastabos(M, kontekstas)     -> nuoseklumo pastabos (sąvokos „Rangovas“, „Paraiška“, išnašos, vertimas)
 *   irasyk(doc, M, opts)        -> sugeneruoto SPS DOM dokumento 2 lentelė (DPS sukūrimo sąlygose - 2 priedo 1 lentelė)
 *                                  pakeičiama; ataskaita arba null
 *   patirtiesEilutes(E)         -> tiekėjo patirties reikalavimų numeriai (nuorodoms formose, pvz. „1 lentelės 8 punktą“)
 *   tusciaNeVisa(doc)           -> „Informacija dėl ... ne visa apimtimi“ be turinio - antraštė ir tuščia eilutė šalinamos
 * ==========================================================================*/
(function (root) {
  'use strict';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const XML_NS = 'http://www.w3.org/XML/1998/namespace';
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[ \s]+/g, ' ').trim();
  const bruksniai = s => (root.GP_DOCX_STILIAI ? root.GP_DOCX_STILIAI.bruksniai(s) : String(s == null ? '' : s));

  /* ---------- DOM pagalbinės ---------------------------------------------------------------------------------- */
  const vaikai = (n, vardas) => Array.from((n && n.childNodes) || []).filter(c => c.nodeType === 1 && c.namespaceURI === W && (!vardas || c.localName === vardas));
  const vaikas = (n, vardas) => vaikai(n, vardas)[0] || null;
  const visi = (n, vardas) => n ? Array.from(n.getElementsByTagNameNS(W, vardas)) : [];
  const atr = (n, a) => n ? (n.getAttributeNS(W, a) || n.getAttribute('w:' + a)) : null;
  const ijungta = n => !!n && !/^(0|false|off|none)$/i.test(atr(n, 'val') || '');
  const protevis = (n, vardas) => { for (let p = n.parentNode; p && p.nodeType === 1; p = p.parentNode) if (p.namespaceURI === W && p.localName === vardas) return p; return null; };
  function langelioTekstas(tc){
    return visi(tc, 'p').map(p => visi(p, 't').map(t => t.textContent).join('')).join(' ').replace(/\s+/g, ' ').trim();
  }
  /* Eilutės langeliai su tinklelio stulpelių ribomis (gridSpan). */
  function langeliai(tr){
    let g = 0;
    return vaikai(tr, 'tc').map(tc => {
      const pr = vaikas(tc, 'tcPr'), sp = parseInt(atr(vaikas(pr, 'gridSpan'), 'val') || '1', 10) || 1;
      const vm = vaikas(pr, 'vMerge');
      const c = { tc, nuo: g, iki: g + sp - 1, tekstas: langelioTekstas(tc), tesinys: !!vm && atr(vm, 'val') !== 'restart' };
      g += sp;
      return c;
    });
  }

  /* ---------- Numeracija šaltinyje (sąrašai langelyje) ------------------------------------------------------- */
  function numeracijosZemelapis(nd){
    const abs = {}, num = {};
    if (!nd) return { lygis: () => null };
    visi(nd, 'abstractNum').forEach(a => {
      const lv = {};
      vaikai(a, 'lvl').forEach(l => {
        lv[atr(l, 'ilvl')] = { fmt: atr(vaikas(l, 'numFmt'), 'val') || 'decimal', tekstas: atr(vaikas(l, 'lvlText'), 'val') || '%1.',
          pradzia: parseInt(atr(vaikas(l, 'start'), 'val') || '1', 10) };
      });
      abs[atr(a, 'abstractNumId')] = lv;
    });
    visi(nd, 'num').forEach(n => { num[atr(n, 'numId')] = atr(vaikas(n, 'abstractNumId'), 'val'); });
    return { lygis: (id, ilvl) => ((abs[num[id]] || {})[ilvl]) || null };
  }
  const ROM = [[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];
  function formatuok(n, fmt){
    if (/letter/i.test(fmt)){ let s = '', x = n; while (x > 0){ x--; s = String.fromCharCode(97 + (x % 26)) + s; x = Math.floor(x / 26); } return /upper/i.test(fmt) ? s.toUpperCase() : s; }
    if (/roman/i.test(fmt)){ let s = '', x = n; ROM.forEach(([v, r]) => { while (x >= v){ s += r; x -= v; } }); return /upper/i.test(fmt) ? s.toUpperCase() : s; }
    return String(n);
  }

  /* ---------- Pastraipos ir jų atkarpos ---------------------------------------------------------------------- */
  const RAUDONA = /^(FF0000|C00000|EE0000|ED1C24|E00000)$/i;
  function atkarpos(p, st){
    const out = [];
    (function eik(n){
      vaikai(n).forEach(c => {
        const v = c.localName;
        if (v === 'pPr' || v === 'del' || v === 'moveFrom' || v === 'rPr') return;
        if (v !== 'r'){ eik(c); return; }
        const rp = vaikas(c, 'rPr');
        const f = {
          b: ijungta(vaikas(rp, 'b')), i: ijungta(vaikas(rp, 'i')),
          u: !!vaikas(rp, 'u') && atr(vaikas(rp, 'u'), 'val') !== 'none',
          va: atr(vaikas(rp, 'vertAlign'), 'val') || '', spalva: (atr(vaikas(rp, 'color'), 'val') || '').toUpperCase()
        };
        let t = '';
        vaikai(c).forEach(x => {
          if (x.localName === 't') t += x.textContent;
          else if (x.localName === 'tab' || x.localName === 'ptab') t += ' ';
          else if (x.localName === 'br' || x.localName === 'cr') t += '\n';
          else if (x.localName === 'noBreakHyphen') t += '-';
          else if (x.localName === 'footnoteReference' || x.localName === 'endnoteReference') st.isnasos++;
        });
        if (!t) return;
        const pr = out[out.length - 1];
        if (pr && pr.b === f.b && pr.i === f.i && pr.u === f.u && pr.va === f.va && pr.spalva === f.spalva) pr.t += t;
        else out.push(Object.assign({ t }, f));
      });
    })(p);
    return out;
  }
  /* Langelio pastraipos: { atk, tekstas, num } - be tuščių kraštuose, kelios tuščios iš eilės - viena. Sąrašo numeriai (ne
     vienintelis punktas langelyje) įrašomi tekstu: dokumente Word sąrašas langelyje nesitęsia per kitas eilutes. */
  function langelioPastraipos(tc, numer, st){
    const ps = [];
    (function eik(n){
      vaikai(n).forEach(c => {
        if (c.localName === 'p') ps.push(c);
        else if (c.localName === 'sdt' || c.localName === 'sdtContent' || c.localName === 'customXml') eik(c);
        else if (c.localName === 'tbl'){ st.idetines++; visi(c, 'p').forEach(x => ps.push(x)); }
      });
    })(tc);
    const out = ps.map(p => {
      const pPr = vaikas(p, 'pPr'), np = vaikas(pPr, 'numPr');
      const id = np ? atr(vaikas(np, 'numId'), 'val') : null, ilvl = np ? (atr(vaikas(np, 'ilvl'), 'val') || '0') : null;
      const atk = atkarpos(p, st);
      return { atk, tekstas: atk.map(a => a.t).join(''), num: id && id !== '0' ? { id, ilvl } : null };
    });
    // sąrašų numeriai: tik kai tas pats sąrašas langelyje turi bent du punktus
    const kiek = {};
    out.forEach(p => { if (p.num && p.tekstas.trim()) kiek[p.num.id] = (kiek[p.num.id] || 0) + 1; });
    const sk = {};
    out.forEach(p => {
      if (!p.num) return;
      const lv = numer.lygis(p.num.id, p.num.ilvl);
      if (!lv || !p.tekstas.trim()) return;
      if (lv.fmt === 'bullet'){ if (kiek[p.num.id] > 1 && !/^\s*[-•▪◦‣·]/.test(p.tekstas)) p.priesdelis = '- '; return; }
      if (lv.fmt === 'none' || kiek[p.num.id] < 2) return;
      const c = sk[p.num.id] ??= {};
      const l = parseInt(p.num.ilvl, 10) || 0;
      Object.keys(c).forEach(k => { if (Number(k) > l) delete c[k]; });
      c[l] = (c[l] == null ? (lv.pradzia || 1) - 1 : c[l]) + 1;
      p.priesdelis = lv.tekstas.replace(/%(\d)/g, (m, d) => {
        const ll = Number(d) - 1, lvx = numer.lygis(p.num.id, String(ll)) || lv;
        return formatuok(c[ll] != null ? c[ll] : (lvx.pradzia || 1), lvx.fmt);
      }) + ' ';
    });
    out.forEach(p => {
      if (p.priesdelis){ p.atk.unshift({ t: p.priesdelis, b: false, i: false, u: false, va: '', spalva: '' }); p.tekstas = p.priesdelis + p.tekstas; }
      delete p.num; delete p.priesdelis;
      if (p.atk.some(a => RAUDONA.test(a.spalva) && a.t.trim())) st.raudona = true;
    });
    // tušti kraštuose ir pasikartojantys tušti
    const svarus = [];
    out.forEach(p => {
      const tuscia = !p.tekstas.trim();
      if (tuscia && (!svarus.length || !svarus[svarus.length - 1].tekstas.trim())) return;
      svarus.push(p);
    });
    while (svarus.length && !svarus[svarus.length - 1].tekstas.trim()) svarus.pop();
    return svarus;
  }
  const pTekstas = ps => (ps || []).map(p => p.tekstas).join('\n').trim();
  /* Dvikalbis langelis (PP-qual LT / EN eksportas): angliškos pastraipos - kursyvas, spalva 737483. */
  const enPastraipa = p => p.atk.length > 0 && p.atk.every(a => !a.t.trim() || (a.spalva === '737483'));
  function skaidykKalbas(ps){
    const lt = ps.filter(p => !enPastraipa(p)), en = ps.filter(p => enPastraipa(p));
    return { lt, en: en.length ? en.map(p => Object.assign({}, p, { atk: p.atk.map(a => Object.assign({}, a, { spalva: '', i: false })) })) : null };
  }

  /* ---------- Grupės ir specialistai --------------------------------------------------------------------------- */
  const GRUPES = {
    teise:      { lt: 'Teisė verstis veikla', en: 'Right to pursue an activity', re: /^teise verstis veikla/ },
    finansinis: { lt: 'Finansinis ir ekonominis pajėgumas', en: 'Financial and economical capacity', re: /^finansinis ir ekonominis pajegumas/ },
    techninis:  { lt: 'Techninis ir profesinis pajėgumas', en: 'Technical and professional capacity', re: /^techninis ir profesinis pajegumas/ }
  };
  const NE_VISA_RE = /ne visa apimtimi|partial application of qualification/;
  /* Šaltinio antraštė -> SPS grupė. Kitokia antraštė (pvz. PP-qual „Kokybės ir aplinkos apsaugos vadybos standartai“)
     perkeliama savo tekstu - tai jūsų dokumento struktūra. */
  function antrastesGrupe(t){
    const n = norm(t);
    if (NE_VISA_RE.test(n)) return { grupe: 'neVisa' };
    if (/teise (verstis|uzsiimti|vykdyti)|right to (pursue|engage)/.test(n)) return { grupe: 'teise' };
    if (/(ekonomin|finansin)\S* (ir \S+ )?(padetis|pajegum|bukle)|^(economic|financial)/.test(n)) return { grupe: 'finansinis' };
    if (/(technin|profesin)\S* (ir \S+ )?(pajegum|kompetencij|gebejim)|^(technical|professional)/.test(n)) return { grupe: 'techninis' };
    return { grupe: 'kita' };
  }
  /* Reikalavimo grupė pagal jo tekstą - tik pasiūlymas su pagrindu (žodžiai iš paties teksto). */
  const ZM = {
    asmenys: /(specialist|darbuotoj|vadov(a|as|o|u|ai|ui|ams)\b|inzinier|vykdytoj|ekspert|meistr|suvirintoj|elektromontuotoj|elektrotechnik|projektuotoj|auditori|technik(a|as|us|ai)\b|turint(i|is|ys|iu) (apsaugos|kvalifikac|energetikos|atestat|aukst|ne mazesn|teise eiti)|teise eiti|kvalifikacijos (kategorij|atestat|pazymejim))/,
    teise: /(tureti teise|turi teise|teise (vykdyti|verstis|teikti|atlikti|buti|uzsiimti)|licencij|leidim\S* (vykdyti|verstis|teikti)|ireg(istruot|istr)|atestat\S* (vykdyti|imon|tiekej|rangov))/,
    finansinis: /(pajam|apyvart|finansin|mokum|likvidum|nuosav\S* kapital|grynas\S* turt|civilines atsakomybes draud|kredit\S* linij|banko (garantij|pazym))/,
    techninis: /(patirt|ivykd|atlikt\S* (darb|paslaug)|sutart(is|ys|ciu|imi)\b|iranga|irangos|technin\S* (bazes|priemon)|priemones|kokybes (vadyb|uztikrin)|iso \d|sertifikat|laboratorij)/
  };
  /* Normalizuotas tekstas su nuoroda į originalo vietą - pagrindas rodomas paties dokumento žodžiais („vadovą“, ne „vadova“). */
  function normIdx(s){
    s = String(s == null ? '' : s);
    let n = ''; const idx = [];
    for (let i = 0; i < s.length; i++){
      const c = s[i];
      if (/[\s\u00a0]/.test(c)){ if (n && n[n.length - 1] !== ' '){ n += ' '; idx.push(i); } continue; }
      const d = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const x of d){ n += x; idx.push(i); }
    }
    return { n, idx, s };
  }
  function zodis(re, ni){
    const m = re.exec(ni.n);
    if (!m) return '';
    let a = ni.idx[m.index], b = ni.idx[m.index + m[0].length - 1] + 1;
    while (a > 0 && /[\p{L}\p{N}]/u.test(ni.s[a - 1])) a--;
    while (b < ni.s.length && /[\p{L}\p{N}]/u.test(ni.s[b])) b++;
    return ni.s.slice(a, b).replace(/\s+/g, ' ').trim();
  }
  function grupe(tekstas){
    const n = normIdx(tekstas);
    if (!n.n.trim()) return { grupe: null };
    const as = zodis(ZM.asmenys, n), te = zodis(ZM.teise, n), fi = zodis(ZM.finansinis, n), tc = zodis(ZM.techninis, n);
    if (te && !as) return { grupe: 'teise', pagrindas: `tekste „${te}“` };
    if (fi && !as) return { grupe: 'finansinis', pagrindas: `tekste „${fi}“` };
    if (as) return { grupe: 'techninis', pagrindas: `tekste „${as}“ - specialisto reikalavimas` };
    if (tc) return { grupe: 'techninis', pagrindas: `tekste „${tc}“` };
    if (te) return { grupe: 'teise', pagrindas: `tekste „${te}“` };
    return { grupe: null };
  }
  function specialistas(tekstas){
    const as = zodis(ZM.asmenys, normIdx(tekstas));
    return as ? { taip: true, pagrindas: `tekste „${as}“` } : { taip: false };
  }
  const neVisaTekstas = n => /netikrinama.{0,200}isipareigoja|kvalifikacija .{0,120}netikrinama/.test(n);

  /* ---------- Lentelių atpažinimas ------------------------------------------------------------------------------ */
  function stulpeliai(c){
    const r = {};
    c.forEach(x => {
      const n = norm(x.tekstas);
      if (!n) return;
      if (/^(eil\.? ?nr|nr\b|no\b)/.test(n) && n.length < 24){ r.nr = x; return; }
      if (/dokument|documents|evidence/.test(n)){
        if (/dokument/.test(n)) r.dokLt = r.dokLt || x;
        if (/documents|evidence/.test(n)) r.dokEn = r.dokEn || x;
        r.dok = r.dok || x;
        return;
      }
      if (/reikalavim|requirement/.test(n)){ if (/reikalavim/.test(n)) r.reikLt = x; if (/requirement/.test(n)) r.reikEn = x; r.reik = r.reik || x; }
    });
    return r;
  }
  function antrastesEilute(eil){
    for (let k = 0; k < Math.min(3, eil.length); k++){
      const c = langeliai(eil[k]), s = stulpeliai(c);
      if (s.reik && (s.dokLt || s.dokEn || s.dok)) return { k, c, s };
    }
    return null;
  }
  const ZALIEJI_RE = /zali(eji|uju|esiems|ems|ieji)|green (procurement|requirement)/;
  const ATITIKTIES_RE = /\batitinka\b|complies|\bkat\.|\bcat\./;

  function skaitykXml(xml, numXml, vardas){
    const DP = new DOMParser();
    const doc = DP.parseFromString(xml, 'application/xml');
    const numer = numeracijosZemelapis(numXml ? DP.parseFromString(numXml, 'application/xml') : null);
    const body = visi(doc, 'body')[0];
    const out = { lenteles: [], zalieji: 0, zaliuju: [], ispejimai: [] };
    if (!body) return out;
    const tbls = visi(body, 'tbl').filter(t => !protevis(t, 'tbl'));
    tbls.forEach((tbl, ti) => {
      const eil = vaikai(tbl, 'tr');
      const a = antrastesEilute(eil);
      if (!a) return;
      // žaliųjų reikalavimų lentelė - pagal antraštės eilutes (iki 2026-10-18 - ir pirmą duomenų eilutę: kvalifikacijos reikalavimas,
      // kuriame minimi „žalieji“, lentelę paversdavo žaliųjų)
      const virsus = eil.slice(0, a.k + 1).map(tr => norm(langeliai(tr).map(c => c.tekstas).join(' '))).join(' ');
      const zalia = ZALIEJI_RE.test(virsus);
      if (zalia) out.zalieji++;
      if (ATITIKTIES_RE.test(norm(a.c.map(c => c.tekstas).join(' ')))) return;
      const st = { isnasos: 0, idetines: 0, raudona: false };
      const s = a.s;
      const dvikalbe = s.reikLt && s.reikEn && s.reikLt !== s.reikEn ? 'stulpeliai' : (s.reikLt && s.reikEn && s.reikLt === s.reikEn ? 'langelyje' : null);
      const ltReik = s.reikLt || s.reik, ltDok = s.dokLt || s.dok;
      const enReik = dvikalbe === 'stulpeliai' ? s.reikEn : null, enDok = dvikalbe === 'stulpeliai' && s.dokEn !== ltDok ? s.dokEn : null;
      const kurisLang = (c, stulp) => stulp && c.find(x => x.nuo <= stulp.nuo && x.iki >= stulp.nuo);
      const M = { failas: vardas || '', lentele: ti + 1, dvikalbe: !!dvikalbe, eilutes: [], neVisa: null, ispejimai: [], saltinioNumeriai: [] };
      let dabar = null, antraste = null, neVisa = false;
      for (let k = a.k + 1; k < eil.length; k++){
        const c = langeliai(eil[k]).filter(x => !x.tesinys);
        const sutekstu = c.filter(x => x.tekstas);
        if (!sutekstu.length) continue;
        // antraštės eilutė: vienas langelis per visą plotį (arba vienintelis su tekstu, apimantis kelis stulpelius) ir trumpas tekstas
        const t0 = sutekstu[0].tekstas, g0 = antrastesGrupe(t0);
        const plati = c.length === 1 || (sutekstu.length === 1 && sutekstu[0].iki - sutekstu[0].nuo >= 1);
        if (plati && sutekstu.length === 1 && (neVisa || g0.grupe !== 'kita' || t0.length <= 120)){
          const t = t0, g = g0;
          if (g.grupe === 'neVisa'){ neVisa = true; continue; }
          if (neVisa){ const ps = skaidykKalbas(langelioPastraipos(sutekstu[0].tc, numer, st)); M.neVisa = M.neVisa || { lt: [], en: null }; M.neVisa.lt.push(...ps.lt); if (ps.en) (M.neVisa.en ??= []).push(...ps.en); continue; }
          // dvikalbė antraštė „Teisė verstis veikla / Right to pursue an activity“
          const [lt, en] = t.split(/\s+\/\s+/);
          dabar = g.grupe; antraste = g.grupe === 'kita' ? { lt: lt.trim(), en: en ? en.trim() : null } : null;
          continue;
        }
        if (neVisa){                                  // dvikalbė „ne visa apimtimi“ eilutė - du langeliai
          M.neVisa = M.neVisa || { lt: [], en: null };
          sutekstu.forEach((x, j) => { const ps = langelioPastraipos(x.tc, numer, st); if (j === 0 || !dvikalbe) M.neVisa.lt.push(...ps); else (M.neVisa.en ??= []).push(...ps); });
          continue;
        }
        const nrL = kurisLang(c, s.nr), rL = kurisLang(c, ltReik), dL = kurisLang(c, ltDok);
        const reEn = enReik && kurisLang(c, enReik), doEn = enDok && kurisLang(c, enDok);
        let reik = rL ? langelioPastraipos(rL.tc, numer, st) : [], dok = dL && dL !== rL ? langelioPastraipos(dL.tc, numer, st) : [];
        let reikEN = reEn && reEn !== rL ? langelioPastraipos(reEn.tc, numer, st) : null, dokEN = doEn && doEn !== dL ? langelioPastraipos(doEn.tc, numer, st) : null;
        if (dvikalbe === 'langelyje'){ const r1 = skaidykKalbas(reik), d1 = skaidykKalbas(dok); reik = r1.lt; reikEN = r1.en; dok = d1.lt; dokEN = d1.en; }
        if (!pTekstas(reik) && !pTekstas(dok)) continue;
        const rt = pTekstas(reik);
        if (neVisaTekstas(norm(rt)) && !pTekstas(dok)){ M.neVisa = { lt: reik, en: reikEN }; continue; }
        const nrT = nrL ? nrL.tekstas.replace(/\.$/, '').trim() : '';
        M.saltinioNumeriai.push(nrT || null);
        const gs = dabar ? { grupe: dabar, kilme: 'antraste' } : Object.assign({ kilme: 'tekstas' }, grupe(rt));
        const sp = specialistas(rt);
        M.eilutes.push({ reik, dok, reikEN, dokEN, grupe: gs.grupe, grupesKilme: gs.grupe ? gs.kilme : null, grupesPagrindas: gs.pagrindas || '',
          antraste: dabar === 'kita' ? antraste : null, specialistas: sp.taip, specPagrindas: sp.pagrindas || '' });
      }
      if (!M.eilutes.length) return;
      if (st.isnasos) M.ispejimai.push(`Lentelėje ${st.isnasos} išnašos nuorod${st.isnasos === 1 ? 'a' : 'os'} - išnašų tekstas neperkeliamas, įrašykite jį Word programoje.`);
      if (st.idetines) M.ispejimai.push('Langeliuose yra įdėtinių lentelių - jų tekstas perkeliamas pastraipomis.');
      if (st.raudona) M.ispejimai.push('Dalis teksto šaltinyje raudona - perkeliama raudona, kad matytumėte, ką dar reikia užpildyti.');
      if (zalia){ M.zalieji = true; out.zaliuju.push(M); } else out.lenteles.push(M);
    });
    return out;
  }
  async function skaityk(buf, vardas){
    if (!root.JSZip) throw new Error('Word failų skaitymo biblioteka (JSZip) neįsikėlė');
    const zip = await root.JSZip.loadAsync(buf);
    const f = zip.file('word/document.xml');
    if (!f) return { lenteles: [], zalieji: 0, ispejimai: ['Faile nėra Word dokumento teksto.'] };
    const nf = zip.file('word/numbering.xml');
    return skaitykXml(await f.async('string'), nf ? await nf.async('string') : '', vardas);
  }

  /* ---------- PDF lentelės (2026-10-18) --------------------------------------------------------------------------------------------
     Naudotojo pasiūlymas: iniciatoriai kvalifikacijos ir žaliuosius (aplinkosaugos) reikalavimus dažnai pateikia PDF faile, ir jie
     turi patekti į SPS 2 ir 3 lenteles taip pat, kaip iš Word. pdf.js teksto sluoksnyje rėmelių nėra - tik teksto gabalai su vieta.
     Todėl: stulpeliai - pagal antraštės žodžius („Eil. Nr.“, „Reikalavimai“, „Pateikiami dokumentai“) ir tarpą tarp jų, kurio nekerta
     joks teksto gabalas (stulpelio riba; tinka ir kairėn, ir centre lygiuotoms antraštėms); eilutės - pagal numerį pirmame stulpelyje
     (be numerio - ankstesnės eilutės tęsinys, ir kitame puslapyje); pastraipos - nauja, kai eilutė prasideda sąrašo žyme („1.1.“, „•“,
     „a)“), kai ankstesnė trumpa eilutė baigiasi sakinio ženklu arba kai tarpas tarp eilučių didesnis. Ta pati antraštė kito puslapio
     viršuje - tos pačios lentelės tęsinys; žodis, kertantis stulpelio ribą, - grupės antraštė (trumpa) arba lentelės pabaiga. Formatavimo
     (pusjuodžio, kursyvo) PDF tekste nėra - perkeliamas tekstas, ir tai pasakoma. Modelis - toks pat kaip iš DOCX.
       pdfLenteles(puslapiai, vardas) - puslapiai: [[{ s, x, y, w, fs }]] (pdf.js elementai: x, y - kairysis apatinis taškas)
       skaitykPdf(buf, vardas)        - per pdf.js (reikia pdfjsLib ir GP_PDF_DARBININKAS) */
  const PDF_ZYME_RE = /^((\d+\.)+\d*\.?\s|\d+\)\s|[a-zą-ž]\)\s|[•▪◦‣·●○■□–-]\s?)/i;
  const KULKA_RE = /^[•▪◦‣·●○■□]\s*/;
  function pdfEilutes(items, puslapis){
    const lines = [];
    (items || []).forEach(it => {
      if (!it || !it.s || !String(it.s).trim()) return;
      const fs = it.fs || 10;
      let line = null;
      for (let k = lines.length - 1, n = 0; k >= 0 && n < 80; k--, n++) if (Math.abs(lines[k].y - it.y) <= Math.max(2, 0.35 * fs)){ line = lines[k]; break; }
      if (!line){ line = { y: it.y, p: puslapis, items: [], fs }; lines.push(line); }
      line.items.push({ x: it.x, w: it.w || 0, s: String(it.s), fs });
      line.fs = Math.max(line.fs, fs);
    });
    lines.forEach(l => l.items.sort((a, b) => a.x - b.x));
    return lines.sort((a, b) => b.y - a.y);
  }
  /* Gabalų tekstas su tarpais pagal geometriją (kaip shared/dokumentai.js). */
  function sujunk(items){
    let s = '';
    items.forEach((it, i) => {
      if (i){
        const pr = items[i - 1], gap = it.x - (pr.x + pr.w), riba = Math.max(0.15 * (it.fs || 10), 0.8);
        if (!/\s$/.test(s) && !/^\s/.test(it.s) && (!pr.w || gap > riba)) s += ' ';
      }
      s += it.s;
    });
    return s.replace(/\s+/g, ' ').trim();
  }
  const eilTekstas = l => sujunk(l.items);
  /* Žodžiai su pradžios x: pdf.js vieną žodį kartais skaido į kelis gabalus („R“ + „eikalavimai“) - be tarpo tarp jų sujungiami. */
  function zodziai(items){
    const out = [];
    items.forEach((it, i) => {
      const pr = i ? items[i - 1] : null, riba = Math.max(0.15 * (it.fs || 10), 0.8);
      const kartu = pr && out.length && !/\s$/.test(pr.s) && !/^\s/.test(it.s) && pr.w && it.x - (pr.x + pr.w) <= riba;
      if (kartu) out[out.length - 1].s += it.s; else out.push({ x: it.x, s: it.s });
    });
    return out.map(z => ({ x: z.x, s: z.s.trim() })).filter(z => z.s);
  }
  /* Antraštė: eilutė su „reikalavim“ ir „dokument“ / „pateikiam“ (EN - „requirement“ ir „document“); virš jos (iki 3 eilučių tame pačiame
     puslapyje) gali būti „Eil. Nr.“ ir (žaliųjų lentelėje) „ŽALIEJI REIKALAVIMAI“ - antraštės langeliai lygiuojami ir viršuje.
     Grąžina stulpelių inkarus (x), pirmos antraštės eilutės indeksą ir ar tai žaliųjų lentelė. */
  const NR_RE = /^(eil|nr\b|no\b|no\.|eil\.)/;
  const ANTRASTES_ZODIS = /^[(]?(eil|nr|no|reikalavim|requirement|pateikiam|dokument|document|evidence|to|be|submitted|kvalifikacij|qualification|tiekej|supplier|zalie|zaliuj|green|environment|procurement|aprasym|description|ir|and|of|-|–|\d+\.?)[\p{L}.,:)]*$/u;
  function pdfAntraste(lines, k){
    const l = lines[k];
    if (!l) return null;
    const n = norm(eilTekstas(l));
    if (!(/reikalavim|requirement/.test(n) && /(dokument|pateikiam|documents|evidence)/.test(n))) return null;
    // antraštės eilutėje - tik antraštės žodžiai (kūno sakinys „... reikalavimą įrodančių dokumentų.“ - ne antraštė)
    const zl = n.split(/[\s\/]+/).filter(Boolean);
    if (zl.length > 12 || zl.filter(z => ANTRASTES_ZODIS.test(z)).length < 0.8 * zl.length) return null;
    const virsus = [];
    for (let q = k - 1, ap = l; q >= 0 && virsus.length < 3; q--){
      const e = lines[q], t = eilTekstas(e), nt = norm(t);
      if (e.p !== l.p || e.y - ap.y > 3.2 * l.fs) break;
      if (!(zodziai(e.items).some(z => NR_RE.test(norm(z.s))) || ZALIEJI_RE.test(nt) || /requirements|reikalavimai/.test(nt) && t === t.toUpperCase())) break;
      virsus.push(e); ap = e;
    }
    const inkarai = [];
    const ieskok = (eil, re, raktas) => {
      if (inkarai.some(a => a.k === raktas)) return;
      const z = zodziai(eil.items).find(x => re.test(norm(x.s)));
      if (z) inkarai.push({ k: raktas, x: z.x });
    };
    [l].concat(virsus).forEach(eil => ieskok(eil, NR_RE, 'nr'));
    ieskok(l, /reikalavim/, 'reikLt'); ieskok(l, /requirement/, 'reikEn');
    ieskok(l, /(pateikiam|dokument)/, 'dokLt'); ieskok(l, /(documents|evidence)/, 'dokEn');
    if (!inkarai.some(a => a.k === 'reikLt' || a.k === 'reikEn') || !inkarai.some(a => a.k === 'dokLt' || a.k === 'dokEn')) return null;
    const xR = Math.min(...inkarai.filter(a => /^reik/.test(a.k)).map(a => a.x)), xD = Math.min(...inkarai.filter(a => /^dok/.test(a.k)).map(a => a.x));
    if (xR >= xD) return null;                                                      // reikalavimų stulpelis - prieš dokumentų
    const virsT = norm(virsus.map(eilTekstas).concat(eilTekstas(l)).join(' '));
    return { inkarai: inkarai.sort((a, b) => a.x - b.x), pradzia: k - virsus.length, zalia: ZALIEJI_RE.test(virsT) || /environmental procurement/.test(virsT), p: l.p };
  }
  /* Stulpelių ribos: tarp gretimų inkarų - plačiausia vieta, kurią kerta mažiausiai kūno eilučių (paprastai - nė viena). Eilutės per visą
     plotį (tekstas po lentele, grupės antraštė) kerta visą tarpą vienodai, todėl ribos nekeičia. */
  function pdfRibos(inkarai, kunas){
    const tarpai = inkarai.slice(0, -1).map((x, j) => [x.x, inkarai[j + 1].x]);
    const naud = kunas;
    return tarpai.map(([a, b]) => {
      const Z = 0.5, n = Math.max(1, Math.ceil((b - a) / Z)), cnt = new Uint16Array(n);
      naud.forEach(l => {
        const zym = new Uint8Array(n);
        l.items.forEach(it => {
          const s = Math.max(0, Math.floor((it.x - a) / Z)), e = Math.min(n - 1, Math.ceil((it.x + Math.max(it.w, 0.5) - a) / Z));
          for (let q = s; q <= e; q++) zym[q] = 1;
        });
        for (let q = 0; q < n; q++) cnt[q] += zym[q];
      });
      let min = Infinity;
      for (let q = 0; q < n; q++) min = Math.min(min, cnt[q]);
      let geriausia = null, pr = -1;
      for (let q = 0; q <= n; q++){
        if (q < n && cnt[q] === min){ if (pr < 0) pr = q; continue; }
        if (pr >= 0){ const ilgis = q - pr; if ((min > 0 || ilgis * Z >= 1.5) && (!geriausia || ilgis > geriausia.ilgis)) geriausia = { pr, ilgis }; pr = -1; }
      }
      return geriausia ? a + (geriausia.pr + geriausia.ilgis / 2) * Z : b - 2;
    });
  }
  /* Langelio eilutės -> pastraipos { atk, tekstas }. */
  function pdfPastraipos(eil, desine){
    const ps = [];
    if (!eil.length) return ps;
    const tarpai = [];
    for (let i = 1; i < eil.length; i++) if (eil[i].p === eil[i - 1].p) tarpai.push(eil[i - 1].y - eil[i].y);
    const iprastas = tarpai.length ? tarpai.slice().sort((a, b) => a - b)[Math.floor(tarpai.length / 2)] : 0;
    let dab = null;
    eil.forEach((e, i) => {
      const pr = i ? eil[i - 1] : null;
      // pavienis skyrybos ženklas atskiroje eilutėje (šaltinio likutis) - ne pastraipa ir ne „ .“ gale
      if (/^[.,;:]+$/.test(e.t)){ if (dab && !/[.,;:]$/.test(dab.t)) dab.t += e.t; return; }
      const naujas = !dab || PDF_ZYME_RE.test(e.t) ||
        (pr && pr.p === e.p && iprastas && pr.y - e.y > 1.6 * iprastas) ||
        (pr && /[.;:!?]$/.test(pr.t) && desine - pr.xR > 0.15 * Math.max(desine - pr.xL, 1));
      if (naujas){ dab = { t: e.t }; ps.push(dab); return; }
      // brūkšnelis eilutės gale tarp raidžių ar skaitmenų - žodis ar adresas tęsiasi be tarpo („lis-epp-“ + „app“, „F-“ + „dujos“)
      dab.t += /[\p{L}\p{N}]-$/u.test(dab.t) ? e.t : ' ' + e.t;
    });
    const kulku = ps.filter(p => KULKA_RE.test(p.t)).length;
    return ps.map(p => {
      let t = p.t.replace(/\s+/g, ' ').trim();
      if (KULKA_RE.test(t)) t = (kulku > 1 ? '- ' : '') + t.replace(KULKA_RE, '');   // kaip iš Word: kelių punktų sąrašas - „- “, vienas - be žymės
      return t;
    }).filter(t => t && !/^[\s.,;:·•-]+$/.test(t))                                    // pavienis „.“ - šaltinio likutis
      .map(t => ({ atk: [{ t, b: false, i: false, u: false, va: '', spalva: '' }], tekstas: t }));
  }
  function pdfLenteles(puslapiai, vardas){
    const out = { lenteles: [], zalieji: 0, zaliuju: [], ispejimai: [], pdf: true };
    const lines = [];
    (puslapiai || []).forEach((items, p) => pdfEilutes(items, p + 1).forEach(l => lines.push(l)));
    let k = 0, nr = 0;
    while (k < lines.length){
      const A = pdfAntraste(lines, k);
      if (!A){ k++; continue; }
      // kūnas - iki kitos (ne pasikartojančios) antraštės; pasikartojanti antraštė kito puslapio viršuje praleidžiama
      const kunas = [];
      let j = k + 1, kitaPradzia = lines.length;
      while (j < lines.length){
        const B = pdfAntraste(lines, j);
        if (B){
          const tasPats = B.p !== A.p && B.zalia === A.zalia && B.inkarai.length === A.inkarai.length &&
            B.inkarai.every((x, q) => x.k === A.inkarai[q].k && Math.abs(x.x - A.inkarai[q].x) < 8);
          while (kunas.length && lines.indexOf(kunas[kunas.length - 1]) >= B.pradzia) kunas.pop();   // antraštės viršutinės eilutės - ne kūnas
          if (!tasPats){ kitaPradzia = B.pradzia; break; }
          j++; continue;
        }
        kunas.push(lines[j]); j++;
      }
      // puslapio numeris ar poraštė („2“, „2 / 5“, „Puslapis 2“) - pirma ar paskutinė puslapio eilutė, ne lentelės tekstas
      const PSL_RE = /^(\d{1,3}|\d{1,3}\s*(\/|iš|is|of)\s*\d{1,3}|(puslapis|psl\.?|page)\s*\d{1,3}.*)$/i;
      const krastine = l => { const vienam = lines.filter(x => x.p === l.p); return vienam[0] === l || vienam[vienam.length - 1] === l; };
      for (let q = kunas.length - 1; q >= 0; q--) if (PSL_RE.test(eilTekstas(kunas[q])) && kunas[q].items.length === 1 && krastine(kunas[q])) kunas.splice(q, 1);
      const ribos = pdfRibos(A.inkarai, kunas);
      const stulp = it => { let q = 0; while (q < ribos.length && it.x >= ribos[q]) q++; return A.inkarai[q].k; };
      const kerta = l => l.items.some(it => ribos.some(r => it.x < r - 1 && it.x + it.w > r + 1));
      // stulpelio dešinysis kraštas (trumpos eilutės atpažinimui) - pagal visas lentelės eilutes
      const desine = {};
      kunas.forEach(l => { if (!kerta(l)) l.items.forEach(it => { const st = stulp(it); desine[st] = Math.max(desine[st] || 0, it.x + it.w); }); });
      const M = { failas: vardas || '', lentele: ++nr, dvikalbe: A.inkarai.some(a => a.k === 'reikEn'), eilutes: [], neVisa: null,
        ispejimai: ['Iš PDF perkeliamas tik tekstas - pusjuodžio, kursyvo ir pabraukimo PDF faile nėra. Jei jų reikia, įkelkite Word failą.'], saltinioNumeriai: [], pdf: true };
      let eil = null, grupe = null, antraste = null, neVisa = false, baigta = false;
      const uzdaryk = () => {
        if (!eil) return;
        const cel = {};
        Object.keys(eil.c).forEach(st => { cel[st] = pdfPastraipos(eil.c[st], desine[st]); });
        const reik = cel.reikLt || [], dok = cel.dokLt || [];
        eil = null;
        if (!pTekstas(reik) && !pTekstas(dok)) return;
        const rt = pTekstas(reik);
        if (neVisa || (neVisaTekstas(norm(rt)) && !pTekstas(dok))){ M.neVisa = { lt: reik, en: cel.reikEn || null }; return; }
        const gs = grupe ? { grupe, kilme: 'antraste' } : Object.assign({ kilme: 'tekstas' }, kvGrupe(rt));
        const sp = specialistas(rt);
        M.eilutes.push({ reik, dok, reikEN: cel.reikEn || null, dokEN: cel.dokEn || null, grupe: gs.grupe, grupesKilme: gs.grupe ? gs.kilme : null,
          grupesPagrindas: gs.pagrindas || '', antraste: grupe === 'kita' ? antraste : null, specialistas: sp.taip, specPagrindas: sp.pagrindas || '' });
      };
      for (const l of kunas){
        if (baigta) break;
        if (kerta(l)){
          const t = eilTekstas(l), g = antrastesGrupe(t);
          if (t.length <= 120 && (g.grupe !== 'kita' || t === t.toUpperCase())){       // grupės antraštė per visą plotį
            uzdaryk();
            if (g.grupe === 'neVisa'){ neVisa = true; continue; }
            grupe = g.grupe; antraste = g.grupe === 'kita' ? { lt: t, en: null } : null;
            continue;
          }
          baigta = true; break;                                                        // tekstas po lentele
        }
        const pagal = {};
        l.items.forEach(it => { (pagal[stulp(it)] ??= []).push(it); });
        const nrT = pagal.nr ? sujunk(pagal.nr) : '';
        if (/^\d+(\.\d+)*\.?$/.test(nrT) || (!eil && Object.keys(pagal).length)){ uzdaryk(); eil = { c: {} }; M.saltinioNumeriai.push(nrT.replace(/\.$/, '') || null); }
        Object.entries(pagal).forEach(([st, its]) => {
          if (st === 'nr') return;
          const t = sujunk(its);
          if (!t) return;
          const xL = its[0].x, xR = Math.max(...its.map(x => x.x + x.w));
          (eil.c[st] ??= []).push({ t, y: l.y, p: l.p, xL, xR });
        });
      }
      uzdaryk();
      if (M.eilutes.length){
        if (A.zalia){ M.zalieji = true; out.zalieji++; out.zaliuju.push(M); } else out.lenteles.push(M);
      }
      k = Math.max(kitaPradzia, k + 1);
    }
    return out;
  }
  const kvGrupe = t => grupe(t);
  async function skaitykPdf(buf, vardas){
    if (!root.pdfjsLib) throw new Error('PDF skaitymo biblioteka (pdf.js) neįsikėlė');
    if (root.GP_PDF_DARBININKAS) await root.GP_PDF_DARBININKAS.nustatyk();
    const pdf = await root.pdfjsLib.getDocument({ data: buf, isEvalSupported: false }).promise;
    const puslapiai = [];
    let beTeksto = 0;
    for (let pn = 1; pn <= pdf.numPages; pn++){
      const page = await pdf.getPage(pn);
      const tc = await page.getTextContent();
      const items = tc.items.map(it => {
        const tr = it.transform || [1, 0, 0, 1, 0, 0];
        return { s: it.str, x: tr[4], y: tr[5], w: it.width || 0, fs: Math.hypot(tr[0], tr[1]) || Math.abs(tr[3]) || 10 };
      });
      if (!items.some(x => String(x.s).trim())) beTeksto++;
      puslapiai.push(items);
    }
    const r = pdfLenteles(puslapiai, vardas);
    if (pdf.numPages && beTeksto === pdf.numPages) r.ispejimai.push('PDF be teksto sluoksnio (tikėtina, skenuotas) - lentelės perskaityti neįmanoma. Įkelkite Word failą.');
    return r;
  }

  /* ---------- Modelis su žmogaus pakeitimais: numeriai, grupės, specialistai ----------------------------------- */
  /* pakeitimai[i] = { grupe, specialistas } - žmogaus pasirinkimai. Eilučių tvarka - kaip šaltinyje (tekste gali būti
     nuorodų į savo punktus: „2.1.-2.3. punktuose“), numeriai - iš eilės per visas grupes, kaip LITGRID skelbiamose SPS. */
  /* vertimas (DI vertimas, kai šaltinyje anglų teksto nėra) - { eil: { i: { reik: [str], dok: [str], zmogus } }, antrastes: { lt: en },
     neVisa: [str] }; šaltinio angliškas tekstas visada pirmesnis. */
  function numeriai(M, pakeitimai, vertimas){
    const pk = pakeitimai || {}, vt = (vertimas && vertimas.eil) || {}, va = (vertimas && vertimas.antrastes) || {};
    return M.eilutes.map((e, i) => {
      const p = pk[i] || {}, v = vt[i];
      const reikEN = e.reikEN && pTekstas(e.reikEN) ? e.reikEN : (v && v.reik ? enPastraipos(e.reik, v.reik) : e.reikEN);
      const dokEN = e.dokEN && pTekstas(e.dokEN) ? e.dokEN : (v && v.dok ? enPastraipos(e.dok, v.dok) : e.dokEN);
      const antraste = e.antraste && !e.antraste.en && va[e.antraste.lt] ? Object.assign({}, e.antraste, { en: va[e.antraste.lt] }) : e.antraste;
      return Object.assign({}, e, { i, nr: i + 1, reikEN, dokEN, antraste,
        diVertimas: !!(v && !(e.reikEN && pTekstas(e.reikEN))), vertimasZmogaus: !!(v && v.zmogus),
        grupe: p.grupe !== undefined ? p.grupe : e.grupe, grupeZmogaus: p.grupe !== undefined,
        specialistas: p.specialistas !== undefined ? p.specialistas : e.specialistas, specZmogaus: p.specialistas !== undefined });
    });
  }
  /* Angliškos pastraipos pagal lietuviškas: tos pačios tuščios vietos, pusjuodis - kai visa lietuviška pastraipa pusjuodė. */
  function enPastraipos(lt, en){
    const ne = (en || []).map(x => String(x == null ? '' : x)).filter(x => x.trim());
    let k = 0;
    const out = (lt || []).map(p => {
      if (!p.tekstas.trim()) return { atk: [], tekstas: '' };
      const t = ne[k++] || '';
      const b = p.atk.filter(a => a.t.trim()).every(a => a.b) && p.atk.some(a => a.t.trim());
      return { atk: t ? [{ t, b, i: false, u: false, va: '', spalva: '' }] : [], tekstas: t };
    });
    while (k < ne.length) out.push({ atk: [{ t: ne[k], b: false, i: false, u: false, va: '', spalva: '' }], tekstas: ne[k++] });
    return out;
  }

  /* ---------- DI vertimo pasiūlymas (kai pirkimo sąlygos dvikalbės, o įkeltoje lentelėje anglų teksto nėra) --------------
     Užklausa ir atsakymo patikra - čia (grynos funkcijos), kvietimas ir sąsaja - PP-SALYGOS.html. Partijos - dėl atsakymo ilgio
     ribos (serverio max_tokens 8000), ne dėl užklausos dydžio: kiekviena partija - visos eilutės su visomis jų pastraipomis. */
  const VERTIMO_TERMINAI = [['Tiekėjas', 'Supplier'], ['Tiekėjų grupė', 'Supplier group'], ['Perkantysis subjektas', 'Contracting Entity'],
    ['Pasiūlymas', 'Tender'], ['Pirminis pasiūlymas', 'Initial Tender'], ['Paraiška', 'Application'], ['EBVPD', 'ESPD'], ['SPS', 'SPC'], ['BPS', 'GPC'],
    ['Kvalifikacijos reikalavimai', 'Qualification Requirements'], ['Komisija', 'Commission'], ['Ūkio subjektas', 'Economic entity'],
    ['Subtiekėjas', 'Sub-supplier'], ['Kvazisubtiekėjas', 'Quasi-Sub-supplier'], ['Sutartis', 'Contract'], ['Techninė specifikacija', 'Technical Specification'],
    ['Rangovas', 'Contractor'], ['skaitmeninė kopija', 'digital copy'], ['CVP IS', 'CVP IS']];
  const VERTIMO_SISTEMA = 'Esi teisinių pirkimo dokumentų vertėjas iš lietuvių į anglų kalbą. Verti LITGRID AB (Lietuvos elektros perdavimo sistemos operatoriaus) '
    + 'pirkimo sąlygų kvalifikacijos reikalavimų lentelę dvikalbėms (LT / EN) pirkimo sąlygoms. Taisyklės: '
    + '1) versk tiksliai ir pilnai - nieko nepridėk, nepraleisk ir neaiškink; '
    + '2) vartok šiuos terminus: ' + VERTIMO_TERMINAI.map(([a, b]) => a + ' - ' + b).join('; ') + '; '
    + '3) skaičius, sumas (ir jų skyrybą), datas, punktų numerius (pvz. „1.1.“), nuorodas, el. pašto adresus, matavimo vienetus (kV, MVA) '
    + 'ir standartų bei reglamentų žymenis (ISO, LST EN, STR) palik nepakeistus; '
    + '4) teisės aktų ir institucijų pavadinimus versk pažodžiui, santrumpų nesugalvok; '
    + '5) kiekvieną pastraipą versk atskirai: tiek pat pastraipų ir ta pačia tvarka, tuščia pastraipa lieka tuščia; '
    + '6) atsakyk TIK JSON objektu, be jokio kito teksto.';
  const VERTIMO_PARTIJA = 6000;   // lietuviško teksto ženklų vienai užklausai (atsakymas - panašaus ilgio)
  /* Eilutės, kurias reikia versti (be šaltinio angliško teksto ir be jau esamo vertimo), suskirstytos į partijas. */
  function vertimoPartijos(M, vertimas, opts){
    const vt = (vertimas && vertimas.eil) || {}, visas = opts && opts.visas;
    const reikia = M.eilutes.map((e, i) => i).filter(i => !(M.eilutes[i].reikEN && pTekstas(M.eilutes[i].reikEN)) && (visas ? !(vt[i] && vt[i].zmogus) : !vt[i]));
    const partijos = [];
    let dab = [], ilgis = 0;
    reikia.forEach(i => {
      const e = M.eilutes[i], n = pTekstas(e.reik).length + pTekstas(e.dok).length;
      if (dab.length && ilgis + n > VERTIMO_PARTIJA){ partijos.push(dab); dab = []; ilgis = 0; }
      dab.push(i); ilgis += n;
    });
    if (dab.length) partijos.push(dab);
    // kitos grupės antraštės ir „ne visa apimtimi“ tekstas - pirmoje partijoje (arba vieni, jei eilučių versti nebereikia)
    const antr = [...new Set(M.eilutes.filter(e => e.antraste && !e.antraste.en && !((vertimas && vertimas.antrastes) || {})[e.antraste.lt]).map(e => e.antraste.lt))];
    const nv = M.neVisa && pTekstas(M.neVisa.lt) && !(M.neVisa.en && pTekstas(M.neVisa.en)) && !(vertimas && vertimas.neVisa) ? M.neVisa.lt.map(p => p.tekstas) : null;
    if (!partijos.length && (antr.length || nv)) partijos.push([]);
    return partijos.map((eil, k) => ({ eilutes: eil, antrastes: k ? [] : antr, neVisa: k ? null : nv }));
  }
  function vertimoUzklausa(M, partija){
    const duom = { eilutes: partija.eilutes.map(i => ({ nr: i + 1, reikalavimas: M.eilutes[i].reik.map(p => p.tekstas), dokumentai: M.eilutes[i].dok.map(p => p.tekstas) })) };
    if (partija.antrastes.length) duom.antrastes = partija.antrastes;
    if (partija.neVisa) duom.neVisa = partija.neVisa;
    return { system: VERTIMO_SISTEMA, userMessage: 'Išversk į anglų kalbą. Grąžink JSON tokios pačios sandaros (tie patys raktai ir „nr“, vietoj lietuviško teksto - '
      + 'angliškas):\n' + JSON.stringify(duom) };
  }
  const skaiciai = s => (String(s).match(/\d+/g) || []).sort().join(' ');
  const LT_RAIDES = /[ąčęėįšųūž]/i;
  /* Atsakymo patikra prieš rodant: kiekviena eilutė - su savo numeriu, tiek pat netuščių pastraipų kaip lietuviškai; skaičiai, kurių
     vertime nėra, ar likusios lietuviškos raidės - perspėjimas (vertimas rodomas, bet „Patikrinkite“). Neatpažintas atsakymas - klaida. */
  function vertimoAtsakymas(tekstas, M, partija, taisyk){
    const s = String(tekstas || ''), a = s.indexOf('{'), b = s.lastIndexOf('}');
    let o = null;
    if (a >= 0 && b > a){
      const j = s.slice(a, b + 1);
      try { o = JSON.parse(j); } catch (e){ const t = taisyk ? taisyk(j) : null; if (t){ try { o = typeof t === 'string' ? JSON.parse(t) : t; } catch (e2){ o = null; } } }
    }
    if (!o || typeof o !== 'object') return { klaida: 'DI atsakymo nepavyko perskaityti (ne JSON).' };
    const eil = {}, nepavyko = [], perspejimai = {};
    const arr = Array.isArray(o.eilutes) ? o.eilutes : [];
    partija.eilutes.forEach(i => {
      const x = arr.find(z => z && Number(z.nr) === i + 1), e = M.eilutes[i];
      if (!x || !Array.isArray(x.reikalavimas) || !Array.isArray(x.dokumentai)){ nepavyko.push({ i, priezastis: 'eilutės atsakyme nėra' }); return; }
      const ne = (arr2) => arr2.map(z => String(z == null ? '' : z)).filter(z => z.trim()).length;
      if (ne(x.reikalavimas) !== e.reik.filter(p => p.tekstas.trim()).length || ne(x.dokumentai) !== e.dok.filter(p => p.tekstas.trim()).length){
        nepavyko.push({ i, priezastis: 'pastraipų skaičius nesutampa su lietuvišku tekstu' }); return; }
      const reik = x.reikalavimas.map(z => String(z == null ? '' : z).trim()), dok = x.dokumentai.map(z => String(z == null ? '' : z).trim());
      const p = [];
      if (skaiciai(pTekstas(e.reik) + ' ' + pTekstas(e.dok)) !== skaiciai(reik.join(' ') + ' ' + dok.join(' '))) p.push('skaičiai vertime ne tokie patys kaip lietuviškai');
      if (LT_RAIDES.test(reik.join(' ') + dok.join(' '))) p.push('vertime liko lietuviškų raidžių');
      eil[i] = { reik, dok };
      if (p.length) perspejimai[i] = p;
    });
    const antrastes = {};
    if (partija.antrastes.length && Array.isArray(o.antrastes)) partija.antrastes.forEach((lt, k) => { const v = String(o.antrastes[k] || '').trim(); if (v) antrastes[lt] = v; });
    let neVisa = null;
    if (partija.neVisa && Array.isArray(o.neVisa) && o.neVisa.filter(z => String(z || '').trim()).length === partija.neVisa.filter(z => z.trim()).length)
      neVisa = o.neVisa.map(z => String(z == null ? '' : z).trim());
    return { eil, nepavyko, perspejimai, antrastes, neVisa };
  }
  /* Kiek eilučių išversta DI (žmogaus taisytos irgi skaičiuojamos - tekstas parengtas naudojant DI). */
  const diVertimuSk = (M, vertimas) => M ? numeriai(M, {}, vertimas).filter(e => e.diVertimas).length : 0;
  function punktai(nr, budas){
    const a = (nr || []).map(String);
    if (!a.length) return '';
    if (a.length === 1) return a[0];
    if (budas === 'ir/ar') return a.join(' ir/ar ');
    if (budas === 'and/or') return a.join(' and/or ');
    return a.slice(0, -1).join(', ') + (budas === 'and' ? ' and ' : ' ir ') + a[a.length - 1];
  }
  const grupesPav = (g, antraste, kalba) => g && GRUPES[g] ? GRUPES[g][kalba === 'en' ? 'en' : 'lt'] : (antraste ? (kalba === 'en' ? antraste.en : antraste.lt) : '');
  /* Grupės, kurios kartojasi neiš eilės (lentelėje antraštė būtų du kartus). */
  function grupiuTvarka(E){
    const seka = [];
    E.forEach(e => { const r = e.grupe === 'kita' ? 'kita:' + (e.antraste && e.antraste.lt) : e.grupe; if (seka[seka.length - 1] !== r) seka.push(r); });
    const kart = seka.filter((r, i) => seka.indexOf(r) !== i);
    return { seka, kartojasi: [...new Set(kart)] };
  }

  /* Nuoseklumo pastabos: SPS sąvokos ir procedūra (kontekstas: { terminas: 'pasiulymas' | 'paraiska', dvikalbis, pakeitimai, vertimas,
     pavKur - kur lentelė, pvz. „SPS 2 lentelėje“ }). */
  function pastabos(M, ktx){
    const out = (M.ispejimai || []).slice();
    const visas = M.eilutes.map(e => pTekstas(e.reik) + '\n' + pTekstas(e.dok)).join('\n');
    const n = norm(visas);
    const rang = (visas.match(/\bRangov\S*/g) || []);
    if (rang.length) out.push(`Reikalavimuose vartojama sąvoka „${rang[0]}“ (${rang.length} k.), o pirkimo sąlygose - „Tiekėjas“. Jei tai ne sąmoninga, pataisykite savo dokumente ir įkelkite iš naujo.`);
    const t = ktx && ktx.terminas;
    if (t === 'pasiulymas' && /paraisk/.test(n)) out.push('Reikalavimuose minima „Paraiška“, o šiame pirkimo būde teikiamas „Pasiūlymas“ - patikrinkite terminų formuluotes.');
    if (t === 'paraiska' && /pasiulym/.test(n) && !/paraisk/.test(n)) out.push('Reikalavimuose minimas „Pasiūlymas“, o šiame pirkimo būde pirmiausia teikiama „Paraiška“ - patikrinkite terminų formuluotes.');
    if (ktx && ktx.dvikalbis && !M.dvikalbe){
      const be = numeriai(M, {}, ktx.vertimas).filter(e => !pTekstas(e.reikEN)).length;
      if (be) out.push(`Pirkimo sąlygos dvikalbės, o įkeltoje lentelėje anglų kalbos nėra: ${be === M.eilutes.length ? 'angliški langeliai' : `${be} eilučių angliški langeliai`} liks raudoni su nurodymu. Pasiūlykite vertimą (DI) žemiau, įkelkite dvikalbį dokumentą (pvz. PP-qual LT / EN) arba įrašykite vertimą Word programoje.`);
    }
    const g = grupiuTvarka(numeriai(M, ktx && ktx.pakeitimai));
    if (g.kartojasi.length) out.push('Reikalavimai neišdėstyti grupėmis iš eilės - lentelėje grupės antraštė pasikartos. Eilučių tvarka nekeičiama, nes tekste gali būti nuorodų į punktų numerius.');
    const sn = M.saltinioNumeriai.filter(Boolean);
    if (sn.length === M.eilutes.length && sn.some((x, i) => x !== String(i + 1)))
      out.push(`Šaltinio eilutės numeruotos ${sn[0]}-${sn[sn.length - 1]}, ${(ktx && ktx.pavKur) || 'SPS lentelėje'} bus 1-${M.eilutes.length}: patikrinkite nuorodas į punktus reikalavimų tekste.`);
    return out;
  }

  /* ---------- Įrašymas į sugeneruotą SPS ------------------------------------------------------------------------ */
  const tekstas = el => visi(el, 't').map(t => t.textContent).join('');
  /* Lentelės pavadinimas prieš ją: SPS - „2 lentelė“, DPS sukūrimo sąlygos (2026-10-14) - „2 priedo 1 lentelė „Kvalifikacijos
     reikalavimai““, dvikalbės - „2 priedo 1 lentelė /“ ir „Table 1 of Annex 2“. */
  const LENTELES_PAV = /^(\d+\s*(priedo\s+\d+\s*)?lentel|table\s+\d+)/i;
  /* Kvalifikacijos lentelė: pirma kūno lentelė, kurios antraštėje „Kvalifikacijos reikalavim...“ ir dokumentų stulpelis, o prieš ją - pavadinimas. */
  function raskLentele(doc){
    const body = visi(doc, 'body')[0];
    if (!body) return null;
    const kunas = vaikai(body);
    for (let i = 0; i < kunas.length; i++){
      if (kunas[i].localName !== 'tbl') continue;
      const tr0 = vaikas(kunas[i], 'tr');
      if (!tr0 || !/kvalifikacijos reikalavim/i.test(tekstas(tr0))) continue;
      const st0 = stulpeliai(langeliai(tr0));
      if (!st0.reik || !(st0.dok || st0.dokLt)) continue;          // pvz. DPS LT/EN priedo antraštinė lentelė „TIEKĖJŲ KVALIFIKACIJOS REIKALAVIMAI ...“
      for (let j = i - 1; j >= 0; j--){
        if (kunas[j].localName === 'tbl') break;
        if (kunas[j].localName !== 'p') continue;
        const t = tekstas(kunas[j]).trim();
        if (!t) continue;
        if (LENTELES_PAV.test(t)) return kunas[i];
        break;
      }
    }
    return null;
  }
  function sablonoEilutes(tbl){
    const eil = vaikai(tbl, 'tr');
    const st = stulpeliai(langeliai(eil[0]));
    const R = { antraste: eil[0], st, grupes: {}, prototipai: {}, kitos: [], neVisaAntraste: null, neVisaTurinys: [], pirmasPrototipas: null, pirmaGrupe: null };
    let dabar = null, nv = false;
    eil.slice(1).forEach(tr => {
      const c = langeliai(tr), t = norm(c.map(x => x.tekstas).join(' '));
      if (c.length === 1 && !nv){
        const g = Object.keys(GRUPES).find(k => GRUPES[k].re.test(t));
        if (g){ R.grupes[g] = tr; R.pirmaGrupe = R.pirmaGrupe || tr; dabar = g; R.kitos.push(tr); return; }
        if (NE_VISA_RE.test(t)){ R.neVisaAntraste = tr; nv = true; return; }
      }
      if (nv){ R.neVisaTurinys.push(tr); return; }
      R.kitos.push(tr);
      if (c.length > 1){ if (dabar && !R.prototipai[dabar]) R.prototipai[dabar] = tr; R.pirmasPrototipas = R.pirmasPrototipas || tr; }
    });
    return R;
  }
  const langelisPagal = (tr, stulp) => stulp ? (langeliai(tr).find(x => x.nuo <= stulp.nuo && x.iki >= stulp.nuo) || null) : null;
  const EBVPD_RE = /tik ebvpd|only the espd/i;

  function baziniaiRPr(tbl){
    for (const r of visi(tbl, 'r')){
      const rp = vaikas(r, 'rPr');
      if (rp && vaikas(rp, 'rFonts') && !RAUDONA.test(atr(vaikas(rp, 'color'), 'val') || '')){
        const k = rp.cloneNode(true);
        vaikai(k).forEach(x => { if (!/^(rFonts|sz|szCs|lang)$/.test(x.localName)) k.removeChild(x); });
        return k;
      }
    }
    return null;
  }
  function naujas(doc, vardas){ return doc.createElementNS(W, 'w:' + vardas); }
  function nustatyk(el, a, v){ el.setAttributeNS(W, 'w:' + a, v); }
  function pastraiposPPr(doc, pavyzdys){
    const pPr = pavyzdys ? pavyzdys.cloneNode(true) : naujas(doc, 'pPr');
    vaikai(pPr).forEach(x => { if (/^(numPr|tabs|rPr|pStyle|contextualSpacing)$/.test(x.localName)) pPr.removeChild(x); });
    let sp = vaikas(pPr, 'spacing');
    if (!sp){ sp = naujas(doc, 'spacing'); pPr.insertBefore(sp, pPr.firstChild); }
    nustatyk(sp, 'before', '60'); nustatyk(sp, 'after', '60');
    return pPr;
  }
  function atkarpa(doc, a, rPr0){
    const r = naujas(doc, 'r');
    const rp = rPr0 ? rPr0.cloneNode(true) : naujas(doc, 'rPr');
    const pirm = x => rp.insertBefore(x, vaikas(rp, 'sz') || vaikas(rp, 'lang') || null);
    if (a.b){ pirm(naujas(doc, 'b')); pirm(naujas(doc, 'bCs')); }
    if (a.i){ pirm(naujas(doc, 'i')); pirm(naujas(doc, 'iCs')); }
    if (RAUDONA.test(a.spalva || '')){ const c = naujas(doc, 'color'); nustatyk(c, 'val', 'FF0000'); pirm(c); }
    if (a.u){ const u = naujas(doc, 'u'); nustatyk(u, 'val', 'single'); rp.insertBefore(u, vaikas(rp, 'lang') || null); }
    if (a.va === 'superscript' || a.va === 'subscript'){ const v = naujas(doc, 'vertAlign'); nustatyk(v, 'val', a.va); rp.insertBefore(v, vaikas(rp, 'lang') || null); }
    r.appendChild(rp);
    bruksniai(a.t).split('\n').forEach((s, k) => {
      if (k) r.appendChild(naujas(doc, 'br'));
      if (!s) return;
      const t = naujas(doc, 't'); t.setAttributeNS(XML_NS, 'xml:space', 'preserve'); t.textContent = s; r.appendChild(t);
    });
    return r;
  }
  function pastraipa(doc, ps, pPr0, rPr0){
    const p = naujas(doc, 'p');
    p.appendChild(pPr0.cloneNode(true));
    ps.atk.forEach(a => p.appendChild(atkarpa(doc, a, rPr0)));
    return p;
  }
  /* Langelio turinys: pastraipos vietoj šablono (lieka tik EBVPD pastaba, jei ji neištrinta). */
  function pildykLangeli(doc, tc, ps, rPr0, opts){
    const esamos = vaikai(tc, 'p'), pav = vaikas(esamos[0], 'pPr');
    const pPr0 = pastraiposPPr(doc, pav);
    const lieka = (opts && opts.palikti) ? esamos.filter(p => EBVPD_RE.test(tekstas(p))) : [];
    esamos.forEach(p => { if (!lieka.includes(p)) tc.removeChild(p); });
    const pirmas = lieka[0] || null;
    // ps: pastraipos; [] - tuščias langelis; null - teksto nėra (dvikalbėje lentelėje - raudonas nurodymas įrašyti vertimą)
    const naujos = ps && ps.length ? ps : (ps == null && opts && opts.zyma ? [{ atk: [{ t: opts.zyma, spalva: 'FF0000' }] }] : [{ atk: [] }]);
    naujos.forEach(x => tc.insertBefore(pastraipa(doc, x, pPr0, rPr0), pirmas));
    vaikai(tc, 'tbl').forEach(t => tc.removeChild(t));
  }
  function antrastesEiluteSu(doc, sablonas, lt, en, dvikalbis){
    const tr = sablonas.cloneNode(true);
    const tc = vaikas(tr, 'tc'), p = vaikai(tc, 'p')[0];
    const r0 = visi(p, 'r')[0];
    const rPr = r0 && vaikas(r0, 'rPr') ? vaikas(r0, 'rPr').cloneNode(true) : null;
    vaikai(tc, 'p').slice(1).forEach(x => tc.removeChild(x));
    vaikai(p).forEach(x => { if (x.localName !== 'pPr') p.removeChild(x); });
    const r = naujas(doc, 'r');
    if (rPr) r.appendChild(rPr);
    const t = naujas(doc, 't'); t.setAttributeNS(XML_NS, 'xml:space', 'preserve');
    t.textContent = bruksniai(dvikalbis && en ? `${lt} / ${en}` : lt);
    r.appendChild(t); p.appendChild(r);
    return tr;
  }
  const VERTIMO_ZYMA = 'Įrašykite vertimą į anglų kalbą.';
  /* „Laikyti su kitu“ (2026-10-15, naudotojo sprendimas „Tik Word“): lentelės antraštės ir grupių antraščių eilučių pastraipoms - w:keepNext.
     Word tokią eilutę laiko su kita eilute - antraštė nelieka viena puslapio apačioje. Pages šio požymio lentelėse nepaiso (išbandyta PDF
     eksportu); vienintelis būdas ten - skaidyti kitą eilutę, bet tada visose programose dokumentų stulpelio tekstas pirmoje eilutėje po
     antrašte prasidėtų žemiau, todėl to nedarome. keepNext - pastraipos savybių pradžioje (po pStyle, kaip schemoje). */
  function laikykSuKitu(doc, tr){
    visi(tr, 'p').forEach(p => {
      let pPr = vaikas(p, 'pPr');
      if (!pPr){ pPr = naujas(doc, 'pPr'); p.insertBefore(pPr, p.firstChild); }
      if (vaikas(pPr, 'keepNext')) return;
      const st = vaikas(pPr, 'pStyle');
      pPr.insertBefore(naujas(doc, 'keepNext'), st ? st.nextSibling : pPr.firstChild);
    });
    return tr;
  }
  /* Grupės antraštės eilutė formai, kurioje jų nėra (DPS sukūrimo sąlygų LT 2 priedo 1 lentelė; naudotojo sprendimas 2026-10-15 - kaip SPS
     2 lentelėje ir LT/EN priede): vienas langelis per visą plotį, tekstas pusjuodis ir centruotas, rėmeliai ir lygiavimas vertikaliai - kaip
     formos eilutės; aukštis - pagal turinį (formos eilutės aukštis pritaikytas tuščiai reikalavimo vietai). Tekstą įrašo antrastesEiluteSu. */
  function grupesEilute(doc, tbl, proto, rPr0){
    const tr = proto.cloneNode(true);
    const trPr = vaikas(tr, 'trPr');
    if (trPr) vaikai(trPr, 'trHeight').forEach(x => trPr.removeChild(x));
    const tcs = vaikai(tr, 'tc'), tc = tcs[0];
    tcs.slice(1).forEach(x => tr.removeChild(x));
    // stulpelių skaičius ir plotis - iš lentelės tinklelio, be jo - iš formos eilutės langelių
    const grid = visi(vaikas(tbl, 'tblGrid'), 'gridCol'), lp = langeliai(proto);
    const n = grid.length || lp.reduce((a, c) => Math.max(a, c.iki + 1), 0);
    const plotis = grid.length ? grid.reduce((a, g) => a + (parseInt(atr(g, 'w'), 10) || 0), 0)
      : lp.reduce((a, c) => a + (parseInt(atr(vaikas(vaikas(c.tc, 'tcPr'), 'tcW'), 'w'), 10) || 0), 0);
    let pr = vaikas(tc, 'tcPr');
    if (!pr){ pr = naujas(doc, 'tcPr'); tc.insertBefore(pr, tc.firstChild); }
    vaikai(pr, 'gridSpan').concat(vaikai(pr, 'vMerge'), vaikai(pr, 'hMerge')).forEach(x => pr.removeChild(x));
    let w = vaikas(pr, 'tcW');
    if (!w){ w = naujas(doc, 'tcW'); pr.insertBefore(w, pr.firstChild); }
    if (plotis){ nustatyk(w, 'w', String(plotis)); nustatyk(w, 'type', 'dxa'); }
    const gs = naujas(doc, 'gridSpan'); nustatyk(gs, 'val', String(n)); pr.insertBefore(gs, w.nextSibling);
    if (!atr(w, 'w')) pr.removeChild(w);                          // pločio nežinome - be tuščio tcW (GPLent pločius sutvarko pats)
    const pPr = pastraiposPPr(doc, vaikas(vaikai(tc, 'p')[0], 'pPr'));
    vaikai(pPr, 'jc').forEach(x => pPr.removeChild(x));
    const jc = naujas(doc, 'jc'); nustatyk(jc, 'val', 'center');
    pPr.insertBefore(jc, vaikai(pPr).find(x => /^(textDirection|textAlignment|textboxTightWrap|outlineLvl|divId|cnfStyle|rPr|sectPr|pPrChange)$/.test(x.localName)) || null);   // schemos tvarka
    vaikai(tc).filter(x => x.localName !== 'tcPr').forEach(x => tc.removeChild(x));
    const p = naujas(doc, 'p'); p.appendChild(pPr); p.appendChild(atkarpa(doc, { t: '', b: true }, rPr0)); tc.appendChild(p);
    return tr;
  }

  /* Klonai: žymės ir komentarai nešalinami kartu su originalu, o pastraipų w14 identifikatoriai turi būti unikalūs. */
  function valykKlona(tr){
    visi(tr, 'bookmarkStart').concat(visi(tr, 'bookmarkEnd'), visi(tr, 'commentRangeStart'), visi(tr, 'commentRangeEnd'), visi(tr, 'commentReference'))
      .forEach(x => x.parentNode && x.parentNode.removeChild(x));
    [tr, ...Array.from(tr.getElementsByTagName('*'))].forEach(x => Array.from(x.attributes || []).forEach(a => {
      if (a.localName === 'paraId' || a.localName === 'textId') x.removeAttributeNode(a);
    }));
    return tr;
  }
  /* opts: { pakeitimai, dvikalbis } -> { eiluciu, grupes: [{ pav, kiek }], pasalintos: [pav], specialistai: [nr], neVisa } */
  function irasyk(doc, M, opts){
    const o = opts || {};
    const tbl = raskLentele(doc);
    if (!tbl || !M || !M.eilutes.length) return null;
    const R = sablonoEilutes(tbl);
    const st = R.st;
    const ltReik = st.reikLt || st.reik, ltDok = st.dokLt || st.dok;
    const enReik = st.reikEn && st.reikEn !== ltReik ? st.reikEn : null, enDok = st.dokEn && st.dokEn !== ltDok ? st.dokEn : null;
    const dvikalbis = !!(enReik || enDok);
    const rPr0 = baziniaiRPr(tbl);
    const E = numeriai(M, o.pakeitimai, o.vertimas);
    const pries = R.neVisaAntraste || null;
    const sukurta = !R.pirmaGrupe && R.pirmasPrototipas ? grupesEilute(doc, tbl, R.pirmasPrototipas, rPr0) : null;   // forma be grupių antraščių
    const kiek = {}, naudotos = new Set();
    let dabar = null;
    const nauji = [];
    E.forEach(e => {
      const g = e.grupe || 'techninis';
      const rkt = g === 'kita' ? 'kita:' + (e.antraste && e.antraste.lt) : g;
      if (rkt !== dabar){
        dabar = rkt;
        const sab = R.grupes[g] || R.pirmaGrupe || sukurta;
        if (sab){
          if (GRUPES[g]) nauji.push(laikykSuKitu(doc, R.grupes[g] && !naudotos.has(g) ? R.grupes[g].cloneNode(true) : antrastesEiluteSu(doc, sab, GRUPES[g].lt, GRUPES[g].en, dvikalbis)));
          else nauji.push(laikykSuKitu(doc, antrastesEiluteSu(doc, sab, (e.antraste && e.antraste.lt) || 'Kiti reikalavimai', e.antraste && e.antraste.en, dvikalbis)));
        }
        naudotos.add(g);
      }
      const pav = R.prototipai[g] || R.prototipai.techninis || R.pirmasPrototipas;
      if (!pav) return;
      const tr = pav.cloneNode(true);
      const nrL = langelisPagal(tr, st.nr);
      if (nrL) pildykLangeli(doc, nrL.tc, [{ atk: [{ t: e.nr + '.' }] }], rPr0);
      const rl = langelisPagal(tr, ltReik), dl = langelisPagal(tr, ltDok);
      if (rl) pildykLangeli(doc, rl.tc, e.reik, rPr0);
      if (dl && dl !== rl) pildykLangeli(doc, dl.tc, e.dok, rPr0, { palikti: true });
      if (enReik){ const x = langelisPagal(tr, enReik); if (x) pildykLangeli(doc, x.tc, e.reikEN && pTekstas(e.reikEN) ? e.reikEN : null, rPr0, { zyma: VERTIMO_ZYMA }); }
      if (enDok){ const x = langelisPagal(tr, enDok); if (x) pildykLangeli(doc, x.tc, e.dokEN && pTekstas(e.dokEN) ? e.dokEN : (pTekstas(e.dok) ? null : []), rPr0, { palikti: true, zyma: VERTIMO_ZYMA }); }
      nauji.push(tr);
      const pv = grupesPav(g, e.antraste, 'lt') || GRUPES.techninis.lt;
      kiek[pv] = (kiek[pv] || 0) + 1;
    });
    // šablono grupių ir tuščių eilučių vietoje - perkeltos eilutės; lentelės antraštė - su pirmąja grupe
    R.kitos.forEach(tr => { if (tr.parentNode) tr.parentNode.removeChild(tr); });
    laikykSuKitu(doc, R.antraste);
    nauji.forEach(tr => {
      valykKlona(tr);
      tbl.insertBefore(tr, pries && pries.parentNode === tbl ? pries : null);
    });
    // „ne visa apimtimi“ iš įkelto dokumento (tik kai šablono nuostatos klausimas neatsakytas žmogaus - opts.neVisa)
    let neVisa = null;
    if (o.neVisa !== false && M.neVisa && pTekstas(M.neVisa.lt)){
      let tr = R.neVisaTurinys.find(x => x.parentNode) || null;
      if (!tr && R.neVisaAntraste){ tr = R.neVisaAntraste.cloneNode(true); tbl.insertBefore(tr, R.neVisaAntraste.nextSibling); }
      if (tr){
        const c = langeliai(tr);
        pildykLangeli(doc, c[0].tc, M.neVisa.lt, rPr0);
        const nvEn = M.neVisa.en && pTekstas(M.neVisa.en) ? M.neVisa.en : (o.vertimas && o.vertimas.neVisa ? enPastraipos(M.neVisa.lt, o.vertimas.neVisa) : null);
        if (c[1]) pildykLangeli(doc, c[1].tc, nvEn, rPr0, { zyma: VERTIMO_ZYMA });
        R.neVisaTurinys.filter(x => x !== tr && x.parentNode).forEach(x => tbl.removeChild(x));
        if (R.neVisaAntraste && R.neVisaAntraste.parentNode) laikykSuKitu(doc, R.neVisaAntraste);
        neVisa = 'is-dokumento';
      }
    }
    const pasalintos = Object.keys(GRUPES).filter(g => R.grupes[g] && !naudotos.has(g)).map(g => GRUPES[g].lt);
    return { eiluciu: E.length, grupes: Object.entries(kiek).map(([pav, n]) => ({ pav, kiek: n })), pasalintos, diVertimu: dvikalbis ? E.filter(e => e.diVertimas).length : 0,
      specialistai: E.filter(e => e.specialistas).map(e => e.nr), neVisa, dvikalbis, beVertimo: dvikalbis ? E.filter(e => !pTekstas(e.reikEN)).length : 0,
      antrastesIrasytos: !!sukurta, neVisaNeperkelta: !R.neVisaAntraste && !!(M.neVisa && pTekstas(M.neVisa.lt)) };
  }

  /* ---------- Žaliųjų reikalavimų lentelė (2026-10-18) --------------------------------------------------------------------------------
     SPS 3 lentelė „REIKALAVIMAI ŽALIESIEMS PIRKIMAMS“ (dvikalbėse - ir „REQUIREMENT FOR ENVIRONMENTAL PROCUREMENTS“): šablono reikalavimų
     eilutės (ISO 14001 / EMAS) pakeičiamos įkelto dokumento žaliųjų reikalavimų lentelės eilutėmis - tekstas pažodžiui, tvarka kaip
     dokumente, numeriai 1-N; antraštės eilutės lieka ir laikomos su kita eilute. Dvikalbėje be anglų teksto - raudonas nurodymas įrašyti
     vertimą (kaip kvalifikacijos lentelėje). */
  const ZAL_LENT_RE = /reikalavimai zaliesiems pirkimams|(^|[^a-z])zalieji reikalavimai|requirements? for environmental procurement/;   // ND, MVP - „ŽALIEJI REIKALAVIMAI“
  function raskZaliujuLentele(doc){
    const body = visi(doc, 'body')[0];
    if (!body) return null;
    for (const tbl of vaikai(body, 'tbl')){
      const eil = vaikai(tbl, 'tr');
      if (!eil.length || !ZAL_LENT_RE.test(norm(tekstas(eil[0])))) continue;
      for (let k = 0; k < Math.min(3, eil.length); k++){
        const st = stulpeliai(langeliai(eil[k]));
        if (st.reik && (st.dok || st.dokLt)) return { tbl, k, st, nr: st.nr || stulpeliai(langeliai(eil[0])).nr || null };
      }
    }
    return null;
  }
  function irasykZaliuosius(doc, M){
    const R = raskZaliujuLentele(doc);
    if (!R || !M || !M.eilutes.length) return null;
    const { tbl, k, st } = R;
    const eil = vaikai(tbl, 'tr'), duom = eil.slice(k + 1);
    const proto = duom.find(tr => langeliai(tr).length > 1);
    if (!proto) return null;
    const ltReik = st.reikLt || st.reik, ltDok = st.dokLt || st.dok;
    const enReik = st.reikEn && st.reikEn !== ltReik ? st.reikEn : null, enDok = st.dokEn && st.dokEn !== ltDok ? st.dokEn : null;
    const dvikalbis = !!(enReik || enDok);
    const rPr0 = baziniaiRPr(tbl);
    const nauji = M.eilutes.map((e, i) => {
      const tr = proto.cloneNode(true);
      const nrL = langelisPagal(tr, R.nr);
      if (nrL) pildykLangeli(doc, nrL.tc, [{ atk: [{ t: (i + 1) + '.' }] }], rPr0);
      const rl = langelisPagal(tr, ltReik), dl = langelisPagal(tr, ltDok);
      if (rl) pildykLangeli(doc, rl.tc, e.reik, rPr0);
      if (dl && dl !== rl) pildykLangeli(doc, dl.tc, e.dok, rPr0);
      if (enReik){ const x = langelisPagal(tr, enReik); if (x) pildykLangeli(doc, x.tc, e.reikEN && pTekstas(e.reikEN) ? e.reikEN : null, rPr0, { zyma: VERTIMO_ZYMA }); }
      if (enDok){ const x = langelisPagal(tr, enDok); if (x) pildykLangeli(doc, x.tc, e.dokEN && pTekstas(e.dokEN) ? e.dokEN : (pTekstas(e.dok) ? null : []), rPr0, { zyma: VERTIMO_ZYMA }); }
      return valykKlona(tr);
    });
    duom.forEach(tr => tbl.removeChild(tr));
    nauji.forEach(tr => tbl.appendChild(tr));
    eil.slice(0, k + 1).forEach(tr => laikykSuKitu(doc, tr));
    return { eiluciu: nauji.length, dvikalbis, beVertimo: dvikalbis ? M.eilutes.filter(e => !pTekstas(e.reikEN)).length : 0 };
  }

  /* Tiekėjo patirties (įvykdytų sutarčių) reikalavimai - ne specialistų. Formose būna nuoroda į konkretų lentelės punktą
     (DPS sukūrimo sąlygų 5 priedas „Atliktų darbų sąrašas“: „pagal kvalifikacijos reikalavimų 1 lentelės 8 punktą“). */
  const PATIRTIS_RE = /(patirt|ivykd|atlikt\S* (darb|paslaug)|vykdyt\S* sutart)/;
  const patirtiesEilutes = E => E.filter(e => !e.specialistas && PATIRTIS_RE.test(norm(pTekstas(e.reik)))).map(e => e.nr);

  /* „Informacija dėl kvalifikacinių reikalavimų taikymo ne visa apimtimi“ be turinio (nuostata „Netaikyti“): iki 2026-10-14
     dokumente likdavo antraštė ir tuščia eilutė. Grąžina, ar pašalinta. */
  function tusciaNeVisa(doc){
    const tbl = raskLentele(doc);
    if (!tbl) return false;
    const R = sablonoEilutes(tbl);
    if (!R.neVisaAntraste || R.neVisaTurinys.some(tr => tekstas(tr).trim())) return false;
    [R.neVisaAntraste, ...R.neVisaTurinys].forEach(tr => tr.parentNode && tr.parentNode.removeChild(tr));
    return true;
  }

  root.GP_KVAL_LENTELE = { skaityk, skaitykXml, skaitykPdf, pdfLenteles, irasykZaliuosius, raskZaliujuLentele, grupe, specialistas, numeriai, punktai, pastabos, irasyk, tusciaNeVisa,
    vertimoPartijos, vertimoUzklausa, vertimoAtsakymas, diVertimuSk, enPastraipos, VERTIMO_TERMINAI,
    raskLentele, GRUPES, grupesPav, grupiuTvarka, pTekstas, VERTIMO_ZYMA, patirtiesEilutes, LENTELES_PAV };
})(typeof window !== 'undefined' ? window : this);
