/* ============================================================================
 * G-Procure  shared/mano-pirkimai.js   (window.GP_MANO_PIRKIMAI)
 * ----------------------------------------------------------------------------
 * Darbo stalas „Mano pirkimai“ portale (tobulinimo planas U1, 2026-09-26).
 * Aktyvios pirkimų kortelės ŠIOJE naršyklėje (shared/pirkimo-kortele.js):
 * artimiausias terminas darbo dienomis (shared/workdays.js), kitas žingsnis
 * pagal kortelės būseną ir įrankiai, atveriami jau su pasirinktu pirkimu
 * (?kortele=<id> - modulio juosta ją pasirenka ir užpildo tuščius laukus).
 *
 * TAISYKLĖS:
 *  - Be kortelių blokas nerodomas: portalas naujam naudotojui lieka toks pat.
 *  - Neperskaitoma saugykla NIEKADA nevirsta „pirkimų nėra“ - blokas rodomas su
 *    priežastimi (GP_SAUGYKLA.pranesimas).
 *  - Kitas žingsnis - tik iš kortelės duomenų (būsena, trūkstami laukai): įrankiai
 *    nežino, kas jau padaryta, todėl nieko nežadame.
 *  - Užbaigti (sudaryta sutartis, nutrauktas) ir archyvuoti nerodomi - tik jų skaičius.
 *  - Tekstai LT / EN pagal <html lang>; kortelių turinys - kaip įvestas.
 * Nieko nesaugo ir nesiunčia (tik skaito korteles).
 * ==========================================================================*/
(function (global) {
  "use strict";

  var T = {
    lt: {
      kortelesPav: "Pirkimų kortelės", pradzia: "Pirkimo pradžia", paskelbimas: "Paskelbimas", pasiulymuTerminas: "Pasiūlymų terminas",
      siandien: "šiandien", po: "po", dd: "d. d.", praejo: "praėjo", beTerminu: "Terminų kortelėje nėra",
      trukstaPrad: "Papildykite kortelę: trūksta ", zingsnis: "Kitas žingsnis: ",
      planuojamas: "pirkimo grafikas", rengiamas: "pirkimo dokumentai (kvalifikacija, sąlygos, TS)",
      paskelbtas: "laukiama pasiūlymų", vertinamas: "pasiūlymų vertinimas ir komisijos sprendimai",
      grafikas: "Grafikas", kvalifikacija: "Kvalifikacija", kortele: "Kortelė",
      naujasSkirtukas: "atsidaro naujame skirtuke", daugiau: "Rodyti visus", baigti: "Užbaigti ar archyvuoti: ",
      visosKorteles: "visos kortelės", aktyviuNera: "Aktyvių pirkimų nėra.", CVP: "CVP IS "
    },
    en: {
      kortelesPav: "Procurement cards", pradzia: "Procurement start", paskelbimas: "Publication", pasiulymuTerminas: "Tender deadline",
      siandien: "today", po: "in", dd: "working days", praejo: "passed", beTerminu: "No dates on the card",
      trukstaPrad: "Complete the card: missing ", zingsnis: "Next step: ",
      planuojamas: "procurement schedule", rengiamas: "procurement documents (qualification, conditions, specification)",
      paskelbtas: "waiting for tenders", vertinamas: "tender evaluation and committee decisions",
      grafikas: "Schedule", kvalifikacija: "Qualification", kortele: "Card",
      naujasSkirtukas: "opens in a new tab", daugiau: "Show all", baigti: "Completed or archived: ",
      visosKorteles: "all cards", aktyviuNera: "No active procurements.", CVP: "CVP IS "
    }
  };
  /* Įrankiai, kurie skaito kortelę (A1). Kelias - nuo svetainės šaknies. */
  var IRANKIAI = [
    { raktas: "grafikas", kelias: "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html", busenos: ["planuojamas", "rengiamas"] },
    { raktas: "kvalifikacija", kelias: "PP-qual/PP-QUAL.html", busenos: ["rengiamas"] }
  ];
  var BAIGTOS = { sutartis: 1, nutrauktas: 1 };
  /* „Trūksta ...“ - kilmininkas (LT), be jo „trūksta vertė“. */
  var TRUKSTA = { lt: { verte: "vertės", budas: "būdo", vykdytojas: "vykdytojo", rezimas: "režimo" },
                  en: { verte: "value", budas: "procedure", vykdytojas: "contracting body", rezimas: "legal regime" } };
  var TERMINAI = ["pasiulymuTerminas", "paskelbimas", "pradzia"];

  function kalba(o) {
    var l = o && o.getLang ? o.getLang() : (document.documentElement.getAttribute("lang") || "lt");
    return /^en/i.test(l) ? "en" : "lt";
  }
  function dienos(isoData) { var p = String(isoData).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  /* Darbo dienos nuo šiandien (neįskaitant) iki datos (įskaitant); 0 - šiandien. */
  function darboDienos(nuo, iki) {
    var a = new Date(nuo.getFullYear(), nuo.getMonth(), nuo.getDate()), b = new Date(iki.getFullYear(), iki.getMonth(), iki.getDate());
    var n = 0, W = global.GP_WORKDAYS;
    for (var d = new Date(a); d < b; ) { d.setDate(d.getDate() + 1); if (!W || W.isWorkday(d)) n++; }
    return n;
  }
  /* Artimiausias būsimas terminas; jei visi praėję - vėliausias; jei nėra - null. */
  function terminas(k, dabar) {
    var siandien = new Date(dabar.getFullYear(), dabar.getMonth(), dabar.getDate()), buvusiu = [], busimu = [];
    TERMINAI.forEach(function (f) {
      if (!k[f]) return;
      var d = dienos(k[f]);
      if (isNaN(d.getTime())) return;
      (d < siandien ? buvusiu : busimu).push({ laukas: f, data: d, tekstas: String(k[f]).replace("T", " ") });
    });
    busimu.sort(function (a, b) { return a.data - b.data; });
    buvusiu.sort(function (a, b) { return b.data - a.data; });
    if (busimu.length) { var x = busimu[0]; x.dd = darboDienos(siandien, x.data); return x; }
    if (buvusiu.length) { var y = buvusiu[0]; y.praejo = true; return y; }
    return null;
  }

  var STILIUS_ID = "gpmp-stilius";
  function stilius() {
    if (document.getElementById(STILIUS_ID)) return;
    var css = [
      ".gpmp{display:grid;gap:10px;font-family:var(--font-base,inherit);color:var(--color-graphite,#2E3641)}",
      ".gpmp-eil{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) minmax(0,1.4fr) auto;gap:10px 18px;align-items:center;",
      "background:var(--color-white,#fff);border:1px solid var(--color-graphite-15,#E1E2E4);border-left:4px solid var(--color-emerald,#00A072);border-radius:12px;padding:14px 18px}",
      ".gpmp-pav{font-size:16px;font-weight:800;color:var(--color-graphite,#2E3641);text-decoration:none;overflow-wrap:anywhere}",
      ".gpmp-pav:hover{text-decoration:underline}",
      ".gpmp-mazas{display:block;font-size:13px;color:#5B6470;margin-top:2px;overflow-wrap:anywhere}",
      ".gpmp-et{display:block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5B6470}",
      ".gpmp-data{display:block;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}",
      ".gpmp-liko{display:block;font-size:13px;color:#5B6470;white-space:nowrap}",
      ".gpmp-liko--greit{color:#8A4B00;font-weight:700}",
      ".gpmp-busena{display:inline-block;font-size:12px;font-weight:800;padding:2px 10px;border-radius:999px;background:var(--color-green-5,#EFF9F1);border:1px solid var(--color-green-15,#D7EEDB);margin-bottom:4px}",
      ".gpmp-zingsnis{font-size:13.5px}",
      ".gpmp-veiksmai{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}",
      ".gpmp-btn{font-size:13px;font-weight:700;text-decoration:none;border-radius:999px;padding:6px 12px;border:1px solid var(--color-graphite-30,#C7CDD3);",
      "color:var(--color-graphite,#2E3641);background:var(--color-white,#fff);white-space:nowrap}",
      ".gpmp-btn:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpmp-btn--pagr{background:var(--color-emerald-strong,#007554);border-color:var(--color-emerald-strong,#007554);color:#fff}",
      ".gpmp-btn--pagr:hover{background:var(--color-emerald-strong-hover,#006649)}",
      ".gpmp a:focus-visible,.gpmp button:focus-visible{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpmp-apacia{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:13.5px;color:#5B6470}",
      ".gpmp-apacia button{font:inherit;font-weight:700;background:none;border:0;padding:0;color:var(--color-emerald-strong,#007554);text-decoration:underline;cursor:pointer}",
      ".gpmp-isp{background:var(--color-warning-5,#FEF6E8);border:1px solid #F3D9A8;border-left:4px solid var(--color-warning,#FAB03B);border-radius:12px;padding:12px 16px;font-size:14px}",
      "@media (max-width:900px){.gpmp-eil{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.gpmp-veiksmai{grid-column:1 / -1;justify-content:flex-start}}",
      "@media (max-width:560px){.gpmp-eil{grid-template-columns:minmax(0,1fr)}}"
    ].join("");
    var el = document.createElement("style");
    el.id = STILIUS_ID; el.textContent = css;
    document.head.appendChild(el);
  }

  function el(zyme, klase, tekstas) {
    var e = document.createElement(zyme);
    if (klase) e.className = klase;
    if (tekstas != null) e.textContent = tekstas;
    return e;
  }

  function mount(o) {
    o = o || {};
    var vieta = typeof o.target === "string" ? document.querySelector(o.target) : o.target;
    var sekcija = typeof o.sekcija === "string" ? document.querySelector(o.sekcija) : o.sekcija;
    if (!vieta || !global.GP_KORTELE) return null;
    stilius();
    var saknis = o.saknis == null ? "" : String(o.saknis);
    var visi = false;

    function piesk() {
      var l = kalba(o), t = T[l], K = global.GP_KORTELE;
      var dabar = o.dabar ? new Date(o.dabar) : new Date();
      var s = K.skaityk();
      vieta.innerHTML = "";
      var box = el("div", "gpmp");
      vieta.appendChild(box);
      if (s.busena === "sugadinta" || s.busena === "neprieinama") {
        box.appendChild(el("div", "gpmp-isp", global.GP_SAUGYKLA ? global.GP_SAUGYKLA.pranesimas(s.r, t.kortelesPav) : ""));
        if (sekcija) sekcija.hidden = false;
        return;
      }
      var neArch = s.korteles.filter(function (k) { return !k.archyvuota; });
      if (!neArch.length) { if (sekcija) sekcija.hidden = true; return; }
      if (sekcija) sekcija.hidden = false;
      var aktyvios = neArch.filter(function (k) { return !BAIGTOS[k.busena]; }).map(function (k) { return { k: k, t: terminas(k, dabar) }; });
      var kitos = s.korteles.length - aktyvios.length;
      aktyvios.sort(function (a, b) {
        var ab = a.t && !a.t.praejo, bb = b.t && !b.t.praejo;
        if (ab && bb) return a.t.data - b.t.data;
        if (ab !== bb) return ab ? -1 : 1;
        return a.k.atnaujinta < b.k.atnaujinta ? 1 : a.k.atnaujinta > b.k.atnaujinta ? -1 : 0;
      });
      if (!aktyvios.length) box.appendChild(el("p", "gpmp-apacia", t.aktyviuNera));
      var max = o.max || 5;
      aktyvios.slice(0, visi ? aktyvios.length : max).forEach(function (x) { box.appendChild(eilute(x.k, x.t, t, l)); });
      var ap = el("div", "gpmp-apacia");
      if (aktyvios.length > max && !visi) {
        var b = el("button", null, t.daugiau + " (" + aktyvios.length + ")");
        b.type = "button";
        b.addEventListener("click", function () { visi = true; piesk(); });
        ap.appendChild(b);
      }
      if (kitos > 0) {
        ap.appendChild(el("span", null, t.baigti + kitos + " ·"));
        var a = el("a", null, t.visosKorteles);
        a.href = saknis + "pirkimu-korteles.html";
        a.style.color = "var(--color-emerald-strong,#007554)"; a.style.fontWeight = "700";
        ap.appendChild(a);
      }
      if (ap.childNodes.length) box.appendChild(ap);
    }

    function eilute(k, trm, t, l) {
      var K = global.GP_KORTELE, id = encodeURIComponent(k.id);
      var r = el("article", "gpmp-eil");
      r.setAttribute("aria-label", k.pavadinimas || "?");
      // 1. Pavadinimas, numeriai, santrauka
      var a = el("div");
      var pav = el("a", "gpmp-pav", k.pavadinimas || "?");
      pav.href = saknis + "pirkimu-korteles.html#kortele=" + id;
      a.appendChild(pav);
      var nr = [k.numeris, k.cvpisNr ? t.CVP + k.cvpisNr : ""].filter(Boolean).join(" · ");
      if (nr) a.appendChild(el("span", "gpmp-mazas", nr));
      var sant = K.santrauka(k, l);
      if (sant) a.appendChild(el("span", "gpmp-mazas", sant));
      r.appendChild(a);
      // 2. Artimiausias terminas
      var b = el("div");
      if (trm) {
        b.appendChild(el("span", "gpmp-et", t[trm.laukas]));
        b.appendChild(el("span", "gpmp-data", trm.tekstas));
        var liko = trm.praejo ? t.praejo : trm.dd === 0 ? t.siandien : t.po + " " + trm.dd + " " + t.dd;
        b.appendChild(el("span", "gpmp-liko" + (!trm.praejo && trm.dd <= 5 ? " gpmp-liko--greit" : ""), liko));
      } else b.appendChild(el("span", "gpmp-mazas", t.beTerminu));
      r.appendChild(b);
      // 3. Būsena ir kitas žingsnis (tik iš kortelės duomenų)
      var c = el("div");
      c.appendChild(el("span", "gpmp-busena", K.busenosPav(k.busena, l) || k.busena));
      var truksta = ["verte", "budas", "vykdytojas", "rezimas"].filter(function (f) { return k[f] === null || k[f] === undefined || k[f] === ""; });
      var zingsnis = truksta.length ? t.trukstaPrad + truksta.map(function (f) { return TRUKSTA[l][f]; }).join(", ") + "."
        : (t[k.busena] ? t.zingsnis + t[k.busena] + "." : "");
      if (zingsnis) c.appendChild(el("div", "gpmp-zingsnis", zingsnis));
      r.appendChild(c);
      // 4. Įrankiai su pasirinktu pirkimu
      var d = el("div", "gpmp-veiksmai");
      IRANKIAI.forEach(function (x) {
        var btn = el("a", "gpmp-btn" + (!truksta.length && x.busenos.indexOf(k.busena) === 0 ? " gpmp-btn--pagr" : ""), t[x.raktas]);
        btn.href = saknis + x.kelias + "?kortele=" + id;
        btn.target = "_blank"; btn.rel = "noopener";
        btn.setAttribute("aria-label", t[x.raktas] + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
        d.appendChild(btn);
      });
      var kort = el("a", "gpmp-btn" + (truksta.length ? " gpmp-btn--pagr" : ""), t.kortele);
      kort.href = saknis + "pirkimu-korteles.html#kortele=" + id;
      kort.setAttribute("aria-label", t.kortele + ": " + (k.pavadinimas || "?"));
      d.appendChild(kort);
      r.appendChild(d);
      return r;
    }

    piesk();
    global.addEventListener("storage", function (e) { if (e.key === global.GP_KORTELE.RAKTAS) piesk(); });
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(piesk).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    return { atnaujink: piesk };
  }

  global.GP_MANO_PIRKIMAI = { mount: mount, terminas: terminas, darboDienos: darboDienos };
})(typeof window !== "undefined" ? window : this);
