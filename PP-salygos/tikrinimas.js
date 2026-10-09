/* ============================================================================
 * G-Procure  PP-salygos/tikrinimas.js   (v1.0, 2026-10-06)
 * „Tikrinti parengtus dokumentus“ - pirkimo dokumentų patikra prieš tvirtinant ir skelbiant (GP_TIKRINIMAS).
 * Naudotojo sprendimai 2026-10-06 (docs/salygos/auditas-planas-2026-10.md 9 sk.): vienas įrankis PP-salygos modulyje vietoj
 * „Ar pirkimas parengtas skelbti?“ (skelbimo-parengtis.html dabar - nukreipimas čia).
 *
 *  - kryžminė paketo patikra ir taisyklės - kaip iki tol (shared/parengtis.js, shared/taisykles.js);
 *  - palyginimas su standartine forma (shared/palyginimas.js): Word (DOCX) pastraipos lyginamos su LITGRID šablonu (mūsų pataisytu,
 *    templates/), forma atpažįstama pagal zemelapiai/formu-versijos.json rodyklę, ankstesnių oficialių redakcijų tekstas nelaikomas
 *    nukrypimu; šiuo moduliu sugeneruotas dokumentas lyginamas pagal generavimo pasą - tiksliai, kas pakeista PO generavimo;
 *  - nuo 2026-10-09 (sutarčių planas 4.4) ir prekių bei paslaugų pirkimo-pardavimo sutarčių BS ir SS (zemelapiai/sutarciu-versijos.json):
 *    pildomos vietos, išskleidžiamų sąrašų variantai ir pasirenkamos dalys - iš sutarties žemėlapio (sutartiesVietos), LITGRID „0922“
 *    ir ankstesnių redakcijų tekstas - ne nukrypimas (kitos_versijos, naujos); išmatuota: 8 šablonai, 8 LITGRID originalai ir 8 sugeneruoti
 *    be paso - 0 nukrypimų, kiekvienoje SS trys dirbtiniai pakeitimai (pakeista, pašalinta, pridėta nuostata) - visi rasti;
 *  - lygiai: Kliūtis, Nukrypimas nuo formos, Patikrinkite, Informacija (Rekomendacija - kai bus privalomų elementų katalogas);
 *  - sprendimai: Ištaisyta / Priimta sąmoningai (nukrypimui, kliūčiai ir rekomendacijai - su pagrindimu) / Netaikoma; Word ataskaita su mašinai
 *    skaitomais sprendimais: įkėlus ją kartu su nauja paketo versija, sprendimai parodomi prie tų pačių radinių, o dokumentų
 *    pakeitimai nuo ankstesnės patikros suskaičiuojami (pastraipų maišos, ne tekstas).
 *
 * Be DI. Failai skaitomi tik naršyklėje, niekur nesiunčiami ir neišsaugomi; sprendimai gyvena puslapyje ir ataskaitoje
 * (uždarant su neatsisiųstais sprendimais - GP_DARBAS per darbas()). Visas iš dokumentų gautas tekstas į HTML - tik per esc().
 *
 *   GP_TIKRINIMAS.mount({ kortele: () => kortelė | null, pdf: async () => {}, gaukBuf: async url, gaukJson: async url })
 *   GP_TIKRINIMAS.skaityk(File[])        - patikra (testams - ir be failų lango)
 *   GP_TIKRINIMAS.korteleKeista()        - pasirinkta kita kortelė: patikra persiskaičiuoja
 *   GP_TIKRINIMAS.darbas()               - sprendimų parašas GP_DARBAS (tuščias, kai sprendimai jau atsisiųstoje ataskaitoje)
 *   GP_TIKRINIMAS.ataskaita()            - Word ataskaitos Blob;  GP_TIKRINIMAS.busena - būsena (testams)
 * ========================================================================== */
(function (global) {
  "use strict";
  if (global.GP_TIKRINIMAS) return;
  var NS_ATASKAITA = "https://g-procure.com/patikra/1";
  var LYG = { kliutis: "Kliūtis", nukrypimas: "Nukrypimas nuo formos", tikrinti: "Patikrinkite", rekomendacija: "Rekomendacija", info: "Informacija" };
  var LYG_DGS = { kliutis: "Kliūtys", nukrypimas: "Nukrypimai nuo formos", tikrinti: "Patikrinkite", rekomendacija: "Rekomendacijos", info: "Informacija" };
  var TVARKA = ["kliutis", "nukrypimas", "tikrinti", "rekomendacija", "info"];
  var SPR = { istaisyta: "Ištaisyta", priimta: "Priimta sąmoningai", netaikoma: "Netaikoma" };
  var OP = { pakeista: "Pakeista formos nuostata", pasalinta: "Pašalinta formos nuostata", prideta: "Pridėta nuostata, kurios formoje nėra", perkelta: "Perkelta formos nuostata" };
  var OP_PASAS = { pakeista: "Pakeista po generavimo", pasalinta: "Pašalinta po generavimo", prideta: "Pridėta po generavimo", perkelta: "Perkelta po generavimo" };
  var OP_TRUMPAI = { pakeista: "Pakeista", pasalinta: "Pašalinta", prideta: "Pridėta", perkelta: "Perkelta" };
  var RUSIS = { nukrypimas: "Nukrypimas nuo formos", neprivaloma: "Neprivaloma formos dalis", uzpildyta: "Užpildyta vieta", techninis: "Techninis pakeitimas" };
  var PO_RUSIS = { raudonas: "užpildyta raudonai pažymėta vieta", vieta: "užpildyta tuščia vieta", pasalinta: "pašalinta sąlyginė dalis",
    pakeista: "pakeista sąlyginė dalis", lentele: "lentelės eilutė", turinys: "turinys", numeracija: "numeracija", skyryba: "skyryba",
    priedu_sarasas: "priedų sąrašas", perkelta: "perkelta", antraste: "skyriaus antraštė", kita_versija: "ankstesnės oficialios formos tekstas",
    po_generavimo: "pakeista po generavimo", pazymeta: "užpildyta pildoma sutarties vieta",
    nauja_redakcija: "formos taisymas, kurio dokumento redakcijoje nebuvo", pasirinkimas: "pasirinktas formos sąrašo variantas",
    ne_is_saraso: "pasirinkimo vietoje - tekstas, kurio formos sąraše nėra", salinama: "pašalintas šablono nurodymas ar pildymo vieta" };
  var SEIMOS = { AK: "Atviras konkursas", AKV: "Atviras konkursas VPĮ", SSD: "Skelbiamos derybos (supaprastintas)", TSD: "Skelbiamos derybos (tarptautinis)",
    ND: "Neskelbiamos derybos", MVP: "Mažos vertės pirkimas", DPSK: "DPS sukūrimas", DPSP: "Konkretus pirkimas pagal DPS",
    PREKES: "Prekių pirkimo-pardavimo sutartis", PASLAUGOS: "Paslaugų pirkimo-pardavimo sutartis" };
  var SUTARTIES_DALIS = { BS: "bendrosios sąlygos", SS: "specialiosios sąlygos" };
  var VAIDMENU_TVARKA = ["sps", "bps", "skelbimas", "ts", "sutartis", "sutartis_bendrosios", "pasiulymas", "paraiska", "ebvpd", "paaiskinimas", "priedas", "kita"];
  var ATPAZINIMO_RIBA = 0.5, ATPAZINIMO_SKIRTUMAS = 0.05;   // išmatuota 2026-10-06: tikri SPS 0,57-0,76, BPS 1,0; antra forma - bent 0,08 mažiau
  var MAX_RODOMA = 10;
  var PAAISKINIMAS = { nukrypimas: "Standartinės LITGRID formos nekintamos nuostatos, kurias rengėjas pakeitė, pašalino ar pridėjo: komisija sprendžia, ar pakeitimas pagrįstas. " +
    "„Jautri sritis“ - pašalinimo pagrindai, kvalifikacija, vertinimas, užtikrinimas, sutartis, nacionalinis saugumas ar sankcijos: tokius peržiūrėkite pirmiausia. " +
    "Užpildytos vietos, pasirinktos alternatyvos ir sąlyginės formos dalys čia nerodomos - jos skiltyje „Palyginimas su forma“.",
    rekomendacija: "Kvalifikacijos reikalavimai, kurie viršija VPT Metodikos įprastas ribas (patirties laikotarpis, patirties vertė, pajamos). " +
    "Metodikos skaičiai taikomi „paprastai“: griežtesnis reikalavimas gali būti pagrįstas - tada turėkite pagrindimą." };
  var VAIZDAI = ["svarbiausia", "dokumentai", "palyginimas", "patikros"];

  var cfg = null, indeksas = null, indeksoKlaida = null, sablonai = {};
  var B = nauja();
  function nauja() {
    return { docs: null, vaidmenys: {}, laikas: null, rez: null, ankstesne: null, palyg: {}, formos: {}, sprendimai: {},
             vaizdas: "svarbiausia", palygDok: null, laukiami: false, radiniai: [], rodytiVisus: {}, atsisiusta: "{}", eiga: 0 };
  }
  function $(id) { return document.getElementById(id); }
  function P() { return global.GP_PALYGINIMAS; }
  function P_NORM(t) { return global.GP_PALYGINIMAS.norm(t); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function kab(s) { return "„" + s + "“"; }
  function bazinis(v) { return String(v || "").split(/ › |\//).pop(); }
  function formosPav(id) {
    var m = /^([A-Z]+)_(LT|LTEN)_([A-Z]+)$/.exec(id || "");
    if (!m) return id || "";
    return (SEIMOS[m[1]] || m[1]) + " · " + (m[3] === "SALYGOS" ? "sąlygos" : SUTARTIES_DALIS[m[3]] || m[3]) + " · " + (m[2] === "LTEN" ? "LT/EN" : "LT");
  }
  function laikoTekstas(dt) {
    if (!dt) return "";
    var d2 = function (n) { return String(n).padStart(2, "0"); };
    return dt.getFullYear() + "-" + d2(dt.getMonth() + 1) + "-" + d2(dt.getDate()) + " " + d2(dt.getHours()) + ":" + d2(dt.getMinutes());
  }
  function vaidmuo(d) { return B.vaidmenys[d.id] || d.vaidmuo || (B.rez && (B.rez.dokumentai.find(function (x) { return x.id === d.id; }) || {}).vaidmuo) || "kita"; }

  /* ---------------------------------------------------------------- rodyklė ir šablonai */
  /* Rodyklė - pirkimo sąlygų formos (formu-versijos.json) ir sutarčių šablonai (sutarciu-versijos.json, 2026-10-09: sutarčių planas 4.4).
     Sutarties įrašas: { sutartis: true, failas, pavadinimas, kitos } - kitos: LITGRID „0922“ ir ankstesnių redakcijų pastraipų maišos.
     Nepavykus įkelti sutarčių registro, pirkimo sąlygų formos lyginamos kaip iki tol, o sutartys - nepatikrintos su priežastimi. */
  var sutarciuKlaida = null;
  async function gaukIndeksa() {
    if (indeksas) return indeksas;
    var ix = await cfg.gaukJson("zemelapiai/formu-versijos.json");
    if (!ix || !ix.formos) throw new Error("formų rodyklė netinkama");
    try {
      var reg = await cfg.gaukJson("zemelapiai/sutarciu-versijos.json");
      Object.keys((reg && reg.sablonai) || {}).forEach(function (id) {
        var r = reg.sablonai[id];
        ix.formos[id] = { sutartis: true, failas: r.failas, pavadinimas: r.pavadinimas, dabartine: r.dabartine, pozymiai: r.pozymiai,
                          kitosPozymiai: r.kitos_pozymiai || "", kitos: r.kitos_versijos || {}, naujos: r.naujos || [] };
      });
      sutarciuKlaida = null;
    } catch (e) { sutarciuKlaida = e.message || String(e); }
    indeksas = ix;
    return indeksas;
  }
  function formosIrasas(id) { return (indeksas && indeksas.formos[id]) || null; }
  function gaukForma(id) {
    if (!sablonai[id]) sablonai[id] = (async function () {
      var ir = formosIrasas(id) || {};
      var buf = await cfg.gaukBuf(ir.sutartis ? String(ir.failas || "").replace(/^PP-salygos\//, "") : "templates/" + id + ".docx");
      var r = await P().skaityk(buf);
      var zem = null;
      try { zem = await cfg.gaukJson((ir.sutartis ? "zemelapiai/sutartys/" : "zemelapiai/") + id + ".json"); } catch (e) { zem = null; }
      if (!ir.sutartis) return { id: id, ps: r.pastraipos, zem: zem };
      if (!zem) throw new Error("sutarties šablono žemėlapio " + id + " įkelti nepavyko");
      var sz = await sutartiesVietos(buf, zem);
      r.pastraipos.forEach(function (x) {
        if (sz.vieta[x.i]) x.vieta = true;
        if (sz.vietaPo[x.i]) x.vietaPo = true;
        if (sz.salinama[x.i]) x.salinama = true;
        if (sz.leidziami[x.i]) x.leidziami = sz.leidziami[x.i];
        if (sz.variantai[x.i]) x.variantai = sz.variantai[x.i];
      });
      return { id: id, ps: r.pastraipos, zem: { blokai: sz.blokai }, sutartis: true };
    })().catch(function (e) { delete sablonai[id]; throw e; });
    return sablonai[id];
  }
  /* Sutarties šablono pildomos vietos ir pasirenkamos dalys iš jo žemėlapio (sutarciu-sablonai.py; pastraipų numeracija - visos w:p, kaip
     GP_PALYGINIMAS.pastraipos ir sutarciu-generatorius.js): vieta - pastraipos su valdikliais, pildomomis vietomis, laukais, rekvizitais,
     nurodymais, paryškinimais ir sąlygų užrašais; blokai - alternatyvų variantai su skyrikliais, o po trynimo nurodymo ir užrašo
     „Jei punktas taikomas:“ - langelio likutis (pasirinkus „netaikoma“ jis šalinamas). */
  async function sutartiesVietos(buf, Z) {
    var zip = await global.JSZip.loadAsync(buf);
    var doc = new DOMParser().parseFromString(await zip.file("word/document.xml").async("string"), "application/xml");
    var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    var P = Array.prototype.slice.call(doc.getElementsByTagNameNS(W, "p")), nr = new Map();
    P.forEach(function (p, i) { nr.set(p, i); });
    var tevas = function (n, vardas) { for (var q = n.parentNode; q; q = q.parentNode) if (q.namespaceURI === W && q.localName === vardas) return q; return null; };
    var vieta = {}, vietaPo = {}, salinama = {}, leidziami = {}, variantai = {}, blokai = [];
    var tekstas = function (p) { return Array.prototype.map.call(p.getElementsByTagNameNS(W, "t"), function (t) { return t.textContent; }).join("").trim(); };
    ["valdikliai", "pildomos", "nurodymai", "laukai", "organizacija", "paryskinimai", "keiciamos_reiksmes", "taikymo_salygos", "trynimo_nurodymai", "salygos"]
      .forEach(function (k) { (Z[k] || []).forEach(function (x) { if (x.i != null) vieta[x.i] = 1; }); });
    // pašalinti galima: trynimo nurodymą, užrašą „Jei punktas taikomas:“, visą pastraipą sudarantį nurodymą ar taikymo sąlygą
    (Z.trynimo_nurodymai || []).concat(Z.salygos || []).forEach(function (x) { salinama[x.i] = 1; });
    (Z.nurodymai || []).concat(Z.taikymo_salygos || []).forEach(function (x) { if (P[x.i] && tekstas(P[x.i]) === String(x.tekstas || "").trim()) salinama[x.i] = 1; });
    var SDT = Array.prototype.slice.call(doc.getElementsByTagNameNS(W, "sdt"));
    SDT.forEach(function (sdt) {
      var p = tevas(sdt, "p"), vidus = Array.prototype.slice.call(sdt.getElementsByTagNameNS(W, "p"));
      if (p) { vieta[nr.get(p)] = 1; if (tekstas(p) === tekstas(sdt)) salinama[nr.get(p)] = 1; }
      vidus.forEach(function (q) { vieta[nr.get(q)] = 1; salinama[nr.get(q)] = 1; });
    });
    // Išskleidžiamo sąrašo (dropDownList) pastraipa: leidžiami tik formos variantai (laisvo teksto sąrašas ir teksto valdiklis - bet kas);
    // šablono vietos „[...]“, „[_]“, „{...}“ variante - bet koks tekstas. Palyginama su GP_PALYGINIMAS.norm tekstu (be punkto numerio).
    var lite = function (t) { return P_NORM(t); };
    var re = function (t) { return lite(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\[(_|\\\.\\\.\\\.|…)\\\]|\\\{\\\.\\\.\\\.\\\}/g, "[\\s\\S]*?").replace(/ /g, "\\s*"); };
    var vald = function (sdt) { return (Z.valdikliai || [])[SDT.indexOf(sdt)] || null; };
    var slotas = function (sdt) {
      var v = vald(sdt);
      if (!v || v.rusis !== "dropDownList" || !v.elementai || !v.elementai.length) return "[\\s\\S]*?";
      return "(?:" + v.elementai.map(function (e) { return re(e.tekstas); }).concat([re(tekstas(sdt)), ""]).join("|") + ")";
    };
    var dalys = function (n, out) {
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.namespaceURI !== W) return;
        if (c.localName === "sdt") out.push({ sdt: c });
        else if (c.localName === "t") out.push({ t: c.textContent });
        else if (c.localName === "tab") out.push({ t: " " });
        else if (c.localName !== "pPr" && c.localName !== "rPr") dalys(c, out);
      });
      return out;
    };
    P.forEach(function (p, i) {
      var sdts = SDT.filter(function (x) { return tevas(x, "p") === p; }), vienas = SDT.find(function (x) { return x.contains(p); });
      var d = null;
      if (sdts.length) d = dalys(p, []);
      else if (vienas && vienas.getElementsByTagNameNS(W, "p").length === 1) d = [{ sdt: vienas }];
      if (!d || !d.some(function (x) { var v = x.sdt && vald(x.sdt); return v && v.rusis === "dropDownList"; })) return;
      var src = "";
      d.forEach(function (x) { src += x.sdt ? "\u0001" + SDT.indexOf(x.sdt) + "\u0001" : x.t; });
      // šablono tekstas be punkto numerio (dokumento pusė - norm, kuri numerį nuima), valdikliai - šablonai
      var m = /^\s*(\d+(\.\d+)+(?=\s)|\d+(\.\d+)*\.)\s*/.exec(src); if (m) src = src.slice(m[0].length);
      var r = src.split(/\u0001(\d+)\u0001/).map(function (t, k) { return k % 2 ? slotas(SDT[+t]) : re(t); }).join("\\s*");
      try { leidziami[i] = new RegExp("^\\s*(?:\\d+(?:\\.\\d+)*\\.?\\s*)?" + r + "\\s*$"); } catch (e) { /* netinkamas šablonas - lieka vieta */ }
      // visa pastraipa - vienas sąrašas: jo variantai (artimiausias rodomas kaip formos tekstas, kai įrašytas kitas)
      var v1 = d.length === 1 && d[0].sdt && vald(d[0].sdt);
      if (v1 && v1.rusis === "dropDownList") variantai[i] = v1.elementai.map(function (e) { return { t: String(e.tekstas).trim(), n: P_NORM(e.tekstas) }; });
    });
    // Tuščias laukas (pvz. sutarties pavadinimas po užrašo „Sutarties pavadinimas“) palyginime nematomas - užpildytą jį atpažįsta pagal
    // ankstesnę netuščią pastraipą (vietaPo: po jos pridėta pastraipa - užpildyta vieta)
    Object.keys(vieta).forEach(function (k) {
      if (!P[k] || tekstas(P[k])) return;
      for (var j = +k - 1; j >= 0; j--) if (tekstas(P[j])) { vietaPo[j] = 1; break; }
    });
    (Z.alternatyvos || []).forEach(function (a) {
      var v = a.variantai.reduce(function (s, x) { return s.concat(x); }, []).concat(a.skyrikliai || []);
      if (v.length) blokai.push({ blokas: { nuo: Math.min.apply(null, v), iki: Math.max.apply(null, v) } });
    });
    (Z.trynimo_nurodymai || []).concat(Z.salygos || []).forEach(function (x) {
      var tc = P[x.i] && tevas(P[x.i], "tc"), iki = x.i;
      if (tc) while (iki + 1 < P.length && tevas(P[iki + 1], "tc") === tc) iki++;
      blokai.push({ blokas: { nuo: x.i, iki: iki } });
    });
    return { vieta: vieta, vietaPo: vietaPo, salinama: salinama, leidziami: leidziami, variantai: variantai, blokai: blokai };
  }
  /* Ankstesnės patikros ataskaita - Word failas su customXml dalimi NS_ATASKAITA (žr. ataskaita()). */
  async function skaitykAtaskaita(buf) {
    if (!global.JSZip) return null;
    var zip;
    try { zip = await global.JSZip.loadAsync(buf); } catch (e) { return null; }
    var items = zip.file(/^customXml\/item\d+\.xml$/);
    for (var i = 0; i < items.length; i++) {
      var x = await items[i].async("string");
      if (x.indexOf(NS_ATASKAITA) < 0) continue;
      var d = new DOMParser().parseFromString(x, "application/xml"), r = d.documentElement;
      if (!r || r.namespaceURI !== NS_ATASKAITA) continue;
      var el = r.getElementsByTagNameNS(NS_ATASKAITA, "duomenys")[0];
      try {
        var j = JSON.parse(el ? el.textContent : "");
        if (j && j.versija === 1 && typeof j.sprendimai === "object") return j;
      } catch (e) { return { klaida: "ataskaitos duomenys neperskaitomi" }; }
    }
    return null;
  }

  /* ---------------------------------------------------------------- skaitymas */
  async function skaityk(failai) {
    var mano = ++B.eiga;
    var rez = await GP_BUSENA.vykdyk("#tkBusena", {
      tipas: "eiga", tekstas: "Skaitomi failai: " + failai.length, procentai: 5,
      klaidosPriesdelis: "Failų perskaityti nepavyko",
      kartoti: function () { skaityk(failai); },
      veiksmas: async function (signal, h) {
        if (failai.some(function (f) { return /\.(pdf|zip)$/i.test(f.name); }) && cfg.pdf) { try { await cfg.pdf(); } catch (e) { /* PDF failams priežastį pasakys GP_DOK */ } }
        var n = 0, r;
        try {
          r = await GP_DOK.apdorok(failai, function (v) { n++; if (h && h.eiga) h.eiga(Math.min(80, 5 + n * 3), "Skaitoma: " + bazinis(v)); }, "lt", { pasilikti: ["docx"] });
        } catch (e) {
          if (/central directory|zip/i.test(String(e && e.message))) throw new Error("ZIP archyvo atidaryti nepavyko - jis sugadintas arba tai ne ZIP failas. Atsisiųskite paketą iš naujo arba įkelkite failus atskirai.");
          throw e;
        }
        if (h && h.eiga) h.eiga(85, "Lyginama su formomis");
        var docs = [], ankstesne = null, palyg = {};
        for (var i = 0; i < r.docs.length; i++) {
          var d = r.docs[i];
          if (d.buf) {
            var at = await skaitykAtaskaita(d.buf);
            if (at && !at.klaida) { ankstesne = at; ankstesne.vardas = bazinis(d.name); d.buf = null; continue; }
            try { var pr = await P().skaityk(d.buf); palyg[d.id] = { ps: pr.pastraipos, pasas: pr.pasas }; }
            catch (e) { palyg[d.id] = { klaida: e.message }; }
            d.buf = null;
          }
          docs.push(d);
        }
        if (!docs.some(function (d) { return (d.blocks || []).length; })) throw new Error(ankstesne
          ? "Įkelta tik ankstesnės patikros ataskaita - įkelkite ir tikrinamus pirkimo dokumentus."
          : "Iš įkeltų failų teksto perskaityti nepavyko - patikra neatlikta. Patikrinkite, ar tai pirkimo dokumentai (ne skenuoti PDF).");
        try { await gaukIndeksa(); indeksoKlaida = null; } catch (e) { indeksoKlaida = e.message; }
        return { docs: docs, ankstesne: ankstesne, palyg: palyg };
      }
    });
    if (!rez.ok || mano !== B.eiga) return;
    var senas = B;
    B = nauja(); B.eiga = senas.eiga;
    B.docs = rez.reiksme.docs; B.ankstesne = rez.reiksme.ankstesne; B.palyg = rez.reiksme.palyg; B.laikas = new Date();
    GP_BUSENA.rodyk("#tkBusena", { tipas: "gerai", tekstas: "Perskaityta failų: " + B.docs.length + "." + (B.ankstesne ? " Ankstesnės patikros ataskaita: " + B.ankstesne.vardas + "." : "") });
    atpazinkFormas();
    tikrinkParengti();
    await lyginkVisus();
    $("tkRezultatai").hidden = false;
    piesk();
    $("tkH").focus();
  }

  /* ---------------------------------------------------------------- formos atpažinimas ir palyginimas */
  function atpazinkFormas() {
    B.docs.forEach(function (d) {
      var x = B.palyg[d.id];
      if (!x || x.klaida || !x.ps) return;
      if (x.pasas) {
        var id = String(x.pasas.sablonas || "").replace(/_(GULSTI|METODIKA)$/, function (m, s) { return s === "METODIKA" ? "_SALYGOS" : ""; });
        x.siuloma = id; x.pagal = "pasas";
        return;
      }
      if (!indeksas) return;
      var idf = P().identifikuok(x.ps, indeksas.formos);
      x.idf = idf.slice(0, 3);
      if (idf[0] && idf[0].balas >= ATPAZINIMO_RIBA && (!idf[1] || idf[0].balas - idf[1].balas >= ATPAZINIMO_SKIRTUMAS)) { x.siuloma = idf[0].id; x.pagal = "atpazinta"; }
    });
  }
  function pasirinktaForma(d) {
    var x = B.palyg[d.id];
    if (!x || !x.ps) return "";
    return B.formos[d.id] !== undefined ? B.formos[d.id] : (x.siuloma || "");
  }
  async function lyginkVisus() {
    for (var i = 0; i < B.docs.length; i++) await lygink(B.docs[i]);
    surinkRadinius();
  }
  async function lygink(d) {
    var x = B.palyg[d.id];
    if (!x || !x.ps) return;
    x.rez = null; x.klaidaLyg = null; x.forma = pasirinktaForma(d);
    if (!x.forma) return;
    var pagalPasa = x.pasas && B.formos[d.id] === undefined;
    try {
      var f = null;
      if (indeksas && indeksas.formos[x.forma]) f = await gaukForma(x.forma);
      else if (!pagalPasa) throw new Error("formos " + x.forma + " modulyje nėra");
      if (pagalPasa) {
        x.rez = P().pagalPasa(x.pasas, x.ps, f ? f.ps : []);
        var dab = indeksas && indeksas.formos[x.forma] && indeksas.formos[x.forma].dabartine;
        x.pasoVersija = !x.pasas.forma ? "" : (dab && x.pasas.forma === dab ? "dabartine" : "kita");
      } else {
        var ir = indeksas.formos[x.forma];
        var naujos = {}; (ir.naujos || []).forEach(function (h) { naujos[h] = 1; });
        x.rez = P().lygink(f.ps, x.ps, { zemelapis: f.zem, kitosVersijos: P().kitosVersijos(ir.sutartis ? ir.kitos : ir), sutartis: !!ir.sutartis, naujos: naujos });
      }
      x.pagalPasa = pagalPasa;
    } catch (e) { x.klaidaLyg = e.message; }
  }

  /* ---------------------------------------------------------------- parengtis ir radiniai */
  /* Sutarties dokumento vaidmuo pagal atpažintą ar pasirinktą formą (2026-10-09): sugeneruoto failo vardas („..._Sutarties-SS_...“) ar
     rengėjo pavadinimas sutarties gali neįvardyti - tada privalomų sutarties elementų patikra jo nerastų. Naudotojo pasirinktas vaidmuo - pirmesnis. */
  function vaidmenysSuFormomis() {
    var v = {};
    (B.docs || []).forEach(function (d) {
      var f = pasirinktaForma(d);
      if (/_SS$/.test(f)) v[d.id] = "sutartis"; else if (/_BS$/.test(f)) v[d.id] = "sutartis_bendrosios";
    });
    Object.keys(B.vaidmenys).forEach(function (id) { v[id] = B.vaidmenys[id]; });
    return v;
  }
  function tikrinkParengti() {
    if (!B.docs) return;
    B.rez = GP_PARENGTIS.patikrink({ docs: B.docs, vaidmenys: vaidmenysSuFormomis(), kortele: cfg.kortele ? cfg.kortele() : null, kalba: "lt" });
  }
  function parengtiesRaktas(r) {
    var c = (r.vietos || []).map(function (v) { return v.citata || ""; }).join("|");
    return "P" + P().maisa(r.id + "|" + (c || r.tekstas || ""));
  }
  /* Sutarties nuorodos (2026-10-09, GP_SUTARCIU_NUORODOS): pakete - sutarties specialiosios ir (ar) bendrosios sąlygos (atpažinta forma arba
     vaidmuo); kiekviena nuoroda į punktą ar priedą turi rodyti į esamą tos sutarties punktą ar priedą. Tik Word (DOCX) tekstas su
     numeriais tekste (Word automatinės numeracijos punktai neturi teksto numerio - tada nepatikrinta). */
  function sutartiesDokai() {
    var tip = function (d) {
      var x = B.palyg[d.id] || {}, f = x.forma || "", v = vaidmuo(d);
      return /_SS$/.test(f) || (!f && v === "sutartis") ? "SS" : /_BS$/.test(f) || (!f && v === "sutartis_bendrosios") ? "BS" : null;
    };
    var o = {};
    (B.docs || []).forEach(function (d) { var t = tip(d); if (t && !o[t]) o[t] = d; });
    return o;
  }
  function sutartiesNuorodos() {
    if (!global.GP_SUTARCIU_NUORODOS || !B.docs) return null;
    var D = sutartiesDokai();
    if (!D.SS && !D.BS) return null;
    var tekstai = function (d) { var x = d && B.palyg[d.id]; return x && x.ps ? x.ps.map(function (y) { return y.t; }) : null; };
    var T = { BS: tekstai(D.BS), SS: tekstai(D.SS) }, maz = ["BS", "SS"].filter(function (k) { return D[k] && !T[k]; });
    var nr = function (t) { return t ? t.filter(function (x) { return /^\s*\d+\.\d+/.test(x); }).length : 0; };
    if (maz.length || ["BS", "SS"].some(function (k) { return T[k] && nr(T[k]) < 20; }))
      return { D: D, priezastis: maz.length ? "su sutarties tekstu tikrinamas tik Word (DOCX) failas" : "punktų numeriai ne tekste (Word automatinė numeracija) - nuorodų patikrinti negalima" };
    var r = global.GP_SUTARCIU_NUORODOS.tikrink({ bs: T.BS, ss: T.SS });
    r.D = D;
    return r;
  }
  function surinkRadinius() {
    var out = [], rz = B.rez;
    var sn = B.sutNuorodos = sutartiesNuorodos();
    if (sn && sn.radiniai) sn.radiniai.forEach(function (x) {
      var d = sn.D[x.dok];
      out.push({ raktas: "N" + P().maisa([x.dok, x.nr, x.citata].join("|")), lygis: "tikrinti", grupe: "Sutarties nuorodos",
                 tekstas: (x.rusis === "priedas" ? "Nuoroda į Nr. " + x.nr + " priedą, kurio specialiųjų sąlygų priedų sąraše nėra" : "Nuoroda į " + x.nr + " punktą, kurio sutartyje nėra") +
                   (x.dok === "BS" ? " (bendrosios sąlygos)" : " (specialiosios sąlygos)"),
                 pastaba: "Patikrinkite, ar punktas nepašalintas ar nepernumeruotas; nuoroda turi rodyti į esamą sutarties punktą ar priedą.",
                 vietos: [{ dok: d.id, failas: bazinis(d.name), vieta: "", citata: x.citata }], teise: [], kilme: "nuorodos" });
    });
    if (rz) {
      rz.radiniai.forEach(function (r) { out.push({ raktas: parengtiesRaktas(r), lygis: r.lygis, grupe: GP_PARENGTIS.grupesPav(r.grupe, "lt"), tekstas: r.tekstas, pastaba: r.pastaba, vietos: r.vietos || [], teise: r.teise || [], kilme: "parengtis" }); });
      if (rz.taisykles) rz.taisykles.radiniai.forEach(function (r) {
        if (r.lygis === "gerai") return;
        out.push({ raktas: parengtiesRaktas(r), lygis: r.lygis, grupe: "Taisyklės", tekstas: r.tekstas, pastaba: r.pastaba, vietos: [], teise: r.teise || [], kilme: "taisykles" });
      });
    }
    B.docs.forEach(function (d) {
      var x = B.palyg[d.id];
      if (!x || !x.rez) return;
      x.rez.pakeitimai.forEach(function (p, k) {
        if (p.rusis !== "nukrypimas") return;
        var cit = p.dok || p.forma;
        out.push({ raktas: P().raktas(p, x.forma), lygis: "nukrypimas", grupe: (x.pagalPasa ? "Po generavimo" : "Palyginimas su forma") + (p.skyrius ? " · " + p.skyrius : ""),
                   tekstas: (x.pagalPasa ? OP_PASAS : OP)[p.op], vietos: [{ dok: d.id, failas: bazinis(d.name), vieta: "", citata: "" }],
                   teise: [], kilme: "palyginimas", docId: d.id, k: k, p: p, svarbus: p.svarbus, citata: cit });
      });
    });
    // Tas pats radinys keliuose dokumentuose (pvz. tas pats nukrypimas dviejuose failuose) - viena kortelė su visomis vietomis
    var pagal = {}, sujungta = [];
    out.forEach(function (r) {
      if (pagal[r.raktas]) { pagal[r.raktas].vietos = pagal[r.raktas].vietos.concat(r.vietos); return; }
      pagal[r.raktas] = r; sujungta.push(r);
    });
    sujungta.sort(function (a, b) { return TVARKA.indexOf(a.lygis) - TVARKA.indexOf(b.lygis) || (b.svarbus ? 1 : 0) - (a.svarbus ? 1 : 0); });
    B.radiniai = sujungta;
  }
  /* Rekomendacija (kvalifikacijos reikalavimas virš Metodikos įprastos ribos) - irgi su pagrindimu: Metodikos 7.3 p. pirkimo vykdytojas
     turi galėti motyvuotai pagrįsti kiekvieną reikalavimą ir jo reikšmę */
  function reikiaPagrindimo(r) { return r.lygis === "nukrypimas" || r.lygis === "kliutis" || r.lygis === "rekomendacija"; }
  function sprendimoBusena(r) {
    var s = B.sprendimai[r.raktas];
    if (!s) return "nespresta";
    if (s.s === "priimta" && reikiaPagrindimo(r) && !String(s.pagrindimas || "").trim()) return "be_pagrindimo";
    return "ispresta";
  }

  /* ---------------------------------------------------------------- patikrų sąrašas */
  function palyginimoPatikros() {
    var out = [];
    B.docs.forEach(function (d) {
      var v = vaidmuo(d), x = B.palyg[d.id], pav = "Palyginimas su forma: " + bazinis(d.name);
      var sut = v === "sutartis" || v === "sutartis_bendrosios";
      var aktualu = v === "sps" || v === "bps" || sut || (x && (x.siuloma || x.forma));
      if (!aktualu) return;
      if (!x) { out.push({ pav: pav, grupe: "Palyginimas su forma", busena: "nepatikrinta", pastaba: d.ext === "pdf" ? "PDF - su forma lyginamas tik Word (DOCX) failas" : "ne Word (DOCX) failas - su forma nelyginama" }); return; }
      if (x.klaida) { out.push({ pav: pav, grupe: "Palyginimas su forma", busena: "nepatikrinta", pastaba: "Word failo perskaityti nepavyko: " + x.klaida }); return; }
      if (!indeksas && !x.pasas) { out.push({ pav: pav, grupe: "Palyginimas su forma", busena: "nepatikrinta", pastaba: "formų rodyklė neįkelta (" + (indeksoKlaida || "nežinoma priežastis") + ")" }); return; }
      if (!x.forma) { out.push({ pav: pav, grupe: "Palyginimas su forma", busena: "nepatikrinta", pastaba: B.formos[d.id] === "" ? "pasirinkta nelyginti"
        : sut && sutarciuKlaida ? "sutarčių šablonų registras neįkeltas (" + sutarciuKlaida + ")"
        : sut ? "sutarties forma neatpažinta - modulyje yra prekių ir paslaugų pirkimo-pardavimo sutarčių šablonai; jei tai viena iš jų, pasirinkite ją „Pagal dokumentą“"
        : "forma neatpažinta - jei tai LITGRID forma, pasirinkite ją „Pagal dokumentą“" }); return; }
      if (x.klaidaLyg) { out.push({ pav: pav, grupe: "Palyginimas su forma", busena: "nepatikrinta", pastaba: x.klaidaLyg }); return; }
      var n = x.rez.statistika.nukrypimas;
      out.push({ pav: pav, grupe: "Palyginimas su forma", busena: n ? "radinys" : "gerai",
                 pastaba: (x.pagalPasa ? "pagal generavimo pasą" : formosPav(x.forma)) + (n ? " - nukrypimų: " + n : "") });
    });
    return out;
  }
  function visosPatikros() {
    var rz = B.rez, out = [];
    if (rz) {
      rz.patikros.forEach(function (p) { out.push({ pav: p.pav, grupe: GP_PARENGTIS.grupesPav(p.grupe, "lt"), busena: p.busena, pastaba: p.pastaba || "" }); });
      var LAUK = { verte: "vertės", rezimas: "režimo", objektas: "objekto", budas: "būdo", paskelbimas: "paskelbimo datos", pasiulymuTerminas: "termino" };
      if (rz.taisykles) rz.taisykles.patikros.forEach(function (p) {
        var tr = (p.truksta || []).map(function (f) { return LAUK[f] || f; });
        out.push({ pav: GP_TAISYKLES.patikrosPav(p.id, "lt"), grupe: "Taisyklės",
                   busena: p.busena === "radinys" || p.busena === "gerai" ? p.busena : p.busena === "truksta" ? "nepatikrinta" : p.busena,
                   pastaba: tr.length ? "trūksta: " + tr.join(", ") : "" });
      });
    }
    var sn = B.sutNuorodos;
    if (sn) out.push({ pav: "Sutarties nuorodos į punktus ir priedus", grupe: "Sutarties nuorodos",
      busena: sn.priezastis ? "nepatikrinta" : sn.radiniai.length ? "radinys" : "gerai",
      pastaba: sn.priezastis || ("nuorodų " + sn.nuorodu + (sn.radiniai.length ? ", į neegzistuojančius punktus ar priedus - " + sn.radiniai.length : "") +
        (sn.nepatikrinta.length ? "; pakete tik " + (sn.D.SS ? "specialiosios" : "bendrosios") + " sąlygos - nuorodų į kitą dokumentą nepatikrinta: " + sn.nepatikrinta.length : "")) });
    return out.concat(palyginimoPatikros());
  }

  /* ---------------------------------------------------------------- versijos (ankstesnė ataskaita) */
  function ankstesnisDok(d) {
    var A = B.ankstesne;
    if (!A || !A.dokumentai) return null;
    var x = B.palyg[d.id] || {};
    return A.dokumentai.find(function (a) { return a.sha256 && a.sha256 === d.sha256; })
      || A.dokumentai.find(function (a) { return x.forma && a.forma === x.forma && a.vaidmuo === vaidmuo(d); })
      || A.dokumentai.find(function (a) { return a.vardas === bazinis(d.name); }) || null;
  }
  function versijosPokyciai(d) {
    var a = ankstesnisDok(d), x = B.palyg[d.id];
    if (!a) return null;
    if (a.sha256 && a.sha256 === d.sha256) return { tas: true, a: a };
    if (!x || !x.ps || !a.pastraipos) return { a: a, nezinoma: true };
    var r = P().pagalPasa({ pastraipos: String(a.pastraipos).split(/\s+/).filter(Boolean) }, x.ps, []);
    var sk = { pakeista: 0, prideta: 0, pasalinta: 0, perkelta: 0 };
    r.pakeitimai.forEach(function (p) { sk[p.op]++; });
    return { a: a, sk: sk, pakeitimai: r.pakeitimai };
  }

  /* ---------------------------------------------------------------- piešimas */
  function teisesHtml(teise) {
    if (!teise || !teise.length) return "";
    return '<p class="tk-teise">Teisinis pagrindas: ' + teise.map(function (t) {
      return /^https?:\/\//.test(t.url || "") ? '<a href="' + esc(t.url) + '" target="_blank" rel="noopener">' + esc(t.cit) + "</a>" : esc(t.cit);
    }).join("; ") + "</p>";
  }
  function diffHtml(a, b) {
    return P().zodziai(a, b).map(function (s) {
      if (s.o === "=") return esc(s.t);
      if (s.o === "-") return '<del class="tk-del"><span class="sr-only">[pašalinta: </span>' + esc(s.t) + '<span class="sr-only">]</span></del>';
      return '<ins class="tk-ins"><span class="sr-only">[pridėta: </span>' + esc(s.t) + '<span class="sr-only">]</span></ins>';
    }).join("");
  }
  function pakeitimoTurinys(p, x) {
    if (p.op === "pakeista" && p.forma) return '<p class="tk-diff">' + diffHtml(p.forma, p.dok) + "</p>";
    if (p.op === "pakeista") return '<p class="tk-cit"><span class="tk-et">Dokumente:</span> ' + esc(kab(p.dok)) + "</p>";
    if (p.op === "pasalinta") return p.forma ? '<p class="tk-cit"><span class="tk-et">Formos tekstas:</span> <del class="tk-del">' + esc(p.forma) + "</del></p>" : '<p class="tk-cit">Po generavimo pašalinta pastraipa (generavimo pase - tik maiša, tekstas neišsaugotas).</p>';
    if (p.op === "prideta") return '<p class="tk-cit"><span class="tk-et">Dokumente:</span> <ins class="tk-ins">' + esc(p.dok) + "</ins></p>";
    return '<p class="tk-cit">' + esc(kab(p.dok || p.forma)) + "</p>";
  }
  function vietosHtml(vietos) {
    var v = (vietos || []).filter(function (x) { return x.failas || x.vieta || x.citata; });
    if (!v.length) return "";
    return '<ul class="tk-vietos" aria-label="Kur">' + v.map(function (x) {
      return "<li><b>" + esc(x.failas) + "</b>" + (x.vieta ? " · " + esc(x.vieta) : "") + (x.citata ? ': <span class="tk-cit-t">' + esc(kab(x.citata)) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  function sprendimoHtml(r) {
    var s = B.sprendimai[r.raktas] || null, id = "tkp-" + r.raktas;
    var h = '<div class="tk-spr" role="group" aria-label="Sprendimas">' + Object.keys(SPR).map(function (k) {
      return '<button type="button" class="sec" data-tk-spr="' + k + '" data-tk-r="' + r.raktas + '" aria-pressed="' + (s && s.s === k ? "true" : "false") + '">' + SPR[k] + "</button>";
    }).join("");
    if (r.kilme === "palyginimas") {
      h += '<button type="button" class="sec" data-tk-rodyti="' + r.docId + ':' + r.k + '">Rodyti palyginime</button>';
      if (r.p.forma) h += '<button type="button" class="sec" data-tk-kopijuoti="' + r.raktas + '">Kopijuoti formos tekstą</button>';
    }
    h += "</div>";
    if (s && s.s === "priimta") {
      var priv = reikiaPagrindimo(r);
      h += '<div class="tk-pagr"><label for="' + id + '">Pagrindimas' + (priv ? " (privalomas)" : " (neprivalomas)") + "</label>" +
           '<textarea id="' + id + '" rows="2" data-tk-pagr="' + r.raktas + '"' + (priv ? ' aria-required="true"' : "") + ">" + esc(s.pagrindimas || "") + "</textarea>" +
           (priv && !String(s.pagrindimas || "").trim() ? '<p class="tk-truksta" id="' + id + '-t">' + (r.lygis === "rekomendacija" ? "Įrašykite, kodėl reikalavimas pagrįstas" : "Įrašykite, kodėl nukrypimas priimtas") + " - be pagrindimo sprendimas nebaigtas.</p>" : "") + "</div>";
    }
    var A = B.ankstesne, as = A && A.sprendimai && A.sprendimai[r.raktas];
    if (as && !s) {
      h += '<p class="tk-ankst">Ankstesnėje patikroje (' + esc(A.data || "") + "): <b>" + esc(SPR[as.s] || as.s) + "</b>" + (as.pagrindimas ? " - " + esc(kab(as.pagrindimas)) : "") +
           ' <button type="button" class="sec" data-tk-palikti="' + r.raktas + '">Palikti šį sprendimą</button></p>';
    }
    return h;
  }
  function radinioHtml(r) {
    var naujas = B.ankstesne && B.ankstesne.radiniai && B.ankstesne.radiniai.indexOf(r.raktas) < 0;
    var bs = sprendimoBusena(r);
    var h = '<article class="tk-rad tk-rad--' + r.lygis + '" id="tkr-' + r.raktas + '" tabindex="-1" data-tk-busena="' + bs + '">' +
      '<div class="tk-rad-v"><span class="tk-zyma tk-zyma--' + r.lygis + '">' + esc(LYG[r.lygis] || r.lygis) + '</span><span class="tk-zyma">' + esc(r.grupe) + "</span>" +
      (r.svarbus ? '<span class="tk-zyma tk-zyma--svarbi">Jautri sritis</span>' : "") + (naujas ? '<span class="tk-zyma">Naujas nuo ankstesnės patikros</span>' : "") +
      (bs === "ispresta" ? '<span class="tk-zyma tk-zyma--sprendimas">' + esc(SPR[B.sprendimai[r.raktas].s]) + "</span>" : "") + "</div>" +
      '<p class="tk-rad-t">' + esc(r.tekstas) + "</p>";
    if (r.kilme === "palyginimas") h += pakeitimoTurinys(r.p, B.palyg[r.docId]);
    if (r.pastaba) h += '<p class="tk-rad-p">' + esc(r.pastaba) + "</p>";
    h += vietosHtml(r.vietos) + teisesHtml(r.teise) + sprendimoHtml(r) + "</article>";
    return h;
  }
  function santraukaHtml() {
    var sk = { kliutis: 0, nukrypimas: 0, tikrinti: 0, rekomendacija: 0, info: 0 };
    B.radiniai.forEach(function (r) { if (sk[r.lygis] != null) sk[r.lygis]++; });
    var pt = visosPatikros(), gerai = pt.filter(function (p) { return p.busena === "gerai"; }).length, nep = pt.filter(function (p) { return p.busena === "nepatikrinta"; }).length;
    var h = "";
    // Rekomendacijos (kvalifikacijos proporcingumas) - TVARKA eilėje, rodomos tik esant
    TVARKA.forEach(function (l) { if (l !== "rekomendacija" || sk[l]) h += '<li class="tk-s tk-s--' + l + '">' + LYG_DGS[l] + " <b>" + sk[l] + "</b></li>"; });
    h += '<li class="tk-s tk-s--gerai">Patikrinta <b>' + gerai + "</b> iš " + pt.length + "</li>";
    if (nep) h += '<li class="tk-s tk-s--nepatikrinta">Nepatikrinta <b>' + nep + "</b></li>";
    var spr = B.radiniai.filter(function (r) { return r.lygis !== "info"; }), isp = spr.filter(function (r) { return sprendimoBusena(r) === "ispresta"; }).length,
        bp = spr.filter(function (r) { return sprendimoBusena(r) === "be_pagrindimo"; }).length;
    h += '<li class="tk-s tk-s--spr">Sprendimai <b>' + isp + "</b> iš " + spr.length + (bp ? " (be pagrindimo: " + bp + ")" : "") + "</li>";
    return h;
  }
  function saltinisTekstas() {
    var k = cfg.kortele ? cfg.kortele() : null, rz = B.rez;
    return k ? "Palyginta su pirkimo kortele " + kab(k.pavadinimas || "?") + "."
      : rz && rz.faktai && rz.faktai.skelbimas ? "Kortelė nepasirinkta - taisyklės tikrintos pagal skelbimo duomenis."
      : "Kortelė nepasirinkta ir skelbimo pakete nėra - kortelės ir taisyklių patikros neatliktos.";
  }
  function grupeHtml(lygis, antraste) {
    var sar = B.radiniai.filter(function (r) { return r.lygis === lygis; });
    if (!sar.length) return "";
    var visi = B.rodytiVisus[lygis], rod = visi ? sar : sar.slice(0, MAX_RODOMA);
    var h = '<h3 class="tk-gr-h">' + esc(antraste) + " (" + sar.length + ")</h3>" + (PAAISKINIMAS[lygis] ? '<p class="tk-gr-p">' + PAAISKINIMAS[lygis] + "</p>" : "") + rod.map(radinioHtml).join("");
    if (sar.length > rod.length) h += '<button type="button" class="sec tk-dar" data-tk-dar="' + lygis + '">Rodyti dar ' + (sar.length - rod.length) + "</button>";
    return h;
  }
  function ankstesnesJuosta() {
    var A = B.ankstesne;
    if (!A) return "";
    var raktai = {}; B.radiniai.forEach(function (r) { raktai[r.raktas] = 1; });
    var spr = Object.keys(A.sprendimai || {}), rodoma = spr.filter(function (k) { return raktai[k]; }).length;
    var nebera = (A.radiniai || []).filter(function (k) { return !raktai[k]; }).length;
    var nauji = B.radiniai.filter(function (r) { return (A.radiniai || []).indexOf(r.raktas) < 0; }).length;
    return '<div class="tk-ankst-j" role="note"><b>Ankstesnė patikra (' + esc(A.data || "") + ", " + esc(A.vardas || "") + "):</b> jos sprendimai rodomi prie " + rodoma + " iš " + spr.length +
      " radinių (patvirtinkite juos mygtuku „Palikti šį sprendimą“); naujų radinių - " + nauji + "; ankstesnių radinių, kurių nebėra, - " + nebera + ".</div>";
  }
  function svarbiausiaHtml() {
    var h = ankstesnesJuosta();
    var g = grupeHtml("kliutis", "Kliūtys - taisykite prieš tvirtindami ir skelbdami") + grupeHtml("nukrypimas", "Nukrypimai nuo standartinės formos") +
            grupeHtml("tikrinti", "Patikrinkite") + grupeHtml("rekomendacija", "Rekomendacijos");
    h += g || '<p class="tk-tuscia">Kliūčių, nukrypimų nuo formos ir abejotinų vietų nerasta - visos atliktos patikros praėjo (žr. „Visos patikros“, ko nepatikrinta).</p>';
    var info = B.radiniai.filter(function (r) { return r.lygis === "info"; });
    if (info.length) h += '<details class="tk-info"><summary>Informacija (' + info.length + ")</summary>" + info.map(radinioHtml).join("") + "</details>";
    return h;
  }
  function formosPasirinkimas(d, x) {
    var id = "tkf-" + d.id, dab = pasirinktaForma(d);
    var opt = '<option value="">Nelyginti su forma</option>';
    if (x.pasas) opt += '<option value="__pasas"' + (B.formos[d.id] === undefined ? " selected" : "") + ">Pagal generavimo pasą (" + esc(x.pasas.sablonas || "") + ")</option>";
    Object.keys((indeksas && indeksas.formos) || {}).sort().forEach(function (f) {
      var bal = (x.idf || []).find(function (q) { return q.id === f; });
      opt += '<option value="' + esc(f) + '"' + (!(x.pasas && B.formos[d.id] === undefined) && dab === f ? " selected" : "") + ">" + esc(formosPav(f)) + (bal ? " - panašumas " + Math.round(bal.balas * 100) + " %" : "") + "</option>";
    });
    return '<label for="' + id + '">Forma</label><select id="' + id + '" data-tk-forma="' + d.id + '">' + opt + "</select>";
  }
  function formosBusena(d, x) {
    if (!x) return d.ext === "pdf" ? "PDF - su forma lyginamas tik Word (DOCX) failas." : "";
    if (x.klaida) return "Word failo perskaityti nepavyko: " + x.klaida;
    if (!x.forma) {
      var v = vaidmuo(d), art = x.idf && x.idf[0];
      if (B.formos[d.id] === "") return "Pasirinkta nelyginti su forma.";
      return (v === "sps" || v === "bps" || (art && art.balas >= 0.3)) && art
        ? "Forma neatpažinta (artimiausia - " + formosPav(art.id) + ", " + Math.round(art.balas * 100) + " %). Jei tai LITGRID forma - pasirinkite ją."
        : "Su standartine forma nelyginama: rodyklėje - LITGRID SPS, BPS ir DPS sąlygų formos bei prekių ir paslaugų pirkimo-pardavimo sutarčių " +
          "bendrosios ir specialiosios sąlygos" + (sutarciuKlaida ? " (sutarčių šablonų registro įkelti nepavyko: " + sutarciuKlaida + ")" : "") + ". Jei tai viena iš jų - pasirinkite.";
    }
    if (x.klaidaLyg) return "Palyginti nepavyko: " + x.klaidaLyg;
    var s = x.rez.statistika;
    var kaip = x.pagalPasa ? "Sugeneruota šiuo moduliu - lyginama pagal generavimo pasą (" + (x.pasas.data || "data nenurodyta") + (x.pasoVersija === "kita" ? "; sugeneruota iš ankstesnės formos versijos" : "") + ")"
      : (x.pagal === "atpazinta" && B.formos[d.id] === undefined ? "Forma atpažinta: " : "Forma pasirinkta: ") + formosPav(x.forma) +
        (x.idf && x.idf[0] && x.idf[0].id === x.forma ? " (panašumas " + Math.round(x.idf[0].balas * 100) + " %; siūloma - patikrinkite)" : "");
    return kaip + ". Pastraipų: nepakeistos " + s.vienodos + ", nukrypimai " + s.nukrypimas + ", laukiami pakeitimai " + (s.neprivaloma + s.uzpildyta + s.techninis) + "." +
      (x.rez.senaVersija && (formosIrasas(x.forma) || {}).sutartis ? " Dokumentas parengtas pagal ankstesnę formos redakciją (LITGRID „0922“): jos tekstas ir G-Procure taisymai nukrypimais nelaikomi. " +
        "Jei rengėjas pašalino pastraipą, kurią G-Procure pataisė, palyginimas to nemato - tokias vietas (laukiamuose pakeitimuose) peržiūrėkite." : "");
  }
  function dokumentaiHtml() {
    if (!B.docs) return "";
    var docs = B.docs.slice().sort(function (a, b) { return VAIDMENU_TVARKA.indexOf(vaidmuo(a)) - VAIDMENU_TVARKA.indexOf(vaidmuo(b)); });
    return docs.map(function (d) {
      var x = B.palyg[d.id], v = vaidmuo(d), id = "tkvm-" + d.id, vard = bazinis(d.name);
      var opt = GP_PARENGTIS.vaidmenys().map(function (r) { return '<option value="' + r + '"' + (r === v ? " selected" : "") + ">" + esc(GP_PARENGTIS.vaidmensPav(r, "lt")) + "</option>"; }).join("");
      var mano = B.radiniai.filter(function (r) { return (r.docId === d.id) || (r.vietos || []).some(function (q) { return q.dok === d.id; }); });
      var vp = versijosPokyciai(d), vh = "";
      if (vp) {
        if (vp.tas) vh = "Nuo ankstesnės patikros nepakeistas (tas pats failas).";
        else if (vp.nezinoma) vh = "Ankstesnėje patikroje - " + esc(vp.a.vardas) + "; pakeitimų suskaičiuoti negalima (ne Word failas).";
        else {
          vh = "Nuo ankstesnės patikros (" + esc(vp.a.vardas) + "): pakeista " + vp.sk.pakeista + ", pridėta " + vp.sk.prideta + ", pašalinta " + vp.sk.pasalinta + " pastraipų" + (vp.sk.perkelta ? ", perkelta " + vp.sk.perkelta : "") + ".";
          var rod = vp.pakeitimai.filter(function (p) { return p.op !== "pasalinta" && p.dok; });
          if (rod.length) vh += '<details class="tk-vp"><summary>Pakeistos ir pridėtos pastraipos (' + rod.length + ")</summary><ul>" + rod.map(function (p) { return "<li><b>" + OP_TRUMPAI[p.op] + ":</b> " + esc(p.dok) + "</li>"; }).join("") + "</ul></details>";
        }
      }
      return '<section class="tk-dok" aria-labelledby="tkdh-' + d.id + '"><h3 id="tkdh-' + d.id + '">' + esc(vard) + "</h3>" +
        '<div class="tk-dok-l"><span><label for="' + id + '">Vaidmuo</label><select id="' + id + '" data-tk-vaidmuo="' + d.id + '">' + opt + "</select></span>" +
        (x && x.ps ? "<span>" + formosPasirinkimas(d, x) + "</span>" : "") + "</div>" +
        '<p class="tk-dok-b">' + esc(formosBusena(d, x)) + "</p>" + (vh ? '<div class="tk-dok-b">' + vh + "</div>" : "") +
        (mano.length ? '<ul class="tk-dok-r">' + mano.map(function (r) {
          return '<li><span class="tk-zyma tk-zyma--' + r.lygis + '">' + esc(LYG[r.lygis]) + "</span> " + esc(r.tekstas) + (r.kilme === "palyginimas" && r.p.skyrius ? " · " + esc(r.p.skyrius) : "") +
            ' <button type="button" class="sec tk-maz" data-tk-eiti="' + r.raktas + '">Rodyti</button></li>';
        }).join("") + "</ul>" : '<p class="tk-dok-b">Radinių šiame dokumente nėra.</p>') + "</section>";
    }).join("");
  }
  function palyginimasHtml() {
    var lyg = B.docs.filter(function (d) { var x = B.palyg[d.id]; return x && x.rez; });
    if (!lyg.length) return '<p class="tk-tuscia">Nė vienas dokumentas nepalygintas su forma. Su forma lyginami Word (DOCX) failai, kurių forma atpažinta arba pasirinkta („Pagal dokumentą“).</p>';
    if (!B.palygDok || !lyg.some(function (d) { return d.id === B.palygDok; })) B.palygDok = lyg[0].id;
    var d = lyg.find(function (q) { return q.id === B.palygDok; }), x = B.palyg[d.id], pk = x.rez.pakeitimai;
    var rod = pk.map(function (p, k) { return { p: p, k: k }; }).filter(function (o) { return o.p.rusis === "nukrypimas" || B.laukiami; });
    var laukiami = pk.filter(function (p) { return p.rusis !== "nukrypimas"; }).length;
    var h = '<div class="tk-pl-v">';
    if (lyg.length > 1) h += '<label for="tkPlDok">Dokumentas</label><select id="tkPlDok">' + lyg.map(function (q) { return '<option value="' + q.id + '"' + (q.id === d.id ? " selected" : "") + ">" + esc(bazinis(q.name)) + "</option>"; }).join("") + "</select>";
    h += '<label class="tk-chk"><input type="checkbox" id="tkLaukiami"' + (B.laukiami ? " checked" : "") + "> Rodyti laukiamus pakeitimus (" + laukiami + "): užpildytos vietos, sąlyginės formos dalys, numeracija, turinys</label></div>";
    h += '<p class="tk-dok-b">' + esc(formosBusena(d, x)) + "</p>";
    // skyriai su nukrypimų skaičiais
    var sk = [], skM = {};
    rod.forEach(function (o) { var s = o.p.skyrius || "Dokumento pradžia"; if (!skM[s]) { skM[s] = { s: s, n: 0, id: "tks-" + sk.length }; sk.push(skM[s]); } if (o.p.rusis === "nukrypimas") skM[s].n++; });
    h += '<div class="tk-pl">';
    h += '<nav class="tk-pl-sk" aria-label="Skyriai"><ul>' + sk.map(function (s) { return '<li><a href="#' + s.id + '" data-tk-sk="' + s.id + '">' + esc(s.s) + ' <span class="tk-sk-n">' + s.n + "</span></a></li>"; }).join("") + "</ul></nav>";
    h += '<div class="tk-pl-d">';
    if (!rod.length) h += '<p class="tk-tuscia">Nukrypimų nuo formos nėra' + (laukiami ? " - visi " + laukiami + " pakeitimai laukiami (pažymėkite „Rodyti laukiamus pakeitimus“)." : ".") + "</p>";
    var dabar = null;
    rod.forEach(function (o) {
      var p = o.p, s = p.skyrius || "Dokumento pradžia";
      if (s !== dabar) { dabar = s; h += '<h4 class="tk-pl-h" id="' + skM[s].id + '" tabindex="-1">' + esc(s) + "</h4>"; }
      var et = p.rusis === "nukrypimas" ? OP_TRUMPAI[p.op] + " - nukrypimas" : OP_TRUMPAI[p.op] + " - " + (RUSIS[p.rusis] || p.rusis).toLowerCase() + (p.poRusis && PO_RUSIS[p.poRusis] ? " (" + PO_RUSIS[p.poRusis] + ")" : "");
      h += '<div class="tk-eil tk-eil--' + p.rusis + '" id="tke-' + d.id + "-" + o.k + '" tabindex="-1"><div class="tk-eil-et">' + esc(et) + "</div>" + pakeitimoTurinys(p, x) + "</div>";
    });
    h += "</div></div>";
    return h;
  }
  function patikrosHtml() {
    var pt = visosPatikros(), BUS = { gerai: "patikrinta - be pastabų", radinys: "yra radinių", nepatikrinta: "nepatikrinta", netaikoma: "netaikoma" };
    var h = '<h3 class="tk-gr-h">Kas patikrinta (' + pt.length + ')</h3><div class="tk-lent-r"><table class="tk-lent" id="tkPatikrosLent"><thead><tr><th scope="col">Patikra</th><th scope="col">Grupė</th><th scope="col">Būsena</th><th scope="col">Pastaba</th></tr></thead><tbody>' +
      pt.map(function (p) { return '<tr><td data-et="Patikra">' + esc(p.pav) + '</td><td data-et="Grupė">' + esc(p.grupe) + '</td><td data-et="Būsena" class="tk-b-' + esc(p.busena) + '">' + esc(BUS[p.busena] || p.busena) + '</td><td data-et="Pastaba">' + esc(p.pastaba) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    var ds = B.rez ? B.rez.dokumentai : [];
    h += '<h3 class="tk-gr-h">Paketo failai (' + ds.length + ')</h3><p class="cite">Vaidmenį ir formą galite pakeisti skiltyje „Pagal dokumentą“ - patikra persiskaičiuos. Kontrolinė suma (SHA-256) parodo, kuri failo versija patikrinta.</p>' +
      '<div class="tk-lent-r"><table class="tk-lent" id="tkFailaiLent"><thead><tr><th scope="col">Failas</th><th scope="col">Vaidmuo</th><th scope="col">Perskaitytas</th><th scope="col">SHA-256</th></tr></thead><tbody>' +
      ds.map(function (d) {
        return '<tr><td data-et="Failas">' + esc(d.trumpas || bazinis(d.name)) + '</td><td data-et="Vaidmuo">' + esc(GP_PARENGTIS.vaidmensPav(d.vaidmuo, "lt")) + '</td><td data-et="Perskaitytas">' +
          (d.parseStatus === "parsed" ? "taip" : d.parseStatus === "partial" ? "iš dalies" : "ne") + '</td><td data-et="SHA-256">' + esc(d.sha256 ? d.sha256.slice(0, 12) : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    return h;
  }
  function piesk() {
    if (!B.docs) return;
    $("tkSantrauka").innerHTML = santraukaHtml();
    $("tkSaltinis").textContent = saltinisTekstas();
    VAIZDAI.forEach(function (v) {
      var t = $("tkv-" + v), p = $("tkp-" + v), ar = v === B.vaizdas;
      t.setAttribute("aria-selected", ar ? "true" : "false"); t.tabIndex = ar ? 0 : -1; p.hidden = !ar;
    });
    $("tkp-svarbiausia").innerHTML = svarbiausiaHtml();
    $("tkp-dokumentai").innerHTML = dokumentaiHtml();
    $("tkp-palyginimas").innerHTML = palyginimasHtml();
    $("tkp-patikros").innerHTML = patikrosHtml();
    $("tkLaikas").textContent = "Patikrinta " + laikoTekstas(B.laikas) + " šioje naršyklėje, failų: " + B.docs.length + ". Rezultatas galioja tik šiai paketo versijai; „Patikrinta“ - apibrėžtos patikros praėjo, ne teisinis patvirtinimas.";
  }
  function perpieskRadini(raktas, fokusas) {
    var r = B.radiniai.find(function (x) { return x.raktas === raktas; });
    var el = $("tkr-" + raktas);
    if (!r || !el) return;
    var tmp = document.createElement("div"); tmp.innerHTML = radinioHtml(r);
    el.parentNode.replaceChild(tmp.firstChild, el);
    $("tkSantrauka").innerHTML = santraukaHtml();
    if (fokusas) { var f = document.querySelector(fokusas); if (f) f.focus(); }
  }
  function rodykVaizda(v, fokusuoti) {
    B.vaizdas = v;
    VAIZDAI.forEach(function (q) {
      var t = $("tkv-" + q), p = $("tkp-" + q), ar = q === v;
      t.setAttribute("aria-selected", ar ? "true" : "false"); t.tabIndex = ar ? 0 : -1; p.hidden = !ar;
    });
    if (fokusuoti) $("tkv-" + v).focus();
  }

  /* ---------------------------------------------------------------- įvykiai */
  function ivykiai() {
    var imesti = $("tkImesti"), input = $("tkFailai");
    $("tkRinktis").addEventListener("click", function (e) { e.stopPropagation(); input.click(); });
    imesti.addEventListener("click", function (e) { if (e.target === imesti) input.click(); });
    input.addEventListener("change", function () { var f = [].slice.call(this.files || []); this.value = ""; if (f.length) skaityk(f); });
    ["dragenter", "dragover"].forEach(function (ev) { imesti.addEventListener(ev, function (e) { e.preventDefault(); imesti.classList.add("tempiama"); }); });
    ["dragleave", "drop"].forEach(function (ev) { imesti.addEventListener(ev, function () { imesti.classList.remove("tempiama"); }); });
    imesti.addEventListener("drop", function (e) { e.preventDefault(); var f = [].slice.call((e.dataTransfer && e.dataTransfer.files) || []); if (f.length) skaityk(f); });

    var tl = $("tkVaizdai");
    tl.addEventListener("click", function (e) { var t = e.target.closest("[role=tab]"); if (t) rodykVaizda(t.id.replace("tkv-", "")); });
    tl.addEventListener("keydown", function (e) {
      var i = VAIZDAI.indexOf(B.vaizdas), n = null;
      if (e.key === "ArrowRight") n = (i + 1) % VAIZDAI.length; else if (e.key === "ArrowLeft") n = (i - 1 + VAIZDAI.length) % VAIZDAI.length;
      else if (e.key === "Home") n = 0; else if (e.key === "End") n = VAIZDAI.length - 1;
      if (n !== null) { e.preventDefault(); rodykVaizda(VAIZDAI[n], true); }
    });

    var rez = $("tkRezultatai");
    rez.addEventListener("click", function (e) {
      var b = e.target.closest("button, a[data-tk-sk]");
      if (!b) return;
      var ds = b.dataset;
      if (ds.tkSpr) {
        var r = ds.tkR, s = B.sprendimai[r];
        if (s && s.s === ds.tkSpr) delete B.sprendimai[r];
        else B.sprendimai[r] = { s: ds.tkSpr, pagrindimas: s && s.pagrindimas || "", data: GP_EKSPORTAS.siandien() };
        perpieskRadini(r, B.sprendimai[r] && B.sprendimai[r].s === "priimta" ? "#tkp-" + r : '#tkr-' + r + ' [data-tk-spr="' + ds.tkSpr + '"]');
      } else if (ds.tkPalikti) {
        var a = B.ankstesne.sprendimai[ds.tkPalikti];
        B.sprendimai[ds.tkPalikti] = { s: a.s, pagrindimas: a.pagrindimas || "", data: a.data || "", is: B.ankstesne.data || "" };
        perpieskRadini(ds.tkPalikti, '#tkr-' + ds.tkPalikti + ' [data-tk-spr="' + a.s + '"]');
      } else if (ds.tkDar) {
        B.rodytiVisus[ds.tkDar] = true; $("tkp-svarbiausia").innerHTML = svarbiausiaHtml();
      } else if (ds.tkEiti) {
        rodykVaizda("svarbiausia");
        var rr = B.radiniai.find(function (x) { return x.raktas === ds.tkEiti; });
        if (rr && !$("tkr-" + ds.tkEiti)) { B.rodytiVisus[rr.lygis] = true; $("tkp-svarbiausia").innerHTML = svarbiausiaHtml(); }
        var info = document.querySelector("#tkp-svarbiausia details.tk-info"); if (info && rr && rr.lygis === "info") info.open = true;
        var el = $("tkr-" + ds.tkEiti); if (el) { el.scrollIntoView({ block: "start" }); el.focus(); }
      } else if (ds.tkRodyti) {
        var q = ds.tkRodyti.split(":"), x = B.palyg[q[0]];
        B.palygDok = q[0];
        if (x && x.rez && x.rez.pakeitimai[+q[1]] && x.rez.pakeitimai[+q[1]].rusis !== "nukrypimas") B.laukiami = true;
        $("tkp-palyginimas").innerHTML = palyginimasHtml();
        rodykVaizda("palyginimas");
        var e2 = $("tke-" + q[0] + "-" + q[1]); if (e2) { e2.scrollIntoView({ block: "center" }); e2.focus(); }
      } else if (ds.tkKopijuoti) {
        var rk = B.radiniai.find(function (x) { return x.raktas === ds.tkKopijuoti; });
        if (rk && global.GP_KOPIJA) GP_KOPIJA.kopijuok(rk.p.forma, { sekme: "Formos tekstas nukopijuotas" });
      } else if (ds.tkSk) {
        e.preventDefault(); var h = $(ds.tkSk); if (h) { h.scrollIntoView({ block: "start" }); h.focus(); }
      }
    });
    rez.addEventListener("input", function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.tkPagr && B.sprendimai[t.dataset.tkPagr]) {
        B.sprendimai[t.dataset.tkPagr].pagrindimas = t.value;
        var art = $("tkr-" + t.dataset.tkPagr), r = B.radiniai.find(function (x) { return x.raktas === t.dataset.tkPagr; });
        if (art && r) {
          art.setAttribute("data-tk-busena", sprendimoBusena(r));
          var tr = art.querySelector(".tk-truksta"); if (tr) tr.hidden = sprendimoBusena(r) !== "be_pagrindimo";
        }
        $("tkSantrauka").innerHTML = santraukaHtml();
      }
    });
    rez.addEventListener("change", async function (e) {
      var t = e.target, ds = t.dataset || {};
      if (ds.tkVaidmuo) { B.vaidmenys[ds.tkVaidmuo] = t.value; tikrinkParengti(); surinkRadinius(); piesk(); var s = $("tkvm-" + ds.tkVaidmuo); if (s) s.focus(); }
      else if (ds.tkForma) {
        var d = B.docs.find(function (q) { return q.id === ds.tkForma; });
        if (t.value === "__pasas") delete B.formos[d.id]; else B.formos[d.id] = t.value;
        await lygink(d); tikrinkParengti(); surinkRadinius(); piesk(); var f = $("tkf-" + d.id); if (f) f.focus();
      } else if (t.id === "tkLaukiami") { B.laukiami = t.checked; $("tkp-palyginimas").innerHTML = palyginimasHtml(); $("tkLaukiami").focus(); }
      else if (t.id === "tkPlDok") { B.palygDok = t.value; $("tkp-palyginimas").innerHTML = palyginimasHtml(); $("tkPlDok").focus(); }
    });
    $("tkAtaskaita").addEventListener("click", atsisiuskAtaskaita);
    $("tkSpausdinti").addEventListener("click", function () { window.print(); });
    $("tkKitas").addEventListener("click", function () {
      var e = B.eiga; B = nauja(); B.eiga = e + 1;
      $("tkRezultatai").hidden = true; GP_BUSENA.slepk("#tkBusena"); $("tkRinktis").focus();
    });
  }

  /* ---------------------------------------------------------------- Word ataskaita */
  /* Oficialus stilius (shared/docx-stiliai.js): be žalios, lentelių antraštės F2F2F2, be U+2013 ir U+2014; lentelės - DXA pločiai,
     tblLayout fixed (Pages). Mašinai skaitomi duomenys - customXml dalyje NS_ATASKAITA: sprendimai, radinių raktai ir dokumentų
     pastraipų maišos (versijoms palyginti). Ataskaita skirta komisijai - joje yra dokumentų citatos ir pagrindimai. */
  var PLOTIS = 9638;   // A4 11906 - 2 x 1134 paraštės (DXA)
  function wx(s) { return esc(global.GP_DOCX_STILIAI ? GP_DOCX_STILIAI.bruksniai(s) : s); }
  function wr(t, o) {
    o = o || {};
    var p = (o.b ? "<w:b/><w:bCs/>" : "") + (o.i ? "<w:i/><w:iCs/>" : "") + (o.strike ? "<w:strike/>" : "") + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : "") + (o.u ? '<w:u w:val="single"/>' : "");
    return "<w:r>" + (p ? "<w:rPr>" + p + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + wx(t) + "</w:t></w:r>";
  }
  function wp(runs, o) {
    o = o || {};
    var p = (o.st ? '<w:pStyle w:val="' + o.st + '"/>' : "") + (o.keep ? "<w:keepNext/>" : "") + '<w:spacing w:before="' + (o.pr || 0) + '" w:after="' + (o.po == null ? 100 : o.po) + '"/>' + (o.ind ? '<w:ind w:left="' + o.ind + '"/>' : "");
    return "<w:p><w:pPr>" + p + "</w:pPr>" + (Array.isArray(runs) ? runs.join("") : runs) + "</w:p>";
  }
  function wlent(plociai, eil) {
    var suma = plociai.reduce(function (a, b) { return a + b; }, 0);
    plociai = plociai.slice(); plociai[plociai.length - 1] += PLOTIS - suma;
    var kr = '<w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>';
    var x = '<w:tbl><w:tblPr><w:tblW w:w="' + PLOTIS + '" w:type="dxa"/><w:tblBorders>' + kr + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' +
      plociai.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join("") + "</w:tblGrid>";
    eil.forEach(function (e, i) {
      x += "<w:tr><w:trPr><w:cantSplit/>" + (i === 0 ? "<w:tblHeader/>" : "") + "</w:trPr>" + e.map(function (c, j) {
        return '<w:tc><w:tcPr><w:tcW w:w="' + plociai[j] + '" w:type="dxa"/>' + (i === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : "") + "</w:tcPr>" + wp(wr(c, { b: i === 0, sz: 18 }), { po: 0 }) + "</w:tc>";
      }).join("") + "</w:tr>";
    });
    return x + "</w:tbl>" + wp("", { po: 120 });
  }
  function ataskaitosDuomenys() {
    var k = cfg.kortele ? cfg.kortele() : null;
    return { versija: 1, data: laikoTekstas(B.laikas), sukurta: laikoTekstas(new Date()), kortele: k ? { id: k.id, pavadinimas: k.pavadinimas || "", numeris: k.numeris || "" } : null,
      dokumentai: B.docs.map(function (d) {
        var x = B.palyg[d.id];
        return { vardas: bazinis(d.name), sha256: d.sha256 || "", vaidmuo: vaidmuo(d), forma: (x && x.forma) || "", pagal: x && x.rez ? (x.pagalPasa ? "pasas" : "forma") : "",
                 pastraipos: x && x.ps ? x.ps.map(function (q) { return P().maisa(q.n); }).join(" ") : "" };
      }),
      radiniai: B.radiniai.map(function (r) { return r.raktas; }),
      sprendimai: B.sprendimai };
  }
  async function ataskaita() {
    if (!global.JSZip) throw new Error("JSZip neįkeltas - ataskaitos sukurti negalima");
    var k = cfg.kortele ? cfg.kortele() : null, pt = visosPatikros(), body = "";
    body += wp(wr("Pirkimo dokumentų patikros ataskaita"), { st: "Heading1" });
    body += wp([wr("Pirkimas: ", { b: true }), wr(k ? (k.pavadinimas || "") + (k.numeris ? " (" + k.numeris + ")" : "") : "pirkimo kortelė nepasirinkta")]);
    body += wp([wr("Patikrinta: ", { b: true }), wr(laikoTekstas(B.laikas) + " · G-Procure, Pirkimo sąlygų generatorius, „Tikrinti parengtus dokumentus“ (taisyklės ir palyginimas su forma, be DI)")]);
    if (B.ankstesne) body += wp([wr("Ankstesnė patikra: ", { b: true }), wr((B.ankstesne.data || "") + " (" + (B.ankstesne.vardas || "") + ")")]);
    var sk = { kliutis: 0, nukrypimas: 0, tikrinti: 0, rekomendacija: 0, info: 0 };
    B.radiniai.forEach(function (r) { sk[r.lygis]++; });
    body += wp(wr("Santrauka"), { st: "Heading2", keep: true });
    body += wlent([5000, 4638], [["Lygis", "Skaičius"]].concat(TVARKA.filter(function (l) { return l !== "rekomendacija" || sk[l]; }).map(function (l) { return [LYG_DGS[l], String(sk[l])]; }))
      .concat([["Patikrinta (apibrėžtos patikros praėjo)", pt.filter(function (p) { return p.busena === "gerai"; }).length + " iš " + pt.length], ["Nepatikrinta", String(pt.filter(function (p) { return p.busena === "nepatikrinta"; }).length)]]));
    body += wp(wr("Patikrintas paketas"), { st: "Heading2", keep: true });
    body += wlent([3600, 1700, 3000, 1338], [["Failas", "Vaidmuo", "Palyginimas su forma", "SHA-256"]].concat(B.docs.map(function (d) {
      var x = B.palyg[d.id];
      var f = !x || !x.ps ? "nelyginta (ne DOCX)" : !x.rez ? "nelyginta" : x.pagalPasa ? "pagal generavimo pasą (" + (x.pasas.sablonas || "") + ")" : formosPav(x.forma);
      return [bazinis(d.name), GP_PARENGTIS.vaidmensPav(vaidmuo(d), "lt"), f, d.sha256 ? d.sha256.slice(0, 12) : ""];
    })));
    body += wp(wr("Radiniai ir sprendimai"), { st: "Heading2", keep: true });
    if (!B.radiniai.length) body += wp(wr("Radinių nėra - visos atliktos patikros praėjo."));
    B.radiniai.forEach(function (r, i) {
      var s = B.sprendimai[r.raktas];
      body += wp([wr((i + 1) + ". " + (LYG[r.lygis] || r.lygis) + " · " + r.grupe, { b: true })], { pr: 120, keep: true });
      body += wp(wr(r.tekstas), { keep: true });
      if (r.kilme === "palyginimas") {
        var p = r.p;
        if (p.op === "pakeista" && p.forma) body += wp(P().zodziai(p.forma, p.dok).map(function (q) { return wr(q.o === "-" ? "[-" + q.t + "-]" : q.o === "+" ? "[+" + q.t + "+]" : q.t, { strike: q.o === "-", u: q.o === "+", b: q.o === "+" }); }), { ind: 360 });
        else if (p.forma && p.op === "pasalinta") body += wp([wr("Formos tekstas: ", { i: true }), wr(p.forma, { strike: true })], { ind: 360 });
        else if (p.dok) body += wp([wr("Dokumente: ", { i: true }), wr(p.dok)], { ind: 360 });
      }
      if (r.pastaba) body += wp(wr(r.pastaba, { i: true }), { ind: 360 });
      (r.vietos || []).forEach(function (v) { if (v.failas || v.citata) body += wp(wr("Kur: " + [v.failas, v.vieta].filter(Boolean).join(" · ") + (v.citata ? ": „" + v.citata + "“" : ""), { sz: 18 }), { ind: 360 }); });
      if (r.teise && r.teise.length) body += wp(wr("Teisinis pagrindas: " + r.teise.map(function (t) { return t.cit; }).join("; "), { sz: 18 }), { ind: 360 });
      body += wp([wr("Sprendimas: ", { b: true }), wr(!s ? "nespręsta" : (SPR[s.s] || s.s) + (s.pagrindimas ? " - " + s.pagrindimas : (s.s === "priimta" && reikiaPagrindimo(r) ? " - pagrindimas neįrašytas" : "")) + (s.is ? " (iš ankstesnės patikros " + s.is + ")" : ""))], { ind: 360 });
    });
    body += wp(wr("Kas patikrinta"), { st: "Heading2", keep: true });
    var BUS = { gerai: "patikrinta - be pastabų", radinys: "yra radinių", nepatikrinta: "nepatikrinta", netaikoma: "netaikoma" };
    body += wlent([3500, 1800, 1700, 2638], [["Patikra", "Grupė", "Būsena", "Pastaba"]].concat(pt.map(function (p) { return [p.pav, p.grupe, BUS[p.busena] || p.busena, p.pastaba || ""]; })));
    body += wp(wr("Ataskaita galioja tik šiai paketo versijai (žr. kontrolines sumas). „Patikrinta“ reiškia, kad apibrėžtos patikros praėjo - tai ne teisinis patvirtinimas. Šiame faile įrašyti ir mašinai skaitomi sprendimai: įkėlus jį kartu su nauja paketo versija, sprendimai parodomi prie tų pačių radinių, o dokumentų pakeitimai nuo šios patikros suskaičiuojami.", { i: true, sz: 18 }), { pr: 240 });
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var stiliai = GP_DOCX_STILIAI.xml({ font: "Arial", size: 20, oficialus: true, stiliai: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 30, bold: true, color: "000000" }, paragraph: { spacing: { before: 0, after: 200 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { size: 24, bold: true, color: "000000" }, paragraph: { spacing: { before: 240, after: 120 } } }] });
    var duom = esc(JSON.stringify(ataskaitosDuomenys()));
    var z = new global.JSZip(), NF = { createFolders: false };   // be katalogų įrašų (kaip GPDocx.save) - Word pakuotėje jų nėra
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/customXml/itemProps1.xml" ContentType="application/vnd.openxmlformats-officedocument.customXmlProperties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>', NF);
    z.file("docProps/core.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Pirkimo dokumentų patikros ataskaita</dc:title><dc:creator>G-Procure</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, "Z") + "</dcterms:created></cp:coreProperties>", NF);
    z.file("word/document.xml", doc, NF);
    z.file("word/styles.xml", stiliai, NF);
    z.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/></Relationships>', NF);
    z.file("customXml/item1.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<ataskaita xmlns="' + NS_ATASKAITA + '" versija="1"><duomenys>' + duom + "</duomenys></ataskaita>", NF);
    z.file("customXml/itemProps1.xml", '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<ds:datastoreItem ds:itemID="{6B1C2F8E-3D4A-4E5B-9C7D-0A1B2C3D4E5F}" xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml"><ds:schemaRefs><ds:schemaRef ds:uri="' + NS_ATASKAITA + '"/></ds:schemaRefs></ds:datastoreItem>', NF);
    z.file("customXml/_rels/item1.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps" Target="itemProps1.xml"/></Relationships>', NF);
    return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
  }
  async function atsisiuskAtaskaita() {
    var r = await GP_BUSENA.vykdyk("#tkAtaskaitosBusena", { tipas: "eiga", tekstas: "Rengiama ataskaita", klaidosPriesdelis: "Ataskaitos parengti nepavyko",
      kartoti: atsisiuskAtaskaita, veiksmas: async function () { return ataskaita(); } });
    if (!r.ok) return;
    var k = cfg.kortele ? cfg.kortele() : null;
    var vardas = GP_EKSPORTAS.failoVardas({ numeris: k && k.numeris || "", dokumentas: "Patikros ataskaita", pavadinimas: k && k.pavadinimas || "", pletinys: "docx" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(r.reiksme); a.download = vardas;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    B.atsisiusta = JSON.stringify(B.sprendimai);
    GP_BUSENA.rodyk("#tkAtaskaitosBusena", { tipas: "gerai", tekstas: "Ataskaita atsisiųsta: " + vardas + ". Įkėlus ją kartu su nauja paketo versija, sprendimai bus parodyti prie tų pačių radinių." });
  }

  /* ---------------------------------------------------------------- viešas API */
  global.GP_TIKRINIMAS = {
    version: "1.0",
    mount: function (o) { cfg = o || {}; ivykiai(); },
    skaityk: skaityk,
    korteleKeista: function () { if (!B.docs) return; tikrinkParengti(); surinkRadinius(); piesk(); },
    darbas: function () { var s = JSON.stringify(B.sprendimai); return s === B.atsisiusta ? "" : s; },
    ataskaita: ataskaita,
    formosPav: formosPav,
    get busena() { return B; }
  };
})(typeof window !== "undefined" ? window : this);
