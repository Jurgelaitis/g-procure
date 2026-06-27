# PP-ESG · CVP IS importo įdiegimas serveryje (žingsnis po žingsnio)

Šios instrukcijos tikslas — kad PP-ESG modulio mygtukas **„Importuoti iš CVP IS"** rodytų realius duomenis, o ne demonstracinį rinkinį. Tam reikia įdiegti naują maršrutą (failą `backend-pp-esg-routes.js`) į jūsų esamą `api.g-procure.com` serverį.

> **Kodėl to reikia:** GitHub Pages (kur veikia HTML) neturi backend. O `get.data.gov.lt` neleidžia kreiptis tiesiai iš naršyklės (CORS), todėl duomenys turi eiti per jūsų serverį. Kol naujasis maršrutas neįdiegtas, modulis rodo demonstracinius duomenis.

**Prieš pradedant jums reikės:**
- „Mac" kompiuterio programos **Terminal** (rasite per Spotlight: `Cmd + tarpas`, įrašykite „Terminal").
- Prisijungimo prie serverio (taip pat, kaip jungėtės/jungiasi diegiant kitus modulius). Serverio adresas: **178.105.219.33**. Naudotojas dažniausiai **root** (jei naudojate kitą — pakeiskite komandose).
- Failo `backend-pp-esg-routes.js`, kuris yra jūsų aplanke `Documents/Projects/PP-esg/`.

Visos komandos rašomos Terminale ir patvirtinamos klavišu **Enter**.

---

## 1 žingsnis. Atidarykite Terminal
Paspauskite `Cmd + tarpas`, įrašykite **Terminal**, paspauskite Enter. Atsidarys juodas/baltas langas, kuriame rašysite komandas.

---

## 2 žingsnis. Nukopijuokite maršruto failą į serverį
Terminale įrašykite **vieną** komandą (jei naudotojas ne `root`, pakeiskite jį savuoju):

```bash
scp "/Users/aj/Documents/Projects/PP-esg/backend-pp-esg-routes.js" root@178.105.219.33:/var/www/g-procure/
```

- Jei paklaus „Are you sure you want to continue connecting" — įrašykite `yes` ir Enter.
- Jei paklaus slaptažodžio — įveskite serverio slaptažodį (rašant jis nematomas — tai normalu) ir Enter.
- Sėkmės atveju pamatysite eilutę su `100%` (failas nukopijuotas).

---

## 3 žingsnis. Prisijunkite prie serverio
```bash
ssh root@178.105.219.33
```
Įveskite slaptažodį. Prisijungus eilutės pradžia pasikeis (pvz. `root@g-procure-server:~#`) — vadinasi, dabar dirbate serveryje.

---

## 4 žingsnis. Nueikite į backend katalogą
```bash
cd /var/www/g-procure
```

---

## 5 žingsnis. Įdiekite vieną papildomą komponentą
```bash
npm install express-rate-limit
```
Palaukite, kol baigs (kelios sekundės). *(Šis komponentas riboja užklausų dažnį. Jei diegimas nepavyktų — nieko tragiško, maršrutas veiks ir be jo.)*

---

## 6 žingsnis. Įjunkite maršrutą faile `index.js`
Atidarykite failą redaguoti:
```bash
nano index.js
```
Atsidarys teksto redaktorius. Reikia pridėti **vieną eilutę**:

```js
app.use('/api/esg', require('./backend-pp-esg-routes'));
```

**Kur ją įdėti:** slinkite žemyn (rodyklėmis arba `Ctrl + V` puslapiui žemyn), kol rasite eilutę, kuri prasideda **`app.listen(`** (paprastai pačioje failo apačioje). Įrašykite naują eilutę **virš** `app.listen(...)`.

Pavyzdžiui, turi atrodyti maždaug taip:
```js
app.use('/api/esg', require('./backend-pp-esg-routes'));   // <- ši nauja eilutė
app.listen(PORT, () => console.log('Server running'));
```

**Išsaugojimas:** paspauskite `Ctrl + O`, tada Enter (išsaugo). **Išėjimas:** `Ctrl + X`.

---

## 7 žingsnis. Perkraukite serverio procesą
```bash
pm2 restart g-procure
```
Pamatysite lentelę su procesu `g-procure` ir būsena `online`.

---

## 8 žingsnis. Patikrinkite, ar nėra klaidų
```bash
pm2 logs g-procure --lines 30
```
Jei matote `Server running` ir nėra raudonų `Error` eilučių — viskas gerai. Peržiūrėję spauskite `Ctrl + C` (išeisite iš žurnalo, procesas liks veikti).

---

## 9 žingsnis. Išbandykite endpoint'ą naršyklėje
Atidarykite naršyklėje šį adresą:
```
https://api.g-procure.com/api/esg/cvpis-suppliers?buyer=302564383&from=2023-01-01
```

Galimi rezultatai:

- **A. Matote tiekėjų sąrašą** (tekstas su `"suppliers": [ ... ]`) → **pavyko!** Grįžkite į PP-ESG, paspauskite „Importuoti iš CVP IS" → „Ieškoti CVP IS". Geltonas „demonstraciniai duomenys" pranešimas turi dingti, atsiras realūs tiekėjai.

- **B. Matote klaidą** su `"detail": "Atn1 HTTP 404"` arba tuščią `"suppliers": []` → kelias geras, bet **reikia patikslinti laukų pavadinimus**. Tada atlikite 10 žingsnį.

---

## 10 žingsnis (tik jei B atvejis). Surinkite laukų pavadinimus
Atidarykite naršyklėje šiuos tris adresus ir nukopijuokite man po vieną įrašą (arba laukų pavadinimus) iš kiekvieno:
```
https://get.data.gov.lt/datasets/gov/vpt/new/Atn1?limit(3)
https://get.data.gov.lt/datasets/gov/vpt/new/Atn1ContractList?limit(3)
https://get.data.gov.lt/datasets/gov/vpt/new/Atn1ContractedCandidateList?limit(3)
```
Atsiuntę man tuos pavyzdžius, aš įrašysiu tikslius laukų pavadinimus į failą `backend-pp-esg-routes.js` (į `F` žemėlapį), ir pakartosite 2, 7 žingsnius (nukopijuoti failą + perkrauti).

---

## Jei kažkas nepavyko (atstatymas)
Maršrutą galima saugiai išjungti: pakartokite 3–4 ir 6 žingsnius, ištrinkite pridėtą eilutę `app.use('/api/esg', ...)`, išsaugokite (`Ctrl+O`, Enter, `Ctrl+X`), tada `pm2 restart g-procure`. Modulis vėl rodys demonstracinius duomenis, niekas kita nenukentės.

---

## Trumpa komandų santrauka (kopijavimui)
```bash
# 2. nukopijuoti failą į serverį (iš savo Mac)
scp "/Users/aj/Documents/Projects/PP-esg/backend-pp-esg-routes.js" root@178.105.219.33:/var/www/g-procure/

# 3-5. prisijungti ir paruošti
ssh root@178.105.219.33
cd /var/www/g-procure
npm install express-rate-limit

# 6. įjungti maršrutą (nano index.js -> pridėti eilutę virš app.listen):
#    app.use('/api/esg', require('./backend-pp-esg-routes'));

# 7-8. perkrauti ir patikrinti
pm2 restart g-procure
pm2 logs g-procure --lines 30
```

> **Pastaba dėl CORS:** papildomai nieko keisti nereikia. Naujasis maršrutas naudoja tą patį Express serverį kaip `/api/vpt` ir `/api/analyze`, todėl paveldi esamus CORS nustatymus.
