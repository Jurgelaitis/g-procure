# G-Procure pirkimo byla - failo formatas (1 versija)

Pirkimo byla - viena pirkimo kortelė su viskuo, ką apie pirkimą žino G-Procure vienoje naršyklėje, viename JSON faile.
Failą galima perskaityti ir be G-Procure (bet kuris JSON skaitytuvas, skaičiuoklė su JSON importu, programa), perduoti kolegai
ar įkelti kitoje naršyklėje.

- Sudaro ir skaito: `shared/pirkimo-byla.js` (`GP_BYLA`).
- Kompiuteriui skaitomas aprašas: JSON Schema (2020-12) `shared/schemos/pirkimo-byla-1.schema.json`,
  adresas `https://g-procure.com/shared/schemos/pirkimo-byla-1.schema.json` (failo lauke `$schema`).
- Kur rasti: kortelių puslapis (`pirkimu-korteles.html`) - atvertoje kortelėje skiltis „Pirkimo byla“
  („Atsisiųsti pirkimo bylą (JSON)“), sąrašo juostoje - „Įkelti pirkimo bylą“.
- Atsirado 2026-11-14 (G-Procure vizijos artimiausių žingsnių 1.3: kortelė tampa pirkimo byla).

Failas sudaromas naršyklėje ir niekur nesiunčiamas. Jame yra visi kortelės duomenys, ir asmenų vardai, kontaktai bei numatoma
vertė - todėl juo dalytis taip, kaip ir kitais pirkimo dokumentais. Tai ne oficialus registro ar CVP IS įrašas.

## Failo sandara

| Laukas | Kas tai |
|---|---|
| `$schema` | JSON Schema adresas. |
| `formatas` | Visada `g-procure/pirkimo-byla`. |
| `versija` | Formato versija (dabar 1). Keičiama tik nesuderinamai pakeitus sandarą. |
| `eksportuota` | Kada failas sudarytas (ISO 8601, UTC). |
| `sistema`, `pastaba` | Kas sudarė failą ir ką jis reiškia. |
| `pirkimas` | Pirkimo kortelė (žr. žemiau). |
| `reiksmes` | Kodų ir sudėtinių laukų reikšmės žmogui: `reiksmes.lt` ir `reiksmes.en` (pvz. `budas: "T-AK"` - „Atviras konkursas (tarptautinis pirkimas)“). Tik informacija. |
| `istorija` | Kortelės pakeitimų istorija, seniausi pirmi, ne daugiau 50 įrašų: kada, kas įrašė (`saltinis`, `modulis`), veiksmas (`sukurta`, `pakeista`, `archyvuota`, `grazinta`, `importuota`) ir kiekvienas pakeistas laukas su ankstesne ir nauja reikšme (`l`, `buvo`, `tapo`; sudėtiniams laukams - santrauka). |
| `istorijaPraleista` | Kiek seniausių istorijos įrašų pašalinta, viršijus 50. |
| `kilme` | Kiekvieno užpildyto lauko šaltinis: `saltinis`, `laikas` ir, kai yra, `citata` (pvz. skelbimo eilutė), `failas`, `nr` (CVP IS numeris), `modulis`. |
| `poveikis` | `perziureta` - kada žmogus pažymėjo, kad pakeitimų poveikį rezultatui peržiūrėjo; `paveikti` - rezultatai (grafikas, vertinimo metodika, rinkos apžvalgos veiksmai, pirkimo sąlygų juodraščiai), sudaryti pagal ankstesnius kortelės duomenis, su priežastimis tekstu. |
| `juodrasciai` | Su kortele susietų pirkimo sąlygų juodraščių aprašai (id, kada keista, pavadinimas, etapas). Patys juodraščiai į failą neįtraukiami. |

### `pirkimas`

Tuščias tekstas ar `null` - nenurodyta. Sumos - eurais be PVM, datos - `YYYY-MM-DD`, pasiūlymų terminas - `YYYY-MM-DDTHH:MM`
Lietuvos laiku.

| Laukas | Kas tai |
|---|---|
| `id`, `sukurta`, `atnaujinta` | Kortelės identifikatorius ir laikai. |
| `pavadinimas`, `numeris`, `cvpisNr` | Pirkimo pavadinimas, pirkimo vykdytojo numeris, CVP IS numeris. |
| `vykdytojas`, `rezimas` | Pirkimo vykdytojas (`litgrid`, `amber-grid`, `epso-g`, `energy-cells`) ir taikomas įstatymas (`PI` - Pirkimų įstatymas, `VPI` - Viešųjų pirkimų įstatymas). |
| `objektas`, `bvpz` | Pirkimo objektas (`prekes`, `paslaugos`, `paslaugos_it`, `darbai`, `misrus`) ir BVPŽ kodas. |
| `verte`, `budas` | Numatoma vertė ir pirkimo būdo kodas (`shared/procurement-methods.js`). |
| `dalys` | Pirkimo objekto dalys: `null` - nenurodyta, `[]` - neskaidomas, kitaip - `[{ pavadinimas, verte }]`. |
| `trukmeMen`, `pradzia`, `paskelbimas`, `sutartiesData`, `pasiulymuTerminas` | Sutarties trukmė mėnesiais ir datos. |
| `grafikas` | Pirkimo grafikas iš Pirkimų grafikų generatoriaus (etapai su datomis). |
| `vertinimas` | Pasiūlymų vertinimo metodika iš Ekonominio naudingumo skaičiuoklės (kriterijai, svoriai, priedo turinys; dalims - atskiri rinkiniai). |
| `iniciatorius`, `organizatorius`, `organizatoriausKontaktai` | Atsakingi asmenys. |
| `kriterijus`, `zaliasis`, `nacsaugumas`, `kvalifikacija`, `cpo`, `esLesos` | Pirkimo sprendimai (žodynai - schemoje). |
| `veiksmai` | Įrankių rekomenduoti veiksmai su būsena. |
| `busena`, `archyvuota` | Pirkimo būsena ir ar kortelė archyvuota. |

## Įkėlimas

Įkeliamas failas tikrinamas kaip nepatikimas: tik šis formatas ir ne naujesnė versija, ne didesnis kaip 3 MB, tik žinomi kortelės
laukai (kiti - neperkeliami ir pasakoma, kiek), tekstų ilgis ir sąrašų dydis ribojami, istorija, šaltiniai ir peržiūros žymos
patikrinami taip pat, kaip kortelėje. Prieš įrašant žmogus mato, kas faile; jei šioje naršyklėje jau yra ta pati kortelė (tas pats
`id`), jis renkasi „Pakeisti failo duomenimis“ arba „Įkelti kaip naują kortelę“ (jei kortelė šioje naršyklėje pakeista vėliau -
įspėjama). Įkelta kortelė išlaiko savo istoriją ir šaltinius, o istorijoje pridedamas įrašas „Įkelta iš pirkimo bylos“ su failo
vardu. `reiksmes`, `poveikis.paveikti` ir `juodrasciai` įkeliant neskaitomi: poveikis apskaičiuojamas iš istorijos iš naujo.

## Suderinamumas

- Nauji kortelės laukai pridedami be versijos keitimo ir aprašomi schemoje; senesnis puslapis jų nežinos ir pasakys, kad jie
  neperkeliami.
- Versija keičiama tik nesuderinamai pakeitus sandarą; naujesnės versijos failo senesnis puslapis neįkelia ir tai pasako.
- Bylos laukai, schema ir kortelės laukai sutikrinami testais (`shared/testai.html` grupė „Pirkimo byla atviru formatu“).

## Ko šiame formate nėra

- Pirkimo sąlygų juodraščių, sugeneruotų dokumentų ir įkeltų failų - jie lieka įrankiuose, kuriuose parengti.
- OCDS (Open Contracting Data Standard) formos: jai reikia registruoto `ocid` priešdėlio ir oficialaus leidėjo - tai
  organizacijos, ne prototipo sprendimas. Laukų atitikmenys (pavadinimas, numatoma vertė, BVPŽ, būdas, dalys, datos) būtų
  nesudėtingi, jei tokio poreikio atsirastų.
