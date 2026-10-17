/* ============================================================================
 * G-Procure Tiekėjams  cvpis.js
 * ----------------------------------------------------------------------------
 * CVP IS (viesiejipirkimai.lt, European Dynamics e-PPS) VIEŠŲ nuorodų sluoksnis
 * (window.GP_CVPIS). URL šablonai patikrinti 2026-09-02 (be prisijungimo,
 * HTTP 200) - žr. docs/tiekejams/cvpis-feasibility.md.
 *
 * MVP: tik NUORODOS (navigacija), NE fetch. CVP IS puslapiai ir VPT dokumentuota
 * duomenų API (2026-05-20, POST epps-integration/api/cft-details-export) CORS
 * antraščių neturi, o API reikalauja prieigos rakto (be jo - 401 „Please include
 * a valid apiKey“; patikrinta 2026-10-17), tad naršyklė jų nuskaityti negali -
 * tik serveris su VPT išduotu raktu (2 etapas, neįdiegta). Kol jo nėra, status()
 * grąžina aiškią techninę būseną, o įrankis NIEKADA neimituoja gyvos jungties.
 *
 * Nuo 2026-10-17: paieška pagal pavadinimą atveria CVP IS rezultatus (title=,
 * GET be sesijos), o visų dokumentų pakete esantis CVP IS dokumentų sąrašas
 * („List of Contract Documents“, <vykdytojo id>_<pirkimo id>.pdf) skaitomas
 * dokumentuSarasas() ir sulyginamas su perskaitytais failais (apreptis()) -
 * matyti, ar perskaityti visi paskelbti dokumentai ir kokie papildymai.
 *
 * PIRKIMO VYKDYTOJAS IR TEISINIS REŽIMAS (nuo 2026-09-24) nebėra konstanta:
 * jie atpažįstami iš įkelto skelbimo PDF teksto ir failo vardo
 * (atpazinkPirkeja, atpazinkRezima) ir PATVIRTINAMI naudotojo (index.html).
 * Kol nepatvirtinta - „nenustatyta“, o AI promptas neteigia jokio įstatymo.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var BASE = "https://viesiejipirkimai.lt/epps";
  var URL = {
    details:    function (id) { return BASE + "/cft/prepareViewCfTWS.do?resourceId=" + id; },
    documents:  function (id) { return BASE + "/cft/listContractDocuments.do?resourceId=" + id; },
    notices:    function (id) { return BASE + "/cft/viewContractNotices.do?resourceId=" + id; },
    noticePdf:  function (id) { return BASE + "/cft/downloadNoticeForAdvSearch.do?resourceId=" + id; },
    zipAll:     function (id) { return BASE + "/cft/prepareAnonymousDownload.do?resourceId=" + id + "&isContract=null"; },
    dpsDocuments: function (id) { return BASE + "/dps/listDPSContractDocuments.do?resourceId=" + id; },
    // Organizacijos pirkimų sąrašas nuo datos (GET be sesijos veikia; displaytag prefiksas d-3680175 gali keistis).
    // Pirkimo vykdytojo laukas priima dalinį pavadinimą (2026-09-24: „Amber Grid“, „EPSO-G“, „Energy cells“ - rado).
    organizacijosSarasas: function (pavadinimas, nuo) {
      var d = nuo || ((new Date()).getFullYear() + "-01-01");
      var p = d.split("-"); var ddmmyyyy = p[2] + "%2F" + p[1] + "%2F" + p[0];
      return BASE + "/viewCFTSAction.do?mode=search&isFTS=true&type=cftFTS&isPopup=false&contractAuthority=" + encodeURIComponent(String(pavadinimas || "")).replace(/%20/g, "+") + "&publicationFromDate=" + ddmmyyyy + "&d-3680175-p=1";
    },
    advancedSearch: BASE + "/prepareAdvancedSearch.do?type=cftFTS",
    // Paieška pagal pavadinimą (GET be sesijos, patikrinta 2026-10-17: „tipinių atramų projektavimo“ - 2 LITGRID pirkimai)
    paieska: function (tekstas) { return BASE + "/viewCFTSAction.do?mode=search&isFTS=true&type=cftFTS&isPopup=false&title=" + encodeURIComponent(String(tekstas || "").trim()).replace(/%20/g, "+") + "&d-3680175-p=1"; },
    latest: BASE + "/quickSearchAction.do?searchType=cftFTS&latest=true",
    home: BASE + "/home.do",
    register: BASE + "/prepareRegisterEOOrg.do?registerEO=true",
    espd: "https://ebvpd.eviesiejipirkimai.lt/espd-web/",
    vptSuppliers: "https://vpt.lrv.lt/lt/nauja-cvp-is-aktuali-nuo-2024-12-01/metodine-medziaga-instrukcijos/tiekejamsnaujaCVPIS/",
    ted: function (nr) { return "https://ted.europa.eu/en/notice/-/detail/" + nr; }
  };

  // Įėjimas: URL, resourceId arba laisvas tekstas -> ProcurementRef
  function resolve(input) {
    var s = String(input || "").trim();
    if (!s) return { ok: false, reason: "empty" };
    var m = /resourceId=(\d{5,9})/i.exec(s);
    if (m) return ref(m[1], "url", s);
    if (/^\d{5,9}$/.test(s)) return ref(s, "id", s);
    var ted = /\b(\d{5,7}-20\d{2})\b/.exec(s);
    if (ted) return { ok: true, kind: "ted", tedNumber: ted[1], officialUrl: URL.ted(ted[1]), links: { ted: URL.ted(ted[1]) }, input: s,
                      note: "TED numeris. CVP IS resourceId reikia paimti iš TED skelbimo nuorodų arba paties CVP IS." };
    if (/viesiejipirkimai\.lt/i.test(s)) return { ok: false, reason: "no-id", input: s };
    return { ok: true, kind: "text", query: s, links: { search: URL.paieska(s), latest: URL.latest }, input: s };
  }
  // buyer: null - pirkimo vykdytojas iš ID nežinomas; jį duoda skelbimas (atpazinkPirkeja) arba naudotojas
  function ref(id, kind, input) {
    return { ok: true, kind: kind, resourceId: id, source: "CVPIS", buyer: null, timezone: "Europe/Vilnius", officialUrl: URL.details(id), input: input,
             links: { details: URL.details(id), documents: URL.documents(id), notices: URL.notices(id), noticePdf: URL.noticePdf(id), zipAll: URL.zipAll(id), dps: URL.dpsDocuments(id) } };
  }

  // ---------------------------------------------------------------------------
  // Pirkimo vykdytojas ir teisinis režimas iš SKELBIMO - nuo 2026-09-26 gyvena
  // shared/skelbimas.js (GP_SKELBIMAS.pirkejas / rezimas), nes tuo pačiu atpažinimu
  // pildoma ir bendra pirkimo kortelė (tobulinimo planas A2). Čia - tik nuorodos,
  // kad modulio kodas ir testai liktų tokie patys. Sandara - iš keturių tikrų
  // CVP IS skelbimų PDF 2026-09-24 (LITGRID 9683631, Amber Grid 9742096, EPSO-G
  // 9281765, Energy cells 9614756); aprašas - shared/skelbimas.js.
  // ---------------------------------------------------------------------------
  function atpazinkPirkeja(tekstas) { return global.GP_SKELBIMAS ? global.GP_SKELBIMAS.pirkejas(tekstas) : null; }
  function atpazinkRezima(tekstas, failoVardas) {
    return global.GP_SKELBIMAS ? global.GP_SKELBIMAS.rezimas(tekstas, failoVardas) : { value: null, neaiskus: false, pozymiai: [] };
  }

  // Terminas su Europe/Vilnius laiko zona ir likusiu laiku (tik rodymui; šaltinis - dokumentas)
  function terminas(isoOrText, lang) {
    var d = parseData(isoOrText); if (!d) return null;
    var fmt = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    var now = new Date(); var ms = d.getTime() - now.getTime();
    var dienos = Math.floor(ms / 86400000), val = Math.floor((ms % 86400000) / 3600000);
    return { date: d, text: fmt.format(d), praejes: ms < 0, liko: ms < 0 ? null : { dienos: dienos, valandos: val } };
  }
  // Priima "07/09/2026 14:00", "2026-09-07 14:00", "2026-09-07T14:00:00+03:00"
  function parseData(s) {
    if (s instanceof Date) return s;
    s = String(s || "").trim();
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(s);
    if (m) return vilnius(+m[3], +m[2], +m[1], +(m[4] || 0), +(m[5] || 0));
    m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?(?:[^Z+-]*)?([+-]\d{2}:\d{2}|Z)?/.exec(s);
    if (m) { if (m[6]) { var d = new Date(s); return isNaN(d) ? null : d; } return vilnius(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0)); }
    return null;
  }
  // Europe/Vilnius sieninis laikas -> tikra akimirka per Intl (be bibliotekų).
  // Dvi iteracijos sutvarko laiko persukimo ruožą; ankstesnė DST formulė klydo
  // persukimo dienų 01:00-03:59 valandomis (rodė valanda mažiau / daugiau).
  function vilnius(y, mo, d, h, mi) {
    var wall = Date.UTC(y, mo - 1, d, h, mi), guess = wall;
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Vilnius", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    for (var i = 0; i < 2; i++) {
      var g = {}; fmt.formatToParts(new Date(guess)).forEach(function (x) { g[x.type] = x.value; });
      var asUtc = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute);
      guess = guess - (asUtc - wall);
    }
    return new Date(guess);
  }

  // ---------------------------------------------------------------------------
  // CVP IS dokumentų sąrašas iš visų dokumentų paketo (2026-10-17). CVP IS į ZIP
  // („Atsisiųsti Zip failą“) įdeda PDF <vykdytojo id>_<pirkimo id>.pdf: „List of
  // Contract Documents“ (#Addenda ID, Status, Title, File Associated :<failas>) ir
  // „List of Notices“. Sandara - iš dviejų tikrų LITGRID paketų; pavadinimai ir
  // failų vardai gali persikelti į kitą eilutę, todėl tarpai suvienodinami, o
  // failų vardai lyginami be tarpų. Neatpažinus - null (nieko nespėjama).
  // ---------------------------------------------------------------------------
  function dokumentuSarasas(tekstas) {
    var t = String(tekstas || "").replace(/\s+/g, " ");
    var i = t.indexOf("List of Contract Documents"); if (i < 0) return null;
    var j = t.indexOf("List of Notices", i);
    var irasai = function (dalis, rusis) {
      var out = [], re = /#Addenda ID (\S+) Status (.+?) Title (.+?) File Associated ?: ?<(.+?)>/g, m;
      while ((m = re.exec(dalis))) out.push({ rusis: rusis, papildymas: /^\d+$/.test(m[1]) ? +m[1] : null, statusas: m[2].trim(), pavadinimas: m[3].trim(), failas: m[4].trim() });
      return out;
    };
    var dokumentai = irasai(j > 0 ? t.slice(i, j) : t.slice(i), "dokumentas");
    if (!dokumentai.length) return null;
    return { dokumentai: dokumentai, skelbimai: j > 0 ? irasai(t.slice(j), "skelbimas") : [] };
  }
  // Failo vardas palyginimui: be tarpų ir didžiųjų raidžių; skelbimo versijų priesaga „_0“, „_1“ ZIP'e nuimama
  function vardoRaktas(v, skelbimas) {
    var s = String(v || "").split(/\s*›\s*|\//).pop().normalize("NFC").toLowerCase().replace(/\s+/g, "");
    return skelbimas ? s.replace(/_\d+(\.pdf)$/, "$1") : s;
  }
  // Sąrašo įrašai prieš perskaitytus failus: rastas ir perskaitytas / rastas, bet neperskaitytas / nerastas.
  // Archyvas (pvz. „1_Pirkimo dokumentai.zip“) laikomas perskaitytu, kai perskaitytas bent vienas jo failas.
  function apreptis(sarasas, docs) {
    if (!sarasas) return null;
    var keliai = (docs || []).map(function (d) {
      var dalys = String(d.name || "").split(/\s*›\s*/);
      return { dalys: dalys.map(function (x) { return vardoRaktas(x); }), d: d };
    });
    var bukle = function (e) {
      var raktas = vardoRaktas(e.failas, e.rusis === "skelbimas"), be = raktas.replace(/^\d+_/, "");
      var rasti = keliai.filter(function (k) { return k.dalys.some(function (x, n) {
        var y = e.rusis === "skelbimas" ? x.replace(/_\d+(\.pdf)$/, "$1") : x;
        return y === raktas || (n === k.dalys.length - 1 && y === be); }); });
      if (!rasti.length) return "nerastas";
      return rasti.some(function (k) { return k.d.parseStatus === "parsed" || k.d.parseStatus === "partial"; }) ? "perskaitytas" : "neperskaitytas";
    };
    var visi = sarasas.dokumentai.concat(sarasas.skelbimai).map(function (e) { return Object.assign({ bukle: bukle(e) }, e); });
    var dok = visi.filter(function (e) { return e.rusis === "dokumentas"; });
    return { irasai: visi, dokumentu: dok.length, skelbimu: visi.length - dok.length,
             perskaityta: dok.filter(function (e) { return e.bukle === "perskaitytas"; }).length,
             papildymai: dok.filter(function (e) { return e.papildymas !== null; }) };
  }
  // Ar paketas atrodo kaip tik pradinis pirkimo dokumentų ZIP (be CVP IS sąrašo) - tada vėliau paskelbti
  // papildymai (atsakymai į klausimus, aktualios redakcijos) į jį neįeina
  function tikPradinisZip(docs) {
    var virsus = {};
    (docs || []).forEach(function (d) { virsus[String(d.name || "").split(/\s*›\s*/)[0]] = 1; });
    var v = Object.keys(virsus);
    return v.length === 1 && /pirkimo dokumentai/i.test(v[0]) && /\.zip$/i.test(v[0]);
  }

  // Adapterio kontraktas 2 etapui (serverio pusė). Čia - tik būsena.
  function status() {
    return { live: false, mode: "manual-upload",
             lt: "Gyva CVP IS jungtis neįjungta: VPT dokumentuota CVP IS duomenų API reikalauja prieigos rakto ir nepriima naršyklės užklausų (nėra CORS), todėl ją galima naudoti tik per serverį - G-Procure tokios jungties dar neturi. Dokumentus įkelkite iš oficialaus puslapio.",
             en: "Live CVP IS link is not enabled: the CVP IS data API documented by VPT requires an access key and does not accept browser requests (no CORS), so it can only be used via a server - G-Procure does not have such a link yet. Upload the documents from the official page." };
  }

  global.GP_CVPIS = { version: "0.4.0", URL: URL, resolve: resolve, terminas: terminas, parseData: parseData, status: status,
                      atpazinkPirkeja: atpazinkPirkeja, atpazinkRezima: atpazinkRezima,
                      dokumentuSarasas: dokumentuSarasas, apreptis: apreptis, tikPradinisZip: tikPradinisZip };
})(typeof window !== "undefined" ? window : this);
