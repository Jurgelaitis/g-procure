# PROJECT_CONTEXT.md

**Projekto pavadinimas:** PP-TS (TS Asistentas) - dalis G-Procure ekosistemos
**Organizacija:** LITGRID AB · EPSO-G grupė
**Aktyvus failas:** `TS_Asistentas.html` (vienas standalone failas, ~270 KB)
**Pagrindinis vartotojas:** Arūnas Jurgelaitis, Head of Procurement, Litgrid AB

---

## 1. Projekto vizija

Sukurti **modernų, AI-paremtą įrankį techninių specifikacijų rengimui ir kokybės užtikrinimui**, kuris atitinka aukščiausius Lietuvos Respublikos viešųjų pirkimų teisės reikalavimus, atspindi LITGRID AB kaip energetikos sektoriaus perkančiojo subjekto specifiką ir taupo iniciatorių bei pirkimų organizatorių laiką, kartu užtikrindamas TS kokybę, teisinį atitikimą ir konkurencingumą.

Ilgalaikė vizija: PP-TS yra dalis platesnės **G-Procure ekosistemos** (apima PP-PLANNING, PP-MARKET-KPI, PP-TS, PP-COST-BENEFIT, PP-DURATIONS, PP-GRAPHS, PP-PROTOCOLS, PP-NEGOTIATION, PP-REPORT, ateityje PP-QUAL ir kt.). Visi moduliai yra savarankiški, su tikslinga integracija ateityje per bendrą "Pirkimo kontekstas" duomenų sluoksnį.

---

## 2. Kodėl projektas sukurtas

**Strateginis pagrindas:**

LITGRID AB yra perkantysis subjektas pagal LR Pirkimų, atliekamų vandentvarkos, energetikos, transporto ar pašto paslaugų srities perkančiųjų subjektų įstatymą (PĮ) - tai **sektorinis įstatymas**, atskiras nuo bendrojo VPĮ. Taikoma ES Direktyva 2014/25/ES.

Tradicinis TS rengimo procesas turi šias problemas:
- **Dažnos VPT pažeidžiamos klaidos** (prekės ženklai be "arba lygiavertis", subjektyvūs terminai, neproporcingi reikalavimai)
- **Daug rankinio darbo** rengiant standartinius dokumentus
- **Skirtinga TS kokybė** priklauso nuo specialisto patirties
- **Per maža konkurencija** dėl netiesiogiai diskriminuojančių specifikacijų
- **Ilgi rengimo terminai** stabdo strateginius pirkimus
- **Sunkus auditas** - neaišku, kuriuos sprendimus priėmė AI ir kuriuos žmogus

PP-TS sprendžia visas šias problemas pažangiu hibridinės analizės sluoksniu (taisyklės + Claude AI) ir struktūrizuotu generavimo srautu su integruota kokybės kontrole.

---

## 3. Kokias problemas sprendžia

### A) TS generavimo problemos
- Iniciatorius dažnai neturi gilios pirkimų teisės patirties, todėl pirminis TS gali turėti dažnų klaidų
- Standartiniai TS šablonai senstantys, nelydintys VPT praktikos pokyčių
- Rankinis darbas tas pats kiekvienam pirkimui

### B) Kokybės kontrolės problemos
- Pirkimų specialistas turi peržiūrėti TS klaidoms, rasti subjektyvius terminus, prekės ženklus
- Šis darbas trunka valandas ir yra klaidoms imlus
- Nėra audito takelio, kas konkrečiai buvo patikrinta

### C) Rinkos analizės problemos
- Iniciatorius nežino, kokia tipinė pirkimo vertė rinkoje
- Sudėtinga atrasti panašius istorinius pirkimus CVP IS sistemoje
- Sudėtinga įvertinti, ar bus pakankama konkurencija

### D) Dokumentų valdymo problemos
- DOCX šablonai nestandartizuoti
- Atitikties lentelės pildomos rankiniu būdu
- Sunku sekti kelis pirkimo dokumento versijas

---

## 4. Kokios funkcijos JAU VEIKIA

### Sukurti TS (5 žingsnių vediklis)
1. **Pirminė informacija** - pavadinimas, objekto tipas, kiekis, trukmė, vieta, specialūs reikalavimai
2. **AI klausimai** - 6-10 patikslinimo klausimų pagal pirkimo kontekstą
3. **Analogai ir kontekstas** - automatinis CVP IS analogiškų pirkimų gavimas iš `api.g-procure.com/api/vpt`
4. **Generavimas** - multi-call architektūra (skeleton + sections in parallel + compliance):
   - Pilna TS su skyriais
   - Atitikties lentelė (Priedas Nr. 1)
   - Kainos vertinimas su rėžiu, statistika, rekomendacijomis
   - Tiekėjų rinkos kortelė (hibridinė: faktiniai CVP IS + AI žinios)
5. **Eksportas** - tikras .docx (Office Open XML per docx.js), .md, .txt, .html

### Tikrinti TS (analizės flow)
- DOCX/PDF/URL/paste įvestis su normalizacija (PDF Y-koordinačių analizė)
- **Hibridinė analizė:** taisyklių variklis + Claude AI
- Taisyklių variklis aptinka:
  - Prekės ženklus be "arba lygiavertis" (50+ ženklų katalogas)
  - 22+ subjektyvius terminus (kokybiškas, patikimas, profesionalus...)
  - Neaiškius kiekius (pakankamas kiekis, prireikus...)
  - Per aukštus kvalifikacinius reikalavimus
  - Konkretų specialistų skaičių
  - Trūkstamas garantijos/delspinigių sąlygas
  - Įtartinas frazes (konkurencijos ribojimas)
  - Struktūros trūkumus
- Anotuotas tekstas su pažymėtais problemų vietomis
- Filtravimas pagal kategorijas
- Bendras balas (0-100)

### Auto-pritaikyti rekomendacijas
- Po analizės, vienas mygtukas pataiso TS pagal AI pasiūlymus
- Skyriai pažymimi kaip "human-edited"
- Uždaras kokybės ciklas: Generuoti → Tikrinti → Pataisyti → Tikrinti

### Status badges sekcijoms
- **🤖 AI parengė** - pradinė būsena
- **👤 Žmogus tvirtino** - specialistas patvirtino
- **✏️ Žmogus redagavo** - po auto-pritaikymo
- **⚠️ Reikia peržiūros** - nesugeneruota arba turi rizikos
- Audito suvestinė viršuje rodo "X/Y patvirtintų"

### CVP IS integracija (per g-procure backend)
- Endpoint: `https://api.g-procure.com/api/vpt?search=...&limit=...`
- Backend gauna duomenis iš `get.data.gov.lt`, grąžina pirkimų sutartis
- Be CORS apribojimų (backend proxy)
- Pateikia: dok_sut_obj_pav, dok_sut_verte, dok_sudarymo_data, dok_pirkimo_numeris
- Statistika: mediana, apkarpytas vidurkis, P25-P75, min/max

### AI integracija per g-procure proxy
- Endpoint: `https://api.g-procure.com/api/analyze`
- Backend turi savo Anthropic API raktą
- **Vartotojui nereikia įvesti savo rakto**
- Modelis: `claude-sonnet-4-6` (parinktas)
- Nginx timeout: 300s
- 429 retry su exponential backoff (taip pat aptinka 500 su body 429)

### Robustus JSON parsavimas (8 strategijos)
- Tiesioginis JSON.parse
- Markdown fence pašalinimas
- Balansuotas { ... } ekstraktavimas
- Repair'iai (smart quotes, trailing kableliai, komentarai)
- Uždaryti atvirus skliaustus (nutrūkęs atsakymas)
- Kombinuotas (repair + truncate)
- Masyvas [ ... ] vietoj objekto
- Regex fallback žinomiems raktams

Plus auto-retry API kvietimo jei parsavimas nepavyksta (2 papildomi bandymai su griežtesniu prompt'u).

### Žinių bazė (Žinių bazė skirtukas)
- 7 sekcijos pagal ESFA leidinį "Dažniausios projektų viešųjų pirkimų klaidos"
- LAT bylų nuorodos: e3K-3-325-469/2018, e3K-3-178-378/2018, e3K-3-396-969/2017
- PĮ straipsnių nuorodos
- VPT Tiekėjo kvalifikacijos nustatymo metodikos koeficientai

### Eksportas
- **Tikras .docx** (Office Open XML per `docx.js` v8.5.0 iš CDN)
- Su tituliniu lapu, pirkimo informacija, skyriais, vertinimo kriterijais, kainos analize, atitikties lentele
- Markdown, TXT, HTML alternatyvos
- Automatinis failo pavadinimas su data

---

## 5. Kokios funkcijos PLANUOJAMOS

### Trumpalaikės (kelios savaitės)
- (Šio momento naujų funkcijų sąrašo nėra - sutarta baigti PP-TS iteraciją ir palikti modulį stabilizavimui)

### Vidutinio termino (1-3 mėnesiai)
- **Atskiras PP-QUAL modulis** (kvalifikaciniai reikalavimai)
  - 3 įėjimo taškai: nuo pradžios / iš TS dokumento / esamų reikalavimų patikra
  - 5 reikalavimų kategorijos
  - Proporcingumo skaičiuoklė (VPT Metodikos koeficientai 0.3/0.5/0.7)
  - Atskira atitikties lentelė (Priedas Nr. 2)

- **Atskiras PP-MARKET-CONSULT modulis** (preliminari rinkos konsultacija pagal PĮ 26 str.)
  - Auto-generuoja: kvietimą tiekėjams + klausimyną + atsakymų vertinimo lentelę
  - Atsakymų konsolidacija
  - Eksportas į TS pirminę informaciją

### Strateginės (3-6 mėnesiai)
- **Bendras "Pirkimo kontekstas"** duomenų sluoksnis - kuriuo dalinasi visi PP-* moduliai
- **Handoff mygtukai** tarp modulių ("Tęsti su PP-QUAL", "Atidaryti PP-PROTOCOLS")
- **TS auditavimo žurnalas** - kiekvieno patvirtinimo registravimas
- **Šablonų biblioteka** pagal pirkimo objekto tipus
- **Konkurencijos sveikatos prognozė** PP-TS sekcijoje
- **Pirkimo brandos lygio nustatymas** pradžioje (idėja / konceptas / detali specifikacija)

---

## 6. Technologiniai sprendimai ir jų pasirinkimo priežastys

### Frontend: Vienas standalone HTML failas
**Pasirinkimas:** Vienas `TS_Asistentas.html` failas su inline CSS ir JS (~270 KB).

**Kodėl:**
- **Lengvas deployment** - patalpinama bet kur (GitHub Pages, vidinis web server, ar net atidarymas iš disko)
- **Nereikia npm build** - tinka organizacijai be tipinio frontend dev workflow
- **Versionavimas paprastas** - vienas failas = viena versija
- **Audito-draugiškas** - visi failai matomi vienu žvilgsniu

### AI sluoksnis: Claude Sonnet 4.6 (per g-procure backend)
**Pasirinkimas:** Anthropic Claude Sonnet 4.6, kviečiamas per `api.g-procure.com/api/analyze` proxy.

**Kodėl:**
- **Aukšta kokybė lietuvių kalba** - svarbu Litgrid kontekste
- **Geras struktūrizuoto JSON output** - kritinis multi-call architektūrai
- **Proxy backend** - vartotojui nereikia savo API rakto, korporatyvinis valdymas
- **Multi-call dalijimo lankstumas** - vienas modelis visiems kvietimams

### Backend: api.g-procure.com (Node.js + Express + nginx)
**Pasirinkimas:** Atskiras backend Node.js serveris su nginx reverse proxy ir SSL (Let's Encrypt).

**Kodėl:**
- **CORS sprendimas** - paima duomenis iš get.data.gov.lt serverio pusėje
- **API rakto saugumas** - Anthropic raktas ne pas vartotoją
- **Sutelkta rate limit valdymas** - vienas raktas, bendras limit'as
- **Konfigūracijos:** nginx `proxy_read_timeout 300s`, CORS antraštės su `always` direktyva (kad veiktų ir su klaidomis)

### Hibridinė analizė (taisyklės + AI)
**Pasirinkimas:** Deterministinis taisyklių variklis (regex + žodynai) + Claude AI gilus vertinimas.

**Kodėl:**
- **Greitis** - taisyklės atsako per sekundes
- **Konsistentiškumas** - tos pačios klaidos visada aptinkamos
- **Patikimumas** - taisyklės neturi haliucinacijų
- **Pilnumas** - AI suranda kontekstines klaidas, kurių neaptinka taisyklės
- **Kainos optimizavimas** - mažiau AI tokenų išleidžiama paprastoms patikroms

### Multi-call architektūra (vietoj vieno mega prompt)
**Pasirinkimas:** TS generavimas padalintas į: skeleton + parallel sections + compliance + price + market.

**Kodėl:**
- **Patikimumas** - vieno kvietimo nepavykimas neuždraudžia visko
- **Greitis** - lygiagretūs kvietimai
- **Token limit'ai** - kiekvienas kvietimas mažas, neviršija max_tokens
- **Nginx timeout** - kiekvienas kvietimas tilpsta į 300s limit'ą

### Robustus JSON parsavimas (8 strategijos + 2 API retry)
**Pasirinkimas:** Daugiapakopis parsavimas su API kvietimo pakartojimu jei vis tiek nepavyksta.

**Kodėl:**
- **AI atsakymai netobuli** - kartais grąžina su tekstu prieš/po JSON, su markdown fence, nutrūksta viduryje
- **Bendra apsauga** - 99,9% sėkmės tikimybė
- **Diagnostika** - aiškūs `console.warn` su strategijų sąrašu

### DOCX generavimas: docx.js v8.5.0
**Pasirinkimas:** `docx.js` biblioteka iš CDN (jsdelivr su unpkg fallback).

**Kodėl:**
- **Tikras Office Open XML** - ne HTML-as-Word hack
- **Word/LibreOffice/Google Docs suderinamumas** - nativiai atveria
- **Programatiškas pilnumas** - lentelės, stiliai, antraštės, page breaks
- **v8.5 stabili versija** - v9 pakeitė failo struktūrą (`build/` → `dist/`) ir CDN'e būna nepatikima

### CVP IS duomenys: per g-procure backend
**Pasirinkimas:** Backend skambina get.data.gov.lt, frontend skambina backend.

**Kodėl:**
- **Be CORS apribojimų** - get.data.gov.lt neleidžia tiesioginio kvietimo iš naršyklės
- **Cache potencialas** - galima cache'inti dažnas užklausas
- **Centralizuotas tvarkymas** - vienas vietoje API specifikos žinios

### EPSO-G dizaino sistema
**Pasirinkimas:** Pagal `EPSO-G_HTML_stiliaus_gaires.md` (suteikta vartotojo) - Smaragdas #00A072, Grafitas #2E3641, Nunito Sans, 8px tarpų sistema.

**Kodėl:**
- **Korporatyvinis vientisumas** - dera su Litgrid/EPSO-G brand'u
- **Profesionalumas** - enterprise tipo dizainas, ne landing page
- **Skaitomumas** - šviesi paletė, daug baltos erdvės

---

## 7. Žinomi apribojimai

### A) AI žinių riba (2025 m. gegužė)
- Claude Sonnet 4.6 nežino apie rinkos pokyčius po 2025-05
- Tiekėjų rinkos kortelė tai aiškiai pažymi: "⚠ AI žinios (riba: 2025 m. gegužė). Patikrinkite aktualumą."
- Naujausi VPT praktikos pakeitimai (po 2025-05) gali būti nežinomi - prompt'as nurodo remtis iki tos datos buvusiais aktais

### B) CVP IS endpoint'as grąžina ribotus duomenis
- `dok_sut_obj_pav, dok_sut_verte, dok_sudarymo_data, dok_pirkimo_numeris` - **NĖRA tiekėjų pavadinimų**
- Negalima sukurti faktinio "Top tiekėjų" sąrašo iš realių duomenų
- Tiekėjų sąrašas yra AI-derived (su atitinkamu disclaimer'iu)

### C) Nginx timeout 300s
- Labai sudėtingiems generavimams gali būti per trumpas
- Tai jau sprendžia multi-call architektūra, bet ateityje gali reikėti padidinti iki 600s

### D) docx.js v8 vs v9
- Esame v8.5.0 nes v9 turi nestabilius CDN keliuts
- Kai docx.js v9+ stabilizuosis CDN'uose, vertėtų migruoti

### E) Status badges nepersistuojami
- `_status` saugomas tik `gen.ts` objekte memory'je
- Po page reload - prarandami
- Ateityje galima saugoti localStorage arba atskira "darbo sesija" struktūra

### F) PDF.js teksto ekstrakcija
- Sudėtingi PDF (su lentelėmis, kelias kolomas, vaizdais) gali būti ekstraktuojami netvarkingai
- `normalizeExtractedText` valo dažnius artefaktus, bet ne visus
- Sudėtingiausi atvejai - vartotojas turi rankiniu būdu pataisyti

### G) Nėra automatinio testavimo
- Nėra unit/E2E testų suite
- Kiekvienas pakeitimas testuojamas rankiniu būdu
- Ateityje vertėtų pridėti bent kelis kritinius testus (smartParseJson, normalizeExtractedText, RuleEngine taisyklės)

### H) GitHub Pages deployment lag
- Vartotojas naudoja `jurgelaitis.github.io/PP-TS/TS_Asistentas.html`
- Pakeitimai turi būti commit'inami į GitHub repo
- Tarp pakeitimo lokalaus failo ir matomumo naršyklėje gali būti 1-5 min vėlavimas

---

## 8. Prioritetų sąrašas (jei tęsiama)

### 🟢 Aukštas prioritetas
1. **PP-QUAL atskiras modulis** - kvalifikaciniai reikalavimai. Yra parengtas detalus PROMPT (atskirame faile arba pokalbyje).
2. **Stabilizavimo testavimas** - su realiomis pirkimo situacijomis kelias savaites, klaidų rinkimas
3. **Performance optimizacija** - galimai sumažinti failo dydį (267 KB) per minify

### 🟡 Vidutinis prioritetas
4. **PP-MARKET-CONSULT** modulis (preliminari rinkos konsultacija)
5. **Šablonų biblioteka** PP-TS modulyje (greitos pradžios pagal pirkimo objekto tipus)
6. **Persistuojami status badges** (localStorage)
7. **Auto-save** - sugeneruotos TS išsaugojimas localStorage'e (atsigavimui po crash)
8. **Eksportuoto DOCX patobulinimai** - profesionalesnis stilius, antraštės/poraštės

### 🔵 Žemas prioritetas
9. **PP-* modulių cross-linkavimas** (handoff mygtukai)
10. **Bendras "Pirkimo kontekstas"** duomenų sluoksnis
11. **Pirkimo brandos lygio** klausimas vediklio pradžioje
12. **Automatinis testavimas** (Jest/Vitest)
13. **Internacionalizacija** (EN versija)

---

## 9. Failo struktūra ir svarbiausi komponentai

`TS_Asistentas.html` turi šiuos pagrindinius script blokus:

### Script #1 (helper): pdf.js worker init
Inicializuoja PDF.js worker'į iš cdnjs CDN.

### Script #2 (App moduli): pagrindinė aplikacijos logika
- `App` IIFE su visomis vediklio, render, navigation funkcijomis
- `state` - globalus state (settings, analysis, spec)
- `gen` - generavimo flow state (meta, ts, priceData, marketData, cvpisAnalogues)
- Funkcijos: `init`, `runAnalysis`, `runFullGeneration`, `renderGeneratedTs`, `renderMarketCard`, `applyAnalysisRecommendations`, `toggleSectionStatus`, ir kt.

### Script #3 (modules): biznio logikos moduliai
- `repairTruncatedJson`, `smartParseJson`, `extractBalancedJson`, `applyJsonRepairs`, `extractKeysWithRegex` - JSON parsavimas
- `fetchWithRetry` - API kvietimai su 429 retry
- `RuleEngine` - deterministinis taisyklių variklis
- `AIAnalyzer` - Claude API analizei
- `TSGenerator` - skeleton + sections + compliance generavimas + applyRecommendations + analyzeMarket
- `PriceEstimator` - kainos vertinimas
- `CVPISClient` - g-procure backend integracija
- `DocxBuilder` - .docx ir HTML-as-Word eksportas
- `CATEGORIES`, `KNOWLEDGE_BASE` - duomenys

### CSS struktūra
- `:root` su EPSO-G CSS kintamaisiais
- Komponentų stiliai: cards, buttons, badges, forms, tables, switches, modals
- Specifiniai: `.wizard-step`, `.stepper-step`, `.ts-status-badge`, `.ts-audit-summary`, `.price-display`

### HTML struktūra
- `<header>` su brand'u, status, settings button
- `<nav>` su skirtukais: Sukurti TS, Tikrinti TS, Pirkimo kontekstas, Analizė, Ataskaita, Žinių bazė
- `<main>` su `<section class="tab-panel">` kiekvienam skirtukui
- Modal'ai: Settings, Issue detail

---

## 10. Kontaktai ir konvencijos

**Konvencija dėl em dash:** **Nenaudoti** "—" niekur faile. Naudoti paprastą brūkšnį "-". Tai vartotojo preferencija.

**Lietuvių kalba:** Visi UI tekstai lietuviškai, profesinis tonas. Kodo komentarai gali būti angliškai arba lietuviškai (mišriai).

**Versijavimas:** Faile yra `TS Asistentas v1.0` antraštė. Po reikšmingų pakeitimų galima atnaujinti į 1.1, 1.2 ir t.t.

**Vartotojo preferencijos:**
- Žaliasis pirkimas - įjungtas pagal numatymą
- Kritinė infrastruktūra - išjungta pagal numatymą (Litgrid iniciatorius pats pasirenka kai aktualu)
- "Pasirinkite" placeholder dropdown'uose, ne "AI parinks"

**Bendros darbo principai:**
- Realių klaidų atsiradus naršyklėje - **DevTools Console screenshot** yra geriausias debug įvestis
- Kiekvienas reikšmingas pakeitimas - sintaksės patikra per `node -e "new Function(...)"`
- Kiekviena nauja funkcija - eksportuojama per `App.return { ... }` ar atitinkamo modulio return

---

## 11. Kaip tęsti darbus naujoje paskyroje

1. **Įkelti šiuos failus:**
   - `TS_Asistentas.html` (pagrindinis failas)
   - `PROJECT_CONTEXT.md` (šis failas)
   - (Pasirinktinai) Originalūs šaltinio dokumentai: EPSO-G stiliaus gairės, PĮ tekstas ir komentaras, dažniausių klaidų PDF

2. **Pradinis pokalbis su nauja AI:**
   > "Įkėliau TS_Asistentas.html ir PROJECT_CONTEXT.md. Tęsiu modulio vystymą. Prašau perskaityti abu failus, kad turėtum kontekstą, ir tada padėtum man su [konkretus uždavinys]."

3. **Pirmas patikrinimas:** Paprašyti AI peržiūrėti, ar visi 5 skriptai validūs:
   ```bash
   node -e "const fs=require('fs');const html=fs.readFileSync('TS_Asistentas.html','utf-8');const sr=/<script>([\s\S]*?)<\/script>/g;let m,i=0;while((m=sr.exec(html))!==null){i++;try{new Function(m[1]);console.log('Script #'+i+' OK')}catch(e){console.log('Script #'+i+' BROKEN: '+e.message)}}"
   ```

4. **Backend konfigūracija (jei reikia atstatyti):**
   - Serveris: `178.105.219.33` (g-procure-server)
   - Backend kelias: `/var/www/g-procure/index.js`
   - PM2 procesas: `g-procure`
   - Nginx config: `/etc/nginx/sites-enabled/g-procure` su `proxy_read_timeout 300s` ir CORS `always`
   - Anthropic API raktas: `process.env.ANTHROPIC_API_KEY` (.env faile)

5. **Tipinis darbo srautas:**
   - Vartotojas aprašo reikiamą funkciją
   - AI peržiūri esamą kodą (Grep + Read)
   - AI atlieka pakeitimą (Edit)
   - Sintaksės patikra (node -e)
   - Funkciniai testai (jei taikoma)
   - Vartotojas patikrina naršyklėje (Cmd+Shift+R)

---

**Šis dokumentas atspindi projekto būseną 2026 m. birželio mėn. Tolimesnės iteracijos turėtų atnaujinti šį failą su naujomis funkcijomis, pakeitimais ir žinomais apribojimais.**
