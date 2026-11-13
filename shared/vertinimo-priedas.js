/* Ekonomiškai naudingiausio pasiūlymo vertinimo dokumentai iš blokų (GP_VERTINIMO_PRIEDAS, nuo 2026-11-13).

   Naudotojo sprendimas 2026-11-13: ekonominio naudingumo skaičiuoklės kriterijų rinkinys perduodamas per pirkimo kortelę į Pirkimo sąlygų
   generatorių automatiškai (iki tol Word priedą ten reikėjo įkelti ranka). Todėl priedo turinys - duomenys (blokai), o ne tik Word failas:
   skaičiuoklė juos sudaro (priedoTurinys), įrašo į kortelę, o generatorius iš tų pačių blokų sudaro priedą su galutiniu SPS priedo numeriu.
   Tas pats kūrėjas - ir skaičiuoklės vertinimo suvestinei (gulsčias lapas).

   Turinys: { priedas, pavadinimas, pirkimas, blokai: [ ... ] }
     { t: "p",  nr: "1.", tekstas, r }            numeruotas punktas (r - tekste yra žymenų „C_min“, „^n“)
     { t: "pp", tekstas, r }                      pastraipa be numerio (su įtrauka)
     { t: "f",  tekstas }                         formulė atskira eilute
     { t: "a",  eilutes: [[žymuo, paaiškinimas]] } „Pateiktoje formulėje:“
     { t: "l",  antrastes, eilutes, plociai, pavadinimas?, suma?, pusjuodes?, r? }   lentelė (plociai - procentais)
     { t: "ps", eilutes: [tekstas] }              parašų eilutės (vidaus dokumentams)
     { t: "d",  tekstas }                         pirkimo objekto dalies antraštė („I pirkimo objekto dalis „...““) - kai dalims taikomi atskiri
                                                  kriterijų rinkiniai; skaitytuvui - elementas su žyma dalis: true (pagal ją metodika skaidoma dalimis)
   Žymenys: „C_min“ - C su indeksu „min“, „^n“ - laipsnis; Word faile - tikri indeksai (w:vertAlign), tekste - „Cmin“.

   forma(t) - duomenys iš saugyklos (pirkimo kortelės) yra nepatikimi: tik žinomi blokai, tipai ir ribos; netinkama sandara - null.
   elementai(t) - tie patys blokai PP-salygos vertinimo metodikos skaitytuvui (GP_METODIKA.analizuok).
   docx(t, o) - reikia docx.js (window.docx) ir shared/docx-stiliai.js; Arial 10 pt iš stilių, A4, lentelės DXA ir FIXED. */
(function (root) {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* Žymenys: „C_min“ -> C su indeksu „min“, „^n“ -> laipsnis. */
  function zymuDalys(s) {
    var out = [], re = /([A-Za-z])_([A-Za-z0-9]+)|\^([−-]?[A-Za-z0-9]+)/g, i = 0, m;
    s = String(s == null ? "" : s);
    while ((m = re.exec(s))) {
      if (m[1] !== undefined) { out.push({ t: s.slice(i, m.index + 1) }); out.push({ t: m[2], sub: true }); }
      else { if (m.index > i) out.push({ t: s.slice(i, m.index) }); out.push({ t: m[3], sup: true }); }
      i = m.index + m[0].length;
    }
    if (i < s.length) out.push({ t: s.slice(i) });
    return out;
  }
  function beZymu(s) { return zymuDalys(s).map(function (x) { return x.sup ? "^" + x.t : x.t; }).join(""); }
  function zymosHtml(s) { return zymuDalys(s).map(function (x) { return x.sub ? "<sub>" + esc(x.t) + "</sub>" : (x.sup ? "<sup>" + esc(x.t) + "</sup>" : esc(x.t)); }).join(""); }

  /* Tekstas eilutėmis - kopijavimui ir patikrai (žymenys be indeksų: „Cmin“). */
  function tekstas(t) {
    var e = [];
    if (t.priedas) e.push(t.priedas);
    e.push(t.pavadinimas);
    if (t.pirkimas) e.push(t.pirkimas);
    (t.blokai || []).forEach(function (b) {
      var tx = function (s) { return b.r ? beZymu(s) : s; };
      if (b.t === "p") e.push(b.nr + " " + tx(b.tekstas));
      else if (b.t === "pp") e.push(tx(b.tekstas));
      else if (b.t === "f") e.push(beZymu(b.tekstas));
      else if (b.t === "a") { e.push(formuleje(t)); b.eilutes.forEach(function (x, i) { e.push(beZymu(x[0]) + " - " + x[1] + (i === b.eilutes.length - 1 ? "." : ";")); }); }
      else if (b.t === "l") { if (b.pavadinimas) e.push(b.pavadinimas); e.push(b.antrastes.map(tx).join(" | ")); b.eilutes.forEach(function (r) { e.push(r.map(tx).join(" | ")); }); }
      else if (b.t === "ps") b.eilutes.forEach(function (x) { e.push(x); });
      else if (b.t === "d") e.push(b.tekstas);
    });
    return e;
  }

  /* Peržiūra puslapyje - tie patys blokai kaip Word faile; visas tekstas ekranuojamas. */
  function html(t) {
    var h = (t.priedas ? '<p class="pr-desine">' + esc(t.priedas) + "</p>" : "") + '<p class="pr-pav">' + esc(t.pavadinimas) + "</p>" + (t.pirkimas ? '<p class="pr-pirk">' + esc(t.pirkimas) + "</p>" : "");
    (t.blokai || []).forEach(function (b) {
      var tx = function (s) { return b.r ? zymosHtml(s) : esc(s); };
      if (b.t === "p") h += '<p class="pr-p"><span class="pr-nr">' + esc(b.nr) + "</span> " + tx(b.tekstas) + "</p>";
      else if (b.t === "pp") h += '<p class="pr-pp">' + tx(b.tekstas) + "</p>";
      else if (b.t === "f") h += '<p class="pr-f">' + zymosHtml(b.tekstas) + "</p>";
      else if (b.t === "a") h += '<div class="pr-a"><p>' + esc(formuleje(t)) + "</p>" + b.eilutes.map(function (x, i) { return "<p>" + zymosHtml(x[0]) + " - " + esc(x[1]) + (i === b.eilutes.length - 1 ? "." : ";") + "</p>"; }).join("") + "</div>";
      else if (b.t === "l") {
        h += (b.pavadinimas ? '<p class="pr-lpav">' + esc(b.pavadinimas) + "</p>" : "") + '<div class="pr-lent"><table><thead><tr>' +
          b.antrastes.map(function (a, i) { return '<th style="width:' + (+b.plociai[i] || 0) + '%">' + tx(a) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          b.eilutes.map(function (r, ri) {
            var pus = (b.suma && ri === b.eilutes.length - 1) || (b.pusjuodes || []).indexOf(ri) >= 0;
            return "<tr" + (pus ? ' class="pr-suma"' : "") + ">" + r.map(function (c) { return "<td>" + tx(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>";
      }
      else if (b.t === "ps") h += b.eilutes.map(function (x) { return '<p class="pr-pp">' + esc(x) + "</p>"; }).join("");
      else if (b.t === "d") h += '<p class="pr-d">' + esc(b.tekstas) + "</p>";
    });
    return h;
  }

  /* Blokai -> docx Blob (Promise). o: { gulscias, pastaba (į failo savybes), kurejas }.
     Forma (pagal LITGRID skelbiamus priedus): Arial 10 pt, A4; stačias - paraštės 30 / 10 / 20 / 20 mm (kairė / dešinė / viršus / apačia),
     gulsčias (vidaus suvestinė) - po 20 mm. Šriftas ir dydis - iš dokumento stilių (externalStyles), ne kiekvienoje atkarpoje: docx.js
     w:rFonts rašo po w:sz, o ECMA-376 rPr tvarka - atvirkščia. „Laikyti su kitu“ rašoma tik kai reikia (docx.js išjungtai savybei įrašo
     w:val="false"). Uždaromoji kabutė po skliausto ar skyrybos ženklo („... (mėn.)“): Pages prieš ją leidžia eilutės lūžį - tarp jų dedamas
     nulinio pločio nelaužomas ženklas U+200D (Word „No-Width Non Break“; matuota Pages programoje). */
  function docx(t, o) {
    o = o || {};
    if (!root.docx) return Promise.reject(new Error("Word biblioteka neįkelta"));
    if (!root.GP_DOCX_STILIAI) return Promise.reject(new Error("Word stilių failas neįkeltas"));
    var D = root.GP_DOCX_STILIAI.oficialus(root.docx);
    var SRIFTAS = "Arial", DYDIS = 20, gul = !!o.gulscias;
    var A4 = { w: 11906, h: 16838 };
    var MARGIN = gul ? { top: 1134, bottom: 1134, left: 1134, right: 1134 } : { top: 1134, bottom: 1134, left: 1701, right: 567 };
    var usable = (gul ? A4.h : A4.w) - MARGIN.left - MARGIN.right;
    // Iš proporcijų -> DXA; paskutinį stulpelį pakoreguoja, kad suma tiksliai === usable.
    var dxaCols = function (fr) {
      var viso = fr.reduce(function (a, b) { return a + b; }, 0);
      var c = fr.map(function (x) { return Math.round(x / viso * usable); });
      c[c.length - 1] += usable - c.reduce(function (a, b) { return a + b; }, 0);
      return c;
    };
    var beLuzio = function (x) { return String(x == null ? "" : x).replace(/([^\s\p{L}\p{N}])“/gu, "$1‍“"); };
    var run = function (text, p) { return new D.TextRun(Object.assign({ text: beLuzio(text) }, p || {})); };
    var runs = function (text, p, rich) {
      return rich ? zymuDalys(text).map(function (x) { return run(x.t, Object.assign({}, p || {}, x.sub ? { subScript: true } : (x.sup ? { superScript: true } : {}))); }) : [run(text, p)];
    };
    var par = function (children, p) { return new D.Paragraph(Object.assign({ children: children, spacing: { after: 120 } }, p || {})); };
    var cell = function (text, c) {
      return new D.TableCell({
        children: [new D.Paragraph({ children: runs(text, c.run, c.rich), alignment: D.AlignmentType.LEFT, keepNext: c.keepNext ? true : undefined })],
        width: { size: c.w, type: D.WidthType.DXA }, shading: c.fill ? root.GP_DOCX_STILIAI.fonas(D) : undefined,
        verticalAlign: D.VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 100, right: 100 } });
    };
    var ch = [], B = t.blokai || [];
    if (t.priedas) ch.push(par([run(t.priedas)], { alignment: D.AlignmentType.RIGHT }));
    ch.push(par([run(t.pavadinimas, { bold: true })], { alignment: D.AlignmentType.CENTER, spacing: { before: t.priedas ? 240 : 0, after: t.pirkimas ? 80 : 240 } }));
    if (t.pirkimas) ch.push(par([run(t.pirkimas)], { alignment: D.AlignmentType.CENTER, spacing: { after: 240 } }));
    B.forEach(function (b, bi) {
      var kitas = B[bi + 1];
      var laikyk = !!kitas && (kitas.t === "f" || kitas.t === "a" || kitas.t === "l");   // punktas nelieka vienas puslapio apačioje be savo formulės ar lentelės
      if (b.t === "p") ch.push(par([run(b.nr + " ")].concat(runs(b.tekstas, null, b.r)), { alignment: D.AlignmentType.BOTH, keepNext: laikyk || undefined }));
      else if (b.t === "pp") ch.push(par(runs(b.tekstas, null, b.r), { alignment: D.AlignmentType.BOTH, indent: { left: 284 }, keepNext: (laikyk && kitas.t === "l") || undefined }));
      else if (b.t === "f") ch.push(par(runs(b.tekstas, { italics: true }, true), { alignment: D.AlignmentType.CENTER, spacing: { before: 60, after: 120 }, keepNext: laikyk || undefined }));
      else if (b.t === "a") {
        ch.push(par([run(formuleje(t), { italics: true })], { indent: { left: 284 }, spacing: { after: 40 }, keepNext: true }));
        b.eilutes.forEach(function (x, i) {
          var pask = i === b.eilutes.length - 1;
          ch.push(par(runs(x[0], { italics: true }, true).concat([run(" - " + x[1] + (pask ? "." : ";"), { italics: true })]), { indent: { left: 284 }, spacing: { after: pask ? 120 : 40 }, keepNext: pask ? undefined : true }));
        });
      }
      else if (b.t === "l") {
        var w = dxaCols(b.plociai);
        if (b.pavadinimas) ch.push(par([run(b.pavadinimas, { italics: true, size: 18 })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 60 }, keepNext: true }));
        var rows = [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.antrastes.map(function (h, i) { return cell(h, { w: w[i], fill: true, rich: b.r, run: { bold: true }, keepNext: true }); }) })];
        b.eilutes.forEach(function (r, ri) {
          var pus = (b.suma && ri === b.eilutes.length - 1) || (b.pusjuodes || []).indexOf(ri) >= 0;
          rows.push(new D.TableRow({ cantSplit: true, children: r.map(function (c, i) { return cell(c, { w: w[i], rich: b.r, run: pus ? { bold: true } : null }); }) }));
        });
        ch.push(new D.Table({ columnWidths: w, width: { size: usable, type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED, rows: rows }));
        ch.push(new D.Paragraph({ children: [run("", { size: 12 })], spacing: { after: 60 } }));   // tarpas po lentelės
      }
      else if (b.t === "ps") b.eilutes.forEach(function (x) { ch.push(par([run(x)], { spacing: { before: 360, after: 0 } })); });
      else if (b.t === "d") ch.push(par([run(b.tekstas, { bold: true })], { spacing: { before: 280, after: 140 }, keepNext: kitas ? true : undefined }));   // dalies antraštė nelieka viena puslapio apačioje
    });
    var puslapis = gul ? { size: { width: A4.w, height: A4.h, orientation: D.PageOrientation.LANDSCAPE }, margin: MARGIN }   // docx.js gulsčiam lapui matmenis sukeičia pats
                       : { size: { width: A4.w, height: A4.h }, margin: MARGIN };
    // o.di - { modulis }: DI požymiai (shared/di-zymejimas.js), kai dokumento tekstas parengtas naudojant DI (anglų kalbos priedas)
    var di = o.di && root.GP_DI && root.GP_DI.docx ? root.GP_DI.docx(o.di) : null, diSav = {};
    if (di) { diSav.keywords = di.keywords; diSav.customProperties = di.customProperties; }
    var doc = new D.Document(Object.assign(diSav, { creator: o.kurejas || "G-Procure", title: t.pavadinimas, description: (o.pastaba || "") + (di ? " " + di.description : ""),
      externalStyles: root.GP_DOCX_STILIAI.xml({ font: SRIFTAS, size: DYDIS, oficialus: true }), sections: [{ properties: { page: puslapis }, children: ch }] }));
    return D.Packer.toBlob(doc);
  }

  /* Duomenys iš saugyklos -> saugus turinys: tik žinomi blokai, tekstai - eilutės su ribomis; netinkama sandara - null. */
  var RIBOS = { blokai: 300, tekstas: 4000, formule: 400, eilutes: 120, stulpeliai: 10, langelis: 2000, aiskinimai: 40 };
  /* Formulės žymenų paaiškinimų antraštė: turinio kalba t.kalba ("en" - anglų; lauko nėra - lietuvių, kaip pirkimo kortelės metodikoje) */
  function formuleje(t) { return t && t.kalba === "en" ? "In the formula:" : "Pateiktoje formulėje:"; }
  function forma(t) {
    if (!t || typeof t !== "object" || !Array.isArray(t.blokai)) return null;
    var s = function (x, n) { return typeof x === "string" ? x.slice(0, n) : (typeof x === "number" && isFinite(x) ? String(x) : ""); };
    var out = { priedas: s(t.priedas, 120), pavadinimas: s(t.pavadinimas, 300), pirkimas: s(t.pirkimas, 400), blokai: [] };
    if (t.kalba === "en") out.kalba = "en";
    t.blokai.slice(0, RIBOS.blokai).forEach(function (b) {
      if (!b || typeof b !== "object") return;
      if (b.t === "p") { var nr = s(b.nr, 8); if (/^\d{1,3}\.$/.test(nr) && s(b.tekstas, 1)) out.blokai.push({ t: "p", nr: nr, tekstas: s(b.tekstas, RIBOS.tekstas), r: b.r === true }); }
      else if (b.t === "pp") { if (s(b.tekstas, 1)) out.blokai.push({ t: "pp", tekstas: s(b.tekstas, RIBOS.tekstas), r: b.r === true }); }
      else if (b.t === "f") { if (s(b.tekstas, 1)) out.blokai.push({ t: "f", tekstas: s(b.tekstas, RIBOS.formule) }); }
      else if (b.t === "a") {
        var e = (Array.isArray(b.eilutes) ? b.eilutes : []).slice(0, RIBOS.aiskinimai).filter(function (x) { return Array.isArray(x) && x.length >= 2; }).map(function (x) { return [s(x[0], 40), s(x[1], 800)]; });
        if (e.length) out.blokai.push({ t: "a", eilutes: e });
      }
      else if (b.t === "l") {
        var a = (Array.isArray(b.antrastes) ? b.antrastes : []).slice(0, RIBOS.stulpeliai).map(function (x) { return s(x, 300); });
        if (!a.length) return;
        var eil = (Array.isArray(b.eilutes) ? b.eilutes : []).slice(0, RIBOS.eilutes).filter(Array.isArray)
          .map(function (r) { return a.map(function (_, i) { return s(r[i], RIBOS.langelis); }); });
        var pl = Array.isArray(b.plociai) && b.plociai.length === a.length && b.plociai.every(function (x) { return typeof x === "number" && isFinite(x) && x > 0; })
          ? b.plociai.slice() : a.map(function () { return 100 / a.length; });
        var l = { t: "l", antrastes: a, eilutes: eil, plociai: pl };
        if (s(b.pavadinimas, 1)) l.pavadinimas = s(b.pavadinimas, 300);
        if (b.suma === true) l.suma = true;
        if (b.r === true) l.r = true;
        if (Array.isArray(b.pusjuodes)) l.pusjuodes = b.pusjuodes.filter(function (x) { return Number.isInteger(x) && x >= 0 && x < eil.length; }).slice(0, RIBOS.eilutes);
        out.blokai.push(l);
      }
      else if (b.t === "d") { if (s(b.tekstas, 1)) out.blokai.push({ t: "d", tekstas: s(b.tekstas, 400) }); }
      else if (b.t === "ps") {
        var pe = (Array.isArray(b.eilutes) ? b.eilutes : []).slice(0, 12).map(function (x) { return s(x, 300); }).filter(Boolean);
        if (pe.length) out.blokai.push({ t: "ps", eilutes: pe });
      }
    });
    return out.blokai.length && out.pavadinimas ? out : null;
  }

  /* Blokai -> elementai vertinimo metodikos skaitytuvui (PP-salygos/metodika.js analizuok): lentelės eilutė - { cells }, kita - { text } */
  function elementai(t) {
    var el = [];
    tekstasBeLenteliu(t, el);
    return el;
  }
  function tekstasBeLenteliu(t, el) {
    if (t.priedas) el.push({ text: t.priedas });
    el.push({ text: t.pavadinimas });
    (t.blokai || []).forEach(function (b) {
      var tx = function (s) { return b.r ? beZymu(s) : s; };
      if (b.t === "p") el.push({ text: b.nr + " " + tx(b.tekstas) });
      else if (b.t === "pp") el.push({ text: tx(b.tekstas) });
      else if (b.t === "d") el.push({ text: b.tekstas, dalis: true });
      else if (b.t === "f") el.push({ text: beZymu(b.tekstas) });
      else if (b.t === "a") b.eilutes.forEach(function (x) { el.push({ text: beZymu(x[0]) + " - " + x[1] }); });
      else if (b.t === "l") { el.push({ cells: b.antrastes.map(tx) }); b.eilutes.forEach(function (r) { el.push({ cells: r.map(tx) }); }); }
    });
  }

  /* Tas pats turinys su kita viršutine eilute („SPS 10 priedas“) - numerį žino tik pirkimo sąlygų rengėjas ar generatorius */
  function suEilute(t, eilute) { return Object.assign({}, t, { priedas: String(eilute || "") }); }

  root.GP_VERTINIMO_PRIEDAS = { zymuDalys: zymuDalys, beZymu: beZymu, zymosHtml: zymosHtml, tekstas: tekstas, html: html, docx: docx, forma: forma, elementai: elementai, suEilute: suEilute, RIBOS: RIBOS };
})(typeof window !== "undefined" ? window : this);
