/* ============================================================================
 * G-Procure DI užduotys serveryje - gryna logika (be įvesties ir išvesties).
 *
 * Paskirtis (2026-11-08, naudotojo sprendimas „Neutralūs žingsniai“ - kodo apsauga):
 * DI užklausų tekstai (sistemos instrukcijos ir užklausos šablonai) iki šiol gyveno naršyklės moduliuose, o
 * serverio /api/analyze priimdavo bet kokį system tekstą. Dabar modulis siunčia tik UŽDUOTIES pavadinimą ir
 * DUOMENIS, o instrukciją sudaro serveris pagal savo šabloną. Šablonai - privatūs (serveryje
 * /var/www/g-procure/uzduotys/, kopija - g-procure-privatu/serveris/uzduotys/), šiame faile - tik variklis.
 *
 * Kodėl taip:
 *  - Instrukcijos (darbo know-how) nebeskelbiamos viešame kode. Jau paskelbtos lieka saugyklos istorijoje.
 *  - Serveris vykdo tik žinomas užduotis: modelis, atsakymo ilgis ir leidžiami duomenys - šablone, ne užklausoje.
 *  - Kas siunčiama į DI, lieka matoma ir tikrinama naršyklėje: duomenis renka modulis (jo testai tai tikrina).
 *
 * Šablonas (privatus failas, patikimas serverio kodas):
 *   {
 *     id: "pp-graphs.en-pavadinimas",           // <modulis>.<užduotis>, mažosios raidės, skaitmenys, brūkšneliai
 *     modelis: "claude-sonnet-4-6",             // arba modeliai: [...] - kai modulis leidžia rinktis (PP-ts)
 *     maxTokens: 200,                            // <= MAX_TOKENS_RIBA
 *     duomenys: { pavadinimas: { tipas: "tekstas", max: 500, privalomas: true } },
 *     dokumentas: { tipai: ["application/pdf"], maxBaitu: ..., privalomas: true },   // neprivaloma; privalomas - be jo 400
 *     system: "..." arba function (d) { return "..."; },
 *     vartotojas: function (d) { return "..."; }                   // užklausos tekstas iš patikrintų duomenų
 *   }
 * Duomenų tipai: tekstas {max}, skaicius {min, max}, loginis, reiksme {is: [...]}, tekstai {max, kiekis}.
 *
 * Šis failas neturi priklausomybių ir veikia ir Node (serveris), ir naršyklėje (testai - serveris/testai.html).
 * ============================================================================ */
(function (saknis, fabrikas) {
  if (typeof module === "object" && module.exports) module.exports = fabrikas();
  else saknis.GP_DI_UZDUOTYS = fabrikas();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSIJA = "2026-11-08";
  // Kaip serverio index.js (R5, 2026-10-05) ir shared/ai-proxy.js.
  var LEIDZIAMI_MODELIAI = ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"];
  var MAX_TOKENS_RIBA = 8000;
  var ID_RE = /^[a-z0-9-]{2,40}\.[a-z0-9-]{2,60}$/;
  var LAUKO_RE = /^[A-Za-z][A-Za-z0-9_]{0,40}$/;
  var TIPAI = ["tekstas", "skaicius", "loginis", "reiksme", "tekstai"];
  var DOK_TIPAI = ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"];
  // Kūno riba - kaip nginx ir express (10 MB); dokumento base64 - kaip shared/ai-proxy.js MAX_BASE64.
  var MAX_BASE64 = 9 * 1024 * 1024;
  var MAX_TEKSTO = 400000;

  var KLAIDOS = {
    kunas: "Netaisyklinga užklausa.",
    uzduotis: "Nežinoma DI užduotis.",
    laukas: "Užklausoje yra nežinomas laukas.",
    duomenys: "Netinkami užduoties duomenys.",
    dokumentas: "Netinkamas dokumentas.",
    modelis: "Šis DI modelis šiai užduočiai neleidžiamas."
  };

  function objektas(x) { return !!x && typeof x === "object" && !Array.isArray(x); }

  // Valdymo simboliai šalinami (išskyrus eilutės lūžį ir tabuliaciją) - kaip CVP IS duomenyse.
  function svarus(t) { return String(t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""); }

  /* ---------------------------------------------------------------------------
   * Šablonų tikrinimas (serverio paleidimo metu). Klaida šablone - paleidimas sustoja, ne tyli užduotis.
   * ------------------------------------------------------------------------- */
  function tikrinkSchema(id, schema) {
    if (!objektas(schema)) throw new Error(id + ": duomenys - objektas");
    Object.keys(schema).forEach(function (k) {
      var s = schema[k];
      if (!LAUKO_RE.test(k)) throw new Error(id + ": netinkamas lauko vardas " + k);
      if (!objektas(s) || TIPAI.indexOf(s.tipas) < 0) throw new Error(id + "." + k + ": tipas - " + TIPAI.join(", "));
      if ((s.tipas === "tekstas" || s.tipas === "tekstai") && !(s.max > 0 && s.max <= MAX_TEKSTO)) throw new Error(id + "." + k + ": tekstui reikia max (1-" + MAX_TEKSTO + ")");
      if (s.tipas === "tekstai" && !(s.kiekis > 0 && s.kiekis <= 2000)) throw new Error(id + "." + k + ": tekstams reikia kiekis (1-2000)");
      if (s.tipas === "reiksme" && !(Array.isArray(s.is) && s.is.length && s.is.every(function (v) { return typeof v === "string"; }))) throw new Error(id + "." + k + ": reikšmei reikia sąrašo is");
      if (s.tipas === "skaicius" && (typeof s.min !== "number" || typeof s.max !== "number" || s.min > s.max)) throw new Error(id + "." + k + ": skaičiui reikia min ir max");
    });
  }

  function registruok(sablonai) {
    var reg = Object.create(null);
    (sablonai || []).forEach(function (s) {
      if (!objektas(s) || typeof s.id !== "string" || !ID_RE.test(s.id)) throw new Error("Šablonas be tinkamo id: " + (s && s.id));
      if (reg[s.id]) throw new Error("Pasikartojantis šablonas: " + s.id);
      var modeliai = s.modeliai || [s.modelis];
      if (!Array.isArray(modeliai) || !modeliai.length || !modeliai.every(function (m) { return LEIDZIAMI_MODELIAI.indexOf(m) >= 0; }))
        throw new Error(s.id + ": modelis turi būti iš " + LEIDZIAMI_MODELIAI.join(", "));
      if (s.modelis && modeliai.indexOf(s.modelis) < 0) throw new Error(s.id + ": numatytasis modelis ne iš modeliai");
      if (!(Number.isInteger(s.maxTokens) && s.maxTokens > 0 && s.maxTokens <= MAX_TOKENS_RIBA)) throw new Error(s.id + ": maxTokens 1-" + MAX_TOKENS_RIBA);
      if (typeof s.system !== "string" && typeof s.system !== "function") throw new Error(s.id + ": system - tekstas ar funkcija");
      if (typeof s.vartotojas !== "function") throw new Error(s.id + ": vartotojas - funkcija");
      tikrinkSchema(s.id, s.duomenys || {});
      if (s.dokumentas) {
        if (!objektas(s.dokumentas) || !Array.isArray(s.dokumentas.tipai) || !s.dokumentas.tipai.length ||
            !s.dokumentas.tipai.every(function (t) { return DOK_TIPAI.indexOf(t) >= 0; })) throw new Error(s.id + ": dokumento tipai - " + DOK_TIPAI.join(", "));
        if (!(s.dokumentas.maxBaitu > 0 && s.dokumentas.maxBaitu <= MAX_BASE64)) throw new Error(s.id + ": dokumento maxBaitu 1-" + MAX_BASE64);
        if (s.dokumentas.privalomas !== undefined && typeof s.dokumentas.privalomas !== "boolean") throw new Error(s.id + ": dokumento privalomas - true ar false");
      }
      reg[s.id] = { id: s.id, modeliai: modeliai, modelis: s.modelis || modeliai[0], maxTokens: s.maxTokens,
        duomenys: s.duomenys || {}, dokumentas: s.dokumentas || null, system: s.system, vartotojas: s.vartotojas };
    });
    return reg;
  }

  /* ---------------------------------------------------------------------------
   * Duomenų tikrinimas: tik šablone aprašyti laukai, jų tipai ir ribos. Klaidos tekste - lauko vardas,
   * bet NE reikšmė (įvestis atsakyme neatkartojama).
   * ------------------------------------------------------------------------- */
  function tikrinkDuomenis(schema, d) {
    if (d === undefined || d === null) d = {};
    if (!objektas(d)) return { klaida: KLAIDOS.duomenys };
    var raktai = Object.keys(d);
    for (var i = 0; i < raktai.length; i++) if (!Object.prototype.hasOwnProperty.call(schema, raktai[i])) return { klaida: KLAIDOS.duomenys, laukas: raktai[i].slice(0, 40) };
    var out = {};
    var vardai = Object.keys(schema);
    for (var j = 0; j < vardai.length; j++) {
      var k = vardai[j], s = schema[k], v = d[k];
      if (v === undefined || v === null || v === "") {
        if (s.privalomas) return { klaida: KLAIDOS.duomenys, laukas: k };
        continue;
      }
      if (s.tipas === "tekstas") {
        if (typeof v !== "string" || v.length > s.max) return { klaida: KLAIDOS.duomenys, laukas: k };
        out[k] = svarus(v);
      } else if (s.tipas === "skaicius") {
        if (typeof v !== "number" || !isFinite(v) || v < s.min || v > s.max) return { klaida: KLAIDOS.duomenys, laukas: k };
        out[k] = v;
      } else if (s.tipas === "loginis") {
        if (typeof v !== "boolean") return { klaida: KLAIDOS.duomenys, laukas: k };
        out[k] = v;
      } else if (s.tipas === "reiksme") {
        if (typeof v !== "string" || s.is.indexOf(v) < 0) return { klaida: KLAIDOS.duomenys, laukas: k };
        out[k] = v;
      } else if (s.tipas === "tekstai") {
        if (!Array.isArray(v) || v.length > s.kiekis || !v.every(function (x) { return typeof x === "string" && x.length <= s.max; }))
          return { klaida: KLAIDOS.duomenys, laukas: k };
        out[k] = v.map(svarus);
      }
    }
    return { duomenys: out };
  }

  function tikrinkDokumenta(taisykle, dok) {
    if (dok === undefined || dok === null) return taisykle && taisykle.privalomas ? { klaida: KLAIDOS.dokumentas } : { dokumentas: null };
    if (!taisykle) return { klaida: KLAIDOS.dokumentas };
    if (!objektas(dok) || Object.keys(dok).some(function (k) { return k !== "tipas" && k !== "duomenys"; })) return { klaida: KLAIDOS.dokumentas };
    if (taisykle.tipai.indexOf(dok.tipas) < 0) return { klaida: KLAIDOS.dokumentas };
    if (typeof dok.duomenys !== "string" || !dok.duomenys.length || dok.duomenys.length > taisykle.maxBaitu || !/^[A-Za-z0-9+/]+={0,2}$/.test(dok.duomenys))
      return { klaida: KLAIDOS.dokumentas };
    return { dokumentas: { tipas: dok.tipas, duomenys: dok.duomenys } };
  }

  /* ---------------------------------------------------------------------------
   * Užklausa: { uzduotis, duomenys, dokumentas?, modelis? } -> Anthropic Messages kūnas.
   * Grąžina { status, klaida } arba { anthropic, sablonas }.
   * ------------------------------------------------------------------------- */
  function sudaryk(kunas, reg) {
    if (!objektas(kunas)) return { status: 400, klaida: KLAIDOS.kunas };
    var leidziami = ["uzduotis", "duomenys", "dokumentas", "modelis"];
    if (Object.keys(kunas).some(function (k) { return leidziami.indexOf(k) < 0; })) return { status: 400, klaida: KLAIDOS.laukas };
    if (typeof kunas.uzduotis !== "string" || !ID_RE.test(kunas.uzduotis) || !reg[kunas.uzduotis]) return { status: 404, klaida: KLAIDOS.uzduotis };
    var s = reg[kunas.uzduotis];
    var modelis = s.modelis;
    if (kunas.modelis !== undefined) {
      if (typeof kunas.modelis !== "string" || s.modeliai.indexOf(kunas.modelis) < 0) return { status: 400, klaida: KLAIDOS.modelis };
      modelis = kunas.modelis;
    }
    var d = tikrinkDuomenis(s.duomenys, kunas.duomenys);
    if (d.klaida) return { status: 400, klaida: d.klaida, laukas: d.laukas };
    var dk = tikrinkDokumenta(s.dokumentas, kunas.dokumentas);
    if (dk.klaida) return { status: 400, klaida: dk.klaida };
    var sistema = typeof s.system === "function" ? s.system(d.duomenys) : s.system;
    var tekstas = s.vartotojas(d.duomenys);
    if (typeof sistema !== "string" || typeof tekstas !== "string" || !tekstas) throw new Error(s.id + ": šablonas grąžino ne tekstą");
    var turinys = [];
    if (dk.dokumentas) {
      var pdf = dk.dokumentas.tipas === "application/pdf";
      turinys.push({ type: pdf ? "document" : "image", source: { type: "base64", media_type: dk.dokumentas.tipas, data: dk.dokumentas.duomenys } });
    }
    turinys.push({ type: "text", text: tekstas });
    var anthropic = { model: modelis, max_tokens: s.maxTokens, messages: [{ role: "user", content: turinys }] };
    if (sistema) anthropic.system = sistema;
    return { anthropic: anthropic, sablonas: s.id };
  }

  return {
    VERSIJA: VERSIJA, LEIDZIAMI_MODELIAI: LEIDZIAMI_MODELIAI, MAX_TOKENS_RIBA: MAX_TOKENS_RIBA, ID_RE: ID_RE, TIPAI: TIPAI,
    DOK_TIPAI: DOK_TIPAI, MAX_BASE64: MAX_BASE64, KLAIDOS: KLAIDOS,
    registruok: registruok, tikrinkDuomenis: tikrinkDuomenis, tikrinkDokumenta: tikrinkDokumenta, sudaryk: sudaryk, svarus: svarus
  };
});
