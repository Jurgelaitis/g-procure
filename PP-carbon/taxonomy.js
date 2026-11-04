/* ============================================================================
 * G-Procure  pp-carbon/taxonomy.js   (v0.3 - Fazė 4B branduolys)
 * ES Taksonomijos (2020/852) ataskaitos modelis. KRITINIS PRINCIPAS: sistema NIEKADA
 * nepateikia galutinio "tvaru/netvaru" verdikto. report.verdict VISADA null. Kriterijų
 * būsenas nustato VERTINTOJAS. Veiklos: 4.9, 4.1, 7.4.
 * Naudojimas -> window.GP_TAXONOMY
 *
 * 2026-11-04 (naujo naudotojo patikra D6, V3): terminai ir „Ką vertinti“ - pagal perskaitytą EUR-Lex tekstą LT ir EN: Deleguotojo
 * reglamento (ES) 2021/2139 I priedo 4.1, 4.9 ir 7.4 skirsniai (konsoliduota redakcija 2026-01-01) ir Reglamento (ES) 2020/852
 * 9 ir 18 str. Iki tol: „Reikšmingas prisidėjimas“ (akte - „Svarus prisidėjimas“), „Minimalios apsaugos priemonės“ („Būtiniausios“),
 * „Priedas A“ („A priedėlis“), 4.9 žiedinei ekonomikai - SF6 ir gyvavimo pabaiga (akte - atliekų tvarkymo planas), kur akte
 * „Netaikoma“ - sugalvoti vertinimai. Veiklų, tikslų ir kriterijų raktai (mitigation, water, substantialContribution ir kt.) NEKEISTI -
 * pagal juos saugomos vertintojo būsenos. Kur akte „Netaikoma“, būsena pagal numatymą - „Netaikoma“ (keičia vertintojas).
 * Stulpelio „Būsena“ vieta ir būsenų raktai - lentelės modelyje (statusCol, statusKeys), ne pagal pavadinimą.
 * ========================================================================== */
(function (root) {
  "use strict";
  var VERSION = "0.3";

  var TX = {
    lt: {
      reg: "Deleguotasis reglamentas (ES) 2021/2139", reg_acc: "Deleguotąjį reglamentą (ES) 2021/2139",
      reg_base: "Reglamentas (ES) 2020/852 (Taksonomija)", red: "konsoliduota redakcija 2026-01-01",
      skirsnis: "I priedas, {c} skirsnis",
      project: "Projektas", code: "Kodas", subject: "Perkantysis subjektas", date: "Parengta", activity: "Veikla", legal: "Teisinis pagrindas",
      sc: "1. Svarus prisidėjimas: ", sc_row: "Svarus prisidėjimas prie tikslo „{o}“",
      col_crit: "Kriterijus", col_status: "Būsena", col_ref: "Nuoroda", col_goal: "Tikslas", col_what: "Ką vertinti",
      dnsh: "2. Reikšmingos žalos nedarymas (DNSH)",
      dnsh_p: "Veikla neturi daryti reikšmingos žalos kitiems Taksonomijos tikslams. Tekstas - iš reglamento I priedo; kiekvieno kriterijaus būseną nustato vertintojas.",
      ms: "3. Būtiniausios apsaugos priemonės", ms_row: "Būtiniausios apsaugos priemonės",
      ms_p: "Procedūros, kurias įmonė įdiegia siekdama užtikrinti, kad būtų laikomasi EBPO rekomendacijų daugiašalėms įmonėms ir JT verslo ir žmogaus teisių pagrindinių principų, įskaitant Tarptautinės darbo organizacijos Deklaracijoje nurodytas aštuonias pagrindines konvencijas ir Tarptautinę žmogaus teisių chartiją (Reglamento (ES) 2020/852 18 str.).",
      data: "4. ŠESD duomenys (pagrindimas)",
      data_p: "Projekto skaičiuoklės ŠESD (visos įvestos eilutės), naudojamas kaip pagalbinis rodiklis vertinant svarų prisidėjimą. Tai NE Taksonomijos atitikties verdiktas.",
      col_ind: "Rodiklis", col_val: "Reikšmė", ind: "Projekto ŠESD (įvestos skaičiuoklės eilutės)", not_given: "nenurodyta",
      title: "ES Taksonomijos vertinimo suvestinė - veikla ",
      disclaimer: "Struktūrizuota Taksonomijos suvestinė. Sistema NEteikia galutinio atitikties verdikto - kriterijų būsenas ir galutinį sprendimą priima vertintojas pagal galiojantį {r}. Kriterijų tekstas - sutrumpintas, visas - reglamente.",
      unknown: "Nežinoma veikla: ",
      st: { met: "Atitinka", not_met: "Neatitinka", na: "Netaikoma", pending: "Vertinama" },
      obj: {
        mitigation: "Klimato kaitos švelninimas",
        adaptation: "Prisitaikymas prie klimato kaitos",
        water: "Tausus vandens ir jūrų išteklių naudojimas ir apsauga",
        circular: "Perėjimas prie žiedinės ekonomikos",
        pollution: "Taršos prevencija ir kontrolė",
        biodiversity: "Biologinės įvairovės ir ekosistemų apsauga ir atkūrimas"
      },
      priedelis_a: "Veikla atitinka šio priedo A priedėlyje nustatytus kriterijus (su klimatu susijusios rizikos ir pažeidžiamumo vertinimas, prisitaikymo sprendimai).",
      priedelis_d: "Veikla atitinka šio priedo D priedėlyje nustatytus kriterijus.",
      na: "Netaikoma."
    },
    en: {
      reg: "Delegated Regulation (EU) 2021/2139", reg_acc: "Delegated Regulation (EU) 2021/2139",
      reg_base: "Regulation (EU) 2020/852 (Taxonomy)", red: "consolidated version of 1 January 2026",
      skirsnis: "Annex I, Section {c}",
      project: "Project", code: "Code", subject: "Contracting entity", date: "Prepared on", activity: "Activity", legal: "Legal basis",
      sc: "1. Substantial contribution: ", sc_row: "Substantial contribution to “{o}”",
      col_crit: "Criterion", col_status: "Status", col_ref: "Reference", col_goal: "Objective", col_what: "What to assess",
      dnsh: "2. Do no significant harm (DNSH)",
      dnsh_p: "The activity must not significantly harm the other Taxonomy objectives. The text comes from Annex I of the Regulation; the evaluator sets the status of each criterion.",
      ms: "3. Minimum safeguards", ms_row: "Minimum safeguards",
      ms_p: "Procedures implemented by the undertaking to ensure alignment with the OECD Guidelines for Multinational Enterprises and the UN Guiding Principles on Business and Human Rights, including the eight fundamental conventions identified in the International Labour Organisation Declaration and the International Bill of Human Rights (Article 18 of Regulation (EU) 2020/852).",
      data: "4. GHG data (supporting evidence)",
      data_p: "The project calculator GHG (all entered lines), used as a supporting indicator when assessing substantial contribution. This is NOT a Taxonomy compliance verdict.",
      col_ind: "Indicator", col_val: "Value", ind: "Project GHG (entered calculator lines)", not_given: "not stated",
      title: "EU Taxonomy assessment summary - activity ",
      disclaimer: "A structured Taxonomy summary. The system does NOT provide a final compliance verdict - the criteria statuses and the final decision rest with the evaluator under the applicable {r}. The criteria text is shortened; the full text is in the Regulation.",
      unknown: "Unknown activity: ",
      st: { met: "Compliant", not_met: "Not compliant", na: "Not applicable", pending: "Assessing" },
      obj: {
        mitigation: "Climate change mitigation",
        adaptation: "Climate change adaptation",
        water: "Sustainable use and protection of water and marine resources",
        circular: "Transition to a circular economy",
        pollution: "Pollution prevention and control",
        biodiversity: "Protection and restoration of biodiversity and ecosystems"
      },
      priedelis_a: "The activity complies with the criteria set out in Appendix A to this Annex (climate risk and vulnerability assessment, adaptation solutions).",
      priedelis_d: "The activity complies with the criteria set out in Appendix D to this Annex.",
      na: "N/A."
    }
  };

  // Tekstai - iš EUR-Lex (2021/2139 I priedas, konsoliduota redakcija 2026-01-01; LT ir EN). „a“ / „d“ - A ir D priedėliai, na - akte „Netaikoma“.
  var ACTIVITIES = {
    "4.9": {
      code: "4.9", primaryObjective: "mitigation",
      name: { lt: "Elektros energijos perdavimas ir skirstymas", en: "Transmission and distribution of electricity" },
      scNote: {
        lt: "Veikla atitinka vieną iš kriterijų: 1) infrastruktūra ar įranga yra elektros energijos sistemoje, kuri yra sujungta Europos sistema, arba kurioje daugiau kaip 67 proc. naujai prijungtų gamybos pajėgumų ar vidutinis tinklo taršos koeficientas per penkerių metų laikotarpį nesiekia 100 g CO2e/kWh; 2) veikla yra viena iš reglamente išvardytų (pvz. mažai anglies dioksido išskiriančios gamybos tiesioginė jungtis, reikalavimus atitinkančių transformatorių įrengimas, atsinaujinančiųjų išteklių integravimo ar valdymo įranga). Reikalavimų neatitinka tiesioginė jungtis su elektrine, kurioje per visą gyvavimo ciklą išmetama daugiau kaip 100 g CO2e/kWh, ir pažangiųjų matavimo sistemų reikalavimų neatitinkanti matavimo infrastruktūra. Tai sąlygas sudaranti veikla.",
        en: "The activity complies with one of the criteria: (1) the infrastructure or equipment is in an electricity system that is the interconnected European system, or in which more than 67% of newly enabled generation capacity or the average grid emissions factor is below 100 g CO2e/kWh over a rolling five-year period; (2) the activity is one of those listed in the Regulation (e.g. a direct connection of low-carbon generation, installation of compliant transformers, equipment for integrating renewables or for control). Not compliant: a direct connection to a power plant above 100 g CO2e/kWh on a life cycle basis, and metering infrastructure that does not meet the smart metering requirements. This is an enabling activity."
      },
      dnsh: {
        adaptation: "a",
        water: "na",
        circular: {
          lt: "Parengtas atliekų tvarkymo planas, kuriuo užtikrinamas maksimalus pakartotinis naudojimas arba perdirbimas gyvavimo ciklo pabaigoje pagal atliekų hierarchiją, be kita ko, sudarant sutartis su atliekų tvarkymo partneriais, svarstant finansines prognozes ar oficialius projekto dokumentus.",
          en: "A waste management plan is in place and ensures maximal reuse or recycling at end of life in accordance with the waste hierarchy, including through contractual agreements with waste management partners, reflection in financial projections or official project documentation."
        },
        pollution: {
          lt: "Antžeminės aukštos įtampos linijos: statybvietėse taikomi TFK bendrųjų aplinkos, sveikatos ir saugos gairių principai; veikla atitinka elektromagnetinės spinduliuotės poveikį žmonių sveikatai ribojančias normas (Sąjungoje - Tarybos rekomendaciją 1999/519/EB). Vykdant veiklą polichlorintieji bifenilai (PCB) nenaudojami.",
          en: "Overground high voltage lines: for construction site activities, activities follow the principles of the IFC General Environmental, Health, and Safety Guidelines; activities respect applicable norms limiting the impact of electromagnetic radiation on human health (in the Union, Council Recommendation 1999/519/EC). Activities do not use polychlorinated biphenyls (PCBs)."
        },
        biodiversity: "d"
      }
    },
    "4.1": {
      code: "4.1", primaryObjective: "mitigation",
      name: { lt: "Elektros energijos gamyba naudojant fotovoltinę saulės energijos technologiją", en: "Electricity generation using solar photovoltaic technology" },
      scNote: {
        lt: "Vykdant veiklą gaminama elektra naudojant fotovoltinės saulės energijos technologiją. Kai veikla yra neatsiejama I priedo 7.6 skirsnio veiklos dalis, taikomi 7.6 skirsnio kriterijai.",
        en: "The activity generates electricity using solar PV technology. Where the activity is an integral element of the activity in Section 7.6 of Annex I, the criteria of Section 7.6 apply."
      },
      dnsh: {
        adaptation: "a",
        water: "na",
        circular: {
          lt: "Vykdant šią veiklą įvertinama, ar yra galimybė naudoti itin patvarią ir perdirbamą įrangą bei komponentus, kuriuos lengva išmontuoti ir atnaujinti, ir, kai įmanoma, jie naudojami.",
          en: "The activity assesses availability of and, where feasible, uses equipment and components of high durability and recyclability and that are easy to dismantle and refurbish."
        },
        pollution: "na",
        biodiversity: "d"
      }
    },
    "7.4": {
      code: "7.4", primaryObjective: "mitigation",
      name: { lt: "Elektra varomų transporto priemonių įkrovimo stotelių įrengimas pastatuose (ir prie pastatų esančiose automobilių stovėjimo vietose), techninė priežiūra ir remontas",
              en: "Installation, maintenance and repair of charging stations for electric vehicles in buildings (and parking spaces attached to buildings)" },
      scNote: {
        lt: "Elektra varomų transporto priemonių įkrovimo stotelių įrengimas, techninė priežiūra ir remontas. Tai sąlygas sudaranti veikla.",
        en: "Installation, maintenance or repair of charging stations for electric vehicles. This is an enabling activity."
      },
      dnsh: { adaptation: "a", water: "na", circular: "na", pollution: "na", biodiversity: "na" }
    }
  };

  var STATUSES = ["pending", "met", "not_met", "na"];
  function normStatus(s) { return STATUSES.indexOf(s) !== -1 ? s : "pending"; }
  function kalbaIs(k) { return k === "en" ? "en" : "lt"; }
  function statusLabel(s, k) { return TX[kalbaIs(k)].st[normStatus(s)]; }
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function round(x, dp) { var f = Math.pow(10, dp || 0); return Math.round(num(x) * f) / f; }
  function kgToT(kg) { return round(num(kg) / 1000, 3); }
  function vietos(k) { return k === "en" ? "en-GB" : "lt-LT"; }

  function listActivities(k) {
    k = kalbaIs(k);
    return Object.keys(ACTIVITIES).map(function (c) {
      return { code: ACTIVITIES[c].code, name: ACTIVITIES[c].name[k], placeholder: !!ACTIVITIES[c].placeholder };
    });
  }
  // Tikslų pavadinimai (LT - kaip iki tol, testai ir senas kodas juos skaito)
  var OBJECTIVES = TX.lt.obj;
  function dnshKeys(primary) {
    return Object.keys(OBJECTIVES).filter(function (k) { return k !== primary; });
  }
  // Ką vertinti ir būsena pagal numatymą: kur akte „Netaikoma“ - „Netaikoma“ (vertintojas gali pakeisti)
  function dnshHint(act, key, k) {
    var h = act.dnsh[key], X = TX[k];
    if (h === "a") return X.priedelis_a;
    if (h === "d") return X.priedelis_d;
    if (h === "na") return X.na;
    return h[k];
  }
  function dnshDefault(code, key) {
    var a = ACTIVITIES[code];
    return a && a.dnsh[key] === "na" ? "na" : "pending";
  }

  function buildTaxonomyReport(activityCode, data, statuses, kalba) {
    var k = kalbaIs(kalba || (data && data.kalba)), X = TX[k];
    var act = ACTIVITIES[activityCode];
    if (!act) return { error: X.unknown + activityCode };
    data = data || {}; statuses = statuses || {};
    var dnshStatuses = statuses.dnsh || {};
    var p = data.project || {}; var meta = [];
    if (p.name) meta.push({ label: X.project, value: String(p.name) });
    if (p.code) meta.push({ label: X.code, value: String(p.code) });
    if (p.subject) meta.push({ label: X.subject, value: String(p.subject) });
    if (p.date) meta.push({ label: X.date, value: String(p.date) });
    meta.push({ label: X.activity, value: act.code + " - " + act.name[k] });
    meta.push({ label: X.legal, value: X.reg_base + "; " + X.reg + " (" + X.red + ")" });

    var nuoroda = X.reg + ", " + X.skirsnis.replace("{c}", act.code);
    var sections = [];
    var scStatus = normStatus(statuses.substantialContribution);
    var tikslas = X.obj[act.primaryObjective];
    sections.push({
      heading: X.sc + tikslas,
      paragraphs: [act.scNote[k]],
      tables: [{ columns: [X.col_crit, X.col_status, X.col_ref], widths: [0.5, 0.18, 0.32], statusCol: 1, statusKeys: ["substantialContribution"],
        rows: [[X.sc_row.replace("{o}", tikslas), statusLabel(scStatus, k), nuoroda]] }]
    });

    var keys = dnshKeys(act.primaryObjective);
    var dnshRows = keys.map(function (o) {
      var st = dnshStatuses[o] ? normStatus(dnshStatuses[o]) : dnshDefault(activityCode, o);
      return [X.obj[o], dnshHint(act, o, k), statusLabel(st, k), nuoroda];
    });
    sections.push({ heading: X.dnsh, paragraphs: [X.dnsh_p],
      tables: [{ columns: [X.col_goal, X.col_what, X.col_status, X.col_ref], widths: [0.22, 0.44, 0.13, 0.21], statusCol: 2,
        statusKeys: keys.map(function (o) { return "dnsh." + o; }), rows: dnshRows }] });

    var msStatus = normStatus(statuses.minimumSafeguards);
    sections.push({ heading: X.ms, paragraphs: [X.ms_p],
      tables: [{ columns: [X.col_crit, X.col_status, X.col_ref], widths: [0.5, 0.18, 0.32], statusCol: 1, statusKeys: ["minimumSafeguards"],
        rows: [[X.ms_row, statusLabel(msStatus, k), X.reg_base]] }] });

    var yra = num(data.totalKg) > 0;
    sections.push({ heading: X.data, paragraphs: [X.data_p],
      tables: [{ columns: [X.col_ind, X.col_val], widths: [0.6, 0.4],
        rows: [[X.ind, yra ? kgToT(data.totalKg).toLocaleString(vietos(k), { maximumFractionDigits: 3 }) + " t CO2e" : X.not_given]] }] });

    return { activity: { code: act.code, name: act.name[k] }, kalba: k,
      title: X.title + act.code,
      meta: meta, sections: sections,
      di: num(data.diReiksmes) > 0,
      disclaimer: X.disclaimer.replace("{r}", X.reg_acc),
      verdict: null };
  }

  root.GP_TAXONOMY = { version: VERSION, OBJECTIVES: OBJECTIVES, STATUSES: STATUSES, dnshDefault: dnshDefault,
    listActivities: listActivities, dnshKeys: dnshKeys, buildTaxonomyReport: buildTaxonomyReport };
})(typeof window !== "undefined" ? window : this);
