/* ============================================================================
 * G-Procure  shared/nuoseklumas.js   (window.GP_NUOSEKLUMAS)
 * ----------------------------------------------------------------------------
 * Pirkimo dokumentų tarpusavio nuoseklumas: techninė specifikacija (TS), specialiosios
 * pirkimo sąlygos (SPS) ir sutarties specialiosios sąlygos (2026-11-10, naudotojo
 * „Pradėkime paketo nuoseklumo patikrą“; kelio per modulius patikra rado paketą, kuris
 * prieštarauja pats sau, o paketo patikra to nemato). Viskas naršyklėje, be DI.
 *
 * Patikros (rezultatus rodo shared/parengtis.js grupė „TS, SPS ir sutartis“):
 *  - terminai: pristatymo, atlikimo ar paslaugų suteikimo terminas, skaičiuojamas nuo
 *    užsakymo (pavedimo) arba nuo sutarties įsigaliojimo (sudarymo), TS ir sutartyje.
 *    Lyginama tik ta pati atskaita; radinys - kai sutartyje toks terminas yra, TS taip pat,
 *    o nė viena TS reikšmė nesutampa su sutarties (garantija, trūkumų šalinimas, pranešimai,
 *    apmokėjimas, pratęsimas ir pan. - ne šis terminas);
 *  - zalieji: SPS sako, kad žalieji reikalavimai nurodyti TS ir (ar) sutarties projekte, o
 *    tuose (pakete esančiuose) dokumentuose aplinkos apsaugos reikalavimų požymių nėra;
 *  - kvalifikacija: TS - tiekėjo kvalifikacijos reikalavimų požymiai (vadybos sistemos
 *    sertifikatas tiekėjui, patirtis „per paskutinius N metų“), kurie nustatomi pirkimo
 *    sąlygose; kai SPS mini tą patį standartą - abi vietos;
 *  - standartai: TS nuorodos į standartus be žodžių „arba lygiavertis“, kai TS nėra bendros
 *    nuostatos, kad visi standartai taikomi su „arba lygiavertis“.
 * Lygis - visada „Patikrinkite“: tai požymiai, ne teisinė išvada; sprendžia žmogus.
 *
 * Reikia shared/kalbu-sutikrinimas.js (terminų reikšmės - GP_KALBU_SUTIKRINIMAS.reiksmes) ir
 * shared/money.js. Grynos funkcijos, nieko nesaugo ir nesiunčia:
 *  - tikrink({ docs, vaidmenys }) -> { terminai, zalieji, kvalifikacija, standartai }, kiekviena
 *    { busena: "gerai" | "radinys" | "nepatikrinta", priezastis, radiniai: [...] };
 *  - sakiniai(doc), terminai(doc), zaliujuTeiginys(doc), zaliujuPozymiai(doc, rusis), standartai(doc).
 * Tekstas iš dokumentų į HTML - tik per modulio ekranavimą.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var DIAK = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
  function be(s) { return String(s == null ? "" : s).toLowerCase().replace(/[ąčęėįšųūž]/g, function (c) { return DIAK[c]; }); }
  function iskarpa(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* Sakiniai (ir lentelės langeliai) su vieta. Dviejų stulpelių PDF angliškas stulpelis praleidžiamas,
     PDF eilučių lūžiai sakinyje sujungiami (dokumentai.js blokas - pastraipa ar puslapio dalis). */
  function sakiniai(doc) {
    var out = [], KS = global.GP_KALBU_SUTIKRINIMAS;
    ((doc && doc.blocks) || []).forEach(function (b) {
      if (b.loc && b.loc.stulpelis === "en") return;
      String(b.text || "").split(/\s+\|\s+/).forEach(function (cel) {
        var t = cel.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
        if (!t || (KS && KS.kalbaTeksto && KS.kalbaTeksto(t) === "en")) return;   // LT/EN lentelės angliškas langelis
        var blokas = String(b.text || "");
        t.replace(/([.;])\s+(?=[A-ZĄČĘĖĮŠŲŪŽ0-9„])/g, "$1\u0001").split("\u0001").forEach(function (s) {
          s = s.trim(); if (s) out.push({ t: s, loc: b.loc || null, blokas: blokas });
        });
      });
    });
    return out;
  }

  /* ---------------------------------------------------------------- terminai */
  // „teik“ - tik žodžio pradžioje: „teikiamos“, „teikimo“, bet ne „pateikia“ (pateikti dokumentą - ne paslaugų teikimas)
  var VEIKSMAS = /(pristat|patiek|tiekim|tiekt|atlik|suteik|(^|[^a-z])teik|ivykd|idieg|sumontuo)/;
  var TEIKEJAS = /teikej[a-z]*/g;      // „Paslaugų teikėjas“ - subjektas, ne veiksmas
  var NUO_UZS = /nuo\s+(?:\S+\s+){0,3}?(uzsakym|pavedim|paraisk)/;
  var NUO_SUT = /nuo\s+(?:\S+\s+){0,2}?sutarties\s+(isigaliojim|sudarym|pasirasym)/;
  // ne pristatymo ar atlikimo terminas: garantija, trūkumai, pranešimai, apmokėjimas, pratęsimas, kainų peržiūra, užtikrinimas ir pan.
  var NE_TERMINAS = /(garantij|trukum|defekt|gedim|reag|pranes|informuo|saskait|apmokej|atsiskait|pretenzij|ginc|draud|uztikrinim|delspinig|baud|netesyb|perziur|perskaic|prates|ne anksciau|likus|pagamint|instruktav|apmokym|koordinator|ekspertiz|ataskait|protokol|nutrauk|(?:^|[^a-z])galioj|kain|ikaini|atsaky|derin|isvad|pastab|grafik|avans|keisti|pakeist)/;

  // Apytikslė trukmė dienomis (tik palyginti „kuris ilgesnis“): darbo diena - 7/5 kalendorinės, mėnuo - 30,44 d.
  function dienos(raktas) {
    var m = /^(d|dd|men):(\d+(?:\.\d+)?)$/.exec(raktas || "");
    if (!m) return 0;
    var n = +m[2];
    return m[1] === "d" ? n : m[1] === "dd" ? n * 7 / 5 : n * 30.44;
  }
  function terminai(doc) {
    var KS = global.GP_KALBU_SUTIKRINIMAS, out = [];
    if (!KS || !KS.reiksmes) return out;
    sakiniai(doc).forEach(function (s) {
      var f = be(s.t);
      if (!VEIKSMAS.test(f.replace(TEIKEJAS, "")) || NE_TERMINAS.test(f)) return;
      var ink = NUO_UZS.test(f) ? "uzsakymas" : NUO_SUT.test(f) ? "sutartis" : null;
      if (!ink) return;
      var tr = KS.reiksmes(s.t).trukme;
      Object.keys(tr).forEach(function (k) {
        if (/^val:/.test(k)) return;             // valandos - reagavimo laikas, ne pristatymo terminas
        out.push({ inkaras: ink, raktas: k, tekstas: tr[k].t, citata: iskarpa(s.t, 260), loc: s.loc, docId: doc.id });
      });
    });
    return out;
  }

  /* ---------------------------------------------------------------- žalieji */
  // SPS teiginys: „Pirkime taikomi žalieji reikalavimai, kurie nurodyti Techninėje specifikacijoje ir (ar) Sutarties projekte“
  function zaliujuTeiginys(doc) {
    var rasta = null;
    sakiniai(doc).some(function (s) {
      var f = be(s.t), m = /zalieji reikalavimai,?\s+(?:kurie\s+)?nurodyti\s+([^.]{0,160})/.exec(f);
      if (!m) return false;
      var kur = m[1].split(/,?\s+ir kiti\s/)[0];   // „..., ir kiti reikalavimai, nurodyti 2 lentelėje“ - kiti reikalavimai ne žalieji
      var ts = /techninej\w*\s+(specifikacij|uzduot)/.test(kur), sut = /sutarties\s+projekt|sutartyje/.test(kur);
      if (!ts && !sut) return false;
      rasta = { ts: ts, sutartis: sut, citata: iskarpa(s.t, 260), loc: s.loc, docId: doc.id };
      return true;
    });
    return rasta;
  }
  // „sistemas“ - ne EMAS, „atliekamos“ - ne atliekos, „Anglies dioksidas“ dujų sudėtyje - ne anglies pėdsakas, „pavojinga įtampa“ - ne pavojingos medžiagos
  var ZALI_TS = /(aplinkos apsaug|aplinkosaug|ekologin|zaliuj|zaliasis|zalieji|energ[a-z]*\s+(vartojimo\s+)?efektyv|energinio efektyv|iso\s*14001|(^|[^a-z])emas([^a-z]|$)|perdirb|antrin[a-z]*\s+zaliav|pavojing[a-z]*\s+(atliek|medziag|chemin)|chemin[a-z]*\s+medziag|atliek(u|os|oms|as|ose|omis)([^a-z]|$)|pakuot|ekologinio zenkl|anglies pedsak|co2 emisij|siltnamio|triuksm|rusiav)/;
  var ZALI_SUT = /(aplinkos apsaugos kriterij|aplinkosaugin\w*\s+kriterij|zaliuju pirkim)/;
  // Sutarties požymis - kriterijai išdėstyti, ne baudos už jų nesilaikymą ir ne „Punktas netaikomas“
  function zaliujuPozymiai(doc, rusis) {
    var out = [];
    ((doc && doc.blocks) || []).forEach(function (b) {
      if (b.loc && b.loc.stulpelis === "en") return;
      var f = be(b.text);
      if (rusis === "sutartis") {
        if (ZALI_SUT.test(f) && !/(baud|nesilaikym|pranest|netaikom)/.test(f)) out.push({ citata: iskarpa(b.text, 200), loc: b.loc || null });
      } else if (ZALI_TS.test(f)) out.push({ citata: iskarpa(b.text, 200), loc: b.loc || null });
    });
    return out;
  }

  /* ---------------------------------------------------------------- kvalifikacija TS */
  var SUBJEKTAS = /(tiekej|paslaugu teikej|rangov|projektuotoj|dalyv)/;
  var VADYBA = /(iso(?:\/iec)?\s*(9001|14001|45001|27001|50001)|ohsas\s*18001|emas\b)/;
  var VADYBA_SISTEMA = /(vadybos\s+sistem|sertifikat|idieg)/;
  var PATIRTIS = /per\s+(paskutinius|pastaruosius)\s+(\d+|\S+)\s*(\([^)]{0,30}\)\s*)?(metus|metu|m\.)/;
  function kvalifikacija(doc) {
    var out = [];
    sakiniai(doc).forEach(function (s) {
      var f = be(s.t), v;
      if (!SUBJEKTAS.test(f) || !/(turi|privalo|turet|pateik)/.test(f)) return;
      if ((v = VADYBA.exec(f)) && VADYBA_SISTEMA.test(f)) out.push({ rusis: "vadyba", standartas: v[2] || v[1].replace(/\s+/g, " "), citata: iskarpa(s.t, 260), loc: s.loc, docId: doc.id });
      else if (PATIRTIS.test(f) && /(ivykd|patirt|suteik|atlik|tiek)/.test(f)) out.push({ rusis: "patirtis", citata: iskarpa(s.t, 260), loc: s.loc, docId: doc.id });
    });
    return out;
  }

  /* ---------------------------------------------------------------- standartai TS */
  // Nuoroda į standartą: LST EN 60076-1, EN ISO 9001, IEC 61850, ISO/IEC 27001, IEEE 1588, HD 60364
  var STANDARTAS = /(?:^|[^A-Za-z])((?:LST\s+)?(?:EN|ISO|IEC|IEEE|HD|ETSI|DIN|ASTM)(?:\s*\/\s*(?:IEC|ISO|EN))*(?:\s+(?:EN|ISO|IEC))*\s*\d{3,6}(?:[-:.]\d+)*)/;
  var LYGIAVERTIS = /(lygiaver|equivalent)/;
  var LYG_TS = /(lygiaver|ar\s+kit[a-z]*\s+[^.]{0,80}standart)/;
  // Bendra nuostata: „visi (šioje TS) nurodyti standartai ... arba lygiaverčiai“
  var BENDRA = /(standart|normatyv|norm\w*\s+dokument)[^.]{0,200}lygiaver|lygiaver[^.]{0,200}(standart|normatyv)/;
  function standartai(doc) {
    var sak = sakiniai(doc), bendra = null, be_lyg = [], visos = 0, lentelesLyg = {};
    // lentelė, kurios bent viename langelyje (pvz. antraštėje „Standartas (arba lygiavertis)“) yra „lygiavertis“
    sak.forEach(function (s) { if (s.loc && s.loc.table && LYGIAVERTIS.test(be(s.blokas))) lentelesLyg[s.loc.table] = 1; });
    sak.forEach(function (s) {
      var f = be(s.t);
      if (!bendra && BENDRA.test(f) && !STANDARTAS.test(s.t)) bendra = { citata: iskarpa(s.t, 260), loc: s.loc };
      if (!STANDARTAS.test(s.t)) return;
      visos++;
      if (!LYGIAVERTIS.test(f) && !LYGIAVERTIS.test(be(s.blokas)) && !(s.loc && s.loc.table && lentelesLyg[s.loc.table])) be_lyg.push({ citata: iskarpa(s.t, 220), standartas: STANDARTAS.exec(s.t)[1].replace(/\s+/g, " "), loc: s.loc, docId: doc.id });
    });
    return { bendra: bendra, nuorodu: visos, beLygiaverciu: be_lyg };
  }

  /* ---------------------------------------------------------------- visa patikra */
  function tikrink(o) {
    o = o || {};
    var docs = (o.docs || []).filter(function (d) { return d && d.id && (d.blocks || []).length; });
    var vaid = o.vaidmenys || {};
    var ts = docs.filter(function (d) { return vaid[d.id] === "ts"; });
    var sut = docs.filter(function (d) { return vaid[d.id] === "sutartis"; });
    var sps = docs.filter(function (d) { return vaid[d.id] === "sps"; });
    var r = {};

    // Terminai: sutarties ir TS ta pačia atskaita
    if (!ts.length || !sut.length) r.terminai = { busena: "nepatikrinta", priezastis: !ts.length ? "be_ts" : "be_sutarties", radiniai: [] };
    else {
      var T = [], S = [];
      ts.forEach(function (d) { T = T.concat(terminai(d)); });
      sut.forEach(function (d) { S = S.concat(terminai(d)); });
      var rad = [], palyginta = 0;
      ["uzsakymas", "sutartis"].forEach(function (ink) {
        var s = S.filter(function (x) { return x.inkaras === ink; }), t = T.filter(function (x) { return x.inkaras === ink; });
        if (!s.length || !t.length) return;
        palyginta++;
        if (t.some(function (x) { return s.some(function (y) { return y.raktas === x.raktas; }); })) return;
        if (ink === "sutartis") {
          // Nuo sutarties įsigaliojimo TS dažnai nurodo tarpinius etapus (trumpesnius už visą terminą) - radinys tik kai TS terminas ilgesnis
          var sMax = Math.max.apply(null, s.map(function (y) { return dienos(y.raktas); }));
          var ilg = t.filter(function (x) { return dienos(x.raktas) > sMax; });
          if (!ilg.length) return;
          var sm = s.filter(function (y) { return dienos(y.raktas) === sMax; })[0];
          rad.push({ inkaras: ink, sutartis: sm, ts: ilg.slice(0, 3), ilgesnis: true });
          return;
        }
        rad.push({ inkaras: ink, sutartis: s[0], ts: t.slice(0, 3) });
      });
      r.terminai = { busena: !palyginta ? "nepatikrinta" : rad.length ? "radinys" : "gerai", priezastis: palyginta ? "" : "be_terminu", radiniai: rad };
    }

    // Žalieji: SPS teiginys prieš TS ir sutartį
    var teig = null;
    sps.some(function (d) { teig = zaliujuTeiginys(d); return !!teig; });
    if (!teig) r.zalieji = { busena: "nepatikrinta", priezastis: sps.length ? "be_teiginio" : "be_sps", radiniai: [] };
    else if ((teig.ts && !ts.length) || (teig.sutartis && !sut.length)) r.zalieji = { busena: "nepatikrinta", priezastis: "be_dokumento", teiginys: teig, radiniai: [] };
    else {
      var poz = [];
      if (teig.ts) ts.forEach(function (d) { poz = poz.concat(zaliujuPozymiai(d, "ts")); });
      if (teig.sutartis) sut.forEach(function (d) { poz = poz.concat(zaliujuPozymiai(d, "sutartis")); });
      r.zalieji = { busena: poz.length ? "gerai" : "radinys", priezastis: "", teiginys: teig, pozymiai: poz.length, radiniai: poz.length ? [] : [{ teiginys: teig, ts: teig.ts, sutartis: teig.sutartis }] };
    }

    // Kvalifikacijos reikalavimai TS (tas pats sakinys keliose TS redakcijose - vieną kartą)
    if (!ts.length) r.kvalifikacija = { busena: "nepatikrinta", priezastis: "be_ts", radiniai: [] };
    else {
      var kv = [], buvo = {};
      ts.forEach(function (d) { kvalifikacija(d).forEach(function (x) { var k = be(x.citata); if (!buvo[k]) { buvo[k] = 1; kv.push(x); } }); });
      kv.forEach(function (x) {
        if (x.rusis !== "vadyba") return;
        sps.some(function (d) {
          return sakiniai(d).some(function (s) {
            var f = be(s.t);
            if (f.indexOf(x.standartas.toLowerCase()) < 0) return false;
            x.sps = { citata: iskarpa(s.t, 220), loc: s.loc, docId: d.id, lygiavertis: LYGIAVERTIS.test(f) };
            return true;
          });
        });
      });
      // TS ir SPS tas pats vadybos sistemos standartas ir abiejose - su lygiaverčiu („arba lygiavertis“, „ar kitus ... standartus“): ne radinys
      kv = kv.filter(function (x) { return !(x.rusis === "vadyba" && x.sps && x.sps.lygiavertis && LYG_TS.test(be(x.citata))); });
      r.kvalifikacija = { busena: kv.length ? "radinys" : "gerai", priezastis: "", radiniai: kv };
    }

    // Standartai be „arba lygiavertis“ (kiekvienai TS atskirai; ta pati redakcija - vieną kartą)
    if (!ts.length) r.standartai = { busena: "nepatikrinta", priezastis: "be_ts", radiniai: [] };
    else {
      var st = [], nuorodu = 0, matyta = {};
      ts.forEach(function (d) {
        var x = standartai(d);
        nuorodu += x.nuorodu;
        if (x.bendra || !x.beLygiaverciu.length) return;
        var raktas = x.beLygiaverciu.map(function (y) { return be(y.citata); }).join("|");
        if (matyta[raktas]) return;
        matyta[raktas] = 1;
        st.push({ docId: d.id, n: x.beLygiaverciu.length, vietos: x.beLygiaverciu.slice(0, 3) });
      });
      r.standartai = { busena: !nuorodu ? "nepatikrinta" : st.length ? "radinys" : "gerai", priezastis: nuorodu ? "" : "be_standartu", radiniai: st };
    }
    return r;
  }

  global.GP_NUOSEKLUMAS = { version: "1.0.0", tikrink: tikrink, sakiniai: sakiniai, terminai: terminai, zaliujuTeiginys: zaliujuTeiginys,
    zaliujuPozymiai: zaliujuPozymiai, kvalifikacija: kvalifikacija, standartai: standartai };
})(typeof window !== "undefined" ? window : this);
