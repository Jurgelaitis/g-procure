# G-Procure Tiekėjams

Vieša G-Procure sekcija tiekėjams ir visiems, kurie domisi viešaisiais pirkimais CVP IS. Aiškiai atskirta nuo 12 vidinių, perkančiojo subjekto perspektyvai skirtų modulių. Nuo 2026-09-24 (B1) įrankis skirtas bet kurio pirkimo vykdytojo pirkimams: vykdytojas ir teisinis režimas (PĮ / VPĮ) atpažįstami iš skelbimo ir patvirtinami naudotojo (žr. skyrių žemiau); bendrieji atsakymai ir organizacijų taisyklės kol kas tik pagal PĮ ir LITGRID.

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
| `../shared/dokumentai.js` | (nuo 2026-09-25 bendras - jį naudoja ir PP-salygos) Dokumentų paketo apdorojimas naršyklėje: ZIP (su saugumo ribomis), PDF, DOCX, ODT, XLSX, XML (taip pat CVP IS pasiūlymo struktūra `c4t`), HTML, TXT -> fragmentai su vieta ir SHA-256. Fragmentas - iki 180 žodžių IR iki 1 400 simbolių: tiek jo mato AI (`CHUNK_SIMBOLIU`; Worker'io `MAX_CHUNK_CHARS` negali būti mažesnė - tikrina testai) |
| `paieska.js` | Tiksli terminų / numerių paieška + BM25 su LT kamienais; citatų patikra |
| `asistentas.js` | Promptai, atsakymo schema ir VALIDAVIMAS (citatos tikrinamos), kontrolinis sąrašas, klausimo projektas, redakcijų palyginimas |
| `zinios.js` | Šaltinių registras (versijuojamas) ir bendrųjų klausimų bazė (PĮ 2026-07-01 redakcija, VPT 2026 m. instrukcijos, LITGRID taisyklės); kiekviena tema turi `rezimas` (PĮ arba CVP IS tvarka abiem režimams) - VPĮ atitikmenų dar nėra |
| `cvpis.js` | CVP IS viešų nuorodų šablonai (patikrinti 2026-09-02), resolve, terminai Europe/Vilnius, jungties būsena; pirkėjo ir teisinio režimo atpažinimas iš skelbimo (`atpazinkPirkeja`, `atpazinkRezima`, 2026-09-24) |
| `organizacijos.js` | Pirkimo vykdytojų registras (`GP_ORG`): LITGRID (patikrintos taisyklės, planas), Amber Grid, EPSO-G, Energy cells (tik CVP IS sąrašo nuorodos, taisyklių registre nėra); atpažinimas pagal skelbimo pavadinimą, tikėtinas režimas (galioja skelbimas, ne registras) |
| `sw.js` | Veikimas be interneto (service worker) - žr. aukščiau |
| `testai.html` | Naršyklinis regresijos rinkinys, 126 testai (dokumentai ir saugumo ribos, paieška, citatų validavimas, kontrolinis sąrašas, versijos, metaduomenys, nuorodos ir terminai, žinių bazė, sąsaja, prieinamumas, mobilus vaizdas; nuo 2026-09-22 - tikrų CVP IS paketų sandara, fragmentų parinkimas, kalbos taisyklė ir veikimas be interneto; nuo 2026-09-24 - pirkėjas ir režimas iš skelbimo, patvirtinimas, rankinis nurodymas, organizacijų registras). Po kiekvieno pakeitimo paleisti NAUJAME porte - naršyklė kešuoja modulio .js |
| `../worker/tiekejams-proxy.js` | Cloudflare Worker: saugus AI kelias (serveris konstruoja promptą, Turnstile) |

Dokumentacija: `../docs/tiekejams/` (product-spec, cvpis-feasibility, architecture, limitations-and-phase-2).

## Kaip skaitomas CVP IS paketas (2026-09-22)

Išbandyta su keturiais naujausiais LITGRID pirkimais (9683631, 9744290, 9495168, 9566057).

- **Santrauka pirmiausia iš TED skelbimo PDF** (`..._0.pdf`, pakeitimo skelbimas `..._1.pdf`): pavadinimas, pateikimo terminas, numatoma vertė, BVPŽ, trukmė, dalys, ES lėšos, pasiūlymo kalba; vertinimo kriterijus - iš CVP IS pasiūlymo struktūros (`2_c4t_*.xml`). Pirkimo lygio laukai imami tik iki „5 Pirkimo dalis".
- **Pakeitimo skelbimas:** struktūriniame lauke lieka SENASIS terminas, o naujasis parašytas tik skyriuje „10 Pakeitimas" - todėl pirmenybė pakeitimui, senasis rodomas kaip „Ankstesnis terminas". Tas pats su LITGRID raštu „terminas yra pratęsiamas iki 2026 m. rugsėjo 28 d.".
- **Neatitikimai rodomi, ne slepiami:** pvz. skelbime pasiūlymo kalba „lietuvių", o SPS - „lietuvių arba anglų".
- **Fragmentai klausimui:** (1) santraukos fakto vieta, jei klausimas apie tą temą (terminas, vertė, kalba...), kartu su tą pačią reikšmę patvirtinančiais dokumentais (pvz. „10 Pakeitimas"); (2) paaiškinimai ir pratęsimai, jei tikrai susiję (>= 40 % geriausio paieškos balo); (3) BM25, kuriame pirkimo pavadinimo žodžiai sveria 1/4 - jie yra beveik kiekviename fragmente ir nerodo, apie ką klausiama. Be (1) klausimas „Iki kada pateikti?" gaudavo tik 14 bendrų BPS frazių; be (3) „What is the delivery time for the mobile switchyard?" negaudavo sutarties 4.1 p.
- **AI taisyklė dėl nesutapimų:** aiškus pakeitimas („terminas pratęsiamas iki ...") nėra konfliktas - atsakoma pagal pakeistą reikšmę; o viename punkte likusios šablono alternatyvos („... lietuvių kalba. / ... lietuvių arba anglų kalbomis") - konfliktas, rodomos abi.

## Pirkimo vykdytojas ir teisinis režimas (B1, 2026-09-24)

Iki 2026-09-24 kiekvienam įvestam CVP IS ID įrankis rašė „Pirkimo vykdytojas: LITGRID AB“, o AI sisteminis promptas kiekvieną pirkimą įrėmindavo kaip LITGRID ir PĮ („NIEKADA nesiremk VPĮ“). Kitos organizacijos pirkimui tai buvo klaidingas rėmas, nors citatos ir tada ateidavo tik iš įkeltų dokumentų.

Dabar:

- **Atpažinimas iš skelbimo.** Įkėlus paketą, iš skelbimo PDF (rūšis „Skelbimas“) `cvpis.js` ima pirkėją („1.1 Pirkėjas“ -> pirmas „Oficialus pavadinimas: X (PV)“; minkštasis brūkšnelis U+00AD verčiamas „-“) ir režimą: „Perkančiojo subjekto veiklos sritis“, „Direktyva 2014/25/ES“, failo varde „komunalinio sektoriaus direktyva“ = PĮ; „Perkančiosios organizacijos veiklos sritis“, „Direktyva 2014/24/ES“, „bendroji direktyva“ = VPĮ. Sandara perskaityta iš keturių tikrų skelbimų 2026-09-24 (LITGRID 9683631, Amber Grid 9742096, EPSO-G 9281765, Energy cells 9614756). Nacionaliniuose skelbimuose „Teisinis pagrindas“ būna „Kitas“ - signalo neduoda. Abiejų režimų požymiai viename skelbime = „nenustatyta“, naudotojas renkasi pats.
- **Patvirtinimas.** Santraukos bloke „Pirkimo vykdytojas ir teisinis režimas“ rodoma atpažinta reikšmė su šaltiniu (failas, vieta, pažodinis požymis) ir mygtukai „Patvirtinti“ / „Keisti“ (rankinis nurodymas turi pirmenybę, „Grąžinti iš skelbimo“ jį atšaukia). Būsena tik naršyklės atmintyje kartu su dokumentais.
- **AI promptas.** `asistentas.js` (`kontekstoEilute`) ir kanoninė kopija `worker/tiekejams-proxy.js`: patvirtintas PĮ - „perkantysis subjektas ... NIEKADA nesiremk VPĮ“; patvirtintas VPĮ - „perkančioji organizacija ... NIEKADA nesiremk PĮ“; nepatvirtinta ar nenustatyta - „NEPATVIRTINTI: nesiremk nei PĮ, nei VPĮ, nebent šaltinis cituoja“. User žinutėje - eilutė „PIRKIMO VYKDYTOJAS: ... | TEISINIS REŽIMAS: ... (naudotojo patvirtinta / NEPATVIRTINTA)“. Worker'is kontekstą priima iš kūno lauko `kontekstas` (režimas iš baltojo sąrašo, sakinį sudaro serveris).
- **Organizacijų registras** (`organizacijos.js`) tik papildo: LITGRID turi patikrintas taisyklių ir plano nuorodas (žinių bazės S3), Amber Grid, EPSO-G ir Energy cells - tik CVP IS sąrašo nuorodas (vykdytojo laukas priima dalinį pavadinimą, patikrinta curl 2026-09-24). Nežinomai organizacijai sąsaja sako, kad taisyklių registre nėra. Kai skelbimo režimas nesutampa su registro tikėtinu (Energy cells 9614756 - perkančiosios organizacijos formos), rodoma, kad galioja skelbimas.
- **Kas liko (B2, B3).** Bendrieji atsakymai - tik PĮ (12 temų su `rezimas`), VPĮ atitikmenų nėra ir sąsaja tai sako prie kiekvienos temos ir VPĮ pirkimui; kitų organizacijų taisyklių šaltiniai nepatikrinti; angliškų skelbimų formos („Activity of the contracting entity / authority“) numanomos, tikru EN skelbimu nepatikrintos; Vilniaus miesto savivaldybės pirkimų skelbimų PDF per `downloadNoticeForAdvSearch.do` 2026-09-24 grąžino HTML, ne PDF - ne visų pirkimų skelbimai šiuo keliu pasiekiami.

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
