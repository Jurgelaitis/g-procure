# G-Procure Tiekėjams

Vieša G-Procure sekcija tiekėjams ir visiems, kurie domisi LITGRID AB pirkimais. Aiškiai atskirta nuo 12 vidinių, perkančiojo subjekto perspektyvai skirtų modulių.

> G-Procure Tiekėjams yra informacinis pagalbinis įrankis. Oficialūs pirkimo dokumentai ir pranešimai skelbiami CVP IS. Atsakymai nėra individuali teisinė konsultacija ir nepakeičia tiekėjo pareigos patikrinti aktualią dokumentų redakciją bei laiku atlikti veiksmus CVP IS.

## Paleidimas

Be build žingsnio. Per http serverį iš repo šaknies (CDN bibliotekoms ir `../shared/`):

```bash
python3 -m http.server 8080
```

Atidaryti `http://localhost:8080/PP-tiekejams/index.html`. Testai: `http://localhost:8080/PP-tiekejams/testai.html` (AI nekviečiamas).

Gyvai: `https://g-procure.com/PP-tiekejams/` (GitHub Pages, deploy = push į `main`).

## Failai

| Failas | Paskirtis |
|---|---|
| `index.html` | Sąsaja (LT/EN): pradžia, konkretus pirkimas (3 zonos), bendri klausimai, „kaip tikrinami atsakymai" |
| `dokumentai.js` | Dokumentų paketo apdorojimas naršyklėje: ZIP (su saugumo ribomis), PDF, DOCX, XLSX, XML, HTML, TXT -> fragmentai su vieta ir SHA-256 |
| `paieska.js` | Tiksli terminų / numerių paieška + BM25 su LT kamienais; citatų patikra |
| `asistentas.js` | Promptai, atsakymo schema ir VALIDAVIMAS (citatos tikrinamos), kontrolinis sąrašas, klausimo projektas, redakcijų palyginimas |
| `zinios.js` | Šaltinių registras (versijuojamas) ir bendrųjų klausimų bazė (PĮ 2026-07-01 redakcija, VPT 2026 m. instrukcijos, LITGRID) |
| `cvpis.js` | CVP IS viešų nuorodų šablonai (patikrinti 2026-09-02), resolve, terminai Europe/Vilnius, jungties būsena |
| `testai.html` | Naršyklinis regresijos rinkinys, 62 testai (dokumentai ir saugumo ribos, paieška, citatų validavimas, kontrolinis sąrašas, versijos, metaduomenys, nuorodos ir terminai, žinių bazė, sąsaja, prieinamumas, mobilus vaizdas). Po kiekvieno pakeitimo paleisti NAUJAME porte - naršyklė kešuoja modulio .js |
| `../worker/tiekejams-proxy.js` | Cloudflare Worker: saugus AI kelias (serveris konstruoja promptą, Turnstile) |

Dokumentacija: `../docs/tiekejams/` (product-spec, cvpis-feasibility, architecture, limitations-and-phase-2).

## Konfigūracija

- **AI kelias.** `index.html` konstanta `AI_ENDPOINT`. Tuščia (numatyta) = `shared/ai-proxy.js` -> `api.g-procure.com/api/analyze` (tas pats kelias kaip viešame PP-carbon). Įdiegus `worker/tiekejams-proxy.js` - įrašyti jo adresą (pvz. `https://tiekejams-api.g-procure.com`); tada promptą konstruoja serveris, o klientas siunčia tik fragmentus ir klausimą.
- **Worker diegimas** (rankinis, kaip `epd-proxy.js`): Cloudflare Workers & Pages > Create > įklijuoti failo turinį > Deploy; Custom domain; Secrets: `ANTHROPIC_API_KEY` (būtinas) ir `TURNSTILE_SECRET_KEY` (BŪTINAS - be jo Worker'is atsako 500, nes Origin antraštė curl'u suklastojama). Kliente `index.html` įrašyti `TURNSTILE_SITE_KEY` - tada prieš AI kvietimą rodomas Turnstile widget'as. PRIVALOMA papildomai: Cloudflare **Rate Limiting** taisyklė Worker'io domenui (pvz. 20 užklausų / 10 min per IP, POST), nes kode dažnio ribos nėra. `ALLOWED_ORIGIN` - `https://g-procure.com`.
- **CVP IS jungtis.** MVP - tik nuorodos ir rankinis įkėlimas; gyva jungtis - 2 etapas (žr. `docs/tiekejams/cvpis-feasibility.md`).

## Privatumas

- Dokumentai apdorojami tik naršyklėje ir lieka jos atmintyje (uždarius skirtuką dingsta). Į serverį ištisi dokumentai nekeliami.
- Į AI (per proxy) siunčiami parinkti fragmentai (klausimui iki 14, kontroliniam sąrašui iki 28, po ne daugiau kaip 1 400 simbolių) su dokumentų pavadinimais, pirkimo pavadinimas ir CVP IS ID iš skelbimo, nurodyta dalis, rinkinio būsena ir klausimas - visa tai vieši CVP IS duomenys. API raktas - serveryje.
- Klausimai nesaugomi. `localStorage` (`pp_tiekejams`, `pptiekejams.lang`, `gprocure.infoPanel.pp-tiekejams`): kalba, paskutinis pirkimo ID, anoniminiai „padėjo / nepadėjo" skaitikliai, informacinio skydelio būsena.
- CDN bibliotekos su SRI (`integrity`); `xlsx` imamas iš cdn.sheetjs.com 0.20.3 (cdnjs turi tik 0.18.5 su žinomomis CVE). `pdf.worker.min.js` per `workerSrc` SRI nepadengiamas.
- Jokių tiekėjo paskyrų, pasiūlymų ar komercinių dokumentų įkėlimo MVP nėra ir neturi būti be atskiro saugaus duomenų modelio.
