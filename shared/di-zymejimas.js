/* ==========================================================================
   G-Procure: DI sugeneruoto turinio žymėjimas (window.GP_DI, 2026-10-05)

   Vienas šaltinis VISIEMS moduliams, kurie rodo ar eksportuoja dirbtinio intelekto (DI) parengtą tekstą.
   Pagrindas: ES DI akto (Reglamentas (ES) 2024/1689) 50 straipsnio 2 dalis - tekstinį turinį generuojančių
   DI sistemų išvediniai žymimi kompiuterio skaitomu formatu, kad būtų galima atpažinti, jog jie sugeneruoti
   dirbtinai; sistemoms, pateiktoms rinkai iki 2026-08-02, - ne vėliau kaip nuo 2026-12-02 (111 straipsnio
   4 dalis, įterpta Reglamentu (ES) 2026/1744). Naudotojo sprendimas (2026-10-05):
   - Word faile - savas požymis „Parengta naudojant DI“ (docProps/custom.xml) ir aprašas (docProps/core.xml);
   - matoma poraštė „Dalis teksto parengta naudojant DI (Claude). Prieš skelbiant turi būti peržiūrėta.“;
   - ekrane - duomenų atributas data-di="sugeneruota" ir matoma žyma („DI atsakymas“ arba modulio tekstas).

   API:
     GP_DI.docx({ modulis, modelis, papildomai })   -> { customProperties, description, keywords } docx.js Document parinktims
     GP_DI.savybes({ modulis, modelis, turinys, papildomai }) -> [{ name, value }] (tas pats sąrašas JSZip moduliams;
                                                        turinys - kai DI tik siūlė, pvz. PP-salygos)
     GP_DI.customXml(savybes)                        -> docProps/custom.xml tekstas (moduliams, kurie Word failą kuria patys)
     GP_DI.wordHtml({ modulis, modelis })            -> <meta> ir <xml> požymiai Word HTML (.doc) failo <head>
     GP_DI.metaHtml({ modulis, modelis })            -> tik <meta> požymiai (.html failui - <xml> naršyklė rodytų kaip tekstą)
     GP_DI.poraste(kalba)                            -> matomos poraštės sakinys
     GP_DI.zyme({ tekstas, kalba })                  -> HTML žyma (<span class="gp-di-zyme" data-di="sugeneruota">)
     GP_DI.pazymek(el, { modulis, modelis, zyme })   -> pažymi ekrano elementą (data-di, data-di-modelis), nebūtinai su žyma
     GP_DI.POZYMIS, GP_DI.ZYME, GP_DI.PORASTE        -> tekstai (LT / EN)
   Modelis - modulio naudotas (PP-ts pasirinkiklis) arba GP_AI_PROXY.MODEL (shared/ai-proxy.js DEFAULT_MODEL). Nieko nesiunčia ir nesaugo.
   ========================================================================== */
(function () {
  "use strict";

  var POZYMIS = "Parengta naudojant DI";
  var ZYME = { lt: "DI atsakymas", en: "AI response" };
  var PORASTE = {
    lt: "Dalis teksto parengta naudojant DI (Claude). Prieš skelbiant turi būti peržiūrėta.",
    en: "Part of the text was prepared using AI (Claude). It must be reviewed before publication."
  };

  function kalba(k) {
    if (k === "en" || k === "lt") return k;
    var l = (document.documentElement.getAttribute("lang") || "lt").toLowerCase();
    return l.indexOf("en") === 0 ? "en" : "lt";
  }
  function modelis(m) {
    if (m) return String(m);
    var p = window.GP_AI_PROXY;
    return (p && (p.MODEL || p.DEFAULT_MODEL)) || "Claude";
  }
  function data() {
    if (window.GP_WORKDAYS && typeof window.GP_WORKDAYS.siandien === "function") return window.GP_WORKDAYS.siandien();
    if (window.GP_EKSPORTAS && typeof window.GP_EKSPORTAS.siandien === "function") return window.GP_EKSPORTAS.siandien();
    var d = new Date();   // vietinė data, ne UTC (CLAUDE.md: Datos)
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Word požymiai: pavadinimai be tarpų ir diakritikų (kai kurios programos savų požymių pavadinimuose jų nerodo) */
  function savybes(o) {
    o = o || {};
    var s = [
      { name: "DI_turinys", value: o.turinys || POZYMIS },
      { name: "DI_sistema", value: "G-Procure" + (o.modulis ? " - " + o.modulis : "") },
      { name: "DI_modelis", value: modelis(o.modelis) },
      { name: "DI_data", value: data() },
      { name: "DI_perziura", value: "Prieš skelbiant turi peržiūrėti žmogus" }
    ];
    (o.papildomai || []).forEach(function (p) { if (p && p.name) s.push({ name: String(p.name), value: String(p.value) }); });
    return s;
  }

  function docx(o) {
    return {
      customProperties: savybes(o),
      description: POZYMIS + " (G-Procure" + (o && o.modulis ? " - " + o.modulis : "") + ", " + modelis(o && o.modelis) + ")",
      keywords: "DI; dirbtinis intelektas; AI-generated"
    };
  }

  function xmlEsc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* docProps/custom.xml (OPC): fmtid - standartinis savų požymių identifikatorius, pid nuo 2 */
  function customXml(s) {
    var FMT = "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}";
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" ' +
      'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      (s || savybes()).map(function (p, i) {
        return '<property fmtid="' + FMT + '" pid="' + (i + 2) + '" name="' + xmlEsc(p.name) + '"><vt:lpwstr>' + xmlEsc(p.value) + '</vt:lpwstr></property>';
      }).join("") + "</Properties>";
  }

  /* Word HTML (.doc) failams: Word dokumento ir savi požymiai <xml> bloke (o: - Office vardų erdvė, dt: - tipai);
     <html> žymėje turi būti xmlns:o="urn:schemas-microsoft-com:office:office". Ir HTML meta - naršyklei ir paieškai. */
  function metaHtml(o) {
    var d = docx(o);
    return '<meta name="description" content="' + xmlEsc(d.description) + '">' +
      '<meta name="keywords" content="' + xmlEsc(d.keywords) + '">' +
      '<meta name="g-procure-di" content="' + xmlEsc(POZYMIS) + '">';
  }
  function wordHtml(o) {
    var s = savybes(o), d = docx(o);
    var vardas = function (n) { return String(n).replace(/[^A-Za-z0-9_]/g, "_"); };
    return metaHtml(o) +
      '<xml><o:DocumentProperties><o:Description>' + xmlEsc(d.description) + '</o:Description><o:Keywords>' + xmlEsc(d.keywords) + '</o:Keywords></o:DocumentProperties>' +
      '<o:CustomDocumentProperties xmlns:dt="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882">' +
      s.map(function (p) { return '<o:' + vardas(p.name) + ' dt:dt="string">' + xmlEsc(p.value) + '</o:' + vardas(p.name) + '>'; }).join("") +
      '</o:CustomDocumentProperties></xml>';
  }

  function poraste(k) { return PORASTE[kalba(k)]; }

  var STILIUS = ".gp-di-zyme{display:inline-flex;align-items:center;gap:4px;font:600 12px/1.4 var(--font-base,inherit);" +
    "color:var(--color-graphite,#2E3641);background:var(--color-graphite-5,#EFF1F1);border:1px solid var(--color-emerald,#00A072);" +
    "border-radius:999px;padding:1px 8px;white-space:nowrap;vertical-align:middle}" +
    ".gp-di-zyme svg{width:12px;height:12px;flex:none}" +
    "@media print{.gp-di-zyme{border-color:#000;background:none}}";
  function stilius() {
    if (document.getElementById("gp-di-stilius")) return;
    var st = document.createElement("style");
    st.id = "gp-di-stilius";
    st.textContent = STILIUS;
    (document.head || document.documentElement).appendChild(st);
  }
  var IKONA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/></svg>';

  function zyme(o) {
    o = o || {};
    stilius();
    var t = o.tekstas || ZYME[kalba(o.kalba)];
    return '<span class="gp-di-zyme" data-di="sugeneruota">' + IKONA + '<span>' + xmlEsc(t) + "</span></span>";
  }

  function pazymek(el, o) {
    if (!el) return el;
    o = o || {};
    el.setAttribute("data-di", "sugeneruota");
    el.setAttribute("data-di-modelis", modelis(o.modelis));
    if (o.modulis) el.setAttribute("data-di-sistema", "G-Procure - " + o.modulis);
    if (o.zyme && !el.querySelector(":scope > .gp-di-zyme")) {
      var w = document.createElement("div");
      w.innerHTML = zyme({ tekstas: typeof o.zyme === "string" ? o.zyme : null, kalba: o.kalba });
      el.insertBefore(w.firstChild, el.firstChild);
    }
    return el;
  }

  window.GP_DI = {
    POZYMIS: POZYMIS, ZYME: ZYME, PORASTE: PORASTE,
    savybes: savybes, docx: docx, customXml: customXml, wordHtml: wordHtml, metaHtml: metaHtml, poraste: poraste, zyme: zyme, pazymek: pazymek
  };
})();
