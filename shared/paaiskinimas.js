/* ============================================================================
 * G-Procure  shared/paaiskinimas.js   (v1.0, 2026-10-04)
 * Paaiškinimas „?“ prie lauko ar klausimo VISIEMS moduliams: atsidaro užvedus pelę, fokusuojant klaviatūra
 * ir paspaudus (palietus telefone), Esc uždaro. Ne `title` atributas: jo nemato klaviatūros ir lietimo
 * naudotojai, o ekrano skaitytuvas jį skaito nevienodai (WCAG 1.4.13 - turinys, rodomas užvedus ar fokusuojant:
 * uždaromas be pelės judesio, ant jo galima užvesti pelę, nedingsta pats).
 *
 *   GP_PAAISKINIMAS.html({ id, etikete, turinys })  -> HTML eilutė (turinys - jau ekranuotas HTML)
 *     Mygtukas: aria-expanded, aria-controls; paaiškinimas - role="tooltip", kol uždarytas - hidden.
 *     Laukui duokite aria-describedby="<užuominos id> <id>": ekrano skaitytuvas perskaito paaiškinimą ir neatvėrus.
 *   GP_PAAISKINIMAS.uzverk()                        -> uždaro atvertą
 *
 * Elgsena vienam puslapiui įdedama vieną kartą (įvykių delegavimas), todėl tinka ir innerHTML perpiešiamoms
 * formoms. Atvertas vienas paaiškinimas; paspaustas lieka atviras, kol paspaudžiama vėl, šalia arba Esc.
 * Stilius - shared/epso-g.css žetonai, tekstas grafito ant balto (>= 4,5:1). LT / EN pagal <html lang>.
 * Spausdinant nerodoma. Nieko nesaugo ir nesiunčia. Testai - shared/testai.html („Paaiškinimas“).
 * ========================================================================== */
(function (global) {
  "use strict";
  var doc = global.document;
  if (!doc || global.GP_PAAISKINIMAS) return;

  var TEKSTAI = { lt: { mygtukas: "Paaiškinimas" }, en: { mygtukas: "Explanation" } };
  function kalba() { return /^en/i.test(doc.documentElement.getAttribute("lang") || "") ? "en" : "lt"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function stilius() {
    if (doc.getElementById("gpp-stilius")) return;
    var css = [
      ".gpp{position:relative;display:inline-block;vertical-align:middle;line-height:1}",
      ".gpp-btn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;margin:0 0 0 6px;",
      "  border-radius:50%;border:1px solid var(--color-graphite-30,#C7CDD3);background:var(--color-white,#FFFFFF);",
      "  color:var(--color-graphite-50-strong,#5B6470);cursor:pointer;font:inherit;vertical-align:middle}",
      ".gpp-btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}",
      ".gpp-btn:hover,.gpp-btn[aria-expanded=true]{border-color:var(--color-emerald-strong,#007554);color:var(--color-emerald-strong,#007554)}",
      ".gpp-btn:focus-visible{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpp-pop{position:absolute;z-index:60;top:calc(100% + 6px);left:0;box-sizing:border-box;width:max-content;",
      "  max-width:min(380px,calc(100vw - 32px));padding:10px 12px;border-radius:8px;background:var(--color-white,#FFFFFF);",
      "  color:var(--color-graphite,#2E3641);border:1px solid var(--color-graphite-15,#E3E6EA);box-shadow:0 8px 24px rgba(46,54,65,.18);",
      "  font-size:13px;line-height:1.5;font-weight:400;text-align:left;white-space:normal;overflow-wrap:anywhere;text-transform:none;letter-spacing:0}",
      ".gpp-pop[hidden]{display:none}",
      ".gpp-pop p{margin:0 0 6px}.gpp-pop p:last-child{margin-bottom:0}",
      ".gpp-pop b{font-weight:700}",
      ".gpp-pop .gpp-saltinis{color:var(--color-graphite-50-strong,#5B6470);font-size:12px}",
      "@media (forced-colors:active){.gpp-pop{border:1px solid CanvasText}.gpp-btn{border:1px solid ButtonText}}",
      "@media print{.gpp{display:none!important}}"
    ].join("\n");
    var el = doc.createElement("style");
    el.id = "gpp-stilius"; el.textContent = css;
    (doc.head || doc.documentElement).appendChild(el);
  }

  var ZENKLAS = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.2 9.2a2.9 2.9 0 1 1 3.9 2.7c-.7.3-1.1.9-1.1 1.6v.6"/><path d="M12 17.4h.01"/></svg>';
  var n = 0;
  function html(o) {
    stilius();
    o = o || {};
    var id = o.id || ("gpp-" + (++n));
    var et = (TEKSTAI[kalba()] || TEKSTAI.lt).mygtukas + (o.etikete ? ": " + o.etikete : "");
    return '<span class="gpp"><button type="button" class="gpp-btn" data-gpp aria-expanded="false" aria-controls="' + esc(id) + '" aria-label="' + esc(et) + '">' + ZENKLAS + '</button>'
      + '<span class="gpp-pop" id="' + esc(id) + '" role="tooltip" hidden>' + (o.turinys || "") + "</span></span>";
  }

  var atviras = null, prisegtas = false, laikmatis = null;
  function popas(btn) { return btn && doc.getElementById(btn.getAttribute("aria-controls")); }
  function sutalpink(pop) {
    pop.style.left = "0px";
    var r = pop.getBoundingClientRect(), vw = doc.documentElement.clientWidth || global.innerWidth;
    var per = r.right - (vw - 8);
    if (per > 0) pop.style.left = (-Math.min(per, r.left - 8)) + "px";
  }
  function atverk(btn, prisegti) {
    clearTimeout(laikmatis);
    if (atviras && atviras !== btn) uzverk();
    var pop = popas(btn);
    if (!pop) return;
    atviras = btn; prisegtas = !!prisegti || prisegtas;
    btn.setAttribute("aria-expanded", "true");
    pop.hidden = false;
    sutalpink(pop);
  }
  function uzverk() {
    clearTimeout(laikmatis);
    if (!atviras) return;
    var pop = popas(atviras);
    atviras.setAttribute("aria-expanded", "false");
    if (pop) pop.hidden = true;
    atviras = null; prisegtas = false;
  }
  function veliau() { clearTimeout(laikmatis); laikmatis = setTimeout(function () { if (!prisegtas) uzverk(); }, 250); }
  function apvalkalas(el) { return el && el.closest ? el.closest(".gpp") : null; }
  function mygtukas(el) { var a = apvalkalas(el); return a ? a.querySelector("[data-gpp]") : null; }

  doc.addEventListener("mouseover", function (e) {
    var b = mygtukas(e.target);
    if (b) { if (atviras === b) clearTimeout(laikmatis); else if (!prisegtas) atverk(b); }
  });
  doc.addEventListener("mouseout", function (e) {
    var a = apvalkalas(e.target);
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget)) && !prisegtas) veliau();
  });
  doc.addEventListener("focusin", function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-gpp")) atverk(e.target);
  });
  doc.addEventListener("focusout", function (e) {
    var a = apvalkalas(e.target);
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget)) && !prisegtas) veliau();
  });
  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-gpp]") : null;
    if (b) {
      e.preventDefault();
      if (atviras === b && prisegtas) uzverk(); else { if (atviras !== b) uzverk(); atverk(b, true); }
      return;
    }
    if (atviras && !(apvalkalas(e.target) === apvalkalas(atviras))) uzverk();
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !atviras) return;
    var b = atviras, vidus = apvalkalas(doc.activeElement) === apvalkalas(b);
    uzverk();
    if (vidus) b.focus();
    e.stopPropagation();
  }, true);

  global.GP_PAAISKINIMAS = { html: html, uzverk: uzverk, atverk: function (btn) { atverk(btn, true); } };
})(typeof window !== "undefined" ? window : this);
