/* =====================================================================
   G-Procure DI funkcijos ir jų savarankiškumo lygiai (GP_DI_FUNKCIJOS, nuo 2026-11-15, krypties 3.4;
   naudotojo „Darome - 3.4 DI savarankiškumo lygiai“).

   Vienas registras: kiekviena DI funkcija (serverio DI užduotis ar kitas DI kvietimas) - įrankis, lygis
   pagal G-Procure vizijos laiptus (kryptis.html #laiptai), kada ir kas siunčiama, ką programa patikrina
   prieš parodydama atsakymą ir kaip jį patvirtina žmogus. Rodo DI valdymo puslapis (ai-valdymas.html),
   į jį veda kiekvieno įrankio informacinė skiltis (?irankis=<moduleId>).

   Lygiai: L0 - taisyklė be DI, L1 - parengia (projektas žmogui), L2 - rekomenduoja (pastabos,
   alternatyvos, įvertis su paaiškinimu), L3 - atlieka (tik iš anksto patvirtintas, atšaukiamas ir
   mažos rizikos veiksmas; kryptis), L4 - sprendžia (visada žmogus). Šiandien DI funkcijos - tik L1 ir L2.

   Naujai DI funkcijai (serverio šablonui) - įrašas čia; testai (shared/testai.html) tikrina, kad
   kiekviena modulyje kviečiama užduotis yra registre ir atvirkščiai, ir kad kiekvienas informacinės
   skilties įrankis įrašytas į IRANKIAI. Tekstai - tik tai, ką kodas tikrai daro.
   ===================================================================== */
(function (global) {
  "use strict";

  var LYGIAI = {
    L0: { lt: "Taisyklė", en: "Rule" },
    L1: { lt: "Parengia", en: "Drafts" },
    L2: { lt: "Rekomenduoja", en: "Recommends" },
    L3: { lt: "Atlieka", en: "Acts" },
    L4: { lt: "Sprendžia", en: "Decides" }
  };
  /* Lygiai, kurie šiandien naudojami (L3 - kryptis, L4 - tik žmogus). */
  var SIANDIEN = ["L1", "L2"];

  /* Įrankiai pagal informacinės skilties moduleId. be: true - DI nenaudoja (tik taisyklės, L0). */
  var IRANKIAI = [
    { id: "pp-ts", lt: "TS asistentas", en: "TS assistant" },
    { id: "pp-qual", lt: "Kvalifikaciniai reikalavimai", en: "Qualification requirements" },
    { id: "pp-salygos", lt: "Pirkimo sąlygų generatorius", en: "Procurement conditions generator" },
    { id: "pp-graphs", lt: "Pirkimų grafikų generatorius", en: "Procurement schedule generator" },
    { id: "pp-negotiation", lt: "Derybų pasirengimo įrankis", en: "Negotiation preparation tool" },
    { id: "pp-carbon", lt: "Anglies pėdsakas", en: "Carbon footprint" },
    { id: "pp-carbon-epd", lt: "Tiekėjo EPD įrankis", en: "Supplier EPD tool" },
    { id: "pp-esg", lt: "ESG ir atitiktis", en: "ESG and compliance" },
    { id: "pp-tiekejams", lt: "G-Procure Tiekėjams", en: "G-Procure for Suppliers" },
    { id: "pp-teise", lt: "Pirkimų teisės stebėsena (registro tvarkymas)", en: "Procurement law monitoring (register editing)" },
    { id: "pp-plan", lt: "Pirkimų planavimas", en: "Procurement planning", be: true },
    { id: "pp-plan-bvpz", lt: "BVPŽ kodų paieška", en: "CPV code search", be: true },
    { id: "pp-market-kpi", lt: "Rinkos rodiklių stebėsena", en: "Market indicators monitoring", be: true },
    { id: "pp-cost-benefit-ens", lt: "Ekonominio naudingumo skaičiuoklė", en: "Economic advantage calculator", be: true },
    { id: "pp-cost-benefit-kna", lt: "Kaštų ir naudos analizė", en: "Cost-benefit analysis", be: true },
    { id: "pp-protocol", lt: "Protokolų generatorius", en: "Protocol generator", be: true },
    { id: "pp-report", lt: "Tiekėjų apklausos pažyma", en: "Supplier survey report", be: true },
    { id: "pirkimu-korteles", lt: "Pirkimų kortelės", en: "Procurement cards", be: true }
  ];

  /* f(id, įrankis, lygis, užduotis, [pav], [kada], [siunčiama], [patikros], [žmogus]) - kiekvienas tekstas [lt, en].
     Užduotis false - ne serverio DI užduotis (marsrutas - kitas DI maršrutas). Tekstai sutikrinti su modulių kodu 2026-11-15. */
  function f(id, irankis, lygis, uzduotis, pav, kada, siunciama, patikros, zmogus, marsrutas) {
    var p = function (x) { return { lt: x[0], en: x[1] }; };
    var o = { id: id, irankis: irankis, lygis: lygis, uzduotis: uzduotis, pav: p(pav), kada: p(kada), siunciama: p(siunciama), patikros: p(patikros), zmogus: p(zmogus) };
    if (marsrutas) o.marsrutas = marsrutas;
    return o;
  }
  var TS_SIUNCIA = ["Pirkimo informacija (su numatoma verte, jei ji įrašyta)", "Procurement information (with the estimated value, if entered)"];
  var FUNKCIJOS = [
    /* ---- TS asistentas ---- */
    f("pp-ts.klausimai", "pp-ts", "L1", "pp-ts.klausimai",
      ["Patikslinantys klausimai TS rengti", "Clarifying questions for drafting the TS"],
      ["Paspaudus „Pradėti generavimą“", "On clicking the button that starts generation"],
      [TS_SIUNCIA[0] + " ir pasirinkti aspektai", TS_SIUNCIA[1] + " and the selected aspects"],
      ["Atsakyme turi būti klausimų sąrašas; tušti klausimai atmetami, imama ne daugiau kaip 40 klausimų", "The response must contain a list of questions; empty questions are dropped, at most 40"],
      ["Į klausimus atsako pats; DI siūlomas atsakymas įrašomas tik jį paspaudus", "Answers the questions; an answer suggested by AI is entered only when clicked"]),
    f("pp-ts.karkasas", "pp-ts", "L1", "pp-ts.karkasas",
      ["TS struktūra", "TS structure"],
      ["Paspaudus „Generuoti TS“ ar „Pergeneruoti“", "On clicking the button that generates or regenerates the TS"],
      [TS_SIUNCIA[0] + ", atsakymai į klausimus ir iki 15 panašių CVP IS pirkimų (pavadinimas, vertė, data)", TS_SIUNCIA[1] + ", the answers to the questions and up to 15 similar CVP IS procurements (title, value, date)"],
      ["Be skyrių sąrašo - klaida, TS negeneruojama", "Without a list of sections - an error, the TS is not generated"],
      ["Struktūra ir rekomendacijos pažymėtos DI žyma; kiekvieną skyrių peržiūri ir patvirtina pats", "The structure and recommendations carry an AI mark; reviews and approves the sections"]),
    f("pp-ts.skyrius", "pp-ts", "L1", "pp-ts.skyrius",
      ["TS skyriaus tekstas", "Text of a TS section"],
      ["Generuojant TS - po vieną užklausą skyriui", "When generating the TS - one request per section"],
      [TS_SIUNCIA[0] + ", atsakymai, įklijuoti analogai (iki 2000 ženklų kiekvienas) ir TS struktūra", TS_SIUNCIA[1] + ", the answers, pasted analogues (up to 2000 characters each) and the TS structure"],
      ["Programa iš skyriaus pašalina tai, kas nėra TS dalis (sutarties sąlygos, kvalifikacija, vertinimas, numatoma vertė) ir praneša, ką pašalino; jei skyriaus parengti nepavyko, apie tai pranešama; eksportas stabdomas, jei tekste liko numatoma vertė", "The program removes from the section what is not part of a TS (contract terms, qualification, evaluation, the estimated value) and says what it removed; a failed section is reported; export is blocked if the estimated value remains in the text"],
      ["Skyrius rodomas su žyma „DI parengė“; peržiūrėjęs pažymi „Žmogus tvirtino“", "The section is shown marked as prepared by AI; after review the person marks it as approved"]),
    f("pp-ts.atitiktis", "pp-ts", "L1", "pp-ts.atitiktis",
      ["Atitikties lentelė", "Compliance table"],
      ["Generuojant TS", "When generating the TS"],
      [TS_SIUNCIA[0] + " ir kiekvieno skyriaus pradžia (iki 300 ženklų)", TS_SIUNCIA[1] + " and the beginning of each section (up to 300 characters)"],
      ["Reikalavimų sąrašas privalomas, eilutės be teksto atmetamos, imama ne daugiau kaip 60 eilučių; tuščia lentelė - klaida", "A list of requirements is required, rows without text are dropped, at most 60; empty - an error"],
      ["Lentelę peržiūri kartu su TS projektu", "Reviews the table together with the draft TS"]),
    f("pp-ts.auditas", "pp-ts", "L2", "pp-ts.auditas",
      ["TS patikra: pastabos ir rekomendacijos", "TS check: comments and recommendations"],
      ["Paspaudus „Išsami analizė (DI ir taisyklės)“; greitas patikrinimas vyksta tik naršyklėje", "On clicking the full analysis button; the quick check runs only in the browser"],
      ["TS tekstas (iki 120 000 ženklų), pirkimo duomenys (su numatoma verte, jei ji įrašyta), pasirinkti aspektai ir kiek pastabų rado patikra pagal taisykles", "The TS text (up to 120,000 characters), procurement metadata (with the estimated value, if entered), the selected aspects and the number of rule findings"],
      ["Citata rodoma tik jei yra TS tekste; teisės nuoroda - tik jei tokia pat yra G-Procure teisės nuorodų sąraše; sunkumas ir kategorija - tik iš nustatyto sąrašo; jei atsakymas nutrūko, apie tai pranešama", "A quote is shown only if it is in the TS text; a legal reference - only if the same one is in the register; severity and category - only known values; a truncated response is reported"],
      ["Pastabos su DI žyma tik rodomos; ką keisti, sprendžia pats", "Comments with an AI mark are only shown; the person decides what to change"]),
    f("pp-ts.taisymas", "pp-ts", "L1", "pp-ts.taisymas",
      ["Rekomendacijų pritaikymas TS skyriams", "Applying recommendations to TS sections"],
      ["Paspaudus „Pritaikyti rekomendacijas į TS“ ir patvirtinus, kad esama TS versija bus pakeista", "On clicking the button that applies recommendations and confirming that the current TS version will be replaced"],
      [TS_SIUNCIA[0] + ", skyriaus tekstas ir jam skirtos svarbios pastabos", TS_SIUNCIA[1] + ", the section text and the important comments for it"],
      ["Pastaba siunčiama tik kartu su skyriumi, kuriame rasta jos citata (kitos pastabos nepritaikomos, ir apie tai pranešama); po pataisymo vėl pašalinama tai, kas nėra TS dalis", "A comment is sent only for the section where its quote is found (others are not applied and this is reported); after the rewrite, what is not part of a TS is removed again"],
      ["Pataisytas skyrius gauna būseną „DI pataisė“ (ankstesnis patvirtinimas nebegalioja) - peržiūri ir patvirtina iš naujo", "The rewritten section gets the status “AI revised” (an earlier approval no longer applies) - reviews and approves it again"]),
    f("pp-ts.kaina", "pp-ts", "L2", "pp-ts.kaina",
      ["Orientacinis kainos įvertis", "Indicative price estimate"],
      ["Generuojant TS", "When generating the TS"],
      [TS_SIUNCIA[0] + ", atsakymai, iki 40 panašių CVP IS pirkimų ir jų statistika", TS_SIUNCIA[1] + ", the answers, up to 40 similar CVP IS procurements and their statistics"],
      ["Atsakymas turi būti nustatytos sandaros (JSON); įvertis į vertės laukus ir pirkimo kortelę neperkeliamas", "The response must be JSON; the estimate is not transferred to the value fields or the procurement card"],
      ["Įvertis rodomas su žyma „DI įvertis“ ir pastaba, kad tai ne numatoma vertė; numatomą vertę nustato pats", "The estimate is shown as an AI estimate with a note that it is not the estimated value; the person sets the estimated value"]),
    f("pp-ts.rinka", "pp-ts", "L2", "pp-ts.rinka",
      ["Rinkos analizė", "Market analysis"],
      ["Generuojant TS", "When generating the TS"],
      [TS_SIUNCIA[0] + " ir panašių CVP IS pirkimų statistika", TS_SIUNCIA[1] + " and statistics of similar CVP IS procurements"],
      ["Atsakymas turi būti nustatytos sandaros (JSON); DI žinios apie tiekėjus pažymėtos kaip galbūt pasenusios", "The response must be JSON; AI knowledge about suppliers is marked as possibly outdated"],
      ["Analizė su DI žyma tik rodoma", "The analysis with an AI mark is only shown"]),
    f("pp-ts.rk-klausimai", "pp-ts", "L1", "pp-ts.rk-klausimai",
      ["Rinkos konsultacijos klausimai", "Market consultation questions"],
      ["Paspaudus „Pasiūlyti klausimus (DI)“", "On clicking the button that suggests questions"],
      ["TS tekstas, iš kurio pašalintos eilutės su numatoma verte ir sumomis, pirkimo pavadinimas, objekto tipas ir būdas; numatoma vertė ir asmens duomenys nesiunčiami", "The TS text without lines with the estimated value and sums, the procurement title, object type and procedure; the estimated value and personal data are not sent"],
      ["Tema - tik iš nustatyto sąrašo, citata - tik jei yra TS tekste, kainos klausimai, trumpi ir pasikartojantys atmetami, imama ne daugiau kaip 30 klausimų", "Topic - only known ones, a quote - only if it is in the TS text, price questions, short and duplicate ones are dropped, at most 30"],
      ["Pasiūlymai pažymėti „DI pasiūlymas“ ir į kvietimą savaime neįtraukiami - įtraukia pats", "Suggestions are marked as AI suggestions and not included; the person includes them in the invitation"]),
    f("pp-ts.rk-apibendrinimas", "pp-ts", "L1", "pp-ts.rk-apibendrinimas",
      ["Rinkos dalyvių pastabų apibendrinimas ir atsakymo juodraštis", "Summary of market participants' comments and a draft reply"],
      ["Paspaudus „Apibendrinti visas temas (DI)“ ar temos mygtuką", "On clicking the button that summarises all topics or one topic"],
      ["Pirkimo pavadinimas ir tipas, temų klausimai ir nagrinėjamos ne konfidencialios pastabos - užkoduotos (dalyviai kodais, pavadinimai, kontaktai, sumos pašalinti); kainų tema nesiunčiama", "The procurement title and type, topic questions and the examined non-confidential comments - encoded (participants as codes, names, contacts and sums removed); the price topic is not sent"],
      ["Priimamos tik išsiųstos temos ir užklausoje naudoti dalyvių kodai; citata - tik jei yra to dalyvio pastabose; pavadinimai ir kontaktai atsakyme vėl užkoduojami prieš parodant", "Only the topics sent and known participant codes are accepted; a quote - only if it is in that participant's comments; names and contacts in the response are encoded again before showing"],
      ["Į laukus įrašoma tik paspaudus „Naudoti“; tekstas pažymėtas „DI juodraštis“", "Entered into the fields only on clicking “Use”; the text is marked as an AI draft"]),
    /* ---- Kvalifikaciniai reikalavimai ---- */
    f("pp-qual.kontekstas", "pp-qual", "L1", "pp-qual.kontekstas",
      ["Pirkimo duomenų laukų pildymas iš TS", "Extracting the procurement context from the TS"],
      ["Paspaudus „Užpildyti laukus iš TS (DI)“", "On clicking the button that extracts the context with AI"],
      ["Įkeltos TS tekstas (iki 120 000 ženklų)", "The text of the uploaded TS (up to 120,000 characters)"],
      ["Objekto tipas ir apmokėjimo sąlygos - tik iš sąrašo, vertė - tik didesnė už nulį", "The object type and payment terms - only from the list, the value - only positive"],
      ["Tušti laukai užpildomi ir išvardijami; jei DI reikšmė skiriasi nuo įvestos, ji tik pasiūloma („Naudoti DI reikšmę“)", "Empty fields are filled and listed; an AI value different from the one entered is only a suggestion to use"]),
    f("pp-qual.klausimai", "pp-qual", "L1", "pp-qual.klausimai",
      ["Patikslinantys klausimai", "Clarifying questions"],
      ["Paspaudus „Toliau - generuoti klausimus“", "On clicking the button that generates questions"],
      ["Pirkimo kontekstas su numatoma verte ir iš TS ištraukta santrauka", "The procurement context with the estimated value and a summary extracted from the TS"],
      ["Be klausimų sąrašo - klaida; tušti klausimai atmetami", "Without a list of questions - an error; empty questions are dropped"],
      ["Į klausimus atsakyti neprivaloma", "Answering the questions is optional"]),
    f("pp-qual.generavimas", "pp-qual", "L1", "pp-qual.generavimas",
      ["Kvalifikacijos reikalavimų pasiūlymas", "Proposed qualification requirements"],
      ["Paspaudus „Toliau - generuoti reikalavimus“ (tik kai numatoma vertė įrašyta)", "On clicking the button that generates requirements (only when the estimated value is entered)"],
      ["Pirkimo kontekstas su numatoma verte ir atsakymais, Metodikos reikšmės pagal vertę, dalys, žaliojo pirkimo požymis", "The procurement context with the estimated value and answers, the Methodology values by value, lots, the green procurement flag"],
      ["Reikalavimų sąrašas privalomas, tušti atmetami, kategorija ne iš nustatyto sąrašo - „Reikia peržiūros“; jei atsakymas nutrūko, apie tai pranešama", "A list of requirements is required, empty ones are dropped, an unknown category - needs review; a truncated response is reported"],
      ["Kiekvieną reikalavimą tvirtina pats; kol ne visi patvirtinti, dokumentas žymimas JUODRAŠČIU", "Approves each requirement; until approved, the document is marked DRAFT"]),
    f("pp-qual.isskyrimas", "pp-qual", "L1", "pp-qual.isskyrimas",
      ["Įklijuotų reikalavimų išskaidymas", "Splitting pasted requirements"],
      ["Paspaudus „Patikrinti reikalavimus“", "On clicking the button that checks the requirements"],
      ["Įklijuotas reikalavimų tekstas (iki 120 000 ženklų)", "The pasted requirements text (up to 120,000 characters)"],
      ["Kiekvieno reikalavimo tekstas lyginamas su įklijuotu - nesutampantis pažymimas „Reikia peržiūros“", "The text of each requirement is compared with the pasted text - one that does not match is marked as needing review"],
      ["Reikalavimus peržiūri ir tvirtina pats", "Reviews and approves the requirements"]),
    f("pp-qual.auditas", "pp-qual", "L2", "pp-qual.auditas",
      ["Reikalavimų patikra pagal Metodiką", "Checking requirements against the Methodology"],
      ["Išskaidžius reikalavimus arba paspaudus „Paleisti patikrą“", "After splitting the requirements or on clicking the button that runs the check"],
      ["Reikalavimai ir pateikiami dokumentai, pirkimo kontekstas su numatoma verte, Metodikos reikšmės", "The requirements and supporting documents, the procurement context with the estimated value, the Methodology values"],
      ["Teisės nuoroda - tik jei tokia pat yra G-Procure teisės nuorodų sąraše; pasiūlymas, kuris reikalavimą griežtina (nauja ar didesnė suma ar kiekis), - „Patikrinkite“; jei dalies reikalavimų patikrinti nepavyko, patikra pažymima kaip dalinė", "A legal reference - only if the same one is in the register; a proposal that tightens a requirement (a new or larger sum or quantity) - flagged for checking; if it fails, the check is partial"],
      ["Pataisa taikoma tik pažymėjus ją ir paspaudus „Pritaikyti pažymėtus pasiūlymus“", "A revision is applied only after ticking it and clicking the button that applies the selected suggestions"]),
    f("pp-qual.vertimas", "pp-qual", "L1", "pp-qual.vertimas",
      ["Reikalavimų vertimas į anglų kalbą", "Translating requirements into English"],
      ["Paspaudus DOCX, kai pasirinkta LT / EN", "On clicking DOCX when LT / EN is chosen"],
      ["Lietuviškas reikalavimų ir dokumentų tekstas (tik tų reikalavimų, kurių vertimo nėra arba jis pasenęs); kontekstas ir numatoma vertė nesiunčiami", "The Lithuanian text of the requirements and documents (only untranslated or outdated ones); the context and the estimated value are not sent"],
      ["Skaičiai turi sutapti, lietuviškos raidės ir neišverstas tekstas - pastaba; jei dalis teksto neišversta, dokumentas negeneruojamas", "Numbers must match, Lithuanian letters and untranslated text - a note; untranslated - the document is not generated"],
      ["Kol vertimas su pastabomis nepatvirtintas, dvikalbio dokumento sudaryti negalima; be pastabų, bet nepatvirtintas - dokumentas žymimas JUODRAŠČIU", "A translation with notes and not approved blocks the bilingual document; one without notes but not approved - the document is marked DRAFT"]),
    /* ---- Pirkimo sąlygų generatorius ---- */
    f("pp-salygos.atsakymai", "pp-salygos", "L2", "pp-salygos.atsakymai",
      ["Atsakymų į sąlygų ir sutarties klausimus pasiūlymai iš pirkimo dokumentų", "Suggested answers to the conditions and contract questions from the procurement documents"],
      ["Sąlygoms - paspaudus „Gauti pasiūlymus“; sutarties klausimams - automatiškai, kai leista DI skaityti šio pirkimo dokumentus ir pirkimas nesusijęs su nacionaliniu saugumu (kitaip - mygtuku)", "For the conditions - on clicking the button that gets suggestions; for the contract questions - automatically when AI is allowed to read this procurement's documents and the procurement is not related to national security (otherwise by button)"],
      ["Įkeltų dokumentų tekstas (ne paraiška), klausimai su šablono variantais, pirkimo pavadinimas, būdas ir objektas; numatoma vertė nesiunčiama", "The text of the uploaded documents (not the application), the questions with template variants, the procurement title, procedure and object; the estimated value is not sent"],
      ["Citata turi būti dokumente, įrašoma reikšmė, jos skaičiai ir matavimo vienetai turi būti citatoje; citata, kurioje neįvardytas klausimo dalykas, pažymima (sutarties klausimams - nenaudojama)", "The quote must be in a document, the value entered, numbers and units - in the quote; a quote that does not name the question is flagged (for the contract questions - not used)"],
      ["Sąlygose - „Priimti“ arba „Atmesti“ (be patikrintos citatos priimti negalima); sutarties klausimuose - „Siūloma (nepatvirtinta)“ su DI žyma ir citata, tvirtina pats", "In the conditions - accept or reject (without a verified quote it cannot be accepted); in the contract questions - suggested (not approved) with an AI mark and quote, approved by the person"]),
    f("pp-salygos.paraiska", "pp-salygos", "L1", "pp-salygos.paraiska",
      ["Pirkimo paraiškos skaitymas", "Reading the procurement application"],
      ["Įkėlus dokumentą, aiškiai atpažintą kaip paraiška, - automatiškai, kai leista DI skaityti šio pirkimo dokumentus ir pirkimas nesusijęs su nacionaliniu saugumu; kitaip - paspaudus „Užpildyti laukus iš paraiškos (DI)“", "After uploading a clear application - automatically when AI is allowed to read this procurement's documents and the procurement is not related to national security; otherwise on clicking the button that fills the fields from the application"],
      ["Paraiškos failas (PDF ar nuotrauka); joje paprastai yra ir numatoma vertė", "The application file (PDF or photo); it usually contains the estimated value"],
      ["Reikšmės - tik iš sąrašų ir su citata (dalys, BVPŽ kodai, ES lėšos); citata su dokumento tekstu nelyginama - paraiška dažnai be teksto sluoksnio", "Values - only from lists and with a quote (lots, CPV codes, EU funds); the quote is not compared with the document text - an application often has no text layer"],
      ["Tušti laukai užpildomi su žyme „iš paraiškos (nepatvirtinta)“ - tvirtina ✓ arba taiso; jei paraiškoje reikšmė kitokia nei įrašyta, renkasi pats; ankstesnes reikšmes galima grąžinti mygtuku „Grąžinti ankstesnes reikšmes“", "Empty fields are filled marked as from the application (not approved) - approves or corrects; a value different from the one entered - the person chooses; previous values can be restored"]),
    f("pp-salygos.skenuotas", "pp-salygos", "L1", "pp-salygos.skenuotas",
      ["Skenuoto dokumento teksto atpažinimas", "Recognising the text of a scanned document"],
      ["Įkėlus PDF be teksto sluoksnio ar nuotrauką - automatiškai, kai leista DI skaityti šio pirkimo dokumentus ir pirkimas nesusijęs su nacionaliniu saugumu; kitaip - paspaudus „Perskaityti tekstą su DI“", "After uploading a PDF without text or a photo - automatically when AI is allowed to read this procurement's documents and the procurement is not related to national security; otherwise on clicking the button that reads the text with AI"],
      ["Dokumento failas ir jo vardas", "The document file and its name"],
      ["Priimamos tik pastraipos ir lentelės, jų skaičius ir ilgis ribojami; nutrūkęs ar neįskaitomas - klaida su priežastimi", "Only known elements and limits; a truncated or illegible response - an error with the reason"],
      ["Tekstas pažymėtas „DI atpažintas tekstas“; iš jo perkeltas lenteles palygina su originalu ir tvirtina, kriterijus ir dalys tik siūlomi", "The text is marked as recognised by AI; tables taken from it are compared with the original and approved, the criterion and lots are only suggested"]),
    f("pp-salygos.lenteles-vertimas", "pp-salygos", "L1", "pp-salygos.lenteles-vertimas",
      ["Kvalifikacijos ir žaliųjų reikalavimų lentelės vertimas", "Translating the qualification or green requirements table"],
      ["Paspaudus „Pasiūlyti vertimą (DI)“, kai sąlygos dvikalbės, o lentelėje anglų teksto nėra", "On clicking the button that suggests a translation, when the conditions are bilingual and the table has no English text"],
      ["Tik lentelės lietuviškas tekstas (dalimis iki ~6000 ženklų); numatoma vertė ir kiti pirkimo duomenys nesiunčiami", "Only the Lithuanian text of the table (in parts of up to about 6000 characters); the estimated value and other procurement data are not sent"],
      ["Išverstoje lentelėje kiekviena eilutė turi būti su tuo pačiu numeriu ir tiek pat pastraipų; kiti skaičiai ar lietuviškos raidės - perspėjimas prie eilutės; nutrūkęs - klaida", "Each row must come back with the same number and paragraph count; different numbers or Lithuanian letters - a warning at the row; truncated - an error"],
      ["Vertimas pažymėtas „DI vertimas“, patvirtina mygtuku „Patvirtinti vertimą“; Word faile - DI požymis", "The translation is marked as an AI translation and approved by the person; the Word file carries an AI attribute"]),
    f("pp-salygos.pavadinimas-en", "pp-salygos", "L1", "pp-salygos.pavadinimas-en",
      ["Pirkimo pavadinimo vertimas", "Translating the procurement title"],
      ["Paspaudus „Pasiūlyti vertimą (DI)“ prie angliško pavadinimo", "On clicking the button that suggests a translation of the English title"],
      ["Tik lietuviškas pirkimo pavadinimas", "Only the Lithuanian procurement title"],
      ["Imama tik pirma eilutė, pašalinami perteklinis „Procurement of“ ir ilgieji brūkšniai; tuščias - klaida", "Only the first line is used, a superfluous “Procurement of” and long dashes are cleaned; empty - an error"],
      ["Įrašoma su žyme „DI pasiūlymas (nepatvirtinta)“; tvirtina ✓ arba taiso", "Entered marked as an AI suggestion (not approved); approves or corrects"]),
    f("pp-salygos.dalies-pavadinimas-en", "pp-salygos", "L1", "pp-salygos.dalies-pavadinimas-en",
      ["Pirkimo dalies pavadinimo vertimas", "Translating the name of a lot"],
      ["Paspaudus „Pasiūlyti vertimą (DI)“ prie dalies", "On clicking the button that suggests a translation at the lot"],
      ["Tik dalies pavadinimas", "Only the name of the lot"],
      ["Imama tik pirma eilutė, pašalinami perteklinis „Procurement of“ ir ilgieji brūkšniai", "Only the first line is used, a superfluous “Procurement of” and long dashes are cleaned"],
      ["„Siūloma (nepatvirtinta)“ - patvirtina mygtuku „Patvirtinti“", "Suggested (not approved) - approved by the person"]),
    f("pp-salygos.lauko-vertimas-en", "pp-salygos", "L1", "pp-salygos.lauko-vertimas-en",
      ["Dvikalbių sąlygų lauko vertimas", "Translating a field of bilingual conditions"],
      ["Paspaudus „Pasiūlyti vertimą (DI)“ prie lauko", "On clicking the button that suggests a translation at the field"],
      ["Tik to lauko reikšmė (iki 4000 ženklų)", "Only the value of that field (up to 4000 characters)"],
      ["Imama tik pirma eilutė, pašalinami perteklinis „Procurement of“ ir ilgieji brūkšniai", "Only the first line is used, a superfluous “Procurement of” and long dashes are cleaned"],
      ["„Siūloma (nepatvirtinta)“ - patvirtina mygtuku „Patvirtinti“; neužpildytą lauką parodo patikra", "Suggested (not approved) - approved by the person; an empty field is shown by the check"]),
    /* ---- Pirkimų grafikų generatorius ---- */
    f("pp-graphs.en-pavadinimas", "pp-graphs", "L1", "pp-graphs.en-pavadinimas",
      ["Pirkimo pavadinimo vertimas grafikui anglų kalba", "Translating the procurement title for a schedule in English"],
      ["Pasirinkus grafiką anglų kalba, kai angliško pavadinimo laukas tuščias, arba paspaudus „Išversti su DI“", "On choosing a schedule in English when the English title field is empty, or on clicking the button that translates with AI"],
      ["Tik lietuviškas pirkimo pavadinimas", "Only the Lithuanian procurement title"],
      ["Visi skaičiai turi likti, lietuviškų raidžių neturi būti - kitaip „Patikrinkite“; tuščias, ilgesnis nei 300 ženklų ar nutrūkęs - klaida", "All numbers must remain and there must be no Lithuanian letters - otherwise flagged for checking; empty, longer than 300 characters or truncated - an error"],
      ["„DI vertimas (nepatvirtinta)“ - patvirtina mygtuku „Patvirtinti vertimą“ arba taiso; spausdinant nepatvirtintą - paklausiama", "AI translation (not approved) - approves or corrects; printing an unapproved one asks first"]),
    /* ---- Derybų pasirengimo įrankis ---- */
    f("pp-negotiation.pasiulymas", "pp-negotiation", "L1", "pp-negotiation.pasiulymas",
      ["Pasiūlymo įkainių lentelės skaitymas", "Reading the price table of a tender"],
      ["Paspaudus „Skaityti su DI“ prie PDF pasiūlymo, kurio nepavyko perskaityti be DI", "On clicking the button that reads with AI at a PDF tender the tool could not read itself"],
      ["Tik tas PDF failas ir jo vardas; numatoma vertė ir kitų tiekėjų duomenys nesiunčiami", "That one PDF file and its name; the planned value and other suppliers are not sent"],
      ["Priimami tik skaičiai, ne mažesni už nulį, eilutė be pavadinimo, kiekio ar įkainio atmetama; kiekis × įkainis, pozicijų ir pasiūlymo sumos, PVM ir valiuta - nesutapimai parodomi", "Numbers finite and non-negative, a row without name, quantity or price is dropped; quantity × price, item and tender totals, VAT and currency - mismatches are shown"],
      ["Peržiūros lange failas iš anksto nepažymėtas varnele; įrašoma tik paspaudus „Priimti pažymėtus“; įkainiai pažymėti kaip perskaityti su DI", "The file is not ticked in the preview; saved only on accepting the selected files; the prices are marked as read with AI"]),
    /* ---- Anglies pėdsakas ---- */
    f("pp-carbon.epd", "pp-carbon", "L1", "pp-carbon.epd",
      ["GWP reikšmės skaitymas iš EPD", "Reading the GWP value from an EPD"],
      ["Paspaudus „Analizuoti“ EPD lange", "On clicking the analyse button in the EPD window"],
      ["EPD PDF, pozicijos pavadinimas ir vienetas", "The EPD PDF, the item name and the unit"],
      ["Skaičius turi būti citatoje, citata - dokumento tekste; matavimo vienetas perskaičiuojamas į pozicijos vienetą; jei to padaryti negalima, reikšmė neįrašoma; A1-A3 sumą skaičiuoja programa", "The number must be in the quote, the quote - in the document text; the unit is reconciled or nothing is entered; the A1-A3 sum is calculated by the program"],
      ["„Patvirtinti ir įrašyti“ arba „Atmesti“; kai reikšmės patikrinti nepavyksta, ją įrašo pats", "Approve and save, or reject; if not verified - the person enters the value"]),
    f("pp-carbon-epd.epd", "pp-carbon-epd", "L1", "pp-carbon.epd",
      ["GWP reikšmės skaitymas iš EPD", "Reading the GWP value from an EPD"],
      ["Paspaudus „Analizuoti“ (viešoje svetainėje - patvirtinus, kad siunčia žmogus)", "On clicking the analyse button (on the public site - after confirming that a person is sending it)"],
      ["EPD PDF ir įvestos laukų reikšmės - per G-Procure tarpinį serverį (Cloudflare) ir G-Procure serverį", "The EPD PDF and the fields entered - via the G-Procure relay (Cloudflare) and the G-Procure server"],
      ["Skaičius turi būti citatoje, citata - dokumento tekste; matavimo vienetas perskaičiuojamas į nurodytą vienetą", "The number must be in the quote, the quote - in the document text; the unit is reconciled"],
      ["Rezultatas su DI žyma; nepatikrintos reikšmės nukopijuoti negalima", "The result carries an AI mark; an unverified value cannot be copied"]),
    /* ---- ESG ir atitiktis ---- */
    f("pp-esg.sankcijos", "pp-esg", "L2", false,
      ["Preliminarus sankcijų rizikos vertinimas", "Preliminary sanctions risk assessment"],
      ["Paspaudus „Įvertinti sankcijų riziką (DI)“; tik bendrovėms (individualių įmonių, mažųjų bendrijų, ūkininkų - nesiūloma, neaiškiai formai žmogus patvirtina, kad tai bendrovė)", "On clicking the button that assesses sanctions risk with AI; companies only (not offered for sole traders, small partnerships or farmers; for an unclear legal form the person confirms it is a company)"],
      ["Tiekėjo pavadinimas, šalis, kategorija ir įrašytas kontekstas", "The supplier name, country, category and the context entered"],
      ["Rizikos lygis - tik iš nustatyto sąrašo, kitaip klaida; sakiniai su teisės aktų numeriais ar teiginiu, kad tiekėjas yra sąraše, pašalinami ir suskaičiuojami", "The risk level - only known values, otherwise an error; sentences with legal act numbers or claims that the supplier is on a list are removed and counted"],
      ["Rodoma su žyma „DI atsakymas“ ir pastaba, kad DI sąrašų netikrino; DI siūlomas rizikos lygis prie patikros išsaugomas tik su asmens sprendimu „Pritariu“ ar „Nepritariu“; patikros rezultatą renkasi ir įrašo pats", "Shown as an AI response with a note that AI did not check the lists; the risk level suggested by AI is saved with the check only with the person's decision to agree or disagree; the person chooses and records the check result"],
      "/api/esg/sanctions-assessment"),
    /* ---- G-Procure Tiekėjams ---- */
    f("pp-tiekejams.atsakymas", "pp-tiekejams", "L1", "pp-tiekejams.atsakymas",
      ["Atsakymas į tiekėjo klausimą pagal pirkimo dokumentus", "Answer to a supplier's question from the procurement documents"],
      ["Paspaudus „Klausti“", "On clicking the ask button"],
      ["Klausimas, iki 14 dokumentų fragmentų ir pirkimo duomenys (pavadinimas, vykdytojas ir taikomas įstatymas, CVP IS būsena ir terminas)", "The question, up to 14 document fragments and procurement data (title, contracting body and regime, CVP IS status and deadline)"],
      ["Kiekviena citata turi atitikti fragmentą - kitaip atmetama; be patikrinto šaltinio - „nėra šaltinio“; jei atsakymas nutrūko, apie tai pranešama", "Each quote must match its fragment - otherwise it is dropped; without a verified source - no source; truncated - reported"],
      ["Atsakymas pažymėtas „Parengta naudojant DI“; tai ne teisinė konsultacija - sprendžia tiekėjas", "The answer is marked as prepared using AI; it is not legal advice - the supplier decides"]),
    f("pp-tiekejams.kontrolinis", "pp-tiekejams", "L1", "pp-tiekejams.kontrolinis",
      ["Kontrolinio sąrašo punktai, kurių neužpildė taisyklės", "Checklist items not filled by the rules"],
      ["Paspaudus „Įvertinti likusius punktus su DI“", "On clicking the button that assesses the remaining items with AI"],
      ["Tik tiems punktams parinkti dokumentų fragmentai ir pirkimo duomenys", "Only the document fragments chosen for those items and the procurement data"],
      ["Būsena „privaloma“, „su sąlyga“ ar „netaikoma“ - tik su patikrinta citata, kitaip „patikslinti“; neperskaitomas atsakymas - klaida", "A status of required, conditional or not applicable - only with a verified quote, otherwise to be clarified; an unreadable response - an error"],
      ["Punktai su DI žyma tik rodomi", "Items with an AI mark are only shown"]),
    /* ---- Pirkimų teisės stebėsena ---- */
    f("pp-teise.juodrastis", "pp-teise", "L1", "pp-teise.juodrastis",
      ["Registro įrašo santraukos juodraštis", "Draft summary of a register entry"],
      ["Paspaudus „Parengti DI juodraštį“ (registro prižiūrėtojui)", "On clicking the button that prepares an AI draft (for the register maintainer)"],
      ["Įklijuota oficialaus šaltinio ištrauka (iki 20 000 ženklų)", "The pasted extract from the official source (up to 20,000 characters)"],
      ["Atsakymas turi būti nustatytos sandaros (JSON); imami tik santraukos, pokyčio ir veiksmo tekstai", "The response must be JSON; only the summary, change and action texts are used"],
      ["Pažymima „DI juodraštis, nepatvirtinta“, būsena - „laukia“; įrašą išsaugo ir tvirtina prižiūrėtojas", "Marked as an AI draft, not approved, status - pending; the maintainer saves and approves the entry"])
  ];

  function kal(k) { return k === "en" ? "en" : "lt"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function irankis(id) { for (var i = 0; i < IRANKIAI.length; i++) if (IRANKIAI[i].id === id) return IRANKIAI[i]; return null; }
  function irankiui(id) { return FUNKCIJOS.filter(function (f) { return f.irankis === id; }); }
  function skaiciai() {
    var o = { viso: FUNKCIJOS.length, irankiu: 0 };
    Object.keys(LYGIAI).forEach(function (l) { o[l] = 0; });
    FUNKCIJOS.forEach(function (f) { o[f.lygis]++; });
    o.irankiu = IRANKIAI.filter(function (t) { return irankiui(t.id).length; }).length;
    return o;
  }
  /* Lietuviška daugiskaita: 1 funkcija, 2-9 funkcijos, 10-20 funkcijų, 21 funkcija ... */
  function linksnis(n, v1, v2, v3) { var d = n % 10, s = n % 100; return d === 1 && s !== 11 ? v1 : d >= 2 && d <= 9 && (s < 12 || s > 19) ? v2 : v3; }
  function funkcijuSk(n, k) { return k === "en" ? n + (n === 1 ? " function" : " functions") : n + " " + linksnis(n, "funkcija", "funkcijos", "funkcijų"); }
  function lygisTekstas(l, k) { return l + " · " + (LYGIAI[l] ? LYGIAI[l][kal(k)] : ""); }

  var T = {
    lt: { kada: "Kada siunčiama", siunciama: "Kas siunčiama", patikros: "Ką programa patikrina", zmogus: "Kaip patvirtina žmogus",
      viso: "DI funkcijų", irankiu: "įrankių su DI", be: "DI nenaudojantys įrankiai (tik taisyklės, L0):",
      beTikslas: "Įrankis „{t}“ DI nenaudoja - jo skaičiavimai ir patikros atliekami pagal taisykles be DI (L0).", tikslas: "Rodomos įrankio „{t}“ DI funkcijos." },
    en: { kada: "When it is sent", siunciama: "What is sent", patikros: "What the program checks", zmogus: "How a person approves",
      viso: "AI functions", irankiu: "tools using AI", be: "Do not use AI (rules only, L0):",
      beTikslas: "The tool “{t}” does not use AI - its calculations and checks are rules without AI (L0).", tikslas: "Showing the AI functions of the tool “{t}”." }
  };

  /* Sąrašas į el. o: { kalba, irankis (moduleId - atveriamas ir pažymimas; DI nenaudojančiam - pastaba) }. */
  function mount(el, o) {
    if (!el) return;
    o = o || {};
    var k = kal(o.kalba), t = T[k], sk = skaiciai(), tik = o.irankis ? irankis(o.irankis) : null, h = "";
    var lyg = SIANDIEN.map(function (l) { return lygisTekstas(l, k) + ": " + sk[l]; }).join(" · ");
    if (tik) h += '<p class="dif-tikslas" role="status">' + esc((tik.be ? t.beTikslas : t.tikslas).replace("{t}", tik[k])) + "</p>";
    h += '<p class="dif-viso">' + esc(t.viso + ": " + sk.viso + ", " + t.irankiu + ": " + sk.irankiu + " · " + lyg) + "</p>";
    IRANKIAI.forEach(function (ir) {
      var fs = irankiui(ir.id);
      if (!fs.length) return;
      var lygiai = SIANDIEN.filter(function (l) { return fs.some(function (f) { return f.lygis === l; }); });
      var atv = tik && tik.id === ir.id;
      h += '<details class="dif' + (atv ? " dif--tikslas" : "") + '" id="dif-' + k + "-" + esc(ir.id) + '"' + (atv ? " open" : "") + ">" +
        '<summary><span class="dif__pav">' + esc(ir[k]) + '</span> <span class="dif__sk">' + esc(funkcijuSk(fs.length, k) + " · " + lygiai.join(", ")) + "</span></summary>";
      fs.forEach(function (f) {
        h += '<div class="dif-f" data-funkcija="' + esc(f.id) + '"><h4><span class="dif-f__pav">' + esc(f.pav[k]) + '</span> <span class="lyg lyg--' + f.lygis.toLowerCase() + '">' + esc(lygisTekstas(f.lygis, k)) + "</span></h4><dl>" +
          ["kada", "siunciama", "patikros", "zmogus"].map(function (r) { return "<div><dt>" + esc(t[r]) + "</dt><dd>" + esc(f[r][k]) + "</dd></div>"; }).join("") + "</dl></div>";
      });
      h += "</details>";
    });
    var be = IRANKIAI.filter(function (ir) { return ir.be; });
    h += '<p class="dif-be">' + esc(t.be) + " " + be.map(function (ir) { return '<span id="dif-' + k + "-" + esc(ir.id) + '"' + (tik && tik.id === ir.id ? ' class="dif--tikslas"' : "") + ">" + esc(ir[k]) + "</span>"; }).join(", ") + ".</p>";
    el.innerHTML = h;
    var kont = el.closest ? el.closest("[data-kalba]") : null;
    if (tik && !(kont && kont.hidden)) {
      var x = el.querySelector(".dif--tikslas");
      if (x && x.scrollIntoView) x.scrollIntoView({ block: "start" });
    }
  }

  global.GP_DI_FUNKCIJOS = { versija: "1.0", LYGIAI: LYGIAI, SIANDIEN: SIANDIEN, IRANKIAI: IRANKIAI, FUNKCIJOS: FUNKCIJOS,
    irankis: irankis, irankiui: irankiui, skaiciai: skaiciai, funkcijuSk: funkcijuSk, lygisTekstas: lygisTekstas, mount: mount };
})(typeof window !== "undefined" ? window : this);
