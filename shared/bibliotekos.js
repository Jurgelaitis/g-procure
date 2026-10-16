/* ============================================================================
 * G-Procure  shared/bibliotekos.js   (window.GP_BIBLIOTEKOS)
 * ----------------------------------------------------------------------------
 * Kai programų biblioteka (Chart.js, SheetJS, docx, jsPDF, mammoth, pdf.js) neįsikėlė (2026-09-28). Iki tol modulis
 * tokiu atveju lūždavo („Chart is not defined“ - PP-plan suvestinė nebepiešiama) arba mygtukas tyliai nieko nedarydavo.
 * Nuo 2026-10-16 bibliotekos - iš pačios svetainės (shared/vendor/) ir po pirmo panaudojimo laikomos naršyklėje
 * (bibliotekos-sw.js), todėl neįsikelia tik tada, kai nėra ryšio, o biblioteka dar neišsaugota (iki tol - ir kai
 * įmonės tinklas blokuodavo cdnjs.cloudflare.com ar cdn.jsdelivr.net).
 *
 *   if (!GP_BIBLIOTEKOS.yra("XLSX", "SheetJS (Excel)")) return;
 *       -> true, jei window.XLSX yra; kitaip klaidos pranešimas su priežastimi
 *          (shared/pranesimas.js) ir false - veiksmas nutraukiamas
 *   GP_BIBLIOTEKOS.reikia("mammoth", "mammoth (Word)");
 *       -> failo skaitytuvams: nėra - meta Error su tuo pačiu tekstu, kurį modulio catch
 *          parodo kaip visada (vietoj „mammoth is not defined“)
 *   GP_BIBLIOTEKOS.vietoje(canvas, "Chart.js")
 *       -> diagramos vietoje - trumpas paaiškinimas (drobė paslepiama), ne tuščia vieta;
 *          kitą kartą pavykus nupiešti - paaiškinimas nuimamas (GP_BIBLIOTEKOS.nuimk(canvas))
 *
 * Kalba - pagal <html lang>. Nieko nesaugo ir nesiunčia.
 * ========================================================================== */
;(function (global) {
  "use strict";

  var TEKSTAI = {
    lt: {
      veiksmas: "Nepavyko įkelti bibliotekos „{p}“, todėl šis veiksmas negalimas. Priežastis: nėra interneto ryšio, o ši biblioteka šioje naršyklėje dar neišsaugota darbui be interneto. Perkraukite puslapį, kai ryšys bus; jei kartojasi - kreipkitės į IT.",
      diagrama: "Diagrama nerodoma: nepavyko įkelti bibliotekos „{p}“ (nėra ryšio, o biblioteka dar neišsaugota darbui be interneto). Perkraukite puslapį, kai ryšys bus."
    },
    en: {
      veiksmas: "The “{p}” library could not be loaded, so this action is unavailable. Reason: no internet connection, and this library has not yet been saved in this browser for offline use. Reload the page when the connection is back; if it persists, contact IT.",
      diagrama: "Chart not shown: the “{p}” library could not be loaded (no connection, and the library has not yet been saved for offline use). Reload the page when the connection is back."
    }
  };

  function kalba() {
    var l = (global.document && global.document.documentElement.getAttribute("lang")) || "lt";
    return /^en/i.test(l) ? "en" : "lt";
  }
  // Funkcija, ne eilutė: pavadinimas su „$&“ nebūtų String.replace šablonas
  function tekstas(raktas, pav) { var p = String(pav || ""); return TEKSTAI[kalba()][raktas].replace("{p}", function () { return p; }); }

  // Naudojimosi statistika (tik su sutikimu): kuri biblioteka neįsikėlė - žodyno pavadinimu
  function statistika(pav) {
    try { if (global.GP_ANALITIKA) global.GP_ANALITIKA.ivykis("biblioteka_neisikele", { biblioteka: global.GP_ANALITIKA.biblioteka(pav) }); } catch (e) {}
  }
  function yra(globalus, pav) {
    if (global[globalus]) return true;
    statistika(pav || globalus);
    var t = tekstas("veiksmas", pav || globalus);
    if (global.GP_PRANESIMAS) global.GP_PRANESIMAS.rodyk(t, { tipas: "klaida" });
    else if (global.console) global.console.error(t);
    return false;
  }

  function reikia(globalus, pav) {
    if (!global[globalus]) { statistika(pav || globalus); throw new Error(tekstas("veiksmas", pav || globalus)); }
  }

  var ZYMA = "data-gp-biblioteka";
  function vietoje(el, pav) {
    if (!el || !el.parentNode) return;
    statistika(pav);
    var d = global.document, esamas = el.parentNode.querySelector("[" + ZYMA + "]");
    el.style.display = "none";
    if (esamas) { esamas.textContent = tekstas("diagrama", pav); return; }
    var p = d.createElement("p");
    p.setAttribute(ZYMA, "");
    p.setAttribute("role", "status");
    p.className = "gp-biblioteka-nera";
    p.style.cssText = "margin:8px 0;padding:10px 12px;border-left:4px solid var(--color-warning, #FAB03B);background:var(--color-graphite-5, #F4F6F5);color:var(--color-graphite, #2E3641);font-size:13.5px;line-height:1.45";
    p.textContent = tekstas("diagrama", pav);
    el.parentNode.insertBefore(p, el.nextSibling);
  }
  function nuimk(el) {
    if (!el || !el.parentNode) return;
    var p = el.parentNode.querySelector("[" + ZYMA + "]");
    if (p) p.parentNode.removeChild(p);
    if (el.style.display === "none") el.style.display = "";
  }

  global.GP_BIBLIOTEKOS = { yra: yra, reikia: reikia, vietoje: vietoje, nuimk: nuimk, tekstas: tekstas };
})(typeof window !== "undefined" ? window : this);
