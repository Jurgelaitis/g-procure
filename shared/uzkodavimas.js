/* ==========================================================================
   G-Procure: DI užklausų užkodavimas (window.GP_UZKODAVIMAS, 2026-10-15)

   Tekstas į DI (per G-Procure serverį į Claude API) patenka be tiekėjų ar rinkos dalyvių pavadinimų, jų įmonių kodų,
   el. pašto adresų, telefonų ir sumų. Logika - iš PP-negotiation diSlepk (2026-10-05, R4). Naudoja PP-ts rinkos konsultacijos
   suvestinė, PP-negotiation (diSlepk, nuo 2026-10-16) ir PP-protocol (aiSlepk, nuo 2026-10-16) - moduliai renka tik savo kontekstą
   (kodus, keičiamus tekstus, žinomas sumas); savo užkodavimo kopijų moduliuose nerašyk (sargas shared/testai.html).

   API:
     GP_UZKODAVIMAS.kodas(i, priesdelis)       -> „Dalyvis A“, ..., „Dalyvis Z“, „Dalyvis AA“ (i nuo 0)
     GP_UZKODAVIMAS.vardoVariantai(vardas)     -> [[variantas, tikslus]]: kaip įrašyta, be kabučių, be teisinės formos;
                                                  vienas žodis - tiksliai ir didžiosiomis, keli - nepaisant raidžių dydžio
     GP_UZKODAVIMAS.linksniai(variantai)       -> [[variantas, tikslus]]: lietuviški paskutinio žodžio linksniai (kilmininkas, naudininkas,
                                                  galininkas, vietininkas) - „Voltera“: „Volteros“, „Volterai“, „Volterą“, „Volteroje“; 2026-10-27
     GP_UZKODAVIMAS.vardoFormos(vardas)        -> [[variantas, tikslus]]: vardoVariantai + linksniai + prekinis žodis (pirmas pavadinimo žodis,
                                                  kai jis ne kilmininkas ir ne bendrinis: „Kappa sprendimai“ - „Kappa“, „Kappos“...); 2026-10-27
     GP_UZKODAVIMAS.poros(sarasas, o)          -> [[ka, kuo, tikslus]] ilgiausi pirmi; sarasas: [{ vardas, kodas, kiti: [[tekstas, kuo]] }];
                                                  o.formos: true - vardai visomis vardoFormos formomis (PP-ts rinkos konsultacija)
     GP_UZKODAVIMAS.slepk(tekstas, o)          -> užkoduotas tekstas; o: { poros, sumos: [žinomos sumos], pv, pvPavadinimas, kalba, imones,
                                                  asmenys, naudoti }
                                                  sumos su valiuta (ar lygios žinomai >= 1000) - „[x % PV]“ (pvPavadinimas - vietoj „PV“, pvz.
                                                  PP-protocol „numatomos vertės“), be PV - „[suma neįtraukta]“; naudoti (Set) - į jį įrašomi
                                                  panaudoti porų pakaitai (PP-protocol kodų raktui);
                                                  imones: true - ir kiti įmonių pavadinimai su teisine forma (UAB „X“, „X“, UAB, X OÜ);
                                                  asmenys: true - vardas ir pavardė po etikečių („Kontaktinis asmuo:“, „Pagarbiai,“ - ir kitoje eilutėje, „Direktorius“);
                                                  rasta (masyvas) - į jį įrašoma, kas pakeista: { rusis, tekstas, kodas } (rusis: el, svetaine, tel, pavadinimas,
                                                  suma, kodas, imone, asmuo) - PP-ts viešos suvestinės patikrai
                                                  Visada: el. paštai, svetainės (www.x.lt, x-y.lt, https://...), telefonai (+370..., po etiketės ir
                                                  „8 612 34567“ - 9 skaitmenys nuo 8), 9 ir 11 skaitmenų kodai; „41 tūkst.“ be valiutos ir be vieneto po jo - suma
     GP_UZKODAVIMAS.sumos(tekstas)             -> [{ suma, citata, pozicija, pvm: "be" | "su" | null }] - sumos su valiuta tekste
   Kitų duomenų (asmenų vardų, adresų) sistema neatpažįsta - modulis tai sako prie DI mygtuko. Nieko nesaugo ir nesiunčia.
   ========================================================================== */
(function () {
  "use strict";

  var PAKAITAI = {
    lt: { el: "[el. paštas neįtrauktas]", svetaine: "[svetainė neįtraukta]", tel: "[telefonas neįtrauktas]", kodas: "[kodas neįtrauktas]", suma: "[suma neįtraukta]", imone: "[įmonė neįtraukta]", asmuo: "[asmuo neįtrauktas]" },
    en: { el: "[email removed]", svetaine: "[website removed]", tel: "[phone removed]", kodas: "[code removed]", suma: "[amount removed]", imone: "[company removed]", asmuo: "[person removed]" }
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
  // vardas gali būti ir kitoje eilutėje (laiško parašas „Pagarbiai,⏎Vardas Pavardė“ - 2026-10-27, PP-ts patikra K3)
  var ASMUO = /(^|[^\p{L}])((?:[Kk]ontaktinis asmuo|[Kk]ontaktinis|[Aa]tsakingas asmuo|[Aa]tstovas|[Vv]adovas|[Dd]irektorius|[Dd]irektor\u0117|[Vv]adybinink\S*|[Pp]agarbiai|[Cc]ontact person|[Rr]egards)[:,]?(?:[ \u00a0]*\r?\n[ \u00a0]*|[ \u00a0]+))(\p{Lu}\p{Ll}+(?:[ \u00a0-]\p{Lu}\p{Ll}+){0,2})/gu;
  /* Svetainės (2026-10-27): adresas su protokolu arba domenas su žinoma pabaiga (www.beta.ee, kappa-sprendimai.lt); failų vardai (.pdf, .docx) - ne */
  var SVETAINE_URL = /(^|[^\p{L}\p{N}@])(https?:\/\/[^\s<>"„“”]+[^\s<>"„“”.,;:!?)])/giu;
  var SVETAINE = /(^|[^\p{L}\p{N}@.\/-])((?:www\.)?(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(?:lt|lv|ee|eu|com|net|org|info|biz|de|pl|fi|se|no|dk|uk|io|co|fr|it|nl|be|at|ch|cz|es)(?![\p{L}\p{N}-])(?:\/[^\s<>"„“”]*[^\s<>"„“”.,;:!?)])?)/giu;
  /* Lietuviškas telefonas be „+“: 8 ir dar 8 skaitmenys su tarpais ar skliaustais („8 612 34567“, „(8 5) 278 2222“); 2026-10-27 */
  var TEL_LT = /(^|[^\p{L}\p{N}+.,\/-])(\(?8(?:[ \u00a0()-]*\d){8})(?![\p{N}]|[ \u00a0]*(?:eur|€|proc|%))/giu;
  /* Prekinis žodis: pirmas kelių žodžių pavadinimo žodis, jei jis ne kilmininkas („Elektros“, „Vilniaus“) ir ne bendrinis būdvardis */
  var NE_PREKINIS = /(?:os|ės|ių|ų|aus|io|ios|ojo|inis|inė|iškas|iška|asis|oji|ieji)$/i;
  var BENDRINIAI = /^(?:baltic|nordic|european|global|international|power|energy|group|grupė|naujas|nauja|naujoji|pirmas|pirmoji|didysis|didžioji|nacionalinis|tarptautinis|valstybinis|lietuva|vilnius|kaunas|klaipėda)$/i;
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

  /* Lietuviški linksniai (2026-10-27, PP-negotiation naujo darbuotojo patikra D5: „Volteros pasiūlymas“, „UAB „Galios įrangos“ kainos“
     likdavo užklausoje): paskutinis žodis su lietuviška galūne (bent 4 raidės) - kilmininkas, naudininkas, galininkas, vietininkas;
     kiti žodžiai ir kabutės - kaip įrašyti; didžiosiomis rašytas - didžiosiomis. Kitų linksnių ir kamieno kaitos sistema nemoka. */
  var GALUNES = [["iai", ["ių", "iams", "ius", "iuose"]], ["ai", ["ų", "ams", "us", "uose"]], ["ys", ["io", "iui", "į", "yje"]],
    ["as", ["o", "ui", "ą", "e"]], ["is", ["io", "iui", "į", "yje"]], ["us", ["aus", "ui", "ų", "uje"]], ["a", ["os", "ai", "ą", "oje"]],
    ["ė", ["ės", "ei", "ę", "ėje"]]];
  function linksniuok(z) {
    var lz = z.toLowerCase(), did = z === z.toUpperCase() && z !== lz;
    if (z.length < 4 || !/^\p{L}+$/u.test(z)) return [];
    for (var i = 0; i < GALUNES.length; i++) {
      var g = GALUNES[i][0];
      if (lz.slice(-g.length) === g) {
        var kam = z.slice(0, z.length - g.length);
        return GALUNES[i][1].map(function (f) { return kam + (did ? f.toUpperCase() : f); });
      }
    }
    return [];
  }
  function linksniai(variantai) {
    var out = [];
    (variantai || []).forEach(function (v) {
      var m = /^([\s\S]*?)(\p{L}+)([^\p{L}]*)$/u.exec(String(v[0] || ""));
      if (!m) return;
      linksniuok(m[2]).forEach(function (f) {
        var x = m[1] + f + m[3];
        if (x !== v[0] && !out.some(function (z) { return z[0] === x; })) out.push([x, v[1]]);
      });
    });
    return out;
  }

  function vardoFormos(vardas) {
    var vv = vardoVariantai(vardas), r = vv.concat(linksniai(vv));
    var zodziai = String(vardas || "").replace(/[„“”"«»]/g, " ").replace(/^\s*(UAB|AB|MB|IĮ|VšĮ|VĮ|TŪB|KŪB|SIA|AS|OÜ|Oy|SA|GmbH|Ltd\.?)\s+/i, "").trim().split(/\s+/);
    var w = zodziai[0] || "";
    if (zodziai.length >= 2 && /^\p{Lu}\p{L}{3,}$/u.test(w) && !NE_PREKINIS.test(w) && !BENDRINIAI.test(w)) {
      var pr = [[w, true], [w.toUpperCase(), true]];
      r = r.concat(pr, linksniai(pr));
    }
    var out = [];
    r.forEach(function (x) { if (!out.some(function (z) { return z[0] === x[0]; })) out.push(x); });
    return out;
  }

  function poros(sarasas, o) {
    var out = [], formos = !!(o && o.formos);
    var prid = function (ka, kuo, tikslus) { ka = String(ka || "").trim(); if (ka.length >= 3 && !out.some(function (p) { return p[0] === ka; })) out.push([ka, kuo, tikslus]); };
    (sarasas || []).forEach(function (x) {
      (formos ? vardoFormos(x.vardas) : vardoVariantai(x.vardas)).forEach(function (v) { prid(v[0], x.kodas, v[1]); });
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
    var rasta = Array.isArray(o.rasta) ? o.rasta : null, ras = function (rusis, tx, kodas) { if (rasta) rasta.push({ rusis: rusis, tekstas: String(tx).trim(), kodas: kodas || null }); };
    t = t.replace(/[^\s@<>()"„“,;:]+@[^\s@<>()"„“,;:]+\.\p{L}{2,}/gu, function (m) { ras("el", m); return zyme(P.el); });
    t = t.replace(SVETAINE_URL, function (m, pr, a) { ras("svetaine", a); return pr + zyme(P.svetaine); });
    t = t.replace(SVETAINE, function (m, pr, a) { ras("svetaine", a); return pr + zyme(P.svetaine); });
    t = t.replace(/(^|[^\p{L}\p{N}+])(\+\d[\d ()-]{6,}\d)/gu, function (m, pr, a) { ras("tel", a); return pr + zyme(P.tel); });
    t = t.replace(/(^|[^\p{L}])((?:tel|telefonas|telefono nr|mob|telephone|phone|mobile)\.?[ \u00a0]*(?:nr\.?|no\.?)?[ \u00a0]*[:.]?[ \u00a0]*)(\(?\d[\d ()-]{5,}\d)/giu,
      function (m, pr, pav, a) { ras("tel", a); return pr + pav + zyme(P.tel); });
    t = t.replace(TEL_LT, function (m, pr, a) { ras("tel", a); return pr + zyme(P.tel); });
    (o.poros || []).forEach(function (p) {
      var r = new RegExp("(^|[^\\p{L}\\p{N}])" + re(p[0]) + "(?=[^\\p{L}\\p{N}]|$)", p[2] ? "gu" : "giu");
      t = t.replace(r, function (m, pr) { if (o.naudoti && typeof o.naudoti.add === "function") o.naudoti.add(p[1]); ras("pavadinimas", m.slice(pr.length), p[1]); return pr + zyme(p[1]); });
    });
    var sumos = o.sumos || [], pv = Number(o.pv) || 0, pvPav = String(o.pvPavadinimas || "PV");
    t = t.replace(SUMA, function (m, pr, pries, sk, daug, po, poz, visas) {
      var v = skaicius(sk);
      if (v == null || !isFinite(v)) return m;
      if (daug) v *= /mln|million/i.test(daug) ? 1e6 : 1e3;
      var zinoma = v >= 1000 && sumos.some(function (x) { return Math.abs(x - v) < 0.005; });
      // „41 tūkst.“ be valiutos - suma, kai po jo ne vienetas: skyryba, eilutės ar teksto pabaiga arba naujas sakinys
      // („5 tūkst. vnt.“, „1,2 mln. kWh“, „2 mln. MWh“ - ne)
      var liko = String(visas).slice(poz + m.length);
      var beVieneto = daug && !po && (/^[ \u00a0]*(?:$|[,;:)!?\n])/.test(liko)
        || (/\.$/.test(m) && /^[ \u00a0]+\p{Lu}/u.test(liko) && !/^[ \u00a0]+(?:[kMGT]W|[kMGT]Wh|MVA|kV|Nm)/.test(liko)));
      if (!pries && !po && !zinoma && !beVieneto) return m;
      ras("suma", m.slice(pr.length));
      // santrumpos taškas, kuris kartu baigė sakinį („... apie 41 tūkst. Kitas“), paliekamas
      var taskas = beVieneto && /\.$/.test(m) && /^(?:[ \u00a0]*$|[ \u00a0]*\n|[ \u00a0]+\p{Lu})/u.test(liko) ? "." : "";
      return pr + zyme(pv > 0 ? "[" + procentai(v / pv * 100, k) + " % " + pvPav + "]" : P.suma) + taskas;
    });
    // įmonės kodas (9 skaitmenys) ir 11 skaitmenų kodas (Latvijos registracijos numeris, asmens kodas) - 2026-10-27
    t = t.replace(/(^|[^\p{N}])(\d{11}|\d{9})(?=[^\p{N}]|$)/gu, function (m, pr, a) { ras("kodas", a); return pr + zyme(P.kodas); });
    if (o.imones) IMONES.forEach(function (r) { t = t.replace(r, function (m, pr) { ras("imone", m.slice(pr.length)); return pr + zyme(P.imone); }); });
    if (o.asmenys) t = t.replace(ASMUO, function (m, pr, et, a) { ras("asmuo", a); return pr + et + zyme(P.asmuo); });
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

  window.GP_UZKODAVIMAS = { version: "1.3", kodas: kodas, vardoVariantai: vardoVariantai, linksniai: linksniai, vardoFormos: vardoFormos, poros: poros, slepk: slepk, sumos: sumos, PAKAITAI: PAKAITAI };
})();
