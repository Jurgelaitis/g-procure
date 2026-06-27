# G-Procure

Šis failas yra bendros instrukcijos Claude Code (ir Cowork) visai G-Procure sistemai.
Skaitomas automatiškai kiekvienos sesijos pradžioje. Laikyk jį `g-procure/` root'e.

---

## 1. Apie projektą

G-Procure - EPSO-G grupės viešųjų pirkimų skaitmeninių įrankių sistema.
Kiekvienas modulis yra savarankiškas, vieno failo įrankis (HTML/JS/CSS), padedantis
pirkimų komandai per visą pirkimo ciklą: planavimas -> techninė specifikacija ->
kvalifikacija -> grafikai -> komisijos sprendimai -> derybos -> ataskaitos.

Moduliai kol kas vystomi ir testuojami atskirai, bet gyvena viename repozitoriume
(monorepo). Bendra logika iškeliama į `shared/`, kad būtų taisoma vieną kartą.

---

## 2. EPSO-G grupė ir teisinis kontekstas (SVARBU - skaityk pirmiausia)

Sistema aptarnauja keturias grupės įmones su SKIRTINGU teisiniu statusu. Statusas
lemia, koks įstatymas ir kokios vertės ribos taikomos. Niekada nemaišyk VPĮ ir PĮ taisyklių.

| Įmonė | Statusas | Įstatymas | Direktyva |
|---|---|---|---|
| UAB EPSO-G | Perkančioji organizacija | VPĮ | 2014/24/ES (klasikinė) |
| LITGRID AB | Perkantysis subjektas | PĮ (sektorinis) | 2014/25/ES (sektorinė) |
| AB Amber Grid | Perkantysis subjektas | PĮ (sektorinis) | 2014/25/ES (sektorinė) |
| UAB Energy cells | Perkantysis subjektas | PĮ (sektorinis) | 2014/25/ES (sektorinė) |

- PĮ (sektorinis) = Pirkimų, atliekamų vandentvarkos, energetikos, transporto ar
  pašto paslaugų srities perkančiųjų subjektų įstatymas. Kai kuriuose moduliuose
  trumpinamas PSĮ - tai tas pats įstatymas.
- Daugumos modulių numatytasis kontekstas - LITGRID (PĮ, elektros perdavimas, TSO).
- Priežiūros institucija - VPT (Viešųjų pirkimų tarnyba).

---

## 3. Moduliai (kanoniniai pavadinimai)

Naudok mažąsias raides su brūkšneliu. Jei rasi senų variantų (PP-Planing,
"PP-market KPI", PP-negotation), traktuok juos kaip tą patį modulį.

| Folder | Paskirtis |
|---|---|
| `pp-home` | Portalas / paleidyklė visiems moduliams |
| `pp-plan` | Metinio pirkimų plano (MPP) analizė ir grupės centralizavimas |
| `pp-market-kpi` | Rinkos rodiklių stebėjimo skydelis (kainos, lead time, rizika, indeksavimas) |
| `pp-ts` | Techninių specifikacijų asistentas (AI generavimas + auditas) |
| `pp-qual` | Tiekėjų kvalifikacijos reikalavimų modulis (AI, proporcingumas) |
| `pp-cost-benefit` | Kaštų ir naudos analizė (didelės vertės pirkimai >= 20 mln. EUR) |
| `pp-graphs` | Pirkimų grafikų generatorius ir trukmių skaičiuoklė |
| `pp-protocols` | Pirkimų komisijos sprendimų centras (protokolai, pranešimai, auditas) |
| `pp-negotiation` | Derybų pasirengimo įrankis (BATNA/ZOPA, MEAT) |
| `pp-report` | Mažos vertės pirkimo pažymos (Aprašo 1 ir 2 priedai) |
| `pp-esg` | Centrinis ESG ir atitikties variklis (rizikos registras, sankcijos, ESRS) |

Senus / testinius repo (PP-Test, PP-Test-NT, PP-Durations, qskigali) NEįtraukti -
jie skirti archyvavimui, ne plėtrai.

---

## 4. Bendras kodas - `shared/` (vienas tiesos šaltinis)

Kertinė taisyklė: kross-modulinė logika gyvena `shared/`, NIEKADA nedubliuojama
kiekviename modulyje. Jei modulyje randi dubliuotą logiką - pasiūlyk ją perkelti į `shared/`.

| Failas | Ką laiko |
|---|---|
| `shared/thresholds.js` | VPT vertės ribos (galioja nuo 2026-01-01). Peržiūrimos kas 2 metus - atnaujink TIK čia |
| `shared/workdays.js` | Darbo dienų skaičiavimas + LR šventės. Pratęsk metus laiku (sena lentelė baigiasi 2030) |
| `shared/ai-proxy.js` | g-procure backend iškvietimas (Claude API) |
| `shared/epso-g.css` | Bendri EPSO-G stiliai ir vizualinis identitetas |

`shared/` kuriamas palaipsniui. Kai pirmą kartą iškeli bendrą logiką iš modulio -
sukurk atitinkamą `shared/` failą ir prijunk jį visuose moduliuose, kurie tą logiką naudoja.

---

## 5. Konvencijos

- **Brūkšniai:** NIEKADA nenaudok ilgo brūkšnio „—" (em dash). Naudok paprastą „-".
  Tai galioja ir tekstui, ir generuojamiems dokumentams, ir kodui.
- **Kalba:** pagrindinė - lietuvių (su pilnomis diakritikomis: ą č ę ė į š ų ū ž).
  Kur modulis jau dvikalbis - palaikyk LT + EN.
- **Pinigai:** numatytai EUR be PVM. Importuojant priimk JAV ir EU formatus
  (14,900.00 ir 14.900,00).
- **Datos:** skaičiuok darbo dienomis per `shared/workdays.js`, ne kalendorinėmis.
- **Architektūra:** kol kas vienas `.html` failas per modulį, be build žingsnio.
  Nepridėk build įrankių ar framework'ų be aiškaus poreikio ir sutarimo.

---

## 6. AI integracija

- AI iškvietimai eina per g-procure backend proxy. API raktas - serverio pusėje.
- NIEKADA nehardcodink API rakto į HTML.
- NIEKADA nesiųsk konfidencialių pirkimų duomenų į išorinį / vartotojišką AI.
- Numatytasis modelis: Claude Sonnet 4.6 (jei keisi - keisk vienoje vietoje, `shared/ai-proxy.js`).

---

## 7. Duomenys ir privatumas

- Duomenys saugomi TIK naršyklėje (localStorage). Tai sąmoninga duomenų suverenumo
  nuostata (valstybės kritinė infrastruktūra). Nieko nesiųsk į serverį be aiškaus pagrindo.
- NIEKADA nelaužk localStorage suderinamumo - esami vartotojų duomenys turi išlikti
  po atnaujinimų (jei keiti duomenų struktūrą, pridėk migraciją).
- ŽINOMA RIZIKA (ne galutinis sprendimas): `pp-protocols` audito žurnalas saugomas
  localStorage, nors PSĮ 103 str. reikalauja 4 metų saugojimo. Tai pažymėta kaip
  būsima migracija į backend'ą - neplėsk priklausomybės nuo localStorage šiam žurnalui.

---

## 8. Darbo eiga

- Dirbk po vieną modulį. Kai sakoma „dirbam su pp-qual" - keisk tik to folder'io failus.
- Bendras pakeitimas (vertės riba, šventė, stilius, AI modelis) - daromas `shared/`, vieną kartą.
- Commit'ai: aiškūs, su modulio prefiksu. Pvz.: `pp-qual: pridėta proporcingumo validacija`.
  Vienas modulis - vienas commit'as, kai įmanoma.
- Prieš push patikrink, kad modulis veikia atskirai (atidarius `.html` naršyklėje).
- Po darbo - commit ir push į vieną `g-procure` repo. Jokio rankinio failų kėlimo.

---

## 9. Teisiniai šaltiniai (kontekstas moduliams)

Naudok kaip kontekstą, BET tikrink su aktualiais šaltiniais - įstatymai keičiasi.
Jei nežinai dabartinės normos, pažymėk ir paklausk, neišgalvok.

- **PĮ 47 str.** - kvalifikacijos proporcingumas (tik su pirkimo objektu susiję reikalavimai)
- **PĮ 47 str. 7 d.** - VPT kvalifikacijos nustatymo metodika
- **PĮ 30 str.** - skaidrumas, lygiateisiškumas, nediskriminavimas
- **PĮ 28 str.** - neskaidymo į dalis pagrindimas
- **PĮ 66 str.** - neįprastai mažos kainos pagrindimas
- **PĮ 81 str.** - pagrindimas dėl nepirkimo per CPO
- **PĮ 97 str.** - pirkimų organizavimas ir vidaus kontrolė
- **PSĮ 103 str.** - audito sekos saugojimas (min. 4 metai)
- **VPT metodika** 2017-06-29 Nr. 1S-105, 21.1.4 p. - kvalifikacijos koeficientai (0,3 / 0,5 / 0,7)
- **VPT IT gairės** 2023-01-18 - specialistų reikalavimai
- **LAT** 3K-3-126/2010, 3K-3-222/2008 - proporcingumo praktika

---

## 10. Ko NIEKADA nedaryti

- NIEKADA nehardcodink VPT ribų, straipsnių numerių ar koeficientų į kiekvieną modulį -
  jie gyvena `shared/` (ar `data/`), kad keistum vieną kartą.
- NIEKADA nenaudok ilgo brūkšnio „—".
- NIEKADA neteik teisinio tikslumo iš atminties - tikrink arba klausk.
- NIEKADA nelaužk localStorage suderinamumo.
- NIEKADA nesiųsk konfidencialių duomenų į išorinį AI.
- NIEKADA nemaišyk VPĮ (EPSO-G) ir PĮ (LITGRID / Amber Grid / Energy cells) taisyklių.
