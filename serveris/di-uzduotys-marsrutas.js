/* ============================================================================
 * G-Procure DI užduotys - Express maršrutas POST /api/uzduotis (serverio index.js).
 *
 * Diegimas (ranka, kartu su naudotoju; kaip /api/rinka):
 *   1. Šis failas ir di-uzduotys.js -> /var/www/g-procure/routes/ (scp).
 *   2. Privatūs šablonai (g-procure-privatu/serveris/uzduotys/*.js) -> /var/www/g-procure/uzduotys/ (scp).
 *   3. index.js, PO dotenv ir tikGProcure apibrėžimo:
 *        app.post('/api/uzduotis', tikGProcure, require('./routes/di-uzduotys-marsrutas')({
 *          katalogas: '/var/www/g-procure/uzduotys', siusk: (kunas, o) => axios.post('https://api.anthropic.com/v1/messages', kunas, {
 *            headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
 *            timeout: (o && o.laikas) || 290000 }).then(r => r.data) }));   // siusk(kunas, o): laukimas pagal užduotį (2026-11-23), ne daugiau 290 s
 *   4. systemctl restart g-procure (iki 2026-11-23 - pm2). Šablono klaida sustabdo paleidimą (geriau nei tyli užduotis) - žr. journalctl -u g-procure.
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
    // Kūno dydis pagal užduotį (2026-11-23): Express jau perskaitė iki 10 MB, bet užduočiai be dokumento tokio kūno nereikia
    const sab = req.body && typeof req.body.uzduotis === "string" ? reg[req.body.uzduotis] : null;
    const ilgis = Number(req.headers && req.headers["content-length"]) || 0;
    if (sab && ilgis > sab.kunoRiba) return res.status(413).json({ error: "Užklausa per didelė šiai DI užduočiai." });
    let r;
    try { r = L.sudaryk(req.body, reg); }
    catch (e) { console.error("DI užduotis: šablono klaida"); return res.status(500).json({ error: "Serverio klaida." }); }
    if (r.klaida) return res.status(r.status).json(r.laukas ? { error: r.klaida, laukas: r.laukas } : { error: r.klaida });
    try {
      const atsakymas = await siusk(r.anthropic, { laikas: r.laikasMs });
      return res.json(atsakymas);
    } catch (e) {
      const st = e && e.response && e.response.status;
      console.error("DI užduotis " + r.sablonas + ": Anthropic " + (st || (e && e.code) || "klaida"));
      // Laukimo riba pagal užduotį (2026-11-23) - 504, ne bendra klaida
      if (!st && e && (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT")) return res.status(504).json({ error: "DI paslauga neatsakė per nustatytą laiką." });
      if (st === 429 || st === 529) return res.status(429).json({ error: "DI paslauga šiuo metu perkrauta." });
      if (st >= 500) return res.status(502).json({ error: "DI paslaugos klaida." });
      return res.status(502).json({ error: "DI užklausa nepavyko." });
    }
  };
};
module.exports.ikelkSablonus = ikelkSablonus;
