/* ============================================================================
 * G-Procure  shared/ivykiai.js   (window.GP_IVYKIAI)
 * ----------------------------------------------------------------------------
 * Įvykių delegavimas vietoj onclick= ir kitų įterptų įvykių atributų (2026-11-24, saugumo auditas G-09, CSP antras etapas).
 * Puslapio CSP be 'unsafe-inline' įterptų atributų nevykdo, todėl HTML (ir JS šablonuose kuriamas HTML) žymi tik VEIKSMO VARDĄ,
 * o įrankis užregistruoja leidžiamus veiksmus. Iš HTML iškviesti galima tik užregistruotą veiksmą - ne bet kokią funkciją.
 *
 *   <button data-veiksmas="ieskoti">                       - paspaudimas (click)
 *   <input data-veiksmas-change="tipas" data-veiksmas-input="filtruok">  - kiti įvykiai: data-veiksmas-<tipas>
 *   GP_IVYKIAI.veiksmai({ ieskoti(el, ev) { ... }, tipas(el, ev) { ... } })
 *
 * Veiksmas gauna elementą su atributu (el) ir įvykį (ev); `this` - tas pats elementas, kaip įterptame atribute. Kaip ir naršyklės
 * įvykiai, veiksmai vykdomi nuo vidinio elemento į išorinį; ev.stopPropagation() veiksme sustabdo išorinius. Grąžinus false -
 * ev.preventDefault() (kaip „return false“ atribute). Tipai: click, dblclick, change, input, keydown, keyup, submit, focusin,
 * focusout, mouseover, mouseout, dragstart, dragover, dragenter, dragleave, drop, paste, load ir error (pastarieji - gaudant).
 * Nežinomas veiksmas nevykdomas: įspėjimas konsolėje ir GP_IVYKIAI.nezinomi (testams).
 * ========================================================================== */
;(function (global) {
  "use strict";
  var doc = global.document;
  if (!doc || global.GP_IVYKIAI) return;

  var VEIKSMAI = Object.create(null);
  // Bendri veiksmai: sustabdyk - vidinis elementas, kurio paspaudimas neturi pasiekti išorinio veiksmo (buvęs onclick="event.stopPropagation()")
  VEIKSMAI.sustabdyk = function (el, ev) { ev.stopPropagation(); };
  VEIKSMAI.spausdinti = function () { global.print(); };
  VEIKSMAI.nieko = function () { return false; }; // nuoroda be veiksmo (buvęs onclick="return false")
  var nezinomi = [];
  var TIPAI = ["click", "dblclick", "change", "input", "keydown", "keyup", "submit", "focusin", "focusout", "mouseover", "mouseout",
    "dragstart", "dragover", "dragenter", "dragleave", "drop", "paste"];
  var GAUDANT = ["load", "error"]; // neburbuliuoja - gaunami tik gaudymo fazėje

  function atributas(tipas) { return tipas === "click" ? "data-veiksmas" : "data-veiksmas-" + tipas; }

  function vykdyk(el, vardas, ev) {
    var f = VEIKSMAI[vardas];
    if (typeof f !== "function") {
      if (nezinomi.indexOf(vardas) < 0) nezinomi.push(vardas);
      if (global.console) console.warn("GP_IVYKIAI: nežinomas veiksmas „" + vardas + "“");
      return;
    }
    if (f.call(el, el, ev) === false) ev.preventDefault();
  }

  function apdorok(ev) {
    var attr = atributas(ev.type), mazgas = ev.target;
    if (mazgas && mazgas.nodeType !== 1) mazgas = mazgas.parentElement;
    while (mazgas && mazgas !== doc) {
      if (mazgas.nodeType === 1 && mazgas.hasAttribute(attr)) {
        if (mazgas.disabled && ev.type === "click") return;
        vykdyk(mazgas, mazgas.getAttribute(attr), ev);
        if (ev.cancelBubble) return;
      }
      mazgas = mazgas.parentElement;
    }
  }

  function apdorokGaudant(ev) {
    var el = ev.target;
    if (el && el.nodeType === 1 && el.hasAttribute(atributas(ev.type))) vykdyk(el, el.getAttribute(atributas(ev.type)), ev);
  }

  TIPAI.forEach(function (t) { doc.addEventListener(t, apdorok, false); });
  GAUDANT.forEach(function (t) { doc.addEventListener(t, apdorokGaudant, true); });

  global.GP_IVYKIAI = {
    /* Užregistruoja veiksmus (to paties vardo - perrašo). */
    veiksmai: function (m) { for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) VEIKSMAI[k] = m[k]; return this; },
    yra: function (vardas) { return typeof VEIKSMAI[vardas] === "function"; },
    nezinomi: nezinomi,
    TIPAI: TIPAI.concat(GAUDANT)
  };
})(typeof window !== "undefined" ? window : this);
