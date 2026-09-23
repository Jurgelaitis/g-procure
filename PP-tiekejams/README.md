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

## Veikimas be interneto

Po pirmo apsilankymo su internetu modulis veikia ir be ryšio (`sw.js`, service worker): ZIP ir PDF skaitymas, santrauka, paieška dokumentuose, kontrolinio sąrašo vietos, klausimo projektas ir bendrieji klausimai. Be ryšio neveikia tik AI atsakymai - vietoj jų rodomos tikėtinos vietos dokumentuose (ištrauka ties faktu), o kontrolinio sąrašo punktai žymimi „neįvertinta".

- Savi failai (šis katalogas ir `../shared/`) - pirmiausia tinklas, talpykla tik be ryšio, todėl prisijungęs naršytojas visada gauna naujausią kodą.
- CDN bibliotekos (versija adrese) - pirmiausia talpykla; `pdf.worker.min.js` išsaugomas iš anksto.
- AI užklausos, klausimai ir dokumentai į talpyklą niekada nepatenka.
- Service worker registruojamas tik per `https:` ir `localhost`; atidarius per `file://` modulis veikia kaip anksčiau, bet be ryšio - ne.
- **Pridedant naują failą** (skriptą ar stilių) - įrašykite jį į `sw.js` sąrašą `SAVI` arba `CDN` (testas tai tikrina). Pakeitus failus - padidinkite `VERSIJA` (neprivaloma, bet išvalo seną talpyklą).
- Patikrinta 2026-09-22 tikru Chrome: po pirmo įkėlimo serveris išjungtas, CDN, šriftų ir AI adresai padaryti nepasiekiami - modulis įsikėlė iš talpyklos, 35 MB paketas (62 dokumentai, 17 PDF) apdorotas per 6 s, perkrovimas be ryšio veikė abiem kalbomis. Claude programos vidinė naršyklė service worker nepalaiko - ten to patikrinti negalima.

## Failai

| Failas | Paskirtis |
|---|---|
| `index.html` | Sąsaja (LT/EN; pradinė kalba pagal lankytoją per `shared/lang-detect.js`: iš Lietuvos - LT, kiti - EN, rankinis jungiklis įsimenamas): pradžia, konkretus pirkimas (3 zonos), bendri klausimai, „kaip tikrinami atsakymai" |
| `dokumentai.js` | Dokumentų paketo apdorojimas naršyklėje: ZIP (su saugumo ribomis), PDF, DOCX, ODT, XLSX, XML (taip pat CVP IS pasiūlymo struktūra `c4t`), HTML, TXT -> fragmentai su vieta ir SHA-256. Fragmentas - iki 180 žodžių IR iki 1 400 simbolių: tiek jo mato AI (`CHUNK_SIMBOLIU`; Worker'io `MAX_CHUNK_CHARS` negali būti mažesnė - tikrina testai) |
| `paieska.js` | Tiksli terminų / numerių paieška + BM25 su LT kamienais; citatų patikra |
| `asistentas.js` | Promptai, atsakymo schema ir VALIDAVIMAS (citatos tikrinamos), kontrolinis sąrašas, klausimo projektas, redakcijų palyginimas |
| `zinios.js` | Šaltinių registras (versijuojamas) ir bendrųjų klausimų bazė (PĮ 2026-07-01 redakcija, VPT 2026 m. instrukcijos, LITGRID) |
| `cvpis.js` | CVP IS viešų nuorodų šablonai (patikrinti 2026-09-02), resolve, terminai Europe/Vilnius, jungties būsena |
| `sw.js` | Veikimas be interneto (service worker) - žr. aukščiau |
| `testai.html` | Naršyklinis regresijos rinkinys, 111 testų (dokumentai ir saugumo ribos, paieška, citatų validavimas, kontrolinis sąrašas, versijos, metaduomenys, nuorodos ir terminai, žinių bazė, sąsaja, prieinamumas, mobilus vaizdas; nuo 2026-09-22 - tikrų CVP IS paketų sandara, fragmentų parinkimas, kalbos taisyklė ir veikimas be interneto). Po kiekvieno pakeitimo paleisti NAUJAME porte - naršyklė kešuoja modulio .js |
| `../worker/tiekejams-proxy.js` | Cloudflare Worker: saugus AI kelias (serveris konstruoja promptą, Turnstile) |

Dokumentacija: `../docs/tiekejams/` (product-spec, cvpis-feasibility, architecture, limitations-and-phase-2).

## Kaip skaitomas CVP IS paketas (2026-09-22)

Išbandyta su keturiais naujausiais LITGRID pirkimais (9683631, 9744290, 9495168, 9566057).

- **Santrauka pirmiausia iš TED skelbimo PDF** (`..._0.pdf`, pakeitimo skelbimas `..._1.pdf`): pavadinimas, pateikimo terminas, numatoma vertė, BVPŽ, trukmė, dalys, ES lėšos, pasiūlymo kalba; vertinimo kriterijus - iš CVP IS pasiūlymo struktūros (`2_c4t_*.xml`). Pirkimo lygio laukai imami tik iki „5 Pirkimo dalis".
- **Pakeitimo skelbimas:** struktūriniame lauke lieka SENASIS terminas, o naujasis parašytas tik skyriuje „10 Pakeitimas" - todėl pirmenybė pakeitimui, senasis rodomas kaip „Ankstesnis terminas". Tas pats su LITGRID raštu „terminas yra pratęsiamas iki 2026 m. rugsėjo 28 d.".
- **Neatitikimai rodomi, ne slepiami:** pvz. skelbime pasiūlymo kalba „lietuvių", o SPS - „lietuvių arba anglų".
- **Fragmentai klausimui:** (1) santraukos fakto vieta, jei klausimas apie tą temą (terminas, vertė, kalba...), kartu su tą pačią reikšmę patvirtinančiais dokumentais (pvz. „10 Pakeitimas"); (2) paaiškinimai ir pratęsimai, jei tikrai susiję (>= 40 % geriausio paieškos balo); (3) BM25, kuriame pirkimo pavadinimo žodžiai sveria 1/4 - jie yra beveik kiekviename fragmente ir nerodo, apie ką klausiama. Be (1) klausimas „Iki kada pateikti?" gaudavo tik 14 bendrų BPS frazių; be (3) „What is the delivery time for the mobile switchyard?" negaudavo sutarties 4.1 p.
- **AI taisyklė dėl nesutapimų:** aiškus pakeitimas („terminas pratęsiamas iki ...") nėra konfliktas - atsakoma pagal pakeistą reikšmę; o viename punkte likusios šablono alternatyvos („... lietuvių kalba. / ... lietuvių arba anglų kalbomis") - konfliktas, rodomos abi.

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
