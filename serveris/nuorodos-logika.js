/* ============================================================================
 * G-Procure trumpos kvietimų nuorodos - gryna logika (UMD: Node serveris ir naršyklės testai).
 *
 * Kam (2026-11-27, naudotojo sprendimas „Taip, darykite trumpas nuorodas per serverį“): elektroninės apklausos kvietimo nuorodoje
 * („PP-report/pasiulymas.html#k=<kodas>“) yra visas kvietimas, todėl ji ilga (~700 ženklų). Paslauga saugo kvietimo kodą ir duoda
 * trumpą nuorodą „https://g-procure.com/k/#<ID>“; puslapis k/ gauna kodą ir atveria tą patį tiekėjo puslapį.
 *
 * Maršrutai (serveris - nuorodos-serveris.js):
 *   POST /api/k              { iki, kodai: [...] }            -> { nuorodos: [{ id, trynimas }], galioja }   (tik G-Procure kilmė)
 *   GET  /api/k/<ID>                                          -> { kodas, galioja }
 *   POST /api/k/trinti       { nuorodos: [{ id, trynimas }] } -> { istrinta }                           (tik G-Procure kilmė)
 *   GET  /api/k/busena                                        -> { versija, irasu, ... }
 *
 * Principai:
 *  - Saugomas tik kvietimo kodas (be kainų - kvietime jų nėra), užšifruotas raktu, išvestu iš ID (scrypt) - serverio diske be ID
 *    jo perskaityti negalima; ID yra tik laiške tiekėjui ir iniciatoriaus naršyklėje.
 *  - Galioja iki pasiūlymų termino + 30 d. (ne ilgiau kaip 200 d.); iniciatorius gali ištrinti anksčiau (trynimo raktas).
 *  - ID - 10 ženklų Crockford base32 (50 bitų): be I, L, O, U; skaitant O -> 0, I ir L -> 1, mažosios - didžiosios.
 *  - Užklausų turinys (ID, kodai) į žurnalą nerašomas; įvestis atsakyme neatkartojama.
 * Testai - serveris/testai.html.
 * ============================================================================ */
(function (saknis, fabrikas) {
  if (typeof module === "object" && module.exports) module.exports = fabrikas();
  else saknis.GP_NUORODOS_API = fabrikas();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSIJA = "2026-11-27";
  var KILMES = ["https://g-procure.com", "https://www.g-procure.com"];
  var VIETINE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
  var ABECELE = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";       // Crockford base32
  var ID_ILGIS = 10;
  var ID_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/;
  var KODO_RE = /^g[01]\.[A-Za-z0-9_-]{16,12000}$/;
  var TRYNIMO_RE = /^[A-Za-z0-9_-]{22}$/;
  var MAX_PARTIJOJE = 12;              // tiek tiekėjų gali būti vienoje apklausoje (PP-report RIBOS.tiekejai)
  var MAX_KUNO = 200 * 1024;           // užklausos kūnas (12 x 12 000 ženklų ir apvalkalas)
  var MAX_IRASU = 5000;                // galiojančių nuorodų iš viso
  var PO_TERMINO_D = 30;
  var MAX_D = 200;
  var DIENA = 86400000;

  /* ID iš teksto: tarpai ir brūkšneliai nepaisomi, mažosios - didžiosios, O -> 0, I ir L -> 1. Netinkamas - null. */
  function normId(s) {
    if (typeof s !== "string" || s.length > 40) return null;
    var x = s.replace(/[\s-]/g, "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
    return ID_RE.test(x) ? x : null;
  }
  /* Atsitiktinis ID iš baitų (serveryje - crypto.randomBytes). Kiekvienam ženklui - 5 bitai. */
  function idIsBaitu(baitai) {
    if (!baitai || baitai.length < ID_ILGIS) return null;
    var s = "";
    for (var i = 0; i < ID_ILGIS; i++) s += ABECELE.charAt(baitai[i] & 31);
    return s;
  }
  /* Galiojimo pabaiga (ms): termino + 30 d., ne ilgiau kaip 200 d. nuo dabar. Terminas netinkamas ar praėjęs - null. */
  function galioja(iki, dabar) {
    var t = typeof iki === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?Z$/.test(iki) ? Date.parse(iki) : NaN;
    if (!isFinite(t) || t <= dabar) return null;
    return Math.min(t + PO_TERMINO_D * DIENA, dabar + MAX_D * DIENA);
  }

  var KLAIDOS = {
    kunas: "Užklausos kūnas netinkamas.",
    kodai: "Kvietimų kodai netinkami (1-12, formatas g0. arba g1.).",
    iki: "Pasiūlymų terminas netinkamas arba jau praėjęs.",
    trinti: "Trinamų nuorodų sąrašas netinkamas.",
    nera: "Tokios nuorodos nėra arba ji nebegalioja.",
    kilme: "Kurti ir trinti nuorodas galima tik iš G-Procure puslapių.",
    metodas: "Toks užklausos metodas neleidžiamas.",
    kelias: "Tokio adreso nėra.",
    pilna: "Nuorodų saugykla pilna - bandykite vėliau.",
    daug: "Per daug užklausų - pabandykite po minutės.",
    vidine: "Vidinė klaida."
  };

  function objektas(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : null; }
  /* Kūnas kuriant: { iki, kodai }. -> { ok, kodai, galioja } arba { klaida, parametras } */
  function tikrinkKurima(kunas, dabar) {
    var k = objektas(kunas);
    if (!k) return { klaida: KLAIDOS.kunas, parametras: "kunas" };
    var raktai = Object.keys(k);
    if (raktai.some(function (r) { return r !== "iki" && r !== "kodai"; })) return { klaida: KLAIDOS.kunas, parametras: "kunas" };
    if (!Array.isArray(k.kodai) || !k.kodai.length || k.kodai.length > MAX_PARTIJOJE || !k.kodai.every(function (x) { return typeof x === "string" && KODO_RE.test(x); }))
      return { klaida: KLAIDOS.kodai, parametras: "kodai" };
    var g = galioja(k.iki, dabar);
    if (g === null) return { klaida: KLAIDOS.iki, parametras: "iki" };
    return { ok: true, kodai: k.kodai.slice(), galioja: g };
  }
  /* Kūnas trinant: { nuorodos: [{ id, trynimas }] }. */
  function tikrinkTrynima(kunas) {
    var k = objektas(kunas);
    if (!k || Object.keys(k).some(function (r) { return r !== "nuorodos"; }) || !Array.isArray(k.nuorodos) || !k.nuorodos.length || k.nuorodos.length > MAX_PARTIJOJE)
      return { klaida: KLAIDOS.trinti, parametras: "nuorodos" };
    var sar = [];
    for (var i = 0; i < k.nuorodos.length; i++) {
      var n = objektas(k.nuorodos[i]), id = n ? normId(n.id) : null;
      if (!id || typeof n.trynimas !== "string" || !TRYNIMO_RE.test(n.trynimas)) return { klaida: KLAIDOS.trinti, parametras: "nuorodos" };
      sar.push({ id: id, trynimas: n.trynimas });
    }
    return { ok: true, nuorodos: sar };
  }

  function kilmesAntraste(kilme) {
    return typeof kilme === "string" && (KILMES.indexOf(kilme) >= 0 || VIETINE.test(kilme)) ? kilme : null;
  }
  function antrastes(kilme) {
    var h = { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "Vary": "Origin" };
    var k = kilmesAntraste(kilme);
    if (k) { h["Access-Control-Allow-Origin"] = k; h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"; h["Access-Control-Allow-Headers"] = "Content-Type"; h["Access-Control-Max-Age"] = "600"; }
    return h;
  }
  function json(status, kunas, kilme) { return { status: status, antrastes: antrastes(kilme), kunas: JSON.stringify(kunas) }; }

  /* marsrutas(metodas, adresas, kilme, busena) -> { atsakymas } arba { darbas: { tipas: "gauk" | "kurk" | "trink", id? } }.
     Kūną (kurk, trink) serveris perskaito ir patikrina tikrinkKurima / tikrinkTrynima. */
  function marsrutas(metodas, adresas, kilme, busena) {
    metodas = String(metodas || "").toUpperCase();
    if (typeof adresas !== "string" || adresas.length > 200) return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) };
    var u;
    try { u = new URL(adresas, "http://vietinis"); } catch (e) { return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) }; }
    var kelias = u.pathname;
    if (!/^\/api\/k(\/|$)/.test(kelias)) return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) };
    if (metodas === "OPTIONS") return { atsakymas: { status: 204, antrastes: antrastes(kilme), kunas: "" } };
    if (u.search) return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) };
    if (kelias === "/api/k/busena") {
      if (metodas !== "GET" && metodas !== "HEAD") return { atsakymas: json(405, { klaida: KLAIDOS.metodas }, kilme) };
      return { atsakymas: json(200, Object.assign({ versija: VERSIJA }, busena || {}), kilme) };
    }
    if (kelias === "/api/k" || kelias === "/api/k/trinti") {
      if (metodas !== "POST") return { atsakymas: json(405, { klaida: KLAIDOS.metodas }, kilme) };
      if (!kilmesAntraste(kilme)) return { atsakymas: json(403, { klaida: KLAIDOS.kilme }, kilme) };
      return { darbas: { tipas: kelias === "/api/k" ? "kurk" : "trink" } };
    }
    var m = /^\/api\/k\/([^\/]+)$/.exec(kelias);
    if (m) {
      if (metodas !== "GET" && metodas !== "HEAD") return { atsakymas: json(405, { klaida: KLAIDOS.metodas }, kilme) };
      var id = normId(decodeURIComponentSaugiai(m[1]));
      if (!id) return { atsakymas: json(404, { klaida: KLAIDOS.nera }, kilme) };
      return { darbas: { tipas: "gauk", id: id } };
    }
    return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) };
  }
  function decodeURIComponentSaugiai(s) { try { return decodeURIComponent(s); } catch (e) { return ""; } }

  function isoData(ms) { return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z"); }

  return {
    VERSIJA: VERSIJA, KILMES: KILMES, ABECELE: ABECELE, ID_ILGIS: ID_ILGIS, ID_RE: ID_RE, KODO_RE: KODO_RE, TRYNIMO_RE: TRYNIMO_RE,
    MAX_PARTIJOJE: MAX_PARTIJOJE, MAX_KUNO: MAX_KUNO, MAX_IRASU: MAX_IRASU, PO_TERMINO_D: PO_TERMINO_D, MAX_D: MAX_D, KLAIDOS: KLAIDOS,
    normId: normId, idIsBaitu: idIsBaitu, galioja: galioja, tikrinkKurima: tikrinkKurima, tikrinkTrynima: tikrinkTrynima,
    kilmesAntraste: kilmesAntraste, antrastes: antrastes, json: json, marsrutas: marsrutas, isoData: isoData
  };
});
