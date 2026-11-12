/* ============================================================================
 * G-Procure Tiekėjams  klausimai.js
 * ----------------------------------------------------------------------------
 * Klausimai pagal KONKRETŲ pirkimą (window.GP_KLAUSIMAI, nuo 2026-11-03): perskaičius
 * pirkimo dokumentus, bendro sąrašo vietoje siūloma tai, kas būtent šiame pirkime
 * svarbu, ir parodoma, kodėl. Viskas skaičiuojama naršyklėje, be DI, niekas nesiunčiama.
 *
 * Išmatuota su 27 tikrais CVP IS paketais: užtikrinimo, kvalifikacijos, derybų žodžiai
 * yra BEVEIK VISUOSE dokumentuose (bendrosios sąlygos ir šablonai: „jei taikoma“), tad
 * vien žodžio buvimas nieko nereiškia. Todėl ieškoma SPRENDIMO sakinio: „nereikalaujama
 * pateikti“ - fakto (į tą klausimą dokumentai jau atsako ir DI nereikia), „bus vykdoma
 * apžiūra ... iki 2026 m. rugsėjo 2 d.“ - klausimo su ta data.
 *
 * Taisyklės:
 *  - Kiekvienas klausimas ir faktas turi šaltinį (dokumentas, vieta, citata pažodžiui).
 *  - Klausimas nieko neteigia, ko dokumentas nesako; neaišku - klausiama neutraliai.
 *  - Sąlyginis sakinys („Jei ...“) - ne sprendimas. Faktas nerodomas, jei tą temą
 *    mini atsakymų raštas ar paaiškinimas (jis gali sąlygas pakeisti).
 *  - Tekstas iš dokumentų į HTML - tik per modulio esc().
 *
 * Grynos funkcijos: siulyk({ docs, meta, kalba, dabar }) -> { klausimai, faktai, datos, vietos } (datos - laiko juostai: objekto apžiūra;
 * vietos.kvalifikacija - kvalifikacijos reikalavimų lentelės fragmentai laisviems klausimams, nuo 2026-11-10);
 * kontrolinis({ docs, meta, kalba, dabar, kelietapis }) -> punktai, į kuriuos dokumentai aiškiai atsako (be DI);
 * terminas({ docs, pirkimas, galutinis, parse, kelietapis, dabar }) - iki kada pateikti klausimą.
 * Vieta dokumente - shared/dokumentai.js fragmentai (d.chunks), jų ID paduodami į paiešką,
 * kad DI gautų tą vietą, dėl kurios klausimas pasiūlytas.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var DIAK = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
  // Ženklas į ženklą (ne String.toLowerCase visam tekstui: pozicijos turi sutapti su originalu)
  function fold(s) {
    return String(s == null ? "" : s).replace(/[\s\S]/g, function (c) {
      var m = c.toLowerCase();
      if (m.length !== 1) return c;
      return DIAK[m] || m;
    });
  }
  function L(lt, en) { return { lt: lt, en: en }; }
  var FOLD = typeof WeakMap === "function" ? new WeakMap() : null;
  function foldF(ch) {
    if (!FOLD) return fold(ch.text);
    var v = FOLD.get(ch);
    if (v == null) { v = fold(ch.text); FOLD.set(ch, v); }
    return v;
  }

  /* ---------------- Dokumentų grupės ---------------- */
  function vardas(d) { return String(d.name || "").split(" › ").pop(); }
  function svarusVardas(d) {
    var v = vardas(d).replace(/^.*\//, "").replace(/\.[a-z0-9]{2,5}$/i, "");
    v = v.split(/[\s_]+(?:Annex|Appendix|Form of|Price|Tender|Initial|Final|Application)(?![A-Za-z])/)[0];    // dvikalbis vardas - lietuviška dalis
    // Numeriai ir „SPS 1 priedo 1 priedas“ žmogui nieko nesako - lieka tai, kas tai per dokumentas
    v = v.replace(/_+/g, " ").replace(/^\s*\d+(?:\.\d+)*\.?\s*/, "").replace(/^(?:SPS\s*|SS\s*)?(?:\d+(?:\.\d+)*\.?\s*)?(?:priedo\s*\d+(?:\.\d+)*\.?\s*)?(?:priedas\.?\s*)?/i, "");
    return v.replace(/\s+/g, " ").replace(/^[\s\-–]+/, "").trim();
  }
  function turiTeksta(d) { return !!(d && d.chunks && d.chunks.length); }
  // SPS failų vardai dažnai turi „SPS N priedas“ - tai priedai, ne pačios sąlygos
  function arPriedas(v) { return /\b\d+(?:\.\d+)?\.?\s*(?:priedas|priedo|priede)\b|\bpriedas\b|\bannex\b|\bpriedo\b/.test(v); }
  function grupes(docs) {
    var g = { sps: [], salygos: [], bps: [], sutartis: [], paaiskinimai: [], rk: [], formos: [], ts: [], ebvpd: [], kita: [], sutartisSS: [] };
    (docs || []).forEach(function (d) {
      if (!turiTeksta(d)) return;
      var v = fold(vardas(d)), r = d.rusis;
      if (/rinkos konsultacij|market consult|\brk klausim/.test(v)) { g.rk.push(d); return; }
      if (r === "Paaiškinimas") { g.paaiskinimai.push(d); return; }
      if (r === "EBVPD") { g.ebvpd.push(d); return; }
      if (r === "TS") { g.ts.push(d); return; }
      if (r === "Sutartis") { g.sutartis.push(d); if (!/bendros|\bbs\b/.test(v)) g.sutartisSS.push(d); return; }
      if (r === "BPS") { g.bps.push(d); return; }
      if (r === "SPS" && !arPriedas(v)) { g.sps.push(d); return; }
      if (r === "Forma" || r === "Priedas" || r === "SPS") { g.formos.push(d); return; }
      // Kitų pirkimo vykdytojų sąlygos vienu failu („Pirkimo sąlygos“, „AK sąlygos“, „Pirkimo dokumentai“)
      if (r === "Kita" && /salyg|konkurs|kvietim|pirkimo dokument|apklaus/.test(v)) { g.salygos.push(d); return; }
      if (r !== "Skelbimas") g.kita.push(d);
    });
    // Sprendimų sakiniai: pirmiausia specialiosios sąlygos, tada vieno failo sąlygos.
    // Bendrųjų sąlygų (BPS) čia nėra: jose beveik viskas sąlygiška ir šabloniška.
    g.sprendimai = g.sps.concat(g.salygos);
    if (!g.sprendimai.length) g.sprendimai = g.kita.filter(function (d) { return d.chunks.length >= 10; });
    return g;
  }

  /* ---------------- Paieška fragmentuose ---------------- */
  function sakinys(tekstas, i, j) {
    var pr = i;
    while (pr > 0 && i - pr < 200) {
      var c = tekstas[pr - 1];
      if (c === "\n" || c === "|" || (/[.;:]/.test(c) && /\s/.test(tekstas[pr] || " ") && !/\d/.test(tekstas[pr - 2] || "") && !/\b(?:nr|str|pvz|val|d|m|t|y|proc|kt|tel|ir kt)$/i.test(tekstas.slice(Math.max(0, pr - 7), pr - 1)))) break;
      pr--;
    }
    var pb = j;
    while (pb < tekstas.length && pb - j < 200) {
      var e = tekstas[pb];
      if (e === "\n" || e === "|") break;
      if (/[.;]/.test(e) && /\s/.test(tekstas[pb + 1] || " ") && !/\d/.test(tekstas[pb - 1] || "") && !/\b(?:nr|str|pvz|val|d|m|t|y|proc|kt|tel)$/i.test(tekstas.slice(Math.max(0, pb - 5), pb))) { pb++; break; }
      pb++;
    }
    return { pradzia: pr, pabaiga: pb };
  }
  // Sąlyginis ar apibendrinantis sakinys nėra šio pirkimo sprendimas
  var SALYGA = /(^|[^a-z])(jei|jeigu|kai|if|when|where|tais atvejais|tuo atveju|tuomet|nebent)([^a-z]|$)/;
  function salyginis(fSakinys) { return SALYGA.test(fSakinys); }
  function normTarpai(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function kiekDaug(s) { return s.length > 240 ? s.slice(0, 237).replace(/\s+\S*$/, "") + "..." : s; }

  // Grąžina pirmą atitikimą dokumentuose pagal jų eilę: { d, ch, m, tekstas, citata, salyga }.
  // o.turi - sakinyje turi būti ir tai (pvz. CVP IS); tada tikrinami visi atitikimai fragmente, ne tik pirmas (2026-11-10, pilotas su tikru pirkimu:
  // „su Pasiūlymu reikia pateikti SPS 5 priedo 2 priedėlį“ buvo laikoma pateikimo per CVP IS citata)
  function rask(docs, re, o) {
    o = o || {};
    var rg = o.turi ? new RegExp(re.source, re.flags.indexOf("g") < 0 ? re.flags + "g" : re.flags) : re;
    for (var a = 0; a < docs.length; a++) {
      var d = docs[a];
      for (var b = 0; b < d.chunks.length; b++) {
        var ch = d.chunks[b], f = foldF(ch), m;
        rg.lastIndex = 0;
        while ((m = rg.exec(f))) {
          var r = atitikimas(d, ch, f, m, o);
          if (r) return r;
          if (!o.turi) break;
          if (rg.lastIndex === m.index) rg.lastIndex++;
        }
      }
    }
    return null;
  }
  function atitikimas(d, ch, f, m, o) {
    var s = sakinys(f, m.index, m.index + m[0].length), fs = f.slice(s.pradzia, s.pabaiga);
    if (!o.ir_salyga && salyginis(f.slice(s.pradzia, m.index))) return null;
    if (o.ne && o.ne.test(fs)) return null;
    if (o.turi && !o.turi.test(fs)) return null;
    if (/\.{4,}|…{2,}/.test(fs)) return null;     // turinio eilutė („8. PARAIŠKŲ PATEIKIMO TERMINAI ......“)
    var cit = normTarpai(ch.text.slice(s.pradzia, s.pabaiga));
    if (cit.length < 30) cit = normTarpai(ch.text.slice(Math.max(0, s.pradzia - 60), s.pabaiga + 100));   // „netesybos.“ žmogui nieko nepasako
    return { d: d, ch: ch, m: m, f: f, citata: kiekDaug(cit), fs: fs, orig: function (gr) { var i = f.indexOf(m[gr], m.index); return ch.text.substr(i, m[gr].length); } };
  }
  function kodel(r) { return { docId: r.d.id, name: vardas(r.d), loc: r.ch.loc, citata: r.citata }; }
  // Santraukos ištrauka iš dokumento paimta per kelis ženklus prieš reikšmę - dažnai nuo žodžio vidurio
  function metaKodel(x, docs) {
    var d = (docs || []).filter(function (a) { return a.id === x.docId; })[0] || {};
    var c = normTarpai(x.snippet || "");
    if (/^[„“"]?[a-ząčęėįšųūž]/.test(c)) c = c.replace(/^\S*\s+/, "");
    // Ištrauka prasidėjo kabučių viduryje („terminą“, pasiūlymų ...) - nuo to, kas po jų
    c = c.replace(/^[^„“]{1,40}“[,;:]?\s+/, "");
    // Po sakinio prilipusi parašo eilutė („... 15:00 val. Vardas Pavardė“) - ne citatos dalis
    var parasas = /^(.*[.!?])\s+(?:\p{Lu}[\p{L}-]+\s*){2,4}$/u.exec(c);
    if (parasas) c = parasas[1];
    return { docId: x.docId, name: vardas(d), loc: x.loc, citata: kiekDaug(c) };
  }

  // Specialiųjų sąlygų lentelės eilutė „5.6. Avansas | Netaikoma“: { ne, taip, turinys }.
  // Dvikalbėje lentelėje antraštės eilutė („5.6. Avansas | 5.6. Advance Payment“) turinio neturi.
  var NETAIKOMA = /^\s*(netaikoma|netaikomas|nera|punktas netaikomas|not applicable|n\/a)\b/;
  function eilute(docs, pav) {
    var re = new RegExp("(?:^|\\n|\\|\\s*)\\s*(\\d+(?:\\.\\d+)*\\.?)\\s*" + pav + "[^|\\n]{0,70}\\|\\s*([^|\\n]*)", "g"), rez = { ne: null, taip: null };
    docs.forEach(function (d) {
      d.chunks.forEach(function (ch) {
        var f = foldF(ch), m;
        re.lastIndex = 0;
        while ((m = re.exec(f))) {
          var cele = m[2].trim(), pabaiga = m.index + m[0].length, turinys = cele;
          var antraste = cele.indexOf(m[1]) === 0 && cele.length < 70;
          if (antraste) turinys = f.slice(pabaiga).replace(/^[\s|]+/, "").slice(0, 200);
          var pr = m.index + m[0].indexOf(m[1]);
          var r = { d: d, ch: ch, turinys: turinys, citata: kiekDaug(normTarpai(ch.text.slice(pr, antraste ? pabaiga + 60 : pabaiga))) };
          if (NETAIKOMA.test(turinys)) rez.ne = rez.ne || r;
          else if (!antraste && turinys.length >= 3) rez.taip = rez.taip || r;
        }
      });
    });
    return rez;
  }

  /* ---------------- Datos ---------------- */
  var MEN = { sausio: 0, vasario: 1, kovo: 2, balandzio: 3, geguzes: 4, birzelio: 5, liepos: 6, rugpjucio: 7, rugsejo: 8, spalio: 9, lapkricio: 10, gruodzio: 11 };
  function dataLt(f) {
    var m = /(20\d\d) m\. ([a-z]+) (\d{1,2}) d\./.exec(f);
    if (m && MEN[m[2]] != null) return new Date(+m[1], MEN[m[2]], +m[3], 23, 59);
    m = /(20\d\d)-(\d\d)-(\d\d)/.exec(f);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 23, 59);
    return null;
  }
  function metaData(v) {
    var m = /(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/.exec(String(v || ""));
    return m ? { d: new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 23), +(m[5] || 59)), t: m[3] + "-" + m[2] + "-" + m[1] + (m[4] ? " " + m[4] + ":" + m[5] : "") } : null;
  }
  /* CVP IS pasiūlymų terminas (2026-11-12, antras pilotas: kontrolinis sąrašas terminą ėmė iš pratęsimo rašto, nors apžvalga ir CVP IS rodė
     vėlesnį pratęstą). Kai yra CVP IS duomenys (o.pirkimas), terminas kontroliniame sąraše ir klausimuose - kaip apžvalgoje, o kitoks
     dokumentų terminas - pastaba. Dinaminė ar kvalifikacijos sistema (terminas - sistemos pabaiga) ir rinkos konsultacija - ne. */
  function cvpTerminas(o, kalba) {
    var p = o && o.pirkimas;
    if (!p || typeof p.tenderSubmissionDeadline !== "string") return null;
    if (global.GP_VPT && (global.GP_VPT.sistema(p) || global.GP_VPT.rinkosKonsultacija(p))) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(p.tenderSubmissionDeadline);
    if (!m) return null;
    var d = typeof o.parse === "function" ? o.parse(p.tenderSubmissionDeadline) : null;
    if (!d) d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    var t = m[1] + "-" + m[2] + "-" + m[3] + " " + m[4] + ":" + m[5];
    return { d: d, t: t, p: p, kodel: { docId: null, name: kalba === "en" ? "CVP IS data" : "CVP IS duomenys", loc: null, citata: (kalba === "en" ? "Tender submission deadline: " : "Pasiūlymų pateikimo terminas: ") + t } };
  }
  // Dokumentų terminai („07/10/2026 10:00“), kurie nesutampa su CVP IS terminu („2026-10-13 10:00“); be laiko - lyginama data
  function kitiTerminai(dl, cvpT) {
    if (!dl || !dl.value || !cvpT) return [];
    var vals = [dl.value].concat(!dl.pratestas && dl.alt ? dl.alt.map(function (a) { return a.value; }) : []), out = [];
    vals.forEach(function (v) {
      var x = metaData(v), t = x ? x.t : String(v);
      var sut = t === cvpT.t || (t.length === 10 && cvpT.t.indexOf(t) === 0);
      if (!sut && out.indexOf(t) < 0) out.push(t);
    });
    return out;
  }

  /* ---------------- Sprendimų sakiniai: ir klausimams, ir kontroliniam sąrašui ---------------- */
  var UZT_TEMA = /galiojimo uztikrinim|pasiulymo uztikrinim|tender security|bid security/;
  // Pasiūlymo galiojimo užtikrinimas. „neprivalo pateikti“ - ne „privalo pateikti“: teigime - žodžio riba (2026-11-04, tiekėjo patikra)
  var RE_UZT_NE = /nereikalaujama (pateikti )?pasiulymo (galiojimo )?uztikrinimo|neprivalo pateikti[^.|]{0,90}pasiulymo (galiojimo )?uztikrinim|pasiulymo (galiojimo )?uztikrinimas (yra )?(nereikalaujamas|netaikomas|nenumatytas)|tender security is not required/;
  var RE_UZT_TAIP = /(?:^|[^a-z])(privalo|turi|reikia) pateikti[^.|]{0,90}pasiulymo (galiojimo )?uztikrinim|pasiulymo (galiojimo )?uztikrinim\w*[^.|]{0,40}(suma|dydis)[^.|]{0,40}\d/;
  var RE_SUMA_EUR = /(\d[\d \u00a0]*(?:[.,]\d+)?)\s*(eur|€)/;      // tarp skaitmenų - ir jungiamasis tarpas („10 000 Eur“)
  var RE_KVAL_NE = /kvalifikacija nera tikrinama|kvalifikacijos reikalavimai nenustatomi|kvalifikacijos reikalavimu nera/;
  var RE_KAINOS = /ikainiu lentel|kain\w* (detalizavimo )?(lentel|form)|kiekiu (sarasas|lentel|ziniarast)|sanaud\w* (lentel|form)|price (table|form|schedule)/;
  var RE_CVP_TEIKTI = /(pasiulym\w*|paraisk\w*)[^.|\n]{0,40}(reikia pateikti|turi buti pateik\w*|gali teikti)[^.|\n]{0,80}(cvp is|elektronin\w+ priemon)|(pasiulym\w*|paraisk\w*) (reikia pateikti|gali teikti)/;
  var RE_CVP_MINI = /(pasiulym\w*|paraisk\w*)[^.|\n]{0,80}(teikiam\w*|pateikiam\w*|pateikt\w*|teikt\w*)[^.|\n]{0,80}(cvp is|elektronin\w+ priemon)|(cvp is|elektronin\w+ priemon)[^.|\n]{0,60}(pateikiam\w*|teikiam\w*|pateikt\w*)[^.|\n]{0,40}(pasiulym|paraisk)/;
  // Pateikimo kanalas turi būti tame pačiame sakinyje: „su Pasiūlymu reikia pateikti ...“ - kas pateikiama, ne kaip (2026-11-10)
  var RE_CVP_KANALAS = /cvp is|elektronin\w+ priemon/;
  var RE_GALIOJA = /pasiulymas (?:turi )?galio(?:ja|ti) (?:ne trumpiau kaip )?(\d+\s*(?:\([^)]{1,30}\)\s*)?(?:kalendorin\w+ dien\w*|darbo dien\w*|dien\w*|menes\w*|men\b)[^.|\n]{0,80})/;
  var RE_EBVPD_TAIP = /(pateikiam\w*|pateikia|privalo pateikti|turi pateikti|turi buti pateikt\w*)[^.|\n]{0,70}(ebvpd|europos bendraj\w+ viesuj\w+ pirkimu dokument)|(ebvpd|europos bendraj\w+ viesuj\w+ pirkimu dokument\w*)[^.|\n]{0,50}(privalo|turi buti|pateikiam)/;
  var RE_PARASAS = /(?:^|[^a-z])(pasirasyt\w*|pasirasom\w*)[^.|\n]{0,80}(elektronin\w+ paras\w*|e-paras\w*)|(elektronin\w+ paras\w*)[^.|\n]{0,80}[^a-z](pasirasyt\w*|privalo|turi buti)/;

  /* ---------------- Faktų ir klausimų surinkimas ---------------- */
  function siulyk(o) {
    o = o || {};
    var kalba = o.kalba === "en" ? "en" : "lt", dabar = o.dabar || new Date(), meta = o.meta || {};
    var g = grupes(o.docs), Q = [], F = [], DATOS = [], seni = Object.create(null);
    function T(x) { return x[kalba]; }
    function q(id, p, tekstas, r, fragmentai) {
      if (seni[id]) return; seni[id] = 1;
      var fr = (fragmentai || []).slice();
      if (r && r.ch && fr.indexOf(r.ch.id) < 0) fr.unshift(r.ch.id);
      Q.push({ id: id, p: p, q: T(tekstas), kodel: r ? (r.d ? kodel(r) : r) : null, fragmentai: fr });
    }
    // Atsakymų raštas apie tą temą gali sąlygą pakeisti - tada faktas virsta neutraliu klausimu
    function paaiskinimeMini(re) { return g.paaiskinimai.some(function (d) { return d.chunks.some(function (c) { return re.test(foldF(c)); }); }); }
    function faktas(id, klausimas, atsakymas, r, tema, neutralus, p) {
      if (paaiskinimeMini(tema)) { q(id, p, neutralus, r); return; }
      F.push({ id: id, q: T(klausimas), atsakymas: T(atsakymas), kodel: kodel(r), fragmentai: [r.ch.id] });
    }
    var NE = L("Ne.", "No.");

    /* Rinkos konsultacija - ne pirkimas: pasiūlymas neteikiamas, tiekėjas atsako į klausimus */
    if (/market consultation/i.test(String(o.procedura || ""))) {
      var rkDok = g.rk.concat(g.sprendimai, g.formos, g.kita, g.paaiskinimai, g.ts)[0];
      var rkKod = rkDok ? dokSaltinis(rkDok) : null, rkFr = rkDok ? rkDok.chunks.slice(0, 3).map(function (c) { return c.id; }) : [];
      q("rk-klausimai", 1, L("Ko pirkimo vykdytojas klausia šioje rinkos konsultacijoje?", "What does the buyer ask in this market consultation?"), rkKod, rkFr);
      q("rk-kaip", 2, L("Kaip ir iki kada atsakyti į rinkos konsultacijos klausimus?", "How and by when do I answer the market consultation questions?"), rkKod, rkFr);
      q("rk-naudojimas", 3, L("Ar mano atsakymai bus konfidencialūs ir kaip jie bus naudojami?", "Will my answers be confidential and how will they be used?"), rkKod, rkFr);
      q("rk-dalyvavimas", 4, L("Ar dalyvavimas konsultacijoje paveiks galimybę dalyvauti būsimame pirkime?", "Does taking part in the consultation affect my chances in the future procurement?"), rkKod, rkFr);
      return { klausimai: Q, faktai: F, datos: DATOS };
    }

    /* --- Būsena: atsakymai, pratęsimas, skirtingos reikšmės --- */
    if (g.paaiskinimai.length) {
      var frP = [];
      g.paaiskinimai.forEach(function (d) { d.chunks.slice(0, 2).forEach(function (c) { if (frP.length < 8) frP.push(c.id); }); });
      var pirmas = g.paaiskinimai[g.paaiskinimai.length - 1];
      q("paaiskinimai", 10, L("Ką pirkimo vykdytojas jau paaiškino ir atsakė tiekėjams?", "What has the buyer already clarified and answered to suppliers?"),
        { docId: pirmas.id, name: vardas(pirmas), loc: pirmas.chunks[0].loc, citata: kiekDaug(normTarpai(pirmas.chunks[0].text)), kiek: g.paaiskinimai.length }, frP);
    }
    var dl = meta.deadline, cvpT = cvpTerminas(o, kalba);
    if (dl && dl.pratestas && dl.alt && dl.alt.length) {
      // Data - kaip apžvalgoje: CVP IS terminas, kai jis yra (vėlesnis pratęsimas pakete gali nebūti)
      var md = metaData(dl.value), tt = cvpT ? cvpT.t : md ? md.t : null;
      q("pratesimas", 11, tt ? L("Kodėl terminas pratęstas iki " + tt + " ir ar pakeistos kitos sąlygos?", "Why was the deadline extended to " + tt + " and did other conditions change?")
                             : L("Kodėl terminas pratęstas ir ar pakeistos kitos sąlygos?", "Why was the deadline extended and did other conditions change?"),
        metaKodel(dl, o.docs));
    }
    var SKIRTINGI = { duration: L("sutarties trukmė", "contract duration"), value: L("numatoma vertė", "estimated value"), validity: L("pasiūlymo galiojimas", "bid validity") };
    Object.keys(SKIRTINGI).forEach(function (k) {
      var x = meta[k]; if (!x || !x.alt || !x.alt.length || x.pratestas) return;
      var vals = [x.value].concat(x.alt.map(function (a) { return a.value; })).slice(0, 3).join(kalba === "en" ? " and " : " ir ");
      var pav = T(SKIRTINGI[k]);
      q("skirtinga-" + k, 12, L("Dokumentuose skiriasi " + pav + " (" + vals + ") - kuri reikšmė galioja?", "The documents give a different " + pav + " (" + vals + ") - which one applies?"),
        metaKodel(x, o.docs));
    });

    /* --- Pirkimo eiga --- */
    var deryboDok = g.sprendimai;
    // „derybos nebus vykdomos dėl:“ ir „dėl kurių nebus deramasi“ - derybų objekto apribojimas, ne „derybų nebus“;
    // „nebus vykdomos derybos“ - ne „bus“. Kai pats pirkimo būdas yra derybos, faktas „Ne“ nerodomas (2026-11-04, tiekėjo patikra).
    var derBudas = /deryb|negotiat/i.test(String(o.procedura || "") + " " + String((meta.procedure && meta.procedure.value) || ""));
    var derNe = rask(deryboDok, /derybos nebus vykdomos|nebus vykdomos derybos|derybos nevykdomos|derybos nevyks|nebus deramasi|pirkimas vykdomas be derybu/, { ne: /nebus vykdomos del|del kuriu|nebus deramasi del/ });
    var derTaip = rask(deryboDok, /(?:^|[^a-z])bus vykdomos derybos|derybos bus vykdomos|negotiations will take place/);
    if (derNe && derBudas && !derTaip) q("derybos", 20, L("Dėl ko bus deramasi ir kaip vyks derybos?", "What will be negotiated and how will the negotiations run?"), derNe);
    else if (derTaip) q("derybos", 20, L("Dėl ko bus deramasi ir kaip vyks derybos?", "What will be negotiated and how will the negotiations run?"), derTaip);
    else if (derNe) faktas("derybos", L("Ar bus derybos?", "Will there be negotiations?"), NE, derNe, /deryb/, L("Ar šiame pirkime bus derybos?", "Will there be negotiations in this procurement?"), 20);

    // Ar teikiama paraiška, ar iškart pasiūlymas. Skelbimo laukas to nepasako: eForms „Dalyvavimo prašymų
    // terminas“ matytas ir pirkimuose be paraiškų (9 iš 21) - sako sąlygų žodžiai ir formos pavadinimas.
    function kiek(docs, re) { var n = 0; docs.forEach(function (d) { d.chunks.forEach(function (ch) { var m = (foldF(ch)).match(re); if (m) n += m.length; }); }); return n; }
    var paraiskosForma = g.formos.concat(g.sps).filter(function (d) { return /paraiskos form|application form/.test(fold(vardas(d))); })[0];
    var rDok1 = rask(g.sprendimai, /privalo pateikti\s+(paraisk|pirmin\w+ pasiulym|pasiulym)/);
    var kaTeikia = rDok1 ? rDok1.m[1].slice(0, 4) : "";       // sąlygų sakinys „Tiekėjai privalo pateikti ...“ - tiksliausias
    var paraiska = kaTeikia === "para" || (!kaTeikia && (!!paraiskosForma || kiek(g.sprendimai, /paraisk/g) >= 10));
    var pirminis = kaTeikia === "pirm" || (!kaTeikia && !paraiska && !derNe && kiek(g.sprendimai, /pirmin\w+ pasiulym/g) >= 10);
    // Būdas žinomas iš CVP IS - nespėjame iš bendros nuostatos apie dinaminę pirkimo sistemą
    var dps = rask(g.sprendimai.concat(g.formos, g.kita), /dinamin\w+ pirkimo sistem/);
    if (dps && !meta.procedure && (!o.procedura || /dynamic purchasing/i.test(o.procedura))) q("dps", 21, L("Kaip prisijungti prie dinaminės pirkimo sistemos ir kada kviečiama teikti pasiūlymą?", "How do I join the dynamic purchasing system and when am I invited to bid?"), dps);
    else if (paraiska) {
      var rPar = rask(g.sprendimai, /privalo pateikti paraisk|paraisk\w* pateikimo termin|paraisk\w+ form/, { ir_salyga: true });
      if (rPar) q("etapai", 21, L("Kas vyksta po paraiškų pateikimo ir kada reikės teikti pasiūlymą?", "What happens after applications are submitted and when must a bid be submitted?"), rPar);
    }
    var dalys = meta.lots && parseInt(meta.lots.value, 10);
    if (dalys > 1) q("dalys", 22, L("Ar galima teikti pasiūlymą tik kai kurioms iš " + dalys + " pirkimo dalių?", "Can I bid for only some of the " + dalys + " lots?"),
      metaKodel(meta.lots, o.docs));

    /* --- Ką pateikti --- */
    var terminas = paraiska ? L("su paraiška", "with the application") : pirminis ? L("su pirminiu pasiūlymu", "with the initial bid") : L("su pasiūlymu", "with the bid");
    var rDok = rDok1 || rask(g.sprendimai, /tiekejai privalo pateikti|su (pirminiu )?pasiulymu (kartu )?(pateikiam|teikiam|turi buti pateik)|su paraiska pateikiam/) || rask(g.sprendimai, /kartu su pasiulymu|pasiulymo dokument|tiekejas turi pateikti/, { ir_salyga: true });
    if (rDok) q("dokumentai", 23, L("Kokius dokumentus turiu pateikti " + terminas.lt + "?", "Which documents must I submit " + terminas.en + "?"), rDok);

    /* --- Pasiūlymo galiojimo užtikrinimas --- */
    var uztNe = rask(g.sprendimai, RE_UZT_NE);
    var uztTaip = rask(g.sprendimai, RE_UZT_TAIP);
    if (uztNe && !uztTaip) faktas("uztikrinimas", L("Ar reikia pasiūlymo galiojimo užtikrinimo?", "Is bid security required?"), NE, uztNe, UZT_TEMA, L("Ar šiame pirkime reikia pasiūlymo galiojimo užtikrinimo?", "Is bid security required in this procurement?"), 30);
    else if (uztTaip) {
      var suma = RE_SUMA_EUR.exec(uztTaip.fs);
      q("uztikrinimas", 30, suma ? L("Kaip ir kada pateikti " + normTarpai(suma[1]) + " Eur pasiūlymo galiojimo užtikrinimą?", "How and when must the EUR " + normTarpai(suma[1]) + " bid security be submitted?")
                                 : L("Kokio dydžio pasiūlymo galiojimo užtikrinimo reikia ir kaip jį pateikti?", "What amount of bid security is required and how is it submitted?"), uztTaip);
    } else {
      var uztAntr = rask(g.sprendimai, /pasiulym\w+ galiojimo uztikrinimas/);
      if (uztAntr) q("uztikrinimas", 45, L("Ar šiame pirkime reikia pasiūlymo galiojimo užtikrinimo?", "Is bid security required in this procurement?"), uztAntr);
    }

    /* --- Objekto apžiūra --- */
    var apzNe = rask(g.sprendimai, /nebus vykdoma apziura|apziura nebus vykdoma|nerengs pirkimo objekto apziuros|apziura nerengiama|apziura nenumatyta/, { ne: /taciau|gali inicij/ });
    var apzTaip = rask(g.sprendimai, /bus vykdoma apziura|bus rengiama apziura|norintys apziureti|apziura vyks/);
    if (apzTaip) {
      // Data - kitame sakinyje („... bus vykdoma apžiūra. Tiekėjai, norintys apžiūrėti ..., turi iki 2026 m. ...“)
      var poApz = apzTaip.f.slice(apzTaip.m.index, apzTaip.m.index + 260), mD = /20\d\d\s+m\.\s+[a-z]+\s+\d{1,2}\s+d\.|20\d\d-\d\d-\d\d/.exec(poApz);
      var apzD = mD ? dataLt(normTarpai(mD[0])) : null;
      // Laiko juostai (2026-11-06): sąlygose nurodyta apžiūros data su citata - ir praėjusi (juostoje ji pažymima praėjusia)
      if (apzD) DATOS.push({ id: "apziura", date: apzD, tekstas: normTarpai(apzTaip.ch.text.substr(apzTaip.m.index + mD.index, mD[0].length)),
        kodel: { docId: apzTaip.d.id, name: vardas(apzTaip.d), loc: apzTaip.ch.loc, citata: kiekDaug(normTarpai(apzTaip.ch.text.substr(apzTaip.m.index, mD.index + mD[0].length + 12))) } });
      if (!apzD || apzD >= dabar) {
        var dTekstas = mD ? normTarpai(apzTaip.ch.text.substr(apzTaip.m.index + mD.index, mD[0].length)) : "";
        if (mD) apzTaip.citata = kiekDaug(normTarpai(apzTaip.ch.text.substr(apzTaip.m.index, mD.index + mD[0].length + 12)));
        q("apziura", 31, dTekstas ? L("Kaip užsiregistruoti objekto apžiūrai (iki " + dTekstas + ")?", "How do I register for the site visit (by " + dTekstas + ")?")
                                  : L("Kada ir kaip vyks objekto apžiūra?", "When and how will the site visit take place?"), apzTaip);
      }
    } else if (apzNe) faktas("apziura", L("Ar bus objekto apžiūra?", "Will there be a site visit?"), NE, apzNe, /apziur/, L("Ar bus objekto apžiūra?", "Will there be a site visit?"), 31);

    /* --- Kvalifikacija --- */
    var roles = 0, kvalNe = rask(g.sprendimai, RE_KVAL_NE);
    if (kvalNe) {
      faktas("kvalifikacija", L("Ar tikrinama tiekėjų kvalifikacija?", "Is supplier qualification checked?"), NE, kvalNe, /kvalifikacij/, L("Ar šiame pirkime tikrinama tiekėjų kvalifikacija?", "Is supplier qualification checked in this procurement?"), 32);
      var pasal = rask(g.sprendimai, /pasalinimo pagrind/);
      if (pasal) q("pasalinimas", 33, L("Kokie pašalinimo pagrindai tikrinami ir kokiais dokumentais juos patvirtinti?", "Which exclusion grounds are checked and which documents confirm them?"), pasal);
    } else {
      // Konkretūs reikalavimai: „Tiekėjas turi turėti <ko>“ - tie patys žodžiai galininku tinka klausimui
      roles = 0; var RE_ROLE = /tiekejas turi tureti (?:bent |ne maziau kaip )?(?:\d+ (?:\([a-z]+\) )?)?([^,.;:(|]{6,90}?)(?=,| kuris| kuri | ir turi | atitink| per paskut|\(|;|\.|:|\||$)/g, atm;
      g.sprendimai.some(function (d) {
        return d.chunks.some(function (ch) {
          var f = foldF(ch);
          RE_ROLE.lastIndex = 0;
          while ((atm = RE_ROLE.exec(f))) {
            var i = atm.index + atm[0].length - atm[1].length;
            var kas = normTarpai(ch.text.substr(i, atm[1].length));
            var s = sakinys(f, atm.index, atm.index + atm[0].length);
            var r = { d: d, ch: ch, citata: kiekDaug(normTarpai(ch.text.slice(s.pradzia, s.pabaiga))) };
            if (/(?:šiuos|šias|šiuos darbus|šias teises)$/i.test(kas) || /^teisę atlikti/i.test(kas)) { q("teises", 34, L("Kokias teises ar atestatus turi turėti tiekėjas ir kaip tai įrodyti?", "Which rights or certificates must the supplier hold and how are they proven?"), r); continue; }
            if (kas.length > 70 || /pakankam|zmogiskuos/.test(fold(kas))) continue;
            q("reikalavimas-" + fold(kas).slice(0, 30), 34, L("Kaip įrodyti reikalavimą turėti " + kas + "?", "How do I prove the requirement “" + kas + "”?"), r);
            if (++roles >= 2) return true;
          }
          return false;
        });
      });
      var patirtis = rask(g.sprendimai, /per paskutini\w+ (\d+)\*? ?(?:\([a-z]+\) )?met\w+[^.|]{0,120}(?:tiekej|sutar|ivykd|savo jegomis)|tiekejas per paskutini\w+ (\d+)\*? ?(?:\([a-z]+\) )?met/, { ne: /vidaus sandor|nebuvo sudari/ });
      if (patirtis) {
        var mt = patirtis.m[1] || patirtis.m[2];
        q("patirtis", 35, L("Kokią patirtį per paskutinius " + mt + " m. turi įrodyti tiekėjas ir kokiais dokumentais?", "What experience over the last " + mt + " years must the supplier prove, and with which documents?"), patirtis);
      }
      var fin = rask(g.sprendimai, /metin\w+ [^.|]{0,40}(pajam|apyvart)[^.|]{0,80}\d|(pajam|apyvart)\w*[^.|]{0,60}ne mazes\w+ kaip[^.|]{0,20}\d/);
      if (fin) q("finansai", 36, L("Kokių pajamų ar apyvartos reikalaujama ir kokiais dokumentais tai įrodyti?", "What income or turnover is required and which documents prove it?"), fin);
    }

    /* --- Standartai sąlygose --- */
    // Tik vadybos sistemų standartai (tiekėjo reikalavimas). Gaminių standartai - techninės specifikacijos dalykas.
    var VADYBOS = { "9001": 1, "14001": 1, "45001": 1, "18001": 1, "27001": 1, "22301": 1, "50001": 1, "55000": 1, "55001": 1, "37001": 1, "20000": 1 };
    var stdSeni = Object.create(null), stdKiek = 0, RE_STD = /(lst en iso\/iec|lst en iso|en iso|iso\/iec|iso)\s*(\d{4,5}(?:[-:\/]\d+)*)/g, stdM;
    g.sprendimai.some(function (d) {
      return d.chunks.some(function (ch) {
        var f = foldF(ch);
        RE_STD.lastIndex = 0;
        while ((stdM = RE_STD.exec(f))) {
          var nr = stdM[2].split(/[-:\/]/)[0];
          if (stdSeni[nr] || !VADYBOS[nr]) continue;
          var s = sakinys(f, stdM.index, stdM.index + stdM[0].length);
          if (salyginis(f.slice(s.pradzia, stdM.index))) continue;
          stdSeni[nr] = 1;
          var pav = ch.text.substr(stdM.index, stdM[0].length);
          q("standartas-" + nr, 37, L("Kaip įrodyti atitiktį standartui " + pav + "?", "How do I prove compliance with " + pav + "?"), { d: d, ch: ch, citata: kiekDaug(normTarpai(ch.text.slice(s.pradzia, s.pabaiga))) });
          if (++stdKiek >= 2) return true;
        }
        return false;
      });
    });

    /* --- Vertinimas --- */
    var ev = meta.evaluation;
    if (ev && /ekonominis|naudingum|kokyb/i.test(String(ev.value))) {
      var met = g.formos.concat(g.sps).filter(function (d) { return /metodik|vertinimo kriterij|naudingum/.test(fold(vardas(d))); })[0];
      var rEv = rask(g.sprendimai, /kainos ir kokybes santyk|sanaudu ir kokybes santyk|vertinimo kriterij/, { ir_salyga: true });
      var fr = met ? met.chunks.slice(0, 3).map(function (c) { return c.id; }) : [];
      var kEv = rEv ? kodel(rEv) : met ? { docId: met.id, name: vardas(met), loc: met.chunks[0].loc, citata: kiekDaug(normTarpai(met.chunks[0].text)) } : null;
      if (kEv) q("vertinimas", 24, L("Kaip skaičiuojami balai ir kokie vertinimo kriterijų svoriai?", "How are the scores calculated and what are the weights of the award criteria?"), kEv, fr.concat(rEv ? [rEv.ch.id] : []));
    }

    /* --- Sutarties sąlygos --- */
    var sut = g.sutartis.concat(g.sprendimai);
    var sutUztNe = rask(sut, /sutarties ivykdymo uztikrinimas\s*[-–:]?\s*(nenumatytas|netaikomas|nereikalaujamas)/);
    var sutUztTaip = rask(g.sprendimai.concat(g.sutartisSS), /sutarciai taikomas sutarties ivykdymo uztikrinimas|sutarties ivykdymo uztikrinimo dydis/);
    var sutUztBs = !sutUztTaip && !sutUztNe && rask(g.sutartis, /sutarties ivykdymo uztikrinimo dydis/);
    if (sutUztBs) q("sut-uztikrinimas", 45, L("Ar reikia sutarties įvykdymo užtikrinimo ir kokio dydžio?", "Is contract performance security required and in what amount?"), sutUztBs);
    if (sutUztTaip) {
      var pr = /(\d+(?:[.,]\d+)?)\s*(?:\([^)]{1,40}\)\s*)?(%|proc)/.exec(sutUztTaip.fs);
      q("sut-uztikrinimas", 40, pr ? L("Kaip ir kada pateikti " + pr[1] + " % sutarties įvykdymo užtikrinimą?", "How and when must the " + pr[1] + " % contract performance security be provided?")
                                   : L("Kokio sutarties įvykdymo užtikrinimo reikia ir kada jį pateikti?", "What contract performance security is required and when?"), sutUztTaip);
    } else if (sutUztNe) faktas("sut-uztikrinimas", L("Ar reikia sutarties įvykdymo užtikrinimo?", "Is contract performance security required?"), NE, sutUztNe, /ivykdymo uztikrinim/, L("Ar reikia sutarties įvykdymo užtikrinimo?", "Is contract performance security required?"), 40);

    var av = eilute(sut, "avansas"), avSum = rask(sut, /avans\w*\s+(?:gali buti\s+)?(?:sumokam\w+|mokam\w+|moka\w*)[^.|]{0,40}?(\d+)\s*(?:%|proc)|avanso dydis[^.|]{0,30}(\d+)\s*(?:%|proc)/);
    if (avSum) { var avP = avSum.m[1] || avSum.m[2]; q("avansas", 41, L("Kokiomis sąlygomis mokamas avansas (iki " + avP + " %)?", "On what conditions is the advance (up to " + avP + " %) paid?"), avSum); }
    else if (av.taip) q("avansas", 41, L("Koks avansas numatytas ir kokios jo sąlygos?", "What advance is provided and on what conditions?"), av.taip);
    else if (av.ne) faktas("avansas", L("Ar numatytas avansas?", "Is an advance payment provided?"), NE, av.ne, /avans/, L("Ar numatytas avansas?", "Is an advance payment provided?"), 41);

    var pe = eilute(sut, "sutarties kainos[^|\\n]{0,30}perskaiciavimas");
    var persk = pe.taip || rask(sut, /(sutarties kaina|ikainiai|ikainis)( \/ ikainiai)? (bus|gali buti) perskaiciuoj|kaina gali buti perskaiciuojama|taikoma fiksuota kaina su perziura|kainos perziura:/);
    if (persk) q("perskaiciavimas", 42, L("Kada ir kaip gali būti perskaičiuota sutarties kaina?", "When and how can the contract price be revised?"), persk);
    else if (pe.ne) faktas("perskaiciavimas", L("Ar sutarties kaina gali būti perskaičiuota?", "Can the contract price be revised?"), NE, pe.ne, /perskaiciav|indeksav/, L("Ar sutarties kaina gali būti perskaičiuota?", "Can the contract price be revised?"), 42);

    // Delspinigiai. Sąlygose yra ir tie, kuriuos moka PIRKIMO VYKDYTOJAS už vėluojantį apmokėjimą („Užsakovui neatlikus
    // mokėjimo“, „uždelsia atsiskaityti“, „Tiekėjas skaičiuoja Pirkėjui“) - tai ne tiekėjo netesybos. Dydis į klausimą
    // įrašomas tik kai sakinys aiškiai apie tiekėjo vėlavimą, kitaip klausiama neutraliai.
    var TIEKEJO = /(rangovui|tiekejui|projektuotojui|pardavejui|draudikui|teikejui)\s+(neivykd|neatlik|veluoj|uzdels|pavelav|nesutei|nepristat|nepateik|laiku ne)|(uzsakovas|pirkejas|draudejas) turi teise reikalauti|tiekejui skaiciuoja|rangovui skaiciuoja|neisdavus/;
    var VYKDYTOJO = /uzsakovui (laiku )?neatlik|pirkejui (laiku )?neatlik|draudejui laiku|uzdelsia atsiskaityti|uzdelses sumoketi|neatlikus mokejimo|skaiciuoja pirkejui|skaiciuoja uzsakovui/;
    var sutDok = g.sutartisSS.concat(g.sutartis), delspQ = null, RE_DELSP = /(\d+(?:[.,]\d+)?)\s*(?:\([^)]{1,40}\)\s*)?(?:procent\w*|proc\.?|%)\s*(?:dydzio\s*)?delspinig/g;
    sutDok.some(function (d) {
      return d.chunks.some(function (ch) {
        var f = foldF(ch), m;
        RE_DELSP.lastIndex = 0;
        while ((m = RE_DELSP.exec(f))) {
          var pries = f.slice(Math.max(0, m.index - 300), m.index).split(/\n|\|/).pop();
          if (VYKDYTOJO.test(pries) || !TIEKEJO.test(pries)) continue;
          var pr0 = Math.max(0, m.index - pries.length);
          delspQ = { d: d, ch: ch, n: m[1], citata: kiekDaug(normTarpai(ch.text.slice(pr0, m.index + m[0].length + 40))) };
          return true;
        }
        return false;
      });
    });
    if (delspQ) q("delspinigiai", 43, L("Už ką ir kaip tiekėjui skaičiuojami " + delspQ.n + " % delspinigiai?", "What are the " + delspQ.n + " % penalties charged to the supplier for, and how?"), delspQ);
    else {
      var netes = rask(sutDok, /delspinig|baudos|bauda|netesyb/, { ne: VYKDYTOJO });
      if (netes) q("delspinigiai", 49, L("Kokios netesybos taikomos tiekėjui už sutarties nevykdymą ar vėlavimą?", "What penalties apply to the supplier for non-performance or delay?"), netes);
    }

    var ge = eilute(sut, "garantinis terminas"), RE_GAR = /garantin\w+ (?:terminas|laikotarpis)\s*(?:[-–:]|yra)?\s*(?:ne trumpesnis kaip\s*)?(\d+)\s*(?:\([^)]{1,40}\)\s*)?(men\w*|met\w*)|(\d+)\s*(?:\([^)]{1,40}\)\s*)?(menesiu|metu)\s+(?:\S+\s+){0,3}garantin\w+ (?:terminas|laikotarpis)/;
    var gar = rask(sut.concat(g.ts), RE_GAR);
    if (ge.ne && !gar) faktas("garantija", L("Ar taikomas garantinis terminas?", "Does a warranty period apply?"), NE, ge.ne, /garantin/, L("Ar taikomas garantinis terminas?", "Does a warranty period apply?"), 44);
    else if (gar) {
      var gN = gar.m[1] || gar.m[3], gV = /^men/.test(gar.m[2] || gar.m[4]) ? L("mėn.", "months") : L("m.", "years");
      q("garantija", 44, L("Nuo kada skaičiuojamas " + gN + " " + gV.lt + " garantinis terminas ir kam jis taikomas?", "When does the " + gN + " " + gV.en + " warranty start and what does it cover?"), gar);
    } else if (ge.taip) q("garantija", 44, L("Koks garantinis terminas taikomas ir nuo kada jis skaičiuojamas?", "What warranty period applies and when does it start?"), ge.taip);

    if (meta.duration && !seni["skirtinga-duration"] && !dps) {
      var x = meta.duration;
      var trEn = String(x.value).replace(/\s*mėn\.?/, " months").replace(/\s*m\.$/, " years");
      q("trukme", 46, L("Nuo kada skaičiuojama " + x.value + " sutarties trukmė ir ar ją galima pratęsti?", "When does the " + trEn + " contract period start and can it be extended?"),
        metaKodel(x, o.docs));
    }

    /* --- Pakete esančios formos --- */
    function pagalVarda(re) { return g.formos.concat(g.sutartis, g.kita).filter(function (d) { return re.test(fold(vardas(d))); })[0]; }
    function doKodel(d) { return { docId: d.id, name: vardas(d), loc: d.chunks[0].loc, citata: kiekDaug(normTarpai(d.chunks[0].text)) }; }
    function doFr(d, n) { return d.chunks.slice(0, n).map(function (c) { return c.id; }); }
    var ns = pagalVarda(/nacionalinio saugumo|national security/);
    if (ns) q("nacsaugumas", 38, L("Kas ir kada turi pateikti nacionalinio saugumo reikalavimų atitikties deklaraciją?", "Who must submit the national security compliance declaration, and when?"), doKodel(ns), doFr(ns, 2));
    var kainos = pagalVarda(RE_KAINOS);
    if (kainos) q("kainos", 25, L("Kaip užpildyti „" + svarusVardas(kainos) + "“ ir ką įskaičiuoti į kainą?", "How do I fill in “" + svarusVardas(kainos) + "” and what must the price include?"), doKodel(kainos), doFr(kainos, 3));
    var derForma = pagalVarda(/deret\w+ salyg|pasiulymu deryboms|deryboms forma/);
    if (derForma) q("deretinos", 26, L("Ką reikia nurodyti tiekėjo pasiūlymų dėl derėtinų sąlygų formoje?", "What must the supplier state in the form on negotiable conditions?"), doKodel(derForma), doFr(derForma, 2));
    var spec = pagalVarda(/specialist/);
    if (spec && !kvalNe && !roles) q("specialistai", 39, L("Kokius specialistus reikia nurodyti ir kokių jų dokumentų reikia?", "Which specialists must be listed and which of their documents are needed?"), doKodel(spec), doFr(spec, 2));
    var zal = pagalVarda(/zaliesiems|zaliuju|zalieji/);
    if (zal) q("zalieji", 39, L("Kokius žaliuosius reikalavimus turi patvirtinti tiekėjas?", "Which green requirements must the supplier confirm?"), doKodel(zal), doFr(zal, 2));
    var tris = pagalVarda(/trisal|tiesioginio atsiskaitymo/);
    if (tris) q("tiesioginis", 47, L("Kaip veikia tiesioginis atsiskaitymas su subtiekėjais?", "How does direct payment to subcontractors work?"), doKodel(tris), doFr(tris, 2));
    if (g.ebvpd.length && !rask(g.sprendimai, /ebvpd (nera|nereikalaujam)/)) {
      var eb = g.ebvpd.filter(function (d) { return !/\.xml$/i.test(vardas(d)); })[0] || g.ebvpd[0];   // XML pradžia žmogui nieko nesako
      q("ebvpd", 48, L("Kaip užpildyti ir pateikti šio pirkimo EBVPD?", "How do I fill in and submit this procurement's ESPD?"), doKodel(eb), doFr(eb, 1));
    }

    /* --- Kiti, jei trūksta --- */
    if (g.rk.length) { var rk = g.rk[0]; q("rinkos", 60, L("Ką pirkimo vykdytojas atsakė rinkos konsultacijoje?", "What did the buyer answer in the market consultation?"), doKodel(rk), doFr(rk, 3)); }
    if (kalba === "en") {
      var kb = rask(g.sprendimai, /turi buti (pateikiam\w+|pateikt\w+) lietuviu|pateikiami lietuviu/);
      if (kb) q("kalba", 27, L("", "Which documents must be in Lithuanian and which may be in English?"), kb);
    }
    if (g.ts.length) { var t0 = g.ts[0]; q("ts", 70, L("Kokie pagrindiniai reikalavimai nustatyti techninėje specifikacijoje?", "What are the main requirements in the technical specification?"), doKodel(t0), doFr(t0, 4)); }
    var subt = rask(g.sprendimai.concat(g.bps), /subtiekej/, { ir_salyga: true });
    if (subt) q("subtiekejai", 71, L("Kokią informaciją apie subtiekėjus reikia pateikti?", "What information about subcontractors must be provided?"), subt);

    Q.sort(function (a, b) { return a.p - b.p; });
    return { klausimai: Q, faktai: F, datos: DATOS, vietos: { kvalifikacija: kvalLentele(g) } };
  }

  /* Kvalifikacijos reikalavimų lentelė („Kvalifikacijos reikalavimas | Pateikiami dokumentai“) laisviems klausimams (2026-11-10, pilotas su tikru pirkimu):
     antraštės fragmentas ir po jo einantys tos pačios lentelės fragmentai - visos eilutės, ne tik tos, iš kurių sudaryti klausimai. Fragmento vieta - jo
     pradžia, todėl antraštė su pirmąja eilute gali būti fragmente, kuris prasideda ankstesnėje (pašalinimo pagrindų) lentelėje. Nėra lentelės - atskiras
     kvalifikacijos reikalavimų priedas pagal vardą. */
  var KVAL_ANTR = /kvalifikacijos reikalavim[a-z]*\s*\|\s*(?:[^\s|]+\s+){0,3}(?:dokument|irodym|pagrind)|qualification requirements?\s*\|\s*(?:[^\s|]+\s+){0,3}(?:document|evidence|proof)/;
  var KVAL_RIBA = 6;
  function kvalLentele(g) {
    var out = [];
    g.sprendimai.concat(g.formos).some(function (d) {
      for (var i = 0; i < d.chunks.length; i++) {
        if (!KVAL_ANTR.test(foldF(d.chunks[i]))) continue;
        out.push(d.chunks[i].id);
        var lent = null;
        for (var j = i + 1; j < d.chunks.length && out.length < KVAL_RIBA; j++) {
          var l = d.chunks[j].loc || {};
          if (l.table == null) break;
          if (lent === null) lent = l.table; else if (l.table !== lent) break;
          out.push(d.chunks[j].id);
        }
        return true;
      }
      return false;
    });
    if (!out.length) {
      var pr = g.formos.filter(function (d) { return /kvalifikacij|qualification/.test(fold(vardas(d))); })[0];
      if (pr) out = pr.chunks.slice(0, 4).map(function (c) { return c.id; });
    }
    return out;
  }
  /* ---------------- Kontrolinis sąrašas iš dokumentų ----------------
     Tai, ką dokumentai aiškiai sako, užpildoma iškart ir be DI: kiekvienas punktas su šaltiniu pažodžiui.
     Sudėtingi sąrašai (pašalinimo pagrindai, kvalifikacijos reikalavimai, techninis pasiūlymas, horizontalūs
     reikalavimai) - ne čia: jų dalis nebūtų pilna, o tai būtų blogiau nei „dar neįvertinta“. Jei apie temą
     kalba atsakymų raštas (jis gali sąlygą pakeisti), punktas paliekamas neįvertintas. */
  function formos(g, re, n, ne) {
    return g.formos.concat(g.sps, g.kita).filter(function (d) { var v = fold(vardas(d)); return re.test(v) && !(ne && ne.test(v)); }).slice(0, n || 1);
  }
  function dokSaltinis(d) { return { docId: d.id, name: vardas(d), loc: d.chunks[0].loc, citata: kiekDaug(normTarpai(d.chunks[0].text)) }; }

  function kontrolinis(o) {
    o = o || {};
    var kalba = o.kalba === "en" ? "en" : "lt", meta = o.meta || {}, docs = o.docs || [], dabar = o.dabar || new Date(), g = grupes(docs), P = Object.create(null);
    function punktas(id, busena, santrauka, saltiniai, pastaba) {
      P[id] = { id: id, busena: busena, santrauka: santrauka ? santrauka[kalba] : "", saltiniai: saltiniai, pastaba: pastaba ? pastaba[kalba] : "" };
    }
    function atsakymuose(re) { return g.paaiskinimai.some(function (d) { return d.chunks.some(function (c) { return re.test(foldF(c)); }); }); }
    function failai(ds) { return ds.map(svarusVardas).join("; "); }
    function skirtingi(x) { return [x.value].concat(x.alt.map(function (a) { return a.value; })).join(", "); }

    /* Pateikimas */
    var sal = g.sprendimai.concat(g.bps), cvp = rask(sal, RE_CVP_TEIKTI, { turi: RE_CVP_KANALAS }) || rask(sal, RE_CVP_MINI, { ne: /nebus nagrinejam|konkreti data/, turi: RE_CVP_KANALAS });
    if (cvp) punktas("registracija", "privaloma", L("Teikiama per CVP IS - užsiregistruokite ir pasirenkite iš anksto.", "Submitted through CVP IS - register and prepare in advance."), [kodel(cvp)]);

    /* Terminas: kelios skirtingos datos (ne pratęsimas) - patikslinti, ne pasirinkti. Laiko juosta matyti citatoje. */
    var dl = meta.deadline, cvpT = cvpTerminas(o, kalba);
    var PRAEJES = L("Šis terminas jau praėjo - patikrinkite CVP IS, ar jis nepratęstas.", "This deadline has passed - check in CVP IS whether it was extended.");
    if (cvpT) {
      // CVP IS terminas - kaip apžvalgoje; dokumentų terminas, jei kitoks, - pastaba
      var praejesC = cvpT.d < dabar, kiti = kitiTerminai(dl, cvpT), V = global.GP_VPT;
      var pastC = praejesC ? PRAEJES
        : V && V.nutrauktas(cvpT.p) ? L("CVP IS duomenimis pirkimas nutrauktas.", "According to CVP IS the procurement has been cancelled.")
        : kiti.length ? L("Dokumentuose nurodytas kitas terminas (" + kiti.join(", ") + ") - galioja CVP IS terminas; vėlesnis pratęsimas pakete gali būti dar neįkeltas.",
                          "The documents give a different deadline (" + kiti.join(", ") + ") - the CVP IS deadline applies; a later extension may not be in the package yet.")
        : V && V.tolesnisEtapas(cvpT.p) ? L("Pirmas etapas jau baigtas - šis CVP IS terminas skirtas tolesnio etapo dalyviams.", "The first stage is over - this CVP IS deadline is for the next-stage participants.")
        : dl && dl.pratestas ? L("Terminas pratęstas.", "The deadline was extended.")
        : o.kelietapis ? L("Vėlesnio etapo terminą pirkimo vykdytojas nurodo kvietime per CVP IS.", "The buyer states the next stage's deadline in the invitation through CVP IS.") : null;
      punktas("terminas", "privaloma", L("Terminas: " + cvpT.t + " (CVP IS duomenys).", "Deadline: " + cvpT.t + " (CVP IS data)."),
        [cvpT.kodel].concat(dl && dl.value && dl.docId ? [metaKodel(dl, docs)] : []), pastC);
      if (cvp) punktas("patikra", "privaloma", praejesC ? L("Teikiama per CVP IS iki termino.", "Submitted through CVP IS by the deadline.") : L("Pateikite per CVP IS iki " + cvpT.t + ".", "Submit through CVP IS by " + cvpT.t + "."), [kodel(cvp)], praejesC ? PRAEJES : null);
    } else if (dl && dl.value) {
      var md = metaData(dl.value), td = md ? md.t : dl.value, praejes = !!(md && md.d < dabar);
      if (dl.alt && dl.alt.length && !dl.pratestas) {
        punktas("terminas", "patikslinti", L("Dokumentuose skirtingi terminai: " + skirtingi(dl) + ".", "The documents give different deadlines: " + skirtingi(dl) + "."), [metaKodel(dl, docs)]);
      } else {
        punktas("terminas", "privaloma", L("Terminas: " + td + ".", "Deadline: " + td + "."), [metaKodel(dl, docs)],
          praejes ? PRAEJES : dl.pratestas ? L("Terminas pratęstas.", "The deadline was extended.") : o.kelietapis ? L("Vėlesnio etapo terminą pirkimo vykdytojas nurodo kvietime per CVP IS.", "The buyer states the next stage's deadline in the invitation through CVP IS.") : null);
        if (cvp) punktas("patikra", "privaloma", praejes ? L("Teikiama per CVP IS iki termino.", "Submitted through CVP IS by the deadline.") : L("Pateikite per CVP IS iki " + td + ".", "Submit through CVP IS by " + td + "."), [kodel(cvp)], praejes ? PRAEJES : null);
      }
    }

    /* Formos pakete. Paraiška ir pasiūlymas - skirtingi etapai. */
    var fo = formos(g, /pasiulymo form|paraiskos form|tender form|application form|bid form/, 3);
    var foPar = fo.filter(function (d) { return /paraiskos form|application form/.test(fold(vardas(d))); }), foPas = fo.filter(function (d) { return foPar.indexOf(d) < 0; });
    if (foPar.length && foPas.length) punktas("forma", "privaloma", L("Užpildykite: " + failai(foPar) + ". Vėliau, kai būsite pakviesti, - " + failai(foPas) + ".", "Fill in: " + failai(foPar) + ". Later, when invited, - " + failai(foPas) + "."), fo.map(dokSaltinis));
    else if (fo.length) punktas("forma", "privaloma", L("Užpildykite: " + failai(fo) + ".", "Fill in: " + failai(fo) + "."), fo.map(dokSaltinis));
    var ka = formos(g, RE_KAINOS, 2), kaF = !ka.length && foPas.length ? rask(foPas, /pasiulymo kain|kaina nurodoma|sanaudos nurodomos/, { ir_salyga: true }) : null;
    if (ka.length) punktas("kaina", "privaloma", L("Užpildykite: " + failai(ka) + ".", "Fill in: " + failai(ka) + "."), ka.map(dokSaltinis));
    else if (kaF) {
      kaF.citata = kiekDaug(normTarpai(kaF.ch.text.substr(kaF.m.index, 140)));      // antraštė „PASIŪLYMO KAINA“ - ne sakinys prieš ją
      punktas("kaina", "privaloma", L("Kainą nurodykite formoje: " + svarusVardas(kaF.d) + ".", "State the price in the form: " + svarusVardas(kaF.d) + "."), [kodel(kaF)]);
    }
    var su = formos(g, /ukio subjekt|subtiekej|kvazisubtiekej|economic operator|subcontract|sub-supplier/, 1, /sandorio sal|transaction part/);
    if (su.length) punktas("subjektai", "su_salyga", L("Jei remiatės kitų ūkio subjektų pajėgumais ar pasitelkiate subtiekėjus, užpildykite: " + failai(su) + ".", "If you rely on other operators' capacity or use subcontractors, fill in: " + failai(su) + "."), su.map(dokSaltinis));
    // „Konfidencialumo įsipareigojimas“ - kitas dokumentas: jį pasirašo kiti, ne pasiūlyme nurodoma informacija
    var ko = formos(g, /konfidenciali informacij|confidential information/, 1);
    if (ko.length) {
      var tikLaim = /tik galimo laimetojo/.test(fold(ko[0].chunks[0].text));
      punktas("konfidencialumas", "su_salyga", tikLaim ? L("Šį priedą pirkimo vykdytojas prašys užpildyti tik iš galimo laimėtojo: " + failai(ko) + ".", "The buyer will ask only the potential winner to fill in this annex: " + failai(ko) + ".")
                                                      : L("Jei pasiūlyme yra konfidencialios informacijos, užpildykite: " + failai(ko) + ".", "If your bid contains confidential information, fill in: " + failai(ko) + "."), ko.map(dokSaltinis));
    }

    /* Galiojimas: santrauka (skelbimas, sąlygos), o jos nesant - pasiūlymo forma ir sąlygos */
    var gl = meta.validity;
    if (!atsakymuose(/pasiulym\w* galiojim|galiojimo termin/)) {
      if (gl && gl.value) {
        // Abiejų vietų citatos (2026-11-10: skelbime 90 d., pasiūlymo formoje 3 mėn. - rodyta tik viena)
        if (gl.alt && gl.alt.length) punktas("galiojimas", "patikslinti", L("Dokumentuose skirtingas galiojimas: " + skirtingi(gl).replace(/\.$/, "") + ".", "The documents give different validity periods: " + skirtingi(gl).replace(/\.$/, "") + "."),
          [metaKodel(gl, docs)].concat(gl.alt.slice(0, 2).filter(function (a) { return a.docId; }).map(function (a) { return metaKodel(a, docs); })));
        else { var gz = String(gl.value).replace(/\.$/, ""); punktas("galiojimas", "privaloma", L("Pasiūlymo galiojimas: " + gz + ".", "Bid validity: " + gz + "."), [metaKodel(gl, docs)]); }
      } else {
        var gr = rask(foPas.concat(g.sprendimai), RE_GALIOJA);
        if (gr) { var gv = normTarpai(gr.orig(1)).replace(/[.;,\s]+$/, ""); punktas("galiojimas", "privaloma", L("Pasiūlymas galioja " + gv + ".", "Bid validity per the source: " + gv + "."), [kodel(gr)]); }
      }
    }

    /* EBVPD */
    if (!atsakymuose(/ebvpd|espd/)) {
      var ebNe = rask(g.sprendimai, /ebvpd (nera|nereikalaujam|netaikom)|nereikalaujama pateikti ebvpd|espd is not required/);
      var ebTaip = rask(g.sprendimai, RE_EBVPD_TAIP, { ne: /pateikimo tvarka|patvirtinimo priemon/ });
      if (ebNe && !ebTaip) punktas("ebvpd", "netaikoma", L("EBVPD nereikalaujamas.", "The ESPD is not required."), [kodel(ebNe)]);
      else if (ebTaip) punktas("ebvpd", "privaloma", L("Pateikite EBVPD.", "Submit the ESPD."), [kodel(ebTaip)]);
      else if (g.sprendimai.length && !g.ebvpd.length && !rask(g.sprendimai, /ebvpd|espd|europos bendraj\w+ viesuj\w+ pirkimu dokument/, { ir_salyga: true }))
        punktas("ebvpd", "nerasta", L("Specialiosiose sąlygose ir pakete EBVPD neminimas.", "The special conditions and the package do not mention the ESPD."), []);
    }

    /* Kvalifikacija: tik „netikrinama“ - reikalavimų sąrašo be DI nepildome */
    var kvNe = rask(g.sprendimai, RE_KVAL_NE);
    if (kvNe && !atsakymuose(/kvalifikacij/)) punktas("kvalifikacija", "netaikoma", L("Kvalifikacija šiame pirkime netikrinama.", "Qualification is not checked in this procurement."), [kodel(kvNe)]);

    /* Pasiūlymo galiojimo užtikrinimas */
    if (!atsakymuose(UZT_TEMA)) {
      var uNe = rask(g.sprendimai, RE_UZT_NE), uTaip = rask(g.sprendimai, RE_UZT_TAIP);
      if (uTaip) {
        var us = RE_SUMA_EUR.exec(uTaip.fs);
        punktas("uztikrinimas", "privaloma", us ? L("Reikia pasiūlymo galiojimo užtikrinimo: " + normTarpai(us[1]) + " Eur.", "Bid security is required: EUR " + normTarpai(us[1]) + ".") : L("Reikia pasiūlymo galiojimo užtikrinimo - dydis ir tvarka citatoje.", "Bid security is required - the amount and procedure are in the quote."), [kodel(uTaip)]);
      } else if (uNe) punktas("uztikrinimas", "netaikoma", L("Pasiūlymo galiojimo užtikrinimo nereikalaujama.", "Bid security is not required."), [kodel(uNe)]);
    }

    /* Parašas: LITGRID sąlygose - fizinis ARBA kvalifikuotas elektroninis */
    var pa = rask(sal, RE_PARASAS);
    if (pa) {
      var abu = /fizini\w+ (parasu )?(arba|ir \(arba\)) kvalifikuot|kvalifikuot\w+ elektronin\w+ parasu arba fizini/.test(pa.fs);
      punktas("parasas", "privaloma", abu ? L("Pasirašykite fiziniu arba kvalifikuotu elektroniniu parašu.", "Sign with a handwritten or a qualified electronic signature.")
        : /kvalifikuot/.test(pa.fs) ? L("Pasirašykite kvalifikuotu elektroniniu parašu.", "Sign with a qualified electronic signature.") : L("Pasirašymo reikalavimas - citatoje.", "The signing requirement is in the quote."), [kodel(pa)]);
    }
    return P;
  }

  /* ---------------- Iki kada pateikti klausimą ----------------
     Pagrindinis šaltinis - CVP IS laukas „Prašymų pateikti paaiškinimus termino pabaiga“ (VPT clarificationPeriodEnd):
     2026-11-03 jis buvo visuose 89 iš 89 tikrinamų aktyvių pirkimų, išskyrus rinkos konsultacijas; 7 iš jų sutapo su
     pasiūlymų terminu. Sąlygų tekstas dažniausiai sako tik, kada ATSAKO pirkimo vykdytojas („Paaiškinimai ... pateikiami
     likus ...“) - tai ne tiekėjo terminas; tiekėjo sakinys („Prašymai paaiškinti ... ne vėliau kaip likus 8 dienoms“)
     buvo 2 iš 27 paketų. Jis pirmesnis tik kai reikalauja paklausti gerokai anksčiau, arba kai CVP IS duomenų nėra. */
  var PRASYMAS = /(prasym[a-z]*\s+(?:paaiskinti|patikslinti)|prasym[a-z]*\s+del\s+[^.]{0,40}paaiskin|klausim[a-z]*\s+(?:del\s+[^.]{0,60})?(?:gali|galima|turi|pateik)|requests?\s+(?:to\s+clarify|for\s+clarification)|questions?\s+[^.]{0,40}(?:must|may|shall)\s+be\s+submitted)[^.]{0,200}?(?:likus|no\s+later\s+than)[:\s]+(?:ne\s+maziau\s+kaip\s+|ne\s+mazesniam\s+kaip\s+)?(\d{1,2})\s*(?:\([^)]{0,30}\)\s*)?(darbo\s+|working\s+|business\s+)?(?:dien[a-z]*|days?)\s+(?:iki|prior\s+to|before)\s+([^.\n]{0,120})/;
  var ATSAKYMAS = /atsakym|atsako|answers?(?![a-z])|repl(?:y|ies)/;
  /* Tiekėjo terminas sąlyga (2026-11-12, antras pilotas): „Perkantysis subjektas atsakys ..., jei toks prašymas yra gautas ne vėliau kaip likus
     6 dienoms iki pasiūlymų pateikimo termino pabaigos“ - atsakymas žadamas tik laiku pateiktam prašymui, todėl tai tiekėjo klausimų terminas,
     nors sakinyje yra „atsakys“. Sakinys, kuriame tik pirkimo vykdytojo atsakymo terminas („atsakys ne vėliau kaip likus 3 dienoms“), - ne. */
  var PRASYMAS_JEI = /(?:jei|jeigu|kai|if|provided\s+that)\s+(?:toks\s+|tiekejo\s+|jo\s+|such\s+(?:a\s+)?|the\s+)?(?:prasym[a-z]*|klausim[a-z]*|requests?|questions?)\s+(?:yra\s+|is\s+|are\s+)?(?:gaut[a-z]*|pateikt[a-z]*|received|submitted)\s+(?:[a-z]+\s+){0,3}?(?:ne\s+veliau\s+kaip|no\s+later\s+than)\s+(?:likus\s+|pries\s+)?(\d{1,2})\s*(?:\([^)]{0,30}\)\s*)?(darbo\s+|working\s+|business\s+)?(?:dien[a-z]*|days?)\s+(?:iki|prior\s+to|before)\s+([^.\n]{0,120})/;
  function prasymoSalyga(docs) {
    var g = grupes(docs), sar = g.sprendimai.concat(g.bps, g.kita);
    var rj = rask(sar, PRASYMAS_JEI, { ir_salyga: true });
    if (rj) return { dienu: +rj.m[1], darbo: !!rj.m[2], baze: normTarpai(rj.orig(3).replace(/\([^)]*\)?/g, " ")), kodel: kodel(rj) };
    var r = rask(sar, PRASYMAS, { ir_salyga: true });
    if (!r || ATSAKYMAS.test(r.f.slice(Math.max(0, r.m.index - 80), r.m.index))) return null;
    return { dienu: +r.m[2], darbo: !!r.m[3], baze: normTarpai(r.orig(4).replace(/\([^)]*\)?/g, " ")), kodel: kodel(r) };
  }
  // Pasibaigęs pasiūlymų etapas ar nutrauktas pirkimas: klausti nebėra ko
  var NEAKTYVIOS = /cancel|evaluat|closed|award|awaiting|conclud|complet|terminat|unsuccess|suspend/i;
  var PRIES_ATSAKYMA_D = 3;    // tiek dienų iki termino žyma tampa ryškesnė
  function terminas(o) {
    o = o || {};
    var dabar = o.dabar || new Date(), p = o.pirkimas || null, parse = o.parse;
    var cvp = p && p.clarificationPeriodEnd ? parse(p.clarificationPeriodEnd) : null;
    var galutinis = (p && p.tenderSubmissionDeadline ? parse(p.tenderSubmissionDeadline) : null) || o.galutinis || null;
    // Dinaminė pirkimo sistema ir kvalifikacijos sistema: CVP IS terminas - sistemos galiojimo pabaiga (2033 m.), ne klausimų terminas
    if (o.sistema) { cvp = null; galutinis = null; }
    var salyga = o.salyga !== undefined ? o.salyga : prasymoSalyga(o.docs || []);
    var aktyvus = !(p && typeof p.status === "string" && NEAKTYVIOS.test(p.status)) && !(p && global.GP_VPT && global.GP_VPT.nutrauktas(p)) && !(galutinis && galutinis < dabar);
    // Datą iš sąlygų galima apskaičiuoti tik vieno etapo pirkime (kitaip nežinoma, kurio etapo terminas) ir kalendorinėmis dienomis
    var isSalygos = salyga && !salyga.darbo && !o.kelietapis && galutinis ? new Date(galutinis.getTime() - salyga.dienu * 86400000) : null;
    var DIENA = 86400000, data = cvp, saltinis = cvp ? "cvpis" : null;
    if (isSalygos && (!cvp || isSalygos.getTime() < cvp.getTime() - DIENA)) { data = isSalygos; saltinis = "salyga"; }
    if (!data && !salyga) return null;
    var ms = data ? data.getTime() - dabar.getTime() : null, praejes = data ? ms < 0 : false;
    return {
      aktyvus: aktyvus, data: data, saltinis: saltinis, cvp: cvp, galutinis: galutinis, salyga: salyga,
      praejes: praejes,
      liko: data && !praejes ? { dienos: Math.floor(ms / DIENA), valandos: Math.floor((ms % DIENA) / 3600000), minutes: Math.floor(ms / 60000) } : null,
      greit: !!(data && !praejes && ms <= PRIES_ATSAKYMA_D * DIENA),
      suTerminu: !!(saltinis === "cvpis" && galutinis && Math.abs(cvp.getTime() - galutinis.getTime()) <= 60000)
    };
  }

  global.GP_KLAUSIMAI = { siulyk: siulyk, kontrolinis: kontrolinis, terminas: terminas, prasymoSalyga: prasymoSalyga, fold: fold, grupes: grupes, svarusVardas: svarusVardas };
})(typeof window !== "undefined" ? window : this);
