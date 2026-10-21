/*
 * PP-salygos: sutarties projekto klausimai 2 žingsnyje ir sprendimai generatoriui (GP_SUTARTIES_FORMA, sutarčių planas S4, 2026-10-08;
 * taisyklės - docs/salygos/sutarciu-lauku-inventorius.md, naudotojo sprendimai 2026-10-07 ir 2026-10-08).
 *
 *   GP_SUTARTIES_FORMA.klausimai(Z, ctx, A)  -> rodomi klausimai: [{ id, grupe, klausimas, uzuomina, pa, tipas, variantai, laukai,
 *                                                privalomas, siuloma: { reiksme, kilme } | null, reiksme, busena }]
 *   GP_SUTARTIES_FORMA.sprendimai(Z, ctx, A) -> { S (GP_SUTARCIU_GEN sprendimai), truksta: [klausimai be atsakymo], siulomos: [...] }
 *   GP_SUTARTIES_FORMA.mount({ vieta, kontekstas, onKeista, poPiesimo }) -> { atnaujink, busena, atsakymai, klausimai, visiKlausimai, irasyk }
 *                                                - sąsaja (atskirai nuo taisyklių); poPiesimo() - po kiekvieno perpiešimo (PP-SALYGOS.html DI skiltis)
 *   GP_SUTARTIES_FORMA.priedoSprendimai(Zp, R) -> { S, truksta } - sprendimai sutarties priedui su savu šablonu (projektavimo paslaugų SS
 *                                                3 priedas: kuri etapų lentelė lieka); R - sprendimai().R
 *     ctx: { seima: "PREKES" | "PASLAUGOS" | "PROJEKTAVIMO_STATYBOS" | "STATYBOS_RANGOS" | "PROJEKTAVIMO_PASLAUGOS" | "DARBAI_MAZOJI", kalba: "LT" | "LTEN", pavadinimas, pavadinimasEN, numeris, trukmeMen, verte,
 *            uztikrinimas: { taikomas: true | false | null, eur }, kriterijus: "kaina" | "kokybe" | null, nacsaug: bool }
 *     A: { [klausimo id]: { reiksme, patvirtinta } } - žmogaus atsakymai; siūloma reikšmė (iš ctx ar LITGRID standarto) galioja, kol
 *        žmogus neatsakė, ir rodoma „Siūloma (nepatvirtinta)“ su kilme; „Patvirtinta“ - tik žmogaus veiksmu.
 *
 * Sutarties šablono tekstas nekeičiamas - sprendimai tik renkasi šablono variantus ir įrašo reikšmes į pildomas vietas. Ko šablonas
 * nenumato (pvz. pratęsimo sąlygų redagavimas), paliekama Word programai ir išvardijama patikroje. Taisyklėse DI nenaudojamas.
 * DI atsakymai iš pirkimo dokumentų (2026-10-18, naudotojo sprendimas: ką rodo pateikti dokumentai, pakartotinai neklausiama): ctx.di[klausimo id] =
 * { reiksme, vnt, laukai, saltinis, vieta, citata } - PP-SALYGOS.html, patikrinta ai-patarejas.js (citata pažodžiui dokumente). Tai siūloma reikšmė,
 * kaip ir kitos: „Siūloma (nepatvirtinta)“ su DI žyme ir citata, pirmesnė už taisyklių siūlymus (ji iš šio pirkimo dokumentų; kitokia taisyklių
 * reikšmė parodoma), patvirtina žmogus - patvirtinta lieka su žyme A[id].di, kol jos nepakeičia.
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

  /* Naudotojo taisyklė 2026-10-11 (kas pildoma generuojant): sutarties pavadinimas = pirkimo pavadinimas, pirkimo pavadinimas ir numeris ir
     pirkimo vykdytojo rekvizitai (ir sąskaita bei bankas) - žinomi, įrašomi automatiškai; sutarties numeris, tiekėjo rekvizitai, atstovai -
     nežinomi, nepildomi; kas žinoma rengiant (ES lėšos, terminai) - klausiama prieš generuojant.
     Pirkimo numeris - iš pirkimo kortelės arba neprivalomo lauko „Pirkimo numeris (jei jau žinomas)“ (2026-10-15, naudotojo pastebėjimas: nė
     viename iš 18 paskelbtų LITGRID projektų numerio nėra, o numeris įrašomas iki pasirašant - todėl jis sutarties generavimo nestabdo). */
  function pirkimoNr(ctx, R){
    return String((ctx && ctx.numeris) || "").trim() || (R ? String(R.pirkimo_nr || "").trim().replace(/^Nr\.?\s*/i, "") : "");
  }
  /* Numerio dar nėra - formos vieta lieka pildyti sudarant sutartį (ne tylus praleidimas: sąraše „Pildoma sudarant sutartį“ ir patikroje) */
  function nrSudarant(ctx, R){ return !pirkimoNr(ctx, R); }
  /* Sprendimas formos vietai pirkimo numeriui: numeris arba „pildoma sudarant sutartį“ */
  function numerioSprendimas(ctx, R){ var nr = pirkimoNr(ctx, R); return nr ? { tekstas: nr } : { palikti: "sudarant" }; }
  /* Kitų priedų pavadinimai iš teksto lauko (2026-10-13): kiekviena eilutė - atskiras priedas; sąrašo ženklas pradžioje ir skyryba gale
     nuimami, eilutės gale - kabliataškis, paskutinės - taškas (kaip formų priedų sąrašuose) */
  function prieduEilutes(t){
    var e = String(t || "").split(/\n+/).map(function (x) {
      return x.replace(/^\s*(?:[-\u2013\u2022*]|\d{1,2}[.)])\s+/, "").replace(/[\s;.,]+$/, "").replace(/\s+/g, " ").trim(); }).filter(Boolean);
    return e.map(function (x, k) { return x + (k < e.length - 1 ? ";" : "."); });
  }
  var KITI_PRIEDAI_NETAIKOMA = "Kiti priedai - netaikoma.";
  var KL_NUMERIS = function (grupe, kur) { return { id: "pirkimo_nr", grupe: grupe, tipas: "tekstas", privalomas: false,
    klausimas: "Pirkimo numeris (jei jau žinomas)",
    uzuomina: "Neprivaloma. Numeris įrašomas kartu su pirkimo pavadinimu (" + kur + "). Neįrašius numerio vieta lieka pildyti sudarant sutartį - taip ji palikta visuose 18 paskelbtų LITGRID sutarčių projektų. Pasirinkus pirkimo kortelę su numeriu, numeris imamas iš jos.",
    rodoma: function (c) { return !String(c.numeris || "").trim(); } }; };
  /* Maksimali sutarties kaina sutarties projekte (naudotojo sprendimas 2026-10-13; patikra su paskelbtais projektais: 6 iš 18 projektų kaina
     ar pradinė sutarties vertė įrašyta jau projekte - kai perkama pagal poreikį). Neprivalomas klausimas: „Taip“ - rengėjo suma be PVM, PVM
     (standartinis tarifas - shared/thresholds.js) ir suma su PVM; „Ne“ ar neatsakyta - vietos lieka sudarant sutartį. Suma iš numatomos
     pirkimo vertės nesiūloma. */
  function pvmTarifas(){ var m = global.GP_THRESHOLDS && global.GP_THRESHOLDS.MOKESCIAI; return m && m.pvmStandartinis > 0 ? m.pvmStandartinis : null; }
  function suma2(centai){
    var sv = String(Math.floor(centai / 100)), ct = centai % 100, out = "";
    for (var i = 0; i < sv.length; i++) out += ((sv.length - i) % 3 === 0 && i ? " " : "") + sv[i];
    return out + "," + (ct < 10 ? "0" : "") + ct;
  }
  function kainaProjekte(R){
    if (!R || R.maks_kaina !== "taip") return null;
    var raw = String(R.maks_kaina_suma || "").trim();
    if (!raw) return { klaida: "tuscia" };
    var n = global.GP_MONEY && global.GP_MONEY.parseEUR ? global.GP_MONEY.parseEUR(raw) : skaicius(raw), t = pvmTarifas();
    if (!(n > 0)) return { klaida: "suma" };
    if (t == null) return { klaida: "tarifas" };
    var be = Math.round(n * 100), pvm = Math.round(be * t);
    return { be: suma2(be), pvm: suma2(pvm), su: suma2(be + pvm) };
  }
  var KL_KAINA = function (grupe, kur, rodoma) { return { id: "maks_kaina", grupe: grupe, tipas: "taipne", privalomas: false, rodoma: rodoma || null,
    klausimas: "Ar sutarties projekte nurodoma maksimali sutarties kaina (" + kur + ")?",
    uzuomina: function () {
      var t = pvmTarifas();
      return "Neprivalomas klausimas. „Taip“ - kai perkama pagal poreikį ir maksimali kaina žinoma jau rengiant pirkimą: įrašoma jūsų suma be PVM, o PVM" +
        (t != null ? " (standartinis " + skLT(apvalink(t * 100)) + " proc. tarifas)" : "") + " ir suma su PVM apskaičiuojami. „Ne“ arba neatsakyta - kainos vietos lieka pildyti sudarant sutartį pagal " +
        "laimėjusį pasiūlymą. Suma iš numatomos pirkimo vertės nesiūloma - ją įrašote patys. Jei laimėtojui bus taikomas kitas PVM tarifas, sumos patikslinamos sudarant sutartį."; },
    laukai: [{ id: "maks_kaina_suma", tipas: "tekstas", uzrasas: "Maksimali sutarties kaina be PVM, eurais", kada: "taip" }] }; };
  /* Kainos vietos (be PVM, PVM, su PVM) - trys iš eilės; grąžina true, jei įrašyta. `su` - ar po skaičiaus rašoma valiuta */
  function irasykKaina(R, vietos, nust, truksta, perspejimai, kur, suValiuta){
    var k = kainaProjekte(R);
    if (!k) return false;
    if (k.klaida === "suma") { truksta.push("Ar sutarties projekte nurodoma maksimali sutarties kaina (" + kur + ")? - Maksimali sutarties kaina be PVM, eurais (neatpažinta suma)"); return false; }
    if (k.klaida === "tarifas") { pastaba(perspejimai, "Maksimali sutarties kaina neįrašyta - neįkeltos bendros vertės ribos (shared/thresholds.js), PVM apskaičiuoti negalima.", [{ q: "maks_kaina" }]); return false; }
    if (k.klaida) return false;
    if (vietos.length !== 3) { perspejimai.push("Formoje nerastos trys kainos vietos (" + kur + ") - maksimali sutarties kaina neįrašyta; patikrinkite šablono redakciją."); return false; }
    [k.be, k.pvm, k.su].forEach(function (v, j) {
      // formoje prieš vietą kartais nėra tarpo („(PVM):[suma skaičiais]“) - įrašoma su tarpu; anglų stulpelyje - angliškas skaičiaus formatas
      var tarpas = /:\[/.test(String(vietos[j].aprasas || "")) ? " " : "", val = suValiuta ? " Eur" : "";
      nust(vietos[j], { tekstas: tarpas + v + val, tekstasEN: tarpas + v.replace(",", ".").replace(/ /g, ",") + (suValiuta ? " EUR" : "") });
    });
    return true;
  }

  /* ---------------------------------------------------------------- siūlymai iš SPS (2026-10-15, naudotojo pastebėjimas: „ar to negalima
     vertinti iš pirkimo sąlygų?“). Išmatuota su paskelbtais LITGRID prekių ir paslaugų projektais (6): SPS „pirkimas žaliasis savaime“ - 13.1 p.
     įrašytas 4.4.3 papunktis, SPS 3 lentelė (ISO 14001 / EMAS) - 4.3 papunktis (Tvarkos aprašo 4 p., e-tar 2026-10-15); socialiniai kriterijai
     susieti su pasiūlymu ar SPS lentele 5 iš 6 (SPS socialiniai reikalavimai - juoda LITGRID nuostata, tiekėjas jų atitiktį deklaruoja
     pasiūlyme); papildomi priedai: trišalė sutartis - 3 iš 4 (SPS taikomas tiesioginis atsiskaitymas), bankų sąrašas - kai reikalauta banko
     garantijos. Visa tai - tik siūloma reikšmė su kilme: patvirtina žmogus. */
  function zalSiulymas(c){
    var z = c && c.zaliejiSPS;
    if (!z || !z.length) return null;
    var tik = function (k) { return z.length === 1 && z[0] === k; };
    if (tik("savaime")) return { p: "4.4.3", kodel: "SPS: pirkimas laikomas žaliuoju savaime (nematerialios paslaugos) - Tvarkos aprašo 4.4.3 papunktis" };
    if (tik("salygose")) return { p: "4.3", kodel: "SPS 3 lentelė: aplinkos apsaugos vadybos sistema (LST EN ISO 14001, EMAS) - Tvarkos aprašo 4.3 papunktis" };
    return { p: "", kodel: "SPS: žalieji reikalavimai nurodyti Techninėje specifikacijoje ir (ar) Sutarties projekte - papunktį (4.1, 4.2 ar 4.4.4) įrašykite pagal TS" };
  }
  var SOC_LT = "Socialiniai kriterijai nurodyti Tiekėjo pasiūlyme.";
  var SOC_EN = "The social criteria are set out in the Supplier's Tender.";
  var SOC_KILME = "SPS: socialiniai reikalavimai sutarties vykdymui, tiekėjas jų atitiktį deklaruoja pasiūlyme; formuluotė - kaip paskelbtuose LITGRID projektuose";
  function papildomiSiulomi(c, R){
    var out = [];
    if (c && c.tiesioginis === true) out.push({ lt: "Trišalės sutarties dėl tiesioginio atsiskaitymo su subtiekėju projektas", en: "Draft tripartite agreement on direct payment to the subcontractor",
      kodel: "SPS: taikomas tiesioginis atsiskaitymas su subtiekėjais - trišalės sutarties projektas" });
    if (R && R.uztikrinimas === "taip") out.push({ lt: "Priimtinų bankų ir draudimo bendrovių sąrašas", en: "List of acceptable banks and insurance companies",
      kodel: "reikalaujamas sutarties įvykdymo užtikrinimas - priimtinų bankų ir draudimo bendrovių sąrašas" });
    return out;
  }

  /* ---------------------------------------------------------------- priedų sąrašas (naudotojo sprendimas 2026-10-13)
     Patikra su paskelbtais projektais: priedų sąrašą rengėjai keičia kiekviename projekte. 2 žingsnyje rodomas formos priedų sąrašas su
     žymimaisiais langeliais; nepažymėtas priedas sutartyje lieka su žodžiu „netaikoma“ - kitų priedų numeriai ir nuorodos į juos nesikeičia.
     Atsakymas - „visi“ arba „be:<nr>,<nr>“; pradinė reikšmė „visi“ - siūloma (kaip LITGRID formoje), patvirtina žmogus.
     Užrakinti: sutarties bendrosios ir specialiosios sąlygos (pridedamos visada) ir priedai, kuriuos valdo kiti klausimai. */
  var PR_SUTARTIS = /bendrosios (sutarties )?sąlygos|specialiosios sąlygos/i;
  /* Pridedami visada (2026-10-15, naudotojo pastebėjimas ir paskelbti LITGRID projektai: techninė specifikacija ar užduotis, pasiūlymas ir
     pirkimo dokumentai nepašalinti nė viename) - ne klausimas, o informacija */
  var PR_VISADA = /^(\d+ priedas\.\s*)?(techninė specifikacija|techninė užduotis|pasiūlymas|rangovo pasiūlymas|projektuotojo pasiūlymas|pirkimo dokumentai|pirkimo sąlygos)/i;
  /* Priedai, kurių reikia tik taikant tiesioginį atsiskaitymą su subtiekėjais (trišalė sutartis) - siūloma pagal SPS atsakymą */
  var PR_TRISALE = /trišal|tiesioginio atsiskaitymo/i;
  function nepridedami(R){
    var o = {}, v = String((R && R.priedai_sar) || "");
    if (v.indexOf("be:") === 0) v.slice(3).split(",").forEach(function (n) { if (n.trim()) o[n.trim()] = 1; });
    return o;
  }
  function prieduSarasas(Z, ctx, R){
    var pr = (Z && Z.priedai) || [], out = [];
    if (!pr.length) return out;
    R = R || {};
    var kp = Z.kiti_priedai ? Z.kiti_priedai.i : -1, kitas = {}, be = nepridedami(R);
    (Z.neprivalomos || []).forEach(function (b) { b.pastraipos.forEach(function (i) { kitas[i] = b.id; }); });
    (Z.nurodymai || []).forEach(function (n) { kitas[n.i] = n.id || "nurodymas"; });
    (Z.valdikliai || []).forEach(function (v) { if (v.i != null) kitas[v.i] = kitas[v.i] || "valdiklis"; });
    var etapu = (Z.skyriai || []).map(function (k) { return k.priedas; });
    // ar kitu klausimu valdomas priedas pridedamas (rodoma užrakintame langelyje); nežinoma - laikoma, kad pridedamas
    var kitoAts = { "trišalė": R.dm_trisale, "pareigų_sąrašas": R.pp_patikra, "kiti_priedai": R.pp_kiti_priedai };
    // rodomas numeris - koks bus sutartyje: rangos SS etapų priedas, kai Darbai ne etapais, pašalinamas su eilute ir Word pernumeruoja kitus
    var salinami = R.etapai === "ne" ? etapu : [], c1 = 0, c2 = 0;
    pr.forEach(function (p) {
      var rod = null;
      if (salinami.indexOf(p.nr) < 0) { if (String(p.nr).indexOf(".") < 0) { c1++; c2 = 0; rod = String(c1); } else { c2++; rod = c1 + "." + c2; } }
      if (p.laisvas || p.i === kp) return;   // vietos papildomiems priedams - atskiri klausimai
      var valdo = null, yra = true;
      if (PR_SUTARTIS.test(p.tekstas)) valdo = "sutarties dalis - pridedama visada";
      else if (PR_VISADA.test(String(p.tekstas || "").trim())) valdo = "pridedamas visada";
      else if (etapu.indexOf(p.nr) >= 0) { valdo = R.etapai === "ne" ? "Darbai atliekami ne etapais - priedas ir jo eilutė pašalinami" : "pagal atsakymą, ar Darbai atliekami etapais"; yra = R.etapai !== "ne"; }
      else if (EKS(ctx || {}) && /^Sutarties įvykdymo užtikrinimas/.test(p.tekstas)) { valdo = "pagal atsakymą apie Sutarties įvykdymo užtikrinimą"; yra = R.ek_uztikrinimas !== "ne"; }
      else if (PPS(ctx || {}) && /Apmokėjimo tvarka pagal etapus/.test(p.tekstas)) valdo = "generuojamas kartu su specialiosiomis sąlygomis";
      else if (kitas[p.i] != null) { valdo = "pagal atsakymą į kitą šios sutarties klausimą"; yra = kitoAts[kitas[p.i]] !== "ne"; }
      out.push({ nr: p.nr, rodomas: rod, tekstas: String(p.tekstas || "").replace(/ĮMONĖS PAVADINIMAS/g, "LITGRID AB"), valdo: valdo, pridedamas: valdo ? yra : !be[p.nr] });
    });
    return out;
  }
  /* Siūlomi nepridėti: trišalės sutarties projektas, kai SPS tiesioginis atsiskaitymas netaikomas */
  function prieduSiuloma(Z, c, R){
    var pas = prieduSarasas(Z, c, R).filter(function (p) { return !p.valdo; });
    if (!pas.length) return null;
    var be = c && c.tiesioginis === false ? pas.filter(function (p) { return PR_TRISALE.test(p.tekstas); }) : [];
    return be.length ? { reiksme: "be:" + be.map(function (p) { return p.nr; }).join(","), kilme: "SPS: tiesioginis atsiskaitymas su subtiekėjais netaikomas - trišalės sutarties projekto nereikia; kiti - kaip LITGRID formoje" }
                     : { reiksme: "visi", kilme: "kaip LITGRID formoje" + (pas.some(function (p) { return PR_TRISALE.test(p.tekstas); }) && c && c.tiesioginis === true ? " (SPS: taikomas tiesioginis atsiskaitymas - trišalės sutarties projektas reikalingas)" : "") };
  }
  var KL_PRIEDAI = function (grupe) { return { id: "priedai_sar", grupe: grupe, tipas: "priedai", privalomas: true,
    klausimas: "Kurie pasirenkami priedai pridedami prie šios Sutarties?",
    uzuomina: "Rodomi tik priedai, kurių gali ir nereikėti. Nuimkite žymę nuo nereikalingo: jo eilutė sutartyje lieka su žodžiu „netaikoma“, todėl kitų priedų numeriai ir nuorodos į juos nesikeičia. Sutarties sąlygos, techninė specifikacija ar užduotis, pasiūlymas ir pirkimo dokumentai pridedami visada; kai kuriuos priedus lemia kiti atsakymai - jie išvardyti po sąrašu.",
    rodoma: function (c, R, Z) { return prieduSarasas(Z, c, R).some(function (p) { return !p.valdo; }); },
    siuloma: function (c, R, Z) { return prieduSiuloma(Z, c, R); } }; };
  /* Sprendimai: nepažymėtas (ir kitu klausimu nevaldomas) priedas - „netaikoma“ */
  function prieduSprendimai(Z, ctx, R, V, nust){
    prieduSarasas(Z, ctx, R).forEach(function (p) {
      if (p.valdo || p.pridedamas) return;
      nust(V.filter(function (x) { return x.raktas === "pr:" + p.nr; })[0], { netaikoma: true });
    });
  }
  /* ---------------------------------------------------------------- rangos SS etapų lentelė (naudotojo sprendimas 2026-10-13)
     Patikra su paskelbtais projektais: visuose rangos sutarčių projektuose etapų lentelė užpildyta. 2 žingsnyje - lentelės redaktorius:
     etapai (eilutės), perduodami darbai, perdavimo terminas, delspinigiai ir mokėjimo dalis. Atsakymas - JSON eilutė su eilutėmis
     [{ darbai, terminas, vnt, delspinigiai, dalis }]; tuščios eilutės pabaigoje į sutartį nepatenka. Stulpelis, kuris pagal kitus
     atsakymus netaikomas, sutartyje pašalinamas: „Delspinigių dydis“ - kai netesybos skaičiuojamos ne pagal etapus (SS 15 punktas),
     „Mokėtina suma“ - kai mokama ne pagal etapus (SS 12 punktas; taip nurodo formos „Pildymo sąlygos“). */
  var etapuSkyrius = function (Z) { return ((Z && Z.skyriai) || []).filter(function (k) { return k.lentele; })[0] || null; };
  function romenas(n){
    var o = "";
    [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]].forEach(function (p) { while (n >= p[0]) { o += p[1]; n -= p[0]; } });
    return o;
  }
  /* Redaktoriaus eilutės iš atsakymo (netinkamas ar tuščias atsakymas - nė vienos) */
  function etapuEilutes(R){
    var e = [];
    try { e = JSON.parse(String((R && R.etapu_lentele) || "[]")); } catch (x) { e = []; }
    return (Array.isArray(e) ? e : []).map(function (r) { r = r || {}; return { darbai: String(r.darbai || ""), terminas: String(r.terminas || ""), vnt: r.vnt === "d" ? "d" : "men",
                                                                                 delspinigiai: String(r.delspinigiai || ""), dalis: String(r.dalis || "") }; });
  }
  /* Kurie stulpeliai pildomi: delspinigiai - kai netesybos pagal etapus; mokėjimo dalis - kai mokama pagal etapus ir dalis įrašoma dabar */
  function etapuStulpeliai(R){
    return { delspinigiai: R.netesybos === "etapai", suma: R.apmokejimas_psr === "etapai", dalis: R.apmokejimas_psr === "etapai" && R.etapu_mokejimas === "dalys" };
  }
  /* Eilutės, patenkančios į sutartį: be tuščių eilučių pabaigoje (tuščia - be darbų, termino, delspinigių ir dalies) */
  function etapuNetuscios(R){
    var e = etapuEilutes(R), st = etapuStulpeliai(R);
    var tuscia = function (r) { return !r.darbai.trim() && !r.terminas.trim() && !(st.delspinigiai && r.delspinigiai.trim()) && !(st.dalis && r.dalis.trim()); };
    while (e.length && tuscia(e[e.length - 1])) e.pop();
    return e;
  }
  var etapoTerminas = function (r) { var n = skaicius(r.terminas); return n > 0 && n === Math.round(n) ? n + " " + (r.vnt === "d" ? forma(n, "diena", "dienos", "dienų") : "mėn.") : ""; };
  var etapoDalis = function (r) { var n = skaicius(r.dalis); return n > 0 && n <= 100 ? skLT(apvalink(n)) + " proc. Sutarties kainos be PVM" : ""; };
  /* Sprendimas generatoriui ir trūkstami laukai: { eilutes, beStulpeliu, truksta, perspejimai } */
  function etapuSprendimas(R, klausimas){
    var st = etapuStulpeliai(R), e = etapuNetuscios(R), truksta = [], perspejimai = [], dalys = 0;
    if (!e.length) return { eilutes: [], beStulpeliu: [], truksta: [], perspejimai: [] };   // neatsakyta - klausimą įvardija trukstami()
    var eil = e.map(function (r, k) {
      var et = romenas(k + 1) + " etapas", lang = { darbai: r.darbai.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean) };
      var nera = function (kas) { truksta.push(klausimas + " - " + et + ": " + kas); };
      if (!lang.darbai.length) nera("perduodami darbai");
      if (etapoTerminas(r)) lang.terminas = [etapoTerminas(r)]; else nera("perdavimo terminas (sveikas skaičius)");
      if (st.delspinigiai) { if (r.delspinigiai.trim()) lang.delspinigiai = [r.delspinigiai.trim()]; else nera("delspinigių dydis"); }
      if (st.dalis) { if (etapoDalis(r)) { lang.suma = [etapoDalis(r)]; dalys += skaicius(r.dalis); } else nera("mokėjimo dalis (procentais, iki 100)"); }
      // terminas ilgesnis už visų Darbų atlikimo terminą (SS 3 punktas, tais pačiais vienetais) - tik perspėjimas
      var n = skaicius(r.terminas), visu = skaicius(R.darbu_terminas);
      if (n > 0 && visu > 0 && r.vnt === (R.darbu_terminas_vnt || "men") && n > visu)
        pastaba(perspejimai, "Etapų lentelė: " + et.replace(/as$/, "o") + " perdavimo terminas (" + etapoTerminas(r) + ") ilgesnis už Darbų atlikimo terminą (SS 3 punktas).", [{ q: "etapu_lentele" }]);
      return { etikete: et, langeliai: lang };
    });
    if (st.dalis && !truksta.length && Math.abs(dalys - 100) > 0.005)
      pastaba(perspejimai, "Etapų lentelė: mokėjimo dalių suma - " + skLT(apvalink(dalys)) + " proc. Sutarties kainos be PVM (ne 100 proc.).", [{ q: "etapu_lentele" }]);
    return { eilutes: eil, beStulpeliu: (st.delspinigiai ? [] : ["delspinigiai"]).concat(st.suma ? [] : ["suma"]), truksta: truksta, perspejimai: perspejimai };
  }
  /* Redaktoriaus duomenys sąsajai: rodomos eilutės (bent formos eilučių skaičius, kol nieko neįrašyta) ir stulpeliai */
  function etapuRedaktorius(Z, R){
    var sk = etapuSkyrius(Z), st = etapuStulpeliai(R), e = etapuEilutes(R);
    if (!e.length) e = (sk ? sk.lentele.eilutes : [0]).map(function () { return { darbai: "", terminas: "", vnt: "men", delspinigiai: "", dalis: "" }; });
    return { eilutes: e.map(function (r, k) { return Object.assign({ etikete: romenas(k + 1) + " etapas" }, r); }), delspinigiai: st.delspinigiai, dalis: st.dalis };
  }

  /* Papildomi priedai prekių sutarties 15.4-15.5 punktuose (tušti formos laukai) */
  var laisviPriedai = function (Z) { return ((Z && Z.priedai) || []).filter(function (p) { return p.laisvas; }); };

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
    // 2026-10-13 (patikra su paskelbtais projektais): kai pristatymo terminas - pasiūlymų vertinimo kriterijus, jis įrašomas sudarant sutartį
    { id: "terminas_pasiulyme", grupe: "Sutarties trukmė ir terminai", tipas: "taipne", privalomas: true,
      klausimas: "Ar prekių pristatymo terminą pasiūlyme nurodo tiekėjas (4.1 punktas)?",
      uzuomina: "„Taip“ - kai pristatymo terminas yra pasiūlymų vertinimo kriterijus: 4.1 punkte termino vieta ir vienetas lieka pildyti sudarant sutartį pagal laimėjusį pasiūlymą. „Ne“ - terminą įrašote dabar.",
      rodoma: function (c, R) { return prekes(c) && R.pradzia !== "ts"; },
      siuloma: function (c) { return c.kriterijus === "kaina" ? { reiksme: "ne", kilme: "vertinimo kriterijus - kaina ar sąnaudos (SPS 8.1)" } : null; } },
    { id: "terminas", grupe: "Sutarties trukmė ir terminai", tipas: "skaicius", privalomas: true,
      klausimas: "Per kiek laiko tiekėjas turi pristatyti prekes ar suteikti paslaugas (4.1 punktas)?",
      uzuomina: "Skaičius; vieneto forma parenkama pagal skaičių (pvz. „per 1 mėnesį“, „per 3 mėnesius“).",
      vienetai: function (c) { return prekes(c) ? [{ id: "men", tekstas: "mėnesiai" }] : [{ id: "men", tekstas: "mėnesiai" }, { id: "d", tekstas: "dienos" }]; },
      rodoma: function (c, R) { return R.pradzia !== "ts" && !(prekes(c) && R.terminas_pasiulyme === "taip"); } },
    { id: "bendras_taikomas", grupe: "Sutarties trukmė ir terminai", tipas: "taipne", privalomas: true, rodoma: paslaugos,
      klausimas: "Ar nustatomas bendras paslaugų teikimo terminas (4.1 punktas)?",
      uzuomina: "„Taip“ - rašoma „Bendras Paslaugų teikimo terminas: 12 mėnesių.“; „Ne“ - šablono variantas „punktas netaikomas“.",
      laukai: [{ id: "bendras", tipas: "skaicius", uzrasas: "Bendras paslaugų teikimo terminas mėnesiais", kada: "taip" }] },
    { id: "pratesimo_aplinkybes", grupe: "Sutarties trukmė ir terminai", tipas: "taipne", privalomas: true, rodoma: paslaugos,
      klausimas: "Ar paslaugų suteikimo terminą galima pratęsti šablone išvardytomis aplinkybėmis (4.2 punktas)?",
      uzuomina: "„Taip“ - lieka šablono aplinkybių sąrašas (nepalankios oro sąlygos, Pirkėjo veiksmai ir kt., kaip prekių sutartyje); „Ne“ - „Netaikoma“.",
      siuloma: function () { return { reiksme: "taip", kilme: LITGRID + " (kaip prekių sutartyje)" }; } },
    KL_NUMERIS("Sutarties dalykas", "3.2 punktas"),
    { id: "es", grupe: "Sutarties dalykas", tipas: "taipne", privalomas: true,
      klausimas: "Ar pirkimas finansuojamas Europos Sąjungos lėšomis (3.3 punktas)?",
      laukai: [{ id: "es_nr", tipas: "tekstas", uzrasas: "Projekto numeris", kada: "taip" }, { id: "es_pav", tipas: "tekstas", uzrasas: "Projekto pavadinimas", kada: "taip" }] },

    { id: "kainodara", grupe: "Kaina ir atsiskaitymas", tipas: "variantai", privalomas: true, variantai: KAINODARA,
      klausimas: "Koks sutarties kainos apskaičiavimo būdas (5.1 punktas)?",
      uzuomina: "Šablono kainodaros sąrašas. Nuo jo priklauso pradinės sutarties vertės apibrėžimas (5.2), apmokėjimas (5.5.2), užsakymų tvarka ir termino pradžia." },
    { id: "kiekis", grupe: "Kaina ir atsiskaitymas", tipas: "taipne", privalomas: true, rodoma: function (c, R) { return ikainiai(R); },
      klausimas: "Ar Pirkėjas įsipareigoja nupirkti visą (maksimalų) kiekį (5.2 punktas)?",
      uzuomina: "„Taip“ - pradinė sutarties vertė lygi pasiūlymo kainai už maksimalų kiekį; „Ne“ - maksimaliai pirkimui skirtai lėšų sumai, Pirkėjas neįsipareigoja išpirkti viso kiekio." },
    KL_KAINA("Kaina ir atsiskaitymas", "5.2 punktas", function (c, R) { return ikainiai(R) && R.kiekis === "ne"; }),
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
      siuloma: function () { return { reiksme: "ne", kilme: LITGRID }; } },

    { id: "garantine", grupe: "Kokybė ir garantija", tipas: "variantai", privalomas: true, rodoma: prekes,
      klausimas: "Kokia garantinės priežiūros sąlyga (6.2 punktas)?",
      variantai: [{ id: "ts", tekstas: "Trūkumai šalinami per techninėje specifikacijoje nurodytą terminą, jei nenurodytas - ne ilgiau kaip per 10 dienų", re: /^Tiekėjas privalo pašalinti trūkumus/ },
                  { id: "atvykti", tekstas: "Tiekėjas atvyksta per nurodytą dienų skaičių nuo pranešimo", re: /^Garantinio termino laikotarpiu/ }],
      laukai: [{ id: "atvykti_d", tipas: "skaicius", uzrasas: "Per kiek dienų atvyksta", kada: "atvykti" }],
      siuloma: function () { return { reiksme: "ts", kilme: LITGRID }; } },
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
      uzuomina: "„Ne“ - užtikrinama tik netesybomis, 8.2 ir 8.3 punktai netaikomi. „Taip“ - 8.2: užtikrinimo galiojimo terminas ne trumpesnis nei sutarties galiojimo terminas, 8.3: dydis procentais.",
      vidausRiba: { ne: "ne" },
      laukai: [{ id: "procentai", tipas: "skaicius", uzrasas: "Užtikrinimo dydis, procentais nuo Pradinės sutarties vertės be PVM", kada: "taip", siuloma: true }],
      siuloma: function (c) { return c.uztikrinimas && c.uztikrinimas.taikomas != null ? { reiksme: c.uztikrinimas.taikomas ? "taip" : "ne", kilme: "SPS sutarties įvykdymo užtikrinimas" } : null; } },
    { id: "delspinigiai", grupe: "Užtikrinimas ir atsakomybė", tipas: "variantai", privalomas: true,
      klausimas: "Delspinigių dydis (9.2.1-9.2.2 punktai)",
      variantai: [{ id: "sablono", tekstas: "Šablono 0,02 proc. (nurodymas „(arba nurodyti kitą skaičių)“ pašalinamas)" }, { id: "kitas", tekstas: "Kitas - pakeisiu Word programoje" }],
      siuloma: function () { return { reiksme: "sablono", kilme: LITGRID }; } },
    { id: "bauda_nutraukus", grupe: "Užtikrinimas ir atsakomybė", tipas: "variantai", privalomas: true,
      klausimas: "Bauda nutraukus sutartį dėl Tiekėjo kaltės (9.3 punktas)",
      variantai: [{ id: "litgrid", tekstas: "LITGRID: 5 proc. Pradinės sutarties vertės, ne mažiau kaip 3000 Eur" }, { id: "kita", tekstas: "Kitas šablono (VPT) variantas - pildysiu Word programoje" }],
      siuloma: function () { return { reiksme: "litgrid", kilme: LITGRID }; } },
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
                  { id: "iki", tekstas: "Iki nurodytos datos ar termino", re: /^iki / },
                  { id: "kita", tekstas: "Kita formuluotė (formos sąraše jos nėra)" }],
      uzuomina: "Formos 11.1.2 punkto sąrašas: 6, 12, 24, 36 mėnesiai arba „iki ...“. „Kita formuluotė“ įrašoma sakinio „... terminas negali būti ilgesnis kaip ...“ gale, pvz. „4.1 punkte nurodytas terminas“ (kai terminą pasiūlyme nurodo tiekėjas). Tikrinant dokumentą be generavimo paso ji rodoma kaip tekstas ne iš formos sąrašo.",
      laukai: [{ id: "iki_tekstas", tipas: "tekstas", uzrasas: "Iki (pvz. 2028-12-31)", kada: "iki" },
               { id: "galiojimas_kita", tipas: "tekstas", uzrasas: "Formuluotė (be taško gale)", kada: "kita" },
               { id: "galiojimas_kitaEN", tipas: "tekstas", uzrasas: "Formuluotė angliškai", kada: "kita", tikLTEN: true }],
      siuloma: function (c, R) { var n = skaicius(R.trukme); return n && [6, 12, 24, 36].indexOf(n) >= 0 ? { reiksme: String(n), kilme: "sutarties trukmė" } : null; } },
    { id: "pratesimas", grupe: "Esminės sąlygos, galiojimas, pratęsimas", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutarties galiojimo terminą galima pratęsti (11.2 punktas)?",
      uzuomina: "„Ne“ - „Netaikoma“. „Taip“ - lieka VPT nuostata su pasirenkamomis sąlygomis ir šablono nurodymais; jas sutvarkykite Word programoje (patikra jas išvardys)." },

    { id: "zalieji", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutarties vykdymui nustatomi žaliųjų pirkimų tvarkos aprašo aplinkos apsaugos kriterijai (13.1 punktas)?",
      uzuomina: "„Taip“ - įrašykite Aplinkos apsaugos kriterijų taikymo, vykdant žaliuosius pirkimus, tvarkos aprašo 4 punkto papunktį: 4.1 - produktas yra produktų sąraše ir atitinka minimalius kriterijus, 4.2 - I tipo ekologinis ženklas, 4.3 - tiekėjas paslaugai ar darbui taiko aplinkos apsaugos vadybos sistemą (LST EN ISO 14001, EMAS), 4.4.3 - nematerialios (intelektinės) paslaugos, 4.4.4 - aplinkos apsaugos kriterijus nustatote savarankiškai (4.4.4.1-4.4.4.5 - principas). Kai SPS žaliųjų reikalavimų dalis tai lemia, papunktis siūlomas.",
      siuloma: function (c) { var z = zalSiulymas(c); return z ? { reiksme: "taip", kilme: z.kodel } : null; },
      laukai: [{ id: "zalieji_p", tipas: "tekstas", uzrasas: "Tvarkos aprašo papunktis (pvz. 4.4.4)", kada: "taip",
                 siuloma: function (c) { var z = zalSiulymas(c); return z && z.p ? { reiksme: z.p, kilme: z.kodel } : null; } }],
      pastaba: function (c) { var z = c.zaliejiSPS; return z ? "SPS žaliųjų reikalavimų dalyje pasirinkta: " + z.map(function (k) { return "„" + ZAL_SPS[k] + "“"; }).join(", ") + "." : ""; } },
    { id: "pakavimas", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true, rodoma: prekes,
      klausimas: "Ar taikomas LITGRID kriterijus dėl prekių pakuočių (13.2 punktas - pakavimo lapas)?" },
    { id: "pristatymas", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true, rodoma: prekes,
      klausimas: "Ar taikomi LITGRID kriterijai dėl prekių pristatymo (13.3 punktas - pristatymo laikas, netaršios transporto priemonės)?" },
    { id: "montavimas", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true, rodoma: prekes,
      klausimas: "Ar taikomas LITGRID kriterijus dėl su prekėmis susijusių paslaugų (13.4 punktas - atliekų rūšiavimas montuojant)?" },
    { id: "socialiniai", grupe: "Aplinkos ir socialiniai kriterijai", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutarties vykdymui nustatomi socialiniai kriterijai?",
      uzuomina: "„Taip“ - įrašykite kriterijus (šablono rekomendacija - Socialiai atsakingų pirkimų gairių pavyzdžiai). Kai SPS yra socialinių reikalavimų dalis (tiekėjas jų atitiktį deklaruoja pasiūlyme), siūloma ta pati formuluotė kaip paskelbtuose LITGRID projektuose.",
      siuloma: function (c) { return c.socialiniaiSPS === true ? { reiksme: "taip", kilme: SOC_KILME } : null; },
      laukai: [{ id: "socialiniai_f", tipas: "formuluote", uzrasas: "Socialiniai kriterijai", kada: "taip",
                 siuloma: function (c) { return c.socialiniaiSPS === true ? { reiksme: SOC_LT, kilme: SOC_KILME } : null; } },
               Object.assign(en("socialiniai_fEN", "Kriterijai angliškai"), { siuloma: function (c, R) { return c.socialiniaiSPS === true && String(R.socialiniai_f || "").trim() === SOC_LT ? { reiksme: SOC_EN, kilme: "ta pati formuluotė angliškai" } : null; } })] },
    // 14.3 (naujo darbuotojo patikra 2026-10-20; naudotojo sprendimas 2026-10-21): atskiras klausimas - iki tol atsakymas imtas iš 1 žingsnio
    // klausimo apie nacionalinį saugumą, nors šis punktas apie darbuotojų patekimą prie Pirkėjo įrenginių; 1 žingsnio atsakymas tik parodomas
    { id: "patekimas", grupe: "Kita", tipas: "taipne", privalomas: true,
      klausimas: "Ar Tiekėjo ar subtiekėjų darbuotojams reikės teisės be palydos patekti prie Pirkėjo valdomų nacionaliniam saugumui užtikrinti svarbių įrenginių ar turto (14.3 punktas)?",
      uzuomina: "„Taip“ - 14.3 punktas taikomas: tokie darbuotojai turi atitikti Nacionaliniam saugumui užtikrinti svarbių objektų apsaugos įstatymo kriterijus, o Tiekėjas sudaręs Sutartį pateikia jų sutikimus būti tikrinamiems. „Ne“ - „Punktas netaikomas.“",
      pastaba: function (c) {
        if (c.nacsaug !== true && c.nacsaug !== false) return "";
        return "1 žingsnyje atsakyta, kad pirkimo objektas " + (c.nacsaug ? "susijęs" : "nesusijęs") + " su nacionaliniu saugumu. Tai kitas klausimas (apie pirkimo objektą), todėl į šį atsakykite atskirai.";
      } },
    { id: "tinklo", grupe: "Kita", tipas: "taipne", privalomas: true,
      klausimas: "Ar tiekėjas dirbs veikiančiuose elektros perdavimo tinklo objektuose ar jų apsaugos zonoje (14.4 punktas)?",
      uzuomina: "„Taip“ - reikalingas Pirkėjo sutikimas dirbti (14.4.1-14.4.4) ir 9.10 bauda; „Ne“ - punktas ir bauda netaikomi." },
    // 2.1 Pirkėjo kontaktiniai asmenys - nebeklausiama (2026-10-16, naudotojo sprendimas): paaiškėja tik po pirkimo, pildoma sudarant sutartį
    { id: "cvp_adresas", grupe: "Kita", tipas: "tekstas", privalomas: false, rodoma: paslaugos,
      klausimas: "Kokiu adresu skelbiami pirkimo dokumentai (15.2 punktas)?",
      uzuomina: "CVP IS pirkimo adresas. Neįrašius - lieka šablono teksto laukas." },
    KL_PRIEDAI("Sutarties priedai (15 skyrius)"),
    { id: "papildomi_priedai", grupe: "Sutarties priedai (15 skyrius)", tipas: "taipne", privalomas: false, rodoma: function (c, R, Z) { return laisviPriedai(Z).length > 0; },
      klausimas: "Ar prie Sutarties pridedami papildomi priedai (15.4 ir 15.5 punktai)?",
      uzuomina: "Neprivaloma. Formoje šie du punktai palikti tušti; neatsakius ar atsakius „Ne“ abiejuose įrašoma „Netaikoma“. Paskelbtuose LITGRID prekių projektuose čia dažniausiai pridedamas trišalės sutarties dėl tiesioginio atsiskaitymo projektas (3 iš 4), o reikalaujant banko garantijos - priimtinų bankų ir draudimo bendrovių sąrašas. Pavadinimai - kiekvienas atskiroje eilutėje, ne daugiau kaip du.",
      siuloma: function (c, R) { var p = papildomiSiulomi(c, R); return p.length ? { reiksme: "taip", kilme: p.map(function (x) { return x.kodel; }).join("; ") } : null; },
      laukai: [{ id: "papildomi_priedai_f", tipas: "formuluote", uzrasas: "Papildomų priedų pavadinimai - kiekvienas atskiroje eilutėje", kada: "taip",
                 siuloma: function (c, R) { var p = papildomiSiulomi(c, R); return p.length ? { reiksme: p.map(function (x) { return x.lt; }).join("\n"), kilme: p.map(function (x) { return x.kodel; }).join("; ") } : null; } },
               { id: "papildomi_priedai_fEN", tipas: "formuluote", uzrasas: "Tie patys pavadinimai angliškai - ta pačia tvarka", kada: "taip", tikLTEN: true,
                 // angliškai - tik kai lietuviškai liko siūlomi pavadinimai (įrašius savus - angliškus įrašote patys)
                 siuloma: function (c, R) { var p = papildomiSiulomi(c, R); return p.length && String(R.papildomi_priedai_f || "").trim() === p.map(function (x) { return x.lt; }).join("\n")
                   ? { reiksme: p.map(function (x) { return x.en; }).join("\n"), kilme: "tie patys priedai angliškai" } : null; } }] }
  ];

  /* ---------------------------------------------------------------- projektavimo ir statybos rangos SS (2026-10-10, 3 etapas S4)
     Šablone - „//“ nurodymai, „arba“ ir „Turi būti pasirinkta:“ (žemėlapio blokai): klausimai - po vieną kiekvienam nurodymui ar
     pasirinkimui, SS punktų tvarka. Kur šablonas nenurodo, ką rašyti, kai punktas netaikomas, - „Punktas netaikomas.“ (NETAIKOMAS). */
  var PSR = function (c) { return c.seima === "PROJEKTAVIMO_STATYBOS"; };
  /* Statybos rangos SS (2026-10-12, 6 etapas S4): ta pati forma be projektavimo - klausimai ir sprendimai bendri abiem rangos šeimoms
     (RANGA), skiriasi tik SS „Papildomų sąlygų“ ir BS punktų numeriai, priedų pavadinimai ir ekspertizės punktas (jo statybos rangos
     formoje nėra). 1-21 SS punktai abiejose formose tie patys. */
  var SR = function (c) { return c.seima === "STATYBOS_RANGOS"; };
  var RANGA = function (c) { return PSR(c) || SR(c); };
  var RANGOS = {
    PROJEKTAVIMO_STATYBOS: { ss: { ekspertize: 22, atjungimai: 23, uztikrinimas: 24, garantinis: 25, esmines: 26, sprogmenys: 27, koord: 28 },
      bs: { irenginiai: "4.9.8", demontuoti: "4.6.2", dalinis: "5.9.5", es: "11.11", investicinis: "11.9.2", breziniai: "4.1.2", pagrindiniai: "4.10.2",
            atjungimai: "4.5.1", uztikrinimas: "9.7", garantinis: "9.9", sprogmenys: "4.1.12-4.1.14", koord: "5.2.5" },
      etapuPriedas: "Projektavimo ir statybos darbų etapai", techninePriedas: "Techninė užduotis / projektavimo užduotis", technineNurodymas: "" },
    STATYBOS_RANGOS: { ss: { ekspertize: null, atjungimai: 22, uztikrinimas: 23, garantinis: 24, esmines: 25, sprogmenys: 26, koord: 27 },
      bs: { irenginiai: "3.9.8", demontuoti: "3.6.2", dalinis: "4.9.5", es: "10.11", investicinis: "10.9.2", breziniai: "3.1.2", pagrindiniai: "3.10.2",
            atjungimai: "3.5.1", uztikrinimas: "8.7", garantinis: "8.9", sprogmenys: "3.1.12-3.1.14", koord: "4.2.5" },
      etapuPriedas: "Statybos darbų etapai", techninePriedas: "Techninė užduotis / Projektas", technineNurodymas: "Prijungimo sąlygos, " }
  };
  var rangosVariantas = function (c) { return RANGOS[(c || {}).seima] || RANGOS.PROJEKTAVIMO_STATYBOS; };
  /* Kai šablonas nenurodo, ką rašyti punktui netaikant (SS 4, 6, 8, 9, 18), - ta pati formuluotė kaip paslaugų SS 13.1-13.2
     (naudotojo sprendimai 2026-10-08 ir 2026-10-10); 1-19 punktai lieka visi, todėl jų numeriai visose sutartyse tie patys. */
  var NETAIKOMAS = "Punktas netaikomas.";
  var maza = function (s) { return String(s || "").toLowerCase(); };
  var RIBA = "(^|[^a-ząčęėįšųūž0-9])";
  var TP = new RegExp(RIBA + "(tp|transformatorių pastot|pastot|skirstykl)", "i");
  function darbuMen(R){ var n = skaicius(R.darbu_terminas); if (!n) return null; return (R.darbu_terminas_vnt || "men") === "d" ? n / 30 : n; }
  function rangosKlausimai(v){ var q = [
    KL_NUMERIS("Pagrindinės sąlygos", "sutarties įžanga"),
    { id: "objektas", grupe: "Pagrindinės sąlygos", tipas: "formuluote", privalomas: true,
      klausimas: "Koks statinys statomas, rekonstruojamas ar remontuojamas (SS 1 punktas „Objektas“)?",
      uzuomina: "Šablono nurodymas: „nurodomas statomas, rekonstruojamas, arba remontuojamas statinys“. Įrašytas tekstas - ir etapų priedo antraštėje vietoje „[OBJEKTAS]“." },
    { id: "technine", grupe: "Pagrindinės sąlygos", tipas: "formuluote", privalomas: true,
      klausimas: "Kur pateikiama Techninė užduotis ar Projektas (SS 2 punktas)?",
      uzuomina: "Šablono nurodymas: priedas, kuriame pateikiama Techninė užduotis, " + v.technineNurodymas + "Projekto pavadinimas, data, statybos leidimas, arba nuoroda į CVP IS.",
      siuloma: function (c, R, Z) { var nr = priedoNr(Z, R, /^Techninė užduotis/); return nr ? { reiksme: "Sutarties specialiųjų sąlygų priedas Nr. " + nr + " „" + v.techninePriedas + "“.",
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
      klausimas: "Ar Darbai atliekami etapais (SS 4 punktas ir priedas „" + v.etapuPriedas + "“)?",
      uzuomina: "„Taip“ - 4 punktas lieka su priedo numeriu; etapų lentelę (perduodami darbai, perdavimo terminai, delspinigiai, mokėtinos sumos) užpildysite šio žingsnio grupėje „Etapų priedas“ arba Word programoje. „Ne“ - 4 punkte įrašoma „Punktas netaikomas.“ (BS 2.2.3 - etapai taikomi, kai jie nurodyti Sutartyje), o etapų priedas ir jo eilutė priedų sąraše pašalinami, kiti priedai pernumeruojami." },

    { id: "pagrindiniai", grupe: "Darbai", tipas: "formuluote", privalomas: true,
      klausimas: "Kokie Pagrindiniai įrenginiai (SS 5 punktas)?",
      uzuomina: "Pagrindinių įrenginių sąrašas arba priedas, kuriame jis pateikiamas (šablono nurodymas: sąrašą parengia Technikos skyrius)." },
    { id: "uzsakovo_irenginiai", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar Užsakovas Darbams pateikia Įrenginius ir Medžiagas (SS 6 punktas, BS " + v.bs.irenginiai + ")?",
      uzuomina: "BS " + v.bs.irenginiai + " taikomas, kai Sutartyje nurodyta, kad Įrenginius ir (arba) Medžiagas pateikia Užsakovas. „Taip“ - įrašykite, kokius ir kur jie perduodami; „Ne“ - 6 punkte įrašoma „Punktas netaikomas.“",
      laukai: [{ id: "uzsakovo_irenginiai_f", tipas: "formuluote", uzrasas: "Įrenginiai ir medžiagos arba priedas, kuriame jie nurodyti", kada: "taip" },
               { id: "uzsakovo_irenginiu_vieta", tipas: "tekstas", uzrasas: "Kur Užsakovas juos perduos (vieta, adresas)", kada: "taip" }] },
    { id: "fizine_sauga", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar Darbams taikomi papildomi fizinės saugos reikalavimai (SS 7 punktas)?",
      uzuomina: "„Ne“ - įrašoma „Papildomi fizinės saugos reikalavimai Darbams netaikomi.“ (šablono nurodymas). „Taip“ - įrašykite reikalavimus (šablonas: juos parengia Fizinės saugos skyrius).",
      laukai: [{ id: "fizine_sauga_f", tipas: "formuluote", uzrasas: "Papildomi fizinės saugos reikalavimai", kada: "taip" }] },
    { id: "demontuoti", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar Rangovas turės pristatyti demontuotus tolimesniam naudojimui tinkamus įrenginius, konstrukcijas ir medžiagas (SS 8 punktas, BS " + v.bs.demontuoti + ")?",
      uzuomina: "„Taip“ - įrašykite adresą, kur juos pristatyti; „Ne“ - 8 punkte įrašoma „Punktas netaikomas.“",
      laukai: [{ id: "demontuoti_adresas", tipas: "tekstas", uzrasas: "Pristatymo adresas", kada: "taip" }] },
    { id: "dalinis", grupe: "Darbai", tipas: "taipne", privalomas: true,
      klausimas: "Ar už nesumontuotus Įrenginius ir jiems įrengti būtinas Medžiagas mokama iš dalies (SS 9 punktas, BS " + v.bs.dalinis + " c ir d papunkčiai)?",
      uzuomina: "Šablono nurodymas: už SS nurodytus nesumontuotus Įrenginius ir Medžiagas, įtrauktus į Atliktų darbų aktą pagal Darbų žiniaraštį, apmokama 70 % jų kainos. „Taip“ - įrašykite jų sąrašą arba priedą (su būtinais dokumentais ir apmokėjimo dydžiu procentais). „Ne“ - įrašoma „Punktas netaikomas.“ (BS " + v.bs.dalinis + " c taikomas tik specialiosiose sąlygose nurodytiems Įrenginiams).",
      laukai: [{ id: "dalinis_f", tipas: "formuluote", uzrasas: "Įrenginių ir Medžiagų sąrašas arba priedas", kada: "taip" }] },

    // SS 10 Užsakovo atstovas ir atsakingas už Sutarties paskelbimą - nebeklausiama (2026-10-16, naudotojo sprendimas dėl prekių ir paslaugų SS 2.1:
    // asmenys paaiškėja tik po pirkimo; taisyklė visoms sutartims - Šalių atstovai pildomi sudarant)

    KL_KAINA("Kaina ir apmokėjimas", "SS 11 punktas"),
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
      klausimas: "Ar Darbus numatoma finansuoti Europos Sąjungos fondų (programų) lėšomis (SS 14 punktas, BS " + v.bs.es + ")?",
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
      klausimas: "Ar Darbai vykdomi pagal Užsakovo investicinį projektą (SS 18 punktas, BS " + v.bs.investicinis + ")?",
      uzuomina: "BS " + v.bs.investicinis + ": dokumentuose įrašomas investicinio projekto pavadinimas ir numeris (jei toks numatytas). „Ne“ - įrašoma „Punktas netaikomas.“",
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
      uzuomina: "Šablono lentelės „Turi būti pasirinkta:“ variantai. TP projektuose šablono terminai nurodyti pastočių skirstyklų elektros įrenginių (E) daliai ir pirminių įrenginių bei savųjų reikmių daliai - šie žodžiai lieka; nurodymai „(pasirenkama ...)“ pašalinami. TP projekte kitoms dalims lentelė termino nenustato - joms galioja bendrosios sąlygos: gamybos ir montavimo brėžiniams 15 ir 10 darbo dienų (BS " + v.bs.breziniai + "), Pagrindiniams įrenginiams 10 ir 5 darbo dienos (BS " + v.bs.pagrindiniai + ").",
      siuloma: function (c) {
        var t = maza(c.pavadinimas);
        if (!TP.test(t)) return null;
        return /330\s*kv/.test(t) ? { reiksme: "tp330", kilme: "pirkimo pavadinime - 330 kV ir transformatorių pastotė ar skirstykla" }
             : /\d+\s*kv/.test(t) ? { reiksme: "tp", kilme: "pirkimo pavadinime - transformatorių pastotė ar skirstykla, ne 330 kV" } : null; } },
    { id: "ekspertize", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar Techninio darbo projekto ekspertizės aktą Užsakovo pasamdyti ekspertai pateiks ne per 20 darbo dienų, o per kitą terminą (SS " + v.ss.ekspertize + " punktas, BS 3.3.10)?",
      uzuomina: "„Taip“ - įrašomas BS 3.3.10 punkto ketvirto sakinio pakeitimas su jūsų terminu; „Ne“ - punktas neįrašomas.",
      laukai: [{ id: "ekspertizes_dienos", tipas: "skaicius", uzrasas: "Per kiek darbo dienų", kada: "taip" }] },
    { id: "atjungimai", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar nustatomi konkretūs ilgiausi atjungimo terminai (SS " + v.ss.atjungimai + " punktas, BS " + v.bs.atjungimai + " papildymas)?",
      uzuomina: "„Taip“ - įrašomas šablono punktas (jungtuvų prijungimui - dvi savaitės; elektros oro linijų remontui ir rekonstrukcijai - viena diena trijų atramų darbams) ir, jei įrašysite, kiti terminai. „Ne“ - punktas neįrašomas.",
      laukai: [{ id: "atjungimai_kiti", tipas: "tekstas", uzrasas: "Kiti atjungimo terminai (neprivaloma; vietoje „[...]“)", kada: "taip", neprivalomas: true }] },
    { id: "uztikrinimas_psr", grupe: "Papildomos sąlygos", tipas: "variantai", privalomas: true,
      klausimas: "Kaip užtikrinamas Sutarties įvykdymas (SS " + v.ss.uztikrinimas + " punktas, BS " + v.bs.uztikrinimas + ")?",
      variantai: [{ id: "netaikomas", tekstas: "Užtikrinimas netaikomas - Sutarties įvykdymas užtikrinamas netesybomis (šablonas: nedidelės vertės remonto darbai, derinti su Pirkimų skyriumi)" },
                  { id: "iki", tekstas: "10 % Sutarties kainos (be PVM) - Rangovas renkasi lėšų deponavimą, banko garantiją ar draudimo bendrovės laidavimą (pirkimams iki vidaus taisyklėse nustatytos ribos)" },
                  { id: "virs", tekstas: "10 % Sutarties kainos (be PVM) - lėšų deponavimas arba banko garantija (pirkimams virš vidaus taisyklėse nustatytos ribos)" }],
      vidausRiba: { ne: "netaikomas", iki: "iki", virs: "virs" },
      siuloma: function (c) { return c.uztikrinimas && c.uztikrinimas.taikomas === false ? { reiksme: "netaikomas", kilme: "SPS: sutarties įvykdymo užtikrinimas nereikalaujamas" } : null; },
      pastaba: function (c) {
        var u = c.uztikrinimas;
        if (!u || u.taikomas !== true) return "";
        var pr = u.eur > 0 && c.verte > 0 ? " (" + u.eur + " Eur, " + skLT(apvalink(u.eur / c.verte * 100)) + " % numatomos vertės)" : "";
        return "SPS: užtikrinimas reikalaujamas" + pr + ". Kuris variantas - pagal vidaus taisyklėse nustatytą ribą (žr. žemiau).";
      } },
    { id: "garantinis", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar įrašyti, kad BS " + v.bs.garantinis + " punktas „Garantinių įsipareigojimų užtikrinimas“ netaikomas (SS " + v.ss.garantinis + " punktas)?",
      uzuomina: "Šablono nurodymas: įrašoma, kai atliekami nedidelės vertės remonto darbai (derinti su Pirkimų skyriumi). „Taip“ - punktas įrašomas; „Ne“ - neįrašomas (BS " + v.bs.garantinis + " taikomas)." },
    { id: "esmines_psr", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar sutartyje nustatomos esminės sutarties sąlygos (SS " + v.ss.esmines + " punktas)?",
      uzuomina: "Šablono nurodymas: įrašomos Sutarties sąlygos, dėl kurių pažeidimo būtų nutraukta Sutartis. „Taip“ - lieka „Esminėmis yra laikomos šios Sutarties sąlygos:“ ir jūsų sąlygos (kiekviena eilutė - atskira pastraipa); „Ne“ - punktas neįrašomas.",
      laukai: [{ id: "esmines_psr_f", tipas: "formuluote", uzrasas: "Esminės sutarties sąlygos", kada: "taip" }] },
    { id: "sprogmenys", grupe: "Papildomos sąlygos", tipas: "taipne", privalomas: true,
      klausimas: "Ar prieš pradedant žemės darbus Objekte bus vykdoma nesprogusių karo laikų sprogmenų paieška (SS " + v.ss.sprogmenys + " punktas, BS " + v.bs.sprogmenys + ")?",
      uzuomina: "„Taip“ - įrašomas šablono punktas; „Ne“ - neįrašomas." },
    { id: "koordinatorius", grupe: "Papildomos sąlygos", tipas: "variantai", privalomas: true,
      klausimas: "Ar saugos ir sveikatos koordinatorius skiriamas iš Rangovo deleguotų asmenų (SS " + v.ss.koord + "-" + (v.ss.koord + 1) + " punktai, BS " + v.bs.koord + ")?",
      variantai: [{ id: "ne", tekstas: "Ne - punktai neįrašomi" },
                  { id: "p28", tekstas: "Taip - tik " + v.ss.koord + " punktas (esant BS " + v.bs.koord + " punkte numatytoms sąlygoms)" },   // id - istorinis (rangos SS 28 p.)
                  { id: "abu", tekstas: "Taip - " + v.ss.koord + " ir " + (v.ss.koord + 1) + " punktai (" + (v.ss.koord + 1) + ": kandidatūros pateikimas per 5 dienas ir nepriklausomo veikimo įsipareigojimas)" }],
      uzuomina: "Sąvoka „Koordinatorius“ apibrėžta " + v.ss.koord + " punkte, o " + (v.ss.koord + 1) + " punktas ją vartoja, todėl " + (v.ss.koord + 1) + " punktas vienas neįrašomas. Kitas nuostatas („pagal poreikį įrašomos kitos nuostatos“) įrašysite Word programoje." },
    KL_PRIEDAI("Priedai"),
    // 2026-10-13 (patikra su paskelbtais projektais): formos eilutė „Kiti priedai (išvardijami prieš paskelbiant Pirkimą).“ likdavo sutartyje
    { id: "kiti_priedai", grupe: "Priedai", tipas: "taipne", privalomas: true,
      klausimas: "Ar prie Sutarties pridedami kiti priedai, kurių formos priedų sąraše nėra (paskutinė priedų sąrašo eilutė „Kiti priedai“)?",
      uzuomina: "Formos nurodymas: „išvardijami prieš paskelbiant Pirkimą“. „Taip“ - kiekvienas jūsų įrašytas priedas tampa atskira numeruota priedų sąrašo eilute (vietoje eilutės „Kiti priedai“ ir po jos). „Ne“ - eilutėje įrašoma „" + KITI_PRIEDAI_NETAIKOMA + "“ (kitų priedų numeriai nesikeičia).",
      laukai: [{ id: "kiti_priedai_f", tipas: "formuluote", uzrasas: "Kitų priedų pavadinimai - kiekvienas atskiroje eilutėje", kada: "taip" }] },
    // Etapų priedo lentelė (2026-10-13): grupė - pabaigoje, nes stulpeliai priklauso nuo SS 12 ir 15 punktų atsakymų
    { id: "etapu_pildymas", grupe: "Etapų priedas", tipas: "variantai", privalomas: true,
      klausimas: "Kur užpildysite etapų lentelę (priedas „" + v.etapuPriedas + "“)?",
      variantai: [{ id: "cia", tekstas: "Čia - etapus įrašau dabar; sugeneruotame priede lentelė bus užpildyta" },
                  { id: "word", tekstas: "Word programoje - sugeneruotame priede lieka tuščia lentelė ir jos „Pildymo sąlygos“" }],
      uzuomina: "Pasirinkus „Čia“, lentelė užpildoma iš jūsų atsakymų, o formos „Pildymo sąlygos“ (nurodymai rengėjui) iš priedo pašalinamos. Pastabas po lentele, jei jų reikia, pridėkite Word programoje.",
      rodoma: function (c, R, Z) { return R.etapai === "taip" && !!etapuSkyrius(Z); } },
    { id: "etapu_delspinigiai", grupe: "Etapų priedas", tipas: "variantai", privalomas: true,
      klausimas: "Nuo ko skaičiuojami delspinigiai už laiku neperduotą Darbų etapą (lentelės stulpelis „Delspinigių dydis“)?",
      variantai: [{ id: "sutarties", tekstas: "Procentinė dalis nuo Sutarties kainos be PVM" },
                  { id: "etapo", tekstas: "Procentinė dalis nuo Darbų etapo kainos be PVM" },
                  { id: "atskirai", tekstas: "Kiekvienam etapui nurodau atskirai (procentinė dalis arba suma eurais už dieną)" }],
      uzuomina: "Formos nurodymas stulpelio antraštėje: „rengiant sutartį pasirenkama: procentinė dalis nuo Sutarties kainos be PVM arba Darbų etapo kainos be PVM už kiekvieną pradelstą dieną“ - antraštėje lieka pasirinktas variantas. Formos „Pildymo sąlygos“ leidžia ir fiksuotą sumą už dieną - tada rinkitės trečią atsakymą (antraštėje lieka „už kiekvieną pradelstą dieną“).",
      rodoma: function (c, R, Z) { return R.etapai === "taip" && !!etapuSkyrius(Z) && R.etapu_pildymas === "cia" && R.netesybos === "etapai"; } },
    { id: "etapu_mokejimas", grupe: "Etapų priedas", tipas: "variantai", privalomas: true,
      klausimas: "Kaip etapų lentelėje nurodomos mokėtinos sumos (stulpelis „Mokėtina suma“)?",
      variantai: [{ id: "dalys", tekstas: "Mokėjimo dalimi procentais nuo Sutarties kainos be PVM - įrašau dabar" },
                  { id: "sudarant", tekstas: "Sumomis eurais - įrašomos sudarant sutartį pagal laimėjusį pasiūlymą" }],
      uzuomina: "Sumos eurais prieš pirkimą nežinomos (jos priklauso nuo laimėjusio pasiūlymo kainos). Pasirinkus mokėjimo dalį, langelyje rašoma, pvz., „20 proc. Sutarties kainos be PVM“; stulpelio antraštė lieka kaip formoje.",
      rodoma: function (c, R, Z) { return R.etapai === "taip" && !!etapuSkyrius(Z) && R.etapu_pildymas === "cia" && R.apmokejimas_psr === "etapai"; } },
    { id: "etapu_lentele", grupe: "Etapų priedas", tipas: "lentele", privalomas: true,
      klausimas: "Kokie Darbų etapai (etapų lentelės eilutės)?",
      uzuomina: function (c, R) {
        var st = etapuStulpeliai(R);
        return "Kiekvienam etapui - perduodami darbai (kiekviena jūsų eilutė lentelėje bus atskira pastraipa) ir perdavimo terminas nuo Sutarties sudarymo dienos. Formos „Pildymo sąlygos“: galima papildomai išskirti etapą, skirtą dokumentacijos sutvarkymui. Tuščios eilutės pabaigoje į sutartį nepatenka." +
          (st.delspinigiai ? "" : " Stulpelis „Delspinigių dydis“ iš lentelės pašalinamas, nes netesybos skaičiuojamos ne pagal etapus (SS 15 punkto atsakymas).") +
          (st.suma ? "" : " Stulpelis „Mokėtina suma“ iš lentelės pašalinamas, nes Sutarties kaina mokama ne pagal Darbų etapus (SS 12 punkto atsakymas) - taip nurodo formos „Pildymo sąlygos“.");
      },
      rodoma: function (c, R, Z) { return R.etapai === "taip" && !!etapuSkyrius(Z) && R.etapu_pildymas === "cia"; } }
  ];
    return q.filter(function (x) { return x.id !== "ekspertize" || v.ss.ekspertize; });
  }
  var KLAUSIMAI_PSR = rangosKlausimai(RANGOS.PROJEKTAVIMO_STATYBOS), KLAUSIMAI_SR = rangosKlausimai(RANGOS.STATYBOS_RANGOS);

  /* ---------------------------------------------------------------- projektavimo paslaugų SS (2026-10-11, 4 etapas S4)
     Šablone pildomos vietos pažymėtos geltonai ir laužtiniais skliaustais, pasirinkimas - toje pačioje pastraipoje („[pasirinkti vieną]“).
     Naudotojo taisyklė (2026-10-11): sutarties projektas rengiamas prieš pirkimą - tiekėjo duomenų, kainos ir atstovų neklausiama, jie
     pildomi sudarant sutartį. Netaikomame punkte - „Punktas netaikomas.“ (punktų numeriai visose sutartyse tie patys), 12 priedo eilutė,
     kai patikra neatliekama, lieka su žodžiu „netaikoma“ (naudotojo sprendimai 2026-10-11). */
  var PPS = function (c) { return c.seima === "PROJEKTAVIMO_PASLAUGOS"; };
  var PP_PRIEZIUROS_KAINA = "Projekto vykdymo priežiūros paslaugų kaina - netaikoma.";
  var OL = new RegExp(RIBA + "(oro linij[a-ząčęėįšųūž]*|ol)([^a-ząčęėįšųūž0-9]|$)", "i");
  var KLAUSIMAI_PPS = [
    KL_NUMERIS("Bendrosios nuostatos ir sutarties dalykas", "sutarties įžanga"),
    { id: "pp_investicinis", grupe: "Bendrosios nuostatos ir sutarties dalykas", tipas: "taipne", privalomas: true,
      klausimas: "Ar Sutartis sudaroma įgyvendinant Užsakovo investicinį projektą (SS 1.2 punktas)?",
      uzuomina: "„Taip“ - į sakinį „Ši Sutartis sudaryta įgyvendinant investicinį projektą ...“ įrašomas projekto pavadinimas ir numeris. „Ne“ - 1.2 punkte įrašoma „Punktas netaikomas.“",
      laukai: [{ id: "pp_investicinis_pav", tipas: "tekstas", uzrasas: "Investicinio projekto pavadinimas", kada: "taip" },
               { id: "pp_investicinis_nr", tipas: "tekstas", uzrasas: "Investicinio projekto numeris", kada: "taip" }] },
    { id: "pp_objektas", grupe: "Bendrosios nuostatos ir sutarties dalykas", tipas: "formuluote", privalomas: true,
      klausimas: "Kokio objekto projektavimo paslaugos perkamos (SS 2.1 punktas)?",
      uzuomina: "Šablono nurodymas: „nurodomas objekto pavadinimas“. Įrašoma kilmininku į sakinį „... suteikti Paslaugas, kurias sudaro: <objektas> projektavimo paslaugos, projekto vykdymo priežiūros paslaugos pagal pateiktą Techninę užduotį ...“, pvz. „330 kV oro linijos Vilnius-Neris rekonstravimo“." },

    { id: "pp_terminas", grupe: "Terminai", tipas: "skaicius", privalomas: true,
      klausimas: "Per kiek laiko nuo Sutarties įsigaliojimo dienos Projektuotojas turi suteikti projektavimo paslaugas (SS 3.1 punktas)?",
      uzuomina: "Skaičius; vieneto forma parenkama pagal skaičių (pvz. „per 12 mėnesių nuo Sutarties įsigaliojimo dienos“). Šablono 3.1 punkto antrasis variantas („arba ... Darbai atliekami etapais, pildomas priedas „Projektavimo ir statybos darbų etapai““) nesiūlomas ir pašalinamas - jis iš rangos sutarties, o šios sutarties priedų sąraše tokio priedo nėra.",
      vienetai: function () { return [{ id: "men", tekstas: "mėnesiai" }, { id: "d", tekstas: "dienos" }]; } },
    { id: "pp_pratesimas_max", grupe: "Terminai", tipas: "skaicius", privalomas: true,
      klausimas: "Kiek mėnesių iš viso gali trukti visi Paslaugų teikimo terminų pratęsimai (SS 3.3 punktas)?",
      uzuomina: "Įrašoma į sakinį „Bendras visų Paslaugų teikimo terminų pratęsimų laikotarpis negali viršyti ... mėnesių.“ Pratęsimo pagrindai išvardyti 3.2 punkte (šablono tekstas).",
      vienetai: function () { return [{ id: "men", tekstas: "mėn." }]; } },
    { id: "pp_pratesimas_ilgiau", grupe: "Terminai", tipas: "skaicius", privalomas: true,
      klausimas: "Ilgiau kaip keliems mėnesiams terminas gali būti pratęstas tik laikantis Pirkimų įstatymo ir Sutarties nuostatų (SS 3.6 punktas)?",
      uzuomina: "Įrašoma į sakinį „Ilgiau kaip ... mėnesiams terminas gali būti pratęstas tik tuo atveju, jeigu bus laikomasi Pirkimų, atliekamų vandentvarkos, energetikos, transporto ar pašto paslaugų srities perkančiųjų subjektų, įstatymo ir Sutarties nuostatų.“",
      vienetai: function () { return [{ id: "men", tekstas: "mėn." }]; },
      siuloma: function (c, R) { return skaicius(R.pp_pratesimas_max) ? { reiksme: String(R.pp_pratesimas_max), kilme: "SS 3.3 punkto atsakymas (šablonas abiejose vietose palieka tuščią vietą; jei skaičiai turi skirtis - pakeiskite)" } : null; } },
    // 2026-10-13 (patikra su paskelbtais projektais): projekto vykdymo priežiūra perkama ne visada
    { id: "pp_prieziura_taikoma", grupe: "Terminai", tipas: "taipne", privalomas: true,
      klausimas: "Ar perkamos ir projekto vykdymo priežiūros paslaugos (SS 2.1, 3.8 ir 4.1 punktai)?",
      uzuomina: "„Taip“ - lieka formos tekstas. „Ne“ - 2.1 punkte pašalinami žodžiai „, projekto vykdymo priežiūros paslaugos“, 3.8 punkte įrašoma „Punktas netaikomas.“, o 4.1 punkto eilutėje - „" + PP_PRIEZIUROS_KAINA + "“ (punktų numeriai nesikeičia). Sutarties pavadinimas ir bendrosios sąlygos nekeičiami; bendrosiose sąlygose nurodyta: „Projekto vykdymo priežiūra atliekama, jei to reikalauja teisės aktų reikalavimai.“" },
    { id: "pp_prieziura", grupe: "Terminai", tipas: "skaicius", privalomas: true, rodoma: function (c, R) { return R.pp_prieziura_taikoma === "taip"; },
      klausimas: "Kiek mėnesių truks Objekto statybos darbai, kurių laikotarpiu teikiamos projekto vykdymo priežiūros paslaugos (SS 3.8 punktas)?",
      uzuomina: "Įrašoma į sakinį „... visą Objekto statybos darbų laikotarpį, t. y. ... mėnesius. Šis terminas rašytiniu Šalių sutarimu gali būti pratęstas ne daugiau kaip ... kartus ne ilgesniam kaip ... mėnesių laikotarpiui, jeigu Objekto statybos darbų rangovas vėluoja atlikti Objekto statybos darbus.“",
      vienetai: function () { return [{ id: "men", tekstas: "mėn." }]; },
      laukai: [{ id: "pp_prieziura_kartai", tipas: "skaicius", uzrasas: "Kiek kartų šis terminas gali būti pratęstas", kada: "*" },
               { id: "pp_prieziura_pratesimas", tipas: "skaicius", uzrasas: "Kiek mėnesių gali trukti vienas pratęsimas", kada: "*" }] },

    { id: "pp_es", grupe: "Kaina ir apmokėjimas", tipas: "taipne", privalomas: true,
      klausimas: "Ar Paslaugas ketinama finansuoti Europos Sąjungos fondų (programų) lėšomis (SS 4.2 punktas, BS 9.10)?",
      uzuomina: "Lieka vienas iš šablono sakinių: „Paslaugas ketinama finansuoti Europos Sąjungos fondų (programų) lėšomis.“ arba „Paslaugos Europos Sąjungos fondų (programų) lėšomis nefinansuojamos.“" },
    { id: "pp_etapu_lentele", grupe: "Kaina ir apmokėjimas", tipas: "variantai", privalomas: true,
      klausimas: "Pagal kurią specialiųjų sąlygų 3 priedo lentelę mokama projektavimo paslaugų kaina (3 priedas „Apmokėjimo tvarka pagal etapus“, BS 5.2.3)?",
      variantai: [{ id: "l1", tekstas: "1 lentelė: etapais 10, 20, 50 ir 20 proc. projektavimo paslaugų kainos (šablono rekomendacija, kai projektuojamos pastotės)" },
                  { id: "l2", tekstas: "2 lentelė: etapais 20, 20, 40 ir 20 proc. projektavimo paslaugų kainos (šablono rekomendacija, kai projektuojamos oro linijos)" }],
      uzuomina: "Šablono 3 priede - dvi lentelės, kiekvienam projektui pasirenkama viena; kita lentelė pašalinama. 3 priedas generuojamas atskiru failu.",
      siuloma: function (c) {
        var t = maza(c.pavadinimas), tp = TP.test(t), ol = OL.test(t);
        return tp && !ol ? { reiksme: "l1", kilme: "pirkimo pavadinime - transformatorių pastotė ar skirstykla (šablono rekomendacija)" }
             : ol && !tp ? { reiksme: "l2", kilme: "pirkimo pavadinime - oro linija (šablono rekomendacija)" } : null; } },

    { id: "pp_uztikrinimas", grupe: "Sutarties įvykdymo užtikrinimas", tipas: "variantai", privalomas: true,
      klausimas: "Ar reikalaujamas Sutarties įvykdymo užtikrinimas (SS 6.1 punktas, BS 7.5.1 ir 7.5.2)?",
      variantai: [{ id: "abu", tekstas: "Taip - pagal BS 7.5.1 ir 7.5.2 punktus (projektavimo paslaugoms ir projekto vykdymo priežiūros paslaugoms)" },
                  { id: "ne", tekstas: "Ne - užtikrinimo pateikti nereikalaujama" },
                  { id: "p751", tekstas: "Taip - tik pagal BS 7.5.1 punktą (projektavimo paslaugoms; 7.5.2 punktas netaikomas)" }],
      uzuomina: "Lieka vienas iš trijų šablono sakinių. BS 7.5.1: užtikrinimas iki Sutarties pasirašymo, ne mažesnis kaip 10 % projektavimo paslaugų kainos (su PVM). BS 7.5.2: užtikrinimas per 10 darbo dienų nuo pranešimo apie pasirašytą Objekto statybos darbų sutartį, ne mažesnis kaip 10 % projekto vykdymo priežiūros paslaugų kainos (su PVM).",
      siuloma: function (c) { return c.uztikrinimas && c.uztikrinimas.taikomas === false ? { reiksme: "ne", kilme: "SPS: sutarties įvykdymo užtikrinimas nereikalaujamas" } : null; },
      pastaba: function (c) {
        var u = c.uztikrinimas;
        if (!u || u.taikomas !== true) return "";
        var pr = u.eur > 0 && c.verte > 0 ? " (" + u.eur + " Eur, " + skLT(apvalink(u.eur / c.verte * 100)) + " % numatomos vertės)" : "";
        return "SPS: užtikrinimas reikalaujamas" + pr + ".";
      },
      vidausRiba: { ne: "ne" } },

    { id: "pp_patikra", grupe: "Papildomos sąlygos ir priedai", tipas: "taipne", privalomas: true,
      klausimas: "Ar Sutarties vykdymo metu bus atliekama BS 9.1 punkte nurodyta patikra (atitikties nacionalinio saugumo interesams) (SS 8.1 punktas)?",
      uzuomina: "„Taip“ - 8.1 punkte lieka „patikra bus atliekama“, o priedų sąraše 12 priedas „Pareigų sąrašas“ (BS 9.1.4: pagal jį tikrinami darbuotojai). „Ne“ - „patikra nebus atliekama“, 12 priedo eilutėje įrašoma „netaikoma“ (kitų priedų numeriai nesikeičia).",
      siuloma: function (c) { return c.nacsaug === true ? { reiksme: "taip", kilme: "1 žingsnis: pirkimui taikomi nacionalinio saugumo reikalavimai" }
                                   : c.nacsaug === false ? { reiksme: "ne", kilme: "1 žingsnis: nacionalinio saugumo reikalavimai pirkimui netaikomi" } : null; } },
    { id: "pp_koordinatorius", grupe: "Papildomos sąlygos ir priedai", tipas: "variantai", privalomas: true,
      klausimas: "Ar statinių projektavimo saugos ir sveikatos koordinatorius skiriamas iš Projektuotojo deleguotų asmenų (SS 8.2-8.3 punktai, BS 4.2.10)?",
      variantai: [{ id: "ne", tekstas: "Ne - 8.2 ir 8.3 punktuose įrašoma „Punktas netaikomas.“" },
                  { id: "p82", tekstas: "Taip - tik 8.2 punktas (esant BS 4.2.10 punkte numatytoms sąlygoms)" },
                  { id: "abu", tekstas: "Taip - 8.2 ir 8.3 punktai (8.3: kandidatūros pateikimas per 5 dienas ir nepriklausomo veikimo įsipareigojimas)" }],
      uzuomina: "Sąvoka „Koordinatorius“ apibrėžta 8.2 punkte, o 8.3 punktas ją vartoja, todėl 8.3 punktas vienas nepaliekamas. BS 4.2.10: koordinatorius skiriamas, kai projektuojant dalyvauja daugiau negu vienas projektuotojas." },
    { id: "pp_kitos", grupe: "Papildomos sąlygos ir priedai", tipas: "taipne", privalomas: true,
      klausimas: "Ar įrašomos kitos papildomos sąlygos arba Sutarties bendrųjų sąlygų pakeitimai (SS 8.4 punktas)?",
      uzuomina: "Šablono nurodymas: „Galima įrašyti kitas papildomas sąlygas arba pagal poreikį pakeisti Sutarties bendrąsias sąlygas.“ „Taip“ - nurodymo vietoje įrašomas jūsų tekstas; „Ne“ - „Punktas netaikomas.“",
      laukai: [{ id: "pp_kitos_f", tipas: "formuluote", uzrasas: "Papildomos sąlygos (8.4 punkto tekstas)", kada: "taip" }] },
    KL_PRIEDAI("Papildomos sąlygos ir priedai"),
    { id: "pp_kiti_priedai", grupe: "Papildomos sąlygos ir priedai", tipas: "taipne", privalomas: true,
      klausimas: "Ar prie Sutarties pridedami kiti priedai, kurių priedų sąraše nėra (15 priedo eilutė „Kiti priedai“)?",
      uzuomina: "Šablono nurodymas: „pagal poreikį išvardijami prieš paskelbiant Pirkimą“. „Taip“ - įrašoma „15 priedas. Kiti priedai: <jūsų išvardyti priedai>.“; „Ne“ - „15 priedas. Kiti priedai - netaikoma.“",
      laukai: [{ id: "pp_kiti_priedai_f", tipas: "tekstas", uzrasas: "Kiti priedai (išvardykite; pvz. Užsakovo informacijos reikalavimai)", kada: "taip" }] }
  ];
  /* ---------------------------------------------------------------- darbų pirkimo-pardavimo („mažoji“) SS (2026-10-12, 5 etapas S4)
     Šablone - keturios dalys su nurodymu rengėjui „[... pasirenkama, kai ...]“ (2 skyrius „Užsakymai“, 3.2-3.4, 4.3, 4.4), trys išskleidžiami
     sąrašai (1.2, 4.1, 6.3) ir pilkai pažymėtos pildomos vietos. Naudotojo sprendimai 2026-10-12 (sutarčių plano 8 sk. 16 p.): netaikomoje
     dalyje - „Punktas netaikomas.“ (punktų numeriai nesikeičia; 2 skyriuje - viena eilutė „Skyrius netaikomas.“), leidžiami vienkartiniai
     darbai be Grafiko (3.2-3.3 netaikomi, 3.4 ir 4.3 lieka), 3.1 p. pratęsimo sakinys - privalomas „Taip / Ne“, 4.1 p. variantas „yra:“
     nesiūlomas. Tiekėjo duomenų, kainos ir atstovų neklausiama (pildoma sudarant sutartį). */
  var DM = function (c) { return c.seima === "DARBAI_MAZOJI"; };
  var SKYRIUS_NETAIKOMAS = "Skyrius netaikomas.";
  var dmUzs = function (c, R) { return R.dm_vykdymas === "uzsakymai"; };
  var KLAUSIMAI_DM = [
    KL_NUMERIS("Sutarties dalykas ir darbų vykdymas", "sutarties įžanga"),
    { id: "dm_vykdymas", grupe: "Sutarties dalykas ir darbų vykdymas", tipas: "variantai", privalomas: true,
      klausimas: "Kaip vykdomi darbai (SS 2 skyrius, 3.2-3.4, 4.3 ir 4.4 punktai)?",
      variantai: [{ id: "uzsakymai", tekstas: "Pagal atskirus Užsakovo užsakymus - lieka 2 skyrius „Užsakymai“ ir 4.4 punktas (Sutarties kaina - maksimali suma)" },
                  { id: "grafikas", tekstas: "Vienkartinio pobūdžio darbai pagal Grafiką - lieka 3.2-3.4 punktai ir 4.3 punktas (Sutarties kaina - fiksuota suma)" },
                  { id: "be_grafiko", tekstas: "Vienkartinio pobūdžio darbai be Grafiko - lieka 3.4 punktas (delspinigiai) ir 4.3 punktas (fiksuota suma), 3.2 ir 3.3 punktai netaikomi" }],
      uzuomina: "Šablone šios dalys pažymėtos nurodymais rengėjui „[... pasirenkama, kai ...]“ - nurodymai pašalinami. Netaikomame punkte įrašoma „Punktas netaikomas.“ (2 skyriuje - „Skyrius netaikomas.“), todėl punktų numeriai visose sutartyse tie patys. Trečiasis atvejis šablone nepažymėtas: jame 3.4 ir 4.3 punktai taikomi, nors šablono nurodymai juos sieja su Grafiku." },
    { id: "dm_aktas", grupe: "Sutarties dalykas ir darbų vykdymas", tipas: "variantai", privalomas: true,
      klausimas: "Kokį dokumentą pasirašius darbai laikomi atliktais (SS 1.2 punktas)?",
      variantai: [{ id: "aktas", tekstas: "Atliktų darbų aktą - „Darbai bus laikomi atliktais, kai abi Šalys pasirašys Atliktų darbų aktą.“" },
                  { id: "paskutinis", tekstas: "Paskutinį Atliktų darbų aktą - „... kai abi Šalys pasirašys paskutinį Atliktų darbų aktą.“ (kai aktų keli)" }],
      uzuomina: "Šablono sąrašo „Nurodykite, koks aktas bus pasirašomas“ variantai.",
      siuloma: function (c, R) { return R.dm_vykdymas === "uzsakymai" ? { reiksme: "paskutinis", kilme: "darbai vykdomi pagal atskirus užsakymus - Atliktų darbų aktų bus keli" }
                                      : R.dm_vykdymas === "be_grafiko" ? { reiksme: "aktas", kilme: "vienkartinio pobūdžio darbai be Grafiko" } : null; } },
    { id: "dm_uzsakymu_dalykas", grupe: "Sutarties dalykas ir darbų vykdymas", tipas: "formuluote", privalomas: true, rodoma: dmUzs,
      klausimas: "Ką Šalys suderina teikiant užsakymus (SS 2.2 punktas)?",
      uzuomina: "Šablono vieta: „[užsakomus Darbus /Darbų kiekius /atlikimo terminus/...]“. Įrašoma į sakinį „Teikiant užsakymus Šalys suderins ... .“ (galininku).",
      siuloma: function () { return { reiksme: "užsakomus Darbus, Darbų kiekius ir atlikimo terminus", kilme: "šablono 2.2 punkte išvardyti dalykai" }; } },
    { id: "dm_uzsakymu_terminai", grupe: "Sutarties dalykas ir darbų vykdymas", tipas: "variantai", privalomas: true, rodoma: dmUzs,
      klausimas: "Kaip nustatomi atskirų užsakymų įvykdymo terminai (SS 2.3 punktas)?",
      variantai: [{ id: "derinami", tekstas: "Derinami kiekvieno užsakymo pateikimo metu" },
                  { id: "priede", tekstas: "Nurodyti Sutarties priede" },
                  { id: "kita", tekstas: "Kitaip (įrašysite formuluotę)" }],
      uzuomina: "Šablono vieta: „[derinami kiekvieno užsakymo pateikimo metu / nurodyti Sutarties priede Nr.[ ] / ...]“. Įrašoma į sakinį „Atskirų užsakymų įvykdymo terminai ... .“",
      laukai: [{ id: "dm_uzsakymu_priedas", tipas: "tekstas", uzrasas: "Sutarties priedo numeris", kada: "priede" },
               { id: "dm_uzsakymu_terminai_f", tipas: "formuluote", uzrasas: "Formuluotė po žodžių „Atskirų užsakymų įvykdymo terminai“", kada: "kita" }] },

    { id: "dm_terminas", grupe: "Terminai", tipas: "skaicius", privalomas: true,
      klausimas: "Per kiek laiko nuo Sutarties įsigaliojimo dienos atliekami darbai arba kiek laiko teikiami užsakymai (SS 3.1 punktas)?",
      uzuomina: "Skaičius; sakinio pradžia ir žodžio forma parenkamos pagal atsakymą į klausimą „Kaip vykdomi darbai?“: „Rangovas įsipareigoja Darbus atlikti per 6 mėnesius nuo Sutarties įsigaliojimo dienos.“ arba „Pagal šią Sutartį užsakymai Darbams bus teikiami 12 mėnesių nuo Sutarties įsigaliojimo dienos.“",
      vienetai: function () { return [{ id: "men", tekstas: "mėnesiai" }, { id: "d", tekstas: "dienos" }]; },
      siuloma: function (c) { return c.trukmeMen > 0 ? { reiksme: String(c.trukmeMen), kilme: "pirkimo kortelės sutarties trukmė mėnesiais" } : null; } },
    { id: "dm_pratesimas", grupe: "Terminai", tipas: "taipne", privalomas: true,
      klausimas: "Ar šis terminas gali būti pratęstas (SS 3.1 punkto antrasis sakinys)?",
      uzuomina: "„Taip“ - lieka sakinys „Šis terminas gali būti pratęstas ... dėl ... .“ su jūsų įrašytu pratęsimo terminu ir aplinkybėmis. „Ne“ - sakinys pašalinamas.",
      laukai: [{ id: "dm_pratesimo_terminas", tipas: "tekstas", uzrasas: "Pratęsimo terminas (po žodžio „pratęstas“, pvz. „1 mėnesiui“, „ne ilgiau kaip 30 dienų“)", kada: "taip" },
               { id: "dm_pratesimo_aplinkybes", tipas: "formuluote", uzrasas: "Aplinkybės, kada terminas gali būti pratęstas (po žodžio „dėl“, kilmininku)", kada: "taip" }] },

    { id: "dm_kaina", grupe: "Kaina", tipas: "variantai", privalomas: true,
      klausimas: "Koks Sutarties kainos apskaičiavimo būdas (SS 4.1 punktas)?",
      variantai: [{ id: "fiksuotas_ikainis", tekstas: "Fiksuotas įkainis" }, { id: "fiksuota_kaina", tekstas: "Fiksuota kaina" }, { id: "kintamas_ikainis", tekstas: "Kintamas įkainis" }],
      uzuomina: "Šablono sąrašo „Kainos apskaičiavimo būdas“ variantai. Sąrašo variantas „yra:“ (be tęsinio) nesiūlomas.",
      siuloma: function (c, R) { return R.dm_vykdymas === "grafikas" || R.dm_vykdymas === "be_grafiko"
        ? { reiksme: "fiksuota_kaina", kilme: "vienkartinio pobūdžio darbai - pagal 4.3 punktą Sutarties kaina yra fiksuota suma" } : null; } },

    { id: "dm_uztikrinimas", grupe: "Užtikrinimas ir priedai", tipas: "taipne", privalomas: true,
      klausimas: "Ar reikalaujamas Sutarties įvykdymo užtikrinimas (SS 6.3 punktas, BS 3.5)?",
      uzuomina: "„Taip“ - 6.3 punkte lieka „Rangovo sutartiniai įsipareigojimai užtikrinami ... Eur dydžio banko garantija arba draudimo bendrovės laidavimo raštu, pateikta(-u) Užsakovui prieš sudarant Sutartį“ su jūsų įrašyta suma. „Ne“ - „netaikoma“.",
      laukai: [{ id: "dm_uztikrinimo_suma", tipas: "tekstas", uzrasas: "Užtikrinimo suma, Eur", kada: "taip" }],
      siuloma: function (c) { var u = c.uztikrinimas; return u && u.taikomas === true ? { reiksme: "taip", kilme: "SPS: sutarties įvykdymo užtikrinimas reikalaujamas" }
                                    : u && u.taikomas === false ? { reiksme: "ne", kilme: "SPS: sutarties įvykdymo užtikrinimas nereikalaujamas" } : null; },
      vidausRiba: { ne: "ne" } },
    { id: "dm_trisale", grupe: "Užtikrinimas ir priedai", tipas: "taipne", privalomas: true,
      klausimas: "Ar prie Sutarties pridedamas trišalės sutarties (tiesioginio atsiskaitymo su subrangovu) projektas (priedų sąrašo 4 eilutė)?",
      uzuomina: "„Taip“ - eilutė „Trišalės sutarties projektas“ lieka. „Ne“ - įrašoma „Trišalės sutarties projektas - netaikoma;“ (kitų priedų numeriai nesikeičia). Šios sutarties bendrosiose sąlygose tiesioginio atsiskaitymo su subrangovais tvarkos nėra - ji nustatoma trišalėje sutartyje.",
      siuloma: function (c) { return c.tiesioginis === true ? { reiksme: "taip", kilme: "SPS: taikomas tiesioginis atsiskaitymas su subtiekėjais" }
                                   : c.tiesioginis === false ? { reiksme: "ne", kilme: "SPS: tiesioginio atsiskaitymo su subtiekėjais nuostata netaikoma" } : null; } },
    KL_PRIEDAI("Užtikrinimas ir priedai"),
    { id: "dm_kiti_priedai", grupe: "Užtikrinimas ir priedai", tipas: "taipne", privalomas: true,
      klausimas: "Ar prie Sutarties pridedami kiti priedai (priedų sąrašo 5 eilutė)?",
      uzuomina: "Šablono 5 eilutė - tuščia vieta „[...]“. „Taip“ - kiekvienas jūsų įrašytas priedas tampa atskira numeruota priedų sąrašo eilute (5 eilutė ir po jos); „Ne“ - „" + KITI_PRIEDAI_NETAIKOMA + "“",
      laukai: [{ id: "dm_kiti_priedai_f", tipas: "formuluote", uzrasas: "Kitų priedų pavadinimai - kiekvienas atskiroje eilutėje (pvz. Darbų kiekių žiniaraštis)", kada: "taip" }] }
  ];
  /* ---------------------------------------------------------------- eksploatavimo darbų sutarties klausimai (7 etapas, S4, 2026-10-13)
     LITGRID eksploatavimo darbų sutarties SS - trys formos pagal darbų rūšį (ctx.variantas: OL - oro linijos, TP - transformatorių pastotės,
     TRASOS - trasų valymas): 19 eilučių lentelė, pildomos vietos laužtiniuose skliaustuose ir pilkai pažymėtos. Naudotojo sprendimas
     2026-10-13 („F. Pritariu.“): tie patys principai kaip kitų šeimų - kas žinoma iš pirkimo, įrašoma automatiškai; Rangovo duomenys, kaina,
     Šalių atstovai, sąskaita, Sutarties data ir numeris, už viešinimą atsakingas asmuo ir pastočių „Pagrindinių darbų“ variantas - sudarant
     sutartį; kita - klausiama. Eilutėse, kurių turinys taikomas ne visada (10, 12, 15, 16), netaikomu atveju įrašomas tas pats žodis, kurį
     LITGRID įrašė trasų valymo darbų sutarties formoje („Nėra“ - 10 ir 15 eil., „Netaikoma“ - 12 eil.); eilučių numeriai nesikeičia. */
  var EKS = function (c) { return c.seima === "EKSPLOATAVIMO"; };
  var ekV = function (a, b) { return function (c) { return c.variantas === a || (b != null && c.variantas === b); }; };
  var EK_OL = ekV("OL"), EK_TP = ekV("TP"), EK_TV = ekV("TRASOS"), EK_OLTP = ekV("OL", "TP"), EK_OLTV = ekV("OL", "TRASOS");
  var EK_NERA = "Nėra", EK_NETAIKOMA = "Netaikoma";
  var EK_PIRKIMO_LIKUTIS = "[būdas, paskelbimo data ir numeris]";
  var EK_G1 = "Sutarties dalykas ir terminas", EK_G2 = "Įkainiai ir mokesčiai (SS 1 eilutė)", EK_G3 = "Brigados ir reagavimas", EK_G4 = "Dokumentai, sandėliai, garantiniai terminai",
      EK_G5 = "Sutarties įvykdymo užtikrinimas", EK_G6 = "Priedai ir kitos sąlygos";
  var EK_VNT = function (t) { return function () { return [{ id: "vnt", tekstas: t }]; }; };
  var KLAUSIMAI_EKS = [
    KL_NUMERIS(EK_G1, "sutarties įžanga"),
    { id: "ek_regionas", grupe: EK_G1, tipas: "tekstas", privalomas: true,
      klausimas: "Kurio regiono objektuose bus atliekami darbai (regiono pavadinimas)?",
      uzuomina: function (c) { return "Įrašoma visur, kur formoje palikta vieta regiono pavadinimui: " + (c.variantas === "TRASOS" ? "3 eilutėje („Infrastruktūros priežiūros centro ... regiono 110 - 400 kV oro linijos“) ir priedų sąrašo eilutėse (darbų planas, oro linijų sąrašas)"
        : c.variantas === "TP" ? "priedų sąrašo eilutėse „Perdavimo tinklo ... regiono 110 - 400 kV TP įrenginių eksploatavimo darbų ... m. planas“ ir „... RAA įtaisų techninės priežiūros darbų ... m. planas“"
        : "priedų sąrašo eilutėse „PTD IPC ... regiono 110 – 400 kV oro linijų remonto darbų planas“ ir „PTD IPC ... regiono oro linijų sąrašas“") + ". Kilmininku, be žodžio „regiono“. Pvz.: Vakarų"; } },
    { id: "ek_objektai", grupe: EK_G1, tipas: "formuluote", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Kokiuose objektuose Rangovas turi atlikti eksploatavimo darbus (SS 3 eilutė „Objektas“)?",
      uzuomina: "Formos vieta: „[Objektų, kurių eksploatacijos darbus turi atlikti Rangovas, sąrašas]“ - jūsų tekstas įrašomas vietoj jos viena pastraipa. Pvz.: objektų sąrašas arba nuoroda į priedų sąrašo priedą, kuriame jis pateiktas." },
    { id: "ek_kiti_regionai", grupe: EK_G1, tipas: "tekstas", privalomas: true, rodoma: EK_TV,
      klausimas: "Kurių kitų regionų linijose Rangovas privalo atlikti darbus Užsakovui pareikalavus (SS 3 eilutė „Objektas“)?",
      uzuomina: "Formos sakinys: „Užsakovui pareikalavus, Rangovas privalo darbus atlikti kitų regionų ([]) 110 – 400 kV oro ir kabelių linijose.“ - jūsų atsakymas įrašomas į skliaustus. Pvz.: Rytų, Šiaurės" },
    { id: "ek_terminas", grupe: EK_G1, tipas: "skaicius", privalomas: true, vienetai: EK_VNT("mėn."),
      klausimas: "Kiek mėnesių nuo Sutarties įsigaliojimo dienos Rangovas vykdo darbus (SS 2 eilutė „Sutarties vykdymo terminas“)?",
      uzuomina: function (c) { return "Sveikas skaičius. Įrašoma į sakinį „Rangovas įsipareigoja " + (c.variantas === "OL" ? "vykdyti Darbus ... mėn." : c.variantas === "TP" ? "atlikti Darbus ... mėn." : "atlikti Darbus per ... mėn.") + " nuo Sutarties įsigaliojimo dienos.“" +
        (c.variantas === "TRASOS" ? " Tas pats skaičius įrašomas ir 16 eilutėje: „Sutarties vykdymo užtikrinimo galiojimo terminas – ... mėn. (Darbų atlikimo terminas) ir 1 (vienas) mėnuo“." : ""); },
      siuloma: function (c) { return c.trukmeMen > 0 ? { reiksme: String(c.trukmeMen), kilme: "pirkimo kortelės sutarties trukmė mėnesiais" } : null; } },

    { id: "ek_ikainiu_priedas", grupe: EK_G2, tipas: "tekstas", privalomas: true, rodoma: EK_OL,
      klausimas: "Kuriame specialiųjų sąlygų priede nurodyti Rangovo įkainiai?",
      uzuomina: "Formos sakinys: „Rangovo atliekamų Darbų Įkainiai Rangovo pateikti vykdant Pirkimą nurodomi šių Sutarties specialiųjų sąlygų [įrašoma] priede.“ Įrašykite priedo numerį iš 18 eilutės priedų sąrašo.",
      siuloma: function (c, R, Z) { var q = ((Z && Z.priedai) || []).filter(function (x) { return /^Darbų įkainiai ir aprašymai/.test(x.tekstas); })[0];
        return q ? { reiksme: q.nr, kilme: "formos priedų sąrašo " + q.nr + " eilutė „" + q.tekstas.replace(/[;.\s]+$/, "") + "“" } : null; } },
    { id: "ek_neplaniniai", grupe: EK_G2, tipas: "tekstas", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Kiek didesnė kaina mokama už Neplaninius darbus?",
      uzuomina: "Formos sakinys: „Už Neplaninius darbus Rangovui bus mokama [įrašoma] didesnė kaina.“ Pvz.: 20 %" },
    { id: "ek_avariniai", grupe: EK_G2, tipas: "tekstas", privalomas: true, rodoma: EK_TP,
      klausimas: "Kiek didesnė kaina mokama už Avarinius darbus?",
      uzuomina: "Formos sakinys: „Už Avarinius darbus Rangovui bus mokama [įrašoma] didesnė kaina.“ Pvz.: 50 %" },
    { id: "ek_men_mokescio_priedas", grupe: EK_G2, tipas: "tekstas", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Kuriame priede nurodytas minimalus mėnesinis eksploatavimo mokestis?",
      uzuomina: "Formos sakinys: „Rangovui mokamas minimalus mėnesinis eksploatavimo mokestis, nurodytas ... [įrašoma] priede.“ Įrašykite priedo numerį iš 18 eilutės priedų sąrašo." },
    { id: "ek_reagavimo_mokescio_priedas", grupe: EK_G2, tipas: "tekstas", privalomas: true, rodoma: EK_TP,
      klausimas: "Kuriame priede nurodytas reagavimo į Avarinius įvykius mokestis?",
      uzuomina: "Formos sakinys: „Rangovui mokamas reagavimo į Avarinius įvykius mokestis nurodytas Sutarties specialiųjų sąlygų [įrašoma] priede.“ Įrašykite priedo numerį iš 18 eilutės priedų sąrašo." },
    { id: "ek_avariniu_mokestis", grupe: EK_G2, tipas: "tekstas", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Koks minimalus Avarinių darbų mokestis, Eur be PVM?",
      uzuomina: "Formos sakinys: „Rangovui mokamas [įrašoma] Eur be PVM minimalus Avarinių darbų mokestis.“ Įrašykite sumą skaičiumi. Pvz.: 500" },

    KL_KAINA("Sutarties kaina (SS 7 eilutė)", "SS 7 eilutė"),
    { id: "ek_brigados", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_OLTV, vienetai: EK_VNT("Brigados"),
      klausimas: "Kiek Brigadų vienu metu turi galėti dirbti skirtinguose Objektuose (SS 9 eilutė „Brigados“)?",
      uzuomina: "Sveikas skaičius. Formos sakinys: „... vienu metu galės dirbti ne mažiau kaip [įrašoma] Brigados.“ - formos žodis „Brigados“ nekeičiamas." },
    { id: "ek_brigados_pirminiai", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_TP, vienetai: EK_VNT("Brigados"),
      klausimas: "Kiek Brigadų, eksploatuojančių pirminius įrenginius, vienu metu turi galėti dirbti skirtinguose Objektuose (SS 9 eilutė „Brigados“)?",
      uzuomina: "Sveikas skaičius. Formos sakinys: „... ne mažiau kaip [įrašoma] Brigados, eksploatuojančios pirminius įrenginius, ir ne mažiau kaip [įrašoma] Brigados eksploatuojančios RAA įrenginius, ir ne mažiau kaip [įrašoma] Brigada vykdanti statybinius darbus.“ - formos žodžiai nekeičiami." },
    { id: "ek_brigados_raa", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_TP, vienetai: EK_VNT("Brigados"),
      klausimas: "Kiek Brigadų, eksploatuojančių RAA įrenginius (SS 9 eilutė)?", uzuomina: "Sveikas skaičius - antroji to paties formos sakinio vieta." },
    { id: "ek_brigados_statyba", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_TP, vienetai: EK_VNT("Brigada"),
      klausimas: "Kiek Brigadų, vykdančių statybinius darbus (SS 9 eilutė)?", uzuomina: "Sveikas skaičius - trečioji to paties formos sakinio vieta („... ne mažiau kaip [įrašoma] Brigada vykdanti statybinius darbus“)." },
    { id: "ek_brigados_nariai", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_TP, vienetai: EK_VNT("darbuotojų"),
      klausimas: "Iš kiek darbuotojų, turinčių operatyvines remonto teises, turi būti sudarytos RAA ir Pirminių įrenginių Brigados (SS 9 eilutė)?",
      uzuomina: "Sveikas skaičius. Sakinys: „RAA ir Pirminių įrenginių Brigados turi būti sudarytos iš ne mažiau kaip [įrašoma] darbuotojų turinčių operatyvines remonto teises.“ LITGRID formoje skaičiaus nebuvo („iš ne mažiau kaip darbuotojų“) - jį įrašote jūs." },
    { id: "ek_reagavimas_darbo", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_OLTP, vienetai: EK_VNT("valandos"),
      klausimas: "Per kiek valandų Rangovas turi sureaguoti į avariją 1 ir 2 prioriteto objektuose darbo laiku (SS 11 eilutė „Avarinio reagavimo terminai“)?",
      uzuomina: "Sveikas skaičius. Formos eilutė: „Darbo laiku – [įrašoma] valandos;“ (kitais atvejais formoje - 4 valandos darbo laiku ir 6 valandos ne darbo laiku)." },
    { id: "ek_reagavimas_ne_darbo", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_OLTP, vienetai: EK_VNT("valandos"),
      klausimas: "Per kiek valandų - ne darbo laiku (SS 11 eilutė)?", uzuomina: "Sveikas skaičius. Formos eilutė: „Ne darbo laiku – [įrašoma] valandos.“" },
    { id: "ek_reagavimas", grupe: EK_G3, tipas: "skaicius", privalomas: true, rodoma: EK_TV, vienetai: EK_VNT("val."),
      klausimas: "Per kiek valandų nuo Užsakovo pranešimo Rangovas privalo nuvykti į avarijos vietą ir pradėti avarijos likvidavimo darbus (SS 11 eilutė „Avarinio reagavimo terminai“)?",
      uzuomina: "Sveikas skaičius. Formos sakinys: „... Rangovas privalo ne vėliau kaip per [įrašoma] val. nuvykti į avarijos vietą ...“" },

    { id: "ek_dokumentai", grupe: EK_G4, tipas: "taipne", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Ar Užsakovas išduoda Sutarčiai įvykdyti reikalingus leidimus, suderinimus, pažymas, licencijas ar kitus dokumentus (SS 10 eilutė „Dokumentai“)?",
      uzuomina: "Bendrųjų sąlygų 2.1.5 punktas: preliminarus Užsakovo išduodamų dokumentų sąrašas nurodomas specialiosiose sąlygose. „Taip“ - įrašomas jūsų sąrašas. „Ne“ - įrašoma „Nėra“ (taip LITGRID įrašė trasų valymo darbų sutarties formos 10 eilutėje).",
      laukai: [{ id: "ek_dokumentai_f", tipas: "formuluote", uzrasas: "Preliminarus Užsakovo išduodamų dokumentų sąrašas (viena pastraipa)", kada: "taip" }] },
    { id: "ek_sandeliai", grupe: EK_G4, tipas: "taipne", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Ar Užsakovo įranga ir Medžiagos išduodamos, o demontuota įranga priimama Užsakovo sandėliuose (SS 12 eilutė „Užsakovo sandėliai“)?",
      uzuomina: function (c) { return "„Taip“ - " + (c.variantas === "OL" ? "į formos sakinį „Montuojama Užsakovo [įrašoma sandėliuojama įranga ir Medžiagos] išduodama ir demontuota įranga priimama šiais adresais: [sandėlių adresai].“ įrašomi jūsų atsakymai"
        : "po formos sakinio „Montuojama Užsakovo įranga ir medžiagos (...) išduodama ir išmontuota įranga priimama šiais adresais:“ įrašomi jūsų nurodyti adresai") + ". „Ne“ - įrašoma „Netaikoma“ (taip LITGRID įrašė trasų valymo darbų sutarties formos 12 eilutėje)."; },
      laukai: [{ id: "ek_sandeliu_iranga", tipas: "tekstas", uzrasas: "Sandėliuojama įranga ir Medžiagos (po žodžių „Montuojama Užsakovo“)", kada: "taip", rodoma: EK_OL },
               { id: "ek_sandeliu_adresai", tipas: "formuluote", uzrasas: "Sandėlių adresai", kada: "taip" }] },
    { id: "ek_garantiniai", grupe: EK_G4, tipas: "taipne", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Ar nustatomi garantiniai terminai, kurie skiriasi nuo bendrųjų sąlygų 8.2.2 ir 8.2.3 punktuose nurodytų (SS 15 eilutė „Papildomi garantiniai terminai“)?",
      uzuomina: "Bendrųjų sąlygų 8.2.2 punktas: kitiems Darbams taikomas 24 mėnesių garantinis terminas, jei specialiosiose sąlygose nenurodyti kitokie garantiniai terminai. „Taip“ - įrašomas jūsų tekstas. „Ne“ - įrašoma „Nėra“ (taip LITGRID įrašė trasų valymo darbų sutarties formos 15 eilutėje).",
      laukai: [{ id: "ek_garantiniai_f", tipas: "formuluote", uzrasas: "Garantiniai terminai, kurie skiriasi nuo bendrųjų sąlygų (viena pastraipa)", kada: "taip" }] },

    { id: "ek_uztikrinimas", grupe: EK_G5, tipas: "taipne", privalomas: true,
      klausimas: "Ar reikalaujamas Sutarties įvykdymo užtikrinimas (SS 16 eilutė, BS 8.7.1 punktas)?",
      uzuomina: function (c) { return "„Taip“ - 16 eilutėje lieka formos tekstas su jūsų įrašytu užtikrinimo dydžiu" + (c.variantas === "OL" ? " (skaičiais ir žodžiais)" : "") +
        ". „Ne“ - 16 eilutėje įrašoma „Netaikoma“" + (c.variantas === "TRASOS" ? "" : ", o priedų sąrašo eilutėje „Sutarties įvykdymo užtikrinimas“ - „netaikoma“") + " (eilučių ir priedų numeriai nesikeičia)."; },
      laukai: [{ id: "ek_uztikrinimo_suma", tipas: "tekstas", uzrasas: "Užtikrinimo dydis, Eur", kada: "taip" }],
      siuloma: function (c) { var u = c.uztikrinimas; return u && u.taikomas === true ? { reiksme: "taip", kilme: "SPS: sutarties įvykdymo užtikrinimas reikalaujamas" }
                                    : u && u.taikomas === false ? { reiksme: "ne", kilme: "SPS: sutarties įvykdymo užtikrinimas nereikalaujamas" } : null; },
      vidausRiba: { ne: "ne" } },

    { id: "ek_plano_metai", grupe: EK_G6, tipas: "tekstas", privalomas: true, rodoma: EK_TP,
      klausimas: "Kurių metų darbų planai pridedami (priedų sąrašo 11 ir 12 eilutės)?",
      uzuomina: "Formos eilutės: „Perdavimo tinklo ... regiono 110 - 400 kV TP įrenginių eksploatavimo darbų [įrašoma] m. planas“ ir „... RAA įtaisų techninės priežiūros darbų [įrašoma] m. planas“ - tas pats atsakymas įrašomas į abi. Pvz.: 2027" },
    { id: "ek_irenginiu_sarasas", grupe: EK_G6, tipas: "tekstas", privalomas: true, rodoma: EK_TP,
      klausimas: "Kieno įrenginių sąrašas pridedamas (priedų sąrašo 13 eilutė)?",
      uzuomina: "Formos eilutė: „Perdavimo tinklo [įrašoma] įrenginių sąrašas;“ - jūsų atsakymas įrašomas vietoj skliaustų.",
      siuloma: function (c, R) { var r = String(R.ek_regionas || "").replace(/\s+/g, " ").trim().replace(/[.;\s]+$/, "").replace(/\s+regiono$/i, "");
        return r ? { reiksme: r + " regiono", kilme: "regiono pavadinimas (jūsų atsakymas į ankstesnį klausimą)" } : null; } },
    KL_PRIEDAI(EK_G6),
    { id: "ek_kiti_priedai", grupe: EK_G6, tipas: "taipne", privalomas: true,
      klausimas: "Ar prie Sutarties pridedami kiti priedai, kurių formos priedų sąraše nėra (SS 18 eilutė)?",
      uzuomina: "„Taip“ - kiekvienas jūsų įrašytas priedas tampa nauja numeruota priedų sąrašo eilute po paskutinio formos priedo. „Ne“ - sąrašas lieka kaip formoje.",
      laukai: [{ id: "ek_kiti_priedai_f", tipas: "formuluote", uzrasas: "Kitų priedų pavadinimai - kiekvienas atskiroje eilutėje", kada: "taip" }] },
    { id: "ek_kiekiu_metai", grupe: EK_G6, tipas: "tekstas", privalomas: true, rodoma: EK_OLTP,
      klausimas: "Kurių metų Darbų kiekiai nurodyti kaip preliminarūs (SS 19 eilutė „Kitos sąlygos“)?",
      uzuomina: "Formos sakiniai: „[įrašoma] metais nurodyti Darbų kiekiai išreiškiami kaip preliminarūs planuojami kiekiai. Užsakovas neįsipareigoja užsakyti viso nurodyto [įrašoma] metų Darbų kiekio.“ - tas pats atsakymas įrašomas į abi vietas. Pvz.: 2027-2029" }
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
  var rinkinys = function (ctx) { return PSR(ctx || {}) ? KLAUSIMAI_PSR : SR(ctx || {}) ? KLAUSIMAI_SR : PPS(ctx || {}) ? KLAUSIMAI_PPS : DM(ctx || {}) ? KLAUSIMAI_DM : EKS(ctx || {}) ? KLAUSIMAI_EKS : KLAUSIMAI; };
  function efektyvus(ctx, A, Z){
    var R = {}, kilmes = {}, Q = rinkinys(ctx);
    Q.forEach(function (q) {
      var a = A[q.id], u = A[q.id + "_vnt"];
      if (a && a.reiksme != null && a.reiksme !== "") { R[q.id] = a.reiksme; kilmes[q.id] = "zmogus"; }
      if (u && u.reiksme) R[q.id + "_vnt"] = u.reiksme;
      (q.laukai || []).forEach(function (l) { var b = A[l.id]; if (b && b.reiksme != null && b.reiksme !== "") R[l.id] = b.reiksme; });
    });
    // atsakymai iš pirkimo dokumentų (DI, patikrinta citata) - pirmesni už taisyklių siūlymus: jie iš šio pirkimo dokumentų (2026-10-18)
    var DIA = (ctx && ctx.di) || {};
    Q.forEach(function (q) {
      var d = DIA[q.id];
      if (!d || kilmes[q.id] === "zmogus" || d.reiksme == null || d.reiksme === "") return;
      R[q.id] = d.reiksme; kilmes[q.id] = { kilme: "iš dokumento „" + d.saltinis + "“ (DI)", di: d };
      if (d.vnt && !(A[q.id + "_vnt"] && A[q.id + "_vnt"].reiksme)) R[q.id + "_vnt"] = d.vnt;
    });
    // siūlomos - tvarka svarbi (kainodara -> pradžia ir kt.), todėl kelis kartus
    for (var k = 0; k < 3; k++) Q.forEach(function (q) {
      if (kilmes[q.id] === "zmogus" || !q.siuloma) return;
      var s = q.siuloma(ctx, R, Z);
      // DI reikšmė lieka; kitokia taisyklių reikšmė parodoma šalia
      if (kilmes[q.id] && kilmes[q.id].di) { kilmes[q.id].kitaip = s && String(s.reiksme) !== String(R[q.id]) ? s : null; return; }
      if (s) { R[q.id] = s.reiksme; kilmes[q.id] = s; } else if (kilmes[q.id] && kilmes[q.id] !== "zmogus") { delete R[q.id]; delete kilmes[q.id]; }
    });
    // laukų siūlymai (2026-10-15): kai klausimo atsakymas lauką rodo ir žmogus lauko nepildė; iš dokumento (DI) - pirmiau
    Q.forEach(function (q) { (q.laukai || []).forEach(function (l) {
      if (A[l.id] && A[l.id].reiksme != null && A[l.id].reiksme !== "") return;
      var d = DIA[q.id];
      if (d && d.laukai && d.laukai[l.id] && (!l.kada || l.kada === "*" || R[q.id] === l.kada)) {
        R[l.id] = d.laukai[l.id]; kilmes[l.id] = { kilme: "iš dokumento „" + d.saltinis + "“ (DI)", di: d }; return; }
      if (typeof l.siuloma !== "function") return;   // procentai ir sumos - žemiau
      if (l.kada && l.kada !== "*" && R[q.id] !== l.kada) return;
      var s = l.siuloma(ctx, R, Z);
      if (s && s.reiksme) { R[l.id] = s.reiksme; kilmes[l.id] = s; }
    }); });
    // užtikrinimo procentai - iš SPS sumos ir numatomos vertės (naudotojo sprendimas 2026-10-08)
    if (R.uztikrinimas === "taip" && (A.procentai == null || A.procentai.reiksme == null || A.procentai.reiksme === "") && ctx.uztikrinimas && ctx.uztikrinimas.eur > 0 && ctx.verte > 0) {
      R.procentai = skLT(apvalink(ctx.uztikrinimas.eur / ctx.verte * 100));
      // SPS - suma eurais (numatoma vertė dažniausiai neskelbiama, todėl procento tiekėjai neapskaičiuotų), sutartyje - įprastai procentas nuo
      // Sutarties vertės (naudotojo paaiškinimas 2026-10-21, T3-D2): suma pagal sutartį gali skirtis nuo SPS sumos - tai pasakoma, ne taisoma
      kilmes.procentai = { kilme: "SPS užtikrinimo suma " + sumaLT(ctx.uztikrinimas.eur) + " Eur / numatoma vertė " + sumaLT(ctx.verte) +
        " Eur; sutartyje procentas skaičiuojamas nuo Sutarties vertės, todėl suma gali skirtis nuo SPS sumos" };
    }
    // darbų pirkimo-pardavimo SS 6.3 p.: užtikrinimo suma - iš SPS atsakymo (siūloma, kol žmogus neįrašė)
    if (DM(ctx || {}) && R.dm_uztikrinimas === "taip" && (A.dm_uztikrinimo_suma == null || A.dm_uztikrinimo_suma.reiksme == null || A.dm_uztikrinimo_suma.reiksme === "") &&
        ctx.uztikrinimas && ctx.uztikrinimas.eur > 0) {
      R.dm_uztikrinimo_suma = sumaLT(ctx.uztikrinimas.eur);
      kilmes.dm_uztikrinimo_suma = { kilme: "SPS sutarties įvykdymo užtikrinimo suma" };
    }
    // eksploatavimo darbų SS 16 eil.: užtikrinimo dydis - iš SPS atsakymo (siūloma, kol žmogus neįrašė)
    if (EKS(ctx || {}) && R.ek_uztikrinimas === "taip" && (A.ek_uztikrinimo_suma == null || A.ek_uztikrinimo_suma.reiksme == null || A.ek_uztikrinimo_suma.reiksme === "") &&
        ctx.uztikrinimas && ctx.uztikrinimas.eur > 0) {
      R.ek_uztikrinimo_suma = sumaLT(ctx.uztikrinimas.eur);
      kilmes.ek_uztikrinimo_suma = { kilme: "SPS sutarties įvykdymo užtikrinimo suma" };
    }
    return { R: R, kilmes: kilmes };
  }
  /* Suma sutarties tekstui: „5 000“, „12 500,50“ (be valiutos); neatpažinta - tuščia */
  function sumaLT(v){
    var n = typeof v === "number" ? v : (global.GP_MONEY && global.GP_MONEY.parseEUR ? global.GP_MONEY.parseEUR(String(v)) : skaicius(v));
    if (!(n > 0)) return "";
    var c = Math.round(n * 100), sv = String(Math.floor(c / 100)), ct = c % 100, out = "";
    for (var i = 0; i < sv.length; i++) out += ((sv.length - i) % 3 === 0 && i ? " " : "") + sv[i];
    return ct ? out + "," + (ct < 10 ? "0" : "") + ct : out;
  }

  /* o.visi (DI užklausai, 2026-10-18): ir klausimai, kurie atsiranda tik atsakius į kitus (rodoma priklauso nuo R), - kad dokumentų atsakymas
     būtų paruoštas iš anksto; klausimai, kurie priklauso tik nuo šeimos ar varianto (rodoma(ctx)), - tik savo šeimai */
  function klausimai(Z, ctx, A, o){
    A = A || {};
    var E = efektyvus(ctx, A, Z), R = E.R, visi = !!(o && o.visi);
    return rinkinys(ctx).filter(function (q) { return !q.rodoma || (visi && q.rodoma.length >= 2) || q.rodoma(ctx, R, Z); }).map(function (q) {
      var k = E.kilmes[q.id], a = A[q.id];
      var busena = R[q.id] == null ? (q.privalomas ? "neuzpildyta" : "neprivaloma") : k === "zmogus" ? "patvirtinta" : "siuloma";
      if (k === "zmogus" && a && a.patvirtinta === false) busena = "siuloma";
      // lentelė be nė vienos užpildytos eilutės - neatsakyta; su eilute, kurioje trūksta privalomo langelio, - neužpildyta (ko trūksta, sako sprendimai)
      var beEiluciu = q.tipas === "lentele" && !etapuNetuscios(R).length;
      if (beEiluciu || (q.tipas === "lentele" && etapuSprendimas(R, "").truksta.length)) busena = "neuzpildyta";
      return { id: q.id, grupe: q.grupe, klausimas: q.klausimas, uzuomina: typeof q.uzuomina === "function" ? q.uzuomina(ctx, R) : q.uzuomina || "", pastaba: q.pastaba ? q.pastaba(ctx, R) : "", vidausRiba: q.vidausRiba || null, tipas: q.tipas, privalomas: !!q.privalomas,
               variantai: (q.variantai || []).filter(function (v) { return !v.tik || v.tik(ctx, R); }).map(function (v) { return { id: v.id, tekstas: v.tekstas }; }),
               vienetai: q.vienetai ? q.vienetai(ctx) : null,
               laukai: (q.laukai || []).filter(function (l) { return (!l.tikLTEN || LTEN(ctx)) && (!l.rodoma || visi || l.rodoma(ctx, R)); }).map(function (l) {
                 return { id: l.id, tipas: l.tipas, uzrasas: l.uzrasas, kada: l.kada, neprivalomas: !!l.neprivalomas, reiksme: R[l.id] != null ? R[l.id] : "",
                          siuloma: E.kilmes[l.id] && E.kilmes[l.id] !== "zmogus" ? E.kilmes[l.id] : null }; }),
               priedai: q.tipas === "priedai" ? prieduSarasas(Z, ctx, R) : null,
               lentele: q.tipas === "lentele" ? etapuRedaktorius(Z, R) : null,
               reiksme: R[q.id] != null && !beEiluciu ? R[q.id] : null, vienetas: R[q.id + "_vnt"] || "men",
               siuloma: k && k !== "zmogus" ? k : null, busena: busena };
    });
  }

  /* Pastaba su vieta (2026-10-16, naudotojo pastebėjimas: iš „Patikrinkite (SPS ir sutartis)“ sunku suprasti, kur ką pataisyti): tekstas -
     į sąrašą (patikros ir testai skaito tekstą), o vietos - to paties masyvo savybėje `kur` pagal indeksą: { q: sutarties klausimo id },
     { sps: "uztikrinimas" | "zalieji" | "tiesioginis" } (SPS klausimas 2 žingsnyje) arba { z1: "nacsaug" } (1 žingsnio klausimas). */
  function pastaba(out, tekstas, kur){ out.push(tekstas); if (kur) (out.kur || (out.kur = []))[out.length - 1] = kur; return out; }

  /* ---------------------------------------------------------------- SPS ir sutarties derinimas (sutarčių planas 4.4, 2026-10-09)
     Nesutapimas - ne klaida (SPS „ir (ar)“, kriterijai gali būti tik TS), todėl „Patikrinkite“, o ne kliūtis; atsakymai nekeičiami. */
  function derink(ctx, R){
    var z = ctx.zaliejiSPS, out = [];
    // 2026-10-15: SPS variantas lemia papunktį (žaliuoju savaime - 4.4.3, SPS 3 lentelė - 4.3) - nesutapus su įrašytu, pasakoma
    if (z && z.length) {
      var tsSut = z.indexOf("ts_sutartis") >= 0, zs = zalSiulymas(ctx), p = String(R.zalieji_p || "").trim().replace(/[.\s]+$/, "");
      if (R.zalieji === "taip" && zs && zs.p && p && p !== zs.p)
        pastaba(out, "SS 13.1 punkte įrašytas Tvarkos aprašo " + p + " papunktis, o SPS žaliųjų reikalavimų dalyje pasirinkta „" + ZAL_SPS[z[0]] + "“ (" + zs.p + " papunktis). Patikrinkite, ar SPS ir sutartis sutampa.",
          [{ q: "zalieji" }, { sps: "zalieji" }]);
      if (R.zalieji === "ne")
        pastaba(out, "SPS žaliųjų reikalavimų dalyje pasirinkta " + z.map(function (k) { return "„" + ZAL_SPS[k] + "“"; }).join(", ") + ", o SS 13.1 punktas netaikomas. Patikrinkite, ar SPS ir sutartis sutampa" +
          (tsSut ? " (ar žalieji reikalavimai nurodyti Techninėje specifikacijoje)." : "."), [{ q: "zalieji" }, { sps: "zalieji" }]);
    }
    // socialiniai - nepriklausomai nuo žaliųjų dalies (SPS gali turėti vieną be kitos)
    if (R.socialiniai === "ne" && ctx.socialiniaiSPS === true)
      pastaba(out, "SPS nustato socialinius reikalavimus sutarties vykdymui (tiekėjas jų atitiktį deklaruoja pasiūlyme), o SS socialinių kriterijų punktas netaikomas. Patikrinkite, ar SPS ir sutartis sutampa.",
        [{ q: "socialiniai" }]);
    return out;
  }

  /* Vidaus taisyklių riba (vidaus-riba.js, 2026-10-12): ją įveda naudotojas, saugoma tik jo naršyklėje. Čia - priminimai, kai sutarties
     užtikrinimo klausimo atsakymas nesutampa su tuo, ką lemia riba; atsakymai nekeičiami ir nesiūlomi. Pati riba į tekstą nerašoma. */
  function vidausPriminimai(Z, ctx, A){
    var G = global.GP_VIDAUS_RIBA, out = [];
    if (!G) return out;
    var kodas = G.vertink(ctx.verte).kodas;
    if (kodas !== "virsija" && kodas !== "nevirsija") return out;
    klausimai(Z, ctx, A).forEach(function (q) {
      var v = q.vidausRiba;
      if (!v || q.reiksme == null) return;   // ir siūloma (nepatvirtinta) reikšmė patenka į dokumentą
      var kur = [{ q: q.id }];
      if (kodas === "virsija" && q.reiksme === v.ne)
        pastaba(out, "Vidaus taisyklės: numatoma pirkimo vertė viršija jūsų įvestą ribą, nuo kurios sutarties įvykdymo užtikrinimas privalomas, o sutartyje užtikrinimo nereikalaujama. " + G.ISIMTYS, kur);
      else if (kodas === "virsija" && v.iki && q.reiksme === v.iki)
        pastaba(out, "Vidaus taisyklės: numatoma pirkimo vertė viršija jūsų įvestą ribą, o pasirinktas užtikrinimo variantas skirtas pirkimams iki ribos.", kur);
      else if (kodas === "nevirsija" && v.virs && q.reiksme === v.virs)
        pastaba(out, "Vidaus taisyklės: numatoma pirkimo vertė neviršija jūsų įvestos ribos, o pasirinktas užtikrinimo variantas skirtas pirkimams virš ribos.", kur);
    });
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
            !/^(cvp|velavimas)/.test(l.id)) truksta.push(q.klausimas + " - " + l.uzrasas);
        if (l.kada === "*" && String(q.reiksme || "").trim() && !String(l.reiksme || "").trim()) truksta.push(q.klausimas + " - " + l.uzrasas);
      });
    });
    return truksta;
  }
  function sprendimai(Z, ctx, A){
    A = A || {};
    if (RANGA(ctx)) return sprendimaiPSR(Z, ctx, A);
    if (PPS(ctx)) return sprendimaiPPS(Z, ctx, A);
    if (DM(ctx)) return sprendimaiDM(Z, ctx, A);
    if (EKS(ctx)) return sprendimaiEKS(Z, ctx, A);
    var V = global.GP_SUTARCIU_GEN.vietos(Z), R = efektyvus(ctx, A, Z).R, S = {}, perspejimai = [], derinimas = derink(ctx, R);
    var rodomi = klausimai(Z, ctx, A), truksta = trukstami(rodomi);
    var nust = function (x, s) { if (x) S[x.raktas] = s; };
    var pav = String(ctx.pavadinimas || "").trim(), pavEN = String(ctx.pavadinimasEN || "").trim() || pav;
    var rask = function (rusis, v, re) { return vieta(V, rusis, v, re); };
    var taip = function (id) { return R[id] === "taip"; };

    // Įrašoma automatiškai (naudotojo taisyklė 2026-10-11): sutarties pavadinimas = pirkimo pavadinimas (1 žingsnis); 3.2 - pirkimo
    // pavadinimas ir numeris (kortelė arba klausimas). Kiti tušti laukai (sutarties numeris, tiekėjo rekvizitai, atstovai) - sudarant.
    var nr = pirkimoNr(ctx, R);
    V.filter(function (x) { return x.rusis === "laukas"; }).forEach(function (x) {
      if (/^Sutarties pavadinimas/.test(x.aprasas) && pav) nust(x, { tekstas: sutartiesPav(pav), tekstasEN: pavEN + " procurement contract" });
      else if (/^3\.2\./.test(x.aprasas) && pav) nust(x, { tekstas: pav + " pirkimas" + (nr ? ", pirkimo Nr. " + nr : nrSudarant(ctx, R) ? ", pirkimo Nr. [...]" : ""),
                                                          tekstasEN: pavEN + " procurement" + (nr ? ", procurement No. " + nr : nrSudarant(ctx, R) ? ", procurement No. [...]" : "") });
      else nust(x, { palikti: "sudarant" });
    });
    // Nurodymai, kurie skirti pildančiam sudarant
    ["1.2", "2.2", "16"].forEach(function (v) { V.filter(function (x) { return x.rusis === "nurodymas" && x.vieta === v; }).forEach(function (x) { nust(x, { palikti: "sudarant" }); }); });
    var p52 = V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === "5.2"; });
    p52.forEach(function (x) { nust(x, { palikti: "sudarant" }); });
    // maksimali kaina projekte - tik kai pradinė sutarties vertė lygi maksimaliai pirkimui skirtai lėšų sumai (įkainiai, Pirkėjas neįsipareigoja išpirkti viso kiekio)
    if (ikainiai(R) && R.kiekis === "ne") irasykKaina(R, p52, nust, truksta, perspejimai, "5.2 punktas", false);
    // 2.1 Pirkėjo kontaktiniai asmenys - sudarant sutartį (2026-10-16; ir ankstesnio juodraščio atsakymas į buvusį klausimą neįrašomas)
    nust(rask("nurodymas", "2.1"), { palikti: "sudarant" });

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
    else if (prekes(ctx) && R.terminas_pasiulyme === "taip") { nust(pTerm, { palikti: "sudarant" }); nust(vVnt, { palikti: "sudarant" }); }
    else if (R.terminas != null && skaicius(R.terminas)) {
      var n = skaicius(R.terminas), vnt = R.terminas_vnt || "men";
      var zod = vnt === "d" ? forma(n, "dieną.", "dienas.", "dienų.") : forma(n, "mėnesį.", "mėnesius.", "mėnesių.");
      var k = el(vVnt, new RegExp("^" + zod.replace(".", "\\.") + "$"));
      // LITGRID prekių sutarties formos sąraše - tik „mėnesį.“ ir „mėnesius.“ (10-20, 30, 40 ... mėnesių ir dienų nėra): taisyklinga forma
      // įrašoma tekstu valdiklio vietoje (kaip 11.1.2 p. „Kita formuluotė“) - terminas nekeičiamas, 4 žingsnis tai pasako (naujo darbuotojo patikra 2026-10-20)
      var zodEN = vnt === "d" ? (n === 1 ? "day." : "days.") : (n === 1 ? "month." : "months.");
      nust(pTerm, { tekstas: String(n), tekstasEN: String(n) });
      if (k < 0) {
        nust(vVnt, { laisvas: true, tekstas: zod, tekstasEN: zodEN });
        pastaba(perspejimai, "4.1 punkto formos sąraše nėra žodžio „" + zod.replace(/\.$/, "") + "“ (yra tik „" + (vVnt ? vVnt.elementai.join("“, „") : "") + "“) - terminas „" + n + " " + zod.replace(/\.$/, "") + "“ įrašomas tekstu.", [{ q: "terminas" }]);
      }
      else nust(vVnt, { elementas: k });
    }
    if (vBendras) {
      var nb = R.bendras_taikomas === "taip" ? skaicius(R.bendras) : null;
      if (R.bendras_taikomas === "ne") { nust(pBendras, { tekstas: "" }); nust(vBendras, { elementas: el(vBendras, /netaikomas/i) }); }
      else if (nb) {
        var zb = forma(nb, "mėnuo.", "mėnesiai.", "mėnesių."), kb = el(vBendras, new RegExp("^" + zb.replace(".", "\\.") + "$"));
        if (kb < 0) pastaba(perspejimai, "4.1 punkto bendro termino sąraše nėra formos „" + zb + "“.", [{ q: "bendras_taikomas" }]);
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
    var gk = String(R.galiojimas_kita || "").replace(/[.\s]+$/, "").replace(/\s+/g, " ").trim(), gkEN = String(R.galiojimas_kitaEN || "").replace(/[.\s]+$/, "").replace(/\s+/g, " ").trim();
    if (R.galiojimas === "kita") { if (gk && (!LTEN(ctx) || gkEN)) nust(v112, { laisvas: true, tekstas: gk + ".", tekstasEN: (gkEN || gk) + "." }); }
    else if (ga) nust(v112, { elementas: el(v112, ga.re), reiksmes: [R.iki_tekstas || ""] });
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
    // 14. Darbuotojų patekimas prie nacionaliniam saugumui svarbių įrenginių (atskiras klausimas, 2026-10-21), tinklo objektai
    var v143 = rask("valdiklis", "14.3");
    if (R.patekimas) nust(v143, { elementas: R.patekimas === "taip" ? el(v143, /^Punktas taikomas/) : el(v143, /netaikomas/i) });
    var v144 = rask("valdiklis", "14.4");
    if (R.tinklo) nust(v144, { elementas: R.tinklo === "taip" ? el(v144, /^Punktas taikomas/) : el(v144, /netaik/i) });
    // 15.2 pirkimo dokumentų adresas (paslaugos)
    var v152 = rask("valdiklis", "15.2");
    if (v152) nust(v152, String(R.cvp_adresas || "").trim() ? { tekstas: R.cvp_adresas.trim(), tekstasEN: R.cvp_adresas.trim() } : { palikti: "neatsakyta" });
    // 15 skyrius (2026-10-13): priedų sąrašas - nepridedamas priedas lieka su žodžiu „netaikoma“; prekių sutarties 15.4-15.5 punktai -
    // papildomi priedai (jūsų pavadinimai) arba „Netaikoma“ (iki tol šie punktai likdavo tušti)
    prieduSprendimai(Z, ctx, R, V, nust);
    var lauk15 = V.filter(function (x) { return x.rusis === "laukas" && /^15\.[45]\./.test(x.aprasas); });
    var be15 = function (t) { return prieduEilutes(t).map(function (x) { return x.replace(/[;.]$/, ""); }); };
    if (lauk15.length) {      // neprivaloma (2026-10-15): neatsakyta - kaip „Ne“, „Netaikoma“ (sąraše „Įrašoma automatiškai“)
      var pp = R.papildomi_priedai === "taip" ? be15(R.papildomi_priedai_f) : [], ppEN = R.papildomi_priedai === "taip" ? be15(R.papildomi_priedai_fEN) : [];
      var klP = KLAUSIMAI.filter(function (q) { return q.id === "papildomi_priedai"; })[0].klausimas;
      if (R.papildomi_priedai === "taip" && !pp.length && String(R.papildomi_priedai_f || "").trim()) truksta.push(klP + " - Papildomų priedų pavadinimai - kiekvienas atskiroje eilutėje");
      if (pp.length > lauk15.length) truksta.push(klP + " - formoje vietos " + lauk15.length + " papildomiems priedams, įrašyta " + pp.length + " (kitus pridėkite Word programoje)");
      if (LTEN(ctx) && pp.length && ppEN.length !== pp.length) truksta.push(klP + " - angliškų pavadinimų turi būti tiek pat, kiek lietuviškų (" + pp.length + ")");
      lauk15.forEach(function (x, k) { nust(x, pp[k] ? { tekstas: pp[k], tekstasEN: ppEN[k] || pp[k] } : { tekstas: "Netaikoma", tekstasEN: "Not applicable" }); });
    }

    Object.keys(S).forEach(function (k) { var s = S[k]; if (s && typeof s === "object" && ((s.elementas != null && s.elementas < 0) || (s.variantas != null && s.variantas < 0)))
      { perspejimai.push("Šablone nerasta vieta sprendimui " + k + " - patikrinkite šablono redakciją."); delete S[k]; } });
    return { S: S, truksta: truksta, perspejimai: perspejimai, derinimas: derinimas, R: R };
  }

  /* ---------------------------------------------------------------- rangos SS sprendimai generatoriui (2026-10-10) */
  function derinkPSR(ctx, R){
    var out = [], u = ctx.uztikrinimas, z = R.uztikrinimas_psr, p = rangosVariantas(ctx).ss.uztikrinimas, kur = [{ q: "uztikrinimas_psr" }, { sps: "uztikrinimas" }];
    if (!u || u.taikomas == null || !z) return out;
    if (u.taikomas === false && z !== "netaikomas")
      pastaba(out, "SPS sutarties įvykdymo užtikrinimo nereikalauja, o SS " + p + " punkte pasirinktas 10 % užtikrinimas. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
    if (u.taikomas === true && z === "netaikomas")
      pastaba(out, "SPS reikalauja sutarties įvykdymo užtikrinimo, o SS " + p + " punkte pasirinkta, kad jis netaikomas. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
    if (u.taikomas === true && z !== "netaikomas" && u.eur > 0 && ctx.verte > 0){
      var pr = apvalink(u.eur / ctx.verte * 100);
      if (Math.abs(pr - 10) > 0.01) pastaba(out, "SS " + p + " punkte užtikrinimo suma - 10 proc. nuo Sutarties kainos (be PVM), o SPS užtikrinimas - " + u.eur + " Eur, t. y. " + skLT(pr) +
        " % numatomos vertės. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
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
    var pav = String(ctx.pavadinimas || "").trim(), v = rangosVariantas(ctx);

    // Sudarant (pagal laimėjusį pasiūlymą): Rangovo duomenys ir registracijos valstybė, kaina, sąskaita, kontaktai, parašai, Užsakovo pasirašantis asmuo
    V.filter(function (x) { return x.rusis === "pildoma" || x.rusis === "valdiklis"; }).forEach(function (x) { nust(x, { palikti: "sudarant" }); });
    irasyk(pild("", /^\[pirkimo pavadinimas\]$/), pav);
    nust(pild("", /^\[numeris\]$/), numerioSprendimas(ctx, R));
    // 11 Sutarties kaina: maksimali kaina projekte (neprivalomas klausimas) - be PVM, PVM ir su PVM
    irasykKaina(R, [0, 1, 2].map(function (k) { return pild("11", /^\[suma skaičiais\]$/, k); }).filter(Boolean), nust, truksta, perspejimai, "SS 11 punktas", true);
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
    var etapuNr = priedoNr(Z, R, new RegExp("^" + v.etapuPriedas));
    if (R.etapai === "taip"){
      nust(blok("etapai"), { taikoma: true });
      [pild("4", /^\[\s*\]$/), pild("12", /^\[\s*\]$/), pild("15", /^\[\.\.\.\]$/)].forEach(function (x) { irasyk(x, etapuNr || ""); });   // statybos rangos SS - „[ ]“ su tarpu
      irasyk(pild("1.1 priedas", /^\[OBJEKTAS\]$/), t("objektas"));
      var eSk = etapuSkyrius(Z), ePr = V.filter(function (x) { return eSk && x.vieta === eSk.sritis; });
      if (eSk && R.etapu_pildymas === "cia") {
        // etapų lentelė iš lentelės redaktoriaus: eilutės, netaikomi stulpeliai, delspinigių stulpelio antraštės variantas; formos „Pildymo
        // sąlygos“ (nurodymai rengėjui) šalinamos; langeliai be reikšmės (mokėtinos sumos) lieka pildyti sudarant sutartį
        var eS = etapuSprendimas(R, KLAUSIMAI_PSR.filter(function (q) { return q.id === "etapu_lentele"; })[0].klausimas);
        eS.truksta.forEach(function (x) { truksta.push(x); });
        eS.perspejimai.forEach(function (x, i) { pastaba(perspejimai, x, eS.perspejimai.kur && eS.perspejimai.kur[i]); });
        if (eS.eilutes.length) nust(ePr.filter(function (x) { return x.rusis === "lentele"; })[0], { eilutes: eS.eilutes, beStulpeliu: eS.beStulpeliu });
        ePr.filter(function (x) { return x.rusis === "nurodymu_blokas"; }).forEach(function (x) { nust(x, "salinti"); });
        var eVar = eSk.lentele.nurodymas.variantai.filter(function (x) { return x.id === R.etapu_delspinigiai; })[0];
        ePr.filter(function (x) { return x.rusis === "nurodymas"; }).forEach(function (x) { irasyk(x, eVar ? eVar.tekstas : ""); });
      } else {
        // etapų lentelė ir jos nurodymai - Word programoje
        ePr.filter(function (x) { return x.rusis === "laukas" || x.rusis === "nurodymas" || x.rusis === "nurodymu_blokas"; }).forEach(function (x) { nust(x, { palikti: "word" }); });
      }
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
    // 10 Užsakovo ir Rangovo atstovai, atsakingas už paskelbimą - sudarant sutartį (2026-10-16; ir ankstesnio juodraščio atsakymai neįrašomi)
    [0, 2].forEach(function (j) { nust(pild("10", /^\[Pareigos, vardas, pavardė\]$/, j), { palikti: "sudarant" }); nust(pild("10", /^\[Telefonas, el\. paštas\]$/, j), { palikti: "sudarant" }); });
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
    if (v.ss.ekspertize && R.ekspertize) nust(blok("ekspertizė"), { taikoma: R.ekspertize === "taip" });
    var e = skaicius(R.ekspertizes_dienos);
    if (v.ss.ekspertize && R.ekspertize === "taip") {
      irasyk(pild(String(v.ss.ekspertize)), e ? String(e) : "");
      if (e && !(e % 10 === 0 || (e % 100 >= 10 && e % 100 <= 19)))
        perspejimai.push("SS " + v.ss.ekspertize + " punkte po skaičiaus šablone įrašyta „darbo dienų“ - tinka 10-19, 20, 30 ir pan.; skaičiui " + e + " žodžio formą pataisykite Word programoje.");
    }
    if (R.atjungimai) nust(blok("atjungimai"), { taikoma: R.atjungimai === "taip", dalys: [true, !!t("atjungimai_kiti")] });
    if (R.atjungimai === "taip" && t("atjungimai_kiti")) nust(pild(String(v.ss.atjungimai)), { tekstas: t("atjungimai_kiti").replace(/[;.]\s*$/, "") });
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
    prieduSprendimai(Z, ctx, R, V, nust);
    // Priedų sąrašo eilutė „Kiti priedai (išvardijami prieš paskelbiant Pirkimą).“ (2026-10-13): priedai atskiromis eilutėmis arba „netaikoma“
    var kitiP = V.filter(function (x) { return x.rusis === "kiti_priedai"; })[0] || null, kitiE = prieduEilutes(R.kiti_priedai_f);
    if (R.kiti_priedai === "ne") nust(kitiP, { tekstas: KITI_PRIEDAI_NETAIKOMA });
    else if (R.kiti_priedai === "taip" && kitiE.length) nust(kitiP, { eilutes: kitiE });
    else if (R.kiti_priedai === "taip" && t("kiti_priedai_f")) truksta.push(rangosKlausimai(v).filter(function (q) { return q.id === "kiti_priedai"; })[0].klausimas + " - Kitų priedų pavadinimai - kiekvienas atskiroje eilutėje");

    Object.keys(S).forEach(function (k) { var s = S[k]; if (s && typeof s === "object" && s.variantas != null && s.variantas < 0)
      { perspejimai.push("Šablone nerasta vieta sprendimui " + k + " - patikrinkite šablono redakciją."); delete S[k]; } });
    return { S: S, truksta: truksta, perspejimai: perspejimai, derinimas: derinimas, R: R };
  }

  /* ---------------------------------------------------------------- projektavimo paslaugų SS sprendimai generatoriui (2026-10-11) */
  var UZT_PPS = [{ q: "pp_uztikrinimas" }, { sps: "uztikrinimas" }], NAC_PPS = [{ q: "pp_patikra" }, { z1: "nacsaug" }];
  function derinkPPS(ctx, R){
    var out = [], u = ctx.uztikrinimas, z = R.pp_uztikrinimas;
    if (u && u.taikomas != null && z){
      if (u.taikomas === false && z !== "ne")
        pastaba(out, "SPS sutarties įvykdymo užtikrinimo nereikalauja, o SS 6.1 punkte pasirinkta, kad užtikrinimas pateikiamas. Patikrinkite, ar SPS ir sutartis sutampa.", UZT_PPS);
      if (u.taikomas === true && z === "ne")
        pastaba(out, "SPS reikalauja sutarties įvykdymo užtikrinimo, o SS 6.1 punkte pasirinkta, kad jo pateikti nereikalaujama. Patikrinkite, ar SPS ir sutartis sutampa.", UZT_PPS);
    }
    if (ctx.nacsaug === true && R.pp_patikra === "ne")
      pastaba(out, "1 žingsnyje nurodyta, kad pirkimui taikomi nacionalinio saugumo reikalavimai, o SS 8.1 punkte pasirinkta, kad patikra nebus atliekama. Patikrinkite, ar pirkimo sąlygos ir sutartis sutampa.", NAC_PPS);
    if (ctx.nacsaug === false && R.pp_patikra === "taip")
      pastaba(out, "1 žingsnyje nurodyta, kad nacionalinio saugumo reikalavimai pirkimui netaikomi, o SS 8.1 punkte pasirinkta, kad patikra bus atliekama (BS 9.1 skyrius taikomas, kai tai nurodyta specialiosiose sąlygose arba pirkimo dokumentuose). Patikrinkite, ar pirkimo sąlygos ir sutartis sutampa.", NAC_PPS);
    return out;
  }
  /* Sutarties pavadinimas (naudotojo sprendimas 2026-10-12): „{pirkimo pavadinimas} pirkimo sutartis“ - „Tvoros remonto pirkimo sutartis“
     (2026-10-11 - „... pirkimas“, iki tol - „... pirkimo-pardavimo sutartis“). Pirkimo pavadinimas kitose vietose (3.2 p., įžanga) - „... pirkimas“. */
  // Antraštė didžiosiomis - matavimo vienetai lieka kaip parašyti („110 kV“; laukai.js, 2026-10-20)
  function didziosiomis(t){ return global.GP_LAUKAI && global.GP_LAUKAI.antrasteDidziosiomis ? global.GP_LAUKAI.antrasteDidziosiomis(t) : String(t || '').toLocaleUpperCase('lt'); }
  function sutartiesPav(pav){ pav = String(pav || "").trim(); return pav ? pav + " pirkimo sutartis" : ""; }
  function uzsakovoRekvizitai(){ return global.GP_ORG && global.GP_ORG.rekvizitai ? global.GP_ORG.rekvizitai("litgrid") : null; }
  /* Kas įrašoma be klausimo - 2 žingsnio sąrašui „Įrašoma automatiškai“ (reikšmė ir jos kilmė; nieko tylaus) */
  function automatiniai(Z, ctx, A){
    var R = efektyvus(ctx, A || {}, Z).R, pav = String(ctx.pavadinimas || "").trim(), nr = pirkimoNr(ctx, R), out = [], rek = uzsakovoRekvizitai();
    var sud = nrSudarant(ctx, R), SUD_NR = "numeris bus įrašytas sudarant sutartį";
    var nrKilme = String(ctx.numeris || "").trim() ? "pirkimo kortelė" : nr ? "jūsų įrašytas" : sud ? "pildoma sudarant sutartį (numerio neįrašėte)" : "";
    var kn = kainaProjekte(R), knYra = !!(kn && !kn.klaida);
    var pirk = pav ? pav + " pirkimas" : "";
    if (DM(ctx)) {
      out.push({ kas: "Sutarties pavadinimas (antraštė)", reiksme: didziosiomis(sutartiesPav(pav)), kilme: "pirkimo pavadinimas (1 žingsnis)", truksta: pav ? "" : "pirkimo pavadinimo" });
      out.push({ kas: "Pirkimo pavadinimas ir numeris (sutarties įžanga)", reiksme: pav ? pav + " pirkimą" + (nr ? " (pirkimo Nr. " + nr + ")" : sud ? " (" + SUD_NR + ")" : "") : "",
                 kilme: "1 žingsnis" + (nrKilme ? "; numeris - " + nrKilme : ""), truksta: !pav ? "pirkimo pavadinimo" : !nr && !sud ? "pirkimo numerio" : "" });
      out.push({ kas: "Užsakovo rekvizitai (sutarties įžanga ir lentelė prieš parašus)",
                 reiksme: "LITGRID AB" + (rek ? ", " + rek.adresas + ", įmonės kodas " + rek.kodas + ", PVM kodas " + rek.pvmKodas + ", sąskaita " + rek.saskaita + ", " + rek.bankas + ", banko kodas " + rek.bankoKodas + ", " + rek.telefonas + ", " + rek.elPastas : ""),
                 kilme: "LITGRID AB rekvizitai (kaip prekių, paslaugų ir rangos sutarčių formose); formoje šios lentelės eilutės tuščios", truksta: rek ? "" : "organizacijų registro" });
      var p2 = dmPriedoNr(Z, /^Techninė specifikacija/), p3 = dmPriedoNr(Z, /^Rangovo pasiūlymas/);
      out.push({ kas: "Priedų numeriai tekste (1.1 punktas" + (R.dm_vykdymas === "uzsakymai" ? " ir 4.4 punktas" : "") + ")",
                 reiksme: "Techninė specifikacija - " + p2 + " priedas" + (R.dm_vykdymas === "uzsakymai" ? "; įkainiai (Rangovo pasiūlymas) - " + p3 + " priedas" : ""),
                 kilme: "to paties šablono priedų sąrašas", truksta: "" });
    } else if (EKS(ctx)) {
      out.push({ kas: "Pirkimo pavadinimas ir numeris (sutarties įžanga)", reiksme: pav ? pav + " pirkimą" + (nr ? " (Nr. " + nr + ")" : sud ? " (" + SUD_NR + ")" : "") : "",
                 kilme: "1 žingsnis" + (nrKilme ? "; numeris - " + nrKilme : ""), truksta: !pav ? "pirkimo pavadinimo" : !nr && !sud ? "pirkimo numerio" : "" });
      out.push({ kas: "Pirkimo pavadinimas (5 eilutė „Pirkimas“)", reiksme: pav ? pav + " pirkimas" : "",
                 kilme: "1 žingsnis; pirkimo būdas, paskelbimo data ir numeris lieka pildyti sudarant sutartį", truksta: pav ? "" : "pirkimo pavadinimo" });
      if (knYra) out.push({ kas: "PVM ir Sutarties kaina su PVM (7 eilutė)", reiksme: kn.pvm + " Eur ir " + kn.su + " Eur", kilme: "apskaičiuota iš jūsų įrašytos sumos be PVM, standartinis PVM tarifas", truksta: "" });
      out.push({ kas: "Užsakovas (sutarties įžanga, 8, 14 ir 17 eilutės, priedų sąrašas)", reiksme: "LITGRID AB; rekvizitai, sąskaita ir bankas - kaip formoje",
                 kilme: "kaip sutarties formoje - vietoj žymos „ĮMONĖS PAVADINIMAS“", truksta: "" });
      var ekP = [];
      if (ctx.variantas === "TP") ekP.push("Darbų įkainiai ir aprašymai - " + dmPriedoNr(Z, /^Darbų įkainiai ir aprašymai/) + " priedas (1 eilutė)");
      if (ctx.variantas !== "TRASOS" && R.ek_uztikrinimas !== "ne" && ekBankuPriedai(Z)) ekP.push("Užsakovui priimtinų bankų ir draudimo bendrovių sąrašai - " + ekBankuPriedai(Z) + " priedai (16 eilutė)");
      if (ekP.length) out.push({ kas: "Priedų numeriai tekste", reiksme: ekP.join("; "), kilme: "tos pačios formos priedų sąrašas (18 eilutė)", truksta: "" });
      if (ctx.variantas === "TRASOS" && R.ek_uztikrinimas !== "ne") { var ekM = /^\d+$/.test(String(R.ek_terminas || "").trim()) ? String(R.ek_terminas).trim() : "";
        out.push({ kas: "Sutarties įvykdymo užtikrinimo galiojimo terminas (16 eilutė)", reiksme: ekM ? ekM + " mėn. (Darbų atlikimo terminas) ir 1 (vienas) mėnuo" : "",
                   kilme: "tas pats terminas kaip 2 eilutėje (jūsų atsakymas)", truksta: ekM ? "" : "darbų atlikimo termino" }); }
    } else if (RANGA(ctx) || PPS(ctx)) {
      out.push({ kas: "Pirkimo pavadinimas ir numeris (sutarties įžanga)", reiksme: pav ? pav + " pirkimą" + (nr ? " Nr. " + nr : sud ? " (" + SUD_NR + ")" : "") : "",
                 kilme: "1 žingsnis" + (nrKilme ? "; numeris - " + nrKilme : ""), truksta: !pav ? "pirkimo pavadinimo" : !nr && !sud ? "pirkimo numerio" : "" });
      if (RANGA(ctx) && knYra) out.push({ kas: "PVM ir Sutarties kaina su PVM (SS 11 punktas)", reiksme: kn.pvm + " Eur ir " + kn.su + " Eur", kilme: "apskaičiuota iš jūsų įrašytos sumos be PVM, standartinis PVM tarifas", truksta: "" });
      out.push({ kas: PPS(ctx) ? "Užsakovo rekvizitai (sutarties įžanga ir 7.1 punktas)" : "Užsakovo rekvizitai",
                 reiksme: "LITGRID AB" + (rek ? ", A. s. " + rek.saskaita + ", " + rek.bankas + ", banko kodas " + rek.bankoKodas : ""),
                 kilme: PPS(ctx) ? "kaip sutarties formoje; sąskaita ir bankas - LITGRID AB rekvizitai (kaip prekių, paslaugų ir rangos sutarčių formose)" : "kaip sutarties formoje",
                 truksta: PPS(ctx) && !rek ? "organizacijų registro" : "" });
    } else {
      out.push({ kas: "Sutarties pavadinimas", reiksme: sutartiesPav(pav), kilme: "pirkimo pavadinimas (1 žingsnis)", truksta: pav ? "" : "pirkimo pavadinimo" });
      out.push({ kas: "Pirkimo pavadinimas ir numeris (3.2 punktas)", reiksme: pirk ? pirk + (nr ? ", pirkimo Nr. " + nr : sud ? ", pirkimo Nr. [...] (" + SUD_NR + ")" : "") : "",
                 kilme: "1 žingsnis" + (nrKilme ? "; numeris - " + nrKilme : ""), truksta: !pav ? "pirkimo pavadinimo" : !nr && !sud ? "pirkimo numerio" : "" });
      if (knYra && ikainiai(R) && R.kiekis === "ne") out.push({ kas: "PVM ir Sutarties kaina su PVM (5.2 punktas)", reiksme: kn.pvm + " ir " + kn.su, kilme: "apskaičiuota iš jūsų įrašytos sumos be PVM, standartinis PVM tarifas", truksta: "" });
      out.push({ kas: "Pirkėjo rekvizitai (1.1.1-1.1.8 punktai)", reiksme: "LITGRID AB, sąskaita ir bankas", kilme: "kaip sutarties formoje", truksta: "" });
      if (laisviPriedai(Z).length && R.papildomi_priedai !== "taip")
        out.push({ kas: "Papildomi priedai (15.4 ir 15.5 punktai)", reiksme: "Netaikoma", kilme: R.papildomi_priedai === "ne" ? "jūsų atsakymas" : "papildomų priedų nenurodėte (neprivaloma)", truksta: "" });
    }
    // priedų sąrašas (2026-10-15): kai pasirenkamų priedų nėra, klausimo nėra - sutarties sąlygos, techninė specifikacija ir pasiūlymas
    // pridedami visada, kitus (pvz. trišalės sutarties projektą) lemia kiti atsakymai; nepridedamas - su žodžiu „netaikoma“, kaip sutartyje
    var prS = prieduSarasas(Z, ctx, R);
    if (prS.length && !prS.some(function (p) { return !p.valdo; }))
      out.push({ kas: "Priedų sąrašas", reiksme: prS.map(function (p) { return String(p.tekstas || "").replace(/[;.:]+$/, "") + (p.pridedamas ? "" : " - netaikoma"); }).join("; "),
                 kilme: "pasirenkamų priedų formoje nėra: sutarties sąlygos, techninė specifikacija ir pasiūlymas pridedami visada" +
                   (prS.some(function (p) { return !PR_SUTARTIS.test(p.tekstas) && !PR_VISADA.test(String(p.tekstas || "").trim()); }) ? ", kitus lemia kiti šios sutarties atsakymai" : ""), truksta: "" });
    return out;
  }
  function sprendimaiPPS(Z, ctx, A){
    var V = global.GP_SUTARCIU_GEN.vietos(Z), R = efektyvus(ctx, A, Z).R, S = {}, perspejimai = [], derinimas = derinkPPS(ctx, R);
    var truksta = trukstami(klausimai(Z, ctx, A));
    var nust = function (x, s) { if (x) S[x.raktas] = s; };
    var t = function (id) { return String(R[id] == null ? "" : R[id]).trim(); };
    var nur = function (id) { return V.filter(function (x) { return x.rusis === "nurodymas" && x.id === id; })[0] || null; };
    var pild = function (v, re, n) { return V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === v && (!re || re.test(x.tekstas || "")); })[n || 0] || null; };
    var vid = function (id) { return V.filter(function (x) { return x.raktas === "vd:" + id; })[0] || null; };
    var nepr = function (id) { return V.filter(function (x) { return x.raktas === "o:" + id; })[0] || null; };
    var irasyk = function (x, tekstas) { nust(x, tekstas ? { tekstas: tekstas } : { palikti: "neatsakyta" }); };
    var sk = function (id) { var n = skaicius(R[id]); return n && n > 0 ? n : null; };
    var pav = String(ctx.pavadinimas || "").trim();

    // Sudarant (naudotojo taisyklė 2026-10-11: projektas rengiamas prieš pirkimą): Projektuotojo duomenys ir registracijos valstybė, atstovai,
    // kainos, kontaktai ir sąskaitos, pasirašantys asmenys
    V.filter(function (x) { return x.rusis === "pildoma" || x.rusis === "valdiklis"; }).forEach(function (x) { nust(x, { palikti: "sudarant" }); });
    irasyk(pild("", /^\[pirkimo pavadinimas\]$/), pav);
    nust(pild("", /^\[numeris\]$/), numerioSprendimas(ctx, R));
    // 7.1 Užsakovo sąskaita ir bankas (naudotojo taisyklė 2026-10-11: pirkimo vykdytojo rekvizitai žinomi - įrašomi automatiškai; LITGRID
    // formoje šios dvi eilutės tuščios, kiti Užsakovo rekvizitai įrašyti) - iš organizacijų registro (shared/organizacijos.js)
    var rek = uzsakovoRekvizitai();
    if (rek) { nust(pild("7.1", /^_+$/), { tekstas: rek.saskaita }); nust(pild("7.1", /^Bankas$/), { tekstas: "Bankas " + rek.bankas + ", banko kodas " + rek.bankoKodas }); }
    else perspejimai.push("Užsakovo sąskaita ir bankas (7.1 punktas) neįrašyti - neįkeltas organizacijų registras (shared/organizacijos.js).");
    // 1.2 investicinis projektas
    if (R.pp_investicinis === "ne") nust(nepr("investicinis_projektas"), { tekstas: NETAIKOMAS });
    else if (R.pp_investicinis === "taip")
      irasyk(pild("1.2"), t("pp_investicinis_pav") && t("pp_investicinis_nr") ? t("pp_investicinis_pav").replace(/\.$/, "") + ", Nr. " + t("pp_investicinis_nr").replace(/^Nr\.?\s*/i, "").replace(/\.$/, "") : "");
    // 2.1 objektas, 3.1 projektavimo paslaugų terminas (po „per“ - galininkas)
    irasyk(pild("2.1"), t("pp_objektas").replace(/[.\s]+$/, ""));
    var n = sk("pp_terminas");
    irasyk(pild("3.1"), n ? n + " " + ((R.pp_terminas_vnt || "men") === "d" ? forma(n, "dieną", "dienas", "dienų") : forma(n, "mėnesį", "mėnesius", "mėnesių")) : "");
    // 3.3, 3.6, 3.8 - skaičius šablono sakinyje; žodžio forma šablone fiksuota („mėnesių“, „mėnesiams“, „mėnesius“, „kartus“)
    var zodis = function (vieta, id, tinka, zodisSablone, kokie) {
      var x = sk(id);
      if (x && !tinka(x)) perspejimai.push("SS " + vieta + " punkte po skaičiaus šablone įrašyta „" + zodisSablone + "“ - tinka " + kokie + "; skaičiui " + x + " žodžio formą pataisykite Word programoje.");
      return x ? String(x) : "";
    };
    var kelios = function (x) { var d = x % 10, s2 = x % 100; return d >= 2 && (s2 < 12 || s2 > 19); };   // 2-9, 22-29 ...: „mėnesius“, „kartus“
    var neVns = function (x) { return !(x % 10 === 1 && x % 100 !== 11); };                                  // ne 1, 21, 31 ...: „mėnesių“, „mėnesiams“
    irasyk(pild("3.3"), zodis("3.3", "pp_pratesimas_max", neVns, "mėnesių", "visiems skaičiams, išskyrus 1, 21, 31 ir pan."));
    irasyk(pild("3.6"), zodis("3.6", "pp_pratesimas_ilgiau", neVns, "mėnesiams", "visiems skaičiams, išskyrus 1, 21, 31 ir pan."));
    if (R.pp_prieziura_taikoma === "ne") {
      // priežiūra neperkama: 3.8 p. - „Punktas netaikomas.“, 4.1 p. kainos eilutė - „... - netaikoma.“, 2.1 p. - be žodžių apie priežiūrą
      var b38 = nepr("priežiūra"), b41 = nepr("priežiūros_kaina"), f21 = V.filter(function (x) { return x.raktas === "f:priežiūra_dalyke"; })[0];
      if (b38 && b41 && f21) { nust(b38, { tekstas: NETAIKOMAS }); nust(b41, { tekstas: PP_PRIEZIUROS_KAINA }); nust(f21, "salinti"); }
      else perspejimai.push("Formos žemėlapyje nerastos projekto vykdymo priežiūros vietos (2.1, 3.8 ar 4.1 punktas) - atsakymas „Ne“ neįrašytas; patikrinkite šablono redakciją.");
      if (R.pp_uztikrinimas === "abu") pastaba(perspejimai, "Projekto vykdymo priežiūros paslaugos neperkamos, o SS 6.1 punkte pasirinktas užtikrinimas ir pagal BS 7.5.2 punktą (projekto vykdymo priežiūros paslaugoms). Patikrinkite SS 6.1 punkto atsakymą.",
        [{ q: "pp_uztikrinimas" }]);
    } else if (R.pp_prieziura_taikoma === "taip") {
      irasyk(pild("3.8", null, 0), zodis("3.8", "pp_prieziura", kelios, "mėnesius", "2-9, 22-29 ir pan."));
      irasyk(pild("3.8", null, 1), zodis("3.8", "pp_prieziura_kartai", kelios, "kartus", "2-9, 22-29 ir pan."));
      irasyk(pild("3.8", null, 2), zodis("3.8", "pp_prieziura_pratesimas", neVns, "mėnesių laikotarpiui", "visiems skaičiams, išskyrus 1, 21, 31 ir pan."));
    } else [0, 1, 2].forEach(function (k) { irasyk(pild("3.8", null, k), ""); });
    // 4.2 ES fondai, 6.1 užtikrinimas, 8.1 patikra - pasirinkimai pastraipos viduje
    if (R.pp_es) nust(vid("es_fondai"), { variantas: R.pp_es === "taip" ? 0 : 1 });
    var uz = { abu: 0, ne: 1, p751: 2 }[R.pp_uztikrinimas];
    if (uz != null) nust(vid("užtikrinimas"), { variantas: uz });
    if (R.pp_patikra) {
      nust(vid("patikra"), { variantas: R.pp_patikra === "taip" ? 0 : 1 });
      // 12 priedas „Pareigų sąrašas“: patikra atliekama - lieka be nurodymo; neatliekama - eilutė lieka su žodžiu „netaikoma“ (13-15 priedų numeriai nesikeičia)
      nust(nur("pareigų_sąrašas"), R.pp_patikra === "taip" ? "salinti" : { tekstas: "- netaikoma" });
    }
    // 8.2-8.3 koordinatorius, 8.4 kitos sąlygos: netaikomame punkte - „Punktas netaikomas.“
    if (R.pp_koordinatorius === "ne") { nust(nepr("koordinatorius"), { tekstas: NETAIKOMAS }); nust(nepr("koordinatoriaus_kandidatūra"), { tekstas: NETAIKOMAS }); }
    else if (R.pp_koordinatorius === "p82") nust(nepr("koordinatoriaus_kandidatūra"), { tekstas: NETAIKOMAS });
    if (R.pp_kitos === "ne") nust(nepr("kitos_sąlygos"), { tekstas: NETAIKOMAS });
    else if (R.pp_kitos === "taip") irasyk(nur("kitos_sąlygos"), t("pp_kitos_f"));
    prieduSprendimai(Z, ctx, R, V, nust);
    // 15 priedas „Kiti priedai“
    if (R.pp_kiti_priedai === "ne") nust(nur("kiti_priedai"), { tekstas: "- netaikoma" });
    else if (R.pp_kiti_priedai === "taip") nust(nur("kiti_priedai"), t("pp_kiti_priedai_f") ? { tekstas: ": " + t("pp_kiti_priedai_f").replace(/[.;\s]+$/, ""), glaustai: true } : { palikti: "neatsakyta" });

    return { S: S, truksta: truksta, perspejimai: perspejimai, derinimas: derinimas, R: R };
  }
  /* ---------------------------------------------------------------- darbų pirkimo-pardavimo SS sprendimai generatoriui (2026-10-12) */
  function derinkDM(ctx, R){
    var out = [], u = ctx.uztikrinimas, z = R.dm_uztikrinimas, kur = [{ q: "dm_uztikrinimas" }, { sps: "uztikrinimas" }];
    if (u && u.taikomas != null && z){
      if (u.taikomas === false && z === "taip")
        pastaba(out, "SPS sutarties įvykdymo užtikrinimo nereikalauja, o SS 6.3 punkte pasirinkta, kad užtikrinimas pateikiamas. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
      if (u.taikomas === true && z === "ne")
        pastaba(out, "SPS reikalauja sutarties įvykdymo užtikrinimo, o SS 6.3 punkte pasirinkta „netaikoma“. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
      var s = sumaLT(R.dm_uztikrinimo_suma);
      if (u.taikomas === true && z === "taip" && u.eur > 0 && s && s !== sumaLT(u.eur))
        pastaba(out, "SPS nurodyta sutarties įvykdymo užtikrinimo suma - " + sumaLT(u.eur) + " Eur, o SS 6.3 punkte - " + s + " Eur. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
    }
    if (ctx.tiesioginis === true && R.dm_trisale === "ne")
      pastaba(out, "SPS nurodo, kad taikomas tiesioginis atsiskaitymas su subtiekėjais, o trišalės sutarties projektas prie Sutarties nepridedamas (šios sutarties bendrosiose sąlygose tiesioginio atsiskaitymo tvarkos nėra). Patikrinkite, ar SPS ir sutartis sutampa.", [{ q: "dm_trisale" }, { sps: "tiesioginis" }]);
    return out;
  }
  /* Užsakovo rekvizitų lentelės eilutės (etiketė šablone be reikšmės) - reikšmė iš organizacijų registro; registras - iš pačios sutarties įžangos */
  var DM_REKV = [[/^Adresas:$/, function (r) { return r.adresas; }], [/^Įmonės kodas:$/, function (r) { return r.kodas; }], [/^PVM kodas:$/, function (r) { return r.pvmKodas; }],
                 [/^Sąskaitos Nr\.$/, function (r) { return r.saskaita; }], [/^Bankas:$/, function (r) { return r.bankas; }], [/^Banko kodas:$/, function (r) { return r.bankoKodas; }],
                 [/^Tel\. Nr\.$/, function (r) { return r.telefonas; }], [/^El\. p\.:$/, function (r) { return r.elPastas; }]];
  function dmRegistras(Z){
    var p = (Z.pastraipos || []).filter(function (t) { return /„Užsakovas“/.test(t) && /kaupiami ir saugomi/.test(t); })[0] || "";
    var m = /duomenys apie bendrovę kaupiami ir saugomi ([^,]+),/.exec(p);
    return m ? m[1].trim() : "";
  }
  function dmPriedoNr(Z, re){ var q = ((Z && Z.priedai) || []).filter(function (x) { return re.test(x.tekstas); })[0]; return q ? q.nr : ""; }
  function sprendimaiDM(Z, ctx, A){
    var V = global.GP_SUTARCIU_GEN.vietos(Z), R = efektyvus(ctx, A, Z).R, S = {}, perspejimai = [], derinimas = derinkDM(ctx, R);
    var truksta = trukstami(klausimai(Z, ctx, A));
    var nust = function (x, s) { if (x) S[x.raktas] = s; };
    var t = function (id) { return String(R[id] == null ? "" : R[id]).trim(); };
    var pild = function (v, re, n) { return V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === v && (!re || re.test(x.tekstas || "")); })[n || 0] || null; };
    var vald = function (v) { return V.filter(function (x) { return x.rusis === "valdiklis" && x.vieta === v; })[0] || null; };
    var blok = function (id) { return V.filter(function (x) { return x.raktas === "b:" + id; })[0] || null; };
    var nepr = function (id) { return V.filter(function (x) { return x.raktas === "o:" + id; })[0] || null; };
    var irasyk = function (x, tekstas) { nust(x, tekstas ? { tekstas: tekstas } : { palikti: "neatsakyta" }); };
    var sk = function (id) { var n = skaicius(R[id]); return n && n > 0 ? n : null; };
    var be = function (x) { return String(x || "").replace(/^\[|\]$/g, ""); };
    var pav = String(ctx.pavadinimas || "").trim(), m = R.dm_vykdymas;

    // Sudarant (naudotojo taisyklė 2026-10-11): Sutarties data, vieta ir numeris, Rangovo duomenys ir atstovai, Užsakovo atstovas, kaina,
    // atsakingi asmenys, Rangovo rekvizitai, pasirašantys asmenys
    V.filter(function (x) { return x.rusis === "pildoma" || x.rusis === "valdiklis"; }).forEach(function (x) { nust(x, { palikti: "sudarant" }); });
    // Žinoma iš pirkimo: sutarties pavadinimas (= pirkimo pavadinimas), pirkimo pavadinimas ir numeris, Užsakovo rekvizitai
    irasyk(pild("", /^\[PERKAMI DARBAI\]$/), didziosiomis(sutartiesPav(pav)));
    irasyk(pild("", /^\[pirkimo pavadinimas\]$/), pav);
    nust(pild("", /^\[numeris\]$/), numerioSprendimas(ctx, R));
    var rek = uzsakovoRekvizitai(), reg = dmRegistras(Z);
    if (rek) {
      DM_REKV.forEach(function (e) { var x = pild("parašai", e[0], 0), v = e[1](rek); if (x && v) nust(x, { tekstas: x.tekstas + " " + v }); });
      var xr = pild("parašai", /^Duomenys apie asmenį kaupiami:$/, 0);
      if (xr && reg) nust(xr, { tekstas: xr.tekstas + " " + reg });
    } else perspejimai.push("Užsakovo rekvizitai (lentelė prieš parašus) neįrašyti - neįkeltas organizacijų registras (shared/organizacijos.js).");
    // 1.1 Techninės specifikacijos priedo numeris, 1.2 aktas
    irasyk(pild("1.1", /^\[\.\.\.\]$/), dmPriedoNr(Z, /^Techninė specifikacija/));
    var va = vald("1.2"), ka = { aktas: /^Atliktų darbų aktą$/, paskutinis: /^paskutinį Atliktų darbų aktą$/ }[R.dm_aktas];
    if (va && ka) nust(va, { elementas: el(va, ka) });
    // 2 skyrius, 3.2-3.4, 4.3, 4.4 - pagal darbų vykdymo atvejį; netaikomame punkte - „Punktas netaikomas.“ (numeriai nesikeičia)
    if (m) {
      nust(blok("užsakymai"), m === "uzsakymai" ? { taikoma: true } : { taikoma: false, lieka: [0], vietoje: { 1: SKYRIUS_NETAIKOMAS } });
      nust(blok("grafikas"), m === "grafikas" ? { taikoma: true }
        : m === "be_grafiko" ? { taikoma: false, vietoje: { 0: NETAIKOMAS, 1: NETAIKOMAS }, lieka: [2] } : { taikoma: false, vietoje: { 0: NETAIKOMAS, 1: NETAIKOMAS, 2: NETAIKOMAS } });
      nust(blok("fiksuota_kaina"), m === "uzsakymai" ? { taikoma: false, vietoje: { 0: NETAIKOMAS } } : { taikoma: true });
      nust(blok("maksimali_kaina"), m === "uzsakymai" ? { taikoma: true } : { taikoma: false, vietoje: { 0: NETAIKOMAS } });
    }
    if (m === "uzsakymai") {
      // 2.1 „elektroniniu paštu“ - šablono reikšmė lieka (pažymėta tik kaip keičiama vieta), 2.2, 2.3
      var ep = pild("2.1", /^elektroniniu paštu$/); if (ep) nust(ep, { tekstas: ep.tekstas });
      irasyk(pild("2.2"), t("dm_uzsakymu_dalykas").replace(/[.\s]+$/, ""));
      var x23 = pild("2.3"), dal = x23 ? be(x23.tekstas).split(/\s*\/\s*/) : [], ut = "";
      if (R.dm_uzsakymu_terminai === "derinami") ut = dal[0] || "";
      else if (R.dm_uzsakymu_terminai === "priede") ut = t("dm_uzsakymu_priedas") && dal[1] ? dal[1].replace(/\s*\[[\s\u00a0]*\]/, " " + t("dm_uzsakymu_priedas").replace(/^Nr\.?\s*/i, "").replace(/\.$/, "")) : "";
      else if (R.dm_uzsakymu_terminai === "kita") ut = t("dm_uzsakymu_terminai_f").replace(/[.\s]+$/, "");
      irasyk(x23, ut);
      irasyk(pild("4.4", /^\[\.\.\.\]$/), dmPriedoNr(Z, /^Rangovo pasiūlymas/));
    }
    // 3.1 sakinio pradžia pagal atvejį, terminas (galininkas: „per 6 mėnesius“, „teikiami 12 mėnesių“), pratęsimo sakinys
    var pora = pild("3.1", /^\[Rangovas įsipareigoja/), pr = pora ? pora.tekstas.split(/\]\s*\/\s*\[/).map(be) : [];
    if (pora && m && pr.length === 2) nust(pora, { tekstas: m === "uzsakymai" ? pr[1] : pr[0] });
    var n = sk("dm_terminas");
    irasyk(pild("3.1", /^\[terminas\]$/), n ? n + " " + ((R.dm_terminas_vnt || "men") === "d" ? forma(n, "dieną", "dienas", "dienų") : forma(n, "mėnesį", "mėnesius", "mėnesių")) : "");
    var sak = pild("3.1", /^Šis terminas gali būti pratęstas/);
    if (R.dm_pratesimas === "ne") nust(sak, "salinti");
    else if (R.dm_pratesimas === "taip" && sak)
      irasyk(sak, t("dm_pratesimo_terminas") && t("dm_pratesimo_aplinkybes")
        ? sak.tekstas.replace("[pratęsimo terminas]", t("dm_pratesimo_terminas").replace(/[.\s]+$/, "")).replace("[aplinkybės, kada gali būti pratęsta]", t("dm_pratesimo_aplinkybes").replace(/[.\s]+$/, "")) : "");
    // 4.1 kainos apskaičiavimo būdas (sąrašo variantas „yra:“ nesiūlomas), 6.3 užtikrinimas
    var vk = vald("4.1"), kk = { fiksuotas_ikainis: /^fiksuotas įkainis/, fiksuota_kaina: /^fiksuota kaina/, kintamas_ikainis: /^kintamas įkainis/ }[R.dm_kaina];
    if (vk && kk) nust(vk, { elementas: el(vk, kk) });
    var vu = vald("6.3");
    if (vu && R.dm_uztikrinimas === "ne") nust(vu, { elementas: el(vu, /^netaikoma/) });
    else if (vu && R.dm_uztikrinimas === "taip") {
      var suma = sumaLT(R.dm_uztikrinimo_suma);
      if (suma) nust(vu, { elementas: el(vu, /^Rangovo sutartiniai įsipareigojimai užtikrinami/), reiksmes: [suma] });
      else if (t("dm_uztikrinimo_suma")) pastaba(perspejimai, "SS 6.3 punkto užtikrinimo suma „" + t("dm_uztikrinimo_suma") + "“ neatpažinta kaip suma eurais - įrašykite skaičių (pvz. 5 000).", [{ q: "dm_uztikrinimas" }]);
    }
    // Priedų sąrašas: 4 eilutė „Trišalės sutarties projektas“, 5 eilutė - kiti priedai
    var tr = nepr("trišalė");
    if (tr && R.dm_trisale === "ne") nust(tr, { tekstas: String(tr.aprasas || "").replace(/[;.\s]+$/, "") + " - netaikoma;" });
    prieduSprendimai(Z, ctx, R, V, nust);
    // (nuo 2026-10-13 keli priedai - atskiromis eilutėmis; iki tol antrą ir kitus reikėjo pridėti Word programoje)
    var kp = V.filter(function (x) { return x.rusis === "kiti_priedai"; })[0] || null, kpE = prieduEilutes(R.dm_kiti_priedai_f);
    if (R.dm_kiti_priedai === "ne") nust(kp, { tekstas: KITI_PRIEDAI_NETAIKOMA });
    else if (R.dm_kiti_priedai === "taip" && kpE.length) nust(kp, { eilutes: kpE });
    else {
      nust(pild("priedų sąrašas", /^\[\.\.\.\]$/), { palikti: "neatsakyta" });
      // įrašyta vien skyryba ar sąrašo ženklai - priedo pavadinimo nėra
      if (R.dm_kiti_priedai === "taip" && t("dm_kiti_priedai_f")) truksta.push(KLAUSIMAI_DM.filter(function (q) { return q.id === "dm_kiti_priedai"; })[0].klausimas + " - " + KLAUSIMAI_DM.filter(function (q) { return q.id === "dm_kiti_priedai"; })[0].laukai[0].uzrasas);
    }

    Object.keys(S).forEach(function (k) { var s2 = S[k]; if (s2 && typeof s2 === "object" && s2.elementas != null && s2.elementas < 0)
      { perspejimai.push("Šablone nerastas sąrašo variantas sprendimui " + k + " - patikrinkite šablono redakciją."); delete S[k]; } });
    if (R.dm_uztikrinimas === "taip" && t("dm_uztikrinimo_suma") && !sumaLT(R.dm_uztikrinimo_suma)) truksta.push("Ar reikalaujamas Sutarties įvykdymo užtikrinimas (SS 6.3 punktas, BS 3.5)? - Užtikrinimo suma, Eur (neatpažinta suma)");
    return { S: S, truksta: truksta, perspejimai: perspejimai, derinimas: derinimas, R: R };
  }
  /* ---------------------------------------------------------------- eksploatavimo darbų SS sprendimai generatoriui (2026-10-13) */
  /* Sveikasis skaičius žodžiais (vardininkas): 12 500 -> „dvylika tūkstančių penki šimtai“; oro linijų SS 16 eil. „[suma skaičiais ir žodžiais]“ */
  var LT_VNT = ["", "vienas", "du", "trys", "keturi", "penki", "šeši", "septyni", "aštuoni", "devyni", "dešimt", "vienuolika", "dvylika", "trylika", "keturiolika",
                "penkiolika", "šešiolika", "septyniolika", "aštuoniolika", "devyniolika"];
  var LT_DES = ["", "", "dvidešimt", "trisdešimt", "keturiasdešimt", "penkiasdešimt", "šešiasdešimt", "septyniasdešimt", "aštuoniasdešimt", "devyniasdešimt"];
  function ltIki1000(n){
    var o = [], h = Math.floor(n / 100), l = n % 100;
    if (h) o.push(LT_VNT[h] + (h === 1 ? " šimtas" : " šimtai"));
    if (l >= 20){ o.push(LT_DES[Math.floor(l / 10)]); if (l % 10) o.push(LT_VNT[l % 10]); } else if (l) o.push(LT_VNT[l]);
    return o.join(" ");
  }
  function zodziaisLT(n){
    n = Math.floor(n);
    if (!(n >= 0) || n >= 1e12) return "";
    if (n === 0) return "nulis";
    var o = [], d = [[1e9, "milijardas", "milijardai", "milijardų"], [1e6, "milijonas", "milijonai", "milijonų"], [1e3, "tūkstantis", "tūkstančiai", "tūkstančių"]];
    d.forEach(function (e) { var k = Math.floor(n / e[0]) % 1000; if (k) o.push(ltIki1000(k) + " " + forma(k, e[1], e[2], e[3])); });
    if (n % 1000) o.push(ltIki1000(n % 1000));
    return o.join(" ");
  }
  /* Suma skaičiais ir žodžiais: „<suma> Eur (<sveikoji dalis žodžiais> eurų)“, centai - skaičiumi („... eurų 50 ct“); neatpažinta suma - tuščia.
     (Pavyzdžių su sumomis šiame faile nerašoma - testų sargas saugo, kad į kodą nepatektų vidaus taisyklių riba.) */
  function sumaZodziais(v){
    var n = typeof v === "number" ? v : (global.GP_MONEY && global.GP_MONEY.parseEUR ? global.GP_MONEY.parseEUR(String(v)) : skaicius(v));
    if (!(n > 0)) return "";
    var c = Math.round(n * 100), sv = Math.floor(c / 100), ct = c % 100;
    return sumaLT(n) + " Eur (" + zodziaisLT(sv) + " " + forma(sv, "euras", "eurai", "eurų") + (ct ? " " + (ct < 10 ? "0" : "") + ct + " ct" : "") + ")";
  }
  function derinkEKS(ctx, R){
    var out = [], u = ctx.uztikrinimas, z = R.ek_uztikrinimas, kur = [{ q: "ek_uztikrinimas" }, { sps: "uztikrinimas" }];
    if (u && u.taikomas != null && z){
      if (u.taikomas === false && z === "taip")
        pastaba(out, "SPS sutarties įvykdymo užtikrinimo nereikalauja, o SS 16 eilutėje pasirinkta, kad užtikrinimas pateikiamas. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
      if (u.taikomas === true && z === "ne")
        pastaba(out, "SPS reikalauja sutarties įvykdymo užtikrinimo, o SS 16 eilutėje pasirinkta „" + EK_NETAIKOMA + "“. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
      var s = sumaLT(R.ek_uztikrinimo_suma);
      if (u.taikomas === true && z === "taip" && u.eur > 0 && s && s !== sumaLT(u.eur))
        pastaba(out, "SPS nurodyta sutarties įvykdymo užtikrinimo suma - " + sumaLT(u.eur) + " Eur, o SS 16 eilutėje - " + s + " Eur. Patikrinkite, ar SPS ir sutartis sutampa.", kur);
    }
    return out;
  }
  /* Priedų sąrašo priedų, kuriuose - Užsakovui priimtinų bankų ir draudimo bendrovių sąrašai, numeriai („17 ir 18“) - SS 16 eilutės sakiniui */
  function ekBankuPriedai(Z){
    var b = dmPriedoNr(Z, /^Užsakovui priimtinų bankų sąrašas/), d = dmPriedoNr(Z, /^Užsakovui priimtinų draudimo bendrovių sąrašas/);
    return b && d ? b + " ir " + d : "";
  }
  function sprendimaiEKS(Z, ctx, A){
    var V = global.GP_SUTARCIU_GEN.vietos(Z), R = efektyvus(ctx, A, Z).R, S = {}, perspejimai = [], derinimas = derinkEKS(ctx, R);
    var rodomi = klausimai(Z, ctx, A), truksta = trukstami(rodomi);
    var v = ctx.variantas, OLv = v === "OL", TPv = v === "TP", TVv = v === "TRASOS";
    var nust = function (x, s) { if (x) S[x.raktas] = s; };
    var t = function (id) { return String(R[id] == null ? "" : R[id]).replace(/\s+/g, " ").trim(); };
    var be = function (x) { return String(x || "").replace(/[.;\s]+$/, ""); };
    var kl = function (id) { var q = rodomi.filter(function (x) { return x.id === id || x.laukai.some(function (l) { return l.id === id; }); })[0]; return q ? q.klausimas : id; };
    var lk = function (id) { var o = id; rodomi.forEach(function (x) { x.laukai.forEach(function (l) { if (l.id === id) o = l.uzrasas; }); }); return o; };
    // pildomos vietos eilutėje (formos lentelės eilutės numeris; „“ - sutarties įžanga) pastraipoje, kurios tekstas atitinka `re`
    var vt = function (vieta, re) { return V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === vieta && (!re || re.test(x.aprasas || "")); }); };
    var nepr = function (id) { return V.filter(function (x) { return x.raktas === "o:" + id; })[0] || null; };
    var irasyk = function (x, tekstas) { nust(x, tekstas ? { tekstas: tekstas } : { palikti: "neatsakyta" }); };
    // sveikas teigiamas skaičius; įrašyta kas kita - klausimas lieka neatsakytas (su priežastimi)
    var sk = function (id) {
      var raw = t(id), n = skaicius(raw);
      if (raw && !(n > 0 && Math.floor(n) === n && /^\d+$/.test(raw))) { truksta.push(kl(id) + " (įrašykite sveiką skaičių)"); return ""; }
      return raw;
    };
    var suma = function (id) {
      var x = sumaLT(R[id]);
      if (!x && t(id)) { perspejimai.push("Suma „" + t(id) + "“ neatpažinta kaip suma eurais - įrašykite skaičių (pvz. 5 000)."); truksta.push(kl(id) + " (neatpažinta suma)"); }
      return x;
    };
    var priedas = function (id) { return be(t(id)).replace(/^Nr\.?\s*/i, "").replace(/\s*pried\S*$/i, ""); };
    var pav = String(ctx.pavadinimas || "").trim();
    // eilutė netaikoma: jos turinio vietoje - žodis; jei žemėlapyje tokios eilutės nėra (kita šablono redakcija), vietos lieka neatsakytos ir tai pasakoma
    var netaikoma = function (id, eilute, zodis) {
      var b = nepr(id);
      if (b) { nust(b, { tekstas: zodis }); return true; }
      vt(eilute).forEach(function (x) { irasyk(x, ""); });
      perspejimai.push("Formos žemėlapyje nerasta " + eilute + " eilutės dalis, kuri taikoma ne visada - „" + zodis + "“ neįrašyta; patikrinkite šablono redakciją.");
      return false;
    };

    // Pildoma sudarant sutartį (naudotojo sprendimas 2026-10-13): Sutarties data ir numeris, Užsakovui atstovaujantis asmuo, Rangovo duomenys,
    // 5 eil. „Pirkimas“ (paskelbimo data ir numeris paaiškėja paskelbus pirkimą; trasų valymo formoje taip ir parašyta), 6, 7, 13, 14, 17 eil.,
    // užtikrinimo dokumento rūšis priedų sąraše, už viešinimą atsakingas asmuo, parašai; pastočių SS 4 eil. variantą pasirenka tiekėjas
    V.forEach(function (x) { if (x.rusis === "pildoma" || x.rusis === "valdiklis" || x.rusis === "alternatyva" || x.rusis === "nurodymas") nust(x, { palikti: "sudarant" }); });
    // Žinoma iš pirkimo: pirkimo pavadinimas ir numeris sutarties įžangoje
    var iz = vt("", /laimėjo Užsakovo skelbtą/);
    irasyk(iz.filter(function (x) { return /^\[pirkimo pavadinimas\]$/.test(x.tekstas); })[0], pav);
    nust(iz.filter(function (x) { return /^_{3,}$/.test(x.tekstas); })[0], numerioSprendimas(ctx, R));
    // 5 eil. „Pirkimas“ (naudotojo sprendimas 2026-10-13; paskelbtuose projektuose čia rašomas pirkimo pavadinimas): pavadinimas įrašomas,
    // o pirkimo būdas, paskelbimo data ir numeris lieka sudarant sutartį - vieta lieka pažymėta
    var e5 = vt("5")[0];
    if (e5 && pav) nust(e5, { tekstas: pav + " pirkimas, ", lieka: EK_PIRKIMO_LIKUTIS });
    // 7 eil.: maksimali sutarties kaina (neprivalomas klausimas) - be PVM, PVM ir su PVM
    irasykKaina(R, vt("7").filter(function (x) { return /^\[suma skaičiais\]$/.test(x.tekstas); }), nust, truksta, perspejimai, "SS 7 eilutė", true);
    // Regiono pavadinimas: priedų sąrašas (visos trys formos), trasų valymo SS 3 eil.
    var reg = be(t("ek_regionas")).replace(/\s+regiono$/i, "");
    V.filter(function (x) { return x.rusis === "pildoma" && /^\[Regiono pavadinimas\]$/.test(x.tekstas); }).forEach(function (x) { irasyk(x, reg); });
    // 1 eil.: įkainiai ir mokesčiai (oro linijos, pastotės; trasų valymo formoje - be pildomų vietų)
    if (OLv || TPv){
      var e1 = function (re) { return vt("1", re)[0]; };
      irasyk(e1(/Įkainiai Rangovo pateikti vykdant Pirkimą nurodomi/), TPv ? dmPriedoNr(Z, /^Darbų įkainiai ir aprašymai/) : priedas("ek_ikainiu_priedas"));
      irasyk(e1(/^Už Neplaninius darbus Rangovui bus mokama/), be(t("ek_neplaniniai")));
      if (TPv) irasyk(e1(/^Už Avarinius darbus Rangovui bus mokama/), be(t("ek_avariniai")));
      irasyk(e1(/minimalus mėnesinis eksploatavimo mokestis/), priedas("ek_men_mokescio_priedas"));
      if (TPv) irasyk(e1(/reagavimo į Avarinius įvykius mokestis/), priedas("ek_reagavimo_mokescio_priedas"));
      irasyk(e1(/minimalus Avarinių darbų mokestis/), suma("ek_avariniu_mokestis"));
    }
    // 2 eil.: terminas mėnesiais (pastočių formoje po vietos nėra „mėn.“)
    var men = sk("ek_terminas");
    irasyk(vt("2")[0], men ? (TPv ? men + " mėn." : men) : "");
    // 3 eil.: objektai (oro linijos, pastotės) arba kiti regionai (trasų valymas; regionas - aukščiau)
    if (TVv) irasyk(vt("3").filter(function (x) { return /^\[\s*\]$/.test(x.tekstas); })[0], be(t("ek_kiti_regionai")));
    else irasyk(vt("3")[0], t("ek_objektai"));
    // 9 eil.: Brigados
    if (TPv){
      var b9 = vt("9", /vienu metu galės dirbti ne mažiau kaip/);
      irasyk(b9[0], sk("ek_brigados_pirminiai")); irasyk(b9[1], sk("ek_brigados_raa")); irasyk(b9[2], sk("ek_brigados_statyba"));
      irasyk(vt("9", /Brigados turi būti sudarytos iš ne mažiau kaip/)[0], sk("ek_brigados_nariai"));
    } else irasyk(vt("9")[0], sk("ek_brigados"));
    // 11 eil.: avarinio reagavimo terminai
    if (TVv) irasyk(vt("11")[0], sk("ek_reagavimas"));
    else { irasyk(vt("11", /^Darbo laiku/)[0], sk("ek_reagavimas_darbo")); irasyk(vt("11", /^Ne darbo laiku/)[0], sk("ek_reagavimas_ne_darbo")); }
    if (OLv || TPv){
      // 10 eil.: dokumentai („Ne“ - „Nėra“); pastočių formoje po vietos - taškas
      if (R.ek_dokumentai === "ne") netaikoma("dokumentai", "10", EK_NERA);
      else { var d10 = vt("10")[0]; irasyk(d10, R.ek_dokumentai === "taip" ? (d10 && /\]\.\s*$/.test(d10.aprasas || "") ? be(t("ek_dokumentai_f")) : t("ek_dokumentai_f")) : ""); }
      // 12 eil.: Užsakovo sandėliai („Ne“ - „Netaikoma“)
      if (R.ek_sandeliai === "ne") netaikoma("sandėliai", "12", EK_NETAIKOMA);
      else {
        var s12 = vt("12"), taip12 = R.ek_sandeliai === "taip";
        if (OLv){ irasyk(s12[0], taip12 ? be(t("ek_sandeliu_iranga")) : ""); irasyk(s12[1], taip12 ? be(t("ek_sandeliu_adresai")) : ""); }
        else irasyk(s12[0], taip12 ? t("ek_sandeliu_adresai") : "");
      }
      // 15 eil.: papildomi garantiniai terminai („Ne“ - „Nėra“)
      if (R.ek_garantiniai === "ne") netaikoma("garantiniai", "15", EK_NERA);
      else irasyk(vt("15")[0], R.ek_garantiniai === "taip" ? t("ek_garantiniai_f") : "");
      // 19 eil.: preliminarių Darbų kiekių metai (abi vietos)
      var metai = be(t("ek_kiekiu_metai")).replace(/\s*(m\.?|metų|metais)$/i, "");
      vt("19", /metais nurodyti Darbų kiekiai/).forEach(function (x) { irasyk(x, metai); });
    }
    // 16 eil.: Sutarties įvykdymo užtikrinimas („Ne“ - „Netaikoma“, priedų sąrašo eilutėje - „netaikoma“)
    var prU = V.filter(function (x) { return x.rusis === "pildoma" && x.vieta === "priedų sąrašas" && /^Banko garantija/.test(x.tekstas || ""); })[0];
    if (R.ek_uztikrinimas === "ne"){
      if (netaikoma("užtikrinimas", "16", EK_NETAIKOMA) && prU) nust(prU, { tekstas: "netaikoma" });
    } else {
      var taip16 = R.ek_uztikrinimas === "taip", su = taip16 ? suma("ek_uztikrinimo_suma") : "";
      if (OLv || TPv){
        var bp = ekBankuPriedai(Z);
        if (!bp) perspejimai.push("Formos priedų sąraše nerasti Užsakovui priimtinų bankų ir draudimo bendrovių sąrašai - 16 eilutės priedų numeriai neįrašyti; patikrinkite šablono redakciją.");
        irasyk(vt("16", /priimtinų bankų ir draudimo bendrovių sąrašai/)[0], taip16 ? bp : "");
      }
      if (TVv) irasyk(vt("16", /užtikrinimo galiojimo terminas/)[0], taip16 ? men : "");   // naudotojo sprendimas 2026-10-13: tas pats terminas kaip 2 eilutėje
      irasyk(vt("16", /užtikrinimo dydis/)[0], su ? (OLv ? sumaZodziais(R.ek_uztikrinimo_suma) : su) : "");
    }
    // Priedų sąrašas (pastotės): darbų planų regionas ir metai, įrenginių sąrašas
    if (TPv){
      var met = be(t("ek_plano_metai")).replace(/\s*(m\.?|metų)$/i, "");
      vt("priedų sąrašas", /regiono 110 - 400 kV TP/).forEach(function (x, k) { irasyk(x, k % 2 === 0 ? reg : met); });
      irasyk(vt("priedų sąrašas", /^Perdavimo tinklo \[įrašoma\] įrenginių sąrašas/)[0], be(t("ek_irenginiu_sarasas")));
    }
    // Priedų sąrašas (2026-10-13): nepridedamas priedas - „netaikoma“; kiti priedai - naujomis eilutėmis po paskutinio formos priedo
    prieduSprendimai(Z, ctx, R, V, nust);
    var ekKiti = prieduEilutes(R.ek_kiti_priedai_f), ekPask = (Z.priedai || []).slice(-1)[0];
    if (R.ek_kiti_priedai === "taip" && ekKiti.length && ekPask) { var kPr = "pr:" + ekPask.nr; S[kPr] = Object.assign({}, S[kPr] || {}, { po: ekKiti }); }
    else if (R.ek_kiti_priedai === "taip" && t("ek_kiti_priedai_f")) truksta.push(kl("ek_kiti_priedai") + " - " + lk("ek_kiti_priedai_f"));
    // Naudotojo sprendimo dar nėra (sutarčių plano 8 sk. 19 p. D): Užsakovo telefonas, el. paštas ir interneto adresas lieka kaip LITGRID formoje
    var ps = Z.pastraipos || [];
    if (ps.some(function (q) { return /@Įmonės pavadinimas\.eu/.test(q); }))
      perspejimai.push("Užsakovo telefonas ir el. pašto adresas (17 eilutė)" + (ps.some(function (q) { return /www\.Įmonės pavadinimas\.eu/.test(q); }) ? " bei interneto adresas priedų sąraše" : "") +
        " lieka kaip LITGRID formoje (adresuose - žyma „Įmonės pavadinimas“, ne tikras adresas). Patikrinkite ir įrašykite Word programoje.");
    return { S: S, truksta: truksta.filter(function (x, i, a) { return a.indexOf(x) === i; }), perspejimai: perspejimai, derinimas: derinimas, R: R };
  }
  /* Sutarties priedas su savu šablonu (projektavimo paslaugų SS 3 priedas „Apmokėjimo tvarka pagal etapus“): lieka pasirinkta etapų lentelė */
  function priedoSprendimai(Zp, R){
    var V = global.GP_SUTARCIU_GEN.vietos(Zp), S = {}, truksta = [];
    var lent = V.filter(function (x) { return x.rusis === "alternatyva" && x.id === "etapų_lentelė"; })[0];
    if (lent) {
      var kuri = { l1: 0, l2: 1 }[(R || {}).pp_etapu_lentele];
      if (kuri == null) truksta.push("3 priedo etapų lentelė nepasirinkta"); else S[lent.raktas] = { variantas: kuri };
    }
    return { S: S, truksta: truksta };
  }

  /* ---------------------------------------------------------------- sąsaja 2 žingsnyje */
  var BUSENOS = { siuloma: "Siūloma (nepatvirtinta)", patvirtinta: "Patvirtinta", neuzpildyta: "Neužpildyta (privaloma)", neprivaloma: "Neprivaloma" };
  function esc(x){ return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var KO_TRUKSTA = { "pirkimo numerio": "atsakykite į klausimą „Koks pirkimo numeris?“ arba pasirinkite pirkimo kortelę su numeriu", "pirkimo pavadinimo": "įrašykite pirkimo pavadinimą 1 žingsnyje",
                     "organizacijų registro": "neįkeltas shared/organizacijos.js", "darbų atlikimo termino": "atsakykite į klausimą apie Sutarties vykdymo terminą (2 eilutė)" };
  var SUDARANT = "Sutarties numeris, Tiekėjo rekvizitai, Šalių atstovai ir atstovavimo pagrindai, Pirkėjo ir Tiekėjo kontaktiniai asmenys (2.1 ir 2.2 punktai), 5.2 punkto sumos (pagal laimėjusį pasiūlymą), 7.1 subtiekėjai, parašai";
  /* Rangos SS 20-29 punktai įrašomi tik taikomi, todėl sugeneruotoje sutartyje jų numeriai gali būti mažesni nei šablone */
  var GRUPIU_PASTABOS = { "Papildomos sąlygos": "Šios grupės punktai įrašomi tik tada, kai taikomi, todėl sugeneruotoje sutartyje jų numeriai gali būti mažesni nei šablone. Klausimuose - šablono numeriai." };
  var SUDARANT_PPS = "Projektuotojo duomenys, registracijos valstybė ir atstovaujantis asmuo, Sutarties data ir numeris, 4.1 punkto kainos (pagal laimėjusį pasiūlymą), Šalių atstovai (5.1 punktas), Projektuotojo kontaktai, sąskaita ir bankas (7.1 punktas), pasirašantys asmenys";
  var SUDARANT_DM = "Sutarties data, vieta ir numeris, Rangovo duomenys, registracijos valstybė ir atstovaujantis asmuo, Užsakovui atstovaujantis asmuo, Sutarties kaina (4.2 punktas, pagal laimėjusį pasiūlymą), Šalių atsakingi asmenys (5.1 punktas), Rangovo rekvizitai, pasirašantys asmenys";
  var SUDARANT_PSR = "Rangovo duomenys, registracijos valstybė, atstovai, kontaktai ir sąskaita, Sutarties data ir numeris, 11 punkto kaina (pagal laimėjusį pasiūlymą), Užsakovo atstovas ir atsakingas už Sutarties paskelbimą asmuo (10 punktas), Užsakovo pasirašantis asmuo, parašai";

  /* Eksploatavimo darbų sutartis: kas lieka sutarties sudarymui (pagal darbų rūšį) */
  function sudarantEKS(ctx, kaina){
    return "Sutarties data ir numeris, Užsakovui atstovaujantis asmuo, Rangovo duomenys ir atstovaujantis asmuo, 5 eilutės „Pirkimas“ pirkimo būdas, paskelbimo data ir numeris " +
      "(paaiškėja tik paskelbus pirkimą; pirkimo pavadinimas įrašomas automatiškai), 6 eilutė „Rangovas“, " + (kaina ? "" : "Sutarties kaina (7 eilutė, pagal laimėjusį pasiūlymą), ") + "Šalių atstovai (13 eilutė), Rangovo sąskaita (14 eilutė) ir " +
      "kontaktai (17 eilutė), " + (ctx.variantas === "TRASOS" ? "" : "Sutarties įvykdymo užtikrinimo dokumento rūšis priedų sąraše (banko garantija ar draudimo bendrovės laidavimo raštas), ") +
      "už Sutarties ir jos pakeitimų viešinimą atsakingas asmuo (19 eilutė), pasirašantys asmenys" +
      (ctx.variantas === "TP" ? "; 4 eilutės „Pagrindiniai darbai“ variantą pasirenka tiekėjas, teikdamas pasiūlymą, - abu variantai ir nurodymas tiekėjui lieka" : "");
  }
  /* Kas lieka sutarties sudarymui (2 žingsnio sąrašas „Pildoma sudarant sutartį“): pagal šeimą ir atsakymus - pirkimo numeris, jei jo dar
     nėra, ir kaina, jei maksimali kaina neįrašyta projekte */
  function sudarantTekstas(Z, ctx, A){
    var R = efektyvus(ctx, A || {}, Z).R, kn = kainaProjekte(R), kaina = !!(kn && !kn.klaida);
    var t = RANGA(ctx) ? SUDARANT_PSR : PPS(ctx) ? SUDARANT_PPS : DM(ctx) ? SUDARANT_DM : EKS(ctx) ? sudarantEKS(ctx, kaina) : SUDARANT;
    if (kaina && RANGA(ctx)) t = t.replace("11 punkto kaina (pagal laimėjusį pasiūlymą), ", "");
    if (RANGA(ctx) && R.etapai === "taip" && R.etapu_pildymas === "cia" && R.apmokejimas_psr === "etapai" && R.etapu_mokejimas === "sudarant") t += ", etapų priedo mokėtinos sumos (pagal laimėjusį pasiūlymą)";
    if (kaina && !RANGA(ctx) && !PPS(ctx) && !DM(ctx) && !EKS(ctx) && ikainiai(R) && R.kiekis === "ne") t = t.replace("5.2 punkto sumos (pagal laimėjusį pasiūlymą), ", "");
    if (prekes(ctx) && R.pradzia !== "ts" && R.terminas_pasiulyme === "taip") t += ", 4.1 punkto pristatymo terminas (pagal laimėjusį pasiūlymą)";
    if (nrSudarant(ctx, R)) t += ", pirkimo numeris";
    return t;
  }
  /* Šuolis į klausimą: kortelė į ekrano vidurį, fokusas - į pirmą jos lauką (radijo, sąrašą ar tekstą; nėra - į antraštę), trumpas
     pažymėjimas (.lk-tikslas), kad būtų matyti, kur nukeliauta. false - kortelės nėra (klausimas neberodomas). */
  function pazymek(el){
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    var f = el.querySelector("input:not([type=hidden]):not([disabled]),select,textarea") || el.querySelector("button") || el;
    if (f === el && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    f.focus({ preventScroll: true });
    el.classList.add("lk-tikslas");
    global.setTimeout(function () { el.classList.remove("lk-tikslas"); }, 2500);
    return true;
  }
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
        (l.siuloma && !(A[l.id] && A[l.id].reiksme) ? '<div class="lk-kilme"' + (l.siuloma.di ? ' data-di="sugeneruota"' : "") + ">Siūloma - " + esc(l.siuloma.kilme) + ". Patikrinkite ir, jei reikia, pakeiskite.</div>" : "") + "</div>";
    }
    function korteleHtml(q){
      var id = "sf-" + q.id, uz = q.uzuomina ? '<p class="lk-uz" id="' + id + '-uz">' + esc(q.uzuomina) + "</p>" : "";
      var h = '<div class="lk lk--' + q.busena + '" id="' + id + '"><div class="lk-gal"><h5 class="lk-kl" id="' + id + '-kl">' + esc(q.klausimas) + "</h5>" +
        (global.GP_PAAISKINIMAS ? global.GP_PAAISKINIMAS.html({ id: id + "-pa", etikete: q.klausimas, turinys: "<p>" + esc(q.uzuomina || "Atsakymas parenka sutarties specialiųjų sąlygų šablono variantą.") +
          "</p><p>Sutarties šablono tekstas nekeičiamas - parenkamas jo variantas arba įrašoma reikšmė į pildomą vietą.</p>" }) : "") +
        '<span class="lk-b lk-b--' + q.busena + '">' + BUSENOS[q.busena] + "</span></div>" + uz +
        (q.pastaba ? '<p class="lk-uz lk-uz--sps" id="' + id + '-ps">' + esc(q.pastaba) + "</p>" : "") +
        (q.vidausRiba && global.GP_VIDAUS_RIBA ? global.GP_VIDAUS_RIBA.html(ctx.verte, { id: id + "-vr" }) : "");
      var aria = ' aria-labelledby="' + id + '-kl"' + (q.uzuomina || q.pastaba ? ' aria-describedby="' + [q.uzuomina ? id + "-uz" : "", q.pastaba ? id + "-ps" : ""].filter(Boolean).join(" ") + '"' : "");
      if (q.tipas === "priedai"){
        // formos priedų sąrašas (2026-10-15): žymimieji langeliai - tik pasirenkami priedai; pridedami visada ir valdomi kitu klausimu - viena
        // eilutė po sąrašu (iki tol pilki langeliai: techninė specifikacija ar pasiūlymas atrodė kaip sprendimas)
        var pr = q.priedai || [], fiks = pr.filter(function (p) { return p.valdo; });
        h += '<ul class="lk-priedai" role="group"' + aria + ">" + pr.map(function (p, j) {
          if (p.valdo) return "";
          return '<li><label class="opt lk-opt"><input type="checkbox" id="' + id + "-p" + j + '" data-sfp="' + esc(p.nr) + '"' +
            (p.pridedamas ? " checked" : "") + '> <span class="lk-opt-t">' + esc((p.rodomas ? p.rodomas + ". " : "") + p.tekstas) + "</span></label></li>"; }).join("") + "</ul>" +
          (fiks.length ? '<div class="lk-priedai-f"><p class="lk-uz" id="' + id + '-f">Pridedami visada arba pagal kitus šios sutarties atsakymus:</p><ul aria-labelledby="' + id + '-f">' +
            fiks.map(function (p) { return "<li>" + esc((p.rodomas ? p.rodomas + ". " : "") + String(p.tekstas || "").replace(/[;.:]+$/, "")) +
              ' <span class="lk-priedai-k">(' + esc(p.valdo) + ")</span></li>"; }).join("") + "</ul></div>" : "");
      } else if (q.tipas === "lentele"){
        // etapų lentelės redaktorius: kiekvienas etapas - laukų grupė (telpa ir siaurame ekrane); atsakymas - visų eilučių JSON
        var L = q.lentele, lau = function (k, lk, uzr, ivestis) { return '<div class="lk-v"><label class="lk-v-l" for="' + id + "-" + k + "-" + lk + '">' + esc(uzr) + '</label><div class="lk-v-iv">' + ivestis + "</div></div>"; };
        h += '<div class="lk-etapai" role="group"' + aria + ">" + L.eilutes.map(function (r, k) {
          var a = ' id="' + id + "-" + k + "-", d = '" data-sfl="' + k + ":";
          return '<fieldset class="lk-etapas"><legend>' + esc(r.etikete) + "</legend>" +
            lau(k, "darbai", "Perduodami darbai (darbai, kuriuos Rangovas turi perduoti Užsakovui užbaigus etapą)", '<textarea class="lk-in"' + a + "darbai" + d + 'darbai" rows="3">' + esc(r.darbai) + "</textarea>") +
            lau(k, "terminas", "Perdavimo terminas nuo Sutarties sudarymo dienos", '<input class="lk-in lk-in--trumpas"' + a + "terminas" + d + 'terminas" type="text" inputmode="numeric" value="' + esc(r.terminas) + '">' +
              '<select class="lk-in lk-in--trumpas" data-sfl="' + k + ':vnt" aria-label="' + esc(r.etikete) + ': termino vienetas"><option value="men"' + (r.vnt === "d" ? "" : " selected") + '>mėn.</option><option value="d"' + (r.vnt === "d" ? " selected" : "") + ">dienos</option></select>") +
            (L.delspinigiai ? lau(k, "delspinigiai", "Delspinigių dydis už kiekvieną pradelstą dieną (pvz. 0,02 proc.)", '<input class="lk-in"' + a + "delspinigiai" + d + 'delspinigiai" type="text" value="' + esc(r.delspinigiai) + '">') : "") +
            (L.dalis ? lau(k, "dalis", "Mokėjimo dalis, proc. Sutarties kainos be PVM", '<input class="lk-in lk-in--trumpas"' + a + "dalis" + d + 'dalis" type="text" inputmode="decimal" value="' + esc(r.dalis) + '">') : "") +
            (L.eilutes.length > 1 ? '<button type="button" class="sec lk-etapas-s" id="' + id + "-s" + k + '" data-sfl-salinti="' + k + '" aria-label="Pašalinti: ' + esc(r.etikete) + '">Pašalinti etapą</button>' : "") + "</fieldset>"; }).join("") +
          '<button type="button" class="sec" id="' + id + '-prideti" data-sfl-prideti="1">Pridėti etapą</button></div>';
      } else if (q.tipas === "taipne" || q.tipas === "variantai"){
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
        var rodyk = function (v) { var vt = (q.tipas === "taipne" ? TN : q.variantai || []).filter(function (x) { return x.id === v; })[0];
          var u = q.tipas === "skaicius" && q.vienetai ? (q.vienetai.filter(function (x) { return x.id === q.vienetas; })[0] || q.vienetai[0]) : null;
          return q.tipas === "priedai" ? "pridedami visi pažymėti priedai" : vt ? vt.tekstas : v + (u ? " " + u.tekstas : ""); };
        var di = q.siuloma.di;
        h += di ? '<div class="lk-kilme lk-kilme--di" data-di="sugeneruota">' + (global.GP_DI ? global.GP_DI.zyme({ tekstas: "DI iš dokumento" }) + " " : "") +
            '<span class="lk-kilme-t">Siūloma: <b>' + esc(rodyk(q.reiksme)) + "</b>" + (di.is ? " (" + esc(di.is) + ")" : "") + " - iš dokumento „" + esc(di.saltinis) + "“" +
            (di.vieta ? ", " + esc(di.vieta) : "") + ': <q class="lk-cit">' + esc(di.citata) + "</q>" +
            (q.siuloma.kitaip ? ' <span class="lk-kitaip">Pagal kitus duomenis (' + esc(q.siuloma.kitaip.kilme) + ") būtų: <b>" + esc(rodyk(q.siuloma.kitaip.reiksme)) + "</b>.</span>" : "") + "</span></div>"
          : '<div class="lk-kilme"><span class="lk-kilme-t">Siūloma: <b>' + esc(rodyk(q.reiksme)) + "</b> - " + esc(q.siuloma.kilme) + ".</span></div>";
        h += '<button type="button" class="sec lk-patv" data-sf-patv="' + q.id + '">Patvirtinti</button>';
      }
      q.laukai.forEach(function (l) { if (q.reiksme === l.kada || (l.kada === "*" && String(q.reiksme || "").trim())) h += laukoHtml(q, l); });
      return h + "</div>";
    }
    function piesk(){
      var aktyvus = doc.activeElement && vieta.contains(doc.activeElement) ? doc.activeElement.id : "";
      if (!ctx || !ctx.sablonai){
        vieta.innerHTML = ctx && ctx.priezastis ? '<div class="lk-sutartis-pastaba cite">' + esc(ctx.priezastis) + "</div>" : "";
        if (o.poPiesimo) o.poPiesimo();
        return;
      }
      var h = '<section class="lk-sutartis" aria-labelledby="sfH"><h3 id="sfH">Sutarties projektas: ' + esc(ctx.pavadinimasSutarties || "") +
        ' <span class="pz-nepriv">bandomoji</span></h3><div class="hint">Klausimai sutarties specialiosioms sąlygoms (SS)' + (PPS(ctx) ? " ir jų 3 priedui" : "") + '. Bendrosios sąlygos generuojamos be pakeitimų. ' +
        "Siūlomos reikšmės - iš jau įvestų duomenų (1 žingsnis, pirkimo kortelė, 2 žingsnio SPS atsakymai) ir LITGRID standartų; jas patvirtinate jūs.</div>";
      if (krauna){ vieta.innerHTML = h + '<div class="cite">Kraunamas sutarties šablono žemėlapis...</div></section>'; if (o.poPiesimo) o.poPiesimo(); return; }
      if (klaida){ vieta.innerHTML = h + '<div class="lk-ispejimas">Sutarties šablono žemėlapio įkelti nepavyko (' + esc(klaida) + ") - sutarties projektas nebus sugeneruotas.</div></section>"; if (o.poPiesimo) o.poPiesimo(); return; }
      var qs = klausimai(Z, ctx, A), sp = sprendimai(Z, ctx, A);
      var siul = qs.filter(function (q) { return q.busena === "siuloma"; }), nu = qs.filter(function (q) { return q.busena === "neuzpildyta"; });
      h += '<div class="lk-sa"><b>Sutarties klausimai:</b> ' + qs.length + " · patvirtinta " + qs.filter(function (q) { return q.busena === "patvirtinta"; }).length +
        " · siūloma " + siul.length + " · neatsakyta " + nu.length + (siul.length ? ' <button type="button" class="sec lk-patv" id="sfPatvVisas" data-sf-visas="1">Patvirtinti visas siūlomas (' + siul.length + ")</button>" : "") + "</div>";
      var grupe = "";
      qs.forEach(function (q) {
        if (q.grupe !== grupe){
          grupe = q.grupe; h += '<h4 class="lk-sutartis-g">' + esc(grupe) + "</h4>";
          if (RANGA(ctx) && GRUPIU_PASTABOS[grupe]) h += '<p class="lk-uz lk-sutartis-gp">' + esc(GRUPIU_PASTABOS[grupe]) + "</p>";
        }
        h += korteleHtml(q);
      });
      // pastabos su mygtukais į vietą, kurią reikia patikrinti (2026-10-16): sutarties klausimas čia pat, SPS klausimas 2 žingsnyje, 1 žingsnis
      var mygtukai = function (arr, i) {
        var kur = (arr.kur && arr.kur[i]) || [], out = kur.map(function (x) {
          if (x.q) {
            var qq = qs.filter(function (q) { return q.id === x.q; })[0];
            return qq ? '<button type="button" class="sec sf-eiti" data-sf-eiti="' + esc(x.q) + '" aria-label="Eiti į sutarties klausimą: ' + esc(qq.klausimas) + '">Eiti į sutarties klausimą</button>' : "";
          }
          var v = o.kurVieta && o.kurVieta(x);   // SPS ar 1 žingsnio klausimas: { mygtukas, pavadinimas } arba null (tokio klausimo nėra)
          if (!v) return "";
          return '<button type="button" class="sec sf-eiti" data-sf-eiti-kitur="' + esc(JSON.stringify(x)) + '" aria-label="' + esc(v.mygtukas + ": " + v.pavadinimas) + '">' + esc(v.mygtukas) + "</button>";
        }).join("");
        return out ? ' <span class="sf-eiti-g">' + out + "</span>" : "";
      };
      var sarasas = function (arr) { return "<ul>" + arr.map(function (p, i) { return "<li>" + esc(p) + mygtukai(arr, i) + "</li>"; }).join("") + "</ul>"; };
      if (sp.derinimas.length) h += '<div class="lk-sa lk-sa--isp" id="sfDerinimas"><b>Patikrinkite (SPS ir sutartis):</b>' + sarasas(sp.derinimas) + "</div>";
      var vp = vidausPriminimai(Z, ctx, A);
      if (vp.length) h += '<div class="lk-sa lk-sa--isp" id="sfVidaus"><b>Patikrinkite (vidaus taisyklės):</b>' + sarasas(vp) + "</div>";
      if (sp.perspejimai.length) h += '<div class="lk-sa lk-sa--isp" id="sfDemesio"><b>Dėmesio:</b>' + sarasas(sp.perspejimai) + "</div>";
      h += '<div class="lk-sa" id="sfAuto"><b>Įrašoma automatiškai</b> (be klausimo):<ul>' + automatiniai(Z, ctx, A).map(function (a) {
        return "<li>" + esc(a.kas) + ": " + (a.truksta ? '<span class="lk-auto-nera">dar neįrašyta - trūksta ' + esc(a.truksta) + "</span>" : "<b>" + esc(a.reiksme) + "</b>") +
          ' <span class="lk-kilme-t">(' + esc(a.truksta ? KO_TRUKSTA[a.truksta] || a.kilme : a.kilme) + ")</span></li>"; }).join("") + "</ul></div>";
      h += '<div class="lk-sa" id="sfSudarant"><b>Pildoma sudarant sutartį</b> (generatorius šias vietas palieka): ' + esc(sudarantTekstas(Z, ctx, A)) + "." +
        (PPS(ctx) ? " Šablone šios vietos pažymėtos geltonai - žymėjimas jose lieka, kitur nuimamas." : DM(ctx) || EKS(ctx) ? " Šablone šios vietos pažymėtos pilkai - žymėjimas jose lieka, kitur nuimamas." : "") + "</div></section>";
      vieta.innerHTML = h;
      if (aktyvus){ var e = doc.getElementById(aktyvus); if (e) e.focus(); }
      if (o.poPiesimo) o.poPiesimo();
    }
    function keista(perpiesti){ if (perpiesti !== false) piesk(); if (o.onKeista) o.onKeista(); }
    vieta.addEventListener("change", function (e) {
      var t = e.target, id = t && t.getAttribute && t.getAttribute("data-sf");
      if (t && t.getAttribute && t.getAttribute("data-sfp") != null) {
        // priedų sąrašas: atsakymas - nepažymėtų (ir neužrakintų) priedų numeriai
        var ul = t.closest(".lk-priedai"), be = Array.prototype.filter.call(ul.querySelectorAll("input[data-sfp]"), function (c) { return !c.disabled && !c.checked; }).map(function (c) { return c.getAttribute("data-sfp"); });
        A.priedai_sar = { reiksme: be.length ? "be:" + be.join(",") : "visi", patvirtinta: true };
        keista();
        return;
      }
      if (t && t.getAttribute && t.getAttribute("data-sfl") != null) { etapaiIsDom(); keista(); return; }
      if (!id) return;
      A[id] = { reiksme: t.value, patvirtinta: true };
      keista();
    });
    vieta.addEventListener("input", function (e) {
      var t = e.target, id = t && t.getAttribute && t.getAttribute("data-sf");
      if (t && t.getAttribute && t.getAttribute("data-sfl") != null && t.tagName !== "SELECT") { etapaiIsDom(); keista(false); return; }
      if (!id || t.type === "radio" || t.tagName === "SELECT") return;
      A[id] = { reiksme: t.value, patvirtinta: true };
      keista(false);
    });
    /* Etapų lentelės redaktorius: atsakymas - visų rodomų eilučių JSON (ir tuščių - kad pridėta eilutė neišnyktų perpiešiant) */
    function etapaiIsDom(){
      var e = [];
      Array.prototype.forEach.call(vieta.querySelectorAll("[data-sfl]"), function (el) { var m = el.getAttribute("data-sfl").split(":"); (e[+m[0]] = e[+m[0]] || {})[m[1]] = el.value; });
      A.etapu_lentele = { reiksme: JSON.stringify(e), patvirtinta: true };
      return e;
    }
    vieta.addEventListener("click", function (e) {
      var ei = e.target && e.target.closest && e.target.closest("[data-sf-eiti],[data-sf-eiti-kitur]");
      if (ei) {
        if (ei.hasAttribute("data-sf-eiti")) pazymek(doc.getElementById("sf-" + ei.getAttribute("data-sf-eiti")));
        else if (o.eiti) { try { o.eiti(JSON.parse(ei.getAttribute("data-sf-eiti-kitur"))); } catch (x) { /* netaisyklingas atributas - niekur neinama */ } }
        return;
      }
      var eb = e.target && e.target.closest && e.target.closest("[data-sfl-prideti],[data-sfl-salinti]");
      if (eb) {
        var eil = etapaiIsDom(), sal = eb.getAttribute("data-sfl-salinti");
        if (sal != null) eil.splice(+sal, 1); else eil.push({});
        A.etapu_lentele = { reiksme: JSON.stringify(eil), patvirtinta: true };
        keista();
        // fokusas: pridėjus - naujos eilutės pirmas laukas; pašalinus - mygtukas „Pridėti etapą“ (pašalintos eilutės mygtuko nebėra)
        var ef = doc.getElementById(sal != null ? "sf-etapu_lentele-prideti" : "sf-etapu_lentele-" + (eil.length - 1) + "-darbai");
        if (ef) ef.focus();
        return;
      }
      var b = e.target && e.target.closest && e.target.closest("[data-sf-patv],[data-sf-visas]");
      if (!b) return;
      var qs = klausimai(Z, ctx, A);
      var kurie = b.hasAttribute("data-sf-visas") ? qs.filter(function (q) { return q.busena === "siuloma"; }) : qs.filter(function (q) { return q.id === b.getAttribute("data-sf-patv"); });
      // DI reikšmė patvirtinus lieka pažymėta (A[id].di - Word failo DI požymiams), kol žmogus jos nepakeičia
      var zyme = function (s, v) { return s && s.di ? { reiksme: v, saltinis: s.di.saltinis } : null; };
      kurie.forEach(function (q) {
        A[q.id] = { reiksme: q.reiksme, patvirtinta: true }; if (zyme(q.siuloma, q.reiksme)) A[q.id].di = Object.assign(zyme(q.siuloma, q.reiksme), { klausimas: true });
        if (q.siuloma && q.siuloma.di && q.siuloma.di.vnt && !A[q.id + "_vnt"]) A[q.id + "_vnt"] = { reiksme: q.vienetas, patvirtinta: true };
        q.laukai.forEach(function (l) { if (l.siuloma && l.reiksme) { A[l.id] = { reiksme: l.reiksme, patvirtinta: true }; if (zyme(l.siuloma, l.reiksme)) A[l.id].di = zyme(l.siuloma, l.reiksme); } }); });
      keista();
      var f = doc.getElementById(kurie.length === 1 ? "sf-" + kurie[0].id + "-kl" : "sfH");
      if (f){ f.setAttribute("tabindex", "-1"); f.focus(); }
    });
    return {
      atnaujink: atnaujink,
      atsakymai: function () { return JSON.parse(JSON.stringify(A)); },
      // rodomi klausimai su efektyviomis reikšmėmis; visiKlausimai - ir dar nerodomi (DI užklausai, 2026-10-18); neparuošus - tuščia
      klausimai: function () { return ctx && ctx.sablonai && Z ? klausimai(Z, ctx, A) : []; },
      visiKlausimai: function () { return ctx && ctx.sablonai && Z ? klausimai(Z, ctx, A, { visi: true }) : []; },
      kodas: function () { return Z ? kodas : null; },
      // žmogaus atsakymai (testams ir atkūrimui): { [klausimo ar lauko id]: { reiksme, di } } - patvirtinta
      irasyk: function (irasai) {
        Object.keys(irasai || {}).forEach(function (k) { var x = irasai[k];
          A[k] = { reiksme: x.reiksme, patvirtinta: true }; if (x.di) A[k].di = x.di; });
        keista();
      },
      atstatyk: function () { A = {}; piesk(); },
      // juodraščio atkūrimas (2026-10-15): tie patys atsakymai su būsenomis - patvirtinta lieka patvirtinta, siūlomos skaičiuojamos iš naujo
      atkurk: function (x) { A = x && typeof x === "object" && !Array.isArray(x) ? JSON.parse(JSON.stringify(x)) : {}; return atnaujink(); },
      busena: function () {
        if (!ctx || !ctx.sablonai || !Z) return { paruosta: false, priezastis: !ctx || !ctx.sablonai ? (ctx && ctx.priezastis) || "sutartis nepasirinkta" : klaida || "kraunamas šablono žemėlapis" };
        var sp = sprendimai(Z, ctx, A), qs = klausimai(Z, ctx, A);
        // DI reikšmės, kurios pateks į dokumentą: siūlomos iš dokumentų ir patvirtintos nepakeistos (Word failo DI požymiams)
        var diK = qs.filter(function (q) { var a = A[q.id]; return (q.busena === "siuloma" && q.siuloma && q.siuloma.di) || (a && a.di && a.di.klausimas && a.reiksme === a.di.reiksme && q.reiksme === a.reiksme); });
        return { paruosta: true, kodas: kodas, Z: Z, S: sp.S, R: sp.R, truksta: sp.truksta, perspejimai: sp.perspejimai, derinimas: sp.derinimas, vidaus: vidausPriminimai(Z, ctx, A),
                 siulomos: qs.filter(function (q) { return q.busena === "siuloma"; }).map(function (q) { return q.klausimas; }),
                 di: diK.length, diSiulomos: diK.filter(function (q) { return q.busena === "siuloma"; }).map(function (q) { return q.id; }) };
      }
    };
  }

  global.GP_SUTARTIES_FORMA = { versija: "S7-2026-10-16", pazymek: pazymek, KLAUSIMAI: KLAUSIMAI, KLAUSIMAI_PSR: KLAUSIMAI_PSR, KLAUSIMAI_SR: KLAUSIMAI_SR, KLAUSIMAI_PPS: KLAUSIMAI_PPS, KLAUSIMAI_DM: KLAUSIMAI_DM, KLAUSIMAI_EKS: KLAUSIMAI_EKS, klausimai: klausimai, sprendimai: sprendimai, vidausPriminimai: vidausPriminimai,
                                 priedoSprendimai: priedoSprendimai, automatiniai: automatiniai, sudarantTekstas: sudarantTekstas, mount: mount,
                                 _forma: forma, _terminasEN: terminasEN, _priedoNr: priedoNr, _sumaLT: sumaLT, _zodziaisLT: zodziaisLT, _sumaZodziais: sumaZodziais,
                                 _prieduEilutes: prieduEilutes, _kainaProjekte: kainaProjekte, _prieduSarasas: prieduSarasas, _etapuSprendimas: etapuSprendimas };
})(typeof window !== "undefined" ? window : this);
