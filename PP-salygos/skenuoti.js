/* Skenuoti pirkimo dokumentai (GP_SKENUOTI; tobulinimo planas D5, 2026-10-20). Naujų darbuotojų testavimas: skenuota techninė specifikacija
   ar kvalifikacijos reikalavimai be teksto sluoksnio - tik įspėjimas, o lentelės ir sakiniai iš jų neperkeliami. Naudotojo sprendimas
   (2026-10-20): su tuo pačiu leidimu „Leisti DI skaityti šio pirkimo dokumentus?“ DI perskaito skenuotą dokumentą (kaip paraišką), nacionalinio
   saugumo pirkime - tik mygtuku. Teksto atpažinimo bibliotekos naršyklėje nededama (didelė, naujas saugumo paviršius - plano sprendimas).
   - perskaityk(file): failas paruošiamas kaip paraiška (GP_PARAISKA.paruostiFaila: PDF - kaip yra, paveikslėlis - JPEG PDF) ir per G-Procure
     serverį siunčiamas į Claude API; DI grąžina dokumento tekstą pastraipomis ir lentelėmis (JSON), nieko neperrašydamas ir nepridėdamas;
   - atsakymas tikrinamas: tik žinomi elementai ir ribos, nutrūkęs (atsakymo ilgio riba) - klaida, ne dalinis tekstas;
   - iš atsakymo sudaromi GP_DOK pavidalo blokai ir Word dokumento XML (docxXml) - tada veikia tie patys skaitytuvai kaip įkėlus Word failą
     (kvalifikacijos ir žaliųjų lentelės, vertinimo metodika, pirkimo objekto dalys, DI pasiūlymai).
   DI atpažintas tekstas - DI išvestis: modulis ją žymi (data-di) ir Word faile prideda DI požymius, kai iš jo perkelta lentelė. */
(function (root) {
  "use strict";
  var MAX_TOKENS = 8000;                     // serverio riba (R5) - ilgesnis dokumentas nutrūktų: pasakoma, ką daryti
  var MAX_EL = 2000, MAX_LANG = 30, MAX_TXT = 4000;

  // DI instrukcija ir užklausos tekstas - serverio šablone pp-salygos.skenuotas (nuo 2026-11-08, kodo apsauga): siunčiamas tik failo vardas ir PDF.

  var str = function (x, n) { return typeof x === "string" ? x.slice(0, n) : ""; };
  /* Atsakymas -> { ok, elementai: [{ p } | { lentele }], pastabos } arba { ok: false, error } */
  function issAtsakymo(text, stop) {
    if (stop === "max_tokens") return { ok: false, error: "Dokumentas per ilgas perskaityti vienu kartu - DI atsakymas nutrūko. Įkelkite tik reikalingus puslapius (pvz. kvalifikacijos reikalavimų lentelę) arba Word failą." };
    var m = String(text || "").match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "DI atsakyme nėra JSON" };
    var d;
    try { d = JSON.parse(m[0]); }
    catch (e) {
      try { d = JSON.parse(root.GP_AI_PROXY.taisykJson(m[0])); }
      catch (e2) { return { ok: false, error: "DI atsakymas sugadintas (" + e.message + ")" }; }
    }
    if (d && d.status === "neiskaitoma") return { ok: false, error: "DI nurodo, kad dokumentas neįskaitomas" + (d.pastabos ? ": " + str(d.pastabos, 300) : "") };
    if (!d || d.status !== "ok" || !Array.isArray(d.elementai)) return { ok: false, error: "DI atsakymas neatitinka schemos" };
    var el = [];
    d.elementai.slice(0, MAX_EL).forEach(function (x) {
      if (!x || typeof x !== "object") return;
      if (typeof x.p === "string" && x.p.trim()) el.push({ p: x.p.slice(0, MAX_TXT) });
      else if (Array.isArray(x.lentele)) {
        var eil = x.lentele.slice(0, 400).filter(Array.isArray).map(function (r) { return r.slice(0, MAX_LANG).map(function (c) { return str(c, MAX_TXT); }); })
          .filter(function (r) { return r.some(function (c) { return c.trim(); }); });
        if (eil.length) el.push({ lentele: eil });
      }
    });
    if (!el.length) return { ok: false, error: "DI teksto neatpažino" };
    return { ok: true, elementai: el, pastabos: str(d.pastabos, 300) };
  }

  /* GP_DOK pavidalo blokai: pastraipos ({ loc: { para }, text }) ir lentelių eilutės ({ loc: { table, row }, text, cells }) */
  function blokai(el) {
    var out = [], pi = 0, ti = 0;
    el.forEach(function (x) {
      if (x.p != null) { pi++; out.push({ loc: { para: pi }, text: x.p.replace(/\s+/g, " ").trim() }); return; }
      ti++;
      x.lentele.forEach(function (r, ri) {
        var visi = r.map(function (c) { return c.replace(/\s+/g, " ").trim(); }), cells = visi.filter(Boolean);
        if (cells.length) out.push({ loc: { table: ti, row: ri + 1 }, text: cells.join(" | "), cells: visi });
      });
    });
    return out;
  }
  var xmlEsc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  /* Word dokumento XML (pastraipos ir lentelės, langelio pastraipos - pagal \n) - tiems patiems skaitytuvams kaip įkeltam Word failui */
  function docxXml(el) {
    var p = function (t) { return '<w:p><w:r><w:t xml:space="preserve">' + xmlEsc(t) + "</w:t></w:r></w:p>"; };
    var body = el.map(function (x) {
      if (x.p != null) return p(x.p);
      return "<w:tbl>" + x.lentele.map(function (r) { return "<w:tr>" + r.map(function (c) {
        var ps = String(c).split("\n").filter(function (s) { return s.trim(); });
        return "<w:tc>" + (ps.length ? ps.map(p).join("") : "<w:p/>") + "</w:tc>"; }).join("") + "</w:tr>"; }).join("") + "</w:tbl>";
    }).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + "</w:body></w:document>";
  }
  /* Word failas (JSZip) - kvalifikacijos lentelių skaitytuvui (GP_KVAL_LENTELE.skaityk) */
  function docx(el) {
    if (!root.JSZip) return Promise.reject(new Error("JSZip neįkeltas"));
    var z = new root.JSZip();
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/document.xml", docxXml(el));
    return z.generateAsync({ type: "arraybuffer" });
  }

  /* Visas kelias: failas -> DI -> patikrintas atsakymas, blokai, Word XML ir failas */
  function perskaityk(file, opts) {
    opts = opts || {};
    if (!root.GP_AI_PROXY || !root.GP_PARAISKA) return Promise.reject(new Error("DI jungtis neprijungta"));
    return root.GP_PARAISKA.paruostiFaila(file).then(function (pr) {
      // atšaukta, kol failas ruoštas - į DI nesiunčiama
      if (opts.signal && opts.signal.aborted) throw Object.assign(new Error("Atšaukta"), { name: "AbortError" });
      if (opts.onParuosta) opts.onParuosta(pr);
      return root.GP_AI_PROXY.uzduotis("pp-salygos.skenuotas", { vardas: String((file && file.name) || "").slice(0, 120) }, { dokumentas: { tipas: "application/pdf", duomenys: pr.base64 }, signal: opts.signal });
    }).then(function (r) {
      if (!r.ok) throw new Error(r.error || "DI klaida");
      var a = issAtsakymo(r.text, r.raw && r.raw.stop_reason);
      if (!a.ok) throw new Error(a.error);
      return docx(a.elementai).then(function (buf) {
        return { elementai: a.elementai, blokai: blokai(a.elementai), xml: docxXml(a.elementai), docx: buf, pastabos: a.pastabos };
      });
    });
  }

  root.GP_SKENUOTI = { issAtsakymo: issAtsakymo, blokai: blokai, docxXml: docxXml, docx: docx, perskaityk: perskaityk, MAX_TOKENS: MAX_TOKENS };
})(typeof window !== "undefined" ? window : this);
