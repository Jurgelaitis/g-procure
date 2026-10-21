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
 *   GP_SUTARCIU_NUORODOS.tekstai(docx baitai) -> Promise<{ tekstai, wordNumeriu }> - tekstai su Word automatiniais numeriais (rangos sutartys)
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
  // priedo numeris - ir dviejų lygių (rangos SS priedų sąrašas: „priede Nr. 1.1“, 2026-10-10)
  var PRIED = /(\d+)\s*pried[a-ząčęėįšųūž]*|pried[a-ząčęėįšųūž]*\s*Nr\.\s*(\d+(?:\.\d+)?)|Annex(?:es)?\s*(?:No\.\s*)?(\d+)/gi;
  // teisės akto struktūra prieš numerį: „VPĮ 90 straipsnio 1 dalies 7 punkte“, „Article 45(2) point 3“ - ne sutarties punktas
  var TEISES_AKTAS = /(straipsn[a-ząčęėįšųūž]*|Article|įstatym[a-ząčęėįšųūž]*|kodeks[a-ząčęėįšųūž]*|Law|LPP|LP|VPĮ|PĮ|aprašo|reglament[a-ząčęėįšųūž]*|Regulation|Directive|direktyv[a-ząčęėįšųūž]*|dal(?:ies|yje|is)\s*(?:\d+\s*)?|paragraph\s*\(\d+\)|\(\d+\)|\((?:toliau|hereinafter)[^)]{0,40}(?:aprašas|taisyklės|metodika|tvarka|nutarimas|įsakymas|Description|Rules|Procedure|Methodology)\))\s*$/i;
  // „... tvarkos aprašo ... (toliau – Tvarkos aprašas) 4.4.4 papunkčiu“ - kito teisės akto punktas, ne sutarties (T3-V5, 2026-10-21)
  var PAVYZDYS = /(pavyzdžiui|pvz\.|e\.\s*g\.|for example)[\s,:]*$/i;

  function numeriai(T) {
    var s = {};
    T.forEach(function (t) { var m = NR.exec(t || ""); if (m) s[m[1]] = 1; });
    return s;
  }
  // specialiųjų sąlygų priedų sąrašas: „15.1. Priedas Nr. 1 ...“ / „15.1. Annex No 1 ...“
  // rangos SS (2026-10-10): po „SUTARTIES DOKUMENTAI IR PRIEDAI:“ - Word sąrašas, jo numeriai („1.1.“, „4.“) ir yra priedų numeriai
  // darbų pirkimo-pardavimo SS (2026-10-12): po „Sutarties priedai:“ - Word sąrašas „1) ... 5)“, jo numeriai ir yra priedų numeriai
  // eksploatavimo darbų sutarties SS (2026-10-13): tas pats sąrašas „1) ...“ po sakinio „Pasirašydamos Sutartį Šalys patvirtina, kad ...
  // dokumentus ..., kurie suprantami ir aiškinami kaip neatsiejama Sutarties dalis:“ („Kitų sąlygų“ sąrašas „1) ...“ - ne priedai)
  // Nuo 2026-10-13 (priedų sąrašas 2 žingsnyje): priedas, kurio eilutė baigiasi žodžiu „netaikoma“ („Rizikų valdymo planas - netaikoma;“,
  // prekių ir paslaugų SS - pavadinimo eilutėje po „15.N. Priedas Nr. N“), pažymimas reikšme "netaikomas" - nuoroda į jį yra radinys
  var NETAIK = /(?:^|[-\u2013]\s*)(?:netaikoma|not applicable)\s*[;.]?\s*$/i;
  function priedai(T) {
    var s = {}, sarase = false, sarase2 = false;
    var zym = function (nr, t) { s[nr] = NETAIK.test(t) ? "netaikomas" : 1; };
    var ANTR = /^\s*\d+\.\d+\.?\s*(?:Priedas|Annex)\s*(?:Nr\.|No\.?)?\s*\d+\s*$/i;
    T.forEach(function (t, i) {
      t = t || "";
      if (/^\s*Sutarties priedai:\s*$/.test(t) || /^\s*Pasirašydamos Sutartį Šalys patvirtina,.*neatsiejama Sutarties dalis:\s*$/.test(t)) { sarase2 = true; return; }
      var k = sarase2 && /^\s*(\d+)\)\s/.exec(t);
      if (k) zym(k[1], t); else if (sarase2 && t.trim()) sarase2 = false;
      var m = /^\s*\d+\.\d+\.?\s*(?:Priedas|Annex)\s*(?:Nr\.|No\.?)?\s*(\d+)/i.exec(t);
      if (m) {   // pavadinimas - toje pačioje eilutėje arba kitoje netuščioje pastraipoje
        var kita = ""; for (var j = i + 1; j < T.length && j <= i + 4 && !kita; j++) kita = String(T[j] || "").trim();
        zym(m[1], ANTR.test(t) ? kita : t);
      }
      m = /^\s*(\d+)\s+priedas\.\s/i.exec(t); if (m) zym(m[1], t);                               // „3 priedas. Apmokėjimo tvarka pagal etapus;“ (projektavimo paslaugų SS)
      if (/^\s*SUTARTIES DOKUMENTAI IR PRIEDAI:?\s*$/.test(t)) { sarase = true; return; }
      if (sarase && /^\s*(Užsakovo|Rangovo) vardu:?\s*$/.test(t)) sarase = false;
      var n = sarase && /^\s*(\d+(?:\.\d+)?)\.(?=\s)/.exec(t); if (n) zym(n[1], t);
    });
    return s;
  }
  /* Sutarties dokumento pastraipų tekstai su Word automatiniais numeriais (2026-10-10, rangos sutartys: punktai sunumeruoti tik Word sąrašais,
     tekste numerių nėra). Dešimtainis numeris („5.2.“, „1.1.2.13.“) pridedamas pastraipos pradžioje, jei tekstas pats numeriu neprasideda;
     numeracija - GPNum (PP-salygos/variklis.js) emuliacija, sutikrinta su sutarciu-sablonai.py word_numeriai. Be GPNum - tekstai be numerių.
     -> Promise<{ tekstai, wordNumeriu }> */
  async function tekstai(buf) {
    var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", z = await global.JSZip.loadAsync(buf), dp = new DOMParser();
    var xml = async function (f) { var e = z.file(f); return e ? dp.parseFromString(await e.async("string"), "application/xml") : null; };
    var d = await xml("word/document.xml"), P = Array.prototype.slice.call(d.getElementsByTagNameNS(W, "p")), zy = null, n = 0;
    var N = typeof GPNum !== "undefined" ? GPNum : global.GPNum;   // variklis.js: viršutinio lygio const - ne window savybė
    if (N) zy = N.wordZymes(N.modelis(await xml("word/numbering.xml"), await xml("word/styles.xml")), P);
    var T = P.map(function (p) {
      var t = Array.prototype.map.call(p.getElementsByTagNameNS(W, "t"), function (q) { return q.textContent; }).join("");
      var e = zy && zy.get(p);
      if (e && e.desimt && /^\d/.test(e.label) && !NR.test(t)) { n++; return e.label + " " + t; }
      return t;
    });
    return { tekstai: T, wordNumeriu: n };
  }
  /* Citata - nuo žodžio pradžios iki žodžio pabaigos (T3-V5: iki tol prasidėdavo žodžio viduryje - „o“ (toliau ...“) */
  function citata(t, a, b) {
    var s = Math.max(0, a), e = Math.min(t.length, b);
    while (s > 0 && s > a - 20 && /\S/.test(t.charAt(s - 1))) s--;
    while (e < t.length && e < b + 20 && /\S/.test(t.charAt(e))) e++;
    return t.slice(s, e).trim();
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
          // „Punktas ir 14.4.1 - 14.4.4 papunkčiai netaikomi.“ / „... subparagraphs 14.4.1 - 14.4.4 do not apply.“ - pasirinkus šį variantą
          // papunkčiai pašalinami (generatoriaus 5b žingsnis, 2026-10-20), todėl jų dokumente gali nebūti
          if (/papunk|subparagraph|sub-paragraph/i.test(m[0]) && /^\s*(netaikom|do\s+not\s+apply)/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 20))) continue;
          (m[3].match(/\d+(?:\.\d+)*/g) || []).forEach(function (nr) {
            if (bendr || spec) {
              if (!aibe) { out.nepatikrinta.push({ dok: dok, nr: nr, priezastis: (bendr ? "bendrųjų" : "specialiųjų") + " sąlygų dokumento nėra" }); return; }
              if (!aibe[nr]) out.radiniai.push({ dok: dok, i: i, nr: nr, rusis: "punktas", citata: citata(t, m.index - 30, m.index + m[0].length + 20) });
              return;
            }
            var savo = dok === "BS" ? bs : ss, kito = dok === "BS" ? ss : bs;
            if ((savo && savo[nr]) || (kito && kito[nr])) return;
            if (!kito) { out.nepatikrinta.push({ dok: dok, nr: nr, priezastis: "nuoroda be dokumento nurodymo, o kito sutarties dokumento nėra" }); return; }
            out.radiniai.push({ dok: dok, i: i, nr: nr, rusis: "punktas", citata: citata(t, m.index - 30, m.index + m[0].length + 20) });
          });
        }
        PRIED.lastIndex = 0;
        while ((m = PRIED.exec(t))) {
          var nrp = m[1] || m[2] || m[3], pr0 = t.slice(Math.max(0, m.index - 30), m.index);
          if (TEISES_AKTAS.test(pr0) || PAVYZDYS.test(pr0) || /^\s*to\s+the\s+(LPP|LP|Law)/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 16))) continue;
          if ((/^\s*\d+\.\d+\.?\s*(Priedas|Annex)/i.test(t) && m.index <= 12) || (/^\s*\d+\s+priedas\.\s/i.test(t) && m.index <= 4)) continue;   // pats priedų sąrašo įrašas
          out.nuorodu++;
          if (!pr) { out.nepatikrinta.push({ dok: dok, nr: nrp, priezastis: "specialiųjų sąlygų (priedų sąrašo) nėra" }); continue; }
          if (!pr[nrp]) out.radiniai.push({ dok: dok, i: i, nr: nrp, rusis: "priedas", citata: citata(t, m.index - 30, m.index + m[0].length + 20) });
          // priedas priedų sąraše pažymėtas kaip netaikomas, o specialiosios sąlygos į jį nurodo (bendrųjų sąlygų nuorodos - sąlyginės:
          // jos galioja tik tada, kai priedas pridedamas, todėl nežymimos)
          else if (pr[nrp] === "netaikomas" && dok === "SS") out.radiniai.push({ dok: dok, i: i, nr: nrp, rusis: "priedas", netaikomas: true, citata: citata(t, m.index - 30, m.index + m[0].length + 20) });
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
  // dalis - ir dvi („92 straipsnio 14 ir (arba) 15 dalyje“ - eksploatavimo darbų sutarties BS, 2026-10-13)
  var STR_DAL = "(?:\\s+\\d+\\s+straipsn" + L + "(?:\\s+\\d+(?:\\s+ir\\s+\\(arba\\)\\s+\\d+)?\\s+dal" + L + ")?)?";
  var TEISES = [
    "(?:VPĮ|PĮ)\\s+\\d+(?:\\s+ir\\s+\\d+)?\\s*/\\s*(?:VPĮ|PĮ)\\s+\\d+(?:\\s+ir\\s+\\d+)?\\s+straipsn" + L,
    "(?:VPĮ|PĮ)\\s+" + VNR + "(?:\\s*(?:ir\\s*\\(ar\\)|ir|/|,)\\s*(?:(?:VPĮ|PĮ)\\s+)?" + VNR + ")*",
    "civilin" + L + "\\s+kodeks" + L + "(?:\\s+\\d+\\.\\d+\\s+straipsn" + L + "(?:\\s+\\d+\\s+dal" + L + ")?)?", "darbo\\s+kodeks" + L,
    "(?:tarptautinių\\s+)?sankcijų\\s+įstatym" + L, "viešojo\\s+administravimo\\s+įstatym" + L, "akcinių\\s+bendrovių\\s+įstatym" + L,
    // pilnas VPĮ ar PĮ pavadinimas - su straipsniu ir dalimi, jei jie nurodyti iškart po jo (projektavimo paslaugų BS, 2026-10-11)
    "viešųjų\\s+pirkimų\\s+įstatym" + L + STR_DAL,
    "pirkimų,\\s+atliekamų\\s+vandentvarkos,\\s+energetikos,\\s+transporto\\s+ar\\s+pašto\\s+paslaugų\\s+srities\\s+perkančiųjų\\s+subjektų,\\s+įstatym" + L + STR_DAL,
    // sutartyje apibrėžta sąvoka „Pirkimų įstatymas“ (darbų pirkimo-pardavimo BS, 2026-10-11) - su straipsniu ir dalimi, ir sutrumpintai („98 str.“)
    "pirkimų\\s+įstatym" + L + "(?:\\s+\\d+\\s+(?:straipsn" + L + "|str\\.)(?:\\s+\\d+\\s+(?:dal" + L + "|d\\.))?)?",
    "kainodaros\\s+taisyklių\\s+nustatymo\\s+metodik" + L,
    "nacionaliniam\\s+saugumui\\s+užtikrinti\\s+svarbių\\s+objektų\\s+apsaugos\\s+įstatym" + L + "(?:\\s+\\d+\\s+straipsn" + L + "(?:\\s+\\d+\\s+dal" + L + ")?)?",
    // nutarimo ir įsakymo numeris - ir kilmininku ar galininku („nutarimo Nr. 99“, „įsakymą Nr. D1-393“), įsakymo numeris be raidžių („Nr. 1-309“)
    // ir su data prieš numerį („įsakymu 2010 m. sausio 27 d. Nr. D1-79“); direktyva - ir be „/ES“ (eksploatavimo darbų sutartys, 2026-10-13)
    "nutarim(?:u|o)\\s+Nr\\.\\s*\\d+", "įsakym(?:u|ą)\\s+(?:\\d{4}\\s+m\\.\\s+[a-ząčęėįšųūž]+\\s+\\d+\\s+d\\.\\s+)?Nr\\.\\s*(?:[A-Z]+\\d*|\\d+)-\\d+",
    "(?:reglament|sprendim)" + L + "\\s+\\(ES\\)\\s+(?:Nr\\.\\s*)?\\d+/\\d+",
    "direktyv" + L + "\\s+\\d+/\\d+(?:/(?:ES|EB))?", "aprašo\\s+\\d+\\s+pried" + L + "(?:\\s+[IVX]+\\s+skyri" + L + ")?",
    // rangos sutartys (2026-10-09): statybos teisės aktai, statybos techniniai reglamentai su pavadinimu, draudimo ir apsaugos taisyklės
    // su straipsniu (ir dalimis), jei jis nurodytas: „statybos įstatymo 22¹ straipsnio 1 ir 2 dalyse“, „valstybinio socialinio draudimo
    // įstatymo 15¹ straipsnyje“ (eksploatavimo darbų sutarties BS, 2026-10-13)
    "statybos\\s+įstatym" + L + "(?:\\s+\\d+¹?\\s+straipsn" + L + "(?:\\s+\\d+(?:\\s+ir\\s+\\d+)?\\s+dal" + L + ")?)?",
    "STR\\s+\\d\\.\\d{2}\\.\\d{2}:\\d{4}(?:\\s+„[^“”„]{3,80}[“”])?",
    "valstybinio\\s+socialinio\\s+draudimo\\s+įstatym" + L + "(?:\\s+\\d+¹?\\s+straipsn" + L + ")?",
    "atliekų\\s+tvarkymo\\s+įstatym" + L, "specialiųjų\\s+žemės\\s+naudojimo\\s+sąlygų\\s+įstatym" + L, "darboviečių\\s+įrengimo\\s+statybvietėse\\s+nuostat" + L,
    "civilinės\\s+atsakomybės\\s+privalomojo\\s+draudimo\\s+taisykl" + L, "aplinkos\\s+ministro\\s+nustatyt" + L + "\\s+tvark" + L,
    "elektros\\s+tinklų\\s+apsaugos\\s+taisykl" + L, "ICC\\s+Publication\\s+No\\.\\s*\\d+",
    // eksploatavimo darbų sutartys (2026-10-13)
    "metrologijos\\s+įstatym" + L, "atliekų\\s+tvarkymo\\s+taisykl" + L, "mobilizacijos\\s+ir\\s+priimanči" + L + "\\s+šalies(?:\\s+paramos)?\\s+įstatym" + L,
    "atleidimo\\s+nuo\\s+atsakomybės\\s+esant\\s+nenugalimos\\s+jėgos\\s+\\(force\\s+majeure\\)\\s+aplinkybėms\\s+taisykl" + L,
    "elektros\\s+linijų\\s+ir\\s+instaliacijos\\s+įrengimo\\s+taisykl" + L, "miško\\s+kirtimo\\s+taisykl" + L,
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
  global.GP_SUTARCIU_NUORODOS = { versija: "1.8", tikrink: tikrink, tekstai: tekstai, numeriai: numeriai, priedai: priedai, teisesNuorodos: teisesNuorodos, zemelapioTekstai: zemelapioTekstai };
})(typeof window !== "undefined" ? window : this);
