/* ============================================================================
 * G-Procure  shared/parengtis.js
 * ----------------------------------------------------------------------------
 * „Ar pirkimas parengtas skelbti?“ (window.GP_PARENGTIS, tobulinimo planas A4,
 * 2026-09-26, bandomoji). Pirkimo dokumentų paketo kryžminė patikra naršyklėje:
 * skelbimas, SPS, BPS, techninė specifikacija, sutartis ir priedai lyginami
 * tarpusavyje ir su pirkimo kortele. Tik deterministinės taisyklės - AI čia
 * nėra: neskelbti dokumentai yra jautriausias turinys sistemoje, o AI žingsnis
 * (tik abejotinoms tekstų poroms) - atskiras naudotojo sprendimas.
 *
 * Įėjimas - shared/dokumentai.js (GP_DOK) dokumentai su blokais ir vieta.
 * Išėjimas - radiniai su abiem vietomis (dokumentas, vieta, citata), lygiu ir
 * teisės nuoroda iš shared/teises-nuorodos.js, bei patikrų sąrašas: kas
 * patikrinta be pastabų, kas netaikoma, kas nepatikrinta ir kodėl.
 * „Be pastabų“ reiškia tik tai, kad apibrėžtos patikros praėjo šiai paketo
 * versijai - ne teisinį patvirtinimą.
 *
 * Taisyklių katalogas išmatuotas su 4 viešais LITGRID CVP IS paketais
 * (9683631, 9566057, 9744290, 9495168; 2026-09-26) - rezultatai ir žinomi
 * apribojimai: CLAUDE.md, shared/pirkimo-kortele.js eilutė ir testai.
 * Nieko nesaugo ir nesiunčia.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  /* ---------------------------------------------------------------- tekstai */
  var TXT = {
    lt: {
      vaidmuo: { skelbimas: "Skelbimas", sps: "SPS", bps: "BPS", ts: "Techninė specifikacija", sutartis: "Sutarties projektas (specialiosios sąlygos)",
                 sutartis_bendrosios: "Sutarties bendrosios sąlygos", pasiulymas: "Pasiūlymo forma", paraiska: "Paraiškos forma", ebvpd: "EBVPD",
                 paaiskinimas: "Paaiškinimai ir atsakymai", priedas: "Kitas priedas", kita: "Kita" },
      grupe: { paketas: "Paketas", skelbimas: "Skelbimas ir dokumentai", kortele: "Kortelė ir dokumentai", aiskumas: "Dokumentų aiškumas", taisykles: "Taisyklės" },
      patikra: {
        dokumentai: "Ar yra visi dokumentai pagal būdą", priedai: "SPS priedų sąrašas ir failai", neperskaityti: "Perskaityti failai",
        kalba: "Pasiūlymų kalba: skelbimas ir SPS", pavadinimas: "Pavadinimas: skelbimas ir SPS", dalys: "Dalys: skelbimas ir SPS",
        terminas: "Terminas: skelbimas ir SPS grafikas", skelbimo_data: "Paskelbimo data: skelbimas ir SPS grafikas",
        trukme: "Sutarties trukmė: skelbimas ir sutartis", budas: "Pirkimo būdas: skelbimas ir SPS", vykdytojas: "Pirkimo vykdytojas: skelbimas ir SPS",
        kortele: "Kortelė ir skelbimas", punktai: "Pasikartojantys punktų numeriai", alternatyvos: "Paliktos šablono alternatyvos",
        laukai: "Neužpildyti pasirinkimo laukai", lenteles: "Nuorodos į lenteles", priedu_nuorodos: "Nuorodos į SPS priedus", grafikas: "SPS grafiko datų tvarka"
      },
      trukstaDok: "Pakete neradau: {d}. Jei jis pateikiamas kitu pavadinimu, pakeiskite failo vaidmenį sąraše.",
      beBudo: "Pirkimo būdas nežinomas (nėra kortelės ir skelbimo) - tikrinami tik pagrindiniai dokumentai: SPS, techninė specifikacija ir sutartis.",
      priedoNera: "SPS priedų sąraše nurodytas {n} priedas „{p}“, bet pakete tokio failo neradau. Jei jis teikiamas atskirai (pvz., tik pasirašius konfidencialumo įsipareigojimą), viskas gerai.",
      priedoPerdaug: "Failas „{f}“ pavadintas SPS {n} priedu, bet SPS priedų sąraše tokio numerio nėra.",
      neperskaitytas: "Neperskaityti failai ({n}): {s}. Jų turinys netikrintas.",
      versijos: "Pakete {n} skelbimo versijos - naudotas naujausias ({f}).",
      kalba: "SPS leidžia pasiūlymą teikti {x} kalba, o skelbime pasiūlymų kalba nurodyta tik {y}. Jei informacija nesutampa, teisinga laikoma skelbimo - suderinkite SPS ir skelbimą.",
      kalbaSkelb: "Skelbime pasiūlymus leidžiama teikti {x} kalba, o SPS šios kalbos pasiūlymui nenumato. Teisinga laikoma skelbimo informacija - suderinkite.",
      kalbaGerai: "Pasiūlymų kalba sutampa: {x}.",
      pavadinimas: "Pavadinimai skelbime ir SPS labai skiriasi - patikrinkite, ar tai tas pats pirkimas.",
      dalysNe: "Skelbime {s}, o SPS - {p}. Teisinga laikoma skelbimo informacija.",
      dalysViena: "viena pirkimo dalis", dalysKelios: "{n} pirkimo dalys", dalysNeskaidomas: "pirkimas į dalis neskaidomas", dalysSkaidomas: "pirkimas skaidomas į {n} dalis",
      terminas: "Skelbime pasiūlymų ar paraiškų terminas - {s}, o SPS grafike - {p}.",
      skelbimoData: "Skelbimas išsiųstas {s}, o SPS grafike paskelbimo data - {p}.",
      trukme: "Skelbime sutarties trukmė - {s} mėn., o sutartyje rasti terminai: {p}. Jei tai skirtingi dalykai (pvz., sutarties galiojimas ir darbų terminas), viskas gerai.",
      budas: "Skelbime pirkimo būdas - {s}, o SPS nurodyta: {p}.",
      vykdytojas: "Skelbime pirkėjas - {s}, o SPS antraštėje - {p}.",
      kortele: "Kortelėje {l} - {k}, o {kur} - {d}. Atnaujinkite kortelę arba dokumentą.",
      korteleSkelbime: "skelbime", korteleSps: "SPS",
      punktai: "Punktas {n} kartojasi {k} kartus su skirtingu tekstu - tikėtina, paliktos abi šablono alternatyvos. Palikite vieną.",
      alternatyvos: "Vienoje pastraipoje - dvi to paties turinio formuluotės, tikėtina, šablono alternatyvos. Palikite vieną.",
      laukai: "Neužpildytas pasirinkimo laukas („{t}“). Jei jį pildo tiekėjas ar jis pildomas pasirašant sutartį, viskas gerai.",
      lenteles: "Nuoroda į {n} lentelę, bet šiame dokumente tokios lentelės antraštės nėra.",
      priedu_nuorodos: "Nuoroda į SPS {n} priedą, bet SPS priedų sąraše tokio numerio nėra.",
      grafikas: "SPS grafiko datos ne iš eilės: „{a}“ ({ad}) po „{b}“ ({bd}).",
      netaikoma: "netaikoma", nepatikrinta: "nepatikrinta", beSkelbimo: "nėra skelbimo", beSps: "nėra SPS", beSutarties: "nėra sutarties",
      beKorteles: "kortelė nepasirinkta", beDuomenu: "dokumente nerasta", beGrafiko: "SPS grafiko nerasta", bePriedu: "SPS priedų sąrašo nerasta",
      pakeitimoData: "įkeltas skelbimo pakeitimas - pirminio paskelbimo datos jame nėra",
      laukuPav: { pavadinimas: "pavadinimas", verte: "vertė", budas: "būdas", bvpz: "BVPŽ kodas", dalys: "dalys", trukmeMen: "sutarties trukmė",
                  pasiulymuTerminas: "pasiūlymų terminas", paskelbimas: "paskelbimo data", vykdytojas: "vykdytojas", rezimas: "režimas" },
      men: "mėn."
    },
    en: {
      vaidmuo: { skelbimas: "Notice", sps: "SPS", bps: "BPS", ts: "Technical specification", sutartis: "Draft contract (special conditions)",
                 sutartis_bendrosios: "General contract conditions", pasiulymas: "Tender form", paraiska: "Application form", ebvpd: "ESPD",
                 paaiskinimas: "Clarifications and answers", priedas: "Other annex", kita: "Other" },
      grupe: { paketas: "Package", skelbimas: "Notice and documents", kortele: "Card and documents", aiskumas: "Clarity of documents", taisykles: "Rules" },
      patikra: {
        dokumentai: "All documents for the procedure", priedai: "SPS list of annexes and files", neperskaityti: "Files read",
        kalba: "Tender language: notice and SPS", pavadinimas: "Title: notice and SPS", dalys: "Lots: notice and SPS",
        terminas: "Deadline: notice and SPS schedule", skelbimo_data: "Publication date: notice and SPS schedule",
        trukme: "Contract duration: notice and contract", budas: "Procedure: notice and SPS", vykdytojas: "Contracting body: notice and SPS",
        kortele: "Card and notice", punktai: "Repeated clause numbers", alternatyvos: "Template alternatives left in",
        laukai: "Unfilled choice fields", lenteles: "References to tables", priedu_nuorodos: "References to SPS annexes", grafikas: "Order of SPS schedule dates"
      },
      trukstaDok: "Not found in the package: {d}. If it has another name, change the file's role in the list.",
      beBudo: "The procedure is unknown (no card and no notice) - only the main documents are checked: SPS, technical specification and contract.",
      priedoNera: "The SPS list of annexes names annex {n} “{p}”, but no such file is in the package. If it is provided separately (e.g. only after a confidentiality undertaking), that is fine.",
      priedoPerdaug: "File “{f}” is named SPS annex {n}, but the SPS list of annexes has no such number.",
      neperskaitytas: "Files not read ({n}): {s}. Their content was not checked.",
      versijos: "The package has {n} notice versions - the latest was used ({f}).",
      kalba: "The SPS allows tenders in {x}, while the notice states only {y}. Where they differ, the notice prevails - align the SPS and the notice.",
      kalbaSkelb: "The notice allows tenders in {x}, but the SPS does not provide for this language for the tender. The notice prevails - align them.",
      kalbaGerai: "Tender language matches: {x}.",
      pavadinimas: "The titles in the notice and the SPS differ a lot - check that this is the same procurement.",
      dalysNe: "The notice has {s}, while the SPS says {p}. The notice prevails.",
      dalysViena: "one lot", dalysKelios: "{n} lots", dalysNeskaidomas: "the procurement is not divided into lots", dalysSkaidomas: "the procurement is divided into {n} lots",
      terminas: "The deadline in the notice is {s}, while the SPS schedule says {p}.",
      skelbimoData: "The notice was dispatched on {s}, while the SPS schedule gives {p} as the publication date.",
      trukme: "The notice gives a contract duration of {s} months, while the contract mentions: {p}. If these are different things (e.g. contract validity and works period), that is fine.",
      budas: "The notice gives the procedure as {s}, while the SPS says: {p}.",
      vykdytojas: "The buyer in the notice is {s}, while the SPS heading says {p}.",
      kortele: "On the card the {l} is {k}, while {kur} it is {d}. Update the card or the document.",
      korteleSkelbime: "in the notice", korteleSps: "in the SPS",
      punktai: "Clause {n} appears {k} times with different text - both template alternatives were probably left in. Keep one.",
      alternatyvos: "One paragraph has two wordings of the same content, probably template alternatives. Keep one.",
      laukai: "An unfilled choice field (“{t}”). If the supplier fills it in or it is completed at signature, that is fine.",
      lenteles: "Reference to table {n}, but this document has no table with that caption.",
      priedu_nuorodos: "Reference to SPS annex {n}, but the SPS list of annexes has no such number.",
      grafikas: "SPS schedule dates are out of order: “{a}” ({ad}) after “{b}” ({bd}).",
      netaikoma: "not applicable", nepatikrinta: "not checked", beSkelbimo: "no notice", beSps: "no SPS", beSutarties: "no contract",
      beKorteles: "no card selected", beDuomenu: "not found in the document", beGrafiko: "no SPS schedule found", bePriedu: "no SPS list of annexes found",
      pakeitimoData: "a change notice was loaded - it does not contain the original publication date",
      laukuPav: { pavadinimas: "title", verte: "value", budas: "procedure", bvpz: "CPV code", dalys: "lots", trukmeMen: "contract duration",
                  pasiulymuTerminas: "tender deadline", paskelbimas: "publication date", vykdytojas: "contracting body", rezimas: "regime" },
      men: "months"
    }
  };
  function tx(l) { return TXT[l === "en" ? "en" : "lt"]; }
  function sub(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  /* ---------------------------------------------------------------- pagalbinės */
  var DIAKR = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
  function be(s) { return String(s || "").toLowerCase().replace(/[ąčęėįšųūž]/g, function (c) { return DIAKR[c]; }); }
  function trumpas(vardas) { return String(vardas || "").split(" › ").pop().split("/").pop(); }
  function kelias(vardas) { return String(vardas || "").split(" › ").join("/"); }
  function vieta(loc, l) { return global.GP_DOK && global.GP_DOK.vieta ? global.GP_DOK.vieta(loc, l) : ""; }
  function kab(s, l) { return l === "en" ? "\u201c" + s + "\u201d" : "\u201e" + s + "\u201c"; }
  function iskarpa(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > (n || 220) ? s.slice(0, (n || 220) - 1) + "…" : s; }
  /* JS \w ir \b lietuviškų raidžių neatpažįsta („Paraiškų gavimas“ su \w* neatitinka) - raidės rašomos klase. */
  var R = "[a-zA-Z0-9ąčęėįšųūžĄČĘĖĮŠŲŪŽ]";
  /* Lentelės eilutės „7.3. | LT tekstas | EN tekstas“ lietuviškas langelis: pirmas, kuris nėra vien punkto numeris. */
  function eurTekstas(n) {
    var s = Math.round(+n || 0).toString(), out = "";
    while (s.length > 3) { out = "\u00a0" + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out + " EUR";
  }
  function lt(t) {
    var c = String(t || "").split(" | ");
    for (var i = 0; i < c.length; i++) if (!/^\s*\d+(?:\.\d+)*\.?\s*$/.test(c[i])) return c[i].trim();
    return c[0].trim();
  }

  /* Dokumento eilutės su vieta: DOCX - pastraipos ir lentelių eilutės (viena eilutė), PDF - puslapio eilutės. */
  function eilutes(doc) {
    var out = [];
    (doc.blocks || []).forEach(function (b, bi) {
      String(b.text || "").split(/\n/).forEach(function (t, li) {
        t = t.replace(/\s+/g, " ").trim();
        if (t) out.push({ t: t, loc: b.loc, bi: bi, li: li });
      });
    });
    return out;
  }
  function docVieta(doc, e, l) { return { dok: doc.id, failas: trumpas(doc.name), vieta: e ? vieta(e.loc, l) : "", citata: e ? iskarpa(e.t) : "" }; }

  /* ---------------------------------------------------------------- vaidmenys */
  /* Dokumento vaidmuo pagal failo vardą ir pradžios tekstą (GP_DOK.rusis - tik pagalbinė žyma: tikruose LITGRID
     paketuose „1.1 Bendrosios pirkimo sąlygos (SPS)“ jai yra SPS, o „... draudimo bendrovėms“ - BPS). */
  function vaidmuo(doc) {
    var n = be(trumpas(doc.name)), kel = be(kelias(doc.name));
    var pradzia = be((doc.blocks || []).slice(0, 6).map(function (b) { return b.text; }).join(" ").slice(0, 600));
    if (/ebvpd|espd/.test(kel)) return "ebvpd";
    if (doc.rusis === "Skelbimas" || /contract\s+notice|contest\s+notice|skelbimas\s+apie\s+pirkim/.test(n)) return "skelbimas";
    if (/atsakym|klausim|paaiskinim|patikslinim/.test(n)) return "paaiskinimas";
    // Sutarties dokumentai: „SS ...“, „... sutarties SS / BS“, „Specialiosios Sutarties sąlygos“
    var sutarties = /(specialiosios|bendrosios)\s+sutarties\s+salyg|sutarties\s+(specialiosios|bendrosios)\s+salyg|sutarties\s+(ss|bs)\b|\(ss\)|\(bs\)/.test(n);
    if (sutarties) return /bendrosios|\bbs\b|\(bs\)/.test(n) ? "sutartis_bendrosios" : "sutartis";
    if (/^ss\s*\d/.test(n)) return "priedas";                                   // sutarties priedai
    if (/pasiulymo\s+forma|pirminio_galutinio|tender\s+form/.test(n)) return "pasiulymas";
    if (/paraiskos\s+forma|application\s+form/.test(n)) return "paraiska";
    if (/bendrosios\s+pirkimo\s+salyg|\bbps\b/.test(n)) return "bps";
    if (/specialiosios\s+pirkimo\s+salyg/.test(n) || (/\bsps\b/.test(n) && !/\bsps\s*\d/.test(n))) return "sps";
    if (/^\s*(sps\s*)?\d{1,2}(\s*priedas|\.)?\s*(\.|\s)\s*techni\w+\s+specifikacij|^\s*(sps\s*)?\d{1,2}\s*priedas\.?\s+techni\w+\s+(specifikacij|uzduot)|^techni\w+\s+(specifikacij|uzduot)|_tu\.pdf$/.test(n)) return "ts";
    if (/techni\w+\s+specifikacij/.test(n) && !/pried(as|o)\s+nr|\d\s+priedo\s+\d/.test(n)) return "ts";
    if (/specialiosios\s+pirkimo\s+salygos/.test(pradzia)) return "sps";
    if (/bendrosios\s+pirkimo\s+salygos/.test(pradzia)) return "bps";
    if (/pried|annex/.test(n)) return "priedas";
    return "kita";
  }

  /* Pagrindinis kiekvieno vaidmens dokumentas: skelbimui - naujausias pagal išsiuntimo datą ir versiją. */
  function skelbimoInfo(doc) {
    var t = (doc.blocks || []).map(function (b) { return b.text; }).join("\n");
    var d = /Skelbimo\s+i[šs]siuntimo\s+data\s*:\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/i.exec(t);
    var v = /Skelbimo\s+identifikatorius\s*\/\s*versija\s*:\s*\S+(?:\s+\S+){0,5}?\s+(\d{2})\s*$/im.exec(t);
    return { tekstas: t, issiusta: d ? d[3] + "-" + d[2] + "-" + d[1] + (d[4] ? "T" + d[4] + ":" + d[5] : "") : "", versija: v ? +v[1] : 0 };
  }
  function pagrindiniai(docs, vaidmenys) {
    var P = {}, grupes = {};
    docs.forEach(function (d) { var r = vaidmenys[d.id]; (grupes[r] = grupes[r] || []).push(d); });
    Object.keys(grupes).forEach(function (r) {
      var g = grupes[r].filter(function (d) { return (d.blocks || []).length; });
      if (!g.length) return;
      if (r === "skelbimas") {
        g.sort(function (a, b) { var x = skelbimoInfo(a), y = skelbimoInfo(b); return (y.issiusta || "").localeCompare(x.issiusta || "") || y.versija - x.versija; });
      } else if (r === "sps" || r === "bps" || r === "sutartis" || r === "ts") {
        // Kelių kandidatų atveju - tas, kurio pradžioje yra dokumento antraštė, o tada - ilgiausias
        var ant = { sps: /specialiosios\s+pirkimo\s+salygos/, bps: /bendrosios\s+pirkimo\s+salygos/, sutartis: /sutart/, ts: /techni\w+\s+(specifikacij|uzduot)/ }[r];
        g.sort(function (a, b) {
          var pa = ant.test(be((a.blocks || []).slice(0, 4).map(function (x) { return x.text; }).join(" "))) ? 1 : 0;
          var pb = ant.test(be((b.blocks || []).slice(0, 4).map(function (x) { return x.text; }).join(" "))) ? 1 : 0;
          return pb - pa || b.blocks.length - a.blocks.length;
        });
      }
      P[r] = g[0];
      P[r + "Visi"] = g;
    });
    return P;
  }

  /* ---------------------------------------------------------------- faktai iš SPS */
  function spsFaktai(doc) {
    var E = eilutes(doc), f = { eil: E };
    // Antraštė ir pavadinimas: po „SPECIALIOSIOS PIRKIMO SĄLYGOS“ iki datos ar „TURINYS“
    for (var i = 0; i < Math.min(E.length, 25); i++) {
      if (!/specialiosios\s+pirkimo\s+salygos/.test(be(E[i].t))) continue;
      f.antraste = E[i];
      var org = global.GP_ORG ? global.GP_ORG.rask(E[i].t) || (i > 0 ? global.GP_ORG.rask(E[i - 1].t) : null) : null;
      if (org) f.organizacija = { id: org.id, pav: org.pavadinimas, e: E[i] };
      var pav = [], pe = null;
      for (var j = i + 1; j < Math.min(E.length, i + 6); j++) {
        var t = lt(E[j].t);
        if (/^(turinys|contents)\b/i.test(t) || /^\d{4}\s*m\.\s|^\d{4}-\d{2}-\d{2}$/.test(t)) break;
        pav.push(t); pe = pe || E[j];
      }
      if (pav.length) f.pavadinimas = { t: pav.join(" "), e: pe };
      break;
    }
    // Būdas ir pirkimo rūšis
    E.forEach(function (e) {
      var t = lt(e.t);
      var m = /^(?:\d+(?:\.\d+)*\.?\s+)?Vykdom\w+\s+(skelbiamos\s+derybos|atviras\s+konkursas|ribotas\s+konkursas|neskelbiamos\s+derybos|konkurencinis\s+dialogas)/i.exec(t);
      if (m && !f.budas) f.budas = { t: m[1].toLowerCase(), e: e };
      var r = /Vykdomas\s+(supaprastintas|tarptautin\w*)\s+pirkimas/i.exec(t);
      if (r && !f.rusis) f.rusis = { t: /^supapr/i.test(r[1]) ? "supaprastintas" : "tarptautinis", e: e };
    });
    // Dalys
    E.forEach(function (e) {
      var t = lt(e.t);
      if (f.dalys) return;
      if (/dalis\s+neskaidomas|neskaidomas\s+[iį]\s+dal/i.test(t)) f.dalys = { n: 0, e: e };
      else { var m = /skaidomas\s+[iį]\s+(\d+)\s+(?:\(\S+\)\s+)?dal/i.exec(t); if (m) f.dalys = { n: +m[1], e: e }; }
    });
    // Pasiūlymų kalba
    f.kalbos = [];
    var KALBA = "(?:lietuvi[ųu]|angl[ųu]|vokie[čc]i[ųu]|lenk[ųu]|latvi[ųu]|est[ųu]|rus[ųu]|pranc[ūu]z[ųu])";
    var FRAZE = new RegExp("(" + KALBA + "(?:\\s*(?:,|arba|ir|bei|ar)\\s*" + KALBA + ")*)\\s+kalb(?:a|omis|ą)\\b", "gi");
    E.forEach(function (e) {
      var t = lt(e.t);
      if (!/kalb/i.test(t) || !/pateik/i.test(t)) return;
      var m, nuo = 0; FRAZE.lastIndex = 0;
      while ((m = FRAZE.exec(t))) {
        var subjektas = t.slice(nuo, m.index); nuo = m.index + m[0].length;
        var kalbos = [];
        if (/lietuvi/i.test(m[1])) kalbos.push("lt");
        if (/angl/i.test(m[1])) kalbos.push("en");
        if (/vokie/i.test(m[1])) kalbos.push("de");
        if (/lenk/i.test(m[1])) kalbos.push("pl");
        if (/latvi/i.test(m[1])) kalbos.push("lv");
        if (/est[ųu]/i.test(m[1])) kalbos.push("et");
        if (/rus[ųu]/i.test(m[1])) kalbos.push("ru");
        if (/pranc/i.test(m[1])) kalbos.push("fr");
        var pasiulymui = /pasi[ūu]lym|parai[šs]k/i.test(subjektas) && !/^\W*kiti\s+dokument/i.test(subjektas.replace(/^[\s,;]+/, ""));
        f.kalbos.push({ pasiulymui: pasiulymui, kalbos: kalbos, e: e });
      }
    });
    // Grafikas: lentelės eilutės, kurių paskutinis langelis - data
    f.grafikas = [];
    E.forEach(function (e) {
      var c = e.t.split(" | "), pask = c[c.length - 1].trim();
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pask);
      if (!m || c.length < 2 || !e.loc || !e.loc.table) return;
      var et = c.filter(function (x) { return !/^\d+(?:\.\d+)*\.?$/.test(x.trim()); })[0] || "";
      if (et === pask) return;
      f.grafikas.push({ etapas: et.trim(), data: pask, e: e });
    });
    // Priedų sąrašas: „N priedas – Pavadinimas“
    f.priedai = [];
    E.forEach(function (e) {
      var t = lt(e.t);
      var m = /^(\d{1,2})\s+priedas\s*[–-]\s*(.{3,})$/i.exec(t);
      if (m && !f.priedai.some(function (p) { return p.n === +m[1]; })) f.priedai.push({ n: +m[1], pav: m[2].replace(/\s*\(.*$/, "").replace(/[.\s]+$/, ""), e: e });
    });
    return f;
  }

  /* ---------------------------------------------------------------- faktai iš sutarties */
  function sutartiesTrukmes(doc) {
    var out = [];
    eilutes(doc).forEach(function (e) {
      // Visi langeliai: sutarčių lentelėse „pavadinimas | turinys“, o terminas - turinyje; „[Sąvoka 1.1.2.4. punktas]“ turi taškų
      var t = e.t, m, re = new RegExp("(?:(?:prek" + R + "+\\s+tiekimo|darb" + R + "+\\s+atlikimo|paslaug" + R + "+\\s+teikimo|sutarties\\s+(?:galiojimo|vykdymo))\\s+terminas(?:\\s*\\[[^\\]]{0,60}\\])?[^.:\\[|]{0,60}?(?::|–|-|negali\\s+b[ūu]ti\\s+ilgesnis\\s+kaip|yra)|sutartis\\s+galioja)\\s*(\\d{1,3})\\s*(?:\\([^)]{0,40}\\)\\s*)?(m[ėe]n" + R + "*|met" + R + "*)", "gi");
      while ((m = re.exec(t))) {
        var men = /^met/i.test(m[2]) ? +m[1] * 12 : +m[1];
        if (men > 0 && men <= 600) out.push({ men: men, e: e, tekstas: iskarpa(m[0], 160) });
      }
    });
    return out;
  }

  /* ---------------------------------------------------------------- aiškumas */
  var PUNKTAS = /^(\d{1,2}(?:\.\d{1,3}){1,4})\.?\s+(\S.*)$/;
  var LAUKAI = /Pasirinkite elementą|Choose an item|Spustelėkite arba bakstelėkite čia|Click or tap here to enter text|Įveskite tekstą/i;
  function aiskumoRadiniai(doc, l, sps) {
    var X = tx(l), out = { punktai: [], alternatyvos: [], laukai: [], lenteles: [], priedu_nuorodos: [] };
    var E = eilutes(doc), docx = /^(docx|odt)$/i.test(doc.ext || "");
    // Pasikartojantys punktų numeriai (tik DOCX: PDF eilutėse numeriai lūžta kartu su stulpeliais)
    if (docx) {
      var pagal = {};
      (doc.blocks || []).forEach(function (b) {
        var t = String(b.text || "").split("\n")[0].split(" | ")[0].trim();
        var m = PUNKTAS.exec(t);
        if (!m) return;
        (pagal[m[1]] = pagal[m[1]] || []).push({ b: b, tekstas: m[2] });
      });
      Object.keys(pagal).forEach(function (n) {
        var g = pagal[n];
        if (g.length < 2) return;
        var skirtingi = g.filter(function (x, i) { return g.findIndex(function (y) { return be(y.tekstas) === be(x.tekstas); }) === i; });
        if (skirtingi.length < 2) return;
        out.punktai.push({ n: n, k: g.length, vietos: g.slice(0, 3).map(function (x) { return docVieta(doc, { loc: x.b.loc, t: x.b.text.split("\n")[0] }, l); }) });
      });
      // Dvi to paties turinio formuluotės vienoje pastraipoje (eilučių lūžis pastraipos viduje)
      (doc.blocks || []).forEach(function (b) {
        if (b.loc && b.loc.table) return;
        // GP_DOK eilutės lūžį pastraipos viduje (Word Shift+Enter) rašo „ / “
        var ls = String(b.text || "").split(/\n| \/ /).map(function (x) { return x.trim(); }).filter(Boolean);
        for (var i = 1; i < ls.length; i++) {
          var a = be(ls[i - 1].replace(PUNKTAS, "$2")).replace(/[^a-z0-9]+/g, " ").trim().split(" "), c = be(ls[i]).replace(/[^a-z0-9]+/g, " ").trim().split(" ");
          if (ls[i - 1].length < 40 || ls[i].length < 40 || /^(\d|[-•–])/.test(ls[i])) continue;
          if (a.slice(0, 2).join(" ") === c.slice(0, 2).join(" ") && a[0].length > 3) {
            out.alternatyvos.push({ vietos: [docVieta(doc, { loc: b.loc, t: ls[i - 1] }, l), docVieta(doc, { loc: b.loc, t: ls[i] }, l)] });
            break;
          }
        }
      });
    }
    // Neužpildyti pasirinkimo laukai
    E.forEach(function (e) {
      var m = LAUKAI.exec(e.t);
      if (m) out.laukai.push({ t: m[0], vietos: [docVieta(doc, e, l)] });
    });
    // Nuorodos į lenteles, kurių antraštės šiame dokumente nėra
    var antrastes = {};
    E.forEach(function (e) { var m = /^(\d{1,2})\s+lentel[ėe](?![a-ząčęėįšųūž])/i.exec(lt(e.t)); if (m) antrastes[m[1]] = 1; });
    if (Object.keys(antrastes).length) {
      var matyta = {};
      E.forEach(function (e) {
        var re = /(^|[^\w.])((?:SPS\s+)?)(\d{1,2})\s+lentel(?:ės|ėje|ę|e|ėse)(?![a-ząčęėįšųūž])/gi, m;
        while ((m = re.exec(e.t))) {
          var pries = be(e.t.slice(Math.max(0, m.index - 30), m.index + m[1].length));
          if (/(specifikacij|formos|sutarties|priedo|bps|salygu|aprase|ts)\w*\s*$/.test(pries)) continue;
          if (antrastes[m[3]] || matyta[m[3]]) continue;
          matyta[m[3]] = 1;
          out.lenteles.push({ n: m[3], vietos: [docVieta(doc, e, l)] });
        }
      });
    }
    // Nuorodos į SPS priedus, kurių sąraše nėra (tik kai sąrašas rastas)
    if (sps && sps.priedai && sps.priedai.length) {
      var nr = {}; sps.priedai.forEach(function (p) { nr[p.n] = 1; });
      var buvo = {};
      E.forEach(function (e) {
        var re = new RegExp("\\bSPS\\s+(?:(\\d{1,2})\\s+pried" + R + "*|pried" + R + "*\\s+Nr\\.\\s*(\\d{1,2}))", "gi"), m;
        while ((m = re.exec(e.t))) {
          var n = m[1] || m[2];
          if (nr[n] || buvo[n]) continue;
          buvo[n] = 1;
          out.priedu_nuorodos.push({ n: n, vietos: [docVieta(doc, e, l)] });
        }
      });
    }
    return out;
  }

  /* ---------------------------------------------------------------- palyginimai */
  var STOP = { pirkimas: 1, pirkimo: 1, pirkimu: 1, procurement: 1, darbu: 1, ir: 1, bei: 1, the: 1, and: 1 };
  function zodziai(s) {
    var out = {};
    be(s).replace(/[^a-z0-9]+/g, " ").split(" ").forEach(function (w) {
      if (!w || STOP[w]) return;
      if (/^\d+$/.test(w)) { if (w.length >= 2) out[w] = 1; return; }
      if (w.length >= 4) out[w.slice(0, 5)] = 1;
    });
    return Object.keys(out);
  }
  function panasumas(a, b) {
    var A = zodziai(a), B = zodziai(b);
    if (!A.length || !B.length) return null;
    var bendri = A.filter(function (x) { return B.indexOf(x) >= 0; }).length;
    return bendri / Math.min(A.length, B.length);
  }
  var KALBU_PAV = { lt: { lt: "lietuvių", en: "anglų", de: "vokiečių", pl: "lenkų", lv: "latvių", et: "estų", ru: "rusų", fr: "prancūzų" },
                    en: { lt: "Lithuanian", en: "English", de: "German", pl: "Polish", lv: "Latvian", et: "Estonian", ru: "Russian", fr: "French" } };
  function kalbuTekstas(sar, l) {
    var P = KALBU_PAV[l === "en" ? "en" : "lt"];
    return sar.map(function (k) { return P[k] || k; }).join(l === "en" ? " or " : " arba ");
  }
  function budoPav(id, l) {
    var M = global.GP_METHODS;
    if (!M || !id) return id || "";
    return l === "en" ? M.label(id, { kalba: "en" }) : (M.byId(id) || {}).label || id;
  }

  /* ---------------------------------------------------------------- pagrindinė patikra */
  /* o = { docs: GP_DOK dokumentai, vaidmenys?: { id: vaidmuo } (naudotojo pakeisti), kortele?: kortelė, kalba }
     Grąžina { dokumentai, pagrindiniai, faktai, radiniai, patikros, taisykles, rezimas, santrauka }. */
  function patikrink(o) {
    o = o || {};
    var l = o.kalba === "en" ? "en" : "lt", X = tx(l);
    var docs = (o.docs || []).filter(function (d) { return d && d.id; });
    var vaid = {};
    docs.forEach(function (d) { vaid[d.id] = (o.vaidmenys && o.vaidmenys[d.id]) || vaidmuo(d); });
    var P = pagrindiniai(docs, vaid);
    var radiniai = [], patikros = [];
    function patikra(id, grupe, busena, pastaba) { patikros.push({ id: id, grupe: grupe, pav: X.patikra[id] || id, busena: busena, pastaba: pastaba || "" }); }
    function radinys(r) { radiniai.push(r); }

    // Faktai
    var sk = null, skText = "";
    if (P.skelbimas) {
      skText = skelbimoInfo(P.skelbimas).tekstas;
      var at = global.GP_SKELBIMAS ? global.GP_SKELBIMAS.atpazink(skText, P.skelbimas.name, l) : { laukai: [] };
      sk = { doc: P.skelbimas, laukai: {}, kalbos: global.GP_SKELBIMAS ? global.GP_SKELBIMAS.kalbos(skText) : null,
             pakeitimas: global.GP_SKELBIMAS ? global.GP_SKELBIMAS.pakeitimas(skText) : null, issiusta: skelbimoInfo(P.skelbimas).issiusta };
      at.laukai.forEach(function (x) { sk.laukai[x.laukas] = x; });
    }
    var sps = P.sps ? spsFaktai(P.sps) : null;
    var trukmes = P.sutartis ? sutartiesTrukmes(P.sutartis) : [];
    var k = o.kortele || null;

    // Režimas teisės nuorodoms: kortelė -> skelbimas -> SPS vykdytojo įprastas (tik pastabai - PĮ ir VPĮ nemaišomi)
    var rezimas = (k && (k.rezimas === "PI" || k.rezimas === "VPI") && k.rezimas) || (sk && sk.laukai.rezimas && sk.laukai.rezimas.reiksme) || "";
    function teise(raktai) {
      if (!rezimas || !global.GP_TEISE) return [];
      var out = [];
      raktai.forEach(function (r) { try { out.push({ raktas: r, cit: global.GP_TEISE.cit(r, rezimas, l), url: global.GP_TEISE.url(r, rezimas), apie: global.GP_TEISE.apie(r, rezimas) }); } catch (e) {} });
      return out;
    }

    /* ---- A. Paketas */
    var budas = (k && k.budas) || (sk && sk.laukai.budas && sk.laukai.budas.reiksme) || "";
    var reikia = global.GP_TAISYKLES && budas ? global.GP_TAISYKLES.dokumentai(budas, l) : null;
    var VAID = { skelbimas: "skelbimas", bps: "bps", sps: "sps", paraiska: "paraiska", pasiulymas: "pasiulymas", ebvpd: "ebvpd", ts: "ts", sutartis: "sutartis", dps_salygos: "sps" };
    if (!reikia) {
      reikia = [{ id: "sps", pav: X.vaidmuo.sps }, { id: "ts", pav: X.vaidmuo.ts, teise: "ts_dokumentuose" }, { id: "sutartis", pav: X.vaidmuo.sutartis, teise: "sutartis_dokumentuose" }];
      radinys({ id: "dokumentai_budas", grupe: "paketas", lygis: "info", tekstas: X.beBudo, vietos: [], teise: [] });
    }
    var truksta = reikia.filter(function (d) {
      var r = VAID[d.id] || d.id;
      if (r === "sutartis") return !P.sutartis && !P.sutartis_bendrosios;
      return !P[r];
    });
    var trukstaPriedai = [];                      // užpildoma žemiau; trūkstamo dokumento radinys - po priedų patikros

    // SPS priedų sąrašas ir failai
    if (sps && sps.priedai.length) {
      // Kiekvienas kelio segmentas: priedas gali būti ZIP ar aplankas („2 priedas_EBVPD.zip › espd-request.xml“)
      var failai = docs.map(function (d) {
        return { d: d, n: be(trumpas(d.name)), kel: be(kelias(d.name)), seg: kelias(d.name).split("/").map(be) };
      });
      var trukstaP = 0;
      sps.priedai.forEach(function (p) {
        // „3 priedas...“, „SPS 3 priedas...“, „SPS 3. ...“ - bet ne „1.2. Priedas...“, „2_c4t_...“ ar „3 priedo 1 priedas“
        var reNr = new RegExp("^(sps\\s*)?" + p.n + "(\\s*priedas|\\s*\\.(?!\\d)|\\s+[a-z])", "i");
        var pz = zodziai(p.pav);
        var yra = failai.some(function (f) {
          if (f.seg.some(function (sg) { return reNr.test(sg) && !/^(sps\s*)?\d+\s*priedo\s/.test(sg); })) return true;
          // pavadinimo sutapimas su failo ar aplanko vardu (pvz. „1.2. Priedas. Techninė užduotis ir jos priedai/“)
          var fz = zodziai(f.kel);
          var bendri = pz.filter(function (x) { return fz.indexOf(x) >= 0; }).length;
          return pz.length >= 2 && bendri >= Math.max(2, Math.ceil(pz.length * 0.75));
        });
        if (!yra) {
          trukstaP++;
          var rp = { id: "priedai", grupe: "paketas", lygis: "tikrinti", tekstas: sub(X.priedoNera, { n: p.n, p: p.pav }), vietos: [docVieta(P.sps, p.e, l)], teise: [], pav: p.pav };
          trukstaPriedai.push(rp); radinys(rp);
        }
      });
      var nr = {}; sps.priedai.forEach(function (p) { nr[p.n] = 1; });
      failai.forEach(function (f) {
        var m = /^sps\s*(\d{1,2})(\s*priedas|\s*\.)/.exec(f.n);
        if (m && !nr[+m[1]]) { trukstaP++; radinys({ id: "priedai", grupe: "paketas", lygis: "tikrinti", tekstas: sub(X.priedoPerdaug, { f: trumpas(f.d.name), n: m[1] }), vietos: [], teise: [] }); }
      });
      patikra("priedai", "paketas", trukstaP ? "radinys" : "gerai");
    } else patikra("priedai", "paketas", "nepatikrinta", sps ? X.bePriedu : X.beSps);
    // Trūkstami dokumentai pagal būdą. Jei tas pats dokumentas jau įvardytas kaip trūkstamas SPS priedas (pvz. techninė
    // specifikacija), lieka vienas - priedo - radinys su dokumento teisės nuoroda.
    var PRIEDO_RE = { ts: /techni\w+\s+(specifikacij|uzduot)/, sutartis: /sutart/, pasiulymas: /pasiulym/, paraiska: /paraisk/, ebvpd: /ebvpd|espd/ };
    truksta.forEach(function (d) {
      var re = PRIEDO_RE[d.id], dub = re && trukstaPriedai.filter(function (x) { return re.test(be(x.pav)); })[0];
      if (dub) { dub.teise = teise(d.teise ? [d.teise] : []); return; }
      radinys({ id: "dokumentai", grupe: "paketas", lygis: "tikrinti", tekstas: sub(X.trukstaDok, { d: d.pav }), vietos: [], teise: teise(d.teise ? [d.teise] : []) });
    });
    patikra("dokumentai", "paketas", truksta.length ? "radinys" : "gerai");

    // Neperskaityti failai ir kelios skelbimo versijos
    var neper = docs.filter(function (d) { return d.parseStatus !== "parsed"; });
    if (neper.length) radinys({ id: "neperskaityti", grupe: "paketas", lygis: "info",
      tekstas: sub(X.neperskaitytas, { n: neper.length, s: neper.map(function (d) { return trumpas(d.name); }).join(", ") }), vietos: [], teise: [] });
    patikra("neperskaityti", "paketas", neper.length ? "radinys" : "gerai");
    if (P.skelbimasVisi && P.skelbimasVisi.length > 1)
      radinys({ id: "versijos", grupe: "paketas", lygis: "info", tekstas: sub(X.versijos, { n: P.skelbimasVisi.length, f: trumpas(P.skelbimas.name) }), vietos: [], teise: [] });

    /* ---- S. Skelbimas ir SPS (teisinga laikoma skelbimo informacija) */
    var VIRS = ["skelbimo_virsenybe"];
    function nera(id, pr) { patikra(id, "skelbimas", "nepatikrinta", pr); }
    if (!sk || !sps) {
      ["kalba", "pavadinimas", "dalys", "terminas", "skelbimo_data", "budas", "vykdytojas"].forEach(function (id) { nera(id, !sk ? X.beSkelbimo : X.beSps); });
    } else {
      // Pasiūlymų kalba
      var spsKalbos = {}, kalbuEil = null;
      sps.kalbos.filter(function (x) { return x.pasiulymui; }).forEach(function (x) { x.kalbos.forEach(function (kk) { spsKalbos[kk] = 1; }); kalbuEil = kalbuEil || x.e; });
      var ks = Object.keys(spsKalbos);
      if (!sk.kalbos || !ks.length) nera("kalba", !sk.kalbos ? X.beDuomenu + " (" + X.vaidmuo.skelbimas + ")" : X.beDuomenu + " (SPS)");
      else {
        var perdaug = ks.filter(function (x) { return sk.kalbos.kalbos.indexOf(x) < 0; });
        var trukstaK = sk.kalbos.kalbos.filter(function (x) { return ks.indexOf(x) < 0; });
        var vietos = [docVieta(sk.doc, { loc: null, t: sk.kalbos.citata }, l), docVieta(P.sps, kalbuEil, l)];
        if (perdaug.length) radinys({ id: "kalba", grupe: "skelbimas", lygis: "kliutis", tekstas: sub(X.kalba, { x: kalbuTekstas(perdaug, l), y: kalbuTekstas(sk.kalbos.kalbos, l) }), vietos: vietos, teise: teise(VIRS) });
        if (trukstaK.length) radinys({ id: "kalba", grupe: "skelbimas", lygis: "tikrinti", tekstas: sub(X.kalbaSkelb, { x: kalbuTekstas(trukstaK, l) }), vietos: vietos, teise: teise(VIRS) });
        patikra("kalba", "skelbimas", perdaug.length || trukstaK.length ? "radinys" : "gerai", !perdaug.length && !trukstaK.length ? sub(X.kalbaGerai, { x: kalbuTekstas(ks, l) }) : "");
      }
      // Pavadinimas
      var skPav = sk.laukai.pavadinimas;
      if (!skPav || !sps.pavadinimas) nera("pavadinimas", X.beDuomenu);
      else {
        var pan = panasumas(skPav.reiksme, sps.pavadinimas.t);
        if (pan !== null && pan < 0.6) radinys({ id: "pavadinimas", grupe: "skelbimas", lygis: "tikrinti", tekstas: X.pavadinimas,
          vietos: [docVieta(sk.doc, { loc: null, t: skPav.citata }, l), docVieta(P.sps, sps.pavadinimas.e, l)], teise: teise(VIRS) });
        patikra("pavadinimas", "skelbimas", pan !== null && pan < 0.6 ? "radinys" : "gerai");
      }
      // Dalys
      var skD = sk.laukai.dalys;
      if (!skD || !sps.dalys) nera("dalys", X.beDuomenu);
      else {
        var skN = skD.reiksme.length ? skD.reiksme.length : 1, spsN = sps.dalys.n || 1;
        var skirt = skN !== spsN;
        if (skirt) radinys({ id: "dalys", grupe: "skelbimas", lygis: "kliutis",
          tekstas: sub(X.dalysNe, { s: skN === 1 ? X.dalysViena : sub(X.dalysKelios, { n: skN }), p: sps.dalys.n ? sub(X.dalysSkaidomas, { n: sps.dalys.n }) : X.dalysNeskaidomas }),
          vietos: [docVieta(sk.doc, { loc: null, t: skD.citata }, l), docVieta(P.sps, sps.dalys.e, l)], teise: teise(VIRS) });
        patikra("dalys", "skelbimas", skirt ? "radinys" : "gerai");
      }
      // Terminas ir paskelbimo data prieš SPS grafiką
      var skT = sk.laukai.pasiulymuTerminas;
      var pirmas = sps.grafikas.filter(function (g) { return /(parai[šs]k|pasi[ūu]lym)[a-ząčęėįšųūž]*\s+(gavimas|rengimas|pateikimas|pri[ėe]mimas)/i.test(g.etapas) && !/galutin|kvietim/i.test(g.etapas); })[0];
      if (!skT || !pirmas) nera("terminas", !skT ? X.beDuomenu : X.beGrafiko);
      else {
        var skir = skT.reiksme.slice(0, 10) !== pirmas.data;
        if (skir) radinys({ id: "terminas", grupe: "skelbimas", lygis: "tikrinti", tekstas: sub(X.terminas, { s: skT.reiksme.replace("T", " "), p: pirmas.data + " (" + kab(pirmas.etapas, l) + ")" }),
          vietos: [docVieta(sk.doc, { loc: null, t: skT.citata }, l), docVieta(P.sps, pirmas.e, l)], teise: teise(VIRS.concat(["terminas_dokumentuose"])) });
        patikra("terminas", "skelbimas", skir ? "radinys" : "gerai");
      }
      var skData = sk.pakeitimas ? null : (sk.issiusta || "").slice(0, 10);
      var gSkelb = sps.grafikas.filter(function (g) { return /skelbim/i.test(g.etapas); })[0];
      if (!skData || !gSkelb) nera("skelbimo_data", sk.pakeitimas ? X.pakeitimoData : !skData ? X.beDuomenu : X.beGrafiko);
      else {
        var sk2 = skData !== gSkelb.data;
        if (sk2) radinys({ id: "skelbimo_data", grupe: "skelbimas", lygis: "tikrinti", tekstas: sub(X.skelbimoData, { s: skData, p: gSkelb.data }),
          vietos: [docVieta(sk.doc, { loc: null, t: "Skelbimo išsiuntimo data: " + skData }, l), docVieta(P.sps, gSkelb.e, l)], teise: [] });
        patikra("skelbimo_data", "skelbimas", sk2 ? "radinys" : "gerai");
      }
      // Pirkimo būdas
      var skB = sk.laukai.budas, skM = skB && global.GP_METHODS ? global.GP_METHODS.byId(skB.reiksme) : null;
      if (!skM || !sps.budas) nera("budas", X.beDuomenu);
      else {
        var PROC = { "skelbiamos derybos": "skelb_derybos", "atviras konkursas": "atviras", "ribotas konkursas": "ribotas", "neskelbiamos derybos": "neskelb_derybos", "konkurencinis dialogas": "konkur_dialogas" };
        var spsProc = PROC[sps.budas.t.replace(/\s+/g, " ")], rusisSkirt = sps.rusis && skM.rezimas && skM.rezimas !== sps.rusis.t;
        var skirtB = (spsProc && spsProc !== skM.procedura) || rusisSkirt;
        if (skirtB) radinys({ id: "budas", grupe: "skelbimas", lygis: "kliutis", tekstas: sub(X.budas, { s: budoPav(skM.id, l), p: [sps.budas.e.t, sps.rusis ? sps.rusis.e.t : ""].filter(Boolean).join(" ") }),
          vietos: [docVieta(sk.doc, { loc: null, t: skB.citata }, l), docVieta(P.sps, sps.budas.e, l)], teise: teise(VIRS) });
        patikra("budas", "skelbimas", skirtB ? "radinys" : "gerai");
      }
      // Vykdytojas
      var skV = sk.laukai.vykdytojas;
      if (!skV || !sps.organizacija) nera("vykdytojas", X.beDuomenu);
      else {
        var skirtV = skV.reiksme !== sps.organizacija.id;
        var org = global.GP_ORG ? global.GP_ORG.pagalId(skV.reiksme) : null;
        if (skirtV) radinys({ id: "vykdytojas", grupe: "skelbimas", lygis: "kliutis", tekstas: sub(X.vykdytojas, { s: org ? org.pavadinimas : skV.reiksme, p: sps.organizacija.pav }),
          vietos: [docVieta(sk.doc, { loc: null, t: skV.citata }, l), docVieta(P.sps, sps.organizacija.e, l)], teise: teise(VIRS) });
        patikra("vykdytojas", "skelbimas", skirtV ? "radinys" : "gerai");
      }
    }
    // Sutarties trukmė (skelbimas prieš sutartį)
    var skTr = sk && sk.laukai.trukmeMen;
    if (!skTr || !trukmes.length) patikra("trukme", "skelbimas", "nepatikrinta", !sk ? X.beSkelbimo : !P.sutartis ? X.beSutarties : X.beDuomenu);
    else {
      var sutampa = trukmes.some(function (t) { return t.men === skTr.reiksme; });
      if (!sutampa) {
        var vien = []; trukmes.forEach(function (t) { if (!vien.some(function (v) { return v.men === t.men; })) vien.push(t); });
        radinys({ id: "trukme", grupe: "skelbimas", lygis: "tikrinti",
          tekstas: sub(X.trukme, { s: skTr.reiksme, p: vien.map(function (t) { return kab(t.tekstas, l); }).join("; ") }),
          vietos: [docVieta(sk.doc, { loc: null, t: skTr.citata }, l)].concat(vien.slice(0, 2).map(function (t) { return docVieta(P.sutartis, t.e, l); })), teise: teise(VIRS) });
      }
      patikra("trukme", "skelbimas", sutampa ? "gerai" : "radinys");
    }

    /* ---- K. Kortelė ir dokumentai */
    if (!k) patikra("kortele", "kortele", "nepatikrinta", X.beKorteles);
    else if (!sk && !sps) patikra("kortele", "kortele", "nepatikrinta", X.beSkelbimo);
    else {
      var skirtumai = 0;
      var palygink = function (laukas, kortelesReiksme, dokReiksme, vienodi, rodyk, kur, dokVieta) {
        if (kortelesReiksme == null || kortelesReiksme === "" || dokReiksme == null || dokReiksme === "") return;
        if (vienodi(kortelesReiksme, dokReiksme)) return;
        skirtumai++;
        radinys({ id: "kortele_" + laukas, grupe: "kortele", lygis: "tikrinti",
          tekstas: sub(X.kortele, { l: X.laukuPav[laukas] || laukas, k: rodyk(kortelesReiksme), kur: kur, d: rodyk(dokReiksme) }), vietos: [dokVieta], teise: [] });
      };
      var lyg = function (a, b) { return String(a) === String(b); };
      var tekst = function (v) { return String(v); };
      if (sk) {
        var L = sk.laukai, kur = X.korteleSkelbime, dv = function (x) { return docVieta(sk.doc, { loc: null, t: x.citata }, l); };
        if (L.pavadinimas) palygink("pavadinimas", k.pavadinimas, L.pavadinimas.reiksme, function (a, b) { var p = panasumas(a, b); return p === null || p >= 0.6; }, tekst, kur, dv(L.pavadinimas));
        if (L.verte) palygink("verte", k.verte, L.verte.reiksme, function (a, b) { return Math.abs(a - b) < 0.5; }, eurTekstas, kur, dv(L.verte));
        if (L.budas) palygink("budas", k.budas, L.budas.reiksme, lyg, function (v) { return budoPav(v, l); }, kur, dv(L.budas));
        if (L.bvpz) palygink("bvpz", k.bvpz, L.bvpz.reiksme, function (a, b) { return String(a).slice(0, 8) === String(b).slice(0, 8); }, tekst, kur, dv(L.bvpz));
        if (L.trukmeMen) palygink("trukmeMen", k.trukmeMen, L.trukmeMen.reiksme, lyg, function (v) { return v + " " + X.men; }, kur, dv(L.trukmeMen));
        if (L.pasiulymuTerminas) palygink("pasiulymuTerminas", k.pasiulymuTerminas, L.pasiulymuTerminas.reiksme, lyg, function (v) { return String(v).replace("T", " "); }, kur, dv(L.pasiulymuTerminas));
        if (L.paskelbimas) palygink("paskelbimas", k.paskelbimas, L.paskelbimas.reiksme, lyg, tekst, kur, dv(L.paskelbimas));
        if (L.vykdytojas) palygink("vykdytojas", k.vykdytojas, L.vykdytojas.reiksme, lyg, function (v) { var x = global.GP_ORG && global.GP_ORG.pagalId(v); return x ? x.pavadinimas : v; }, kur, dv(L.vykdytojas));
        if (L.rezimas) palygink("rezimas", k.rezimas, L.rezimas.reiksme, lyg, function (v) { return v === "PI" ? "PĮ" : v === "VPI" ? "VPĮ" : v; }, kur, dv(L.rezimas));
        if (L.dalys && Array.isArray(k.dalys)) palygink("dalys", Math.max(1, k.dalys.length), Math.max(1, L.dalys.reiksme.length), lyg, function (v) { return v === 1 ? X.dalysViena : sub(X.dalysKelios, { n: v }); }, kur, dv(L.dalys));
      } else if (sps) {
        if (sps.pavadinimas) palygink("pavadinimas", k.pavadinimas, sps.pavadinimas.t, function (a, b) { var p = panasumas(a, b); return p === null || p >= 0.6; }, tekst, X.korteleSps, docVieta(P.sps, sps.pavadinimas.e, l));
        if (sps.dalys && Array.isArray(k.dalys)) palygink("dalys", Math.max(1, k.dalys.length), Math.max(1, sps.dalys.n), lyg, function (v) { return v === 1 ? X.dalysViena : sub(X.dalysKelios, { n: v }); }, X.korteleSps, docVieta(P.sps, sps.dalys.e, l));
      }
      patikra("kortele", "kortele", skirtumai ? "radinys" : "gerai");
    }

    /* ---- D. Dokumentų aiškumas (SPS, BPS, sutartis) */
    var sum = { punktai: [], alternatyvos: [], laukai: [], lenteles: [], priedu_nuorodos: [] };
    ["sps", "bps", "sutartis"].forEach(function (r) {
      if (!P[r]) return;
      var a = aiskumoRadiniai(P[r], l, sps);
      Object.keys(sum).forEach(function (kk) { a[kk].forEach(function (x) { x.doc = P[r]; sum[kk].push(x); }); });
    });
    var AISK = ["dokumentu_aiskumas"];
    sum.punktai.forEach(function (x) { radinys({ id: "punktai", grupe: "aiskumas", lygis: "kliutis", tekstas: sub(X.punktai, { n: x.n, k: x.k }), vietos: x.vietos, teise: teise(AISK) }); });
    sum.alternatyvos.forEach(function (x) { radinys({ id: "alternatyvos", grupe: "aiskumas", lygis: "tikrinti", tekstas: X.alternatyvos, vietos: x.vietos, teise: teise(AISK) }); });
    sum.laukai.forEach(function (x) { radinys({ id: "laukai", grupe: "aiskumas", lygis: "tikrinti", tekstas: sub(X.laukai, { t: x.t }), vietos: x.vietos, teise: teise(AISK) }); });
    sum.lenteles.forEach(function (x) { radinys({ id: "lenteles", grupe: "aiskumas", lygis: "tikrinti", tekstas: sub(X.lenteles, { n: x.n }), vietos: x.vietos, teise: teise(AISK) }); });
    sum.priedu_nuorodos.forEach(function (x) { radinys({ id: "priedu_nuorodos", grupe: "aiskumas", lygis: "tikrinti", tekstas: sub(X.priedu_nuorodos, { n: x.n }), vietos: x.vietos, teise: teise(AISK) }); });
    var yraDok = P.sps || P.bps || P.sutartis;
    ["punktai", "alternatyvos", "laukai", "lenteles"].forEach(function (id) {
      patikra(id, "aiskumas", !yraDok ? "nepatikrinta" : sum[id].length ? "radinys" : "gerai", !yraDok ? X.beSps : "");
    });
    patikra("priedu_nuorodos", "aiskumas", !sps ? "nepatikrinta" : !sps.priedai.length ? "nepatikrinta" : sum.priedu_nuorodos.length ? "radinys" : "gerai",
            !sps ? X.beSps : !sps.priedai.length ? X.bePriedu : "");
    // SPS grafiko datų tvarka
    if (!sps || sps.grafikas.length < 2) patikra("grafikas", "aiskumas", "nepatikrinta", !sps ? X.beSps : X.beGrafiko);
    else {
      var blogai = null;
      for (var gi = 1; gi < sps.grafikas.length && !blogai; gi++) if (sps.grafikas[gi].data < sps.grafikas[gi - 1].data) blogai = [sps.grafikas[gi - 1], sps.grafikas[gi]];
      if (blogai) radinys({ id: "grafikas", grupe: "aiskumas", lygis: "tikrinti",
        tekstas: sub(X.grafikas, { a: blogai[1].etapas, ad: blogai[1].data, b: blogai[0].etapas, bd: blogai[0].data }), vietos: [docVieta(P.sps, blogai[1].e, l)], teise: teise(AISK) });
      patikra("grafikas", "aiskumas", blogai ? "radinys" : "gerai");
    }

    /* ---- T. Taisyklių variklis (A3): kortelė, o be jos - skelbimo duomenys */
    var tk = null;
    if (k) tk = k;
    else if (sk) {
      tk = {};
      Object.keys(sk.laukai).forEach(function (f) { tk[f] = sk.laukai[f].reiksme; });
    }
    var taisykles = tk && global.GP_TAISYKLES ? global.GP_TAISYKLES.tikrink(tk, l) : null;

    var lygiai = { kliutis: 0, tikrinti: 0, info: 0 };
    radiniai.forEach(function (r) { if (lygiai[r.lygis] != null) lygiai[r.lygis]++; });
    if (taisykles) taisykles.radiniai.forEach(function (r) { if (lygiai[r.lygis] != null) lygiai[r.lygis]++; });
    return {
      dokumentai: docs.map(function (d) { return { id: d.id, name: d.name, trumpas: trumpas(d.name), vaidmuo: vaid[d.id], vaidmuoAuto: vaidmuo(d), parseStatus: d.parseStatus, sha256: d.sha256 || "" }; }),
      pagrindiniai: Object.keys(P).filter(function (r) { return !/Visi$/.test(r); }).reduce(function (a, r) { a[r] = P[r].id; return a; }, {}),
      faktai: { skelbimas: sk ? { laukai: sk.laukai, kalbos: sk.kalbos, pakeitimas: sk.pakeitimas, issiusta: sk.issiusta } : null,
                sps: sps ? { pavadinimas: sps.pavadinimas && sps.pavadinimas.t, budas: sps.budas && sps.budas.t, rusis: sps.rusis && sps.rusis.t,
                             dalys: sps.dalys ? sps.dalys.n : null, kalbos: sps.kalbos.map(function (x) { return { pasiulymui: x.pasiulymui, kalbos: x.kalbos }; }),
                             grafikas: sps.grafikas.map(function (g) { return { etapas: g.etapas, data: g.data }; }), priedai: sps.priedai.map(function (p) { return { n: p.n, pav: p.pav }; }) } : null,
                trukmes: trukmes.map(function (t) { return { men: t.men, tekstas: t.tekstas }; }) },
      radiniai: radiniai,
      patikros: patikros,
      taisykles: taisykles,
      rezimas: rezimas,
      santrauka: { kliutys: lygiai.kliutis, tikrinti: lygiai.tikrinti, info: lygiai.info,
                   gerai: patikros.filter(function (p) { return p.busena === "gerai"; }).length,
                   nepatikrinta: patikros.filter(function (p) { return p.busena === "nepatikrinta"; }).length, patikru: patikros.length }
    };
  }

  global.GP_PARENGTIS = {
    version: "1.0",
    patikrink: patikrink,
    vaidmuo: vaidmuo,
    vaidmenys: function () { return Object.keys(TXT.lt.vaidmuo); },
    vaidmensPav: function (r, l) { return tx(l).vaidmuo[r] || r; },
    grupesPav: function (g, l) { return tx(l).grupe[g] || g; },
    _spsFaktai: spsFaktai, _sutartiesTrukmes: sutartiesTrukmes, _aiskumas: aiskumoRadiniai, _panasumas: panasumas, _eilutes: eilutes
  };
})(typeof window !== "undefined" ? window : this);
