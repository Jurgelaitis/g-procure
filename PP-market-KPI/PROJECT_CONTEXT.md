# PROJECT_CONTEXT.md

Rinkos rodiklių modulis: **Pirkimo rinkos apžvalga** (`EPSO-G_Rinkos_KPI_skydelis.html`).
Failo vardas nekeičiamas - jis yra gyvas URL ir portalo kortelės nuoroda.

Perrašyta 2026-09-05 po išorinio audito. Ankstesnė versija (rinkos KPI skydelis su 17 rodiklių,
bendru 0-100 balu ir tamsia tema) pakeista visiškai; šis dokumentas aprašo dabartinę.

---

## 1. Ką modulis daro

Atsako į vieną klausimą: **ką perkate ir į ką atkreipti dėmesį prieš skelbiant pirkimą**.
Naudotojas įrašo pavadinimą ir rūšį, gauna tris nepriklausomus vertinimus, iki trijų veiksmų
su pagrindimu ir indeksų kandidatus.

Neatsako į klausimą „kokia bendra rinkos rizika". Vieno suminio balo NĖRA sąmoningai:
jis nebuvo kalibruotas jokiems LITGRID pirkimams ir kūrė tikslumo įspūdį.

---

## 2. Kertiniai principai (nekeisti be aiškaus sprendimo)

1. **Duomenų trūkumas nėra „žalia".** Demonstracinis ar be duomenų rodiklis grąžina būseną
   „Nepatikrinta", niekada „Stabilu". Nulinės bazės atveju pokytis neskaičiuojamas.
2. **Blogiausias rodiklis, ne vidurkis.** Vienas stiprus signalas negali ištirpti vidurkyje -
   tai buvo pagrindinis senosios versijos trūkumas.
3. **Atitiktis vertinama atskirai.** Patvirtintas tiekimo ribojimas rodomas kaip atskiras
   kritinis klausimas, o ne pridedamas prie bendro skaičiaus.
4. **Modulis nenustato teisinių prievolių.** Nėra teksto „indeksavimas privalomas". Prievolę
   lemia sutarties rūšis, trukmė ir taisyklės, ne rodiklio spalva.
5. **Indeksavimo modelis siūlo tik KANDIDATUS, niekada svorių** (VPT metodika: svorius pagal
   sąnaudų struktūrą pasiūlymo formoje pateikia tiekėjai).
6. **VMDU nesiūlomas šalia SSKI** - darbo užmokestis jau yra SSKI dedamoji (VPT 53.2 p.).
   Abi taisyklės turi automatinius testus `testai.html`.

---

## 3. Duomenys

### Lietuvos indeksai - gaunami GYVAI iš VDA

OSP SDMX servisas leidžia kreiptis tiesiai iš naršyklės (patikrinta 2026-09-05:
`Access-Control-Allow-Origin: https://g-procure.com`). Serverio nereikia.

Bazė: `https://osp-rs.stat.gov.lt/ords/ipospp/ospp/rest_json/data/`

| Rodiklis | Dataflow | Pjūvis | Dažnis |
|---|---|---|---|
| SSKI inžineriniai statiniai | `S7R287_M2020423_2` | `CcM2020415` = Inžineriniai statiniai | mėn. |
| SSKI medžiagos | `S7R287_M2020424_2` | `PSSGM2020424` = Medžiagos ir gaminiai | mėn. |
| SSKI darbo užmokestis | `S7R287_M2020424_2` | `PSSGM2020424` = Darbo užmokestis ir pridėtinės išlaidos | mėn. |
| SSKI mašinos | `S7R287_M2020424_2` | `PSSGM2020424` = Mašinų ir mechanizmų darbas | mėn. |
| GKI | `S7R130_M2020330` | Pramonė / Visa rinka | mėn. |
| VKI | `S7R260_M2020121` | Vartojimo prekės ir paslaugos | mėn. |
| Paslaugų KI | `S7R290_M2020910_1` | Architektūros ir inžinerijos veikla | ketv. |
| VMDU | `S3R0050_M3060322` | Bruto / Lietuvos Respublika / su IĮ / Vyrai ir moterys | ketv. |

**SVARBU dėl bazių.** Senosios 2015 m. bazės serijos nebeskelbiamos ir grąžina tuščią atsakymą:
`S7R259` (GKI) ir `S7R271` (paslaugų KI) - jas pakeitė 2021 m. bazės `S7R130` ir `S7R290`.
Tas pats anksčiau nutiko SSKI. Prieš pridedant naują rodiklį - patikrinti prie šaltinio,
ar serija dar gyva; niekada nespėti kodo.

### Globalūs rodikliai - vedami ranka

LME, Brent ir panašūs nemokamos mašininės prieigos neturi. Kol reikšmė neįvesta, rodiklis
lieka demonstracinis ir į vertinimą kaip faktas nepatenka.

---

## 4. Klasifikatorius

Du žingsniai: **rūšis** (darbai / prekės / paslaugos / licencija) → **rinkos profilis** (10 profilių).

Esminė pataisa: raktažodis tikrinamas kaip **žodžio pradžia**, ne kaip fragmentas. Senoji versija
ieškojo `t.includes("rang")` ir atpažindavo jį žodyje „į**rang**os", todėl Matlab licencija
buvo vertinama kaip statyba su rekomendacija indeksuoti degalus.

Prieš raktažodžius veikia aiškios pirmenybės taisyklės (`TAISYKLES`), kiekviena kilusi iš
patvirtinto klaidos pavyzdžio: licencija, draudimas, studija, eksploatavimas, transportas.

Kai du profiliai skiriasi ≤1 balu, grąžinamas `tikrumas:"neaiskus"` ir naudotojo prašoma
patvirtinti - neaiškus atvejis nespėjamas.

**Rezultatas su 1651 tikru LITGRID pavadinimu (2026-09-05):** darbams (≈70 proc. vertės)
priskiriama 100 proc., prekėms 54 proc., paslaugoms 61 proc. Nepriskirti likučiai yra
smulkūs bendrieji pirkimai, kur teisingas elgesys - paklausti naudotojo.

---

## 5. Trys vertinimai

| Vertinimas | Iš ko | Ko NEreiškia |
|---|---|---|
| Kaina | Profilio kainų indeksai, blogiausias | Ne visos kainos pokytis |
| Terminas | Etapų intervalai vs. likęs laikas iki poreikio datos | Ne tiekėjo pažadas |
| Tiekėjų pasirinkimas | Profilio požymis (pvz. suderinamumas) | Ne tiekėjų skaičius internete |
| Duomenų kokybė | Kiek rodiklių patikrinta | Trūkumas nėra „rizikos nėra" |

Terminas skaičiuojamas atvirai: procedūra + gamyba + pristatymas + montavimas, prielaidos
rodomos naudotojui. Tai orientacinis intervalas, tikslinamas rinkos konsultacijoje.

---

## 6. Testai

`testai.html` - 42 naršykliniai testai, paleisti per http serverį iš repo šaknies.
Apima visus audito kontrpavyzdžius, darbų kalbą, žodžio ribą, vertinimo logiką,
SDMX skaitymą ir abi nekintamas indeksavimo taisykles. Tinklo užklausų nedaro.

**Node mašinoje nėra** - testai tik naršyklėje. Po kiekvieno pakeitimo serverį kelti
NAUJU PORTU (naršyklė kešuoja).

---

## 7. Kas liko ateičiai

- Globalių rodiklių (LME, Brent) reikšmių įvedimo sąsaja - dabar jie tik demonstraciniai.
- Atitikties įvykių sąrašas (`ATITIKTIES_IVYKIAI`) tuščias; reikia proceso, kas jį pildo.
- Ryšys su pirkimo kortele ir grafiku - atskiras etapas, reikalauja serverio.
- Vaidmenų modelis ir centrinė duomenų versija - prieštarauja „duomenys tik naršyklėje“
  nuostatai, todėl atskiras sprendimas.
