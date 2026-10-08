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

### 4.5. Patikra po generavimo (stabdo, ne įspėja)

1. **Palyginimas su šablono forma** (`GP_PALYGINIMAS`): leidžiami tik žemėlapio kintamieji ir atsakymais pašalinti blokai. Bet koks kitas
   skirtumas - atsisiųsti neleidžiama, rodoma vieta.
2. **Neliko pildomų vietų** (išskyrus tas, kurios pildomos sudarant sutartį - jos išvardijamos), komentarų, „Pasirinkite elementą“.
3. **Nuorodų sargas:** kiekviena nuoroda „X punkte“, „X priede“, „Sutarties bendrųjų sąlygų X.Y“ turi rodyti į egzistuojantį tos pačios
   sutarties punktą ar priedą (šablonuose tokių klaidų rasta dešimtys - 5 sk.).
4. **PĮ 95 str. 1 d. katalogas** (kaip `GP_PRIVALOMI`): 12 elementų - kur sutartyje rasta, su citata; nerastas - „Patikrinkite“.
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
| Eksploatavimo (3 regioninės SS) | Su 2026-10-07 pridėtomis eksploatavimo BS (10 skyrių) visos SS nuorodos sutampa (7.3, 8.2.2, 8.3.1 lentelės 15 eilutė, 9.3, 3.1.3, 3.3, 3.8-3.10, 5.1.2, 5.1.4-5.1.6, 8.6.6-8.6.7), sąvokos „Brigados“, „Neplaniniai“ ir „Avariniai darbai“ apibrėžtos. Išimtis: trasų valymo SS „3.7.3-3.7.14 ... punktų reikalavimai nebus taikomi“ - BS 3.7 turi tik 3.7.1-3.7.5 | turinys (kurie 3.7 punktai netaikomi trasų valymui) |
| Eksploatavimo BS | 3.11.3 ir 3.11.4 „Dėl Sąlygų 3.12.2 punkte nurodytų priežasčių“ - 3.12.2 nėra; priežastys išvardytos 3.11.2 | redakcinė |
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

**Nekeista sąmoningai (1 žingsnis):** VPT formos tekstas su klaidomis (taisyti gali tik VPT; generatorius jį lygins su VPT tekstu) -
prekių SS: „atskiru pirkimu.)“, „Garantinis terminas, skaičiuojamas“, „daugiau ne 2 / 5 valandas“, „šiais Specialiosiose sąlygose“,
„įsakymu D1-508“ (be „Nr.“), „2 priedo X skyriuje ... “)“, „Prekių priėmimo – perdavimo aktu“, „atliekų tvarkytoju, ar atliekų
tvarkytojų, turinčiu“, „Įstatymuose“; paslaugų SS: „Teikėjas Pasaugas suteikė“, „parneris“, „(nurodyti Avanso užtikrinimo dydį
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
(prekių sutartys nuo ~1,2 mln. Eur - visos LT/EN); geltonų žymių skaičius - iš paties šablono.

**Atnaujinimo eiga:** (1) redakcinės klaidos LT rinkiniuose (numeracija, nuorodos - 5.4 4 p.) - **padaryta 2026-10-07 kartu su lentelės reikšmėmis LT rinkiniuose (5.5)**; (2) prekių LT SS - likę pradinės
redakcijos punktai (1.2, 3.2, 4.3, 4.4, 6.1, 9.7, 13.1-13.4; 9.9 ir 11.2) - **padaryta 2026-10-07 (5.5)** pagal 1S-51 - jūsų sprendimu kiekvienam; (3) LT/EN = LT tekstas +
vertimas: nepasikeitusiems punktams - esamas EN, pasikeitusiems (VPT 2025-04-17 pakeitimai, jūsų reikšmės) - naujas vertimas
vertėjo ar teisininko (DI vertimas teisiniam tekstui - tik juodraštis, ne galutinis) - **padaryta 2026-10-07 (5.5): failai perkurti,
DI juodraščiai geltonai, laukia vertėjo patikros**; (4) generatoriaus testas lygina LT/EN lietuvišką
stulpelį su LT pastraipa į pastraipą - kad rinkiniai vėl neišsiskirtų; (5) VPT tipinių sąlygų pakeitimai - į PP-teise registrą.

---

## 6. Žinių bazė ir atitiktis VPT bei rinkos standartams (4 reikalavimas)

### 6.1. Teisės registras

`shared/teises-nuorodos.js` papildomas: PĮ 95 str. 1 d. (12 punktų atskirais raktais), 3 ir 4 d., PĮ 96 str. 2 d., PĮ 97 ir 98 str.
(jau naudojami šablonuose), VPĮ 87 str. 1 ir 2 d., VPT 1S-19, 1S-209, 1S-95 - kiekvienas perskaitytas e-tar su data. Šablonuose esančios
teisės nuorodos (PĮ, VPĮ, CK, Statybos įstatymas, STR, Nacionaliniam saugumui užtikrinti svarbių objektų apsaugos įstatymas, BDAR)
tikrinamos e-tar prieš įtraukiant šeimą; neteisinga - turinio radinys LITGRID.

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
| S1 | Šablonų paruošimas: redakcijų registras, `templates/sutartys/`, kartografas visiems žymėjimo būdams, žemėlapiai, redakcinių klaidų taisymai, blokuojančių šeimų žymė | kiekvienas šablonas - žemėlapis be neatpažintų vietų; taisymai pakartotinai - 0; testai su mutacijomis **prekėms ir paslaugoms padaryta 2026-10-08** (žr. žemiau); kitos šeimos - tuo pačiu keliu |
| S2 | Parinkimo variklis (`PP-salygos/sutartys.js`, `GP_SUTARTYS.parink`) + taisyklių lentelė + kalibravimo testų rinkinys | 0 neteisingų automatinių parinkimų rinkinyje; >= 70 % be klausimų; stebėjimo režimas - generatorius siūlo, žmogus patvirtina, neatitikimai renkami **variklis padarytas 2026-10-08** (žr. žemiau); stebėjimo režimo sąsaja - S3 |
| S3 | UX: blokas „Sutarties projektas“ 1 žingsnyje, klausimai K0-K5, sutarties laukai 2 žingsnyje, bendri SPS ir sutarties laukai | telefonas 375 / 320 px, prieinamumas, „Siūloma (nepatvirtinta)“ **1 žingsnio blokas padarytas 2026-10-08** (žr. žemiau); 2 žingsnio sutarties laukai - kartu su S4 |
| S4 | Generavimas ir patikra po generavimo (4.5), pasas, tikrinimo skirtukas atpažįsta sutarčių formas | kiekvienai šeimai - sugeneruotas paketas be leistinų skirtumų už žemėlapio; mutacijos pagaunamos |
| S5 | Word ir Pages patikra (lentelės, puslapio formatas - prekių failai US Letter), gyva patikra | kaip SPS |
| S6 | Žinių bazė (6.1, 6.3) ir pakartotinio kalibravimo procesas | registro įrašai perskaityti e-tar |

Prioritetas pagal kalibravimą: projektavimo ir statybos rangos, paslaugų, projektavimo paslaugų, darbų pirkimo-pardavimo, prekių,
statybos rangos, eksploatavimo (po BS gavimo).

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
2. ~~Eksploatavimo regioninės SS~~ - atsakyta: BS pridėtos 2026-10-07. Lieka: eksploatavimo BS patvirtinimo data (redakcijų registrui) ir
   trasų valymo SS 3.7 punktų išimtis.
3. **Turinio klaidos:** ar parengti laišką LITGRID (kaip SPS šablonams) su visais [T] radiniais?
4. **LT/EN redakcijos (5.4):** ar LT/EN rinkinius atnaujinti pagal aktualią VPT redakciją (kaip LT; su nauju EN vertimu), o kol
   neatnaujinta - generatorius LT/EN sutarties nesiūlo ar siūlo su įspėjimu? 9.4 - atsakyta (1000 Eur, 5.5); kitos LT ir LT/EN skirtingos
   sumos ir bazės (9.3, 9.14.4, 8.2.1, 20 % ribos bazė) - kurios standartinės?
5. **VPĮ (AKV, centralizuoti) pirkimai:** VPT tipinės sąlygos (VPĮ 87 str. 1 d.) ar LITGRID šablonai su pagrindimu?
6. **Patvirtinimas:** rekomenduoju - automatiškai parinkta sutartis visada „Siūloma (nepatvirtinta)“, vienas paspaudimas „Patvirtinti“.
   (S3 įgyvendinta pagal šią rekomendaciją ir 2026-10-04 formos principus.)
7. **Sutarties projektas visada?** Rekomenduoju: taip (numatytasis), su galimybe „nerengiamas“ (CPO LT, tiekėjo forma, esminės sąlygos SPS).
   (S3 įgyvendinta pagal šią rekomendaciją: „Pakeisti“ - „Sutarties projektas nerengiamas“ su viena iš trijų priežasčių.)
8. **Iš anksto pasirinktos reikšmės** šablonuose - laikyti neatsakytomis (rekomenduoju).
9. **Grupės užtikrinimo taisyklė** iš SS komentarų - ar generatorius ją siūlo (kaip „Siūloma“, su šaltiniu), ar tik rodo paaiškinime?
10. **Redakcijų valdymas:** kas praneša apie naujas redakcijas ir ar galima žymėti failus redakcijos kodu (kaip Amber Grid „SUT-36 10.0“)?
11. ~~**Puslapio formatas**~~ - atsakyta 2026-10-08: **A4** (padaryta šablonuose, S1).
