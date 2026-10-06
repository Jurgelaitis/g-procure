/* ============================================================================
 * G-Procure  shared/palyginimas.js   (v1.0, 2026-10-06)
 * Pirkimo dokumento palyginimas su standartine forma (LITGRID šablonu) ir su ankstesne versija (GP_PALYGINIMAS).
 * Planas ir matavimai - docs/salygos/auditas-planas-2026-10.md (naudotojo užduotis ir sprendimai 2026-10-06).
 *
 *   await GP_PALYGINIMAS.skaityk(ArrayBuffer | Blob | Uint8Array) -> { pastraipos, pasas }      (reikia JSZip)
 *   GP_PALYGINIMAS.pastraipos(xml | Document)       -> [{ t, n, red, i, lent, toc, antraste }]   (word/document.xml)
 *   GP_PALYGINIMAS.norm(t), maisa(t)                -> palyginimui normalizuotas tekstas; trumpa teksto maiša (14 šešioliktainių)
 *   GP_PALYGINIMAS.formosMaisa(pastraipos)          -> formos versijos maiša (normalizuotas tekstas, be formatavimo)
 *   GP_PALYGINIMAS.atpazink(dok, formos)            -> [{ id, balas }] - kuri forma (šablonas) labiausiai tinka (visi šablonai įkelti)
 *   GP_PALYGINIMAS.identifikuok(dok, rodykle)       -> [{ id, balas, apreptis, tikslumas }] - tas pats pagal formu-versijos.json rodyklę
 *   GP_PALYGINIMAS.kitosVersijos(irasas)            -> { maiša: versija } - ankstesnių oficialių formų pastraipos (lygink parinktis)
 *   GP_PALYGINIMAS.raktas(pakeitimas, formosId)     -> sprendimo raktas (ataskaitos sprendimai rodomi kitoje paketo versijoje)
 *   GP_PALYGINIMAS.lygink(forma, dok, { zemelapis, kitosVersijos }) -> { pakeitimai, statistika }  - klasifikuoti skirtumai
 *   GP_PALYGINIMAS.pagalPasa(pasas, dok, forma)     -> tas pats rezultatas, bet tiksliai: kas pakeista PO generavimo
 *   GP_PALYGINIMAS.zodziai(a, b)                    -> [{ o: "=" | "-" | "+", t }] - pakeitimas žodžių lygiu
 *   GP_PALYGINIMAS.pasoXml(info, pastraipos)        -> generavimo paso XML (customXml dalis, žr. PP-salygos/variklis.js GPDocx.pasas)
 *
 * Pakeitimo rūšys (`rusis`): nukrypimas (pakeista, pašalinta ar pridėta nekintama formos nuostata) - VPK turi matyti;
 * neprivaloma (pašalinta sąlyginė formos dalis: žemėlapio šaka, „Jei keliamas ...“ papunktis, nacionalinio saugumo dalis, lentelės
 * eilutė); uzpildyta (raudonas sluoksnis, tuščios vietos, „A / B“ pasirinkimas); techninis (turinys, numeracija, skyryba, priedų
 * sąrašas, perkelta). Niekas nepaslepiama - rūšis tik nusako, kaip rodoma (nukrypimai - radiniai, kiti - suskleistose grupėse).
 *
 * Išmatuota (2026-10-06): 10 tikrų paskelbtų LITGRID dokumentų - forma atpažinta visiems, BPS sutampa pastraipa į pastraipą;
 * modulio sugeneruotas paketas be paso - ~5 % neatpažintų pakeitimų, su pasu - 0. Nieko nesaugo ir nesiunčia.
 * ========================================================================== */
(function (global) {
  "use strict";
  if (global.GP_PALYGINIMAS) return;
  var NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  var NS_PASAS = "https://g-procure.com/pasas/1";

  /* ---------------------------------------------------------------- tekstas */
  function raudona(v) {
    v = String(v || "").toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(v)) return false;
    var r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4), 16);
    return r >= 0xB0 && g <= 0x50 && b <= 0x50;
  }
  function norm(s) {
    s = String(s || "").replace(/[„“”"]/g, "\"").replace(/[\u2013\u2014]/g, "-").replace(/\u00a0/g, " ");
    s = s.replace(/^\s*(\d+(\.\d+)+(?=\s)|\d+(\.\d+)*\.)\s*/, "");   // numeris tekstu (GPNum) ar ranka; ir „13.1 Priedas“ be taško
    s = s.replace(/ĮMONĖS PAVADINIMAS/g, "LITGRID AB").replace(/\/LITGRID AB\//g, "LITGRID AB");
    return s.replace(/\s+/g, " ").trim().toLowerCase();
  }
  // cyrb53 - greita 53 bitų maiša; paso pastraipoms (kriptografinė nereikalinga: lyginamas tas pats dokumentas)
  function maisa(t) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, s = String(t || "");
    for (var i = 0; i < s.length; i++) { var ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    var n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return ("0000000000000" + n.toString(16)).slice(-14);
  }
  var ANTRASTE = /^\s*\d+\.\s*[A-ZĄČĘĖĮŠŲŪŽ][A-ZĄČĘĖĮŠŲŪŽ0-9 ,\-–()/„“"]{3,}$/;
  var TURINIO_EILUTE = /^[0-9. ]*[A-ZĄČĘĖĮŠŲŪŽ][A-ZĄČĘĖĮŠŲŪŽ ,()–\-/„“"]+\s\d{1,3}$/;

  function el(n, vardas) { return n.getElementsByTagNameNS ? n.getElementsByTagNameNS(NS_W, vardas) : []; }
  function pastraipos(xml) {
    var doc = typeof xml === "string" ? new DOMParser().parseFromString(xml, "application/xml") : xml;
    var body = el(doc, "body")[0];
    if (!body) return [];
    var ps = el(body, "p"), out = [];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], txt = "", red = false;
      var runs = el(p, "r");
      for (var j = 0; j < runs.length; j++) {
        var r = runs[j], t = "";
        for (var k = 0; k < r.childNodes.length; k++) {
          var c = r.childNodes[k];
          if (c.namespaceURI !== NS_W) continue;
          if (c.localName === "t") t += c.textContent; else if (c.localName === "tab") t += " ";
        }
        if (!t) continue;
        var col = el(r, "color")[0];
        if (col && raudona(col.getAttributeNS(NS_W, "val") || col.getAttribute("w:val")) && t.trim()) red = true;
        txt += t;
      }
      var tekstas = txt.replace(/\s+/g, " ").trim();
      if (!tekstas) continue;
      var lent = false, q = p.parentNode;
      while (q && q !== body) { if (q.namespaceURI === NS_W && q.localName === "tbl") { lent = true; break; } q = q.parentNode; }
      var st = el(p, "pStyle")[0], stilius = st ? (st.getAttributeNS(NS_W, "val") || st.getAttribute("w:val") || "") : "";
      out.push({ t: tekstas, n: norm(tekstas), red: red, i: i, lent: lent,
                 toc: /^(TOC|Turinys)/i.test(stilius) || TURINIO_EILUTE.test(tekstas),
                 antraste: /^Heading|^Antra/i.test(stilius) || ANTRASTE.test(tekstas) });
    }
    return out;
  }
  function formosMaisa(ps) { return maisa(ps.map(function (x) { return x.n; }).join("\n")); }

  /* ---------------------------------------------------------------- skaitymas */
  async function skaityk(failas) {
    if (!global.JSZip) throw new Error("JSZip neįkeltas - DOCX failo perskaityti negalima");
    var buf = failas && failas.arrayBuffer ? await failas.arrayBuffer() : failas;
    var zip = await global.JSZip.loadAsync(buf);
    var f = zip.file("word/document.xml");
    if (!f) throw new Error("tai ne Word (DOCX) dokumentas");
    var ps = pastraipos(await f.async("string"));
    var pasas = null, items = zip.file(/^customXml\/item\d+\.xml$/);
    for (var i = 0; i < items.length && !pasas; i++) {
      var x = await items[i].async("string");
      if (x.indexOf(NS_PASAS) >= 0) pasas = skaitykPasa(x);
    }
    return { pastraipos: ps, pasas: pasas };
  }

  /* ---------------------------------------------------------------- generavimo pasas */
  /* Naudotojo sprendimas 2026-10-06: pase - šablonas, formos versija ir sugeneruoto dokumento pastraipų maišos, BE atsakymų
     (atsakymuose yra numatoma vertė, o failas skelbiamas CVP IS). Iš maišų negalima atkurti teksto, bet galima tiksliai pasakyti,
     kurios pastraipos pakeistos po generavimo. */
  function xe(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function pasoXml(info, ps) {
    info = info || {};
    return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<pasas xmlns=\"" + NS_PASAS + "\" versija=\"1\"" +
      " sablonas=\"" + xe(info.sablonas) + "\" forma=\"" + xe(info.forma) + "\" data=\"" + xe(info.data) + "\" modulis=\"" + xe(info.modulis || "PP-salygos") + "\">" +
      "<pastraipos>" + ps.map(function (x) { return maisa(x.n); }).join(" ") + "</pastraipos></pasas>";
  }
  function skaitykPasa(xml) {
    var d = new DOMParser().parseFromString(xml, "application/xml"), r = d.documentElement;
    if (!r || r.namespaceURI !== NS_PASAS || r.localName !== "pasas") return null;
    var p = r.getElementsByTagNameNS(NS_PASAS, "pastraipos")[0];
    return { versija: r.getAttribute("versija"), sablonas: r.getAttribute("sablonas"), forma: r.getAttribute("forma"),
             data: r.getAttribute("data"), modulis: r.getAttribute("modulis"),
             pastraipos: p ? p.textContent.trim().split(/\s+/).filter(Boolean) : [] };
  }

  /* ---------------------------------------------------------------- sulyginimas */
  // LCS pagal lygias eilutes (maišos), tada tarpuose - panašumo poros (bigramų Dice >= 0,6), tada perkėlimai
  function lcsPoros(A, B) {
    var n = A.length, m = B.length, W = m + 1, L = new Uint16Array((n + 1) * W);
    for (var i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--)
      L[i * W + j] = A[i] === B[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
    var out = [], a = 0, b = 0;
    while (a < n && b < m) {
      if (A[a] === B[b]) { out.push([a, b]); a++; b++; }
      else if (L[(a + 1) * W + b] >= L[a * W + b + 1]) a++; else b++;
    }
    return out;
  }
  function bigramos(s) { var m = {}; for (var i = 0; i < s.length - 1; i++) { var k = s.substr(i, 2); m[k] = (m[k] || 0) + 1; } return m; }
  function panasumas(a, b) {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    var A = bigramos(a), B = bigramos(b), bend = 0, na = a.length - 1, nb = b.length - 1;
    for (var k in A) if (B[k]) bend += Math.min(A[k], B[k]);
    return 2 * bend / (na + nb);
  }
  /* -> [{ op: "=" | "~" | "-" | "+" | "perkelta", a, b }] (a, b - indeksai sąrašuose; "~" - pakeista pastraipa) */
  /* vietos[i] = true - formos pastraipa su pildoma vieta ar raudonu tekstu: tarpe ji poruojama su likusia dokumento pastraipa
     (pirma - pagal pradžią prieš vietą, tada - iš eilės), net jei tekstas mažai panašus („Vykdomas [Pasirinkite].“ -> „Vykdomas
     Supaprastintas pirkimas ...“, raudona data -> „2026 m. rugsėjo 29 d.“) */
  function sulygink(A, B, vietos) {
    var poros = lcsPoros(A, B), ops = [], pa = 0, pb = 0;
    function tarpas(a1, a2, b1, b2) {
      var naudota = {}, i, j, laikini = [];
      for (i = a1; i < a2; i++) {
        var geriausia = null;
        for (j = b1; j < b2; j++) {
          if (naudota[j]) continue;
          var r = panasumas(A[i], B[j]);
          if (r >= 0.6 && (!geriausia || r > geriausia.r)) geriausia = { j: j, r: r };
        }
        if (!geriausia && vietos && vietos[i]) {
          var pr = A[i].split(/\[|_{3,}|\.\.\.|…|pasirinkite/)[0].trim();
          if (pr.length >= 6) for (j = b1; j < b2; j++) if (!naudota[j] && B[j].indexOf(pr) === 0) { geriausia = { j: j, r: 0 }; break; }
        }
        if (geriausia) { naudota[geriausia.j] = 1; laikini.push({ op: "~", a: i, b: geriausia.j, r: geriausia.r }); }
        else laikini.push({ op: "-", a: i, b: null });
      }
      // likusios pildomos vietos - su likusiomis dokumento pastraipomis iš eilės (toje pačioje vietoje)
      if (vietos) {
        var likB = []; for (j = b1; j < b2; j++) if (!naudota[j]) likB.push(j);
        laikini.forEach(function (o) { if (o.op === "-" && vietos[o.a] && likB.length) { o.op = "~"; o.b = likB.shift(); o.r = 0; naudota[o.b] = 1; } });
      }
      laikini.forEach(function (o) { ops.push(o); });
      for (j = b1; j < b2; j++) if (!naudota[j]) ops.push({ op: "+", a: null, b: j });
    }
    poros.forEach(function (p) { tarpas(pa, p[0], pb, p[1]); ops.push({ op: "=", a: p[0], b: p[1] }); pa = p[0] + 1; pb = p[1] + 1; });
    tarpas(pa, A.length, pb, B.length);
    // perkėlimai: pašalinta ir pridėta to paties teksto pastraipa
    var prid = {};
    ops.forEach(function (o, k) { if (o.op === "+") (prid[B[o.b]] = prid[B[o.b]] || []).push(k); });
    ops.forEach(function (o) {
      if (o.op !== "-") return;
      var sar = prid[A[o.a]];
      if (sar && sar.length) { var k = sar.shift(); o.op = "perkelta"; o.b = ops[k].b; ops[k].op = "x"; }
    });
    return ops.filter(function (o) { return o.op !== "x"; });
  }

  /* ---------------------------------------------------------------- žodžių lygis */
  function zodziai(a, b) {
    var A = String(a || "").match(/\s+|[^\s]+/g) || [], B = String(b || "").match(/\s+|[^\s]+/g) || [];
    if (A.length * B.length > 250000) return [{ o: "-", t: a }, { o: "+", t: b }];
    var poros = lcsPoros(A, B), out = [], pa = 0, pb = 0;
    function prid(o, t) { if (!t) return; var p = out[out.length - 1]; if (p && p.o === o) p.t += t; else out.push({ o: o, t: t }); }
    poros.forEach(function (p) {
      prid("-", A.slice(pa, p[0]).join("")); prid("+", B.slice(pb, p[1]).join("")); prid("=", A[p[0]]); pa = p[0] + 1; pb = p[1] + 1;
    });
    prid("-", A.slice(pa).join("")); prid("+", B.slice(pb).join(""));
    return out;
  }

  /* ---------------------------------------------------------------- neprivalomos formos dalys */
  /* Iš formos sandaros (ne ranka sudarytas sąrašas): žemėlapio blokai; „Jei / Jeigu ... :“ papunkčiai iki kito to paties ar
     aukštesnio lygio punkto; nacionalinio saugumo dalis; raudona sąlygos antraštė ir jos juodi punktai. */
  function neprivalomos(forma, zemelapis) {
    var s = {}, i, j;
    ((zemelapis && zemelapis.blokai) || []).forEach(function (b) {
      if (b.blokas && b.blokas.nuo != null) for (var k = b.blokas.nuo; k <= b.blokas.iki; k++) s["i" + k] = 1;
      if (b.i != null) s["i" + b.i] = 1;
    });
    var lygis = function (t) { var m = /^\s*(\d+(?:\.\d+)*)\.?\s/.exec(t); return m ? m[1].split(".").length : 0; };
    var SALYGA = /^(\d+(\.\d+)*\.?\s*)?(jei|jeigu|kai)\s/i;
    var arba = function (x) { return x.red && /^\s*arba\s*$/i.test(x.t); };
    for (i = 0; i < forma.length; i++) {
      var x = forma[i];
      var salyga = (SALYGA.test(x.t) && /:\s*$/.test(x.t)) || (x.red && (SALYGA.test(x.t) || /:\s*$/.test(x.t)));
      var nac = /susij[eę]s su nacionaliniu saugumu/i.test(x.t);
      if (arba(x)) {
        // „ARBA“ tarp dviejų alternatyvų: abi pusės (iki ankstesnės ir kitos antraštės ar „ARBA“)
        s["i" + x.i] = 1;
        for (j = i - 1; j >= 0 && i - j <= 10 && !forma[j].antraste && !arba(forma[j]); j--) s["i" + forma[j].i] = 1;
        for (j = i + 1; j < forma.length && j - i <= 15 && !forma[j].antraste && !arba(forma[j]); j++) s["i" + forma[j].i] = 1;
        continue;
      }
      if (!salyga && !nac) continue;
      var lv = lygis(x.t);
      s["i" + x.i] = 1;
      // antraštė su dvitaškiu prieš sąlygą („Reikalavimai ... atitikimui:“) - tos pačios grupės dalis
      if (i > 0 && /:\s*$/.test(forma[i - 1].t) && !forma[i - 1].antraste && !forma[i - 1].red) s["i" + forma[i - 1].i] = 1;
      for (j = i + 1; j < forma.length; j++) {
        var y = forma[j];
        if (y.antraste || j - i > 40) break;
        var ly = lygis(y.t);
        if (lv && ly && ly <= lv) break;
        if (!lv && j > i + 1 && (SALYGA.test(y.t) || (y.red && /:\s*$/.test(y.t)) || arba(y))) break;
        s["i" + y.i] = 1;
      }
    }
    return s;
  }

  /* ---------------------------------------------------------------- klasifikacija */
  var SVARBUS_SKYRIUS = /(PAŠALINIMO|KVALIFIKACIJ|VERTINIM|UŽTIKRINIM|SUTARTIES|NACIONALIN|SANKCIJ|ŽALI|KAINA)/;
  var SVARBUS_TURINYS = /(sankcij|Rusijos|Baltarusijos|nacionalinio saugumo|reglament\S* \(ES\)|negali dalyvauti)/i;
  var KVALIF_SKYRIUS = /(PAŠALINIMO|KVALIFIKACIJ|ŽALI)/;
  function skyriai(ps) { var cur = "", out = []; ps.forEach(function (x) { if (x.antraste && !x.toc) cur = x.t.replace(/\s\d{1,3}$/, ""); out.push(cur); }); return out; }
  function techninis(a, b) {
    if (TURINIO_EILUTE.test(a) || TURINIO_EILUTE.test(b)) return "turinys";
    a = beNr(a); b = beNr(b);
    if (a.replace(/\d/g, "#") === b.replace(/\d/g, "#")) return "numeracija";
    var PRIED = /^(\d+ (priedas|priedėlis)|annex \d+|appendix \d+)/;
    if (PRIED.test(norm(a)) && PRIED.test(norm(b))) return "priedu_sarasas";
    var ops = zodziai(a, b).filter(function (s) { return s.o !== "="; });
    if (ops.every(function (s) { return !/[A-Za-zĄ-ž0-9]/.test(s.t); })) return "skyryba";
    return null;
  }
  var beNr = function (t) { return String(t || "").replace(/^\s*\d+(\.\d+)*\.\s*/, ""); };
  function uzpildyta(a, b) {
    a = beNr(a); b = beNr(b);
    var ops = zodziai(a, b);
    if (/_{3,}|\[[^\]]*\]|\.\.\.|…/.test(a) && ops.every(function (s) { return s.o !== "-" || /_{2,}|\[|\]|\.\.\.|…|^\s*$/.test(s.t); })) return true;
    // „X“ ar „N“ vietoj numerio ar sumos (SPS X priedas) -> skaičius
    var pak = ops.filter(function (s) { return s.o !== "="; });
    if (pak.length && pak.every(function (s, k) { return (s.o === "-" && /^(X|N|_+)$/.test(s.t.trim())) || (s.o === "+" && pak[k - 1] && pak[k - 1].o === "-" && /^[0-9IVX.,\s-]{1,12}$/.test(s.t.trim())); })) return true;
    // „A / B“: tik ištrinta (alternatyvos ir jų paaiškinimai), nieko nepridėta, bent vienas ištrynimas su pasviruoju brūkšniu
    if (/\//.test(a) && !ops.some(function (s) { return s.o === "+" && /[A-Za-zĄ-ž0-9]/.test(s.t); })
        && ops.some(function (s) { return s.o === "-" && /\//.test(s.t); })) return true;
    // „kainai/ Sutarties projekte nurodytai sumai.“ -> „kainai.“: žodžiai išlaikyti iš eilės, o kiekviena pašalinta atkarpa ribojasi su „/“
    if (beAlternatyvos(a, b)) return true;
    // vieta užpildyta gale („Rengė:“ -> „Rengė: vardas“)
    if (/:\s*$/.test(a) && b.indexOf(a.replace(/\s+$/, "")) === 0) return true;
    return false;
  }
  function beAlternatyvos(a, b) {
    if (a.indexOf("/") < 0) return false;
    var re = /[A-Za-zĄ-ž0-9]+/g, A = [], m;
    while ((m = re.exec(a))) A.push({ w: m[0].toLowerCase(), s: m.index, e: m.index + m[0].length });
    var Bw = (b.match(/[A-Za-zĄ-ž0-9]+/g) || []).map(function (x) { return x.toLowerCase(); });
    if (!Bw.length || Bw.length >= A.length) return false;
    var j = 0, keep = {}, i, k;
    for (i = 0; i < A.length && j < Bw.length; i++) if (A[i].w === Bw[j]) { keep[i] = 1; j++; }
    if (j < Bw.length) return false;
    for (i = 0; i < A.length; i++) {
      if (keep[i]) continue;
      k = i; while (k + 1 < A.length && !keep[k + 1]) k++;
      var pr = i ? A[i - 1].e : 0, po = k + 1 < A.length ? A[k + 1].s : a.length;
      if ((a.slice(pr, A[i].s) + a.slice(A[k].e, po)).indexOf("/") < 0) return false;
      i = k;
    }
    return true;
  }
  function ilgaNuostata(t) { return t.length >= 120 && !/_{3,}/.test(t); }

  /* forma, dok - pastraipos(); grąžina { pakeitimai: [{ op, rusis, poRusis, a, b, forma, dok, skyrius, svarbus }], statistika } */
  function lygink(forma, dok, o) {
    o = o || {};
    var vietos = forma.map(function (x) { return x.red || /_{3,}|\[[^\]]*\]|pasirinkite/i.test(x.t) || (x.t.length < 40 && /:\s*$/.test(x.t)); });
    var ops = sulygink(forma.map(function (x) { return x.n; }), dok.map(function (x) { return x.n; }), vietos);
    // pakeista skyriaus antraštė („14. PRIEDAI (koreguojama pagal poreikį)“ -> „PRIEDAI“): pašalinta ir pridėta antraštė greta - pora
    ops.forEach(function (x, k) {
      if (x.op !== "-" || !forma[x.a].antraste) return;
      for (var q = k + 1; q < ops.length && q <= k + 3; q++) {
        var y = ops[q];
        if (y.op === "+" && dok[y.b].antraste) { x.op = "~"; x.b = y.b; x.r = 0; x.antraste = true; y.op = "x"; break; }
        if (y.op === "=") break;
      }
    });
    ops = ops.filter(function (x) { return x.op !== "x"; });
    var kitos = o.kitosVersijos || null;      // { maiša: "versija" } - oficialių formų versijų pastraipos, kurių dabartinėje nėra
    var nepriv = neprivalomos(forma, o.zemelapis), skF = skyriai(forma), skD = skyriai(dok);
    var st = { vienodos: 0, nukrypimas: 0, neprivaloma: 0, uzpildyta: 0, techninis: 0 }, pak = [];
    ops.forEach(function (x) {
      if (x.op === "=") { st.vienodos++; return; }
      var f = x.a != null ? forma[x.a] : null, d = x.b != null ? dok[x.b] : null, r, pr = null;
      if (x.op === "perkelta") { r = "techninis"; pr = "perkelta"; }
      else if (f && (f.toc || (d && d.toc))) { r = "techninis"; pr = "turinys"; }
      else if (x.antraste) { r = "techninis"; pr = "antraste"; }
      else if (d && kitos && kitos[maisa(d.n)]) { r = "techninis"; pr = "kita_versija"; }
      else if (x.op === "+" && d.antraste && d.n.length >= 4 && forma.some(function (y) { return y.antraste && y.n.indexOf(d.n) === 0; })) { r = "techninis"; pr = "antraste"; }
      else if (x.op === "+") {
        r = d.toc ? "techninis" : (d.lent ? "uzpildyta" : "nukrypimas");
        if (r === "techninis") pr = "turinys"; else if (d.lent) pr = "lentele";
      } else if (f.red || (x.op === "~" && vietos[x.a] && x.r === 0)) { r = "uzpildyta"; pr = "raudonas"; }
      else if (x.op === "~" && (pr = techninis(f.t, d.t))) r = "techninis";
      else if (x.op === "~" && uzpildyta(f.t, d.t)) { r = "uzpildyta"; pr = "vieta"; }
      else if (nepriv["i" + f.i]) { r = "neprivaloma"; pr = x.op === "-" ? "pasalinta" : "pakeista"; }
      else if (f.lent && x.op === "-" && (!ilgaNuostata(f.t) || KVALIF_SKYRIUS.test(skF[x.a] || ""))) { r = "neprivaloma"; pr = "lentele"; }
      else r = "nukrypimas";
      st[r]++;
      var sk = f ? skF[x.a] : skD[x.b];
      pak.push({ op: x.op === "~" ? "pakeista" : x.op === "-" ? "pasalinta" : x.op === "+" ? "prideta" : "perkelta",
                 rusis: r, poRusis: pr, a: x.a, b: x.b, forma: f ? f.t : "", dok: d ? d.t : "",
                 skyrius: sk || "", svarbus: SVARBUS_SKYRIUS.test(sk || "") || SVARBUS_TURINYS.test((f ? f.t : "") + " " + (d ? d.t : "")) });
    });
    return { pakeitimai: pak, statistika: st, formosPastraipu: forma.length, dokPastraipu: dok.length };
  }

  /* Su generavimo pasu: pastraipos lyginamos su paso maišomis - kas skiriasi, pakeista PO generavimo. Formos tekstas (forma)
     rodomas tik kaip kontekstas pakeistai pastraipai (artimiausia pagal tekstą). */
  function pagalPasa(pasas, dok, forma) {
    var H = dok.map(function (x) { return maisa(x.n); });
    var ops = sulygink(pasas.pastraipos, H), pak = [], st = { vienodos: 0, nukrypimas: 0, neprivaloma: 0, uzpildyta: 0, techninis: 0 };
    var fn = (forma || []).map(function (x) { return x.n; });
    function artimiausia(n) {
      var g = null; fn.forEach(function (t, i) { var r = panasumas(t, n); if (r >= 0.6 && (!g || r > g.r)) g = { i: i, r: r }; }); return g ? forma[g.i].t : "";
    }
    var sk = skyriai(dok);
    // Pase tik maišos: pakeista pastraipa = pašalinta maiša + nauja pastraipa toje pačioje vietoje
    var i = 0;
    while (i < ops.length) {
      var x = ops[i];
      if (x.op === "=") { st.vienodos++; i++; continue; }
      if (x.op === "perkelta") { st.techninis++; pak.push({ op: "perkelta", rusis: "techninis", poRusis: "perkelta", a: x.a, b: x.b, forma: "", dok: dok[x.b].t, skyrius: sk[x.b], svarbus: SVARBUS_SKYRIUS.test(sk[x.b] || "") }); i++; continue; }
      if (x.op === "-" && ops[i + 1] && ops[i + 1].op === "+") {
        var d = dok[ops[i + 1].b];
        st.nukrypimas++;
        pak.push({ op: "pakeista", rusis: "nukrypimas", poRusis: "po_generavimo", a: x.a, b: ops[i + 1].b, forma: artimiausia(d.n), dok: d.t, skyrius: sk[ops[i + 1].b], svarbus: SVARBUS_SKYRIUS.test(sk[ops[i + 1].b] || "") });
        i += 2; continue;
      }
      st.nukrypimas++;
      if (x.op === "+" || x.op === "~") { var dd = dok[x.b]; pak.push({ op: "prideta", rusis: "nukrypimas", poRusis: "po_generavimo", a: null, b: x.b, forma: "", dok: dd.t, skyrius: sk[x.b], svarbus: SVARBUS_SKYRIUS.test(sk[x.b] || "") }); }
      else pak.push({ op: "pasalinta", rusis: "nukrypimas", poRusis: "po_generavimo", a: x.a, b: null, forma: "", dok: "", skyrius: "", svarbus: false });
      i++;
    }
    return { pakeitimai: pak, statistika: st, formosPastraipu: pasas.pastraipos.length, dokPastraipu: dok.length, pagalPasa: true };
  }

  /* ---------------------------------------------------------------- formos atpažinimas */
  /* balas - kokia dalis formos nekintamų (juodų, > 25 simb.) pastraipų yra dokumente; pasirinktos alternatyvos jį mažina, todėl
     SPS tikėtina 0,55-0,85, BPS - ~1,0 (išmatuota 2026-10-06). */
  function atpazink(dok, formos) {
    var D = {}; dok.forEach(function (x) { D[x.n] = 1; });
    return formos.map(function (f) {
      var juodos = f.pastraipos.filter(function (x) { return !x.red && x.n.length > 25; }), rasta = 0;
      juodos.forEach(function (x) { if (D[x.n]) rasta++; });
      return { id: f.id, balas: juodos.length ? rasta / juodos.length : 0 };
    }).sort(function (a, b) { return b.balas - a.balas; });
  }

  /* Formos atpažinimas pagal rodyklę (PP-salygos/zemelapiai/formu-versijos.json „pozymiai“, generuoja formu-versijos.py): F1 tarp
     dokumento ir formos ilgesnių (> 40 simb.) pastraipų maišų ketvirčio (paskutinis ženklas 0-3, saugomi paskutiniai 8). Aprėptis (kiek
     formos pastraipų yra dokumente) ir tikslumas (kiek dokumento pastraipų yra formoje) - kartu, kad dvikalbis dokumentas nebūtų
     priskirtas lietuviškai formai ir atvirkščiai. Nereikia atsisiųsti visų šablonų - tik atpažintąjį. */
  function pozymiai(ps) {
    var o = {};
    ps.forEach(function (x) { if (x.n.length > 40) { var h = maisa(x.n); if (parseInt(h.slice(-1), 16) < 4) o[h.slice(-8)] = 1; } });
    return o;
  }
  function identifikuok(dok, formos) {
    var D = pozymiai(dok), nd = Object.keys(D).length;
    return Object.keys(formos || {}).map(function (id) {
      var S = String((formos[id] || {}).pozymiai || "").split(/\s+/).filter(Boolean), rasta = 0;
      S.forEach(function (h) { if (D[h]) rasta++; });
      var ap = S.length ? rasta / S.length : 0, tk = nd ? rasta / nd : 0;
      return { id: id, balas: ap + tk ? 2 * ap * tk / (ap + tk) : 0, apreptis: ap, tikslumas: tk };
    }).sort(function (a, b) { return b.balas - a.balas; });
  }
  /* formu-versijos.json formos įrašas -> { maiša: "versijos pavadinimas" } (lygink parinktis kitosVersijos) */
  function kitosVersijos(irasas) {
    var o = {};
    Object.keys(irasas || {}).forEach(function (k) { if (Array.isArray(irasas[k])) irasas[k].forEach(function (h) { o[h] = k; }); });
    return o;
  }
  /* Sprendimo raktas pakeitimui (ataskaita -> kita paketo versija): ta pati forma, tas pats veiksmas ir tas pats tekstas abiejose
     pusėse. Pakeitus tekstą dar kartą - raktas kitas, tad ankstesnis sprendimas jam nerodomas (reikia spręsti iš naujo). */
  function raktas(p, formosId) {
    return "F" + maisa([formosId || "", p.op, norm(p.forma), norm(p.dok)].join("|"));
  }

  global.GP_PALYGINIMAS = { version: "1.0", NS_PASAS: NS_PASAS, norm: norm, maisa: maisa, pastraipos: pastraipos, skaityk: skaityk,
    formosMaisa: formosMaisa, pasoXml: pasoXml, skaitykPasa: skaitykPasa, sulygink: sulygink, zodziai: zodziai, panasumas: panasumas,
    neprivalomos: neprivalomos, lygink: lygink, pagalPasa: pagalPasa, atpazink: atpazink, identifikuok: identifikuok,
    kitosVersijos: kitosVersijos, raktas: raktas };
})(typeof window !== "undefined" ? window : this);
