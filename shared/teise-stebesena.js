/* ============================================================================
 * G-Procure  shared/teise-stebesena.js   (v1.0)
 * ----------------------------------------------------------------------------
 * Pirkimų teisės stebėsenos BRANDUOLYS (window.GP_STEBESENA) - vienas visiems:
 * PP-teise modulis (sąrašas, skiltys, paieška, peržiūrų žurnalas), administravimo
 * aplinka, portalo kompaktiškas blokas ir kontekstinės nuorodos PP-qual / PP-salygos.
 *
 * KAS ČIA GYVENA (ir todėl NEdubliuojama moduliuose):
 *   - įrašo schema, būsenos, rūšys, šaltinių tipai, temos, moduliai;
 *   - registro tikrinimas (trūkstami laukai, dublikatai, nesaugūs adresai);
 *   - skirstymas į skiltis „Kas pasikeitė“ / „Kas įsigalios“ / „Ką reikia peržiūrėti“;
 *   - aktualumo vertinimas pagal pirkimo kontekstą (režimas, procedūra, objektas,
 *     etapas, planuojama skelbimo data) - nežinomas aktualumas visada PAŽYMIMAS;
 *   - paieška be diakritikų (JS \w ą-ž nemato - žr. atmintį „lietuviški kamienai“);
 *   - peržiūrų žurnalas su PADUODAMA saugykla (testai naudoja netikrą, tikrų
 *     naudotojo duomenų neliečia - kaip shared/backup.js);
 *   - įkėlimas: NEPAVYKUSI patikra grąžina klaidą, o ne „pokyčių nėra“.
 *
 * DUOMENYS. Registras - PP-teise/duomenys/registras.json (bendras, repozitorijoje,
 * pildomas rankiniu / administratoriaus importu - automatinės jungties su e-tar
 * naršyklė neturi, nes e-tar neduoda CORS antraščių; žr. docs/teise/saltiniai.md).
 * Importuotas turinys laikomas NEPATIKIMU: visur rodomas per textContent / esc(),
 * nuorodos leidžiamos tik http(s), HTML iš duomenų niekur neįterpiamas.
 *
 * KALBA. Registro turinys lietuviškas; sąsajos etiketės - LT ir EN.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var DIENA = 86400000;

  /* ---------- Žodynai ---------- */

  var BUSENOS = {
    aptikta:     { lt: "Automatiškai aptikta",     en: "Automatically detected", zenklas: "◌", kodas: "aptikta" },
    laukia:      { lt: "Laukia peržiūros",         en: "Awaiting review",        zenklas: "◔", kodas: "laukia" },
    patvirtinta: { lt: "Specialisto patvirtinta",  en: "Confirmed by specialist", zenklas: "✓", kodas: "patvirtinta" },
    archyvuota:  { lt: "Archyvuota",               en: "Archived",               zenklas: "▣", kodas: "archyvuota" }
  };

  var RUSYS = {
    priimtas:               { lt: "Priimtas pakeitimas",       en: "Adopted amendment" },
    projektas:              { lt: "Projektas (nepriimta)",     en: "Draft (not adopted)" },
    metodine:               { lt: "Metodinė medžiaga",         en: "Methodical material" },
    teismu_praktika:        { lt: "Teismų praktika",           en: "Case law" },
    organizacijos_praktika: { lt: "Organizacijos praktika",    en: "Organisation practice" }
  };

  var SALTINIO_TIPAI = {
    teises_norma:           { lt: "Teisės norma",               en: "Legal norm" },
    vpt_rekomendacija:      { lt: "VPT rekomendacija",          en: "PPO recommendation" },
    teismo_isaiskinimas:    { lt: "Teismo išaiškinimas",        en: "Court interpretation" },
    organizacijos_praktika: { lt: "Organizacijos praktika",     en: "Organisation practice" }
  };

  var REZIMAI = {
    PI:  { lt: "PĮ (perkantieji subjektai)",        en: "Utilities law (contracting entities)" },
    VPI: { lt: "VPĮ (perkančiosios organizacijos)", en: "Public procurement law (contracting authorities)" }
  };

  var TEMOS = {
    "vidaus-sandoriai":       { lt: "Vidaus sandoriai",              en: "In-house transactions" },
    "kvalifikacija":          { lt: "Kvalifikacija",                 en: "Qualification" },
    "ebvpd":                  { lt: "EBVPD",                         en: "ESPD" },
    "patirtis":               { lt: "Patirties reikalavimai",        en: "Experience requirements" },
    "zalieji-pirkimai":       { lt: "Žalieji pirkimai",              en: "Green procurement" },
    "technine-specifikacija": { lt: "Techninė specifikacija",        en: "Technical specification" },
    "kastu-naudos-analize":   { lt: "Kaštų ir naudos analizė",       en: "Cost-benefit analysis" },
    "pirkimu-planavimas":     { lt: "Pirkimų planavimas",            en: "Procurement planning" },
    "cvp-is-viesinimas":      { lt: "Viešinimas CVP IS",             en: "Publication in CVP IS" },
    "vpt-prieziura":          { lt: "VPT priežiūra",                 en: "PPO supervision" },
    "specialistu-atestavimas":{ lt: "Pirkimų specialistų atestavimas", en: "Procurement specialist certification" },
    "isimtys":                { lt: "Įstatymo išimtys",              en: "Exemptions" },
    "komunikacija":           { lt: "Komunikacijos pirkimai",        en: "Communication purchases" },
    "verciu-ribos":           { lt: "Vertės ribos",                  en: "Value thresholds" },
    "salygu-aiskumas":        { lt: "Sąlygų aiškumas",               en: "Clarity of conditions" },
    "es-fondai":              { lt: "ES fondų projektai",            en: "EU-funded projects" },
    "proporcingumas":         { lt: "Proporcingumas",                en: "Proportionality" }
  };

  /* Moduliai, į kuriuos įrašai gali rodyti. Adresai - nuo svetainės šaknies. */
  var MODULIAI = {
    "PP-plan":         { pav: "Pirkimų planavimas",              kelias: "PP-plan/EPSO-G_pirkimu_planavimas_MVP.html" },
    "PP-market-KPI":   { pav: "Rinkos rodikliai",                kelias: "PP-market-KPI/EPSO-G_Rinkos_KPI_skydelis.html" },
    "PP-ts":           { pav: "TS asistentas",                   kelias: "PP-ts/TS_Asistentas.html" },
    "PP-qual":         { pav: "Kvalifikaciniai reikalavimai",    kelias: "PP-qual/PP-QUAL.html" },
    "PP-salygos":      { pav: "Pirkimo sąlygų generatorius",     kelias: "PP-salygos/PP-SALYGOS.html" },
    "PP-cost-benefit": { pav: "Kaštų ir naudos analizė",         kelias: "PP-cost-benefit/index.html" },
    "PP-graphs":       { pav: "Pirkimų grafikai",                kelias: "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html" },
    "PP-protocol":     { pav: "Komisijos sprendimai",            kelias: "PP-protocol/LITGRID_Generatorius_v3.html" },
    "PP-negotiation":  { pav: "Derybų pasirengimas",             kelias: "PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html" },
    "PP-report":       { pav: "Mažos vertės pažymos",            kelias: "PP-report/PP-report.html" },
    "PP-esg":          { pav: "ESG ir atitiktis",                kelias: "PP-esg/index.html" },
    "PP-carbon":       { pav: "Anglies pėdsakas",                kelias: "PP-carbon/index.html" },
    "PP-tiekejams":    { pav: "Tiekėjams",                       kelias: "PP-tiekejams/index.html" }
  };

  var PROCEDUROS = {
    "atviras":              { lt: "Atviras konkursas",            en: "Open procedure" },
    "ribotas":              { lt: "Ribotas konkursas",            en: "Restricted procedure" },
    "derybos-skelbiamos":   { lt: "Skelbiamos derybos",           en: "Negotiated with notice" },
    "derybos-neskelbiamos": { lt: "Neskelbiamos derybos",         en: "Negotiated without notice" },
    "mv":                   { lt: "Mažos vertės pirkimas",        en: "Low-value procurement" },
    "dps":                  { lt: "Dinaminė pirkimo sistema",     en: "Dynamic purchasing system" },
    "preliminarioji":       { lt: "Preliminarioji sutartis",      en: "Framework agreement" },
    "vidaus-sandoris":      { lt: "Vidaus sandoris",              en: "In-house transaction" }
  };
  var OBJEKTAI = {
    "prekes":     { lt: "Prekės",                    en: "Supplies" },
    "paslaugos":  { lt: "Paslaugos",                 en: "Services" },
    "darbai":     { lt: "Darbai",                    en: "Works" },
    "it":         { lt: "IT / informacinės sistemos", en: "IT / information systems" },
    "transportas":{ lt: "Transporto priemonės",      en: "Vehicles" },
    "statyba":    { lt: "Statyba ir remontas",       en: "Construction and repair" },
    "maistas":    { lt: "Maisto produktai",          en: "Food" },
    "media":      { lt: "Transliavimo laikas, programos", en: "Broadcasting time, programmes" }
  };
  var ETAPAI = {
    "planavimas": { lt: "Planavimas",              en: "Planning" },
    "rengimas":   { lt: "Dokumentų rengimas",      en: "Preparing documents" },
    "vertinimas": { lt: "Pasiūlymų vertinimas",    en: "Evaluating bids" },
    "sutartis":   { lt: "Sutarties sudarymas",     en: "Contract award" },
    "vykdymas":   { lt: "Sutarties vykdymas",      en: "Contract performance" }
  };

  var PRIVALOMI = ["id", "pavadinimas", "santrauka", "rusis", "saltinioTipas", "rezimas", "datos", "saltinis", "busena"];

  /* ---------- Pagalbinės ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Leidžiamas tik http(s) adresas - viskas kita (javascript:, data:, tuščia) atmetama. */
  function saugusAdresas(u) {
    if (typeof u !== "string") return null;
    var t = u.trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(t) ? t : null;
  }

  var LT_MAP = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
  function normalizuokTeksta(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/[ąčęėįšųūž]/g, function (c) { return LT_MAP[c]; });
  }

  function yraData(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z")); }
  function dienaISO(d) {
    var x = d instanceof Date ? d : new Date(d || Date.now());
    var m = x.getMonth() + 1, dd = x.getDate();
    return x.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
  }
  function dienuSkirtumas(nuo, iki) {
    if (!yraData(nuo) || !yraData(iki)) return null;
    return Math.round((Date.parse(iki + "T00:00:00Z") - Date.parse(nuo + "T00:00:00Z")) / DIENA);
  }
  var MEN_LT = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"];
  var MEN_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function datosTekstas(iso, lang) {
    if (!yraData(iso)) return lang === "en" ? "not specified" : "nenurodyta";
    var y = iso.slice(0, 4), m = parseInt(iso.slice(5, 7), 10) - 1, d = parseInt(iso.slice(8, 10), 10);
    return lang === "en" ? d + " " + MEN_EN[m] + " " + y : y + " m. " + MEN_LT[m] + " " + d + " d.";
  }

  function sarasas(x) { return Array.isArray(x) ? x.filter(function (v) { return typeof v === "string"; }) : []; }

  /* ---------- Įrašo normalizavimas ir tikrinimas ---------- */

  /* Grąžina kopiją su vienoda struktūra ir `klaidos` sąrašu. NIEKO neišgalvoja:
     trūkstama data lieka null, nežinoma būsena tampa „laukia“ su klaidos įrašu. */
  function normalizuok(ir) {
    var k = [];
    var o = (ir && typeof ir === "object") ? ir : {};
    var r = {
      id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : null,
      pavadinimas: typeof o.pavadinimas === "string" ? o.pavadinimas.trim() : "",
      santrauka: typeof o.santrauka === "string" ? o.santrauka.trim() : "",
      kasPasikeite: typeof o.kasPasikeite === "string" ? o.kasPasikeite : "",
      kamAktualu: typeof o.kamAktualu === "string" ? o.kamAktualu : "",
      veiksmas: typeof o.veiksmas === "string" ? o.veiksmas : "",
      rusis: RUSYS[o.rusis] ? o.rusis : null,
      saltinioTipas: SALTINIO_TIPAI[o.saltinioTipas] ? o.saltinioTipas : null,
      rezimas: sarasas(o.rezimas).filter(function (v) { return REZIMAI[v]; }),
      temos: sarasas(o.temos),
      datos: {},
      pereinamosios: typeof o.pereinamosios === "string" && o.pereinamosios.trim() ? o.pereinamosios : null,
      saltinis: { pavadinimas: "", url: null, vieta: "" },
      identifikatoriai: (o.identifikatoriai && typeof o.identifikatoriai === "object") ? o.identifikatoriai : {},
      keiciamasAktas: (o.keiciamasAktas && typeof o.keiciamasAktas === "object") ? o.keiciamasAktas : null,
      moduliai: [],
      aktualumas: null,
      busena: BUSENOS[o.busena] ? o.busena : null,
      busenosIstorija: Array.isArray(o.busenosIstorija) ? o.busenosIstorija.filter(function (x) { return x && typeof x === "object"; }) : [],
      reikiaSpecialisto: !!o.reikiaSpecialisto,
      specialistoPriezastis: typeof o.specialistoPriezastis === "string" ? o.specialistoPriezastis : "",
      projektoEiga: (o.projektoEiga && typeof o.projektoEiga === "object") ? o.projektoEiga : null,
      susije: sarasas(o.susije),
      patikrinta: yraData(o.patikrinta) ? o.patikrinta : null,
      pakeistas: (o.pakeistas && typeof o.pakeistas === "object") ? o.pakeistas : null,
      demo: !!o.demo,
      aiJuodrastis: !!o.aiJuodrastis,
      klaidos: k
    };
    var D = (o.datos && typeof o.datos === "object") ? o.datos : {};
    ["priimta", "paskelbta", "isigalioja", "aptikta"].forEach(function (l) {
      if (D[l] == null || D[l] === "") r.datos[l] = null;
      else if (yraData(D[l])) r.datos[l] = D[l];
      else { r.datos[l] = null; k.push("data „" + l + "“ netinkamo formato (reikia YYYY-MM-DD)"); }
    });
    r.datos.taikoma = typeof D.taikoma === "string" && D.taikoma.trim() ? D.taikoma : null;

    var S = (o.saltinis && typeof o.saltinis === "object") ? o.saltinis : {};
    r.saltinis.pavadinimas = typeof S.pavadinimas === "string" ? S.pavadinimas : "";
    r.saltinis.vieta = typeof S.vieta === "string" ? S.vieta : "";
    if (S.url != null && S.url !== "") {
      r.saltinis.url = saugusAdresas(S.url);
      if (!r.saltinis.url) k.push("šaltinio adresas atmestas (leidžiamas tik http/https)");
    }
    if (r.keiciamasAktas && r.keiciamasAktas.url != null) {
      r.keiciamasAktas = Object.assign({}, r.keiciamasAktas, { url: saugusAdresas(r.keiciamasAktas.url) });
    }

    (Array.isArray(o.moduliai) ? o.moduliai : []).forEach(function (m) {
      if (typeof m === "string") m = { modulis: m };
      if (!m || typeof m !== "object") return;
      if (!MODULIAI[m.modulis]) { k.push("nežinomas modulis „" + esc(m.modulis) + "“"); return; }
      r.moduliai.push({ modulis: m.modulis, kas: typeof m.kas === "string" ? m.kas : "",
                        sablonas: typeof m.sablonas === "string" ? m.sablonas : null,
                        inkaras: typeof m.inkaras === "string" ? m.inkaras : null });
    });

    var A = (o.aktualumas && typeof o.aktualumas === "object") ? o.aktualumas : null;
    if (A) {
      r.aktualumas = {
        proceduros: Array.isArray(A.proceduros) ? sarasas(A.proceduros) : null,
        objektai: Array.isArray(A.objektai) ? sarasas(A.objektai) : null,
        etapai: Array.isArray(A.etapai) ? sarasas(A.etapai) : null,
        nezinomas: !!A.nezinomas
      };
    }

    PRIVALOMI.forEach(function (l) {
      var v = r[l];
      var tuscia = v == null || v === "" || (Array.isArray(v) && !v.length);
      if (l === "datos") tuscia = false;
      if (l === "saltinis") tuscia = !r.saltinis.pavadinimas && !r.saltinis.url;
      if (tuscia) k.push("trūksta lauko „" + l + "“");
    });
    /* Nežinoma reikšmė NEtyli: pažymima klaida, o įrašas gauna atsargiausią numatytąją. */
    if (o.busena != null && !BUSENOS[o.busena]) k.push("nežinoma būsena „" + esc(o.busena) + "“ - laikoma „laukia“");
    if (o.rusis != null && !RUSYS[o.rusis]) k.push("nežinoma rūšis „" + esc(o.rusis) + "“");
    if (o.saltinioTipas != null && !SALTINIO_TIPAI[o.saltinioTipas]) k.push("nežinomas šaltinio tipas „" + esc(o.saltinioTipas) + "“");
    if (!r.busena) { r.busena = "laukia"; }
    if (!r.rusis) r.rusis = "priimtas";
    if (!r.saltinioTipas) r.saltinioTipas = "teises_norma";
    if (r.rusis !== "teismu_praktika" && r.rusis !== "projektas" && r.rusis !== "organizacijos_praktika" && !r.datos.isigalioja) {
      k.push("nenurodyta įsigaliojimo data");
    }
    if (!r.datos.priimta && !r.datos.paskelbta && !r.datos.isigalioja) k.push("nėra nė vienos datos");
    if (!r.saltinis.url) k.push("nėra šaltinio nuorodos");
    return r;
  }

  /* Dublikatų raktai: tie patys identifikatoriai reiškia tą patį dokumentą. */
  function dublikatoRaktai(r) {
    var I = r.identifikatoriai || {}, ks = [];
    if (I.eTarId) ks.push("etar:" + I.eTarId + ":" + (I.versija || ""));
    if (I.dokumentoId != null) ks.push("dok:" + I.dokumentoId);
    if (I.nr && I.data) ks.push("nr:" + normalizuokTeksta(I.nr) + ":" + I.data);
    if (I.bylosNr) ks.push("byla:" + normalizuokTeksta(I.bylosNr));
    if (r.saltinis && r.saltinis.url) ks.push("url:" + r.saltinis.url.toLowerCase());
    return ks;
  }

  /* Tikrina visą registrą: normalizuoja, randa dublikatus (antras ir tolesni
     pažymimi `dublikatas` su pirmojo id - jie NEIŠMETAMI tyliai, o parodomi). */
  function tikrink(registras) {
    var reg = (registras && typeof registras === "object") ? registras : {};
    var sar = Array.isArray(reg.irasai) ? reg.irasai : (Array.isArray(reg) ? reg : []);
    var irasai = [], klaidos = [], dublikatai = [], matyti = {}, idai = {};
    sar.forEach(function (x, i) {
      var r = normalizuok(x);
      if (!r.id) { r.id = "be-id-" + (i + 1); r.klaidos.push("trūksta id"); }
      if (idai[r.id]) { r.klaidos.push("pasikartojantis id"); dublikatai.push({ id: r.id, kaip: idai[r.id], priezastis: "id" }); r.dublikatas = idai[r.id]; }
      idai[r.id] = r.id;
      var rakt = dublikatoRaktai(r), pirmas = null;
      rakt.forEach(function (kk) { if (!pirmas && matyti[kk] && matyti[kk] !== r.id) pirmas = matyti[kk]; });
      if (pirmas) { r.dublikatas = pirmas; dublikatai.push({ id: r.id, kaip: pirmas, priezastis: "identifikatoriai" }); }
      rakt.forEach(function (kk) { if (!matyti[kk]) matyti[kk] = r.id; });
      r.klaidos.forEach(function (kl) { klaidos.push({ id: r.id, klaida: kl }); });
      irasai.push(r);
    });
    /* Prieštaraujantys paaiškinimai: du galiojantys įrašai apie TĄ PATĮ keičiamą aktą,
       su bendra tema, bet skirtingu rekomenduojamu veiksmu. Abu pažymimi, kad
       administratorius juos suderintų - sistema pati „teisingo“ nerenka. */
    var konfliktai = [];
    var aktyvus = irasai.filter(function (r) { return r.busena !== "archyvuota" && !r.pakeistas && !r.dublikatas && r.keiciamasAktas && r.keiciamasAktas.eTarId; });
    for (var a = 0; a < aktyvus.length; a++) {
      for (var b = a + 1; b < aktyvus.length; b++) {
        var x = aktyvus[a], y = aktyvus[b];
        if (x.keiciamasAktas.eTarId !== y.keiciamasAktas.eTarId) continue;
        var bendra = x.temos.some(function (t) { return y.temos.indexOf(t) !== -1; });
        if (!bendra) continue;
        var vx = (x.veiksmas || "").trim(), vy = (y.veiksmas || "").trim();
        if (!vx || !vy || vx === vy) continue;
        if (!x.konfliktas) x.konfliktas = y.id;
        if (!y.konfliktas) y.konfliktas = x.id;
        konfliktai.push({ id: x.id, su: y.id });
      }
    }
    var meta = (reg.meta && typeof reg.meta === "object") ? reg.meta : {};
    return { irasai: irasai, klaidos: klaidos, dublikatai: dublikatai, konfliktai: konfliktai, meta: meta };
  }

  /* ---------- Skiltys ---------- */

  /* „pasikeite“ - jau galioja (arba teismo išaiškinimas / praktika su data);
     „isigalios“ - priimta, įsigalios vėliau; „projektas“ - dar nepriimta;
     „archyvas“ - archyvuota / pakeista; „nezinoma“ - neaišku (trūksta datos). */
  function skiltis(r, dabar) {
    var d = yraData(dabar) ? dabar : dienaISO(dabar);
    if (r.busena === "archyvuota" || r.pakeistas) return "archyvas";
    if (r.rusis === "projektas") return "projektas";
    if (r.datos.isigalioja) return r.datos.isigalioja > d ? "isigalios" : "pasikeite";
    if (r.rusis === "teismu_praktika" || r.rusis === "organizacijos_praktika") {
      var data = r.datos.priimta || r.datos.paskelbta;
      if (!data) return "nezinoma";
      return data > d ? "isigalios" : "pasikeite";
    }
    return "nezinoma";
  }

  /* Įrašas priklauso „Ką reikia peržiūrėti?“, kai turi veiksmą arba susietų modulių
     ir nėra archyvuotas. Naudotojo užbaigtos peržiūros atskiriamos žurnale. */
  function reikiaPerziureti(r) {
    if (r.busena === "archyvuota" || r.pakeistas) return false;
    return !!(r.veiksmas && r.veiksmas.trim()) || r.moduliai.length > 0;
  }

  /* Rikiavimas: įsigaliosiantys - artimiausi pirmi; pasikeitę - naujausi pirmi. */
  function svarbiData(r) { return r.datos.isigalioja || r.datos.priimta || r.datos.paskelbta || ""; }
  function rikiuok(sar, kaip) {
    var s = sar.slice();
    s.sort(function (a, b) {
      var x = svarbiData(a), y = svarbiData(b);
      if (!x && !y) return 0; if (!x) return 1; if (!y) return -1;
      return kaip === "artimiausi" ? (x < y ? -1 : x > y ? 1 : 0) : (x > y ? -1 : x < y ? 1 : 0);
    });
    return s;
  }

  /* ---------- Aktualumas pagal pirkimo kontekstą ---------- */

  /* ctx: { rezimas: "PI"|"VPI", procedura, objektas, etapas, skelbimoData (YYYY-MM-DD) }
     Grąžina { lygis: "aktualu"|"galimai"|"neaktualu"|"nezinoma", priezastys: [..] }.
     Kai įrašas neturi aktualumo požymių arba jie pažymėti nežinomais - „nezinoma“.
     Teisiškai reikšmingos datos: jei planuojama skelbimo data ankstesnė už
     įsigaliojimą - dar netaikoma, bet rodoma su pereinamąja nuostata. */
  function aktualumas(r, ctx, lang) {
    var L = lang === "en" ? "en" : "lt";
    var c = ctx || {};
    var pr = [];
    var t = function (lt, en) { return L === "en" ? en : lt; };
    if (c.rezimas && r.rezimas.length && r.rezimas.indexOf(c.rezimas) === -1) {
      return { lygis: "neaktualu", priezastys: [t("Įrašas taikomas tik " + r.rezimas.map(function (x) { return x === "PI" ? "PĮ" : "VPĮ"; }).join(", ") + " režimui",
                                                 "Applies only to " + r.rezimas.join(", ") + " regime")] };
    }
    if (r.rusis === "projektas") pr.push(t("Projektas - dar nepriimtas, gali keistis", "Draft - not adopted, may change"));
    var A = r.aktualumas;
    if (!A || A.nezinomas) {
      pr.push(t("Aktualumas konkrečiam pirkimui nenustatytas - reikalingas vertinimas", "Relevance to a specific procurement not determined - assessment needed"));
      return { lygis: "nezinoma", priezastys: pr };
    }
    var lygis = "galimai", atitiko = 0, tikrinta = 0;
    function tik(saras, reiksme, zod) {
      if (!saras) return;                           // null = taikoma visiems
      if (!reiksme) { pr.push(t("Nenurodyta: " + zod.lt, "Not specified: " + zod.en)); return; }
      tikrinta++;
      if (saras.indexOf(reiksme) !== -1) { atitiko++; }
      else pr.push(t(zod.lt + " neatitinka (" + saras.join(", ") + ")", zod.en + " does not match (" + saras.join(", ") + ")"));
    }
    tik(A.proceduros, c.procedura, { lt: "pirkimo būdas", en: "procedure" });
    tik(A.objektai, c.objektas, { lt: "pirkimo objektas", en: "object" });
    tik(A.etapai, c.etapas, { lt: "etapas", en: "stage" });
    if (tikrinta && atitiko === tikrinta) lygis = "aktualu";
    else if (tikrinta && atitiko === 0) lygis = "neaktualu";
    else if (!tikrinta && !A.proceduros && !A.objektai && !A.etapai) lygis = "aktualu";
    if (yraData(c.skelbimoData) && r.datos.isigalioja) {
      if (c.skelbimoData < r.datos.isigalioja) {
        pr.push(t("Planuojama skelbti " + c.skelbimoData + " - anksčiau nei įsigalioja (" + r.datos.isigalioja + ")" + (r.pereinamosios ? "; žr. pereinamąsias nuostatas" : ""),
                  "Planned publication " + c.skelbimoData + " is before entry into force (" + r.datos.isigalioja + ")" + (r.pereinamosios ? "; see transitional provisions" : "")));
        if (lygis === "aktualu") lygis = "galimai";
      } else {
        pr.push(t("Įsigalioja iki planuojamo skelbimo - taikoma", "In force before planned publication - applies"));
      }
    }
    if (r.reikiaSpecialisto) pr.push(t("Reikalingas specialisto vertinimas", "Specialist assessment required"));
    return { lygis: lygis, priezastys: pr };
  }

  /* ---------- Paieška ir filtrai ---------- */

  function tekstasPaieskai(r) {
    var dalys = [r.pavadinimas, r.santrauka, r.kasPasikeite, r.kamAktualu, r.veiksmas, r.pereinamosios,
                 r.saltinis.pavadinimas, r.saltinis.vieta, r.temos.join(" "),
                 r.moduliai.map(function (m) { return m.modulis + " " + m.kas; }).join(" ")];
    var I = r.identifikatoriai || {};
    Object.keys(I).forEach(function (k) { if (typeof I[k] === "string" || typeof I[k] === "number") dalys.push(String(I[k])); });
    return normalizuokTeksta(dalys.join(" \n "));
  }

  /* f: { uzklausa, rezimas, tema, saltinioTipas, rusis, modulis, busena, nuo, iki, archyvuoti, tikDemo } */
  function filtruok(irasai, f, dabar) {
    var F = f || {};
    var zodziai = normalizuokTeksta(F.uzklausa || "").split(/\s+/).filter(Boolean);
    return irasai.filter(function (r) {
      if (!F.archyvuoti && skiltis(r, dabar) === "archyvas") return false;
      if (F.rezimas && r.rezimas.length && r.rezimas.indexOf(F.rezimas) === -1) return false;
      if (F.tema && r.temos.indexOf(F.tema) === -1) return false;
      if (F.saltinioTipas && r.saltinioTipas !== F.saltinioTipas) return false;
      if (F.rusis && r.rusis !== F.rusis) return false;
      if (F.busena && r.busena !== F.busena) return false;
      if (F.modulis && !r.moduliai.some(function (m) { return m.modulis === F.modulis; })) return false;
      if (F.nuo || F.iki) {
        var d = svarbiData(r);
        if (!d) return !!F.rodytiBeDatos;
        if (F.nuo && d < F.nuo) return false;
        if (F.iki && d > F.iki) return false;
      }
      if (zodziai.length) {
        var t = tekstasPaieskai(r);
        for (var i = 0; i < zodziai.length; i++) if (t.indexOf(zodziai[i]) === -1) return false;
      }
      return true;
    });
  }

  /* ---------- Rinkinio (žinių rinkinio) būsena ---------- */

  /* meta: { versija, patikrinta, apreptis, rezimas }. Senas rinkinys - kai paskutinė
     patikra senesnė nei `dienuRiba` (numatyta 45 d.) arba jos nėra. */
  function rinkinioBusena(meta, dabar, dienuRiba) {
    var m = meta || {}, d = yraData(dabar) ? dabar : dienaISO(dabar), riba = dienuRiba || 45;
    var pat = yraData(m.patikrinta) ? m.patikrinta : null;
    var senumas = pat ? dienuSkirtumas(pat, d) : null;
    return {
      versija: typeof m.versija === "string" ? m.versija : null,
      patikrinta: pat,
      senumasDienomis: senumas,
      pasenes: !pat || senumas > riba,
      apreptis: typeof m.apreptis === "string" ? m.apreptis : "",
      rezimas: typeof m.rezimas === "string" ? m.rezimas : "rankinis"
    };
  }

  /* ---------- Peržiūrų žurnalas (naudotojo, tik naršyklėje) ---------- */

  var PERZIURU_RAKTAS = "ppteise.perziuros";

  function perziuros(saugykla, raktas) {
    var st = saugykla || global.localStorage, k = raktas || PERZIURU_RAKTAS;
    try { var v = st.getItem(k); var o = v ? JSON.parse(v) : {}; return (o && typeof o === "object") ? o : {}; }
    catch (e) { return {}; }
  }
  /* įrašas: { kas, pagrindimas, data } - pagrindimas privalomas (Metodikos 7.3 p. dvasia:
     sprendimas turi būti pagrįstas), be jo grąžina { ok:false }. */
  function pazymekPerziureta(saugykla, irasoId, duom, raktas) {
    var d = duom || {};
    if (!irasoId) return { ok: false, klaida: "nėra įrašo id" };
    if (!d.pagrindimas || !String(d.pagrindimas).trim()) return { ok: false, klaida: "reikalingas pagrindimas" };
    var visos = perziuros(saugykla, raktas);
    visos[irasoId] = { kas: String(d.kas || "").trim(), pagrindimas: String(d.pagrindimas).trim(),
                       data: yraData(d.data) ? d.data : dienaISO(), rinkinys: d.rinkinys || null };
    try { (saugykla || global.localStorage).setItem(raktas || PERZIURU_RAKTAS, JSON.stringify(visos)); }
    catch (e) { return { ok: false, klaida: "saugykla neprieinama" }; }
    return { ok: true, irasas: visos[irasoId] };
  }
  function atsaukPerziura(saugykla, irasoId, raktas) {
    var visos = perziuros(saugykla, raktas);
    delete visos[irasoId];
    try { (saugykla || global.localStorage).setItem(raktas || PERZIURU_RAKTAS, JSON.stringify(visos)); } catch (e) { return false; }
    return true;
  }

  /* ---------- Įkėlimas ---------- */

  /* Grąžina { ok:true, registras, offline, tikrinta } arba { ok:false, klaida }.
     NIEKADA negrąžina „tuščio, bet ok“ rezultato dėl tinklo klaidos. `offline` -
     kai service worker atsakė iš talpyklos (antraštė X-GP-Offline). */
  function ikelk(url, opts) {
    var o = opts || {};
    var f = o.fetch || (global.fetch ? global.fetch.bind(global) : null);
    if (!f) return Promise.resolve({ ok: false, klaida: "naršyklė nepalaiko fetch" });
    var p;
    try { p = f(url, { cache: "no-store" }); } catch (e) { return Promise.resolve({ ok: false, klaida: String(e && e.message || e) }); }
    return p.then(function (res) {
      if (!res || !res.ok) return { ok: false, klaida: "HTTP " + (res ? res.status : "?"), status: res ? res.status : 0 };
      var offline = !!(res.headers && res.headers.get && res.headers.get("X-GP-Offline"));
      return res.json().then(function (j) {
        var t = tikrink(j);
        return { ok: true, registras: j, tikrinta: t, offline: offline };
      }, function () { return { ok: false, klaida: "registro failas ne JSON" }; });
    }, function (e) { return { ok: false, klaida: "tinklo klaida: " + String(e && e.message || e) }; });
  }

  /* ---------- Bendra stilių dalis įterpiamiems blokams ---------- */

  var STILIAUS_ID = "gp-stebesena-stilius";
  function stilius(doc) {
    if (doc.getElementById(STILIAUS_ID)) return;
    var css = [
      ".gps{font-family:var(--font-base,'Nunito Sans',sans-serif);color:var(--color-graphite,#2E3641);",
      "  background:var(--color-white,#fff);border:1px solid var(--color-graphite-15,#E1E2E4);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.5}",
      ".gps__head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}",
      ".gps__title{font-weight:800;font-size:15px;margin:0;color:var(--color-graphite,#2E3641);text-transform:none;letter-spacing:0}",
      ".gps__meta{font-size:12px;color:var(--color-graphite-50,#737483)}",
      ".gps__list{list-style:none;margin:0;padding:0;display:grid;gap:8px}",
      ".gps__item{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;padding:8px 10px;border-radius:8px;background:var(--color-graphite-5,#EFF1F1)}",
      ".gps__date{font-size:12px;font-weight:800;white-space:nowrap;padding:2px 8px;border-radius:20px;background:#fff;border:1px solid var(--color-graphite-15,#E1E2E4);color:var(--color-graphite,#2E3641)}",
      ".gps__date--future{border-color:rgba(0,102,125,.3);color:var(--color-blue,#00667D)}",
      ".gps__item a{color:var(--color-graphite,#2E3641);font-weight:700;text-decoration:none}",
      ".gps__item a:hover,.gps__item a:focus-visible{text-decoration:underline;outline-offset:2px}",
      ".gps__sub{font-size:12px;color:var(--color-graphite-50,#737483);margin-top:2px}",
      ".gps__foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:var(--color-graphite-50,#737483)}",
      ".gps__foot a{color:var(--color-emerald-120,#128A76);font-weight:800;text-decoration:none}",
      ".gps__foot a:hover,.gps__foot a:focus-visible{text-decoration:underline}",
      ".gps__err{padding:10px 12px;border-radius:8px;background:var(--color-error-5,#FBEBEE);color:#7F1722;font-weight:700}",
      ".gps__warn{padding:8px 10px;border-radius:8px;background:var(--color-warning-5,#FEF6E8);color:#6B4A00;font-size:12px;margin-bottom:8px}",
      ".gps__tag{display:inline-block;font-size:11px;font-weight:800;padding:1px 7px;border-radius:20px;border:1px solid var(--color-graphite-30,#C7CDD3);color:var(--color-graphite-50,#737483);margin-left:6px;vertical-align:middle}",
      "@media (max-width:640px){.gps__item{grid-template-columns:1fr}.gps__date{justify-self:start}}",
      "@media print{.gps{display:none}}"
    ].join("\n");
    var st = doc.createElement("style"); st.id = STILIAUS_ID; st.textContent = css;
    (doc.head || doc.documentElement).appendChild(st);
  }

  var TEKSTAI = {
    lt: { pav: "Pirkimų teisės stebėsena", kraunama: "Kraunama...", klaida: "Nepavyko įkelti stebėsenos duomenų",
          visi: "Visi pokyčiai", isigalios: "Įsigalios", pasikeite: "Pasikeitė", projektas: "Projektas",
          laukia: "laukia specialisto patvirtinimo", patikrinta: "Rinkinys patikrintas", pasenes: "Rinkinys senas - paskutinė patikra prieš {n} d.",
          nera: "Šio modulio kontekste įrašų nėra", moduliui: "Aktualu šiam moduliui", offline: "Be interneto - rodomas atsisiųstas rinkinys",
          be_datos: "data nenurodyta", tuscias: "Registre įrašų nėra" },
    en: { pav: "Procurement law monitoring", kraunama: "Loading...", klaida: "Could not load monitoring data",
          visi: "All changes", isigalios: "Enters into force", pasikeite: "Changed", projektas: "Draft",
          laukia: "awaiting specialist confirmation", patikrinta: "Set checked", pasenes: "Set is stale - last check {n} days ago",
          nera: "No entries for this module", moduliui: "Relevant to this module", offline: "Offline - showing downloaded set",
          be_datos: "date not specified", tuscias: "No entries in the registry" }
  };

  function atgal(kelias) { return (kelias || "").replace(/\/+$/, ""); }

  /* Kompaktiškas blokas portalui ir kontekstinės nuorodos moduliams - vienas piešėjas.
     cfg: { target, url, lang | getLang, modulis (nebūtinas), rezimas (nebūtinas), limit,
            saknis ("" portale, ".." modulyje), dabar, fetch }. */
  function mount(cfg) {
    var doc = global.document;
    var el = typeof cfg.target === "string" ? doc.querySelector(cfg.target) : cfg.target;
    if (!el) return null;
    stilius(doc);
    var lang = (typeof cfg.getLang === "function" ? cfg.getLang() : cfg.lang) === "en" ? "en" : "lt";
    var T = TEKSTAI[lang];
    var saknis = atgal(cfg.saknis == null ? ".." : cfg.saknis);
    var modulioUrl = (saknis ? saknis + "/" : "") + "PP-teise/index.html";
    var url = cfg.url || ((saknis ? saknis + "/" : "") + "PP-teise/duomenys/registras.json");
    var limit = cfg.limit || 3;
    el.innerHTML = '<section class="gps" aria-live="polite"><div class="gps__head"><h3 class="gps__title">' + esc(T.pav) + '</h3><span class="gps__meta">' + esc(T.kraunama) + '</span></div></section>';

    return ikelk(url, { fetch: cfg.fetch }).then(function (r) {
      var dabar = cfg.dabar || dienaISO();
      if (!r.ok) {
        el.innerHTML = '<section class="gps"><div class="gps__head"><h3 class="gps__title">' + esc(T.pav) + '</h3></div>' +
          '<div class="gps__err" role="alert">' + esc(T.klaida) + ' (' + esc(r.klaida) + ').</div>' +
          '<div class="gps__foot"><span></span><a href="' + esc(modulioUrl) + '">' + esc(T.visi) + ' →</a></div></section>';
        return r;
      }
      var visi = r.tikrinta.irasai.filter(function (x) { return !x.demo && skiltis(x, dabar) !== "archyvas"; });
      if (cfg.modulis) visi = visi.filter(function (x) { return x.moduliai.some(function (m) { return m.modulis === cfg.modulis; }); });
      if (cfg.rezimas) visi = visi.filter(function (x) { return !x.rezimas.length || x.rezimas.indexOf(cfg.rezimas) !== -1; });
      var isig = rikiuok(visi.filter(function (x) { return skiltis(x, dabar) === "isigalios"; }), "artimiausi");
      var pasik = rikiuok(visi.filter(function (x) { return skiltis(x, dabar) === "pasikeite"; }), "naujausi");
      var proj = visi.filter(function (x) { return skiltis(x, dabar) === "projektas"; });
      /* Susieti įrašai (pvz. tas pats pakeitimas PĮ ir VPĮ) kompaktiškame bloke rodomi vieną kartą -
         antrasis praleidžiamas, kad trys vietos netektų dviem to paties pokyčio versijoms. */
      var rodyti = [], rodomi = {};
      isig.slice(0, Math.max(1, Math.ceil(limit / 2))).concat(pasik).concat(proj).forEach(function (x) {
        if (rodyti.length >= limit || rodomi[x.id]) return;
        if (x.susije.some(function (id) { return rodomi[id]; })) return;
        rodyti.push(x); rodomi[x.id] = true;
      });
      var rb = rinkinioBusena(r.tikrinta.meta, dabar);
      var laukia = visi.filter(function (x) { return x.busena !== "patvirtinta"; }).length;
      var h = '<section class="gps"><div class="gps__head"><h3 class="gps__title">' + esc(cfg.modulis ? T.moduliui : T.pav) + '</h3>' +
              '<span class="gps__meta">' + (rb.versija ? "v" + esc(rb.versija) + " · " : "") + esc(visi.length) + (lang === "en" ? " entries" : " įr.") + '</span></div>';
      if (r.offline) h += '<div class="gps__warn">' + esc(T.offline) + (rb.patikrinta ? " (" + esc(datosTekstas(rb.patikrinta, lang)) + ")" : "") + '</div>';
      if (rb.pasenes) h += '<div class="gps__warn">' + esc(T.pasenes.replace("{n}", rb.senumasDienomis == null ? "?" : rb.senumasDienomis)) + '</div>';
      if (!rodyti.length) h += '<p class="gps__sub">' + esc(cfg.modulis ? T.nera : T.tuscias) + '</p>';
      else {
        h += '<ul class="gps__list">';
        rodyti.forEach(function (x) {
          var sk = skiltis(x, dabar), d = svarbiData(x);
          var zyma = sk === "isigalios" ? T.isigalios : sk === "projektas" ? T.projektas : T.pasikeite;
          h += '<li class="gps__item"><span class="gps__date' + (sk === "isigalios" ? " gps__date--future" : "") + '">' + esc(zyma) + (d ? " · " + esc(d) : " · " + esc(T.be_datos)) + '</span>' +
               '<div><a href="' + esc(modulioUrl) + '#irasas=' + encodeURIComponent(x.id) + '">' + esc(x.pavadinimas) + '</a>' +
               (x.busena !== "patvirtinta" ? '<span class="gps__tag">' + esc(BUSENOS[x.busena][lang]) + '</span>' : "") +
               '<div class="gps__sub">' + esc(x.santrauka.length > 160 ? x.santrauka.slice(0, 157) + "..." : x.santrauka) + '</div></div></li>';
        });
        h += '</ul>';
      }
      h += '<div class="gps__foot"><span>' + (rb.patikrinta ? esc(T.patikrinta) + " " + esc(datosTekstas(rb.patikrinta, lang)) : "") +
           (laukia ? " · " + esc(laukia) + " " + esc(T.laukia) : "") + '</span><a href="' + esc(modulioUrl) + (cfg.modulis ? "?modulis=" + encodeURIComponent(cfg.modulis) : "") + '">' + esc(T.visi) + ' →</a></div></section>';
      el.innerHTML = h;
      return r;
    });
  }

  global.GP_STEBESENA = {
    BUSENOS: BUSENOS, RUSYS: RUSYS, SALTINIO_TIPAI: SALTINIO_TIPAI, REZIMAI: REZIMAI, TEMOS: TEMOS,
    MODULIAI: MODULIAI, PROCEDUROS: PROCEDUROS, OBJEKTAI: OBJEKTAI, ETAPAI: ETAPAI, PRIVALOMI: PRIVALOMI,
    PERZIURU_RAKTAS: PERZIURU_RAKTAS,
    esc: esc, saugusAdresas: saugusAdresas, normalizuokTeksta: normalizuokTeksta,
    yraData: yraData, dienaISO: dienaISO, dienuSkirtumas: dienuSkirtumas, datosTekstas: datosTekstas,
    normalizuok: normalizuok, tikrink: tikrink, dublikatoRaktai: dublikatoRaktai,
    skiltis: skiltis, reikiaPerziureti: reikiaPerziureti, svarbiData: svarbiData, rikiuok: rikiuok,
    aktualumas: aktualumas, filtruok: filtruok, tekstasPaieskai: tekstasPaieskai,
    rinkinioBusena: rinkinioBusena,
    perziuros: perziuros, pazymekPerziureta: pazymekPerziureta, atsaukPerziura: atsaukPerziura,
    ikelk: ikelk, mount: mount, TEKSTAI: TEKSTAI
  };
})(typeof window !== "undefined" ? window : this);
