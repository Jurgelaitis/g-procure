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
 *  - dokumentai(nr, { eiga, signal }) - /api/cvpis/dokumentai/<nr> (nuo 2026-10-29): viešas pirkimo dokumentų ZIP iš CVP IS per serverį
 *    (srautu, serveris nieko nesaugo) -> { ok: true, blob, baitai, vardas } arba { ok: false, rusis }; dokumentuKlaida(rusis, kalba).
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
  // Rinkos konsultacijos pirkimo puslapis prašo prisijungti, o dokumentų sąrašas viešas (patikrinta 2026-11-04)
  var CVP_IS_DOKUMENTAI = "https://viesiejipirkimai.lt/epps/cft/listContractDocuments.do?resourceId=";
  var RINKOS_KONS = "Preliminary Market Consultation";
  function nuorodaI(p) { return (p && p.procedure === RINKOS_KONS ? CVP_IS_DOKUMENTAI : CVP_IS) + p.id; }
  // Pavadinime įrašytas „nutrauktas“ (naudotojo sprendimas 2026-11-04): pavadinime toks žodis rašomas tik nutrauktam pirkimui, nors CVP IS būsena
  // dažnai lieka „Pasiūlymų teikimas“ (2026-11-04 tokių aktyvių - apie 50). „(NUTRAUKTA 7 PIRKIMO DALIS)“ - tik dalis, ne viso pirkimo būsena.
  var NUTR_ZODIS = /(^|[^\p{L}\p{N}])nutraukta(s?)(?=$|[^\p{L}\p{N}])/iu;
  var NUTR_DALIS = /(^|[^\p{L}\p{N}])(nutraukta|nutrauktos|nutrauktų)(\s+[^\s]+){0,3}\s+dal(is|ys|ių|ies)(?=$|[^\p{L}\p{N}])|(^|[^\p{L}\p{N}])dal(is|ys|ių|ies)(\s+[^\s]+){0,3}\s+(nutraukta|nutrauktos)(?=$|[^\p{L}\p{N}])/iu;
  function nutrauktaPavadinime(p) {
    var t = p && typeof p.title === "string" ? p.title : "";
    if (NUTR_DALIS.test(t)) return "dalis";
    return NUTR_ZODIS.test(t) ? "visas" : null;
  }
  // Pirkimas, kuriame tiekėjas nebedalyvauja: nutrauktas (CVP IS būsena arba žodis pavadinime)
  function nutrauktas(p) { return !!p && (p.status === "Cancelled" || p.status === "Terminated" || nutrauktaPavadinime(p) === "visas"); }
  // activeCycle (VPT): 1 - pirmas etapas; 2 ir daugiau - po paraiškų ar pirminių pasiūlymų, terminas skirtas tolesnio etapo dalyviams.
  // Sutikrinta 2026-11-04 su CVP IS kvietimų datomis: 8 pirkimai - 2 ir daugiau, tikras pratęsimas - 1.
  var KELI_ETAPAI = /^(Negotiated with prior call for competition|Competitive with negotiation|Restricted|Accelerated restricted|Competitive dialogue|Innovation partnership|Negotiated with publication|Accelerated negotiated with publication|Involving negotiations|Simplified Open with negotiations)$/;
  function tolesnisEtapas(p) { return !!p && KELI_ETAPAI.test(String(p.procedure || "")) && typeof p.activeCycle === "number" && p.activeCycle >= 2; }
  function rinkosKonsultacija(p) { return !!p && p.procedure === RINKOS_KONS; }
  function sistema(p) { return !!p && (p.procedure === "Dynamic Purchasing System" || p.procedure === "Qualification System"); }

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
        if (r.status === 200 && p && typeof p === "object" && p.id === +id) return baik({ ok: true, pirkimas: p, meta: (j.meta && typeof j.meta === "object") ? j.meta : {}, nuoroda: nuorodaI(p) });
        if (r.status === 404 && j && j.meta && typeof j.meta === "object") return baik({ ok: false, rusis: "nera", meta: j.meta });
        if (r.status === 503) return baik({ ok: false, rusis: "neikelta" });
        return baik({ ok: false, rusis: "rysys", status: r.status });
      });
    }, function () {
      return baik({ ok: false, rusis: opts.signal && opts.signal.aborted ? "atsaukta" : "rysys" });
    });
  }

  /* Pirkimo dokumentų ZIP iš CVP IS per G-Procure serverį (nuo 2026-10-29; serveris/README.md): GET /api/cvpis/dokumentai/<nr>.
     Serveris dokumentus perduoda srautu, kaip CVP IS juos atiduoda be prisijungimo, ir nieko neišsaugo. Grąžina
     { ok: true, blob, baitai, vardas } arba { ok: false, rusis }: "prisijungimas" (CVP IS dokumentus rodo tik prisijungusiems -
     pvz. konkretus pirkimas pagal DPS), "nera", "per_didelis", "ne_zip", "uzimta" (užklausų riba), "rysys", "numeris", "atsaukta".
     opts.eiga(gauta, viso) - eigai (viso - iš Content-Length, gali būti 0). Tekstai žmogui - dokumentuKlaida(rusis, kalba). */
  var DOK_RUSYS = ["prisijungimas", "nera", "rysys", "per_didelis", "ne_zip", "uzimta", "kilme", "numeris", "metodas"];
  var DOK_MAX = 250 * 1048576;
  var DOK_TEKSTAI = {
    lt: {
      prisijungimas: "CVP IS šio pirkimo dokumentus rodo tik prisijungusiems (pvz. konkretus pirkimas pagal DPS - tik DPS dalyviams). Prisijunkite prie CVP IS, atsisiųskite dokumentus ir įkelkite juos čia.",
      nera: "CVP IS šio pirkimo dokumentų nepateikė - galbūt jie dar neskelbti. Patikrinkite pirkimo puslapį CVP IS.",
      per_didelis: "Dokumentų paketas didesnis nei 250 MB - atsisiųskite jį iš CVP IS ir įkelkite čia.",
      ne_zip: "CVP IS grąžino ne dokumentų paketą - atsisiųskite dokumentus iš CVP IS ir įkelkite čia.",
      uzimta: "Šiuo metu siunčiama per daug dokumentų paketų - pabandykite po minutės.",
      numeris: "Netinkamas pirkimo numeris.",
      rysys: "CVP IS dokumentų gauti nepavyko (ryšys ar CVP IS klaida). Bandykite dar kartą arba atsisiųskite dokumentus iš CVP IS ir įkelkite čia."
    },
    en: {
      prisijungimas: "CVP IS shows the documents of this procurement only to signed-in users (e.g. a specific contract under a DPS - only to DPS participants). Sign in to CVP IS, download the documents and upload them here.",
      nera: "CVP IS returned no documents for this procurement - they may not be published yet. Check the procurement page in CVP IS.",
      per_didelis: "The document package is larger than 250 MB - download it from CVP IS and upload it here.",
      ne_zip: "CVP IS did not return a document package - download the documents from CVP IS and upload them here.",
      uzimta: "Too many document packages are being downloaded right now - try again in a minute.",
      numeris: "Invalid procurement number.",
      rysys: "Could not get the documents from CVP IS (connection or CVP IS error). Try again, or download the documents from CVP IS and upload them here."
    }
  };
  function dokumentuKlaida(rusis, kalba) {
    var T = DOK_TEKSTAI[kalba === "en" ? "en" : "lt"];
    return T[rusis] || T.rysys;
  }
  function dokumentai(id, opts) {
    opts = opts || {};
    id = String(id == null ? "" : id).trim();
    if (!/^\d{5,9}$/.test(id)) return Promise.resolve({ ok: false, rusis: "numeris" });
    var f = opts.fetch || global.fetch;
    if (typeof f !== "function") return Promise.resolve({ ok: false, rusis: "rysys" });
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var laik = ctl ? setTimeout(function () { ctl.abort(); }, opts.laikas || 200000) : null;   // serveris - 180 s
    if (ctl && opts.signal) { if (opts.signal.aborted) ctl.abort(); else opts.signal.addEventListener("abort", function () { ctl.abort(); }); }
    var baik = function (x) { if (laik) clearTimeout(laik); return x; };
    var nutrauktas = function () { return { ok: false, rusis: opts.signal && opts.signal.aborted ? "atsaukta" : "rysys" }; };
    return Promise.resolve().then(function () {
      return f(API_BAZE + "/dokumentai/" + id, { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", headers: { "Accept": "application/zip, application/json" }, signal: ctl ? ctl.signal : undefined });
    }).then(function (r) {
      if (r.status !== 200) {
        return r.json().catch(function () { return null; }).then(function (j) {
          var k = j && typeof j.kodas === "string" && DOK_RUSYS.indexOf(j.kodas) !== -1 ? j.kodas : "rysys";
          if (k === "kilme" || k === "metodas") k = "rysys";
          return baik({ ok: false, rusis: k, status: r.status });
        });
      }
      var viso = +(r.headers && r.headers.get ? r.headers.get("Content-Length") : 0) || 0;
      if (viso > DOK_MAX) return baik({ ok: false, rusis: "per_didelis" });
      var tikrink = function (buf) {
        var b = new Uint8Array(buf.slice ? buf.slice(0, 4) : buf);
        if (!(b.length >= 4 && b[0] === 0x50 && b[1] === 0x4B && ((b[2] === 3 && b[3] === 4) || (b[2] === 5 && b[3] === 6)))) return null;
        return true;
      };
      var eiga = typeof opts.eiga === "function" ? opts.eiga : function () {};
      var skaitytuvas = r.body && r.body.getReader ? r.body.getReader() : null;
      if (!skaitytuvas) {
        return r.arrayBuffer().then(function (buf) {
          if (buf.byteLength > DOK_MAX) return baik({ ok: false, rusis: "per_didelis" });
          if (!tikrink(buf)) return baik({ ok: false, rusis: "ne_zip" });
          eiga(buf.byteLength, viso || buf.byteLength);
          return baik({ ok: true, blob: new Blob([buf], { type: "application/zip" }), baitai: buf.byteLength, vardas: "CVP IS " + id + ".zip" });
        });
      }
      var dalys = [], gauta = 0;
      var skaityk = function () {
        return skaitytuvas.read().then(function (x) {
          if (x.done) {
            if (!dalys.length || !tikrink(dalys[0])) return baik({ ok: false, rusis: "ne_zip" });
            return baik({ ok: true, blob: new Blob(dalys, { type: "application/zip" }), baitai: gauta, vardas: "CVP IS " + id + ".zip" });
          }
          gauta += x.value.byteLength;
          if (gauta > DOK_MAX) { try { skaitytuvas.cancel(); } catch (e) {} return baik({ ok: false, rusis: "per_didelis" }); }
          dalys.push(x.value);
          eiga(gauta, viso);
          return skaityk();
        });
      };
      return skaityk();
    }).catch(function () { return baik(nutrauktas()); });
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
        .map(function (x) { x.nuoroda = nuorodaI(x); return x; });   // nuoroda - sudaroma čia, ne iš atsakymo
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
    // Pavadinimai - kaip CVP IS pirkimo puslapyje (patikrinta 2026-11-04): „Simplified Open“ - „Skelbiama apklausa“
    "Simplified Open": { lt: "Skelbiama apklausa", en: "Simplified open procedure" },
    "Simplified Open with negotiations": { lt: "Skelbiama apklausa su derybomis", en: "Simplified open procedure with negotiations" },
    "Simplified": { lt: "Mažos vertės pirkimas", en: "Low-value procurement" },
    "Specific Contract": { lt: "Konkretus pirkimas", en: "Specific contract" },
    "Negotiated with publication": { lt: "Skelbiamos derybos (gynyba ir saugumas)", en: "Negotiated procedure with publication (defence and security)" },
    "Accelerated negotiated with publication": { lt: "Skelbiamos derybos (pagreitinta procedūra)", en: "Accelerated negotiated procedure with publication" },
    "Accelerated restricted": { lt: "Ribotas konkursas (pagreitinta procedūra)", en: "Accelerated restricted procedure" },
    "Involving negotiations": { lt: "Derybos (koncesija)", en: "Procedure involving negotiations (concession)" },
    "Restricted": { lt: "Ribotas konkursas", en: "Restricted procedure" },
    "Negotiated with prior call for competition": { lt: "Skelbiamos derybos", en: "Negotiated procedure with prior call for competition" },
    // Klasikinės direktyvos (VPĮ) skelbiamos derybos VPT duomenyse - „Competitive with negotiation“ (2026-10-18b: visi 355 įrašai - klasikinė direktyva)
    "Competitive with negotiation": { lt: "Skelbiamos derybos", en: "Competitive procedure with negotiation" },
    "Accelerated open": { lt: "Atviras konkursas (sutrumpinti terminai)", en: "Accelerated open procedure" },
    "Qualification System": { lt: "Kvalifikacijos sistema", en: "Qualification system" },
    "cft.procedure.type.qs.specific.contract": { lt: "Konkretus pirkimas pagal kvalifikacijos sistemą", en: "Specific contract under a qualification system" },
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
    "Cancelled": { lt: "Nutrauktas", en: "Cancelled" },
    "Terminated": { lt: "Nutrauktas", en: "Terminated" },
    "Established": { lt: "Sukurta", en: "Established" },
    "Awarded": { lt: "Laimėtojas nustatytas", en: "Awarded" },
    "Concluded": { lt: "Užbaigtas", en: "Concluded" },
    "Closed": { lt: "Uždarytas", en: "Closed" }
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
    var z = Object.prototype.hasOwnProperty.call(zodynas, k) ? zodynas[k] : null;   // VPT duomenys - ne „toString“ ir pan.
    return { tekstas: z ? z[lang === "en" ? "en" : "lt"] : k, kodas: k, isverstas: !!z };
  }
  // Pirkimo būsena žmogui: žodis „nutrauktas“ pavadinime - būsena, CVP IS kodas lieka matomas
  function busena(p, lang) {
    if (p && !(p.status === "Cancelled" || p.status === "Terminated") && nutrauktaPavadinime(p) === "visas")
      return { tekstas: lang === "en" ? "Cancelled (according to the title)" : "Nutrauktas (pagal pavadinimą)", kodas: typeof p.status === "string" ? p.status : "", isverstas: true };
    return kodas(p && p.status, BUSENOS, lang);
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
    "Competitive with negotiation": { t: "T-SD", s: "S-SD", tik: KLASIKINE },
    "Accelerated open": { t: "T-AK", s: "S-AK" },
    "Qualification System": { visada: "KS", tik: SEKTORINE },
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
    else if ((p.directive === KLASIKINE || p.directive === SEKTORINE) && (!b.tik || p.directive === b.tik)) {
      if (b.visada) { id = b.visada; pagrindas = "procedura"; }
      else if (p.aboveThreshold === true) { id = b.t; pagrindas = "tarptautinis"; }
      else if (p.aboveThreshold === false) { id = b.s; pagrindas = "supaprastintas"; }
    }
    if (!id || (global.GP_METHODS && !global.GP_METHODS.isValid(id))) return null;
    return { id: id, pagrindas: pagrindas };
  }
  /* Atvirkščiai: kortelės būdas (GP_METHODS id) -> VPT procedūros ir tarptautinė vertė (rinkos duomenims, 2026-10-18b).
     MV-NR, MV-NZ, CPO, PS, VS ir KONC - VPT duomenyse aiškaus atitikmens nėra (null; „Simplified“ - mažos vertės, bet apklausos rūšis
     nenurodyta). Bazinis būdas (AK, SD, ND) - be tarptautinės vertės (null - abi). */
  var VPT_PAGAL_BUDA = {
    "T-AK": [["Open"], true], "S-AK": [["Open"], false],
    "T-SD": [["Negotiated with prior call for competition", "Competitive with negotiation"], true],
    "S-SD": [["Negotiated with prior call for competition", "Competitive with negotiation"], false],
    "T-ND": [["Negotiated without prior call for competition", "Negotiated without prior publication"], true],
    "S-ND": [["Negotiated without prior call for competition", "Negotiated without prior publication"], false],
    "AK": [["Open"], null], "SD": [["Negotiated with prior call for competition", "Competitive with negotiation"], null],
    "ND": [["Negotiated without prior call for competition", "Negotiated without prior publication"], null],
    "MV": [["Simplified Open", "Simplified Open with negotiations"], false], "KS": [["Qualification System"], null],
    "RK": [["Restricted"], null], "KD": [["Competitive dialogue"], null], "IP": [["Innovation partnership"], null],
    "DPS-K": [["DPS Specific Contract"], null], "DPS": [["Dynamic Purchasing System"], null],
    "MV-SAB": [["Simplified Open"], false], "MV-SAD": [["Simplified Open with negotiations"], false]
  };
  /* Derybų procedūrų pavadinimai VPT duomenyse priklauso nuo direktyvos (2026-10-18b, visi ~80 400 įrašų): „Negotiated with prior
     call for competition“ ir „Qualification System“ - tik sektorinė (PĮ), „Competitive with negotiation“ - tik klasikinė (VPĮ),
     „Negotiated without prior call for competition“ - 98 % sektorinė, „Negotiated without prior publication“ - 95 % klasikinė
     (likusios - gynybos). vptBudas(id, "PI" | "VPI") palieka to įstatymo procedūras (kitų nėra - visas). */
  var PROC_ISTATYMAS = {
    "Negotiated with prior call for competition": "PI", "Negotiated without prior call for competition": "PI", "Qualification System": "PI",
    "Competitive with negotiation": "VPI", "Negotiated without prior publication": "VPI"
  };
  function procedurosIstatymas(p) { return Object.prototype.hasOwnProperty.call(PROC_ISTATYMAS, p) ? PROC_ISTATYMAS[p] : null; }
  function vptBudas(id, rezimas) {
    var x = Object.prototype.hasOwnProperty.call(VPT_PAGAL_BUDA, id) ? VPT_PAGAL_BUDA[id] : null;
    if (!x) return null;
    var pr = x[0].filter(function (p) { return !rezimas || !PROC_ISTATYMAS[p] || PROC_ISTATYMAS[p] === rezimas; });
    return { proceduros: pr.length ? pr : x[0].slice(), tarptautinis: x[1] };
  }
  var KORTELES_BUSENOS = {
    "Published": "paskelbtas", "Bid submission": "paskelbtas", "Proposal Submission": "paskelbtas",
    "Proposal Submission Closed": "vertinamas", "Awaiting bid opening": "vertinamas", "Evaluation": "vertinamas",
    "Cancelled": "nutrauktas", "Terminated": "nutrauktas"
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
          paskelbimas: "paskelbimo CVP IS data - nuo jos skaičiuojami supaprastinto pirkimo terminai",
          paskelbimasT: "CVP IS paskelbimo data {d}. Tarptautinio pirkimo terminai skaičiuojami nuo skelbimo išsiuntimo iš VPT - jos VPT duomenyse nėra, ją rasite skelbimo PDF („Skelbimo išsiuntimo data“), todėl paskelbimo datos nesiūlome.",
          rinkosTerminas: "Rinkos konsultacijos atsakymų terminas {d} - tai ne pasiūlymų terminas, todėl kortelei nesiūlome." },
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
          paskelbimas: "date of publication in CVP IS - simplified procurement time limits run from it",
          paskelbimasT: "Published in CVP IS on {d}. International procurement time limits run from the dispatch of the notice from VPT - the VPT data do not have it; it is in the notice PDF (“Notice dispatch date”), so no publication date is suggested.",
          rinkosTerminas: "Market consultation response deadline {d} - not a tender deadline, so it is not suggested for the card." }
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
    /* Rinkos konsultacijos terminas - atsakymų, ne pasiūlymų (2026-11-06; iki tol kortelėje tapdavo „Pasiūlymų terminas“) */
    if (tm && rinkos) pastabos.push(keisk(P.rinkosTerminas, { d: tm[1] + " " + tm[2] }));
    else if (tm) prideti("pasiulymuTerminas", tm[1] + "T" + tm[2], "tenderSubmissionDeadline: " + p.tenderSubmissionDeadline, P.terminas);
    /* Paskelbimo data (2026-11-06): kortelėje - diena, nuo kurios skaičiuojami terminai (PĮ 53 str. 2 d. / VPĮ 40 str. 2 d.):
       tarptautiniam pirkimui - skelbimo išsiuntimas iš VPT, supaprastintam - paskelbimas CVP IS. VPT datePublished - paskelbimas
       CVP IS (tarptautinio - 1-5 d. po išsiuntimo), todėl tarptautiniam nesiūloma; iki tol perrašydavo išsiuntimo datą. */
    var pd = typeof p.datePublished === "string" && iso.exec(p.datePublished);
    if (pd && p.aboveThreshold === true) pastabos.push(keisk(P.paskelbimasT, { d: pd[1] }));
    else if (pd) prideti("paskelbimas", pd[1], "datePublished: " + p.datePublished, P.paskelbimas);
    if (!rinkos && typeof p.status === "string" && p.status) {
      if (nutrauktaPavadinime(p) === "visas") prideti("busena", "nutrauktas", "title: " + tx(p.title));
      else if (KORTELES_BUSENOS[p.status]) prideti("busena", KORTELES_BUSENOS[p.status], "status: " + tx(p.status, 60));
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
  /* VPT būsenos po vertinimo (2026-11-06): kortelėje atitikmens nėra (laimėtojas nustatytas, pirkimas užbaigtas ar uždarytas - ar sutartis
     sudaryta, VPT nesako), bet pirkimas pažengęs toliau už „Vertinami pasiūlymai“ - kortelės būsenai iki jos rodoma kaip skirtumas.
     Iki tol šios būsenos nebuvo atpažįstamos ir „Mano pirkimai“ rašydavo „sutampa“. */
  var PO_VERTINIMO = { "Awarded": 1, "Concluded": 1, "Closed": 1 };
  var TARPTAUTINIO_SKELBIMAS_IKI = 5;      // ES leidinių biuras skelbia ne vėliau kaip per 5 d. nuo išsiuntimo
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
      /* Tarptautiniam pirkimui kortelėje - išsiuntimo data (nuo jos skaičiuojami terminai), CVP IS - paskelbimo: sutampa, kai išsiųsta
         ne vėliau kaip paskelbta ir ne anksčiau kaip prieš 5 d. (iki 2026-11-06 - melagingas „skiriasi“). */
      var kd = /^\d{4}-\d{2}-\d{2}$/.test(String(k.paskelbimas || "").slice(0, 10)) ? String(k.paskelbimas).slice(0, 10) : "";
      var dsk = kd ? (Date.parse(pd[1] + "T00:00:00Z") - Date.parse(kd + "T00:00:00Z")) / 864e5 : NaN;
      var tinka = kd === pd[1] || (p.aboveThreshold === true && dsk >= 0 && dsk <= TARPTAUTINIO_SKELBIMAS_IKI);
      if (!tinka) r.skirtumai.push({ laukas: "paskelbimas", kortele: String(k.paskelbimas || ""), vpt: pd[1], tarptautinis: p.aboveThreshold === true });
    }
    /* Sutarties trukmė (2026-11-06, naudotojo sprendimas): skelbimo „Numatomas galiojimas“ rengėjai kartais užpildo pasiūlymo galiojimu,
       todėl iš PDF perkelta trukmė gali skirtis nuo CVP IS - lyginama, kai kortelėje trukmė įrašyta (be jos - ne skirtumas, o trūkstamas laukas). */
    var vm = trukmeMen(p.contractDuration);
    if (vm && k.trukmeMen > 0) {
      r.palyginta.push("trukmeMen");
      if (vm !== k.trukmeMen) r.skirtumai.push({ laukas: "trukmeMen", kortele: String(k.trukmeMen), vpt: String(vm) });
    }
    var rk = p.procedure === "Preliminary Market Consultation";
    var vb = rk ? null : nutrauktaPavadinime(p) === "visas" ? "nutrauktas" : KORTELES_BUSENOS[p.status];
    if (vb) {
      r.palyginta.push("busena");
      if (vb !== k.busena && k.busena !== "nutrauktas" && (vb === "nutrauktas" || EIGA.indexOf(vb) > EIGA.indexOf(k.busena)))
        r.skirtumai.push({ laukas: "busena", kortele: String(k.busena || ""), vpt: vb, kodas: String(p.status).slice(0, 60) });
    } else if (!rk && PO_VERTINIMO[p.status]) {
      r.palyginta.push("busena");
      if (k.busena !== "sutartis" && k.busena !== "nutrauktas")
        r.skirtumai.push({ laukas: "busena", kortele: String(k.busena || ""), vpt: "", kodas: String(p.status).slice(0, 60) });
    }
    return r;
  }

  global.GP_VPT = { nutrauktas: nutrauktas, nutrauktaPavadinime: nutrauktaPavadinime, busena: busena, tolesnisEtapas: tolesnisEtapas, rinkosKonsultacija: rinkosKonsultacija, sistema: sistema,
    API_BAZE: API_BAZE, pirkimas: pirkimas, kodas: kodas, trukme: trukme, trukmeMen: trukmeMen, ted: ted, atnaujinta: atnaujinta,
    PROCEDUROS: PROCEDUROS, BUSENOS: BUSENOS, DIREKTYVOS: DIREKTYVOS, budas: budas, korteles: korteles, skirtumai: skirtumai,
    paieska: paieska, statistika: statistika, vptBudas: vptBudas, procedurosIstatymas: procedurosIstatymas,
    dokumentai: dokumentai, dokumentuKlaida: dokumentuKlaida
  };
})(typeof window !== "undefined" ? window : this);
