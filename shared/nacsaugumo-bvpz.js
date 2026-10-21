/* ============================================================================
 * G-Procure  shared/nacsaugumo-bvpz.js   (window.GP_NACSAUG_BVPZ)
 *
 * Pirkimo objektų, kuriems taikomi nacionalinio saugumo reikalavimai, BVPŽ kodų sąrašas
 * (VPĮ 92 str. 13 d.; perkantiesiems subjektams į jį nurodo PĮ 50 str. 9 d.) ir patikra,
 * ar pirkimo BVPŽ kodas į jį patenka.
 *
 * ŠALTINIS: Lietuvos Respublikos Vyriausybės 2022 m. kovo 30 d. nutarimo Nr. 280 priedas,
 * 2023 m. lapkričio 8 d. nutarimo Nr. 865 redakcija (suvestinė redakcija nuo 2024-03-15 -
 * vėliau keistas tik valstybių sąrašas). Priedas perskaitytas iš e-tar 2026-10-21; jo DOCX
 * maiša - SALTINIS.sha256. Pasikeitus sąrašui - atnaujink TIK čia (eilutės, redakcija, maiša, data).
 *
 * TAISYKLĖS (pagal sąrašo pastabą „kode nurodytas „X“ yra bet koks skaičius“):
 *  - kodas su „X“ apima visus kodus, prasidedančius skaitmenimis iki pirmo „X“
 *    (30211XXX-X - visi 30211...);
 *  - kodas be „X“ - tik tas kodas (sąraše atskirai išvardyti ir smulkesni kodai,
 *    pvz. 32546000-2 ir 32546100-3, todėl kodas be „X“ jų neapima);
 *  - eilutės išimtys („išskyrus“) į sąrašą nepatenka;
 *  - platesnis kodas (pvz. 32500000-0), kurio dalys yra sąraše, - ne atitiktis, o
 *    „patikrinkite“: ar perkamos būtent tos prekės ar paslaugos, sprendžia žmogus.
 * Kad kodo sąraše nėra, reiškia tik tai, kad netenkinama PIRMOJI sąlyga; antrąją
 * (sandorio aplinkybės, PĮ 50 str. 8 d.) įvertina žmogus. Nieko nesaugo ir nesiunčia.
 * ========================================================================== */
(function (root) {
  "use strict";

  var SALTINIS = {
    aktas: "Lietuvos Respublikos Vyriausybės 2022 m. kovo 30 d. nutarimas Nr. 280 „Dėl Lietuvos Respublikos viešųjų pirkimų įstatymo 92 straipsnio 13, 14 ir 15 dalių nuostatų įgyvendinimo“",
    trumpai: "Vyriausybės 2022-03-30 nutarimu Nr. 280 patvirtintas sąrašas",
    redakcija: "2023-11-08 nutarimo Nr. 865 redakcija",
    url: "https://www.e-tar.lt/portal/lt/legalAct/35e281a0b0c711ec8d9390588bf2de65/asr",
    priedas: "https://www.e-tar.lt/rs/lasupplement/96c2d9d0822f11eea5a28c81c82193a8/7fcebeb0823411eea5a28c81c82193a8/",
    sha256: "6cfa94511981ad5a8b566e774247e68d40a853147f13b258d441a53d3aa1ae74",
    tikrinta: "2026-10-21",
    eiluciu: 65
  };

  // [eilės nr., kodas kaip sąraše, aprašymas, išimtys [[kodas, aprašymas]], pastaba]
  var DUOMENYS = [
    [1, "30211XXX-X", "Įvairi kompiuterinė įranga"],
    [2, "30213XXX-X", "Įvairūs kompiuteriai"],
    [3, "30214000-2", "Vartotojų darbo vietos"],
    [4, "30215100-0", "Mikrokompiuterių centriniai procesoriai"],
    [5, "3023XXXX-X", "Įvairi su kompiuteriais susijusi įranga", [
      ["30231XXX-X", "įvairūs kompiuterių ekranai ir pultai"],
      ["302331XX-X", "įvairūs atminties įrenginiai"],
      ["302372XX-X", "įvairūs kompiuterių priedai"],
      ["302373XX-X", "įvairūs kompiuterių reikmenys, kasetės, garsajuostės, diskai"],
      ["302374XX-X", "įvairūs duomenų įvedimo reikmenys"]]],
    [6, "31154000-0", "Nenutrūkstamojo maitinimo šaltiniai"],
    [7, "31712XXX-X", "Įvairūs mikroelektronikos įrenginiai, aparatai bei mikrosistemos"],
    [8, "3223XXXX-X", "Įvairūs radijo siųstuvai ir televizijos aparatūra, vaizdo konferencijų įranga"],
    [9, "3225XXXX-X", "Įvairūs mobilieji telefonai"],
    [10, "32323500-8", "Stebėjimo videosistema"],
    [11, "32333200-8", "Videokameros"],
    [12, "323442XX-X", "Įvairi radijo įranga ir aparatūra"],
    [13, "32352XXX-X", "Antenos ir reflektoriai, radijo ir radarų dalys ir priedai"],
    [14, "3241XXXX-X", "Įvairūs ryšių tinklai"],
    [15, "3242XXXX-X", "Įvairi tinklo įranga"],
    [16, "32510000-1", "Bevielių telekomunikacijų sistema"],
    [17, "3252XXX-X", "Įvairi telekomunikacijų įranga", [["32521000-1", "telekomunikacijų kabeliai"]],
      "sąraše kodas užrašytas 7 ženklais - laikoma, kad tai visi kodai, prasidedantys 3252"],
    [18, "3253XXXX-X", "Įvairi aparatūra, susijusi su palydoviniu ryšiu"],
    [19, "32544000-8", "PABX aparatūra"],
    [20, "32545000-5", "PABX sistemos"],
    [21, "32546000-2", "Skaitmeniniai komutavimo įrenginiai"],
    [22, "32546100-3", "Skaitmeniniai perjungimo skydai"],
    [23, "32551200-2", "Telefonų stotys"],
    [24, "32551400-4", "Telefono ryšio tinklas"],
    [25, "325521XX-X", "Įvairūs telefono aparatai"],
    [26, "32552310-3", "Skaitmeninės telefonų stotys"],
    [27, "32552410-4", "Modemai"],
    [28, "32552430-0", "Kodavimo įrenginiai"],
    [29, "32571000-6", "Ryšių infrastruktūra"],
    [30, "32573000-0", "Ryšių valdymo sistema"],
    [31, "32581200-1", "Fakso įranga"],
    [32, "32581210-4", "Fakso įrangos priedai ir dalys"],
    [33, "34632000-6", "Geležinkelių eismo valdymo įranga"],
    [34, "34711200-6", "Nepilotuojami orlaiviai"],
    [35, "34721100-8", "Skraidyklės"],
    [36, "34931500-7", "Laivų eismo valdymo įranga"],
    [37, "34932000-9", "Radarų komplektai"],
    [38, "34933000-6", "Navigacijos įranga"],
    [39, "34943000-9", "Traukinių stebėsenos sistema"],
    [40, "34962100-9", "Valdymo bokštų įrenginiai"],
    [41, "34962200-0", "Skrydžių valdymas"],
    [42, "34962220-6", "Skrydžių valdymo sistemos"],
    [43, "34968100-1", "Oro uostų stebėjimo sistemos (SUR)"],
    [44, "3512XXXX-X", "Įvairios stebėjimo ir apsaugos sistemos bei prietaisai"],
    [45, "357XXXXX-X", "Įvairios vadovavimo, valdymo ar ryšių sistemos, kitos elektroninės karinės sistemos"],
    [46, "3811XXXX-X", "Įvairūs navigacijos prietaisai"],
    [47, "38581000-1", "Bagažo tikrinimo įrenginiai"],
    [48, "38582000-8", "Rentgeno kontrolės įrenginiai"],
    [49, "38652120-7", "Vaizdo projektoriai"],
    [50, "38740000-4", "Technologinių procesų valdymo laikmačiai"],
    [51, "388XXXXX-X", "Įvairi pramonės procesų valdymo ir nuotolinio valdymo įranga"],
    [52, "42961XXX-X", "Įvairios vadovavimo ir valdymo sistemos"],
    [53, "42965XXX-X", "Įvairios informacijos valdymo ir apdorojimo sistemos"],
    [54, "45314XXX-X", "Įvairios telekomunikacijų įrangos įrengimas"],
    [55, "48XXXXXX-X", "Įvairūs programinės įrangos paketai ir informacinės sistemos"],
    [56, "503XXXXX-X", "Įvairios kompiuterinės, telekomunikacijų, radijo ryšio įrangos priežiūra ir remontas"],
    [57, "50413XXX-X", "Tikrinimo įrangos, dujų detekcijos įrenginių ir gaisrų gesinimo įrenginių remonto ir priežiūros paslaugos"],
    [58, "51240000-6", "Navigacinių įrenginių montavimo paslaugos"],
    [59, "513XXXXX-X", "Įvairios ryšių, radijo, televizijos įrangos montavimo paslaugos"],
    [60, "516XXXXX-X", "Įvairios kompiuterių ir informacijos apdorojimo įrangos montavimo paslaugos"],
    [61, "51900000-1", "Vadovavimo ir valdymo sistemų įrengimo paslaugos"],
    [62, "642XXXXX-X", "Įvairios telekomunikacijų paslaugos, nuoma"],
    [63, "71316000-6", "Telekomunikacijų konsultacinės paslaugos"],
    [64, "72XXXXXX-X", "Įvairios informacinių technologijų paslaugos (konsultavimas, programinės įrangos kūrimas, internetas ir aptarnavimo paslaugos)"],
    [65, "79132100-9", "Elektroninio parašo sertifikavimo paslaugos"]
  ];

  // kodo šablono skaitmenys: iki pirmo „X“ (su „X“ - pradžia), kitaip - visi aštuoni (tik tas kodas)
  function sablonas(kodas) {
    var s = String(kodas).replace(/-.*$/, "");
    var i = s.indexOf("X");
    return i >= 0 ? { pradzia: s.slice(0, i), tikslus: false } : { pradzia: s, tikslus: true };
  }
  function patenka(k8, kodas) {
    var s = sablonas(kodas);
    return s.tikslus ? k8 === s.pradzia : k8.slice(0, s.pradzia.length) === s.pradzia;
  }

  var EILUTES = DUOMENYS.map(function (d) {
    return { nr: d[0], kodas: d[1], aprasymas: d[2], pradzia: sablonas(d[1]).pradzia, tikslus: sablonas(d[1]).tikslus,
      isimtys: (d[3] || []).map(function (x) { return { kodas: x[0], aprasymas: x[1] }; }), pastaba: d[4] || "" };
  });

  /* „48000000-8“, „48000000“, „48000000 - 8“ -> „48000000“; kitaip null */
  function normalizuok(s) {
    var m = /^\s*(\d{8})(?:\s*-\s*(\d))?\s*$/.exec(String(s == null ? "" : s).replace(/ /g, " "));
    return m ? m[1] : null;
  }

  /* Visi BVPŽ kodai tekste (laukas ar dokumento sakinys): 8 skaitmenys, nebūtinai su kontroliniu.
     Nepasikartojantys, tekste esančia tvarka; „12345678-9“ arba „12345678“. */
  function kodai(tekstas) {
    var out = [], re = /(^|[^0-9])(\d{8})(?:[  ]*-[  ]*(\d))?(?![0-9])/g, m;
    var t = String(tekstas == null ? "" : tekstas);
    while ((m = re.exec(t))) {
      var k = m[2] + (m[3] ? "-" + m[3] : "");
      if (!out.some(function (x) { return x.slice(0, 8) === m[2]; })) out.push(k);
    }
    return out;
  }

  /* Kodai iš dokumento teksto TIK po žymės „BVPŽ“ ar „CPV“ (tame pačiame sakinyje ir eilutėje, iki 200 ženklų) - kitaip 8 skaitmenų
     skaičius gali būti sąskaitos, telefono, įmonės ar dokumento numeris. */
  function kodaiDokumente(tekstas) {
    var t = String(tekstas == null ? "" : tekstas), out = [];
    var re = /BVP[ŽZ]|CPV/gi, m;
    while ((m = re.exec(t))) {
      var langas = t.slice(m.index + m[0].length, m.index + m[0].length + 200).split(/\r?\n|\.\s+(?=[A-ZĄČĘĖĮŠŲŪŽ])/)[0];
      kodai(langas).forEach(function (k) { if (!out.some(function (x) { return x.slice(0, 8) === k.slice(0, 8); })) out.push(k); });
    }
    return out;
  }

  /* Vieno kodo patikra:
     { kodas, k8, rusis: "sarase" | "isimtis" | "platesnis" | "nera" | "netinkamas",
       eilute (sarase), isimtis + eilute (isimtis), eilutes (platesnis - sąrašo eilutės, kurias kodas apima) } */
  function tikrink(kodas) {
    var k8 = normalizuok(kodas);
    if (!k8) return { kodas: String(kodas == null ? "" : kodas).trim(), k8: null, rusis: "netinkamas" };
    var isim = null;
    for (var i = 0; i < EILUTES.length; i++) {
      var e = EILUTES[i];
      if (!patenka(k8, e.kodas)) continue;
      var x = e.isimtys.filter(function (y) { return patenka(k8, y.kodas); })[0];
      if (x) { if (!isim) isim = { eilute: e, isimtis: x }; continue; }
      return { kodas: String(kodas).trim(), k8: k8, rusis: "sarase", eilute: e };
    }
    if (isim) return { kodas: String(kodas).trim(), k8: k8, rusis: "isimtis", eilute: isim.eilute, isimtis: isim.isimtis };
    // platesnis kodas: be galinių nulių jis - sąrašo eilutės kodo pradžia (CPV grupės kodas baigiasi nuliais)
    var baze = k8.replace(/0+$/, "");
    if (baze.length >= 2) {
      var eil = EILUTES.filter(function (e) { return e.pradzia.length > baze.length && e.pradzia.slice(0, baze.length) === baze; });
      if (eil.length) return { kodas: String(kodas).trim(), k8: k8, rusis: "platesnis", eilutes: eil };
    }
    return { kodas: String(kodas).trim(), k8: k8, rusis: "nera" };
  }

  /* Kelių kodų įvertinimas: { visi, sarase, isimtys, platesni, nera, netinkami } */
  function ivertink(sarasas) {
    var visi = (sarasas || []).map(tikrink);
    var pagal = function (r) { return visi.filter(function (x) { return x.rusis === r; }); };
    return { visi: visi, sarase: pagal("sarase"), isimtys: pagal("isimtis"), platesni: pagal("platesnis"),
      nera: pagal("nera"), netinkami: pagal("netinkamas") };
  }

  function eilutesTekstas(e) {
    return e.nr + " eilutė - " + e.kodas + " „" + e.aprasymas + "“";
  }

  root.GP_NACSAUG_BVPZ = { SALTINIS: SALTINIS, EILUTES: EILUTES, normalizuok: normalizuok, kodai: kodai,
    kodaiDokumente: kodaiDokumente, tikrink: tikrink, ivertink: ivertink, eilutesTekstas: eilutesTekstas };
})(typeof window !== "undefined" ? window : this);
