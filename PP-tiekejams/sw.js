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
 *   - CDN bibliotekos (pdf.js, mammoth, xlsx, jszip): pirmiausia TALPYKLA - jų
 *     adresuose yra versijos numeris, turinys nesikeičia. SRI (integrity) patikra
 *     lieka: talpykloje saugomas tas pats CORS atsakymas, baitai nekinta.
 *   - Šriftai (Google Fonts): talpykla, jei jau buvo parsiųsti; kitaip tinklas.
 *   - AI užklausos (api.g-procure.com) ir visa kita: TIK tinklas, niekas nesaugoma.
 *     Klausimai ir dokumentų fragmentai į talpyklą niekada nepatenka.
 *
 * KEIČIANT MODULĮ: padidinkite VERSIJA - tada senoji talpykla išvaloma.
 * ==========================================================================*/
"use strict";

var VERSIJA = "ppt-2026-09-22-1";

var SAVI = [
  "./",
  "./index.html",
  "./asistentas.js",
  "./cvpis.js",
  "./dokumentai.js",
  "./paieska.js",
  "./zinios.js",
  "../shared/epso-g.css",
  "../shared/ai-proxy.js",
  "../shared/lang-detect.js",
  "../shared/portal-link.js",
  "../shared/procurement-methods.js",
  "../PP-esg/components/gprocure-info-panel.js"
];

/* Tie patys adresai kaip index.html (ir pdf.js darbinis failas, kurį pdf.js
   kraus tik atidarius pirmą PDF - todėl jį išsaugom iš anksto). */
var CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js",
  "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];

var SRIFTAI = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSIJA).then(function (c) {
    // Savi failai privalomi: jei jų nepavyko išsaugoti, veikimas be interneto neveiktų.
    return c.addAll(SAVI).then(function () {
      // CDN - po vieną ir be lūžio: vienos bibliotekos nepasiekiamumas neturi
      // sugriauti viso diegimo (ją išsaugos pirmas įprastas įkėlimas).
      return Promise.all(CDN.map(function (u) {
        return fetch(new Request(u, { mode: "cors", credentials: "omit" }))
          .then(function (r) { if (r.ok) return c.put(u, r); })
          .catch(function () {});
      }));
    });
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

function talpyklaPirma(req, corsRezimas) {
  return caches.match(req.url).then(function (m) {
    if (m) return m;
    var uzkl = corsRezimas ? new Request(req.url, { mode: "cors", credentials: "omit" }) : req;
    return fetch(uzkl).then(function (r) {
      if (r && (r.ok || r.type === "opaque")) {
        var kopija = r.clone();
        caches.open(VERSIJA).then(function (c) { c.put(req.url, kopija); });
      }
      return r;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                 // AI kvietimai (POST) - tik tinklas
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // Tik savi statiniai failai; testų puslapio ir kitų modulių nesaugom
    if (/\/PP-tiekejams\/|\/shared\/|\/PP-esg\/components\//.test(url.pathname) && !/testai\.html$/.test(url.pathname)) {
      e.respondWith(tinklasPirma(req));
    }
    return;
  }
  // CDN visada parsisiunčiam CORS režimu: pdf.js darbinis failas prašomas „no-cors",
  // o nepermatomas (opaque) atsakymas talpykloje sulaužytų SRI patikrą kitiems skriptams.
  if (CDN.indexOf(req.url) !== -1) { e.respondWith(talpyklaPirma(req, true)); return; }
  if (SRIFTAI.test(req.url)) { e.respondWith(talpyklaPirma(req, false)); return; }
  // Visa kita (CVP IS, TED, api.g-procure.com ir t. t.) - naršyklė tvarko pati
});
