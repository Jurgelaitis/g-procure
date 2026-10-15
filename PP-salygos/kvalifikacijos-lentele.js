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
 *   skaityk(buf, vardas)        -> Promise<{ lenteles: [Modelis], zalieji, ispejimai }>
 *   skaitykXml(xml, numXml, v)  -> tas pats be ZIP (testams)
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
    const out = { lenteles: [], zalieji: 0, ispejimai: [] };
    if (!body) return out;
    const tbls = visi(body, 'tbl').filter(t => !protevis(t, 'tbl'));
    tbls.forEach((tbl, ti) => {
      const eil = vaikai(tbl, 'tr');
      const a = antrastesEilute(eil);
      if (!a) return;
      const virsus = eil.slice(0, a.k + 2).map(tr => norm(langeliai(tr).map(c => c.tekstas).join(' '))).join(' ');
      if (ZALIEJI_RE.test(virsus)){ out.zalieji++; return; }
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
      out.lenteles.push(M);
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
          if (GRUPES[g]) nauji.push(R.grupes[g] && !naudotos.has(g) ? R.grupes[g].cloneNode(true) : antrastesEiluteSu(doc, sab, GRUPES[g].lt, GRUPES[g].en, dvikalbis));
          else nauji.push(antrastesEiluteSu(doc, sab, (e.antraste && e.antraste.lt) || 'Kiti reikalavimai', e.antraste && e.antraste.en, dvikalbis));
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
    // šablono grupių ir tuščių eilučių vietoje - perkeltos eilutės
    R.kitos.forEach(tr => { if (tr.parentNode) tr.parentNode.removeChild(tr); });
    nauji.forEach(tr => {
      // klonai: žymės ir komentarai nešalinami kartu su originalu, o pastraipų w14 identifikatoriai turi būti unikalūs
      visi(tr, 'bookmarkStart').concat(visi(tr, 'bookmarkEnd'), visi(tr, 'commentRangeStart'), visi(tr, 'commentRangeEnd'), visi(tr, 'commentReference'))
        .forEach(x => x.parentNode && x.parentNode.removeChild(x));
      [tr, ...Array.from(tr.getElementsByTagName('*'))].forEach(x => Array.from(x.attributes || []).forEach(a => {
        if (a.localName === 'paraId' || a.localName === 'textId') x.removeAttributeNode(a);
      }));
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
        neVisa = 'is-dokumento';
      }
    }
    const pasalintos = Object.keys(GRUPES).filter(g => R.grupes[g] && !naudotos.has(g)).map(g => GRUPES[g].lt);
    return { eiluciu: E.length, grupes: Object.entries(kiek).map(([pav, n]) => ({ pav, kiek: n })), pasalintos, diVertimu: dvikalbis ? E.filter(e => e.diVertimas).length : 0,
      specialistai: E.filter(e => e.specialistas).map(e => e.nr), neVisa, dvikalbis, beVertimo: dvikalbis ? E.filter(e => !pTekstas(e.reikEN)).length : 0,
      antrastesIrasytos: !!sukurta, neVisaNeperkelta: !R.neVisaAntraste && !!(M.neVisa && pTekstas(M.neVisa.lt)) };
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

  root.GP_KVAL_LENTELE = { skaityk, skaitykXml, grupe, specialistas, numeriai, punktai, pastabos, irasyk, tusciaNeVisa,
    vertimoPartijos, vertimoUzklausa, vertimoAtsakymas, diVertimuSk, enPastraipos, VERTIMO_TERMINAI,
    raskLentele, GRUPES, grupesPav, grupiuTvarka, pTekstas, VERTIMO_ZYMA, patirtiesEilutes, LENTELES_PAV };
})(typeof window !== 'undefined' ? window : this);
