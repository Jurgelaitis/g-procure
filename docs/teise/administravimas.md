# Pirkimų teisės stebėsena - administravimo procesas

Administravimo aplinka: `PP-teise/admin.html`. Būsena 2026-09-24.

## 1. Kas veikia ir kur gyvena duomenys

| Kas | Kur | Pastaba |
|---|---|---|
| Bendras registras | `PP-teise/duomenys/registras.json` (repozitorija) | Vienintelis tiesos šaltinis, kurį mato visi naudotojai |
| Šaltinių registras ir patikrų žurnalas | `PP-teise/duomenys/saltiniai.json` | Patikros su rezultatu „ok“ / „nepavyko“ |
| Darbinė kopija administratoriui | naršyklės `localStorage` (`ppteise.admin.registras`) | Tik toje naršyklėje; į bendrą registrą patenka per eksportą |
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
| Automatiškai aptikta | ◌ | Rasta patikros metu (šiandien - rankinio importo), turinys neperžiūrėtas | sistema / importas |
| Laukia peržiūros | ◔ | Aprašymas parengtas, bet teisės specialistas nepatvirtino | prižiūrėtojas |
| Specialisto patvirtinta | ✓ | Teisės specialistas peržiūrėjo šaltinį ir aprašymą; istorijoje - jo vardas ir pastaba | tik specialistas |
| Archyvuota | ▣ | Atšaukta, pakeista kitu įrašu ar nebeaktuali; nerodoma skiltyse, matoma archyve su priežastimi | prižiūrėtojas |

Taisyklės, kurias vykdo kodas:
- patvirtinimui privalomas vardas ir pastaba; patvirtinus nuimama žyma „AI juodraštis“;
- **patvirtinto įrašo turinio pakeitimas grąžina jį į „Laukia peržiūros“**;
- archyvavimas įrašo `pakeistas` (kada, priežastis); grąžinimas peržiūrai jį nuima;
- „Automatiškai aptikta“ ir „Laukia peržiūros“ puslapyje visada rodomos su prierašu, kad tai ne
  teisinė išvada;
- įrašas su žyma „Reikalingas specialisto vertinimas“ ją išlaiko ir po patvirtinimo, jei
  specialistas jos nenuėmė redaguodamas.

## 3. Savaitinis / mėnesinis ciklas (rankinis režimas)

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
   išoriniu sąrašu, ne palyginimu. 2026-09-24 registre palyginimų nėra nė vieno.
   **Dokumento istorija** susidaro savaime: visi įrašai su tuo pačiu `keiciamasAktas.eTarId` rodomi
   vienas kito detalėse kaip atskiri to paties dokumento pokyčiai (dokumentas, redakcija ir pokytis -
   skirtingi objektai; vienos „bendros kortelės“ dokumentui nėra).
   **Portalo blokas** rodo iki trijų įrašų TIK pagal redakcinį prioritetą (formos skiltis
   „Portalo blokas“: prioritetas 1 - svarbiausias, trumpas pavadinimas, „kodėl aktualu LITGRID“,
   kas parinko). Sistema aktualumo neskaičiuoja ir naujausių nerodo - be prioriteto blokas sako,
   kad įrašai dar neparinkti. Trumpas pavadinimas negali keisti teisinės prasmės ar nukirsti
   išlygos (pvz. „ar taikoma LITGRID, vertina teisės specialistas“ lieka paaiškinime).
3. **AI juodraštis (neprivaloma).** Įklijavus ištrauką, AI pasiūlo santrauką, „kas pasikeitė“ ir
   veiksmą; laukai pažymimi „AI juodraštis - nepatvirtinta“. Ištrauka laikoma duomenimis (instrukcijos
   joje nevykdomos), siunčiama per G-Procure serverį į Claude API; vidinės informacijos nesiųsti.
4. **Dublikatai ir prieštaravimai.** Sistema pažymi įrašus su tais pačiais identifikatoriais
   (abu lieka, antras - „galimas dublikatas“) ir įrašus apie tą patį keičiamą aktą su skirtingu
   veiksmu („galimai prieštarauja“). Administratorius sujungia arba archyvuoja, kol nesuderinta,
   naudotojui liepiama vadovautis šaltiniu.
5. **Specialisto peržiūra.** Teisės specialistas atidaro admin.html, įrašo savo vardą viršuje ir
   kiekvienam įrašui spaudžia „Patvirtinti“ su pastaba (ką tikrino). Turinį taiso „Redaguoti“.
6. **Eksportas ir commit.** „Eksportuoti registrą (JSON)“ → failą įrašyti kaip
   `PP-teise/duomenys/registras.json`, pakelti `meta.versija` (pvz. `2026-10-01.1`) ir `meta.patikrinta`;
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
- nesaugo peržiūrų ir vidinių pastabų serveryje.
