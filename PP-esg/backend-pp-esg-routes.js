/* ============================================================================
 * PP-ESG - Backend Express route additions
 * ----------------------------------------------------------------------------
 * Įterpimo instrukcija / Insertion guide:
 *   1. Šis failas yra Express Router modulis. Įdėk jį šalia esamo serverio,
 *      pvz. ./routes/ppEsg.js
 *   2. Pagrindiniame serverio faile (server.js / index.js), kur jau registruoji
 *      kitų modulių proxy maršrutus, pridėk:
 *
 *          const ppEsg = require('./routes/ppEsg');
 *          app.use('/api/esg', ppEsg);
 *
 *   3. Įsitikink, kad ANTHROPIC_API_KEY yra .env faile (NIEKADA ne HTML'e).
 *      Kaip ir kituose moduliuose, raktas lieka tik serveryje.
 *
 * Saugumas / Security (žr. komentarus prie kiekvieno endpoint):
 *   - Įvesties validacija (ribojamas ilgis, tipai) - žemiau `validateBody`.
 *   - Rate limiting - `assessmentLimiter` (express-rate-limit).
 *   - Jokių vartotojo duomenų nepersiunčiame į logus.
 *   - CORS: leisk tik savo modulių domenus (pritaikyk allowlist žemiau).
 * ==========================================================================*/

const express = require('express');
const router = express.Router();

/* ------------------------------------------------------------------ *
 * Priklausomybės, kurių gali prireikti (jei dar neįdiegtos):
 *     npm i express-rate-limit
 * Node 18+ turi įmontuotą global fetch (naudojam jį Anthropic API kvietimui).
 * ------------------------------------------------------------------ */
let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch (_) { rateLimit = null; }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
// Preliminaraus sankcijų rizikos vertinimo instrukcija (LT / EN) - privatus serverio failas šalia DI užduočių šablonų
// (/var/www/g-procure/uzduotys/_pp-esg-sankcijos.js; kopija - g-procure-privatu/serveris/uzduotys/). Įkeliama pirmą kartą prireikus;
// nėra - vertinimas neteikiamas (503), serveris veikia toliau.
let _esgInstrukcija = null;
function esgInstrukcija(lang) {
  try {
    if (!_esgInstrukcija) _esgInstrukcija = require(process.env.GP_ESG_INSTRUKCIJA || './uzduotys/_pp-esg-sankcijos.js');
    const t = _esgInstrukcija.sistema(lang === 'en' ? 'en' : 'lt');
    return typeof t === 'string' && t ? t : null;
  } catch (_) { return null; }
}

/* ---- Rate limiter: brangiems AI kvietimams (apsauga nuo piktnaudžiavimo) ---- */
const assessmentLimiter = rateLimit
  ? rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
      message: { error: 'Per daug užklausų. Bandykite po minutės. / Too many requests.' } })
  : (req, res, next) => next(); // no-op, jei paketas neįdiegtas

/* ---- Įvesties validacija ---- */
function clampStr(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
function validateAssessmentBody(body) {
  if (!body || typeof body !== 'object') return null;
  const lang = body.lang === 'en' ? 'en' : 'lt';
  const s = body.supplier || {};
  const supplier = {
    name: clampStr(s.name, 200),
    country: clampStr(s.country, 100),
    category: clampStr(s.category, 200),
  };
  const context = clampStr(body.context, 2000);
  if (!supplier.name && !context) return null; // bent kažkiek konteksto
  return { lang, supplier, context };
}

/* Modelio JSON taisymas - tos pačios taisyklės kaip shared/ai-proxy.js taisykJson (serveris shared/ importuoti negali).
   Neekranuota kabutė ar eilutės lūžis eilutėje taisomi; nutrūkęs JSON netaisomas - tada klaida. */
const REIKSME_PO_KABLELIO = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(?:[,\]}]|$)/;
function taisykJson(s) {
  let out = '', i = 0, expect = 'value';
  const n = s.length, stack = [];
  const top = () => stack[stack.length - 1];
  const praleisk = (k) => { while (k < n && /\s/.test(s.charAt(k))) k++; return k; };
  while (i < n) {
    const ch = s.charAt(i);
    if (ch === '"') {
      let j = i + 1, str = '"', uzdaryta = false;
      while (j < n) {
        const c = s.charAt(j);
        if (c === '\\') { str += c + s.charAt(j + 1); j += 2; continue; }
        if (c === '\n') { str += '\\n'; j++; continue; }
        if (c === '\r') { str += '\\r'; j++; continue; }
        if (c === '\t') { str += '\\t'; j++; continue; }
        if (c !== '"') { str += c; j++; continue; }
        const k = praleisk(j + 1), nx = s.charAt(k);
        let closes;
        if (expect === 'key') closes = nx === ':';
        else if (nx === ',') {
          const kk = praleisk(k + 1), nn = s.charAt(kk);
          closes = top() === 'o' ? nn === '"' : (/["{\[]/.test(nn) || REIKSME_PO_KABLELIO.test(s.slice(kk, kk + 40)));
        }
        else if (nx === '}') closes = top() === 'o';
        else if (nx === ']') closes = top() === 'a';
        else closes = k >= n;
        if (closes) { str += '"'; j++; uzdaryta = true; break; }
        str += '\\"'; j++;
      }
      out += str; i = j;
      if (!uzdaryta) return out;
      expect = expect === 'key' ? 'colon' : 'end';
      continue;
    }
    if (ch === '{') { stack.push('o'); expect = 'key'; }
    else if (ch === '[') { stack.push('a'); expect = 'value'; }
    else if (ch === '}' || ch === ']') { stack.pop(); expect = 'end'; }
    else if (ch === ':') expect = 'value';
    else if (ch === ',') expect = top() === 'o' ? 'key' : 'value';
    out += ch; i++;
  }
  return out;
}
function skaitykJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  const t = match ? match[0] : String(text || '');
  try { return JSON.parse(t); } catch (_) { /* taisoma žemiau */ }
  try { return JSON.parse(taisykJson(t)); } catch (_) { return null; }
}

/* ============================================================================
 * 1) POST /api/esg/sanctions-assessment
 *    AI PRELIMINARUS sankcijų rizikos vertinimas per Claude API proxy.
 *    SVARBU: AI niekada nepateikia galutinio „švarus/blokuotas" verdikto.
 *    Grąžina struktūrizuotą JSON: { level, factors[], actions[], disclaimer }
 * ==========================================================================*/
router.post('/sanctions-assessment', assessmentLimiter, async (req, res) => {
  const input = validateAssessmentBody(req.body);
  if (!input) return res.status(400).json({ error: 'Netinkami įvesties duomenys / Invalid input.' });
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ error: 'AI paslauga nesukonfigūruota (nėra API rakto).' });

  const { lang, supplier, context } = input;

  // Sistemos instrukcija - privačiame serverio faile (nuo 2026-11-08, naudotojo sprendimas - kodo apsauga); be jo vertinimas neteikiamas
  const sys = esgInstrukcija(lang);
  if (!sys) return res.status(503).json({ error: 'AI paslauga nesukonfigūruota (nėra instrukcijos).' });

  const userMsg = (lang === 'en' ? 'Supplier:\n' : 'Tiekėjas:\n') +
    `- ${lang === 'en' ? 'Name' : 'Pavadinimas'}: ${supplier.name || 'n/a'}\n` +
    `- ${lang === 'en' ? 'Country' : 'Šalis'}: ${supplier.country || 'n/a'}\n` +
    `- ${lang === 'en' ? 'Category' : 'Kategorija'}: ${supplier.category || 'n/a'}\n` +
    `\n${lang === 'en' ? 'Additional context' : 'Papildomas kontekstas'}: ${context || 'n/a'}`;

  try {
    const aiRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,   // iki 2026-11-04 - 700: lietuviškas atsakymas nutrūkdavo, o klientas rodydavo taisyklių įvertį
        temperature: 0.2,
        system: sys,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => '');
      console.error('Anthropic API error', aiRes.status, detail.slice(0, 200));
      return res.status(502).json({ error: 'AI paslaugos klaida / AI service error.' });
    }

    const data = await aiRes.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';

    // Robustiškai ištraukiam JSON (modelis turėtų grąžinti gryną JSON); lietuvišką „ jis dažnai uždaro ASCII kabute - taisoma
    const parsed = skaitykJson(text);
    const allowed = ['low', 'medium', 'high'];
    // Nepavyko arba nėra tinkamo lygio - klaida, ne numatytasis „medium“: rizikos lygis be DI atsakymo nerodomas
    if (!parsed || !allowed.includes(parsed.level)) {
      return res.status(502).json({ error: 'Nepavyko apdoroti AI atsakymo / Could not parse AI response.' });
    }
    const out = {
      level: parsed.level,
      factors: Array.isArray(parsed.factors) ? parsed.factors.slice(0, 8).map(String) : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 8).map(String) : [],
      disclaimer: lang === 'en'
        ? 'Preliminary AI assessment only. Final decision by the responsible officer using official EU/OFAC/UN/national lists.'
        : 'Tik preliminarus AI vertinimas. Galutinį sprendimą priima atsakingas asmuo, naudodamas oficialius ES/OFAC/JT/nacionalinius sąrašus.',
      generatedAt: new Date().toISOString(),
    };
    return res.json(out);
  } catch (err) {
    console.error('sanctions-assessment failure:', err.message);
    return res.status(500).json({ error: 'Vidinė klaida / Internal error.' });
  }
});

/* ============================================================================
 * 2) (Neprivaloma) POST /api/esg/csrd-export
 *    Serverio pusės CSRD eksporto apdorojimas. MVP etape eksportas
 *    generuojamas naršyklėje; šis endpoint paliktas, jei reikės centralizuoto,
 *    audituojamo eksporto su grupės metaduomenimis ar parašu.
 * ==========================================================================*/
router.post('/csrd-export', express.json({ limit: '1mb' }), (req, res) => {
  const payload = req.body || {};
  if (!payload.dataPoints) return res.status(400).json({ error: 'Trūksta dataPoints / Missing dataPoints.' });
  const enriched = {
    ...payload,
    meta: { ...(payload.meta || {}), processedAt: new Date().toISOString(), processedBy: 'PP-ESG backend' },
  };
  // Pvz., čia galima pridėti audito įrašą, suformuoti XBRL ar pasirašyti.
  return res.json({ ok: true, export: enriched });
});

/* ============================================================================
 * 4) GET /api/esg/cvpis-suppliers - automatinis tiekėjų APTIKIMAS iš data.gov.lt
 *    TIKRI LAUKAI patvirtinti iš gyvų duomenų (Arūnas, 2026-06):
 *      Rinkinys:  gov/vpt/new  ("Pirkimų, vykdytų po 2017-07-01 duomenys")
 *      Atn1 (ataskaitos antraštė):
 *         _id, authority_org_nr (perkančiosios kodas), published_date, title ...
 *      Atn1ContractList (sutartys - turi ir tiekėją, ir vertę!):
 *         atn1._id (nuoroda į ataskaitą), selected_tenderer ("kodas;pavadinimas"),
 *         total_value_of_part, conclusion_date, expiry_date, part_number ...
 *    Spinta sintaksė suderinta su jūsų /api/price: _limit=N, _sort=, select(), filtras laukas="val".
 *    Perkantysis subjektas filtruojamas pagal authority_org_nr (užklausos parametras buyer, privalomas). AI nenaudojamas.
 * ==========================================================================*/

const DATAGOV = {
  base: process.env.DATAGOV_BASE || 'https://get.data.gov.lt/datasets/gov/vpt/new',
};

function parseValue(v) {
  return parseFloat(String(v == null ? '0' : v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')) || 0;
}
// "302912288;ERGO Insurance SE Lietuvos filialas" -> { code, name }
function parseTenderer(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return null;
  const i = s.indexOf(';');
  if (i >= 0) return { code: s.slice(0, i).trim(), name: s.slice(i + 1).trim() };
  return /^\d{6,}$/.test(s) ? { code: s, name: '' } : { code: '', name: s };
}
function childParentId(row) {
  if (row && row.atn1 && (row.atn1._id || row.atn1.id)) return row.atn1._id || row.atn1.id;
  return row ? (row['atn1._id'] || null) : null;
}

const cvpisLimiter = rateLimit
  ? rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
  : (req, res, next) => next();

const _cvpisCache = new Map();
const CVPIS_TTL_MS = 30 * 60 * 1000;

/* Spinta užklausa (sintaksė kaip /api/price): _limit, _sort, select(), filtras laukas="val". */
function spintaUrl(model, opts) {
  opts = opts || {};
  const qs = [];
  (opts.filters || []).forEach(f => qs.push(f));
  if (opts.select && opts.select.length) qs.push('select(' + opts.select.join(',') + ')');
  if (opts.sort) qs.push('_sort=' + opts.sort);
  qs.push('_limit=' + (opts.limit || 5000));
  return DATAGOV.base + '/' + model + '?' + qs.join('&');
}
async function spinta(model, opts) {
  const r = await fetch(spintaUrl(model, opts), { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(model + ' HTTP ' + r.status);
  const j = await r.json();
  return Array.isArray(j) ? j : (j._data || j.data || []);
}

router.get('/cvpis-suppliers', cvpisLimiter, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 300, 1), 1000);
  const minValue = req.query.minValue != null ? Math.max(parseFloat(req.query.minValue) || 0, 0) : 0;
  let from = clampStr(req.query.from, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) { const d = new Date(); d.setMonth(d.getMonth() - 36); from = d.toISOString().slice(0, 10); }
  // Netinkamas ar nenurodytas kodas - klaida (iki 2026-11-04 tyliai grąžinti LITGRID AB tiekėjai, tarsi tai būtų prašytos organizacijos)
  const authCode = clampStr(req.query.buyer, 60);
  if (!/^\d{6,12}$/.test(authCode)) return res.status(400).json({ error: 'Netinkamas perkančiojo subjekto kodas / Invalid contracting entity code.' });

  const cacheKey = JSON.stringify({ from, minValue, authCode, limit });
  const cached = _cvpisCache.get(cacheKey);
  if (cached && (Date.now() - cached.at) < CVPIS_TTL_MS) return res.json(cached.data);

  try {
    // PIRMINIS kelias: vienas kvietimas su filtru per nuorodą į tėvinę Atn1 lentelę.
    // SVARBU: rūšiuojam pagal sutarties datą MAŽĖJANČIA tvarka, kad 5000 įrašų riba
    // paimtų NAUJAUSIAS sutartis (kitaip trumpi laikotarpiai liktų tušti).
    const primaryFilters = ['atn1.authority_org_nr="' + authCode + '"'];
    let rows = null;
    try {
      rows = await spinta('Atn1ContractList', { filters: primaryFilters, sort: '-conclusion_date', limit: 5000 });
    } catch (e1) {
      // jei rūšiavimas pagal šį lauką nepalaikomas - bandom be rūšiavimo
      try { rows = await spinta('Atn1ContractList', { filters: primaryFilters, limit: 5000 }); }
      catch (e2) { rows = null; }
    }

    // ATSARGINIS kelias: dviejų žingsnių sujungimas (jei filtras per nuorodą nepalaikomas).
    if (!rows || !rows.length) {
      let reports;
      try { reports = await spinta('Atn1', { filters: ['authority_org_nr="' + authCode + '"'], sort: '-published_date', limit: 5000 }); }
      catch (e) {
        try { reports = await spinta('Atn1', { filters: ['authority_org_nr="' + authCode + '"'], limit: 5000 }); }
        catch (e2) { reports = await spinta('Atn1', { limit: 6000 }); }
      }
      const ids = new Set(reports.filter(a => String(a.authority_org_nr || '') === authCode).map(a => a._id));
      let all;
      try { all = await spinta('Atn1ContractList', { sort: '-conclusion_date', limit: 5000 }); }
      catch (e) { all = await spinta('Atn1ContractList', { limit: 5000 }); }
      rows = all.filter(c => ids.has(childParentId(c)));
    }

    // Agregavimas pagal tiekėjo įmonės kodą (dedubliavimas)
    const bySupplier = new Map();
    for (const c of rows) {
      const t = parseTenderer(c.selected_tenderer);
      if (!t || (!t.code && !t.name)) continue;
      const date = String(c.conclusion_date || '').slice(0, 10);
      if (from && date && date < from) continue;            // datos filtras pagal sutarties sudarymą
      const val = parseValue(c.total_value_of_part);
      const key = t.code || t.name.toLowerCase();
      let agg = bySupplier.get(key);
      // Šalies šaltinyje nėra: jos nespėjame (iki 2026-11-04 visiems - „Lietuva“)
      if (!agg) { agg = { name: t.name || t.code, code: t.code, contractCount: 0, totalValue: 0, lastAward: '' }; bySupplier.set(key, agg); }
      agg.contractCount += 1;
      agg.totalValue += val;
      if (date > agg.lastAward) agg.lastAward = date;
      if ((!agg.name || agg.name === agg.code) && t.name) agg.name = t.name;
    }

    let suppliers = Array.from(bySupplier.values()).map(s => ({ ...s, totalValue: Math.round(s.totalValue) }));
    if (minValue) suppliers = suppliers.filter(s => !s.totalValue || s.totalValue >= minValue);
    suppliers.sort((a, b) => b.totalValue - a.totalValue);
    suppliers = suppliers.slice(0, limit);

    const payload = { meta: cvpisMeta(from, minValue, authCode, suppliers.length), suppliers };
    _cvpisCache.set(cacheKey, { at: Date.now(), data: payload });
    return res.json(payload);
  } catch (err) {
    console.error('cvpis-suppliers failure:', err.message);
    return res.status(502).json({ error: 'Nepavyko gauti CVP IS duomenų / Could not fetch CVP IS data.', detail: err.message });
  }
});
function cvpisMeta(from, minValue, authCode, count) {
  return { source: 'CVP IS / data.gov.lt', dataset: 'gov/vpt/new', authorityCode: authCode, from, minValue, fetchedAt: new Date().toISOString(), count };
}
module.exports = router;

/* ============================================================================
 * SAUGUMO KONTROLINIS SĄRAŠAS (prieš produkciją):
 *  [ ] ANTHROPIC_API_KEY tik .env, niekada repo/HTML.
 *  [ ] CORS allowlist: leisti tik savo modulių originus.
 *  [ ] Rate limiting įjungtas (express-rate-limit įdiegtas).
 *  [ ] Įvesties dydžio ribos (jau taikomos: name 200, context 2000).
 *  [ ] HTTPS (jau turima per Nginx + Let's Encrypt).
 *  [ ] Klaidų logai be jautrių vartotojo duomenų.
 *  [ ] (Vėliau) Autentifikacija/autorizacija prieš endpoint'us.
 *  [ ] CVP IS: patvirtinti tiekėjų lentelės laukų pavadinimus (FIELD_MAP) ir
 *      modelių kelius (DATAGOV) prie rinkinio 2867 struktūros; įvertinti cache TTL.
 * ==========================================================================*/
