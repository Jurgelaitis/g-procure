/* ============================================================================
 * G-Procure  shared/modulio-antraste.js   (window.GP_ANTRASTE)
 * ----------------------------------------------------------------------------
 * Modulio antraštė (shared/modulio-antraste.css) virš 900 px turi būti VIENOS eilutės (79 px):
 * lipni antraštė aukštesnė uždengia prilipusius skirtukus, o antra eilutė su vienu mygtuku
 * atrodo kaip klaida. Iki 2026-09-29 tai užtikrino tik fiksuoti lūžio taškai (--ikona iki 1320 px,
 * modulio „iki 1080 px“), bet reikiamas plotis priklauso nuo būsenos žymos, naudotojo vardo ir
 * kalbos, tad išmatuota (2026-09-29, tikras šriftas): kaštų ir naudos analizėje po pirmo išsaugojimo
 * („✓ Išsaugota 00:45“) antraštė lūždavo 1328-1920 px ekranuose, skaičiuoklėje („Išsaugota naršyklėje
 * 00:45“) - 1440 px, PP-protocol - 1366 px nešiojamame kompiuteryje, PP-carbon ir PP-plan 904-1016 px
 * (ten lūžusi antraštė slenkant uždengdavo skirtukus).
 *
 * Dabar: jei veiksmai netelpa vienoje eilutėje su pavadinimu, mygtukų tekstas slepiamas palaipsniui -
 *   1) antraeilių (.btn-header--ikona), 2) visų, išskyrus pagrindinį (--pagr), 3) ir pagrindinio.
 * Tekstas slepiamas TIK akims (ekrano skaitytuvas jį skaito, pelei - title). Liečiami tik mygtukai
 * su ikona (<svg>) ir tekstu <span> - mygtukas be ikonos niekada netampa tuščias (PP-market-KPI).
 * Iki 900 px nieko nedaroma: ten antraštė slenka ir gali būti dviejų eilučių (modulio-antraste.css).
 * Perskaičiuojama keičiantis pločiui, antraštės tekstui (būsenos žyma, kalba, vardas) ir įsikėlus šriftui.
 *
 * Jungiama iškart po </header>: <script src="../shared/modulio-antraste.js"></script> - taip pritaikoma
 * prieš pirmą piešimą. Nieko nesaugo ir nesiunčia.
 * ========================================================================== */
;(function (global) {
  "use strict";
  var d = global.document;
  if (!d) return;

  var SLEPIAMAS = "gp-antr-be-teksto";          // mygtukas rodomas tik ikona
  var TITLE = "data-gp-antr-title";             // title pridėjo šis failas (nuimamas vėl parodžius tekstą)
  var MATUOJA = "gp-antr-matuoja";             // matavimo metu - be perėjimų
  var PLACIAI = "not all and (max-width: 900px)";   // tikslus CSS „iki 900 px“ papildinys (su masteliu plotis būna trupmeninis)

  function matomas(e) { return e.getClientRects().length > 0; }

  // Mygtukas su ikona ir tekstu: tik tokio tekstą galima slėpti
  function tekstas(b) {
    var svg = false, sp = null;
    for (var i = 0; i < b.children.length; i++) {
      var c = b.children[i], t = c.tagName.toLowerCase();
      if (t === "svg") svg = true;
      else if (t === "span" && !sp && (c.textContent || "").trim()) sp = c;
    }
    return svg && sp ? sp : null;
  }

  function telpa(h) {
    var r = h.querySelector(".header-right"), br = h.querySelector(".brand");
    if (r && matomas(r)) {
      var v = [].filter.call(r.children, matomas);
      if (v.length) {
        var virsus = Infinity, apacia = -Infinity, auksciausias = 0;
        v.forEach(function (e) {
          var x = e.getBoundingClientRect();
          if (x.height === 0) return;
          if (x.top < virsus) virsus = x.top;
          if (x.bottom > apacia) apacia = x.bottom;
          if (x.height > auksciausias) auksciausias = x.height;
        });
        if (apacia - virsus > auksciausias + 2) return false;                        // veiksmai dviejose eilutėse
        if (br && matomas(br)) {
          var b = br.getBoundingClientRect(), rr = r.getBoundingClientRect();
          if (rr.top >= b.bottom - 2) return false;                                   // veiksmai po pavadinimu
        }
      }
    }
    var m = h.querySelector(".brand-module");
    if (m && matomas(m) && m.scrollWidth > m.clientWidth + 1) return false;         // pavadinimas suspaustas
    return true;
  }

  function rodyk(b) {
    b.classList.remove(SLEPIAMAS);
    if (b.hasAttribute(TITLE)) { b.removeAttribute("title"); b.removeAttribute(TITLE); }
  }
  function slepk(b, sp) {
    b.classList.add(SLEPIAMAS);
    if (!b.hasAttribute("title")) { b.setAttribute("title", sp.textContent.trim()); b.setAttribute(TITLE, ""); }
  }

  var LYGIAI = [
    function (b) { return b.classList.contains("btn-header--ikona"); },
    function (b) { return !b.classList.contains("btn-header--pagr"); },
    function () { return true; }
  ];
  // Matuojant mygtukų perėjimai (transition) išjungiami: kitaip padding keičiasi 150 ms ir matuojamas tarpinis
  // plotis - sprendimas „mirksi“ (išmatuota 2026-09-29: KNA 1432-1888 px kas antras plotis lūžęs).
  function pritaikyk(h) {
    var mygtukai = [].slice.call(h.querySelectorAll(".btn-header"));
    h.classList.add(MATUOJA);
    try {
      mygtukai.forEach(rodyk);
      if (!global.matchMedia || !global.matchMedia(PLACIAI).matches || !matomas(h)) return 0;
      for (var l = 0; l < LYGIAI.length; l++) {
        if (telpa(h)) return l;
        mygtukai.forEach(function (b) { var sp = tekstas(b); if (sp && LYGIAI[l](b)) slepk(b, sp); });
      }
      return LYGIAI.length;
    } finally {
      h.getBoundingClientRect();          // galutinis stilius apskaičiuojamas be perėjimo
      h.classList.remove(MATUOJA);
    }
  }

  var laukia = false;
  function visos() {
    laukia = false;
    [].forEach.call(d.querySelectorAll(".app-header"), pritaikyk);
  }
  function veliau() {
    if (laukia) return;
    laukia = true;
    (global.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(visos);
  }

  var stebimos = [];
  function stebek() {
    [].forEach.call(d.querySelectorAll(".app-header"), function (h) {
      if (stebimos.indexOf(h) !== -1) return;
      stebimos.push(h);
      pritaikyk(h);
      // Tekstas keičiasi (būsenos žyma, kalba, vardas) - klasės ir title (atributai) nestebimi, tad ciklo nėra
      if (global.MutationObserver) new global.MutationObserver(veliau).observe(h, { childList: true, subtree: true, characterData: true });
      if (global.ResizeObserver) new global.ResizeObserver(veliau).observe(h.querySelector(".header-inner") || h);
    });
  }

  stebek();
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { stebek(); veliau(); });
  global.addEventListener("load", veliau);
  global.addEventListener("resize", veliau);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(veliau);
  if (d.fonts && d.fonts.addEventListener) d.fonts.addEventListener("loadingdone", veliau);

  global.GP_ANTRASTE = { pritaikyk: pritaikyk, telpa: telpa, atnaujink: visos };
})(typeof window !== "undefined" ? window : this);
