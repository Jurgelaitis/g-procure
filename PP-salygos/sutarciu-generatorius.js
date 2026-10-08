/*
 * PP-salygos: sutarties projekto generavimas iš paruošto šablono (GP_SUTARCIU_GEN, sutarčių planas S4, 2026-10-08;
 * docs/salygos/sutartys-planas-2026-10.md 4.2-4.5). Šablonas - templates/sutartys/<KODAS>.docx, vietos - jo žemėlapis
 * zemelapiai/sutartys/<KODAS>.json (sutarciu-sablonai.py; pastraipų numeracija - visos <w:p> dokumento tvarka).
 *
 *   GP_SUTARCIU_GEN.vietos(zemelapis) -> [{ raktas, rusis, vieta, aprasas, elementai?, variantai?, pildo? }]
 *     lietuviškos vietos, kurioms reikia sprendimo (LT/EN dokumente angliški atitikmenys seka lietuviškus pagal vietą ir eilę).
 *   GP_SUTARCIU_GEN.generuok(buf, zemelapis, sprendimai, info) -> Promise<{ blob, ataskaita }>
 *     sprendimai pagal raktą:
 *       "v:<nr>"         valdiklis: { elementas: k, reiksmes: [...], reiksmesEN } - reikšmės vietoj „[...]“, „[_]“, „{...}“ elemento tekste;
 *                        teksto valdiklis (be elementų): { tekstas, tekstasEN }; { salinti: true } - valdiklis pašalinamas be teksto
 *       "a:<vieta>[#n]"  alternatyva: { variantas: k }
 *       "n:<vieta>#n"    nurodymas rengėjui: "salinti" arba { tekstas, tekstasEN } (įrašoma vietoj nurodymo)
 *       "p:<vieta>#n"    pildoma vieta pastraipoje: { tekstas, tekstasEN }
 *       "l:<etiketė>"    tuščias laukas: { tekstas, tekstasEN }
 *       "t:<vieta>"      skyriaus taikymo sąlyga „(taikoma, jeigu ...)“: "salinti"
 *       "s:<vieta>"      sąlyginis blokas „Jei punktas taikomas:“ be „Netaikoma“ varianto (paslaugų 13.1-13.2): { taikoma: true } - lieka
 *                        tekstas, { taikoma: false, tekstas, tekstasEN } - tekstas iki langelio pabaigos šalinamas, vietoje jo - `tekstas`
 *     Valdiklio angliškas elementas - tas pats eilės numeris; kai anglų sąraše elementų mažiau („mėnesį / mėnesius / mėnesių“ -> „month. /
 *     months.“) - pagal ATITIKMENYS arba sprendimo `elementasEN`.
 *     Be sprendimo arba { palikti: "sudarant" | "neatsakyta" } - vieta lieka kaip šablone (valdiklis - pasirenkamas Word) ir įrašoma
 *     į ataskaitos „palikta“. Visada: „ĮMONĖS PAVADINIMAS“ -> info.imone (numatyta LITGRID AB); šablono nurodymas „Jei (punktas)
 *     netaikoma(s), visą žemiau esantį tekstą ištrinti:“ - pašalinamas, o kai to langelio valdiklyje pasirinkta „netaikoma“ - ir
 *     tekstas po juo iki langelio pabaigos; išspręstų vietų geltonas žymėjimas, VPT mėlynos pritaikomos nuostatos ir keičiamos
 *     reikšmės - juodu tekstu; DI vertimo juodraščiai (LT/EN anglų stulpelis) lieka pažymėti. Tada lentelės (GPLent - Pages) ir pasas.
 *   ataskaita: { pakeista, pasalinta, palikta, klaidos, lenteles }. Klaida (šablonas nesutampa su žemėlapiu, pakeista ne žemėlapio
 *     vieta, liko „Pasirinkite elementą“ ne paliktame valdiklyje, liko nurodymas išspręstoje vietoje) - blob null, atsisiųsti negalima.
 *
 * Šablono tekstas nekeičiamas: keičiamos tik žemėlapio vietos, o patikra po generavimo lygina kiekvieną nepaliestą pastraipą su
 * šablonu, paliestoje - kad pasikeitė tik ta atkarpa. DI nenaudojamas, niekas nesiunčiama ir nesaugoma.
 */
const GP_SUTARCIU_GEN = (() => {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const visi = (n, tag) => Array.from(n.getElementsByTagNameNS(W, tag));
  const vaikai = (n, tag) => Array.from(n.childNodes).filter(c => c.nodeType === 1 && (!tag || c.localName === tag));
  const vaikas = (n, tag) => vaikai(n, tag)[0] || null;
  const naujas = (d, tag) => d.createElementNS(W, 'w:' + tag);
  const tarpai = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const TRYN = /^(jei (punktas )?netaikoma?s?, visą žemiau esantį tekstą ištrinti:|if (not applicable|the clause does not apply), delete all the text below:)$/i;
  const NETAIKOMA = /netaikom|not applicable|does not apply/i;
  const VIETA_REZ = /\[\.\.\.\]|\[…\]|\[_\]|\{\.*\}/g;
  const PASIRINKITE = /Pasirinkite elementą|Choose an item/;
  const IMONE = 'ĮMONĖS PAVADINIMAS';
  const SALYGA = /^(jei punktas taikomas:|if the clause applies:)$/i;
  /* LT -> EN valdiklio elementas, kai anglų sąraše elementų mažiau (LT/EN paslaugų SS 4.1 vienetai) - tik vienareikšmiai atitikmenys */
  const ATITIKMENYS = [[/^mėnesį\.?$/i, /^month\.?$/i], [/^mėnes(ius|ių|iai)\.?$/i, /^months\.?$/i], [/^dieną\.?$/i, /^day\.?$/i],
                       [/^dien(as|ų|os)\.?$/i, /^days\.?$/i], [/^punktas netaikomas\.?$/i, /^the clause does not apply\.?$/i]];
  const MELYNA = new Set(['0070C0', '4472C4', '4471C4', '2B579A', '156082', '0F2D46', '0563C1', '227ACB']);

  function virsSdt(n, riba){ for (let u = n.parentNode; u && u !== riba; u = u.parentNode) if (u.localName === 'sdt') return u; return null; }
  function tevas(n, tag){ for (let u = n.parentNode; u; u = u.parentNode) if (u.localName === tag) return u; return null; }
  /* Pastraipos tekstas kaip žemėlapyje: <w:t> be įdėtų (eilutės) valdiklių turinio */
  const tMazgai = p => visi(p, 't').filter(t => !virsSdt(t, p));
  const pTekstas = p => tMazgai(p).map(t => t.textContent).join('');

  /* ------------------------------------------------------------------ DOM veiksmai */
  /* Runas [rPr, a, b, c] -> [rPr a][rPr b][rPr c] toje pačioje vietoje: atkarpą galima išskirti nekeičiant kitų runų */
  function skaidykRunus(p){
    for (const r of visi(p, 'r').filter(r => !virsSdt(r, p))){
      const turinys = vaikai(r).filter(c => c.localName !== 'rPr');
      if (turinys.length < 2) continue;
      const rPr = vaikas(r, 'rPr');
      let po = r;
      for (const c of turinys.slice(1)){
        const nr = naujas(r.ownerDocument, 'r');
        if (rPr) nr.appendChild(rPr.cloneNode(true));
        nr.appendChild(c);
        po.parentNode.insertBefore(nr, po.nextSibling);
        po = nr;
      }
    }
  }
  /* Runo teksto atkarpa [x, y) - į atskirą runą (likusi dalis - jo kopijose prieš ir po) */
  function isskirk(t, x, y){
    const r = t.parentNode, s = t.textContent;
    const kopija = tekstas => { const nr = r.cloneNode(true); const nt = visi(nr, 't')[0]; nt.textContent = tekstas; nt.setAttribute('xml:space', 'preserve'); return nr; };
    if (x > 0) r.parentNode.insertBefore(kopija(s.slice(0, x)), r);
    if (y < s.length) r.parentNode.insertBefore(kopija(s.slice(y)), r.nextSibling);
    t.textContent = s.slice(x, y); t.setAttribute('xml:space', 'preserve');
    return r;
  }
  /* Įrašomos reikšmės formatavimas: šablono nurodymo spalva, žymėjimas, kursyvas, pabraukimas ir vietos rezervo stilius nuimami */
  function svarus(rPr){
    if (!rPr) return;
    for (const c of vaikai(rPr)) if (['color', 'highlight', 'i', 'iCs', 'u', 'shd', 'rStyle', 'vanish'].includes(c.localName)) rPr.removeChild(c);
  }
  /* Pastraipos teksto atkarpa [a, b) -> `nauja` (tuščia - pašalinama) */
  function keisk(p, a, b, nauja){
    skaidykRunus(p);
    const M = [];
    let pos = 0;
    for (const t of tMazgai(p)){ const s = t.textContent; if (t.parentNode.localName === 'r') M.push({ t, a: pos, b: pos + s.length }); pos += s.length; }
    if (a < 0 || b > pos || a >= b) return false;
    const runai = [];
    for (const m of M) if (m.b > a && m.a < b && m.b > m.a) runai.push(isskirk(m.t, Math.max(a, m.a) - m.a, Math.min(b, m.b) - m.a));
    if (!runai.length) return false;
    runai.slice(1).forEach(r => r.parentNode.removeChild(r));
    if (!nauja){ runai[0].parentNode.removeChild(runai[0]); return true; }
    const t = visi(runai[0], 't')[0];
    t.textContent = nauja; t.setAttribute('xml:space', 'preserve');
    svarus(vaikas(runai[0], 'rPr'));
    return true;
  }
  /* Pastraipa šalinama; paskutinė langelio pastraipa tik išvaloma (Word langelyje reikia bent vienos) */
  function salink(p){
    const tc = tevas(p, 'tc');
    if (tc && visi(tc, 'p').filter(x => tevas(x, 'tc') === tc).length <= 1){
      vaikai(p).forEach(c => { if (c.localName !== 'pPr') p.removeChild(c); });
      return 'isvalyta';
    }
    const sdt = virsSdt(p, null);
    p.parentNode.removeChild(p);
    if (sdt && sdt.parentNode && !visi(sdt, 'p').length) sdt.parentNode.removeChild(sdt);
    return 'pasalinta';
  }
  /* Valdiklis -> pasirinkto elemento tekstas (kaip Word „Remove content control“) */
  function irasykValdikli(sdt, tekstas){
    const d = sdt.ownerDocument, pr = vaikas(sdt, 'sdtPr'), turinys = vaikas(sdt, 'sdtContent');
    const rPr = pr && vaikas(pr, 'rPr');
    const r = naujas(d, 'r');
    if (rPr){ const k = naujas(d, 'rPr'); vaikai(rPr).forEach(c => k.appendChild(c.cloneNode(true))); svarus(k); r.appendChild(k); }
    const t = naujas(d, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = tekstas; r.appendChild(t);
    const ps = visi(turinys, 'p');
    if (!ps.length){ if (tekstas) sdt.parentNode.replaceChild(r, sdt); else sdt.parentNode.removeChild(sdt); return; }
    ps.forEach((p, k) => { vaikai(p).filter(c => c.localName !== 'pPr').forEach(c => p.removeChild(c)); if (!k) p.appendChild(r); });
    while (turinys.firstChild) sdt.parentNode.insertBefore(turinys.firstChild, sdt);
    sdt.parentNode.removeChild(sdt);
  }
  function irasykLauka(p, tekstas){
    const d = p.ownerDocument;
    vaikai(p).forEach(c => { if (c.localName !== 'pPr') p.removeChild(c); });
    const r = naujas(d, 'r'), pPr = vaikas(p, 'pPr'), prr = pPr && vaikas(pPr, 'rPr');
    if (prr){ const k = naujas(d, 'rPr'); vaikai(prr).forEach(c => { if (!['b', 'bCs', 'ins', 'del'].includes(c.localName)) k.appendChild(c.cloneNode(true)); }); svarus(k); r.appendChild(k); }
    const t = naujas(d, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = tekstas; r.appendChild(t);
    p.appendChild(r);
  }
  const nuimkZymejima = p => visi(p, 'highlight').forEach(h => h.parentNode.removeChild(h));
  const juodink = p => visi(p, 'color').forEach(c => { if (MELYNA.has(String(c.getAttributeNS(W, 'val') || c.getAttribute('w:val') || '').toUpperCase())) c.parentNode.removeChild(c); });

  /* ------------------------------------------------------------------ vietos */
  const stulp = x => (x && x.stulpelis === 'EN') ? 'EN' : 'LT';
  function poruok(sarasas, f){
    const sk = {}, eile = x => { const k = stulp(x) + '|' + f(x); sk[k] = (sk[k] || 0) + 1; return sk[k] - 1; };
    const su = sarasas.map(x => ({ x, n: eile(x) }));
    return su.filter(e => stulp(e.x) === 'LT').map(e => ({ lt: e.x, n: e.n, en: (su.find(q => stulp(q.x) === 'EN' && f(q.x) === f(e.x) && q.n === e.n) || {}).x || null }));
  }
  function vietos(Z){
    const out = [];
    for (const v of Z.valdikliai.filter(v => stulp(v) === 'LT'))
      out.push({ raktas: 'v:' + v.nr, rusis: 'valdiklis', vieta: v.vieta, lt: v, en: v.pora != null ? Z.valdikliai.find(e => e.nr === v.pora) || null : null,
                 aprasas: (v.atsakymas && v.atsakymas.taisykle) || '', saltinis: (v.atsakymas && v.atsakymas.saltinis) || '', elementai: v.elementai.map(e => e.tekstas) });
    poruok(Z.alternatyvos, x => x.vieta).forEach(({ lt, en, n }) => out.push({ raktas: 'a:' + lt.vieta + (n ? '#' + n : ''), rusis: 'alternatyva', vieta: lt.vieta, lt, en,
      variantai: lt.variantai.map(v => v.map(i => Z.pastraipos[i]).filter(Boolean).join(' ')) }));
    poruok(Z.nurodymai, x => x.vieta).forEach(({ lt, en, n }) => out.push({ raktas: 'n:' + lt.vieta + '#' + n, rusis: 'nurodymas', vieta: lt.vieta, lt, en, aprasas: lt.tekstas }));
    poruok(Z.pildomos, x => x.vieta).forEach(({ lt, en, n }) => out.push({ raktas: 'p:' + lt.vieta + '#' + n, rusis: 'pildoma', vieta: lt.vieta, lt, en, aprasas: Z.pastraipos[lt.i] }));
    poruok(Z.laukai, x => x.vieta).forEach(({ lt, en }) => out.push({ raktas: 'l:' + lt.etikete, rusis: 'laukas', vieta: lt.vieta, lt, en, aprasas: lt.etikete, pildo: lt.pildo }));
    poruok(Z.taikymo_salygos, x => x.vieta).forEach(({ lt, en }) => out.push({ raktas: 't:' + lt.vieta, rusis: 'taikymo', vieta: lt.vieta, lt, en, aprasas: lt.tekstas }));
    const altI = new Set(Z.alternatyvos.flatMap(a => a.skyrikliai));
    poruok((Z.salygos || []).filter(x => !altI.has(x.i)), x => x.vieta).forEach(({ lt, en }) => out.push({ raktas: 's:' + lt.vieta, rusis: 'salyga', vieta: lt.vieta, lt, en,
      aprasas: Z.pastraipos.slice(lt.i + 1).find(Boolean) || '' }));
    return out;
  }
  const viesos = Z => vietos(Z).map(x => ({ raktas: x.raktas, rusis: x.rusis, vieta: x.vieta, aprasas: x.aprasas || '', saltinis: x.saltinis,
                                            elementai: x.elementai, variantai: x.variantai, pildo: x.pildo }));
  function vietaPagalI(Z, i){
    for (const k of ['nurodymai', 'pildomos', 'laukai', 'trynimo_nurodymai', 'taikymo_salygos', 'valdikliai'])
      for (const x of Z[k] || []) if (x.i === i && x.vieta) return x.vieta;
    for (let k = i; k >= 0; k--){ const m = /^(\d+(?:\.\d+)*)\./.exec(Z.pastraipos[k] || ''); if (m) return m[1]; }
    return '#' + i;
  }

  /* ------------------------------------------------------------------ generavimas */
  async function generuok(buf, Z, sprendimai, info){
    info = info || {};
    const S = sprendimai || {};
    const A = { pakeista: [], pasalinta: [], palikta: [], klaidos: [] };
    const doc = await GPDocx.open(buf.slice ? buf.slice(0) : buf);
    const d = doc.parts['word/document.xml'];
    const P = visi(d, 'p'), SDT = visi(d, 'sdt');
    // 1. Šablonas = žemėlapis (kitas failas ar kita redakcija - negeneruojama)
    if (P.length !== Z.pastraipos.length) A.klaidos.push(`šablone ${P.length} pastraipų, žemėlapyje ${Z.pastraipos.length} - šablonas nesutampa su žemėlapiu`);
    else P.forEach((p, i) => { if (tarpai(pTekstas(p)) !== Z.pastraipos[i]) A.klaidos.push(`${i} pastraipa nesutampa su žemėlapiu: „${tarpai(pTekstas(p)).slice(0, 80)}“`); });
    if (SDT.length !== Z.valdikliai.length) A.klaidos.push(`šablone ${SDT.length} valdiklių, žemėlapyje ${Z.valdikliai.length}`);
    if (A.klaidos.length) return { blob: null, ataskaita: A };

    const V = vietos(Z), sp = x => S[x.raktas];
    // LT/EN: angliškas atitikmuo - toje pačioje lentelės eilutėje, ta pačia eile (punkto numeris anglų langelyje gali skirtis)
    if (Z.kalba === 'LTEN'){
      const pirma = a => a.i != null ? a.i : Math.min(...a.variantai.flat(), ...a.skyrikliai);
      const altI = new Set(Z.alternatyvos.flatMap(a => a.skyrikliai));
      const KAT = { alternatyva: Z.alternatyvos, nurodymas: Z.nurodymai, pildoma: Z.pildomos, taikymo: Z.taikymo_salygos, laukas: Z.laukai,
                    salyga: (Z.salygos || []).filter(x => !altI.has(x.i)) };
      const susieta = new Set();
      for (const x of V){
        const kat = KAT[x.rusis];
        if (!kat) continue;
        const tr = tevas(P[pirma(x.lt)], 'tr');
        const eil = st => kat.filter(a => stulp(a) === st && tr && tevas(P[pirma(a)], 'tr') === tr);
        x.en = eil('EN')[eil('LT').indexOf(x.lt)] || null;
        if (x.en) susieta.add(x.en);
      }
      for (const [rusis, kat] of Object.entries(KAT)) for (const a of kat)
        if (stulp(a) === 'EN' && !susieta.has(a) && rusis !== 'laukas')
          A.klaidos.push(`anglų stulpelio ${rusis} (${a.vieta} p.) neturi lietuviško atitikmens toje pačioje eilutėje - jam nėra sprendimo`);
      if (A.klaidos.length) return { blob: null, ataskaita: A };
    }
    const yraSpr = s => s != null && !(typeof s === 'object' && s.palikti);
    const R = P.map(pTekstas);                // laukiamas kiekvienos pastraipos tekstas be valdiklių
    const istrinti = new Set(), neisspresta = new Set(), ideta = {};
    const trinti = (i, kodel) => { if (!istrinti.has(i)){ istrinti.add(i); A.pasalinta.push({ vieta: vietaPagalI(Z, i), tekstas: Z.pastraipos[i], kodel }); } };
    const palik = (x, s, numatyta) => {
      A.palikta.push({ raktas: x.raktas, rusis: x.rusis, vieta: x.vieta, aprasas: x.aprasas || '', kodel: (s && s.palikti) || numatyta || 'neatsakyta' });
      [x.lt, x.en].filter(Boolean).forEach(y => { if (y.i != null) neisspresta.add(y.i); });
    };

    // 2. Valdiklių sprendimai (be DOM): kurie paliekami, kurie - „netaikoma“
    const vsp = {};
    for (const x of V.filter(x => x.rusis === 'valdiklis')){
      const s = sp(x);
      if (yraSpr(s) && s.salinti === true){   // nereikalingas (pvz. vienetas, kai terminas - pagal techninę specifikaciją)
        for (const v of [x.lt, x.en].filter(Boolean)) vsp[v.nr] = { tekstas: '', netaikoma: false };
        A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'pasirinkimas', tapo: '' });
        continue;
      }
      if (yraSpr(s) && !x.lt.elementai.length && s.tekstas){   // teksto valdiklis
        for (const v of [x.lt, x.en].filter(Boolean)) vsp[v.nr] = { tekstas: v === x.en && s.tekstasEN != null ? s.tekstasEN : s.tekstas, netaikoma: false };
        A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'tekstas', tapo: s.tekstas });
        continue;
      }
      if (!yraSpr(s) || s.elementas == null || !x.lt.elementai[s.elementas]){ palik(x, s); continue; }
      for (const v of [x.lt, x.en].filter(Boolean)){
        let el = s.elementas;
        if (v === x.en && s.elementasEN != null) el = s.elementasEN;
        else if (v === x.en && v.elementai.length !== x.lt.elementai.length){
          const lt = x.lt.elementai[s.elementas].tekstas.trim(), pora = ATITIKMENYS.find(([l]) => l.test(lt));
          el = pora ? v.elementai.findIndex(e => pora[1].test(e.tekstas.trim())) : -1;
        }
        if (!v.elementai[el]){ A.klaidos.push(`${x.vieta} p.: angliškame valdiklyje nėra atitikmens „${x.lt.elementai[s.elementas].tekstas.trim()}“`); continue; }
        let k = 0;
        const reiksmes = (v === x.en && s.reiksmesEN) || s.reiksmes || [];
        const tekstas = v.elementai[el].tekstas.replace(VIETA_REZ, m => { const r = reiksmes[k++]; return r != null && String(r).trim() ? String(r) : m; });
        vsp[v.nr] = { tekstas, netaikoma: NETAIKOMA.test(v.elementai[el].tekstas) };
        if (v === x.lt){
          A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'pasirinkimas', tapo: tekstas });
          if (new RegExp(VIETA_REZ.source).test(tekstas)) A.palikta.push({ raktas: x.raktas, rusis: 'pildoma', vieta: x.vieta, aprasas: tekstas, kodel: 'sudarant' });
        }
      }
    }

    // 3. Alternatyvos: lieka pasirinktas variantas (su jo tuščiomis pastraipomis), kiti variantai ir skyrikliai šalinami
    const altSritis = new Set();
    for (const x of V.filter(x => x.rusis === 'alternatyva')){
      const s = sp(x), ok = yraSpr(s) && s.variantas != null && x.lt.variantai[s.variantas];
      if (!ok) palik(x, s);
      for (const a of [x.lt, x.en].filter(Boolean)){
        const visos = a.variantai.flat().concat(a.skyrikliai), nuo = Math.min(...visos), iki = Math.max(...visos);
        for (let i = nuo; i <= iki; i++){ altSritis.add(i); if (!ok) neisspresta.add(i); }
        if (!ok) continue;
        const v = a.variantai[s.variantas];
        if (!v || !v.length){ A.klaidos.push(`${x.vieta} p.: alternatyvos variantas ${s.variantas + 1} tuščias`); continue; }
        const vn = Math.min(...v), vi = Math.max(...v);
        for (let i = nuo; i <= iki; i++) if (i < vn || i > vi) trinti(i, 'nepasirinktas alternatyvos variantas');
        for (let i = vn; i <= vi; i++) if (TRYN.test(Z.pastraipos[i])) trinti(i, 'šablono nurodymas rengėjui');
      }
      if (ok) A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'alternatyva', tapo: x.variantai[s.variantas] });
    }

    // 4. Trynimo nurodymai už alternatyvų - pagal to paties langelio valdiklį
    for (const tn of Z.trynimo_nurodymai){
      if (altSritis.has(tn.i)) continue;
      const tc = tevas(P[tn.i], 'tc');
      const vald = tc ? Z.valdikliai.filter(v => tevas(SDT[v.nr], 'tc') === tc) : [];
      const sp2 = vald.map(v => vsp[v.nr]).filter(Boolean);
      if (!vald.length || sp2.length < vald.length){ neisspresta.add(tn.i); continue; }
      trinti(tn.i, 'šablono nurodymas rengėjui');
      if (sp2.some(s => s.netaikoma)){
        const po = Math.max(tn.i, ...vald.map(v => v.i));
        for (let i = po + 1; i < P.length && tevas(P[i], 'tc') === tc; i++) trinti(i, 'netaikoma - tekstas šalinamas šablono nurodymu');
      }
    }

    // 4a. Sąlyginiai blokai „Jei punktas taikomas:“: taikoma - šalinamas tik užrašas; netaikoma - ir tekstas iki langelio pabaigos,
    //     o užrašo vietoje - sprendimo tekstas (pvz. „Punktas netaikomas.“)
    const salygosTekstas = {};
    for (const x of V.filter(x => x.rusis === 'salyga')){
      const s = sp(x);
      if (!yraSpr(s) || typeof s.taikoma !== 'boolean'){ palik(x, s); continue; }
      for (const y of [x.lt, x.en].filter(Boolean)){
        const tc = tevas(P[y.i], 'tc');
        if (s.taikoma){ trinti(y.i, 'šablono užrašas „Jei punktas taikomas:“'); continue; }
        for (let i = y.i + 1; i < P.length && tc && tevas(P[i], 'tc') === tc; i++) trinti(i, 'punktas netaikomas (jūsų atsakymas)');
        const t = y === x.en && s.tekstasEN != null ? s.tekstasEN : s.tekstas;
        if (t) salygosTekstas[y.i] = t; else trinti(y.i, 'šablono užrašas „Jei punktas taikomas:“');
      }
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'sąlyga', tapo: s.taikoma ? 'taikoma' : (s.tekstas || 'netaikoma') });
    }

    // 5. Teksto vietos pastraipose (prieš valdiklius - kol pastraipos tekstas = žemėlapio): kiekvienoje pastraipoje nuo galo
    const keitimai = {};   // i -> [{ frag, nauja, x, lt }]
    const naujaPagal = (x, y, s) => s === 'salinti' ? '' : ((y === x.en && s.tekstasEN != null) ? s.tekstasEN : s.tekstas);
    for (const x of V.filter(x => ['nurodymas', 'pildoma', 'taikymo'].includes(x.rusis))){
      const s = sp(x);
      if ([x.lt, x.en].filter(Boolean).every(y => istrinti.has(y.i))) continue;   // vieta ištrintoje pastraipoje (nepasirinktas variantas)
      if (!yraSpr(s) || (s !== 'salinti' && (typeof s !== 'object' || s.tekstas == null))){ palik(x, s, x.rusis === 'pildoma' ? 'neatsakyta' : null); continue; }
      for (const y of [x.lt, x.en].filter(Boolean)) if (!istrinti.has(y.i)) (keitimai[y.i] = keitimai[y.i] || []).push({ frag: y.tekstas, nauja: naujaPagal(x, y, s), x, lt: y === x.lt });
    }
    for (const o of Z.organizacija.filter(o => o.laukas === 'pavadinimas')) if (R[o.i].indexOf(IMONE) >= 0)
      (keitimai[o.i] = keitimai[o.i] || []).push({ frag: IMONE, nauja: info.imone || 'LITGRID AB', x: { raktas: '', vieta: o.vieta, rusis: 'organizacija' }, lt: stulp(o) === 'LT' });
    for (const [is, ks] of Object.entries(keitimai)){
      const i = +is, uzimta = [];
      for (const k of ks){
        let a = -1, nuo = 0;
        do { a = R[i].indexOf(k.frag, nuo); nuo = a + 1; } while (a >= 0 && uzimta.some(([u, v]) => a < v && a + k.frag.length > u));
        if (a < 0){ A.klaidos.push(`${k.x.vieta} p.: nerasta vieta „${k.frag.slice(0, 60)}“`); k.a = -1; continue; }
        k.a = a; k.b = a + k.frag.length; uzimta.push([k.a, k.b]);
      }
      ks.filter(k => k.a >= 0).sort((p, q) => q.a - p.a).forEach(k => {
        let a = k.a, b = k.b;
        if (!k.nauja){   // pašalinant - ir gretimas tarpas
          if (a > 0 && R[i][a - 1] === ' ' && (b >= R[i].length || /[\s.,;:)]/.test(R[i][b]))) a--;
          else if (R[i][b] === ' ' && (a === 0 || /\s/.test(R[i][a - 1]))) b++;
        }
        if (!keisk(P[i], a, b, k.nauja)){ A.klaidos.push(`${k.x.vieta} p.: nepavyko pakeisti teksto`); return; }
        R[i] = R[i].slice(0, a) + k.nauja + R[i].slice(b);
        if (k.lt) A.pakeista.push({ raktas: k.x.raktas, vieta: k.x.vieta, ka: k.x.rusis, buvo: k.frag, tapo: k.nauja });
      });
      if (!tarpai(R[i]) && !ks.some(k => k.x.rusis === 'pildoma') && !visi(P[i], 'sdt').length) trinti(i, 'tuščia po nurodymo pašalinimo');
    }
    for (const [is, t] of Object.entries(salygosTekstas)){ irasykLauka(P[+is], t); R[+is] = t; }
    for (const x of V.filter(x => x.rusis === 'laukas')){
      const s = sp(x);
      if (!yraSpr(s) || !s.tekstas){ palik(x, s, x.pildo === 'sudarant' ? 'sudarant' : null); continue; }
      for (const y of [x.lt, x.en].filter(Boolean)){
        const nauja = (y === x.en && s.tekstasEN != null ? s.tekstasEN : s.tekstas);
        irasykLauka(P[y.i], nauja); R[y.i] = nauja;
      }
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'laukas', tapo: s.tekstas });
    }

    // 6. Valdikliai (DOM): eilutės valdiklio tekstas tampa pastraipos dalimi; blokinio - jo pastraipos tekstu
    for (const [nr, v] of Object.entries(vsp)){
      const sdt = SDT[+nr], vidinis = visi(vaikas(sdt, 'sdtContent'), 'p');
      if (vidinis.length){ vidinis.forEach((p, k) => { const i = P.indexOf(p); if (i >= 0) R[i] = k ? '' : v.tekstas; }); }
      else { const i = P.indexOf(sdt.parentNode); if (i >= 0 && v.tekstas) (ideta[i] = ideta[i] || []).push(v.tekstas); }
      irasykValdikli(sdt, v.tekstas);
    }

    // 7. Šalinimas - nuo galo (langelio paskutinė pastraipa tik išvaloma)
    [...istrinti].sort((a, b) => b - a).forEach(i => { if (salink(P[i]) === 'isvalyta'){ R[i] = ''; istrinti.delete(i); } });

    // 8. Spalvos: išspręstų vietų geltonas žymėjimas, VPT mėlynos nuostatos ir keičiamos reikšmės - juodai (DI juodraščiai lieka)
    const di = new Set((Z.di_juodrasciai || []).map(x => x.i));
    Z.paryskinimai.forEach(x => { if (!istrinti.has(x.i) && !neisspresta.has(x.i) && !di.has(x.i)) nuimkZymejima(P[x.i]); });
    (Z.pritaikomos_nuostatos || []).concat(Z.keiciamos_reiksmes || []).forEach(x => { if (!istrinti.has(x.i)) juodink(P[x.i]); });
    // nematomi likučiai: pastraipos ženklo spalva ir žymėjimas, tarpai raudonai (matomas raudonas tekstas - tik paliktose vietose)
    P.forEach((p, i) => {
      if (istrinti.has(i) || !p.parentNode || neisspresta.has(i) || di.has(i)) return;
      const pPr = vaikas(p, 'pPr'), prr = pPr && vaikas(pPr, 'rPr');
      if (prr) vaikai(prr).forEach(c => { if (c.localName === 'color' || c.localName === 'highlight') prr.removeChild(c); });
      visi(p, 'r').filter(r => !virsSdt(r, p) && !tarpai(visi(r, 't').map(t => t.textContent).join(''))).forEach(r => { const k = vaikas(r, 'rPr'); if (k) vaikai(k).forEach(c => { if (c.localName === 'color' || c.localName === 'highlight') k.removeChild(c); }); });
    });

    // 9. Patikra: nepaliestos pastraipos - kaip šablone; paliestos - laukiamas tekstas; liko tik palikti valdikliai ir nurodymai
    P.forEach((p, i) => {
      if (istrinti.has(i)) return;
      if (!p.parentNode){ A.klaidos.push(`${vietaPagalI(Z, i)} p.: pastraipa dingo be sprendimo`); return; }
      let t = pTekstas(p);
      for (const s of ideta[i] || []){ const k = t.indexOf(s); if (k < 0){ A.klaidos.push(`${vietaPagalI(Z, i)} p.: neįrašytas pasirinkimas`); return; } t = t.slice(0, k) + t.slice(k + s.length); }
      if (t !== R[i]) A.klaidos.push(`${vietaPagalI(Z, i)} p.: tekstas pakeistas ne žemėlapio vietoje („${tarpai(t).slice(0, 70)}“)`);
    });
    const liko = visi(d, 'sdt').length, laukta = Z.valdikliai.length - Object.keys(vsp).length;
    if (liko !== laukta) A.klaidos.push(`dokumente liko ${liko} valdiklių, paliktų - ${laukta}`);
    visi(d, 'p').forEach(p => {
      const t = tarpai(pTekstas(p)), i = P.indexOf(p);
      if ((TRYN.test(t) || SALYGA.test(t)) && !neisspresta.has(i)) A.klaidos.push(`liko šablono nurodymas „${t}“ (${vietaPagalI(Z, i)} p.)`);
      if (PASIRINKITE.test(t) && !virsSdt(p, null)) A.klaidos.push(`liko „${t}“ ne valdiklyje (${vietaPagalI(Z, i)} p.)`);
    });

    // 10. Lentelės (Pages nedalija eilučių per puslapius ir kerpa - GPLent), generavimo pasas
    // GPLent skaido per aukštas eilutes: pastraipų eilė eilutėse keičiasi, bet kiekviename stulpelyje tekstas ir tvarka - ne
    const tekstai = () => {
      const g = {};
      visi(d, 'p').forEach(p => {
        const t = tarpai(GPDocx.paraText(p));
        if (!t) return;
        let raktas = 'kunas', tc = tevas(p, 'tc');
        if (tc){
          let tbl = tevas(tc, 'tbl'); while (tbl && tevas(tbl, 'tbl')) tbl = tevas(tbl, 'tbl');
          const tr = tevas(tc, 'tr'); let st = 0;
          for (const c of vaikai(tr)){
            const cell = c.localName === 'sdt' ? visi(c, 'tc')[0] : c.localName === 'tc' ? c : null;
            if (!cell) continue;
            if (cell === tc || cell.contains(tc)) break;
            const gs = visi(vaikas(cell, 'tcPr') || cell, 'gridSpan')[0];
            st += gs ? +(gs.getAttributeNS(W, 'val') || gs.getAttribute('w:val') || 1) : 1;
          }
          raktas = visi(d, 'tbl').indexOf(tbl) + ':' + st;
        }
        (g[raktas] = g[raktas] || []).push(t);
      });
      return JSON.stringify(g);
    };
    const pries = tekstai();
    await GPDocx.part(doc, 'word/styles.xml'); await GPDocx.part(doc, 'word/numbering.xml');
    if (typeof GPLent !== 'undefined' && info.lenteles !== false) A.lenteles = GPLent.sutvarkyti(doc);
    if (tekstai() !== pries) A.klaidos.push('lentelių tvarkymas pakeitė tekstą');
    if (info.pasas !== false) await GPDocx.pasas(doc, { sablonas: info.sablonas || '', forma: info.forma || '', data: info.data || '', modulis: 'PP-salygos' });
    const blob = A.klaidos.length ? null : await GPDocx.save(doc, info.tipas || 'blob');
    return { blob, ataskaita: A };
  }

  return { versija: 'S4-2026-10-08', vietos: viesos, generuok, _keisk: keisk, _pTekstas: pTekstas };
})();
if (typeof window !== 'undefined') window.GP_SUTARCIU_GEN = GP_SUTARCIU_GEN;
