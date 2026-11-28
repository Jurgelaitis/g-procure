/* ==========================================================================
 * PP-sutartys/dokumentas.js - dokumento turinys -> peržiūra, tekstas ir Word failas (GP_PAKEITIMU_DOK)
 *
 * Turinį (blokų sąrašą) sudaro pakeitimai.js. Iš tų pačių blokų - html() peržiūrai, tekstas() kopijavimui ir
 * docx() Word failui, todėl peržiūra nuo failo nesiskiria.
 * Blokai: antraste, centras, p (pusjuodis), raide (zyme), punktas (nr), bruksnys, citata, papunktis (nr),
 *         lentele (plociai procentais, antrastes, eilutes, paskutinePusjuode), parasai (kaire, desine).
 * Word: oficialus pirkimo dokumento stilius (shared/docx-stiliai.js) - A4, Arial 10 pt, be spalvų, lentelės DXA ir
 * FIXED per teksto plotį, antraštės eilutė šviesiai pilka, be ilgųjų brūkšnių.
 * ========================================================================== */
;(function (global) {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function html(dok) {
    return (dok && dok.blokai || []).map(function (b) {
      if (b.t === "antraste") return '<p class="dk-antraste">' + esc(b.tekstas) + "</p>";
      if (b.t === "centras") return '<p class="dk-centras">' + esc(b.tekstas) + "</p>";
      if (b.t === "p") return '<p class="dk-p' + (b.pusjuodis ? " dk-b" : "") + '">' + esc(b.tekstas) + "</p>";
      if (b.t === "raide" || b.t === "punktas" || b.t === "papunktis")
        return '<p class="dk-' + b.t + '"><span class="dk-nr">' + esc(b.t === "raide" ? b.zyme : b.nr) + "</span> " + esc(b.tekstas) + "</p>";
      if (b.t === "bruksnys") return '<p class="dk-bruksnys"><span class="dk-nr">-</span> ' + esc(b.tekstas) + "</p>";
      if (b.t === "citata") return '<p class="dk-citata">' + esc(b.tekstas) + "</p>";
      if (b.t === "lentele") {
        var w = b.plociai || [], col = "<colgroup>" + w.map(function (x) { return '<col style="width:' + (+x || 0) + '%">'; }).join("") + "</colgroup>";
        var th = b.antrastes ? "<thead><tr>" + b.antrastes.map(function (x) { return '<th scope="col">' + esc(x) + "</th>"; }).join("") + "</tr></thead>" : "";
        var n = b.eilutes.length;
        return '<div class="dk-lent"><table>' + col + th + "<tbody>" + b.eilutes.map(function (r, i) {
          var pus = b.paskutinePusjuode && i === n - 1;
          return "<tr" + (pus ? ' class="dk-b"' : "") + ">" + r.map(function (c, j) { return (!b.antrastes && j === 0 ? '<th scope="row">' + esc(c) + "</th>" : "<td>" + esc(c) + "</td>"); }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
      }
      if (b.t === "parasai") return '<div class="dk-parasai"><p>' + esc(b.kaire) + "</p><p>" + esc(b.desine) + "</p></div>";
      return "";
    }).join("");
  }

  function tekstas(dok) {
    return (dok && dok.blokai || []).map(function (b) {
      if (b.t === "raide") return b.zyme + " " + b.tekstas;
      if (b.t === "punktas" || b.t === "papunktis") return b.nr + " " + b.tekstas;
      if (b.t === "bruksnys") return "- " + b.tekstas;
      if (b.t === "lentele") return (b.antrastes ? [b.antrastes] : []).concat(b.eilutes).map(function (r) { return r.join("\t"); }).join("\n");
      if (b.t === "parasai") return b.kaire + "\t" + b.desine;
      return b.tekstas || "";
    }).join("\n");
  }

  /* Word ir Pages tekstą laužo ties tarpu ir brūkšneliu: sumos (6 275 605,17), procentai, „Nr. X“ ir numeriai su skaitmenimis
     (24VP-SUT-0317, LT-01100) nelaužomi. Tarpams - nelaužomas tarpas (U+00A0), brūkšneliui - jungiamieji ženklai be pločio (U+2060)
     iš abiejų pusių: Pages Word elemento „noBreakHyphen“ nerodo visai (brūkšnelis dingsta), o U+2060 išlaiko tikrą brūkšnelį ir PDF
     tekste (paieška pagal numerį veikia). Tik Word failui - kopijuojamas tekstas ir peržiūra nekeičiami. */
  function nelauzomi(t) {
    return t.split(/(\s+)/).map(function (w) { return /\d/.test(w) ? w.replace(/([\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, "$1\u2060-\u2060") : w; }).join("")
      .replace(/(\d) (?=\d{3}(?!\d))/g, "$1\u00A0").replace(/(\d) (?=%|Eur\b)/g, "$1\u00A0").replace(/\bNr\. (?=\S)/g, "Nr.\u00A0");
  }

  var A4 = { w: 11906, h: 16838 }, PARASTES = { top: 1134, bottom: 1134, left: 1701, right: 567 }, PLOTIS = A4.w - PARASTES.left - PARASTES.right;

  /* docx(dok, { pastaba }) -> Promise<Blob>. Reikia docx.js (window.docx) ir GP_DOCX_STILIAI. */
  function docx(dok, o) {
    o = o || {};
    if (!global.docx || !global.GP_DOCX_STILIAI) return Promise.reject(new Error("Word biblioteka neįsikėlė"));
    var S = global.GP_DOCX_STILIAI, D = S.oficialus(global.docx), ch = [];
    function run(t, p) { return new D.TextRun(Object.assign({ text: nelauzomi(String(t == null ? "" : t)) }, p || {})); }
    function par(vaikai, p) { return new D.Paragraph(Object.assign({ children: vaikai, spacing: { after: 120 }, alignment: D.AlignmentType.BOTH }, p || {})); }
    function sunumeruotas(nr, t, kaire, kabanti, p) {
      return par([run(nr + "\t" + t)], Object.assign({ indent: { left: kaire, hanging: kabanti }, tabStops: [{ type: D.TabStopType.LEFT, position: kaire }] }, p || {}));
    }
    function lentele(b) {
      var w = (b.plociai || []).map(function (x) { return Math.floor(PLOTIS * x / 100); });
      w[w.length - 1] += PLOTIS - w.reduce(function (a, x) { return a + x; }, 0);
      function cele(t, i, pus, fonas) {
        return new D.TableCell({ children: [new D.Paragraph({ children: [run(t, pus ? { bold: true } : null)], alignment: D.AlignmentType.LEFT })], width: { size: w[i], type: D.WidthType.DXA },
          shading: fonas ? S.fonas(D) : undefined, verticalAlign: D.VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 100, right: 100 } });
      }
      var rows = [], n = b.eilutes.length;
      if (b.antrastes) rows.push(new D.TableRow({ tableHeader: true, cantSplit: true, children: b.antrastes.map(function (x, i) { return cele(x, i, true, true); }) }));
      b.eilutes.forEach(function (r, ri) {
        var pus = b.paskutinePusjuode && ri === n - 1;
        rows.push(new D.TableRow({ cantSplit: true, children: r.map(function (c, i) { return cele(c, i, pus || (!b.antrastes && i === 0), !b.antrastes && i === 0); }) }));
      });
      ch.push(new D.Table({ columnWidths: w, width: { size: PLOTIS, type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED, rows: rows }));
      ch.push(new D.Paragraph({ children: [run("")], spacing: { after: 60 } }));
    }
    (dok.blokai || []).forEach(function (b, i, visi) {
      var kitas = visi[i + 1] || {};
      if (b.t === "antraste") ch.push(par([run(b.tekstas, { bold: true })], { alignment: D.AlignmentType.CENTER, spacing: { after: kitas.t === "antraste" ? 0 : 200 }, keepNext: true }));
      else if (b.t === "centras") ch.push(par([run(b.tekstas)], { alignment: D.AlignmentType.CENTER, spacing: { after: kitas.t === "centras" ? 0 : 240 } }));
      else if (b.t === "p") ch.push(par([run(b.tekstas, b.pusjuodis ? { bold: true } : null)], { keepNext: b.pusjuodis ? true : undefined, spacing: { before: b.pusjuodis ? 120 : 0, after: 120 } }));
      else if (b.t === "raide") ch.push(sunumeruotas(b.zyme, b.tekstas, 426, 426));
      else if (b.t === "punktas") ch.push(sunumeruotas(b.nr, b.tekstas, 426, 426, { keepNext: /:$/.test(b.tekstas) ? true : undefined }));
      else if (b.t === "papunktis") ch.push(sunumeruotas(b.nr, b.tekstas, 993, 567));
      else if (b.t === "bruksnys") ch.push(sunumeruotas("-", b.tekstas, 710, 284, { spacing: { after: 60 } }));
      else if (b.t === "citata") ch.push(par([run(b.tekstas)], { indent: { left: 426 }, spacing: { after: 60 } }));
      else if (b.t === "lentele") lentele(b);
      else if (b.t === "parasai") {
        var p = Math.floor(PLOTIS / 2), be = { style: D.BorderStyle.NONE, size: 0, color: "auto" }, remeliai = { top: be, bottom: be, left: be, right: be };
        var c = function (t, plotis) { return new D.TableCell({ children: [new D.Paragraph({ children: [run(t)], alignment: D.AlignmentType.LEFT, spacing: { before: 360, after: 720 } })], width: { size: plotis, type: D.WidthType.DXA }, borders: remeliai }); };
        ch.push(new D.Table({ columnWidths: [p, PLOTIS - p], width: { size: PLOTIS, type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED,
          borders: { top: be, bottom: be, left: be, right: be, insideHorizontal: be, insideVertical: be }, rows: [new D.TableRow({ cantSplit: true, children: [c(b.kaire, p), c(b.desine, PLOTIS - p)] })] }));
      }
    });
    var doc = new D.Document({ creator: "G-Procure", title: dok.pavadinimas || "", description: o.pastaba || "",
      externalStyles: S.xml({ font: "Arial", size: 20, oficialus: true }),
      sections: [{ properties: { page: { size: { width: A4.w, height: A4.h }, margin: PARASTES } }, children: ch }] });
    return D.Packer.toBlob(doc);
  }

  global.GP_PAKEITIMU_DOK = { html: html, tekstas: tekstas, docx: docx, nelauzomi: nelauzomi, PLOTIS: PLOTIS };
})(typeof window !== "undefined" ? window : this);
