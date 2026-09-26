/* ============================================================================
 * Pirkimų teisės stebėsena - veikimas be interneto (service worker)
 * ----------------------------------------------------------------------------
 * KAM. Pirkimo projekto vadovas žinių rinkinį (registrą) turi matyti ir ten, kur
 * ryšio nėra. Po pirmo apsilankymo su internetu čia išsaugomas modulis, bendri
 * failai ir abu duomenų failai. Be interneto rodomas ATSISIŲSTAS rinkinys, o
 * puslapis tai pasako aiškiai: talpyklos atsakymui pridedama antraštė
 * X-GP-Offline, pagal kurią sąsaja rodo rinkinio versiją, aprėptį ir datą ir
 * nežada jokios aktualumo patikros.
 *
 * STRATEGIJA (kaip PP-tiekejams/sw.js):
 *   - savi failai: pirmiausia TINKLAS, talpykla tik kai tinklo nėra;
 *   - šriftai (Google Fonts): talpykla, jei jau buvo parsiųsti;
 *   - administravimo puslapis, testai ir viskas kita: tik tinklas, nesaugoma.
 * Vidiniai naudotojo įrašai (peržiūrų žurnalas) gyvena localStorage, ne čia.
 *
 * KEIČIANT MODULĮ ar DUOMENIS: padidinkite VERSIJA - senoji talpykla išvaloma.
 * ==========================================================================*/
"use strict";

var VERSIJA = "ppteise-2026-09-26-1";

var SAVI = [
  "./",
  "./index.html",
  "./duomenys/registras.json",
  "./duomenys/saltiniai.json",
  "../shared/epso-g.css",
  "../shared/portal-link.js",
  "../shared/teise-stebesena.js"
];

var SRIFTAI = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSIJA).then(function (c) {
    return c.addAll(SAVI);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("ppteise-") === 0 && k !== VERSIJA; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Atsakymas iš talpyklos pažymimas antrašte - puslapis tada rodo „be interneto“. */
function pazymetas(m) {
  return m.arrayBuffer().then(function (kunas) {
    var h = new Headers(m.headers);
    h.set("X-GP-Offline", "1");
    return new Response(kunas, { status: m.status, statusText: m.statusText, headers: h });
  });
}

function tinklasPirma(req) {
  return fetch(req).then(function (r) {
    if (r && r.ok && r.type === "basic") {
      var kopija = r.clone();
      caches.open(VERSIJA).then(function (c) { c.put(req, kopija); });
    }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (m) {
      if (m) return pazymetas(m);
      if (req.mode === "navigate") return caches.match("./index.html").then(function (x) { return x ? pazymetas(x) : Response.error(); });
      return Response.error();
    });
  });
}

function talpyklaPirma(req) {
  return caches.match(req.url).then(function (m) {
    if (m) return m;
    return fetch(req).then(function (r) {
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
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (/\/PP-teise\/|\/shared\//.test(url.pathname) && !/(testai|admin)\.html$/.test(url.pathname)) {
      e.respondWith(tinklasPirma(req));
    }
    return;
  }
  if (SRIFTAI.test(req.url)) { e.respondWith(talpyklaPirma(req)); }
});
