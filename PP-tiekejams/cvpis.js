/* ============================================================================
 * G-Procure Tiekėjams  cvpis.js
 * ----------------------------------------------------------------------------
 * CVP IS (viesiejipirkimai.lt, European Dynamics e-PPS) VIEŠŲ nuorodų sluoksnis
 * (window.GP_CVPIS). URL šablonai patikrinti 2026-09-02 (be prisijungimo,
 * HTTP 200) - žr. docs/tiekejams/cvpis-feasibility.md.
 *
 * MVP: tik NUORODOS (navigacija), NE fetch. CVP IS neturi CORS ir API, tad
 * naršyklė jo nuskaityti negali; gyvai jungčiai skirtas adapterio kontraktas
 * (ProcurementSourceAdapter) čia aprašytas, bet įgyvendinimas - 2 etapas
 * (serverio pusė). Kol jo nėra, status() grąžina aiškią techninę būseną, o
 * įrankis NIEKADA neimituoja gyvos jungties.
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
    return { ok: true, kind: "text", query: s, links: { search: URL.advancedSearch, latest: URL.latest }, input: s };
  }
  // buyer: null - pirkimo vykdytojas iš ID nežinomas; jį duoda skelbimas (atpazinkPirkeja) arba naudotojas
  function ref(id, kind, input) {
    return { ok: true, kind: kind, resourceId: id, source: "CVPIS", buyer: null, timezone: "Europe/Vilnius", officialUrl: URL.details(id), input: input,
             links: { details: URL.details(id), documents: URL.documents(id), notices: URL.notices(id), noticePdf: URL.noticePdf(id), zipAll: URL.zipAll(id), dps: URL.dpsDocuments(id) } };
  }

  // ---------------------------------------------------------------------------
  // Pirkimo vykdytojas ir teisinis režimas iš SKELBIMO. Sandara perskaityta iš
  // keturių tikrų CVP IS skelbimų PDF 2026-09-24 (LITGRID 9683631, Amber Grid
  // 9742096, EPSO-G 9281765, Energy cells 9614756), lietuviško eForms formato:
  //   „1.1 Pirkėjas“ -> „Oficialus pavadinimas: LITGRID AB (PV)“
  //   „Perkančiojo subjekto veiklos sritis: ...“   - PĮ (LITGRID, Amber Grid)
  //   „Perkančiosios organizacijos veiklos sritis: ...“ - VPĮ (EPSO-G, Energy cells)
  //   „Teisinis pagrindas:“ + „Direktyva 2014/25/ES“ (PĮ) arba „Kitas“ (nacionalinis, be signalo)
  //   failo vardas: „... komunalinio sektoriaus direktyva ...“ (PĮ) / „... bendroji direktyva ...“ (VPĮ)
  // Angliškos formos (EN skelbimo tekstas) - tik numanomos pagal TED eForms
  // etiketes, tikru EN skelbimu NEPATIKRINTOS; jos duoda tą patį rezultatą, bet
  // sąsaja vis tiek prašo patvirtinti. „Oficialus pavadinimas“ vėliau kartojasi
  // 8 skyriuje (pirkėjas, peržiūros institucija, e. sistemos tiekėjas), todėl
  // imamas TIK pirmas po „1.1 Pirkėjas“.
  // ---------------------------------------------------------------------------
  function minkstas(s) { return String(s == null ? "" : s).replace(/[­‐‑]/g, "-").replace(/\s+/g, " ").trim(); }
  function atpazinkPirkeja(tekstas) {
    var t = String(tekstas || "");
    // Prieš „1.1 Pirkėjas“ - eilutės pradžia arba tarpas (pdf.js tekste eilutės skiriamos \n, bet
    // TXT / DOCX blokuose skyrius gali būti toje pačioje eilutėje)
    var a = /(?:^|\s)1\.1\s+(?:Pirk[eė]jas|Buyer)\b/i.exec(t);
    if (!a) return null;
    var po = t.slice(a.index, a.index + 600);
    var m = /(?:Oficialus\s+pavadinimas|Official\s+name)\s*:\s*([^\n]{2,160})/i.exec(po);
    if (!m) return null;
    var zyma = minkstas(m[0]).replace(/:.*$/, ":");
    var v = minkstas(m[1]);
    // Į vieną eilutę sulietame bloke po pavadinimo eina kitas skelbimo laukas (tikruose PDF - nauja
    // eilutė „Pirkėjo teisinė forma: ...“) - pavadinimas nukerpamas ties juo
    var kitas = /\s+(?:Pirk[eė]jo\s+teisin|Perkan[čc]io(?:jo|sios)\s|Legal\s+type|Activity\s+of|Registracijos\s+numeris|Registration\s+number|Pa[šs]to\s+adresas|Postal\s+address)/i.exec(v);
    if (kitas && kitas.index > 0) v = v.slice(0, kitas.index).trim();
    var snippet = (zyma + " " + v).slice(0, 120);
    var pv = /\(PV\)\s*$/i.test(v);
    v = v.replace(/\s*\(PV\)\s*$/i, "").trim();
    // Kabutės nuimamos tik kai visas pavadinimas jose („"UAB X"“); „AB "Amber Grid"“ lieka kaip skelbime
    if (/^["„“]/.test(v) && /["“”]$/.test(v)) v = v.slice(1, -1).trim();
    if (!v) return null;
    return { value: v, pv: pv, snippet: snippet };
  }
  var SEKTORIUS = [
    [/perkan[čc]iojo\s+subjekto\s+veiklos\s+sritis/i, "tekstas"], [/direktyva\s*2014\/25/i, "tekstas"], [/directive\s*2014\/25/i, "tekstas"],
    [/activity\s+of\s+the\s+contracting\s+entity/i, "tekstas"], [/komunalinio\s+sektoriaus\s+direktyv/i, "vardas"], [/sectoral\s+directive/i, "vardas"]
  ];
  var KLASIKA = [
    [/perkan[čc]iosios\s+organizacijos\s+veiklos\s+sritis/i, "tekstas"], [/direktyva\s*2014\/24/i, "tekstas"], [/directive\s*2014\/24/i, "tekstas"],
    [/activity\s+of\s+the\s+contracting\s+authority/i, "tekstas"], [/bendroji\s+direktyv/i, "vardas"], [/classic\s+directive/i, "vardas"]
  ];
  function pozymiai(sarasas, tekstas, vardas, rezimas) {
    var out = [];
    sarasas.forEach(function (p) {
      var kur = p[1] === "vardas" ? vardas : tekstas;
      var m = p[0].exec(String(kur || ""));
      if (m) out.push({ rezimas: rezimas, kur: p[1], tekstas: minkstas(m[0]) });
    });
    return out;
  }
  // Grąžina { value: "PI" | "VPI" | null, neaiskus, pozymiai } - neaiškus, kai yra abiejų režimų požymių
  function atpazinkRezima(tekstas, failoVardas) {
    var vardas = String(failoVardas || "").split(" › ").pop();
    var pi = pozymiai(SEKTORIUS, tekstas, vardas, "PI"), vpi = pozymiai(KLASIKA, tekstas, vardas, "VPI");
    var visi = pi.concat(vpi);
    if (!visi.length) return { value: null, neaiskus: false, pozymiai: [] };
    if (pi.length && vpi.length) return { value: null, neaiskus: true, pozymiai: visi };
    return { value: pi.length ? "PI" : "VPI", neaiskus: false, pozymiai: visi };
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

  // Adapterio kontraktas 2 etapui (serverio pusė). Čia - tik būsena.
  function status() {
    return { live: false, mode: "manual-upload",
             lt: "Gyva CVP IS jungtis neįjungta: CVP IS neturi viešos API ir CORS, todėl nuskaityti galima tik per serverį (2 etapas). Dokumentus įkelkite iš oficialaus puslapio.",
             en: "Live CVP IS link is not enabled: CVP IS has no public API or CORS, so it can only be read via a server (phase 2). Upload the documents from the official page." };
  }

  global.GP_CVPIS = { version: "0.3.0", URL: URL, resolve: resolve, terminas: terminas, parseData: parseData, status: status,
                      atpazinkPirkeja: atpazinkPirkeja, atpazinkRezima: atpazinkRezima };
})(typeof window !== "undefined" ? window : this);
