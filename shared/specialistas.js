/* G-Procure: specialisto (personalo) reikalavimo atpažinimas (GP_SPECIALISTAS, nuo 2026-11-10).
 *
 * Kvalifikacijos reikalavimas gali būti tiekėjo (jo įvykdytos sutartys, pajamos) arba specialisto - asmens, kurį tiekėjas pasitelks
 * (projekto vadovas, analitikas, konsultantas, teisininkas, darbų vykdytojas ir kt.). Specialistui taikomas VPT Tiekėjo kvalifikacijos
 * reikalavimų nustatymo metodikos 21 p. (kompetencijos, faktinė patirtis), o tiekėjo patirties vertė (16 p.) ir laikotarpis (16.1, 16.2 p.) -
 * tik tiekėjo įvykdytoms sutartims. Nuorodos - shared/teises-nuorodos.js (met_personalas, met_patirtis*).
 *
 * Iki 2026-11-10 PP-qual ir PP-salygos turėjo atskirus sąrašus be „analitik“: pilote su tikru paskelbtu pirkimu „Tiekėjas turi turėti
 * nekilnojamojo turto analitiką, kuris ...“ PP-qual laikė tiekėjo patirtimi, o PP-salygos kvalifikacijos lentelė - ne specialisto eilute.
 *
 * Asmuo, kurio reikalaujama: daiktavardžio kamienas žodžio pradžioje (JS \w ir \b lietuviškų raidžių neatpažįsta - raidžių klasė \p{L},
 * be lookbehind) arba šablonas „turėti X, kuris / kuri ...“ su asmens patirtimi, stažu ar išsilavinimu. Ne asmuo: juridinis ar fizinis
 * asmuo (tiekėjo forma), tiekėjo vadovas (pasirašo), savo darbuotojai (savo jėgomis), „konsultantų paslaugos“.
 *
 *   GP_SPECIALISTAS.sakinys(tekstas) -> true / false
 *   GP_SPECIALISTAS.rask(tekstas)    -> { taip, zodis } - zodis: rastas žodis originalo forma („analitiką“), kitaip ""
 *   GP_SPECIALISTAS.beLygiavercio(tekstas) -> { taip, zodis } - kvalifikaciją įrodo konkretus sertifikatas ar atestatas, bet
 *     nepasakyta, kad priimamas ir lygiavertis dokumentas (nuo 2026-11-11, LAT 2026-10-28 nutartis Nr. e3K-3-125-933/2026: lygiaverčiu
 *     pripažįstamas dokumentas, kuris savo turiniu patvirtina ne mažesnę kompetenciją ar kvalifikaciją; kita forma savaime nėra
 *     pagrindas atmesti - todėl reikalavime verta nurodyti, kokią kompetenciją dokumentas turi patvirtinti). Vadybos sistemų
 *     sertifikatai (ISO 9001, ISO 14001, EMAS) - ne: jų lygiaverčius pripažįsta SPS šablonų tekstas.
 *     Nuo 2026-11-12 (antras pilotas su tikru pirkimu) - pagal sakinius: dokumento žodis turi būti reikalavimas pateikti ar turėti dokumentą
 *     (vietininkas „nepaisant atestate nurodytų išimčių“ - ne), o lygiavertiškumas („arba lygiavertis“, „ar kitą lygiavertį dokumentą“,
 *     „atestato, licencijos, leidimo ar kitų dokumentų“) ieškomas tame pačiame sakinyje, kitame sakinyje apie tą patį dokumentą (alternatyva,
 *     pvz. užsieniečiams) arba sakinyje „priimami ir lygiaverčiai dokumentai“. Iki tol - visame tekste: „... arba kituose lygiaverčiuose
 *     dokumentuose“ sakinyje apie veiklos laikotarpį R17 nuslopindavo, o „nepaisant atestate nurodytų išimčių“ jį sukeldavo.
 *
 * Grynos funkcijos, nieko nesaugo ir nesiunčia. Naudoja PP-qual (taisyklės R1, R5, R12, R14) ir PP-salygos (kvalifikacijos lentelės
 * specialisto eilutės: SPS 3.7 p., specialistų sąrašo forma). Savų specialistų sąrašų moduliuose nerašyk.
 */
(function (root) {
  "use strict";
  var ASMUO_RE = new RegExp("(?:^|[^\\p{L}])(?:specialist|ekspert|inžinier|analitik(?:as|ą|o|ui|ai|ams|us|ų|e)(?![\\p{L}])|konsultant"
    + "|teisinink|advokat|architekt(?!ūr)|koordinator|vertintoj|auditori(?!j)|technik(?:as|ą|o|ui|ams|us)(?![\\p{L}])|meistr|vadov(?!au|ėl|yb)"
    + "|darbuotoj|personal(?!in)|kvazisubtiekėj|matinink|geodezinink|programuotoj|vertėj|dizainer|elektrik|suvirintoj|montuotoj|brigadinink"
    + "|tyrėj|dėstytoj|lektori|psicholog|redaktori|darbų\\s+vykdytoj|asmen(?!in|išk))", "iu");
  var NE_ASMUO_RE = new RegExp("(?:juridin|fizin|treči|kit|susijusi|įgaliot)[\\p{L}]*\\s+asmen[\\p{L}]*|asmen(?:iui|ims)(?![\\p{L}])"
    + "|(?:tiekėj|įmon|bendrov|dalyv|subjekt|grup)[\\p{L}]*\\s+vadov[\\p{L}]*|savo\\s+darbuotoj[\\p{L}]*|[\\p{L}]+(?:o|ų|ės|ių|os)\\s+paslaug[\\p{L}]*", "giu");
  // „turėti X, kuris ...“: X - ne daiktas ar sutartis (tie atpažįstami kitur), sakinio dalis po „kuris“ - apie asmens patirtį
  var ASMENS_SABLONAS = new RegExp("(?:turėti|pasitelk[\\p{L}]*|paskir[\\p{L}]*|skir[\\p{L}]*|įdarbin[\\p{L}]*|užtikrin[\\p{L}]*)\\s+([^,.;]{1,120}?),\\s*"
    + "(?:(?:kuris|kurie|turintį|turinčius|turintys)\\s[^.;]*?(?:patirt|staž|išsilavinim|dirb|[\\p{L}]{3,}ęs(?![\\p{L}]))"
    + "|(?:kuri|kurios|turinčią|turinčias)\\s[^.;]*?(?:staž|išsilavinim|[\\p{L}]{3,}usi(?![\\p{L}])))", "iu");
  var NE_ASMENS_OBJEKTAS = /sutart|projekt|užsakym|objekt|darb|paslaug|prek|sistem|įrang|sertifikat|licencij|leidim|draudim|patirt|pajam|apyvart/i;
  var RAIDE = /\p{L}/u;

  function rask(tekstas) {
    var s = String(tekstas == null ? "" : tekstas);
    // ne asmens junginiai pakeičiami tokio pat ilgio tarpais - rasto žodžio vieta lieka ta pati kaip originale
    var be = s.replace(NE_ASMUO_RE, function (x) { return new Array(x.length + 1).join(" "); });
    var m = ASMUO_RE.exec(be);
    if (m) {
      var a = m.index + (RAIDE.test(m[0].charAt(0)) ? 0 : 1), b = m.index + m[0].length;
      while (b < s.length && RAIDE.test(s.charAt(b))) b++;
      return { taip: true, zodis: s.slice(a, b).replace(/\s+/g, " ") };
    }
    var t = s.match(ASMENS_SABLONAS);
    if (t && !NE_ASMENS_OBJEKTAS.test(t[1])) return { taip: true, zodis: t[1].trim() };
    return { taip: false, zodis: "" };
  }
  function sakinys(tekstas) { return rask(tekstas).taip; }

  // Konkretus kvalifikacijos dokumentas: sertifikatas, atestatas (ir „atestuotas“) arba žinomas asmens sertifikatas santrumpa
  var DOKUMENTAS_RE = new RegExp("(?:^|[^\\p{L}])(sertifikat[\\p{L}]*|atestat[\\p{L}]*|atestuot[\\p{L}]*|PMP|PRINCE2|IPMA|ITIL|CISSP|CISA|CISM|ISTQB"
    + "|CompTIA|TOGAF|COBIT|CCNA|CCNP)(?![\\p{L}])", "giu");
  // vietininkas („nepaisant atestate nurodytų išimčių“, „sertifikatuose nurodyta“) - kas dokumente parašyta, ne reikalavimas jį pateikti ar turėti
  var VIETININKAS_RE = /^(?:sertifikat|atestat)(?:e|uose)$/iu;
  var VADYBA_RE = /vadybos\s+sistem|(?:^|[^\p{L}])EMAS(?![\p{L}])/iu;
  // lygiavertiškumas: „arba lygiavertis“, „ar kitą lygiavertį dokumentą“, „ar kitų dokumentų“, „ar analogiškų sertifikatų“, „or equivalent“
  var LYGIAVERTIS_RE = new RegExp("lygiaver|(?:^|[^\\p{L}])(?:ar|arba|ir\\s*/\\s*ar(?:ba)?)\\s+(?:kit|analogišk)[\\p{L}]*\\s+(?:[\\p{L}()-]+\\s+){0,4}?"
    + "(?:dokument|sertifikat|atestat|pažym|liudijim|įrodym|licencij|leidim)|equivalent", "iu");
  // bendra nuostata be dokumento žodžio: „Priimami ir lygiaverčiai dokumentai“, „... pripažįsta kitus lygiaverčius dokumentus“
  var PRIIMA_RE = /(?:^|[^\p{L}])(?:priim|pripaž|accept)/iu;
  // sakinio pabaiga: taškas, šauktukas ar klaustukas, po kurio - didžioji raidė, skaitmuo ar kabutė; ne po santrumpos ar skaičiaus
  var SANTRUMPA_RE = /(?:^|[^\p{L}])(?:\p{L}|nr|pvz|str|kt|pan|val|tel|proc|eur|vnt|žr|sk|pav|plg|t\.\s*y|įsak|nutar|psl)$|\p{N}$/iu;
  function sakiniai(tekstas){
    var out = [], dab = "";
    String(tekstas == null ? "" : tekstas).split(/\n/).forEach(function (p) {
      p = p.replace(/\s+/g, " ").trim();
      if (!p) return;
      // eilutės lūžis - sakinio riba tik po skyrybos ženklo (PDF pastraipa gali nutrūkti sakinio viduryje: „(toliau“ / „– TPD)“)
      if (dab && /[.!?;:]$/.test(dab)) { out.push(dab); dab = ""; }
      dab = dab ? dab + " " + p : p;
    });
    if (dab) out.push(dab);
    var sak = [];
    out.forEach(function (p) {
      var re = /[.!?]\s+(?=[\p{Lu}\p{N}„"(•–-])/gu, nuo = 0, m;
      while ((m = re.exec(p))) {
        if (SANTRUMPA_RE.test(p.slice(nuo, m.index))) continue;
        sak.push(p.slice(nuo, m.index + 1)); nuo = m.index + m[0].length;
      }
      sak.push(p.slice(nuo));
    });
    return sak.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  // dokumento grupė: sertifikatai (ir santrumpos) ir atestatai - alternatyva turi būti apie tą pačią
  function grupeDok(z) { return /^atest/i.test(z) ? "atest" : "sert"; }
  function reikalaujami(s) {
    var out = [], m;
    DOKUMENTAS_RE.lastIndex = 0;
    while ((m = DOKUMENTAS_RE.exec(s))) if (!VIETININKAS_RE.test(m[1])) out.push(m[1]);
    return out;
  }
  function beLygiavercio(tekstas) {
    var s = String(tekstas == null ? "" : tekstas);
    if (VADYBA_RE.test(s)) return { taip: false, zodis: "" };
    var S = sakiniai(s).map(function (x) {
      var visi = [], m;
      DOKUMENTAS_RE.lastIndex = 0;
      while ((m = DOKUMENTAS_RE.exec(x))) visi.push(m[1]);
      return { t: x, reik: reikalaujami(x), grupes: visi.map(grupeDok), lyg: LYGIAVERTIS_RE.test(x) };
    });
    // bendra nuostata: sakinys be dokumento žodžio, kuriame lygiaverčiai dokumentai priimami
    var bendra = S.some(function (x) { return !x.grupes.length && x.lyg && PRIIMA_RE.test(x.t); });
    for (var i = 0; i < S.length; i++) {
      var x = S[i];
      if (!x.reik.length || x.lyg || bendra) continue;
      var alternatyva = S.some(function (y, j) {
        return j !== i && y.lyg && y.grupes.some(function (g) { return x.reik.some(function (z) { return grupeDok(z) === g; }); });
      });
      if (!alternatyva) return { taip: true, zodis: x.reik[0] };
    }
    return { taip: false, zodis: "" };
  }

  root.GP_SPECIALISTAS = { rask: rask, sakinys: sakinys, beLygiavercio: beLygiavercio, sakiniai: sakiniai };
})(typeof window !== "undefined" ? window : this);
