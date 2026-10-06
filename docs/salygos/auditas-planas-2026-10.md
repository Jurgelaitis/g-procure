# Pirkimo sąlygų tikrinimas (auditas): koncepcija ir įgyvendinimo planas (2026-10-06)

Naudotojo užduotis (2026-10-06): PP-salygos modulyje sukurti pagalbinę funkciją pirkimo vykdytojams ir VPK nariams,
kuri patikrintų jau parengtus arba iš išorės gautus pirkimo dokumentus prieš juos tvirtinant. Trys sritys: palyginimas su
standartine forma (Smart Diff ir versijos), atitikties ir rizikos kontrolė (taisyklės ir DI), vartotojo kelionė ir
rezultato langas.

Šis dokumentas - planas sprendimui. Kodas dar nerašytas; skaičiai 1 skyriuje - išmatuoti 2026-10-06 su tikrais LITGRID
šablonais ir tikru modulio generuotu paketu.

---

## 0. Kas jau yra (pamatas, ne nuo nulio)

| Turimas | Ką moka | Kiek tinka auditui |
|---|---|---|
| `shared/dokumentai.js` (GP_DOK) | DOCX, PDF, ODT, ZIP skaitymas naršyklėje, blokai su vieta (psl. / pastr. / lentelė) citatoms; DOCX lentelių langeliai | Įkėlimas ir citatos - tiesiogiai |
| `skelbimo-parengtis.html` + `shared/parengtis.js` | 18 kryžminių patikrų tarp skelbimo, SPS, TS, sutarties ir priedų (kalba, dalys, terminas, būdas, vykdytojas, trukmė, priedų nuorodos, punktų dublikatai, abi alternatyvos, „Pasirinkite elementą“); lygiai kliūtis / tikrinti / info / gerai; tik taisyklės, be DI | Dokumentų tarpusavio prieštaravimai - jau yra; išmatuota su 4 viešais LITGRID paketais, klaidingų faktų 0 |
| PP-salygos `templates/` (64 LITGRID šablonai) ir `zemelapiai/` | Kiekvienam šablonui - sąlygų blokai (šakos, alternatyvos), raudonas sluoksnis, tuščios vietos, intarpai | Palyginimo su forma pagrindas: žinoma, kuri dokumento dalis kintama, o kuri nekintama |
| PP-salygos švarumo patikra („0 raudonos“) | Raudonas šablono tekstas, „____“, likę komentarai | Neužbaigto dokumento kliūtys |
| `shared/taisykles.js` (GP_TAISYKLES) | Rūšis pagal vertę, būdas ir vertė, trumpiausi terminai, dokumentai pagal būdą - su `GP_TEISE` nuoroda | Teisės taisyklės be DI |
| `shared/teises-nuorodos.js` (GP_TEISE) | Registras: PĮ / VPĮ / Metodika / žalieji, kiekviena nuoroda perskaityta e-tar; raktai `ts_dokumentuose`, `sutartis_dokumentuose`, `ebvpd_dokumentuose`, `dokumentu_aiskumas`, `nacsaugumas`, `met_*` ir kt. | Privalomų elementų katalogas - tik iš čia |
| PP-qual (Metodika, proporcingumas, DI auditas su citatomis) | Kvalifikacijos reikalavimų vertinimas | Kvalifikacijos reikalavimų tikrinimas - perimti variklį |
| PP-salygos A5 (`ai-patarejas.js`) | DI siūlo tik su pažodine citata, citata tikrinama PRIEŠ rodant, priima žmogus | DI sluoksnio taisyklės - perimti |
| PP-teise (`pirkimuiHTML`) | Teisės pokyčiai konkrečiam pirkimui | Įspėjimai apie naujas normas |
| `shared/di-zymejimas.js`, `shared/docx-stiliai.js` | DI žymėjimas, oficialus Word stilius | Ataskaitai |

Svarbiausia išvada: tarpusavio patikra (skelbimo parengtis) jau egzistuoja kaip atskiras puslapis. Antro tikrinimo
įrankio daryti nereikėtų - siūlau vieną variklį ir vieną įėjimą (žr. 5 sk.).

---

## 1. Palyginimas su standartine forma (Smart Diff ir versijos)

### 1.1. Matavimas (2026-10-06)

Pastraipų lygio palyginimas (normalizuotas tekstas: tarpai, kabutės, numeriai tekstu; seka sulyginama Myers / LCS
būdu, pakeista pastraipa - panašumas >= 0,6), Python, 46-96 ms dokumentui.

**A. LITGRID formos versijos (sena forma iki 2026-08-07 įsakymo Nr. 26IS121 prieš naująją):**

| Šablonas | Pastraipų | Vienodos | Pakeistos | Pašalintos | Pridėtos | Su raudonu tekstu |
|---|---|---|---|---|---|---|
| AK LT SPS | 435 | 424 | 4 | 1 | 7 | 95 (21 %) |
| TSD LT SPS | 451 | 440 | 4 | 1 | 7 | 105 (23 %) |
| SSD LT SPS | 426 | 403 | 16 | 1 | 7 | 97 (22 %) |
| MVP LT SPS | 269 | 266 | 2 | 1 | 1 | 94 (34 %) |
| AK LT BPS | 254 | 251 | 3 | 0 | 0 | 0 |

Išvada: sulyginimas stabilus; dokumentas, parengtas pagal **senesnę formą**, atpažįstamas tiksliai ir skirtumas mažas
(3-24 pastraipos). Pakeitimai dažnai pastraipos viduryje (pradžia sutampa), todėl rodyti reikia žodžių lygiu.

**B. Mūsų šablonų taisymai (oficiali 2026-08-07 forma prieš modulio pataisytą):** 0-9 pastraipos, daugiausia tarpai -
normalizavimas juos sugeria; likusius (rašybos, nuorodų taisymai, `sablonu-taisymai.py`) reikia žinomų pakeitimų sąrašo.

**C. Modulio sugeneruotas paketas prieš šabloną (T-AK ir S-SD, be DI):**

| | Vienodos | Perkeltos | Laukti: raudonas sluoksnis | Laukti: žemėlapio šakos | Nepaaiškinti |
|---|---|---|---|---|---|
| AK LT BPS | 254 / 254 | 0 | 0 | 0 | **0** |
| AK LT SPS | 313 | 20 | 59 | 37 | **24** (5 pašalintos, 1 pakeista, 18 pridėtų) |
| SSD LT SPS | 317 | 21 | 57 | 26 | **22** |

„Perkeltos“ - lentelių eilučių skaidymas (Pages taisymas) pakeičia pastraipų eilę; be perkėlimų atpažinimo jos atrodytų
kaip 20 ištrintų ir 20 pridėtų. „Nepaaiškinti“ (~5 % pastraipų) - visi kyla iš generatoriaus mechanizmų, kurių žemėlapis
neaprašo: kvalifikacijos lentelė kiekvienai daliai, 8.1 p. vertinimo kriterijus, užtikrinimo alternatyva, užpildyti
pavadinimas ir data, skyrių numeriai.

**D. Tikri paskelbti LITGRID dokumentai (7 vieši CVP IS paketai, 2026-09 - 2026-10; 5 SPS ir 5 BPS DOCX formatu, rengti ranka Word'e):**

- **Formos atpažinimas:** visiems 10 dokumentų pirmas pasiūlymas - teisinga šeima (AK, TSD LT/EN, SSD, MVP); BPS sutapimas 1,00,
  SPS 0,56-0,82 (pasirinktos alternatyvos sumažina sutapimą). Senos ir naujos formos SPS skiria tik 0,01 - versijai nustatyti
  reikia tik versijoms būdingų pastraipų, ne bendro balo. 6-36 ms dokumentui.
- **Visi 5 BPS sutampa su mūsų šablonu pastraipa į pastraipą** (254/254, 290/290, 265/265, 1010/1010).
- **SPS po klasifikacijos** (raudonas sluoksnis, žemėlapio šakos, perkėlimai, turinys, numeracija, priedų sąrašas, užpildytos vietos,
  „A / B“ alternatyvos, skyryba): liko 2, 18, 19, 51 ir 53 „nukrypimai“. Naujausias dvikalbis TSD SPS - 2 (tik „Rengė“ eilutė).
  Kituose dauguma - neprivalomos formos dalys, kurias generatorius žino (nacionalinio saugumo nuostatos, kvalifikacijos reikalavimų
  paragrafai „Jei keliamas reikalavimas dėl ...“, užtikrinimo alternatyva, žaliųjų paaiškinimas), bet žemėlapis jų kaip blokų neturi.
  Todėl reikia **neprivalomų formos dalių registro** (iš generatoriaus logikos), kad jos būtų „laukti pakeitimai“, ne nukrypimai.
- **Tikras radinys:** viename paskelbtame AK SPS nėra formoje esančios ES sankcijų nuostatos (Rusijos subjektų dalyvavimo
  draudimas pagal ES Tarybos reglamentą); ta pati nuostata lieka to paketo BPS. Tai būtent toks nukrypimas, kurį VPK turi matyti -
  kartu su informacija, kad nuostata yra kitame paketo dokumente. Pamoka: ta nuostata formoje yra **lentelėje**, todėl lentelių
  negalima traktuoti kaip vien pildomų - pašalinta nekintama lentelės nuostata irgi yra nukrypimas.
- SSD ir MVP formose (abiejose versijose) sankcijų nuostatos nėra - jų atveju palyginimas su forma jos trūkumo nerodytų.

**Kas iš to išplaukia:**
1. BPS nekintama - bet koks BPS pakeitimas yra tikras nukrypimas (stiprus signalas VPK).
2. SPS bendru palyginimu su šablonu duotų ~5 % triukšmo net nepakeistam modulio dokumentui - VPK to nepriims.
3. Todėl reikia **trijų lygių** (1.2). Ranka parengtų dokumentų triukšmui sumažinti - neprivalomų formos dalių registras (D).

### 1.2. Trys palyginimo lygiai

1. **Generavimo pasas (tiksliausias).** Generatorius į Word savybes (`docProps/custom.xml`, kaip DI požymiai) įrašo
   šablono id, formos versiją (teksto maiša) ir atsakymus. Tikrinant tas pats variklis iš tų pačių atsakymų sugeneruoja
   lauktą dokumentą ir palygina. Rezultatas: **0 laukiamų skirtumų**; viskas, kas skiriasi, - ranka padaryta po generavimo.
   Pasas taip pat parodo, kad dokumentas pasenęs (forma pasikeitė nuo generavimo).
2. **Žinoma LITGRID forma (be paso).** Šablonas atpažįstamas pagal panašumą (pastraipų maišos prieš 64 šablonus ir
   ankstesnes jų versijas; siūloma, patvirtina žmogus). Skirtumai klasifikuojami: raudonas sluoksnis ir žemėlapio šakos -
   „laukti“, perkėlimai - „perkelta“, likę juodo teksto pakeitimai - **nukrypimai nuo formos**. Tikėtina ~5 % triukšmo -
   rodoma atskirai „Neatpažinti pakeitimai“, ne kaip klaida.
3. **Bet koks palyginimas (versijos).** Du failai: ankstesnė to paties dokumento versija ir nauja (VPK: „kas pasikeitė nuo
   praeito posėdžio“), arba kitos organizacijos forma. Be klasifikacijos - tik pridėta / pašalinta / pakeista / perkelta.

### 1.3. Palyginimo UX

- **Keturi pakeitimų tipai, kiekvienas su ženklu ir žodžiu** (ne vien spalva - WCAG 1.4.1): Pašalinta (perbraukta, „−“
  paraštėje), Pridėta (pabraukta, „+“), Pakeista (žodžių lygiu toje pačioje pastraipoje), Perkelta („↕ iš 7.2 p.“).
- **Laukti pakeitimai suskleisti**: užpildytos vietos ir pasirinktos alternatyvos rodomos tik paspaudus „Rodyti laukiamus
  (96)“ - pilka punktyrinė linija. Numatytai VPK mato tik nukrypimus.
- **Skyrių žemėlapis kairėje**: SPS skyriai su skaitikliu ir spalvine juosta (kur daugiausia nukrypimų).
- **Režimas „Tik nukrypimai“**: nepakeistos pastraipos suspaustos į „… 42 nepakeistos pastraipos“.
- **Plačiame ekrane - dviem stulpeliais** (forma | įkeltas), telefone - viename su žymomis.
- Kiekvienas nukrypimas - radinio kortelė (3.3) su sprendimu „Priimta sąmoningai“ ir pagrindimu.

---

## 2. Atitikties ir rizikos kontrolė

### 2.1. Sluoksniai (tvarka ir atsakomybė)

| # | Sluoksnis | Kaip | DI? | Aukščiausias lygis |
|---|---|---|---|---|
| 1 | Užbaigtumas | Raudonas šablono tekstas, „____“, „Pasirinkite elementą“, abi alternatyvos, komentarai, „[...]“ (PP-salygos švarumas + parengtis) | ne | Kliūtis |
| 2 | Nukrypimai nuo formos | 1 sk. palyginimas; sunkumas pagal skyrių (kvalifikacija, vertinimas, užtikrinimai, sutarties sąlygos, nacionalinis saugumas - aukštesnis) | ne | Nukrypimas |
| 3 | Tarpusavio prieštaravimai | Esamos 18 `GP_PARENGTIS` patikrų + nauji dydžių normalizatoriai (terminai, %, EUR, datos, nuorodos į punktus ir priedus) | ne | Kliūtis |
| 4 | Taisyklės | `GP_TAISYKLES` (būdas ir vertė, terminai, dokumentai pagal būdą) | ne | Kliūtis |
| 5 | Privalomi elementai | Katalogas: kiekviena taisyklė = `GP_TEISE` raktas + paieškos požymiai + skyrius (pvz. `ebvpd_dokumentuose`, `ts_dokumentuose`, `sutartis_dokumentuose`, `nacsaugumas` pagal BVPŽ) | ne | Kliūtis tik kai požymis patikimas, kitaip Patikrinkite |
| 6 | Kvalifikacijos proporcingumas | Reikalavimų lentelė ištraukiama iš SPS ir vertinama PP-qual varikliu (Metodika, `GP_TEISE.normos`) | taisyklės; DI - neprivalomai | Rekomendacija / Patikrinkite |
| 7 | Teisės pokyčiai | PP-teise registras konkrečiam pirkimui (`pirkimuiHTML`) | ne | Info |
| 8 | DI (neprivalomas) | Žr. 2.3 | taip | Patikrinkite |

Pastaba dėl pavyzdžio „trūkstamos privalomos sąlygos dėl sankcijų“: sankcijų sąlygos registre (`GP_TEISE`) šiandien nėra.
Kol norma neperskaityta e-tar ir neįrašyta į registrą, tokia patikra galėtų būti tik „Rekomendacija“ pagal organizacijos
taisyklę, ne „Kliūtis“. Nacionalinis saugumas registre yra.

### 2.2. Rizikos lygiai

Siūlau naudoti tuos pačius lygius kaip skelbimo parengtis ir taisyklių variklis (vienodai visoje sistemoje) ir pridėti vieną:

| Lygis | Kada | Kas reikalinga sprendimui | Jūsų siūlytas atitikmuo |
|---|---|---|---|
| **Kliūtis** | Deterministinis įrodymas: neužbaigtas tekstas, du dokumentai prieštarauja (abi citatos), būdas netinka vertei, nėra privalomo dokumento | Ištaisyti prieš tvirtinant | „Kritinė klaida“ |
| **Nukrypimas nuo formos** (naujas) | Pakeista, pašalinta ar pridėta nekintama formos nuostata | VPK sprendimas: „Priimta sąmoningai“ su pagrindimu arba „Grąžinti formos tekstą“ | - |
| **Patikrinkite** | Euristika ar DI radinys su patikrinta citata | Žmogaus vertinimas | - |
| **Rekomendacija** | Tik su šaltiniu registre (Metodika per PP-qual, VPT gairės, PP-teise įrašai) - šaltinis rodomas | Svarstyti | „Rekomendacija“, „VPT praktikos neatitikimas“ |
| **Patikrinta / Nepatikrinta** | Atliktų patikrų sąrašas; nepatikrinta - su priežastimi (skenuotas PDF, neatpažinta forma) | - | - |

Principai: žalia reiškia „apibrėžtos patikros praėjo“, ne „teisiškai patvirtinta“; nepatikrinta niekada nerodoma kaip
„be pastabų“; DI radinys niekada nebūna aukščiau „Patikrinkite“; „VPT praktikos neatitikimas“ - tik kai registre yra
konkretus VPT ar teismo šaltinis su ištrauka, kitaip DI išgalvotų „praktiką“.

### 2.3. DI sluoksnis (siauras ir neprivalomas)

**Ką DI daro:**
1. **Paaiškina nukrypimą**: gauna tik formos ir įkelto dokumento pastraipą (ne visą dokumentą) ir grąžina vieną sakinį,
   ką pakeitimas reiškia tiekėjui (griežtina kvalifikaciją, keičia terminą, riboja konkurenciją, redakcinis), su pažodine
   keistų žodžių citata - tikrinama prieš rodant.
2. **Semantinės poros**, kurias rado deterministinis sluoksnis (garantija TS ir sutartyje, apmokėjimo terminas, priėmimo
   tvarka): „sutampa / skiriasi / neaišku“ su abiem citatomis.
3. **Kvalifikacijos reikalavimų** proporcingumo pastabos - per esamą PP-qual DI auditą.

**Ko DI nedaro:** neteikia teisinės išvados („atitinka VPT“), neįvardija straipsnių (tik registro raktai, kuriuos pateikiame
mes), nesiūlo automatinių pataisų, neskaito viso paketo, nemato numatomos vertės be atskiro sprendimo.

**Privatumas:** neskelbti dokumentai - jautriausias turinys sistemoje. 1-7 sluoksniai veikia tik naršyklėje. DI - tik
mygtuku, prieš siunčiant rodoma, kas tiksliai siunčiama (pastraipų skaičius ir simboliai), per G-Procure serverį į
Claude API; ataskaitoje - DI požymiai (`shared/di-zymejimas.js`); `privatumas.html` ir `ai-valdymas.html` atnaujinami
prieš įjungiant.

---

## 3. Vartotojo kelionė ir rezultato langas

### 3.1. Žingsniai

1. **Įkėlimas.** DOCX, PDF, ODT arba ZIP (CVP IS paketas); keli failai. Eiga, skaitymas naršyklėje. Skenuotas PDF -
   „Nepatikrinta: be teksto sluoksnio“.
2. **Atpažinimas (vienas ekranas, viskas „Siūloma“).** Kiekvienam failui: vaidmuo (SPS, BPS, TS, sutartis, skelbimas,
   priedas) ir forma su versija („AK LT SPS · LITGRID 2026-08-07 · iš generavimo paso“ arba „panašumas 97 %“); būdas,
   režimas ir vykdytojas iš SPS ar skelbimo; pirkimo kortelė (jei yra). Žmogus patvirtina arba pakeičia. Lyginimo bazė:
   LITGRID forma / ankstesnė versija (antras failas) / be palyginimo.
3. **Patikra** (sekundės, be DI). 1-7 sluoksniai.
4. **Rezultatai** (3.2). Kliūtys ir nukrypimai pirmiausia.
5. **DI patikra (neprivaloma)** - mygtukas su siunčiamo turinio aprašu; DI radiniai prisijungia prie sąrašo su žyma „DI“.
6. **Sprendimai.** Kiekvienam radiniui: Ištaisyta / Priimta sąmoningai (pagrindimas privalomas nukrypimui) / Netaikoma.
7. **Ataskaita.** Word „Pirkimo dokumentų patikros ataskaita“: paketas (failai, dydžiai, maišos - kad būtų aišku, kuri
   versija tikrinta), forma ir versija, atliktos ir neatliktos patikros, radiniai su vietomis ir citatomis, sprendimai ir
   pagrindimai, DI požymiai. Tinka pridėti prie VPK protokolo (PP-protocol).

### 3.2. Rezultato langas (wireframe)

```
┌ Juosta (lipni): 4 failai · AK LT SPS · LITGRID 2026-08-07 (generavimo pasas) · Atviras konkursas · PĮ
│  [Kliūtys 2] [Nukrypimai 5] [Patikrinkite 7] [Rekomendacijos 3] [Patikrinta 41 iš 48] [Nepatikrinta 2 ▾]
│  [Ataskaita Word]  [DI patikra (neprivaloma) ▸]
├ Skirtukai: Svarbiausia | Pagal dokumentą | Palyginimas su forma | Visos patikros
│
│ SVARBIAUSIA (numatytasis) - tik Kliūtys ir Nukrypimai, po 10, kiti „Rodyti dar 6“
│ ┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ │ KLIŪTIS · Skelbimas ir SPS                                                   [Rodyti abu] │
│ │ Pasiūlymų kalba: skelbime - lietuvių, SPS 1.2 p. - lietuvių arba anglų                     │
│ │ „... pasiūlymai teikiami lietuvių arba anglų kalba“ · SPS, 2 psl.                          │
│ │ Kodėl svarbu: skelbimo ir pirkimo dokumentų prieštaravimas (registras: skelbimo_virsenybe) │
│ │ [Ištaisyta] [Priimta sąmoningai…] [Netaikoma]                                              │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘
│ ┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ │ NUKRYPIMAS NUO FORMOS · SPS 3 sk. Kvalifikacija                     [Rodyti palyginime]   │
│ │ Pakeista: „vidutinės metinės pajamos ne mažesnės kaip −2− +3+ kartus ...“                  │
│ │ DI: griežtina finansinio pajėgumo reikalavimą (Patikrinkite)                    [DI]       │
│ │ [Grąžinti formos tekstą*] [Priimta sąmoningai… (pagrindimas)] [Netaikoma]                 │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘
│
│ PALYGINIMAS SU FORMA
│ ┌ Skyriai ─────┐ ┌ Dokumentas (tik nukrypimai) ─────────────────────── [Rodyti laukiamus (96)] ┐
│ │ 1 Bendr.   0 │ │ … 42 nepakeistos pastraipos                                               │
│ │ 3 Kvalif.  ▮2│ │ − 3.4. Tiekėjas turi būti įvykdęs ne mažiau kaip 1 sutartį ...           │
│ │ 7 Pasiūl.  1 │ │ + 3.4. Tiekėjas turi būti įvykdęs ne mažiau kaip 3 sutartis ...           │
│ │ 9 Užtikr.  ▮1│ │ ↕ 7.2. perkelta iš 7.5                                                    │
│ │ BPS        0 │ │ … 18 nepakeistų                                                           │
│ └──────────────┘ └──────────────────────────────────────────────────────────────────────────┘
└ Poraštė: „Patikrinta 2026-10-06 14:32 · ši paketo versija · žalia = apibrėžtos patikros praėjo, ne teisinis patvirtinimas“
```
`*` „Grąžinti formos tekstą“ - tik kai dokumentas DOCX ir pastraipa atpažinta; kitaip rodoma formos citata kopijavimui.

Kad nebūtų teksto sienos: radinys - viena eilutė fakto, viena citata, viena eilutė „kodėl“, mygtukai; išsami informacija
(visos vietos, formos tekstas, taisyklės paaiškinimas) - išskleidžiama. Grupuojama pagal lygį, toliau pagal dokumentą ir
skyrių; tas pats radinys keliose vietose - viena kortelė su visomis vietomis.

---

## 4. NLP ir DI metodai - rekomendacija

| Uždavinys | Rekomenduojamas metodas | Kodėl | Atmesta |
|---|---|---|---|
| Dokumento struktūra | DOCX XML: pastraipos, runai su spalva (raudonas sluoksnis), lentelės, numeracija (GPNum emuliacija) | Tiksli, jau yra | PDF kaip pagrindinis (nėra spalvų, lūžta eilutės) - PDF tik patikroms, palyginimas „apytikslis“ |
| Formos atpažinimas | Generavimo pasas; be jo - normalizuotų pastraipų maišų (shingle) sutapimas su 64 šablonais ir jų versijomis | Deterministiška, ms | Embeddingai serveryje - nereikalingi, siunčia tekstą |
| Sulyginimas | Pastraipų LCS / Myers su normalizavimu + perkėlimų atpažinimas + žodžių lygio diff pakeistose pastraipose | Išmatuota: stabilu, 46-96 ms | Simbolių diff visam dokumentui - triukšmas |
| Pakeitimų klasifikacija | Žemėlapio blokai ir raudonas sluoksnis (laukti), žinomų pakeitimų sąrašas, skyriaus svarba | Tiksliai ir paaiškinama | DI klasifikacija kaip pagrindas - neatkartojama |
| Dydžių ištraukimas | Lietuviškų dydžių normalizatoriai: „6 (šešių) mėnesių“, „ne vėliau kaip per 5 darbo dienas“, „10 proc.“, „žr. 12.4 p.“, „8 priedas“ / „Priedas Nr. 8“; `GP_MONEY`, `GP_WORKDAYS` | Prieštaravimų patikrai (3 sluoksnis) | Regex su `\b` - JS jo nelaiko riba po lietuviškos raidės |
| Privalomi elementai | Taisyklių katalogas su `GP_TEISE` raktais; požymiai - raktažodžiai skyriuje + struktūra | Kiekviena išvada su nuoroda, testuojama | DI „ar atitinka VPT“ - haliucinacijų rizika |
| Semantika | DI tik poroms ir nukrypimų paaiškinimui; JSON atsakymas, `taisykJson`, citata tikrinama prieš rodant (A5 metodas, 11/11 tikslumas su 4 paketais) | Siauras kontekstas = mažiau klaidų, mažiau siunčiama | RAG per visą teisę ir VPT praktiką be kuruoto registro; modelio derinimas (fine-tuning) |

---

## 5. Architektūra

```
shared/palyginimas.js   (naujas)  DOCX pastraipos su spalva -> sulyginimas -> perkėlimai -> žodžių diff -> klasifikacija
                                  pagal žemėlapį; grynos funkcijos, testuojamos be DOM
shared/parengtis.js     (plečiamas) orkestratorius: sluoksniai 1-7, radinių modelis { id, lygis, grupe, vietos[], citatos[],
                                  teise[], saltinis, sprendimas }, patikrų sąrašas
shared/auditas-taisykles.js (naujas) privalomų elementų katalogas (GP_TEISE raktai + požymiai), kvalifikacijos ištraukimas
PP-salygos/zemelapiai/versijos.json (naujas) ankstesnių formų versijų pastraipų maišos (mažas failas, ne šablonų kopijos)
PP-salygos/variklis.js  generavimo pasas į docProps/custom.xml (šablonas, versija, atsakymai)
PP-SALYGOS.html         naujas režimas „Tikrinti parengtus dokumentus“ (skirtukas šalia generatoriaus)
skelbimo-parengtis.html tas pats variklis (arba nukreipimas į PP-salygos režimą - sprendimas)
```
Niekas neįrašoma į saugyklą (PP-salygos nieko nesaugo); sprendimai gyvena puslapyje ir ataskaitoje; uždarant su
nepriimtais sprendimais - `GP_DARBAS` įspėjimas.

---

## 6. Etapai

| Etapas | Turinys | Apimtis | Priklauso nuo |
|---|---|---|---|
| 0 | Matavimas su tikrais paketais - **padaryta 2026-10-06** (1.1 D: 7 vieši paketai, 10 DOCX dokumentų) | maža | - |
| 1 | Palyginimas su forma DOCX: `shared/palyginimas.js`, formos atpažinimas, klasifikacija, palyginimo vaizdas, „Tik nukrypimai“ | vidutinė-didelė | 0 |
| 2 | Generavimo pasas ir tikslus palyginimas modulio dokumentams | vidutinė | 1 |
| 3 | Vienas rezultatų langas: sluoksniai 1, 3, 4, 7 (jau esantys) + nukrypimai, lygiai, sprendimai, Word ataskaita | vidutinė | 1 |
| 4 | Privalomų elementų katalogas (10-15 taisyklių iš registro) ir kvalifikacijos ištraukimas į PP-qual variklį; išmatuoti su 0 etapo paketais | vidutinė | 3, e-tar patikra naujoms normoms |
| 5 | DI sluoksnis (nukrypimų paaiškinimas, poros) - po bandomojo naudojimo, jei taisyklės praleidžia >= 2 tikrus atvejus | maža-vidutinė | jūsų sprendimas, privatumo tekstai |

Kiekvienas etapas - atskiri commit'ai, testai su tikrais dokumentais ir mutacijomis, 375 / 320 px, gyva patikra.

---

## 7. Rizikos ir ribos

- **Išoriniai dokumentai be žinomos formos** (kitos organizacijos, laisva forma) - palyginimas tik su pateiktu baziniu
  failu; formos nukrypimų nebus, liks 1, 3-7 sluoksniai.
- **PDF** - be raudono sluoksnio ir tikslios struktūros; palyginimas apytikslis ir taip pažymimas.
- **Senesnės formos** - reikia jų versijų maišų; LITGRID atsiuntus naujas formas, `versijos.json` papildomas.
- **~5 % neatpažintų pakeitimų** be generavimo paso (išmatuota) - rodomi atskirai, ne kaip klaidos; mažinami žinomų
  generatoriaus mechanizmų taisyklėmis.
- **Teisinis tikslumas** - tik registro normos; nauja taisyklė - tik perskaičius e-tar. Sankcijų sąlygos registre nėra.
- **VPK sprendimų išsaugojimas** - modulis nieko nesaugo; sprendimai išlieka tik ataskaitoje (arba kortelėje - sprendimas).

---

## 8. Sprendimai, kurių reikia prieš pradedant

1. **Vieta:** naujas režimas PP-salygos modulyje su bendru varikliu, o `skelbimo-parengtis.html` - tas pats įrankis
   (sujungti į vieną) ar palikti atskirą?
2. **Bazinė forma:** lyginti su oficialia LITGRID 2026-08-07 forma (mūsų taisymai - kaip žinomi pakeitimai) ar su modulio
   pataisyta forma?
3. **Generavimo pasas:** ar įrašyti į sugeneruotus Word failus šabloną, versiją ir atsakymus (paslėptos savybės; paskelbus
   CVP IS jie keliautų kartu su failu)? Alternatyva - tik šabloną ir versiją (be atsakymų - tada SPS palyginimas su ~5 %
   triukšmo).
4. **Lygiai:** ar tinka siūlomi pavadinimai (Kliūtis, Nukrypimas nuo formos, Patikrinkite, Rekomendacija), suderinti su
   esama sistema, ar norite „Kritinė klaida“ ir „VPT praktikos neatitikimas“?
5. **DI:** ar apskritai, ir kada - siūlau po 3-4 etapų ir bandomojo naudojimo (5 etapas).
6. **Sprendimai ir ataskaita:** tik Word ataskaita, ar ir santrauka pirkimo kortelėje (kaip rinkos apžvalgos veiksmai)?
7. **Matavimo duomenys:** leidimas atsisiųsti 4 viešus CVP IS paketus; ar galite pateikti 1-2 vidinius dokumentus prieš
   skelbiant (lieka tik jūsų kompiuteryje)?

## 9. Naudotojo sprendimai (2026-10-06)

1. Sujungti su „Ar pirkimas parengtas skelbti?“ į vieną įrankį PP-salygos modulyje.
2. Bazinė forma - mūsų pataisyti šablonai (`PP-salygos/templates/`).
3. Generavimo pasas - pagal rekomendaciją: **be atsakymų** (atsakymuose yra ir numatoma vertė, o failas skelbiamas CVP IS) -
   šablono id, formos versija ir sugeneruoto dokumento pastraipų maišos; to užtenka tiksliai nustatyti, kas pakeista po generavimo.
4. Lygių pavadinimai tinka (Kliūtis, Nukrypimas nuo formos, Patikrinkite, Rekomendacija, Patikrinta / Nepatikrinta).
5. DI - tik po bandomojo naudojimo.
6. Sprendimai - pagal rekomendaciją: Word ataskaita, į kurią įdedami ir mašinai skaitomi sprendimai; tikrinant naują paketo versiją su
   ankstesne ataskaita sprendimai parodomi prie tų pačių nukrypimų. Pirkimo kortelėje - ne.
7. Viešus CVP IS duomenis galima siųstis be atskiro klausimo.


## 10. Būsena (2026-10-06, po naudotojo sprendimų) - 1-3 etapai įgyvendinti

- **Vienas įrankis.** PP-salygos skirtukas „Tikrinti parengtus dokumentus“ (`PP-salygos/tikrinimas.js`, adresas `#tikrinti`);
  `skelbimo-parengtis.html` - nukreipimas ten su tais pačiais parametrais. Modulis lietuviškas, todėl angliškos parengties sąsajos nebėra.
  Nuorodos: „Mano pirkimai“, kortelių puslapio taisyklių blokas, „Apie G-Procure“ skyrius „Kas jungia įrankius“.
- **Palyginimas su forma** (`shared/palyginimas.js`): DOCX pastraipos su raudonu sluoksniu, sulyginimas (LCS, panašumo poros, perkėlimai),
  žodžių skirtumas, klasifikacija: nukrypimas / neprivaloma / užpildyta / techninis. Bazė - mūsų pataisyti šablonai (`templates/`), ankstesnių
  oficialių redakcijų pastraipos - `zemelapiai/formu-versijos.json` (generuoja `PP-salygos/formu-versijos.py` iš git istorijos; ten ir formų
  atpažinimo rodyklė - ilgesnių pastraipų maišų ketvirtis, 32 KB). Atpažinimas pagal rodyklę sutapo su pilnu visų šablonų palyginimu visuose 13
  išmatuotų dokumentų; atsisiunčiamas tik atpažintas šablonas ir jo žemėlapis.
- **Generavimo pasas** (`GPDocx.pasas`, variklis.js): kiekviename sugeneruotame Word faile - customXml dalis su šablono kodu, formos maiša, data ir
  galutinio teksto pastraipų maišomis, be atsakymų. Pagal pasą - tikslus palyginimas (kas pakeista po generavimo).
- **Matavimas po taisyklių** (nukrypimai, be paso): tikri paskelbti SPS 3, 3, 3, 1, 7 (tarp jų - pašalinta sankcijų nuostata); BPS - 0;
  modulio sugeneruoti SPS be paso - po 1; su pasu - 0. Mutacijos (žodis, pašalinta, pridėta pastraipa) randamos lygiai abiem keliais.
- **Rezultatų langas:** santrauka (Kliūtys, Nukrypimai nuo formos, Patikrinkite, Informacija, Patikrinta X iš Y, Nepatikrinta, Sprendimai),
  vaizdai Svarbiausia / Pagal dokumentą / Palyginimas su forma / Visos patikros; vaidmuo ir forma keičiami „Pagal dokumentą“ (forma - „Siūloma“
  su panašumu). Sprendimai: Ištaisyta / Priimta sąmoningai (nukrypimui ir kliūčiai - pagrindimas privalomas) / Netaikoma; „Kopijuoti formos tekstą“
  (grąžinti formos tekstą tiesiai į failą - ne šiame etape). Uždarant su neatsisiųstais sprendimais - `GP_DARBAS` įspėjimas.
- **Ataskaita (Word):** oficialus stilius, santrauka, paketas su SHA-256, radiniai su vietomis, teise ir sprendimais, patikrų sąrašas; customXml
  (`https://g-procure.com/patikra/1`) - sprendimai, radinių raktai, dokumentų pastraipų maišos. Įkėlus ją su nauja paketo versija: ankstesni
  sprendimai rodomi prie tų pačių radinių (pritaikomi tik paspaudus „Palikti šį sprendimą“), nauji radiniai pažymimi, dokumentų pakeitimai nuo
  ankstesnės patikros suskaičiuojami.
- **Testai:** `shared/testai.html` 216 (variklio grupė, perkeltas parengties puslapio testas, nukreipimas, būsena su rezultatais telefone ir
  prieinamumo patikroje), `PP-salygos/testai.html` 130 (pasas, abu palyginimo keliai su mutacijomis tikruose sugeneruotuose dokumentuose,
  sprendimai, ataskaita ir kita versija, rodyklės ir šablonų lygiavertiškumas, darbo sritys); 7 kodo mutacijos - visos pagaunamos.
- **Liko (kiti etapai):** 4 - privalomų elementų katalogas (Rekomendacijos lygis) ir kvalifikacijos ištraukimas į PP-qual; formų rodyklėje kol kas
  SPS, BPS ir DPS sąlygos - pasiūlymo ir kitos formos dar nelyginamos; PDF lyginimas su forma; 5 - DI (po bandomojo naudojimo).
