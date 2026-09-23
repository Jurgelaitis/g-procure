/* ============================================================================
 * G-Procure  shared/teises-nuorodos.js
 * ----------------------------------------------------------------------------
 * Teisės aktų nuorodos VISIEMS moduliams (window.GP_TEISE) - vienas tiesos šaltinis.
 *
 * KODĖL REGISTRAS ATSIRADO (2026-09-23). Išorinis PP-QUAL auditas parodė, kad
 * dauguma PĮ nuorodų moduliuose buvo klaidingos: „PĮ 47 str.“ kvalifikacijai (PĮ 47
 * str. - pirkimo skelbimo rengimas), „PĮ 30 str.“ principams (tai „Tiekėjai“),
 * „PĮ 33 str.“ techninei specifikacijai (tai interesų konfliktas), „PĮ 81 str.“ CPO
 * (tai inovacijų partnerystė). Numeriai kilo iš CLAUDE.md ir keliavo į modulius, iš
 * jų - į AI užklausas ir Word dokumentus. Metodikos „21.1.4 p. koeficientų 0,3 / 0,5
 * / 0,7“ nėra (16 p.: patirtis paprastai iki 0,7 vertės), o jos 8.6 p. modulis laikė
 * panaikintu, nors 2026-06-11 pakeitimas jį išdėstė iš naujo: kiekvienas ūkio
 * subjektas (išskyrus kvazisubtiekėjus) pildo ATSKIRĄ EBVPD.
 *
 * TAISYKLĖS
 *   - Kiekviena nuoroda čia perskaityta e-tar AKTUALIOJE redakcijoje (data - TIKRINTA).
 *     Naują nuorodą dėk tik perskaitęs tą straipsnio dalį e-tar, ne iš atminties.
 *   - Moduliai straipsnių numerių patys NErašo: GP_TEISE.cit(raktas, rezimas).
 *     Pasikeitus įstatymui taisoma TIK čia.
 *   - Režimas kaip shared/thresholds.js: "PI" - perkantysis subjektas (PĮ; LITGRID,
 *     Amber Grid, Energy cells), "VPI" - perkančioji organizacija (VPĮ; EPSO-G).
 *     Jei sąvokai prašomo režimo nėra, cit() meta klaidą: geriau neveikiantis
 *     mygtukas, nei LITGRID dokumente atsiradęs VPĮ straipsnis (ar atvirkščiai).
 *   - PĮ 59 str. 1 d. pašalinimo pagrindams ir kvalifikacijai mutatis mutandis taiko
 *     VPĮ 46, 47, 50, 51 str. Todėl PĮ režime tokia nuoroda yra dviguba:
 *     „PĮ 59 str. 1 d. (taikant VPĮ 47 str. 1 d.)“ - pagrindas PĮ, turinys VPĮ.
 *     Laukas `per` - tas PĮ straipsnis, per kurį VPĮ norma taikoma.
 *
 * NAUDOJIMAS
 *   <script src="../shared/teises-nuorodos.js"></script>
 *   GP_TEISE.cit("kvalifikacija", "PI")        -> "PĮ 59 str. 1 d. (taikant VPĮ 47 str. 1 d.)"
 *   GP_TEISE.cit("kvalifikacija", "PI", "en")  -> "PĮ Art. 59(1) (applying VPĮ Art. 47(1))"
 *   GP_TEISE.cit("kvalifikacija", "PI", "lt", { trumpai: true }) -> "PĮ 59 str. 1 d."
 *   GP_TEISE.cit("met_ebvpd")                  -> "Metodikos 8.6 p." (režimas nereikalingas)
 *   GP_TEISE.uzpildyk(document, "PI")          -> užpildo <span data-teise="raktas"></span>
 *
 * Testai: shared/testai.html - registro formatas ir SARGAS: prijungtų modulių
 * failuose neturi likti straipsnių numerių, kurių šiame registre nėra.
 * ==========================================================================*/

;(function (global) {
  "use strict";

  var TIKRINTA = "2026-09-23";

  var AKTAI = {
    PI: {
      trumpai: "PĮ",
      pavadinimas: "Lietuvos Respublikos pirkimų, atliekamų vandentvarkos, energetikos, transporto ar pašto paslaugų srities perkančiųjų subjektų, įstatymas",
      direktyva: "2014/25/ES",
      url: "https://www.e-tar.lt/portal/lt/legalAct/9116a35030a011e78397ae072f58c508/asr"
    },
    VPI: {
      trumpai: "VPĮ",
      pavadinimas: "Lietuvos Respublikos viešųjų pirkimų įstatymas",
      direktyva: "2014/24/ES",
      url: "https://www.e-tar.lt/portal/lt/legalAct/TAR.C54AFFAA7622/asr"
    },
    MET: {
      trumpai: "Metodika",
      pavadinimas: "Tiekėjo kvalifikacijos reikalavimų nustatymo metodika",
      patvirtinta: "VPT direktoriaus 2017-06-29 įsakymas Nr. 1S-105",
      patvirtintaEn: "PPO Director's Order No 1S-105 of 29 June 2017",
      // 1S-82 pakeitė 8.6, 8.8, 16.1, 16.2 ir 16.3 p.; iki 2026-07-01 pradėtos
      // procedūros tęsiamos pagal ankstesnę redakciją (įsakymo 2.2 p.).
      redakcija: "2026-06-11 įsakymo Nr. 1S-82 redakcija, galioja nuo 2026-07-01",
      redakcijaEn: "as amended by Order No 1S-82 of 11 June 2026, in force from 1 July 2026",
      url: "https://www.e-tar.lt/portal/lt/legalAct/674ebaf05d7111e79198ffdb108a3753/asr"
    },
    ZALIEJI: {
      trumpai: "Žaliųjų pirkimų tvarkos aprašas",
      pavadinimas: "Aplinkos apsaugos kriterijų taikymo, vykdant žaliuosius pirkimus, tvarkos aprašas",
      patvirtinta: "aplinkos ministro 2011-06-28 įsakymas Nr. D1-508 (2022-12-13 įsakymo Nr. D1-401 redakcija)",
      // Aprašo 1 p.: taiko ir VPĮ perkančiosios organizacijos, ir PĮ perkantieji subjektai.
      url: "https://www.e-tar.lt/portal/lt/legalAct/TAR.4B60A8C9678B/asr"
    }
  };

  /* Nuoroda: { a: aktas, s: straipsnis, d: dalis, p: punktas, per: PĮ nuoroda }.
     Metodikai p - punktas ("8.6"). `bendra` - ta pati abiem režimams.
     `apie` - ką ta vieta iš tikrųjų sako (patikrinta tekste, ne pavadinime).  */
  var PI59 = { a: "PI", s: 59, d: 1 };
  var N = {
    // ---- Principai ir tikslai (PĮ 29 str. / VPĮ 17 str.)
    principai: { apie: "lygiateisiškumo, nediskriminavimo, abipusio pripažinimo, proporcingumo ir skaidrumo principai",
      PI: { a: "PI", s: 29, d: 1 }, VPI: { a: "VPI", s: 17, d: 1 } },
    konkurencija: { apie: "planuojant ir rengiantis pirkimui negalima siekti išvengti įstatymo tvarkos ar dirbtinai sumažinti konkurencijos",
      PI: { a: "PI", s: 29, d: 3 }, VPI: { a: "VPI", s: 17, d: 3 } },
    isipareigojimai: { apie: "vykdant sutartis laikomasi aplinkos apsaugos, socialinės ir darbo teisės įpareigojimų",
      PI: { a: "PI", s: 29, d: 2, p: 2 }, VPI: { a: "VPI", s: 17, d: 2, p: 2 } },
    aplinka: { apie: "siekti kuo mažesnės neigiamos įtakos klimato kaitai ir aplinkai",
      PI: { a: "PI", s: 29, d: 2, p: 4 }, VPI: { a: "VPI", s: 17, d: 2, p: 4 } },

    // ---- Kvalifikacija (VPĮ 47 str.; PĮ subjektams - per PĮ 59 str. 1 d.)
    pasalinimas_ir_kvalifikacija: { apie: "pašalinimo pagrindai ir kvalifikacijos reikalavimai nustatomi mutatis mutandis taikant VPĮ 46, 47, 50 ir 51 straipsnius; perkančiųjų subjektų, kurie nėra perkančiosios organizacijos, pirkimuose VPĮ 46 str. 1, 3 ir 4 dalių sąlygos neprivalomos",
      PI: PI59 },
    kvalifikacija: { apie: "būtini kvalifikacijos reikalavimai: negali dirbtinai riboti konkurencijos, turi būti proporcingi, susiję su pirkimo objektu, tikslūs ir aiškūs",
      PI: { a: "VPI", s: 47, d: 1, per: PI59 }, VPI: { a: "VPI", s: 47, d: 1 } },
    metodika: { apie: "kvalifikacijos reikalavimai nustatomi pagal VPT patvirtintą Metodiką",
      PI: { a: "VPI", s: 47, d: 7, per: PI59 }, VPI: { a: "VPI", s: 47, d: 7 } },
    apyvarta: { apie: "reikalaujamos metinės veiklos pajamos ne daugiau kaip 2 kartus didesnės už numatomą pirkimo vertę, išskyrus pagrįstus atvejus",
      PI: { a: "VPI", s: 47, d: 3, p: 1, per: PI59 }, VPI: { a: "VPI", s: 47, d: 3, p: 1 } },
    kvalifikacija_dalims: { apie: "skaidant pirkimą į dalis, reikalavimai nustatomi kiekvienai daliai atskirai",
      PI: { a: "VPI", s: 47, d: 4, per: PI59 }, VPI: { a: "VPI", s: 47, d: 4 } },
    nacsaugumas: { apie: "kai objektas patenka į VPĮ 92 str. 13 d. BVPŽ sąrašą, tiekėjai, jų subtiekėjai ir subjektai, kurių pajėgumais remiamasi (ar juos kontroliuojantys asmenys), negali būti registruoti 92 str. 14 d. sąrašo valstybėse; taikoma gynybos ir strategiškai svarbių sektorių subjektams, Saugiojo tinklo naudotojams ir esminiams subjektams",
      PI: { a: "VPI", s: 47, d: 9, per: PI59 }, VPI: { a: "VPI", s: 47, d: 9 } },
    nacsaugumo_sarasas: { apie: "BVPŽ kodų sąrašas, kuriam taikomi nacionalinio saugumo reikalavimai (į jį nurodo ir PĮ 50 str. 9 d.)",
      bendra: { a: "VPI", s: 92, d: 13 } },

    // ---- Pirkimo dokumentai ir techninė specifikacija (PĮ)
    dokumentu_aiskumas: { apie: "pirkimo dokumentai turi būti tikslūs, aiškūs, be dviprasmybių",
      PI: { a: "PI", s: 48, d: 4 } },
    kiekis: { apie: "pirkimo dokumentuose nurodomas objekto pavadinimas, kiekis (apimtis) ir terminai",
      PI: { a: "PI", s: 48, d: 2, p: 8 } },
    cpo_argumentai: { apie: "pirkimo dokumentuose nurodomi sprendimo nepirkti per CPO argumentai",
      PI: { a: "PI", s: 48, d: 2, p: 34 } },
    ts: { apie: "techninė specifikacija",
      PI: { a: "PI", s: 50 } },
    ts_proporcingumas: { apie: "ypatybės turi būti susijusios su pirkimo objektu ir proporcingos jo vertei ir tikslams",
      PI: { a: "PI", s: 50, d: 1 } },
    ts_konkurencija: { apie: "techninė specifikacija turi užtikrinti konkurenciją ir nediskriminuoti tiekėjų",
      PI: { a: "PI", s: 50, d: 3 } },
    ts_funkciniai: { apie: "funkciniai reikalavimai turi būti tikslūs, kad tiekėjai galėtų parengti pasiūlymus",
      PI: { a: "PI", s: 50, d: 4, p: 1 } },
    ts_standartai: { apie: "kiekviena nuoroda į standartą pateikiama su žodžiais „arba lygiavertis“",
      PI: { a: "PI", s: 50, d: 4, p: 2 } },
    ts_zenklas: { apie: "negalima nurodyti modelio, šaltinio, prekės ženklo, patento, kilmės; išimtis - kai kitaip tiksliai apibūdinti neįmanoma, tada su žodžiais „arba lygiavertis“",
      PI: { a: "PI", s: 50, d: 5 } },
    ts_nacsaugumas: { apie: "techninėje specifikacijoje reikalaujama, kad prekės, paslaugos ar darbai nekeltų grėsmės nacionaliniam saugumui",
      PI: { a: "PI", s: 50, d: 8 } },

    // ---- Planavimas, vertė, dalys (PĮ)
    rinkos_konsultacijos: { apie: "rengiantis pirkimui galima konsultuotis su rinkos dalyviais",
      PI: { a: "PI", s: 39, d: 1, p: 1 } },
    dalys: { apie: "pirkimo objekto skaidymas į dalis",
      PI: { a: "PI", s: 40 } },
    verte: { apie: "numatomos pirkimo vertės skaičiavimas",
      PI: { a: "PI", s: 13 } },

    // ---- Vertinimas
    vertinimas: { apie: "pasiūlymų vertinimas ir palyginimas",
      PI: { a: "PI", s: 64 }, VPI: { a: "VPI", s: 55 } },
    nmk: { apie: "neįprastai maža pasiūlyta kaina",
      PI: { a: "PI", s: 66 }, VPI: { a: "VPI", s: 57 } },

    // ---- Sutartis (PĮ)
    sutarties_keitimas: { apie: "pirkimo sutarties keitimas jos galiojimo laikotarpiu",
      PI: { a: "PI", s: 97 } },
    perziuros_salygos: { apie: "keisti be naujos procedūros galima, kai pakeitimas iš anksto aiškiai, tiksliai ir nedviprasmiškai numatytas peržiūros sąlygose",
      PI: { a: "PI", s: 97, d: 1, p: 1 } },
    atidejimo_terminas: { apie: "sutartis sudaroma ne anksčiau nei po atidėjimo termino: ne trumpesnio kaip 10 dienų (supaprastintuose - 5 darbo dienų; ne elektroninėmis priemonėmis - 15 dienų)",
      PI: { a: "PI", s: 94, d: 8 } },
    pretenzijos_terminai: { apie: "pretenzijos, prašymo ir ieškinio pateikimo terminai",
      PI: { a: "PI", s: 108 } },
    cpo: { apie: "jei CPO kataloge siūlomas objektas atitinka poreikius, sprendimą pirkti ne per katalogą privaloma motyvuoti ir argumentus nurodyti pirkimo dokumentuose",
      PI: { a: "PI", s: 90, d: 2, p: 1 } },

    // ---- Organizavimas ir kontrolė (PĮ)
    komisija: { apie: "Komisija sudaroma iš ne mažiau kaip 3 fizinių asmenų (pirmininkas ir bent 2 nariai)",
      PI: { a: "PI", s: 31, d: 2 } },
    nesaliskumas: { apie: "perkančioji organizacija reikalauja konfidencialumo pasižadėjimo, privačių interesų deklaracijos arba nešališkumo deklaracijos",
      PI: { a: "PI", s: 33, d: 2, p: 1 } },
    neskelbiamos_derybos: { apie: "neskelbiamų derybų sąlygos",
      PI: { a: "PI", s: 79 } },
    vidaus_kontrole: { apie: "pirkimų vidaus kontrolė",
      PI: { a: "PI", s: 103, d: 3 } },
    saugojimas: { apie: "pirkimo dokumentų saugojimas (ne trumpiau kaip 4 metai)",
      PI: { a: "PI", s: 103, d: 6 } },

    // ---- VPT Metodika (abiem režimams: jos pagrindas VPĮ 47 str. 7 d. ir PĮ 59 str. 1 d.)
    met_kvazisubtiekejai: { apie: "tretieji asmenys, kurie sutarties patys nevykdo, o tik suteikia priemones (pvz., išnuomoja patalpas ar įrangą), EBVPD neteikia; tiekėjas įrodo, kad priemonėmis galės naudotis",
      bendra: { a: "MET", p: "8.3" } },
    met_ebvpd: { apie: "EBVPD - pirminis įrodymas su paraiška ar pasiūlymu; kiekvienas ūkio subjektas (išskyrus kvazisubtiekėjus) užpildo atskirą EBVPD; galima reikalauti ir iš žinomų subtiekėjų",
      bendra: { a: "MET", p: "8.6" } },
    met_dokumentai: { apie: "kvalifikaciją patvirtinančius dokumentus teikia ekonomiškai naudingiausią pasiūlymą pateikęs tiekėjas",
      bendra: { a: "MET", p: "8.7" } },
    met_nacsaugumas: { apie: "tikrinant atitiktį VPĮ 47 str. 9 d. - VPT formos atitikties deklaracija, laimėtojas teikia steigimo dokumentus, JAR išrašą ir kt. (ne senesnius kaip 3 mėn.)",
      bendra: { a: "MET", p: "8.8" } },
    met_apyvarta: { apie: "finansinis pajėgumas: metinės pajamos",
      bendra: { a: "MET", p: "12" } },
    met_patirtis: { apie: "patirties reikšmė (vertė, kiekis, apimtis) paprastai ne daugiau kaip 0,7 numatomos vertės, kiekio ar apimties; vertė eurais be PVM",
      bendra: { a: "MET", p: "16" } },
    met_patirtis_darbai: { apie: "darbai: per paskutinius 5 metus, savo jėgomis, svarbiausių darbų atlikimas ir rezultatai tinkami; laikotarpį galima ilginti dėl konkurencijos",
      bendra: { a: "MET", p: "16.1" } },
    met_patirtis_prekes_paslaugos: { apie: "prekės ir paslaugos: per paskutinius 3 metus, savo jėgomis; „tinkamai“ reikalauti galima, bet neprivaloma",
      bendra: { a: "MET", p: "16.2" } },
    met_patirtis_misrus: { apie: "perkant skirtingų rūšių objektus - atskiri patirties reikalavimai kiekvienam",
      bendra: { a: "MET", p: "16.3" } },
    met_personalas: { apie: "personalo (specialistų) kvalifikacija",
      bendra: { a: "MET", p: "21" } },

    // ---- Žalieji pirkimai
    zalieji: { apie: "aplinkos apsaugos kriterijų taikymas žaliuosiuose pirkimuose",
      bendra: { a: "ZALIEJI" } }
  };

  function klaida(tekstas) { throw new Error("GP_TEISE: " + tekstas); }

  // Viena nuoroda -> tekstas. LT: „PĮ 50 str. 4 d. 2 p.“, EN: „PĮ Art. 50(4)(2)“.
  function formatas(n, kalba) {
    var en = kalba === "en";
    if (n.a === "MET") return en ? "Methodology, point " + n.p : "Metodikos " + n.p + " p.";
    if (n.a === "ZALIEJI") return en ? "Green Procurement Rules (Order No D1-508)" : "Žaliųjų pirkimų tvarkos aprašas (įsakymas Nr. D1-508)";
    var akt = AKTAI[n.a];
    if (!akt || !n.s) klaida("netinkama nuoroda " + JSON.stringify(n));
    if (en) return akt.trumpai + " Art. " + n.s + (n.d ? "(" + n.d + ")" : "") + (n.p ? "(" + n.p + ")" : "");
    return akt.trumpai + " " + n.s + " str." + (n.d ? " " + n.d + " d." : "") + (n.p ? " " + n.p + " p." : "");
  }

  function irasas(raktas, rezimas) {
    var e = N[raktas];
    if (!e) klaida("nežinoma nuoroda „" + raktas + "“");
    var n = e.bendra || e[rezimas];
    if (!n) klaida("nuorodai „" + raktas + "“ nėra režimo „" + rezimas + "“ (yra: "
      + ["PI", "VPI"].filter(function (r) { return e[r]; }).join(", ") + ")");
    return n;
  }

  /* cit(raktas, rezimas, kalba, { trumpai }) - tekstas moduliui.
     trumpai: tik pagrindas be „(taikant ...)“ - antraštėms ir ženkleliams.  */
  function cit(raktas, rezimas, kalba, parinktys) {
    var n = irasas(raktas, rezimas);
    if (!n.per) return formatas(n, kalba);
    if (parinktys && parinktys.trumpai) return formatas(n.per, kalba);
    return formatas(n.per, kalba) + (kalba === "en" ? " (applying " : " (taikant ") + formatas(n, kalba) + ")";
  }

  // Kelios nuorodos vienoje eilutėje: „PĮ 29 str. 1 d.; PĮ 50 str. 5 d.“
  function sarasas(raktai, rezimas, kalba) {
    return raktai.map(function (r) { return cit(r, rezimas, kalba); }).join("; ");
  }

  function apie(raktas, rezimas) {
    irasas(raktas, rezimas);
    return N[raktas].apie;
  }

  // e-tar adresas: to akto, kuris nuorodos turinį iš tikrųjų sako.
  function url(raktas, rezimas) { return AKTAI[irasas(raktas, rezimas).a].url; }

  function aktas(kodas) {
    var a = AKTAI[kodas];
    if (!a) klaida("nežinomas aktas „" + kodas + "“");
    var kopija = {};
    for (var k in a) kopija[k] = a[k];
    return kopija;
  }

  /* <span data-teise="raktas"></span> -> nuorodos tekstas. Neprivalomi atributai:
     data-rezimas="PI|VPI" (kitaip - argumentas), data-trumpai (be „taikant“).  */
  function uzpildyk(saknis, rezimas, kalba) {
    var els = (saknis || global.document).querySelectorAll("[data-teise]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.textContent = cit(el.getAttribute("data-teise"), el.getAttribute("data-rezimas") || rezimas, kalba,
        { trumpai: el.hasAttribute("data-trumpai") });
    }
    return els.length;
  }

  // Visos registre esančios nuorodos (su `per` - atskirai) - sargo testui.
  function visos() {
    var out = [];
    Object.keys(N).forEach(function (k) {
      ["bendra", "PI", "VPI"].forEach(function (r) {
        var n = N[k][r];
        if (!n) return;
        out.push({ raktas: k, rezimas: r, a: n.a, s: n.s, d: n.d, p: n.p });
        if (n.per) out.push({ raktas: k, rezimas: r, a: n.per.a, s: n.per.s, d: n.per.d, p: n.per.p });
      });
    });
    return out;
  }

  global.GP_TEISE = {
    TIKRINTA: TIKRINTA,
    cit: cit,
    sarasas: sarasas,
    apie: apie,
    url: url,
    aktas: aktas,
    uzpildyk: uzpildyk,
    raktai: function () { return Object.keys(N); },
    visos: visos
  };
})(typeof window !== "undefined" ? window : this);
