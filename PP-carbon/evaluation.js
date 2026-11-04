/* ============================================================================
 * G-Procure  pp-carbon/evaluation.js   (v0.1 - Faze 2 branduolys)
 * Pasiulymu vertinimo logika: anglies pedsako itraukimas i pirkimo sprendima.
 *
 * Du modeliai (abu suderinami su VPI/PI MEAT - ekonomiskai naudingiausias
 * pasiulymas), pasirenkami per opts.model:
 *
 *  A (PAGRINDINIS) - "monetizacija" / anglimi pakoreguota kaina:
 *      tiekejo SESD (t CO2e) x sesseline CO2 kaina (EUR/t) = anglies kaina (EUR),
 *      pridedama prie pasiulymo kainos -> laimi maziausia pakoreguota kaina (TCO).
 *      Sesseline kaina = slankiklis (vienas skaicius), todel reitingas keiciasi
 *      realiu laiku, kai keiti kaina. Tai gryniausias, objektyvus, gintinas modelis.
 *
 *  B (PASIRENKAMAS) - "svoriai" / santykinis balas:
 *      atskiri kainos balai + atskiri anglies balai su lyginamaisiais svoriais
 *      (pvz. kaina 80 / anglis 20). Naudoja standartine LT santykine formule
 *      (maziausia reiksme gauna visus to kriterijaus balus, kitos proporcingai).
 *
 * VIENETAI (svarbu - vienas tiesos saltinis):
 *  - bidPrice          : EUR (pasiulymo kaina)
 *  - embodiedCarbon    : kg CO2e (A1-A3 is EPD/PCF; nuoseklu su carbon-factors.js)
 *  - annualOperational : kg CO2e / metus (eksploataciniai nuostoliai, pvz. SF6, savos reikmes)
 *  - lifetimeYears     : metai (gyvavimo ciklas)
 *  - shadowPrice       : EUR / t CO2e (sesseline anglies kaina)
 *  Viduje anglis skaiciuojama kg, i tonas konvertuojama TIK pries dauginant is
 *  EUR/t kainos (totalCarbonKg / 1000 * shadowPrice).
 *
 * TRUKSTAMI DUOMENYS (embodiedCarbon == null, t.y. nera PCF/EPD):
 *  Pagal metodikos konservatyvumo taisykle (jei tikslumas mazas, rinktis
 *  prielaida, duodancia DIDESNI SESD) ir kad NEbutu skatinamas neatskleidimas,
 *  tokiam pasiulymui priskiriama worst-case anglis (didziausia tarp atskleistu
 *  pasiulymu) ir pazymima missingData:true. UI turi tai aiskiai parodyti.
 *  Elgesi galima keisti per opts.missingDataPolicy ("worstCase" | "exclude").
 *
 * TEISINIS SAUGIKLIS: anglis kaip sutarties sudarymo kriterijus leidziama, BET
 * turi buti objektyvi, nediskriminuojanti, susijusi su pirkimo objektu ir
 * paskelbta pirkimo dokumentuose. Sis modulis - pagalbine priemone, ne galutinis
 * verdiktas; sprendima priima komisija.
 *
 * 2026-11-04 (naujo naudotojo patikra K4, D3): eilutė be kainos (ir, su opts.reikalautiVardo, be tiekėjo), su neigiama ar neperskaityta
 * anglimi (of.klaida) į reitingą nepatenka: excluded su priezastis (iki tol tuščias pasiūlymas modelyje A laimėdavo, o modelyje B
 * mažiausia kaina 0 visiems duodavo 0 balų, neigiama anglis laimėdavo). Kai PCF nepateikė niekas - anglis nežinoma (carbonT null,
 * bePcf: true), ne 0 t: reitingas tik pagal kainą. Neatskleidęs gauna didžiausią KITŲ reikšmę, todėl neatskleidimas gali būti naudingas,
 * jei tikroji didesnė - sąsaja tai sako (iki tol „nesuteikia pranašumo“).
 *
 * Naudojimas:  <script src="evaluation.js"></script>  ->  window.GP_CARBON_EVAL
 * ========================================================================== */
(function (root) {
  "use strict";

  // Numatytosios reiksmes. shadowPrice - PLACEHOLDER, patvirtinti su metodikos
  // savininku (Priedas Nr. 1 / PP-cost-benefit). Slankiklis ji perraso.
  var DEFAULTS = {
    shadowPrice: 100,          // EUR / t CO2e  [PLACEHOLDER - patvirtinti]
    lifetimeYears: 30,         // tipinis perdavimo irangos gyvavimo ciklas
    model: "A",                // "A" = monetizacija, "B" = svoriai
    priceWeight: 80,           // modeliui B (lyginamasis kainos svoris)
    carbonWeight: 20,          // modeliui B (lyginamasis anglies svoris)
    missingDataPolicy: "worstCase" // "worstCase" | "exclude"
  };

  // --- Pagalbines ---
  function num(x, fallback) {
    var n = Number(x);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }

  function round(x, dp) {
    var f = Math.pow(10, dp || 0);
    return Math.round((num(x) + Number.EPSILON) * f) / f;
  }

  // Viso gyvavimo ciklo anglis vienam pasiulymui, kg CO2e.
  // = iterptoji (A1-A3) + eksploataciniai nuostoliai per visa gyvavimo cikla.
  // Grazina null, jei iterptoji anglis neatskleista (nera PCF).
  function lifecycleCarbonKg(offer, opts) {
    if (offer.embodiedCarbon === null || offer.embodiedCarbon === undefined) {
      return null;
    }
    var years = num(offer.lifetimeYears, opts.lifetimeYears);
    var embodied = num(offer.embodiedCarbon, 0);
    var annualOp = num(offer.annualOperational, 0);
    return embodied + annualOp * years;
  }

  // Normalizuoja opts su numatytosiomis reiksmemis.
  function mergeOpts(opts) {
    opts = opts || {};
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    for (var j in opts) if (opts[j] !== undefined && opts[j] !== null) o[j] = opts[j];
    return o;
  }

  // Kodel eilute negali buti vertinama: "kaina" (nera teigiamos kainos), "anglis" (neigiama ar neperskaityta), "vardas" (su opts.reikalautiVardo)
  function netinkamumas(of, o) {
    if (o.reikalautiVardo && !String(of.name == null ? "" : of.name).trim()) return "vardas";
    if (of.klaida === "kaina" || !(num(of.bidPrice, 0) > 0)) return "kaina";
    if (of.klaida === "anglis" || num(of.embodiedCarbon, 0) < 0 || num(of.annualOperational, 0) < 0) return "anglis";
    return "";
  }

  // --- Pagrindine funkcija: ivertina ir surikiuoja pasiulymus ---
  // offers: [{ id, name, bidPrice, embodiedCarbon, annualOperational?, lifetimeYears? }]
  // Grazina: { model, opts, rows:[...], excluded:[{ id, name, priezastis }], bePcf, winner }
  //   row: { id, name, bidPrice, carbonKg, carbonT, carbonCost, adjustedPrice,
  //          score, priceScore, carbonScore, missingData, rank }
  function evaluate(offers, opts) {
    var o = mergeOpts(opts);
    offers = Array.isArray(offers) ? offers : [];

    // 1) Pirmas perejimas: netinkamos eilutes - i reitinga nepatenka (ir pasakoma); kitoms - anglies kiekis (kg).
    var neitraukti = [];
    var rows = [];
    offers.forEach(function (of) {
      var r = { id: of.id, name: of.name, bidPrice: num(of.bidPrice, 0) };
      var priezastis = netinkamumas(of, o);
      if (priezastis) {
        r.excluded = true; r.priezastis = priezastis;
        neitraukti.push(r);
        return;
      }
      r.carbonKg = lifecycleCarbonKg(of, o);   // gali buti null
      r.missingData = r.carbonKg === null;
      rows.push(r);
    });

    // 2) Trukstami duomenys: didziausia KITU atskleista anglis (neatskleidimas nebutu apdovanojamas). Nieko neatskleidus - anglis nezinoma.
    var disclosed = rows.filter(function (r) { return r.carbonKg !== null; })
                        .map(function (r) { return r.carbonKg; });
    var worstCase = disclosed.length ? Math.max.apply(null, disclosed) : null;

    var active = []; // pasiulymai, dalyvaujantys reitinge
    rows.forEach(function (r) {
      if (r.carbonKg === null) {
        if (o.missingDataPolicy === "exclude") {
          r.excluded = true;
          r.priezastis = "pcf";
          r.carbonKgEff = null;
          neitraukti.push(r);
        } else {
          r.carbonKgEff = worstCase;
          r.assumedWorstCase = worstCase !== null;
        }
      } else {
        r.carbonKgEff = r.carbonKg;
      }
      if (!r.excluded) active.push(r);
    });
    var bePcf = worstCase === null;

    // 3) Bendri dydziai abiems modeliams. Anglis nezinoma - ne 0 t.
    active.forEach(function (r) {
      r.carbonT = bePcf ? null : r.carbonKgEff / 1000;
      r.carbonCost = bePcf ? null : round(r.carbonT * o.shadowPrice, 2);   // EUR
      r.adjustedPrice = round(r.bidPrice + (r.carbonCost || 0), 2);         // EUR (modelis A)
    });

    if (o.model === "B") {
      // Santykinis balas. Maziausia reiksme gauna visa svori.
      var prices = active.map(function (r) { return r.bidPrice; });
      var carbons = active.map(function (r) { return r.carbonKgEff; });
      var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
      var minCarbon = !bePcf && carbons.length ? Math.min.apply(null, carbons) : 0;
      active.forEach(function (r) {
        r.priceScore = round(minPrice / r.bidPrice * o.priceWeight, 3);
        // Jei visi anglies = 0, anglies balas = pilnas svoris (nieks nediskriminuojamas). Anglis nezinoma - balo nera.
        r.carbonScore = bePcf ? null : (r.carbonKgEff > 0
          ? round(minCarbon / r.carbonKgEff * o.carbonWeight, 3)
          : o.carbonWeight);
        r.score = round(r.priceScore + (r.carbonScore || 0), 3);
      });
      // Reitingas: daugiausia balu - geriausia.
      active.sort(function (a, b) { return b.score - a.score; });
    } else {
      // Modelis A: maziausia pakoreguota kaina - geriausia.
      active.sort(function (a, b) { return a.adjustedPrice - b.adjustedPrice; });
    }

    active.forEach(function (r, i) { r.rank = i + 1; });

    return {
      model: o.model,
      opts: o,
      rows: active,
      excluded: neitraukti,
      bePcf: bePcf && active.length > 0,
      winner: active.length ? active[0] : null,
      worstCaseKg: worstCase
    };
  }

  // --- Slankiklio pagalbininkas: ties kuria sesseline kaina reitingas pasikeicia? ---
  // Tarp dvieju pasiulymu A ir B (modelis A): adjustedA == adjustedB, kai
  //   priceA + cA/1000*p = priceB + cB/1000*p
  //   p = (priceB - priceA) / ((cA - cB)/1000)
  // Grazina luzio kaina EUR/t arba null, jei lygiagretus (anglis vienoda) arba neigiama.
  function crossoverPrice(a, b) {
    if (a.carbonKgEff === null || b.carbonKgEff === null) return null;   // anglis nezinoma - luzio kainos nera
    var ca = num(a.carbonKgEff, a.carbonKg);
    var cb = num(b.carbonKgEff, b.carbonKg);
    var dC = (ca - cb) / 1000;
    if (dC === 0) return null;
    var p = (num(b.bidPrice) - num(a.bidPrice)) / dC;
    return p >= 0 ? round(p, 2) : null;
  }

  root.GP_CARBON_EVAL = {
    version: "0.1",
    DEFAULTS: DEFAULTS,
    lifecycleCarbonKg: lifecycleCarbonKg,
    evaluate: evaluate,
    crossoverPrice: crossoverPrice
  };
})(typeof window !== "undefined" ? window : this);
