/* ============================================================================
 * G-Procure  shared/portal-link.js   (v1.0)
 * ----------------------------------------------------------------------------
 * Grizimo i portala juosta kiekvieno modulio virsuje.
 *
 * KODEL. Iki 2026-09-20 trylika moduliu puslapiu neturejo jokios nuorodos i
 * portala. Zmogus, atejes is paieskos ar kolegos nuorodos, likdavo viename
 * irankyje: nei kelio atgal, nei zenklo, kad tai viena sistema. Juosta stovi
 * VIRS modulio antrastes (paprastame sraute, ne sticky), todel slenkant ji
 * pasitraukia, o moduliu lipnios antrastes (.app-header, .app-bar) elgiasi
 * kaip anksciau.
 *
 * NAUDOJIMAS modulyje - viena eilute, bet kurioje puslapio vietoje:
 *   <script src="../shared/portal-link.js"></script>
 * Kitas adresas (jei puslapis giliau): <script src="..." data-portalas="../../index.html">
 *
 * KALBA sekama is <html lang>: dvikalbiai moduliai ja perrasinėja perjungdami
 * (document.documentElement.lang = LANG), tad juosta persijungia kartu.
 * Zenklas "G-Procure" neverciamas - tai pavadinimas.
 *
 * Stilius remiasi shared/epso-g.css zetonais (su atsarginemis reiksmemis, jei
 * modulis CSS neprijungtu). Spausdinant juosta nerodoma.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var doc = global.document;
  if (!doc) return;

  var STILIAUS_ID = "gp-portalas-stilius";
  var JUOSTOS_ID = "gp-portalas";

  /* Adresas imamas is <script data-portalas="...">, numatytas - portalas saknyje. */
  var scriptEl = doc.currentScript;
  var ADRESAS = (scriptEl && scriptEl.getAttribute("data-portalas")) || "../index.html";

  /* Tekstai rasomi tiesiogiai UTF-8, kaip shared/ai-proxy.js zinutese. */
  var TEKSTAI = {
    lt: {
      etikete: "Visi įrankiai",
      aria: "Grįžti į G-Procure portalą",
      tag: "EPSO-G grupės pirkimų platforma"
    },
    en: {
      etikete: "All tools",
      aria: "Back to the G-Procure portal",
      tag: "EPSO-G Group procurement platform"
    }
  };

  function kalba() {
    var l = (doc.documentElement.getAttribute("lang") || "lt").toLowerCase();
    return l.indexOf("en") === 0 ? "en" : "lt";
  }

  function stilius() {
    if (doc.getElementById(STILIAUS_ID)) return;
    var css = [
      "#gp-portalas{display:flex;align-items:center;justify-content:space-between;gap:12px;",
      "  padding:5px 20px;background:var(--color-white,#FFFFFF);",
      "  border-bottom:1px solid var(--color-graphite-15,#DFE2E5);",
      "  font-family:var(--font-base,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif);",
      "  font-size:13px;line-height:1.2;position:relative;z-index:60}",
      "#gp-portalas a{display:inline-flex;align-items:center;gap:8px;text-decoration:none;",
      "  color:var(--color-graphite,#2E3641);padding:6px 10px;margin-left:-10px;",
      "  border-radius:var(--radius-sm,8px);transition:background var(--transition-fast,180ms ease)}",
      "#gp-portalas a:hover{background:var(--color-graphite-5,#F4F5F6)}",
      "#gp-portalas a:focus-visible{outline:2px solid var(--color-emerald,#00A072);outline-offset:2px}",
      ".gp-portalas__rodykle{color:var(--color-emerald,#00A072);font-weight:800;font-size:15px}",
      ".gp-portalas__zenklas{font-weight:800;letter-spacing:-0.01em}",
      ".gp-portalas__zenklas em{color:var(--color-emerald,#00A072);font-style:normal}",
      ".gp-portalas__skyriklis{color:var(--color-graphite-30,#B9BEC4)}",
      ".gp-portalas__etikete{font-weight:600}",
      ".gp-portalas__tag{font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;",
      "  color:var(--color-graphite-50,#8D949C)}",
      "@media (max-width:760px){.gp-portalas__tag{display:none}#gp-portalas{padding:4px 14px}",
      "  .gp-portalas__skyriklis,.gp-portalas__etikete{display:none}}",
      "@media print{#gp-portalas{display:none !important}}"
    ].join("\n");
    var el = doc.createElement("style");
    el.id = STILIAUS_ID;
    el.textContent = css;
    (doc.head || doc.documentElement).appendChild(el);
  }

  function ikelk() {
    if (doc.getElementById(JUOSTOS_ID)) return;
    stilius();
    var t = TEKSTAI[kalba()];

    var juosta = doc.createElement("nav");
    juosta.id = JUOSTOS_ID;
    juosta.setAttribute("aria-label", t.aria);

    var a = doc.createElement("a");
    a.href = ADRESAS;
    a.innerHTML =
      '<span class="gp-portalas__rodykle" aria-hidden="true">&#8592;</span>' +
      '<span class="gp-portalas__zenklas">G-<em>Procure</em></span>' +
      '<span class="gp-portalas__skyriklis" aria-hidden="true">&#183;</span>' +
      '<span class="gp-portalas__etikete"></span>';
    a.querySelector(".gp-portalas__etikete").textContent = t.etikete;

    var tag = doc.createElement("span");
    tag.className = "gp-portalas__tag";
    tag.textContent = t.tag;

    juosta.appendChild(a);
    juosta.appendChild(tag);
    doc.body.insertBefore(juosta, doc.body.firstChild);

    sekKalba();
  }

  /* Dvikalbiai moduliai perjungdami keicia <html lang> - juosta seka kartu. */
  function sekKalba() {
    if (!global.MutationObserver) return;
    var obs = new global.MutationObserver(function () {
      var juosta = doc.getElementById(JUOSTOS_ID);
      if (!juosta) return;
      var t = TEKSTAI[kalba()];
      juosta.setAttribute("aria-label", t.aria);
      var et = juosta.querySelector(".gp-portalas__etikete");
      var tg = juosta.querySelector(".gp-portalas__tag");
      if (et) et.textContent = t.etikete;
      if (tg) tg.textContent = t.tag;
    });
    obs.observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  if (doc.body) ikelk();
  else doc.addEventListener("DOMContentLoaded", ikelk);

  global.GP_PORTALAS = { ikelk: ikelk, adresas: ADRESAS };
})(typeof window !== "undefined" ? window : this);
