/* ============================================================================
 * G-Procure  shared/mano-pirkimai.js   (window.GP_MANO_PIRKIMAI)
 * ----------------------------------------------------------------------------
 * Darbo stalas „Mano pirkimai“ portale (tobulinimo planas U1, 2026-09-26).
 * Aktyvios pirkimų kortelės ŠIOJE naršyklėje (shared/pirkimo-kortele.js):
 * artimiausias terminas darbo dienomis (shared/workdays.js), kitas žingsnis
 * pagal kortelės būseną ir įrankiai, atveriami jau su pasirinktu pirkimu
 * (?kortele=<id> - modulio juosta ją pasirenka ir užpildo tuščius laukus).
 *
 * TAISYKLĖS:
 *  - Be kortelių blokas nerodomas: portalas naujam naudotojui lieka toks pat.
 *  - Neperskaitoma saugykla NIEKADA nevirsta „pirkimų nėra“ - blokas rodomas su
 *    priežastimi (GP_SAUGYKLA.pranesimas).
 *  - Kitas žingsnis - tik iš kortelės duomenų (būsena, trūkstami laukai): įrankiai
 *    nežino, kas jau padaryta, todėl nieko nežadame.
 *  - Užbaigti (sudaryta sutartis, nutrauktas) ir archyvuoti nerodomi - tik jų skaičius.
 *  - Tekstai LT / EN pagal <html lang>; kortelių turinys - kaip įvestas.
 *  - CVP IS patikra (2026-10-18): TIK paspaudus „Patikrinti CVP IS duomenis“ aktyvių kortelių CVP IS numeriai siunčiami
 *    per shared/vpt-duomenys.js (G-Procure serveris, vieši VPT duomenys); prie kortelės - pasiūlymų termino, paskelbimo datos
 *    ir būsenos skirtumai (GP_VPT.skirtumai) ir „Atnaujinti kortelę“ (kortelių puslapis ?vpt=1). Kortelės nekeičiamos,
 *    rezultatai - tik atmintyje; ryšio klaida niekada nevirsta „sutampa“ ar „nėra“ (shared/busena.js).
 *  - Trys vaizdai (2026-11-25, naudotojo pastaba: vienu metu vykdant iki dešimties pirkimų portalo pradžia ilgėja su kiekvienu pirkimu):
 *    rezimas "santrauka" - portale vienodo aukščio santrauka (skaičiai ir iki 3 artimiausių terminų plytelėmis, visi - darbo stale),
 *    rezimas "stalas" - darbo stalas mano-pirkimai.html (rodikliai-filtrai, 8 savaičių terminų laiko juosta, grupės pagal terminą
 *    ar etapą, paieška, išsamios eilutės, CVP IS patikra), be rezimo - ankstesnis sąrašas (eilutės, „Rodyti visus“).
 *    „Reikia dėmesio“ - tik iš kortelės ir jau turimų duomenų: trūksta duomenų, paskelbto pirkimo terminas praėjo, įrankių rezultatai
 *    sudaryti pagal ankstesnius kortelės duomenis, CVP IS skirtumai (tik po patikros). Teisės pokyčiai - informacija, ne dėmesys.
 * Nieko nesaugo.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var T = {
    lt: {
      kortelesPav: "Pirkimų kortelės", pradzia: "Pirkimo pradžia", paskelbimas: "Paskelbimas", pasiulymuTerminas: "Pasiūlymų terminas",
      siandien: "šiandien", rytoj: "rytoj", po: "po", dd: "d. d.", kd: "d.", praejo: "praėjo", beTerminu: "Terminų kortelėje nėra",
      paskelbtasPraejo: "pasiūlymų terminas praėjo - jei pasiūlymai vertinami, pakeiskite kortelės būseną",
      trukstaPrad: "Papildykite kortelę: trūksta ", zingsnis: "Kitas žingsnis: ",
      planuojamas: "pirkimo grafikas", rengiamas: "pirkimo dokumentai",
      paskelbtas: "laukiama pasiūlymų", vertinamas: "pasiūlymų vertinimas ir komisijos sprendimai",
      grafikas: "Grafikas", kvalifikacija: "Kvalifikacija", kortele: "Kortelė",
      ts: "TS", salygos: "Sąlygos", protokolai: "Protokolai", pazyma: "Pažyma", derybos: "Derybos", vertinimas: "Vertinimas", parengtis: "Dokumentų patikra",
      kna: "Kaštų ir naudos analizė", vertinamasMV: "pasiūlymų vertinimas ir pažyma",
      naujasSkirtukas: "atsidaro naujame skirtuke", daugiau: "Rodyti visus", baigti: "Užbaigtų ar archyvuotų pirkimų: ",
      visosKorteles: "visos kortelės", aktyviuNera: "Aktyvių pirkimų nėra.", CVP: "CVP IS ",
      cvpTikrinti: "Patikrinti CVP IS duomenis",
      cvpPag: "Į G-Procure serverį siunčiami tik šių kortelių CVP IS numeriai ({n}); serveris duomenis ima iš viešų VPT duomenų, atnaujinamų kas 6 val. Kortelės nekeičiamos.",
      cvpEiga: "Tikrinami CVP IS duomenys ({n})...", cvpNepavyko: "CVP IS duomenų patikrinti nepavyko",
      cvpRysys: "G-Procure serveris neatsakė arba VPT sąrašas dar neįkeltas - bandykite vėliau.",
      cvpSuvestine: "Patikrinta kortelių: {n} (VPT sąrašas atnaujintas {t}). Skiriasi nuo CVP IS: {p}, sutampa: {s}",
      cvpNeraS: ", VPT sąraše nėra: {m}", cvpKlaidaS: ", patikrinti nepavyko: {k}",
      cvpRiba: " Vienu kartu tikrinamos ne daugiau kaip {r} kortelės su artimiausiais terminais.",
      cvpTerminas: "CVP IS pasiūlymų terminas: {v}", cvpPaskelbimas: "CVP IS paskelbimo data: {v}", cvpBusena: "CVP IS būsena: {v}",
      cvpTrukme: "CVP IS sutarties trukmė: {v}", cvpLTrukme: "sutarties trukmė", men: "mėn.",
      cvpTrukmePst: " - skelbime „Numatomas galiojimas“ kartais įrašomas pasiūlymo galiojimas; patikrinkite sutarties projekte",
      cvpIssiuntimas: " - tarptautiniam pirkimui kortelėje įrašykite skelbimo išsiuntimo iš VPT datą (ji būna iki 5 d. ankstesnė už paskelbimo datą)",
      cvpKortelejeYra: " (kortelėje - {k})", cvpKortelejeNera: " (kortelėje neįrašyta)",
      cvpSutampa: "Sutampa su CVP IS duomenimis: {l}.", cvpLTerminas: "pasiūlymų terminas", cvpLPaskelbimas: "paskelbimo data", cvpLBusena: "būsena",
      cvpNeraDuomenu: "CVP IS duomenyse termino, paskelbimo datos ir būsenos nėra.",
      cvpAbejotina: " Su kortele sutarties trukmė nelyginta.",
      cvpTolesnis: "CVP IS pasiūlymų terminas {d} skirtas tolesniam pirkimo etapui ({e} etapas), todėl su kortelės terminu nelygintas. Pirmo etapo terminą rasite skelbime.",
      cvpNera: "CVP IS numerio {nr} VPT sąraše nėra - patikrinkite numerį kortelėje.",
      cvpKlaida: "Šios kortelės CVP IS duomenų gauti nepavyko.",
      cvpAtnaujinti: "Atnaujinti kortelę", cvpAtverti: "Atverti CVP IS",
      povPrad: "Sudaryta pagal ankstesnius kortelės duomenis: ", povKortele: "Peržiūrėti kortelėje",
      teisePrad: "Teisės pokyčiai šiam pirkimui: ", teiseDar: " (dar įsigalios: {n})", teisePirkimoMetu: "pirkimo metu pasikeitė: {n}",
      teisePerziureti: "Peržiūrėti teisės stebėsenoje",
      teiseNepavyko: "Teisės pokyčių šiems pirkimams patikrinti nepavyko - teisės pokyčių sąrašo įkelti nepavyko.",
      teiseBeEs: "ES teisės pokyčių sąrašo įkelti nepavyko - rodomi tik nacionalinės teisės pokyčiai.",
      teiseBeLt: "Nacionalinės teisės pokyčių sąrašo įkelti nepavyko - rodomi tik ES teisės pokyčiai.",
      // Santrauka ir darbo stalas (2026-11-25)
      sAktyvus: ["aktyvus pirkimas", "aktyvūs pirkimai", "aktyvių pirkimų"], sGreit: "terminai per 5 d. d.: {n}", sDem: "reikia dėmesio: {n}",
      sVisi: "Visi pirkimai ({n})", sVisiSub: "Darbo stale - terminų juosta ir įrankiai",
      demTruksta: "Trūksta duomenų", demPraejo: "Pakeiskite būseną", demPoveikis: "Peržiūrėkite pakeitimus", demCvp: "Skiriasi nuo CVP IS",
      beDatos: "Data", rAktyvus: "Aktyvūs pirkimai", rGreit: "Terminai per 5 d. d.", rDem: "Reikia dėmesio", rBaigti: "Užbaigti ar archyvuoti",
      rodytiAria: "Rodyti pirkimus", tlH: "Terminų laiko juosta", tlLaikas: "{nuo} - {iki}", tlTuscia: "Šiame laikotarpyje terminų nėra",
      tlKitas: "kitas terminas {d}", tlAnks: "paskutinis terminas {d}", tlSiand: "Šiandien", tlEtapas: "Grafiko etapas", tlEtapai: "Grafiko etapai",
      tlNera: "Aktyvių pirkimų su terminais nėra - įrašykite datas kortelėje arba sudarykite pirkimo grafiką.", sutartiesData: "Sutarties sudarymas",
      sarH: "Pirkimai", grupuoti: "Grupuoti", pagalTermina: "Pagal terminą", pagalEtapa: "Pagal etapą", ieskoti: "Ieškoti pirkimo",
      ieskotiPh: "Pavadinimas ar numeris", gGreit: "Per 5 darbo dienas", gPraejo: "Terminai praėję", gMenuo: "Per 4 savaites", gVeliau: "Vėliau",
      gBe: "Be terminų", gBeBusenos: "Būsena nenurodyta", rodoma: "Rodoma {n} iš {m}.", rodytiVisus: "Rodyti visus",
      stalasTuscias: "Pirkimų kortelių šioje naršyklėje dar nėra. Darbo stale matysite visus savo pirkimus: artimiausius terminus, ką reikia papildyti, ir įrankius, atveriamus jau su pasirinktu pirkimu.",
      pirmaKortele: "Sukurti pirmą kortelę",
      eksportH: "Atsisiųsti", icsMyg: "Terminai į kalendorių (.ics)", icsFailas: "Pirkimų-terminai", icsKal: "G-Procure pirkimų terminai",
      icsTerm: ["terminas", "terminai", "terminų"], icsNr: "Pirkimo numeris", icsBus: "Būsena",
      icsOk: "Atsisiųsta: {f} ({n}). Atverkite failą - kalendoriaus programa (pvz., Outlook) pridės terminus; prieš pasiūlymų terminą - priminimas dieną anksčiau.",
      icsNera: "Šiandien ir vėliau terminų kortelėse nėra - kalendoriaus failas nesudarytas.",
      icsSalt: "Šaltinis - G-Procure pirkimo kortelė šioje naršyklėje ({d}). Prieš terminą patikrinkite CVP IS.",
      planMyg: "Savaitės planas (Word)", planFailas: "Savaitės-planas", planEiga: "Sudaromas savaitės planas...", planKlaida: "Savaitės plano sudaryti nepavyko",
      planOk: "Atsisiųsta: {f}.", planBib: "Nepavyko įkelti Word bibliotekos ({f}) - patikrinkite interneto ryšį.", planTitle: "Pirkimų savaitės planas",
      planParengta: "Parengta {d}. Duomenys - šios naršyklės pirkimų kortelės (G-Procure „Mano pirkimai“); prieš veiksmus patikrinkite CVP IS.",
      planSuv: "Aktyvių pirkimų: {a} · terminų per dvi savaites: {n} · reikia dėmesio: {d}", planSi: "Ši savaitė", planKita: "Kita savaitė",
      planBeTerm: "Terminų nėra.", planCData: "Data", planCTerm: "Terminas", planCPirk: "Pirkimas", planCBus: "Būsena", planCLiko: "Liko",
      planDem: "Reikia dėmesio", planDem0: "Pirkimų, kuriems reikia dėmesio, nėra.", planCKa: "Ką padaryti", planKiti: "Kiti aktyvūs pirkimai", planCArt: "Artimiausias terminas",
      demPoveikisKa: "Peržiūrėkite įrankių rezultatus - jie sudaryti pagal ankstesnius kortelės duomenis.", demCvpKa: "Kortelės duomenys skiriasi nuo CVP IS - atnaujinkite kortelę.",
      dienos: ["sekmadienis", "pirmadienis", "antradienis", "trečiadienis", "ketvirtadienis", "penktadienis", "šeštadienis"],
      pinOn: "Prisegti portale", pinOff: "Atsegti nuo portalo", pinZyma: "Prisegta", pinKlaida: "Prisegti nepavyko",
      kruvis: "Terminų per savaitę", kruvisSav: "nuo {d}: {n}", kruvisDaug: "Savaitė, kai terminų {n} ir daugiau",
      nerasta: "Pagal pasirinkimą pirkimų nerasta.", menesiai: ["Sau", "Vas", "Kov", "Bal", "Geg", "Bir", "Lie", "Rgp", "Rgs", "Spa", "Lap", "Gru"]
    },
    en: {
      kortelesPav: "Procurement cards", pradzia: "Procurement start", paskelbimas: "Publication", pasiulymuTerminas: "Tender deadline",
      siandien: "today", rytoj: "tomorrow", po: "in", dd: "working days", kd: "days", praejo: "passed", beTerminu: "No dates on the card",
      paskelbtasPraejo: "the tender deadline has passed - if the tenders are being evaluated, change the card status",
      trukstaPrad: "Complete the card: missing ", zingsnis: "Next step: ",
      planuojamas: "procurement schedule", rengiamas: "procurement documents",
      paskelbtas: "waiting for tenders", vertinamas: "tender evaluation and committee decisions",
      grafikas: "Schedule", kvalifikacija: "Qualification", kortele: "Card",
      ts: "Specification", salygos: "Conditions", protokolai: "Protocols", pazyma: "Report", derybos: "Negotiation", vertinimas: "Evaluation", parengtis: "Readiness check",
      kna: "Cost-benefit analysis", vertinamasMV: "tender evaluation and the report",
      naujasSkirtukas: "opens in a new tab", daugiau: "Show all", baigti: "Completed or archived: ",
      visosKorteles: "all cards", aktyviuNera: "No active procurements.", CVP: "CVP IS ",
      cvpTikrinti: "Check CVP IS data",
      cvpPag: "Only the CVP IS numbers of these cards ({n}) are sent to the G-Procure server; it answers from public VPT data refreshed every 6 hours. The cards are not changed.",
      cvpEiga: "Checking CVP IS data ({n})...", cvpNepavyko: "Could not check the CVP IS data",
      cvpRysys: "The G-Procure server did not respond or the VPT list is not loaded yet - try again later.",
      cvpSuvestine: "Cards checked: {n} (VPT list updated {t}). Differ from CVP IS: {p}, match: {s}",
      cvpNeraS: ", not in the VPT list: {m}", cvpKlaidaS: ", could not be checked: {k}",
      cvpRiba: " Up to {r} cards with the nearest dates are checked at a time.",
      cvpTerminas: "CVP IS tender deadline: {v}", cvpPaskelbimas: "CVP IS publication date: {v}", cvpBusena: "CVP IS status: {v}",
      cvpTrukme: "CVP IS contract duration: {v}", cvpLTrukme: "contract duration", men: "months",
      cvpTrukmePst: " - the notice “Estimated duration” sometimes holds the tender validity period; check the draft contract",
      cvpIssiuntimas: " - for international procurement enter the date the notice was dispatched from VPT (up to 5 days before publication)",
      cvpKortelejeYra: " (on the card: {k})", cvpKortelejeNera: " (not on the card)",
      cvpSutampa: "Matches the CVP IS data: {l}.", cvpLTerminas: "tender deadline", cvpLPaskelbimas: "publication date", cvpLBusena: "status",
      cvpNeraDuomenu: "The CVP IS data have no deadline, publication date or status.",
      cvpAbejotina: " The contract duration was not compared with the card.",
      cvpTolesnis: "The CVP IS tender deadline {d} is for a later stage of the procurement (stage {e}), so it was not compared with the card deadline. The first-stage deadline is in the notice.",
      cvpNera: "CVP IS number {nr} is not in the VPT list - check the number on the card.",
      cvpKlaida: "Could not get the CVP IS data for this card.",
      cvpAtnaujinti: "Update the card", cvpAtverti: "Open in CVP IS",
      povPrad: "Made with earlier card data: ", povKortele: "Review on the card",
      teisePrad: "Legal changes for this procurement: ", teiseDar: " (more entering into force - {n})", teisePirkimoMetu: "changed during the procurement - {n}",
      teisePerziureti: "Review in law monitoring",
      teiseNepavyko: "The legal changes for these procurements could not be checked - the law monitoring register was not loaded.",
      teiseBeEs: "The EU law register could not be loaded - only national law changes are shown.",
      teiseBeLt: "The national law register could not be loaded - only EU law changes are shown.",
      sAktyvus: ["active procurement", "active procurements", "active procurements"], sGreit: "deadlines within 5 working days: {n}", sDem: "need attention: {n}",
      sVisi: "All procurements ({n})", sVisiSub: "On the desk - timeline and tools",
      demTruksta: "Data missing", demPraejo: "Update the status", demPoveikis: "Review the changes", demCvp: "Differs from CVP IS",
      beDatos: "Date", rAktyvus: "Active procurements", rGreit: "Deadlines within 5 working days", rDem: "Need attention", rBaigti: "Completed or archived",
      rodytiAria: "Show procurements", tlH: "Timeline of dates", tlLaikas: "{nuo} - {iki}", tlTuscia: "No dates in this period",
      tlKitas: "next date {d}", tlAnks: "last date {d}", tlSiand: "Today", tlEtapas: "Schedule stage", tlEtapai: "Schedule stages",
      tlNera: "No active procurements with dates - enter the dates on the card or prepare the procurement schedule.", sutartiesData: "Contract signing",
      sarH: "Procurements", grupuoti: "Group", pagalTermina: "By date", pagalEtapa: "By stage", ieskoti: "Search procurements",
      ieskotiPh: "Title or number", gGreit: "Within 5 working days", gPraejo: "Dates passed", gMenuo: "Within 4 weeks", gVeliau: "Later",
      gBe: "No dates", gBeBusenos: "Status not specified", rodoma: "Showing {n} of {m}.", rodytiVisus: "Show all",
      stalasTuscias: "There are no procurement cards in this browser yet. The desk shows all your procurements: the nearest dates, what needs completing, and the tools that open with the procurement already selected.",
      pirmaKortele: "Create the first card",
      eksportH: "Download", icsMyg: "Dates to calendar (.ics)", icsFailas: "Procurement-dates", icsKal: "G-Procure procurement dates",
      icsTerm: ["date", "dates", "dates"], icsNr: "Procurement number", icsBus: "Status",
      icsOk: "Downloaded: {f} ({n}). Open the file - the calendar app (e.g. Outlook) will add the dates, with a reminder one day before each tender deadline.",
      icsNera: "The cards have no dates from today onwards - no calendar file was created.",
      icsSalt: "Source - G-Procure procurement card in this browser ({d}). Check CVP IS before the deadline.",
      planMyg: "Weekly plan (Word)", planFailas: "Weekly-plan", planEiga: "Preparing the weekly plan...", planKlaida: "The weekly plan could not be prepared",
      planOk: "Downloaded: {f}.", planBib: "The Word library ({f}) could not be loaded - check the internet connection.", planTitle: "Procurement weekly plan",
      planParengta: "Prepared {d}. Data - the procurement cards in this browser (G-Procure “My procurements”); check CVP IS before acting.",
      planSuv: "Active procurements: {a} · dates within two weeks: {n} · need attention: {d}", planSi: "This week", planKita: "Next week",
      planBeTerm: "No dates.", planCData: "Date", planCTerm: "Date type", planCPirk: "Procurement", planCBus: "Status", planCLiko: "Left",
      planDem: "Need attention", planDem0: "No procurements need attention.", planCKa: "What to do", planKiti: "Other active procurements", planCArt: "Nearest date",
      demPoveikisKa: "Review the tool results - they were prepared with earlier card data.", demCvpKa: "The card data differ from CVP IS - update the card.",
      dienos: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      pinOn: "Pin to the portal", pinOff: "Unpin from the portal", pinZyma: "Pinned", pinKlaida: "Could not pin",
      kruvis: "Dates per week", kruvisSav: "from {d}: {n}", kruvisDaug: "Week with {n} or more dates",
      nerasta: "No procurements match the selection.", menesiai: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    }
  };
  /* Įrankiai, kurie skaito kortelę (A1). Kelias - nuo svetainės šaknies. Rodomi pagal pirkimo būseną (naudotojo
     sprendimas 2026-09-26): planuojant - grafikas (ir kaštų ir naudos analizė didelės vertės pirkimui), rengiant -
     TS, kvalifikacija, sąlygos, grafikas ir skelbimo parengties patikra, paskelbus - protokolai, vertinant - protokolai arba mažos vertės pažyma,
     vertinimas ir derybos (tik būdui su derybomis). Pirmas - pagrindinis. Įrankiai, kurie rengia tik LITGRID AB
     dokumentus pagal PĮ (litgrid), kitos organizacijos ar VPĮ pirkimui nesiūlomi; nežinomas vykdytojas - siūlomi
     (numatytasis kontekstas - LITGRID). Sąlygos - ir AB „Amber Grid“ (nuo 2026-11-03, tas pats modelis su jos duomenimis - `vykdytojai`).
     Kas padaryta, įrankiai nežino - tai tik pagal kortelės būseną. */
  var IRANKIAI = {
    grafikas: { kelias: "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html" },
    kna: { kelias: "PP-cost-benefit/kastu_naudos_analize.html", litgrid: true, salyga: function (k) {
      var C = global.GP_THRESHOLDS && global.GP_THRESHOLDS.CBA;               // riba - iš shared/thresholds.js
      return !!(C && C.rekomenduojama && k.verte >= C.rekomenduojama);
    } },
    ts: { kelias: "PP-ts/TS_Asistentas.html" },            // nuo 2026-10-27 PP-ts - visos grupės įmonės ir VPĮ (2026-11-06)
    kvalifikacija: { kelias: "PP-qual/PP-QUAL.html" },
    salygos: { kelias: "PP-salygos/PP-SALYGOS.html", litgrid: true, vykdytojai: ["litgrid", "amber-grid"], salyga: function (k) {
      return !k.budas || !global.GP_METHODS || !!global.GP_METHODS.toSalygos(k.budas);   // būdas, kuriam šablonų nėra - nesiūloma
    } },
    protokolai: { kelias: "PP-protocol/LITGRID_Generatorius_v3.html", litgrid: true, salyga: function (k) { return !mazosVertes(k); } },
    pazyma: { kelias: "PP-report/PP-report.html", litgrid: true, salyga: mazosVertes },
    vertinimas: { kelias: "PP-cost-benefit/ekonominio_naudingumo_skaiciuokle.html" },
    derybos: { kelias: "PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html", salyga: function (k) {
      var m = k.budas && global.GP_METHODS ? global.GP_METHODS.byId(k.budas) : null;
      return !!(m && m.derybos);
    } },
    // Parengtų dokumentų patikra (A4; nuo 2026-10-06 - PP-salygos skirtukas „Tikrinti parengtus dokumentus“) - paskutinis žingsnis
    // prieš skelbiant; neskelbiamiems būdams nesiūloma. Ne tik LITGRID: paketo patikra bendra, su forma lyginama, kai ji atpažįstama.
    parengtis: { kelias: "PP-salygos/PP-SALYGOS.html", zyme: "#tikrinti", salyga: function (k) {
      var m = k.budas && global.GP_METHODS ? global.GP_METHODS.byId(k.budas) : null;
      return !m || m.skelbiama !== false;
    } }
  };
  var PAGAL_BUSENA = {
    planuojamas: ["grafikas", "kna"],
    rengiamas: ["ts", "kvalifikacija", "salygos", "grafikas", "parengtis"],
    paskelbtas: ["protokolai"],
    vertinamas: ["protokolai", "pazyma", "vertinimas", "derybos"]
  };
  function mazosVertes(k) {
    var m = k.budas && global.GP_METHODS ? global.GP_METHODS.byId(k.budas) : null;
    return !!(m && m.grupe === "mazos_vertes");
  }
  /* Kortelės pirkimui tinkami įrankiai pagal būseną (tvarka - svarba). */
  function irankiai(k) {
    return (PAGAL_BUSENA[k.busena] || []).filter(function (r) {
      var x = IRANKIAI[r];
      if (x.litgrid && ((k.vykdytojas && (x.vykdytojai || ["litgrid"]).indexOf(k.vykdytojas) < 0) || (k.rezimas && k.rezimas !== "PI"))) return false;
      return !x.salyga || x.salyga(k);
    });
  }
  var BAIGTOS = { sutartis: 1, nutrauktas: 1 };
  /* „Trūksta ...“ - kilmininkas (LT), be jo „trūksta vertė“. */
  var TRUKSTA = { lt: { verte: "vertės", budas: "būdo", vykdytojas: "vykdytojo", rezimas: "taikomo įstatymo", busena: "būsenos" },
                  en: { verte: "value", budas: "procedure", vykdytojas: "contracting body", rezimas: "legal regime", busena: "status" } };
  var TERMINAI = ["pasiulymuTerminas", "paskelbimas", "pradzia"];
  /* CVP IS patikra: vienu paspaudimu - ne daugiau kaip MAX_CVP numerių (nginx riba - 30 užklausų iš karto), po 3 lygiagrečiai. */
  var MAX_CVP = 25, LYGIAGRECIAI = 3;
  var CVP_ET = { pasiulymuTerminas: "cvpTerminas", paskelbimas: "cvpPaskelbimas", busena: "cvpBusena", trukmeMen: "cvpTrukme" };
  var CVP_PAV = { pasiulymuTerminas: "cvpLTerminas", paskelbimas: "cvpLPaskelbimas", busena: "cvpLBusena", trukmeMen: "cvpLTrukme" };
  var SKAITIKLIS = 0;
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? String(o[k]) : m; }); }
  function cvpNr(k) { var n = String((k && k.cvpisNr) || "").trim(); return /^\d{5,9}$/.test(n) ? n : ""; }
  /* f kiekvienam sąrašo elementui, ne daugiau kaip n vienu metu; rezultatai - ta pačia tvarka (klaida - { ok: false, rusis: "rysys" }). */
  function eile(sarasas, n, f) {
    var rez = new Array(sarasas.length), i = 0;
    function kitas() {
      if (i >= sarasas.length) return Promise.resolve();
      var j = i++;
      return Promise.resolve().then(function () { return f(sarasas[j]); })
        .then(function (r) { rez[j] = r; }, function () { rez[j] = { ok: false, rusis: "rysys" }; }).then(kitas);
    }
    var darbai = [];
    for (var k = 0; k < Math.min(n, sarasas.length); k++) darbai.push(kitas());
    return Promise.all(darbai).then(function () { return rez; });
  }

  function kalba(o) {
    var l = o && o.getLang ? o.getLang() : (document.documentElement.getAttribute("lang") || "lt");
    return /^en/i.test(l) ? "en" : "lt";
  }
  function dienos(isoData) { var p = String(isoData).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  /* Darbo dienos nuo šiandien (neįskaitant) iki datos (įskaitant); 0 - šiandien. */
  function darboDienos(nuo, iki) {
    var a = new Date(nuo.getFullYear(), nuo.getMonth(), nuo.getDate()), b = new Date(iki.getFullYear(), iki.getMonth(), iki.getDate());
    var n = 0, W = global.GP_WORKDAYS;
    for (var d = new Date(a); d < b; ) { d.setDate(d.getDate() + 1); if (!W || W.isWorkday(d)) n++; }
    return n;
  }
  /* Artimiausias būsimas terminas; jei visi praėję - vėliausias; jei nėra - null. dd - darbo dienos, kd - kalendorinės (2026-11-06:
     „šiandien“ - tik kai kd = 0; terminas su laiku, kuris šiandien jau praėjo, - „praėjo“; iki tol sekmadienio terminas penktadienį
     ir terminas 09.00 22 valandą rodyti „šiandien“). */
  function terminas(k, dabar) {
    var siandien = new Date(dabar.getFullYear(), dabar.getMonth(), dabar.getDate()), buvusiu = [], busimu = [];
    TERMINAI.forEach(function (f) {
      if (!k[f]) return;
      var d = dienos(k[f]);
      if (isNaN(d.getTime())) return;
      var lm = /T(\d{2}):(\d{2})/.exec(String(k[f]));
      var praejes = d < siandien || (lm && d.getTime() === siandien.getTime() && (+lm[1] * 60 + +lm[2]) <= dabar.getHours() * 60 + dabar.getMinutes());
      (praejes ? buvusiu : busimu).push({ laukas: f, data: d, tekstas: String(k[f]).replace("T", " ") });
    });
    busimu.sort(function (a, b) { return a.data - b.data; });
    buvusiu.sort(function (a, b) { return b.data - a.data; });
    if (busimu.length) { var x = busimu[0]; x.dd = darboDienos(siandien, x.data); x.kd = Math.round((x.data - siandien) / 864e5); return x; }
    if (buvusiu.length) { var y = buvusiu[0]; y.praejo = true; return y; }
    return null;
  }

  /* Bendri santraukai, darbo stalui ir eilutėms (2026-11-25) */
  var TRUKSTA_LAUKAI = ["verte", "budas", "vykdytojas", "rezimas", "busena"];
  function trukstaLauku(k) { return TRUKSTA_LAUKAI.filter(function (f) { return k[f] === null || k[f] === undefined || k[f] === ""; }); }
  function likoTekstas(trm, t) {
    return trm.praejo ? t.praejo : trm.kd === 0 ? t.siandien : trm.kd === 1 ? t.rytoj
      : trm.dd === 0 ? t.po + " " + trm.kd + " " + t.kd : t.po + " " + trm.dd + " " + t.dd;
  }
  function greit(x) { return !!(x.t && !x.t.praejo && x.t.dd <= 5); }
  /* Skaičiaus forma: [1, 2-9, 10-20 ir 0] (LT) arba [1, kiti] (EN) */
  function forma(f, n, l) {
    if (l === "en") return n === 1 ? f[0] : f[1];
    var d = n % 10, s = n % 100;
    return d === 1 && s !== 11 ? f[0] : d >= 2 && s < 11 || d >= 2 && s > 19 ? f[1] : f[2];
  }
  function normQ(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  function du(n) { return (n < 10 ? "0" : "") + n; }
  function isoData(d) { return d.getFullYear() + "-" + du(d.getMonth() + 1) + "-" + du(d.getDate()); }
  function eilId(k) { return /^[A-Za-z0-9_-]{1,80}$/.test(String(k && k.id)) ? "gpmp-" + k.id : ""; }
  /* Laiko juostos taškai ir grafiko etapai */
  var TL_TASKAI = ["pradzia", "paskelbimas", "pasiulymuTerminas", "sutartiesData"];
  function taskai(k) {
    return TL_TASKAI.filter(function (f) { return k[f]; }).map(function (f) {
      var d = dienos(k[f]);
      return isNaN(d.getTime()) ? null : { laukas: f, data: d, tekstas: String(k[f]).replace("T", " ") };
    }).filter(Boolean);
  }
  function etapai(k) {
    var g = k && k.grafikas;
    if (!g || !Array.isArray(g.etapai)) return [];
    return g.etapai.map(function (e) {
      if (!e || !e.nuo || !e.iki) return null;
      var a = dienos(e.nuo), b = dienos(e.iki);
      return isNaN(a.getTime()) || isNaN(b.getTime()) || b < a ? null
        : { pavadinimas: String(e.pavadinimas || ""), stadija: e.stadija, nuo: a, iki: b, nuoT: String(e.nuo).slice(0, 10), ikiT: String(e.iki).slice(0, 10) };
    }).filter(Boolean).sort(function (x, y) { return x.nuo - y.nuo; });
  }

  /* Laiko juostos langas (2026-11-25): 8 savaitės nuo praėjusios savaitės pirmadienio - stulpeliai yra savaitės, krūvis skaičiuojamas jomis */
  function langas(dabar) {
    var d = new Date(dabar.getFullYear(), dabar.getMonth(), dabar.getDate()), dow = (d.getDay() + 6) % 7;
    var s0 = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow - 7);
    return { s0: s0, s1: new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + 56), siand: d };
  }
  var KRUVIS_DAUG = 3;   // savaitė, kai terminų tiek ar daugiau, pažymima (įrankio orientyras, ne taisyklė)
  /* Prisegti pirkimai (2026-11-25): kortelių id, kurias žmogus nori matyti portalo santraukoje pirmas. Saugoma ten pat, kur kortelės
     (GP_KORTELE.saugykla() - ir testų saugykla); tik id, ne duomenys. Neperskaitomas įrašas - tarsi nėra (GP_SAUGYKLA jį nukopijuoja). */
  var PRISEGTI = "gprocure.manoPirkimai.prisegti";
  function prisegti(st) {
    var S = global.GP_SAUGYKLA;
    if (!S) return [];
    var r = S.skaityk(PRISEGTI, { saugykla: st, tikrink: function (v) { return !!v && Array.isArray(v.id); } });
    return r.busena === "yra" ? r.reiksme.id.filter(function (x) { return typeof x === "string" && x; }).slice(0, 200) : [];
  }
  function laikasMin(k, f) { var m = /T(\d{2}):(\d{2})/.exec(String(k[f] || "")); return m ? { h: m[1], m: m[2], min: +m[1] * 60 + +m[2] } : null; }
  function praejusi(p, k, siand, dabar) {
    var lm = laikasMin(k, p.laukas);
    return p.data < siand || !!(lm && p.data.getTime() === siand.getTime() && lm.min <= dabar.getHours() * 60 + dabar.getMinutes());
  }
  /* RFC 5545: tekstas ekranuojamas, eilutės - ne ilgesnės kaip 75 baitų (UTF-8), tęsinys prasideda tarpu */
  function icsEsc(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function icsLankstyk(eil) {
    var out = "", b = 0;
    for (var i = 0; i < eil.length; i++) {
      var c = eil.codePointAt(i), n = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4, ch = String.fromCodePoint(c);
      if (c > 0xffff) i++;
      if (b + n > 75) { out += "\r\n "; b = 1; }
      out += ch; b += n;
    }
    return out;
  }
  var VTIMEZONE = ["BEGIN:VTIMEZONE", "TZID:Europe/Vilnius",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0300", "TZNAME:EEST", "DTSTART:19700329T030000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0200", "TZNAME:EET", "DTSTART:19701025T040000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"];
  /* Kalendoriaus failas (2026-11-25): kiekviena šiandienos ir vėlesnė kortelės data - įvykis; pasiūlymų terminas su laiku (Vilniaus laikas,
     30 min., priminimas dieną anksčiau), kitos datos - visos dienos. UID pastovus (kortelė ir laukas), todėl tas pats terminas - tas pats įvykis.
     sar - [{ k }] arba kortelės; o - { kalba, dabar }. Grąžina { tekstas, kiek }. Nieko nesiunčia. */
  function icsTekstas(sar, o) {
    o = o || {};
    var l = o.kalba === "en" ? "en" : "lt", t = T[l], dabar = o.dabar ? new Date(o.dabar) : new Date(), K = global.GP_KORTELE;
    var siand = new Date(dabar.getFullYear(), dabar.getMonth(), dabar.getDate());
    var dd = function (d) { return d.getFullYear() + du(d.getMonth() + 1) + du(d.getDate()); };
    var utc = function (d) { return d.getUTCFullYear() + du(d.getUTCMonth() + 1) + du(d.getUTCDate()) + "T" + du(d.getUTCHours()) + du(d.getUTCMinutes()) + du(d.getUTCSeconds()) + "Z"; };
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//G-Procure//Mano pirkimai//" + l.toUpperCase(), "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:" + icsEsc(t.icsKal), "X-WR-TIMEZONE:Europe/Vilnius"].concat(VTIMEZONE), ivykiai = [];
    (sar || []).forEach(function (x) {
      var k = x && x.k ? x.k : x;
      if (!k) return;
      taskai(k).forEach(function (p) {
        if (praejusi(p, k, siand, dabar)) return;
        var lm = laikasMin(k, p.laukas), sum = t[p.laukas] + ": " + (k.pavadinimas || "?");
        var apr = [k.numeris ? t.icsNr + ": " + k.numeris : "", cvpNr(k) ? "CVP IS: " + cvpNr(k) : "",
          K && k.busena ? t.icsBus + ": " + (K.busenosPav(k.busena, l) || k.busena) : "", fmt(t.icsSalt, { d: isoData(siand) })].filter(Boolean).join("\n");
        var e = ["BEGIN:VEVENT", "UID:" + String(k.id).replace(/[^A-Za-z0-9_-]/g, "_") + "-" + p.laukas + "@g-procure.com", "DTSTAMP:" + utc(dabar)];
        if (lm) {
          var g = new Date(Date.UTC(p.data.getFullYear(), p.data.getMonth(), p.data.getDate(), +lm.h, +lm.m + 30));
          e.push("DTSTART;TZID=Europe/Vilnius:" + dd(p.data) + "T" + lm.h + lm.m + "00",
            "DTEND;TZID=Europe/Vilnius:" + g.getUTCFullYear() + du(g.getUTCMonth() + 1) + du(g.getUTCDate()) + "T" + du(g.getUTCHours()) + du(g.getUTCMinutes()) + "00");
        } else e.push("DTSTART;VALUE=DATE:" + dd(p.data), "DTEND;VALUE=DATE:" + dd(new Date(p.data.getFullYear(), p.data.getMonth(), p.data.getDate() + 1)));
        e.push("SUMMARY:" + icsEsc(sum), "DESCRIPTION:" + icsEsc(apr), "TRANSP:TRANSPARENT");
        if (p.laukas === "pasiulymuTerminas") e.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(sum), "TRIGGER:-P1D", "END:VALARM");
        e.push("END:VEVENT");
        ivykiai.push({ data: p.data.getTime() + (lm ? lm.min : 0), e: e });
      });
    });
    ivykiai.sort(function (a, b) { return a.data - b.data; }).forEach(function (x) { L = L.concat(x.e); });
    L.push("END:VCALENDAR");
    return { tekstas: L.map(icsLankstyk).join("\r\n") + "\r\n", kiek: ivykiai.length };
  }
  function demKa(d, k, t, l) {
    return d === "demTruksta" ? t.trukstaPrad + trukstaLauku(k).map(function (f) { return TRUKSTA[l][f]; }).join(", ") + "."
      : d === "demPraejo" ? t.zingsnis + t.paskelbtasPraejo + "."
      : d === "demPoveikis" ? t.demPoveikisKa : d === "demCvp" ? t.demCvpKa : (t[d] || d);
  }
  /* Savaitės planas (2026-11-25): ši ir kita savaitė (nuo pirmadienio), reikia dėmesio, kiti aktyvūs pirkimai - tik iš kortelių ir jau
     apskaičiuoto dėmesio. sar - [{ k, t, dem }] (darbo stalo aktyvūs pirkimai); o - { kalba, dabar }. */
  function planoDuomenys(sar, o) {
    o = o || {};
    var l = o.kalba === "en" ? "en" : "lt", t = T[l], dabar = o.dabar ? new Date(o.dabar) : new Date(), K = global.GP_KORTELE;
    var siand = new Date(dabar.getFullYear(), dabar.getMonth(), dabar.getDate()), dow = (siand.getDay() + 6) % 7;
    var p0 = new Date(siand.getFullYear(), siand.getMonth(), siand.getDate() - dow), su = {};
    var bus = function (k) { return (K && K.busenosPav(k.busena, l)) || ""; };
    var sav = [0, 1].map(function (i) {
      var a = new Date(p0.getFullYear(), p0.getMonth(), p0.getDate() + 7 * i);
      return { pav: i ? t.planKita : t.planSi, nuo: a, iki: new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6), eil: [] };
    });
    (sar || []).forEach(function (x) {
      var k = x.k;
      taskai(k).forEach(function (p) {
        sav.forEach(function (s) {
          if (p.data < s.nuo || p.data > s.iki) return;
          var lm = laikasMin(k, p.laukas), trm = { praejo: praejusi(p, k, siand, dabar), kd: Math.round((p.data - siand) / 864e5), dd: darboDienos(siand, p.data) };
          s.eil.push({ data: p.data.getTime() + (lm ? lm.min : 0), tekstas: isoData(p.data) + ", " + t.dienos[p.data.getDay()] + (lm ? " " + lm.h + ":" + lm.m : ""),
            terminas: t[p.laukas], pirkimas: k.pavadinimas || "?", numeris: k.numeris || "", busena: bus(k), liko: likoTekstas(trm, t) });
          su[k.id] = true;
        });
      });
    });
    sav.forEach(function (s) { s.eil.sort(function (a, b) { return a.data - b.data; }); });
    return {
      kalba: l, parengta: isoData(siand), nuo: isoData(sav[0].nuo), iki: isoData(sav[1].iki), aktyvios: (sar || []).length,
      terminu: sav[0].eil.length + sav[1].eil.length,
      savaites: sav.map(function (s) { return { pav: s.pav + " (" + isoData(s.nuo) + " - " + isoData(s.iki) + ")", eil: s.eil }; }),
      demesys: (sar || []).filter(function (x) { return x.dem && x.dem.length; }).map(function (x) {
        return { pirkimas: x.k.pavadinimas || "?", numeris: x.k.numeris || "", ka: x.dem.map(function (d) { return demKa(d, x.k, t, l); }) };
      }),
      kiti: (sar || []).filter(function (x) { return !su[x.k.id]; }).map(function (x) {
        return { pirkimas: x.k.pavadinimas || "?", numeris: x.k.numeris || "", busena: bus(x.k),
          artimiausias: x.t ? t[x.t.laukas] + " " + x.t.tekstas + (x.t.praejo ? " (" + t.praejo + ")" : "") : t.beTerminu };
      })
    };
  }
  /* Word (docx.js ir shared/docx-stiliai.js - įkeliami tik prireikus): A4, lentelės DXA ir FIXED per teksto plotį, antraštė prieš lentelę -
     be „laikyti su kitu“ (Pages kitaip perkelia ją su visa lentele). Vidaus darbo dokumentas, ne pirkimo dokumentas. */
  function planoDocx(P) {
    var D0 = global.docx, ST = global.GP_DOCX_STILIAI;
    if (!D0 || !ST) return Promise.reject(new Error("docx"));
    var t = T[P.kalba] || T.lt, D = ST.oficialus(D0), PLOTIS = 9638, PARASTE = 1134, PILKA = "595959", fonas = ST.fonas(D0);
    var RIBA = { style: D.BorderStyle.SINGLE, size: 4, color: "BFBFBF" }, RIBOS = { top: RIBA, bottom: RIBA, left: RIBA, right: RIBA };
    var run = function (tx, x) { return new D.TextRun(Object.assign({ text: String(tx == null ? "" : tx) }, x || {})); };
    var par = function (v, x) { return new D.Paragraph(Object.assign({ children: Array.isArray(v) ? v : [run(v)] }, x || {})); };
    var antr = function (tx, priesLentele) { return par([run(tx, { bold: true, size: 24 })], Object.assign({ spacing: { before: 280, after: 100 } }, priesLentele ? {} : { keepNext: true })); };
    var cel = function (c, plotis, galva) {
      var x = { width: { size: plotis, type: D.WidthType.DXA }, borders: RIBOS,
        children: (Array.isArray(c) ? c : [c]).map(function (y) { return y instanceof D0.Paragraph ? y : par([run(y, { size: 18, bold: !!galva })]); }) };
      if (galva) x.shading = fonas;
      return new D.TableCell(x);
    };
    var lent = function (cols, galva, eil) {
      return new D.Table({ width: { size: PLOTIS, type: D.WidthType.DXA }, columnWidths: cols, layout: D.TableLayoutType.FIXED,
        rows: [new D.TableRow({ tableHeader: true, cantSplit: true, children: galva.map(function (g, i) { return cel(g, cols[i], true); }) })]
          .concat(eil.map(function (r) { return new D.TableRow({ cantSplit: true, children: r.map(function (c, i) { return cel(c, cols[i]); }) }); })) });
    };
    var pirk = function (x) { var a = [par([run(x.pirkimas, { bold: true, size: 18 })])]; if (x.numeris) a.push(par([run(x.numeris, { size: 16, color: PILKA })])); return a; };
    var ch = [par([run(t.planTitle, { bold: true, size: 32 })], { spacing: { after: 60 } }),
      par([run(P.nuo + " - " + P.iki, { bold: true, size: 24 })], { spacing: { after: 60 } }),
      par([run(fmt(t.planSuv, { a: P.aktyvios, n: P.terminu, d: P.demesys.length }), { size: 18, color: PILKA })], { spacing: { after: 120 } })];
    P.savaites.forEach(function (s) {
      ch.push(antr(s.pav, s.eil.length > 0));
      if (s.eil.length) ch.push(lent([2000, 1700, 3638, 1300, 1000], [t.planCData, t.planCTerm, t.planCPirk, t.planCBus, t.planCLiko],
        s.eil.map(function (e) { return [e.tekstas, e.terminas, pirk(e), e.busena, e.liko]; })));
      else ch.push(par(t.planBeTerm));
    });
    ch.push(antr(t.planDem, P.demesys.length > 0));
    if (P.demesys.length) ch.push(lent([3800, 5838], [t.planCPirk, t.planCKa],
      P.demesys.map(function (x) { return [pirk(x), x.ka.map(function (y) { return par([run(y, { size: 18 })]); })]; })));
    else ch.push(par(t.planDem0));
    if (P.kiti.length) {
      ch.push(antr(t.planKiti, true));
      ch.push(lent([4300, 3300, 2038], [t.planCPirk, t.planCArt, t.planCBus], P.kiti.map(function (x) { return [pirk(x), x.artimiausias, x.busena]; })));
    }
    ch.push(par([run(fmt(t.planParengta, { d: P.parengta }), { size: 16, color: PILKA })], { spacing: { before: 280 } }));
    var doc = new D.Document({ creator: "G-Procure", title: t.planTitle + " " + P.nuo + " - " + P.iki,
      externalStyles: ST.xml({ font: "Arial", size: 20, oficialus: true }),
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: PARASTE, right: PARASTE, bottom: PARASTE, left: PARASTE, header: 567, footer: 567 } } },
        footers: { default: new D.Footer({ children: [par([run("G-Procure · " + t.planTitle + " · " + P.nuo + " - " + P.iki, { size: 16, color: PILKA })])] }) },
        children: ch
      }] });
    return D.Packer.toBlob(doc);
  }
  var PIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l-1 6 4 4v2h-5v5l-1 2-1-2v-5H6v-2l4-4z"/></svg>';

  var STILIUS_ID = "gpmp-stilius";
  function stilius() {
    if (document.getElementById(STILIUS_ID)) return;
    var css = [
      ".gpmp{display:grid;gap:10px;font-family:var(--font-base,inherit);color:var(--color-graphite,#2E3641)}",
      ".gpmp-eil{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) minmax(0,1.4fr) auto;gap:10px 18px;align-items:center;",
      "background:var(--color-white,#fff);border:1px solid var(--color-graphite-15,#E1E2E4);border-left:4px solid var(--color-emerald,#00A072);border-radius:12px;padding:14px 18px}",
      ".gpmp-pav{font-size:16px;font-weight:700;color:var(--color-graphite,#2E3641);text-decoration:none;overflow-wrap:anywhere}",
      ".gpmp-pav:hover{text-decoration:underline}",
      ".gpmp-mazas{display:block;font-size:13px;color:#5B6470;margin-top:2px;overflow-wrap:anywhere}",
      ".gpmp-et{display:block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5B6470}",
      ".gpmp-data{display:block;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}",
      ".gpmp-liko{display:block;font-size:13px;color:#5B6470;white-space:nowrap}",
      ".gpmp-liko--greit{color:#8A4B00;font-weight:700}",
      ".gpmp-busena{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;background:var(--color-green-5,#EFF9F1);border:1px solid var(--color-green-15,#D7EEDB);margin-bottom:4px}",
      ".gpmp-zingsnis{font-size:14px}",
      ".gpmp-veiksmai{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}",
      ".gpmp-btn{font-size:13px;font-weight:700;text-decoration:none;border-radius:999px;padding:6px 12px;border:1px solid var(--color-graphite-30,#C7CDD3);",
      "color:var(--color-graphite,#2E3641);background:var(--color-white,#fff);white-space:nowrap}",
      ".gpmp-btn:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpmp-btn--pagr{background:var(--color-emerald-strong,#007554);border-color:var(--color-emerald-strong,#007554);color:#fff}",
      ".gpmp-btn--pagr:hover{background:var(--color-emerald-strong-hover,#006649)}",
      ".gpmp a:focus-visible,.gpmp button:focus-visible{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpmp-apacia{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:14px;color:#5B6470}",
      ".gpmp-apacia button{font:inherit;font-weight:700;background:none;border:0;padding:0;color:var(--color-emerald-strong,#007554);text-decoration:underline;cursor:pointer}",
      ".gpmp-cvpis{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-bottom:10px}",
      ".gpmp-cvpis[hidden]{display:none}",
      ".gpmp-cvpis .gpmp-mazas{margin-top:0;flex:1 1 16em;min-width:0}",
      ".gpmp-cvp-busena{flex-basis:100%}",
      "button.gpmp-btn{font:inherit;font-size:13px;font-weight:700;cursor:pointer}",
      "button.gpmp-btn:disabled{cursor:default;color:#5B6470}",
      ".gpmp-cvp{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;",
      "border-top:1px solid var(--color-graphite-15,#E1E2E4);padding-top:10px;font-size:14px}",
      ".gpmp-cvp ul{margin:0;padding-left:18px;flex:1 1 16em;min-width:0}",
      ".gpmp-cvp li{overflow-wrap:anywhere}",
      ".gpmp-cvp--skiriasi{border-top:2px solid var(--color-warning,#FAB03B)}",
      ".gpmp-cvp--ok{color:#5B6470;font-size:13px}",
      ".gpmp-cvp-abej{flex-basis:100%;margin:0;font-size:13px;color:#8A5A00;overflow-wrap:anywhere}",
      ".gpmp-pov{grid-column:1 / -1;border-top:2px solid var(--color-warning,#FAB03B);padding-top:10px;font-size:14px;overflow-wrap:anywhere}",
      ".gpmp-pov a{color:var(--color-emerald-strong,#007554);font-weight:700}",
      ".gpmp-teise{grid-column:1 / -1;border-top:2px solid var(--color-blue,#0091A6);padding-top:10px;font-size:14px;overflow-wrap:anywhere}",
      ".gpmp-teise a{color:var(--color-emerald-strong,#007554);font-weight:700}",
      ".gpmp-isp{background:var(--color-warning-5,#FEF6E8);border:1px solid #F3D9A8;border-left:4px solid var(--color-warning,#FAB03B);border-radius:12px;padding:12px 16px;font-size:14px}",
      ".gpmp-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
      ".gpmp-eil,.gpmp-blokas,.gpmp-grupe{scroll-margin-top:96px}.gpmp-eil:target,.gpmp-eil.gpmp-tikslas{box-shadow:0 0 0 2px var(--color-emerald-strong,#007554)}",
      /* Santrauka portale (2026-11-25): vienodo aukščio, iki 3 artimiausių terminų plytelėmis */
      ".gpmp-sant{margin:0;font-size:14px;color:#5B6470}",
      ".gpmp-plyt-sar{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:10px}",
      ".gpmp-plyt-sar>li{min-width:0;display:flex}",
      ".gpmp-plyt{flex:1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 14px;align-items:start;text-decoration:none;color:var(--color-graphite,#2E3641);",
      "background:var(--color-white,#fff);border:1px solid var(--color-graphite-15,#E1E2E4);border-radius:12px;padding:12px 14px;transition:border-color .15s,box-shadow .15s}",
      ".gpmp-plyt:hover{border-color:var(--color-emerald,#00A072);box-shadow:0 2px 10px rgba(46,54,65,.08)}",
      ".gpmp-plyt>.gpmp-kal{grid-row:1 / span 3}",
      ".gpmp-kal{width:54px;flex:none;border-radius:10px;overflow:hidden;border:1px solid var(--color-graphite-15,#E1E2E4);background:#fff;text-align:center;display:inline-flex;flex-direction:column;line-height:1.15}",
      ".gpmp-kal__m{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--color-emerald-strong,#007554);padding:3px 2px}",
      ".gpmp-kal__d{font-size:24px;font-weight:700;padding:4px 0 6px;color:var(--color-graphite,#2E3641);font-variant-numeric:tabular-nums}",
      ".gpmp-kal--greit .gpmp-kal__m{background:#8A5A00}.gpmp-kal--praejo .gpmp-kal__m{background:var(--color-graphite,#2E3641)}",
      ".gpmp-kal--be .gpmp-kal__m{background:var(--color-graphite-15,#E1E2E4);color:var(--color-graphite,#2E3641)}.gpmp-kal--be{border-style:dashed}",
      ".gpmp-plyt-pav{font-size:16px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}",
      ".gpmp-plyt-trm{font-size:13px;color:#5B6470}.gpmp-plyt-trm b{color:#8A5A00}.gpmp-plyt-trm b,.gpmp-plyt-trm .gpmp-liko-t{white-space:nowrap}",
      ".gpmp-sant a{color:var(--color-emerald-strong,#007554);font-weight:700}",
      ".gpmp-plyt-zym{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;margin-top:4px}.gpmp-plyt-zym .gpmp-busena{margin:0}",
      ".gpmp-dem{font-size:12px;font-weight:700;color:#8A5A00;display:inline-flex;gap:4px;align-items:center}",
      ".gpmp-dem::before{content:\"\";width:8px;height:8px;border-radius:50%;background:#8A5A00}",
      ".gpmp-plyt--daugiau{grid-template-columns:minmax(0,1fr);align-content:center;background:var(--color-graphite-5,#F4F5F6);border-style:dashed}",
      ".gpmp-plyt--daugiau .gpmp-plyt-pav{color:var(--color-emerald-strong,#007554)}",
      /* Darbo stalas (2026-11-25) */
      ".gpmp-rodikliai{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:10px}",
      ".gpmp-rod{display:grid;gap:2px;align-content:start;text-align:left;font:inherit;cursor:pointer;background:var(--color-white,#fff);color:var(--color-graphite,#2E3641);",
      "border:1px solid var(--color-graphite-15,#E1E2E4);border-radius:12px;padding:14px 16px;text-decoration:none}",
      ".gpmp-rod:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpmp-rod b{font-size:32px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}",
      ".gpmp-rod span{font-size:13px;color:#5B6470}.gpmp-rod--isp b{color:#8A5A00}",
      ".gpmp-rod[aria-pressed=true]{border-color:var(--color-emerald-strong,#007554);box-shadow:inset 0 0 0 1px var(--color-emerald-strong,#007554);background:var(--color-green-5,#EFF9F1)}",
      ".gpmp-blokas{background:var(--color-white,#fff);border:1px solid var(--color-graphite-15,#E1E2E4);border-radius:12px;padding:16px 18px;display:grid;gap:12px;min-width:0}",
      ".gpmp-blokas h2{font-size:18px;margin:0}.gpmp-blokas-galva{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between}",
      ".gpmp-segm{display:inline-flex;border:1px solid var(--color-graphite-30,#C7CDD3);border-radius:999px;overflow:hidden}",
      ".gpmp-segm button{font:inherit;font-size:13px;font-weight:700;border:0;background:var(--color-white,#fff);color:var(--color-graphite,#2E3641);padding:6px 12px;cursor:pointer}",
      ".gpmp-segm button[aria-pressed=true]{background:var(--color-graphite,#2E3641);color:#fff}",
      ".gpmp-valdikliai{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}",
      ".gpmp-valdikliai input{font:inherit;font-size:14px;padding:6px 10px;border:1px solid var(--color-graphite-30,#C7CDD3);border-radius:8px;min-width:0;width:16em;max-width:100%}",
      ".gpmp-grupe{font-size:16px;margin:8px 0 0;display:flex;gap:8px;align-items:baseline}.gpmp-grupe span{font-size:13px;font-weight:400;color:#5B6470}",
      ".gpmp-tl{list-style:none;margin:0;padding:0;display:grid;gap:4px}",
      ".gpmp-tl-eil{display:grid;grid-template-columns:minmax(110px,220px) minmax(0,1fr);gap:12px;align-items:center;min-height:28px}",
      ".gpmp-tl-pav{font-size:13px;font-weight:700;color:var(--color-graphite,#2E3641);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}",
      ".gpmp-tl-pav:hover{text-decoration:underline}",
      ".gpmp-tl-trasa{position:relative;height:26px;border-radius:6px;background:var(--color-graphite-5,#F4F5F6);overflow:hidden}",
      ".gpmp-tl-galva .gpmp-tl-trasa{background:none;overflow:visible;height:18px}",
      ".gpmp-tl-sav{position:absolute;top:0;bottom:0;width:1px;background:var(--color-graphite-15,#E1E2E4)}",
      ".gpmp-tl-zl{position:absolute;top:0;font-size:12px;color:#5B6470;padding-left:4px;white-space:nowrap;font-variant-numeric:tabular-nums}",
      ".gpmp-tl-zl--siand{color:var(--color-emerald-strong,#007554);font-weight:700}",
      ".gpmp-tl-siand{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--color-emerald-strong,#007554)}",
      ".gpmp-tl-et{position:absolute;top:10px;height:6px;border-radius:3px;background:var(--color-emerald-strong,#007554)}.gpmp-tl-et--pasirengimas{background:#737483}",
      ".gpmp-tl-tk{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;box-sizing:border-box;border:2px solid #fff;background:var(--color-graphite,#2E3641)}",
      ".gpmp-tl-tk--pasiulymuTerminas{transform:rotate(45deg);border-radius:2px}.gpmp-tl-tk--greit{background:#8A5A00}",
      ".gpmp-tl-tk--paskelbimas{border-radius:50%;background:var(--color-emerald-strong,#007554)}",
      ".gpmp-tl-tk--pradzia{border-radius:50%;background:#fff;border-color:#5B6470}.gpmp-tl-tk--sutartiesData{border-radius:2px;background:#5B6470}",
      ".gpmp-tl-trasa--tekstas{height:auto;min-height:26px;display:flex;align-items:center}",
      ".gpmp-tl-tekstas{position:relative;z-index:1;font-size:12px;line-height:1.3;color:#5B6470;padding:3px 8px;background:var(--color-graphite-5,#F4F5F6);border-radius:6px;max-width:100%;overflow-wrap:anywhere}",
      ".gpmp-tl-tekstas--d{margin-left:auto;text-align:right}",
      ".gpmp-tl-leg{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0;padding:0;list-style:none;font-size:13px;color:#5B6470}",
      ".gpmp-tl-leg li{display:inline-flex;gap:6px;align-items:center}.gpmp-tl-leg .gpmp-tl-tk{position:static;margin:0;border-color:transparent}",
      ".gpmp-tl-leg .gpmp-tl-tk--pradzia{border-color:#5B6470}.gpmp-tl-leg .gpmp-tl-et{position:static;display:inline-block;width:18px}",
      ".gpmp-tl-leg .gpmp-tl-siand{position:static;display:inline-block;height:14px;margin:0}",
      /* Paslėpti blokai (2026-11-25): display grid ar flex nusveria atributą hidden - be šios taisyklės tuščiame stale matėsi nuliai */
      ".gpmp-rodikliai[hidden],.gpmp-blokas[hidden],.gpmp-eksp[hidden],.gpmp-tl-leg[hidden],.gpmp-valdikliai[hidden]{display:none}",
      /* Atsisiuntimai, prisegimas, krūvis (2026-11-25) */
      ".gpmp-eksp{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center}.gpmp-eksp>span{font-size:13px;color:#5B6470}",
      ".gpmp-eksp .gpmp-btn{display:inline-flex;gap:6px;align-items:center}.gpmp-eksp svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
      ".gpmp-eksp-busena{flex-basis:100%}.gpmp-eksp-busena[hidden]{display:none}",
      ".gpmp-pav-eil{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}",
      ".gpmp-pin{flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;padding:0;cursor:pointer;",
      "border:1px solid var(--color-graphite-15,#E1E2E4);background:var(--color-white,#fff);color:#5B6470}",
      ".gpmp-pin svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}.gpmp-pin:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpmp-pin[aria-pressed=true]{background:var(--color-emerald-strong,#007554);border-color:var(--color-emerald-strong,#007554);color:#fff}.gpmp-pin[aria-pressed=true] svg{fill:currentColor}",
      ".gpmp-prisegta{display:inline-flex;gap:4px;align-items:center;font-size:12px;font-weight:700;color:var(--color-emerald-strong,#007554)}",
      ".gpmp-prisegta svg{width:12px;height:12px;fill:currentColor}.gpmp-plyt--prisegta{border-color:var(--color-emerald,#00A072)}",
      ".gpmp-tl-kvp{font-size:13px;font-weight:700;color:#5B6470;min-width:0}",
      ".gpmp-tl-kvt{background:none;overflow:visible;height:24px}",
      ".gpmp-tl-kv{position:absolute;top:0;bottom:0;box-sizing:border-box;border:2px solid var(--color-white,#fff);border-radius:8px;display:flex;align-items:center;justify-content:center;",
      "font-size:12px;font-weight:700;color:#5B6470;font-variant-numeric:tabular-nums}",
      ".gpmp-tl-kv--yra{background:var(--color-green-5,#EFF9F1);color:var(--color-green-strong,#2B6E37)}",
      ".gpmp-tl-kv--daug{background:var(--color-warning-5,#FEF6E8);color:#8A5A00;box-shadow:inset 0 0 0 1px #E8C07A}",
      ".gpmp-tl-leg .gpmp-tl-kv{position:static;display:inline-flex;width:24px;height:20px;border:0}",
      /* Su „Visi pirkimai“ - visada viena eilutė: plačiame ekrane 3 plytelės ir „Visi“, vidutiniame - 2 ir „Visi“, telefone - stulpeliu 2 ir „Visi“ */
      ".gpmp-plyt-sar--daug{grid-template-columns:repeat(4,minmax(0,1fr))}",
      "@media (max-width:1023px){.gpmp-plyt-sar--daug{grid-template-columns:repeat(3,minmax(0,1fr))}.gpmp-plyt-sar--daug>li:nth-child(3){display:none}}",
      "@media (max-width:640px){.gpmp-plyt-sar--daug{grid-template-columns:minmax(0,1fr)}.gpmp-plyt{padding:10px 12px}}",
      "@media (max-width:640px){.gpmp-rodikliai{grid-template-columns:repeat(2,minmax(0,1fr))}.gpmp-rod{padding:10px 12px}.gpmp-rod b{font-size:24px}.gpmp-blokas{padding:14px}}",
      "@media (max-width:640px){.gpmp-tl-eil{grid-template-columns:minmax(80px,110px) minmax(0,1fr);gap:8px}.gpmp-tl-zl--n{display:none}}",
      "@media (max-width:900px){.gpmp-eil{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.gpmp-veiksmai{grid-column:1 / -1;justify-content:flex-start}}",
      "@media (max-width:560px){.gpmp-eil{grid-template-columns:minmax(0,1fr)}}"
    ].join("");
    var el = document.createElement("style");
    el.id = STILIUS_ID; el.textContent = css;
    document.head.appendChild(el);
  }

  function el(zyme, klase, tekstas) {
    var e = document.createElement(zyme);
    if (klase) e.className = klase;
    if (tekstas != null) e.textContent = tekstas;
    return e;
  }

  function mount(o) {
    o = o || {};
    var vieta = typeof o.target === "string" ? document.querySelector(o.target) : o.target;
    var sekcija = typeof o.sekcija === "string" ? document.querySelector(o.sekcija) : o.sekcija;
    if (!vieta || !global.GP_KORTELE) return null;
    stilius();
    var saknis = o.saknis == null ? "" : String(o.saknis);
    var visi = false;
    /* Vaizdas (2026-11-25): „santrauka“ - portale, „stalas“ - darbo stalas, kitaip - sąrašas (kaip iki tol) */
    var rezimas = o.rezimas === "santrauka" || o.rezimas === "stalas" ? o.rezimas : "";
    var stalasAdr = saknis + (o.stalas || "mano-pirkimai.html");
    var F = { rodyti: "visi", grupe: "terminas", q: "" }, pirmas = true, S = null, PR = [], paskutines = [], BIB = null;
    /* CVP IS patikra (2026-10-18): juosta su mygtuku ir būsena - pastovios (GP_BUSENA būsena neperrašoma perpiešiant),
       eilutės perpiešiamos; skirtumai skaičiuojami piešiant pagal dabartinę kortelę, todėl ją atnaujinus kitame skirtuke
       (storage įvykis) pastaba dingsta pati. */
    var cvp = { busena: "nepatikrinta", rez: {}, tekstas: "", riba: 0 }, cvpNumeriai = [], jd = null;
    /* Teisės pokyčių poveikis (2026-11-15, krypties 3.3; shared/teises-poveikis.js): PP-teise registrai įkeliami vieną kartą, tik kai yra
       aktyvių kortelių; nepavykęs įkėlimas sakomas, niekada „pokyčių nėra“. o.teisesKeliai - testams (kiti registrų adresai). */
    var teise = { busena: "", registrai: [], nepavyko: [] };
    function kraukTeise() {
      var S = global.GP_STEBESENA;
      if (teise.busena || !S || !global.GP_TEISES_POVEIKIS) return;
      teise.busena = "kraunama";
      var keliai = o.teisesKeliai || [saknis + "PP-teise/duomenys/registras.json", saknis + "PP-teise/duomenys/registras-es.json"];
      Promise.all(keliai.map(function (u) {
        return (o.teisesKeliai ? S.ikelk(u) : S.ikelkKarta(u)).then(null, function (e) { return { ok: false, klaida: String((e && e.message) || e) }; });
      })).then(function (rs) {
        teise.registrai = rs.filter(function (r) { return r && r.ok; }).map(function (r) { return r.tikrinta; });
        teise.nepavyko = rs.map(function (r, i) { return r && r.ok ? -1 : i; }).filter(function (i) { return i >= 0; });
        teise.busena = teise.registrai.length ? "yra" : "klaida";
        piesk();
      });
    }
    vieta.innerHTML = "";
    var juosta = el("div", "gpmp gpmp-cvpis");
    juosta.hidden = true;
    var cvpBtn = el("button", "gpmp-btn");
    cvpBtn.type = "button";
    var cvpPag = el("span", "gpmp-mazas");
    cvpPag.id = "gpmp-cvp-pag-" + (++SKAITIKLIS);
    cvpBtn.setAttribute("aria-describedby", cvpPag.id);
    var cvpBusena = el("div", "gpmp-cvp-busena");
    cvpBusena.hidden = true;
    juosta.appendChild(cvpBtn); juosta.appendChild(cvpPag); juosta.appendChild(cvpBusena);
    var box = el("div", "gpmp");
    if (rezimas === "stalas") {
      S = stalasKurk();
      var apv = el("div", "gpmp"); apv.style.gap = "16px";
      apv.appendChild(S.rod); apv.appendChild(S.eksp); apv.appendChild(S.tl); apv.appendChild(S.sar);
      S.sarTurinys.appendChild(juosta); S.sarTurinys.appendChild(box);
      vieta.appendChild(apv);
    } else { vieta.appendChild(juosta); vieta.appendChild(box); }
    cvpBtn.addEventListener("click", function () { tikrinkCvp(); });

    function piesk() {
      var l = kalba(o), t = T[l], K = global.GP_KORTELE;
      var dabar = o.dabar ? new Date(o.dabar) : new Date();
      var s = K.skaityk();
      // Pirkimo sąlygų juodraščiai - kartą piešimui (pakeitimų poveikis, 2026-11-14; be shared/korteles-poveikis.js - nerodoma)
      jd = global.GP_POVEIKIS ? global.GP_POVEIKIS.juodrasciai({ saugykla: K.saugykla ? K.saugykla() : undefined }) : null;
      box.innerHTML = "";
      juosta.hidden = true;
      if (S) stalasTekstai(t);
      if (s.busena === "sugadinta" || s.busena === "neprieinama") {
        box.appendChild(el("div", "gpmp-isp", global.GP_SAUGYKLA ? global.GP_SAUGYKLA.pranesimas(s.r, t.kortelesPav) : ""));
        if (sekcija) sekcija.hidden = false;
        if (S) { S.rod.hidden = S.tl.hidden = S.eksp.hidden = S.v.hidden = true; }
        return;
      }
      var neArch = s.korteles.filter(function (k) { return !k.archyvuota; });
      if (!neArch.length) {
        if (sekcija) sekcija.hidden = true;
        if (S) {
          S.rod.hidden = S.tl.hidden = S.eksp.hidden = S.v.hidden = true;
          var tu = el("div", "gpmp-apacia");
          tu.appendChild(el("span", null, t.stalasTuscias));
          var nk = el("a", "gpmp-btn gpmp-btn--pagr", t.pirmaKortele); nk.href = saknis + "pirkimu-korteles.html#nauja";
          tu.appendChild(nk); box.appendChild(tu);
        }
        return;
      }
      if (sekcija) sekcija.hidden = false;
      var aktyvios = neArch.filter(function (k) { return !BAIGTOS[k.busena]; }).map(function (k) { return { k: k, t: terminas(k, dabar) }; });
      var kitos = s.korteles.length - aktyvios.length;
      aktyvios.sort(function (a, b) {
        var ab = a.t && !a.t.praejo, bb = b.t && !b.t.praejo;
        if (ab && bb) return a.t.data - b.t.data;
        if (ab !== bb) return ab ? -1 : 1;
        return a.k.atnaujinta < b.k.atnaujinta ? 1 : a.k.atnaujinta > b.k.atnaujinta ? -1 : 0;
      });
      aktyvios.forEach(function (x) { x.dem = demesys(x); });
      paskutines = aktyvios;
      PR = prisegti(K.saugykla ? K.saugykla() : undefined);
      if (rezimas === "santrauka") { pieskSantrauka(aktyvios, kitos, t, l); return; }
      cvpNumeriai = [];
      aktyvios.forEach(function (x) { var n = cvpNr(x.k); if (n && cvpNumeriai.indexOf(n) < 0) cvpNumeriai.push(n); });
      if (global.GP_VPT && global.GP_BUSENA && cvpNumeriai.length) {
        juosta.hidden = false;
        cvpBtn.textContent = t.cvpTikrinti;
        cvpBtn.disabled = cvp.busena === "eiga";
        cvpPag.textContent = fmt(t.cvpPag, { n: Math.min(cvpNumeriai.length, MAX_CVP) });
        if (cvp.busena === "baigta") suvestine(t, l, aktyvios);
      }
      if (S) { if (aktyvios.length) kraukTeise(); pieskStala(aktyvios, kitos, t, l, dabar); return; }
      if (!aktyvios.length) box.appendChild(el("p", "gpmp-apacia", t.aktyviuNera));
      else kraukTeise();
      var max = o.max || 5;
      aktyvios.slice(0, visi ? aktyvios.length : max).forEach(function (x) { box.appendChild(eilute(x.k, x.t, t, l)); });
      var ap = el("div", "gpmp-apacia");
      if (aktyvios.length > max && !visi) {
        var b = el("button", null, t.daugiau + " (" + aktyvios.length + ")");
        b.type = "button";
        b.addEventListener("click", function () { visi = true; piesk(); });
        ap.appendChild(b);
      }
      if (kitos > 0) {
        ap.appendChild(el("span", null, t.baigti + kitos + " ·"));
        var a = el("a", null, t.visosKorteles);
        a.href = saknis + "pirkimu-korteles.html";
        a.style.color = "var(--color-emerald-strong,#007554)"; a.style.fontWeight = "700";
        ap.appendChild(a);
      }
      if (ap.childNodes.length) box.appendChild(ap);
      if (aktyvios.length && teise.busena === "klaida") box.appendChild(el("div", "gpmp-isp", t.teiseNepavyko));
      else if (aktyvios.length && teise.busena === "yra" && teise.nepavyko.length) box.appendChild(el("p", "gpmp-apacia", teise.nepavyko[0] === 1 ? t.teiseBeEs : t.teiseBeLt));
    }

    function eilute(k, trm, t, l) {
      var K = global.GP_KORTELE, id = encodeURIComponent(k.id);
      var r = el("article", "gpmp-eil");
      r.setAttribute("aria-label", k.pavadinimas || "?");
      var rid = rezimas === "stalas" ? eilId(k) : "";
      if (rid) r.id = rid;
      // 1. Pavadinimas, numeriai, santrauka
      var a = el("div");
      var pav = el("a", "gpmp-pav", k.pavadinimas || "?");
      pav.href = saknis + "pirkimu-korteles.html#kortele=" + id;
      if (rid) {
        var pe = el("div", "gpmp-pav-eil"), on = PR.indexOf(k.id) >= 0, pb = el("button", "gpmp-pin");
        pb.type = "button"; pb.innerHTML = PIN_SVG;
        pb.setAttribute("aria-pressed", on ? "true" : "false");
        pb.setAttribute("aria-label", t.pinOn + ": " + (k.pavadinimas || "?"));
        pb.title = on ? t.pinOff : t.pinOn;
        pb.setAttribute("data-gpmp-pin", k.id);
        pb.addEventListener("click", function () { perjunkPin(k.id); });
        pe.appendChild(pav); pe.appendChild(pb); a.appendChild(pe);
      } else a.appendChild(pav);
      var nr = [k.numeris, k.cvpisNr ? t.CVP + k.cvpisNr : ""].filter(Boolean).join(" · ");
      if (nr) a.appendChild(el("span", "gpmp-mazas", nr));
      var sant = K.santrauka(k, l);
      if (sant) a.appendChild(el("span", "gpmp-mazas", sant));
      r.appendChild(a);
      // 2. Artimiausias terminas
      var b = el("div");
      if (trm) {
        b.appendChild(el("span", "gpmp-et", t[trm.laukas]));
        b.appendChild(el("span", "gpmp-data", trm.tekstas));
        var liko = likoTekstas(trm, t);
        b.appendChild(el("span", "gpmp-liko" + (!trm.praejo && trm.dd <= 5 ? " gpmp-liko--greit" : ""), liko));
      } else b.appendChild(el("span", "gpmp-mazas", t.beTerminu));
      r.appendChild(b);
      // 3. Būsena ir kitas žingsnis (tik iš kortelės duomenų)
      var c = el("div");
      c.appendChild(el("span", "gpmp-busena", K.busenosPav(k.busena, l) || k.busena));
      var truksta = trukstaLauku(k);
      /* Kitas žingsnis sako tik tai, ką siūlo mygtukai (2026-11-06: iki tol „kvalifikacija, sąlygos, TS“ ir tada, kai jų nebuvo);
         paskelbtam pirkimui su praėjusiu terminu - priminimas pakeisti būseną (kortelė nežino, kas padaryta). */
      var dok = k.busena === "rengiamas" ? irankiai(k).filter(function (r) { return r === "ts" || r === "kvalifikacija" || r === "salygos"; }) : [];
      var praejo = k.busena === "paskelbtas" && trm && trm.laukas === "pasiulymuTerminas" && trm.praejo;
      var zingsnis = truksta.length ? t.trukstaPrad + truksta.map(function (f) { return TRUKSTA[l][f]; }).join(", ") + "."
        : praejo ? t.zingsnis + t.paskelbtasPraejo + "."
        : (t[k.busena] ? t.zingsnis + (k.busena === "vertinamas" && mazosVertes(k) ? t.vertinamasMV : t[k.busena])
           + (dok.length ? " (" + dok.map(function (r) { return t[r].toLowerCase() === "ts" ? "TS" : t[r].toLowerCase(); }).join(", ") + ")" : "") + "." : "");
      if (zingsnis) c.appendChild(el("div", "gpmp-zingsnis", zingsnis));
      r.appendChild(c);
      // 4. Įrankiai su pasirinktu pirkimu - pagal būseną; pirmas pagrindinis (jei kortelėje netrūksta duomenų)
      var d = el("div", "gpmp-veiksmai");
      irankiai(k).forEach(function (raktas, i) {
        var btn = el("a", "gpmp-btn" + (!truksta.length && i === 0 ? " gpmp-btn--pagr" : ""), t[raktas]);
        btn.href = saknis + IRANKIAI[raktas].kelias + "?kortele=" + id + (IRANKIAI[raktas].zyme || "");
        btn.target = "_blank"; btn.rel = "noopener";
        btn.setAttribute("aria-label", t[raktas] + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
        // Naudojimosi statistika (tik su sutikimu): kuris įrankis ir kokiame etape - be kortelės duomenų
        btn.addEventListener("click", function () {
          var A = global.GP_ANALITIKA, m = /^(PP-[A-Za-z-]+)\//.exec(IRANKIAI[raktas].kelias);
          if (A) A.ivykis("mano_pirkimai_paspausta", { irankis: m ? m[1] : "kita",
            etapas: { planuojamas: "planuojama", rengiamas: "rengiama", paskelbtas: "paskelbta", vertinamas: "vertinama" }[k.busena] || "kita" });
        });
        d.appendChild(btn);
      });
      var kort = el("a", "gpmp-btn" + (truksta.length ? " gpmp-btn--pagr" : ""), t.kortele);
      kort.href = saknis + "pirkimu-korteles.html#kortele=" + id;
      kort.setAttribute("aria-label", t.kortele + ": " + (k.pavadinimas || "?"));
      d.appendChild(kort);
      r.appendChild(d);
      // 5. Pakeitimų poveikis (2026-11-14, krypties 1.2): įrankių rezultatai, sudaryti pagal ankstesnius kortelės duomenis
      var pv = global.GP_POVEIKIS ? global.GP_POVEIKIS.poveikis(k, { juodrasciai: jd, kalba: l }).rezultatai : [];
      if (pv.length) r.appendChild(poveikioPastaba(k, pv, t, l, id));
      // 6. Teisės pokyčiai šiam pirkimui (2026-11-15, krypties 3.3): įsigalios ir pasikeitė nuo pirkimo pradžios (projektai - kortelėje ir teisės stebėsenoje)
      if (teise.busena === "yra") {
        var dab = o.dabar ? new Date(o.dabar) : new Date(), tp = global.GP_TEISES_POVEIKIS.kortelei(k, { registrai: teise.registrai, dabar: global.GP_STEBESENA.dienaISO(dab), kalba: l });
        if (tp.busimi.length || tp.pirkimoMetu.length) r.appendChild(teisesPastaba(k, tp, t, l, id, global.GP_STEBESENA.dienaISO(dab)));
      }
      // 7. CVP IS patikros rezultatas (tik po „Patikrinti CVP IS duomenis“)
      var cr = cvp.busena === "baigta" && cvpNr(k) ? cvp.rez[cvpNr(k)] : null;
      if (cr) r.appendChild(cvpPastaba(k, cr, t, l, id));
      return r;
    }

    /* „Reikia dėmesio“ - tik iš kortelės ir jau turimų duomenų (kodai - tekstų raktai) */
    function demesys(x) {
      var k = x.k, r = [];
      if (trukstaLauku(k).length) r.push("demTruksta");
      if (k.busena === "paskelbtas" && x.t && x.t.laukas === "pasiulymuTerminas" && x.t.praejo) r.push("demPraejo");
      if (global.GP_POVEIKIS && global.GP_POVEIKIS.poveikis(k, { juodrasciai: jd, kalba: "lt" }).rezultatai.length) r.push("demPoveikis");
      var cr = cvp.busena === "baigta" && cvpNr(k) ? cvp.rez[cvpNr(k)] : null;
      if (cr && cr.ok && global.GP_VPT && global.GP_VPT.skirtumai(k, cr.pirkimas).skirtumai.length) r.push("demCvp");
      return r;
    }
    function kalendorius(trm, t) {
      var s = el("span", "gpmp-kal" + (!trm ? " gpmp-kal--be" : trm.praejo ? " gpmp-kal--praejo" : trm.dd <= 5 ? " gpmp-kal--greit" : ""));
      s.setAttribute("aria-hidden", "true");
      s.appendChild(el("span", "gpmp-kal__m", trm ? t.menesiai[trm.data.getMonth()] : t.beDatos));
      s.appendChild(el("span", "gpmp-kal__d", trm ? String(trm.data.getDate()) : "-"));
      return s;
    }
    /* Santrauka portale: skaičiai ir iki 3 artimiausių terminų plytelėmis; aukštis nuo pirkimų skaičiaus nepriklauso */
    function pieskSantrauka(aktyvios, kitos, t, l) {
      if (!aktyvios.length) { box.appendChild(el("p", "gpmp-sant", t.aktyviuNera + (kitos ? " " + t.baigti + kitos + "." : ""))); return; }
      var g = aktyvios.filter(greit).length, d = aktyvios.filter(function (x) { return x.dem.length; }).length;
      var p = el("p", "gpmp-sant");
      p.appendChild(document.createTextNode(aktyvios.length + " " + forma(t.sAktyvus, aktyvios.length, l)));
      [[g, t.sGreit, "greit"], [d, t.sDem, "dem"]].forEach(function (a) {
        if (!a[0]) return;
        p.appendChild(document.createTextNode(" · "));
        var n = el("a", null, fmt(a[1], { n: a[0] }));
        n.href = stalasAdr + "#rodyti=" + a[2];
        p.appendChild(n);
      });
      box.appendChild(p);
      var ul = el("ul", "gpmp-plyt-sar"), MAXP = 3;
      /* Prisegti (2026-11-25) - pirmi (tarpusavyje - pagal terminą), likusios vietos - artimiausi terminai */
      var pr = aktyvios.filter(function (x) { return PR.indexOf(x.k.id) >= 0; });
      pr.concat(aktyvios.filter(function (x) { return PR.indexOf(x.k.id) < 0; })).slice(0, MAXP)
        .forEach(function (x) { var li = el("li"); li.appendChild(plytele(x, t, l)); ul.appendChild(li); });
      /* Daugiau nei 3 - plytelė „Visi pirkimai (N)“; telefone tada rodomos 2 artimiausios (skaičius teisingas abiem pločiais) */
      if (aktyvios.length > MAXP) {
        var li = el("li"), a = el("a", "gpmp-plyt gpmp-plyt--daugiau");
        a.href = stalasAdr;
        a.appendChild(el("span", "gpmp-plyt-pav", fmt(t.sVisi, { n: aktyvios.length })));
        a.appendChild(el("span", "gpmp-plyt-trm", t.sVisiSub));
        li.appendChild(a); ul.appendChild(li);
        ul.className += " gpmp-plyt-sar--daug";
      }
      box.appendChild(ul);
    }
    function plytele(x, t, l) {
      var k = x.k, pris = PR.indexOf(k.id) >= 0, a = el("a", "gpmp-plyt" + (pris ? " gpmp-plyt--prisegta" : ""));
      a.href = stalasAdr + "#kortele=" + encodeURIComponent(k.id);
      a.appendChild(kalendorius(x.t, t));
      a.appendChild(el("span", "gpmp-plyt-pav", k.pavadinimas || "?"));
      var trm = el("span", "gpmp-plyt-trm");
      if (x.t) {
        trm.appendChild(document.createTextNode(t[x.t.laukas] + " "));
        trm.appendChild(el("span", "gpmp-sr", x.t.tekstas + " "));
        trm.appendChild(document.createTextNode("· "));
        trm.appendChild(el(greit(x) ? "b" : "span", greit(x) ? null : "gpmp-liko-t", likoTekstas(x.t, t)));
      } else trm.textContent = t.beTerminu;
      a.appendChild(trm);
      var z = el("span", "gpmp-plyt-zym"), bus = global.GP_KORTELE.busenosPav(k.busena, l);
      if (pris) { var pz = el("span", "gpmp-prisegta"); pz.innerHTML = PIN_SVG; pz.appendChild(document.createTextNode(t.pinZyma)); z.appendChild(pz); }
      if (bus) z.appendChild(el("span", "gpmp-busena", bus));
      if (x.dem.length) z.appendChild(el("span", "gpmp-dem", t[x.dem[0]]));
      if (z.childNodes.length) a.appendChild(z);
      return a;
    }

    /* Darbo stalas: pastovūs elementai (filtrai, paieška ir grupavimas neperpiešiami - fokusas lieka) */
    function stalasKurk() {
      var X = { rb: {}, gb: {} }, n = ++SKAITIKLIS;
      X.rod = el("div", "gpmp-rodikliai"); X.rod.setAttribute("role", "group");
      ["visi", "greit", "dem"].forEach(function (r) {
        var b = el("button", "gpmp-rod"); b.type = "button";
        b.appendChild(el("b", null, "0")); b.appendChild(el("span"));
        b.addEventListener("click", function () { F.rodyti = F.rodyti === r ? "visi" : r; piesk(); });
        X.rb[r] = b; X.rod.appendChild(b);
      });
      X.baigti = el("a", "gpmp-rod"); X.baigti.href = saknis + "pirkimu-korteles.html";
      X.baigti.appendChild(el("b", null, "0")); X.baigti.appendChild(el("span")); X.rod.appendChild(X.baigti);
      /* Atsisiuntimai (2026-11-25): kalendoriaus failas ir savaitės planas - iš visų aktyvių pirkimų, failai sudaromi naršyklėje */
      X.eksp = el("div", "gpmp-eksp"); X.ekspH = el("span"); X.eksp.appendChild(X.ekspH);
      X.icsB = el("button", "gpmp-btn"); X.icsB.type = "button";
      X.icsB.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
      X.icsB.appendChild(el("span")); X.icsB.addEventListener("click", function () { icsAtsisiusk(); });
      X.planB = el("button", "gpmp-btn"); X.planB.type = "button";
      X.planB.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/></svg>';
      X.planB.appendChild(el("span")); X.planB.addEventListener("click", function () { planAtsisiusk(); });
      X.ekspBus = el("div", "gpmp-eksp-busena"); X.ekspBus.hidden = true;
      X.eksp.appendChild(X.icsB); X.eksp.appendChild(X.planB); X.eksp.appendChild(X.ekspBus);
      X.tl = el("section", "gpmp-blokas");
      X.tlH = el("h2"); X.tlH.id = "gpmp-tl-h-" + n; X.tl.setAttribute("aria-labelledby", X.tlH.id);
      var g = el("div", "gpmp-blokas-galva"); g.appendChild(X.tlH);
      X.tlLaikas = el("span", "gpmp-plyt-trm"); g.appendChild(X.tlLaikas); X.tl.appendChild(g);
      X.tlBox = el("div"); X.tl.appendChild(X.tlBox);
      X.tlLeg = el("ul", "gpmp-tl-leg"); X.tl.appendChild(X.tlLeg);
      X.sar = el("section", "gpmp-blokas");
      X.sarH = el("h2"); X.sarH.id = "gpmp-sar-h-" + n; X.sar.setAttribute("aria-labelledby", X.sarH.id);
      var g2 = el("div", "gpmp-blokas-galva"); g2.appendChild(X.sarH);
      var v = el("div", "gpmp-valdikliai");
      X.grLbl = el("span", "gpmp-plyt-trm"); X.grLbl.id = "gpmp-gr-" + n;
      X.segm = el("div", "gpmp-segm"); X.segm.setAttribute("role", "group"); X.segm.setAttribute("aria-labelledby", X.grLbl.id);
      ["terminas", "etapas"].forEach(function (r) {
        var b = el("button"); b.type = "button";
        b.addEventListener("click", function () { F.grupe = r; piesk(); });
        X.gb[r] = b; X.segm.appendChild(b);
      });
      X.q = el("input"); X.q.type = "search"; X.q.id = "gpmp-q-" + n; X.q.setAttribute("autocomplete", "off");
      X.qLbl = el("label", "gpmp-sr"); X.qLbl.htmlFor = X.q.id;
      X.q.addEventListener("input", function () { F.q = X.q.value; piesk(); });
      v.appendChild(X.grLbl); v.appendChild(X.segm); v.appendChild(X.qLbl); v.appendChild(X.q);
      X.v = v; g2.appendChild(v); X.sar.appendChild(g2);
      X.sarTurinys = el("div", "gpmp"); X.sar.appendChild(X.sarTurinys);
      return X;
    }
    function stalasTekstai(t) {
      S.rod.setAttribute("aria-label", t.rodytiAria);
      S.rb.visi.lastChild.textContent = t.rAktyvus; S.rb.greit.lastChild.textContent = t.rGreit; S.rb.dem.lastChild.textContent = t.rDem;
      S.baigti.lastChild.textContent = t.rBaigti;
      S.tlH.textContent = t.tlH; S.sarH.textContent = t.sarH; S.grLbl.textContent = t.grupuoti + ":";
      S.gb.terminas.textContent = t.pagalTermina; S.gb.etapas.textContent = t.pagalEtapa;
      S.qLbl.textContent = t.ieskoti; S.q.placeholder = t.ieskotiPh;
      S.ekspH.textContent = t.eksportH + ":"; S.icsB.lastChild.textContent = t.icsMyg; S.planB.lastChild.textContent = t.planMyg;
      S.rod.hidden = S.tl.hidden = S.sar.hidden = S.eksp.hidden = S.v.hidden = false;
    }
    function pieskStala(aktyvios, kitos, t, l, dabar) {
      var sk = { visi: aktyvios.length, greit: aktyvios.filter(greit).length, dem: aktyvios.filter(function (x) { return x.dem.length; }).length };
      Object.keys(S.rb).forEach(function (r) {
        var b = S.rb[r];
        b.firstChild.textContent = String(sk[r]);
        b.setAttribute("aria-pressed", F.rodyti === r ? "true" : "false");
        b.classList.toggle("gpmp-rod--isp", r !== "visi" && sk[r] > 0);
      });
      S.baigti.firstChild.textContent = String(kitos);
      Object.keys(S.gb).forEach(function (r) { S.gb[r].setAttribute("aria-pressed", F.grupe === r ? "true" : "false"); });
      var q = normQ(F.q);
      var rodomos = aktyvios.filter(function (x) {
        if (F.rodyti === "greit" && !greit(x)) return false;
        if (F.rodyti === "dem" && !x.dem.length) return false;
        return !q || normQ([x.k.pavadinimas, x.k.numeris, x.k.cvpisNr].join(" ")).indexOf(q) >= 0;
      });
      pieskJuosta(rodomos, t, l, dabar);
      if (!aktyvios.length) box.appendChild(el("p", "gpmp-apacia", t.aktyviuNera));
      else if (!rodomos.length) box.appendChild(el("p", "gpmp-apacia", t.nerasta));
      if (rodomos.length < aktyvios.length) {
        var p = el("p", "gpmp-apacia"), b = el("button", null, t.rodytiVisus);
        p.appendChild(el("span", null, fmt(t.rodoma, { n: rodomos.length, m: aktyvios.length })));
        b.type = "button";
        b.addEventListener("click", function () { F.rodyti = "visi"; F.q = ""; S.q.value = ""; piesk(); S.rb.visi.focus(); });
        p.appendChild(b); box.appendChild(p);
      }
      grupes(rodomos, t, l).forEach(function (gr) {
        var h = el("h3", "gpmp-grupe", gr.pav);
        h.appendChild(el("span", null, "(" + gr.sar.length + ")"));
        box.appendChild(h);
        gr.sar.forEach(function (x) { box.appendChild(eilute(x.k, x.t, t, l)); });
      });
      if (aktyvios.length && teise.busena === "klaida") box.appendChild(el("div", "gpmp-isp", t.teiseNepavyko));
      else if (aktyvios.length && teise.busena === "yra" && teise.nepavyko.length) box.appendChild(el("p", "gpmp-apacia", teise.nepavyko[0] === 1 ? t.teiseBeEs : t.teiseBeLt));
      if (pirmas) { pirmas = false; tikslas(); }
    }
    function grupes(sar, t, l) {
      var G;
      if (F.grupe === "etapas") {
        G = ["planuojamas", "rengiamas", "paskelbtas", "vertinamas", ""].map(function (b) { return { id: b, pav: b ? global.GP_KORTELE.busenosPav(b, l) : t.gBeBusenos, sar: [] }; });
        sar.forEach(function (x) { (G.filter(function (y) { return y.id === (x.k.busena || ""); })[0] || G[4]).sar.push(x); });
      } else {
        G = [["greit", t.gGreit], ["praejo", t.gPraejo], ["menuo", t.gMenuo], ["veliau", t.gVeliau], ["be", t.gBe]].map(function (a) { return { id: a[0], pav: a[1], sar: [] }; });
        sar.forEach(function (x) {
          var id = !x.t ? "be" : x.t.praejo ? "praejo" : x.t.dd <= 5 ? "greit" : x.t.dd <= 20 ? "menuo" : "veliau";
          G.filter(function (y) { return y.id === id; })[0].sar.push(x);
        });
      }
      return G.filter(function (gr) { return gr.sar.length; });
    }
    /* 8 savaičių terminų laiko juosta (savaitė atgal ir 7 į priekį): taškai - kortelės datos, juostos - pirkimo grafiko etapai.
       Grafinė dalis paslėpta ekrano skaitytuvui - tas pats tekstu kiekvienoje eilutėje. */
    function pieskJuosta(sar, t, l, dabar) {
      var B = S.tlBox, DIENA = 864e5;
      B.innerHTML = "";
      var W = langas(dabar), s0 = W.s0, s1 = W.s1, siand = W.siand, puse = 100 / 112;
      var poz = function (d) { return Math.max(0, Math.min(100, (d - s0) / (s1 - s0) * 100)); };
      S.tlLaikas.textContent = fmt(t.tlLaikas, { nuo: isoData(s0), iki: isoData(new Date(s1.getFullYear(), s1.getMonth(), s1.getDate() - 1)) });
      if (!sar.length) { S.tl.hidden = true; return; }
      if (!sar.some(function (x) { return taskai(x.k).length || etapai(x.k).length; })) {
        B.appendChild(el("p", "gpmp-apacia", t.tlNera)); S.tlLeg.hidden = true; return;
      }
      S.tlLeg.hidden = false; legenda(t);
      var pirm = [];
      for (var d = new Date(s0); d < s1; d.setDate(d.getDate() + 1)) if (d.getDay() === 1) pirm.push(new Date(d));
      var ol = el("ol", "gpmp-tl"), gv = el("li", "gpmp-tl-eil gpmp-tl-galva"), gt = el("div", "gpmp-tl-trasa");
      gv.setAttribute("aria-hidden", "true"); gv.appendChild(el("span"));
      pirm.forEach(function (d, i) { var z = el("span", "gpmp-tl-zl" + (i % 2 ? " gpmp-tl-zl--n" : ""), du(d.getMonth() + 1) + "-" + du(d.getDate())); z.style.left = poz(d) + "%"; gt.appendChild(z); });
      gv.appendChild(gt); ol.appendChild(gv);
      /* Krūvis (2026-11-25): kiek kortelių datų tenka kiekvienai savaitei; KRUVIS_DAUG ir daugiau - pažymima */
      var sav = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return { nuo: new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + 7 * i), n: 0 }; });
      sar.forEach(function (x) { taskai(x.k).forEach(function (p) {
        if (p.data >= s0 && p.data < s1) sav[Math.floor(Math.round((p.data - s0) / DIENA) / 7)].n++;
      }); });
      var kv = el("li", "gpmp-tl-eil gpmp-tl-kruvis"), kvt = el("div", "gpmp-tl-trasa gpmp-tl-kvt");
      kv.appendChild(el("span", "gpmp-tl-kvp", t.kruvis));
      kv.appendChild(el("span", "gpmp-sr", sav.map(function (s) { return fmt(t.kruvisSav, { d: du(s.nuo.getMonth() + 1) + "-" + du(s.nuo.getDate()), n: s.n }); }).join("; ")));
      kvt.setAttribute("aria-hidden", "true");
      sav.forEach(function (s, i) {
        var c = el("span", "gpmp-tl-kv" + (s.n >= KRUVIS_DAUG ? " gpmp-tl-kv--daug" : s.n ? " gpmp-tl-kv--yra" : ""), s.n ? String(s.n) : "");
        c.style.left = (i * 12.5) + "%"; c.style.width = "12.5%";
        kvt.appendChild(c);
      });
      kv.appendChild(kvt); ol.appendChild(kv);
      sar.forEach(function (x) {
        var k = x.k, li = el("li", "gpmp-tl-eil"), a = el("a", "gpmp-tl-pav", k.pavadinimas || "?"), aid = eilId(k);
        a.title = k.pavadinimas || "";
        a.href = aid ? "#" + aid : saknis + "pirkimu-korteles.html#kortele=" + encodeURIComponent(k.id);
        li.appendChild(a);
        var tr = el("div", "gpmp-tl-trasa"), sr = [], visiT = taskai(k), visiE = etapai(k);
        tr.setAttribute("aria-hidden", "true");
        pirm.forEach(function (d) { var v = el("span", "gpmp-tl-sav"); v.style.left = poz(d) + "%"; tr.appendChild(v); });
        var langeE = visiE.filter(function (e) { return e.iki >= s0 && e.nuo < s1; });
        langeE.forEach(function (e) {
          var b = el("span", "gpmp-tl-et" + (e.stadija === "pasirengimas" ? " gpmp-tl-et--pasirengimas" : "")), a0 = poz(e.nuo), a1 = poz(new Date(e.iki.getTime() + DIENA));
          b.style.left = a0 + "%"; b.style.width = Math.max(0.6, a1 - a0) + "%";
          b.title = e.pavadinimas + ": " + e.nuoT + " - " + e.ikiT;
          tr.appendChild(b);
        });
        if (langeE.length) sr.push(t.tlEtapai + " " + langeE[0].nuoT + " - " + langeE[langeE.length - 1].ikiT);
        var lange = 0, po = null, pries = null;
        visiT.forEach(function (p) {
          if (p.data < s0) { if (!pries || p.data > pries.data) pries = p; return; }
          if (p.data >= s1) { if (!po || p.data < po.data) po = p; return; }
          lange++;
          var gr = p.laukas === "pasiulymuTerminas" && p.data >= siand && darboDienos(siand, p.data) <= 5;
          var tk = el("span", "gpmp-tl-tk gpmp-tl-tk--" + p.laukas + (gr ? " gpmp-tl-tk--greit" : ""));
          tk.style.left = (poz(p.data) + puse) + "%";
          tk.title = t[p.laukas] + ": " + p.tekstas;
          tr.appendChild(tk);
          sr.push(t[p.laukas] + " " + p.tekstas);
        });
        if (!lange && !langeE.length) {
          var tx = el("span", "gpmp-tl-tekstas", !visiT.length && !visiE.length ? t.beTerminu
            : po ? fmt(t.tlKitas, { d: po.tekstas }) : pries ? fmt(t.tlAnks, { d: pries.tekstas }) : t.tlTuscia);
          // Tekstas - sraute, ne absoliučiai: siaurame ekrane lūžta, o ne nukerpamas (2026-11-25, telefono patikra)
          if (po) tx.className += " gpmp-tl-tekstas--d";
          tr.className += " gpmp-tl-trasa--tekstas";
          tr.appendChild(tx); sr.push(tx.textContent);
        }
        if (siand >= s0 && siand < s1) { var sl = el("span", "gpmp-tl-siand"); sl.style.left = (poz(siand) + puse) + "%"; tr.appendChild(sl); }
        li.appendChild(el("span", "gpmp-sr", sr.join("; ")));
        li.appendChild(tr);
        ol.appendChild(li);
      });
      B.appendChild(ol);
    }
    function legenda(t) {
      var U = S.tlLeg;
      U.innerHTML = "";
      [["gpmp-tl-tk gpmp-tl-tk--pasiulymuTerminas", t.pasiulymuTerminas], ["gpmp-tl-tk gpmp-tl-tk--paskelbimas", t.paskelbimas],
        ["gpmp-tl-tk gpmp-tl-tk--pradzia", t.pradzia], ["gpmp-tl-tk gpmp-tl-tk--sutartiesData", t.sutartiesData],
        ["gpmp-tl-et", t.tlEtapai], ["gpmp-tl-siand", t.tlSiand], ["gpmp-tl-kv gpmp-tl-kv--daug", fmt(t.kruvisDaug, { n: KRUVIS_DAUG }), String(KRUVIS_DAUG)]].forEach(function (a) {
        var li = el("li"), z = el("span", a[0], a[2] || null);
        z.setAttribute("aria-hidden", "true");
        li.appendChild(z); li.appendChild(document.createTextNode(a[1]));
        U.appendChild(li);
      });
    }
    function dabarD() { return o.dabar ? new Date(o.dabar) : new Date(); }
    function failoVardas(dok, pl) {
      return global.GP_EKSPORTAS ? global.GP_EKSPORTAS.failoVardas({ dokumentas: dok, data: isoData(dabarD()), pletinys: pl }) : dok + "_" + isoData(dabarD()) + "." + pl;
    }
    function atsisiusk(blob, vardas) {
      var u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = vardas; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }
    function icsAtsisiusk() {
      var l = kalba(o), t = T[l], r = icsTekstas(paskutines, { kalba: l, dabar: dabarD() }), B = global.GP_BUSENA;
      if (!r.kiek) { if (B) B.rodyk(S.ekspBus, { tipas: "tuscia", tekstas: t.icsNera }); return r; }
      var vardas = failoVardas(t.icsFailas, "ics");
      atsisiusk(new Blob([r.tekstas], { type: "text/calendar;charset=utf-8" }), vardas);
      if (B) B.rodyk(S.ekspBus, { tipas: "gerai", tekstas: fmt(t.icsOk, { f: vardas, n: r.kiek + " " + forma(t.icsTerm, r.kiek, l) }) });
      return r;
    }
    function biblioteka() {
      if (global.docx && global.GP_DOCX_STILIAI) return Promise.resolve();
      var t = T[kalba(o)], krauk = function (src) {
        return new Promise(function (ok, ne) {
          var s = document.createElement("script"); s.src = src;
          s.onload = function () { ok(); }; s.onerror = function () { ne(new Error(fmt(t.planBib, { f: src.split("/").pop() }))); };
          document.head.appendChild(s);
        });
      };
      if (!BIB) BIB = Promise.all([global.docx ? 0 : krauk(saknis + "shared/vendor/docx-8.5.0/index.umd.js"), global.GP_DOCX_STILIAI ? 0 : krauk(saknis + "shared/docx-stiliai.js")])
        .then(function () { BIB = null; }, function (e) { BIB = null; throw e; });
      return BIB;
    }
    function planAtsisiusk() {
      var l = kalba(o), t = T[l], B = global.GP_BUSENA, P = planoDuomenys(paskutines, { kalba: l, dabar: dabarD() }), vardas = failoVardas(t.planFailas, "docx");
      if (!B) return Promise.resolve(null);
      return B.vykdyk(S.ekspBus, { tipas: "eiga", tekstas: t.planEiga, klaidosPriesdelis: t.planKlaida, kartoti: function () { planAtsisiusk(); },
        veiksmas: function () { return biblioteka().then(function () { return planoDocx(P); }); },
        sekme: function () { return fmt(t.planOk, { f: vardas }); } }).then(function (r) { if (r && r.ok) atsisiusk(r.reiksme, vardas); return r; });
    }
    function perjunkPin(id) {
      var K = global.GP_KORTELE, SG = global.GP_SAUGYKLA, st = K.saugykla ? K.saugykla() : undefined, t = T[kalba(o)];
      if (!SG) return;
      var ids = paskutines.map(function (x) { return x.k.id; }), sar = prisegti(st).filter(function (x) { return ids.indexOf(x) >= 0; }), i = sar.indexOf(id);
      if (i >= 0) sar.splice(i, 1); else sar.push(id);
      var r = SG.rasyk(PRISEGTI, { schema: 1, id: sar }, { saugykla: st });
      piesk();
      var b = [].filter.call(vieta.querySelectorAll("[data-gpmp-pin]"), function (x) { return x.getAttribute("data-gpmp-pin") === id; })[0];
      if (b) b.focus();
      if (!r.ok && global.GP_BUSENA) global.GP_BUSENA.rodyk(S.ekspBus, { tipas: "klaida", tekstas: t.pinKlaida + " (" + r.klaida + ")" });
    }
    /* #kortele=<id> (iš portalo plytelės): eilutė - į matomą vietą, pažymima, fokusas - į jos pavadinimą */
    function tikslas() {
      var h = (global.location && global.location.hash) || "", f = /^#rodyti=(greit|dem)$/.exec(h);
      if (f && S) { if (F.rodyti !== f[1]) { F.rodyti = f[1]; piesk(); } return; }
      var m = /^#kortele=(.+)$/.exec(h);
      if (!m) return;
      var id = "";
      try { id = decodeURIComponent(m[1]); } catch (e) { return; }
      var e = document.getElementById(eilId({ id: id }));
      if (!e) return;
      e.classList.add("gpmp-tikslas");
      if (e.scrollIntoView) e.scrollIntoView({ block: "center" });
      var a = e.querySelector(".gpmp-pav");
      if (a) a.focus({ preventScroll: true });
      setTimeout(function () { e.classList.remove("gpmp-tikslas"); }, 2500);
    }

    function poveikioPastaba(k, pv, t, l, id) {
      var K = global.GP_KORTELE, p = el("div", "gpmp-pov");
      p.appendChild(el("span", null, t.povPrad));
      pv.forEach(function (x, i) {
        if (i) p.appendChild(document.createTextNode(", "));
        var laukai = [];
        x.pakeitimai.concat(x.neatitikimai).forEach(function (y) { var n = K.mazaja(K.laukoPav(y.l, l)); if (laukai.indexOf(n) < 0) laukai.push(n); });
        var a = el("a", null, K.mazaja(x.pavadinimas) + (x.juodrastis && x.juodrastis.pavadinimas ? " „" + x.juodrastis.pavadinimas + "“" : ""));
        a.href = saknis + x.nuoroda; a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", a.textContent + " - " + x.irankioPav + " (" + t.naujasSkirtukas + ")");
        p.appendChild(a);
        if (laukai.length) p.appendChild(document.createTextNode(" (" + laukai.join(", ") + ")"));
      });
      p.appendChild(document.createTextNode(" · "));
      var kk = el("a", null, t.povKortele);
      kk.href = saknis + "pirkimu-korteles.html?poveikis=1#kortele=" + id;
      kk.setAttribute("aria-label", t.povKortele + ": " + (k.pavadinimas || "?"));
      p.appendChild(kk);
      return p;
    }

    function teisesPastaba(k, tp, t, l, id, dabar) {
      var S = global.GP_STEBESENA, P = global.GP_TEISES_POVEIKIS, p = el("div", "gpmp-teise");
      p.appendChild(el("span", null, t.teisePrad));
      if (tp.busimi.length) {
        var x = tp.busimi[0], a = el("a", null, S.trumpasPavadinimas(x.irasas));
        a.href = saknis + "PP-teise/index.html#irasas=" + encodeURIComponent(x.irasas.id); a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", a.textContent + " (" + t.naujasSkirtukas + ")");
        p.appendChild(a);
        p.appendChild(document.createTextNode(" - " + P.laikoTekstas(x, dabar, l) + (tp.busimi.length > 1 ? fmt(t.teiseDar, { n: tp.busimi.length - 1 }) : "")));
      }
      if (tp.pirkimoMetu.length) p.appendChild(document.createTextNode((tp.busimi.length ? "; " : "") + fmt(t.teisePirkimoMetu, { n: tp.pirkimoMetu.length })));
      p.appendChild(document.createTextNode(" · "));
      var pr = el("a", null, t.teisePerziureti);
      pr.href = saknis + "PP-teise/index.html?kortele=" + id; pr.target = "_blank"; pr.rel = "noopener";
      pr.setAttribute("aria-label", t.teisePerziureti + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
      p.appendChild(pr);
      return p;
    }

    function rodomas(v) { return String(v || "").replace("T", " "); }
    function cvpPastaba(k, cr, t, l, id) {
      var K = global.GP_KORTELE, V = global.GP_VPT, p = el("div", "gpmp-cvp");
      if (cr.ok) {
        var s = V.skirtumai(k, cr.pirkimas);
        /* Abejotina CVP IS trukmė („36_years“, 2026-11-12) - ne skirtumas: pasakoma, kodėl nelyginta */
        var abej = (s.abejotini || []).map(function (x) { return el("p", "gpmp-cvp-abej", (V.trukmesAbejone ? V.trukmesAbejone(x.cd, l) : "") + t.cvpAbejotina); });
        /* Tolesnio etapo terminas (2026-11-20, trečias pilotas) - nelygintas: pasakoma kodėl, ne „sutampa“ */
        (s.nelyginta || []).filter(function (x) { return x.priezastis === "tolesnisEtapas"; }).forEach(function (x) {
          abej.push(el("p", "gpmp-cvp-abej", fmt(t.cvpTolesnis, { d: rodomas(x.vpt), e: x.etapas })));
        });
        if (!s.skirtumai.length) {
          p.className += " gpmp-cvp--ok";
          p.appendChild(el("span", null, s.palyginta.length
            ? fmt(t.cvpSutampa, { l: s.palyginta.map(function (f) { return t[CVP_PAV[f]]; }).join(", ") }) : t.cvpNeraDuomenu));
          abej.forEach(function (x) { p.appendChild(x); });
          return p;
        }
        p.className += " gpmp-cvp--skiriasi";
        var ul = el("ul");
        s.skirtumai.forEach(function (x) {
          var b = x.laukas === "busena";
          var vk = b && !x.vpt && V.kodas ? V.kodas(x.kodas, V.BUSENOS, l) : null;
          var tr = x.laukas === "trukmeMen";
          var v = b ? (K.busenosPav(x.vpt, l) || (vk && vk.tekstas) || x.vpt) + " (VPT: " + x.kodas + ")"
            : tr ? x.vpt + " " + t.men : rodomas(x.vpt) + (x.laukas === "paskelbimas" && x.tarptautinis ? t.cvpIssiuntimas : "");
          var kv = b ? (K.busenosPav(x.kortele, l) || x.kortele) : tr ? x.kortele + " " + t.men : rodomas(x.kortele);
          ul.appendChild(el("li", null, fmt(t[CVP_ET[x.laukas]], { v: v }) + (x.kortele ? fmt(t.cvpKortelejeYra, { k: kv }) : t.cvpKortelejeNera) + (tr ? t.cvpTrukmePst : "")));
        });
        p.appendChild(ul);
        abej.forEach(function (x) { p.appendChild(x); });
        var vv = el("div", "gpmp-veiksmai");
        var a = el("a", "gpmp-btn gpmp-btn--pagr", t.cvpAtnaujinti);
        a.href = saknis + "pirkimu-korteles.html?vpt=1#kortele=" + id;
        a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", t.cvpAtnaujinti + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
        vv.appendChild(a);
        if (cr.nuoroda) {
          var c = el("a", "gpmp-btn", t.cvpAtverti);
          c.href = cr.nuoroda; c.target = "_blank"; c.rel = "noopener";
          c.setAttribute("aria-label", t.cvpAtverti + ": " + (k.pavadinimas || "?") + " (" + t.naujasSkirtukas + ")");
          vv.appendChild(c);
        }
        p.appendChild(vv);
      } else if (cr.rusis === "nera") p.appendChild(el("span", null, fmt(t.cvpNera, { nr: cvpNr(k) }) + (global.GP_VPT && GP_VPT.beSkelbimo ? " " + GP_VPT.beSkelbimo(kalba()) : "")));
      else p.appendChild(el("span", null, t.cvpKlaida));
      return p;
    }

    /* Suvestinė pagal dabartines korteles; ta pati - neperpiešiama (gyva sritis nekartoja to paties). */
    function suvestine(t, l, aktyvios) {
      var c = { n: 0, p: 0, s: 0, nera: 0, k: 0 }, laikas = null;
      Object.keys(cvp.rez).forEach(function (nr) {
        var r = cvp.rez[nr], kk = aktyvios.filter(function (x) { return cvpNr(x.k) === nr; });
        if (!kk.length) return;
        c.n++;
        if (r.ok || r.rusis === "nera") laikas = laikas || (r.meta && r.meta.atnaujinta) || null;
        if (r.ok) {
          if (kk.some(function (x) { return global.GP_VPT.skirtumai(x.k, r.pirkimas).skirtumai.length; })) c.p++; else c.s++;
        } else if (r.rusis === "nera") c.nera++;
        else c.k++;
      });
      if (!c.n) { cvp.tekstas = ""; global.GP_BUSENA.slepk(cvpBusena); return; }
      var tx = fmt(t.cvpSuvestine, { n: c.n, t: global.GP_VPT.atnaujinta(laikas, l), p: c.p, s: c.s })
        + (c.nera ? fmt(t.cvpNeraS, { m: c.nera }) : "") + (c.k ? fmt(t.cvpKlaidaS, { k: c.k }) : "") + "."
        + (cvp.riba ? fmt(t.cvpRiba, { r: cvp.riba }) : "");
      if (tx === cvp.tekstas) return;
      cvp.tekstas = tx;
      global.GP_BUSENA.rodyk(cvpBusena, { tipas: "gerai", tekstas: tx, kartoti: c.k ? function () { tikrinkCvp(); } : null });
    }

    function tikrinkCvp() {
      var V = global.GP_VPT, B = global.GP_BUSENA;
      if (!V || !B || cvp.busena === "eiga" || !cvpNumeriai.length) return Promise.resolve();
      var t = T[kalba(o)], tikr = cvpNumeriai.slice(0, MAX_CVP);
      cvp = { busena: "eiga", rez: {}, tekstas: "", riba: cvpNumeriai.length > MAX_CVP ? MAX_CVP : 0 };
      piesk();
      return B.vykdyk(cvpBusena, {
        tipas: "eiga", tekstas: fmt(t.cvpEiga, { n: tikr.length }), klaidosPriesdelis: t.cvpNepavyko,
        kartoti: function () { tikrinkCvp(); },
        veiksmas: function () {
          return eile(tikr, LYGIAGRECIAI, function (nr) { return V.pirkimas(nr); }).then(function (rs) {
            // Ryšys ar neįkeltas sąrašas visiems - klaida su „Bandyti dar kartą“, ne „sutampa“
            if (!rs.some(function (r) { return r && (r.ok || r.rusis === "nera"); })) throw new Error(t.cvpRysys);
            return rs;
          });
        }
      }).then(function (rez) {
        if (!rez.ok) { cvp.busena = "klaida"; piesk(); return; }
        rez.reiksme.forEach(function (r, i) { cvp.rez[tikr[i]] = r || { ok: false, rusis: "rysys" }; });
        cvp.busena = "baigta";
        piesk();
      });
    }

    piesk();
    if (rezimas === "stalas") global.addEventListener("hashchange", tikslas);
    global.addEventListener("storage", function (e) { if (e.key === global.GP_KORTELE.RAKTAS || e.key === PRISEGTI) piesk(); });
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(piesk).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    return { atnaujink: piesk, tikrinkCvp: tikrinkCvp, ics: icsAtsisiusk, planas: planAtsisiusk, planoDuomenys: function () { return planoDuomenys(paskutines, { kalba: kalba(o), dabar: dabarD() }); } };
  }

  global.GP_MANO_PIRKIMAI = { mount: mount, terminas: terminas, darboDienos: darboDienos, forma: forma, etapai: etapai, langas: langas,
    icsTekstas: icsTekstas, icsLankstyk: icsLankstyk, planoDuomenys: planoDuomenys, planoDocx: planoDocx, PRISEGTI: PRISEGTI, KRUVIS_DAUG: KRUVIS_DAUG };
})(typeof window !== "undefined" ? window : this);
