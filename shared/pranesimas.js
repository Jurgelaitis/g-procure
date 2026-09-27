/* ============================================================================
 * G-Procure  shared/pranesimas.js   (v1.0, B5, 2026-09-28)
 * Trumpi pranešimai („Išsaugota“, „Nepavyko nukopijuoti“) VISIEMS moduliams - vienas komponentas vietoj
 * vienuolikos kopijų. Iki tol kiekvienas modulis turėjo savą toast(): skirtinga vieta, trukmė ir spalvos,
 * dalis - baltas tekstas ant smaragdo ar raudonos (3,3-4,3:1), o ekrano skaitytuvas daugumos negirdėjo
 * (pranešimas įterpiamas su tekstu į naują elementą - toks gyvos srities pokytis dažnai praleidžiamas).
 *
 *   GP_PRANESIMAS.rodyk(tekstas, { tipas, trukme })  -> { uzdaryk() }
 *     tipas: "gerai" | "klaida" | "ispejimas" | "info" (priimami ir modulių žodžiai: ok, success, err, error,
 *            warn, warning, danger); trukme ms (numatyta: 4 s, įspėjimas 6 s, klaida 8 s; 0 - kol uždarys)
 *
 * Ekrano skaitytuvui tekstas perduodamas per dvi NUOLAT esančias gyvas sritis (klaida - role="alert", kiti -
 * role="status"): jos sukuriamos įkeliant, todėl pokytis perskaitomas patikimai, o matomas pranešimas su
 * „Uždaryti“ mygtuku antrą kartą neskaitomas. Užvedus pelę ar fokusą laikas sustoja (WCAG 2.2.1). Rodomi ne
 * daugiau kaip 4, naujausias apačioje. Perjungus kalbą (<html lang>) senos kalbos pranešimai nuimami. Spausdinant nerodoma.
 * Nieko nesaugo ir nesiunčia.
 * Prijungiama po epso-g.css ir portal-link.js: <script src="../shared/pranesimas.js"></script>
 * Testai - shared/testai.html („Trumpi pranešimai“).
 * ========================================================================== */
(function (global) {
  "use strict";
  var doc = global.document;
  if (!doc || global.GP_PRANESIMAS) return;

  var TRUKME = { gerai: 4000, info: 4000, ispejimas: 6000, klaida: 8000 };
  var DAUGIAUSIA = 4;
  var TEKSTAI = { lt: { uzdaryti: "Uždaryti pranešimą", sritis: "Pranešimai" }, en: { uzdaryti: "Close notification", sritis: "Notifications" } };
  var IKONOS = {
    gerai: '<path d="M20 6 9 17l-5-5"/>',
    klaida: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>',
    ispejimas: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>'
  };

  function kalba() { return /^en/i.test(doc.documentElement.getAttribute("lang") || "") ? "en" : "lt"; }
  function tipas(t) {
    var s = String(t || "").toLowerCase();
    if (/^(klaida|err|error|danger|fail)/.test(s)) return "klaida";
    if (/^(ispejimas|warn)/.test(s)) return "ispejimas";
    if (/^(gerai|ok|success|sekme)/.test(s)) return "gerai";
    return "info";
  }

  function stilius() {
    if (doc.getElementById("gp-pranesimai-stilius")) return;
    var css = [
      ".gp-pranesimai{position:fixed;right:24px;bottom:24px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;",
      "  max-width:min(420px,calc(100vw - 32px));pointer-events:none;font-family:var(--font-base,system-ui,sans-serif)}",
      ".gp-pranesimas{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;box-sizing:border-box;max-width:100%;",
      "  padding:12px 8px 12px 14px;border-radius:var(--radius-sm,8px);background:var(--color-graphite,#2E3641);color:#FFFFFF;",
      "  border-left:4px solid var(--color-cyan,#00A5C4);box-shadow:0 8px 24px rgba(46,54,65,.28);font-size:14px;line-height:1.45;",
      "  animation:gp-pranesimas-ateina .2s ease-out}",
      ".gp-pranesimas--gerai{border-left-color:var(--color-emerald-50,#16C492)}",
      ".gp-pranesimas--klaida{border-left-color:var(--color-error-light,#FF8A95)}",
      ".gp-pranesimas--ispejimas{border-left-color:var(--color-warning,#FAB03B)}",
      ".gp-pranesimas__ikona{flex:0 0 18px;width:18px;height:18px;margin-top:1px;fill:none;stroke:var(--color-cyan,#00A5C4);stroke-width:2.2;",
      "  stroke-linecap:round;stroke-linejoin:round}",
      ".gp-pranesimas--gerai .gp-pranesimas__ikona{stroke:var(--color-emerald-50,#16C492)}",
      ".gp-pranesimas--klaida .gp-pranesimas__ikona{stroke:var(--color-error-light,#FF8A95)}",
      ".gp-pranesimas--ispejimas .gp-pranesimas__ikona{stroke:var(--color-warning,#FAB03B)}",
      ".gp-pranesimas__tekstas{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;white-space:pre-line}",
      ".gp-pranesimas__x{flex:0 0 auto;margin:-4px 0 -4px 2px;width:28px;height:28px;border:0;border-radius:6px;background:transparent;",
      "  color:#FFFFFF;font:inherit;font-size:16px;line-height:1;cursor:pointer}",
      ".gp-pranesimas__x:hover{background:rgba(255,255,255,.14)}",
      ".gp-pranesimas__x:focus-visible{outline:2px solid #FFFFFF;outline-offset:1px}",
      ".gp-pranesimas--iseina{opacity:0;transition:opacity .25s}",
      ".gp-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}",
      "@keyframes gp-pranesimas-ateina{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
      "@media (prefers-reduced-motion:reduce){.gp-pranesimas{animation:none}.gp-pranesimas--iseina{transition:none}}",
      "@media (max-width:600px){.gp-pranesimai{left:16px;right:16px;bottom:16px;max-width:none;align-items:stretch}}",
      "@media print{.gp-pranesimai,.gp-sr-pranesimai{display:none!important}}"
    ].join("\n");
    var el = doc.createElement("style");
    el.id = "gp-pranesimai-stilius";
    el.textContent = css;
    (doc.head || doc.documentElement).appendChild(el);
  }

  // Gyvos sritys ekrano skaitytuvui - sukuriamos iš karto įkėlus, kad pirmas pranešimas būtų perskaitytas
  var sritys = null, stekas = null;
  function paruosk() {
    if (!doc.body) return false;
    stilius();
    if (!sritys || !sritys.mandagi.isConnected) {
      var w = doc.createElement("div");
      w.className = "gp-sr-pranesimai";
      w.innerHTML = '<div class="gp-sr" role="status" aria-live="polite" aria-atomic="true"></div><div class="gp-sr" role="alert" aria-live="assertive" aria-atomic="true"></div>';
      doc.body.appendChild(w);
      sritys = { mandagi: w.children[0], skubi: w.children[1] };
    }
    if (!stekas || !stekas.isConnected) {
      stekas = doc.createElement("div");
      stekas.className = "gp-pranesimai";
      doc.body.appendChild(stekas);
    }
    stekas.setAttribute("aria-label", TEKSTAI[kalba()].sritis);
    return true;
  }

  function perskaityk(tekstas, skubu) {
    var el = skubu ? sritys.skubi : sritys.mandagi;
    el.textContent = "";
    // Tas pats tekstas antrą kartą - vis tiek pokytis: pirma išvaloma, tada įrašoma
    global.setTimeout(function () { el.textContent = tekstas; }, 60);
  }

  function rodyk(tekstas, nust) {
    nust = nust || {};
    tekstas = String(tekstas == null ? "" : tekstas).trim();
    if (!tekstas || !paruosk()) return { uzdaryk: function () {} };
    var tp = tipas(nust.tipas);
    var trukme = typeof nust.trukme === "number" ? nust.trukme : TRUKME[tp];
    var T = TEKSTAI[kalba()];

    var el = doc.createElement("div");
    el.className = "gp-pranesimas gp-pranesimas--" + tp;
    el.setAttribute("data-tipas", tp);
    el.innerHTML = '<svg class="gp-pranesimas__ikona" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + IKONOS[tp] + '</svg>' +
      '<div class="gp-pranesimas__tekstas"></div><button type="button" class="gp-pranesimas__x">✕</button>';
    el.querySelector(".gp-pranesimas__tekstas").textContent = tekstas;
    var x = el.querySelector(".gp-pranesimas__x");
    x.setAttribute("aria-label", T.uzdaryti);
    x.title = T.uzdaryti;

    var laikas = null, liko = trukme, nuo = 0, baigta = false;
    function uzdaryk() {
      if (baigta) return;
      baigta = true;
      global.clearTimeout(laikas);
      var turejoFokusa = el.contains(doc.activeElement);
      el.classList.add("gp-pranesimas--iseina");
      global.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
      if (turejoFokusa && doc.activeElement && doc.activeElement.blur) doc.activeElement.blur();
    }
    function paleisk() { if (!liko || baigta) return; nuo = Date.now(); laikas = global.setTimeout(uzdaryk, liko); }
    function sustabdyk() { if (!laikas) return; global.clearTimeout(laikas); laikas = null; liko = Math.max(1000, liko - (Date.now() - nuo)); }
    el.addEventListener("mouseenter", sustabdyk);
    el.addEventListener("mouseleave", function () { if (!el.contains(doc.activeElement)) paleisk(); });
    el.addEventListener("focusin", sustabdyk);
    el.addEventListener("focusout", function (e) { if (!el.contains(e.relatedTarget)) paleisk(); });
    x.addEventListener("click", uzdaryk);

    stekas.appendChild(el);
    var visi = stekas.querySelectorAll(".gp-pranesimas:not(.gp-pranesimas--iseina)");
    for (var i = 0; i < visi.length - DAUGIAUSIA; i++) visi[i].parentNode.removeChild(visi[i]);
    perskaityk(tekstas, tp === "klaida");
    paleisk();
    return { uzdaryk: uzdaryk, el: el };
  }

  // Perjungus kalbą (dvikalbiai moduliai keičia <html lang>) senos kalbos pranešimai nuimami - kitaip angliškame puslapyje
  // kelias sekundes liktų lietuviškas tekstas. Tik kai kalba tikrai pasikeitė: moduliai lang dažnai perrašo ta pačia reikšme.
  function kalbaPasikeite(pokyciai) {
    var dabar = doc.documentElement.getAttribute("lang") || "";
    if (!pokyciai.some(function (m) { return (m.oldValue || "") !== dabar; })) return;
    if (stekas) { [].slice.call(stekas.children).forEach(function (x) { stekas.removeChild(x); }); stekas.setAttribute("aria-label", TEKSTAI[kalba()].sritis); }
    if (sritys) { sritys.mandagi.textContent = ""; sritys.skubi.textContent = ""; }
  }
  if (global.MutationObserver) new MutationObserver(kalbaPasikeite).observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"], attributeOldValue: true });

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", paruosk);
  else paruosk();

  global.GP_PRANESIMAS = { versija: "1.0", rodyk: rodyk, tipas: tipas };
})(window);
