/* ============================================================================
 * G-Procure Tiekėjams  dokumentai.js
 * ----------------------------------------------------------------------------
 * Oficialaus CVP IS dokumentų paketo apdorojimas NARŠYKLĖJE (window.GP_DOK).
 *
 * Įėjimas: File objektai (ZIP / PDF / DOCX / XLSX / XML / HTML / TXT).
 * Išėjimas: dokumentų sąrašas su tekstu, struktūra ir FRAGMENTAIS (chunk'ais),
 * kurių kiekvienas turi vietą (puslapis / pastraipa / lapas / eilutė), kad
 * atsakymai galėtų cituoti tiksliai.
 *
 * Saugumo ribos (žr. docs/tiekejams/architecture.md):
 *   - MAX_FAILO_B, MAX_ISSKLEISTA_B, MAX_FAILU - apsauga nuo ZIP bombų;
 *   - ZIP kelių normalizacija (zip slip: "../" ir absoliutūs keliai atmetami);
 *   - vykdomieji / nežinomi plėtiniai NEatidaromi, tik pažymimi 'unsupported';
 *   - įdėtiniai ZIP išskleidžiami tik iki GYLIS lygių;
 *   - dokumentų tekstas laikomas NEPATIKIMU turiniu: nurodymai modeliui jame
 *     niekada nevykdomi (žr. asistentas.js - sanitizacija ir sisteminė taisyklė).
 *
 * Bibliotekos (visos jau naudojamos kituose G-Procure moduliuose, iš CDN):
 *   pdfjsLib (pdf.js 3.11.174), mammoth (1.8), XLSX (0.18.5), JSZip (3.10.1).
 * Niekas nesaugoma serveryje. Viskas lieka naudotojo naršyklėje.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var MAX_FAILO_B       = 60 * 1024 * 1024;   // vienas failas iki 60 MB
  var MAX_ISSKLEISTA_B  = 250 * 1024 * 1024;  // visas išskleistas paketas
  var MAX_FAILU         = 200;                // failų skaičius pakete
  var GYLIS             = 2;                  // įdėtinių ZIP lygiai
  var CHUNK_ZODZIU      = 180;                // fragmento dydis žodžiais
  var CHUNK_PERDANGA    = 30;                 // persidengimas žodžiais

  var LEIDZIAMI = { pdf:1, docx:1, xlsx:1, xlsm:1, xml:1, html:1, htm:1, txt:1, zip:1, csv:1, md:1 };
  var DRAUDZIAMI = { exe:1, bat:1, cmd:1, com:1, scr:1, msi:1, js:1, vbs:1, ps1:1, sh:1, jar:1, dll:1, app:1 };

  // ---------------------------------------------------------------------------
  // Pranešimai naudotojui (LT/EN) - tekstai gyvena čia, o ne UI sluoksnyje
  // ---------------------------------------------------------------------------
  var PRAN = {
    lt: { skenuotas: "PDF be teksto sluoksnio (skenuotas) - reikalingas OCR; tekstas neišgautas.", beTeksto: "{n} psl. be teksto sluoksnio.",
          docxStrukt: "DOCX struktūra neperskaityta ({e}), naudojamas grynas tekstas.", xml: "XML neišanalizuotas, imamas kaip tekstas.",
          vykdomasis: "Vykdomasis / scenarijaus failas neatidaromas saugumo sumetimais.", formatas: "Formatas .{e} nepalaikomas MVP (palaikoma: PDF, DOCX, XLSX, XML, HTML, TXT, ZIP).",
          neperskaityta: "Neperskaityta: {e}", kelias: "Nesaugus kelias archyve - praleista.", failuLimitas: "Viršytas failų limitas ({n}) - praleista.",
          dydis: "Viršytas dydžio limitas - praleista (apsauga nuo ZIP bombų).", gilus: "Per gilus įdėtinis archyvas - neišskleistas.", perDidelis: "Failas per didelis (riba {mb} MB).",
          bendrasLimitas: "Viršyta bendra paketo riba - praleista." },
    en: { skenuotas: "PDF without a text layer (scanned) - OCR required; text not extracted.", beTeksto: "{n} page(s) without a text layer.",
          docxStrukt: "DOCX structure not read ({e}), plain text used.", xml: "XML not parsed, taken as text.",
          vykdomasis: "Executable / script file is not opened for security reasons.", formatas: "Format .{e} is not supported in the MVP (supported: PDF, DOCX, XLSX, XML, HTML, TXT, ZIP).",
          neperskaityta: "Not read: {e}", kelias: "Unsafe path in archive - skipped.", failuLimitas: "File limit exceeded ({n}) - skipped.",
          dydis: "Size limit exceeded - skipped (ZIP bomb protection).", gilus: "Nested archive too deep - not extracted.", perDidelis: "File too large (limit {mb} MB).",
          bendrasLimitas: "Total package limit exceeded - skipped." }
  };
  function pran(lang, key, vars) {
    var t = (PRAN[lang] || PRAN.lt)[key] || key;
    Object.keys(vars || {}).forEach(function (v) { t = t.replace("{" + v + "}", String(vars[v])); });
    return t;
  }

  // ---------------------------------------------------------------------------
  // Pagalbinės
  // ---------------------------------------------------------------------------
  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(String(name || ""));
    return m ? m[1].toLowerCase() : "";
  }
  function norm(s) {
    return String(s || "").replace(/\r\n?/g, "\n").replace(/[ \t ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  // SHA-256 per WebCrypto (patikimumas: dokumento tapatybė ir versijų atpažinimas)
  async function sha256(buf) {
    try {
      var h = await crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    } catch (e) { return ""; }
  }
  // ZIP kelio saugumas: atmetam absoliučius, "..", disko raides
  // Zip slip: atmetami tik "..", kaip atskiras kelio SEGMENTAS (ne "Priedas Nr. 1..pdf"),
  // absoliutūs keliai ir disko raidės. JSZip 3.8+ "../" pats normalizuoja, tad
  // tikrinamas ir unsafeOriginalName (kad įtartinas įrašas būtų pažymėtas).
  function saugusKelias(p) {
    var s = String(p || "").replace(/\\/g, "/").replace(/[\r\n\t\u0000-\u001f]+/g, " ");
    if (!s || /(^|\/)\.\.(\/|$)/.test(s) || s.charAt(0) === "/" || /^[a-zA-Z]:/.test(s)) return null;
    return s;
  }
  // LT failų vardai ZIP'e: dalis įrašų be UTF-8 vėliavėlės (CP775/1257).
  function decodeFileName(bytes) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch (e) {
      try { return new TextDecoder("windows-1257").decode(bytes); }
      catch (e2) { return new TextDecoder("latin1").decode(bytes); }
    }
  }
  function kalba(text) {
    var t = String(text || "").slice(0, 4000).toLowerCase();
    var lt = (t.match(/\b(ir|arba|pirkimo|tiekėjas|tiekėjo|pasiūlym|sąlyg|dalis|reikalavim)\b/g) || []).length;
    var en = (t.match(/\b(the|and|tender|supplier|procurement|shall|requirements|contract)\b/g) || []).length;
    if (lt === 0 && en === 0) return "other";
    if (lt >= en * 1.5) return "lt";
    if (en >= lt * 1.5) return "en";
    return "other";
  }

  // ---------------------------------------------------------------------------
  // S4: išskleidimas su riba SRAUTO METU. Antraštės uncompressedSize - tik pigi
  // išankstinė patikra (ją galima suklastoti); tikroji riba - baitų skaitiklis.
  // Riba viršijama -> srautas stabdomas, sukauptos dalys išmetamos, grąžinama null.
  // ---------------------------------------------------------------------------
  function issklekRibotai(entry, riba) {
    var u = entry && entry._data && entry._data.uncompressedSize;
    if (typeof u === "number" && u > riba) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var dalys = [], viso = 0, baigta = false, st;
      try { st = entry.internalStream("uint8array"); } catch (e) { resolve(null); return; }
      st.on("data", function (chunk) {
        if (baigta) return;
        viso += chunk.length;
        if (viso > riba) { baigta = true; dalys = null; try { st.pause(); } catch (e) {} resolve(null); return; }
        dalys.push(chunk);
      });
      st.on("error", function () { if (!baigta) { baigta = true; resolve(null); } });
      st.on("end", function () {
        if (baigta) return; baigta = true;
        var out = new Uint8Array(viso), o = 0;
        dalys.forEach(function (d) { out.set(d, o); o += d.length; });
        resolve(out.buffer);
      });
      st.resume();
    });
  }
  // DOCX/XLSX yra ZIP konteineriai - jų vidinių įrašų suma tikrinama prieš skaitant
  async function konteinerioDydis(buf) {
    try {
      var zip = await global.JSZip.loadAsync(buf);
      var suma = 0;
      Object.keys(zip.files).forEach(function (n) { var f = zip.files[n]; if (!f.dir && f._data && typeof f._data.uncompressedSize === "number") suma += f._data.uncompressedSize; });
      return { zip: zip, suma: suma };
    } catch (e) { return { zip: null, suma: 0 }; }
  }

  // ---------------------------------------------------------------------------
  // Versijų euristikos (LITGRID praktika CVP IS, patikrinta 2026-09-02):
  // paaiškinimai ir pakeitimai įkeliami kaip NAUJI dokumentai su "Papildymo ID"
  // ir data pavadinime; pakeistos sąlygos - "AKTUALI REDAKCIJA <data>".
  // ---------------------------------------------------------------------------
  function versijosPozymiai(name) {
    var n = String(name || "");
    var out = { aktualiRedakcija: /aktuali\s*redakcij/i.test(n), paaiskinimas: /atsakym|paaiškin|paaiskin|patikslin|klausim/i.test(n),
                pratesimas: /prat[eę]s/i.test(n), pakeitimas: /pakeit|pakeis/i.test(n), data: null };
    var d = /(20\d{2})[ ._-]?(\d{2})[ ._-]?(\d{2})/.exec(n);
    if (d) out.data = d[1] + "-" + d[2] + "-" + d[3];
    return out;
  }
  // Dokumento rūšis pagal pavadinimą (tik pagalbinė žyma, ne teisinis faktas)
  function rusis(name) {
    var n = String(name || "").toLowerCase();
    if (/ebvpd|espd/.test(n)) return "EBVPD";
    if (/special|sps\b|sps[ _.]/.test(n)) return "SPS";
    if (/bendr|bps\b|bps[ _.]/.test(n)) return "BPS";
    if (/technin|specifik|\bts\b/.test(n)) return "TS";
    if (/sutart/.test(n)) return "Sutartis";
    if (/pasi[uū]lym.*form|forma/.test(n)) return "Forma";
    if (/skelbim|notice/.test(n)) return "Skelbimas";
    if (/atsakym|paaiškin|paaiskin|klausim/.test(n)) return "Paaiškinimas";
    if (/pried/.test(n)) return "Priedas";
    return "Kita";
  }

  // ---------------------------------------------------------------------------
  // Teksto ištraukimas pagal formatą. Kiekviena funkcija grąžina
  // { blocks: [{loc:{...}, text}], warnings: [] } - blokai su vieta.
  // ---------------------------------------------------------------------------
  // pdf.js grąžina tekstą gabalais (TJ pozicionavimas, kerningas): tas pats žodis dažnai
  // ateina kaip "nurod" + "yto", "dien" + "ų", "1" + "3". Sena versija visus gabalus
  // jungė tarpu, tad tekste (paieškoje, citatų patikroje, rodomose citatose) atsirasdavo
  // klaidingi tarpai žodžių viduje (patikrinta 2026-09-02 su tikru CVP IS SPS PDF).
  // Dabar tarpas dedamas tik kai geometrinis tarpas tarp gabalų viršija ~0,15 šrifto
  // dydžio (arba gabalas pats baigiasi / prasideda tarpu; be pločio - kaip anksčiau).
  // Eilutės grupuojamos pagal y su tolerancija (indeksai, nuorodos, nedideli poslinkiai).
  function sujunkEilute(items) {
    items.sort(function (a, b) { return a.x - b.x; });
    var s = "";
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (i > 0) {
        var pr = items[i - 1];
        var gap = it.x - (pr.x + pr.w);
        var riba = Math.max(0.15 * (it.fs || pr.fs || 10), 0.8);
        var jauTarpas = /\s$/.test(s) || /^\s/.test(it.s);
        if (!jauTarpas && (!pr.w || gap > riba)) s += " ";
      }
      s += it.s;
    }
    return s;
  }
  function pdfTekstas(items) {
    var lines = [];
    (items || []).forEach(function (it) {
      if (!it || !it.str) return;
      var tr = it.transform || [1, 0, 0, 1, 0, 0];
      var fs = Math.sqrt(tr[0] * tr[0] + tr[1] * tr[1]) || Math.abs(tr[3]) || 10;
      var y = tr[5], x = tr[4], line = null;
      // Ta pati eilutė - y skiriasi ne daugiau kaip ~1/3 šrifto (tikrinamos paskutinės 60 eil.)
      for (var i = lines.length - 1, k = 0; i >= 0 && k < 60; i--, k++) {
        if (Math.abs(lines[i].y - y) <= Math.max(2, 0.35 * fs)) { line = lines[i]; break; }
      }
      if (!line) { line = { y: y, items: [] }; lines.push(line); }
      line.items.push({ x: x, w: it.width || 0, fs: fs, s: it.str });
    });
    lines.sort(function (a, b) { return b.y - a.y; });
    return lines.map(function (l) { return sujunkEilute(l.items); }).join("\n");
  }

  async function isPdf(buf, lang) {
    if (!global.pdfjsLib) throw new Error("pdf.js neužkrauta");
    // isEvalSupported:false - gynyba gilyn (CVE-2024-4367 kelias per šriftus čia
    // nevykdomas, nes kviečiamas tik getTextContent, bet užraktas nieko nekainuoja)
    var pdf = await global.pdfjsLib.getDocument({ data: buf, isEvalSupported: false }).promise;
    var blocks = [], warnings = [], tuscių = 0;
    for (var pn = 1; pn <= pdf.numPages; pn++) {
      var page = await pdf.getPage(pn);
      var tc = await page.getTextContent();
      var txt = norm(pdfTekstas(tc.items));
      if (!txt) tuscių++;
      blocks.push({ loc: { page: pn }, text: txt });
    }
    if (pdf.numPages && tuscių === pdf.numPages) warnings.push(pran(lang, "skenuotas"));
    else if (tuscių > 0) warnings.push(pran(lang, "beTeksto", { n: tuscių }));
    return { blocks: blocks, warnings: warnings, pages: pdf.numPages };
  }

  async function isDocx(buf, lang) {
    // Struktūra iš word/document.xml (pastraipos + lentelių langeliai) - tikslesnė
    // citata nei mammoth "raw text". mammoth lieka atsarginiu keliu.
    var blocks = [], warnings = [];
    var kont = await konteinerioDydis(buf);
    if (kont.suma > MAX_FAILO_B) throw new Error(pran(lang, "dydis"));
    try {
      var zip = kont.zip || await global.JSZip.loadAsync(buf);
      var f = zip.file("word/document.xml");
      if (!f) throw new Error("nėra word/document.xml");
      var xmlBuf = await issklekRibotai(f, MAX_FAILO_B);
      if (!xmlBuf) throw new Error(pran(lang, "dydis"));
      var xml = new TextDecoder("utf-8").decode(xmlBuf);
      var doc = new DOMParser().parseFromString(xml, "application/xml");
      if (doc.getElementsByTagName("parsererror").length) throw new Error("XML klaida");
      var NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
      var body = doc.getElementsByTagNameNS(NS, "body")[0];
      if (!body) throw new Error("nėra body");
      var pi = 0, ti = 0;
      // Einam per vaikus: pastraipos ir lentelės (lentelėje - eilutės kaip blokai)
      Array.from(body.childNodes).forEach(function (n) {
        if (n.localName === "p") {
          var t = norm(Array.from(n.getElementsByTagNameNS(NS, "t")).map(function (x) { return x.textContent; }).join(""));
          pi++;
          if (t) blocks.push({ loc: { para: pi }, text: t });
        } else if (n.localName === "tbl") {
          ti++;
          var rows = Array.from(n.getElementsByTagNameNS(NS, "tr"));
          rows.forEach(function (tr, ri) {
            var cells = Array.from(tr.getElementsByTagNameNS(NS, "tc")).map(function (tc) {
              return norm(Array.from(tc.getElementsByTagNameNS(NS, "t")).map(function (x) { return x.textContent; }).join(""));
            }).filter(Boolean);
            if (cells.length) blocks.push({ loc: { table: ti, row: ri + 1 }, text: cells.join(" | ") });
          });
        }
      });
    } catch (e) {
      if (kont.suma > MAX_FAILO_B) throw e;
      warnings.push(pran(lang, "docxStrukt", { e: e.message }));
      if (global.mammoth) {
        var res = await global.mammoth.extractRawText({ arrayBuffer: buf });
        norm(res.value || "").split(/\n{2,}/).forEach(function (t, i) { if (t.trim()) blocks.push({ loc: { para: i + 1 }, text: t.trim() }); });
      } else throw e;
    }
    return { blocks: blocks, warnings: warnings };
  }

  async function isXlsx(buf, lang) {
    if (!global.XLSX) throw new Error("XLSX neužkrauta");
    // Antraščių suma prieš SheetJS (jis turi savą inflate): suklastotos antraštės
    // liekamoji rizika priimama sąmoningai - failas vis tiek ribotas MAX_FAILO_B.
    var kont = await konteinerioDydis(buf);
    if (kont.suma > MAX_FAILO_B) throw new Error(pran(lang, "dydis"));
    var wb = global.XLSX.read(buf, { type: "array", cellDates: true });
    var blocks = [], warnings = [];
    wb.SheetNames.forEach(function (sn) {
      var aoa = global.XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "" });
      aoa.forEach(function (row, ri) {
        var t = row.map(function (c) { return String(c == null ? "" : c).trim(); }).filter(Boolean).join(" | ");
        if (t) blocks.push({ loc: { sheet: sn, row: ri + 1 }, text: t });
      });
    });
    return { blocks: blocks, warnings: warnings };
  }

  function isXml(text, lang) {
    var doc = new DOMParser().parseFromString(text, "application/xml");
    var blocks = [], warnings = [];
    if (doc.getElementsByTagName("parsererror").length) {
      warnings.push(pran(lang, "xml"));
      return isTxt(text);
    }
    // EBVPD (espd-request.xml) ir kiti: elementų tekstai su keliu
    var i = 0;
    (function walk(node, path) {
      Array.from(node.children).forEach(function (ch) {
        var p = path + "/" + ch.localName;
        var own = Array.from(ch.childNodes).filter(function (c) { return c.nodeType === 3; }).map(function (c) { return c.textContent; }).join(" ");
        own = norm(own);
        if (own) { i++; blocks.push({ loc: { xpath: p, n: i }, text: own }); }
        walk(ch, p);
      });
    })(doc.documentElement, "");
    return { blocks: blocks, warnings: warnings };
  }

  function isHtml(text) {
    var doc = new DOMParser().parseFromString(text, "text/html");
    Array.from(doc.querySelectorAll("script,style,noscript")).forEach(function (n) { n.remove(); });
    var blocks = [];
    var i = 0;
    Array.from(doc.body ? doc.body.querySelectorAll("h1,h2,h3,h4,p,li,td,th,pre") : []).forEach(function (n) {
      var t = norm(n.textContent); if (t) { i++; blocks.push({ loc: { para: i }, text: t }); }
    });
    if (!blocks.length) return isTxt(norm(doc.body ? doc.body.textContent : text));
    return { blocks: blocks, warnings: [] };
  }

  function isTxt(text) {
    var blocks = [];
    norm(text).split(/\n{2,}/).forEach(function (t, i) { if (t.trim()) blocks.push({ loc: { para: i + 1 }, text: t.trim() }); });
    return { blocks: blocks, warnings: [] };
  }

  // ---------------------------------------------------------------------------
  // Fragmentai (chunk'ai) su vieta. Punkto numeris (pvz. "4.2.", "12.3.1") iš
  // pastraipos pradžios išsaugomas atskirai - citatoms.
  // ---------------------------------------------------------------------------
  function punktas(text) {
    var m = /^\s*(\d{1,3}(?:\.\d{1,3}){0,4})\.?\s/.exec(text);
    return m ? m[1] : null;
  }
  function fragmentai(doc) {
    var out = [], id = 0;
    var buf = [], bufLoc = null, bufPunktas = null, words = 0;
    function flush() {
      if (!buf.length) return;
      id++;
      out.push({ id: doc.id + "#" + id, docId: doc.id, loc: bufLoc, punktas: bufPunktas, text: buf.join("\n") });
      // perdanga: paliekam paskutinius žodžius
      var tail = buf.join(" ").split(/\s+/).slice(-CHUNK_PERDANGA).join(" ");
      buf = tail ? [tail] : []; words = tail ? CHUNK_PERDANGA : 0; bufPunktas = null;
    }
    doc.blocks.forEach(function (b) {
      var w = b.text.split(/\s+/).length;
      if (!buf.length) { bufLoc = b.loc; bufPunktas = punktas(b.text); }
      if (words + w > CHUNK_ZODZIU && buf.length) { flush(); bufLoc = b.loc; bufPunktas = punktas(b.text); }
      // labai ilgas blokas (pvz. visas PDF puslapis) - skaidom sakiniais
      if (w > CHUNK_ZODZIU * 1.5) {
        var sak = b.text.split(/(?<=[.;:!?])\s+/);
        var cur = [], cw = 0;
        sak.forEach(function (s) {
          var sw = s.split(/\s+/).length;
          if (cw + sw > CHUNK_ZODZIU && cur.length) { buf.push(cur.join(" ")); words += cw; flush(); bufLoc = b.loc; cur = []; cw = 0; }
          cur.push(s); cw += sw;
        });
        if (cur.length) { buf.push(cur.join(" ")); words += cw; }
      } else { buf.push(b.text); words += w; }
    });
    flush();
    return out;
  }

  // ---------------------------------------------------------------------------
  // Pagrindinis: failų sąrašas -> dokumentai
  // ---------------------------------------------------------------------------
  async function apdorokFaila(name, buf, ctx) {
    var lang = ctx.lang, e = ext(name);
    var doc = { id: "D" + (++ctx.n), name: name, ext: e, size: buf.byteLength, sha256: await sha256(buf),
                fetchedAt: new Date().toISOString(), parseStatus: "parsed", warnings: [], blocks: [], pages: null,
                rusis: rusis(name), versija: versijosPozymiai(name), language: "other", chunks: [] };
    if (DRAUDZIAMI[e]) { doc.parseStatus = "unsupported"; doc.warnings.push(pran(lang, "vykdomasis")); return doc; }
    if (!LEIDZIAMI[e]) { doc.parseStatus = "unsupported"; doc.warnings.push(pran(lang, "formatas", { e: e })); return doc; }
    try {
      var r;
      if (e === "pdf") { r = await isPdf(buf, lang); doc.pages = r.pages; }
      else if (e === "docx") r = await isDocx(buf, lang);
      else if (e === "xlsx" || e === "xlsm") r = await isXlsx(buf, lang);
      else if (e === "xml") r = isXml(new TextDecoder("utf-8").decode(buf), lang);
      else if (e === "html" || e === "htm") r = isHtml(new TextDecoder("utf-8").decode(buf));
      else r = isTxt(new TextDecoder("utf-8").decode(buf));
      doc.blocks = r.blocks; doc.warnings = doc.warnings.concat(r.warnings || []);
      if (!doc.blocks.length) doc.parseStatus = (doc.warnings.length ? "partial" : "failed");
      else if (doc.warnings.length) doc.parseStatus = "partial";
      doc.language = kalba(doc.blocks.map(function (b) { return b.text; }).join(" ").slice(0, 6000));
      doc.chunks = fragmentai(doc);
      doc.words = doc.blocks.reduce(function (a, b) { return a + b.text.split(/\s+/).length; }, 0);
    } catch (err) {
      doc.parseStatus = "failed"; doc.warnings.push(pran(lang, "neperskaityta", { e: (err && err.message ? err.message : String(err)) }));
    }
    return doc;
  }

  async function isZip(name, buf, ctx, gylis, onProgress) {
    var docs = [], lang = ctx.lang;
    var zip = await global.JSZip.loadAsync(buf, { decodeFileName: decodeFileName });
    var entries = Object.keys(zip.files).map(function (k) { return zip.files[k]; }).filter(function (f) { return !f.dir; });
    var stub = function (vardas, status, msg, size) { return { id: "D" + (++ctx.n), name: vardas, parseStatus: status, warnings: [msg], blocks: [], chunks: [], size: size || 0 }; };
    for (var i = 0; i < entries.length; i++) {
      var f = entries[i];
      var originalus = f.unsafeOriginalName || f.name;
      var kelias = saugusKelias(f.name);
      if (!kelias || !saugusKelias(originalus)) { docs.push(stub(String(originalus).replace(/[\r\n\t]+/g, " "), "failed", pran(lang, "kelias"))); continue; }
      if (/^__MACOSX\//.test(kelias) || /(^|\/)\./.test(kelias)) continue; // sisteminės šiukšlės
      if (ctx.failu >= MAX_FAILU) { docs.push(stub(kelias, "failed", pran(lang, "failuLimitas", { n: MAX_FAILU }))); continue; }
      var e = ext(kelias);
      // Riba tikrinama IŠSKLEIDŽIANT (srautu), o ne po išskleidimo
      var liko = Math.min(MAX_FAILO_B, MAX_ISSKLEISTA_B - ctx.baitu);
      if (liko <= 0) { docs.push(stub(kelias, "failed", pran(lang, "bendrasLimitas"))); continue; }
      var ab = await issklekRibotai(f, liko);
      ctx.failu++;
      if (!ab) { docs.push(stub(kelias, "failed", pran(lang, "dydis"), (f._data && f._data.uncompressedSize) || 0)); continue; }
      ctx.baitu += ab.byteLength;
      if (e === "zip") {
        if (gylis >= GYLIS) { docs.push(stub(kelias, "unsupported", pran(lang, "gilus"), ab.byteLength)); continue; }
        // Įdėtinio archyvo dokumentai gauna pilną kelią (išorinis › vidinis › failas) vieną kartą
        var inner = await isZip((name ? name + " › " : "") + kelias, ab, ctx, gylis + 1, onProgress);
        docs = docs.concat(inner);
      } else {
        if (onProgress) onProgress(kelias);
        var d = await apdorokFaila(kelias, ab, ctx);
        d.name = (name ? name + " › " : "") + kelias;
        docs.push(d);
      }
    }
    return docs;
  }

  async function apdorok(files, onProgress, lang) {
    var ctx = { n: 0, failu: 0, baitu: 0, lang: lang === "en" ? "en" : "lt" };
    var docs = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.size > MAX_FAILO_B) { docs.push({ id: "D" + (++ctx.n), name: f.name, parseStatus: "failed", warnings: [pran(ctx.lang, "perDidelis", { mb: Math.round(MAX_FAILO_B / 1048576) })], blocks: [], chunks: [], size: f.size }); continue; }
      if (ctx.failu >= MAX_FAILU) { docs.push({ id: "D" + (++ctx.n), name: f.name, parseStatus: "failed", warnings: [pran(ctx.lang, "failuLimitas", { n: MAX_FAILU })], blocks: [], chunks: [], size: f.size }); continue; }
      if (ctx.baitu + f.size > MAX_ISSKLEISTA_B) { docs.push({ id: "D" + (++ctx.n), name: f.name, parseStatus: "failed", warnings: [pran(ctx.lang, "bendrasLimitas")], blocks: [], chunks: [], size: f.size }); continue; }
      var buf = await f.arrayBuffer();
      ctx.failu++; ctx.baitu += buf.byteLength;
      if (ext(f.name) === "zip") docs = docs.concat(await isZip(f.name, buf, ctx, 0, onProgress));
      else { if (onProgress) onProgress(f.name); docs.push(await apdorokFaila(f.name, buf, ctx)); }
    }
    // Komplektiškumas: visi perskaityti / iš dalies / nepavyko
    var parsed = docs.filter(function (d) { return d.parseStatus === "parsed"; }).length;
    var completeness = docs.length === 0 ? "failed" : (parsed === docs.length ? "complete" : (parsed > 0 ? "partial" : "failed"));
    return { docs: docs, completeness: completeness, fetchedAt: new Date().toISOString() };
  }

  // Dokumento vietos etiketė citatoms
  function vieta(loc, lang) {
    if (!loc) return "";
    var L = lang === "en";
    if (loc.page) return (L ? "p. " : "psl. ") + loc.page;
    if (loc.table) return (L ? "table " : "lentelė ") + loc.table + (L ? ", row " : ", eil. ") + loc.row;
    if (loc.sheet) return (L ? "sheet " : "lapas ") + loc.sheet + (L ? ", row " : ", eil. ") + loc.row;
    if (loc.para) return (L ? "para. " : "pastr. ") + loc.para;
    if (loc.xpath) return loc.xpath;
    return "";
  }

  global.GP_DOK = {
    version: "0.2.0",
    apdorok: apdorok,
    fragmentai: fragmentai,
    vieta: vieta,
    versijosPozymiai: versijosPozymiai,
    rusis: rusis,
    pdfTekstas: pdfTekstas,
    punktas: punktas,
    limits: { MAX_FAILO_B: MAX_FAILO_B, MAX_ISSKLEISTA_B: MAX_ISSKLEISTA_B, MAX_FAILU: MAX_FAILU, GYLIS: GYLIS, CHUNK_ZODZIU: CHUNK_ZODZIU },
    _internal: { isDocx: isDocx, isXml: isXml, isHtml: isHtml, isTxt: isTxt, isXlsx: isXlsx, saugusKelias: saugusKelias, decodeFileName: decodeFileName, kalba: kalba, issklekRibotai: issklekRibotai, konteinerioDydis: konteinerioDydis, pran: pran }
  };
})(typeof window !== "undefined" ? window : this);
