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
 *  - skaiciaiZodziai(docs) -> { radiniai, dokumentu, poru }: skaičius ir žodžiai toje pačioje vietoje („30 (dvidešimt) dienų“), ir vienkalbiuose dokumentuose.
 *    Išmatuota 2026-11-04: 27 tikri paketai, 128 dokumentai, 1 862 poros - viena tikra klaida, klaidingų radinių nėra; 88 šablonai - radinių nėra;
 *  - zodziuVirsenybe(docs, kalba): sutarties sakinys, kad skiriantis vadovaujamasi žodžiais;
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

  /* ---------------- Skaičius ir žodžiai toje pačioje kalboje ----------------
     „30 (dvidešimt) dienų“: LITGRID sutartyse, kai skaičius ir žodžiai skiriasi, vadovaujamasi žodžiais, todėl tokia klaida keičia sąlygą.
     Žodžiai skaitomi griežtai: bent vienas nežinomas žodis („pirmas“, „su puse“) - reikšmė nežinoma, ne radinys. */
  function lentele(eil) {
    var z = Object.create(null);
    eil.forEach(function (x) { x[1].split(" ").forEach(function (f) { z[f] = x[0]; }); });
    return z;
  }
  var ZODZIAI_LT = lentele([
    [0, "nulis"],
    [1, "vienas viena vieno vienos vienam vienai vienu vieneri vienerius vieneriu vieneriems vieneriais vieneriuose"],
    [2, "du dvi dvieju dviem dvejus dveji dveju dvejiems dvejais dvejuose"],
    [3, "trys triju trims tris trimis treji trejus treju trejiems trejais trejuose"],
    [4, "keturi keturios keturiu keturiems keturioms keturis keturias keturiais keturiomis ketveri ketverius ketveriu ketveriems"],
    [5, "penki penkios penkiu penkiems penkioms penkis penkias penkiais penkiomis penkeri penkerius penkeriu penkeriems"],
    [6, "sesi sesios sesiu sesiems sesioms sesis sesias sesiais sesiomis seseri seserius seseriu seseriems"],
    [7, "septyni septynios septyniu septyniems septynioms septynis septynias septyniais septyniomis"],
    [8, "astuoni astuonios astuoniu astuoniems astuonioms astuonis astuonias astuoniais astuoniomis"],
    [9, "devyni devynios devyniu devyniems devynioms devynis devynias devyniais devyniomis"],
    [10, "desimt desimties desimciai desimcia"],
    [100, "simtas simto simtui simta simtu simtai simtus simtams simtais"],
    [1000, "tukstantis tukstancio tukstanciui tukstanti tukstanciu tukstanciai tukstancius tukstanciams tukstanciais"],
    [1000000, "milijonas milijono milijonui milijona milijonu milijonai milijonus milijonams milijonais"]
  ]);
  // 11-19 ir 20-90 - kamienas ir galūnė
  [["vienuo", 11], ["dvy", 12], ["try", 13], ["keturio", 14], ["penkio", 15], ["sesio", 16], ["septynio", 17], ["astuonio", 18], ["devynio", 19]].forEach(function (x) {
    ["lika", "likos", "likai", "likoje"].forEach(function (g) { ZODZIAI_LT[x[0] + g] = x[1]; });
  });
  [["dvi", 20], ["tris", 30], ["keturias", 40], ["penkias", 50], ["sesias", 60], ["septynias", 70], ["astuonias", 80], ["devynias", 90]].forEach(function (x) {
    ["desimt", "desimties", "desimciai", "desimcia"].forEach(function (g) { ZODZIAI_LT[x[0] + g] = x[1]; });
  });
  var ZODZIAI_EN = lentele([
    [0, "zero"], [1, "one"], [2, "two"], [3, "three"], [4, "four"], [5, "five"], [6, "six"], [7, "seven"], [8, "eight"], [9, "nine"], [10, "ten"], [11, "eleven"], [12, "twelve"],
    [13, "thirteen"], [14, "fourteen"], [15, "fifteen"], [16, "sixteen"], [17, "seventeen"], [18, "eighteen"], [19, "nineteen"], [20, "twenty"], [30, "thirty"], [40, "forty fourty"],
    [50, "fifty"], [60, "sixty"], [70, "seventy"], [80, "eighty"], [90, "ninety"], [100, "hundred"], [1000, "thousand"], [1000000, "million"]
  ]);
  var DALYS_LT = lentele([[10, "desimtoji desimtosios desimtuju desimtaja desimtasias desimtoji"], [100, "simtoji simtosios simtuju simtaja simtasias"], [1000, "tukstantoji tukstantosios tukstantuju"]]);
  var DALYS_EN = lentele([[10, "tenth tenths"], [100, "hundredth hundredths"], [1000, "thousandth thousandths"]]);
  // Žodžiai po skaitvardžio, kurie reikšmės nekeičia: vienetai skliaustuose
  var VIENETAI = /^(eur[a-z]*|procent[a-z]*|proc|dien[a-z]*|darbo|kalendorin[a-z]*|menes[a-z]*|metu|metai|metus|savait[a-z]*|percent|per|cent|of|and|days?|working|calendar|business|months?|years?|weeks?)$/;

  /* Skaitvardis žodžiais -> skaičius; bet koks nežinomas žodis ar neįmanoma seka - null. */
  function skaicius_is_zodziu(tekstas) {
    var f = fold(tekstas).replace(/one-(tenth|hundredth|thousandth)/g, "$1");
    var z = f.match(/[a-z]+/g);
    if (!z || !z.length || /[^a-z\s,-]/.test(f.replace(/[()]/g, ""))) return null;
    var rez = null;
    [[ZODZIAI_LT, DALYS_LT, ["kablelis"]], [ZODZIAI_EN, DALYS_EN, ["point"]]].forEach(function (L) {
      if (rez !== null) return;
      var viso = 0, cur = 0, buvo = false, dalis = 1, po = false, kab = null;
      for (var i = 0; i < z.length; i++) {
        var w = z[i];
        if (L[2].indexOf(w) >= 0) { if (!buvo || cur || viso || kab !== null) return; kab = ""; continue; }
        if (kab !== null) { var d = L[0][w]; if (d === undefined || d > 9) { if (VIENETAI.test(w) && kab) { po = true; continue; } return; } if (po) return; kab += d; continue; }
        // „one hundred and twenty“: „and“ tarp skaitvardžio žodžių reikšmės nekeičia
        if (w === "and" && buvo && !po) continue;
        var v = L[0][w];
        if (v !== undefined && !po) {
          buvo = true;
          if (v === 1000000 || v === 1000) { viso += (cur || 1) * v; cur = 0; }
          else if (v === 100) { if (cur >= 10) return; cur = (cur || 1) * 100; }
          else {
            if (cur % 100 !== 0 && (v >= 20 || cur % 10 !== 0 || cur % 100 < 20)) return;
            cur += v;
          }
          continue;
        }
        if (L[1][w] !== undefined && buvo && dalis === 1 && !po) { dalis = L[1][w]; po = true; continue; }
        if (VIENETAI.test(w) && buvo) { po = true; continue; }
        return;
      }
      if (kab !== null) { if (kab) rez = parseFloat("0." + kab); return; }
      rez = (viso + cur) / dalis;
    });
    return rez;
  }

  var SK_NUM = "\\d{1,3}(?:[ .,'’]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d+)?";
  var SK_VIENETAS = "(?:\\s*(?:eur[a-z]*|€|proc\\.?|%|dien[a-z]*|menes[a-z]*|metu|metai|metus|days?|months?|years?|percent))?";
  var SK_PRIES = new RegExp("(^|[^\\d.,])(" + SK_NUM + ")" + SK_VIENETAS + "\\s*\\(([^()\\d]{2,160})\\)", "g");
  var SK_PO = new RegExp("\\(\\s*(" + SK_NUM + ")\\s*\\)", "g");

  // Skaičiai ir žodžiai viename tekste: [{ skaicius, zodziai, verte, zodziuVerte, i, ilg }]
  function poros(tekstas) {
    var s = String(tekstas == null ? "" : tekstas), f = fold(s), out = [], m;
    SK_PRIES.lastIndex = 0;
    while ((m = SK_PRIES.exec(f))) {
      var w = skaicius_is_zodziu(m[3]);
      if (w === null) continue;
      var i = m.index + m[1].length, sk = s.substr(i, m[2].length), z = s.substr(m.index + m[0].length - 1 - m[3].length, m[3].length);
      out.push({ skaicius: sk, zodziai: z.replace(/\s+/g, " ").trim(), verte: global.GP_MONEY.parseEUR(m[2]), zodziuVerte: w, i: i, ilg: m[0].length - m[1].length });
    }
    // „trisdešimt (30) dienų“: prieš skliaustus - tik skaitvardžio žodžiai
    SK_PO.lastIndex = 0;
    while ((m = SK_PO.exec(f))) {
      var pr = f.slice(Math.max(0, m.index - 120), m.index).match(/[a-z-]+/g);
      if (!pr) continue;
      var zod = [], k = pr.length - 1;
      while (k >= 0 && zod.length < 9 && skaicius_is_zodziu(pr[k]) !== null && !VIENETAI.test(pr[k])) { zod.unshift(pr[k]); k--; }
      if (!zod.length) continue;
      var w2 = skaicius_is_zodziu(zod.join(" "));
      if (w2 === null) continue;
      var pradz = f.lastIndexOf(zod[0], m.index);
      out.push({ skaicius: s.substr(m.index + m[0].indexOf(m[1]), m[1].length), zodziai: s.slice(pradz, m.index).replace(/\s+/g, " ").trim(), verte: global.GP_MONEY.parseEUR(m[1]), zodziuVerte: w2, i: pradz, ilg: m.index + m[0].length - pradz });
    }
    return out;
  }

  /* Visuose dokumentuose: { radiniai: [{ skaicius, zodziai, citata, vietos }], dokumentu, poru }. Tas pats skirtumas kitur - viena pastaba su keliomis vietomis. */
  function skaiciaiZodziai(docs) {
    var radiniai = [], pagal = Object.create(null), tinkami = Object.create(null), dokumentu = 0, kiek = 0;
    (docs || []).forEach(function (d) {
      if (!d || !d.blocks) return;
      var turi = false;
      d.blocks.forEach(function (b) {
        var pirminis = b.cells && b.cells.length ? b.cells : [b.text];
        pirminis.forEach(function (t) {
          poros(t).forEach(function (p) {
            turi = true; kiek++;
            if (p.verte === null || !isFinite(p.verte)) return;
            var tekstas = String(t).substr(p.i, p.ilg).replace(/\s+/g, " ").trim();
            var pries = fold(String(t).slice(Math.max(0, p.i - 40), p.i)).replace(/\s+/g, " ").trim();
            if (Math.abs(p.verte - p.zodziuVerte) < 1e-9) {
              var gk = pries + "|" + p.verte;
              if (!tinkami[gk]) tinkami[gk] = { docId: d.id, dokumentas: d.name, loc: b.loc, citata: citata(t, p.i, p.ilg), tekstas: tekstas };
              return;
            }
            // Ta pati klaida kita kalba ar kitoje redakcijoje („1 000 000 (one million five hundred thousand)“) - viena pastaba
            var r = p.verte + "|" + p.zodziuVerte, m = PUNKTAS.exec(pirminis[0] || ""), vt = { docId: d.id, dokumentas: d.name, loc: b.loc, punktas: m ? m[1] : null };
            if (pagal[r]) { pagal[r].vietos.push(vt); pagal[r].pries.push(pries); return; }
            var x = { skaicius: p.skaicius, zodziai: p.zodziai, verte: p.verte, zodziuVerte: p.zodziuVerte, citata: citata(t, p.i, p.ilg), tekstas: tekstas, vietos: [vt], pries: [pries] };
            pagal[r] = x; radiniai.push(x);
          });
        });
      });
      if (turi) dokumentu++;
    });
    // Ta pati nuostata kitur parašyta vienodai (dažniausiai - patikslinta redakcija, tikrame pakete tiekėjas apie tai klausė, o SPS vėliau pataisyta)
    radiniai.forEach(function (x) {
      x.pries.forEach(function (pr) {
        if (!x.kitur) x.kitur = tinkami[pr + "|" + x.verte] || tinkami[pr + "|" + x.zodziuVerte] || null;
      });
      delete x.pries;
    });
    return { radiniai: radiniai, dokumentu: dokumentu, poru: kiek };
  }

  // Sutarties taisyklė „Jeigu ... skaičiais ir žodžiais skiriasi, vadovaujamasi žodžiais“ (LITGRID bendrosios sąlygos 1.2.11)
  function zodziuVirsenybe(docs, kalba) {
    var pirma = kalba === "en" ? /numerical and verbal[^.]{0,200}/ : /skaiciais ir zodziais[^.]{0,80}(skiriasi|nesutampa)[^.]{0,120}zodziais/;
    var antra = kalba === "en" ? /skaiciais ir zodziais[^.]{0,80}(skiriasi|nesutampa)[^.]{0,120}zodziais/ : /numerical and verbal[^.]{0,200}/;
    var rez = null;
    [pirma, antra].forEach(function (re) {
      (docs || []).forEach(function (d) { if (!rez && d && d.blocks) rez = pirmumoSakinys(d, re); });
    });
    return rez;
  }

  global.GP_KALBU_SUTIKRINIMAS = { version: "1.1.0", tikrink: tikrink, skaiciaiZodziai: skaiciaiZodziai, skaiciusIsZodziu: skaicius_is_zodziu, zodziuVirsenybe: zodziuVirsenybe, poros: poros, pirmumas: pirmumas, rusiesPav: rusiesPav, reiksmes: reiksmes, kalbaTeksto: kalbaTeksto, palygink: palygink, eilutes: eilutes, stulpeliuVietos: stulpeliuVietos };
})(typeof window !== "undefined" ? window : this);
