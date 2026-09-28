/* ============================================================================
 * G-Procure  shared/kopija.js   (window.GP_KOPIJA)
 * ----------------------------------------------------------------------------
 * Kopijavimas į iškarpinę VISIEMS moduliams (2026-09-28). Iki tol šeši moduliai
 * turėjo savo kopijas: dalis nepavykus nieko nesakydavo (neperimta klaida - pvz.
 * Safari atmeta rašymą ne tiesiai po paspaudimo), dalis sakydavo „Nukopijuota“ ir
 * nepavykus (document.execCommand("copy") grąžina false, o ne meta klaidą).
 *
 *   GP_KOPIJA.kopijuok(tekstas, { sekme: "Šablonas nukopijuotas", tylus: false })
 *     -> Promise<true | false>
 *   Pirmiausia navigator.clipboard.writeText; nepavykus - paslėptas laukas ir
 *   execCommand("copy") (tikrinamas rezultatas); nepavykus ir tam - klaidos pranešimas
 *   su patarimu (Ctrl+C / Cmd+C). tylus: true - pranešimų nerodo (modulis rodo savo).
 * Pranešimai - shared/pranesimas.js, LT / EN pagal <html lang>. Nieko nesaugo ir nesiunčia.
 * ========================================================================== */
;(function (global) {
  "use strict";

  function en() { return !!(global.document && /^en/i.test(global.document.documentElement.getAttribute("lang") || "")); }

  // Senasis kelias: paslėptas laukas + execCommand; true tik jei naršyklė patvirtino
  function senas(tekstas) {
    var d = global.document;
    if (!d || !d.body || typeof d.execCommand !== "function") return false;
    var ta = d.createElement("textarea");
    ta.value = tekstas;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    d.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = d.execCommand("copy") === true; } catch (e) { ok = false; }
    d.body.removeChild(ta);
    return ok;
  }

  function pranesk(t, tipas) {
    if (global.GP_PRANESIMAS) global.GP_PRANESIMAS.rodyk(t, { tipas: tipas });
  }

  function kopijuok(tekstas, o) {
    o = o || {};
    var s = String(tekstas == null ? "" : tekstas);
    var baik = function (ok) {
      if (!o.tylus) {
        if (ok) pranesk(o.sekme || (en() ? "Copied to the clipboard" : "Nukopijuota į iškarpinę"), "gerai");
        else pranesk(en() ? "Could not copy to the clipboard - select the text and press Ctrl+C (Mac: Cmd+C)."
                          : "Nepavyko nukopijuoti į iškarpinę - pažymėkite tekstą ir spauskite Ctrl+C (Mac - Cmd+C).", "klaida");
      }
      return ok;
    };
    var cb = global.navigator && global.navigator.clipboard;
    if (cb && typeof cb.writeText === "function") {
      var p;
      try { p = cb.writeText(s); } catch (e) { return Promise.resolve(baik(senas(s))); }
      return Promise.resolve(p).then(function () { return baik(true); }, function () { return baik(senas(s)); });
    }
    return Promise.resolve(baik(senas(s)));
  }

  global.GP_KOPIJA = { kopijuok: kopijuok };
})(typeof window !== "undefined" ? window : this);
