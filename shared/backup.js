/* ============================================================================
 * G-Procure  shared/backup.js   (v1.0)
 * ----------------------------------------------------------------------------
 * Atsarginės duomenų kopijos branduolys (window.GP_BACKUP).
 *
 * KODEL ATSKIRAI NUO PUSLAPIO. Visi moduliai gyvena toje pačioje kilmėje
 * (g-procure.com), tad jie dalijasi viena localStorage saugykla. Kopijos logika
 * čia parašyta taip, kad saugykla paduodama iš išorės - todėl testai gali paduoti
 * netikrą saugyklą ir NIEKADA neliesti tikrų naudotojo duomenų. Sąsaja
 * (`atsargine-kopija.html`) paduoda tikrą `localStorage`.
 *
 * Saugyklos objektas turi turėti: length, key(i), getItem(k), setItem(k, v).
 *
 * Failo formatas (v1):
 *   { app: "G-Procure", version: 1, createdAt: ISO, origin: "...", items: { raktas: reikšmė } }
 * ==========================================================================*/
(function (global) {
  "use strict";

  var APP = "G-Procure";
  var VERSION = 1;

  /* Raktų prefiksai -> modulis ir žmogui suprantamas pavadinimas.
     Nežinomas raktas NEDINGSTA: jis patenka į kopiją ir rodomas kaip „kiti duomenys". */
  var ZENKLAI = [
    ["litgrid_procurements",     "PP-protocol",     { lt: "Pirkimai ir protokolai", en: "Procurements and minutes" }],
    ["litgrid_pranesimai_audit", "PP-protocol",     { lt: "Audito žurnalas", en: "Audit log" }],
    ["litgrid_pranesimai",       "PP-protocol",     { lt: "Pranešimai tiekėjams", en: "Notices to suppliers" }],
    ["litgrid_user_profile",     "PP-protocol",     { lt: "Naudotojo profilis", en: "User profile" }],
    ["litgrid_pirkimo_drafts",   "PP-report",       { lt: "Pažymų juodraščiai", en: "Report drafts" }],
    ["litgrid_cba",              "PP-cost-benefit", { lt: "Kaštų ir naudos analizė", en: "Cost-benefit analysis" }],
    ["epsog_en_skaiciuokle",     "PP-cost-benefit", { lt: "Ekonominio naudingumo skaičiuoklė", en: "Economic benefit calculator" }],
    ["epsog_rinkos_kpi",         "PP-market-KPI",   { lt: "Rinkos rodikliai", en: "Market indicators" }],
    ["ppmarket.lang",            "PP-market-KPI",   { lt: "Pasirinkta kalba", en: "Chosen language" }],
    ["epsog_mpp",                "PP-plan",         { lt: "Metinis pirkimų planas", en: "Annual procurement plan" }],
    ["epsog_dash_metric",        "PP-plan",         { lt: "Suvestinės rodiklis (vertė ar kiekis)", en: "Dashboard measure (value or count)" }],
    ["epsog_derybos",            "PP-negotiation",  { lt: "Derybų pasirengimas", en: "Negotiation preparation" }],
    ["ppnegotiation.lang",       "PP-negotiation",  { lt: "Pasirinkta kalba", en: "Chosen language" }],
    ["pp_carbon_data",           "PP-carbon",       { lt: "Anglies pėdsako duomenys", en: "Carbon footprint data" }],
    ["ppcarbon.lang",            "PP-carbon",       { lt: "Pasirinkta kalba (EPD įrankis)", en: "Chosen language (EPD tool)" }],
    ["ppesg.lang",               "PP-esg",          { lt: "Pasirinkta kalba", en: "Chosen language" }],
    ["ppesg.",                   "PP-esg",          { lt: "ESG ir atitiktis", en: "ESG and compliance" }],
    ["pp_tiekejams",             "PP-tiekejams",    { lt: "Tiekėjų asistento duomenys", en: "Supplier assistant data" }],
    ["pptiekejams.lang",         "PP-tiekejams",    { lt: "Pasirinkta kalba", en: "Chosen language" }],
    ["ts_asistentas",            "PP-ts",           { lt: "TS asistento nustatymai", en: "Spec assistant settings" }],
    ["ppteise.",                 "PP-teise",        { lt: "Teisės stebėsenos peržiūros ir nustatymai", en: "Law monitoring reviews and settings" }],
    ["gprocure.korteles",        "G-Procure",       { lt: "Pirkimų kortelės", en: "Procurement cards" }],
    ["gprocure.sutartys.stebejimas", "PP-salygos",  { lt: "Sutarčių parinkimo stebėjimo įrašai", en: "Contract selection observation records" }],
    ["gprocure.salygos.nustatymai", "PP-salygos",  { lt: "Nustatymai (jūsų įvesta vidaus taisyklių riba)", en: "Settings (internal-rule threshold you entered)" }],
    ["gprocure.salygos.juodrastis.", "PP-salygos", { lt: "Pirkimo sąlygų juodraštis (atsakymai, numatoma vertė)", en: "Procurement conditions draft (answers, estimated value)" }],
    ["gprocure_help_collapsed",  "-",               { lt: "Pagalbos bloko būsena", en: "Help panel state" }],
    ["gprocure.infoPanel.",      "-",               { lt: "Informacinės skilties būsena", en: "Information panel state" }],
    ["gprocure-lang",            "-",               { lt: "Pasirinkta kalba", en: "Chosen language" }],
    ["gprocure.sutikimas",       "-",               { lt: "Jūsų sprendimas dėl slapukų", en: "Your cookie decision" }]
  ];

  function zenklas(raktas, lang) {
    var l = lang === "en" ? "en" : "lt";
    /* Neperskaitomo įrašo kopija (shared/saugykla.js): „<raktas>.sugadinta-<data>“. */
    var sug = String(raktas).indexOf(".sugadinta-") > 0;
    for (var i = 0; i < ZENKLAI.length; i++) {
      if (String(raktas).indexOf(ZENKLAI[i][0]) === 0) {
        return { modulis: ZENKLAI[i][1], pav: ZENKLAI[i][2][l] + (sug ? (l === "en" ? " (unreadable copy)" : " (neperskaitoma kopija)") : "") };
      }
    }
    return { modulis: "-", pav: l === "en" ? "Other data" : "Kiti duomenys" };
  }

  /* Visi saugyklos įrašai, didžiausi viršuje. Grąžina null, jei saugykla neprieinama
     (privatus langas, užblokuoti svetainės duomenys). */
  function irasai(saugykla) {
    var st = saugykla || global.localStorage;
    var out = [];
    try {
      for (var i = 0; i < st.length; i++) {
        var k = st.key(i);
        var v = st.getItem(k);
        out.push({ raktas: k, reiksme: v, baitai: baitai(k) + baitai(v) });
      }
    } catch (e) { return null; }
    out.sort(function (a, b) { return b.baitai - a.baitai; });
    return out;
  }

  /* UTF-8 baitai be Blob (veikia ir be DOM). */
  function baitai(s) {
    s = String(s == null ? "" : s);
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c & 0xFC00) === 0xD800 ? 2 : 3;
    }
    return n;
  }

  function surinkti(saugykla, data) {
    var sar = irasai(saugykla);
    if (sar === null) return null;
    var items = {};
    for (var i = 0; i < sar.length; i++) items[sar[i].raktas] = sar[i].reiksme;
    return {
      app: APP,
      version: VERSION,
      createdAt: (data || new Date()).toISOString(),
      origin: (global.location && global.location.origin) || "",
      items: items
    };
  }

  /* Failo tekstas -> { ok: true, obj } arba { ok: false, priezastis: "json" | "formatas" | "reiksmes", raktai } */
  function patikrinti(tekstas) {
    var obj;
    try { obj = JSON.parse(tekstas); } catch (e) { return { ok: false, priezastis: "json" }; }
    if (!obj || obj.app !== APP || !obj.items || typeof obj.items !== "object" || Array.isArray(obj.items)) {
      return { ok: false, priezastis: "formatas" };
    }
    /* Saugykloje reikšmės - tik tekstas (taip jas grąžina localStorage ir įrašo surinkti()). Skaičius ar objektas
       (pvz. ranka taisytame faile) būtų įrašytas kaip „5“ ar „[object Object]“ ir perrašytų tikrus duomenis (2026-09-28). */
    var blogi = Object.keys(obj.items).filter(function (k) { return typeof obj.items[k] !== "string"; });
    if (blogi.length) return { ok: false, priezastis: "reiksmes", raktai: blogi };
    /* Naujesnės kopijos formato versijos šis puslapis nežino (2026-11-06; iki tol atkurdavo be įspėjimo). */
    if (typeof obj.version === "number" && obj.version > VERSION) return { ok: false, priezastis: "versija", versija: obj.version };
    /* Reikšmė, kuri atrodo kaip JSON, bet neperskaitoma (nukirptas ar ranka taisytas failas), - visa kopija neatkuriama: kitaip
       ji perrašytų gerus duomenis, o modulis rodytų „sugadinta“ (2026-11-06, naujo naudotojo patikra - dingo 12 kortelių).
       Neperskaitomų įrašų kopijos („.sugadinta-“) - tokios ir turi būti. */
    var sug = Object.keys(obj.items).filter(function (k) {
      if (k.indexOf(".sugadinta-") > 0) return false;
      var v = obj.items[k].replace(/^\s+/, "");
      if (v.charAt(0) !== "{" && v.charAt(0) !== "[") return false;
      try { JSON.parse(v); return false; } catch (e) { return true; }
    });
    if (sug.length) return { ok: false, priezastis: "sugadinta", raktai: sug };
    return { ok: true, obj: obj };
  }

  /* Įrašų sąrašas JSON reikšmėje (kortelės, pirkimai, plano eilutės): masyvas, objekto masyvo laukas arba objektas-žemėlapis.
     Grąžina [{ id, pav }] arba null (ne įrašų sąrašas). */
  function irasuSarasas(tekstas) {
    var v;
    try { v = JSON.parse(tekstas); } catch (e) { return null; }
    var sar = null, rakt = false;
    if (Array.isArray(v)) sar = v;
    else if (v && typeof v === "object") {
      ["korteles", "irasai", "items", "records", "projects"].forEach(function (f) { if (!sar && Array.isArray(v[f])) sar = v[f]; });
      if (!sar) {
        var ks = Object.keys(v);
        if (ks.length && ks.every(function (k) { return v[k] && typeof v[k] === "object" && !Array.isArray(v[k]); })) { sar = ks.map(function (k) { return v[k]; }); rakt = ks; }
      }
    }
    if (!sar || !sar.length || !sar.every(function (x) { return x && typeof x === "object"; })) return null;
    var out = [];
    for (var i = 0; i < sar.length; i++) {
      var x = sar[i], id = x.id != null ? String(x.id) : rakt ? rakt[i] : null;
      if (id == null) return null;
      out.push({ id: id, pav: String(x.pavadinimas || x.name || x.title || x.pirkimas || id).slice(0, 120) });
    }
    return out;
  }

  /* Ką atkūrimas padarys kiekvienam failo įrašui (2026-11-06): [{ raktas, busena: "naujas" | "tas pats" | "pakeis" | "praleidziamas",
     prarandami: [{ id, pav }] }]. prarandami - įrašai (kortelės, pirkimai), kurie yra šioje naršyklėje, bet ne faile: atkūrus jų nebeliktų
     (iki tol rodyta tik „1 įrašas bus perrašytas“, nors tame įraše - visos kortelės). */
  var PRALEISTI = { "gprocure.sutikimas": 1 };       // sutikimą dėl slapukų duoda šios naršyklės žmogus - iš kopijos neperimamas

  /* Pirkimų kortelės atkuriant SUJUNGIAMOS pagal id (2026-11-06, naudotojo sprendimas): tik šioje naršyklėje esančios lieka, tik faile -
     pridedamos, abiejose - paliekama vėliau keista (atnaujinta; vienoda - šios naršyklės). Kitų duomenų rūšių reikšmė pakeičiama, kaip iki tol.
     Grąžina { reiksme, pridedama, lieka, atnaujinama, paliekama } (sąrašai [{ id, pav }]) arba null - kai kuri nors reikšmė ne kortelių
     sandaros (tada - pakeičiama visa, kaip kitų rūšių). */
  function kortelesJungti(dab, fail) {
    var a, b;
    try { a = JSON.parse(dab); b = JSON.parse(fail); } catch (e) { return null; }
    var ok = function (v) { return v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.korteles); };
    if (!ok(a) || !ok(b)) return null;
    var id = function (x) { return x && typeof x === "object" && x.id != null && String(x.id) ? String(x.id) : null; };
    var pav = function (x) { return { id: id(x), pav: String(x.pavadinimas || x.numeris || x.id).slice(0, 120) }; };
    var failo = {}, out = { pridedama: [], lieka: [], atnaujinama: [], paliekama: [] }, sar = [], panaudota = {};
    b.korteles.forEach(function (x) { var i = id(x); if (i && !failo[i]) failo[i] = x; });
    a.korteles.forEach(function (x) {
      var i = id(x);
      if (!i) { sar.push(x); return; }                       // nežinomos formos įrašas - lieka, kaip skaitant kortelę
      if (!failo[i]) { sar.push(x); out.lieka.push(pav(x)); return; }
      panaudota[i] = 1;
      var y = failo[i], naujesnis = String(y.atnaujinta || "") > String(x.atnaujinta || "");
      sar.push(naujesnis ? y : x);
      (naujesnis ? out.atnaujinama : out.paliekama).push(pav(naujesnis ? y : x));
    });
    var buve = JSON.stringify(a.korteles.filter(function (x) { return !id(x); }));
    b.korteles.forEach(function (x) {
      var i = id(x);
      if (i && !panaudota[i]) { panaudota[i] = 1; sar.push(x); out.pridedama.push(pav(x)); }
      else if (!i && buve.indexOf(JSON.stringify(x)) < 0) sar.push(x);
    });
    var schema = Math.max(typeof a.schema === "number" ? a.schema : 1, typeof b.schema === "number" ? b.schema : 1);
    out.reiksme = JSON.stringify(Object.assign({}, a, { schema: schema, korteles: sar }));
    return out;
  }
  var JUNGIAMI = { "gprocure.korteles": kortelesJungti };
  function palyginimas(obj, saugykla) {
    var st = saugykla || global.localStorage;
    return Object.keys(obj.items).map(function (raktas) {
      if (PRALEISTI[raktas]) return { raktas: raktas, busena: "praleidziamas", prarandami: [] };
      var dab = null;
      try { dab = st.getItem(raktas); } catch (e) {}
      if (dab === null) return { raktas: raktas, busena: "naujas", prarandami: [] };
      if (dab === obj.items[raktas]) return { raktas: raktas, busena: "tas pats", prarandami: [] };
      var j = JUNGIAMI[raktas] ? JUNGIAMI[raktas](dab, obj.items[raktas]) : null;
      if (j) return { raktas: raktas, busena: "jungiama", prarandami: [], jungimas: j };
      var a = irasuSarasas(dab), b = irasuSarasas(obj.items[raktas]), pr = [];
      if (a && b) {
        var yra = {};
        b.forEach(function (x) { yra[x.id] = 1; });
        pr = a.filter(function (x) { return !yra[x.id]; });
      }
      return { raktas: raktas, busena: "pakeis", prarandami: pr };
    });
  }

  /* Kiek failo raktų saugykloje JAU yra (tiek bus perrašyta). */
  function perrasomi(obj, saugykla) {
    var st = saugykla || global.localStorage;
    var raktai = Object.keys(obj.items), n = 0;
    for (var i = 0; i < raktai.length; i++) {
      try { if (st.getItem(raktai[i]) !== null) n++; } catch (e) {}
    }
    return n;
  }

  /* Įrašo failo reikšmes. Kiti saugyklos raktai nepaliečiami. nepavyko - raktai, kurių įrašyti nepavyko
     (pvz. pilna saugykla): puslapis pasako, KURIE duomenys neatkurti, ne tik kiek. */
  function atkurti(obj, saugykla) {
    var st = saugykla || global.localStorage;
    var raktai = Object.keys(obj.items), ok = 0, nepavyko = [], praleista = [];
    for (var i = 0; i < raktai.length; i++) {
      if (PRALEISTI[raktai[i]]) { praleista.push(raktai[i]); continue; }
      var v = obj.items[raktai[i]];
      if (JUNGIAMI[raktai[i]]) {
        var dab = null;
        try { dab = st.getItem(raktai[i]); } catch (e) {}
        var j = dab !== null && dab !== v ? JUNGIAMI[raktai[i]](dab, v) : null;
        if (j) v = j.reiksme;
      }
      try { st.setItem(raktai[i], v); ok++; }
      catch (e) { nepavyko.push(raktai[i]); }
    }
    return { ok: ok, blogai: nepavyko.length, nepavyko: nepavyko, praleista: praleista };
  }

  function failoVardas(data) {
    // Vietinė data (toISOString - UTC: 00:00-03:00 Lietuvos laiku kopija gaudavo vakarykštę datą)
    var d = data || new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return "g-procure-kopija-" + d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + ".json";
  }

  global.GP_BACKUP = {
    version: "1.0", APP: APP, FORMATO_VERSIJA: VERSION,
    zenklas: zenklas, irasai: irasai, baitai: baitai,
    surinkti: surinkti, patikrinti: patikrinti, perrasomi: perrasomi, palyginimas: palyginimas, irasuSarasas: irasuSarasas, kortelesJungti: kortelesJungti,
    atkurti: atkurti, failoVardas: failoVardas,
    /* Raktų sąrašas (kopija) - slapukų politikos lentelei (slapukai.html, 2026-10-16) */
    ZENKLAI: ZENKLAI.map(function (z) { return [z[0], z[1], { lt: z[2].lt, en: z[2].en }]; })
  };
})(typeof window !== "undefined" ? window : this);
