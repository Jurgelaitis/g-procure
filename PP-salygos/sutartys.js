/*
 * PP-salygos: sutarties projekto parinkimas pagal pirkimą (GP_SUTARTYS, sutarčių planas S2, 2026-10-08;
 * docs/salygos/sutartys-planas-2026-10.md 2.3-2.4 ir 3.1).
 *
 *   GP_SUTARTYS.parink({ pavadinimas, objektas, bvpz, kalba, vykdytojas, rezimas, verte, atsakymai })
 *     -> { busena, seima, variantas, pavadinimas, priezastys, klausimas, sablonai, kalba, pastabos, atsakyta, nerengiama }
 *        busena: "parinkta"   - šeima ir paruošti šablonai (sablonai.BS / sablonai.SS - templates/sutartys/<kodas>.docx);
 *                "neparuosta" - šeima žinoma, bet jos šablonas generatoriui dar neparuoštas (S1 - tik prekės ir paslaugos);
 *                "klausimas"  - po taisyklių liko keli kandidatai: klausimas.kodas, tekstas, paaiškinimas, atsakymai [{ id, tekstas }];
 *                               atsakymas paduodamas atsakymai[kodas] = id ir parink kviečiamas iš naujo;
 *                "nerengiama" - LITGRID sutarties projektas nerengiamas (pvz. perkama per CPO LT - jo sutarties forma).
 *   GP_SUTARTYS.palygink(rezultatas, zmogausSeima, zmogausVariantas) -> stebėjimo įrašas (siūlyta / pasirinkta / sutampa)
 *   GP_SUTARTYS.NERENGIAMA - kai žmogus atsako, kad LITGRID standartinės sutarties sąlygos netaikomos (sąsaja - sutarties-blokas.js)
 *   rezimas: "VPI" (centralizuotas LITGRID ir EPSO-G pirkimas) - šeima parenkama, bet „neparuošta“: šablonai parengti PĮ pirkimams,
 *            VPĮ pirkimų sutarties forma dar nenuspręsta (plano 6.2 ir 8 sk. 5 p.).
 *
 * verte - numatoma pirkimo vertė Eur be PVM (nuo 2026-10-21, naudotojo sprendimas T3-M16): pastato ar teritorijos smulkių darbų
 * darbų pirkimo-pardavimo („mažoji“) sutartis be klausimo parenkama tik tada, kai vertė mažesnė už mažos vertės darbų pirkimo ribą
 * (GP_THRESHOLDS mv_works - kaip GP_TAISYKLES: lygi riba - nebe mažos vertės); kitaip klausiama K6 - mažoji ar statybos rangos.
 * Taisyklės - deterministinės, iš kalibravimo prototipo (277 LITGRID sutartys: 202 automatiškai be klaidų, 52 po vieno klausimo,
 * 23 po dviejų - imtis ta pati, iš kurios taisyklės sudarytos) ir naudotojo sprendimų 2026-10-08: transformatorių pastotės teritorijos
 * pastatų ir teritorijos smulkūs darbai - mažoji sutartis be klausimo; ekspertizė ir statinio statybos techninė priežiūra -
 * klausiama, ar perkama per CPO LT. Rezultatas visada siūlomas: patvirtina žmogus (sutarties šeima ir priežastis rodomos).
 * DI nenaudojamas, niekas nesiunčiama ir nesaugoma. Pavadinimas normalizuojamas be diakritikų - JS \w ir \b lietuviškų raidžių
 * neatpažįsta, todėl ribos - [^a-z] klasės.
 */
(function (global) {
  "use strict";

  var SEIMOS = {
    PREKES: { pav: "Prekių pirkimo-pardavimo sutartis", sablonai: { LT: { BS: "PREKES_LT_BS", SS: "PREKES_LT_SS" }, LTEN: { BS: "PREKES_LTEN_BS", SS: "PREKES_LTEN_SS" } } },
    PASLAUGOS: { pav: "Paslaugų pirkimo-pardavimo sutartis", sablonai: { LT: { BS: "PASLAUGOS_LT_BS", SS: "PASLAUGOS_LT_SS" }, LTEN: { BS: "PASLAUGOS_LTEN_BS", SS: "PASLAUGOS_LTEN_SS" } } },
    // P3 - specialiųjų sąlygų 3 priedas „Apmokėjimo tvarka pagal etapus“ (trečias sutarties dokumentas pakete; 2026-10-11)
    PROJEKTAVIMO_PASLAUGOS: { pav: "Projektavimo paslaugų sutartis", sablonai: { LT: { BS: "PPS_LT_BS", SS: "PPS_LT_SS", P3: "PPS_LT_SS3" } } },
    DARBAI_MAZOJI: { pav: "Darbų pirkimo-pardavimo sutartis (mažoji)", sablonai: { LT: { BS: "DARBAI_LT_BS", SS: "DARBAI_LT_SS" } } },   // nuo 2026-10-12 (5 etapas, S4)
    PROJEKTAVIMO_STATYBOS: { pav: "Projektavimo ir statybos rangos sutartis", sablonai: { LT: { BS: "PSR_LT_BS", SS: "PSR_LT_SS" } } },
    STATYBOS_RANGOS: { pav: "Statybos rangos sutartis", sablonai: { LT: { BS: "SR_LT_BS", SS: "SR_LT_SS" } } },   // nuo 2026-10-12 (6 etapas, S4)
    // nuo 2026-10-13 (7 etapas, S4): vienos bendrosios sąlygos, specialiosios - pagal darbų rūšį (variantą); kodus grąžina kodai()
    EKSPLOATAVIMO: { pav: "Eksploatavimo darbų sutartis", sablonai: { LT: { BS: "EKS_LT_BS", SS: { OL: "EKSOL_LT_SS", TP: "EKSTP_LT_SS", TRASOS: "EKSTV_LT_SS" } } },
                     variantai: { OL: "oro linijų eksploatavimas", TP: "transformatorių pastočių eksploatavimas", TRASOS: "trasų valymas" } }
  };
  /* Šeimos šablonų kodai pasirinktai kalbai ir variantui: { kodai: { BS, SS, ... }, kalba } arba null (šeima be šablonų; šeimai su
     variantais - nežinomas variantas). Dokumentas, kurio šablonas priklauso nuo varianto, SEIMOS aprašytas objektu { variantas: kodas }. */
  function kodai(seima, variantas, kalba) {
    var S = SEIMOS[seima];
    if (!S || !S.sablonai) return null;
    var k = S.sablonai[kalba] ? kalba : "LT", b = S.sablonai[k], out = {}, gerai = true;
    Object.keys(b).forEach(function (d) {
      out[d] = typeof b[d] === "string" ? b[d] : (variantas && b[d][variantas]) || null;
      if (!out[d]) gerai = false;
    });
    return gerai ? { kodai: out, kalba: k } : null;
  }

  /* Sutarties įvykdymo užtikrinimo reikalavimų vieta sutarties projekte (2026-10-16, naudotojo pastebėjimas: SPS sakinio „Reikalavimai Sutarties
     įvykdymo užtikrinimui nurodyti Sutarties projekto X punkte/priede.“ numerį generatorius žino pats - sutartį jis ir kuria). Numeriai - iš
     šablonų (Word numeracija - emuliuota GPNum, kaip nuorodų patikroje); testas tikrina, kad nurodytoje vietoje šablone yra užtikrinimo nuostata.
     Forma - kaip LITGRID paskelbtose SPS (eksploatavimo: „Sutarties Specialiųjų sąlygų 16 p. ir Sutarties Bendrųjų sąlygų 8.7 p.“).
     Sutarčių šeimoms be generuojamo šablono - nieko (klausiama, kaip iki tol). [numeris, forma vietininku, antraštė šablone] */
  var UZTIKRINIMO_VIETA = {
    PREKES: { SS: ["8", "skyriuje", "Prievolių pagal Sutartį įvykdymo užtikrinimas"], BS: ["10", "skyriuje", "Sutarties įvykdymo užtikrinimas (jei taikoma)"] },
    PASLAUGOS: { SS: ["8", "skyriuje", "Prievolių pagal Sutartį įvykdymo užtikrinimas"], BS: ["10", "skyriuje", "Sutarties įvykdymo užtikrinimas (jei taikoma)"] },
    PROJEKTAVIMO_PASLAUGOS: { SS: ["6", "skyriuje", "Sutarties įvykdymo užtikrinimas"], BS: ["7.5", "punkte", "Sutarties įvykdymo užtikrinimas"] },
    DARBAI_MAZOJI: { SS: ["6.3", "punkte", "Sutarties įvykdymo užtikrinimas"], BS: ["3.5", "punkte", "Sutarties įvykdymo užtikrinimas"] },
    PROJEKTAVIMO_STATYBOS: { SS: ["24", "punkte", "Sutarties įvykdymo užtikrinimas"], BS: ["9.7", "punkte", "Sutarties įvykdymo užtikrinimas"] },
    STATYBOS_RANGOS: { SS: ["23", "punkte", "Sutarties įvykdymo užtikrinimas"], BS: ["8.7", "punkte", "Sutarties įvykdymo užtikrinimas"] },
    EKSPLOATAVIMO: { SS: ["16", "punkte", "Sutarties įvykdymo užtikrinimas"], BS: ["8.7", "punkte", "Sutarties įvykdymo užtikrinimas"] }
  };
  var VARD = { skyriuje: "skyrius", punkte: "punktas" };
  /* -> { tekstas (vietoj „X punkte/priede“), kilme, SS, BS } arba null */
  function uztikrinimoVieta(seima) {
    var u = UZTIKRINIMO_VIETA[seima];
    if (!u) return null;
    return { SS: u.SS, BS: u.BS,
             tekstas: "Specialiųjų sąlygų " + u.SS[0] + " " + u.SS[1] + " ir Bendrųjų sąlygų " + u.BS[0] + " " + u.BS[1],
             kilme: "specialiųjų sąlygų " + u.SS[0] + " " + VARD[u.SS[1]] + " „" + u.SS[2] + "“, bendrųjų sąlygų " + u.BS[0] + " " + VARD[u.BS[1]] + " „" + u.BS[2] + "“" };
  }

  /* Klausimai (plano 3.1). Atsakymų tekstai - pagal šablonų taikymo sritį; ko šablonai nesako, neteigiama. */
  var KLAUSIMAI = {
    K0: { tekstas: "Kas sudaro pagrindinę pirkimo dalį?",
          paaiskinimas: "Sutarties forma parenkama pagal pagrindinę pirkimo dalį. Mišriame pirkime ją nurodote jūs - sistema nespėja.",
          atsakymai: [{ id: "prekes", tekstas: "Prekės" }, { id: "paslaugos", tekstas: "Paslaugos" }, { id: "darbai", tekstas: "Darbai" }] },
    K1: { tekstas: "Ar rangovas pagal sutartį rengs projektą (techninį darbo projektą, demontavimo ar paprastojo remonto aprašą)?",
          paaiskinimas: "Darbai perdavimo tinklo objekte: jei projektą rengia rangovas - projektavimo ir statybos rangos sutartis, jei darbai " +
                        "atliekami pagal Užsakovo pateiktą parengtą projektą - statybos rangos sutartis.",
          atsakymai: [{ id: "rangovas", tekstas: "Taip, rangovas projektuoja", seima: "PROJEKTAVIMO_STATYBOS" },
                      { id: "uzsakovas", tekstas: "Ne, Užsakovas pateikia parengtą projektą", seima: "STATYBOS_RANGOS" }] },
    K2: { tekstas: "Kokie tai darbai?",
          paaiskinimas: "Pavadinime nėra aiškių požymių (pastatas ar teritorija, perdavimo tinklo objektas, projektavimas, eksploatacija), " +
                        "todėl darbų rūšį nurodote jūs.",
          atsakymai: [{ id: "mazoji", tekstas: "Smulkūs darbai pastatuose, teritorijoje, inžinerinėse sistemose ar įrangos keitimas be statinio projekto", seima: "DARBAI_MAZOJI" },
                      { id: "statybos", tekstas: "Darbai perdavimo tinklo objekte pagal Užsakovo parengtą projektą", seima: "STATYBOS_RANGOS" },
                      { id: "projektavimo_statybos", tekstas: "Darbai perdavimo tinklo objekte, kai rangovas rengia projektą", seima: "PROJEKTAVIMO_STATYBOS" },
                      { id: "eksploatavimo", tekstas: "Ilgalaikė regioninė oro linijų ar transformatorių pastočių eksploatacija ar trasų valymas", seima: "EKSPLOATAVIMO" },
                      // kalibravimas: CVP IS „darbai“, bet sudaryta prekių sutartis (įrangos tiekimas su įrengimu)
                      { id: "prekes", tekstas: "Iš esmės įrangos tiekimas su įrengimu (pagrindinė vertė - prekės)", seima: "PREKES" }] },
    K3: { tekstas: "Kokia eksploatacija?",
          paaiskinimas: "Eksploatavimo darbų sutartis turi atskirus oro linijų, transformatorių pastočių ir trasų valymo variantus; pastato " +
                        "inžinerinių sistemų eksploatavimas perkamas darbų pirkimo-pardavimo sutartimi.",
          atsakymai: [{ id: "ol", tekstas: "Oro linijos", seima: "EKSPLOATAVIMO", variantas: "OL" },
                      { id: "tp", tekstas: "Transformatorių pastotės", seima: "EKSPLOATAVIMO", variantas: "TP" },
                      { id: "trasos", tekstas: "Trasų valymas", seima: "EKSPLOATAVIMO", variantas: "TRASOS" },
                      { id: "pastatas", tekstas: "Pastato sistemos ar kita", seima: "DARBAI_MAZOJI" }] },
    K4: { tekstas: "Ar perkamas statinio (transformatorių pastotės, oro ar kabelinės linijos) projektavimas ir projekto vykdymo priežiūra?",
          paaiskinimas: "Statinių projektavimas - projektavimo paslaugų sutartis; kitų sistemų (pvz. apsaugos ar IT) projektavimas - paslaugų sutartis.",
          atsakymai: [{ id: "statinio", tekstas: "Taip, statinio projektavimas", seima: "PROJEKTAVIMO_PASLAUGOS" },
                      { id: "kita", tekstas: "Ne (pvz. apsaugos ar IT sistemų projektavimas)", seima: "PASLAUGOS" }] },
    K5: { tekstas: "Kas sudaro pagrindinę vertę - licencijos ar palaikymo paslaugos?",
          paaiskinimas: "Licencijos (prekės) - prekių pirkimo-pardavimo sutartis; palaikymo paslaugos - paslaugų pirkimo-pardavimo sutartis.",
          atsakymai: [{ id: "licencijos", tekstas: "Licencijos (prekės)", seima: "PREKES" },
                      { id: "palaikymas", tekstas: "Palaikymo paslaugos", seima: "PASLAUGOS" }] },
    // nuo 2026-10-21 (naudotojo sprendimas T3-M16): smulkių darbų taisyklė, kai numatoma vertė ne mažesnė už mažos vertės darbų ribą
    K6: { tekstas: "Kuri sutartis tinka šiems darbams?",
          paaiskinimas: "Pagal pavadinimą tai pastato ar teritorijos darbai, kuriems įprastai tinka darbų pirkimo-pardavimo („mažoji“) sutartis, " +
                        "bet numatoma vertė ne mažesnė už mažos vertės darbų pirkimo ribą, todėl sutartį pasirenkate jūs.",
          atsakymai: [{ id: "mazoji", tekstas: "Darbų pirkimo-pardavimo („mažoji“) sutartis - smulkūs darbai be statinio projekto", seima: "DARBAI_MAZOJI" },
                      { id: "statybos", tekstas: "Statybos rangos sutartis - darbai pagal Užsakovo parengtą projektą", seima: "STATYBOS_RANGOS" }] },
    CPO: { tekstas: "Ar ši paslauga perkama per CPO LT (centralizuotų pirkimų katalogą ar jo dinaminę pirkimo sistemą)?",
           paaiskinimas: "Ekspertizės ir statinio statybos techninės priežiūros paslaugos LITGRID dažnai perkamos per CPO LT - tada naudojama " +
                         "CPO LT sutarties forma ir LITGRID sutarties projektas nerengiamas. Perkant LITGRID pirkimu - paslaugų pirkimo-pardavimo sutartis.",
           atsakymai: [{ id: "taip", tekstas: "Taip, per CPO LT", nerengiama: "perkama per CPO LT - naudojama CPO LT sutarties forma" },
                       { id: "ne", tekstas: "Ne, LITGRID pirkimas", seima: "PASLAUGOS" }] }
  };

  /* Kai sutarties projektas nerengiamas - žmogaus atsakymas „Ne“ į klausimą „Ar taikomos tipinės LITGRID AB sutarties standartinės sąlygos?“
     (naudotojo sprendimas 2026-10-12: „Ne“ - pridedamos esminės sutarties sąlygos; iki tol „Pakeisti“ sąraše buvo ir „CPO LT forma“ bei
     „tiekėjo forma“). Sistemos išvada „perkama per CPO LT“ (klausimas CPO) - atskirai, žr. KLAUSIMAI. */
  var PASTABA_VERTE = "Numatoma vertė neįrašyta - ar darbų vertė mažesnė už mažos vertės darbų pirkimo ribą, nepatikrinta.";
  var PASTABA_RIBA = "Mažos vertės pirkimų ribų įkelti nepavyko - ar darbų vertė mažesnė už ribą, nepatikrinta.";
  var NERENGIAMA = [
    { id: "esmines", tekstas: "Sutarties projektas nepridedamas - esminės sutarties sąlygos išdėstomos SPS" }
  ];

  var DIAKR = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
  function be(s) {
    return String(s || "").toLowerCase().replace(/[ąčęėįšųūž]/g, function (c) { return DIAKR[c]; }).replace(/\s+/g, " ").trim();
  }
  function tarpai(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  /* Požymių klasės (plano 2.3; kamienai be diakritikų). [vardas žmogui, šablonai] */
  var P = {
    tinklas: ["perdavimo tinklo objektas", [/\d+ ?kv/, /(^|[^a-z])(tp|ol|kl|sk|ae)([^a-z]|$)/, /transformatoriu pastot/, /skirstykl/, /oro linij/,
              /kabelin[a-z]* linij/, /prijungim/, /perdavimo tinkl/, /jungt[a-z]* (pertvarkym|rekonstrav)/, /litpol|nordbalt|harmony/]],
    statyba: ["statybos veiksmas", [/rekonstrav/, /(^|[^a-z])statyb/, /kapitalin[a-z]* remont/, /paprast[a-z]* remont/, /pertvarkym/, /demontav/, /(^|[^a-z])rangos/]],
    projektas: ["projektavimas", [/projektavim/, /(techninio|darbo|techninio darbo) projekto (parengim|rengim)/, /projekto parengim/]],
    // pastatai ir teritorija - net perdavimo tinklo objekto teritorijoje (TP tvora, patalpos, aikštelė; naudotojo sprendimas 2026-10-08)
    pagalbTvirtas: ["pastatas ar teritorija", [/tvor/, /vartel|(^|[^a-z])vart(u|ai)/, /aikstel/, /sienel/, /patalp/, /pastat(e|o|u)/, /stog/, /laipt/,
                    /dazym/, /(^|[^a-z])dur(u|ys)/, /lang(u|ai)( |$)/, /grind/, /sandel/, /privaziav|ivaziav/, /kel(io|iu|ias)( |$)/]],
    pagalb: ["pagalbinis objektas", [/tvor/, /(^|[^a-z])dur/, /vartu|vartai/, /kel(io|iu|ias|iams)( |$)/, /privaziav|ivaziav/, /aikstel/, /stog/, /patalp/,
             /pastat/, /kondicionier/, /vedinim/, /sildym/, /laipt/, /dazym/, /sandel/, /akumuliator/, /generatori/, /apsviet/, /santechn/,
             /grindu|grindys/, /langu|langai/]],
    smulkus: ["smulkus veiksmas", [/remont/, /keitim/, /pakeitim/, /atstatym/, /irengim/, /dazym/, /montavim/, /tvarkym/, /isvalym|valym/, /eksploatavim/]],
    eso: ["bendras pirkimas su ESO", [/(^|[^a-z])eso([^a-z]|$)/, /\(es\)|(^|[^a-z])es \(/]],
    trasos: ["trasų valymas", [/trasu valym/, /trasu .*valym/, /kirtim/, /augmenij/]],
    eksploatavimas: ["eksploatavimas", [/eksploatavim/]],
    sistemos: ["pastato inžinerinės sistemos", [/vedinim|sildym|kondicion|santechn|vandentiek/]],
    ol: ["oro linijos", [/oro linij/]],
    tp: ["transformatorių pastotės", [/transformatoriu pastoc/]],
    licencija: ["licencijos", [/licencij/]],
    palaikymas: ["palaikymas ar paslaugos", [/palaikym|paslaug|prieziur/]],
    vykdymoPrieziura: ["projekto vykdymo priežiūra", [/projekto vykdymo prieziur/]],
    ekspertize: ["ekspertizė", [/ekspertiz/]],
    techPrieziura: ["techninė priežiūra", [/technin[a-z]* prieziur/]],
    statinys: ["statinys", [/statyb|statini/]],
    linija: ["perdavimo linija", [/perdavimo linij/]],
    projektavimasPasl: ["projektavimas", [/projektavim/, /projekto (parengim|rengim)/]],
    apsauga: ["apsaugos sistemos", [/apsaugos sistem/]],
    rangosDarbai: ["rangos ar statybos darbai", [/(^|[^a-z])rangos|statybos darb/]]
  };
  /* Radinys - žodis (ar žodžiai) iš PATIES pavadinimo, ne kamienas: `t` ir `orig` tokio pat ilgio (be() tik keičia raidžių dydį ir
     diakritikas), todėl sutapimo vieta išplečiama iki žodžio ribų originaliame tekste („rekonstrav“ -> „rekonstravimo“, „110 kv“ -> „110 kV“). */
  function radinys(t, kl, orig) {
    var ps = P[kl][1];
    for (var i = 0; i < ps.length; i++) {
      var m = ps[i].exec(t);
      if (!m) continue;
      var a = m.index, b = a + m[0].length;
      while (a < b && !/[a-z0-9]/.test(t.charAt(a))) a++;
      while (b > a && !/[a-z0-9]/.test(t.charAt(b - 1))) b--;
      if (!orig || orig.length !== t.length) return t.slice(a, b);
      while (a > 0 && /[a-z0-9]/.test(t.charAt(a - 1))) a--;
      while (b < t.length && /[a-z0-9]/.test(t.charAt(b))) b++;
      return orig.slice(a, b);
    }
    return null;
  }

  function objektoRusis(o) {
    o = be(o);
    if (/^prek|^supplies|^goods/.test(o)) return "prekes";
    if (/^pasl|^serv/.test(o)) return "paslaugos";
    if (/^darb|^works/.test(o)) return "darbai";
    return o === "misrus" || /^misr|^mixed/.test(o) ? "misrus" : "";
  }

  /* Sprendimų medis (plano 2.4) - be atsakymų. -> { seima, variantas, priezastys } | { klausimas, kandidatai, priezastys } | { nerengiama } */
  function medis(t, rusis, bvpz, ats, orig) {
    var kas = {};
    function yra(kl) { var r = radinys(t, kl, orig); if (r !== null) kas[kl] = r; return r !== null; }
    function zyme(kl) { return P[kl][0] + " („" + kas[kl] + "“)"; }
    var b5 = String(bvpz || "").replace(/[^0-9]/g, "").slice(0, 5);
    var tinklas = yra("tinklas");
    if (rusis === "prekes") {
      if (yra("licencija") && yra("palaikymas")) return { klausimas: "K5", priezastys: [zyme("licencija") + " ir " + zyme("palaikymas")] };
      return { seima: "PREKES", priezastys: ["pirkimo objektas - prekės"] };
    }
    if (rusis === "paslaugos") {
      if (yra("vykdymoPrieziura")) return { seima: "PROJEKTAVIMO_PASLAUGOS", priezastys: [zyme("vykdymoPrieziura")] };
      // techninė priežiūra statiniui ar perdavimo tinklo objektui (kalibravimas: „Elektros perdavimo linijos ... techninės priežiūros
      // paslaugos“ - 7 iš 7 per CPO LT); pastato įrenginių techninė priežiūra (be šių požymių) - paslaugų sutartis
      if (yra("ekspertize") || (yra("techPrieziura") && (yra("statinys") || tinklas || yra("linija"))))
        return { klausimas: "CPO", priezastys: [kas.ekspertize ? zyme("ekspertize") : zyme("techPrieziura") + " (" + (kas.statinys ? "statinio statyba" : "perdavimo tinklo objektas") + ")"] };
      if (yra("projektavimasPasl") || /^7132[023]$/.test(b5)) {
        var pr = kas.projektavimasPasl ? zyme("projektavimasPasl") : "BVPŽ " + b5 + " (projektavimas)";
        if (yra("apsauga")) return { seima: "PASLAUGOS", priezastys: [pr, zyme("apsauga")] };
        if (tinklas) return { seima: "PROJEKTAVIMO_PASLAUGOS", priezastys: [pr, zyme("tinklas")] };
        return { klausimas: "K4", priezastys: [pr + ", perdavimo tinklo objekto pavadinime nėra"] };
      }
      return { seima: "PASLAUGOS", priezastys: ["pirkimo objektas - paslaugos"] };
    }
    if (rusis === "darbai") {
      if (yra("trasos")) return { seima: "EKSPLOATAVIMO", variantas: "TRASOS", priezastys: [zyme("trasos")] };
      if (yra("eksploatavimas") && yra("sistemos"))
        return { seima: "DARBAI_MAZOJI", priezastys: [zyme("eksploatavimas"), zyme("sistemos") + " - darbų pirkimo-pardavimo sutartis"] };
      if (kas.eksploatavimas) {
        if (yra("ol")) return { seima: "EKSPLOATAVIMO", variantas: "OL", priezastys: [zyme("eksploatavimas"), zyme("ol")] };
        if (yra("tp")) return { seima: "EKSPLOATAVIMO", variantas: "TP", priezastys: [zyme("eksploatavimas"), zyme("tp")] };
        if (!tinklas && yra("pagalb")) return { seima: "DARBAI_MAZOJI", priezastys: [zyme("eksploatavimas"), zyme("pagalb")] };
        return { klausimas: "K3", priezastys: [zyme("eksploatavimas") + ", objektas neaiškus"] };
      }
      var projektuoja = yra("projektas"), eso = yra("eso"), statyba = yra("statyba"), smulkus = yra("smulkus");
      if (yra("pagalbTvirtas") && smulkus && !projektuoja && !statyba && !eso)
        return { seima: "DARBAI_MAZOJI", smulkus: true, priezastys: [zyme("pagalbTvirtas"), zyme("smulkus"), "nėra statybos veiksmo ir projektavimo" +
                 (tinklas ? " (ir perdavimo tinklo objekto teritorijoje - darbų pirkimo-pardavimo sutartis)" : "")] };
      if (projektuoja && yra("rangosDarbai") && !eso)
        return { seima: "PROJEKTAVIMO_STATYBOS", priezastys: [zyme("projektas"), zyme("rangosDarbai")] };
      if (tinklas && (statyba || projektuoja))
        return { klausimas: "K1", priezastys: [zyme("tinklas"), statyba ? zyme("statyba") : zyme("projektas")].concat(eso ? [zyme("eso") + " - projektą gali rengti ar apmokėti kita šalis"] : []) };
      if (!tinklas && yra("pagalb") && smulkus && !projektuoja && !/rekonstrav|(^|[^a-z])statyb|kapitalin/.test(t))
        return { seima: "DARBAI_MAZOJI", smulkus: true, priezastys: [zyme("pagalb"), zyme("smulkus")] };
      return { klausimas: "K2", priezastys: ["aiškių darbų rūšies požymių pavadinime nėra"] };
    }
    return { klausimas: "K0", priezastys: [rusis === "misrus" ? "mišrus pirkimas" : "pirkimo objekto rūšis nenurodyta"] };
  }

  function klausimas(kodas) {
    var k = KLAUSIMAI[kodas];
    return { kodas: kodas, tekstas: k.tekstas, paaiskinimas: k.paaiskinimas,
             atsakymai: k.atsakymai.map(function (a) { return { id: a.id, tekstas: a.tekstas }; }) };
  }

  /* Mažos vertės darbų pirkimo riba pagal režimą (GP_THRESHOLDS) arba null - neįkelta */
  function mvDarbu(rezimas) {
    var T = global.GP_THRESHOLDS, R = T && T[rezimas === "VPI" ? "VPI" : "PI"];
    return R && R.mv_works > 0 ? R.mv_works : null;
  }
  function eur(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Eur"; }

  function parink(duom) {
    duom = duom || {};
    var t = be(duom.pavadinimas), ats = duom.atsakymai || {}, atsakyta = [], pastabos = [];
    var kalba = duom.kalba === "LT_EN" || duom.kalba === "LTEN" ? "LTEN" : "LT";
    var rusis = objektoRusis(duom.objektas);
    if (!t) pastabos.push("Pirkimo pavadinimas tuščias - parenkama tik pagal objekto rūšį ir atsakymus.");
    if (duom.vykdytojas && !/litgrid/i.test(duom.vykdytojas))
      pastabos.push("Sutarčių šablonai - LITGRID AB; kitos organizacijos sutarčių formų generatoriuje nėra.");
    var priezastys = [], r, i = 0;
    while (i++ < 6) {
      r = medis(t, rusis, duom.bvpz, ats, tarpai(duom.pavadinimas));
      if (r.smulkus) {
        // smulkių darbų taisyklė - tik mažos vertės darbams (T3-M16); vertė nežinoma ar riba neįkelta - pasakoma
        var verte = Number(duom.verte) || 0, mv = mvDarbu(duom.rezimas);
        if (verte > 0 && mv && verte >= mv)
          r = { klausimas: "K6", priezastys: r.priezastys.concat(["numatoma vertė " + eur(verte) + " - ne mažesnė už mažos vertės darbų pirkimo ribą (" + eur(mv) + ")"]) };
        else if (!(verte > 0)) { if (pastabos.indexOf(PASTABA_VERTE) < 0) pastabos.push(PASTABA_VERTE); }
        else if (!mv) { if (pastabos.indexOf(PASTABA_RIBA) < 0) pastabos.push(PASTABA_RIBA); }
      }
      priezastys = priezastys.concat(r.priezastys || []);
      if (!r.klausimas) break;
      var a = ats[r.klausimas], def = a && KLAUSIMAI[r.klausimas].atsakymai.filter(function (x) { return x.id === a; })[0];
      if (!def) return { busena: "klausimas", klausimas: klausimas(r.klausimas), priezastys: priezastys, kalba: kalba, pastabos: pastabos, atsakyta: atsakyta };
      atsakyta.push({ kodas: r.klausimas, atsakymas: def.id, tekstas: def.tekstas });
      if (r.klausimas === "K0") { rusis = def.id; continue; }
      if (def.nerengiama) return { busena: "nerengiama", seima: null, priezastys: priezastys.concat(["atsakymas: " + def.tekstas]), nerengiama: def.nerengiama,
                                   kalba: kalba, pastabos: pastabos, atsakyta: atsakyta };
      if (def.seima === "EKSPLOATAVIMO" && !def.variantas) {
        // K2 „eksploatacija“ - variantą lemia K3
        var a3 = ats.K3, d3 = a3 && KLAUSIMAI.K3.atsakymai.filter(function (x) { return x.id === a3; })[0];
        priezastys.push("atsakymas: " + def.tekstas);
        if (!d3) return { busena: "klausimas", klausimas: klausimas("K3"), priezastys: priezastys, kalba: kalba, pastabos: pastabos, atsakyta: atsakyta };
        atsakyta.push({ kodas: "K3", atsakymas: d3.id, tekstas: d3.tekstas });
        def = d3;
      }
      r = { seima: def.seima, variantas: def.variantas || null, priezastys: ["atsakymas: " + def.tekstas] };
      priezastys = priezastys.concat(r.priezastys);
      break;
    }
    var S = SEIMOS[r.seima];
    var rez = { seima: r.seima, variantas: r.variantas || null, pavadinimas: S.pav + (r.variantas ? " - " + S.variantai[r.variantas] : ""),
                priezastys: priezastys, kalba: kalba, pastabos: pastabos, atsakyta: atsakyta, sablonai: null };
    var sb = kodai(r.seima, r.variantas, kalba);
    if (!sb) {
      rez.busena = "neparuosta";
      rez.pastabos.push("Šios šeimos šablonas generatoriui dar neparuoštas.");
      return rez;
    }
    if (duom.rezimas === "VPI") {
      rez.busena = "neparuosta";
      rez.pastabos.push("Centralizuotam pirkimui pagal VPĮ sutarties projektas kol kas nesiūlomas: sutarčių šablonai parengti PĮ pirkimams, " +
                        "o VPĮ pirkimų sutarties forma (VPT tipinės sąlygos ar LITGRID šablonai) dar nenuspręsta.");
      return rez;
    }
    rez.busena = "parinkta";
    rez.sablonai = sb.kodai;
    if (sb.kalba !== kalba) { rez.kalba = "LT"; rez.pastabos.push("Šios šeimos dvikalbės (LT/EN) sutarties nėra - parinkta lietuviška."); }
    return rez;
  }

  /* Stebėjimo režimas: ką sistema siūlė ir ką pasirinko žmogus (renkama taisyklėms tikslinti; pavadinimo įraše nėra). */
  function palygink(rez, seima, variantas) {
    return { siulyta: rez && rez.seima || null, siulytasVariantas: rez && rez.variantas || null, pasirinkta: seima || null,
             pasirinktasVariantas: variantas || null, busena: rez && rez.busena,
             klausimai: (rez && rez.atsakyta || []).map(function (a) { return a.kodas + "=" + a.atsakymas; }),
             sutampa: !!(rez && rez.seima === seima && (rez.variantas || null) === (variantas || null)) };
  }

  global.GP_SUTARTYS = { versija: "S4-K6-2026-10-21", SEIMOS: SEIMOS, KLAUSIMAI: KLAUSIMAI, NERENGIAMA: NERENGIAMA, parink: parink, palygink: palygink, kodai: kodai, normalizuok: be,
                         UZTIKRINIMO_VIETA: UZTIKRINIMO_VIETA, uztikrinimoVieta: uztikrinimoVieta };
})(typeof window !== "undefined" ? window : this);
