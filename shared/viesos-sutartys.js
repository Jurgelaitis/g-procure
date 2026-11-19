/* ============================================================================
 * G-Procure  shared/viesos-sutartys.js   (window.GP_VIESOS_SUTARTYS)
 * ----------------------------------------------------------------------------
 * Viešų pirkimų sutarčių duomenys per G-Procure serverį (nuo 2026-11-19; serveris/README.md, paslauga
 * „Viešų pirkimų sutarčių duomenys“): Valstybės duomenų agentūros viešųjų pirkimų sutartys, Registrų centro
 * finansinės ataskaitos (tik suskaičiuoti) ir TED sutarčių sudarymo skelbimai. Šaltiniai naršyklės užklausų
 * nepriima (nėra CORS), todėl - per serverį: GET https://api.g-procure.com/api/sutartys/...
 *
 *   pirkejas(kodas, o)            -> { ok, zemelapis, meta }   PP-plan „Sutarčių žemėlapis“
 *   rinka(bvpz, { ted: "lt"|"es" }) -> { ok, lt, ted, klaidos, meta }   PP-ts „Galimi adresatai“
 *   pajegumas(bvpz, { apyvarta, patirtis }) -> { ok, pajegumas, meta }   PP-qual „Rinkos pajėgumas“ (tik skaičiai)
 *   klaida -> { ok: false, rusis }: "neidiegta" (404 - paslauga dar neįdiegta), "parametrai" (400), "uzimta" (429),
 *            "saltinis" (503 - šaltinis neatsakė), "ruosiama" (serveris vis dar ruošia), "rysys", "atsaukta".
 *   Nepavykęs įkėlimas NIEKADA nėra „sutarčių nėra“ - tekstai žmogui: klaida(rusis, kalba).
 *
 * Kas siunčiama: tik pirkimo vykdytojo kodas, BVPŽ kodo pradžia ir ribos eurais (siunciama(ka, kalba)); be slapukų ir
 * nukreipimo informacijos. Nieko nesaugo. Atsakymo tekstai moduliuose - tik per ekranavimą.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var API_BAZE = "https://api.g-procure.com/api/sutartys";
  var LAUKTI_202_MS = 3000, MAX_202 = 4, LAIKAS_MS = 70000;

  var SALTINIAI = {
    vda: { lt: "Valstybės duomenų agentūra, „Viešųjų pirkimų sutartys“ (CVP IS duomenys), licencija CC BY 4.0",
           en: "State Data Agency, “Public procurement contracts” (CVP IS data), licence CC BY 4.0",
           nuoroda: "https://data.gov.lt/" },
    ted: { lt: "TED (Europos Sąjungos leidinių biuras) - skelbimus galima laisvai pakartotinai naudoti",
           en: "TED (Publications Office of the European Union) - notices may be freely reused",
           nuoroda: "https://ted.europa.eu/" },
    jar: { lt: "Registrų centras, juridinių asmenų finansinės ataskaitos, licencija CC BY 4.0 (naudojama tik suskaičiuoti)",
           en: "Centre of Registers, financial statements of legal entities, licence CC BY 4.0 (used only for counting)",
           nuoroda: "https://data.gov.lt/" }
  };

  var TEKSTAI = {
    lt: {
      neidiegta: "Viešų sutarčių duomenų paslauga G-Procure serveryje dar neįdiegta - duomenų gauti negalima.",
      parametrai: "Užklausa netinkama - patikrinkite BVPŽ kodą ar ribas.",
      uzimta: "Šiuo metu per daug užklausų - pabandykite po minutės.",
      saltinis: "Viešų sutarčių duomenų šaltinis neatsakė - duomenų būsena nežinoma. Bandykite dar kartą vėliau.",
      ruosiama: "Serveris vis dar renka duomenis - pabandykite po minutės (rezultatas bus paruoštas).",
      rysys: "Nėra ryšio su G-Procure serveriu - duomenų būsena nežinoma. Bandykite dar kartą.",
      atsaukta: "Atšaukta.",
      ruosiamaEiga: "Serveris renka duomenis iš viešų šaltinių (gali užtrukti iki minutės)..."
    },
    en: {
      neidiegta: "The public contract data service is not yet installed on the G-Procure server - data cannot be retrieved.",
      parametrai: "Invalid request - check the CPV code or the thresholds.",
      uzimta: "Too many requests right now - try again in a minute.",
      saltinis: "The public contract data source did not respond - data status unknown. Try again later.",
      ruosiama: "The server is still collecting data - try again in a minute (the result will be ready).",
      rysys: "No connection to the G-Procure server - data status unknown. Try again.",
      atsaukta: "Cancelled.",
      ruosiamaEiga: "The server is collecting data from public sources (may take up to a minute)..."
    }
  };
  function klaida(rusis, kalba) { var T = TEKSTAI[kalba === "en" ? "en" : "lt"]; return T[rusis] || T.rysys; }

  /* Kas siunčiama - tekstas prie mygtuko */
  var SIUNCIA = {
    pirkejas: { lt: "Į G-Procure serverį siunčiamas tik pirkimo vykdytojo kodas; serveris viešų sutarčių duomenis gauna iš Valstybės duomenų agentūros. Nieko neišsaugoma.",
                en: "Only the contracting entity code is sent to the G-Procure server; the server gets public contract data from the State Data Agency. Nothing is stored." },
    rinka: { lt: "Į G-Procure serverį siunčiama tik BVPŽ kodo pradžia; serveris duomenis gauna iš Valstybės duomenų agentūros ir TED. Nieko neišsaugoma.",
             en: "Only the beginning of the CPV code is sent to the G-Procure server; the server gets data from the State Data Agency and TED. Nothing is stored." },
    pajegumas: { lt: "Į G-Procure serverį siunčiama tik BVPŽ kodo pradžia ir ribos eurais; serveris grąžina tik skaičius (be įmonių pavadinimų). Nieko neišsaugoma.",
                 en: "Only the beginning of the CPV code and the thresholds in euros are sent to the G-Procure server; the server returns counts only (no company names). Nothing is stored." }
  };
  function siunciama(ka, kalba) { var x = SIUNCIA[ka] || SIUNCIA.rinka; return x[kalba === "en" ? "en" : "lt"]; }
  function saltiniuTekstas(kurie, kalba) {
    var k = kalba === "en" ? "en" : "lt";
    return (k === "en" ? "Sources: " : "Šaltiniai: ") + (kurie || ["vda", "ted"]).map(function (x) { return SALTINIAI[x][k]; }).join("; ") + ".";
  }

  /* BVPŽ kodo pradžia užklausai: „31210000-8“, „31210000“, „3121“ -> „3121“ (galiniai nuliai nuimami, ne trumpiau nei 3 skaitmenys) */
  function cpvPradzia(kodas) {
    var m = /^\s*(\d{3,8})(?:-\d)?\s*$/.exec(String(kodas == null ? "" : kodas));
    if (!m) return null;
    var t = m[1];
    while (t.length > 3 && t.charAt(t.length - 1) === "0") t = t.slice(0, -1);
    return t;
  }
  function atnaujinta(iso, kalba) {
    if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(iso)) return "";
    try {
      return new Intl.DateTimeFormat(kalba === "en" ? "en-GB" : "lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    } catch (e) { return iso.slice(0, 16).replace("T", " "); }
  }

  function laukti(ms, signal) {
    return new Promise(function (r) {
      var t = setTimeout(r, ms);
      if (signal) signal.addEventListener("abort", function () { clearTimeout(t); r(); });
    });
  }

  function kviesk(kelias, o, tinka) {
    o = o || {};
    var f = o.fetch || global.fetch;
    if (typeof f !== "function") return Promise.resolve({ ok: false, rusis: "rysys" });
    var bandymas = 0;
    function vienas() {
      if (o.signal && o.signal.aborted) return Promise.resolve({ ok: false, rusis: "atsaukta" });
      var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var laik = ctl ? setTimeout(function () { ctl.abort(); }, o.laikas || LAIKAS_MS) : null;
      if (ctl && o.signal) o.signal.addEventListener("abort", function () { ctl.abort(); });
      var baik = function (x) { if (laik) clearTimeout(laik); return x; };
      return Promise.resolve().then(function () {
        return f(API_BAZE + kelias, { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", headers: { "Accept": "application/json" }, signal: ctl ? ctl.signal : undefined });
      }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (r.status === 200 && j && typeof j === "object") { var x = tinka(j); if (x) return baik(x); return baik({ ok: false, rusis: "rysys" }); }
          if (r.status === 202) {
            baik(null);
            bandymas++;
            if (bandymas > (o.kartu202 === undefined ? MAX_202 : o.kartu202)) return { ok: false, rusis: "ruosiama" };
            if (o.eiga) try { o.eiga(bandymas); } catch (e) { /* eiga - tik tekstas */ }
            return laukti(o.lauktiMs === undefined ? LAUKTI_202_MS : o.lauktiMs, o.signal).then(vienas);
          }
          if (r.status === 404) return baik({ ok: false, rusis: "neidiegta" });
          if (r.status === 400) return baik({ ok: false, rusis: "parametrai", parametras: j && typeof j.parametras === "string" ? j.parametras.slice(0, 40) : null });
          if (r.status === 429) return baik({ ok: false, rusis: "uzimta" });
          if (r.status >= 500) return baik({ ok: false, rusis: "saltinis" });
          return baik({ ok: false, rusis: "rysys", status: r.status });
        });
      }, function () {
        return baik({ ok: false, rusis: o.signal && o.signal.aborted ? "atsaukta" : "rysys" });
      });
    }
    return vienas();
  }
  function metaIs(j) { var m = j.meta && typeof j.meta === "object" ? j.meta : {}; return { atnaujinta: typeof m.atnaujinta === "string" ? m.atnaujinta : null, pasenusi: m.pasenusi === true, klaida: m.klaida && typeof m.klaida === "object" ? m.klaida : null }; }

  function pirkejas(kodas, o) {
    kodas = String(kodas == null ? "" : kodas).trim();
    if (!/^\d{7,9}$/.test(kodas)) return Promise.resolve({ ok: false, rusis: "parametrai" });
    return kviesk("/pirkejas/" + kodas, o, function (j) {
      var z = j.zemelapis;
      if (!z || typeof z !== "object" || !Array.isArray(z.grupes) || !z.laikotarpis) return null;
      return { ok: true, zemelapis: z, meta: metaIs(j) };
    });
  }
  function rinka(bvpz, o) {
    o = o || {};
    var k = cpvPradzia(bvpz);
    if (!k) return Promise.resolve({ ok: false, rusis: "parametrai" });
    return kviesk("/rinka?cpv=" + k + "&ted=" + (o.ted === "es" ? "es" : "lt"), o, function (j) {
      if (!("lt" in j) || !("ted" in j)) return null;
      var lt = j.lt && typeof j.lt === "object" && Array.isArray(j.lt.tiekejai) ? j.lt : null;
      var ted = j.ted && typeof j.ted === "object" && Array.isArray(j.ted.laimetojai) ? j.ted : null;
      return { ok: true, lt: lt, ted: ted, klaidos: j.klaidos && typeof j.klaidos === "object" ? j.klaidos : {}, meta: metaIs(j), prefiksas: k };
    });
  }
  function pajegumas(bvpz, o) {
    o = o || {};
    var k = cpvPradzia(bvpz);
    var sk = function (v) { var n = typeof v === "number" ? v : NaN; return isFinite(n) && n > 0 && n < 1e11 ? String(Math.round(n * 100) / 100) : null; };
    var ap = sk(o.apyvarta), pt = sk(o.patirtis);
    if (!k || (!ap && !pt)) return Promise.resolve({ ok: false, rusis: "parametrai" });
    return kviesk("/pajegumas?cpv=" + k + (ap ? "&apyvarta=" + ap : "") + (pt ? "&patirtis=" + pt : ""), o, function (j) {
      var p = j.pajegumas;
      if (!p || typeof p !== "object" || typeof p.visi !== "number") return null;
      return { ok: true, pajegumas: p, meta: metaIs(j), prefiksas: k };
    });
  }

  global.GP_VIESOS_SUTARTYS = {
    API_BAZE: API_BAZE, SALTINIAI: SALTINIAI, TEKSTAI: TEKSTAI,
    pirkejas: pirkejas, rinka: rinka, pajegumas: pajegumas,
    cpvPradzia: cpvPradzia, klaida: klaida, siunciama: siunciama, saltiniuTekstas: saltiniuTekstas, atnaujinta: atnaujinta
  };
})(typeof window !== "undefined" ? window : this);
