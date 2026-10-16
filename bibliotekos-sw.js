/* ============================================================================
 * G-Procure  bibliotekos-sw.js   (programų bibliotekų atmintis darbui be interneto, nuo 2026-10-16)
 * ----------------------------------------------------------------------------
 * Programų bibliotekos (pdf.js, JSZip, mammoth, SheetJS, docx, FileSaver, Chart.js, jsPDF) nuo 2026-10-16 gyvena
 * pačioje svetainėje (shared/vendor/<vardas>-<versija>/, sąrašas - shared/vendor/bibliotekos.json). GitHub Pages
 * failus leidžia laikyti naršyklės atmintyje tik 10 minučių, o CDN leido metus. Šis darbininkas tą skirtumą panaikina:
 * pirmą kartą panaudota biblioteka įsimenama naršyklės talpykloje (Cache Storage) ir vėliau imama iš jos be tinklo -
 * ir darbui be interneto.
 *
 * LIEČIA TIK BIBLIOTEKŲ FAILUS: kiti adresai (puslapiai, moduliai, duomenys, DI užklausos) nepertraukiami - juos
 * naršyklė krauna kaip įprasta. Adresuose yra versija, todėl failas niekada nesikeičia: talpykla pirma.
 * Nauja ar atnaujinta biblioteka - naujas adresas BIBLIOTEKOS sąraše (testai tikrina, kad sąrašas = bibliotekos.json);
 * įsijungus naujai versijai iš talpyklos pašalinami sąraše nebesantys failai.
 *
 * Talpykla - būtinoji naršyklės saugykla (programos failai, ne jūsų duomenys; slapukai.html). Registruoja
 * shared/bibliotekos-atmintis.js. PP-tiekejams ir PP-teise turi savus darbininkus (jų katalogams jie svarbesni).
 * ========================================================================== */
"use strict";

var TALPYKLA = "gp-bibliotekos-1";
var BIBLIOTEKOS = [
  "shared/vendor/pdfjs-3.11.174/pdf.min.js",
  "shared/vendor/pdfjs-3.11.174/pdf.worker.min.js",
  "shared/vendor/jszip-3.10.1/jszip.min.js",
  "shared/vendor/mammoth-1.13.0/mammoth.browser.min.js",
  "shared/vendor/xlsx-0.20.3/xlsx.full.min.js",
  "shared/vendor/docx-8.5.0/index.umd.js",
  "shared/vendor/file-saver-2.0.5/FileSaver.min.js",
  "shared/vendor/chartjs-4.4.1/chart.umd.min.js",
  "shared/vendor/jspdf-4.2.1/jspdf.umd.min.js",
  "shared/vendor/jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js"
];

var SAKNIS = new URL("./", self.location.href).pathname;
var KELIAI = BIBLIOTEKOS.map(function (f) { return SAKNIS + f; });
// Failas, kurio biblioteka prireiks vėliau, - išsaugomas kartu: pdf.js darbininką pdf.js krauna tik atvėrus pirmą PDF,
// todėl be šito PDF be interneto neatsivertų, nors pdf.js išsaugotas.
var KARTU = {};
KARTU[SAKNIS + "shared/vendor/pdfjs-3.11.174/pdf.min.js"] = SAKNIS + "shared/vendor/pdfjs-3.11.174/pdf.worker.min.js";

function issaugok(c, kelias) {
  return c.match(kelias).then(function (m) {
    if (m) return;
    return fetch(kelias).then(function (r) { if (r && r.ok && r.type === "basic") return c.put(kelias, r); });
  }).catch(function () {});
}

self.addEventListener("install", function (e) { e.waitUntil(self.skipWaiting()); });

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.open(TALPYKLA).then(function (c) {
    return c.keys().then(function (irasai) {
      return Promise.all(irasai.filter(function (r) { return KELIAI.indexOf(new URL(r.url).pathname) < 0; })
        .map(function (r) { return c.delete(r); }));
    });
  }).catch(function () {}).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || KELIAI.indexOf(url.pathname) < 0) return;   // ne biblioteka - nepertraukiama
  if (KARTU[url.pathname]) e.waitUntil(caches.open(TALPYKLA).then(function (c) { return issaugok(c, KARTU[url.pathname]); }));
  e.respondWith(caches.open(TALPYKLA).then(function (c) {
    return c.match(url.pathname).then(function (m) {
      if (m) return m;
      return fetch(req).then(function (r) {
        if (r && r.ok && r.type === "basic") c.put(url.pathname, r.clone()).catch(function () {});
        return r;
      });
    });
  }).catch(function () { return fetch(req); }));
});
