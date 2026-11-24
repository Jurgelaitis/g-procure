/* ============================================================================
 * G-Procure  shared/pdf-darbininkas.js   (window.GP_PDF_DARBININKAS)
 * ----------------------------------------------------------------------------
 * pdf.js VISIEMS PDF skaitytojams: biblioteka, darbininkas ir dokumento atidarymas vienoje vietoje.
 *
 * Nuo 2026-11-24 (saugumo auditas G-17) - pdf.js 6.5.438 (legacy build: Chrome 125+, Safari 18+, Firefox ESR); iki tol
 * 3.11.174 su žinoma spraga CVE-2024-4367 (6.x šriftų kodo per eval nebegeneruoja visai). Nuo 4.x pdf.js platinamas tik
 * ES moduliu, todėl biblioteka įkeliama tik prireikus - import() iš pačios svetainės (shared/vendor/pdfjs-6.5.438/), o
 * window.pdfjsLib - jos eksportai (modulis jį nustato pats, kaip senoji versija). pdf.js <script> žymos puslapiuose nebėra.
 * Darbininkas - tos pačios kilmės modulis; darbui be interneto abu failus laiko bibliotekos-sw.js (ir PP-tiekejams/sw.js).
 * Iki 2026-10-16 darbininkas buvo parsiunčiamas iš cdnjs su integrity ir paleidžiamas iš blob: adreso.
 *
 *   await GP_PDF_DARBININKAS.atidaryk(buf)  -> PDFDocumentProxy (ArrayBuffer ar Uint8Array). pdf.js nuo 4.x duomenis PERKELIA
 *                                              į darbininką (buferis tampa tuščias), todėl perduodama kopija - skaitytojas
 *                                              savo buferį gali naudoti toliau.
 *   await GP_PDF_DARBININKAS.ikelk()        -> pdfjsLib (įkelia biblioteką ir nustato darbininką; be jos - klaida žmogui)
 *   await GP_PDF_DARBININKAS.nustatyk()     -> darbininko adresas (tas pats kaip ikelk(); senesniems kvietimams)
 * pdfjsLib.getDocument kitur nekviečiamas (sargas shared/testai.html). Keičiant versiją - KATALOGAS čia,
 * shared/vendor/bibliotekos.json (ir .github/testai/sbom.py --rasyk), bibliotekos-sw.js ir PP-tiekejams/sw.js.
 * ========================================================================== */
;(function (global) {
  "use strict";

  var doc = global.document;
  var src = (doc && doc.currentScript && doc.currentScript.src) || "";
  var KATALOGAS = "vendor/pdfjs-6.5.438/";
  var BAZE = src ? src.replace(/pdf-darbininkas\.js(\?.*)?$/, "") : "../shared/";

  function en() { return !!(doc && /^en/i.test(doc.documentElement.getAttribute("lang") || "")); }

  function klaida() {
    return new Error(global.GP_BIBLIOTEKOS ? global.GP_BIBLIOTEKOS.tekstas("veiksmas", "pdf.js (PDF)")
      : (en() ? "The PDF reading library (pdf.js) could not be loaded - reload the page." : "Nepavyko įkelti PDF skaitymo bibliotekos (pdf.js) - perkraukite puslapį."));
  }

  var krovimas = null;
  // -> Promise<pdfjsLib>; įkelia biblioteką ir nustato darbininko adresą (modulį naršyklė įkelia vieną kartą, vienu metu
  // vykstantys kvietimai laukia to paties). Nepavykus - klaida žmogui, o kitas kvietimas bando iš naujo (pvz. atsiradus ryšiui).
  function ikelk() {
    var L = global.pdfjsLib;
    if (L && L.getDocument && L.GlobalWorkerOptions) {
      L.GlobalWorkerOptions.workerSrc = api.SRC;
      return Promise.resolve(L);
    }
    if (!krovimas) {
      var p;
      try { p = import(api.MODULIS); } catch (e) { p = Promise.reject(e); }
      krovimas = p.then(function (m) {
        krovimas = null;
        var lib = (global.pdfjsLib && global.pdfjsLib.getDocument) ? global.pdfjsLib : m;
        if (!lib || !lib.getDocument || !lib.GlobalWorkerOptions) throw new Error("pdf.js");
        global.pdfjsLib = lib;
        lib.GlobalWorkerOptions.workerSrc = api.SRC;
        return lib;
      }, function (e) { krovimas = null; throw e; }).catch(function () { throw klaida(); });
    }
    return krovimas;
  }

  function nustatyk() { return ikelk().then(function () { return api.SRC; }); }

  // ArrayBuffer ar Uint8Array (ir iš kito rėmelio) -> nauja Uint8Array kopija (pdf.js ją perkels darbininkui)
  function kopija(buf) {
    if (Object.prototype.toString.call(buf) === "[object ArrayBuffer]") return new Uint8Array(buf.slice(0));
    if (ArrayBuffer.isView(buf)) return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    throw new Error(en() ? "PDF data could not be read." : "PDF duomenų perskaityti nepavyko.");
  }

  // -> Promise<PDFDocumentProxy>. isEvalSupported: false - 6.x eval nebenaudoja, bet nuostata paliekama apsaugai
  // (jei kada būtų grįžta prie senesnės versijos; sargas shared/testai.html).
  function atidaryk(buf) {
    return ikelk().then(function (L) {
      return L.getDocument({ data: kopija(buf), isEvalSupported: false }).promise;
    });
  }

  var api = {
    KATALOGAS: KATALOGAS,
    MODULIS: BAZE + KATALOGAS + "pdf.min.mjs",
    SRC: BAZE + KATALOGAS + "pdf.worker.min.mjs",
    ikelk: ikelk, nustatyk: nustatyk, atidaryk: atidaryk, kopija: kopija
  };
  global.GP_PDF_DARBININKAS = api;
})(typeof window !== "undefined" ? window : this);
