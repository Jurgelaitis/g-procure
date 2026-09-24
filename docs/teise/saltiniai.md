# Pirkimų teisės stebėsena - šaltinių registras ir prieigos tyrimas

Būsena 2026-09-24. Mašininis šaltinių registras - `PP-teise/duomenys/saltiniai.json`
(jį rodo stebėsenos puslapio skiltis „Šaltinių registras ir patikrų žurnalas“). Šis dokumentas
paaiškina, KAS buvo patikrinta ir KODĖL modulis veikia rankiniu importu.

## 1. Išvada trumpai

Naršyklė (g-procure.com) prie nė vieno oficialaus šaltinio automatiškai prisijungti negali:

| Šaltinis | Kas patikrinta 2026-09-24 | Rezultatas |
|---|---|---|
| e-tar.lt (TAR) | Akto puslapis `curl -sI` | HTTP 200, **be `Access-Control-Allow-Origin`** - `fetch` iš naršyklės neįmanomas |
| e-tar.lt RSS | Spėtas RSS adresas | 404 - oficialaus RSS aprašo nerasta |
| e-seimas.lrs.lt (projektai) | `curl` | 403; turinys kraunamas JavaScript; API nerasta |
| vpt.lrv.lt naujienos | Spėtas adresas `/lt/naujienos/` | 404 |
| klausk.vpt.lt | Zendesk pagalbos centro API (`/api/v2/help_center/lt/articles/<id>.json`) | Veikia be prisijungimo iš prižiūrėtojo aplinkos (2026-09-23); CORS naršyklei nepatikrinta |
| liteko.teismai.lt | Svetainė; paieškos rezultatuose matomas `liteko-api-pub.teismas.lt/v1/decisions/<id>` | Adresas nepatikrintas |
| lat.lt | `curl` | 200; API nerasta |
| Teisora | - | **Sąmoningai nenaudojama**: duomenų bazė nekopijuojama, priklausomybė nuo prenumeratos nekuriama |

Todėl registras `PP-teise/duomenys/registras.json` pildomas **rankiniu / administratoriaus importu**,
o puslapis apie tai sako aiškiai („Automatinė patikra NEĮDIEGTA - rankinis režimas“). Nepavykusi
patikra (pvz. RSS 404) žurnale rodoma kaip nepavykusi, ne kaip „pokyčių nėra“.

## 2. Kaip surinktas pradinis registras

Prižiūrėtojo aplinkoje (Claude Code sesija) naudota **Lietuvos viešųjų duomenų jungtis** - ji
grąžina e-tar ir Liteko dokumentų tekstus pagal paiešką. Kiekvienas iš 13 įrašų:

- perskaitytas iš pirminio šaltinio (įstatymo, įsakymo, nutarimo ar nutarties teksto), ne iš
  antrinių apžvalgų;
- turi tikslią vietą šaltinyje (straipsnis, dalis, punktas arba nutarties punktai), nuorodą į
  e-tar / Liteko ir dokumento identifikatorius (akto Nr., e-tar id, versija, bylos Nr.);
- turi atskirai saugomas datas: priėmimo, paskelbimo (dažnai nenurodyta - ji NEspėjama),
  įsigaliojimo, taikymo pradžios ir aptikimo sistemoje;
- yra būsenoje „Laukia peržiūros“ - **nė vienas nepatvirtintas teisės specialisto**.

Ko šis rinkinys NEapima: TAR paskelbimo datų (jungtis grąžina priėmimo datą), įstatymų projektų
eigos Seime (e-seimas neprieinamas), VPT gairių ir rekomendacijų be įsakymo formos, ES teisės.

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
