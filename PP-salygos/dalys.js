/* Pirkimo objekto skaidymas į dalis iš pirkimo dokumentų (GP_DALYS; tobulinimo planas D1, 2026-10-19).
   Naujų darbuotojų testavimas: klausimas „Ar pirkimo objektas skaidomas į dalis?“ ir dalių skaičius klausiami visada, nors atsakymą rodo
   pirkimo kortelė, paraiška ar techninė specifikacija. Šaltiniai, pradedant patikimiausiu:
   - pirkimo kortelė (`dalys`: [] arba viena dalis - neskaidomas, dvi ir daugiau - dalių sąrašas);
   - pirkimo dokumentų sakiniai: „Pirkimo objektas skaidomas į 3 Pirkimo objekto dalis“, „Pirkimas skaidomas į III pirkimo objekto dalis“,
     „Pirkimo objektas į dalis neskaidomas, nes ...“ (sąlyginiai „Jei / Jeigu / Kai ...“ ir klausimai - ne);
   - techninė specifikacija, išskaidyta po vieną failą kiekvienai daliai (taip daroma LITGRID skaidytuose pirkimuose): failo pradžioje
     „I PIRKIMO OBJEKTO DALIS“, „(1 Pirkimo objekto dalis)“, „I Pirkimo dalis“, arba failo varde „... 1 dalis ...“ - dalių skaičius
     nustatomas tik kai tokių failų bent du ir numeriai eina iš eilės nuo 1 (vieno dokumento skyriai „I DALIS. BENDRIEJI REIKALAVIMAI“,
     standartų „2 dalis:“ ar reglamento „I dalis – instrukcija“ - ne dalys);
   - DI paraiškos ištraukimas (PP-salygos/paraiska-extract.js) - tik siūlymas.
   Išmatuota (2026-10-19) su 19 viešų LITGRID CVP IS paketų: 13 neskaidytų - jokio klaidingo „skaidomas“ (TS dalių nemini), 6 skaidyti
   (2-8 dalys) - dalių skaičius sutampa su paskelbtomis SPS. Grynos funkcijos: nieko nesaugo ir nesiunčia. */
(function (root) {
  "use strict";

  /* Lietuviškos raidės -> lotyniškos, tas pats ilgis (indeksai normalizuotame ir originaliame tekste sutampa - citatai). */
  var RAIDES = { "\u0105": "a", "\u010d": "c", "\u0119": "e", "\u0117": "e", "\u012f": "i", "\u0161": "s", "\u0173": "u", "\u016b": "u", "\u017e": "z", "\u2013": "-", "\u2014": "-", "\u00a0": " " };
  function norm(t) {
    var s = String(t || "").toLowerCase(), o = "";
    for (var i = 0; i < s.length; i++) o += RAIDES[s[i]] || s[i];
    return o;
  }

  var ROM = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
  var ZODZIAI = { du: 2, dvi: 2, tris: 3, trys: 3, keturias: 4, keturios: 4, penkias: 5, penkios: 5, sesias: 6, sesios: 6,
    septynias: 7, septynios: 7, astuonias: 8, astuonios: 8, devynias: 9, devynios: 9, desimt: 10 };
  var MAX = 12;
  function skaicius(z) {
    z = String(z || "").toLowerCase();
    if (/^\d{1,2}$/.test(z)) return +z;
    var r = ROM.indexOf(z);
    if (r >= 0) return r + 1;
    return ZODZIAI[z] || null;
  }
  function romeniskas(n) { return (ROM[n - 1] || String(n)).toUpperCase(); }

  var SK = "(\\d{1,2}|[ivx]{1,4}|du|dvi|tris|trys|keturi(?:as|os)|penki(?:as|os)|sesi(?:as|os)|septyni(?:as|os)|astuoni(?:as|os)|devyni(?:as|os)|desimt)";
  var SUBJ = "(?:pirkimo objekta[si]|pirkimas|pirkimo objektai)";
  // „Pirkimo objektas (yra / bus) skaidomas į 3 (tris) (Pirkimo objekto) dalis“
  var SKAIDOMAS_RE = new RegExp(SUBJ + "\\s+(?:yra\\s+|bus\\s+)?(?:skaidomas|skaidomi|suskaidytas|padalintas|padalytas)\\s+i\\s+" + SK +
    "(?:\\s*\\([a-z]+\\))?\\s+(?:pirkimo\\s+(?:objekto\\s+)?)?(?:dalis|daliu|dalys)(?![a-z])", "g");
  // „Pirkimo objektas (į (Pirkimo objekto) dalis) neskaidomas (į dalis)“
  var NESKAIDOMAS_RE = new RegExp(SUBJ + "\\s+(?:i\\s+(?:pirkimo\\s+(?:objekto\\s+)?)?dalis\\s+)?(?:yra\\s+|bus\\s+)?(?:neskaidomas|neskaidomi|nebus\\s+skaidomas|neskaidytas|nedalijamas)" +
    "(?:\\s+i\\s+(?:pirkimo\\s+(?:objekto\\s+)?)?dalis)?(?![a-z])", "g");
  var PRIEZASTIS_RE = /^\s*,?\s*(nes|kadangi|del to,? kad|siekiant|atsizvelgiant|vadovaujantis)(?![a-z])/;
  // sąlyga ar klausimas tame pačiame sakinyje prieš sutapimą
  var SALYGA_RE = /(^|[^a-z])(jei|jeigu|kai|kuomet|ar|if|whether)\s/;

  /* Sakinio ribos aplink [nuo, iki): ankstesnis „. “ / „; “ / „? “ / „! “ / eilutės lūžis ir kitas toks pat. „2.3.“ numeris - riba prieš jį. */
  function sakinys(n, nuo, iki) {
    var a = nuo;
    while (a > 0 && !/[.;?!\n]/.test(n[a - 1]) ) a--;
    var b = iki;
    while (b < n.length && !/[;?!\n]/.test(n[b]) && !(n[b] === "." && (b + 1 >= n.length || n[b + 1] === " " || n[b + 1] === "\n"))) b++;
    return { a: a, b: b, klausimas: n[b] === "?" };
  }
  function iskarpa(t, a, b) {
    var s = Math.max(0, a), e = Math.min(t.length, b);
    var x = t.slice(s, e).replace(/\s+/g, " ").trim();
    return x.length > 260 ? x.slice(0, 257).replace(/\s+\S*$/, "") + " ..." : x;
  }
  function vietaBloko(b, i) {
    var l = b && b.loc;
    if (l && l.page) return "psl. " + l.page;
    if (l && l.para != null) return "pastr. " + (l.para + 1);
    if (l && l.table != null) return "lentelė";
    return "dalis " + (i + 1);
  }

  /* Dalies pavadinimas po žymos: „– Pavadinimas;“, „(toliau – POD) Pavadinimas“. Nepavadinimai: angliška žyma („PART I“), antraštė
     didžiosiomis („TECHNINĖ SPECIFIKACIJA“), punktas su numeriu, „Informacija apie ...“. */
  function pavadinimasIs(orig) {
    var t = String(orig || "").replace(/^\s*\((?:toliau|hereinafter)[^)]*\)\s*/i, "").replace(/^\s*[-–:.]\s*/, "").trim();
    t = t.split(/\s*;\s*|\.\s+(?=[A-ZĄČĘĖĮŠŲŪŽ0-9])|\s+\|\s+/)[0].replace(/[.;,:]+$/, "").trim();
    if (t.length < 3 || t.length > 200) return "";
    if (/^(part|annex|sps|techni|informacija|perkam|1\.|\d+\.\d)/i.test(t)) return "";
    if (t === t.toUpperCase() && /[A-ZĄČĘĖĮŠŲŪŽ]{4}/.test(t)) return "";
    if (/(pirkimo\s+)?(objekto\s+)?dal(is|ies)\b/i.test(norm(t))) return "";
    return t;
  }

  /* Dalių sąrašas po sakinio „skaidomas į N dalis“: „I Pirkimo objekto dalis – X;“, „I POD - X;“, „II dalis: X“ (tame pačiame tekste). */
  var ITEM_RE = /(^|[\s;:(.])([ivx]{1,4}|\d{1,2})\.?\s+(?:pirkimo\s+(?:objekto\s+)?)?(?:dalis|pod)(?![a-z])\s*(?:\((?:toliau|hereinafter)[^)]*\)\s*)?[-:]?\s*/g;
  function sarasas(orig, n, nuo, kiek) {
    var out = [], m, re = new RegExp(ITEM_RE.source, "g"), sk = n.slice(nuo, nuo + 4000), pozicijos = [];
    while ((m = re.exec(sk))) {
      var nr = skaicius(m[2]);
      if (!nr || nr > kiek) continue;
      pozicijos.push({ nr: nr, a: nuo + m.index + m[1].length, p: nuo + m.index + m[0].length });
    }
    pozicijos.forEach(function (x, j) {
      var iki = j + 1 < pozicijos.length ? pozicijos[j + 1].a : nuo + sk.length;
      // PDF pavadinimą laužo per eilutes - jungiama iki kito punkto („2.4. Tiekėjas ...“) ar tuščios eilutės
      var seg = orig.slice(x.p, iki).split(/\n\s*\n|\n(?=\s*\d+(?:\.\d+)*\.?\s)/)[0].replace(/\s*\n\s*/g, " ");
      var t = pavadinimasIs(seg);
      if (t && !out.some(function (o) { return o.nr === x.nr; })) out.push({ nr: x.nr, tekstas: t });
    });
    // tik iš eilės nuo I (kitaip tai kitas sąrašas)
    out.sort(function (a, b) { return a.nr - b.nr; });
    return out.filter(function (o, i) { return o.nr === i + 1; });
  }

  /* Dalies žyma dokumento pradžioje (pirmi PRADZIA ženklų): „I PIRKIMO OBJEKTO DALIS“, „I Pirkimo dalis“, „(1 Pirkimo objekto dalis)“,
     techninėje specifikacijoje - ir eilutė „1 DALIS“. Failo varde - „... 1 dalis ...“, „I pirkimo dalis“. Grąžina pirmą žymą. */
  var PRADZIA = 500;
  var ZYMA_RE = /(^|\n|[\s|])([ivx]{1,4}|\d{1,2})\s+pirkimo\s+(?:objekto\s+)?dalis(?![a-z])/;
  var ZYMA_SKL_RE = /\(\s*([ivx]{1,4}|\d{1,2})\s+pirkimo\s+objekto\s+dalis\s*\)/;
  var ZYMA_EIL_RE = /(^|\n)\s*([ivx]{1,4}|\d{1,2})\s+dalis\s*(\n|$)/;
  var VARDO_RE = /(^|[\s._(-])([ivx]{1,4}|\d{1,2})\.?\s+(?:pirkimo\s+(?:objekto\s+)?)?dalis(?=[\s._),-]|$)/;
  function zyma(doc) {
    var bl = (doc.blokai || []).filter(function (b) { return String(b.text || "").trim(); });
    var orig = "", ribos = [];
    for (var i = 0; i < bl.length && orig.length < PRADZIA; i++) { ribos.push({ nuo: orig.length, i: i }); orig += String(bl[i].text) + "\n"; }
    var o = orig.slice(0, PRADZIA), n = norm(o);
    var blokas = function (p) { var r = ribos.filter(function (x) { return x.nuo <= p; }).pop() || { i: 0 }; return vietaBloko(bl[r.i], r.i); };
    var m = ZYMA_SKL_RE.exec(n);
    if (m) {
      var eil = o.slice(0, m.index).split("\n").pop();
      return { nr: skaicius(m[1]), citata: iskarpa(o, m.index - eil.length, m.index + m[0].length), vieta: blokas(m.index), pavadinimas: pavadinimasIs(eil) };
    }
    m = ZYMA_RE.exec(n);
    if (!m && doc.ts) m = ZYMA_EIL_RE.exec(n);
    if (m) {
      var a = m.index + m[1].length, b = m.index + m[0].length;
      var po = o.slice(b).split("\n");
      var pav = pavadinimasIs(po[0]);
      // tuščia ar antraštė - kita eilutė (praleidžiama viena antraštė didžiosiomis: „TECHNINĖ UŽDUOTIS“)
      for (var k = 1; !pav && k < 3 && k < po.length; k++) {
        var x = po[k].trim();
        if (!x) continue;
        if (/^\d+\.|^informacija|^perkam|^part\s/i.test(x)) break;
        pav = pavadinimasIs(x);
        if (!pav && !(x === x.toUpperCase())) break;
      }
      if (/^\(?\s*(toliau|hereinafter)/i.test(po[0]) && !pav) pav = pavadinimasIs(po[1] || "");
      return { nr: skaicius(m[2]), citata: iskarpa(o, a, b + Math.min(po[0].length, 80)), vieta: blokas(a), pavadinimas: pav };
    }
    if (doc.ts) {
      var v = norm(String(doc.vardas || "").replace(/\.[a-z0-9]{2,5}$/i, ""));
      m = VARDO_RE.exec(v);
      if (m) return { nr: skaicius(m[2]), citata: iskarpa(doc.vardas, m.index + m[1].length, m.index + m[0].length), vieta: "failo vardas", pavadinimas: "", vardas: true };
    }
    return null;
  }

  /* Vieno dokumento radiniai: sakiniai apie skaidymą ir dalies žyma. */
  function dokumentas(doc) {
    var bl = (doc.blokai || []), sk = [], ne = [];
    var orig = bl.map(function (b) { return String(b.text || ""); }).join("\n"), n = norm(orig);
    var ribos = [], p = 0;
    bl.forEach(function (b, i) { ribos.push({ nuo: p, i: i }); p += String(b.text || "").length + 1; });
    var blokas = function (x) { var r = ribos.filter(function (y) { return y.nuo <= x; }).pop() || { i: 0 }; return vietaBloko(bl[r.i], r.i); };
    var m, re = new RegExp(SKAIDOMAS_RE.source, "g");
    while ((m = re.exec(n))) {
      var s = sakinys(n, m.index, m.index + m[0].length);
      if (s.klausimas || SALYGA_RE.test(n.slice(s.a, m.index))) continue;
      var kiek = skaicius(m[1]);
      if (!kiek || kiek < 2 || kiek > MAX) continue;
      sk.push({ skaicius: kiek, citata: iskarpa(orig, m.index, s.b + 1), vieta: blokas(m.index), pavadinimai: sarasas(orig, n, m.index + m[0].length, kiek) });
    }
    re = new RegExp(NESKAIDOMAS_RE.source, "g");
    while ((m = re.exec(n))) {
      var s2 = sakinys(n, m.index, m.index + m[0].length);
      if (s2.klausimas || SALYGA_RE.test(n.slice(s2.a, m.index))) continue;
      var poT = n.slice(m.index + m[0].length, s2.b), pr = PRIEZASTIS_RE.exec(poT);
      var prT = pr ? orig.slice(m.index + m[0].length + pr.index + (pr[0].length - pr[1].length), s2.b).replace(/\s+/g, " ").trim().replace(/[.;]+$/, "") : "";
      prT = prT.replace(/^(nes|kadangi)\s+/i, "");               // šablono sakinyje „... neskaidomas ..., nes (įrašyti priežastis)“ jungtukas jau yra
      ne.push({ citata: iskarpa(orig, m.index, s2.b + 1), vieta: blokas(m.index), priezastis: prT && prT.length <= 600 ? prT : "" });
    }
    return { vardas: doc.vardas, skaidomas: sk, neskaidomas: ne, zyma: zyma(doc) };
  }

  /* Ar kortelės dalys rodo sprendimą: null - nenurodyta. */
  function korteles(k) {
    if (!k || !Array.isArray(k.dalys)) return null;
    var d = k.dalys.filter(function (x) { return x && typeof x === "object"; });
    if (d.length < 2) return { skaidomas: false, skaicius: null, pavadinimai: [] };
    if (d.length > MAX) return null;
    return { skaidomas: true, skaicius: d.length,
      pavadinimai: d.map(function (x, i) { return { nr: i + 1, tekstas: String(x.pavadinimas || "").trim() }; }).filter(function (x) { return x.tekstas; }) };
  }

  var REIKSME = function (s, n) { return s ? "skaidomas į " + n + " dalis" : "neskaidomas"; };

  /* Visų šaltinių sprendimas.
     o = { kortele: { dalys, pavadinimas, numeris } | null, dokumentai: [{ vardas, blokai, ts }], di: { reiksme, skaicius, pavadinimai, citata, failas } | null }
     -> { busena: 'nera' | 'isspresta' | 'siuloma' | 'konfliktas' | 'dalinis', skaidomas, skaicius, pavadinimai: [{ nr, tekstas, kilme }],
          priezastis: { tekstas, kilme } | null, irodymai: [{ saltinis, failas, citata, vieta, reiksme, skaidomas, skaicius, tvirtas }] } */
  function ivertink(o) {
    o = o || {};
    var ir = [], pav = [], priez = null;
    var kort = korteles(o.kortele);
    if (kort) {
      var kk = (o.kortele.numeris ? " " + o.kortele.numeris : "") + (o.kortele.pavadinimas ? " „" + o.kortele.pavadinimas + "“" : "");
      var kv = "pirkimo kortelė" + kk;
      ir.push({ saltinis: "kortele", failas: kv, pagal: "pirkimo kortelę" + kk, citata: kort.skaidomas ? kort.skaicius + " dalys" + (kort.pavadinimai.length ? ": " + kort.pavadinimai.map(function (x) { return x.tekstas; }).join("; ") : "") : "dalių nėra (neskaidomas)",
        vieta: "", reiksme: REIKSME(kort.skaidomas, kort.skaicius), skaidomas: kort.skaidomas, skaicius: kort.skaicius, tvirtas: true });
      kort.pavadinimai.forEach(function (x) { pav.push({ nr: x.nr, tekstas: x.tekstas, kilme: kv }); });
    }
    var zymos = [];
    (o.dokumentai || []).forEach(function (d) {
      var r = dokumentas(d);
      // skenuotas dokumentas, kurio tekstą atpažino DI (2 etapas D5): įrodymas kaip DI - tik siūloma, ne „Išspręsta automatiškai“
      var di = d.di === true, sal = di ? "di" : "dokumentas", kilme = (di ? "DI atpažintas dokumento „" : "dokumentas „") + d.vardas + "“";
      var pagal = (di ? "DI atpažintą dokumento „" : "dokumentą „") + d.vardas + "“" + (di ? " tekstą" : "");
      r.skaidomas.forEach(function (x) {
        ir.push({ saltinis: sal, failas: kilme, pagal: pagal, citata: x.citata, vieta: x.vieta, reiksme: REIKSME(true, x.skaicius), skaidomas: true, skaicius: x.skaicius, tvirtas: !di, di: di });
        x.pavadinimai.forEach(function (p) { pav.push({ nr: p.nr, tekstas: p.tekstas, kilme: kilme, di: di }); });
      });
      r.neskaidomas.forEach(function (x) {
        ir.push({ saltinis: sal, failas: kilme, pagal: pagal, citata: x.citata, vieta: x.vieta, reiksme: REIKSME(false), skaidomas: false, skaicius: null, tvirtas: !di, di: di });
        if (x.priezastis && !priez) priez = { tekstas: x.priezastis, kilme: kilme, citata: x.citata };
      });
      if (r.zyma && r.zyma.nr && !di) zymos.push({ failas: d.vardas, z: r.zyma });
    });
    // techninė specifikacija po failą kiekvienai daliai: bent du failai, numeriai iš eilės nuo 1 (tas pats numeris keliuose failuose - viena dalis)
    if (zymos.length) {
      var nr = {};
      zymos.forEach(function (x) { (nr[x.z.nr] = nr[x.z.nr] || []).push(x); });
      var max = Math.max.apply(null, Object.keys(nr).map(Number)), visi = true;
      for (var i = 1; i <= max; i++) if (!nr[i]) visi = false;
      var failai = {};
      zymos.forEach(function (x) { failai[x.failas] = 1; });
      var cit = zymos.slice().sort(function (a, b) { return a.z.nr - b.z.nr; }).filter(function (x, j, A) { return !j || A[j - 1].z.nr !== x.z.nr; });
      var fv = cit.map(function (x) { return "„" + x.failas + "“"; }).join(", ");
      if (visi && max >= 2 && max <= MAX && Object.keys(failai).length >= 2) {
        ir.push({ saltinis: "dokumentas", failas: "techninė specifikacija po failą kiekvienai daliai (" + fv + ")", pagal: "techninę specifikaciją po failą kiekvienai daliai (" + fv + ")",
          failai: cit.map(function (x) { return x.failas; }), citata: cit.map(function (x) { return x.z.citata; }).join(" · "), vieta: "kiekvienos dalies dokumento pradžia", reiksme: REIKSME(true, max), skaidomas: true, skaicius: max, tvirtas: true, zymos: true });
        var vardai = cit.map(function (x) { return x.z.pavadinimas; });
        // pavadinimai - tik kai kiekvienos dalies skirtingas (vienodas visose dalyse - bendras dokumento pavadinimas)
        if (vardai.every(Boolean) && new Set(vardai.map(norm)).size === vardai.length)
          cit.forEach(function (x) { pav.push({ nr: x.z.nr, tekstas: x.z.pavadinimas, kilme: "dokumentas „" + x.failas + "“" }); });
      } else {
        ir.push({ saltinis: "dokumentas", failas: (cit.length > 1 ? "dokumentai " : "dokumentas ") + fv, pagal: (cit.length > 1 ? "dokumentus " : "dokumentą ") + fv,
          failai: cit.map(function (x) { return x.failas; }), citata: cit.map(function (x) { return x.z.citata; }).join(" · "), vieta: "dokumento pradžia", reiksme: "pažymėta pirkimo objekto dalis (" + cit.map(function (x) { return romeniskas(x.z.nr); }).join(", ") + ")", skaidomas: true, skaicius: null, tvirtas: false, zymos: true });
      }
    }
    if (o.di && (o.di.reiksme === "skaidomas" || o.di.reiksme === "neskaidomas")) {
      var dsk = o.di.reiksme === "skaidomas", dn = dsk ? (o.di.skaicius >= 2 && o.di.skaicius <= MAX ? o.di.skaicius : null) : null;
      if (!dsk || dn) {
        var dv = "DI iš paraiškos" + (o.di.failas ? " „" + o.di.failas + "“" : "");
        ir.push({ saltinis: "di", failas: dv, pagal: "DI perskaitytą paraišką" + (o.di.failas ? " „" + o.di.failas + "“" : ""), citata: o.di.citata || "", vieta: "", reiksme: REIKSME(dsk, dn), skaidomas: dsk, skaicius: dn, tvirtas: false, di: true });
        if (dsk) (o.di.pavadinimai || []).slice(0, dn).forEach(function (t, j) { t = String(t || "").trim(); if (t) pav.push({ nr: j + 1, tekstas: t, kilme: dv, di: true }); });
      }
    }
    var R = { busena: "nera", skaidomas: null, skaicius: null, pavadinimai: [], priezastis: null, irodymai: ir };
    if (!ir.length) return R;
    var tv = ir.filter(function (x) { return x.tvirtas; });
    var vertes = function (A) { var s = {}; A.forEach(function (x) { s[x.skaidomas ? "s" + (x.skaicius || "?") : "n"] = 1; }); return Object.keys(s); };
    var pagr = tv.length ? tv : ir.filter(function (x) { return x.di; });
    var v = vertes(pagr);
    // nepilna žyma (skaičius nežinomas) dera su tvirtu „skaidomas į N“, kai N ne mažesnis už didžiausią pažymėtą dalį; su „neskaidomas“ - prieštarauja
    var dal = ir.filter(function (x) { return !x.tvirtas && !x.di; });
    var konf = v.length > 1;
    if (!konf && pagr.length) {
      var p0 = pagr[0];
      if (dal.length && !p0.skaidomas) konf = true;
      ir.filter(function (x) { return x.di; }).forEach(function (x) { if (tv.length && (x.skaidomas !== p0.skaidomas || (x.skaidomas && x.skaicius !== p0.skaicius))) konf = true; });
    }
    if (konf) { R.busena = "konfliktas"; return R; }
    if (!pagr.length) { R.busena = "dalinis"; return R; }
    R.skaidomas = pagr[0].skaidomas;
    R.skaicius = pagr[0].skaicius;
    R.busena = tv.length ? "isspresta" : "siuloma";
    if (R.skaidomas) {
      for (var n = 1; n <= R.skaicius; n++) {
        var x = pav.filter(function (p) { return p.nr === n && (!p.di || !tv.length); })[0] || pav.filter(function (p) { return p.nr === n; })[0];
        if (x) R.pavadinimai.push(x);
      }
    } else R.priezastis = priez;
    return R;
  }

  /* Juodraščiui (įkelti failai nesaugomi): tik tie dokumento blokai, iš kurių kas nors nustatyta - pradžia (žyma) ir sakiniai apie skaidymą.
     Atkūrus tas pats rezultatas gaunamas iš ištraukos. Dokumentas be radinių - null. */
  function istrauka(doc) {
    var r = dokumentas(doc);
    if (!r.skaidomas.length && !r.neskaidomas.length && !r.zyma) return null;
    var bl = (doc.blokai || []).filter(function (b) { return String(b.text || "").trim(); }), keli = [], ilgis = 0;
    bl.forEach(function (b, i) {
      var n = norm(b.text), pradzia = ilgis < PRADZIA;
      ilgis += String(b.text).length + 1;
      if (pradzia || new RegExp(SKAIDOMAS_RE.source).test(n) || new RegExp(NESKAIDOMAS_RE.source).test(n))
        keli.push({ text: String(b.text).slice(0, 6000), loc: b.loc || null });
    });
    return { vardas: String(doc.vardas || ""), ts: !!doc.ts, di: doc.di === true, blokai: keli.slice(0, 40) };
  }
  function atkurkIstraukas(a) {
    return (Array.isArray(a) ? a : []).filter(function (x) { return x && typeof x.vardas === "string" && Array.isArray(x.blokai); }).slice(0, 60)
      .map(function (x) {
        return { vardas: x.vardas.slice(0, 300), ts: x.ts === true, di: x.di === true, blokai: x.blokai.filter(function (b) { return b && typeof b.text === "string"; }).slice(0, 40)
          .map(function (b) { return { text: b.text.slice(0, 6000), loc: b.loc && typeof b.loc === "object" ? { page: +b.loc.page || undefined, para: b.loc.para != null ? +b.loc.para : undefined } : null }; }) };
      });
  }

  root.GP_DALYS = { ivertink: ivertink, dokumentas: dokumentas, zyma: zyma, korteles: korteles, istrauka: istrauka, atkurkIstraukas: atkurkIstraukas,
    norm: norm, skaicius: skaicius, MAX: MAX };
})(typeof window !== "undefined" ? window : globalThis);
