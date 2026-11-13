# Pirkimų teisės stebėsena - šaltinių registras ir prieigos tyrimas

Būsena 2026-11-13 (ES šaltiniai - 5 skyrius; nacionaliniai - 2026-11-04). Mašininis šaltinių registras - `PP-teise/duomenys/saltiniai.json`
(jį rodo stebėsenos puslapio skiltis „Šaltinių registras ir patikrų žurnalas“). Šis dokumentas
paaiškina, KAS buvo patikrinta ir KODĖL modulis veikia rankiniu importu.

## 1. Išvada trumpai

Naršyklė (g-procure.com) prie nė vieno oficialaus šaltinio automatiškai prisijungti negali:

| Šaltinis | Kas patikrinta 2026-11-04 | Rezultatas |
|---|---|---|
| e-tar.lt (TAR) | Akto puslapis `curl -sI` | HTTP 200, **be `Access-Control-Allow-Origin`** - `fetch` iš naršyklės neįmanomas |
| e-tar.lt RSS | Spėtas RSS adresas (2026-09-24) | 404 - oficialaus RSS aprašo nerasta |
| e-seimas.lrs.lt (projektai) | `curl` | 403; turinys kraunamas JavaScript; API nerasta |
| vpt.lrv.lt naujienos | `https://vpt.lrv.lt/lt/naujienos-3/` | HTTP 200, **be `Access-Control-Allow-Origin`**; spėtas `/lt/naujienos/` - 404 |
| klausk.vpt.lt | Zendesk pagalbos centro API (`/api/v2/help_center/lt/articles/<id>.json`) | Veikia be prisijungimo iš prižiūrėtojo aplinkos (2026-09-23); CORS naršyklei nepatikrinta |
| liteko.teismai.lt | Svetainė HTTP 200, be CORS antraštės; paieškos rezultatuose matomas `liteko-api-pub.teismas.lt/v1/decisions/<id>` | Adresas nepatikrintas |
| lat.lt | `curl` | 200; API nerasta |
| Teisora | - | **Sąmoningai nenaudojama**: duomenų bazė nekopijuojama, priklausomybė nuo prenumeratos nekuriama |

Todėl registras `PP-teise/duomenys/registras.json` pildomas **rankiniu / administratoriaus importu**,
o puslapis apie tai sako aiškiai („Automatinė patikra NEĮDIEGTA - rankinis režimas“). Nepavykusi
patikra (pvz. e-seimas 403) žurnale rodoma kaip nepavykusi, ne kaip „pokyčių nėra“.

## 2. Kaip surinktas pradinis registras

Prižiūrėtojo aplinkoje (Claude Code sesija) naudota **Lietuvos viešųjų duomenų jungtis** - ji
grąžina e-tar ir Liteko dokumentų tekstus pagal paiešką. Kiekvienas įrašas:

- perskaitytas iš pirminio šaltinio (įstatymo, įsakymo, nutarimo ar nutarties teksto), ne iš
  antrinių apžvalgų;
- turi tikslią vietą šaltinyje (straipsnis, dalis, punktas arba nutarties punktai), nuorodą į
  e-tar / Liteko ir dokumento identifikatorius (akto Nr., e-tar id, versija, bylos Nr.);
- turi atskirai saugomas datas: priėmimo, paskelbimo TAR (iš e-tar puslapio, trūkstama NEspėjama),
  įsigaliojimo, taikymo pradžios ir aptikimo sistemoje;
- yra būsenoje „Laukia peržiūros“ - **nė vienas nepatvirtintas teisės specialisto**.

Ko šis rinkinys NEapima: visų pirkimus liečiančių teisės aktų (registras - parinkti įrašai, puslapis tai
sako), įstatymų projektų eigos Seime po programos patvirtinimo (e-seimas neprieinamas, eiga - iš Seimo
programos e-tar), VPT gairių ir rekomendacijų be įsakymo formos, ES teisės.

## 3. Sąlygos, licencijos, ribos

- **e-tar**: oficialus teisės aktų skelbimas. Pakartotinio naudojimo sąlygos e-tar puslapyje
  NEPATIKRINTOS, todėl registre saugomos tik nuorodos, identifikatoriai ir savas aprašymas -
  aktų tekstai nekopijuojami.
- **Liteko**: tas pats principas - bylos numeris, nuoroda, savas aprašymas, nutarties punktų numeriai.
- **VPT**: Zendesk API ribos nežinomos; masinis duomenų gavimas nedaromas.
- **Bet kuris šaltinis**: masinis parsisiuntimas neprezumuojamas ir neįgyvendintas.

## 4. Ką reikėtų, kad patikra taptų automatinė

1. Tarpinis serveris (Hetzner backend, ne repozitorijoje) su maršrutu `/api/teise/patikra` - kontraktas
   `docs/teise/diegimas.md`. Jis galėtų tikrinti e-tar paieškos puslapius ar klausk.vpt.lt API, dėti
   dublikatų ir versijų kontrolę, kartojimą su pauzėmis.
2. Sutartos naudojimo sąlygos su šaltiniais (e-tar, VPT) - iki tol tik rankinis režimas.
3. Kiekvienas automatiškai aptiktas įrašas vis tiek gauna būseną „Automatiškai aptikta“ ir
   laukia specialisto - automatika **nekeičia** tvirtinimo proceso.

## 5. ES teisės šaltiniai (2026-11-13)

| Šaltinis | Kas patikrinta 2026-11-13 | Rezultatas |
|---|---|---|
| EUR-Lex (`eur-lex.europa.eu`) | Dokumento puslapis automatine užklausa | HTTP 202 be turinio - automatinėms užklausoms puslapiai neatiduodami; skaitytojui nuoroda veikia naršyklėje |
| ES leidinių biuro saugykla (`publications.europa.eu/resource/celex/<CELEX>`) | Užklausa su `Accept: application/xhtml+xml,text/html` ir `Accept-Language: lit` | Dokumento tekstas lietuvių kalba; HTTP 300 - dokumentas iš kelių dalių (dalys `.../DOC_n`) |
| ES leidinių biuro SPARQL sąsaja (`publications.europa.eu/webapi/rdf/sparql`) | Užklausa: dokumentai, cituojantys pirkimų direktyvas, nuo nurodytos datos | Veikia be rakto; Teisingumo Teismo sprendimai su direktyvomis susiejami pavėluotai, pranešimai Oficialiajame leidinyje (CELEX „CA“, „CB“) - anksčiau |
| CURIA (`curia.europa.eu`) | Netikrinta | Sprendimų tekstai imami iš leidinių biuro saugyklos pagal CELEX |

Naršyklei (CORS) šie šaltiniai netikrinti - ES registras, kaip ir nacionalinis, pildomas prižiūrėtojo:
`PP-teise/es-saltiniai.py` (tik Python standartinė biblioteka, registro nekeičia) parodo naujus dokumentus ir
atiduoda dokumento tekstą ištraukoms. Nuo 2026-11-13 jį kas pirmadienį paleidžia savaitinė užduotis
(`pp-teise-savaitine-patikra`): aiškiai pirkimų dokumentų faktus į ES registrą ji įrašo pati, kitus surašo ataskaitoje
(`docs/teise/administravimas.md`, 5 skyrius). Pasiūlymų svarstymo eiga Europos Parlamente ir Taryboje netikrinama.
