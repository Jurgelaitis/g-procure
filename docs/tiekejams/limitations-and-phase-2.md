# Žinomi apribojimai ir 2-3 etapų planas - G-Procure Tiekėjams

Būsena: 2026-09-02 (MVP), papildyta 2026-09-22 (tikri LITGRID paketai, veikimas be interneto) ir 2026-09-24 (B1: pirkimo vykdytojas ir režimas iš skelbimo, ne LITGRID konstanta).

## Žinomi apribojimai (MVP)

1. **Nėra gyvos CVP IS jungties.** Pirkimo metaduomenys ir dokumentai neatsisiunčiami automatiškai; naudotojas įkelia oficialų ZIP pats. Priežastys ir sąlygos - `cvpis-feasibility.md`. Įrankis to neimituoja: būsena „Gyva CVP IS jungtis neįjungta" rodoma visada.
2. **Metaduomenys iš dokumentų - euristiniai.** Terminas, BVPŽ, vertė, trukmė, būdas, galiojimas, dalys, kalba atpažįstami regex'ais iš TED skelbimo ir SPS teksto su šaltiniu; jei formuluotė kitokia - laukas nerodomas (ne išgalvojamas). Nesutapimai rodomi kaip konfliktas. Pasiūlymo kalba lyginama tik pagal pasiūlymo (paraiškos) FORMOS sakinį - „kiti dokumentai ir anglų kalba" neatitikimu nelaikoma.
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
12. **Testai be gyvo AI.** Automatiniai testai imituoja modelio atsakymus; gyva AI grandinė tikrinta rankiniu būdu 2026-09-02 (konfliktas, citatos, injekcija) ir 2026-09-22 (keturi tikri LITGRID paketai, 2 x 13 tiekėjo klausimų). Realūs paketai į repo nededami - testuose atkartota jų sandara.
13. **Veikimas be interneto - tik po pirmo apsilankymo su internetu** ir tik per `https:` / `localhost` (ne `file://`). Be ryšio AI atsakymų nėra - rodomos tikėtinos vietos dokumentuose, kontrolinis sąrašas neįvertinamas.
14. **pdf.js minkštieji brūkšneliai.** TED skelbimo PDF brūkšneliai užrašyti kaip U+00AD; pdf.js 3.11.174 juos vienur išmeta („LOT0001"), kitur paverčia tarpu (pavadinime „330 110 10 kV" vietoj „330-110-10 kV"). SPS ir formose tekstas teisingas. Tai bibliotekos elgsena - taisyti būtų spėjimas.
16. **Bendrieji atsakymai - tik PĮ.** 12 temų cituoja 19 PĮ straipsnių; VPĮ atitikmenų (perkančiosioms organizacijoms) nėra - kiekviena tema pažymėta režimu, o VPĮ pirkimui rodomas įspėjimas. B2: VPĮ sluoksnis iš e-tar su teisės specialisto peržiūra, kartu su PĮ 2027 m. redakcijos pertikrinimu (žr. 9 p.). Organizacijų taisyklių šaltinis patikrintas tik LITGRID; Amber Grid, EPSO-G ir Energy cells registre turi tik CVP IS sąrašo nuorodas (B3).
17. **Režimo atpažinimas remiasi keturiais lietuviškais skelbimais** (LITGRID, Amber Grid, EPSO-G, Energy cells, 2026-09-24). Nacionaliniuose skelbimuose „Teisinis pagrindas: Kitas“ signalo neduoda - režimą lemia eilutė „Perkančiojo subjekto / Perkančiosios organizacijos veiklos sritis“ ir failo vardas. Angliškų skelbimų formos numanomos pagal TED eForms etiketes, tikru EN skelbimu nepatikrintos. Todėl atpažinta reikšmė visada laukia naudotojo patvirtinimo, o be patvirtinimo promptas įstatymo neteigia. Vilniaus miesto savivaldybės pirkimų skelbimo PDF per `downloadNoticeForAdvSearch.do` grąžino HTML - ne visų pirkimų skelbimai šiuo keliu pasiekiami (ZIP paketo tai neliečia). Keturi tikri skelbimų PDF per modulio kelią (pdf.js) atpažinti teisingai, bet pdf.js išmeta minkštąjį brūkšnelį (žr. 14 p.), tad vykdytojas rodomas „UAB "EPSOG"“; registras tokį vardą atpažįsta, brūkšnelio vieta nespėjama.
15. **Nepasirinktos šablono alternatyvos neaptinkamos.** Paskelbtame dokumente gali likti abu šablono variantai (2026-09-22 tikro paketo SPS: „... turi būti pateikiami lietuvių kalba. / ... kiti dokumentai gali būti pateikiami lietuvių arba anglų kalbomis"). Įrankis jų atskirai nežymi; tiekėjui tai - klausimas perkančiajam subjektui.

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
