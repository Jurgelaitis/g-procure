# Sutarčių projektų parinkimas ir generavimas PP-salygos generatoriuje - architektūra ir planas

2026-10-07. Būsena: projektas jūsų sprendimams (8 skyrius). Nieko neįgyvendinta ir necommit'inta.
Pilnos šablonų audito ataskaitos, kalibravimo duomenys ir prototipas - privačiame kataloge
`~/Documents/g-procure-privatu/sutartys/` (juose - vidiniai šablonų komentarai ir tiekėjų pavadinimai).

---

## 0. Santrauka

- **Parinkimas - deterministinės taisyklės, ne kalbos modelis.** Tas pats žodis pavadinime LITGRID praktikoje veda į skirtingas
  sutartis (pvz. „rekonstravimas“ - į 5 skirtingas šeimas), todėl jokia teksto analizė viena negali būti „100 % tiksli“. Tikslumą
  užtikrina kita taisyklė: **sistema parenka automatiškai tik tada, kai visi požymiai vienareikšmiai; kitaip - užduoda 1 klausimą
  (retai 2)**. Išmatuota su 277 paskelbtomis LITGRID sutartimis: 202 parinktos automatiškai, visos teisingai; 52 - po vieno klausimo,
  23 - po dviejų; neteisingų automatinių parinkimų - 0. Jūsų pavyzdžiai („tvoros remontas“, „sandėlių durų keitimas“, „įvažiuojamojo
  kelio atstatymas“) parenkami automatiškai - Darbų pirkimo-pardavimo (mažoji) sutartis.
- **Generavimas - tas pats deterministinis variklis kaip SPS.** Šablono tekstas nekeičiamas, keičiamos tik žemėlapyje pažymėtos vietos.
  Po generavimo sistema pati palygina dokumentą su šablonu: bet koks kitas skirtumas, likusi pildoma vieta, komentaras ar nuoroda į
  neegzistuojantį punktą **stabdo** atsisiuntimą. DI teisinio teksto nerašo.
- **Šablonuose rasta apie 150 loginių neatitikimų** (dalis - blokuojantys). Redakcines klaidas generatorius taiso pats (kaip SPS
  šablonams, originalai nekeičiami), turinio klaidos - LITGRID sprendimui arba (jūsų sprendimu) bendrų pastebėjimų sąrašui
  teisininkams. Trijų regioninių eksploatavimo SS bendrosios sąlygos pridėtos 2026-10-07 - jų nuorodos sutampa (1.1, 5.1).
- **Žinių bazė:** PĮ 95 str. 1 d. 12 privalomų sutarties turinio elementų, PĮ 96 str. 2 d. tiesioginis atsiskaitymas su subtiekėjais,
  VPĮ 87 str. 1 d. (VPĮ pirkimams - VPT tipinės sutarčių sąlygos), VPT tipinės prekių (1S-19) ir paslaugų (1S-209) sąlygos, VPT kainodaros
  metodika (1S-95) - perskaityta e-tar 2026-10-07. Kalibravimas - paskelbtos CVP IS sutartys tik **šeimai** nustatyti (jūsų pastaba:
  šablonai nuolat atnaujinami, 2026-10-05 - projektavimo ir rangos), ne tekstui ar redakcijai.

---

## 1. Kas išmatuota

### 1.1. Šablonų rinkinys (38 failai, 9 aplankai)

| Šeima | Failai | Kalbos | Redakcijos požymis | Generatoriui |
|---|---|---|---|---|
| Prekių pirkimo-pardavimo | BS, SS (LT); BS, SS (LT/EN) | LT, LT/EN | failų vardai „0922“ | tinka su pataisomis; LT ir LT/EN buvo **skirtingos redakcijos** (ne vertimas) - nuo 2026-10-07 LT/EN = LT + vertimas (5.5) |
| Paslaugų pirkimo-pardavimo | BS, SS (LT); BS, SS (LT/EN) | LT, LT/EN | „0922“, BS „05“ ir „0508“ | tinka su pataisomis; BS parašytos pagal VPĮ, į PĮ jas perveda SS 14.1 |
| Darbų pirkimo-pardavimo („mažoji“) | BS, SS | LT | BS be patvirtinimo datos | tinka su pataisomis |
| Eksploatavimo darbų | BS, SS „bendrasis atvejis“ + 3 SS (TP, OL, trasų valymas, 2025-10-09) + „Sutarties bendrosios sąlygos_Eksploatavimas“ (pridėta 2026-10-07) | LT | darbų BS - 2025-01-09 Nr. 25IS-1; eksploatavimo BS - patvirtinimo data neįrašyta („202_ m. ... įsakymu Nr.“) | „bendrasis atvejis“ = mažoji (tas pats tekstas); 3 regioninės SS + eksploatavimo BS - tinka su pataisomis (5.1) |
| Statybos rangos | BS, SS, SS-12, SS 13, SS-14, SS-23 | LT | BS - 2026-10-05 Nr. 26IS-147, SS „V.1.2.3.“ | tinka su pataisomis |
| Projektavimo ir statybos rangos | BS, SS + tie patys priedai | LT | BS - 2026-10-05 Nr. 26IS-147 | tinka su pataisomis |
| Projektavimo paslaugų | BS, SS, 3 priedas + priedai | LT | BS - 2026-10-05 Nr. 26IS-147 | tinka su pataisomis; aplanke - netinkami priedai (5 sk.) |
| Tiesioginio atsiskaitymo (trišalė) | darbai; paslaugos ir prekės (LT ir LT/EN) | LT, LT/EN | „0922“ | priedas prie pagrindinės sutarties; darbų variantas parengtas projektavimo ir statybos rangai |

Failų metaduomenys redakcijos neparodo (visi failai šiandien perrašyti), todėl redakcija generatoriuje bus įrašoma aiškiai
(redakcijų registras, 4.2 sk.), kaip SPS formų rodyklėje.

### 1.2. Kalibravimas su CVP IS (paskelbtos sutartys)

- LITGRID AB - 546 sutartys su dokumentais, sudarytos 2025-01 - 2026-10 (be pakeitimų); šeima nustatyta 346: visi 130 darbų, visos 136
  paslaugos su BVPŽ 71 ir 50, 40 kitų paslaugų, 40 prekių. Šeima nustatyta iš SS antraštės ar BS failo vardo paskelbtame archyve.
  Palyginimui - AB Amber Grid 40 sutarčių.
- **Visos sudarytos iki 2026-10-05 - pagal ankstesnes redakcijas.** Todėl naudota tik šeima (kokia sutartis kokiam pirkimui), ne tekstas.

| Šeima (LITGRID, 346) | Kiek | Pastaba |
|---|---|---|
| Paslaugų | 87 | 48 - senoji forma; dabartinė lentelės forma vyrauja nuo 2025-11 |
| Projektavimo ir statybos rangos | 77 | perdavimo tinklo objektai; tik 29 pavadinime mini projektavimą |
| Kitos formos | 65 | 55 - CPO LT katalogo / DPS formos (ekspertizės, techninė priežiūra, valymas, KASKO), 6 - tiekėjų formos |
| Projektavimo paslaugų | 39 | TP, OL, KL projektavimas ir projekto vykdymo priežiūra |
| Darbų mažoji | 30 | pastatai, teritorija, inžinerinės sistemos, IT / ryšio įranga, akumuliatoriai; mediana 63 tūkst. Eur |
| Prekių | 24 | 15 - LT/EN; nuo ~1,2 mln. Eur - visos LT/EN |
| Statybos rangos | 11 | darbai pagal jau parengtą techninį darbo projektą |
| Eksploatavimo | 9 | regioninės OL ar TP sutartys ir trasų valymas, nuo 1,9 mln. Eur, 37-61 mėn., visos užsakymais |

Ką tai reiškia algoritmui:
1. **Objekto rūšis (prekės / paslaugos / darbai) patikima** - neatitikimų tik 2 iš 277 LITGRID šablonais sudarytų sutarčių.
2. **Darbų šeimų neatskiria nei vertė, nei BVPŽ.** Iki 150 tūkst. Eur yra 25 mažosios, 13 projektavimo ir statybos ir 6 statybos rangos
   sutartys. Dviprasmiški žodžiai: „rekonstravimas“ (5 šeimos), „rangos“ (5), „montavimas“, „remontas“, „paprastojo remonto“ (3 + 3),
   „kapitalinis remontas“.
3. **Rangos šeimas skiria vienas faktas** - ar rangovas pats rengia projektą (techninį darbo projektą, demontavimo ar paprastojo
   remonto aprašą), ar projektas jau parengtas ir pridedamas. To nėra nei pavadinime, nei CVP IS laukuose - **reikia klausti**.
4. Trišalė (tiesioginio atsiskaitymo) sutartis yra 90 % sutarčių; LT/EN - tik prekių ir paslaugų sutartyse.
5. Amber Grid praktika kita (savos formos su kodais, pvz. SUT-36; atskiros projektavimo ir statybos formos nėra; trasų valymas -
   paslaugų forma). **Taisyklės turi būti atskiros kiekvienai organizacijai** - LITGRID taisyklės Amber Grid sutartims suklydo 5 kartus.

### 1.3. Teisinis pagrindas (e-tar, 2026-10-07)

- **PĮ 95 str. 1 d.** - raštu sudaromoje sutartyje turi būti nustatyta 12 elementų: šalių teisės ir pareigos; perkamos prekės,
  paslaugos ar darbai ir kiekis; kainodaros taisyklės pagal VPT metodiką; mokėjimo tvarka; prievolių įvykdymo terminai; įvykdymo
  užtikrinimas; peržiūros sąlygos ar pasirinkimo galimybės (jei numatoma); ginčų sprendimo tvarka; nutraukimo atvejai ir tvarka;
  galiojimas; subtiekėjai ir jų keitimo tvarka; atsakingas už sutarties vykdymą asmuo. **3 d.** - nacionaliniam saugumui strategiškai
  svarbių sektorių subjektui - specialus nutraukimo atvejis. **4 d.** - reikalavimai gali būti netaikomi, kai vertė mažesnė kaip
  15 000 Eur (be PVM) arba turinys vienodas visiems gavėjams.
- **PĮ 96 str. 2 d.** - jei leidžia sutarties pobūdis, pirkimo dokumentuose turi būti nustatyta tiesioginio atsiskaitymo su
  subtiekėjais galimybė ir tvarka; subtiekėjui pageidaujant sudaroma trišalė sutartis. Iš čia - tiesioginio atsiskaitymo šablonas.
- **VPĮ 87 str. 1 d.** - VPĮ pirkimų sutartys sudaromos taikant VPT tipines sąlygas, išskyrus, kai jos netaikytinos ar nepritaikomos
  (pagrindimas - ataskaitoje). **2 d. 7 p.** - kai trukmė su pratęsimu ilgesnė kaip 6 mėn., privaloma su mokesčiais nesusijusi kainos
  peržiūros sąlyga. PĮ tokių nuostatų neturi - **tai skiria LITGRID (PĮ) ir EPSO-G / centralizuoto AKV (VPĮ) pirkimus**.
- **VPT tipinės sąlygos:** prekių - 2024-02-08 Nr. 1S-19 (keista 2024-02-29 Nr. 1S-30 ir 2025-04-17 Nr. 1S-51), paslaugų - 2024-12-30
  Nr. 1S-209 (keista 2025-04-17 Nr. 1S-52). Darbų tipinių sąlygų e-tar paieška nerado. **Kainodaros taisyklių nustatymo metodika** -
  VPT 2017-06-28 Nr. 1S-95.

Visos šios nuorodos įgyvendinant bus įrašytos į `shared/teises-nuorodos.js` (su data `tikrinta`), moduliai numerių patys nerašys.

### 1.4. Prototipas (taisyklės, išmatuotos su kalibravimu)

| | LITGRID (277 sutartys su LITGRID šablonu) |
|---|---|
| Parinkta automatiškai | 202 (73 %) - visos teisingai |
| Parinkta neteisingai | **0** |
| Vienas klausimas | 52 |
| Du klausimai | 23 |
| Daugiau | 0 |

Pagal rūšį: paslaugos - 125 iš 125 automatiškai, prekės - 23 iš 24, darbai - 54 iš 128 (likusiems reikia klausimo, nes skiria ne
pavadinimas). Vienoje sutartyje (apsaugos posto elektroninės priemonės) paskelbta prekių SS su darbų BS - tai pačios sutarties
sumaišymas, kurio generatorius neleis.

**Svarbu:** taisyklės sudarytos žiūrint į tuos pačius duomenis, todėl 0 klaidų yra kalibravimo rinkinyje. Naujiems pirkimams tai
patvirtinsime 7 sk. S2 etape - stebėjimo režimu ir kiekviena nauja paskelbta LITGRID sutartimi (testų rinkinys).

---

## 2. Išmanusis parinkimo algoritmas (1 reikalavimas)

### 2.1. Principai

1. **Sprendžia taisyklės, ne tikimybė.** Kiekviena taisyklė - aiški sąlyga su priežastimi, kurią žmogus mato („parinkta, nes ...“).
   Kalbos modelis klasifikacijoje nedalyvauja (jis gali „įtikinamai suklysti“, o čia klaida - ne ta sutartis viešame pirkime).
2. **Abejonė - klausimas.** Jei likę daugiau nei vienas kandidatas arba požymiai prieštarauja vienas kitam - automatinio sprendimo nėra.
3. **Taisyklės - organizacijai.** Šablonai ir praktika LITGRID; kitam vykdytojui (Amber Grid, EPSO-G) automatinio parinkimo nėra,
   kol nėra jo šablonų ir kalibravimo.
4. **Taisyklės - versijuojamos ir testuojamos:** kiekviena paskelbta LITGRID sutartis tampa testu; naujas atvejis, kurio taisyklė
   neatpažįsta, - klausimas, ne spėjimas.

### 2.2. Įėjimai

Iš 1 žingsnio ir pirkimo kortelės: pirkimo pavadinimas, objekto rūšis (prekės / paslaugos / darbai / mišrus), BVPŽ, numatoma vertė,
pirkimo būdas, sutarties trukmė, dalys, SPS kalba (LT / LT-EN), vykdytojas ir režimas (PĮ / VPĮ).

### 2.3. Teksto analizė (semantiniai požymiai)

Pavadinimas normalizuojamas: mažosios raidės, be diakritikų, kamienai (kaip `shared/privalomi-elementai.js` - JS `\w` ir `\b`
lietuviškų raidžių neatpažįsta). Ieškoma ne pavienių žodžių, o **požymių klasių**:

| Požymis | Pavyzdžiai (kamienai) | Ką reiškia |
|---|---|---|
| Perdavimo tinklo objektas | „kV“, TP, OL, KL, skirstykla, oro linija, prijungimas, jungtis | darbai statinyje, kuriam rengiamas ar pridedamas projektas |
| Statybos veiksmas | rekonstravimas, statyba, kapitalinis ar paprastasis remontas, pertvarkymas, demontavimas, rangos darbai | rangos šeima |
| Projektavimas sutartyje | projektavimas, darbo / techninio projekto rengimas | projektavimo ir statybos rangos arba projektavimo paslaugų |
| Pastatas ar teritorija | tvora, vartai, durys, langai, stogas, patalpos, aikštelė, kelias, privažiavimas, sienelė, sandėlis | smulkūs darbai (mažoji) - net TP teritorijoje |
| Smulkus veiksmas | remontas, keitimas, atstatymas, įrengimas, dažymas, montavimas | smulkūs darbai, jei nėra statybos veiksmo ir projektavimo |
| Eksploatacija | eksploatavimo darbai + OL / TP; trasų valymas, kirtimas, augmenija | eksploatavimo sutartis ir jos variantas |
| Pastato inžinerinės sistemos | vėdinimas, šildymas, kondicionieriai | „eksploatavimas“, bet darbų pirkimo-pardavimo sutartis |
| Bendras ESO pirkimas | „ESO“, „(ES)“ | projektą gali rengti ar apmokėti kita šalis - visada klausti |
| Licencijos su palaikymu | licencija + palaikymas / paslaugos | prekių ar paslaugų - klausti |

Pavyzdys - jūsų atvejai: „Tvoros remontas“ - pastatas ar teritorija (tvora) + smulkus veiksmas (remontas), nėra statybos veiksmo,
projektavimo, ESO - **automatiškai: Darbų pirkimo-pardavimo (mažoji) sutartis**, priežastis rodoma. Taip pat „Sandėlių durų keitimas“,
„Įvažiuojamojo kelio atstatymas“ ir „Panevėžio TP tvoros remontas“. Bet „110 kV Mažeikių skirstyklos rekonstravimas“ - tinklo objektas +
statybos veiksmas, projektavimo pavadinime nėra - **klausimas K1** (2.4).

### 2.4. Sprendimų medis

A. **Ar reikia LITGRID šablono?** Ne, jei pirkimas vykdomas per CPO LT (jų sutarties forma) arba sutartis - tiekėjo forma; tada
   generatorius sako, kodėl sutarties projekto nerengia. PP-salygos šiuo metu rengia LITGRID pirkimo sąlygas, todėl numatytoji reikšmė -
   reikia.
B. **Objekto rūšis** - iš kortelės ar 1 žingsnio. Mišriam - klausimas K0 („Kas sudaro pagrindinę pirkimo dalį?“), atsakymą sistema
   įrašo ir į SPS logiką.
C. **Šeima:**

| Rūšis | Taisyklė | Rezultatas |
|---|---|---|
| Prekės | visada, išskyrus licencijas su palaikymu | Prekių (licencijos - K5) |
| Paslaugos | „projekto vykdymo priežiūra“ | Projektavimo paslaugų |
| | projektavimas + perdavimo tinklo objektas (ne apsaugos sistemos) | Projektavimo paslaugų |
| | apsaugos sistemų projektavimas | Paslaugų |
| | projektavimas be tinklo objekto | K4 |
| | ekspertizė, techninė priežiūra (klausiama „Ar perkama per CPO LT?“ - taip: projektas nerengiamas), kita | Paslaugų |
| Darbai | trasų valymas / kirtimas / augmenija | Eksploatavimo (trasų valymas) |
| | eksploatavimo darbai + oro linijos / TP | Eksploatavimo (OL / TP) |
| | eksploatavimo darbai + vėdinimas, šildymas, kondicionieriai | Darbų pirkimo-pardavimo |
| | pastatas ar teritorija + smulkus veiksmas, be statybos veiksmo, projektavimo ir ESO | Darbų pirkimo-pardavimo (mažoji) |
| | projektavimas + „rangos“ / „statybos darbai“, ne ESO | Projektavimo ir statybos rangos |
| | tinklo objektas + statybos veiksmas ar projektavimas | K1 |
| | kita | K2 |

D. **Variantas:** kalba (pagal SPS kalbą; jei šeima LT/EN neturi - pasakoma, ne verčiama), eksploatavimo variantas (pagal žodį arba K3),
   trišalė (žr. 3.2), užsakymai ar vienkartiniai darbai (2 žingsnio klausimas - jis valdo SS skyrius, ne šeimą).

### 2.5. Kodėl ne „NLP modelis“

Išmatuota: tas pats žodis - skirtingos sutartys (2 skirsnis). Pvz. „110 kV Kaunas-Jonava I kapitalinio remonto rangos darbai“ - statybos
rangos (darbo projektas jau parengtas), o „... Kaunas-Eiguliai ... kapitalinis remontas darbo projekto rengimas ir rangos darbai“ -
projektavimo ir statybos rangos. Ir „Generatoriai ir jų įrengimo darbai transformatorių pastotėse“ (1,3 mln. Eur) - projektavimo ir
statybos, o „Alytaus TP generatoriaus keitimas“ (85 tūkst. Eur) - mažoji. Bet koks modelis, kuris tokius atvejus „atspėtų“ iš teksto,
kartais klystų tyliai. Taisyklė „abejoji - klausk“ klysta garsiai - klausimu.

---

## 3. Fallback mechanizmas ir klausimynas (2 reikalavimas)

### 3.1. Klausimų katalogas

Klausimas užduodamas tik tada, kai po taisyklių lieka keli kandidatai. Atsakymų variantai - tik tie, kurie atitinka šablonų taikymo
sritį (tekstas - iš pačių šablonų sutarties dalyko ir apibrėžimų). Prie kiekvieno - „?“ paaiškinimas (`shared/paaiskinimas.js`).

| Kodas | Kada | Klausimas | Atsakymai -> sutartis |
|---|---|---|---|
| K1 | tinklo objektas + statybos veiksmas | Ar rangovas pagal sutartį rengs projektą (techninį darbo projektą, demontavimo ar paprastojo remonto aprašą)? | Taip, rangovas projektuoja -> Projektavimo ir statybos rangos; Ne, Užsakovas pateikia parengtą projektą -> Statybos rangos |
| K2 | darbai be aiškių požymių | Kokie tai darbai? | Smulkūs darbai pastatuose, teritorijoje, inžinerinėse sistemose ar įrangos keitimas be statinio projekto -> Darbų pirkimo-pardavimo (mažoji); Darbai perdavimo tinklo objekte pagal Užsakovo parengtą projektą -> Statybos rangos; Darbai perdavimo tinklo objekte, kai rangovas rengia projektą -> Projektavimo ir statybos rangos; Ilgalaikė regioninė OL ar TP eksploatacija ar trasų valymas -> Eksploatavimo |
| K3 | eksploatacija be aiškaus objekto | Kokia eksploatacija? | Oro linijos / Transformatorių pastotės / Trasų valymas / Pastato sistemos ar kita (-> Darbų pirkimo-pardavimo) |
| K4 | paslaugų projektavimas be tinklo objekto | Ar perkamas statinio (TP, OL, KL) projektavimas ir projekto vykdymo priežiūra? | Taip -> Projektavimo paslaugų; Ne (pvz. apsaugos ar IT sistemų projektavimas) -> Paslaugų |
| K5 | licencijos su palaikymu | Kas sudaro pagrindinę vertę? | Licencijos (prekės) -> Prekių; Palaikymo paslaugos -> Paslaugų |
| K0 | mišrus objektas | Kas sudaro pagrindinę pirkimo dalį? | Prekės / Paslaugos / Darbai -> toliau pagal C |

K2 sujungia du žingsnius į vieną klausimą su 4 atsakymais - todėl darbams beveik visada užtenka **vieno** klausimo; antras -
tik K3 eksploatavimo variantui. Kalibravimo duomenyse: 0 klausimų - 202, 1 - 52, 2 - 23.

### 3.2. Klausimai, kurie nesprendžia šeimos, bet būtini sutarčiai (2 žingsnyje)

Jie jau egzistuoja SPS formoje arba atsiras kartu su sutarties laukais - kiekvienas su privalomu atsakymu, be tylių numatytųjų:
tiesioginis atsiskaitymas su subtiekėjais (trišalė; numatytasis - „Siūloma: taip“ su priežastimi PĮ 96 str. 2 d., ne tyli reikšmė),
darbai užsakymais ar vienkartiniai pagal grafiką, kainodara (VPT 1S-95 rūšys, kaip šablonų sąrašuose), užtikrinimas, apmokėjimas,
garantijos, ar perkama etapais.

### 3.4. SS valdiklių atsakymai: iš kur jie ateina (jūsų sprendimai 2026-10-07)

Prekių ir paslaugų LT SS turi po ~21 išskleidžiamąjį sąrašą. Šablone dalis jų buvo palikti pasirinkti nuo ankstesnio pirkimo (prekėse
3.3, 4.1 su įrašytu „1“, 5.1, 5.3, 5.5, 14.3, 14.4; paslaugose 5.2, 5.3, 5.5, 11.1 trukmė „36 mėnesiai“) - tokia reikšmė atrodo kaip
sprendimas, kurio niekas nepriėmė. Principas: **šablonas sprendimų neneša** (visi valdikliai - „Pasirinkite elementą.“), o generatorius
kiekvieną užpildo iš pirmo tinkamo šaltinio ir žymi „Siūloma (nepatvirtinta)“ su kilme; klausiama tik to, ko niekas nežino.

| Punktas | Šaltinis | Taisyklė |
|---|---|---|
| 11.1 trukmė | pirkimo kortelė („Sutarties trukmė“) | 6 / 12 / 24 / 36 mėn. - tas variantas, kitaip „iki [...]“ |
| 8.1 ir 8.3 užtikrinimas | SPS 2 žingsnis (užtikrinimo dydis) | yra dydis - „netesybos; ... garantija ...“ ir 8.3 taikomas (dydis - procentais, 4.4); nėra - „netesybos.“ ir 8.3 netaikomas |
| 11.1 įsigaliojimas | 8.3 ir 3.3 atsakymai | užtikrinimas - 2 variantas; ES lėšos - 3 variantas; kitaip - 1 (valdybos pritarimo variantas - tik klausus) |
| 9.7 kokybiniai kriterijai | SPS 8.1 kriterijus | kaina ar sąnaudos - „Punktas netaikomas.“; kokybės santykis - „Punktas netaikomas.“, jei laimėjęs tiekėjas kokybinių kriterijų nesiūlė (VPT aktuali 9.7), kitaip - LITGRID „1000 Eur“ |
| 4.3 užsakymų tvarka, 13.1 žaliųjų teisinis pagrindas | kainodara; SPS žaliųjų atsakymas | be užsakymų - „Netaikoma“; žalieji reikalavimai nenustatyti - „Netaikoma“, nustatyti - klausiamas Tvarkos aprašo papunktis |
| 13.2-13.4 LITGRID aplinkosauginiai kriterijai (pakavimo lapas, pristatymas, montavimas) | **dar nenustatyta** | kol nenustatėte standarto - klausiama kiekvienam |
| 14.3 nacionalinis saugumas | SPS 1 žingsnis | tas pats atsakymas |
| 5.2, 5.4, 5.5, 4.1 variantas | 5.1 kainodara (+ ar įsipareigojama išpirkti kiekį) | fiksuota kaina - visa kaina įvykdžius, nuo įsigaliojimo; įkainiai užsakymais - už užsakymą, nuo užsakymo pateikimo |
| 5.7 avanso užtikrinimas | 5.6 | seka 5.6 |
| 9.10 sutikimo bauda | 14.4 | seka 14.4 |
| 5.3 kainų peržiūra | kortelės trukmė | **standartas:** trukmė > 6 mėn. - „taikoma“ (pati sąlyga leidžia inicijuoti peržiūrą tik po 6 mėn.), kitaip - netaikoma |
| 5.6 avansas | LITGRID standartas | **„Punktas netaikomas.“** |
| 6.2 garantinė priežiūra (prekės) | LITGRID standartas | **„Tiekėjas privalo pašalinti trūkumus per Techninėje specifikacijoje nurodytą terminą. Jei terminas nenurodytas – ne ilgiau kaip per 10 (dešimt) dienų. ...“** |
| 9.9 bauda dėl Pirkėjo simbolių ir intelektinės nuosavybės | LITGRID standartas | **„Netaikoma.“** |
| 3.3 ES lėšos, 4.1 terminas (skaičius ir vienetas), 5.1 kainodara, 7.1 subtiekėjai, 14.4 darbas tinklo objektuose | klausiama | 7.1 - iš laimėjusio pasiūlymo, rengiant pasirašyti; 14.4 - kartu su sutarties parinkimo klausimais |

Iš 21 valdiklio: 12 - iš jau įvestų duomenų, 4 - LITGRID standartu (siūloma su kilme „LITGRID standartas“, patvirtinama vienu
paspaudimu), 5 klausimai. Šablonuose visi valdikliai nepasirinkti nuo 2026-10-07 (5.5). Kai sutarties
generavimas bus SPS rengimo dalis, 3.3, 5.1 ir 14.4 klausiami vieną kartą abiem dokumentams.

### 3.3. Vartotojo srautas

```
1 žingsnis: Būdas, objektas, pavadinimas, vertė, kalba (kaip dabar)
  └─ Blokas „Sutarties projektas“ (po pavadinimo)
       ● Parinkta: Darbų pirkimo-pardavimo (mažoji) sutartis   Siūloma (nepatvirtinta)
         Kodėl: objektas - darbai; „tvoros remontas“ - pastatas ar teritorija ir smulkus darbas; projektavimo ir rekonstravimo nėra.
         [Patvirtinti]  [Pakeisti]          Redakcija: 2026-xx-xx (registras)
       arba
       ● Reikia vieno atsakymo: Ar rangovas pagal sutartį rengs projektą ... ?   (?)
         ( ) Taip, rangovas projektuoja   ( ) Ne, Užsakovas pateikia parengtą projektą
       arba
       ● Sutarties projektas nerengiamas: [pirkimas per CPO LT / tiekėjo forma / esminės sąlygos SPS]  (tada SPS „Esminės sutarties sąlygos“)
2 žingsnis: SPS laukai + sutarties laukai viename sąraše, sugrupuoti pagal dokumentą (BS, SS, priedai);
            bendri (užtikrinimas, trukmė, trišalė, kalba) - klausiami VIENĄ kartą ir įrašomi į abu dokumentus.
3 žingsnis: Paketas - SPS, BPS, formos IR sutarties projektas (BS, SS, priedai); patikra (4.5) - kas pakeista, kas pašalinta.
```

Pagal 2026-10-04 formos principus parinkta šeima niekada neatrodo kaip žmogaus sprendimas: „Siūloma (nepatvirtinta)“ ir priežastis;
„Patvirtinta“ - tik paspaudus. Pakeitęs šeimą žmogus mato, kodėl sistema siūlė kitą.

---

## 4. Nulinės klaidų tolerancijos generavimas (3 reikalavimas)

### 4.1. Kas jau yra ir veikia

SPS šablonams: žemėlapiai (`zemelapiai/*.json`, kartografas), laukų registras (`laukai.js`), variklis (`GPGen`), numeracija tekstu
(`GPNum`), lentelės (`GPLent`), generavimo pasas, palyginimas su forma (`shared/palyginimas.js`), privalomų elementų katalogas.
Sutartims naudojamas tas pats variklis - naujo „DI generatoriaus“ nereikia.

### 4.2. Šablonų paruošimas

1. **Redakcijų registras** `sutarciu-versijos.json` (kaip `formu-versijos.json`): šeima, failas, redakcijos data ir šaltinis
   (pvz. LITGRID 2026-10-05 Nr. 26IS-147), formos maiša. Pasikeitus failui - nauja eilutė; generatorius naudoja galiojančią,
   tikrinimas atpažįsta ir ankstesnes.
2. **Žemėlapis kiekvienam failui:** kintamųjų vietos ir sąlyginiai blokai. Sutarčių šablonuose pildomos vietos žymimos ne tik raudonai
   (kaip SPS): geltonu ar kitu fonu, mėlynai (5 atspalviai), juodais laužtiniais skliaustais, „____“, „XXXX“, Word sąrašais
   („Pasirinkite elementą“) ir „//“ nurodymais - kartografas bus išplėstas visiems būdams; komentarai (su vidinėmis taisyklėmis) iš
   generuojamo failo šalinami.
3. **Iš anksto pasirinktos reikšmės** šablonuose (pvz. prekių SS „Fiksuoto įkainio“, „per 1 mėnesį“, paslaugų SS „Mišri kainodara“,
   „36 mėnesiai“) laikomos **neatsakytomis** - žmogus turi pasirinkti.

### 4.3. Kintamieji

| Kintamasis | Šaltinis | Būsena |
|---|---|---|
| Pirkimo pavadinimas, būdas | 1 žingsnis / kortelė | įrašoma |
| Perkamos prekės / paslaugos / darbai (sutarties dalykas) | pavadinimas + 2 žingsnio patvirtinimas | Siūloma |
| Priedų numeriai ir sąrašas | to paties SS priedų sąrašas pagal atsakymus (trišalė, techninė specifikacija, pasiūlymas ...) | įrašoma |
| Užtikrinimas, trukmė, kainodara, apmokėjimas, garantijos | 2 žingsnio atsakymai, bendri su SPS | įrašoma |
| Organizacijos rekvizitai, el. paštas, svetainė | `shared/organizacijos.js` | įrašoma **pagal vietos tipą** (ne bendras „ĮMONĖS PAVADINIMAS“ keitimas - kitaip „info@LITGRID AB.eu“) |
| Tiekėjo duomenys, kaina, sutarties numeris ir data, atstovai, atsakingi asmenys | sudarant sutartį | lieka tuščia, pažymima patikroje |
| Numatoma vertė | - | į skelbiamą projektą neįrašoma be žmogaus sprendimo |

### 4.4. Vienas tiesos šaltinis tarp SPS ir sutarties

- SPS „Esminės sutarties sąlygos (dalis reikalinga, jei nepridedamas Sutarties projektas)“ - pašalinama automatiškai, kai projektas
  generuojamas; paliekama, kai pasirinkta „nerengiamas“.
- Užtikrinimas: SPS klausia eurais („X Eur“), SS - procentais. Viena reikšmė, perskaičiuojama ir įrašoma abiem formomis.
- Tiesioginis atsiskaitymas: SPS „tvarka nurodyta Sutarties projekte“ ir SS priedas „Trišalės sutarties projektas“ - tas pats atsakymas.
- Kalba: LT/EN SPS -> LT/EN sutartis, jei šeima ją turi; kitaip - pasakoma prieš generuojant.
- Žalieji reikalavimai: SPS „nurodyti Techninėje specifikacijoje ir (ar) Sutarties projekte“ - tikrinama, ar sutartyje jie yra.

**Padaryta 2026-10-09** (prekių ir paslaugų sutartys; jūsų „Taip, pradėkime nuo 1 darbo.“):

- **Esminės sąlygos.** 1 žingsnio bloke patvirtinta sutartis - SPS sąlyga „Jei Pirkimo metu nėra rengiamas Sutarties projektas“ atsakoma
  pati („Ne“), o SPS dalis „Esminės sutarties sąlygos (dalis reikalinga, jei nepridedamas Sutarties projektas)“ pašalinama visa: antraštė,
  pastaba, tušti punktai ir turinio eilutė (LT/EN - turinys lentelėje); skyriai ir turinys perskaičiuojami (GPNum: turinio eilutės nurodymas
  skliaustuose, kurio antraštėje nėra, pvz. „14. PRIEDAI (koreguojama pagal poreikį)“, pašalinamas - kitaip turinio numeris nepasikeisdavo).
  „Sutarties projektas nerengiamas - esminės sąlygos SPS“ - dalis paliekama, 3 žingsnis primena ją užpildyti Word programoje; nepatvirtinta
  sutartis, CPO LT ar tiekėjo forma - klausiama kaip iki šiol. Nuoroda „Esminės sutarties sąlygos išdėstytos SPS __ dalyje“ yra pačiame
  šalinamame bloke - prieštaravimo nelieka.
- **Tiesioginis atsiskaitymas.** Generuojamos sutarties BS 3.4 p. visada nustato tiesioginio atsiskaitymo su subtiekėjais tvarką (paslaugų
  SS - ir priedas „Trišalės sutarties projektas“), todėl SPS sąlyga „Kai taikomas tiesioginis atsiskaitymas ...“ atsakoma pati („Taip“,
  nuostata „tvarka nurodyta Sutarties projekte“ lieka); kitai ar nerengiamai sutarčiai - klausiama. Rasta ir ištaisyta: MVP LT/EN SPS ši
  nuostata (sulieta su raudona sąlyga) prasidėdavo tarpu.
- **Kalba.** Sutarties kalba imama iš 1 žingsnio (LT ar LT/EN) - ta pati kaip SPS; prekėms ir paslaugoms abi redakcijos yra.
- **Žalieji reikalavimai.** Sutarties SS 13.1 p. klausimas rodo, kas pasirinkta SPS žaliųjų reikalavimų dalyje (atsakymas iš to neišvedamas -
  SPS „ir (ar)“, kriterijai gali būti tik TS); „Patikrinkite (SPS ir sutartis)“ formoje ir 3 žingsnyje, kai SS 13.1 taikomas, o SPS nesako
  „Sutarties projekte“, arba SS 13.1 netaikomas, o SPS sako „Techninėje specifikacijoje ir (ar) Sutarties projekte“.
- **Tikrinimo skirtukas.** „Tikrinti parengtus dokumentus“ atpažįsta ir sutarčių BS ir SS (`sutarciu-versijos.json`), palyginimas - sutarties
  režimu (`GP_PALYGINIMAS.lygink(..., { sutartis })`): pildomos vietos, išskleidžiamų sąrašų variantai ir pasirenkamos dalys - iš sutarties
  žemėlapio; sąraše tik formos variantai (kitas tekstas - nukrypimas „ne iš sąrašo“); pridėta, pašalinta ar pakeista nuostata - nukrypimas
  ir lentelėje (SS - visa lentelė). LITGRID „0922“ redakcija (ir LT/EN su LITGRID anglų tekstu) - ne nukrypimas: `sutarciu-sablonai.py --versijos`
  įrašo ankstesnių redakcijų pastraipų maišas (`kitos_versijos`, `kitos_pozymiai`) ir mūsų taisymų maišas (`naujos`); registre - tik maišos.
  Išmatuota: 8 šablonai, 8 LITGRID originalai (privatūs) ir 8 sugeneruoti be paso - 0 nukrypimų; keturiose SS po tris dirbtinius pakeitimus -
  visi rasti. Palyginimas rado ir tikrą klaidą: LT/EN prekių SS anglų 5.3.1.2 p. sąrašo elementas kartojo punkto numerį (sugeneruotoje
  sutartyje „5.3.1.2. 5.3.1.2. in the event ...“) - šablone pataisyta (redakcinė korekcija, kopija `originalai-2026-10-09/`).

### 4.5. Patikra po generavimo (stabdo, ne įspėja)

1. **Palyginimas su šablono forma** (`GP_PALYGINIMAS`): leidžiami tik žemėlapio kintamieji ir atsakymais pašalinti blokai. Bet koks kitas
   skirtumas - atsisiųsti neleidžiama, rodoma vieta.
2. **Neliko pildomų vietų** (išskyrus tas, kurios pildomos sudarant sutartį - jos išvardijamos), komentarų, „Pasirinkite elementą“.
3. **Nuorodų sargas:** kiekviena nuoroda „X punkte“, „X priede“, „Sutarties bendrųjų sąlygų X.Y“ turi rodyti į egzistuojantį tos pačios
   sutarties punktą ar priedą (šablonuose tokių klaidų rasta dešimtys - 5 sk.). **Padaryta 2026-10-09** (`sutarciu-nuorodos.js`): ne stabdo, o rodo
   radinius 3 žingsnyje ir tikrinimo skirtuke (taisoma Word programoje); šablonai po 5 sk. taisymų - be klaidų.
4. **PĮ 95 str. 1 d. katalogas** (kaip `GP_PRIVALOMI`): 12 elementų - kur sutartyje rasta, su citata; nerastas - „Patikrinkite“.
   **Padaryta 2026-10-09** (`shared/sutarties-elementai.js`, registro raktai `sut_*`, PĮ 95 str. ir VPĮ 87 str. perskaityti e-tar): 12 elementų ir
   3 d. nacionalinio saugumo nutraukimo atvejis (13); ieškoma sutarties specialiosiose ir bendrosiose sąlygose, tikslesnis požymis - pirmas, kad
   citata rodytų skyrių ar nuostatą; nerastas - „Patikrinkite“, „jeigu numatoma“ (7 p.), „jeigu pasitelkiami“ (11 p.) ir 3 d. - informacija,
   VPĮ sutarčiai ilgiau kaip 6 mėn. kainos peržiūra - „Patikrinkite“; numatoma vertė mažesnė kaip 15 000 Eur be PVM (4 d. - viso straipsnio
   reikalavimai gali būti netaikomi; riba - `GP_THRESHOLDS.SUTARTIS`) - informacija; niekada kliūtis ir ne „atitinka įstatymą“. Tikrinimo skirtuke -
   grupė „Privalomi sutarties elementai“ (vaidmuo - ir pagal atpažintą formą ar generavimo pasą; VPĮ - VPT tipinių sąlygų eilutė, nevertinama),
   3 žingsnyje - eilutė `#sutartiesElementai`. Išmatuota: 8 šablonai ir sugeneruotos sutartys („Taip“ ir „Ne“) - rasti visi 13.
5. **SPS ir sutarties atitiktis** (4.4) - skaičiai ir sprendimai sutampa.
6. **Generavimo pasas** - šablonas, redakcija, maišos (be atsakymų), kaip SPS; tada „Tikrinti parengtus dokumentus“ tiksliai mato vėlesnius
   pakeitimus ir sutarties projekte.

### 4.6. DI vaidmuo

DI teisinio teksto nerašo ir nekeičia. Galimas tik pasiūlymas 2 žingsnio atsakymui iš rengėjo dokumentų (pvz. TS) su tikrinama citata
- kaip A5: priima žmogus, numatoma vertė nesiunčiama. Klasifikacijoje DI nedalyvauja.

### 4.7. Kas lieka žmogui

„100 %“ šiame projekte reiškia: sugeneruotas tekstas raidė į raidę sutampa su LITGRID šablono redakcija, išskyrus žemėlapyje pažymėtas
vietas, o kiekviena neaiški vieta paklausiama. Šablono **turinio** klaidų (5 sk.) generatorius pats neišsprendžia - jas sprendžia LITGRID;
kol neišspręsta blokuojanti klaida, šeima nesiūloma.

---

## 5. Šablonų klaidos ir jų taisymas

### 5.1. Kas rasta

Peržiūrėti visi 38 failai (Word numeracija atkurta iš `numbering.xml`; kiekvienas radinys - su citata ir vieta). Loginių radinių:
darbų, eksploatavimo ir trišalių - 33, paslaugų - 37, prekių - 30, statybos ir projektavimo - 47; plius rašybos klaidos.
Pavyzdžiai (patikrinti tekste):

| Šeima | Radinys | Rūšis |
|---|---|---|
| Eksploatavimo (3 regioninės SS) | Su 2026-10-07 pridėtomis eksploatavimo BS (10 skyrių) SS nuorodos rodo į esamus punktus (7.3, 8.2.2, 8.3.1 lentelės 15 eilutė, 9.3, 5.1.2, 5.1.4-5.1.6, 8.6.6-8.6.7), sąvokos „Brigados“, „Neplaniniai“ ir „Avariniai darbai“ apibrėžtos. Išimtis - trasų valymo SS „Kitų sąlygų“ 1 p. „3.1.3, 3.3, 3.7.3-3.7.14, 3.8, 3.9, 3.10 ... punktų reikalavimai nebus taikomi“: BS 3.7 turi tik 3.7.1-3.7.5, o sakinys paveldėtas iš ankstesnių BS redakcijų (EDS:2021: 3.3 „Užsakovo patalpos“, 3.7 „Įrenginiai ir medžiagos“, 3.8-3.10 - įrankiai, matavimai, demontavimas) ir po pernumeravimo neperskaičiuotas (2026-10-13 analizė pagal paskelbtas LITGRID trasų valymo sutartis ir BS redakcijas). Tos pačios kilmės: TV ir TP SS „[Sąvokos 1.1.2, 1.1.7, 1.1.11 punktai]“ - „Neplaniniai darbai“ yra 1.1.12; TV SS pastaba „reikalavimas koreguotas ... 19 p. 3 p.“ | turinys - naudotojo sprendimas 2026-10-13: generatoriuje „3.1.4, 3.6.3-3.6.12, 3.7, 3.8, 3.9, 5.1.2, 5.1.4-5.1.6, 8.6.6, 8.6.7“ („3.3“ išbraukiamas) - pritaikyta šablone 2026-10-13 (šeimos S1, 7 sk.); trys klausimai - laiške LITGRID (juodraštis privačiai); antraščių „1.1.11“ ir pastaba „19 p. 3 p.“ - 8 sk. 19 p. |
| Eksploatavimo BS | 3.11.3 ir 3.11.4 „Dėl Sąlygų 3.12.2 punkte nurodytų priežasčių“ - 3.12.2 nėra; priežastys išvardytos 3.11.2. 2026-10-13 auditas: aplanko failas skiriasi nuo LITGRID 2025-12 ir 2026-04 pirkimuose paskelbtos redakcijos (sąvoka „Sąlygos“, aštuonių punktų numeriai, 5.3.13 ir 8.6.3 p.); devynios pastraipos su ženkleliu vietoj numerio; 3.2.5 p. straipsnių numeriai be indekso („151“, „221“) | ištaisyta 2026-10-13 jūsų sprendimais (8 sk. 19 p. A-C, E): priderinta prie paskelbto teksto, punktai sunumeruoti, nuoroda - į 3.11.2 p.; indeksai, rašyba ir skyryba - redakcinės korekcijos |
| Darbų pirkimo-pardavimo | SS 1.3: „o įrengtiems užtvarams ir juos komplektuojančioms dalims dviejų metų garantinį terminą“ - konkretaus pirkimo likutis | turinys |
| Darbų pirkimo-pardavimo | BS neturi tiesioginio atsiskaitymo tvarkos, o SS priedų sąraše - „Trišalės sutarties projektas“ | turinys |
| Tiesioginio atsiskaitymo (darbai) | parašyta projektavimo ir statybos rangai („projektavimo ir statybos darbų pirkimo sutartį“, „Techninis projektas“, „Darbų žiniaraštis“) | turinys / generatoriaus variantas |
| Visos (SS, BS, trišalės) | „info@Įmonės pavadinimas.eu“, „http://www.Įmonės pavadinimas.eu/...“; LT/EN paslaugų SS - „info@ligrid.eu“ | generatorius įrašo **info@litgrid.eu** (jūsų atsakymas 2026-10-07) ir www.litgrid.eu (šablono adresas su litgrid.eu veikia - peradresuoja į „Reikalavimai rangovams“) |
| Statybos rangos | SS priedų sąraše: „... projektavimo ir statybos rangos sutarties bendrosios sąlygos“ - nurodytos kitos BS; liko projektavimo priedai („Apmokėjimas už Projektą“, projektuotojo polisas) | redakcinė / turinys |
| Statybos rangos | BS 2.3.8 „(Sutarties bendrųjų sąlygų 5.7 punktas)“ - 5.7 nėra (turi būti 4.7); taip pat 3.9.19, 3.10.3, 9.3.2 p), 8.1.15.2 | redakcinė |
| Statybos ir projektavimo-statybos rangos | Pakopiniai delspinigiai: „daugiau nei 31 dieną, tačiau mažiau kaip 60 dienų“, „daugiau kaip 61 dieną“ - 31-a ir 61-a dienos nepatenka į jokią pakopą | redakcinė |
| Projektavimo paslaugų | Aplanke SS 13 - rangos darbų ataskaita, SS-14 - pažymos forma, ne trišalė; BS punktai Word rodomi 1.1.3-1.2.188 (sąrašas nesusietas su skyriais); BS ir SS pirmumas nenustatytas | redakcinė / turinys |
| Prekių | SS 14.1 papildo BS „22.2.2.13“ papunkčiu, bet LT BS 22.2.2.13 jau yra (nacionalinio saugumo nutraukimo pagrindas) - atsirastų du skirtingi 22.2.2.13 | redakcinė (numeris) |
| Prekių ir paslaugų | Netesybos ribojamos 20 %, o esminis pažeidimas - kai netesybos „viršija 20 %“: pagrindas niekada neįvyksta | **palikta** (jūsų sprendimas 2026-10-07) - bendrų pastebėjimų sąrašas teisininkams (5.3) |
| Prekių ir paslaugų | LT ir LT/EN rinkiniai paimti iš skirtingų VPT redakcijų (5.4); sumos SS (pvz. 9.4 bauda: LT - 100 Eur, LT/EN - 1000 Eur) įrašytos LITGRID, VPT formoje - pildoma vieta | sprendimas (8 sk. 4 p.) |
| Paslaugų | LT/EN SS 14.1 „1.1.1.16. VPĮ / PĮ“ - BS 1.1.1.16 yra „Užsakymas“: pritaikius būtų perrašytas Užsakymo apibrėžimas | redakcinė |
| Paslaugų | Užtikrinimo pratęsimui - 4 skirtingi terminai (10 darbo dienų iki, 10 dienų iki, 10 darbo dienų po, 30 dienų po) | turinys |

Pilnos ataskaitos su visais radiniais, siūlomais pataisymais ir žymomis [R] redakcinė / [T] turinys / [K] generatoriaus klausimas -
`~/Documents/g-procure-privatu/sutartys/auditas_*.md`.

### 5.2. Kaip taisome

1. **Redakcinės korekcijos** (numeriai, nuorodos į punktus, skyryba, rašyba, numeracijos sąrašai) - `sablonu-taisymai.py` analogas
   sutartims: taisoma generatoriaus kopija, LITGRID originalai nekeičiami, pakartotinai - 0 pakeitimų, kiekvienam - testas
   (jūsų 2026-10-05 leidimas tokias korekcijas daryti neklausiant; turinio, terminų ir sumų - ne).
2. **Turinio klaidos** (sumos, terminai, procentų bazės, prieštaravimai tarp BS ir SS, kuri LT/EN redakcija galioja) - sąrašas ir laiškas
   LITGRID, kaip SPS šablonams; kol neatsakyta - generatorius rodo, kad šeimoje yra neišspręstų turinio klausimų.
3. **Blokuojančios** (trūksta BS) - šeima nesiūloma, klausimyne rodoma priežastis.
4. **Sargai variklyje,** kad tokios klaidos neatsirastų naujose redakcijose: nuorodų sargas (4.5.3), dviejų vienodų punktų numerių
   sargas, SS punktų, keičiančių BS punktus, sargas (ar keičiamas punktas egzistuoja ir ar tai tas punktas).

### 5.3. Bendri pastebėjimai teisininkams

Jūsų sprendimu (2026-10-07) šios nuostatos šablonuose **lieka nepakeistos**; generatorius jų nekeičia ir nerodo kaip klaidų, o sąrašas
kaupiamas teisininkams:

1. Prekių SS 9.14.6 (iki 2026-10-07 - 9.13.6) ir 12.2.1.3, paslaugų SS 9.14.6 ir 12.2.5 - netesybos ribojamos 20 % Pradinės sutarties vertės, o esminis pažeidimas
   nustatomas, kai netesybų suma „viršija 20 (dvidešimt) proc. Pradinės sutarties vertės“ - pagrindas negali įvykti.

Sąrašas pildomas, kai sprendžiate, kad turinio pastaba keliauja teisininkams, o ne į LITGRID laišką.

### 5.4. Prekių ir paslaugų šablonai prieš VPT tipines sąlygas (patikrinta e-tar, 2026-10-07)

Jūsų pastaba: šie sutarties projektai paimti iš VPT patvirtintų formų. Palyginta su VPT 1S-19 (prekės) ir 1S-209 (paslaugos) - pradine
redakcija ir pakeista 2025-04-17 įsakymais Nr. 1S-51 ir 1S-52 (įsigaliojo 2025-05-01; jų 2.2 p.: iki 2025-05-01 pradėtose procedūrose
taikomos ankstesnės nuostatos).

1. **BS - pasitvirtino, bet iš skirtingų VPT redakcijų.** LT rinkiniai atitinka **aktualią** VPT redakciją (prekių BS LT pažodžiui sutampa su
   1S-19 su 1S-51 pakeitimais, paslaugų BS „05“ - su 1S-209 su 1S-52), **LT/EN rinkiniai - pradinę** (2024 m.). Visi LT/EN „trūkstami“
   punktai (prekių 7.2.4-7.2.5, 16.4, 17.7, 22.2.2.13-14; paslaugų 17.7) atsirado tik 2025-04-17 pakeitimu. Tai ne rašybos klaida, o
   **pasenusi LT/EN redakcija**; atnaujinant reikės ir EN vertimo.
2. **SS sumos - ne iš VPT.** VPT SS 9.4 (abiejose redakcijose, prekių ir paslaugų): „Netaikoma arba (nurodyti baudos dydį ...) (nurodyti sumą
   skaičiais) Eur (nurodyti sumą žodžiais)“. Todėl 100 ir 1000 Eur, 9.3 bazė („Pradinė sutarties vertė“ ar „Sutarties kaina“), 20 % ribos
   bazė, paslaugų 9.14.4 terminas, prekių 8.2.1 dydis - LITGRID įrašytos reikšmės, kurios LT ir LT/EN rinkiniuose skiriasi.
3. **Prekių SS LT** - iš dalies dar pradinės VPT redakcijos punktai (1.2, 3.2, 4.3, 4.4, 6.1, 9.9, 11.2 automatinis pratęsimas, 13.1-13.4).
4. **Tikros klaidos** atsiranda ten, kur viename rinkinyje sumaišytos skirtingos redakcijos ar formos (VPT nė vienoje redakcijoje jų nėra):
   prekių LT SS 8.3 papunkčiai sunumeruoti 8.2.1-8.2.2, o 9.8 nurodo 8.2.2; SS 14.1 prideda BS 22.2.2.13, kuris BS LT jau yra; BS 15.3
   nurodo SS baudą, kurios SS nėra; SS 14.1 keičia „E.sąskaita“, kurios BS nebėra; du 15 skyriai („Sutarties priedai“ ir „Šalių atstovų
   parašai“). Paslaugų LT/EN SS: du 8.2 punktai; 14.1 keičia BS 1.1.1.16 („Užsakymas“; VPĮ apibrėžimas paslaugų BS - 1.1.1.17) ir 17.7,
   kurio BS „0508“ nėra; 11.2 automatinis pratęsimas paimtas iš prekių formos; 9.2.2 „per 5 (penkias) darbo dienas“ ir 9.14.4 „per 5
   (penkias) dienas“ tam pačiam mokėjimui; prekių formos likučiai („... PREKIŲ PERDAVIMO“, „Pardavėjo“).
5. PĮ 95 str. tipinių VPT sąlygų taikymo nereikalauja (VPĮ 87 str. 1 d. - tik VPĮ pirkimams); LITGRID jas taiko savo sprendimu.
   Pilna lyginamoji ataskaita - `~/Documents/g-procure-privatu/sutartys/vpt_palyginimas.md`.

### 5.5. Jūsų turinio sprendimai šablonuose

| Data | Sprendimas | Kas pakeista |
|---|---|---|
| 2026-10-07 | SS 9.4 (bauda už subtiekėjų ar specialistų keitimą nesilaikant tvarkos) - **1000 Eur** | Šablonų aplanke `0922- PREKIŲ pirkimo-pardavimo sutarties specialiosios sąlygos.docx` (pastraipa po 9.4) ir `0922-PASLAUGŲ sutarties spec. sąlygos.docx`: „100 (vienas šimtas) Eur“ -> „1000 (vienas tūkstantis) Eur už kiekvieną pažeidimo atvejį.“; pakeista tik ta pastraipa (9.5.1 su tokiu pat tekstu nepaliesta), kitos failo dalys - baitas į baitą; LT/EN rinkiniuose jau buvo 1000 Eur. Originalai - `~/Documents/g-procure-privatu/sutartys/originalai-2026-10-07/` |
| 2026-10-07 | 1 žingsnis: LT SS redakcinės klaidos ir 5.6 lentelės reikšmės (jūsų „Sutinku su jūsų lentelėje išvardintomis rekomendacijomis“) | Tie patys du LT SS failai (prekių - 52 pakeitimai, paslaugų - 44, iš jų dvigubų tarpų 9 ir 14). Lentelės reikšmės: 9.6 bauda abiem Šalims (antraštė „Tiekėjui / Pirkėjui“, tekste „pažeidusi Šalis ... kitos Šalies“ - kaip BS 13.5); prekių 9.2.3 ir 9.13.4 - „5 (penkias) darbo dienas“ (9.2.3 buvo neužpildyta pildoma vieta); prekių 9.9 - grąžintas VPT punktas (bauda dėl Pirkėjo simbolių ir intelektinės nuosavybės, pasirinkimai „Netaikoma.“ / „{...} Eur ...“ - kaip paslaugų SS), LITGRID 9.9-9.13 tapo 9.10-9.14 (nuorodos 12.1.2 ir 14.4.4 pataisytos); prekių 11.2 - VPT aktualus tekstas (1S-51), automatinis pratęsimas pašalintas. Redakcinės: el. paštas info@litgrid.eu; prekių 8.3 papunkčiai 8.3.1-8.3.2 ir 9.8 nuoroda; 14.1 - 22.2.2.15 (BS jau turi 22.2.2.13-14), „22 skyriaus pirmoji pastraipa“, neuždarytas skliaustas 10.16.3; parašų skyrius 16; paslaugų priedai 15.1-15.6, 7.1 sąraše priedas Nr. 3 „Pasiūlymas“, 12.2.12 „10 skyriuje“; rašyba sąrašuose („Fiksuoto“, „vienas tūkstantis“ 9.7, „mėnesių“), „subtiekėjų“ ir „Pirkėjo valdomų“ 14.3, „(toliau – Sutikimas)“, „kilmės“, „10 000“, kabutės, taškai po numerių, pavienės kabutės. Scenarijus su patikra - `~/Documents/g-procure-privatu/sutartys/taisymai/taisymai_1.py` (kiekvienas pakeitimas turi rasti vietą tiksliai vieną kartą) ir `tikrink_1.py`, kopija prieš taisymus - `originalai-2026-10-07-1zingsnis/`; kitos failo dalys - baitas į baitą, XML taisyklingas, identifikatoriai unikalūs, atidaroma Pages ir textutil |
| 2026-10-07 | SS 5.2 eilutė su PVM - apibrėžta sąvoka „Sutarties kaina“ (jūsų siūlymas; taip ir VPT formos 5.2 p.: „Sutarties kaina yra ... Eur su PVM“, BS 1.1.1.10) | Abu LT SS: „Pradinė sutarties kaina Eur su PVM: [...]“ -> „Sutarties kaina Eur su PVM: [...]“ (`taisymai_1b.py`, kopija `originalai-2026-10-07-1b/`) |
| 2026-10-07 | Šablonas sprendimų neneša - iš anksto pasirinkti valdikliai grąžinami į „Pasirinkite elementą.“ (jūsų „1. Taip.“) | Prekių LT SS - 3.3, 4.1 (du), 5.1, 5.3, 5.5, 14.3, 14.4 ir ranka įrašytas 4.1 terminas „1“ -> „[...]“; paslaugų LT SS - 5.2, 5.3, 5.5, 11.1 trukmė ir 9.9 (rodė „Pasirinkite elementą“ kaip įrašytą tekstą, ne kaip Word vietos rezervą); prekių 5.1 valdiklio mėlyna spalva pašalinta. Pasirinkimų sąrašai nekeisti; dabar visi 21 prekių ir 19 paslaugų sąrašų nepasirinkti (`taisymai_1c.py`, kopija `originalai-2026-10-07-1c/`) |
| 2026-10-07 | 2 žingsnis: prekių LT SS pagal VPT aktualią redakciją (1S-51) ir 14.1 suderinimas su paslaugų SS (jūsų „Sutinku su visomis rekomendacijomis“) | Prekių LT SS: 1.2 + tiekėjų grupės sakinys; 3.2 „Pirkimo pavadinimas ir numeris“; 4.3 + „Netaikoma / arba“ (LITGRID tekstas paliktas); 4.4 antraštė „Dėl minimalios užsakymo vertės / apimties“ (turinys „Punktas netaikomas.“ - standartas); 6.1 - LITGRID formuluotė (24 mėn. minimumas) palikta; 9.7 „Kokybinių“ (BS sąvoka); 13.1 - VPT tekstas („Netaikoma / arba“, „Lietuvos Respublikos aplinkos ministro ... įsakymu Nr. D1-508“, baudos sakinys); 13.2-13.3 - LITGRID kriterijai palikti, bet pasirenkami („Punktas netaikomas. / arba“, kaip 13.4); 13.3.2 nuoroda į Tvarkos aprašo 2 priedo X (10) skyrių patikrinta e-tar (galioja ir po D1-20), pavienis „)“ pašalintas; 14.1 - pašalintas „E.sąskaita“ sakinys, įrašytas 22.2.2.14 su PĮ redakcija (kaip paslaugų SS; e-tar: VPĮ 37 str. 8 d. = PĮ 50 str. 8 d., VPĮ 47 str. 8 d. - per PĮ 59 str. 1 d.). Abiejuose LT SS - 5 įprasto ir nekertamo tarpo poros. (`taisymai_2.py`, kopijos `originalai-2026-10-07-2/` ir `-2b/`) |
| 2026-10-07 | 3 žingsnis: LT/EN = LT rinkinys + vertimas (jūsų sprendimai: BS anglų stulpelis - visas VPT neoficialus vertimas; EN terminai - kaip VPT prekių vertime; keturi failai perkuriami iškart, DI juodraščiai - geltonai ir sąraše, vertėjas tikrina dokumente) | Keturi LT/EN failai perkurti (kopija `originalai-2026-10-07-3/`). **LT stulpelis - LT BS / SS be jokių pakeitimų** (XML lygiu; patikrinta: visos BS 366 / 382 ir SS 300 / 291 pastraipos, valdiklių 21 / 20 abiejuose stulpeliuose). Kiekvienas punktas - atskira 2 stulpelių lentelės eilutė (BS iki tol - viena ~174 000 ženklų eilutė, kurią Pages nukerpa; SS - trys LT lentelės ir pavadinimas sujungti į vieną, antraštė ir turinys - atskiros eilutės, parašai - po šalį, prekių 5.6 ir 5.7 langelio valdikliai išlaikyti). **EN:** BS - VPT vertimas (vpt.lrv.lt „Privalomi dokumentai“, įkeltas 2026-08-07; prekių VPT EN perteklinis 24.2 praleistas; paslaugų 23.1.1 „Article 45(2¹)“), „Agreement“ ten, kur LT - „Sutartis“, -> „Contract“ (geltonai: prekių 3, paslaugų 32), 5 neaiškūs paslaugų punktai tik pažymėti. SS - esamas LITGRID vertimas, VPT vertimas arba DI juodraštis (prekių 28 pastraipos ir 14 valdiklių elementų, paslaugų 19 ir 9); punktų numeriai - pagal LT; terminai suvienodinti (Buyer, Supplier, General / Special Terms and Conditions, Initial Contract Value, Contract Price); valdiklių EN sąrašai su „Choose an item.“, elementai - iki Word 255 ženklų ribos; raudonos ir mėlynos vietos, apatiniai indeksai, nuoroda į Partnerių etikos kodeksą - kaip LT. Ištaisytos senų vertimų klaidos: paslaugų 9.4 anglų stulpelyje buvo 9.5 p. tekstas, prekių 8.3.2 sugadintas sakinys, 23.1.1 „paragraph 21“ (VPĮ 45 str. 2¹ d. / PĮ 58 str. 4¹ d.), 22.2.2.14 „Article 50(8) ... of the LPP“, prekių 10.16.3 „if interest“, 13.3.2 sakinys be „if“, 14.4.1-14.4.4 vienoje pastraipoje, „Sub-Clause 2 22.2.2.15“, liekamieji „Pasirinkite elementą“ ir „Jei punktas taikomas“ anglų stulpelyje. Vertėjui - `~/Documents/g-procure-privatu/sutartys/LT-EN vertimų juodraščiai vertėjui 2026-10-07.docx` (97 įrašai). Scenarijai `lten_bs.py`, `lten_ss.py` (+ `lten_ss_vertimai.py`, `lten_ss_tikrink.py`, `lten_di_sarasas.py`), šaltiniai - `g-procure-privatu/sutartys/saltiniai/`; perkūrimas pakartojamas (sutampa baitas į baitą) |
| 2026-10-08 | Anglų stulpelio redakcija be vertėjo (jūsų sprendimas: „niekas papildomai netikrins vertimų, todėl svarbu naudoti profesionalią ir oficialią anglų kalbą naudojamą procurement srityje“; peržiūrimas visas SS anglų stulpelis, be geltono - DI požymis Word savybėse) | **SS:** visas anglų stulpelis suredaguotas (prekių 183 ir paslaugų 112 pastraipų, dar 72 paslaugų pastraipos su tuo pačiu LT tekstu - kaip prekių; 52 valdiklių elementai, iki 255 ženklų): kur LT - VPT formos tekstas, VPT anglų formuluotės; terminai vienodi visame tekste - netesybos „liquidated damages“, delspinigiai „default interest“, bauda „penalty“, įkainiai „rates“, Sutarties įvykdymo užtikrinimas „Contract Performance Security“, avanso užtikrinimas „Advance Payment Security“, Kokybiniai kriterijai „Quality Criteria“, esminės sąlygos „essential terms“, darbo diena „working day“, punktas „paragraph“, perdavimo–priėmimo aktas - kaip BS („Certificate of Transfer and Acceptance of Goods“, paslaugų - „Service Handover and Acceptance Certificate“); įstatymai - VPĮ „Law on Public Procurement“ (Seimo vertimas), PĮ (oficialaus vertimo nėra) „Law on Procurement by Contracting Entities in the Water, Energy, Transport or Postal Services Sectors“, Nacionaliniam saugumui užtikrinti svarbių objektų apsaugos įstatymas - „Law on the Protection of Objects of Importance to Ensuring National Security“ (Seimo vertimas); britų anglų, įpareigojimai - „shall“, sumos „EUR 3,000“. Rasta ir ištaisyta: anglų stulpelyje nebuvo 5.3.1.2.6 kainos perskaičiavimo formulių (dabar - tos pačios, indeksai „latest“ / „start“), generatorius neatpažindavo angliško „... do not apply“ - pasirinkus „5.3.1.2.1-5.3.1.2.10 (14.4.1-14.4.4) papunkčiai netaikomi“ anglų papunkčiai likdavo. **BS:** VPT vertimas, paslaugų - vienas terminas „Service Handover and Acceptance Certificate“ (buvo 6 variantai), 19.1 „Agreement“ -> „Contract“ ten, kur LT „Sutartis“ (vienas „Susitarimas“ lieka „Agreement“). Geltono anglų stulpelyje nebeliko (žemėlapiuose DI juodraščių - 0); LT/EN sutarties Word failuose - DI požymis (`DI_turinys`: specialiosiose - „parengtas naudojant DI (Claude) pagal VPT vertimų ir ES pirkimų terminiją; vertėjas netikrino“, bendrosiose - „VPT neoficialus vertimas, terminai suvienodinti naudojant DI“); 1 ir 3 žingsnis sako tą patį. Scenarijai: `lten_ss_redakcija.py` (redakcija, šaltiniai ir taisyklės faile), `lten_ss.py`, `lten_bs.py`; kopija prieš - `originalai-2026-10-08-en/`. LT tekstas nekeistas |
| 2026-10-08 | Paslaugų LT SS 11.2.3 ir 5.3.1.2.1 p. (jūsų prašymas „SS 11.2.3 p. ir SS 5.3.1.2.1 p. ištaisykime klaidas“) | 11.2.3 „Teikėjas Pasaugas suteikė“ -> „Tiekėjas Paslaugas suteikė“ (rašybos klaida, tokia pat ir VPT formoje); 5.3.1.2.1 „kas 6 (šeši) mėnesiai“ -> „kas 6 (šešis) mėnesius“ (galininkas). Prasmė „ne rečiau kaip“ nekeista: patikrinus VPT formą (1S-209 ir 1S-52, 5.3.3.1 p.) - ten taip pat „ne rečiau kaip kas (įrašyti terminą ...) mėnesiai“ (ankstesnis teiginys, kad VPT formoje „ne dažniau“, buvo klaidingas: taip tik VPT prekių formos anglų vertime). Scenarijus `taisymai_3.py`, kopija `originalai-2026-10-08-lt/`; LT/EN perkurtas (lietuviškas stulpelis = LT) |

**Nekeista sąmoningai (1 žingsnis):** VPT formos tekstas su klaidomis (taisyti gali tik VPT; generatorius jį lygins su VPT tekstu) -
prekių SS: „atskiru pirkimu.)“, „Garantinis terminas, skaičiuojamas“, „daugiau ne 2 / 5 valandas“, „šiais Specialiosiose sąlygose“,
„įsakymu D1-508“ (be „Nr.“), „2 priedo X skyriuje ... “)“, „Prekių priėmimo – perdavimo aktu“, „atliekų tvarkytoju, ar atliekų
tvarkytojų, turinčiu“, „Įstatymuose“; paslaugų SS: „Teikėjas Pasaugas suteikė“ (ištaisyta 2026-10-08 jūsų prašymu), „parneris“, „(nurodyti Avanso užtikrinimo dydį
nurodytą ...)“, „ir pan.)“, „daugiau ne 2 / 5“, neuždarytas skliaustas 11.1.2 („(kol bus išnaudota Pradinės Sutarties vertė, bet ...“);
BS - visos (žr. 5.4); LT/EN anglų stulpelyje - VPT neoficialus vertimas, taisytas tik ten, kur jis nesutampa su LT (3 žingsnis). Taip pat: 9.13.3 / 9.14.3 sakinys „... netesybų ... suma bus mažinama ... mokėtina suma“ (gramatiškai
teisingas: įnagininkas ir vardininkas), konkretaus pirkimo likučiai valdikliuose (prekių 4.1 „1 mėnesį“, pasirinkta kainodara ir kt. -
generatorius juos laiko neatsakytais), „E.sąskaita“ sakinys 14.1 (turinys), prekių 14.1 neturi paslaugų SS 22.2.2.14 PĮ redakcijos
(turinys - 2 žingsniui).

**Pages:** ilga lentelės eilutė (prekių 11.2 ir originali 12.2) Pages rodoma be paskutinių 1-2 eilučių - taip buvo ir šablone iki
taisymų (Word rodo viską); generatorius tai spręs kaip SPS (`GPLent` eilučių skaidymas).

Generatoriuje (S1) tokie sprendimai bus ir taisymų scenarijuje su testu - kad senesnė šablono kopija jų neatšauktų.

### 5.6. Rekomendacija dėl LT / LT-EN rinkinių ir standartinių reikšmių (patvirtinta 2026-10-07)

**Principas: vienas turinys - dvi kalbos.** LT rinkinys - pagrindinis (jis atitinka aktualią VPT redakciją); LT/EN rinkinio lietuviškas
stulpelis turi būti raidė į raidę LT tekstas, angliškas - jo vertimas. Kitaip to paties pirkimo sutarties sąlygos priklauso nuo to, ar
pasirinkta LT, ar LT/EN kalba. Pagal 1S-51 ir 1S-52 2.2 p. pradinės VPT nuostatos taikomos tik iki 2025-05-01 pradėtose procedūrose.

**Standartinės reikšmės - viena lentelė** (patvirtinama vieną kartą; šablonai ir generatorius tikrinami pagal ją):

| Vieta | LT | LT/EN | Rekomendacija ir kodėl |
|---|---|---|---|
| SS 9.4 bauda už subtiekėjų / specialistų keitimą | 1000 Eur (nuo 2026-10-07) | 1000 Eur | **1000 Eur** - jūsų sprendimas |
| SS 9.3 bauda nutraukus sutartį | 5 % **Pradinės sutarties vertės**, ne mažiau 3000 Eur | 5 % **Sutarties kainos**, ne mažiau 3000 Eur | **Pradinė sutarties vertė** - taip sako pati VPT forma („nuo Pradinės Sutarties vertės (be PVM), nurodytos Specialiųjų sąlygų 5.2 punkte“); BS ją apibrėžia be PVM, o Sutarties kaina - mokėtina suma su mokesčiais, užsakymų sutartyje žinoma tik pabaigoje |
| SS 9.13.6 / 9.14.6 netesybų riba (20 %) | Pradinės sutarties vertės | Sutarties kainos | **Pradinė sutarties vertė** - ta pati bazė kaip 9.3 (pati 20 % pastaba - teisininkams, 5.3) |
| Netesybų sumokėjimo terminas (paslaugų 9.2.2 ir 9.14.4, prekių 9.13.4) | paslaugų - 5 darbo dienos abiejose vietose; prekių - 5 dienos | paslaugų - 5 darbo dienos ir 5 dienos | **5 darbo dienos** visur - viename dokumente tas pats mokėjimas negali turėti dviejų terminų |
| SS 8.2.1 užtikrinimo dydis (prekės) | {.....} procentų | 10 % | **Pildoma vieta šablone, dydis - 2 žingsnio klausimas** (kaip SPS 11.3), siūloma reikšmė - iš grupės taisyklės SS komentare |
| Pratęsimas (paslaugų LT/EN 11.2, prekių LT 11.2) | prekių LT - automatinis pratęsimas | paslaugų LT/EN - automatinis pratęsimas (iš prekių formos) | **Tik VPT aktualus tekstas** („Šalių abipusiu rašytiniu Susitarimu ...“) - 1S-51 automatinio varianto prekėms atsisakė, paslaugų formoje jo nebuvo |
| SS 9.6 bauda dėl konfidencialumo | Tiekėjui | Tiekėjui / Pirkėjui | **Tiekėjui / Pirkėjui** - BS 13.5 abiem Šalims nurodo SS baudą; kitaip Pirkėjo bauda neapibrėžta |
| Prekių SS 9.9 | LITGRID „sutikimo dirbti elektros perdavimo tinklo objektuose“ | - | **Grąžinti VPT 9.9** (bauda dėl Pirkėjo simbolių ir pavadinimo - į ją nurodo BS 15.3), LITGRID punktą perkelti kitu numeriu |

**Pereinamasis laikotarpis:** LT/EN atnaujinti 2026-10-07 (3 žingsnis). Kol vertėjas nepatikrino DI juodraščių (anglų stulpelyje lieka
geltonų žymių), generatorius LT/EN sutartį siūlo **su matomu įspėjimu** („anglų tekste yra nepatikrintų vertimo vietų: N“) - neblokuoja
(prekių sutartys nuo ~1,2 mln. Eur - visos LT/EN); geltonų žymių skaičius - iš paties šablono. **Baigta 2026-10-08** (jūsų sprendimas - vertėjas netikrins): anglų
stulpelis suredaguotas pagal VPT ir ES pirkimų terminiją, geltono nebeliko, DI požymis - Word failo savybėse (5.5).

**Atnaujinimo eiga:** (1) redakcinės klaidos LT rinkiniuose (numeracija, nuorodos - 5.4 4 p.) - **padaryta 2026-10-07 kartu su lentelės reikšmėmis LT rinkiniuose (5.5)**; (2) prekių LT SS - likę pradinės
redakcijos punktai (1.2, 3.2, 4.3, 4.4, 6.1, 9.7, 13.1-13.4; 9.9 ir 11.2) - **padaryta 2026-10-07 (5.5)** pagal 1S-51 - jūsų sprendimu kiekvienam; (3) LT/EN = LT tekstas +
vertimas: nepasikeitusiems punktams - esamas EN, pasikeitusiems (VPT 2025-04-17 pakeitimai, jūsų reikšmės) - naujas vertimas
vertėjo ar teisininko (DI vertimas teisiniam tekstui - tik juodraštis, ne galutinis) - **padaryta 2026-10-07 (5.5): failai perkurti,
DI juodraščiai geltonai, laukia vertėjo patikros; 2026-10-08 - jūsų sprendimu vertėjo nebus: anglų stulpelis suredaguotas, be geltono, DI požymis Word faile (5.5)**; (4) generatoriaus testas lygina LT/EN lietuvišką
stulpelį su LT pastraipa į pastraipą - kad rinkiniai vėl neišsiskirtų; (5) VPT tipinių sąlygų pakeitimai - į PP-teise registrą.

---

## 6. Žinių bazė ir atitiktis VPT bei rinkos standartams (4 reikalavimas)

### 6.1. Teisės registras

`shared/teises-nuorodos.js` papildomas: PĮ 95 str. 1 d. (12 punktų atskirais raktais), 3 ir 4 d., PĮ 96 str. 2 d., PĮ 97 ir 98 str.
(jau naudojami šablonuose), VPĮ 87 str. 1 ir 2 d., VPT 1S-19, 1S-209, 1S-95 - kiekvienas perskaitytas e-tar su data. Šablonuose esančios
teisės nuorodos (PĮ, VPĮ, CK, Statybos įstatymas, STR, Nacionaliniam saugumui užtikrinti svarbių objektų apsaugos įstatymas, BDAR)
tikrinamos e-tar prieš įtraukiant šeimą; neteisinga - turinio radinys LITGRID.

**Prekėms ir paslaugoms padaryta 2026-10-09** (jūsų „Taip, pradėkime nuo teisės nuorodų patikros.“): `GP_SUTARCIU_NUORODOS.teisesNuorodos()`
ištraukia visas teisės aktų nuorodas iš 8 šablonų (67 skirtingos, LT ir EN, ir išskleidžiamų sąrašų variantuose; ir Akcinių bendrovių įstatymas), kiekviena perskaityta e-tar (VPĮ 33, 37, 45, 47, 86, 90, 91 str.
ir 5 priedas; PĮ 46, 50, 58, 94, 98, 99 str. ir 7 priedas; CK 6.212 str.; Nacionaliniam saugumui užtikrinti svarbių objektų apsaugos įstatymo
17 str.; Tarptautinių sankcijų ir Viešojo administravimo įstatymai; Vyriausybės nutarimas Nr. 840; įsakymas Nr. D1-508 ir aprašo 2 priedas)
ir EUR-Lex (BDAR, sprendimas (ES) 2017/1870) ir įrašyta `zemelapiai/sutarciu-teises-nuorodos.json`; testas neleidžia šablone atsirasti
nepatikrintai nuorodai. Teisingos visos, išskyrus tris turinio radinius. Jūsų sprendimas (2026-10-09, „Taip, papildykite prekių SS 14.1 p.,
palikite kaip VPT tipinėse sąlygose ir įtraukite T1, T2 į laišką“): T1 ir T2 - šablone paliekama kaip VPT tipinėse sąlygose, klausimai -
laiške LITGRID (`~/Documents/g-procure-privatu/sutartys/laiskas-LITGRID-sutarciu-teises-nuorodos-2026-10-09.md`); T3 - ištaisyta:
- **T1.** BS 22.2.2.14 ir SS 14.1 p.: „VPĮ 37 straipsnio 8 dalyje ir (ar) 47 straipsnio 8 dalyje / PĮ 50 straipsnio 8 dalyje ir (ar) VPĮ 47
  straipsnio 8 dalyje nurodytos aplinkybės“. Įstatymo vienašalio nutraukimo pagrindas (VPĮ 90 str. 1 d. 4 p., PĮ 98 str. 1 d. 4 p., redakcija
  nuo 2022-12-13 įstatymų Nr. XIV-1669 ir XIV-1672) - VPĮ 37 str. 9 d., 45 str. 2¹ d. ir 47 str. 9 d. (PĮ 50 str. 9 d., 58 str. 4¹ d., VPĮ 47 str.
  9 d.). Taip pat parašyta VPT tipinėse sąlygose (1S-19, suvestinė nuo 2025-05-01). 8 dalys irgi apie nacionalinį saugumą, o sutartis gali
  nustatyti papildomų nutraukimo atvejų (VPĮ 90 str. 3 d., PĮ 98 str. 3 d.) - todėl ne redakcinė klaida.
- **T2.** BS 17.7 (ir paslaugų SS 14.1): „įtraukiamas į nepatikimų tiekėjų sąrašą VPĮ 91 straipsnyje / PĮ 99 straipsnyje nustatyta tvarka“ -
  po 2021-09-30 įstatymų Nr. XIV-545, XIV-546 (paskelbti TAR 2021-10-15) šie straipsniai nustato informacijos apie sutarties neįvykdžiusius tiekėjus skelbimą CVP IS,
  „nepatikimų tiekėjų sąrašo“ nebėra. Taip pat VPT tipinėse sąlygose.
- **T3.** Prekių SS 14.1 p. neturi paslaugų SS eilutės „... punktuose minima sąvoka „VPĮ“ keičiama į sąvoką „VPĮ / PĮ““ ir 16.4, 17.7 p.
  pakeitimų: PĮ pirkime prekių BS 1.1.1.9, 1.1.1.18, 1.2.2, 1.2.6, 3.3.1, 3.3.2, 7.4.1.2, 10.3, 16.4 (VPĮ 5 priedas), 17.7 (VPĮ 91 str.), 20.1 ir 21.4 p.
  lieka tik su VPĮ. **Padaryta 2026-10-09:** prekių SS 14.1 p. (LT ir LT/EN) papildytas kaip paslaugų - sąrašo eilutė (prekių BS 1.1.1.18 vietoj
  paslaugų 1.1.2) ir 16.4, 17.7 p. nauja redakcija (prekių BS tekstas, pakeistos tik VPĮ nuorodos); privatus `taisymai_6.py`, kopija
  `originalai-2026-10-09c/`, LT/EN perkurtas `lten_ss.py` (anglų vertimai - kaip paslaugų SS), `sutarciu-sablonai.py --nauja-redakcija` ir
  `--versijos`. Testas tikrina, kad abiejose šeimose kiekvienas BS punktas su VPĮ yra SS 14.1 p. nauja redakcija ar sąraše.

### 6.2. PĮ ir VPĮ

- LITGRID (PĮ) - LITGRID šablonai. Paslaugų BS parašytos pagal VPĮ, o SS 14.1 jas perveda į PĮ - generatorius 14.1 įtraukia visada,
  kai režimas PĮ.
- Centralizuotas AKV pirkimas (VPĮ, LITGRID + EPSO-G) - VPĮ 87 str. 1 d. reikalauja VPT tipinių sąlygų arba pagrindimo. Generatorius
  be jūsų sprendimo (8 sk.) VPĮ sutarties projekto neturi siūlyti.

### 6.3. VPT tipinės sąlygos ir gerosios praktikos

- Prekių ir paslaugų šablonai bus palyginti su VPT tipinėmis sąlygomis (1S-19, 1S-209, aktualios redakcijos) tuo pačiu
  `GP_PALYGINIMAS` - kur LITGRID šablonas skiriasi nuo VPT, tai rodoma kaip informacija (PĮ subjektui VPT tipinės sąlygos neprivalomos).
- Kainodaros pasirinkimai SS sąrašuose - pagal VPT kainodaros metodikos (1S-95) rūšis; peržiūros sąlygos VPĮ pirkimui > 6 mėn. - privaloma.

### 6.4. Kalibravimas su CVP IS (didžiųjų energetikos ir infrastruktūros organizacijų sutartys)

1. **Rinkinys:** LITGRID paskelbtos sutartys (šiandien 346 nustatytos šeimos) + palyginimui Amber Grid; vėliau - ESO, Ignitis grupė, Via
   Lietuva ir kitos (kiekvienai - savo šeimų sąrašas).
2. **Ką naudojame:** tik „kokia sutartis kokiam pirkimui“ (šeima, objekto rūšis, BVPŽ, vertė, trukmė, kalba, trišalė, užsakymai) - **ne
   tekstą**. Jūsų pastaba: šablonai nuolat atnaujinami, paskelbtos sutartys - ankstesnių redakcijų.
3. **Testas:** kiekviena LITGRID sutartis - testų rinkinio atvejis; taisyklė laikoma tinkama, kai automatiniai parinkimai teisingi 100 %,
   o neatpažinti - klausimai (ne klaidos).
4. **Pakartotinis kalibravimas:** kas ketvirtį (ir po kiekvienos šablonų redakcijos) - naujos paskelbtos LITGRID sutartys, nauji
   neatitikimai -> taisyklės papildymas arba naujas klausimas. Taisyklės be naujo testo nekeičiamos.
5. **Rinkos parametrai** (informacinis palyginimas, ne taisyklė): delspinigių ir baudų dydžiai, užtikrinimo procentai, garantijos,
   mokėjimo terminai, netesybų ribos - iš paskelbtų sutarčių pagal sutarties datą, atskiriant redakcijas. LITGRID sprendžia, ar keisti
   savo šablonus; generatorius rinkos sąlygų nekopijuoja.

---

## 7. Etapai

| Etapas | Turinys | Priėmimo kriterijus |
|---|---|---|
| S0 | Matavimas: šablonų auditas, kalibravimas (386 sutartys), prototipas | **padaryta 2026-10-07** |
| S1 | Šablonų paruošimas: redakcijų registras, `templates/sutartys/`, kartografas visiems žymėjimo būdams, žemėlapiai, redakcinių klaidų taisymai, blokuojančių šeimų žymė | kiekvienas šablonas - žemėlapis be neatpažintų vietų; taisymai pakartotinai - 0; testai su mutacijomis **prekėms ir paslaugoms padaryta 2026-10-08** (žr. žemiau); **projektavimo ir statybos rangai - 2026-10-10** (3 etapas, žr. žemiau); kitos šeimos - tuo pačiu keliu |
| S2 | Parinkimo variklis (`PP-salygos/sutartys.js`, `GP_SUTARTYS.parink`) + taisyklių lentelė + kalibravimo testų rinkinys | 0 neteisingų automatinių parinkimų rinkinyje; >= 70 % be klausimų; stebėjimo režimas - generatorius siūlo, žmogus patvirtina, neatitikimai renkami **variklis padarytas 2026-10-08** (žr. žemiau); stebėjimo režimo sąsaja - S3 |
| S3 | UX: blokas „Sutarties projektas“ 1 žingsnyje, klausimai K0-K5, sutarties laukai 2 žingsnyje, bendri SPS ir sutarties laukai | telefonas 375 / 320 px, prieinamumas, „Siūloma (nepatvirtinta)“ **1 žingsnio blokas padarytas 2026-10-08** (žr. žemiau); 2 žingsnio sutarties laukai - kartu su S4 |
| S4 | Generavimas ir patikra po generavimo (4.5), pasas, tikrinimo skirtukas atpažįsta sutarčių formas | kiekvienai šeimai - sugeneruotas paketas be leistinų skirtumų už žemėlapio; mutacijos pagaunamos **prekėms ir paslaugoms padaryta 2026-10-08**; **projektavimo ir statybos rangai - 2026-10-10** (žr. žemiau) (generavimas, 2 žingsnio klausimai, paketas - `docs/salygos/sutarciu-lauku-inventorius.md`); **2026-10-09 - SPS „Esminės sutarties sąlygos“ šalinimas, tiesioginis atsiskaitymas, žaliųjų derinimas ir tikrinimo skirtukas (4.4); nuorodų sargas (4.5 3 p.: `sutarciu-nuorodos.js`, 3 žingsnis ir tikrinimo skirtukas; šablonuose klaidų nebeliko, rasta ir ištaisyta SS 9.8 nuoroda į pašalintą 8.3.2)**; **PĮ 95 str. katalogas (4.5 4 p.: `shared/sutarties-elementai.js`, tikrinimo skirtukas ir 3 žingsnis) - 2026-10-09** |
| S5 | Word ir Pages patikra (lentelės, puslapio formatas - prekių failai US Letter), gyva patikra | kaip SPS **prekėms ir paslaugoms padaryta 2026-10-09**: Pages PDF - 12 dokumentų be prarasto teksto, A4, formulės; LT/EN eilutės skaidomos lygiagrečiai pagal punktų numerius; anglų stulpelio numeracija (paslaugų SS 1.2.x, prekių BS 24.2-24.5) ir LT/EN terminai („30 (thirty) days“) ištaisyti |
| S6 | Žinių bazė (6.1, 6.3) ir pakartotinio kalibravimo procesas | registro įrašai perskaityti e-tar |

Prioritetas pagal kalibravimą: projektavimo ir statybos rangos, paslaugų, projektavimo paslaugų, darbų pirkimo-pardavimo, prekių,
statybos rangos, eksploatavimo (po BS gavimo). Visos septynios šeimos generuojamos nuo 2026-10-13.

**S1 prekėms ir paslaugoms (2026-10-08, jūsų sprendimas pradėti nuo jų - jie vieninteliai sutvarkyti iki galo).**
`PP-salygos/sutarciu-sablonai.py --saltinis <LITGRID sutarčių aplankas>` paruošia 8 šablonus `PP-salygos/templates/sutartys/`
(`PREKES_LT_BS`, `PREKES_LT_SS`, `PREKES_LTEN_BS`, `PREKES_LTEN_SS` ir tie patys `PASLAUGOS_...`):
- **Redakcijų registras** `zemelapiai/sutarciu-versijos.json`: šaltinio failas ir jo sha256, paruošto šablono sha256, teksto maiša ir
  požymiai (kaip `formu-versijos.json`), redakcija, paruošimo pakeitimai. **Kitas šaltinio failas - paruošimas stabdomas:** nauja LITGRID
  redakcija ar senesnė kopija negali tyliai atšaukti 2026-10-07 taisymų (5.5); juos peržiūrėjus - `--nauja-redakcija "aprašas"`,
  ankstesnės redakcijos maišos lieka registre.
- **Komentarai šalinami** - juose vidinės grupės taisyklės (SS 8.1-8.3: iždo politika dėl užtikrinimo); į viešą saugyklą jie nekeliami,
  `--komentarai` išrašo juos privačiai.
- **A4** (jūsų sprendimas 2026-10-08): 7 iš 8 failų buvo US Letter (A4 - tik paslaugų LT BS); per plačios lentelės (prekių LT SS,
  visi LT/EN) proporcingai sumažintos iki teksto pločio; tekstas nekeistas.
- **Žemėlapis** `zemelapiai/sutartys/<KODAS>.json`: valdikliai (elementai, lygis - eilutė, blokas ar visas langelis, atsakymo šaltinis
  pagal 3.4: prekėse 12 iš duomenų, 4 standartai, 5 klausimai; LT/EN - LT ir EN valdiklių poros), pildomos vietos („[...]“, „{...}“),
  nurodymai rengėjui („(nurodyti ...)“; sutarties sąlygos „(jeigu ...)“ - ne nurodymai), alternatyvos („Netaikoma / arba“; sudėtinės
  pažymėtos - 9.3), trynimo nurodymai, skyrių taikymo sąlygos, tušti laukai (pildo generatorius ar sudarant), organizacijos
  rekvizitai, LITGRID paryškinimai, VPT mėlynos pritaikomos nuostatos, keičiamos reikšmės (5.3.1.2.1 „5“), DI juodraščiai (LT/EN).
  Spalvota ar pažymėta vieta, kurios neatpažįsta nė viena taisyklė, - klaida; dabar neatpažintų - 0.
- **4 žingsnis:** LT/EN lietuviškas stulpelis = LT rinkinys (BS ir SS) - tikrina ir scenarijus, ir `PP-salygos/testai.html`.
  Ta proga paslaugų LT BS pavadinime pašalintas pavienis „`“ (LT/EN jau buvo be jo; kopija `originalai-2026-10-08-s1/`).
- Pakartotinai - 0 pakeitimų; `--tikrink` tikrina saugyklos šablonus prieš registrą ir žemėlapius be šaltinio.
- Pages aukštose abipusiai lygiuotose lentelės eilutėse nukerpa paskutinę eilutę (taip buvo ir prieš A4) - generuojant tvarkys `GPLent`
  (kaip pirkimo sąlygose).
Generatorius sutarčių dar nenaudoja - tai S2-S4.

**S1 projektavimo ir statybos rangai (3 etapas, 2026-10-09/10; jūsų „LITGRID 2026-10-05 rangos šablonai yra galutiniai“).**
`PSR_LT_BS` ir `PSR_LT_SS` (LT/EN nėra) - tame pačiame registre ir tuo pačiu keliu; šių šablonų žymėjimas kitoks nei prekių ir paslaugų
(be spalvų ir valdiklių), todėl paruošimo skriptas papildytas:
- **Word numeracija** (`word_numeriai`, kaip `GPNum`): SS punktai ir BS sąvokos sunumeruoti tik Word - žemėlapio vieta yra Word numeris
  (BS „1.1.2.13“, SS „10“); po SS lentelės - atskiros sritys („priedų sąrašas“, „parašai“, „1.1 priedas“), kad priedų sąrašo „1.“-„23.“
  nesimaišytų su SS punktais. Patikrinta: SS nuorodos į BS sąvokas ir punktus („[Sąvoka 1.1.2.13 punktas]“ ir kt.) rodo į teisingus BS
  punktus, išskyrus SS 1.5 „[Sąvoka 1.1.2.9.]“ (žr. 8 sk. sprendimus).
- **„//“ nurodymai ir „arba“** - aprašyti blokais (`BLOKAI`): 8 vietos, kur įrašomas tekstas (objektas, techninė užduotis, pagrindiniai
  įrenginiai, fizinė sauga, dalinis apmokėjimas, ES fondai, BIM, investicinis projektas), 3 pasirinkimai (apmokėjimas, netesybos,
  užtikrinimas), 4 derinimo terminų pasirinkimai („Turi būti pasirinkta:“), 7 neprivalomi punktai (etapai, grafikas, ekspertizė, atjungimai,
  garantinis užtikrinimas, esminės sąlygos, kitos nuostatos) ir etapų priedo „Pildymo sąlygos“. Kiekvienas „//“ ir „arba“ turi būti bloke -
  kitaip neatpažinta vieta (testas su mutacijomis).
- **Žodžiai laužtiniuose skliaustuose** („[Rangovo pavadinimas]“, „[]“) - pildomos vietos su etikete; „[Sąvoka ...]“, „[2.2.3. punktas]“ -
  BS nuorodos (sutarties tekstas); rekvizitai sakinio viduje (LITGRID kodas, adresas, sąskaita) ir „ĮMONĖS PAVADINIMAS“ sakinyje - po vieną įrašą.
- **Keli skyriai** (SS gulsčias etapų priedas) ir **įdėtinė lentelė** (SS 16 p.); BS teksto laukas „LT“ (pastraipa pastraipoje) - pastraipos
  skaičiuojamos kaip naršyklėje.
- **Vidinė grupės taisyklė „//“ nurodyme** (SS 19 p. užtikrinimo riba) - kaip komentarai: į saugyklą nekeliama, skaičius pakeistas žodžiais
  „vidaus taisyklėse nustatytos ribos“, originalas - privačiame komentarų faile (sutartyje nurodymų nelieka). Patvirtinta 2026-10-10.
- **Redakciniai taisymai** (privatus `taisymai_7.py`, kopija `originalai-2026-10-09d/`): BS - 31 rašybos ir skyrybos vieta (pvz. „gražin-“,
  „gali būtų“, „Excel, Word“, „Sutarties specialiosiose sąlygose“), 15 dvigubų tarpų, 9.1.10.7 a)-e) stilius ir turinio eilutė; SS - 5
  („užtikrinamas“, „pateikiama nuoroda“, skliaustas, „koordinatorius“); pakartotinai - 0.
- **Teisės aktų nuorodos** (6.1): 23 naujos PSR nuorodos patikrintos e-tar ir įrašytos (`sutarciu-teises-nuorodos.json`, 90 iš viso):
  Statybos, Valstybinio socialinio draudimo, Atliekų tvarkymo, Specialiųjų žemės naudojimo sąlygų įstatymai, STR 1.04.02:2011, 1.04.04:2017,
  1.06.01:2016, darboviečių nuostatai, Lietuvos banko draudimo taisyklės, F-dujų tvarka, elektros tinklų apsaugos taisyklės, ICC URDG 758,
  CK ir NSOAĮ dalys; radiniai T4 (VPĮ ir PĮ sąvokų straipsnio dalys pavadintos „punktais“) ir T5 (pasenęs STR 1.04.02:2011 pavadinimas).
Numeracijos, nuorodų ir terminų netikslumai (8 sk. 12 p. a-i) - ištaisyti 2026-10-10 jūsų sprendimu (privatus `taisymai_8.py`, kopija
`originalai-2026-10-10/`): SS punktai 1-29, SS 5 p. nuoroda į 1.1.2.14, delspinigių pakopos, grafiko formos sakinys, el. paštas, BS 5.2.3.1
raidės, 11.3.4 Rangovas, 2.3.12 sąvoka, T4 ir T5. Turinio klausimai - laiško LITGRID juodraštis (privatus, 2026-10-10).

**S4 projektavimo ir statybos rangai (2026-10-10; jūsų „Taip, pradėkime S4.“).** Klausimai ir taisyklės - `docs/salygos/sutarciu-lauku-inventorius.md`
(antra dalis), juodraštis jūsų peržiūrai - 8 sk. 13 p.
- **1 žingsnis:** `GP_SUTARTYS` šeima „Projektavimo ir statybos rangos sutartis“ - „parinkta“ su `PSR_LT_BS` / `PSR_LT_SS` (LT/EN nėra -
  parenkama lietuviška ir tai pasakoma).
- **2 žingsnis:** 26 klausimai SS punktų tvarka (7 grupės kaip SS skyriai), 5 su siūloma reikšme (Techninė užduotis - iš priedų sąrašo,
  apmokėjimas ir netesybos - pagal šablono rekomendacijas, derinimo terminai - pagal pavadinimą, užtikrinimas - iš SPS); be numatytųjų.
- **Generavimas:** neprivalomi „//“ punktai 20-29 (taikoma / ne, kelių dalių - pasirinktos dalys, esminės sąlygos - naujomis pastraipomis),
  1-19 punktai lieka visi - netaikomame įrašoma „Punktas netaikomas.“ (SS 4, 6, 8, 9, 18; jūsų sprendimas 2026-10-10), SS 3 pratęsimo
  sakinys pagal atsakymą šalinamas; darbai ne etapais - etapų priedas (paskutinis skyrius) ir jo eilutė priedų sąraše pašalinami, priedų
  numeriai SS nuorodose - po pašalinimo; užtikrinimo 2 ir 3 variantams (šablone be numerio) perkeliamas punkto numeris; derinimo lentelė - vienas
  variantas kiekviename langelyje, nurodymai „(pasirenkama ...)“ šalinami. Etapų lentelė - Word programoje (patikroje viena eilute).
- **Patikra:** nuorodos Word numeracijos sutartyse tikrinamos su emuliuotais Word numeriais (GPNum suderintas su `word_numeriai`;
  pirkimo sąlygų numeracija nepasikeitė), privalomi elementai - ir rangos formuluotės („Sutarties kaina yra fiksuota“, „Subrangovai“),
  palyginimas su forma - neprivalomi punktai ir priedo skyrius kaip pasirenkamos dalys; ištaisytas poravimas, kai pakeistas pasirinktas
  variantas atrodydavo kaip užpildyta gretimo varianto vieta.
- **Išmatuota:** du atsakymų rinkiniai (etapais ir ne) ir BS - generuojami be klaidų, 0 nukrypimų nuo formos su pasu ir be jo, 109
  nuorodos - visos į esamus punktus, 13 iš 13 privalomų elementų; 7 testai, 42 kodo mutacijos - visos pagaunamos.
**S5 projektavimo ir statybos rangai (2026-10-10, „Taip, pradėkime S5 - patikrą Pages programoje.“).** Bendrosios sąlygos ir dviem atsakymų
rinkiniais sugeneruotos specialiosios sąlygos atvertos Pages ir eksportuotos į PDF (BS - 49 psl., SS - 6 psl.):

- **Tekstas:** sugeneruotuose dokumentuose neprarandama nė viena pastraipa (neparuoštas LITGRID SS šablonas Pages prarastų 14); puslapiai A4;
  punktų numeriai Pages - tie patys kaip emuliuoti Word (BS 553, SS 54 ir 51 numeruota pastraipa).
- **Gulsčias etapų priedas:** Pages visam dokumentui taiko pirmojo skyriaus orientaciją - priedą rodė stačią ir jo lentelės antraštę
  nukirpdavo. Kaip pirkimo sąlygose (jūsų sprendimas 2026-10-04) - priedas generuojamas atskirame gulsčiame faile „Sutarties SS priedas 1.1“
  (pakete - iškart po specialiųjų sąlygų; jo eilutė priedų sąraše lieka; savas generavimo pasas). Darbai ne etapais - priedo nėra.
- **Lentelė lentelės langelyje (SS 21, derinimo terminai):** Pages ją paversdavo tekstu su tabuliacijomis. Generatorius ją perkelia į
  pagrindinės lentelės eilutes (tekstas ir tvarka tie patys, rėmeliai - kaip įdėtinės lentelės) - Pages rodo lentelę.
- **Įrašytų reikšmių šriftas:** „18 mėnesių“ buvo ne pusjuodžiu, nors sakinys pusjuodis; SS 3 pratęsimo sakinio reikšmės - ne kursyvu.
  Dabar reikšmė - to paties šrifto kaip jos sakinys (prekių ir paslaugų sutarčių išvestis nepakito).
- **Šablono paruošimas** (tekstas nekeistas): kairysis stulpelis platesnis („organizavima / s“ nebelūžta), punktų numerių šriftas
  suvienodintas (4 ir 19 buvo kursyvu, dalis pusjuodžių), derinimo lentelėje sujungta „Techninis darbo projektas“ langelių pora.
- **Jūsų sprendimas (2026-10-10, „Noriu įprasto šrifto.“):** SS 3 pratęsimo sakinys ir SS 12 sakinio pabaiga („bus mokama Sutarties
  bendrųjų sąlygų 7.3.7. punkte nustatyta tvarka.“) LITGRID formoje parašyti pusjuodžiu kursyvu - sutarties projekte jie įprastu šriftu.
- **Palikta:** eilutės nedalijamos per puslapį (Pages jų nedalytų - nukirptų), todėl puslapių pabaigoje lieka tuščios vietos.
- 7 testai, 32 kodo mutacijos - visos pagaunamos.

Liko: klausimų tekstų peržiūra (`KLAUSIMAI_PSR`).

**S1 projektavimo paslaugų sutarčiai (4 etapas, 2026-10-11; jūsų „projektavimo paslaugų šablonai aplanke yra galutinė redakcija“).**
`PPS_LT_BS`, `PPS_LT_SS` ir `PPS_LT_SS3` (specialiųjų sąlygų 3 priedas „Apmokėjimo tvarka pagal etapus“; LT/EN nėra) - tame pačiame
registre ir tuo pačiu keliu. Generatorius šios sutarties dar nerengia - tai S4.
- **Jūsų sprendimai 2026-10-11 (a-j)** - ištaisyta šablonuose (privatus `taisymai_9.py`, originalų kopija `originalai-2026-10-11/`):
  a) BS punktai susieti su skyrių numeriais - buvo atskirame Word sąraše, todėl po „7.5. SUTARTIES ĮVYKDYMO UŽTIKRINIMAS“ pirmas punktas
  buvo „1.2.112.“ (Pages - „2.112.“), nors SS ir pati BS nurodo „7.5.1“; dabar 9 skyriai, 46 poskyriai, 212 punktų ir 7 papunkčiai iš
  eilės; b) „STATINIO INFORMACINIS MODELIAVIMAS“ - 2.5 poskyris (antraštės stilius, turinio eilutė); c) SS 8.2 nuoroda „bendrosios dalies
  4.2.9 p.“ -> „bendrųjų sąlygų 4.2.10 punkte“ (koordinatorius; 4.2.9 - tiesioginis atsiskaitymas); d) BS 7.5.3, 9.1.5 „Rangovas“ ->
  „Projektuotojas“, BS 2.5.3 ir SS 8.3, 12 priedo eilutė „Subrangovai“ -> „Subtiekėjai“; e) SS 7.1 „info@litgrid.eu“; f) STR 1.04.02:2011
  dabartinis pavadinimas; i) 3 priedo 2 p. „projektavimo paslaugų kainos“; j) SS 3.3-3.8 ir 3.2.1-3.2.6 - pagrindiniame Word sąraše
  (numeriai su tašku; Pages rodė „3.“, „1.“), priedų sąraše „13 priedas.“. g) SS 3.1 „arba“ variantas (iš rangos sutarties) šablone
  lieka, bet žemėlapyje pažymėtas nesiūlomu - generatorius jį pašalins; klausimas - laiške LITGRID. h) Užsakovo banko rekvizitai lieka
  tušti. **Jūsų nurodyta taisyklė visoms sutartims:** sutarties projektas rengiamas prieš pirkimą, laimėtojas nežinomas - tiekėjo
  rekvizitai, kaina ir kitos tik sudarant sutartį paaiškėjančios vietos lieka tuščios.
- **Redakcinės korekcijos** (rašyba, skyryba, dvigubi tarpai): BS 45 vietos ir 27 dvigubi tarpai, SS - 5 ir 7 (sąrašas - `taisymai_9.py`).
- **Žymėjimas kitoks nei rangos** - pildomos vietos pažymėtos geltonai ir laužtiniais skliaustais, todėl `sutarciu-sablonai.py` papildytas:
  `vidiniai` - pasirinkimas toje pačioje pastraipoje su žyma „[pasirinkti vieną]“ (SS 4.2 ES fondai, 6.1 užtikrinimas - trys variantai,
  8.1 nacionalinio saugumo patikra): pastraipos tekstas turi tiksliai susidėti iš aprašytų dalių, kitaip - klaida; `nesiulomi` - 3.1 „arba“
  variantas; `nurodymai_skliaustuose` - nurodymai rengėjui (8.4, 12 ir 15 priedų eilutės); `neprivalomos` - 1.2 investicinis projektas,
  8.2-8.3 koordinatorius, 8.4, 12 ir 15 priedų eilutės; „XXXX Eur“ kainos - pildomos sudarant sutartį; `priedai` - priedų sąrašas 1-15;
  3 priede - dvi etapų lentelės (transformatorių pastotėms ir oro linijoms), pasirenkama viena. Parašų blokas buvo lentelė lentelėje,
  platesnė už A4 teksto plotį - apvalkalas nuimtas (tekstas tas pats). 3 priedas - A4 (buvo US Letter). Komentarai (tarp jų grupės iždo
  politikos taisyklė prie 6.1 p.) pašalinti ir į saugyklą nepatenka.
- **Nuorodos:** visos 17 BS ir SS nuorodų į punktus rodo į esamus punktus (pagal Word numeraciją); `sutarciu-nuorodos.js` atpažįsta priedų
  sąrašo eilutes „N priedas.“.
- **Teisės aktų nuorodos (6.1):** 28 skirtingos nuorodos, visos registre; naujos - Civilinio kodekso statybos rangos ir projektavimo darbų
  rangos straipsniai (perskaityta e-tar 2026-10-11), VPT Kainodaros taisyklių nustatymo metodika (e-tar, galioja), pilnas įstatymo
  pavadinimas su straipsniu („... įstatymo 97 straipsnio“). Radinys T6: BS sąvoka „Techninė užduotis“ nurodo Viešųjų pirkimų įstatymo
  techninę specifikaciją, nors sutartis sudaroma pagal Pirkimų įstatymą - klausimas LITGRID, šablone nekeista.
- **Pages:** BS 23 psl., SS 3 psl., 3 priedas 2 psl. - tekstas neprarandamas, numeriai - kaip Word (BS 261, SS 37 numeruotos pastraipos).
- **Tikrinti parengtus dokumentus:** trys formos atpažįstamos; pasirinktas variantas, pašalintas „arba“ variantas, užpildytos vietos ir
  viena 3 priedo lentelė - ne nukrypimas, pakeistas varianto tekstas - nukrypimas.
- 5 testai (13 šablono ir žemėlapio mutacijų, 10 kodo mutacijų - visos pagaunamos).

**S4 projektavimo paslaugų sutarčiai (2026-10-11; jūsų „Taip, pradėkime S4, abu klausimai - kaip rekomenduojate.“).** Klausimai ir taisyklės -
`docs/salygos/sutarciu-lauku-inventorius.md` (dalis „Projektavimo paslaugų sutartis“).
- **1 žingsnis:** šeima „Projektavimo paslaugų sutartis“ parenkama su šablonais (bendrosios ir specialiosios sąlygos ir 3 priedas; tik LT).
- **2 žingsnis:** 13 klausimų specialiųjų sąlygų punktų tvarka (`KLAUSIMAI_PPS`), visi privalomi, be numatytųjų. Pagal jūsų taisyklę
  (sutarties projektas rengiamas prieš pirkimą) tiekėjo duomenų, kainos ir atstovų neklausiama - jie lieka kaip šablone. Siūloma tik su
  kilme: 3 priedo lentelė pagal pirkimo pavadinimą, patikra pagal 1 žingsnio nacionalinio saugumo atsakymą, 3.6 punkto skaičius pagal 3.3,
  užtikrinimas „ne“, kai SPS jo nereikalauja.
- **Jūsų sprendimai:** netaikomame punkte - „Punktas netaikomas.“ (1.2, 8.2, 8.3, 8.4; punktų numeriai visose sutartyse tie patys);
  12 priedo eilutė, kai patikra neatliekama, - „12 priedas. Pareigų sąrašas - netaikoma;“ (13-15 priedų numeriai nesikeičia).
- **Generatorius:** pasirinkimas toje pačioje pastraipoje (4.2, 6.1, 8.1) - lieka pasirinktas šablono variantas, žyma „[pasirinkti vieną]“
  pašalinama; 3.1 punkto „arba“ variantas (iš rangos sutarties) pašalinamas visada ir tai pasakoma patikroje su priežastimi; geltonas
  žymėjimas lieka tik vietose, pildomose sudarant sutartį, - išspręstose vietose, prie žinomų reikšmių (Užsakovo adresas, antraštės) ir
  tuščiose pastraipose nuimamas.
- **3 priedas** - trečias sutarties dokumentas pakete (iškart po specialiųjų sąlygų): lieka pasirinkta etapų lentelė.
- **Patikra:** nuorodos - visos į esamus punktus; privalomi sutarties elementai - 13 iš 13 (katalogas papildytas: šalis „Projektuotojas“,
  „Šios Sutarties vykdymui Šalys paskiria ...“); „Tikrinti parengtus dokumentus“ - sugeneruoti dokumentai be nukrypimų su pasu ir be jo.
- **Word ir Pages:** ruošiant šabloną pašalintas teksto šešėlis (7.1 punkto Užsakovo kontaktų eilutės atrodė išplaukusios) ir geltonas
  žymėjimas nuo tarpų eilutės pradžioje; generuojant tarpas po pastraipos su likusiu geltonu žymėjimu perkeliamas į tuščią tikslaus aukščio
  pastraipą (Pages žymėjimą nudažo ir per tarpą po pastraipos). Jūsų prašymu sutvarkytos ir trys smulkmenos: 7.1 punkto Užsakovo eilutės be
  nevienodos įtraukos, 3.8 punkto „t. y.“ nebelūžta per dvi eilutes, 3 priedo 1 ir 2 punktai sulygiuoti. Pages: bendrosios sąlygos 23 psl.,
  specialiosios 3 psl., 3 priedas 1 psl., A4, tekstas neprarandamas, numeriai kaip Word.
- 9 testai, kodo mutacijos - žr. CLAUDE.md.

**Kas pildoma generuojant (jūsų taisyklė 2026-10-11, visoms sutarčių šeimoms).** Įrašoma automatiškai: sutarties pavadinimas (= pirkimo
pavadinimas, „{pavadinimas} pirkimas“), pirkimo pavadinimas ir numeris, pirkimo vykdytojo rekvizitai (LITGRID AB, ir sąskaita bei bankas -
projektavimo paslaugų sutarties 7.1 punkte jie formoje tušti, todėl imami iš organizacijų registro `shared/organizacijos.js`, kuris sutampa
su prekių, paslaugų ir rangos sutarčių formomis). Nepildoma: sutarties numeris, tiekėjo rekvizitai, Šalių atstovai. Klausiama prieš
generuojant: ES lėšos, 4.1 punkto pradžia ir terminas, bendras paslaugų teikimo terminas (dabar privalomas „Taip / Ne“), o pirkimo numeris -
tik kai jo nėra pirkimo kortelėje. 2 žingsnyje - sąrašas „Įrašoma automatiškai“ su reikšme ir kilme.

Liko: klausimų tekstų peržiūra (`KLAUSIMAI_PPS`), laiškas LITGRID.

**S1 darbų pirkimo-pardavimo („mažajai“) sutarčiai (5 etapas, 2026-10-11; jūsų „„mažosios“ sutarties šablonai yra galutinė redakcija,
pradėkime“).** `DARBAI_LT_BS` ir `DARBAI_LT_SS` (LT/EN nėra) - tame pačiame registre ir tuo pačiu keliu. Generavimas - S4 (žemiau,
2026-10-12).
- **Redakcinės korekcijos** (privatus `taisymai_10.py`, originalų kopija `originalai-2026-10-11b/`; žodžiai ir numeriai tie patys).
  Bendrosios sąlygos - iš PDF paversto Word failo: 12 sakinių buvo perskelti per dvi pastraipas (sujungti), 19 tuščių pastraipų tarp
  punktų (pašalintos), 5.11 ir 5.11.1 punktų numeriai įrašyti ranka (dabar Word numeracija), pavienis „17“ prieš „PATVIRTINTA“, rašyba
  („taip pat“, „BAIGIAMOSIOS NUOSTATOS“, „trečiosiomis šalimis“, „gali būti laikomos“), skaičiai („3 000“, „1 500“ eurų), 19 dvigubų
  tarpų. Specialiosios sąlygos: Užsakovo adresas preambulėje, taškai ir kabliataškiai sąrašų gale, išskleidžiamų sąrašų variantai be
  tarpų gale, „prieš sudarant Sutartį“.
- **Žymėjimas** (`sutarciu-sablonai.py` papildytas): keturios dalys su nurodymu rengėjui „[... pasirenkama ...]“ - 2 skyrius „Užsakymai“
  (2.1-2.6), 3.2-3.4 (Grafikas), 4.3 (fiksuota kaina), 4.4 (maksimali kaina) - žemėlapio `salyginiai` (`NURODYMO_PASTRAIPA`); pildomos
  vietos - laužtiniais skliaustais ir pilku žymėjimu (55; `pazymetos_vietos` - pažymėtos be skliaustų: atsakingų asmenų lentelė,
  „elektroniniu paštu“, užsienio rangovui keičiami žodžiai); 3.1 p. dvi formuluotės „[...] / [...]“ ir 2.3 p. pasirinkimas - po vieną
  vietą; rekvizitų lentelės etiketės - pildomos vietos; trys išskleidžiami sąrašai (1.2 aktas, 4.1 kainos apskaičiavimo būdas, 6.3
  užtikrinimas) - atsakymas iš klausimo; priedų sąrašas „1)“-„5)“ (`priedu_sarasas`). Bendrosiose sąlygose pildoma tik tvirtinimo
  įsakymo data ir numeris.
- **Nuorodos:** 7 nuorodos į punktus - visos į esamus (pagal Word numeraciją); BS 158 numeruoti punktai iš eilės (5 skyriai, 33
  poskyriai, 120 punktų), SS - 1-6.3.
- **Teisės aktų nuorodos (6.1):** visos registre; naujos 6 - sąvoka „Pirkimų įstatymas“ ir jo straipsniai apie sutarties keitimą ir
  vienašalį nutraukimą, Viešųjų pirkimų įstatymo nuostata apie nepatikimų valstybių ar teritorijų sąrašą (perskaityta e-tar 2026-10-11);
  `sutarciu-nuorodos.js` (1.5) atpažįsta sutartyje apibrėžtą trumpinį „Pirkimų įstatymas“ su straipsniu. BS 5.1.2 p. nuoroda į 4.2.2 p.
  h) papunktį - teisinga (ankstesnio audito klausimas išspręstas perskaičius įstatymą).
- **Pages (PDF eksportu):** specialiosios sąlygos 3 psl., bendrosios - 9 psl., visi A4, tekstas neprarandamas. Bendrosios sąlygos -
  dviem stulpeliais, puslapio antraštė - prie puslapio pririštas teksto laukas: kiekvieno puslapio pirma eilutė buvo rašoma ant
  antraštės. Ruošiant šabloną viršutinė paraštė padidinta (29 -> 45 pt, visuose skyriuose - Pages taiko pirmojo skyriaus paraštes);
  apatinė nekeista (padidinus dokumentas tampa 10 puslapių, o puslapio numerio laukas siauras - „10 / 10“ netelpa). Lieka: Pages
  bendrųjų sąlygų pavadinimą rodo atskirame pirmame puslapyje (Word - tame pačiame su tekstu), nes Pages po stulpelių skaičiaus
  pakeitimo pradeda naują puslapį; išbandyta - vienu stulpeliu pavadinimas ir tekstas būtų viename puslapyje (sprendimas - 8 sk. 16 p.).
- **„Tikrinti parengtus dokumentus“:** abu šablonai atpažįstami, 0 nukrypimų; specialiosios sąlygos su pasirinktu darbų pagal Grafiką
  atveju ir užpildytomis vietomis - 0 nukrypimų, pakeista nekintama nuostata - nukrypimas.
- 9 testai (`testaiDarbuSablonai`), 11 šablono ir žemėlapio mutacijų - visos pagaunamos; 4 kodo mutacijos - 3 pagaunamos, ketvirta
  šiai šeimai rezultato nekeičia (dalių blokai tikrinime sutampa su visos dalies bloku).

Turinio klausimai - 8 sk. 16 p.; laiško LITGRID juodraštis - privačiai.

**S4 darbų pirkimo-pardavimo („mažajai“) sutarčiai (5 etapas, 2026-10-12; jūsų „Taip, visi punktai - kaip rekomenduojate, pradėkime
S4.“).** Sutartis generuojama: `GP_SUTARTYS` šeimai siūlo `DARBAI_LT_BS` ir `DARBAI_LT_SS` (LT; prašant LT/EN - lietuviška su pastaba).
- **Jūsų sprendimai b-i (8 sk. 16 p.)** šablone (privatus `taisymai_11.py`, kopija `originalai-2026-10-12/`): SS 1.3 p. be „užtvarams“
  dalies; preambulė „laimėjo Užsakovo vykdytą [pirkimo pavadinimas] pirkimą (pirkimo Nr. [numeris])“; BS 1.8.2 p. „Rangovas įsipareigoja
  per visą ...“. Redakcinės korekcijos: BS 5.1.2 p. c) kableliai, 6.3 p. sąrašo pavadinimas „banko“. Sprendimas a) (BS tvirtinimo
  eilutė; 2026-10-12 „Palikite tuščią.“) - eilutė lieka kaip formoje, 3 žingsnio patikroje rodoma kaip palikta vieta.
- **Klausimai 2 žingsnyje** (`KLAUSIMAI_DM`, 11 klausimų SS punktų tvarka, visi privalomi, be numatytųjų; inventorius -
  `sutarciu-lauku-inventorius.md`): pirkimo numeris (tik be kortelės numerio); kaip vykdomi darbai - pagal užsakymus / pagal Grafiką /
  vienkartiniai be Grafiko; aktas (1.2 p.); užsakymų dalykas ir terminai (2.2, 2.3 p. - tik užsakymams); terminas mėnesiais ar dienomis
  (3.1 p., sakinio pradžia - pagal atvejį); pratęsimas „Taip / Ne“ („Ne“ - sakinys šalinamas); kainos apskaičiavimo būdas (4.1 p., be
  varianto „yra:“); užtikrinimas su suma (6.3 p.; siūloma iš SPS, nesutapus - „Patikrinkite (SPS ir sutartis)“); trišalės sutarties
  projektas (siūloma pagal SPS tiesioginio atsiskaitymo atsakymą); kiti priedai.
- **Netaikomos dalys - numeriai nesikeičia:** netaikomame punkte „Punktas netaikomas.“ (3.2-3.4, 4.3, 4.4 pagal atvejį); 2 skyriaus
  antraštė lieka, jo vietoje - „2.1. Skyrius netaikomas.“; priedų sąraše - „Trišalės sutarties projektas - netaikoma;“ ir „Kiti priedai
  - netaikoma.“. Nurodymai rengėjui „[... pasirenkama ...]“ pašalinami visada; likęs nurodymas - klaida.
- **Įrašoma automatiškai** (taisyklė „kas pildoma generuojant“): antraštė „{PAVADINIMAS} PIRKIMAS“, pirkimo pavadinimas ir numeris
  preambulėje, Užsakovo rekvizitai lentelėje prieš parašus (iš `GP_ORG.rekvizitai("litgrid")`; registras - iš sutarties įžangos),
  Techninės specifikacijos ir Rangovo pasiūlymo priedų numeriai (1.1 ir 4.4 p.), LITGRID AB bendrųjų sąlygų tekste ir puslapio
  antraštėje. **Pildoma sudarant sutartį** (neklausiama): data, vieta ir numeris, Rangovo duomenys ir rekvizitai, Šalių atstovai, kaina
  (4.2 p.), atsakingi asmenys, parašai - pilkas žymėjimas lieka tik šiose vietose.
- **SPS:** tiesioginio atsiskaitymo sąlyga šiai sutarčiai klausiama (bendrosiose sąlygose tvarkos nėra - `TIESIOGINIS_BS` tik šeimoms,
  kurių BS ją nustato); „Sutarties projektas rengiamas“ ir esminių sąlygų dalies šalinimas - kaip kitoms šeimoms.
- **Generatorius:** dalis be numerių keitimo (`{ taikoma: false, vietoje, lieka }`), tekstas pastraipoje su didžiųjų raidžių požymiu
  (`irasykTeksta` - kitaip „PUNKTAS NETAIKOMAS.“), „[suma]“ išskleidžiamo sąrašo variante, įmonės pavadinimas puslapio antraštėse.
- **„Tikrinti parengtus dokumentus“:** `shared/palyginimas.js` - žyma „Punktas netaikomas.“ / „Skyrius netaikomas.“ / „... - netaikoma;“
  pasirenkamos dalies vietoje yra pasirinkimas, ne nukrypimas (ta pati žyma nepasirenkamoje nuostatoje - nukrypimas; žymų ne daugiau
  nei pašalintų pasirenkamų pastraipų); pasirinkimo vieta pirmiausia suporuojama su savo variantu (4.3 ir 4.4 p. prasideda vienodai);
  žemėlapio `grieztos_vietos` - pastraipa su pildoma vieta lyginama pagal šabloną (nekintamas tekstas turi likti); trumpa forma
  atpažįstama pagal visų pastraipų požymius (registro `pozymiai_visi`). Trys sugeneruoti atvejai ir bendrosios sąlygos - 0 nukrypimų su
  pasu ir be jo; pridėtas sakinys, pakeista nuostata ar pašalintas punktas - nukrypimas.
- **Nuorodos ir privalomi elementai:** nuorodos į punktus ir priedus - visos į esamus (`sutarciu-nuorodos.js` 1.6: priedų sąrašas
  „1)“-„5)“); privalomi sutarties elementai - 12 iš 13: šios sutarties sąlygose nėra atskiro nutraukimo atvejo, kai Vyriausybė
  nusprendžia, kad sutartis neatitinka nacionalinio saugumo interesų (kitų keturių šeimų bendrosiose sąlygose yra; bendrųjų sąlygų
  4.2.2 p. h) papunktis nurodo tik Pirkimų įstatymo straipsnį) - 3 žingsnis tai rodo kaip informaciją, klausimas - laiške LITGRID.
  Kainodara - SS 4.1 p. „Sutarties kainos apskaičiavimo būdas“ (katalogo požymis papildytas).
- **Pages (PDF eksportu):** trys specialiųjų sąlygų atvejai - po 3 psl., bendrosios - 9 psl., A4, tekstas neprarandamas, pilkas
  žymėjimas neišsilieja. Rasta ir sutvarkyta ruošiant šabloną (redakcinės formatavimo korekcijos, tekstas tas pats): Užsakovo el. pašto
  eilutė buvo rodoma didžiosiomis raidėmis (formos „El. p.:“ pirmoji raidė - su didžiųjų raidžių požymiu; nuimtas nuo 8 atkarpų be
  mažųjų raidžių), o ilgos rekvizitų eilutės (registras, adresas) lūždavo su 1,5 cm kabančia įtrauka (numatytasis stilius) - 24 lentelių
  eilutės be įtraukos.
- 8 testai (`testaiDarbuGeneravimas`) ir bendras palyginimo testas; 53 kodo mutacijos - 52 pagaunamos (viena šiam šablonui rezultato
  nekeičia), 2 šablono paruošimo mutacijos - pagaunamos. Word programos šiame kompiuteryje nėra - Word vaizdas netikrintas.

**S1 statybos rangos sutarčiai (6 etapas, 2026-10-12; jūsų „Statybos rangos šablonai aplanke yra galutinė redakcija.“).**
Šablonai `SR_LT_BS` ir `SR_LT_SS` (tik LT). Forma - tos pačios kilmės kaip projektavimo ir statybos rangos sutarties (toliau - rangos):
bendrosios sąlygos - 10 skyrių (be projektavimo), specialiosios - 28 punktai (be ekspertizės punkto).
- **Redakcinės korekcijos** (rašyba, dvigubi tarpai; privatūs `taisymai_12.py` ir `taisymai_13.py`): bendrosios sąlygos - 27 vietos ir 13
  dvigubų tarpų, specialiosios - 5 vietos ir 3 dvigubi tarpai. Naujas testas rado „gražinus“ (BS 3.9.23 p.) - ištaisyta ir rangos BS
  4.9.23 p. (rangos BS registre - nauja redakcija).
- **Paruošimas** (`sutarciu-sablonai.py`, tekstas tas pats): komentarai šalinami (5), vidaus taisyklių riba dviejuose „//“ nurodymuose -
  žodžiais, kairysis SS stulpelis 1542 -> 1814 DXA, punktų numerių šriftas suvienodintas (6), 1.3 p. pratęsimo sakinys - įprastu šriftu
  (kaip rangos SS - jūsų sprendimas 2026-10-10).
- **Žemėlapis:** tie patys blokų tipai kaip rangos SS; nauja - nurodymas rengėjui per kelias pastraipas („// Jei Darbus numatoma
  finansuoti ...“, „arba“, „// Jei Darbus nenumatoma ...“; tas pats BIM) ir pavienis „arba“ po garantinių įsipareigojimų užtikrinimo
  punkto (žemėlapio `kartu`). SS: 43 pildomos vietos, 8 įrašai nurodymo vietoje, 3 pasirinkimai ir 4 derinimo lentelės pasirinkimai,
  6 neprivalomi punktai, 3 sakiniai „Taip / Ne“, 28 priedų sąrašo eilutės, etapų priedas - atskiras gulsčias skyrius; neatpažintų - 0.
- **Nuorodos:** 94 nuorodos į punktus ir priedus; patikrintos ir pagal turinį (kiekviena BS nuoroda sugretinta su tuo pačiu rangos BS
  sakiniu ir jo taikiniu). Rasta 5 BS nuorodos su rangos sutarties numeriais (3 - į punktus, kurių nėra) ir numeracijos klaida, dėl
  kurios SS 22 p. nuoroda rodo ne į tą punktą - žr. 8 sk. 18 p. b) ir c). Teisės aktų nuorodos - 28, 26 jau registre; dvi laukia
  sprendimo (registro skiltis `laukia_sprendimo`).
- **Tikrinimo skirtukas:** abu šablonai atpažįstami kaip statybos rangos (ne rangos), 0 nukrypimų; užpildytos specialiosios sąlygos
  (pašalinti nurodymai su tęsiniais, pasirinkti variantai) - 0; pakeista nuostata - nukrypimas. Privalomi sutarties elementai - 13 iš 13.
- **Pages (PDF eksportu):** bendrosios sąlygos - 43 psl., A4, tekstas neprarandamas, punktų numeriai kaip emuliuoti (535) - t. y. Pages
  rodo ir numeracijos klaidą; neužpildytos specialiosios sąlygos - 7 psl., eilutė „Papildomos sąlygos“ aukštesnė už puslapį (Pages
  eilučių nedalija; generuojant sutvarko lentelių tvarkymas, kaip rangos SS - bus patikrinta S5).
- **Generavimas (S4)** - po jūsų sprendimų (8 sk. 18 p.); padaryta tą pačią dieną, žr. žemiau.
- 9 testai (`testaiStatybosRangosSablonai`); bendri šablonų, registro, rekvizitų ir teisės nuorodų testai - ir su šiais šablonais;
  7 žemėlapio ir šablono mutacijos ir tikrinimo mutacija - pagaunamos.

**Jūsų sprendimai a-l ir S4 statybos rangos sutarčiai (6 etapas, 2026-10-12; jūsų „Taip, visi punktai - kaip rekomenduojate, pradėkime S4.“).**
- **Šablone ištaisyta** (privatus `taisymai_14.py`, kopija `originalai-2026-10-12d/`; pakartotinai - 0 pakeitimų):
  specialiosios sąlygos - punktai vientisai 1-28, el. paštas info@litgrid.eu, delspinigių pakopos „nuo 31 iki 60“ ir „nuo 61 iki 180 dienų“,
  Grafiko formos sakinys keičiant BS 2.3.1 p., „[Sąvoka 1.1.2.14. punktas]“, priedų sąrašas be dviejų rangos sutarties eilučių ir su savo
  pavadinimais; bendrosios sąlygos - trys išvardijimai su raidėmis a), b), ... (tekstu, kaip visi kiti šios formos išvardijimai), penkios
  nuorodos į savo punktus ir „8.8.5 punkte“, el. paštas, sąvoka „Pagrindinių įrenginių“ (antra vieta - ir rangos BS), sąvokų straipsnio
  dalys, 4.2.5 poskyrio pavadinimas. Po to: 95 nuorodos - visos į esamus ir tinkamus punktus; Word numeracija be šuolių; „Darbuotojų saugos
  koordinavimas“ - 4.2.5, kaip nurodo SS 27 p.
- **Klausimai** - tie patys kaip rangos sutarties, be ekspertizės punkto (jo šioje formoje nėra): 25, SS punktų tvarka; skiriasi tik
  „Papildomų sąlygų“ ir bendrųjų sąlygų punktų numeriai bei priedų pavadinimai (`sutarties-forma.js` `RANGOS`). Kiekvienas klausimuose
  paminėtas bendrųjų sąlygų punktas patikrintas - jis toje šeimoje yra (testas tikrina abi rangos šeimas).
- **Generatorius:** nurodymo antra dalis ir „arba“ (Europos Sąjungos fondai, BIM) šalinami kartu su nurodymu, pavienis „arba“ po garantinių
  įsipareigojimų užtikrinimo punkto - kai punktas išspręstas; neatsakyta vieta lieka visa.
- **1 žingsnis:** šeima „Statybos rangos sutartis“ parenkama su šablonais (pavadinimui be projektavimo - klausimas, ar rangovas rengs
  projektą); pirkimo sąlygų sąlyga apie tiesioginį atsiskaitymą atsakoma pati (bendrųjų sąlygų 4.2.2 p.).
- **Patikra:** dviem atsakymų rinkiniais (darbai etapais / ne etapais) ir bendrosios sąlygos - 0 nukrypimų nuo formos su pasu ir be jo,
  nuorodos (96-97) - visos į esamus punktus ir priedus (neegzistuojantis priedo numeris - radinys), privalomi sutarties elementai - 13 iš 13.
- **Pages (PDF eksportu, S5):** bendrosios sąlygos - 43 psl., specialiosios - 5 psl. (abu rinkiniai), etapų priedas - 1 gulsčias puslapis
  atskirame faile; A4, tekstas neprarandamas, punktų numeriai kaip emuliuoti (522, 52 ir 48); derinimo terminų lentelė - pagrindinės
  lentelės eilutėmis, išvardijimai su raidėmis.
- 19 testų dviejose grupėse (`testaiStatybosRangosSablonai` - 10, `testaiStatybosRangosGeneravimas` - 9); 22 kodo mutacijos - visos
  pagaunamos. Word programos šiame kompiuteryje nėra - Word vaizdas netikrintas.
- Lieka jums: klausimų tekstų peržiūra (bendri su rangos sutartimi), laiškas LITGRID (juodraštis privačiai).

**S1 eksploatavimo darbų sutartims (7 etapas, 2026-10-13; jūsų „Eksploatavimo šablonai aplanke yra galutinė redakcija, pradėkime.“).**
- **Šablonai:** vienos bendrosios sąlygos `EKS_LT_BS` ir trys specialiosios sąlygos - oro linijų `EKSOL_LT_SS`, transformatorių pastočių
  `EKSTP_LT_SS`, trasų valymo `EKSTV_LT_SS` (tik LT; kodai baigiasi „_BS“ / „_SS“); žemėlapiai, registras (šeima `EKSPLOATAVIMO`,
  redakcijos žyma „LITGRID eksploatavimo sutartis“). Toliau aprašyta būsena iki jūsų sprendimų; kas pasikeitė po jų ir generavimas (S4) -
  kitame bloke.
- **Auditas:** visi keturi dokumentai perskaityti pastraipa po pastraipos; privatus audito failas ir laiško LITGRID juodraštis -
  `g-procure-privatu/sutartys/` (`eksploatavimo-auditas-2026-10-13.md`).
- **Redakcinės korekcijos** (privatus `taisymai_15.py`, kopija `originalai-2026-10-13/`; pakartotinai - 0): bendrosios sąlygos - 23 vietos
  (rašyba, linksniai, skyryba, skliaustai) ir 20 dvigubų tarpų; specialiosios sąlygos - 17 vietų ir 25 dvigubi tarpai (oro linijų SS
  įžangoje praleistas „atitinka“ ir Užsakovo adresas be namo numerio; trasų valymo SS formulė buvo įrašyta du kartus).
  Bendrųjų sąlygų 3.2.5 p. „įstatymo 151 straipsnyje“ ir „221 straipsnio“ - Valstybinio socialinio draudimo įstatymo 15¹ ir Statybos
  įstatymo 22¹ straipsniai (perskaityta e-tar 2026-10-13; Word faile dingęs indekso formatavimas).
- **Jūsų sprendimas 2026-10-13 (1 variantas)** - trasų valymo SS „Kitų sąlygų“ 1 punktas: „Sutarties bendrųjų sąlygų 3.1.4, 3.6.3-3.6.12,
  3.7, 3.8, 3.9, 5.1.2, 5.1.4-5.1.6, 8.6.6, 8.6.7 punktų reikalavimai nebus taikomi.“
- **Žymėjimas** (`sutarciu-sablonai.py`): SS - pirmas puslapis (šalys, parašai) ir lentelė iš 19 eilučių (numeris | pavadinimas su nuoroda
  į bendrųjų sąlygų punktą | turinys). Nauja: `eilutes_vieta` (žemėlapio vieta - lentelės eilutės numeris; sąrašai langelio viduje vietos
  nekeičia; priedų sąrašas - 18 eilutėje), nuoroda į kelis punktus („[Sąvokos 1.1.2, 1.1.7, 1.1.12 punktai]“, „[3.6.10, 3.6.11 punktai]“),
  `sudarant_pasirinkimai` (transformatorių pastočių SS „Pagrindiniai darbai“ - du variantai su „arba“, iš kurių pasirenka tiekėjas
  pasiūlyme: sutarties projekte lieka abu), sutarties datos eilutė ir „Už Sutarties ir jos pakeitimų viešinimą atsakingas asmuo:“ - pildomos
  sudarant sutartį. Pildomų vietų: oro linijų SS - 51, transformatorių pastočių - 57, trasų valymo - 39; bendrosiose sąlygose - nėra.
- **Paruošimas** (formatavimas, tekstas tas pats; registre - paruošimo įrašai): beveik juoda teksto spalva nuimta (iš kito dokumento
  nukopijuotos pastraipos - BS 3 vietos, oro linijų SS 11); BS 1.1 ir 1.2 punktai perkelti į pagrindinį Word sąrašą (buvo du atskiri
  sąrašai su įrašytu numeriu - Pages rodė „1.“ ir „1.“); SS lentelės eilučių numeriai 1-19 įrašyti tekstu, numerių stulpelis paplatintas
  iki 480 DXA (Pages tuščios pastraipos Word numerio nerodo - skyriai buvo be numerių, o į juos nurodo pati sutartis).
- **Nuorodos** (`sutarciu-nuorodos.js` 1.7): priedų sąrašas „1) ...“ po sakinio „Pasirašydamos Sutartį Šalys patvirtina, kad ...
  neatsiejama Sutarties dalis:“ („Kitų sąlygų“ sąrašas „1) ...“ - ne priedai). Kiekvienoje poroje (BS ir viena SS) - 48-50 nuorodų, visos
  į esamus punktus ir priedus, išskyrus žinomą BS 3.11.3 ir 3.11.4 p. „3.12.2“.
- **Teisės aktų nuorodos:** 30 skirtingų (BS - 22, trasų valymo SS - 8) - visos perskaitytos e-tar ir įrašytos registre (naujos ištraukimo
  taisyklės: įstatymo straipsnis su indeksu, dvi dalys po pilno įstatymo pavadinimo, nutarimo ir įsakymo numeris kilmininku ir galininku,
  įsakymo numeris be raidžių ir su data, direktyva be „/ES“, Metrologijos įstatymas, Atliekų tvarkymo, Miško kirtimo, Elektros linijų ir
  instaliacijos įrengimo taisyklės). Radiniai: T7 - BS 5.1.2.12 p. nurodytas aplinkos ministro 2015-05-08 įsakymas Nr. D1-393 neteko
  galios 2024-11-01; T8 - BS 8.6.7 p. įstatymo pavadinimas (e-tar: Mobilizacijos ir priimančiosios šalies paramos įstatymas).
- **Aplanko bendrosios sąlygos ir LITGRID paskelbta redakcija.** Bendrosios sąlygos, paskelbtos su 2025-12 ir 2026-04 oro linijų
  eksploatavimo pirkimais (PDF, sukurtas 2025-10-16), skiriasi nuo aplanko failo: jose nėra sąvokos „Sąlygos“ (todėl šešių sąvokų numeriai
  vienetu mažesni, o vietoj „Sąlygų N punkte“ - „Sutarties bendrųjų sąlygų N punkte“), aštuonios aplanko pastraipos su ženkleliu yra punktai
  (2.2.1, 3.10.1, 4.2.7, 4.2.8, 8.3.3, 8.5.3, 8.7.2, 8.7.9), 5.3.13 p. sakinys užbaigtas, 8.6.3 p. pridėta mobilizacijos išlyga. Aplanko
  rinkinys tarpusavyje nuoseklus (SS antraščių numeriai atitinka aplanko bendrąsias sąlygas). Kuri redakcija turi būti generatoriuje -
  jūsų sprendimas (8 sk. 19 p. A).
- **Tikrinti parengtus dokumentus:** visi keturi šablonai atpažįstami kaip savo forma (trys panašios SS - ne viena kitos), 0 nukrypimų;
  užpildytos SS - 0 nukrypimų; pakeista nuostata - nukrypimas. Privalomi sutarties elementai - 13 iš 13 su kiekvienomis SS.
- **Pages** (PDF eksportu): bendrosios sąlygos - 42 psl., tekstas neprarandamas, 517 punktų numerių kaip Word; specialiosios sąlygos -
  6-7 psl., eilutės „Sutarties dokumentai ir priedai“ ir „Kitos sąlygos“ aukštesnės už puslapį - Pages jų nedalija ir dalį teksto nukerpa
  (6-13 pastraipų): tai sprendžia generatorius (eilučių skaidymas, kaip kitose sutartyse) - S4.
- 11 testų (`testaiEksploatavimoSablonai`); bendri šablonų, registro ir teisės nuorodų testai - ir su šiais šablonais; 8 žemėlapio ir
  šablono mutacijos ir 12 kodo mutacijų - visos pagaunamos.
- Sprendimai (8 sk. 19 p.) gauti 2026-10-13 - žr. kitą bloką.

**Jūsų sprendimai eksploatavimo darbų sutartims ir S4 (7 etapas, 2026-10-13; „A. 3.“, „B. Pritariu.“, „C. Pritariu.“, „E. Pritariu.“,
„F. Pritariu.“; tą pačią dieną - „D - pritariu siūlymui.“ ir „5 eilutė „Pirkimas“ - pritariu.“).**
- **A (3 variantas) - bendrosios sąlygos priderintos prie LITGRID paskelbto teksto** (privatus `taisymai_16.py`, kopija
  `originalai-2026-10-13b/`; pakartotinai - 0). Paskelbtas tekstas perskaitytas iš dviejų nepriklausomai nuskaitytų PDF kopijų (per
  viešųjų duomenų jungtį); skirtumu laikyta tik tai, kas sutampa abiejose. Padaryta: sąvoka „Sąlygos“ pašalinta (sąvokos 1.1.20-1.1.25),
  „Sąlygų <punktas>“ -> „Sutarties bendrųjų sąlygų <punktas>“ (27 vietos), sąvoka „Sutartis“, 2.6.4, 5.3.13, 7.3.1 („(www.stat.gov.lt)“)
  ir 8.6.3 p. (mobilizacijos išlyga). Trys „Sąlygose“ (1.1 ir 1.2 p., 8.3.3 p. pavyzdys) lieka - taip ir paskelbtame tekste.
  Nuo paskelbto teksto sąmoningai skiriasi: 8.6.6 p. nuoroda - į bendrųjų sąlygų 8.6.1.1 p. (paskelbta - „specialiųjų“, nors punktas
  yra bendrosiose sąlygose), 10.11.3 p. bauda - 8.3.7 p. (paskelbta - 8.3.6; žr. B), mūsų redakcinės korekcijos (rašyba, skyryba).
- **B** - aštuonios pastraipos su ženkleliu sunumeruotos kaip paskelbtame tekste (2.2.1, 3.10.1, 4.2.7, 4.2.8, 8.3.3, 8.5.3, 8.7.2, 8.7.9;
  pagrindinis Word sąrašas); 8.2.1 p. antroji pastraipa lieka su ženkleliu (taip ir paskelbtame tekste); 10.11.3 p. „8.3.6 papunktyje
  nurodyta bauda“ -> 8.3.7. Patikrinta: kiekviena bendrųjų ir visų trijų specialiųjų sąlygų nuoroda po pernumeravimo rodo į tą pačią
  pastraipą kaip prieš tai (išskyrus sąmoningai pakeistas).
- **C** - c1) bendrųjų sąlygų 3.11.3 ir 3.11.4 p. nuoroda - į 3.11.2 p.; c2) pastočių ir trasų valymo SS 1 eilutės antraštė - „[Sąvokos
  1.1.2, 1.1.7, 1.1.12 punktai]“; c3) oro linijų SS draudimo bendrovių sąrašas - 18 priede; c4) trasų valymo SS 7 eilutėje pastaba
  „(reikalavimas koreguotas ...)“ pašalinta. Visų SS antraštės „Sutarties kaina“ ir „Užsakovas“ - sąvokos 1.1.22 ir 1.1.25.
- **E** - e1) pastočių SS 9 eilutė „iš ne mažiau kaip [įrašoma] darbuotojų“ (klausimas 2 žingsnyje); e2) trasų valymo SS 16 eilutė
  „galiojimo terminas – [įrašoma] mėn. (Darbų atlikimo terminas) ir 1 (vienas) mėnuo“ (generatorius įrašo 2 eilutės terminą);
  e3) bendrųjų sąlygų 10.9.2 p. „Rangovas ir teises bei pareigas perėmęs trečiasis asmuo prieš Užsakovą atsako solidariai“ - ir
  projektavimo ir statybos rangos (11.14.2 p.) bei statybos rangos (10.14.2 p.) bendrosiose sąlygose (registre - nauja redakcija, ankstesnė
  įrašyta); e4) 5.3.13 p. - paskelbto teksto sakinys; e5) 8.6.7 p. „Mobilizacijos ir priimančiosios šalies paramos įstatyme“ (T8 -
  ištaisyta); e6) 5.1.2.12 p. nekeistas (T7 - klausimas LITGRID); e7) tvirtinimo eilutė „202_ m. d. įsakymu Nr.“ lieka tuščia -
  generatorius jos nepildo, patikra rodo kaip paliktą vietą.
- **D** (privatus `taisymai_17.py`, kopija `originalai-2026-10-13c/`): visų SS 17 eilutėje Užsakovo telefonas „+370 707 02171“ ir el. paštas
  „info@litgrid.eu“ (kaip organizacijų registre ir kitose LITGRID sutarčių formose), oro linijų ir pastočių SS priedų sąraše -
  „http://www.litgrid.eu/...“. LITGRID formoje rodomas tekstas buvo su žyma „Įmonės pavadinimas“ vietoje „litgrid“ (nuorodų taikiniai faile -
  teisingi ir nekeisti), telefonas - su pertekliniu skaitmeniu. Jei kita formos redakcija vėl atneštų žymą el. pašto ar interneto adrese,
  2 ir 3 žingsnis tai pasakys.
- **5 eilutė „Pirkimas“** - palikta visa sutarties sudarymui (jūsų „pritariu“ 2026-10-13).
- **Po sprendimų:** pildomų vietų - oro linijų SS 51, pastočių 58, trasų valymo 40, bendrosiose sąlygose - 1 (tvirtinimo eilutė); nuorodų
  kiekvienoje poroje - 50-52, visos į esamus punktus ir priedus (radinių nėra); teisės nuorodų registre - 8.6.7 p. įstatymo pavadinimas
  įrašytas kaip teisingas; bendrųjų sąlygų Pages PDF - 43 psl., 524 numeruotos pastraipos kaip Word.
- **F - generavimas (S4).** `GP_SUTARTYS`: šeima parinkta, specialiosios sąlygos - pagal darbų rūšį (`kodai(šeima, variantas, kalba)`;
  LT, prašant LT/EN - lietuviška su pastaba). 2 žingsnyje klausimai pagal darbų rūšį (`KLAUSIMAI_EKS`: oro linijos - 15, pastotės - 21,
  trasų valymas - 6; visi privalomi, be numatytųjų; inventorius - `docs/salygos/sutarciu-lauku-inventorius.md`). Automatiškai: pirkimo
  pavadinimas ir numeris sutarties įžangoje, LITGRID AB, priedų numeriai tekste (pastočių įkainių priedas; bankų ir draudimo bendrovių
  sąrašų priedai), trasų valymo užtikrinimo galiojimo terminas (iš 2 eilutės). Sudarant sutartį: Sutarties data ir numeris, Užsakovo
  atstovas, Rangovo duomenys, 5 eilutė „Pirkimas“ (paskelbimo data ir numeris paaiškėja tik paskelbus pirkimą - trasų valymo formoje taip
  ir parašyta), kaina, Šalių atstovai, Rangovo sąskaita ir kontaktai, užtikrinimo dokumento rūšis, už viešinimą atsakingas asmuo, parašai;
  pastočių 4 eilutės „Pagrindinių darbų“ variantą pasirenka tiekėjas - abu variantai ir nurodymas lieka. Eilutės, taikomos ne visada
  (10 „Dokumentai“, 12 „Užsakovo sandėliai“, 15 „Papildomi garantiniai terminai“, 16 „Sutarties įvykdymo užtikrinimas“): „Taip / Ne“,
  o „Ne“ - tas pats žodis, kurį LITGRID įrašė trasų valymo formoje („Nėra“ - 10 ir 15 eil., „Netaikoma“ - 12 eil.; 16 eil. -
  „Netaikoma“, priedų sąraše - „Sutarties įvykdymo užtikrinimas – netaikoma.“); eilučių ir priedų numeriai nesikeičia. Oro linijų SS
  užtikrinimo dydis - skaičiais ir žodžiais („125 000 Eur (vienas šimtas dvidešimt penki tūkstančiai eurų)“). SPS sąlyga apie tiesioginį
  atsiskaitymą atsakoma pati (bendrųjų sąlygų 5.2.6-5.2.7 p.). Pilkas žymėjimas lieka tik sudarant sutartį pildomose vietose.
- **Išmatuota:** trys darbų rūšys dviem atsakymų rinkiniais („Taip“ ir „Ne“) ir bendrosios sąlygos - 0 nukrypimų nuo formos su generavimo
  pasu ir be jo; pakeistas nekintamas tekstas šalia užpildytos vietos - nukrypimas (žemėlapio `grieztos_vietos`); nuorodos (51-55) - visos
  į esamus punktus ir priedus; privalomi sutarties elementai - 13 iš 13. Pages (PDF eksportu):
  bendrosios sąlygos 43 psl., specialiosios - 8, 7 ir 6 psl., A4, tekstas neprarandamas (aukštos eilutės suskaidytos), eilučių ir priedų
  numeriai matomi.
- Testai: `testaiEksploatavimoSablonai` (12) ir `testaiEksploatavimoGeneravimas` (10).
- Lieka jums: klausimų tekstų peržiūra; laiškas LITGRID (juodraštis privačiai).

**S2 (2026-10-08).** `PP-salygos/sutartys.js` - `GP_SUTARTYS.parink({ pavadinimas, objektas, bvpz, kalba, vykdytojas, atsakymai })`:
kalibravimo prototipo taisyklės be pakeitimų (privatus palyginimas - visi sprendimai sutampa) ir jūsų sprendimai 2026-10-08 (TP teritorijos
smulkūs darbai - mažoji; ekspertizė ir techninė priežiūra - klausimas dėl CPO LT). Rezultatas: „parinkta“ (su šablonais iš S1 registro -
tik prekės ir paslaugos), „neparuošta“ (šeima žinoma, šablonas dar neparuoštas), „klausimas“ (K0-K5, CPO; atsakymų tekstai ir „?“
paaiškinimai - 3.1) arba „nerengiama“ (CPO LT forma); visada su priežastimi. `palygink()` - stebėjimo įrašas (siūlyta / pasirinkta /
sutampa, be pirkimo pavadinimo) - sąsaja jį rinks S3.
Kalibravimas (privačiai, `g-procure-privatu/sutartys/prototipas/kalibruok_js.py`, 306 LITGRID sutartys, iš jų 29 CPO LT ekspertizės ir
techninės priežiūros): **0 klaidingų automatinių parinkimų**, kiekvienam klausimui teisingas atsakymas yra; be klausimų - 183 (59,8 %),
po vieno klausimo - 122, po dviejų - 1. Kriterijus „>= 70 % be klausimų“ neišpildytas tik dėl CPO klausimo (48 atvejai) - be jo 70,9 %.
Kalibravimo metu pridėta: techninė priežiūra su perdavimo linija ar tinklo objektu taip pat klausia dėl CPO LT („Elektros perdavimo linijos
... techninės priežiūros paslaugos“ - 7 iš 7 per CPO LT), o K2 turi atsakymą „Iš esmės įrangos tiekimas su įrengimu (prekės)“ (CVP IS
„darbai“, bet sudaryta prekių sutartis). Imtis ta pati, iš kurios taisyklės sudarytos - tikra patikra bus stebėjimo režime.

**S3 - 1 žingsnio blokas (2026-10-08).** `PP-salygos/sutarties-blokas.js` (`GP_SUTARTIES_BLOKAS`), 1 žingsnyje po „Pirkimo objekto
tipas“, žymė „bandomoji“. Pagal 8 sk. 6 ir 7 p. rekomendacijas (ir 2026-10-04 formos principus):
- **Siūloma sutartis** - pavadinimas, „Siūloma (nepatvirtinta)“, priežastis žodžiais iš paties pavadinimo („110 kV“, „rekonstravimo“ - iki
  tol variklis rodė kamienus), dokumentai (BS ir SS, kalba) ir šablonų redakcija iš registro; „Patvirtinti“ - vienas paspaudimas.
- **Klausimai** (K0-K5, CPO) - radijo grupės su „?“ paaiškinimu, be numatytojo atsakymo; atsakytas lieka matomas su pasirinkimu (rodyklėmis
  galima keisti, fokusas lieka), kitas klausimas atsiranda po juo.
- **„Pakeisti“** - visos šeimos (ir eksploatavimo variantai) ir „Sutarties projektas nerengiamas“ su priežastimi: CPO LT forma, tiekėjo
  forma, esminės sutarties sąlygos SPS. Žmogaus pasirinkimas laikomas patvirtintu, duomenims pasikeitus nekeičiamas; parodoma, ką siūlytų
  sistema; „Grąžinti siūlomą“.
- **Patvirtinimas galioja sutarčiai:** pakeitus duomenis taip, kad siūloma kita, patvirtinimas nebegalioja ir pasakoma, kas buvo patvirtinta;
  vėl pasiūlius tą pačią - galioja (pvz. netyčia pakeistas ir grąžintas objekto tipas).
- **Ko nesiūlo:** centralizuotam VPĮ pirkimui šeima parenkama, bet šablonai nesiūlomi (8 sk. 5 p. - jūsų sprendimas); DPS sukūrimui blokas
  nerodomas - LITGRID DPS sukūrimo sąlygose sutarties projekto priedo nėra; be pavadinimo - laukiama.
- **LT/EN:** įspėjimas „Anglų tekste yra nepatikrintų vertimo vietų: N“ - skaičius iš šablonų žemėlapių (DI juodraščiai, 5.6), neblokuoja.
  Nuo 2026-10-08 DI juodraščių nebėra (5.5) - blokas sako, kaip parengtas anglų tekstas ir kad vertėjas jo netikrino.
- **3 žingsnis:** patikroje eilutė „Sutarties projektas (bandomoji)“ - sutartis, būsena, ką siūlė sistema; pasakoma, kad į paketą dar
  neįtraukiama.
- **Stebėjimo įrašai** (jūsų sprendimas 2026-10-08 - kaupti naršyklėje taisyklėms tikslinti): kol sutartis patvirtinta, šios naršyklės
  saugykloje (`gprocure.sutartys.stebejimas`) laikomas vienas puslapio atvėrimo įrašas - pirkimo pavadinimas, objekto tipas, BVPŽ, kalba,
  režimas, būdas, ką siūlė sistema, atsakymai į klausimus ir ką pasirinkote; patvirtinimui nebegaliojant - pašalinamas; iki 500 naujausių.
  Bloke - skiltis „Stebėjimo įrašai šioje naršyklėje: N“ (kas įsimenama ir kodėl), „Atsisiųsti įrašus (JSON)“ ir „Išvalyti“ (su
  patvirtinimu). Įrašai niekur nesiunčiami, patenka į atsarginę kopiją, aprašyti privatumo pranešime. Taisyklėms tikslinti atsisiųstą
  failą perduodate G-Procure rengėjui - jis kartu su naujomis paskelbtomis LITGRID sutartimis tampa kalibravimo rinkiniu (6.4).
  Generavimo pase (S4) - tik `palygink` įrašas, be pavadinimo (pasas keliauja su skelbiamu dokumentu).
- Blokas aiškiai sako, kad sutarties dokumentų dar nekuria - pirkimo sąlygų paketas nuo jo nesikeičia.
2 žingsnio sutarties laukai (SS valdikliai pagal 3.4, pildomos vietos, bendri su SPS) - kartu su S4: be generavimo jų atsakymų nebūtų kur
patikrinti. Testai - `PP-salygos/testai.html` grupė „Sutarties projektas 1 žingsnyje“ (10; 23 kodo mutacijos - visos pagaunamos),
telefono ir prieinamumo būsenos - `shared/testai.html`.

---

## 8. Jūsų sprendimai

1. ~~**Taisyklės (2.4)**~~ - atsakyta 2026-10-08: tinka. TP teritorijos pastatų ir teritorijos smulkūs darbai (be statybos veiksmo ir
   projektavimo) - **mažoji, be klausimo**; ekspertizė ir statinio statybos techninė priežiūra - **klausiama „Ar perkama per CPO LT?“**
   (taip - sutarties projektas nerengiamas, CPO LT forma; ne - Paslaugų sutartis); kitos lentelės taisyklės - S2 pradžia (stebėjimo režimas).
2. ~~Eksploatavimo regioninės SS~~ - atsakyta: BS pridėtos 2026-10-07. Lieka: eksploatavimo BS patvirtinimo data (redakcijų registrui).
   Trasų valymo SS punktų išimtis - atsakyta 2026-10-13 (žr. 5.1 lentelę): generatoriuje „3.1.4, 3.6.3-3.6.12, 3.7, 3.8, 3.9, 5.1.2,
   5.1.4-5.1.6, 8.6.6, 8.6.7“; klausimai LITGRID (3.1.3 ar 3.1.4, privažiavimo keliai ir aplinkosauga, kilmės nuostatos) - laiško juodraštyje.
3. **Turinio klaidos:** ar parengti laišką LITGRID (kaip SPS šablonams) su visais [T] radiniais? Iš dalies atsakyta 2026-10-09: laiškas dėl
   teisės aktų nuorodų (T1, T2 ir informacija apie T3) parengtas; kiti [T] radiniai - dar laukia jūsų sprendimo.
4. **LT/EN redakcijos (5.4):** ar LT/EN rinkinius atnaujinti pagal aktualią VPT redakciją (kaip LT; su nauju EN vertimu), o kol
   neatnaujinta - generatorius LT/EN sutarties nesiūlo ar siūlo su įspėjimu? 9.4 - atsakyta (1000 Eur, 5.5); kitos LT ir LT/EN skirtingos
   sumos ir bazės (9.3, 9.14.4, 8.2.1, 20 % ribos bazė) - kurios standartinės?
5. **VPĮ (AKV, centralizuoti) pirkimai:** VPT tipinės sąlygos (VPĮ 87 str. 1 d.) ar LITGRID šablonai su pagrindimu? Atsakyta 2026-10-12:
   „Palikime taip kaip yra.“ - centralizuotam VPĮ pirkimui sutarties projektas nerengiamas, priežastis pasakoma.
6. ~~**Patvirtinimas**~~ ir 7. ~~**Sutarties projektas visada?**~~ - atsakyta 2026-10-12 (jūsų formuluotė): 1 žingsnio blokas - vienas
   klausimas **„Ar taikomos tipinės LITGRID AB sutarties standartinės sąlygos?“**. „Taip“ - pridedamos standartinės LITGRID AB sutarties
   bendroji ir specialioji dalys pagal pirkimo tipą; „Ne“ - pridedamos esminės sutarties sąlygos. Įgyvendinta: klausimas privalomas, be
   numatytojo atsakymo; sutartis pagal pirkimo tipą rodoma prieš atsakant („Siūloma (nepatvirtinta)“ su priežastimi), „Taip“ ją
   patvirtina; kai pirkimo tipą atitinka kelios sutartys - po „Taip“ užduodamas patikslinantis klausimas; „Pakeisti sutartį“ - tik
   sutarčių sąrašas. Rankinių pasirinkimų „CPO LT forma“ ir „tiekėjo forma“ nebėra (tokiu atveju - „Ne“). Iki tol (S3): siūloma sutartis
   su mygtukais „Patvirtinti“ ir „Pakeisti“.
8. **Iš anksto pasirinktos reikšmės** šablonuose - laikyti neatsakytomis (rekomenduoju).
9. ~~**Grupės užtikrinimo taisyklė**~~ iš SS komentarų - ar generatorius ją siūlo (kaip „Siūloma“, su šaltiniu), ar tik rodo paaiškinime?
   Atsakyta kartu su 15 p. (2026-10-12): tik primena, atsakymų nesiūlo.
10. **Redakcijų valdymas:** kas praneša apie naujas redakcijas ir ar galima žymėti failus redakcijos kodu (kaip Amber Grid „SUT-36 10.0“)?
11. ~~**Puslapio formatas**~~ - atsakyta 2026-10-08: **A4** (padaryta šablonuose, S1).
12. ~~**Projektavimo ir statybos rangos šablonai (3 etapas, 2026-10-10)**~~ - atsakyta 2026-10-10: a-i ištaisyti, vidinės ribos pakeitimas žodžiais
    tinka - ištaisyta šablone (`taisymai_8.py`). Buvo klausta:
    - a) SS punktų numeracija: dabar 1.1-1.5, po to vėl „1.“-„24.“ (nuorodų į SS punktus nėra). Rekomenduoju vientisą 1-29.
    - b) SS 1.5 „[Sąvoka 1.1.2.9.]“ -> „[Sąvoka 1.1.2.14. punktas]“ (1.1.2.9 - „Įrenginiai“, 1.1.2.14 - „Pagrindiniai įrenginiai“).
    - c) BS 11.3.4 „pagal Projektuotojo perduotus“ -> „pagal Rangovo perduotus“ (šalis - Rangovas).
    - d) „info@Įmonės pavadinimas.eu“ (SS 14 p., BS 7.3.3) -> „info@litgrid.eu“, kaip kiti LITGRID rekvizitai.
    - e) BS 5.2.3.1 a), b), c), e), f), g) -> a)-f) (praleista d)).
    - f) SS 10 p. delspinigių pakopos: „nuo 31 iki 60 dienų (įskaitytinai)“, „nuo 61 iki 180 dienų (įskaitytinai)“ (dabar 31-a ir 61-a dienos nepatenka į jokią pakopą).
    - g) SS 15 p.: keičiant BS 2.3.1 p. antrą sakinį išlaikyti „pagal tipinę Užsakovo Grafiko formą (šabloną)“.
    - h) BS 2.3.12 „Pagrindinės įrangos“ -> apibrėžta sąvoka „Pagrindinių įrenginių“.
    - i) Teisės nuorodos: T4 - „VPĮ 2 straipsnio 39 punkte arba PĮ 2 straipsnio 15 punkte“ -> „dalyje“; T5 - STR 1.04.02:2011 dabartinis
      pavadinimas „Inžineriniai geologiniai (geotechniniai) tyrimai“.
    - j) Vidinė užtikrinimo riba „//“ nurodyme saugykloje pakeista žodžiais (kaip komentarai) - ar tinka?
    Lieka laiškui LITGRID (turinys): BS 2.3.5 bauda ir delspinigiai, 8.3.1 „5 % arba daugiau“ ir išnaša, derinimo terminai BS ir SS,
    projektuotojo draudimo suma ir procentų bazė, ypatingojo statinio vadovas, nenugalima jėga, rizikos perėjimas, Koordinatoriaus 23 ir 24 p.,
    statybos ir projektavimo-statybos BS skirtumai (4.9.4 ir 5.9.4 terminas), VPĮ sąvokos PĮ šablone.

13. ~~**Rangos sutarties klausimai (S4, 2026-10-10)**~~ - atsakyta 2026-10-10: „Taip, įgyvendinkite visus penkis punktus taip, kaip jūs
    siūlote.“ - įgyvendinta (`docs/salygos/sutarciu-lauku-inventorius.md`, antros dalies pabaiga):
    - b) SS 4, 6, 8, 9 ir 18, kai netaikoma, - „Punktas netaikomas.“ (punktas su antrašte lieka; 1-19 punktų numeriai nesikeičia);
    - c) SS 17 BIM formuluotės tinka; paaiškinime - suderinimas su Technine užduotimi ir priedų sąrašu;
    - d) SS 21 - vienas variantas; ar TP projekte kitoms dalims turi likti „Per 15 d. d.“, - laiške LITGRID;
    - e) SS 28-29 - Ne / tik 28 / 28 ir 29 kartu (29 punktas vienas vartotų neapibrėžtą sąvoką „Koordinatorius“);
    - f) SS 3 pratęsimo sakinys - privalomas „Taip / Ne“ („Ne“ - sakinys šalinamas), SS 6 ir 8 - „Taip / Ne“ („Ne“ - „Punktas netaikomas.“).
    Lieka: a) klausimų tekstai - jūsų peržiūrai.

14. ~~**Projektavimo paslaugų šablonai (4 etapas, 2026-10-11)**~~ - atsakyta 2026-10-11 (a-j), ištaisyta šablonuose (`taisymai_9.py`):
    - a) BS punktus susieti su skyrių numeriais (7.5.1 ir t. t.) - taip;
    - b) „STATINIO INFORMACINIS MODELIAVIMAS“ - 2.5 poskyris - taip;
    - c) SS 8.2 nuoroda - „bendrųjų sąlygų 4.2.10 punkte“;
    - d) „Rangovas“ -> „Projektuotojas“, „Subrangovai“ -> „Subtiekėjai“;
    - e) SS el. paštas - info@litgrid.eu;
    - f) STR 1.04.02:2011 pavadinimas - dabartinis;
    - g) SS 3.1 „arba“ variantas - generatorius nesiūlo, klausimas laiške LITGRID;
    - h) Užsakovo banko rekvizitai - ne; sutarties projektas rengiamas prieš pirkimą, tiekėjo rekvizitai lieka tušti (taisyklė visoms sutartims);
    - i) 3 priede - „projektavimo paslaugų kainos“;
    - j) SS 3.3-3.8 su tašku, „13 priedas.“.
    Lieka laiškui LITGRID (turinys): SS 3.1 „arba“ variantas, BS 4.2.2 ir 4.2.4 pasikartojantis sakinys, bauda ir delspinigiai už tą patį
    pažeidimą, BIM nuostata SS, priedų failai aplanke neatitinka priedų sąrašo, 7.4.1 e) ir 7.4.2, Viešųjų pirkimų įstatymo sąvokos (T6).
    S4 (2026-10-11, „Taip, pradėkime S4, abu klausimai - kaip rekomenduojate.“): netaikomame punkte - „Punktas netaikomas.“; 12 priedo eilutė,
    kai patikra neatliekama, lieka su žodžiu „netaikoma“ - įgyvendinta.
15. **Grupės iždo politikos užtikrinimo riba** (jūsų atsakymas 2026-10-11: vidinė informacija, iš viešų šablonų pašalinta; „turi būti
    numatyta sistemoje pranešimas“): saugykla vieša, todėl skaičius kode vėl taptų viešas. Siūlomi keliai: (1) ribą įvedate naršyklėje
    (nustatymas, saugomas tik joje ir atsarginėje kopijoje), sistema pagal ją primena; (2) pranešimas be skaičiaus („patikrinkite pagal
    vidaus taisykles“). Atsakyta 2026-10-12: **1 variantas** („Pritariu rekomendacijai.“) - įgyvendinta (`PP-salygos/vidaus-riba.js`):
    ribą įvedate patys prie užtikrinimo klausimo („Įvesti ribą“), ji saugoma tik jūsų naršyklėje ir atsarginėje kopijoje; sistema pagal
    ją primena prie SPS sąlygos apie sutarties įvykdymo užtikrinimą, prie sutarties užtikrinimo klausimo ir 3 žingsnyje („Patikrinkite
    (vidaus taisyklės)“, kai numatoma vertė viršija ribą, o užtikrinimo nereikalaujama); kol riba neįvesta - bendras priminimas. Į
    dokumentus ir saugyklą riba nepatenka.
16. **Darbų pirkimo-pardavimo („mažosios“) sutarties šablonai (5 etapas, 2026-10-11)** - atsakyta 2026-10-12 („Taip, visi punktai -
    kaip rekomenduojate, pradėkime S4.“): b-i - pirmas variantas, įgyvendinta (žr. 7 sk. S4). a) - jam rekomendacijos nebuvo, todėl
    perklausta; atsakyta tą pačią dieną: „Palikite tuščią.“ - eilutė lieka kaip formoje. Klausimai buvo:
    - a) bendrųjų sąlygų tvirtinimo eilutė „2025 m. ___________d. įsakymu Nr. ___“: tokios pačios bendrosios sąlygos eksploatavimo
      darbų aplanke turi datą ir numerį - įrašyti juos / palikti tuščia;
    - b) SS 1.3 p. „..., o įrengtiems užtvarams ir juos komplektuojančioms dalims dviejų metų garantinį terminą“ (konkretaus pirkimo
      likutis): pašalinti / palikti klausimu „Ar kuriems nors darbų rezultatams nustatomas kitoks garantinis terminas?“;
    - c) preambulė „laimėjo Užsakovo skelbtą [pirkimo pavadinimas, būdas, paskelbimo data ir numeris (jei apie pirkimą skelbiama)]“:
      „laimėjo Užsakovo vykdytą [pirkimo pavadinimas] pirkimą (pirkimo Nr. [numeris])“, pildoma automatiškai / kaip šablone;
    - d) vienkartiniai darbai be Grafiko: leisti trečią atvejį (3.2-3.3 netaikomi, 3.4 delspinigiai ir 4.3 fiksuota kaina lieka) /
      tik du šablono atvejai;
    - e) netaikomos dalys: numeriai nesikeičia, įrašoma „Punktas netaikomas.“ (kaip rangos sutartyje) / dalys šalinamos ir punktai
      pernumeruojami (nuoroda „Sutarties 4.2. punkte“ perrašoma);
    - f) BS 1.8.2 p. sakinys be veiksnio („Per visą Sutarties vykdymo laikotarpį turėti įdiegtą aplinkos apsaugos vadybos sistemą ...“):
      „Rangovas įsipareigoja per visą ...“ / palikti;
    - g) SS 3.1 p. pratęsimo sakinys - privalomas „Taip / Ne“ („Ne“ - sakinys šalinamas);
    - h) 4.1 p. sąrašo variantas „yra:“ (be tęsinio) - nesiūlyti;
    - i) bendrosios sąlygos Pages programoje: palikti du stulpelius (pavadinimas - atskirame pirmame puslapyje) / vienas stulpelis.
    Laiškui LITGRID (turinys, netaisoma): specialiosiose sąlygose nėra draudimo punkto, nors bendrųjų sąlygų 3.4 poskyris taikomas tik
    jį numačius; bendrosiose sąlygose nėra tiesioginio atsiskaitymo su subrangovais tvarkos, nors 4 priedas - „Trišalės sutarties
    projektas“; indeksavimo formulė be kainos dalių svorių; kitų sutarčių sąvokos („Darbų žiniaraštis“, „Prekių, Paslaugų“); nuo
    2026-10-12 - ir nutraukimo atvejis, kai Vyriausybė nusprendžia, kad sutartis neatitinka nacionalinio saugumo interesų (bendrosiose
    sąlygose atskiro punkto nėra). Tą pačią dieną patvirtinti trys įgyvendinimo pasirinkimai („Pritariu rekomendacijai.“): netaikomame
    2 skyriuje - „2.1. Skyrius netaikomas.“, priedų sąraše - „... - netaikoma“, trišalės sutarties projektas - atskiras klausimas.
17. ~~**Sutarties pavadinimo forma**~~ - atsakyta 2026-10-12: **„Tvoros remonto pirkimo sutartis“** („{pirkimo pavadinimas} pirkimo
    sutartis“; iki tol - „... pirkimas“). Įgyvendinta visoms šeimoms; pirkimo pavadinimas kitose sutarties vietose lieka „... pirkimas“.
18. ~~**Statybos rangos sutarties šablonai (6 etapas, 2026-10-12)**~~ - atsakyta 2026-10-12: „Taip, visi punktai - kaip rekomenduojate,
    pradėkime S4.“ - visi punktai a-l įgyvendinti (7 sk.). Klausimai buvo (rekomendacija visiems - „taip“):
    Tie patys kaip rangos sutartyje (ten nuspręsta 2026-10-10):
    - a) SS punktų numeracija: dabar 1.1-1.6 (du Word sąrašai), tada 2-23 -> vientisa 1-28;
    - d) el. paštas „info@Įmonės pavadinimas.eu“ (SS 14 p., BS 6.3.3 p.) -> „info@litgrid.eu“;
    - e) SS 10 p. delspinigių pakopos -> „nuo 31 iki 60 dienų (įskaitytinai)“, „nuo 61 iki 180 dienų (įskaitytinai)“ (dabar 31-a ir
      61-a vėlavimo dienos nepatenka į jokią pakopą);
    - f) SS 15 p.: keičiant BS 2.3.1 p. antrą sakinį išlaikyti „pagal tipinę Užsakovo Grafiko formą (šabloną), pateikiamą šios
      Sutarties specialiųjų sąlygų priede,“;
    - g) BS 2.3.12 p. „Pagrindinės įrangos“ (2 vietos) -> apibrėžta sąvoka „Pagrindinių įrenginių“ (rangos BS antra vieta taip pat
      liko - ištaisyti ir ten);
    - h) BS sąvoka „Pirkimo dokumentai“: sąvokų straipsnio dalys pavadintos punktais -> „dalyje“ (T4);
    - i) SS 1.5 p. „[Sąvoka 1.1.2.14.]“ -> „[Sąvoka 1.1.2.14. punktas]“ (vienodai su kitais).
    Tik statybos rangos formoje:
    - b) BS trys išvardijimai (13 pastraipų) neteko raidžių sąrašo: šeši atvejai po 4.2.3.1 p. („jam yra iškelta restruktūrizavimo ar
      bankroto byla;“ ...), du Specialisto keitimo atvejai, penki gedimų šalinimo terminai. Word ir Pages juos numeruoja kaip punktus
      (4.2.4-4.2.9, 4.2.11-4.2.12, 8.1.11-8.1.15) ir pastumia tolesnius: „Specialistai“ - 4.2.10, „Darbuotojų saugos koordinavimas“ -
      4.2.13, nors SS 22 p. nurodo „bendrųjų sąlygų 4.2.5 punkte“. Siūloma: raidžių sąrašai a), b), ... kaip rangos BS - tada numeriai
      sutampa su SS nuoroda;
    - c) BS nuorodos su rangos sutarties numeriais: 2.3.8 p. „5.7 punktas“ -> 4.7 (ataskaitos); 3.9.19 p. „9.1 skyriuje“ -> 8.1
      (kokybės garantija); 3.10.3 p. „šiame ... 4.10 punkte“ -> 3.10 (Pagrindiniai įrenginiai); gedimų šalinimo punkte „10.1.10.7
      punkte“ -> 8.1.10.7; 9.3.2 p. p) papunktyje „11.1.10 punkte“ -> 10.1.10 (klausimynas); 8.8.9 p. „8.8.5 punktuose“ -> „punkte“;
    - j) SS priedų sąrašas perkeltas iš rangos sutarties: „projektavimo ir statybos rangos sutarties bendrosios sąlygos“ -> „statybos
      rangos sutarties bendrosios sąlygos“; „Techninė užduotis/projektavimo užduotis“ -> „Techninė užduotis / Projektas“ (kaip SS 1.2
      p.); eilutės „Apmokėjimas už Projektą“ ir „Projektuotojo civilinės atsakomybės privalomojo draudimo liudijimo (poliso) kopija“ -
      pašalinti (priedų numeriai - automatiniai). „Darbų žiniaraščio po Techninio darbo projekto parengimo pildoma forma“ ir
      „Minimalūs informacijos saugos reikalavimai projektavimui ir diegimui“ - palikti (klausimas LITGRID);
    - k) BS 4.2.5 poskyrio pavadinimas „Darbuotojų saugos koordinavimas kai projektuojant arba statant Objektą ...“ -> „..., kai
      statant Objektą ...“ (punkto tekste - tik „statant“);
    - l) generavimas - tais pačiais principais kaip rangos sutarties (jūsų sprendimai 2026-10-10): 1-19 punktai (po a) pernumeravimo) lieka visi,
      netaikomame - „Punktas netaikomas.“; pratęsimas, Užsakovo įrenginiai, demontuojami įrenginiai - „Taip / Ne“; koordinatorius - 27 arba 27 ir
      28 p. kartu; etapų priedas - atskiras gulsčias failas; užtikrinimas - su vidaus taisyklių ribos priminimu.
    Laiškui LITGRID (turinys, netaisoma): „po Techninio darbo projekto parengimo“ (BS 2.3.12 p.) statybos rangos sutartyje; projektavimo
    paminėjimai (BS 7.3.8, 8.2.3 p., netesybų e) papunktis, SS 7 p. nurodymas); pavienis „arba“ SS 19 p.; kiti - kaip rangos sutarties
    laiške.
19. ~~**Eksploatavimo darbų sutarties šablonai (7 etapas, 2026-10-13)**~~ - atsakyta 2026-10-13: „A. 3.“, „B. Pritariu.“, „C. Pritariu.“,
    „E. Pritariu.“, „F. Pritariu.“, „D - pritariu siūlymui.“ - visi punktai įgyvendinti, S4 padarytas (7 sk.). Trasų valymo SS punktų
    išimtis - nuspręsta 2026-10-13 (1 variantas, pritaikyta). 5 eilutė „Pirkimas“ lieka sutarties sudarymui („pritariu“ 2026-10-13).
    Klausimai buvo:
    - **A. Bendrųjų sąlygų redakcija.** Aplanko Word failas skiriasi nuo bendrųjų sąlygų, kurias LITGRID paskelbė su 2025-12 ir 2026-04
      oro linijų eksploatavimo pirkimais (7 sk.; palyginimo lentelė - privačiame audito faile). Variantai: (1) gauti iš LITGRID paskelbtos
      redakcijos Word failą - tada šablonas pakeičiamas vienu paleidimu (`--nauja-redakcija`), o SS antraščių numeriai „1.1.23“ ir „1.1.26“
      suderinami; (2) palikti aplanko redakciją (rinkinys tarpusavyje nuoseklus) ir klausimą įtraukti į laišką LITGRID; (3) aplanko failą
      priderinti prie paskelbto teksto pagal palyginimo lentelę (apie 45 pakeitimai; tekstas - iš paskelbto PDF). Rekomenduoju 1, o kol
      failo nėra - 2 (taip padaryta dabar).
    - **B. Pastraipos su ženkleliu vietoj punkto numerio** (jei lieka aplanko redakcija): devynios bendrųjų sąlygų pastraipos (2.2, 3.10,
      4.2 - dvi, 8.2.1, 8.3, 8.5, 8.7 - dvi) Word ir Pages rodomos su „•“. Paskelbtoje redakcijoje aštuonios iš jų - punktai. Siūloma:
      sunumeruoti aštuonias kaip paskelbtoje redakcijoje (2.2.1, 3.10.1, 4.2.7, 4.2.8, 8.3.3, 8.5.3, 8.7.2, 8.7.9) ir 10.11.3 p. nuorodą
      „8.3.6 papunktyje nurodyta bauda“ pakeisti į 8.3.7 (bauda pasislenka); kitos nuorodos (ir visų trijų SS) nesikeičia.
    - **C. Nuorodos** (siūloma - taip):
      - c1) bendrųjų sąlygų 3.11.3 ir 3.11.4 p. „Dėl Sąlygų 3.12.2 punkte nurodytų priežasčių“ -> 3.11.2 (3.12.2 punkto nėra);
      - c2) transformatorių pastočių ir trasų valymo SS 1 eilutės antraštė „[Sąvokos 1.1.2, 1.1.7, 1.1.11 punktai]“ -> „1.1.12“
        („Neplaniniai darbai“; 1.1.11 - „Mėnesio grafikas“; oro linijų SS - jau 1.1.12);
      - c3) oro linijų SS „Kitų sąlygų“ 11 p. „draudimo bendrovių sąrašas pateikiamas 19 priede“ -> „18 priede“ (19 - „Subrangovų sąrašas“);
      - c4) trasų valymo SS 7 eilutė: „... 7.3 punkte (reikalavimas koreguotas Sutarties specialiųjų sąlygų 19 p. 3 p.) nustatyta tvarka“ -
        pastabą skliaustuose pašalinti (19 eilutės 3 p. dabar apie vėlinamus ar ankstinamus darbus; oro linijų ir pastočių SS jos nėra).
    - **D. Užsakovo duomenys** (kaip ankstesnėse šeimose; siūloma - taip): visų SS 17 eilutėje „El. paštas info@Įmonės pavadinimas.eu“ ->
      „info@litgrid.eu“, „Tel. +370 707 021717“ -> „+370 707 02171“ (organizacijų registras ir kitos LITGRID formos); oro linijų ir
      pastočių SS priedų sąraše „http://www.Įmonės pavadinimas.eu/...“ -> „http://www.litgrid.eu/...“ (adresas su „litgrid“ veikia - nukreipia į dabartinį LITGRID puslapį „Reikalavimai rangovams“; tikrinta 2026-10-13).
    - **E. Turinys:**
      - e1) transformatorių pastočių SS 9 eilutė: „Brigados turi būti sudarytos iš ne mažiau kaip darbuotojų turinčių operatyvines remonto
        teises“ - nėra skaičiaus. Siūloma: pildoma vieta „ne mažiau kaip [įrašoma] darbuotojų“ (klausimas 2 žingsnyje);
      - e2) trasų valymo SS 16 eilutė: užtikrinimo galiojimo terminas „36 (trisdešimt šeši) mėnesiai (Darbų atlikimo terminas) ir 1
        (vienas) mėnuo“, o 2 eilutėje darbų atlikimo terminas pildomas. Siūloma: 16 eilutėje - pildoma vieta, kurią generatorius užpildo
        tuo pačiu terminu kaip 2 eilutėje;
      - e3) bendrųjų sąlygų 10.9.2 p. „Jei Rangovas nesilaiko šio reikalavimo, Užsakovas ir teises bei pareigas perėmęs trečiasis asmuo prieš
        Užsakovą atsako solidariai“ -> „Rangovas ir ...“ (taip - darbų pirkimo-pardavimo ir projektavimo paslaugų bendrosiose sąlygose). Tas
        pats sakinys yra projektavimo ir statybos rangos bei statybos rangos bendrosiose sąlygose - siūloma ištaisyti visose trijose;
      - e4) bendrųjų sąlygų 5.3.13 p. nebaigtas sakinys. Siūloma - paskelbtos redakcijos tekstas: „Siekiant įvertinti Rangovo darbuotojų
        saugos būklę, Rangovas, Užsakovui prašant, privalo pateikti su darbuotojų sauga susijusią informaciją (...)“;
      - e5) bendrųjų sąlygų 8.6.7 p. „Mobilizacijos ir priimančios šalies įstatyme“ -> „Mobilizacijos ir priimančiosios šalies paramos
        įstatyme“ (pavadinimas pagal e-tar; T8). Siūloma - taip;
      - e6) bendrųjų sąlygų 5.1.2.12 p.: aplinkos ministro 2015-05-08 įsakymas Nr. D1-393 neteko galios 2024-11-01 (T7). Siūloma šablone
        nekeisti ir klausti LITGRID (koks reikalavimas turi būti dabar) - laiško juodraštyje;
      - e7) bendrųjų sąlygų tvirtinimo eilutė „202_ m. d. įsakymu Nr.“ - siūloma palikti tuščią, kaip darbų pirkimo-pardavimo
        bendrosiose sąlygose (jūsų sprendimas 2026-10-12).
    - **F. Generavimas (S4)** - siūloma tais pačiais principais kaip kitose šeimose: iš pirkimo žinoma (pirkimo pavadinimas, numeris,
      būdas, Užsakovo rekvizitai) - automatiškai; Rangovo duomenys, kaina, atstovai, sąskaita, sutarties data ir numeris, viešinimo
      atsakingas asmuo, pastočių SS pagrindinių darbų variantas - sudarant sutartį; kita (įkainių priedas, priemokos, terminas, objektų
      sąrašas, brigadų skaičius, reagavimo terminai, sandėliai, garantiniai terminai, užtikrinimas, regionas, metai) - klausimai 2 žingsnyje;
      specialiosios sąlygos parenkamos pagal variantą (oro linijos, pastotės, trasų valymas), kurį jau nustato sutarties parinkimas.
    Laiškui LITGRID (turinys, netaisoma): trasų valymo SS trys klausimai (2026-10-13), A punkto klausimai, bendrųjų sąlygų 3.1.3, 3.1.8,
    7.3.2-7.3.3 p. sakiniai, 8.3 netesybų pavyzdžio sumos, 5.2.9 ir 10.11.6 p. rangos sutarties sąvokos, oro linijų SS „Kitų sąlygų“ 2, 4 ir
    9 p. - juodraštis privačiai.
