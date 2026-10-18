/* ============================================================================
 * G-Procure Tiekėjams - veikimas be interneto (service worker)
 * ----------------------------------------------------------------------------
 * KAM. Tiekėjas dažnai skaito pirkimo dokumentus ten, kur ryšys prastas (objekte,
 * kelionėje). Visas dokumentų apdorojimas vyksta naršyklėje, tad be interneto gali
 * veikti viskas, išskyrus AI atsakymus: ZIP ir PDF skaitymas, santrauka, paieška
 * dokumentuose, kontrolinio sąrašo vietos, klausimo projektas ir bendrieji
 * klausimai. Šis failas po pirmo apsilankymo su internetu išsaugo modulį ir jo
 * bibliotekas naršyklės talpykloje.
 *
 * STRATEGIJA.
 *   - Savi failai (šis modulis ir ../shared/): pirmiausia TINKLAS, talpykla tik
 *     kai tinklo nėra. Taip prisijungęs naršytojas visada gauna naujausią kodą, o
 *     pamiršus pakeisti VERSIJA niekas neužstringa senoje versijoje.
 *   - Bibliotekos (pdf.js su darbininku, mammoth, xlsx, jszip) - nuo 2026-10-16 iš pačios svetainės
 *     (../shared/vendor/<vardas>-<versija>/; iki tol - iš CDN): išsaugomos diegiant
 *     ir imamos pirmiausia iš TALPYKLOS - adrese yra versija, turinys nesikeičia.
 *   - Šriftas (shared/sriftai/, nuo 2026-10-16 - ne Google Fonts): savas failas, kaip kiti.
 *   - AI užklausos (api.g-procure.com) ir visa kita: TIK tinklas, niekas nesaugoma.
 *     Klausimai ir dokumentų fragmentai į talpyklą niekada nepatenka.
 *
 * KEIČIANT MODULĮ: padidinkite VERSIJA - tada senoji talpykla išvaloma.
 * ==========================================================================*/
"use strict";

var VERSIJA = "ppt-2026-10-18-3";

var SAVI = [
  "./",
  "./index.html",
  "./asistentas.js",
  "./cvpis.js",
  "./paieska.js",
  "./zinios.js",
  "../shared/dokumentai.js",
  "../shared/pdf-darbininkas.js",
  "../shared/bibliotekos.js",
  "../shared/organizacijos.js",
  "../shared/skelbimas.js",
  "../shared/epso-g.css",
  "../shared/sriftai/nunito-sans-latin.woff2",
  "../shared/sriftai/nunito-sans-latin-ext.woff2",
  "../shared/sriftai/nunito-sans-italic-latin.woff2",
  "../shared/sriftai/nunito-sans-italic-latin-ext.woff2",
  "../shared/modulio-antraste.css",
  "../shared/modulio-antraste.js",
  "../shared/ai-proxy.js",
  "../shared/lang-detect.js",
  "../shared/portal-link.js",
  "../shared/sutikimas.js",
  "../shared/analitika.js",
  "../shared/bibliotekos-atmintis.js",
  "../shared/prieinamumas.js",
  "../shared/pranesimas.js",
  "../shared/di-zymejimas.js",
  "../shared/kopija.js",
  "../shared/procurement-methods.js",
  "../shared/gprocure-info-panel.js"
];

/* Tos pačios bibliotekos kaip index.html (ir pdf.js darbininkas, kurį pdf.js kraus tik atidarius pirmą PDF -
   todėl jis išsaugomas iš anksto). Adresuose - versija (žr. ../shared/vendor/bibliotekos.json). */
var BIBLIOTEKOS = [
  "../shared/vendor/pdfjs-3.11.174/pdf.min.js",
  "../shared/vendor/pdfjs-3.11.174/pdf.worker.min.js",
  "../shared/vendor/mammoth-1.13.0/mammoth.browser.min.js",
  "../shared/vendor/xlsx-0.20.3/xlsx.full.min.js",
  "../shared/vendor/jszip-3.10.1/jszip.min.js"
];

/* Šriftas nuo 2026-10-16 - svetainėje (shared/sriftai/, SAVI), ne iš Google Fonts. */

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSIJA).then(function (c) {
    // Savi failai ir bibliotekos privalomi: jei jų nepavyko išsaugoti, veikimas be interneto neveiktų.
    return c.addAll(SAVI.concat(BIBLIOTEKOS));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("ppt-") === 0 && k !== VERSIJA; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function tinklasPirma(req) {
  return fetch(req).then(function (r) {
    if (r && r.ok && r.type === "basic") {
      var kopija = r.clone();
      caches.open(VERSIJA).then(function (c) { c.put(req, kopija); });
    }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (m) {
      if (m) return m;
      // Naršymas be interneto į bet kurį šio katalogo adresą - rodom modulį
      if (req.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    });
  });
}

function talpyklaPirma(req) {
  return caches.match(req.url, { ignoreSearch: true }).then(function (m) {
    if (m) return m;
    return fetch(req).then(function (r) {
      if (r && r.ok && r.type === "basic") {
        var kopija = r.clone();
        caches.open(VERSIJA).then(function (c) { c.put(req.url, kopija); });
      }
      return r;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                 // DI kvietimai (POST) - tik tinklas
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // Tik savi statiniai failai; testų puslapio ir kitų modulių nesaugom
    if (/\/shared\/vendor\//.test(url.pathname)) { e.respondWith(talpyklaPirma(req)); return; }   // bibliotekos - talpykla pirma
    if (/\/PP-tiekejams\/|\/shared\//.test(url.pathname) && !/testai\.html$/.test(url.pathname)) {
      e.respondWith(tinklasPirma(req));
    }
    return;
  }
  // Visa kita (CVP IS, TED, api.g-procure.com ir t. t.) - naršyklė tvarko pati
});
