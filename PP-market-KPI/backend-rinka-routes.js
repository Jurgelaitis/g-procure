/* ============================================================================
 * PP-market-KPI - Backend Express route (globalūs rinkos rodikliai)
 * ----------------------------------------------------------------------------
 * ĮTERPIMO INSTRUKCIJA (Hetzner, /var/www/g-procure/):
 *   1. Nukopijuok šį failą į ./routes/rinka.js
 *   2. index.js faile, šalia kitų maršrutų, pridėk:
 *          const rinka = require('./routes/rinka');
 *          app.use('/api/rinka', rinka);
 *   3. .env faile pridėk NEMOKAMĄ FRED raktą (registracija:
 *      https://fred.stlouisfed.org/docs/api/api_key.html):
 *          FRED_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   4. pm2 restart g-procure
 *
 * KODĖL PER SERVERĮ, O NE TIESIAI IŠ NARŠYKLĖS. FRED reikalauja rakto, o raktas
 * kliento JavaScript'e matomas visiems - CLAUDE.md tai draudžia. NY Fed rakto nereikalauja,
 * bet jo failo naršyklė tiesiai negauna (atsakyme nėra CORS antraštės). OSP (VDA) ir Eurostat
 * rakto nereikalauja ir kreiptis iš naršyklės leidžia, todėl tie rodikliai imami TIESIAI
 * (žr. osp.js, rinka.js), ir šio maršruto jiems nereikia.
 *
 * KĄ GRĄŽINA: { rodikliai: [{ id, laikotarpis, reiksme, daznis, saltinis }], klaidos: [] }
 *   `laikotarpis` - ISO data (YYYY-MM-DD), tas, kurį paskelbė šaltinis.
 *   `daznis` - "d." (kasdienis) arba "mėn." (mėnesinis). Modulis pagal tai sprendžia,
 *              ar galima atkurti visą savaitinę seriją, ar tik naujausią tašką.
 *
 * DAŽNIO APRIBOJIMAS (svarbu - ne mūsų sprendimas, o šaltinio):
 *   Brent ir WTI FRED skelbia KASDIEN, tad savaitinę seriją atkuriam pilnai.
 *   Aliuminio ir vario pasaulinės kainos skelbiamos TIK MĖNESINĖS - LME dienos
 *   kainos yra mokamos. Todėl jiems grąžinam tik naujausią reikšmę ir pažymim
 *   `daznis:"mėn."`; modulis tada neapsimeta, kad turi savaitinę istoriją.
 * ==========================================================================*/

const express = require('express');
const router = express.Router();

let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch (_) { rateLimit = null; }

const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_URL = 'https://api.stlouisfed.org/fred/series/observations';
const GSCPI_URL = 'https://www.newyorkfed.org/medialibrary/research/interactives/data/gscpi/gscpi_interactive_data.csv';

/* Rodiklio ID modulyje -> FRED serija. Pavadinimai ir dažniai patikrinti FRED kataloge. */
const SERIJOS = {
  brent:  { serija: 'DCOILBRENTEU', daznis: 'd.',   saltinis: 'FRED / EIA - Brent (Europe), $/bbl' },
  wti:    { serija: 'DCOILWTICO',   daznis: 'd.',   saltinis: 'FRED / EIA - WTI (Cushing), $/bbl' },
  lme_al: { serija: 'PALUMUSDM',    daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Aluminum, $/t' },
  lme_cu: { serija: 'PCOPPUSDM',    daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Copper, $/t' },
  /* 2026-10-29 - rinkos profiliams kitoms EPSO-G grupės įmonėms (dujų perdavimas, energijos kaupimas). Pavadinimai
     patikrinti FRED kataloge 2026-10-29; JAV gamintojų kainų indeksai (WPU) - pasaulinių kainų pakaitalas, kur nemokamos
     pasaulinės serijos nėra. */
  dujos_eu:         { serija: 'PNGASEUUSDM', daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Natural gas, EU, $/MMBtu' },
  plienas:          { serija: 'WPU1017',     daznis: 'mėn.', saltinis: 'FRED / BLS - PPI by Commodity: Steel Mill Products (JAV), indeksas' },
  plieno_vamzdziai: { serija: 'WPU101706',   daznis: 'mėn.', saltinis: 'FRED / BLS - PPI by Commodity: Steel Pipe and Tube (JAV), indeksas' },
  gelezies_ruda:    { serija: 'PIORECRUSDM', daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Iron Ore, $/t' },
  nikelis:          { serija: 'PNICKUSDM',   daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Nickel, $/t' },
  cinkas:           { serija: 'PZINCUSDM',   daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Zinc, $/t' },
  /* 2026-11-03 - krovinių kainos (iki tol vestos ranka). Baltic Exchange, Drewry ir TAC rodiklių skelbti be licencijos negalima,
     nemokamų ES mėnesinių indeksų nėra, todėl - JAV kainų indeksai kaip krypties ženklas (BLS duomenys vieši). Pavadinimai patikrinti FRED 2026-11-03. */
  container: { serija: 'PCU483111483111', daznis: 'mėn.', saltinis: 'FRED / BLS - PPI by Industry: Deep Sea Freight Transportation (JAV), indeksas' },
  aircargo:  { serija: 'IC131',           daznis: 'mėn.', saltinis: 'FRED / BLS - Inbound Price Index (International Services): Air Freight (JAV), indeksas' },
  /* Ne FRED: Niujorko federalinio rezervo banko failas. Standartiniai nuokrypiai nuo istorinio vidurkio, gali būti neigiami. */
  gscpi:     { imk: imkGscpi, daznis: 'mėn.', saltinis: 'Federal Reserve Bank of New York - Global Supply Chain Pressure Index' }
};

const limiter = rateLimit
  ? rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
  : (req, res, next) => next();

function priesMetus(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

async function imkSerija(id) {
  const cfg = SERIJOS[id];
  const u = FRED_URL + '?series_id=' + encodeURIComponent(cfg.serija) +
            '&file_type=json&observation_start=' + priesMetus(2) +
            '&api_key=' + encodeURIComponent(FRED_API_KEY);
  const r = await fetch(u);
  if (!r.ok) throw new Error('FRED HTTP ' + r.status);
  const d = await r.json();
  const obs = (d && d.observations) || [];
  /* FRED trūkstamą stebėjimą žymi tašku ("."). Jį BŪTINA išmesti: Number(".") yra NaN,
     bet neatsargus kodas tokį tašką paverstų nuliu ir grafike atsirastų netikras kritimas. */
  const svarus = obs
    .filter(o => o && o.value !== '.' && isFinite(Number(o.value)))
    .map(o => ({ laikotarpis: o.date, reiksme: Number(o.value) }));
  if (!svarus.length) throw new Error('serija be stebėjimų (galbūt nebeatnaujinama)');
  return svarus;
}

/* NY Fed CSV: pirma eilutė „Date,Jan-22,...,Oct-26“ - kiekvienas stulpelis yra atskiro mėnesio paskelbta versija (senesnės reikšmės
   vėliau patikslinamos), todėl imam paskutinį stulpelį su reikšmėmis. Eilutė - „30-Sep-2026,...“, nesamas stebėjimas - „#N/A“ arba tuščia.
   Sandarai pasikeitus - klaida su priežastimi, ne tuščias ar svetimas rezultatas. */
const MENESIAI = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
function skaitykGscpi(csv) {
  const eil = String(csv || '').replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.split(','));
  if (String(eil[0][0]).trim() !== 'Date') throw new Error('GSCPI: netikėta failo sandara');
  for (let st = eil[0].length - 1; st > 0; st--) {
    const rez = [];
    eil.slice(1).forEach(e => {
      const d = /^(\d{1,2})-([A-Z][a-z]{2})-(\d{4})$/.exec(String(e[0] || '').trim());
      const v = String(e[st] === undefined ? '' : e[st]).trim();
      if (d && MENESIAI[d[2]] && v !== '' && isFinite(Number(v))) rez.push({ laikotarpis: d[3] + '-' + MENESIAI[d[2]] + '-01', reiksme: Number(v) });
    });
    if (rez.length) {
      if (rez.length < 12) throw new Error('GSCPI: per mažai stebėjimų');
      return rez.sort((a, b) => (a.laikotarpis < b.laikotarpis ? -1 : 1));
    }
  }
  throw new Error('GSCPI: stebėjimų nėra');
}

/* Indeksas skelbiamas kartą per mėnesį, todėl failo kiekvienai užklausai neklausiam: kopija atmintyje 6 val.,
   o nepavykus - paskutinė sėkminga (ji tikra, tik gal senesnė; modulis rodo jos laikotarpį). */
const GSCPI_KESAS_MS = 6 * 3600 * 1000;
let gscpiKesas = null;
async function imkGscpi() {
  if (gscpiKesas && Date.now() - gscpiKesas.laikas < GSCPI_KESAS_MS) return gscpiKesas.eil;
  try {
    const r = await fetch(GSCPI_URL, { headers: { 'User-Agent': 'G-Procure (+https://g-procure.com)' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('NY Fed HTTP ' + r.status);
    const eil = skaitykGscpi(await r.text());
    gscpiKesas = { laikas: Date.now(), eil };
    return eil;
  } catch (e) {
    if (gscpiKesas) return gscpiKesas.eil;
    throw e;
  }
}

router.get('/', limiter, async (req, res) => {
  if (!FRED_API_KEY) {
    return res.status(503).json({ rodikliai: [], klaidos: [{ id: '*', priezastis: 'FRED_API_KEY nenustatytas serveryje' }] });
  }
  const prasomi = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
  const ids = prasomi.length ? prasomi.filter(id => SERIJOS[id]) : Object.keys(SERIJOS);
  const rodikliai = [], klaidos = [];
  await Promise.all(ids.map(async id => {
    try {
      const eil = await (SERIJOS[id].imk ? SERIJOS[id].imk() : imkSerija(id));
      const pask = eil[eil.length - 1];
      rodikliai.push({
        id: id,
        laikotarpis: pask.laikotarpis,
        reiksme: pask.reiksme,
        daznis: SERIJOS[id].daznis,
        saltinis: SERIJOS[id].saltinis,
        // Kasdienei serijai atiduodam ir istoriją - modulis is jos atkuria savaitinę seriją.
        eilute: SERIJOS[id].daznis === 'd.' ? eil : null,
        // Mėnesinei serijai (2026-10-29) - iki 24 paskutinių mėnesių: modulis iš jų skaičiuoja metinį pokytį.
        // Atskiras laukas, kad ankstesnė modulio versija (skaito tik `eilute`) elgtųsi kaip iki tol.
        menesine: SERIJOS[id].daznis === 'mėn.' ? eil.slice(-24) : null
      });
    } catch (e) {
      klaidos.push({ id: id, priezastis: (e && e.message) || String(e) });
    }
  }));
  // Trumpas kešas: rinkos duomenys keičiasi kartą per dieną, o FRED turi kvietimų ribas.
  res.set('Cache-Control', 'public, max-age=1800');
  res.json({ rodikliai, klaidos });
});

module.exports = router;
module.exports.skaitykGscpi = skaitykGscpi;
