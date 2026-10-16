/* ============================================================================
 * G-Procure  shared/analitika.js   (window.GP_ANALITIKA, nuo 2026-10-16)
 * ----------------------------------------------------------------------------
 * Naudojimosi statistika (PostHog, ES) - GRIEŽTAS VARIANTAS, naudotojo sprendimai 2026-10-16 (žr. docs/analitika/ivykiu-sarasas.md):
 *
 *  - TIK SU SUTIKIMU: GP_SUTIKIMAS.leidzia("statistika") (numatyta - išjungta). Be sutikimo biblioteka net neįkeliama, įvykiai
 *    neįsimenami ir nesiunčiami; atšaukus - siuntimas iškart sustabdomas (filtras prieš kiekvieną siuntimą).
 *  - TIK ŠIAME SĄRAŠE APRAŠYTI ĮVYKIAI IR TIK ŽODYNO REIKŠMĖS (IVYKIAI): įvykis ar savybė ne pagal žodyną - neišsiunčiama
 *    (ivykis() grąžina false). Laisvo teksto savybių nėra; pavadinimų, numerių, sumų, failų vardų ir turinio nesiunčiame.
 *  - NIEKO NARŠYKLĖJE: cookieless_mode "always", persistence "memory" - jokių slapukų, localStorage ir sessionStorage įrašų.
 *    Lankytojo kodą PostHog serveris skaičiuoja iš IP, naršyklės aprašo ($raw_user_agent), svetainės ($host), laiko juostos
 *    ir dienos druskos, po to IP ir naršyklės aprašą ištrina (PostHog nodejs/src/ingestion/common/cookieless/cookieless-manager.ts,
 *    stripPIIProperties - perskaityta 2026-10-16); žmonių profilių nėra (person_profiles "never").
 *  - VIETA PAGAL IP IŠJUNGTA ($geoip_disable; PostHog projekte GeoIP pakeitimas sustabdytas), IP projekte nesaugomas.
 *  - BE AUTOMATINIO RINKIMO: paspaudimai, sesijų įrašai, šiluminiai žemėlapiai, apklausos, klaidos, puslapių peržiūros ir
 *    funkcijų žymės (flags) išjungti ir bibliotekos nustatymuose, ir PostHog projekte; nuotolinis nustatymų įkėlimas - ne.
 *  - BE IŠORINIO KODO: biblioteka - shared/vendor/posthog-js-<versija>/array.no-external.js (bibliotekos.json); į PostHog
 *    kreipiamasi tik įvykiams išsiųsti (https://eu.i.posthog.com, CSP connect-src).
 *  - TIK g-procure.com: kitoje kilmėje (vietinis serveris, failas diske), rėmelyje ir testų puslapyje nieko nesiunčiama.
 *  - Paisoma „Do Not Track“ ir „Global Privacy Control“ - tada statistika nerenkama ir su sutikimu.
 *
 *   GP_ANALITIKA.ivykis("modulio_veiksmas", { veiksmas: "ts_sugeneruota", objektas: "paslaugos" })   // -> true / false
 *   GP_ANALITIKA.kodas(...)  - pagalbinės: klaidosRusis(status), trukme(ms), irenginys(), dokumentas(failoVardas)
 *
 * Projekto raktas (phc_...) - viešas, skirtas tik įvykiams rašyti (PostHog: „Write-only key ... Safe to use in public apps“);
 * slaptų raktų čia nėra. Naujas įvykis ar savybė - pirma į docs/analitika/ivykiu-sarasas.md (naudotojo peržiūra), tada į IVYKIAI,
 * privatumo ir slapukų politiką; testai - shared/testai.html grupė „Naudojimosi statistika“.
 * ========================================================================== */
;(function (global) {
  "use strict";
  if (global.GP_ANALITIKA) return;

  var doc = global.document, nav = global.navigator || {};
  var TOKEN = "phc_ze5ztzb3hHUbrcX5rb6zfbmj689a2ebwYhbEv4bb5USA";
  var API = "https://eu.i.posthog.com";
  var KILME = "https://g-procure.com";
  var VERSIJA = "1.435.6";
  var src = (doc && doc.currentScript && doc.currentScript.src) || "";
  var sm = src.match(/^(.*\/)shared\/analitika\.js(\?.*)?$/);
  var SAKNIS = sm ? sm[1] : null;
  // Visas kelias tekstu (testai sutikrina su shared/vendor/bibliotekos.json ir VERSIJA)
  var BIBLIOTEKA = SAKNIS ? SAKNIS + "shared/vendor/posthog-js-1.435.6/array.no-external.js" : null;

  /* ---------- Žodynas (docs/analitika/ivykiu-sarasas.md, naudotojo patvirtinta 2026-10-16) ---------- */
  var MODULIAI = ["PP-plan", "PP-market-KPI", "PP-ts", "PP-qual", "PP-salygos", "PP-cost-benefit", "PP-graphs", "PP-protocol",
    "PP-negotiation", "PP-report", "PP-esg", "PP-carbon", "PP-tiekejams", "PP-teise", "portalas", "korteles", "kita"];
  var REZULTATAS = ["pavyko", "klaida", "atsaukta"];
  var TRUKME = ["iki_10s", "10_30s", "30_60s", "virs_60s"];
  var TN = ["taip", "ne"];
  var OBJEKTAS = ["prekes", "paslaugos", "darbai"];
  // Pirkimo būdas - tik GP_METHODS kodas (T-AK, S-AK, MV-NR, DPS-K ...); kai klasifikatorius puslapyje įkeltas - ir jame esantis
  var BUDAS = { re: /^[A-Z]{1,4}(-[A-Z]{1,3})?$/, metodas: true };
  // Sutarties projekto šeima (PP-salygos GP_SUTARTYS.SEIMOS; testai sutikrina) arba kodėl jos nėra
  var SUTARTIS = ["PREKES", "PASLAUGOS", "PROJEKTAVIMO_PASLAUGOS", "PROJEKTAVIMO_STATYBOS", "STATYBOS_RANGOS", "DARBAI_MAZOJI", "EKSPLOATAVIMO",
    "nerengiama", "atideta"];
  var KODAS = { re: /^[a-z0-9_-]{1,30}$/ };
  var SKAICIUS = function (a, b) { return { sk: [a, b] }; };
  var VEIKSMAI = [
    "ts_sugeneruota", "ts_patikrinta", "konsultacijos_kvietimas", "konsultacijos_suvestine", "susitikimo_santrauka",
    "reikalavimai_sugeneruoti", "reikalavimai_patikrinti",
    "protokolas_sukurtas", "pranesimai_sukurti", "uzklausa_nukopijuota",
    "pasiulymai_ikelti", "matrica_perziureta", "rekomendacijos_perziuretos",
    "planas_ikeltas", "centralizavimas_perziuretas", "kortele_is_plano",
    "pazyma_sukurta", "grafikas_sukurtas",
    "apzvalga_sudaryta", "veiksmai_irasyti_i_kortele", "salyga_nukopijuota",
    "vertinimas_suskaiciuotas", "kna_issaugota",
    "skaiciavimas_atliktas", "epd_ikeltas",
    "sankciju_vertinimas", "tiekejas_pridetas",
    "paketas_ikeltas", "klausimas_paklaustas", "kontrolinis_sarasas",
    "irasas_atvertas"
  ];
  var DOKUMENTAI = ["sps", "bps", "formos", "sutartis", "paketas_zip", "ts", "kvalifikacija", "protokolas", "pranesimas", "pazyma",
    "grafikas", "derybu_analize", "planas", "rinkos_apzvalga", "vertinimo_priedas", "kna", "anglies_ataskaita", "esg_ataskaita",
    "juodrastis", "tikrinimo_ataskaita", "konsultacija", "kopija", "kita"];
  var BIBLIOTEKOS = ["pdfjs", "jszip", "mammoth", "sheetjs", "docx", "filesaver", "chartjs", "jspdf", "kita"];

  var BENDROS = { modulis: MODULIAI, puslapis: { re: /^\/[A-Za-z0-9\/._-]{0,120}$/ }, kalba: ["lt", "en"],
                  irenginys: ["telefonas", "plansete", "kompiuteris"] };
  var IVYKIAI = {
    puslapis_atvertas:       { atverta_is: ["portalas", "kitas_modulis", "isorinis", "tiesiogiai"], su_kortele: TN },
    di_uzklausa:             { rezultatas: REZULTATAS, trukme: TRUKME, bandymai: SKAICIUS(1, 9),
                               klaidos_rusis: ["tinklas", "per_didelis_failas", "per_daug_uzklausu", "atmesta", "serverio", "kita"] },
    veiksmo_rezultatas:      { veiksmas: VEIKSMAI, rezultatas: REZULTATAS, trukme: TRUKME },
    biblioteka_neisikele:    { biblioteka: BIBLIOTEKOS },
    failas_atsisiustas:      { dokumentas: DOKUMENTAI, formatas: ["docx", "xlsx", "pdf", "zip", "json", "csv", "doc", "html", "txt", "kita"] },
    kortele_issaugota:       { saltinis: ["korteliu_puslapis", "modulis", "cvp_is_skelbimas", "pp_protocol_perkelimas", "pp_plan"], nauja: TN },
    mano_pirkimai_paspausta: { irankis: MODULIAI, etapas: ["planuojama", "rengiama", "paskelbta", "vertinama", "kita"] },
    atsargine_kopija:        { veiksmas: ["issaugota", "atkurta"], rezultatas: ["pavyko", "klaida"] },
    salygos_zingsnis:        { zingsnis: ["1", "2", "sutartis", "4"], budas: BUDAS, dokumentu_kalba: ["lt", "lt_en"], istatymas: ["PI", "VPI"] },
    salygos_generavimas:     { rezultatas: ["pavyko", "klaida"], apimtis: ["salygos", "salygos_ir_sutartis"],
                               sutartis: SUTARTIS, budas: BUDAS, trukme: TRUKME },
    salygos_juodrastis:      { veiksmas: ["issaugoti_veliau", "testi", "atsisiusti", "ikelti", "istrinti"] },
    dokumentu_tikrinimas:    { rezultatas: ["pavyko", "klaida"], dokumentai: SKAICIUS(1, 99), kliutys: SKAICIUS(0, 99),
                               nukrypimai: SKAICIUS(0, 99), patikrinkite: SKAICIUS(0, 99) },
    modulio_veiksmas:        { veiksmas: VEIKSMAI, objektas: OBJEKTAS, protokolas: { re: /^[A-Z]{1,2}\d{1,2}(\.\d)?[a-z]?$/ },
                               failai: SKAICIUS(1, 99), priedas: ["1", "2"], budas: BUDAS, profilis: KODAS,
                               dalis: ["skaiciuokle", "kna"], rusis: KODAS }
  };
  // PostHog paties savybės, kurios lieka (be jų įvykis nepriimamas ar neskaičiuojamas be slapukų); visos kitos - išmetamos
  var SISTEMOS = ["token", "distinct_id", "$cookieless_mode", "$raw_user_agent", "$host", "$timezone", "$lib", "$lib_version"];

  function tinka(spec, v) {
    if (Array.isArray(spec)) return typeof v === "string" && spec.indexOf(v) >= 0;
    if (spec && spec.sk) return typeof v === "number" && Math.floor(v) === v && v >= spec.sk[0] && v <= spec.sk[1];
    if (spec && spec.re) return typeof v === "string" && v.length <= 140 && spec.re.test(v)
      && (!spec.metodas || !window.GP_METHODS || typeof GP_METHODS.byId !== "function" || !!GP_METHODS.byId(v));
    return false;
  }
  // Moduliams: būdo kodas, jei jis tinka žodynui, kitaip - nesiunčiama (undefined)
  function budas(v) { return tinka(BUDAS, v) ? v : undefined; }

  /* ---------- Bendros savybės ---------- */
  function puslapis() {
    var p = String((global.location && global.location.pathname) || "/");
    try { p = decodeURIComponent(p); } catch (e) {}
    p = p.replace(/[^A-Za-z0-9\/._-]/g, "").slice(0, 120);
    return p.charAt(0) === "/" ? p : "/" + p;
  }
  function modulis(p) {
    var x = /^\/(PP-[A-Za-z-]+)\//.exec(p);
    if (x && MODULIAI.indexOf(x[1]) >= 0) return x[1];
    if (/^\/(index\.html)?$/.test(p) || /^\/G-Procure_/.test(p) || /^\/PP-home\//.test(p)) return "portalas";
    if (/^\/pirkimu-korteles\.html$/.test(p)) return "korteles";
    return "kita";
  }
  function irenginys() {
    var w = global.innerWidth || (doc && doc.documentElement && doc.documentElement.clientWidth) || 1280;
    return w < 768 ? "telefonas" : w < 1180 ? "plansete" : "kompiuteris";
  }
  function bendros() {
    var p = puslapis();
    return { modulis: modulis(p), puslapis: p, kalba: /^en/i.test((doc && doc.documentElement.getAttribute("lang")) || "") ? "en" : "lt",
             irenginys: irenginys() };
  }

  /* ---------- Kada galima ---------- */
  var TESTAS = null;   // testams: { kilme: true, betarpiskai: true, siunta: fn } - tik iš testų
  function testuPuslapis() {
    try { return /[\/-]testai\.html$/.test(global.top.location.pathname) || /[?&]saugykla=testine(&|$)/.test(global.location.search); }
    catch (e) { return true; }
  }
  function virsutinis() { try { return global.top === global; } catch (e) { return false; } }
  function nesekti() { return nav.doNotTrack === "1" || global.doNotTrack === "1" || nav.globalPrivacyControl === true; }
  function kilmeTinka() {
    if (TESTAS && TESTAS.kilme) return true;
    return !!(global.location && global.location.origin === KILME) && virsutinis() && !testuPuslapis();
  }
  function sutikta() { return !!(global.GP_SUTIKIMAS && global.GP_SUTIKIMAS.leidzia("statistika")); }
  function galima() { return sutikta() && kilmeTinka() && !nesekti() && !!BIBLIOTEKA; }

  /* ---------- PostHog ---------- */
  var PH = null, KRAUNAMA = false, EILE = [];
  function filtras(ev) {
    if (!ev || !galima() || !IVYKIAI[ev.event] || !ev.properties) return null;
    var p = ev.properties, z = IVYKIAI[ev.event], o = {}, k;
    for (k in BENDROS) { if (!tinka(BENDROS[k], p[k])) return null; o[k] = p[k]; }
    for (k in z) if (p[k] !== undefined) { if (!tinka(z[k], p[k])) return null; o[k] = p[k]; }
    for (var i = 0; i < SISTEMOS.length; i++) if (p[SISTEMOS[i]] !== undefined) o[SISTEMOS[i]] = p[SISTEMOS[i]];
    o.$geoip_disable = true;
    o.$process_person_profile = false;
    var r = { event: ev.event, properties: o };
    if (ev.uuid !== undefined) r.uuid = ev.uuid;
    if (ev.timestamp !== undefined) r.timestamp = ev.timestamp;
    return r;
  }
  function nustatymai() {
    var c = {
      api_host: API, ui_host: "https://eu.posthog.com",
      cookieless_mode: "always", persistence: "memory", disable_persistence: true, person_profiles: "never",
      autocapture: false, rageclick: false, capture_pageview: false, capture_pageleave: false,
      capture_heatmaps: false, capture_dead_clicks: false, capture_exceptions: false, capture_performance: false,
      disable_session_recording: true, disable_surveys: true, disable_conversations: true, disable_product_tours: true,
      disable_web_experiments: true, advanced_disable_flags: true, advanced_disable_feature_flags: true,
      disable_external_dependency_loading: true, disable_compression: true,
      save_referrer: false, save_campaign_params: false, disable_capture_url_hashes: true,
      mask_all_text: true, mask_all_element_attributes: true, mask_personal_data_properties: true,
      respect_dnt: true, before_send: filtras
    };
    // Testams: be paketų ir be robotų filtro (testų Chrome be ekrano PostHog laiko robotu - jo įvykius išmeta, kaip ir turi)
    if (TESTAS && TESTAS.betarpiskai) { c.request_batching = false; c.opt_out_useragent_filter = true; }
    return c;
  }
  function siuskEile() {
    while (EILE.length) {
      var x = EILE.shift();
      if (!galima() || !PH) { EILE = []; return; }
      try { PH.capture(x[0], x[1]); } catch (e) {}
    }
  }
  function ikelk() {
    if (PH) { siuskEile(); return; }
    if (KRAUNAMA || !doc) return;
    KRAUNAMA = true;
    var s = doc.createElement("script");
    s.src = BIBLIOTEKA;
    s.async = true;
    s.setAttribute("data-gp-analitika", "");
    s.onload = function () {
      KRAUNAMA = false;
      var p = global.posthog;
      if (!p || typeof p.init !== "function" || !galima()) { EILE = []; return; }
      try { var r = p.init(TOKEN, nustatymai()); PH = r && typeof r.capture === "function" ? r : p; } catch (e) { PH = null; EILE = []; return; }
      siuskEile();
    };
    s.onerror = function () { KRAUNAMA = false; EILE = []; };
    (doc.head || doc.documentElement).appendChild(s);
  }

  function ivykis(vardas, savybes) {
    var z = IVYKIAI[vardas];
    if (!z) return false;
    savybes = savybes || {};
    var p = bendros(), k;
    for (k in savybes) {
      if (!Object.prototype.hasOwnProperty.call(savybes, k)) continue;
      if (savybes[k] === undefined || savybes[k] === null) continue;
      if (!z[k] || !tinka(z[k], savybes[k])) return false;
      p[k] = savybes[k];
    }
    if (TESTAS && TESTAS.siunta) TESTAS.siunta(vardas, p, galima());
    if (!galima()) return false;
    EILE.push([vardas, p]);
    ikelk();
    return true;
  }

  /* ---------- Pagalbinės (moduliams ir bendriems failams) ---------- */
  function trukme(ms) { var s = (ms || 0) / 1000; return s < 10 ? "iki_10s" : s < 30 ? "10_30s" : s < 60 ? "30_60s" : "virs_60s"; }
  function klaidosRusis(status) {
    status = +status || 0;
    return status === 0 ? "tinklas" : status === 413 ? "per_didelis_failas" : status === 429 ? "per_daug_uzklausu"
      : (status === 401 || status === 403) ? "atmesta" : status >= 500 ? "serverio" : "kita";
  }
  function biblioteka(pav) {
    var t = String(pav || "").toLowerCase();
    return /pdf\.js|pdfjs/.test(t) ? "pdfjs" : /jszip/.test(t) ? "jszip" : /mammoth/.test(t) ? "mammoth" : /sheetjs|xlsx/.test(t) ? "sheetjs"
      : /filesaver/.test(t) ? "filesaver" : /chart/.test(t) ? "chartjs" : /jspdf/.test(t) ? "jspdf" : /docx|word/.test(t) ? "docx" : "kita";
  }
  // Failo vardas lieka naršyklėje - siunčiama tik dokumento rūšis iš žodyno ir formatas
  function dokumentas(vardas) {
    var v = String(vardas || ""), l = v.toLowerCase().normalize ? v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : v.toLowerCase();
    var ext = (/\.([a-z0-9]{1,5})$/.exec(l) || [])[1] || "";
    var formatas = ["docx", "xlsx", "pdf", "zip", "json", "csv", "doc", "html", "txt"].indexOf(ext) >= 0 ? ext : "kita";
    var d = ext === "zip" ? "paketas_zip"
      : /konsultacij|susitikim/.test(l) ? "konsultacija"
      : /juodrast/.test(l) ? "juodrastis"
      : /kopija/.test(l) ? "kopija"
      : /patikr|tikrinim/.test(l) ? "tikrinimo_ataskaita"
      : /(^|[_-])sps([_-]|\.|$)/.test(l) ? "sps"
      : /(^|[_-])bps([_-]|\.|$)/.test(l) ? "bps"
      : /sutart/.test(l) ? "sutartis"
      : /protokol/.test(l) ? "protokolas"
      : /pranesim/.test(l) ? "pranesimas"
      : /pazym/.test(l) ? "pazyma"
      : /grafik/.test(l) ? "grafikas"
      : /negotiation|derybu/.test(l) ? "derybu_analize"
      : /kvalifik/.test(l) ? "kvalifikacija"
      : /(^|[_-])ts([_-]|\.|$)|technin/.test(l) ? "ts"
      : /rinkos/.test(l) ? "rinkos_apzvalga"
      : /kna|kastu/.test(l) ? "kna"
      : /vertinim|naudingum/.test(l) ? "vertinimo_priedas"
      : /anglies|sesd|carbon|co2|epd/.test(l) ? "anglies_ataskaita"
      : /esg|sankcij/.test(l) ? "esg_ataskaita"
      : /plan/.test(l) ? "planas"
      : /forma|priedas/.test(l) ? "formos"
      : "kita";
    return { dokumentas: d, formatas: formatas };
  }
  function atsisiusta(vardas) { var x = dokumentas(vardas); return ivykis("failas_atsisiustas", x); }

  /* ---------- Automatiniai įvykiai (įjungus statistiką) ---------- */
  var ATVERTA = false;
  function atvertaIs() {
    var r = (doc && doc.referrer) || "";
    if (!r) return "tiesiogiai";
    try {
      var u = new URL(r);
      if (u.origin !== global.location.origin) return "isorinis";
      return modulis(u.pathname) === "portalas" ? "portalas" : "kitas_modulis";
    } catch (e) { return "isorinis"; }
  }
  function puslapioIvykis() {
    if (ATVERTA || !galima()) return;
    ATVERTA = true;
    ivykis("puslapis_atvertas", { atverta_is: atvertaIs(), su_kortele: /[?&]kortele=/.test((global.location && global.location.search) || "") ? "taip" : "ne" });
  }
  // Atsisiuntimai: <a download>.click() (dauguma modulių) ir FileSaver saveAs(blob, vardas) - vardas lieka naršyklėje
  function stebekAtsisiuntimus() {
    var A = global.HTMLAnchorElement && global.HTMLAnchorElement.prototype;
    if (A && !A.click.__gpAnalitika) {
      var orig = A.click;
      var naujas = function () {
        try { if (this.hasAttribute && this.hasAttribute("download") && galima()) atsisiusta(this.getAttribute("download") || this.download); } catch (e) {}
        return orig.apply(this, arguments);
      };
      naujas.__gpAnalitika = true;
      A.click = naujas;
    }
    var fs = global.saveAs;
    if (typeof fs === "function" && !fs.__gpAnalitika) {
      var saveAs2 = function (blob, vardas) {
        try { if (galima()) atsisiusta(vardas || (blob && blob.name)); } catch (e) {}
        return fs.apply(this, arguments);
      };
      saveAs2.__gpAnalitika = true;
      global.saveAs = saveAs2;
    }
  }
  function pradek() {
    if (!galima()) return;
    stebekAtsisiuntimus();
    puslapioIvykis();
  }
  if (global.addEventListener) {
    global.addEventListener("gp-sutikimas", function () { if (galima()) pradek(); else EILE = []; });
  }
  if (doc) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", pradek, { once: true });
    else pradek();
  }

  global.GP_ANALITIKA = {
    VERSIJA: VERSIJA, API: API, KILME: KILME, BIBLIOTEKA: BIBLIOTEKA,
    IVYKIAI: IVYKIAI, BENDROS: BENDROS, SISTEMOS: SISTEMOS.slice(),
    ivykis: ivykis, atsisiusta: atsisiusta, galima: galima,
    trukme: trukme, klaidosRusis: klaidosRusis, biblioteka: biblioteka, dokumentas: dokumentas, irenginys: irenginys, budas: budas,
    filtras: filtras, nustatymai: nustatymai,
    // Tik testams: leidžia vietinę kilmę, siunčia be paketų, praneša kiekvieną įvykį (ar jis būtų išsiųstas)
    testams: function (o) { TESTAS = o || null; if (TESTAS && galima()) pradek(); }
  };
})(typeof window !== "undefined" ? window : this);
