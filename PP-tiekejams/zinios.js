/* ============================================================================
 * G-Procure Tiekėjams  zinios.js
 * ----------------------------------------------------------------------------
 * ŠALTINIŲ REGISTRAS (versijuojamas) ir BENDRŲJŲ KLAUSIMŲ žinių bazė
 * (window.GP_ZINIOS). Visi įrašai remiasi 2026-09-02 patikrintais viešais
 * šaltiniais (HTTP būsena, redakcija, puslapis) - žr. docs/tiekejams/
 * cvpis-feasibility.md. Straipsnių numeriai imti iš PĮ 2026-07-01 redakcijos
 * TEKSTO (e-seimas), ne iš atminties. PĮ redakcija galioja iki 2026-12-31 -
 * nuo 2027-01-01 numatyta nauja: registrą reikia pertikrinti (žr. "galiojaIki").
 *
 * Bendras atsakymas NIEKADA neteikiamas kaip konkretaus pirkimo taisyklė -
 * sąsaja prie kiekvieno prideda priminimą, kad pirkimo dokumentai gali nustatyti
 * papildomus ar kitokius reikalavimus.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var PATIKRINTA = "2026-09-02";

  var SALTINIAI = [
    { id: "S1", tipas: "instrukcija", kalba: "lt", patikrinta: PATIKRINTA, redakcija: "puslapis atnaujintas 2026-08-20",
      title: { lt: "VPT: instrukcijos tiekėjams (nauja CVP IS)", en: "PPO: guidance for suppliers (new CVP IS)" },
      url: "https://vpt.lrv.lt/lt/nauja-cvp-is-aktuali-nuo-2024-12-01/metodine-medziaga-instrukcijos/tiekejamsnaujaCVPIS/",
      pastaba: { lt: "PPTX/DOCX/PDF instrukcijos ir vaizdo įrašai: registracija, paieška, pasiūlymo pateikimas, BVPŽ prenumerata, susirašinėjimas.", en: "PPTX/DOCX/PDF guides and videos: registration, search, bid submission, CPV subscription, messaging." } },
    { id: "S2", tipas: "teises_aktas", kalba: "lt", patikrinta: PATIKRINTA, redakcija: "galiojanti suvestinė redakcija 2026-07-01 - 2026-12-31", galiojaIki: "2026-12-31",
      title: { lt: "PĮ - Pirkimų, atliekamų vandentvarkos, energetikos, transporto ar pašto paslaugų srities perkančiųjų subjektų, įstatymas (Nr. XIII-328)", en: "Utilities Procurement Law (PĮ, No. XIII-328)" },
      url: "https://e-seimas.lrs.lt/portal/legalAct/lt/TAD/f82d89d12fcb11e79f4996496b137f39/asr",
      pastaba: { lt: "Teisės norma. LITGRID taikomas būtent šis įstatymas, ne VPĮ.", en: "The statute. LITGRID is governed by this law, not the classic public procurement law." } },
    { id: "S3", tipas: "perkanciojo_taisykles", kalba: "lt", patikrinta: PATIKRINTA, redakcija: "MV aprašas patvirtintas 2024-12-19 įsak. Nr. 24IS-267",
      title: { lt: "LITGRID: pirkimų taisyklės ir informacija tiekėjams", en: "LITGRID: procurement rules and supplier information" },
      url: "https://www.litgrid.eu/index.php/apie-litgrid/litgrid-pirkimai/pirkimu-taisykles/837",
      pastaba: { lt: "Mažos vertės pirkimų aprašas + 3 priedai; gretimuose puslapiuose - metinis pirkimų planas (LT/EN), DPS sąrašas, įrangos atitikties ir saugaus darbo reikalavimai. EN versijos nėra.", en: "Low-value procurement rules + 3 annexes; adjacent pages: annual plan (LT/EN), DPS list, equipment conformity and safety requirements. No EN version." } },
    { id: "S4", tipas: "duk", kalba: "lt", patikrinta: PATIKRINTA, redakcija: "straipsniai datuoti 2021-2026",
      title: { lt: "VPT DUK portalas (klausk.vpt.lt)", en: "PPO FAQ portal (klausk.vpt.lt)" },
      url: "https://klausk.vpt.lt/hc/lt",
      pastaba: { lt: "EBVPD, konfidencialumas, subrangovai, CVP IS. DĖMESIO: dauguma atsakymų rašyti VPĮ straipsniais - čia pateikiami PĮ atitikmenys.", en: "ESPD, confidentiality, subcontractors, CVP IS. NOTE: most answers cite the classic law - PĮ equivalents are given here." } },
    { id: "S5", tipas: "instrukcija", kalba: "lt", patikrinta: PATIKRINTA, redakcija: "Economic Operators User Manual v2.0, 2024-11-14",
      title: { lt: "CVP IS pagalba ir naudotojo vadovas", en: "CVP IS help and user manual" },
      url: "https://viesiejipirkimai.lt/epps/viewInfo.do?isPopup=true&section=userManual",
      pastaba: { lt: "Tiekėjo vadovas anglų kalba; registracijos tvarkos aprašas LT.", en: "Supplier manual in English; registration procedure in LT." } },
    { id: "S6", tipas: "metodine", kalba: "lt", patikrinta: PATIKRINTA, redakcija: "Tiekėjo ABC v1.3 2025-01-09; Tiekėjo gidas 2025-05-16",
      title: { lt: "VPT metodinė pagalba tiekėjams (Tiekėjo ABC, gairės)", en: "PPO methodological help for suppliers (Supplier ABC, guidelines)" },
      url: "https://vpt.lrv.lt/lt/metodine-pagalba/tiekejams_2/",
      pastaba: { lt: "Tiekėjo ABC, konfidencialumo gairės (2024-05-31), neįprastai mažos kainos gairės, pretenzijos šablonas.", en: "Supplier ABC, confidentiality guidelines (2024-05-31), abnormally low price guidelines, claim template." } },
    { id: "S7", tipas: "instrukcija", kalba: "lt", patikrinta: PATIKRINTA, redakcija: "be datos; EBVPD forma nuo 2019-04-18",
      title: { lt: "EBVPD forma (ebvpd.eviesiejipirkimai.lt) ir VPT pildymo instrukcija", en: "ESPD form (ebvpd.eviesiejipirkimai.lt) and PPO filling guide" },
      url: "https://ebvpd.eviesiejipirkimai.lt/espd-web/",
      pastaba: { lt: "Naudoti LT adresą; sena VPT PDF instrukcija dar rodo EK adresą.", en: "Use the LT address; the older PPO PDF still shows the EC address." } },
    { id: "S8", tipas: "instrukcija", kalba: "en", patikrinta: PATIKRINTA, redakcija: "n/a",
      title: { lt: "TED (tarptautiniai skelbimai)", en: "TED (EU-level notices)" },
      url: "https://ted.europa.eu/en/",
      pastaba: { lt: "Tik tarptautinės vertės pirkimai; skelbimo XML turi tiesiogines CVP IS nuorodas.", en: "Only above-threshold procurements; the notice XML links directly to CVP IS." } }
  ];

  // Bendrasis priminimas prie kiekvieno bendro atsakymo
  var PRIMINIMAS = {
    lt: "Bendras atsakymas. Konkretaus pirkimo dokumentai gali nustatyti papildomus ar kitokius reikalavimus - visada tikrinkite aktualią redakciją CVP IS.",
    en: "General answer. The documents of a specific procurement may set additional or different requirements - always check the current version in CVP IS."
  };

  // TEMOS. Kiekviena turi: klausimas, atsakymas (faktai su [S# ...] nuorodomis),
  // veiksmai, saltiniai (id + citata/vieta), spraga (ko šaltiniuose nėra).
  var TEMOS = [
    { id: "rasti", zymos: ["cvpis", "paieska"],
      q: { lt: "Kaip rasti LITGRID pirkimus CVP IS?", en: "How do I find LITGRID procurements in CVP IS?" },
      a: { lt: "LITGRID AB pirkimai skelbiami Centrinėje viešųjų pirkimų informacinėje sistemoje (CVP IS, viesiejipirkimai.lt). Neprisijungus veikia „Išplėstinė paieška“ (pirkimo vykdytojo lauke įrašius LITGRID AB) ir „Naujausi pirkimai“; prisijungus - paieška organizacijose, skelbimuose ir pirkimų suvestinėje. LITGRID svetainėje skelbiamas metinis planuojamų pirkimų sąrašas (LT ir EN) ir dinaminių pirkimų sistemų (DPS) sąrašas su nuorodomis į CVP IS.",
           en: "LITGRID AB procurements are published in the Central Public Procurement Information System (CVP IS, viesiejipirkimai.lt). Without logging in you can use “Advanced search” (enter LITGRID AB as the contracting entity) and “Latest procurements”; when logged in - search by organisation, notices and the procurement summary. The LITGRID website publishes the annual planned procurement list (LT and EN) and the list of dynamic purchasing systems (DPS) with links to CVP IS." },
      veiksmai: { lt: ["Atidarykite LITGRID pirkimų sąrašą CVP IS (nuoroda žemiau) arba išplėstinę paiešką.", "Peržiūrėkite LITGRID metinį pirkimų planą - kada planuojamas jus dominantis pirkimas.", "Užsiprenumeruokite pranešimus pagal BVPŽ kodus (žr. atskirą temą)."],
                 en: ["Open the LITGRID procurement list in CVP IS (link below) or the advanced search.", "Review the LITGRID annual procurement plan for when a procurement of interest is planned.", "Subscribe to notifications by CPV codes (see separate topic)."] },
      saltiniai: [{ id: "S3", cit: { lt: "Litgrid pirkimai / Pirkimai: informacija skelbiama CVP IS; 2026 m. planuojamų vykdyti pirkimų sąrašas (LT/EN); DPS sąrašas", en: "Litgrid procurement pages: published in CVP IS; 2026 planned procurement list (LT/EN); DPS list" } },
                  { id: "S1", cit: { lt: "„Paieškos vykdymas per CVP IS (tiekėjai)“, 2026-05-20, 3-8 skaidrės", en: "“Searching via CVP IS (suppliers)”, 2026-05-20, slides 3-8" } }],
      spraga: { lt: "CVP IS sąrašo URL su LITGRID filtru veikia, bet turi sistemos generuojamą puslapiavimo parametrą - jei nuoroda nustotų veikti, naudokite išplėstinę paiešką.", en: "The CVP IS list URL with the LITGRID filter works but contains a system-generated paging parameter - if it stops working, use the advanced search." } },

    { id: "bvpz", zymos: ["cvpis", "prenumerata"],
      q: { lt: "Kaip užsiprenumeruoti pirkimus pagal BVPŽ kodus?", en: "How do I subscribe to procurements by CPV codes?" },
      a: { lt: "Nuo 2025-09-12 pranešimus el. paštu apie naujai paskelbtus skelbimus su pasirinktais BVPŽ kodais gauna visi tiekėjo naudotojai (anksčiau - tik administratoriai). Kelias CVP IS: Tiekėjo administravimas > Tiekėjo valdymas > Redaguoti BVPŽ kodus > paieška > pasirinkti kodą (arba raktinį žodį) > Pateikti > Baigti. Pranešimas gaunamas tada, kai pirkimo vykdytojas ir tiekėjas naudoja tą patį BVPŽ skyriaus kodą (pvz. 15000000).",
           en: "Since 2025-09-12 all users of a supplier receive e-mail notifications about newly published notices with the selected CPV codes (previously only administrators). Path in CVP IS: Supplier administration > Supplier management > Edit CPV codes > search > select a code (or keyword) > Submit > Finish. A notification is sent when the contracting entity and the supplier use the same CPV division code (e.g. 15000000)." },
      veiksmai: { lt: ["Pasirinkite ne tik tikslų kodą, bet ir BVPŽ skyrių (pirmi 2 skaitmenys + nuliai), kad nepraleistumėte pirkimų.", "Patikrinkite, ar pranešimai ateina visiems jūsų įmonės naudotojams."],
                 en: ["Select not only the exact code but also the CPV division (first 2 digits + zeros) so you do not miss procurements.", "Check that notifications reach all users of your company."] },
      saltiniai: [{ id: "S1", cit: { lt: "„Skelbiamų pirkimų prenumerata pagal pasirinktus BVPŽ kodus“, galioja nuo 2025-10-02, 2-8 skaidrės", en: "“Subscription to published procurements by selected CPV codes”, valid from 2025-10-02, slides 2-8" } }],
      spraga: { lt: "Neišaiškinta, ar prenumerata apima konkrečius DPS pirkimus ir rinkos konsultacijas.", en: "It is not clarified whether the subscription covers specific DPS procurements and market consultations." } },

    { id: "budai", zymos: ["procedura"],
      q: { lt: "Kaip veikia atviras konkursas ir skelbiamos derybos?", en: "How do the open procedure and the negotiated procedure with a call for competition work?" },
      a: { lt: "Atviras konkursas (PĮ 69 str.): pasiūlymą gali pateikti kiekvienas suinteresuotas tiekėjas, dalyvių skaičius neribojamas; etapai - skelbimas, pašalinimo pagrindų ir kvalifikacijos patikra, pasiūlymų vertinimas (69 str. 4 d. leidžia pirmiausia vertinti pasiūlymą, po to kvalifikaciją). Skelbiamos derybos (PĮ 73 str.): paraišką gali pateikti kiekvienas suinteresuotas tiekėjas, o pirminius pasiūlymus teikia tik perkančiojo subjekto pakviesti kandidatai; supaprastintame pirkime subjektas gali paraiškų neprašyti. Paraiškų terminas - ne trumpesnis kaip 30 dienų tarptautiniam ir 10 dienų supaprastintam pirkimui (74 str. 2 d.). Derybose visiems taikomi vienodi reikalavimai, laikomasi konfidencialumo, apie dokumentų pakeitimus informuojama raštu (75 str.).",
           en: "Open procedure (PĮ Art. 69): any interested supplier may submit a bid, the number of participants is not limited; stages - notice, exclusion-ground and qualification check, bid evaluation (Art. 69(4) allows evaluating the bid first, then qualification). Negotiated procedure with a call for competition (PĮ Art. 73): any interested supplier may submit an application, but initial bids are submitted only by candidates invited by the contracting entity; in a simplified procurement the entity may skip applications. The application deadline is at least 30 days for international and 10 days for simplified procurements (Art. 74(2)). In negotiations all are treated equally, confidentiality is kept and document changes are notified in writing (Art. 75)." },
      veiksmai: { lt: ["Skelbime ir sąlygose patikrinkite, kuris būdas taikomas ir ar bus paraiškų etapas.", "Derybų atveju suplanuokite laiką dviem pasiūlymų etapams (pirminis ir galutinis)."],
                 en: ["Check in the notice and the conditions which procedure applies and whether there is an application stage.", "For negotiations, plan time for two bid stages (initial and final)." ] },
      saltiniai: [{ id: "S2", cit: { lt: "PĮ 69 str. 2-4 d., 73 str. 2-3 d., 74 str. 2 d., 75 str. (redakcija 2026-07-01)", en: "PĮ Art. 69(2)-(4), 73(2)-(3), 74(2), 75 (version of 2026-07-01)" } }],
      spraga: { lt: "Konkretūs LITGRID derybų etapų žingsniai CVP IS aprašomi pirkimo dokumentuose, ne viešuose šaltiniuose.", en: "The specific steps of LITGRID negotiations in CVP IS are described in the procurement documents, not in public sources." } },

    { id: "paraiska", zymos: ["procedura"],
      q: { lt: "Kuo skiriasi paraiška, pirminis pasiūlymas ir galutinis pasiūlymas?", en: "What is the difference between an application, an initial bid and a final bid?" },
      a: { lt: "Paraiška - prašymas dalyvauti kelių etapų pirkime; ją gali teikti kiekvienas suinteresuotas tiekėjas, pagal ją tikrinami pašalinimo pagrindai ir kvalifikacija (PĮ 73 str. 2 d.). Pirminį pasiūlymą teikia tik pakviesti kandidatai - jis yra derybų pagrindas (73 str. 3 d.; 74 str. pavadinimas „Paraiškų ir pirminių pasiūlymų pateikimo ... terminai“). Galutinis pasiūlymas teikiamas pasibaigus deryboms, perkančiojo subjekto kvietimu (PĮ tekste galutiniai pasiūlymai minimi 78 str. 4 d. dialogo kontekste). Vieno etapo pirkime (atviras konkursas) yra tik pasiūlymas.",
           en: "An application is a request to participate in a multi-stage procurement; any interested supplier may submit it, and exclusion grounds and qualification are checked on its basis (PĮ Art. 73(2)). An initial bid is submitted only by invited candidates and is the basis for negotiations (Art. 73(3); Art. 74 title “Deadlines for applications and initial bids ...”). A final bid is submitted after negotiations at the contracting entity's invitation (the PĮ text mentions final bids in Art. 78(4) in the dialogue context). In a single-stage procurement (open procedure) there is only the bid." },
      veiksmai: { lt: ["Pirkimo sąlygose raskite, kokie dokumentai teikiami su paraiška, o kokie - tik su pirminiu ar galutiniu pasiūlymu (dažnai su paraiška teikiamas tik EBVPD).", "Nepainiokite terminų: paraiškos ir pasiūlymo terminai skiriasi."],
                 en: ["Find in the conditions which documents go with the application and which only with the initial or final bid (often only the ESPD goes with the application).", "Do not confuse deadlines: application and bid deadlines differ."] },
      saltiniai: [{ id: "S2", cit: { lt: "PĮ 73 str. 2-3 d., 74 str., 78 str. 4 d.", en: "PĮ Art. 73(2)-(3), 74, 78(4)" } }],
      spraga: { lt: "PĮ neturi trumpų šių trijų sąvokų apibrėžimų vienoje vietoje - tai sintezė iš kelių straipsnių; konkretaus pirkimo etapai - tik sąlygose.", en: "The PĮ has no short definitions of these three terms in one place - this is a synthesis of several articles; the stages of a specific procurement are only in its conditions." } },

    { id: "ebvpd", zymos: ["dokumentai"],
      q: { lt: "Kaip pildyti EBVPD?", en: "How do I fill in the ESPD?" },
      a: { lt: "EBVPD (Europos bendrasis viešųjų pirkimų dokumentas) - tiekėjo deklaracija, kad nėra pašalinimo pagrindų ir tenkinami kvalifikacijos reikalavimai; su pasiūlymu ji pakeičia institucijų išduodamus dokumentus; atliekant supaprastintus pirkimus, pažymų dėl pašalinimo pagrindų nebuvimo nereikalaujama, kai tiekėjas pateikia EBVPD (PĮ 37 str. 1 d.), o pašalinimo pagrindai ir kvalifikacija taikomi mutatis mutandis pagal VPĮ 46, 47, 50, 51 str. (PĮ 59 str. 1 d.). Forma pildoma adresu ebvpd.eviesiejipirkimai.lt/espd-web: pasirenkama „Esu ekonominės veiklos vykdytojas“, „Importuoti EBVPD“, įkeliamas perkančiojo subjekto pateiktas XML (espd-request.xml iš pirkimo dokumentų), pasirenkama šalis ir užpildomos dalys. EBVPD taip pat pildo ūkio subjektai, kurių pajėgumais remiamasi; nežinomi subtiekėjai pažymimi kaip nežinomi.",
           en: "The ESPD (European Single Procurement Document) is the supplier's self-declaration that there are no exclusion grounds and the qualification requirements are met; with the bid it replaces certificates issued by authorities; in simplified procurements no certificates on exclusion grounds are required once the supplier submits the ESPD (PĮ Art. 37(1)), while exclusion grounds and qualification apply mutatis mutandis under Arts. 46, 47, 50, 51 of the classic law (PĮ Art. 59(1)). The form is filled at ebvpd.eviesiejipirkimai.lt/espd-web: choose “I am an economic operator”, “Import ESPD”, upload the XML provided by the contracting entity (espd-request.xml from the procurement documents), select the country and fill in the parts. The ESPD is also filled by entities whose capacity is relied upon; unknown subcontractors are marked as unknown." },
      veiksmai: { lt: ["Iš pirkimo dokumentų paimkite espd-request.xml ir importuokite jį į formą - nepildykite tuščios formos.", "Užpildytą EBVPD išsaugokite PDF ir XML formatais, pasirašykite, jei to reikalauja sąlygos.", "Užtikrinkite, kad EBVPD pateiktų ir partneriai bei subjektai, kurių pajėgumais remiatės."],
                 en: ["Take espd-request.xml from the procurement documents and import it into the form - do not fill a blank form.", "Save the completed ESPD as PDF and XML, sign it if the conditions require.", "Make sure partners and entities whose capacity you rely on also submit an ESPD."] },
      saltiniai: [{ id: "S7", cit: { lt: "EBVPD forma; VPT „EBVPD pildymas. Tiekėjo veiksmai“", en: "ESPD form; PPO “Filling the ESPD. Supplier actions”" } }, { id: "S4", cit: { lt: "„Kaip pildyti EBVPD?“ (2024-04-30); „Ar subrangovai turi užpildyti EBVPD?“", en: "“How to fill in the ESPD?” (2024-04-30); “Must subcontractors fill in the ESPD?”" } }, { id: "S2", cit: { lt: "PĮ 37 str. 1 d., 59 str. 1 d.", en: "PĮ Art. 37(1), 59(1)" } }],
      spraga: { lt: "LITGRID specifinių EBVPD reikalavimų viešai nėra - jie pirkimo sąlygose. VPT DUK rašyti VPĮ straipsniais; PĮ atitikmenys - 37 str. 1 d. (pažymos) ir 59 str. 1 d. (taikymas).", en: "LITGRID-specific ESPD requirements are not public - they are in the conditions. PPO FAQ cites the classic law; the PĮ equivalents are Art. 37(1) (certificates) and Art. 59(1) (application)." } },

    { id: "klausimas", zymos: ["cvpis", "terminai"],
      q: { lt: "Kada ir kaip CVP IS pateikti klausimą dėl pirkimo dokumentų?", en: "When and how do I submit a question about the procurement documents in CVP IS?" },
      a: { lt: "Klausimai teikiami CVP IS susirašinėjimo priemonėmis: savo pirkimų sąraše pasirinkite pirkimą > Susirašinėjimas > Kurti naują; pažymėję „Konfidencialu“, aiškiai nurodykite, kuri informacija konfidenciali. Atsakymai ateina el. paštu ir matomi konkrečiame pirkime. Būdai prašyti paaiškinimų nurodomi pirkimo dokumentuose (PĮ 48 str. 2 d. 20 p.). Jei papildoma informacija pateikiama likus mažiau kaip 6 dienoms iki termino (supaprastintame pirkime - 4 dienoms), nors jos buvo paprašyta laiku, perkantysis subjektas privalo pratęsti terminą (53 str. 4 d. 1 p.); jei paprašyta nelaiku - gali nepratęsti (53 str. 5 d.).",
           en: "Questions are submitted via CVP IS messaging: in your procurement list select the procurement > Messaging > Create new; if you mark “Confidential”, state clearly which information is confidential. Replies arrive by e-mail and are visible in the specific procurement. The ways to request clarifications are set in the procurement documents (PĮ Art. 48(2)(20)). If additional information is provided less than 6 days before the deadline (4 days in a simplified procurement) although it was requested in time, the contracting entity must extend the deadline (Art. 53(4)(1)); if requested late, it may not (Art. 53(5))." },
      veiksmai: { lt: ["Pirkimo sąlygose raskite paaiškinimų prašymo terminą ir klauskite ne vėliau jo.", "Klausimą formuluokite neutraliai: dokumentas, punktas, citata, neaiškumas, vienas konkretus klausimas (įrankis parengia projektą)."],
                 en: ["Find the clarification-request deadline in the conditions and ask no later than that.", "Phrase the question neutrally: document, clause, quote, ambiguity, one specific question (the tool prepares a draft)."] },
      saltiniai: [{ id: "S1", cit: { lt: "„Tiekėjo susirašinėjimas CVP IS“, 2026-05-20, 2-7 skaidrės", en: "“Supplier messaging in CVP IS”, 2026-05-20, slides 2-7" } }, { id: "S2", cit: { lt: "PĮ 48 str. 2 d. 20 p., 53 str. 4 d. 1 p. ir 5 d.", en: "PĮ Art. 48(2)(20), 53(4)(1) and 53(5)" } }],
      spraga: { lt: "Konkretus klausimų terminas („laiku“) PĮ nenustatytas - jį nurodo pirkimo sąlygos (CVP IS lauke „Prašymų pateikti paaiškinimus termino pabaiga“).", en: "The specific question deadline (“in time”) is not set by the PĮ - it is in the conditions (CVP IS field “End of the clarification request period”)." } },

    { id: "konfidencialumas", zymos: ["dokumentai"],
      q: { lt: "Kaip pagrįsti konfidencialią informaciją?", en: "How do I justify confidential information?" },
      a: { lt: "Visas tiekėjo pasiūlymas ir paraiška negali būti laikomi konfidencialia informacija - galima nurodyti tik konkrečią dalį (pvz. komercinę paslaptį). Nekonfidenciali yra kaina (be sudedamųjų dalių), kvalifikaciją patvirtinantys dokumentai ir informacija apie pasitelktus subjektus bei subtiekėjus, kai ji reikalinga kitiems tiekėjams interesams ginti (PĮ 32 str. 2 d.). Kilus abejonių, perkantysis subjektas privalo prašyti įrodyti konfidencialumą; terminas - ne trumpesnis kaip 3 darbo dienos; nepateikus įrodymų informacija nelaikoma konfidencialia (32 str. 3 d.).",
           en: "A supplier's entire bid or application cannot be treated as confidential - only a specific part (e.g. a trade secret) may be marked. Non-confidential are the price (without its components), qualification documents and information on engaged entities and subcontractors where needed by other suppliers to defend their interests (PĮ Art. 32(2)). In case of doubt the contracting entity must ask for proof of confidentiality; the deadline is at least 3 working days; without proof the information is not treated as confidential (Art. 32(3))." },
      veiksmai: { lt: ["Konfidencialias dalis žymėkite konkrečiai ir parenkite pagrindimą (kodėl tai komercinė paslaptis, kokių priemonių imatės jai saugoti).", "Pasiūlymo formoje užpildykite konfidencialios informacijos sąrašą, jei toks numatytas."],
                 en: ["Mark confidential parts specifically and prepare a justification (why it is a trade secret, what measures protect it).", "Fill in the confidential-information list in the bid form if one is provided."] },
      saltiniai: [{ id: "S2", cit: { lt: "PĮ 32 str. 2-3 d.", en: "PĮ Art. 32(2)-(3)" } }, { id: "S6", cit: { lt: "VPT gairės „Konfidencialumas viešuosiuose pirkimuose“ (2024-05-31)", en: "PPO guidelines “Confidentiality in public procurement” (2024-05-31)" } }],
      spraga: { lt: "Pagrindimo turinio pavyzdžiai - VPT gairėse (PDF), kurių turinys čia nesantrauktas.", en: "Examples of justification content are in the PPO guidelines (PDF), not summarised here." } },

    { id: "subtiekejai", zymos: ["dokumentai"],
      q: { lt: "Kaip deklaruoti subtiekėjus ir ūkio subjektus, kurių pajėgumais remiamasi?", en: "How do I declare subcontractors and entities whose capacity I rely on?" },
      a: { lt: "Perkantysis subjektas reikalauja, kad dalyvis pasiūlyme nurodytų, kokiai sutarties daliai ketina pasitelkti subtiekėjus ir kokius, jeigu jie žinomi (PĮ 96 str. 1 d.); subtiekimas nekeičia pagrindinio tiekėjo atsakomybės (96 str. 3 d.). Remtis kitų ūkio subjektų pajėgumais galima neatsižvelgiant į ryšio pobūdį, bet išsilavinimo ar profesinės patirties reikalavimams - tik jei tie subjektai patys atliks darbus (62 str. 2 d.); pasiūlyme reikia įrodyti, kad ištekliai bus prieinami (62 str. 3 d.). EBVPD pildo subjektai, kurių pajėgumais remiamasi; nežinomi subtiekėjai EBVPD žymimi kaip nežinomi.",
           en: "The contracting entity requires the bidder to state in the bid which part of the contract it intends to subcontract and to which subcontractors, if known (PĮ Art. 96(1)); subcontracting does not change the main supplier's liability (Art. 96(3)). Reliance on other entities' capacity is allowed regardless of the legal nature of the links, but for education or professional experience only if those entities perform the works themselves (Art. 62(2)); the bid must prove the resources will be available (Art. 62(3)). The ESPD is filled by entities whose capacity is relied upon; unknown subcontractors are marked as unknown in the ESPD." },
      veiksmai: { lt: ["Pirkimo sąlygose raskite subtiekėjų / jungtinės veiklos formas ir kokius dokumentus (pvz. sutikimus, sutartis) reikia pridėti.", "Kiekvienam subjektui, kurio pajėgumais remiatės, parenkite EBVPD ir įrodymą dėl išteklių prieinamumo."],
                 en: ["Find the subcontractor / joint activity forms in the conditions and which documents (e.g. consents, agreements) must be attached.", "Prepare an ESPD and proof of resource availability for each entity whose capacity you rely on."] },
      saltiniai: [{ id: "S2", cit: { lt: "PĮ 96 str. 1 ir 3 d., 62 str. 1-3 d.", en: "PĮ Art. 96(1),(3), 62(1)-(3)" } }, { id: "S4", cit: { lt: "„Ar subrangovai turi užpildyti EBVPD?“; „Jei subtiekėjai nežinomi“", en: "“Must subcontractors fill in the ESPD?”; “If subcontractors are unknown”" } }],
      spraga: { lt: "VPT DUK cituoja VPĮ 88 str.; PĮ atitikmuo - 96 str. LITGRID formos - tik pirkimo sąlygose.", en: "PPO FAQ cites classic-law Art. 88; the PĮ equivalent is Art. 96. LITGRID forms are only in the conditions." } },

    { id: "pries_pateikiant", zymos: ["patikra"],
      q: { lt: "Ką patikrinti prieš pateikiant pasiūlymą?", en: "What should I check before submitting a bid?" },
      a: { lt: "VPT Tiekėjo gidas ir Tiekėjo ABC: ar atitinkate kvalifikaciją ir nėra pašalinimo pagrindų; ar reikia partnerių ar subtiekėjų; ar įvykdoma techninė specifikacija; ar realūs terminai; ar turite įgaliojimus, sertifikatus, licencijas; ar priimtinos sutarties sąlygos (užtikrinimas, mokėjimai, netesybos); ar pirkimas vieno, ar dviejų vokų. Nelaukite paskutinės minutės (el. parašo galiojimas, įranga, ryšys); dviejų vokų atveju į pirmą voką nedėkite kainos; patikrinkite aritmetines klaidas. CVP IS atsakymo būsena turi būti „Pateikta“ - „Projektas“ reiškia nepateiktą pasiūlymą. Pasiūlymas turi galioti ne trumpiau nei nustatyta (PĮ 54 str. 1 d.), o kaina neturi viršyti pirkimui skirtų lėšų (58 str. 1 d. 5 p.).",
           en: "PPO Supplier guide and Supplier ABC: whether you meet the qualification and have no exclusion grounds; whether you need partners or subcontractors; whether the technical specification is feasible; whether the deadlines are realistic; whether you have authorisations, certificates, licences; whether the contract terms (security, payments, penalties) are acceptable; whether it is a one- or two-envelope procurement. Do not wait until the last minute (e-signature validity, equipment, connection); in a two-envelope procurement do not put the price in the first envelope; check arithmetic. In CVP IS the response status must be “Submitted” - “Draft” means not submitted. The bid must be valid no shorter than required (PĮ Art. 54(1)) and the price must not exceed the funds allocated (Art. 58(1)(5))." },
      veiksmai: { lt: ["Sudarykite kontrolinį sąrašą pagal konkretaus pirkimo dokumentus (įrankis jį parengia iš įkeltų dokumentų).", "Pateikite bent kelias valandas iki termino ir įsitikinkite, kad būsena - „Pateikta“."],
                 en: ["Build a checklist from the documents of the specific procurement (the tool prepares it from uploaded documents).", "Submit at least a few hours before the deadline and make sure the status is “Submitted”."] },
      saltiniai: [{ id: "S6", cit: { lt: "Tiekėjo gidas 2025-05-16, 1-2 psl.; Tiekėjo ABC v1.3, 3 sk. ir „Patarimai tiekėjams“", en: "Supplier guide 2025-05-16, pp. 1-2; Supplier ABC v1.3, ch. 3 and “Tips for suppliers”" } }, { id: "S1", cit: { lt: "„Kaip pateikti, peržiūrėti ir pašalinti pasiūlymą CVP IS“, 42 skaidrė", en: "“How to submit, view and remove a bid in CVP IS”, slide 42" } }, { id: "S2", cit: { lt: "PĮ 54 str. 1 d., 58 str. 1 d. 5 p.", en: "PĮ Art. 54(1), 58(1)(5)" } }],
      spraga: { lt: "LITGRID specifiniai reikalavimai (saugaus darbo aprašas, įrangos atitikties pagrindimas, eksploatavimo reglamentai) taikomi tik tada, kai juos nurodo konkretaus pirkimo sąlygos.", en: "LITGRID-specific requirements (safety rules, equipment conformity, operation regulations) apply only when the conditions of the specific procurement refer to them." } },

    { id: "klaidos", zymos: ["patikra", "cvpis"],
      q: { lt: "Kokios dažniausios techninės pasiūlymo pateikimo klaidos?", en: "What are the most common technical bid-submission mistakes?" },
      a: { lt: "Pasiūlymas pateiktas CVP IS susirašinėjimo priemonėmis - toks pasiūlymas nevertinamas; pateikta po termino; kaina įdėta į netinkamą voką. Formatai: CVP IS palaiko 7z, csv, doc(x), dwg, jpg, pdf, png, ppt(x), rar, xls(x), xml, zip, adoc ir kt., kitus failus reikia suspausti į zip. Elektroninis parašas: CVP IS negalima pasirašyti sisteminiu el. parašu - jei reikalaujama, dokumentas pasirašomas už sistemos ribų ir įkeliamas pasirašytas. Po varnelės būtina „Išsaugoti“, kitaip dokumentas nepridedamas; naujas pasiūlymas automatiškai pakeičia ankstesnį; kaina rašoma formatu 10000.50.",
           en: "A bid sent via CVP IS messaging is not evaluated; a bid after the deadline; the price placed in the wrong envelope. Formats: CVP IS supports 7z, csv, doc(x), dwg, jpg, pdf, png, ppt(x), rar, xls(x), xml, zip, adoc etc.; other files must be zipped. E-signature: CVP IS cannot sign with a system e-signature - if required, sign outside the system and upload the signed file. After ticking a document you must “Save”, otherwise it is not attached; a new bid automatically replaces the previous one; the price is entered as 10000.50." },
      veiksmai: { lt: ["Prieš terminą atlikite bandomąjį įkėlimą ir patikrinkite, kad visi failai matomi pasiūlyme.", "Pasirašytus dokumentus (ADOC/PDF su parašu) parenkite iš anksto."],
                 en: ["Do a test upload before the deadline and check that all files are visible in the bid.", "Prepare signed documents (ADOC/PDF with signature) in advance."] },
      saltiniai: [{ id: "S6", cit: { lt: "Tiekėjo ABC, 3 sk. „Pasiūlymų teikimas“", en: "Supplier ABC, ch. 3 “Submitting bids”" } }, { id: "S4", cit: { lt: "„Dokumentų formatai“ (2024-12-20); „Elektroninis parašas“ (2026-09-01)", en: "“Document formats” (2024-12-20); “Electronic signature” (2026-09-01)" } }, { id: "S1", cit: { lt: "„Kaip pateikti, peržiūrėti ir pašalinti pasiūlymą CVP IS“, 21, 27-29, 38, 45-46 skaidrės", en: "“How to submit, view and remove a bid in CVP IS”, slides 21, 27-29, 38, 45-46" } }],
      spraga: { lt: "Nėra VPT statistinio klaidų sąrašo ir LITGRID praktikos apie dažniausiai atmestus pasiūlymus.", en: "There is no PPO statistical list of errors and no LITGRID practice on the most frequently rejected bids." } },

    { id: "galiojimas_uztikrinimas", zymos: ["dokumentai"],
      q: { lt: "Pasiūlymo galiojimas, užtikrinimas ir pakeitimas - ką sako PĮ?", en: "Bid validity, security and modification - what does the PĮ say?" },
      a: { lt: "Pasiūlymas galioja jame nurodytą terminą, ne trumpesnį nei nustatyta pirkimo dokumentuose (PĮ 54 str. 1 d.); iki pateikimo termino pabaigos tiekėjas gali pasiūlymą pakeisti ar atšaukti (54 str. 4 d.). Pasiūlymo galiojimo užtikrinimo perkantysis subjektas GALI reikalauti, o sutarties įvykdymo užtikrinimo - PRIVALO (55 str. 1 d.); tiekėjas gali iš anksto prašyti patvirtinti, ar užtikrinimas tinkamas - atsakoma per 3 darbo dienas (55 str. 3 d.). Neįprastai maža kaina: visais atvejais tokia laikoma, jei ji 30 ir daugiau proc. mažesnė už neatmestų pasiūlymų kainų aritmetinį vidurkį (66 str. 1 d.); tada prašoma pagrįsti raštu (66 str. 2 d.).",
           en: "A bid is valid for the period stated in it, no shorter than set in the documents (PĮ Art. 54(1)); before the submission deadline the supplier may modify or withdraw it (Art. 54(4)). The contracting entity MAY require bid security and MUST require contract performance security (Art. 55(1)); a supplier may ask in advance whether the security is acceptable - a reply is given within 3 working days (Art. 55(3)). Abnormally low price: in all cases a price is deemed abnormally low if it is 30% or more below the arithmetic mean of the non-rejected bids (Art. 66(1)); a written justification is then requested (Art. 66(2))." },
      veiksmai: { lt: ["Pasiūlymo formoje neįrašykite trumpesnio galiojimo, nei reikalauja sąlygos.", "Jei abejojate dėl užtikrinimo formos - paklauskite iš anksto (PĮ 55 str. 3 d.)."],
                 en: ["Do not enter a shorter validity in the bid form than the conditions require.", "If in doubt about the form of security, ask in advance (PĮ Art. 55(3))."] },
      saltiniai: [{ id: "S2", cit: { lt: "PĮ 54 str. 1 ir 4 d., 55 str. 1 ir 3 d., 66 str. 1-2 d.", en: "PĮ Art. 54(1),(4), 55(1),(3), 66(1)-(2)" } }],
      spraga: { lt: "Konkreti galiojimo trukmė, užtikrinimo suma ir forma - tik pirkimo sąlygose.", en: "The specific validity period, security amount and form are only in the conditions." } },

    { id: "pretenzija", zymos: ["ginčai"],
      q: { lt: "Kaip ir per kiek laiko pateikti pretenziją?", en: "How and within what time do I submit a claim?" },
      a: { lt: "Prieš kreipiantis į teismą pirmiausia teikiama pretenzija perkančiajam subjektui; ji teikiama elektroninėmis priemonėmis (mažos vertės pirkimuose - raštu) (PĮ 107 str. 3 d.). Terminas - 10 dienų (supaprastintuose pirkimuose - 5 darbo dienos) nuo pranešimo apie sprendimą išsiuntimo; 15 dienų, jei pranešimas siųstas ne elektroniniu būdu (108 str. 1 d.). Perkantysis subjektas pretenziją išnagrinėja per 6 darbo dienas (109 str. 3 d.), o sutartis sudaroma ne anksčiau kaip po 10 dienų / 5 darbo dienų (109 str. 2 d.).",
           en: "Before going to court a claim must first be submitted to the contracting entity; it is submitted electronically (in writing for low-value procurements) (PĮ Art. 107(3)). The deadline is 10 days (5 working days in simplified procurements) from the dispatch of the decision notice; 15 days if the notice was not sent electronically (Art. 108(1)). The entity examines the claim within 6 working days (Art. 109(3)) and the contract is concluded no earlier than after 10 days / 5 working days (Art. 109(2))." },
      veiksmai: { lt: ["Terminą skaičiuokite nuo pranešimo išsiuntimo datos CVP IS, ne nuo perskaitymo.", "Naudokite VPT pretenzijos šabloną (šaltinis S6)."],
                 en: ["Count the deadline from the dispatch date of the notice in CVP IS, not from when you read it.", "Use the PPO claim template (source S6)."] },
      saltiniai: [{ id: "S2", cit: { lt: "PĮ 107 str. 3 d., 108 str. 1 d., 109 str. 2-3 d.", en: "PĮ Art. 107(3), 108(1), 109(2)-(3)" } }, { id: "S6", cit: { lt: "„Kaip pateikti pretenziją pirkimo vykdytojui“ (docx)", en: "“How to submit a claim to the contracting authority” (docx)" } }],
      spraga: { lt: "Mažos vertės pirkimuose gali būti taikoma LITGRID MV aprašo tvarka - tikrinkite pirkimo sąlygas.", en: "In low-value procurements the LITGRID low-value rules may apply - check the conditions." } }
  ];

  function tema(id) { return TEMOS.filter(function (t) { return t.id === id; })[0] || null; }
  function saltinis(id) { return SALTINIAI.filter(function (s) { return s.id === id; })[0] || null; }
  // Paprasta bendrųjų temų paieška pagal žodžius
  function ieskok(q, lang) {
    var tk = global.GP_PAIESKA ? global.GP_PAIESKA.tokens(q) : String(q).toLowerCase().split(/\s+/);
    if (!tk.length) return [];
    return TEMOS.map(function (t) {
      var text = (global.GP_PAIESKA ? global.GP_PAIESKA.fold : String)(t.q[lang] + " " + t.a[lang] + " " + t.zymos.join(" "));
      var hit = tk.filter(function (x) { return text.indexOf(x) !== -1; }).length;
      return { tema: t, score: hit / tk.length };
    }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; });
  }

  global.GP_ZINIOS = { version: "0.1.0", PATIKRINTA: PATIKRINTA, SALTINIAI: SALTINIAI, TEMOS: TEMOS, PRIMINIMAS: PRIMINIMAS, tema: tema, saltinis: saltinis, ieskok: ieskok };
})(typeof window !== "undefined" ? window : this);
