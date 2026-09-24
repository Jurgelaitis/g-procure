/* ============================================================================
 * G-Procure Tiekėjams  organizacijos.js
 * ----------------------------------------------------------------------------
 * PIRKIMO VYKDYTOJŲ REGISTRAS (window.GP_ORG). Įrankis nuo 2026-09-24 skirtas
 * bet kurio CVP IS pirkimo dokumentams: pirkimo vykdytojas ir teisinis režimas
 * (PĮ / VPĮ) atpažįstami iš skelbimo (cvpis.js) ir patvirtinami naudotojo.
 * Šis registras tik PAPILDO: žinomai organizacijai duoda patikrintas viešas
 * nuorodas (pirkimų sąrašas CVP IS, taisyklės, planas) ir sieja ją su žinių
 * bazės šaltiniu (zinios.js, tipas „perkanciojo_taisykles“).
 *
 * TAISYKLĖS:
 *   - Organizacijos taisyklių šaltinis įrašomas TIK perskaitytas ir patikrintas
 *     (data „patikrinta“). Be jo `taisykles: null`, ir sąsaja sako, kad
 *     organizacijos taisyklių registre nėra - ne spėja.
 *   - `rezimasTiketinas` - ką organizacija paprastai taiko; konkretaus pirkimo
 *     režimą lemia SKELBIMAS (2026-09-24 tikruose skelbimuose: Energy cells
 *     skelbimas 9614756 buvo „perkančiosios organizacijos“ formos). Nesutapimas
 *     rodomas naudotojui, ne nutylimas.
 *   - `cvpisPaieska` - pirkimo vykdytojo lauko reikšmė CVP IS sąrašo adresui;
 *     patikrinta curl 2026-09-24 (sąrašas grąžino šios organizacijos pirkimus).
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var PATIKRINTA = "2026-09-24";

  var ORGANIZACIJOS = [
    { id: "litgrid", pavadinimas: "LITGRID AB", atpazinimas: /\blitgrid\b/i, cvpisPaieska: "LITGRID AB", rezimasTiketinas: "PI",
      nuorodos: { taisykles: "https://www.litgrid.eu/index.php/apie-litgrid/litgrid-pirkimai/pirkimu-taisykles/837", planas: "https://www.litgrid.eu/index.php/apie-litgrid/litgrid-pirkimai/pirkimai/829" },
      taisykles: { saltinis: "S3", patikrinta: "2026-09-02", pastaba: { lt: "Mažos vertės pirkimų aprašas ir informacija tiekėjams (LITGRID svetainė).", en: "Low-value procurement rules and supplier information (LITGRID website)." } },
      patikrinta: PATIKRINTA },
    { id: "amber-grid", pavadinimas: "AB Amber Grid", atpazinimas: /\bamber\s*grid\b/i, cvpisPaieska: "Amber Grid", rezimasTiketinas: "PI",
      nuorodos: {}, taisykles: null, patikrinta: PATIKRINTA },
    { id: "epso-g", pavadinimas: "UAB EPSO-G", atpazinimas: /\bepso[\s­‐‑-]*g\b/i, cvpisPaieska: "EPSO-G", rezimasTiketinas: "VPI",
      nuorodos: {}, taisykles: null, patikrinta: PATIKRINTA },
    { id: "energy-cells", pavadinimas: "UAB Energy cells", atpazinimas: /\benergy[\s­‐‑-]*cells\b/i, cvpisPaieska: "Energy cells", rezimasTiketinas: "PI",
      nuorodos: {}, taisykles: null, patikrinta: PATIKRINTA }
  ];

  var REZIMAI = {
    PI:  { lt: "PĮ (perkantysis subjektas)", en: "PĮ (contracting entity, utilities law)", trumpas: "PĮ" },
    VPI: { lt: "VPĮ (perkančioji organizacija)", en: "VPĮ (contracting authority, classic law)", trumpas: "VPĮ" }
  };

  // Organizacija pagal pavadinimą iš skelbimo (arba įvestą ranka); minkštieji brūkšneliai iš PDF suvienodinami
  function rask(pavadinimas) {
    var p = String(pavadinimas || "").replace(/[­‐‑]/g, "-");
    if (!p.trim()) return null;
    return ORGANIZACIJOS.filter(function (o) { return o.atpazinimas.test(p); })[0] || null;
  }
  function pagalId(id) { return ORGANIZACIJOS.filter(function (o) { return o.id === id; })[0] || null; }
  function sarasoUrl(o, nuo) { return global.GP_CVPIS ? global.GP_CVPIS.URL.organizacijosSarasas(o.cvpisPaieska, nuo) : null; }

  global.GP_ORG = { version: "0.1.0", PATIKRINTA: PATIKRINTA, ORGANIZACIJOS: ORGANIZACIJOS, REZIMAI: REZIMAI, rask: rask, pagalId: pagalId, sarasoUrl: sarasoUrl };
})(typeof window !== "undefined" ? window : this);
