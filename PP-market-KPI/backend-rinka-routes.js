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
 * kliento JavaScript'e matomas visiems - CLAUDE.md tai draudžia. OSP (VDA) rakto
 * nereikalauja, todėl VDA rodikliai imami TIESIAI iš naršyklės (žr. osp.js), ir
 * šio maršruto jiems nereikia.
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

/* Rodiklio ID modulyje -> FRED serija. Pavadinimai ir dažniai patikrinti FRED kataloge. */
const SERIJOS = {
  brent:  { serija: 'DCOILBRENTEU', daznis: 'd.',   saltinis: 'FRED / EIA - Brent (Europe), $/bbl' },
  wti:    { serija: 'DCOILWTICO',   daznis: 'd.',   saltinis: 'FRED / EIA - WTI (Cushing), $/bbl' },
  lme_al: { serija: 'PALUMUSDM',    daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Aluminum, $/t' },
  lme_cu: { serija: 'PCOPPUSDM',    daznis: 'mėn.', saltinis: 'FRED / IMF - Global price of Copper, $/t' }
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

router.get('/', limiter, async (req, res) => {
  if (!FRED_API_KEY) {
    return res.status(503).json({ rodikliai: [], klaidos: [{ id: '*', priezastis: 'FRED_API_KEY nenustatytas serveryje' }] });
  }
  const prasomi = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
  const ids = prasomi.length ? prasomi.filter(id => SERIJOS[id]) : Object.keys(SERIJOS);
  const rodikliai = [], klaidos = [];
  await Promise.all(ids.map(async id => {
    try {
      const eil = await imkSerija(id);
      const pask = eil[eil.length - 1];
      rodikliai.push({
        id: id,
        laikotarpis: pask.laikotarpis,
        reiksme: pask.reiksme,
        daznis: SERIJOS[id].daznis,
        saltinis: SERIJOS[id].saltinis,
        // Kasdienei serijai atiduodam ir istoriją - modulis is jos atkuria savaitinę seriją.
        eilute: SERIJOS[id].daznis === 'd.' ? eil : null
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
