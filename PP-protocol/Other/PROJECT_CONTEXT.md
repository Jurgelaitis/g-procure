# LITGRID AB - Pirkimų Komisijos Sprendimų Centras v3

**Projekto kontekstinis dokumentas naujam darbo tęsimui**

**Versija:** v3.0
**Failo dydis:** ~716 KB / 733 575 chars (HTML/CSS/JS)
**Pagrindinis failas:** `LITGRID_Generatorius_v3.html`
**Paskutinis atnaujinimas:** 2026-06-11
**Repozitorija:** [github.com/Jurgelaitis/PP-Protocols](https://github.com/Jurgelaitis/PP-Protocols)

---

## 1. Projekto vizija

**Tikslas:** Sukurti pažangų, intuityvų ir teisiškai atitinkantį pirkimų komisijos sprendimų centrą Litgrid AB, kuris automatizuotų protokolų ir pranešimų tiekėjams generavimą, sumažintų rankinio darbo apimtį ir didintų atitiktį PSĮ (Lietuvos Respublikos pirkimų, atliekamų vandentvarkos, energetikos, transporto ar pašto paslaugų srities perkančiųjų subjektų, įstatymui) ir Litgrid AB Komisijos darbo reglamentui.

**UX filosofija - Apple OS principai:**
- Paprasta, aišku, bet kuriam vartotojui
- Vienas pagrindinis veiksmas viename žingsnyje
- Be dubliuojančių mygtukų ar veiksmų
- Vizualinė hierarchija - pagrindinis ryškiausias, antrinis paslėptas
- Aiški kalba be techninio žargono

**Ilgalaikis vystymas:** Sistema turi tapti dalimi platesnės EPSO-G grupės pirkimų skaitmenizacijos ekosistemos su galimu junginimu prie PP-Graphs, PP-Durations, VPT Eksperto ir kitų modulių.

---

## 2. Kodėl projektas buvo sukurtas

**Problema:** Litgrid AB pirkimų komisijoje protokolų ir pranešimų tiekėjams rengimas vyksta rankiniu būdu - kopijuojant Word šablonus, įvedant tuos pačius duomenis po kelis kartus, ieškant tinkamų BPS punktų ir PSĮ straipsnių nuorodų. Vienam pirkimui per 4-6 mėnesių procedūrą sugeneruojama ~30-50 dokumentų (5-14 protokolų + iki 30 pranešimų tiekėjams).

**Pirminis impulsas:** Pradėtas kaip atskiri du moduliai:
- `LITGRID_Generatorius_v2.html` - protokolų generatorius
- `LITGRID_Pranesimai_Modulis_v1.html` - pranešimų modulis

Tai sukėlė problemų: dubliuojantis duomenų įvedimas, nesinchronizacija, netvarkingumas. Sprendimas - **vienas suliedintas v3 failas** su pilna ekosistema.

**Motyvacija:**
- Sutaupyti 2-3 valandas per pirkimą (vienam protokolui + pranešimams)
- Sumažinti klaidų riziką (auto-validacija, auto-pildymas)
- Centralizuoti VPT gairių atitiktį
- Sukurti audito seką (PSĮ 103 str. - 4+ metai saugojimas)

---

## 3. Kokias problemas sprendžia

### 3.1 Rankinio darbo apimtis
**Anksčiau:** ~4-6 val. vienam pirkimui (1 protokolas + 3-5 pranešimai)
**Dabar:** ~5-10 min. - užpildyti formą, paspausti vieną mygtuką

### 3.2 Šablonų išsibarstymas
**Anksčiau:** Komisijos nariai dalinosi skirtingomis Word šablonų versijomis, atsirasdavo nesinchronizacija
**Dabar:** Vienas šaltinis - 23 unifikuoti pranešimų šablonai + 27 protokolų sekvencijos pagal pirkimo tipą

### 3.3 BPS punktų ir PSĮ straipsnių nuorodos
**Anksčiau:** Reikia atminti, kuris BPS punktas (9.24 atviram konkursui vs 14.24 skelbiamoms deryboms)
**Dabar:** Auto-parinkimas pagal pirkimo būdą per `pnBpsType()` funkciją

### 3.4 Atitiktis VPT gairėms
**Anksčiau:** Reikia rankiniu būdu peržiūrėti gaires (komisijos veiklos, vidaus kontrolės, pasiūlymų vertinimo)
**Dabar:** Sistema atspindi visus 3 VPT dokumentus + Litgrid AB Komisijos darbo reglamentą (§10 min. 4 nariai, §28 atviru vardiniu balsavimu)

### 3.5 Rizikų aklumas
**Anksčiau:** Vienintelio tiekėjo, NMK (≥30% žemiau vidurkio), trumpo motyvo rizikas reikia matyti pačiam
**Dabar:** `analyzeRisks()` automatiškai pažymi raudonas vėliavas su PSĮ nuorodomis

### 3.6 Audito seka
**Anksčiau:** Veiksmai nesekti, sunku atkurti seką pretenzijos atveju
**Dabar:** `logAudit()` registruoja kiekvieną veiksmą (atvėrimas, generavimas, pakeitimas, ištrynimas) su laiko žyma

### 3.7 Komandos koordinacija
**Anksčiau:** Pastabos rašomos atskirai Outlook'e
**Dabar:** Komentarų sistema prie kiekvieno pirkimo (`💬 Komentarai ir pastabos`)

### 3.8 Termino pratęsimas (BPS 19.3)
**Anksčiau:** Tekstas kopijuojamas rankiniu būdu, lengva pamiršti dienų skaičių
**Dabar:** Checkbox + 4/6 dienų select + auto-tekstas posėdžio sekretoriaus informavimu

---

## 4. Kokios funkcijos jau veikia

### 4.1 Pirkimų valdymas
- Naujo pirkimo wizard'as (3 žingsniai: identifikacija, pirkimo tipas, komisija)
- **8 pirkimo būdai:** atviras tarptautinis/supaprastintas, skelbiamos derybos (tarpt./supr.), neskelbiamos derybos (tarpt./supr.), DPS steigimas, DPS konkretus
- Pirkimo objektas: skaidymas į dalis su auto-PVM skaičiavimu (PVM = vertė × 1.21)
- Konfidencialių priedų žyma + auto-tekstas Protokole 1
- CPO katalogo žyma + įspėjimas dėl pagrindimo
- Skaidymo įspėjimas (PĮ 28 str.)
- Pirkimo vertės kategorija auto-derivuojama iš pirkimo tipo per `deriveValCat()`

### 4.2 Komisijos
- Min. 4 nariai (Litgrid reglamento §10) - pirmininkas (specialistas), teisininkas, iniciatorius, sekretorius
- Komisijos tipas: nuolatinė / ad hoc
- Nešališkumo deklaracijos žyma (PSĮ 23 str.)
- Balsavimo lentelė: tik UŽ/PRIEŠ (atviru vardiniu balsavimu pagal §28)
- Atskirosios nuomonės sekcija

### 4.3 Protokolų generavimas (DOCX)
**13+ protokolų tipų su pilnu SVARSTYTA + SPRENDIMAS turiniu:**
- **A1/D1/N1** - Pirkimo organizavimas (su konfidencialių priedų, CPO, skaidymo logika)
- **A2/D2/N2** - Klausimai, prašymai, atsakymai (su BPS 19.3 termino pratęsimu, 4/6 dienų pasirinkimu)
- **A3** - Susipažinimas su pasiūlymais
- **A4** - Pasiūlymų vertinimas (lentelė, eilės)
- **A5/D9** - Kvalifikacijos + NMK + laimėtojo nustatymas
- **D3, D3.1** - Susipažinimas su paraiškomis
- **D4** - Paraiškų vertinimas (kortelės formatas su veiksmais)
- **D5a, D5a1, D5a2** - Susipažinimas su pirminiais pasiūlymais
- **D6** - P.p. vertinimas + kvietimas į derybas (pilna kortelių sistema su derybų duomenimis)
- **D6.1** - Derybų protokolas (su tiekėjo parašu pagal §29)
- **D7** - Kvietimas teikti galutinius pasiūlymus
- **D7.2** - Susipažinimas su g.p.
- **D8** - Galutinių pasiūlymų vertinimas (kortelės su pasiūlymo eile)

**DOCX struktūra:** A4 (11906×16838 DXA), 2 cm paraštės, Times New Roman 11pt/10pt/12pt, LITGRID AB header'iu, puslapio numeracija footer'yje, saugojimo metaduomenys (`PSĮ 103 str.`).

### 4.4 Pranešimai tiekėjams (23 šablonai)
**Vertinimo etapas:**
- `3_aritm_klaidos` - Aritmetinių klaidų taisymas
- `4_per_didele_kaina` - Atmetimas (per didelė kaina)
- `5_pasiulymas_ok` - Pasiūlymas atitinka
- `15_nmk` - NMK pagrindimas (PSĮ 66 str.)
- `16_galiojimas` - Galiojimo pratęsimas (PSĮ 54 str.)

**Laimėtojo etapas:**
- `8_galimas_laimetojas` - Kreipimasis į galimą laimėtoją
- `8_1_kitiems_galimas` - Kitiems tiekėjams
- `9_laimetojui_kaina` - Laimėtojui (kaina) ★
- `9_1_laimetojui_ekonom` - Laimėtojui (ekonominis naudingumas)
- `10_kitiems_eile` - Kitiems (eilė) ★
- `11_kitiems_ekonom` - Kitiems (ekonominis naudingumas)
- `13_kvietimas_sutarti` - Kvietimas sudaryti sutartį ★

**Pirkimo pabaiga:**
- `12_atmetimas` - Pasiūlymo atmetimas ★
- `12_1_visi_atmesti` - Visų atmetimas
- `12_2_kitiems_pabaiga` - Kitiems (pirkimo pabaiga)

**Pretenzijos:**
- `14_pretenzija_sustabdymas` - Procedūrų sustabdymas
- `14_1_pretenzija_atm_pabaiga` - Atmetimas (pirkimo pabaiga)
- `14_2_pretenzija_atm_tesimas` - Atmetimas (tęsimas)
- `14_3_pretenzija_tenkinta` - Tenkinimas

**Kiti:**
- `0_atsakymai` - Klausimai-atsakymai + termino pratęsimas
- `1_kvietimas_pasiulymui` - Kvietimas teikti pirminį pasiūlymą
- `6_kvietimas_derybu` - Kvietimas į derybas (su data/laiku/būdu)
- `7_1_kvietimas_gp` - Kvietimas teikti galutinį pasiūlymą

**Pranešimų funkcionalumas:**
- LT arba dvikalbis LT/EN
- Auto-pildymas iš protokolo formos (klausimai/atsakymai, derybų duomenys, tiekėjai, kainos, eilė)
- Auto-parenkamas BPS punktas pagal pirkimo būdą (9.x vs 14.x)
- DOCX su A4, Times New Roman, header'iu „LITGRID AB", saugojimo žyma
- Inline modalas (be persikrovimo į kitą puslapį)

### 4.5 Apple-style „✨ Sukurti visus dokumentus"
Vienu paspaudimu:
1. Sugeneruoja protokolo DOCX
2. Auto-sukuria pranešimus iš protokolo duomenų
3. Visi failai atsisiunčiami su 300-400ms tarpais

### 4.6 Smart Dashboard
- **Statistikos kortelės:** Viso pirkimų, Vykdomi, Užbaigti, Bendra vertė, Aukšta rizika, Archyvuoti
- **Skubūs widget'as** (🔴) - raudona kortelė viršuje su pulse animacija, click → filtruoja urgent
- **Filtrai:** paieška (Ctrl+K), tipas, statusas, prioritetas, Mano pirkimai, Rodyti archyvuotus
- **Rūšiavimas:** paskutinis atvertimas, vertė (asc/desc), data (asc/desc), pavadinimas A-Z/Z-A, prioritetas
- **Smart status badge'iai:** Nepradėtas / Vykdomas X% / ✓ Užbaigtas + ⚠ Aukšta rizika

### 4.7 Pirkimo kortelėje
- Spalvinis prioritetas (kraštinė + badge): 🔴 Skubus, ⚪ Normalus, 🔵 Žemas
- Archyvuotų stilius (opacity 0.5 + dryžuotas fonas)
- 👁 Paskutinis atvertimas (relatyvus laikas: „prieš 2 val.", „vakar")
- Pažanga (3/5 protokolų)

### 4.8 Pirkimo Detail puslapis
- Gradient header su pirkimo info + rizikos žyma + archyvavimo info
- Prioriteto select tiesiog header'yje (greitas keitimas)
- 📜 Auditas (kalbos modalas), ⚠️ Rizikos panelio, 📦 Archyvuoti, 🗑 Ištrinti
- Protokolų sekvencija su statusais
- 💬 Komentarai ir pastabos kortelė (avatar, laiko žyma, ištrynimas)
- ✨ Dokumentų generavimas (Apple-style su statusų ikonomis)

### 4.9 Excel eksportas/importas
**Eksportas (📊 Excel button):** 4 lapai
- Pirkimų suvestinė (18 stulpelių)
- Protokolų statusas (kiekvienam protokolui)
- Komisijos (sudėtys, nešališkumas)
- Statistika

**Importas (💾 Kopija → 📥 Importuoti iš Excel):**
- Šablono atsisiuntimas (17 stulpelių su hint eilute + pavyzdine eilute)
- Preview modal su validacija (✅ tinkami / ❌ klaidos)
- Bulk pirkimų sukūrimas (importedFromExcel:true žyma)

### 4.10 JSON atsarginė kopija (paslėpta dropdown'e)
- Sukurti JSON kopiją (pilnas localStorage backup)
- Atkurti iš kopijos

### 4.11 Pirkimų kopijavimas iš šablono
- „📋 Kopijuoti pagal..." mygtukas
- Modal su esamų pirkimų sąrašu (archyvuoti praleidžiami)
- Auto-suggest naujo ID (`YY-PK##`)
- Deep clone su išvalymu: nauja data, švarūs protokolai, naujas CVP IS Nr.
- copiedFrom žyma auditui

### 4.12 Audito sistema
- `logAudit(action, pkId, details)` - visi veiksmai
- Globalus audito žurnalas modalas (paskutinieji 5000 įrašų, rotation)
- Per-pirkimą audito žurnalas
- Eksportas į JSON
- Veiksmų sąrašas: OPEN_EDITOR, SAVE_PROCUREMENT, GENERATE_PROTOCOL, GENERATE_NOTIF, GENERATE_ALL_DOCS, AUTO_GENERATE_NOTIF, EXPORT_DOCX, EXPORT_EXCEL, IMPORT_FROM_EXCEL, COPY_PROCUREMENT, ARCHIVE_PROCUREMENT, UNARCHIVE_PROCUREMENT, CHANGE_PRIORITY, ADD_COMMENT, DELETE_COMMENT, COPY_AI_PROMPT, OPEN_RISK_PANEL ir kt.

### 4.13 Rizikų analizė (`analyzeRisks()`)
Pagal VPT gaires:
- Vienintelis pasiūlymas (vidutinė rizika)
- NMK riba pasiekta - ≥30% žemiau vidurkio (aukšta, PSĮ 66 str.)
- Komisija < 4 narių (aukšta, Litgrid reglamento §10)
- Neskelbiamos derybos (aukšta, PSĮ 71 str.)
- Trumpas atmetimo motyvas (vidutinė)
- Konfidencialios info paviešinimas (info)

### 4.14 AI motyvavimo asistentas
- Modal su context input + sprendimo tipo select
- Generuoja Claude/ChatGPT promptą su Litgrid kontekstu, PSĮ nuorodomis
- Clipboard kopijavimas
- VPT Eksperto integracija (nuoroda)

### 4.15 Save state indikatorius
- App-bar dešinėje: 🟢 Išsaugota / 🟡 Saugoma / 🔴 Klaida / ⚪ Sinchronizuota
- Auto-fade į idle po 2.5 sek.
- Hook'as saveStore() funkcijoje

### 4.16 Klaviatūros sutrumpinimai
- `Ctrl/Cmd + K` - fokusuoti dashboard paiešką
- `Esc` - uždaryti bet kurį modalo langą

### 4.17 Brand stilius (EPSO-G Brandbook 2026)
- Šriftas: Nunito Sans (CDN: fonts.googleapis.com)
- Pagrindinė spalva: Smaragdas #00A072
- Hover: Smaragdas-120 #128A76
- Tekstas: Grafitas #2E3641
- Funkcinės: Error #DB354A, Warning #FAB03B, Cyan #00A5C4
- CSS kintamieji `:root` lygmenyje (visi `--epso-*`)

---

## 5. Kokios funkcijos planuojamos

### 5.1 Pirmas etapas (P1 - reikia per 1-2 sav.)
- **Multi-user pasiruošimas** - dabar hardcoded „Arūnas Jurgelaitis", reikia konfigūruoti per settings
- **Vartotojo profilio sekcija** - vardas, el. paštas, rolė (komisijos pirmininkas/teisininkas/iniciatorius/sekretorius)
- **„@" paminėjimai komentaruose** - autocompletu pasirinkti komisijos narį
- **Skubūs pirkimai due date** - prie prioriteto pridėti terminą su „liko 3 d." indikacija
- **Skubūs šiandien smart filter** - urgent + due_date <= šiandien

### 5.2 Antras etapas (P2 - 2-4 sav.)
- **PP-Graphs / PP-Durations integracija** - prijungti terminų skaičiuotuvą iš atskirų modulių (planavimas atskira sesija)
- **VPT Eksperto API integracija** - jei VPT teiks REST API, motyvavimo asistentas galės grąžinti rezultatą tiesiogiai (be clipboard copy-paste)
- **Komentarų filtras kalendoriuje** - laikotarpio peržiūra
- **Komentarai prie konkretaus protokolo** - ne tik prie pirkimo
- **Tagai (laisvas žymėjimas)** - „IT pirkimai", „Statybos", su spalvomis

### 5.3 Trečias etapas (P3 - 1-3 mėn.)
- **DVS Doclogix integracija** - protokolo Nr. auto-generavimas iš DVS, dokumentų sąsajos
- **CVP IS API integracija** - automatinis pranešimų išsiuntimas per CVP IS
- **PDF + elektroninis parašas** - sutarties pasirašymo automatizacija per Dokobit
- **Multi-tenancy EPSO-G grupei** - galimybė pritaikyti Amber Grid, Ignitis Grupei
- **Pirkimo plano importas** - iš Excel + susiejimas su pirkimais
- **Realaus laiko bendradarbiavimas** - WebSocket'ai, kiti komisijos nariai mato pakeitimus realiu laiku

### 5.4 Eksperimentinis etapas (P4)
- **Mobilus responsive režimas** - planšete galima peržiūrėti / komentuoti
- **Tamsus režimas** - dark mode CSS variant
- **AI generavimo asistentas** (per Claude API) - automatinis motyvavimo formuluočių generavimas
- **Šablonų versijavimas su rollback** - galimybė grįžti į ankstesnę šablono versiją
- **Skirtinguose pirkimo planuose esančių pirkimų grupavimas** - portfelio valdymas

---

## 6. Technologiniai sprendimai ir kodėl

### 6.1 Vienafailis HTML + Vanilla JS
**Sprendimas:** Visas sistemos kodas - vienas `.html` failas su inline CSS ir JS, be jokio framework'o (React, Vue, Angular).

**Kodėl:**
- **Diegimas:** Galima atidaryti tiesiog naršyklėje (file://) be web serverio
- **Offline-first:** Po pirmojo paleidimo veikia be interneto (išskyrus CDN bibliotekas)
- **Saugumas:** Litgrid AB IT politika - mažiau išorinių priklausomybių = mažiau atakos paviršiaus
- **Vystymas:** Vienas failas, lengva pridėti į GitHub, deploy per GitHub Pages
- **Karjeros ilgaamžiškumas:** Vanilla JS neprivalo „upgrade" kas 6 mėn. kaip React

**Trūkumas:** ~733 KB failo dydis ne idealus, bet ~700 KB lygmenyje veikia be problemų.

### 6.2 Naršyklės localStorage
**Sprendimas:** Visi duomenys (pirkimai, protokolai, pranešimai, audito žurnalas) saugomi `localStorage`.

**Kodėl:**
- **Greitas iteravimas:** Nereikia backend'o, server konfigūracijos, deployment'o
- **Privatumas:** Duomenys neišeina iš vartotojo įrenginio
- **Diegimas:** Bet kuris darbuotojas gali atidaryti failą savo naršyklėje

**Apribojimai:** ~5-10 MB limit'as (užtenka ~500 pirkimų), per-domeno saugykla (jei pakeičia URL - duomenys dingsta), single-device (nesinchronizuojama tarp PC ir laptop).

**localStorage raktai:**
- `litgrid_procurements_v2` - pirkimai (pagrindinis store)
- `litgrid_pranesimai_v1` - pranešimai
- `litgrid_pranesimai_audit_v1` - audito žurnalas

### 6.3 docx.js + FileSaver (inline)
**Sprendimas:** DOCX generavimo biblioteka įdėta inline į HTML (~270 KB iš ~733 KB).

**Kodėl:** Offline veikimas, jokios CDN priklausomybės pagrindinei funkcijai.

**Naudojimas:** `window.docx.Document`, `Packer.toBlob()`, `saveAs()`.

### 6.4 SheetJS per CDN
**Sprendimas:** `cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`

**Kodėl:** XLSX manipuliacija (eksportas, importas) reikalauja didelės bibliotekos (~1 MB). Per CDN cache'inama, po pirmojo paleidimo veikia greitai.

**Naudojimas:** `XLSX.utils.book_new()`, `XLSX.writeFile()`, `XLSX.read()`.

### 6.5 Google Fonts (Nunito Sans) per CDN
**Sprendimas:** `<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800">`

**Kodėl:** EPSO-G brandbook reikalauja Nunito Sans. Google Fonts CDN garantuoja prieinamumą, cache'inimą.

**Fallback:** `font-family: "Nunito Sans", Arial, sans-serif` - jei CDN nepasiekiamas, naudojamas Arial.

### 6.6 GitHub Pages deployment
**Sprendimas:** `https://jurgelaitis.github.io/PP-Protocols/LITGRID_Generatorius_v3.html`

**Kodėl:** Nemokama HTTPS hostavimas, automatinis CI/CD per `git push`, prieinamumas iš bet kurio Litgrid darbuotojo įrenginio.

### 6.7 Atskira renderProtocolDocuments funkcija
**Sprendimas:** Po kiekvieno protokolo formos rodoma „✨ Dokumentų generavimas" kortelė su Apple-style UX.

**Kodėl:** Sumažina kognityvinę apkrovą - vartotojas mato visą protokolo gyvavimo ciklą vienoje vietoje, ne navigaciją tarp puslapių.

### 6.8 Apple OS UX principai
**Sprendimas:** Vienas pagrindinis veiksmas, paslėpti pažangūs nustatymai per `<details>` element'ą.

**Kodėl:** Litgrid komisijos nariai - ne programuotojai, jiems reikia paprastos, intuityvios sąsajos.

---

## 7. Žinomi apribojimai

### 7.1 Single-user
- Vardas hardcoded'as kaip „Arūnas Jurgelaitis" (`CURRENT_USER` konstanta JS kode)
- Komentarų sistemoje visi rodomi kaip vienas autorius
- „Mano pirkimai" filtras tikrina pagal vardo dalį „Arūnas" - reikia praplėsti multi-user atvejui

### 7.2 localStorage saugykla
- ~5-10 MB limitas (užtenka ~500 pirkimų)
- Tame pačiame naršyklės profilyje (Chrome vs Firefox - atskiros)
- Išvalius cookies/cache - duomenys dingsta
- Nesinchronizuojama tarp įrenginių (rekomenduojama daryti JSON kopijas reguliariai)

### 7.3 Excel importas
- Validacijos klaidos rodomos, bet dalies eilučių importas - viskas arba nieko
- Nėra galimybės pataisyti modal'e (reikia perdaryti Excel ir bandyti iš naujo)
- Pavyzdinė eilutė (`26-PK10 / Elektros tinklo techninė priežiūra`) automatiškai praleidžiama

### 7.4 DOCX struktūra
- Times New Roman šriftas hardcoded'as (atitinka organizacijos šabloną)
- Header'is „LITGRID AB" pilkas - jei reikia logo, reikia base64 paveikslo
- Audito žyma footer'yje („Saugoma iki YYYY") - tik šablono v1.0

### 7.5 Šablonų versijavimas
- `TEMPLATE_VERSION = 'v1.0'`, `TEMPLATE_VERIFIED = '2026-05-17'`
- Jei keisis BPS punktai ar PSĮ straipsnių numeracija - reikės atnaujinti
- Rekomenduotina periodiškai (kas 6 mėn.) teisininkų peržiūra

### 7.6 Pranešimai
- Auto-generavimas naudoja default'inius duomenis - pažangus vartotojas turi galimybę koreguoti per modal'ą
- Kai kurie šablonai (`9_1_laimetojui_ekonom`, `11_kitiems_ekonom`) turi vertinimo lentelę su placeholder'iu `[LENTELĖ:vertinimo_lentele]` - reikia pildyti rankiniu būdu
- Dvikalbis LT/EN režimas naudoja paprastą vertimą (be teisingos juridinės terminologijos peržiūros)

### 7.7 Audito žurnalas
- 5000 įrašų limit'as (rotation)
- Saugomas tik tame pačiame įrenginyje
- Eksportas - JSON formatas (ne Excel)

### 7.8 Naršyklių palaikymas
- Testuota Chrome, Firefox, Safari
- Nepalaiko IE11 (CSS variables, `?.` chaining, async/await)
- Mobilus režimas - veikia, bet ne optimizuotas (formų laukai per smulkūs)

### 7.9 Spausdinimo režimas
- Nesukurtas print-friendly CSS
- DOCX failas tikslesnis spausdinimui nei naršyklės print preview

---

## 8. Prioritetų sąrašas (sekančiam darbui naujoje paskyroje)

### P0 - Privaloma prieš produkcijos plėtimą (1-2 sav.)
1. **Testavimas su 3-5 realiais pirkimais** komandos viduje - reikia surinkti realų grįžtamąjį ryšį
2. **Multi-user paruošimas:** Vartotojo profilio modal'as su vardo įvedimu, saugomu localStorage
3. **README.md atnaujinimas** GitHub repozitorijoje - kaip diegti, kaip naudoti
4. **Spausdinimo CSS** - jei reikia print preview iš naršyklės

### P1 - Per ateinantį mėnesį
5. **„@" paminėjimai komentaruose** - su autocompleted komisijos nariu
6. **Skubūs pirkimai su due date** - papildomas terminas + auto-skaičiavimas „liko X d."
7. **Pirkimo plano importas iš Excel** - su susiejimu prie sukurtų pirkimų
8. **Tagai (laisvas žymėjimas)** - papildomas dimensija prie prioriteto
9. **Komentarai prie konkretaus protokolo** - ne tik prie pirkimo

### P2 - Per 2-3 mėn.
10. **PP-Graphs / PP-Durations integracija** - jei šie moduliai egzistuoja, prijungti
11. **VPT Eksperto API integracija** - jei VPT teikia REST API
12. **DVS Doclogix integracija** - protokolo Nr. auto-generavimas
13. **CVP IS API integracija** - automatinis pranešimų išsiuntimas
14. **PDF + elektroninis parašas** per Dokobit API

### P3 - Per 6 mėn.
15. **Realaus laiko bendradarbiavimas** (WebSocket'ai)
16. **Mobilus responsive** - planšete galima peržiūrėti
17. **Tamsus režimas**
18. **AI generavimo asistentas** per Claude API (server-side, ne clipboard)
19. **Multi-tenancy EPSO-G grupei**

---

## 9. Pagrindinės kodo navigacijos nuorodos

Naudinga žinoti, kur kas yra `LITGRID_Generatorius_v3.html` faile:

### 9.1 HTML struktūra
- **Lines 1-308:** `<head>` - meta, title, CSS variables (`:root`), brand styles
- **Lines 309-450:** Top bar (app-bar) - logo, navigation, save state badge, Excel button, Kopija dropdown, Auditas, Pagalba
- **Lines 451-650:** Dashboard puslapis (pirkimų sąrašas)
- **Lines 651-1000:** Naujo pirkimo wizard (3 step'ai)
- **Lines 1001-1200:** Pirkimo detail puslapis + komentarai
- **Lines 1201-2000:** Protokolų formos (`buildForm_Proto1`, `buildForm_ProtoA4`, `buildForm_ProtoD6` ir kt.)
- **Lines 2000-2300:** `buildAgendaRows` funkcija (DOCX generavimas - SVARSTYTA + SPRENDIMAS)
- **Lines 2400-2900:** Modalai (Globalus auditas, Risk panel, Help, Copy modal, Backup menu)
- **Lines 2900-4500:** JS funkcijos

### 9.2 JS funkcijų katalogas
- **Pirkimų valdymas:** `getProcurement`, `saveProcurementData`, `deleteProc`, `getProcurements`, `saveStore`
- **Dashboard:** `renderDashboard`, `rerenderPkList`, `openProcurement`, `dashFilter`
- **Detail:** `renderDetail`, `openProtocol`, `buildProtoForm`, `renderProtocolDocuments`, `generateAllDocuments`
- **Wizard:** `newPkStep1/2/3`, `saveProcurement`, `addMember`, `addNewPart`
- **Protokolo DOCX:** `generateCurrentProtocol`, `buildDocx`, `buildAgendaRows`
- **Pranešimai:** `PN_TEMPLATES` (objektas), `autoGenerateNotification`, `openInlinePnGenerator`, `buildInlinePnNotifs`, `exportPnDocx`
- **Šablonai:** `PROTOCOL_NOTIFICATIONS` (mapping), `getProtocolNotifications`
- **Excel:** `exportToExcel`, `downloadImportTemplate`, `importFromExcel`, `validateImportRow`, `confirmImport`
- **JSON:** `exportData`, `importData`
- **Kopijavimas:** `openCopyModal`, `confirmCopy`
- **Archyvavimas:** `toggleArchive`
- **Komentarai:** `addComment`, `deleteComment`, `renderComments`
- **Audito:** `logAudit`, `getAuditLog`, `renderAuditTo`, `exportAuditLog`
- **Rizikos:** `analyzeRisks`, `calcRiskLevel`, `openRiskPanel`
- **AI:** `openAiAssistant`, `copyAiPrompt`
- **Termino skaičiavimas:** `getEaster`, `isPnHoliday`, `isPnWorkday`, `pnAddWorkdays`, `getAtidejimoTerminas`
- **Save state:** `setSaveState`
- **Helper:** `fmtRelativeTime`, `pnFmtDate`, `pnMoney`, `pnEscapeHtml`, `deriveValCat`, `typeLabel`, `getSequence`

### 9.3 Svarbūs konstantos
- `STORE_KEY = 'litgrid_procurements_v2'`
- `NOTIF_KEY = 'litgrid_pranesimai_v1'`
- `AUDIT_KEY = 'litgrid_pranesimai_audit_v1'`
- `TEMPLATE_VERSION = 'v1.0'`
- `TEMPLATE_VERIFIED = '2026-05-17'`
- `CURRENT_USER = 'Arūnas Jurgelaitis'`

### 9.4 CSS klasių katalogas
- **App bar:** `.app-bar`, `.logo`, `.breadcrumb`
- **Pirkimo kortelė:** `.pk-card`, `.pk-badge`, `.pk-info`, `.pk-progress`
- **Kortelė:** `.card`, `.card-header`, `.card-body`
- **Mygtukai:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`
- **Formos:** `.form-grid`, `.fg`, `.chk-row`, `.radio-row`
- **Tiekėjų lentelė:** `.tiekojai-table`
- **EPSO-G:** `.epso-modal`, `.epso-fg`, `.epso-table`, `.epso-badge`
- **Pranešimai:** `.preview-doc`, `.notification-item`, `.audit-log`
- **Statusai:** `.epso-badge--ready`, `.epso-badge--draft`, `.risk-flag--high`

### 9.5 Naudingi shell komandai testavimui
```bash
# Lokalus testavimas
open LITGRID_Generatorius_v3.html

# JS sintaksės patikrinimas
node --check <(grep -A 999999 'DATA LAYER' LITGRID_Generatorius_v3.html | head -n -2)

# Em dash patikra (turi būti 0)
grep -c '—' LITGRID_Generatorius_v3.html

# Dydis
wc -c LITGRID_Generatorius_v3.html
```

---

## 10. Susiję dokumentai (jau parengti)

Repozitorijoje arba aplanke randami šie kontekstiniai dokumentai:

1. **`LITGRID_Protokolo_Tobulinimo_Rekomendacijos_v1.md`** (18 KB) - VPT gairių analizė + 41 rekomendacija trimis prioritetais (P1/P2/P3) protokolo logikos tobulinimui
2. **`INTEGRACIJOS_INSTRUKCIJA.md`** (3.5 KB) - 3 variantai (A, B, C) atskirų modulių sujungimui (jau įgyvendinta - variantas C)
3. **`LITGRID_Pranesimai_Modulis_v1.html`** (106 KB) - **archyvinis** atskiras pranešimų modulis (jau integruotas į v3, palieti backup'ui)

**Pradinė medžiaga (uploads/):**
- `Notes 2.pdf` - vartotojo pastabos dėl D6 protokolo, pranešimų integravimo
- `Notes 4.pdf` - pastabos dėl vertės kategorijos, DPS, konfidencialių priedų, BPS 19.3
- `pavyzdys.pdf` - Litgrid AB Komisijos darbo reglamentas
- `Atviri protokolai.zip` - 6 atviro konkurso protokolų pavyzdžiai
- `Derybu protokolai.zip` - 14 skelbiamų derybų protokolų pavyzdžiai
- `0. Atsakymai į klausimus ir termino pratęsimas.pdf` - pranešimo šablono pavyzdys
- `Pranesimai pdf.zip` - 30 pranešimų tiekėjams šablonų

---

## 11. Naudinga žinoti iš ankstesnių sesijų

### 11.1 Vartotojo asmuo
- **Vardas:** Arūnas Jurgelaitis
- **El. paštas:** arunas.jurgelaitis@gmail.com (asmeninė) - keičia į darbo paskyrą
- **Pareigos:** Head of Procurement, Litgrid AB, Vilnius
- **Projektai:** VPT Ekspertas, PP-Protocols (šis), PP-Graphs, PP-Durations, PP-Report

### 11.2 Stilistinės pasirinktys
- **Apple-style** - pagrindinis principas
- **Vienas pagrindinis veiksmas** vietoj kelių „Generuoti"
- **Be techninio žargono** - „Juodraštis" → „Bus sukurtas"
- **Be em dash'ų** (—) - tik paprasti brūkšneliai (-)
- **Lietuviška daugiskaita** - 1 pirkimas / 2 pirkimai / 5 pirkimų

### 11.3 Vystymo metodologija
- **Per chunks** - kiekvienam pokyčiui atskiras Edit/Python skriptas (failas per didelis Read tool'ui)
- **Po kiekvieno pakeitimo:** JS sintaksės patikra + įdiegimas į `General/`
- **Audito JSON eksportas** - galima pasidaryti backup'us reguliariai
- **GitHub commit** po didesnių pakeitimų

### 11.4 Komandos prioritetai
- **Pažanga > tobulumas** - geriau paleisti į testavimą su 80% tobulumu nei laukti 100%
- **Komandos atsiliepimai** kiekvienam etapui prieš pereinant į kitą
- **PĮ atitiktis** > UX patogumas (ten kur konfliktuoja)

---

## 12. Kontaktas pradedant darbą naujoje paskyroje

**Pradiniai žingsniai naujoje Claude paskyroje:**

1. **Įkelti šiuos failus:**
   - `LITGRID_Generatorius_v3.html` (pagrindinis)
   - `PROJECT_CONTEXT.md` (šis failas)
   - `LITGRID_Protokolo_Tobulinimo_Rekomendacijos_v1.md` (rekomendacijos)

2. **Pirmas prompt'as naujam Claude:**
   ```
   Sveiki, tęsiu darbą su LITGRID Pirkimų Komisijos Sprendimų Centro v3 sistema. 
   Pridėjau du dokumentus: pagrindinį HTML failą (~733 KB) ir PROJECT_CONTEXT.md 
   su pilnu projekto kontekstu.
   
   Prašau perskaityti PROJECT_CONTEXT.md ir patvirtinti, kad supratote 
   projekto būklę, technologinius sprendimus ir prioritetus. 
   Tada galėsime tęsti su [P1/P2 prioritetu].
   ```

3. **Failo dydžio iššūkis:** HTML failas per didelis `Read` tool'ui. Naudoti Python skriptus per Bash + targeted `Edit` operacijas su unikaliais anchor'iais.

4. **localStorage migracija:** Kai pereinate į naują darbo profilį - eksportuokite JSON kopiją iš dabartinio Chrome ir importuokite naujame profilyje.

---

**Sėkmės tęsiant darbą! 🚀**

*Šis dokumentas pasirengtas perduoti projekto kontekstą tarp paskyrų. Sistema gyvai vystoma, todėl dokumentas turi būti atnaujinamas kas reikšmingą etapą.*
