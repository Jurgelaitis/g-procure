/* ============================================================================
 * G-Procure DI užduotys - Express maršrutas POST /api/uzduotis (serverio index.js).
 *
 * Diegimas (ranka, kartu su naudotoju; kaip /api/rinka):
 *   1. Šis failas ir di-uzduotys.js -> /var/www/g-procure/routes/ (scp).
 *   2. Privatūs šablonai (g-procure-privatu/serveris/uzduotys/*.js) -> /var/www/g-procure/uzduotys/ (scp).
 *   3. index.js, PO dotenv ir tikGProcure apibrėžimo:
 *        app.post('/api/uzduotis', tikGProcure, require('./routes/di-uzduotys-marsrutas')({
 *          katalogas: '/var/www/g-procure/uzduotys', siusk: kunas => axios.post('https://api.anthropic.com/v1/messages', kunas, {
 *            headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
 *            timeout: 290000 }).then(r => r.data) }));   // nuo 2026-11-11 (iki tol 180000); nginx /api/ - 300 s
 *   4. pm2 restart g-procure. Šablono klaida sustabdo paleidimą (geriau nei tyli užduotis) - žr. pm2 logs.
 *
 * Saugumas: į žurnalą - tik užduoties pavadinimas ir klaidos rūšis (ne duomenys, ne atsakymas); atsakyme - tik
 * trumpa klaida žmogui ir lauko vardas, ne reikšmė; Anthropic klaidos objektas neperduodamas.
 * ============================================================================ */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const L = require("./di-uzduotys.js");

const FAILO_RE = /^[a-z0-9-]{2,40}\.[a-z0-9-]{2,60}\.js$/;

function ikelkSablonus(katalogas) {
  const failai = fs.readdirSync(katalogas).filter(f => FAILO_RE.test(f)).sort();
  const sablonai = failai.map(f => {
    const s = require(path.join(katalogas, f));
    if (!s || s.id + ".js" !== f) throw new Error("Šablono failo vardas turi sutapti su id: " + f);
    return s;
  });
  return L.registruok(sablonai);
}

module.exports = function marsrutas({ katalogas, siusk }) {
  if (typeof siusk !== "function") throw new Error("di-uzduotys: reikia siusk(kunas)");
  const reg = ikelkSablonus(katalogas);
  console.log("DI užduotys: " + Object.keys(reg).length + " šablonų (" + L.VERSIJA + ")");
  return async function (req, res) {
    let r;
    try { r = L.sudaryk(req.body, reg); }
    catch (e) { console.error("DI užduotis: šablono klaida"); return res.status(500).json({ error: "Serverio klaida." }); }
    if (r.klaida) return res.status(r.status).json(r.laukas ? { error: r.klaida, laukas: r.laukas } : { error: r.klaida });
    try {
      const atsakymas = await siusk(r.anthropic);
      return res.json(atsakymas);
    } catch (e) {
      const st = e && e.response && e.response.status;
      console.error("DI užduotis " + r.sablonas + ": Anthropic " + (st || (e && e.code) || "klaida"));
      if (st === 429 || st === 529) return res.status(429).json({ error: "DI paslauga šiuo metu perkrauta." });
      if (st >= 500) return res.status(502).json({ error: "DI paslaugos klaida." });
      return res.status(502).json({ error: "DI užklausa nepavyko." });
    }
  };
};
module.exports.ikelkSablonus = ikelkSablonus;
