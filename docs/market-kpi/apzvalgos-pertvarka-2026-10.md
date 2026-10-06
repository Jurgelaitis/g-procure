# Pirkimo rinkos apžvalga: rezultato lango pertvarka (2026-10-06)

Užduotis (naudotojo, 2026-10-06): pirkimų specialistams sunku greitai nuskaityti „Pirkimo rinkos apžvalgos“ rezultatą ir
suprasti, kokių sutarties sąlygų ir indeksavimo taisyklių imtis. Prototipas - `prototipas-pirkimo-rinkos-apzvalga.html`
(vienas HTML failas, EPSO-G žetonai, be karkasų; pavyzdys „Microsoft licencijos“).

## 1. Kas yra dabar (išmatuota modulyje, `EPSO-G_Rinkos_KPI_skydelis.html`, `renderFocusCard` ~2835 eil.)

Rezultatas „Microsoft licencijos“ (profilis „Programinė įranga ir licencijos“, rūšis „Prekės“, demonstraciniai duomenys):
249 žodžiai, 367 px aukščio, du stulpeliai.

| Problema | Faktas |
|---|---|
| Kartojimasis | VKI reikšmė („augimas +3,4 % per 12 mėn. (nuo 2025 m. gegužės mėn.)“) rodoma **3 kartus**: „Pagrindiniai veiksniai“, „Indeksavimo gairės (VDA)“ ir „Orientacinis indeksavimo modelis“; iš viso „VKI“ tekste - 5 kartus. Priežastis - trys atskiri sąrašai (`drivers`, `vRows`, `kRows`) iš tų pačių rodiklių. |
| Veiksmai be formos | „Sutartiniai veiksmai (geltonas režimas)“ - `<ul>` su trimis eilutėmis be žymėjimo, be paaiškinimo, be priskyrimo pirkimui; vizualiai nesiskiria nuo faktų. Paaiškinimų „kodėl“ modulyje NĖRA - tik `cat.spend` (profilio sakinys) ir `metric.impact` (rodiklio sakinys). |
| Teksto siena | Indeksavimo dalis - 4 pastraipos ištisinio teksto (modelio aprašas, kandidatas su reikšme, ketvirtinio dažnio įspėjimas, atsisakymas) ir vienas „Kopijuoti tekstą“ visam rezultatui. Konkrečios sutarties formuluotės modulis **neturi** - tik indekso pavadinimą ir OSP kodą. |
| Rinkos profilis | Rodomas du kartus: pasirinkime viršuje ir kortelės antraštėje po pavadinimu. |

## 2. Nauja informacijos architektūra (wireframe)

```
┌ Antraštė: „Pirkimo rinkos apžvalga“ · [pavadinimas ______________] [Vertinti]
│ Rinkos profilis [select]  Pirkimo rūšis [select]  „nustatyta automatiškai - patikrinkite“
├─ 1 · DIAGNOZĖ  „Kokia rinka šiandien“  (faktai, kiekvienas rodiklis VIENĄ kartą)
│  ┌ Rinkos režimas ┐ ┌ VKI +6,1 % ┐ ┌ VMDU +9,5 % ┐   ← KPI kortelės: reikšmė, būsena, ribų juosta (3 % / 5 %),
│  │ RAUDONA, profilis│ │ raudona    │ │ geltona     │     šaltinis ir dažnis (OSP kodas), nuoroda į rodiklio kortelę
│  └─────────────────┘ └────────────┘ └─────────────┘
│  ▌Indeksavimo verdiktas: spaudimas didelis - sąlyga stipriai rekomenduojama; kandidatas VKI, VMDU - signalas, ne indeksas prekėms
├─ 2 · VEIKSMAI  „Ką daryti rengiant pirkimo dokumentus“
│  ┌ Sutartiniai veiksmai [raudonas režimas] ─┐ ┌ Indeksavimo sąlyga sutarčiai [VKI su slenksčiu] ──────────┐
│  │ eiga ▰▰▰▱ 3 iš 4                          │ │ ▸ 1 Indeksas ir šaltinis        [⧉ Kopijuoti sąlygą]       │
│  │ ☑ Išplėstinė tiekėjo patikra … (?)        │ │ ▸ 2 Peržiūros teisė ir slenkstis [⧉]                      │
│  │ ☐ Teisė nutraukti … (?)                   │ │ ▸ 3 Kam taikoma                  [⧉]                      │
│  │ ☐ Įvertinti priklausomybę … (?)           │ │ ▸ 4 Formulė ir apvalinimas       [⧉]  k = …, a1 = …       │
│  │ ☐ PRR eskalacija (?)                      │ │ ▸ 5 Procedūra                    [⧉]                      │
│  │ [Priskirti pirkimui] [Kopijuoti sąrašą]   │ │ [⧉ Kopijuoti visas penkias]  atsisakymas (vieną kartą)    │
│  └───────────────────────────────────────────┘ └────────────────────────────────────────────────────────────┘
└─ Poraštė: [Kopijuoti visą apžvalgą]  „Parengta … rankiniu būdu“
```

Principai: faktai (skaičiai) tik 1 bloke; 2 bloke jie minimi žodžiu („VKI viršija 5 % ribą“), ne kartojami su data;
veiksmas = žymimas elementas su „?“ paaiškinimu; indeksavimas = 5 žingsniai su atskiru kopijavimu; atsisakymo tekstas
(„Orientacinis pasiūlymas…“) vienoje vietoje. Telefone (< 900 px) stulpeliai sukrenta į vieną; KPI kortelės - po vieną.

## 3. Ką reikėtų padaryti modulyje (ne prototipe)

1. `renderFocusCard` - perrašyti išvestį į dvi sekcijas; `drivers` -> KPI kortelės su ribų juosta (`thr.yellow` / `thr.red` jau yra
   rodiklyje), `vRows` ir `kRows` - sujungti į vieną verdikto eilutę be reikšmių kartojimo.
2. Veiksmų sąrašas - žymimieji langeliai su būsena pirkimui (saugykla per `shared/saugykla.js`, raktas pagal pirkimo
   pavadinimą ar kortelės id); „Priskirti pirkimui“ - įrašas į pirkimo kortelę (`shared/pirkimo-kortele.js`, naujas laukas
   `veiksmai`) - bendras sprendimas, nes kortelė dar neturi veiksmų sąrašo.
3. „?“ paaiškinimai - `shared/paaiskinimas.js` (jau yra PP-salygos 2 žingsnyje); tekstus reikia PARAŠYTI: 8 profiliai × 3
   režimai × 2-4 veiksmai ≈ 70 trumpų „kodėl“. Prototipe - 4 pavyzdžiai raudonam programinės įrangos režimui (juodraštis).
4. Indeksavimo formuluotės - naujas duomenų blokas modulyje: šablonas pagal indeksų šeimą (VKI su slenksčiu; SSKI dedamosios;
   paslaugų KI / VMDU; žaliavos pagal kiekį), su pildomais laukais. Šaltinis - VPT tipinių paslaugų sutarties sąlygų 5.3.3 p.
   (VPT direktoriaus 2024-12-30 įsakymas Nr. 1S-209, e-tar `c9633836c69e11efa5ddd96c482819f5`, asr): peržiūros teisė ir 5 %
   slenkstis, tik neišpirkta dalis, vėlavimas dėl tiekėjo, VDA OSP šaltinis, k ir a1 apibrėžimai, apvalinimas (4 / 1 / 2
   skaitmenys), prašymo turinys, susitarimo terminas. Tipinės sąlygos parengtos VPĮ sutartims; LITGRID (PĮ) sutarties projekte
   jos - orientyras, todėl prie kiekvienos formuluotės - pastaba „galutinį tekstą tvirtina teisininkas“. SSKI ir žaliavų
   šeimoms VPT tipinėse paslaugų sąlygose atitikmens nėra (5.3.4 p. tik „nurodyti tvarką ir formules“) - jų formuluotes
   reikės rengti su teisininku arba iš LITGRID sutarčių praktikos.
5. Kopijavimas - `shared/kopija.js` kiekvienai sąlygai; `copyFocus()` lieka visai apžvalgai.
6. Testai: PP-market-KPI `testai.html` - VKI reikšmė rezultate vieną kartą, žymėjimas išsaugomas, kiekvienos sąlygos
   kopijavimas, 375 px be horizontalios slinkties; `shared/testai.html` - nauja būsena `PRIEINAMUMO_BUSENOS`.

## 4. Sprendimai, kurių reikia

1. Ar prototipo struktūra (Diagnozė / Veiksmai, 5 žingsnių sąlyga) tinka - tada perkeliu į modulį.
2. „Priskirti pirkimui“: į pirkimo kortelę (bendras laukas visiems moduliams) ar tik į šio modulio saugyklą?
3. Formuluotės: ar galima remtis VPT tipinėmis sąlygomis (VPĮ) kaip orientyru LITGRID (PĮ) sutartims, ar turite LITGRID
   sutarties projekto kainos peržiūros punktą, kurį naudoti vietoj jų?
4. „Kodėl“ tekstai veiksmams (~70): rašyti man su jūsų peržiūra, ar pateiksite iš praktikos?

## 5. Būsena (2026-10-06, po naudotojo pritarimo visiems siūlymams)

Įgyvendinta modulyje (`EPSO-G_Rinkos_KPI_skydelis.html`): `renderFocusCard` - Diagnozė (režimo kortelė, veiksnių kortelės su ribų
juosta, verdiktas) ir Veiksmai (kontrolinis sąrašas su „?“ ir „Įrašyti į kortelę“, penkių žingsnių indeksavimo sąlyga su atskiru
kopijavimu); `VEIKSMU_KODEL` - 75 LT ir 75 EN „kodėl“ tekstų juodraštis (naudotojas peržiūri); `shared/pirkimo-kortele.js` -
laukas `veiksmai` ir `pridekVeiksmus`; pirkimo kortelės juosta modulyje; testai 141 -> 149, `shared/testai.html` 209 -> 210 ir
dvi būsenos su apžvalga (telefonas, prieinamumas). Formuluotės - tik VKI / GKI / paslaugų KI / VMDU šeimoms pagal VPT 5.3.3 p.
sandarą; SSKI dedamosioms ir žaliavoms pagal kiekį - pastaba „rengiama su teisininku“. Skirtumas nuo prototipo: 2 žingsnio
pastaba nebekartoja rodiklio reikšmės („žr. 1 bloką“), kad kiekvienas skaičius liktų vienoje vietoje. Kiti įrankiai kortelės
veiksmų dar nerodo - kitas žingsnis, kai naudotojas nuspręs, kur jie reikalingi (PP-salygos 2 žingsnis, PP-protocol).

Naudotojo atsakymai 2026-10-06 (po įgyvendinimo): peržiūros slenkstis 5 % tinka (formuluotėje lieka numatytasis); kortelės veiksmus
rodyti PP-salygos 2 žingsnyje - įgyvendinta: blokas „Rinkos apžvalgos veiksmai šiam pirkimui“ po „Prieš generuojant“, tik skaitymui,
su nuoroda atgal į apžvalgą (`?kortele=`). „Kodėl“ tekstų peržiūra - dar laukia.

