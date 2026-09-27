/* ============================================================================
 * G-Procure  shared/prieinamumas.js   (v1.0, U4, 2026-09-27)
 * Ekrano skaitytuvo pavadinimai ir valdymas klaviatūra VISIEMS puslapiams - vienoje vietoje, nes moduliai
 * formas kuria iš šablonų (innerHTML) ir tie patys trūkumai kartojosi šimtus kartų (matuota 2026-09-27,
 * 25 puslapiai): 354 laukai be pavadinimo, 116 spaudžiamų elementų, kurių nepasiekia klaviatūra.
 *
 *  1) <label> be „for“ prieš lauką (div.fg, div.field, div.form-field ...) su lauku nesusieta, todėl ekrano
 *     skaitytuvas lauko pavadinimo neranda. Susiejama: „for“, kai laukas turi id, kitaip aria-labelledby.
 *  2) Laukas lentelės langelyje be etiketės - pavadinimas iš stulpelio antraštės ir eilutės pirmo langelio.
 *  3) Spaudžiami <div>, <span>, <a be href> su onclick - klaviatūra nepasiekiami. Gauna tabindex="0",
 *     vaidmenį (button, nuorodai - link), o Enter ir tarpas veikia kaip paspaudimas. Išimtys: onclick,
 *     kuris tik stabdo įvykį (lango turinys), ir fiksuoti uždengimai (modalo fonas - uždaromas mygtuku).
 *  4) Klausimas (<label> be „for“) prieš radijo mygtukų ar žymimųjų langelių grupę - grupės pavadinimas
 *     (role="radiogroup" / "group" + aria-labelledby). Be jo ekrano skaitytuvas sako tik „Taip“ / „Ne“.
 *
 * Esamų pavadinimų (aria-label, aria-labelledby, „for“, apgaubianti <label>) ir tabindex NEKEIČIA.
 * Taikoma įkėlus puslapį ir kiekvienam vėliau įterptam turiniui (MutationObserver). Nieko nesaugo ir nesiunčia.
 * Prijungiama viena eilute po portal-link.js: <script src="../shared/prieinamumas.js"></script>
 * Testai - shared/testai.html („Prieinamumas (U4)“).
 * ========================================================================== */
(function (global) {
  "use strict";
  var doc = global.document;
  if (!doc || global.GP_PRIEINAMUMAS) return;

  var LAUKAS = "input:not([type=hidden]), select, textarea";
  var LANGELIO_LAUKAS = "td input:not([type=hidden]), td select, td textarea";
  var FOKUSUOJAMAS = "a[href], button, input, select, textarea, summary, label, iframe, [tabindex], [contenteditable=''], [contenteditable='true']";
  var seka = 0;

  function sarasas(saknis, sel) {
    var s = saknis.querySelectorAll ? [].slice.call(saknis.querySelectorAll(sel)) : [];
    if (saknis.matches && saknis.matches(sel)) s.unshift(saknis);
    return s;
  }
  function kabutes(s) { return global.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&"); }
  function turiVarda(el) {
    if ((el.getAttribute("aria-label") || "").trim() || el.getAttribute("aria-labelledby")) return true;
    if (el.id && doc.querySelector('label[for="' + kabutes(el.id) + '"]')) return true;
    return !!el.closest("label");
  }

  // 1. <label> be „for“ -> laukas iškart po ja (ar vienintelis laukas kitame elemente), arba vienintelis laukas konteineryje
  function etiketes(saknis) {
    sarasas(saknis, "label:not([for])").forEach(function (lb) {
      if (lb.querySelector(LAUKAS) || !lb.textContent.trim()) return;
      var n = lb.nextElementSibling, laukas = null;
      if (n && n.matches(LAUKAS)) laukas = n;
      else if (n && !n.matches("label") && !n.querySelector("label") && n.querySelectorAll(LAUKAS).length === 1) laukas = n.querySelector(LAUKAS);
      else {
        var t = lb.parentElement;
        if (t && t.querySelectorAll(":scope > label").length === 1) {
          var v = t.querySelectorAll(LAUKAS);
          if (v.length === 1) laukas = v[0];
        }
      }
      if (!laukas || turiVarda(laukas)) return;
      if (laukas.id) lb.htmlFor = laukas.id;
      else {
        if (!lb.id) lb.id = "gp-etikete-" + (++seka);
        laukas.setAttribute("aria-labelledby", lb.id);
      }
    });
  }

  // 2. Laukas lentelės langelyje: stulpelio antraštė (ir eilutės pirmas langelis, jei jame nėra lauko)
  function langeliai(saknis) {
    sarasas(saknis, LANGELIO_LAUKAS).forEach(function (laukas) {
      if (turiVarda(laukas)) return;
      var td = laukas.closest("td"), tr = td && td.parentElement, lent = td && td.closest("table");
      if (!tr || !lent) return;
      var nr = [].indexOf.call(tr.cells, td), galva = null;
      if (lent.tHead && lent.tHead.rows.length) galva = lent.tHead.rows[lent.tHead.rows.length - 1];
      else if (lent.rows[0] && lent.rows[0] !== tr && lent.rows[0].querySelector("th")) galva = lent.rows[0];
      var stulp = galva && galva.cells[nr] ? galva.cells[nr].textContent.trim() : "";
      var pirmas = tr.cells[0];
      var eil = pirmas && pirmas !== td && !pirmas.querySelector(LAUKAS) ? pirmas.textContent.trim() : "";
      var vardas = (stulp && eil ? stulp + " (" + eil + ")" : stulp || eil).replace(/\s+/g, " ").slice(0, 120);
      if (vardas) laukas.setAttribute("aria-label", vardas);
    });
  }

  // 4. <label> be „for“, po kuria - vienos radijo grupės (to paties name) ar kelių žymimųjų langelių konteineris
  function grupes(saknis) {
    sarasas(saknis, "label:not([for])").forEach(function (lb) {
      if (lb.querySelector(LAUKAS) || !lb.textContent.trim()) return;
      var g = lb.nextElementSibling;
      if (!g || g.matches(LAUKAS + ", label, fieldset") || g.getAttribute("role") || g.closest("fieldset, [role=radiogroup], [role=group]")) return;
      var v = g.querySelectorAll("input[type=radio], input[type=checkbox]");
      if (v.length < 2) return;
      var radijas = v[0].type === "radio";
      if ([].some.call(v, function (x) { return x.type !== v[0].type || (radijas && x.name !== v[0].name); })) return;
      if (!lb.id) lb.id = "gp-etikete-" + (++seka);
      g.setAttribute("role", radijas ? "radiogroup" : "group");
      g.setAttribute("aria-labelledby", lb.id);
    });
  }

  // 3. Spaudžiami elementai be klaviatūros
  function spaudziami(saknis) {
    sarasas(saknis, "[onclick]").forEach(function (el) {
      if (el.hasAttribute("data-gp-klaviatura") || el.matches(FOKUSUOJAMAS) || el === doc.body || el === doc.documentElement) return;
      if (/^\s*(?:event|e)\.stopPropagation\(\)\s*;?\s*$/.test(el.getAttribute("onclick") || "")) return;
      if (global.getComputedStyle(el).position === "fixed") return;
      el.setAttribute("tabindex", "0");
      if (!el.getAttribute("role") && !/^(TR|TD|TH|LI|TABLE|TBODY|THEAD)$/.test(el.tagName)) el.setAttribute("role", el.tagName === "A" ? "link" : "button");
      el.setAttribute("data-gp-klaviatura", "1");
    });
  }

  function tvarkyk(saknis) {
    if (!saknis || saknis.nodeType !== 1) return;
    try { etiketes(saknis); grupes(saknis); langeliai(saknis); spaudziami(saknis); } catch (e) { /* prieinamumo pagalba niekada netrukdo moduliui */ }
  }

  doc.addEventListener("keydown", function (e) {
    var el = e.target;
    if (!el || !el.hasAttribute || !el.hasAttribute("data-gp-klaviatura") || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); el.click(); }
  });

  function pradek() {
    tvarkyk(doc.body);
    if (!global.MutationObserver) return;
    new MutationObserver(function (pokyciai) {
      var tevai = new Set();
      pokyciai.forEach(function (p) {
        [].forEach.call(p.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          tevai.add(n.parentElement && n.parentElement !== doc.body ? n.parentElement : n);
        });
      });
      tevai.forEach(function (t) { if (t.isConnected) tvarkyk(t); });
    }).observe(doc.body, { childList: true, subtree: true });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", pradek);
  else pradek();

  global.GP_PRIEINAMUMAS = { versija: "1.1", tvarkyk: tvarkyk };
})(window);
