/* ============================================================================
 * G-Procure  pp-carbon/taxonomy.js   (v0.2 - Faze 4B branduolys)
 * ES Taksonomijos (2020/852) ataskaitos modelis. KRITINIS PRINCIPAS: sistema NIEKADA
 * nepateikia galutinio "tvaru/netvaru" verdikto. report.verdict VISADA null. Kriteriju
 * busenas nustato VERTINTOJAS. Kriteriju tekstas orientacinis, "tikslinti pagal 2021/2139".
 * Veiklos: 4.9 (elektros perdavimas/skirstymas), 4.1 (saules PV), 7.4 (EV ikrovimo stoteles).
 * Naudojimas -> window.GP_TAXONOMY
 * v0.2 pakeitimai: 4.1 ir 7.4 isplestos is placeholder i pilnus kriterijus pagal 2021/2139;
 *   sutvarkytas kalbos linksnis ("pagal Deleguotaji reglamenta"); pridetas REG_ACC.
 * ========================================================================== */
(function (root) {
  "use strict";
  var VERSION = "0.2";
  var REG = "Deleguotasis reglamentas (ES) 2021/2139";       // vardininkas (teisiniam pagrindui)
  var REG_ACC = "Deleguotaji reglamenta (ES) 2021/2139";     // galininkas (po "pagal ...")
  var REG_BASE = "Reglamentas (ES) 2020/852 (Taksonomija)";

  var OBJECTIVES = {
    mitigation:   "Klimato kaitos svelninimas",
    adaptation:   "Klimato kaitos prisitaikymas",
    water:        "Vandens ir juru istekliu tvarus naudojimas",
    circular:     "Perejimas prie ziedines ekonomikos",
    pollution:    "Tarsos prevencija ir kontrole",
    biodiversity: "Biologines ivairoves ir ekosistemu apsauga"
  };

  var ACTIVITIES = {
    "4.9": {
      code: "4.9", name: "Elektros perdavimas ir skirstymas", primaryObjective: "mitigation",
      scNote: "Veikla turi atitikti reiksmingo prisidejimo prie klimato kaitos " +
              "svelninimo kriterijus (pvz. tinklo ismetimu salygas arba tiesiogini " +
              "rysi su mazai anglies dioksido isskirianciais saltiniais). Tikslus " +
              "kriterijus - tikslinti pagal " + REG_ACC + ".",
      dnshHints: {
        adaptation:   "Fiziniu klimato riziku vertinimas ir prisitaikymo priemones.",
        water:        "Poveikio vandens telkiniams vertinimas, jei taikoma.",
        circular:     "Irangos gyvavimo pabaigos tvarkymas; SF6 duju valdymas ir mazinimas.",
        pollution:    "Tarsos (pvz. SF6 nutekejimu, triuksmo, elektromagnetinio lauko) prevencija.",
        biodiversity: "Poveikio saugomoms teritorijoms ir ekosistemoms vertinimas (trasos, pastotes)."
      }
    },
    "4.1": {
      code: "4.1", name: "Elektros gamyba naudojant saules fotovoltine technologija",
      primaryObjective: "mitigation",
      scNote: "Reglamentas siai veiklai atskiro reiksmingo prisidejimo kriterijaus " +
              "neiveda: elektros gamyba saules fotovoltine (PV) technologija pati savaime " +
              "laikoma reiksmingai prisidedancia prie klimato kaitos svelninimo. Pakanka, " +
              "kad veikla yra saules PV elektrines statyba arba eksploatacija. Jei ji yra " +
              "sudetine 7.6 veiklos (AEI technologiju irengimo) dalis, taikomi 7.6 " +
              "kriterijai. Tikslinti pagal " + REG_ACC + ".",
      dnshHints: {
        adaptation:   "Fiziniu klimato riziku ir pazeidziamumo vertinimas bei prisitaikymo priemones (Priedas A).",
        water:        "Poveikio vandeniui vertinimas, kur aktualu (Priedas B); ant zemes montuojamu jegainiu atveju - vandens telkiniu apsauga.",
        circular:     "Irangos ilgaamziskumas ir perdirbamumas: kur imanoma, renkantis modulius ir inverterius atsizvelgti i galimybe juos remontuoti, isardyti ir perdirbti; PV moduliu gyvavimo pabaigos atlieku tvarkymas su pirmenybe pakartotiniam naudojimui ir perdirbimui.",
        pollution:    "Tarsos prevencija irengimo ir eksploatacijos metu (pvz. pavojingu medziagu valdymas), kur aktualu.",
        biodiversity: "Poveikio aplinkai vertinimas (PAV) ar atranka, kur privaloma (Priedas D); ypatingas demesys ant zemes montuojamoms jegainems ir saugomoms ar biologinei ivairovei jautrioms teritorijoms."
      }
    },
    "7.4": {
      code: "7.4", name: "Elektromobiliu ikrovimo stoteliu irengimas pastatuose",
      primaryObjective: "mitigation",
      scNote: "Reglamentas siai veiklai atskiro reiksmingo prisidejimo kriterijaus " +
              "neiveda: elektromobiliu ikrovimo stoteliu irengimas, prieziura ar remontas " +
              "pastatuose (ir prie ju esanciose stovejimo aikstelese) pats savaime laikomas " +
              "reiksmingai prisidedanciu prie klimato kaitos svelninimo kaip igalinancioji " +
              "veikla. Atskiru GWP ribu netaikoma. Tikslinti pagal " + REG_ACC + ".",
      dnshHints: {
        adaptation:   "Fiziniu klimato riziku ir pazeidziamumo vertinimas bei prisitaikymo priemones (Priedas A).",
        water:        "Paprastai maziau aktualu pastate integruotai veiklai; vertinti generinius vandens kriterijus, kur taikoma (Priedas B).",
        circular:     "Irengimo ir demontavimo atlieku tvarkymas su pirmenybe pakartotiniam naudojimui bei perdirbimui; irangos ilgaamziskumas.",
        pollution:    "Tarsos (pvz. statybiniu ir pavojingu medziagu) prevencija irengimo metu, kur aktualu.",
        biodiversity: "Paprastai maziau aktualu pastate integruotai veiklai; vertinti generinius biologines ivairoves kriterijus, kur taikoma (Priedas D)."
      }
    }
  };

  var STATUSES = ["pending", "met", "not_met", "na"];
  function normStatus(s) { return STATUSES.indexOf(s) !== -1 ? s : "pending"; }
  function statusLabel(s) {
    switch (s) { case "met": return "Atitinka"; case "not_met": return "Neatitinka";
      case "na": return "Netaikoma"; default: return "Vertinama"; }
  }
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function round(x, dp) { var f = Math.pow(10, dp || 0); return Math.round(num(x) * f) / f; }
  function kgToT(kg) { return round(num(kg) / 1000, 3); }

  function listActivities() {
    return Object.keys(ACTIVITIES).map(function (k) {
      return { code: ACTIVITIES[k].code, name: ACTIVITIES[k].name, placeholder: !!ACTIVITIES[k].placeholder };
    });
  }
  function dnshKeys(primary) {
    return Object.keys(OBJECTIVES).filter(function (k) { return k !== primary; });
  }

  function buildTaxonomyReport(activityCode, data, statuses) {
    var act = ACTIVITIES[activityCode];
    if (!act) return { error: "Nezinoma veikla: " + activityCode };
    data = data || {}; statuses = statuses || {};
    var dnshStatuses = statuses.dnsh || {};
    var p = data.project || {}; var meta = [];
    if (p.name) meta.push({ label: "Projektas", value: String(p.name) });
    if (p.code) meta.push({ label: "Kodas", value: String(p.code) });
    if (p.subject) meta.push({ label: "Perkantysis subjektas", value: String(p.subject) });
    if (p.date) meta.push({ label: "Data", value: String(p.date) });
    meta.push({ label: "Veikla", value: act.code + " - " + act.name });
    meta.push({ label: "Teisinis pagrindas", value: REG_BASE + "; " + REG });

    var sections = [];
    var scStatus = normStatus(statuses.substantialContribution);
    sections.push({
      heading: "1. Reiksmingas prisidejimas: " + OBJECTIVES[act.primaryObjective],
      paragraphs: [act.scNote],
      tables: [{ columns: ["Kriterijus", "Busena", "Nuoroda"],
        rows: [["Reiksmingas prisidejimas prie tikslo \"" + OBJECTIVES[act.primaryObjective] + "\"",
          statusLabel(scStatus), REG]] }]
    });

    var keys = dnshKeys(act.primaryObjective);
    var dnshRows = keys.map(function (k) {
      var st = normStatus(dnshStatuses[k]);
      var hint = (act.dnshHints && act.dnshHints[k]) ? act.dnshHints[k] : "Tikslinti pagal " + REG_ACC + ".";
      return [OBJECTIVES[k], hint, statusLabel(st), REG];
    });
    sections.push({ heading: "2. Nedaryti reiksmingos zalos (DNSH)",
      paragraphs: ["Veikla neturi daryti reiksmingos zalos kitiems Taksonomijos tikslams. " +
        "Kiekvieno kriterijaus busena nustato vertintojas."],
      tables: [{ columns: ["Tikslas", "Ka vertinti", "Busena", "Nuoroda"], rows: dnshRows }] });

    var msStatus = normStatus(statuses.minimumSafeguards);
    sections.push({ heading: "3. Minimalios apsaugos priemones",
      paragraphs: ["Atitiktis EBPO gairems daugiasalems imonems ir JT verslo ir zmogaus " +
        "teisiu principams (2020/852, 18 str.)."],
      tables: [{ columns: ["Kriterijus", "Busena", "Nuoroda"],
        rows: [["Minimalios apsaugos priemones", statusLabel(msStatus), REG_BASE]] }] });

    var tCO2e = kgToT(data.totalKg);
    sections.push({ heading: "4. Anglies pedsako duomenys (pagrindimas)",
      paragraphs: ["Projekto A1-A3 anglies pedsakas, naudojamas kaip pagalbinis rodiklis " +
        "vertinant reiksminga prisidejima. Tai NE Taksonomijos atitikties verdiktas."],
      tables: [{ columns: ["Rodiklis", "Reiksme"],
        rows: [["Projekto SESD (A1-A3)", tCO2e + " t CO2e"]] }] });

    return { activity: { code: act.code, name: act.name },
      title: "ES Taksonomijos vertinimo suvestine - veikla " + act.code,
      meta: meta, sections: sections,
      disclaimer: "StruktUrizuota Taksonomijos suvestine. Sistema NEteikia galutinio " +
        "atitikties verdikto - kriteriju busenas ir galutini sprendima priima " +
        "vertintojas pagal galiojanti " + REG_ACC + ". Kriteriju tekstas - orientacinis.",
      verdict: null };
  }

  root.GP_TAXONOMY = { version: VERSION, OBJECTIVES: OBJECTIVES, STATUSES: STATUSES,
    listActivities: listActivities, dnshKeys: dnshKeys, buildTaxonomyReport: buildTaxonomyReport };
})(typeof window !== "undefined" ? window : this);
