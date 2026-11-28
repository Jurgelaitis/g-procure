/* ==========================================================================
 * PP-sutartys/pakeitimai.js - sutarties pakeitimų (susitarimų) logika (GP_PAKEITIMAI)
 *
 * Grynos funkcijos: duomenų forma, sutarčių formų nuostatos, kainos perskaičiavimas pagal indeksą,
 * patikros, susitarimo, skaičiavimo ir pagrindimo dokumentų turinys, pakeitimų sąrašas. Nieko nesaugo ir
 * nesiunčia - saugojimas, indeksų gavimas ir Word failai yra pakeitimai-ui.js ir dokumentas.js.
 *
 * 1 etapas (2026-11-28, naudotojo sprendimas): sutarties kortelė su pakeitimų sąrašu ir trys pakeitimų rūšys -
 *   ind - kainos perskaičiavimas pagal indeksą (peržiūros sąlyga numatyta Sutartyje),
 *   sub - subtiekėjo (subrangovo) pasitelkimas ar pakeitimas,
 *   asm - atsakingų asmenų pakeitimas.
 * Vienas susitarimas sudedamas iš kelių pakeitimų (blokų): 27 paskelbtų LITGRID susitarimų analizė (2026-11)
 * parodė, kad vienas dokumentas dažnai jungia kelis pakeitimus su skirtingu teisiniu pagrindu.
 *
 * Teisės nuorodos - tik iš shared/teises-nuorodos.js (PĮ; VPĮ atitikmenys 1 etape neįtraukti).
 * Kainos peržiūros taisyklė imama iš konkrečios sutarties: IND - LITGRID sutarčių formų nuostatos
 * (perskaitytos iš PP-salygos/templates/sutartys/ 2026-11-28), naudotojas jas gali pakeisti.
 * Įrankis neteigia, kad pakeitimas atitinka įstatymą - parodo pagrindą ir patikrintas sąlygas.
 * ========================================================================== */
;(function (global) {
  "use strict";

  var VERSIJA = "2026-11-28", SCHEMA = 1, RAKTAS = "gprocure.pakeitimai";
  var RIBOS = { sutarciu: 200, ankstesniu: 60, bloku: 12, eiluciu: 8, tekstas: 300, ilgas: 4000 };

  /* ---------- pagalbinės ---------- */
  function turi(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function txt(v, max) {
    if (typeof v !== "string" && typeof v !== "number") return "";
    return String(v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ").replace(/[–—]/g, "-").trim().slice(0, max || RIBOS.tekstas);
  }
  function eilute1(v, max) { return txt(v, max).replace(/\s*\n\s*/g, " "); }
  function sk(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function teig(v) { var n = sk(v); return n != null && n >= 0 ? n : null; }
  function apvalink(n, d) {
    if (n == null || !isFinite(n) || d == null) return n;
    var r = +(Math.round(+(Math.abs(n) + "e" + d)) + "e-" + d);
    return isFinite(r) ? (n < 0 ? -r : r) : n;
  }
  function r2(n) { return apvalink(n, 2); }
  function fiks(n, d) {
    if (n == null || !isFinite(n)) return "";
    var s = Math.abs(n).toFixed(d).split("."), sv = s[0].replace(/\B(?=(\d{3})+$)/g, " ");
    return (n < 0 ? "-" : "") + sv + (d ? "," + s[1] : "");
  }
  function eur(n) { return fiks(n, 2); }
  function proc(n, d) { return fiks(n, d == null ? 2 : d); }
  function dataISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? "" : s));
    if (!m) return "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && +m[1] >= 1990 && +m[1] <= 2100 ? m[0] : "";
  }
  var MEN_K = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"];
  function dataZ(iso) {
    var d = dataISO(iso);
    return d ? d.slice(0, 4) + " m. " + MEN_K[+d.slice(5, 7) - 1] + " " + (+d.slice(8)) + " d." : "";
  }
  function menZ(m) { var I = global.GP_OSP_INDEKSAI; return I ? I.menuoZodziais(m) : String(m || ""); }
  function menuo(s) { var I = global.GP_OSP_INDEKSAI; return I ? I.menuo(s) : null; }
  function pridekDienas(iso, n) {
    var d = dataISO(iso);
    if (!d) return "";
    var x = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8) + n));
    return x.toISOString().slice(0, 10);
  }
  /* Šalies ar subtiekėjo pavadinimo linksnis: „Rangovas“ -> „Rangovo“ (k), „Rangovui“ (n), „Rangovą“ (g), „Rangovu“ (i), „Rangovų“ (kd). */
  function link(z, l) {
    z = String(z || "");
    if (!/as$/.test(z)) return z;
    var k = z.slice(0, -2);
    return l === "k" ? k + "o" : l === "n" ? k + "ui" : l === "g" ? k + "ą" : l === "i" ? k + "u" : l === "kd" ? k + "ų" : z;
  }
  function didz(t) { var D = global.GP_DOCX_STILIAI; return D && D.didziosiomis ? D.didziosiomis(t) : String(t).toUpperCase(); }

  /* ---------- teisės nuorodos (tik iš registro) ---------- */
  function cit(raktas) { var T = global.GP_TEISE; try { return T ? T.cit(raktas, "PI") : ""; } catch (e) { return ""; } }
  function apie(raktas) { var T = global.GP_TEISE; try { return T ? T.apie(raktas, "PI") : ""; } catch (e) { return ""; } }
  /* „PĮ 97 str. 1 d. 1 p.“ -> „... įstatymo 97 straipsnio 1 dalies 1 punktu“ (įnagininkas, kaip LITGRID susitarimuose). */
  function ilgas(raktas) {
    var m = /^PĮ (\d+) str\.(?: (\d+) d\.)?(?: (\d+) p\.)?$/.exec(cit(raktas)), T = global.GP_TEISE;
    if (!m || !T) return "";
    var pav = T.aktas("PI").pavadinimas.replace(/įstatymas$/, "įstatymo");
    return pav + " " + m[1] + (m[3] ? " straipsnio " + m[2] + " dalies " + m[3] + " punktu" : m[2] ? " straipsnio " + m[2] + " dalimi" : " straipsniu");
  }
  /* Pagrindų sakiniai - pagal PĮ 97 str. tekstą (e-tar, aktuali redakcija, perskaityta 2026-11-28; registro raktai tie patys). */
  var PAGRINDAI = {
    perziuros_salygos: { trumpai: "iš anksto numatyta peržiūros sąlyga ar pasirinkimo galimybė",
      sakinys: "Sutartis jos galiojimo laikotarpiu gali būti keičiama neatliekant naujos pirkimo procedūros, kai pakeitimas, neatsižvelgiant į jo piniginę vertę, iš anksto buvo aiškiai, tiksliai ir nedviprasmiškai suformuluotas pirkimo dokumentuose nustatant Sutarties peržiūros, įskaitant kainos indeksavimą, sąlygas ar pasirinkimo galimybes, įskaitant Sutarties termino, perkamų kiekių, apimties pakeitimą" },
    keitimas_papildomi: { trumpai: "papildomi darbai, paslaugos ar prekės iš to paties tiekėjo",
      sakinys: "Sutartis jos galiojimo laikotarpiu gali būti keičiama neatliekant naujos pirkimo procedūros, kai prireikia iš to paties tiekėjo pirkti papildomų darbų, paslaugų ar prekių, kurie nebuvo įtraukti į pirminį pirkimą, tiekėjo pakeitimas negalimas dėl ekonominių ar techninių priežasčių ir sukeltų didelių nepatogumų ar nemažą išlaidų dubliavimą, o atskiro pakeitimo vertė neviršija 50 procentų pradinės Sutarties vertės" },
    keitimas_nenumatytos: { trumpai: "aplinkybės, kurių nebuvo galima numatyti",
      sakinys: "Sutartis jos galiojimo laikotarpiu gali būti keičiama neatliekant naujos pirkimo procedūros, kai pakeitimo būtinybė atsirado dėl aplinkybių, kurių protingas ir apdairus perkantysis subjektas negalėjo numatyti, pakeitimu iš esmės nepakeičiamas Sutarties pobūdis, o atskiro pakeitimo vertė neviršija 50 procentų pradinės Sutarties vertės" },
    keitimas_mazos_vertes: { trumpai: "nedidelės vertės pakeitimas (vertės ribos)",
      sakinys: "Sutartis jos galiojimo laikotarpiu gali būti keičiama neatliekant naujos pirkimo procedūros, kai bendra atskirų pakeitimų pagal šią dalį vertė neviršija tarptautinio pirkimo vertės ribų ir 10 procentų pradinės Sutarties vertės prekių ar paslaugų pirkimo atveju arba 15 procentų - darbų pirkimo atveju, o pakeitimu iš esmės nepakeičiamas Sutarties pobūdis" },
    keitimas_neesminis: { trumpai: "pakeitimas nėra esminis",
      sakinys: "Sutartis jos galiojimo laikotarpiu gali būti keičiama neatliekant naujos pirkimo procedūros, kai pakeitimas, neatsižvelgiant į jo vertę, nėra esminis" }
  };
  /* Šaltiniai, kuriais remiasi patikros (rodomi įrankyje ir pagrindime). VPT gairės - rekomendacinio pobūdžio ir parengtos iki 2022-12-13 įstatymo
     pakeitimo: jose minima bendra 100 procentų riba papildomiems darbams ir nenumatytoms aplinkybėms įstatyme nebėra. */
  /* Teismų praktika, kuria remiasi patikros (perskaityta Liteko 2026-11-28; dauguma bylų - pagal VPĮ 89 str., kurio pagrindai, kaip nurodė LAT byloje
     e3K-3-245-916/2023, iš esmės atitinka PĮ 97 str.). Tekstas - trumpas teismo išaiškinimo perpasakojimas, ne citata. */
  var LITEKO = "https://liteko.teismai.lt/viesasprendimupaieska/tekstas.aspx?id=";
  var PRAKTIKA = {
    "e3K-3-349-469/2023": { teismas: "LAT", data: "2023-12-19", id: "e6313119-01d4-45b1-a456-e920ebc3c2af",
      teze: "keitimo sąlyga turi nustatyti ne tik galimybę keisti, bet ir pakeitimų apimtį, pobūdį ir aplinkybes; ja galima remtis tik iš anksto aprašytoje situacijoje" },
    "e3K-3-325-916/2023": { teismas: "LAT", data: "2023-12-19", id: "88462ea9-4067-4e90-933d-1bd26926e3b8",
      teze: "kas remiasi nedidelės vertės pakeitimų dalimi ar kainos peržiūros sąlyga, turi įrodyti, kad ribos neviršytos ir sąlygos įvykdytos; indekso kategorijos pakeisti negalima, jei Sutartis to nenumato" },
    "e3K-3-245-916/2023": { teismas: "LAT", data: "2023-09-28", id: "8d2d1548-b1e9-4f77-a5a8-b3614ff2de83", istatymas: "PĮ",
      teze: "kainą dėl mažesnės darbų apimties galima sumažinti be keitimo tik tada, kai pirkimo dokumentai ir Sutartis aiškiai nustato galimybę, apimtį ir aplinkybes; vien sąmatoje išvardyti galimai nereikalingi darbai tokia sąlyga nėra" },
    "e3K-3-26-969/2021": { teismas: "LAT", data: "2021-02-24", id: "45296e5b-6a08-4bed-b74b-68ffdcf7acb3", istatymas: "PĮ",
      teze: "dalies darbų atsisakymas yra Sutarties pakeitimas; Sutarties sąlyga atsisakyti siejama su tuo, kad darbų nebereikia apskritai, o ne tik iš šio tiekėjo; taikoma įstatymo redakcija, galiojusi atsiradus poreikiui keisti" },
    "e3K-3-39-378/2020": { teismas: "LAT", data: "2020-10-14", id: "f4fe3f3f-068c-449f-976f-cb62e3e087d7",
      teze: "termino ir kitų nepiniginių sąlygų keitimas vertinamas pagal neesminio pakeitimo pagrindą; ar pakeitimas būtų sudominęs daugiau tiekėjų, vertinama kaip galimybė (de jure)" },
    "e3K-3-220-969/2020": { teismas: "LAT", data: "2020-07-03", id: "ca890c6b-eec6-4da0-966c-4e0bd0240135",
      teze: "pratęsimu laikoma ir galimybė dirbti ilgiau be konkrečios datos; kai darbų trukmė buvo pasiūlymų vertinimo kriterijus, toks pratęsimas iškreipė ekonominę pusiausvyrą rangovo naudai" },
    "eA-227-415/2025": { teismas: "LVAT", data: "2025-02-05", id: "ea174f41-f6cd-4161-98eb-d7983365a715",
      teze: "bendra sąlyga be aplinkybių nėra keitimo sąlyga; papildomų darbų vertė su 15 procentų riba lyginta neatimant atsisakytų darbų; pratęsus terminą nepratęstas užtikrinimas ir draudimas pakeitė pusiausvyrą rangovo naudai" },
    "e2A-455-790/2024": { teismas: "LApT", data: "2024-08-01", id: "41932207-2390-4adc-8544-e2af4e033d5d",
      teze: "subtiekėjas - tas, kuris pats vykdo dalį Sutarties; finansuotojas ar užtikrinimą už tiekėją pateikiantis asmuo subtiekėju nėra" },
    "e2A-193-934/2026": { teismas: "LApT", data: "2026-05-14", id: "1f7daf24-f5c5-4d0c-aa93-5583c12ddb21",
      teze: "kai Sutartis subtiekėjų keitimo tvarkos nenustato, keisti galima tik jei pakeitimas nėra esminis; naujas subtiekėjas vertinamas pagal pirkimo kvalifikacijos ir pašalinimo reikalavimus" }
  };
  var TEISMAI = { LAT: "Lietuvos Aukščiausiojo Teismo", LVAT: "Lietuvos vyriausiojo administracinio teismo", LApT: "Lietuvos apeliacinio teismo" };
  function bylos(nr) { var x = PRAKTIKA[nr]; return x ? x.teismas + " byla Nr. " + nr : nr; }
  function praktikosEilute(nr) {
    var x = PRAKTIKA[nr];
    return TEISMAI[x.teismas] + " " + dataZ(x.data) + " nutartis byloje Nr. " + nr + (x.istatymas ? " (pagal PĮ)" : "") + ": " + x.teze + ".";
  }
  /* Kurios bylos pagrindžia bloko patikras. */
  function blokoPraktika(b) {
    var pg = blokoPagrindas(b), o = [];
    if (b.tipas === "ind") o.push("e3K-3-349-469/2023", "e3K-3-325-916/2023");
    if (b.tipas === "pap") { o.push("eA-227-415/2025"); if (pg === "keitimas_mazos_vertes") o.push("e3K-3-325-916/2023"); if (pg === "perziuros_salygos") o.push("e3K-3-349-469/2023"); }
    if (b.tipas === "ats") o.push("e3K-3-245-916/2023", "e3K-3-26-969/2021");
    if (b.tipas === "ter") o.push("e3K-3-220-969/2020", "eA-227-415/2025");
    if (b.tipas === "sub") o.push("e2A-455-790/2024", "e2A-193-934/2026");
    if (pg === "keitimas_neesminis" && b.tipas !== "sub" && b.tipas !== "asm") o.push("e3K-3-39-378/2020");
    return o.filter(function (x, i, a) { return a.indexOf(x) === i; });
  }
  var SALTINIAI = {
    vpt: { pav: "VPT Sutarčių keitimo gairės (v1.1, 2019-04-25)", url: "https://vpt.lrv.lt/uploads/vpt/documents/files/mp/sutarciu_keitimo_gaires.pdf",
      pastaba: "Rekomendacinio pobūdžio; parengtos iki 2022-12-13 Pirkimų įstatymo pakeitimo, todėl jose minimos bendros 100 procentų ribos papildomiems darbams ir nenumatytoms aplinkybėms įstatyme nebėra." }
  };

  /* ---------- sutarčių formos ---------- */
  var FORMOS = {
    EKS: { pav: "Eksploatavimo darbų sutartis", pirkejas: "Užsakovas", tiekejas: "Rangovas", sub: "subrangovas" },
    SR: { pav: "Statybos rangos sutartis", pirkejas: "Užsakovas", tiekejas: "Rangovas", sub: "subrangovas" },
    PSR: { pav: "Projektavimo ir statybos rangos sutartis", pirkejas: "Užsakovas", tiekejas: "Rangovas", sub: "subrangovas" },
    DARBAI: { pav: "Darbų pirkimo-pardavimo sutartis", pirkejas: "Užsakovas", tiekejas: "Rangovas", sub: "subrangovas" },
    PPS: { pav: "Projektavimo paslaugų sutartis", pirkejas: "Užsakovas", tiekejas: "Projektuotojas", sub: "subtiekėjas" },
    PREKES: { pav: "Prekių pirkimo-pardavimo sutartis", pirkejas: "Pirkėjas", tiekejas: "Tiekėjas", sub: "subtiekėjas" },
    PASLAUGOS: { pav: "Paslaugų pirkimo-pardavimo sutartis", pirkejas: "Pirkėjas", tiekejas: "Tiekėjas", sub: "subtiekėjas" },
    KITA: { pav: "Kita arba ankstesnė sutarties forma", pirkejas: "Pirkėjas", tiekejas: "Tiekėjas", sub: "subtiekėjas" }
  };
  function forma(s) { return turi(FORMOS, s && s.forma) ? FORMOS[s.forma] : FORMOS.KITA; }
  function salisP(s) { return (s && s.salisP) || forma(s).pirkejas; }
  function salisT(s) { return (s && s.salisT) || forma(s).tiekejas; }

  /* Kainos peržiūros taisyklės pagal LITGRID sutarčių formas. eilutes: [indeksas, kam taikoma (naudininku), ar su suma, ar slenksčiui]. */
  var T_RANGA = "Perskaičiuotos sumos mokamos tik už tuos Darbus, kurie bus priimti po šio Susitarimo įsigaliojimo.";
  var E_RANGA = [["sski_visos", "", false, true], ["sski_med", "neatliktų statybos darbų medžiagų ir gaminių daliai", true, false],
    ["sski_mas", "neatliktų statybos darbų mašinų ir mechanizmų darbo daliai", true, false], ["sski_du", "neatliktų statybos darbų darbo užmokesčio ir pridėtinių išlaidų daliai", true, false]];
  var IND = {
    EKS: { formule: "koef", slenkstis: 5, grieztas: false, minMen: 6, pirmamTaikoma: true, kTikslumas: null, pradzia: "pasiulymu", dok: "bendrųjų sąlygų", punktas: "7.3",
      eilutes: [["sski_visos", "likusiai neaktuotai Sutarties kainai", true, true], ["sski_du", "Darbų įkainiams", false, false], ["sski_med", "Medžiagų įkainiams", false, false]],
      taikymas: "Perskaičiuoti įkainiai taikomi už tuos Darbus, kurių numatoma pradžia yra vėlesnė nei šio Susitarimo sudarymo mėnesio 25 diena, ir tik tiems Darbams, kurie atliekami po to, kai Šalys pasirašė šį Susitarimą." },
    SR: { formule: "koef", slenkstis: 5, grieztas: false, minMen: 6, pirmamTaikoma: true, kTikslumas: 3, pradzia: "pasiulymu", dok: "bendrųjų sąlygų", punktas: "7.3", eilutes: E_RANGA, taikymas: T_RANGA, garantija: true },
    PSR: { formule: "koef", slenkstis: 5, grieztas: false, minMen: 6, pirmamTaikoma: true, kTikslumas: 3, pradzia: "pasiulymu", dok: "bendrųjų sąlygų", punktas: "8.3", eilutes: E_RANGA, taikymas: T_RANGA, garantija: true },
    DARBAI: { formule: "koef", slenkstis: 5, grieztas: false, minMen: 6, pirmamTaikoma: false, kTikslumas: 3, pradzia: "pasiulymu", dok: "bendrųjų sąlygų", punktas: "", eilutes: E_RANGA, taikymas: T_RANGA, garantija: true },
    PPS: { formule: "koef", slenkstis: 5, grieztas: false, minMen: 6, pirmamTaikoma: true, kTikslumas: null, pradzia: "pasiulymu", dok: "bendrųjų sąlygų", punktas: "",
      eilutes: [["sski_du", "Užsakovui neperduotų (neužaktuotų) Paslaugų vertei", true, true]], taikymas: "Perskaičiuojama tik Užsakovui neperduotų (neužaktuotų) Paslaugų vertė.", garantija: true },
    PREKES: { formule: "proc", slenkstis: 5, grieztas: true, minMen: 6, pirmamTaikoma: true, kTikslumas: 1, pradzia: "isigaliojimo", dok: "specialiųjų sąlygų", punktas: "5.3.1.2",
      eilutes: [["vki", "neišpirktai Sutarties daliai", true, true]], taikymas: "Perskaičiuota kaina (įkainiai) taikoma tik tai Sutarties daliai, kuri nėra išpirkta, t. y. Prekėms, kurios nėra priimtos ir apmokėtos." },
    PASLAUGOS: { formule: "proc", slenkstis: 5, grieztas: true, minMen: 6, pirmamTaikoma: true, kTikslumas: 1, pradzia: "isigaliojimo", dok: "specialiųjų sąlygų", punktas: "5.3.1.2",
      eilutes: [["vki", "neišpirktai Sutarties daliai", true, true]], taikymas: "Perskaičiuota kaina (įkainiai) taikoma tik tai Sutarties daliai, kuri nėra išpirkta, t. y. Paslaugoms, kurios nėra priimtos ir apmokėtos." },
    KITA: { formule: "koef", slenkstis: null, grieztas: false, minMen: null, pirmamTaikoma: true, kTikslumas: null, pradzia: "", dok: "", punktas: "", eilutes: [["", "", true, true]], taikymas: "" }
  };
  var SUB = { EKS: ["bendrųjų sąlygų", "5.2"], SR: ["bendrųjų sąlygų", "4.2"], PSR: ["bendrųjų sąlygų", "5.2"], DARBAI: ["bendrųjų sąlygų", ""], PPS: ["bendrųjų sąlygų", "4.2"],
    PREKES: ["bendrųjų sąlygų", "3.2"], PASLAUGOS: ["bendrųjų sąlygų", "3.2"], KITA: ["", ""] };
  var DOKAI = ["", "bendrųjų sąlygų", "specialiųjų sąlygų"];
  var PRADZIOS = {
    pasiulymu: "Pirmam perskaičiavimui - pasiūlymų pateikimo termino pabaigos mėnuo; vėlesniam - paskutinio perskaičiavimo metu naudotos indekso reikšmės mėnuo.",
    isigaliojimo: "Pirmam perskaičiavimui - Sutarties įsigaliojimo mėnuo; vėlesniam - paskutinio perskaičiavimo metu naudotos indekso reikšmės mėnuo.",
    "": "Laikotarpio pradžią nustato Sutarties kainos peržiūros nuostata."
  };
  /* pagrindai - kai pagrindą renkasi žmogus (pirmas sąraše - numatytas, jei pasirinkimas tik vienas). */
  var TIPAI = {
    ind: { pav: "Kainos perskaičiavimas pagal indeksą", pagrindas: "perziuros_salygos", esme: "Sutarties kainos perskaičiavimo pagal kainų indeksą" },
    pap: { pav: "Papildomi darbai, paslaugos ar prekės", pagrindai: ["keitimas_mazos_vertes", "keitimas_papildomi", "keitimas_nenumatytos", "perziuros_salygos"], esme: "papildomų darbų (paslaugų, prekių) įsigijimo", kaina: 1 },
    ats: { pav: "Atsisakomi darbai, paslaugos ar prekės", pagrindai: ["perziuros_salygos", "keitimas_neesminis"], esme: "dalies darbų (paslaugų, prekių) atsisakymo", kaina: -1 },
    ter: { pav: "Termino pratęsimas", pagrindai: ["perziuros_salygos", "keitimas_neesminis"], esme: "termino pratęsimo" },
    sub: { pav: "Subtiekėjo pasitelkimas ar pakeitimas", pagrindas: "keitimas_neesminis", esme: "subtiekėjų pasitelkimo" },
    asm: { pav: "Atsakingų asmenų pakeitimas", pagrindas: "keitimas_neesminis", esme: "atsakingų asmenų pakeitimo" },
    kit: { pav: "Kitos Sutarties sąlygos pakeitimas", pagrindai: ["keitimas_neesminis", "perziuros_salygos"], esme: "Sutarties sąlygų patikslinimo" }
  };
  /* Bloko pagrindas: fiksuotas pagal rūšį arba žmogaus pasirinktas („“ - dar nepasirinktas). */
  function blokoPagrindas(b) {
    var tp = TIPAI[b.tipas];
    if (!tp) return "";
    if (tp.pagrindas) return tp.pagrindas;
    return tp.pagrindai.indexOf(b.pagrindas) >= 0 ? b.pagrindas : "";
  }
  /* Esminio pakeitimo požymiai (PĮ 97 str. 4 d.): žmogus atsako į kiekvieną; „taip“ - pakeitimas esminis. */
  var ESM = [
    ["pobudis", "Ar pakeitimu keičiamas Sutarties bendrasis pobūdis (pvz. perkamas kitoks objektas, keičiasi pirkimo rūšis - prekės tampa paslaugomis ar darbais)?"],
    ["salyga", "Ar pakeitimu nustatoma sąlyga, kurią įtraukus į pradinį pirkimą būtų galima priimti kitų dalyvių pasiūlymus ar pirkimas būtų sudominęs daugiau tiekėjų?"],
    ["pusiausvyra", "Ar dėl pakeitimo ekonominė Sutarties pusiausvyra pasikeičia kitos Šalies naudai taip, kaip nebuvo aptarta Sutartyje?"],
    ["apimtis", "Ar pakeitimu labai padidėja Sutarties apimtis?"],
    ["tiekejas", "Ar kitą Šalį (tiekėją) pakeičia naujas tiekėjas?"]
  ];
  var ESM_PAAISK = {
    salyga: "Vertinama kaip galimybė, ne ar tiekėjai tikrai būtų dalyvavę (LAT byla Nr. e3K-3-39-378/2020). Pavyzdžiui, VPT gairėse esminiu laikomas trumpo prekių pristatymo termino pratęsimas, kai Sutartyje pratęsimo galimybės nebuvo: trumpas terminas galėjo atbaidyti dalį tiekėjų.",
    pusiausvyra: "Pavyzdžiui, VPT gairėse esminiu laikomas avanso ar mokėjimo už į statybvietę pristatytas medžiagas įvedimas, kai Sutartyje jų nebuvo, ir darbų atsisakymas mažesniais nei Sutarties įkainiais."
  };
  function objektas(s) {
    if (s && (s.objektas === "darbai" || s.objektas === "prekes" || s.objektas === "paslaugos")) return s.objektas;
    var f = s && s.forma;
    return f === "EKS" || f === "SR" || f === "PSR" || f === "DARBAI" ? "darbai" : f === "PPS" || f === "PASLAUGOS" ? "paslaugos" : f === "PREKES" ? "prekes" : "";
  }
  /* Objekto žodžiai susitarimo tekstui: [kilmininkas dgs., „atliekamų / teikiamų / tiekiamų“]. */
  var OBJ = { darbai: ["darbų", "atliekamų darbų", "Darbų"], paslaugos: ["paslaugų", "teikiamų paslaugų", "Paslaugų"], prekes: ["prekių", "tiekiamų prekių", "Prekių"], "": ["darbų (paslaugų, prekių)", "vykdomų įsipareigojimų", "Sutarties objekto"] };

  function indEilute(e) {
    var I = global.GP_OSP_INDEKSAI, k = I && turi(I.KATALOGAS, e[0]) ? I.KATALOGAS[e[0]] : null;
    return { indeksas: e[0], pav: k ? k.pav : "", saltinis: "", taikoma: e[1], suSuma: !!e[2], slenksciui: !!e[3], suma: null, pr: null, pb: null, prS: "", pbS: "" };
  }
  function taisykle(f) {
    var t = turi(IND, f) ? IND[f] : IND.KITA;
    return { formule: t.formule, slenkstis: t.slenkstis, grieztas: t.grieztas, minMen: t.minMen, pirmamTaikoma: t.pirmamTaikoma, kTikslumas: t.kTikslumas, pradzia: t.pradzia };
  }
  function naujasBlokas(tipas, S) {
    var s = (S && S.sutartis) || {}, f = turi(IND, s.forma) ? s.forma : "KITA", t = IND[f];
    if (tipas === "ind") {
      var ank = paskutinisInd(S);
      return { tipas: "ind", taisykle: taisykle(f), dok: t.dok, punktas: t.punktas, pradzia: ank ? ank : "", pabaiga: "", pirmas: !ank, eilutes: t.eilutes.map(indEilute),
        iniciatorius: "tiekejas", rastoData: "", rastoNr: "", aktas: "", aktoData: "", tiekejoKaina: null, kainosDok: "", kainosPunktas: "", ikainiuPriedas: false, skaiciavimoPriedas: false,
        taikymas: t.taikymas, garantija: t.garantija ? "" : "netaikoma", gauta: "" };
    }
    if (tipas === "sub") {
      var p = turi(SUB, f) ? SUB[f] : SUB.KITA;
      return { tipas: "sub", veiksmas: "pridedamas", pav: "", kodas: "", senas: "", darbai: "", rastoData: "", rastoNr: "", rastoPav: "", dok: p[0], punktas: p[1], priedoNr: "", priedoPav: "", ivertinta: false, pajegumai: "" };
    }
    if (tipas === "asm") return { tipas: "asm", kieno: "", dok: "specialiųjų sąlygų", punktas: "", redakcija: "", priezastis: "" };
    /* Kainos punktas - perimamas iš jau pridėto kainą keičiančio pakeitimo, kad nereikėtų rašyti du kartus. */
    var kp = ((S && S.rengiamas && S.rengiamas.blokai) || []).filter(function (x) { return x.kainosPunktas; })[0];
    var kd = kp ? kp.kainosDok : "", kpn = kp ? kp.kainosPunktas : "";
    if (tipas === "pap") return { tipas: "pap", pagrindas: "", aprasymas: "", verte: null, priezastis: "", iniciatorius: "pirkejas", rastoData: "", rastoNr: "",
      kainosBudas: "", kainosPagrindimas: "", dok: "", punktas: "", galimybe: "", ribaEur: null, negalimaKeisti: "", keitimoPagrindimas: "", nepatogumai: false,
      aplinkybes: "", suzinota: "", pobudisNesikeicia: false, nebaigta: false, atlikimoTerminas: "", samata: false, kainosDok: kd, kainosPunktas: kpn, garantija: t.garantija ? "" : "netaikoma" };
    if (tipas === "ats") return { tipas: "ats", pagrindas: "", aprasymas: "", verte: null, priezastis: "", iniciatorius: "pirkejas", rastoData: "", rastoNr: "",
      vertesBudas: "", poreikis: "", dok: "", punktas: "", galimybe: "", esm: tusciasEsm(), nebaigta: false, samata: false, kainosDok: kd, kainosPunktas: kpn };
    if (tipas === "ter") return { tipas: "ter", pagrindas: "", kas: "", dok: "specialiųjų sąlygų", punktas: "", dabartinis: "", naujas: "", priezastis: "", aplinkybe: "",
      maxPrat: null, maxVnt: "men", ankstesniPrat: null, iniciatorius: "tiekejas", rastoData: "", rastoNr: "", kainaNesikeicia: false, grafikas: false, vertinimoKriterijus: "",
      garantija: t.garantija ? "" : "netaikoma", esm: tusciasEsm() };
    if (tipas === "kit") return { tipas: "kit", pagrindas: "", kas: "punktas", dok: "specialiųjų sąlygų", punktas: "", priedoNr: "", priedoPav: "", redakcija: "", priezastis: "",
      salygosDok: "", salygosPunktas: "", galimybe: "", kainaNesikeicia: false, esm: tusciasEsm() };
    return null;
  }
  function tusciasEsm() { var o = {}; ESM.forEach(function (q) { o[q[0]] = ""; }); return o; }
  function paskutinisInd(S) {
    var m = "";
    ((S && S.ankstesni) || []).forEach(function (a) { if (a.indMenuo && a.indMenuo > m) m = a.indMenuo; });
    return m;
  }

  /* ---------- duomenų forma (nepatikimi duomenys: saugykla, failas) ---------- */
  function laukas(o, k, max) { return eilute1(o && o[k], max); }
  function blokoForma(b) {
    if (!b || typeof b !== "object" || !turi(TIPAI, b.tipas)) return null;
    if (b.tipas === "ind") {
      var t = b.taisykle && typeof b.taisykle === "object" ? b.taisykle : {};
      var el = (Array.isArray(b.eilutes) ? b.eilutes : []).slice(0, RIBOS.eiluciu).map(function (e) {
        e = e && typeof e === "object" ? e : {};
        var I = global.GP_OSP_INDEKSAI, ind = I && turi(I.KATALOGAS, e.indeksas) ? e.indeksas : "";
        return { indeksas: ind, pav: ind ? I.KATALOGAS[ind].pav : laukas(e, "pav"), saltinis: laukas(e, "saltinis"), taikoma: laukas(e, "taikoma"), suSuma: e.suSuma !== false, slenksciui: e.slenksciui === true,
          suma: teig(e.suma), pr: sk(e.pr) > 0 ? e.pr : null, pb: sk(e.pb) > 0 ? e.pb : null, prS: e.prS === "osp" || e.prS === "ranka" ? e.prS : "", pbS: e.pbS === "osp" || e.pbS === "ranka" ? e.pbS : "" };
      });
      return { tipas: "ind",
        taisykle: { formule: t.formule === "proc" ? "proc" : "koef", slenkstis: teig(t.slenkstis), grieztas: t.grieztas === true, minMen: teig(t.minMen), pirmamTaikoma: t.pirmamTaikoma !== false,
          kTikslumas: sk(t.kTikslumas) != null && t.kTikslumas >= 0 && t.kTikslumas <= 10 ? Math.floor(t.kTikslumas) : null, pradzia: turi(PRADZIOS, t.pradzia) ? t.pradzia : "" },
        dok: DOKAI.indexOf(b.dok) >= 0 ? b.dok : "", punktas: laukas(b, "punktas", 40), pradzia: menuo(b.pradzia) || "", pabaiga: menuo(b.pabaiga) || "", pirmas: b.pirmas !== false, eilutes: el,
        iniciatorius: b.iniciatorius === "pirkejas" ? "pirkejas" : "tiekejas", rastoData: dataISO(b.rastoData), rastoNr: laukas(b, "rastoNr", 60), aktas: b.aktas === "taip" || b.aktas === "ne" ? b.aktas : "",
        aktoData: dataISO(b.aktoData), tiekejoKaina: teig(b.tiekejoKaina), kainosDok: DOKAI.indexOf(b.kainosDok) >= 0 ? b.kainosDok : "", kainosPunktas: laukas(b, "kainosPunktas", 40),
        ikainiuPriedas: b.ikainiuPriedas === true, skaiciavimoPriedas: b.skaiciavimoPriedas === true, taikymas: txt(b.taikymas, 600).replace(/\n+/g, " "),
        garantija: ["taip", "ne", "netaikoma"].indexOf(b.garantija) >= 0 ? b.garantija : "", gauta: laukas(b, "gauta", 40) };
    }
    if (b.tipas === "sub") {
      return { tipas: "sub", veiksmas: b.veiksmas === "keiciamas" ? "keiciamas" : "pridedamas", pav: laukas(b, "pav", 200), kodas: laukas(b, "kodas", 20), senas: laukas(b, "senas", 200), darbai: laukas(b, "darbai", 400),
        rastoData: dataISO(b.rastoData), rastoNr: laukas(b, "rastoNr", 60), rastoPav: laukas(b, "rastoPav", 300), dok: DOKAI.indexOf(b.dok) >= 0 ? b.dok : "", punktas: laukas(b, "punktas", 40),
        priedoNr: laukas(b, "priedoNr", 20), priedoPav: laukas(b, "priedoPav", 200), ivertinta: b.ivertinta === true, pajegumai: b.pajegumai === "taip" || b.pajegumai === "ne" ? b.pajegumai : "" };
    }
    var dok = function (k) { return DOKAI.indexOf(b[k]) >= 0 ? b[k] : ""; }, pagr = TIPAI[b.tipas].pagrindai && TIPAI[b.tipas].pagrindai.indexOf(b.pagrindas) >= 0 ? b.pagrindas : "";
    var vien = function (k, galimi) { return galimi.indexOf(b[k]) >= 0 ? b[k] : ""; }, init = b.iniciatorius === "tiekejas" ? "tiekejas" : "pirkejas";
    if (b.tipas === "pap") {
      return { tipas: "pap", pagrindas: pagr, aprasymas: txt(b.aprasymas, 1000).replace(/\n+/g, " "), verte: teig(b.verte), priezastis: txt(b.priezastis, 1000).replace(/\n+/g, " "), iniciatorius: init,
        rastoData: dataISO(b.rastoData), rastoNr: laukas(b, "rastoNr", 60), kainosBudas: vien("kainosBudas", ["ikainiai", "tvarka", "pasiulymas"]), kainosPagrindimas: laukas(b, "kainosPagrindimas", 600),
        dok: dok("dok"), punktas: laukas(b, "punktas", 40), galimybe: laukas(b, "galimybe", 600), ribaEur: teig(b.ribaEur), negalimaKeisti: vien("negalimaKeisti", ["ekonomines", "technines", "abi"]),
        keitimoPagrindimas: txt(b.keitimoPagrindimas, 1000).replace(/\n+/g, " "), nepatogumai: b.nepatogumai === true, aplinkybes: txt(b.aplinkybes, 1000).replace(/\n+/g, " "), suzinota: dataISO(b.suzinota),
        pobudisNesikeicia: b.pobudisNesikeicia === true, nebaigta: b.nebaigta === true, atlikimoTerminas: laukas(b, "atlikimoTerminas", 200), samata: b.samata === true,
        kainosDok: dok("kainosDok"), kainosPunktas: laukas(b, "kainosPunktas", 40), garantija: vien("garantija", ["taip", "ne", "netaikoma"]) };
    }
    var esm = {}, be = b.esm && typeof b.esm === "object" ? b.esm : {};
    ESM.forEach(function (q) { esm[q[0]] = be[q[0]] === "taip" || be[q[0]] === "ne" ? be[q[0]] : ""; });
    if (b.tipas === "ats") {
      return { tipas: "ats", pagrindas: pagr, aprasymas: txt(b.aprasymas, 1000).replace(/\n+/g, " "), verte: teig(b.verte), priezastis: txt(b.priezastis, 1000).replace(/\n+/g, " "), iniciatorius: init,
        rastoData: dataISO(b.rastoData), rastoNr: laukas(b, "rastoNr", 60), vertesBudas: vien("vertesBudas", ["ikainiai", "samatos", "kitaip"]), poreikis: vien("poreikis", ["visai", "kitas"]), dok: dok("dok"), punktas: laukas(b, "punktas", 40),
        galimybe: laukas(b, "galimybe", 600), esm: esm, nebaigta: b.nebaigta === true, samata: b.samata === true, kainosDok: dok("kainosDok"), kainosPunktas: laukas(b, "kainosPunktas", 40) };
    }
    if (b.tipas === "ter") {
      return { tipas: "ter", pagrindas: pagr, kas: vien("kas", ["darbu", "pristatymo", "paslaugu", "etapo", "galiojimo"]), dok: dok("dok"), punktas: laukas(b, "punktas", 40),
        dabartinis: dataISO(b.dabartinis), naujas: dataISO(b.naujas), priezastis: txt(b.priezastis, 1000).replace(/\n+/g, " "), aplinkybe: laukas(b, "aplinkybe", 600),
        maxPrat: teig(b.maxPrat), maxVnt: b.maxVnt === "d" ? "d" : "men", ankstesniPrat: teig(b.ankstesniPrat), iniciatorius: b.iniciatorius === "pirkejas" ? "pirkejas" : "tiekejas",
        rastoData: dataISO(b.rastoData), rastoNr: laukas(b, "rastoNr", 60), kainaNesikeicia: b.kainaNesikeicia === true, grafikas: b.grafikas === true,
        vertinimoKriterijus: vien("vertinimoKriterijus", ["taip", "ne"]), garantija: vien("garantija", ["taip", "galioja", "netaikoma"]), esm: esm };
    }
    if (b.tipas === "kit") {
      return { tipas: "kit", pagrindas: pagr, kas: b.kas === "priedas" ? "priedas" : "punktas", dok: dok("dok"), punktas: laukas(b, "punktas", 40), priedoNr: laukas(b, "priedoNr", 20),
        priedoPav: laukas(b, "priedoPav", 200), redakcija: txt(b.redakcija, RIBOS.ilgas), priezastis: txt(b.priezastis, 1000).replace(/\n+/g, " "), salygosDok: dok("salygosDok"),
        salygosPunktas: laukas(b, "salygosPunktas", 40), galimybe: laukas(b, "galimybe", 600), kainaNesikeicia: b.kainaNesikeicia === true, esm: esm };
    }
    return { tipas: "asm", kieno: ["pirkejo", "tiekejo", "abieju"].indexOf(b.kieno) >= 0 ? b.kieno : "", dok: DOKAI.indexOf(b.dok) >= 0 ? b.dok : "", punktas: laukas(b, "punktas", 40),
      redakcija: txt(b.redakcija, RIBOS.ilgas), priezastis: laukas(b, "priezastis", 300) };
  }
  function ankstesnioForma(a) {
    a = a && typeof a === "object" ? a : {};
    var pr = (Array.isArray(a.priminimai) ? a.priminimai : []).slice(0, 10).map(function (x) {
      x = x && typeof x === "object" ? x : {};
      return { kas: /^[a-z]{2,20}$/.test(x.kas || "") ? x.kas : "kita", tekstas: laukas(x, "tekstas", 400), iki: dataISO(x.iki), atlikta: dataISO(x.atlikta) };
    }).filter(function (x) { return x.tekstas && x.iki; });
    var o = { nr: laukas(a, "nr", 10), data: dataISO(a.data), regNr: laukas(a, "regNr", 40), esme: laukas(a, "esme", 300), pokytis: sk(a.pokytis), pagrindas: laukas(a, "pagrindas", 120),
      indMenuo: menuo(a.indMenuo) || "", pagal2d: teig(a.pagal2d), perziura: sk(a.perziura), pasirasyta: dataISO(a.pasirasyta), priminimai: pr,
      saltinis: a.saltinis === "cvpis" || a.saltinis === "irankis" ? a.saltinis : "ranka" };
    /* viešai paskelbta Sutarties vertė po šio pakeitimo (tik iš CVP IS duomenų gautiems įrašams) - užuomina prie kainos pokyčio lauko */
    if (teig(a.viesaVerte) != null) o.viesaVerte = teig(a.viesaVerte);
    return o;
  }
  function sutartiesForma(S) {
    if (!S || typeof S !== "object") return null;
    var s = S.sutartis && typeof S.sutartis === "object" ? S.sutartis : {}, r = S.rengiamas && typeof S.rengiamas === "object" ? S.rengiamas : {};
    var id = typeof S.id === "string" && /^[a-z0-9-]{4,40}$/.test(S.id) ? S.id : null;
    if (!id) return null;
    return { id: id, sukurta: laukas(S, "sukurta", 30), keista: laukas(S, "keista", 30),
      sutartis: { vykdytojas: laukas(s, "vykdytojas", 30), pirkejoPav: laukas(s, "pirkejoPav", 200), pirkejoKodas: laukas(s, "pirkejoKodas", 20), pirkejoAdresas: laukas(s, "pirkejoAdresas", 200),
        nr: laukas(s, "nr", 60), data: dataISO(s.data), pavadinimasKilm: laukas(s, "pavadinimasKilm", 400), forma: turi(FORMOS, s.forma) ? s.forma : "", salisP: laukas(s, "salisP", 40), salisT: laukas(s, "salisT", 40),
        tiekejoPav: laukas(s, "tiekejoPav", 200), tiekejoKodas: laukas(s, "tiekejoKodas", 20), tiekejoAdresas: laukas(s, "tiekejoAdresas", 200), pradineVerte: teig(s.pradineVerte), dabartineVerte: teig(s.dabartineVerte),
        objektas: ["darbai", "prekes", "paslaugos"].indexOf(s.objektas) >= 0 ? s.objektas : "", pirkimoRusis: ["tarptautinis", "supaprastintas", "mazos"].indexOf(s.pirkimoRusis) >= 0 ? s.pirkimoRusis : "",
        pasiulymuData: dataISO(s.pasiulymuData), isigaliojo: dataISO(s.isigaliojo), galiojaIki: dataISO(s.galiojaIki), pirkimoNr: laukas(s, "pirkimoNr", 40), viesaVerte: teig(s.viesaVerte), viesaPav: laukas(s, "viesaPav", 300), gauta: laukas(s, "gauta", 40),
        bvpz: /^\d{8}$/.test(s.bvpz || "") ? s.bvpz : "", pavS: s.pavS === "cvpis" ? "cvpis" : "" },
      ankstesni: (Array.isArray(S.ankstesni) ? S.ankstesni : []).slice(0, RIBOS.ankstesniu).map(ankstesnioForma),
      rengiamas: { nr: laukas(r, "nr", 10), data: dataISO(r.data), regNr: laukas(r, "regNr", 40), vieta: laukas(r, "vieta", 60) || "Vilnius",
        blokai: (Array.isArray(r.blokai) ? r.blokai : []).slice(0, RIBOS.bloku).map(blokoForma).filter(Boolean) } };
  }
  function saugyklosForma(o) {
    if (!o || typeof o !== "object" || o.schema !== SCHEMA || !Array.isArray(o.sutartys)) return null;
    var idai = {};
    return { schema: SCHEMA, sutartys: o.sutartys.slice(0, RIBOS.sutarciu).map(sutartiesForma).filter(function (x) { if (!x || idai[x.id]) return false; idai[x.id] = 1; return true; }) };
  }
  function naujaSutartis(id, dabar) {
    var O = global.GP_ORG, rk = O ? O.rekvizitai("litgrid") : null, t = (dabar || new Date()).toISOString();
    return sutartiesForma({ id: id, sukurta: t, keista: t, sutartis: { vykdytojas: "litgrid", pirkejoPav: "LITGRID AB", pirkejoKodas: rk ? rk.kodas : "", pirkejoAdresas: rk ? rk.adresas : "" },
      ankstesni: [], rengiamas: { vieta: "Vilnius", blokai: [] } });
  }

  /* ---------- sutarties vertės ---------- */
  function dabartine(S) {
    var s = S.sutartis;
    if (s.dabartineVerte != null) return s.dabartineVerte;
    if (s.pradineVerte == null) return null;
    var v = s.pradineVerte;
    S.ankstesni.forEach(function (a) { if (a.pokytis != null) v += a.pokytis; });
    return r2(v);
  }
  function pvmTarifas() { var T = global.GP_THRESHOLDS; return T && T.MOKESCIAI && sk(T.MOKESCIAI.pvmStandartinis) != null ? T.MOKESCIAI.pvmStandartinis : null; }
  function suPvm(n) { var t = pvmTarifas(); if (n == null || t == null) return null; var p = r2(n * t); return { pvm: p, viso: r2(n + p), tarifas: t }; }

  /* ---------- vertės ribos (PĮ 97 str. 1 d. 2-3 p., 2 ir 3 d.) ---------- */
  /* 3 d.: jei kaina peržiūrėta pagal Sutarties kainų peržiūros sąlygas, ribos skaičiuojamos nuo patikslintos vertės. Peržiūros dalis - ankstesnio
     pakeitimo laukas „perziura“; kai jo nėra, o įrašytas indekso mėnuo, - visas to pakeitimo pokytis (ir tai pasakoma). */
  function patikslinta(S) {
    var s = S.sutartis;
    if (s.pradineVerte == null) return { verte: null, perziura: 0, spejama: false };
    var p = 0, spej = false;
    S.ankstesni.forEach(function (a) {
      if (a.perziura != null) p += a.perziura;
      else if (a.indMenuo && a.pokytis != null) { p += a.pokytis; spej = true; }
    });
    return { verte: r2(s.pradineVerte + p), perziura: r2(p), spejama: spej };
  }
  function suma2d(S) { var v = 0; S.ankstesni.forEach(function (a) { if (a.pagal2d != null) v += a.pagal2d; }); return r2(v); }
  function ribos(S) {
    var T = global.GP_THRESHOLDS, o = objektas(S.sutartis), pi = T && T.PI;
    return { objektas: o, proc: o === "darbai" ? 15 : o ? 10 : null, intl: pi && o ? (o === "darbai" ? pi.intl_works : pi.intl_goods) : null,
      mv: pi && o ? (o === "darbai" ? pi.mv_works : pi.mv_goods) : null };
  }
  function blokuSuma(S, tipas, kur) {
    var v = 0;
    S.rengiamas.blokai.forEach(function (b, i) { if (b.tipas === tipas && b.verte != null && (!kur || kur(b, i))) v += b.verte; });
    return r2(v);
  }
  /* Papildomų darbų (paslaugų, prekių) vertė prieš ribas. */
  function skaiciuokPap(b, S, bi) {
    var Pt = patikslinta(S), R = ribos(S), pagr = blokoPagrindas(b), dab = dabartine(S);
    var out = { pagr: pagr, verte: b.verte, bazes: Pt.verte, patikslinta: Pt.perziura !== 0, spejama: Pt.spejama, proc: null, ribos: R };
    if (b.verte != null && Pt.verte) out.proc = b.verte / Pt.verte * 100;
    if (pagr === "keitimas_mazos_vertes") {
      out.pries = suma2d(S);
      out.kitiSiame = blokuSuma(S, "pap", function (x, i) { return i !== bi && blokoPagrindas(x) === pagr; });
      out.viso = r2(out.pries + out.kitiSiame + (b.verte || 0));
      out.visoProc = Pt.verte ? out.viso / Pt.verte * 100 : null;
    }
    /* VPT gairės (II ir V sk.): pakeitimais negalima peržengti pirkimo rūšies ribos - vertinama Sutarties vertė su pakeitimais. Kainos peržiūros dalis neįskaičiuojama. */
    if (dab != null) out.suPakeitimais = r2(dab - Pt.perziura + blokuSuma(S, "pap") - blokuSuma(S, "ats"));
    var pr = S.sutartis.pirkimoRusis;
    out.rusiesRiba = pr === "supaprastintas" ? R.intl : pr === "mazos" ? R.mv : null;
    out.virsRusies = out.rusiesRiba != null && out.suPakeitimais != null && out.suPakeitimais >= out.rusiesRiba;
    return out;
  }
  function dienuTarp(a, b) {
    var A = dataISO(a), Bd = dataISO(b);
    if (!A || !Bd) return null;
    return Math.round((Date.UTC(+Bd.slice(0, 4), +Bd.slice(5, 7) - 1, +Bd.slice(8, 10)) - Date.UTC(+A.slice(0, 4), +A.slice(5, 7) - 1, +A.slice(8, 10))) / 864e5);
  }
  function pridekMen(iso, n) {
    var d = dataISO(iso); if (!d || n == null) return "";
    var y = +d.slice(0, 4), m = +d.slice(5, 7) - 1 + n, dd = +d.slice(8, 10), yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    var paskutine = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
    return yy + "-" + String(mm + 1).padStart(2, "0") + "-" + String(Math.min(dd, paskutine)).padStart(2, "0");
  }
  var TERMINAI = { darbu: ["Darbų atlikimo terminą", "Darbų atlikimo termino"], pristatymo: ["Prekių pristatymo terminą", "Prekių pristatymo termino"],
    paslaugu: ["Paslaugų suteikimo terminą", "Paslaugų suteikimo termino"], etapo: ["etapo įvykdymo terminą", "etapo įvykdymo termino"], galiojimo: ["Sutarties galiojimo terminą", "Sutarties galiojimo termino"] };
  function skaiciuokTer(b) {
    var d = dienuTarp(b.dabartinis, b.naujas), out = { dienu: d, riba: "", virsija: false };
    if (b.maxPrat != null && b.dabartinis) {
      var liko = b.maxPrat - (b.ankstesniPrat || 0);
      out.liko = liko;
      out.riba = b.maxVnt === "d" ? pridekDienas(b.dabartinis, liko) : pridekMen(b.dabartinis, liko);
      out.virsija = !!(b.naujas && out.riba && b.naujas > out.riba);
    }
    return out;
  }
  function dienuKilm(n) { return (n % 10 === 1 && n % 100 !== 11) ? "kalendorinės dienos" : "kalendorinių dienų"; }

  /* ---------- kainos perskaičiavimas ---------- */
  function kTekstas(K, t) {
    if (K == null) return "";
    if (t.formule === "proc") return proc(K, t.kTikslumas == null ? 1 : t.kTikslumas) + " %";
    return fiks(K, t.kTikslumas == null ? 10 : t.kTikslumas);
  }
  function skaiciuokInd(b, S) {
    var t = b.taisykle, I = global.GP_OSP_INDEKSAI, out = { eilutes: [], klaidos: [], truksta: [], slenkstis: null, laikotarpis: null };
    out.men = I ? I.menesiuTarp(b.pradzia, b.pabaiga) : null;
    if (!b.pradzia) out.truksta.push("laikotarpio pradžios mėnuo");
    if (!b.pabaiga) out.truksta.push("laikotarpio pabaigos mėnuo");
    if (out.men != null && out.men <= 0) out.klaidos.push("Laikotarpio pabaiga turi būti vėlesnė už pradžią.");
    var reikiaMen = t.minMen != null && (t.pirmamTaikoma || !b.pirmas);
    out.laikotarpis = { reikia: reikiaMen ? t.minMen : null, men: out.men, tinka: out.men == null ? null : (!reikiaMen || out.men >= t.minMen) };
    var suma = 0, delta = 0, sumu = 0, visos = true;
    b.eilutes.forEach(function (e, i) {
      var r = { i: i, indeksas: e.indeksas, pav: e.pav, taikoma: e.taikoma, suSuma: e.suSuma, slenksciui: e.slenksciui, suma: e.suma, pr: e.pr, pb: e.pb, pokytis: null, K: null, nauja: null, skirtumas: null };
      if (!e.pav) out.truksta.push("indekso pavadinimas (" + (i + 1) + " eilutė)");
      if (e.pr != null && e.pb != null) {
        var santykis = e.pb / e.pr;
        r.pokytis = (santykis - 1) * 100;
        r.K = t.formule === "proc" ? apvalink(r.pokytis, t.kTikslumas == null ? 1 : t.kTikslumas) : (t.kTikslumas == null ? santykis : apvalink(santykis, t.kTikslumas));
        if (e.suSuma && e.suma != null) {
          r.nauja = t.formule === "proc" ? r2(e.suma + r2(e.suma * r.K / 100)) : r2(e.suma * r.K);
          r.skirtumas = r2(r.nauja - e.suma);
        }
      } else { out.truksta.push("indekso reikšmės (" + (e.pav || (i + 1) + " eilutė") + ")"); visos = false; }
      if (e.suSuma) {
        sumu++;
        if (e.suma == null) { out.truksta.push("perskaičiuojama suma (" + (e.pav || (i + 1) + " eilutė") + ")"); visos = false; }
        else { suma += e.suma; if (r.skirtumas != null) delta += r.skirtumas; }
      }
      if (e.slenksciui && r.pokytis != null && !out.slenkstis) {
        /* Su riba lyginamas pokyčio dydis (padidėjimas ar sumažėjimas). Kai Sutartis nustato apvalintą pokytį k (formulė „proc“), lyginamas jis;
           kitaip - neapvalintas pokytis (6 skaitmenys - tik slankiojo kablelio paklaidai). Jei apvalinimas keistų išvadą - „ribinis“. */
        var tiksl = apvalink(Math.abs(r.pokytis), 6), apval = Math.abs(t.formule === "proc" ? r.K : apvalink(r.pokytis, 2));
        var lyg = function (x) { return t.slenkstis == null ? null : (t.grieztas ? x > t.slenkstis : x >= t.slenkstis); };
        var pagr = t.formule === "proc" ? lyg(apval) : lyg(tiksl), kitaip = t.formule === "proc" ? lyg(tiksl) : lyg(apval);
        out.slenkstis = { pav: e.pav, pokytis: r.pokytis, reikia: t.slenkstis, grieztas: t.grieztas, pasiektas: pagr, ribinis: pagr !== kitaip };
      }
      out.eilutes.push(r);
    });
    if (!sumu) out.klaidos.push("Nė vienai eilutei nenurodyta, kokia suma perskaičiuojama.");
    if (!b.eilutes.some(function (e) { return e.slenksciui; }) && t.slenkstis != null) out.klaidos.push("Nepažymėta, kurio indekso pokytis lyginamas su Sutartyje nustatyta riba.");
    out.sena = dabartine(S);
    out.perskaiciuojama = r2(suma);
    if (out.sena != null && suma > out.sena + 0.005) out.klaidos.push("Perskaičiuojama suma (" + eur(suma) + " Eur) didesnė už dabartinę Sutarties kainą (" + eur(out.sena) + " Eur).");
    if (out.sena == null) out.truksta.push("Sutarties kaina (1 žingsnis)");
    out.pokytisEur = visos && sumu ? r2(delta) : null;
    out.nauja = out.pokytisEur != null && out.sena != null ? r2(out.sena + out.pokytisEur) : null;
    out.pvm = suPvm(out.nauja);
    var pr = S.sutartis.pradineVerte;
    out.pokytisProc = out.pokytisEur != null && pr ? out.pokytisEur / pr * 100 : null;
    out.tinka = !out.klaidos.length && !out.truksta.length && out.nauja != null && (!out.slenkstis || out.slenkstis.pasiektas !== false) && out.laikotarpis.tinka !== false;
    return out;
  }

  /* ---------- patikros ---------- */
  function punktoTekstas(dok, punktas, galune) { return punktas ? "Sutarties " + (dok ? dok + " " : "") + punktas + " " + (galune || "punkte") : ""; }
  function P(lygis, tekstas, laukas) { return { lygis: lygis, tekstas: tekstas, laukas: laukas || "" }; }
  function blokoPatikros(b, S, bi) {
    var out = [], s = S.sutartis, L = function (k) { return "b" + bi + "." + k; };
    if (b.tipas === "ind") {
      var r = skaiciuokInd(b, S), t = b.taisykle;
      if (b.punktas) out.push(P("ok", "Kainos peržiūra numatyta " + punktoTekstas(b.dok, b.punktas) + "."));
      else out.push(P("klaida", "Nurodykite Sutarties punktą, kuriame numatyta kainos peržiūra. Jei Sutartyje tokios sąlygos nėra, šiuo pagrindu kainos keisti negalima.", L("punktas")));
      if (r.laikotarpis.tinka === true && r.laikotarpis.reikia != null) out.push(P("ok", "Laikotarpis - " + r.men + " mėn. (Sutartyje - ne trumpesnis kaip " + r.laikotarpis.reikia + " mėn.)."));
      else if (r.laikotarpis.tinka === true) out.push(P("info", "Laikotarpis - " + r.men + " mėn.; mažiausia trukmė šiam perskaičiavimui Sutartyje nenustatyta arba nenurodyta."));
      else if (r.laikotarpis.tinka === false) out.push(P("klaida", "Laikotarpis - " + r.men + " mėn., o Sutartyje nustatyta ne trumpesnis kaip " + r.laikotarpis.reikia + " mėn.", L("pabaiga")));
      if (r.slenkstis) {
        var zn = t.grieztas ? "daugiau kaip " : "ne mažiau kaip ", sl = r.slenkstis;
        if (sl.reikia == null) out.push(P("tikrinti", "Indekso pokytis - " + proc(sl.pokytis) + " %. Sutartyje nustatyta riba nenurodyta - įrašykite ją arba patikrinkite, ar Sutartis jos nenustato.", L("slenkstis")));
        else if (sl.ribinis) out.push(P("tikrinti", "Indekso pokytis - " + proc(sl.pokytis, 4) + " %, riba - " + zn + proc(sl.reikia, 2) + " %. Rezultatas priklauso nuo apvalinimo - patikrinkite pagal Sutartį.", L("slenkstis")));
        else if (sl.pasiektas) out.push(P("ok", "Indekso pokytis - " + proc(sl.pokytis) + " % (Sutartyje - " + zn + proc(sl.reikia, 2) + " %)."));
        else out.push(P("klaida", "Indekso pokytis - " + proc(sl.pokytis) + " %, o Sutartyje nustatyta riba - " + zn + proc(sl.reikia, 2) + " %. Kainos peržiūros sąlyga neįvykdyta.", L("slenkstis")));
      }
      var ank = paskutinisInd(S);
      if (ank && b.pradzia && b.pradzia < ank) out.push(P("klaida", "Laikotarpis persidengia su ankstesniu perskaičiavimu: jame naudota " + menZ(ank) + " reikšmė, o šis laikotarpis prasideda " + menZ(b.pradzia) + ".", L("pradzia")));
      else if (ank && b.pradzia && b.pradzia !== ank) out.push(P("tikrinti", "Ankstesniame perskaičiavime naudota " + menZ(ank) + " indekso reikšmė - įprastai nuo to mėnesio prasideda kitas laikotarpis.", L("pradzia")));
      r.klaidos.forEach(function (k) { out.push(P("klaida", k)); });
      if (r.truksta.length) out.push(P("klaida", "Trūksta duomenų: " + r.truksta.join("; ") + "."));
      var ranka = b.eilutes.filter(function (e) { return (e.pr != null && e.prS !== "osp") || (e.pb != null && e.pbS !== "osp"); }).length;
      if (ranka) out.push(P("tikrinti", "Dalis indeksų reikšmių įrašyta ranka - sutikrinkite jas su šaltiniu."));
      else if (r.eilutes.length && !r.truksta.length) out.push(P("ok", "Indeksų reikšmės gautos iš Oficialiosios statistikos portalo" + (b.gauta ? " (" + b.gauta + ")" : "") + "."));
      if (b.tiekejoKaina != null && r.nauja != null) {
        if (Math.abs(b.tiekejoKaina - r.nauja) < 0.005) out.push(P("ok", "Apskaičiuota kaina sutampa su kitos Šalies skaičiavimu."));
        else out.push(P("tikrinti", "Apskaičiuota kaina (" + eur(r.nauja) + " Eur) skiriasi nuo kitos Šalies skaičiavimo (" + eur(b.tiekejoKaina) + " Eur) " + eur(Math.abs(r2(b.tiekejoKaina - r.nauja))) + " Eur - išsiaiškinkite prieš pasirašant.", L("tiekejoKaina")));
      }
      if (!b.rastoData) out.push(P("tikrinti", "Neįrašyta kreipimosi dėl kainos perskaičiavimo data - susitarime ji liks tuščia.", L("rastoData")));
      if (b.garantija === "") out.push(P("tikrinti", "Nepasirinkta, ar perskaičiuojamos Sutarties įvykdymo užtikrinimo ir draudimo sumos.", L("garantija")));
    } else if (b.tipas === "sub") {
      var z = forma(s).sub;
      if (!b.pav) out.push(P("klaida", "Įrašykite " + link(z, "k") + " pavadinimą.", L("pav")));
      if (b.veiksmas === "keiciamas" && !b.senas) out.push(P("klaida", "Įrašykite keičiamo " + link(z, "k") + " pavadinimą.", L("senas")));
      if (!b.rastoData) out.push(P("klaida", "Įrašykite " + link(salisT(s), "k") + " rašto datą.", L("rastoData")));
      if (b.punktas) out.push(P("ok", link(z, "kd").charAt(0).toUpperCase() + link(z, "kd").slice(1) + " pasitelkimo tvarka nustatyta " + punktoTekstas(b.dok, b.punktas) + "."));
      else out.push(P("tikrinti", "Nenurodytas Sutarties punktas, kuriame nustatyta " + link(z, "kd") + " pasitelkimo tvarka.", L("punktas")));
      if (b.ivertinta) out.push(P("ok", "Pažymėta, kad " + link(z, "k") + " dokumentai įvertinti ir atitinka pirkimo dokumentų ir Sutarties reikalavimus."));
      else out.push(P("klaida", "Susitarime rašoma, kad " + link(z, "k") + " dokumentai įvertinti. Pažymėkite tai, kai įvertinimas atliktas.", L("ivertinta")));
      if (b.pajegumai === "") out.push(P("tikrinti", "Nepažymėta, ar tiekėjas rėmėsi " + (b.veiksmas === "keiciamas" ? "keičiamo " : "") + link(z, "k") + " pajėgumais kvalifikacijai pagrįsti.", L("pajegumai")));
      else if (b.pajegumai === "taip") out.push(P("tikrinti", "Tiekėjas remiasi šio " + link(z, "k") + " pajėgumais: jis turi atitikti pirkimo dokumentuose nustatytus kvalifikacijos reikalavimus, kuriems pagrįsti pasitelkiamas."));
      out.push(P("info", "Perkantysis subjektas gali patikrinti, ar nėra " + link(z, "k") + " pašalinimo pagrindų (" + cit("subtiekejo_pasalinimo_patikra") + "). Nacionalinio saugumo ir sankcijų patikrą, jei jos reikalauja Sutartis ar vidaus tvarka, atlieka atsakingas padalinys."));
    } else if (b.tipas === "asm") {
      if (!b.kieno) out.push(P("klaida", "Pasirinkite, kurios Šalies atsakingi asmenys keičiami.", L("kieno")));
      if (!b.punktas) out.push(P("klaida", "Nurodykite keičiamą Sutarties punktą.", L("punktas")));
      if (!b.redakcija) out.push(P("klaida", "Įrašykite naują punkto redakciją.", L("redakcija")));
      out.push(P("info", "Patikrinkite, ar Sutartis neleidžia atsakingų asmenų pakeisti rašytiniu pranešimu kitai Šaliai - tada susitarimo nereikia."));
    } else {
      naujuPatikros(b, S, bi, out, L);
    }
    return out;
  }
  /* Esminio pakeitimo klausimai (PĮ 97 str. 4 d.) - kai pagrindas „pakeitimas nėra esminis“. */
  function esmPatikros(b, out, L) {
    var neats = ESM.filter(function (q) { return !b.esm[q[0]]; }), taip = ESM.filter(function (q) { return b.esm[q[0]] === "taip"; });
    if (taip.length) out.push(P("klaida", "Pagal atsakymus pakeitimas esminis (" + cit("keitimas_esminis") + "), todėl šiuo pagrindu jo atlikti negalima: reikia kito įstatyme nurodyto pagrindo arba naujos pirkimo procedūros (" + cit("keitimas_naujas_pirkimas") + ").", L("esm." + taip[0][0])));
    else if (neats.length) out.push(P("klaida", "Atsakykite į esminio pakeitimo klausimus (" + cit("keitimas_esminis") + ") - neatsakyta: " + neats.length + ".", L("esm." + neats[0][0])));
    else out.push(P("ok", "Į visus esminio pakeitimo klausimus atsakyta „Ne“ - pakeitimas laikomas neesminiu (" + cit("keitimas_esminis") + ")."));
  }
  function nebaigtaPatikra(b, out, L) {
    if (b.nebaigta) out.push(P("ok", "Pažymėta, kad Sutartis dar vykdoma: rezultatas galutinai nepriimtas ir galutinė sąskaita neišrašyta."));
    else out.push(P("klaida", "Pažymėkite, kad Sutartis dar vykdoma. Teisingumo Teismas byloje C-820/24 išaiškino, kad sutarties galiojimo laikotarpis nebesitęsia, kai visos paslaugos suteiktos, galutinai priimtos ir išrašyta galutinė sąskaita (net jei kaina dar nesumokėta) - tada keisti Sutarties be naujo pirkimo nebegalima.", L("nebaigta")));
  }
  function naujuPatikros(b, S, bi, out, L) {
    var s = S.sutartis, pagr = blokoPagrindas(b), o = OBJ[objektas(s)][0], vp = punktoTekstas(b.dok, b.punktas);
    if (!pagr) out.push(P("klaida", "Pasirinkite pakeitimo pagrindą.", L("pagrindas")));
    if (b.tipas === "pap" || b.tipas === "ats") {
      if (!b.aprasymas) out.push(P("klaida", "Aprašykite, kokie " + VARDAS[objektas(s)] + " " + (b.tipas === "pap" ? "įsigyjami papildomai" : "atsisakomi") + ".", L("aprasymas")));
      if (b.verte == null) out.push(P("klaida", "Įrašykite vertę be PVM.", L("verte")));
      if (!b.priezastis) out.push(P("klaida", "Įrašykite priežastį - VPT gairėse pabrėžiama, kad sprendimas keisti Sutartį turi būti pagrįstas dokumentais.", L("priezastis")));
      nebaigtaPatikra(b, out, L);
      if (s.data && s.data < "2022-12-13") out.push(P("info", "Sutartis sudaryta iki 2022-12-13 įstatymo pakeitimo. Taikoma redakcija, galiojusi atsiradus poreikiui keisti (" + bylos("e3K-3-26-969/2021") + "); įrankis taiko dabartinę - jei poreikis atsirado anksčiau, galiojo ir bendra visų pakeitimų riba."));
      if (!objektas(s)) out.push(P("klaida", "Pasirinkite Sutarties objektą (1 žingsnis) - nuo jo priklauso ribos ir tekstas.", "s.objektas"));
    }
    if (b.tipas === "pap") {
      var R = skaiciuokPap(b, S, bi), zod = R.patikslinta ? "patikslintos pagal kainų peržiūrą" : "pradinės";
      if (R.bazes == null) out.push(P("klaida", "Įrašykite pradinę Sutarties kainą (1 žingsnis) - nuo jos skaičiuojamos įstatymo ribos.", "s.pradineVerte"));
      if (R.spejama) out.push(P("info", "Kainų peržiūros dalimi laikytas visas ankstesnių pakeitimų su indekso mėnesiu kainos pokytis - jei jie keitė kainą ir kitu pagrindu, 1 žingsnyje įrašykite peržiūros dalį atskirai (" + cit("keitimas_perziureta_verte") + ")."));
      if (pagr === "keitimas_mazos_vertes" && R.bazes != null) {
        var rp = R.ribos.proc, ri = R.ribos.intl;
        if (rp == null || ri == null) out.push(P("klaida", "Ribų patikrinti negalima: pasirinkite Sutarties objektą (1 žingsnis)" + (ri == null && rp != null ? " arba neįkeltos tarptautinio pirkimo vertės ribos" : "") + ".", "s.objektas"));
        else {
          var txt2 = "Visų pakeitimų pagal " + cit(pagr) + " vertė - " + eur(R.viso) + " Eur be PVM (" + proc(R.visoProc) + " % " + zod + " Sutarties vertės; anksčiau - " + eur(R.pries) + " Eur)";
          if (R.visoProc > rp) out.push(P("klaida", txt2 + ", o riba - " + rp + " procentų " + (rp === 15 ? "darbų" : "prekių ar paslaugų") + " pirkimo atveju.", L("verte")));
          else if (R.viso > ri) out.push(P("klaida", txt2 + " viršija tarptautinio pirkimo vertės ribą (" + eur(ri) + " Eur).", L("verte")));
          else out.push(P("ok", txt2 + " - neviršija " + rp + " procentų ir tarptautinio pirkimo vertės ribos (" + eur(ri) + " Eur)."));
          out.push(P("tikrinti", "Kas remiasi šia dalimi, turi įrodyti, kad ribos neviršytos (" + bylos("e3K-3-325-916/2023") + "). Ankstesnių pakeitimų sumą įrankis ima iš 1 žingsnio sąrašo (laukas „Iš jo pagal nedidelės vertės pakeitimų dalį“) - sutikrinkite, ar įrašyti visi. Atsisakomų " + o + " vertė iš papildomų neatimama (" + bylos("eA-227-415/2025") + ")."));
        }
        if (!b.pobudisNesikeicia) out.push(P("klaida", "Pažymėkite, kad pakeitimu iš esmės nepakeičiamas Sutarties pobūdis (perkami tokie pat " + VARDAS[objektas(s)] + ", ne kitokie).", L("pobudisNesikeicia")));
      }
      if ((pagr === "keitimas_papildomi" || pagr === "keitimas_nenumatytos") && R.proc != null) {
        if (R.proc > 50) out.push(P("klaida", "Šio pakeitimo vertė - " + proc(R.proc) + " % " + zod + " Sutarties vertės, o riba - 50 procentų (" + cit(pagr) + ").", L("verte")));
        else out.push(P("ok", "Šio pakeitimo vertė - " + proc(R.proc) + " % " + zod + " Sutarties vertės (riba - 50 procentų atskiram pakeitimui)."));
      }
      if (pagr === "keitimas_papildomi") {
        if (!b.negalimaKeisti) out.push(P("klaida", "Pasirinkite, dėl kokių priežasčių tiekėjo pakeisti negalima (ekonominių ar techninių).", L("negalimaKeisti")));
        if (!b.keitimoPagrindimas) out.push(P("klaida", "Pagrįskite, kodėl tiekėjo pakeisti negalima (pvz. įrangos ar programinės įrangos pakeičiamumas ir sąveikumas).", L("keitimoPagrindimas")));
        if (!b.nepatogumai) out.push(P("klaida", "Turi būti tenkinamos abi sąlygos kartu: tiekėjo pakeitimas sukeltų didelių nepatogumų ar nemažą išlaidų dubliavimą - pažymėkite, jei taip.", L("nepatogumai")));
      }
      if (pagr === "keitimas_nenumatytos") {
        if (!b.aplinkybes) out.push(P("klaida", "Aprašykite aplinkybes, kurių protingas ir apdairus perkantysis subjektas negalėjo numatyti rengdamas pirkimą.", L("aplinkybes")));
        else out.push(P("info", "Reikalavimai, kurie turėjo būti įvertinti rengiant pirkimą (pvz. statybos techninių reglamentų), ir planavimo trūkumai nenumatytomis aplinkybėmis nelaikomi (" + bylos("eA-227-415/2025") + ")."));
        if (!b.suzinota) out.push(P("tikrinti", "Įrašykite, kada aplinkybės paaiškėjo - tai padeda pagrįsti, kad jų nebuvo galima numatyti.", L("suzinota")));
        if (!b.pobudisNesikeicia) out.push(P("klaida", "Pažymėkite, kad pakeitimu iš esmės nepakeičiamas Sutarties pobūdis.", L("pobudisNesikeicia")));
      }
      if (pagr === "perziuros_salygos") {
        if (!b.punktas) out.push(P("klaida", "Nurodykite Sutarties punktą, kuriame numatyta galimybė įsigyti papildomų " + o + ". Jei tokios sąlygos nėra, pasirinkite kitą pagrindą.", L("punktas")));
        else out.push(P("ok", "Galimybė įsigyti papildomų " + o + " numatyta " + vp + "."));
        if (!b.galimybe) out.push(P("tikrinti", "Įrašykite, kokią apimtį ir aplinkybes numato Sutarties sąlyga: VPT gairėse ir " + bylos("e3K-3-349-469/2023") + " nurodoma, kad sąlygoje turi būti apibrėžta pakeitimų apimtis, pobūdis ir aplinkybės, o bendra sąlyga be aplinkybių netinka (" + bylos("eA-227-415/2025") + ").", L("galimybe")));
        if (b.ribaEur != null && b.verte != null && b.verte > b.ribaEur) out.push(P("klaida", "Vertė (" + eur(b.verte) + " Eur) viršija Sutartyje numatytą galimybės ribą (" + eur(b.ribaEur) + " Eur).", L("verte")));
      }
      if (pagr && pagr !== "perziuros_salygos") {
        var pr = s.pirkimoRusis;
        if (!pr) out.push(P("tikrinti", "Pasirinkite, koks buvo pirkimas (1 žingsnis): VPT gairėse nurodoma, kad pakeitimais negalima peržengti pirkimo rūšies ribos (pvz. supaprastinto pirkimo Sutarties vertė su pakeitimais negali pasiekti tarptautinio pirkimo ribos).", "s.pirkimoRusis"));
        else if (R.virsRusies) out.push(P("klaida", "Sutarties vertė su pakeitimais (" + eur(R.suPakeitimais) + " Eur be PVM) pasiekia " + (pr === "mazos" ? "supaprastinto" : "tarptautinio") + " pirkimo ribą (" + eur(R.rusiesRiba) + " Eur). VPT gairėse toks pakeitimas laikomas negalimu - jis apeitų pirkimo tvarką.", "s.pirkimoRusis"));
        else if (R.rusiesRiba != null) out.push(P("ok", "Sutarties vertė su pakeitimais (" + eur(R.suPakeitimais) + " Eur) nepasiekia " + (pr === "mazos" ? "supaprastinto" : "tarptautinio") + " pirkimo ribos (" + eur(R.rusiesRiba) + " Eur)."));
        if (pr === "tarptautinis" && (pagr === "keitimas_papildomi" || pagr === "keitimas_nenumatytos")) out.push(P("info", "Po pakeitimo per 3 darbo dienas reikia paskelbti skelbimą apie Sutarties pakeitimą (" + cit("skelbimas_apie_keitima") + ") - įrašyta „Kas toliau“."));
      }
      if (!b.kainosBudas) out.push(P("tikrinti", "Pasirinkite, kaip nustatyta papildomų " + o + " kaina.", L("kainosBudas")));
      else if (b.kainosBudas === "pasiulymas" && !b.kainosPagrindimas) out.push(P("tikrinti", "Kaina nustatyta pagal kitos Šalies pasiūlymą - įrašykite, kaip ji įvertinta. VPT gairėse rekomenduojama pirmiausia taikyti pasiūlymo įkainius, tada Sutarties panašių darbų įkainius ir tik paskui - pagrįstas išlaidas.", L("kainosPagrindimas")));
      if (b.garantija === "") out.push(P("tikrinti", "Nepasirinkta, ar perskaičiuojamos Sutarties įvykdymo užtikrinimo ir draudimo sumos.", L("garantija")));
    }
    if (b.tipas === "ats") {
      var dab = dabartine(S);
      if (b.poreikis === "kitas") out.push(P("tikrinti", "Darbus atliks kitas tiekėjas. " + bylos("e3K-3-26-969/2021") + ": Sutarties sąlyga atsisakyti siejama su tuo, kad darbų nebereikia apskritai, o ne tik iš šio tiekėjo - pagrįskite, kodėl atsisakoma.", L("poreikis")));
      else if (!b.poreikis) out.push(P("tikrinti", "Pasirinkite, ar šių " + o + " nebereikia apskritai, ar juos atliks kitas tiekėjas.", L("poreikis")));
      if (b.verte != null && dab != null && b.verte > dab) out.push(P("klaida", "Atsisakomų " + o + " vertė didesnė už dabartinę Sutarties kainą.", L("verte")));
      if (pagr === "perziuros_salygos") {
        if (!b.punktas) out.push(P("klaida", "Nurodykite Sutarties punktą, kuriame numatyta galimybė atsisakyti dalies " + o + ".", L("punktas")));
        if (!b.galimybe) out.push(P("tikrinti", "Įrašykite, kokią apimtį ir aplinkybes numato Sutarties sąlyga. VPT gairėse vien galimybė „atsisakyti dalies darbų“ be apimties ir aplinkybių laikoma nepakankama, o " + bylos("e3K-3-245-916/2023") + " - ir sąmatoje išvardyti galimai nereikalingi darbai.", L("galimybe")));
      }
      if (pagr === "keitimas_neesminis") esmPatikros(b, out, L);
      if (!b.vertesBudas) out.push(P("tikrinti", "Pasirinkite, kaip apskaičiuota atsisakomų " + o + " vertė.", L("vertesBudas")));
      else if (b.vertesBudas === "kitaip") out.push(P("tikrinti", "VPT gairėse esminiu pakeitimu laikomas darbų atsisakymas mažesniais nei Sutartyje nustatyti įkainiai - vertę skaičiuokite pagal Sutarties įkainius ar sąmatas.", L("vertesBudas")));
      else out.push(P("ok", "Vertė apskaičiuota pagal Sutarties " + (b.vertesBudas === "ikainiai" ? "įkainius" : "sąmatas") + "."));
    }
    if (b.tipas === "ter") {
      var T = skaiciuokTer(b);
      if (!b.kas) out.push(P("klaida", "Pasirinkite, kuris terminas pratęsiamas.", L("kas")));
      if (!b.dabartinis || !b.naujas) out.push(P("klaida", "Įrašykite dabartinę termino pabaigą ir naują datą.", L(!b.dabartinis ? "dabartinis" : "naujas")));
      else if (T.dienu <= 0) out.push(P("klaida", "Nauja data turi būti vėlesnė už dabartinę termino pabaigą.", L("naujas")));
      if (!b.priezastis) out.push(P("klaida", "Įrašykite pratęsimo priežastis ir jų eigą.", L("priezastis")));
      if (pagr === "perziuros_salygos") {
        if (!b.punktas) out.push(P("klaida", "Nurodykite Sutarties punktą, kuriame numatytas termino pratęsimas.", L("punktas")));
        if (!b.aplinkybe) out.push(P("tikrinti", "Įrašykite, kuri Sutartyje numatyta aplinkybė yra pratęsimo pagrindas.", L("aplinkybe")));
        if (b.maxPrat == null) out.push(P("tikrinti", "Įrašykite, kiek ilgiausiai Sutartis leidžia pratęsti terminą - VPT gairėse rekomenduojama nustatyti konkretų laikotarpį.", L("maxPrat")));
        else if (T.virsija) out.push(P("klaida", "Nauja data (" + b.naujas + ") vėlesnė už Sutartyje leidžiamą (" + T.riba + ") - įvertinus ankstesnius pratęsimus pagal šį punktą.", L("naujas")));
        else if (T.riba) out.push(P("ok", "Pratęsimas telpa į Sutartyje leidžiamą laikotarpį (iki " + T.riba + ")."));
      }
      if (pagr === "keitimas_neesminis") esmPatikros(b, out, L);
      if (b.kas !== "galiojimo" && s.galiojaIki && b.naujas && b.naujas > s.galiojaIki) out.push(P("tikrinti", "Nauja data vėlesnė už Sutarties galiojimo pabaigą (" + s.galiojaIki + "). VPT gairėse primenama, kad galiojimo terminas turi apimti įsipareigojimų įvykdymo terminą - įvertinkite, ar reikia pratęsti ir galiojimą."));
      if (!b.kainaNesikeicia) out.push(P("tikrinti", "Patvirtinkite, kad pratęsimas nekeičia Sutarties kainos. Jei keičia - tai atskiras pakeitimas su savo pagrindu.", L("kainaNesikeicia")));
      if (b.garantija === "") out.push(P("tikrinti", "Pasirinkite, ar Sutarties įvykdymo užtikrinimas ir draudimas galios pratęstu terminu. " + bylos("eA-227-415/2025") + ": pratęsus terminą nepratęstas užtikrinimas ir draudimas pakeitė pusiausvyrą rangovo naudai; bylose eA-636-821/2026 ir eA-570-556/2026 Sutarties vykdymas be galiojančio užtikrinimo vertintas kaip pažeidimas.", L("garantija")));
      if (b.vertinimoKriterijus === "taip") out.push(P("tikrinti", "Terminas buvo pasiūlymų vertinimo kriterijus. " + bylos("e3K-3-220-969/2020") + ": toks pratęsimas iškreipė ekonominę pusiausvyrą rangovo naudai. Pagrįskite, kad pratęsiama dėl aplinkybių, už kurias kita Šalis neatsako, ir tik tiek, kiek jos lėmė vėlavimą.", L("vertinimoKriterijus")));
      else if (!b.vertinimoKriterijus) out.push(P("tikrinti", "Pasirinkite, ar terminas buvo pasiūlymų vertinimo kriterijus.", L("vertinimoKriterijus")));
      if (!b.rastoData) out.push(P("tikrinti", "Neįrašyta kreipimosi data - susitarime ji liks tuščia.", L("rastoData")));
    }
    if (b.tipas === "kit") {
      if (b.kas === "punktas" && !b.punktas) out.push(P("klaida", "Nurodykite keičiamą Sutarties punktą.", L("punktas")));
      if (b.kas === "punktas" && !b.redakcija) out.push(P("klaida", "Įrašykite naują punkto redakciją.", L("redakcija")));
      if (b.kas === "priedas" && !b.priedoNr) out.push(P("klaida", "Nurodykite keičiamo Sutarties priedo numerį.", L("priedoNr")));
      if (!b.priezastis) out.push(P("klaida", "Įrašykite, kodėl Sutarties sąlyga keičiama.", L("priezastis")));
      if (pagr === "perziuros_salygos" && !b.salygosPunktas) out.push(P("klaida", "Nurodykite Sutarties punktą, kuriame toks pakeitimas iš anksto numatytas.", L("salygosPunktas")));
      if (pagr === "keitimas_neesminis") esmPatikros(b, out, L);
      if (!b.kainaNesikeicia) out.push(P("tikrinti", "Patvirtinkite, kad pakeitimas nekeičia Sutarties kainos ir terminų. Jei keičia - pasirinkite atitinkamą pakeitimo rūšį.", L("kainaNesikeicia")));
    }
  }
  function patikros(S) {
    var s = S.sutartis, r = S.rengiamas, out = [];
    [["nr", "Sutarties numeris"], ["data", "Sutarties sudarymo data"], ["pavadinimasKilm", "Sutarties pavadinimas"], ["pirkejoPav", "pirkimo vykdytojo pavadinimas"], ["tiekejoPav", "kitos Šalies pavadinimas"]].forEach(function (x) {
      if (!s[x[0]]) out.push(P("klaida", "Neįrašyta: " + x[1] + " (1 žingsnis).", "s." + x[0]));
    });
    if (s.pavadinimasKilm && !/sutarties$/i.test(s.pavadinimasKilm)) out.push(P("tikrinti", "Sutarties pavadinimas turėtų būti kilmininku ir baigtis žodžiu „sutarties“ (pvz. „... eksploatavimo darbų pirkimo sutarties“) - kitaip antraštė ir pirmas punktas skambės netaisyklingai.", "s.pavadinimasKilm"));
    if (!s.tiekejoKodas) out.push(P("tikrinti", "Neįrašytas kitos Šalies juridinio asmens kodas - susitarime jis liks tuščias.", "s.tiekejoKodas"));
    if (!s.tiekejoAdresas) out.push(P("tikrinti", "Neįrašyta kitos Šalies buveinė - susitarime ji liks tuščia.", "s.tiekejoAdresas"));
    if (!r.blokai.length) out.push(P("klaida", "Nepridėtas nė vienas pakeitimas (2 žingsnis)."));
    var nr = parseInt(r.nr, 10);
    if (!r.nr) out.push(P("klaida", "Neįrašytas susitarimo eilės numeris.", "r.nr"));
    else if (nr > 1 && S.ankstesni.length < nr - 1) out.push(P("tikrinti", "Tai susitarimas Nr. " + r.nr + ", bet ankstesnių pakeitimų sąraše - " + S.ankstesni.length + ". Ankstesni susitarimai išvardijami preambulėje pagal sąrašą (1 žingsnis).", "r.nr"));
    else if (nr >= 1 && S.ankstesni.length >= nr) out.push(P("tikrinti", "Ankstesnių pakeitimų sąraše jau yra " + S.ankstesni.length + " - patikrinkite susitarimo eilės numerį.", "r.nr"));
    S.ankstesni.forEach(function (a, i) { if (!a.data || !a.esme) out.push(P("tikrinti", "Ankstesnio pakeitimo (" + (i + 1) + " eilutė) data ar esmė neįrašyta - preambulėje jis bus paminėtas nepilnai.", "a" + i)); });
    r.blokai.forEach(function (b, i) { blokoPatikros(b, S, i).forEach(function (p) { if (p.lygis !== "ok") { p.blokas = i; out.push(p); } }); });
    var ind = r.blokai.filter(function (b) { return b.tipas === "ind"; }).length;
    if (ind > 1) out.push(P("klaida", "Viename susitarime gali būti tik vienas kainos perskaičiavimas pagal indeksą."));
    return out;
  }
  function kliuciu(S) { return patikros(S).filter(function (p) { return p.lygis === "klaida"; }).length; }

  /* ---------- sutarties kaina po šio susitarimo ---------- */
  /* Kaina po susitarimo = kaina iki jo + perskaičiavimo pagal indeksą skirtumas + papildomi - atsisakomi darbai (paslaugos, prekės). */
  function rezultatas(S) {
    var sena = dabartine(S), ind = null, pap = 0, ats = 0, papAts = false, trukst = false;
    S.rengiamas.blokai.forEach(function (b) {
      if (b.tipas === "ind" && !ind) ind = skaiciuokInd(b, S);
      if (b.tipas === "pap" || b.tipas === "ats") { papAts = true; if (b.verte == null) trukst = true; else if (b.tipas === "pap") pap += b.verte; else ats += b.verte; }
    });
    var delta = r2(pap - ats), indNauja = ind ? ind.nauja : sena, pr = S.sutartis.pradineVerte;
    /* Peržiūros sąlyga (riba ar trumpiausias laikotarpis) pagal įrašytą taisyklę neįvykdyta: kaina neperskaičiuojama, skaičiavimas lieka tik palyginimui. */
    var nev = !!(ind && ((ind.slenkstis && ind.slenkstis.pasiektas === false) || (ind.laikotarpis && ind.laikotarpis.tinka === false)));
    var nauja = indNauja == null || trukst ? (papAts ? null : indNauja) : r2(indNauja + delta);
    var galutine = nev ? (sena == null || trukst ? null : r2(sena + delta)) : nauja;
    var indPok = ind && !nev && ind.pokytisEur != null ? ind.pokytisEur : 0;
    return { pradine: pr, sena: sena, nauja: nauja, galutine: galutine, keiciasi: !!ind || papAts, nevykdyta: nev, papildomi: r2(pap), atsisakomi: r2(ats), delta: delta,
      pokytis: galutine != null && sena != null ? r2(galutine - sena) : (ind && ind.pokytisEur != null ? ind.pokytisEur : 0), perziura: r2(indPok),
      nuoPradines: pr && galutine != null ? (galutine - pr) / pr * 100 : null, pvm: suPvm(galutine), ind: ind };
  }

  /* ---------- dokumentų turinys ---------- */
  var RAIDES = "abcdefghijklmnoprstuvz";
  function rastoTekstas(b, kas) { return (b.rastoData ? dataZ(b.rastoData) : "20__ m. ____________ d.") + " raštu" + (b.rastoNr ? " Nr. " + b.rastoNr : "") + (b.rastoPav ? " „" + b.rastoPav + "“" : ""); }
  function priedoRastas(b, salis) { return link(salis, "k") + " " + (b.rastoData ? dataZ(b.rastoData) : "20__ m. ____________ d.") + " raštas" + (b.rastoNr ? " Nr. " + b.rastoNr : "") + (b.rastoPav ? " „" + b.rastoPav + "“" : ""); }
  function salisSuRekv(pav, toliau, kodas, adresas, puse) {
    return (pav || "__________") + " (toliau - „" + toliau + "“), pagal Lietuvos Respublikos įstatymus įsteigta ir veikianti įmonė, juridinio asmens kodas " + (kodas || "__________") +
      ", kurios registruota buveinė yra " + (adresas || "______________________") + ", duomenys apie bendrovę kaupiami ir saugomi Lietuvos Respublikos juridinių asmenų registre, atstovaujama ______________________, " + puse;
  }
  /* Indekso pavadinimas kilmininku sakiniui „... reikšmė“: „... kainų indeksas „X““ -> „... kainų indekso „X““; kitaip - „indekso „pavadinimas““. */
  function indKilm(pav) {
    pav = String(pav || "");
    if (!pav) return "Indekso";
    if (/(^|\s)indeksas(?=\s|$)/i.test(pav)) return pav.replace(/(^|\s)(i|I)ndeksas(?=\s|$)/, "$1$2ndekso");
    return "Indekso „" + pav.replace(/[„“\u201D"]/g, "") + "“";
  }
  /* Neesminio pakeitimo santrauka preambulei - tik kai į visus klausimus atsakyta „Ne“. */
  function esmVisiNe(b) { return !!b.esm && ESM.every(function (q) { return b.esm[q[0]] === "ne"; }); }
  function esmSakinys(Tk) {
    return "pakeitimas nėra esminis: juo nekeičiamas Sutarties bendrasis pobūdis, nenustatoma sąlyga, kuri pradiniame pirkime būtų leidusi priimti kitų dalyvių pasiūlymus ar sudominusi daugiau tiekėjų, ekonominė Sutarties pusiausvyra nepasikeičia " +
      link(Tk, "k") + " naudai, labai nepadidėja Sutarties apimtis ir " + Tk + " nekeičiamas nauju tiekėju";
  }
  function be(t) { return String(t || "").replace(/[\s.;,]+$/, ""); }
  var VARDAS = { darbai: "darbai", paslaugos: "paslaugos", prekes: "prekės", "": "darbai (paslaugos, prekės)" };
  var GAL = { darbai: "Darbus", paslaugos: "Paslaugas", prekes: "Prekes", "": "įsipareigojimus" };
  var VEIKS = { darbai: ["atlikti papildomus Darbus", "neatlieka šių Darbų"], paslaugos: ["suteikti papildomas Paslaugas", "neteikia šių Paslaugų"],
    prekes: ["pristatyti papildomas Prekes", "nepristato šių Prekių"], "": ["įvykdyti papildomus įsipareigojimus", "nevykdo šių įsipareigojimų"] };
  function naujiTekstai(b, S, c) {
    var pre = c.pre, punktai = c.punktai, Pk = c.Pk, Tk = c.Tk, O = c.O, pg = blokoPagrindas(b), vp = punktoTekstas(b.dok, b.punktas);
    var kas = b.iniciatorius === "pirkejas" ? Pk : Tk, kam = b.iniciatorius === "pirkejas" ? Tk : Pk;
    if (b.tipas === "pap" || b.tipas === "ats") {
      var pap = b.tipas === "pap";
      pre.push(kas + " " + rastoTekstas(b) + " kreipėsi į " + link(kam, "g") + " dėl " + (pap ? "papildomų " + O[0] + " poreikio" : "dalies " + O[0] + " atsisakymo"));
      if (b.priezastis) pre.push(be(b.priezastis));
      if (pg === "perziuros_salygos") pre.push((vp || "Sutartyje") + " numatyta galimybė " + (pap ? "įsigyti papildomų " + O[0] : "atsisakyti dalies " + O[0]) + (b.galimybe ? " (" + be(b.galimybe) + ")" : ""));
      if (pap && pg === "keitimas_papildomi") pre.push(link(Tk, "k") + " pakeitimas kitu tiekėju negalimas dėl " + (b.negalimaKeisti === "abi" ? "ekonominių ir techninių" : b.negalimaKeisti === "technines" ? "techninių" : "ekonominių") +
        " priežasčių" + (b.keitimoPagrindimas ? " (" + be(b.keitimoPagrindimas) + ")" : "") + " ir sukeltų didelių nepatogumų ar nemažą išlaidų dubliavimą");
      if (pap && pg === "keitimas_nenumatytos") pre.push((b.aplinkybes ? be(b.aplinkybes) + " - šių aplinkybių" : "Pakeitimo būtinybė atsirado dėl aplinkybių, kurių") + " protingas ir apdairus " + Pk + " negalėjo numatyti rengdamas pirkimą, o pakeitimu iš esmės nepakeičiamas Sutarties pobūdis");
      if (pap && (pg === "keitimas_papildomi" || pg === "keitimas_nenumatytos") && b.verte != null) {
        var R = skaiciuokPap(b, S, c.bi);
        if (R.proc != null) pre.push("šio pakeitimo vertė - " + eur(b.verte) + " Eur be PVM, t. y. " + proc(R.proc) + " % " + (R.patikslinta ? "patikslintos" : "pradinės") + " Sutarties vertės");
      }
      if (pap && pg === "keitimas_mazos_vertes" && b.verte != null) {
        var R2 = skaiciuokPap(b, S, c.bi);
        if (R2.visoProc != null) pre.push("bendra Sutarties pakeitimų pagal " + cit(pg) + " vertė, įskaitant šį pakeitimą, yra " + eur(R2.viso) + " Eur be PVM, t. y. " + proc(R2.visoProc) + " % " + (R2.patikslinta ? "patikslintos" : "pradinės") +
          " Sutarties vertės, o pakeitimu iš esmės nepakeičiamas Sutarties pobūdis");
      }
      if (!pap && pg === "keitimas_neesminis" && esmVisiNe(b)) pre.push(esmSakinys(Tk));
      if (pap) {
        if (b.kainosBudas) pre.push("papildomų " + O[0] + " kaina apskaičiuota " + (b.kainosBudas === "ikainiai" ? "pagal Sutartyje nustatytus įkainius" : b.kainosBudas === "tvarka" ? "Sutartyje nustatyta kainos nustatymo tvarka" : "pagal " + link(Tk, "k") + " pasiūlymą" + (b.kainosPagrindimas ? " (" + be(b.kainosPagrindimas) + ")" : "")));
        punktai.push({ tekstas: Tk + " įsipareigoja " + VEIKS[c.o][0] + ": " + (be(b.aprasymas) || "__________") + " (vertė - " + (b.verte != null ? eur(b.verte) : "__________") + " Eur be PVM)" + (b.atlikimoTerminas ? "; terminas - " + be(b.atlikimoTerminas) : "") + "." });
        if (b.samata) punktai.push({ tekstas: "Papildomų " + O[0] + " sąrašas ir kainos apskaičiavimas pateikti Susitarimo " + c.priedas("Papildomų " + O[0] + " sąrašas ir kainos apskaičiavimas") + " priede." });
      } else {
        punktai.push({ tekstas: "Šalys susitaria, kad " + Tk + " " + VEIKS[c.o][1] + ": " + (be(b.aprasymas) || "__________") + " (vertė" + (b.vertesBudas === "ikainiai" ? " pagal Sutarties įkainius" : b.vertesBudas === "samatos" ? " pagal Sutarties sąmatas" : "") +
          " - " + (b.verte != null ? eur(b.verte) : "__________") + " Eur be PVM)." });
        if (b.samata) punktai.push({ tekstas: "Atsisakomų " + O[0] + " sąrašas ir vertės apskaičiavimas pateikti Susitarimo " + c.priedas("Atsisakomų " + O[0] + " sąrašas ir vertės apskaičiavimas") + " priede." });
      }
      if (b.rastoData || b.rastoNr) c.priedas(priedoRastas(b, kas));
    } else if (b.tipas === "ter") {
      var T = TERMINAI[b.kas] || ["terminą", "termino"];
      pre.push(kas + " " + rastoTekstas(b) + " kreipėsi į " + link(kam, "g") + " dėl " + T[1] + " pratęsimo");
      if (b.priezastis) pre.push(be(b.priezastis));
      if (pg === "perziuros_salygos") pre.push((vp || "Sutartyje") + " numatyta galimybė pratęsti " + T[0] + (b.aplinkybe ? ", kai " + be(b.aplinkybe) : ""));
      if (pg === "keitimas_neesminis" && esmVisiNe(b)) pre.push(esmSakinys(Tk));
      punktai.push({ tekstas: "Pratęsti " + (vp ? vp + " nurodytą " : "") + T[0] + " iki " + (b.naujas ? dataZ(b.naujas) : "20__ m. ____________ d.") + (b.dabartinis ? " (iki šiol - " + dataZ(b.dabartinis) + ")" : "") + "." });
      if (b.grafikas) punktai.push({ tekstas: "Atnaujintas Sutarties vykdymo grafikas pateiktas Susitarimo " + c.priedas("Atnaujintas Sutarties vykdymo grafikas") + " priede." });
      if (b.rastoData || b.rastoNr) c.priedas(priedoRastas(b, kas));
    } else {
      if (b.priezastis) pre.push(be(b.priezastis));
      var sp = punktoTekstas(b.salygosDok, b.salygosPunktas);
      if (pg === "perziuros_salygos") pre.push((sp || "Sutartyje") + " numatyta tokio pakeitimo galimybė" + (b.galimybe ? " (" + be(b.galimybe) + ")" : ""));
      if (pg === "keitimas_neesminis" && esmVisiNe(b)) pre.push(esmSakinys(Tk));
      if (b.kas === "priedas") {
        var pr = "Sutarties " + (b.priedoNr || "___") + " priedą" + (b.priedoPav ? " „" + b.priedoPav + "“" : "");
        punktai.push({ tekstas: "Pakeisti " + pr + " ir išdėstyti jį nauja redakcija (Susitarimo " + c.priedas("Sutarties " + (b.priedoNr || "___") + " priedas" + (b.priedoPav ? " „" + b.priedoPav + "“" : "") + " (nauja redakcija)") + " priedas)." });
      } else {
        punktai.push({ tekstas: "Pakeisti " + (vp ? vp.replace(/punkte$/, "punktą") : "Sutarties ____ punktą") + " ir išdėstyti jį taip:", citata: (b.redakcija || "__________").split(/\n+/) });
      }
    }
  }
  function susitarimas(S) {
    var s = S.sutartis, r = S.rengiamas, Pk = salisP(s), Tk = salisT(s), B = [], pre = [], punktai = [], priedai = [];
    var sutG = /sutarties$/i.test(s.pavadinimasKilm) ? s.pavadinimasKilm.replace(/sutarties$/i, "sutartį") : "sutartį" + (s.pavadinimasKilm ? " „" + s.pavadinimasKilm + "“" : "");
    function priedas(pav) { priedai.push(pav); return priedai.length; }

    B.push({ t: "antraste", tekstas: "SUSITARIMAS NR. " + (r.nr || "___") });
    B.push({ t: "antraste", tekstas: "DĖL " + (dataZ(s.data) || "20__ m. ____________ d.").toUpperCase() + " " + didz(s.pavadinimasKilm || "__________ sutarties") + " NR. " + (s.nr || "__________") + " PAKEITIMO" });
    B.push({ t: "centras", tekstas: (r.data ? dataZ(r.data) : "20__ m. ____________ d.") + " Nr. " + (r.regNr || "__________") });
    B.push({ t: "centras", tekstas: r.vieta || "Vilnius" });
    B.push({ t: "p", tekstas: salisSuRekv(s.pirkejoPav, Pk, s.pirkejoKodas, s.pirkejoAdresas, "iš vienos pusės, ir") });
    B.push({ t: "p", tekstas: salisSuRekv(s.tiekejoPav, Tk, s.tiekejoKodas, s.tiekejoAdresas, "iš kitos pusės,") });
    B.push({ t: "p", tekstas: "toliau " + Pk + " ir " + Tk + " kartu vadinami Šalimis, o kiekvienas atskirai - Šalimi," });
    B.push({ t: "p", tekstas: "ATSIŽVELGDAMOS Į TAI, KAD:", pusjuodis: true });

    pre.push("Šalys " + (dataZ(s.data) || "20__ m. ____________ d.") + " sudarė " + sutG + " Nr. " + (s.nr || "__________") + " (toliau - Sutartis)");
    if (S.ankstesni.length) {
      pre.push("Sutartis buvo pakeista: " + S.ankstesni.map(function (a, i) {
        return (a.data ? dataZ(a.data) : "20__ m. ____________ d.") + " susitarimu" + (a.nr ? " Nr. " + a.nr : "") + (a.regNr ? " (registracijos Nr. " + a.regNr + ")" : "") + (a.esme ? " dėl " + a.esme : "");
      }).join("; "));
    }
    var pagr = [], Rz = rezultatas(S), papAts = r.blokai.some(function (x) { return x.tipas === "pap" || x.tipas === "ats"; }), kainosVieta = null, gar = { sumos: false, terminas: false };
    var o = objektas(s), O = OBJ[o];
    r.blokai.forEach(function (b, bi) {
      var pg = blokoPagrindas(b);
      if (pg && pagr.indexOf(pg) < 0) pagr.push(pg);
      if (!kainosVieta && b.kainosPunktas && (b.tipas === "ind" || b.tipas === "pap" || b.tipas === "ats")) kainosVieta = punktoTekstas(b.kainosDok, b.kainosPunktas, "punkte");
      if (b.garantija === "taip") { if (b.tipas === "ter") gar.terminas = true; else gar.sumos = true; }
      if (b.tipas === "ind") {
        var R = skaiciuokInd(b, S), t = b.taisykle, kas = b.iniciatorius === "pirkejas" ? Pk : Tk, kam = b.iniciatorius === "pirkejas" ? Tk : Pk, vp = punktoTekstas(b.dok, b.punktas);
        pre.push(kas + " " + rastoTekstas(b) + " kreipėsi į " + link(kam, "g") + " dėl Sutarties kainos perskaičiavimo" +
          (b.aktas === "taip" ? " ir pateikė perskaičiavimo aktą" + (b.aktoData ? " (" + dataZ(b.aktoData) + ")" : "") : ""));
        pre.push((vp || "Sutartyje") + " nustatytos Sutarties kainos peržiūros dėl kainų indekso pokyčio sąlygos ir tvarka");
        if (R.slenkstis) pre.push(R.slenkstis.pav + " per laikotarpį nuo " + menZ(b.pradzia) + " iki " + menZ(b.pabaiga) + " pakito " + proc(R.slenkstis.pokytis) + " %" +
          (R.slenkstis.reikia != null ? ", o Sutartyje nustatyta riba - " + (t.grieztas ? "daugiau kaip " : "ne mažiau kaip ") + proc(R.slenkstis.reikia, 2) + " %" : ""));
        pre.push("Sutarties dalies, kuriai taikomas perskaičiavimas, vertė yra " + eur(R.perskaiciuojama) + " Eur be PVM");
        var visiOsp = b.eilutes.every(function (e) { return !!e.indeksas; });
        punktai.push({ tekstas: "Perskaičiuoti Sutarties kainą " + (vp ? vp + " nustatyta tvarka" : "Sutartyje nustatyta tvarka") + ", naudojant šias " +
            (visiOsp ? "Valstybės duomenų agentūros Oficialiosios statistikos portale skelbiamų indeksų reikšmes:" : "indeksų reikšmes:"),
          sarasas: [].concat.apply([], R.eilutes.map(function (e) {
            var be = b.eilutes[e.i], sal = !be.indeksas && be.saltinis ? " (šaltinis - " + be.saltinis + ")" : "", o = [];
            o.push(indKilm(e.pav) + sal + " reikšmė laikotarpio pradžioje (" + menZ(b.pradzia) + ") - " + fiks(e.pr, 4));
            o.push(indKilm(e.pav) + " reikšmė laikotarpio pabaigoje (" + menZ(b.pabaiga) + ") - " + fiks(e.pb, 4));
            o.push(indKilm(e.pav) + " pokytis - " + proc(e.pokytis) + " %" + (e.taikoma || e.suSuma ?
              (t.formule === "proc" ? ", perskaičiavimui taikomas kainų pokytis k = " + kTekstas(e.K, t) : ", pokyčio koeficientas K = " + kTekstas(e.K, t)) + (e.taikoma ? ", taikomas " + e.taikoma : "") : ""));
            return o;
          })) });
        var pv = R.pvm, kp = punktoTekstas(b.kainosDok, b.kainosPunktas, "punkte");
        /* Kai keičiama ir apimtis, kainos punktas vienas - po visų pakeitimų. */
        if (!papAts) punktai.push({ tekstas: (kp ? "Pakeisti " + kp + " nurodytą Sutarties kainą ir nustatyti" : "Nustatyti") + ", kad perskaičiuota Sutarties kaina yra " + eur(R.nauja) + " Eur be PVM" +
          (pv ? ", PVM - " + eur(pv.pvm) + " Eur, iš viso - " + eur(pv.viso) + " Eur su PVM." : ".") });
        priedas(priedoRastas(b, kas));
        if (b.aktas === "taip") priedas("Perskaičiavimo aktas");
        if (b.skaiciavimoPriedas) priedas("Sutarties kainos perskaičiavimo skaičiavimas");
        if (b.ikainiuPriedas) punktai.push({ tekstas: "Perskaičiuoti įkainiai nurodyti šio Susitarimo " + priedas("Perskaičiuoti įkainiai") + " priede." });
        if (b.taikymas) punktai.push({ tekstas: b.taikymas });
      } else if (b.tipas === "pap" || b.tipas === "ats" || b.tipas === "ter" || b.tipas === "kit") {
        naujiTekstai(b, S, { pre: pre, punktai: punktai, priedas: priedas, Pk: Pk, Tk: Tk, O: O, o: o, bi: bi });
      } else if (b.tipas === "sub") {
        var z = forma(s).sub, vard = (b.pav || "__________") + (b.kodas ? " (juridinio asmens kodas " + b.kodas + ")" : ""), spk = punktoTekstas(b.dok, b.punktas);
        pre.push(Tk + " " + rastoTekstas(b) + " kreipėsi į " + link(Pk, "g") + ", prašydamas leisti " +
          (b.veiksmas === "keiciamas" ? link(z, "g") + " " + (b.senas || "__________") + " pakeisti " + link(z, "i") + " " + vard : "pasitelkti naują " + link(z, "g") + " " + vard) +
          (b.darbai ? " ir perduoti jam " + b.darbai : ""));
        if (spk) pre.push(spk + " nustatyta " + link(z, "kd") + " pasitelkimo ir keitimo tvarka");
        if (b.ivertinta) pre.push(Pk + ", įvertinęs " + link(Tk, "k") + " pateiktus " + link(z, "k") + " " + (b.pav || "__________") + " dokumentus, nustatė, kad jie atitinka pirkimo dokumentų ir Sutarties reikalavimus");
        var prd = b.priedoNr ? "Sutarties " + b.priedoNr + " priedą" + (b.priedoPav ? " „" + b.priedoPav + "“" : "") : "";
        punktai.push({ tekstas: prd ? "Pakeisti " + prd + (b.veiksmas === "keiciamas" ? ", vietoje " + link(z, "k") + " " + (b.senas || "__________") + " įrašant " + link(z, "g") + " " + (b.pav || "__________") + "." : ", į jį įtraukiant " + link(z, "g") + " " + (b.pav || "__________") + ".")
          : Pk + " sutinka, kad " + Tk + " Sutarčiai vykdyti " + (b.veiksmas === "keiciamas" ? "vietoje " + link(z, "k") + " " + (b.senas || "__________") + " " : "") + "pasitelktų " + link(z, "g") + " " + (b.pav || "__________") + "." });
        punktai.push({ tekstas: Tk + " užtikrina ir atsako už " + link(z, "n") + " " + (b.pav || "__________") + " perduotų įsipareigojimų tinkamą įvykdymą." });
        priedas(priedoRastas(b, Tk) + " su priedais");
        if (b.priedoNr) priedas("Sutarties " + b.priedoNr + " priedas" + (b.priedoPav ? " „" + b.priedoPav + "“" : "") + " (nauja redakcija)");
      } else {
        var kn = b.kieno === "pirkejo" ? link(Pk, "k") : b.kieno === "tiekejo" ? link(Tk, "k") : "Šalių", apk = punktoTekstas(b.dok, b.punktas);
        pre.push((b.priezastis ? b.priezastis.replace(/[.;,]+$/, "") + ", todėl keičiami " : "pasikeitė ") + kn + " atsakingi asmenys, nurodyti " + (apk || "Sutartyje"));
        punktai.push({ tekstas: "Pakeisti " + (apk ? apk.replace(/punkte$/, "punktą") : "Sutarties ____ punktą") + " ir išdėstyti jį taip:", citata: (b.redakcija || "__________").split(/\n+/) });
      }
    });
    if (papAts) {
      var pv2 = Rz.pvm;
      punktai.push({ tekstas: (kainosVieta ? "Pakeisti " + kainosVieta + " nurodytą Sutarties kainą ir nustatyti" : "Nustatyti") + ", kad Sutarties kaina " +
        (Rz.ind ? "po perskaičiavimo ir " : "") + (Rz.papildomi && Rz.atsisakomi ? "įvertinus papildomus ir atsisakomus " : Rz.papildomi ? "įvertinus papildomus " : "įvertinus atsisakomus ") + GAL[o] + " yra " +
        (Rz.galutine != null ? eur(Rz.galutine) : "__________") + " Eur be PVM" + (pv2 ? ", PVM - " + eur(pv2.pvm) + " Eur, iš viso - " + eur(pv2.viso) + " Eur su PVM." : ".") });
    } else if (!Rz.ind && r.blokai.some(function (x) { return (x.tipas === "ter" || x.tipas === "kit") && x.kainaNesikeicia; })) {
      punktai.push({ tekstas: "Susitarimu Sutarties kaina nekeičiama." });
    }
    if (gar.sumos || gar.terminas) punktai.push({ tekstas: Tk + " ne vėliau kaip per 10 darbo dienų nuo Susitarimo pasirašymo " +
      (gar.sumos && gar.terminas ? "perskaičiuoja Sutarties įvykdymo užtikrinimo ir draudimo sumas, pratęsia jų galiojimą" : gar.sumos ? "perskaičiuoja Sutarties įvykdymo užtikrinimo ir draudimo sumas" : "pratęsia Sutarties įvykdymo užtikrinimo ir draudimo galiojimą pagal pratęstą terminą") +
      " ir pateikia " + link(Pk, "n") + " tai patvirtinančius dokumentus." });
    pagr.forEach(function (k) { pre.push("vadovaujantis " + ilgas(k) + ", " + PAGRINDAI[k].sakinys); });
    pre.forEach(function (x, i) { B.push({ t: "raide", zyme: RAIDES.charAt(i) + ")", tekstas: x + (i === pre.length - 1 ? "," : ";") }); });
    B.push({ t: "p", tekstas: "Šalys sudarė šį susitarimą dėl Sutarties pakeitimo (toliau - Susitarimas), kuriuo susitarė:" });

    var n = 0;
    function punktas(o) {
      n++;
      B.push({ t: "punktas", nr: n + ".", tekstas: o.tekstas });
      (o.sarasas || []).forEach(function (x, i, a) { B.push({ t: "bruksnys", tekstas: x + (i === a.length - 1 ? "." : ";") }); });
      (o.citata || []).forEach(function (x, i, a) { B.push({ t: "citata", tekstas: (i === 0 ? "„" : "") + x + (i === a.length - 1 ? "“." : "") }); });
    }
    punktai.forEach(punktas);
    punktas({ tekstas: "Kitos Sutarties sąlygos nekeičiamos ir lieka galioti visa apimtimi." });
    punktas({ tekstas: "Visus Šalių tarpusavio santykius, atsirandančius iš Susitarimo ir neaptartus jo sąlygose, reglamentuoja Sutartis ir Lietuvos Respublikos teisės aktai." });
    punktas({ tekstas: "Susitarimas įsigalioja nuo jo sudarymo momento ir tampa neatskiriama Sutarties dalimi." });
    punktas({ tekstas: "Susitarimas pasirašytas Šalių kvalifikuotais elektroniniais parašais." });
    if (priedai.length) {
      punktas({ tekstas: "Susitarimo priedai yra neatskiriama šio Susitarimo dalis. Prie Susitarimo pridedama:" });
      priedai.forEach(function (x, i) { B.push({ t: "papunktis", nr: n + "." + (i + 1) + ".", tekstas: (i + 1) + " priedas. " + x + "." }); });
    }
    B.push({ t: "parasai", kaire: link(Pk, "k") + " vardu:", desine: link(Tk, "k") + " vardu:" });
    return { pavadinimas: "Susitarimas Nr. " + (r.nr || "") + " dėl sutarties Nr. " + (s.nr || "") + " pakeitimo", blokai: B, priedai: priedai };
  }

  function sutartiesEilutes(S) {
    var s = S.sutartis;
    return [["Sutartis", (s.pavadinimasKilm ? s.pavadinimasKilm.replace(/sutarties$/i, "sutartis") : "") + (s.nr ? " Nr. " + s.nr : "")], ["Sudaryta", dataZ(s.data)],
      [salisP(s), s.pirkejoPav], [salisT(s), s.tiekejoPav + (s.tiekejoKodas ? " (" + s.tiekejoKodas + ")" : "")]].filter(function (x) { return x[1]; });
  }
  function skaiciavimoDok(S) {
    var b = S.rengiamas.blokai.filter(function (x) { return x.tipas === "ind"; })[0];
    if (!b) return null;
    var R = skaiciuokInd(b, S), t = b.taisykle, B = [], I = global.GP_OSP_INDEKSAI;
    B.push({ t: "antraste", tekstas: "SUTARTIES KAINOS PERSKAIČIAVIMO SKAIČIAVIMAS" });
    B.push({ t: "lentele", plociai: [28, 72], eilutes: sutartiesEilutes(S).concat([["Kainos peržiūros nuostata", punktoTekstas(b.dok, b.punktas, "punktas") || "nenurodyta"], ["Laikotarpis", menZ(b.pradzia) + " - " + menZ(b.pabaiga) + (R.men != null ? " (" + R.men + " mėn.)" : "")]]) });
    B.push({ t: "p", tekstas: "Indeksų reikšmės", pusjuodis: true });
    B.push({ t: "lentele", plociai: [40, 15, 15, 14, 16], antrastes: ["Indeksas", "Pradžioje", "Pabaigoje", "Pokytis, %", t.formule === "proc" ? "Taikomas k, %" : "Koeficientas K"],
      eilutes: R.eilutes.map(function (e) { return [e.pav + (e.slenksciui ? " (lyginamas su Sutarties riba)" : ""), fiks(e.pr, 4), fiks(e.pb, 4), proc(e.pokytis), e.K == null ? "" : (t.formule === "proc" ? proc(e.K, t.kTikslumas == null ? 1 : t.kTikslumas) : kTekstas(e.K, t))]; }) });
    B.push({ t: "p", tekstas: "Sutarties kaina, Eur be PVM", pusjuodis: true });
    var eil = R.eilutes.filter(function (e) { return e.suSuma; }).map(function (e) { return [e.taikoma ? "Suma, perskaičiuojama pagal: " + e.pav : e.pav, eur(e.suma), eur(e.nauja), eur(e.skirtumas)]; });
    eil.push(["Sutarties kaina", eur(R.sena), eur(R.nauja), eur(R.pokytisEur)]);
    B.push({ t: "lentele", plociai: [46, 18, 18, 18], antrastes: ["", "Iki perskaičiavimo", "Po perskaičiavimo", "Skirtumas"], eilutes: eil, paskutinePusjuode: true });
    if (R.pvm) B.push({ t: "p", tekstas: "PVM (" + proc(R.pvm.tarifas * 100, 0) + " %) - " + eur(R.pvm.pvm) + " Eur; Sutarties kaina su PVM - " + eur(R.pvm.viso) + " Eur." });
    B.push({ t: "p", tekstas: t.formule === "proc" ? "Skaičiavimas: k = pabaigos reikšmė / pradžios reikšmė x 100 - 100; perskaičiuota suma = suma + suma x k / 100." : "Skaičiavimas: K = pabaigos reikšmė / pradžios reikšmė; perskaičiuota suma = suma x K." });
    var osp = b.eilutes.every(function (e) { return e.prS === "osp" && e.pbS === "osp"; });
    B.push({ t: "p", tekstas: "Indeksų reikšmių šaltinis: " + (osp && I ? I.SALTINIS.lt + (b.gauta ? ", gauta " + b.gauta : "") : "įrašyta ranka - sutikrinkite su Sutartyje nurodytu šaltiniu") + "." });
    return { pavadinimas: "Sutarties kainos perskaičiavimo skaičiavimas", blokai: B };
  }
  /* Šaltiniai pagrindimui: VPT gairės (kai yra kitų nei kainos perskaičiavimo pakeitimų) ir teismų praktika, kurią mini patikros. */
  function saltiniaiSusitarimui(S) {
    var out = [], kiti = S.rengiamas.blokai.some(function (b) { return b.tipas !== "ind" && b.tipas !== "sub" && b.tipas !== "asm"; }), bylu = [];
    if (kiti) out.push(SALTINIAI.vpt.pav + ". " + SALTINIAI.vpt.pastaba);
    S.rengiamas.blokai.forEach(function (b) { blokoPraktika(b).forEach(function (nr) { if (bylu.indexOf(nr) < 0) bylu.push(nr); }); });
    bylu.forEach(function (nr) { out.push(praktikosEilute(nr)); });
    return out;
  }
  var ZENKLAI = { ok: "Patikrinta", klaida: "Netinka", tikrinti: "Patikrinkite", info: "Pastaba" };
  function pagrindimoDok(S, o) {
    var r = S.rengiamas, B = [], Rz = rezultatas(S);
    B.push({ t: "antraste", tekstas: "SUTARTIES PAKEITIMO PAGRINDIMAS" });
    B.push({ t: "centras", tekstas: "Vidaus dokumentas susitarimui Nr. " + (r.nr || "___") + " derinti. Neskelbiamas." });
    B.push({ t: "p", tekstas: "1. Sutartis", pusjuodis: true });
    B.push({ t: "lentele", plociai: [34, 66], eilutes: sutartiesEilutes(S).concat([["Pradinė Sutarties kaina be PVM", Rz.pradine != null ? eur(Rz.pradine) + " Eur" : "neįrašyta"], ["Kaina iki šio pakeitimo", Rz.sena != null ? eur(Rz.sena) + " Eur" : "neįrašyta"],
      ["Kaina po šio pakeitimo", Rz.galutine != null ? eur(Rz.galutine) + " Eur" + (Rz.keiciasi ? "" : " (nesikeičia)") : "neapskaičiuota"], ["Pokytis nuo pradinės kainos", Rz.nuoPradines != null ? proc(Rz.nuoPradines) + " %" : "-"]]) });
    B.push({ t: "p", tekstas: "2. Ankstesni Sutarties pakeitimai", pusjuodis: true });
    if (S.ankstesni.length) B.push({ t: "lentele", plociai: [10, 18, 46, 26], antrastes: ["Nr.", "Data", "Esmė", "Kainos pokytis, Eur be PVM"],
      eilutes: S.ankstesni.map(function (a) { return [a.nr, a.data, a.esme, a.pokytis == null ? "neįrašyta" : eur(a.pokytis)]; }) });
    else B.push({ t: "p", tekstas: "Sąraše ankstesnių pakeitimų nėra." });
    B.push({ t: "p", tekstas: "3. Rengiami pakeitimai ir jų pagrindas", pusjuodis: true });
    r.blokai.forEach(function (b, i) {
      var tp = TIPAI[b.tipas], pg = blokoPagrindas(b);
      B.push({ t: "p", tekstas: (i + 1) + ") " + tp.pav + ". Pagrindas: " + (pg ? cit(pg) + " - " + PAGRINDAI[pg].trumpai : "nepasirinktas") + "." });
      B.push({ t: "lentele", plociai: [22, 78], eilutes: blokoPatikros(b, S, i).map(function (p) { return [ZENKLAI[p.lygis], p.tekstas]; }) });
    });
    var naudoti = saltiniaiSusitarimui(S);
    if (naudoti.length) {
      B.push({ t: "p", tekstas: "Kuo remiasi patikros", pusjuodis: true });
      naudoti.forEach(function (x) { B.push({ t: "bruksnys", tekstas: x }); });
    }
    B.push({ t: "p", tekstas: "4. Po pasirašymo", pusjuodis: true });
    terminai(S, o && o.pasirasyta).forEach(function (x) { B.push({ t: "bruksnys", tekstas: x.tekstas + (x.iki ? " Terminas: " + x.iki + "." : "") }); });
    B.push({ t: "p", tekstas: "Pagrindimą parengė G-Procure įrankis pagal įvestus duomenis. Jis parodo, kuriuo pagrindu remiamasi ir kokios sąlygos patikrintos, bet nėra teisinė išvada." });
    return { pavadinimas: "Sutarties pakeitimo pagrindimas", blokai: B };
  }

  /* ---------- kas toliau ---------- */
  function terminai(S, pasirasyta) {
    var out = [], d = dataISO(pasirasyta), W = global.GP_WORKDAYS, s = S.sutartis;
    out.push({ kas: "viesinimas", tekstas: "Paskelbti susitarimą CVP IS ne vėliau kaip per 15 dienų nuo Sutarties pakeitimo, bet ne vėliau kaip iki pirmojo mokėjimo pagal jį (" + cit("sutarties_viesinimas") + ").", iki: d ? pridekDienas(d, 15) : "" });
    out.push({ kas: "asmens", tekstas: "Prieš skelbiant pašalinti asmens duomenis (vardus, parašus, kontaktus) ir vidines žymas; neskelbiama ir konfidenciali informacija." });
    function darbo(n) { if (!d || !W || !W.addWorkdays) return ""; try { return W.fmtDate(W.addWorkdays(new Date(d + "T00:00:00"), n)); } catch (e) { return ""; } }
    var bl = S.rengiamas.blokai, gS = false, gT = false;
    bl.forEach(function (b) { if (b.garantija === "taip") { if (b.tipas === "ter") gT = true; else gS = true; } });
    if (gS || gT) out.push({ kas: "garantija", tekstas: salisT(s) + " per 10 darbo dienų nuo pasirašymo pateikia " + (gS && gT ? "perskaičiuotą ir pratęstą" : gS ? "perskaičiuotą" : "pratęstą") + " Sutarties įvykdymo užtikrinimą ir draudimą.", iki: darbo(10) });
    var skelbti = s.pirkimoRusis === "tarptautinis" && bl.some(function (b) { var pg = blokoPagrindas(b); return b.tipas === "pap" && (pg === "keitimas_papildomi" || pg === "keitimas_nenumatytos"); });
    if (skelbti) out.push({ kas: "skelbimas", tekstas: "Paskelbti skelbimą apie Sutarties pakeitimą ne vėliau kaip per 3 darbo dienas po pakeitimo (" + cit("skelbimas_apie_keitima") + ").", iki: darbo(3) });
    bl.forEach(function (b) {
      if (b.tipas === "ind") out.push({ kas: "kitas", tekstas: "Kitas kainos perskaičiavimas negali apimti laikotarpio iki " + (menZ(b.pabaiga) || "šio laikotarpio pabaigos") + " - įrankis tai įsimins pakeitimų sąraše." });
      if (b.tipas === "ter" && b.naujas) out.push({ kas: "terminas", tekstas: "Pratęstas terminas baigiasi " + dataZ(b.naujas) + " - įrankis primins likus 30 dienų.", iki: pridekDienas(b.naujas, -30) });
    });
    return out;
  }

  /* ---------- pakeitimų sąrašas ---------- */
  function esme(S) {
    var r = [], O = OBJ[objektas(S.sutartis)];
    S.rengiamas.blokai.forEach(function (b) {
      var e = b.tipas === "pap" ? "papildomų " + O[0] + " įsigijimo" : b.tipas === "ats" ? "dalies " + O[0] + " atsisakymo" :
        b.tipas === "ter" && TERMINAI[b.kas] ? TERMINAI[b.kas][1] + " pratęsimo" : TIPAI[b.tipas].esme;
      if (r.indexOf(e) < 0) r.push(e);
    });
    return r.join(" ir ");
  }
  /* Viešuose duomenyse pavadinimai rašomi su tiesiomis kabutėmis (UAB "Pavadinimas") - susitarime jos lietuviškos. */
  function kabutes(t) { return String(t || "").replace(/"([^"]+)"/g, function (m, a) { return "\u201E" + a + "\u201C"; }); }

  /* Pasirašytas susitarimas perkeliamas į ankstesnių pakeitimų sąrašą; rengiamas - išvalomas. */
  function uzbaik(S, o) {
    var Rz = rezultatas(S), r = S.rengiamas, ind = r.blokai.filter(function (b) { return b.tipas === "ind"; })[0];
    if (!r.blokai.length) return false;
    var pas = (o && o.data) || r.data, d2 = 0;
    r.blokai.forEach(function (b) { if (b.tipas === "pap" && blokoPagrindas(b) === "keitimas_mazos_vertes" && b.verte != null) d2 += b.verte; });
    var prim = terminai(S, pas).filter(function (x) { return x.iki; }).map(function (x) { return { kas: x.kas, tekstas: x.tekstas, iki: x.iki, atlikta: "" }; });
    S.ankstesni.push(ankstesnioForma({ nr: r.nr, data: pas, regNr: (o && o.regNr) || r.regNr, esme: esme(S), pokytis: Rz.keiciasi ? Rz.pokytis : 0,
      pagrindas: r.blokai.map(function (b) { var pg = blokoPagrindas(b); return pg ? cit(pg) : ""; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join("; "),
      indMenuo: ind ? ind.pabaiga : "", pagal2d: d2 ? r2(d2) : null, perziura: Rz.perziura, pasirasyta: pas, priminimai: prim, saltinis: "irankis" }));
    if (Rz.keiciasi && Rz.galutine != null && S.sutartis.dabartineVerte != null) S.sutartis.dabartineVerte = Rz.galutine;
    r.blokai.forEach(function (b) { if (b.tipas === "ter" && b.kas === "galiojimo" && b.naujas) S.sutartis.galiojaIki = b.naujas; });
    S.rengiamas = { nr: String((parseInt(r.nr, 10) || S.ankstesni.length) + 1), data: "", regNr: "", vieta: r.vieta, blokai: [] };
    return true;
  }

  /* ---------- apžvalga sąraše (3 etapas): kaina, nedidelės vertės pakeitimų dalis, galiojimas, priminimai ---------- */
  var ARTI_D = 30, BAIGIASI_D = 60;
  function apzvalga(S, siandien) {
    var s = S.sutartis, dab = dabartine(S), pr = s.pradineVerte, Pt = patikslinta(S), R = ribos(S), d2 = suma2d(S), prim = [];
    S.ankstesni.forEach(function (a, ai) {
      (a.priminimai || []).forEach(function (x, pi) {
        if (x.atlikta || !x.iki) return;
        var liko = dienuTarp(siandien, x.iki);
        prim.push({ ai: ai, pi: pi, kas: x.kas, tekstas: x.tekstas, iki: x.iki, liko: liko, veluoja: liko != null && liko < 0, nr: a.nr });
      });
    });
    prim.sort(function (a, b) { return a.iki < b.iki ? -1 : a.iki > b.iki ? 1 : 0; });
    var liko = s.galiojaIki ? dienuTarp(siandien, s.galiojaIki) : null;
    return { kaina: dab, nuoPradines: pr && dab != null ? (dab - pr) / pr * 100 : null, d2: d2, d2Proc: d2 && Pt.verte ? d2 / Pt.verte * 100 : null, d2Riba: R.proc,
      galiojaIki: s.galiojaIki, likoDienu: liko, baigiasi: liko != null && liko >= 0 && liko <= BAIGIASI_D, pasibaige: liko != null && liko < 0, priminimai: prim,
      arti: prim.filter(function (x) { return x.liko != null && x.liko <= ARTI_D; }) };
  }
  /* Visų sutarčių artimiausi darbai: pavėluoti ir per 30 dienų priminimai, per 60 dienų besibaigiančios sutartys. */
  function artimiausi(visos, siandien) {
    var out = [];
    visos.forEach(function (S) {
      var A = apzvalga(S, siandien), nr = S.sutartis.nr || "be numerio";
      A.arti.forEach(function (x) { out.push({ id: S.id, ai: x.ai, pi: x.pi, iki: x.iki, liko: x.liko, veluoja: x.veluoja, sutartis: nr, tekstas: x.tekstas, kas: x.kas }); });
      if (A.baigiasi) out.push({ id: S.id, ai: -1, pi: -1, iki: A.galiojaIki, liko: A.likoDienu, veluoja: false, sutartis: nr, tekstas: "Sutartis baigiasi - jei reikia, pratęskite galiojimą iki pabaigos arba pradėkite naują pirkimą.", kas: "galiojimas" });
    });
    return out.sort(function (a, b) { return a.iki < b.iki ? -1 : a.iki > b.iki ? 1 : 0; });
  }
  function pazymekAtlikta(S, ai, pi, data) {
    var a = S.ankstesni[ai], x = a && a.priminimai && a.priminimai[pi];
    if (!x) return false;
    x.atlikta = dataISO(data) || "";
    return !!x.atlikta;
  }

  /* ---------- vieši duomenys (G-Procure serverio atsakymas) -> sutarties laukai ir ankstesni pakeitimai ---------- */
  function isViesu(S, ats) {
    if (!ats || typeof ats !== "object" || !ats.sutartis) return { ok: false };
    var v = ats.sutartis, s = S.sutartis, pildyta = [];
    function dek(k, val, pav) { if (val && !s[k]) { s[k] = val; pildyta.push(pav); } }
    dek("nr", eilute1(v.nr, 60), "numeris"); dek("data", dataISO(v.sudaryta), "sudarymo data"); dek("galiojaIki", dataISO(v.galioja), "galiojimo pabaiga");
    dek("pirkimoNr", eilute1(v.pirkimoNr, 40), "pirkimo numeris");
    /* Kitos Šalies kodas pildomas tik kartu su viešu pavadinimu: ranka įrašytam kitam pavadinimui svetimas kodas nepriskiriamas. */
    var tp = v.tiekejas ? kabutes(eilute1(v.tiekejas.pav, 200)) : "";
    if (tp && (!s.tiekejoPav || s.tiekejoPav === tp)) { dek("tiekejoPav", tp, "kita Šalis"); dek("tiekejoKodas", eilute1(v.tiekejas.kodas, 20), "kitos Šalies kodas"); }
    s.viesaPav = eilute1(v.pav, 300); s.viesaVerte = teig(v.verte);
    var yra = {}, nauju = 0;
    S.ankstesni.forEach(function (a) { if (a.regNr) yra[a.regNr] = 1; });
    (Array.isArray(ats.pakeitimai) ? ats.pakeitimai : []).slice(0, RIBOS.ankstesniu).forEach(function (p) {
      var reg = eilute1(p && p.nr, 40), d = dataISO(p && p.sudaryta);
      if (!reg || yra[reg] || S.ankstesni.length >= RIBOS.ankstesniu) return;
      yra[reg] = 1; nauju++;
      S.ankstesni.push(ankstesnioForma({ nr: "", data: d, regNr: reg, esme: "", pokytis: null, saltinis: "cvpis", viesaVerte: p && p.verte }));
    });
    S.ankstesni.sort(function (a, b) { return (a.data || "9") < (b.data || "9") ? -1 : (a.data || "9") > (b.data || "9") ? 1 : 0; });
    S.ankstesni.forEach(function (a, i) { if (!a.nr) a.nr = String(i + 1); });
    if (!S.rengiamas.nr) S.rengiamas.nr = String(S.ankstesni.length + 1);
    return { ok: true, pildyta: pildyta, pakeitimu: nauju };
  }

  /* ==========================================================================
   * Paieška viešai paskelbtų sutarčių sąraše (2026-11-28, naudotojo užduotis: sutartį rasti pagal pirkimo objekto pavadinimo žodį,
   * o kitus laukus užpildyti iš paskelbtos sutarties). Sąrašas gaunamas iš G-Procure serverio (siunčiamas tik pirkimo vykdytojo kodas),
   * ieškoma NARŠYKLĖJE - paieškos žodžiai niekur nesiunčiami. Serverio atsakymas - nepatikimi duomenys: tik žinomi laukai, tipai ir ribos.
   * ========================================================================== */
  var SARASO_RIBA = 8000;
  /* Raidė į raidę (ilgis nesikeičia - pagal tas pačias vietas žymimi rasti žodžiai): mažosios, be diakritikų, kabutės ir skyryba - tarpai */
  function lygink(t) {
    var s = String(t == null ? "" : t).toLowerCase(), out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), n = c.normalize ? c.normalize("NFD").charAt(0) : c;
      out += /[a-z0-9\/.\-]/.test(n) ? n : " ";
    }
    return out;
  }
  function norm(t) { return lygink(t).replace(/\s+/g, " ").trim(); }
  function viesaSutartis(x) {
    if (!x || typeof x !== "object") return null;
    var pav = eilute1(x.pav, 300), nr = eilute1(x.nr, 60);
    if (!pav && !nr) return null;
    var t = x.tiekejas && typeof x.tiekejas === "object" ? x.tiekejas : null, tp = t && typeof t.pav === "string" ? kabutes(eilute1(t.pav, 200)) : "";
    var pak = (Array.isArray(x.pakeitimai) ? x.pakeitimai : []).slice(0, RIBOS.ankstesniu).map(function (p) {
      p = p && typeof p === "object" ? p : {};
      return { nr: eilute1(p.nr, 40), sudaryta: dataISO(p.sudaryta), verte: teig(p.verte), galioja: dataISO(p.galioja) };
    }).filter(function (p) { return p.nr; });
    var gal = dataISO(x.galioja), galV = gal, verteV = teig(x.verte);
    pak.forEach(function (p) { if (p.galioja && p.galioja > galV) galV = p.galioja; if (p.verte != null) verteV = p.verte; });
    var o = { nr: nr, pav: pav, sudaryta: dataISO(x.sudaryta), galioja: gal, galiojaV: galV, pirkimoNr: eilute1(x.pirkimoNr, 40), verte: teig(x.verte), verteV: verteV,
      bvpz: typeof x.bvpz === "string" && /^\d{8}$/.test(x.bvpz) ? x.bvpz : "",
      tiekejas: tp ? { pav: tp, kodas: typeof t.kodas === "string" && /^\d{7,9}$/.test(t.kodas) ? t.kodas : "" } : null,
      tiekejasNerodomas: !tp && !!t, pakeitimai: pak, keliosSutartys: x.keliosSutartys === true };
    o._p = norm(pav); o._t = norm(tp); o._n = norm([nr].concat(pak.map(function (p) { return p.nr; })).join(" ")); o._k = norm(o.pirkimoNr);
    return o;
  }
  function viesasSarasas(a) { return (Array.isArray(a) ? a : []).slice(0, SARASO_RIBA).map(viesaSutartis).filter(Boolean); }
  /* Sutarties būsena pagal vėliausią paskelbtą galiojimo datą (sutartis ar jos pakeitimai): galioja / baigiasi (per 90 d.) / baigesi / nezinoma */
  function viesosBusena(x, dabar) {
    var d = x && x.galiojaV;
    if (!d || !dataISO(dabar)) return { kodas: "nezinoma", liko: null };
    var liko = Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(dabar + "T00:00:00Z")) / 86400000);
    return { kodas: liko < 0 ? "baigesi" : liko <= 90 ? "baigiasi" : "galioja", liko: liko };
  }
  function paieskosZodziai(q) {
    var z = norm(q).split(" ").filter(function (w) { return w.length >= 2 || /^\d$/.test(w); }), out = [];
    z.forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); });
    return out.slice(0, 8);
  }
  /* Lietuviški linksniai: ilgesnio žodžio kamienas (be dviejų paskutinių raidžių, ne trumpesnis kaip 4) - „Neries“ randa ir „Neris“ */
  function kamienas(z) { return z.length >= 5 && !/\d/.test(z) ? z.slice(0, Math.max(4, z.length - 2)) : ""; }
  /* Kaip žodis z atitinka tekstą t (abu - norm): visas žodis - 1, žodžio pradžia - 0,9, kamienas - 0,7, žodžio vidurys - 0,5, neatitinka - 0 */
  function zodzioBalas(z, t) {
    if (!t) return 0;
    var i = (" " + t + " ").indexOf(" " + z);
    if (i >= 0) { var po = (" " + t + " ").charAt(i + 1 + z.length); return po === " " ? 1 : 0.9; }
    var k = kamienas(z);
    if (k && (" " + t).indexOf(" " + k) >= 0) return 0.7;
    return z.length >= 3 && t.indexOf(z) >= 0 ? 0.5 : 0;
  }
  var PAIESKOS_LAUKAI = { pav: [["_p", 3, "pav"]], tiekejas: [["_t", 3, "tiekejas"]], nr: [["_n", 3, "nr"], ["_k", 2, "pirkimoNr"]],
    visur: [["_p", 3, "pav"], ["_n", 2.5, "nr"], ["_t", 2, "tiekejas"], ["_k", 1.5, "pirkimoNr"]] };
  /* ieskok(sar, q, { kur: visur|pav|tiekejas|nr, busena: visos|galioja|baigesi, dabar }) -> { rasta: [{ x, balas, kur: [...] }], skaiciai, zodziai }.
     Visi žodžiai turi atitikti (kiekvienas - bet kuriame leidžiamame lauke). Tuščia užklausa - visos sutartys, naujausios pirmos.
     Rikiuojama: atitikimas, tada galiojančios pirmiau, tada naujausios. skaiciai - kiek atitinka pagal būseną (filtrų mygtukams). */
  function ieskok(sar, q, o) {
    o = o || {};
    var zod = paieskosZodziai(q), laukai = PAIESKOS_LAUKAI[turi(PAIESKOS_LAUKAI, o.kur) ? o.kur : "visur"], dabar = dataISO(o.dabar) || "", rasta = [];
    (sar || []).forEach(function (x) {
      var balas = 0, kur = {}, ok = true;
      for (var i = 0; i < zod.length && ok; i++) {
        var g = 0, gk = "";
        for (var j = 0; j < laukai.length; j++) { var b = zodzioBalas(zod[i], x[laukai[j][0]]) * laukai[j][1]; if (b > g) { g = b; gk = laukai[j][2]; } }
        if (!g) ok = false; else { balas += g; kur[gk] = 1; }
      }
      if (!ok) return;
      var bs = viesosBusena(x, dabar).kodas;
      rasta.push({ x: x, balas: zod.length ? balas / zod.length : 0, kur: Object.keys(kur), busena: bs });
    });
    var sk = { visos: rasta.length, galioja: 0, baigesi: 0 };
    rasta.forEach(function (r) { if (r.busena === "baigesi") sk.baigesi++; else sk.galioja++; });
    if (o.busena === "galioja") rasta = rasta.filter(function (r) { return r.busena !== "baigesi"; });
    else if (o.busena === "baigesi") rasta = rasta.filter(function (r) { return r.busena === "baigesi"; });
    rasta.sort(function (a, b) {
      if (Math.abs(a.balas - b.balas) > 0.05) return b.balas - a.balas;
      var ag = a.busena === "baigesi" ? 1 : 0, bg = b.busena === "baigesi" ? 1 : 0;
      if (zod.length && ag !== bg) return ag - bg;
      return (a.x.sudaryta || "") > (b.x.sudaryta || "") ? -1 : (a.x.sudaryta || "") < (b.x.sudaryta || "") ? 1 : 0;
    });
    return { rasta: rasta, skaiciai: sk, zodziai: zod };
  }
  /* Rastų žodžių vietos tekste (pradžia, pabaiga) - žymėjimui; ieškoma taip pat kaip zodzioBalas (žodis, kamienas) */
  function zymiuVietos(tekstas, zodziai) {
    var t = lygink(tekstas), v = [];
    (zodziai || []).forEach(function (z) {
      var k = kamienas(z), rado = false, i = -1;
      while ((i = t.indexOf(z, i + 1)) >= 0) { v.push([i, i + z.length]); rado = true; }
      if (!rado && k) {
        i = -1;
        while ((i = t.indexOf(k, i + 1)) >= 0) {
          if (i > 0 && t.charAt(i - 1) !== " ") continue;
          var g = i + k.length; while (g < t.length && t.charAt(g) !== " ") g++;
          v.push([i, g]);
        }
      }
    });
    v.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var out = [];
    v.forEach(function (x) { var p = out[out.length - 1]; if (p && x[0] <= p[1]) p[1] = Math.max(p[1], x[1]); else out.push([x[0], x[1]]); });
    return out;
  }
  /* Objekto rūšis pagal BVPŽ kodo skyrių: 45 - darbai, 03-44 ir 48 - prekės, 50-98 - paslaugos (kaip shared/vpt-duomenys.js) */
  function objektasIsBvpz(k) {
    var d = /^\d{8}$/.test(k || "") ? +String(k).slice(0, 2) : 0;
    return d === 45 ? "darbai" : (d >= 3 && d <= 44) || d === 48 ? "prekes" : d >= 50 && d <= 98 ? "paslaugos" : "";
  }
  /* Sutarties formos pasiūlymas pagal pavadinimą ir objektą - tik pasiūlymas, pasirenka žmogus */
  function siulomaForma(pav, obj) {
    var n = norm(pav);
    if (obj !== "prekes" && /(^| )(eksploatavim|trasu valym)/.test(n)) return "EKS";
    if (obj === "darbai") return /(^| )projektavim/.test(n) ? "PSR" : /(^| )(rekonstr|statyb|rangos)/.test(n) ? "SR" : /(^| )(remont|paprast)/.test(n) ? "DARBAI" : "";
    if (obj === "paslaugos") return /(^| )(projektavim|techninio projekto|darbo projekto)/.test(n) && !/ekspertiz/.test(n) ? "PPS" : "PASLAUGOS";
    return obj === "prekes" ? "PREKES" : "";
  }
  /* Sutarties pavadinimas kilmininku iš paskelbto pavadinimo - tik aiškiais atvejais, kitaip "" (žmogus įrašo pats) */
  function pavadinimasKilmininku(pav) {
    var p = eilute1(pav, 380).replace(/[.\s]+$/, ""), m;
    if (!p) return "";
    if ((m = /^(.*\S)\s+pirkimas$/i.exec(p))) return m[1] + " pirkimo sutarties";
    if ((m = /^(.*\S)\s+sutartis$/i.exec(p))) return m[1] + " sutarties";
    if ((m = /^sutartis\s+dėl\s+(.+)$/i.exec(p))) return m[1] + " sutarties";
    if ((m = /^(.*\S)\s+paslaugos$/i.exec(p))) return m[1] + " paslaugų pirkimo sutarties";
    if ((m = /^(.*\S)\s+darbai$/i.exec(p))) return m[1] + " darbų pirkimo sutarties";
    if (/\s(paslaugų|darbų|prekių)$/i.test(p)) return p + " pirkimo sutarties";
    return "";
  }
  /* Pasirinkta sąrašo sutartis -> sutarties įrašas: vieši duomenys (isViesu), objektas pagal BVPŽ, pavadinimo kilmininku pasiūlymas.
     Kainos neįrašomos (vieša vertė gali būti su PVM) - jos lieka užuomina prie lauko. */
  function isSaraso(S, x, o) {
    o = o || {};
    if (!S || !x) return { ok: false };
    var r = isViesu(S, { sutartis: { nr: x.nr, sudaryta: x.sudaryta, galioja: x.galiojaV || x.galioja, pirkimoNr: x.pirkimoNr, pav: x.pav, verte: x.verte, tiekejas: x.tiekejas }, pakeitimai: x.pakeitimai, keliosSutartys: x.keliosSutartys });
    if (!r.ok) return r;
    var s = S.sutartis;
    if (x.bvpz) s.bvpz = x.bvpz;
    if (!s.objektas && !objektas({ forma: s.forma })) { var ob = objektasIsBvpz(x.bvpz); if (ob) { s.objektas = ob; r.pildyta.push("objektas (pagal BVPŽ kodą)"); } }
    if (!s.pavadinimasKilm) { var pk = pavadinimasKilmininku(x.pav); if (pk) { s.pavadinimasKilm = pk; s.pavS = "cvpis"; } }
    s.gauta = dataISO(o.dabar) || s.gauta;
    r.keliosSutartys = x.keliosSutartys;
    return r;
  }
  /* Ar paskelbta vertė tikėtinai su PVM: atėmus PVM gaunama sveika ir „apvalesnė“ suma (daugiau nulių gale) nei paskelbtoji.
     Tik užuomina prie pasiūlymo - kainą įrašo žmogus. */
  function tiketinaSuPvm(v) {
    var t = pvmTarifas();
    if (teig(v) == null || !v || t == null) return false;
    var be = v / (1 + t), sv = Math.round(be);
    if (Math.abs(be - sv) > 0.005 || !sv) return false;
    function nuliai(n) { var k = 0; n = Math.round(n * 100); while (n && n % 10 === 0) { n /= 10; k++; } return k; }
    return nuliai(sv) > nuliai(v);
  }
  /* Ko dar trūksta, kad būtų galima rengti pakeitimą (1 žingsnio viršuje): [{ k: laukas, pav }] */
  function trukstaSutarciai(S) {
    var s = S.sutartis, out = [];
    if (!s.nr) out.push({ k: "s.nr", pav: "sutarties numeris" });
    if (!s.data) out.push({ k: "s.data", pav: "sudarymo data" });
    if (!s.forma) out.push({ k: "s.forma", pav: "sutarties forma" });
    if (!s.pavadinimasKilm) out.push({ k: "s.pavadinimasKilm", pav: "pavadinimas kilmininku" });
    if (s.pradineVerte == null) out.push({ k: "s.pradineVerte", pav: "pradinė kaina be PVM" });
    if (!s.tiekejoPav) out.push({ k: "s.tiekejoPav", pav: "kita Šalis" });
    return out;
  }

  global.GP_PAKEITIMAI = {
    VERSIJA: VERSIJA, SCHEMA: SCHEMA, RAKTAS: RAKTAS, RIBOS: RIBOS, FORMOS: FORMOS, IND: IND, SUB: SUB, TIPAI: TIPAI, DOKAI: DOKAI, PRADZIOS: PRADZIOS, PAGRINDAI: PAGRINDAI,
    eur: eur, fiks: fiks, proc: proc, r2: r2, apvalink: apvalink, dataISO: dataISO, dataZ: dataZ, link: link, cit: cit, apie: apie, ilgas: ilgas, pridekDienas: pridekDienas,
    forma: forma, salisP: salisP, salisT: salisT, taisykle: taisykle, naujasBlokas: naujasBlokas, naujaSutartis: naujaSutartis,
    sutartiesForma: sutartiesForma, saugyklosForma: saugyklosForma, blokoForma: blokoForma, indKilm: indKilm,
    dabartine: dabartine, suPvm: suPvm, skaiciuokInd: skaiciuokInd, kTekstas: kTekstas, blokoPatikros: blokoPatikros, patikros: patikros, kliuciu: kliuciu, rezultatas: rezultatas,
    susitarimas: susitarimas, skaiciavimoDok: skaiciavimoDok, blokoPagrindas: blokoPagrindas, skaiciuokPap: skaiciuokPap, skaiciuokTer: skaiciuokTer,
    patikslinta: patikslinta, ribos: ribos, objektas: objektas, apzvalga: apzvalga, artimiausi: artimiausi, pazymekAtlikta: pazymekAtlikta, PRAKTIKA: PRAKTIKA, LITEKO: LITEKO, blokoPraktika: blokoPraktika, praktikosEilute: praktikosEilute, ESM: ESM, ESM_PAAISK: ESM_PAAISK, OBJ: OBJ, TERMINAI: TERMINAI, SALTINIAI: SALTINIAI, saltiniaiSusitarimui: saltiniaiSusitarimui, pagrindimoDok: pagrindimoDok, terminai: terminai, esme: esme, uzbaik: uzbaik, isViesu: isViesu, paskutinisInd: paskutinisInd,
    lygink: lygink, norm: norm, viesaSutartis: viesaSutartis, viesasSarasas: viesasSarasas, viesosBusena: viesosBusena, paieskosZodziai: paieskosZodziai, ieskok: ieskok, zymiuVietos: zymiuVietos,
    objektasIsBvpz: objektasIsBvpz, siulomaForma: siulomaForma, pavadinimasKilmininku: pavadinimasKilmininku, isSaraso: isSaraso, trukstaSutarciai: trukstaSutarciai, pvmTarifas: pvmTarifas, tiketinaSuPvm: tiketinaSuPvm
  };
})(typeof window !== "undefined" ? window : this);
