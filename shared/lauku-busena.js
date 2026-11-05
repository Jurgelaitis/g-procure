/*
 * G-Procure: laukų būsena ilgose pildymo formose (GP_LAUKU_BUSENA, 2026-11-05, naudotojo sprendimas „abi dalys“).
 *
 * Išvaizda - shared/epso-g.css („Formos laukų būsena“): konteineryje .gp-pildoma užpildytas laukas žalsvas, tuščias - baltas.
 * Naršyklė tuščią lauką atpažįsta tik pagal :placeholder-shown, o jis veikia tik laukui su placeholder. Šis failas kiekvienam
 * tekstiniam laukui .gp-pildoma viduje, kuris pavyzdžio neturi, prideda placeholder=" " - ir vėliau įterptiems (formos piešiamos
 * iš šablonų, protokolų eilutės pridedamos). Lentelių langeliuose nekeičia (ten būsenos nėra). Nieko nesaugo ir nesiunčia.
 * Jungiama po shared/epso-g.css; modulis įsijungia klase gp-pildoma ant formos konteinerio.
 */
(function () {
  "use strict";
  var TIPAI = /^(text|number|email|tel|url)$/;

  function tinka(el) {
    if (el.hasAttribute("placeholder") || el.closest("td, th")) return false;
    if (el.tagName === "TEXTAREA") return true;
    return TIPAI.test((el.getAttribute("type") || "text").toLowerCase());
  }

  function sutvarkyk(saknis) {
    var r = saknis || document;
    if (!r.querySelectorAll) return 0;
    var l = r.querySelectorAll(".gp-pildoma input, .gp-pildoma textarea"), n = 0;
    for (var i = 0; i < l.length; i++) if (tinka(l[i])) { l[i].setAttribute("placeholder", " "); n++; }
    return n;
  }

  var laukia = false;
  function veliau() {
    if (laukia) return;
    laukia = true;
    (window.requestAnimationFrame || setTimeout)(function () { laukia = false; sutvarkyk(document); });
  }

  function pradek() {
    sutvarkyk(document);
    if (window.MutationObserver && document.body) {
      new MutationObserver(veliau).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pradek);
  else pradek();

  /* ---------- Tikrinimas pildant (U3, 2026-11-06, naudotojo sprendimas) ----------
     Tik .gp-pildoma viduje. Laukas tikrinamas išėjus iš jo (ne kiekvienu klavišu); klaida sako, ką padaryti, ir dingsta, kai
     reikšmė pataisoma. Skaičiaus laukas, į kurį įrašyta „14.900,00“, naršyklėje tampa TUŠČIAS (reikšmė prarandama tyliai) -
     tai svarbiausias atvejis. Privalomas laukas (required, aria-required arba žvaigždutė pavadinime) - tik jei žmogus jame
     rašė ir paliko tuščią: perėjus per lauką klaviatūra klaidos nėra. Data rodo savaitės dieną ir kiek iki jos darbo dienų
     (GP_WORKDAYS, jei įkeltas), poilsio ar šventinė diena - įspėjimas. Kur modulis aria-invalid nustatė pats - nesikišama. */
  var SAV = { lt: ["sekmadienis", "pirmadienis", "antradienis", "trečiadienis", "ketvirtadienis", "penktadienis", "šeštadienis"],
              en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
  var T = {
    lt: { sk: "Skaičius neatpažintas - reikšmė neįrašyta. Rašykite be tarpų ir tūkstančių skyriklių, pvz., 14900.50.",
          skyr: "Laukas priėmė {v} - patikrinkite. Skaičiuje nerašykite kablelių ir tarpų, dešimtainei daliai - taškas, pvz., 14900.50.",
          min: "Ne mažiau kaip {x}.", max: "Ne daugiau kaip {x}.", sveikas: "Įrašykite sveiką skaičių.",
          priv: "Privalomas laukas - įrašykite reikšmę.", pastas: "El. pašto adresas neatpažintas, pvz., vardas@imone.lt.",
          siandien: "šiandien", po: "po {n} darbo {d}", pries: "prieš {n} darbo {d}", poilsis: " - poilsio diena", svente: " - šventinė diena, ne darbo diena" },
    en: { sk: "Number not recognised - the value was not saved. Type it without spaces or thousand separators, e.g. 14900.50.",
          skyr: "The field accepted {v} - please check. Do not use commas or spaces in numbers; use a point for decimals, e.g. 14900.50.",
          min: "At least {x}.", max: "At most {x}.", sveikas: "Enter a whole number.",
          priv: "Required - please fill in.", pastas: "Email address not recognised, e.g. name@company.com.",
          siandien: "today", po: "in {n} working {d}", pries: "{n} working {d} ago", poilsis: " - not a working day", svente: " - public holiday, not a working day" }
  };
  function kalba() { return /^en/i.test(document.documentElement.lang || "") ? "en" : "lt"; }
  // „po 1 darbo dienos / po 5 darbo dienų“, „prieš 1 darbo dieną / prieš 3 darbo dienas / prieš 10 darbo dienų“
  function dienos(n, kryptis, k) {
    if (k === "en") return n === 1 ? "day" : "days";
    var v = n % 10, d = n % 100;
    if (kryptis === "po") return v === 1 && d !== 11 ? "dienos" : "dienų";
    if (v === 1 && d !== 11) return "dieną";
    if (v >= 2 && v <= 9 && (d < 12 || d > 19)) return "dienas";
    return "dienų";
  }
  var nr = 0;
  function srityje(el) { return el.closest && el.closest(".gp-pildoma"); }
  function vieta(el) {
    var p = el.parentElement, cs = p && window.getComputedStyle(p);
    // lauke su vienetu ar mygtuku greta (eilutė flex) pranešimas - po visa eilute, kitaip - po lauku
    return cs && /flex/.test(cs.display) && !/column/.test(cs.flexDirection) && !/^(TD|TH)$/.test(p.tagName) ? p : el;
  }
  function pranesk(el, tekstas, rusis) {
    var id = el.getAttribute("data-gp-tikr-id"), m = id && document.getElementById(id);
    if (!tekstas) {
      if (m) m.remove();
      if (id) {
        el.removeAttribute("data-gp-tikr-id");
        var ds = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (x) { return x && x !== id; }).join(" ");
        if (ds) el.setAttribute("aria-describedby", ds); else el.removeAttribute("aria-describedby");
      }
      if (el.getAttribute("data-gp-tikr") === "1") { el.removeAttribute("aria-invalid"); el.removeAttribute("data-gp-tikr"); }
      return;
    }
    if (!m) {
      id = "gp-tikr-" + (++nr); m = document.createElement("p"); m.id = id;
      var po = vieta(el); po.parentNode.insertBefore(m, po.nextSibling);
      el.setAttribute("data-gp-tikr-id", id);
      el.setAttribute("aria-describedby", ((el.getAttribute("aria-describedby") || "") + " " + id).trim());
    }
    m.className = "gp-lauko-msg gp-lauko-msg--" + rusis;
    m.textContent = tekstas;
    if (rusis === "klaida") { el.setAttribute("aria-invalid", "true"); el.setAttribute("data-gp-tikr", "1"); }
    else if (el.getAttribute("data-gp-tikr") === "1") { el.removeAttribute("aria-invalid"); el.removeAttribute("data-gp-tikr"); }
  }
  function privalomas(el) {
    if (el.required || el.getAttribute("aria-required") === "true") return true;
    var l = el.labels && el.labels[0];
    return !!(l && (/\*/.test(l.textContent) || l.querySelector(".req")));
  }
  function datosPastaba(el, k) {
    var v = String(el.value).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;   // date ir datetime-local
    var p = v.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2]);
    var W = window.GP_WORKDAYS, sav = SAV[k][d.getDay()], t = T[k];
    var tekstas = sav.charAt(0).toUpperCase() + sav.slice(1), rusis = "info";
    if (W && W.isHoliday && W.isHoliday(d)) { tekstas += t.svente; rusis = "ispejimas"; }
    else if (d.getDay() === 0 || d.getDay() === 6) { tekstas += t.poilsis; rusis = "ispejimas"; }
    if (W && W.isWorkday && W.siandien) {
      // darbo dienos: ateityje - (šiandien; data], praeityje - [data; šiandien)
      var s0 = W.siandien().split("-").map(Number), sd = new Date(s0[0], s0[1] - 1, s0[2]);
      if (d.getTime() === sd.getTime()) tekstas += " · " + t.siandien;
      else {
        var ateityje = d > sd, nuo = new Date(ateityje ? sd : d), iki = ateityje ? d : sd, n = 0;
        if (ateityje) nuo.setDate(nuo.getDate() + 1);
        for (var g = 0; g < 4000 && (ateityje ? nuo <= iki : nuo < iki); g++) { if (W.isWorkday(nuo)) n++; nuo.setDate(nuo.getDate() + 1); }
        if (n > 0) tekstas += " · " + (ateityje ? t.po : t.pries).replace("{n}", n).replace("{d}", dienos(n, ateityje ? "po" : "pries", k));
      }
    }
    return [tekstas, rusis];
  }
  function tikrink(el) {
    if (!el || !srityje(el) || el.disabled || el.readOnly) return;
    // modulis klaidą rodo pats (aria-invalid be mūsų žymės) - nesikišame
    if (el.getAttribute("aria-invalid") === "true" && el.getAttribute("data-gp-tikr") !== "1") { pranesk(el, null); return; }
    var k = kalba(), t = T[k], v = el.validity || {}, tipas = (el.getAttribute("type") || "").toLowerCase();
    if (tipas === "number") {
      if (v.badInput) return pranesk(el, t.sk, "klaida");
      if (v.rangeUnderflow) return pranesk(el, t.min.replace("{x}", el.min), "klaida");
      if (v.rangeOverflow) return pranesk(el, t.max.replace("{x}", el.max), "klaida");
      if (v.stepMismatch && el.getAttribute("step") === "1") return pranesk(el, t.sveikas, "klaida");
      /* „14.900,00“ naršyklė (anglų kalbos nustatymais) priima kaip 14.90000 - kablelį ir tarpą tyliai praleidžia, taškas lieka
         dešimtainis; „14.900“ - 14,9. Įspėjama, kai įvedant ar įklijuojant buvo kablelis ar tarpas, ir kai reikšmė atrodo kaip
         tūkstančiai su tašku (1-3 skaitmenys, taškas, 3 ir daugiau skaitmenų). Reikšmės nekeičiame - sprendžia žmogus. */
      var skyriklis = el.getAttribute("data-gp-skyriklis") === "1";
      el.removeAttribute("data-gp-skyriklis");
      if (el.value !== "" && (skyriklis || /^-?\d{1,3}\.\d{3,}$/.test(el.value))) return pranesk(el, t.skyr.replace("{v}", el.value), "ispejimas");
    }
    if (tipas === "email" && v.typeMismatch) return pranesk(el, t.pastas, "klaida");
    var tuscias = el.tagName === "SELECT" ? el.value === "" : !String(el.value).trim() && !v.badInput;
    if (tuscias && el.getAttribute("data-gp-paliestas") === "1" && privalomas(el)) return pranesk(el, t.priv, "klaida");
    if (tipas === "date" || tipas === "datetime-local") { var dp = datosPastaba(el, k); if (dp && el.getAttribute("data-gp-paliestas") === "1") return pranesk(el, dp[0], dp[1]); }
    pranesk(el, null);
  }
  function laukas(e) { var el = e.target; return el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && srityje(el) ? el : null; }
  document.addEventListener("input", function (e) {
    var el = laukas(e); if (!el) return;
    el.setAttribute("data-gp-paliestas", "1");
    if (el.getAttribute("data-gp-tikr-id")) tikrink(el);   // rodoma klaida dingsta, vos pataisius
  }, true);
  document.addEventListener("change", function (e) {
    var el = laukas(e); if (!el) return;
    el.setAttribute("data-gp-paliestas", "1");
    if (el.tagName === "SELECT" || /^(date|datetime-local)$/.test((el.getAttribute("type") || "").toLowerCase())) tikrink(el);
  }, true);
  document.addEventListener("focusout", function (e) { var el = laukas(e); if (el) tikrink(el); }, true);
  // Skaičiaus lauke kablelis ar tarpas (įvestas ar įklijuotas) - naršyklė jį praleidžia, todėl įsimenama
  function skaiciausLaukas(e) { var el = laukas(e); return el && (el.getAttribute("type") || "").toLowerCase() === "number" ? el : null; }
  document.addEventListener("keydown", function (e) { var el = skaiciausLaukas(e); if (el && (e.key === "," || e.key === " ")) el.setAttribute("data-gp-skyriklis", "1"); }, true);
  document.addEventListener("paste", function (e) {
    var el = skaiciausLaukas(e), tx = el && e.clipboardData && e.clipboardData.getData("text");
    if (tx && /[,\s]|\d\.\d{3}\b/.test(tx.trim())) el.setAttribute("data-gp-skyriklis", "1");
  }, true);

  window.GP_LAUKU_BUSENA = { sutvarkyk: sutvarkyk, tikrink: tikrink, dienos: dienos };
})();
