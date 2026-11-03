/* ============================================================================
 * G-Procure  shared/kalbu-sutikrinimas.js   (window.GP_KALBU_SUTIKRINIMAS)
 * ----------------------------------------------------------------------------
 * Dvikalbių dokumentų sutikrinimas: ar lietuviškame ir angliškame tekste sutampa
 * sumos, procentai, datos ir terminai. Viskas naršyklėje, be DI, niekas nesiunčiama.
 *
 * Lyginama tik tai, kas suporuota pačiame dokumente:
 *  - DOCX ir ODT lentelės eilutė (lietuviški langeliai prieš angliškus);
 *  - dviejų stulpelių PDF (shared/dokumentai.js, loc.stulpelis) - tas pats punkto
 *    numeris abiejuose srautuose.
 * Atskirų LT ir EN failų nesiejame.
 *
 * Radinys - tik kai ABIEJOSE kalbose yra tos rūšies reikšmių ir kiekvienoje yra tokia,
 * kurios kitoje nėra („5 darbo dienas“ ir „5 days“, „100 000 Eur“ ir „10 000 EUR“).
 * Reikšmė tik vienoje kalboje - ne radinys: ji gali būti parašyta žodžiais („ten hours“)
 * arba paminėta tik vienoje kalboje (reglamento data).
 *
 * Išmatuota 2026-11-03 su 27 tikrais CVP IS paketais (74 dvikalbiai dokumentai, 3 496 vietos):
 * viena tikra neatitiktis, klaidingų radinių nėra; kiekvienoje suporuotoje vietoje pakeitus
 * vieną skaitmenį - rasta 468 iš 468. 39 dvikalbiai LITGRID šablonai - radinių nėra.
 *
 * Reikia shared/money.js. Grynos funkcijos, nieko nesaugo ir nesiunčia:
 *  - tikrink(docs) -> { radiniai, dokumentu, vietu, reiksmiu };
 *  - pirmumas(docs, kalba) -> { salygos, sutartis }: sakinys, kuriai kalbai dokumentuose teikiama viršenybė;
 *  - rusiesPav(rusis, kalba).
 * Tekstas iš dokumentų į HTML - tik per modulio ekranavimą.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var DIAK = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
  // Ženklas į ženklą: pozicijos sutampa su originalu, todėl citata imama iš originalo
  function fold(s) {
    return String(s == null ? "" : s).replace(/[\s\S]/g, function (c) {
      if (/\s/.test(c)) return " ";
      var m = c.toLowerCase();
      if (m.length !== 1) return c;
      return DIAK[m] || m;
    });
  }

  var NUM = "\\d{1,3}(?:[ .,'’]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d+)?";
  var ZODZIAI = "(?:\\s*\\([^)]{0,90}\\))?";     // „100 000 (vienas šimtas tūkstančių) eurų“
  var SUMA_PO = new RegExp("(^|[^\\d.,a-z])(" + NUM + ")" + ZODZIAI + "\\s*\\)?\\s*(mln\\.?|million|mlrd\\.?|billion|tukst\\.?|thousand)?\\s*(eur(?:u|ai|o|us|ams|os)?|€)(?![a-z])", "g");
  var SUMA_PRIES = new RegExp("(^|[^a-z])(?:eur|€)\\s?(" + NUM + ")(?:\\s*(mln\\.?|million|mlrd\\.?|billion|tukst\\.?|thousand))?(?![\\d.,]*\\d)", "g");
  var PROC = new RegExp("(^|[^\\d.,a-z])(" + NUM + ")" + ZODZIAI + "\\s*\\)?\\s*(%|proc\\.?(?![a-z])|procent[a-z]*|percent(?:age)?(?![a-z])|per cent(?![a-z]))", "g");
  var TRUKME = new RegExp("(^|[^\\d.,a-z])(" + NUM + ")(?:-(?:os|ių|iu|ju|ios))?" + ZODZIAI + "\\s*\\)?[ -]?(kalendorin[a-z]*\\s+|darbo\\s+|calendar\\s+|working\\s+|business\\s+)?(dien[a-z]*|days?(?![a-z])|d\\.\\s?d\\.|menes[a-z]*|men\\.|months?(?![a-z])|metu(?![a-z])|metai(?![a-z])|metus(?![a-z])|metams(?![a-z])|metais(?![a-z])|years?(?![a-z])|savait[a-z]*|weeks?(?![a-z])|valand[a-z]*|hours?(?![a-z]))", "g");
  var MEN_LT = ["sausio", "vasario", "kovo", "balandzio", "geguzes", "birzelio", "liepos", "rugpjucio", "rugsejo", "spalio", "lapkricio", "gruodzio"];
  var MEN_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  var DATA_LT = new RegExp("(20\\d\\d|19\\d\\d)\\s*m\\.?\\s*(" + MEN_LT.join("|") + ")\\s*(?:men\\.\\s*)?(\\d{1,2})\\s*d", "g");
  var DATA_EN1 = new RegExp("(^|[^\\d])(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(" + MEN_EN.join("|") + ")\\s*,?\\s*(20\\d\\d|19\\d\\d)", "g");
  var DATA_EN2 = new RegExp("(" + MEN_EN.join("|") + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(20\\d\\d|19\\d\\d)", "g");
  var DATA_ISO = /(^|[^\d.])(20\d\d|19\d\d)[-.](\d{2})[-.](\d{2})(?![\d])/g;
  var DATA_DMY = /(^|[^\d.\/])(\d{2})[\/.](\d{2})[\/.](20\d\d)(?![\d])/g;

  function dviz(n) { return n < 10 ? "0" + n : "" + n; }
  function dataRaktas(m, men, d) {
    if (men < 1 || men > 12 || d < 1 || d > 31) return null;
    return m + "-" + dviz(men) + "-" + dviz(d);
  }
  function daugiklis(z) {
    if (!z) return 1;
    if (/^(mln|million)/.test(z)) return 1e6;
    if (/^(mlrd|billion)/.test(z)) return 1e9;
    return 1e3;
  }
  function suma(tekstas, z) {
    // „1,5 mln.“ - ne tūkstančiai: su daugikliu kablelis ar taškas visada dešimtainis
    var v = z ? global.GP_MONEY.parseSkaicius(tekstas) : global.GP_MONEY.parseEUR(tekstas);
    if (v == null || !isFinite(v)) return null;
    return Math.round(v * daugiklis(z) * 100) / 100;
  }
  function skaicius(tekstas) {
    var v = global.GP_MONEY.parseSkaicius(tekstas);
    return v == null || !isFinite(v) ? null : v;
  }
  function trukmesRaktas(n, rusis, vnt) {
    var dd = /^(darbo|working|business)/.test(rusis || "") || /^d\.\s?d\./.test(vnt);
    if (/^(dien|day|d\.)/.test(vnt)) return (dd ? "dd:" : "d:") + n;
    if (/^(savait|week)/.test(vnt)) return "d:" + n * 7;
    if (/^(menes|men\.|month)/.test(vnt)) return "men:" + n;
    if (/^(met|year)/.test(vnt)) return n > 100 ? null : "men:" + n * 12;
    if (/^(valand|hour)/.test(vnt)) return "val:" + n;
    return null;
  }

  /* Reikšmės tekste: { suma: { raktas: { t, i } }, proc: ..., trukme: ..., data: ... } (t - kaip parašyta, i - pozicija) */
  function reiksmes(tekstas) {
    var s = String(tekstas == null ? "" : tekstas), f = fold(s);
    var r = { suma: {}, proc: {}, trukme: {}, data: {} };
    function dek(rusis, raktas, i, ilg) {
      if (raktas == null) return;
      var x = r[rusis][raktas];
      if (x) { x.n++; x.vis.push(i); return; }
      r[rusis][raktas] = { t: s.substr(i, ilg).replace(/\s+/g, " ").trim(), i: i, n: 1, vis: [i], ilg: ilg };
    }
    var m, i;
    SUMA_PO.lastIndex = 0;
    while ((m = SUMA_PO.exec(f))) { i = m.index + m[1].length; dek("suma", suma(m[2], m[3]), i, m[0].length - m[1].length); }
    SUMA_PRIES.lastIndex = 0;
    while ((m = SUMA_PRIES.exec(f))) { i = m.index + m[1].length; dek("suma", suma(m[2], m[3]), i, m[0].length - m[1].length); }
    PROC.lastIndex = 0;
    while ((m = PROC.exec(f))) { i = m.index + m[1].length; dek("proc", skaicius(m[2]), i, m[0].length - m[1].length); }
    TRUKME.lastIndex = 0;
    while ((m = TRUKME.exec(f))) {
      var n = skaicius(m[2]);
      i = m.index + m[1].length;
      if (n != null) dek("trukme", trukmesRaktas(n, m[3], m[4]), i, m[0].length - m[1].length);
    }
    DATA_LT.lastIndex = 0;
    while ((m = DATA_LT.exec(f))) dek("data", dataRaktas(m[1], MEN_LT.indexOf(m[2]) + 1, +m[3]), m.index, m[0].length + 1);
    DATA_EN1.lastIndex = 0;
    while ((m = DATA_EN1.exec(f))) dek("data", dataRaktas(m[4], MEN_EN.indexOf(m[3]) + 1, +m[2]), m.index + m[1].length, m[0].length - m[1].length);
    DATA_EN2.lastIndex = 0;
    while ((m = DATA_EN2.exec(f))) dek("data", dataRaktas(m[3], MEN_EN.indexOf(m[1]) + 1, +m[2]), m.index, m[0].length);
    DATA_ISO.lastIndex = 0;
    while ((m = DATA_ISO.exec(f))) dek("data", dataRaktas(m[2], +m[3], +m[4]), m.index + m[1].length, m[0].length - m[1].length);
    DATA_DMY.lastIndex = 0;
    while ((m = DATA_DMY.exec(f))) dek("data", dataRaktas(m[4], +m[3], +m[2]), m.index + m[1].length, m[0].length - m[1].length);
    return r;
  }

  /* Kurios kalbos tekstas (langelis): lt / en / null */
  function kalbaTeksto(t) {
    var s = String(t || "");
    var z = (s.match(/\p{L}[\p{L}\p{N}-]*/gu) || []).length;
    if (z < 3) {   // „5 darbo dienos“, „3 months“: trumpą langelį išduoda vienetas
      var f = fold(s);
      if (/(^|[^a-z])(dien[a-z]*|menes[a-z]*|metu|metai|metus|proc)([^a-z]|$)/.test(f)) return "lt";
      if (/(^|[^a-z])(days?|months?|years?|percent)([^a-z]|$)/.test(f)) return "en";
      return null;
    }
    var raid = (s.match(/\p{L}/gu) || []).length || 1;
    var d = (s.match(/[ąčęėįšųūž]/giu) || []).length / raid;
    var en = (s.match(/(?:^|[^\p{L}])(?:the|of|and|for|shall|with|by|or|is|are|this|that|in|to|days?|months?|years?)(?=[^\p{L}]|$)/giu) || []).length / z;
    var lt = (s.match(/(?:^|[^\p{L}])(?:ir|arba|kad|kaip|su|iš|į|per|ne|bei|yra|dienų|mėnesių|metų)(?=[^\p{L}]|$)/giu) || []).length / z;
    if (d >= 0.012 && lt >= en) return "lt";
    if (d >= 0.03) return "lt";
    if (d <= 0.004 && en >= 0.08 && en >= 2 * lt) return "en";
    return null;
  }

  var PUNKTAS = /^\s*(\d{1,2}(?:\.\d{1,3}){1,4})\.?(?=\s|$)/;

  /* Eilutės su lietuvišku ir angliškų langeliu */
  function eilutes(d) {
    var out = [];
    (d.blocks || []).forEach(function (b) {
      if (!b.cells || b.cells.length < 2) return;
      var lt = [], en = [], pask = null;
      // Langelis be kalbos („100 000 Eur“) priklauso kalbai prieš jį: „Suma | 100 000 Eur | Amount | EUR 100,000“
      b.cells.forEach(function (c) {
        var k = kalbaTeksto(c) || pask;
        if (k === "lt") lt.push(c); else if (k === "en") en.push(c);
        pask = k;
      });
      if (!lt.length || !en.length) return;
      var pt = null;
      b.cells.some(function (c) { var m = PUNKTAS.exec(c || ""); if (m) { pt = m[1]; return true; } return false; });
      out.push({ lt: lt.join("\n"), en: en.join("\n"), loc: b.loc, punktas: pt });
    });
    return out;
  }

  /* Dviejų stulpelių PDF: tas pats punktas abiejuose srautuose (k-tasis pasikartojimas su k-tuoju) */
  function punktai(d, st) {
    var out = [], dabar = null;
    (d.blocks || []).forEach(function (b) {
      if (!b.loc || b.loc.stulpelis !== st) return;
      String(b.text || "").split("\n").forEach(function (e) {
        var m = PUNKTAS.exec(e);
        if (m) { dabar = { nr: m[1], tekstas: e, page: b.loc.page }; out.push(dabar); }
        else if (dabar) dabar.tekstas += "\n" + e;
      });
    });
    return out;
  }
  function stulpeliuVietos(d) {
    var a = punktai(d, "lt"), b = punktai(d, "en");
    if (!a.length || !b.length) return [];
    var eil = {};
    b.forEach(function (p) { (eil[p.nr] = eil[p.nr] || []).push(p); });
    var kiek = {}, kiekA = {};
    a.forEach(function (p) { kiekA[p.nr] = (kiekA[p.nr] || 0) + 1; });
    var out = [];
    a.forEach(function (p) {
      var k = kiek[p.nr] = (kiek[p.nr] || 0) + 1;
      var e = eil[p.nr];
      if (!e || e.length !== kiekA[p.nr]) return;       // nesutampa pasikartojimų skaičius - nepora
      var q = e[k - 1];
      out.push({ lt: p.tekstas, en: q.tekstas, loc: { page: p.page }, enLoc: { page: q.page }, punktas: p.nr });
    });
    return out;
  }

  function citata(t, i, ilg) {
    var s = String(t || "").replace(/\s+/g, " "), pr = Math.max(0, i - 90), pb = Math.min(s.length, i + ilg + 90);
    var d = s.slice(pr, pb);
    if (pr > 0) d = "..." + d.replace(/^\S*\s/, "");
    if (pb < s.length) d = d.replace(/\s\S*$/, "") + "...";
    return d;
  }

  var RUSYS = ["suma", "proc", "trukme", "data"];
  var RUSIU_PAV = { lt: { suma: "Suma", proc: "Procentai", trukme: "Terminas", data: "Data" }, en: { suma: "Amount", proc: "Percentage", trukme: "Period", data: "Date" } };
  function rusiesPav(r, kalba) { return RUSIU_PAV[kalba === "en" ? "en" : "lt"][r] || r; }

  function palygink(v) {
    var A = reiksmes(v.lt), B = reiksmes(v.en), out = [], viso = 0;
    RUSYS.forEach(function (r) {
      var ka = Object.keys(A[r]), kb = Object.keys(B[r]);
      viso += ka.length + kb.length;
      // Kiek kartų paminėta, svarbu: lietuviškai du kartus „5 darbo dienas“, angliškai „5 working days“ ir „5 days“ - skirtumas
      var ta = ka.filter(function (k) { return !B[r][k] || B[r][k].n < A[r][k].n; }), tb = kb.filter(function (k) { return !A[r][k] || A[r][k].n < B[r][k].n; });
      if (!ta.length || !tb.length) return;       // reikšmė tik vienoje kalboje - ne radinys
      out.push({
        rusis: r,
        lt: ta.map(function (k) { return { raktas: k, tekstas: A[r][k].t, citata: citata(v.lt, A[r][k].i, A[r][k].ilg) }; }),
        en: tb.map(function (k) { return { raktas: k, tekstas: B[r][k].t, citata: citata(v.en, B[r][k].i, B[r][k].ilg) }; })
      });
    });
    return { skirtumai: out, viso: viso };
  }

  function tikrink(docs) {
    var radiniai = [], dokumentu = 0, vietu = 0, reiksmiu = 0, pagalRakta = Object.create(null);
    (docs || []).forEach(function (d) {
      if (!d || !d.blocks) return;
      var v = eilutes(d).concat(stulpeliuVietos(d));
      if (!v.length) return;
      dokumentu++;
      v.forEach(function (x) {
        vietu++;
        var p = palygink(x);
        reiksmiu += p.viso;
        p.skirtumai.forEach(function (s) {
          var vt = { docId: d.id, dokumentas: d.name, loc: x.loc, enLoc: x.enLoc || x.loc, punktas: x.punktas };
          // Tas pats skirtumas kitoje dokumento redakcijoje („Patikslinta SPS“) - viena pastaba su keliomis vietomis
          var r = s.rusis + "|" + s.lt.map(function (y) { return y.raktas; }).join(",") + "|" + s.en.map(function (y) { return y.raktas; }).join(",");
          if (pagalRakta[r]) { pagalRakta[r].vietos.push(vt); return; }
          s.vietos = [vt];
          pagalRakta[r] = s;
          radiniai.push(s);
        });
      });
    });
    return { radiniai: radiniai, dokumentu: dokumentu, vietu: vietu, reiksmiu: reiksmiu };
  }

  /* Kuriai kalbai teikiama viršenybė: LITGRID sąlygos ir sutartys tai sako aiškiai, ir tai tiekėjui svarbiau už patį skirtumą. */
  var PIRMUMAS_LT = /(neatitikim|priestaravim|nesutap|skirtum)[^.]{0,160}lietuv[^.]{0,160}(virsenyb|pirmenyb)|autentisk[^.]{0,120}lietuv|lietuv[^.]{0,120}autentisk/;
  var PIRMUMAS_EN = /(discrepanc|inconsistenc|contradiction)[^.]{0,200}lithuanian[^.]{0,120}(prevail|preference)|lithuanian[^.]{0,120}(authentic|prevail)/;
  function pirmumoSakinys(d, re) {
    var bl = d.blocks || [];
    for (var i = 0; i < bl.length; i++) {
      var s = String(bl[i].text || ""), f = fold(s), m = re.exec(f);
      if (!m) continue;
      var pr = f.lastIndexOf(". ", m.index), pb = f.indexOf(". ", m.index + m[0].length);
      return { docId: d.id, dokumentas: d.name, loc: bl[i].loc, citata: s.slice(pr < 0 ? 0 : pr + 2, pb < 0 ? s.length : pb + 1).replace(/\s+/g, " ").trim() };
    }
    return null;
  }
  function pirmumas(docs, kalba) {
    var pirma = kalba === "en" ? PIRMUMAS_EN : PIRMUMAS_LT, antra = kalba === "en" ? PIRMUMAS_LT : PIRMUMAS_EN, out = { salygos: null, sutartis: null };
    (docs || []).forEach(function (d) {
      if (!d || !d.blocks) return;
      var k = d.rusis === "Sutartis" || /sutart|contract/.test(fold(d.name)) ? "sutartis" : "salygos";
      if (!out[k]) out[k] = pirmumoSakinys(d, pirma) || pirmumoSakinys(d, antra);
    });
    return out;
  }

  global.GP_KALBU_SUTIKRINIMAS = { version: "1.0.0", tikrink: tikrink, pirmumas: pirmumas, rusiesPav: rusiesPav, reiksmes: reiksmes, kalbaTeksto: kalbaTeksto, palygink: palygink, eilutes: eilutes, stulpeliuVietos: stulpeliuVietos };
})(typeof window !== "undefined" ? window : this);
