#!/usr/bin/env node
/* ============================================================================
 * G-Procure viešų pirkimų sutarčių duomenų paslauga - serveris (Node 18+, be npm priklausomybių).
 *
 * Ką daro: į GET užklausas
 *   /api/sutartys/pirkejas/<kodas>          /api/sutartys/rinka?cpv=...&ted=lt|es
 *   /api/sutartys/pajegumas?cpv=...&apyvarta=...&patirtis=...      /api/sutartys/busena
 *   /api/sutartys/sutartis?nr=...&pirkejas=<kodas>                 /api/sutartys/sarasas/<kodas>
 * atsako iš viešų šaltinių (Valstybės duomenų agentūros viešųjų pirkimų sutartys, Registrų centro finansinės ataskaitos,
 * TED), kurie nepriima naršyklės užklausų. Užklausos šaltiniams - tik iš anksto apibrėžtos (viesos-sutartys-logika.js),
 * rezultatas laikomas atmintyje 24 val.; nepavykus - paskutinis geras (iki 7 d.) su žyma „pasenęs“. Jei darbas trunka
 * ilgiau nei 40 s, atsakoma 202 („ruošiama“), darbas tęsiamas ir kitas kartas atsako iš talpyklos.
 * Pirkimo vykdytojų iš L.NUOLATINIAI sutarčių sąrašai (paieškai pagal pavadinimą) renkami paleidus ir atnaujinami fone - žmogus jų nelaukia.
 * Logika ir tikrinimai - viesos-sutartys-logika.js (testai - serveris/testai.html). Diegimas - README.md.
 *
 * Saugumas:
 *  - klausosi tik 127.0.0.1 (pasiekiama per nginx); veikia kaip systemd DynamicUser be teisių; raktų neturi; į diską nerašo;
 *  - šaltinių kompiuteriai ir keliai - konstantos (L.SALTINIAI), TLS tikrinamas, nukreipimai nesekami, laiko ir dydžio ribos;
 *  - vienu metu - ne daugiau MAX_DARBU darbų, kiekviename - 2 lygiagrečios šaltinio užklausos;
 *  - užklausų turinys (pirkėjo kodas, BVPŽ, ribos) į žurnalą nerašomas - tik darbo rūšis, trukmė, kiekiai ir klaidų rūšys.
 * ============================================================================ */
"use strict";

const http = require("node:http");
const https = require("node:https");
const L = require("./viesos-sutartys-logika.js");

const NAUDOTOJO_AGENTAS = "G-Procure viesu sutarciu duomenys (https://g-procure.com/saugumas.html)";
const PORTAS = Number(process.env.PORT || 3003);
const RIBA_IP_MIN = 30;                 // užklausų per minutę vienam IP (nginx riba - pirmoji, ši - antroji)
const LAUKTI_MS = 40000;                // tiek laukiama darbo, paskui - 202 „ruošiama“
const UZKLAUSOS_MS = 30000;             // vienai šaltinio užklausai
const ILGIAUSIAI_MS = 180000;           // užklausa gali prašyti ilgesnio laukimo (uz.laikas), bet ne ilgiau
const MAX_ATSAKYMO = 20 * 1048576;      // šaltinio atsakymo riba
const MAX_DARBU = 2;                    // vienu metu vykdomi darbai
const MAX_TALPYKLOS = 300;              // įrašų talpykloje
const DALINIO_TTL_MS = 30 * 60000;      // jei vienas šaltinis nepavyko - rezultatas laikomas tik 30 min.
const NESEKMES_MS = 60000;              // nepavykus - tas pats darbas nekartojamas minutę
const KLAIDOS_PAUZE_MS = 10 * 60000;    // pasenęs įrašas po nesėkmės - naujo bandymo ne dažniau nei kas 10 min.

function zurnalas(ivykis, duomenys) {
  // Tik suvestinės: jokio užklausų turinio
  console.log(JSON.stringify(Object.assign({ laikas: new Date().toISOString(), ivykis: ivykis }, duomenys || {})));
}

class SaltinioKlaida extends Error {
  constructor(rusis, kartoti) { super(rusis); this.rusis = rusis; this.kartoti = !!kartoti; }
}
const miegok = ms => new Promise(r => setTimeout(r, ms));
// Laukimas be duomenų: numatyta UZKLAUSOS_MS, užklausa gali prašyti ilgesnio (didelis šaltinio sąrašas), bet ne ilgiau ILGIAUSIAI_MS
function laukimas(uz) { const l = Number(uz && uz.laikas); return isFinite(l) && l > UZKLAUSOS_MS ? Math.min(l, ILGIAUSIAI_MS) : UZKLAUSOS_MS; }

// Viena šaltinio užklausa: tik L.SALTINIAI kompiuteris ir kelias; kelias perduodamas toks, kokį sudarė logika
// (šaltinio užklausų kalba neatkoduoja %22 - todėl ne fetch(), kuris kabutes užkoduotų)
function gaukVienas(uz) {
  const cfg = L.SALTINIAI[uz && uz.saltinis];
  if (!cfg) return Promise.reject(new SaltinioKlaida("saltinis-kita", false));
  let kelias = cfg.kelias, kunas = null;
  if (uz.saltinis === "ted") kunas = Buffer.from(JSON.stringify(uz.kunas), "utf8");
  else kelias += uz.kelias;
  if (typeof kelias !== "string" || /[^\x21-\x7E]/.test(kelias) || kelias.length > 16000) return Promise.reject(new SaltinioKlaida("saltinis-kita", false));
  return new Promise((pavyko, nepavyko) => {
    const antr = { "User-Agent": NAUDOTOJO_AGENTAS, "Accept": "application/json" };
    if (kunas) { antr["Content-Type"] = "application/json"; antr["Content-Length"] = kunas.length; }
    const req = https.request({ hostname: cfg.kompiuteris, port: 443, path: kelias, method: kunas ? "POST" : "GET", headers: antr, timeout: laukimas(uz) }, res => {
      const st = res.statusCode;
      if (st !== 200) {
        res.resume();
        return nepavyko(st >= 300 && st < 400 ? new SaltinioKlaida("saltinis-kita", false) : (st >= 500 || st === 429) ? new SaltinioKlaida("saltinis-500", true) : new SaltinioKlaida("saltinis-kita", false));
      }
      const ilgis = Number(res.headers["content-length"]);
      if (isFinite(ilgis) && ilgis > MAX_ATSAKYMO) { res.resume(); return nepavyko(new SaltinioKlaida("per-didelis", false)); }
      const dalys = []; let viso = 0;
      res.on("data", d => {
        viso += d.length;
        if (viso > MAX_ATSAKYMO) { req.destroy(new SaltinioKlaida("per-didelis", false)); return; }
        dalys.push(d);
      });
      res.on("end", () => {
        try { pavyko(JSON.parse(Buffer.concat(dalys).toString("utf8"))); }
        catch (e) { nepavyko(new SaltinioKlaida("netiketa-sandara", false)); }
      });
      res.on("error", () => nepavyko(new SaltinioKlaida("rysys", true)));
    });
    req.on("timeout", () => req.destroy(new SaltinioKlaida("laikas", true)));
    req.on("error", e => nepavyko(e instanceof SaltinioKlaida ? e : new SaltinioKlaida("rysys", true)));
    if (kunas) req.write(kunas);
    req.end();
  });
}

// Šaltinis (ypač get.data.gov.lt) kartais atsako HTTP 500 - iki 3 bandymų su pauzėmis
async function gauk(uz) {
  for (let bandymas = 1; ; bandymas++) {
    try { return await gaukVienas(uz); }
    catch (e) {
      if (!(e instanceof SaltinioKlaida) || !e.kartoti || bandymas >= 3) throw e;
      await miegok(bandymas * 1500);
    }
  }
}

// Talpykla: raktas -> { laikas, duomenys, ttl, klaida?, klaidosLaikas? }
const TALPYKLA = new Map();
const VYKDOMI = new Map();
const NESEKMES = new Map();
let paskutineKlaida = null;
function idek(raktas, irasas) {
  TALPYKLA.delete(raktas);
  TALPYKLA.set(raktas, irasas);
  while (TALPYKLA.size > MAX_TALPYKLOS) TALPYKLA.delete(TALPYKLA.keys().next().value);
}

// Darbų eilė - ne daugiau MAX_DARBU vienu metu
let vykdoma = 0;
const laukia = [];
function eileje() { return new Promise(r => { if (vykdoma < MAX_DARBU) { vykdoma++; r(); } else laukia.push(r); }); }
function atlaisvink() { const k = laukia.shift(); if (k) k(); else vykdoma--; }

function dalinis(d) { return !!(d && d.klaidos && Object.keys(d.klaidos).length); }

/* o.fone - pasenęs, bet dar tinkamas (iki 7 d.) įrašas grąžinamas iš karto, o naujas renkamas fone (sutarčių sąrašas renkamas apie
   minutę - žmogus jo nelaukia); atsakymo meta.pasenusi tada true. */
function irasas(raktas, tipas, vykdyk, o) {
  const dabar = Date.now(), esamas = TALPYKLA.get(raktas);
  if (esamas && !esamas.klaida && dabar - esamas.laikas < esamas.ttl) return Promise.resolve(esamas);
  if (esamas && esamas.klaida && dabar - esamas.klaidosLaikas < KLAIDOS_PAUZE_MS) return Promise.resolve(esamas);
  const nes = NESEKMES.get(raktas);
  if (!esamas && nes && dabar - nes.laikas < NESEKMES_MS) return Promise.reject(new SaltinioKlaida(nes.rusis, false));
  if (o && o.fone && esamas && dabar - esamas.laikas < L.PASENES_MAX_D * 86400000) {
    if (!VYKDOMI.has(raktas)) paleisk(raktas, tipas, vykdyk).catch(() => {});
    return Promise.resolve(esamas);
  }
  if (VYKDOMI.has(raktas)) return VYKDOMI.get(raktas);
  return paleisk(raktas, tipas, vykdyk);
}
function paleisk(raktas, tipas, vykdyk) {
  const p = (async () => {
    await eileje();
    const pradzia = Date.now();
    try {
      const d = await vykdyk();
      const ir = { laikas: Date.now(), duomenys: d, ttl: dalinis(d) ? DALINIO_TTL_MS : L.TTL_VAL * 3600000 };
      idek(raktas, ir);
      NESEKMES.delete(raktas);
      zurnalas("darbas-baigtas", { tipas: tipas, sek: Math.round((Date.now() - pradzia) / 1000), dalinis: dalinis(d) });
      return ir;
    } catch (e) {
      const rusis = e && typeof e.rusis === "string" ? e.rusis : "vidine";
      paskutineKlaida = { laikas: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), rusis: rusis };
      zurnalas("darbas-nepavyko", { tipas: tipas, rusis: rusis });
      const senas = TALPYKLA.get(raktas);
      if (senas && Date.now() - senas.laikas < L.PASENES_MAX_D * 86400000) {
        senas.klaida = rusis; senas.klaidosLaikas = Date.now();
        return senas;
      }
      NESEKMES.set(raktas, { laikas: Date.now(), rusis: rusis });
      throw new SaltinioKlaida(rusis, false);
    } finally {
      atlaisvink();
      VYKDOMI.delete(raktas);
    }
  })();
  VYKDOMI.set(raktas, p);
  return p;
}

const PARINKTYS = { lygiagreciai: 2 };
function sarasas(jar) {
  return irasas("l:" + jar, "sarasas", () => L.vykdykSarasas({ jar: jar }, gauk, Object.assign({ dabar: Date.now() }, PARINKTYS)), { fone: true });
}
/* Sutarčių sąrašai, laikomi paruošti iš anksto (L.NUOLATINIAI - viešai žinomi pirkimo vykdytojų kodai): renkami paleidus ir atnaujinami,
   kai įrašas senesnis nei 11 val. - kad žmogui, ieškančiam sutarties, nereikėtų laukti apie minutę trunkančio surinkimo. */
const SILDYMO_MS = 6 * 3600000, SILDYTI_NUO_MS = 11 * 3600000, SILDYTI_PO_KLAIDOS_MS = 10 * 60000;
let sildymoKartojimas = null;
async function sildyk() {
  let nepavyko = false;
  for (const jar of L.NUOLATINIAI) {
    const raktas = "l:" + jar, e = TALPYKLA.get(raktas);
    if (e && !e.klaida && Date.now() - e.laikas < SILDYTI_NUO_MS) continue;
    if (VYKDOMI.has(raktas)) continue;
    try { const ir = await paleisk(raktas, "sarasas", () => L.vykdykSarasas({ jar: jar }, gauk, Object.assign({ dabar: Date.now() }, PARINKTYS))); if (ir && ir.klaida) nepavyko = true; }
    catch (err) { nepavyko = true; /* klaida jau žurnale (darbas-nepavyko) */ }
  }
  // Šaltinis kartais atsako klaida (HTTP 500, ilgas laukimas) - nepavykę sąrašai bandomi dar kartą po 10 min., ne po SILDYMO_MS
  if (nepavyko && !sildymoKartojimas) sildymoKartojimas = setTimeout(() => { sildymoKartojimas = null; sildyk(); }, SILDYTI_PO_KLAIDOS_MS).unref();
}
function rinka(cpv, ted) {
  return irasas("r:" + cpv + ":" + ted, "rinka", () => L.vykdykRinka({ cpv: cpv, ted: ted }, gauk, Object.assign({ dabar: Date.now() }, PARINKTYS)));
}
async function vykdykDarba(d) {
  if (d.tipas === "pirkejas") return { irasas: await irasas(d.raktas, "pirkejas", () => L.vykdykPirkejas(d.p, gauk, Object.assign({ dabar: Date.now() }, PARINKTYS))) };
  if (d.tipas === "sarasas") return { irasas: await sarasas(d.p.jar) };
  if (d.tipas === "sutartis") return { irasas: await irasas(d.raktas, "sutartis", () => L.vykdykSutartis(d.p, gauk, Object.assign({ dabar: Date.now() }, PARINKTYS))) };
  if (d.tipas === "rinka") return { irasas: await rinka(d.p.cpv, d.p.ted) };
  if (d.tipas === "pajegumas") {
    const r = await rinka(d.p.cpv, "lt");
    let papildomai = null;
    if (d.p.apyvarta) {
      const lt = r.duomenys.lt, ted = r.duomenys.ted;
      const kodai = (lt ? lt.vidus.filter(x => x.viesas).map(x => x.kodas) : []).concat(ted ? ted.vidus.map(x => x.kodas) : []);
      try {
        const f = await irasas("f:" + d.p.cpv, "finansai", () => L.vykdykFinansai(kodai, gauk, Object.assign({ dabar: Date.now() }, PARINKTYS)));
        papildomai = f.duomenys;
      } catch (e) { papildomai = null; }      // finansų nepavyko - atsakyme saltiniai.finansai: false, ne „neatitinka“
    }
    return { irasas: r, papildomai: papildomai };
  }
  throw new SaltinioKlaida("vidine", false);
}

function busena() {
  return { talpykloje: TALPYKLA.size, vykdoma: VYKDOMI.size, laukia: laukia.length, paskutineKlaida: paskutineKlaida };
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

function siusk(req, res, r) {
  if (res.headersSent) return;
  res.writeHead(r.status, r.antrastes);
  res.end(req.method === "HEAD" ? undefined : r.kunas);
}

const serveris = http.createServer(async (req, res) => {
  try {
    const vietinis = req.socket.remoteAddress === "127.0.0.1" || req.socket.remoteAddress === "::1" || req.socket.remoteAddress === "::ffff:127.0.0.1";
    const ip = vietinis && typeof req.headers["x-real-ip"] === "string" ? req.headers["x-real-ip"].slice(0, 64) : String(req.socket.remoteAddress);
    const kilme = req.headers.origin;
    if (!leidziama(ip)) {
      const r = L.jsonAtsakymas(429, { klaida: "Per daug užklausų - pabandykite po minutės." }, kilme);
      r.antrastes["Retry-After"] = "60";
      return siusk(req, res, r);
    }
    const m = L.marsrutas(req.method, req.url, kilme, busena());
    if (m.atsakymas) return siusk(req, res, m.atsakymas);
    let laikmatis = null;
    const lauk = new Promise(r => { laikmatis = setTimeout(() => r(null), LAUKTI_MS); });
    const darbas = vykdykDarba(m.darbas);
    darbas.catch(() => {});                 // jei atsakyta 202, darbas tęsiamas be laukiančio
    try {
      const rez = await Promise.race([darbas, lauk]);
      if (!rez) {
        const r = L.jsonAtsakymas(202, { ruosiama: true, klaida: L.KLAIDOS.ruosiama }, kilme);
        r.antrastes["Retry-After"] = "8";
        return siusk(req, res, r);
      }
      return siusk(req, res, L.atsakymasDarbo(m.darbas, rez.irasas, kilme, Date.now(), rez.papildomai));
    } catch (e) {
      const rusis = e && typeof e.rusis === "string" ? e.rusis : "saltinis";
      return siusk(req, res, L.jsonAtsakymas(503, { klaida: L.KLAIDOS.saltinis, rusis: L.KLAIDU_RUSYS[rusis] ? rusis : "saltinis" }, kilme));
    } finally { clearTimeout(laikmatis); }
  } catch (e) {
    zurnalas("uzklausos-klaida", { rusis: e && e.name ? e.name : "nezinoma" });
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ klaida: "Vidinė klaida." }));
  }
});
serveris.requestTimeout = 60000;
serveris.headersTimeout = 8000;
serveris.keepAliveTimeout = 5000;
serveris.maxHeadersCount = 50;
serveris.on("clientError", (e, socket) => { socket.destroy(); });
serveris.on("error", e => { zurnalas("serverio-klaida", { rusis: e && e.code ? e.code : "nezinoma" }); process.exit(1); });

function baik() { serveris.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); }
process.on("SIGTERM", baik);
process.on("SIGINT", baik);

serveris.listen(PORTAS, "127.0.0.1", () => {
  zurnalas("paleista", { portas: PORTAS, versija: L.VERSIJA });
  setTimeout(() => { sildyk(); }, 3000).unref();
  setInterval(() => { sildyk(); }, SILDYMO_MS).unref();
});
