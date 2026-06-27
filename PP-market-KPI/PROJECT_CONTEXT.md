# PROJECT_CONTEXT.md

Projekto kontekstas tęstinumui: rinkos rodiklių stebėjimo skydelis EPSO-G grupės viešiesiems pirkimams.

Šis dokumentas skirtas perduoti pilną projekto kontekstą kitai darbo sesijai (kitam Claude pokalbiui ar kitam vykdytojui), kad būtų galima efektyviai tęsti darbus turint tik `EPSO-G_Rinkos_KPI_skydelis.html` failą ir šį dokumentą.

---

## 1. Pagrindinė informacija

- Pagrindinis failas: `EPSO-G_Rinkos_KPI_skydelis.html` (vienas savarankiškas HTML)
- Versija: SCHEMA_VERSION = 3 (žiūrėti failo JS pradžioje)
- Publikuojama per GitHub Pages (Jurgelaitis/PP-Market-KPI repozitorija)
- Naršyklės talpyklos raktas: `epsog_rinkos_kpi_v3` (localStorage)
- Kalba: lietuvių (visas UI, AI santrauka, sutartiniai veiksmai)
- Apipavidalinimas: tamsi „valdymo skydelio" tema, žaliai akcentuojama (Litgrid spalva)

---

## 2. Projekto vizija

Įrankis, leidžiantis EPSO-G grupės įmonių (Litgrid ir kitų) viešųjų pirkimų iniciatoriams, organizatoriams bei dalyviams per kelias sekundes suprasti, kokie globalūs ir vietiniai rinkos pokyčiai vyksta ir kaip jie veikia konkrečių pirkimo kategorijų sutartis bei jų indeksavimą.

Tikslas ne tik stebėti, bet ir versti rinkos signalą į konkrečius sutartinius veiksmus (kainos peržiūros sąlygos, indeksavimo formulės, lead time buferiai, atitikties patikros), o taip pat tarnauti kaip pagrindinių rizikos rodiklių (PRR) šaltinis mėnesiniam Litgrid „Rizikų registro" pildymui.

---

## 3. Kodėl projektas buvo sukurtas

Pirkimų komandai trūksta vieno aiškaus rinkos paveikslo: globalūs rinkos rodikliai (Brent, LME, BDI, Hormūzas) yra ankstyvojo perspėjimo sistema, o Lietuvos VDA indeksai (SSKI, VKI, GKI, VMDU) yra teisinis pagrindas sutarčių indeksavimui. Šie du sluoksniai nebuvo sujungti jokiame įrankyje. Be jų sujungimo, sutarčių indeksavimo sąlygos rašomos „pagal jausmą", o ne pagal sistemingai stebimą signalą.

Antra priežastis: pirkimo iniciatoriai ir dalyviai dažnai nėra rinkos analizės profesionalai. Jiems reikia, kad sudėtinga informacija būtų pateikta paprastais šviesoforo principais ir konkrečiais veiksmais („ką daryti, kai geltona"), o ne grafikų masyvais.

Trečia priežastis: Litgrid mėnesinis rizikų valdymas reikalauja struktūruotų PRR. Šis įrankis paruošia kandidatus tiesiogiai įkėlimui į „Rizikų registrą".

---

## 4. Kokias problemas sprendžia

- Vienas šaltinis tiek globalių rinkos signalų, tiek LT indeksavimo rodiklių stebėjimui.
- Greitas, neapmokyto vartotojo suprantamas rinkos pokyčių vaizdas (šviesoforas + AI santrauka).
- Konkretūs sutartiniai veiksmai pagal kiekvieno rodiklio režimą (žalia/geltona/raudona).
- Pirkimo kategorijų sudėtinis rizikos vertinimas (kabeliai, transformatoriai, statyba, IT, paslaugos, draudimas).
- PRR kandidatai mėnesiniam rizikų pildymui.
- Visiškai lokalus veikimas (vienas .html failas), be jokios infrastruktūros.

---

## 5. Kas jau veikia (esamas funkcionalumas)

### 5.1 KPI struktūra (4 lygmenys, 17 rodiklių)

- A lygmuo „Kainos": Brent nafta, WTI nafta, LME aliuminis, LME varis, polimerai HDPE/PP/PET.
- B lygmuo „Lead time / pajėgumai": Baltic Dry Index, konteinerių frachtas (Drewry WCI), oro krovinių indeksas (TAC).
- C lygmuo „Tiekimo nutrūkimo rizika": Hormūzo tranzito indeksas, sankcijų/atitikties signalai (lygis per mėn.).
- D lygmuo „LT indeksavimo rodikliai (VDA)": SSKI bendras, SSKI medžiagos, SSKI mašinos, SSKI statybininkų DU, VKI, GKI, VMDU (IRT sektorius).

### 5.2 KPI kortelės savybės

- Naujausia reikšmė ir vienetas, 4 sav. (globaliems) arba 12 mėn. (VDA) pokytis.
- 12 reikšmių sparkline (SVG, be priklausomybių).
- Triggerių juosta (žalia/geltona/raudona ribos su aktyvia zona).
- Šviesoforo ženklas ir vaizdinė statuso juosta kortelės kairėje.
- Bazinis sutartinis veiksmas pagal esamą režimą.
- Šaltinio nuoroda (ICE, LME, Drewry, TAC, WTO Hormuz Tracker, VDA, ES sankcijų sąrašas).

### 5.3 Rinkos klimato matuoklis

- Pusiau apvalus SVG matuoklis (0-100, žalia/geltona/raudona).
- Skaičiuojamas tik iš A/B/C rodiklių (D yra atskiras indeksavimo sluoksnis).
- Pateikiamas trumpas tekstinis verdikto įvertinimas (Stabilu / Įtemptai / Rizikinga).

### 5.4 AI tendencijų santrauka

- Dinamiškai generuojama iš duomenų funkcija `generateSummary()`.
- Penkios pastraipos: bendra padėtis, didžiausi spaudimo taškai, ką stebėti, palanku pirkimams, poveikis EPSO-G/Litgrid pirkimams.
- Šešta pastraipa specialiai LT/VDA indeksavimo rodikliams.
- Šoninis „Ką stebėti šią savaitę" sąrašas (raudonai/geltonai).
- TSO-specifinė interpretacija: energija+logistika kartu → CAPEX rizika; oro kroviniai → OPEX/atsarginės dalys; Hormūzas → antrinė banga.

### 5.5 Pirkimų kategorijų rizikos žemėlapis (6 kategorijos)

1. Kabeliai ir laidai.
2. Transformatoriai / pastočių įranga (su TSO atsarginėmis dalimis).
3. Statyba-ranga ir CAPEX projektai (Harmony Link, LitPol Link, Gižai TS, RSVDC).
4. IT ir programinė įranga (su kibernetiniu saugumu).
5. Specializuotos paslaugos (projektavimas, techninė priežiūra).
6. Draudimas.

Kiekviena kategorija: svertinis sudėtinis rizikos rodiklis iš A/B/C rodiklių (D į kategorijų logiką neįjungtas pagal projektinį sprendimą), pagrindiniai draiveriai, vaizdinė skalė, ir sutartinių veiksmų sąrašas pagal esamą režimą.

### 5.6 Triggerių ir sutartinių veiksmų lentelė

Pilna lentelė visiems 17 rodiklių su žaliomis/geltonomis/raudonomis ribomis ir baziniais veiksmais. Skirta kaip metodinė nuoroda.

### 5.7 Redagavimo režimas ir duomenų valdymas

- Mygtukas „Redaguoti duomenis" atidengia naujos reikšmės įvedimo laukus prie kiekvienos kortelės.
- Išsaugojus perskaičiuojama visa logika ir AI santrauka.
- Duomenys saugomi naršyklės `localStorage` (raktas `epsog_rinkos_kpi_v3`).
- Eksportas/importas JSON formatu (failas su data pavadinime).
- „Pradiniai" mygtukas grąžina demonstracines reikšmes.
- Spausdinimas į PDF (yra optimizuoti @media print stiliai).

### 5.8 Schema versionavimas ir talpyklos atsparumas

- `SCHEMA_VERSION` konstanta JS faile.
- Keičiant struktūrą (nauji rodikliai, kategorijos, laukai) reikia padidinti `SCHEMA_VERSION`.
- Krovimo metu automatiškai išvalomi visi senesnių versijų `localStorage` įrašai.
- Sanity check: jei išsaugota struktūra neatitinka schemos (nėra D lygmens arba kategorijų skaičius ne 6), įrašas atmetamas.
- HTML antraštėje yra `Cache-Control: no-cache` meta tag-ai HTTP talpyklai mažinti.

---

## 6. Planuojamos funkcijos

### 6.1 Trumpalaikės (P1)

- Realių duomenų pakeitimas vietoje iliustracinių (rankiniu būdu suvedant einamąsias reikšmes).
- Naujo savaitinio/mėnesinio taško pridėjimas (šiuo metu redagavimas perrašo paskutinę reikšmę, neprideda naujo taško).
- D lygmens rodiklių pasirinktinis įtraukimas į kategorijų sudėtinį rizikos rodiklį (pvz., SSKI-DU svorinė įtaka statybos-rangos kategorijai).
- Sutarties indeksavimo skaičiuoklė: įvedus pradinę kainą, indeksavimo formulę ir laikotarpį, parodyti perskaičiuotą sumą pagal naujausius VDA rodiklius.
- Tooltips su metodikos paaiškinimu prie kiekvieno rodiklio (skirta pirkimo iniciatoriams, kurie nesusiduria su tais terminais kasdien).
- PRR snapshot eksportas (mėnesinis Word/PDF failas tiesiogiai įkėlimui į „Rizikų registrą").

### 6.2 Vidutinės trukmės (P2)

- LT/EN kalbų perjungimas (UI ir AI santrauka).
- Mobilus išdėstymas (šiuo metu yra responsive, bet kortelių dydis nepritaikytas telefonams).
- Branded PDF eksportas su EPSO-G/Litgrid antrašte ir spalvomis.
- Vartotojo personalizacija: kurie rodikliai pinami į „mano kortelės" rinkinį.
- Istorinis archyvas (mėnesinių snapshot'ų peržiūra ir palyginimas).
- Detalesnis paklausimas į konkrečius CAPEX projektus (Harmony Link, LitPol Link, Gižai TS, RSVDC) su tų projektų specifika.

### 6.3 Ilgalaikės (P3)

- Pasirinktinis backend duomenų sinchronizavimui tarp vartotojų (vienam vartotojui redaguojant, kiti mato).
- Live duomenų integracija ten, kur įmanoma (VDA atviri duomenys turi API; LME ir ICE reikalauja prenumeratos).
- Pranešimai (Slack, Teams, Email) kai rodiklis pereina į raudoną zoną.
- Vartotojų autorizavimas redagavimui.
- Audito žurnalas (kas, kada, ką pakeitė).
- Suplanuoti įkėlimai (automatinis VDA duomenų atnaujinimas kas mėnesį).

### 6.4 Naujų rodiklių kandidatai

- EUR/USD valiutos kursas (importo sutartims).
- ECB pagrindinė palūkanų norma (finansavimo kaštai).
- Lietuvos didmeninė elektros kaina (Nord Pool LT zona).
- ENTSO-E pajėgumų rinkos rodikliai.
- Vario laidų konkretus indeksas (e.g. CRU Wire and Cable).
- Statybinių medžiagų konkrečios kategorijos (gelžbetonis, struktūrinis plienas).

---

## 7. Technologiniai sprendimai ir jų pagrindimas

### 7.1 Vienas savarankiškas HTML failas

Pasirinkimas: vienas .html failas su inline CSS ir JS, be jokių išorinių priklausomybių.
Pagrindimas: veikia 100% offline, lengvai siunčiamas el. paštu, paprastas hostingas GitHub Pages, jokio build pipeline, jokio CDN rizikos, jokio versijų derinimo. Tinka EPSO-G aplinkai, kur prieiga prie išorinių paslaugų gali būti ribota.

### 7.2 Jokių JavaScript bibliotekų

Pasirinkimas: vanilla JS, jokio React, Chart.js, ar kitų.
Pagrindimas: failas mažas, krovimasis greitas, kodas suprantamas bet kuriam JS žinančiam žmogui be papildomo mokymosi, nėra priklausomybės nuo CDN ar paketų. Sparkline grafikai sukurti inline SVG (~30 eilučių kodo) - to pakanka skydeliui.

### 7.3 Tamsi „valdymo skydelio" tema

Pasirinkimas: tamsus fonas su žaliais akcentais, ryškiais šviesoforo signalais.
Pagrindimas: atitinka „valdymo skydelio" estetiką, šviesoforo spalvos kontrastingos ir aiškios, mažiau pavargusių akių ilgesniam stebėjimui. Žalia akcentinė atitinka Litgrid spalvinę kryptį.

### 7.4 CSS custom properties (kintamieji)

Pasirinkimas: visos spalvos ir tarpai apibrėžti `:root` kintamuosiuose.
Pagrindimas: temos koregavimas vienoje vietoje, lengva ateityje pereiti į šviesią temą ar pridėti LT/EN kalbų temas.

### 7.5 Inline SVG sparkline grafikai

Pasirinkimas: rankomis brėžiami SVG path elementai pagal duomenis.
Pagrindimas: jokios grafikų bibliotekos nereikia, mastelis bet kokiam dydžiui, lengva spalvinti pagal statusą, mažas kodo apimties dydis.

### 7.6 LocalStorage su schema versionavimu

Pasirinkimas: išsaugotų duomenų raktas `epsog_rinkos_kpi_v{N}`, kur N didinama keičiant struktūrą.
Pagrindimas: leidžia kaupti vartotojo įvestus duomenis tarp sesijų, bet neapsaugo nuo „vaiduokliškų" senų duomenų po atnaujinimo. Schema versionavimas yra elegantiškas sprendimas, kuris pats išsivalo.

### 7.7 Dinaminė AI santrauka

Pasirinkimas: santrauka generuojama JavaScript funkcija pagal esamus duomenis, ne saugoma statiškai.
Pagrindimas: kiekvienąsyk redaguojant duomenis santrauka pati persirašo, niekas neužstringa pasenusi. Naudoja paprastas šabloninių sakinių taisykles („jei energija+logistika kyla, sakyk CAPEX rizika"), ne LLM iškvietimą - todėl veikia offline.

### 7.8 Šviesoforo logika kaip suvienodintas sluoksnis

Pasirinkimas: visi rodikliai, kategorijos ir bendras klimatas redukuojami į žalia/geltona/raudona.
Pagrindimas: pirkimo iniciatoriai nėra rinkos analitikai. Trijų lygmenų vaizdas yra pakankamai konkretus veiksmui ir pakankamai paprastas sprendimui.

### 7.9 D lygmuo (VDA) nesumaišytas su A/B/C kategorijų logikoje

Pasirinkimas: kategorijų sudėtinis rizikos rodiklis skaičiuojamas tik iš A/B/C; VDA yra atskira informacinė sekcija.
Pagrindimas: globalūs rodikliai pasako „reaguok", VDA indeksai pasako „prie ko indeksuoji". Skirtinga prigimtis ir laikotarpiai (savaitė vs metai), todėl konceptiniai sluoksniai laikomi atskirai. Reikalui esant juos sujungti yra P1 prioriteto darbas.

### 7.10 Brūkšnių (em dash) politika

Pasirinkimas: faile ir AI santraukoje nenaudojami ilgieji brūkšniai („—"), tik paprastas brūkšnelis arba alternatyvi skyryba.
Pagrindimas: vartotojo pageidavimas (estetinis sprendimas).

---

## 8. Žinomi apribojimai

- Pateiktos reikšmės yra iliustracinės. Prieš naudojant sprendimams jas reikia pakeisti tikrais rinkos duomenimis.
- Nėra live duomenų srautų. Visi rodikliai (Brent, LME, BDI, VDA ir kt.) atnaujinami rankiniu būdu. Naršyklės CORS politika daugumoje atvejų neleidžia tiesiogiai kviestis komercinių duomenų API.
- LocalStorage yra prirakintas prie konkrečios naršyklės ir konkretaus profilio. Vartotojas, atidaręs skydelį kitoje naršyklėje ar kitame įrenginyje, matys pradines reikšmes (arba reikės importuoti JSON).
- Nėra multi-user sinchronizacijos. Du žmonės negali vienu metu redaguoti tos pačios kopijos.
- Nėra audito žurnalo. Redagavimai perrašo praeitas reikšmes be istorijos.
- Triggerių ribos yra rekomendacinio pobūdžio. Jos neatspindi konkrečių Litgrid vidaus dokumentų ar PSĮ teisinių reikalavimų ir prieš naudojant sprendimams jas reikia derinti su rizikos valdymo ir teisės skyriais.
- D lygmuo modeliuoja tik 7 VDA rodiklius. Realiai VDA skelbia daugiau (pvz., konkrečios SSKI sub-dedamosios, regioniniai VKI, sektoriniai VMDU).
- Redagavimas perrašo paskutinę reikšmę, bet neprideda naujo taško į istoriją (sparkline grafikas išlieka su tomis pačiomis 12 ar 13 reikšmių). Naujo taško pridėjimas yra P1 prioriteto darbas.
- AI santrauka yra šabloninių taisyklių variklis, ne tikras LLM iškvietimas. Tai prasižengia su „AI" pavadinimu, bet veikia 100% offline.
- „Specializuotos paslaugos" kategorijos sudėtinis rizikos rodiklis remiasi globaliais signalais, kurie nėra tiesioginis tikrasis kainų variklis. Tikrasis variklis yra VMDU (D lygmuo), kuris šiuo metu į kategorijų logiką neįtrauktas.

---

## 9. Prioritetų sąrašas

### P0 (turi būti padaryta prieš naudojant produkciškai)

1. Iliustracines reikšmes pakeisti realiomis einamosiomis vertėmis visiems 17 rodiklių. Atsakingas asmuo: pirkimų komanda.
2. Suderinti triggerių ribas su Litgrid rizikos valdymo skyriumi.
3. Suderinti sutartinius veiksmus su teisės skyriumi (kad rekomendacijos atitiktų PSĮ ir vidaus tvarką).
4. Apsispręsti dėl atnaujinimo dažnio (savaitė globaliems, mėnuo VDA) ir paskirti atsakingą asmenį.

### P1 (artimiausi vystymo darbai)

5. Naujo savaitės/mėnesio taško pridėjimo režimas (vietoj perrašymo).
6. D lygmens įtraukimas į kategorijų sudėtinį rizikos rodiklį pasirinktiniu būdu.
7. Sutarties indeksavimo skaičiuoklė (pagal pradinę kainą, formulę ir laikotarpį).
8. PRR snapshot eksportas Word/PDF formatu mėnesiniam rizikų pildymui.
9. Tooltips su metodikos paaiškinimais.
10. EUR/USD ir Lietuvos elektros kainos rodiklių pridėjimas.

### P2 (vidutinės trukmės)

11. LT/EN kalbų perjungimas.
12. Mobilus išdėstymas telefonui.
13. Branded PDF eksportas.
14. Detalesni CAPEX projektų puslapiai (Harmony Link, LitPol Link, Gižai TS, RSVDC).
15. Istorinis archyvas (mėnesinių snapshot'ų peržiūra).

### P3 (ilgalaikiai)

16. Backend ir multi-user sinchronizacija.
17. Live duomenų integracija per VDA atvirus duomenis.
18. Pranešimai į Slack/Teams/Email kai įvyksta statuso pakeitimas.
19. Audito žurnalas ir vartotojų autorizacija.

---

## 10. Kaip tęsti darbus naujoje sesijoje

### 10.1 Ką įkelti

Į naują sesiją reikia įkelti du failus:
- `EPSO-G_Rinkos_KPI_skydelis.html` (pagrindinis darbo failas)
- `PROJECT_CONTEXT.md` (šis dokumentas)

### 10.2 Pirmasis prašymas naujoje sesijoje

Galima naudoti tokį pradinį prašymą:

> Prisegu projekto kontekstą (`PROJECT_CONTEXT.md`) ir veikiantį skydelį (`EPSO-G_Rinkos_KPI_skydelis.html`). Tęsiame šio įrankio vystymo darbus. Pirmiausia perskaityk `PROJECT_CONTEXT.md`, kad suprastum projekto viziją, sprendimus ir prioritetus. Tada pradėsime nuo [konkrečiai įvardyti P0 ar P1 prioriteto punktą].

### 10.3 Svarbūs architektūriniai principai, kurių laikytis

- Vienas .html failas, jokių išorinių priklausomybių.
- Visas UI lietuvių kalba.
- Brūkšniai („—" ir „–") nenaudojami, tik paprastas brūkšnelis arba kita skyryba.
- Bet kokia struktūros pakaita reikalauja padidinti `SCHEMA_VERSION` konstantą.
- Spalvų schema ir tarpai per CSS kintamuosius.
- Visi skaičiavimai daromi iš centrinio `DATA` objekto - redagavimas yra „tikras" (perskaičiuoja viską).
- Po kiekvieno reikšmingo pakeitimo verifikuoti JS pajungus per Node (žr. žemiau).

### 10.4 Verifikacijos komanda (Node)

Po reikšmingo JS keitimo galima patikrinti, ar logika veikia, paleidus tokį testą:

```bash
node -e "
const fs=require('fs');
let js=fs.readFileSync('EPSO-G_Rinkos_KPI_skydelis.html','utf8').match(/<script>([\\s\\S]*)<\\/script>/)[1];
global.document={getElementById:()=>({setAttribute:()=>{},style:{},addEventListener:()=>{},classList:{toggle:()=>false,add:()=>{},remove:()=>{}},querySelectorAll:()=>[],parentElement:null,innerHTML:'',textContent:''}),querySelectorAll:()=>[],createElement:()=>({click:()=>{},style:{}}),body:{classList:{toggle:()=>false}}};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.window={print:()=>{}};global.confirm=()=>false;
global.Blob=function(){};global.URL={createObjectURL:()=>''};global.FileReader=function(){};
js+='\nconsole.log(\"climate=\",climateScore());DATA.categories.forEach(c=>console.log(c.id,categorySeverity(c).toFixed(2),categoryStatus(c)));';
try{eval(js);}catch(e){console.error('ERR',e.message);}
"
```

### 10.5 Pagrindiniai kodo orientyrai (kur ką ieškoti faile)

- `DEFAULT_DATA` objektas: visi rodikliai, kategorijos, jų svoriai ir veiksmai. Pakeitimai paprastai pradedami čia.
- `metrics` masyvas (DEFAULT_DATA.metrics): kiekvienas rodiklis su `id`, `group` (A/B/C/D), `series`, `thr`, `act`.
- `categories` masyvas: kategorijų sąrašas su `weights` ir `act`.
- `SCHEMA_VERSION`: didinama keičiant struktūrą.
- `severity()`, `categorySeverity()`, `climateScore()`: pagrindinės skaičiavimo funkcijos.
- `generateSummary()`: AI tendencijų santraukos generatorius. Šabloniniai sakiniai.
- `kpiCard()`, `catCard()`: kortelių atvaizdavimas.
- `renderTrigTable()`: triggerių lentelės atvaizdavimas.
- `loadData()`, `saveData()`: localStorage logika su versionavimu.

---

## 11. Susiję ištekliai

- Litgrid: https://www.litgrid.eu
- VDA (Valstybės duomenų agentūra): https://osp.stat.gov.lt
- LME oficialios kainos: https://www.lme.com/Market-data/LME-reference-prices/LME-Official-Price
- ICE Brent: https://www.ice.com/brent-crude
- Drewry WCI: https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry
- TAC oro krovinių indeksas: https://www.tacindex.com/
- WTO Hormūzo tracker: https://datalab.wto.org/Strait-of-Hormuz-Trade-Tracker
- ES sankcijų sąrašas: https://www.sanctionsmap.eu/
- GitHub repozitorija: https://github.com/Jurgelaitis/PP-Market-KPI

---

## 12. Pakeitimų istorija

- v1: pradinė versija, 3 KPI lygmenys (A/B/C), 5 pirkimų kategorijos, AI santrauka, redagavimo režimas.
- v2: pridėtas D lygmuo (LT/VDA indeksai), 7 nauji rodikliai įskaitant SSKI dedamųjų išskaidymą; SSKI „pagrindas" o ne „inkaras" formuluotė.
- v3 (esama): pertvarkyta kategorijų struktūra į 6 (TSO atsarginės dalys sujungtos su transformatoriais, atskirta paslaugų kategorija, pridėta draudimo kategorija, CAPEX įvardyti strateginiai projektai). Pridėti Cache-Control meta tag-ai ir schema versionavimo migracijos mechanizmas.

---

Dokumentą paruošė: Claude (Cowork) sesijoje 2026-06-11. Skirta perduoti darbo paskyrai.
