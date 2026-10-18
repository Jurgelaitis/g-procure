/* ============================================================================
 * G-Procure  shared/vpt-duomenys.js   (window.GP_VPT)
 * ----------------------------------------------------------------------------
 * VPT CVP IS API duomenys per G-Procure serverį (nuo 2026-10-18; serveris/README.md). Vienas klientas visiems
 * moduliams: PP-tiekejams (pirkimo duomenys, termino palyginimas), pirkimo kortelės puslapis (kortelės laukų
 * pasiūlymai pagal CVP IS numerį) ir portalo „Mano pirkimai“ (termino ir būsenos patikra).
 *
 *  - pirkimas(nr) - GET https://api.g-procure.com/api/cvpis/pirkimas/<nr> (tik 5-9 skaitmenys, be slapukų, be
 *    nukreipimo informacijos). Grąžina { ok: true, pirkimas, meta, nuoroda } arba { ok: false, rusis }:
 *    "nera" (įkeltame VPT sąraše nėra; su meta.atnaujinta), "neikelta" (serveryje sąrašas dar neįkeltas),
 *    "rysys" (ryšys, užklausų riba, netinkamas atsakymas), "numeris", "atsaukta". CVP IS nuoroda sudaroma čia,
 *    ne iš atsakymo - serverio tekstas į href nepatenka.
 *  - Žodynai PROCEDUROS / BUSENOS / DIREKTYVOS - verčiama tik tai, kas aišku; modulis rodo ir VPT kodą.
 *  - korteles(pirkimas) - kortelės laukų PASIŪLYMAI tuo pačiu pavidalu kaip shared/skelbimas.js atpazink():
 *    { laukai: [{ laukas, reiksme, citata, pastaba? }], pastabos: [] }. Patvirtina žmogus. Būdas - pagal VPT
 *    `procedure`, `aboveThreshold` (tarptautinė vertė) ir `directive` (be direktyvos - mažos vertės); atitikmenys
 *    patikrinti 2026-10-18 su 7 žinomais pirkimais (LITGRID, Amber Grid, EPSO-G, Energy cells); neaiškus - nesiūlomas.
 *  - paieska(filtrai) / statistika(filtrai) - /api/cvpis/paieska ir /statistika (q, vykdytojas, ca, cpv, tipas, budas, busena,
 *    nuo, iki, rikiuoti, psl - serveris/README.md); parametrų klaida - „parametrai“, ryšys ir neįkelta - ne „nieko nerasta“.
 *  - skirtumai(kortele, pirkimas) - kortelės pasiūlymų termino, paskelbimo datos ir būsenos skirtumai nuo VPT duomenų
 *    („Mano pirkimai“ patikra „Patikrinti CVP IS duomenis“, kortelių puslapio ?vpt=1).
 *
 * Duomenys - iki 6 val. senumo VPT sąrašo kopija; oficialiu šaltiniu lieka CVP IS. Datos - Lietuvos laikas.
 * Nieko nesaugo.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var API_BAZE = "https://api.g-procure.com/api/cvpis";
  var CVP_IS = "https://viesiejipirkimai.lt/epps/cft/prepareViewCfTWS.do?resourceId=";

  function pirkimas(id, opts) {
    opts = opts || {};
    id = String(id == null ? "" : id).trim();
    if (!/^\d{5,9}$/.test(id)) return Promise.resolve({ ok: false, rusis: "numeris" });
    var f = opts.fetch || global.fetch;
    if (typeof f !== "function") return Promise.resolve({ ok: false, rusis: "rysys" });
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var laik = ctl ? setTimeout(function () { ctl.abort(); }, opts.laikas || 15000) : null;
    if (ctl && opts.signal) { if (opts.signal.aborted) ctl.abort(); else opts.signal.addEventListener("abort", function () { ctl.abort(); }); }
    var baik = function (x) { if (laik) clearTimeout(laik); return x; };
    return Promise.resolve().then(function () {
      return f(API_BAZE + "/pirkimas/" + id, { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", headers: { "Accept": "application/json" }, signal: ctl ? ctl.signal : undefined });
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        var p = j && j.pirkimas;
        if (r.status === 200 && p && typeof p === "object" && p.id === +id) return baik({ ok: true, pirkimas: p, meta: (j.meta && typeof j.meta === "object") ? j.meta : {}, nuoroda: CVP_IS + id });
        if (r.status === 404 && j && j.meta && typeof j.meta === "object") return baik({ ok: false, rusis: "nera", meta: j.meta });
        if (r.status === 503) return baik({ ok: false, rusis: "neikelta" });
        return baik({ ok: false, rusis: "rysys", status: r.status });
      });
    }, function () {
      return baik({ ok: false, rusis: opts.signal && opts.signal.aborted ? "atsaukta" : "rysys" });
    });
  }

  /* Paieška ir statistika (serveris 2026-10-18b; serveris/README.md). Tik žinomi parametrai, reikšmės - per URLSearchParams
     (adresą sudaro šis failas). paieska() -> { ok: true, rezultatai, viso, psl, dydis, meta }, statistika() -> { ok: true, statistika, meta };
     klaida - { ok: false, rusis: "parametrai" (su serverio paaiškinimu - tik tekstui) / "neikelta" / "rysys" / "atsaukta" }. */
  var PARAMETRAI = ["q", "vykdytojas", "ca", "cpv", "tipas", "budas", "busena", "nuo", "iki", "rikiuoti", "psl"];
  function uzklausa(kelias, param, opts, tinka) {
    opts = opts || {};
    var sp = new URLSearchParams();
    PARAMETRAI.forEach(function (k) {
      var v = param ? param[k] : null;
      if (Array.isArray(v)) v = v.filter(function (x) { return x !== null && x !== undefined && String(x).trim(); }).join(",");
      if (v === null || v === undefined || v === false || String(v).trim() === "") return;
      sp.set(k, String(v === true ? "1" : v).trim().slice(0, 120));
    });
    if (!sp.toString()) return Promise.resolve({ ok: false, rusis: "parametrai" });
    var f = opts.fetch || global.fetch;
    if (typeof f !== "function") return Promise.resolve({ ok: false, rusis: "rysys" });
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var laik = ctl ? setTimeout(function () { ctl.abort(); }, opts.laikas || 15000) : null;
    if (ctl && opts.signal) { if (opts.signal.aborted) ctl.abort(); else opts.signal.addEventListener("abort", function () { ctl.abort(); }); }
    var baik = function (x) { if (laik) clearTimeout(laik); return x; };
    return Promise.resolve().then(function () {
      return f(API_BAZE + kelias + "?" + sp.toString(), { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", headers: { "Accept": "application/json" }, signal: ctl ? ctl.signal : undefined });
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (r.status === 200 && j && typeof j === "object") { var x = tinka(j); if (x) return baik(x); }
        if (r.status === 400) return baik({ ok: false, rusis: "parametrai", klaida: j && typeof j.klaida === "string" ? j.klaida.slice(0, 300) : "" });
        if (r.status === 503) return baik({ ok: false, rusis: "neikelta" });
        return baik({ ok: false, rusis: "rysys", status: r.status });
      });
    }, function () {
      return baik({ ok: false, rusis: opts.signal && opts.signal.aborted ? "atsaukta" : "rysys" });
    });
  }
  function paieska(param, opts) {
    return uzklausa("/paieska", param, opts, function (j) {
      if (!Array.isArray(j.rezultatai)) return null;
      var rez = j.rezultatai.filter(function (x) { return x && typeof x === "object" && typeof x.id === "number" && x.id > 0; }).slice(0, 50)
        .map(function (x) { x.nuoroda = CVP_IS + x.id; return x; });   // nuoroda - sudaroma čia, ne iš atsakymo
      return { ok: true, rezultatai: rez, viso: typeof j.viso === "number" ? j.viso : rez.length, psl: typeof j.psl === "number" ? j.psl : 1,
        dydis: typeof j.dydis === "number" ? j.dydis : 20, meta: j.meta && typeof j.meta === "object" ? j.meta : {} };
    });
  }
  function statistika(param, opts) {
    return uzklausa("/statistika", param, opts, function (j) {
      var s = j.statistika;
      if (!s || typeof s !== "object" || typeof s.viso !== "number") return null;
      return { ok: true, statistika: s, meta: j.meta && typeof j.meta === "object" ? j.meta : {} };
    });
  }

  // ---------------------------------------------------------------------------
  // VPT kodai -> žmogui
  // ---------------------------------------------------------------------------
  var PROCEDUROS = {
    "Open": { lt: "Atviras konkursas", en: "Open procedure" },
    "Simplified Open": { lt: "Supaprastintas atviras konkursas", en: "Simplified open procedure" },
    "Restricted": { lt: "Ribotas konkursas", en: "Restricted procedure" },
    "Negotiated with prior call for competition": { lt: "Skelbiamos derybos", en: "Negotiated procedure with prior call for competition" },
    "Negotiated without prior call for competition": { lt: "Neskelbiamos derybos", en: "Negotiated procedure without prior call for competition" },
    "Negotiated without prior publication": { lt: "Neskelbiamos derybos", en: "Negotiated procedure without prior publication" },
    "Competitive dialogue": { lt: "Konkurencinis dialogas", en: "Competitive dialogue" },
    "Innovation partnership": { lt: "Inovacijų partnerystė", en: "Innovation partnership" },
    "Preliminary Market Consultation": { lt: "Rinkos konsultacija", en: "Preliminary market consultation" },
    "DPS Specific Contract": { lt: "Konkretus pirkimas pagal DPS", en: "Specific contract under a DPS" },
    "Dynamic Purchasing System": { lt: "Dinaminė pirkimų sistema", en: "Dynamic purchasing system" }
  };
  var BUSENOS = {
    "Published": { lt: "Paskelbtas", en: "Published" },
    "Bid submission": { lt: "Pasiūlymų teikimas", en: "Tender submission" },
    "Proposal Submission": { lt: "Pasiūlymų teikimas", en: "Tender submission" },
    "Proposal Submission Closed": { lt: "Pasiūlymų teikimas baigtas", en: "Tender submission closed" },
    "Awaiting bid opening": { lt: "Laukiama pasiūlymų atplėšimo", en: "Awaiting tender opening" },
    "Evaluation": { lt: "Vertinimas", en: "Evaluation" },
    "Cancelled": { lt: "Nutrauktas", en: "Cancelled" }
  };
  var DIREKTYVOS = {
    "prompt.directive.classic": { lt: "2014/24/ES (klasikinė)", en: "2014/24/EU (classic)" },
    "prompt.directive.utilities": { lt: "2014/25/ES (sektorinė)", en: "2014/25/EU (utilities)" },
    "prompt.directive.defence": { lt: "2009/81/EB (gynyba ir saugumas)", en: "2009/81/EC (defence and security)" },
    "prompt.directive.concession": { lt: "2014/23/ES (koncesijos)", en: "2014/23/EU (concessions)" },
    "prompt.directive.none": { lt: "netaikoma", en: "not applicable" }
  };
  function kodas(k, zodynas, lang) {
    if (typeof k !== "string" || !k) return null;
    var z = zodynas[k];
    return { tekstas: z ? z[lang === "en" ? "en" : "lt"] : k, kodas: k, isverstas: !!z };
  }
  // „24_months“ -> „24 mėn.“; kita - kaip yra
  function trukme(s, lang) {
    var m = /^(\d{1,4})_(days|weeks|months|years)$/.exec(String(s || ""));
    if (!m) return s || null;
    var V = { lt: { days: "d.", weeks: "sav.", months: "mėn.", years: "m." }, en: { days: "days", weeks: "weeks", months: "months", years: "years" } };
    return m[1] + " " + V[lang === "en" ? "en" : "lt"][m[2]];
  }
  // Trukmė mėnesiais - tik iš „N_months“ ir „N_years“ (dienos ir savaitės - ne)
  function trukmeMen(s) {
    var m = /^(\d{1,4})_(months|years)$/.exec(String(s || ""));
    if (!m) return null;
    var n = +m[1] * (m[2] === "years" ? 12 : 1);
    return n >= 1 && n <= 600 ? n : null;
  }
  // TED nuorodos - tik https://ted.europa.eu/ (serveris jau tikrina; čia - dar kartą prieš dedant į href)
  function ted(v) {
    return (Array.isArray(v) ? v : []).filter(function (x) { return typeof x === "string" && /^https:\/\/ted\.europa\.eu\/[A-Za-z0-9\-._~\/?=&%#:+]{1,300}$/.test(x); }).slice(0, 10);
  }
  // Sąrašo atnaujinimo laikas (UTC iš serverio) Lietuvos laiku
  function atnaujinta(iso, lang) {
    if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(iso)) return "-";
    return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  }

  // ---------------------------------------------------------------------------
  // Kortelės laukų pasiūlymai
  // ---------------------------------------------------------------------------
  var KLASIKINE = "prompt.directive.classic", SEKTORINE = "prompt.directive.utilities", NETAIKOMA = "prompt.directive.none";
  /* Būdas. T- / S- - pagal tarptautinę vertę (aboveThreshold), tik klasikinei ar sektorinei direktyvai; be direktyvos -
     mažos vertės („Simplified Open“ - skelbiama apklausa, „... with negotiations“ - su derybomis). Gynybos ir koncesijų
     direktyvos - kiti įstatymai, nesiūloma. */
  var BUDU = {
    "Open": { t: "T-AK", s: "S-AK" },
    "Negotiated with prior call for competition": { t: "T-SD", s: "S-SD" },
    "Negotiated without prior call for competition": { t: "T-ND", s: "S-ND" },
    "Negotiated without prior publication": { t: "T-ND", s: "S-ND" },
    "Restricted": { visada: "RK" },
    "Competitive dialogue": { visada: "KD" },
    "Innovation partnership": { visada: "IP" },
    "DPS Specific Contract": { visada: "DPS-K" },
    "Dynamic Purchasing System": { visada: "DPS" },
    "Simplified Open with negotiations": { mv: "MV-SAD" },
    "Simplified Open": { mv: "MV-SAB" }
  };
  function budas(p) {
    var b = p && BUDU[p.procedure], id = null, pagrindas = null;
    if (!b) return null;
    if (b.mv) { if (p.directive === NETAIKOMA) { id = b.mv; pagrindas = "mv"; } }
    else if (p.directive === KLASIKINE || p.directive === SEKTORINE) {
      if (b.visada) { id = b.visada; pagrindas = "procedura"; }
      else if (p.aboveThreshold === true) { id = b.t; pagrindas = "tarptautinis"; }
      else if (p.aboveThreshold === false) { id = b.s; pagrindas = "supaprastintas"; }
    }
    if (!id || (global.GP_METHODS && !global.GP_METHODS.isValid(id))) return null;
    return { id: id, pagrindas: pagrindas };
  }
  var KORTELES_BUSENOS = {
    "Published": "paskelbtas", "Bid submission": "paskelbtas", "Proposal Submission": "paskelbtas",
    "Proposal Submission Closed": "vertinamas", "Awaiting bid opening": "vertinamas", "Evaluation": "vertinamas",
    "Cancelled": "nutrauktas"
  };
  var OBJEKTAI = { "Supplies": "prekes", "Services": "paslaugos", "Works": "darbai" };

  function bvpzPilnas(k) {
    var m = /^(\d{8})(-\d)?$/.exec(String(k || ""));
    if (!m) return null;
    var D = global.GP_CPV_DATA && global.GP_CPV_DATA.codes;
    if (!D) return m[2] ? m[0] : null;
    for (var i = 0; i < D.length; i++) if (String(D[i][0]).slice(0, 8) === m[1]) return D[i][0];
    return null;
  }

  var PASTABOS = {
    lt: { neregistre: "Pirkimo vykdytojas „{p}“ organizacijų registre nerastas - vykdytojo nesiūlome.",
          mv: "VPT duomenyse direktyva netaikoma (mažos vertės pirkimas) - įstatymo nesiūlome; kurį taiko pirkimas, nurodo pirkimo dokumentai.",
          direktyva: "VPT direktyva „{d}“ - ne PĮ ar VPĮ pirkimas arba nenurodyta; režimo nesiūlome.",
          budas: "VPT būdo kodo „{b}“ ({r}) kortelės būdu nepaverčiame - pasirinkite patys.",
          rinkos: "Tai rinkos konsultacija, ne pirkimas - būdo ir būsenos nesiūlome.",
          bvpz: "BVPŽ kodo „{k}“ žodyne nerasta - įveskite patys.",
          busena: "VPT būsena „{b}“ - kortelės būseną pasirinkite patys.",
          tarptautine: "tarptautinė vertė: {v}", direktyvaZ: "direktyva: {d}",
          budasT: "pagal VPT: tarptautinės vertės pirkimas", budasS: "pagal VPT: ne tarptautinės vertės pirkimas",
          budasMv: "pagal VPT: direktyva netaikoma - mažos vertės skelbiama apklausa; ar numatytos derybos - patikrinkite pirkimo dokumentuose",
          terminas: "VPT sąrašo duomenys - iki 6 val. senumo; galioja CVP IS",
          paskelbimas: "faktinė paskelbimo data" },
    en: { neregistre: "Contracting entity “{p}” is not in the organisation register - no entity suggested.",
          mv: "In the VPT data no directive applies (low-value procurement) - no law suggested; the procurement documents state which one applies.",
          direktyva: "VPT directive “{d}” - not a PĮ or VPĮ procurement, or not stated; no regime suggested.",
          budas: "The VPT procedure code “{b}” ({r}) is not converted into a card procedure - choose it yourself.",
          rinkos: "This is a market consultation, not a procurement - no procedure or status suggested.",
          bvpz: "CPV code “{k}” not found in the vocabulary - enter it yourself.",
          busena: "VPT status “{b}” - choose the card status yourself.",
          tarptautine: "above EU threshold: {v}", direktyvaZ: "directive: {d}",
          budasT: "per VPT: above the EU threshold", budasS: "per VPT: below the EU threshold",
          budasMv: "per VPT: no directive applies - low-value published survey; check in the procurement documents whether negotiations are foreseen",
          terminas: "VPT list data - up to 6 hours old; CVP IS prevails",
          paskelbimas: "actual publication date" }
  };

  /* Grąžina { laukai: [{ laukas, reiksme, citata, pastaba? }], pastabos: [] } - kaip shared/skelbimas.js atpazink() */
  function korteles(p, kalba) {
    var P = PASTABOS[kalba === "en" ? "en" : "lt"], laukai = [], pastabos = [];
    if (!p || typeof p !== "object") return { laukai: laukai, pastabos: pastabos };
    var tx = function (v, max) { return typeof v === "string" ? v.slice(0, max || 240) : ""; };
    var prideti = function (laukas, reiksme, citata, pastaba) {
      var x = { laukas: laukas, reiksme: reiksme, citata: String(citata || "").slice(0, 240) };
      if (pastaba) x.pastaba = pastaba;
      laukai.push(x);
    };
    var keisk = function (t, o) { return t.replace(/\{(\w)\}/g, function (m, k) { return o[k] != null ? String(o[k]) : m; }); };

    if (typeof p.title === "string" && p.title.trim()) prideti("pavadinimas", p.title.trim().slice(0, 300), "title: " + tx(p.title));
    if (typeof p.caName === "string" && p.caName.trim()) {
      var org = global.GP_ORG && global.GP_ORG.rask(p.caName);
      if (org) prideti("vykdytojas", org.id, "caName: " + tx(p.caName));
      else pastabos.push(keisk(P.neregistre, { p: tx(p.caName, 120) }));
    }
    var rinkos = p.procedure === "Preliminary Market Consultation";
    if (p.directive === KLASIKINE) prideti("rezimas", "VPI", "directive: " + p.directive);
    else if (p.directive === SEKTORINE) prideti("rezimas", "PI", "directive: " + p.directive);
    else if (p.directive === NETAIKOMA) pastabos.push(P.mv);
    else if (!rinkos) pastabos.push(keisk(P.direktyva, { d: tx(p.directive || "-", 60) }));

    if (OBJEKTAI[p.procurementType]) prideti("objektas", OBJEKTAI[p.procurementType], "procurementType: " + p.procurementType);
    if (rinkos) pastabos.push(P.rinkos);
    else if (typeof p.procedure === "string" && p.procedure) {
      var b = budas(p), cit = "procedure: " + tx(p.procedure, 80) + "; " + keisk(P.tarptautine, { v: String(p.aboveThreshold) }) + "; " + keisk(P.direktyvaZ, { d: tx(p.directive || "-", 60) });
      if (b) prideti("budas", b.id, cit, b.pagrindas === "tarptautinis" ? P.budasT : b.pagrindas === "supaprastintas" ? P.budasS : b.pagrindas === "mv" ? P.budasMv : null);
      else pastabos.push(keisk(P.budas, { b: tx(p.procedure, 80), r: keisk(P.tarptautine, { v: String(p.aboveThreshold) }) + ", " + keisk(P.direktyvaZ, { d: tx(p.directive || "-", 60) }) }));
    }
    var cpv = Array.isArray(p.cpvCodes) ? p.cpvCodes.filter(function (x) { return typeof x === "string"; }) : [];
    if (cpv.length) {
      var pilnas = bvpzPilnas(cpv[0]);
      if (pilnas) prideti("bvpz", pilnas, "cpvCodes: " + cpv.slice(0, 5).join(", "));
      else pastabos.push(keisk(P.bvpz, { k: tx(cpv[0], 20) }));
    }
    if (typeof p.estimatedValue === "number" && isFinite(p.estimatedValue) && p.estimatedValue > 0) prideti("verte", p.estimatedValue, "estimatedValue: " + p.estimatedValue);
    var men = trukmeMen(p.contractDuration);
    if (men) prideti("trukmeMen", men, "contractDuration: " + tx(p.contractDuration, 30));
    var iso = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}$/;
    var tm = typeof p.tenderSubmissionDeadline === "string" && iso.exec(p.tenderSubmissionDeadline);
    if (tm) prideti("pasiulymuTerminas", tm[1] + "T" + tm[2], "tenderSubmissionDeadline: " + p.tenderSubmissionDeadline, P.terminas);
    var pd = typeof p.datePublished === "string" && iso.exec(p.datePublished);
    if (pd) prideti("paskelbimas", pd[1], "datePublished: " + p.datePublished, P.paskelbimas);
    if (!rinkos && typeof p.status === "string" && p.status) {
      if (KORTELES_BUSENOS[p.status]) prideti("busena", KORTELES_BUSENOS[p.status], "status: " + tx(p.status, 60));
      else pastabos.push(keisk(P.busena, { b: tx(p.status, 60) }));
    }
    if (typeof p.id === "number" && p.id > 0) prideti("cvpisNr", String(p.id), "id: " + p.id);
    return { laukai: laukai, pastabos: pastabos };
  }

  /* Kortelės ir VPT duomenų skirtumai „Mano pirkimai“ patikrai (2026-10-18) - tik tai, ką CVP IS keičia pirkimo eigoje:
     pasiūlymų terminas (pratęsimai), paskelbimo data ir būsena. Būsena - tik kai VPT būsena vėlesnė už kortelės arba pirkimas
     nutrauktas (ankstesnė - ne: kortelę žmogus galėjo pažengti pats; rinkos konsultacijai - ne). Grąžina
     { skirtumai: [{ laukas, kortele, vpt, kodas? }], palyginta: [laukai, kuriuos VPT duomenyse buvo su kuo palyginti] }. */
  var EIGA = ["planuojamas", "rengiamas", "paskelbtas", "vertinamas", "sutartis"];
  function skirtumai(k, p) {
    var r = { skirtumai: [], palyginta: [] };
    if (!k || typeof k !== "object" || !p || typeof p !== "object") return r;
    var iso = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}$/;
    var tm = typeof p.tenderSubmissionDeadline === "string" && iso.exec(p.tenderSubmissionDeadline);
    if (tm) {
      r.palyginta.push("pasiulymuTerminas");
      if (tm[1] + "T" + tm[2] !== String(k.pasiulymuTerminas || "")) r.skirtumai.push({ laukas: "pasiulymuTerminas", kortele: String(k.pasiulymuTerminas || ""), vpt: tm[1] + "T" + tm[2] });
    }
    var pd = typeof p.datePublished === "string" && iso.exec(p.datePublished);
    if (pd) {
      r.palyginta.push("paskelbimas");
      if (pd[1] !== String(k.paskelbimas || "")) r.skirtumai.push({ laukas: "paskelbimas", kortele: String(k.paskelbimas || ""), vpt: pd[1] });
    }
    var vb = p.procedure === "Preliminary Market Consultation" ? null : KORTELES_BUSENOS[p.status];
    if (vb) {
      r.palyginta.push("busena");
      if (vb !== k.busena && k.busena !== "nutrauktas" && (vb === "nutrauktas" || EIGA.indexOf(vb) > EIGA.indexOf(k.busena)))
        r.skirtumai.push({ laukas: "busena", kortele: String(k.busena || ""), vpt: vb, kodas: String(p.status).slice(0, 60) });
    }
    return r;
  }

  global.GP_VPT = {
    API_BAZE: API_BAZE, pirkimas: pirkimas, kodas: kodas, trukme: trukme, trukmeMen: trukmeMen, ted: ted, atnaujinta: atnaujinta,
    PROCEDUROS: PROCEDUROS, BUSENOS: BUSENOS, DIREKTYVOS: DIREKTYVOS, budas: budas, korteles: korteles, skirtumai: skirtumai,
    paieska: paieska, statistika: statistika
  };
})(typeof window !== "undefined" ? window : this);
