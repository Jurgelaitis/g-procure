/* ============================================================================
 * G-Procure  shared/docx-stiliai.js   (v1.0)
 * ----------------------------------------------------------------------------
 * Word dokumentų stilių failas (`word/styles.xml`) VISIEMS moduliams.
 *
 * KODĖL. Patikrinta 2026-09-22 su septyniais bandomaisiais dokumentais: Pages
 * IGNORUOJA tiesioginį pastraipų formatavimą (`w:jc`, `w:spacing`, `w:ind`), jei
 * `styles.xml` neturi numatytojo pastraipų stiliaus (`Normal` su `w:default="1"`).
 * docx.js tokio stiliaus neišrašo ir per API to padaryti negali, todėl mūsų
 * dokumentuose lygiuotė dingdavo: antraštės ir dešininės eilutės atsidurdavo
 * kairėje, tarpai išnykdavo. Word ir sistemos peržiūra to nerodė - tik Pages,
 * kuriuo dokumentus žiūri naudotojas.
 *
 * KĄ DAROME. Paduodame docx.js savo `styles.xml` per `externalStyles`. Jame yra
 * numatytieji stiliai (`Normal`, `DefaultParagraphFont`, `TableNormal`, `NoList`),
 * `docDefaults` su modulio šriftu ir dydžiu bei VISI docx.js stiliai (Title,
 * Heading1-6, Strong, ListParagraph, Hyperlink, Footnote*), kad niekas neprarastų
 * dabartinės išvaizdos.
 *
 * DĖMESIO: `externalStyles` biblioteką verčia IGNORUOTI `styles` parinktį - jos
 * kartu nenaudok. Modulio stilius perduok per `stiliai` sąrašą (žr. žemiau).
 *
 * NAUDOJIMAS:
 *   <script src="../shared/docx-stiliai.js"></script>
 *   new D.Document({
 *     externalStyles: GP_DOCX_STILIAI.xml({ font: "Times New Roman", size: 22 }),
 *     sections: [...]
 *   });
 *
 * Savi pastraipų stiliai (perrašo to paties `id` bazinį):
 *   GP_DOCX_STILIAI.xml({ font: "Nunito Sans", size: 21, stiliai: [
 *     { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
 *       run: { size: 28, bold: true, color: "00A072", font: "Nunito Sans" },
 *       paragraph: { spacing: { before: 240, after: 120 }, alignment: "center" } }
 *   ]});
 * ==========================================================================*/
(function (global) {
  "use strict";

  /* docx.js 8.5.0 sugeneruojami stiliai - perimti pažodžiui, kad dokumentai
     atrodytų taip pat, kaip iki 2026-09-22. */
  var BAZE = "<w:style w:type=\"paragraph\" w:styleId=\"Title\"><w:name w:val=\"Title\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:sz w:val=\"56\"/><w:szCs w:val=\"56\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Heading1\"><w:name w:val=\"Heading 1\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:color w:val=\"2E74B5\"/><w:sz w:val=\"32\"/><w:szCs w:val=\"32\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Heading2\"><w:name w:val=\"Heading 2\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:color w:val=\"2E74B5\"/><w:sz w:val=\"26\"/><w:szCs w:val=\"26\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Heading3\"><w:name w:val=\"Heading 3\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:color w:val=\"1F4D78\"/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Heading4\"><w:name w:val=\"Heading 4\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:i/><w:iCs/><w:color w:val=\"2E74B5\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Heading5\"><w:name w:val=\"Heading 5\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:color w:val=\"2E74B5\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Heading6\"><w:name w:val=\"Heading 6\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:color w:val=\"1F4D78\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Strong\"><w:name w:val=\"Strong\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:rPr><w:b/><w:bCs/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"ListParagraph\"><w:name w:val=\"List Paragraph\"/><w:basedOn w:val=\"Normal\"/><w:qFormat/></w:style><w:style w:type=\"character\" w:styleId=\"Hyperlink\"><w:name w:val=\"Hyperlink\"/><w:basedOn w:val=\"DefaultParagraphFont\"/><w:uiPriority w:val=\"99\"/><w:unhideWhenUsed/><w:rPr><w:u w:val=\"single\"/><w:color w:val=\"0563C1\"/></w:rPr></w:style><w:style w:type=\"character\" w:styleId=\"FootnoteReference\"><w:name w:val=\"footnote reference\"/><w:basedOn w:val=\"DefaultParagraphFont\"/><w:uiPriority w:val=\"99\"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr><w:vertAlign w:val=\"superscript\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"FootnoteText\"><w:name w:val=\"footnote text\"/><w:basedOn w:val=\"Normal\"/><w:link w:val=\"FootnoteTextChar\"/><w:uiPriority w:val=\"99\"/><w:semiHidden/><w:unhideWhenUsed/><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/></w:pPr><w:rPr><w:sz w:val=\"20\"/><w:szCs w:val=\"20\"/></w:rPr></w:style><w:style w:type=\"character\" w:styleId=\"FootnoteTextChar\"><w:name w:val=\"Footnote Text Char\"/><w:basedOn w:val=\"DefaultParagraphFont\"/><w:link w:val=\"FootnoteText\"/><w:uiPriority w:val=\"99\"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr><w:sz w:val=\"20\"/><w:szCs w:val=\"20\"/></w:rPr></w:style>";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function runXml(r) {
    if (!r) return "";
    var x = "";
    if (r.bold) x += "<w:b/><w:bCs/>";
    if (r.italics) x += "<w:i/><w:iCs/>";
    if (r.color) x += '<w:color w:val="' + esc(r.color) + '"/>';
    if (r.size) x += '<w:sz w:val="' + Number(r.size) + '"/><w:szCs w:val="' + Number(r.size) + '"/>';
    if (r.font) {
      var f = esc(r.font);
      x += '<w:rFonts w:ascii="' + f + '" w:eastAsia="' + f + '" w:hAnsi="' + f + '" w:cs="' + f + '"/>';
    }
    return x ? "<w:rPr>" + x + "</w:rPr>" : "";
  }

  function paragraphXml(p) {
    if (!p) return "";
    var x = "";
    if (p.spacing) {
      var s = "";
      if (p.spacing.before != null) s += ' w:before="' + Number(p.spacing.before) + '"';
      if (p.spacing.after != null) s += ' w:after="' + Number(p.spacing.after) + '"';
      if (p.spacing.line != null) s += ' w:line="' + Number(p.spacing.line) + '" w:lineRule="auto"';
      if (s) x += "<w:spacing" + s + "/>";
    }
    if (p.indent && p.indent.left != null) x += '<w:ind w:left="' + Number(p.indent.left) + '"/>';
    if (p.alignment) x += '<w:jc w:val="' + esc(p.alignment) + '"/>';   // spacing pirma, jc po jo - ECMA-376 tvarka
    return x ? "<w:pPr>" + x + "</w:pPr>" : "";
  }

  function stiliusXml(s) {
    return '<w:style w:type="paragraph" w:styleId="' + esc(s.id) + '">' +
      '<w:name w:val="' + esc(s.name || s.id) + '"/>' +
      '<w:basedOn w:val="' + esc(s.basedOn || "Normal") + '"/>' +
      '<w:next w:val="' + esc(s.next || "Normal") + '"/>' +
      (s.quickFormat === false ? "" : "<w:qFormat/>") +
      paragraphXml(s.paragraph) + runXml(s.run) + "</w:style>";
  }

  function xml(o) {
    o = o || {};
    /* Šriftas ir dydis NEPRIVALOMI: jei modulis jų nenustatinėjo (pvz. PP-ts), jų
       nerašom ir čia - kitaip dokumento išvaizda pasikeistų. */
    var font = o.font ? esc(o.font) : null;
    var size = o.size ? Number(o.size) : null;
    var savi = o.stiliai || [];

    /* Bazė be tų stilių, kuriuos modulis perrašo savo id. */
    var baze = BAZE;
    for (var i = 0; i < savi.length; i++) {
      var re = new RegExp('<w:style [^>]*w:styleId="' + savi[i].id + '">[\\s\\S]*?</w:style>');
      baze = baze.replace(re, "");
    }

    var numatytieji =
      "<w:docDefaults><w:rPrDefault><w:rPr>" +
      (font ? '<w:rFonts w:ascii="' + font + '" w:eastAsia="' + font + '" w:hAnsi="' + font + '" w:cs="' + font + '"/>' : "") +
      (size ? '<w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/>' : "") +
      '<w:lang w:val="lt-LT" w:eastAsia="lt-LT" w:bidi="ar-SA"/>' +
      "</w:rPr></w:rPrDefault>" +
      '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
      "</w:docDefaults>" +
      /* ŠITAS `w:default="1"` ir yra visa esmė - be jo Pages meta tiesioginį formatavimą. */
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont">' +
      '<w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>' +
      '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/>' +
      '<w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/>' +
      '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>' +
      '<w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
      '<w:style w:type="numbering" w:default="1" w:styleId="NoList"><w:name w:val="No List"/>' +
      '<w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/></w:style>';

    var mano = "";
    for (var j = 0; j < savi.length; j++) mano += stiliusXml(savi[j]);

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ' +
      'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 w15">' +
      numatytieji + baze + mano + "</w:styles>";
  }

  global.GP_DOCX_STILIAI = { version: "1.0", xml: xml };
})(typeof window !== "undefined" ? window : this);
