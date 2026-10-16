/* ==========================================================================
   G-Procure: DI užklausų užkodavimas (window.GP_UZKODAVIMAS, 2026-10-15)

   Tekstas į DI (per G-Procure serverį į Claude API) patenka be tiekėjų ar rinkos dalyvių pavadinimų, jų įmonių kodų,
   el. pašto adresų, telefonų ir sumų. Logika - iš PP-negotiation diSlepk (2026-10-05, R4); pirmas šio failo naudotojas -
   PP-ts rinkos konsultacijos suvestinė. PP-negotiation (diSlepk) ir PP-protocol (aiSlepk) dar turi savo kopijas -
   kandidatai perkelti čia (elgsena ta pati, tik pakaitų tekstai ir kontekstas jų).

   API:
     GP_UZKODAVIMAS.kodas(i, priesdelis)       -> „Dalyvis A“, ..., „Dalyvis Z“, „Dalyvis AA“ (i nuo 0)
     GP_UZKODAVIMAS.vardoVariantai(vardas)     -> [[variantas, tikslus]]: kaip įrašyta, be kabučių, be teisinės formos;
                                                  vienas žodis - tiksliai ir didžiosiomis, keli - nepaisant raidžių dydžio
     GP_UZKODAVIMAS.poros(sarasas)             -> [[ka, kuo, tikslus]] ilgiausi pirmi; sarasas: [{ vardas, kodas, kiti: [[tekstas, kuo]] }]
     GP_UZKODAVIMAS.slepk(tekstas, o)          -> užkoduotas tekstas; o: { poros, sumos: [žinomos sumos], pv, kalba, imones, asmenys }
                                                  sumos su valiuta (ar lygios žinomai >= 1000) - „[x % PV]“, be PV - „[suma neįtraukta]“;
                                                  imones: true - ir kiti įmonių pavadinimai su teisine forma (UAB „X“, „X“, UAB, X OÜ);
                                                  asmenys: true - vardas ir pavardė po etikečių („Kontaktinis asmuo:“, „Pagarbiai,“, „Direktorius“)
     GP_UZKODAVIMAS.sumos(tekstas)             -> [{ suma, citata, pozicija, pvm: "be" | "su" | null }] - sumos su valiuta tekste
   Kitų duomenų (asmenų vardų, adresų) sistema neatpažįsta - modulis tai sako prie DI mygtuko. Nieko nesaugo ir nesiunčia.
   ========================================================================== */
(function () {
  "use strict";

  var PAKAITAI = {
    lt: { el: "[el. paštas neįtrauktas]", tel: "[telefonas neįtrauktas]", kodas: "[kodas neįtrauktas]", suma: "[suma neįtraukta]", imone: "[įmonė neįtraukta]", asmuo: "[asmuo neįtrauktas]" },
    en: { el: "[email removed]", tel: "[phone removed]", kodas: "[code removed]", suma: "[amount removed]", imone: "[company removed]", asmuo: "[person removed]" }
  };
  /* Suma tekste: valiuta prieš arba po skaičiaus (ir „mln.“, „tūkst.“, „million“, „thousand“) - kaip PP-negotiation DI_SUMA */
  var SUMA = /(^|[^\p{L}\p{N}.,])((?:EUR|€)[ \u00a0]*)?(\d{1,3}(?:[ \u00a0\u202f.,']\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)([ \u00a0]*(?:mln|million|tūkst|thousand)\.?)?([ \u00a0]*(?:eurų|eurai|eurus|euros|euro|eur|€)(?!\p{L}))?/giu;

  /* Kiti įmonių pavadinimai (ne tik žinomų dalyvių): su teisine forma ir kabutėmis arba „X UAB“ (pavadinimas didžiąja raide) */
  var FORMOS = "(?:UAB|AB|MB|I\u012e|V\u0161\u012e|SIA|AS|O\u00dc|Oy|GmbH|Ltd\\.?|S\\.A\\.|Sp\\. z o\\.o\\.)";
  var IMONES = [
    new RegExp("(^|[^\\p{L}])" + FORMOS + "[ \\u00a0]*[\u201e\"\u201c][^\"\u201c\u201d\u201e\\n]{2,60}[\u201c\u201d\"]", "gu"),
    new RegExp("(^|[^\\p{L}])[\u201e\"\u201c][^\"\u201c\u201d\u201e\\n]{2,60}[\u201c\u201d\"],?[ \\u00a0]+" + FORMOS + "(?![\\p{L}])", "gu"),
    new RegExp("(^|[^\\p{L}\\p{N}])\\p{Lu}[\\p{L}\\p{N}&.\\-]{1,30}(?:[ \\u00a0][\\p{Lu}\\p{N}][\\p{L}\\p{N}&.\\-]{0,30}){0,3}[ \\u00a0]+(?:UAB|AB|O\u00dc|SIA|AS|Oy|GmbH)(?![\\p{L}])", "gu")
  ];
  /* Asmuo po etiketės: vardas ir pavardė didžiosiomis raidėmis (kitų vardų sistema neatpažįsta) */
  // be vėliavos i: su ja \p{Lu} atitiktų ir mažąsias raides - etiketės pirma raidė abiem dydžiais rašoma klase
  var ASMUO = /(^|[^\p{L}])((?:[Kk]ontaktinis asmuo|[Kk]ontaktinis|[Aa]tsakingas asmuo|[Aa]tstovas|[Vv]adovas|[Dd]irektorius|[Dd]irektor\u0117|[Vv]adybinink\S*|[Pp]agarbiai|[Cc]ontact person|[Rr]egards)[:,]?[ \u00a0]+)(\p{Lu}\p{Ll}+(?:[ \u00a0-]\p{Lu}\p{Ll}+){0,2})/gu;
  function kalbos(o) { return (o && o.kalba === "en") ? "en" : "lt"; }
  function re(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function procentai(n, kalba) {
    var v = Math.abs(Math.round(n * 10) / 10);
    try { return new Intl.NumberFormat(kalba === "en" ? "en-GB" : "lt-LT", { maximumFractionDigits: 1 }).format(v); } catch (e) { return String(v); }
  }
  function skaicius(s) {
    if (window.GP_MONEY && typeof window.GP_MONEY.parseEUR === "function") return window.GP_MONEY.parseEUR(s);
    var v = parseFloat(String(s).replace(/[\s\u00a0\u202f']/g, "").replace(",", "."));
    return isFinite(v) ? v : null;
  }

  function kodas(i, priesdelis) {
    var r = "", n = i + 1;
    while (n > 0) { r = String.fromCharCode(65 + (n - 1) % 26) + r; n = Math.floor((n - 1) / 26); }
    return (priesdelis == null ? "Dalyvis " : priesdelis) + r;
  }

  function vardoVariantai(v) {
    var t = String(v || "").replace(/\s+/g, " ").trim(), be = t.replace(/[„“”"«»]/g, "").replace(/\s+/g, " ").trim();
    var br = be.replace(/^(UAB|AB|MB|IĮ|VšĮ|VĮ|TŪB|KŪB|SIA|AS|OÜ|Oy|SA|GmbH|Ltd\.?)\s+/i, "")
      .replace(/,?\s+(UAB|AB|SIA|AS|OÜ|Oy|Ab|SA|AG|BV|NV|GmbH|Ltd\.?|LLC|Inc\.?)$/i, "").trim();
    var r = [];
    [t, be, br].forEach(function (x) {
      if (x.length < 3) return;
      var vardai = /\s/.test(x) ? [[x, false]] : [[x, true], [x.toUpperCase(), true]];
      vardai.forEach(function (y) { if (!r.some(function (z) { return z[0] === y[0]; })) r.push(y); });
    });
    return r;
  }

  function poros(sarasas) {
    var out = [];
    var prid = function (ka, kuo, tikslus) { ka = String(ka || "").trim(); if (ka.length >= 3 && !out.some(function (p) { return p[0] === ka; })) out.push([ka, kuo, tikslus]); };
    (sarasas || []).forEach(function (x) {
      vardoVariantai(x.vardas).forEach(function (v) { prid(v[0], x.kodas, v[1]); });
      (x.kiti || []).forEach(function (k) { prid(k[0], k[1], false); });
    });
    return out.sort(function (a, b) { return b[0].length - a[0].length; });
  }

  /* Pakaitai pirma virsta žymėmis (privačios srities simboliai), kad vėlesnis keitimas nepaliestų jau pakeisto; atkuriamos pabaigoje */
  function slepk(tekstas, o) {
    o = o || {};
    var k = kalbos(o), P = PAKAITAI[k], t = String(tekstas == null ? "" : tekstas);
    if (!t.trim()) return "";
    var zymes = [], zyme = function (p) { zymes.push(p); return "\ue000" + String.fromCharCode(0xE100 + zymes.length - 1) + "\ue001"; };
    t = t.replace(/[^\s@<>()"„“,;:]+@[^\s@<>()"„“,;:]+\.\p{L}{2,}/gu, function () { return zyme(P.el); });
    t = t.replace(/(^|[^\p{L}\p{N}+])(\+\d[\d ()-]{6,}\d)/gu, function (m, pr) { return pr + zyme(P.tel); });
    t = t.replace(/(^|[^\p{L}])((?:tel|telefonas|telefono nr|mob|telephone|phone|mobile)\.?[ \u00a0]*(?:nr\.?|no\.?)?[ \u00a0]*[:.]?[ \u00a0]*)(\(?\d[\d ()-]{5,}\d)/giu,
      function (m, pr, pav) { return pr + pav + zyme(P.tel); });
    (o.poros || []).forEach(function (p) {
      var r = new RegExp("(^|[^\\p{L}\\p{N}])" + re(p[0]) + "(?=[^\\p{L}\\p{N}]|$)", p[2] ? "gu" : "giu");
      t = t.replace(r, function (m, pr) { return pr + zyme(p[1]); });
    });
    var sumos = o.sumos || [], pv = Number(o.pv) || 0;
    t = t.replace(SUMA, function (m, pr, pries, sk, daug, po) {
      var v = skaicius(sk);
      if (v == null || !isFinite(v)) return m;
      if (daug) v *= /mln|million/i.test(daug) ? 1e6 : 1e3;
      var zinoma = v >= 1000 && sumos.some(function (x) { return Math.abs(x - v) < 0.005; });
      if (!pries && !po && !zinoma) return m;
      return pr + zyme(pv > 0 ? "[" + procentai(v / pv * 100, k) + " % PV]" : P.suma);
    });
    t = t.replace(/(^|[^\p{N}])\d{9}(?=[^\p{N}]|$)/gu, function (m, pr) { return pr + zyme(P.kodas); });
    if (o.imones) IMONES.forEach(function (r) { t = t.replace(r, function (m, pr) { return pr + zyme(P.imone); }); });
    if (o.asmenys) t = t.replace(ASMUO, function (m, pr, et) { return pr + et + zyme(P.asmuo); });
    return t.replace(/\ue000([\ue100-\uf8ff])\ue001/g, function (m, z) { return zymes[z.charCodeAt(0) - 0xE100]; });
  }

  /* Sumos su valiuta tekste (rinkos dalyvio preliminari kaina ir pan.): citata - sakinys aplink sumą, PVM - pagal žodžius šalia */
  function sumos(tekstas) {
    var t = String(tekstas == null ? "" : tekstas), out = [], m;
    SUMA.lastIndex = 0;
    while ((m = SUMA.exec(t))) {
      if (!m[2] && !m[5]) continue;
      var v = skaicius(m[3]);
      if (v == null || !isFinite(v)) continue;
      if (m[4]) v *= /mln|million/i.test(m[4]) ? 1e6 : 1e3;
      var pr = m.index + m[1].length, pab = m.index + m[0].length;
      var po = t.slice(pab, pab + 40).toLowerCase(), pries = t.slice(Math.max(0, pr - 25), pr).toLowerCase();
      var pvm = /^[^.;\n]{0,12}(be|neįskaitant|excl\.?|excluding|without)\s+(pvm|vat)/i.test(po) ? "be"
        : /^[^.;\n]{0,12}(su|įskaitant|incl\.?|including|with)\s+(pvm|vat)/i.test(po) ? "su"
        : /(be|neįskaitant)\s+pvm[^.;\n]{0,10}$/.test(pries) ? "be" : /(su|įskaitant)\s+pvm[^.;\n]{0,10}$/.test(pries) ? "su" : null;
      var a = pr, b = pab;
      while (a > 0 && !/[.!?;\n]/.test(t[a - 1])) a--;
      while (b < t.length && !/[.!?;\n]/.test(t[b])) b++;
      out.push({ suma: Math.round(v * 100) / 100, citata: t.slice(a, Math.min(t.length, b + 1)).replace(/\s+/g, " ").trim(), pozicija: pr, pvm: pvm });
    }
    return out;
  }

  window.GP_UZKODAVIMAS = { version: "1.0", kodas: kodas, vardoVariantai: vardoVariantai, poros: poros, slepk: slepk, sumos: sumos, PAKAITAI: PAKAITAI };
})();
