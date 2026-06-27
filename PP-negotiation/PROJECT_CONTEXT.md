# PROJECT CONTEXT

## Derybų pasirengimo įrankis · EPSO-G grupė

> Šis dokumentas skirtas užtikrinti darbo tęstinumą tarp pokalbių ar paskyrų.
> Įkėlus `EPSO-G_Derybu_Pasirengimo_Irankis.html` kartu su šiuo failu, AI
> asistentas galės iš karto suprasti projekto kontekstą, architektūrą ir
> tolesnio darbo prioritetus.

**Autorius:** Arūnas Jurgelaitis, Head of Procurement, AB „Litgrid"
**Sukurta:** 2026 m. birželis
**Versija:** 1.0
**Failas:** `EPSO-G_Derybu_Pasirengimo_Irankis.html` (vienas savarankiškas HTML failas, ~154 KB, ~3200 eilučių)

---

## 1. Projekto vizija

Pažangus, vidinis EPSO-G įmonių grupės darbo įrankis, kuris padeda pirkimų komandoms ir derybų komisijoms strategiškai pasirengti viešųjų pirkimų deryboms ir efektyviai jas vykdyti, remiantis objektyviais duomenimis, statistine analize ir teisėkūros (VPĮ, PĮ, VPT praktikos) reikalavimais.

Ilgalaikis tikslas: tapti standartiniu EPSO-G grupės pirkimų komandos įrankiu, palaikančiu visą derybų ciklą nuo pirminių pasiūlymų analizės iki sprendimo memorandumo komisijai.

**Kertinės vertybės:**

1. **Duomenimis pagrįsti sprendimai.** Visos rekomendacijos kyla iš statistinės pasiūlymų analizės, ne iš intuicijos.
2. **Teisinis tikslumas.** Visa logika atitinka PSĮ (Pirkimų sektorinio įstatymo) ir VPĮ reikalavimus, atsižvelgia į VPT gaires.
3. **Privatumas.** Visi duomenys lieka naudotojo naršyklėje, jokie pirkimo dokumentai ar pasiūlymai neperduodami į išorinius serverius.
4. **Praktinis naudingumas.** Įrankis turi būti naudingas tiek pirkimo iniciatoriui ruošiant technines specifikacijas, tiek komisijai vertinant pasiūlymus, tiek derybininkui sesijos metu.

---

## 2. Kodėl projektas buvo sukurtas

EPSO-G grupė (Litgrid, Amber Grid, Energy cells, EPSO-G, Baltpool, Gas Exchange ir kt.) vykdo strateginės reikšmės infrastruktūrinius pirkimus pagal vieną sudėtingiausių Lietuvos teisės sistemos pirkimų reglamentų: Pirkimų sektorinį įstatymą (PĮ).

Iki šio įrankio pasirengimas deryboms vyko fragmentiškai:

- Pirkimo komanda rankiniu būdu Excel'yje lygindavo tiekėjų pasiūlymus, bet analizė priklausė nuo individualios kompetencijos.
- Nebuvo struktūrizuotos metodikos derybų ribų (BATNA, ZOPA, tikslo, rezervinės ribos) nustatymui.
- Derybų sesijų metu komisija neturėjo realaus laiko įrankio nuolaidoms sekti ir ribų pažeidimui aptikti.
- Sprendimo memorandumai buvo rašomi „nuo nulio", be standartinio šablono.
- Naujesni komandos nariai turėjo gana ilgą kelią iki savarankiškos derybų praktikos.

Įrankis sukurtas norint:

1. Standartizuoti pasirengimo deryboms procesą visoje EPSO-G grupėje.
2. Pagreitinti analizę naudojant automatinį statistinį variklį.
3. Užtikrinti, kad derybų sesijos vyktų pagal iš anksto nustatytas ribas.
4. Sukurti instituciją, o ne individualią kompetenciją (žinios lieka organizacijoje, ne tik vyresnių darbuotojų galvose).
5. Demonstruoti, kaip dirbtinis intelektas ir digitalizacija gali realiai pagerinti viešųjų pirkimų skaidrumą ir efektyvumą.

---

## 3. Sprendžiamos problemos

| Problema | Sprendimas įrankyje |
|---|---|
| Lyginimas tarp tiekėjų rankiniu būdu yra lėtas ir klaidoms imlus | Automatinis statistinis variklis: min, vid, mediana, std nuokrypis, CV, Z-score, IQR išskirčių aptikimas |
| Nėra struktūros derybų ribų nustatymui | BATNA/ZOPA modelis kiekvienam tiekėjui pagal rinkos duomenis ir PV |
| Subjektyvūs sprendimai dėl scenarijų | 3 scenarijai (agresyvus / realus / atsargus) automatiškai generuojami pagal duomenis |
| MEAT vertinimas Excel'yje sunkiai matomas | Vizualus MEAT skaičiavimas su jautrumo analize (slankiklis) |
| Derybų sesijos protokolas pildomas ranka popieriuje | Realaus laiko HUD su tikslo ir rezervinės ribos stebėjimu, raundų log'as |
| Sprendimo memorandumas „nuo nulio" | Struktūruoti AI prompt'ai su visu kontekstu, paruošti VPT Ekspertui ar Claude |
| Tiekėjų pasiūlymai PDF/DOCX/XLSX, sunku perkelti į analizę | Failų parser'is (PDF.js + SheetJS + mammoth.js) |
| Komanda dirba skirtinguose įrenginiuose, sunku dalintis būsena | JSON eksportas/importas, XLSX ataskaitos, spausdinama PDF ataskaita |
| Jautrūs pirkimo duomenys siunčiami į trečių šalių AI įrankius | 100% lokalus veikimas naršyklėje, jokio backend'o |

---

## 4. Veikiančios funkcijos (v1.0)

### 4.1. Apžvalga (Dashboard)
- 4 KPI plytelės: tiekėjų skaičius, planuojama vertė (PV), mažiausias pasiūlymas, potenciali ekonomija.
- 6 žingsnių progresas su automatiniu „aktyvaus" žingsnio nustatymu.
- Statusas (statinis tekstas pagal projekto stadiją).
- Automatinės įžvalgos (kainos išsibarstymas, pirmaujantis tiekėjas, išskirtys).
- Hero blokas su EPSO-G stiliumi (tamsiai žalsvas gradientas).

### 4.2. Pirkimo informacija
**Laukai (po pastarojo supaprastinimo):**
- Pavadinimas
- Perkančioji organizacija (EPSO-G grupės sąrašas)
- Taikomas įstatymas (PSĮ / VPĮ)
- Procedūros tipas (6 variantai)
- Planuojama pirkimo vertė (PV), valiuta, su/be PVM
- Sutarties trukmė (mėn.)
- Vertinimo kriterijų modelis (mažiausia kaina / MEAT)
- Kainos/kokybės svoriai (jei MEAT)
- Pirkimo tikslas (laisva forma)
- Kontekstas, ankstesnė patirtis (laisva forma)

**Pašalinti laukai (pagal naudotojo feedback'ą):** CPV kodas, CPV objekto pavadinimas, pasiūlymų pateikimo terminas, derybų data, nes derybose nesukuria vertės.

### 4.3. Tiekėjai
- Pridėjimas/redagavimas modaliniame lange.
- Laukai: pavadinimas, įmonės kodas, šalis, kontaktas, rizikos lygis (žema/vid/aukšta), spalva (vizualus identifikatorius), pastabos.
- Kortelės su pasiūlymo statusu ir nuokrypiu nuo PV.
- Trinant tiekėją, jo pasiūlymo duomenys taip pat ištrinami.

### 4.4. Pasiūlymų importas
**Trys režimai (tab'ai):**
1. **Įkainių pozicijos.** Inline-redaguojama lentelė: pozicijos × tiekėjai. Min/max paryškinimas. Pavyzdinių pozicijų generavimas.
2. **Failo įkėlimas.** Drag-and-drop dropzone, palaikomi .xlsx/.xls/.csv/.pdf/.docx. Pasirinkti tiekėją, įkelti failą, parser'is automatiškai atpažįsta pozicijas (antraštės: „Pavadinimas", „Kiekis", „Kaina") ir priskiria įkainius. Jei nepavyksta atpažinti, ieško bendros sumos kaip fixed-price.
3. **Bendras pasiūlymas (fixed price).** Lentelė: tiekėjas × (bendra kaina, galiojimas, mokėjimo sąlygos, pristatymas, komentaras).

### 4.5. Lyginamoji analizė
- 4 KPI: min, vidurkis, mediana, max (su nuokrypiais nuo PV).
- Du Chart.js grafikai: stulpelinis (pasiūlymai prieš PV) ir histograma.
- Tiekėjų rikiavimas su Z-score, išskirčių žymėjimu.
- Pozicijų analizė: kiekvienai pozicijai min/vid/med/max/CV.
- Automatiniai dėmesio punktai:
  - Didelis/mažas kainų išsibarstymas (CV > 30 ar < 5).
  - Pasiūlymai virš PV +10% (galimas pirkimo nutraukimas).
  - Pasiūlymai žemiau PV -30% (nepagrįstai maža kaina, VPĮ 57 str. / PĮ 65 str.).
  - Statistinės išskirtys.

### 4.6. MEAT vertinimas
- Kokybės kriterijų lentelė (pavadinimas, svoris, skalė 1-5/1-10/0-100).
- Svorių sumos validacija (turi būti 100%).
- Tiekėjų kokybės įvertinimas pagal kriterijus.
- MEAT formulė: (Kaina_min / Kaina_i) × priceWeight + (Q_i / 100) × qualityWeight.
- MEAT reitingas su Chart.js stulpeline diagrama.
- **Jautrumo analizė:** slankiklis (0-100) kainos svoriui, lentelė atnaujinama realiu laiku.

### 4.7. Derybų strategija
- Trys sąrašai: must-have, nice-to-have, mainai (concessions su „ką duodame / ko prašome").
- Automatinė BATNA/ZOPA lentelė kiekvienam tiekėjui:
  - Atidarymas (opener): 88-90% nuo dabartinio pasiūlymo.
  - Tikslas (target): min(min pasiūlymas, 92% dabartinio, PV).
  - Rezervinė riba (reservation): min(98% dabartinio, 102% PV).
- 3 scenarijai per tiekėją: agresyvus / realus / atsargus su konkrečiomis sumomis ir naratyvu.
- Rizikų registras (5×5 matrica: tikimybė × poveikis).

### 4.8. Derybų sesija
- HUD juosta: statusas, raundų skaičius, dabartinis tiekėjas, tikslas, rezervinė riba.
- Raundo paleidimas (pasirenkant tiekėją).
- Realaus laiko nuolaidos skaičiuoklė: tiekėjo siūlymas, progresas tikslo link (progress bar).
- 3 mini KPI: nuolaida, iki tikslo, ar pasiektas tikslas.
- Sprendimų log'as, pastabos.
- Raundo užbaigimas su laiko žyme.
- Protokolas su visais raundais.

### 4.9. AI asistentas (prompt'ų generatorius)
6 šablonai, kiekvienas automatiškai sukomplektuoja visą kontekstą:
1. **Strategija.** Bendros derybų strategijos kūrimas.
2. **Tiekėjas.** Individuali strategija konkrečiam tiekėjui (su SWOT, scenarijais).
3. **Rizikos.** Teisinės, komercinės, tiekimo, reputacinės rizikos.
4. **Atsakymas.** Atsakymas tiekėjui į konkretų pasiūlymą.
5. **Memo.** Komisijos sprendimo memorandumas.
6. **Tech spec.** Techninės specifikacijos peržiūra (proporcingumas, lygiateisiškumas).

Kontekstas kiekviename prompt'e: pirkimo info, tiekėjų rikiavimas, strategija. Vienas mygtukas „Kopijuoti" arba atsisiųsti .txt.

### 4.10. Eksportas
- **JSON:** pilnas projekto eksportas/importas (atsarginė kopija, dalijimasis).
- **XLSX:** 6 lapai (Pirkimas, Tiekėjai, Įkainių lentelė, Reitingas, Derybų ribos, Sesijos protokolas).
- **PDF (spausdinimas):** spausdinimo CSS, paslepia navigaciją ir interaktyvius elementus.
- **Trinti viską:** reset funkcija su patvirtinimu.

### 4.11. Pagalba
- Greitas startas (8 žingsniai).
- Terminų žodynas (PV, BATNA, ZOPA, MEAT, Z-score).
- Teisinis pagrindas (VPĮ/PĮ/VPT).
- Privatumo deklaracija.

---

## 5. Planuojamos funkcijos

### 5.1. Trumpalaikiai pataisymai (v1.1)

- **Onboarding tour.** Pirmojo paleidimo gidas (3-5 žingsnių).
- **Pavyzdinis projektas.** Vienu mygtuku užkrauti pilną demo (visi laukai užpildyti) testavimui.
- **„Salyga A vs Salyga B" palyginimas.** Kai svarbu palyginti tą patį pasiūlymą su skirtingomis sąlygomis.
- **Spalvų schema kortelėms reitinge.** Žaliai/geltonai/raudonai pagal nuokrypį nuo PV.

### 5.2. Vidutinio prioriteto (v1.2)

- **TCO (Total Cost of Ownership) modelis.** Kaina + eksploatacija + garantija + atsarginės dalys per sutarties laikotarpį, su NPV diskontavimu.
- **Sutarties projekto klauzulių registras.** Derybų metu sekti, kurios klauzulės jau aptartos, kurios likę, kokie pakeitimai padaryti.
- **Komandos vaidmenys.** Skirtingi rodiniai pirkimo iniciatoriui, derybininkui, komisijos nariui, vadovui (read-only).
- **Komentarai prie tiekėjų pasiūlymo pozicijų.** Diskusijos su pirkimo iniciatoriumi techniniais klausimais.
- **Versijavimas.** Saugoti istorinius pasiūlymų variantus, lyginti tarp jų.

### 5.3. Strateginės plėtros (v2.0+)

- **VPT Eksperto integracija per API.** Vietoj prompt'o kopijavimo, tiesioginis užklausimas.
- **Centralizuotas pirkimų istorijos archyvas.** Buvę pirkimai kaip benchmark'as naujiems (be tiekėjų konfidencialumo pažeidimo).
- **Tiekėjų istorijos sekimas.** Tas pats tiekėjas anksčiau buvo X pirkimuose, vidutinis nuokrypis Y, vykdymo kokybė Z.
- **Rinkos žvalgybos integracija.** Centrinė viešųjų pirkimų informacinė sistema (CVP IS) skaitymas, tiekėjų finansinė informacija.
- **Multi-tenant variantas visai EPSO-G grupei** su SSO ir vaidmenų valdymu.
- **Mobili versija arba PWA** sesijos metu naudoti planšete.

### 5.4. Eksperimentinės idėjos

- **AI „Deryb ininkų antagonisto" simuliatorius.** Treniruoti komandą prieš realią sesiją.
- **Real-time bendradarbiavimas.** Du komisijos nariai dirba toje pačioje sesijoje (WebRTC arba CRDT).
- **Voice notes** sesijos metu su automatiniu transkribavimu (Whisper.cpp lokaliai).

---

## 6. Technologiniai sprendimai ir argumentai

### 6.1. Vienas savarankiškas HTML failas

**Pasirinkimas:** Visas įrankis viename `.html` faile, jokio backend'o, jokios build sistemos.

**Argumentai:**
- EPSO-G IT infrastruktūra konservatyvi, naujų sistemų diegimas reikalauja ilgų vidinių procedūrų.
- Failu galima dalintis per intranet'ą, el. paštą arba SharePoint.
- Nereikia hostinimo, domeno, autentifikacijos.
- Naudotojas atidaro dukart spustelėdamas, viskas veikia.
- Sumažinti saugumo rizikai (jokie duomenys neišvyksta iš naršyklės).

**Kompromisai:** Nėra centralizuoto bendrų projektų vaizdo. Reikia JSON eksporto/importo darbui komandoje.

### 6.2. Vanilla JavaScript (be karkasų)

**Pasirinkimas:** Be React, be Vue, be jQuery. Tik standartinis ES2020+ JS.

**Argumentai:**
- Karkasai reikalautų build sistemos (Vite, Webpack), tai pažeistų „vieno failo" principą.
- Aplikacijos sudėtingumas vidutinis, vanilla JS pakanka.
- Lengviau perduoti kitam developer'iui be specifinių framework žinių.
- Nėra tiekėjo lock-in'o (nepaseno frameworks).
- Failo dydis mažesnis (154 KB vs 500+ KB su karkasu).

**Kompromisai:** Daugiau boilerplate kodo state valdymui. Sudėtingesnis reactivity (kiekviena render funkcija kviečiama rankiniu būdu).

### 6.3. CDN bibliotekos

**Pasirinktos bibliotekos:**
- **Chart.js v4.4.0** grafikams (lengvas, geras Lietuvos lokalė palaikymas).
- **SheetJS (xlsx) 0.18.5** XLSX skaitymui/rašymui.
- **PDF.js 3.11.174** PDF teksto išgavimui.
- **mammoth.js 1.6.0** DOCX skaitymui.

**Argumentai:** Visos jos veikia 100% naršyklėje, be backend'o. CDN užtikrina greitą įkėlimą.

**Rizika:** Jei CDN neprieinamas, įrankis nuosveiks. **Sprendimas (planuojamas):** būtinybės atveju bibliotekas įdėti inline į failą.

### 6.4. localStorage persistencija

**Pasirinkimas:** Visi projekto duomenys saugomi `localStorage` JSON formatu.

**Argumentai:**
- Veikia offline.
- Nereikia backend'o.
- Greitas (sinchroninis).

**Apribojimai:** ~5-10 MB limito (užtenka šimtams projektų). Vienas naudotojas/naršyklė/įrenginys. Reikia JSON eksporto kaip „backup".

### 6.5. EPSO-G dizaino sistema

**Pasirinkimas:** CSS custom properties (variables) pagal EPSO-G 2026 brandbook'ą.

**Spalvos:**
- Smaragdas `#00A072` (pagrindinė).
- Grafitas `#2E3641` (tekstas).
- Funkcinės: error `#DB354A`, warning `#FAB03B`, success `#459D54`.

**Tipografija:** Nunito Sans (iš Google Fonts).

**Stilius:** Apple-inspired šviesus minimalizmas, daug baltos erdvės, subtilūs šešėliai, 8 px tarpų sistema, 8/12/16 px kampų spinduliai.

**Argumentai:** Atitiks bet kokį būsimą EPSO-G vidinį portalą, nesijaus „svetimas". Profesionalus tonas tinka korporatyviniam vartotojui.

### 6.6. Hibridinė AI integracija

**Pasirinkimas:** Vidinis analizės variklis + AI prompt'ų eksportas.

**Argumentai:**
- Vidinis variklis užtikrina, kad pagrindinė analizė veiks visada, be priklausomybės nuo AI.
- AI prompt'ų eksportas leidžia naudotojui pasirinkti, kur ir kada naudoti AI (VPT Ekspertas, Claude.ai, vidinis modelis ateityje).
- Jautrūs duomenys nesiunčiami automatiškai, naudotojas mato, ką nukopijuoja.

**Alternatyvos atmestos:**
- Tiesioginis API kvietimas: reikalauja saugaus rakto saugojimo, neproblemiškai su vienu HTML failu.
- Tik vidinis variklis (be AI): praleidžia AI naudą strateginiams sprendimams.

---

## 7. Žinomi apribojimai

### 7.1. Funkciniai apribojimai

- **PDF/DOCX parsing'as „best effort".** Veikia gerai su struktūruotomis lentelėmis, blogai su skenuotomis ar netvarkingomis ataskaitomis. Visada reikia patikrinti rezultatą.
- **Nėra multi-user režimo.** Vienas naudotojas vienoje naršyklėje. Komandos darbas per JSON eksportą.
- **Nėra versijų istorijos.** Pakeitimai perrašo ankstesnę versiją.
- **Sesijos modulis nepalaiko kelių paralelinių derybų.** Vienu metu galima vesti tik vieną aktyvų raundą.
- **MEAT formulė standartinė.** Sudėtingesnės formulės (su keliais kainos komponentais, etapais, daugikliais) nepalaikomos.
- **Charts neoptimuoti spausdinimui.** Nedidelėje PDF lape grafikai gali atrodyti per maži.

### 7.2. Techniniai apribojimai

- **Naršyklių palaikymas.** Tikrinta Chrome/Edge naujausi. Safari ir Firefox turėtų veikti, bet netestuota.
- **localStorage limit'as.** Labai dideli projektai (50+ tiekėjų, 200+ pozicijų) gali pasiekti ribą.
- **Nėra automatinio backup'o.** Naudotojas privalo savarankiškai eksportuoti JSON.
- **CDN priklausomybė.** Be interneto pirmojo paleidimo metu, bibliotekos neįsikraus (po įkėlimo cache veikia).

### 7.3. Procesiniai apribojimai

- **Teisinė atsakomybė.** Įrankis pagalbinis, neatleidžia komisijos nuo VPĮ/PĮ atitikties pareigos.
- **AI prompt'ai netikrinami.** Vartotojas atsakingas už AI atsakymo įvertinimą prieš naudojimą.
- **EPSO-G specifika.** Įrankis pritaikytas energetikos sektoriaus pirkimams, kitose pramonės šakose gali reikėti adaptacijos.

---

## 8. Prioritetų sąrašas

### Aukšti prioritetai (kitas tobulinimo ciklas)

1. **Naudotojo testavimas su realiu pirkimu.** Pasirinkti vieną tinkamą Litgrid pirkimą, pravesti per visą įrankį, surinkti feedback'ą.
2. **Onboarding tour.** Naujam naudotojui reikia matyti įrankio struktūrą per pirmas 60 sekundžių.
3. **Spausdinimo CSS pataisymai.** Užtikrinti, kad spausdinta PDF ataskaita atrodytų profesionaliai (chart'ai, lentelės, page break'ai).
4. **PDF parser'io patobulinimas.** Pridėti antraščių aptikimą pagal kelias kalbas (LT/EN/RU), geresnis lentelių struktūros atkūrimas.
5. **Tiekėjų pasiūlymo „health check".** Automatinė patikra: ar viskas užpildyta, ar nėra akivaizdžių klaidų (neigiamos kainos, neproporcingi įkainiai).

### Vidutiniai prioritetai

6. **TCO modelis.** Plėsti kainos analizę nuo „pirkimo kainos" iki visu sutarties laikotarpiu.
7. **„Salyga A vs Salyga B" palyginimas.**
8. **Komandos rodiniai (read-only komisijos nariams).**
9. **Pasiūlymo pozicijų komentarai/diskusijos.**
10. **Versijavimas su laiko žyme.**

### Žemi prioritetai (vertinant ROI)

11. **VPT Eksperto API integracija** (priklauso nuo VPT API prieinamumo).
12. **Multi-tenant variantas visai grupei** (didelis infrastruktūros investavimas).
13. **Mobili versija/PWA.**
14. **Realaus laiko bendradarbiavimas.**

### Techniniai uždaviniai (bet kuriuo metu)

- Bibliotekų įdėjimas inline (eliminuoti CDN priklausomybę).
- Safari/Firefox testavimas.
- Automatiniai unit testai pagrindinėms funkcijoms (stats, strategy, parsers).
- Accessibility (WCAG AA atitiktis).
- I18n pagrindas (en/lt jungiklis).

---

## 9. Kaip tęsti darbą naujoje paskyroje

**Žingsniai naujam pokalbiui:**

1. Įkelti `EPSO-G_Derybu_Pasirengimo_Irankis.html` (galutinis veikiantis variantas).
2. Įkelti šį `PROJECT_CONTEXT.md` failą.
3. Naują pokalbį pradėti maždaug taip:

> „Tęsiu darbą su Derybų pasirengimo įrankiu. Pridėjau projekto failą ir PROJECT_CONTEXT.md. Prašau perskaityti kontekstą ir tada [konkretus uždavinys]."

**Konkrečių uždavinių pavyzdžiai:**

- „Įgyvendinti TCO modelį iš prioritetų sąrašo 6 punkto."
- „Pataisyti PDF parser'į, kad geriau atpažintų antraštes su skirtingais lentelės formatais."
- „Pridėti onboarding tour'ą su 4 žingsniais: Apžvalga, Pirkimo info, Tiekėjai, Importas."
- „Sukurti komandos rodinį (read-only) komisijos nariams."

**Svarbūs naudotojo nustatymai (vengti AI tells):**

- Niekada nenaudoti ilgų brūkšnių (em-dash „—") UI tekste ar dokumentuose.
- Naudoti natūralią lietuvių skyrybą: kablelius, dvitaškius, taškus, paprastus brūkšnius.

**Naudotojo kontekstas:**

- Arūnas Jurgelaitis, Head of Procurement, AB „Litgrid".
- Patyręs PĮ/VPĮ praktikoje.
- Aktyviai dirba su AI įrankiais (turi atskirą projektą „VPT Ekspertas").
- Vertina struktūrizuotą, profesionalų toną.
- Naudoja lietuvių kalbą darbiniame kontekste.

---

## 10. Failų inventorizacija

| Failas | Paskirtis | Statusas |
|---|---|---|
| `EPSO-G_Derybu_Pasirengimo_Irankis.html` | Pagrindinė aplikacija | Veikia, v1.0 |
| `PROJECT_CONTEXT.md` | Šis kontekstinis dokumentas | Šis failas |

Visi kiti projekto failai (logo SVG, brandbook, originalios specifikacijos) pateikti per pradinį pokalbį ir nereikalingi tolimesniam darbui, nes visi reikiami elementai jau įkurti į HTML failą inline.

---

*Dokumento versija: 1.0*
*Atnaujinta: 2026-06-11*
