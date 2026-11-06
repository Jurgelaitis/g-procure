/* ==========================================================================
 * PP-salygos  org-sablonai.js - pirkimo vykdytojo duomenys dokumentuose (GP_ORG_SABLONAI, nuo 2026-11-03)
 * --------------------------------------------------------------------------
 * Šablonai - EPSO-G grupės standartinės pirkimo sąlygos su LITGRID AB duomenimis. Patikra su paskelbtais AB „Amber Grid“ CVP IS
 * paketais (4 paketai, 2026-11-03): BPS ir priedai pastraipa į pastraipą sutampa 97-100 %, skiriasi tik įmonės duomenys, todėl
 * modelis ir tekstas lieka tie patys, o generuojant keičiama tik tai, kas būdinga LITGRID: pavadinimas, kodas, adresas, kontaktai,
 * bankas, nuorodos, logotipas ir sutartyse - „elektros perdavimo tinklo“ objektai.
 *
 * Duomenys - tik iš shared/organizacijos.js (rekvizitai) ir paskelbtų įmonės dokumentų; dviejų įmonių žemėlapis čia.
 * Nauja įmonė: rekvizitai registre, įrašas IMONES, logotipas ir patikra su jos paskelbtais dokumentais.
 * ========================================================================== */
;(function (global) {
  "use strict";
  var NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  var NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  var NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  var NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
  var NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  var NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

  var IMONES = {
    "litgrid": { id: "litgrid", vardas: "LITGRID AB", didz: "LITGRID AB", sutartys: null, centralizuotas: true, rekvizituIs: "litgrid" },
    "amber-grid": { id: "amber-grid", vardas: "AB „Amber Grid“", didz: "AB „AMBER GRID“", svetaine: "https://ambergrid.lt",
                    // Paskelbtų paketų sutarčių formos: prekių ir paslaugų - tos pačios; statybos rangos - savos (SUT-35 / SUT-36), specialiosios
                    // sąlygos atkurtos iš paskelbto pirkimo (2026-11-06, amber-sutartys.py)
                    sutartys: ["PREKES", "PASLAUGOS", "AG_STATYBOS_RANGOS"], centralizuotas: false,
                    logotipas: { png: "amber-grid-logo-mono.png", svg: "amber-grid-logo-mono.svg", plotis: 1224, aukstis: 394 },
                    objektai: { lt: "gamtinių dujų perdavimo sistemos", en: "natural gas transmission system" } }
  };
  var aktyvi = "litgrid";
  function imone(id) { return IMONES[id] || IMONES.litgrid; }
  function nustatyk(id) { aktyvi = IMONES[id] ? id : "litgrid"; return imone(aktyvi); }
  function dabartine() { return imone(aktyvi); }

  /* Šablonų tekstas (LITGRID AB) -> įmonės duomenys; ilgesni pirma. Kiekviena reikšmė - iš GP_ORG.rekvizitai. */
  function keitimai(id) {
    var I = IMONES[id];
    if (!I || id === "litgrid") return [];
    var R = global.GP_ORG && global.GP_ORG.rekvizitai(id);
    if (!R) throw new Error("Nėra įmonės rekvizitų: " + id);
    var gatve = R.gatve, kodas = R.pastoKodas;
    return [
      ["/ĮMONĖS PAVADINIMAS/", I.vardas], ["ĮMONĖS PAVADINIMAS", I.vardas], ["LITGRID AB", I.vardas],
      ["Karlo Gustavo Emilio Manerheimo g. 8", gatve], ["Karlo Gustavo Emilio Manerheimo st. 8", gatve], ["Karlo Gustavo Emilio Manerheimo str. 8", gatve],
      ["LT – 05131", kodas.replace("-", " – ")], ["LT-05131", kodas],
      ["302564383", R.kodas], ["LT100005748413", R.pvmKodas],
      ["+370 707 02171", R.telefonas], ["+370\u00a0707 02171", R.telefonas],
      ["LT24 2150 0510 0002 1766", R.saskaita], ["LT242150051000021766", R.saskaita],
      ["OP Corporate Bank plc Lietuvos filialas (banko kodas 21500)", R.bankas + " (banko kodas " + R.bankoKodas + ")"],
      ["OP Corporate Bank plc Lithuanian branch (bank code 21500)", R.bankas + " (bank code " + R.bankoKodas + ")"],
      ["incidentai@litgrid.eu", R.incidentuPastas], ["info@litgrid.eu", R.elPastas],
      ["https://www.litgrid.eu/index.php/about-us/privacy-notice/32019", I.svetaine], ["https://www.litgrid.eu/privatumo-pranesimas", I.svetaine],
      ["elektros perdavimo tinklo", I.objektai.lt], ["electricity transmission network", I.objektai.en]
    ].sort(function (a, b) { return b[0].length - a[0].length; });
  }

  /* Vienos pastraipos tekstas per kelias atkarpas: pakeitimas rašomas į pirmą pakeičiamo teksto atkarpą (kaip GPDocx.replaceText). */
  function pastraipa(p, K) {
    var ts = Array.prototype.slice.call(p.getElementsByTagNameNS(NS_W, "t"));
    if (!ts.length) return 0;
    var s = ts.map(function (t) { return t.textContent; }).join("");
    var yra = K.filter(function (k) { return s.indexOf(k[0]) >= 0; });
    if (!yra.length) return 0;
    var savin = [];
    ts.forEach(function (t) { for (var i = 0; i < t.textContent.length; i++) savin.push(t); });
    var isv = new Map(ts.map(function (t) { return [t, ""]; })), n = 0;
    for (var i = 0; i < s.length;) {
      var rasta = null;
      for (var j = 0; j < yra.length; j++) if (s.startsWith(yra[j][0], i)) { rasta = yra[j]; break; }
      if (rasta) { isv.set(savin[i], isv.get(savin[i]) + rasta[1]); i += rasta[0].length; n++; }
      else { isv.set(savin[i], isv.get(savin[i]) + s[i]); i++; }
    }
    ts.forEach(function (t) { t.textContent = isv.get(t); t.setAttribute("xml:space", "preserve"); });
    return n;
  }
  /* Antraštėse (kiti žodžiai - didžiosiomis) įmonės pavadinimas - didžiosiomis, kaip įmonės paskelbtuose dokumentuose. */
  function didziosiomis(p, I) {
    var ts = Array.prototype.slice.call(p.getElementsByTagNameNS(NS_W, "t"));
    var s = ts.map(function (t) { return t.textContent; }).join("");
    if (s.indexOf(I.vardas) < 0) return 0;
    var likes = s.split(I.vardas).join("").replace(/[^A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]/g, "");
    // Pavadinimas vienas pastraipoje už lentelės - dokumento antraštė („AB „AMBER GRID““ virš „SPECIALIOSIOS PIRKIMO SĄLYGOS“); langelyje - rekvizitas, nekeičiama
    var vienas = !likes && s.trim() === I.vardas;
    if (vienas) { for (var a = p.parentNode; a; a = a.parentNode) if (a.localName === "tc") return 0; return pastraipa(p, [[I.vardas, I.didz]]); }
    if (likes.length < 3 || likes !== likes.toLocaleUpperCase("lt")) return 0;
    return pastraipa(p, [[I.vardas, I.didz]]);
  }
  var DALYS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

  /* Paveikslai antraštėse ir dokumente - šablonų logotipai (visi šablonų paveikslai - LITGRID logotipai; tikrinama testu). */
  var logoKesas = {};
  function logotipas(failas) {
    var saknis = (global.GP_ORG_SABLONAI_SAKNIS || "../shared/img/");
    if (!logoKesas[failas]) logoKesas[failas] = global.fetch(saknis + failas).then(function (r) {
      if (!r.ok) throw new Error("Nepavyko įkelti logotipo: " + failas);
      return r.arrayBuffer();
    });
    return logoKesas[failas];
  }
  async function paveikslai(doc, I, dalys) {
    var L = I.logotipas, keista = 0;
    if (!L) return 0;
    var png = await logotipas(L.png), svg = await logotipas(L.svg);
    var failai = doc.zip.file(/^word\/media\/.+\.(png|jpe?g|svg)$/i);
    for (var i = 0; i < failai.length; i++) {
      var f = failai[i];
      if (/\.svg$/i.test(f.name)) doc.zip.file(f.name, svg, { createFolders: false });
      else if (/\.png$/i.test(f.name)) doc.zip.file(f.name, png, { createFolders: false });
      else doc.zip.file(f.name.replace(/\.jpe?g$/i, ".png"), png, { createFolders: false });
      keista++;
    }
    // jpeg -> png: ryšiai ir turinio tipai
    var rysiai = doc.zip.file(/^word\/_rels\/.+\.rels$/);
    for (var r = 0; r < rysiai.length; r++) {
      var kel = rysiai[r].name;
      var x = doc.parts[kel] ? null : await rysiai[r].async("string");
      if (x && /media\/[^"]+\.jpe?g"/i.test(x)) doc.zip.file(kel, x.replace(/(media\/[^"]+)\.jpe?g"/gi, '$1.png"'), { createFolders: false });
      else if (doc.parts[kel]) Array.prototype.forEach.call(doc.parts[kel].getElementsByTagNameNS(NS_REL, "Relationship"), function (e) {
        var t = e.getAttribute("Target") || ""; if (/media\/[^/]+\.jpe?g$/i.test(t)) e.setAttribute("Target", t.replace(/\.jpe?g$/i, ".png"));
      });
    }
    failai.filter(function (f) { return /\.jpe?g$/i.test(f.name); }).forEach(function (f) { doc.zip.remove(f.name); });
    if (doc.zip.file("[Content_Types].xml")) {
      var ct = doc.parts["[Content_Types].xml"] ? null : await doc.zip.file("[Content_Types].xml").async("string");
      if (ct && !/Extension="png"/i.test(ct)) doc.zip.file("[Content_Types].xml", ct.replace(/<Types([^>]*)>/, '<Types$1><Default Extension="png" ContentType="image/png"/>'), { createFolders: false });
    }
    // Matmenys: tas pats plotis (ne siauresnis už įprastą logotipą - vertikalus Litgrid ženklas siauras), aukštis pagal proporciją
    var santykis = L.aukstis / L.plotis, IPRASTAS = 1080000;
    dalys.forEach(function (d) {
      Array.prototype.forEach.call(d.getElementsByTagNameNS(NS_W, "drawing"), function (dr) {
        var ext = dr.getElementsByTagNameNS(NS_WP, "extent")[0];
        if (!ext) return;
        var cx = Math.max(+ext.getAttribute("cx") || 0, IPRASTAS), cy = Math.round(cx * santykis);
        ext.setAttribute("cx", cx); ext.setAttribute("cy", cy);
        Array.prototype.forEach.call(dr.getElementsByTagNameNS(NS_A, "ext"), function (e) {
          if (e.getAttribute("cx")) { e.setAttribute("cx", cx); e.setAttribute("cy", cy); }
        });
        ["docPr"].forEach(function (nm) { Array.prototype.forEach.call(dr.getElementsByTagNameNS(NS_WP, nm), function (e) { e.setAttribute("descr", I.vardas + " logotipas"); e.setAttribute("name", "Logotipas"); }); });
        Array.prototype.forEach.call(dr.getElementsByTagNameNS(NS_PIC, "cNvPr"), function (e) { e.setAttribute("descr", I.vardas + " logotipas"); e.setAttribute("name", "Logotipas"); });
      });
    });
    return keista;
  }

  /* Dokumentas -> įmonės duomenys: visos teksto dalys, ryšiai (nuorodos), logotipai ir failo savybės. Kviečiama prieš pasą ir išsaugant.
     LITGRID AB - nieko nekeičia. -> { tekstas, nuorodos, paveikslai } */
  async function pritaikyk(doc, id) {
    var I = IMONES[id];
    var ats = { tekstas: 0, nuorodos: 0, paveikslai: 0 };
    if (!I || id === "litgrid") return ats;
    var K = keitimai(id), dalys = [];
    var failai = doc.zip.file(DALYS);
    for (var i = 0; i < failai.length; i++) {
      var kel = failai[i].name;
      // Dalis į doc.parts patenka tik pakeista (įkelta dalis įrašant perrašoma - kaip GPDocx.antrastesLogotipas)
      var x = doc.parts[kel] || new DOMParser().parseFromString(await failai[i].async("string"), "application/xml");
      var nDal = 0;
      Array.prototype.forEach.call(x.getElementsByTagNameNS(NS_W, "p"), function (p) { nDal += pastraipa(p, K); nDal += didziosiomis(p, I); });
      ats.tekstas += nDal;
      var piesiniai = x.getElementsByTagNameNS(NS_W, "drawing").length;
      if (nDal || piesiniai) doc.parts[kel] = x;
      if (piesiniai) dalys.push(x);
    }
    var rys = doc.zip.file(/^word\/_rels\/.+\.rels$/);
    for (var r = 0; r < rys.length; r++) {
      var nm = rys[r].name, ds = doc.parts[nm];
      var pak = function (t) {
        return t.replace(/^mailto:incidentai@litgrid\.eu/i, "mailto:" + global.GP_ORG.rekvizitai(id).incidentuPastas)
                .replace(/^mailto:info@litgrid\.eu/i, "mailto:" + global.GP_ORG.rekvizitai(id).elPastas)
                .replace(/^https?:\/\/(www\.)?litgrid\.eu.*$/i, I.svetaine);
      };
      if (ds) Array.prototype.forEach.call(ds.getElementsByTagNameNS(NS_REL, "Relationship"), function (e) {
        var t = e.getAttribute("Target") || "", n = pak(t); if (n !== t) { e.setAttribute("Target", n); ats.nuorodos++; }
      });
      else {
        var tx = await rys[r].async("string");
        var nx = tx.replace(/Target="([^"]*)"/g, function (m, t) { var n = pak(t); if (n !== t) ats.nuorodos++; return 'Target="' + n + '"'; });
        if (nx !== tx) doc.zip.file(nm, nx, { createFolders: false });
      }
    }
    // Failo savybės: šablono hipersaitų sąrašas (senos nuorodos) - nereikalingas
    var app = doc.zip.file("docProps/app.xml");
    if (app) { var ax = await app.async("string"), ay = ax.replace(/<HLinks>[\s\S]*?<\/HLinks>/, ""); if (ay !== ax) doc.zip.file("docProps/app.xml", ay, { createFolders: false }); }
    ats.paveikslai = await paveikslai(doc, I, dalys);
    return ats;
  }

  /* Tikrinimas (shared/palyginimas.js): įmonės duomenys parengtame dokumente - ne nukrypimas nuo formos. Tekstas -> formos tekstas.
     Pavadinimo rašybos - kaip įmonės paskelbtuose dokumentuose. */
  var ATGAL = {
    "amber-grid": [
      [/AB\s*[„"]AMBER GRID[“”"]|AB\s*[„"]Amber Grid[“”"]|AB AMBER GRID|AB Amber Grid|AMBER GRID AB/g, "ĮMONĖS PAVADINIMAS"],
      [/Laisvės pr\. 10,? ?LT[- ]+04215 Vilnius(, Lietuvos Respublika)?(, tel\. \+370 (5 )?236 0855)?/g, function (m) {
        return "Karlo Gustavo Emilio Manerheimo g. 8, LT-05131 Vilnius" + (/Respublika/.test(m) ? ", Lietuvos Respublika" : "") + (/tel\./.test(m) ? ", tel. +370 707 02171" : ""); }],
      [/Laisvės pr\. 10/g, "Karlo Gustavo Emilio Manerheimo g. 8"], [/303090867/g, "302564383"], [/LT100007844014/g, "LT100005748413"],
      [/\+370 5 236 0855/g, "+370 707 02171"], [/LT71 7044 0600 0790 5969/g, "LT24 2150 0510 0002 1766"],
      [/AB SEB bankas \(banko kodas 70440\)/g, "OP Corporate Bank plc Lietuvos filialas (banko kodas 21500)"],
      [/cyber@ambergrid\.lt/g, "incidentai@litgrid.eu"], [/info@ambergrid\.lt/g, "info@litgrid.eu"],
      [/gamtinių dujų perdavimo sistemos/g, "elektros perdavimo tinklo"]
    ]
  };
  function atpazink(tekstas) { return /303090867|ambergrid\.lt|amber\s*grid/i.test(String(tekstas || "")) ? "amber-grid" : null; }
  function atgal(tekstas, id) {
    var t = String(tekstas || "");
    (ATGAL[id] || []).forEach(function (a) { t = t.replace(a[0], a[1]); });
    return t;
  }

  global.GP_ORG_SABLONAI = { IMONES: IMONES, imone: imone, nustatyk: nustatyk, dabartine: dabartine, keitimai: keitimai, pritaikyk: pritaikyk, atpazink: atpazink, atgal: atgal };
})(typeof window !== "undefined" ? window : this);
