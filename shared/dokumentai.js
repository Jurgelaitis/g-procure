/* ============================================================================
 * G-Procure  shared/dokumentai.js
 * ----------------------------------------------------------------------------
 * Dokumentų teksto skaitymas NARŠYKLĖJE (window.GP_DOK). Vienas failas
 * visiems moduliams: PP-tiekejams (oficialus CVP IS dokumentų paketas) ir
 * PP-salygos (atsakymų pasiūlymų šaltiniai). Iki 2026-09-25 gyveno
 * PP-tiekejams/ - perkeltas, kad antras modulis neturėtų savos kopijos.
 * Keičiant šį failą - paleisk PP-tiekejams/testai.html IR PP-salygos/testai.html.
 *
 * Įėjimas: File objektai (ZIP / PDF / DOCX / XLSX / XML / HTML / TXT).
 * Išėjimas: dokumentų sąrašas su tekstu, struktūra ir FRAGMENTAIS (chunk'ais),
 * kurių kiekvienas turi vietą (puslapis / pastraipa / lapas / eilutė), kad
 * atsakymai galėtų cituoti tiksliai.
 *
 * Saugumo ribos (žr. docs/tiekejams/architecture.md):
 *   - MAX_FAILO_B, MAX_ISSKLEISTA_B, MAX_DARBO_B, MAX_FAILU - apsauga nuo ZIP bombų;
 *   - ZIP kelių normalizacija (zip slip: "../" ir absoliutūs keliai atmetami);
 *   - vykdomieji / nežinomi plėtiniai NEatidaromi, tik pažymimi 'unsupported';
 *   - įdėtiniai ZIP ir el. parašo konteineriai (ADOC, ASiC) išskleidžiami tik iki GYLIS lygių;
 *   - dokumentų tekstas laikomas NEPATIKIMU turiniu: nurodymai modeliui jame
 *     niekada nevykdomi (žr. asistentas.js - sanitizacija ir sisteminė taisyklė).
 *
 * Bibliotekos (puslapis jas jungia iš shared/vendor/, žr. shared/vendor/bibliotekos.json):
 *   pdfjsLib (pdf.js 3.11.174), mammoth (1.13.0), XLSX (SheetJS 0.20.3), JSZip (3.10.1).
 * Niekas nesaugoma serveryje. Viskas lieka naudotojo naršyklėje.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  // Ribos (2026-10-17, patikra su 18 tikrų LITGRID CVP IS paketų): iki tol 60 MB riba galiojo ir archyvui, todėl 66 MB paketas
  // nebuvo skaitomas visai, o įdėtinis archyvas trečiame lygyje - neišskleidžiamas (paketuose archyvai įdėti iki 6 lygių:
  // CVP IS paketas › pirkimo dokumentai › TS su priedais › priedėliai › ...). Dabar dokumentas - iki 60 MB, archyvas - iki 250 MB,
  // visų dokumentų suma - iki 250 MB, o viskas, ką tenka išskleisti (dokumentai ir įdėtiniai archyvai, kurių turinys
  // skaičiuojamas antrą kartą), - iki 600 MB (išmatuota: didžiausias paketas - 284 MB).
  var MAX_FAILO_B       = 60 * 1024 * 1024;   // vienas dokumentas iki 60 MB
  var MAX_ISSKLEISTA_B  = 250 * 1024 * 1024;  // visų paketo dokumentų suma; ir vienas archyvas
  var MAX_DARBO_B       = 600 * 1024 * 1024;  // viskas, kas išskleidžiama: dokumentai ir įdėtiniai archyvai
  var MAX_FAILU         = 200;                // failų skaičius pakete
  var GYLIS             = 8;                  // įdėtinių archyvų lygiai
  var CHUNK_ZODZIU      = 180;                // fragmento dydis žodžiais
  var CHUNK_PERDANGA    = 30;                 // persidengimas žodžiais
  var CHUNK_SIMBOLIU    = 1400;               // fragmento riba simboliais = kiek fragmento mato DI (žr. fragmentai())
  var PERDANGA_SIMBOLIU = 200;                // persidengimo riba simboliais

  var LEIDZIAMI = { pdf:1, docx:1, odt:1, xlsx:1, xlsm:1, xml:1, html:1, htm:1, txt:1, zip:1, csv:1, md:1 };
  var DRAUDZIAMI = { exe:1, bat:1, cmd:1, com:1, scr:1, msi:1, js:1, vbs:1, ps1:1, sh:1, jar:1, dll:1, app:1 };
  // El. parašo konteineriai - ZIP su dokumentu ir parašu: ADOC (Lietuvos vyriausiojo archyvaro specifikacija; CVP IS paketuose -
  // pasirašytos išvados ir ataskaitos), ASiC-E ir ASiC-S (ETSI EN 319 162: .asice / .sce, .asics / .scs), BDOC, EDOC.
  // Skaitomi dokumentai; parašai ir metaduomenys (mimetype, META-INF/, metadata/) praleidžiami, parašo galiojimas netikrinamas.
  var KONTEINERIAI = { adoc:1, asice:1, sce:1, asics:1, scs:1, bdoc:1, edoc:1 };
  // Archyvai, kurių naršyklė išskleisti negali (2026-10-17: tikrame pakete pirkimo sąlygos buvo vienas 63 MB .7z failas)
  var KITI_ARCHYVAI = { "7z":1, rar:1, tar:1, gz:1, tgz:1, bz2:1, xz:1, zst:1, cab:1, arj:1 };
  // Seni biuro formatai - kuo pakeisti (2026-10-17: tikruose paketuose - SS priedas .DOC)
  var SENI = { doc: "DOCX", xls: "XLSX", rtf: "DOCX" };
  function archyvas(e) { return e === "zip" || !!KONTEINERIAI[e]; }

  // ---------------------------------------------------------------------------
  // Pranešimai naudotojui (LT/EN) - tekstai gyvena čia, o ne UI sluoksnyje
  // ---------------------------------------------------------------------------
  var PRAN = {
    lt: { skenuotas: "PDF be teksto sluoksnio (skenuotas) - reikalingas OCR; tekstas neišgautas.", beTeksto: "{n} psl. be teksto sluoksnio.",
          docxStrukt: "DOCX struktūra neperskaityta ({e}), naudojamas grynas tekstas.", xml: "XML neišanalizuotas, imamas kaip tekstas.",
          vykdomasis: "Vykdomasis / scenarijaus failas neatidaromas saugumo sumetimais.", formatas: "Formatas .{e} nepalaikomas (palaikoma: PDF, DOCX, ODT, XLSX, XML, HTML, TXT, ZIP ir el. parašo konteineriai ADOC, ASiC). Atidarykite jį atskira programa.",
          archyvasKitas: "Archyvas .{e} naršyklėje neišskleidžiamas. Išskleiskite jį kompiuteryje ir įkelkite failus (arba ZIP archyvą).",
          senas: "Senas formatas .{e} naršyklėje neskaitomas. Atidarykite jį programa ir, jei reikia, išsaugokite kaip {naujas} arba PDF.",
          konteinerisTuscias: "El. parašo konteineryje dokumento nerasta.",
          neperskaityta: "Neperskaityta: {e}", kelias: "Nesaugus kelias archyve - praleista.", failuLimitas: "Viršytas failų limitas ({n}) - praleista.",
          dydis: "Viršytas dydžio limitas - praleista (apsauga nuo ZIP bombų).", gilus: "Per gilus įdėtinis archyvas - neišskleistas.", perDidelis: "Failas per didelis (riba {mb} MB).",
          bendrasLimitas: "Viršyta bendra paketo riba - praleista." },
    en: { skenuotas: "PDF without a text layer (scanned) - OCR required; text not extracted.", beTeksto: "{n} page(s) without a text layer.",
          docxStrukt: "DOCX structure not read ({e}), plain text used.", xml: "XML not parsed, taken as text.",
          vykdomasis: "Executable / script file is not opened for security reasons.", formatas: "Format .{e} is not supported (supported: PDF, DOCX, ODT, XLSX, XML, HTML, TXT, ZIP and e-signature containers ADOC, ASiC). Open it with a separate application.",
          archyvasKitas: "Archive .{e} cannot be extracted in the browser. Extract it on your computer and upload the files (or a ZIP archive).",
          senas: "Legacy format .{e} cannot be read in the browser. Open it in its application and, if needed, save it as {naujas} or PDF.",
          konteinerisTuscias: "No document found in the e-signature container.",
          neperskaityta: "Not read: {e}", kelias: "Unsafe path in archive - skipped.", failuLimitas: "File limit exceeded ({n}) - skipped.",
          dydis: "Size limit exceeded - skipped (ZIP bomb protection).", gilus: "Nested archive too deep - not extracted.", perDidelis: "File too large (limit {mb} MB).",
          bendrasLimitas: "Total package limit exceeded - skipped." }
  };
  // Biblioteka neįsikėlė (nėra ryšio, o ji dar neišsaugota darbui be interneto): priežastis žmogui iš shared/bibliotekos.js,
  // ne „Cannot read properties of undefined (reading 'loadAsync')“ (2026-09-28); be jo - trumpas tekstas
  function reikia(vardas, pav) {
    if (global[vardas]) return;
    if (global.GP_BIBLIOTEKOS) global.GP_BIBLIOTEKOS.reikia(vardas, pav);
    throw new Error(pav + " neįkelta");
  }
  var ZIP_PAV = "JSZip (DOCX, ODT, XLSX, ZIP)";
  function pran(lang, key, vars) {
    var t = (PRAN[lang] || PRAN.lt)[key] || key;
    // Funkcija, ne eilutė: failo vardas ar klaidos tekstas su „$&“, „$'“, „$$“ kitaip būtų keičiamas (String.replace šablonai)
    Object.keys(vars || {}).forEach(function (v) { var r = String(vars[v]); t = t.replace("{" + v + "}", function () { return r; }); });
    return t;
  }
  // Kodėl failas neskaitomas - pagal plėtinį (vykdomasis, kitas archyvas, senas formatas, kitas)
  function netinkamas(lang, e) {
    if (DRAUDZIAMI[e]) return pran(lang, "vykdomasis");
    if (KITI_ARCHYVAI[e]) return pran(lang, "archyvasKitas", { e: e });
    if (SENI[e]) return pran(lang, "senas", { e: e, naujas: SENI[e] });
    return pran(lang, "formatas", { e: e });
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
    // Kamienai pasiūlym-, sąlyg-, reikalavim- - su bet kokia galūne. JS \b lietuviškų raidžių nelaiko žodžio dalimi, tad iki
    // 2026-09-28 „pasiūlymas“, „sąlygos“, „reikalavimai“ nesiskaitė ir dvikalbiai LT / EN dokumentai būdavo žymimi „EN“
    // (4 tikri LITGRID paketai: 11 iš 174). Be lookbehind - jo nepalaiko senesnis Safari.
    var lt = (t.match(/(?:^|[^\p{L}\p{N}])(ir|arba|pirkimo|tiekėjas|tiekėjo|pasiūlym\p{L}*|sąlyg\p{L}*|dalis|reikalavim\p{L}*)(?![\p{L}\p{N}])/gu) || []).length;
    var en = (t.match(/(?:^|[^\p{L}\p{N}])(the|and|tender|supplier|procurement|shall|requirements|contract)(?![\p{L}\p{N}])/gu) || []).length;
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
    // „aktuali versija“ - irgi aktuali redakcija (2026-10-22, Amber Grid paketas: „Pirkimo dokumentai (aktuali versija 10.12)“)
    var out = { aktualiRedakcija: /aktuali\s*(redakcij|versij)/i.test(n), paaiskinimas: /atsakym|paaiškin|paaiskin|patikslin|klausim/i.test(n),
                pratesimas: /prat[eę]s/i.test(n), pakeitimas: /pakeit|pakeis/i.test(n), data: null };
    var d = /(20\d{2})[ ._-]?(\d{2})[ ._-]?(\d{2})/.exec(n);
    if (d) out.data = d[1] + "-" + d[2] + "-" + d[3];
    return out;
  }
  // Dokumento rūšis pagal pavadinimą (tik pagalbinė žyma, ne teisinis faktas).
  // Tikrinamas TIK failo vardas: LITGRID paketuose aplankas vadinasi „Pirkimo dokumentai
  // paskelbimui", ir kai buvo tikrinamas visas kelias, beveik kiekvienas priedas tapdavo
  // „Skelbimu" (rangas 3 metaduomenyse) - patikrinta 2026-09-22 su keturiais tikrais
  // CVP IS paketais. Sutarties sąlygos (BSS/SSS) atskiriamos nuo pirkimo sąlygų (BPS/SPS):
  // tiekėjui tai skirtingi dalykai, o metaduomenims - skirtingi šaltiniai.
  function rusis(name) {
    // apatiniai brūkšniai - kaip tarpai („0_Bendrosios_sutarties_sąlygos.docx“; 2026-10-22, B4 - Amber Grid paketas)
    var n = String(name || "").split(" \u203a ").pop().split("/").pop().toLowerCase().replace(/_+/g, " ");
    // SPS ar BPS priedo failas („SPS 3 priedas Techninė specifikacija.docx“, „SPS 1 priedas Pirminio_Galutinio pasiūlymo forma.docx“ -
    // Amber Grid 2026-10-22): rūšis pagal likusį pavadinimą, ne „SPS“ (iki tol techninė specifikacija, formos ir sutarties projektas
    // tapdavo pirkimo sąlygomis ir metaduomenims svėrė kaip SPS); be kitų požymių - priedas
    var pr = /^(?:sps|bps)\s*\d+(?:\.\d+)?\s*pried\S*\s*/.exec(n);
    if (pr) { var r = rusisPagal(n.slice(pr[0].length)); return r === "Kita" ? "Priedas" : r; }
    return rusisPagal(n);
  }
  function rusisPagal(n) {
    if (/ebvpd|espd/.test(n)) return "EBVPD";
    // CVP IS skelbimo failas pirmiau u\u017e kitas taisykles: perkan\u010di\u0173j\u0173 organizacij\u0173 skelbimai vadinasi
    // \u201e... skelbimas apie pirkim\u0105 ... - bendroji direktyva ...\u201c (2026-09-24, EPSO-G 9281765, Energy cells
    // 9614756), ir \u017eodis \u201ebendroji\u201c juos paversdavo BPS - tada pirk\u0117jas ir re\u017eimas i\u0161 skelbimo neatpa\u017e\u012fstami
    if (/skelbimas\s+apie|contract\s+notice|contest\s+notice/.test(n)) return "Skelbimas";
    // sutarties sąlygos ir be žodžio „sutarties“: „Paslaugu pirkimo-pardavimo bendrosios sąlygos“ (Energy cells 2026-10-22), rangos
    if (/sutarties\s*(specialiosios|bendrosios)?\s*s[aą]lyg|(specialiosios|bendrosios)\s+sutarties\s+s[aą]lyg|\b(bss|sss)\b|pardavimo\s+(bendrosios|specialiosios)\s+s[aą]lyg|rangos\s+(bendrosios|specialiosios)\s+s[aą]lyg/.test(n)) return "Sutartis";
    // „special“ - tik specialiosios sąlygos (ne „Specialistų sąrašo forma“; 2026-10-22, Amber Grid)
    if (/specialios|special\s+(conditions|terms|part)|sps\b|sps[ _.]/.test(n)) return "SPS";
    if (/bendr|bps\b|bps[ _.]/.test(n)) return "BPS";
    if (/technin|specifik|\bts\b|u[žz]duot/.test(n)) return "TS";
    if (/sutart/.test(n)) return "Sutartis";
    if (/klausimyn/.test(n)) return "Forma";   // rinkos konsultacijos klausimynas pildomas
    if (/atsakym|paaiškin|paaiskin|klausim/.test(n)) return "Paaiškinimas";
    // „forma" tik kaip atskiras žodis: anksčiau ji rasdavosi „transformatorių" ir
    // „informacijos" viduje, ir techniniai priedai tapdavo formomis
    if (/(^|[^a-z\u0105\u010d\u0119\u0117\u012f\u0161\u0173\u016b\u017e])form(a|os|\u0105)?([^a-z\u0105\u010d\u0119\u0117\u012f\u0161\u0173\u016b\u017e]|$)|[iį]kaini|[iį]sipareigojim|deklaracij/.test(n)) return "Forma";
    if (/skelbim|notice/.test(n)) return "Skelbimas";
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
  function pdfEilutes(items) {
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
      line.items.push({ x: x, w: it.width || 0, fs: fs, s: it.str, pasuktas: Math.abs(tr[1]) > 0.01, it: it });
    });
    lines.sort(function (a, b) { return b.y - a.y; });
    return lines;
  }
  function pdfTekstas(items) {
    return pdfEilutes(items).map(function (l) { return sujunkEilute(l.items); }).join("\n");
  }

  // ---------------------------------------------------------------------------
  // Dvikalbis PDF: stulpeliai, kiekvienas sava kalba (LITGRID sąlygos ir sutartys; lentelėse - ir LT | EN | LT | EN).
  // Skaitant eilutėmis kalbos persipina: paieška sakinio neranda, o DI citatos nepatvirtinamos. Tame pačiame puslapyje išdėstymas
  // keičiasi (tekstas dviem stulpeliais, po jo lentelė keturiais), todėl puslapis dalijamas į zonas: eilutės jungiamos, kol jas
  // visas kerta bent vienas vertikalus tarpas. Kiekvienos zonos stulpelio kalba nustatoma atskirai, o gretimi tos pačios kalbos
  // stulpeliai lieka kartu ir skaitomi eilutėmis. Puslapio kalbos atskiriamos, tik jei atskirtos jos tikrai skirtingos -
  // paprasta lentelė (visuose stulpeliuose ta pati kalba) skaitoma kaip anksčiau.
  // ---------------------------------------------------------------------------
  var STULP_LT = /(?:^|[^\p{L}])(?:ir|kad|yra|su|iš|į|arba|pagal|šio|šios|šis|kaip|kuris|kurie|dėl|bei|turi|nėra|apie|jei|jeigu|tiekėjas|pirkimo|sutarties)(?=[^\p{L}]|$)/giu;
  var STULP_EN = /(?:^|[^\p{L}])(?:the|of|and|for|shall|with|by|or|is|are|this|that|in|to)(?=[^\p{L}]|$)/giu;
  var STULP_DIAKRITIKAI = /[ąčęėįšųūž]/giu;
  var STULP_ZODZIU = 20;       // tiek žodžių - kalbą galima spręsti patikimai
  var STULP_TARPAS = 2;        // siauresnis tarpas (pt) stulpelių neskiria
  var STULP_EILUCIU = 3;       // tiek eilučių - zona pati turi stulpelius
  var STULP_KRASTAS = 40;      // tiek pt nuo zonos krašto stulpelio ribos nebūna
  var STULP_DOKUMENTUI = 3;    // dvikalbis - bent kas trečias puslapis su tekstu
  function stulpProfilis(t) {
    var z = (t.match(/\p{L}[\p{L}\p{N}-]*/gu) || []).length, raid = (t.match(/\p{L}/gu) || []).length;
    return {
      z: z,
      lt: (t.match(STULP_LT) || []).length / (z || 1),
      en: (t.match(STULP_EN) || []).length / (z || 1),
      d: (t.match(STULP_DIAKRITIKAI) || []).length / (raid || 1)
    };
  }
  function stulpKalba(p) {
    if (p.z < STULP_ZODZIU) return null;
    if (p.d >= 0.015 && p.lt >= p.en) return "lt";
    if (p.d <= 0.006 && p.en >= 0.12 && p.en >= 3 * p.lt) return "en";
    return null;
  }
  // Trumpas stulpelis (lentelės antraštė, viena eilutė): tik aiškūs požymiai, kitaip nežinoma
  function stulpKalbaTrumpo(p, maziausiai) {
    if (p.z < (maziausiai || 3)) return null;
    if (p.d >= 0.02) return "lt";
    if (p.d === 0 && p.en >= 0.1) return "en";
    return null;
  }
  // Eilutės tarpai: tarp gabalų ir abu kraštai (nuo -begalybės iki pirmo gabalo, nuo paskutinio iki +begalybės)
  function stulpEilutesTarpai(l) {
    var v = l.items.filter(function (e) { return e.s.trim() && !e.pasuktas; }).sort(function (a, b) { return a.x - b.x; });
    if (!v.length) return null;
    var tarpai = [], gal = -Infinity;
    v.forEach(function (e) {
      if (e.x - gal >= STULP_TARPAS) tarpai.push([gal, e.x]);
      gal = Math.max(gal, e.x + e.w);
    });
    tarpai.push([gal, Infinity]);
    return { tarpai: tarpai, nuo: v[0].x, iki: gal };
  }
  function stulpSankirta(a, b) {
    var out = [], i = 0, j = 0;
    while (i < a.length && j < b.length) {
      var nuo = Math.max(a[i][0], b[j][0]), iki = Math.min(a[i][1], b[j][1]);
      // Trečias narys - kiek eilučių tarpas jau išsilaikė
      if (iki - nuo >= STULP_TARPAS) out.push([nuo, iki, (a[i][2] || 1) + 1]);
      if (a[i][1] < b[j][1]) i++; else j++;
    }
    return out;
  }
  // Tarpas stulpelius skiria, tik kai abipus jo yra teksto: numerių stulpelis prie krašto - ne riba
  function stulpVidiniai(tarpai, nuo, iki) {
    return tarpai.filter(function (t) { return t[0] > nuo + STULP_KRASTAS && t[1] < iki - STULP_KRASTAS; });
  }
  // Tarpas lieka, jei eilutė jo neužstoja: ji gali siekti vieną jo kraštą (eilutės pabaiga), bet žodžių tarpas per vidurį - ne tarpas
  function stulpLieka(t, tarpai) {
    return tarpai.some(function (v) { return v[0] < t[1] && v[1] > t[0] && (v[0] <= t[0] + 0.01 || v[1] >= t[1] - 0.01); });
  }
  function stulpZonos(eilutes) {
    var zonos = [], z = null, gt = eilutes.map(stulpEilutesTarpai);
    eilutes.forEach(function (l, i) {
      var g = gt[i];
      if (!g) {   // tik tarpai ar pasuktas tekstas - lieka toje vietoje, kur yra
        if (!z) { z = { eilutes: [], tarpai: [[-Infinity, Infinity]], nuo: Infinity, iki: -Infinity }; zonos.push(z); }
        z.eilutes.push(l);
        return;
      }
      if (z) {
        var nuo = Math.min(z.nuo, g.nuo), iki = Math.max(z.iki, g.iki), bendri = stulpSankirta(z.tarpai, g.tarpai);
        var lieka = stulpVidiniai(bendri, nuo, iki);
        // Dingo tarpas, kuris jau išsilaikė kelias eilutes (stulpelis, ne žodžių tarpai) - šioje eilutėje išdėstymas kitas
        var dingo = stulpVidiniai(z.tarpai, z.nuo, z.iki).filter(function (t) {
          return (t[2] || 1) >= STULP_EILUCIU && !stulpLieka(t, lieka);
        });
        if (lieka.length && !dingo.length) {
          z.eilutes.push(l); z.tarpai = bendri; z.nuo = nuo; z.iki = iki;
          return;
        }
        // Viena eilutė per visą plotį (antraštė): kitoje eilutėje tarpas vėl yra, todėl ji - atskirai
        var kita = gt[i + 1];
        if (kita && dingo.some(function (t) { return stulpLieka(t, kita.tarpai); })) {
          zonos.push({ eilutes: [l], tarpai: g.tarpai, nuo: g.nuo, iki: g.iki });
          z = null;
          return;
        }
      }
      z = { eilutes: [l], tarpai: g.tarpai, nuo: g.nuo, iki: g.iki };
      zonos.push(z);
    });
    return zonos;
  }
  function stulpTekstas(d) { return d.filter(function (e) { return !e.pasuktas; }).map(function (e) { return e.s; }).join(" "); }
  function stulpDalys(z, ribos) {
    var dalys = ribos.concat([null]).map(function () { return []; });
    z.eilutes.forEach(function (l) {
      l.items.forEach(function (e) {
        var xc = e.pasuktas ? e.x : e.x + e.w / 2, k = 0;
        while (k < ribos.length && xc >= ribos[k]) k++;
        dalys[k].push(e);
      });
    });
    return dalys;
  }
  // Zona bent iš tiek eilučių: jos tarpai - stulpeliai, ne žodžiai, kuriuos skiria sutapęs tarpas
  function stulpStipri(z) { return z.eilutes.length >= STULP_EILUCIU; }
  // Stiprios zonos stulpeliai pagal kalbą: ribos tarp kalbų ir kalbos. Nežinomos kalbos stulpelis tęsia kairėje esantį, pirmas - dešinėje.
  function stulpZonosKalbos(z) {
    var ribos = stulpVidiniai(z.tarpai, z.nuo, z.iki).map(function (t) { return (t[0] + t[1]) / 2; });
    var neaisku = false;
    var kalbos = stulpDalys(z, ribos).map(function (d) {
      // Ir vienas žodis: zonoje gali būti ir žodžių tarpų, tada stulpelis - keli gabalai
      var p = stulpProfilis(stulpTekstas(d)), l = stulpKalba(p) || stulpKalbaTrumpo(p, 1);
      if (!l && p.z) neaisku = true;
      return l;
    });
    for (var i = 1; i < kalbos.length; i++) if (!kalbos[i]) kalbos[i] = kalbos[i - 1];
    for (var j = kalbos.length - 2; j >= 0; j--) if (!kalbos[j]) kalbos[j] = kalbos[j + 1];
    var kr = [], kk = [kalbos[0]];
    ribos.forEach(function (r, k) { if (kalbos[k + 1] !== kalbos[k]) { kr.push(r); kk.push(kalbos[k + 1]); } });
    return { ribos: kr, kalbos: kk, neaisku: neaisku };
  }
  // Trumpa zona (1-2 eilutės) savo tarpų neturi, o kai kurio stulpelio kalba neaiški (trumpi sakiniai be požymių), jos nepakanka:
  // tokia zona perima gretimos dvikalbės zonos ribas, jei jų nekerta ir kalbos neprieštarauja
  function stulpTinka(z, kl) {
    if (!kl || kl.ribos.length === 0) return false;
    var kerta = z.eilutes.some(function (l) {
      return l.items.some(function (e) {
        return e.s.trim() && kl.ribos.some(function (r) { return e.x < r - 0.5 && e.x + e.w > r + 0.5; });
      });
    });
    if (kerta) return false;
    return stulpDalys(z, kl.ribos).every(function (d, k) {
      var p = stulpProfilis(stulpTekstas(d)), l = stulpKalba(p) || stulpKalbaTrumpo(p);
      return !l || l === kl.kalbos[k];
    });
  }
  // Kiekvienam puslapiui: zonos su ribomis pagal kalbą. Zona be ribų - viena kalba arba nežinoma.
  function stulpZonuKalbos(puslapiai) {
    var pz = puslapiai.map(function (items) { return stulpZonos(pdfEilutes(items)); });
    pz.forEach(function (zonos) {
      zonos.forEach(function (z) { z.kl = stulpStipri(z) ? stulpZonosKalbos(z) : null; });
    });
    function dvikalbe(z) { return z.kl && !z.perimta && z.kl.ribos.length; }
    function tvirta(z) { return dvikalbe(z) && !z.kl.neaisku; }
    pz.forEach(function (zonos, pi) {
      zonos.forEach(function (z, i) {
        // Zona su savomis ribomis arba aiškia viena kalba lieka tokia
        if (z.kl && (!z.kl.neaisku || z.kl.ribos.length)) return;
        // Artimiausia dvikalbė zona: šiame puslapyje aukščiau, žemiau, tada gretimuose puslapiuose; pirma - kur kalbos aiškios
        function kandidatai(tinka) {
          var kand = [];
          for (var a = i - 1; a >= 0; a--) if (tinka(zonos[a])) { kand.push(zonos[a].kl); break; }
          for (var b = i + 1; b < zonos.length; b++) if (tinka(zonos[b])) { kand.push(zonos[b].kl); break; }
          [pz[pi - 1], pz[pi + 1]].forEach(function (kita, ki) {
            if (!kita) return;
            var eile = ki === 0 ? kita.slice().reverse() : kita;
            for (var c = 0; c < eile.length; c++) if (tinka(eile[c])) { kand.push(eile[c].kl); break; }
          });
          return kand;
        }
        var kand = kandidatai(tvirta);
        if (!z.kl) kand = kand.concat(kandidatai(dvikalbe));
        for (var k = 0; k < kand.length; k++) if (stulpTinka(z, kand[k])) { z.kl = kand[k]; z.perimta = true; return; }
      });
    });
    return pz;
  }
  function stulpPuslapis(zonos) {
    var srautai = { lt: [], en: [] }, grupes = [], pirma = null, dvik = 0, visi = 0;
    zonos.forEach(function (z) {
      var kl = z.kl || { ribos: [], kalbos: [null] }, dalys = stulpDalys(z, kl.ribos);
      dalys.forEach(function (d, k) {
        var p = stulpProfilis(stulpTekstas(d));
        var kalba = kl.ribos.length ? kl.kalbos[k] : (kl.kalbos[0] || stulpKalba(p) || stulpKalbaTrumpo(p));
        if (kalba && !pirma) pirma = kalba;
        visi += p.z; if (kl.ribos.length) dvik += p.z;
        grupes.push({ kalba: kalba, items: d });
      });
    });
    if (!pirma) return null;
    grupes.forEach(function (g) { srautai[g.kalba || pirma].push(g); });
    var teks = {}, prof = {};
    ["lt", "en"].forEach(function (k) {
      prof[k] = stulpProfilis(srautai[k].filter(function (g) { return g.kalba; }).map(function (g) { return stulpTekstas(g.items); }).join(" "));
      teks[k] = srautai[k].map(function (g) { return pdfTekstas(g.items.map(function (e) { return e.it; })); }).join("\n");
    });
    // Tekstas sava kalba vienas po kito (ne stulpeliais) nepersipina - jo tvarka nekeičiama
    var stulpeliais = visi > 0 && dvik * 2 >= visi;
    return {
      pirma: pirma, lt: teks.lt, en: teks.en,
      griezta: stulpeliais && stulpKalba(prof.lt) === "lt" && stulpKalba(prof.en) === "en",
      // Puslapis su mažai žodžių dvikalbiame dokumente
      tikima: stulpeliais && prof.lt.z >= 3 && prof.en.z >= 3 && prof.lt.d >= 0.015 && prof.en.d <= 0.006
    };
  }
  // Kiekvienam puslapiui - { pirma, lt, en } arba null (vienos kalbos, skaitoma eilutėmis). Dvikalbis - dokumentas, kurio bent
  // trečdalis puslapių dviem kalbomis: atsakymų rašte, kur tik vienas kitas klausimas angliškai, klausimas nuo atsakymo neatskiriamas.
  function dvikalbiaiStulpeliai(puslapiai) {
    var sp = stulpZonuKalbos(puslapiai || []).map(stulpPuslapis);
    var griezti = sp.filter(function (s) { return s && s.griezta; }).length;
    var su = (puslapiai || []).filter(function (items) { return items.some(function (it) { return it && it.str && it.str.trim(); }); }).length;
    if (!griezti || griezti * STULP_DOKUMENTUI < su) return sp.map(function () { return null; });
    return sp.map(function (s) { return s && (s.griezta || s.tikima) ? s : null; });
  }
  // Blokai: pirmos kalbos stulpeliai ir vienos kalbos puslapiai - puslapių tvarka, antros kalbos - po jų, kad sakinys,
  // tęsiamas kitame puslapyje, liktų vientisas. Dokumentui be dvikalbių puslapių - kaip visada, po bloką puslapiui.
  function pdfBlokai(puslapiai) {
    var sp = dvikalbiaiStulpeliai(puslapiai), pirma = null, antra = [], blocks = [];
    sp.forEach(function (s) { if (s && !pirma) pirma = s.pirma; });
    var kita = pirma === "lt" ? "en" : "lt";
    puslapiai.forEach(function (items, i) {
      var s = sp[i], pn = i + 1;
      if (!s) { blocks.push({ loc: { page: pn }, text: norm(pdfTekstas(items)) }); return; }
      blocks.push({ loc: { page: pn, stulpelis: pirma }, text: norm(s[pirma]) });
      antra.push({ loc: { page: pn, stulpelis: kita }, text: norm(s[kita]) });
    });
    return blocks.concat(antra);
  }

  async function isPdf(buf, lang) {
    reikia("pdfjsLib", "pdf.js (PDF)");
    // isEvalSupported:false - gynyba gilyn (CVE-2024-4367 kelias per šriftus čia
    // nevykdomas, nes kviečiamas tik getTextContent, bet užraktas nieko nekainuoja)
    // Darbininkas - iš svetainės (shared/pdf-darbininkas.js); be jo pdf.js darbininko adreso neturėtų
    if (global.GP_PDF_DARBININKAS) await global.GP_PDF_DARBININKAS.nustatyk();
    var pdf = await global.pdfjsLib.getDocument({ data: buf, isEvalSupported: false }).promise;
    var puslapiai = [], warnings = [], tuscių = 0;
    for (var pn = 1; pn <= pdf.numPages; pn++) {
      var page = await pdf.getPage(pn);
      var tc = await page.getTextContent();
      if (!norm(pdfTekstas(tc.items))) tuscių++;
      puslapiai.push(tc.items);
    }
    var blocks = pdfBlokai(puslapiai);
    if (pdf.numPages && tuscių === pdf.numPages) warnings.push(pran(lang, "skenuotas"));
    else if (tuscių > 0) warnings.push(pran(lang, "beTeksto", { n: tuscių }));
    return { blocks: blocks, warnings: warnings, pages: pdf.numPages };
  }

  async function isDocx(buf, lang) {
    // Struktūra iš word/document.xml (pastraipos + lentelių langeliai) - tikslesnė
    // citata nei mammoth "raw text". mammoth lieka atsarginiu keliu.
    reikia("JSZip", ZIP_PAV);   // ir dydžio patikrai prieš išskleidžiant
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
            // visi - ir tušti langeliai (stulpelių tvarka lentelių importui, PP-negotiation nuo 2026-10-06); text - kaip iki tol
            var visi = Array.from(tr.getElementsByTagNameNS(NS, "tc")).map(function (tc) {
              return norm(Array.from(tc.getElementsByTagNameNS(NS, "t")).map(function (x) { return x.textContent; }).join(""));
            });
            var cells = visi.filter(Boolean);
            if (cells.length) blocks.push({ loc: { table: ti, row: ri + 1 }, text: cells.join(" | "), cells: visi });
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

  // ODT (OpenDocument tekstas): LITGRID paketuose pasitaiko techninių užduočių priedų
  // .odt formatu (2026-09-22: 9566057 „Priedas Nr. 01" - iki tol tiekėjas jo turinio
  // įrankyje nematė). Struktūra - content.xml: text:p / text:h pastraipos, table:table
  // eilutės. Ribos tos pačios kaip DOCX.
  async function isOdt(buf, lang) {
    reikia("JSZip", ZIP_PAV);
    var kont = await konteinerioDydis(buf);
    if (kont.suma > MAX_FAILO_B) throw new Error(pran(lang, "dydis"));
    var zip = kont.zip || await global.JSZip.loadAsync(buf);
    var f = zip.file("content.xml");
    if (!f) throw new Error("nėra content.xml");
    var xmlBuf = await issklekRibotai(f, MAX_FAILO_B);
    if (!xmlBuf) throw new Error(pran(lang, "dydis"));
    var doc = new DOMParser().parseFromString(new TextDecoder("utf-8").decode(xmlBuf), "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("XML klaida");
    var TXT = "urn:oasis:names:tc:opendocument:xmlns:text:1.0", TBL = "urn:oasis:names:tc:opendocument:xmlns:table:1.0";
    // Tekstas su tarpais vietoj text:s / text:tab / text:line-break (kitaip žodžiai suliptų)
    function tekstas(n) {
      var out = "";
      (function eik(x) {
        Array.from(x.childNodes).forEach(function (c) {
          if (c.nodeType === 3) out += c.nodeValue;
          else if (c.nodeType === 1) {
            if (c.namespaceURI === TXT && (c.localName === "s" || c.localName === "tab" || c.localName === "line-break")) out += " ";
            else if (c.namespaceURI === TXT && c.localName === "note") return;   // išnašos turinys - atskiras
            else eik(c);
          }
        });
      })(n);
      return norm(out);
    }
    var blocks = [], pi = 0, ti = 0;
    var body = doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:office:1.0", "text")[0];
    if (!body) throw new Error("nėra office:text");
    (function eik(n) {
      Array.from(n.children).forEach(function (c) {
        if (c.namespaceURI === TXT && (c.localName === "p" || c.localName === "h")) {
          pi++; var t = tekstas(c); if (t) blocks.push({ loc: { para: pi }, text: t });
        } else if (c.namespaceURI === TBL && c.localName === "table") {
          ti++;
          Array.from(c.getElementsByTagNameNS(TBL, "table-row")).forEach(function (tr, ri) {
            var visi = Array.from(tr.getElementsByTagNameNS(TBL, "table-cell")).map(tekstas), cells = visi.filter(Boolean);
            if (cells.length) blocks.push({ loc: { table: ti, row: ri + 1 }, text: cells.join(" | "), cells: visi });
          });
        } else eik(c);   // sąrašai, sekcijos - pastraipos jų viduje
      });
    })(body);
    return { blocks: blocks, warnings: [] };
  }

  async function isXlsx(buf, lang) {
    reikia("XLSX", "SheetJS (Excel)");
    reikia("JSZip", ZIP_PAV);   // be jo antraščių dydžio patikra prieš SheetJS būtų tyliai praleista
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
    // CVP IS pasiūlymo struktūra (2_c4t_<id>_<n>.xml): visa prasmė ATRIBUTUOSE
    // (būdas, vertinimo tipas, dalių skaičius, vokai), tekstiniai mazgai - tik „File".
    // Anksčiau iš jo likdavo 4 žodžiai; dabar sudaromas vienas skaitomas blokas.
    if (doc.documentElement && doc.documentElement.localName === "c4t") return isC4t(doc, lang);
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

  var C4T_VERTINIMAS = {
    lt: { lowest: "mažiausia kaina", quality: "kainos ir kokybės santykis", cost: "mažiausios sąnaudos", meat: "ekonominis naudingumas (ne vien kaina)" },
    en: { lowest: "lowest price", quality: "best price-quality ratio", cost: "lowest cost", meat: "most economically advantageous tender (not price only)" }
  };
  function isC4t(doc, lang) {
    var r = doc.documentElement, L = lang === "en" ? "en" : "lt", V = C4T_VERTINIMAS[L];
    var ev = r.getAttribute("eval-type") || "";
    // Žinomi tik šie šablonai; nežinoma reikšmė rodoma kaip yra, ne spėjama
    // 2026-09-22 tikruose paketuose: „prompt.lowest.price" ir „prompt.meat"
    var evTxt = /lowest\.price/.test(ev) ? V.lowest : /meat/.test(ev) ? V.meat : /quality/.test(ev) ? V.quality : /cost/.test(ev) ? V.cost : ev;
    var dalys = r.getAttribute("num-of-lots");
    var failai = Array.from(doc.getElementsByTagName("section")).map(function (sec) {
      var lab = sec.getElementsByTagName("label")[0];
      var krit = Array.from(sec.getElementsByTagName("criterion")).map(function (c) {
        var cl = c.getElementsByTagName("label")[0];
        return (cl ? norm(cl.textContent) : "") + (c.getAttribute("mandatory") === "1" ? (L === "en" ? " (mandatory)" : " (privaloma)") : "");
      }).filter(Boolean);
      return (lab ? norm(lab.textContent) : "") + (krit.length ? ": " + krit.join(", ") : "");
    }).filter(Boolean);
    var eil = L === "en"
      ? ["CVP IS tender structure", "Procedure: " + (r.getAttribute("procedure") || "-"), "Evaluation type: " + (evTxt || "-"),
         "Number of lots: " + (dalys == null ? "-" : dalys), "Round: " + (r.getAttribute("round") || "-"),
         "Envelopes: " + doc.getElementsByTagName("envelope").length, "Files to submit: " + (failai.join("; ") || "-")]
      : ["CVP IS pasiūlymo struktūra", "Pirkimo būdas: " + (r.getAttribute("procedure") || "-"), "Vertinimo tipas: " + (evTxt || "-"),
         "Dalių skaičius: " + (dalys == null ? "-" : dalys), "Etapas: " + (r.getAttribute("round") || "-"),
         "Vokų skaičius: " + doc.getElementsByTagName("envelope").length, "Teikiami failai: " + (failai.join("; ") || "-")];
    return { blocks: [{ loc: { xpath: "/c4t", n: 1 }, text: eil.join("\n") }], warnings: [] };
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
  // Fragmento ribos - žodžiais (paieškos tikslumui) IR simboliais. AI iš kiekvieno
  // fragmento mato tik pirmus CHUNK_SIMBOLIU simbolių (asistentas.js ima šią ribą, o
  // worker/tiekejams-proxy.js MAX_CHUNK_CHARS turi būti ne mažesnė - tikrina testai).
  // 2026-09-22 tikruose LITGRID paketuose 37 % fragmentų buvo ilgesni: jų pabaigos AI
  // nematė, nors paieška fragmentą parinko būtent dėl jos (TED skelbimo pateikimo
  // terminas stovėjo 1640-ame 2182 simbolių fragmento simbolyje).
  function zodziuSk(t) { var m = String(t).match(/\S+/g); return m ? m.length : 0; }
  // Tekstas dalimis, kiekviena baigiasi ten, kur baigiasi reiškinio `re` (su /g) atitikmuo - kaip split su lookbehind, kurio
  // senesnis Safari (iki 16.4) nepalaiko: toks literalas failo nebeįkeltų visai (iki 2026-09-28 - PP-tiekejams, PP-salygos).
  function dalink(s, re) {
    var out = [], nuo = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(s))) { out.push(s.slice(nuo, re.lastIndex)); nuo = re.lastIndex; }
    out.push(s.slice(nuo));
    return out;
  }
  // Ilgas blokas -> gabalai, kurių kiekvienas telpa į fragmentą kartu su persidengimu.
  // Kerpama sakinio riboje, per ilgas sakinys - žodžio riboje, per ilgas „žodis" (pvz.
  // nuoroda be tarpų) - pagal simbolius. Tarpai ir eilučių lūžiai gabalų viduje išlieka.
  function gabalai(text, maxZ, maxS) {
    if (zodziuSk(text) <= maxZ && text.length <= maxS) return [text];
    var out = [], cur = "", cz = 0;
    function dek(vnt) {
      var z = zodziuSk(vnt);
      if (cur && (cz + z > maxZ || (cur + vnt).trimEnd().length > maxS)) { out.push(cur.trimEnd()); cur = ""; cz = 0; }
      cur += vnt; cz += z;
    }
    dalink(text, /[.;:!?]\s+(?=\S)/g).forEach(function (sak) {
      if (zodziuSk(sak) <= maxZ && sak.trimEnd().length <= maxS) { dek(sak); return; }
      dalink(sak, /\s(?=\S)/g).forEach(function (zod) {
        while (zod.trimEnd().length > maxS) { dek(zod.slice(0, maxS)); zod = zod.slice(maxS); }
        dek(zod);
      });
    });
    if (cur.trim()) out.push(cur.trimEnd());
    return out;
  }
  function fragmentai(doc) {
    var out = [], id = 0;
    var buf = [], bufLoc = null, bufPunktas = null, zod = 0, simb = 0, naujo = false;
    // Gabalas turi tilpti ir po persidengimo, todėl jo ribos mažesnės už fragmento
    var maxZ = CHUNK_ZODZIU - CHUNK_PERDANGA, maxS = CHUNK_SIMBOLIU - PERDANGA_SIMBOLIU - 1;
    function flush() {
      if (!naujo) return;   // vien persidengimas naujo fragmento nesudaro
      id++;
      var text = buf.join("\n");
      out.push({ id: doc.id + "#" + id, docId: doc.id, loc: bufLoc, punktas: bufPunktas, text: text });
      // perdanga: paliekam paskutinius žodžius (ne daugiau CHUNK_PERDANGA ir PERDANGA_SIMBOLIU)
      var z = text.split(/\s+/).filter(Boolean).slice(-CHUNK_PERDANGA);
      while (z.length && z.join(" ").length > PERDANGA_SIMBOLIU) z.shift();
      var tail = z.join(" ");
      buf = tail ? [tail] : []; zod = z.length; simb = tail.length; naujo = false; bufPunktas = null;
    }
    var stulpDabar = null;
    doc.blocks.forEach(function (b) {
      // Dvikalbis PDF: antra kalba - naujas fragmentas be persidengimo su pirma (citata rodo jos stulpelį)
      var st = b.loc && b.loc.stulpelis;
      if (st && stulpDabar && st !== stulpDabar) { flush(); buf = []; zod = 0; simb = 0; }
      if (st) stulpDabar = st;
      // labai ilgas blokas (pvz. visas PDF puslapis) skaidomas į gabalus
      gabalai(b.text, maxZ, maxS).forEach(function (g, j) {
        var w = zodziuSk(g);
        if (naujo && (zod + w > CHUNK_ZODZIU || simb + 1 + g.length > CHUNK_SIMBOLIU)) flush();
        if (!naujo) { bufLoc = b.loc; bufPunktas = j === 0 ? punktas(b.text) : null; }
        buf.push(g); zod += w; simb += (buf.length > 1 ? 1 : 0) + g.length; naujo = true;
      });
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
    // Pradiniai baitai - tik paprašius (o.pasilikti, pvz. ["docx"]): PP-salygos tikrinimas DOCX lygina su forma ir skaito generavimo pasą
    if (ctx.pasilikti && ctx.pasilikti.indexOf(e) >= 0) doc.buf = buf;
    if (DRAUDZIAMI[e] || !LEIDZIAMI[e]) { doc.parseStatus = "unsupported"; doc.warnings.push(netinkamas(lang, e)); return doc; }
    try {
      var r;
      if (e === "pdf") { r = await isPdf(buf, lang); doc.pages = r.pages; }
      else if (e === "docx") r = await isDocx(buf, lang);
      else if (e === "odt") r = await isOdt(buf, lang);
      else if (e === "xlsx" || e === "xlsm") r = await isXlsx(buf, lang);
      else if (e === "xml") r = isXml(new TextDecoder("utf-8").decode(buf), lang);
      else if (e === "html" || e === "htm") r = isHtml(new TextDecoder("utf-8").decode(buf));
      else r = isTxt(new TextDecoder("utf-8").decode(buf));
      doc.blocks = r.blocks; doc.warnings = doc.warnings.concat(r.warnings || []);
      if (!doc.blocks.length) doc.parseStatus = (doc.warnings.length ? "partial" : "failed");
      else if (doc.warnings.length) doc.parseStatus = "partial";
      var stulp = doc.blocks.filter(function (b) { return b.loc && b.loc.stulpelis; });
      doc.dvikalbis = stulp.length > 0;
      doc.language = stulp.length ? stulp[0].loc.stulpelis : kalba(doc.blocks.map(function (b) { return b.text; }).join(" ").slice(0, 6000));
      doc.chunks = fragmentai(doc);
      doc.words = doc.blocks.reduce(function (a, b) { return a + b.text.split(/\s+/).length; }, 0);
    } catch (err) {
      doc.parseStatus = "failed"; doc.warnings.push(pran(lang, "neperskaityta", { e: (err && err.message ? err.message : String(err)) }));
    }
    return doc;
  }

  // Archyvas (ZIP) arba el. parašo konteineris (konteineris - plėtinys: tada praleidžiami parašai ir metaduomenys)
  async function isZip(name, buf, ctx, gylis, onProgress, konteineris) {
    reikia("JSZip", ZIP_PAV);
    var docs = [], lang = ctx.lang;
    var zip = await global.JSZip.loadAsync(buf, { decodeFileName: decodeFileName });
    var entries = Object.keys(zip.files).map(function (k) { return zip.files[k]; }).filter(function (f) { return !f.dir; });
    var stub = function (vardas, status, msg, size) { return { id: "D" + (++ctx.n), name: vardas, parseStatus: status, warnings: [msg], blocks: [], chunks: [], size: size || 0 }; };
    var pilnas = function (k) { return (name ? name + " \u203a " : "") + k; };
    var dokumentu = 0;
    for (var i = 0; i < entries.length; i++) {
      var f = entries[i];
      var originalus = f.unsafeOriginalName || f.name;
      var kelias = saugusKelias(f.name);
      if (!kelias || !saugusKelias(originalus)) { docs.push(stub(String(originalus).replace(/[\r\n\t]+/g, " "), "failed", pran(lang, "kelias"))); continue; }
      if (/^__MACOSX\//.test(kelias) || /(^|\/)\./.test(kelias)) continue; // sisteminės šiukšlės
      if (konteineris && (kelias === "mimetype" || /^(META-INF|metadata)\//i.test(kelias))) continue; // parašai ir metaduomenys
      dokumentu++;
      if (ctx.failu >= MAX_FAILU) { docs.push(stub(pilnas(kelias), "failed", pran(lang, "failuLimitas", { n: MAX_FAILU }))); continue; }
      var e = ext(kelias), arch = archyvas(e), skaitomas = !arch && LEIDZIAMI[e] && !DRAUDZIAMI[e];
      var deklaruota = (f._data && f._data.uncompressedSize) || 0;
      // Riba tikrinama IŠSKLEIDŽIANT (srautu), o ne po išskleidimo: archyvui - iki 250 MB, dokumentui - iki 60 MB,
      // abiem - kiek liko bendrų ribų (dokumentų suma ir viskas, kas išskleista)
      var likoDarbo = MAX_DARBO_B - ctx.darbo;
      var liko = arch ? Math.min(MAX_ISSKLEISTA_B, likoDarbo) : Math.min(MAX_FAILO_B, MAX_ISSKLEISTA_B - ctx.baitu, likoDarbo);
      if (arch && gylis >= GYLIS) { ctx.failu++; docs.push(stub(pilnas(kelias), "unsupported", pran(lang, "gilus"), deklaruota)); continue; }
      // Neskaitomas formatas, didesnis už ribą, neišskleidžiamas - pasakoma kodėl jis neskaitomas, ne „viršyta riba“
      if (!arch && !skaitomas && deklaruota > liko) { ctx.failu++; docs.push(stub(pilnas(kelias), "unsupported", netinkamas(lang, e), deklaruota)); continue; }
      if (liko <= 0) { docs.push(stub(pilnas(kelias), "failed", pran(lang, "bendrasLimitas"))); continue; }
      var ab = await issklekRibotai(f, liko);
      ctx.failu++;
      if (!ab) { docs.push(stub(pilnas(kelias), "failed", pran(lang, "dydis"), deklaruota)); continue; }
      ctx.darbo += ab.byteLength;
      if (arch) {
        // Įdėtinio archyvo dokumentai gauna pilną kelią (išorinis › vidinis › failas) vieną kartą; sugadintas įdėtinis
        // archyvas nesustabdo viso paketo - pažymimas jis vienas
        try { docs = docs.concat(await isZip(pilnas(kelias), ab, ctx, gylis + 1, onProgress, KONTEINERIAI[e] ? e : null)); }
        catch (err) { docs.push(stub(pilnas(kelias), "failed", pran(lang, "neperskaityta", { e: (err && err.message ? err.message : String(err)) }), ab.byteLength)); }
      } else {
        ctx.baitu += ab.byteLength;
        if (onProgress) onProgress(kelias);
        var d = await apdorokFaila(kelias, ab, ctx);
        d.name = pilnas(kelias);
        if (konteineris) {
          // Pasirašyto dokumento rūšis ir versija - ir iš konteinerio vardo (vidinis failas dažnai vadinasi bendriau)
          var kv = String(name || "").split(" \u203a ").pop();
          if (d.rusis === "Kita") d.rusis = rusis(kv);
          d.versija = versijosPozymiai(kv + " " + kelias);
          d.konteineris = konteineris;
        }
        docs.push(d);
      }
    }
    if (konteineris && !dokumentu) docs.push(stub(name, "unsupported", pran(lang, "konteinerisTuscias"), buf.byteLength));
    return docs;
  }

  async function apdorok(files, onProgress, lang, o) {
    var ctx = { n: 0, failu: 0, baitu: 0, darbo: 0, lang: lang === "en" ? "en" : "lt", pasilikti: (o && o.pasilikti) || null };
    var docs = [];
    var klaida = function (f, msg) { docs.push({ id: "D" + (++ctx.n), name: f.name, parseStatus: "failed", warnings: [msg], blocks: [], chunks: [], size: f.size }); };
    for (var i = 0; i < files.length; i++) {
      var f = files[i], e = ext(f.name), arch = archyvas(e);
      var riba = arch ? MAX_ISSKLEISTA_B : MAX_FAILO_B;
      if (f.size > riba) { klaida(f, pran(ctx.lang, "perDidelis", { mb: Math.round(riba / 1048576) })); continue; }
      if (ctx.failu >= MAX_FAILU) { klaida(f, pran(ctx.lang, "failuLimitas", { n: MAX_FAILU })); continue; }
      if (ctx.darbo + f.size > MAX_DARBO_B || (!arch && ctx.baitu + f.size > MAX_ISSKLEISTA_B)) { klaida(f, pran(ctx.lang, "bendrasLimitas")); continue; }
      // failo perskaityti nepavyko (pvz. debesyje esantis, neatsisiųstas failas) - tik šis failas pažymimas, kiti skaitomi toliau (2026-10-22, T4-V5;
      // iki tol klaida nutraukdavo viso įkėlimo skaitymą)
      var buf;
      try { buf = await f.arrayBuffer(); } catch (err) { klaida(f, pran(ctx.lang, "neperskaityta", { e: (err && err.message ? err.message : String(err)) })); docs[docs.length - 1].neperskaitytas = true; continue; }   // failo nepavyko paimti (pvz. debesyje, neatsisiųstas; PP-salygos T4-V5) - ne „teksto nėra“
      ctx.failu++; ctx.darbo += buf.byteLength;
      if (arch) docs = docs.concat(await isZip(f.name, buf, ctx, 0, onProgress, KONTEINERIAI[e] ? e : null));
      else { ctx.baitu += buf.byteLength; if (onProgress) onProgress(f.name); docs.push(await apdorokFaila(f.name, buf, ctx)); }
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
    if (loc.page) return (L ? "p. " : "psl. ") + loc.page + (loc.stulpelis ? ", " + loc.stulpelis.toUpperCase() + (L ? " column" : " stulpelis") : "");
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
    pdfBlokai: pdfBlokai,
    dvikalbiaiStulpeliai: dvikalbiaiStulpeliai,
    punktas: punktas,
    limits: { MAX_FAILO_B: MAX_FAILO_B, MAX_ISSKLEISTA_B: MAX_ISSKLEISTA_B, MAX_DARBO_B: MAX_DARBO_B, MAX_FAILU: MAX_FAILU, GYLIS: GYLIS, CHUNK_ZODZIU: CHUNK_ZODZIU, CHUNK_SIMBOLIU: CHUNK_SIMBOLIU },
    _internal: { isDocx: isDocx, isXml: isXml, isHtml: isHtml, isTxt: isTxt, isXlsx: isXlsx, saugusKelias: saugusKelias, decodeFileName: decodeFileName, kalba: kalba, issklekRibotai: issklekRibotai, konteinerioDydis: konteinerioDydis, pran: pran }
  };
})(typeof window !== "undefined" ? window : this);
