/*
 * G-Procure: laukų būsena ilgose pildymo formose (GP_LAUKU_BUSENA, 2026-11-05, naudotojo sprendimas „abi dalys“).
 *
 * Išvaizda - shared/epso-g.css („Formos laukų būsena“): konteineryje .gp-pildoma užpildytas laukas žalsvas, tuščias - baltas.
 * Naršyklė tuščią lauką atpažįsta tik pagal :placeholder-shown, o jis veikia tik laukui su placeholder. Šis failas kiekvienam
 * tekstiniam laukui .gp-pildoma viduje, kuris pavyzdžio neturi, prideda placeholder=" " - ir vėliau įterptiems (formos piešiamos
 * iš šablonų, protokolų eilutės pridedamos). Lentelių langeliuose nekeičia (ten būsenos nėra). Nieko nesaugo ir nesiunčia.
 * Jungiama po shared/epso-g.css; modulis įsijungia klase gp-pildoma ant formos konteinerio.
 */
(function () {
  "use strict";
  var TIPAI = /^(text|number|email|tel|url)$/;

  function tinka(el) {
    if (el.hasAttribute("placeholder") || el.closest("td, th")) return false;
    if (el.tagName === "TEXTAREA") return true;
    return TIPAI.test((el.getAttribute("type") || "text").toLowerCase());
  }

  function sutvarkyk(saknis) {
    var r = saknis || document;
    if (!r.querySelectorAll) return 0;
    var l = r.querySelectorAll(".gp-pildoma input, .gp-pildoma textarea"), n = 0;
    for (var i = 0; i < l.length; i++) if (tinka(l[i])) { l[i].setAttribute("placeholder", " "); n++; }
    return n;
  }

  var laukia = false;
  function veliau() {
    if (laukia) return;
    laukia = true;
    (window.requestAnimationFrame || setTimeout)(function () { laukia = false; sutvarkyk(document); });
  }

  function pradek() {
    sutvarkyk(document);
    if (window.MutationObserver && document.body) {
      new MutationObserver(veliau).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pradek);
  else pradek();

  window.GP_LAUKU_BUSENA = { sutvarkyk: sutvarkyk };
})();
