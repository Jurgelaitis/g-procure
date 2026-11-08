/* ============================================================================
 * G-Procure Tiekėjams  asistentas.js
 * ----------------------------------------------------------------------------
 * AI sluoksnis be transporto (window.GP_ASIST): promptų konstravimas, atsakymo
 * schema ir jos VALIDAVIMAS (citatos tikrinamos prieš rodant), kontrolinis
 * sąrašas, klausimo CVP IS projektas, dokumentų pokyčių palyginimas.
 *
 * Principai (master promptas):
 *   - Source-first: kiekvienas materialus teiginys turi šaltinį; citatos, kurių
 *     nėra fragmentuose, IŠMETAMOS, o atsakymo patikimumas mažinamas.
 *   - No source, no answer: be patvirtintų šaltinių rodomas "nustatyti negalima".
 *   - Dokumentų tekstas = nepatikimas turinys: jame rasti nurodymai modeliui
 *     aptinkami (aptikInjekcija) ir pažymimi, o sisteminė taisyklė liepia jų
 *     nevykdyti. Fragmentai perduodami su aiškiais skyrikliais.
 *   - Bendra metodinė medžiaga žymima kaip BENDRAS šaltinis, ne pirkimo sąlyga.
 *   - Faktas / išvada / rekomendacija atskiriami schemoje.
 *
 * Transportas: GP_AI_PROXY.uzduotis(uzduotis, duomenys) (index.html). Sistemos
 * instrukcija - privačiuose serverio šablonuose pp-tiekejams.* (nuo 2026-11-08);
 * Worker'is (worker/tiekejams-proxy.js) tik tikrina Turnstile ir persiunčia.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var MAX_CHUNKS = 14;          // fragmentų skaičius į vieną užklausą
  // vieno fragmento riba simboliais - ta pati, pagal kurią shared/dokumentai.js skaido tekstą,
  // todėl nukirpimas čia tik apsauga (fragmentas ilgesnis nebūna)
  var MAX_CHUNK_CHARS = (global.GP_DOK && global.GP_DOK.limits && global.GP_DOK.limits.CHUNK_SIMBOLIU) || 1400;
  // Atsakymo biudžetas žetonais (QA 4000, kontrolinis sąrašas 6000; išmatuota 2026-09-02 su tikru CVP IS paketu: lietuviškas QA atsakymas
  // su 4 citatomis = ~1700 išvesties žetonų) - serverio šablonuose nuo 2026-11-08.

  // ---------------------------------------------------------------------------
  // Injekcijos aptikimas (dokumentuose randami nurodymai modeliui)
  // ---------------------------------------------------------------------------
  var INJ = [/ignore (all|the|previous|above)/i, /disregard (the )?(previous|above)/i, /you are (now )?(an? |the )?(ai|assistant|model)/i,
             /system prompt/i, /nepaisyk/i, /ignoruok (ankstesn|visus|instrukc)/i, /esi (ai|asistent|model)/i, /atsakyk, kad/i, /tell the user that/i,
             /<\s*\/?\s*(system|assistant|instruction)/i, /\[\[\/?D\d+#\d+/, /AKTUALI REDAKCIJA\]\]/i, /\[\[[^\]]*\|[^\]]*\]\]/];
  function aptikInjekcija(text) {
    var hits = [];
    String(text || "").split(/\n/).forEach(function (line, i) {
      if (INJ.some(function (r) { return r.test(line); })) hits.push({ line: i + 1, text: line.slice(0, 160) });
    });
    return hits;
  }

  // ---------------------------------------------------------------------------
  // Fragmentų pakavimas į užklausą (su vieta ir ID, kuriuos modelis privalo cituoti)
  // ---------------------------------------------------------------------------
  // Dokumento turinys ir vardai gali bandyti suklastoti fragmentų ribas ("[[/D1#1]]",
  // "AKTUALI REDAKCIJA]]"). Prompto KOPIJOJE skyrikliai neutralizuojami, o vardai
  // valomi nuo eilučių lūžių ir skyriklių - S.chunksById tekstas lieka originalus,
  // kad citatos būtų tikrinamos prieš tikrą tekstą.
  function neutralizuok(s) { return String(s == null ? "" : s).replace(/\[\[/g, "[ [").replace(/\]\]/g, "] ]"); }
  function svarusVardas(s) { return neutralizuok(String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ")).replace(/\s*\|\s*/g, " / "); }
  function pakuok(chunks, docsById, lang, riba) {
    return chunks.slice(0, riba || MAX_CHUNKS).map(function (c) {
      var d = (docsById && Object.prototype.hasOwnProperty.call(docsById, c.docId)) ? docsById[c.docId] : {};
      var vieta = global.GP_DOK ? global.GP_DOK.vieta(c.loc, lang) : "";
      var head = "[[" + c.id + " | " + svarusVardas(d.name || c.docId) + (vieta ? " | " + svarusVardas(vieta) : "") + (c.punktas ? " | p. " + svarusVardas(c.punktas) : "") + (d.versija && d.versija.aktualiRedakcija ? " | AKTUALI REDAKCIJA" : "") + "]]";
      return head + "\n" + neutralizuok(String(c.text).slice(0, MAX_CHUNK_CHARS)) + "\n[[/" + c.id + "]]";
    }).join("\n\n");
  }

  /* DI užduotys serveryje (2026-11-08, naudotojo sprendimas - kodo apsauga): sistemos instrukcija - taisyklės LT / EN, pirkimo vykdytojo
     ir teisinio režimo sakinys (patvirtintas ar ne), atsakymo schema ir kalbos priminimas - privačiuose serverio šablonuose
     pp-tiekejams.atsakymas ir pp-tiekejams.kontrolinis. Modulis siunčia tik duomenis: kalbą, vykdytoją, režimą, ar naudotojas jį patvirtino,
     ir užklausą (pirkimas, būsena, dokumentų rinkinys, fragmentai, klausimas). Nepatvirtintas kontekstas = jokio įstatymo neteigiama. */
  function diDuomenys(lang, ctx, uzklausa) {
    ctx = ctx || {};
    var d = { kalba: lang === "en" ? "en" : "lt", uzklausa: uzklausa, patvirtinta: !!ctx.patvirtinta };
    var org = String(ctx.organizacija || "").trim();
    if (org) d.organizacija = org.slice(0, 300);
    if (ctx.rezimas === "PI" || ctx.rezimas === "VPI") d.rezimas = ctx.rezimas;
    return d;
  }



  // Kontrolinio sąrašo punktai (master prompto sąrašas), LT/EN
  var CHECKLIST = [
    { id: "registracija", lt: "Registracija ir techninis pasirengimas CVP IS", en: "Registration and technical readiness in CVP IS", bendra: true },
    { id: "terminas", lt: "Termino ir laiko zonos patikra", en: "Deadline and time-zone check" },
    { id: "forma", lt: "Pasiūlymo / paraiškos forma", en: "Bid / application form" },
    { id: "ebvpd", lt: "EBVPD", en: "ESPD" },
    { id: "pasalinimas", lt: "Pašalinimo pagrindų dokumentai", en: "Exclusion-ground documents" },
    { id: "kvalifikacija", lt: "Kvalifikacija ir ją pagrindžiantys dokumentai", en: "Qualification and supporting documents" },
    { id: "subjektai", lt: "Ūkio subjektai, subtiekėjai ir kvazisubtiekėjai", en: "Economic operators, subcontractors and quasi-subcontractors" },
    { id: "techninis", lt: "Techninis pasiūlymas", en: "Technical proposal" },
    { id: "kaina", lt: "Kainos arba sąnaudų forma", en: "Price or cost form" },
    { id: "galiojimas", lt: "Pasiūlymo galiojimas", en: "Bid validity" },
    { id: "uztikrinimas", lt: "Pasiūlymo užtikrinimas", en: "Bid security" },
    { id: "horizontalus", lt: "Nacionalinio saugumo, sankcijų, kilmės, ESG ir kiti horizontalūs reikalavimai", en: "National security, sanctions, origin, ESG and other horizontal requirements" },
    { id: "parasas", lt: "Elektroninis pasirašymas ir failų formatas", en: "Electronic signature and file format" },
    { id: "konfidencialumas", lt: "Konfidencialumo pagrindimas", en: "Confidentiality justification" },
    { id: "patikra", lt: "Galutinė pateikimo patikra", en: "Final submission check", bendra: true }
  ];
  // Paieškos užklausos kiekvienam punktui (kad į AI patektų tinkami fragmentai)
  var CHECKLIST_QUERIES = {
    registracija: "CVP IS registracija pateikimas elektroninėmis priemonėmis",
    terminas: "pasiūlymų pateikimo terminas data valanda paraiškų pateikimo terminas",
    forma: "pasiūlymo forma paraiškos forma priedas užpildyti",
    ebvpd: "EBVPD ESPD Europos bendrasis viešųjų pirkimų dokumentas",
    pasalinimas: "pašalinimo pagrindai pašalinimo pagrindų nebuvimas dokumentai pažyma",
    kvalifikacija: "kvalifikacijos reikalavimai kvalifikaciją patvirtinantys dokumentai patirtis apyvarta specialistai",
    subjektai: "subtiekėjai ūkio subjektai kurių pajėgumais remiamasi jungtinė veikla kvazisubtiekėjas",
    techninis: "techninis pasiūlymas techninė specifikacija atitiktis techniniai reikalavimai",
    kaina: "kaina kainos forma sąnaudos kainodara įkainiai PVM",
    galiojimas: "pasiūlymo galiojimo terminas galioja dienų",
    uztikrinimas: "pasiūlymo galiojimo užtikrinimas garantija laidavimas suma",
    horizontalus: "nacionalinio saugumo sankcijos kilmės šalis aplinkosaugos socialiniai reikalavimai deklaracija",
    parasas: "elektroninis parašas pasirašytas kvalifikuotu formatas failų pdf adoc",
    konfidencialumas: "konfidenciali informacija komercinė paslaptis pagrindimas",
    patikra: "pasiūlymo pateikimas CVP IS iki termino šifravimas vokai"
  };

  // Vykdytojo eilutė user žinutėje - tik faktas apie būseną, be įstatymo (jį nustato sistemos eilutė)
  function vykdytojoEilute(lang, ctx) {
    ctx = ctx || {};
    var L = lang === "en", org = String(ctx.organizacija || "").trim();
    var rez = ctx.rezimas === "PI" ? "PĮ" : ctx.rezimas === "VPI" ? "VPĮ" : (L ? "not determined" : "nenustatytas");
    return "\n" + (L ? "CONTRACTING ENTITY / AUTHORITY: " : "PIRKIMO VYKDYTOJAS: ") + (org || (L ? "not determined" : "nenustatytas")) +
      " | " + (L ? "LEGAL REGIME: " : "TEISINIS REŽIMAS: ") + rez + " (" + (ctx.patvirtinta ? (L ? "confirmed by the user" : "naudotojo patvirtinta") : (L ? "NOT confirmed" : "NEPATVIRTINTA")) + ")";
  }

  // Šiandienos data ir CVP IS būsena: be jų modelis siūlo „patikrinkite, ar terminas nesibaigė“ (2026-11-04)
  function busenosEilute(lang, b) {
    if (!b) return "";
    var en = lang === "en", e = [];
    if (b.siandien) e.push((en ? "TODAY: " : "ŠIANDIEN: ") + b.siandien);
    if (b.busena) e.push((en ? "CVP IS STATUS: " : "CVP IS BŪSENA: ") + b.busena);
    if (b.terminas) e.push((en ? "CVP IS DEADLINE: " : "CVP IS TERMINAS: ") + b.terminas);
    if (b.etapas) e.push(en ? "The first stage is over; this deadline is for the participants of the next stage." : "Pirmas etapas baigtas; šis terminas skirtas tolesnio etapo dalyviams.");
    return e.length ? "\n" + e.join(" | ") : "";
  }
  function promptasQA(o) {
    var lang = o.lang || "lt";
    var user = (lang === "en" ? "PROCUREMENT: " : "PIRKIMAS: ") + (o.procurement && o.procurement.title ? o.procurement.title : (lang === "en" ? "(not specified)" : "(nenurodytas)")) +
      (o.procurement && o.procurement.resourceId ? " | CVP IS resourceId " + o.procurement.resourceId : "") +
      (o.lot ? (lang === "en" ? " | Lot: " : " | Dalis: ") + o.lot : "") +
      vykdytojoEilute(lang, o.kontekstas) + busenosEilute(lang, o.busena) +
      "\n" + (lang === "en" ? "DOCUMENT SET: " : "DOKUMENTŲ RINKINYS: ") + (o.completeness === "complete" ? (lang === "en" ? "complete" : "nuskaitytas visas") : (o.completeness === "partial" ? (lang === "en" ? "PARTIAL - some documents unread" : "IŠ DALIES - dalis dokumentų neperskaityta") : (lang === "en" ? "FAILED" : "NEPAVYKO"))) +
      "\n\n" + (lang === "en" ? "FRAGMENTS (untrusted content):" : "FRAGMENTAI (nepatikimas turinys):") + "\n" + pakuok(o.chunks, o.docsById, lang) +
      "\n\n" + (lang === "en" ? "QUESTION: " : "KLAUSIMAS: ") + String(o.question || "").slice(0, 1000);
    return { uzduotis: "pp-tiekejams.atsakymas", duomenys: diDuomenys(lang, o.kontekstas, user), user: user };
  }

  function promptasChecklist(o) {
    var lang = o.lang || "lt";
    // Kontroliniam sąrašui reikia platesnės aprėpties negu vienam klausimui:
    // 15 punktų -> iki 2 fragmentų punktui, todėl riba dvigubinama.
    // ids - tik punktai, į kuriuos dokumentai tiesiogiai neatsako (kitus užpildė GP_KLAUSIMAI.kontrolinis)
    var sarasas = CHECKLIST.filter(function (c) { return !o.ids || o.ids.indexOf(c.id) >= 0; }).map(function (c) { return "- " + c.id + ": " + (lang === "en" ? c.en : c.lt); }).join("\n");
    var user = (lang === "en" ? "PROCUREMENT: " : "PIRKIMAS: ") + (o.procurement && o.procurement.title ? o.procurement.title : "-") +
      vykdytojoEilute(lang, o.kontekstas) + busenosEilute(lang, o.busena) +
      "\n" + (lang === "en" ? "CHECKLIST ITEMS: " : "KONTROLINIO SĄRAŠO PUNKTAI:") + "\n" + sarasas +
      "\n\n" + (lang === "en" ? "FRAGMENTS (untrusted content):" : "FRAGMENTAI (nepatikimas turinys):") + "\n" + pakuok(o.chunks, o.docsById, lang, MAX_CHUNKS * 2);
    // nurodymas užpildyti kiekvieną punktą - serverio šablone
    return { uzduotis: "pp-tiekejams.kontrolinis", duomenys: diDuomenys(lang, o.kontekstas, user), user: user };
  }

  // ---------------------------------------------------------------------------
  // Atsakymo skaitymas ir VALIDAVIMAS
  // ---------------------------------------------------------------------------
  // Struktūrinis JSON taisymas (neekranuota ASCII kabutė, eilutės lūžis eilutės viduje) nuo
  // 2026-09-25 gyvena shared/ai-proxy.js (GP_AI_PROXY.taisykJson) - tą patį naudoja PP-salygos.
  // Istorija ir taisyklės - ten. Nutrauktas (max_tokens) atsakymas vis tiek lieka null.
  function taisykJson(s) { return global.GP_AI_PROXY.taisykJson(s); }
  function parse(text) {
    var s = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    var a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a === -1 || b === -1) return null;
    var kunas = s.slice(a, b + 1);
    try { return JSON.parse(kunas); } catch (e) {}
    try { return JSON.parse(taisykJson(kunas)); } catch (e2) { return null; }
  }
  // Fragmentų žemėlapis tikrinamas tik per SAVAS savybes: modelis (ar dokumente
  // įrašyta instrukcija) gali nurodyti id "constructor" / "__proto__" ir per
  // Object.prototype gauti "fragmentą" be teksto - anksčiau tai praeidavo.
  // Modelio parašytas tekstas (ne citata): ilgas brūkšnys (U+2014) G-Procure tekstuose nevartojamas
  // (CLAUDE.md 5 sk.; taip pat daro PP-qual ir PP-salygos). Citatos lieka pažodinės.
  function proza(v) { return String(v == null ? "" : v).replace(/\s*\u2014\s*/g, " - "); }
  function fragmentas(chunksById, id) {
    if (!chunksById || id == null) return null;
    var key = String(id);
    if (!Object.prototype.hasOwnProperty.call(chunksById, key)) return null;
    var c = chunksById[key];
    return (c && typeof c.text === "string") ? c : null;
  }
  // Fragmente būna keli punktai: numeris - artimiausias prieš citatą, ne fragmento pradžios (2026-11-04: rodė „p. 10.1“ prie 11.1 punkto).
  // Citatos tiksliai neradus - jokio numerio, ne spėjimas.
  function punktasPrieCitatos(tekstas, citata) {
    var t = String(tekstas || ""), i = t.indexOf(String(citata || "").trim());
    if (i < 0) return null;
    var re = /(?:^|\n|\|\s*)(\d{1,3}(?:\.\d{1,3})+)\.?\s/g, m, nr = null, pr = t.slice(0, i + 1 + String(citata).match(/^\s*/)[0].length + 12);
    while ((m = re.exec(pr))) { if (m.index <= i + 12) nr = m[1]; if (re.lastIndex === m.index) re.lastIndex++; }
    return nr;
  }
  function tikrinkSaltinius(saltiniai, chunksById) {
    var ok = [], atmesti = [], matyta = Object.create(null);
    (Array.isArray(saltiniai) ? saltiniai : []).forEach(function (s) {
      var c = s ? fragmentas(chunksById, s.id) : null;
      if (!c) { atmesti.push({ id: s && s.id, priezastis: "nera_fragmento" }); return; }
      var q = String(s.citata || "").trim();
      var at = q ? global.GP_PAIESKA.citataAtitikimas(q, c.text) : { ok: false };
      if (!at.ok) { atmesti.push({ id: s.id, priezastis: "citata_nerasta", citata: q }); return; }
      // Ta pati citata iš to paties dokumento antrą kartą nerodoma (2026-09-22: modelis
      // kartais pateikia tą patį sakinį du kartus - vieną tikslų, kitą apytikslį)
      var raktas = c.docId + "|" + global.GP_PAIESKA.normCit(q);
      if (matyta[raktas]) return;
      matyta[raktas] = 1;
      ok.push({ id: s.id, citata: q.slice(0, 240), teiginys: proza(s.teiginys), docId: c.docId, loc: c.loc, punktas: punktasPrieCitatos(c.text, q), apytiksle: !at.tikslus });
    });
    return { ok: ok, atmesti: atmesti };
  }
  var PRAN = {
    lt: { nerasta: "Modelio pateiktos citatos nerastos dokumentuose - atsakymas nerodomas kaip faktas.", dalis: "Dalis citatų nepatvirtinta ({n}) - patikimumas sumažintas.", konfl: "Modelis nurodė konfliktą, bet antrasis variantas dokumentuose nerastas - konfliktas nerodomas.", neivert: "Modelis šio punkto neįvertino." },
    en: { nerasta: "The model's quotes were not found in the documents - the answer is not shown as fact.", dalis: "Some quotes were not verified ({n}) - confidence reduced.", konfl: "The model reported a conflict but the second variant was not found in the documents - the conflict is not shown.", neivert: "The model did not assess this item." }
  };
  function pran(lang, key, n) { return (PRAN[lang] || PRAN.lt)[key].replace("{n}", String(n || 0)); }
  function validuokQA(ans, chunksById, lang) {
    lang = lang === "en" ? "en" : "lt";
    if (!ans || typeof ans !== "object") return { status: "klaida" };
    var v = tikrinkSaltinius(ans.saltiniai, chunksById);
    var out = {
      status: ans.status === "nera_saltinio" || ans.status === "konfliktas" ? ans.status : "atsakyta",
      trumpas: proza(ans.trumpas), reiksme: proza(ans.reiksme),
      veiksmai: (ans.veiksmai || []).map(proza), salygos: (ans.salygos || []).map(proza),
      saltiniai: v.ok, atmesti: v.atmesti,
      konfliktai: [],
      patikimumas: ans.patikimumas === "aukstas" || ans.patikimumas === "vidutinis" ? ans.patikimumas : "nepakanka",
      patikimumo_paaiskinimas: proza(ans.patikimumo_paaiskinimas),
      ispejimai: (ans.ispejimai || []).map(proza),
      klausimas_cvpis: proza(ans.klausimas_cvpis)
    };
    // Konfliktas tikras tik kai bent DU variantai patvirtinti dokumentuose
    (Array.isArray(ans.konfliktai) ? ans.konfliktai : []).forEach(function (kf) {
      var vv = tikrinkSaltinius(kf && kf.variantai, chunksById).ok;
      if (vv.length >= 2) out.konfliktai.push({ tema: proza(kf && kf.tema), variantai: vv });
      else if (kf) out.ispejimai.push(pran(lang, "konfl"));
    });
    // No source, no answer: be patvirtintų šaltinių atsakymas nerodomas kaip faktas
    if (out.status === "atsakyta" && out.saltiniai.length === 0) {
      out.status = "nera_saltinio"; out.patikimumas = "nepakanka";
      out.ispejimai.push(pran(lang, "nerasta"));
    }
    if (v.atmesti.length && out.patikimumas === "aukstas") { out.patikimumas = "vidutinis"; out.ispejimai.push(pran(lang, "dalis", v.atmesti.length)); }
    if (out.konfliktai.length) out.status = "konfliktas";
    else if (out.status === "konfliktas") out.status = out.saltiniai.length ? "atsakyta" : "nera_saltinio";
    return out;
  }
  function validuokChecklist(ans, chunksById, lang, ids) {
    lang = lang === "en" ? "en" : "lt";
    // Neperskaitytas ar tuščias atsakymas NEGALI virsti "15 x nerasta" - tai
    // atrodytų kaip išvada, kad reikalavimų nėra. Grąžinam null, sąsaja rodo klaidą.
    if (!ans || typeof ans !== "object" || !Array.isArray(ans.punktai) || !ans.punktai.length) return null;
    var byId = Object.create(null);
    ans.punktai.forEach(function (p) { if (p && p.id) byId[String(p.id).trim().toLowerCase()] = p; });
    var punktai = CHECKLIST.filter(function (c) { return !ids || ids.indexOf(c.id) >= 0; }).map(function (c) {
      var p = byId[c.id];
      var neivertinta = !p;
      p = p || {};
      var v = tikrinkSaltinius(p.saltiniai, chunksById);
      var busena = ["privaloma", "su_salyga", "netaikoma", "nerasta", "patikslinti"].indexOf(p.busena) !== -1 ? p.busena : "nerasta";
      var santrauka = proza(p.santrauka), pastaba = proza(p.pastaba);
      // Būsenos su teiginiu (privaloma / su_salyga / netaikoma) reikalauja patvirtinto šaltinio:
      // be jo - "patikslinti" (jei buvo atmestų citatų) arba "nerasta"; santrauka tada
      // nerodoma kaip faktas, o perkeliama į pastabą kaip nepatvirtinta.
      if ((busena === "privaloma" || busena === "su_salyga" || busena === "netaikoma") && !v.ok.length) {
        busena = v.atmesti.length ? "patikslinti" : "nerasta";
        if (santrauka) { pastaba = (pastaba ? pastaba + " " : "") + "(" + (lang === "en" ? "unverified: " : "nepatvirtinta: ") + santrauka + ")"; santrauka = ""; }
      }
      // "nerasta" šalia PATVIRTINTO šaltinio yra prieštaravimas - keliam į "patikslinti"
      if (busena === "nerasta" && v.ok.length) busena = "patikslinti";
      if (neivertinta) { busena = "patikslinti"; pastaba = pran(lang, "neivert"); }
      return { id: c.id, lt: c.lt, en: c.en, bendra: !!c.bendra, busena: busena, santrauka: santrauka, pastaba: pastaba, saltiniai: v.ok, atmesti: v.atmesti, neivertinta: neivertinta };
    });
    return { punktai: punktai, ispejimai: (Array.isArray(ans.ispejimai) ? ans.ispejimai : []).map(proza) };
  }

  // ---------------------------------------------------------------------------
  // Klausimo CVP IS projektas (neutralus, be spaudimo) - determinuotas šablonas
  // ---------------------------------------------------------------------------
  function klausimoProjektas(o) {
    var lang = o.lang || "lt";
    var L = lang === "en";
    var eil = [];
    eil.push(L ? "Subject: request for clarification of procurement documents" : "Tema: prašymas paaiškinti pirkimo dokumentus");
    eil.push("");
    eil.push((L ? "Procurement: " : "Pirkimas: ") + (o.procurement && o.procurement.title ? o.procurement.title : "____") + (o.procurement && o.procurement.resourceId ? " (CVP IS ID " + o.procurement.resourceId + ")" : ""));
    if (o.lot) eil.push((L ? "Lot: " : "Pirkimo dalis: ") + o.lot);
    eil.push((L ? "Document: " : "Dokumentas: ") + (o.dokumentas || "____") + (o.vieta ? ", " + o.vieta : "") + (o.punktas ? (L ? ", clause " : ", punktas ") + o.punktas : ""));
    eil.push("");
    if (o.citata) eil.push((L ? "Quoted provision: " : "Cituojama nuostata: ") + "„" + String(o.citata).slice(0, 400) + "“");
    eil.push("");
    eil.push((L ? "Nature of the ambiguity: " : "Neaiškumo esmė: ") + (o.neaiskumas || "____"));
    eil.push("");
    eil.push((L ? "Question: " : "Klausimas: ") + (o.klausimas || "____"));
    eil.push("");
    eil.push(L ? "We kindly ask for a clarification via CVP IS. Thank you." : "Prašome pateikti paaiškinimą CVP IS priemonėmis. Dėkojame.");
    return eil.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Dokumentų pokyčiai: pastraipų lygio palyginimas (pridėta / pašalinta) tarp
  // dviejų to paties dokumento redakcijų. Kuri naujesnė - pagal datą pavadinime
  // arba žymą AKTUALI REDAKCIJA; teisinės reikšmės NEvertinam.
  // ---------------------------------------------------------------------------
  function normPara(t) { return global.GP_PAIESKA.fold(t).replace(/\s+/g, " ").trim(); }
  function palygink(senas, naujas) {
    var A = senas.blocks.map(function (b) { return b.text; }), B = naujas.blocks.map(function (b) { return b.text; });
    var setA = {}, setB = {};
    A.forEach(function (t) { setA[normPara(t)] = t; }); B.forEach(function (t) { setB[normPara(t)] = t; });
    var removed = A.filter(function (t) { return !setB[normPara(t)]; });
    var added = B.filter(function (t) { return !setA[normPara(t)]; });
    // "Pakeista": pašalinta ir pridėta pastraipos, kurių pradžia (punkto nr. arba pirmi 6 žodžiai) sutampa
    var key = function (t) { var p = global.GP_DOK.punktas(t); return p ? "p:" + p : normPara(t).split(" ").slice(0, 6).join(" "); };
    var remByKey = {}; removed.forEach(function (t) { remByKey[key(t)] = t; });
    var changed = [], addedOnly = [];
    added.forEach(function (t) { var k = key(t); if (remByKey[k]) { changed.push({ buvo: remByKey[k], tapo: t }); delete remByKey[k]; } else addedOnly.push(t); });
    var removedOnly = Object.keys(remByKey).map(function (k) { return remByKey[k]; });
    return { added: addedOnly, removed: removedOnly, changed: changed, senas: senas.name, naujas: naujas.name };
  }
  // Suporuoja redakcijas: tas pats "bazinis" pavadinimas (be datų / AKTUALI REDAKCIJA / versijos žymų)
  function bazinisVardas(name) {
    return global.GP_PAIESKA.fold(String(name || "").split(" › ").pop())
      .replace(/\.(docx|pdf|xlsx|xml|txt)$/i, "").replace(/aktuali\s*redakcija/g, "").replace(/20\d{2}[ ._-]?\d{2}[ ._-]?\d{2}/g, "")
      .replace(/\(\d+\)|v\d+|versija\s*\d+|redakcija/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function redakcijuPoros(docs) {
    var groups = Object.create(null);
    docs.filter(function (d) {
      if (d.parseStatus === "unsupported" || !d.blocks || !d.blocks.length) return false;
      // CVP IS techniniai failai - ne pirkimo dokumentų redakcijos (2026-11-04: 26 iš 35 paketų rodė XML ir PDF kaip „pakeitimus“)
      if (/(^|[\/ ›])(readme\.txt|espd-request\.\w+)$/i.test(String(d.name || ""))) return false;
      // Serijiniai paaiškinimai / atsakymai (be žymos AKTUALI REDAKCIJA ar pakeitimo) -
      // tai skirtingi dokumentai, ne redakcijos: jų neporuojam (anksčiau "Atsakymas
      // 08-01" ir "Atsakymas 08-10" rodėsi kaip "pašalinta / pridėta").
      var v = d.versija || {};
      if (v.paaiskinimas && !v.aktualiRedakcija && !v.pakeitimas) return false;
      return true;
    }).forEach(function (d) {
      // Tik to paties formato: ištrauktas PDF ir Word tekstas skiriasi ir tada, kai dokumentas tas pats
      var k = bazinisVardas(d.name); if (!k) return; k += "|" + String(d.name || "").split(".").pop().toLowerCase(); (groups[k] = groups[k] || []).push(d);
    });
    var poros = [];
    Object.keys(groups).forEach(function (k) {
      var g = groups[k]; if (g.length < 2) return;
      // Raktas: žyma AKTUALI REDAKCIJA (2) svarbiau nei data (1); tada data didėjančia.
      var rk = function (d) { var v = d.versija || {}; return (v.aktualiRedakcija ? 2 : 0) + (v.data ? 1 : 0); };
      g.sort(function (a, b) {
        var ka = rk(a), kb = rk(b);
        if (ka !== kb) return ka - kb;
        var da = (a.versija || {}).data || "", db = (b.versija || {}).data || "";
        return da.localeCompare(db);
      });
      for (var i = 0; i + 1 < g.length; i++) {
        var a = g[i], b = g[i + 1];
        var neaiski = rk(a) === rk(b) && (((a.versija || {}).data || "") === ((b.versija || {}).data || ""));
        var dif = palygink(a, b);
        if (!dif.changed.length && !dif.added.length && !dif.removed.length) continue;     // ta pati kopija - ne redakcija
        poros.push({ senas: a, naujas: b, neaiski: neaiski, diff: dif });
      }
    });
    return poros;
  }

  global.GP_ASIST = {
    version: "0.2.0",
    CHECKLIST: CHECKLIST, CHECKLIST_QUERIES: CHECKLIST_QUERIES,
    MAX_CHUNKS: MAX_CHUNKS,
    taisykJson: taisykJson,
    aptikInjekcija: aptikInjekcija,
    promptasQA: promptasQA, promptasChecklist: promptasChecklist, diDuomenys: diDuomenys, vykdytojoEilute: vykdytojoEilute,
    parse: parse, validuokQA: validuokQA, validuokChecklist: validuokChecklist, tikrinkSaltinius: tikrinkSaltinius, fragmentas: fragmentas, neutralizuok: neutralizuok, svarusVardas: svarusVardas,
    klausimoProjektas: klausimoProjektas,
    palygink: palygink, redakcijuPoros: redakcijuPoros, bazinisVardas: bazinisVardas
  };
})(typeof window !== "undefined" ? window : this);
