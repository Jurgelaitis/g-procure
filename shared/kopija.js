/* ============================================================================
 * G-Procure  shared/kopija.js   (window.GP_KOPIJA)
 * ----------------------------------------------------------------------------
 * Kopijavimas į iškarpinę VISIEMS moduliams (2026-09-28). Iki tol šeši moduliai
 * turėjo savo kopijas: dalis nepavykus nieko nesakydavo (neperimta klaida - pvz.
 * Safari atmeta rašymą ne tiesiai po paspaudimo), dalis sakydavo „Nukopijuota“ ir
 * nepavykus (document.execCommand("copy") grąžina false, o ne meta klaidą).
 *
 *   GP_KOPIJA.kopijuok(tekstas, { sekme: "Šablonas nukopijuotas", tylus: false, langas: true })
 *     -> Promise<true | false>
 *   Pirmiausia navigator.clipboard.writeText; nepavykus - paslėptas laukas ir
 *   execCommand("copy") (tikrinamas rezultatas); nepavykus ir tam - langas „Nukopijuokite
 *   ranka“ su pažymėtu tekstu (Ctrl+C / Cmd+C): tekstas dažnai sukurtas tik atmintyje (laiško
 *   šablonas, suvestinė), tad patarimas be lango būtų neįvykdomas (šeštoji peržiūra).
 *   langas: false - vietoj lango klaidos pranešimas. tylus: true - trumpų pranešimų nerodo
 *   (modulis rodo savo; langas nepavykus vis tiek atsiveria).
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
    var buvo = d.activeElement;                                // select() perkelia fokusą - po to grąžinamas
    d.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = d.execCommand("copy") === true; } catch (e) { ok = false; }
    d.body.removeChild(ta);
    if (buvo && buvo !== d.body && typeof buvo.focus === "function") { try { buvo.focus(); } catch (e) {} }
    return ok;
  }

  function pranesk(t, tipas) {
    if (global.GP_PRANESIMAS) global.GP_PRANESIMAS.rodyk(t, { tipas: tipas });
  }

  /* Langas kopijuoti ranka: role="dialog", fokusas į pažymėtą tekstą, Tab lieka lange, Esc ir fonas uždaro,
     fokusas grįžta į atvėrusį elementą. */
  var LANGO_ID = "gp-kopija-langas";
  function rodykLanga(tekstas, grizti) {
    var d = global.document;
    if (!d || !d.body) return null;
    var buves = d.getElementById(LANGO_ID);
    if (buves) buves.parentNode.removeChild(buves);
    grizti = grizti || d.activeElement;
    var L = en();
    var fonas = d.createElement("div");
    fonas.id = LANGO_ID;
    fonas.setAttribute("data-gp-langas", "");
    fonas.style.cssText = "position:fixed;inset:0;background:rgba(46,54,65,.45);display:flex;align-items:center;justify-content:center;z-index:10050;padding:16px;box-sizing:border-box";
    fonas.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="gp-kopija-antraste" aria-describedby="gp-kopija-aprasas" ' +
      'style="background:#fff;color:var(--color-graphite,#2E3641);border-radius:12px;max-width:640px;width:100%;padding:16px 18px;box-sizing:border-box;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:var(--font-base,inherit)">' +
      '<h2 id="gp-kopija-antraste" style="font-size:17px;line-height:1.3;margin:0 0 6px">' + (L ? "Copy manually" : "Nukopijuokite ranka") + '</h2>' +
      '<p id="gp-kopija-aprasas" style="margin:0 0 10px;font-size:14px;line-height:1.45">' +
      (L ? "Automatic copying failed. The text below is selected - press Ctrl+C (Mac: Cmd+C)." : "Automatiškai nukopijuoti nepavyko. Tekstas žemiau pažymėtas - spauskite Ctrl+C (Mac - Cmd+C).") + '</p>' +
      '<textarea readonly rows="10" aria-label="' + (L ? "Text to copy" : "Tekstas kopijuoti") + '" ' +
      'style="display:block;width:100%;max-width:100%;box-sizing:border-box;font:13px/1.45 ui-monospace,Menlo,monospace;padding:8px;border:1px solid var(--color-graphite-30,#C7CDD3);border-radius:8px;resize:vertical"></textarea>' +
      '<div style="text-align:right;margin-top:10px"><button type="button" data-gp-uzdaryti ' +
      'style="font:inherit;font-weight:700;background:var(--color-emerald-strong,#007554);color:#fff;border:0;border-radius:8px;padding:8px 16px;cursor:pointer">' +
      (L ? "Close" : "Uždaryti") + '</button></div></div>';
    var ta = fonas.querySelector("textarea"), btn = fonas.querySelector("button");
    ta.value = tekstas;
    var klavisai = function (e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); uzdaryk(); return; }
      if (e.key === "Tab") {                                   // tik du valdikliai: tekstas ir „Uždaryti“
        e.preventDefault();
        (d.activeElement === ta ? btn : ta).focus();
      }
    };
    var uzdaryk = function () {
      if (!fonas.parentNode) return;
      fonas.parentNode.removeChild(fonas);
      d.removeEventListener("keydown", klavisai, true);
      if (grizti && grizti !== d.body && typeof grizti.focus === "function") { try { grizti.focus(); } catch (e) {} }
    };
    btn.addEventListener("click", uzdaryk);
    fonas.addEventListener("click", function (e) { if (e.target === fonas) uzdaryk(); });
    d.addEventListener("keydown", klavisai, true);
    d.body.appendChild(fonas);
    ta.focus(); ta.select();
    return fonas;
  }

  function kopijuok(tekstas, o) {
    o = o || {};
    var s = String(tekstas == null ? "" : tekstas);
    var aktyvus = global.document && global.document.activeElement;    // paspaustas mygtukas - į jį grąžinamas fokusas
    var baik = function (ok) {
      if (ok) { if (!o.tylus) pranesk(o.sekme || (en() ? "Copied to the clipboard" : "Nukopijuota į iškarpinę"), "gerai"); }
      else if (o.langas !== false) rodykLanga(s, aktyvus);
      else if (!o.tylus) pranesk(en() ? "Could not copy to the clipboard - select the text and press Ctrl+C (Mac: Cmd+C)."
                                      : "Nepavyko nukopijuoti į iškarpinę - pažymėkite tekstą ir spauskite Ctrl+C (Mac - Cmd+C).", "klaida");
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

  global.GP_KOPIJA = { kopijuok: kopijuok, rodykLanga: rodykLanga };
})(typeof window !== "undefined" ? window : this);
