/*
 * PP-salygos: sutarties projekto klausimai 2 žingsnyje ir sprendimai generatoriui (GP_SUTARTIES_FORMA, sutarčių planas S4, 2026-10-08;
 * taisyklės - docs/salygos/sutarciu-lauku-inventorius.md, naudotojo sprendimai 2026-10-07 ir 2026-10-08).
 *
 *   GP_SUTARTIES_FORMA.klausimai(Z, ctx, A)  -> rodomi klausimai: [{ id, grupe, klausimas, uzuomina, pa, tipas, variantai, laukai,
 *                                                privalomas, siuloma: { reiksme, kilme } | null, reiksme, busena }]
 *   GP_SUTARTIES_FORMA.sprendimai(Z, ctx, A) -> { S (GP_SUTARCIU_GEN sprendimai), truksta: [klausimai be atsakymo], siulomos: [...] }
 *   GP_SUTARTIES_FORMA.mount({ vieta, kontekstas, onKeista }) -> { atnaujink, busena, atsakymai }  - sąsaja (atskirai nuo taisyklių)
 *     ctx: { seima: "PREKES" | "PASLAUGOS" | "PROJEKTAVIMO_STATYBOS", kalba: "LT" | "LTEN", pavadinimas, pavadinimasEN, numeris, trukmeMen, verte,
 *            uztikrinimas: { taikomas: true | false | null, eur }, kriterijus: "kaina" | "kokybe" | null, nacsaug: bool }
 *     A: { [klausimo id]: { reiksme, patvirtinta } } - žmogaus atsakymai; siūloma reikšmė (iš ctx ar LITGRID standarto) galioja, kol
 *        žmogus neatsakė, ir rodoma „Siūloma (nepatvirtinta)“ su kilme; „Patvirtinta“ - tik žmogaus veiksmu.
 *
 * Sutarties šablono tekstas nekeičiamas - sprendimai tik renkasi šablono variantus ir įrašo reikšmes į pildomas vietas. Ko šablonas
 * nenumato (pvz. pratęsimo sąlygų redagavimas), paliekama Word programai ir išvardijama patikroje. DI nenaudojamas.
 */
(function (global) {
  "use strict";
  var LITGRID = "LITGRID standartas";

  /* ---------------------------------------------------------------- pagalbinės */
  function vieta(V, rusis, v, re){
    return V.filter(function (x) { return x.rusis === rusis && x.vieta === v && (!re || re.test((x.elementai || []).join("|") + (x.variantai || []).join("|") + (x.aprasas || ""))); })[0] || null;
  }
  function el(x, re){ return x ? x.elementai.findIndex(function (e) { return re.test(e.trim()); }) : -1; }
  function vr(x, re){ return x ? x.variantai.findIndex(function (e) { return re.test(e); }) : -1; }
  function skaicius(s){ var n = parseFloat(String(s == null ? "" : s).replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : null; }
  /* Galininkas po „per“: 1 mėnesį, 3 mėnesius, 10 mėnesių; vardininkas po dvitaškio: 1 mėnuo, 3 mėnesiai, 10 mėnesių */
  function forma(n, vns, dgsKelios, dgsDaug){
    var d = n % 10, s = n % 100;
    return d === 1 && s !== 11 ? vns : d >= 2 && (s < 12 || s > 19) ? dgsKelios : dgsDaug;
  }
  function apvalink(x){ return Math.round(x * 100) / 100; }
  function skLT(x){ return String(x).replace(".", ","); }

  /* ---------------------------------------------------------------- klausimų aprašai
     tipas: taipne | variantai | skaicius | tekstas | formuluote. laukai - papildomi laukai, rodomi pasirinkus `kada` atsakymą.
     rodoma(ctx, R) - R: efektyvūs atsakymai; siuloma(ctx, R, V) -> { reiksme, kilme } | null. */
  var TN = [{ id: "taip", tekstas: "Taip" }, { id: "ne", tekstas: "Ne" }];
  var KAINODARA = [
    { id: "fiksuota_kaina", tekstas: "Fiksuotos kainos kainodara", re: /^Fiksuotos kainos/ },
    { id: "fiksuotas_ikainis", tekstas: "Fiksuoto įkainio kainodara", re: /^Fiksuoto įkainio/ },
    { id: "kintamas_ikainis", tekstas: "Kintamo įkainio kainodara", re: /^Kintamo įkainio/ },
    { id: "islaidu", tekstas: "Sutarties vykdymo išlaidų atlyginimo kainodara", re: /^Sutarties vykdymo išlaidų/ },
    { id: "misri", tekstas: "Mišri kainodara", re: /^Mišri/ }];
  var ikainiai = function (R) { return R.kainodara === "fiksuotas_ikainis" || R.kainodara === "kintamas_ikainis"; };
  var prekes = function (c) { return c.seima === "PREKES"; }, paslaugos = function (c) { return c.seima === "PASLAUGOS"; };
  var LTEN = function (c) { return c.kalba === "LTEN"; };
  /* SPS žaliųjų reikalavimų dalies variantai (ctx.zaliejiSPS - PP-SALYGOS.html spsZalieji) - pastabai ir derinimo patikrai */
  var ZAL_SPS = { ts_sutartis: "žalieji reikalavimai nurodyti Techninėje specifikacijoje ir (ar) Sutarties projekte",
                  salygose: "žalieji reikalavimai nurodomi pirkimo sąlygose", savaime: "pirkimas laikomas žaliuoju savaime" };
  var en = function (id, uzrasas) { return { id: id, tipas: "formuluote", uzrasas: uzrasas, kada: "taip", tikLTEN: true }; };
  /* LT/EN: terminas „30 (trisdešimt) dienų“ anglų stulpeliui - „30 (thirty) days“ (2026-10-09, Pages patikra: iki tol anglų stulpelyje
     likdavo lietuviškai - „by more than 30 (trisdešimt) dienų“). Kitaip parašytas terminas - LT/EN sutarčiai neatsakytas klausimas. */
  var EN_VNT = [[/^darbo\s+dien/i, "working day", "working days"], [/^kalendorini\S*\s+dien/i, "calendar day", "calendar days"], [/^dien/i, "day", "days"],
                [/^savait/i, "week", "weeks"], [/^mėnes/i, "month", "months"], [/^met/i, "year", "years"], [/^valand/i, "hour", "hours"]];
  var EN_SK = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
               "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var EN_DES = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function zodziaisEN(n){
    if (n < 20) return EN_SK[n];
    if (n < 100) return EN_DES[Math.floor(n / 10)] + (n % 10 ? "-" + EN_SK[n % 10] : "");
    return EN_SK[Math.floor(n / 100)] + " hundred" + (n % 100 ? " and " + zodziaisEN(n % 100) : "");
  }
  function terminasEN(t){
    var m = /^\s*(\d{1,3})\s*(\([^)]*\))?\s*([A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž ]+?)\s*\.?\s*$/.exec(String(t || ""));
    if (!m) return null;
    var n = +m[1], u = EN_VNT.filter(function (x) { return x[0].test(m[3]); })[0];
    return u ? n + " (" + zodziaisEN(n) + ") " + (n === 1 ? u[1] : u[2]) : null;
  }
  var terminoPastaba = function (lauk) { return function (c, R) {
    if (!LTEN(c) || !String(R[lauk] || "").trim()) return "";
    var e = terminasEN(R[lauk]);
    return e ? "Anglų stulpelyje: „" + e + "“." : "Anglų stulpeliui terminą įrašykite skaičiumi ir žodžiais, pvz. „30 (trisdešimt) dienų“ - tada jis išverčiamas.";
  }; };

  var KLAUSIMAI = [
    { id: "trukme", grupe: "Sutarties trukmė ir terminai", tipas: "skaicius", privalomas: true,
      klausimas: "Kokia sutarties trukmė (mėnesiais)?",
      uzuomina: "Nuo jos priklauso SS 11.1.2 punktas (ilgiausias tiekimo ar teikimo terminas) ir kainų peržiūra dėl kainų lygio pokyčio (5.3.1.2 punktas - taikoma, kai trukmė ilgesnė kaip 6 mėnesiai).",
      siuloma: function (c) { return c.trukmeMen ? { reiksme: String(c.trukmeMen), kilme: "pirkimo kortelė" } : null; } },
    { id: "pradzia", grupe: "Sutarties trukmė ir terminai", tipas: "variantai", privalomas: true,
      klausimas: "Nuo kada skaičiuojamas pristatymo ar suteikimo terminas (4.1 punktas)?",
      variantai: [{ id: "isigaliojimo", tekstas: "Nuo Sutarties įsigaliojimo dienos", re: /nuo Sutarties įsigaliojimo/ },
                  { id: "uzsakymo", tekstas: "Nuo užsakymo pateikimo dienos", re: /nuo užsakymo pateikimo/ },
                  { id: "ts", tekstas: "Techninėje specifikacijoje nustatytais terminais ir sąlygomis", re: /Techninėje specifikacijoje nustatytais terminais/ }],
      uzuomina: "Šablono 4.1 punkto variantai.",
      siuloma: function (c, R) { return R.kainodara === "fiksuota_kaina" ? { reiksme: "isigaliojimo", kilme: "kainodara - fiksuota kaina" }
                                   : ikainiai(R) ? { reiksme: "uzsakymo", kilme: "kainodara - įkainiai (užsakymais)" } : null; } },
    { id: "terminas", grupe: "Sutarties trukmė ir terminai", tipas: "skaicius", privalomas: true,
      klausimas: "Per kiek laiko tiekėjas turi pristatyti prekes ar suteikti paslaugas (4.1 punktas)?",
      uzuomina: "Skaičius; vieneto forma parenkama pagal skaičių (pvz. „per 1 mėnesį“, „per 3 mėnesius“).",
      vienetai: function (c) { return prekes(c) ? [{ id: "men", tekstas: "mėnesiai" }] : [{ id: "men", tekstas: "mėnesiai" }, { id: "d", tekstas: "dienos" }]; },
      rodoma: function (c, R) { return R.pradzia !== "ts"; } },
    { id: "bendras", grupe: "Sutarties trukmė ir terminai", tipas: "skaicius", privalomas: false, rodoma: paslaugos,
      klausimas: "Koks bendras paslaugų teikimo terminas mėnesiais (4.1 punktas)?",
      uzuomina: "Neįrašius - „punktas netaikomas“. Rašoma „Bendras Paslaugų teikimo terminas: 12 mėnesių.“" },
    { id: "pratesimo_aplinkybes", grupe: "Sutarties trukmė ir terminai", tipas: "taipne", privalomas: true, rodoma: paslaugos,
      klausimas: "Ar paslaugų suteikimo terminą galima pratęsti šablone išvardytomis aplinkybėmis (4.2 punktas)?",
      uzuomina: "„Taip“ - lieka šablono aplinkybių sąrašas (nepalankios oro sąlygos, Pirkėjo veiksmai ir kt., kaip prekių sutartyje); „Ne“ - „Netaikoma“.",
      siuloma: function () { return { reiksme: "taip", kilme: LITGRID + " (kaip prekių sutartyje)" }; } },
    { id: "es", grupe: "Sutarties dalykas", tipas: "taipne", privalomas: true,
      klausimas: "Ar pirkimas finansuojamas Europos Sąjungos lėšomis (3.3 punktas)?",
      laukai: [{ id: "es_nr", tipas: "tekstas", uzrasas: "Projekto numeris", kada: "taip" }, { id: "es_pav", tipas: "tekstas", uzrasas: "Projekto pavadinimas", kada: "taip" }] },

    { id: "kainodara", grupe: "Kaina ir atsiskaitymas", tipas: "variantai", privalomas: true, variantai: KAINODARA,
      klausimas: "Koks sutarties kainos apskaičiavimo būdas (5.1 punktas)?",
      uzuomina: "Šablono kainodaros sąrašas. Nuo jo priklauso pradinės sutarties vertės apibrėžimas (5.2), apmokėjimas (5.5.2), užsakymų tvarka ir termino pradžia." },
    { id: "kiekis", grupe: "Kaina ir atsiskaitymas", tipas: "taipne", privalomas: true, rodoma: function (c, R) { return ikainiai(R); },
      klausimas: "Ar Pirkėjas įsipareigoja nupirkti visą (maksimalų) kiekį (5.2 punktas)?",
      uzuomina: "„Taip“ - pradinė sutarties vertė lygi pasiūlymo kainai už maksimalų kiekį; „Ne“ - maksimaliai pirkimui skirtai lėšų sumai, Pirkėjas neįsipareigoja išpirkti viso kiekio." },
    { id: "uzsakymai", grupe: "Kaina ir atsiskaitymas", tipas: "taipne", privalomas: true, rodoma: prekes,
      klausimas: "Ar prekės tiekiamos užsakymais (4.3 punktas - užsakymų teikimo tvarka)?",
      uzuomina: "„Taip“ - šablono tvarka (užsakymai el. užsakymų sistemoje ar el. paštu); „Ne“ - „Netaikoma“.",
      siuloma: function (c, R) { return R.kainodara === "fiksuota_kaina" ? { reiksme: "ne", kilme: "kainodara - fiksuota kaina" }
                                   : ikainiai(R) ? { reiksme: "taip", kilme: "kainodara - įkainiai" } : null; } },
    { id: "nenumatytos", grupe: "Kaina ir atsiskaitymas", tipas: "taipne", privalomas: true,
      klausimas: "Ar numatoma galimybė įsigyti sutartyje nenurodytų, bet su pirkimo objektu susijusių prekių ar paslaugų (5.4 punktas)?",
      uzuomina: "Šablono 5.4.1 punktas: iki 10 (dešimt) proc. Pradinės sutarties vertės. „Ne“ - punktas netaikomas, 5.4.1-5.4.2 papunkčiai pašalinami." },
    { id: "apmokejimas", grupe: "Kaina ir atsiskaitymas", tipas: "variantai", privalomas: true,
      klausimas: "Kokios apmokėjimo sąlygos (5.5.2 punktas)?",
      variantai: [{ id: "visa", tekstas: "Įvykdžius visus sutartinius įsipareigojimus - visa Sutarties kaina", re: /^įvykdžius visus/ },
                  { id: "uzsakymas", tekstas: "Įvykdžius užsakymą - už konkretų kiekį pagal įkainius", re: /^įvykdžius užsakymą/ },
                  { id: "menuo", tekstas: "Ne dažniau kaip vieną kartą per kalendorinį mėnesį", re: /^mokama ne dažniau/ }],
      siuloma: function (c, R) { return R.kainodara === "fiksuota_kaina" ? { reiksme: "visa", kilme: "kainodara - fiksuota kaina" }
                                   : ikainiai(R) ? { reiksme: "uzsakymas", kilme: "kainodara - įkainiai (užsakymais)" } : null; } },
    { id: "avansas", grupe: "Kaina ir atsiskaitymas", tipas: "variantai", privalomas: true,
      klausimas: "Ar mokamas avansas (5.6-5.7 punktai)?",
      variantai: [{ id: "ne", tekstas: "Ne - „Punktas netaikomas“" }, { id: "taip", tekstas: "Taip - avanso sąlygas įrašysiu Word programoje" }],
      siuloma: function () { return { reiksme: "ne", kilme: LITGRID + " (2026-10-07)" }; } },

    { id: "garantine", grupe: "Kokybė ir garantija", tipas: "variantai", privalomas: true, rodoma: prekes,
      klausimas: "Kokia garantinės priežiūros sąlyga (6.2 punktas)?",
      variantai: [{ id: "ts", tekstas: "Trūkumai šalinami per techninėje specifikacijoje nurodytą terminą, jei nenurodytas - ne ilgiau kaip per 10 dienų", re: /^Tiekėjas privalo pašalinti trūkumus/ },
                  { id: "atvykti", tekstas: "Tiekėjas atvyksta per nurodytą dienų skaičių nuo pranešimo", re: /^Garantinio termino laikotarpiu/ }],
      laukai: [{ id: "atvykti_d", tipas: "skaicius", uzrasas: "Per kiek dienų atvyksta", kada: "atvykti" }],
      siuloma: function () { return { reiksme: "ts", kilme: LITGRID + " (2026-10-07)" }; } },
    { id: "garantija", grupe: "Kokybė ir garantija", tipas: "taipne", privalomas: true, rodoma: paslaugos,
      klausimas: "Ar paslaugoms taikomas garantinis terminas (6.1-6.2 punktai)?",
      uzuomina: "„Ne“ - abiem punktams „Netaikoma“. „Taip“ - lieka šablono 6.1 nuostata (garantinio termino rūšį ir trukmę pasirinksite Word programoje) ir 6.2 terminas trūkumams pašalinti.",
      laukai: [{ id: "salinimo_terminas", tipas: "tekstas", uzrasas: "Terminas trūkumams pašalinti (pvz. 10 (dešimt) dienų)", kada: "taip" }],
      pastaba: terminoPastaba("salinimo_terminas") },
    { id: "kokybiniai", grupe: "Kokybė ir garantija", tipas: "taipne", privalomas: true,
      klausimas: "Ar nustatyti kokybiniai kriterijai, kurių įgyvendinimą reikia tikrinti sutarties vykdymo metu (6.3 punktas)?",
      uzuomina: "„Ne“ - „Netaikoma“ (kai kokybiniai kriterijai pirkimo dokumentuose nenustatyti). „Taip“ - įrašykite jų įgyvendinimo ir tikrinimo tvarką.",
      laukai: [{ id: "kokybiniai_f", tipas: "formuluote", uzrasas: "Kokybinių kriterijų įgyvendinimo ir tikrinimo tvarka", kada: "taip" }, en("kokybiniai_fEN", "Tvarka angliškai")],
      siuloma: function (c) { return c.kriterijus === "kaina" ? { reiksme: "ne", kilme: "vertinimo kriterijus - kaina ar sąnaudos (SPS 8.1)" } : null; } },

    { id: "uztikrinimas", grupe: "Užtikrinimas ir atsakomybė", tipas: "taipne", privalomas: true,
      klausimas: "Ar reikalaujama sutarties įvykdymo užtikrinimo (banko garantijos ar laidavimo draudimo; 8.1-8.3 punktai)?",
      uzuomina: "„Ne“ - užtikrinama tik netesybomis, 8.2 ir 8.3 punktai netaikomi. „Taip“ - 8.2: užtikrinimo galiojimo terminas ne trumpesnis nei sutarties galiojimo terminas (jūsų sprendimas 2026-10-08), 8.3: dydis procentais.",
      laukai: [{ id: "procentai", tipas: "skaicius", uzrasas: "Užtikrinimo dydis, procentais nuo Pradinės sutarties vertės be PVM", kada: "taip", siuloma: true }],
      siuloma: function (c) { return c.uztikrinimas && c.uztikrinimas.taikomas != null ? { reiksme: c.uztikrinimas.taikomas ? "taip" : "ne", kilme: "SPS sutarties įvykdymo užtikrinimas" } : null; } },
    { id: "delspinigiai", grupe: "Užtikrinimas ir atsakomybė", tipas: "variantai", privalomas: true,
      klausimas: "Delspinigių dydis (9.2.1-9.2.2 punktai)",
      variantai: [{ id: "sablono", tekstas: "Šablono 0,02 proc. (nurodymas „(arba nurodyti kitą skaičių)“ pašalinamas)" }, { id: "kitas", tekstas: "Kitas - pakeisiu Word programoje" }],
      siuloma: function () { return { reiksme: "sablono", kilme: LITGRID }; } },
    { id: "bauda_nutraukus", grupe: "Užtikrinimas ir atsakomybė", tipas: "variantai", privalomas: true,
      klausimas: "Bauda nutraukus sutartį dėl Tiekėjo kaltės (9.3 punktas)",
      variantai: [{ id: "litgrid", tekstas: "LITGRID: 5 proc. Pradinės sutarties vertės, ne mažiau kaip 3000 Eur" }, { id: "kita", tekstas: "Kitas šablono (VPT) variantas - pildysiu Word programoje" }],
      siuloma: function () { return { reiksme: "litgrid", kilme: LITGRID + " (plano 5.6, 2026-10-07)" }; } },
    { id: "velavimas", grupe: "Užtikrinimas ir atsakomybė", tipas: "tekstas", privalomas: false, rodoma: paslaugos,
      klausimas: "Po kiek laiko vėlavimo sutartį galima nutraukti (12.2.4 punktas)?",
      uzuomina: "Pvz. „30 (trisdešimt) dienų“. Šablonas: ši aplinkybė taikoma, tik jei terminas įrašytas; neįrašius vieta lieka.",
      pastaba: terminoPastaba("velavimas") },

    { id: "esmines", grupe: "Esminės sąlygos, galiojimas, pratęsimas", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutartyje nustatomos esminės sutarties sąlygos (10.1-10.2 punktai)?",
      uzuomina: "„Ne“ - abiem punktams „Netaikoma“. „Taip“ - įrašykite esmines sąlygas ir atvejus, kai jos laikomos vykdomomis su dideliais ar nuolatiniais trūkumais (atsižvelgiant į sutarties objektą, specifiką, pobūdį ir Pirkėjo poreikius - šablono nurodymas).",
      laukai: [{ id: "esmines_1", tipas: "formuluote", uzrasas: "10.1. Esminės sutarties sąlygos", kada: "taip" }, en("esmines_1EN", "10.1 angliškai"),
               { id: "esmines_2", tipas: "formuluote", uzrasas: "10.2. Dideli arba nuolatiniai esminės sąlygos vykdymo trūkumai", kada: "taip" }, en("esmines_2EN", "10.2 angliškai")] },
    { id: "isigaliojimas", grupe: "Esminės sąlygos, galiojimas, pratęsimas", tipas: "variantai", privalomas: true,
      klausimas: "Kada sutartis laikoma sudaryta ir įsigalioja (11.1.1 punktas)?",
      variantai: [{ id: "pasirasymo", tekstas: "Nuo pasirašymo dienos", re: /įsigalioja nuo Sutarties pasirašymo/ },
                  { id: "uztikrinimas", tekstas: "Pasirašius ir pateikus sutarties įvykdymo užtikrinimą", re: /pateikiamas sutarties įvykdymo užtikrinimas/ },
                  { id: "es", tekstas: "Pasirašius ir įsigaliojus ES fondų projekto finansavimo sutarčiai", re: /Europos Sąjungos fondų/ },
                  { id: "valdyba", tekstas: "Jei pritaria Pirkėjo valdyba ir (ar) visuotinis akcininkų susirinkimas", re: /pritaria Pirkėjo valdyba/, tik: prekes }],
      siuloma: function (c, R) {
        var u = R.uztikrinimas === "taip", e = R.es === "taip";
        if (u && e) return null;
        return u ? { reiksme: "uztikrinimas", kilme: "reikalaujamas sutarties įvykdymo užtikrinimas" } : e ? { reiksme: "es", kilme: "finansuojama ES lėšomis" }
             : (R.uztikrinimas === "ne" && R.es === "ne") ? { reiksme: "pasirasymo", kilme: "nėra užtikrinimo ir ES finansavimo" } : null; } },
    { id: "galiojimas", grupe: "Esminės sąlygos, galiojimas, pratęsimas", tipas: "variantai", privalomas: true,
      klausimas: "Ilgiausias tiekimo ar teikimo terminas (11.1.2 punktas)",
      variantai: [{ id: "6", tekstas: "6 (šeši) mėnesiai", re: /^6 \(/ }, { id: "12", tekstas: "12 (dvylika) mėnesių", re: /^12 \(/ },
                  { id: "24", tekstas: "24 (dvidešimt keturi) mėnesiai", re: /^24 \(/ }, { id: "36", tekstas: "36 (trisdešimt šeši) mėnesiai", re: /^36 \(/ },
                  { id: "iki", tekstas: "Iki nurodytos datos ar termino", re: /^iki / }],
      laukai: [{ id: "iki_tekstas", tipas: "tekstas", uzrasas: "Iki (pvz. 2028-12-31)", kada: "iki" }],
      siuloma: function (c, R) { var n = skaicius(R.trukme); return n && [6, 12, 24, 36].indexOf(n) >= 0 ? { reiksme: String(n), kilme: "sutarties trukmė" } : null; } },
    { id: "pratesimas", grupe: "Esminės sąlygos, galiojimas, pratęsimas", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutarties galiojimo terminą galima pratęsti (11.2 punktas)?",
      uzuomina: "„Ne“ - „Netaikoma“. „Taip“ - lieka VPT nuostata su pasirenkamomis sąlygomis ir šablono nurodymais; jas sutvarkykite Word programoje (patikra jas išvardys)." },

    { id: "zalieji", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutarties vykdymui nustatomi žaliųjų pirkimų tvarkos aprašo aplinkos apsaugos kriterijai (13.1 punktas)?",
      uzuomina: "„Taip“ - įrašykite Aplinkos apsaugos kriterijų taikymo, vykdant žaliuosius pirkimus, tvarkos aprašo papunktį (šablono vieta).",
      laukai: [{ id: "zalieji_p", tipas: "tekstas", uzrasas: "Tvarkos aprašo papunktis (pvz. 4.1)", kada: "taip" }],
      pastaba: function (c) { var z = c.zaliejiSPS; return z ? "SPS žaliųjų reikalavimų dalyje pasirinkta: " + z.map(function (k) { return "„" + ZAL_SPS[k] + "“"; }).join(", ") + "." : ""; } },
    { id: "pakavimas", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true, rodoma: prekes,
      klausimas: "Ar taikomas LITGRID kriterijus dėl prekių pakuočių (13.2 punktas - pakavimo lapas)?" },
    { id: "pristatymas", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true, rodoma: prekes,
      klausimas: "Ar taikomi LITGRID kriterijai dėl prekių pristatymo (13.3 punktas - pristatymo laikas, netaršios transporto priemonės)?" },
    { id: "montavimas", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true, rodoma: prekes,
      klausimas: "Ar taikomas LITGRID kriterijus dėl su prekėmis susijusių paslaugų (13.4 punktas - atliekų rūšiavimas montuojant)?" },
    { id: "socialiniai", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutarties vykdymui nustatomi socialiniai kriterijai?",
      uzuomina: "„Taip“ - įrašykite kriterijus (šablono rekomendacija - Socialiai atsakingų pirkimų gairių pavyzdžiai).",
      laukai: [{ id: "socialiniai_f", tipas: "formuluote", uzrasas: "Socialiniai kriterijai", kada: "taip" }, en("socialiniai_fEN", "Kriterijai angliškai")] },
    { id: "tinklo", grupe: "Kita", tipas: "taipne", privalomas: true,
      klausimas: "Ar tiekėjas dirbs veikiančiuose elektros perdavimo tinklo objektuose ar jų apsaugos zonoje (14.4 punktas)?",
      uzuomina: "„Taip“ - reikalingas Pirkėjo sutikimas dirbti (14.4.1-14.4.4) ir 9.10 bauda; „Ne“ - punktas ir bauda netaikomi." },
    { id: "pirkejo_atstovas", grupe: "Kita", tipas: "tekstas", privalomas: false,
      klausimas: "Kas bus Pirkėjo atstovas sutarčiai vykdyti (2.1 punktas)?",
      uzuomina: "Padalinys, pareigos, vardas, pavardė, tel., el. paštas. Neįrašius - lieka šablono nurodymas, pildoma sudarant.",
      // LT/EN: anglų stulpeliui - pareigos ir padalinys angliškai (rodoma, kai įrašytas lietuviškai)
      laukai: [{ id: "pirkejo_atstovasEN", tipas: "tekstas", uzrasas: "Tas pats angliškai (padalinys, pareigos)", kada: "*", tikLTEN: true }] },
    { id: "cvp_adresas", grupe: "Kita", tipas: "tekstas", privalomas: false, rodoma: paslaugos,
      klausimas: "Kokiu adresu skelbiami pirkimo dokumentai (15.2 punktas)?",
      uzuomina: "CVP IS pirkimo adresas. Neįrašius - lieka šablono teksto laukas." }
  ];

  /* ---------------------------------------------------------------- projektavimo ir statybos rangos SS (2026-10-10, 3 etapas S4)
     Šablone - „//“ nurodymai, „arba“ ir „Turi būti pasirinkta:“ (žemėlapio blokai): klausimai - po vieną kiekvienam nurodymui ar
     pasirinkimui, SS punktų tvarka. Kur šablonas nenurodo, ką rašyti, kai punktas netaikomas, - „Punktas netaikomas.“ (NETAIKOMAS). */
  var PSR = function (c) { return c.seima === "PROJEKTAVIMO_STATYBOS"; };
  /* Kai šablonas nenurodo, ką rašyti punktui netaikant (SS 4, 6, 8, 9, 18), - ta pati formuluotė kaip paslaugų SS 13.1-13.2
     (naudotojo sprendimai 2026-10-08 ir 2026-10-10); 1-19 punktai lieka visi, todėl jų numeriai visose sutartyse tie patys. */
  var NETAIKOMAS = "Punktas netaikomas.";
  var maza = function (s) { return String(s || "").toLowerCase(); };
  var RIBA = "(^|[^a-ząčęėįšųūž0-9])";
  var TP = new RegExp(RIBA + "(tp|transformatorių pastot|pastot|skirstykl)", "i");
  function darbuMen(R){ var n = skaicius(R.darbu_terminas); if (!n) return null; return (R.darbu_terminas_vnt || "men") === "d" ? n / 30 : n; }
  var KLAUSIMAI_PSR = [
    { id: "objektas", grupe: "Pagrindinės sąlygos", tipas: "formuluote", privalomas: true,
      klausimas: "Koks statinys statomas, rekonstruojamas ar remontuojamas (SS 1 punktas „Objektas“)?",
      uzuomina: "Šablono nurodymas: „nurodomas statomas, rekonstruojamas, arba remontuojamas statinys“. Įrašytas tekstas - ir etapų priedo antraštėje vietoje „[OBJEKTAS]“." },
    { id: "technine", grupe: "Pagrindinės sąlygos", tipas: "formuluote", privalomas: true,
      klausimas: "Kur pateikiama Techninė užduotis ar Projektas (SS 2 punktas)?",
      uzuomina: "Šablono nurodymas: priedas, kuriame pateikiama Techninė užduotis, Projekto pavadinimas, data, statybos leidimas, arba nuoroda į CVP IS.",
      siuloma: function (c, R, Z) { var nr = priedoNr(Z, R, /^Techninė užduotis/); return nr ? { reiksme: "Sutarties specialiųjų sąlygų priedas Nr. " + nr + " „Techninė užduotis / projektavimo užduotis“.",
        kilme: "SS priedų sąrašas (priedas Nr. " + nr + ")" } : null; } },
    { id: "darbu_terminas", grupe: "Pagrindinės sąlygos", tipas: "skaicius", privalomas: true,
      klausimas: "Koks Darbų atlikimo terminas nuo Sutarties sudarymo dienos (SS 3 punktas)?",
      uzuomina: "Skaičius; vieneto forma parenkama pagal skaičių (pvz. „18 mėnesių nuo Sutarties sudarymo dienos“, „1 mėnuo“).",
      vienetai: function () { return [{ id: "men", tekstas: "mėnesiai" }, { id: "d", tekstas: "dienos" }]; } },
    { id: "pratesimas", grupe: "Pagrindinės sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar Darbų atlikimo terminas gali būti pratęstas (SS 3 punkto antras sakinys)?",
      uzuomina: "BS 2.2.2: pratęsimo galimybė nurodoma specialiosiose sąlygose. „Taip“ - įrašykite, kokiam terminui ir dėl kokių aplinkybių (sakinys „Darbų atlikimo terminas Šalių raštišku susitarimu gali būti pratęstas ... dėl ... Sutartyje nurodytomis sąlygomis ir tvarka.“). „Ne“ - šis sakinys pašalinamas.",
      laukai: [{ id: "pratesimo_terminas", tipas: "tekstas", uzrasas: "Kokiam terminui (pvz. ne ilgiau kaip 3 mėnesiams)", kada: "taip" },
               { id: "pratesimo_aplinkybes", tipas: "tekstas", uzrasas: "Dėl kokių aplinkybių (kilmininku, pvz. Užsakovo vėluojamų suteikti atjungimų)", kada: "taip" }] },
    { id: "etapai", grupe: "Pagrindinės sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar Darbai atliekami etapais (SS 4 punktas ir priedas „Projektavimo ir statybos darbų etapai“)?",
      uzuomina: "„Taip“ - 4 punktas lieka su priedo numeriu; etapų lentelę (perduodami darbai, perdavimo terminai, delspinigiai, mokėtinos sumos) užpildysite Word programoje pagal priedo „Pildymo sąlygas“. „Ne“ - 4 punkte įrašoma „Punktas netaikomas.“ (BS 2.2.3 - etapai taikomi, kai jie nurodyti Sutartyje), o etapų priedas ir jo eilutė priedų sąraše pašalinami, kiti priedai pernumeruojami." },

    { id: "pagrindiniai", grupe: "Darbai", tipas: "formuluote", privalomas: true,
      klausimas: "Kokie Pagrindiniai įrenginiai (SS 5 punktas)?",
      uzuomina: "Pagrindinių įrenginių sąrašas arba priedas, kuriame jis pateikiamas (šablono nurodymas: sąrašą parengia Technikos skyrius)." },
    { id: "uzsakovo_irenginiai", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar Užsakovas Darbams pateikia Įrenginius ir Medžiagas (SS 6 punktas, BS 4.9.8)?",
      uzuomina: "BS 4.9.8 taikomas, kai Sutartyje nurodyta, kad Įrenginius ir (arba) Medžiagas pateikia Užsakovas. „Taip“ - įrašykite, kokius ir kur jie perduodami; „Ne“ - 6 punkte įrašoma „Punktas netaikomas.“",
      laukai: [{ id: "uzsakovo_irenginiai_f", tipas: "formuluote", uzrasas: "Įrenginiai ir medžiagos arba priedas, kuriame jie nurodyti", kada: "taip" },
               { id: "uzsakovo_irenginiu_vieta", tipas: "tekstas", uzrasas: "Kur Užsakovas juos perduos (vieta, adresas)", kada: "taip" }] },
    { id: "fizine_sauga", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar Darbams taikomi papildomi fizinės saugos reikalavimai (SS 7 punktas)?",
      uzuomina: "„Ne“ - įrašoma „Papildomi fizinės saugos reikalavimai Darbams netaikomi.“ (šablono nurodymas). „Taip“ - įrašykite reikalavimus (šablonas: juos parengia Fizinės saugos skyrius).",
      laukai: [{ id: "fizine_sauga_f", tipas: "formuluote", uzrasas: "Papildomi fizinės saugos reikalavimai", kada: "taip" }] },
    { id: "demontuoti", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar Rangovas turės pristatyti demontuotus tolimesniam naudojimui tinkamus įrenginius, konstrukcijas ir medžiagas (SS 8 punktas, BS 4.6.2)?",
      uzuomina: "„Taip“ - įrašykite adresą, kur juos pristatyti; „Ne“ - 8 punkte įrašoma „Punktas netaikomas.“",
      laukai: [{ id: "demontuoti_adresas", tipas: "tekstas", uzrasas: "Pristatymo adresas", kada: "taip" }] },
    { id: "dalinis", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar už nesumontuotus Įrenginius ir jiems įrengti būtinas Medžiagas mokama iš dalies (SS 9 punktas, BS 5.9.5 c ir d papunkčiai)?",
      uzuomina: "Šablono nurodymas: už SS nurodytus nesumontuotus Įrenginius ir Medžiagas, įtrauktus į Atliktų darbų aktą pagal Darbų žiniaraštį, apmokama 70 % jų kainos. „Taip“ - įrašykite jų sąrašą arba priedą (su būtinais dokumentais ir apmokėjimo dydžiu procentais). „Ne“ - įrašoma „Punktas netaikomas.“ (BS 5.9.5 c taikomas tik specialiosiose sąlygose nurodytiems Įrenginiams).",
      laukai: [{ id: "dalinis_f", tipas: "formuluote", uzrasas: "Įrenginių ir Medžiagų sąrašas arba priedas", kada: "taip" }] },

    { id: "uzsakovo_atstovas", grupe: "Darbų organizavimas", tipas: "tekstas", privalomas: false,
      klausimas: "Kas bus Užsakovo atstovas (SS 10 punktas)?",
      uzuomina: "Pareigos, vardas, pavardė. Neįrašius - vieta lieka, pildoma sudarant.",
      laukai: [{ id: "uzsakovo_atstovo_kontaktai", tipas: "tekstas", uzrasas: "Telefonas, el. paštas", kada: "*", neprivalomas: true }] },
    { id: "skelbimo_atstovas", grupe: "Darbų organizavimas", tipas: "tekstas", privalomas: false,
      klausimas: "Kas atsakingas už Sutarties ir jos pakeitimų paskelbimą (SS 10 punktas)?",
      uzuomina: "Pareigos, vardas, pavardė. Neįrašius - vieta lieka, pildoma sudarant.",
      laukai: [{ id: "skelbimo_atstovo_kontaktai", tipas: "tekstas", uzrasas: "Telefonas, el. paštas", kada: "*", neprivalomas: true }] },

    { id: "apmokejimas_psr", grupe: "Kaina ir apmokėjimas", tipas: "variantai", privalomas: true,
      klausimas: "Kaip mokama Sutarties kaina (SS 12 punktas)?",
      variantai: [{ id: "ziniarastis", tekstas: "Dalimis pagal Darbų žiniaraštį (šablono rekomendacija naujos statybos, rekonstravimo ar atramų keitimo darbams)" },
                  { id: "etapai", tekstas: "Dalimis pagal atliktus Darbų etapus (šablono rekomendacija remonto darbams; mokėtinos sumos - etapų priede)", tik: function (c, R) { return R.etapai === "taip"; } },
                  { id: "visa", tekstas: "Visa kaina įvykdžius sutartinius įsipareigojimus (šablono rekomendacija, kai darbai trunka iki 4 mėnesių)" }],
      siuloma: function (c, R) {
        var m = darbuMen(R), t = maza(c.pavadinimas);
        if (m != null && m <= 4) return { reiksme: "visa", kilme: "Darbų atlikimo terminas iki 4 mėnesių (šablono rekomendacija)" };
        if (m != null && /rekonstr|statyb|atram/.test(t)) return { reiksme: "ziniarastis", kilme: "pirkimo pavadinime - nauja statyba, rekonstravimas ar atramų keitimas (šablono rekomendacija)" };
        if (m != null && /remont/.test(t) && R.etapai === "taip") return { reiksme: "etapai", kilme: "pirkimo pavadinime - remonto darbai, darbai etapais (šablono rekomendacija)" };
        return null; } },
    { id: "es_psr", grupe: "Kaina ir apmokėjimas", tipas: "taipne", privalomas: true,
      klausimas: "Ar Darbus numatoma finansuoti Europos Sąjungos fondų (programų) lėšomis (SS 14 punktas, BS 11.11)?",
      uzuomina: "Įrašoma šablono nurodymo formuluotė: „Darbus ketinama finansuoti Europos Sąjungos fondų (programų) lėšomis.“ arba „Darbai Europos Sąjungos fondų (programų) lėšomis nefinansuojami.“" },

    { id: "netesybos", grupe: "Atsakomybė", tipas: "variantai", privalomas: true,
      klausimas: "Kokios netesybos už laiku neužbaigtus Darbus (SS 15 punktas)?",
      variantai: [{ id: "vienos", tekstas: "0,04 % Sutarties kainos (be PVM) delspinigiai už kiekvieną pradelstą dieną" },
                  { id: "pakopos", tekstas: "Pakopiniai delspinigiai: iki 30 dienų - 0,01 %, 31-60 - 0,02 %, 61-180 - 0,04 % už dieną, ilgiau nei 180 dienų - 2 % bauda" },
                  { id: "etapai", tekstas: "Pagal etapų priedą (netesybos už laiku neperduotus Darbų etapus)", tik: function (c, R) { return R.etapai === "taip"; } }],
      uzuomina: "Šablono variantai: pirmi du - kai darbai atliekami vienu etapu, trečias - kai etapais (tada užpildoma etapų priedo netesybų dalis).",
      siuloma: function (c, R) { return R.etapai === "taip" ? { reiksme: "etapai", kilme: "Darbai atliekami etapais (šablono nurodymas)" } : null; } },

    { id: "bim", grupe: "Baigiamos nuostatos", tipas: "taipne", privalomas: true,
      klausimas: "Ar Rangovas turi taikyti statinio informacinį modeliavimą (BIM) (SS 17 punktas, BS 2.6)?",
      uzuomina: "„Taip“ - „Rangovas turi pareigą taikyti statinio informacinį modeliavimą (BIM). Užsakovo informacijos reikalavimai pateikiami priede Nr. ...“ (BS 2.6 formuluotė); „Ne“ - „Statinio informacinis modeliavimas (BIM) netaikomas.“ Atsakymas turi sutapti su Technine užduotimi (BS 2.6.1: apie BIM taikymą pažymima specialiosiose sąlygose arba Techninėje užduotyje). Priedą su Užsakovo informacijos reikalavimais įrašykite į priedų sąrašą Word programoje - šablono sąraše jo nėra.",
      laukai: [{ id: "bim_priedas", tipas: "tekstas", uzrasas: "Priedo su Užsakovo informacijos reikalavimais numeris", kada: "taip" }] },
    { id: "investicinis", grupe: "Baigiamos nuostatos", tipas: "taipne", privalomas: true,
      klausimas: "Ar Darbai vykdomi pagal Užsakovo investicinį projektą (SS 18 punktas, BS 11.9.2)?",
      uzuomina: "BS 11.9.2: dokumentuose įrašomas investicinio projekto pavadinimas ir numeris (jei toks numatytas). „Ne“ - įrašoma „Punktas netaikomas.“",
      laukai: [{ id: "investicinis_pav", tipas: "tekstas", uzrasas: "Investicinio projekto pavadinimas", kada: "taip" },
               { id: "investicinis_nr", tipas: "tekstas", uzrasas: "Investicinio projekto numeris", kada: "taip" }] },

    { id: "grafikas", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar Grafiką Rangovas turi pateikti ne per 30 dienų, o per kitą terminą (SS 20 punktas, BS 2.3.1)?",
      uzuomina: "„Taip“ - įrašomas BS 2.3.1 punkto antro sakinio pakeitimas su jūsų terminu (dienomis nuo Sutarties sudarymo); „Ne“ - punktas neįrašomas.",
      laukai: [{ id: "grafiko_dienos", tipas: "skaicius", uzrasas: "Per kiek dienų nuo Sutarties sudarymo", kada: "taip" }] },
    { id: "derinimas", grupe: "Papildomos sąlygos", tipas: "variantai", privalomas: true,
      klausimas: "Kokiam objektui nustatomi gamybos ir montavimo brėžinių bei Pagrindinių įrenginių derinimo terminai (SS 21 punktas)?",
      variantai: [{ id: "tp330", tekstas: "330 kV transformatorių pastotės (TP) projektas: pirminis derinimas - 30 d. d., pakartotinis - 15 d. d." },
                  { id: "tp", tekstas: "Kitos įtampos TP projektas: pirminis derinimas - 20 d. d., pakartotinis - 15 d. d." },
                  { id: "kiti", tekstas: "Kiti atvejai: pirminis derinimas - 15 d. d., pakartotinis - 10 d. d." }],
      uzuomina: "Šablono lentelės „Turi būti pasirinkta:“ variantai. TP projektuose šablono terminai nurodyti pastočių skirstyklų elektros įrenginių (E) daliai ir pirminių įrenginių bei savųjų reikmių daliai - šie žodžiai lieka; nurodymai „(pasirenkama ...)“ pašalinami. TP projekte kitoms dalims lentelė termino nenustato - joms galioja bendrosios sąlygos: gamybos ir montavimo brėžiniams 15 ir 10 darbo dienų (BS 4.1.2), Pagrindiniams įrenginiams 10 ir 5 darbo dienos (BS 4.10.2).",
      siuloma: function (c) {
        var t = maza(c.pavadinimas);
        if (!TP.test(t)) return null;
        return /330\s*kv/.test(t) ? { reiksme: "tp330", kilme: "pirkimo pavadinime - 330 kV ir transformatorių pastotė ar skirstykla" }
             : /\d+\s*kv/.test(t) ? { reiksme: "tp", kilme: "pirkimo pavadinime - transformatorių pastotė ar skirstykla, ne 330 kV" } : null; } },
    { id: "ekspertize", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar Techninio darbo projekto ekspertizės aktą Užsakovo pasamdyti ekspertai pateiks ne per 20 darbo dienų, o per kitą terminą (SS 22 punktas, BS 3.3.10)?",
      uzuomina: "„Taip“ - įrašomas BS 3.3.10 punkto ketvirto sakinio pakeitimas su jūsų terminu; „Ne“ - punktas neįrašomas.",
      laukai: [{ id: "ekspertizes_dienos", tipas: "skaicius", uzrasas: "Per kiek darbo dienų", kada: "taip" }] },
    { id: "atjungimai", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar nustatomi konkretūs ilgiausi atjungimo terminai (SS 23 punktas, BS 4.5.1 papildymas)?",
      uzuomina: "„Taip“ - įrašomas šablono punktas (jungtuvų prijungimui - dvi savaitės; elektros oro linijų remontui ir rekonstrukcijai - viena diena trijų atramų darbams) ir, jei įrašysite, kiti terminai. „Ne“ - punktas neįrašomas.",
      laukai: [{ id: "atjungimai_kiti", tipas: "tekstas", uzrasas: "Kiti atjungimo terminai (neprivaloma; vietoje „[...]“)", kada: "taip", neprivalomas: true }] },
    { id: "uztikrinimas_psr", grupe: "Papildomos sąlygos", tipas: "variantai", privalomas: true,
      klausimas: "Kaip užtikrinamas Sutarties įvykdymas (SS 24 punktas, BS 9.7)?",
      variantai: [{ id: "netaikomas", tekstas: "Užtikrinimas netaikomas - Sutarties įvykdymas užtikrinamas netesybomis (šablonas: nedidelės vertės remonto darbai, derinti su Pirkimų skyriumi)" },
                  { id: "iki", tekstas: "10 % Sutarties kainos (be PVM) - Rangovas renkasi lėšų deponavimą, banko garantiją ar draudimo bendrovės laidavimą (pirkimams iki vidaus taisyklėse nustatytos ribos)" },
                  { id: "virs", tekstas: "10 % Sutarties kainos (be PVM) - lėšų deponavimas arba banko garantija (pirkimams virš vidaus taisyklėse nustatytos ribos)" }],
      siuloma: function (c) { return c.uztikrinimas && c.uztikrinimas.taikomas === false ? { reiksme: "netaikomas", kilme: "SPS: sutarties įvykdymo užtikrinimas nereikalaujamas" } : null; },
      pastaba: function (c) {
        var u = c.uztikrinimas;
        if (!u || u.taikomas !== true) return "";
        var pr = u.eur > 0 && c.verte > 0 ? " (" + u.eur + " Eur, " + skLT(apvalink(u.eur / c.verte * 100)) + " % numatomos vertės)" : "";
        return "SPS: užtikrinimas reikalaujamas" + pr + ". Kuris variantas - pagal vidaus taisyklėse nustatytą ribą (generatorius jos nežino).";
      } },
    { id: "garantinis", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar įrašyti, kad BS 9.9 punktas „Garantinių įsipareigojimų užtikrinimas“ netaikomas (SS 25 punktas)?",
      uzuomina: "Šablono nurodymas: įrašoma, kai atliekami nedidelės vertės remonto darbai (derinti su Pirkimų skyriumi). „Taip“ - punktas įrašomas; „Ne“ - neįrašomas (BS 9.9 taikomas)." },
    { id: "esmines_psr", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutartyje nustatomos esminės sutarties sąlygos (SS 26 punktas)?",
      uzuomina: "Šablono nurodymas: įrašomos Sutarties sąlygos, dėl kurių pažeidimo būtų nutraukta Sutartis. „Taip“ - lieka „Esminėmis yra laikomos šios Sutarties sąlygos:“ ir jūsų sąlygos (kiekviena eilutė - atskira pastraipa); „Ne“ - punktas neįrašomas.",
      laukai: [{ id: "esmines_psr_f", tipas: "formuluote", uzrasas: "Esminės sutarties sąlygos", kada: "taip" }] },
    { id: "sprogmenys", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar prieš pradedant žemės darbus Objekte bus vykdoma nesprogusių karo laikų sprogmenų paieška (SS 27 punktas, BS 4.1.12-4.1.14)?",
      uzuomina: "„Taip“ - įrašomas šablono punktas; „Ne“ - neįrašomas." },
    { id: "koordinatorius", grupe: "Papildomos sąlygos", tipas: "variantai", privalomas: true,
      klausimas: "Ar saugos ir sveikatos koordinatorius skiriamas iš Rangovo deleguotų asmenų (SS 28-29 punktai, BS 5.2.5)?",
      variantai: [{ id: "ne", tekstas: "Ne - punktai neįrašomi" },
                  { id: "p28", tekstas: "Taip - tik 28 punktas (esant BS 5.2.5 punkte numatytoms sąlygoms)" },
                  { id: "abu", tekstas: "Taip - 28 ir 29 punktai (29: kandidatūros pateikimas per 5 dienas ir nepriklausomo veikimo įsipareigojimas)" }],
      uzuomina: "Sąvoka „Koordinatorius“ apibrėžta 28 punkte, o 29 punktas ją vartoja, todėl 29 punktas vienas neįrašomas. Kitas nuostatas („pagal poreikį įrašomos kitos nuostatos“) įrašysite Word programoje." }
  ];
  /* Priedo numeris SS priedų sąraše (Word numeracija) - po šalinamų priedų (etapų priedas, kai darbai etapais neskaidomi) */
  function priedoNr(Z, R, re){
    if (!Z || !Z.priedai) return null;
    var salinami = (Z.skyriai || []).filter(function () { return R.etapai === "ne"; }).map(function (k) { return k.priedas; });
    var c1 = 0, c2 = 0, rastas = null;
    Z.priedai.forEach(function (p) {
      if (salinami.indexOf(p.nr) >= 0) return;
      var nr;
      if (p.nr.indexOf(".") < 0) { c1++; c2 = 0; nr = String(c1); } else { c2++; nr = c1 + "." + c2; }
      if (rastas == null && re.test(p.tekstas)) rastas = nr;
    });
    return rastas;
  }

  /* ---------------------------------------------------------------- efektyvūs atsakymai */
  var rinkinys = function (ctx) { return PSR(ctx || {}) ? KLAUSIMAI_PSR : KLAUSIMAI; };
  function efektyvus(ctx, A, Z){
    var R = {}, kilmes = {}, Q = rinkinys(ctx);
    Q.forEach(function (q) {
      var a = A[q.id], u = A[q.id + "_vnt"];
      if (a && a.reiksme != null && a.reiksme !== "") { R[q.id] = a.reiksme; kilmes[q.id] = "zmogus"; }
      if (u && u.reiksme) R[q.id + "_vnt"] = u.reiksme;
      (q.laukai || []).forEach(function (l) { var b = A[l.id]; if (b && b.reiksme != null && b.reiksme !== "") R[l.id] = b.reiksme; });
    });
    // siūlomos - tvarka svarbi (kainodara -> pradžia ir kt.), todėl kelis kartus
    for (var k = 0; k < 3; k++) Q.forEach(function (q) {
      if (kilmes[q.id] === "zmogus" || !q.siuloma) return;
      var s = q.siuloma(ctx, R, Z);
      if (s) { R[q.id] = s.reiksme; kilmes[q.id] = s; } else if (kilmes[q.id] && kilmes[q.id] !== "zmogus") { delete R[q.id]; delete kilmes[q.id]; }
    });
    // užtikrinimo procentai - iš SPS sumos ir numatomos vertės (naudotojo sprendimas 2026-10-08)
    if (R.uztikrinimas === "taip" && (A.procentai == null || A.procentai.reiksme == null || A.procentai.reiksme === "") && ctx.uztikrinimas && ctx.uztikrinimas.eur > 0 && ctx.verte > 0) {
      R.procentai = skLT(apvalink(ctx.uztikrinimas.eur / ctx.verte * 100));
      kilmes.procentai = { kilme: "SPS užtikrinimo suma " + ctx.uztikrinimas.eur + " Eur / numatoma vertė " + ctx.verte + " Eur" };
    }
    return { R: R, kilmes: kilmes };
  }

  function klausimai(Z, ctx, A){
    A = A || {};
    var E = efektyvus(ctx, A, Z), R = E.R;
    return rinkinys(ctx).filter(function (q) { return !q.rodoma || q.rodoma(ctx, R); }).map(function (q) {
      var k = E.kilmes[q.id], a = A[q.id];
      var busena = R[q.id] == null ? (q.privalomas ? "neuzpildyta" : "neprivaloma") : k === "zmogus" ? "patvirtinta" : "siuloma";
      if (k === "zmogus" && a && a.patvirtinta === false) busena = "siuloma";
      return { id: q.id, grupe: q.grupe, klausimas: q.klausimas, uzuomina: q.uzuomina || "", pastaba: q.pastaba ? q.pastaba(ctx, R) : "", tipas: q.tipas, privalomas: !!q.privalomas,
               variantai: (q.variantai || []).filter(function (v) { return !v.tik || v.tik(ctx, R); }).map(function (v) { return { id: v.id, tekstas: v.tekstas }; }),
               vienetai: q.vienetai ? q.vienetai(ctx) : null,
               laukai: (q.laukai || []).filter(function (l) { return !l.tikLTEN || LTEN(ctx); }).map(function (l) {
                 return { id: l.id, tipas: l.tipas, uzrasas: l.uzrasas, kada: l.kada, neprivalomas: !!l.neprivalomas, reiksme: R[l.id] != null ? R[l.id] : "", siuloma: l.id === "procentai" && E.kilmes.procentai ? E.kilmes.procentai : null }; }),
               reiksme: R[q.id] != null ? R[q.id] : null, vienetas: (A[q.id + "_vnt"] || {}).reiksme || "men",
               siuloma: k && k !== "zmogus" ? k : null, busena: busena };
    });
  }

  /* ---------------------------------------------------------------- SPS ir sutarties derinimas (sutarčių planas 4.4, 2026-10-09)
     Nesutapimas - ne klaida (SPS „ir (ar)“, kriterijai gali būti tik TS), todėl „Patikrinkite“, o ne kliūtis; atsakymai nekeičiami. */
  function derink(ctx, R){
    var z = ctx.zaliejiSPS, out = [];
    if (!z) return out;
    var tsSut = z.indexOf("ts_sutartis") >= 0;
    if (R.zalieji === "taip" && !tsSut)
      out.push("SS 13.1 punktas nustato aplinkos apsaugos kriterijus sutarties vykdymui, o SPS žaliųjų reikalavimų dalyje nepasirinkta, kad " + ZAL_SPS.ts_sutartis +
        " (pasirinkta: " + z.map(function (k) { return "„" + ZAL_SPS[k] + "“"; }).join(", ") + "). Patikrinkite, ar SPS ir sutartis sutampa.");
    if (R.zalieji === "ne" && tsSut)
      out.push("SPS nurodo, kad " + ZAL_SPS.ts_sutartis + ", o SS 13.1 punktas netaikomas. Patikrinkite, ar žalieji reikalavimai nurodyti Techninėje specifikacijoje.");
    return out;
  }

  /* ---------------------------------------------------------------- sprendimai generatoriui */
  function trukstami(rodomi){
    var truksta = [];
    rodomi.forEach(function (q) {
      if (q.privalomas && q.reiksme == null) truksta.push(q.klausimas);
      q.laukai.forEach(function (l) {
        if (l.neprivalomas) return;
        if (q.reiksme === l.kada && (l.tipas === "formuluote" || l.tipas === "tekstas" || l.tipas === "skaicius") && !String(l.reiksme || "").trim() &&
            !/^(pirkejo|cvp|velavimas)/.test(l.id)) truksta.push(q.klausimas + " - " + l.uzrasas);
        if (l.kada === "*" && String(q.reiksme || "").trim() && !String(l.reiksme || "").trim()) truksta.push(q.klausimas + " - " + l.uzrasas);
      });
    });
    return truksta;
  }
  function sprendimai(Z, ctx, A){
    A = A || {};
    if (PSR(ctx)) return sprendimaiPSR(Z, ctx, A);
    var V = global.GP_SUTARCIU_GEN.vietos(Z), R = efektyvus(ctx, A, Z).R, S = {}, perspejimai = [], derinimas = derink(ctx, R);
    var rodomi = klausimai(Z, ctx, A), truksta = trukstami(rodomi);
    var nust = function (x, s) { if (x) S[x.raktas] = s; };
    var pav = String(ctx.pavadinimas || "").trim(), pavEN = String(ctx.pavadinimasEN || "").trim() || pav;
    var rask = function (rusis, v, re) { return vieta(V, rusis, v, re); };
    var taip = function (id) { return R[id] === "taip"; };

    // Laukai iš 1 žingsnio (naudotojo patvirtinimui inventoriuje - „SIŪLOMA“)
    V.filter(function (x) { return x.rusis === "laukas"; }).forEach(function (x) {
      if (/^Sutarties pavadinimas/.test(x.aprasas) && pav) nust(x, { tekstas: pav + " pirkimo-pardavimo sutartis", tekstasEN: "Contract for the purchase of " + pavEN });
      else if (/^3\.2\./.test(x.aprasas) && pav) nust(x, { tekstas: pav + " pirkimas" + (ctx.numeris ? ", pirkimo Nr. " + ctx.numeris : ""),
                                                          tekstasEN: pavEN + " procurement" + (ctx.numeris ? ", procurement No. " + ctx.numeris : "") });
      else nust(x, { palikti: "sudarant" });
    });
    // Nurodymai, kurie skirti pildančiam sudarant
    ["1.2", "2.2", "16"].forEach(function (v) { V.filter(function (x) { return x.rusis === "nurodymas" && x.vieta === v; }).forEach(function (x) { nust(x, { palikti: "sudarant" }); }); });
    V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === "5.2"; }).forEach(function (x) { nust(x, { palikti: "sudarant" }); });
    var atst = rask("nurodymas", "2.1");
    nust(atst, String(R.pirkejo_atstovas || "").trim() ? { tekstas: R.pirkejo_atstovas.trim(), tekstasEN: String(R.pirkejo_atstovasEN || R.pirkejo_atstovas).trim() } : { palikti: "sudarant" });

    // 3.3 ES lėšos
    var v33 = rask("valdiklis", "3.3");
    if (R.es === "ne") nust(v33, { elementas: el(v33, /netaikomas/i) });
    else if (R.es === "taip") nust(v33, { elementas: el(v33, /projekto Nr/), reiksmes: [R.es_nr || "", R.es_pav || ""] });

    // 4.1 pradžia, terminas ir vienetas; paslaugų bendras terminas
    var v41 = V.filter(function (x) { return x.rusis === "valdiklis" && x.vieta === "4.1"; });
    var vPradzia = v41.filter(function (x) { return /įsipareigoja/.test(x.elementai.join("|")); })[0];
    var vVnt = v41.filter(function (x) { return /^mėnes/i.test(x.elementai[0] || "") && !/netaikomas/i.test(x.elementai.join("|")); })[0];
    var vBendras = v41.filter(function (x) { return /netaikomas/i.test(x.elementai.join("|")); })[0];
    var pr = KLAUSIMAI.filter(function (q) { return q.id === "pradzia"; })[0].variantai.filter(function (v) { return v.id === R.pradzia; })[0];
    if (pr) nust(vPradzia, { elementas: el(vPradzia, pr.re) });
    var p41 = V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === "4.1"; });
    var pTerm = p41.filter(function (x) { return x.aprasas === "[...]"; })[0], pBendras = p41.filter(function (x) { return /Bendras/.test(x.aprasas); })[0];
    if (R.pradzia === "ts") { nust(pTerm, { tekstas: "" }); nust(vVnt, { salinti: true }); }
    else if (R.terminas != null && skaicius(R.terminas)) {
      var n = skaicius(R.terminas), vnt = (A.terminas_vnt || {}).reiksme || "men";
      var zod = vnt === "d" ? forma(n, "dieną.", "dienas.", "dienų.") : forma(n, "mėnesį.", "mėnesius.", "mėnesių.");
      var k = el(vVnt, new RegExp("^" + zod.replace(".", "\\.") + "$"));
      if (k < 0) perspejimai.push("4.1 punkto vieneto sąraše nėra formos „" + zod + "“ - pasirinkite kitą terminą arba vienetą.");
      else { nust(pTerm, { tekstas: String(n), tekstasEN: String(n) }); nust(vVnt, { elementas: k }); }
    }
    if (vBendras) {
      var nb = skaicius(R.bendras);
      if (!nb) { nust(pBendras, { tekstas: "" }); nust(vBendras, { elementas: el(vBendras, /netaikomas/i) }); }
      else {
        var zb = forma(nb, "mėnuo.", "mėnesiai.", "mėnesių."), kb = el(vBendras, new RegExp("^" + zb.replace(".", "\\.") + "$"));
        if (kb < 0) perspejimai.push("4.1 punkto bendro termino sąraše nėra formos „" + zb + "“.");
        else { nust(pBendras, { tekstas: String(nb), tekstasEN: String(nb) }); nust(vBendras, { elementas: kb }); }
      }
    }
    var a42 = rask("alternatyva", "4.2");
    if (a42) nust(a42, { variantas: taip("pratesimo_aplinkybes") ? 1 : R.pratesimo_aplinkybes === "ne" ? 0 : null });

    // 5. Kaina
    var kd = KAINODARA.filter(function (x) { return x.id === R.kainodara; })[0];
    var v51 = rask("valdiklis", "5.1");
    if (kd) nust(v51, { elementas: el(v51, kd.re) });
    var v52 = rask("valdiklis", "5.2");
    var re52 = R.kainodara === "fiksuota_kaina" ? /^Fiksuota kaina/ : R.kainodara === "islaidu" ? /^Vykdymo išlaidų/ : R.kainodara === "misri" ? /^Mišri/
      : ikainiai(R) && R.kiekis ? new RegExp("^" + (R.kainodara === "fiksuotas_ikainis" ? "Fiksuotas įkainis" : "Kintamas įkainis") + "\\..*" + (R.kiekis === "taip" ? "Tiekėjo pasiūlymo kainai" : "maksimaliai")) : null;
    if (re52) nust(v52, { elementas: el(v52, re52) });
    var a43 = rask("alternatyva", "4.3");
    if (a43 && R.uzsakymai) nust(a43, { variantas: R.uzsakymai === "taip" ? 1 : 0 });
    var v53 = rask("valdiklis", "5.3.1.2"), tr = skaicius(R.trukme);
    if (tr) nust(v53, { elementas: tr > 6 ? el(v53, /dėl kainų lygio pokyčio:$/) : el(v53, /netaik/i) });
    var v54 = rask("valdiklis", "5.4");
    if (R.nenumatytos) nust(v54, { elementas: R.nenumatytos === "taip" ? el(v54, /^Punktas taikomas/) : el(v54, /netaikomas/i) });
    var ap = KLAUSIMAI.filter(function (q) { return q.id === "apmokejimas"; })[0].variantai.filter(function (v) { return v.id === R.apmokejimas; })[0];
    var v552 = rask("valdiklis", "5.5.2");
    if (ap) nust(v552, { elementas: el(v552, ap.re) });
    // 5.6-5.7 avansas
    ["5.6", "5.7"].forEach(function (v) {
      var x = rask("valdiklis", v) || rask("alternatyva", v);
      if (!x || !R.avansas) return;
      if (R.avansas === "ne") nust(x, x.rusis === "valdiklis" ? { elementas: el(x, /netaikomas/i) } : { variantas: 0 });
      else { nust(x, { palikti: "word" }); V.filter(function (n) { return n.rusis === "nurodymas" && n.vieta === v; }).forEach(function (n) { nust(n, { palikti: "word" }); }); }
    });

    // 6. Kokybė ir garantija
    var v62 = rask("valdiklis", "6.2");
    if (v62 && R.garantine === "ts") nust(v62, { elementas: el(v62, /^Tiekėjas privalo pašalinti/) });
    else if (v62 && R.garantine === "atvykti") nust(v62, { elementas: el(v62, /^Garantinio termino/), reiksmes: [R.atvykti_d || ""] });
    var a61 = rask("alternatyva", "6.1"), a62 = rask("alternatyva", "6.2");
    if (a61 && R.garantija) {
      nust(a61, { variantas: taip("garantija") ? 1 : 0 });
      nust(a62, { variantas: taip("garantija") ? 1 : 0 });
      V.filter(function (x) { return x.rusis === "nurodymas" && x.vieta === "6.1"; }).forEach(function (x) { nust(x, { palikti: "word" }); });
      var n62 = V.filter(function (x) { return x.rusis === "nurodymas" && x.vieta === "6.2"; });
      if (n62[0] && taip("garantija") && String(R.salinimo_terminas || "").trim()) {
        var e62 = LTEN(ctx) ? terminasEN(R.salinimo_terminas) : R.salinimo_terminas.trim();
        if (e62) nust(n62[0], { tekstas: R.salinimo_terminas.trim(), tekstasEN: e62 });
        else truksta.push("Ar paslaugoms taikomas garantinis terminas (6.1-6.2 punktai)? - terminą įrašykite skaičiumi ir žodžiais, pvz. „10 (dešimt) dienų“ (anglų stulpeliui)");
      }
      if (n62[1]) nust(n62[1], "salinti");
    }
    var a63 = rask("alternatyva", "6.3"), n63 = rask("nurodymas", "6.3");
    if (R.kokybiniai === "ne") nust(a63, { variantas: 0 });
    else if (R.kokybiniai === "taip") { nust(a63, { variantas: 1 }); if (String(R.kokybiniai_f || "").trim()) nust(n63, { tekstas: R.kokybiniai_f.trim(), tekstasEN: String(R.kokybiniai_fEN || R.kokybiniai_f).trim() }); }
    nust(rask("valdiklis", "7.1"), { palikti: "sudarant" });

    // 8. Užtikrinimas
    var v81 = rask("valdiklis", "8.1"), v83 = rask("valdiklis", "8.3"), a82 = rask("alternatyva", "8.2"), p831 = rask("pildoma", "8.3.1");
    if (R.uztikrinimas === "ne") { nust(v81, { elementas: el(v81, /^netesybos\.$/) }); nust(v83, { elementas: el(v83, /netaikomas/i) }); nust(a82, { variantas: 0 }); nust(p831, { tekstas: "" }); }
    else if (R.uztikrinimas === "taip") {
      nust(v81, { elementas: el(v81, /garantija/) }); nust(v83, { elementas: el(v83, /^Punktas taikomas/) });
      nust(a82, { variantas: vr(a82, /ne trumpesnis nei Sutarties galiojimo terminas/) });
      if (String(R.procentai || "").trim()) nust(p831, { tekstas: String(R.procentai).trim(), tekstasEN: String(R.procentai).trim().replace(",", ".") });
    }
    // 9. Atsakomybė
    if (R.delspinigiai === "sablono") V.filter(function (x) { return x.rusis === "nurodymas" && /^9\.2\./.test(x.vieta); }).forEach(function (x) { nust(x, "salinti"); });
    else if (R.delspinigiai === "kitas") V.filter(function (x) { return x.rusis === "nurodymas" && /^9\.2\./.test(x.vieta); }).forEach(function (x) { nust(x, { palikti: "word" }); });
    var a93 = rask("alternatyva", "9.3");
    if (a93 && R.bauda_nutraukus === "litgrid") nust(a93, { variantas: vr(a93, /^Jei Sutartis nutraukiama dėl Tiekėjo kaltės/) });
    else if (a93 && R.bauda_nutraukus === "kita") nust(a93, { palikti: "word" });
    var v97 = rask("valdiklis", "9.7");
    nust(v97, ctx.kriterijus === "kaina" ? { elementas: el(v97, /netaikomas/i) } : { palikti: "sudarant" });
    var v99 = rask("valdiklis", "9.9");
    nust(v99, { elementas: el(v99, /^Netaikoma/) });
    var v910 = rask("valdiklis", "9.10");
    if (R.tinklo) nust(v910, { elementas: R.tinklo === "taip" ? el(v910, /^100/) : el(v910, /netaikomas/i) });
    var p1224 = rask("pildoma", "12.2.4");
    var e1224 = String(R.velavimas || "").trim() ? (LTEN(ctx) ? terminasEN(R.velavimas) : R.velavimas.trim()) : null;
    if (p1224 && String(R.velavimas || "").trim() && !e1224) truksta.push("Po kiek laiko vėlavimo sutartį galima nutraukti (12.2.4 punktas)? - terminą įrašykite skaičiumi ir žodžiais, pvz. „30 (trisdešimt) dienų“ (anglų stulpeliui)");
    if (p1224) nust(p1224, e1224 ? { tekstas: R.velavimas.trim(), tekstasEN: e1224 } : { palikti: "neatsakyta" });

    // 10. Esminės sąlygos (naudotojo sprendimas 2026-10-08: klausiama kiekvieną kartą)
    var a101 = rask("alternatyva", "10.1"), a102 = rask("alternatyva", "10.2");
    if (R.esmines === "ne") { nust(a101, { variantas: 0 }); nust(a102, { variantas: 0 }); }
    else if (R.esmines === "taip") {
      nust(a101, { variantas: 1 }); nust(a102, { variantas: 1 });
      if (String(R.esmines_1 || "").trim()) nust(rask("nurodymas", "10.1"), { tekstas: R.esmines_1.trim(), tekstasEN: String(R.esmines_1EN || R.esmines_1).trim() });
      if (String(R.esmines_2 || "").trim()) nust(rask("nurodymas", "10.2"), { tekstas: R.esmines_2.trim(), tekstasEN: String(R.esmines_2EN || R.esmines_2).trim() });
    }
    var t10 = rask("taikymo", "10");
    if (t10) nust(t10, "salinti");

    // 11. Galiojimas
    var is = KLAUSIMAI.filter(function (q) { return q.id === "isigaliojimas"; })[0].variantai.filter(function (v) { return v.id === R.isigaliojimas; })[0];
    var v111 = rask("valdiklis", "11.1.1");
    if (is) nust(v111, { elementas: el(v111, is.re) });
    var ga = KLAUSIMAI.filter(function (q) { return q.id === "galiojimas"; })[0].variantai.filter(function (v) { return v.id === R.galiojimas; })[0];
    var v112 = rask("valdiklis", "11.1.2");
    if (ga) nust(v112, { elementas: el(v112, ga.re), reiksmes: [R.iki_tekstas || ""] });
    var a112 = rask("alternatyva", "11.2");
    if (R.pratesimas === "ne") nust(a112, { variantas: 0 });
    else if (R.pratesimas === "taip") { nust(a112, { variantas: 1 }); V.filter(function (x) { return x.rusis === "nurodymas" && x.vieta === "11.2"; }).forEach(function (x) { nust(x, { palikti: "word" }); }); }

    // 13. Aplinkos ir socialiniai kriterijai
    nust(rask("taikymo", "13"), "salinti");
    var a131 = rask("alternatyva", "13.1"), s131 = rask("salyga", "13.1"), p131 = rask("pildoma", "13.1");
    if (R.zalieji === "ne") { nust(a131, { variantas: 0 }); nust(s131, { taikoma: false, tekstas: "Punktas netaikomas.", tekstasEN: "The clause does not apply." }); }
    else if (R.zalieji === "taip") { nust(a131, { variantas: 1 }); nust(s131, { taikoma: true }); if (String(R.zalieji_p || "").trim()) nust(p131, { tekstas: R.zalieji_p.trim(), tekstasEN: R.zalieji_p.trim() }); }
    [["pakavimas", "13.2"], ["pristatymas", "13.3"], ["montavimas", "13.4"]].forEach(function (p) {
      var a = prekes(ctx) && rask("alternatyva", p[1]);
      if (a && R[p[0]]) nust(a, { variantas: R[p[0]] === "taip" ? 1 : 0 });
    });
    var aSoc = prekes(ctx) ? rask("alternatyva", "13.5") : null, sSoc = paslaugos(ctx) ? rask("salyga", "13.2") : null;
    var nSoc = rask("nurodymas", prekes(ctx) ? "13.5" : "13.2");
    if (R.socialiniai === "ne") { nust(aSoc, { variantas: 0 }); nust(sSoc, { taikoma: false, tekstas: "Punktas netaikomas.", tekstasEN: "The clause does not apply." }); }
    else if (R.socialiniai === "taip") {
      nust(aSoc, { variantas: 1 }); nust(sSoc, { taikoma: true });
      if (String(R.socialiniai_f || "").trim()) nust(nSoc, { tekstas: R.socialiniai_f.trim(), tekstasEN: String(R.socialiniai_fEN || R.socialiniai_f).trim() });
    }
    // 14. Nacionalinis saugumas (1 žingsnis), tinklo objektai
    var v143 = rask("valdiklis", "14.3");
    nust(v143, { elementas: ctx.nacsaug ? el(v143, /^Punktas taikomas/) : el(v143, /netaikomas/i) });
    var v144 = rask("valdiklis", "14.4");
    if (R.tinklo) nust(v144, { elementas: R.tinklo === "taip" ? el(v144, /^Punktas taikomas/) : el(v144, /netaik/i) });
    // 15.2 pirkimo dokumentų adresas (paslaugos)
    var v152 = rask("valdiklis", "15.2");
    if (v152) nust(v152, String(R.cvp_adresas || "").trim() ? { tekstas: R.cvp_adresas.trim(), tekstasEN: R.cvp_adresas.trim() } : { palikti: "neatsakyta" });
    // 15.4-15.5 papildomi priedai (prekės) - lieka tušti
    V.filter(function (x) { return x.rusis === "laukas" && /^15\.[45]\./.test(x.aprasas); }).forEach(function (x) { nust(x, { palikti: "sudarant" }); });

    Object.keys(S).forEach(function (k) { var s = S[k]; if (s && typeof s === "object" && ((s.elementas != null && s.elementas < 0) || (s.variantas != null && s.variantas < 0)))
      { perspejimai.push("Šablone nerasta vieta sprendimui " + k + " - patikrinkite šablono redakciją."); delete S[k]; } });
    return { S: S, truksta: truksta, perspejimai: perspejimai, derinimas: derinimas, R: R };
  }

  /* ---------------------------------------------------------------- rangos SS sprendimai generatoriui (2026-10-10) */
  function derinkPSR(ctx, R){
    var out = [], u = ctx.uztikrinimas, z = R.uztikrinimas_psr;
    if (!u || u.taikomas == null || !z) return out;
    if (u.taikomas === false && z !== "netaikomas")
      out.push("SPS sutarties įvykdymo užtikrinimo nereikalauja, o SS 24 punkte pasirinktas 10 % užtikrinimas. Patikrinkite, ar SPS ir sutartis sutampa.");
    if (u.taikomas === true && z === "netaikomas")
      out.push("SPS reikalauja sutarties įvykdymo užtikrinimo, o SS 24 punkte pasirinkta, kad jis netaikomas. Patikrinkite, ar SPS ir sutartis sutampa.");
    if (u.taikomas === true && z !== "netaikomas" && u.eur > 0 && ctx.verte > 0){
      var pr = apvalink(u.eur / ctx.verte * 100);
      if (Math.abs(pr - 10) > 0.01) out.push("SS 24 punkte užtikrinimo suma - 10 proc. nuo Sutarties kainos (be PVM), o SPS užtikrinimas - " + u.eur + " Eur, t. y. " + skLT(pr) +
        " % numatomos vertės. Patikrinkite, ar SPS ir sutartis sutampa.");
    }
    return out;
  }
  function sprendimaiPSR(Z, ctx, A){
    var V = global.GP_SUTARCIU_GEN.vietos(Z), R = efektyvus(ctx, A, Z).R, S = {}, perspejimai = [], derinimas = derinkPSR(ctx, R);
    var truksta = trukstami(klausimai(Z, ctx, A));
    var nust = function (x, s) { if (x) S[x.raktas] = s; };
    var t = function (id) { return String(R[id] == null ? "" : R[id]).trim(); };
    var nur = function (id) { return V.filter(function (x) { return x.rusis === "nurodymas" && x.id === id; })[0] || null; };
    var pild = function (v, re, n) { return V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === v && (!re || re.test(x.tekstas || "")); })[n || 0] || null; };
    var alt = function (id) { return V.filter(function (x) { return x.rusis === "alternatyva" && x.id === id; })[0] || null; };
    var blok = function (id) { return V.filter(function (x) { return x.raktas === "b:" + id; })[0] || null; };
    var irasyk = function (x, tekstas) { nust(x, tekstas ? { tekstas: tekstas } : { palikti: "neatsakyta" }); };
    var pav = String(ctx.pavadinimas || "").trim();

    // Sudarant (pagal laimėjusį pasiūlymą): Rangovo duomenys ir registracijos valstybė, kaina, sąskaita, kontaktai, parašai, Užsakovo pasirašantis asmuo
    V.filter(function (x) { return x.rusis === "pildoma" || x.rusis === "valdiklis"; }).forEach(function (x) { nust(x, { palikti: "sudarant" }); });
    irasyk(pild("", /^\[pirkimo pavadinimas\]$/), pav);
    irasyk(pild("", /^\[numeris\]$/), String(ctx.numeris || "").trim());
    // 1, 2, 5 - įrašoma nurodymo vietoje; objektas - ir etapų priedo antraštėje
    irasyk(nur("objektas"), t("objektas"));
    irasyk(nur("techninė_užduotis"), t("technine"));
    irasyk(nur("pagrindiniai_įrenginiai"), t("pagrindiniai"));
    // 3 Darbų atlikimo terminas ir pratęsimas
    var n = skaicius(R.darbu_terminas);
    irasyk(pild("3", /^\[dienos\/mėnesiai\]$/), n ? n + " " + ((R.darbu_terminas_vnt || "men") === "d" ? forma(n, "diena", "dienos", "dienų") : forma(n, "mėnuo", "mėnesiai", "mėnesių")) : "");
    // pratęsimo sakinys: „Ne“ - pašalinamas (BS 2.2.2: pratęsimo galimybė nurodoma specialiosiose sąlygose)
    var neprivaloma = function (id) { return V.filter(function (x) { return x.raktas === "o:" + id; })[0] || null; };
    if (R.pratesimas === "ne") nust(neprivaloma("pratęsimas"), "salinti");
    else if (R.pratesimas === "taip") {
      irasyk(pild("3", /^\[terminas\]$/), t("pratesimo_terminas"));
      irasyk(pild("3", /^_+$/), t("pratesimo_aplinkybes") ? t("pratesimo_aplinkybes") + " " : "");
    }
    // 4 Darbų etapai ir etapų priedas (priedo numeris - pagal SS priedų sąrašą)
    var etapuNr = priedoNr(Z, R, /^Projektavimo ir statybos darbų etapai/);
    if (R.etapai === "taip"){
      nust(blok("etapai"), { taikoma: true });
      [pild("4", /^\[\]$/), pild("12", /^\[\]$/), pild("15", /^\[\.\.\.\]$/)].forEach(function (x) { irasyk(x, etapuNr || ""); });
      irasyk(pild("1.1 priedas", /^\[OBJEKTAS\]$/), t("objektas"));
      // etapų lentelė ir jos nurodymai - Word programoje (generatorius lentelės nepildo)
      V.filter(function (x) { return x.vieta === "1.1 priedas" && (x.rusis === "laukas" || x.rusis === "nurodymas" || x.rusis === "nurodymu_blokas"); })
        .forEach(function (x) { nust(x, { palikti: "word" }); });
    } else if (R.etapai === "ne"){
      nust(blok("etapai"), { taikoma: false, tekstas: NETAIKOMAS });   // antraštė lieka - 1-19 punktų numeriai nesikeičia
      V.filter(function (x) { return x.rusis === "skyrius" || x.rusis === "nurodymu_blokas"; }).forEach(function (x) { nust(x, "salinti"); });
    }
    // 6 Užsakovo įrenginiai, 7 fizinė sauga, 8 demontuoti, 9 dalinis apmokėjimas
    if (R.uzsakovo_irenginiai === "ne") nust(neprivaloma("užsakovo_įrenginiai"), { tekstas: NETAIKOMAS });
    else if (R.uzsakovo_irenginiai === "taip") {
      irasyk(pild("6", /^\[įrenginiai/), t("uzsakovo_irenginiai_f").replace(/\.$/, ""));
      irasyk(pild("6", /^\[vieta, adresas\]$/), t("uzsakovo_irenginiu_vieta").replace(/\.$/, ""));
    }
    if (R.demontuoti === "ne") nust(neprivaloma("demontuojami"), { tekstas: NETAIKOMAS });
    else if (R.demontuoti === "taip") irasyk(pild("8", /^\[adresas\]$/), t("demontuoti_adresas"));
    irasyk(nur("fizinė_sauga"), R.fizine_sauga === "ne" ? "Papildomi fizinės saugos reikalavimai Darbams netaikomi." : R.fizine_sauga === "taip" ? t("fizine_sauga_f") : "");
    irasyk(nur("dalinis_apmokėjimas"), R.dalinis === "ne" ? NETAIKOMAS : R.dalinis === "taip" ? t("dalinis_f") : "");
    // 10 Užsakovo atstovai (Rangovo - sudarant)
    irasyk(pild("10", /^\[Pareigos, vardas, pavardė\]$/, 0), t("uzsakovo_atstovas"));
    irasyk(pild("10", /^\[Telefonas, el\. paštas\]$/, 0), t("uzsakovo_atstovo_kontaktai"));
    irasyk(pild("10", /^\[Pareigos, vardas, pavardė\]$/, 2), t("skelbimo_atstovas"));
    irasyk(pild("10", /^\[Telefonas, el\. paštas\]$/, 2), t("skelbimo_atstovo_kontaktai"));
    // 12 apmokėjimas, 14 ES lėšos, 15 netesybos, 16 bankai ir draudimo bendrovės
    var ap = { ziniarastis: 0, etapai: 1, visa: 2 }[R.apmokejimas_psr];
    if (ap != null) nust(alt("apmokėjimas"), { variantas: ap });
    irasyk(nur("es_fondai"), R.es_psr === "taip" ? "Darbus ketinama finansuoti Europos Sąjungos fondų (programų) lėšomis."
                           : R.es_psr === "ne" ? "Darbai Europos Sąjungos fondų (programų) lėšomis nefinansuojami." : "");
    var nt = { vienos: 0, pakopos: 1, etapai: 2 }[R.netesybos];
    if (nt != null) nust(alt("netesybos"), { variantas: nt });
    var bankai = priedoNr(Z, R, /^Užsakovui priimtinų bankų sąrašas/), draudimas = priedoNr(Z, R, /^Užsakovui priimtinų draudimo bendrovių/);
    irasyk(pild("16", /^\[\.\.\.\]$/), bankai && draudimas ? bankai + " ir " + draudimas : "");
    // 17 BIM, 18 investicinis projektas
    var nr = function (s) { return s.replace(/^Nr\.?\s*/i, "").replace(/\.$/, ""); };
    irasyk(nur("bim"), R.bim === "ne" ? "Statinio informacinis modeliavimas (BIM) netaikomas."
      : R.bim === "taip" && t("bim_priedas") ? "Rangovas turi pareigą taikyti statinio informacinį modeliavimą (BIM). Užsakovo informacijos reikalavimai pateikiami priede Nr. " + nr(t("bim_priedas")) + "." : "");
    irasyk(nur("investicinis_projektas"), R.investicinis === "ne" ? NETAIKOMAS
      : R.investicinis === "taip" && t("investicinis_pav") && t("investicinis_nr") ? t("investicinis_pav").replace(/\.$/, "") + ", Nr. " + nr(t("investicinis_nr")) + "." : "");
    // 20 grafikas, 22 ekspertizė, 23 atjungimai
    if (R.grafikas) nust(blok("grafikas"), { taikoma: R.grafikas === "taip" });
    var g = skaicius(R.grafiko_dienos);
    if (R.grafikas === "taip") irasyk(pild("20"), g ? g + " " + forma(g, "dieną", "dienas", "dienų") : "");
    if (R.ekspertize) nust(blok("ekspertizė"), { taikoma: R.ekspertize === "taip" });
    var e = skaicius(R.ekspertizes_dienos);
    if (R.ekspertize === "taip") {
      irasyk(pild("22"), e ? String(e) : "");
      if (e && !(e % 10 === 0 || (e % 100 >= 10 && e % 100 <= 19)))
        perspejimai.push("SS 22 punkte po skaičiaus šablone įrašyta „darbo dienų“ - tinka 10-19, 20, 30 ir pan.; skaičiui " + e + " žodžio formą pataisykite Word programoje.");
    }
    if (R.atjungimai) nust(blok("atjungimai"), { taikoma: R.atjungimai === "taip", dalys: [true, !!t("atjungimai_kiti")] });
    if (R.atjungimai === "taip" && t("atjungimai_kiti")) nust(pild("23"), { tekstas: t("atjungimai_kiti").replace(/[;.]\s*$/, "") });
    // 21 derinimo terminai: lentelės pasirinkimai pagal objektą; nurodymai „(pasirenkama ...)“ šalinami
    V.filter(function (x) { return x.rusis === "alternatyva" && x.vieta === "21"; }).forEach(function (x) {
      var pak = /pakartotinis/i.test(x.eilute || "");
      if (R.derinimas) nust(x, { variantas: R.derinimas === "tp330" ? 0 : R.derinimas === "tp" ? (pak ? 0 : 1) : (pak ? 1 : 2) });
    });
    V.filter(function (x) { return x.rusis === "nurodymas" && x.vieta === "21"; }).forEach(function (x) { nust(x, "salinti"); });
    // 24 užtikrinimas, 25 garantinis užtikrinimas, 26 esminės sąlygos, 27-29 kitos nuostatos
    var uz = { netaikomas: 0, iki: 1, virs: 2 }[R.uztikrinimas_psr];
    if (uz != null) nust(alt("užtikrinimas"), { variantas: uz });
    if (R.garantinis) nust(blok("garantinis_užtikrinimas"), { taikoma: R.garantinis === "taip" });
    if (R.esmines_psr) nust(blok("esminės_sąlygos"), R.esmines_psr === "taip" ? { taikoma: true, papildymas: { 0: t("esmines_psr_f") } } : { taikoma: false });
    if (R.sprogmenys && R.koordinatorius)
      nust(blok("kitos_nuostatos"), { taikoma: true, dalys: [R.sprogmenys === "taip", R.koordinatorius === "p28" || R.koordinatorius === "abu", R.koordinatorius === "abu"] });

    Object.keys(S).forEach(function (k) { var s = S[k]; if (s && typeof s === "object" && s.variantas != null && s.variantas < 0)
      { perspejimai.push("Šablone nerasta vieta sprendimui " + k + " - patikrinkite šablono redakciją."); delete S[k]; } });
    return { S: S, truksta: truksta, perspejimai: perspejimai, derinimas: derinimas, R: R };
  }

  /* ---------------------------------------------------------------- sąsaja 2 žingsnyje */
  var BUSENOS = { siuloma: "Siūloma (nepatvirtinta)", patvirtinta: "Patvirtinta", neuzpildyta: "Neužpildyta (privaloma)", neprivaloma: "Neprivaloma" };
  function esc(x){ return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var SUDARANT = "Tiekėjo duomenys ir atstovai, sutarties numeris, 5.2 punkto sumos (pagal laimėjusį pasiūlymą), 7.1 subtiekėjai, parašai";
  /* Rangos SS 20-29 punktai įrašomi tik taikomi, todėl sugeneruotoje sutartyje jų numeriai gali būti mažesni nei šablone */
  var GRUPIU_PASTABOS = { "Papildomos sąlygos": "Šios grupės punktai įrašomi tik tada, kai taikomi, todėl sugeneruotoje sutartyje jų numeriai gali būti mažesni nei šablone. Klausimuose - šablono numeriai." };
  var SUDARANT_PSR = "Rangovo duomenys, registracijos valstybė, atstovai, kontaktai ir sąskaita, Sutarties data ir numeris, 11 punkto kaina (pagal laimėjusį pasiūlymą), Užsakovo pasirašantis asmuo, parašai";

  function mount(o){
    var doc = global.document, vieta = typeof o.vieta === "string" ? doc.querySelector(o.vieta) : o.vieta;
    if (!vieta) return null;
    var A = {}, Z = null, kodas = null, klaida = "", ctx = null, krauna = false;
    var ZEM = {};
    function zemelapis(k){
      if (ZEM[k]) return Promise.resolve(ZEM[k]);
      return global.fetch("zemelapiai/sutartys/" + k + ".json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) { ZEM[k] = j; return j; });
    }
    function atnaujink(){
      ctx = o.kontekstas();
      if (!ctx || !ctx.sablonai){ Z = null; kodas = null; piesk(); return Promise.resolve(); }
      if (ctx.sablonai.SS === kodas && Z){ piesk(); return Promise.resolve(); }
      kodas = ctx.sablonai.SS; Z = null; klaida = ""; krauna = true; piesk();
      return zemelapis(kodas).then(function (j) { if (kodas === ctx.sablonai.SS){ Z = j; krauna = false; piesk(); } })
        .catch(function (e) { krauna = false; klaida = (e && e.message) || String(e); piesk(); });
    }
    function laukoHtml(q, l){
      var id = "sf-" + l.id, v = esc(l.reiksme);
      var ivestis = l.tipas === "formuluote" ? '<textarea class="lk-in" id="' + id + '" data-sf="' + l.id + '" rows="3">' + v + "</textarea>"
        : '<input class="lk-in' + (l.tipas === "skaicius" ? " lk-in--trumpas" : "") + (l.siuloma && !(A[l.id] && A[l.id].reiksme) ? " lk-in--siuloma" : "") +
          '" id="' + id + '" data-sf="' + l.id + '" type="text"' + (l.tipas === "skaicius" ? ' inputmode="decimal"' : "") + ' value="' + v + '">';
      return '<div class="lk-v"><label class="lk-v-l" for="' + id + '">' + esc(l.uzrasas) + "</label><div class=\"lk-v-iv\">" + ivestis + "</div>" +
        (l.siuloma && !(A[l.id] && A[l.id].reiksme) ? '<div class="lk-kilme">Siūloma: apskaičiuota - ' + esc(l.siuloma.kilme) + ". Patikrinkite ir, jei reikia, pakeiskite.</div>" : "") + "</div>";
    }
    function korteleHtml(q){
      var id = "sf-" + q.id, uz = q.uzuomina ? '<p class="lk-uz" id="' + id + '-uz">' + esc(q.uzuomina) + "</p>" : "";
      var h = '<div class="lk lk--' + q.busena + '" id="' + id + '"><div class="lk-gal"><h5 class="lk-kl" id="' + id + '-kl">' + esc(q.klausimas) + "</h5>" +
        (global.GP_PAAISKINIMAS ? global.GP_PAAISKINIMAS.html({ id: id + "-pa", etikete: q.klausimas, turinys: "<p>" + esc(q.uzuomina || "Atsakymas parenka sutarties specialiųjų sąlygų šablono variantą.") +
          "</p><p>Sutarties šablono tekstas nekeičiamas - parenkamas jo variantas arba įrašoma reikšmė į pildomą vietą.</p>" }) : "") +
        '<span class="lk-b lk-b--' + q.busena + '">' + BUSENOS[q.busena] + "</span></div>" + uz +
        (q.pastaba ? '<p class="lk-uz lk-uz--sps" id="' + id + '-ps">' + esc(q.pastaba) + "</p>" : "");
      var aria = ' aria-labelledby="' + id + '-kl"' + (q.uzuomina || q.pastaba ? ' aria-describedby="' + [q.uzuomina ? id + "-uz" : "", q.pastaba ? id + "-ps" : ""].filter(Boolean).join(" ") + '"' : "");
      if (q.tipas === "taipne" || q.tipas === "variantai"){
        var vs = q.tipas === "taipne" ? TN : q.variantai;
        h += '<div class="opts lk-ops' + (q.tipas === "variantai" ? " lk-var" : "") + '" role="radiogroup"' + aria + ">" + vs.map(function (v, j) {
          return '<label class="opt lk-opt"><input type="radio" name="' + id + '" id="' + id + "-o" + j + '" value="' + esc(v.id) + '" data-sf="' + q.id + '"' +
            (q.reiksme === v.id && q.busena === "patvirtinta" ? " checked" : "") + '> <span class="lk-opt-t">' + esc(v.tekstas) + "</span></label>"; }).join("") + "</div>";
      } else {
        var v = q.reiksme != null ? q.reiksme : "";
        h += '<div class="lk-v"><div class="lk-v-iv">' + (q.tipas === "formuluote" ? '<textarea class="lk-in" id="' + id + '-in" data-sf="' + q.id + '"' + aria + ' rows="3">' + esc(v) + "</textarea>"
          : '<input class="lk-in' + (q.tipas === "skaicius" ? " lk-in--trumpas" : "") + (q.busena === "siuloma" ? " lk-in--siuloma" : "") + '" id="' + id + '-in" type="text" data-sf="' + q.id + '"' +
            (q.tipas === "skaicius" ? ' inputmode="decimal"' : "") + aria + ' value="' + esc(v) + '">') +
          (q.vienetai && q.vienetai.length > 1 ? '<select class="lk-in lk-in--trumpas" data-sf="' + q.id + '_vnt" aria-label="Vienetas">' + q.vienetai.map(function (u) {
            return '<option value="' + u.id + '"' + (q.vienetas === u.id ? " selected" : "") + ">" + esc(u.tekstas) + "</option>"; }).join("") + "</select>"
            : q.vienetai ? '<span class="lk-nr">' + esc(q.vienetai[0].tekstas) + "</span>" : "") + "</div></div>";
      }
      if (q.busena === "siuloma" && q.siuloma){
        var vt = (q.tipas === "taipne" ? TN : q.variantai || []).filter(function (x) { return x.id === q.reiksme; })[0];
        h += '<div class="lk-kilme"><span class="lk-kilme-t">Siūloma: <b>' + esc(vt ? vt.tekstas : q.reiksme) + "</b> - " + esc(q.siuloma.kilme) + ".</span></div>" +
          '<button type="button" class="sec lk-patv" data-sf-patv="' + q.id + '">Patvirtinti</button>';
      }
      q.laukai.forEach(function (l) { if (q.reiksme === l.kada || (l.kada === "*" && String(q.reiksme || "").trim())) h += laukoHtml(q, l); });
      return h + "</div>";
    }
    function piesk(){
      var aktyvus = doc.activeElement && vieta.contains(doc.activeElement) ? doc.activeElement.id : "";
      if (!ctx || !ctx.sablonai){
        vieta.innerHTML = ctx && ctx.priezastis ? '<div class="lk-sutartis-pastaba cite">' + esc(ctx.priezastis) + "</div>" : "";
        return;
      }
      var h = '<section class="lk-sutartis" aria-labelledby="sfH"><h3 id="sfH">Sutarties projektas: ' + esc(ctx.pavadinimasSutarties || "") +
        ' <span class="pz-nepriv">bandomoji</span></h3><div class="hint">Klausimai sutarties specialiosioms sąlygoms (SS). Bendrosios sąlygos generuojamos be pakeitimų. ' +
        "Siūlomos reikšmės - iš jau įvestų duomenų (1 žingsnis, pirkimo kortelė, šio žingsnio SPS atsakymai) ir LITGRID standartų; jas patvirtinate jūs.</div>";
      if (krauna){ vieta.innerHTML = h + '<div class="cite">Kraunamas sutarties šablono žemėlapis...</div></section>'; return; }
      if (klaida){ vieta.innerHTML = h + '<div class="lk-ispejimas">Sutarties šablono žemėlapio įkelti nepavyko (' + esc(klaida) + ") - sutarties projektas nebus sugeneruotas.</div></section>"; return; }
      var qs = klausimai(Z, ctx, A), sp = sprendimai(Z, ctx, A);
      var siul = qs.filter(function (q) { return q.busena === "siuloma"; }), nu = qs.filter(function (q) { return q.busena === "neuzpildyta"; });
      h += '<div class="lk-sa"><b>Sutarties klausimai:</b> ' + qs.length + " · patvirtinta " + qs.filter(function (q) { return q.busena === "patvirtinta"; }).length +
        " · siūloma " + siul.length + " · neatsakyta " + nu.length + (siul.length ? ' <button type="button" class="sec lk-patv" id="sfPatvVisas" data-sf-visas="1">Patvirtinti visas siūlomas (' + siul.length + ")</button>" : "") + "</div>";
      var grupe = "";
      qs.forEach(function (q) {
        if (q.grupe !== grupe){
          grupe = q.grupe; h += '<h4 class="lk-sutartis-g">' + esc(grupe) + "</h4>";
          if (PSR(ctx) && GRUPIU_PASTABOS[grupe]) h += '<p class="lk-uz lk-sutartis-gp">' + esc(GRUPIU_PASTABOS[grupe]) + "</p>";
        }
        h += korteleHtml(q);
      });
      if (sp.derinimas.length) h += '<div class="lk-sa lk-sa--isp" id="sfDerinimas"><b>Patikrinkite (SPS ir sutartis):</b><ul>' + sp.derinimas.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>";
      if (sp.perspejimai.length) h += '<div class="lk-sa lk-sa--isp"><b>Dėmesio:</b><ul>' + sp.perspejimai.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>";
      h += '<div class="lk-sa"><b>Pildoma sudarant sutartį</b> (generatorius šias vietas palieka): ' + esc(PSR(ctx) ? SUDARANT_PSR : SUDARANT) + ".</div></section>";
      vieta.innerHTML = h;
      if (aktyvus){ var e = doc.getElementById(aktyvus); if (e) e.focus(); }
    }
    function keista(perpiesti){ if (perpiesti !== false) piesk(); if (o.onKeista) o.onKeista(); }
    vieta.addEventListener("change", function (e) {
      var t = e.target, id = t && t.getAttribute && t.getAttribute("data-sf");
      if (!id) return;
      A[id] = { reiksme: t.value, patvirtinta: true };
      keista();
    });
    vieta.addEventListener("input", function (e) {
      var t = e.target, id = t && t.getAttribute && t.getAttribute("data-sf");
      if (!id || t.type === "radio" || t.tagName === "SELECT") return;
      A[id] = { reiksme: t.value, patvirtinta: true };
      keista(false);
    });
    vieta.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("[data-sf-patv],[data-sf-visas]");
      if (!b) return;
      var qs = klausimai(Z, ctx, A);
      var kurie = b.hasAttribute("data-sf-visas") ? qs.filter(function (q) { return q.busena === "siuloma"; }) : qs.filter(function (q) { return q.id === b.getAttribute("data-sf-patv"); });
      kurie.forEach(function (q) { A[q.id] = { reiksme: q.reiksme, patvirtinta: true }; q.laukai.forEach(function (l) { if (l.siuloma && l.reiksme) A[l.id] = { reiksme: l.reiksme, patvirtinta: true }; }); });
      keista();
      var f = doc.getElementById(kurie.length === 1 ? "sf-" + kurie[0].id + "-kl" : "sfH");
      if (f){ f.setAttribute("tabindex", "-1"); f.focus(); }
    });
    return {
      atnaujink: atnaujink,
      atsakymai: function () { return JSON.parse(JSON.stringify(A)); },
      atstatyk: function () { A = {}; piesk(); },
      busena: function () {
        if (!ctx || !ctx.sablonai || !Z) return { paruosta: false, priezastis: !ctx || !ctx.sablonai ? (ctx && ctx.priezastis) || "sutartis nepasirinkta" : klaida || "kraunamas šablono žemėlapis" };
        var sp = sprendimai(Z, ctx, A), qs = klausimai(Z, ctx, A);
        return { paruosta: true, kodas: kodas, Z: Z, S: sp.S, truksta: sp.truksta, perspejimai: sp.perspejimai, derinimas: sp.derinimas,
                 siulomos: qs.filter(function (q) { return q.busena === "siuloma"; }).map(function (q) { return q.klausimas; }) };
      }
    };
  }

  global.GP_SUTARTIES_FORMA = { versija: "S4-2026-10-10", KLAUSIMAI: KLAUSIMAI, KLAUSIMAI_PSR: KLAUSIMAI_PSR, klausimai: klausimai, sprendimai: sprendimai, mount: mount,
                                 _forma: forma, _terminasEN: terminasEN, _priedoNr: priedoNr };
})(typeof window !== "undefined" ? window : this);
