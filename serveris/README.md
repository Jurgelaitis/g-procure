# G-Procure serverio paslaugos

## CVP IS duomenų paslauga (VPT API)

Naudotojo sprendimas 2026-10-18: VPT CVP IS API naudoti per G-Procure serverį (Hetzner), saugumo lygis - aukštas.

### Kodėl reikia serverio ir duomenų kopijos

- VPT API (`POST https://viesiejipirkimai.lt/epps-integration/api/cft-details-export`, antraštė `apiKey`) aprašyta VPT
  pranešime ([2026-05-20](https://vpt.lrv.lt/lt/naujienos-3/del-api-funkcionalumo-papildymo-w0Y/)) ir viešame OpenAPI apraše
  (`/epps-integration/v3/api-docs`). Užklausos parametrai - tik `pageSize` ir `pageNum`: paieškos pagal pirkimo numerį,
  datą ar vykdytoją nėra.
- API nepriima naršyklės užklausų (nėra CORS), o raktas negali būti naršyklės kode.
- Išmatuota 2026-10-18: apie 80 400 pirkimų, iki 5 000 įrašų per puslapį (~7 MB, ~1 s), tvarka neapibrėžta.

Todėl paslauga kas 6 valandas (`ATNAUJINIMAS_VAL`) parsisiunčia visą sąrašą (~17 užklausų su 2 s pauzėmis), laiko jį
atmintyje ir disko kopijoje (`/var/lib/g-procure-cvpis/cvpis.ndjson.gz`) ir atsako iš jos. Saugomi tik **vieši pirkimų
duomenys**; naudotojų duomenų paslauga nesaugo. Antrasis VPT API maršrutas (`cft-details-participants-info-export`) -
dalyvių informacija - nenaudojamas (duomenų mažinimas).

### Adresai (tik GET)

| Adresas | Atsakymas |
|---|---|
| `/api/cvpis/pirkimas/<5-9 skaitmenys>` | 200 - pirkimo duomenys, CVP IS nuoroda, sąrašo laikas; 404 - sąraše nėra (su sąrašo laiku); 503 - sąrašas dar neįkeltas |
| `/api/cvpis/paieska?q=<3-100 ženklų>` | iki 20 pirkimų pagal pavadinimą, vykdytoją ar numerį (be diakritikų, visi žodžiai), naujausi pirmi, ir bendras skaičius |
| `/api/cvpis/busena` | ar sąrašas įkeltas, kada atnaujintas, kiek įrašų, paskutinės klaidos laikas ir rūšis, kitas atnaujinimas |

Laukai - tik išvardyti `cvpis-logika.js` (`TEKSTAI`, `DATOS`, `LOGINIAI` ir keli kiti). Datos VPT pateikiamos be laiko juostos
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
