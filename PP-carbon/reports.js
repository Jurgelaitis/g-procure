/* ============================================================================
 * G-Procure  pp-carbon/reports.js   (v0.1 - Faze 4 branduolys)
 * Ataskaitu modelio kurimas is jau turimu pp-carbon duomenu.
 *
 * SVARBU - sis failas NESKAICIUOJA naujos logikos, o SURENKA ir PERFORMATUOJA
 * jau turimus duomenis (projekto SESD, pasiulymu vertinimas) i ataskaitos
 * modeli skirtingoms auditorijoms. Modelis yra "renderer-agnostic" - UI ji
 * paverciu .docx (per docx biblioteka, kaip PP-protocol) arba HTML perziura.
 *
 * SIOJE FAZEJE (Faze 4) - dvi auditorijos:
 *  A) VIDAUS vertinimas  -> buildInternalReport(data): pilnas detalumas,
 *     visi duomenys, ikaitant tiekeju kainas ir vardus, EPD saltinius.
 *  D) VIESAS / auditoriu pjuvis -> buildPublicReport(data): JAUTRUS duomenys
 *     PASALINAMI. Tai duomenu nutekejimo apsauga - EPSO-G valstybes imone,
 *     viesumas privalomas, bet komercine paslaptis (tiekeju kainos, vardai)
 *     NEGALI patekti i viesa dokumenta.
 *
 * VIESOJO PJUVIO (D) FILTRAVIMO TAISYKLES (griezta, testuota):
 *  - Tiekeju REALUS vardai -> anonimizuojami ("Tiekejas 1", "Tiekejas 2"...
 *    pagal reitinga).
 *  - Visos PINIGINES reiksmes (pasiulymo kaina, anglies kaina, pakoreguota
 *    kaina EUR) -> PASALINAMOS.
 *  - EPD saltiniu failu vardai -> PASALINAMI (gali atskleisti tiekeja).
 *  - LIEKA: projekto SESD pagal etapus, bendra SESD, anglies palyginimas
 *    (t CO2e) ir reitingas, metodika. Tai ir yra viesa tvarumo istorija.
 *
 * IEJIMO KONTRAKTAS (UI normalizuoja Store -> si objekta; branduolys Store
 * vidiniu nezino, todel priima svaru objekta):
 *  data = {
 *    project: { name, code, subject, date, lifetimeYears },
 *    stages:  [ { key, label, totalKg } ],   // SESD pagal etapus
 *    totalKg: <skaicius>,                     // bendra projekto SESD (kg)
 *    pendingEpd: [ { label } ],               // laukia EPD (NEitraukta i suma)
 *    epdSources: [ { factorLabel, value, unit, page, fileName } ],
 *    evaluation: {                            // is Fazes 2, neprivaloma (gali buti null)
 *      model, shadowPrice,
 *      offers: [ { name, bidPrice, carbonT, carbonCost, adjustedPrice, rank, missingData } ],
 *      winner: { name }
 *    }
 *  }
 *
 * ISEJIMAS (renderer-agnostic ataskaitos modelis):
 *  { audience, title, meta:[{label,value}], sections:[{heading,paragraphs:[],
 *    tables:[{columns:[],rows:[[...]]}]}], disclaimer }
 *
 * Naudojimas:  <script src="reports.js"></script>  ->  window.GP_REPORTS
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.1";

  var METHODOLOGY = "2025 m. Projektu SESD metodika; GHG Protocol; EN 15804 (A1-A3)";
  var DISCLAIMER_INTERNAL =
    "Vidaus dokumentas. Anglies vertinimas - pagalbine priemone, ne galutinis " +
    "verdiktas. Sesseline CO2 kaina - patvirtinti su metodikos savininku. " +
    "Faktoriai, pazymeti \"review\" arba \"laukia EPD\", dar tikslinami.";
  var DISCLAIMER_PUBLIC =
    "Viesas pjuvis. Pateikiami tik apibendrinti anglies pedsako duomenys. " +
    "Komercine informacija (tiekeju kainos ir tapatybe) nerodoma. Metodika: " +
    METHODOLOGY + ".";

  // --- Pagalbines ---
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function str(x) { return x === null || x === undefined ? "" : String(x); }
  function round(x, dp) { var f = Math.pow(10, dp || 0); return Math.round(num(x) * f) / f; }
  function kgToT(kg) { return round(num(kg) / 1000, 3); }
  function fmtEur(x) { return round(num(x), 2).toLocaleString("lt-LT") + " EUR"; }
  function fmtKg(x) { return round(num(x), 1).toLocaleString("lt-LT") + " kg"; }
  function fmtT(x) { return round(num(x), 3).toLocaleString("lt-LT") + " t"; }

  function projectMeta(p) {
    p = p || {};
    var m = [];
    if (p.name) m.push({ label: "Projektas", value: str(p.name) });
    if (p.code) m.push({ label: "Kodas", value: str(p.code) });
    if (p.subject) m.push({ label: "Perkantysis subjektas", value: str(p.subject) });
    if (p.date) m.push({ label: "Data", value: str(p.date) });
    if (p.lifetimeYears) m.push({ label: "Gyvavimo ciklas", value: num(p.lifetimeYears) + " m." });
    m.push({ label: "Metodika", value: METHODOLOGY });
    return m;
  }

  // Etapu lentele su dalimi procentais. Naudojama abiem auditorijom (nejautri).
  function stagesSection(stages, totalKg) {
    stages = Array.isArray(stages) ? stages : [];
    var total = num(totalKg, 0);
    var rows = stages.map(function (s) {
      var kg = num(s.totalKg, 0);
      var pct = total > 0 ? round(kg / total * 100, 1) : 0;
      return [str(s.label), fmtKg(kg), pct + " %"];
    });
    rows.push(["IS VISO", fmtKg(total), "100 %"]);
    return {
      heading: "Projekto SESD pagal etapus",
      paragraphs: ["Bendras projekto siltnamio efekta sukelianciu duju kiekis (A1-A3 pagrindu): " + fmtT(kgToT(total)) + " CO2e."],
      tables: [{ columns: ["Etapas", "SESD", "Dalis"], rows: rows }]
    };
  }

  // --- A) VIDAUS ataskaita (pilna) ---
  function buildInternalReport(data) {
    data = data || {};
    var sections = [];

    // 1. Etapu suvestine
    sections.push(stagesSection(data.stages, data.totalKg));

    // 2. Laukia EPD (informacinis - neitraukta i suma)
    var pending = Array.isArray(data.pendingEpd) ? data.pendingEpd : [];
    if (pending.length) {
      sections.push({
        heading: "Pozicijos, laukiancios EPD",
        paragraphs: ["Sios pozicijos NEitrauktos i bendra suma, kol negautas gamintojo EPD:"],
        tables: [{ columns: ["Pozicija"], rows: pending.map(function (p) { return [str(p.label)]; }) }]
      });
    }

    // 3. EPD saltiniai (audito pedsakas) - su failu vardais (vidaus)
    var epd = Array.isArray(data.epdSources) ? data.epdSources : [];
    if (epd.length) {
      sections.push({
        heading: "EPD saltiniai (audito pedsakas)",
        paragraphs: ["AI istrauktos ir vertintojo patvirtintos A1-A3 reiksmes:"],
        tables: [{
          columns: ["Faktorius", "Reiksme", "Vienetas", "Psl.", "Dokumentas"],
          rows: epd.map(function (e) {
            return [str(e.factorLabel), num(e.value).toString(), str(e.unit),
                    e.page ? String(e.page) : "-", str(e.fileName)];
          })
        }]
      });
    }

    // 4. Pasiulymu vertinimas (jei yra) - PILNAS, su kainomis ir vardais
    var ev = data.evaluation;
    if (ev && Array.isArray(ev.offers) && ev.offers.length) {
      var modelTxt = ev.model === "B" ? "B - svoriai" : "A - anglimi pakoreguota kaina";
      var rows = ev.offers.slice().sort(function (a, b) { return num(a.rank) - num(b.rank); })
        .map(function (o) {
          return [
            String(num(o.rank)),
            str(o.name) + (o.missingData ? " (truksta PCF)" : ""),
            fmtEur(o.bidPrice),
            fmtT(o.carbonT),
            fmtEur(o.carbonCost),
            fmtEur(o.adjustedPrice)
          ];
        });
      sections.push({
        heading: "Pasiulymu vertinimas",
        paragraphs: [
          "Modelis: " + modelTxt + ". Sesseline CO2 kaina: " + num(ev.shadowPrice) + " EUR/t CO2e.",
          ev.winner ? ("Geriausias pasiulymas: " + str(ev.winner.name) + ".") : ""
        ].filter(Boolean),
        tables: [{
          columns: ["Vieta", "Tiekejas", "Kaina", "Anglis", "Anglies kaina", "Pakoreguota kaina"],
          rows: rows
        }]
      });
    }

    return {
      audience: "internal",
      title: "Anglies pedsako ataskaita - vidaus vertinimas",
      meta: projectMeta(data.project),
      sections: sections,
      disclaimer: DISCLAIMER_INTERNAL
    };
  }

  // --- D) VIESAS / auditoriu pjuvis (filtruotas) ---
  function buildPublicReport(data) {
    data = data || {};
    var sections = [];

    // 1. Etapu suvestine (nejautri - lieka)
    sections.push(stagesSection(data.stages, data.totalKg));

    // 2. Pasiulymu ANGLIES palyginimas - anonimizuotas, BE piniginiu reiksmiu
    var ev = data.evaluation;
    if (ev && Array.isArray(ev.offers) && ev.offers.length) {
      var sorted = ev.offers.slice().sort(function (a, b) { return num(a.rank) - num(b.rank); });
      var rows = sorted.map(function (o, i) {
        // Anonimizacija: realus vardas PAKEICIAMAS "Tiekejas N" pagal reitinga.
        return [
          String(num(o.rank, i + 1)),
          "Tiekejas " + (i + 1),
          fmtT(o.carbonT) + " CO2e"
        ];
      });
      sections.push({
        heading: "Pasiulymu anglies pedsako palyginimas",
        paragraphs: [
          "Tiekeju pasiulymai ivertinti pagal viso gyvavimo ciklo anglies pedsaka. " +
          "Tiekeju tapatybe ir kainos sioje viesoje versijoje nerodomos.",
          "Vertinimo metodas: anglimi pakoreguota kaina (MEAT kriterijus)."
        ],
        tables: [{ columns: ["Vieta", "Pasiulymas", "Anglies pedsakas"], rows: rows }]
      });
    }

    return {
      audience: "public",
      title: "Anglies pedsako ataskaita - viesas pjuvis",
      meta: projectMeta(data.project).filter(function (m) {
        // Viesai nerodom perkanciojo subjekto detaliu? Paliekam projekta ir metodika,
        // bet pasalinam koda (vidinis identifikatorius).
        return m.label !== "Kodas";
      }),
      sections: sections,
      disclaimer: DISCLAIMER_PUBLIC
    };
  }

  // Bendra iejimo funkcija.
  function build(audience, data) {
    return audience === "public" ? buildPublicReport(data) : buildInternalReport(data);
  }

  root.GP_REPORTS = {
    version: VERSION,
    METHODOLOGY: METHODOLOGY,
    buildInternalReport: buildInternalReport,
    buildPublicReport: buildPublicReport,
    build: build
  };
})(typeof window !== "undefined" ? window : this);
