/* Pasiūlymų vertinimo metodika iš pirkimo dokumentų (GP_METODIKA; tobulinimo planas D3, 2026-10-20).
   Naujų darbuotojų testavimas: kriterijų („Pagal kokį kriterijų vertinami pasiūlymai?“) visada renka žmogus, o metodikos failas į paketą
   nepatenka. Dabar iš įkeltos metodikos (DOCX, PDF):
   - atpažįstama pagal failo vardą („metodika“) ar pradžią („Ekonomiškai naudingiausio pasiūlymo vertinimo metodika“, lentelė
     „Vertinimo kriterijai | Lyginamasis svoris“);
   - kriterijų sąrašas - eilutės „Pirmas kriterijus: Pasiūlymo kaina (be PVM) (A) | XA = 82“, „I kriterijus – Pasiūlymo kaina (C) | X = 85“
     (lentelės eilutė arba PDF eilutės iki kito kriterijaus), svoris - „XA = 82“, „Y = 15“, „Z = 20 balų“ arba vien skaičius svorio langelyje;
     tas pats kriterijus antrą kartą (metodikos aprašymo dalyje) - ne naujas;
   - vertinimo kriterijus: metodikoje pažodžiui įvardytas „kainos ir kokybės santykis“ ar „sąnaudų ir kokybės santykis“, kitaip - pagal
     sąrašą (kaina ir kiti kriterijai - kainos ir kokybės santykis, sąnaudos ir kiti - sąnaudų ir kokybės santykis, vienas - kaina ar sąnaudos);
   - patikra: kiekvienas kriterijus turi svorį, svorių suma - 100.
   Iš kito dokumento (techninės specifikacijos) sakinio „Pasiūlymai bus vertinami pagal ... kainą“ - tik siūlymas, kurį patvirtina žmogus.
   Išmatuota (2026-10-20) su 6 viešų LITGRID CVP IS paketų metodikomis (5 DOCX, 1 dvikalbis PDF): kriterijus visose sutampa su paskelbtų SPS
   8.1 punktu (kainos ir kokybės santykis), svorių suma - 100; tarp kitų 125 tų pačių 18 paketų DOCX metodika neatpažinta nė karto. Grynos funkcijos (skaityk - tik naršyklėje su JSZip): nieko nesaugo ir nesiunčia. */
(function (root) {
  "use strict";

  /* Lietuviškos raidės -> lotyniškos, tas pats ilgis (indeksai normalizuotame ir originaliame tekste sutampa - pavadinimui ir citatai). */
  var RAIDES = { "\u0105": "a", "\u010d": "c", "\u0119": "e", "\u0117": "e", "\u012f": "i", "\u0161": "s", "\u0173": "u", "\u016b": "u", "\u017e": "z", "\u2013": "-", "\u2014": "-", "\u00a0": " " };
  function norm(t) {
    var s = String(t || "").toLowerCase(), o = "";
    for (var i = 0; i < s.length; i++) o += RAIDES[s[i]] || s[i];
    return o;
  }
  function svarus(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  var KODAI = { kks: "Kainos ir kokybės santykis", sks: "Sąnaudų ir kokybės santykis", sanaudos: "Sąnaudos", kaina: "Kaina" };
  var EILES = ["pirmas", "antras", "trecias", "ketvirtas", "penktas", "sestas", "septintas", "astuntas", "devintas", "desimtas"];
  var ROM = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  // kriterijaus antraštė eilutės pradžioje: „Pirmas kriterijus: ...“, „I kriterijus – ...“, „1 kriterijus. ...“ (ne „I kriterijaus (C) balai“)
  var ANTRASTE = /^\s*(?:(pirmas|antras|trecias|ketvirtas|penktas|sestas|septintas|astuntas|devintas|desimtas)|(x|ix|viii|vii|vi|v|iv|iii|ii|i)|(\d{1,2}))\s*(?:-?asis)?\s+kriterijus(?![a-z])\s*[:.\-]?\s*/;
  // svoris: „XA = 82“, „X = 60 balų“, „Y = 15“, „XC = 2,5“ (ne formulės „S = C + T + M“ ir ne balų lentelės „D=0“ - jos už kriterijaus ribų)
  var SVORIS = /(?:^|[^a-z0-9])[a-z]{1,3}\s*=\s*(\d{1,3}(?:[.,]\d{1,2})?)(?![\d.,])/;
  var VIEN_SKAICIUS = /^\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:%|proc\.?|balu|balai|bal\.)?\s*$/;
  var KAINA = /kain/, SANAUDOS = /sanaud|gyvavimo ciklo/;
  var KKS = /kainos ir kokybes santyk/, SKS = /sanaudu ir kokybes santyk/;
  var ATPAZINIMAS = /ekonomiskai naudingiausio pasiulymo vertinimo metodika|ekonominio naudingumo vertinimo metodika|vertinimo kriterij[a-z]* .{0,80}lyginamasis svoris|methodology for evaluating the most economically advantageous/;

  function skaicius(s) { var n = parseFloat(String(s).replace(",", ".")); return isFinite(n) ? n : null; }
  function eilesNr(m) {
    if (m[1]) return EILES.indexOf(m[1]) + 1;
    if (m[2]) return ROM.indexOf(m[2]) + 1;
    return parseInt(m[3], 10);
  }

  /* Ar dokumentas - vertinimo metodika: failo vardas arba pradžios tekstas */
  function atpazink(vardas, pradzia) {
    var v = norm(String(vardas || "").replace(/\.[a-z0-9]+$/i, ""));
    return /metodik|methodology/.test(v) || ATPAZINIMAS.test(norm(String(pradzia || "").slice(0, 4000)).replace(/\s+/g, " "));
  }

  /* Elementai iš GP_DOK blokų (PDF - puslapių eilutės, kiti - pastraipos ir lentelių eilutės). DOCX tiksliau - skaityk(). */
  function isBloku(blokai) {
    var out = [];
    (blokai || []).forEach(function (b) {
      if (b && Array.isArray(b.cells) && b.cells.length) out.push({ cells: b.cells.map(function (c) { return String(c || ""); }) });
      else String((b && b.text) || "").split("\n").forEach(function (l) { if (l.trim()) out.push({ text: l }); });
    });
    return out;
  }

  /* DOCX: pastraipos ir lentelių eilutės, langelio pastraipos - atskiromis eilutėmis (GP_DOK jas sujungia be tarpo) */
  function skaitykXml(xml) {
    var doc = new root.DOMParser().parseFromString(xml, "application/xml"), NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    var body = doc.getElementsByTagNameNS(NS, "body")[0], out = [];
    if (!body) return out;
    var pText = function (p) { return Array.from(p.getElementsByTagNameNS(NS, "t")).map(function (x) { return x.textContent; }).join(""); };
    var lentele = function (tbl) {
      Array.from(tbl.childNodes).filter(function (n) { return n.localName === "tr"; }).forEach(function (tr) {
        var cells = Array.from(tr.childNodes).filter(function (n) { return n.localName === "tc"; }).map(function (tc) {
          var eil = [];
          Array.from(tc.childNodes).forEach(function (n) {
            if (n.localName === "p") { var t = pText(n); if (t.trim()) eil.push(t); }
            else if (n.localName === "tbl") lentele(n);         // įdėtinė lentelė - atskiromis eilutėmis
          });
          return eil.join("\n");
        });
        if (cells.some(function (c) { return c.trim(); })) out.push({ cells: cells });
      });
    };
    Array.from(body.childNodes).forEach(function (n) {
      if (n.localName === "p") { var t = pText(n); if (t.trim()) out.push({ text: t }); }
      else if (n.localName === "tbl") lentele(n);
    });
    return out;
  }
  function skaityk(buf) {
    if (!root.JSZip) return Promise.reject(new Error("JSZip neįkeltas"));
    return root.JSZip.loadAsync(buf).then(function (z) {
      var f = z.file("word/document.xml");
      if (!f) throw new Error("nėra word/document.xml");
      return f.async("string");
    }).then(skaitykXml);
  }

  /* Metodikos analizė. Elementai: { text } (pastraipa ar PDF eilutė) arba { cells: [langelio tekstas su \n tarp pastraipų] } */
  function analizuok(el) {
    el = el || [];
    var eil = [];               // plokščias eilučių sąrašas: { t, i (elemento nr.), c (langelio nr.) }
    el.forEach(function (e, i) {
      if (e.cells) e.cells.forEach(function (c, ci) { String(c).split("\n").forEach(function (l) { if (l.trim()) eil.push({ t: l, i: i, c: ci }); }); });
      else if (String(e.text || "").trim()) eil.push({ t: String(e.text), i: i, c: -1 });
    });
    var visas = norm(eil.map(function (x) { return x.t; }).join("\n"));
    var kr = {}, tvarka = [];
    for (var k = 0; k < eil.length; k++) {
      var x = eil[k], n = norm(x.t), m = n.match(ANTRASTE);
      if (!m || x.c > 0) continue;                // antraštė - eilutės pradžioje (lentelėje - pirmame langelyje)
      var nr = eilesNr(m);
      if (!(nr >= 1 && nr <= 10)) continue;
      var pav = svarus(x.t.slice(m[0].length)).replace(/[\s/]+$/, "");
      if (!pav && eil[k + 1] && eil[k + 1].i === x.i) pav = svarus(eil[k + 1].t).replace(/[\s/]+$/, "");
      // svoris: lentelėje - tos pačios eilutės langeliuose; kitaip - kitose eilutėse iki kito kriterijaus (ne toliau kaip 15)
      var svoris = null, el0 = el[x.i];
      if (el0 && el0.cells){
        for (var ci = 1; ci < el0.cells.length && svoris == null; ci++) {
          var cn = norm(el0.cells[ci]), sm = cn.match(SVORIS), vs = cn.match(VIEN_SKAICIUS);
          if (sm) svoris = skaicius(sm[1]); else if (vs) svoris = skaicius(vs[1]);
        }
      } else {
        for (var j = k + 1; j < eil.length && j <= k + 15 && svoris == null; j++) {
          var nj = norm(eil[j].t);
          if (ANTRASTE.test(nj)) break;
          var sj = nj.match(SVORIS);
          if (sj) svoris = skaicius(sj[1]);
        }
      }
      if (kr[nr]) { if (kr[nr].svoris == null && svoris != null) kr[nr].svoris = svoris; continue; }   // tas pats kriterijus antrą kartą
      kr[nr] = { nr: nr, pavadinimas: pav.slice(0, 200), svoris: svoris, citata: svarus(x.t).slice(0, 300) };
      tvarka.push(nr);
    }
    var kriterijai = tvarka.sort(function (a, b) { return a - b; }).map(function (n) { return kr[n]; });
    // numeriai iš eilės nuo 1 - kitaip tai ne kriterijų sąrašas (pvz. kito dokumento ištrauka)
    if (kriterijai.some(function (q, i) { return q.nr !== i + 1; })) kriterijai = kriterijai.filter(function (q, i, a) { return a.slice(0, i + 1).every(function (z, j) { return z.nr === j + 1; }); });
    var problemos = [];
    var suSvoriu = kriterijai.filter(function (q) { return q.svoris != null; });
    var suma = suSvoriu.length === kriterijai.length && kriterijai.length ? Math.round(suSvoriu.reduce(function (a, q) { return a + q.svoris; }, 0) * 100) / 100 : null;
    if (!kriterijai.length) problemos.push("kriterijų sąrašo neradome");
    kriterijai.filter(function (q) { return q.svoris == null; }).forEach(function (q) { problemos.push("kriterijaus „" + q.pavadinimas + "“ lyginamojo svorio neradome"); });
    if (suma != null && Math.abs(suma - 100) > 0.001) problemos.push("kriterijų lyginamųjų svorių suma - " + String(suma).replace(".", ",") + ", ne 100");
    // vertinimo kriterijus: pažodžiui metodikoje (tik vienas iš dviejų) arba pagal sąrašą
    var kodas = null, citata = "", kodel = "";
    var kks = KKS.test(visas), sks = SKS.test(visas);
    if (kks !== sks){
      var re = kks ? KKS : SKS, e = eil.find(function (q) { return re.test(norm(q.t)); });
      kodas = kks ? "kks" : "sks"; citata = svarus(e ? e.t : "").slice(0, 300); kodel = "kriterijus įvardytas metodikoje";
    } else if (kriterijai.length){
      var p = norm(kriterijai[0].pavadinimas), kaina = KAINA.test(p), san = SANAUDOS.test(p);
      if (kriterijai.length >= 2) kodas = san ? "sks" : kaina || kriterijai.some(function (q) { return KAINA.test(norm(q.pavadinimas)); }) ? "kks" : null;
      else kodas = san ? "sanaudos" : kaina ? "kaina" : null;
      if (kodas){
        citata = kriterijai.map(function (q) { return q.pavadinimas + (q.svoris != null ? " - " + String(q.svoris).replace(".", ",") : ""); }).join("; ");
        kodel = "pagal kriterijų sąrašą";
      }
    }
    if (!kodas && kriterijai.length) problemos.push("vertinimo kriterijaus pagal kriterijų sąrašą nustatyti nepavyko");
    return { kriterijai: kriterijai, suma: suma, kodas: kodas, pavadinimas: kodas ? KODAI[kodas] : "", citata: citata, kodel: kodel, problemos: problemos };
  }

  /* Kito dokumento (techninės specifikacijos) sakinys apie vertinimo kriterijų - tik siūlymui (ne sąlyginis „Jei ...“, ne klausimas) */
  var SAKINYS = /pasiulym[a-z]*\s+(?:bus\s+)?vertinam[a-z]*\s+pagal\s+(?:ekonomiskai naudingiausio pasiulym[a-z]* vertinimo kriterij[a-z]*\s*[-:]?\s*)?(kainos ir kokybes santyk[a-z]*|sanaudu ir kokybes santyk[a-z]*|maziausi[a-z]* kain[a-z]*|kain[aą]|sanaudas)/;
  function sakinys(blokai) {
    for (var i = 0; i < (blokai || []).length; i++) {
      var t = String((blokai[i] && blokai[i].text) || ""), n = norm(t), m = n.match(SAKINYS);
      if (!m) continue;
      var pr = n.lastIndexOf(".", m.index) + 1, pries = n.slice(pr, m.index);
      if (/(^|[^a-z])(jei|jeigu|kai|ar)\s/.test(pries) || /\?/.test(n.slice(m.index, m.index + m[0].length + 40))) continue;
      var w = m[1], kodas = /^kainos ir/.test(w) ? "kks" : /^sanaudu ir/.test(w) ? "sks" : /^sanaud/.test(w) ? "sanaudos" : "kaina";
      var gal = n.indexOf(".", m.index + m[0].length);
      return { kodas: kodas, pavadinimas: KODAI[kodas], citata: svarus(t.slice(pr, gal < 0 ? t.length : gal + 1)).slice(0, 300), vieta: blokai[i].loc || null };
    }
    return null;
  }

  root.GP_METODIKA = { atpazink: atpazink, isBloku: isBloku, skaitykXml: skaitykXml, skaityk: skaityk, analizuok: analizuok, sakinys: sakinys, KODAI: KODAI, norm: norm };
})(typeof window !== "undefined" ? window : this);
