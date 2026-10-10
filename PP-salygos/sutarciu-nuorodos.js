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
  /* Teisės aktų nuorodos (2026-10-09, sutarčių planas 6.1): VPĮ / PĮ straipsniai, dalys, punktai ir priedai (su grandine „... ir (ar) 47 straipsnio
     8 dalyje / PĮ 50 straipsnio 8 dalyje“), kiti įvardyti aktai (CK, Darbo kodeksas, Sankcijų, Viešojo administravimo, Nacionaliniam saugumui
     užtikrinti svarbių objektų apsaugos įstatymai, Vyriausybės nutarimas, ministro įsakymas, ES reglamentai, sprendimai, direktyvos) ir angliški
     atitikmenys. Kiekviena turi būti patikrinta e-tar ir įrašyta zemelapiai/sutarciu-teises-nuorodos.json (testas). Grąžina normalizuotas eilutes. */
  var L = "[a-ząčęėįšųūž]*";
  var VNR = "\\d+(?:\\s+ir\\s+\\d+)?\\s+(?:straipsn" + L + "|pried" + L + ")(?:\\s+\\d+(?:\\s+ir\\s+\\(arba\\)\\s+\\d+)?\\s+dal" + L + ")?(?:\\s+\\d+\\s+punkt" + L + ")?";
  var TEISES = [
    "(?:VPĮ|PĮ)\\s+\\d+(?:\\s+ir\\s+\\d+)?\\s*/\\s*(?:VPĮ|PĮ)\\s+\\d+(?:\\s+ir\\s+\\d+)?\\s+straipsn" + L,
    "(?:VPĮ|PĮ)\\s+" + VNR + "(?:\\s*(?:ir\\s*\\(ar\\)|ir|/|,)\\s*(?:(?:VPĮ|PĮ)\\s+)?" + VNR + ")*",
    "civilin" + L + "\\s+kodeks" + L + "(?:\\s+\\d+\\.\\d+\\s+straipsn" + L + "(?:\\s+\\d+\\s+dal" + L + ")?)?", "darbo\\s+kodeks" + L,
    "(?:tarptautinių\\s+)?sankcijų\\s+įstatym" + L, "viešojo\\s+administravimo\\s+įstatym" + L, "akcinių\\s+bendrovių\\s+įstatym" + L, "viešųjų\\s+pirkimų\\s+įstatym" + L,
    "pirkimų,\\s+atliekamų\\s+vandentvarkos,\\s+energetikos,\\s+transporto\\s+ar\\s+pašto\\s+paslaugų\\s+srities\\s+perkančiųjų\\s+subjektų,\\s+įstatym" + L,
    "nacionaliniam\\s+saugumui\\s+užtikrinti\\s+svarbių\\s+objektų\\s+apsaugos\\s+įstatym" + L + "(?:\\s+\\d+\\s+straipsn" + L + "(?:\\s+\\d+\\s+dal" + L + ")?)?",
    "nutarimu\\s+Nr\\.\\s*\\d+", "įsakymu\\s+Nr\\.\\s*[A-Z]+\\d*-\\d+", "(?:reglament|sprendim)" + L + "\\s+\\(ES\\)\\s+(?:Nr\\.\\s*)?\\d+/\\d+",
    "direktyv" + L + "\\s+\\d+/\\d+/(?:ES|EB)", "aprašo\\s+\\d+\\s+pried" + L + "(?:\\s+[IVX]+\\s+skyri" + L + ")?",
    // rangos sutartys (2026-10-09): statybos teisės aktai, statybos techniniai reglamentai su pavadinimu, draudimo ir apsaugos taisyklės
    "statybos\\s+įstatym" + L, "STR\\s+\\d\\.\\d{2}\\.\\d{2}:\\d{4}(?:\\s+„[^“”„]{3,80}[“”])?", "valstybinio\\s+socialinio\\s+draudimo\\s+įstatym" + L,
    "atliekų\\s+tvarkymo\\s+įstatym" + L, "specialiųjų\\s+žemės\\s+naudojimo\\s+sąlygų\\s+įstatym" + L, "darboviečių\\s+įrengimo\\s+statybvietėse\\s+nuostat" + L,
    "civilinės\\s+atsakomybės\\s+privalomojo\\s+draudimo\\s+taisykl" + L, "aplinkos\\s+ministro\\s+nustatyt" + L + "\\s+tvark" + L,
    "elektros\\s+tinklų\\s+apsaugos\\s+taisykl" + L, "ICC\\s+Publication\\s+No\\.\\s*\\d+",
    // angliški atitikmenys
    "(?:clause\\s+\\d+¹?\\s+of\\s+)?Articles?\\s+[\\d.]+(?:\\(\\d+¹?\\))?(?:\\s+and\\s+\\d+)?(?:\\s+(?:and/or|and|/)\\s+(?:Article\\s+)?[\\d.]+(?:\\(\\d+¹?\\))?)*" +
      "(?:\\s+of\\s+the\\s+(?:LPP|LP|Public\\s+Procurement\\s+Law|Civil\\s+Code(?:\\s+of\\s+the\\s+Republic\\s+of\\s+Lithuania)?|Law\\s+on\\s+the\\s+Protection\\s+of\\s+Objects\\s+of\\s+Importance\\s+to\\s+Ensuring\\s+National\\s+Security))?",
    "Annex\\s+\\d+\\s+to\\s+the\\s+(?:LPP|LP|Description)", "Resolution\\s+No\\.?\\s*\\d+", "Order\\s+No\\.?\\s*[A-Z]+\\d*-\\d+",
    "(?:Regulation|Decision)\\s+\\(EU\\)\\s+(?:No\\.?\\s*)?\\d+/\\d+", "Directive\\s+\\d+/\\d+/(?:EU|EC)",
    "Law\\s+on\\s+(?:International\\s+)?Sanctions", "Law\\s+on\\s+Public\\s+Administration", "Law\\s+on\\s+Companies", "Labour\\s+Code", "Law\\s+on\\s+Public\\s+Procurement",
    "Law\\s+on\\s+Procurement\\s+by\\s+Contracting\\s+Entities\\s+in\\s+the\\s+Water,\\s+Energy,\\s+Transport\\s+(?:or|and)\\s+Postal\\s+Services\\s+Sectors"
  ];
  var TEISES_RE = new RegExp(TEISES.map(function (x) { return "(" + x + ")"; }).join("|"), "gi");
  /* Žemėlapio tekstai: pastraipos ir išskleidžiamų sąrašų (valdiklių) variantai - pastarieji pastraipose nematomi. */
  function zemelapioTekstai(Z) {
    var v = [];
    ((Z && Z.valdikliai) || []).forEach(function (x) { (x.elementai || []).forEach(function (e) { v.push(e.tekstas || ""); }); });
    return ((Z && Z.pastraipos) || []).concat(v);
  }
  function teisesNuorodos(T) {
    var out = [];
    (T || []).forEach(function (t, i) {
      var s = String(t || "").replace(/[\s\u00a0]+/g, " "), m;
      TEISES_RE.lastIndex = 0;
      while ((m = TEISES_RE.exec(s))) {
        var n = m[0].replace(/[\s,/]+$/, "").trim();
        if (!/^Articles?\s+[\d.]+$/i.test(n) || /of the/i.test(m[0])) out.push({ i: i, nuoroda: n, raktas: n.toLowerCase() });
      }
    });
    return out;
  }
  global.GP_SUTARCIU_NUORODOS = { versija: "1.2", tikrink: tikrink, numeriai: numeriai, priedai: priedai, teisesNuorodos: teisesNuorodos, zemelapioTekstai: zemelapioTekstai };
})(typeof window !== "undefined" ? window : this);
