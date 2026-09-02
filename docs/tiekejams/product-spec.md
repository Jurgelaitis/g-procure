# Produkto specifikacija - G-Procure Tiekėjams (MVP)

## Tikslas

Padėti tiekėjui, turinčiam tik CVP IS pirkimo nuorodą, per kelias minutes: suprasti pirkimo esmę ir būseną, rasti taikomus reikalavimus, gauti šaltiniais pagrįstą atsakymą, susikurti pasirengimo kontrolinį sąrašą ir aiškiai matyti, ko sistema nežino ir ką būtina patikrinti CVP IS.

Sprendimas nekeičia oficialios CVP IS informacijos, teisinės konsultacijos ir tiekėjo atsakomybės.

## Naudotojai

- Tiekėjas, pirmą kartą dalyvaujantis LITGRID pirkime (LT arba EN).
- Patyręs tiekėjas, kuriam reikia greitai rasti konkrečią sąlygą dideliame dokumentų pakete.
- Kiti suinteresuoti asmenys (konsultantai, žurnalistai, tyrėjai) - tik vieši duomenys.

## Principai

Public-by-design; vienodos sąlygos; source-first; no source, no answer; versijų kontrolė; žmogaus sprendimas; jokių „kaip laimėti" pažadų; skaidrus neapibrėžtumas. (Įgyvendinimas - `architecture.md`.)

## Scenarijai

### A. Konkretus pirkimas

1. Naudotojas įklijuoja CVP IS nuorodą arba resourceId (arba TED numerį, arba pavadinimą - tada nukreipiama į CVP IS paiešką).
2. Rodoma: CVP IS ID, vykdytojas LITGRID AB, laiko zona, oficialios nuorodos (detalės, dokumentų sąrašas, skelbimai, skelbimo PDF, visų dokumentų ZIP), aiški žyma „Gyva CVP IS jungtis neįjungta" ir 2 žingsniai.
3. Naudotojas atsisiunčia ZIP iš CVP IS ir įkelia. Rodomas kiekvieno dokumento statusas (perskaityta / iš dalies / nepavyko / nepalaikoma), rūšis, kalba, versijos žymos, įspėjimai (skenuotas PDF, injekcija), komplektiškumo indikatorius ir įkėlimo laikas.
4. Iš dokumentų automatiškai atpažįstami (su šaltiniu): terminas (Europe/Vilnius, likęs laikas / praėjęs), BVPŽ, būdas, galiojimas, dalys, pavadinimas. Nesutapimai tarp dokumentų rodomi kaip konfliktas.
5. Klausimas (su nebūtina dalimi): atsakymas 7 dalių formatu - trumpas atsakymas, reikšmė tiekėjui, ką atlikti, sąlygos ir išimtys, šaltiniai (dokumentas, vieta, punktas, versija, citata, nuoroda į CVP IS), patikimumas (aukštas / vidutinis / nepakanka) su paaiškinimu, patikrinta (laikas). Konfliktai rodomi abu. Be šaltinio - „nustatyti negalima" ir klausimo projektas.
6. Kontrolinis sąrašas: 15 punktų, kiekvienas su viena iš 5 būsenų (privaloma pagal šaltinį / taikoma su sąlyga / netaikoma pagal šaltinį / šaltiniuose nerasta / reikia patikslinti CVP IS - penktoji „netaikoma" pridėta prie master prompto keturių, kad aiškus „nereikalaujama" su citata nebūtų rodomas kaip „nerasta"), santrauka, pastaba, šaltiniais; kopijavimas; „patikslinti" punktai turi mygtuką klausimo projektui.
7. Klausimo CVP IS projektas: pirkimas, dokumentas, punktas, citata, neaiškumas, vienas klausimas; kopijavimas; įrankis nesiunčia.
8. Pokyčiai tarp redakcijų: pastraipų lygiu pridėta / pašalinta / pakeista, kuri redakcija naujesnė; teisinė reikšmė nevertinama.
9. Grįžtamasis ryšys „Padėjo / nepadėjo" - anoniminiai skaitikliai.

### B. Bendri klausimai

12 temų (rasti pirkimus, BVPŽ prenumerata, būdai, paraiška vs pasiūlymai, EBVPD, klausimo pateikimas, konfidencialumas, subtiekėjai, patikra prieš pateikiant, techninės klaidos, galiojimas/užtikrinimas/neįprastai maža kaina, pretenzija). Kiekviena: atsakymas su PĮ straipsniais, veiksmai, šaltiniai su redakcija ir patikrinimo data, „ko šaltiniuose nėra", priminimas, kad tai ne konkretaus pirkimo taisyklė.

### C. Kaip tikrinami atsakymai

Principai, techninė būsena (jungtis, AI kelias, saugojimas, versija), šaltinių registras su redakcijomis ir patikrinimo datomis, privatumas ir atsakomybė.

## Ne MVP (sąmoningai)

Pasiūlymų pateikimas į CVP IS, susirašinėjimas su LITGRID, paskyros, konkurentų / kainų / laimėjimo prognozės, konfidencialių dokumentų įkėlimas, automatinis kvalifikacijos sprendimas, el. pašto prenumeratos, gyva CVP IS jungtis, OCR, vektorinė paieška, administracinis kokybės skydelis (žr. `limitations-and-phase-2.md`).

## Sėkmės kriterijai (kokybė)

- 100 proc. rodomų materialių teiginių turi patvirtintą citatą (validavimas atmeta nepatvirtintas).
- 0 šaltinių iš kito pirkimo (indeksas tik vieno pirkimo).
- 0 išgalvotų terminų / dokumentų / kriterijų (be šaltinio - nera_saltinio; kontrolinio sąrašo „privaloma" tik su šaltiniu).
- Visi terminai su laiko zona ir patikrinimo laiku.
- Neperskaityti dokumentai matomi kaip spraga; komplektiškumas rodomas ir perduodamas modeliui.
- Konfliktai rodomi naudotojui.
- Į dokumentus įterptos AI instrukcijos nevykdomos (patikrinta gyvai).
- Klaviatūra, mobilus vaizdas be horizontalaus slinkimo (testai).

## Priėmimo testų atitiktis (master promptas, 20 atvejų)

| # | Atvejis | Būsena |
|---|---|---|
| 1 | galiojantis LITGRID CVP IS URL | testas (resolve) |
| 2 | tik resourceId | testas |
| 3 | neegzistuojantis / ne LITGRID pirkimas | testas: rodomos tik nuorodos, niekas neišgalvojama (gyvos patikros nėra - 2 etapas) |
| 4 | vieno etapo pirkimas | žinių bazė + dokumentų kelias (rankinis) |
| 5 | kelių etapų derybos | žinių bazė („paraiška vs pasiūlymai") |
| 6 | kelių dalių pirkimas | dalies filtras klausime + metaduomenų „dalys"; per dalį taikomas reikalavimas - AI su citata (rankinė patikra) |
| 7 | LT-EN rinkinys | kalbos žyma dokumentui, atsakymas naudotojo kalba, citata originalo kalba |
| 8 | ZIP su PDF, DOCX, XLSX | testai (ZIP, DOCX, XML), PDF/XLSX - bibliotekos iš repo; rankinė patikra su realiu CVP IS ZIP - 2 etapo užduotis |
| 9 | skenuotas PDF | pažymima „be teksto sluoksnio" (OCR nėra) |
| 10 | sugadintas / nepalaikomas failas | testas (unsupported / failed, komplektiškumas partial) |
| 11 | pakeista redakcija | testas (redakcijų poros, pokyčiai; metaduomenų pirmenybė AKTUALI REDAKCIJA) |
| 12 | paaiškinimas, keičiantis atsakymą | gyva patikra: konfliktas tarp redakcijų atpažintas |
| 13 | klausimas be atsakymo šaltiniuose | testas (nera_saltinio) |
| 14 | bendras klausimas ≠ konkreti sąlyga | priminimas prie kiekvienos temos (testas) |
| 15 | klaidinanti instrukcija dokumente | testas (aptikimas) + gyva patikra (ignoruota, pažymėta) |
| 16 | CVP IS nepasiekiama | netaikoma (jungties nėra); Worker/proxy klaida rodoma kaip klaida, ne kaip „nėra reikalavimo" |
| 17 | terminas pasibaigęs | testas (praėjęs) |
| 18 | terminas kitoje laiko zonoje | testas (ISO su poslinkiu = ta pati akimirka) |
| 19 | reikalavimas vienai daliai | dalies filtras + AI citata (rankinė patikra) |
| 20 | terminas nesutampa dokumentuose | testas (metaduomenų konfliktas) + gyva patikra (AI konfliktas) |
