/* ============================================================================
 * G-Procure  shared/vpt-rinka.js   (window.GP_VPT_RINKA)
 * ----------------------------------------------------------------------------
 * Rinkos duomenys pagal BVPŽ kodą iš viešų VPT CVP IS duomenų (2026-10-18b; docs/cvpis/vpt-api-planas.md 4 p.).
 * Panašūs pirkimai (BVPŽ kodo pradžia, objektas, paskelbti per 24 mėn.): kiek ir kokiais būdais, vertinimo kriterijus,
 * faktiniai pasiūlymų teikimo laikotarpiai (kalendorinės dienos nuo paskelbimo iki termino) pagal būdą, dienos nuo
 * termino iki sprendimo ir sutarties, numatoma vertė, sutarties trukmė, nutraukimai, dažniausi vykdytojai.
 *
 *   GP_VPT_RINKA.mount(vieta, { gauk: () => ({ bvpz, budas, tipas, rezimas }), kalba: () => "lt" | "en",   // rezimas "PI" | "VPI" - jūsų būdo eilutei
 *                               mano: () => ({ pavadinimas, dd, kd }) | null })   // mano - modulio grafiko etapas palyginimui
 *     -> { rodyk(), isvalyk(), perpiesk(), vieta }   // užklausa - tik paspaudus mygtuką (ar rodyk()); perpiesk() - be užklausos
 *   GP_VPT_RINKA.pradzia(bvpz) - reikšminga BVPŽ kodo pradžia („45231000-5“ -> „45231“, „45000000-7“ -> „45“)
 *
 * TAISYKLĖS: į G-Procure serverį siunčiama tik BVPŽ kodo pradžia, objektas ir data (GP_VPT.statistika); jei panašių pirkimų
 * mažiau kaip 20 - grupė praplečiama (kodo pradžia trumpinama iki 2 skaitmenų) ir tai pasakoma; kvantiliai - tik nuo 5 reikšmių
 * (serveris); ryšys ar neįkeltas sąrašas - klaida su „Bandyti dar kartą“, niekada „pirkimų nėra“. Tai faktai, ne teisės normos:
 * trumpiausius terminus nustato įstatymas (shared/taisykles.js). Visi tekstai - per textContent. Nieko nesaugo.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var MAZIAUSIAI = 20, LAIKOTARPIS_MEN = 24;
  // Sistemos, kurių „terminas“ CVP IS - galiojimo pabaiga (DPS mediana ~1 800 d.), ne pasiūlymų terminas - lentelėje nerodomos
  var SISTEMOS = { "Dynamic Purchasing System": 1, "Qualification System": 1 };
  var T = {
    lt: {
      mygtukas: "Rodyti rinkos duomenis (CVP IS)", siauriau: "Siauresnė BVPŽ grupė", placiau: "Platesnė BVPŽ grupė",
      pag: "Pagal BVPŽ kodą - panašūs CVP IS pirkimai per {m} mėn. iš viešų VPT duomenų (atnaujinami kas 6 val.). Į G-Procure serverį siunčiama tik BVPŽ kodo pradžia ir objektas.",
      beBvpz: "Įrašykite BVPŽ kodą (pvz. 45231000-5) - pagal jį ieškosime panašių pirkimų.", kraunama: "Gaunami rinkos duomenys iš VPT CVP IS...",
      nepavyko: "Rinkos duomenų gauti nepavyko", rysys: "G-Procure serveris neatsakė arba VPT sąrašas dar neįkeltas - bandykite vėliau.",
      nera: "Panašių pirkimų pagal BVPŽ {k} VPT duomenyse per {m} mėn. nėra (sąrašas atnaujintas {t}).",
      antraste: "Panašūs pirkimai CVP IS: BVPŽ {k}…{o}, paskelbti nuo {nuo}", atnaujinta: "VPT sąrašas atnaujintas {t}.",
      praplesta: "Su BVPŽ {k0}… panašių pirkimų buvo per mažai - grupė praplėsta iki {k}….",
      objektas: { Supplies: "prekės", Services: "paslaugos", Works: "darbai" },
      paskelbta: "Paskelbta", aktyvus: "Su nepraėjusiu terminu", nutraukta: "Nutraukta", rinkos: "Rinkos konsultacijos", tarpt: "Tarptautinės vertės", es: "Su ES lėšomis",
      terminaiH: "Pasiūlymų teikimo laikotarpis - kalendorinės dienos nuo paskelbimo iki termino",
      budas: "Būdas", n: "Pirkimų", med: "Mediana", puse: "Pusė pirkimų", tarptT: "tarptautinis", tarptS: "ne tarptautinis",
      retos: "Retesni būdai (mažiau kaip 5 pirkimai - per mažai duomenų): {s}.", neisversti: "Rodoma kaip VPT duomenyse, nes reikšmė neaiški: {s}.", kab: ["„", "“"],
      jusu: "jūsų būdas", mazai: "per mažai duomenų", kitiBudai: "Jūsų būdo panašiuose pirkimuose nėra arba per mažai.",
      vertinimasH: "Vertinimo kriterijus", kaina: "kaina", ekon: "ekonominis naudingumas (kaina ir kokybė)",
      sprendimasH: "Nuo termino iki sprendimo dėl laimėtojo", sutartisH: "Nuo termino iki sutarties", verteH: "Numatoma vertė (kai nurodyta)",
      trukmeH: "Sutarties trukmė", vykdytojaiH: "Dažniausi pirkimo vykdytojai",
      dienos: "{v} d.", men: "{v} mėn.", ribos: " (pusė pirkimų - {a}-{b}; {n} pirk.)", maziau: "per mažai duomenų ({n} pirk.)",
      mano: "Jūsų grafike „{p}“ - {kd} kal. d. nuo paskelbimo ({dd} d. d.).", manoDd: "Jūsų grafike „{p}“ - {dd} d. d. (kalendorines dienas matysite įrašę pradžios datą).",
      manoMed: " Panašių CVP IS pirkimų, vykdytų jūsų būdu, mediana - {m} kal. d.",
      sistemos: "Dinaminės pirkimų sistemos ir kvalifikacijos sistemos lentelėje nerodomos: jų terminas CVP IS - sistemos galiojimo pabaiga.",
      istatymas: "PĮ ir VPĮ prie derybų - pagal VPT procedūros pavadinimą: vienus vartoja sektorinės direktyvos (PĮ), kitus - klasikinės direktyvos (VPĮ) pirkimai; neskelbiamų derybų (VPĮ) eilutėje yra ir keli gynybos pirkimai.",
      pastaba: "Faktai iš viešų VPT CVP IS duomenų, ne teisės normos: trumpiausius terminus nustato įstatymas. Kvantiliai rodomi, kai yra bent 5 pirkimai; „pusė pirkimų“ - tarp 25 ir 75 procentilio. Kelių etapų pirkimuose (derybos, ribotas konkursas, dialogas) CVP IS terminas gali būti ir vėlesnio etapo."
    },
    en: {
      mygtukas: "Show market data (CVP IS)", siauriau: "Narrower CPV group", placiau: "Wider CPV group",
      pag: "By CPV code - similar CVP IS procurements over {m} months from public VPT data (refreshed every 6 hours). Only the start of the CPV code and the subject are sent to the G-Procure server.",
      beBvpz: "Enter a CPV code (e.g. 45231000-5) - we will look for similar procurements by it.", kraunama: "Fetching market data from VPT CVP IS...",
      nepavyko: "Could not get the market data", rysys: "The G-Procure server did not respond or the VPT list is not loaded yet - try again later.",
      nera: "There are no similar procurements by CPV {k} in the VPT data over {m} months (list updated {t}).",
      antraste: "Similar procurements in CVP IS: CPV {k}…{o}, published since {nuo}", atnaujinta: "VPT list updated {t}.",
      praplesta: "There were too few similar procurements with CPV {k0}… - the group was widened to {k}….",
      objektas: { Supplies: "supplies", Services: "services", Works: "works" },
      paskelbta: "Published", aktyvus: "Deadline not yet passed", nutraukta: "Cancelled", rinkos: "Market consultations", tarpt: "Above EU threshold", es: "With EU funding",
      terminaiH: "Tender period - calendar days from publication to the deadline",
      budas: "Procedure", n: "Procurements", med: "Median", puse: "Middle half", tarptT: "above EU threshold", tarptS: "below EU threshold",
      retos: "Less frequent procedures (fewer than 5 procurements - too few data): {s}.", neisversti: "Shown as in the VPT data because the meaning is unclear: {s}.", kab: ["“", "”"],
      jusu: "your procedure", mazai: "too few data", kitiBudai: "Your procedure is absent or too rare among similar procurements.",
      vertinimasH: "Award criterion", kaina: "price", ekon: "most economically advantageous (price and quality)",
      sprendimasH: "From the deadline to the award decision", sutartisH: "From the deadline to the contract", verteH: "Estimated value (where stated)",
      trukmeH: "Contract duration", vykdytojaiH: "Most frequent contracting entities",
      dienos: "{v} days", men: "{v} months", ribos: " (half of the procurements - {a}-{b}; {n} proc.)", maziau: "too few data ({n} proc.)",
      mano: "In your schedule, “{p}” - {kd} calendar days from publication ({dd} working days).", manoDd: "In your schedule, “{p}” - {dd} working days (enter the start date to see calendar days).",
      manoMed: " Median for your procedure in similar CVP IS procurements - {m} calendar days.",
      sistemos: "Dynamic purchasing systems and qualification systems are not shown in the table: their CVP IS deadline is the end of the system.",
      istatymas: "PĮ and VPĮ next to negotiated procedures - by the VPT procedure name: some are used by procurements under the utilities directive (PĮ), others under the classic directive (VPĮ); the negotiated without publication (VPĮ) row also includes a few defence procurements.",
      pastaba: "Facts from public VPT CVP IS data, not legal rules: the minimum deadlines are set by law. Quantiles are shown when there are at least 5 procurements; “half of the procurements” - between the 25th and 75th percentile. In multi-stage procedures (negotiations, restricted procedure, dialogue) the CVP IS deadline may be that of a later stage."
    }
  };
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? String(o[k]) : m; }); }
  function el(zyme, klase, tekstas) { var e = document.createElement(zyme); if (klase) e.className = klase; if (tekstas != null) e.textContent = tekstas; return e; }
  function skaicius(v, l) { return Number(v).toLocaleString(l === "en" ? "en-GB" : "lt-LT", { maximumFractionDigits: 1 }); }
  function eurai(v, l) { return Number(v).toLocaleString(l === "en" ? "en-GB" : "lt-LT", { maximumFractionDigits: 0 }) + " EUR"; }

  /* Reikšminga BVPŽ kodo pradžia: be kontrolinio skaitmens ir galinių nulių, ne ilgesnė kaip 5 ir ne trumpesnė kaip 2 skaitmenys */
  function pradzia(bvpz) {
    var m = /(\d{8})/.exec(String(bvpz || "").replace(/\s+/g, ""));
    if (!m) { var d = String(bvpz || "").replace(/\D/g, ""); if (d.length < 2) return null; m = [null, (d + "00000000").slice(0, 8)]; }
    var s = m[1].replace(/0+$/, "");
    if (s.length < 2) s = m[1].slice(0, 2);
    return s.slice(0, 5);
  }

  var STILIUS_ID = "gpvr-stilius";
  function stilius() {
    if (document.getElementById(STILIUS_ID)) return;
    var css = [
      ".gpvr{display:grid;gap:10px;font-family:var(--font-base,inherit);color:var(--color-graphite,#2E3641);font-size:14px}",
      ".gpvr-eil{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}",
      ".gpvr-btn{font:inherit;font-size:13px;font-weight:700;border-radius:999px;padding:6px 12px;border:1px solid var(--color-graphite-30,#C7CDD3);background:var(--color-white,#fff);color:var(--color-graphite,#2E3641);cursor:pointer}",
      ".gpvr-btn:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpvr-btn:focus-visible{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpvr-pag{font-size:13px;color:#5B6470;flex:1 1 16em;min-width:0}",
      ".gpvr-rez{display:grid;gap:12px}",
      ".gpvr-rez:empty{display:none}",
      ".gpvr-h{font-size:14px;font-weight:700;margin:0}",
      ".gpvr-maz{font-size:13px;color:#5B6470;margin:0}",
      ".gpvr-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(130px,100%),1fr));gap:8px;margin:0}",
      ".gpvr-kpi div{background:var(--color-graphite-5,#F6F7F8);border-radius:8px;padding:8px 10px}",
      ".gpvr-kpi dt{font-size:12px;color:#5B6470;margin:0}",
      ".gpvr-kpi dd{font-size:16px;font-weight:700;margin:0;font-variant-numeric:tabular-nums}",
      ".gpvr-lent{overflow-x:auto}",
      ".gpvr table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}",
      ".gpvr th,.gpvr td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--color-graphite-15,#E1E2E4);vertical-align:top}",
      ".gpvr td.sk,.gpvr th.sk{text-align:right}",
      ".gpvr td.sk{white-space:nowrap}",
      "@media (max-width:480px){.gpvr th,.gpvr td{padding:5px 4px}}",
      ".gpvr tr.gpvr-jusu td,.gpvr tr.gpvr-jusu th{background:var(--color-green-5,#EFF9F1);font-weight:700}",
      ".gpvr-zyme{font-size:12px;font-weight:700;color:#2B6E37;margin-left:6px;white-space:nowrap}",
      ".gpvr-mano{font-size:14px;margin:0;padding:8px 10px;border-left:3px solid var(--color-emerald,#00A378);background:var(--color-graphite-5,#F6F7F8)}",
      ".gpvr ul{margin:0;padding-left:18px}",
      ".gpvr li{overflow-wrap:anywhere}"
    ].join("");
    var e = document.createElement("style"); e.id = STILIUS_ID; e.textContent = css; document.head.appendChild(e);
  }

  function nuoData() {
    var d = new Date(); d.setMonth(d.getMonth() - LAIKOTARPIS_MEN);
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vilnius" }).format(d);
  }

  function mount(vieta, o) {
    vieta = typeof vieta === "string" ? document.querySelector(vieta) : vieta;
    if (!vieta) return null;
    o = o || {};
    stilius();
    var kalba = function () { var l = o.kalba ? o.kalba() : (document.documentElement.getAttribute("lang") || "lt"); return /^en/i.test(l) ? "en" : "lt"; };
    var box = el("div", "gpvr"), eil = el("div", "gpvr-eil"), btn = el("button", "gpvr-btn"), pag = el("span", "gpvr-pag");
    var busena = el("div", "gpvr-busena"), rez = el("div", "gpvr-rez");
    btn.type = "button";
    pag.id = "gpvr-pag-" + Math.random().toString(36).slice(2, 9);
    btn.setAttribute("aria-describedby", pag.id);
    eil.appendChild(btn); eil.appendChild(pag);
    box.appendChild(eil); box.appendChild(busena); box.appendChild(rez);
    vieta.innerHTML = ""; vieta.appendChild(box);
    var dabar = { prefiksas: null, pradinis: null, auto: false, s: null, meta: null, f: null, g: null };
    function tekstai() { var t = T[kalba()]; btn.textContent = t.mygtukas; pag.textContent = fmt(t.pag, { m: LAIKOTARPIS_MEN }); return t; }
    tekstai();

    async function gauk(prefiksas, plesti) {
      var V = global.GP_VPT, B = global.GP_BUSENA, t = T[kalba()];
      var g = (o.gauk && o.gauk()) || {};
      var k = prefiksas || pradzia(g.bvpz);
      if (!k) { if (B) B.rodyk(busena, { tipas: "klaida", tekstas: t.beBvpz }); rez.innerHTML = ""; return; }
      var f = { cpv: k, nuo: nuoData() };
      if (g.tipas && /^(Supplies|Services|Works)$/.test(g.tipas)) f.tipas = g.tipas;
      var r = await B.vykdyk(busena, { tipas: "eiga", tekstas: t.kraunama, klaidosPriesdelis: t.nepavyko, kartoti: function () { gauk(prefiksas, plesti); },
        veiksmas: async function () {
          var x = await V.statistika(f), pr = k;
          if (!x.ok) throw new Error(t.rysys);
          // Per mažai panašių - grupė praplečiama (iki 2 skaitmenų)
          while (plesti && x.ok && x.statistika.viso < MAZIAUSIAI && pr.length > 2) {
            pr = pr.slice(0, -1);
            var y = await V.statistika(Object.assign({}, f, { cpv: pr }));
            if (!y.ok) throw new Error(t.rysys);
            x = y;
          }
          x.prefiksas = pr;
          return x;
        } });
      if (!r.ok) { rez.innerHTML = ""; return; }
      dabar = { prefiksas: r.reiksme.prefiksas, pradinis: k, auto: !!plesti && r.reiksme.prefiksas !== k, s: r.reiksme.statistika, meta: r.reiksme.meta, f: f, g: g };
      if (!dabar.s.viso) {
        B.rodyk(busena, { tipas: "tuscia", tekstas: fmt(t.nera, { k: dabar.prefiksas, m: LAIKOTARPIS_MEN, t: V.atnaujinta(dabar.meta.atnaujinta, kalba()) }) });
        rez.innerHTML = ""; return;
      }
      piesk();
    }

    function piesk() {
      var t = tekstai(), l = kalba(), V = global.GP_VPT, s = dabar.s;
      if (!s) return;
      rez.innerHTML = "";
      var ant = el("p", "gpvr-h", fmt(t.antraste, { k: dabar.prefiksas, o: dabar.f.tipas ? " (" + t.objektas[dabar.f.tipas] + ")" : "", nuo: dabar.f.nuo }));
      rez.appendChild(ant);
      var m = [fmt(t.atnaujinta, { t: V.atnaujinta(dabar.meta.atnaujinta, l) })];
      if (dabar.auto) m.unshift(fmt(t.praplesta, { k0: dabar.pradinis, k: dabar.prefiksas }));
      rez.appendChild(el("p", "gpvr-maz", m.join(" ")));
      // Grupės keitimas
      var gr = el("div", "gpvr-eil");
      var pilnas = pradzia(dabar.g && dabar.g.bvpz);
      if (pilnas && pilnas.length > dabar.prefiksas.length && pilnas.indexOf(dabar.prefiksas) === 0) { var s1 = el("button", "gpvr-btn", t.siauriau); s1.type = "button"; s1.addEventListener("click", function () { siauriau(); }); gr.appendChild(s1); }
      if (dabar.prefiksas.length > 2) { var p1 = el("button", "gpvr-btn", t.placiau); p1.type = "button"; p1.addEventListener("click", function () { gauk(dabar.prefiksas.slice(0, -1), false); }); gr.appendChild(p1); }
      if (gr.childNodes.length) rez.appendChild(gr);
      // Rodikliai
      var dl = el("dl", "gpvr-kpi");
      [[t.paskelbta, s.viso], [t.aktyvus, s.aktyvus], [t.nutraukta, s.nutraukta + (s.viso ? " (" + Math.round(100 * s.nutraukta / s.viso) + " %)" : "")],
       [t.rinkos, s.rinkosKonsultacijos], [t.tarpt, s.tarptautiniai], [t.es, s.esLesos]].forEach(function (x) {
        var d = el("div"); d.appendChild(el("dt", null, x[0])); d.appendChild(el("dd", null, String(x[1]))); dl.appendChild(d);
      });
      rez.appendChild(dl);
      // Pasiūlymų teikimo laikotarpis pagal būdą
      // Būdas - dabartinis formos (perpiešiant be užklausos jis galėjo pasikeisti); BVPŽ ir objektas - užklausos
      var gDabar = (o.gauk && o.gauk()) || dabar.g || {};
      var mano = gDabar.budas && V.vptBudas ? V.vptBudas(gDabar.budas, gDabar.rezimas) : null, manoMed = null;
      var ist = function (p) { return V.procedurosIstatymas ? V.procedurosIstatymas(p) : null; }, suIstatymu = false, praleista = false, neisversti = [];
      var manoSistema = !!(mano && mano.proceduros.every(function (p) { return SISTEMOS[p]; }));
      var eil = (s.terminai || []).filter(function (x) {
        if (x.budas === "Preliminary Market Consultation") return false;
        if (SISTEMOS[x.budas]) { praleista = true; return false; }
        return true;
      }).map(function (x) {
        var b = V.kodas(x.budas, V.PROCEDUROS, l), is = ist(x.budas);
        if (!(b && b.isverstas) && neisversti.indexOf(x.budas) < 0) neisversti.push(x.budas);
        if (is) suIstatymu = true;
        var jusu = !!(mano && mano.proceduros.indexOf(x.budas) >= 0 && (mano.tarptautinis === null || x.tarptautinis === mano.tarptautinis));
        if (jusu && x.mediana !== undefined && (!manoMed || x.n > manoMed.n)) manoMed = x;
        return { x: x, jusu: jusu, pav: (b ? b.tekstas : x.budas) + (is ? " (" + (is === "PI" ? "PĮ" : "VPĮ") + ")" : "") +
          (x.tarptautinis === true ? " - " + t.tarptT : x.tarptautinis === false ? " - " + t.tarptS : "") };
      });
      var rastas = eil.some(function (x) { return x.jusu; });
      // Modulio grafiko etapas (pvz. pirkimų grafikai) - greta CVP IS medianos, prieš lentelę
      var mg = o.mano ? o.mano() : null;
      if (mg && mg.pavadinimas && mg.dd > 0) {
        var mt = mg.kd > 0 ? fmt(t.mano, { p: mg.pavadinimas, kd: mg.kd, dd: mg.dd }) : fmt(t.manoDd, { p: mg.pavadinimas, dd: mg.dd });
        if (manoMed) mt += fmt(t.manoMed, { m: skaicius(manoMed.mediana, l) });
        rez.appendChild(el("p", "gpvr-mano", mt));
      }
      // Lentelė: jūsų būdas pirmas, toliau - kaip serveris (pagal pirkimų skaičių); retos (mažiau kaip 5 pirkimai, ne jūsų) - eilute po ja
      var rodomos = eil.filter(function (x) { return x.jusu; }).concat(eil.filter(function (x) { return !x.jusu && x.x.mediana !== undefined; }));
      var retos = eil.filter(function (x) { return !x.jusu && x.x.mediana === undefined; });
      if (rodomos.length) {
        // Pavadinimas - virš slenkančio rėmelio (siaurame ekrane lentelė slenka, o caption būtų nukirptas)
        var lw = el("div", "gpvr-lent"), tb = el("table"), th = el("thead"), tr = el("tr"), tbo = el("tbody"), cap = el("p", "gpvr-h", t.terminaiH);
        cap.id = pag.id + "-t"; tb.setAttribute("aria-labelledby", cap.id); rez.appendChild(cap);
        [[t.budas, ""], [t.med, "sk"], [t.puse, "sk"], [t.n, "sk"]].forEach(function (x) { var c = el("th", x[1], x[0]); c.scope = "col"; tr.appendChild(c); });
        th.appendChild(tr); tb.appendChild(th);
        rodomos.forEach(function (e) {
          var x = e.x, r = el("tr"), c0 = el("th", null, e.pav);
          if (e.jusu) { r.className = "gpvr-jusu"; c0.appendChild(el("span", "gpvr-zyme", "← " + t.jusu)); }
          c0.scope = "row"; r.appendChild(c0);
          if (x.mediana === undefined) { var c = el("td", null, t.mazai); c.colSpan = 2; r.appendChild(c); }
          else { r.appendChild(el("td", "sk", skaicius(x.mediana, l))); r.appendChild(el("td", "sk", skaicius(x.p25, l) + "-" + skaicius(x.p75, l))); }
          r.appendChild(el("td", "sk", String(x.n)));
          tbo.appendChild(r);
        });
        tb.appendChild(tbo); lw.appendChild(tb); rez.appendChild(lw);
      }
      if (retos.length) rez.appendChild(el("p", "gpvr-maz", fmt(t.retos, { s: retos.map(function (x) { return x.pav + " (" + x.x.n + ")"; }).join("; ") })));
      if (mano && !rastas && !manoSistema) rez.appendChild(el("p", "gpvr-maz", t.kitiBudai));
      if (praleista || manoSistema) rez.appendChild(el("p", "gpvr-maz", t.sistemos));
      if (suIstatymu) rez.appendChild(el("p", "gpvr-maz", t.istatymas));
      if (neisversti.length) rez.appendChild(el("p", "gpvr-maz", fmt(t.neisversti, { s: neisversti.map(function (x) { return t.kab[0] + x + t.kab[1]; }).join(", ") })));
      // Kiti rodikliai
      var ul = el("ul");
      var vk = s.vertinimas || {}, kaina = vk["Lowest Price"] || 0, ekon = vk["MEAT"] || 0;
      if (kaina + ekon) ul.appendChild(el("li", null, t.vertinimasH + ": " + t.kaina + " " + Math.round(100 * kaina / (kaina + ekon)) + " %, " + t.ekon + " " + Math.round(100 * ekon / (kaina + ekon)) + " %"));
      var kv = function (pav, q, f) {
        if (!q || !q.n) return;
        ul.appendChild(el("li", null, pav + ": " + (q.mediana === undefined ? fmt(t.maziau, { n: q.n }) : f(q.mediana) + fmt(t.ribos, { a: f(q.p25), b: f(q.p75), n: q.n }))));
      };
      kv(t.sprendimasH, s.sprendimoDienos, function (v) { return fmt(t.dienos, { v: skaicius(v, l) }); });
      kv(t.sutartisH, s.sutartiesDienos, function (v) { return fmt(t.dienos, { v: skaicius(v, l) }); });
      kv(t.verteH, s.verte, function (v) { return eurai(v, l); });
      kv(t.trukmeH, s.trukmeMen, function (v) { return fmt(t.men, { v: skaicius(v, l) }); });
      if (ul.childNodes.length) rez.appendChild(ul);
      if (s.vykdytojai && s.vykdytojai.length) {
        rez.appendChild(el("p", "gpvr-h", t.vykdytojaiH));
        var u2 = el("ul");
        s.vykdytojai.slice(0, 5).forEach(function (v) { u2.appendChild(el("li", null, v.pavadinimas + " - " + v.kiekis)); });
        rez.appendChild(u2);
      }
      rez.appendChild(el("p", "gpvr-maz", t.pastaba));
    }
    function siauriau() {
      var g = (o.gauk && o.gauk()) || {}, pilnas = pradzia(g.bvpz) || dabar.prefiksas;
      var naujas = pilnas.indexOf(dabar.prefiksas) === 0 && pilnas.length > dabar.prefiksas.length ? pilnas.slice(0, dabar.prefiksas.length + 1) : null;
      if (naujas) gauk(naujas, false);
    }
    btn.addEventListener("click", function () { gauk(null, true); });
    if (typeof MutationObserver !== "undefined") new MutationObserver(function () { tekstai(); if (dabar.s) piesk(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return { rodyk: function () { return gauk(null, true); }, vieta: box, perpiesk: function () { if (dabar.s) piesk(); },
      isvalyk: function () { dabar = { prefiksas: null, pradinis: null, auto: false, s: null, meta: null, f: null, g: null }; rez.innerHTML = ""; if (global.GP_BUSENA) global.GP_BUSENA.slepk(busena); } };
  }

  global.GP_VPT_RINKA = { mount: mount, pradzia: pradzia, MAZIAUSIAI: MAZIAUSIAI };
})(typeof window !== "undefined" ? window : this);
