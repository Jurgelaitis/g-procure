#!/usr/bin/env node
/* ============================================================================
 * G-Procure sankcijų sąrašų patikra - serveris (Node 18+, be npm priklausomybių).
 *
 * Ką daro: kartą per parą (ATNAUJINIMAS_VAL) parsisiunčia oficialius sankcijų sąrašus (ES, JT, OFAC, JK - adresai
 * sankcijos-logika.js SARASAI), pasilieka tik subjektų įrašus, laiko juos atmintyje ir disko kopijose (po vieną kiekvienam
 * sąrašui) ir atsako į GET užklausas:
 *   /api/sankcijos/tikrinti?pavadinimas=...&salis=LT&kodas=...   /api/sankcijos/busena
 * Kiekvienas sąrašas atnaujinamas atskirai: nepavykus lieka paskutinė sėkminga kopija, o būsena sako jos datą ir klaidą;
 * kitas bandymas - po 2 val. Logika ir tikrinimai - sankcijos-logika.js (testai - serveris/testai.html). Diegimas - README.md.
 *
 * Saugumas:
 *  - klausosi tik 127.0.0.1 (pasiekiama per nginx); veikia kaip systemd DynamicUser be teisių; raktų neturi;
 *  - sąrašų adresai - konstantos (užklausa į kitą adresą neįmanoma), TLS tikrinamas, be nukreipimų, laiko ir dydžio ribos;
 *  - naujas sąrašas pakeičia senąjį tik visas ir patikrintas (subjektų kiekis) - nepavykus lieka ankstesnis;
 *  - užklausų turinys (tiekėjo pavadinimas, šalis, kodas) į žurnalą ir diską nerašomas - tik paleidimas, atnaujinimų
 *    suvestinės ir klaidų rūšys.
 * ============================================================================ */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const readline = require("node:readline");
const L = require("./sankcijos-logika.js");

const NAUDOTOJO_AGENTAS = "G-Procure sankciju sarasu patikra (https://g-procure.com/saugumas.html)";
const PORTAS = Number(process.env.PORT || 3002);
const ATNAUJINIMAS_VAL = Math.min(Math.max(Number(process.env.ATNAUJINIMAS_VAL || 24), 6), 72);
const PAKARTOTI_MS = 2 * 3600000;      // nepavykus - po 2 val.
const KATALOGAS = process.env.STATE_DIRECTORY || process.env.DUOMENU_KATALOGAS || "/var/lib/g-procure-sankcijos";
const RIBA_IP_MIN = 60;                // užklausų per minutę vienam IP (nginx riba - pirmoji, ši - antroji)

function zurnalas(ivykis, duomenys) {
  // Tik suvestinės: jokio užklausų turinio
  console.log(JSON.stringify(Object.assign({ laikas: new Date().toISOString(), ivykis: ivykis }, duomenys || {})));
}

const SARASAI = {};                    // id -> { irasai, atnaujinta, saltinioData, kiekis, klaida, vyksta, kitas }
L.SARASAI.forEach(cfg => { SARASAI[cfg.id] = { irasai: null, atnaujinta: null, saltinioData: null, kiekis: 0, klaida: null, vyksta: false, kitas: 0 }; });
let IX = null;

function perkurkIndeksa() {
  const visi = {};
  for (const id of Object.keys(SARASAI)) if (SARASAI[id].irasai) visi[id] = SARASAI[id].irasai;
  IX = Object.keys(visi).length ? L.sukurkIndeksa(visi) : null;
}
function busena() {
  const b = {};
  for (const id of Object.keys(SARASAI)) {
    const x = SARASAI[id];
    b[id] = { atnaujinta: x.atnaujinta, saltinioData: x.saltinioData, kiekis: x.irasai ? x.irasai.length : 0, klaida: x.klaida };
  }
  return b;
}

const miegok = ms => new Promise(r => setTimeout(r, ms));
class SaltinioKlaida extends Error {
  constructor(rusis, kartoti) { super(rusis); this.rusis = rusis; this.kartoti = kartoti; }
}

async function failas(adresas, laikasS) {
  let res;
  try {
    res = await fetch(adresas, { method: "GET", redirect: "error", signal: AbortSignal.timeout(laikasS * 1000),
      headers: { "User-Agent": NAUDOTOJO_AGENTAS, "Accept": "application/xml, text/xml, */*" } });
  } catch (e) { throw new SaltinioKlaida("rysys", true); }
  if (res.status >= 500 || res.status === 429) throw new SaltinioKlaida("saltinis-500", true);
  if (res.status !== 200) throw new SaltinioKlaida("saltinis-kita", false);
  const ilgis = Number(res.headers.get("content-length"));
  if (isFinite(ilgis) && ilgis > L.MAX_FAILO_BAITU) throw new SaltinioKlaida("per-didelis", false);
  const dalys = []; let viso = 0;
  try {
    for await (const d of res.body) {
      viso += d.length;
      if (viso > L.MAX_FAILO_BAITU) throw new SaltinioKlaida("per-didelis", false);
      dalys.push(Buffer.from(d));
    }
  } catch (e) { if (e instanceof SaltinioKlaida) throw e; throw new SaltinioKlaida("rysys", true); }
  const tekstas = Buffer.concat(dalys).toString("utf8");
  if (!/^\s*(?:﻿)?<\?xml|^\s*</.test(tekstas.slice(0, 200))) throw new SaltinioKlaida("saltinis-kita", false);
  return tekstas;
}

async function failasSuKartojimu(adresas, cfg) {
  // ES serveris kartais iš eilės atsako HTTP 500 - daugiau bandymų ir ilgesnės pauzės (30 s, 90 s, 270 s ...)
  for (let bandymas = 1; ; bandymas++) {
    try { return await failas(adresas, cfg.laikasS); }
    catch (e) {
      if (!e.kartoti || bandymas >= cfg.bandymu) throw e;
      await miegok(Math.min(30000 * Math.pow(3, bandymas - 1), 900000));
    }
  }
}

function kopijosKelias(id) { return path.join(KATALOGAS, "sankcijos-" + id + ".ndjson.gz"); }

async function rasykKopija(id, x) {
  fs.mkdirSync(KATALOGAS, { recursive: true, mode: 0o750 });
  const kelias = kopijosKelias(id), laikinas = kelias + ".laikinas-" + process.pid;
  await new Promise((pavyko, nepavyko) => {
    const f = fs.createWriteStream(laikinas, { mode: 0o640 });
    const gz = zlib.createGzip({ level: 6 });
    gz.pipe(f);
    f.on("finish", pavyko); f.on("error", nepavyko); gz.on("error", nepavyko);
    gz.write(JSON.stringify({ versija: L.VERSIJA, sarasas: id, atnaujinta: x.atnaujinta, saltinioData: x.saltinioData, kiekis: x.irasai.length }) + "\n");
    for (const o of x.irasai) gz.write(JSON.stringify(o) + "\n");
    gz.end();
  });
  const fd = fs.openSync(laikinas, "r"); fs.fsyncSync(fd); fs.closeSync(fd);
  fs.renameSync(laikinas, kelias);
}

async function skaitykKopija(id) {
  const kelias = kopijosKelias(id);
  if (!fs.existsSync(kelias)) return null;
  const eil = readline.createInterface({ input: fs.createReadStream(kelias).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let galva = null; const irasai = [];
  for await (const e of eil) {
    if (!e) continue;
    const j = JSON.parse(e);
    if (!galva) { galva = j; continue; }
    const o = L.normalizuokIrasa(j);       // kopija irgi tikrinama - failas galėjo būti pakeistas
    if (o && o.s === id) irasai.push(o);
  }
  if (!galva || galva.sarasas !== id || typeof galva.atnaujinta !== "string" || !L.priimtinasKiekis(id, irasai.length, 0)) return null;
  return { irasai: irasai, atnaujinta: galva.atnaujinta, saltinioData: L.data(galva.saltinioData) };
}

async function atnaujink(cfg) {
  const x = SARASAI[cfg.id];
  if (x.vyksta) return;
  x.vyksta = true;
  const pradzia = Date.now();
  try {
    const tekstai = [];
    for (const a of cfg.failai) tekstai.push(await failasSuKartojimu(a, cfg));
    let r;
    try { r = L.skaityk(cfg.formatas, tekstai); } catch (e) { throw new SaltinioKlaida("skaitymas", false); }
    tekstai.length = 0;
    if (!L.priimtinasKiekis(cfg.id, r.irasai.length, x.irasai ? x.irasai.length : 0)) throw new SaltinioKlaida("netiketas-kiekis", false);
    const naujas = { irasai: r.irasai, atnaujinta: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), saltinioData: r.saltinioData };
    await rasykKopija(cfg.id, naujas);
    Object.assign(x, naujas, { klaida: null, kitas: Date.now() + ATNAUJINIMAS_VAL * 3600000 + Math.floor(Math.random() * 1800000) });
    perkurkIndeksa();
    zurnalas("atnaujinta", { sarasas: cfg.id, subjektu: r.irasai.length, asmenu_praleista: r.asmenu, atmesta: r.atmesta, sek: Math.round((Date.now() - pradzia) / 1000) });
  } catch (e) {
    const rusis = e instanceof SaltinioKlaida ? e.rusis : "vidine";
    x.klaida = { laikas: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), rusis: rusis };
    x.kitas = Date.now() + PAKARTOTI_MS;
    zurnalas("atnaujinti-nepavyko", { sarasas: cfg.id, rusis: rusis, palikta: x.irasai ? x.irasai.length : 0 });
  } finally {
    x.vyksta = false;
  }
}

// Kas 10 min. tikrinama, kuriam sąrašui atėjo laikas; sąrašai atnaujinami po vieną (atmintis)
let vyksta = false;
async function tikrinkLaika() {
  if (vyksta) return;
  vyksta = true;
  try {
    for (const cfg of L.SARASAI) if (Date.now() >= SARASAI[cfg.id].kitas) await atnaujink(cfg);
  } finally { vyksta = false; }
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

const serveris = http.createServer((req, res) => {
  try {
    const vietinis = req.socket.remoteAddress === "127.0.0.1" || req.socket.remoteAddress === "::1" || req.socket.remoteAddress === "::ffff:127.0.0.1";
    const ip = vietinis && typeof req.headers["x-real-ip"] === "string" ? req.headers["x-real-ip"].slice(0, 64) : String(req.socket.remoteAddress);
    let r;
    if (!leidziama(ip)) {
      const ah = { "Content-Type": "application/json; charset=utf-8", "Retry-After": "60", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Vary": "Origin" };
      const k = L.kilmesAntraste(req.headers.origin);
      if (k) ah["Access-Control-Allow-Origin"] = k;
      r = { status: 429, antrastes: ah, kunas: JSON.stringify({ klaida: "Per daug užklausų - pabandykite po minutės." }) };
    }
    else r = L.atsakymas(IX, req.method, req.url, req.headers.origin, busena());
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

let laikmatis = null;
function baik() { clearInterval(laikmatis); serveris.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); }
process.on("SIGTERM", baik);
process.on("SIGINT", baik);

(async () => {
  for (const cfg of L.SARASAI) {
    const x = SARASAI[cfg.id];
    try {
      const k = await skaitykKopija(cfg.id);
      if (k) {
        Object.assign(x, k);
        const amzius = Date.now() - Date.parse(k.atnaujinta);
        x.kitas = amzius >= ATNAUJINIMAS_VAL * 3600000 ? Date.now() + 10000 : Date.parse(k.atnaujinta) + ATNAUJINIMAS_VAL * 3600000;
      } else x.kitas = Date.now() + 10000;
    } catch (e) {
      x.kitas = Date.now() + 10000;
      zurnalas("kopijos-nepavyko-perskaityti", { sarasas: cfg.id, rusis: e && e.name ? e.name : "nezinoma" });
    }
  }
  perkurkIndeksa();
  zurnalas("paleista", { portas: PORTAS, kopijos: Object.keys(SARASAI).map(id => id + ":" + (SARASAI[id].irasai ? SARASAI[id].irasai.length : 0)).join(" ") });
  serveris.listen(PORTAS, "127.0.0.1");
  setTimeout(tikrinkLaika, 15000).unref();
  laikmatis = setInterval(tikrinkLaika, 600000);
})();
