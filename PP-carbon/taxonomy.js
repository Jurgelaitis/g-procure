/* ============================================================================
 * G-Procure  pp-carbon/taxonomy.js   (v0.2 - Faze 4B branduolys)
 * ES Taksonomijos (2020/852) ataskaitos modelis. KRITINIS PRINCIPAS: sistema NIEKADA
 * nepateikia galutinio "tvaru/netvaru" verdikto. report.verdict VISADA null. Kriteriju
 * busenas nustato VERTINTOJAS. Kriteriju tekstas orientacinis, "tikslinti pagal 2021/2139".
 * Veiklos: 4.9 (elektros perdavimas/skirstymas), 4.1 (saules PV), 7.4 (EV ikrovimo stoteles).
 * Naudojimas -> window.GP_TAXONOMY
 * v0.2 pakeitimai: 4.1 ir 7.4 isplestos is placeholder i pilnus kriterijus pagal 2021/2139;
 *   sutvarkytas kalbos linksnis ("pagal Deleguotąjį reglamentą"); pridetas REG_ACC.
 * 2026-10-17: naudotojui rodomi tekstai - su lietuviškomis raidėmis (iki tol be jų: „Reiksmingas prisidejimas“, „Busena“).
 * ========================================================================== */
(function (root) {
  "use strict";
  var VERSION = "0.2";
  var REG = "Deleguotasis reglamentas (ES) 2021/2139";       // vardininkas (teisiniam pagrindui)
  var REG_ACC = "Deleguotąjį reglamentą (ES) 2021/2139";     // galininkas (po "pagal ...")
  var REG_BASE = "Reglamentas (ES) 2020/852 (Taksonomija)";

  var OBJECTIVES = {
    mitigation:   "Klimato kaitos švelninimas",
    adaptation:   "Klimato kaitos prisitaikymas",
    water:        "Vandens ir jūrų išteklių tvarus naudojimas",
    circular:     "Perėjimas prie žiedinės ekonomikos",
    pollution:    "Taršos prevencija ir kontrolė",
    biodiversity: "Biologinės įvairovės ir ekosistemų apsauga"
  };

  var ACTIVITIES = {
    "4.9": {
      code: "4.9", name: "Elektros perdavimas ir skirstymas", primaryObjective: "mitigation",
      scNote: "Veikla turi atitikti reikšmingo prisidėjimo prie klimato kaitos " +
              "švelninimo kriterijus (pvz. tinklo išmetimų sąlygas arba tiesioginį " +
              "ryšį su mažai anglies dioksido išskiriančiais šaltiniais). Tikslus " +
              "kriterijus - tikslinti pagal " + REG_ACC + ".",
      dnshHints: {
        adaptation:   "Fizinių klimato rizikų vertinimas ir prisitaikymo priemonės.",
        water:        "Poveikio vandens telkiniams vertinimas, jei taikoma.",
        circular:     "Įrangos gyvavimo pabaigos tvarkymas; SF6 dujų valdymas ir mažinimas.",
        pollution:    "Taršos (pvz. SF6 nutekėjimų, triukšmo, elektromagnetinio lauko) prevencija.",
        biodiversity: "Poveikio saugomoms teritorijoms ir ekosistemoms vertinimas (trasos, pastotės)."
      }
    },
    "4.1": {
      code: "4.1", name: "Elektros gamyba naudojant saulės fotovoltinę technologiją",
      primaryObjective: "mitigation",
      scNote: "Reglamentas šiai veiklai atskiro reikšmingo prisidėjimo kriterijaus " +
              "neįveda: elektros gamyba saulės fotovoltine (PV) technologija pati savaime " +
              "laikoma reikšmingai prisidedančia prie klimato kaitos švelninimo. Pakanka, " +
              "kad veikla yra saulės PV elektrinės statyba arba eksploatacija. Jei ji yra " +
              "sudėtinė 7.6 veiklos (AEI technologijų įrengimo) dalis, taikomi 7.6 " +
              "kriterijai. Tikslinti pagal " + REG_ACC + ".",
      dnshHints: {
        adaptation:   "Fizinių klimato rizikų ir pažeidžiamumo vertinimas bei prisitaikymo priemonės (Priedas A).",
        water:        "Poveikio vandeniui vertinimas, kur aktualu (Priedas B); ant žemės montuojamų jėgainių atveju - vandens telkinių apsauga.",
        circular:     "Įrangos ilgaamžiškumas ir perdirbamumas: kur įmanoma, renkantis modulius ir inverterius atsižvelgti į galimybę juos remontuoti, išardyti ir perdirbti; PV modulių gyvavimo pabaigos atliekų tvarkymas su pirmenybe pakartotiniam naudojimui ir perdirbimui.",
        pollution:    "Taršos prevencija įrengimo ir eksploatacijos metu (pvz. pavojingų medžiagų valdymas), kur aktualu.",
        biodiversity: "Poveikio aplinkai vertinimas (PAV) ar atranka, kur privaloma (Priedas D); ypatingas dėmesys ant žemės montuojamoms jėgainėms ir saugomoms ar biologinei įvairovei jautrioms teritorijoms."
      }
    },
    "7.4": {
      code: "7.4", name: "Elektromobilių įkrovimo stotelių įrengimas pastatuose",
      primaryObjective: "mitigation",
      scNote: "Reglamentas šiai veiklai atskiro reikšmingo prisidėjimo kriterijaus " +
              "neįveda: elektromobilių įkrovimo stotelių įrengimas, priežiūra ar remontas " +
              "pastatuose (ir prie jų esančiose stovėjimo aikštelėse) pats savaime laikomas " +
              "reikšmingai prisidedančiu prie klimato kaitos švelninimo kaip įgalinančioji " +
              "veikla. Atskirų GWP ribų netaikoma. Tikslinti pagal " + REG_ACC + ".",
      dnshHints: {
        adaptation:   "Fizinių klimato rizikų ir pažeidžiamumo vertinimas bei prisitaikymo priemonės (Priedas A).",
        water:        "Paprastai mažiau aktualu pastate integruotai veiklai; vertinti generinius vandens kriterijus, kur taikoma (Priedas B).",
        circular:     "Įrengimo ir demontavimo atliekų tvarkymas su pirmenybe pakartotiniam naudojimui bei perdirbimui; įrangos ilgaamžiškumas.",
        pollution:    "Taršos (pvz. statybinių ir pavojingų medžiagų) prevencija įrengimo metu, kur aktualu.",
        biodiversity: "Paprastai mažiau aktualu pastate integruotai veiklai; vertinti generinius biologinės įvairovės kriterijus, kur taikoma (Priedas D)."
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
    if (!act) return { error: "Nežinoma veikla: " + activityCode };
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
      heading: "1. Reikšmingas prisidėjimas: " + OBJECTIVES[act.primaryObjective],
      paragraphs: [act.scNote],
      tables: [{ columns: ["Kriterijus", "Būsena", "Nuoroda"],
        rows: [["Reikšmingas prisidėjimas prie tikslo „" + OBJECTIVES[act.primaryObjective] + "“",
          statusLabel(scStatus), REG]] }]
    });

    var keys = dnshKeys(act.primaryObjective);
    var dnshRows = keys.map(function (k) {
      var st = normStatus(dnshStatuses[k]);
      var hint = (act.dnshHints && act.dnshHints[k]) ? act.dnshHints[k] : "Tikslinti pagal " + REG_ACC + ".";
      return [OBJECTIVES[k], hint, statusLabel(st), REG];
    });
    sections.push({ heading: "2. Nedaryti reikšmingos žalos (DNSH)",
      paragraphs: ["Veikla neturi daryti reikšmingos žalos kitiems Taksonomijos tikslams. " +
        "Kiekvieno kriterijaus būseną nustato vertintojas."],
      tables: [{ columns: ["Tikslas", "Ką vertinti", "Būsena", "Nuoroda"], rows: dnshRows }] });

    var msStatus = normStatus(statuses.minimumSafeguards);
    sections.push({ heading: "3. Minimalios apsaugos priemonės",
      paragraphs: ["Atitiktis EBPO gairėms daugiašalėms įmonėms ir JT verslo ir žmogaus " +
        "teisių principams (2020/852, 18 str.)."],
      tables: [{ columns: ["Kriterijus", "Būsena", "Nuoroda"],
        rows: [["Minimalios apsaugos priemonės", statusLabel(msStatus), REG_BASE]] }] });

    var tCO2e = kgToT(data.totalKg);
    sections.push({ heading: "4. Anglies pėdsako duomenys (pagrindimas)",
      paragraphs: ["Projekto A1-A3 anglies pėdsakas, naudojamas kaip pagalbinis rodiklis " +
        "vertinant reikšmingą prisidėjimą. Tai NE Taksonomijos atitikties verdiktas."],
      tables: [{ columns: ["Rodiklis", "Reikšmė"],
        rows: [["Projekto ŠESD (A1-A3)", tCO2e + " t CO2e"]] }] });

    return { activity: { code: act.code, name: act.name },
      title: "ES Taksonomijos vertinimo suvestinė - veikla " + act.code,
      meta: meta, sections: sections,
      disclaimer: "Struktūrizuota Taksonomijos suvestinė. Sistema NEteikia galutinio " +
        "atitikties verdikto - kriterijų būsenas ir galutinį sprendimą priima " +
        "vertintojas pagal galiojantį " + REG_ACC + ". Kriterijų tekstas - orientacinis.",
      verdict: null };
  }

  root.GP_TAXONOMY = { version: VERSION, OBJECTIVES: OBJECTIVES, STATUSES: STATUSES,
    listActivities: listActivities, dnshKeys: dnshKeys, buildTaxonomyReport: buildTaxonomyReport };
})(typeof window !== "undefined" ? window : this);
