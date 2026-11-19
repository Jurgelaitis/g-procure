/* ============================================================================
 * G-Procure  shared/nzia.js   (window.GP_NZIA)
 * ----------------------------------------------------------------------------
 * Poveikio klimatui neutralizavimo pramonės akto (Reglamentas (ES) 2024/1735, NZIA) 25 straipsnis viešuosiuose pirkimuose
 * (2026-11-19, naudotojo „Darome“ - ilgalaikės krypties 1 etapas). Grynos funkcijos ir duomenys, be DI, nieko nesaugo ir nesiunčia.
 *
 * KAS TAI. Nuo 2026-06-30 25 straipsnio 1 dalis taikoma VISOMS procedūroms pagal direktyvas 2014/24/ES ir 2014/25/ES (iki tol - tik
 * centrinėms perkančiosioms organizacijoms ir nuo 25 mln. EUR; 49 str. 3 d.), kai į sutarčių dalyką įtrauktos 4 straipsnio 1 dalies a-k
 * punktų technologijos - tarp jų h) elektros tinklų technologijos (pastotės, kabeliai ir linijos, transformatoriai, skirstomieji įrenginiai,
 * pastočių automatizavimas ir kt. - reglamento priedas) ir c) baterijų ir energijos kaupimo technologijos. Darbų sutartims - bent viena
 * 25 str. 3 d. sąlyga; kai Komisijos komunikate nustatyta didelė priklausomybė nuo vienos trečiosios valstybės - 25 str. 7 d. a-d sąlygos.
 *
 * KAS SPRENDŽIA. Ar pirkimo objektas yra nulinio balanso technologija, sprendžia žmogus (teisės specialistas) - modulis tik SIŪLO pagal BVPŽ
 * kodą ar pavadinimo žodį ir parodo, iš kur siūlymas. Priklausomybę nustato tik Komisijos komunikatas (gairės: „turi remtis komunikatu ...
 * o ne patys skaičiuoti“) - lentelė PRIKLAUSOMYBE perrašyta iš jo 1 lentelės (paryškinti įrašai). Komunikatas atnaujinamas kasmet:
 * pasikeitus - atnaujink PRIKLAUSOMYBE (komunikato numerį, datą ir įrašus) ir testus.
 *
 * Teisės nuorodos - tik per GP_TEISE (raktai nzia_*). Sutarčių sąlygų pavyzdžiai - pažodžiui iš Komisijos gairių C/2026/4623 (lietuviškas
 * tekstas; gairės teisiškai neprivalomos), o 25 str. 7 d. sąlygos - pažodžiui iš reglamento. LITGRID šablonų tekstas automatiškai nekeičiamas.
 *
 * NAUDOJIMAS
 *   GP_NZIA.tarptautinis("T-AK")                          -> true
 *   GP_NZIA.siulymas({ pavadinimas, bvpz })               -> [{ k: "h", kilme: "pagal BVPŽ kodą 31170000-8 „Transformatoriai“" }]
 *   GP_NZIA.vertink({ budas, objektas, technologija, kategorijos, salygos3, baterijos, isimtis, pagrindimas })
 *        -> { busena, taikoma, salygos: [...], trukumai: [...], pastabos: [...] }
 *   GP_NZIA.kopijai(tekstas)                              -> be U+2013 ir U+2014 (oficialiems dokumentams)
 * Testai: shared/testai.html grupė testaiNzia1119, PP-salygos/testai.html.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  /* 4 straipsnio 1 dalies a-k punktai (25 str. taikomas tik jiems). Eilė: LITGRID aktualiausi pirmi. Tekstas - reglamento. */
  var TECHNOLOGIJOS = [
    { k: "h", pav: "elektros tinklų technologijos, įskaitant elektros įkrovimo technologijas transporto reikmėms ir tinklo skaitmeninimo technologijas" },
    { k: "c", pav: "baterijų ir energijos kaupimo technologijos" },
    { k: "a", pav: "saulės energijos technologijos, įskaitant fotovoltinės energijos, saulės šilumos elektros energijos ir saulės šiluminės energijos technologijas" },
    { k: "b", pav: "sausumos vėjo ir jūros atsinaujinančiųjų išteklių energijos technologijos" },
    { k: "d", pav: "šilumos siurbliai ir geoterminės energijos technologijos" },
    { k: "e", pav: "vandenilio technologijos, įskaitant elektrolizerius ir kuro elementus" },
    { k: "f", pav: "tvarios biodujų ir biometano technologijos" },
    { k: "g", pav: "CCS technologijos" },
    { k: "i", pav: "branduolių dalijimosi energijos technologijos, įskaitant branduolinio kuro ciklo technologijas" },
    { k: "j", pav: "tvarių alternatyviųjų degalų technologijos" },
    { k: "k", pav: "hidroenergijos technologijos" }
  ];
  var KAT = {}; TECHNOLOGIJOS.forEach(function (t) { KAT[t.k] = t; });

  /* Siūlymas - tik pagalba žmogui (kilmė visada parodoma). BVPŽ kodo pradžia ir žodžiai be diakritikų; žodžiai - iš reglamento priedo
     produktų sąrašo (Deleguotojo reglamento (ES) 2025/1463 redakcija) ir įprastų LITGRID pirkimų pavadinimų. */
  var BVPZ = [
    { pr: "3117", k: "h" },      // Transformatoriai
    { pr: "312", k: "h" },       // Elektros skirstymo ir reguliavimo aparatai
    { pr: "313", k: "h" },       // Izoliuoti laidai ir kabeliai
    { pr: "452314", k: "h" },    // Elektros energijos tiekimo linijų tiesimo darbai
    { pr: "452322", k: "h" },    // Pagalbiniai elektros energijos tiekimo linijų tiesimo darbai
    { pr: "453173", k: "h" },    // Elektros skirstymo aparatų elektros instaliacijos montavimo darbai
    { pr: "31155", k: "h" },     // Invertoriai
    { pr: "3143", k: "c" },      // Elektros akumuliatoriai
    { pr: "3144", k: "c" }       // Baterijos
  ];
  var ZODZIAI = [
    { k: "h", re: /(^|[^a-z])(transformator|pastot|skirstom|kabel|skyrikl|isjungikl|virsitamp|kondensator|reaktori|laidinink|invertor|inverter|konverter)/, z: "elektros tinklo įranga" },
    { k: "h", re: /(^|[^a-z])(oro|perdavimo|elektros|kabelin)[a-z]*\s+linij/, z: "elektros linija" },
    { k: "h", re: /(^|[^a-z])(facts|statcom|hvdc)([^a-z]|$)/, z: "galios elektronika" },
    { k: "h", re: /(^|[^a-z])pastoci[a-z]*\s+automatizav|(^|[^a-z])automatizav[a-z]*\s+[a-z\s]{0,30}pastot/, z: "pastočių automatizavimas" },
    { k: "h", re: /(^|[^a-z])isman[a-z]*\s+skaitikl/, z: "išmanieji skaitikliai" },
    { k: "c", re: /(^|[^a-z])(bateri|akumuliator|kaupim)|(^|[^a-z])bess([^a-z]|$)/, z: "baterijos ar energijos kaupimas" },
    { k: "a", re: /(^|[^a-z])(fotovolt|saules\s+(elektrin|energ|modul|plokst))/, z: "saulės energija" },
    { k: "b", re: /(^|[^a-z])vejo\s+(elektrin|jeg|turbin|energ)/, z: "vėjo energija" },
    { k: "e", re: /(^|[^a-z])(vandenil|elektrolizer)/, z: "vandenilis" }
  ];
  function be(s) {
    return String(s || "").toLowerCase().replace(/[ą]/g, "a").replace(/[č]/g, "c").replace(/[ęė]/g, "e").replace(/[į]/g, "i")
      .replace(/[š]/g, "s").replace(/[ųū]/g, "u").replace(/[ž]/g, "z");
  }

  /* Komisijos komunikatas C/2025/3236 (2023 m. duomenys), 1 lentelė - paryškinti (didelės priklausomybės) įrašai. Taikytinas nuo
     2025-12-30 (gairės C/2026/4623, III dalies C skirsnis). Nepaminėtiems produktams - „galima daryti prielaidą, kad ... didelės tiekimo
     priklausomybės nėra“ (gairės). `kitiTinklo` - elektros tinklų technologijų eilutės be paryškinimo (informacijai). */
  var PRIKLAUSOMYBE = {
    komunikatas: "C/2025/3236", duomenuMetai: 2023, taikomaNuo: "2025-12-30",
    irasai: [
      { id: "fv_sistemos",  k: "a", pav: "fotovoltinės saulės energijos sistemos", dalis: 79, salis: "Kinija" },
      { id: "fv_moduliai",  k: "a", pav: "fotovoltiniai moduliai ir elementai (ar lygiaverčiai elementai)", dalis: 94, salis: "Kinija" },
      { id: "fv_inverteriai", k: "a", pav: "fotovoltiniai apgręžikliai (inverteriai)", dalis: 50, salis: "Kinija" },
      { id: "fv_plokstele", k: "a", pav: "fotovoltinės plokštelės ar jų atitikmuo", dalis: 79, salis: "Kinija" },
      { id: "vejo_magnetai", k: "b", pav: "nuolatiniai vėjo elektrinių magnetai", dalis: 93, salis: "Kinija" },
      { id: "baterijos",    k: "c", pav: "sudėtinės baterijos, baterijų moduliai, baterijų elementai", dalis: 50, salis: "Kinija" },
      { id: "anodai",       k: "c", pav: "anodų aktyviosios medžiagos", dalis: 81, salis: "Kinija" }
    ],
    kitiTinklo: [
      "sausumos ir jūrinės pastotės - 31 % (Kinija)", "galios transformatoriai - 9 % (Turkija)", "izoliatoriai - 14 % (Kinija)",
      "skyrikliai - 7 % (Šveicarija)", "skirstomieji įrenginiai, skirstomosios spintos, šynų sistemos - 5 % (Norvegija)",
      "grandinės išjungikliai - 5 % (Šveicarija)", "perdavimo ir skirstymo kabeliai ir linijos, laidininkai - 4 % (Turkija)"
    ]
  };

  /* Komisijos gairių C/2026/4623 pavyzdžiai - pažodžiui (lietuviškas tekstas, III dalies B skirsnis). */
  var PAVYZDZIAI = {
    socialine: [
      "Rangovas įsipareigoja X val. skirti darbui, susijusiam su profesinio mokymo programomis (pvz., pameistryste), ir Y val. – socialinės įtraukties programoms (pvz., reintegracija į darbo rinką įgyvendinant jam skirtą sutartį).",
      "Vykdydamas savo pareigas pagal sutartį, rangovas imasi veiksmų, kad įgyvendintų pagrindinius išsamaus patikrinimo socialinėje ir žmogaus teisių srityse aspektus, nurodytus Direktyvos (ES) 2024/1760 dėl įmonių tvarumo išsamus patikrinimo 5 straipsnio 1 dalies a–g punktuose."
    ],
    kiber: ["Iki tos datos perkančiosios organizacijos ir perkantieji subjektai turėtų reikalauti, kad konkurso dalyviai įrodytų atitiktį taikytiniems kibernetinio saugumo reikalavimams, numatytiems nacionaliniuose ir Europos teisės aktuose."],
    laiku: ["Numatyta su fotovoltinių modulių įrengimu susijusių darbų paruošimo ir vykdymo trukmė yra iki keturių mėnesių nuo pirkimo dokumente nurodytos pradžios datos. Iki sutartyje numatyto termino nebaigus darbų, rangovui bus taikoma XXX EUR dydžio bauda už kiekvieną kalendorinę vėlavimo dieną. Jei vėluojama daugiau nei aštuonias dienas, bus taikoma padidinta YYY EUR dydžio bauda."]
  };

  /* 25 str. 7 d. a-d punktai - reglamento tekstas pažodžiui (sutarčiai pritaikomas: „Komisijos nustatyta trečioji valstybė“ - komunikato šalis). */
  var ATSPARUMAS = [
    { raktas: "nzia_atsp_a", tekstas: "pareigą sutarties laikotarpiu tiekti ne daugiau kaip 50 % šioje dalyje nurodytos konkrečios nulinio balanso technologijos vertės iš kiekvienos atskiros trečiosios valstybės, kaip nustatyta Komisijos;" },
    { raktas: "nzia_atsp_b", tekstas: "sutarties laikotarpiu galiojančią pareigą, kad konkurso laimėtojas arba subrangovas iš kiekvienos atskiros trečiosios valstybės, kaip nustatyta Komisijos, tiesiogiai tiektų arba pateiktų ne daugiau kaip 50 % šioje dalyje nurodytos konkrečios nulinio balanso technologijos pagrindinių specifinių komponentų vertės;" },
    { raktas: "nzia_atsp_c", tekstas: "pareigą perkančiosioms organizacijoms ir perkantiesiems subjektams, joms pateikus prašymą, pateikti tinkamus įrodymus, susijusius su a arba b punktu, ne vėliau kaip iš karto po sutarties įvykdymo;" },
    { raktas: "nzia_atsp_d", tekstas: "pareigą, jei nesilaikoma a arba b punkte nurodytų sąlygų, sumokėti proporcingą mokestį, kuris sudarytų ne mažiau kaip 10 % šioje dalyje nurodytos pagal sutartį pateiktų konkrečių nulinio balanso technologijų vertės." }
  ];

  var SALYGOS3 = {
    a: { raktas: "nzia_socialine", zodziai: "pameistryst|profesinio\\s+mokym|socialin[a-z]*\\s+(itrauk|integrac)|uzimtum", pav: "Speciali socialinė ar užimtumo sutarties įvykdymo sąlyga", pavyzdziai: PAVYZDZIAI.socialine },
    b: { raktas: "nzia_kiber", zodziai: "kibernetin[a-z]*\\s+saugum", pav: "Reikalavimas įrodyti atitiktį kibernetinio saugumo reikalavimams", pavyzdziai: PAVYZDZIAI.kiber,
         pastaba: "Kibernetinio atsparumo aktas visa apimtimi taikomas nuo 2027-12-11; iki tol gairės siūlo reikalauti atitikties nacionaliniams ir Europos teisės aktams - žr. kibernetinio saugumo reikalavimų sąrašą." },
    c: { raktas: "nzia_laiku", zodziai: "komponent[^.]{0,100}(laiku|termin)|(laiku|termin)[^.]{0,100}komponent", pav: "Sutartinis įsipareigojimas laiku pateikti komponentą, susijusį su nulinio balanso technologija", pavyzdziai: PAVYZDZIAI.laiku,
         pastaba: "Gairių pavyzdys parengtas fotovoltiniams moduliams - pritaikykite savo pirkimo komponentui; įsipareigojimas turi viršyti nacionalinės teisės reikalavimus." }
  };
  var ISIMTYS = { a: "nzia_isimtis_vienas", b: "nzia_isimtis_ankstesne", c: "nzia_isimtis_sanaudos" };

  function cit(r) { try { return global.GP_TEISE ? global.GP_TEISE.cit(r) : ""; } catch (e) { return ""; } }
  function apie(r) { try { return global.GP_TEISE ? global.GP_TEISE.apie(r) : ""; } catch (e) { return ""; } }

  // Tarptautinis pirkimas (GP_METHODS rezimas) - 25 str. taikomas tik procedūroms, kurioms taikomos direktyvos; be būdo - null (nežinoma)
  function tarptautinis(budas) {
    if (!budas) return null;
    var m = global.GP_METHODS && global.GP_METHODS.byId ? global.GP_METHODS.byId(budas) : null;
    if (m) return m.rezimas === "tarptautinis";
    return /^(T-|DPS)/.test(String(budas));
  }

  function siulymas(o) {
    o = o || {};
    var out = [], buvo = {};
    var kodai = String(o.bvpz || "").match(/\d{8}(-\d)?/g) || [];
    kodai.forEach(function (kd) {
      var g = kd.slice(0, 8);
      BVPZ.forEach(function (b) {
        if (g.indexOf(b.pr) !== 0 || buvo[b.k]) return;
        var pav = "";
        try { var rr = global.GP_CPV_DATA && global.GP_CPV_DATA.codes ? global.GP_CPV_DATA.codes.filter(function (c) { return c[0].slice(0, 8) === g; })[0] : null; pav = rr ? rr[1] : ""; } catch (e) {}
        buvo[b.k] = 1; out.push({ k: b.k, kilme: "pagal BVPŽ kodą " + kd + (pav ? " „" + pav + "“" : "") });
      });
    });
    var t = be(o.pavadinimas);
    ZODZIAI.forEach(function (z) {
      if (buvo[z.k]) return;
      var m = z.re.exec(t);
      if (!m) return;
      buvo[z.k] = 1;
      // žodis originalo forma: pirmas pavadinimo žodis, kurio pradžia sutampa
      var zodziai = String(o.pavadinimas || "").split(/\s+/), rasta = m[0].replace(/^[^a-z]/, "").split(/\s+/)[0];
      var orig = zodziai.filter(function (w) { return be(w).replace(/[^a-z]/g, "").indexOf(rasta) === 0; })[0] || rasta;
      out.push({ k: z.k, kilme: "pagal pavadinimo žodį „" + orig.replace(/[„“"(),.;:]/g, "") + "“ (" + z.z + ")" });
    });
    return out;
  }

  function priklausomybe(kategorijos) {
    var ks = kategorijos || [];
    return PRIKLAUSOMYBE.irasai.filter(function (x) { return ks.indexOf(x.k) >= 0; });
  }

  /* vertink(ctx): ctx = { budas, objektas ("prekes"|"paslaugos"|"darbai"), technologija ("taip"|"ne"|"neaisku"|null),
     kategorijos: ["h", ...], salygos3: ["a"|"b"|"c"], baterijos ("taip"|"ne"|null - ar dalyke yra komunikate pažymėtų produktų),
     isimtis ("a"|"b"|"c"|""), pagrindimas (tekstas) }.
     Grąžina: busena - "netaikoma" (ne tarptautinis), "nezinoma" (būdas nepasirinktas), "neatsakyta", "ne", "neaisku", "taikoma";
     salygos - ką dokumentuose turi būti (kur, raktas, cit, tekstas, pavyzdziai), trukumai - neatsakyti klausimai, pastabos - informacija. */
  function vertink(ctx) {
    ctx = ctx || {};
    var r = { busena: "", taikoma: null, salygos: [], trukumai: [], pastabos: [], kategorijos: [] };
    var tt = tarptautinis(ctx.budas);
    if (tt === null) { r.busena = "nezinoma"; return r; }
    if (!tt) { r.busena = "netaikoma"; r.taikoma = false; r.pastabos.push("25 straipsnis taikomas tik procedūroms, kurioms taikomos ES pirkimų direktyvos (tarptautiniams pirkimams)."); return r; }
    if (ctx.budas === "DPS-K") r.pastabos.push("Konkrečiam pirkimui pagal DPS taikoma teisė, galiojusi kvietimo dalyvauti konkurse paskelbimo metu (" + cit("nzia_gaires") + ") - įvertinkite, ar 25 straipsnis buvo taikomas kuriant DPS.");
    var t = ctx.technologija;
    if (t !== "taip" && t !== "ne" && t !== "neaisku") { r.busena = "neatsakyta"; r.trukumai.push({ id: "technologija", tekstas: "Ar pirkimo dalyke yra nulinio balanso technologijų (" + cit("nzia_technologijos") + ")" }); return r; }
    if (t === "ne") { r.busena = "ne"; r.taikoma = false; return r; }
    var kat = (ctx.kategorijos || []).filter(function (k) { return KAT[k]; });
    r.kategorijos = kat;
    if (t === "taip" && !kat.length) r.trukumai.push({ id: "kategorijos", tekstas: "Kurios nulinio balanso technologijos įtrauktos į pirkimo dalyką" });
    r.busena = t === "taip" ? "taikoma" : "neaisku";
    r.taikoma = t === "taip" ? true : null;
    if (t === "neaisku") r.pastabos.push("Ar pirkimo objektas yra nulinio balanso technologija, įvertina teisės specialistas. Žemiau - ką dokumentuose reikėtų turėti, jei 25 straipsnis taikomas.");
    var isim = ISIMTYS[ctx.isimtis] ? ctx.isimtis : "";
    if (isim && !String(ctx.pagrindimas || "").trim()) r.trukumai.push({ id: "pagrindimas", tekstas: "Išimties pagrindimas (" + cit(ISIMTYS[isim]) + ")" });
    // 25 str. 1 d. - minimalieji aplinkos tvarumo reikalavimai (šiuo metu tik vėjo jėgainių mentėms)
    if (kat.indexOf("b") >= 0 && !isim) r.salygos.push({ id: "vejas", kur: "TS arba sutartis", tikrinti: "sps_sutartis", zodziai: "ment[^.]{0,120}perdirb|perdirb[^.]{0,120}ment", raktas: "nzia_vejas", cit: cit("nzia_vejas"),
      pav: "Vėjo jėgainių menčių perdirbimo lygis - bent 70 proc.", tekstas: "Sausumos vėjo ir jūros vėjo technologijų vėjo jėgainių menčių perdirbimo lygis yra bent 70 proc. Perdirbimo lygis apskaičiuojamas kaip santykinis perdirbamos medžiagos svoris. Vėjo jėgainių menčių perdirbimo lygis įrodomas ne vėliau kaip įvykdžius sutartį.", pavyzdziai: [] });
    else if (kat.length) r.pastabos.push("Minimaliųjų aplinkos tvarumo reikalavimų pasirinktoms technologijoms įgyvendinimo akte nėra (" + cit("nzia_vejas") + " - tik vėjo jėgainių mentėms), todėl " + cit("nzia_aplinkos") + " papildomų pareigų nesukuria.");
    // 25 str. 3 d. - darbų sutartims bent viena sąlyga (išimtis 9 d. - 1-4 dalims)
    if (ctx.objektas === "darbai") {
      if (isim) r.pastabos.push("Pasirinkta išimtis (" + cit(ISIMTYS[isim]) + "): " + cit("nzia_darbai") + " sąlygos netaikomos. Sprendimą ir jo pagrindimą užfiksuokite.");
      else {
        var s3 = (ctx.salygos3 || []).filter(function (x) { return SALYGOS3[x]; });
        if (!s3.length) r.trukumai.push({ id: "salygos3", tekstas: "Kuri " + cit("nzia_darbai") + " sąlyga bus taikoma (bent viena)" });
        s3.forEach(function (x) {
          var S = SALYGOS3[x];
          r.salygos.push({ id: "s3" + x, kur: "Sutartis (sutarties įvykdymo sąlyga)", tikrinti: "sps_sutartis", raktas: S.raktas, cit: cit(S.raktas), zodziai: S.zodziai, pav: S.pav, tekstas: apie(S.raktas), pavyzdziai: S.pavyzdziai, pastaba: S.pastaba || "" });
        });
      }
    }
    // 25 str. 7 d. - atsparumas: tik komunikate pažymėti produktai pasirinktose kategorijose
    var pr = priklausomybe(kat);
    if (pr.length) {
      if (ctx.baterijos !== "taip" && ctx.baterijos !== "ne") r.trukumai.push({ id: "baterijos", tekstas: "Ar pirkimo dalyke yra produktų, kuriems Komisija nustatė didelę priklausomybę (" + cit("nzia_priklausomybe") + ")" });
      else if (ctx.baterijos === "taip") {
        r.salygos.push({ id: "atsparumas", kur: "Pirkimo sąlygos ir sutartis", tikrinti: "sps_sutartis", zodziai: "trecio[a-z]*\\s+valstyb", raktas: "nzia_atsparumas", cit: cit("nzia_atsparumas"),
          pav: "Indėlis į atsparumą: " + pr.map(function (x) { return x.pav + " (" + x.dalis + " % - " + x.salis + ")"; }).join("; "),
          tekstas: "Į pirkimo procedūrą įtraukiamos šios sąlygos (reglamento tekstas - pritaikykite sutarčiai):", punktai: ATSPARUMAS.map(function (a) { return { cit: cit(a.raktas), tekstas: a.tekstas }; }), pavyzdziai: [],
          pastaba: "Pasiūlymo pateikimo metu tiekėjas įsipareigoja laikytis reikalavimų (pvz., savideklaracija), faktinę atitiktį galima įrodyti vėliau; kilmė nustatoma pagal nelengvatinės kilmės taisykles (" + cit("nzia_gaires") + "). Netaikoma tiekėjams iš SVP ir kitų Sąjungai privalomų susitarimų šalių, kai produktas kilęs iš tų šalių (" + cit("nzia_svp") + ") - tai nurodykite dokumentuose. Jei dėl šių sąlygų nebus tinkamų pasiūlymų - " + cit("nzia_netinkami") + "." });
      }
    }
    if (kat.indexOf("h") >= 0) r.pastabos.push("Elektros tinklų technologijoms komunikate " + PRIKLAUSOMYBE.komunikatas + " didelė priklausomybė nenustatyta (" + PRIKLAUSOMYBE.kitiTinklo.slice(0, 3).join("; ") + " ir kt.), todėl " + cit("nzia_atsparumas") + " sąlygų nereikia. Komunikatas atnaujinamas kasmet - prieš skelbdami patikrinkite naujausią.");
    if (isim) r.isimtis = { kodas: isim, cit: cit(ISIMTYS[isim]), apie: apie(ISIMTYS[isim]), pagrindimas: String(ctx.pagrindimas || "").trim() };
    return r;
  }

  // Oficialiems dokumentams - be U+2013 ir U+2014 (CLAUDE.md 5 sk.); citata ekrane rodoma pažodžiui
  function kopijai(t) { return String(t || "").replace(/[–—]/g, "-"); }

  global.GP_NZIA = {
    TECHNOLOGIJOS: TECHNOLOGIJOS, PRIKLAUSOMYBE: PRIKLAUSOMYBE, PAVYZDZIAI: PAVYZDZIAI, ATSPARUMAS: ATSPARUMAS, SALYGOS3: SALYGOS3, ISIMTYS: ISIMTYS,
    tarptautinis: tarptautinis, siulymas: siulymas, priklausomybe: priklausomybe, vertink: vertink, kopijai: kopijai,
    technologija: function (k) { return KAT[k] || null; }
  };
})(typeof window !== "undefined" ? window : this);
