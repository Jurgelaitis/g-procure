/* ============================================================================
 * G-Procure  shared/eforms-susiejimas.js   (window.GP_EFORMS)
 * ----------------------------------------------------------------------------
 * PIRKIMO KORTELĖS SUSIEJIMAS SU ES PIRKIMŲ DUOMENŲ MODELIU (eForms) - 2026-11-19, krypties 4 etapas
 * (naudotojo „Darome“: pirkimo bylos laukus susieti su ES pirkimų duomenų modeliu).
 *
 * Šaltinis - Leidinių biuro eForms SDK 1.16.0 (2026-11-04, CC BY 4.0): fields/fields.json (laukų id, verslo terminai BT)
 * ir codelists/*.gc (kodų sąrašai). Patikrinta 2026-11-19: kiekvienas čia naudojamas lauko id ir kodas yra SDK 1.16.0
 * failuose (LAUKAI_SDK ir KODU_SARASAI - tų failų ištraukos; testai tikrina, kad susiejimas iš jų neišeina).
 *
 *  - susiek(k) -> [{ bt, eforms, laukas, reiksme, kodas, sarasas?, dalis?, kriterijus?, kalba? }]:
 *      bt - verslo terminas (BT-21), eforms - SDK lauko id (BT-21-Procedure), laukas - kortelės laukas,
 *      reiksme - reikšmė kortelėje (kaip ją įrašė G-Procure), kodas - reikšmė eForms lauke (kodas iš kodų sąrašo
 *      `sarasas` arba eForms formato reikšmė: CPV be kontrolinio skaitmens, data su laiko juosta), dalis - dalies id
 *      (LOT-0001), kriterijus - vertinimo kriterijaus eilės numeris, kalba - teksto kalba (LIT);
 *  - santrauka(k) -> { laukai: [susieti kortelės laukai], irasai } ; NESUSIETI - kortelės laukai, kurie nesusiejami, ir kodėl.
 *
 * Taisyklė - be prielaidų: reikšmė susiejama tik tada, kai jos eForms atitikmuo vienareikšmis. Dalies lygio laukai iš viso
 * pirkimo sprendimų (trukmė, terminas, vertinimo kriterijus, ES lėšos, strateginis pirkimas) - tik kai kortelėje nurodyta,
 * kad pirkimas neskaidomas (tada eForms dalis viena - LOT-0001). Būdai be aiškaus eForms atitikmens (mažos vertės apklausos,
 * DPS, kvalifikacijos sistema, CPO), teisinis pagrindas ne tarptautiniam pirkimui, planuojamos datos - nesusiejami.
 * Nieko nesaugo ir nesiunčia. Naujas kortelės laukas - į susiejimą arba į NESUSIETI (sargas shared/testai.html).
 * ==========================================================================*/
(function (global) {
  "use strict";

  var SDK = {
    versija: "1.16.0", pavadinimas: "eForms SDK 1.16.0", isleista: "2026-11-04", patikrinta: "2026-11-19", licencija: "CC BY 4.0",
    saltinis: "https://github.com/OP-TED/eForms-SDK/tree/1.16.0"
  };

  /* SDK 1.16.0 fields/fields.json ištrauka: lauko id -> pavadinimas (anglų kalba, kaip SDK). */
  var LAUKAI_SDK = {
    "BT-01-notice": "Procedure Legal Basis",
    "BT-21-Procedure": "Title",
    "BT-22-Procedure": "Internal Identifier",
    "BT-23-Procedure": "Main Nature",
    "BT-262-Procedure": "Main Classification Code",
    "BT-263-Procedure": "Additional Classification Code",
    "BT-27-Procedure": "Estimated Value",
    "BT-27-Procedure-Currency": "Estimated Value Currency",
    "BT-105-Procedure": "Procedure Type",
    "BT-500-Organization-Company": "Organisation Name",
    "BT-501-Organization-Company": "Organisation Identifier",
    "BT-137-Lot": "Purpose Lot Identifier",
    "BT-21-Lot": "Title",
    "BT-27-Lot": "Estimated Value",
    "BT-27-Lot-Currency": "Estimated Value Currency",
    "BT-36-Lot": "Duration Period",
    "BT-36-Lot-Unit": "Duration Period Unit",
    "BT-131(d)-Lot": "Deadline Receipt Tenders",
    "BT-131(t)-Lot": "Deadline Receipt Tenders",
    "BT-539-Lot": "Award Criterion Type",
    "BT-734-Lot": "Award Criterion Name",
    "BT-541-Lot-WeightNumber": "Award Criterion Weight Number",
    "BT-06-Lot": "Strategic Procurement",
    "BT-60-Lot": "EU Funds"
  };

  /* SDK 1.16.0 codelists/*.gc ištrauka (visi sąrašo kodai; valiutų - tik EUR). */
  var KODU_SARASAI = {
    "procurement-procedure-type": ["comp-dial", "comp-tend", "exp-int-rail", "innovation", "neg-w-call", "neg-wo-call", "open", "oth-mult", "oth-single", "restricted"],
    "contract-nature": ["services", "supplies", "works"],
    "award-criterion-type": ["cost", "price", "quality"],
    "strategic-procurement": ["env-imp", "inn-pur", "none", "soc-obj"],
    "eu-funded": ["eu-funds", "no-eu-funds"],
    "legal-basis": ["31985R2137", "32001R2157", "32003R1435", "32007R1370", "32009L0081", "32014L0023", "32014L0024", "32014L0025", "32024R2509", "other"],
    "duration-unit": ["DAY", "MONTH", "WEEK", "YEAR"],
    "currency": ["EUR"]
  };

  /* Kortelės reikšmė -> eForms kodas. Būdas - pagal GP_METHODS procedūrą (tik vienareikšmės). */
  var PROCEDUROS = { atviras: "open", ribotas: "restricted", skelb_derybos: "neg-w-call", neskelb_derybos: "neg-wo-call",
    konkur_dialogas: "comp-dial", inovac_partner: "innovation" };
  var OBJEKTAI = { prekes: "supplies", paslaugos: "services", paslaugos_it: "services", darbai: "works" };
  var KRITERIJAI = { kaina: ["price"], sanaudos: ["cost"], kainos_kokybe: ["quality", "price"], sanaudu_kokybe: ["quality", "cost"] };
  var TEISINIS_PAGRINDAS = { PI: "32014L0025", VPI: "32014L0024" };
  var ES_LESOS = { taip: "eu-funds", ne: "no-eu-funds" };

  /* Kas susiejama ir kada (aprašas žmogui ir dokumentacijai; tvarka - kaip kortelėje). */
  var SUSIETI = [
    { laukas: "pavadinimas", bt: ["BT-21"], lt: "pirkimo pavadinimas", en: "procurement title" },
    { laukas: "numeris", bt: ["BT-22"], lt: "pirkimo vykdytojo vidinis numeris", en: "buyer's internal identifier" },
    { laukas: "vykdytojas", bt: ["BT-500", "BT-501"], lt: "pirkimo vykdytojo pavadinimas ir juridinio asmens kodas", en: "buyer name and company code" },
    { laukas: "rezimas", bt: ["BT-01"], lt: "teisinis pagrindas - tik tarptautiniam pirkimui (PĮ - Direktyva 2014/25/ES, VPĮ - Direktyva 2014/24/ES)", en: "legal basis - only for international procurement (PĮ - Directive 2014/25/EU, VPĮ - Directive 2014/24/EU)" },
    { laukas: "objektas", bt: ["BT-23"], lt: "pirkimo objekto rūšis (mišrus - ne)", en: "main nature (not for mixed)" },
    { laukas: "bvpz", bt: ["BT-262", "BT-263"], lt: "pagrindinis ir papildomi BVPŽ kodai", en: "main and additional CPV codes" },
    { laukas: "verte", bt: ["BT-27"], lt: "numatoma vertė be PVM, EUR", en: "estimated value excluding VAT, EUR" },
    { laukas: "budas", bt: ["BT-105"], lt: "procedūros rūšis (atviras, ribotas, skelbiamos ir neskelbiamos derybos, dialogas, partnerystė)", en: "procedure type (open, restricted, negotiated with and without call, dialogue, partnership)" },
    { laukas: "dalys", bt: ["BT-137", "BT-21", "BT-27"], lt: "pirkimo objekto dalys: identifikatorius, pavadinimas, vertė", en: "lots: identifier, title, value" },
    { laukas: "trukmeMen", bt: ["BT-36"], lt: "sutarties trukmė mėnesiais (neskaidomam pirkimui)", en: "contract duration in months (procurement not divided into lots)" },
    { laukas: "pasiulymuTerminas", bt: ["BT-131"], lt: "pasiūlymų pateikimo terminas su Lietuvos laiko juosta (atviram konkursui, neskaidomam pirkimui; kitais būdais kortelės terminas gali būti paraiškų)", en: "tender deadline with the Lithuanian time zone (open procedure not divided into lots; for other procedures the card deadline may be for requests to participate)" },
    { laukas: "kriterijus", bt: ["BT-539"], lt: "vertinimo kriterijų rūšys (neskaidomam pirkimui)", en: "award criterion types (procurement not divided into lots)" },
    { laukas: "vertinimas", bt: ["BT-734", "BT-541"], lt: "vertinimo kriterijų pavadinimai ir lyginamieji svoriai (neskaidomam pirkimui)", en: "award criterion names and weights (procurement not divided into lots)" },
    { laukas: "zaliasis", bt: ["BT-06"], lt: "žaliasis pirkimas - strateginis pirkimas „Poveikio aplinkai mažinimas“ (neskaidomam pirkimui)", en: "green procurement - strategic procurement “Reduction of environmental impacts” (procurement not divided into lots)" },
    { laukas: "esLesos", bt: ["BT-60"], lt: "finansavimas ES lėšomis (neskaidomam pirkimui)", en: "EU funds (procurement not divided into lots)" }
  ];

  /* Kortelės laukai, kurie nesusiejami, ir kodėl (LT / EN). Kiekvienas kortelės laukas yra SUSIETI arba čia (sargas). */
  var NESUSIETI = {
    id: { lt: "G-Procure kortelės identifikatorius šioje naršyklėje", en: "G-Procure card identifier in this browser" },
    sukurta: { lt: "kortelės įrašo data", en: "date of the card record" },
    atnaujinta: { lt: "kortelės įrašo data", en: "date of the card record" },
    cvpisNr: { lt: "CVP IS pirkimo numeris - nacionalinės sistemos numeris; eForms procedūros ir pranešimo identifikatorius suteikia skelbimą siunčianti sistema", en: "CVP IS number - a national system number; eForms procedure and notice identifiers are assigned by the sending system" },
    pradzia: { lt: "vidaus planavimo data - eForms atitikmens nėra", en: "internal planning date - no eForms equivalent" },
    paskelbimas: { lt: "kortelėje - planuojama ar faktinė data, nuo kurios skaičiuojami terminai; eForms siuntimo ir pageidaujamos paskelbimo datos (BT-05, BT-738) - kitos sąvokos", en: "in the card - the planned or actual date from which time limits run; eForms dispatch and preferred publication dates (BT-05, BT-738) are different concepts" },
    sutartiesData: { lt: "planuojama data; eForms sutarties sudarymo data (BT-145) - tik sutarties skyrimo skelbime", en: "planned date; the eForms contract conclusion date (BT-145) is only in the award notice" },
    grafikas: { lt: "pirkimo grafiko eForms nėra", en: "eForms has no procurement schedule" },
    iniciatorius: { lt: "asmens duomenys - į ES duomenų modelio dalį sąmoningai neperkeliami", en: "personal data - deliberately not mapped" },
    organizatorius: { lt: "asmens duomenys - į ES duomenų modelio dalį sąmoningai neperkeliami", en: "personal data - deliberately not mapped" },
    organizatoriausKontaktai: { lt: "asmens duomenys - į ES duomenų modelio dalį sąmoningai neperkeliami", en: "personal data - deliberately not mapped" },
    nacsaugumas: { lt: "eForms leidimo dirbti su įslaptinta informacija laukas (BT-578) - kita sąvoka", en: "the eForms security clearance field (BT-578) is a different concept" },
    kvalifikacija: { lt: "eForms atrankos kriterijai aprašomi kiekvienas atskirai; kortelėje - tik kas tikrinama", en: "eForms describes each selection criterion separately; the card only says what is checked" },
    cpo: { lt: "CPO LT katalogas - nacionalinė priemonė, eForms atitikmens nėra", en: "the CPO LT catalogue is a national tool - no eForms equivalent" },
    veiksmai: { lt: "G-Procure įrankių rekomenduoti veiksmai", en: "actions recommended by G-Procure tools" },
    busena: { lt: "pirkimo būsena eForms nurodoma skelbimo rūšimi, ne lauku", en: "eForms shows the procurement status by the notice type, not by a field" },
    archyvuota: { lt: "G-Procure kortelės būsena", en: "G-Procure card status" },
    kilmesReikalavimas: { lt: "eForms SDK 1.16.0 neturi termino reikalavimui nurodyti kilmės šalį; kilmės šalies laukas (BT-191) - tik pasiūlymui sutarties skyrimo skelbime", en: "eForms SDK 1.16.0 has no term for requiring the country of origin; the country of origin field (BT-191) is only for a tender in the award notice" },
    pedsakoReikalavimas: { lt: "eForms SDK 1.16.0 neturi termino anglies pėdsako deklaracijos reikalavimui", en: "eForms SDK 1.16.0 has no term for requiring a carbon footprint declaration" },
    pasoReikalavimas: { lt: "eForms SDK 1.16.0 neturi termino skaitmeninio gaminio paso reikalavimui", en: "eForms SDK 1.16.0 has no term for requiring a digital product passport" },
    nziaTaikymas: { lt: "eForms SDK 1.16.0 neturi atskiro termino Reglamento (ES) 2024/1735 pirkimų reikalavimams", en: "eForms SDK 1.16.0 has no separate term for the procurement requirements of Regulation (EU) 2024/1735" }
  };

  function tekstas(v) { return v == null ? "" : String(v).trim(); }
  function idx(i) { return "LOT-" + ("000" + (i + 1)).slice(-4); }

  /* Lietuvos laiko juostos poslinkis vietinei datai ir laikui (ES vasaros laikas: paskutinio kovo sekmadienio 03:00 -
     paskutinio spalio sekmadienio 04:00 vietos laiku - +03:00, kitu metu +02:00). Dviprasmiška valanda spalio pabaigoje - vasaros. */
  function paskutinisSekmadienis(metai, men) {   // men 1-12 -> diena
    var d = new Date(Date.UTC(metai, men, 0));
    return d.getUTCDate() - d.getUTCDay();
  }
  function vilniausPoslinkis(data, laikas) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data), t = /^(\d{2}):(\d{2})/.exec(laikas || "00:00");
    if (!m || !t) return "";
    var y = +m[1], mo = +m[2], d = +m[3], min = (+t[1]) * 60 + (+t[2]);
    var kovas = paskutinisSekmadienis(y, 3), spalis = paskutinisSekmadienis(y, 10);
    var po = mo > 3 || (mo === 3 && (d > kovas || (d === kovas && min >= 180)));
    var iki = mo < 10 || (mo === 10 && (d < spalis || (d === spalis && min < 240)));
    return po && iki ? "+03:00" : "+02:00";
  }
  /* BVPŽ kodai iš kortelės teksto: 8 skaitmenys (kontrolinis skaitmuo - nebūtinas); be pasikartojimų. */
  function bvpzKodai(v) {
    var out = [], re = /(^|[^\d])(\d{8})(-\d)?(?!\d)/g, m;
    while ((m = re.exec(tekstas(v)))) { var x = { kodas: m[2], tekstas: m[2] + (m[3] || "") }; if (!out.some(function (y) { return y.kodas === x.kodas; })) out.push(x); }
    return out;
  }

  function susiek(k) {
    var K = global.GP_KORTELE;
    if (!k || typeof k !== "object") return [];
    var n = K ? K.normalizuok(k) : k, out = [];
    function prid(bt, eforms, laukas, reiksme, kodas, papild) {
      var e = { bt: bt, eforms: eforms, laukas: laukas, reiksme: reiksme === undefined ? null : reiksme, kodas: kodas };
      if (papild) Object.keys(papild).forEach(function (x) { if (papild[x] !== undefined && papild[x] !== null) e[x] = papild[x]; });
      out.push(e);
    }
    // ---- procedūros lygis
    if (tekstas(n.pavadinimas)) prid("BT-21", "BT-21-Procedure", "pavadinimas", n.pavadinimas, tekstas(n.pavadinimas), { kalba: "LIT" });
    if (tekstas(n.numeris)) prid("BT-22", "BT-22-Procedure", "numeris", n.numeris, tekstas(n.numeris));
    var org = global.GP_ORG && n.vykdytojas ? (global.GP_ORG.ORGANIZACIJOS || []).filter(function (o) { return o.id === n.vykdytojas; })[0] : null;
    if (org) {
      prid("BT-500", "BT-500-Organization-Company", "vykdytojas", n.vykdytojas, org.pavadinimas, { kalba: "LIT" });
      if (org.jarKodas) prid("BT-501", "BT-501-Organization-Company", "vykdytojas", n.vykdytojas, org.jarKodas);
    }
    var bud = global.GP_METHODS && n.budas ? global.GP_METHODS.byId(n.budas) : null;
    if (bud && bud.rezimas === "tarptautinis" && TEISINIS_PAGRINDAS[n.rezimas])
      prid("BT-01", "BT-01-notice", "rezimas", n.rezimas, TEISINIS_PAGRINDAS[n.rezimas], { sarasas: "legal-basis" });
    if (OBJEKTAI[n.objektas]) prid("BT-23", "BT-23-Procedure", "objektas", n.objektas, OBJEKTAI[n.objektas], { sarasas: "contract-nature" });
    bvpzKodai(n.bvpz).forEach(function (c, i) {
      prid(i ? "BT-263" : "BT-262", i ? "BT-263-Procedure" : "BT-262-Procedure", "bvpz", c.tekstas, c.kodas, { sarasas: "cpv" });
    });
    if (n.verte > 0) {
      prid("BT-27", "BT-27-Procedure", "verte", n.verte, n.verte);
      prid("BT-27", "BT-27-Procedure-Currency", "verte", n.verte, "EUR", { sarasas: "currency" });
    }
    if (bud && PROCEDUROS[bud.procedura]) prid("BT-105", "BT-105-Procedure", "budas", n.budas, PROCEDUROS[bud.procedura], { sarasas: "procurement-procedure-type" });
    // ---- dalys
    if (Array.isArray(n.dalys) && n.dalys.length) {
      n.dalys.forEach(function (d, i) {
        var lot = idx(i);
        prid("BT-137", "BT-137-Lot", "dalys", i + 1, lot, { dalis: lot });
        if (tekstas(d.pavadinimas)) prid("BT-21", "BT-21-Lot", "dalys", d.pavadinimas, tekstas(d.pavadinimas), { dalis: lot, kalba: "LIT" });
        if (d.verte > 0) {
          prid("BT-27", "BT-27-Lot", "dalys", d.verte, d.verte, { dalis: lot });
          prid("BT-27", "BT-27-Lot-Currency", "dalys", d.verte, "EUR", { dalis: lot, sarasas: "currency" });
        }
      });
    }
    // ---- vienos dalies (neskaidomo) pirkimo dalies lygio laukai
    if (Array.isArray(n.dalys) && !n.dalys.length) {
      var L1 = "LOT-0001";
      prid("BT-137", "BT-137-Lot", "dalys", null, L1, { dalis: L1 });
      if (n.trukmeMen > 0) {
        prid("BT-36", "BT-36-Lot", "trukmeMen", n.trukmeMen, n.trukmeMen, { dalis: L1 });
        prid("BT-36", "BT-36-Lot-Unit", "trukmeMen", n.trukmeMen, "MONTH", { dalis: L1, sarasas: "duration-unit" });
      }
      // kortelės terminas - „pasiūlymų ar paraiškų“: pasiūlymų terminas (BT-131) vienareikšmis tik atviram konkursui (paraiškų etapo nėra)
      var tm = bud && bud.procedura === "atviras" ? /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(tekstas(n.pasiulymuTerminas)) : null;
      if (tm) {
        var ps = vilniausPoslinkis(tm[1], tm[2]);
        prid("BT-131", "BT-131(d)-Lot", "pasiulymuTerminas", n.pasiulymuTerminas, tm[1] + ps, { dalis: L1 });
        prid("BT-131", "BT-131(t)-Lot", "pasiulymuTerminas", n.pasiulymuTerminas, tm[2] + ":00" + ps, { dalis: L1 });
      }
      (KRITERIJAI[n.kriterijus] || []).forEach(function (c) {
        prid("BT-539", "BT-539-Lot", "kriterijus", n.kriterijus, c, { dalis: L1, sarasas: "award-criterion-type" });
      });
      var v = n.vertinimas;
      if (v && Array.isArray(v.kriterijai) && !(Array.isArray(v.dalys) && v.dalys.length)) {
        v.kriterijai.forEach(function (c, i) {
          if (tekstas(c.pavadinimas)) prid("BT-734", "BT-734-Lot", "vertinimas", c.pavadinimas, tekstas(c.pavadinimas), { dalis: L1, kriterijus: i + 1, kalba: "LIT" });
          if (c.svoris !== null && c.svoris !== undefined && isFinite(c.svoris)) prid("BT-541", "BT-541-Lot-WeightNumber", "vertinimas", c.svoris, Number(c.svoris), { dalis: L1, kriterijus: i + 1 });
        });
      }
      if (n.zaliasis === "taip") prid("BT-06", "BT-06-Lot", "zaliasis", "taip", "env-imp", { dalis: L1, sarasas: "strategic-procurement" });
      if (ES_LESOS[n.esLesos]) prid("BT-60", "BT-60-Lot", "esLesos", n.esLesos, ES_LESOS[n.esLesos], { dalis: L1, sarasas: "eu-funded" });
    }
    return out;
  }

  /* Susieti kortelės laukai (tvarka - kaip kortelėje) ir įrašai. */
  function santrauka(k) {
    var ir = susiek(k), laukai = [];
    SUSIETI.forEach(function (s) { if (ir.some(function (e) { return e.laukas === s.laukas; })) laukai.push(s.laukas); });
    return { laukai: laukai, irasai: ir };
  }

  /* Bylos dalis (shared/pirkimo-byla.js): { sdk, saltinis, laukai }. */
  function bylai(k) { return { sdk: SDK.versija, saltinis: SDK.saltinis, laukai: susiek(k) }; }

  global.GP_EFORMS = {
    version: "1.0",
    SDK: SDK, LAUKAI_SDK: LAUKAI_SDK, KODU_SARASAI: KODU_SARASAI, SUSIETI: SUSIETI, NESUSIETI: NESUSIETI,
    PROCEDUROS: PROCEDUROS, OBJEKTAI: OBJEKTAI, KRITERIJAI: KRITERIJAI, TEISINIS_PAGRINDAS: TEISINIS_PAGRINDAS, ES_LESOS: ES_LESOS,
    susiek: susiek, santrauka: santrauka, bylai: bylai, vilniausPoslinkis: vilniausPoslinkis, bvpzKodai: bvpzKodai
  };
})(typeof window !== "undefined" ? window : this);
