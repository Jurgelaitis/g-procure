# Žinomi apribojimai ir 2-3 etapų planas - G-Procure Tiekėjams

Būsena: 2026-09-02 (MVP).

## Žinomi apribojimai (MVP)

1. **Nėra gyvos CVP IS jungties.** Pirkimo metaduomenys ir dokumentai neatsisiunčiami automatiškai; naudotojas įkelia oficialų ZIP pats. Priežastys ir sąlygos - `cvpis-feasibility.md`. Įrankis to neimituoja: būsena „Gyva CVP IS jungtis neįjungta" rodoma visada.
2. **Metaduomenys iš dokumentų - euristiniai.** Terminas, BVPŽ, būdas, galiojimas, dalys atpažįstami regex'ais iš SPS / skelbimo teksto su šaltiniu; jei formuluotė kitokia - laukas nerodomas (ne išgalvojamas). Nesutapimai rodomi kaip konfliktas.
3. **Skenuoti PDF be OCR.** Pažymimi „be teksto sluoksnio"; tekstas neišgaunamas. OCR (pvz. tesseract.js iš CDN) - 2 etapas, nes lėtas ir netikslus LT diakritikoms be papildomo derinimo.
4. **Paieška leksinė (BM25 + tikslūs raktai), ne semantinė.** Sinonimų (pvz. „laidavimas" vs „garantija") gali nerasti; kompensuojama plačiu kandidatų rinkiniu (14) ir AI perklausimu. Vektorinė paieška - 2 etapas su serveriu.
5. **AI kelias per bendrą proxy.** Numatyta `api.g-procure.com/api/analyze` priima kliento promptą (30 r/min per IP). Rekomenduojamas produkcijai `worker/tiekejams-proxy.js` (serveris konstruoja promptą, Turnstile privalomas, kliente `TURNSTILE_SITE_KEY`) - parašytas, bet NEĮDIEGTAS (reikia Cloudflare dashboard'o ir Rate Limiting taisyklės, nes kode dažnio ribos nėra). Kol neįdiegtas - ta pati rizika kaip viešame PP-carbon.
5a. **`pdf.worker.min.js` be SRI** - kraunamas per `workerSrc`, SRI atributo neturi; pilna apsauga - vendor/ kopija (atidėta, kad nebūtų dubliuojama su kitais moduliais).
6. **Dokumentų versijos - pagal pavadinimą.** LITGRID versijuoja pavadinimu ir „Papildymo ID"; ZIP pakete Papildymo ID nėra, todėl naujumas sprendžiamas iš datos pavadinime ir žymos „AKTUALI REDAKCIJA". Jei pavadinime nėra nei datos, nei žymos - redakcijos nesuporuojamos.
7. **Kalba.** Sąsaja LT/EN pilnai; žinių bazė LT/EN; PĮ citatos tik LT (oficialaus EN vertimo šaltinis nepatikrintas). Dokumentų kalba nustatoma euristiškai.
8. **Teisinis sluoksnis nepatvirtintas teisininko.** Disclaimeris ir „ne oficialus paaiškinimas" logika įgyvendinti, bet prieš platų viešinimą būtina pirkimų teisininko patikra (PĮ 48 str. 2 d. 20 p., 49 str., 30 str.) - žr. kritiko išvadą `cvpis-feasibility.md`.
9. **PĮ redakcija galioja iki 2026-12-31.** Nuo 2027-01-01 numatyta nauja - `zinios.js` registrą (S2) ir straipsnių citatas reikia pertikrinti; sąsaja rodo „galioja iki".
10. **VPT DUK (klausk.vpt.lt) serveriui nepasiekiamas (Cloudflare 403)** - žinių bazė yra rankinė kopija su datomis; atnaujinti kas ketvirtį rankiniu būdu.
11. **Analitika minimali.** Tik anoniminiai „padėjo / nepadėjo" skaitikliai localStorage; administracinio kokybės skydelio nėra (reikalautų serverio).
12. **Testai be gyvo AI.** Automatiniai testai imituoja modelio atsakymus; gyva AI grandinė tikrinta rankiniu būdu 2026-09-02 (konfliktas, citatos, injekcija). Realių CVP IS ZIP paketų (ADOC, skenuoti PDF, xlsx) rinkinys kaip fikstūros - 2 etapo užduotis (į repo dėti tik viešus dokumentus).

## 2 etapas - patikima gyva jungtis ir tiekėjo darbo erdvė

Privalomos sąlygos prieš pradedant (iš `cvpis-feasibility.md`): infrastruktūros šeimininkas ir kešo sprendimas suderintas su CLAUDE.md 7 sk.; VPT raštas; 24-48 val. nuskaitymo testas; puslapiavimas be sesijos ir terminų atsinaujinimas patikrinti; Worker AI kelias įdiegtas; teisininko disclaimeris.

Darbai:
- Serverio `ProcurementSourceAdapter` (Worker su KV/D1 arba Hetzner): LITGRID sąrašas T01 -> resourceId; detalės pagal etiketes; dokumentai T02 su `documentId`; skelbimų kortelė; TED eForms XML dalims; sveikatos patikra (T01/T02 antraštės); ETag/Last-Modified, pagarbus dažnis, `Patikrinti atnaujinimus`.
- Snapshot'ų modelis: `SourceDocument` su `versionGroup`, `supersedes`, SHA-256; pokyčių santrauka tarp snapshot'ų.
- OCR atsarginis režimas skenuotiems PDF.
- Semantinė paieška (serverio embedding'ai) su reranking'u tik pirkimo ribose.
- Tiekėjo darbo erdvė (tik su privatumo modeliu): stebimų pirkimų sąrašas, pakeitimų pranešimai, komandos užduotys, LT-EN pariteto kontrolė.
- Administracinis kokybės skydelis: neatsakyti klausimai, parserių klaidos, sinchronizavimo klaidos, atsakymo laikas, pasenę snapshot'ai.

## 3 etapas - tiekėjų dalyvavimo ekosistema

Tiekėjo struktūrinis profilis ir pakartotinis viešų duomenų naudojimas; kvalifikacijos įrodymų biblioteka su galiojimo datomis; pasiūlymo komplektiškumo vartai; mokymosi keliai; anonimizuota dalyvavimo kliūčių analitika pirkimų procesui gerinti. Visi - tik po atskiro saugaus duomenų apdorojimo, saugojimo ir ištrynimo modelio.
