# Pirkimo kortelės susiejimas su ES pirkimų duomenų modeliu (eForms)

Pirkimo byloje (`docs/pirkimo-byla/formatas.md`) nuo 2026-11-19 yra laukas `eforms`: kurie pirkimo kortelės laukai atitinka
ES elektroninių viešųjų pirkimų skelbimų (eForms) verslo terminus (BT) ir kokia būtų jų reikšmė eForms lauke. Tai pasirengimas
ES pirkimų duomenų erdvei ir struktūrizuotiems pirkimo duomenims: tie patys duomenys turėtų būti įvedami vieną kartą.

- Sudaro: `shared/eforms-susiejimas.js` (`GP_EFORMS.susiek(k)`, `santrauka(k)`, `bylai(k)`).
- Rodoma: kortelių puslapyje, skiltyje „Pirkimo byla“ - „N kortelės laukų susieta su ES pirkimų duomenų modeliu (eForms SDK 1.16.0)“
  ir sąrašas, kas susieta ir kodėl kiti laukai nesusieti.
- Tai ne eForms skelbimas: XML nesudaromas ir niekur nesiunčiamas.

## Šaltinis

Leidinių biuro eForms SDK 1.16.0 (išleista 2026-11-04, licencija CC BY 4.0): `fields/fields.json` (laukų id ir verslo terminai)
ir `codelists/*.gc` (kodų sąrašai). Patikrinta 2026-11-19. Moduliuose `LAUKAI_SDK` ir `KODU_SARASAI` - šių failų ištraukos;
testai (`shared/testai.html`) tikrina, kad kiekvienas susiejimo įrašas naudoja tik jose esančius laukus ir kodus.

Atnaujinant SDK: patikrinti, ar laukų id ir kodų sąrašai nepasikeitė, atnaujinti `SDK`, `LAUKAI_SDK`, `KODU_SARASAI` ir šią lentelę.

## Taisyklė

Reikšmė susiejama tik tada, kai jos eForms atitikmuo vienareikšmis. Kur atitikmuo priklauso nuo aplinkybių, kurių kortelė
nežino, laukas nesusiejamas (ne spėjama).

## Susieti laukai

| Kortelės laukas | eForms laukas | Verslo terminas | Kada ir kaip |
|---|---|---|---|
| `pavadinimas` | `BT-21-Procedure` | Title | Visada; kalba LIT. Dvikalbis CVP IS pavadinimas („LT dalis/EN dalis“, `GP_VPT.dvikalbis`, kai įkeltas `shared/vpt-duomenys.js`) - du įrašai, LIT ir ENG (nuo 2026-11-20). |
| `numeris` | `BT-22-Procedure` | Internal Identifier | Pirkimo vykdytojo pirkimo numeris. |
| `vykdytojas` | `BT-500-Organization-Company`, `BT-501-Organization-Company` | Organisation Name, Organisation Identifier | Pavadinimas ir juridinio asmens kodas iš `shared/organizacijos.js`. |
| `rezimas` (su `budas`) | `BT-01-notice` | Procedure Legal Basis | Tik tarptautiniam pirkimui (`GP_METHODS` režimas „tarptautinis“): PĮ - `32014L0025`, VPĮ - `32014L0024`. Supaprastintam ir mažos vertės pirkimui - nesusiejama (nacionalinio skelbimo teisinis pagrindas kitas). |
| `objektas` | `BT-23-Procedure` | Main Nature | `prekes` - `supplies`, `paslaugos` ir `paslaugos_it` - `services`, `darbai` - `works`; mišrus - nesusiejama (pagrindinė rūšis nežinoma). |
| `bvpz` | `BT-262-Procedure`, `BT-263-Procedure` | Main / Additional Classification Code | 8 skaitmenų BVPŽ kodai be kontrolinio skaitmens; pirmas - pagrindinis, kiti - papildomi. |
| `verte` | `BT-27-Procedure`, `BT-27-Procedure-Currency` | Estimated Value | EUR be PVM. |
| `budas` | `BT-105-Procedure` | Procedure Type | Pagal procedūrą: atviras konkursas - `open`, ribotas - `restricted`, skelbiamos derybos - `neg-w-call`, neskelbiamos derybos - `neg-wo-call`, konkurencinis dialogas - `comp-dial`, inovacijų partnerystė - `innovation`. Mažos vertės apklausos, DPS, kvalifikacijos sistema, CPO, preliminarioji sutartis, vidaus sandoris, koncesija - nesusiejama. |
| `dalys` | `BT-137-Lot`, `BT-21-Lot`, `BT-27-Lot` | Purpose Lot Identifier, Title, Estimated Value | Kiekvienai daliai `LOT-0001`, `LOT-0002`...; neskaidomam pirkimui - viena dalis `LOT-0001`. |
| `trukmeMen` | `BT-36-Lot`, `BT-36-Lot-Unit` | Duration Period | Mėnesiais (`MONTH`), tik neskaidomam pirkimui. |
| `pasiulymuTerminas` | `BT-131(d)-Lot`, `BT-131(t)-Lot` | Deadline Receipt Tenders | Tik atviram konkursui (kitais būdais kortelės terminas gali būti paraiškų) ir neskaidomam pirkimui; data ir laikas su Lietuvos laiko juosta (`+02:00` / `+03:00`). |
| `kriterijus` | `BT-539-Lot` | Award Criterion Type | Kaina - `price`, sąnaudos - `cost`, kainos ir kokybės santykis - `quality`, `price`, sąnaudų ir kokybės santykis - `quality`, `cost`; tik neskaidomam pirkimui. |
| `vertinimas` | `BT-734-Lot`, `BT-541-Lot-WeightNumber` | Award Criterion Name, Weight Number | Kriterijų pavadinimai ir lyginamieji svoriai, tik neskaidomam pirkimui ir kai metodikoje nėra atskirų rinkinių dalims. Svorio rūšis (`BT-5421`: procentai ar balai) nesusiejama - metodika jos nenurodo vienareikšmiškai. |
| `zaliasis` | `BT-06-Lot` | Strategic Procurement | „Taip“ - `env-imp` (poveikio aplinkai mažinimas), tik neskaidomam pirkimui; „Ne“ nesusiejama (`none` reikštų, kad nėra jokio strateginio pirkimo). |
| `esLesos` | `BT-60-Lot` | EU Funds | „Taip“ - `eu-funds`, „Ne“ - `no-eu-funds`, tik neskaidomam pirkimui. |

## Nesusieti laukai ir kodėl

Kortelės laukai, kurie susiejami tik tam tikru atveju (pasiūlymų terminas - tik atviram konkursui, dalies lygio laukai - tik neskaidomam pirkimui, teisinis pagrindas - tik tarptautiniam pirkimui ir kt.), kortelių puslapyje rodomi sąraše „Užpildyti, bet šiai kortelei nesusieti laukai“ su priežastimi (`GP_EFORMS.praleisti(k)`, nuo 2026-11-20).

| Kortelės laukas | Kodėl |
|---|---|
| `cvpisNr` | Nacionalinės sistemos numeris; eForms procedūros ir pranešimo identifikatorius suteikia skelbimą siunčianti sistema. |
| `pradzia` | Vidaus planavimo data. |
| `paskelbimas` | Kortelėje - diena, nuo kurios skaičiuojami terminai: tarptautiniam pirkimui - skelbimo išsiuntimo diena (eForms BT-05), supaprastintam - paskelbimo CVP IS diena (eForms atitikmens nėra). Nesusiejama, nes kortelėje data gali būti planuojama, o BT-05 įrašoma siunčiant skelbimą (patikslinta 2026-11-20). |
| `sutartiesData` | Planuojama data; eForms sutarties sudarymo data (BT-145) - tik sutarties skyrimo skelbime. |
| `grafikas`, `veiksmai` | eForms jų neturi. |
| `iniciatorius`, `organizatorius`, `organizatoriausKontaktai` | Asmens duomenys - sąmoningai neperkeliami. |
| `nacsaugumas` | eForms leidimo dirbti su įslaptinta informacija laukas (BT-578) - kita sąvoka. |
| `kvalifikacija` | eForms atrankos kriterijai aprašomi kiekvienas atskirai; kortelėje - tik kas tikrinama. |
| `cpo` | Nacionalinė priemonė. |
| `busena`, `archyvuota` | Būsena eForms nurodoma skelbimo rūšimi. |
| `kilmesReikalavimas`, `pedsakoReikalavimas`, `pasoReikalavimas` | eForms SDK 1.16.0 neturi terminų šiems reikalavimams; kilmės šalies laukas (BT-191) - tik pasiūlymui sutarties skyrimo skelbime. |
| `nziaTaikymas` | eForms SDK 1.16.0 neturi atskiro termino Reglamento (ES) 2024/1735 pirkimų reikalavimams. |

Naujas kortelės laukas turi būti įrašytas arba į susiejimą, arba į `NESUSIETI` su priežastimi (sargas `shared/testai.html`).
