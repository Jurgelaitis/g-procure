/* ============================================================================
 * G-Procure Tiekėjams  paieska.js
 * ----------------------------------------------------------------------------
 * Hibridinė paieška NARŠYKLĖJE be serverio (window.GP_PAIESKA):
 *   1) tiksli terminų / numerių / kodų paieška (pvz. "4.2", "EBVPD", "90 dienų");
 *   2) BM25 leksinė paieška su LT diakritikų suliejimu ir grubiu kamienu;
 *   3) metaduomenų filtrai: dokumentų sąrašas (docIds), kalba, pirkimo dalis.
 * Semantinės (vektorinės) paieškos MVP nėra - ji reikalautų serverio arba
 * didelio modelio naršyklėje; BM25 + tikslus atitikimas dengia pirkimo
 * dokumentų atvejį (terminai, punktai, formos) pakankamai, o trūkstamą
 * sinonimiją kompensuoja AI perklausimas su plačiu kandidatų rinkiniu.
 *
 * KRITINĖ TAISYKLĖ: indeksas visada kuriamas TIK vieno pirkimo fragmentams -
 * kito pirkimo įrodymai į atsakymą patekti negali (žr. asistentas.js).
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var STOP = {};
  ["ir","ar","arba","bei","kad","kai","kaip","kur","kas","ką","ko","kam","tai","tą","to","tos","tų","šis","ši","šio","šios","yra","būti","bus","buvo","turi","gali","dėl","iki","nuo","pagal","per","su","be","į","iš","o","bet","jei","jeigu","tik","taip","ne","nėra","the","a","an","of","to","in","and","or","for","is","are","be","by","on","at","with","as","that","this","it","shall","will"].forEach(function (w) { STOP[w] = 1; });

  var DIAK = { "ą":"a","č":"c","ę":"e","ė":"e","į":"i","š":"s","ų":"u","ū":"u","ž":"z" };
  function fold(s) { return String(s).toLowerCase().replace(/[ąčęėįšųūž]/g, function (c) { return DIAK[c]; }); }

  // Grubus LT/EN kamienas: nukertam dažniausias galūnes, paliekam >= 4 simbolius
  var GALUNES = /(iausiais|iausius|iausias|iausiam|iausio|iausia|ojimo|ojimu|ojimas|imams|imais|imuose|imus|imai|imo|imu|imas|ims|ais|ams|uose|ose|ems|ims|iams|ius|ias|ios|ius|iui|iai|ies|ių|ų|ai|ui|as|is|us|ys|es|os|ei|ą|ę|į|ū|ėj|ėje|oje|ej|e|a|i|o|u|s|ing|tion|ed|ly|es)$/;
  function stem(t) {
    if (t.length <= 4 || /\d/.test(t)) return t;
    var s = t.replace(GALUNES, "");
    return s.length >= 4 ? s : t;
  }
  function tokens(text) {
    var out = [];
    fold(text).replace(/[^a-z0-9.\-\/%]+/g, " ").split(/\s+/).forEach(function (w) {
      w = w.replace(/^[.\-\/]+|[.\-\/]+$/g, "");
      if (!w || STOP[w]) return;
      if (w.length < 2) return;
      out.push(stem(w));
    });
    return out;
  }

  // Tikslūs raktai užklausoje: punktų numeriai, kodai, skaičiai su vienetais, santrumpos didžiosiomis
  function tikslusRaktai(q) {
    var out = [];
    var s = String(q || "");
    (s.match(/\b\d{1,3}(?:\.\d{1,3}){1,4}\b\.?/g) || []).forEach(function (m) { out.push(m.replace(/\.$/, "")); });       // 4.2, 12.3.1
    (s.match(/\b\d{1,4}\s?(?:d\.|dien|proc|%|eur|mėn|val)/gi) || []).forEach(function (m) { out.push(m); });        // 90 dienų, 30 proc.
    (s.match(/(?:^|[^A-Za-zĄ-ž])([A-ZĄČĘĖĮŠŲŪŽ]{3,})(?![A-Za-zĄ-ž])/g) || []).forEach(function (m) { out.push(m.replace(/^[^A-ZĄČĘĖĮŠŲŪŽ]+/, "")); }); // EBVPD, BVPŽ, SPS
    (s.match(/\b\d{8}(?:-\d)?\b/g) || []).forEach(function (m) { out.push(m); });                                    // BVPŽ kodai
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function index(chunks) {
    var N = chunks.length, df = {}, docs = [], totalLen = 0;
    chunks.forEach(function (c, i) {
      var tk = tokens(c.text), tf = {};
      tk.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      docs.push({ i: i, tf: tf, len: tk.length, folded: fold(c.text) });
      totalLen += tk.length;
    });
    return { chunks: chunks, docs: docs, df: df, N: N, avgLen: N ? totalLen / N : 0 };
  }

  function search(idx, query, opts) {
    opts = opts || {};
    var limit = opts.limit || 12;
    var k1 = 1.4, b = 0.75;
    var qt = tokens(query);
    var exact = tikslusRaktai(query).map(fold);
    var results = [];
    idx.docs.forEach(function (d) {
      var c = idx.chunks[d.i];
      if (opts.docIds && opts.docIds.length && opts.docIds.indexOf(c.docId) === -1) return;
      if (opts.lang && c.lang && opts.lang !== c.lang) return;
      var score = 0, why = [];
      qt.forEach(function (t) {
        var f = d.tf[t]; if (!f) return;
        var n = idx.df[t] || 0;
        var idf = Math.log(1 + (idx.N - n + 0.5) / (n + 0.5));
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / (idx.avgLen || 1)));
      });
      exact.forEach(function (e) {
        if (e && d.folded.indexOf(e) !== -1) { score += 2.5; why.push(e); }
      });
      if (score > 0) results.push({ chunk: c, score: score, exact: why });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, limit);
  }

  // Citatos patikra. Citata laikoma patvirtinta TIK kai normalizuota VISA citata
  // (diakritikos suliejamos, viskas be raidžių/skaitmenų virsta tarpu) randama
  // normalizuotame tekste kaip IŠTISINĖ eilutė su žodžių ribomis. Anksčiau buvo
  // žodžių maišas (>= 70 proc. kamienų kur nors tekste) - jis praleisdavo
  // apverstą prasmę ("reikalaujamas" tilpdavo į "nereikalaujamas", pakeistą
  // skaičių, žodžius, surinktus iš skirtingų sakinių). Tolerancija paliekama
  // TIK citatos kraštams: jei citata >= 6 žodžių, leidžiama nukirpti po vieną
  // žodį iš pradžios ir/ar pabaigos - toks atitikimas grąžinamas kaip APYTIKSLIS
  // (tikslus:false), kad sąsaja jį pažymėtų.
  function normCit(s) { return fold(String(s)).replace(/[^a-z0-9%]+/g, " ").trim(); }
  // Ištisinė paieška su žodžių ribomis (t turi tarpus kraštuose)
  function rask(q, t) { return !!q && t.indexOf(" " + q + " ") !== -1; }
  // Tas pats NEPAISANT tarpų tekste. Priežastis (patikrinta 2026-09-02 su tikru CVP IS
  // SPS PDF): pdf.js tekste tarpai atsiranda žodžių viduje ("nurod yto", "dien ų",
  // "1 3 priede", "dydi s"), o modelis cituoja švarų tekstą - 3 iš 4 teisingų citatų
  // buvo atmestos. Žodžio riba vis tiek tikrinama ORIGINALIAME normalizuotame tekste:
  // prieš pirmą ir po paskutinio citatos simbolio turi būti tarpas ar teksto kraštas,
  // kad "reikalaujamas" nerastų savęs "nereikalaujamas" viduje.
  function raskBeTarpu(q, t) {
    var qs = q.replace(/ /g, "");
    if (qs.length < 12) return false;
    var ts = "", map = [];
    for (var i = 0; i < t.length; i++) if (t.charAt(i) !== " ") { ts += t.charAt(i); map.push(i); }
    var p = ts.indexOf(qs);
    while (p !== -1) {
      var a = map[p], b = map[p + qs.length - 1];
      if (t.charAt(a - 1) === " " && t.charAt(b + 1) === " ") return true;
      p = ts.indexOf(qs, p + 1);
    }
    return false;
  }
  function citataAtitikimas(quote, text) {
    if (typeof text !== "string" || typeof quote !== "string") return { ok: false, tikslus: false };
    var q = normCit(quote), t = " " + normCit(text) + " ";
    if (!q || q.length < 3) return { ok: false, tikslus: false };
    if (rask(q, t)) return { ok: true, tikslus: true };
    // Tarpų nepaisantis kelias yra ATLAIDESNIS už pažodinį, tad jo rezultatas žymimas
    // apytiksliu (sąsaja rodo žymą). Praktikoje jis beveik nereikalingas: patikrinta su
    // tikru CVP IS paketu - 234 pažodinės ištraukos iš 46 dokumentų visos sutapo tiksliuoju
    // keliu. Jis lieka atsargai tiems PDF, kurių pdf.js vis tiek suskaido, ir būtent todėl
    // neturi atrodyti taip pat patikimai kaip pažodinis sutapimas (pvz. skaičių grupavimas
    // „100 000" ir „1 000 00" nepaisant tarpų sutampa - skaitmenų seka ta pati, bet tai jau
    // ne pažodinė citata).
    if (raskBeTarpu(q, t)) return { ok: true, tikslus: false };
    var w = q.split(" ");
    if (w.length >= 6) {
      var variantai = [w.slice(1).join(" "), w.slice(0, -1).join(" "), w.slice(1, -1).join(" ")];
      for (var i = 0; i < variantai.length; i++) if (rask(variantai[i], t) || raskBeTarpu(variantai[i], t)) return { ok: true, tikslus: false };
    }
    return { ok: false, tikslus: false };
  }
  function citataYra(quote, text) { return citataAtitikimas(quote, text).ok; }

  global.GP_PAIESKA = { version: "0.2.0", index: index, search: search, tokens: tokens, fold: fold, stem: stem, tikslusRaktai: tikslusRaktai, citataYra: citataYra, citataAtitikimas: citataAtitikimas, normCit: normCit };
})(typeof window !== "undefined" ? window : this);
