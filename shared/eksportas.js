/* ============================================================================
 * G-Procure  shared/eksportas.js   (v1.0, Q5 / B4, 2026-09-28)
 * Atsisiunčiamų failų vardai VISIEMS moduliams: <pirkimo numeris>_<dokumentas>_<pavadinimas>_<data>.<plėtinys>
 *   GP_EKSPORTAS.failoVardas({ numeris, dokumentas, pavadinimas, data, pletinys })
 *     -> „VPP-268_Protokolas-D6_Transformatorių_priežiūra_2026-09-28.docx“ (be dokumento ir pavadinimo - „g-procure_<data>“)
 *   GP_EKSPORTAS.dalis(tekstas, ilgis)  - viena vardo dalis; GP_EKSPORTAS.siandien() - vietinė data
 *
 * KODĖL. Iki 2026-09-28 kiekvienas modulis vardą dėliojo pats: vieni be pirkimo numerio (PP-protocol pranešimai),
 * kiti su neįskaitoma laiko žyme (PP-ts „TS_ataskaita_1790550000000.doc“), treti lietuviškas raides keitė „_“
 * („Transformatori__prieži_ra“), o data - iš toISOString(), t. y. UTC: 00:00-03:00 Lietuvos laiku failas gaudavo
 * VAKARYKŠTĘ datą. Čia: raidės ir skaitmenys bet kuria kalba lieka, draudžiami failų sistemoje ženklai ir tarpai
 * virsta „_“, data - vietinė (GP_WORKDAYS.siandien(), jei prijungtas), tuščios dalys praleidžiamos.
 * Nieko nesaugo ir nesiunčia. Testai - shared/testai.html („Datos ir failų vardai“).
 * ========================================================================== */
(function (global) {
  "use strict";
  if (global.GP_EKSPORTAS) return;

  function siandien() {
    if (global.GP_WORKDAYS && global.GP_WORKDAYS.siandien) return global.GP_WORKDAYS.siandien();
    var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }
  // Viena vardo dalis: raidės (ir lietuviškos), skaitmenys, „-“ ir „.“ lieka; visa kita - „_“
  function dalis(s, ilgis) {
    var x = String(s == null ? "" : s).normalize("NFC").replace(/[^\p{L}\p{N}.\-]+/gu, "_").replace(/_+/g, "_").replace(/^[_.\-]+|[_.\-]+$/g, "");
    if (ilgis && x.length > ilgis) {
      x = x.slice(0, ilgis);
      var p = x.lastIndexOf("_");
      if (p > ilgis * 0.6) x = x.slice(0, p);   // nekirpti žodžio per vidurį, jei galima
      x = x.replace(/[_.\-]+$/g, "");
    }
    return x;
  }
  function failoVardas(o) {
    o = o || {};
    var data = o.data === false ? "" : (o.data || siandien());
    var d = [dalis(o.numeris, 40), dalis(o.dokumentas, 60), dalis(o.pavadinimas, 50)].filter(Boolean);
    if (!d.length) d.push("g-procure");   // be jokio pavadinimo - ne vien data
    if (dalis(data, 20)) d.push(dalis(data, 20));
    var vardas = d.join("_");
    var pl = dalis(o.pletinys, 10).replace(/^\.+/, "");
    return pl ? vardas + "." + pl : vardas;
  }
  global.GP_EKSPORTAS = { versija: "1.0", failoVardas: failoVardas, dalis: dalis, siandien: siandien };
})(window);
