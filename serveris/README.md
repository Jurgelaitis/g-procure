# G-Procure serverio paslaugos

## CVP IS duomenų paslauga (VPT API)

Naudotojo sprendimas 2026-10-18: VPT CVP IS API naudoti per G-Procure serverį (Hetzner), saugumo lygis - aukštas.

### Kodėl reikia serverio ir duomenų kopijos

- VPT API (`POST https://viesiejipirkimai.lt/epps-integration/api/cft-details-export`, antraštė `apiKey`) aprašyta VPT
  pranešime ([2026-05-20](https://vpt.lrv.lt/lt/naujienos-3/del-api-funkcionalumo-papildymo-w0Y/)) ir viešame OpenAPI apraše
  (`/epps-integration/v3/api-docs`). Užklausos parametrai - tik `pageSize` ir `pageNum`: paieškos pagal pirkimo numerį,
  datą ar vykdytoją nėra.
- API nepriima naršyklės užklausų (nėra CORS), o raktas negali būti naršyklės kode.
- Išmatuota 2026-10-18: apie 80 400 pirkimų, iki 5 000 įrašų per puslapį (~7 MB, ~1 s), tvarka neapibrėžta. Nuo 2026-10-23 VPT
  leidžia ne daugiau kaip 1 000 įrašų puslapyje (didesnis - 400 „page size must not exceed 1000“): iki 2026-10-29 paslauga prašė
  5 000 ir sąrašas nuo spalio 23 d. nebeatsinaujino (rodyta paskutinė kopija ir jos laikas) - dabar `PUSLAPIS` 1000.

Todėl paslauga kas 6 valandas (`ATNAUJINIMAS_VAL`) parsisiunčia visą sąrašą (~82 užklausos su 2 s pauzėmis), laiko jį
atmintyje ir disko kopijoje (`/var/lib/g-procure-cvpis/cvpis.ndjson.gz`) ir atsako iš jos. Saugomi tik **vieši pirkimų
duomenys**; naudotojų duomenų paslauga nesaugo. Antrasis VPT API maršrutas (`cft-details-participants-info-export`) -
dalyvių informacija - nenaudojamas (duomenų mažinimas).

### Adresai (tik GET)

| Adresas | Atsakymas |
|---|---|
| `/api/cvpis/pirkimas/<5-9 skaitmenys>` | 200 - pirkimo duomenys, CVP IS nuoroda, sąrašo laikas; 404 - sąraše nėra (su sąrašo laiku); 503 - sąrašas dar neįkeltas |
| `/api/cvpis/paieska?...` | pirkimai pagal filtrus (bent vienas): `q` (žodžiai pavadinime, vykdytojo pavadinime ar numeryje, 3-100 ženklų), `vykdytojas` (žodžiai vykdytojo pavadinime), `ca` (vykdytojo kodas), `cpv` (BVPŽ pradžia, 2-8 skaitmenys, iki 5 per kablelį), `tipas` (Supplies / Services / Works), `budas` ir `busena` (VPT kodai; `busena=aktyvus` - terminas nepraėjęs, nenutrauktas), `nuo` / `iki` (paskelbimo data), `rikiuoti` (naujausi / terminas), `psl` (1-50, po 20); su bendru skaičiumi (nuo 2026-10-18b; iki tol - tik `q`) |
| `/api/cvpis/statistika?...` | tie patys filtrai: kiekiai pagal būdą, būseną, objektą, vertinimo kriterijų, direktyvą, kalbą; tarptautiniai, ES lėšos, dalimis, e. aukcionai, nutraukti, rinkos konsultacijos, aktyvūs; pasiūlymų teikimo laikotarpis (dienomis) pagal būdą ir tarptautinę vertę, dienos nuo termino iki sprendimo ir sutarties, numatoma vertė, trukmė mėnesiais - kvantiliai (tik nuo 5 reikšmių); paskelbimai pagal mėnesį (36), dažniausi vykdytojai (10); kešuojama iki naujo sąrašo |
| `/api/cvpis/dokumentai/<5-9 skaitmenys>` | nuo 2026-10-29: viešas pirkimo dokumentų paketas (ZIP) iš CVP IS, kaip jį atsisiunčia naršyklė be prisijungimo (pirkimo puslapis -> atsisiuntimo paruošimas -> ZIP su tuo pačiu seanso slapuku), perduodamas srautu; tik su G-Procure kilme (kitaip 403 `kilme`); 403 `prisijungimas` - CVP IS reikalauja prisijungti (pvz. konkretus pirkimas pagal DPS - tik DPS dalyviams), 404 `nera`, 413 `per_didelis` (> 250 MB), 502 `rysys` / `ne_zip`, 429 `uzimta` (3 vienu metu, 10 per 10 min. vienam IP); 180 s; į diską ir žurnalą (numeris, IP) nerašoma |
| `/api/cvpis/busena` | ar sąrašas įkeltas, kada atnaujintas, kiek įrašų, paskutinės klaidos laikas ir rūšis, kitas atnaujinimas |

Visi 38 OpenAPI aprašo laukai (`AbstractCftDetailsDTO`) laikomi; atsakyme laukai - tik išvardyti `cvpis-logika.js` (`TEKSTAI`, `DATOS`, `LOGINIAI` ir keli kiti). Datos VPT pateikiamos be laiko juostos
(`dd-mm-yyyy hh:mm:ss`) - grąžinamos `yyyy-mm-ddThh:mm:ss` be juostos; tai **Lietuvos laikas** (patikrinta įdiegus 2026-10-18:
pirkimo, kurio skelbime terminas 13:00 +03:00, API terminas - 13:00). Duomenys gali būti iki 6 val. senumo - modulis turi rodyti
sąrašo laiką ir nuorodą į CVP IS (terminas, pratęsimai ir aktualios redakcijos - ten). `procedure` ir `status` - VPT angliški kodai
(„Open“, „Simplified Open“, „Bid submission“ ...), `directive` - `prompt.directive.classic` / `utilities` / `none` / `defence` /
`concession` arba `null` (rinkos konsultacijos).

### Saugumas

- **Raktas.** `/etc/g-procure-cvpis/vpt_api_key` (root, 0600) perduodamas per systemd `LoadCredential` - paslauga jį
  skaito iš `$CREDENTIALS_DIRECTORY`, jis nėra aplinkos kintamasis, kode, saugykloje, žurnale ar atsakymuose.
- **Izoliacija.** systemd `DynamicUser` (naudotojas be teisių), `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`,
  `PrivateDevices`, `NoNewPrivileges`, be gebėjimų (`CapabilityBoundingSet=`), tik IP ir UNIX lizdai, `SystemCallFilter=@system-service`,
  rašyti galima tik `/var/lib/g-procure-cvpis`; atminties ir procesų ribos. Kodas - `/opt/g-procure-cvpis`, savininkas root.
- **Be priklausomybių.** Tik Node 18+ įtaisytieji moduliai - jokių npm paketų (tiekimo grandinės rizika).
- **Tinklas.** Klausomasi tik `127.0.0.1:3001`; iš išorės - per nginx `location /api/cvpis/`: tik GET / HEAD / OPTIONS,
  `limit_req` (60 per min., 30 iš karto), kūnas iki 1 KB, be prieigos žurnalo (kas ir kokio pirkimo ieškojo - nesaugoma;
  ribos atvejai lieka `error.log`, jais remiasi fail2ban). Antroji riba - paslaugoje (120 per min. vienam IP).
- **VPT atsakymas - nepatikimi duomenys.** Fiksuotas adresas (užklausa kitur neįmanoma), TLS tikrinamas, be nukreipimų,
  90 s ir 40 MB ribos puslapiui; kiekvienas įrašas tikrinamas (tipai, ilgiai, datos, TED nuorodos tik `https://ted.europa.eu/`,
  valdymo ir krypties ženklai šalinami). Naujas sąrašas pakeičia senąjį tik visas, kai jame bent 1 000 įrašų ir ne mažiau
  80 % ankstesnio; nepavykus lieka ankstesnis, kitas bandymas po 30 min. Disko kopija įrašoma atomiškai ir skaitant vėl tikrinama.
- **Užklausos.** Griežti keliai ir parametrai, įvestis atsakyme neatkartojama (tik patikrintas numeris), CORS - tik
  `https://g-procure.com`, `https://www.g-procure.com` ir vietinis tikrinimas, `X-Content-Type-Options`, `Content-Security-Policy:
  default-src 'none'`, `Referrer-Policy: no-referrer`. Neįkeltas sąrašas niekada nerodomas kaip „pirkimo nėra“ (503).
- **Žurnalas** (`journalctl -u g-procure-cvpis`): tik paleidimas, atnaujinimų suvestinės (kiekis, atmesta, puslapių, trukmė) ir
  klaidų rūšys - be užklausų turinio ir be rakto.

### Įdiegta 2026-10-18

- Pirmas atnaujinimas: 80 385 pirkimai, atmesta 0, 17 puslapių, 60 s; disko kopija 13,4 MB.
- Atmintis: po įkėlimo iš kopijos ~270 MB, pirmo atnaujinimo piko metu 538 MB - todėl V8 riba `--max-old-space-size=768`,
  systemd `MemoryHigh=1000M`, `MemoryMax=1200M` (atnaujinant atmintyje - senas ir naujas sąrašas).
- `systemd-analyze security g-procure-cvpis`: 1.5 („OK“).
- Išorės patikra: CORS tik g-procure.com, svetimai kilmei - be CORS, POST ir PUT - 403, 400 / 404 netinkamiems adresams,
  31 užklausa iš karto praeina, toliau - 429 (nginx 429 atsakyme CORS antraštės nėra - naršyklėje tai matoma kaip ryšio klaida;
  modulis turi rodyti „nepavyko, bandykite vėliau“), `/api/analyze` nepaliestas.
- Rasta diegiant ir ištaisyta: perkrovus paslaugą disko kopija buvo tikrinama kaip VPT atsakymas ir datos, BVPŽ bei NUTS
  dingdavo - įrašo tikrinimas dabar duoda tą patį rezultatą pakartotinai (testas „Pakartotinis tikrinimas nieko nekeičia“).

### Kas naudoja

- **PP-tiekejams** (nuo 2026-10-18): `GP_CVPIS.vptPirkimas` - blokas „CVP IS duomenys (VPT API)“ nurodžius pirkimą ar įkėlus paketą,
  termino palyginimas su paketu. Naujas modulis jungiamas taip pat: tik GET, būsenos per `shared/busena.js`, 503 ar ryšio klaida - ne
  „nėra“, atsakymo tekstai tik per ekranavimą, nuorodos sudaromos modulyje, CSP `connect-src` - `https://api.g-procure.com`.

### Failai

| Failas | Paskirtis |
|---|---|
| `cvpis-logika.js` | gryna logika: įrašų tikrinimas, indeksas, paieška, atsakymai (veikia ir naršyklėje - testams) |
| `cvpis-serveris.js` | Node serveris: VPT sąrašo atnaujinimas, disko kopija, HTTP |
| `g-procure-cvpis.service` | systemd paslauga su izoliacija |
| `nginx-cvpis.conf` | nginx `location` ir ribos zona |
| `testai.html` | testai (paleidžiami kartu su visais: `python3 .github/testai/paleisk.py serveris`) |

### Diegimas (Hetzner, vykdo serverio administratorius)

1. Patikrinti: `node --version` (reikia 18+), `free -m`, `systemctl --version`.
2. Kodas: `/opt/g-procure-cvpis/` - `cvpis-logika.js` ir `cvpis-serveris.js` (root:root, 0644; katalogas 0755); palyginti
   `sha256sum` su saugyklos failais; `node --check`.
3. Raktas: `install -d -m 700 /etc/g-procure-cvpis`, tada rakto failas `vpt_api_key` (0600) įvedamas neparodant ekrane
   (`read -rs`) - rakto reikšmė - iš VPT pranešimo; į komandų istoriją ir kitus failus nerašoma.
4. `g-procure-cvpis.service` -> `/etc/systemd/system/`, `systemd-analyze verify`, `systemctl daemon-reload`,
   `systemctl enable --now g-procure-cvpis`; po ~1 min. `journalctl -u g-procure-cvpis` - „atnaujinta“ su kiekiu.
5. nginx: ribos zona į `conf.d/gp-cvpis-limit.conf`, `location` į `api.g-procure.com` server bloką (prieš tai - atsarginė kopija
   į `/etc/nginx/sites-archive/`, ne į `sites-enabled/`), `nginx -t`, `systemctl reload nginx`.
6. Patikra: `curl https://api.g-procure.com/api/cvpis/busena`, pirkimas pagal numerį, CORS su `Origin: https://g-procure.com`
   ir svetima kilme, POST - 403, 61-a užklausa per minutę - 429, `systemd-analyze security g-procure-cvpis` (įvertis).

Keičiant kodą: atnaujinti `/opt/g-procure-cvpis/`, `systemctl restart g-procure-cvpis`. Raktą pakeisti - perrašyti
`/etc/g-procure-cvpis/vpt_api_key` ir `systemctl restart g-procure-cvpis`.

## Sankcijų sąrašų patikra (nuo 2026-11-08, dar neįdiegta)

Naudotojo sprendimas 2026-11-08: PP-esg tiekėjo patikrai - automatinė sankcijų sąrašų patikra; asmens duomenys - tik bendrovėms.
Paslauga kartą per parą parsisiunčia oficialius sąrašus ir atsako, ar tiekėjo pavadinimas (ir kodas) panašus į kurį nors sąraše esantį
subjektą. Ji nieko nesprendžia: grąžina galimus atitikmenis su balu ir paaiškinimu, o PP-esg juos rodo žmogui įvertinti.

### Šaltiniai (vieši, be raktų; `sankcijos-logika.js` `SARASAI`)

| Sąrašas | Failas | 2026-11-08 |
|---|---|---|
| ES konsoliduotas finansinių sankcijų sąrašas (FSF XML 1.1) | `webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=...` - raktas viešas (jį skelbia oficialus FSF RSS ir data.europa.eu) | HTTP 500 visiems formatams (bandyta kelis kartus); sandara - pagal XSD 1.1 (`sanctionEntity`, `subjectType code`, `nameAlias wholeName`, `regulation programme`, `address`, `identification`) |
| JT Saugumo Tarybos konsoliduotas sąrašas | `scsanctions.un.org/resources/xml/en/consolidated.xml` | 2,2 MB, 274 subjektai (733 asmenys neskaitomi) |
| OFAC (JAV) SDN ir kiti sąrašai | `sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML` ir `CONSOLIDATED.XML` (reikia User-Agent) | 29,6 + 1,1 MB, 10 388 subjektai (be dvigubų) |
| JK sankcijų sąrašas (FCDO) | `sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.xml` (OFSI sąrašas uždarytas 2026-01-28) | 22 MB, 1 667 subjektai |

Iš failų skaitomi tik **subjektų** įrašai (pavadinimas, kiti pavadinimai, šalys, programa ar režimas, registracijos ir mokesčių kodai,
oficiali nuoroda: OFAC paieškos įrašas, ES - EUR-Lex reglamentas); fizinių asmenų, laivų ir orlaivių įrašai neskaitomi ir nesaugomi.
Naujas sąrašas priimamas tik visas, jei jame ne mažiau subjektų nei `min` (JT 150, OFAC 5 000, JK 800, ES 500) ir ne mažiau 80 % ankstesnio.
Kiekvienas sąrašas atnaujinamas atskirai kas 24 val.; nepavykus lieka paskutinė kopija, kitas bandymas po 2 val., ES - iki 6 bandymų su
ilgėjančiomis pauzėmis (ES serveris kartais iš eilės atsako HTTP 500). Kopija senesnė kaip 72 val. atsakyme pažymima `pasenusi`.

### Adresai (tik GET)

| Adresas | Atsakymas |
|---|---|
| `/api/sankcijos/tikrinti?pavadinimas=...&salis=LT&kodas=...` | 200 - kiekvieno sąrašo būsena (`patikrinta` su data, subjektų ir kandidatų skaičiumi; `nepatikrinta` su klaidos rūšimi - niekada „0 kandidatų“; `pasenusi`) ir kandidatai (iki 10 viename sąraše, 30 iš viso): sąrašas, pavadinimas, kuris kitas pavadinimas sutapo, šalys, programos, nuoroda, balas 0-100, „kodėl“; 400 su `parametras` (pavadinimas 2-200 ženklų ir bent 2 raidės, šalis - ISO2, kodas - 5-20 raidžių ir skaitmenų, kiti parametrai neleidžiami); 503 - nė vienas sąrašas neįkeltas |
| `/api/sankcijos/busena` | kiekvieno sąrašo būsena |

Įvestis atsakyme neatkartojama. Atitikimas: pavadinimai normalizuojami (diakritikai, kirilica lotyniškai, teisinės formos UAB / ООО / LLC / Sp. z o.o. ir kt.,
kabutės, žodžių tvarka, transliteracijos skirtumai ilgesniuose žodžiuose), balas - užklausos ir pavadinimo žodžių padengimas; reikia bent
vieno sutampančio ne bendrinio žodžio, vienas žodis ilgame pavadinime - ne atitikmuo, šalis keičia balą (+5 / -10), tiksliai sutampantis
registracijos kodas - 100. Slenkstis - 70. Išmatuota 2026-11-08: 3 000 tikrų LT įmonių pavadinimų (JAR atviri duomenys) - kandidatų rasta 4
(0,13 %; pvz. „KOMPONENTAS“ - „KOMPONENTA AO“), visi žinomi tikri atvejai (kiti pavadinimai, transliteracija, žodžių tvarka, rašybos klaida) - rasti;
paieška - iki kelių ms, sąrašų skaitymas ir indeksas - ~0,3 s.

### Saugumas

Kaip CVP IS paslauga: atskira systemd paslauga (`DynamicUser`, griežta izoliacija, be raktų), klausosi tik `127.0.0.1:3002`, nginx - tik GET /
HEAD / OPTIONS, `limit_req` 30 per min., be prieigos žurnalo (užklausoje - tiekėjo pavadinimas), antroji riba paslaugoje (60 per min. vienam IP),
CORS tik `https://g-procure.com`, `https://www.g-procure.com` ir vietiniam tikrinimui. Sąrašų adresai - konstantos, be nukreipimų, 120 MB riba,
laiko riba; disko kopijos (`/var/lib/g-procure-sankcijos/sankcijos-<sąrašas>.ndjson.gz`) įrašomos atomiškai ir skaitant vėl tikrinamos.
Žurnale - tik sąrašas, subjektų skaičius, praleistų asmenų skaičius ir klaidos rūšis.

### Failai

| Failas | Paskirtis |
|---|---|
| `sankcijos-logika.js` | gryna logika: sąrašų skaitymas, normalizavimas, atitikmenys, atsakymai (veikia ir naršyklėje - testams) |
| `sankcijos-serveris.js` | Node serveris: sąrašų atnaujinimas, disko kopijos, HTTP |
| `g-procure-sankcijos.service` | systemd paslauga |
| `nginx-sankcijos.conf` | nginx `location` ir ribos zona |

Diegimas - kaip CVP IS paslaugos (1, 2, 4-6 žingsniai; raktų nėra): kodas į `/opt/g-procure-sankcijos/`, paslauga `g-procure-sankcijos`,
ribos zona `conf.d/gp-sankcijos-limit.conf`, `location /api/sankcijos/` - į `api.g-procure.com` server bloką. Po paleidimo per ~1-15 min.
`journalctl -u g-procure-sankcijos` - „atnaujinta“ kiekvienam sąrašui (ES gali būti „atnaujinti-nepavyko“ - tada PP-esg rodo „nepatikrinta“).

### Kas naudoja

- **PP-esg** (nuo 2026-11-08): patikros lange - „Tikrinti sankcijų sąrašuose automatiškai“ (tik bendrovėms; fizinio asmens įmonėms nesiūloma,
  neaiškiai teisinei formai - klausiama). Rezultatas - sąrašų būsenos ir kandidatai; kiekvieną įvertina žmogus, siūlomą rezultatą pasirenka žmogus.
