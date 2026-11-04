/* ============================================================================
 * G-Procure  pp-carbon/reports.js   (v0.2 - Fazė 4 branduolys)
 * Ataskaitų modelio kūrimas iš jau turimų pp-carbon duomenų.
 *
 * SVARBU - šis failas NESKAIČIUOJA naujos logikos, o SURENKA ir PERFORMATUOJA
 * jau turimus duomenis (projekto ŠESD, pasiūlymų vertinimas) į ataskaitos
 * modelį skirtingoms auditorijoms. Modelis yra "renderer-agnostic" - UI jį
 * paverčia .docx arba HTML peržiūra.
 *
 *  A) VIDAUS vertinimas  -> buildInternalReport(data): pilnas detalumas,
 *     visi duomenys, įskaitant tiekėjų kainas ir vardus, EPD šaltinius.
 *  D) VIEŠAS / auditorių pjūvis -> buildPublicReport(data): JAUTRŪS duomenys
 *     PAŠALINAMI (tiekėjų vardai, visos piniginės reikšmės, EPD failų vardai,
 *     vidinis kodas). LIEKA: projekto ŠESD pagal etapus, anglies palyginimas
 *     (t CO2e) ir reitingas, metodinis pagrindas, kas neįtraukta ir kas prielaida.
 *
 * ĮĖJIMO KONTRAKTAS (UI normalizuoja Store -> šį objektą):
 *  data = {
 *    kalba: "lt" | "en",
 *    project: { name, code, subject, type, period, date (parengimo), lifetimeYears },
 *    stages:  [ { key, label, totalKg, any } ],    // any: false - etape neįvesta nieko
 *    totalKg, reviewKg,
 *    pendingEpd: [ { label } ],                    // laukia EPD (NEįtraukta į sumą)
 *    klaidos: <eilučių su netinkamu skaičiumi skaičius>,
 *    epdSources: [ { factorLabel, value, unit, page, fileName, indicator, basis, validUntil, pakeistaRanka, buvusiReiksme, ranka } ],
 *    diReiksmes: <patvirtintų DI reikšmių skaičius>,
 *    evaluation: { model, shadowPrice, priceWeight, carbonWeight, bePcf,
 *      offers: [ { name, bidPrice, carbonT, carbonCost, adjustedPrice, priceScore, carbonScore, score, rank, missingData } ],
 *      excluded: [ { name, priezastis } ], winner: { name } }
 *  }
 *
 * IŠĖJIMAS: { audience, kalba, title, meta:[{label,value}], di,
 *   sections:[{heading,paragraphs:[],tables:[{columns:[],widths:[],rows:[[...]]}], di}], disclaimer }
 *
 * 2026-11-04 (naujo naudotojo patikra K1, K7, K8, K9, K10, V3, V4): tekstai LT ir EN; suma įvardyta pagal tai, kas sudėta (visos
 * įvestos eilutės, ne „A1-A3“); skyrius „Kas neįtraukta ir prielaidos“ abiejuose pjūviuose (
 * laukiančios EPD pozicijos, tikslinami faktoriai, neatskleistas pėdsakas - „nenurodyta“, ne „0 t“); lentelė pagal naudotą modelį
 * (iki tol B modelio ataskaita rodė A stulpelius, o viešas pjūvis visada sakė „anglimi pakoreguota kaina“); ranka pakeista EPD reikšmė
 * pažymima, išvalyta - neįtraukiama; skaičiai pagal kalbą („0,1 %“, „3,334 t“, iki tol „0.1 %“); „IŠ VISO 0 kg 100 %“ nebėra.
 *
 * Naudojimas:  <script src="reports.js"></script>  ->  window.GP_REPORTS
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.2";

  var TX = {
    lt: {
      method: "GHG Protocol; EN 15804 (A1-A3); prielaidos - pagal Litgrid projektų ŠESD vertinimo praktiką",
      disc_int: "Vidaus dokumentas. Anglies pėdsako vertinimas - pagalbinė priemonė, ne galutinis verdiktas. Šešėlinė CO2 kaina - patvirtinti su už ŠESD vertinimą atsakingais specialistais. Faktoriai, pažymėti „laukia EPD“ ar „tikslinama“, dar tikslinami.",
      disc_pub: "Viešas pjūvis. Pateikiami tik apibendrinti anglies pėdsako duomenys. Komercinė informacija (tiekėjų kainos ir tapatybė) nerodoma. Rezultatai preliminarūs: dalis taršos faktorių dar tikslinama. Metodinis pagrindas: ",
      project: "Projektas", code: "Kodas", subject: "Perkantysis subjektas", type: "Projekto tipas", period: "Ataskaitinis laikotarpis", date: "Parengta",
      life: "Gyvavimo ciklas", life_v: " m.", method_l: "Metodinis pagrindas",
      stages_h: "Projekto ŠESD pagal etapus",
      stages_p: "Bendras projekto šiltnamio efektą sukeliančių dujų kiekis (visos įvestos skaičiuoklės eilutės): {t} CO2e.",
      stages_inc: "Įtraukti etapai: {l}.",
      stages_none: "Skaičiuoklėje kiekių dar neįvesta.",
      col_stage: "Etapas", col_sesd: "ŠESD", col_share: "Dalis", total: "IŠ VISO", not_entered: "neįvesta",
      limits_h: "Kas neįtraukta ir prielaidos",
      pending: "Laukia gamintojo EPD ir į sumą neįtraukta ({n}): {l}.",
      errors: "Eilučių su netinkamu skaičiumi, neįtrauktų į sumą: {n}.",
      review: "Tikslinami taršos faktoriai sudaro {t} ({p}) sumos: rezultatai preliminarūs.",
      review_pub: "Dalis taršos faktorių dar tikslinama, todėl rezultatai preliminarūs.",
      names_en: "",
      epd_h: "EPD šaltiniai (audito pėdsakas)",
      epd_p: "A1-A3 reikšmės, kurias pasiūlė DI ir patvirtino vertintojas. Pakeistos ar įrašytos ranka - pažymėtos stulpelyje „Kilmė“.",
      c_factor: "Faktorius", c_value: "Reikšmė", c_unit: "Vienetas", c_ind: "Rodiklis", c_page: "Psl.", c_doc: "Dokumentas", c_src: "Kilmė",
      s_ok: "DI pasiūlė, vertintojas patvirtino", s_hand: "Vertintojas įrašė pats, patikrinęs dokumente", s_changed: "Pakeista ranka (EPD rodė {v})",
      valid: "galioja iki {d}",
      ev_h: "Pasiūlymų vertinimas", m_a: "A - anglimi pakoreguota kaina", m_b: "B - svoriai",
      ev_model: "Modelis: {m}. ", ev_shadow: "Šešėlinė CO2 kaina: {x} EUR/t CO2e.", ev_w: "Svoriai: kaina {a}, anglis {b}.",
      best: "Geriausias pasiūlymas: {n}.", no_pcf: "Nė vienas pasiūlymas anglies pėdsako nenurodė - anglies pėdsakas nevertintas, reitingas tik pagal kainą.",
      miss: " (anglies pėdsakas nenurodytas - taikyta didžiausia kitų reikšmė)",
      c_rank: "Vieta", c_sup: "Tiekėjas", c_price: "Kaina", c_carbon: "Anglis", c_cc: "Anglies kaina", c_adj: "Pakoreguota kaina", c_ps: "Kainos balas", c_cs: "Anglies balas", c_tot: "Viso balų",
      excl: "Į reitingą neįtraukta: {l}.", ex_kaina: "nenurodyta kaina", ex_vardas: "nenurodytas tiekėjas", ex_anglis: "netinkama anglies reikšmė", ex_pcf: "nenurodytas anglies pėdsakas", ex_noname: "eilutė be pavadinimo",
      not_given: "nenurodyta",
      pub_h: "Pasiūlymų anglies pėdsako palyginimas",
      pub_p: "Tiekėjų pasiūlymai įvertinti pagal viso gyvavimo ciklo anglies pėdsaką. Tiekėjų tapatybė ir kainos šioje viešoje versijoje nerodomos.",
      pub_a: "Vertinimo metodas: anglimi pakoreguota kaina (ekonomiškai naudingiausio pasiūlymo kriterijus).",
      pub_b: "Vertinimo metodas: kainos ir anglies balai, svoriai {a} ir {b} (ekonomiškai naudingiausio pasiūlymo kriterijus).",
      c_offer: "Pasiūlymas", c_foot: "Anglies pėdsakas", supplier: "Tiekėjas ",
      pub_miss: "nenurodyta; vertinime taikyta {t} CO2e (didžiausia kitų nurodyta reikšmė)",
      title_int: "Anglies pėdsako ataskaita - vidaus vertinimas", title_pub: "Anglies pėdsako ataskaita - viešas pjūvis"
    },
    en: {
      method: "GHG Protocol; EN 15804 (A1-A3); assumptions follow Litgrid's project GHG assessment practice",
      disc_int: "Internal document. The carbon footprint assessment is a supporting tool, not a final verdict. The shadow CO2 price is to be confirmed with the specialists responsible for GHG assessment. Factors marked “awaiting EPD” or “being refined” are still being refined.",
      disc_pub: "Public summary. Only aggregated carbon footprint data is shown. Commercial information (supplier prices and identity) is not shown. Results are preliminary: some emission factors are still being refined. Methodological basis: ",
      project: "Project", code: "Code", subject: "Contracting entity", type: "Project type", period: "Reporting period", date: "Prepared on",
      life: "Lifetime", life_v: " yrs", method_l: "Methodological basis",
      stages_h: "Project GHG by stage",
      stages_p: "Total project greenhouse gas amount (all entered calculator lines): {t} CO2e.",
      stages_inc: "Stages included: {l}.",
      stages_none: "No quantities have been entered in the calculator yet.",
      col_stage: "Stage", col_sesd: "GHG", col_share: "Share", total: "TOTAL", not_entered: "not entered",
      limits_h: "What is excluded and what is assumed",
      pending: "Awaiting the manufacturer EPD and excluded from the total ({n}): {l}.",
      errors: "Lines with an invalid number, excluded from the total: {n}.",
      review: "Emission factors still being refined make up {t} ({p}) of the total: results are preliminary.",
      review_pub: "Some emission factors are still being refined, so results are preliminary.",
      names_en: "Emission factor names are shown in Lithuanian: the factor library is kept in one language.",
      epd_h: "EPD sources (audit trail)",
      epd_p: "A1-A3 values suggested by AI and confirmed by the evaluator. Values changed or entered by hand are marked in the “Origin” column.",
      c_factor: "Factor", c_value: "Value", c_unit: "Unit", c_ind: "Indicator", c_page: "Page", c_doc: "Document", c_src: "Origin",
      s_ok: "Suggested by AI, confirmed by the evaluator", s_hand: "Entered by the evaluator after checking the document", s_changed: "Changed by hand (the EPD showed {v})",
      valid: "valid until {d}",
      ev_h: "Bid assessment", m_a: "A - carbon-adjusted price", m_b: "B - weights",
      ev_model: "Model: {m}. ", ev_shadow: "Shadow CO2 price: {x} EUR/t CO2e.", ev_w: "Weights: price {a}, carbon {b}.",
      best: "Best offer: {n}.", no_pcf: "No offer stated a carbon footprint - the carbon footprint was not assessed and the ranking is by price only.",
      miss: " (carbon footprint not stated - the highest value of the others applied)",
      c_rank: "Rank", c_sup: "Supplier", c_price: "Price", c_carbon: "Carbon", c_cc: "Carbon cost", c_adj: "Adjusted price", c_ps: "Price score", c_cs: "Carbon score", c_tot: "Total score",
      excl: "Not included in the ranking: {l}.", ex_kaina: "no price", ex_vardas: "no supplier", ex_anglis: "invalid carbon value", ex_pcf: "carbon footprint not stated", ex_noname: "unnamed line",
      not_given: "not stated",
      pub_h: "Comparison of the bids' carbon footprint",
      pub_p: "Supplier bids were assessed by their whole life cycle carbon footprint. Supplier identity and prices are not shown in this public version.",
      pub_a: "Evaluation method: carbon-adjusted price (most economically advantageous tender criterion).",
      pub_b: "Evaluation method: price and carbon scores, weights {a} and {b} (most economically advantageous tender criterion).",
      c_offer: "Bid", c_foot: "Carbon footprint", supplier: "Supplier ",
      pub_miss: "not stated; {t} CO2e applied in the assessment (the highest value stated by the others)",
      title_int: "Carbon footprint report - internal evaluation", title_pub: "Carbon footprint report - public summary"
    }
  };

  // --- Pagalbinės ---
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function str(x) { return x === null || x === undefined ? "" : String(x); }
  function round(x, dp) { var f = Math.pow(10, dp || 0); return Math.round(num(x) * f) / f; }
  function kalba(data) { return data && data.kalba === "en" ? "en" : "lt"; }
  function fx(k) {
    var vieta = k === "en" ? "en-GB" : "lt-LT";
    function sk(x, dp) { return round(x, dp).toLocaleString(vieta, { maximumFractionDigits: dp }); }
    return {
      sk: sk,
      eur: function (x) { return sk(x, 2) + " EUR"; },
      kg: function (x) { return sk(x, 1) + " kg"; },
      t: function (x) { return sk(x, 3) + " t"; },
      pct: function (x) { return sk(x, 1) + " %"; },
      tiksliai: function (x) { return num(x).toLocaleString(vieta, { maximumFractionDigits: 6 }); }
    };
  }
  function pakeisk(t, m) { return String(t).replace(/\{(\w+)\}/g, function (v, k) { return k in m ? m[k] : v; }); }

  function projectMeta(p, X) {
    p = p || {};
    var m = [];
    if (p.name) m.push({ label: X.project, value: str(p.name) });
    if (p.code) m.push({ label: X.code, value: str(p.code) });
    if (p.subject) m.push({ label: X.subject, value: str(p.subject) });
    if (p.type) m.push({ label: X.type, value: str(p.type) });
    if (p.period) m.push({ label: X.period, value: str(p.period) });
    if (p.date) m.push({ label: X.date, value: str(p.date) });
    if (p.lifetimeYears) m.push({ label: X.life, value: num(p.lifetimeYears) + X.life_v });
    m.push({ label: X.method_l, value: X.method });
    return m;
  }

  // Etapų lentelė su dalimi procentais. Naudojama abiem auditorijom (nejautri).
  function stagesSection(data, X, F) {
    var stages = Array.isArray(data.stages) ? data.stages : [];
    var total = num(data.totalKg, 0);
    var rows = stages.map(function (s) {
      if (s.any === false) return [str(s.label), X.not_entered, "-"];
      var kg = num(s.totalKg, 0);
      return [str(s.label), F.kg(kg), total > 0 ? F.pct(kg / total * 100) : "-"];
    });
    rows.push([X.total, total > 0 ? F.kg(total) : "-", total > 0 ? "100 %" : "-"]);
    var itraukti = stages.filter(function (s) { return s.any === true; }).map(function (s) { return str(s.label); });
    var par = total > 0 ? [pakeisk(X.stages_p, { t: F.t(total / 1000) })] : [X.stages_none];
    if (itraukti.length) par.push(pakeisk(X.stages_inc, { l: itraukti.join(", ") }));
    return { heading: X.stages_h, paragraphs: par, tables: [{ columns: [X.col_stage, X.col_sesd, X.col_share], widths: [0.56, 0.26, 0.18], rows: rows }] };
  }

  // Kas neįtraukta ir prielaidos: abiem auditorijom; sąrašas tuščias - skyriaus nėra.
  function limitsSection(data, X, F, viesas) {
    var total = num(data.totalKg, 0), par = [];
    var pending = Array.isArray(data.pendingEpd) ? data.pendingEpd : [];
    if (pending.length) par.push(pakeisk(X.pending, { n: pending.length, l: pending.map(function (p) { return str(p.label); }).join(", ") }));
    if (num(data.klaidos) > 0) par.push(pakeisk(X.errors, { n: num(data.klaidos) }));
    var rev = num(data.reviewKg, 0);
    if (viesas) par.push(X.review_pub);
    else if (rev > 0 && total > 0) par.push(pakeisk(X.review, { t: F.t(rev / 1000) + " CO2e", p: F.pct(rev / total * 100) }));
    if (X.names_en && (pending.length || (Array.isArray(data.epdSources) && data.epdSources.length))) par.push(X.names_en);
    return par.length ? { heading: X.limits_h, paragraphs: par, tables: [] } : null;
  }

  function neitrauktiTekstas(ev, X, viesas) {
    var ex = Array.isArray(ev.excluded) ? ev.excluded : [];
    if (!ex.length) return "";
    var sar = ex.map(function (e, i) {
      var pr = X["ex_" + (e.priezastis || "kaina")] || X.ex_kaina;
      // Viešame pjūvyje - tik priežastis: tiekėjo tapatybė nerodoma
      return viesas ? pr : (str(e.name).trim() || X.ex_noname) + " - " + pr;
    });
    return pakeisk(X.excl, { l: sar.join("; ") });
  }

  // --- A) VIDAUS ataskaita (pilna) ---
  function buildInternalReport(data) {
    data = data || {};
    var k = kalba(data), X = TX[k], F = fx(k);
    var sections = [stagesSection(data, X, F)];

    var lim = limitsSection(data, X, F, false);
    if (lim) sections.push(lim);

    // EPD šaltiniai (audito pėdsakas) - su failų vardais (vidaus). Išvalyta reikšmė - eilutės nėra.
    var epd = (Array.isArray(data.epdSources) ? data.epdSources : []).filter(function (e) { return e && e.value !== null && e.value !== undefined && isFinite(Number(e.value)); });
    if (epd.length) {
      sections.push({
        heading: X.epd_h, di: true,
        paragraphs: [X.epd_p],
        tables: [{
          columns: [X.c_factor, X.c_value, X.c_unit, X.c_ind, X.c_page, X.c_doc, X.c_src],
          widths: [0.2, 0.1, 0.11, 0.15, 0.06, 0.18, 0.2],
          rows: epd.map(function (e) {
            var rodiklis = [str(e.indicator), str(e.basis), e.validUntil ? pakeisk(X.valid, { d: str(e.validUntil) }) : ""].filter(Boolean).join(", ");
            var kilme = e.pakeistaRanka ? pakeisk(X.s_changed, { v: e.buvusiReiksme === undefined || e.buvusiReiksme === null ? "-" : F.tiksliai(e.buvusiReiksme) }) : (e.ranka ? X.s_hand : X.s_ok);
            return [str(e.factorLabel), F.tiksliai(e.value), str(e.unit), rodiklis || "-", e.page ? String(e.page) : "-", str(e.fileName) || "-", kilme];
          })
        }]
      });
    }

    // Pasiūlymų vertinimas - pilnas, su kainomis ir vardais, pagal naudotą modelį
    var ev = data.evaluation;
    if (ev && Array.isArray(ev.offers) && ev.offers.length) {
      var isB = ev.model === "B";
      var pirma = pakeisk(X.ev_model, { m: isB ? X.m_b : X.m_a }) +
        (isB ? pakeisk(X.ev_w, { a: num(ev.priceWeight), b: num(ev.carbonWeight) }) : pakeisk(X.ev_shadow, { x: num(ev.shadowPrice) }));
      var sorted = ev.offers.slice().sort(function (a, b) { return num(a.rank) - num(b.rank); });
      var anglis = function (o) { return o.carbonT === null || o.carbonT === undefined ? X.not_given : F.t(o.carbonT); };
      var vardas = function (o) { return str(o.name) + (o.missingData && !ev.bePcf ? X.miss : ""); };
      var lent = isB ? {
        columns: [X.c_rank, X.c_sup, X.c_price, X.c_carbon, X.c_ps, X.c_cs, X.c_tot], widths: [0.08, 0.3, 0.16, 0.12, 0.11, 0.11, 0.12],
        rows: sorted.map(function (o) {
          return [String(num(o.rank)), vardas(o), F.eur(o.bidPrice), anglis(o), F.sk(o.priceScore, 2), o.carbonScore === null || o.carbonScore === undefined ? "-" : F.sk(o.carbonScore, 2), F.sk(o.score, 2)];
        })
      } : {
        columns: [X.c_rank, X.c_sup, X.c_price, X.c_carbon, X.c_cc, X.c_adj], widths: [0.08, 0.32, 0.16, 0.12, 0.16, 0.16],
        rows: sorted.map(function (o) {
          return [String(num(o.rank)), vardas(o), F.eur(o.bidPrice), anglis(o), o.carbonCost === null || o.carbonCost === undefined ? "-" : F.eur(o.carbonCost), F.eur(o.adjustedPrice)];
        })
      };
      sections.push({
        heading: X.ev_h,
        paragraphs: [pirma, ev.winner ? pakeisk(X.best, { n: str(ev.winner.name) }) : "", ev.bePcf ? X.no_pcf : "", neitrauktiTekstas(ev, X, false)].filter(Boolean),
        tables: [lent]
      });
    }

    return {
      audience: "internal", kalba: k,
      title: X.title_int,
      meta: projectMeta(data.project, X),
      di: num(data.diReiksmes) > 0,
      sections: sections,
      disclaimer: X.disc_int
    };
  }

  // --- D) VIEŠAS / auditorių pjūvis (filtruotas) ---
  function buildPublicReport(data) {
    data = data || {};
    var k = kalba(data), X = TX[k], F = fx(k);
    var sections = [stagesSection(data, X, F)];

    var lim = limitsSection(data, X, F, true);
    if (lim) sections.push(lim);

    // Pasiūlymų ANGLIES palyginimas - anonimizuotas, BE piniginių reikšmių, pagal naudotą modelį
    var ev = data.evaluation;
    if (ev && Array.isArray(ev.offers) && ev.offers.length) {
      var isB = ev.model === "B";
      var sorted = ev.offers.slice().sort(function (a, b) { return num(a.rank) - num(b.rank); });
      var rows = sorted.map(function (o, i) {
        var anglis;
        if (o.carbonT === null || o.carbonT === undefined) anglis = X.not_given;
        else if (o.missingData) anglis = pakeisk(X.pub_miss, { t: F.t(o.carbonT) });
        else anglis = F.t(o.carbonT) + " CO2e";
        // Anonimizacija: realus vardas PAKEIČIAMAS „Tiekėjas N“ pagal reitingą.
        var eil = [String(num(o.rank, i + 1)), X.supplier + (i + 1), anglis];
        if (isB) eil.push(o.carbonScore === null || o.carbonScore === undefined ? "-" : F.sk(o.carbonScore, 2));
        return eil;
      });
      var stulp = [X.c_rank, X.c_offer, X.c_foot];
      if (isB) stulp.push(X.c_cs);
      sections.push({
        heading: X.pub_h,
        paragraphs: [X.pub_p, isB ? pakeisk(X.pub_b, { a: num(ev.priceWeight), b: num(ev.carbonWeight) }) : X.pub_a, ev.bePcf ? X.no_pcf : "", neitrauktiTekstas(ev, X, true)].filter(Boolean),
        tables: [{ columns: stulp, widths: isB ? [0.1, 0.24, 0.48, 0.18] : [0.12, 0.28, 0.6], rows: rows }]
      });
    }

    return {
      audience: "public", kalba: k,
      title: X.title_pub,
      // Viešai pašalinamas kodas (vidinis identifikatorius)
      meta: projectMeta(data.project, X).filter(function (m) { return m.label !== X.code; }),
      di: num(data.diReiksmes) > 0,
      sections: sections,
      disclaimer: X.disc_pub + X.method + "."
    };
  }

  // Ar yra iš ko sudaryti ataskaitą (tuščia ataskaita nesudaroma)
  function tuscia(data) {
    data = data || {};
    return !(num(data.totalKg) > 0) && !(data.pendingEpd && data.pendingEpd.length) &&
      !(data.epdSources && data.epdSources.length) && !(data.evaluation && data.evaluation.offers && data.evaluation.offers.length);
  }

  // Bendra įėjimo funkcija.
  function build(audience, data) {
    return audience === "public" ? buildPublicReport(data) : buildInternalReport(data);
  }

  root.GP_REPORTS = {
    version: VERSION,
    METHODOLOGY: TX.lt.method,
    buildInternalReport: buildInternalReport,
    buildPublicReport: buildPublicReport,
    build: build,
    tuscia: tuscia
  };
})(typeof window !== "undefined" ? window : this);
