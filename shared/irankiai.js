/* ============================================================================
 * G-Procure  shared/irankiai.js   (window.GP_IRANKIAI)
 * Įrankių sąrašas - vienas tiesos šaltinis (nuo 2026-11-14; iki tol gyveno „Apie G-Procure“ puslapio scenarijuje):
 * pirkimo ciklo etapai (STAGES), ikonos (IKONOS), įrankiai pirkimo organizatoriams (MODULES) ir tiekėjams (SUPPLY).
 * Naudoja „Apie G-Procure“ (G-Procure_Project.html - žemėlapis, katalogas, skaičiai) ir svetainės paieška (shared/paieska.js).
 * Portalo (index.html) kortelių aprašymai - tie patys sakiniai kaip sumLt / sumEn (sargas shared/testai.html).
 * Pasikeitus įrankiui - atnaujink jo įrašą čia (sumLt, galiLt, daugiauLt, rezLt ir angliškus).
 * ========================================================================== */
(function (root) {
  "use strict";

  /* href reikšmės paimtos pažodžiui iš portalo (index.html) kortelių.
     Kiekvienas įrankis: sumLt / sumEn - vienas sakinys, galiLt / galiEn - ką daro (rodoma iškart),
     daugiauLt / daugiauEn - kitos galimybės (suskleista), rezLt / rezEn - rezultatas.
     Žymos: kortele - skaito bendrą pirkimo kortelę (GP_KORTELE.mount; sargas shared/testai.html),
     ai - veikia DI pagrindu, kalbos - sąsaja arba dokumentai ir anglų kalba.
     Tekstai - tik tai, ką įrankis tikrai daro; pasikeitus įrankiui - atnaujink ir čia.
  */

  var STAGES = [
    { num: 1, lt: "Planavimas", en: "Planning" },
    { num: 2, lt: "Pasirengimas", en: "Preparation" },
    { num: 3, lt: "Vykdymas", en: "Execution" },
    { num: 4, lt: "Ataskaitos ir atitiktis", en: "Reporting and compliance" }
  ];

  /* Ikonos - tos pačios kaip portalo kortelėse (24 x 24, linijinės). */
  var IKONOS = {
    "pp-plan": '<path d="M3 5h18M3 12h18M3 19h12"/><circle cx="20" cy="19" r="2"/>',
    "pp-market-kpi": '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4.5-5"/><circle cx="12" cy="18" r="1.3"/>',
    "pp-ts": '<path d="M9 3h7l4 4v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M16 3v4h4"/><path d="M12 12h4M12 16h4"/><circle cx="6" cy="14" r="3"/>',
    "pp-qual": '<circle cx="12" cy="9" r="6"/><path d="M9 14.5 7 22l5-3 5 3-2-7.5"/><path d="m9.5 9 1.8 1.8L15 7"/>',
    "pp-salygos": '<path d="M9 3h7l4 4v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M16 3v4h4"/><path d="M8 21H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h1"/><path d="M11 12h5M11 16h5"/>',
    "pp-cost-benefit": '<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-2 6a4 4 0 0 0 8 0Z"/><path d="M19 7l2 6a4 4 0 0 1-8 0Z"/>',
    "pp-graphs": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/><path d="M7 14h4M7 17h6"/>',
    "pp-protocols": '<path d="M8 4h9l3 3v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M17 4v3h3"/><path d="M10 12l2 2 4-4"/><path d="M10 17h6"/>',
    "pp-negotiation": '<path d="M3 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3v-3a1 1 0 0 1-1-1Z"/><path d="M9 14v1a2 2 0 0 0 2 2h6l4 3v-3a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-3"/>',
    "pp-report": '<path d="M3 21h18"/><rect x="6" y="13" width="3" height="6"/><rect x="11" y="9" width="3" height="10"/><rect x="16" y="5" width="3" height="14"/>',
    "pp-carbon": '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
    "pp-esg": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "tiekejams": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.5 14.2a6.5 6.5 0 0 1 3 5.8"/>',
    "epd": '<path d="M8 3h8l4 4v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M16 3v4h4"/><path d="M10.5 17c0-3 1.6-5 5-5.5 0 3.4-1.8 5.5-5 5.5Z"/>'
  };

  var MODULES = [
    {
      id: "pp-plan", code: "PP-Planning", stage: 1, cat: "planning",
      badgeLt: "Planavimas", badgeEn: "Planning",
      maturity: "kuriamas",
      nameLt: "Pirkimų planavimas", nameEn: "Procurement planning",
      href: "PP-plan/EPSO-G_pirkimu_planavimas_MVP.html",
      sumLt: "Metinio pirkimų plano analizė: pirkimų sąrašas su pastabomis, vertės ribos pagal to paties tipo pirkimų grupes, terminai ir centralizavimo galimybės.",
      sumEn: "Annual procurement plan analysis: a procurement list with remarks, value thresholds by groups of same-type procurements, timelines and centralisation opportunities.",
      galiLt: [
        "Planą įkelia iš Excel ar CSV ir prie kiekvieno pirkimo parodo, ką pataisyti",
        "To paties tipo pirkimus grupuoja pagal VPT vertės skaičiavimo metodiką ir tikrina, ar pirkimo būdas tinka visos grupės vertei",
        "Neplaninis pirkimas: kurie pirkimo būdai galimi, pridėjus jį prie jau suplanuotų",
        "Terminai ir komandos krūvis pagal standartines pirkimų trukmes"
      ],
      galiEn: [
        "Imports the plan from Excel or CSV and shows what to fix for each procurement",
        "Groups same-type procurements under the VPT value calculation methodology and checks whether the procedure fits the value of the whole group",
        "Unplanned procurement: which procedures are possible once it is added to those already planned",
        "Timelines and team workload based on standard procurement durations"
      ],
      daugiauLt: [
        "Centralizavimo galimybės tarp grupės įmonių - algoritmas naršyklėje, ne DI",
        "Vienos įmonės planas arba visos grupės vaizdas",
        "Iš plano eilutės sukuriama pirkimo kortelė",
        "BVPŽ kodų paieška lietuvių ir anglų kalba"
      ],
      daugiauEn: [
        "Centralisation opportunities between group companies - an algorithm in the browser, not AI",
        "A single company's plan or the group-wide view",
        "A procurement card can be created from a plan line",
        "CPV code search in Lithuanian and English"
      ],
      rezLt: "plano suvestinės Excel ir PDF formatu, pirkimo kortelė",
      rezEn: "plan summaries in Excel and PDF, a procurement card"
    },
    {
      id: "pp-market-kpi", code: "PP-Market-KPI", stage: 1, cat: "analysis",
      kortele: true,
      badgeLt: "Stebėsena", badgeEn: "Monitoring",
      maturity: "naudojamas",
      kalbos: true,
      nameLt: "Rinkos rodiklių stebėsena", nameEn: "Market indicators monitoring",
      href: "PP-market-KPI/EPSO-G_Rinkos_KPI_skydelis.html",
      sumLt: "Rinkos rodikliai ir pirkimo rinkos apžvalga: ką kainų, darbo užmokesčio ir tiekimo rodikliai reiškia konkrečiam pirkimui ir kokių veiksmų imtis sutartyje.",
      sumEn: "Market indicators and a market review for a procurement: what price, wage and supply indicators mean for a specific procurement and which contract actions to take.",
      galiLt: [
        "Kainų, metalų, energijos, transporto ir darbo užmokesčio rodikliai su ribomis; atnaujinami iš viešų šaltinių - Oficialiosios statistikos portalo, Eurostat, FRED, Niujorko federalinio rezervo banko",
        "Pirkimo rinkos apžvalga pagal pirkimo pavadinimą: diagnozė ir rekomenduojami sutartiniai veiksmai",
        "Kainos peržiūros (indeksavimo) sąlyga penkiais žingsniais - pagal VPT tipinių sutarčių sąlygų sandarą",
        "Veiksmai įrašomi į pirkimo kortelę ir rodomi rengiant pirkimo sąlygas"
      ],
      galiEn: [
        "Price, metal, energy, transport and wage indicators with thresholds; updated from public sources - the Official Statistics Portal, Eurostat, FRED, the Federal Reserve Bank of New York",
        "A market review by procurement title: a diagnosis and recommended contract actions",
        "A price review (indexation) clause in five steps - following the structure of the VPT standard contract terms",
        "Actions are saved to the procurement card and shown when the procurement conditions are prepared"
      ],
      daugiauLt: [
        "Rinkų profiliai pagal perkančią įmonę",
        "Iliustracinės ir ankstesnio laikotarpio reikšmės visada pažymėtos",
        "Sąsaja lietuvių ir anglų kalba"
      ],
      daugiauEn: [
        "Market profiles by purchasing company",
        "Illustrative and earlier-period values are always labelled",
        "Interface in Lithuanian and English"
      ],
      rezLt: "rinkos apžvalga, indeksavimo sąlygos tekstas, veiksmai pirkimo kortelėje",
      rezEn: "a market review, the indexation clause text, actions in the procurement card"
    },
    {
      id: "pp-ts", code: "PP-TS", stage: 2, cat: "planning",
      kortele: true,
      badgeLt: "Specifikacija", badgeEn: "Specification",
      maturity: "bandomasis",
      ai: true,
      nameLt: "TS asistentas", nameEn: "TS assistant",
      href: "PP-ts/TS_Asistentas.html",
      sumLt: "Techninės specifikacijos (TS) rengimas ir patikra padedant DI; rinkos konsultacijos klausimynas, kvietimas ir suvestinės.",
      sumEn: "Drafting and checking a technical specification (TS) with AI support; a market consultation questionnaire, invitation and summaries.",
      galiLt: [
        "Parengia TS projektą pagal jūsų atsakymus - tik apie pirkimo objektą: kvalifikacijos reikalavimai, vertinimo kriterijai ir sutarties sankcijos į TS nerašomi",
        "Tikrina parengtą TS taisyklėmis ir DI: subjektyvios sąvokos, prekių ženklai, neaiškūs kiekiai",
        "Rinkos konsultacija: klausimai pagal TS, kvietimas, atsakymų suvestinė be dalyvių pavadinimų, susitikimo santrauka",
        "Pirkimo vykdytojas ir įstatymas (PĮ arba VPĮ) - teisės nuorodos pagal jį"
      ],
      galiEn: [
        "Drafts a TS from your answers - only about the subject of the procurement: qualification requirements, award criteria and contract penalties are not written into the TS",
        "Checks a prepared TS with rules and AI: subjective terms, brand names, unclear quantities",
        "Market consultation: questions based on the TS, an invitation, a summary of answers without participant names, a meeting summary",
        "Contracting body and law (PĮ or VPĮ) - legal references follow it"
      ],
      daugiauLt: [
        "Panašių sutarčių paieška viešuose pirkimų duomenyse",
        "DI kainos įvertis - tik orientacinis ir į numatomą vertę neperkeliamas",
        "Word dokumentai oficialiu stiliumi; DI parengtas tekstas pažymėtas"
      ],
      daugiauEn: [
        "Search for similar contracts in public procurement data",
        "The AI price estimate is indicative only and is not carried over to the estimated value",
        "Word documents in an official style; AI-drafted text is labelled"
      ],
      rezLt: "TS Word dokumentas, patikros ataskaita, rinkos konsultacijos dokumentai",
      rezEn: "a TS Word document, a check report, market consultation documents"
    },
    {
      id: "pp-qual", code: "PP-QUAL", stage: 2, cat: "planning",
      kortele: true,
      badgeLt: "Kvalifikacija", badgeEn: "Qualification",
      maturity: "bandomasis",
      ai: true,
      kalbos: true,
      nameLt: "Kvalifikaciniai reikalavimai", nameEn: "Qualification requirements",
      href: "PP-qual/PP-QUAL.html",
      sumLt: "Tiekėjų kvalifikacijos reikalavimų rengimas ir proporcingumo patikra pagal VPT metodiką, padedant DI.",
      sumEn: "Preparing supplier qualification requirements and checking their proportionality against the VPT methodology, with AI support.",
      galiLt: [
        "Patirties ir pajamų ribos pagal VPT Tiekėjo kvalifikacijos reikalavimų nustatymo metodiką - pagal numatomą vertę, objektą ir sutarties trukmę",
        "Parengia reikalavimus pagal pirkimo kontekstą arba patikrina jūsų tekstą - taisyklėmis ir DI",
        "Kiekvieną reikalavimą patvirtina žmogus; DI pataisos taikomos tik jas pažymėjus",
        "Specialistų reikalavimai vertinami atskirai nuo tiekėjo patirties; sertifikatams primenama „arba lygiavertis“"
      ],
      galiEn: [
        "Experience and turnover limits under the VPT methodology for setting supplier qualification requirements - by estimated value, subject and contract duration",
        "Drafts requirements from the procurement context or checks your text - with rules and AI",
        "Each requirement is approved by a person; AI corrections are applied only when selected",
        "Requirements for specialists are assessed separately from supplier experience; for certificates it reminds you of “or equivalent”"
      ],
      daugiauLt: [
        "Pirkimo objekto dalims - ribos kiekvienai daliai",
        "Dvikalbis LT / EN priedas su vertimo patikra",
        "Nepatvirtintas ar nepatikrintas rinkinys žymimas juodraščiu"
      ],
      daugiauEn: [
        "For lots - limits for each lot",
        "A bilingual LT / EN annex with a translation check",
        "An unapproved or unchecked set is marked as a draft"
      ],
      rezLt: "Word priedas pirkimo sąlygoms - vidinė versija ir versija tiekėjams",
      rezEn: "a Word annex to the procurement conditions - an internal version and a version for suppliers"
    },
    {
      id: "pp-salygos", code: "PP-SALYGOS", stage: 2, cat: "planning",
      kortele: true,
      badgeLt: "Sąlygos", badgeEn: "Conditions",
      maturity: "kuriamas",
      ai: true,
      kalbos: true,
      nameLt: "Pirkimo sąlygų generatorius", nameEn: "Procurement conditions generator",
      href: "PP-salygos/PP-SALYGOS.html",
      sumLt: "Pirkimo sąlygų paketas ir sutarties projektas iš standartinių šablonų - sąlygų teksto DI nerašo - ir parengtų dokumentų patikra.",
      sumEn: "A procurement conditions package and a draft contract from standard templates - AI does not write the text of the conditions - plus a check of prepared documents.",
      galiLt: [
        "Bendrosios ir specialiosios sąlygos, tiekėjo formos ir priedai: atviras konkursas, skelbiamos ir neskelbiamos derybos, mažos vertės pirkimas, dinaminė pirkimo sistema - lietuvių arba lietuvių ir anglų kalba",
        "Sutarties projektas iš septynių LITGRID sutarčių šeimų - nuo prekių ir paslaugų iki rangos ir eksploatavimo darbų",
        "Iš jūsų dokumentų perkeliama: kvalifikacijos ir žaliųjų reikalavimų lentelės, kainų lentelė iš Excel, vertinimo metodika; grafikas - iš pirkimo kortelės",
        "Kiekviena siūloma reikšmė pažymėta „Siūloma“ ir tampa „Patvirtinta“ tik jūsų veiksmu"
      ],
      galiEn: [
        "General and special conditions, supplier forms and annexes: open procedure, negotiated procedures with and without publication, small-value procurement, dynamic purchasing system - in Lithuanian or in Lithuanian and English",
        "A draft contract from seven LITGRID contract families - from goods and services to works and maintenance works",
        "Carried over from your documents: qualification and green requirement tables, a price table from Excel, the evaluation methodology; the schedule - from the procurement card",
        "Each suggested value is marked “Suggested” and becomes “Confirmed” only through your action"
      ],
      daugiauLt: [
        "„Tikrinti parengtus dokumentus“: palyginimas su standartine forma, privalomi dokumentų ir sutarties elementai, techninės specifikacijos, sąlygų ir sutarties nuoseklumas - taisyklėmis, be DI",
        "DI gali pasiūlyti atsakymus iš jūsų dokumentų su citata: siunčiama paspaudus mygtuką arba jums leidus tam pirkimui; nacionalinio saugumo pirkime - tik mygtuku",
        "Sugeneruoto paketo patikra, santrauka tvirtintojui ir CVP IS pildymo atmintinė",
        "Darbas saugomas juodraštyje šioje naršyklėje - galima tęsti vėliau",
        "DI vertimai į anglų kalbą ir DI atpažintas skenuotų dokumentų tekstas dokumentuose pažymėti",
        "Pirkimo vykdytojas - LITGRID AB arba AB „Amber Grid“: pirkimo sąlygos - tie patys šablonai su jos duomenimis, sutarties projektas - prekėms, paslaugoms ir statybos rangai"
      ],
      daugiauEn: [
        "“Check prepared documents”: comparison with the standard form, mandatory document and contract elements, consistency of the technical specification, conditions and contract - rule-based, without AI",
        "AI can suggest answers from your documents with a citation: content is sent when you press the button or when you allow it for that procurement; in a national security procurement - only by button",
        "A check of the generated package, a summary for the approver and a CVP IS data-entry checklist",
        "Work is saved as a draft in this browser - you can continue later",
        "AI translations into English and AI-recognised text of scanned documents are labelled in the documents",
        "Contracting body - LITGRID AB or AB “Amber Grid”: procurement conditions - the same templates with its data, draft contract - for goods, services and construction works"
      ],
      rezLt: "Word dokumentų paketas (ZIP), sutarties projektas, patikros ataskaita",
      rezEn: "a package of Word documents (ZIP), a draft contract, a check report"
    },
    {
      id: "pp-cost-benefit", code: "PP-Cost-Benefit", stage: 2, cat: "analysis",
      kortele: true,
      badgeLt: "Analizė", badgeEn: "Analysis",
      maturity: "kuriamas",
      kalbos: true,
      nameLt: "Kaštų-naudos analizė", nameEn: "Cost-benefit analysis",
      href: "PP-cost-benefit/",
      sumLt: "Dvi dalys: ekonominio naudingumo skaičiuoklė pasiūlymų vertinimui ir kaštų ir naudos analizė didelės vertės pirkimams.",
      sumEn: "Two parts: an economic-benefit calculator for tender evaluation and a cost-benefit analysis for high-value procurements.",
      galiLt: [
        "Vertinimo kriterijų rekomendacijos pagal pirkimo pavadinimą - ir saugaus darbų organizavimo bei gyvavimo ciklo sąnaudų",
        "Lyginamieji svoriai ir formulės pagal VPT gaires; prireikus - atskiri kriterijai pirkimo objekto dalims",
        "Vertinimo metodikos priedas pirkimo sąlygoms (Word, lietuvių arba anglų kalba); metodika įrašoma ir į pirkimo kortelę",
        "Tiekėjų pasiūlymų balai, pasiūlymų eilė ir vertinimo suvestinė komisijai"
      ],
      galiEn: [
        "Award criteria recommendations from the procurement title - including safe work organisation and life-cycle costs",
        "Weights and formulas from the VPT guidelines; where needed - separate criteria for lots",
        "An evaluation methodology annex for the procurement conditions (Word, in Lithuanian or English); the methodology is also saved to the procurement card",
        "Tender scores, a ranking and an evaluation summary for the committee"
      ],
      daugiauLt: [
        "Teisinės patikros pagal PĮ arba VPĮ ir minimalus pereinamasis kokybės balas",
        "Kaštų ir naudos analizė: alternatyvų palyginimas, grynoji dabartinė vertė ir daugiakriterė matrica",
        "Skaičiuoklės sąsaja lietuvių ir anglų kalba"
      ],
      daugiauEn: [
        "Legal checks under PĮ or VPĮ and a minimum quality pass score",
        "Cost-benefit analysis: comparison of alternatives, net present value and a multi-criteria matrix",
        "The calculator interface in Lithuanian and English"
      ],
      rezLt: "vertinimo metodikos priedas, vertinimo suvestinė, kaštų ir naudos analizė",
      rezEn: "an evaluation methodology annex, an evaluation summary, a cost-benefit analysis"
    },
    {
      id: "pp-graphs", code: "PP-Graphs", stage: 2, cat: "planning",
      kortele: true,
      badgeLt: "Grafikai", badgeEn: "Schedules",
      maturity: "naudojamas",
      kalbos: true,
      nameLt: "Pirkimų grafikų generatorius", nameEn: "Procurement schedule generator",
      href: "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html",
      sumLt: "Pirkimo procedūros grafikas darbo dienomis pagal pirkimo būdą ir standartines pirkimų trukmes.",
      sumEn: "A procedure schedule in working days, based on the procurement procedure and standard procurement durations.",
      galiLt: [
        "Etapų grafikas pagal pirkimo būdą; terminai skaičiuojami darbo dienomis su Lietuvos šventėmis",
        "Įspėja, kai etapas trumpesnis už įstatymo minimumą - PĮ arba VPĮ pagal įmonę",
        "Standartinės pirkimų trukmės 2026 ir 2027 m. ir trukmių skaičiuoklė",
        "Grafikas įrašomas į pirkimo kortelę - iš jos jis patenka į specialiąsias pirkimo sąlygas"
      ],
      galiEn: [
        "A stage schedule by procedure; deadlines are counted in working days with Lithuanian public holidays",
        "Warns when a stage is shorter than the statutory minimum - PĮ or VPĮ depending on the company",
        "Standard procurement durations for 2026 and 2027 and a duration calculator",
        "The schedule is saved to the procurement card - from there it goes into the special procurement conditions"
      ],
      daugiauLt: [
        "Grafikas anglų kalba; pirkimo pavadinimą gali išversti DI",
        "Palyginimas su panašiais CVP IS pirkimais pagal BVPŽ kodą"
      ],
      daugiauEn: [
        "A schedule in English; AI can translate the procurement title",
        "Comparison with similar CVP IS procurements by CPV code"
      ],
      rezLt: "spausdinamas grafikas (PDF), grafikas pirkimo kortelėje",
      rezEn: "a printable schedule (PDF), a schedule in the procurement card"
    },
    {
      id: "pp-protocols", code: "PP-Protocols", stage: 3, cat: "execution",
      kortele: true,
      badgeLt: "Vykdymas", badgeEn: "Execution",
      maturity: "kuriamas",
      kalbos: true,
      nameLt: "Protokolų generatorius", nameEn: "Protocol generator",
      href: "PP-protocol/LITGRID_Generatorius_v3.html",
      sumLt: "Pirkimo komisijos protokolai ir pranešimai tiekėjams pagal PĮ - vienoda struktūra nuo pirkimo pradžios iki laimėtojo.",
      sumEn: "Procurement committee protocols and notices to suppliers under PĮ - a consistent structure from the start of a procurement to the award.",
      galiLt: [
        "Protokolų sekos atviram konkursui, skelbiamoms ir neskelbiamoms deryboms, dinaminei pirkimo sistemai",
        "Pranešimai tiekėjams pagal protokolo sprendimus - kiekvienam tiekėjui pagal jo rezultatą, lietuvių ir anglų kalba",
        "Komisijos sprendimai be numatytųjų reikšmių: kol nepasirinkta, protokolas negeneruojamas",
        "Terminų skaičiuoklė: atidėjimo terminas, pretenzijos, darbo dienos"
      ],
      galiEn: [
        "Protocol sequences for the open procedure, negotiated procedures with and without publication, and the dynamic purchasing system",
        "Notices to suppliers based on the protocol decisions - for each supplier according to its result, in Lithuanian and English",
        "Committee decisions have no default values: until a choice is made, the protocol is not generated",
        "A deadline calculator: standstill period, claims, working days"
      ],
      daugiauLt: [
        "Užkoduota užklausa organizacijos patvirtintam DI įrankiui - tiekėjai kodais, sumos procentais",
        "Pirkimų importas iš Excel ir veiksmų žurnalas"
      ],
      daugiauEn: [
        "An encoded prompt for an AI tool approved by the organisation - suppliers as codes, amounts as percentages",
        "Import of procurements from Excel and an action log"
      ],
      rezLt: "protokolai ir pranešimai tiekėjams Word formatu",
      rezEn: "protocols and notices to suppliers in Word"
    },
    {
      id: "pp-negotiation", code: "PP-Negotiation", stage: 3, cat: "execution",
      kortele: true,
      badgeLt: "Vykdymas", badgeEn: "Execution",
      maturity: "kuriamas",
      ai: true,
      kalbos: true,
      nameLt: "Derybų pasirengimo įrankis", nameEn: "Negotiation preparation tool",
      href: "PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html",
      sumLt: "Nuo tiekėjų pasiūlymų iki derybų plano: įkainių matrica, derybų ribos ir rekomendacijos kiekvienam tiekėjui.",
      sumEn: "From supplier offers to a negotiation plan: a line-item price matrix, negotiation limits and recommendations for each supplier.",
      galiLt: [
        "Pasiūlymai įkeliami iš Excel, Word ar PDF; keli failai iš karto ir neaiškūs failai pirmiausia parodomi peržiūrai",
        "Įkainių matrica: mažiausias, aukštas ir rizikingai žemas įkainis, derybų svertas",
        "Rekomendacijos kiekvienam tiekėjui ir derybų ribos",
        "Užkoduotos DI užklausos: tiekėjai kodais, sumos procentais"
      ],
      galiEn: [
        "Offers are loaded from Excel, Word or PDF; several files at once and unclear files are first shown for review",
        "A line-item price matrix: the lowest, a high and a risky-low rate, negotiation leverage",
        "Recommendations for each supplier and negotiation limits",
        "Encoded AI prompts: suppliers as codes, amounts as percentages"
      ],
      daugiauLt: [
        "PDF, kurio įrankis pats neperskaito, gali perskaityti DI - tik paspaudus",
        "Derybų sesijų ir raundų žurnalas",
        "Sąsaja lietuvių ir anglų kalba, analizės eksportas į Excel"
      ],
      daugiauEn: [
        "A PDF the tool cannot read itself can be read by AI - only on click",
        "A log of negotiation sessions and rounds",
        "Interface in Lithuanian and English, analysis export to Excel"
      ],
      rezLt: "derybų planas ir analizė Excel formatu",
      rezEn: "a negotiation plan and an analysis in Excel"
    },
    {
      id: "pp-report", code: "PP-Report", stage: 4, cat: "reporting",
      kortele: true,
      badgeLt: "Pažymos", badgeEn: "Reports",
      maturity: "kuriamas",
      nameLt: "Tiekėjų apklausos pažyma", nameEn: "Supplier survey report",
      href: "PP-report/PP-report.html",
      sumLt: "Mažos vertės pirkimo pažyma ir raštai tiekėjams pagal LITGRID mažos vertės pirkimų tvarkos aprašą.",
      sumEn: "A small-value procurement report and letters to suppliers under LITGRID's small-value procurement rules.",
      galiLt: [
        "Dvi pažymos formos - Aprašo 1 ir 2 priedai",
        "Patikra prieš generuojant: neatsakyti klausimai ir prieštaravimai su nuorodomis į laukus",
        "Pasiūlymų eilė, lėšų ir sumų su PVM patikra",
        "Raštai tiekėjams apie priimtus sprendimus"
      ],
      galiEn: [
        "Two report forms - Annexes 1 and 2 of the rules",
        "A check before generating: unanswered questions and contradictions with links to the fields",
        "Tender ranking, a check of funds and of amounts with VAT",
        "Letters to suppliers about the decisions taken"
      ],
      rezLt: "pažyma ir raštai tiekėjams Word formatu",
      rezEn: "a report and letters to suppliers in Word"
    },
    {
      id: "pp-carbon", code: "PP-carbon", stage: 4, cat: "reporting",
      badgeLt: "Ataskaitos", badgeEn: "Reporting",
      maturity: "kuriamas",
      ai: true,
      kalbos: true,
      nameLt: "Anglies pėdsakas", nameEn: "Carbon footprint",
      href: "PP-carbon/index.html",
      sumLt: "Projekto ŠESD (CO2e) skaičiavimas ir tiekėjų pasiūlymų anglies pėdsako vertinimas.",
      sumEn: "Project GHG (CO2e) calculation and carbon footprint evaluation of supplier offers.",
      galiLt: [
        "Projekto skaičiuoklė su emisijos faktorių biblioteka",
        "Produkto EPD reikšmę (A1-A3) DI pasiūlo su citata - ji patvirtinama tik tada, kai reikšmė yra dokumente",
        "Tiekėjų pasiūlymų vertinimas pagal kainą ir anglies pėdsaką",
        "Ataskaitos: ES taksonomijos suvestinė, vieša ataskaita, duomenų taškas ESG įrankiui"
      ],
      galiEn: [
        "A project calculator with an emission factor library",
        "AI proposes the product EPD value (A1-A3) with a citation - it is confirmed only when the value is in the document",
        "Evaluation of supplier offers by price and carbon footprint",
        "Reports: an EU Taxonomy summary, a public report, a data point for the ESG tool"
      ],
      daugiauLt: [
        "Metodinis pagrindas - GHG protokolas, EN 15804 ir gyvavimo ciklo vertinimas",
        "Sąsaja lietuvių ir anglų kalba"
      ],
      daugiauEn: [
        "Methodological basis - the GHG Protocol, EN 15804 and life-cycle assessment",
        "Interface in Lithuanian and English"
      ],
      rezLt: "anglies pėdsako įvertinimas ir ataskaitos Word formatu",
      rezEn: "a carbon footprint assessment and reports in Word",
      extra: [
        { href: "PP-carbon/epd.html", labelLt: "Tiekėjo EPD įrankis", labelEn: "Supplier EPD tool" }
      ]
    },
    {
      id: "pp-esg", code: "PP-ESG", stage: 4, cat: "reporting",
      badgeLt: "Ataskaitos", badgeEn: "Reporting",
      maturity: "kuriamas",
      ai: true,
      kalbos: true,
      nameLt: "ESG ir atitiktis", nameEn: "ESG and compliance",
      href: "PP-esg/index.html",
      sumLt: "Tiekėjų rizikos registras, sankcijų patikros ir ESRS duomenys vienoje vietoje.",
      sumEn: "A supplier risk register, sanctions checks and ESRS data in one place.",
      galiLt: [
        "Tiekėjų rizikos registras: rizikos lygį įrankis tik siūlo, pasirenkate patys",
        "Automatinė patikra ES, JT, OFAC ir JK sankcijų sąrašuose (tik bendrovėms); nepasiekiamas sąrašas rodomas kaip nepatikrintas",
        "Kiekvieną galimą atitikmenį įvertina žmogus; DI sankcijų rizikos vertinimas - pagalbinis ir pažymėtas",
        "ESRS duomenų taškai ir patikrų žurnalo eksportas"
      ],
      galiEn: [
        "A supplier risk register: the tool only suggests the risk level, you choose it",
        "An automatic check against the EU, UN, OFAC and UK sanctions lists (companies only); an unreachable list is shown as not checked",
        "Each possible match is assessed by a person; the AI sanctions-risk assessment is advisory and labelled",
        "ESRS data points and export of the check log"
      ],
      daugiauLt: [
        "Tiekėjų importas iš viešų sutarčių duomenų",
        "Sąsaja lietuvių ir anglų kalba"
      ],
      daugiauEn: [
        "Import of suppliers from public contract data",
        "Interface in Lithuanian and English"
      ],
      rezLt: "dokumentuota tiekėjų patikrų istorija (JSON, CSV)",
      rezEn: "a documented history of supplier checks (JSON, CSV)"
    }
  ];

  /* Kita pirkimo pusė. Laikoma ATSKIRAI nuo MODULES, nes tai ne ciklo etapas:
     MODULES varo ciklo žemėlapį, katalogo filtrus ir brandos skaičius, o šie
     įrankiai į tą ciklą neįeina. Teiginiai čia sutampa su tuo, ką sako patys
     įrankiai ir portalas - naujų pažadų nepridedama. */
  var SUPPLY = [
    {
      code: "PP-tiekejams", ikona: "tiekejams",
      nameLt: "G-Procure Tiekėjams", nameEn: "G-Procure for Suppliers",
      descLt: "Padeda susigaudyti bet kurio CVP IS pirkimo dokumentuose - nuo pirkimo apžvalgos iki klausimo pirkimo vykdytojui.",
      descEn: "Helps make sense of the documents of any CVP IS procurement - from an overview of the procurement to a question for the contracting body.",
      galiLt: [
        "Pirkimų paieška viešuose CVP IS duomenyse ir pirkimo apžvalga: terminai, laiko juosta, į ką atkreipti dėmesį",
        "Atsakymai į klausimus su citatomis iš pirkimo dokumentų; atsakymus rengia DI - tai ne teisinė konsultacija",
        "Kontrolinis sąrašas, pasirengimo planas ir klausimo projektas pirkimo vykdytojui",
        "Parodo, kur lietuviškas ir angliškas tekstas ar skaičius ir žodžiai skiriasi"
      ],
      galiEn: [
        "Procurement search in public CVP IS data and an overview of the procurement: dates, a timeline, what to pay attention to",
        "Answers to questions with citations from the procurement documents; the answers are prepared by AI and are not legal advice",
        "A checklist, a preparation plan and a draft question for the contracting body",
        "Shows where the Lithuanian and English texts, or figures and words, differ"
      ],
      noteLt: "Pirkimo vykdytojas ir teisinis režimas (PĮ arba VPĮ) atpažįstami iš skelbimo, pirkimo dokumentų ar CVP IS duomenų ir patvirtinami naudotojo. Pagrindiniai pirkimo duomenys gaunami iš viešų VPT CVP IS duomenų per G-Procure serverį; vieši dokumentai parsisiunčiami pagal pirkimo numerį (kai CVP IS prašo prisijungti - įkeliate patys) ir skaitomi jūsų naršyklėje. Užduodant klausimą jo tekstas ir susiję dokumentų fragmentai siunčiami į Claude API per G-Procure serverį.",
      noteEn: "The contracting body and the legal regime (PĮ or VPĮ) are recognised from the notice, the procurement documents or CVP IS data and confirmed by the user. The main procurement data comes from public VPT CVP IS data via the G-Procure server; public documents are downloaded by procurement number (when CVP IS requires signing in, you upload them yourself) and are read in your browser. When you ask a question, its text and the related document fragments are sent to the Claude API via the G-Procure server.",
      href: "PP-tiekejams/index.html"
    },
    {
      code: "PP-carbon", ikona: "epd",
      nameLt: "Tiekėjo EPD įrankis", nameEn: "Supplier EPD tool",
      descLt: "Anglies pėdsako modulio palydovas tiekėjui: iš produkto aplinkosauginės deklaracijos (EPD) - reikšmė pasiūlymui.",
      descEn: "The carbon footprint module's companion for suppliers: from a product's environmental declaration (EPD) to a value for the offer.",
      galiLt: [
        "Įkeliate produkto EPD (PDF) - DI pasiūlo A1-A3 GWP reikšmę su citata iš dokumento",
        "Reikšmė patvirtinama tik tada, kai ji yra dokumento tekste; kitaip ją įrašote patys",
        "Vienetai perskaičiuojami pagal deklaruotą kiekį"
      ],
      galiEn: [
        "You upload a product EPD (PDF) - AI proposes the A1-A3 GWP value with a citation from the document",
        "The value is confirmed only when it is in the document text; otherwise you enter it yourself",
        "Units are converted according to the declared quantity"
      ],
      noteLt: "Galutinę reikšmę patikrina ir patvirtina žmogus.",
      noteEn: "The final value is checked and confirmed by a human.",
      href: "PP-carbon/epd.html"
    }
  ];

  root.GP_IRANKIAI = { STAGES: STAGES, IKONOS: IKONOS, MODULES: MODULES, SUPPLY: SUPPLY };
})(typeof window !== "undefined" ? window : this);
