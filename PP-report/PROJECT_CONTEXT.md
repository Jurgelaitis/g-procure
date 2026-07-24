# PROJECT_CONTEXT.md

**Projekto pavadinimas:** LITGRID mažos vertės pirkimų pažymos rengimo įrankis (PP-report.html)
**Pagrindinis failas:** `PP-report.html` (vienas savarankiškas HTML failas)
**Versija:** 2026-06-11
**Autorius / užsakovas:** Arūnas (Pirkimų vadovas, LITGRID AB)
**Platforma:** Bet kuri moderni naršyklė (Chrome, Edge, Firefox, Safari) - be jokio backend ar instaliacijos

---

## 1. Projekto vizija

Sukurti vieną savarankišką, lengvai platinamą HTML įrankį, kuris radikaliai sumažintų laiką, reikalingą paruošti tinkamai suformatuotas LITGRID AB mažos vertės pirkimų pažymas ir su jomis susijusius pranešimus tiekėjams. Įrankis turi būti naudojamas LITGRID Pirkimų organizatorių ir iniciatorių, jį turi galėti pildyti darbuotojas be techninių žinių, o sugeneruoti dokumentai turi atitikti vidaus tvarkos aprašą ir Lietuvos Respublikos pirkimų įstatymo (PSĮ) reikalavimus.

Įrankis skirtas pakeisti šiuo metu naudojamą procesą, kai pažymos pildomos Word šablonuose ranka - su rizika, kad bus padaryta klaidų formatavime, citavimuose, sumų skaičiavime ar trūks privalomų pranešimų tiekėjams.

---

## 2. Kodėl projektas buvo sukurtas

LITGRID kasdienėje pirkimų veikloje per metus yra parengiama šimtai mažos vertės pirkimų pažymų. Dabartinis procesas reikalauja:

1. Atidaryti Word šabloną.
2. Rankiniu būdu užpildyti dešimtis laukų (data, numeris, vertė, PVM, tiekėjų sąrašai, vertinimas).
3. Atskirai paruošti pranešimus laimėtojui ir nelaimėjusiems tiekėjams.
4. Užtikrinti, kad tarp pažymos ir pranešimų sumos, citavimas (LITGRID MV aprašo punktas, ne PSĮ 68 str.) ir tiekėjų pavadinimai sutaptų.

Klaidų rizika didelė: nesutampa sumos, klaidingai cituojamas teisės aktas, pamirštama išsiųsti pranešimą, sumos formatuojamos skirtingai (pvz., 34000.25 vs 34 000,25 Eur). Įrankio tikslas - automatizuoti šį procesą, vienu paspaudimu sugeneruoti pažymą + visus pranešimus su garantija, kad duomenys sutampa.

---

## 3. Kokias problemas sprendžia

Konkrečios procesinės problemos, kurios buvo identifikuotos rengiant įrankį, ir kaip jos sprendžiamos:

- **Eur formatas.** Skirtinguose dokumentuose sumos buvo užrašomos nenuosekliai (8000, 8000.00, 8.000,00). Įrankyje visi išvedimai naudoja oficialų Lt formatą `34 000,25 Eur` (tarpas tūkstančiams, kablelis dešimtainei daliai).
- **PVM skaičiavimas.** Naudotojas dažnai įvesdavo tik vieną vertę ir suklysdavo apskaičiuodamas kitą. Įrankis abi vertes (be PVM / su PVM) skaičiuoja automatiškai pagal LT 21% tarifą.
- **Teisinis pagrindas.** Pranešimuose buvo neteisingai cituojamas PSĮ 68 str. (taikomas formaliems pirkimams, ne MV). Įrankis automatiškai įstato LITGRID Mažos vertės pirkimų vykdymo tvarkos aprašo 30.20 p. (skelbiama apklausa) arba 31.9 p. (neskelbiama apklausa).
- **Pasirašantis asmuo.** Pranešimuose ankščiau buvo nurodomas Grupės vadovas; teisingai turi būti Pirkimo organizatorius. Įrankis tai daro automatiškai.
- **Tiekėjų suderinimas.** Pirminių ir galutinių pasiūlymų lentelėse tiekėjų sąrašai turi sutapti. Įrankis automatiškai sinchronizuoja galutinius su pirminiais per `data-linked-id` mechanizmą.
- **Pirkimo skaidymas į dalis.** Sudėtingiausias atvejis - kai pirkimas skaidomas į kelias objekto dalis. Anksčiau visi pasiūlymai būdavo vienoje lentelėje ir reikėjo žodžiais paaiškinti, kuri eilutė kuriai daliai priklauso. Įrankis automatiškai grupuoja UI ir Word dokumentą į atskirus sub-blokus kiekvienai daliai (pirminiai, galutiniai, kvalifikacija, sutarties kaina, sprendimai, pranešimai).
- **Sutarties kaina.** Buvo įprasta įvesti rankiniu būdu, dažnai netiksliai. Įrankis automatiškai paima pigiausio „Atitinka" pasiūlymą.
- **Sprendimai (6 sekcija).** Buvo tipinis šabloninis tekstas. Įrankis generuoja sprendimus pagal scenarijų (Sudaroma sutartis / Vienas tiekėjas / Atmesta / Negauta / Nutraukta) ir įstato konkrečius tiekėjų pavadinimus.
- **Pranešimai tiekėjams.** Buvo rengiami atskirai. Įrankis generuoja juos kartu su pažyma vienu ZIP archyvu, automatiškai parinkdamas pranešimo tipą (winner / lost_atitinka / rejected / all_rejected / terminated) pagal tiekėjo vertinimą.

---

## 4. Kokios funkcijos jau veikia

### 4.1 Formos
- **1 priedas (Iniciatoriaus forma)** - pirkimams 5 000–15 000 Eur be PVM.
- **2 priedas (Organizatoriaus forma)** - pirkimams virš 15 000 Eur be PVM.
- Automatinis priminimas, jei pasirinkta neteisinga forma pagal įvestą vertę.
- Iki 5 000 Eur - pažymos nerengiamos (pranešama naudotojui).

### 4.2 Sekcijos (visiems pirkimams)
1. Pirkimo objekto informacija (pavadinimas, vertė, dalys, CPO).
2. Iniciatorius / Organizatorius (kontaktiniai duomenys).
3. Pirkimo procedūrų reglamentavimas (pirkimo būdas, kriterijus, derybos, kvalifikacija).
4. Pirkimo procedūrų eiga (pirminiai pasiūlymai, derybos, galutiniai pasiūlymai, nacionalinis saugumas - tik 1 priedas, galimo laimėtojo kvalifikacija - tik 2 priedas).
5. Kita informacija.
6. Sprendimai (5 scenarijai).
7. Sutarties nuostatos (kaina, sudarymo būdas, apmokėjimas).
8. Priedai.

### 4.3 Pirkimo skaidymas į objekto dalis (2 priedo forma)
Kai pasirenkamas `Skaidomas į dalis`, atsiranda dinaminė dalių lentelė. Po jos:
- Realiu laiku skaičiuojama dalių verčių suma ir lyginama su bendra pirkimo verte (žalia patvirtinimo žinutė arba raudonas įspėjimas su skirtumu, tolerancija ±0,02 Eur).
- Visi pasiūlymai grupuojami į atskirus sub-blokus kiekvienai daliai:
  - Pirminių pasiūlymų sub-lentelės (po vieną kiekvienai daliai);
  - Galutinių pasiūlymų sub-lentelės (po vieną kiekvienai daliai);
  - Galimo laimėtojo kvalifikacijos vertinimo sub-blokai (po vieną kiekvienai daliai, su auto-fill iš galutinių);
  - Sutarties kainos sub-blokai (po vieną kiekvienai daliai);
  - Pranešimai tiekėjams generuojami atskirai (tiekėjas × dalis).

### 4.4 Auto-fill
- PVM (21%) automatinis skaičiavimas tarp `be PVM` ↔ `su PVM` laukų (top-level, lentelių eilutės, dalių lentelės).
- Pirkimo būdo → Aprašo punktas mapping.
- Galutinių pasiūlymų tiekėjai automatiškai perimami iš pirminių (per `data-linked-id`). Kai keičiasi pirminis tiekėjas - atnaujinamas ir galutinis. Kai keičiasi dalys - galutiniai perkeliami į teisingą sub-lentelę.
- `Nepateikė galutinio pasiūlymo` žymėjimas → pirminio kainos + vertinimas automatiškai perimami į galutinę eilutę.
- `Galimas laimėtojas` + kvalifikacijos tiekėjas automatiškai užpildomi pigiausio „Atitinka" tiekėjo vardu (per dalis, kai skaidoma).
- Pasiūlymų eilė generuojama iš „Atitinka" pasiūlymų pagal kainą didėjančia tvarka. Skaidymo atveju - grupuojama pagal dalis.
- `Sutarties kaina` (be / su PVM) auto-fill iš pigiausio „Atitinka" pasiūlymo, kai pažymėtas radio „Lygi laimėjusio pasiūlymo kainai".

### 4.5 Eur formatas
Visi išvedimai (Word, spausdinimo peržiūra, sprendimai, pasiūlymų eilė, pranešimai) naudoja oficialų LT formatą: `34 000,25 Eur` (per `lt-LT` lokalę).

### 4.6 Word dokumento generavimas
- Vienas mygtukas - sugeneruoja pilną pažymą + visus pranešimus tiekėjams vienu ZIP archyvu.
- LITGRID logotipas Word dokumento header'yje (base64-embedded PNG, teisingos proporcijos 70×104 px).
- Antraštė: „TIEKĖJŲ APKLAUSOS PAŽYMA" + data + Nr. + miestas.
- Pilna lentelė su 8 sekcijomis ir visomis sub-lentelėmis.
- Skaidymo atveju - atskiros lentelių grupės kiekvienai daliai su antrašte „1 dalis. [pavadinimas]".

### 4.7 Pranešimai tiekėjams (ZIP)
- 5 pranešimo tipai: `winner`, `lost_atitinka`, `rejected`, `all_rejected`, `terminated`.
- Failo pavadinimas: `Pranesimas_[tiekejas]_[type].docx` arba `Pranesimas_[tiekejas]_[dalis]_[type].docx` skaidymo atveju.
- Teisinis pagrindas: Aprašo 30.20 arba 31.9 p. (priklausomai nuo pirkimo būdo).
- Parašas: Pirkimo organizatorius (2 priedas) arba Iniciatorius (1 priedas).
- Skaidymo atveju - pranešime aiškiai įvardijama, kuriai pirkimo objekto daliai pasiūlymas yra pateiktas; pasiūlymų eilė pranešime apima tik tos dalies tiekėjus; sutarties kaina pranešime - tos dalies kaina.

### 4.8 Juodraščiai (localStorage)
- Pildomi duomenys automatiškai išsaugomi naršyklėje per `localStorage`.
- Galima išsaugoti kelis juodraščius vienu metu, juos atidaryti, ištrinti.
- Juodraščio struktūra: `fields` (top-level laukai) + `radios` + `rows` (lentelių eilutės) + `perDalis` (per-dalis kvalifikacijos / sutarties kainos).

### 4.9 Spausdinimo peržiūra
- Atvaizduoja sugeneruotą pažymą HTML formatu prieš generuojant Word dokumentą.
- Naudojama greitam vizualiniam patikrinimui.

### 4.10 EPSO-G dizainas
- Nunito Sans šriftas (Google Fonts).
- Smaragdas (#00A072) - pagrindinė akcento spalva.
- Grafitas (#2E3641) - pagrindinis tekstas.
- Subtilūs šviesūs žalsvi fonai dalims.
- 8 px tarpų sistema.
- Apvalūs kampai (8–12 px).

---

## 5. Kokios funkcijos planuojamos

Toliau išvardytos funkcijos, kurios buvo identifikuotos kaip naudingos, bet šios versijos nepalaikomos. Tai natūralus tęstinis darbas naujoje paskyroje.

### 5.1 Aukšto prioriteto (rekomenduojama įgyvendinti pirmiausia)
- **Įkelti / redaguoti egzistuojantį Word**. Šiuo metu įrankis tik generuoja Word, bet jo negali įkelti atgal redagavimui. Reikėtų importerio, kuris perskaitytų sugeneruotą .docx ir grąžintų formos laukus.
- **PDF generavimas** (papildomai prie .docx). Daugelis pažymų archyvuojama PDF formatu, todėl būtų patogu turėti abu variantus.
- **Pranešimų peržiūra prieš atsisiuntimą**. Šiuo metu generuojami ir nedelsiant suspaudžiami į ZIP. Naudinga būtų matyti pranešimų sąrašą su galimybe pažymėti, kuriuos generuoti.
- **Spausdinimo peržiūros panaikinimas / atnaujinimas**. Skaidymo atveju spausdinimo peržiūra dar tobulintina, kad geriau atitiktų galutinį Word dokumentą.

### 5.2 Vidutinio prioriteto
- **Pranešimų el. paštu siuntimas tiesiogiai iš naršyklės** (per `mailto:` arba per integraciją su Outlook / M365).
- **CPO katalogas** - automatinis pirkimo objekto pažymėjimas pagal pasirinktą produktą.
- **CVP IS integracija** - automatinis CVP IS pirkimo numerio užpildymas iš LITGRID centrinės sistemos.
- **Pagal naudotojo profilį užpildyti iniciatoriaus / organizatoriaus laukus**. Šiuo metu jie pildomi rankomis kiekvienam pirkimui.
- **Šablonų valdymas** - galimybė išsaugoti dažnai naudojamą pirkimo struktūrą kaip šabloną (pvz., „Programinė įranga", „Konsultacijos") ir paleisti naują pažymą iš jo.
- **Eksportas / importas JSON**. Šiuo metu juodraščiai gyvena tik viename naršyklės profilyje. JSON eksportas / importas leistų perkelti pažymą tarp kompiuterių arba dalintis su kolegomis.

### 5.3 Žemo prioriteto / būsimas atnaujinimas
- **Daugiakalbis interfeisas** (EN / LT). Šiuo metu tik LT.
- **Mobile / planšetė** - nors įrankis veikia ir mažuose ekranuose, sub-lentelės skaidymo atveju gali būti per platos.
- **Audit log** - kas, kada, kokius duomenis pakeitė. Šiuo metu tik `timestamp` juodraštyje.
- **Backend** - šiuo metu viskas client-side. Backend leistų matyti komandos darbą realiu laiku, statistiką, archyvavimą serveryje. Bet tai radikalus pakeitimas.
- **Aprašo punktų atnaujinimas** - jei LITGRID tvarkos aprašas pasikeičia, dabar reikia rankomis pataisyti `APRASO_29_PUNKTAI` masyvą.
- **Integracija su LITGRID dokumentų valdymo sistema** (jei tokia yra).

---

## 6. Technologiniai sprendimai ir jų priežastys

### 6.1 Vienas HTML failas
**Sprendimas:** visi HTML, CSS ir JavaScript yra viename `.html` faile.

**Priežastys:**
- Lengva platinti - vienas failas, kurį galima išsiųsti el. paštu, įdėti į SharePoint, atsidaryti naršyklėje be jokios instaliacijos.
- Nereikia backend infrastruktūros.
- Vartotojas (Pirkimų darbuotojas) gauna „prie rankos" įrankį be IT departamento įsikišimo.
- Lengva versijuoti - pakeitus failą, naujesnė versija paskirstoma kaip atnaujintas failas.

**Trūkumai:** failas ~210 KB (su embedded logo), bet tai vis tiek mažiau už dauguma šiuolaikinių SPA aplikacijų.

### 6.2 docx.js v8.5.0 (UMD build)
**Sprendimas:** Word dokumentai generuojami client-side per `docx` JS biblioteką.

**Priežastys:**
- Aktyviai palaikoma, palaiko visus reikalingus elementus (lentelės, antraštės, paragraphai, header, images).
- Nereikia serverio.
- UMD build veikia tiesiogiai naršyklėje be webpack/bundler.

**Trūkumai:** biblioteka ~700 KB, atsisiunčiama iš CDN - reikalingas interneto ryšys pirmą kartą.

### 6.3 JSZip v3.10.1
**Sprendimas:** ZIP archyvavimas (pažyma + N pranešimų) client-side.

**Priežastys:** maža, patikima, palaiko binary content (Word failai).

### 6.4 FileSaver.js v2.0.5
**Sprendimas:** Failo atsisiuntimas iš naršyklės.

**Priežastys:** standartizuoja `Save File` veikimą per visas naršykles. Maža (~3 KB).

### 6.5 CDN su fallback grandine
**Sprendimas:** Bibliotekos kraunamos iš trijų CDN: unpkg → jsdelivr → cdnjs. Jei pirma nepavyksta, automatiškai bandoma antra ir trečia.

**Priežastys:** įmonės užkardos kartais blokuoja vieną iš CDN. Trys variantai padidina patikimumą.

**Apribojimas:** be interneto biblioteka nepasikraus. Galimas patobulinimas - embed visas bibliotekas tiesiai į HTML failą (failas tampa ~2 MB, bet veikia offline).

### 6.6 localStorage juodraščiams
**Sprendimas:** Juodraščiai saugomi naršyklėje per `localStorage`.

**Priežastys:**
- Nereikia backend.
- Veikia offline.
- Greita.

**Apribojimai:**
- Juodraščiai gyvena tik konkrečioje naršyklėje, konkrečiame profilyje. Negalima sinchronizuoti tarp įrenginių.
- Naršyklės valymas (cache) gali ištrinti juodraščius.
- Limitas ~5–10 MB priklausomai nuo naršyklės - to daugiau nei pakanka pažymoms.

### 6.7 EPSO-G dizaino sistema
**Sprendimas:** Stilius paremtas EPSO-G grupės brandbook'u - Smaragdas (#00A072), Grafitas (#2E3641), Nunito Sans, 8 px tarpų sistema, apvalūs kampai.

**Priežastys:** įrankis turi atrodyti kaip natūrali LITGRID darbo aplinkos dalis, ne kaip atskira aplikacija. Visi sub-blokai naudoja šviesų žalsvą foną (`--color-green-5`), kad vizualiai išskirtų dalių grupes.

### 6.8 Base64-embedded logotipas
**Sprendimas:** LITGRID PNG logotipas (200×298 px, ~42 KB) įdedamas tiesiai į HTML kaip base64 string.

**Priežastys:** Vienas failas (žr. 6.1). Word dokumento header'is naudoja tą patį base64 → Uint8Array → ImageRun. Proporcijos išlaikytos (70×104 px).

### 6.9 `data-linked-id` mechanizmas
**Sprendimas:** Kiekviena pirminio pasiūlymo eilutė turi unikalų `data-id`. Galutinio pasiūlymo eilutė turi `data-linked-id`, kuris nurodo, su kuria pirmine eilute ji susijusi.

**Priežastys:** Anksčiau galutiniai pasiūlymai būdavo siejami pagal tiekėjo pavadinimą - tai sukeldavo dublikatus, kai naudotojas pakeisdavo tiekėjo pavadinimą. ID-based susiejimas garantuoja, kad redagavimas neduplikuoja eilučių, ir „Nepateikė galutinio" žymėjimas teisingai surenda susijusią pirminę eilutę net sub-lentelių režime.

### 6.10 Class-based selektoriai sub-lentelėms
**Sprendimas:** Visos pirminių pasiūlymų lentelės turi klasę `.pasiulymu-tbody`, visos galutinių - `.galutiniai-tbody`. Vienetinė lentelė (kai neskaidoma) turi tą pačią klasę PLUS `id`.

**Priežastys:** `gatherFormData` ir auto-fill funkcijos veikia tiek vienetinėje, tiek sub-lentelių režime per `document.querySelectorAll('.pasiulymu-tbody')`. Tai supaprastina kodą - nereikia rašyti dviejų versijų.

### 6.11 `perDalis` duomenų struktūra
**Sprendimas:** Be `fields`, `radios` ir `rows`, įrankis turi `perDalis` objektą: `{ "Bandymo paslaugos LT": { galimasLaimetojas, kvalifTiekejas, kvalifVertinimas, kitiVertinimas, kvalifPastabos, sutartiesBePvm, sutartiesSuPvm }, ... }`.

**Priežastys:** Per-dalis laukų (kvalifikacija, sutarties kaina) data-field pavadinimai naudoja suffiksą `__dalisKey` (pvz., `sutartiesBePvm__Bandymo_paslaugos_LT`). `gatherFormData` automatiškai juos suskelia ir sukelia į `perDalis` objektą pagal `data-dalis` atributą. Tai padaro Word generavimą ir pranešimų generavimą paprastesnį - žinome, kur ieškoti per-dalis duomenų.

---

## 7. Žinomi apribojimai

1. **Reikia interneto ryšio.** CDN bibliotekos (docx, JSZip, FileSaver, Nunito Sans) kraunamos iš išorinių serverių. Pirmą kartą reikalingas interneto ryšys; tolesni kartai gali veikti iš naršyklės cache.

2. **Vieno naudotojo įrankis.** Nėra realaus laiko bendradarbiavimo. Du naudotojai negali tuo pačiu metu redaguoti tos pačios pažymos.

3. **Juodraščiai gyvena tik vienoje naršyklėje.** Jei naudotojas dirba dviem kompiuteriais, juodraščiai nepersikelia.

4. **Įrankis nepalaiko egzistuojančios pažymos atidarymo.** Sugeneruotą Word galima atidaryti Word'e, bet ne atgal įkelti į įrankį redagavimui.

5. **Tik LT kalba.**

6. **Aprašo punktai įstatyti į kodą.** Jei LITGRID tvarkos aprašas keičiasi, reikia atnaujinti `APRASO_29_PUNKTAI` masyvą HTML faile.

7. **Logotipas embed'intas.** Jei logotipas keičiasi, reikia perkurti base64 string ir perrašyti `LITGRID_LOGO_BASE64` konstantą HTML faile.

8. **Pirkimo skaidymas tik 2 priedo formoje.** 1 priedo forma (5 000–15 000 Eur) skaidymo nepalaiko, nes Iniciatorių pažymos paprastai apima nedidelius nesudėtingus pirkimus.

9. **Nepilnas Word stilių palaikymas.** docx.js nepalaiko absoliučiai visų MS Word formatavimo galimybių (pvz., kai kurių tab stop, sudėtingų shading, vertical text). Žinomos lentelių sub-table nuance reikalauja, kad TableCell baigtųsi paragraph'u - tai jau išspręsta `cell()` helper'yje.

10. **Pasiūlymų eilė skaičiuoja tik pagal kainą.** Jei ateityje LITGRID įvestų vertinimo formulę (kaina + kokybė), reikės pertvarkyti `_collectOffersForAuto` ir `autoFillSprendimai`.

11. **Datų formatas.** Įvedimas - HTML date input (priklauso nuo naršyklės kalbos), išvedimas Word'e - „YYYY m. mėnesio_pavadinimas D d." formatu per `formatDocDate` funkciją. Jei reikalingas kitas formatas, pataisyti `formatDocDate`.

12. **Dalių pavadinimų pakeitimas.** Jei naudotojas pervadina dalį po to, kai jau įvedė pasiūlymus, sub-lentelės gali atsidurti netinkamame kontekste. Sprendžiama tuo, kad restruktūrizavimo metu pirminiai/galutiniai pasiūlymai su nežinoma dalimi nukreipiami į pirmą egzistuojančią dalį (kaip fallback).

---

## 8. Pagrindiniai techniniai mazgai (žemėlapis)

Tai pagrindinė informacija reikalinga sklandžiai tęsti darbus.

### Failo struktūra (PP-report.html)
```
<head>
  CSS kintamieji ir stiliai (EPSO-G dizainas)
</head>
<body>
  Formos pasirinkimas (1 priedas / 2 priedas)
  <main id="form-container"> - dinamiškai užpildoma per renderForm()
  Modaliniai langai (juodraščiai, peržiūra)
  <script>
    Visa logika
  </script>
</body>
```

### Pagrindinės funkcijos
| Funkcija | Paskirtis |
|---|---|
| `selectForm(num)` | Perjungia 1 / 2 priedą, perpiešia formą |
| `renderForm(formNum)` | Sukuria visą HTML struktūrą |
| `renderSection1..8` | Atskirų sekcijų HTML |
| `gatherFormData()` | Surenka visus duomenis į `data` objektą |
| `loadFormData(data)` | Įkelia duomenis atgal į formą |
| `onDalisChange()` | Centrinis kvietėjas, kai keičiasi dalys |
| `restructureOfferTables()` | Pertvarko pirminių/galutinių UI tarp vienetinės ir sub-lentelių režimo |
| `restructureKvalifBlock()` | Tas pats kvalifikacijos blokui |
| `restructureSutartiesBlock()` | Tas pats sutarties kainoms |
| `addPasiulymasRow(forDalis?)` | Prideda pirminio pasiūlymo eilutę |
| `addGalutinisRow(forDalis?)` | Prideda galutinio pasiūlymo eilutę |
| `syncGalutiniaiFromPasiulymai()` | Sinchronizuoja galutinius su pirminiais per `data-linked-id` |
| `toggleNepateikGalutinio(cb)` | Perima kainas iš susijusios pirminio eilutės |
| `autoFillSprendimai()` | Užpildo Sprendimų sekcijos laukus |
| `autoFillGalimasLaimetojas()` | Užpildo Galimas laimėtojas + kvalif tiekėjas (per dalis) |
| `autoFillSutartiesKaina()` | Užpildo Sutarties kainą (per dalis) |
| `validateDalysVerte()` | Lygina dalių sumas su bendra verte |
| `generateSprendimai(data)` | Sugeneruoja sprendimų teksto sąrašą |
| `generateNotificationList(data)` | Sugeneruoja pranešimų sąrašą su filenamais |
| `buildNotificationParagraphs(data, notif)` | Vieno pranešimo turinys (paragraphai) |
| `buildDocx(data)` | Sukuria pažymos Word + ZIP su pranešimais |
| `buildPasiulymaiLentele / buildGalutiniaiLentele / buildNatSaugLentele` | Helper'iai Word lentelėms |
| `cell(content, opts)` | Helper'is TableCell sukūrimui (palaiko nested Table) |
| `par(children, opts)`, `txt(text, opts)` | Helper'iai docx Paragraph/TextRun sukūrimui |
| `formatEur(value)` / `formatEurNum(value)` | LT Eur formatavimas |
| `calcPvm(input)` | PVM auto-skaičiavimas |
| `saveDraft() / loadDraft() / deleteDraft() / openDraftsList()` | localStorage juodraščiai |

### Duomenų struktūra (`data` objektas iš `gatherFormData`)
```js
{
  formNum: 1 | 2,
  timestamp: ISO string,
  fields: { /* top-level laukai - data-field: value */ },
  radios: { /* radio name: selected value */ },
  rows: {
    pasiulymai: [{ tiekejas, kainaBePvm, kainaSuPvm, pasiulVert, kitiVert?, neatitikimas, dalis }],
    galutiniai: [{ tiekejas, nepateikGalutinio, galKainaBePvm, galKainaSuPvm, galVert, galNeatitikimas, dalis }],
    natSaug: [{ natTiekejas, natDok, natRiziking, natPastabos }], // tik 1 priedas
    dalys: [{ dalisPav, dalisBePvm, dalisSuPvm }]                  // tik 2 priedas + skaidoma
  },
  perDalis: {
    "Bandymo paslaugos LT": {
      galimasLaimetojas,
      kvalifTiekejas, kvalifVertinimas, kitiVertinimas, kvalifPastabos,
      sutartiesBePvm, sutartiesSuPvm
    },
    ...
  }
}
```

### Bibliotekų versijos
- `docx@8.5.0` (UMD)
- `jszip@3.10.1`
- `file-saver@2.0.5`
- `Nunito Sans` (Google Fonts, weights 300/400/600/700/800)

### Konstantos
- `LITGRID_LOGO_BASE64` - embedded PNG logotipas
- `APRASO_29_PUNKTAI` - pirkimo būdo → Aprašo punkto mapping
- `PVM_TARIFAS = 0.21` - LT VAT
- `DRAFTS_KEY = 'litgrid_pirkimo_drafts'` - localStorage raktas

---

## 9. Prioritetų sąrašas tęsiant darbus

Tai mūsų rekomenduojama eilė tolesniems darbams. Eiliškumas grindžiamas naudos / sudėtingumo santykiu ir LITGRID realiomis darbinėmis problemomis.

### P0 - Būtini prieš naudojimą platesnėje grupėje
1. **Pilnas End-to-End testas su realiomis LITGRID pažymomis** (3–5 skirtingi atvejai: nedidelis nesudėtingas pirkimas, derybinis, skaidomas, atmesti visi, nutrauktas).
2. **Naudotojo dokumentacija** (trumpa naudojimo instrukcija LITGRID Pirkimų skyriui).
3. **Suderinimas su LITGRID Pirkimų tvarkos aprašo eigos punktais** - patikrinti, ar `APRASO_29_PUNKTAI` masyvas pilnas ir teisingas.
4. **Patikrinimas su LITGRID juristu**, ar pranešimų formuluotės atitinka įstatymo reikalavimus visiems 5 scenarijams.

### P1 - Pirmieji funkciniai patobulinimai
5. **JSON eksportas / importas** juodraščiams (perkėlimas tarp kompiuterių, dalijimasis su kolega).
6. **Pranešimų peržiūra prieš generavimą** - naudotojas mato sąrašą su galimybe pažymėti, kuriuos generuoti.
7. **Pakartotinis pranešimų peržiūrinis Word** (tiems atvejams, kai pažyma jau sugeneruota, bet reikia pakeisti tik pranešimą).
8. **PDF generavimas** (papildomai prie .docx, naudoti `pdf-lib` ar panašų).
9. **Naudotojo profilio užpildymas** - leisti įvesti savo iniciatoriaus / organizatoriaus duomenis vieną kartą ir juos automatiškai pildyti.

### P2 - Pajėgumai
10. **Pažymų archyvo importas atgal** (.docx → formos laukai).
11. **Šablonų valdymas** - išsaugoti dažnai naudojamą pirkimo struktūrą kaip šabloną.
12. **Spausdinimo peržiūra skaidymo atveju** - patobulinti vizualinį atvaizdavimą.
13. **Patobulinta dalių pervadinimo logika** - kai naudotojas pervadina dalį, automatiškai atnaujinti susijusių sub-lentelių antraštes ir `perDalis` raktus.
14. **Klavišų trumpiniai** (Ctrl+S - išsaugoti juodraštį, Ctrl+G - generuoti Word).
15. **Pataisymai pagal LITGRID darbuotojų feedback'ą** po pirmų realaus naudojimo savaičių.

### P3 - Tolesni žingsniai
16. **Backend integracija** (jei reikia komandinio bendradarbiavimo realiu laiku).
17. **Integracija su CVP IS** (automatinis CVP IS pirkimo numerio užpildymas, automatinis pranešimo CVP IS sistemoje publikavimas).
18. **Integracija su el. paštu / Outlook** (pranešimų išsiuntimas tiekėjams iš įrankio).
19. **Audit log** ir statistika (kiek pažymų sugeneruota, vidutinis pildymo laikas, dažniausi pirkimo būdai).
20. **EN kalbos palaikymas** (jei reikia tarptautiniams tiekėjams).
21. **Mobile optimizacija** sub-lentelių režimui.

---

## 10. Greitas kontekstas pradžiai (TL;DR)

Jei naujoje paskyroje norite greitai pradėti dirbti:

1. Įkelkite `PP-report.html` ir šį `PROJECT_CONTEXT.md`.
2. Atidarykite PP-report.html naršyklėje (rekomenduojama Chrome arba Edge).
3. Pasirinkite 1 arba 2 priedo formą.
4. Užpildykite laukus, pažymėkite skaidymą jei reikia.
5. Spauskite `Generuoti Word` - gausite ZIP archyvą su pažyma + pranešimais.

Norėdami modifikuoti įrankį:
- Visa logika viename `<script>` bloke faile.
- HTML šablonai generuojami per `renderSection*` funkcijas, ne statiški.
- Pakeitimai gali būti testuojami atidarius failą naršyklėje + naudojant DevTools console.
- **Regresijos testai: `testai.html`** (48 testai). Paleidžiama naršyklėje - repo šaknyje `python3 -m http.server`, tada atidaryti `PP-report/testai.html`. Puslapis įkelia `PP-report.html` į rėmelį, atlieka realius scenarijus ir tikrina rezultatus; viršuje matosi praėjusių/kritusių skaičius, kritusiam testui rodoma, ko tikėtasi ir kas gauta. Jokių įrankių ar Node nereikia.
- Keičiant logiką testus leiskite PO KIEKVIENO žingsnio, ne pabaigoje. Pridėję naują testą, patikrinkite jį MUTACIJA (laikinai grąžinkite senąjį elgesį ir įsitikinkite, kad testas krinta) - kitaip testas gali būti visada žalias ir bevertis.
- Ankstesni jsdom skriptai (`test-dalys.js`, `test-subtables.js`, `test-nepateike.js`) pašalinti: jie tik spausdindavo būseną be jokių `assert`, tad regresijos pro juos praeidavo, o paleisti reikėjo Node, kurio darbo kompiuteryje nėra.

Jei reikia paaiškinti įrankio architektūrą Claude'ui naujoje paskyroje - perskaitykite jam šį `PROJECT_CONTEXT.md` ir nurodykite, kuriame skyriuje (4 / 5 / 7 / 9) yra konkretus klausimas.
