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

  /* kur: "sps" - pirkimo sąlygos (tiekėjų atranka), "sutartis", "ts" - techninė specifikacija (produkto reikalavimai),
          "organizacija" - organizacijos vidaus pareiga (ne pirkimo dokumentų turinys);
     kada: "irt" - pirkimas susijęs su tinklų ir informacinėmis sistemomis (Aprašo 32 p.), "skaitmeniniai" - perkami produktai su
           skaitmeniniais elementais (Kibernetinio atsparumo aktas), "kritinis" - ypatingos svarbos poveikio turtas (tinklo kodeksas);
     galioja: "dabar" | "cra" (gamintojų pareiga nuo 2027-12-11; reikalauti galima jau dabar) | "rekomenduojama". */
  var KATALOGAS = [
    { id: "ksa_33_1", kur: "sps", kada: "irt", galioja: "dabar", zodziai: "kibernetin[a-z]*\\s+saugum" },
    { id: "ksa_33_2", kur: "sps", kada: "irt", galioja: "dabar" },
    { id: "ksa_33_3", kur: "sps", kada: "irt", galioja: "dabar", zodziai: "priei[a-z]*\\s+([a-z]+\\s+){0,3}valdym" },
    { id: "nccs_atranka", kur: "sps", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_patikra", kur: "sps", kada: "kritinis", galioja: "rekomenduojama", pav: "Patikra pirkimo metu, ar IRT produktai, paslaugos ir procesai atitinka kibernetinio saugumo specifikacijas, ir jos dokumentavimas" },
    { id: "ksa_34_1", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "kibernetin[a-z]*\\s+saugum" },
    { id: "ksa_34_2", kur: "sutartis", kada: "irt", galioja: "dabar" },
    { id: "ksa_34_3", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "incident" },
    { id: "ksa_34_4", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "audit" },
    { id: "ksa_34_5", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "sprag|pazeidziam" },
    { id: "ksa_34_6", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "konfidencial" },
    { id: "ksa_34_7", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "paslaugu\\s+(teikimo\\s+)?lyg|sla([^a-z]|$)" },
    { id: "ksa_34_8", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "priei" },
    { id: "ksa_34_9", kur: "sutartis", kada: "irt", galioja: "dabar", zodziai: "patalp" },
    { id: "ksa_34_10", kur: "sutartis", kada: "irt", galioja: "dabar" },
    { id: "nccs_a_i", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_iv", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_v", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_vi", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_vii", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_ix", kur: "sutartis", kada: "irt", galioja: "rekomenduojama" },
    { id: "nccs_a_x", kur: "sps", kada: "irt", galioja: "rekomenduojama" },
    { id: "ksa_kontrole", kur: "organizacija", kada: "irt", galioja: "dabar" },
    { id: "ksa_rizika", kur: "organizacija", kada: "irt", galioja: "dabar" },
    { id: "ksa_sarasas", kur: "organizacija", kada: "irt", galioja: "dabar" },
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
    dabar: "Privaloma dabar (kibernetinio saugumo subjektams)",
    cra: "Gamintojų pareiga nuo 2027-12-11 - reikalauti galima jau dabar",
    rekomenduojama: "Rekomenduojama - privaloma taps praėjus 6 mėn. po tinklo kodekso kontrolės priemonių patvirtinimo"
  };
  var KUR_T = { sps: "Pirkimo sąlygos (tiekėjų atranka)", sutartis: "Sutartis", ts: "Techninė specifikacija (produkto reikalavimai)", organizacija: "Organizacijos pareigos (ne pirkimo dokumentų turinys)" };

  var KLAUSIMAI = [
    { id: "irt", tekstas: "Ar pirkimas susijęs su tinklų ir informacinių sistemų projektavimu, kūrimu, diegimu, naudojimu, priežiūra, modernizavimu ar kibernetinio saugumo užtikrinimu?", raktas: "ksa_tvarka" },
    { id: "skaitmeniniai", tekstas: "Ar perkami produktai su skaitmeniniais elementais (programinė ar aparatinė įranga, kuri jungiama prie įrenginio ar tinklo)?", raktas: "cra_pirkimai" },
    { id: "kritinis", tekstas: "Ar įsigyjama bus naudojama kaip ypatingos svarbos poveikio turtas (elektros sektoriaus tinklo kodeksas dėl kibernetinio saugumo)?", raktas: "nccs_patikra" }
  ];

  function cit(r) { try { return global.GP_TEISE ? global.GP_TEISE.cit(r) : ""; } catch (e) { return ""; } }
  function apie(r) { try { return global.GP_TEISE ? global.GP_TEISE.apie(r) : ""; } catch (e) { return ""; } }
  function didz(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }

  function taip(v) { return v === "taip" || v === true; }

  /* parink(o): o = { irt, skaitmeniniai, kritinis } ("taip" | "ne" | null). Grąžina grupes pagal vietą ir neatsakytus klausimus.
     „kritinis“ klausiamas tik kai irt arba skaitmeniniai - „taip“. */
  function parink(o) {
    o = o || {};
    var trukumai = [], grupes = { sps: [], sutartis: [], ts: [], organizacija: [] };
    ["irt", "skaitmeniniai"].forEach(function (k) { if (o[k] !== "taip" && o[k] !== "ne") trukumai.push(k); });
    var krit = (taip(o.irt) || taip(o.skaitmeniniai));
    if (krit && o.kritinis !== "taip" && o.kritinis !== "ne") trukumai.push("kritinis");
    var aktyvu = { irt: taip(o.irt), skaitmeniniai: taip(o.skaitmeniniai), kritinis: krit && taip(o.kritinis) };
    KATALOGAS.forEach(function (x) {
      if (!aktyvu[x.kada]) return;
      grupes[x.kur].push({ id: x.id, kur: x.kur, galioja: x.galioja, galiojaT: GALIOJA_T[x.galioja], cit: cit(x.id),
        tekstas: x.ts || x.pav || didz(apie(x.id)), zodziai: x.zodziai || "" });
    });
    return { grupes: grupes, trukumai: trukumai, aktyvu: aktyvu, kiek: grupes.sps.length + grupes.sutartis.length + grupes.ts.length + grupes.organizacija.length };
  }

  // TS skyriaus eilutės (produkto reikalavimai) su nuorodomis; susiję CRA punktai - viena eilute
  function tsEilutes(o) {
    var p = parink({ irt: "ne", skaitmeniniai: o && o.skaitmeniniai, kritinis: o && o.kritinis });
    var praleisti = {}, out = [];
    p.grupes.ts.forEach(function (x) {
      if (praleisti[x.id]) return;
      var k = KATALOGAS.filter(function (y) { return y.id === x.id; })[0];
      var susije = (k.su || []).map(function (s) { praleisti[s] = 1; return KATALOGAS.filter(function (y) { return y.id === s; })[0]; });
      var tekstas = [k.ts].concat(susije.map(function (s) { return s.ts.charAt(0).toLowerCase() + s.ts.slice(1); })).join("; ");
      var nuor = [cit(k.id)].concat(susije.map(function (s) { return cit(s.id); })).join("; ");
      out.push(tekstas + " (" + nuor + (x.galioja === "rekomenduojama" ? "; rekomenduojama" : "") + ").");
    });
    return out;
  }

  global.GP_KIBER = { KATALOGAS: KATALOGAS, KLAUSIMAI: KLAUSIMAI, GALIOJA_T: GALIOJA_T, KUR_T: KUR_T, CRA_NUO: CRA_NUO, parink: parink, tsEilutes: tsEilutes };
})(typeof window !== "undefined" ? window : this);
