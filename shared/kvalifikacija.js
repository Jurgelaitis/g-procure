/* ============================================================================
 * G-Procure  shared/kvalifikacija.js   (GP_KVALIFIKACIJA, 2026-10-07)
 * Kvalifikacijos reikalavimų proporcingumas parengtuose pirkimo dokumentuose - pirkimo sąlygų tikrinimo 4 etapas
 * (docs/salygos/auditas-planas-2026-10.md, 2.1 sk. 6 sluoksnis). Naudotojo sprendimas 2026-10-07: išmatuoti su viešais
 * LITGRID paketais, PP-qual skaičiavimą perkelti į shared/ (shared/proporcingumas.js), radinių lygis - „Rekomendacija“.
 *
 * Ką daro: iš SPS ištraukia tiekėjo patirties reikalavimus („Tiekėjas per paskutinius N metus ... kurių bendra vertė ne
 * mažesnė kaip X Eur“) ir pajamų reikalavimus („metinės ... pajamos ... ne mažesnės kaip X Eur“) ir lygina su VPT
 * Metodikos normomis per GP_PROPORCINGUMAS (tas pats skaičiavimas kaip PP-qual): patirties laikotarpis - pagal objekto
 * rūšį (kortelė arba skelbimas), patirties vertė ir pajamos - tik žinant numatomą vertę (kortelė arba skelbimas).
 * Specialistų patirties reikalavimai netikrinami (Metodikoje - kompetencijos, ne metų skaičius). Išvada - tik
 * „Rekomendacija“ su Metodikos nuoroda iš registro: Metodikos skaičiai - „paprastai“, nukrypimas gali būti pagrįstas.
 * Teksto normalizavimas ir citatos - GP_PRIVALOMI.tekstas (jungti prieš šį failą). Nieko nesaugo ir nesiunčia.
 * ========================================================================== */
(function (global) {
  "use strict";
  function T() { return global.GP_PRIVALOMI && global.GP_PRIVALOMI.tekstas; }
  var SALYGOS = ["sps"];

  /* Suma iš normalizuoto teksto: „90 000,00“, „220 000,00“, „5 000“, „3 mln.“ */
  function suma(sk, mln) {
    var v = global.GP_MONEY ? global.GP_MONEY.parseEUR(sk) : parseFloat(String(sk).replace(/\s/g, "").replace(",", "."));
    return v == null || !isFinite(v) ? null : mln ? v * 1e6 : v;
  }
  var SUMA = "(po )?((?:\\d{1,3}(?:[ .]\\d{3})+|\\d+)(?:,\\d{1,2})?)\\s*(mln\\.?\\s*)?(eur|euru)";
  /* Metų skaičius skaitmenimis arba žodžiu („trejus“, „vieneriais“) */
  var SK = "(\\d{1,2}|vien|dvej|trej|ketver|penker)";
  var ZODZIAI = { vien: 1, dvej: 2, trej: 3, ketver: 4, penker: 5 };
  function metai(z) { return /^\d+$/.test(z) ? +z : ZODZIAI[z] || null; }
  /* Tiekėjo patirtis: „Tiekėjas per paskutinius 5* (penkerius) metus ...“ - „per“ iškart po „tiekėjas“ (specialistų reikalavimai -
     „Tiekėjas turi pasiūlyti ... vadovą, kuris per ...“ - ir pašalinimo pagrindai - „... dėl kurio per pastaruosius 3 metus ...“ - ne).
     Dvikalbėje PDF lentelėje tarp skaičiaus ir „(penkerius) metus“ įsiterpia angliško stulpelio tekstas („per paskutinius 5 The Supplier
     has manufactured PATEIKIAMA: SUBMITTED: (penkerius) metus“, tikras LITGRID SPS) - tada būtinas skaičius žodžiu skliaustuose. */
  var PATIRTIS = "(^|[^a-z])tiekej\\w* per (paskutin|pastar)\\w* " + SK + "\\w*\\*?(( \\([a-z]+\\))? metus|[^.;]{0,160}? \\([a-z]+\\) metus)";
  var PAJAMOS = "(metin|vidutin)\\w*( [a-z]+){0,4} pajam\\w*";
  /* „ne mažesnė kaip X Eur“; PDF stulpeliuose tarp „ne“ ir „mažesnės“ įsiterpia gretimo stulpelio tekstas („yra ne (jeigu ši informacija
     turima), ūkio subjekto finansinių mažesnės nei 500 000 Eur“, tikras LITGRID SPS) - todėl „ne“ ieškoma iki 160 ženklų prieš „mažesn“.
     Grupės: 3 - „po“, 4 - suma, 5 - „mln.“ */
  function rastiSuma(t, tekstas) {
    var g = new RegExp(t.re("(ne maziau kaip|mazesn\\w* (kaip|nei)) " + SUMA).source, "g"), m;
    while ((m = g.exec(tekstas))) {
      if (/^ne/.test(m[1]) || /(^|[^a-z])ne /.test(tekstas.slice(Math.max(0, m.index - 160), m.index))) return m;
    }
    return null;
  }
  /* Pajamų laikotarpis: „per paskutinius 3 finansinius metus“, „paskutiniais vieneriais finansiniais metais“, PDF - su įsiterpusiu
     stulpelio tekstu („paskutiniais PATEIKIAMA: vieneriais finansiniais metais“), „3 paskutinių finansinių metų“ */
  function pajamuMetai(lp) {
    var m = new RegExp("(paskutin|pastar)\\w* " + SK + "\\w*\\*?( \\([a-z]+\\))?( finansin\\w*)? met").exec(lp)
      || new RegExp("(paskutin|pastar)\\w*[^.;]{0,60}? " + SK + "\\w*( \\([a-z]+\\))? finansin\\w* met").exec(lp);
    if (m) return metai(m[2]);
    m = /(\d{1,2})( \([a-z]+\))? paskutin\w* finansin\w* met/.exec(lp);
    return m ? +m[1] : null;
  }

  /* Reikalavimai iš SPS: [{ rusis: "patirtis" | "pajamos", metai, suma, po, kiekis, doc, b, citata }]. */
  function istrauk(o) {
    o = o || {};
    var t = T(); if (!t) return [];
    var docs = (o.docs || []).filter(function (d) { return d && d.parseStatus === "parsed" && d.blocks && d.blocks.length; })
      .filter(function (d) { return !o.vaidmenys || SALYGOS.indexOf(o.vaidmenys[d.id]) >= 0; });
    var out = [];
    var prideti = function (r) {
      if (!out.some(function (x) { return x.rusis === r.rusis && x.metai === r.metai && x.suma === r.suma; })) out.push(r);
    };
    docs.forEach(function (d) {
      var dt = t.dokTekstas(d), tx = dt.t, g, m;
      // Reikalavimo sritis baigiasi ten, kur prasideda kitas reikalavimas - kitaip patirčiai priskiriama gretimos eilutės suma
      var pradzios = [];
      [PATIRTIS, PAJAMOS].forEach(function (p, i) {
        var gg = new RegExp(t.re(p).source, "g"), mm;
        while ((mm = gg.exec(tx))) pradzios.push(mm.index + (i === 0 ? mm[1].length : 0));
      });
      var iki = function (nuo, ilgis) {
        var r = nuo + ilgis;
        pradzios.forEach(function (x) { if (x > nuo && x < r) r = x; });
        return r;
      };
      g = new RegExp(t.re(PATIRTIS).source, "g");
      while ((m = g.exec(tx))) {
        var lang = tx.slice(m.index, iki(m.index + m[1].length, 900));
        var sm = rastiSuma(t, lang);
        var kiek = /(^|[^a-z])bent (\d+)/.exec(lang.slice(0, sm ? sm.index : 400));
        var c = t.citata(dt, m.index + m[1].length, 120);
        if (t.turinioEilute(c.b && c.b.text)) continue;
        prideti({ rusis: "patirtis", metai: metai(m[3]), suma: sm ? suma(sm[4], sm[5]) : null, po: !!(sm && sm[3]), kiekis: kiek ? +kiek[2] : null,
                  doc: d, b: c.b, citata: c.t });
      }
      g = new RegExp(t.re(PAJAMOS).source, "g");
      while ((m = g.exec(tx))) {
        var lp = tx.slice(m.index, iki(m.index, 700));
        var ps = rastiSuma(t, lp);
        if (!ps) continue;                                             // „neteisingų duomenų apie pajamas“ ir pan. - be sumos
        var cp = t.citata(dt, m.index, 160);
        if (t.turinioEilute(cp.b && cp.b.text)) continue;
        prideti({ rusis: "pajamos", metai: pajamuMetai(lp.slice(0, ps.index + ps[0].length + 120)), suma: suma(ps[4], ps[5]), doc: d, b: cp.b, citata: cp.t });
      }
    });
    return out;
  }

  var TXT = {
    lt: {
      laikotarpis: "SPS reikalauja tiekėjo patirties per paskutinius {n} metus, o Metodikoje {obj} - per paskutinius {norma} metus. Ilgesnis laikotarpis galimas, jei to reikia tinkamai konkurencijai užtikrinti (pvz., panašūs objektai įsigyjami retai ir per {norma} metus patenka itin mažai tiekėjų) - tada turėkite tokį pagrindimą.",
      verte: "SPS reikalaujamos patirties vertė - {x} Eur ({proc} % numatomos vertės {v} Eur), o Metodikoje paprastai ne daugiau kaip {koef} numatomos vertės ({riba} Eur).",
      pajamos: "SPS reikalaujamos metinės pajamos - {x} Eur, o Metodikoje - ne daugiau kaip 2 kartus {kokios} ({riba} Eur).",
      pajamosMv: "SPS reikalaujamos metinės pajamos ({x} Eur), o mažos vertės sutarčiai Metodikoje pajamų reikalavimas paprastai nenustatomas.",
      pajamuMetai: "SPS pajamas vertina per {n} finansinius metus, o Metodikoje - daugiausia {max} (paprastai {pap}).",
      objDarbai: "darbams", objPrekes: "prekėms ir paslaugoms", vertes: "numatomos vertės", metines: "didžiausios metinės vertės",
      beObj: "nežinoma pirkimo objekto rūšis (pasirinkite kortelę arba įkelkite skelbimą)", misrus: "mišrus pirkimas - patirties reikalavimai kiekvienai objekto daliai atskirai",
      beVert: "nėra numatomos vertės (pasirinkite pirkimo kortelę; skelbime ji nurodoma retai)", beReik: "SPS tiekėjo patirties ar pajamų reikalavimų su metais ar sumomis neradau (specialistų reikalavimai netikrinami)",
      beSps: "nėra SPS", beSumos: "reikalavime neradau sumos", rasta: "rasta: {s}", patirtis: "patirtis per {n} m.", pajamosR: "pajamos", eur: "Eur"
    },
    en: {
      laikotarpis: "The SPS requires the supplier's experience over the last {n} years, while the Methodology sets the last {norma} years {obj}. A longer period is possible where needed to ensure adequate competition (e.g. similar objects are procured rarely and very few suppliers fall within {norma} years) - keep that justification.",
      verte: "The value of experience required in the SPS is EUR {x} ({proc}% of the estimated value of EUR {v}), while the Methodology normally sets no more than {koef} of the estimated value (EUR {riba}).",
      pajamos: "The SPS requires annual turnover of EUR {x}, while the Methodology sets no more than 2 times the {kokios} (EUR {riba}).",
      pajamosMv: "The SPS requires annual turnover (EUR {x}), while for a low-value contract the Methodology normally sets no turnover requirement.",
      pajamuMetai: "The SPS assesses turnover over {n} financial years, while the Methodology sets at most {max} (normally {pap}).",
      objDarbai: "for works", objPrekes: "for goods and services", vertes: "estimated value", metines: "highest annual value",
      beObj: "the type of the object is unknown (select a card or upload the notice)", misrus: "mixed procurement - experience requirements separately for each part",
      beVert: "no estimated value (select the procurement card; the notice rarely states it)", beReik: "no supplier experience or turnover requirements with years or amounts found in the SPS (requirements for experts are not checked)",
      beSps: "no SPS", beSumos: "no amount found in the requirement", rasta: "found: {s}", patirtis: "experience over {n} years", pajamosR: "turnover", eur: "EUR"
    }
  };
  function sub(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }
  function eurai(x, l) { return global.GP_MONEY ? global.GP_MONEY.formatEUR(Math.round(x)).replace(/,00$/, "") : String(Math.round(x)); }

  /* Vertinimas. o: { reikalavimai, verte, objektas (kortelės kodas), trukmeMen, rezimas, mazosVertes, kalba }.
     Grąžina { radiniai: [{ id, lygis: "rekomendacija", tekstas, vietos: [{ doc, b, citata }], teise: [raktai] }],
               patikros: [{ id, busena: gerai | radinys | nepatikrinta, pastaba }] }. */
  function vertink(o) {
    var l = o.kalba === "en" ? "en" : "lt", X = TXT[l], R = o.reikalavimai || [], rad = [], pt = [];
    var P = global.GP_PROPORCINGUMAS, N = global.GP_TEISE && global.GP_TEISE.normos;
    var objTipas = o.objektas && P ? P.KORTELES_OBJEKTAI[o.objektas] : null;
    var c = P && N ? P.skaiciuok({ value: o.verte > 0 ? o.verte : 0, objectType: objTipas || "", duration: o.trukmeMen ? o.trukmeMen + " mėn." : "" }, o.rezimas || "") : null;
    var mv = o.mazosVertes ? ["met_mvp"] : [];
    var pat = R.filter(function (r) { return r.rusis === "patirtis"; }), paj = R.filter(function (r) { return r.rusis === "pajamos"; });
    var vieta = function (r) { return [{ doc: r.doc, b: r.b, citata: r.citata }]; };
    pt.push({ id: "kval_reikalavimai", busena: R.length ? "gerai" : "nepatikrinta",
              pastaba: R.length ? sub(X.rasta, { s: R.map(function (r) { return r.rusis === "patirtis" ? sub(X.patirtis, { n: r.metai }) + (r.suma ? " (" + eurai(r.suma, l) + " " + X.eur + ")" : "")
                : X.pajamosR + (r.suma ? " (" + eurai(r.suma, l) + " " + X.eur + ")" : ""); }).join("; ") }) : X.beReik });
    // 1. Patirties laikotarpis pagal objekto rūšį
    if (!pat.length) pt.push({ id: "kval_laikotarpis", busena: "nepatikrinta", pastaba: X.beReik });
    else if (!c || !objTipas) pt.push({ id: "kval_laikotarpis", busena: "nepatikrinta", pastaba: X.beObj });
    else if (c.laikotarpis.metai == null) pt.push({ id: "kval_laikotarpis", busena: "nepatikrinta", pastaba: X.misrus });
    else {
      var ilgi = pat.filter(function (r) { return r.metai > c.laikotarpis.metai; });
      // Keli reikalavimai su tuo pačiu laikotarpiu (tikrame SPS - 1.1 ir 2.1 p. po 5 metus) - vienas radinys su visomis vietomis
      ilgi.forEach(function (r) {
        var yra = rad.filter(function (x) { return x.id === "kval_laikotarpis" && x.metai === r.metai; })[0];
        if (yra) { yra.vietos = yra.vietos.concat(vieta(r)); return; }
        rad.push({ id: "kval_laikotarpis", lygis: "rekomendacija", metai: r.metai, vietos: vieta(r), teise: [c.laikotarpis.raktas, "met_pagrindimas"].concat(mv),
          tekstas: sub(X.laikotarpis, { n: r.metai, norma: c.laikotarpis.metai, obj: c.laikotarpis.raktas === "met_patirtis_darbai" ? X.objDarbai : X.objPrekes }) });
      });
      pt.push({ id: "kval_laikotarpis", busena: ilgi.length ? "radinys" : "gerai", pastaba: "" });
    }
    // 2. Patirties vertė - ne daugiau kaip 0,7 numatomos vertės (paprastai)
    var suSuma = pat.filter(function (r) { return r.suma > 0; });
    if (!suSuma.length) pt.push({ id: "kval_patirties_verte", busena: "nepatikrinta", pastaba: pat.length ? X.beSumos : X.beReik });
    else if (!(o.verte > 0) || !c) pt.push({ id: "kval_patirties_verte", busena: "nepatikrinta", pastaba: X.beVert });
    else {
      var per = suSuma.filter(function (r) { return (r.po && r.kiekis ? r.suma * r.kiekis : r.suma) > c.patirtis.riba + 0.5; });
      per.forEach(function (r) {
        var x = r.po && r.kiekis ? r.suma * r.kiekis : r.suma;
        rad.push({ id: "kval_patirties_verte", lygis: "rekomendacija", vietos: vieta(r), teise: ["met_patirtis", "met_pagrindimas"].concat(mv),
          tekstas: sub(X.verte, { x: eurai(x, l), proc: Math.round(x / o.verte * 100), v: eurai(o.verte, l), koef: String(N.patirtiesRiba.reiksme).replace(".", l === "en" ? "." : ","), riba: eurai(c.patirtis.riba, l) }) });
      });
      pt.push({ id: "kval_patirties_verte", busena: per.length ? "radinys" : "gerai", pastaba: "" });
    }
    // 3. Pajamos - ne daugiau kaip 2 kartus (ilgalaikei - didžiausios metinės) vertės; mažos vertės sutarčiai paprastai nenustatomos
    var pajS = paj.filter(function (r) { return r.suma > 0; });
    if (!pajS.length) pt.push({ id: "kval_pajamos", busena: "nepatikrinta", pastaba: X.beReik });
    else {
      var radPaj = [];
      pajS.forEach(function (r) {
        if (r.metai > N.pajamuMetai.daugiausia)
          radPaj.push({ id: "kval_pajamu_metai", lygis: "rekomendacija", vietos: vieta(r), teise: ["met_apyvarta"].concat(mv),
            tekstas: sub(X.pajamuMetai, { n: r.metai, max: N.pajamuMetai.daugiausia, pap: N.pajamuMetai.paprastai }) });
      });
      if (!(o.verte > 0) || !c) pt.push({ id: "kval_pajamos", busena: radPaj.length ? "radinys" : "nepatikrinta", pastaba: X.beVert });
      else {
        pajS.forEach(function (r) {
          if (c.pajamos.nenustatomos) radPaj.push({ id: "kval_pajamos", lygis: "rekomendacija", vietos: vieta(r), teise: ["met_apyvarta_bendros"].concat(mv),
            tekstas: sub(X.pajamosMv, { x: eurai(r.suma, l) }) });
          else if (r.suma > c.pajamos.metodikosRiba + 0.5) radPaj.push({ id: "kval_pajamos", lygis: "rekomendacija", vietos: vieta(r),
            teise: [c.ilgalaike ? "met_apyvarta_bendros" : "met_apyvarta"].concat(mv),
            tekstas: sub(X.pajamos, { x: eurai(r.suma, l), kokios: c.ilgalaike ? X.metines : X.vertes, riba: eurai(c.pajamos.metodikosRiba, l) }) });
        });
        pt.push({ id: "kval_pajamos", busena: radPaj.length ? "radinys" : "gerai", pastaba: "" });
      }
      rad = rad.concat(radPaj);
    }
    return { radiniai: rad, patikros: pt };
  }

  global.GP_KVALIFIKACIJA = { istrauk: istrauk, vertink: vertink, TXT: TXT };
})(typeof window !== "undefined" ? window : this);
