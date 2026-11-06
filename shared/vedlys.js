/* ============================================================================
 * G-Procure  shared/vedlys.js   (window.GP_VEDLYS)
 * ----------------------------------------------------------------------------
 * Vedlio standartas (tobulinimo planas U2, 2026-11-06, naudotojo pasirinkimas): tas pats žingsnių ir trūkumų modelis
 * visuose moduliuose, kurie veda per kelis žingsnius ar skyrius (pirmas - PP-salygos; čia - bendrai, nuo PP-qual ir PP-report).
 *
 *   zingsniai(vieta, { zingsniai: ["Pirminė informacija", ...], dabartinis: 2 })
 *       Žingsnių juosta - <ol>: numeris tekstu, dabartinis su aria-current="step", atlikti - ženklas ✓ ir „(atliktas)“ ekrano skaitytuvui.
 *   privalomi(laukai) -> neužpildyti laukai
 *       laukai: [{ vieta: "#p-name" | elementas | 'input[name="x"]', tekstas: "Pirkimo pavadinimas", ka: "Įrašykite ...", tuscias?: el => bool,
 *                  kai?: () => bool }]
 *       Tuščias: sąrašas be reikšmės, tekstas be ne tarpo ženklų, radijo grupė be pasirinkimo; savas tikrinimas - tuscias(). Laukas, kurio
 *       puslapyje nėra, išjungtas arba kai() netenkinama (nerodoma šaka), netikrinamas; suskleistoje dalyje - tikrinamas.
 *   santrauka(vieta, punktai, { antraste, aprasas, veiksmai, atverk, fokusuoti })
 *       Trūkumų santrauka: kiekvienas punktas - nuoroda į lauką (atveria suskleistą dalį, slenka į vidurį ir fokusuoja lauką),
 *       veiksmų mygtukai ([{ tekstas, f, pagrindinis }]). Fokusas - į santraukos antraštę (ekrano skaitytuvas ją perskaito).
 *       punktai: [{ tekstas, vieta?, lygis?: "klaida" | "ispejimas" }]; tuščias sąrašas - santrauka nuimama.
 *   pazymek(punktai) / nuimk(sritis)
 *       Klaida prie lauko: aria-invalid, tekstas po lauku (ką padaryti), aria-describedby; nuimama, kai lauke įrašoma reikšmė.
 *   liko(vieta, laukai)
 *       Kiek privalomų laukų liko - atnaujinama rašant (gyva sritis, pranešama ne dažniau kaip po pauzės).
 *
 * Nieko nesaugo ir nesiunčia. Stilius įdedamas vieną kartą (shared/epso-g.css žetonai; dydžių skalė 12/13/14/16).
 * ==========================================================================*/
(function (global) {
  "use strict";
  var doc = global.document;
  var T = {
    lt: { juosta: "Vediklio žingsniai", atliktas: " (atliktas)", dabartinis: " (dabartinis)", antraste: "Prieš tęsiant užpildykite",
          liko1: "Liko užpildyti 1 privalomą lauką", likoN: "Liko užpildyti {n} privalomus laukus", likoNN: "Liko užpildyti {n} privalomų laukų",
          visi: "Visi privalomi laukai užpildyti", ispejimas: "Patikrinkite" },
    en: { juosta: "Wizard steps", atliktas: " (completed)", dabartinis: " (current)", antraste: "Before continuing, complete",
          liko1: "1 required field left", likoN: "{n} required fields left", likoNN: "{n} required fields left",
          visi: "All required fields completed", ispejimas: "Please check" }
  };
  function kalba() { return /^en/i.test(doc.documentElement.lang || "") ? "en" : "lt"; }
  function t(k) { return T[kalba()][k]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var nr = 0;
  function naujasId(p) { return "gpv-" + p + "-" + (++nr); }

  function stilius() {
    if (doc.getElementById("gpv-stilius")) return;
    var s = doc.createElement("style");
    s.id = "gpv-stilius";
    s.textContent = [
      ".gpv-zingsniai{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-wrap:wrap;gap:6px}",
      ".gpv-z{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;padding:6px 14px 6px 6px;border-radius:999px;",
      "  background:var(--color-graphite-5,#F4F5F6);color:var(--color-graphite-50-strong,#5B6470);border:1px solid var(--color-graphite-15,#DDE0E3)}",
      ".gpv-n{min-width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;",
      "  background:#fff;color:var(--color-graphite,#2E3641);border:1px solid var(--color-graphite-30,#B9BEC5)}",
      ".gpv-z--dabartinis{background:var(--color-green-5,#EEF8F1);color:var(--color-emerald-strong,#007554);border-color:var(--color-emerald,#00A072)}",
      ".gpv-z--dabartinis .gpv-n{background:var(--color-emerald-strong,#007554);color:#fff;border-color:var(--color-emerald-strong,#007554)}",
      ".gpv-z--atliktas{color:var(--color-green-strong,#2B6E37)}",
      ".gpv-z--atliktas .gpv-n{font-size:0;background:var(--color-green-strong,#2B6E37);border-color:var(--color-green-strong,#2B6E37)}",
      ".gpv-z--atliktas .gpv-n::before{content:'\\2713';font-size:13px;color:#fff}",
      ".gpv-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}",
      ".gpv-santrauka{margin:0 0 16px;padding:12px 16px;border:1px solid var(--color-error-strong,#B3263A);border-left-width:4px;border-radius:8px;",
      "  background:#fff;color:var(--color-graphite,#2E3641);font-size:14px}",
      ".gpv-santrauka--ispejimas{border-color:var(--color-warning-strong,#8A5A00)}",
      ".gpv-santrauka:focus{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpv-santrauka h3{margin:0 0 6px;font-size:16px;font-weight:700}",
      ".gpv-santrauka p{margin:0 0 6px;font-size:13px;color:var(--color-graphite-50-strong,#5B6470)}",
      ".gpv-santrauka ul{margin:0;padding-left:20px}",
      ".gpv-santrauka li{margin:3px 0;overflow-wrap:anywhere}",
      ".gpv-santrauka li.gpv-isp::marker{color:var(--color-warning-strong,#8A5A00)}",
      ".gpv-santrauka a{color:var(--color-emerald-strong,#007554);text-decoration:underline}",
      ".gpv-veiksmai{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}",
      ".gpv-liko{font-size:13px;color:var(--color-graphite-50-strong,#5B6470);margin:6px 0 0}",
      ".gpv-liko--visi{color:var(--color-green-strong,#2B6E37)}",
      "@media print{.gpv-santrauka,.gpv-liko{display:none!important}}"
    ].join("\n");
    (doc.head || doc.documentElement).appendChild(s);
  }

  function el(v) {
    if (!v) return null;
    if (typeof v !== "string") return v;
    try { return doc.querySelector(v); } catch (e) { return null; }
  }
  /* Radijo grupė - visi tos grupės mygtukai */
  function grupe(e) {
    if (!e || e.type !== "radio" || !e.name) return null;
    return Array.prototype.slice.call(doc.querySelectorAll('input[type="radio"]')).filter(function (r) { return r.name === e.name; });
  }
  function tuscias(e, l) {
    if (l && typeof l.tuscias === "function") return !!l.tuscias(e);
    if (!e) return true;
    var g = grupe(e);
    if (g) return !g.some(function (r) { return r.checked; });
    if (e.type === "checkbox") return !e.checked;
    return !String(e.value == null ? "" : e.value).trim();
  }

  function zingsniai(vieta, o) {
    var v = el(vieta); if (!v) return;
    stilius();
    var dab = Number(o && o.dabartinis) || 1, zs = (o && o.zingsniai) || [];
    v.innerHTML = '<ol class="gpv-zingsniai" aria-label="' + esc((o && o.pavadinimas) || t("juosta")) + '">' + zs.map(function (p, i) {
      var n = i + 1, b = n < dab ? "atliktas" : n === dab ? "dabartinis" : "busimas";
      return '<li class="gpv-z gpv-z--' + b + '"' + (b === "dabartinis" ? ' aria-current="step"' : "") + '><span class="gpv-n">' + n + "</span>" +
        '<span class="gpv-p">' + esc(p) + "</span>" + (b === "atliktas" ? '<span class="gpv-sr">' + esc(t("atliktas")) + "</span>" : "") + "</li>";
    }).join("") + "</ol>";
  }

  function privalomi(laukai) {
    return (laukai || []).filter(function (l) {
      var e = el(l.vieta);
      if (!e || e.disabled || (typeof l.kai === "function" && !l.kai())) return false;
      return tuscias(e, l);
    }).map(function (l) { return { tekstas: l.tekstas + (l.ka ? " - " + l.ka : ""), vieta: l.vieta, ka: l.ka || "", lygis: "klaida" }; });
  }

  /* Uždaryta dalis aplink lauką: <details>, modulio „.collapsed“ (atverk(e) - modulio funkcija) */
  function atidaryk(e, atverk) {
    for (var p = e && e.parentElement; p; p = p.parentElement) {
      if (p.tagName === "DETAILS" && !p.open) p.open = true;
      if (p.classList && p.classList.contains("collapsed")) { if (atverk) atverk(p); else p.classList.remove("collapsed"); }
    }
  }
  function eik(v, atverk) {
    var e = el(v); if (!e) return false;
    var g = grupe(e), f = g ? (g.filter(function (r) { return r.checked; })[0] || g[0]) : e;
    atidaryk(f, atverk);
    if (f.scrollIntoView) f.scrollIntoView({ block: "center" });
    if (f.focus) f.focus({ preventScroll: true });
    return doc.activeElement === f;
  }

  function santrauka(vieta, punktai, o) {
    var v = el(vieta); if (!v) return null;
    o = o || {};
    stilius();
    if (!punktai || !punktai.length) { v.innerHTML = ""; v.hidden = true; return null; }
    var hid = naujasId("h"), visiIsp = punktai.every(function (p) { return p.lygis === "ispejimas"; });
    v.hidden = false;
    v.innerHTML = '<div class="gpv-santrauka' + (visiIsp ? " gpv-santrauka--ispejimas" : "") + '" tabindex="-1" role="region" aria-labelledby="' + hid + '">' +
      '<h3 id="' + hid + '">' + esc(o.antraste || t("antraste")) + " (" + punktai.length + ")</h3>" +
      (o.aprasas ? "<p>" + esc(o.aprasas) + "</p>" : "") +
      "<ul>" + punktai.map(function (p, i) {
        return '<li' + (p.lygis === "ispejimas" ? ' class="gpv-isp"' : "") + ">" + (p.vieta && el(p.vieta)
          ? '<a href="#" data-gpv-i="' + i + '">' + esc(p.tekstas) + "</a>" : esc(p.tekstas)) + "</li>";
      }).join("") + "</ul>" +
      ((o.veiksmai || []).length ? '<div class="gpv-veiksmai">' + o.veiksmai.map(function (a, i) {
        return '<button type="button" class="' + esc(a.klase || (a.pagrindinis ? "btn btn-primary" : "btn btn-secondary")) + '" data-gpv-v="' + i + '">' + esc(a.tekstas) + "</button>";
      }).join("") + "</div>" : "") + "</div>";
    var box = v.firstChild;
    box.addEventListener("click", function (ev) {
      var a = ev.target.closest("[data-gpv-i]");
      if (a) { ev.preventDefault(); eik(punktai[+a.getAttribute("data-gpv-i")].vieta, o.atverk); return; }
      var b = ev.target.closest("[data-gpv-v]");
      if (b) { var f = o.veiksmai[+b.getAttribute("data-gpv-v")].f; if (f) f(); }
    });
    if (o.fokusuoti !== false) {
      if (box.scrollIntoView) box.scrollIntoView({ block: "start" });
      box.focus({ preventScroll: true });
    }
    return box;
  }

  /* Klaida prie lauko (tekstas po lauku ar radijo grupe; nuimama įrašius reikšmę) */
  function pazymek(punktai) {
    (punktai || []).forEach(function (p) {
      if (p.lygis === "ispejimas") return;
      var e = el(p.vieta); if (!e) return;
      // radijo grupė: tekstas po grupės bloku (ne jo viduje - eilutės grupėje jis atsidurtų tarp variantų)
      // žymimasis langelis: po langelių grupės ar jo etiketės (ne tarp langelio ir jo pavadinimo)
      var g = grupe(e), laukai = g || [e], po = g ? (e.closest('fieldset, .radio-group, [role="radiogroup"]') || e.closest(".field, .form-field, td") || e.parentElement)
        : e.type === "checkbox" ? (e.closest('.checkbox-group, fieldset, [role="group"]') || e.closest("label") || e) : e;
      if (laukai[0].getAttribute("data-gpv-id")) return;
      var id = naujasId("klaida"), m = doc.createElement("p");
      m.id = id; m.className = "gp-lauko-msg gp-lauko-msg--klaida"; m.setAttribute("data-gpv", "1");
      m.textContent = p.ka || p.tekstas;
      if (g && !po.matches('fieldset, .radio-group, [role="radiogroup"]')) po.appendChild(m); else po.parentNode.insertBefore(m, po.nextSibling);
      laukai.forEach(function (x) {
        x.setAttribute("aria-invalid", "true"); x.setAttribute("data-gpv-id", id);
        x.setAttribute("aria-describedby", ((x.getAttribute("aria-describedby") || "") + " " + id).trim());
      });
      var nuo = function () { if (!tuscias(e, p)) { nuimkLauka(laukai); laukai.forEach(function (x) { x.removeEventListener("input", nuo); x.removeEventListener("change", nuo); }); } };
      laukai.forEach(function (x) { x.addEventListener("input", nuo); x.addEventListener("change", nuo); });
    });
  }
  function nuimkLauka(laukai) {
    laukai.forEach(function (x) {
      var id = x.getAttribute("data-gpv-id"); if (!id) return;
      var m = doc.getElementById(id); if (m) m.remove();
      x.removeAttribute("data-gpv-id");
      if (!x.getAttribute("data-gp-tikr")) x.removeAttribute("aria-invalid");
      var ds = (x.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (d) { return d && d !== id; }).join(" ");
      if (ds) x.setAttribute("aria-describedby", ds); else x.removeAttribute("aria-describedby");
    });
  }
  function nuimk(sritis) {
    var s = el(sritis) || doc;
    nuimkLauka(Array.prototype.slice.call(s.querySelectorAll("[data-gpv-id]")));
  }

  /* „Liko užpildyti N“: atnaujinama rašant ir keičiant laukus srityje (gyva sritis - ekrano skaitytuvas praneša po pauzės) */
  function likoTekstas(n) {
    if (!n) return t("visi");
    if (kalba() === "en") return (n === 1 ? t("liko1") : t("likoN")).replace("{n}", n);
    var v = n % 10, d = n % 100;
    return (v === 1 && d !== 11 ? t("liko1").replace("1", n) : v >= 2 && v <= 9 && (d < 12 || d > 19) ? t("likoN") : t("likoNN")).replace("{n}", n);
  }
  function liko(vieta, laukai, sritis) {
    var v = el(vieta); if (!v) return null;
    stilius();
    v.classList.add("gpv-liko"); v.setAttribute("aria-live", "polite");
    var laik = null;
    var atnaujink = function () {
      var n = privalomi(laukai).length;
      v.textContent = likoTekstas(n);
      v.classList.toggle("gpv-liko--visi", !n);
      return n;
    };
    var n0 = atnaujink();
    var s = el(sritis) || v.parentElement;
    var klausyk = function () { clearTimeout(laik); laik = setTimeout(atnaujink, 400); };
    // perpiešus - ankstesnis klausytojas pakeičiamas (vienas sričiai)
    if (s) {
      if (s.__gpvLiko) { s.removeEventListener("input", s.__gpvLiko); s.removeEventListener("change", s.__gpvLiko); }
      s.addEventListener("input", klausyk); s.addEventListener("change", klausyk); s.__gpvLiko = klausyk;
    }
    return { atnaujink: atnaujink, liko: n0 };
  }

  global.GP_VEDLYS = { versija: "1.0", zingsniai: zingsniai, privalomi: privalomi, santrauka: santrauka, pazymek: pazymek, nuimk: nuimk,
                       liko: liko, likoTekstas: likoTekstas, eik: eik };
})(window);
