# Pirkimų teisės stebėsena - administravimo procesas

Administravimo aplinka: `PP-teise/admin.html` (ES teisės registrui - `PP-teise/admin.html?lygmuo=es`). Būsena 2026-11-13.

## 1. Kas veikia ir kur gyvena duomenys

| Kas | Kur | Pastaba |
|---|---|---|
| Bendras registras - nacionalinė teisė | `PP-teise/duomenys/registras.json` (repozitorija) | Vienintelis tiesos šaltinis, kurį mato visi naudotojai |
| Bendras registras - ES teisė (nuo 2026-11-13) | `PP-teise/duomenys/registras-es.json` | `meta.lygmuo: "es"`; žr. 5 skyrių |
| Šaltinių registras ir patikrų žurnalas | `PP-teise/duomenys/saltiniai.json` | Patikros su rezultatu „ok“ / „nepavyko“ |
| Darbinė kopija administratoriui | naršyklės `localStorage` (`ppteise.admin.registras`, ES teisei - `ppteise.admin.registras.es`) | Tik toje naršyklėje; į bendrą registrą patenka per eksportą |
| Pakeitimų istorija | `localStorage` (`ppteise.admin.istorija`) | Kas, ką, kada |
| Rankinės patikros | `localStorage` (`ppteise.admin.patikros`) | Eksportuojamos kartu su šaltinių registru |
| Naudotojo peržiūrų žurnalas | `localStorage` (`ppteise.perziuros`, stebėsenos puslapis) | **Niekada nepatenka į eksportą** |

**Serverio autorizacijos NĖRA** - administravimo puslapis viešas kaip ir visa svetainė. Todėl:
jame nerašoma vidinė informacija apie konkrečius pirkimus ar tiekėjus; eksportas išmeta visus laukus,
kurių vardas prasideda „vidin...“; tikrasis leidimų sluoksnis yra repozitorijos commit'as (kas gali
įrašyti `registras.json`, tas ir tvirtina registrą). Serverinė autorizacija - neįgyvendinta
(žr. `diegimas.md`).

## 2. Būsenos ir jų reikšmė

| Būsena | Ženklas | Reiškia | Kas gali |
|---|---|---|---|
| Automatiškai aptikta | ◌ | Rasta savaitinės patikros metu: paskelbti tik faktai, analizė rengiama (puslapyje - „Nauja - analizė rengiama“) | savaitinė užduotis / importas |
| Laukia peržiūros | ◔ | Aprašymas parengtas, bet teisės specialistas nepatvirtino | prižiūrėtojas |
| Specialisto patvirtinta | ✓ | Teisės specialistas peržiūrėjo šaltinį ir aprašymą; istorijoje - jo vardas ir pastaba | tik specialistas |
| Archyvuota | ▣ | Atšaukta, pakeista kitu įrašu ar nebeaktuali; nerodoma skiltyse, matoma archyve su priežastimi | prižiūrėtojas |

Taisyklės, kurias vykdo kodas:
- patvirtinimui privalomas vardas ir pastaba (ir mygtuku, ir formos sąrašu); patvirtinus nuimama žyma „DI juodraštis“;
- **patvirtinto įrašo turinio pakeitimas grąžina jį į „Laukia peržiūros“**;
- archyvavimas įrašo `pakeistas` (kada, priežastis); grąžinimas peržiūrai jį nuima;
- „Automatiškai aptikta“ ir „Laukia peržiūros“ puslapyje visada rodomos su prierašu, kad tai ne
  teisinė išvada;
- įrašas su žyma „Reikalingas specialisto vertinimas“ ją išlaiko ir po patvirtinimo, jei
  specialistas jos nenuėmė redaguodamas.

## 3. Savaitinis / mėnesinis ciklas (rankinis režimas)

Pirmą žingsnį atlieka suplanuota užduotis `pp-teise-savaitine-patikra` (Claude programoje, pirmadieniais, kai programa
atidaryta). Nuo 2026-11-07 (naudotojo sprendimas „Faktai pagal patikrą, analizė po peržiūros“) ji:
- naujų dokumentų FAKTUS (pavadinimas, datos, rūšis, numeris, nuoroda į šaltinį) įrašo į `registras.json` pati, būsena
  „aptikta“ (puslapyje - „Nauja - analizė rengiama“), be santraukos, temų, aktualumo, veiksmų ir ištraukos; `saltiniai.json`
  pradžioje - patikros eilutė („ok“ / „nepavyko“), `meta.patikrinta` ir `meta.laikotarpis.iki` - patikros data;
- skelbia tik kai: abu duomenų failai neužfiksuotų pakeitimų neturi, šaka `main` ir ne priekyje `origin/main` (kitaip išsiųstų
  kito darbo commit'us), `git pull --ff-only` pavyko, `python3 .github/testai/paleisk.py PP-teise` - „GERAI“; kitaip pakeitimus
  atšaukia ir tik praneša ataskaitoje;
- commit'ina tik duomenų failus - `registras.json`, `saltiniai.json` ir nuo 2026-11-13 `registras-es.json` (5 skyrius) -
  („pp-teise: savaitinė patikra <data> - N nauji įrašai (faktai, analizė rengiama)“) ir push'ina;
- analizės projektus (santrauka, aktualumas, veiksmai, pažodinė ištrauka) rašo į `~/Documents/g-procure-teise-patikros/<data>/projektai.json`
  kartu su `ataskaita.md`. Juos peržiūri žmogus ir įkelia per admin.html „Importuoti JSON“ -> „Papildyti“: to paties id faktų
  įrašą (būsena „aptikta“) importuota analizė pakeičia, kitų esamų įrašų - ne.
Leidimai - vietinėje `.claude/settings.local.json` (programa jų užduočiai neišsaugo; be jų užduotis sustoja prie rašymo, kaip
2026-09-28 - 2026-10-26): rašyti į ataskaitų aplanką ir į du duomenų failus, tik PP-teise testai ir tik išvardytos git komandos.
Būsena „succeeded“ nereiškia, kad ataskaita įrašyta ar registras paskelbtas - tikrinkite aplanką ir `git log`.
Registro testai, tikrinantys konkrečius išanalizuotus įrašus, faktų įrašų („aptikta“) neskaičiuoja - nauji faktai jų nelaužo.

1. **Patikra.** Peržiūrėti e-tar (VPĮ, PĮ, VPT įsakymai, aplinkos ministro įsakymai dėl žaliųjų
   pirkimų), Liteko (LAT, LVAT viešųjų pirkimų bylos), e-seimas (projektų eiga). Užregistruoti
   patikrą admin.html skiltyje „Šaltinių patikra“ - ir tada, kai nieko naujo, ir tada, kai
   šaltinis nepasiekiamas (rezultatas „nepavyko“).
2. **Naujas įrašas.** „Naujas įrašas“ → užpildyti laukus iš pirminio šaltinio. Trūkstamų datų
   NEspėti - palikti tuščias. Nurodyti tikslią vietą šaltinyje, identifikatorius, režimą (PĮ / VPĮ),
   temas, susijusius modulius su šablono versija, aktualumo požymius (arba pažymėti „nenustatytas“).
   Jei poveikis neaiškus - „Reikalingas specialisto vertinimas“ su priežastimi.
   **Pažodinė ištrauka** (formos skiltis „Pagrindimas: pažodinė ištrauka“): trumpa citata iš perskaityto
   šaltinio teksto raidė į raidę ir jos tiksli vieta (straipsnis, dalis, punktas). Tai vienintelis
   „pagrindimo“ tekstas, kurį puslapis rodo kaip citatą; be jo puslapis sako, kad ištrauka nepateikta.
   Perfrazuoti ar sutrumpinti citatos negalima - santraukai skirtas laukas „Santrauka“.
   **Buvo / tapo / praktinė reikšmė** (formos skiltis „Buvo / tapo“) pildoma TIK turint abi tikras
   redakcijas: ankstesnės redakcijos tekstą, naujos redakcijos tekstą, jų datas ir šaltinio nuorodą
   (e-tar redakcijų sąrašą). Nepilnas palyginimas (tik „buvo“ arba tik „tapo“) neįrašomas ir formoje
   įspėjamas; puslapis tada sako „palyginimas neatliktas“, o nuorodą į e-tar redakcijų sąrašą vadina
   išoriniu sąrašu, ne palyginimu. 2026-11-04 registre palyginimų nėra nė vieno.
   **Veiksmai.** Laukas „Rekomenduojamas veiksmas“ rašomas pirkimų specialistui. Jei jam veiksmų nereikia - žyma
   „Naudotojui veiksmų nereikia“: įrašas į „Ką peržiūrėti?“ nepatenka. Darbas pačiam prižiūrėtojui (pvz. pridėti
   šaltinį) - atskirame lauke „Darbas registro prižiūrėtojui“, kurį mato tik administravimo aplinka.
   **Datos.** TAR paskelbimo data, registracijos numeris ir įsigaliojimas - iš e-tar akto puslapio (chronologija);
   jungtis grąžina tik priėmimo datą. Projekto įraše data ir numeris - ne projekto, o šaltinio (nutarimo), todėl
   identifikatorius rodomas pagal `projektai`, o eiga rašoma laukuose „Projekto eiga“.
   **Dokumento istorija** susidaro savaime: visi įrašai su tuo pačiu `keiciamasAktas.eTarId` rodomi
   vienas kito detalėse kaip atskiri to paties dokumento pokyčiai (dokumentas, redakcija ir pokytis -
   skirtingi objektai; vienos „bendros kortelės“ dokumentui nėra).
   **Portalo blokas** rodo iki trijų įrašų TIK pagal redakcinį prioritetą (formos skiltis
   „Portalo blokas“: prioritetas 1 - svarbiausias, trumpas pavadinimas, „kodėl aktualu“,
   kas parinko). Sistema aktualumo neskaičiuoja ir naujausių nerodo - be prioriteto blokas sako,
   kad įrašai dar neparinkti. Trumpas pavadinimas negali keisti teisinės prasmės ar nukirsti
   išlygos (pvz. „ar taikoma LITGRID, vertina teisės specialistas“ lieka paaiškinime).
3. **DI juodraštis (neprivaloma).** Įklijavus ištrauką, DI pasiūlo santrauką, „kas pasikeitė“ ir
   veiksmą; laukai pažymimi „DI juodraštis - nepatvirtinta“. Ištrauka laikoma duomenimis (instrukcijos
   joje nevykdomos), siunčiama per G-Procure serverį į Claude API; vidinės informacijos nesiųsti.
4. **Dublikatai ir prieštaravimai.** Sistema pažymi įrašus su tais pačiais identifikatoriais
   (abu lieka, antras - „galimas dublikatas“) ir įrašus apie tą patį keičiamą aktą su skirtingu
   veiksmu („galimai prieštarauja“). Administratorius sujungia arba archyvuoja, kol nesuderinta,
   naudotojui liepiama vadovautis šaltiniu.
5. **Specialisto peržiūra.** Teisės specialistas atidaro admin.html, įrašo savo vardą viršuje ir
   kiekvienam įrašui spaudžia „Patvirtinti“ su pastaba (ką tikrino). Turinį taiso „Redaguoti“.
6. **Eksportas ir commit.** Skiltyje „Registras“ patikrinti versiją ir patikros datą (siūloma šiandienos,
   pvz. `2026-10-01.1`; eksportas juos įrašo į `meta.versija`, `meta.patikrinta` ir `meta.laikotarpis.iki`), tada
   „Eksportuoti registrą (JSON)“ → failą įrašyti kaip `PP-teise/duomenys/registras.json`. Darbinė kopija iš senesnės
   registro versijos pažymima įspėjimu: eksportuoti ją reiškia perrašyti vėlesnius pakeitimus;
   „Eksportuoti šaltinių registrą su patikromis“ → `saltiniai.json`; padidinti `PP-teise/sw.js`
   `VERSIJA`; paleisti `PP-teise/testai.html`; commit `pp-teise: registras 2026-10-01.1`.
7. **Naudotojo peržiūros.** Stebėsenos puslapyje projektų vadovas pažymi „peržiūrėjau“ su
   pagrindimu - tai jo asmeninis susipažinimo žurnalas (localStorage, atsarginė kopija per
   `atsargine-kopija.html`), ne registro būsena ir ne specialisto patvirtinimas; puslapis tai
   sako prie pat veiksmo. Keturi dalykai rodomi atskirai: dokumento teisinis statusas (priimta /
   projektas / teismo išaiškinimas), paaiškinimo patvirtinimas, šaltinių patikros rezultatas ir
   darbuotojo peržiūra.

## 4. Ko modulis NEDARO

- neperrašo PP-qual ar PP-salygos šablonų ir dokumentų - tik rodo, kurį šabloną peržiūrėti;
- nerenka „teisingo“ paaiškinimo iš prieštaraujančių - tik pažymi;
- nespėja trūkstamų datų ir nerodo nepatvirtinto įrašo kaip išvados;
- nerodo „buvo / tapo“ be tikrų palyginamų redakcijų ir neskaičiuoja rizikos ar aktualumo balo -
  vietoj jo įvardija, kokių pirkimo konteksto duomenų trūksta;
- nesaugo peržiūrų ir vidinių pastabų serveryje;
- nelaiko žymos galiojančia, kai įrašas po jos pasikeitė: įrašas grįžta į „Ką peržiūrėti?“ su pastaba.

## 5. ES teisės lygmuo (nuo 2026-11-13)

Stebėsenos puslapio viršuje - perjungiklis „Nacionalinė teisė / ES teisė“. Lygmuo reiškia, **kas priėmė dokumentą**:
Lietuvos institucijos (Seimas, Vyriausybė, VPT, ministerijos, Lietuvos teismai) ar Europos Sąjungos (Parlamentas ir
Taryba, Komisija, Teisingumo Teismas). Perjungus keičiasi visas turinys - rodikliai, laiko juosta, aprėptis, filtrai,
sąrašas ir įrašas; paieškos tekstas ir režimas (PĮ / VPĮ) lieka. Adresas: `?lygmuo=es`; nuoroda `#irasas=<id>` atveria
įrašą bet kuriame lygmenyje. Paieška parodo, kiek atitikmenų yra kitame lygmenyje.

| Kas | Kur |
|---|---|
| ES teisės registras | `PP-teise/duomenys/registras-es.json` (`meta.lygmuo: "es"`, sava versija, aprėptis ir „neapima“) |
| Administravimas | `PP-teise/admin.html?lygmuo=es` (atskira darbinė kopija, eksporto failas `registras-es-<data>.json`) |
| Šaltinių patikros | `saltiniai.json` `patikros` eilutės su `"lygmuo": "es"`; eilutės be šio lauko - nacionalinės (savaitinė užduotis jų nekeičia) |
| Šaltinių patikros įrankis | `python3 PP-teise/es-saltiniai.py nauji` ir `... tekstas <CELEX>` (registro nekeičia) |

**Papildomi įrašo laukai** (nacionaliniuose įrašuose jų nėra, ir jų peržiūros žymos dėl to nepasikeitė):

- `datos.taikomaNuo` - nuo kada aktas taikomas, kai tai ne įsigaliojimo diena (pvz. vertės ribų reglamentas įsigalioja
  2025-11-12, taikomas nuo 2026-01-01). Vaizdai („Kas pasikeitė?“ / „Kas įsigalios?“), rikiavimas ir laiko juosta
  remiasi taikymo pradžia; įraše rodomos abi datos.
- `identifikatoriai.celex` ir `keiciamasAktas.celex` - CELEX numeriai (dublikatai, dokumento istorija ir prieštaravimai
  ES įrašams nustatomi pagal juos).
- `teismoDokumentas: "isvada"` - generalinio advokato išvada (ne Teismo sprendimas; įraše tai pasakoma).
- `saltinioTipas: "es_gaires"` - Europos Komisijos gairės ar komunikatas (neprivalomos; rodomos pagal paskelbimo datą).

**Savaitinė patikra (nuo 2026-11-13, naudotojo sprendimas plėsti savaitinę patikrą ES šaltiniais).** Ta pati užduotis
`pp-teise-savaitine-patikra` pirmadieniais paleidžia `python3 PP-teise/es-saltiniai.py nauji --pilnas` (dokumentai nuo 120 dienų iki
paskutinės ES registro patikros: Teisingumo Teismo sprendimus duomenų bazė su direktyvomis susieja pavėluotai) ir:

- į `registras-es.json` pati įrašo tik AIŠKIAI PIRKIMŲ dokumentų faktus (būsena „aptikta“, puslapyje - „Nauja - analizė
  rengiama“): ES teisės aktus ir Komisijos pasiūlymus, kurių pavadinime įvardyti viešieji pirkimai ar pirkimų direktyvos,
  ir Teisingumo Teismo sprendimus, nutartis bei generalinių advokatų išvadas, kurių raktiniuose žodžiuose - viešieji pirkimai
  ar direktyvos 2014/24/ES, 2014/25/ES, 89/665/EEB, 92/13/EEB; gynybos pirkimai, vien koncesijos ir keleivinio transporto
  viešosios paslaugos neįtraukiami;
- kitus dokumentus, kurie pirkimų direktyvas tik cituoja (strategijos, sektoriniai pasiūlymai), surašo ataskaitos skiltyje
  „ES: neįtraukta - sprendžia žmogus“;
- `saltiniai.json` pradžioje įrašo ir ES patikros eilutę (`"lygmuo": "es"`, „ok“ / „nepavyko“); nepavykus patikrai ES registro
  datos nekeičiamos;
- ES analizės projektus rašo į `~/Documents/g-procure-teise-patikros/<data>/projektai-es.json` - juos žmogus įkelia per
  `admin.html?lygmuo=es` („Importuoti JSON“ → „Papildyti“);
- skelbia tomis pačiomis sąlygomis kaip nacionalinius faktus (3 skyrius), commit'e - iki trijų duomenų failų.

Puslapio ES vaizde rodoma „Kita šaltinių patikra - pirmadienį, <data>“. Duomenų bazė naujus Teisingumo Teismo sprendimus su
direktyvomis susieja pavėluotai, todėl naujausių gali trūkti - puslapis tai sako skiltyje „Apie šaltinių patikrą“.

**Kaip pildyti ranka** (analizei ir tam, ko užduotis pati neįtraukė):

1. `python3 PP-teise/es-saltiniai.py nauji` (su `--pilnas` - visi pavadinimai) - ES teisės aktai, Komisijos pasiūlymai ir komunikatai, Teisingumo Teismo
   sprendimai, nutartys ir generalinių advokatų išvados, kurie cituoja pirkimų direktyvas (2014/23/ES, 2014/24/ES,
   2014/25/ES, 89/665/EEB, 92/13/EEB) ir kurių registre dar nėra. Jei patikra nepavyksta, įrankis taip ir parašo -
   tai nereiškia, kad naujų dokumentų nėra. Sąrašas nėra išsamus: naujausi Teisingumo Teismo dokumentai duomenų
   bazėje su direktyvomis susiejami ne iš karto (dažnai pirmas atsiranda pranešimas Oficialiajame leidinyje -
   CELEX su „CA“ ar „CB“; byla lyginama pagal numerį, todėl sprendimas ir pranešimas laikomi tuo pačiu dokumentu).
2. Ką įtraukti, sprendžia žmogus: registras - svarbiausių pokyčių rinkinys, ne visa ES pirkimų teisė. Neįtraukti
   dokumentai ir priežastys įrašomi patikros eilutėje (`saltiniai.json`).
3. `python3 PP-teise/es-saltiniai.py tekstas <CELEX>` - dokumento tekstas lietuvių kalba (`--trumpai` - teismo dokumento pradžia
   ir rezoliucinė dalis, kitų dokumentų pradžia). Į `istrauka.tekstas`
   rašoma tik pažodinė citata iš šio teksto, su tikslia vieta; teiginiai įraše - tik iš perskaityto teksto.
4. Įrašas kuriamas `admin.html?lygmuo=es` (arba papildomas importu), būsena „laukia“, DI parengtas tekstas -
   `aiJuodrastis: true`. Šaltinio nuoroda skaitytojui - `https://eur-lex.europa.eu/legal-content/LT/TXT/?uri=CELEX:<celex>`.
5. Eksportas → `PP-teise/duomenys/registras-es.json`; patikros eilutė su `"lygmuo": "es"` → `saltiniai.json`;
   padidinti `PP-teise/sw.js` `VERSIJA`; paleisti `PP-teise/testai.html`.

Teisingumo Teismo sprendimai, aiškinantys Direktyvą 2014/24/ES, rodomi ir PĮ režimu su žyma „Įvertinkite su teisės
specialistu“: ar ir kaip išaiškinimas taikomas perkantiesiems subjektams, įrašas neteigia.

**Techninės skiltys - tik prižiūrėtojui.** Stebėsenos puslapio poraštėje „Techninė diagnostika: šaltinių prieiga,
patikros ir sutrikimų poveikis“ ir nuorodos „Registro prižiūrėtojui ir kūrėjams“ įprastam lankytojui nerodomos.
Jos atsiranda atvėrus `PP-teise/index.html?prieziura=1` (nuoroda yra administravimo puslapyje). Tai ne apsauga -
tik mažiau triukšmo pirkimų specialistui: failai ir toliau vieši.
