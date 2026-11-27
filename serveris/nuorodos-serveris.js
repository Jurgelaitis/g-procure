#!/usr/bin/env node
/* ============================================================================
 * G-Procure trumpos kvietimų nuorodos - serveris (Node 18+, be npm priklausomybių).
 *
 * Ką daro: elektroninės apklausos (PP-report) kvietimų kodus saugo trumpam ir pagal trumpą ID juos grąžina
 * (maršrutai ir tikrinimai - nuorodos-logika.js; aprašas - README.md „Trumpos kvietimų nuorodos“).
 *
 * Saugumas:
 *  - klausosi tik 127.0.0.1 (pasiekiama per nginx); systemd DynamicUser be teisių; rašo tik į savo StateDirectory;
 *  - kodas saugomas užšifruotas AES-256-GCM raktu, išvestu iš ID (scrypt); saugyklos raktas - irgi iš ID, todėl diske ID nėra,
 *    o be ID kodo perskaityti negalima; trynimo raktas saugomas tik kaip SHA-256;
 *  - užklausų turinys (ID, kodai, trynimo raktai) ir IP į žurnalą nerašomi - tik įvykio rūšis ir kiekiai;
 *  - ribos: kūnas 200 KB, 12 nuorodų užklausoje, 5 000 galiojančių iš viso, užklausų per minutę vienam IP.
 * ============================================================================ */
"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const L = require("./nuorodos-logika.js");

const PORTAS = Number(process.env.PORT || 3004);
const KATALOGAS = process.env.STATE_DIRECTORY || "/var/lib/g-procure-nuorodos";
const FAILAS = path.join(KATALOGAS, "nuorodos.json");
const DRUSKA = "g-procure-nuorodos-1";
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1048576 };
const RIBA_GAUK_MIN = 30;             // GET per minutę vienam IP
const RIBA_KURK_MIN = 10;             // POST per minutę vienam IP

function zurnalas(ivykis, duomenys) {
  // Tik suvestinės: jokio ID, kodo, trynimo rakto ar IP
  console.log(JSON.stringify(Object.assign({ laikas: new Date().toISOString(), ivykis: ivykis }, duomenys || {})));
}

/* ID -> { ind (saugyklos raktas, hex), raktas (AES-256 raktas) } */
function isvesk(id) {
  return new Promise((pavyko, nepavyko) => {
    crypto.scrypt(id, DRUSKA, 64, SCRYPT, (e, b) => e ? nepavyko(e) : pavyko({ ind: b.subarray(0, 32).toString("hex"), raktas: b.subarray(32, 64) }));
  });
}
function sifruok(kodas, raktas, ind) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", raktas, iv);
  c.setAAD(Buffer.from(ind, "utf8"));
  const d = Buffer.concat([c.update(kodas, "utf8"), c.final()]);
  return { iv: iv.toString("base64"), d: d.toString("base64"), tag: c.getAuthTag().toString("base64") };
}
function issifruok(e, raktas, ind) {
  const d = crypto.createDecipheriv("aes-256-gcm", raktas, Buffer.from(e.iv, "base64"));
  d.setAAD(Buffer.from(ind, "utf8"));
  d.setAuthTag(Buffer.from(e.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(e.d, "base64")), d.final()]).toString("utf8");
}
const sha = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");

/* ---------- saugykla ---------- */
const IRASAI = new Map();             // ind -> { iv, d, tag, g (galioja, ms), s (sukurta, ms), tr (sha256) }
let paskutineKlaida = null;
function tinkamas(ind, e) {
  return /^[0-9a-f]{64}$/.test(ind) && e && typeof e.iv === "string" && typeof e.d === "string" && typeof e.tag === "string" && e.d.length <= 20000 &&
    typeof e.g === "number" && isFinite(e.g) && typeof e.s === "number" && /^[0-9a-f]{64}$/.test(e.tr);
}
function ikelk() {
  let x;
  try { x = JSON.parse(fs.readFileSync(FAILAS, "utf8")); }
  catch (e) { if (e.code !== "ENOENT") { zurnalas("saugykla-neperskaityta", { rusis: e.code || e.name }); throw e; } return; }
  const dabar = Date.now();
  let praleista = 0;
  for (const [ind, e] of Object.entries(x && x.irasai || {})) { if (tinkamas(ind, e) && e.g > dabar) IRASAI.set(ind, e); else praleista++; }
  zurnalas("saugykla-ikelta", { irasu: IRASAI.size, praleista: praleista });
}
let rasymas = Promise.resolve(), laukia = false;
function issaugok() {
  if (laukia) return rasymas;
  laukia = true;
  rasymas = rasymas.then(() => new Promise(r => setTimeout(r, 100))).then(async () => {
    laukia = false;
    const laikinas = FAILAS + ".naujas";
    await fs.promises.writeFile(laikinas, JSON.stringify({ v: 1, irasai: Object.fromEntries(IRASAI) }), { mode: 0o600 });
    await fs.promises.rename(laikinas, FAILAS);
  }).catch(e => { laukia = false; paskutineKlaida = { laikas: L.isoData(Date.now()), rusis: "rasymas" }; zurnalas("saugykla-neirasyta", { rusis: e.code || e.name }); });
  return rasymas;
}
function valyk() {
  const dabar = Date.now();
  let n = 0;
  for (const [ind, e] of IRASAI) if (e.g <= dabar) { IRASAI.delete(ind); n++; }
  if (n) { zurnalas("isvalyta", { n: n }); issaugok(); }
}

/* ---------- darbai ---------- */
async function kurk(kunas) {
  const t = L.tikrinkKurima(kunas, Date.now());
  if (!t.ok) return { status: 400, kunas: { klaida: t.klaida, parametras: t.parametras } };
  valyk();
  if (IRASAI.size + t.kodai.length > L.MAX_IRASU) { zurnalas("saugykla-pilna", { irasu: IRASAI.size }); return { status: 503, kunas: { klaida: L.KLAIDOS.pilna } }; }
  const nuorodos = [], sukurta = Date.now();
  for (const kodas of t.kodai) {
    let id = null, x = null;
    for (let bandymas = 0; bandymas < 5 && !id; bandymas++) {
      const k = L.idIsBaitu(crypto.randomBytes(L.ID_ILGIS)), v = await isvesk(k);
      if (!IRASAI.has(v.ind)) { id = k; x = v; }
    }
    if (!id) throw new Error("ID sutapimas");
    const trynimas = crypto.randomBytes(16).toString("base64url");
    IRASAI.set(x.ind, Object.assign(sifruok(kodas, x.raktas, x.ind), { g: t.galioja, s: sukurta, tr: sha(trynimas) }));
    nuorodos.push({ id: id, trynimas: trynimas });
  }
  await issaugok();
  zurnalas("sukurta", { n: nuorodos.length });
  return { status: 200, kunas: { nuorodos: nuorodos, galioja: L.isoData(t.galioja) } };
}
async function gauk(id) {
  const v = await isvesk(id), e = IRASAI.get(v.ind);
  if (!e) return { status: 404, kunas: { klaida: L.KLAIDOS.nera } };
  if (e.g <= Date.now()) { IRASAI.delete(v.ind); issaugok(); return { status: 404, kunas: { klaida: L.KLAIDOS.nera } }; }
  let kodas;
  try { kodas = issifruok(e, v.raktas, v.ind); }
  catch (er) { zurnalas("issifruoti-nepavyko", {}); return { status: 404, kunas: { klaida: L.KLAIDOS.nera } }; }
  if (!L.KODO_RE.test(kodas)) return { status: 404, kunas: { klaida: L.KLAIDOS.nera } };
  return { status: 200, kunas: { kodas: kodas, galioja: L.isoData(e.g) } };
}
async function trink(kunas) {
  const t = L.tikrinkTrynima(kunas);
  if (!t.ok) return { status: 400, kunas: { klaida: t.klaida, parametras: t.parametras } };
  let n = 0;
  for (const x of t.nuorodos) {
    const v = await isvesk(x.id), e = IRASAI.get(v.ind);
    if (e && crypto.timingSafeEqual(Buffer.from(sha(x.trynimas), "hex"), Buffer.from(e.tr, "hex"))) { IRASAI.delete(v.ind); n++; }
  }
  if (n) await issaugok();
  zurnalas("istrinta", { n: n });
  return { status: 200, kunas: { istrinta: n } };
}
function busena() { return { irasu: IRASAI.size, paskutineKlaida: paskutineKlaida }; }

/* ---------- užklausų ribos (pirmoji - nginx limit_req) ---------- */
const kibirai = new Map();
function leidziama(ip, rusis) {
  const dabar = Date.now(), raktas = rusis + ":" + ip;
  let k = kibirai.get(raktas);
  if (!k || dabar - k.nuo > 60000) { k = { nuo: dabar, n: 0 }; kibirai.set(raktas, k); }
  k.n++;
  return k.n <= (rusis === "gauk" ? RIBA_GAUK_MIN : RIBA_KURK_MIN);
}
setInterval(() => { const dabar = Date.now(); for (const [r, k] of kibirai) if (dabar - k.nuo > 120000) kibirai.delete(r); }, 600000).unref();
setInterval(valyk, 3600000).unref();

function skaitykKuna(req) {
  return new Promise((pavyko, nepavyko) => {
    const tipas = String(req.headers["content-type"] || "");
    if (!/^application\/json(\s*;|$)/i.test(tipas)) { req.resume(); return nepavyko(new Error("tipas")); }
    const dalys = []; let viso = 0;
    req.on("data", d => { viso += d.length; if (viso > L.MAX_KUNO) { req.destroy(); nepavyko(new Error("dydis")); } else dalys.push(d); });
    req.on("end", () => { try { pavyko(JSON.parse(Buffer.concat(dalys).toString("utf8"))); } catch (e) { nepavyko(new Error("json")); } });
    req.on("error", () => nepavyko(new Error("rysys")));
  });
}
function siusk(req, res, status, kunas, kilme, papildomos) {
  if (res.headersSent) return;
  const a = L.json(status, kunas, kilme);
  res.writeHead(a.status, Object.assign(a.antrastes, papildomos || {}));
  res.end(req.method === "HEAD" ? undefined : a.kunas);
}

const serveris = http.createServer(async (req, res) => {
  const kilme = req.headers.origin;
  try {
    const vietinis = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].indexOf(req.socket.remoteAddress) >= 0;
    const ip = vietinis && typeof req.headers["x-real-ip"] === "string" ? req.headers["x-real-ip"].slice(0, 64) : String(req.socket.remoteAddress);
    const m = L.marsrutas(req.method, req.url, kilme, busena());
    if (m.atsakymas) {
      if (res.headersSent) return;
      res.writeHead(m.atsakymas.status, m.atsakymas.antrastes);
      return res.end(req.method === "HEAD" ? undefined : m.atsakymas.kunas);
    }
    const d = m.darbas;
    if (!leidziama(ip, d.tipas === "gauk" ? "gauk" : "kurk")) return siusk(req, res, 429, { klaida: L.KLAIDOS.daug }, kilme, { "Retry-After": "60" });
    let r;
    if (d.tipas === "gauk") r = await gauk(d.id);
    else {
      let kunas;
      try { kunas = await skaitykKuna(req); }
      catch (e) { return siusk(req, res, e.message === "dydis" ? 413 : 400, { klaida: L.KLAIDOS.kunas, parametras: "kunas" }, kilme); }
      r = d.tipas === "kurk" ? await kurk(kunas) : await trink(kunas);
    }
    return siusk(req, res, r.status, r.kunas, kilme);
  } catch (e) {
    paskutineKlaida = { laikas: L.isoData(Date.now()), rusis: "vidine" };
    zurnalas("uzklausos-klaida", { rusis: e && e.name ? e.name : "nezinoma" });
    return siusk(req, res, 500, { klaida: L.KLAIDOS.vidine }, kilme);
  }
});
serveris.requestTimeout = 30000;
serveris.headersTimeout = 8000;
serveris.keepAliveTimeout = 5000;
serveris.maxHeadersCount = 50;
serveris.on("clientError", (e, socket) => { socket.destroy(); });
serveris.on("error", e => { zurnalas("serverio-klaida", { rusis: e && e.code ? e.code : "nezinoma" }); process.exit(1); });

async function baik() { serveris.close(); try { await issaugok(); } catch (e) { /* jau įrašyta į žurnalą */ } process.exit(0); }
process.on("SIGTERM", baik);
process.on("SIGINT", baik);

ikelk();
serveris.listen(PORTAS, "127.0.0.1", () => zurnalas("paleista", { portas: PORTAS, versija: L.VERSIJA, irasu: IRASAI.size }));
