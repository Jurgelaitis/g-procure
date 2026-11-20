/* ============================================================================
 * G-Procure  shared/kibernetinis-saugumas.js   (window.GP_KIBER)
 * ----------------------------------------------------------------------------
 * Kibernetinio saugumo reikalavimai pirkimuose (2026-11-19, naudotojo „Darome“ - ilgalaikės krypties 1 etapas). Grynos funkcijos ir
 * duomenys, be DI, nieko nesaugo ir nesiunčia.
 *
 * KAS TAI. Reikalavimų katalogas pagal tris šaltinius ir pagal tai, KUR reikalavimas priklauso:
 *   - Kibernetinio saugumo reikalavimų aprašas (Vyriausybės nutarimas Nr. 818) - GALIOJA DABAR kibernetinio saugumo subjektams:
 *     32 p. tvarka IRT pirkimams, 33 p. tiekėjų atrankos kriterijai (pirkimo sąlygos), 34 p. sutarties nuostatos, 38 p. kontrolė,
 *     35 ir 39 p. - organizacijos pareigos (tiekėjų rizikos vertinimas, tiekėjų sąrašas; ne pirkimo dokumentų turinys).
 *   - Kibernetinio atsparumo aktas (Reglamentas (ES) 2024/2847) - gamintojų pareigos nuo 2027-12-11; produkto reikalavimai - TS.
 *   - Tinklo kodeksas dėl kibernetinio saugumo (Deleguotasis reglamentas (ES) 2024/1366) 33 str. - privaloma taps pirkimams, pradedamiems
 *     praėjus 6 mėn. po kontrolės priemonių patvirtinimo (data dar nežinoma), iki tol - REKOMENDUOJAMA.
 * Reikalavimo tekstas - registro `apie` (teisės akto žodžiai, shared/teises-nuorodos.js), TS eilutės - produkto reikalavimai su nuoroda.
 * Sutarties nuostatų formuluočių modulis NEKURIA: sąrašas sako, kas sutartyje turi būti, tekstą rengia žmogus (LITGRID šablonai nekeičiami).
 *
 * NAUDOJIMAS
 *   GP_KIBER.parink({ irt: "taip", skaitmeniniai: "taip", kritinis: "ne" }) -> { grupes: { sps, sutartis, ts, organizacija }, trukumai }
 *   GP_KIBER.tsEilutes({ skaitmeniniai, kritinis })   -> ["Kartu su produktu pateikiama ES atitikties deklaracijos kopija ... (Reglamento ...)", ...]
 * Testai: shared/testai.html grupė testaiKiber1119, PP-salygos ir PP-ts testai.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var CRA_NUO = "2027-12-11";

  /* Paketo patikros paieška (trečias pilotas 2026-11-20): vien „incident“, „audit“, „patalp“, „priei“, „sprag“ rasdavo darbuotojų saugos incidentus,
     atliekų rūšiavimo patalpas, prieigą prie prekių trūkumams šalinti, o „sla“ be žodžio pradžios - „tikslą,“. Todėl šie žodžiai ieškomi tik
     eilutėje, kurioje yra ir kibernetinio ar informacijos saugumo kontekstas. Tekstas - mažosiomis be diakritikų (shared/parengtis.js be()). */
  var KONTEKSTAS = "kibernetin|informacin[a-z]*\\s+(saug|sistem|technolog|infrastrukt|turt)|informacijos\\s+saug|(^|[^a-z])irt([^a-z]|$)" +
    "|rysiu\\s+ir\\s+informacin|tinkl[a-z]*\\s+ir\\s+informacin|duomen[a-z]*\\s+(saug|apsaug|nutek|pazeid|tvarkym|centr)|programin|kompiuter" +
    "|isilauz|kenkej|autentifik|slaptazod|sifrav|iso\\/?iec\\s*27001|naudotoj[a-z]*\\s+(ir\\s+)?priei|prieigos\\s+teis|debes[a-z]*\\s+(paslaug|kompiuterij)";
  function kont(zodziai) { return "^(?=.*(?:" + KONTEKSTAS + "))(?=.*(?:" + zodziai + "))"; }

  /* kur: "sps" - pirkimo sąlygos (tiekėjų atranka), "sutartis", "ts" - techninė specifikacija (produkto reikalavimai),
          "organizacija" - organizacijos vidaus pareiga (ne pirkimo dokumentų turinys);
     kada: "irt" - pirkimas susijęs su tinklų ir informacinėmis sistemomis (Aprašo 32 p.), "skaitmeniniai" - perkami produktai su
           skaitmeniniais elementais (Kibernetinio atsparumo aktas), "kritinis" - ypatingos svarbos poveikio turtas (tinklo kodeksas);
     galioja: "dabar" | "cra" (gamintojų pareiga nuo 2027-12-11; reikalauti galima jau dabar) | "rekomenduojama". */
  var KATALOGAS = [
    { id: "ksa_33_1", kur: "sps", kada: "irt", galioja: "dabar", zodziai: "kibernetin[a-z]*\\s+saugum" },
    { id: "ksa_33_2", kur: "sps", kada: "irt", galioja: "dabar" },
    { id: "ksa_33_3", kur: "sps", kada: "irt", galioja: "dabar", zodziai: kont("priei[a-z]*\\s+([a-z]+\\s+){0,3}valdym") },
    { id: "nccs_atranka", kur: "sps", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_patikra", kur: "sps", kada: "kritinis", galioja: "rekomenduojama", pav: "Patikra pirkimo metu, ar IRT produktai, paslaugos ir procesai atitinka kibernetinio saugumo specifikacijas, ir jos dokumentavimas" },
    { id: "ksa_34_1", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "kibernetin[a-z]*\\s+saugum" },
    { id: "ksa_34_2", kur: "sutartis", kada: "irt", galioja: "dabar" },
    { id: "ksa_34_3", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: kont("incident") },
    { id: "ksa_34_4", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: kont("audit") },
    { id: "ksa_34_5", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: kont("pazeidziamum|(^|[^a-z])sprag") },
    { id: "ksa_34_6", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "konfidencial" },
    { id: "ksa_34_7", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: kont("paslaugu\\s+(teikimo\\s+)?lyg|(^|[^a-z])sla([^a-z]|$)") },
    { id: "ksa_34_8", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: kont("priei[a-z]*\\s+(teis|valdym|lyg|kontrol|prie\\s+(sistem|duomen|informacin|tinkl))|login[a-z]*\\s+(ir\\s+fizin[a-z]*\\s+)?priei|fizin[a-z]*\\s+priei") },
    { id: "ksa_34_9", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: kont("patalp|duomenu\\s+centr") },
    { id: "ksa_34_10", kur: "sutartis", kada: "irt", galioja: "dabar" },
    { id: "nccs_a_i", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_iv", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_v", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_vi", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_vii", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_ix", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_x", kur: "sps", kada: "irt", galioja: "rekomenduojama" },
    { id: "ksa_rizika", kur: "organizacija", kada: "irt", galioja: "dabar" },            // Aprašo punktų tvarka: 35, 38, 39 (trečias pilotas 2026-11-20)
    { id: "ksa_kontrole", kur: "organizacija", kada: "irt", galioja: "dabar" },
    { id: "ksa_sarasas", kur: "organizacija", kada: "irt", galioja: "dabar" },
    // TS - perkamos tinklų ir informacinės sistemos funkcija, be kurios subjektas negalėtų įvykdyti Aprašo techninio reikalavimo (trečias pilotas 2026-11-20)
    { id: "ksa_t61", kur: "ts", kada: "irt", galioja: "dabar", ts: "Sistema leidžia naudotojams ir administratoriams patvirtinti tapatybę slaptažodžiu ir papildoma tapatumo nustatymo priemone (kelių veiksnių tapatumo nustatymas)",
      zodziai: "keli[a-z]*\\s+veiksni[a-z]*\\s+tapatum|daugiaveiks|dvieju\\s+veiksni|multi[- ]?factor|(^|[^a-z])mfa([^a-z]|$)|2fa" },
    // Ne teisės akto reikalavimas (trečias pilotas 2026-11-20: LITGRID CDE TS - procedūros pagal ISO/IEC 27001): jei standartas nurodomas - su „arba
    // lygiavertis“ (registras ts_standartai)
    { id: "ts_standartai", kur: "ts", kada: "irt", galioja: "praktika", ts: "Informacijos saugumo valdymo standarto (pvz., ISO/IEC 27001) teisės aktai nereikalauja; jei tiekėjo procedūroms jį nurodote, nuoroda į standartą pateikiama su žodžiais „arba lygiavertis“" },
    // TS - produkto reikalavimai (Kibernetinio atsparumo aktas; tinklo kodekso produkto specifikacijos)
    { id: "cra_deklaracija", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Kartu su produktu pateikiama ES atitikties deklaracijos kopija arba supaprastinta ES atitikties deklaracija su interneto adresu, kuriuo galima gauti visą jos tekstą" },
    { id: "cra_palaikymas", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Produkto palaikymo laikotarpis - ne trumpesnis kaip penkeri metai (jei produktas bus naudojamas trumpiau - tikėtinas naudojimo laikas)", su: ["cra_pabaigos_data"] },
    { id: "cra_pabaigos_data", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Palaikymo laikotarpio pabaigos data (bent mėnuo ir metai) nurodoma pirkimo metu" },
    { id: "cra_nemokami", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Saugumo naujiniai, skirti nustatytoms saugumo problemoms spręsti, teikiami nedelsiant ir nemokamai, su patariamosiomis žinutėmis naudotojams" },
    { id: "cra_naujiniai", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Kiekvienas per palaikymo laikotarpį pateiktas saugumo naujinys lieka prieinamas ne trumpiau kaip 10 metų arba likusį palaikymo laikotarpį (kuris ilgesnis)" },
    { id: "cra_sbom", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Kartu su produktu pateikiamas programinės įrangos medžiagų žiniaraštis (SBOM) įprastu ir kompiuterio skaitomu formatu, apimantis bent aukščiausio lygio priklausomybes" },
    { id: "cra_kontaktas", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Nurodomas gamintojo bendras kontaktinis punktas, per kurį galima pranešti apie produkto pažeidžiamumus" },
    { id: "cra_atskleidimas", kur: "ts", kada: "skaitmeniniai", galioja: "cra", ts: "Gamintojas taiko koordinuoto pažeidžiamumų atskleidimo politiką" },
    { id: "nccs_a_ii", kur: "ts", kada: "kritinis", galioja: "rekomenduojama", ts: "Saugaus ir kontroliuojamo produkto projektavimo, kūrimo ir gamybos procesai, apimantys tinkamas technines kibernetinio saugumo priemones" },
    { id: "nccs_a_iii", kur: "ts", kada: "kritinis", galioja: "rekomenduojama", ts: "Sandara, kurioje įrenginiai nelaikomi patikimais net saugiame perimetre, tikrinamos visos gaunamos užklausos ir taikomas minimaliosios prieigos teisės principas" },
    { id: "nccs_a_viii", kur: "ts", kada: "kritinis", galioja: "rekomenduojama", ts: "Saugumo naujinių palaikymas per visą produkto naudojimo laikotarpį" }
  ];

  var GALIOJA_T = {
    dabar: "Privaloma kibernetinio saugumo subjektams (ne vėliau kaip per 12 mėn. nuo įregistravimo)",
    cra: "Gamintojų pareiga nuo 2027-12-11 - reikalauti galima jau dabar",
    rekomenduojama: "Rekomenduojama - privaloma taps praėjus 6 mėn. po tinklo kodekso kontrolės priemonių patvirtinimo",
    praktika: "Jūsų sprendimas - jei taikote, laikykitės nuorodoje nurodytos taisyklės"
  };
  var KUR_T = { sps: "Pirkimo sąlygos (tiekėjų atranka)", sutartis: "Sutartis", ts: "Techninė specifikacija (produkto reikalavimai)", organizacija: "Organizacijos pareigos (ne pirkimo dokumentų turinys)" };

  var KLAUSIMAI = [
    { id: "irt", tekstas: "Ar pirkimas susijęs su tinklų ir informacinių sistemų projektavimu, kūrimu, diegimu, naudojimu, priežiūra, modernizavimu ar kibernetinio saugumo užtikrinimu?", raktas: "ksa_tvarka" },
    { id: "skaitmeniniai", tekstas: "Ar perkami produktai su skaitmeniniais elementais (programinė ar aparatinė įranga, kuri jungiama prie įrenginio ar tinklo)?", raktas: "cra_pirkimai" },
    { id: "kritinis", tekstas: "Ar perkami produktai ar paslaugos bus naudojami kaip ypatingos svarbos poveikio turtas (elektros sektoriaus tinklo kodeksas dėl kibernetinio saugumo)?", raktas: "nccs_patikra" }
  ];

  // rez - taikomas įstatymas (PI | VPI) įrašams, kurių nuoroda priklauso nuo jo (ts_standartai); ES ir Aprašo nuorodoms nesvarbu
  function cit(r, rez) { try { return global.GP_TEISE ? global.GP_TEISE.cit(r, rez || "PI") : ""; } catch (e) { return ""; } }
  function apie(r) { try { return global.GP_TEISE ? global.GP_TEISE.apie(r) : ""; } catch (e) { return ""; } }
  function didz(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }

  function taip(v) { return v === "taip" || v === true; }

  /* Ar pirkimo vykdytojui taikomas elektros sektoriaus tinklo kodeksas (Deleguotasis reglamentas (ES) 2024/1366 - „dėl tarpvalstybinių elektros
     energijos srautų kibernetinio saugumo aspektų“): true - elektros sektoriaus įmonė (GP_ORG `sektorius` "elektra"), false - kito sektoriaus
     (trečias pilotas 2026-11-20: AB „Amber Grid“, dujų perdavimas, gaudavo 12 tinklo kodekso punktų), null - vykdytojas nežinomas. */
  function tinkloKodeksas(org) {
    if (!org || !global.GP_ORG) return null;
    var x = (global.GP_ORG.pagalId && global.GP_ORG.pagalId(org)) || (global.GP_ORG.rask && global.GP_ORG.rask(org));
    if (!x || !x.sektorius) return null;
    return x.sektorius === "elektra";
  }

  /* parink(o): o = { irt, skaitmeniniai, kritinis, org } ("taip" | "ne" | null; org - GP_ORG id ar pavadinimas). Grąžina grupes pagal vietą ir
     neatsakytus klausimus. „kritinis“ klausiamas tik kai irt arba skaitmeniniai - „taip“ ir tinklo kodeksas gali būti taikomas. */
  function parink(o) {
    o = o || {};
    var trukumai = [], grupes = { sps: [], sutartis: [], ts: [], organizacija: [] };
    var tk = tinkloKodeksas(o.org);
    var org = o.org && global.GP_ORG ? ((global.GP_ORG.pagalId && global.GP_ORG.pagalId(o.org)) || (global.GP_ORG.rask && global.GP_ORG.rask(o.org))) : null;
    var rez = o.rezimas || (org && org.rezimasTiketinas) || "PI";
    ["irt", "skaitmeniniai"].forEach(function (k) { if (o[k] !== "taip" && o[k] !== "ne") trukumai.push(k); });
    var krit = (taip(o.irt) || taip(o.skaitmeniniai)) && tk !== false;
    if (krit && o.kritinis !== "taip" && o.kritinis !== "ne") trukumai.push("kritinis");
    var aktyvu = { irt: taip(o.irt), skaitmeniniai: taip(o.skaitmeniniai), kritinis: krit && taip(o.kritinis) };
    KATALOGAS.forEach(function (x) {
      if (!aktyvu[x.kada]) return;
      if (tk === false && /^nccs_/.test(x.id)) return;
      grupes[x.kur].push({ id: x.id, kur: x.kur, galioja: x.galioja, galiojaT: GALIOJA_T[x.galioja], cit: cit(x.id, rez),
        tekstas: x.ts || x.pav || didz(apie(x.id)), zodziai: x.zodziai || "" });
    });
    return { grupes: grupes, trukumai: trukumai, aktyvu: aktyvu, tinkloKodeksas: tk, kritinisKlausiamas: krit, kiek: grupes.sps.length + grupes.sutartis.length + grupes.ts.length + grupes.organizacija.length };
  }

  // TS skyriaus eilutės (produkto reikalavimai) su nuorodomis; susiję CRA punktai - viena eilute
  function tsEilutes(o) {
    // irt (2026-11-20) - ir tinklų ir informacinės sistemos funkcijos (kelių veiksnių tapatumo nustatymas); neperduotas - tik produkto reikalavimai
    var p = parink({ irt: (o && o.irt) || "ne", skaitmeniniai: o && o.skaitmeniniai, kritinis: o && o.kritinis, org: o && o.org });
    var praleisti = {}, out = [];
    p.grupes.ts.forEach(function (x) {
      if (praleisti[x.id]) return;
      var k = KATALOGAS.filter(function (y) { return y.id === x.id; })[0];
      var susije = (k.su || []).map(function (s) { praleisti[s] = 1; return KATALOGAS.filter(function (y) { return y.id === s; })[0]; });
      var tekstas = [k.ts].concat(susije.map(function (s) { return s.ts.charAt(0).toLowerCase() + s.ts.slice(1); })).join("; ");
      var nuor = [x.cit].concat(susije.map(function (s) { return cit(s.id); })).join("; ");
      out.push(tekstas + " (" + nuor + (x.galioja === "rekomenduojama" ? "; rekomenduojama" : "") + ").");
    });
    return out;
  }

  /* Siūlymas 1 žingsnio klausimams (trečias pilotas 2026-11-20, kaip GP_NZIA.siulymas): tik pagal BVPŽ kodo pradžią ir pavadinimo žodžius,
     nieko nepažymi - sprendžia žmogus. -> [{ k: "irt" | "skaitmeniniai", kilme }] */
  var SIUL_BVPZ = [
    { re: /^48/, k: ["irt", "skaitmeniniai"], kilme: "BVPŽ 48 - programinės įrangos paketai ir informacinės sistemos" },
    { re: /^72/, k: ["irt"], kilme: "BVPŽ 72 - IT paslaugos" },
    { re: /^302/, k: ["irt", "skaitmeniniai"], kilme: "BVPŽ 302 - kompiuterinė įranga" },
    { re: /^324/, k: ["irt", "skaitmeniniai"], kilme: "BVPŽ 324 - tinklų įranga" }
  ];
  var SIUL_ZODZIAI = /(^|[^a-z])(programin|licencij|informacin[a-z]*\s+sistem|scada|duomenu\s+baz|server|kompiuter|komutator|marsrutizator|kibernetin|debes[a-z]*\s+paslaug)/;
  function be(s) { return String(s || "").toLowerCase().replace(/[ąčęėįšųūž]/g, function (c) { return { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" }[c]; }); }
  function siulymas(o) {
    o = o || {};
    var out = {}, kodai = String(o.bvpz || "").match(/\d{8}/g) || [];
    kodai.forEach(function (kd) { SIUL_BVPZ.forEach(function (s) { if (s.re.test(kd)) s.k.forEach(function (x) { if (!out[x]) out[x] = s.kilme + " (" + kd + ")"; }); }); });
    var m = be(o.pavadinimas).match(SIUL_ZODZIAI);
    if (m && !out.irt) out.irt = "pavadinime - „" + m[2] + "...“";
    return Object.keys(out).map(function (x) { return { k: x, kilme: out[x] }; });
  }

  /* Kopijuojamas tekstas (trečias pilotas 2026-11-20, D2): Aprašo 33 ir 34 p. ir tinklo kodekso papunkčiai yra galininko sakinio dalys
     („tiekėjo atitiktį ...“), todėl kopijuojant pridedama juos valdanti įžanga ir kiekvienas punktas - atskira eilute su nuoroda. */
  var KOP_IZANGA = {
    sps: { ksa: "Pirkimo dokumentuose nustatyti tiekėjų atrankos kriterijus:", nccs: "Rekomenduojama pirkimo dokumentuose nustatyti:" },
    sutartis: { ksa: "Sutartyje su tiekėju numatyti:", nccs: "Rekomenduojama sutartyje numatyti:" },
    ts: { ksa: "Techninėje specifikacijoje:", nccs: "Techninėje specifikacijoje:", cra: "Techninėje specifikacijoje:" }
  };
  function kopijai(grupe, sar) {
    var iz = KOP_IZANGA[grupe] || {}, out = [], buvo = null;
    (sar || []).forEach(function (x) {
      var s = /^nccs_/.test(x.id) ? "nccs" : /^cra_/.test(x.id) ? "cra" : "ksa";
      var izanga = iz[s] || iz.ksa || "";
      if (izanga && izanga !== buvo) { if (out.length) out.push(""); out.push(izanga); buvo = izanga; }
      var tekstas = String(x.tekstas || "");
      if (grupe !== "ts" && !/^nccs_patikra$/.test(x.id)) tekstas = tekstas.charAt(0).toLowerCase() + tekstas.slice(1);
      out.push("- " + tekstas.replace(/[.;]\s*$/, "") + " (" + (x.cit || "") + ");");
    });
    return out.join("\n").replace(/;(\n\n|$)/g, ".$1");
  }

  global.GP_KIBER = { KATALOGAS: KATALOGAS, KLAUSIMAI: KLAUSIMAI, GALIOJA_T: GALIOJA_T, KUR_T: KUR_T, CRA_NUO: CRA_NUO, KONTEKSTAS: KONTEKSTAS,
    parink: parink, tsEilutes: tsEilutes, tinkloKodeksas: tinkloKodeksas, siulymas: siulymas, kopijai: kopijai };
})(typeof window !== "undefined" ? window : this);
