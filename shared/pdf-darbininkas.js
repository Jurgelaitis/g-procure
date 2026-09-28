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

  // -> Promise su blob: adresu; nustato pdfjsLib.GlobalWorkerOptions.workerSrc. Nepavykus (tinklas, kita maiša) -
  // klaida, adresas nekeičiamas, o kitas kvietimas bando iš naujo.
  function nustatyk() {
    if (!global.pdfjsLib) return Promise.reject(new Error("PDF skaitymo biblioteka (pdf.js) neįkelta"));
    if (!pazadas) {
      pazadas = global.fetch(api.SRC, { integrity: api.SRI, mode: "cors", credentials: "omit" })
        .then(function (r) {
          if (!r.ok) throw new Error("atsakymas " + r.status);
          return r.blob();
        })
        .then(function (b) { return global.URL.createObjectURL(new Blob([b], { type: "text/javascript" })); })
        .catch(function (e) {
          pazadas = null;
          throw new Error("PDF skaitymo bibliotekos dalis (darbininkas) nepasiekiama arba pakeista: " + ((e && e.message) || e));
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
