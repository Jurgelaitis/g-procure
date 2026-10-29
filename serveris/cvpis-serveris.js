#!/usr/bin/env node
/* ============================================================================
 * G-Procure CVP IS duomenų paslauga - serveris (Node 18+, be npm priklausomybių).
 *
 * Ką daro: kas ATNAUJINIMAS_VAL valandų parsisiunčia VPT CVP IS API sąrašą (vieši pirkimų duomenys),
 * laiko jį atmintyje ir disko kopijoje (gzip, viena eilutė - vienas pirkimas) ir atsako į GET užklausas:
 *   /api/cvpis/pirkimas/<numeris>   /api/cvpis/paieska?<filtrai>   /api/cvpis/statistika?<filtrai>   /api/cvpis/busena
 * Logika ir tikrinimai - cvpis-logika.js (testai - serveris/testai.html). Diegimas ir saugumas - README.md.
 *
 * Saugumas:
 *  - klausosi tik 127.0.0.1 (pasiekiama per nginx); veikia kaip systemd DynamicUser be teisių;
 *  - VPT raktas - systemd LoadCredential failas ($CREDENTIALS_DIRECTORY/vpt_api_key), ne aplinkos kintamasis
 *    ir ne kodas; į žurnalą ir atsakymus niekada nepatenka;
 *  - VPT adresas - konstanta (užklausa į kitą adresą neįmanoma), TLS tikrinamas, laiko ir dydžio ribos;
 *  - naujas sąrašas pakeičia senąjį tik visas ir patikrintas (įrašų kiekis, tipai) - nepavykus lieka ankstesnis;
 *  - užklausų turinys į žurnalą nerašomas - tik paleidimas, atnaujinimų suvestinės ir klaidų rūšys.
 * ============================================================================ */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const readline = require("node:readline");
const L = require("./cvpis-logika.js");

const VPT_URL = "https://viesiejipirkimai.lt/epps-integration/api/cft-details-export";
const NAUDOTOJO_AGENTAS = "G-Procure CVP IS duomenu paslauga (https://g-procure.com/saugumas.html)";
const PORTAS = Number(process.env.PORT || 3001);
const ATNAUJINIMAS_VAL = Math.min(Math.max(Number(process.env.ATNAUJINIMAS_VAL || 6), 1), 48);
// VPT nuo 2026-10-23 leidžia ne daugiau kaip 1000 įrašų puslapyje (didesnis - 400 „page size must not exceed 1000“;
// iki tol imta po 5000 ir sąrašas nuo tos dienos nebeatsinaujino)
const PUSLAPIS = 1000;
const MAX_PUSLAPIU = 500;              // 500 000 įrašų - apsauga nuo begalinio ciklo
const MAX_PUSLAPIO_BAITU = 40 * 1048576;
const PAUZE_MS = 2000;                 // tarp puslapių - VPT serverio neapkrauname
const KATALOGAS = process.env.STATE_DIRECTORY || process.env.DUOMENU_KATALOGAS || "/var/lib/g-procure-cvpis";
const KOPIJA = path.join(KATALOGAS, "cvpis.ndjson.gz");
const RIBA_IP_MIN = 120;               // užklausų per minutę vienam IP (nginx riba - pirmoji, ši - antroji)

function zurnalas(ivykis, duomenys) {
  // Tik suvestinės: jokio užklausų turinio, jokio rakto
  console.log(JSON.stringify(Object.assign({ laikas: new Date().toISOString(), ivykis: ivykis }, duomenys || {})));
}

function raktas() {
  const dir = process.env.CREDENTIALS_DIRECTORY;
  if (!dir) return null;
  try {
    const r = fs.readFileSync(path.join(dir, "vpt_api_key"), "utf8").trim();
    return /^[A-Za-z0-9-]{16,128}$/.test(r) ? r : null;
  } catch (e) { return null; }
}

let IX = null;                         // dabartinis indeksas (null - dar neįkeltas)
const BUSENA = { vyksta: false, klaida: null, kita: null };
let laikmatis = null;

const miegok = ms => new Promise(r => setTimeout(r, ms));

class SaltinioKlaida extends Error {
  constructor(rusis, kartoti) { super(rusis); this.rusis = rusis; this.kartoti = kartoti; }
}

async function puslapis(key, nr) {
  let res;
  try {
    res = await fetch(VPT_URL, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(90000),
      headers: { "apiKey": key, "Content-Type": "application/json", "Accept": "application/json", "User-Agent": NAUDOTOJO_AGENTAS },
      body: JSON.stringify({ pageSize: PUSLAPIS, pageNum: nr })
    });
  } catch (e) { throw new SaltinioKlaida("rysys", true); }
  if (res.status === 401 || res.status === 403) throw new SaltinioKlaida("raktas", false);
  if (res.status === 429 || res.status >= 500) throw new SaltinioKlaida("vpt-" + res.status, true);
  if (res.status !== 200) throw new SaltinioKlaida("vpt-" + res.status, false);
  if (!/^application\/json/i.test(res.headers.get("content-type") || "")) throw new SaltinioKlaida("ne-json", false);
  const dalys = []; let viso = 0;
  try {
    for await (const d of res.body) {
      viso += d.length;
      if (viso > MAX_PUSLAPIO_BAITU) throw new SaltinioKlaida("per-didelis", false);
      dalys.push(Buffer.from(d));
    }
  } catch (e) { if (e instanceof SaltinioKlaida) throw e; throw new SaltinioKlaida("rysys", true); }
  let j;
  try { j = JSON.parse(Buffer.concat(dalys).toString("utf8")); } catch (e) { throw new SaltinioKlaida("netinkamas-json", false); }
  try { return L.tikrinkPuslapi(j); } catch (e) { throw new SaltinioKlaida("ne-sarasas", false); }
}

async function puslapisSuKartojimu(key, nr) {
  for (let bandymas = 1; ; bandymas++) {
    try { return await puslapis(key, nr); }
    catch (e) {
      if (!e.kartoti || bandymas >= 3) throw e;
      await miegok(bandymas * 15000);
    }
  }
}

async function rasykKopija(irasai, atnaujinta) {
  fs.mkdirSync(KATALOGAS, { recursive: true, mode: 0o750 });
  const laikinas = KOPIJA + ".laikinas-" + process.pid;
  await new Promise((pavyko, nepavyko) => {
    const failas = fs.createWriteStream(laikinas, { mode: 0o640 });
    const gz = zlib.createGzip({ level: 6 });
    gz.pipe(failas);
    failas.on("finish", pavyko); failas.on("error", nepavyko); gz.on("error", nepavyko);
    gz.write(JSON.stringify({ versija: L.VERSIJA, atnaujinta: atnaujinta, kiekis: irasai.length }) + "\n");
    for (const o of irasai) gz.write(JSON.stringify(o) + "\n");
    gz.end();
  });
  const fd = fs.openSync(laikinas, "r"); fs.fsyncSync(fd); fs.closeSync(fd);
  fs.renameSync(laikinas, KOPIJA);
}

async function skaitykKopija() {
  if (!fs.existsSync(KOPIJA)) return null;
  const eil = readline.createInterface({ input: fs.createReadStream(KOPIJA).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let galva = null; const irasai = [];
  for await (const e of eil) {
    if (!e) continue;
    const j = JSON.parse(e);
    if (!galva) { galva = j; continue; }
    const o = L.normalizuokIrasa(j);  // kopija irgi tikrinama - failas galėjo būti pakeistas
    if (o) irasai.push(o);
  }
  if (!galva || typeof galva.atnaujinta !== "string" || !L.priimtinasKiekis(irasai.length, 0)) return null;
  return L.sukurkIndeksa(irasai, galva.atnaujinta);
}

async function atnaujink() {
  if (BUSENA.vyksta) return;
  const key = raktas();
  if (!key) { BUSENA.klaida = { laikas: new Date().toISOString(), rusis: "raktas-nenustatytas" }; zurnalas("atnaujinimas-negalimas", { rusis: "raktas-nenustatytas" }); return; }
  BUSENA.vyksta = true;
  const pradzia = Date.now();
  try {
    const pagalId = new Map(); let atmesta = 0, puslapiu = 0;
    for (let nr = 1; nr <= MAX_PUSLAPIU; nr++) {
      const p = await puslapisSuKartojimu(key, nr);
      puslapiu++; atmesta += p.atmesta;
      p.irasai.forEach(o => pagalId.set(o.id, o));
      if (p.irasai.length + p.atmesta < PUSLAPIS) break;
      if (nr === MAX_PUSLAPIU) throw new SaltinioKlaida("per-daug-puslapiu", false);
      await miegok(PAUZE_MS);
    }
    const irasai = Array.from(pagalId.values());
    if (!L.priimtinasKiekis(irasai.length, IX ? IX.kiekis : 0)) throw new SaltinioKlaida("netiketas-kiekis", false);
    const atnaujinta = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    await rasykKopija(irasai, atnaujinta);
    IX = L.sukurkIndeksa(irasai, atnaujinta);
    BUSENA.klaida = null;
    zurnalas("atnaujinta", { kiekis: IX.kiekis, atmesta: atmesta, puslapiu: puslapiu, sek: Math.round((Date.now() - pradzia) / 1000) });
  } catch (e) {
    const rusis = e instanceof SaltinioKlaida ? e.rusis : "vidine";
    BUSENA.klaida = { laikas: new Date().toISOString(), rusis: rusis };
    zurnalas("atnaujinti-nepavyko", { rusis: rusis, palikta: IX ? IX.kiekis : 0 });
  } finally {
    BUSENA.vyksta = false;
  }
}

function planuok(ms) {
  clearTimeout(laikmatis);
  const kada = Date.now() + ms;
  BUSENA.kita = new Date(kada).toISOString().replace(/\.\d{3}Z$/, "Z");
  laikmatis = setTimeout(async () => {
    await atnaujink();
    // Nepavykus - po 30 min., pavykus - po nustatyto laiko (su iki 10 min. atsitiktiniu poslinkiu)
    planuok(BUSENA.klaida ? 30 * 60000 : ATNAUJINIMAS_VAL * 3600000 + Math.floor(Math.random() * 600000));
  }, ms);
}

// Antroji užklausų riba (pirmoji - nginx limit_req). IP - iš nginx antraštės, nes klausomasi tik 127.0.0.1.
const kibirai = new Map();
function leidziama(ip) {
  const dabar = Date.now();
  let k = kibirai.get(ip);
  if (!k || dabar - k.nuo > 60000) { k = { nuo: dabar, n: 0 }; kibirai.set(ip, k); }
  k.n++;
  return k.n <= RIBA_IP_MIN;
}
setInterval(() => { const dabar = Date.now(); for (const [ip, k] of kibirai) if (dabar - k.nuo > 120000) kibirai.delete(ip); }, 600000).unref();

/* ---------------------------------------------------------------------------
 * Pirkimo dokumentų paketas iš CVP IS (2026-10-29): /api/cvpis/dokumentai/<nr>.
 * Trys užklausos kaip naršyklėje be prisijungimo (pirkimo puslapis -> atsisiuntimo paruošimas -> ZIP) su tuo pačiu
 * seanso slapuku; ZIP perduodamas srautu, į diską ir žurnalą nerašomas. Peradresavimas į prisijungimą - dokumentai
 * ne vieši (pvz. konkretus pirkimas pagal DPS). Ribos: 250 MB, 3 vienu metu, 10 per 10 min. vienam IP, 180 s.
 * ------------------------------------------------------------------------- */
const DOK_VIENU_METU = 3;
const DOK_IP_10MIN = 10;
const DOK_LAIKAS_MS = 180000;
let dokVyksta = 0;
const dokKibirai = new Map();
function dokLeidziama(ip) {
  const dabar = Date.now();
  let k = dokKibirai.get(ip);
  if (!k || dabar - k.nuo > 600000) { k = { nuo: dabar, n: 0 }; dokKibirai.set(ip, k); }
  k.n++;
  return k.n <= DOK_IP_10MIN;
}
setInterval(() => { const dabar = Date.now(); for (const [ip, k] of dokKibirai) if (dabar - k.nuo > 1200000) dokKibirai.delete(ip); }, 600000).unref();

function slapukai(res, kur) {
  let eil = [];
  if (typeof res.headers.getSetCookie === "function") eil = res.headers.getSetCookie();
  else { const v = res.headers.get("set-cookie"); if (v) eil = v.split(/,(?=\s*[A-Za-z0-9_.-]+=)/); }
  for (const c of eil) { const m = /^\s*([A-Za-z0-9_.-]{1,64})=([^;]{0,512})/.exec(c); if (m && kur.size < 20) kur.set(m[1], m[2]); }
}
async function cvpisGet(adresas, kur, signalas) {
  const h = { "User-Agent": NAUDOTOJO_AGENTAS, "Accept": "*/*" };
  if (kur.size) h.Cookie = Array.from(kur, ([k, v]) => k + "=" + v).join("; ");
  const res = await fetch(adresas, { method: "GET", redirect: "manual", signal: signalas, headers: h });
  slapukai(res, kur);
  return res;
}
async function ismesk(res) { try { if (res.body) for await (const d of res.body) { void d; } } catch (e) { /* nesvarbu */ } }
class DokKlaida extends Error { constructor(rusis) { super(rusis); this.rusis = rusis; } }

async function siuskDokumentus(id, req, res, kilme) {
  const valdiklis = new AbortController();
  const laikas = setTimeout(() => valdiklis.abort(), DOK_LAIKAS_MS);
  const nutrauk = () => valdiklis.abort();
  req.on("close", nutrauk);
  const kur = new Map(), a = L.dokumentuAdresai(id);
  let issiusta = 0, pradeta = false;
  try {
    for (const [zingsnis, adresas] of [["perziura", a.perziura], ["paruosimas", a.paruosimas]]) {
      let r;
      try { r = await cvpisGet(adresas, kur, valdiklis.signal); } catch (e) { throw new DokKlaida("rysys"); }
      if (r.status >= 300 && r.status < 400) { await ismesk(r); throw new DokKlaida(L.peradresavimoRusis(r.headers.get("location"))); }
      if (r.status === 404) { await ismesk(r); throw new DokKlaida("nera"); }
      if (r.status !== 200) { await ismesk(r); throw new DokKlaida("rysys"); }
      await ismesk(r);
      void zingsnis;
    }
    let r;
    try { r = await cvpisGet(a.atsisiuntimas, kur, valdiklis.signal); } catch (e) { throw new DokKlaida("rysys"); }
    if (r.status >= 300 && r.status < 400) { await ismesk(r); throw new DokKlaida(L.peradresavimoRusis(r.headers.get("location"))); }
    if (r.status === 404) { await ismesk(r); throw new DokKlaida("nera"); }
    if (r.status !== 200 || !r.body) { await ismesk(r); throw new DokKlaida("rysys"); }
    const ilgis = Number(r.headers.get("content-length"));
    if (isFinite(ilgis) && ilgis > L.DOK_MAX_BAITU) { await ismesk(r); throw new DokKlaida("per_didelis"); }
    const it = r.body[Symbol.asyncIterator]();
    let pirmas;
    try { pirmas = await it.next(); } catch (e) { throw new DokKlaida("rysys"); }
    const b0 = pirmas.done ? null : Buffer.from(pirmas.value);
    if (!L.arZip(b0)) { try { await it.return(); } catch (e) { /* nesvarbu */ } throw new DokKlaida("ne_zip"); }
    res.writeHead(200, L.dokumentuAntrastes(id, kilme, isFinite(ilgis) && ilgis > 0 ? ilgis : undefined));
    pradeta = true;
    let d = b0;
    while (d) {
      issiusta += d.length;
      if (issiusta > L.DOK_MAX_BAITU) throw new DokKlaida("per_didelis");
      if (!res.write(d)) await new Promise(p => { res.once("drain", p); res.once("close", p); });
      if (res.destroyed) throw new DokKlaida("rysys");
      const kitas = await it.next();
      d = kitas.done ? null : Buffer.from(kitas.value);
    }
    res.end();
    zurnalas("dokumentai", { baitai: issiusta });
  } catch (e) {
    const rusis = e instanceof DokKlaida ? e.rusis : (valdiklis.signal.aborted ? "rysys" : "vidine");
    if (!pradeta) {
      const k = L.dokumentuKlaida(rusis === "vidine" ? "rysys" : rusis, kilme);
      if (!res.headersSent) res.writeHead(k.status, k.antrastes);
      res.end(k.kunas);
    } else res.destroy();   // pradėtas srautas nutraukiamas - naršyklė gauna nepilną failą ir jo neskaito
    if (rusis !== "prisijungimas" && rusis !== "nera") zurnalas("dokumentu-nepavyko", { rusis: rusis });
  } finally {
    clearTimeout(laikas);
    req.removeListener("close", nutrauk);
    dokVyksta--;
  }
}

const serveris = http.createServer((req, res) => {
  try {
    const vietinis = req.socket.remoteAddress === "127.0.0.1" || req.socket.remoteAddress === "::1" || req.socket.remoteAddress === "::ffff:127.0.0.1";
    const ip = vietinis && typeof req.headers["x-real-ip"] === "string" ? req.headers["x-real-ip"].slice(0, 64) : String(req.socket.remoteAddress);
    const dok = L.dokumentuUzklausa(req.method, req.url);
    if (dok) {
      let rusis = dok.klaida || null;
      if (!rusis && !L.kilmesAntraste(req.headers.origin)) rusis = "kilme";
      if (!rusis && (!dokLeidziama(ip) || dokVyksta >= DOK_VIENU_METU)) rusis = "uzimta";
      if (rusis) { const k = L.dokumentuKlaida(rusis, req.headers.origin); res.writeHead(k.status, k.antrastes); res.end(k.kunas); return; }
      dokVyksta++;
      siuskDokumentus(dok.id, req, res, req.headers.origin);
      return;
    }
    let r;
    if (!leidziama(ip)) {
      const ah = { "Content-Type": "application/json; charset=utf-8", "Retry-After": "60", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Vary": "Origin" };
      const k = L.kilmesAntraste(req.headers.origin);
      if (k) ah["Access-Control-Allow-Origin"] = k;
      r = { status: 429, antrastes: ah, kunas: JSON.stringify({ klaida: "Per daug užklausų - pabandykite po minutės." }) };
    }
    else r = L.atsakymas(IX, req.method, req.url, req.headers.origin, BUSENA);
    res.writeHead(r.status, r.antrastes);
    res.end(req.method === "HEAD" ? undefined : r.kunas);
  } catch (e) {
    zurnalas("uzklausos-klaida", { rusis: e && e.name ? e.name : "nezinoma" });
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ klaida: "Vidinė klaida." }));
  }
});
serveris.requestTimeout = 10000;
serveris.headersTimeout = 8000;
serveris.keepAliveTimeout = 5000;
serveris.maxHeadersCount = 50;
serveris.on("clientError", (e, socket) => { socket.destroy(); });
serveris.on("error", e => { zurnalas("serverio-klaida", { rusis: e && e.code ? e.code : "nezinoma" }); process.exit(1); });

function baik() { clearTimeout(laikmatis); serveris.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); }
process.on("SIGTERM", baik);
process.on("SIGINT", baik);

(async () => {
  try {
    IX = await skaitykKopija();
    zurnalas("paleista", { portas: PORTAS, kopija: IX ? IX.kiekis : 0, atnaujinta: IX ? IX.atnaujinta : null, raktas: raktas() ? "yra" : "nera" });
  } catch (e) {
    IX = null;
    zurnalas("kopijos-nepavyko-perskaityti", { rusis: e && e.name ? e.name : "nezinoma" });
  }
  const amzius = IX && IX.atnaujinta ? Date.now() - Date.parse(IX.atnaujinta) : Infinity;
  planuok(amzius >= ATNAUJINIMAS_VAL * 3600000 ? 15000 : ATNAUJINIMAS_VAL * 3600000 - amzius);
  serveris.listen(PORTAS, "127.0.0.1");
})();
