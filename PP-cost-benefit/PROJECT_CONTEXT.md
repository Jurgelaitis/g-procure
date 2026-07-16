# PROJECT_CONTEXT.md

**Projekto pavadinimas:** Kaštų ir naudos analizės bei alternatyvų palyginimo įrankis
**Pagrindinis failas:** `kastu_naudos_analize.html`
**Organizacija:** LITGRID AB
**Autorius:** Arūnas Jurgelaitis, Head of Procurement
**Dokumento data:** 2026-06-11
**Versija:** v1.0 (MVP)

---

## 1. Projekto vizija

Sukurti **savarankišką, vienam rinkmenoje veikiantį (single-file HTML)** sprendimo paramos įrankį, kuris LITGRID AB pirkimų rengėjams ir sprendimų priėmėjams suteiktų standartizuotą, audituojamą ir metodologiškai pagrįstą **kaštų-naudos analizės (CBA) ir alternatyvų palyginimo (MCDA)** procesą didelės vertės (≥ 20 mln. EUR) pirkimuose.

**Ilgalaikė vizija:** įrankis turi tapti privalomu komponentu PSĮ įstatymo apimties didelės vertės pirkimuose, integruotu į bendrą LITGRID viešųjų pirkimų skaitmenizacijos ekosistemą kartu su VPT Ekspertas, PP-Protocols, PP-Graphs, PP-Durations ir PP-Report.

**Kertinė vertybė:** sprendimas turi būti rengiamas **prieš** pirkimo paskelbimą, o ne pateisinamas jam vykstant. Įrankis padeda atlikti šį poslinkį kultūroje.

---

## 2. Kodėl projektas buvo sukurtas

### Reguliacinis kontekstas
- Vyksta viešųjų pirkimų srityje aktyvi diskusija dėl reikalavimo didelės vertės pirkimams (≥ 20 mln. EUR) **privalomai** taikyti kaštų-naudos analizę bei alternatyvų palyginimą.
- LITGRID AB, kaip perkantysis subjektas pagal PSĮ įstatymą, yra tiesiogiai paveiktas šių diskusijų - energetikos infrastruktūros pirkimai dažnai viršija 20 mln. EUR ribą.
- Esamos praktikos Lietuvoje yra fragmentuotos - kiekviena organizacija atlieka CBA ad hoc, dažnai be metodologinio pagrindo.

### Vidiniai poreikiai
- LITGRID strateginiams projektams (sinchronizacija, NEPS, ENTSO-E TYNDP) reikalinga aiški, palyginama dokumentacija sprendimų priėmimui Valdybos lygiu.
- Reguliuojamosios veiklos kontekste - VERT gali reikalauti pagrindimo dėl į RAB (Regulated Asset Base) įtraukiamų investicijų.
- ES finansuojamuose projektuose (CEF, Modernizavimo fondas) CBA yra privaloma sąlyga.

### Praktinis poslinkis
- Pirkimo rengėjai turi struktūruotą formą, kuri pati primena, ko trūksta.
- Sprendimų priėmėjai gauna vieną santraukos puslapį su aiškia rekomendacija ir patikimumo lygiu.

---

## 3. Kokias problemas sprendžia

| Problema | Sprendimas įrankyje |
|---|---|
| **Subjektyvūs sprendimai** be aiškios alternatyvų analizės | Privaloma 3+ alternatyvų matrica, įskaitant „status quo" |
| **Slypintys gyvavimo ciklo kaštai** (žiūrima tik į CAPEX) | LCC su NPV, OPEX, periodinis remontas, eksploatacijos nutraukimas |
| **Neaiškūs prielaidos** (diskonto norma, horizontas) | Eksplicitiniai laukai su paaiškinimais ir rekomenduojamomis vertėmis (EK 4 %) |
| **Kokybinių aspektų ignoravimas** | Atskiras kokybinis blokas: ESG, strateginis tinkamumas, lankstumas |
| **Rizikų neįvertinimas** | 7 rizikos kategorijos su tikimybės × poveikio matrica |
| **„Trapūs" sprendimai** - laimėtojas keičiasi prie mažo prielaidų pokyčio | Jautrumo analizė su tornado diagrama ir scenarijų lyginimu |
| **Sunkiai auditojami sprendimai** | Visa analizė viename rinkmenoje, eksportuojama į PDF su parašais |
| **Sprendimų priėmėjų informacijos perteklius** | Atskira santraukos kortelė su MCDA balais, patikimumo „žalia/geltona/raudona" |
| **Manipuliuojami svoriai** | MCDA svoriai turi sumuotis į 100 %, įspėjimas jei ne |

---

## 4. Kokios funkcijos jau veikia (v1.0 MVP)

### 4.1 Struktūrinis pagrindas
- ✅ 8 skyrių navigacija (tab-based): Aprašymas → Alternatyvos → Kaštai → Nauda → Rizikos → MCDA → Jautrumas → Išvada
- ✅ Litgrid spalvinė schema (žalia paletė), profesionalus tipografika
- ✅ Responsive maketas (mobile-friendly)
- ✅ Spausdinimui pritaikyti CSS stiliai (PDF eksportui per naršyklę)

### 4.2 1 skyrius - Pirkimo aprašymas
- ✅ Pagrindiniai laukai: pavadinimas, kodas, padalinys, rengėjas, vertė, tipas, procedūra, trukmė
- ✅ **Automatinis 20 mln. EUR slenksčio tikrinimas** su vizualiu indikatoriumi
- ✅ Strateginio poreikio, funkcinio poreikio, status quo, susijusių projektų aprašymai
- ✅ Teisinis pagrindas (PSĮ / VPĮ / Koncesijos), reguliuojamosios veiklos statusas, ES finansavimas
- ✅ Analizės parengtumo dashboard (8 punktai su ✓/○ statusu)

### 4.3 2 skyrius - Alternatyvos
- ✅ Neribotas alternatyvų skaičius (numatyta 3: status quo + 2 alternatyvos)
- ✅ Pridėjimas / pašalinimas su patvirtinimu
- ✅ Tabuliarinis naršymas (alt-tabs su uždarymo mygtuku)
- ✅ Kiekvienai alternatyvai: aprašymas, tiekėjų rinka, techninis sprendimas, įgyvendinimo planas
- ✅ „Status quo" žymėjimas (palyginimo bazė)

### 4.4 3 skyrius - Kaštų analizė (LCC)
- ✅ Diskonto norma (numatyta 4 % pagal EK rekomendaciją energetikai)
- ✅ Analizės horizontas (1–50 m.)
- ✅ Likutinė vertė (taip/ne)
- ✅ CAPEX, OPEX, periodinis remontas (su N-metų dažnumu), eksploatacijos nutraukimas
- ✅ ES finansavimo automatinis atskaitymas iš CAPEX
- ✅ **NPV skaičiavimas** kiekvienai alternatyvai
- ✅ KPI kortelės su LCC verte
- ✅ Sukrauta stulpelinė diagrama CAPEX vs OPEX (NPV)

### 4.5 4 skyrius - Naudos analizė
- ✅ 5 kiekybinės naudos kategorijos: tinklo nuostoliai, ENS (Energy Not Supplied), CO₂, papildomas pajėgumas, kita
- ✅ 5 kokybinės kategorijos (skalė 1–5): strateginis tinkamumas, ESG, rinkos sveikatos palaikymas, lankstumas, vietinė pridėtinė vertė
- ✅ Naudos NPV skaičiavimas
- ✅ Vizualizacija

### 4.6 5 skyrius - Rizikos vertinimas
- ✅ 7 rizikos kategorijos: rinkos koncentracija, kainų svyravimai, terminai, vendor lock-in, reguliacinė, leidimai, ginčai
- ✅ Tikimybės × Poveikio matrica (skalė 1–5)
- ✅ Bendras rizikos balas alternatyvai
- ✅ Stulpelinė diagrama palyginimui

### 4.7 6 skyrius - Daugiakriterė matrica (MCDA)
- ✅ 5 svorinami kriterijai: NPV, LCC, Kokybiniai, Rizikos, Strateginė atitiktis
- ✅ Svorių sumos validavimas (turi būti 100 %)
- ✅ Min-max normalizavimas į 0–100 skalę
- ✅ Score bars vizualinis kiekvieno kriterijaus įvertinimas
- ✅ Bendras balas alternatyvai
- ✅ Lyginimo diagrama

### 4.8 7 skyrius - Jautrumo analizė
- ✅ Interaktyvūs slankikliai: CAPEX ±30 %, OPEX ±30 %, Nauda ±30 %, Diskonto norma ±3 pp
- ✅ Tornado diagrama (NPV jautrumas pagal kiekvieną parametrą)
- ✅ Scenarijų palyginimo lentelė (bazinis vs modifikuotas NPV)

### 4.9 8 skyrius - Išvada ir rekomendacija
- ✅ **Automatinė rekomendacija** su patikimumo lygiu:
  - Žalia (margin > 15 balų) - aiški rekomendacija
  - Geltona (5–15 balų) - su sąlygomis
  - Raudona (< 5 balų) - trapi, reikia papildomos analizės
- ✅ Sprendimo pagrindimo, rizikos mažinimo veiksmų, sutarties valdymo prioritetų laukai
- ✅ Parašų sekcija (rengėjas, padalinio vadovas, pirkimų vadovas)
- ✅ Pagrindiniai KPI: NPV, BCR, LCC, IRR, atsipirkimo laikas, rizikos balas
- ✅ Reitingo lentelė (1, 2, 3 vieta)

### 4.10 Bendros funkcijos
- ✅ Išsaugojimas į naršyklės localStorage
- ✅ JSON eksportas / importas
- ✅ PDF spausdinimas (per naršyklės print)
- ✅ Tooltipai prie sudėtingesnių laukų
- ✅ „Rengėjui" info dėžutės kiekviename skyriuje su praktiniais patarimais

---

## 5. Kokios funkcijos planuojamos (roadmap)

### v1.1 - Trumpasis horizontas (1–2 sav.)
- ⏳ **Excel eksportas** (XLSX) - strukturuotai pateikti rezultatus archyvui / VPT
- ⏳ **Lietuviški įgaliotų asmenų parašų laukai** su data ir pareigomis pagal Litgrid struktūrą
- ⏳ **Validavimo blokavimas** - neleisti judėti į kitą skyrių, kol neužpildyti privalomi laukai
- ⏳ **Realių pavyzdžių „presetai"** - užkrauti tipinį 330 kV linijos, transformatorių pirkimo arba pastotės pirkimo template
- ⏳ **Versijavimas** - sekti rengėjo daromus pakeitimus su laiko žyma

### v1.2 - Pažangus skaičiavimas
- ⏳ **Monte Carlo simuliacija** vietoj paprastos jautrumo - su skirstiniais (triangle, normal)
- ⏳ **Diskontuotas atsipirkimo laikas** (DPBP) papildomai prie nominalaus
- ⏳ **LCOE / LCOT** (Levelized Cost of Energy / Transmission) skaičiavimas energetikos projektams
- ⏳ **Tikrasis IRR** per Newton-Raphson, ne pirmojo neigiamo NPV taško
- ⏳ **Infliacijos koregavimas** - atskirti nominalų ir realų diskontą

### v1.3 - Integracijos
- ⏳ **VPT IS integracija** - automatiškai užpildyti pirkimo aprašymo laukus
- ⏳ **PP-Durations integracija** - paimti trukmę iš trukmių skaičiuoklės
- ⏳ **PP-Graphs integracija** - gauti procedūros grafiką
- ⏳ **Litgrid SAP/IFS integracija** - pateikti istorinius panašių pirkimų duomenis kaip benchmark

### v1.4 - AI papildiniai
- ⏳ **VPT Ekspertas integracija** - automatinis teisinis pagrindo patikrinimas
- ⏳ **AI rekomendacijos** kokybiniams vertinimams (sugest 1–5 balą pagal aprašymą)
- ⏳ **Pranešimo „pamatuoto" tekstas** - automatinis sprendimo pagrindimo black draft pagal įvestus duomenis

### v2.0 - Platforma
- ⏳ Migracija iš single-file HTML į **mažą daugia-puslapę aplikaciją** (Astro / Next.js)
- ⏳ Centralizuota duomenų bazė (PostgreSQL) - pakeisti localStorage
- ⏳ Vartotojų teisės ir paskyros (LITGRID AD integration)
- ⏳ Audit trail - kas, kada, ką keitė
- ⏳ Bendradarbiavimas realiu laiku (rengėjas + reviewer)
- ⏳ Šablonų biblioteka pagal pirkimo tipą

### v2.1 - Atviras šaltinis
- ⏳ Įrankis kaip open-source produktas Lietuvos perkantiesiems subjektams
- ⏳ Anglų / lietuvių kalbų perjungimas
- ⏳ Pritaikymas kitiems sektoriams: vandentvarka, transportas, paštas (pilna PSĮ apimtis)

---

## 6. Kokie technologiniai sprendimai buvo pasirinkti ir kodėl

### 6.1 Single-file HTML
**Sprendimas:** visas įrankis viename `.html` faile (HTML + CSS + JS inline).

**Kodėl:**
- Nereikia serverio, deployment, hosting.
- Veikia bet kuriame naršyklėje (Chrome, Edge, Firefox), įskaitant izoliuotus tinklus.
- Galima siųsti el. paštu kaip prikabinta failą.
- Atitinka LITGRID IT saugumo reikalavimus (no external dependencies = nesiunčiama duomenys į išorę).
- Lengvai versijuojamas Git'e.

**Trade-off:** ribota kompleksiškumo riba - ~3000 eilučių jau pasiekta. Toliau augant reikės modulizuoti (v2.0).

### 6.2 Chart.js (CDN)
**Sprendimas:** diagramoms naudojama Chart.js 4.4.1 iš cdnjs.cloudflare.com.

**Kodėl:**
- Subrendusi, atrodi profesionali, gerai dokumentuota.
- Nedidelis dydis (~70 KB).
- Tipinis sprendimas verslo dashboardams.
- CDN'as turi gerą uptime'ą.

**Alternatyvos atmestos:** D3.js (per kompleksiškas), inline SVG (per daug rankinio darbo), Recharts (reikalauja React).

### 6.3 Vanilla JavaScript (be framework'o)
**Sprendimas:** neimportuojama jokia JS biblioteka išskyrus Chart.js.

**Kodėl:**
- Single-file principas neleidžia React/Vue bundle.
- Funkcionalumas pakankamai paprastas - state objektas + render funkcijos.
- Mažesnė kreivė ateities prižiūrėtojui.
- Nėra build proceso - failą galima atidaryti tiesiog naršyklėje.

**Trade-off:** sudėtingiau valdyti state, kai funkcionalumas augs. v2.0 - migracija į framework.

### 6.4 LocalStorage duomenų išsaugojimui
**Sprendimas:** naudojama naršyklės `localStorage` API.

**Kodėl:**
- Nereikia serverio.
- Greitas, paprastas.
- Vartotojas turi pilną duomenų kontrolę.

**Trade-off:**
- Duomenys liks tik tame kompiuteryje ir naršyklėje.
- Nėra bendradarbiavimo.
- Nėra audit trail.
- Sprendimas - JSON eksportas / importas kaip backup mechanizmas.

### 6.5 NPV / IRR / BCR - vidiniai skaičiavimai
**Sprendimas:** finansiniai skaičiavimai parašyti iš nulio JS.

**Kodėl:**
- Energetinis CBA kontekstas turi specifikų (likutinė vertė, periodinis remontas, ES finansavimas).
- Bendrieji JS finansiniai paketai (financial-js, etc.) ne visada apima šiuos atvejus.

**Trade-off:** IRR skaičiuojamas paprastu būdu (pirmas neigiamas NPV taškas). v1.2 - perėjimas į Newton-Raphson.

### 6.6 MCDA - Weighted Sum Model (WSM)
**Sprendimas:** naudojamas paprastas svorinis sumavimas su min-max normalizacija.

**Kodėl:**
- Lengvai paaiškinama sprendimų priėmėjams.
- Audituojama.
- Tinka 3–7 alternatyvų atvejams.

**Alternatyvos atmestos:**
- AHP (Analytic Hierarchy Process) - per sudėtingas vartotojui.
- TOPSIS - gali būti pridėtas v1.2 kaip alternatyvus skaičiavimas.
- ELECTRE - per kompleksiškas šios apimties įrankiui.

### 6.7 Lietuvių kalba
**Sprendimas:** įrankis 100 % lietuvių kalba.

**Kodėl:**
- Tikslinė auditorija - LITGRID darbuotojai ir Lietuvos VPT.
- Teisinė terminologija (PSĮ, perkantysis subjektas, RAB) lietuviška.
- Vertimas į anglų kalbą - v2.1.

### 6.8 Spalvinė schema - Litgrid žalia
**Sprendimas:** pagrindinė spalva `#00853e` (Litgrid green), antrinė `#006a31`.

**Kodėl:** branding consistency su Litgrid identitetu.

### 6.9 Print stylesheet
**Sprendimas:** atskira `@media print` taisyklių sekcija.

**Kodėl:**
- PDF eksportas per naršyklę (Ctrl+P) yra paprasčiausias būdas.
- Nereikia external PDF biblioteka (pdfmake, jsPDF) - sumažina bundle dydį.
- Visa analizė puslapyje (visi panelai matomi spaudinant).

**Trade-off:** mažiau kontrolės dėl PDF formavimo, lyginant su jsPDF. Ateity galima įdėti.

---

## 7. Žinomi apribojimai

### 7.1 Funkciniai apribojimai
1. **IRR skaičiavimas** - supaprastintas (pirmas neigiamas NPV pjūvis), netikslus, kai cash flow turi kelis ženklo pasikeitimus.
2. **Jautrumo analizė** - vienpusė (po vieną parametrą), neapima koreliuotų pokyčių (pvz., CAPEX ir OPEX kartu).
3. **Nėra Monte Carlo** - tik deterministinis scenarijus + slankikliai.
4. **Diskonto norma** - viena vertė visam horizontui, neapima time-varying diskonto.
5. **Infliacija** - implicit'iškai laikoma 0 % (real prices).
6. **ES finansavimas** - taikomas tik CAPEX, ne OPEX subsidijoms.
7. **Likutinė vertė** - paprasta 10 % nuo CAPEX prielaida (nėra detalaus modelio).

### 7.2 Techninio sprendimo apribojimai
1. **LocalStorage** - duomenys liks tik naršyklėje, kurioje buvo įvesti. JSON eksportas privalomas backup'ui.
2. **Nėra bendradarbiavimo** - vienas vartotojas vienu metu, nėra change tracking.
3. **Nėra centralizuotos duomenų bazės** - sunku agreguoti analizę per visus pirkimus.
4. **Spausdinimui priklauso nuo naršyklės** - Chrome/Edge geriausiai, Firefox kartais netinkamai formuoja.
5. **Diagramų eksportas** - Chart.js diagramos spausdinasi į PDF, bet kokybė priklauso nuo naršyklės.
6. **Mobile patirtis** - veikia, bet alt-tabs ir lentelės geriausiai veikia ≥ 1024 px ekrane.

### 7.3 Metodologiniai apribojimai
1. **MCDA svoriai** - subjektyvūs, gali būti manipuliuojami. Mitigacija: aiškinimas, kad svoriai turi būti suderinti su sprendimų priėmėjais PRIEŠ vertinimą.
2. **Kokybiniai 1–5 vertinimai** - subjektyvūs. v1.4 - AI suggested ratings.
3. **Min-max normalizacija** - jautri outlieriams. Jei viena alternatyva turi labai didelę naudą, kitos „suplotomos" iki 0.
4. **Status quo** - turi būti aprašyta atskirai; įrankis automatiškai neapskaičiuoja status quo žalos.

### 7.4 Procesiniai apribojimai
1. **Įrankis ≠ sprendimas** - tai sprendimo paramos įrankis. Galutinis sprendimas - pirkimų komisijos / Valdybos atsakomybė.
2. **Reikalingas mokymas** - rengėjai turi būti instruktuoti, kaip pildyti laukus, ypač MCDA svorius ir kokybinius vertinimus.
3. **Nėra integracijos su VPT IS** - duomenys įvedami rankiniu būdu.

---

## 8. Prioritetų sąrašas (kitam darbo sesijui)

### 🔴 Aukštas prioritetas (turi būti v1.1)
1. **Excel (XLSX) eksportas** - VPT ir vidaus archyvui reikalinga lentelinė forma.
2. **Validavimo blokavimas** - neleisti pereiti į išvadą be užpildytų privalomų laukų.
3. **Lietuviški pavyzdžių „preset" šablonai** - bent 3: (a) 330 kV linijos statyba, (b) transformatorių pirkimas, (c) IT sprendimo pirkimas.
4. **Versijavimas** - Each save = new version, su laiko žyma ir komentaru. Naudinga audit'ui.
5. **Tikslesnis IRR** - Newton-Raphson metodas vietoj pirmojo neigiamo NPV.
6. **Realiosios likutinės vertės modelis** - su amortizacija ir tiesiniu nuvertėjimu, ne tik 10 % flat.

### 🟡 Vidutinis prioritetas (v1.2)
7. **Monte Carlo simuliacija** - bent 1000 iteracijų su trikampe / normaliąja distribucija pagal parametrą.
8. **LCOE / LCOT skaičiavimas** - energetikos projektams specifinė metrika.
9. **Diskontuotas atsipirkimo laikas (DPBP)** - papildomai prie nominalaus.
10. **Multi-currency support** - jei pirkimas vyksta EUR + USD (pvz., specifinė įranga).
11. **Infliacijos koregavimas** - real vs nominal discount rate atskyrimas.
12. **Eksportas į PDF per jsPDF** - geresnė kontrolė nei naršyklės print.

### 🟢 Žemas prioritetas (v1.3+)
13. **Komentarų sistema** - kiekvienam laukui ir alternatyvai galima palikti komentarą (reviewer feedback).
14. **VPT IS integracija** - REST API kvietimas pirkimų aprašymui užkrauti.
15. **Litgrid SAP/IFS benchmark duomenys** - paimti istorinius panašių pirkimų duomenis.
16. **AI rekomendacijos** kokybiniams vertinimams ir sprendimo pagrindimo tekstui (per VPT Ekspertas backend).
17. **Anglų kalbos versija** - internationalizavimas.
18. **Tema / dark mode** - kosmetinis.
19. **Pritaikymas mobiliesiems** - visiškai funkcionali mobile UI.
20. **Migracija į Astro / Next.js** (v2.0) - kai single-file limit'as pasiektas.

### 🔵 Strateginiai (v2.x)
21. **Centralizuota duomenų bazė** - PostgreSQL backend, audit trail, multi-user.
22. **AD / SSO integracija** - Litgrid darbuotojai login per Microsoft Entra ID.
23. **Bendradarbiavimas realiu laiku** - rengėjas + reviewer + vadovas kartu.
24. **Open-source plat'forma** Lietuvos perkantiesiems subjektams.
25. **Pritaikymas kitiems PSĮ sektoriams** - vandentvarka, transportas, paštas.

---

## 9. Failų sąrašas perdavimui į naują paskyrą

| Failas | Aprašymas | Privaloma? |
|---|---|---|
| `kastu_naudos_analize.html` | Pagrindinis įrankio failas (v1.0 MVP) | ✅ Taip |
| `PROJECT_CONTEXT.md` | Šis dokumentas - projekto kontekstas | ✅ Taip |
| `*.json` (eksportuoti duomenys) | Jei buvote pradėjęs konkretų pirkimo CBA | Opcionalu |

**Kaip tęsti darbus naujoje paskyroje:**

1. Įkelkite `kastu_naudos_analize.html` ir `PROJECT_CONTEXT.md` į naują Claude paskyrą.
2. Klauskite Claude: *„Aš pateikiu CBA įrankio failą ir projekto kontekstą. Perskaitykite PROJECT_CONTEXT.md ir patvirtinkite, kad supratote projekto viziją bei einamąsias prioritetus. Toliau norėčiau pradėti darbą prie [konkretus prioritetas iš sąrašo]."*
3. Tokiu būdu Claude turės pilną kontekstą ir galės tęsti darbus efektyviai.

---

## 10. Kontaktai ir kontekstas

**Projekto savininkas:** Arūnas Jurgelaitis
**Pareigos:** Head of Procurement, LITGRID AB
**El. paštas:** arunas.jurgelaitis@gmail.com (asmeninis) / [darbo el. paštas naujoje paskyroje]
**GitHub:** github.com/Jurgelaitis
**Susiję LITGRID projektai:** VPT Ekspertas, PP-Protocols, PP-Graphs, PP-Durations, PP-Report

**Teisinis pagrindas:**
- Lietuvos Respublikos pirkimų, atliekamų vandentvarkos, energetikos, transporto ar pašto paslaugų srities perkančiųjų subjektų įstatymas (PSĮ)
- ES Direktyva 2014/25/EU (Utilities Directive)
- ENTSO-E Guideline for Cost-Benefit Analysis of Grid Development Projects (3rd edition)

---

*Šis dokumentas yra gyvas - atnaujinkite jį kiekvieną kartą, kai pasikeičia projekto kryptis arba prioritetai.*

**Paskutinis atnaujinimas:** 2026-06-11 (v1.0 MVP perdavimas)
