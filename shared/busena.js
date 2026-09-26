/* ============================================================================
 * G-Procure  shared/busena.js   (window.GP_BUSENA)
 * ----------------------------------------------------------------------------
 * Vienodos veiksmų būsenos VISIEMS moduliams (tobulinimo planas Q3, 2026-09-26):
 *
 *   eiga      - ilgas veiksmas vyksta (Word generavimas, failų skaitymas)
 *   ai        - AI analizuoja: laikmatis ir „Atšaukti“ (kai veiksmas priima signalą)
 *   gerai     - pavyko (išsaugota, sugeneruota)
 *   klaida    - nepavyko: žmogui suprantama priežastis ir „Bandyti dar kartą“
 *   tuscia    - duomenys įkelti, bet jų tikrai nėra
 *   nezinoma  - įkelti NEPAVYKO: duomenų būsena nežinoma
 *
 * KERTINĖ TAISYKLĖ (kaip PP-teise): nepavykęs įkėlimas NIEKADA neatrodo kaip
 * „duomenų nėra“ - tam atskiros būsenos `tuscia` ir `nezinoma`.
 *
 * Naudojimas:
 *   <script src="../shared/busena.js"></script>
 *   GP_BUSENA.rodyk('#vieta', { tipas: 'gerai', tekstas: 'Išsaugota naršyklėje.' });
 *   const rez = await GP_BUSENA.vykdyk('#vieta', {
 *     tipas: 'ai', tekstas: 'AI analizuoja dokumentą', atsaukiama: true,
 *     sekme: 'Paruošta - peržiūrėkite pasiūlymus.',
 *     kartoti: () => mygtukoFunkcija(),                        // „Bandyti dar kartą“ - visas modulio srautas
 *     veiksmas: signal => GP_AI_PROXY.call({ ..., signal })   // grąžina rezultatą arba meta klaidą
 *   });
 *   // rez: { ok: true, reiksme } | { ok: false, atsaukta: true } | { ok: false, klaida }
 *   GP_BUSENA.slepk('#vieta');
 *
 * Eiga procentais (kai etapai žinomi, pvz. PP-ts generavimas): { procentai: 10 } parodo
 * ploną juostą, o veiksmas(signal, h) ją stumia h.eiga(60, '2/3: Generuojami skyriai').
 *
 * Vieta - elementas arba selektorius; komponentas jį pats paverčia gyva sritimi
 * (role="status", klaidai - role="alert"), tad ekrano skaitytuvas praneša pokytį.
 * Stilius įdedamas vieną kartą ir naudoja shared/epso-g.css žetonus; tekstas visur
 * grafito spalvos (>= 4,5:1 ant visų fonų), spalva - tik rėmelis ir ikona.
 * Nieko nesaugo ir nesiunčia.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var STILIUS_ID = "gpb-stilius";
  var UI = {
    lt: { atsaukti: "Atšaukti", kartoti: "Bandyti dar kartą", atsaukta: "Atšaukta - niekas nepakeista.",
          klaida: "Nepavyko", sek: "s", nezinoma: "Nepavyko įkelti - duomenų būsena nežinoma.",
          rysys: "Nėra ryšio su serveriu. Patikrinkite interneto ryšį ir bandykite dar kartą.",
          issaugota: "Išsaugota šioje naršyklėje", eiga: "Eiga" },
    en: { atsaukti: "Cancel", kartoti: "Try again", atsaukta: "Cancelled - nothing was changed.",
          klaida: "Failed", sek: "s", nezinoma: "Could not load - data status unknown.",
          rysys: "No connection to the server. Check your internet connection and try again.",
          issaugota: "Saved in this browser", eiga: "Progress" }
  };
  function kalba() {
    var l = (document.documentElement.getAttribute("lang") || "lt").slice(0, 2).toLowerCase();
    return UI[l] ? l : "lt";
  }
  function ui() { return UI[kalba()]; }

  function stilius() {
    if (document.getElementById(STILIUS_ID)) return;
    var css = [
      ".gpb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:var(--font-base,inherit);font-size:13px;line-height:1.45;",
      "color:var(--color-graphite,#2E3641);background:var(--color-graphite-5,#EFF1F1);border:1px solid var(--color-graphite-15,#E1E2E4);",
      "border-left:4px solid var(--color-graphite-30,#C7CDD3);border-radius:var(--radius-sm,8px);padding:8px 12px;margin:8px 0}",
      ".gpb[hidden]{display:none}",
      ".gpb-tx{flex:1 1 200px;min-width:0;overflow-wrap:anywhere}",
      ".gpb-tx b{font-weight:800}",
      ".gpb-laikas{font-variant-numeric:tabular-nums;color:#5B6470;font-size:12px}",
      ".gpb-ic{width:16px;height:16px;flex-shrink:0;display:inline-flex}",
      ".gpb-ic svg{width:16px;height:16px}",
      ".gpb-sukas{width:14px;height:14px;border-radius:50%;border:2px solid var(--color-graphite-30,#C7CDD3);",
      "border-top-color:var(--color-emerald-strong,#007554);animation:gpbSuk .8s linear infinite}",
      "@keyframes gpbSuk{to{transform:rotate(360deg)}}",
      "@media (prefers-reduced-motion:reduce){.gpb-sukas{animation:none;border-top-color:var(--color-graphite-30,#C7CDD3)}}",
      ".gpb-btn{font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;border-radius:999px;padding:3px 12px;",
      "background:var(--color-white,#fff);color:var(--color-graphite,#2E3641);border:1px solid var(--color-graphite-30,#C7CDD3)}",
      ".gpb-btn:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpb-btn:focus-visible{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpb--ai,.gpb--eiga{border-left-color:var(--color-emerald,#00A072)}",
      ".gpb--gerai{background:var(--color-green-5,#EFF9F1);border-color:var(--color-green-15,#D7EEDB);border-left-color:var(--color-emerald,#00A072)}",
      ".gpb--gerai .gpb-ic{color:var(--color-emerald-strong,#007554)}",
      ".gpb--klaida{background:var(--color-error-5,#FBEBEE);border-color:#F2C5CD;border-left-color:var(--color-error,#DB354A)}",
      ".gpb--klaida .gpb-ic{color:#A3192C}",
      ".gpb--nezinoma{background:var(--color-warning-5,#FEF6E8);border-color:#F3D9A8;border-left-color:var(--color-warning,#FAB03B)}",
      ".gpb--tuscia{background:var(--color-white,#fff)}",
      ".gpb-eiga{flex:1 1 100%;order:10;height:4px;border-radius:2px;background:var(--color-graphite-15,#E1E2E4);overflow:hidden}",
      ".gpb-eiga-j{display:block;height:100%;width:0;background:var(--color-emerald-strong,#007554);transition:width .3s ease}",
      "@media (prefers-reduced-motion:reduce){.gpb-eiga-j{transition:none}}"
    ].join("");
    var el = document.createElement("style");
    el.id = STILIUS_ID; el.textContent = css;
    document.head.appendChild(el);
  }

  var IKONOS = {
    gerai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    klaida: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>',
    nezinoma: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    tuscia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function vieta(v) { return typeof v === "string" ? document.querySelector(v) : v; }

  /* Klaidos priežastis žmogui. GP_AI_PROXY klaidas jau išverčia (413, 429, 5xx);
     čia - tai, kas lieka: nutrauktas ryšys ir techniniai pranešimai. */
  function klaidosTekstas(e) {
    var t = String((e && (e.message || e.error)) || e || "").trim();
    if (!t || /failed to fetch|networkerror|load failed|network request failed/i.test(t)) return ui().rysys;
    return t;
  }
  function arAtsaukta(e, signal) {
    return !!((signal && signal.aborted) || (e && /abort/i.test(String(e.name) + " " + String(e.message || e.error || ""))));
  }

  /* Būsenos atvaizdavimas. Grąžina valdiklį: { el, atnaujink(tekstas), eiga(procentai, tekstas), slepk() }.
     Kiekvienas rodyk / slepk padidina vietos kartą (kartai): baigęsis senas veiksmas
     neperrašo to, ką toje vietoje jau parodė naujesnis (pvz. naujas failas nutraukė seną analizę). */
  var laikmaciai = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var kartai = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function naujasKartas(el) { if (!kartai) return 0; var k = (kartai.get(el) || 0) + 1; kartai.set(el, k); return k; }
  function kartas(el) { return kartai ? (kartai.get(el) || 0) : 0; }
  function rodyk(v, o) {
    var el = vieta(v);
    if (!el) return null;
    stilius();
    naujasKartas(el);
    o = o || {};
    var tipas = o.tipas || "eiga";
    var sen = laikmaciai && laikmaciai.get(el);
    if (sen) { clearInterval(sen); laikmaciai.delete(el); }
    el.hidden = false;
    el.className = (el.className.replace(/\bgpb(--\w+)?\b/g, "").trim() + " gpb gpb--" + tipas).trim();
    el.setAttribute("role", tipas === "klaida" ? "alert" : "status");
    el.setAttribute("aria-live", tipas === "klaida" ? "assertive" : "polite");
    var ic = (tipas === "eiga" || tipas === "ai") ? '<span class="gpb-ic"><span class="gpb-sukas"></span></span>'
      : '<span class="gpb-ic">' + (IKONOS[tipas] || IKONOS.tuscia) + '</span>';
    var tekstas = o.html ? o.tekstas : esc(o.tekstas || (tipas === "nezinoma" ? ui().nezinoma : ""));
    el.innerHTML = ic + '<span class="gpb-tx">' + tekstas + '</span>' +
      (o.laikmatis || tipas === "ai" ? '<span class="gpb-laikas" data-gpb-laikas></span>' : "") +
      (o.atsaukti ? '<button type="button" class="gpb-btn" data-gpb-atsaukti>' + esc(o.atsauktiTekstas || ui().atsaukti) + '</button>' : "") +
      (o.kartoti ? '<button type="button" class="gpb-btn" data-gpb-kartoti>' + esc(o.kartotiTekstas || ui().kartoti) + '</button>' : "") +
      (o.mygtukai || []).map(function (m, i) { return '<button type="button" class="gpb-btn" data-gpb-mygtukas="' + i + '">' + esc(m.tekstas) + '</button>'; }).join("") +
      (typeof o.procentai === "number" ? juostele(o.procentai) : "");
    var b = el.querySelector("[data-gpb-atsaukti]");
    if (b) b.addEventListener("click", function () { b.disabled = true; o.atsaukti(); });
    var k = el.querySelector("[data-gpb-kartoti]");
    if (k) k.addEventListener("click", function () { o.kartoti(); });
    (o.mygtukai || []).forEach(function (m, i) {         // papildomi veiksmai: [{ tekstas, veiksmas }]
      var mb = el.querySelector('[data-gpb-mygtukas="' + i + '"]');
      if (mb) mb.addEventListener("click", function () { m.veiksmas(); });
    });
    var laikas = el.querySelector("[data-gpb-laikas]");
    if (laikas) {
      var pradzia = Date.now();
      var tik = function () { laikas.textContent = Math.round((Date.now() - pradzia) / 1000) + " " + ui().sek; };
      tik();
      var id = setInterval(function () { if (!el.isConnected) { clearInterval(id); return; } tik(); }, 1000);
      if (laikmaciai) laikmaciai.set(el, id);
    }
    /* Valdiklis galioja, kol vietoje ta pati būsena: pavėlavęs senojo veiksmo etapas
       neperrašo „Atšaukta“ ar naujesnio veiksmo teksto. */
    var mano = kartas(el), galioja = function () { return kartas(el) === mano; };
    var atnaujink = function (t) { if (!galioja()) return; var x = el.querySelector(".gpb-tx"); if (x) x.textContent = t; };
    return {
      el: el,
      atnaujink: atnaujink,
      eiga: function (pct, t) {
        if (!galioja()) return;
        var j = el.querySelector("[data-gpb-eiga]");
        if (!j) { el.insertAdjacentHTML("beforeend", juostele(pct)); j = el.querySelector("[data-gpb-eiga]"); }
        var n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
        j.setAttribute("aria-valuenow", String(n));
        j.firstChild.style.width = n + "%";
        if (t != null) atnaujink(t);
      },
      slepk: function () { slepk(el); }
    };
  }
  function juostele(pct) {
    var n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    return '<span class="gpb-eiga" data-gpb-eiga role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + n +
      '" aria-label="' + esc(ui().eiga) + '"><span class="gpb-eiga-j" style="width:' + n + '%"></span></span>';
  }

  function slepk(v) {
    var el = vieta(v);
    if (!el) return;
    naujasKartas(el);
    var sen = laikmaciai && laikmaciai.get(el);
    if (sen) { clearInterval(sen); laikmaciai.delete(el); }
    el.hidden = true;
    el.innerHTML = "";
  }

  /* Ilgas veiksmas su vienoda eiga. veiksmas(signal) grąžina rezultatą arba Promise;
     GP_AI_PROXY atsakymo forma ({ ok:false, error }) laikoma klaida. Klaidos atveju
     rodoma priežastis ir (jei nurodyta) „Bandyti dar kartą“; atšaukus - „niekas
     nepakeista“. Veiksmo rezultatą taiko modulis PATS, gavęs { ok: true }. */
  /* o.valdiklis - modulio AbortController (kad naujas veiksmas galėtų nutraukti seną);
     veiksmas(signal, h) gauna ir būsenos valdiklį h (h.atnaujink(tekstas) - kitas etapas). */
  function vykdyk(v, o) {
    o = o || {};
    var valdiklis = o.valdiklis || (typeof AbortController !== "undefined" && o.atsaukiama ? new AbortController() : null);
    var signal = valdiklis ? valdiklis.signal : undefined;
    var h = rodyk(v, { tipas: o.tipas || "eiga", tekstas: o.tekstas || "", html: o.html, procentai: o.procentai,
               laikmatis: o.laikmatis, atsaukti: valdiklis ? function () { valdiklis.abort(); } : null });
    var el = vieta(v), manoKartas = el ? kartas(el) : 0;
    var dar = function () { return el && kartas(el) === manoKartas; };   // vieta vis dar šio veiksmo
    /* „Bandyti dar kartą“: modulio funkcija (visas jo srautas su rezultato taikymu) arba
       true - pakartoti tą patį veiksmą, kai jis pats viską pritaiko. Be jo mygtuko nėra:
       pakartojus tik veiksmą, rezultatas niekur nepatektų. */
    var kartoti = typeof o.kartoti === "function" ? o.kartoti
      : (o.kartoti === true ? function () { return vykdyk(v, Object.assign({}, o, { valdiklis: null })); } : null);
    return Promise.resolve().then(function () { return o.veiksmas(signal, h); }).then(function (r) {
      if (r && r.ok === false && r.error) throw new Error(r.error);
      if (signal && signal.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
      if (dar()) {
        if (o.sekme) rodyk(v, { tipas: "gerai", tekstas: typeof o.sekme === "function" ? o.sekme(r) : o.sekme });
        else slepk(v);
      }
      return { ok: true, reiksme: r };
    }).catch(function (e) {
      if (arAtsaukta(e, signal)) {
        if (dar()) rodyk(v, { tipas: "tuscia", tekstas: o.atsauktaTekstas || ui().atsaukta });
        return { ok: false, atsaukta: true };
      }
      var t = (o.klaidosPriesdelis || ui().klaida) + ": " + klaidosTekstas(e);
      if (dar()) rodyk(v, { tipas: "klaida", tekstas: t, kartoti: kartoti });
      return { ok: false, klaida: e };
    });
  }

  /* Puslapio lygio būsena (pvz. nepavykęs išsaugotų duomenų skaitymas): juosta iškart po
     modulio antrašte (ir po skirtukų juosta, jei ji eina tiesiai po antraštės). Kiekvienas
     šaltinis turi savo eilutę (o.raktas) - pakartotinis kvietimas ją pakeičia.
     Dvikalbiams moduliams tekstas (ir mygtukų tekstai) gali būti funkcija: pakeitus <html lang>
     juosta perpiešiama nauja kalba (anksčiau likdavo ta, kuria parodyta). */
  var juostuStebetojas = null;
  function perpieskJuostas() {
    var dez = document.getElementById("gpb-juostos");
    if (!dez) return;
    for (var i = 0; i < dez.children.length; i++) {
      var el = dez.children[i];
      if (el._gpbO && !el.hidden) rodyk(el, isspresk(el._gpbO));
    }
  }
  function isspresk(o) {
    var f = function (x) { return typeof x === "function" ? x() : x; };
    return Object.assign({}, o, {
      tekstas: f(o.tekstas),
      mygtukai: (o.mygtukai || []).map(function (m) { return Object.assign({}, m, { tekstas: f(m.tekstas) }); })
    });
  }
  function juosta(o) {
    o = o || {};
    var dez = document.getElementById("gpb-juostos");
    if (!dez) {
      dez = document.createElement("div");
      dez.id = "gpb-juostos";
      dez.style.cssText = "max-width:1200px;margin:8px auto 0;padding:0 16px;box-sizing:border-box";
      var po = document.querySelector(".app-header");
      var sek = po && po.nextElementSibling;
      if (sek && sek.matches && sek.matches(".tabbar,.app-tabs,nav[role=tablist]")) po = sek;
      if (po && po.parentNode) po.parentNode.insertBefore(dez, po.nextSibling);
      else document.body.insertBefore(dez, document.body.firstChild);
    }
    var raktas = String(o.raktas || "bendra");
    var el = null;
    for (var i = 0; i < dez.children.length; i++) if (dez.children[i].getAttribute("data-gpb-raktas") === raktas) el = dez.children[i];
    if (!el) { el = document.createElement("div"); el.setAttribute("data-gpb-raktas", raktas); dez.appendChild(el); }
    el._gpbO = o;
    if (!juostuStebetojas && typeof MutationObserver !== "undefined") {
      juostuStebetojas = new MutationObserver(perpieskJuostas);
      juostuStebetojas.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    return rodyk(el, isspresk(o));
  }
  function juostaSlepk(raktas) {
    var dez = document.getElementById("gpb-juostos");
    if (!dez) return;
    for (var i = dez.children.length - 1; i >= 0; i--) {
      if (dez.children[i].getAttribute("data-gpb-raktas") === String(raktas || "bendra")) dez.removeChild(dez.children[i]);
    }
  }

  /* „Išsaugota šioje naršyklėje · 14:32“ - moduliams, kurie saugo localStorage. */
  function issaugota(v, tekstas) {
    var d = new Date();
    var laikas = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    return rodyk(v, { tipas: "gerai", tekstas: (tekstas || ui().issaugota) + " · " + laikas });
  }

  global.GP_BUSENA = {
    rodyk: rodyk,
    slepk: slepk,
    vykdyk: vykdyk,
    issaugota: issaugota,
    juosta: juosta,
    juostaSlepk: juostaSlepk,
    klaidosTekstas: klaidosTekstas,
    arAtsaukta: arAtsaukta,
    UI: UI
  };
})(typeof window !== "undefined" ? window : this);
