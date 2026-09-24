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
 *   GP_TEISE.normos.patirtiesRiba.reiksme      -> 0.7 (Metodikos skaičiai - tik iš čia)
 *   GP_TEISE.vertesKategorija(v, {maza, tarptautine}) -> {kodas:"vidutine", raktas:"met_vidutine_verte"}
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
      patvirtinta: "aplinkos ministro 2011-06-28 įsakymas Nr. D1-508 (2022-12-13 įsakymo Nr. D1-401 redakcija, su 2024-01-16 Nr. D1-17 ir 2026-02-12 Nr. D1-20 pakeitimais)",
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
    finansinis_santykis: { apie: "galima atsižvelgti į finansinį santykį (turto ir įsipareigojimų), jei nurodyti skaidrūs, objektyvūs ir nediskriminaciniai vertinimo kriterijai",
      PI: { a: "VPI", s: 47, d: 3, p: 2, per: PI59 }, VPI: { a: "VPI", s: 47, d: 3, p: 2 } },
    draudimas: { apie: "galima reikalauti atitinkamo lygio profesinės civilinės atsakomybės draudimo",
      PI: { a: "VPI", s: 47, d: 3, p: 3, per: PI59 }, VPI: { a: "VPI", s: 47, d: 3, p: 3 } },
    pasalinimas_nemokumas: { apie: "nemokumas, restruktūrizavimo ar bankroto byla, likvidavimas ir pan. - pašalinimo pagrindas (ne kvalifikacijos reikalavimas); tiekėjas nešalinamas, jei pagrįstai įrodo, kad sutartį įvykdys",
      PI: { a: "VPI", s: 46, d: 6, p: 2, per: PI59 }, VPI: { a: "VPI", s: 46, d: 6, p: 2 } },
    vadybos_standartai: { apie: "nepriklausomos įstaigos sertifikatas dėl kokybės vadybos sistemos (Europos standartų serijos) ar aplinkos apsaugos vadybos sistemos (EMAS ar kita); lygiaverčiai sertifikatai pripažįstami",
      PI: { a: "PI", s: 60 }, VPI: { a: "VPI", s: 48 } },

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

    // ---- Organizavimas ir kontrolė (PĮ; VPĮ - kur nurodyta)
    komisija_uzduotys: { apie: "pirkimo procedūroms atlikti sudaroma komisija, jai nustatomos užduotys; komisijos galima nesudaryti, pvz., atliekant mažos vertės pirkimų procedūras",
      PI: { a: "PI", s: 31, d: 1 }, VPI: { a: "VPI", s: 19, d: 1 } },
    komisija: { apie: "Komisija sudaroma iš ne mažiau kaip 3 fizinių asmenų (pirmininkas ir bent 2 nariai)",
      PI: { a: "PI", s: 31, d: 2 }, VPI: { a: "VPI", s: 19, d: 2 } },
    komisija_protokolas: { apie: "komisijos sprendimai įforminami protokolu, kuriame nurodomi sprendimo motyvai ir atskirosios nuomonės",
      PI: { a: "PI", s: 31, d: 5 }, VPI: { a: "VPI", s: 19, d: 5 } },
    nesaliskumas: { apie: "perkančioji organizacija reikalauja konfidencialumo pasižadėjimo, privačių interesų deklaracijos arba nešališkumo deklaracijos",
      PI: { a: "PI", s: 33, d: 2, p: 1 } },
    neskelbiamos_derybos: { apie: "neskelbiamų derybų sąlygos",
      PI: { a: "PI", s: 79 } },
    vidaus_kontrole: { apie: "pirkimų vidaus kontrolė",
      PI: { a: "PI", s: 103, d: 3 } },
    saugojimas: { apie: "pirkimo dokumentų saugojimas (ne trumpiau kaip 4 metai)",
      PI: { a: "PI", s: 103, d: 6 } },

    // ---- VPT Metodika (abiem režimams; 1 p.: padeda įgyvendinti VPĮ 47 str. 1 d. ir PĮ 59 str. 1 d.)
    met_mvp: { apie: "vykdant mažos vertės pirkimus Metodika neprivaloma, bet nustatant kvalifikacijos reikalavimus rekomenduojama vadovautis jos principais",
      bendra: { a: "MET", p: "1" } },
    // Sąvokos (2 p.). Vertės ribos - shared/thresholds.js; kategorijai - vertesKategorija().
    met_savokos: { apie: "Metodikoje vartojamos sąvokos: didelė, vidutinė ir maža numatoma pirkimo sutarties vertė, ilgalaikė ir trumpalaikė sutartis, kvazisubtiekėjas, subtiekėjas",
      bendra: { a: "MET", p: "2" } },
    met_didele_verte: { apie: "didelė numatoma pirkimo sutarties vertė - lygi tarptautinio pirkimo vertei arba ją viršija",
      bendra: { a: "MET", p: "2.1" } },
    met_ilgalaike: { apie: "ilgalaikė pirkimo sutartis - tiekimo, teikimo ar atlikimo laikotarpis ilgesnis kaip 12 mėnesių",
      bendra: { a: "MET", p: "2.2" } },
    // DĖMESIO: kvazisubtiekėjas - SPECIALISTAS, ne priemones suteikiantis trečiasis asmuo (tai 8.3 p.).
    // 2026-09-23 abu buvo sutapatinti PP-qual instrukcijoje - ištaisyta tą pačią dieną.
    met_kvazisubtiekejai: { apie: "kvazisubtiekėjas - specialistas, kurio kvalifikacija tiekėjas remiasi ir kuris pasiūlymo teikimo metu dar nėra tiekėjo ar ūkio subjekto, kurio pajėgumais remiamasi, darbuotojas, bet bus įdarbintas, jei pasiūlymas laimės",
      bendra: { a: "MET", p: "2.4" } },
    met_maza_verte: { apie: "maža numatoma pirkimo sutarties vertė - neviršija mažos vertės pirkimo vertės",
      bendra: { a: "MET", p: "2.5" } },
    met_trumpalaike: { apie: "trumpalaikė pirkimo sutartis - laikotarpis ne ilgesnis kaip 12 mėnesių",
      bendra: { a: "MET", p: "2.8" } },
    met_vidutine_verte: { apie: "vidutinė numatoma pirkimo sutarties vertė - mažesnė už tarptautinio pirkimo vertę ir didesnė už mažos vertės pirkimo vertę",
      bendra: { a: "MET", p: "2.10" } },
    met_privalo: { apie: "Metodika privalo vadovautis komisijos nariai, pirkimo organizatoriai, iniciatoriai ir ekspertai, rengiantys pirkimo dokumentus ir tikrinantys kvalifikaciją",
      bendra: { a: "MET", p: "4" } },
    met_kitokie: { apie: "laikantis 7 p. principų galima nustatyti kitokius nei Metodikoje reikalavimus ir reikšmes, jei to reikia dėl objekto specifikos, apimties ar ypatingų vykdymo sąlygų; kitokių nei įstatyme nurodyti kvalifikaciją patvirtinančių dokumentų reikalauti negalima",
      bendra: { a: "MET", p: "6" } },
    // Kvalifikacijos reikalavimų nustatymo principai (7 p.)
    met_vienodi_aiskus: { apie: "visiems tiekėjams taikomi vienodi, tikslūs, aiškūs, objektyviai patikrinami, pirkimo dokumentuose nurodyti kvalifikacijos reikalavimai",
      bendra: { a: "MET", p: "7.1" } },
    met_pagrindimas: { apie: "reikalavimai negali dirbtinai riboti konkurencijos, turi būti proporcingi ir susiję su objektu, renkamasi mažiausiai konkurenciją ribojantis; pirkimo vykdytojas turi galėti motyvuotai pagrįsti kiekvieną reikalavimą ir jo reikšmę, vertinama ir reikalavimų visuma",
      bendra: { a: "MET", p: "7.3" } },
    met_tikslas: { apie: "kvalifikacijos reikalavimų tikslas - ne atrinkti aukščiausią kvalifikaciją turinčius tiekėjus, o visus, kurie pajėgūs įvykdyti sutartį",
      bendra: { a: "MET", p: "7.4" } },
    met_vykdymo_dalykas: { apie: "reikalavimai, kurie pagal pobūdį yra sutarties vykdymo dalykas (pvz., kiekvieno objekto draudimas), keliami sutartyje, ne kvalifikacijai",
      bendra: { a: "MET", p: "7.5" } },
    met_aplinkybes: { apie: "reikalavimai nustatomi atsižvelgiant į objekto specifiką, apimtį, sutarties trukmę, apmokėjimo sąlygas ir numatomą vertę",
      bendra: { a: "MET", p: "7.6" } },
    met_nacionaline: { apie: "draudžiami išimtinai su nacionaline priklausomybe susiję reikalavimai; negalima diskriminuoti ES, EEE, Šveicarijos ir viešųjų pirkimų susitarimus pasirašiusių šalių tiekėjų",
      bendra: { a: "MET", p: "7.7" } },
    met_treciuju_priemones: { apie: "tretieji asmenys, kurie sutarties patys nevykdo, o tik suteikia priemones (pvz., išnuomoja patalpas ar įrangą): jų EBVPD ir pašalinimo pagrindų dokumentų neteikiama, bet tiekėjas su pasiūlymu įrodo, kad priemonėmis galės naudotis",
      bendra: { a: "MET", p: "8.3" } },
    met_ebvpd: { apie: "EBVPD - pirminis įrodymas su paraiška ar pasiūlymu; kiekvienas ūkio subjektas (išskyrus kvazisubtiekėjus) užpildo atskirą EBVPD; galima reikalauti ir iš žinomų subtiekėjų",
      bendra: { a: "MET", p: "8.6" } },
    met_dokumentai: { apie: "kvalifikaciją patvirtinančius dokumentus teikia ekonomiškai naudingiausią pasiūlymą pateikęs tiekėjas",
      bendra: { a: "MET", p: "8.7" } },
    met_nacsaugumas: { apie: "tikrinant atitiktį VPĮ 47 str. 9 d. - VPT formos atitikties deklaracija, laimėtojas teikia steigimo dokumentus, JAR išrašą ir kt. (ne senesnius kaip 3 mėn.)",
      bendra: { a: "MET", p: "8.8" } },
    met_finansiniai_veiksniai: { apie: "finansiniai reikalavimai priklauso nuo sutarties trukmės ir vertės (ilgalaikei - pagal didžiausią metinę vertę), apmokėjimo sąlygų, priklausomybės nuo sutarties ir sektoriaus: kuo ilgesnė sutartis ir dažnesnis apmokėjimas, tuo žemesnis reikalavimas",
      bendra: { a: "MET", p: "11" } },
    met_apyvarta: { apie: "metinės pajamos: daugiausia 3 paskutinių finansinių metų (paprastai 1); ne daugiau kaip 2 kartus didesnės už numatomą pirkimo vertę, išskyrus pagrįstus atvejus (priežastys nurodomos pirkimo dokumentuose ar ataskaitoje); skaidant į dalis - kiekvienai daliai",
      bendra: { a: "MET", p: "12" } },
    met_apyvarta_bendros: { apie: "mažos vertės sutarčiai paprastai nenustatoma; trumpalaikei vidutinės ar didelės vertės - ne daugiau kaip 2 kartus vertės; ilgalaikei - pagal didžiausią metinę vertę (36 mėn. tolygiai vykdomai - apie 0,2-0,7 visos vertės, bet ne daugiau kaip 2 kartus didžiausios metinės vertės)",
      bendra: { a: "MET", p: "12.1" } },
    met_mokumas: { apie: "bendrojo mokumo koeficientas (nuosavas kapitalas / įsipareigojimai) - reikšmė nuo 0,5 iki 2; rekomenduojama didelės vertės ilgalaikei sutarčiai",
      bendra: { a: "MET", p: "13.1" } },
    met_einamasis_likvidumas: { apie: "einamojo likvidumo koeficientas - reikšmė nuo 0,5 iki 1,5; rekomenduojama didelės vertės trumpalaikei ar ilgalaikei sutarčiai",
      bendra: { a: "MET", p: "13.2" } },
    met_kritinis_likvidumas: { apie: "kritinio likvidumo koeficientas - reikšmė nuo 0,5 iki 1,5; rekomenduojama didelės vertės trumpalaikei sutarčiai",
      bendra: { a: "MET", p: "13.3" } },
    met_draudimas: { apie: "profesinės civilinės atsakomybės draudimas - kvalifikacijos reikalavimas tik kai teisės aktai įpareigoja draustis (advokatai, antstoliai, auditoriai, notarai ir kt.); kai privaloma apdrausti pagal konkrečią sutartį - tai sutarties vykdymo sąlyga",
      bendra: { a: "MET", p: "14" } },
    met_patirtis: { apie: "patirties reikšmė (vertė, kiekis, apimtis) paprastai ne daugiau kaip 0,7 numatomos vertės, kiekio ar apimties; vertė eurais be PVM",
      bendra: { a: "MET", p: "16" } },
    met_patirtis_darbai: { apie: "darbai: per paskutinius 5 metus, savo jėgomis, svarbiausių darbų atlikimas ir rezultatai tinkami; laikotarpį galima ilginti dėl konkurencijos",
      bendra: { a: "MET", p: "16.1" } },
    met_patirtis_prekes_paslaugos: { apie: "prekės ir paslaugos: per paskutinius 3 metus, savo jėgomis; „tinkamai“ reikalauti galima, bet neprivaloma",
      bendra: { a: "MET", p: "16.2" } },
    met_patirtis_misrus: { apie: "perkant skirtingų rūšių objektus - atskiri patirties reikalavimai kiekvienam",
      bendra: { a: "MET", p: "16.3" } },
    met_technikos_specialistai: { apie: "technikos specialistai ir techninės organizacijos: privalomas jų skaičius nenustatomas, negalima reikalauti, kad būtų konkrečioje vietoje",
      bendra: { a: "MET", p: "17" } },
    met_iranga: { apie: "įranga ir kokybės užtikrinimo priemonės: paprastai nenustatomas privalomas kiekis; jei priemones tiekėjas įsigis tik laimėjęs - reikalaujama tik aprašymo ir įrodymų, kad galės jas gauti",
      bendra: { a: "MET", p: "18" } },
    met_personalas: { apie: "personalo išsilavinimas ir kvalifikacija: nurodomos kompetencijos, ne specialistų skaičius (tas pats asmuo gali atlikti kelias funkcijas); patirtį skaičiuoti faktinę, nurodant kaip; išsilavinimas - tik pagal objekto specifiką; kai kvalifikaciją patvirtina atestatas - atskiras išsilavinimo ar patirties reikalavimas nenustatomas",
      bendra: { a: "MET", p: "21" } },
    met_darbuotoju_skaicius: { apie: "vidutinis metinis darbuotojų skaičius - tik ilgalaikei ar didelės vertės sutarčiai, kai stabilus personalo skaičius svarbus tinkamam įvykdymui",
      bendra: { a: "MET", p: "23" } },
    met_irankiai: { apie: "įrankiai, įrenginiai ir techninės priemonės - tik paslaugų ir darbų pirkimuose; paprastai konkrečių nenurodoma ir skaičius nenustatomas",
      bendra: { a: "MET", p: "24" } },
    met_prekiu_kokybe: { apie: "reikalavimas, kad tiekiamų prekių kokybė atitiktų nurodytas specifikacijas ir standartus (patvirtina oficialios kokybės kontrolės institucijos) - tik kai būtina įsitikinti tiekėjo kvalifikacija ir tai nėra techninės specifikacijos reikalavimas",
      bendra: { a: "MET", p: "26" } },

    // ---- Žalieji pirkimai
    zalieji: { apie: "aplinkos apsaugos kriterijų taikymas žaliuosiuose pirkimuose",
      bendra: { a: "ZALIEJI" } },
    // Aprašo 4 p.: pirkimas žaliasis, kai rengiant TS, kvalifikacijos reikalavimus, vertinimo kriterijus
    // ar sutarties sąlygas produktas tenkina BENT VIENĄ 4.1-4.4 papunktį. Žaliojo pirkimo požymis
    // savaime NEREIŠKIA, kad tiekėjui keliamas ISO 14001 ar kitas kvalifikacijos reikalavimas.
    zal_zaliasis: { apie: "pirkimas laikomas žaliuoju, kai rengiant techninę specifikaciją, kvalifikacijos reikalavimus, vertinimo kriterijus ar sutarties sąlygas produktas tenkina bent vieną Aprašo 4.1-4.4 papunktį",
      bendra: { a: "ZALIEJI", p: "4" } },
    zal_produktu_sarasas: { apie: "produktas yra Aprašo 1 priedo sąraše ir atitinka visus jam nustatytus minimalius aplinkos apsaugos kriterijus (2 priedas)",
      bendra: { a: "ZALIEJI", p: "4.1" } },
    zal_zenklas: { apie: "produktas atitinka I tipo ekologinio ženklo reikalavimus (LST EN ISO 14024) ir paženklintas tokiu ženklu arba kitu lygiaverčiu įrodymu",
      bendra: { a: "ZALIEJI", p: "4.2" } },
    zal_vadyba: { apie: "paslaugai ar darbui, kurio nėra produktų sąraše, tiekėjas taiko aplinkos apsaugos vadybos sistemą (LST EN ISO 14001, EMAS ar kitą pagal Europos ar tarptautinius standartus); kiti lygiaverčiai įrodymai priimami supaprastintuose ir socialinių bei kitų specialiųjų paslaugų pirkimuose, kitais atvejais - tik jei tiekėjas dėl nuo jo nepriklausančių objektyvių priežasčių negali laiku pateikti sertifikatų",
      bendra: { a: "ZALIEJI", p: "4.3" } },
    zal_nematerialios: { apie: "žaliuoju laikomas ir tik nematerialaus pobūdžio paslaugų pirkimas be reikšmingo neigiamo poveikio aplinkai (pvz., programavimo ir informacinių sistemų priežiūros, audito, teisinės, konsultavimo, mokymų paslaugos) ir programinės įrangos, licencijų pirkimas",
      bendra: { a: "ZALIEJI", p: "4.4.3" } },
    zal_savi_kriterijai: { apie: "pirkimo vykdytojas gali pats nustatyti su pirkimo objektu susijusius aplinkos apsaugos kriterijus pagal Aprašo aplinkosauginius principus (mažiau išteklių, energijos, pavojingų medžiagų; ilgaamžiškumas; perdirbimas)",
      bendra: { a: "ZALIEJI", p: "4.4.4" } },
    zal_lygiaverciai: { apie: "lygiaverčiai aplinkos apsaugos vadybos įrodymai - tiekėjo taikomų priemonių aprašymas, atitinkantis Aprašo 10.1-10.6 papunkčius (politika, reikšmingi aspektai, tikslai, stebėsena, avarijų planas, kontrolė)",
      bendra: { a: "ZALIEJI", p: "10" } },
    // Metodikos 22 p. - aplinkos apsaugos vadybos priemonės kaip TECHNINIO pajėgumo reikalavimas.
    met_aplinkos_vadyba: { apie: "aplinkos apsaugos vadybos priemonės, kurias tiekėjas galės taikyti vykdydamas sutartį: nurodomos konkrečios priemonės, ne reikalaujama sistema ar standartas; detalaus priemonių plano su pasiūlymu nereikalaujama",
      bendra: { a: "MET", p: "22" } },
    // Techninė specifikacija pagal sąvoką apima ir produkto poveikio aplinkai ir klimatui rodiklius.
    ts_savoka: { apie: "techninė specifikacija - produktui ar paslaugai apibūdinti reikalingi duomenys, tarp jų poveikio aplinkai ir klimatui rodikliai",
      PI: { a: "PI", s: 2, d: 27 }, VPI: { a: "VPI", s: 2, d: 34 } }
  };

  /* Metodikos SKAIČIAI - čia, ne moduliuose (CLAUDE.md 10 sk.: koeficientai gyvena shared/).
     Kiekvienas perskaitytas e-tar kartu su nuorodomis; `saltinis` - registro raktas, kurio
     vietoje skaičius parašytas. Keičiant skaičių - patikrink tą vietą e-tar.            */
  var NORMOS = {
    patirtiesRiba:        { reiksme: 0.7, saltinis: "met_patirtis" },          // paprastai ne daugiau kaip 0,7
    pajamuKartai:         { reiksme: 2, saltinis: "met_apyvarta" },            // ne daugiau kaip 2 kartus vertės
    pajamuMetai:          { paprastai: 1, daugiausia: 3, saltinis: "met_apyvarta" },
    pajamu36men:          { nuo: 0.2, iki: 0.7, saltinis: "met_apyvarta_bendros" }, // tik 36 mėn. pavyzdys
    ilgalaikeNuoMen:      { reiksme: 12, saltinis: "met_ilgalaike" },          // ilgesnė kaip 12 mėn.
    mokumas:              { nuo: 0.5, iki: 2, saltinis: "met_mokumas" },
    einamasisLikvidumas:  { nuo: 0.5, iki: 1.5, saltinis: "met_einamasis_likvidumas" },
    kritinisLikvidumas:   { nuo: 0.5, iki: 1.5, saltinis: "met_kritinis_likvidumas" },
    patirtiesMetaiDarbai: { reiksme: 5, saltinis: "met_patirtis_darbai" },
    patirtiesMetaiPrekesPaslaugos: { reiksme: 3, saltinis: "met_patirtis_prekes_paslaugos" }
  };
  (function uzsaldyk(o) { Object.freeze(o); Object.keys(o).forEach(function (k) { if (typeof o[k] === "object") uzsaldyk(o[k]); }); })(NORMOS);

  /* Numatomos pirkimo sutarties vertės kategorija (Metodikos 2.1, 2.5, 2.10 p.).
     ribos = { maza, tarptautine } - iš shared/thresholds.js pagal režimą ir objekto rūšį
     (paduodamos iš išorės, kad šis failas nepriklausytų nuo įkėlimo tvarkos ir būtų testuojamas). */
  function vertesKategorija(verte, ribos) {
    if (!(verte > 0) || !ribos || !(ribos.maza > 0) || !(ribos.tarptautine > 0)) return null;
    if (verte >= ribos.tarptautine) return { kodas: "didele", raktas: "met_didele_verte" };
    if (verte <= ribos.maza) return { kodas: "maza", raktas: "met_maza_verte" };
    return { kodas: "vidutine", raktas: "met_vidutine_verte" };
  }

  // Trumpalaikė (iki 12 mėn. imtinai) ar ilgalaikė sutartis (Metodikos 2.8 ir 2.2 p.); null - nežinoma.
  function sutartiesTrukme(men) {
    if (!(men > 0)) return null;
    return men > NORMOS.ilgalaikeNuoMen.reiksme
      ? { kodas: "ilgalaike", raktas: "met_ilgalaike" }
      : { kodas: "trumpalaike", raktas: "met_trumpalaike" };
  }

  function klaida(tekstas) { throw new Error("GP_TEISE: " + tekstas); }

  // Viena nuoroda -> tekstas. LT: „PĮ 50 str. 4 d. 2 p.“, EN: „PĮ Art. 50(4)(2)“.
  function formatas(n, kalba) {
    var en = kalba === "en";
    if (n.a === "MET") return en ? "Methodology, point " + n.p : "Metodikos " + n.p + " p.";
    if (n.a === "ZALIEJI") return n.p
      ? (en ? "Green Procurement Rules, point " + n.p : "Žaliųjų pirkimų tvarkos aprašo " + n.p + " p.")
      : (en ? "Green Procurement Rules (Order No D1-508)" : "Žaliųjų pirkimų tvarkos aprašas (įsakymas Nr. D1-508)");
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
    visos: visos,
    normos: NORMOS,
    vertesKategorija: vertesKategorija,
    sutartiesTrukme: sutartiesTrukme
  };
})(typeof window !== "undefined" ? window : this);
