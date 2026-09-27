/* ============================================================================
 * G-Procure  shared/taisykles.js
 * ----------------------------------------------------------------------------
 * Taisyklių variklis su paaiškinimais (window.GP_TAISYKLES, tobulinimo planas A3,
 * 2026-09-26). Viena vieta taisyklėms, kurios buvo išbarstytos po modulius
 * (PP-salygos ir PP-plan patys lygino vertę su ribomis, PP-plan - ir dalių išimtį):
 *   - pirkimo rūšis pagal vertę (tarptautinis / supaprastintas / mažos vertės),
 *   - ar pasirinktas būdas tinka tai vertei,
 *   - trumpiausi paraiškų ir pasiūlymų terminai pagal būdą (skaičiuojama ir darbo
 *     dienomis per shared/workdays.js),
 *   - kokių dokumentų reikės pagal būdą (LITGRID šablonų rinkiniai, kaip PP-salygos).
 * Kiekviena išvada turi teisės nuorodą iš shared/teises-nuorodos.js (GP_TEISE) - ten
 * kiekviena nuoroda perskaityta e-tar. Ribos - shared/thresholds.js, būdai -
 * shared/procurement-methods.js. PĮ ir VPĮ niekada nemaišomi: be kortelės režimo
 * teisės išvadų nėra (sakoma, ko trūksta).
 *
 * Variklis nieko nesaugo ir nesiunčia: gauna kortelę (shared/pirkimo-kortele.js
 * schema) ir grąžina radinius. Naudoja kortelių puslapis (tikrinimas pildant) ir
 * skelbimo parengties patikra (A4); PP-salygos ir PP-plan vertės patikrą ima iš čia.
 *
 *   GP_TAISYKLES.tikrink(k, "lt") -> { radiniai: [{ id, lygis, laukai, tekstas, pastaba, teise }],
 *                                      patikros: [{ id, busena, truksta }] }
 *     lygis: "kliutis" (taisyti prieš skelbiant), "tikrinti" (priklauso nuo aplinkybių),
 *            "info", "gerai". busena: "gerai" | "radinys" | "truksta" | "netaikoma".
 *   GP_TAISYKLES.kategorija(k), ribos(rezimas, objektas), terminas(k), budoVerte(k, kalba),
 *   dokumentai(budas, kalba), dalys(rezimas, kalba) - dalys naudoja moduliai tiesiogiai.
 *
 * Testai: shared/testai.html (grupė „Taisyklių variklis“).
 * ==========================================================================*/
;(function (global) {
  "use strict";

  /* Objekto rūšis ribai: prekės ir paslaugos turi bendrą ribą, darbai - savo. Mišriam pirkimui ribą lemia
     pagrindinis objektas - variklis jo nespėja. */
  var RUSIS = { prekes: "pp", paslaugos: "pp", paslaugos_it: "pp", darbai: "darbai" };

  /* Trumpiausi paraiškų ar pasiūlymų terminai dienomis nuo skelbimo (perskaityta e-tar 2026-09-26; kiekviena
     eilutė - su GP_TEISE raktais, kuriuose tie skaičiai parašyti). T - tarptautinis, S - supaprastintas pirkimas.
     bazinis - įprastas trumpiausias; el - atviro konkurso, kai skelbime nurodytos elektroninės priemonės;
     maziausias - kiek galima sutrumpinti tik ypatingomis sąlygomis (jų nėra - null). Mažos vertės pirkimų
     terminų įstatymai nenustato - jų variklis netikrina. */
  var TERMINAI = {
    atviras: {
      PI:  { bazinis: { T: 35, S: 12 }, el: { T: 30, S: 9 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_ak",
             el_raktas: "terminas_ak_el", trump: ["terminas_ak_orientacinis", "terminas_ak_skuba"], pirmas: "pasiulymai", salygos: "orientacinis" },
      VPI: { bazinis: { T: 35, S: 12 }, el: { T: 30, S: 9 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_ak",
             el_raktas: "terminas_ak_el", trump: ["terminas_ak_orientacinis", "terminas_ak_skuba"], pirmas: "pasiulymai", salygos: "isankstinis" } },
    ribotas: {
      PI:  { bazinis: { T: 30, S: 10 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_rk", trump: ["terminas_rk_trumpinimas"], pirmas: "paraiskos", salygos: "pagristi" },
      VPI: { bazinis: { T: 30, S: 10 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_rk", trump: ["terminas_rk_trumpinimas"], pirmas: "paraiskos", salygos: "skuba" } },
    skelb_derybos: {
      PI:  { bazinis: { T: 30, S: 10 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_sd", trump: ["terminas_sd_trumpinimas"], pirmas: "paraiskos", salygos: "pagristi",
             beParaisku: "sd_be_paraisku", pirminiai: "terminas_sd_pirminiai" },
      VPI: { bazinis: { T: 30, S: 10 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_sd", trump: ["terminas_sd_trumpinimas"], pirmas: "paraiskos", salygos: "skuba" } },
    konkur_dialogas: {
      PI:  { bazinis: { T: 30, S: 10 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_kd", trump: ["terminas_kd_trumpinimas"], pirmas: "paraiskos", salygos: "pagristi" },
      VPI: { bazinis: { T: 30, S: 10 }, maziausias: null, raktas: "terminas_kd", trump: [], pirmas: "paraiskos" } },
    inovac_partner: {
      PI:  { bazinis: { T: 30, S: 10 }, maziausias: { T: 15, S: 7 }, raktas: "terminas_ip", trump: ["terminas_ip_trumpinimas"], pirmas: "paraiskos", salygos: "pagristi" },
      VPI: { bazinis: { T: 30, S: 10 }, maziausias: null, raktas: "terminas_ip", trump: [], pirmas: "paraiskos" } }
  };

  /* Dokumentai pagal būdą - LITGRID šablonų rinkiniai (tie patys, kuriuos generuoja PP-salygos: TSD su paraiškos
     forma, SSD - be paraiškų, AK, ND, MVP, DPS). `teise` - tik ten, kur dokumento turinį nustato įstatymas. */
  var DOK = {
    skelbimas: { lt: "Skelbimas apie pirkimą", en: "Contract notice" },
    bps: { lt: "Bendrosios pirkimo sąlygos (BPS)", en: "General procurement conditions (BPS)" },
    sps: { lt: "Specialiosios pirkimo sąlygos (SPS)", en: "Special procurement conditions (SPS)" },
    paraiska: { lt: "Paraiškos forma", en: "Application form" },
    pasiulymas: { lt: "Pasiūlymo forma", en: "Tender form" },
    ebvpd: { lt: "EBVPD forma", en: "ESPD form", teise: "ebvpd_dokumentuose" },
    ts: { lt: "Techninė specifikacija", en: "Technical specification", teise: "ts_dokumentuose" },
    sutartis: { lt: "Sutarties projektas ar sąlygos", en: "Draft contract or its terms", teise: "sutartis_dokumentuose" },
    dps_salygos: { lt: "DPS sąlygos", en: "DPS conditions" }
  };
  // Skelbimas pridedamas tik skelbiamiems būdams (GP_METHODS `skelbiama`).
  var RINKINIAI = {
    TSD: ["bps", "sps", "paraiska", "pasiulymas", "ebvpd", "ts", "sutartis"],
    SSD: ["bps", "sps", "pasiulymas", "ebvpd", "ts", "sutartis"],
    AK: ["bps", "sps", "pasiulymas", "ebvpd", "ts", "sutartis"],
    ND: ["bps", "sps", "ts", "sutartis"],
    MVP: ["bps", "sps", "pasiulymas", "ts", "sutartis"],
    DPSK: ["dps_salygos", "paraiska", "ebvpd"],
    DPSP: ["dps_salygos", "pasiulymas", "ts", "sutartis"]
  };

  var TXT = {
    lt: {
      lygis: { kliutis: "Kliūtis", tikrinti: "Patikrinkite", info: "Informacija", gerai: "Atitinka" },
      obj: { pp: "prekių ir paslaugų", darbai: "darbų" },
      kat: { tarptautinis: "tarptautinis pirkimas", supaprastintas: "supaprastintas pirkimas", mazos_vertes: "mažos vertės pirkimas" },
      katTarpt: "Pagal numatomą vertę {v} EUR be PVM tai tarptautinis pirkimas: {obj} riba - {r} EUR.",
      katSupr: "Pagal numatomą vertę {v} EUR be PVM tai supaprastintas pirkimas: mažiau už tarptautinio pirkimo ribą {r} EUR ir ne mažiau už mažos vertės ribą {m} EUR.",
      katMv: "Pagal numatomą vertę {v} EUR be PVM tai mažos vertės pirkimas (supaprastinto pirkimo rūšis): mažiau už {m} EUR.",
      katCva: "Tarptautinio pirkimo riba prekėms ir paslaugoms priklauso nuo to, ar {org} įrašyta į centrinės valdžios institucijų sąrašą: tada riba {c} EUR ir šis pirkimas tarptautinis, kitu atveju - {r} EUR ir pirkimas supaprastintas.",
      katSpec: "Jei perkamos socialinės ar kitos specialiosios paslaugos (įstatymo priedas), tarptautinio pirkimo riba - {s} EUR.",
      organizacija: "organizacija",
      budasMv: "Pasirinktas mažos vertės pirkimo būdas, bet numatoma vertė {v} EUR ne mažesnė už mažos vertės ribą {m} EUR. Rinkitės supaprastinto ar tarptautinio pirkimo būdą.",
      budasMvIsimtis: "Išimtis - atskiros dalys, kurių bendra vertė mažesnė už {m} EUR.",
      budasSupr: "Pasirinktas supaprastinto pirkimo būdas, bet numatoma vertė {v} EUR siekia tarptautinio pirkimo ribą {r} EUR. Rinkitės tarptautinio pirkimo būdą.",
      budasSuprIsimtis: "Išimtis - dalys, kurių kiekviena mažesnė už {d} EUR, jei tokių dalių bendra vertė ne didesnė kaip {p} % visų dalių vertės.",
      budasTarpt: "Pasirinktas tarptautinio pirkimo būdas, o numatoma vertė {v} EUR mažesnė už tarptautinio pirkimo ribą {r} EUR. Jei tai didesnio pirkimo dalis, nuostatos taikomos pagal visų dalių vertę - patikrinkite, ar vertė apskaičiuota teisingai.",
      budasGerai: "Būdas tinka vertei: {kat}.",
      termPries: "Terminas ({t}) ne vėlesnis už paskelbimo datą ({p}) - patikrinkite datas.",
      termDienos: "Nuo paskelbimo ({p}) iki termino ({t}) - {d} d. ({dd} darbo d.).",
      termGerai: "Trumpiausias {ko} terminas - {min} d.",
      termEl: "Trumpiausias {ko} terminas - {min} d., o {el} d. galima, jei skelbime nurodyta, kad pasiūlymai teikiami elektroninėmis priemonėmis (CVP IS).",
      termTrump: "Tai trumpiau už įprastą trumpiausią {ko} terminą - {min} d. Sutrumpinti iki {maz} d. galima tik {kada}.",
      kada: { orientacinis: "paskelbus reguliarų orientacinį skelbimą arba skubos atveju (pagreitinta procedūra, priežastys nurodomos skelbime)",
              isankstinis: "paskelbus išankstinį informacinį skelbimą arba skubos atveju (pagreitinta procedūra, priežastys nurodomos skelbime)",
              pagristi: "perkančiojo subjekto vertinimu pagrįstais atvejais", skuba: "skubos atveju (pagreitinta procedūra, priežastys nurodomos skelbime)" },
      termPer: "Tai trumpiau už trumpiausią leidžiamą {ko} terminą - {min} d.",
      termBeParaisku: "Jei paraiškos neteikiamos ir iškart kviečiama teikti pirminius pasiūlymus, patikrinkite ir pirminių pasiūlymų terminą.",
      termPakankamas: "Terminas turi būti ir pakankamas pasiūlymams parengti.",
      ko: { pasiulymai: "pasiūlymų", paraiskos: "paraiškų" },
      termDiena: "Terminas baigiasi {d} - ne darbo dieną.",
      diena: ["sekmadienį", "pirmadienį", "antradienį", "trečiadienį", "ketvirtadienį", "penktadienį", "šeštadienį"],
      svente: "švenčių dieną",
      ilgalaike: "Sutartis ilgalaikė ({m} mėn. - ilgiau kaip 12): finansinio pajėgumo reikalavimus skaičiuokite pagal didžiausią metinę vertę.",
      knaPriv: "Numatoma vertė siekia {r} EUR - pagal EPSO-G kaštų ir naudos analizės ribą (dar tikslinama, ne įstatymo) analizė privaloma.",
      knaRek: "Numatoma vertė siekia {r} EUR - pagal EPSO-G kaštų ir naudos analizės ribą (dar tikslinama, ne įstatymo) analizė rekomenduojama.",
      dokumentai: "Šiam būdui rengiami dokumentai: {s}.",
      patikra: { kategorija: "Pirkimo rūšis pagal vertę", budas_verte: "Būdas ir vertė", terminas: "Paraiškų ar pasiūlymų terminas",
                 dokumentai: "Dokumentai pagal būdą" }
    },
    en: {
      lygis: { kliutis: "Blocking issue", tikrinti: "Check", info: "Information", gerai: "OK" },
      obj: { pp: "supplies and services", darbai: "works" },
      kat: { tarptautinis: "international procurement", supaprastintas: "simplified procurement", mazos_vertes: "low-value procurement" },
      katTarpt: "Based on the estimated value of EUR {v} excl. VAT this is an international procurement: the threshold for {obj} is EUR {r}.",
      katSupr: "Based on the estimated value of EUR {v} excl. VAT this is a simplified procurement: below the international threshold of EUR {r} and not below the low-value threshold of EUR {m}.",
      katMv: "Based on the estimated value of EUR {v} excl. VAT this is a low-value procurement (a type of simplified procurement): below EUR {m}.",
      katCva: "The international threshold for supplies and services depends on whether {org} is on the list of central government authorities: then it is EUR {c} and this procurement is international, otherwise EUR {r} and it is simplified.",
      katSpec: "If social or other specific services (annex to the law) are purchased, the international threshold is EUR {s}.",
      organizacija: "the organisation",
      budasMv: "A low-value procedure is selected, but the estimated value of EUR {v} is not below the low-value threshold of EUR {m}. Choose a simplified or international procedure.",
      budasMvIsimtis: "Exception - individual lots with a combined value below EUR {m}.",
      budasSupr: "A simplified procedure is selected, but the estimated value of EUR {v} reaches the international threshold of EUR {r}. Choose an international procedure.",
      budasSuprIsimtis: "Exception - lots each below EUR {d}, if their combined value is at most {p} % of the value of all lots.",
      budasTarpt: "An international procedure is selected while the estimated value of EUR {v} is below the international threshold of EUR {r}. If this is a lot of a larger procurement, the rules follow the value of all lots - check that the value is calculated correctly.",
      budasGerai: "The procedure fits the value: {kat}.",
      termPries: "The deadline ({t}) is not later than the publication date ({p}) - check the dates.",
      termDienos: "From publication ({p}) to the deadline ({t}) - {d} days ({dd} working days).",
      termGerai: "The minimum period for {ko} is {min} days.",
      termEl: "The minimum period for {ko} is {min} days; {el} days are allowed if the notice states that tenders are submitted electronically (CVP IS).",
      termTrump: "This is shorter than the usual minimum period for {ko} of {min} days. It can be shortened to {maz} days only {kada}.",
      kada: { orientacinis: "after a periodic indicative notice or in urgency (accelerated procedure, reasons stated in the notice)",
              isankstinis: "after a prior information notice or in urgency (accelerated procedure, reasons stated in the notice)",
              pagristi: "in cases justified by the contracting entity", skuba: "in urgency (accelerated procedure, reasons stated in the notice)" },
      termPer: "This is shorter than the minimum period allowed for {ko} of {min} days.",
      termBeParaisku: "If no applications are requested and initial tenders are invited directly, also check the period for initial tenders.",
      termPakankamas: "The period must also be sufficient to prepare tenders.",
      ko: { pasiulymai: "tenders", paraiskos: "requests to participate" },
      termDiena: "The deadline falls on {d} - not a working day.",
      diena: ["a Sunday", "a Monday", "a Tuesday", "a Wednesday", "a Thursday", "a Friday", "a Saturday"],
      svente: "a public holiday",
      ilgalaike: "The contract is long-term ({m} months - more than 12): calculate financial capacity requirements on the highest annual value.",
      knaPriv: "The estimated value reaches EUR {r} - under the EPSO-G cost-benefit analysis threshold (still being refined, not the law) the analysis is required.",
      knaRek: "The estimated value reaches EUR {r} - under the EPSO-G cost-benefit analysis threshold (still being refined, not the law) the analysis is recommended.",
      dokumentai: "Documents prepared for this procedure: {s}.",
      patikra: { kategorija: "Type of procurement by value", budas_verte: "Procedure and value", terminas: "Deadline for requests or tenders",
                 dokumentai: "Documents by procedure" }
    }
  };
  function tx(l) { return TXT[l === "en" ? "en" : "lt"]; }
  function sub(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }
  function eur(n) {
    var s = Math.round(n).toString(), out = "";
    while (s.length > 3) { out = " " + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  }

  function metodas(id) { return id && global.GP_METHODS ? global.GP_METHODS.byId(id) : null; }
  function rezimasOk(r) { return r === "PI" || r === "VPI"; }

  /* Teisės nuoroda radiniui: { raktas, cit, url, apie } pagal kortelės režimą (PĮ ir VPĮ nesimaišo). */
  function nuoroda(raktas, rezimas, l) {
    var T = global.GP_TEISE;
    if (!T) return { raktas: raktas, cit: "", url: "", apie: "" };
    return { raktas: raktas, cit: T.cit(raktas, rezimas, l === "en" ? "en" : "lt"), url: T.url(raktas, rezimas), apie: T.apie(raktas, rezimas) };
  }
  function nuorodos(raktai, rezimas, l) {
    var out = [];
    raktai.forEach(function (r) {
      try { out.push(nuoroda(r, rezimas, l)); } catch (e) { /* raktas be šio režimo - nerodomas, bet nemaišomas su kitu */ }
    });
    return out;
  }

  /* ---------------------------------------------------------------- vertė */
  function ribos(rezimas, objektas) {
    var T = global.GP_THRESHOLDS, rusis = RUSIS[objektas];
    if (!T || !rezimasOk(rezimas) || !T[rezimas] || !rusis) return null;
    var R = T[rezimas];
    var out = { rezimas: rezimas, rusis: rusis, tarptautine: rusis === "darbai" ? R.intl_works : R.intl_goods,
                maza: rusis === "darbai" ? R.mv_works : R.mv_goods, specialiosios: rusis === "pp" ? R.intl_special : null };
    // VPĮ centrinės valdžios institucijoms prekių ir paslaugų riba mažesnė; ar organizacija sąraše - sistema nežino
    out.centrinesValdzios = rezimas === "VPI" && rusis === "pp" && R.intl_goods_cva ? R.intl_goods_cva : null;
    return out;
  }
  function truksta(k) {
    var t = [];
    if (!(k.verte > 0)) t.push("verte");
    if (!rezimasOk(k.rezimas)) t.push("rezimas");
    if (!RUSIS[k.objektas]) t.push("objektas");
    return t;
  }
  /* Pirkimo rūšis pagal vertę: { kodas, ribos, cva } arba { kodas: null, truksta: [laukai] }.
     cva: true - VPĮ prekių ar paslaugų vertė tarp centrinės valdžios ir kitų organizacijų ribų. */
  function kategorija(k) {
    k = k || {};
    var t = truksta(k);
    if (t.length) return { kodas: null, truksta: t };
    var rb = ribos(k.rezimas, k.objektas);
    if (!rb) return { kodas: null, truksta: ["verte"] };
    if (k.verte >= rb.tarptautine) return { kodas: "tarptautinis", ribos: rb };
    if (k.verte < rb.maza) return { kodas: "mazos_vertes", ribos: rb };
    return { kodas: "supaprastintas", ribos: rb, cva: !!(rb.centrinesValdzios && k.verte >= rb.centrinesValdzios) };
  }
  function orgPav(k, l) {
    var o = global.GP_ORG && k.vykdytojas ? global.GP_ORG.pagalId(k.vykdytojas) : null;
    return o ? o.pavadinimas : tx(l).organizacija;
  }

  function kategorijosRadiniai(k, l) {
    var X = tx(l), kat = kategorija(k), out = [];
    if (!kat.kodas) return out;
    var rb = kat.ribos, v = { v: eur(k.verte), r: eur(rb.tarptautine), m: eur(rb.maza), obj: X.obj[rb.rusis] };
    if (kat.cva) {
      out.push({ id: "kategorija", lygis: "tikrinti", laukai: ["verte", "vykdytojas"],
        tekstas: sub(X.katCva, { org: orgPav(k, l), c: eur(rb.centrinesValdzios), r: v.r }),
        teise: nuorodos(["centrines_valdzios", "tarptautinis_pirkimas"], k.rezimas, l) });
    } else {
      var kodas = kat.kodas;
      out.push({ id: "kategorija", lygis: "info", laukai: ["verte", "objektas"],
        tekstas: sub(kodas === "tarptautinis" ? X.katTarpt : kodas === "mazos_vertes" ? X.katMv : X.katSupr, v),
        teise: nuorodos([kodas === "tarptautinis" ? "tarptautinis_pirkimas" : kodas === "mazos_vertes" ? "mazos_vertes_pirkimas" : "supaprastintas_pirkimas"], k.rezimas, l) });
    }
    if (rb.specialiosios && k.verte >= rb.tarptautine && k.verte < rb.specialiosios && (k.objektas === "paslaugos" || k.objektas === "paslaugos_it"))
      out.push({ id: "kategorija_specialiosios", lygis: "info", laukai: ["objektas"], tekstas: sub(X.katSpec, { s: eur(rb.specialiosios) }),
        teise: nuorodos(["tarptautinis_pirkimas"], k.rezimas, l) });
    return out;
  }

  /* Ar būdas tinka vertei. null - nėra ką tikrinti (nėra būdo arba būdas be vertės režimo). */
  function budoVerte(k, l) {
    k = k || {};
    var X = tx(l), m = metodas(k.budas);
    if (!m || !m.rezimas) return null;
    var kat = kategorija(k);
    if (!kat.kodas) return { id: "budas_verte", truksta: kat.truksta };
    var rb = kat.ribos, D = (global.GP_THRESHOLDS || {}).DALYS || {};
    var v = { v: eur(k.verte), r: eur(rb.tarptautine), m: eur(rb.maza) };
    if (m.rezimas === "mazos_vertes" && kat.kodas !== "mazos_vertes")
      return { id: "budas_verte", lygis: "kliutis", laukai: ["budas", "verte"], tekstas: sub(X.budasMv, v),
               pastaba: sub(X.budasMvIsimtis, v), teise: nuorodos(["mazos_vertes_pirkimas", "dalys_mazos_vertes"], k.rezimas, l) };
    if (m.rezimas === "supaprastintas" && kat.kodas === "tarptautinis")
      return { id: "budas_verte", lygis: "kliutis", laukai: ["budas", "verte"], tekstas: sub(X.budasSupr, v),
               pastaba: D.dalisProc ? sub(X.budasSuprIsimtis, { d: eur(rb.rusis === "darbai" ? D.darbai : D.prekes_paslaugos), p: D.dalisProc }) : "",
               teise: nuorodos(["tarptautinis_pirkimas", "dalys_supaprastintai"], k.rezimas, l) };
    // VPĮ prekių ir paslaugų vertė tarp dviejų ribų: supaprastintas ar tarptautinis būdas teisingas priklauso nuo sąrašo
    if (kat.cva && (m.rezimas === "supaprastintas" || m.rezimas === "tarptautinis"))
      return { id: "budas_verte", lygis: "tikrinti", laukai: ["budas", "verte", "vykdytojas"],
               tekstas: sub(X.katCva, { org: orgPav(k, l), c: eur(rb.centrinesValdzios), r: v.r }),
               teise: nuorodos(["centrines_valdzios", "tarptautinis_pirkimas"], k.rezimas, l) };
    if (m.rezimas === "tarptautinis" && kat.kodas !== "tarptautinis")
      return { id: "budas_verte", lygis: "tikrinti", laukai: ["budas", "verte"], tekstas: sub(X.budasTarpt, v),
               teise: nuorodos(["tarptautinis_pirkimas", "verte_dalims"], k.rezimas, l) };
    return { id: "budas_verte", lygis: "gerai", laukai: ["budas", "verte"], tekstas: sub(X.budasGerai, { kat: X.kat[kat.kodas] }),
             teise: nuorodos([kat.kodas === "tarptautinis" ? "tarptautinis_pirkimas" : kat.kodas === "mazos_vertes" ? "mazos_vertes_pirkimas" : "supaprastintas_pirkimas"], k.rezimas, l) };
  }

  /* ---------------------------------------------------------------- terminai */
  function data(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }
  function darbo(d) { return global.GP_WORKDAYS ? global.GP_WORKDAYS.isWorkday(d) : (d.getDay() !== 0 && d.getDay() !== 6); }
  /* Kalendorinės dienos: terminas skaičiuojamas nuo kitos dienos po paskelbimo, tad 17 -> 02 (kitą mėnesį) = 15 d.
     Darbo dienos - tame pačiame intervale (paskelbimo diena neįskaičiuojama, termino diena - įskaičiuojama). */
  function intervalas(nuo, iki) {
    var a = new Date(nuo.getFullYear(), nuo.getMonth(), nuo.getDate()), b = new Date(iki.getFullYear(), iki.getMonth(), iki.getDate());
    var dienos = Math.round((b - a) / 864e5), dd = 0;
    for (var x = new Date(a); x < b; ) { x.setDate(x.getDate() + 1); if (darbo(x)) dd++; }
    return { dienos: dienos, darbo: dd };
  }
  /* Kuris pirkimas terminams: tarptautinis ar supaprastintas (pagal būdą, o būdams be režimo - pagal vertę). */
  function terminoRusis(k, m) {
    if (m.rezimas === "tarptautinis") return "T";
    if (m.rezimas === "supaprastintas") return "S";
    if (m.rezimas) return null;                                   // mažos vertės
    var kat = kategorija(k);
    return kat.kodas === "tarptautinis" ? "T" : kat.kodas ? "S" : null;
  }
  /* Trumpiausio termino taisyklė kortelei: { busena, lentele, rusis, dienos, darbo, ... }.
     busena: "netaikoma" (būdas be skelbimo, mažos vertės ar be lentelės), "truksta" (+ truksta), "yra". */
  function terminas(k) {
    k = k || {};
    var m = metodas(k.budas);
    if (!m) return { busena: "truksta", truksta: ["budas"] };
    if (!m.skelbiama || m.rezimas === "mazos_vertes" || !TERMINAI[m.procedura]) return { busena: "netaikoma", metodas: m };
    var t = [];
    if (!rezimasOk(k.rezimas)) t.push("rezimas");
    var rusis = terminoRusis(k, m);
    if (!rusis) t.push("verte");
    var nuo = data(k.paskelbimas), iki = data(k.pasiulymuTerminas);
    if (!nuo) t.push("paskelbimas");
    if (!iki) t.push("pasiulymuTerminas");
    if (t.length) return { busena: "truksta", truksta: t, metodas: m };
    var L = TERMINAI[m.procedura][k.rezimas], iv = intervalas(nuo, iki);
    return { busena: "yra", metodas: m, lentele: L, rusis: rusis, nuo: nuo, iki: iki, dienos: iv.dienos, darbo: iv.darbo,
             bazinis: L.bazinis[rusis], el: L.el ? L.el[rusis] : null, maziausias: L.maziausias ? L.maziausias[rusis] : null };
  }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function terminoRadiniai(k, l) {
    var X = tx(l), tr = terminas(k), out = [];
    if (tr.busena !== "yra") return { tr: tr, radiniai: out };
    var L = tr.lentele, ko = X.ko[L.pirmas], p = ymd(tr.nuo), t = ymd(tr.iki) + (/T\d{2}:\d{2}/.test(k.pasiulymuTerminas) ? " " + k.pasiulymuTerminas.slice(11, 16) : "");
    var dienos = sub(X.termDienos, { p: p, t: t, d: tr.dienos, dd: tr.darbo });
    var pagr = [L.raktas, "terminas_nuo"];
    if (tr.dienos <= 0) {
      out.push({ id: "terminas", lygis: "kliutis", laukai: ["paskelbimas", "pasiulymuTerminas"], tekstas: sub(X.termPries, { p: p, t: t }), teise: [] });
    } else if (tr.dienos >= tr.bazinis) {
      out.push({ id: "terminas", lygis: "gerai", laukai: ["paskelbimas", "pasiulymuTerminas"], tekstas: dienos + " " + sub(X.termGerai, { ko: ko, min: tr.bazinis }),
                 pastaba: X.termPakankamas, teise: nuorodos(pagr.concat(["terminas_pakankamas"]), k.rezimas, l) });
    } else if (tr.el && tr.dienos >= tr.el) {
      out.push({ id: "terminas", lygis: "info", laukai: ["paskelbimas", "pasiulymuTerminas"], tekstas: dienos + " " + sub(X.termEl, { ko: ko, min: tr.bazinis, el: tr.el }),
                 teise: nuorodos(pagr.concat([L.el_raktas]), k.rezimas, l) });
    } else if (tr.maziausias && tr.dienos >= tr.maziausias) {
      out.push({ id: "terminas", lygis: "tikrinti", laukai: ["paskelbimas", "pasiulymuTerminas"], tekstas: dienos + " " + sub(X.termTrump, { ko: ko, min: tr.bazinis, maz: tr.maziausias, kada: X.kada[L.salygos] || "" }),
                 pastaba: L.beParaisku && tr.rusis === "S" ? X.termBeParaisku : "",
                 teise: nuorodos(pagr.concat(L.trump, L.beParaisku && tr.rusis === "S" ? [L.beParaisku, L.pirminiai] : []), k.rezimas, l) });
    } else {
      out.push({ id: "terminas", lygis: "kliutis", laukai: ["paskelbimas", "pasiulymuTerminas"],
                 tekstas: dienos + " " + sub(X.termPer, { ko: ko, min: tr.maziausias || tr.bazinis }),
                 pastaba: L.beParaisku && tr.rusis === "S" ? X.termBeParaisku : "",
                 teise: nuorodos(pagr.concat(L.trump, L.beParaisku && tr.rusis === "S" ? [L.beParaisku, L.pirminiai] : []), k.rezimas, l) });
    }
    if (tr.dienos > 0 && !darbo(tr.iki)) {
      var sv = global.GP_WORKDAYS && global.GP_WORKDAYS.isHoliday(tr.iki);
      out.push({ id: "terminas_diena", lygis: "info", laukai: ["pasiulymuTerminas"], tekstas: sub(X.termDiena, { d: sv ? X.svente : X.diena[tr.iki.getDay()] }), teise: [] });
    }
    return { tr: tr, radiniai: out };
  }

  /* ---------------------------------------------------------------- dokumentai ir kita */
  function dokumentai(budas, l) {
    var s = budas && global.GP_METHODS ? global.GP_METHODS.toSalygos(budas) : null;
    var r = s && RINKINIAI[s.seima];
    if (!r) return null;
    if (s.skelbiama === true) r = ["skelbimas"].concat(r);
    return r.map(function (id) { return { id: id, pav: DOK[id][l === "en" ? "en" : "lt"], teise: DOK[id].teise || null }; });
  }
  /* Dalių išimtis (tarptautinės vertės pirkimo dalims - supaprastinta tvarka): skaičiai iš thresholds.js. */
  function dalys(rezimas, l) {
    var D = (global.GP_THRESHOLDS || {}).DALYS;
    if (!D || !rezimasOk(rezimas)) return null;
    return { prekes_paslaugos: D.prekes_paslaugos, darbai: D.darbai, dalisProc: D.dalisProc, teise: nuorodos(["dalys_supaprastintai"], rezimas, l) };
  }

  function tikrink(k, l) {
    k = k || {};
    l = l === "en" ? "en" : "lt";
    var X = tx(l), radiniai = [], patikros = [];
    var kat = kategorija(k);
    patikros.push(kat.kodas ? { id: "kategorija", busena: kat.cva ? "radinys" : "gerai" } : { id: "kategorija", busena: "truksta", truksta: kat.truksta });
    radiniai = radiniai.concat(kategorijosRadiniai(k, l));

    var bv = budoVerte(k, l);
    if (!k.budas) patikros.push({ id: "budas_verte", busena: "truksta", truksta: ["budas"] });
    else if (!bv) patikros.push({ id: "budas_verte", busena: "netaikoma" });
    else if (bv.truksta) patikros.push({ id: "budas_verte", busena: "truksta", truksta: bv.truksta });
    else {
      patikros.push({ id: "budas_verte", busena: bv.lygis === "gerai" ? "gerai" : "radinys" });
      if (!(kat.cva && bv.lygis === "tikrinti")) radiniai.push(bv);        // VPĮ ribos klausimas jau pasakytas vieną kartą
    }

    var tt = terminoRadiniai(k, l);
    if (tt.tr.busena === "yra") patikros.push({ id: "terminas", busena: tt.radiniai.some(function (r) { return r.id === "terminas" && r.lygis !== "gerai"; }) ? "radinys" : "gerai" });
    else patikros.push({ id: "terminas", busena: tt.tr.busena, truksta: tt.tr.truksta });
    radiniai = radiniai.concat(tt.radiniai);

    var dk = dokumentai(k.budas, l);
    if (dk) {
      patikros.push({ id: "dokumentai", busena: "gerai" });
      var teise = [];
      dk.forEach(function (d) { if (d.teise) teise.push(d.teise); });
      radiniai.push({ id: "dokumentai", lygis: "info", laukai: ["budas"], dokumentai: dk,
        tekstas: sub(X.dokumentai, { s: dk.map(function (d) { return d.pav; }).join(", ") }),
        teise: rezimasOk(k.rezimas) ? nuorodos(teise, k.rezimas, l) : [] });
    } else patikros.push({ id: "dokumentai", busena: k.budas ? "netaikoma" : "truksta", truksta: k.budas ? undefined : ["budas"] });

    if (k.trukmeMen > 12)
      radiniai.push({ id: "ilgalaike", lygis: "info", laukai: ["trukmeMen"], tekstas: sub(X.ilgalaike, { m: k.trukmeMen }),
        teise: nuorodos(["met_ilgalaike", "met_apyvarta_bendros"], "PI", l) });
    var C = (global.GP_THRESHOLDS || {}).CBA;
    if (C && k.verte > 0) {
      if (C.privaloma && k.verte >= C.privaloma) radiniai.push({ id: "kna", lygis: "info", laukai: ["verte"], tekstas: sub(X.knaPriv, { r: eur(C.privaloma) }), teise: [] });
      else if (C.rekomenduojama && k.verte >= C.rekomenduojama) radiniai.push({ id: "kna", lygis: "info", laukai: ["verte"], tekstas: sub(X.knaRek, { r: eur(C.rekomenduojama) }), teise: [] });
    }
    return { radiniai: radiniai, patikros: patikros };
  }

  /* Visi registro raktai, kuriuos variklis gali cituoti (testams: kiekvienas turi būti registre). */
  function raktai() {
    var R = {};
    ["tarptautinis_pirkimas", "supaprastintas_pirkimas", "mazos_vertes_pirkimas", "centrines_valdzios", "verte_dalims",
     "dalys_supaprastintai", "dalys_mazos_vertes", "terminas_nuo", "terminas_pakankamas", "met_ilgalaike", "met_apyvarta_bendros"]
      .forEach(function (k) { R[k] = 1; });
    Object.keys(TERMINAI).forEach(function (p) {
      ["PI", "VPI"].forEach(function (r) {
        var L = TERMINAI[p][r];
        [L.raktas, L.el_raktas, L.beParaisku, L.pirminiai].concat(L.trump).forEach(function (k) { if (k) R[k] = 1; });
      });
    });
    Object.keys(DOK).forEach(function (d) { if (DOK[d].teise) R[DOK[d].teise] = 1; });
    return Object.keys(R);
  }

  global.GP_TAISYKLES = {
    version: "1.0",
    tikrink: tikrink,
    kategorija: kategorija,
    ribos: ribos,
    budoVerte: budoVerte,
    terminas: terminas,
    dokumentai: dokumentai,
    dalys: dalys,
    raktai: raktai,
    lygioPav: function (lygis, l) { return tx(l).lygis[lygis] || lygis; },
    patikrosPav: function (id, l) { return tx(l).patikra[id] || id; },
    TERMINAI: TERMINAI,
    RINKINIAI: RINKINIAI,
    _intervalas: intervalas
  };
})(typeof window !== "undefined" ? window : this);
