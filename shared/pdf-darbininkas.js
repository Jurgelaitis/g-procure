/* ============================================================================
 * G-Procure  shared/pdf-darbininkas.js   (window.GP_PDF_DARBININKAS)
 * ----------------------------------------------------------------------------
 * pdf.js darbininkas (pdf.worker.min.js) su SRI VISIEMS PDF skaitytojams (2026-09-28).
 *
 * pdf.min.js puslapiuose įkeliamas su integrity, bet darbininko adresas
 * (GlobalWorkerOptions.workerSrc) SRI nepalaiko: kitos kilmės darbininką pdf.js
 * paleidžia per importScripts, tad pakeistas CDN failas matytų kiekvieną skaitomą
 * dokumentą (tiekėjų pasiūlymus, TS) ir galėtų jį išsiųsti. Todėl failas
 * parsiunčiamas fetch su integrity ir paleidžiamas iš blob: adreso (ta pati kilmė).
 *
 * Naudojimas prieš pdfjsLib.getDocument: await GP_PDF_DARBININKAS.nustatyk();
 * (shared/dokumentai.js tai daro pats). Versija turi sutapti su puslapių pdf.min.js
 * (3.11.174): keičiant versiją keisk SRC ir SRI (cdnjs skelbia sha512) ir
 * PP-tiekejams/sw.js CDN sąrašą.
 * ========================================================================== */
;(function (global) {
  "use strict";

  var pazadas = null;

  // Klaidos tekstas žmogui pagal <html lang> (iki 2026-09-28 - tik lietuviškai, su naršyklės „Failed to fetch“)
  function en() { return !!(global.document && /^en/i.test(global.document.documentElement.getAttribute("lang") || "")); }
  function klaidosTekstas() {
    return en() ? "Part of the PDF reading library (the pdf.js worker) could not be loaded: no internet connection, the network blocks cdnjs.cloudflare.com, or the file on the server has changed (security check). PDFs cannot be read - reload the page; if it persists, contact IT."
                : "Nepavyko įkelti PDF skaitymo bibliotekos dalies (pdf.js darbininko): nėra interneto ryšio, tinklas blokuoja cdnjs.cloudflare.com arba failas serveryje pakeistas (saugumo patikra). PDF neskaitomas - perkraukite puslapį; jei kartojasi - kreipkitės į IT.";
  }

  // -> Promise su blob: adresu; nustato pdfjsLib.GlobalWorkerOptions.workerSrc. Nepavykus (tinklas, kita maiša) -
  // klaida, adresas nekeičiamas, o kitas kvietimas bando iš naujo.
  function nustatyk() {
    if (!global.pdfjsLib) {
      return Promise.reject(new Error(global.GP_BIBLIOTEKOS ? global.GP_BIBLIOTEKOS.tekstas("veiksmas", "pdf.js (PDF)")
        : (en() ? "The PDF reading library (pdf.js) could not be loaded - reload the page." : "Nepavyko įkelti PDF skaitymo bibliotekos (pdf.js) - perkraukite puslapį.")));
    }
    if (!pazadas) {
      pazadas = global.fetch(api.SRC, { integrity: api.SRI, mode: "cors", credentials: "omit" })
        .then(function (r) {
          if (!r.ok) throw new Error("atsakymas " + r.status);
          return r.blob();
        })
        .then(function (b) { return global.URL.createObjectURL(new Blob([b], { type: "text/javascript" })); })
        .catch(function (e) {
          pazadas = null;
          if (global.console) global.console.warn("pdf.js darbininkas:", e);   // techninė priežastis - konsolėje, žmogui - tekstas
          throw new Error(klaidosTekstas());
        });
    }
    return pazadas.then(function (u) { global.pdfjsLib.GlobalWorkerOptions.workerSrc = u; return u; });
  }

  var api = {
    SRC: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    SRI: "sha512-BbrZ76UNZq5BhH7LL7pn9A4TKQpQeNCHOo65/akfelcIBbcVvYWOFQKPXIrykE3qZxYjmDX573oa4Ywsc7rpTw==",
    nustatyk: nustatyk
  };
  global.GP_PDF_DARBININKAS = api;
})(typeof window !== "undefined" ? window : this);
