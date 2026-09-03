# Architektūra - G-Procure Tiekėjams (MVP)

Būsena: 2026-09-02. Modulis: `PP-tiekejams/`. Vieša sekcija, atskirta nuo 12 vidinių modulių.

## Sprendimas vienu sakiniu

Viskas, ką galima padaryti naršyklėje, daroma naršyklėje; serveris naudojamas tik AI kvietimui (raktas serveryje), o gyvos CVP IS jungties MVP neturi ir jos neimituoja.

## Sluoksniai

```
Naudotojas
   |  CVP IS nuoroda / ID           oficialus ZIP (atsisiųstas iš CVP IS)
   v                                 v
cvpis.js (nuorodos, resolve,      dokumentai.js (ZIP/PDF/DOCX/XLSX/XML/HTML/TXT
 terminai Europe/Vilnius)           -> blokai su vieta -> fragmentai + SHA-256)
                                     |
                                     v
                                paieska.js (tikslūs raktai + BM25, tik šio pirkimo fragmentai)
                                     |
                                     v
                                asistentas.js (promptas su [[ID | dok | vieta]] fragmentais)
                                     |
                                     v  tik parinkti fragmentai + klausimas
                     shared/ai-proxy.js -> api.g-procure.com/api/analyze   (numatyta)
                     ARBA worker/tiekejams-proxy.js (serveris konstruoja promptą, Turnstile)
                                     |
                                     v  JSON
                                asistentas.js validuok*: citatos tikrinamos fragmentuose,
                                netikros atmetamos, "be šaltinio - nera_saltinio"
                                     |
                                     v
                                index.html: 7 dalių atsakymas, kontrolinis sąrašas,
                                klausimo projektas, redakcijų pokyčiai, grįžtamasis ryšys
```

Bendrieji klausimai eina be AI: `zinios.js` žinių bazė (šaltinių registras + 12 temų LT/EN) ir paprasta paieška.

## Frontend

- Be build žingsnio; `index.html` + 5 `.js` sluoksniai (kiekvienas - IIFE su `window.GP_*`), CSS pagal `shared/epso-g.css` žetonus ir `docs/EPSO-G_HTML_stiliaus_gaires.md`.
- Bibliotekos iš CDN (jau naudojamos repo): pdf.js 3.11.174, mammoth 1.8.0, xlsx 0.18.5, jszip 3.10.1. Informacinis skydelis - `../PP-esg/components/gprocure-info-panel.js` (vienas failas, ne inline kopija).
- LT/EN per `data-i18n` žodyną (PP-carbon konvencija), `pptiekejams.lang` localStorage.
- Trys darbo lango zonos: santrauka ir būsena, klausimas, dokumentai/šaltiniai; mobiliame vaizde stulpeliai suguldomi, šaltiniai lieka po atsakymu.
- Prieinamumas: skip-link, fokusai, `aria-live` atsakymams, modalas su Esc, įkėlimo zona valdoma klaviatūra, be horizontalaus slinkimo (testas).

## Dokumentų apdorojimas (`dokumentai.js`)

- Formatai: PDF (tekstas pagal Y/X koordinates puslapiais; skenuoti PDF pažymimi „be teksto sluoksnio, reikia OCR" - OCR MVP nėra), DOCX (word/document.xml: pastraipos ir lentelių eilutės kaip atskiri blokai; mammoth atsarginis), XLSX (lapas + eilutė), XML (elementų tekstai su keliu, tinka EBVPD), HTML, TXT/CSV/MD, ZIP (įdėtiniai iki 2 lygių).
- Saugumo ribos: failas iki 60 MB, išskleista iki 250 MB, iki 200 failų - tikrinama IŠSKLEIDŽIANT srautu (antraštės `uncompressedSize` tik išankstinė patikra, nes ją galima suklastoti); DOCX/XLSX vidinių konteinerių suma tikrinama prieš skaitant; zip slip - tik `..` kaip kelio segmentas (ne „Priedas Nr. 1..pdf"), tikrinamas ir `unsafeOriginalName`; vykdomieji failai neatidaromi; `__MACOSX` ir paslėpti failai praleidžiami; LT vardai be UTF-8 vėliavėlės dekoduojami windows-1257; pdf.js su `isEvalSupported:false`.
- Kiekvienas dokumentas: `parseStatus` (parsed / partial / failed / unsupported), įspėjimai, SHA-256, kalba, rūšis (SPS/BPS/TS/EBVPD/Paaiškinimas...), versijos požymiai iš pavadinimo (AKTUALI REDAKCIJA, data, paaiškinimas, pratęsimas).
- Komplektiškumas: complete / partial / failed - rodomas ir įtraukiamas į promptą, kad modelis nevadintų rinkinio pilnu.
- Fragmentai ~180 žodžių su 30 žodžių perdanga, punkto numeris iš pastraipos pradžios, vieta (psl. / pastr. / lentelė, eil. / lapas, eil. / xpath).

## Paieška (`paieska.js`)

- Tikslūs raktai: punktų numeriai (4.2, 12.3.1), skaičiai su vienetais, santrumpos didžiosiomis (EBVPD, BVPŽ), BVPŽ kodai - stiprus priedas prie balo.
- BM25 su LT diakritikų suliejimu ir grubiu kamienu; stop-žodžiai LT/EN.
- Filtrai: docIds, kalba. Indeksas visada tik vieno pirkimo fragmentams - kito pirkimo įrodymai negali patekti (kritinė taisyklė).
- Semantinės (vektorinės) paieškos MVP nėra: ji reikalautų serverio; BM25 + tikslūs raktai + platus kandidatų rinkinys (14) dengia pirkimo dokumentų atvejį.

## AI sluoksnis (`asistentas.js`, `worker/tiekejams-proxy.js`)

- Sisteminės taisyklės: PĮ (ne VPĮ), tik pateikti fragmentai, „nera_saltinio" be pagrindo, konfliktai rodomi abu, fragmentų turinys nepatikimas, jokių garantijų / prognozių / apėjimų, faktas-išvada-rekomendacija, trumpos pažodinės citatos, atsakymas naudotojo kalba, tik JSON.
- Schema QA: status, trumpas, reiksme, veiksmai, salygos, saltiniai[{id, citata, teiginys}], konfliktai, patikimumas, ispejimai, klausimas_cvpis.
- Validavimas (`validuokQA`): kiekvienas šaltinio ID turi būti SAVA fragmentų žemėlapio savybė (ne `Object.prototype` raktas) su tekstu; citata patvirtinama tik kai normalizuota VISA citata randama fragmento tekste kaip ištisinė eilutė su žodžių ribomis (ne žodžių maišas - jis praleisdavo „reikalaujamas" dokumente su „nereikalaujamas"); leidžiama tik nukirpti kraštinius žodžius ilgose citatose arba sutapti nepaisant tarpų (pdf.js palieka tarpus žodžių viduje), o abu atlaidesni keliai žymimi kaip APYTIKSLĖ citata - patikrinta, kad su tikru CVP IS paketu 234 pažodinės ištraukos visos sutampa tiksliuoju keliu, tad žyma nėra triukšmas; atmesti šaltiniai mažina patikimumą; be patvirtintų šaltinių statusas keičiamas į `nera_saltinio`; konfliktas rodomas tik kai patvirtinti bent du variantai.
- Kontrolinis sąrašas: 15 punktų su būsenomis privaloma / su_salyga / netaikoma / nerasta / patikslinti (penktoji „netaikoma" pridėta prie master prompto keturių, kad aiškus „nereikalaujama" su citata nebūtų rodomas kaip „nerasta"); be patvirtintų šaltinių „privaloma", „su_salyga", „netaikoma" negalimos, o „nerasta" šalia patvirtinto šaltinio virsta „patikslinti"; modelio neįvertintas punktas - „patikslinti" su pastaba; neperskaitytas ar tuščias AI atsakymas rodomas kaip klaida, o ne kaip „nerasta".
- Fragmentų žymekliai `[[...]]` prompto kopijoje neutralizuojami (dokumentas negali suklastoti fragmentų ribų ar žymos AKTUALI REDAKCIJA); vardai valomi nuo eilučių lūžių.
- Injekcijos: `aptikInjekcija` pažymi nurodymus modeliui dokumentuose; sąsaja rodo įspėjimą, promptas liepia nevykdyti; modelis pats pažymi lauke `ispejimai` (patikrinta gyvai).
- Atsakymo skaitymas (`parse`): pirmiausia griežtas `JSON.parse`; jei jis lūžta - struktūrinis taisymas `taisykJson` (neekranuota ASCII kabutė eilutės viduje, pvz. lietuviška „citata", ir tiesioginis eilutės lūžis), po kurio dar kartą `JSON.parse`. Neuždarytas JSON netaisomas - nutrauktas (`stop_reason: max_tokens`) atsakymas lieka `null`, o sąsaja rodo atskirą pranešimą „atsakymas nutrūko", ne bendrą klaidą. Biudžetas: QA 4000, kontrolinis 6000 išvesties žetonų (išmatuota 2026-09-02 su tikru CVP IS paketu: lietuviškas QA atsakymas su 4 citatomis = ~1700 žetonų, sena 1800 riba jį nutraukdavo); ta pati riba Worker'yje.
- Transportas: numatyta `shared/ai-proxy.js` (viena user žinutė, system, maxTokens). Saugesnis kelias - Worker'is, kuriam klientas siunčia tik `{mode, lang, question, procurement, completeness, chunks[], turnstileToken}`, o promptą konstruoja serveris. Sisteminių promptų kanoninė kopija - Worker'yje; klientas laiko tą patį tekstą atsarginiam keliui.

## CVP IS adapterio kontraktas (2 etapas)

`cvpis.js` MVP įgyvendina tik `resolve`, nuorodų šablonus, terminų skaičiavimą ir `status()` (live: false). 2 etapo serverio adapteris turi įgyvendinti master prompto `ProcurementSourceAdapter` (`resolve`, `getMetadata`, `listDocuments`, `fetchDocument`, `checkForUpdates`) remdamasis patikrintais URL šablonais (žr. `cvpis-feasibility.md`): sąrašas T01, detalės pagal etiketes, dokumentai T02 su `documentId` iš `onclick`, „Papildymo ID" ir „AKTUALI REDAKCIJA" versijoms, TED eForms XML dalims. Sveikatos patikra: T01/T02 antraščių sutapimas su fiksuotu sąrašu.

## Duomenys ir privatumas

- Serverio DB nėra (CLAUDE.md 7 sk.). Dokumentai - tik naršyklės atmintyje; `localStorage` tik kalbai, paskutiniam ID ir anoniminiams skaitikliams. Klausimai nesaugomi.
- Į AI keliauja parinkti fragmentai (klausimui iki 14, kontroliniam sąrašui iki 28, po <= 1400 simbolių) su dokumentų pavadinimais, pirkimo pavadinimas ir CVP IS ID, dalis, rinkinio būsena ir klausimas - visi vieši CVP IS duomenys. Backend'as turinio nesaugo (patikrinta prie šaltinio 2026-07-17, ne šioje sesijoje - žr. CLAUDE.md 7 sk.; prieš platų viešinimą pertikrinti).
- Asmens duomenys: CVP IS „Kontaktinis asmuo" ir LITGRID kontaktai neimami; grįžtamasis ryšys - tik skaitikliai.

## Saugumas

- API raktas tik serveryje (proxy arba Worker).
- Viešas AI galinis taškas: `/api/analyze` priima kliento promptą (30 r/min per IP nginx) - tai esamas PP-carbon modelis; Worker modelis (serveris konstruoja promptą, Turnstile PRIVALOMAS, Cloudflare Rate Limiting taisyklė) yra rekomenduojamas produkcijai; kliente Turnstile widget'as įjungiamas `TURNSTILE_SITE_KEY` konstanta.
- CDN scenarijai su SRI; `xlsx` 0.20.3 iš cdn.sheetjs.com (cdnjs 0.18.5 turi CVE-2023-30533 ir CVE-2024-22363).
- Dokumentų turinys - nepatikimas: sanitizacijos nėra prasmės daryti nematomai, todėl nurodymai aptinkami, pažymimi ir promptu neutralizuojami; sąsaja niekada nevykdo turinio kaip komandų (tik `textContent` / `esc`).

## Testai

`PP-tiekejams/testai.html` - naršyklinis rinkinys be AI (fikstūros generuojamos vietoje: ZIP, DOCX, XML). Dengia: formatus, saugumo ribas, įdėtinius ZIP, LT vardų dekodavimą, versijų požymius, BM25 ir tikslius raktus, citatų validavimą (netikros atmetamos, be šaltinio -> nera_saltinio, konfliktai), injekcijų aptikimą, promptų struktūrą, kontrolinio sąrašo taisykles, klausimo projektą, redakcijų palyginimą, metaduomenų konfliktus, terminus su laiko zona, resolve, žinių bazę (PĮ, ne VPĮ), sąsajos būsenas, EN, klaviatūrą, mobilų vaizdą, grįžtamąjį ryšį. Gyvas AI kelias tikrintas rankiniu būdu 2026-09-02 (konflikto tarp redakcijų atpažinimas, citatos, injekcijos pažymėjimas).
