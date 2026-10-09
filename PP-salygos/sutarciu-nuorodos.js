/* ============================================================================
 * G-Procure  PP-salygos/sutarciu-nuorodos.js   (v1.0, 2026-10-09)
 * Sutarties nuorodų patikra (sutarčių planas 4.5 3 p. - „nuorodų sargas“; GP_SUTARCIU_NUORODOS).
 *
 * Kiekviena sutarties nuoroda į punktą („Specialiųjų sąlygų 5.2 punkte“, „Bendrųjų sąlygų 12.2.1.1., 12.2.1.2. punktuose“, „clause 10.1 of
 * the General Terms and Conditions“, „5.3.1.2.1 - 5.3.1.2.10 papunkčiai“) ar priedą („priede Nr. 2“, „Annex 3“) turi rodyti į tos pačios
 * sutarties (bendrųjų ar specialiųjų sąlygų) punktą, prasidedantį tuo numeriu, ar į specialiųjų sąlygų priedų sąrašo priedą.
 * Nuoroda su „Bendrųjų / Specialiųjų sąlygų“ (General / Special Terms and Conditions) - tik tame dokumente; be jos - bet kuriame iš dviejų.
 * Neskaičiuojama: įstatymų ir kitų teisės aktų straipsniai, dalys ir priedai („VPĮ 37 straipsnio 8 dalyje“, „VPĮ 5 priede“, „Annex 5 to the
 * LPP“), pavyzdžiai („pavyzdžiui, priedas Nr. 4¹“, „e.g. Annex 4¹“) ir pastraipos paties numeris.
 *
 * Išmatuota (2026-10-09): 8 šablonai - nuorodos tvarkingos (22.2.2.15 apibrėžia SS 14.1 papildymas - kabutėse esantis numeris irgi punktas);
 * sugeneruotose - SS 9.8 „taikomos 8.3.2 punkte nustatytos sąlygos“, kai užtikrinimas netaikomas (generatorius ją dabar pašalina).
 * Grynos funkcijos, nieko nesaugo ir nesiunčia.
 *
 *   GP_SUTARCIU_NUORODOS.tikrink({ bs: [tekstai] | null, ss: [tekstai] | null })
 *     -> { nuorodu, radiniai: [{ dok: "BS" | "SS", i, nr, rusis: "punktas" | "priedas", citata }], nepatikrinta: [{ dok, nr, priezastis }] }
 * ========================================================================== */
(function (global) {
  "use strict";
  if (global.GP_SUTARCIU_NUORODOS) return;
  // pastraipos numeris: „5.3.1.2.1.“, „16.1 Each“, „„22.2.2.15.“ (kabutėse - papildymo tekstas); vieno lygio - tik su tašku („24.“)
  var NR = /^\s*[„“"]?(\d+(?:\.\d+)+|\d+(?=\.))\.?(?=\s|[^\d.]|$)/;
  var SAR = "\\d+(?:\\.\\d+)*\\.?(?:\\s*(?:,|ir|and|-|–|to|bei|or|arba)\\s*\\d+(?:\\.\\d+)*\\.?)*";
  var KUR = "Bendrųjų\\s+(?:Sutarties\\s+|sutarties\\s+)?sąlygų|Specialiųjų\\s+(?:Sutarties\\s+|sutarties\\s+)?sąlygų|General\\s+Terms\\s+and\\s+Conditions|Special\\s+Terms\\s+and\\s+Conditions";
  var REF = new RegExp("(?:(" + KUR + ")[\\s,]*)?(?:(clauses?|paragraphs?|subparagraphs?|sub-paragraphs?|sections?|points?)\\s+)?(" + SAR + ")\\s*" +
                       "(punkt[a-ząčęėįšųūž]*|papunk[a-ząčęėįšųūž]*|skyri[a-ząčęėįšųūž]*|of\\s+the\\s+(?:General|Special|Contract))?", "gi");
  var PRIED = /(\d+)\s*pried[a-ząčęėįšųūž]*|pried[a-ząčęėįšųūž]*\s*Nr\.\s*(\d+)|Annex(?:es)?\s*(?:No\.\s*)?(\d+)/gi;
  // teisės akto struktūra prieš numerį: „VPĮ 90 straipsnio 1 dalies 7 punkte“, „Article 45(2) point 3“ - ne sutarties punktas
  var TEISES_AKTAS = /(straipsn[a-ząčęėįšųūž]*|Article|įstatym[a-ząčęėįšųūž]*|kodeks[a-ząčęėįšųūž]*|Law|LPP|LP|VPĮ|PĮ|aprašo|reglament[a-ząčęėįšųūž]*|Regulation|Directive|direktyv[a-ząčęėįšųūž]*|dal(?:ies|yje|is)\s*(?:\d+\s*)?|paragraph\s*\(\d+\)|\(\d+\))\s*$/i;
  var PAVYZDYS = /(pavyzdžiui|pvz\.|e\.\s*g\.|for example)[\s,:]*$/i;

  function numeriai(T) {
    var s = {};
    T.forEach(function (t) { var m = NR.exec(t || ""); if (m) s[m[1]] = 1; });
    return s;
  }
  // specialiųjų sąlygų priedų sąrašas: „15.1. Priedas Nr. 1 ...“ / „15.1. Annex No 1 ...“
  function priedai(T) {
    var s = {};
    T.forEach(function (t) { var m = /^\s*\d+\.\d+\.?\s*(?:Priedas|Annex)\s*(?:Nr\.|No\.?)?\s*(\d+)/i.exec(t || ""); if (m) s[m[1]] = 1; });
    return s;
  }
  function tikrink(o) {
    var bs = o.bs ? numeriai(o.bs) : null, ss = o.ss ? numeriai(o.ss) : null, pr = o.ss ? priedai(o.ss) : null;
    var out = { nuorodu: 0, radiniai: [], nepatikrinta: [] };
    [["BS", o.bs], ["SS", o.ss]].forEach(function (x) {
      var dok = x[0], T = x[1];
      if (!T) return;
      T.forEach(function (t, i) {
        t = String(t || "");
        var m0 = NR.exec(t), m;
        REF.lastIndex = 0;
        while ((m = REF.exec(t))) {
          if (!m[2] && !m[4]) continue;
          var nuo = m.index + m[0].indexOf(m[3], m[1] ? m[1].length : 0);
          if (m0 && nuo <= m0.index + m0[0].length && !m[1] && !m[2]) continue;      // pastraipos paties numeris
          var pries = t.slice(Math.max(0, nuo - 40), nuo);
          if (TEISES_AKTAS.test(pries) || /^\s*(straipsn|Article|dal[iy])/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 14)) || PAVYZDYS.test(pries)) continue;
          var kur = ((m[1] || "") + " " + (m[4] || "")).toLowerCase();
          var bendr = /bendr|general/.test(kur), spec = /special/.test(kur);
          var aibe = bendr ? bs : spec ? ss : null;
          out.nuorodu++;
          (m[3].match(/\d+(?:\.\d+)*/g) || []).forEach(function (nr) {
            if (bendr || spec) {
              if (!aibe) { out.nepatikrinta.push({ dok: dok, nr: nr, priezastis: (bendr ? "bendrųjų" : "specialiųjų") + " sąlygų dokumento nėra" }); return; }
              if (!aibe[nr]) out.radiniai.push({ dok: dok, i: i, nr: nr, rusis: "punktas", citata: t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20).trim() });
              return;
            }
            var savo = dok === "BS" ? bs : ss, kito = dok === "BS" ? ss : bs;
            if ((savo && savo[nr]) || (kito && kito[nr])) return;
            if (!kito) { out.nepatikrinta.push({ dok: dok, nr: nr, priezastis: "nuoroda be dokumento nurodymo, o kito sutarties dokumento nėra" }); return; }
            out.radiniai.push({ dok: dok, i: i, nr: nr, rusis: "punktas", citata: t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20).trim() });
          });
        }
        PRIED.lastIndex = 0;
        while ((m = PRIED.exec(t))) {
          var nrp = m[1] || m[2] || m[3], pr0 = t.slice(Math.max(0, m.index - 30), m.index);
          if (TEISES_AKTAS.test(pr0) || PAVYZDYS.test(pr0) || /^\s*to\s+the\s+(LPP|LP|Law)/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 16))) continue;
          if (/^\s*\d+\.\d+\.?\s*(Priedas|Annex)/i.test(t) && m.index <= 12) continue;             // pats priedų sąrašo įrašas
          out.nuorodu++;
          if (!pr) { out.nepatikrinta.push({ dok: dok, nr: nrp, priezastis: "specialiųjų sąlygų (priedų sąrašo) nėra" }); continue; }
          if (!pr[nrp]) out.radiniai.push({ dok: dok, i: i, nr: nrp, rusis: "priedas", citata: t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20).trim() });
        }
      });
    });
    return out;
  }
  global.GP_SUTARCIU_NUORODOS = { versija: "1.0", tikrink: tikrink, numeriai: numeriai, priedai: priedai };
})(typeof window !== "undefined" ? window : this);
