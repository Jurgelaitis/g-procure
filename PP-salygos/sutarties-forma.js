/*
 * PP-salygos: sutarties projekto klausimai 2 žingsnyje ir sprendimai generatoriui (GP_SUTARTIES_FORMA, sutarčių planas S4, 2026-10-08;
 * taisyklės - docs/salygos/sutarciu-lauku-inventorius.md, naudotojo sprendimai 2026-10-07 ir 2026-10-08).
 *
 *   GP_SUTARTIES_FORMA.klausimai(Z, ctx, A)  -> rodomi klausimai: [{ id, grupe, klausimas, uzuomina, pa, tipas, variantai, laukai,
 *                                                privalomas, siuloma: { reiksme, kilme } | null, reiksme, busena }]
 *   GP_SUTARTIES_FORMA.sprendimai(Z, ctx, A) -> { S (GP_SUTARCIU_GEN sprendimai), truksta: [klausimai be atsakymo], siulomos: [...] }
 *   GP_SUTARTIES_FORMA.mount({ vieta, kontekstas, onKeista }) -> { atnaujink, busena, atsakymai }  - sąsaja (atskirai nuo taisyklių)
 *     ctx: { seima: "PREKES" | "PASLAUGOS", kalba: "LT" | "LTEN", pavadinimas, pavadinimasEN, numeris, trukmeMen, verte,
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
      laukai: [{ id: "salinimo_terminas", tipas: "tekstas", uzrasas: "Terminas trūkumams pašalinti (pvz. 10 dienų)", kada: "taip" }] },
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
      uzuomina: "Pvz. „30 (trisdešimt) dienų“. Šablonas: ši aplinkybė taikoma, tik jei terminas įrašytas; neįrašius vieta lieka." },

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
      uzuomina: "Padalinys, pareigos, vardas, pavardė, tel., el. paštas. Neįrašius - lieka šablono nurodymas, pildoma sudarant." },
    { id: "cvp_adresas", grupe: "Kita", tipas: "tekstas", privalomas: false, rodoma: paslaugos,
      klausimas: "Kokiu adresu skelbiami pirkimo dokumentai (15.2 punktas)?",
      uzuomina: "CVP IS pirkimo adresas. Neįrašius - lieka šablono teksto laukas." }
  ];

  /* ---------------------------------------------------------------- efektyvūs atsakymai */
  function efektyvus(ctx, A){
    var R = {}, kilmes = {};
    KLAUSIMAI.forEach(function (q) {
      var a = A[q.id];
      if (a && a.reiksme != null && a.reiksme !== "") { R[q.id] = a.reiksme; kilmes[q.id] = "zmogus"; }
      (q.laukai || []).forEach(function (l) { var b = A[l.id]; if (b && b.reiksme != null && b.reiksme !== "") R[l.id] = b.reiksme; });
    });
    // siūlomos - tvarka svarbi (kainodara -> pradžia ir kt.), todėl kelis kartus
    for (var k = 0; k < 3; k++) KLAUSIMAI.forEach(function (q) {
      if (kilmes[q.id] === "zmogus" || !q.siuloma) return;
      var s = q.siuloma(ctx, R);
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
    var E = efektyvus(ctx, A), R = E.R;
    return KLAUSIMAI.filter(function (q) { return !q.rodoma || q.rodoma(ctx, R); }).map(function (q) {
      var k = E.kilmes[q.id], a = A[q.id];
      var busena = R[q.id] == null ? (q.privalomas ? "neuzpildyta" : "neprivaloma") : k === "zmogus" ? "patvirtinta" : "siuloma";
      if (k === "zmogus" && a && a.patvirtinta === false) busena = "siuloma";
      return { id: q.id, grupe: q.grupe, klausimas: q.klausimas, uzuomina: q.uzuomina || "", pastaba: q.pastaba ? q.pastaba(ctx, R) : "", tipas: q.tipas, privalomas: !!q.privalomas,
               variantai: (q.variantai || []).filter(function (v) { return !v.tik || v.tik(ctx); }).map(function (v) { return { id: v.id, tekstas: v.tekstas }; }),
               vienetai: q.vienetai ? q.vienetai(ctx) : null,
               laukai: (q.laukai || []).filter(function (l) { return !l.tikLTEN || LTEN(ctx); }).map(function (l) {
                 return { id: l.id, tipas: l.tipas, uzrasas: l.uzrasas, kada: l.kada, reiksme: R[l.id] != null ? R[l.id] : "", siuloma: l.id === "procentai" && E.kilmes.procentai ? E.kilmes.procentai : null }; }),
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
  function sprendimai(Z, ctx, A){
    A = A || {};
    var V = global.GP_SUTARCIU_GEN.vietos(Z), R = efektyvus(ctx, A).R, S = {}, truksta = [], perspejimai = [], derinimas = derink(ctx, R);
    var rodomi = klausimai(Z, ctx, A);
    rodomi.forEach(function (q) {
      if (q.privalomas && q.reiksme == null) truksta.push(q.klausimas);
      q.laukai.forEach(function (l) {
        if (q.reiksme === l.kada && (l.tipas === "formuluote" || l.tipas === "tekstas" || l.tipas === "skaicius") && !String(l.reiksme || "").trim() &&
            !/^(pirkejo|cvp|velavimas)/.test(l.id)) truksta.push(q.klausimas + " - " + l.uzrasas);
      });
    });
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
    nust(atst, String(R.pirkejo_atstovas || "").trim() ? { tekstas: R.pirkejo_atstovas.trim(), tekstasEN: R.pirkejo_atstovas.trim() } : { palikti: "sudarant" });

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
      if (n62[0] && taip("garantija") && String(R.salinimo_terminas || "").trim()) nust(n62[0], { tekstas: R.salinimo_terminas.trim(), tekstasEN: R.salinimo_terminas.trim() });
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
    if (p1224) nust(p1224, String(R.velavimas || "").trim() ? { tekstas: R.velavimas.trim(), tekstasEN: R.velavimas.trim() } : { palikti: "neatsakyta" });

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

  /* ---------------------------------------------------------------- sąsaja 2 žingsnyje */
  var BUSENOS = { siuloma: "Siūloma (nepatvirtinta)", patvirtinta: "Patvirtinta", neuzpildyta: "Neužpildyta (privaloma)", neprivaloma: "Neprivaloma" };
  function esc(x){ return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var SUDARANT = "Tiekėjo duomenys ir atstovai, sutarties numeris, 5.2 punkto sumos (pagal laimėjusį pasiūlymą), 7.1 subtiekėjai, parašai";

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
      q.laukai.forEach(function (l) { if (q.reiksme === l.kada) h += laukoHtml(q, l); });
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
      qs.forEach(function (q) { if (q.grupe !== grupe){ grupe = q.grupe; h += '<h4 class="lk-sutartis-g">' + esc(grupe) + "</h4>"; } h += korteleHtml(q); });
      if (sp.derinimas.length) h += '<div class="lk-sa lk-sa--isp" id="sfDerinimas"><b>Patikrinkite (SPS ir sutartis):</b><ul>' + sp.derinimas.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>";
      if (sp.perspejimai.length) h += '<div class="lk-sa lk-sa--isp"><b>Dėmesio:</b><ul>' + sp.perspejimai.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>";
      h += '<div class="lk-sa"><b>Pildoma sudarant sutartį</b> (generatorius šias vietas palieka): ' + esc(SUDARANT) + ".</div></section>";
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

  global.GP_SUTARTIES_FORMA = { versija: "S4-2026-10-09", KLAUSIMAI: KLAUSIMAI, klausimai: klausimai, sprendimai: sprendimai, mount: mount, _forma: forma };
})(typeof window !== "undefined" ? window : this);
