# Pirkimų teisės stebėsena - diegimas, kaštai, priėmimo testai

Būsena 2026-09-24.

## 1. Kas diegiama

Modulis - statiniai failai, be build žingsnio, diegiami kartu su visa svetaine (GitHub Pages,
`g-procure.com`):

| Failas | Paskirtis |
|---|---|
| `PP-teise/index.html` | Stebėsenos puslapis (tvarka nuo 2026-09-25, antra pertvarka): tamsi modulio antraštė kaip kituose moduliuose su sąžiningumo skydeliu ir išskleidžiama „Apie šaltinių patikrą“; trys klausimų KPI kortelės su skaičiais (kas pasikeitė / kas įsigalios / ką peržiūrėti), po jomis „Trūksta duomenų“, „Archyvas“ ir pranešimai; viena darbo sritis - įrankių juosta (paieška, tema, susijęs įrankis, „Daugiau filtrų“, neprivalomas „Mano pirkimas“), sąrašas kairėje (~36 %) ir pasirinkto įrašo detalės dešinėje (A-G: antraštė ir statusai, pokyčio esmė, kam aktualu, nuo kada taikoma, ką peržiūrėti, pagrindimas ir šaltiniai su pažodine ištrauka, sutraukti rekvizitai); pasirinkimas adrese `#irasas=id`, filtrai adreso parametruose; telefone sąrašas, tada detalės su „Grįžti į pokyčius“; skaitymo vaizdas ilgiems įrašams; techninė diagnostika poraštėje |
| `PP-teise/admin.html` | Administravimas (vietinis režimas, be serverio autorizacijos) |
| `PP-teise/sw.js` | Veikimas be interneto: modulis, bendri failai ir abu duomenų failai talpykloje; iš talpyklos atsakymai žymimi `X-GP-Offline` |
| `PP-teise/duomenys/registras.json` | Bendras įrašų registras (žinių rinkinys su versija, aprėptimi, patikros data) |
| `PP-teise/duomenys/saltiniai.json` | Šaltinių registras ir patikrų žurnalas |
| `PP-teise/testai.html`, `PP-teise/testai-registras.json` | Priėmimo ir regresijos testai su testiniu registru (pažymėtas demonstraciniu, į talpyklą nesaugomas) |
| `shared/teise-stebesena.js` | Branduolys: schema, tikrinimas, skiltys, aktualumas, paieška, žurnalas, įkėlimas, portalo ir modulių blokai |
| `index.html` (portalas) | Vienas viso pločio blokas „Pirkimų teisės stebėsena“ PO 12 įrankių katalogo, prieš tiekėjų dalį (iki trijų įrašų pagal redakcinį prioritetą, mygtukas „Atverti stebėseną“); atskiros katalogo kortelės modulis neturi |
| `PP-qual/PP-QUAL.html`, `PP-salygos/PP-SALYGOS.html` | Kontekstiniai blokai su to modulio įrašais |

Diegimo žingsniai: commit → push į `main` → GitHub Pages išdeda per ~1 min → atidaryti
`https://g-procure.com/PP-teise/testai.html` ir įsitikinti, kad visi testai žali. Po registro ar
kodo pakeitimo **padidinti `sw.js` `VERSIJA`** - kitaip anksčiau apsilankę naudotojai be interneto
matys seną rinkinį (su internetu jie visada gauna naujausią: savi failai - „tinklas pirmiausia“).

Puslapis į `sitemap.xml` neįtrauktas sąmoningai (organizatorių įrankis; žr. atvirą klausimą dėl
vidinių įrankių indeksavimo). `admin.html` turi `noindex`.

## 2. Tarpinio serverio kontraktas automatinei patikrai (NEĮDIEGTA, NEIŠBANDYTA)

Backend gyvena ne repozitorijoje (Hetzner, `/var/www/g-procure/index.js`, Express, pm2), o šiame
Mac'e nėra Node, todėl maršrutas tik aprašytas. Kai bus diegiamas:

```
GET https://api.g-procure.com/api/teise/patikra
Atsakymas 200 JSON:
{
  "ok": true | false,                 // false - patikra NEPAVYKO (bent vienas šaltinis neatsakė)
  "data": "2026-10-01",
  "saltiniai": ["e-tar", "vpt"],      // ką bandyta tikrinti
  "nauji": 2,                         // naujų, registre dar nesančių dokumentų skaičius
  "irasai": [ { ...įrašas registro schema, "busena": "aptikta" } ],
  "pastaba": "e-seimas neatsakė (403)"
}
```

Reikalavimai serveriui: `require('dotenv').config()` PIRMAS (žr. CLAUDE.md 6 sk.); užklausų
kartojimas su pauze (1 s / 2 s / 4 s); dublikatų kontrolė pagal e-tar id ir versiją; jokių
paslapčių naršyklės kode; atsakymas visada JSON, net nesėkmės atveju. `admin.html` mygtukas
„Paleisti automatinę patikrą“ jau moka tokį atsakymą priimti: `ok:false` ar tinklo klaida
užregistruojama kaip NEPAVYKUSI patikra. Įjungimas - `saltiniai.json` laukas
`automatinePatikra: { "idiegta": true, "adresas": "https://api.g-procure.com/api/teise/patikra" }`.

Serverinė administravimo autorizacija (kas gali tvirtinti) - taip pat neįgyvendinta; ją reikėtų
daryti tame pačiame backend'e (pvz. Cloudflare Access prieš `/PP-teise/admin.html` ir rašymo
maršrutą), o iki tol tvirtinimo įrodymas yra commit'as į repozitoriją.

## 3. Kaštai

| Dalis | Kaštas |
|---|---|
| Infrastruktūra | 0 EUR papildomai - statiniai failai GitHub Pages; be mokamos teisinės DB, be privalomo AI |
| AI juodraščiai (neprivaloma) | Claude API per esamą proxy; vienas juodraštis - viena užklausa iki ~5 000 žodžių įvesties; naudojamas tik administratoriaus, ne naudotojų |
| Rankinė patikra | apytikriai 30-60 min. per savaitę prižiūrėtojui (e-tar, Liteko, e-seimas peržiūra ir įrašų pildymas) |
| Teisės specialisto peržiūra | priklauso nuo įrašų skaičiaus; pradiniam rinkiniui - 13 įrašų |
| Automatinė patikra (ateityje) | Hetzner backend maršruto kūrimas ir priežiūra; šaltinių naudojimo sąlygų suderinimas |

## 4. Priėmimo testai (užduoties 11 punktas) - kur tikrinama

Visi - `PP-teise/testai.html` (75 testai), testinis registras `testai-registras.json`. Puslapio testai laukia
`<html data-busena="ikelta|klaida">` (ne teksto), o kiekvienas pradeda nuo žinomos būsenos (vaizdas „Kas pasikeitė?“,
be filtrų, be `#irasas`).

| Scenarijus | Testas |
|---|---|
| Įrašo pasirinkimas keičia tik detales | „Pasirinkimas keičia TIK detales: sąrašo elementai ir jo slinktis išlieka, adresas gauna #irasas=, pranešama gyvoje srityje, fokusas neperkeliamas“ |
| Naršyklės istorija ir gilios nuorodos | „Naršyklės Atgal / Pirmyn vaikšto tarp pasirinktų įrašų“, „?modulis=, ?vaizdas= ir ?q= atkuria filtrus; gili nuoroda į VPĮ įrašą perjungia režimą ir vaizdą...“ |
| Filtras pašalina pasirinktą įrašą / tušti rezultatai | „Filtras pašalina pasirinktą įrašą: pasirinkimas AIŠKIAI pakeičiamas su pranešimu...“, „Filtrai išlieka perjungiant vaizdus...; tuščias sąrašas -> tuščia detalių būsena, senos detalės nelieka“ |
| Ilgi pavadinimai | „Ilgi pavadinimai laužomi, ne kerpami ir neišlenda (sąraše ir detalėse)“ |
| Susipažinimo žymos išlikimas | „„Ką peržiūrėti?“: ... žyma išlieka perjungus įrašą ir netampa patvirtinimu“ |
| Buvo / tapo tik su tikromis redakcijomis | „Ištrauka priimama tik su tekstu; palyginimas - tik su buvo IR tapo“, „Detalės A-G: ... pagrindimas su citata“ (sąžiningas tekstas, kai palyginimo nėra), „Pažodinės ištraukos: 12 iš 13 įrašų...“ |
| Telefono kelias | „Telefone (390 px): tik sąrašas be pasirinkimo; pasirinkus - detalės su „Grįžti į pokyčius“, fokusas antraštėje, #irasas adrese; grįžus - sąrašas, slinktis ir fokusas atkurti; Atgal veikia taip pat“ |
| Būsimas įsigaliojimas | „Būsimas įsigaliojimas rodomas skiltyje Kas įsigalios? su dienų skaičiumi ir pereinamosiomis nuostatomis“ |
| Pereinamosios nuostatos | tas pats + „Planuojama skelbti iki įsigaliojimo -> galimai su nuoroda į pereinamąsias nuostatas“ |
| Projektas | „Projektas visada projektas“, „Projektas dėl kaštų ir naudos analizės...“ |
| Atšauktas / pakeistas dokumentas | „Atšauktas (pakeistas) įrašas nerodomas skiltyse; su vėliavėle - archyve su priežastimi“ |
| Dublikatas | „Dublikatas pagal identifikatorius pažymimas (abu lieka)“, „Dublikatų pora...“ |
| Trūkstama data | „Trūkstamos datos lieka null...“, „Trūkstama įsigaliojimo data -> vaizdas „Trūksta duomenų“ (ne „Kita“), detalėse matomas įspėjimas ir „nenurodyta“, data nespėjama“ |
| Nepasiekiamas šaltinis | „Tinklo klaida -> ok:false“, „Nepavykęs įkėlimas: klaida su NĖRA ženklas, kad pokyčių nėra“, „Rankinė patikra... nepavykusi rodoma raudonai“ |
| Prieštaraujantys paaiškinimai | „Prieštaraujantys paaiškinimai apie tą patį aktą pažymimi abipusiai“ (branduolys ir puslapis) |
| Nepatvirtinta santrauka | „Nepatvirtinta AI santrauka pažymėta...“, admin „Patvirtinimas... AI žyma nuimta“ |
| Pasenęs rinkinys be interneto | „Rinkinys senas po 45 d.“, „Senas rinkinys: įspėjimas...“, „Atsakymas iš talpyklos (X-GP-Offline) pažymimas offline“ |
| Neteisinga modulio nuoroda | „Neteisinga modulio nuoroda atmetama ir pažymima“, „Susiję moduliai rodo į egzistuojančius puslapius (HTTP 200)“ |
| Neteisėta prieiga prie vidinių įrašų | „Rodo įspėjimą, kad serverio autorizacijos nėra“, „Eksportas: be peržiūrų žurnalo... be vidinių laukų“, žurnalo testas su netikra saugykla |
| Prieinamumas ir telefonas | grupė „Prieinamumas, klaviatūra, kontrastas, telefono kelias, pločiai“ (etiketės, semantinės antraštės, pasirinktas įrašas - aria-current + apvadas + fonas, būsenos ne vien spalva, kontrastas >= 4,5:1, tab'ai rodyklėmis, sąraše rodyklės aukštyn / žemyn ir Home / End, 1440 / 1024 px dvi sritys, 768 / 390 px viena kolona, niekur horizontalaus slinkimo; portalo katalogas 3 / 3 / 2 / 1 stulpeliai) |
| Nesėkminga patikra ne „pokyčių nėra“ | „Įkeliamas: ... patikrų būsena rodo neįdiegta ir nepavykusią“, portalo bloko klaidos testas |
| Demonstraciniai duomenys ne kaip tikros naujienos | „Demonstracinis įrašas pažymėtas DEMONSTRACINIS“, portalo blokas demo nerodo, tikrame registre demo = 0 |
