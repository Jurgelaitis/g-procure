/* ============================================================================
 * G-Procure  shared/backup.js   (v1.0)
 * ----------------------------------------------------------------------------
 * Atsarginės duomenų kopijos branduolys (window.GP_BACKUP).
 *
 * KODEL ATSKIRAI NUO PUSLAPIO. Visi moduliai gyvena toje pačioje kilmėje
 * (g-procure.com), tad jie dalijasi viena localStorage saugykla. Kopijos logika
 * čia parašyta taip, kad saugykla paduodama iš išorės - todėl testai gali paduoti
 * netikrą saugyklą ir NIEKADA neliesti tikrų naudotojo duomenų. Sąsaja
 * (`atsargine-kopija.html`) paduoda tikrą `localStorage`.
 *
 * Saugyklos objektas turi turėti: length, key(i), getItem(k), setItem(k, v).
 *
 * Failo formatas (v1):
 *   { app: "G-Procure", version: 1, createdAt: ISO, origin: "...", items: { raktas: reikšmė } }
 * ==========================================================================*/
(function (global) {
  "use strict";

  var APP = "G-Procure";
  var VERSION = 1;

  /* Raktų prefiksai -> modulis ir žmogui suprantamas pavadinimas.
     Nežinomas raktas NEDINGSTA: jis patenka į kopiją ir rodomas kaip „kiti duomenys". */
  var ZENKLAI = [
    ["litgrid_procurements",     "PP-protocol",     { lt: "Pirkimai ir protokolai", en: "Procurements and minutes" }],
    ["litgrid_pranesimai_audit", "PP-protocol",     { lt: "Audito žurnalas", en: "Audit log" }],
    ["litgrid_pranesimai",       "PP-protocol",     { lt: "Pranešimai tiekėjams", en: "Notices to suppliers" }],
    ["litgrid_user_profile",     "PP-protocol",     { lt: "Naudotojo profilis", en: "User profile" }],
    ["litgrid_pirkimo_drafts",   "PP-report",       { lt: "Pažymų juodraščiai", en: "Report drafts" }],
    ["litgrid_cba",              "PP-cost-benefit", { lt: "Kaštų ir naudos analizė", en: "Cost-benefit analysis" }],
    ["epsog_en_skaiciuokle",     "PP-cost-benefit", { lt: "Ekonominio naudingumo skaičiuoklė", en: "Economic benefit calculator" }],
    ["epsog_rinkos_kpi",         "PP-market-KPI",   { lt: "Rinkos rodikliai", en: "Market indicators" }],
    ["epsog_dash_metric",        "PP-market-KPI",   { lt: "Pasirinktas rodiklis", en: "Selected indicator" }],
    ["ppmarket.lang",            "PP-market-KPI",   { lt: "Pasirinkta kalba", en: "Chosen language" }],
    ["epsog_mpp",                "PP-plan",         { lt: "Metinis pirkimų planas", en: "Annual procurement plan" }],
    ["epsog_derybos",            "PP-negotiation",  { lt: "Derybų pasirengimas", en: "Negotiation preparation" }],
    ["pp_carbon_data",           "PP-carbon",       { lt: "Anglies pėdsako duomenys", en: "Carbon footprint data" }],
    ["ppesg.",                   "PP-esg",          { lt: "ESG ir atitiktis", en: "ESG and compliance" }],
    ["pp_tiekejams",             "PP-tiekejams",    { lt: "Tiekėjų asistento duomenys", en: "Supplier assistant data" }],
    ["pptiekejams.lang",         "PP-tiekejams",    { lt: "Pasirinkta kalba", en: "Chosen language" }],
    ["ts_asistentas",            "PP-ts",           { lt: "TS asistento nustatymai", en: "Spec assistant settings" }],
    ["ppteise.",                 "PP-teise",        { lt: "Teisės stebėsenos peržiūros ir nustatymai", en: "Law monitoring reviews and settings" }],
    ["gprocure.korteles",        "G-Procure",       { lt: "Pirkimų kortelės", en: "Procurement cards" }],
    ["gprocure_help_collapsed",  "-",               { lt: "Pagalbos bloko būsena", en: "Help panel state" }],
    ["gprocure.infoPanel.",      "-",               { lt: "Informacinės skilties būsena", en: "Information panel state" }],
    ["gprocure-lang",            "-",               { lt: "Pasirinkta kalba", en: "Chosen language" }]
  ];

  function zenklas(raktas, lang) {
    var l = lang === "en" ? "en" : "lt";
    /* Neperskaitomo įrašo kopija (shared/saugykla.js): „<raktas>.sugadinta-<data>“. */
    var sug = String(raktas).indexOf(".sugadinta-") > 0;
    for (var i = 0; i < ZENKLAI.length; i++) {
      if (String(raktas).indexOf(ZENKLAI[i][0]) === 0) {
        return { modulis: ZENKLAI[i][1], pav: ZENKLAI[i][2][l] + (sug ? (l === "en" ? " (unreadable copy)" : " (neperskaitoma kopija)") : "") };
      }
    }
    return { modulis: "-", pav: l === "en" ? "Other data" : "Kiti duomenys" };
  }

  /* Visi saugyklos įrašai, didžiausi viršuje. Grąžina null, jei saugykla neprieinama
     (privatus langas, užblokuoti svetainės duomenys). */
  function irasai(saugykla) {
    var st = saugykla || global.localStorage;
    var out = [];
    try {
      for (var i = 0; i < st.length; i++) {
        var k = st.key(i);
        var v = st.getItem(k);
        out.push({ raktas: k, reiksme: v, baitai: baitai(k) + baitai(v) });
      }
    } catch (e) { return null; }
    out.sort(function (a, b) { return b.baitai - a.baitai; });
    return out;
  }

  /* UTF-8 baitai be Blob (veikia ir be DOM). */
  function baitai(s) {
    s = String(s == null ? "" : s);
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c & 0xFC00) === 0xD800 ? 2 : 3;
    }
    return n;
  }

  function surinkti(saugykla, data) {
    var sar = irasai(saugykla);
    if (sar === null) return null;
    var items = {};
    for (var i = 0; i < sar.length; i++) items[sar[i].raktas] = sar[i].reiksme;
    return {
      app: APP,
      version: VERSION,
      createdAt: (data || new Date()).toISOString(),
      origin: (global.location && global.location.origin) || "",
      items: items
    };
  }

  /* Failo tekstas -> { ok: true, obj } arba { ok: false, priezastis: "json" | "formatas" } */
  function patikrinti(tekstas) {
    var obj;
    try { obj = JSON.parse(tekstas); } catch (e) { return { ok: false, priezastis: "json" }; }
    if (!obj || obj.app !== APP || !obj.items || typeof obj.items !== "object" || Array.isArray(obj.items)) {
      return { ok: false, priezastis: "formatas" };
    }
    return { ok: true, obj: obj };
  }

  /* Kiek failo raktų saugykloje JAU yra (tiek bus perrašyta). */
  function perrasomi(obj, saugykla) {
    var st = saugykla || global.localStorage;
    var raktai = Object.keys(obj.items), n = 0;
    for (var i = 0; i < raktai.length; i++) {
      try { if (st.getItem(raktai[i]) !== null) n++; } catch (e) {}
    }
    return n;
  }

  /* Įrašo failo reikšmes. Kiti saugyklos raktai nepaliečiami. */
  function atkurti(obj, saugykla) {
    var st = saugykla || global.localStorage;
    var raktai = Object.keys(obj.items), ok = 0, blogai = 0;
    for (var i = 0; i < raktai.length; i++) {
      try { st.setItem(raktai[i], obj.items[raktai[i]]); ok++; }
      catch (e) { blogai++; }
    }
    return { ok: ok, blogai: blogai };
  }

  function failoVardas(data) {
    return "g-procure-kopija-" + (data || new Date()).toISOString().slice(0, 10) + ".json";
  }

  global.GP_BACKUP = {
    version: "1.0", APP: APP, FORMATO_VERSIJA: VERSION,
    zenklas: zenklas, irasai: irasai, baitai: baitai,
    surinkti: surinkti, patikrinti: patikrinti, perrasomi: perrasomi,
    atkurti: atkurti, failoVardas: failoVardas
  };
})(typeof window !== "undefined" ? window : this);
