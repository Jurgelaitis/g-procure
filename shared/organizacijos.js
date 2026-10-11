/* ============================================================================
 * G-Procure  shared/organizacijos.js   (window.GP_ORG)
 * ----------------------------------------------------------------------------
 * PIRKIMO VYKDYTOJŲ REGISTRAS (window.GP_ORG). Įrankis nuo 2026-09-24 skirtas
 * bet kurio CVP IS pirkimo dokumentams: pirkimo vykdytojas ir teisinis režimas
 * (PĮ / VPĮ) atpažįstami iš skelbimo (cvpis.js) ir patvirtinami naudotojo.
 * Šis registras tik PAPILDO: žinomai organizacijai duoda patikrintas viešas
 * nuorodas (pirkimų sąrašas CVP IS, taisyklės, planas) ir sieja ją su žinių
 * bazės šaltiniu (zinios.js, tipas „perkanciojo_taisykles“).
 *
 * Iki 2026-09-26 gyveno PP-tiekejams/. Dabar jį naudoja ir bendra pirkimo kortelė
 * (shared/pirkimo-kortele.js): vykdytojo sąrašas ir tikėtinas režimas imami iš ČIA,
 * tad organizacija ar jos režimas keičiami vienoje vietoje. PP-tiekejams sw.js jį
 * turi sąraše SAVI.
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
 *   - `centrinesValdzios` - ar organizacija įrašyta į centrinės valdžios institucijų
 *     sąrašą (GP_TEISE „centrines_valdzios_sarasas“). Nuo to priklauso VPĮ tarptautinio
 *     pirkimo riba prekėms ir paslaugoms (shared/taisykles.js). Sąrašas perskaitytas e-tar
 *     2026-09-27 (suvestinė redakcija nuo 2024-02-07): nė vienos iš keturių įmonių jame
 *     nėra; EPSO-G tą pačią dieną patvirtino ir pirkimų komanda. Naujai organizacijai
 *     laukas rašomas tik perskaičius sąrašą - be jo variklis tarpinei vertei klausia.
 *   - `rekvizitai` (nuo 2026-10-11) - organizacijos, kaip sutarties šalies, rekvizitai: juridinio asmens kodas, adresas, PVM
 *     mokėtojo kodas, atsiskaitomoji sąskaita, bankas ir jo kodas, telefonas, el. paštas. Rašomi TIK iš pačios organizacijos
 *     dokumentų: LITGRID AB - iš jos sutarčių formų (prekių ir paslaugų pirkimo-pardavimo bei projektavimo ir statybos rangos
 *     sutarčių specialiosios sąlygos, PP-salygos/templates/sutartys/); PP-salygos testai tikrina, kad registras sutampa su
 *     šiomis formomis. Naudoja PP-salygos sutarties generatorius ten, kur formoje pirkimo vykdytojo sąskaita ir bankas palikti
 *     tušti (projektavimo paslaugų sutarties 7.1 punktas) - naudotojo taisyklė 2026-10-11: pirkimo vykdytojo rekvizitai
 *     rengiant sutarties projektą žinomi, todėl įrašomi automatiškai. Kitoms organizacijoms - `null` (formų nėra).
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var PATIKRINTA = "2026-09-24";

  var ORGANIZACIJOS = [
    { id: "litgrid", pavadinimas: "LITGRID AB", atpazinimas: /\blitgrid\b/i, cvpisPaieska: "LITGRID AB", rezimasTiketinas: "PI", centrinesValdzios: false,
      nuorodos: { taisykles: "https://www.litgrid.eu/index.php/apie-litgrid/litgrid-pirkimai/pirkimu-taisykles/837", planas: "https://www.litgrid.eu/index.php/apie-litgrid/litgrid-pirkimai/pirkimai/829" },
      taisykles: { saltinis: "S3", patikrinta: "2026-09-02", pastaba: { lt: "Mažos vertės pirkimų aprašas ir informacija tiekėjams (LITGRID svetainė).", en: "Low-value procurement rules and supplier information (LITGRID website)." } },
      rekvizitai: { kodas: "302564383", adresas: "Karlo Gustavo Emilio Manerheimo g. 8, LT-05131 Vilnius", pvmKodas: "LT100005748413", saskaita: "LT242150051000021766",
                    bankas: "OP Corporate Bank plc Lietuvos filialas", bankoKodas: "21500", telefonas: "+370 707 02171", elPastas: "info@litgrid.eu",
                    saltinis: "LITGRID AB sutarčių formos (prekių, paslaugų ir rangos sutarčių specialiosios sąlygos)", patikrinta: "2026-10-11" },
      patikrinta: PATIKRINTA },
    { id: "amber-grid", pavadinimas: "AB Amber Grid", atpazinimas: /\bamber\s*grid\b/i, cvpisPaieska: "Amber Grid", rezimasTiketinas: "PI", centrinesValdzios: false,
      nuorodos: {}, taisykles: null, patikrinta: PATIKRINTA },
    { id: "epso-g", pavadinimas: "UAB EPSO-G", atpazinimas: /\bepso[\s­‐‑-]*g\b/i, cvpisPaieska: "EPSO-G", rezimasTiketinas: "VPI", centrinesValdzios: false,
      nuorodos: {}, taisykles: null, patikrinta: PATIKRINTA },
    { id: "energy-cells", pavadinimas: "UAB Energy cells", atpazinimas: /\benergy[\s­‐‑-]*cells\b/i, cvpisPaieska: "Energy cells", rezimasTiketinas: "PI", centrinesValdzios: false,
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
  // Sutarties šalies rekvizitai pagal organizacijos id arba pavadinimą; nežinomai ar be rekvizitų - null (nespėjama)
  function rekvizitai(kas) { var o = pagalId(kas) || rask(kas); return o && o.rekvizitai ? o.rekvizitai : null; }

  global.GP_ORG = { version: "0.3.0", PATIKRINTA: PATIKRINTA, ORGANIZACIJOS: ORGANIZACIJOS, REZIMAI: REZIMAI, rask: rask, pagalId: pagalId, sarasoUrl: sarasoUrl, rekvizitai: rekvizitai };
})(typeof window !== "undefined" ? window : this);
