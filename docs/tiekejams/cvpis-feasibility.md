# CVP IS galimybių patikra - G-Procure Tiekėjams

Patikrinta: **2026-09-02** (curl iš macOS ir WebFetch iš kitos infrastruktūros, viešos užklausos be prisijungimo; papildomai - kritiko patikra tą pačią dieną). Visi teiginiai žemiau turi HTTP būseną arba pažymėti kaip nepatikrinti.

## Išvada (go / no-go)

**NO-GO gyvai CVP IS jungčiai MVP etape. GO rankiniam oficialaus dokumentų paketo įkėlimui + plonoms oficialioms nuorodoms.**

Argumentai:

1. CVP IS neturi nei viešos API, nei CORS antraščių (patikrinta su `Origin: https://g-procure.com`) - iš naršyklės nuskaityti neįmanoma, tik per serverį.
2. Serverio sluoksnio nėra kam administruoti (Hetzner be šeimininko), Cloudflare Worker neturi saugyklos ir tvarkaraščio, o kešuotas pirkimų indeksas serveryje prieštarauja CLAUDE.md 7 sk. nuostatai „jokios serverio DB" be atskiro vartotojo sprendimo.
3. Kritiniai duomenys (terminai, pratęsimai, aktualios redakcijos) CVP IS neturi struktūrinės žymos - tik „Papildymo ID" ir pavadinimų euristika. Kešuotas veidrodis reikštų pasenusią informaciją su teisine pasekme tiekėjui.
4. Teisinis pagrindas nepatvirtintas: VPT nepaklausta dėl automatinio nuskaitymo (naudojimo sąlygų puslapio nėra, robots.txt neegzistuoja), o asistentas apie konkretų pirkimą gali būti traktuojamas kaip neoficialus paaiškinimų kanalas (PĮ 48 str. 2 d. 20 p., 49 str.).
5. Rankinis įkėlimas atitinka esamą architektūrą (viskas naršyklėje) ir yra patikrintas: CVP IS ZIP atsisiunčiamas be prisijungimo, viduje docx + EBVPD xml/pdf.

## Kas patikrinta: vieši URL šablonai (visi be prisijungimo, HTTP 200)

| Paskirtis | Šablonas | Pastabos |
|---|---|---|
| LITGRID pirkimų sąrašas (GET be sesijos) | `/epps/viewCFTSAction.do?mode=search&isFTS=true&type=cftFTS&isPopup=false&contractAuthority=LITGRID+AB&publicationFromDate=01%2F01%2F2026&d-3680175-p=1` | server-side HTML, lentelė `id=T01`, 10 eil./psl.; displaytag prefiksas `d-3680175` sugeneruotas ir gali keistis; puslapiavimas be sesijos (p=2+) NEPATIKRINTAS |
| Pirkimo detalės | `/epps/cft/prepareViewCfTWS.do?resourceId={id}` | etiketė/reikšmė poros be semantinių id; etiketės lokalizuotos |
| Dokumentų sąrašas | `/epps/cft/listContractDocuments.do?resourceId={id}` | lentelė `id=T02`: Papildymo ID, Pavadinimas, Dokumentas, Aprašymas, Kalba, Versijos; `documentId` iš `onclick="downloadDocForAnonymous('{docId}')"` |
| Skelbimų kortelė | `/epps/cft/viewContractNotices.do?resourceId={id}` | visi skelbimai su datomis; pakeitimo skelbimas - antra eilutė be žymos |
| Dokumento atsisiuntimas | `/epps/cft/downloadContractDocument.do?documentId={docId}&resourceId={id}` | ZIP / PDF / DOCX / XML, `Content-Disposition: attachment` |
| Visų dokumentų ZIP | `/epps/cft/prepareAnonymousDownload.do?resourceId={id}&isContract=null` | mygtukas „Atsisiųsti Zip failą" |
| Dokumento versijos | `/epps/cft/viewDocumentVersions.do?resourceId={docId}` | čia resourceId = documentId |
| Skelbimo PDF | `/epps/cft/downloadNoticeForAdvSearch.do?resourceId={id}` | ~2 MB |
| DPS dokumentai | `/epps/dps/listDPSContractDocuments.do?resourceId={id}` | |
| Pasiūlymo teikimas | `/epps/cft/viewTenders.do?resourceId={id}` | **302 -> /cas/login** - vienintelis kelias su prisijungimu; NENUSKAITYTI |

`robots.txt`: neegzistuoja (302 į home.do). Naudojimo sąlygų puslapio nėra. Per ~100 užklausų per 10 min. blokavimo ar CAPTCHA nebuvo, bet paieškos formoje yra `captcha` laukas - kada aktyvuojamas, nežinoma. Ilgalaikis nuskaitymas iš datacentro IP NETESTUOTAS.

## Patikrinti realūs LITGRID pirkimai (6)

| resourceId | Rūšis | Ką parodė |
|---|---|---|
| 9110555 | Skelbiamos derybos pagal PĮ, be dalių, aktyvus | ZIP 1,16 MB: 11 docx (SPS, BPS, priedai) + įdėtinis `SPS 2 priedas. EBVPD.zip` (espd-request.xml, pdf, README) - ZIP failų vardai su MIŠRIA UTF-8 vėliavėle |
| 8900362 | Atviras konkursas (tarptautinis), su paaiškinimais | „Aktuali redakcija_Techninė specifikacija ... (aktuali redakcija 2026-08-26).docx" kaip NAUJAS dokumentas su Papildymo ID 3; 2 skelbimai TED (511550-2026, 575569-2026) |
| 7453229 | Skelbiamos derybos, 4 dalys, LT/EN | dalys detalėse „Dalis(-ių) skaičius: 4"; TED eForms XML `cac:ProcurementProjectLot` |
| 8979138 | Skelbiamos derybos, LT-EN dokumentai | EBVPD (LT) ir ESPD (EN) kaip atskiri dokumentai su Papildymo ID 2 ir 3 |
| 7671077 | Skelbiamos derybos, 2 dalys, pakartotinis skelbimas | terminas pratęstas RAŠTU (Papildymo ID 1) - ar sąrašo terminas atsinaujino, NEPATIKRINTA |
| 9187214 | Skelbiamos derybos, 10 dokumentų | kiekvienas patikslinimas - naujas failas su didėjančiu Papildymo ID; „Specialiosios Pirkimo sąlygos AKTUALI REDAKCIJA 2026 08 13/14" |

Išvada versijavimui: LITGRID versijuoja **pavadinimu ir Papildymo ID**, ne sisteminėmis versijomis. Įrankis tai ir naudoja (`dokumentai.js` `versijosPozymiai`, `asistentas.js` `redakcijuPoros`).

## API ir atviri duomenys

- **CVP IS**: oficialios API / JSON nerasta (European Dynamics e-PPS, tik `/epps/common/commonAjaxCall.do` pagalbiniams veiksmams).
- **TED Search API v3** veikia be rakto: `POST https://api.ted.europa.eu/v3/notices/search` su `buyer-name="LITGRID"` (369 skelbimai nuo 2025-01-01). eForms XML turi tiesiogines CVP IS nuorodas (`listContractDocuments.do?resourceId=`). Apima TIK tarptautinius pirkimus; CORS nėra.
- **VPT atviri duomenys (data.gov.lt)** baigiasi 2024-11-29 - naujos CVP IS pirkimų juose nėra.

## CORS

`viesiejipirkimai.lt`, `api.ted.europa.eu`, `get.data.gov.lt` - nė vienas negrąžina `Access-Control-Allow-Origin` (patikrinta curl su Origin ir OPTIONS preflight). Naršyklinis `fetch()` iš g-procure.com bus užblokuotas. Paprastos nuorodos (`<a href>`) CORS nereikalauja - jomis MVP ir naudojasi.

## Kas dar nepatikrinta (prieš 2 etapą)

1. Puslapiavimas be sesijos (`d-3680175-p=2+`) ir prefikso stabilumas tarp dienų.
2. 24-48 val. nuskaitymo testas iš tikslinio IP (Hetzner arba Worker): CAPTCHA, 403/429, IP blokas; ar Worker'is apskritai pasiekia CVP IS (NSX LB).
3. Ar sąrašo/detalių terminas atsinaujina po pratęsimo raštu (7671077).
4. ZIP turinys visiems 6 pirkimams: ADOC konteineriai, skenuoti PDF, xlsx kainų lentelės.
5. Detalių puslapio kalba be cookie (etiketės pagal Accept-Language?).
6. TED API laukų sąrašas (dalys, dokumentų URL), rikiavimas, dažnio ribos.
7. VPT užklausa raštu dėl automatinio nuskaitymo ir turinio naudojimo.
8. Teisininko patikra: asistentas apie konkretų pirkimą vs PĮ 48/49/30 str.; disclaimeris.
9. GDPR: CVP IS laukas „Kontaktinis asmuo" - nerodyti automatiškai.

## 2 etapo jungties sąlygos (visos privalomos)

- Hetzner arba Worker turi šeimininką ir kešo saugyklos sprendimą, suderintą su CLAUDE.md 7 sk.
- VPT atsakė raštu.
- Nuskaitymo testas iš tikslinio IP praeitas be CAPTCHA/blokų.
- Puslapiavimas be sesijos ir terminų atsinaujinimas po pratęsimo patikrinti.
- AI kelias perkeltas į `worker/tiekejams-proxy.js` modelį (serveris konstruoja promptą) su Turnstile ir dažnio riba.
- Teisininkas patvirtino disclaimerį.
