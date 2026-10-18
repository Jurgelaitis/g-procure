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
 *  - CVP IS patikra (2026-10-18): TIK paspaudus „Patikrinti CVP IS duomenis“ aktyvių kortelių CVP IS numeriai siunčiami
 *    per shared/vpt-duomenys.js (G-Procure serveris, vieši VPT duomenys); prie kortelės - pasiūlymų termino, paskelbimo datos
 *    ir būsenos skirtumai (GP_VPT.skirtumai) ir „Atnaujinti kortelę“ (kortelių puslapis ?vpt=1). Kortelės nekeičiamos,
 *    rezultatai - tik atmintyje; ryšio klaida niekada nevirsta „sutampa“ ar „nėra“ (shared/busena.js).
 * Nieko nesaugo.
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
      ts: "TS", salygos: "Sąlygos", protokolai: "Protokolai", pazyma: "Pažyma", derybos: "Derybos", vertinimas: "Vertinimas", parengtis: "Parengtis skelbti",
      kna: "Kaštų ir naudos analizė", vertinamasMV: "pasiūlymų vertinimas ir pažyma",
      naujasSkirtukas: "atsidaro naujame skirtuke", daugiau: "Rodyti visus", baigti: "Užbaigti ar archyvuoti: ",
      visosKorteles: "visos kortelės", aktyviuNera: "Aktyvių pirkimų nėra.", CVP: "CVP IS ",
      cvpTikrinti: "Patikrinti CVP IS duomenis",
      cvpPag: "Į G-Procure serverį siunčiami tik šių kortelių CVP IS numeriai ({n}); jis atsako iš viešų VPT duomenų, atnaujinamų kas 6 val. Kortelės nekeičiamos.",
      cvpEiga: "Tikrinami CVP IS duomenys ({n})...", cvpNepavyko: "CVP IS duomenų patikrinti nepavyko",
      cvpRysys: "G-Procure serveris neatsakė arba VPT sąrašas dar neįkeltas - bandykite vėliau.",
      cvpSuvestine: "Patikrinta kortelių: {n} (VPT sąrašas atnaujintas {t}). Skiriasi nuo CVP IS: {p}, sutampa: {s}",
      cvpNeraS: ", VPT sąraše nėra: {m}", cvpKlaidaS: ", patikrinti nepavyko: {k}",
      cvpRiba: " Vienu kartu tikrinama {r} kortelių su artimiausiais terminais.",
      cvpTerminas: "CVP IS pasiūlymų terminas: {v}", cvpPaskelbimas: "CVP IS paskelbimo data: {v}", cvpBusena: "CVP IS būsena: {v}",
      cvpKortelejeYra: " (kortelėje - {k})", cvpKortelejeNera: " (kortelėje neįrašyta)",
      cvpSutampa: "Sutampa su CVP IS duomenimis: {l}.", cvpLTerminas: "pasiūlymų terminas", cvpLPaskelbimas: "paskelbimo data", cvpLBusena: "būsena",
      cvpNeraDuomenu: "CVP IS duomenyse termino, paskelbimo datos ir būsenos nėra.",
      cvpNera: "CVP IS numerio {nr} VPT sąraše nėra - patikrinkite numerį kortelėje.",
      cvpKlaida: "Šios kortelės CVP IS duomenų gauti nepavyko.",
      cvpAtnaujinti: "Atnaujinti kortelę", cvpAtverti: "Atverti CVP IS"
    },
    en: {
      kortelesPav: "Procurement cards", pradzia: "Procurement start", paskelbimas: "Publication", pasiulymuTerminas: "Tender deadline",
      siandien: "today", po: "in", dd: "working days", praejo: "passed", beTerminu: "No dates on the card",
      trukstaPrad: "Complete the card: missing ", zingsnis: "Next step: ",
      planuojamas: "procurement schedule", rengiamas: "procurement documents (qualification, conditions, specification)",
      paskelbtas: "waiting for tenders", vertinamas: "tender evaluation and committee decisions",
      grafikas: "Schedule", kvalifikacija: "Qualification", kortele: "Card",
      ts: "Specification", salygos: "Conditions", protokolai: "Protocols", pazyma: "Report", derybos: "Negotiation", vertinimas: "Evaluation", parengtis: "Readiness check",
      kna: "Cost-benefit analysis", vertinamasMV: "tender evaluation and the report",
      naujasSkirtukas: "opens in a new tab", daugiau: "Show all", baigti: "Completed or archived: ",
      visosKorteles: "all cards", aktyviuNera: "No active procurements.", CVP: "CVP IS ",
      cvpTikrinti: "Check CVP IS data",
      cvpPag: "Only the CVP IS numbers of these cards ({n}) are sent to the G-Procure server; it answers from public VPT data refreshed every 6 hours. The cards are not changed.",
      cvpEiga: "Checking CVP IS data ({n})...", cvpNepavyko: "Could not check the CVP IS data",
      cvpRysys: "The G-Procure server did not respond or the VPT list is not loaded yet - try again later.",
      cvpSuvestine: "Cards checked: {n} (VPT list updated {t}). Differ from CVP IS: {p}, match: {s}",
      cvpNeraS: ", not in the VPT list: {m}", cvpKlaidaS: ", could not be checked: {k}",
      cvpRiba: " Up to {r} cards with the nearest dates are checked at a time.",
      cvpTerminas: "CVP IS tender deadline: {v}", cvpPaskelbimas: "CVP IS publication date: {v}", cvpBusena: "CVP IS status: {v}",
      cvpKortelejeYra: " (on the card: {k})", cvpKortelejeNera: " (not on the card)",
      cvpSutampa: "Matches the CVP IS data: {l}.", cvpLTerminas: "tender deadline", cvpLPaskelbimas: "publication date", cvpLBusena: "status",
      cvpNeraDuomenu: "The CVP IS data have no deadline, publication date or status.",
      cvpNera: "CVP IS number {nr} is not in the VPT list - check the number on the card.",
      cvpKlaida: "Could not get the CVP IS data for this card.",
      cvpAtnaujinti: "Update the card", cvpAtverti: "Open in CVP IS"
    }
  };
  /* Įrankiai, kurie skaito kortelę (A1). Kelias - nuo svetainės šaknies. Rodomi pagal pirkimo būseną (naudotojo
     sprendimas 2026-09-26): planuojant - grafikas (ir kaštų ir naudos analizė didelės vertės pirkimui), rengiant -
     TS, kvalifikacija, sąlygos, grafikas ir skelbimo parengties patikra, paskelbus - protokolai, vertinant - protokolai arba mažos vertės pažyma,
     vertinimas ir derybos (tik būdui su derybomis). Pirmas - pagrindinis. Įrankiai, kurie rengia tik LITGRID AB
     dokumentus pagal PĮ (litgrid), kitos organizacijos ar VPĮ pirkimui nesiūlomi; nežinomas vykdytojas - siūlomi
     (numatytasis kontekstas - LITGRID). Kas padaryta, įrankiai nežino - tai tik pagal kortelės būseną. */
  var IRANKIAI = {
    grafikas: { kelias: "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html" },
    kna: { kelias: "PP-cost-benefit/kastu_naudos_analize.html", litgrid: true, salyga: function (k) {
      var C = global.GP_THRESHOLDS && global.GP_THRESHOLDS.CBA;               // riba - iš shared/thresholds.js
      return !!(C && C.rekomenduojama && k.verte >= C.rekomenduojama);
    } },
    ts: { kelias: "PP-ts/TS_Asistentas.html", litgrid: true },
    kvalifikacija: { kelias: "PP-qual/PP-QUAL.html" },
    salygos: { kelias: "PP-salygos/PP-SALYGOS.html", litgrid: true, salyga: function (k) {
      return !k.budas || !global.GP_METHODS || !!global.GP_METHODS.toSalygos(k.budas);   // būdas, kuriam šablonų nėra - nesiūloma
    } },
    protokolai: { kelias: "PP-protocol/LITGRID_Generatorius_v3.html", litgrid: true, salyga: function (k) { return !mazosVertes(k); } },
    pazyma: { kelias: "PP-report/PP-report.html", litgrid: true, salyga: mazosVertes },
    vertinimas: { kelias: "PP-cost-benefit/ekonominio_naudingumo_skaiciuokle.html" },
    derybos: { kelias: "PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html", salyga: function (k) {
      var m = k.budas && global.GP_METHODS ? global.GP_METHODS.byId(k.budas) : null;
      return !!(m && m.derybos);
    } },
    // Parengtų dokumentų patikra (A4; nuo 2026-10-06 - PP-salygos skirtukas „Tikrinti parengtus dokumentus“) - paskutinis žingsnis
    // prieš skelbiant; neskelbiamiems būdams nesiūloma. Ne tik LITGRID: paketo patikra bendra, su forma lyginama, kai ji atpažįstama.
    parengtis: { kelias: "PP-salygos/PP-SALYGOS.html", zyme: "#tikrinti", salyga: function (k) {
      var m = k.budas && global.GP_METHODS ? global.GP_METHODS.byId(k.budas) : null;
      return !m || m.skelbiama !== false;
    } }
  };
  var PAGAL_BUSENA = {
    planuojamas: ["grafikas", "kna"],
    rengiamas: ["ts", "kvalifikacija", "salygos", "grafikas", "parengtis"],
    paskelbtas: ["protokolai"],
    vertinamas: ["protokolai", "pazyma", "vertinimas", "derybos"]
  };
  function mazosVertes(k) {
    var m = k.budas && global.GP_METHODS ? global.GP_METHODS.byId(k.budas) : null;
    return !!(m && m.grupe === "mazos_vertes");
  }
  /* Kortelės pirkimui tinkami įrankiai pagal būseną (tvarka - svarba). */
  function irankiai(k) {
    return (PAGAL_BUSENA[k.busena] || []).filter(function (r) {
      var x = IRANKIAI[r];
      if (x.litgrid && ((k.vykdytojas && k.vykdytojas !== "litgrid") || (k.rezimas && k.rezimas !== "PI"))) return false;
      return !x.salyga || x.salyga(k);
    });
  }
  var BAIGTOS = { sutartis: 1, nutrauktas: 1 };
  /* „Trūksta ...“ - kilmininkas (LT), be jo „trūksta vertė“. */
  var TRUKSTA = { lt: { verte: "vertės", budas: "būdo", vykdytojas: "vykdytojo", rezimas: "režimo" },
                  en: { verte: "value", budas: "procedure", vykdytojas: "contracting body", rezimas: "legal regime" } };
  var TERMINAI = ["pasiulymuTerminas", "paskelbimas", "pradzia"];
  /* CVP IS patikra: vienu paspaudimu - ne daugiau kaip MAX_CVP numerių (nginx riba - 30 užklausų iš karto), po 3 lygiagrečiai. */
  var MAX_CVP = 25, LYGIAGRECIAI = 3;
  var CVP_ET = { pasiulymuTerminas: "cvpTerminas", paskelbimas: "cvpPaskelbimas", busena: "cvpBusena" };
  var CVP_PAV = { pasiulymuTerminas: "cvpLTerminas", paskelbimas: "cvpLPaskelbimas", busena: "cvpLBusena" };
  var SKAITIKLIS = 0;
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? String(o[k]) : m; }); }
  function cvpNr(k) { var n = String((k && k.cvpisNr) || "").trim(); return /^\d{5,9}$/.test(n) ? n : ""; }
  /* f kiekvienam sąrašo elementui, ne daugiau kaip n vienu metu; rezultatai - ta pačia tvarka (klaida - { ok: false, rusis: "rysys" }). */
  function eile(sarasas, n, f) {
    var rez = new Array(sarasas.length), i = 0;
    function kitas() {
      if (i >= sarasas.length) return Promise.resolve();
      var j = i++;
      return Promise.resolve().then(function () { return f(sarasas[j]); })
        .then(function (r) { rez[j] = r; }, function () { rez[j] = { ok: false, rusis: "rysys" }; }).then(kitas);
    }
    var darbai = [];
    for (var k = 0; k < Math.min(n, sarasas.length); k++) darbai.push(kitas());
    return Promise.all(darbai).then(function () { return rez; });
  }

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
      ".gpmp-pav{font-size:16px;font-weight:700;color:var(--color-graphite,#2E3641);text-decoration:none;overflow-wrap:anywhere}",
      ".gpmp-pav:hover{text-decoration:underline}",
      ".gpmp-mazas{display:block;font-size:13px;color:#5B6470;margin-top:2px;overflow-wrap:anywhere}",
      ".gpmp-et{display:block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5B6470}",
      ".gpmp-data{display:block;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}",
      ".gpmp-liko{display:block;font-size:13px;color:#5B6470;white-space:nowrap}",
      ".gpmp-liko--greit{color:#8A4B00;font-weight:700}",
      ".gpmp-busena{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;background:var(--color-green-5,#EFF9F1);border:1px solid var(--color-green-15,#D7EEDB);margin-bottom:4px}",
      ".gpmp-zingsnis{font-size:14px}",
      ".gpmp-veiksmai{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}",
      ".gpmp-btn{font-size:13px;font-weight:700;text-decoration:none;border-radius:999px;padding:6px 12px;border:1px solid var(--color-graphite-30,#C7CDD3);",
      "color:var(--color-graphite,#2E3641);background:var(--color-white,#fff);white-space:nowrap}",
      ".gpmp-btn:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpmp-btn--pagr{background:var(--color-emerald-strong,#007554);border-color:var(--color-emerald-strong,#007554);color:#fff}",
      ".gpmp-btn--pagr:hover{background:var(--color-emerald-strong-hover,#006649)}",
      ".gpmp a:focus-visible,.gpmp button:focus-visible{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpmp-apacia{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:14px;color:#5B6470}",
      ".gpmp-apacia button{font:inherit;font-weight:700;background:none;border:0;padding:0;color:var(--color-emerald-strong,#007554);text-decoration:underline;cursor:pointer}",
      ".gpmp-cvpis{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-bottom:10px}",
      ".gpmp-cvpis[hidden]{display:none}",
      ".gpmp-cvpis .gpmp-mazas{margin-top:0;flex:1 1 16em;min-width:0}",
      ".gpmp-cvp-busena{flex-basis:100%}",
      "button.gpmp-btn{font:inherit;font-size:13px;font-weight:700;cursor:pointer}",
      "button.gpmp-btn:disabled{cursor:default;color:#5B6470}",
      ".gpmp-cvp{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;",
      "border-top:1px solid var(--color-graphite-15,#E1E2E4);padding-top:10px;font-size:14px}",
      ".gpmp-cvp ul{margin:0;padding-left:18px;flex:1 1 16em;min-width:0}",
      ".gpmp-cvp li{overflow-wrap:anywhere}",
      ".gpmp-cvp--skiriasi{border-top:2px solid var(--color-warning,#FAB03B)}",
      ".gpmp-cvp--ok{color:#5B6470;font-size:13px}",
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
    /* CVP IS patikra (2026-10-18): juosta su mygtuku ir būsena - pastovios (GP_BUSENA būsena neperrašoma perpiešiant),
       eilutės perpiešiamos; skirtumai skaičiuojami piešiant pagal dabartinę kortelę, todėl ją atnaujinus kitame skirtuke
       (storage įvykis) pastaba dingsta pati. */
    var cvp = { busena: "nepatikrinta", rez: {}, tekstas: "", riba: 0 }, cvpNumeriai = [];
    vieta.innerHTML = "";
    var juosta = el("div", "gpmp gpmp-cvpis");
    juosta.hidden = true;
    var cvpBtn = el("button", "gpmp-btn");
    cvpBtn.type = "button";
    var cvpPag = el("span", "gpmp-mazas");
    cvpPag.id = "gpmp-cvp-pag-" + (++SKAITIKLIS);
    cvpBtn.setAttribute("aria-describedby", cvpPag.id);
    var cvpBusena = el("div", "gpmp-cvp-busena");
    cvpBusena.hidden = true;
    juosta.appendChild(cvpBtn); juosta.appendChild(cvpPag); juosta.appendChild(cvpBusena);
    var box = el("div", "gpmp");
    vieta.appendChild(juosta); vieta.appendChild(box);
    cvpBtn.addEventListener("click", function () { tikrinkCvp(); });

    function piesk() {
      var l = kalba(o), t = T[l], K = global.GP_KORTELE;
      var dabar = o.dabar ? new Date(o.dabar) : new Date();
      var s = K.skaityk();
      box.innerHTML = "";
      juosta.hidden = true;
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
      cvpNumeriai = [];
      aktyvios.forEach(function (x) { var n = cvpNr(x.k); if (n && cvpNumeriai.indexOf(n) < 0) cvpNumeriai.push(n); });
      if (global.GP_VPT && global.GP_BUSENA && cvpNumeriai.length) {
        juosta.hidden = false;
        cvpBtn.textContent = t.cvpTikrinti;
        cvpBtn.disabled = cvp.busena === "eiga";
        cvpPag.textContent = fmt(t.cvpPag, { n: Math.min(cvpNumeriai.length, MAX_CVP) });
        if (cvp.busena === "baigta") suvestine(t, l, aktyvios);
      }
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
        : (t[k.busena] ? t.zingsnis + (k.busena === "vertinamas" && mazosVertes(k) ? t.vertinamasMV : t[k.busena]) + "." : "");
      if (zingsnis) c.appendChild(el("div", "gpmp-zingsnis", zingsnis));
      r.appendChild(c);
      // 4. Įrankiai su pasirinktu pirkimu - pagal būseną; pirmas pagrindinis (jei kortelėje netrūksta duomenų)
      var d = el("div", "gpmp-veiksmai");
      irankiai(k).forEach(function (raktas, i) {
        var btn = el("a", "gpmp-btn" + (!truksta.length && i === 0 ? " gpmp-btn--pagr" : ""), t[raktas]);
        btn.href = saknis + IRANKIAI[raktas].kelias + "?kortele=" + id + (IRANKIAI[raktas].zyme || "");
        btn.target = "_blank"; btn.rel = "noopener";
        btn.setAttribute("aria-label", t[raktas] + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
        // Naudojimosi statistika (tik su sutikimu): kuris įrankis ir kokiame etape - be kortelės duomenų
        btn.addEventListener("click", function () {
          var A = global.GP_ANALITIKA, m = /^(PP-[A-Za-z-]+)\//.exec(IRANKIAI[raktas].kelias);
          if (A) A.ivykis("mano_pirkimai_paspausta", { irankis: m ? m[1] : "kita",
            etapas: { planuojamas: "planuojama", rengiamas: "rengiama", paskelbtas: "paskelbta", vertinamas: "vertinama" }[k.busena] || "kita" });
        });
        d.appendChild(btn);
      });
      var kort = el("a", "gpmp-btn" + (truksta.length ? " gpmp-btn--pagr" : ""), t.kortele);
      kort.href = saknis + "pirkimu-korteles.html#kortele=" + id;
      kort.setAttribute("aria-label", t.kortele + ": " + (k.pavadinimas || "?"));
      d.appendChild(kort);
      r.appendChild(d);
      // 5. CVP IS patikros rezultatas (tik po „Patikrinti CVP IS duomenis“)
      var cr = cvp.busena === "baigta" && cvpNr(k) ? cvp.rez[cvpNr(k)] : null;
      if (cr) r.appendChild(cvpPastaba(k, cr, t, l, id));
      return r;
    }

    function rodomas(v) { return String(v || "").replace("T", " "); }
    function cvpPastaba(k, cr, t, l, id) {
      var K = global.GP_KORTELE, V = global.GP_VPT, p = el("div", "gpmp-cvp");
      if (cr.ok) {
        var s = V.skirtumai(k, cr.pirkimas);
        if (!s.skirtumai.length) {
          p.className += " gpmp-cvp--ok";
          p.appendChild(el("span", null, s.palyginta.length
            ? fmt(t.cvpSutampa, { l: s.palyginta.map(function (f) { return t[CVP_PAV[f]]; }).join(", ") }) : t.cvpNeraDuomenu));
          return p;
        }
        p.className += " gpmp-cvp--skiriasi";
        var ul = el("ul");
        s.skirtumai.forEach(function (x) {
          var b = x.laukas === "busena";
          var v = b ? (K.busenosPav(x.vpt, l) || x.vpt) + " (VPT: " + x.kodas + ")" : rodomas(x.vpt);
          var kv = b ? (K.busenosPav(x.kortele, l) || x.kortele) : rodomas(x.kortele);
          ul.appendChild(el("li", null, fmt(t[CVP_ET[x.laukas]], { v: v }) + (x.kortele ? fmt(t.cvpKortelejeYra, { k: kv }) : t.cvpKortelejeNera)));
        });
        p.appendChild(ul);
        var vv = el("div", "gpmp-veiksmai");
        var a = el("a", "gpmp-btn gpmp-btn--pagr", t.cvpAtnaujinti);
        a.href = saknis + "pirkimu-korteles.html?vpt=1#kortele=" + id;
        a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", t.cvpAtnaujinti + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
        vv.appendChild(a);
        if (cr.nuoroda) {
          var c = el("a", "gpmp-btn", t.cvpAtverti);
          c.href = cr.nuoroda; c.target = "_blank"; c.rel = "noopener";
          c.setAttribute("aria-label", t.cvpAtverti + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
          vv.appendChild(c);
        }
        p.appendChild(vv);
      } else if (cr.rusis === "nera") p.appendChild(el("span", null, fmt(t.cvpNera, { nr: cvpNr(k) })));
      else p.appendChild(el("span", null, t.cvpKlaida));
      return p;
    }

    /* Suvestinė pagal dabartines korteles; ta pati - neperpiešiama (gyva sritis nekartoja to paties). */
    function suvestine(t, l, aktyvios) {
      var c = { n: 0, p: 0, s: 0, nera: 0, k: 0 }, laikas = null;
      Object.keys(cvp.rez).forEach(function (nr) {
        var r = cvp.rez[nr], kk = aktyvios.filter(function (x) { return cvpNr(x.k) === nr; });
        if (!kk.length) return;
        c.n++;
        if (r.ok || r.rusis === "nera") laikas = laikas || (r.meta && r.meta.atnaujinta) || null;
        if (r.ok) {
          if (kk.some(function (x) { return global.GP_VPT.skirtumai(x.k, r.pirkimas).skirtumai.length; })) c.p++; else c.s++;
        } else if (r.rusis === "nera") c.nera++;
        else c.k++;
      });
      if (!c.n) { cvp.tekstas = ""; global.GP_BUSENA.slepk(cvpBusena); return; }
      var tx = fmt(t.cvpSuvestine, { n: c.n, t: global.GP_VPT.atnaujinta(laikas, l), p: c.p, s: c.s })
        + (c.nera ? fmt(t.cvpNeraS, { m: c.nera }) : "") + (c.k ? fmt(t.cvpKlaidaS, { k: c.k }) : "") + "."
        + (cvp.riba ? fmt(t.cvpRiba, { r: cvp.riba }) : "");
      if (tx === cvp.tekstas) return;
      cvp.tekstas = tx;
      global.GP_BUSENA.rodyk(cvpBusena, { tipas: "gerai", tekstas: tx, kartoti: c.k ? function () { tikrinkCvp(); } : null });
    }

    function tikrinkCvp() {
      var V = global.GP_VPT, B = global.GP_BUSENA;
      if (!V || !B || cvp.busena === "eiga" || !cvpNumeriai.length) return Promise.resolve();
      var t = T[kalba(o)], tikr = cvpNumeriai.slice(0, MAX_CVP);
      cvp = { busena: "eiga", rez: {}, tekstas: "", riba: cvpNumeriai.length > MAX_CVP ? MAX_CVP : 0 };
      piesk();
      return B.vykdyk(cvpBusena, {
        tipas: "eiga", tekstas: fmt(t.cvpEiga, { n: tikr.length }), klaidosPriesdelis: t.cvpNepavyko,
        kartoti: function () { tikrinkCvp(); },
        veiksmas: function () {
          return eile(tikr, LYGIAGRECIAI, function (nr) { return V.pirkimas(nr); }).then(function (rs) {
            // Ryšys ar neįkeltas sąrašas visiems - klaida su „Bandyti dar kartą“, ne „sutampa“
            if (!rs.some(function (r) { return r && (r.ok || r.rusis === "nera"); })) throw new Error(t.cvpRysys);
            return rs;
          });
        }
      }).then(function (rez) {
        if (!rez.ok) { cvp.busena = "klaida"; piesk(); return; }
        rez.reiksme.forEach(function (r, i) { cvp.rez[tikr[i]] = r || { ok: false, rusis: "rysys" }; });
        cvp.busena = "baigta";
        piesk();
      });
    }

    piesk();
    global.addEventListener("storage", function (e) { if (e.key === global.GP_KORTELE.RAKTAS) piesk(); });
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(piesk).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    return { atnaujink: piesk, tikrinkCvp: tikrinkCvp };
  }

  global.GP_MANO_PIRKIMAI = { mount: mount, terminas: terminas, darboDienos: darboDienos };
})(typeof window !== "undefined" ? window : this);
