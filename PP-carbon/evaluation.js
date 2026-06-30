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

  // --- Pagrindine funkcija: ivertina ir surikiuoja pasiulymus ---
  // offers: [{ id, name, bidPrice, embodiedCarbon, annualOperational?, lifetimeYears? }]
  // Grazina: { model, opts, rows:[...], winner }
  //   row: { id, name, bidPrice, carbonKg, carbonT, carbonCost, adjustedPrice,
  //          score, priceScore, carbonScore, missingData, rank }
  function evaluate(offers, opts) {
    var o = mergeOpts(opts);
    offers = Array.isArray(offers) ? offers : [];

    // 1) Pirmas perejimas: apskaiciuoti kiekvieno anglies kieki (kg).
    var rows = offers.map(function (of) {
      var carbonKg = lifecycleCarbonKg(of, o);
      return {
        id: of.id,
        name: of.name,
        bidPrice: num(of.bidPrice, 0),
        carbonKg: carbonKg,           // gali buti null
        missingData: carbonKg === null
      };
    });

    // 2) Worst-case trukstamiems duomenims (didziausia atskleista anglis).
    var disclosed = rows.filter(function (r) { return r.carbonKg !== null; })
                        .map(function (r) { return r.carbonKg; });
    var worstCase = disclosed.length ? Math.max.apply(null, disclosed) : 0;

    var active = []; // pasiulymai, dalyvaujantys reitinge
    rows.forEach(function (r) {
      if (r.carbonKg === null) {
        if (o.missingDataPolicy === "exclude") {
          r.excluded = true;
          r.carbonKgEff = null;
        } else {
          // worstCase: priskiriam didziausia anglies kieki, kad neatskleidimas
          // nebutu apdovanojamas, ir pazymim.
          r.carbonKgEff = worstCase;
          r.assumedWorstCase = true;
        }
      } else {
        r.carbonKgEff = r.carbonKg;
      }
      if (!r.excluded) active.push(r);
    });

    // 3) Bendri dydziai abiems modeliams.
    active.forEach(function (r) {
      r.carbonT = r.carbonKgEff / 1000;
      r.carbonCost = round(r.carbonT * o.shadowPrice, 2);     // EUR
      r.adjustedPrice = round(r.bidPrice + r.carbonCost, 2);  // EUR (modelis A)
    });

    if (o.model === "B") {
      // Santykinis balas. Maziausia reiksme gauna visa svori.
      var prices = active.map(function (r) { return r.bidPrice; });
      var carbons = active.map(function (r) { return r.carbonKgEff; });
      var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
      var minCarbon = carbons.length ? Math.min.apply(null, carbons) : 0;
      active.forEach(function (r) {
        r.priceScore = r.bidPrice > 0 ? round(minPrice / r.bidPrice * o.priceWeight, 3) : 0;
        // Jei visi anglies = 0, anglies balas = pilnas svoris (nieks nediskriminuojamas).
        r.carbonScore = r.carbonKgEff > 0
          ? round(minCarbon / r.carbonKgEff * o.carbonWeight, 3)
          : o.carbonWeight;
        r.score = round(r.priceScore + r.carbonScore, 3);
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
      excluded: rows.filter(function (r) { return r.excluded; }),
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
