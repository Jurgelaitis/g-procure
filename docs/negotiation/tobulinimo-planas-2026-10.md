# Derybų pasirengimo įrankis: tobulinimo planas (2026-10-06)

Vertinimas ir įgyvendinimo planas trims naudotojo įvardytiems poreikiams: pozicionavimo tekstai, pasiūlymų
įkėlimo srautas ir įkainių analitika su derybų strategija kiekvienam tiekėjui. Faktai - iš modulio kodo
(`PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html`, 3437 eil., testai 24) 2026-10-06 būsenos.

## 0. Kas yra dabar (išmatuota)

| Sritis | Dabartinė būsena | Kodo vieta |
|---|---|---|
| Pozicionavimas | Antraštė „Strategiškai pasiruošę deryboms, duomenų pagrindu, pagal VPĮ ir PĮ praktiką.“; po ja pastraipa, kuri žada „paruošti puikią techninę specifikaciją“ - to modulis nedaro (tai PP-ts) | 733-735 eil. |
| Tiekėjo pridėjimas | Atskiras vaizdas „Tiekėjai“, modalinis langas (pavadinimas, kodas, šalis, kontaktas, rizika, spalva, pastabos). Pasiūlymo prie tiekėjo pridėti negalima | `addSupplierModal` 3050 |
| Pasiūlymo įkėlimas | Atskiras vaizdas „Pasiūlymų importas“, skirtukas „Failo įkėlimas“: pirma pasirenkamas tiekėjas, tada įkeliamas VIENAS failas | 1440-1480, `handleFileUpload` 3203 |
| Paspaudimų skaičius | 5 tiekėjams su failais: ~8 veiksmai tiekėjui (vaizdas, „Pridėti“, laukai, „Pridėti“, vaizdas, skirtukas, tiekėjo pasirinkimas, failas) = ~40 veiksmų dviejuose vaizduose | - |
| Importo galimybės | XLSX / CSV: antraštė („Pavadinimas“ + „Kiekis“ / „Kaina“), pozicijos sukuriamos arba priskiriamos pagal pavadinimą (tikslus sutapimas arba pirmi 12 ženklų). PDF ir DOCX: tekstas skaitomas eilutėmis į VIENĄ langelį, todėl pozicijų atskirti negalima - nuo 2026-09-28 sąmoningai grąžinama klaida, lieka tik „bendras pasiūlymas“ (didžiausias skaičius faile) | `extractFromRows` 2692, `parsePDF` 2663, `parseDOCX` 2684 |
| Duomenų modelis | `positions` (pavadinimas, vnt., kiekis, planuojamas įkainis, svoris), `offers[tiekėjas][pozicija] = { unitPrice, leadTime, comment }`, `fixedOffers` - struktūra eilučių analizei JAU tinka | `defaultState` 926 |
| Įkainių palyginimas | Importo lentelėje min / max langeliai pažymėti; analizės vaizde - pozicijos statistika (min, vid., med., max, CV) BE tiekėjų stulpelių ir be anomalijų žymų | `positionsTable` 2022, `analysisView` 2165 |
| Įžvalgos | Tik bendrų sumų lygiu: CV, pasiūlymai > 110 % PV, < 70 % PV (NMK nuoroda iš registro), statistinės išskirtys | 2183-2190 |
| Strategija | `suggestTargets` - tikslas, rezervinė ir pradinė riba TIK iš bendrų sumų; 3 scenarijai su fiksuotais koeficientais; jokios eilučių logikos | 1196-1260 |
| DI | Modulis NIEKO nesiunčia į serverį (nėra `GP_AI_PROXY`); DI užklausos - tik užkoduotos, kopijuojamos ranka (R4, 2026-10-05). Privatumo pranešimas ir informacinė skiltis tai teigia | `diKontekstas` 2814, privatumas.html |
| Rinkos duomenys | Modulis neturi įkainių rinkos duomenų; „rinkos vidurkis“ galimas tik kaip gautų pasiūlymų vidurkis ar mediana. CVP IS (`/api/vpt`) duoda tik sutarčių sumas, PP-market-KPI - indeksus, ne įkainius | - |

Išvada: pamatai (duomenų modelis, statistika, ribos, eksportas, kortelė, testai) yra; trūksta trijų sluoksnių -
tekstų, vieno įkėlimo srauto ir eilučių lygio variklio su rekomendacijomis.

## 1. Pozicionavimas ir tekstai

Principai: trumpa antraštė (iki ~8 žodžių), paantraštė sako, KĄ naudotojas gauna, ne kaip įrankis vadinasi;
be žodžių „platforma“, „sprendimas“, „strategiškai“; teisinis signalas lieka, bet mažesne eilute (jis - pasitikėjimo
ramstis, ne reklama); be ilgojo brūkšnio; be skaitinių pažadų, kurių neišmatavome („per valandą“).

Variantai (antraštė / paantraštė):

1. **Derybos, kurias laimi duomenys.** / Palyginkite pasiūlymus iki kiekvieno įkainio, pamatykite anomalijas ir į derybas eikite su skaičiais, ne nuojauta.
2. **Nuo tiekėjų pasiūlymų iki derybų plano.** / Įkelkite pasiūlymus, o įrankis sudarys įkainių matricą, derybų ribas ir rekomendacijas kiekvienam tiekėjui.
3. **Žinokite daugiau nei kita stalo pusė.** / Kiekvieno įkainio palyginimas, rizikingų kainų signalai ir argumentai deryboms viename lange.
4. **Derybinė galia prasideda nuo analizės.** / Įkainių matrica, derybų ribos (BATNA ir ZOPA) ir scenarijai pagal jūsų pirkimo duomenis.
5. **Pasiūlymų analitika ir derybų strategija vienoje vietoje.** / Greitas importas, palyginimas eilutė po eilutės ir konkretūs derybų žingsniai kiekvienam tiekėjui.
6. **Pamatykite, kur slypi derybų rezervas.** / Įrankis parodo, kurie įkainiai per aukšti, kurie įtartinai žemi ir ką prašyti pagrįsti.
7. **Mažiau skaičiuoklių, daugiau argumentų.** / Pasiūlymai sulyginami automatiškai, derybų ribos ir rekomendacijos - pagal duomenis.

Rekomendacija: 2 arba 6 (konkrečiausi, atitinka tai, ką modulis darys po 2-3 etapų). Papildoma mažesnė eilutė
po paantrašte: „Veikia pagal PĮ ir VPĮ: teisės nuorodos iš bendro registro, duomenys lieka jūsų naršyklėje.“
Kartu taisoma klaidinga pastraipa apie techninę specifikaciją, portalo kortelės aprašas (`index.html` MODULES),
„Apie G-Procure“ ir informacinės skilties `purpose`. Modulio pavadinimas kataloge („Derybų pasirengimo įrankis“)
lieka: jis yra ir URL, ir kortelėje, ir teisės stebėsenos žodyne.

Apimtis: 1 commit'as, be logikos pokyčių; testai tikrina kontrastą ir 375 px.

## 2. Pasiūlymų įkėlimas: vienas srautas, du lygiai

### 2.1. Efektyvus rankinis srautas (A lygis)

Tikslas: tiekėjas ir jo pasiūlymas - vienu veiksmu, viename vaizde.

- Vaizdai „Tiekėjai“ ir „Pasiūlymų importas“ sujungiami į vieną žingsnį **„Tiekėjai ir pasiūlymai“** (eiga iš 6 žingsnių
  tampa 5). Pozicijų matrica ir „bendras pasiūlymas“ lieka to paties vaizdo skirtukais.
- Modaliniame lange „Pridėti tiekėją“ atsiranda sritis **„Pasiūlymas“**: įkėlimo zona (vienas ar keli failai) ARBA laukas
  „Bendra kaina be PVM“. Išsaugant tiekėją failas iš karto nuskaitomas, o rezultatas (rastos pozicijos, suma, kas
  nesutapo) rodomas tame pačiame lange su „Priimti“ / „Peržiūrėti pozicijas“. Pavadinimas ir įmonės kodas pasiūlomi iš
  failo (žr. 2.2 atpažinimą) - kaip „Siūloma (nepatvirtinta)“, pagal 2026-10-04 formos principus.
- Tiekėjo kortelėje - pasiūlymo būsena („pozicijos: 14 iš 16“, „tik bendra kaina“, „nėra“) ir įkėlimo zona tiesiai
  kortelėje: failą galima numesti ant tiekėjo.
- Matricoje - **įklijavimas iš Excel** (Ctrl+V su tabuliacijomis): pozicijos ir įkainiai įrašomi stulpeliais; tai
  pigiausias ir greičiausias kelias, kai pasiūlymai jau yra skaičiuoklėje.
- Klaviatūra: Enter pozicijų lentelėje pereina žemyn, Tab - į kitą tiekėją.

Matas: 5 tiekėjai su failais - ~3 veiksmai tiekėjui (Pridėti, pavadinimas, failas) = ~15 vietoj ~40, vienas vaizdas
vietoj dviejų.

### 2.2. Masinis įkėlimas (B lygis)

Srautas: viena įkėlimo zona viršuje („Įkelkite visų tiekėjų pasiūlymus iš karto“) -> eilė -> kiekvienam failui
atpažinimas -> **peržiūros ekranas** -> „Priimti pažymėtus“. Niekas neįrašoma, kol žmogus nepriima (kaip kortelės
importas iš CVP IS skelbimo ir PP-salygos DI pasiūlymai: kiekvienas pasiūlymas su citata ir žymimuoju langeliu).

Atpažinimo žingsniai (visi naršyklėje, be DI):

1. **Tiekėjas.** Iš failo vardo („UAB_Alfa_pasiulymas.xlsx“) ir dokumento pradžios (teisinė forma UAB / AB / MB / SIA /
   OÜ ir pan., 9 skaitmenų įmonės kodas, PVM kodas, eilutės „Tiekėjas:“, „Pasiūlymą teikia“). Lyginama su esamais
   tiekėjais (be diakritikų, be teisinės formos), nerasta - siūloma sukurti naują. Rodoma citata, iš kur paimta.
2. **Lentelė.** XLSX / CSV - kaip dabar; **DOCX - per `shared/dokumentai.js`** (jis skaito lentelių eilutes langeliais,
   ko dabartinis `mammoth.extractRawText` nedaro); **PDF - pagal stulpelių geometriją** (pdf.js duoda kiekvieno teksto
   elemento x koordinatę; dabar jos išmetamos ir eilutė suliejama į vieną langelį). Antraštės atpažįstamos kaip dabar,
   papildomai - vnt. kaina su PVM / be PVM, suma, eil. Nr.
3. **Pozicijų sutapdinimas.** Normalizuotas tekstas (mažosios, be diakritikų, be skyrybos), žodžių persidengimas,
   vieneto ir kiekio sutapimas; pasitikėjimas (tikslus / tikėtinas / nerasta). Dabartinis „pirmi 12 ženklų“ pakeičiamas.
4. **Suma.** Iš dokumento („Iš viso be PVM“) ir iš kiekis × įkainis; nesutapimas rodomas kaip įspėjimas, ne tyliai.

Peržiūros ekranas: po eilutę failui - tiekėjas (siūlomas / esamas / naujas), pozicijų sutapdinimo santrauka („14 tikslių,
1 tikėtina, 1 nerasta, 2 naujos“), suma, įspėjimai; išskleidus - lentelė su citatomis ir galimybe pataisyti sutapdinimą.
Skenuoti PDF (be teksto sluoksnio) atpažįstami ir pasakoma, kad jiems reikia C lygio arba rankos.

### 2.3. DI skaitymas (C lygis) - naudotojo sprendimas

„AI vizija“ reiškia, kad tiekėjo pasiūlymo failas būtų siunčiamas per G-Procure serverį į Claude API. Šiandien modulis
nesiunčia NIEKO, ir tai parašyta privatumo pranešime, informacinėje skiltyje ir „Apie“ puslapyje. Tai ne techninė, o
politikos kliūtis: tiekėjų pasiūlymai yra jautriausi pirkimo duomenys (konkurentų kainos iki sutarties sudarymo).
Techniškai kelias yra (kaip PP-qual TS skaitymas: proxy, DPA, nemokymas, 30 d. ištrynimas; riba `MAX_PDF_BAITU`).

Jei sprendžiama „taip“, taisyklės: tik aiškiai paspaudus „Skaityti su DI“ prie konkretaus failo (ne masiškai pagal
nutylėjimą), tik kai B lygis nerado lentelės arba PDF skenuotas; prie mygtuko - kas siunčiama ir kur; rezultatas -
pasiūlymai su puslapio nuoroda, pažymėti „DI pasiūlymas“ (`shared/di-zymejimas.js`), priima žmogus; atnaujinami
privatumo pranešimas, informacinė skiltis ir `ai-valdymas.html` lentelė. Jei „ne“ - modulis lieka visiškai vietinis,
o skenuotiems PDF siūlomas rankinis kelias ar Excel versija iš tiekėjo.

Rekomendacija: pirma įgyvendinti A ir B (jie išsprendžia daugumą tikrų failų - XLSX ir tekstiniai PDF / DOCX),
matuoti su tikrais pasiūlymais, ir tik tada spręsti dėl C pagal tai, kiek failų liko neperskaityta.

## 3. Įkainių analitika ir strategija kiekvienam tiekėjui (pagrindinė funkcija)

### 3.1. Variklis (`analitika`, grynos funkcijos, be DOM - testuojamas)

Įvestis: `positions`, `suppliers`, `offers`, `fixedOffers`, `plannedUnitPrice`, slenksčiai iš `settings`.

Kiekvienai pozicijai: min, mediana, vidurkis, max, CV, planuojamas įkainis, kiek tiekėjų ją įkainojo, pozicijos vertės
dalis (kiekis × mediana / visų medianų suma).

Kiekvienam langeliui (tiekėjas × pozicija): nuokrypis nuo min, nuo medianos, nuo planuojamo (%); vieta tarp tiekėjų;
žyma:

| Žyma | Taisyklė (numatytieji slenksčiai, keičiami nustatymuose ir rodomi lentelėje) |
|---|---|
| `brangiausias` | didžiausia kaina toje pozicijoje |
| `aukštas` | > mediana + 15 % arba > planuojamas + 15 % |
| `rizikingai žemas` | < mediana - 25 % (kai įkainojo >= 3 tiekėjai) arba < planuojamas - 30 % |
| `vienintelis` | poziciją įkainojo vienas tiekėjas - palyginimo nėra, sakoma |
| `trūksta` | tiekėjas pozicijos neįkainojo |

Slenksčiai - ne teisės normos: NMK nuoroda (`GP_TEISE`, PĮ / VPĮ pagal režimą) lieka tik bendros kainos lygiu, kaip
dabar; eilutės žyma vadinama „patikrinti“, ne „nepagrįstai maža“. „Rinkos vidurkis“ modulyje neegzistuoja - visur
rašoma „pasiūlymų mediana“ (ir šablonuose, kuriuos naudotojas kopijuoja).

Derybų svertas eilutei: `kiekis × (tiekėjo įkainis - min įkainis)` - kiek sutaupytume, jei tiekėjas nusileistų iki
pigiausio; sumuojama tiekėjui ir rikiuojama. Tai pakeičia fiksuotą „92 %“ `suggestTargets` logiką: tikslas tiekėjui =
min(dabartinė suma, suma, kurioje kiekviena eilutė = jos min, PV); senoji formulė lieka, kai pozicijų nėra (fixed).

Rekomendacijos tiekėjui (deterministiniai šablonai su skaičiais, be DI):

- **Akcentuoti:** iki 5 eilučių su didžiausiu svertu - „Pozicijos X įkainis 20 % viršija pasiūlymų medianą
  (12 400 EUR potencialas)“.
- **Prašyti pagrįsti:** `rizikingai žemas` - „Eilutės Z įkainis 32 % žemesnis už medianą; galima neįvertinta apimtis -
  prašyti pagrindimo ir patvirtinimo, kad apimtis pilna“.
- **Nespausti:** eilutės, kur tiekėjas pigiausias - derybų energija ten neduoda naudos, bet tai jo argumentas.
- **Trūksta:** neįkainotos pozicijos - prašyti užpildyti prieš derybas, kitaip sumos nepalyginamos.
- **Bendra:** suma prieš PV ir prieš min, tikslas ir rezervinė riba (iš esamo `suggestTargets`, bet su eilučių tikslu).

Tas pats turinys patenka į užkoduotas DI užklausas (R4 taisyklės: tiekėjai kodais, sumos procentais) - jei norima
narratyvinio teksto, jį rašo organizacijos patvirtintas DI įrankis iš jau paruoštų faktų.

### 3.2. Sąsaja

- Analizės vaizde - nauja kortelė **„Įkainių matrica“**: eilutės - pozicijos, stulpeliai - tiekėjai, pirmas stulpelis
  prilipęs, lentelė slenka savo rėmelyje (telefono taisyklė). Langelių fonas pagal žymą (min - žalias, brangiausias -
  raudonas, rizikingai žemas - gintarinis) ir TEKSTINĖ žyma / ikona (spalva - ne vienintelis signalas, kontrastas pagal
  `*-strong` žetonus). Jungikliai: EUR / % nuo min / % nuo planuojamo; filtras „tik anomalijos“; rikiavimas pagal
  derybų svertą. Poraštė - sumos, nuokrypis nuo PV, min suma („idealus pasiūlymas“).
- Paspaudus langelį - šoninė kortelė: visi tos pozicijos įkainiai, mediana, planuojamas, žyma ir ką daryti.
- Strategijos vaizde - tiekėjo skirtukai; kiekvienam - keturios kortelės (Akcentuoti, Prašyti pagrįsti, Nespausti,
  Trūksta) su eilutėmis ir sumomis, mygtukai „Į užkoduotą užklausą“, „Į Excel“, „Į ataskaitą“. Esamos ribos ir
  scenarijai lieka po jomis.
- Derybų sesijoje (vėliau): raundo įrašas gali nurodyti eilutes, dėl kurių derėtasi, ir HUD rodo likusį svertą.
- Eksportas: XLSX gauna lapą „Įkainių matrica“ (žymos tekstu) ir „Rekomendacijos“; spausdinama ataskaita - matricą.

### 3.3. Testai

Variklis - sintetinėmis matricomis (3 tiekėjai × 6 pozicijos: žinomos žymos, svertas, tikslas, trūkstamos eilutės,
vienas tiekėjas pozicijoje, nuliniai kiekiai) ir mutacijomis (slenksčio pakeitimas turi kristi); sąsaja - 375 ir 320 px
be horizontalios slinkties (matrica slenka savo rėmelyje), kontrastas, žymos ekrano skaitytuvui; užkoduota užklausa su
rekomendacijomis - be pavadinimų ir sumų (R4 testai plečiami).

## 4. Eiliškumas ir apimtis

| Etapas | Turinys | Apimtis | Priklausomybės |
|---|---|---|---|
| 0 | Tekstai (1 sk.), klaidingos pastraipos pašalinimas, portalo kortelė | maža | naudotojo pasirinktas variantas |
| 1 | A lygis: vienas žingsnis „Tiekėjai ir pasiūlymai“, failas modale ir kortelėje, įklijavimas iš Excel, DOCX lentelės per `shared/dokumentai.js` | vidutinė | - |
| 2 | Variklis `analitika`, įkainių matrica, rekomendacijos tiekėjui, užkoduotos užklausos ir eksportai su jomis | didžiausia (pagrindinė vertė) | 1 nebūtinas, bet matrica su tikrais importais patikrinama geriau |
| 3 | B lygis: masinis įkėlimas, tiekėjo atpažinimas, PDF stulpelių geometrija, peržiūros ekranas | vidutinė-didelė | 1 |
| 4 | C lygis: DI skaitymas pasirinktam failui | maža techniškai, bet keičia privatumo teiginius | naudotojo sprendimas po 3 etapo matavimų |

Kiekvienas etapas - atskiri commit'ai, testai, 375 px, gyva patikra; PROJECT_CONTEXT.md ir CLAUDE.md atnaujinami.

## 5. Sprendimai, kurių reikia prieš pradedant

1. Antraštės variantas (1-7) ir ar palikti mažą teisinę eilutę.
2. Ar sujungti „Tiekėjai“ ir „Importas“ į vieną žingsnį (eiga 6 -> 5 žingsniai).
3. Slenksčiai anomalijoms (siūloma +15 % / -25 % nuo medianos, +15 % / -30 % nuo planuojamo) ir ar juos keisti
   nustatymuose.
4. DI skaitymas failams (C lygis): taip / ne / spręsti po 3 etapo.
5. Eiliškumas: siūloma 0 -> 1 -> 2 -> 3 (-> 4).

## 6. Būsena (2026-10-06)

Naudotojo sprendimai: 1) 2 variantas („Nuo tiekėjų pasiūlymų iki derybų plano.“), maža teisinė eilutė palikta; 2) vienas žingsnis
„Tiekėjai ir pasiūlymai“; 3) slenksčiai kaip siūlyta, keičiami lange „Slenksčiai“; 4) DI skaitymas (C lygis) - po B lygio;
5) eiliškumas 0 -> 1 -> 2 -> 3.

Padaryta (etapai 0-3, viename modulio faile ir `shared/dokumentai.js` - lentelių `cells`):
- 0: tekstai, informacinė skiltis, pagalba, žingsnių numeriai (6 -> 5 eigoje).
- 1: failas tiekėjo lange ir ant kortelės, įklijavimas iš Excel, DOCX / ODT lentelės, CSV koduotės (UTF-8 / windows-1257).
- 2: variklis `analitika`, įkainių matrica, rekomendacijos tiekėjui, eilučių tikslas, užkoduotos užklausos ir Excel lapai.
- 3: masinis įkėlimas, tiekėjo atpažinimas su citata, PDF stulpeliai pagal geometriją, peržiūros langas be tylaus įrašymo.
- Testai: `PP-negotiation/testai.html` 24 -> 35; `shared/testai.html` - trys būsenos su duomenimis (telefonas ir prieinamumas),
  du nauji langai (importo peržiūra, slenksčiai).

Ribos, kurias reikia žinoti:
- PDF stulpeliai - euristika pagal x tarpus (> 1,2 šrifto dydžio); lentelė be tarpų tarp stulpelių ar su sulietais langeliais gali
  būti perskaityta kaip viena eilutė - tada pasakoma „pozicijų neatpažinta“ ir ieškoma bendros sumos.
- Skenuoti PDF neskaitomi (nėra OCR) - pasakoma ir siūloma prašyti Excel.
- Tiekėjo atpažinimas - taisyklės, ne DI: be „Tiekėjas:“ eilutės, teisinės formos ar kodo lieka failo vardas; neaišku - „pasirinkite“.
- Portalo kortelė, „Apie G-Procure“ aprašymas ir modulio `meta description` - naudotojo patvirtintas tekstas (2026-10-06):
  „Nuo tiekėjų pasiūlymų iki derybų plano: įkainių matrica, derybų ribos ir rekomendacijos kiekvienam tiekėjui.“

Neįgyvendinta: 4 etapas (C lygis) - laukia sprendimo; pozicijų pavadinimų sutapdinimas DI pagalba - taip pat C lygio klausimas.

