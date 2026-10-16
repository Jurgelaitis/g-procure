/* ============================================================================
 * G-Procure  shared/bibliotekos-atmintis.js   (window.GP_BIBLIOTEKU_ATMINTIS, nuo 2026-10-16)
 * ----------------------------------------------------------------------------
 * Registruoja svetainės šaknies darbininką bibliotekos-sw.js: programų bibliotekos (shared/vendor/) po pirmo
 * panaudojimo imamos iš naršyklės talpyklos - greičiau ir be interneto. Jungia kiekvienas puslapis, kuris krauna
 * biblioteką iš shared/vendor/ (sargas shared/testai.html). Šaknis skaičiuojama iš šio skripto adreso.
 * Pirmame atvėrime bibliotekos įsikelia dar prieš įsijungiant darbininkui, todėl jis gauna jų adresus (žinutė „issaugok“) ir
 * išsaugo jas iškart - kitaip jos būtų išsaugotos tik kitą kartą, o darbas be interneto po pirmo atvėrimo neveiktų.
 * Kai darbininkų naršyklė neturi ar puslapis atvertas ne per https / localhost (pvz. failas diske), - nieko nedaroma:
 * bibliotekos kraunamos kaip įprasta.
 * ========================================================================== */
;(function (global) {
  "use strict";
  var doc = global.document, nav = global.navigator;
  var src = (doc && doc.currentScript && doc.currentScript.src) || "";
  var m = src.match(/^(.*\/)shared\/bibliotekos-atmintis\.js(\?.*)?$/);
  var api = { saknis: m ? m[1] : null, registracija: null };
  global.GP_BIBLIOTEKU_ATMINTIS = api;
  if (!m || !nav || !nav.serviceWorker || !global.isSecureContext) return;
  // Šio puslapio jau įkeltos bibliotekos (adresai iš naršyklės išteklių sąrašo)
  function ikeltos() {
    var p = global.performance;
    return (p && p.getEntriesByType ? p.getEntriesByType("resource") : []).map(function (e) { return e.name; })
      .filter(function (u) { return u.indexOf(m[1] + "shared/vendor/") === 0; });
  }
  api.ikeltos = ikeltos;
  function registruok() {
    api.registracija = nav.serviceWorker.register(m[1] + "bibliotekos-sw.js", { scope: m[1] })
      .then(function (reg) {
        var sw = reg.active || reg.waiting || reg.installing;
        function siusk(w) { var a = ikeltos(); if (w && a.length) w.postMessage({ tipas: "issaugok", adresai: a }); }
        if (reg.active) siusk(reg.active);
        else if (sw) sw.addEventListener("statechange", function () { if (sw.state === "activated") siusk(sw); });
        return reg;
      })
      .catch(function (e) { if (global.console) global.console.warn("Bibliotekų atmintis neįjungta:", e && e.message); return null; });
  }
  if (doc.readyState === "complete") registruok(); else global.addEventListener("load", registruok, { once: true });
})(typeof window !== "undefined" ? window : this);
