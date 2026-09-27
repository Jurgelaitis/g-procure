/* ============================================================================
 * G-Procure  shared/prieinamumas.js   (v1.3, U4 2026-09-27; A3 2026-09-28 - ikonos ir diagramos)
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
 *  5) Modaliniai langai (pažymėti data-gp-langas ant fono elemento): atsivėrus - role="dialog", aria-modal,
 *     pavadinimas iš antraštės, fokusas į pirmą lauką arba patį langą; Tab lieka lange; Esc uždaro lango
 *     mygtuku („✕“, „×“, „Uždaryti“, „Atšaukti“, [data-gp-uzdaryti]) arba fono paspaudimu; užvėrus fokusas
 *     grįžta į elementą, iš kurio langas atvertas. Langai su savu valdymu (jau turi role="dialog") neliečiami,
 *     naršyklės <dialog> - tik grąžinamas fokusas (Safari to nedaro).
 *  6) Dekoratyvios SVG ikonos (be jokio pavadinimo šaltinio ir be teksto) - aria-hidden: Chrome jas pateikdavo kaip
 *     „paveikslą“ be pavadinimo (150 vietų 25 puslapiuose, matuota prieinamumo medžiu 2026-09-28).
 *  7) Chart.js diagramos: role="img" ir pavadinimas su duomenų santrauka; per blankios spalvos (< 3:1 ant fono) gauna
 *     tos pačios spalvos tamsesnį kontūrą ar liniją (WCAG 1.4.11).
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

  /* 5. Modaliniai langai (U4, 2026-09-27). Moduliai langus rodo keisdami klasę ar stilių (.show, .open, display:flex) arba
     įterpdami juos iš šablonų, todėl atsivėrus fokusas likdavo po langu, Tab išeidavo į puslapį, Esc neuždarydavo, o užvėrus
     fokusas dingdavo. Stebima: LANGAI (fono elementai) ir [data-gp-langas]. Atsivėrus - role="dialog", aria-modal,
     pavadinimas iš antraštės, fokusas į pirmą lauką arba patį langą; Tab lieka lange; Esc - lango uždarymo mygtukas
     („✕“, „×“, „Uždaryti“, „Atšaukti“, [data-gp-uzdaryti]) arba fono paspaudimas; užvėrus fokusas grįžta į atvėrusį
     elementą. Langai su savu valdymu (jau turintys role="dialog") neliečiami; <dialog> (naršyklės) - tik grąžinamas fokusas. */
  var LANGAI = "[data-gp-langas]";   // papildoma žemiau pagal modulių langų inventorių
  var LANGO_TURINYS = ".modal, .modal-content, .modal__content, .epso-modal__content, .preview-sheet, .modal-box, .modal-card, [class*='modal__'], [class*='dialog']";
  var UZDARYMO_TEKSTAS = /^(?:[✕×✖]\s*)?(?:uždaryti|close|atšaukti|cancel)?$/i;
  var atviri = [], paskutinis = null, tikrinimas = 0;

  function rodomas(el) {
    if (!el || !el.isConnected) return false;
    var cs = global.getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  }
  // Langas atvertas: rodomas, nepermatomas ir priima paspaudimus (paslėptas permatomumu langas lieka display:flex)
  function atvertas(fonas) {
    if (!rodomas(fonas)) return false;
    if (fonas.tagName === "DIALOG") return fonas.open;
    var cs = global.getComputedStyle(fonas);
    return cs.pointerEvents !== "none" && parseFloat(cs.opacity) > 0.05;
  }
  function fokusuojami(saknis) {
    return [].filter.call(saknis.querySelectorAll("a[href], area[href], button, input:not([type=hidden]), select, textarea, iframe, summary, [tabindex], [contenteditable=''], [contenteditable='true']"),
      function (x) { return !x.disabled && x.getAttribute("tabindex") !== "-1" && rodomas(x); });
  }
  function langoTurinys(fonas) {
    if (fonas.matches("[role=dialog], dialog")) return fonas;
    var t = fonas.querySelector(LANGO_TURINYS);
    return t && t.parentElement === fonas ? t : (fonas.firstElementChild && fonas.children.length === 1 ? fonas.firstElementChild : fonas);
  }
  function savasValdymas(fonas) {
    // Modulis pats valdo langą (PP-tiekejams, informacinė skiltis): role="dialog" jau yra ir ne mūsų
    var d = fonas.matches("[role=dialog]") ? fonas : fonas.querySelector("[role=dialog]");
    return !!(d && !d.hasAttribute("data-gp-dialogas"));
  }
  function irasas(fonas) { for (var i = 0; i < atviri.length; i++) if (atviri[i].fonas === fonas) return atviri[i]; return null; }

  function atverk(fonas) {
    var natyvus = fonas.tagName === "DIALOG";
    var lang = natyvus ? fonas : langoTurinys(fonas);
    var akt = doc.activeElement;
    var atidare = akt && akt !== doc.body && !fonas.contains(akt) ? akt : paskutinis;
    var i = { fonas: fonas, langas: lang, atidare: atidare, atidareId: atidare && atidare.id, natyvus: natyvus };
    atviri.push(i);
    if (natyvus) return;
    if (!lang.getAttribute("role")) { lang.setAttribute("role", "dialog"); lang.setAttribute("data-gp-dialogas", "1"); }
    if (!lang.hasAttribute("aria-modal")) lang.setAttribute("aria-modal", "true");
    if (!lang.getAttribute("aria-labelledby") && !lang.getAttribute("aria-label")) {
      var h = lang.querySelector("h1, h2, h3, h4, [class*='title'], [class*='Title'], [class*='pavad'], [class*='antrast']");
      if (h && h.textContent.trim()) { if (!h.id) h.id = "gp-lango-pav-" + (++seka); lang.setAttribute("aria-labelledby", h.id); }
    }
    // Modulis gali piešti turinį po klasės pakeitimo - fokusas perkeliamas kitame žingsnyje, jei modulis pats jo neperkėlė
    global.setTimeout(function () {
      if (atviri.indexOf(i) < 0 || lang.contains(doc.activeElement)) return;
      var laukas = [].filter.call(lang.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea"), function (x) { return !x.disabled && !x.readOnly && rodomas(x); })[0];
      if (laukas) laukas.focus();
      else { if (!lang.hasAttribute("tabindex")) lang.setAttribute("tabindex", "-1"); lang.focus(); }
    }, 0);
  }
  function uzverk(i) {
    atviri.splice(atviri.indexOf(i), 1);
    var a = doc.activeElement;
    if (a && a !== doc.body && a.isConnected && !i.fonas.contains(a) && rodomas(a)) return;   // fokusas jau kitur (modulis perkėlė)
    var t = i.atidare && i.atidare.isConnected && rodomas(i.atidare) ? i.atidare : (i.atidareId ? doc.getElementById(i.atidareId) : null);
    if (t && rodomas(t)) { try { t.focus(); } catch (e) {} }
  }
  function tikrinkLangus() {
    tikrinimas = 0;
    [].forEach.call(doc.querySelectorAll(LANGAI + ", dialog[open]"), function (f) {
      if (!irasas(f) && atvertas(f) && (f.tagName === "DIALOG" || !savasValdymas(f))) atverk(f);
    });
    atviri.slice().forEach(function (i) { if (!atvertas(i.fonas)) uzverk(i); });
  }
  function planuok() { if (!tikrinimas) tikrinimas = global.setTimeout(tikrinkLangus, 0); }
  function virsutinis() { for (var k = atviri.length - 1; k >= 0; k--) if (!atviri[k].natyvus && atvertas(atviri[k].fonas)) return atviri[k]; return null; }
  // Lango uždarymo mygtukas: pažymėtas data-gp-uzdaryti, arba jo pavadinimas - tik „✕“ / „×“ / „Uždaryti“ / „Atšaukti“
  // (su ženklu ar be); „Uždaryti pirkimą“ ir panašūs veiksmai netinka
  function uzdarymoMygtukas(i) {
    var v = [].filter.call(i.langas.querySelectorAll("[data-gp-uzdaryti], button, [role=button], a:not([href])"), rodomas);
    return v.filter(function (b) { return b.hasAttribute("data-gp-uzdaryti"); })[0] || v.filter(function (b) {
      var t = (b.getAttribute("aria-label") || b.textContent || "").replace(/\s+/g, " ").trim();
      return !!t && UZDARYMO_TEKSTAS.test(t);
    })[0] || null;
  }

  doc.addEventListener("focusin", function (e) { if (!e.target.closest || !atviri.some(function (i) { return i.fonas.contains(e.target); })) paskutinis = e.target; }, true);
  doc.addEventListener("mousedown", function (e) {
    var b = e.target.closest && e.target.closest("button, a[href], [role=button], [tabindex], input, select, summary");
    if (b && !atviri.some(function (i) { return i.fonas.contains(b); })) paskutinis = b;   // Safari mygtuko paspaudimu fokuso neduoda
  }, true);
  doc.addEventListener("keydown", function (e) {
    var i = virsutinis(); if (!i) return;
    if (e.key === "Tab") {
      var f = fokusuojami(i.langas);
      if (!f.length) { e.preventDefault(); i.langas.focus(); return; }
      var a = doc.activeElement, pirm = f[0], pask = f[f.length - 1];
      if (!i.langas.contains(a)) { e.preventDefault(); (e.shiftKey ? pask : pirm).focus(); }
      else if (e.shiftKey && (a === pirm || a === i.langas)) { e.preventDefault(); pask.focus(); }
      else if (!e.shiftKey && a === pask) { e.preventDefault(); pirm.focus(); }
    } else if (e.key === "Escape" || e.key === "Esc") {
      // Po modulio klausytojų: jei modulis langą uždarė pats ar sustabdė įvykį - nieko nedarom
      global.setTimeout(function () {
        if (e.defaultPrevented || atviri.indexOf(i) < 0 || !atvertas(i.fonas)) return;
        var b = uzdarymoMygtukas(i);
        if (b) b.click();
        else if (i.fonas !== i.langas) i.fonas.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }, 0);
    }
  });

  /* 6. Dekoratyvios SVG ikonos (A3, 2026-09-28). Chrome kiekvieną <svg> be pavadinimo pateikia ekrano skaitytuvui kaip
     „paveikslą“ be pavadinimo (matuota prieinamumo medžiu, 25 puslapiai): ikona mygtuke, antraštėje ar skiltyje nieko
     nepasako. Paslepiama (aria-hidden="true") tik ikona be jokio pavadinimo šaltinio: be role, aria-label, aria-labelledby,
     <title>, <desc> ir be <text> (diagrama su tekstu lieka skaitoma). Pavadinimo mygtukui ikona ir iki tol nedavė. */
  function ikonos(saknis) {
    sarasas(saknis, "svg:not([aria-hidden]):not([role]):not([aria-label]):not([aria-labelledby])").forEach(function (svg) {
      if (svg.ownerSVGElement || svg.querySelector("title, desc, text")) return;
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
    });
  }

  // Tuščia drobė (diagrama dar nenupiešta - pvz. nėra duomenų) be pavadinimo: nieko nesako, paslepiama; nupiešus - grąžinama (7 p.)
  function drobes(saknis) {
    sarasas(saknis, "canvas:not([aria-hidden]):not([role]):not([aria-label]):not([aria-labelledby])").forEach(function (c) {
      if (c.textContent.trim()) return;
      var C = global.Chart;
      if (C && C.getChart && C.getChart(c)) return;
      c.setAttribute("aria-hidden", "true");
      c.setAttribute("data-gp-tuscia", "1");
    });
  }

  function tvarkyk(saknis) {
    if (!saknis || saknis.nodeType !== 1) return;
    try { etiketes(saknis); grupes(saknis); langeliai(saknis); spaudziami(saknis); ikonos(saknis); drobes(saknis); } catch (e) { /* prieinamumo pagalba niekada netrukdo moduliui */ }
  }

  /* 7. Diagramos (Chart.js, A3, 2026-09-28). Diagrama piešiama <canvas> - ekrano skaitytuvui tai tuščias „paveikslas“
     (matuota: 17 iš 18 diagramų be pavadinimo), o dalis spalvų ant balto per blankios (WCAG 1.4.11 - 3:1): geltona
     #FAB03B 1,9:1, šviesiai pilka #C7CDD3 1,6:1, žydra 2,9:1, šviesiai žalia 2,1:1. Vienas Chart.js papildinys visiems:
     canvas gauna role="img" ir pavadinimą - antraštė (ar modulio aria-label) ir duomenų santrauka („Rizika: maža 5,
     vidutinė 3“); silpnos spalvos stulpelis ar sektorius gauna tos pačios spalvos tamsesnį kontūrą (>= 3:1), silpna linija -
     tamsesnę tos pačios spalvos liniją. Užpildo spalvos nekeičiamos; modulio kontūras, jei jau pakankamas, paliekamas. */
  function rgb(spalva) {
    var c = (rgb.ctx = rgb.ctx || doc.createElement("canvas").getContext("2d"));
    if (!c || typeof spalva !== "string") return null;
    c.fillStyle = "#000000"; c.fillStyle = spalva;
    var s = c.fillStyle, m;
    if (/^#[0-9a-f]{6}$/i.test(s)) return { r: parseInt(s.substr(1, 2), 16), g: parseInt(s.substr(3, 2), 16), b: parseInt(s.substr(5, 2), 16), a: 1 };
    if ((m = /^rgba?\(([^)]+)\)$/.exec(s))) { var p = m[1].split(/\s*,\s*/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    return null;
  }
  function sviesis(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function santykis(a, b) { var x = sviesis(a), y = sviesis(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function ant(c, fonas) { return { r: c.r * c.a + fonas.r * (1 - c.a), g: c.g * c.a + fonas.g * (1 - c.a), b: c.b * c.a + fonas.b * (1 - c.a), a: 1 }; }
  function hex(c) { return "#" + [c.r, c.g, c.b].map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""); }
  // Ta pati spalva, tamsinama tol, kol pasiekia 3:1 ant fono
  function tamsesne(c, fonas) {
    var x = ant(c, fonas);
    for (var t = 0; t <= 1.0001; t += 0.05) {
      var d = { r: x.r * (1 - t), g: x.g * (1 - t), b: x.b * (1 - t), a: 1 };
      if (santykis(d, fonas) >= 3.05) return hex(d);
    }
    return "#000000";
  }
  function diagramosFonas(canvas) {
    for (var e = canvas; e && e.nodeType === 1; e = e.parentElement) {
      var c = rgb(global.getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.5) return { r: c.r, g: c.g, b: c.b, a: 1 };
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  var UZPILDAS = /^(bar|doughnut|pie|polarArea)$/;
  function kontrastas(ch) {
    var fonas = diagramosFonas(ch.canvas), tipas = ch.config.type;
    (ch.data.datasets || []).forEach(function (ds) {
      var t = ds.type || tipas;
      if (UZPILDAS.test(t)) {
        var fonai = Array.isArray(ds.backgroundColor) ? ds.backgroundColor : [ds.backgroundColor];
        var kiek = Math.max(fonai.length, (ds.data || []).length), silpna = false, krastai = [];
        for (var i = 0; i < kiek; i++) {
          var f = rgb(fonai[i % fonai.length]);
          if (!f) { krastai.push(null); continue; }
          if (santykis(ant(f, fonas), fonas) < 3) { silpna = true; krastai.push(tamsesne(f, fonas)); } else krastai.push(null);
        }
        if (!silpna) return;
        // Modulio kontūras, jei jau pakankamas, paliekamas
        var bc = rgb(Array.isArray(ds.borderColor) ? ds.borderColor[0] : ds.borderColor);
        if (ds._gpKontrastas === undefined && bc && (+ds.borderWidth || 0) >= 1 && santykis(ant(bc, fonas), fonas) >= 3) return;
        var senas = Array.isArray(ds.borderColor) ? ds.borderColor : null;
        ds.borderColor = krastai.map(function (k, i) { return k || (senas && senas[i]) || (rgb(fonai[i % fonai.length]) ? hex(ant(rgb(fonai[i % fonai.length]), fonas)) : "#2E3641"); });
        if (!((+ds.borderWidth || 0) >= 1)) ds.borderWidth = /^(doughnut|pie|polarArea)$/.test(t) ? 1.5 : 1;
        ds._gpKontrastas = true;
      } else if (t === "line" || t === "radar" || t === "scatter" || t === "bubble") {
        var l = rgb(Array.isArray(ds.borderColor) ? ds.borderColor[0] : ds.borderColor);
        if (l && santykis(ant(l, fonas), fonas) < 3) { ds.borderColor = tamsesne(l, fonas); ds._gpKontrastas = true;
          if (ds.pointBackgroundColor === undefined) ds.pointBackgroundColor = ds.borderColor; }
      }
    });
  }
  function reiksme(v, lokale) {
    if (v && typeof v === "object") v = v.y !== undefined ? v.y : v.r !== undefined ? v.r : v.x;
    if (typeof v !== "number" || !isFinite(v)) return "–";
    return v.toLocaleString(lokale, { maximumFractionDigits: 2 });
  }
  function diagramosPavadinimas(canvas, ch) {
    var t = ch.options && ch.options.plugins && ch.options.plugins.title && ch.options.plugins.title.display && ch.options.plugins.title.text;
    if (t) return [].concat(t).join(" ");
    for (var a = canvas.parentElement, n = 0; a && n < 4; a = a.parentElement, n++) {
      var h = [].filter.call(a.querySelectorAll("h1,h2,h3,h4,h5,h6,[class*='title'],[class*='pavad']"), function (x) {
        return !x.contains(canvas) && (x.compareDocumentPosition(canvas) & 4) && x.textContent.trim();
      });
      if (h.length) return h[h.length - 1].textContent.replace(/\s+/g, " ").trim().slice(0, 120);
    }
    return "";
  }
  function santrauka(ch) {
    var en = /^en/i.test(doc.documentElement.getAttribute("lang") || ""), lokale = en ? "en-GB" : "lt-LT";
    var zyme = ch.data.labels || [], dss = (ch.data.datasets || []).filter(function (d) { return !d.hidden; });
    var DAUG = 12, dalys = [];
    dss.forEach(function (ds) {
      var e = [], duom = ds.data || [];
      for (var i = 0; i < duom.length && i < DAUG; i++) e.push((zyme[i] !== undefined ? [].concat(zyme[i]).join(" ") + " " : "") + reiksme(duom[i], lokale));
      if (duom.length > DAUG) e.push((en ? "and " : "ir dar ") + (duom.length - DAUG) + (en ? " more" : ""));
      dalys.push((dss.length > 1 && ds.label ? ds.label + ": " : "") + e.join(", "));
    });
    return dalys.join("; ");
  }
  var DIAGRAMOS_PAPILDINYS = {
    id: "gpPrieinamumas",
    beforeUpdate: function (ch) { try { kontrastas(ch); } catch (e) { /* diagrama piešiama bet kuriuo atveju */ } },
    afterUpdate: function (ch) {
      try {
        var c = ch.canvas; if (!c) return;
        if (c.getAttribute("data-gp-tuscia")) { c.removeAttribute("aria-hidden"); c.removeAttribute("data-gp-tuscia"); }
        if (!c.hasAttribute("data-gp-pavadinimas")) c.setAttribute("data-gp-pavadinimas", c.getAttribute("aria-label") || "");
        var pav = c.getAttribute("data-gp-pavadinimas") || diagramosPavadinimas(c, ch) || (/^en/i.test(doc.documentElement.getAttribute("lang") || "") ? "Chart" : "Diagrama");
        var s = santrauka(ch);
        c.setAttribute("role", "img");
        c.setAttribute("aria-label", (pav + (s ? ". " + s : "")).slice(0, 900));
      } catch (e) { /* pavadinimas - pagalba, ne sąlyga */ }
    }
  };
  function registruokDiagramas() {
    var C = global.Chart;
    if (!C || typeof C.register !== "function" || C.__gpPrieinamumas) return;
    try { C.register(DIAGRAMOS_PAPILDINYS); C.__gpPrieinamumas = true; } catch (e) { /* sena Chart.js versija */ }
  }
  registruokDiagramas();

  doc.addEventListener("keydown", function (e) {
    var el = e.target;
    if (!el || !el.hasAttribute || !el.hasAttribute("data-gp-klaviatura") || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); el.click(); }
  });

  function pradek() {
    registruokDiagramas();   // Chart.js įkeliamas <head> - iki šiol jau yra; kitaip bandoma dar kartą įkėlus puslapį
    global.addEventListener("load", registruokDiagramas);
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
    // Langai: klasės, stiliaus, hidden ir open pokyčiai bei perėjimų pabaiga (permatomumo perėjimas pokyčio neduoda)
    new MutationObserver(planuok).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "open"] });
    doc.addEventListener("transitionend", planuok, true);
    doc.addEventListener("animationend", planuok, true);
    planuok();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", pradek);
  else pradek();

  global.GP_PRIEINAMUMAS = { versija: "1.3", tvarkyk: tvarkyk, registruokDiagramas: registruokDiagramas };
})(window);
