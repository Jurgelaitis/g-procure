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
  var DOKUMENTAS_RE = new RegExp("(?:^|[^\\p{L}])(?:sertifikat[\\p{L}]*|atestat[\\p{L}]*|atestuot[\\p{L}]*|PMP|PRINCE2|IPMA|ITIL|CISSP|CISA|CISM|ISTQB"
    + "|CompTIA|TOGAF|COBIT|CCNA|CCNP)(?![\\p{L}])", "iu");
  var VADYBA_RE = /vadybos\s+sistem|(?:^|[^\p{L}])EMAS(?![\p{L}])/iu;
  var LYGIAVERTIS_RE = /lygiaver/i;
  function beLygiavercio(tekstas) {
    var s = String(tekstas == null ? "" : tekstas);
    var m = DOKUMENTAS_RE.exec(s);
    if (!m || VADYBA_RE.test(s) || LYGIAVERTIS_RE.test(s)) return { taip: false, zodis: "" };
    return { taip: true, zodis: m[0].replace(/^[^\p{L}]+/u, "") };
  }

  root.GP_SPECIALISTAS = { rask: rask, sakinys: sakinys, beLygiavercio: beLygiavercio };
})(typeof window !== "undefined" ? window : this);
