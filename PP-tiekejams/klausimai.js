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
 * Grynos funkcijos: siulyk({ docs, meta, kalba, dabar }) -> { klausimai, faktai }.
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
    v = v.split(/[\s_]+(?:Annex|Appendix|Form of|Price|Tender)\b/)[0];    // dvikalbis vardas - lietuviška dalis
    // Numeriai ir „SPS 1 priedo 1 priedas“ žmogui nieko nesako - lieka tai, kas tai per dokumentas
    v = v.replace(/_+/g, " ").replace(/^\s*\d+(?:\.\d+)*\.?\s*/, "").replace(/^(?:SPS\s*|SS\s*)?(?:\d+(?:\.\d+)*\.?\s*)?(?:priedo\s*\d+(?:\.\d+)*\.?\s*)?(?:priedas\.?\s*)?/i, "");
    return v.replace(/\s+/g, " ").trim();
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

  // Grąžina pirmą atitikimą dokumentuose pagal jų eilę: { d, ch, m, tekstas, citata, salyga }
  function rask(docs, re, o) {
    o = o || {};
    for (var a = 0; a < docs.length; a++) {
      var d = docs[a];
      for (var b = 0; b < d.chunks.length; b++) {
        var ch = d.chunks[b], f = foldF(ch);
        re.lastIndex = 0;
        var m = re.exec(f);
        if (!m) continue;
        var s = sakinys(f, m.index, m.index + m[0].length), fs = f.slice(s.pradzia, s.pabaiga);
        if (!o.ir_salyga && salyginis(f.slice(s.pradzia, m.index))) continue;
        if (o.ne && o.ne.test(fs)) continue;
        var cit = normTarpai(ch.text.slice(s.pradzia, s.pabaiga));
        if (cit.length < 30) cit = normTarpai(ch.text.slice(Math.max(0, s.pradzia - 60), s.pabaiga + 100));   // „netesybos.“ žmogui nieko nepasako
        return { d: d, ch: ch, m: m, f: f, citata: kiekDaug(cit), fs: fs, orig: function (gr) { var i = f.indexOf(m[gr], m.index); return ch.text.substr(i, m[gr].length); } };
      }
    }
    return null;
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

  /* ---------------- Faktų ir klausimų surinkimas ---------------- */
  function siulyk(o) {
    o = o || {};
    var kalba = o.kalba === "en" ? "en" : "lt", dabar = o.dabar || new Date(), meta = o.meta || {};
    var g = grupes(o.docs), Q = [], F = [], seni = Object.create(null);
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

    /* --- Būsena: atsakymai, pratęsimas, skirtingos reikšmės --- */
    if (g.paaiskinimai.length) {
      var frP = [];
      g.paaiskinimai.forEach(function (d) { d.chunks.slice(0, 2).forEach(function (c) { if (frP.length < 8) frP.push(c.id); }); });
      var pirmas = g.paaiskinimai[g.paaiskinimai.length - 1];
      q("paaiskinimai", 10, L("Ką pirkimo vykdytojas jau paaiškino ir atsakė tiekėjams?", "What has the buyer already clarified and answered to suppliers?"),
        { docId: pirmas.id, name: vardas(pirmas), loc: pirmas.chunks[0].loc, citata: kiekDaug(normTarpai(pirmas.chunks[0].text)), kiek: g.paaiskinimai.length }, frP);
    }
    var dl = meta.deadline;
    if (dl && dl.pratestas && dl.alt && dl.alt.length) {
      var md = metaData(dl.value);
      q("pratesimas", 11, md ? L("Kodėl terminas pratęstas iki " + md.t + " ir ar pakeistos kitos sąlygos?", "Why was the deadline extended to " + md.t + " and did other conditions change?")
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
    var derNe = rask(deryboDok, /derybos nebus vykdomos|derybos nevykdomos|derybos nevyks|nebus deramasi|pirkimas vykdomas be derybu/);
    var derTaip = rask(deryboDok, /bus vykdomos derybos|derybos bus vykdomos|negotiations will take place/);
    if (derTaip) q("derybos", 20, L("Dėl ko bus deramasi ir kaip vyks derybos?", "What will be negotiated and how will the negotiations run?"), derTaip);
    else if (derNe) faktas("derybos", L("Ar bus derybos?", "Will there be negotiations?"), NE, derNe, /deryb/, L("Ar šiame pirkime bus derybos?", "Will there be negotiations in this procurement?"), 20);

    // Ar teikiama paraiška, ar iškart pasiūlymas. Skelbimo laukas to nepasako: eForms „Dalyvavimo prašymų
    // terminas“ matytas ir pirkimuose be paraiškų (9 iš 21) - sako sąlygų žodžiai ir formos pavadinimas.
    function kiek(docs, re) { var n = 0; docs.forEach(function (d) { d.chunks.forEach(function (ch) { var m = (foldF(ch)).match(re); if (m) n += m.length; }); }); return n; }
    var paraiskosForma = g.formos.concat(g.sps).filter(function (d) { return /paraiskos form|application form/.test(fold(vardas(d))); })[0];
    var rDok1 = rask(g.sprendimai, /privalo pateikti\s+(paraisk|pirmin\w+ pasiulym|pasiulym)/);
    var kaTeikia = rDok1 ? rDok1.m[1].slice(0, 4) : "";       // sąlygų sakinys „Tiekėjai privalo pateikti ...“ - tiksliausias
    var paraiska = kaTeikia === "para" || (!kaTeikia && (!!paraiskosForma || kiek(g.sprendimai, /paraisk/g) >= 10));
    var pirminis = kaTeikia === "pirm" || (!kaTeikia && !paraiska && !derNe && kiek(g.sprendimai, /pirmin\w+ pasiulym/g) >= 10);
    var dps = rask(g.sprendimai.concat(g.formos, g.kita), /dinamin\w+ pirkimo sistem/);
    if (dps && !meta.procedure) q("dps", 21, L("Kaip prisijungti prie dinaminės pirkimo sistemos ir kada kviečiama teikti pasiūlymą?", "How do I join the dynamic purchasing system and when am I invited to bid?"), dps);
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
    var UZT_TEMA = /galiojimo uztikrinim|pasiulymo uztikrinim|tender security|bid security/;
    var uztNe = rask(g.sprendimai, /nereikalaujama (pateikti )?pasiulymo (galiojimo )?uztikrinimo|pasiulymo (galiojimo )?uztikrinimas (yra )?(nereikalaujamas|netaikomas|nenumatytas)|tender security is not required/);
    var uztTaip = rask(g.sprendimai, /(privalo|turi|reikia) pateikti[^.|]{0,90}pasiulymo (galiojimo )?uztikrinim|pasiulymo (galiojimo )?uztikrinim\w*[^.|]{0,40}(suma|dydis)[^.|]{0,40}\d/);
    if (uztNe && !uztTaip) faktas("uztikrinimas", L("Ar reikia pasiūlymo galiojimo užtikrinimo?", "Is bid security required?"), NE, uztNe, UZT_TEMA, L("Ar šiame pirkime reikia pasiūlymo galiojimo užtikrinimo?", "Is bid security required in this procurement?"), 30);
    else if (uztTaip) {
      var suma = /(\d[\d ]*(?:[.,]\d+)?)\s*(eur|€)/.exec(uztTaip.fs);
      q("uztikrinimas", 30, suma ? L("Kaip ir kada pateikti " + normTarpai(suma[1]) + " Eur pasiūlymo galiojimo užtikrinimą?", "How and when must the EUR " + normTarpai(suma[1]) + " bid security be submitted?")
                                 : L("Kokio dydžio pasiūlymo galiojimo užtikrinimo reikia ir kaip jį pateikti?", "What amount of bid security is required and how is it submitted?"), uztTaip);
    } else {
      var uztAntr = rask(g.sprendimai, /pasiulym\w+ galiojimo uztikrinimas/);
      if (uztAntr) q("uztikrinimas", 45, L("Ar šiame pirkime reikia pasiūlymo galiojimo užtikrinimo?", "Is bid security required in this procurement?"), uztAntr);
    }

    /* --- Objekto apžiūra --- */
    var apzNe = rask(g.sprendimai, /nebus vykdoma apziura|apziura nebus vykdoma|nerengs pirkimo objekto apziuros|apziura nerengiama|apziura nenumatyta/);
    var apzTaip = rask(g.sprendimai, /bus vykdoma apziura|bus rengiama apziura|norintys apziureti|apziura vyks/);
    if (apzTaip) {
      // Data - kitame sakinyje („... bus vykdoma apžiūra. Tiekėjai, norintys apžiūrėti ..., turi iki 2026 m. ...“)
      var poApz = apzTaip.f.slice(apzTaip.m.index, apzTaip.m.index + 260), mD = /20\d\d\s+m\.\s+[a-z]+\s+\d{1,2}\s+d\.|20\d\d-\d\d-\d\d/.exec(poApz);
      var apzD = mD ? dataLt(normTarpai(mD[0])) : null;
      if (!apzD || apzD >= dabar) {
        var dTekstas = mD ? normTarpai(apzTaip.ch.text.substr(apzTaip.m.index + mD.index, mD[0].length)) : "";
        if (mD) apzTaip.citata = kiekDaug(normTarpai(apzTaip.ch.text.substr(apzTaip.m.index, mD.index + mD[0].length + 12)));
        q("apziura", 31, dTekstas ? L("Kaip užsiregistruoti objekto apžiūrai (iki " + dTekstas + ")?", "How do I register for the site visit (by " + dTekstas + ")?")
                                  : L("Kada ir kaip vyks objekto apžiūra?", "When and how will the site visit take place?"), apzTaip);
      }
    } else if (apzNe) faktas("apziura", L("Ar bus objekto apžiūra?", "Will there be a site visit?"), NE, apzNe, /apziur/, L("Ar bus objekto apžiūra?", "Will there be a site visit?"), 31);

    /* --- Kvalifikacija --- */
    var roles = 0, kvalNe = rask(g.sprendimai, /kvalifikacija nera tikrinama|kvalifikacijos reikalavimai nenustatomi|kvalifikacijos reikalavimu nera/);
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
            if (kas.length > 70) continue;
            q("reikalavimas-" + fold(kas).slice(0, 30), 34, L("Kaip įrodyti reikalavimą turėti " + kas + "?", "How do I prove the requirement “" + kas + "”?"), r);
            if (++roles >= 2) return true;
          }
          return false;
        });
      });
      var patirtis = rask(g.sprendimai, /per paskutini\w+ (\d+)\*? ?(?:\([a-z]+\) )?met\w+[^.|]{0,120}(?:tiekej|sutar|ivykd|savo jegomis)|tiekejas per paskutini\w+ (\d+)\*? ?(?:\([a-z]+\) )?met/);
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
    var kainos = pagalVarda(/ikainiu lentel|kain\w* (detalizavimo )?(lentel|form)|kiekiu (sarasas|lentel|ziniarast)|sanaud\w* (lentel|form)|price (table|form|schedule)/);
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
      var eb = g.ebvpd[0];
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
    return { klausimai: Q, faktai: F };
  }

  global.GP_KLAUSIMAI = { siulyk: siulyk, fold: fold, grupes: grupes, svarusVardas: svarusVardas };
})(typeof window !== "undefined" ? window : this);
