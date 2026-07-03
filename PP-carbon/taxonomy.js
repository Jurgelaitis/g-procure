/* ============================================================================
 * G-Procure  pp-carbon/taxonomy.js   (v0.1 - Faze 4B branduolys)
 * ES Taksonomijos (Reglamentas 2020/852) ataskaitos modelio kurimas.
 *
 * PASKIRTIS: is pp-carbon projekto duomenu (anglies pedsakas, veikla) suformuoti
 * STRUKTURIZUOTA Taksonomijos ataskaita - veiklos identifikavimas, reiksmingo
 * prisidejimo kriterijus, "nedaryti reiksmingos zalos" (DNSH) kontrolinis sarasas
 * ir minimalios apsaugos priemones.
 *
 * KRITINIS PRINCIPAS (CLAUDE.md): sistema NIEKADA nepateikia galutinio teisinio
 * verdikto "tvaru / netvaru". Ji tik SURENKA duomenis ir PARODO kriterijus;
 * kiekvieno kriterijaus busena ("pending"/"met"/"not_met"/"na") nustato VERTINTOJAS.
 * report.verdict VISADA lieka null - jokio automatinio sprendimo.
 *
 * ATSARGUS TEISINIS POZIURIS: tikslus techninés atrankos ir DNSH kriteriju tekstas
 * yra detalus ES Deleguotojo reglamento (ES) 2021/2139 priedu turinys. Cia dedamas
 * KARKASAS su pagrindinemis kategorijomis, kiekvienas kriterijus pazymetas
 * "tikslinti pagal Deleguotaji reglamenta (ES) 2021/2139" - kad nebutu pateiktas
 * klaidingas teisinis teiginys kaip faktas.
 *
 * VEIKLOS (isplecama - sarasas, ne viena ikoduota):
 *  4.9 - Elektros perdavimas ir skirstymas (LITGRID pagrindine; ijungta)
 *  4.1 - Elektros gamyba is saules PV (placeholder, prideti veliau)
 *  7.4 - Elektromobiliu ikrovimo stoteles (placeholder, prideti veliau)
 *
 * Naudojimas: <script src="taxonomy.js"></script> -> window.GP_TAXONOMY
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.1";
  var REG = "Deleguotasis reglamentas (ES) 2021/2139";
  var REG_BASE = "Reglamentas (ES) 2020/852 (Taksonomija)";

  // Sesi Taksonomijos aplinkos tikslai (2020/852, 9 str.)
  var OBJECTIVES = {
    mitigation:   "Klimato kaitos svelninimas",
    adaptation:   "Klimato kaitos prisitaikymas",
    water:        "Vandens ir juru istekliu tvarus naudojimas",
    circular:     "Perejimas prie ziedines ekonomikos",
    pollution:    "Tarsos prevencija ir kontrole",
    biodiversity: "Biologines ivairoves ir ekosistemu apsauga"
  };

  // Veiklu registras. primaryObjective = tikslas, kuriam veikla reiksmingai
  // prisideda; DNSH tikrinamas visiems KITIEMS tikslams.
  var ACTIVITIES = {
    "4.9": {
      code: "4.9",
      name: "Elektros perdavimas ir skirstymas",
      primaryObjective: "mitigation",
      scNote: "Veikla turi atitikti reiksmingo prisidejimo prie klimato kaitos " +
              "svelninimo kriterijus (pvz. tinklo ismetimu salygas arba tiesiogini " +
              "rysi su mazai anglies dioksido isskirianciais saltiniais). Tikslus " +
              "kriterijus - tikslinti pagal " + REG + ".",
      // DNSH pastabu uzuominos konkreciai veiklai (bendros kategorijos, ne teisinis faktas)
      dnshHints: {
        adaptation:   "Fiziniu klimato riziku vertinimas ir prisitaikymo priemones.",
        water:        "Poveikio vandens telkiniams vertinimas, jei taikoma.",
        circular:     "Irangos gyvavimo pabaigos tvarkymas; SF6 duju valdymas ir mazinimas.",
        pollution:    "Tarsos (pvz. SF6 nutekejimu, triuksmo, elektromagnetinio lauko) prevencija.",
        biodiversity: "Poveikio saugomoms teritorijoms ir ekosistemoms vertinimas (trasos, pastotes)."
      }
    },
    "4.1": {
      code: "4.1",
      name: "Elektros gamyba naudojant saules fotovoltine technologija",
      primaryObjective: "mitigation",
      placeholder: true,
      scNote: "Placeholder - prideti kriterijus pagal " + REG + "."
    },
    "7.4": {
      code: "7.4",
      name: "Elektromobiliu ikrovimo stoteliu irengimas",
      primaryObjective: "mitigation",
      placeholder: true,
      scNote: "Placeholder - prideti kriterijus pagal " + REG + "."
    }
  };

  var STATUSES = ["pending", "met", "not_met", "na"];
  function normStatus(s) { return STATUSES.indexOf(s) !== -1 ? s : "pending"; }
  function statusLabel(s) {
    switch (s) {
      case "met": return "Atitinka";
      case "not_met": return "Neatitinka";
      case "na": return "Netaikoma";
      default: return "Vertinama";
    }
  }

  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function round(x, dp) { var f = Math.pow(10, dp || 0); return Math.round(num(x) * f) / f; }
  function kgToT(kg) { return round(num(kg) / 1000, 3); }

  function listActivities() {
    return Object.keys(ACTIVITIES).map(function (k) {
      return { code: ACTIVITIES[k].code, name: ACTIVITIES[k].name, placeholder: !!ACTIVITIES[k].placeholder };
    });
  }

  // Grazina DNSH tikslu raktu sarasa (visi tikslai isskyrus primaryObjective).
  function dnshKeys(primary) {
    return Object.keys(OBJECTIVES).filter(function (k) { return k !== primary; });
  }

  // Pagrindine funkcija. Grazina renderer-agnostic ataskaitos modeli.
  //  activityCode - "4.9" ir kt.
  //  data - { project:{name,code,subject,date}, totalKg }  (anglies pagrindimas)
  //  statuses - vertintojo nustatytos busenos (neprivaloma; be ju viskas "pending"):
  //    { substantialContribution, minimumSafeguards, dnsh:{ adaptation, water, ... } }
  function buildTaxonomyReport(activityCode, data, statuses) {
    var act = ACTIVITIES[activityCode];
    if (!act) return { error: "Nezinoma veikla: " + activityCode };
    data = data || {};
    statuses = statuses || {};
    var dnshStatuses = statuses.dnsh || {};

    var p = data.project || {};
    var meta = [];
    if (p.name) meta.push({ label: "Projektas", value: String(p.name) });
    if (p.code) meta.push({ label: "Kodas", value: String(p.code) });
    if (p.subject) meta.push({ label: "Perkantysis subjektas", value: String(p.subject) });
    if (p.date) meta.push({ label: "Data", value: String(p.date) });
    meta.push({ label: "Veikla", value: act.code + " - " + act.name });
    meta.push({ label: "Teisinis pagrindas", value: REG_BASE + "; " + REG });

    var sections = [];

    // 1. Reiksmingas prisidejimas
    var scStatus = normStatus(statuses.substantialContribution);
    sections.push({
      heading: "1. Reiksmingas prisidejimas: " + OBJECTIVES[act.primaryObjective],
      paragraphs: [act.scNote],
      tables: [{
        columns: ["Kriterijus", "Busena", "Nuoroda"],
        rows: [[
          "Reiksmingas prisidejimas prie tikslo \"" + OBJECTIVES[act.primaryObjective] + "\"",
          statusLabel(scStatus),
          REG
        ]]
      }]
    });

    // 2. DNSH kontrolinis sarasas (visi kiti tikslai)
    var keys = dnshKeys(act.primaryObjective);
    var dnshRows = keys.map(function (k) {
      var st = normStatus(dnshStatuses[k]);
      var hint = (act.dnshHints && act.dnshHints[k]) ? act.dnshHints[k] : "Tikslinti pagal " + REG + ".";
      return [OBJECTIVES[k], hint, statusLabel(st), REG];
    });
    sections.push({
      heading: "2. Nedaryti reiksmingos zalos (DNSH)",
      paragraphs: ["Veikla neturi daryti reiksmingos zalos kitiems Taksonomijos tikslams. " +
                   "Kiekvieno kriterijaus busena nustato vertintojas."],
      tables: [{ columns: ["Tikslas", "Ka vertinti", "Busena", "Nuoroda"], rows: dnshRows }]
    });

    // 3. Minimalios apsaugos priemones
    var msStatus = normStatus(statuses.minimumSafeguards);
    sections.push({
      heading: "3. Minimalios apsaugos priemones",
      paragraphs: ["Atitiktis EBPO gairems daugiasalems imonems ir JT verslo ir zmogaus " +
                   "teisiu principams (2020/852, 18 str.)."],
      tables: [{
        columns: ["Kriterijus", "Busena", "Nuoroda"],
        rows: [["Minimalios apsaugos priemones", statusLabel(msStatus), REG_BASE]]
      }]
    });

    // 4. Anglies pedsako duomenys (pagrindimas, ne verdiktas)
    var tCO2e = kgToT(data.totalKg);
    sections.push({
      heading: "4. Anglies pedsako duomenys (pagrindimas)",
      paragraphs: ["Projekto A1-A3 anglies pedsakas, naudojamas kaip pagalbinis rodiklis " +
                   "vertinant reiksminga prisidejima. Tai NE Taksonomijos atitikties verdiktas."],
      tables: [{
        columns: ["Rodiklis", "Reiksme"],
        rows: [["Projekto SESD (A1-A3)", tCO2e + " t CO2e"]]
      }]
    });

    return {
      activity: { code: act.code, name: act.name },
      title: "ES Taksonomijos vertinimo suvestine - veikla " + act.code,
      meta: meta,
      sections: sections,
      disclaimer: "StruktUrizuota Taksonomijos suvestine. Sistema NEteikia galutinio " +
                  "atitikties verdikto - kriteriju busenas ir galutini sprendima priima " +
                  "vertintojas pagal galiojanti " + REG + ". Kriteriju tekstas - orientacinis.",
      verdict: null // KRITINE: sistema niekada nenustato galutinio verdikto
    };
  }

  root.GP_TAXONOMY = {
    version: VERSION,
    OBJECTIVES: OBJECTIVES,
    STATUSES: STATUSES,
    listActivities: listActivities,
    dnshKeys: dnshKeys,
    buildTaxonomyReport: buildTaxonomyReport
  };
})(typeof window !== "undefined" ? window : this);
