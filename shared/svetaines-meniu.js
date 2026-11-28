/* G-Procure portalo puslapių „Meniu“ siauresniame nei 1024 px ekrane (GP_SVETAINES_MENIU, 2026-11-28; iki tol - tik pradžios puslapio
   viduje). Mygtukas #navToggle atveria #mainNav; uždaroma paspaudus nuorodą, už meniu, Esc (fokusas grįžta į mygtuką) ar praplatėjus
   langui (nuo 1024 px nuorodos rodomos antraštėje). Stilius - shared/svetaines-meniu.css. Naudoja pradžia, „Apie G-Procure“, „Vizija“ ir „Kontaktai“. */
(function (global) {
  "use strict";
  var doc = global.document;

  function init() {
    var toggle = doc.getElementById("navToggle"), nav = doc.getElementById("mainNav");
    if (!toggle || !nav || toggle.getAttribute("data-gp-meniu") === "1") return false;
    toggle.setAttribute("data-gp-meniu", "1");
    function atviras() { return nav.getAttribute("data-open") === "true"; }
    function atidaryk() { nav.setAttribute("data-open", "true"); toggle.setAttribute("aria-expanded", "true"); }
    function uzdaryk(grazinti) {
      if (!atviras()) return;
      nav.removeAttribute("data-open");
      toggle.setAttribute("aria-expanded", "false");
      if (grazinti) toggle.focus();
    }
    toggle.addEventListener("click", function () { if (atviras()) uzdaryk(false); else atidaryk(); });
    nav.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) uzdaryk(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && atviras()) uzdaryk(true); });
    doc.addEventListener("click", function (e) { if (atviras() && !nav.contains(e.target) && !toggle.contains(e.target)) uzdaryk(false); });
    global.addEventListener("resize", function () { if (global.innerWidth >= 1024) uzdaryk(false); });
    return true;
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
  global.GP_SVETAINES_MENIU = { init: init };
})(window);
