/*
 * PP-salygos: sutarties projekto generavimas iš paruošto šablono (GP_SUTARCIU_GEN, sutarčių planas S4, 2026-10-08;
 * docs/salygos/sutartys-planas-2026-10.md 4.2-4.5). Šablonas - templates/sutartys/<KODAS>.docx, vietos - jo žemėlapis
 * zemelapiai/sutartys/<KODAS>.json (sutarciu-sablonai.py; pastraipų numeracija - visos <w:p> dokumento tvarka).
 *
 *   GP_SUTARCIU_GEN.vietos(zemelapis) -> [{ raktas, rusis, vieta, aprasas, elementai?, variantai?, pildo? }]
 *     lietuviškos vietos, kurioms reikia sprendimo (LT/EN dokumente angliški atitikmenys seka lietuviškus pagal vietą ir eilę).
 *   GP_SUTARCIU_GEN.generuok(buf, zemelapis, sprendimai, info) -> Promise<{ blob, ataskaita, priedas }>
 *     sprendimai pagal raktą:
 *       "v:<nr>"         valdiklis: { elementas: k, reiksmes: [...], reiksmesEN } - reikšmės vietoj „[...]“, „[_]“, „{...}“ elemento tekste;
 *                        teksto valdiklis (be elementų): { tekstas, tekstasEN }; { salinti: true } - valdiklis pašalinamas be teksto
 *       "a:<vieta>[#n]"  alternatyva: { variantas: k }
 *       "n:<vieta>#n"    nurodymas rengėjui: "salinti" arba { tekstas, tekstasEN } (įrašoma vietoj nurodymo); žemėlapio `kartu`
 *                        (statybos rangos SS: „// Jei ...“, „arba“, „// Jei ...“) - nurodymo tęsinys, šalinamas kartu
 *       "p:<vieta>#n"    pildoma vieta pastraipoje: { tekstas, tekstasEN }; { tekstas, lieka } (2026-10-13) - įrašoma `tekstas`, o po jo lieka
 *                        pildoma vieta `lieka` šablono formatu (eksploatavimo darbų SS 5 eil.: pirkimo pavadinimas įrašomas, „[būdas,
 *                        paskelbimo data ir numeris]“ lieka sudarant sutartį) - vieta įrašoma į „palikta“ (kodel: sudarant)
 *       "l:<etiketė>"    (žr. žemiau) - jei įrašytame lauko tekste yra vieta „[...]“, laukas įrašomas ir į „palikta“ (kodel: sudarant)
 *       "l:<etiketė>"    tuščias laukas: { tekstas, tekstasEN }
 *       "t:<vieta>"      skyriaus taikymo sąlyga „(taikoma, jeigu ...)“: "salinti"
 *       "s:<vieta>"      sąlyginis blokas „Jei punktas taikomas:“ be „Netaikoma“ varianto (paslaugų 13.1-13.2): { taikoma: true } - lieka
 *                        tekstas, { taikoma: false, tekstas, tekstasEN } - tekstas iki langelio pabaigos šalinamas, vietoje jo - `tekstas`
 *       "b:<id>"         neprivalomas punktas su „//“ nurodymu (rangos SS, 2026-10-10): { taikoma: true | false, dalys: [bool], papildymas:
 *                        { dalis: tekstas } } - taikoma: šalinamas nurodymas, lieka punkto tekstas (kelių dalių - tik `dalys` true), `papildymas` -
 *                        naujos pastraipos po dalies (eilutė - pastraipa); netaikoma: šalinamas nurodymas, punktas ir viena tuščia pastraipa
 *                        po jo; { taikoma: false, tekstas } - punktas su antrašte lieka, nurodymo vietoje - `tekstas` („Punktas netaikomas.“ -
 *                        rangos SS 4 p., kad 1-19 punktų numeriai nesikeistų), punkto tekstas šalinamas; { taikoma: false, vietoje: { k: tekstas },
 *                        lieka: [k] } (darbų pirkimo-pardavimo SS, 2026-10-12) - nurodymas šalinamas, k-toji dalies pastraipa (skaičiuojant visas
 *                        dalių pastraipas iš eilės) pakeičiama tekstu („Punktas netaikomas.“ - punkto numeris lieka) arba paliekama (skyriaus
 *                        antraštė), kitos šalinamos
 *       "o:<id>"         šablono sakinys be „//“, taikomas tik tam tikru atveju (rangos SS 3, 6, 8 p.; naudotojo sprendimas 2026-10-10):
 *                        "salinti" - pašalinamas; { tekstas } - jo vietoje `tekstas`; be sprendimo lieka (tai šablono tekstas)
 *       "nb:<id>"        nurodymų blokas (rangos SS etapų priedo „Pildymo sąlygos“): "salinti" arba { palikti }
 *       "k:<sritis>"     priedas paskutiniame dokumento skyriuje (rangos SS etapų priedas): "salinti" - šalinamas skyrius ir jo priedų sąrašo
 *                        eilutė (Word numeracija perskaičiuoja kitus priedus); be sprendimo priedas lieka (tai šablono dalis, ne vieta)
 *       "vd:<id>"        pasirinkimas pastraipos viduje su žyma „[pasirinkti vieną]“ (projektavimo paslaugų SS, 2026-10-11): { variantas: k } -
 *                        pastraipoje lieka tekstas prieš, pasirinktas variantas ir tekstas po (kaip šablone), žyma ir kiti variantai šalinami
 *       "kp:kiti"        priedų sąrašo eilutė kitiems priedams (žemėlapio `kiti_priedai`; 2026-10-13): { eilutes: [tekstas, ...] } - pirmoji
 *                        įrašoma vietoje eilutės, kitos - naujomis to paties sąrašo eilutėmis po jos (numeruoja Word); { tekstas } - eilutės
 *                        vietoje (pvz. „Kiti priedai - netaikoma.“); be sprendimo eilutė lieka ir įrašoma į „palikta“
 *       "f:<id>"         šablono teksto atkarpa pastraipos viduje, taikoma ne visada (žemėlapio `fragmentai`; projektavimo paslaugų SS 2.1 p.
 *                        „, projekto vykdymo priežiūros paslaugos“): "salinti" arba { tekstas }; be sprendimo lieka (tai šablono tekstas)
 *       "lt:<sritis>"    lentelė priede (žemėlapio skyriaus `lentele`; 2026-10-13, rangos SS etapų lentelė): { eilutes: [{ etikete,
 *                        langeliai: { <stulpelis>: [tekstas, ...] } }], beStulpeliu: [<stulpelis>] } - langelių tekstai (kelios eilutės -
 *                        atskiros pastraipos), nereikalingos formos eilutės ir išvardyti stulpeliai šalinami, trūkstamos eilutės -
 *                        paskutinės formos eilutės klonai; be sprendimo lentelė lieka Word programai
 *       "pr:<nr>"        priedų sąrašo priedas (žemėlapio `priedai`; 2026-10-13, priedų sąrašas 2 žingsnyje): { netaikoma: true } - priedo eilutė
 *                        lieka su žodžiu „netaikoma“ („Rizikų valdymo planas - netaikoma;“, anglų stulpelyje „- not applicable“): kitų priedų
 *                        numeriai ir nuorodos į juos nesikeičia; { po: [tekstas, ...] } - papildomi priedai naujomis to paties sąrašo eilutėmis
 *                        po šios (paskutinės) eilutės, jos gale taškas keičiamas kabliataškiu; be sprendimo priedas lieka (tai šablono tekstas)
 *     Išskleidžiamo sąrašo valdiklyje { tekstas, tekstasEN, laisvas: true } - įrašoma formuluotė, kurios formos sąraše nėra (naudotojo
 *     sprendimas 2026-10-13: prekių ir paslaugų SS 11.1.2 p.); ataskaitoje `ka: 'laisvas tekstas'` - 3 žingsnis tai pasako.
 *     Nurodymo ar pildomos vietos sprendime `glaustai: true` - įrašoma be tarpo prieš vietą („Kiti priedai [...]“ -> „Kiti priedai: ...“).
 *     Žemėlapio `nesiulomi` (šablono variantas, kurio generatorius nesiūlo: projektavimo paslaugų SS 3.1 „arba“) šalinami visada ir
 *     įrašomi į ataskaitą. Žemėlapis su `zymejimas: "pildoma"` (geltonai pažymėtos pildomos vietos): žymėjimas nuimamas išspręstose
 *     vietose ir `zinomos` pastraipose, o vietose, paliktose pildyti sudarant sutartį, lieka.
 *     Valdiklio angliškas elementas - tas pats eilės numeris; kai anglų sąraše elementų mažiau („mėnesį / mėnesius / mėnesių“ -> „month. /
 *     months.“) - pagal ATITIKMENYS arba sprendimo `elementasEN`.
 *     Word numeracijos šablonuose (žemėlapis `numeracija: "word"`) pasirinkus alternatyvos variantą be punkto numerio, o pašalintoje dalyje
 *     numeris buvo (rangos SS užtikrinimo 2 ir 3 variantai), numeris perkeliamas į pasirinkto varianto pirmą pastraipą.
 *     Be sprendimo arba { palikti: "sudarant" | "neatsakyta" } - vieta lieka kaip šablone (valdiklis - pasirenkamas Word) ir įrašoma
 *     į ataskaitos „palikta“. Visada: „ĮMONĖS PAVADINIMAS“ -> info.imone (numatyta LITGRID AB); šablono nurodymas „Jei (punktas)
 *     netaikoma(s), visą žemiau esantį tekstą ištrinti:“ - pašalinamas, o kai to langelio valdiklyje pasirinkta „netaikoma“ - ir
 *     tekstas po juo iki langelio pabaigos; išspręstų vietų geltonas žymėjimas, VPT mėlynos pritaikomos nuostatos ir keičiamos
 *     reikšmės - juodu tekstu; DI vertimo juodraščiai (LT/EN anglų stulpelis) lieka pažymėti. Tada lentelės (GPLent - Pages) ir pasas.
 *     Pages (rangos SS, 2026-10-10): lentelė lentelės langelyje paverčiama pagrindinės lentelės eilutėmis (Pages ją rodytų tekstu;
 *     ataskaita.isvyniota), o gulsčias priedas stačiame dokumente (žemėlapio `skyriai`) grąžinamas atskiru failu `priedas` (Pages visam
 *     dokumentui taiko pirmojo skyriaus orientaciją; ataskaita.atskirta, pasas - `<šablonas>_GULSTI`; info.gulsti: false - viename faile).
 *   ataskaita: { pakeista, pasalinta, palikta, klaidos, lenteles, isvyniota, atskirta }. Klaida (šablonas nesutampa su žemėlapiu, pakeista ne žemėlapio
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
  const NETAIKOMA = /netaikom|not applicable|do(es)? not apply/i;   // „... papunkčiai netaikomi“ - EN „... do not apply“ (iki 2026-10-08 neatpažinta: EN papunkčiai likdavo)
  const VIETA_REZ = /\[\.\.\.\]|\[…\]|\[_\]|\[suma\]|\{\.*\}/g;   // „[suma]“ - darbų pirkimo-pardavimo SS 6.3 p. užtikrinimo variantas (2026-10-12)
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
  /* Įrašomos reikšmės formatavimas: šablono nurodymo spalva, žymėjimas, kursyvas, pabraukimas ir vietos rezervo stilius nuimami.
     Nuo 2026-10-10 (rangos SS Pages patikra): ženklų stilius nuimamas tik vietos rezervo („Placeholder Text“) - kitas (pvz. „NormalBold“:
     „[dienos/mėnesiai] nuo Sutarties sudarymo dienos.“) lieka, kitaip reikšmė būtų kitokio šrifto nei jos sakinys; o.kursyvas - kursyvas
     paliekamas (reikšmė kursyvu parašyto sakinio viduje). */
  function svarus(rPr, o){
    if (!rPr) return;
    for (const c of vaikai(rPr)){
      if (c.localName === 'rStyle'){ if (/placeholder/i.test(c.getAttributeNS(W, 'val') || c.getAttribute('w:val') || '')) rPr.removeChild(c); continue; }
      if (o && o.kursyvas && (c.localName === 'i' || c.localName === 'iCs')) continue;
      if (['color', 'highlight', 'i', 'iCs', 'u', 'shd', 'vanish'].includes(c.localName)) rPr.removeChild(c);
    }
  }
  const kursyvu = r => { const k = vaikas(vaikas(r, 'rPr') || r, 'i'); return !!k && !/^(0|false)$/.test(k.getAttributeNS(W, 'val') || k.getAttribute('w:val') || ''); };
  /* Pastraipos teksto atkarpa [a, b) -> `nauja` (tuščia - pašalinama). o.palikti - atkarpos formatas (žymėjimas, spalva) nekeičiamas: tekstas
     lieka pildoma vieta. Grąžina runą su nauju tekstu (pašalinus - true), nepavykus - false. */
  function keisk(p, a, b, nauja, o){
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
    // kursyvas lieka, kai kursyvu parašytas ir gretimas to paties sakinio tekstas (ne vien pati pildoma vieta ar nurodymas)
    const R0 = visi(p, 'r').filter(r => !virsSdt(r, p) && tarpai(visi(r, 't').map(x => x.textContent).join(''))), k0 = R0.indexOf(runai[0]);
    const greta = [R0[k0 - 1], R0[k0 + 1]].filter(Boolean);
    if (!(o && o.palikti)) svarus(vaikas(runai[0], 'rPr'), { kursyvas: greta.length > 0 && greta.every(kursyvu) });
    return runai[0];
  }
  /* Naujas runas su tekstu prieš `runas` - jo formatu be žymėjimo, spalvos ir kursyvo (įrašyta reikšmė prieš likusią pildomą vietą) */
  function iterpkPries(runas, tekstas){
    const nr = runas.cloneNode(true), t = visi(nr, 't')[0];
    t.textContent = tekstas; t.setAttribute('xml:space', 'preserve');
    svarus(vaikas(nr, 'rPr'));
    runas.parentNode.insertBefore(nr, runas);
    return nr;
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
  /* Visa pastraipa -> `tekstas` pirmojo jos teksto runo formatu (be pusjuodžio, kursyvo, žymėjimo). Darbų pirkimo-pardavimo SS (2026-10-12):
     punktų pastraipos ženklo savybėse - didžiosios raidės (w:caps), todėl irasykLauka „Punktas netaikomas.“ rašytų didžiosiomis. */
  function irasykTeksta(p, tekstas){
    const d = p.ownerDocument;
    const r0 = visi(p, 'r').find(r => !virsSdt(r, p) && tarpai(visi(r, 't').map(t => t.textContent).join(''))), rp0 = r0 && vaikas(r0, 'rPr');
    vaikai(p).forEach(c => { if (c.localName !== 'pPr') p.removeChild(c); });
    const r = naujas(d, 'r');
    if (rp0){ const k = rp0.cloneNode(true); vaikai(k).forEach(c => { if (['b', 'bCs'].includes(c.localName)) k.removeChild(c); }); svarus(k); r.appendChild(k); }
    const t = naujas(d, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = tekstas; r.appendChild(t);
    p.appendChild(r);
  }
  /* Pastraipos tekstas -> `tekstas` jos pirmojo teksto runo formatu (kiti teksto runai šalinami); be teksto - false */
  function perrasyk(p, tekstas){
    const tt = visi(p, 't');
    if (!tt.length) return false;
    tt.forEach((t, j) => { if (j) t.parentNode.removeChild(t); else { t.textContent = tekstas; t.setAttribute('xml:space', 'preserve'); } });
    visi(p, 'r').forEach(r => { if (!visi(r, 't').length && !vaikai(r).some(c => c.localName !== 'rPr')) r.parentNode.removeChild(r); });
    return true;
  }
  /* Elemento kopija įterpimui į tą patį dokumentą: be žymių ir be pastraipų identifikatorių (jie dokumente turi būti unikalūs) */
  function klonas(el){
    const n = el.cloneNode(true);
    visi(n, 'bookmarkStart').concat(visi(n, 'bookmarkEnd')).forEach(b => b.parentNode.removeChild(b));
    [n, ...visi(n, 'p'), ...visi(n, 'tr')].forEach(q => { q.removeAttribute('w14:paraId'); q.removeAttribute('w14:textId'); });
    return n;
  }
  const zenkloDidziosios = p => { const pPr = vaikas(p, 'pPr'), prr = pPr && vaikas(pPr, 'rPr'); return !!(prr && vaikas(prr, 'caps')); };
  /* Pastraipos savybių elementų tvarka (OOXML CT_PPr) - įterpiant numeraciją ar atitraukimą */
  const PPR_TVARKA = ['pStyle', 'keepNext', 'keepLines', 'pageBreakBefore', 'framePr', 'widowControl', 'numPr', 'suppressLineNumbers', 'pBdr', 'shd',
    'tabs', 'suppressAutoHyphens', 'kinsoku', 'wordWrap', 'overflowPunct', 'topLinePunct', 'autoSpaceDE', 'autoSpaceDN', 'bidi', 'adjustRightInd',
    'snapToGrid', 'spacing', 'ind', 'contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc', 'textDirection', 'textAlignment', 'textboxTightWrap',
    'outlineLvl', 'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange'];
  function idek(pPr, el){
    const sena = vaikas(pPr, el.localName); if (sena) pPr.removeChild(sena);
    const k = PPR_TVARKA.indexOf(el.localName), po = vaikai(pPr).find(c => PPR_TVARKA.indexOf(c.localName) > k);
    pPr.insertBefore(el, po || null);
  }
  function pPrOf(p){ let pPr = vaikas(p, 'pPr'); if (!pPr){ pPr = naujas(p.ownerDocument, 'pPr'); p.insertBefore(pPr, p.firstChild); } return pPr; }
  /* Word punkto numeris: pastraipos numPr su numId != 0 (rangos SS - punktų sąrašas) */
  const val = n => n ? (n.getAttributeNS(W, 'val') || n.getAttribute('w:val')) : null;
  function numeruota(p){ const pPr = vaikas(p, 'pPr'), np = pPr && vaikas(pPr, 'numPr'); return !!np && val(vaikas(np, 'numId')) != null && val(vaikas(np, 'numId')) !== '0'; }
  const nuimkZymejima = p => visi(p, 'highlight').forEach(h => h.parentNode.removeChild(h));
  const juodink = p => visi(p, 'color').forEach(c => { if (MELYNA.has(String(c.getAttributeNS(W, 'val') || c.getAttribute('w:val') || '').toUpperCase())) c.parentNode.removeChild(c); });

  /* ------------------------------------------------------------------ įdėtinės lentelės išvyniojimas
     Pages įdėtinių lentelių nepalaiko - paverčia tekstu su tabuliacijomis (rangos SS derinimo terminai). Išorinės lentelės stulpelis,
     kuriame yra įdėtinė lentelė, padalijamas į jos stulpelius (kitų eilučių langelis apima juos visus - gridSpan); įdėtinės lentelės
     eilutės tampa išorinės lentelės eilutėmis (kiti tos eilutės langeliai tušti, be rėmelio su gretimomis), turinys prieš ją lieka savo
     eilutėje, po jos - naujoje, be rėmelio tarp jų. Rėmeliai - įdėtinės lentelės (jos tblBorders arba jos stiliaus; nėra - be rėmelių).
     Tik paprastas atvejis (išorinis langelis nesujungtas, eilutės be gridBefore / gridAfter, įdėtinėje nėra kitų įdėtinių); kitaip lentelė
     lieka kaip buvo. Tekstas ir pastraipų tvarka dokumente nesikeičia (tikrina kvietėjas). Grąžina išvyniotų lentelių skaičių. */
  const BORD = ['top', 'left', 'bottom', 'right'];
  const TCPR_TVARKA = ['cnfStyle', 'tcW', 'gridSpan', 'hMerge', 'vMerge', 'tcBorders', 'shd', 'noWrap', 'tcMar', 'textDirection', 'tcFitText', 'vAlign', 'hideMark'];
  const BORD_TVARKA = ['top', 'start', 'left', 'bottom', 'end', 'right', 'insideH', 'insideV', 'tl2br', 'tr2bl'];
  function idekI(tevasEl, el, tvarka){
    const sena = vaikas(tevasEl, el.localName); if (sena) tevasEl.removeChild(sena);
    const k = tvarka.indexOf(el.localName), po = vaikai(tevasEl).find(c => tvarka.indexOf(c.localName) > k);
    tevasEl.insertBefore(el, po || null);
    return el;
  }
  const sk = (n, a) => +(n ? (n.getAttributeNS(W, a) || n.getAttribute('w:' + a)) : 0) || 0;
  function tcPrOf(tc){ let pr = vaikas(tc, 'tcPr'); if (!pr){ pr = naujas(tc.ownerDocument, 'tcPr'); tc.insertBefore(pr, tc.firstChild); } return pr; }
  function remelis(tc, krastas, e){   // e - null (be rėmelio) arba rėmelio elementas (jo savybės kopijuojamos)
    const d = tc.ownerDocument, pr = tcPrOf(tc);
    const b = vaikas(pr, 'tcBorders') || idekI(pr, naujas(d, 'tcBorders'), TCPR_TVARKA);
    const n = naujas(d, krastas);
    if (e && !/^(nil|none)$/.test(e.getAttributeNS(W, 'val') || e.getAttribute('w:val') || '')) Array.from(e.attributes).forEach(a => n.setAttribute(a.name, a.value));
    else n.setAttribute('w:val', 'nil');
    idekI(b, n, BORD_TVARKA);
  }
  function tusciasLangelis(pagal, be){
    const d = pagal.ownerDocument, t = naujas(d, 'tc'), pr = vaikas(pagal, 'tcPr');
    if (pr){ const k = pr.cloneNode(true); const vm = vaikas(k, 'vMerge'); if (vm) k.removeChild(vm); t.appendChild(k); }
    const p = naujas(d, 'p'), pp = naujas(d, 'pPr'), sp = naujas(d, 'spacing');
    sp.setAttribute('w:before', '0'); sp.setAttribute('w:after', '0'); pp.appendChild(sp);
    p.appendChild(pp); t.appendChild(p);
    be.forEach(k => remelis(t, k, null));
    return t;
  }
  /* Lentelės stiliaus rėmeliai (styles.xml; basedOn grandinė) */
  function stiliausRemeliai(stiliai, id){
    for (let n = 0; stiliai && id && n < 10; n++){
      const st = visi(stiliai, 'style').find(x => (x.getAttributeNS(W, 'styleId') || x.getAttribute('w:styleId')) === id);
      if (!st) return null;
      const tb = vaikas(vaikas(st, 'tblPr') || st, 'tblBorders');
      if (tb) return tb;
      const b = vaikas(st, 'basedOn'); id = b && (b.getAttributeNS(W, 'val') || b.getAttribute('w:val'));
    }
    return null;
  }
  /* Geltonas žymėjimas ir Pages (2026-10-11): pažymėto teksto foną paskutinėje pastraipos eilutėje Pages nudažo ir per tarpą po
     pastraipos (pirmoje - ir per tarpą prieš ją), todėl po pažymėta vieta lieka geltonas stačiakampis. Pastraipai su likusiu žymėjimu
     (ne lentelėje) tarpas po jos perkeliamas į tuščią tikslaus aukščio pastraipą: Word ir Pages išdėstymas tas pats, tekstas nekeičiamas.
     Tarpas - pačios pastraipos arba jos stiliaus grandinės (basedOn), galiausiai dokumento numatytasis. -> kiek pastraipų sutvarkyta */
  const PO_SPACING = new Set(['ind', 'contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc', 'textDirection', 'textAlignment', 'textboxTightWrap',
                              'outlineLvl', 'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange']);
  function tarpasPo(p, stiliai){
    const at = (el, n) => el ? el.getAttributeNS(W, n) || el.getAttribute('w:' + n) : null;
    const pPr = vaikas(p, 'pPr'), sav = pPr && vaikas(pPr, 'spacing');
    if (pPr && (vaikas(pPr, 'contextualSpacing') || vaikas(pPr, 'sectPr'))) return 0;
    if (sav && at(sav, 'afterAutospacing') && at(sav, 'afterAutospacing') !== '0') return 0;
    if (sav && at(sav, 'after') != null) return +at(sav, 'after') || 0;
    if (!stiliai) return 0;
    const S = visi(stiliai, 'style'), pagal = id => S.find(x => at(x, 'styleId') === id);
    const ps = pPr && vaikas(pPr, 'pStyle');
    let st = ps ? pagal(at(ps, 'val')) : S.find(x => at(x, 'type') === 'paragraph' && at(x, 'default') === '1');
    for (let k = 0; st && k < 12; k++){
      const sp = vaikas(st, 'pPr');
      if (sp && vaikas(sp, 'contextualSpacing')) return 0;
      const ss = sp && vaikas(sp, 'spacing');
      if (ss && at(ss, 'afterAutospacing') && at(ss, 'afterAutospacing') !== '0') return 0;
      if (ss && at(ss, 'after') != null) return +at(ss, 'after') || 0;
      const b = vaikas(st, 'basedOn'); st = b ? pagal(at(b, 'val')) : null;
    }
    const dd = visi(stiliai, 'pPrDefault')[0], ds = dd && visi(dd, 'spacing')[0];
    return ds && at(ds, 'after') != null ? +at(ds, 'after') || 0 : 0;
  }
  function tarpaiPoGeltonos(d, stiliai, pastraipos){
    let n = 0;
    pastraipos.forEach(p => {
      if (!p || !p.parentNode || tevas(p, 'tc')) return;
      if (!visi(p, 'r').some(r => !virsSdt(r, p) && vaikas(r, 'rPr') && vaikas(vaikas(r, 'rPr'), 'highlight') && tarpai(visi(r, 't').map(t => t.textContent).join('')))) return;
      const po = tarpasPo(p, stiliai);
      if (!(po > 0)) return;
      let pPr = vaikas(p, 'pPr');
      if (!pPr){ pPr = naujas(d, 'pPr'); p.insertBefore(pPr, p.firstChild); }
      let sp = vaikas(pPr, 'spacing');
      if (!sp){ sp = naujas(d, 'spacing'); pPr.insertBefore(sp, vaikai(pPr).find(c => PO_SPACING.has(c.localName)) || null); }
      sp.setAttributeNS(W, 'w:after', '0');
      const t = naujas(d, 'p'), tp = naujas(d, 'pPr'), ts = naujas(d, 'spacing'), tr = naujas(d, 'rPr');
      ts.setAttributeNS(W, 'w:before', '0'); ts.setAttributeNS(W, 'w:after', '0'); ts.setAttributeNS(W, 'w:line', String(po)); ts.setAttributeNS(W, 'w:lineRule', 'exact');
      ['sz', 'szCs'].forEach(k => { const e = naujas(d, k); e.setAttributeNS(W, 'w:val', '2'); tr.appendChild(e); });
      tp.appendChild(ts); tp.appendChild(tr); t.appendChild(tp);
      p.parentNode.insertBefore(t, p.nextSibling);
      n++;
    });
    return n;
  }

  function isvyniok(d, stiliai){
    const praleistos = new WeakSet(); let n = 0;
    const span = c => sk(vaikas(vaikas(c, 'tcPr') || c, 'gridSpan'), 'val') || 1;
    for (;;){
      const N = visi(d, 'tbl').find(t => !praleistos.has(t) && t.parentNode && t.parentNode.localName === 'tc' && !tevas(t.parentNode, 'tc') && !visi(t, 'tbl').length);
      if (!N) break;
      const tc = N.parentNode, tr = tc.parentNode, T = tr && tr.parentNode;
      const grid = T && vaikas(T, 'tblGrid'), ngrid = vaikas(N, 'tblGrid');
      const paprasta = T && T.localName === 'tbl' && tr.localName === 'tr' && grid && ngrid && span(tc) === 1 && !vaikas(vaikas(tc, 'tcPr') || tc, 'vMerge') &&
        vaikai(T).every(c => ['tblPr', 'tblGrid', 'tr', 'bookmarkStart', 'bookmarkEnd'].includes(c.localName)) &&
        vaikai(T, 'tr').every(r => { const pr = vaikas(r, 'trPr'); return vaikai(r).every(c => ['tc', 'trPr', 'tblPrEx'].includes(c.localName)) && (!pr || (!vaikas(pr, 'gridBefore') && !vaikas(pr, 'gridAfter'))); }) &&
        vaikai(N, 'tr').length > 0 && vaikai(N, 'tr').every(r => vaikai(r, 'tc').length > 0 && vaikai(r).every(c => ['tc', 'trPr', 'tblPrEx'].includes(c.localName)));
      if (!paprasta){ praleistos.add(N); continue; }
      const G = vaikai(grid, 'gridCol'), langeliai = vaikai(tr, 'tc'), idx = langeliai.indexOf(tc);
      let g = 0; for (const c of langeliai.slice(0, idx)) g += span(c);
      const ng = vaikai(ngrid, 'gridCol').map(c => sk(c, 'w')), sumN = ng.reduce((x, y) => x + y, 0), Wg = sk(G[g], 'w');
      if (!G[g] || !sumN || !Wg || ng.some(x => x <= 0)){ praleistos.add(N); continue; }
      const nw = ng.map(x => Math.max(1, Math.floor(x * Wg / sumN))); nw[nw.length - 1] += Wg - nw.reduce((x, y) => x + y, 0);
      const k = nw.length;
      // 1. tinklelis: stulpelis g -> k stulpelių; kiekvienos eilutės langelis, apimantis g, - platesnis per k - 1
      nw.forEach(w => { const c = naujas(d, 'gridCol'); c.setAttribute('w:w', String(w)); grid.insertBefore(c, G[g]); });
      grid.removeChild(G[g]);
      for (const r of vaikai(T, 'tr')){
        let p = 0;
        for (const c of vaikai(r, 'tc')){
          const s = span(c);
          if (p <= g && g < p + s){ const gs = naujas(d, 'gridSpan'); gs.setAttribute('w:val', String(s + k - 1)); idekI(tcPrOf(c), gs, TCPR_TVARKA); break; }
          p += s;
        }
      }
      // 2. įdėtinės lentelės rėmeliai: jos pačios arba jos stiliaus
      const ts = vaikas(vaikas(N, 'tblPr') || N, 'tblStyle');
      const tb = vaikas(vaikas(N, 'tblPr') || N, 'tblBorders') || stiliausRemeliai(stiliai, ts && (ts.getAttributeNS(W, 'val') || ts.getAttribute('w:val')));
      // 3. turinys prieš lentelę lieka eilutėje, lentelės eilutės ir turinys po jos - naujos eilutės
      const turinys = vaikai(tc).filter(x => x.localName !== 'tcPr'), po = turinys.slice(turinys.indexOf(N) + 1);
      const yraPo = po.some(x => x.localName !== 'p' || tarpai(pTekstas(x)) || visi(x, 'drawing').length);
      const kitiPries = langeliai.slice(0, idx), kitiPo = langeliai.slice(idx + 1), eil = vaikai(N, 'tr');
      let poEil = tr;
      eil.forEach((r, ri) => {
        const e = naujas(d, 'tr'), trPr = vaikas(r, 'trPr'), paskutine = ri === eil.length - 1;
        if (trPr){ vaikai(trPr).filter(c => !['cantSplit', 'trHeight'].includes(c.localName)).forEach(c => trPr.removeChild(c)); e.appendChild(trPr); }
        const tusti = paskutine && !yraPo ? ['top'] : ['top', 'bottom'];
        kitiPries.forEach(c => e.appendChild(tusciasLangelis(c, tusti)));
        vaikai(r, 'tc').forEach((c, ci, visiC) => {
          const pr = tcPrOf(c), w = vaikas(pr, 'tcW');
          let p = 0; visiC.slice(0, ci).forEach(x => { p += span(x); });
          const nwEl = naujas(d, 'tcW'); nwEl.setAttribute('w:w', String(nw.slice(p, p + span(c)).reduce((x, y) => x + y, 0))); nwEl.setAttribute('w:type', 'dxa');
          if (w) pr.removeChild(w);
          idekI(pr, nwEl, TCPR_TVARKA);
          const turi = vaikas(pr, 'tcBorders');
          BORD.forEach(b => {
            if (turi && vaikas(turi, b)) return;
            const krastinis = (b === 'top' && ri === 0) || (b === 'bottom' && paskutine) || (b === 'left' && ci === 0) || (b === 'right' && ci === visiC.length - 1);
            remelis(c, b, tb ? vaikas(tb, krastinis ? b : (b === 'top' || b === 'bottom' ? 'insideH' : 'insideV')) : null);
          });
          e.appendChild(c);
        });
        kitiPo.forEach(c => e.appendChild(tusciasLangelis(c, tusti)));
        T.insertBefore(e, poEil.nextSibling); poEil = e;
      });
      tc.removeChild(N);
      if (yraPo){
        const e = naujas(d, 'tr'), trPr = vaikas(tr, 'trPr');
        if (trPr) e.appendChild(trPr.cloneNode(true));
        kitiPries.forEach(c => e.appendChild(tusciasLangelis(c, ['top'])));
        const c2 = naujas(d, 'tc'), pr = vaikas(tc, 'tcPr');
        if (pr) c2.appendChild(pr.cloneNode(true));
        po.forEach(x => c2.appendChild(x));
        const gale = vaikai(c2).slice(-1)[0];
        if (!gale || gale.localName !== 'p') c2.appendChild(naujas(d, 'p'));
        remelis(c2, 'top', null);
        e.appendChild(c2);
        kitiPo.forEach(c => e.appendChild(tusciasLangelis(c, ['top'])));
        T.insertBefore(e, poEil.nextSibling);
      } else po.forEach(x => tc.removeChild(x));
      // likusi pradinė eilutė: langelis turi baigtis pastraipa; po ja - lentelės eilutės, todėl apatinio rėmelio nėra
      const gale = vaikai(tc).slice(-1)[0];
      if (!gale || gale.localName !== 'p') tc.appendChild(naujas(d, 'p'));
      langeliai.forEach(c => remelis(c, 'bottom', null));
      n++;
    }
    return n;
  }

  /* ------------------------------------------------------------------ vietos */
  const stulp = x => (x && x.stulpelis === 'EN') ? 'EN' : 'LT';
  function poruok(sarasas, f){
    const sk = {}, eile = x => { const k = stulp(x) + '|' + f(x); sk[k] = (sk[k] || 0) + 1; return sk[k] - 1; };
    const su = sarasas.map(x => ({ x, n: eile(x) }));
    return su.filter(e => stulp(e.x) === 'LT').map(e => ({ lt: e.x, n: e.n, en: (su.find(q => stulp(q.x) === 'EN' && f(q.x) === f(e.x) && q.n === e.n) || {}).x || null }));
  }
  function vietos(Z){
    const out = [];
    for (const v of Z.valdikliai.filter(v => stulp(v) === 'LT' && v.rusis !== 'docPartObj'))   // docPartObj - turinys (BS), ne vieta
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
    for (const b of Z.salyginiai || []) out.push({ raktas: 'b:' + b.id, rusis: 'salyginis', vieta: b.vieta, lt: b, en: null, aprasas: b.tekstas,
      dalys: b.dalys.map(d => d.map(i => Z.pastraipos[i]).filter(Boolean).join(' ')) });
    for (const b of Z.nurodymu_blokai || []) out.push({ raktas: 'nb:' + b.id, rusis: 'nurodymu_blokas', vieta: b.vieta, lt: b, en: null, aprasas: Z.pastraipos[b.i] });
    for (const b of Z.neprivalomos || []) out.push({ raktas: 'o:' + b.id, rusis: 'neprivaloma', vieta: b.vieta, lt: b, en: null, aprasas: Z.pastraipos[b.pastraipos[0]] });
    for (const k of Z.skyriai || []) out.push({ raktas: 'k:' + k.sritis, rusis: 'skyrius', vieta: k.sritis, lt: k, en: null,
      aprasas: ((Z.priedai || []).find(x => x.nr === k.priedas) || {}).tekstas || k.sritis });
    for (const k of Z.skyriai || []) if (k.lentele) out.push({ raktas: 'lt:' + k.sritis, rusis: 'lentele', vieta: k.sritis, lt: k.lentele, en: null, aprasas: 'lentelė' });
    for (const b of Z.vidiniai || []) out.push({ raktas: 'vd:' + b.id, rusis: 'vidinis', vieta: b.vieta, lt: b, en: null, aprasas: Z.pastraipos[b.i], variantai: b.variantai.slice() });
    if (Z.kiti_priedai) out.push({ raktas: 'kp:kiti', rusis: 'kiti_priedai', vieta: Z.kiti_priedai.vieta, lt: Z.kiti_priedai, en: null, aprasas: Z.pastraipos[Z.kiti_priedai.i] });
    for (const b of Z.fragmentai || []) out.push({ raktas: 'f:' + b.id, rusis: 'fragmentas', vieta: b.vieta, lt: b, en: null, aprasas: b.tekstas });
    for (const q of Z.priedai || []) out.push({ raktas: 'pr:' + q.nr, rusis: 'priedas', vieta: 'priedas ' + q.nr, lt: q, en: q.en != null ? { i: q.en } : null, aprasas: q.tekstas });
    return out;
  }
  const viesos = Z => vietos(Z).map(x => ({ raktas: x.raktas, rusis: x.rusis, vieta: x.vieta, aprasas: x.aprasas || '', saltinis: x.saltinis,
                                            elementai: x.elementai, variantai: x.variantai, pildo: x.pildo, dalys: x.dalys,
                                            id: (x.lt && x.lt.id) || null, eilute: (x.lt && x.lt.eilute) || null, tekstas: (x.lt && x.lt.tekstas) || null }));
  function vietaPagalI(Z, i){
    for (const k of ['nurodymai', 'pildomos', 'laukai', 'trynimo_nurodymai', 'taikymo_salygos', 'valdikliai'])
      for (const x of Z[k] || []) if (x.i === i && x.vieta) return x.vieta;
    for (const b of Z.salyginiai || []) if (i >= b.i && i <= Math.max(...b.dalys.flat())) return b.vieta;
    // nurodymo tęsinys (statybos rangos SS): jo pastraipos ir tuščios pastraipos tarp nurodymo dalių
    for (const b of (Z.nurodymai || []).concat(Z.salyginiai || [])) if (b.kartu && b.kartu.length && (b.kartu.includes(i) || (!b.dalys && i > b.i && i < Math.max(...b.kartu)))) return b.vieta;
    for (const b of Z.nurodymu_blokai || []) if (b.i === i || b.apima.includes(i)) return b.vieta;
    for (const b of Z.neprivalomos || []) if (i >= Math.min(...b.pastraipos) && i <= Math.max(...b.pastraipos)) return b.vieta;
    for (const b of Z.vidiniai || []) if (b.i === i) return b.vieta;
    if (Z.kiti_priedai && Z.kiti_priedai.i === i) return Z.kiti_priedai.vieta;
    for (const b of Z.nesiulomi || []) if (b.pastraipos.includes(i)) return b.vieta;
    for (const a of Z.alternatyvos || []) if (a.skyrikliai.includes(i) || a.variantai.flat().includes(i)) return a.vieta;
    for (const k of Z.skyriai || []) if (i >= k.luzis && i <= k.iki) return k.sritis;
    for (const q of Z.priedai || []) if (q.i === i) return 'priedų sąrašas ' + q.nr;
    for (let k = i; k >= 0; k--){ const m = /^(\d+(?:\.\d+)*)\./.exec(Z.pastraipos[k] || ''); if (m) return m[1]; }
    return '#' + i;
  }

  /* Pasirinkimo pastraipos viduje dalys šablono tekste (projektavimo paslaugų SS): tekstas prieš, variantai iš eilės ir tekstas po; tarp jų -
     tarpai, „/“ ir žyma „[pasirinkti vieną]“. -> { pries: [a, b], variantai: [[a, b]], po: [a, b] } arba null, jei tekstas nesusideda iš dalių */
  function vidinioDalys(t, b){
    const SEP = /(?:\s|\/|\[pasirinkti vieną\])*/iy;
    const tok = x => new RegExp(tarpai(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'y');
    let pos = 0;
    const sp = [];
    for (const x of [b.pries, ...b.variantai, b.po]){
      SEP.lastIndex = pos; SEP.exec(t); pos = SEP.lastIndex;
      if (!tarpai(x)){ sp.push([pos, pos]); continue; }
      const r = tok(x); r.lastIndex = pos;
      const m = r.exec(t);
      if (!m) return null;
      sp.push([pos, pos + m[0].length]); pos += m[0].length;
    }
    SEP.lastIndex = pos; SEP.exec(t);
    if (SEP.lastIndex !== t.length) return null;
    return { pries: sp[0], variantai: sp.slice(1, -1), po: sp[sp.length - 1] };
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
      [x.lt, x.en].filter(Boolean).forEach(y => { if (y.i != null) neisspresta.add(y.i); (y.kartu || []).forEach(i => neisspresta.add(i)); });
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
      if (yraSpr(s) && s.laisvas === true && String(s.tekstas || '').trim()){   // formuluotė ne iš formos sąrašo (naudotojo sprendimas 2026-10-13)
        for (const v of [x.lt, x.en].filter(Boolean)) vsp[v.nr] = { tekstas: v === x.en && s.tekstasEN != null ? s.tekstasEN : s.tekstas, netaikoma: false };
        A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'laisvas tekstas', tapo: s.tekstas });
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
        // Word numeracija: pasirinktas variantas be punkto numerio, o pašalintoje dalyje jis buvo - numeris (ir punkto atitraukimas) perkeliamas
        if (Z.numeracija === 'word' && !v.some(i => numeruota(P[i]))){
          const su = [...Array(iki - nuo + 1).keys()].map(k => nuo + k).filter(i => (i < vn || i > vi) && numeruota(P[i]))[0];
          if (su != null){
            const is = vaikas(P[su], 'pPr'), i_ = pPrOf(P[v[0]]);
            for (const n of ['pStyle', 'numPr', 'tabs', 'ind']) if (vaikas(is, n)) idek(i_, vaikas(is, n).cloneNode(true));
            A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'numeracija', tapo: 'punkto numeris perkeltas į pasirinktą variantą' });
          }
        }
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

    // 4b. Neprivalomi punktai su „//“ nurodymu (rangos SS): taikoma - šalinamas nurodymas ir tuščios pastraipos iki punkto teksto;
    //     netaikoma - ir punktas bei viena tuščia pastraipa po jo (su `tekstas` - nurodymo vietoje tekstas, punktas lieka); kelių dalių - pasirinktos dalys
    const papildymai = {};   // pastraipa -> [{ tekstas, x }] - naujos pastraipos po jos (esminės sąlygos)
    for (const x of V.filter(x => x.rusis === 'salyginis')){
      const s = sp(x), b = x.lt, visos = b.dalys.flat();
      if (!yraSpr(s) || typeof s.taikoma !== 'boolean'){ palik(x, s); [b.i, ...visos].forEach(i => neisspresta.add(i)); continue; }
      (b.kartu || []).forEach(i => trinti(i, 'šablono „arba“ be antro varianto'));
      const lieka = b.dalys.map((d, k) => s.taikoma && !(s.dalys && s.dalys[k] === false));
      if (!s.taikoma && s.tekstas){   // punktas lieka su antrašte, nurodymo vietoje - tekstas („Punktas netaikomas.“)
        salygosTekstas[b.i] = String(s.tekstas);
        visos.forEach(i => trinti(i, 'punktas netaikomas (jūsų atsakymas)'));
        for (let i = b.i + 1; i < Math.max(...visos); i++) if (!Z.pastraipos[i]) trinti(i, 'tuščia pastraipa pašalintame punkte');
        A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'punktas', tapo: String(s.tekstas) });
        continue;
      }
      trinti(b.i, 'šablono nurodymas rengėjui');
      for (let i = b.i + 1; i < Math.min(...visos); i++) if (!Z.pastraipos[i]) trinti(i, 'tuščia pastraipa po nurodymo');
      if (!s.taikoma && (s.vietoje || s.lieka)){   // netaikoma, bet punktų numeriai lieka: tekstas punkto vietoje, antraštė paliekama
        const vt = s.vietoje || {}, lk = s.lieka || [];
        visos.forEach((i, k) => {
          if (vt[k] != null && String(vt[k]).trim()) salygosTekstas[i] = String(vt[k]);
          else if (!lk.includes(k)) trinti(i, 'punktas netaikomas (jūsų atsakymas)');
        });
        A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'punktas', tapo: Object.values(vt).filter(Boolean)[0] || 'netaikomas' });
        continue;
      }
      b.dalys.forEach((d, k) => { if (!lieka[k]) for (let i = Math.min(...d); i <= Math.max(...d); i++) trinti(i, 'punktas netaikomas (jūsų atsakymas)'); });
      if (!lieka.some(Boolean)){
        const po = Math.max(...visos) + 1;   // tame pačiame langelyje (rangos SS punktai - vienos lentelės langelyje)
        if (po < P.length && !Z.pastraipos[po] && tevas(P[po], 'tc') === tevas(P[po - 1], 'tc')) trinti(po, 'tuščia pastraipa po pašalinto punkto');
      }
      if (s.papildymas) for (const [k, t] of Object.entries(s.papildymas)) if (lieka[+k] && String(t || '').trim())
        (papildymai[Math.max(...b.dalys[+k])] = papildymai[Math.max(...b.dalys[+k])] || []).push({ tekstas: String(t), x });
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'punktas', tapo: !lieka.some(Boolean) ? 'netaikomas'
        : lieka.length > 1 ? 'taikoma dalių: ' + lieka.filter(Boolean).length + ' iš ' + lieka.length : 'taikomas' });
    }
    for (const x of V.filter(x => x.rusis === 'nurodymu_blokas')){
      const s = sp(x), visos = [x.lt.i, ...x.lt.apima];
      if (s !== 'salinti'){ palik(x, s, 'word'); visos.forEach(i => neisspresta.add(i)); continue; }
      visos.forEach(i => trinti(i, 'šablono nurodymai rengėjui'));
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'nurodymai', tapo: '' });
    }
    // Šablono sakiniai, taikomi tik tam tikru atveju (rangos SS 3, 6, 8 p.): pašalinami arba jų vietoje - tekstas; tuščios pastraipos tarp jų - kartu
    for (const x of V.filter(x => x.rusis === 'neprivaloma')){
      const s = sp(x), ps = x.lt.pastraipos, nuo = Math.min(...ps), iki = Math.max(...ps);
      if (s !== 'salinti' && !(yraSpr(s) && typeof s === 'object' && s.tekstas)) continue;   // lieka - šablono tekstas
      const tekstas = s === 'salinti' ? '' : String(s.tekstas);
      for (let i = nuo; i <= iki; i++){
        if (tekstas && i === nuo){ salygosTekstas[i] = tekstas; continue; }
        if (ps.includes(i) || !Z.pastraipos[i]) trinti(i, 'nuostata netaikoma (jūsų atsakymas)');
      }
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'nuostata', buvo: ps.map(i => Z.pastraipos[i]).join(' '), tapo: tekstas || 'pašalinta' });
    }
    // Priedų sąrašo eilutė kitiems priedams: jos vietoje - pirmas priedas, kiti - naujomis to paties sąrašo eilutėmis (klonai įterpiami po
    // spalvų tvarkymo, kad paveldėtų galutinį eilutės formatą); be sprendimo eilutė lieka ir parodoma kaip palikta vieta
    const prieduEilutes = {};   // pastraipa -> { eilutes: [tekstas], x }
    for (const x of V.filter(x => x.rusis === 'kiti_priedai')){
      const s = sp(x), i = x.lt.i;
      const eil = yraSpr(s) && typeof s === 'object' ? (s.eilutes || (s.tekstas ? [s.tekstas] : [])).map(tarpai).filter(Boolean) : [];
      if (!eil.length){
        // pildoma vieta toje pačioje pastraipoje („[...].“) jau parodoma kaip palikta - antro įrašo nereikia
        if (!(Z.pildomos || []).some(q => q.i === i)) palik(x, s); else neisspresta.add(i);
        continue;
      }
      salygosTekstas[i] = eil[0];
      if (eil.length > 1) prieduEilutes[i] = { eilutes: eil.slice(1), x };
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'priedai', buvo: Z.pastraipos[i], tapo: eil.join(' ') });
    }
    // Priedas paskutiniame skyriuje: šalinamas skyrius (skyriaus lūžio pastraipos savybės tampa dokumento pabaigos) ir priedų sąrašo eilutė
    let skyriausLuzis = null;
    for (const x of V.filter(x => x.rusis === 'skyrius')){
      if (sp(x) !== 'salinti') continue;
      const k = x.lt, lp = vaikas(P[k.luzis], 'pPr'), sect = lp && vaikas(lp, 'sectPr'), kunas = d.documentElement.getElementsByTagNameNS(W, 'body')[0];
      if (!sect || k.iki !== P.length - 1 || !vaikas(kunas, 'sectPr')){ A.klaidos.push(`${k.sritis}: priedo skyrius nesutampa su žemėlapiu - nepašalintas`); continue; }
      for (let i = k.luzis; i <= k.iki; i++) trinti(i, 'priedas pašalintas (jūsų atsakymas)');
      const pr = (Z.priedai || []).find(q => q.nr === k.priedas);
      if (pr) trinti(pr.i, 'priedas pašalintas (jūsų atsakymas)');
      skyriausLuzis = { sect, kunas };
      A.pakeista.push({ raktas: x.raktas, vieta: k.sritis, ka: 'priedas', tapo: 'pašalintas' });
    }

    // 4c. Šablono variantai, kurių generatorius nesiūlo (projektavimo paslaugų SS 3.1 „arba“ - naudotojo sprendimas 2026-10-11): šalinami
    //     visada ir išvardijami ataskaitoje (ne tylus praleidimas)
    for (const b of Z.nesiulomi || []){
      b.pastraipos.forEach(i => trinti(i, 'šablono variantas nesiūlomas: ' + b.priezastis));
      A.pakeista.push({ raktas: 'ns:' + b.id, vieta: b.vieta, ka: 'nesiūlomas variantas', buvo: b.pastraipos.map(i => Z.pastraipos[i]).join(' '), tapo: 'pašalintas', kodel: b.priezastis });
    }
    // 4d. Pasirinkimai pastraipos viduje („[pasirinkti vieną]“): lieka tekstas prieš, pasirinktas variantas ir tekstas po
    const isspresta = new Set();   // pastraipos, kuriose vieta išspręsta (žymėjimo nuėmimui, kai žemėlapio zymejimas - „pildoma“)
    for (const x of V.filter(x => x.rusis === 'vidinis')){
      const s = sp(x), b = x.lt, i = b.i;
      if (istrinti.has(i)) continue;
      if (!yraSpr(s) || s.variantas == null || !b.variantai[s.variantas]){ palik(x, s); continue; }
      const D = vidinioDalys(R[i], b);
      if (!D){ A.klaidos.push(`${x.vieta} p.: pasirinkimo pastraipa nesusideda iš žemėlapio dalių`); continue; }
      const v = D.variantai[s.variantas], yraPries = D.pries[1] > D.pries[0], yraPo = D.po[1] > D.po[0];
      const keit = [];   // [a, b, nauja] - nuo pastraipos galo
      if (yraPo){
        if (D.po[1] < R[i].length) keit.push([D.po[1], R[i].length, '']);
        if (v[1] < D.po[0]) keit.push([v[1], D.po[0], /^[.,;:)]/.test(R[i].slice(D.po[0])) ? '' : ' ']);
      } else if (v[1] < R[i].length) keit.push([v[1], R[i].length, '']);
      if (yraPries){
        if (D.pries[1] < v[0] && R[i].slice(D.pries[1], v[0]) !== ' ') keit.push([D.pries[1], v[0], ' ']);
        if (D.pries[0] > 0) keit.push([0, D.pries[0], '']);
      } else if (v[0] > 0) keit.push([0, v[0], '']);
      let gerai = true;
      for (const [a, z, nauja] of keit){
        if (!keisk(P[i], a, z, nauja)){ gerai = false; break; }
        R[i] = R[i].slice(0, a) + nauja + R[i].slice(z);
      }
      const laukta = tarpai(tarpai(b.pries) + ' ' + tarpai(b.variantai[s.variantas])) + (/^[.,;:)]/.test(tarpai(b.po)) || !tarpai(b.po) ? '' : ' ') + tarpai(b.po);
      if (!gerai || tarpai(R[i]) !== laukta){ A.klaidos.push(`${x.vieta} p.: nepavyko palikti pasirinkto varianto`); continue; }
      isspresta.add(i);
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'pasirinkimas', tapo: b.variantai[s.variantas] });
    }

    // 4e. Lentelė priede (rangos SS etapų lentelė, 2026-10-13 - lentelės redaktorius 2 žingsnyje): eilutės iš jūsų atsakymų. Langelio tekstas -
    //     jo pastraipoje, kitos eilutės - jos klonuose; nereikalingos formos eilutės ir netaikomi stulpeliai šalinami (7 žingsnyje; pašalinto
    //     stulpelio plotis tinklelyje atitenka plačiausiam likusiam - langelių pločius pagal tinklelį sulygina lentelių tvarkymas), trūkstamos eilutės - paskutinės formos eilutės klonai; langelis be reikšmės lieka
    //     laukas (pildomas sudarant sutartį). Be sprendimo lentelė lieka Word programai.
    const lentLangeliai = new Set(), lentSalinti = [];
    for (const x of V.filter(x => x.rusis === 'lentele')){
      const s = sp(x), L = x.lt, eil = yraSpr(s) && typeof s === 'object' ? s.eilutes || [] : [];
      if (!eil.length) continue;
      const tcs = tr => vaikai(tr).filter(c => c.localName === 'tc'), n = L.stulpeliai.length;
      const tbl = tevas(P[L.eilutes[0][0][0]], 'tbl'), trs = tbl ? vaikai(tbl).filter(c => c.localName === 'tr') : [];
      const grid = tbl && vaikas(tbl, 'tblGrid') ? vaikai(vaikas(tbl, 'tblGrid')).filter(c => c.localName === 'gridCol') : [];
      if (trs.length !== L.eilutes.length + 1 || grid.length !== n || trs.some(tr => tcs(tr).length !== n) ||
          L.eilutes.some((e, r) => e.some((c, k) => c.some(i => tevas(P[i], 'tc') !== tcs(trs[r + 1])[k])))){
        A.klaidos.push(`${x.vieta}: lentelė nesutampa su žemėlapiu - neužpildyta`); continue;
      }
      const be = (s.beStulpeliu || []).map(id => L.stulpeliai.indexOf(id)).filter(c => c > 0);
      const reiksmes = (e, c) => (((e || {}).langeliai || {})[L.stulpeliai[c]] || []).map(tarpai).filter(Boolean);
      const langelis = (p, tekstai) => {
        irasykLauka(p, tekstai[0]);
        let po = p;
        tekstai.slice(1).forEach(t => { const np = klonas(p); irasykLauka(np, t); po.parentNode.insertBefore(np, po.nextSibling); po = np; });
      };
      L.eilutes.forEach((row, r) => {
        if (r >= eil.length){ row.flat().forEach(i => trinti(i, 'lentelės eilutė nereikalinga (jūsų atsakymas)')); lentSalinti.push(trs[r + 1]); return; }
        row.forEach((ps, c) => {
          const t = reiksmes(eil[r], c);
          if (!c || !t.length) return;
          langelis(P[ps[0]], t); R[ps[0]] = t[0]; lentLangeliai.add(ps[0]);
        });
      });
      let po = trs[L.eilutes.length];
      for (let r = L.eilutes.length; r < eil.length; r++){
        const ntr = klonas(trs[L.eilutes.length]);
        tcs(ntr).forEach((tc, c) => {
          const ps = vaikai(tc).filter(q => q.localName === 'p'), t = reiksmes(eil[r], c);
          ps.slice(1).forEach(q => tc.removeChild(q));
          if (!c) perrasyk(ps[0], tarpai(eil[r].etikete));
          else if (t.length) langelis(ps[0], t);
          else {
            vaikai(ps[0]).forEach(q => { if (q.localName !== 'pPr') ps[0].removeChild(q); });
            if (!be.includes(c)) A.palikta.push({ raktas: x.raktas, rusis: 'laukas', vieta: x.vieta, aprasas: tarpai(eil[r].etikete) + ' / ' + Z.pastraipos[L.antraste[c][0]], kodel: 'sudarant' });
          }
        });
        po.parentNode.insertBefore(ntr, po.nextSibling); po = ntr;
      }
      const plotis = el => +(el.getAttributeNS(W, 'w') || 0), lieka = L.stulpeliai.map((_, c) => c).filter(c => !be.includes(c));
      const platus = lieka.reduce((a, c) => plotis(grid[c]) > plotis(grid[a]) ? c : a, lieka[0]);
      for (const c of be){
        for (const tr of vaikai(tbl).filter(q => q.localName === 'tr')){
          visi(tcs(tr)[c], 'p').forEach(q => { const i = P.indexOf(q); if (i >= 0) trinti(i, 'lentelės stulpelis netaikomas (jūsų atsakymas)'); });
          lentSalinti.push(tcs(tr)[c]);
        }
        grid[platus].setAttributeNS(W, 'w:w', String(plotis(grid[platus]) + plotis(grid[c])));
        lentSalinti.push(grid[c]);
      }
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'lentelė', tapo: 'eilučių: ' + eil.length, stulpeliai: be.map(c => Z.pastraipos[L.antraste[c][0]]) });
    }

    // 5. Teksto vietos pastraipose (prieš valdiklius - kol pastraipos tekstas = žemėlapio): kiekvienoje pastraipoje nuo galo
    const keitimai = {};   // i -> [{ frag, nauja, x, lt }]
    const naujaPagal = (x, y, s) => s === 'salinti' ? '' : ((y === x.en && s.tekstasEN != null) ? s.tekstasEN : s.tekstas);
    for (const x of V.filter(x => ['nurodymas', 'pildoma', 'taikymo'].includes(x.rusis))){
      const s = sp(x);
      if ([x.lt, x.en].filter(Boolean).every(y => istrinti.has(y.i) || salygosTekstas[y.i] != null)) continue;   // vieta ištrintoje ar visa perrašytoje pastraipoje
      if (!yraSpr(s) || (s !== 'salinti' && (typeof s !== 'object' || s.tekstas == null))){ palik(x, s, x.rusis === 'pildoma' ? 'neatsakyta' : null); continue; }
      for (const y of [x.lt, x.en].filter(Boolean)) if (!istrinti.has(y.i) && salygosTekstas[y.i] == null)
        (keitimai[y.i] = keitimai[y.i] || []).push({ frag: y.tekstas, nauja: naujaPagal(x, y, s), x, lt: y === x.lt, glaustai: !!(s && s.glaustai),
                                                     lieka: x.rusis === 'pildoma' && s && typeof s === 'object' && s.lieka ? String(s.lieka) : '' });
      for (const y of [x.lt, x.en].filter(Boolean)) if (y.kartu && y.kartu.length)
        for (let i = y.i + 1; i <= Math.max(...y.kartu); i++) if (y.kartu.includes(i) || !Z.pastraipos[i]) trinti(i, 'šablono nurodymo tęsinys');
    }
    // Šablono teksto atkarpa, taikoma ne visada (projektavimo paslaugų SS 2.1 p.): be sprendimo lieka - tai šablono tekstas, ne palikta vieta
    for (const x of V.filter(x => x.rusis === 'fragmentas')){
      const s = sp(x), y = x.lt;
      if (s !== 'salinti' && !(yraSpr(s) && typeof s === 'object' && s.tekstas != null)) continue;
      if (istrinti.has(y.i) || salygosTekstas[y.i] != null) continue;
      (keitimai[y.i] = keitimai[y.i] || []).push({ frag: y.tekstas, nauja: s === 'salinti' ? '' : String(s.tekstas), x, lt: true });
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
        if (!k.nauja){   // pašalinant - ir gretimas tarpas (rangos SS: „... dalis (pasirenkama ... atveju),“ - ir kablelis eilutės gale)
          if (/^\(pasirenkama /.test(k.frag) && /^,\s*$/.test(R[i].slice(b))) b++;
          if (a > 0 && R[i][a - 1] === ' ' && (b >= R[i].length || /[\s.,;:)]/.test(R[i][b]))) a--;
          else if (R[i][b] === ' ' && (a === 0 || /\s/.test(R[i][a - 1]))) b++;
        } else if (k.glaustai && a > 0 && R[i][a - 1] === ' ') a--;   // „Kiti priedai [...]“ -> „Kiti priedai: ...“
        if (k.lieka){   // įrašoma reikšmė, o po jos lieka pildoma vieta šablono formatu (sudarant sutartį)
          const rl = keisk(P[i], a, b, k.lieka, { palikti: true });
          if (!rl || rl === true){ A.klaidos.push(`${k.x.vieta} p.: nepavyko pakeisti teksto`); return; }
          iterpkPries(rl, k.nauja);
          R[i] = R[i].slice(0, a) + k.nauja + k.lieka + R[i].slice(b);
          if (k.lt){
            A.pakeista.push({ raktas: k.x.raktas, vieta: k.x.vieta, ka: k.x.rusis, buvo: k.frag, tapo: k.nauja + k.lieka });
            A.palikta.push({ raktas: k.x.raktas, rusis: 'pildoma', vieta: k.x.vieta, aprasas: k.lieka, kodel: 'sudarant' });
          }
          neisspresta.add(i);
          return;
        }
        if (!keisk(P[i], a, b, k.nauja)){ A.klaidos.push(`${k.x.vieta} p.: nepavyko pakeisti teksto`); return; }
        R[i] = R[i].slice(0, a) + k.nauja + R[i].slice(b);
        if (k.lt) A.pakeista.push({ raktas: k.x.raktas, vieta: k.x.vieta, ka: k.x.rusis, buvo: k.frag, tapo: k.nauja });
        if (k.x.rusis !== 'organizacija') isspresta.add(i);
      });
      if (!tarpai(R[i]) && !ks.some(k => k.x.rusis === 'pildoma') && !visi(P[i], 'sdt').length) trinti(i, 'tuščia po nurodymo pašalinimo');
    }
    for (const [is, t] of Object.entries(salygosTekstas)){ (zenkloDidziosios(P[+is]) ? irasykTeksta : irasykLauka)(P[+is], t); R[+is] = t; isspresta.add(+is); }
    for (const x of V.filter(x => x.rusis === 'laukas')){
      const s = sp(x);
      if ([x.lt, x.en].filter(Boolean).every(y => istrinti.has(y.i)) || lentLangeliai.has(x.lt.i)) continue;   // pašalintame priede ar lentelės redaktoriaus užpildytas
      if (!yraSpr(s) || !s.tekstas){ palik(x, s, x.pildo === 'sudarant' ? 'sudarant' : null); continue; }
      for (const y of [x.lt, x.en].filter(Boolean)){
        const nauja = (y === x.en && s.tekstasEN != null ? s.tekstasEN : s.tekstas);
        irasykLauka(P[y.i], nauja); R[y.i] = nauja;
      }
      A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'laukas', tapo: s.tekstas });
      // lauko tekste palikta vieta („..., pirkimo Nr. [...]“ - numeris įrašomas sudarant sutartį, 2026-10-13)
      if (new RegExp(VIETA_REZ.source).test(s.tekstas)) A.palikta.push({ raktas: x.raktas, rusis: 'pildoma', vieta: x.vieta, aprasas: s.tekstas, kodel: 'sudarant' });
    }

    // 5a. Įmonės pavadinimas puslapio antraštėse ir poraštėse (darbų pirkimo-pardavimo BS antraštė „ĮMONĖS PAVADINIMAS darbų pirkimo
    //     sutarties bendrosios sąlygos“, 2026-10-12) - žemėlapis aprašo tik dokumento tekstą, todėl keičiama čia ir patikrinama
    for (const f of doc.zip.file(/^word\/(header|footer)\d*\.xml$/)){
      if ((await f.async('string')).indexOf(IMONE) < 0) continue;
      const h = await GPDocx.part(doc, f.name);
      let n = 0;
      visi(h, 't').forEach(t => { if (t.textContent.indexOf(IMONE) >= 0){ t.textContent = t.textContent.split(IMONE).join(info.imone || 'LITGRID AB'); n++; } });
      if (visi(h, 'p').some(p => visi(p, 't').map(t => t.textContent).join('').indexOf(IMONE) >= 0)) A.klaidos.push(`${f.name}: „${IMONE}“ nepakeistas`);
      else if (n) A.pakeista.push({ raktas: '', vieta: /header/.test(f.name) ? 'puslapio antraštė' : 'puslapio poraštė', ka: 'organizacija', buvo: IMONE, tapo: info.imone || 'LITGRID AB' });
    }

    // 5b. „Punktas netaikomas“ be šablono trynimo nurodymo (naujo darbuotojo patikra 2026-10-20, prekių SS 14.3-14.4): pasirinkus
    //     „Punktas ir 14.4.1 - 14.4.4 papunkčiai netaikomi.“ šalinami tie papunkčiai (toje pačioje lentelės langelio ar dokumento srityje,
    //     iš eilės po valdiklio pastraipos), o „Punktas netaikomas: “ / „The clause does not apply:“ su punkto tekstu toje pačioje
    //     pastraipoje - lieka „Punktas netaikomas.“ (tekstas po valdiklio šalinamas). Iki tol likdavo papunkčiai ir „netaikomas: ... turi atitikti“.
    const NT_RIBOS = /(\d+(?:\.\d+)+)\.?\s*[-–]\s*(\d+(?:\.\d+)+)\.?\s+papunk(?:čiai|ciai) netaikomi/i;
    const NT_DVITASKIS = /^(Punktas netaikomas|The clause does not apply)\s*:\s*$/i;
    const nrDalys = t => t.split('.').map(Number);
    for (const v of Z.valdikliai){
      const s = vsp[v.nr];
      if (!s || !s.netaikoma || v.lygis !== 'eilute') continue;
      const i = v.i;
      if (istrinti.has(i)) continue;
      // šablono žodžiai su ribomis - lietuviškame valdiklyje; angliškam (pora) - tos pačios ribos
      const lt = v.stulpelis === 'EN' ? Z.valdikliai.find(w => w.nr === v.pora) : v;
      const m = lt && vsp[lt.nr] && NT_RIBOS.exec(vsp[lt.nr].tekstas || '');
      if (m){
        const [a, b] = [nrDalys(m[1]), nrDalys(m[2])], pref = a.slice(0, -1).join('.');
        if (pref === b.slice(0, -1).join('.')){
          const tc = tevas(P[i], 'tc');
          for (let j = i + 1; j < P.length && tevas(P[j], 'tc') === tc; j++){
            if (istrinti.has(j)) continue;
            const t = tarpai(R[j] || '');
            if (!t) continue;
            const n = /^(\d+(?:\.\d+)+)\.?\s/.exec(t + ' '), d = n && nrDalys(n[1]);
            if (!d || d.slice(0, -1).join('.') !== pref || d[d.length - 1] < a[a.length - 1] || d[d.length - 1] > b[b.length - 1]) break;
            trinti(j, 'punktas ir papunkčiai netaikomi (jūsų atsakymas)');
          }
        }
      }
      if (NT_DVITASKIS.test(s.tekstas || '') && tarpai(R[i] || '')){
        if (!keisk(P[i], 0, R[i].length, '')){ A.klaidos.push(`${vietaPagalI(Z, i)} p.: nepavyko pašalinti netaikomo punkto teksto`); continue; }
        A.pasalinta.push({ vieta: vietaPagalI(Z, i), tekstas: R[i], kodel: 'punktas netaikomas (jūsų atsakymas)' });
        R[i] = '';
        s.tekstas = s.tekstas.replace(/\s*:\s*$/, '.');
      }
    }

    // 6. Valdikliai (DOM): eilutės valdiklio tekstas tampa pastraipos dalimi; blokinio - jo pastraipos tekstu
    for (const [nr, v] of Object.entries(vsp)){
      const sdt = SDT[+nr], vidinis = visi(vaikas(sdt, 'sdtContent'), 'p');
      if (vidinis.length){ vidinis.forEach((p, k) => { const i = P.indexOf(p); if (i >= 0) R[i] = k ? '' : v.tekstas; }); }
      else { const i = P.indexOf(sdt.parentNode); if (i >= 0 && v.tekstas) (ideta[i] = ideta[i] || []).push(v.tekstas); }
      irasykValdikli(sdt, v.tekstas);
    }

    // 6b. Papildymai - naujos pastraipos po punkto (pastraipos savybės - punkto, be numerio ir pusjuodžio; Word sąrašo stilius turi numerį,
    //     todėl numId 0 įrašomas aiškiai)
    for (const [is, ks] of Object.entries(papildymai)){
      let po = P[+is];
      const r0 = visi(po, 'r').find(r => !virsSdt(r, po)), rp0 = r0 && vaikas(r0, 'rPr');
      const be = n => { vaikai(n).forEach(c => { if (['b', 'bCs'].includes(c.localName)) n.removeChild(c); }); return n; };
      for (const k of ks) for (const eil of k.tekstas.split(/\n+/).map(tarpai).filter(Boolean)){
        const np = naujas(d, 'p'), sp0 = vaikas(P[+is], 'pPr');
        if (sp0){
          const kp = sp0.cloneNode(true); ['sectPr', 'pPrChange'].forEach(n => { const c = vaikas(kp, n); if (c) kp.removeChild(c); });
          const rp = vaikas(kp, 'rPr'); if (rp) be(rp);
          if (vaikas(kp, 'numPr') || vaikas(kp, 'pStyle')){
            const n = naujas(d, 'numPr'), il = naujas(d, 'ilvl'), id = naujas(d, 'numId');
            il.setAttribute('w:val', '0'); id.setAttribute('w:val', '0'); n.appendChild(il); n.appendChild(id); idek(kp, n);
          }
          const ind = vaikas(kp, 'ind'); if (ind){ ind.removeAttribute('w:hanging'); ind.removeAttributeNS(W, 'hanging'); }
          np.appendChild(kp);
        }
        const r = naujas(d, 'r');
        if (rp0){ const kk = be(rp0.cloneNode(true)); svarus(kk); r.appendChild(kk); }
        const t = naujas(d, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = eil; r.appendChild(t); np.appendChild(r);
        po.parentNode.insertBefore(np, po.nextSibling); po = np;
        A.pakeista.push({ raktas: k.x.raktas, vieta: k.x.vieta, ka: 'papildyta', tapo: eil });
      }
    }

    // 6c. Priedų sąrašas (2026-10-13): nepridedamas priedas - eilutė lieka su žodžiu „netaikoma“ (prieš eilutės galo skyrybos ženklą); papildomi
    //     priedai - po paskutinės eilutės (jos gale taškas tampa kabliataškiu, naujos eilutės įterpiamos 8a žingsnyje)
    const galoKeitimas = (i, kaip, vieta) => {   // paskutinis ne tarpo ženklas -> kaip(ženklas); tas pats - laukiamame tekste R
      const p = P[i], t = pTekstas(p), e = t.replace(/\s+$/, '').length, r = R[i].replace(/\s+$/, '').length;
      if (!e || !r || t[e - 1] !== R[i][r - 1]){ A.klaidos.push(`${vieta}: priedo eilutės pabaiga neatpažinta - nepakeista`); return false; }
      const naujas = kaip(t[e - 1]);
      if (naujas === t[e - 1]) return true;
      if (!keisk(p, e - 1, e, naujas)){ A.klaidos.push(`${vieta}: nepavyko pakeisti priedo eilutės`); return false; }
      R[i] = R[i].slice(0, r - 1) + naujas + R[i].slice(r);
      return true;
    };
    for (const x of V.filter(x => x.rusis === 'priedas')){
      const s = sp(x);
      if (!s || typeof s !== 'object') continue;
      if (s.netaikoma === true){
        let gerai = true;
        for (const [y, zodis] of [[x.lt, ' - netaikoma'], [x.en, ' - not applicable']]){
          if (!y || istrinti.has(y.i)) continue;
          gerai = galoKeitimas(y.i, c => /[;.,]/.test(c) ? zodis + c : c + zodis, x.vieta) && gerai;
        }
        if (gerai) A.pakeista.push({ raktas: x.raktas, vieta: x.vieta, ka: 'priedas', buvo: x.aprasas, tapo: 'netaikoma' });
      }
      const po = (s.po || []).map(tarpai).filter(Boolean);
      if (po.length && !istrinti.has(x.lt.i) && galoKeitimas(x.lt.i, c => c === '.' ? ';' : c, x.vieta)) prieduEilutes[x.lt.i] = { eilutes: po, x };
    }

    // 6a. Nuoroda į pašalintą punktą (2026-10-09, nuorodų patikra): SS 9.8 „Punktas netaikomas, taikomos 8.3.2 punkte nustatytos sąlygos.“ -
    //     kai užtikrinimas netaikomas, 8.3 su 8.3.2 pašalinami, ir nuoroda likdavo į nieką; tada lieka „Punktas netaikomas.“ (EN - taip pat)
    const NR_PR = /^\s*(\d+(?:\.\d+)+)\./, pasalintiNr = new Set(), likeNr = new Set();
    P.forEach((p, i) => { const m = NR_PR.exec(R[i] || ''); if (m) (istrinti.has(i) ? pasalintiNr : likeNr).add(m[1]); });
    P.forEach((p, i) => {
      if (istrinti.has(i)) return;
      const m = /^Punktas netaikomas(, taikomos (\d+(?:\.\d+)+) punkte nustatytos sąlygos)\.$/.exec(R[i].trim()) ||
                /^The clause does not apply(; the conditions set out in paragraph (\d+(?:\.\d+)+) shall apply)\.$/.exec(R[i].trim());
      if (!m || !pasalintiNr.has(m[2]) || likeNr.has(m[2])) return;
      const a = R[i].indexOf(m[1]);
      if (a < 0 || !keisk(p, a, a + m[1].length, '')){ A.klaidos.push(`${vietaPagalI(Z, i)} p.: nepavyko pašalinti nuorodos į ${m[2]} punktą`); return; }
      R[i] = R[i].slice(0, a) + R[i].slice(a + m[1].length);
      if (!/^The /.test(m[0])) A.pakeista.push({ raktas: '', vieta: vietaPagalI(Z, i), ka: 'nuoroda', buvo: m[0], tapo: R[i].trim() });
    });

    // 7. Šalinimas - nuo galo (langelio paskutinė pastraipa tik išvaloma; lentelė, kurios visos pastraipos šalinamos, - visa)
    if (skyriausLuzis) skyriausLuzis.kunas.replaceChild(skyriausLuzis.sect, vaikas(skyriausLuzis.kunas, 'sectPr'));
    const nuimta = new Set();
    for (const tbl of visi(d, 'tbl')){
      if (!tbl.parentNode || tevas(tbl, 'tbl')) continue;
      const ps = visi(tbl, 'p').map(p => P.indexOf(p));
      if (ps.length && ps.every(i => i >= 0 && istrinti.has(i))){ tbl.parentNode.removeChild(tbl); ps.forEach(i => nuimta.add(i)); }
    }
    for (const el of lentSalinti) el.parentNode.removeChild(el);   // lentelės redaktoriaus pašalintos eilutės, stulpelių langeliai ir tinklelio stulpeliai
    [...istrinti].sort((a, b) => b - a).forEach(i => { if (!nuimta.has(i) && salink(P[i]) === 'isvalyta'){ R[i] = ''; istrinti.delete(i); } });

    // 8. Spalvos: išspręstų vietų geltonas žymėjimas, VPT mėlynos nuostatos ir keičiamos reikšmės - juodai (DI juodraščiai lieka)
    const di = new Set((Z.di_juodrasciai || []).map(x => x.i));
    // Žemėlapis su „zymejimas: pildoma“ (projektavimo paslaugų SS): geltona lieka ten, kur vieta palikta pildyti sudarant sutartį (tiekėjo
    // duomenys, kaina, atstovai) - nuimama tik išspręstose vietose ir žinomų reikšmių pastraipose
    const pildoma = Z.zymejimas === 'pildoma', zinomos = new Set(Z.zinomos || []), geltona = new Set();
    Z.paryskinimai.forEach(x => {
      if (istrinti.has(x.i) || neisspresta.has(x.i) || di.has(x.i)) return;
      // tuščia pažymėta pastraipa (tik pastraipos ženklas ar tarpai) - Pages ją rodytų geltonu stačiakampiu; žymėjimas nuimamas
      if (pildoma && !zinomos.has(x.i) && !isspresta.has(x.i) && tarpai(R[x.i])){ geltona.add(x.i); return; }
      nuimkZymejima(P[x.i]);
    });
    (Z.pritaikomos_nuostatos || []).concat(Z.keiciamos_reiksmes || []).forEach(x => { if (!istrinti.has(x.i)) juodink(P[x.i]); });
    // nematomi likučiai: pastraipos ženklo spalva ir žymėjimas, tarpai raudonai (matomas raudonas tekstas - tik paliktose vietose)
    P.forEach((p, i) => {
      if (istrinti.has(i) || !p.parentNode || neisspresta.has(i) || di.has(i) || geltona.has(i)) return;
      const pPr = vaikas(p, 'pPr'), prr = pPr && vaikas(pPr, 'rPr');
      if (prr) vaikai(prr).forEach(c => { if (c.localName === 'color' || c.localName === 'highlight') prr.removeChild(c); });
      visi(p, 'r').filter(r => !virsSdt(r, p) && !tarpai(visi(r, 't').map(t => t.textContent).join(''))).forEach(r => { const k = vaikas(r, 'rPr'); if (k) vaikai(k).forEach(c => { if (c.localName === 'color' || c.localName === 'highlight') k.removeChild(c); }); });
    });

    // 8a. Kiti priedai: papildomos priedų sąrašo eilutės - eilutės klonai po jos (tas pats sąrašas ir formatas; numeruoja Word)
    for (const [is, k] of Object.entries(prieduEilutes)){
      let po = P[+is];
      if (!po.parentNode){ A.klaidos.push(`${k.x.vieta}: priedų sąrašo eilutė dingo - papildomi priedai neįrašyti`); continue; }
      for (const eil of k.eilutes){
        const np = klonas(P[+is]);
        const sect = vaikas(vaikas(np, 'pPr') || np, 'sectPr'); if (sect) sect.parentNode.removeChild(sect);
        if (!perrasyk(np, eil)){ A.klaidos.push(`${k.x.vieta}: priedų sąrašo eilutė be teksto - papildomi priedai neįrašyti`); break; }
        po.parentNode.insertBefore(np, po.nextSibling); po = np;
        A.pakeista.push({ raktas: k.x.raktas, vieta: k.x.vieta, ka: 'papildyta', tapo: eil });
      }
    }

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
      // rangos SS: „//“ nurodymai, „Turi būti pasirinkta:“ ir „(pasirenkama ...)“ - tik paliktose vietose
      if (/^\/\/|^Turi būti pasirinkta:$|\(pasirenkama /.test(t) && !neisspresta.has(i)) A.klaidos.push(`liko šablono nurodymas „${t.slice(0, 70)}“ (${vietaPagalI(Z, i)} p.)`);
      if (/\[pasirinkti vieną\]/i.test(t) && !neisspresta.has(i)) A.klaidos.push(`liko žyma „[pasirinkti vieną]“ (${vietaPagalI(Z, i)} p.)`);
      // darbų pirkimo-pardavimo SS: nurodymas rengėjui laužtiniuose skliaustuose („[skyrius pasirenkamas, kai ...]“) - tik paliktose vietose
      if (/^\[[^\[\]]*pasirenkam[^\[\]]*\]$/.test(t) && !neisspresta.has(i)) A.klaidos.push(`liko šablono nurodymas „${t.slice(0, 70)}“ (${vietaPagalI(Z, i)} p.)`);
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
    // 9a. Įdėtinė lentelė (rangos SS derinimo terminai): Pages jų nepalaiko - paverčia tekstu su tabuliacijomis; išvyniojama į išorinės
    //     lentelės eilutes. Tekstas ir jo tvarka dokumente nesikeičia (tikrinama).
    if (info.lenteles !== false){
      const seka = () => visi(d, 'p').map(p => tarpai(GPDocx.paraText(p))).filter(Boolean).join('\u0001');
      const iki = seka(), isvyniota = isvyniok(d, await GPDocx.part(doc, 'word/styles.xml'));
      if (isvyniota){ A.isvyniota = isvyniota; if (seka() !== iki) A.klaidos.push('įdėtinės lentelės išvyniojimas pakeitė tekstą ar jo tvarką'); }
    }
    const pries = tekstai();
    await GPDocx.part(doc, 'word/styles.xml'); await GPDocx.part(doc, 'word/numbering.xml');
    if (typeof GPLent !== 'undefined' && info.lenteles !== false) A.lenteles = GPLent.sutvarkyti(doc);
    if (tekstai() !== pries) A.klaidos.push('lentelių tvarkymas pakeitė tekstą');
    // 9b. Likęs geltonas žymėjimas (žemėlapio „zymejimas: pildoma“): tarpas po pastraipos - į tuščią tikslaus aukščio pastraipą (Pages)
    //     (pastraipos, kuriose žymėjimas liko: paliktos pildyti sudarant sutartį - tikrinama pagal patį dokumentą)
    if (pildoma && info.tarpai !== false){
      const n = tarpaiPoGeltonos(d, await GPDocx.part(doc, 'word/styles.xml'), [...new Set(Z.paryskinimai.map(x => x.i))].sort((a, b) => a - b).map(i => P[i]));
      if (n) A.tarpuPastraipos = n;
      if (tekstai() !== pries) A.klaidos.push('tarpo pastraipos pakeitė tekstą');
    }
    // DI požymiai (DI akto 50 str. 2 d.; shared/di-zymejimas.js): LT/EN sutarčių anglų tekstas suredaguotas naudojant DI rengiant šabloną
    if (info.di && info.di.length) await GPDocx.diPozymiai(doc, info.di);
    // 10a. Gulsčias priedas stačiame dokumente (rangos SS etapų priedas): Pages visam dokumentui taiko pirmojo skyriaus orientaciją -
    //      priedą rodo stačią ir jo lentelės antraštę nukerpa. Kaip pirkimo sąlygose (naudotojo sprendimas 2026-10-04) - atskiras failas
    //      (pirmas jo skyrius gulsčias); tekstas nekeičiamas. Pašalintam priedui (k: „salinti“) gulsčio skyriaus nebėra - nieko neatskiriama.
    let priedas = null;
    if (info.gulsti !== false && (Z.skyriai || []).length && !A.klaidos.length){
      priedas = await GPDocx.atskirkGulsciusPriedus(doc, { beAntrastes: true });
      if (priedas) A.atskirta = { skyriai: Z.skyriai.map(k => k.sritis), priedai: Z.skyriai.map(k => k.priedas) };
    }
    if (info.pasas !== false) await GPDocx.pasas(doc, { sablonas: info.sablonas || '', forma: info.forma || '', data: info.data || '', modulis: 'PP-salygos' });
    if (priedas && info.pasas !== false) await GPDocx.pasas(priedas.doc, { sablonas: (info.sablonas || '') + '_GULSTI', forma: info.forma || '', data: info.data || '', modulis: 'PP-salygos' });
    const blob = A.klaidos.length ? null : await GPDocx.save(doc, info.tipas || 'blob');
    const priedoBlob = priedas && !A.klaidos.length ? await GPDocx.save(priedas.doc, info.tipas || 'blob') : null;
    return { blob, ataskaita: A, priedas: priedoBlob };
  }

  return { versija: 'S7-2026-10-13', vietos: viesos, generuok, _keisk: keisk, _pTekstas: pTekstas, _isvyniok: isvyniok, _vidinioDalys: vidinioDalys, _tarpaiPoGeltonos: tarpaiPoGeltonos, _tarpasPo: tarpasPo };
})();
if (typeof window !== 'undefined') window.GP_SUTARCIU_GEN = GP_SUTARCIU_GEN;
