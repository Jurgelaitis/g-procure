/* ============================================================================
 * G-Procure  shared/pirkimo-byla.js   (window.GP_BYLA)
 * ----------------------------------------------------------------------------
 * PIRKIMO BYLOS EKSPORTAS ATVIRU FORMATU (2026-11-14, krypties 1.3 žingsnis,
 * naudotojo „Galime pradėti su 1.3“).
 *
 * Pirkimo kortelė su viskuo, ką apie pirkimą žino G-Procure šioje naršyklėje, - vienas
 * JSON failas, kurį galima perskaityti be G-Procure: pirkimo duomenys, sprendimai, grafikas,
 * vertinimo metodika, rinkos apžvalgos veiksmai, pakeitimų istorija ir laukų šaltiniai
 * (1.1), pakeitimų poveikis kitiems įrankiams (1.2) ir su kortele susietų pirkimo sąlygų
 * juodraščių aprašai. Formatą aprašo JSON Schema `shared/schemos/pirkimo-byla-1.schema.json`
 * (tie patys laukai, kaip čia; sargas shared/testai.html), žmogui - docs/pirkimo-byla/.
 *
 *  - sudaryk(k, { juodrasciai, poveikis, dabar }) - bylos objektas; kodų reikšmės žmogui (`reiksmes`)
 *    - lietuviškai ir angliškai, kad failą būtų galima skaityti be žodynų;
 *  - tekstas(byla) - JSON tekstas (2 tarpų įtrauka, UTF-8), failoVardas(k) - per GP_EKSPORTAS;
 *  - skaityk(tekstas) - NEPATIKIMAS failas -> { ok, kortele, info } arba { ok: false, kodas, klaida }:
 *    tik šio formato ir ne naujesnės versijos failas, tik žinomi kortelės laukai (kiti - neperkeliami
 *    ir suskaičiuojami), tekstų ilgio ir sąrašų ribos; tipus ir žodynus sutvarko GP_KORTELE.normalizuok
 *    (importuojant - GP_KORTELE.importuok).
 *
 * Bylos formato versija (VERSIJA) keičiama tik nesuderinamai pakeitus sandarą; nauji kortelės laukai -
 * be versijos keitimo (senas puslapis juos praleidžia ir pasako). Poveikis ir juodraščiai faile - tik
 * informacija apie eksportavimo momentą: įkeliant jie neįrašomi (poveikis apskaičiuojamas iš istorijos
 * iš naujo, juodraščiai lieka ten, kur buvo). Nieko nesiunčia ir neišsaugo.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var FORMATAS = "g-procure/pirkimo-byla";
  var VERSIJA = 1;
  var SCHEMOS_ADRESAS = "https://g-procure.com/shared/schemos/pirkimo-byla-1.schema.json";
  var DYDIS = 3 * 1024 * 1024;           // failo riba (įprasta byla - iki kelių šimtų KB; vertinimo priedas - iki 200 000 ženklų)
  var TEKSTO_RIBA = 2000;                // kortelės teksto lauko riba importuojant
  var SARASO_RIBA = 200;                 // dalių ir veiksmų riba importuojant

  /* Kortelės laukai byloje „pirkimas“ (tvarka - kaip faile). Istorija, kilmė ir peržiūros žymos - atskiri bylos laukai. */
  var PIRKIMO_LAUKAI = ["id", "sukurta", "atnaujinta", "pavadinimas", "numeris", "cvpisNr", "vykdytojas", "rezimas", "objektas", "bvpz",
    "verte", "budas", "dalys", "trukmeMen", "pradzia", "paskelbimas", "sutartiesData", "pasiulymuTerminas", "grafikas", "vertinimas",
    "iniciatorius", "organizatorius", "organizatoriausKontaktai", "kriterijus", "zaliasis", "nacsaugumas", "kvalifikacija", "cpo",
    "esLesos", "veiksmai", "busena", "archyvuota"];
  /* Laukai, kurių reikšmė - kodas ar sudėtinė: byloje dar ir tekstas žmogui (`reiksmes`). */
  var SKAITOMI = ["vykdytojas", "rezimas", "objektas", "verte", "budas", "dalys", "trukmeMen", "pasiulymuTerminas", "grafikas", "vertinimas",
    "kriterijus", "zaliasis", "nacsaugumas", "kvalifikacija", "cpo", "esLesos", "busena"];

  function K() { return global.GP_KORTELE; }
  function tekstasV(v) { return v == null ? "" : String(v); }
  function kopija(x) { return x === undefined ? null : JSON.parse(JSON.stringify(x)); }

  /* Bylos objektas. o: { juodrasciai: GP_POVEIKIS.juodrasciai() rezultatas, poveikis: GP_POVEIKIS.poveikis() rezultatas, dabar: ISO } */
  function sudaryk(k, o) {
    o = o || {};
    var KK = K();
    if (!KK || !k) return null;
    var n = KK.normalizuok(k);
    var pirkimas = {};
    PIRKIMO_LAUKAI.forEach(function (f) { pirkimas[f] = kopija(n[f]); });
    var reiksmes = { lt: {}, en: {} };
    ["lt", "en"].forEach(function (l) {
      SKAITOMI.forEach(function (f) {
        var t = KK.reiksmesTekstas(f, n[f], l);
        if (t) reiksmes[l][f] = t;
      });
    });
    var pov = o.poveikis || (global.GP_POVEIKIS ? global.GP_POVEIKIS.poveikis(n, { juodrasciai: o.juodrasciai, kalba: "lt" }) : null);
    var paveikti = pov ? pov.rezultatai.map(function (x) {
      return {
        rezultatas: x.rusis === "juodrastis" ? "juodrastis:" + x.juodrastis.id : x.rusis,
        pavadinimas: x.pavadinimas,
        irankis: x.irankis,
        sudaryta: x.sudaryta || null,
        priezastys: x.pakeitimai.map(function (p) { return global.GP_POVEIKIS.pakeitimoTekstas(p, "lt"); })
          .concat(x.neatitikimai.map(function (m) { return global.GP_POVEIKIS.neatitikimoTekstas(m, "lt"); }))
      };
    }) : [];
    var jd = o.juodrasciai && o.juodrasciai.busena === "yra" ? o.juodrasciai.sarasas.filter(function (j) { return j.kortele === n.id; })
      .map(function (j) { return { id: j.id, keista: j.keista, pavadinimas: j.pavadinimas, etapas: j.etapoPav }; }) : [];
    return {
      $schema: SCHEMOS_ADRESAS,
      formatas: FORMATAS,
      versija: VERSIJA,
      eksportuota: o.dabar || new Date().toISOString(),
      sistema: "G-Procure (https://g-procure.com)",
      pastaba: "Pirkimo kortelės duomenys iš vienos naršyklės, kaip juos įrašė naudotojas ir G-Procure įrankiai. Tai ne oficialus registro ar CVP IS įrašas. Faile gali būti asmenų vardai, kontaktai ir numatoma vertė.",
      pirkimas: pirkimas,
      reiksmes: reiksmes,
      istorija: kopija(n.istorija),
      istorijaPraleista: n.istorijaPraleista,
      kilme: kopija(n.kilme),
      poveikis: { perziureta: kopija(n.poveikisPerziureta), paveikti: paveikti },
      juodrasciai: jd
    };
  }

  function tekstas(byla) { return JSON.stringify(byla, null, 2) + "\n"; }

  function failoVardas(k) {
    var E = global.GP_EKSPORTAS;
    if (!E) return "pirkimo-byla.json";
    return E.failoVardas({ numeris: k && k.numeris, dokumentas: "Pirkimo-byla", pavadinimas: k && k.pavadinimas, pletinys: "json" });
  }

  /* Tekstas -> kortelė importui. Klaidų kodai: dydis, json, formatas, versija, pirkimas, pavadinimas. */
  function klaida(kodas, t) { return { ok: false, kodas: kodas, klaida: t }; }
  function skaityk(t) {
    var KK = K();
    if (!KK) return klaida("kita", "shared/pirkimo-kortele.js neprijungtas");
    if (typeof t !== "string") return klaida("json", "failas neperskaitytas");
    if (t.length > DYDIS) return klaida("dydis", "failas per didelis");
    var b;
    try { b = JSON.parse(t.replace(/^\uFEFF/, "")); } catch (e) { return klaida("json", "ne JSON failas"); }
    if (!b || typeof b !== "object" || b.formatas !== FORMATAS) return klaida("formatas", "ne pirkimo bylos failas");
    if (typeof b.versija !== "number" || !isFinite(b.versija) || b.versija < 1 || Math.floor(b.versija) !== b.versija) return klaida("formatas", "nenurodyta formato versija");
    if (b.versija > VERSIJA) return klaida("versija", "naujesnės versijos failas");
    var p = b.pirkimas;
    if (!p || typeof p !== "object" || Array.isArray(p)) return klaida("pirkimas", "faile nėra pirkimo duomenų");
    // tik žinomi kortelės laukai (nežinomi - neperkeliami ir suskaičiuojami); "__proto__" ir panašūs - taip pat
    var k = {}, nezinomi = [];
    Object.keys(p).forEach(function (f) {
      if (PIRKIMO_LAUKAI.indexOf(f) < 0) { nezinomi.push(f); return; }
      var v = p[f];
      if (typeof v === "string") v = v.slice(0, TEKSTO_RIBA);
      if ((f === "dalys" || f === "veiksmai") && Array.isArray(v)) v = v.slice(0, SARASO_RIBA);
      k[f] = v;
    });
    if (!tekstasV(k.pavadinimas).trim()) return klaida("pavadinimas", "kortelė be pavadinimo");
    if (typeof k.id !== "string" || !/^[A-Za-z0-9_-]{1,60}$/.test(k.id)) delete k.id;     // netinkamas - įkeliama kaip nauja kortelė
    k.istorija = Array.isArray(b.istorija) ? b.istorija : [];
    k.kilme = b.kilme && typeof b.kilme === "object" ? b.kilme : {};
    k.istorijaPraleista = b.istorijaPraleista;
    k.poveikisPerziureta = b.poveikis && typeof b.poveikis === "object" ? b.poveikis.perziureta : {};
    var n = KK.normalizuok(k);
    var ist = Array.isArray(b.istorija) ? b.istorija.length : 0;
    return {
      ok: true, kortele: n,
      info: {
        id: k.id ? n.id : null,
        eksportuota: typeof b.eksportuota === "string" && !isNaN(Date.parse(b.eksportuota)) ? b.eksportuota : "",
        nezinomi: nezinomi.slice(0, 40),
        istorijosIrasu: n.istorija.length,
        istorijaAtmesta: Math.max(0, Math.min(ist, KK.ISTORIJOS_RIBA) - n.istorija.length),
        juodrasciu: Array.isArray(b.juodrasciai) ? b.juodrasciai.length : 0
      }
    };
  }

  /* Klaidos priežastis žmogui (LT / EN). */
  var KLAIDOS = {
    lt: { dydis: "Failas per didelis (daugiau kaip 3 MB) - tai ne pirkimo bylos failas.", json: "Failo nepavyko perskaityti kaip JSON.",
      formatas: "Tai ne G-Procure pirkimo bylos failas.", versija: "Failas sudarytas naujesne G-Procure versija - šis puslapis jo neperskaito. Atnaujinkite puslapį.",
      pirkimas: "Faile nėra pirkimo duomenų.", pavadinimas: "Faile esanti kortelė be pavadinimo - neįkeliama.", kita: "Failo įkelti nepavyko." },
    en: { dydis: "The file is too large (over 3 MB) - it is not a procurement file.", json: "The file could not be read as JSON.",
      formatas: "This is not a G-Procure procurement file.", versija: "The file was made with a newer version of G-Procure - this page cannot read it. Reload the page.",
      pirkimas: "The file contains no procurement data.", pavadinimas: "The card in the file has no title - not imported.", kita: "The file could not be imported." }
  };
  function klaidosTekstas(kodas, l) { var t = KLAIDOS[l === "en" ? "en" : "lt"]; return t[kodas] || t.kita; }

  global.GP_BYLA = {
    version: "1.0",
    FORMATAS: FORMATAS, VERSIJA: VERSIJA, SCHEMOS_ADRESAS: SCHEMOS_ADRESAS, DYDIS: DYDIS,
    PIRKIMO_LAUKAI: PIRKIMO_LAUKAI, SKAITOMI: SKAITOMI,
    sudaryk: sudaryk, tekstas: tekstas, failoVardas: failoVardas, skaityk: skaityk, klaidosTekstas: klaidosTekstas
  };
})(typeof window !== "undefined" ? window : this);
