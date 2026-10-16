/* ============================================================================
 * G-Procure  shared/pdf-darbininkas.js   (window.GP_PDF_DARBININKAS)
 * ----------------------------------------------------------------------------
 * pdf.js darbininkas (pdf.worker.min.js) VISIEMS PDF skaitytojams.
 *
 * Nuo 2026-10-16 darbininkas - iš pačios svetainės (shared/vendor/pdfjs-3.11.174/, kaip ir pdf.min.js), todėl
 * pdf.js jį paleidžia tiesiogiai, tos pačios kilmės adresu: kitos kilmės failo, kurio SRI nepatikrintų, nebėra.
 * Iki tol (2026-09-28) darbininkas buvo parsiunčiamas iš cdnjs su integrity ir paleidžiamas iš blob: adreso.
 * Darbui be interneto failą laiko bibliotekos-sw.js (ir PP-tiekejams/sw.js).
 *
 * Naudojimas prieš pdfjsLib.getDocument: await GP_PDF_DARBININKAS.nustatyk();
 * (shared/dokumentai.js tai daro pats). Versija turi sutapti su puslapių pdf.min.js (3.11.174): keičiant -
 * VERSIJOS katalogas, shared/vendor/bibliotekos.json, bibliotekos-sw.js ir PP-tiekejams/sw.js.
 * ========================================================================== */
;(function (global) {
  "use strict";

  var doc = global.document;
  var src = (doc && doc.currentScript && doc.currentScript.src) || "";
  var KATALOGAS = "vendor/pdfjs-3.11.174/";
  var SRC = src ? src.replace(/pdf-darbininkas\.js(\?.*)?$/, KATALOGAS + "pdf.worker.min.js") : "../shared/" + KATALOGAS + "pdf.worker.min.js";

  function en() { return !!(doc && /^en/i.test(doc.documentElement.getAttribute("lang") || "")); }

  // -> Promise su darbininko adresu; nustato pdfjsLib.GlobalWorkerOptions.workerSrc. Be pdf.js - klaida žmogui.
  function nustatyk() {
    if (!global.pdfjsLib) {
      return Promise.reject(new Error(global.GP_BIBLIOTEKOS ? global.GP_BIBLIOTEKOS.tekstas("veiksmas", "pdf.js (PDF)")
        : (en() ? "The PDF reading library (pdf.js) could not be loaded - reload the page." : "Nepavyko įkelti PDF skaitymo bibliotekos (pdf.js) - perkraukite puslapį.")));
    }
    global.pdfjsLib.GlobalWorkerOptions.workerSrc = api.SRC;
    return Promise.resolve(api.SRC);
  }

  var api = { SRC: SRC, nustatyk: nustatyk };
  global.GP_PDF_DARBININKAS = api;
})(typeof window !== "undefined" ? window : this);
