/* ============================================================================
 * G-Procure  shared/pirkimo-kortele.js   (window.GP_KORTELE)
 * ----------------------------------------------------------------------------
 * BENDRA PIRKIMO KORTELĖ (tobulinimo planas A1, 2026-09-26). Vienas pirkimo
 * įrašas, kurį skaito visi moduliai: pavadinimas, vertė, būdas, vykdytojas ir
 * režimas įvedami VIENĄ kartą, o ne kiekviename įrankyje iš naujo.
 *
 * KAS ČIA:
 *  - schema ir jos versija (SCHEMA), naujo įrašo numatytosios reikšmės;
 *  - saugykla: kortelės gyvena TIK šioje naršyklėje (localStorage, raktas
 *    „gprocure.korteles“), per shared/saugykla.js; patenka į atsarginę kopiją
 *    (shared/backup.js ZENKLAI);
 *  - tikrinimas žmogui (kas privaloma, kas neteisingo formato) ir santrauka;
 *  - sąsaja modulio viršuje: pasirinkiklis, kortelės langas ir laukų susiejimas
 *    (kortelės reikšmės įrašomos į TUŠČIUS modulio laukus, skirtingos - tik
 *    parodomos, niekas neperrašoma be žmogaus paspaudimo).
 *
 * TAISYKLĖS:
 *  - Neperskaitoma saugykla NIEKADA nevirsta „kortelių nėra“ ir niekada
 *    neperrašoma: issaugok() tada grąžina klaidą (kaip Q3 būsenos).
 *  - Įrašoma skaitant iš naujo ir keičiant TIK vieną kortelę pagal id - kitame
 *    lange pakeista kita kortelė nedingsta.
 *  - Nežinomi laukai (naujesnės schemos) paliekami - senas puslapis jų netrina.
 *  - Moduliai, kurie savo rezultatų nesaugo (PP-qual, PP-salygos, PP-graphs),
 *    kortelę tik SKAITO: jiems sąsaja rodoma be „Nauja“ ir „Redaguoti“.
 *  - Vykdytojai ir jų tikėtinas režimas - iš shared/organizacijos.js, būdai - iš
 *    shared/procurement-methods.js, sumos - per shared/money.js. Čia jų nekartoti.
 *  - Režimą lemia skelbimas, ne organizacija: kortelėje jis atskiras laukas, o
 *    nesutapimas su tikėtinu tik parodomas (ne taisomas).
 *
 * Nieko nesiunčia į serverį.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var SCHEMA = 1;
  var RAKTAS = "gprocure.korteles";

  /* Testams: ?saugykla=testine - kortelės laikomos tik atmintyje, tikri duomenys neliečiami
     (kaip PP-teise). naudokSaugykla(s) - paduoti savo (netikrą) saugyklą. */
  var TESTINE = false;
  try { TESTINE = /[?&]saugykla=testine(&|$)/.test(global.location.search); } catch (e) {}
  function atmintine() {
    var d = {};
    return {
      get length() { return Object.keys(d).length; },
      key: function (i) { return Object.keys(d)[i] || null; },
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
      setItem: function (k, v) { d[k] = String(v); },
      removeItem: function (k) { delete d[k]; }
    };
  }
  var pakeista = null, testine = null;
  function saug(o) {
    if (o && o.saugykla) return o.saugykla;
    if (pakeista) return pakeista;
    if (TESTINE) return testine || (testine = atmintine());
    return undefined;   // GP_SAUGYKLA ima localStorage
  }
  function naudokSaugykla(s) { pakeista = s || null; }

  /* ---------------------------------------------------------------- žodynai */
  var OBJEKTAI = [
    { id: "prekes", lt: "Prekės", en: "Supplies" },
    { id: "paslaugos", lt: "Paslaugos", en: "Services" },
    { id: "paslaugos_it", lt: "Paslaugos (IT / IS)", en: "Services (IT / IS)" },
    { id: "darbai", lt: "Darbai", en: "Works" },
    { id: "misrus", lt: "Mišrus pirkimas", en: "Mixed contract" }
  ];
  var BUSENOS = [
    { id: "planuojamas", lt: "Planuojamas", en: "Planned" },
    { id: "rengiamas", lt: "Rengiami dokumentai", en: "Documents in preparation" },
    { id: "paskelbtas", lt: "Paskelbtas", en: "Published" },
    { id: "vertinamas", lt: "Vertinami pasiūlymai", en: "Tenders under evaluation" },
    { id: "sutartis", lt: "Sudaryta sutartis", en: "Contract signed" },
    { id: "nutrauktas", lt: "Nutrauktas", en: "Cancelled" }
  ];
  var REZIMAI = { PI: { lt: "PĮ", en: "PĮ" }, VPI: { lt: "VPĮ", en: "VPĮ" } };

  /* Laukų pavadinimai žmogui (pranešimams ir kortelės formai). */
  var LAUKAI = {
    pavadinimas: { lt: "Pavadinimas", en: "Title" },
    numeris: { lt: "Numeris", en: "Number" },
    cvpisNr: { lt: "CVP IS numeris", en: "CVP IS number" },
    vykdytojas: { lt: "Vykdytojas", en: "Contracting body" },
    rezimas: { lt: "Režimas", en: "Legal regime" },
    objektas: { lt: "Objektas", en: "Subject" },
    bvpz: { lt: "BVPŽ kodas", en: "CPV code" },
    verte: { lt: "Vertė", en: "Value" },
    budas: { lt: "Būdas", en: "Procedure" },
    dalys: { lt: "Dalys", en: "Lots" },
    trukmeMen: { lt: "Sutarties trukmė", en: "Contract duration" },
    pradzia: { lt: "Pradžios data", en: "Start date" },
    paskelbimas: { lt: "Paskelbimo data", en: "Publication date" },
    pasiulymuTerminas: { lt: "Pasiūlymų terminas", en: "Tender deadline" },
    iniciatorius: { lt: "Iniciatorius", en: "Initiator" },
    organizatorius: { lt: "Organizatorius", en: "Organiser" },
    busena: { lt: "Būsena", en: "Status" }
  };

  function kalba() {
    var l = typeof document !== "undefined" ? (document.documentElement.getAttribute("lang") || "lt") : "lt";
    return /^en/i.test(l) ? "en" : "lt";
  }
  function pav(zodynas, id, l) {
    for (var i = 0; i < zodynas.length; i++) if (zodynas[i].id === id) return zodynas[i][l || kalba()];
    return "";
  }
  function laukoPav(laukas, l) { var x = LAUKAI[laukas]; return x ? x[l || kalba()] : laukas; }
  /* „Pavadinimas“ -> „pavadinimas“ sąrašo viduryje; santrumpos (BVPŽ, CVP IS) lieka. */
  function mazaja(s) { return /^.[a-ząčęėįšųūž]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  function vykdytojai() {
    var o = global.GP_ORG && global.GP_ORG.ORGANIZACIJOS;
    return (o || []).map(function (x) { return { id: x.id, pavadinimas: x.pavadinimas, rezimas: x.rezimasTiketinas || "" }; });
  }
  function vykdytojas(id) {
    var v = vykdytojai();
    for (var i = 0; i < v.length; i++) if (v[i].id === id) return v[i];
    return null;
  }

  /* ---------------------------------------------------------------- schema */
  function naujasId() {
    return "k-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  /* Tekstiniai laukai (visada eilutė, "" - nenurodyta). */
  var TEKSTAI = ["pavadinimas", "numeris", "cvpisNr", "vykdytojas", "rezimas", "objektas", "bvpz", "budas",
                 "pradzia", "paskelbimas", "pasiulymuTerminas", "iniciatorius", "organizatorius", "busena"];

  function tuscia(laukai) {
    var dabar = new Date().toISOString();
    var k = {
      id: naujasId(), sukurta: dabar, atnaujinta: dabar,
      pavadinimas: "", numeris: "", cvpisNr: "",
      vykdytojas: "", rezimas: "",
      objektas: "", bvpz: "",
      verte: null, budas: "",
      dalys: null,                        // null - nenurodyta, [] - neskaidomas, [{ pavadinimas, verte }] - dalys
      trukmeMen: null, pradzia: "", paskelbimas: "",
      pasiulymuTerminas: "",               // pasiūlymų ar paraiškų terminas „2026-10-02T15:00“ (Vilniaus laikas)
      iniciatorius: "", organizatorius: "",
      busena: "rengiamas", archyvuota: false
    };
    return laukai ? normalizuok(Object.assign(k, laukai)) : k;
  }

  function tekstas(v) { return v == null ? "" : String(v).trim(); }
  function skaicius(v) {
    if (v == null || v === "") return null;
    var n = typeof v === "number" ? v : (global.GP_MONEY ? global.GP_MONEY.parseEUR(v) : parseFloat(v));
    return isFinite(n) ? n : null;
  }
  function sveikas(v) {
    if (v == null || v === "") return null;
    var n = typeof v === "number" ? v : parseInt(String(v).replace(/\s/g, ""), 10);
    return isFinite(n) ? Math.round(n) : null;
  }

  /* Bet kokia (sena ar naujesnė) kortelė -> dabartinės schemos forma.
     Nežinomi laukai paliekami; tipai suvienodinami, bet reikšmės neišgalvojamos. */
  function normalizuok(k) {
    if (!k || typeof k !== "object") return null;
    var o = Object.assign({}, k);
    o.id = tekstas(o.id) || naujasId();
    o.sukurta = tekstas(o.sukurta) || new Date().toISOString();
    o.atnaujinta = tekstas(o.atnaujinta) || o.sukurta;
    TEKSTAI.forEach(function (f) { o[f] = tekstas(o[f]); });
    o.verte = skaicius(o.verte);
    o.trukmeMen = sveikas(o.trukmeMen);
    if (!Array.isArray(o.dalys)) o.dalys = null;
    else o.dalys = o.dalys.filter(function (d) { return d && typeof d === "object"; })
      .map(function (d) { return Object.assign({}, d, { pavadinimas: tekstas(d.pavadinimas), verte: skaicius(d.verte) }); });
    if (!o.busena) o.busena = "rengiamas";
    o.archyvuota = o.archyvuota === true;
    return o;
  }

  /* Saugyklos įrašo sandara: { schema: skaičius, korteles: [] }. */
  function sandara(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return "tikėtasi objekto su kortelių sąrašu";
    if (typeof v.schema !== "number") return "nėra schemos versijos";
    if (!Array.isArray(v.korteles)) return "kortelių sąrašas nėra masyvas";
    return true;
  }

  /* ---------------------------------------------------------------- saugykla */
  function skaityk(o) {
    o = o || {};
    if (!global.GP_SAUGYKLA) return { busena: "neprieinama", korteles: [], r: { busena: "neprieinama", kodas: "neprieinama", klaida: "shared/saugykla.js neprijungtas" } };
    var r = global.GP_SAUGYKLA.skaityk(RAKTAS, { saugykla: saug(o), tikrink: sandara });
    if (r.busena === "nera") return { busena: "nera", korteles: [], r: r };
    if (r.busena !== "yra") return { busena: r.busena, korteles: [], r: r };
    var visos = [];
    r.reiksme.korteles.forEach(function (k) { var n = normalizuok(k); if (n && tekstas(k && k.id)) visos.push(n); });
    return { busena: "yra", korteles: visos, schema: r.reiksme.schema, r: r };
  }

  function aktyvios(o) {
    var s = skaityk(o);
    s.korteles = s.korteles.filter(function (k) { return !k.archyvuota; })
      .sort(function (a, b) { return a.atnaujinta < b.atnaujinta ? 1 : a.atnaujinta > b.atnaujinta ? -1 : 0; });
    return s;
  }

  function gauk(id, o) {
    var s = skaityk(o);
    for (var i = 0; i < s.korteles.length; i++) if (s.korteles[i].id === id) return s.korteles[i];
    return null;
  }

  /* Įrašo vieną kortelę: perskaito iš naujo, pakeičia tik tą id (kitos - žaliai kaip buvo).
     Grąžina { ok, kortele } arba { ok: false, r } - r tinka GP_SAUGYKLA.pranesimas(). */
  function issaugok(k, o) {
    o = o || {};
    if (!global.GP_SAUGYKLA) return { ok: false, r: { ok: false, kodas: "neprieinama", klaida: "shared/saugykla.js neprijungtas" } };
    var r = global.GP_SAUGYKLA.skaityk(RAKTAS, { saugykla: saug(o), tikrink: sandara });
    if (r.busena === "sugadinta" || r.busena === "neprieinama") return { ok: false, r: r };
    var irasas = r.busena === "yra" ? r.reiksme : { schema: SCHEMA, korteles: [] };
    var n = normalizuok(k);
    n.atnaujinta = new Date().toISOString();
    if (n.atnaujinta <= n.sukurta) n.atnaujinta = n.sukurta;
    var rasta = false;
    var sarasas = irasas.korteles.map(function (x) {
      if (x && x.id === n.id) { rasta = true; return n; }
      return x;
    });
    if (!rasta) sarasas.push(n);
    var w = global.GP_SAUGYKLA.rasyk(RAKTAS, { schema: Math.max(SCHEMA, irasas.schema || 0), korteles: sarasas }, { saugykla: saug(o) });
    if (!w.ok) return { ok: false, r: w };
    return { ok: true, kortele: n, nauja: !rasta };
  }

  function archyvuok(id, taip, o) {
    var k = gauk(id, o);
    if (!k) return { ok: false, r: { ok: false, kodas: "kita", klaida: "kortelė nerasta" } };
    k.archyvuota = taip !== false;
    return issaugok(k, o);
  }

  /* ---------------------------------------------------------------- tikrinimas */
  var BVPZ = /^\d{8}-\d$/;
  var DATA = /^\d{4}-\d{2}-\d{2}$/;
  /* Tikra kalendorinė data (2026-02-30 - ne). */
  function arData(s) {
    if (!DATA.test(s)) return false;
    var d = new Date(s + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  /* Kliūtys išsaugoti: [{ laukas, zinute }]. Tuščias sąrašas - galima saugoti. */
  function tikrink(k, l) {
    l = l || kalba();
    var en = l === "en", out = [];
    var p = function (laukas, lt, eng) { out.push({ laukas: laukas, zinute: en ? eng : lt }); };
    if (!tekstas(k.pavadinimas)) p("pavadinimas", "Įrašykite pirkimo pavadinimą.", "Enter the procurement title.");
    if (k.verte != null && !(k.verte > 0)) p("verte", "Vertė turi būti teigiama suma eurais be PVM.", "The value must be a positive amount in EUR excl. VAT.");
    if (tekstas(k.bvpz) && !BVPZ.test(tekstas(k.bvpz))) p("bvpz", "BVPŽ kodas rašomas taip: 12345678-9.", "Write the CPV code like 12345678-9.");
    if (tekstas(k.budas) && !(global.GP_METHODS && global.GP_METHODS.isValid(k.budas))) p("budas", "Pirkimo būdas nerastas klasifikatoriuje.", "The procedure is not in the classifier.");
    if (tekstas(k.rezimas) && !REZIMAI[k.rezimas]) p("rezimas", "Režimas gali būti PĮ arba VPĮ.", "The regime can be PĮ or VPĮ.");
    if (tekstas(k.vykdytojas) && !vykdytojas(k.vykdytojas)) p("vykdytojas", "Pirkimo vykdytojas nerastas registre.", "The contracting body is not in the register.");
    if (tekstas(k.objektas) && !pav(OBJEKTAI, k.objektas, "lt")) p("objektas", "Objektas gali būti prekės, paslaugos arba darbai.", "The subject can be supplies, services or works.");
    if (k.trukmeMen != null && !(k.trukmeMen >= 1 && k.trukmeMen <= 600)) p("trukmeMen", "Trukmė - sveikas mėnesių skaičius nuo 1 iki 600.", "Duration is a whole number of months from 1 to 600.");
    ["pradzia", "paskelbimas"].forEach(function (f) {
      if (tekstas(k[f]) && !arData(k[f])) p(f, "Data rašoma taip: 2026-10-15.", "Write the date like 2026-10-15.");
    });
    if (tekstas(k.pasiulymuTerminas) && !(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(k.pasiulymuTerminas) && arData(k.pasiulymuTerminas.slice(0, 10))))
      p("pasiulymuTerminas", "Terminas rašomas taip: 2026-10-02 15:00.", "Write the deadline like 2026-10-02 15:00.");
    if (Array.isArray(k.dalys)) k.dalys.forEach(function (d, i) {
      if (!tekstas(d.pavadinimas)) p("dalys", "Įrašykite " + (i + 1) + " dalies pavadinimą.", "Enter the title of lot " + (i + 1) + ".");
      if (d.verte != null && !(d.verte > 0)) p("dalys", (i + 1) + " dalies vertė turi būti teigiama.", "The value of lot " + (i + 1) + " must be positive.");
    });
    return out;
  }

  /* Pastabos, kurios išsaugoti netrukdo (tik parodomos). */
  function pastabos(k, l) {
    l = l || kalba();
    var en = l === "en", out = [];
    var v = vykdytojas(k.vykdytojas);
    if (v && v.rezimas && k.rezimas && v.rezimas !== k.rezimas) {
      out.push(en
        ? v.pavadinimas + " usually procures under " + REZIMAI[v.rezimas].en + ". The regime is set by the notice form - check it."
        : v.pavadinimas + " paprastai perka pagal " + REZIMAI[v.rezimas].lt + ". Režimą lemia skelbimo forma - patikrinkite ją.");
    }
    if (Array.isArray(k.dalys) && k.dalys.length && k.verte > 0) {
      var suma = 0, visos = true;
      k.dalys.forEach(function (d) { if (d.verte > 0) suma += d.verte; else visos = false; });
      if (visos && Math.abs(suma - k.verte) > 0.5) out.push(en
        ? "The lot values add up to " + formatas(suma) + " EUR, the estimated value is " + formatas(k.verte) + " EUR."
        : "Dalių vertės sudaro " + formatas(suma) + " EUR, o numatoma vertė - " + formatas(k.verte) + " EUR.");
    }
    return out;
  }

  /* ---------------------------------------------------------------- pateikimas */
  function formatas(n) {
    if (!(n > 0)) return "";
    return global.GP_MONEY ? global.GP_MONEY.formatEUR(n) : String(n);
  }
  function budoPav(id, l) {
    if (!id || !global.GP_METHODS) return "";
    var m = global.GP_METHODS.byId(id);
    return m ? m.label : "";
  }
  /* Viena eilutė: vertė · būdas · režimas · vykdytojas (tik žinomos dalys). */
  function santrauka(k, l) {
    if (!k) return "";
    l = l || kalba();
    var d = [];
    if (k.verte > 0) d.push(formatas(k.verte) + " EUR");
    if (k.budas) d.push(budoPav(k.budas, l));
    if (k.rezimas && REZIMAI[k.rezimas]) d.push(REZIMAI[k.rezimas][l]);
    var v = vykdytojas(k.vykdytojas);
    if (v) d.push(v.pavadinimas);
    return d.join(" · ");
  }

  /* Lauko reikšmė žmogui (pranešimuose apie skirtumus). */
  function reiksmesTekstas(laukas, v, l) {
    l = l || kalba();
    if (v === null || v === undefined || v === "") return "";
    if (laukas === "verte") return formatas(v) + " EUR";
    if (laukas === "budas") return budoPav(v, l) || String(v);
    if (laukas === "objektas") return pav(OBJEKTAI, v, l) || String(v);
    if (laukas === "busena") return pav(BUSENOS, v, l) || String(v);
    if (laukas === "rezimas") return REZIMAI[v] ? REZIMAI[v][l] : String(v);
    if (laukas === "vykdytojas") { var x = vykdytojas(v); return x ? x.pavadinimas : String(v); }
    if (laukas === "trukmeMen") return v + (l === "en" ? " mo." : " mėn.");
    if (laukas === "pasiulymuTerminas") return String(v).replace("T", " ");
    if (laukas === "dalys") {
      if (!Array.isArray(v)) return "";
      if (!v.length) return l === "en" ? "not divided into lots" : "neskaidomas į dalis";
      return v.map(function (d, i) { return (i + 1) + ". " + d.pavadinimas + (d.verte > 0 ? " (" + formatas(d.verte) + " EUR)" : ""); }).join("; ");
    }
    return String(v);
  }

  /* ================================================================ SĄSAJA MODULIUI
   * GP_KORTELE.mount({
   *   modulis: "PP-graphs",                   // žmogui ir pranešimams
   *   laukai: [{ kortele: "budas",            // kortelės laukas
   *              el: "#f-budas",              // modulio laukas (arba gauk()/dek())
   *              i: v => v,                   // kortelė -> modulio reikšmė (null - šiame modulyje neįmanoma)
   *              is: s => s,                  // modulio reikšmė -> kortelės (kortelei kurti ir palyginti)
   *              numatyta: kortele => bool,   // dabartinė reikšmė - tik numatytoji (ne žmogaus)
   *              lygu: (modulio, korteles) => bool, // savas lyginimas, kai lauko forma kita
   *              pastaba: "..." }],           // rodoma prie skirtumo (pvz. kas bus perskaičiuota)
   *   poTaikymo: laukai => {},                // modulis persipiešia (pvz. PP-qual vediklis)
   *   pries: kortele => true|false|Promise,   // modulis gali atsisakyti (pvz. pradėtas kitas pirkimas)
   *   onPasirinkta: (kortele, rezultatas) => {}
   * })
   * Kortelės kuriamos ir keičiamos puslapyje pirkimu-korteles.html (atveriama naujame skirtuke,
   * tad modulio darbas nedingsta). Modulis, kuris nieko nesaugo, per šią juostą nieko ir neįrašo.
   * ==========================================================================================*/
  var SKRIPTAS = (typeof document !== "undefined" && document.currentScript && document.currentScript.src) || "";
  function puslapioAdresas() {
    try { return new URL("../pirkimu-korteles.html", SKRIPTAS || global.location.href).href; }
    catch (e) { return "../pirkimu-korteles.html"; }
  }

  /* Kortelių puslapis naujame skirtuke - bendras juostai ir moduliams be juostos (PP-plan).
     Modulio duomenys perduodami tik tam skirtukui (postMessage, ta pati kilmė): niekur neįrašomi
     ir į adresą nededami. „issaugota“ priimamas tik iš mūsų atvertų langų. */
  var laukiami = [], klausytojai = [], klausomasi = false;
  function klausyk() {
    if (klausomasi) return;
    klausomasi = true;
    global.addEventListener("message", function (e) {
      if (e.origin !== global.location.origin || !e.data || e.data.gpk !== 1) return;
      if (e.data.tipas === "pasiruoses") {
        laukiami = laukiami.filter(function (l) {
          if (l.w !== e.source) return true;
          l.w.postMessage({ gpk: 1, tipas: "pildyk", laukai: l.laukai, modulis: l.modulis }, global.location.origin);
          return false;
        });
      } else if (e.data.tipas === "issaugota" && typeof e.data.id === "string") {
        klausytojai.forEach(function (k) { if (k.w === e.source) k.fn(e.data.id); });
      }
    });
  }
  /* x: { id } - atverti kortelę keisti; { laukai, modulis } - nauja kortelė su modulio duomenimis;
     onIssaugota(id) - kviečiama, kai atvertame skirtuke kortelė išsaugoma. Grąžina langą arba null. */
  function atverkPuslapi(x) {
    x = x || {};
    klausyk();
    var url = puslapioAdresas() + (x.id ? "#kortele=" + encodeURIComponent(x.id) : "#nauja");
    var w = null;
    try { w = global.open(url, "_blank"); } catch (e) { w = null; }
    if (!w) return null;
    if (!x.id && x.laukai && Object.keys(x.laukai).length && global.location.origin !== "null")
      laukiami.push({ w: w, laukai: x.laukai, modulis: x.modulis || "" });
    if (x.onIssaugota) klausytojai.push({ w: w, fn: x.onIssaugota });
    return w;
  }

  var T = {
    lt: {
      zyme: "Pirkimo kortelė", pirkimas: "Pirkimo kortelė", be: "- nepasirinkta -",
      redaguoti: "Keisti kortelę", kurti: "Sukurti kortelę iš šių duomenų", visos: "Visos kortelės",
      naujasSkirtukas: "(atsidaro naujame skirtuke)",
      nera: "Kortelių dar nėra. Sukurkite kortelę - tada pirkimo duomenų nereikės vesti kiekviename įrankyje iš naujo.",
      pasiulymas: "Naujausia kortelė:", naudoti: "Naudoti",
      uzpildyta: "Iš kortelės užpildyta:", sutampa: "Modulio laukai sutampa su kortele.",
      skiriasi: "Skiriasi nuo kortelės (palikta, kaip įvesta):", modulyje: "modulyje", kortelejeZ: "kortelėje",
      taikyti: "Taikyti", taikytiVisas: "Taikyti visas kortelės reikšmes",
      nepritaikoma: "Šiame modulyje neįrašoma:", pavKorteles: "Pirkimų kortelės",
      atnaujinta: "Kortelė pakeista kitame lange.", nerasta: "Pasirinktos kortelės nebėra (ji ištrinta ar pakeista kitame lange).",
      blokuota: "Naršyklė neleido atverti naujo skirtuko. Leiskite iššokančius langus šiai svetainei arba atverkite „Visos kortelės“.",
      sukurta: "Kortelė sukurta ir pasirinkta.", archyvuota: "archyvuota"
    },
    en: {
      zyme: "Procurement card", pirkimas: "Procurement card", be: "- none selected -",
      redaguoti: "Edit card", kurti: "Create a card from this data", visos: "All cards",
      naujasSkirtukas: "(opens in a new tab)",
      nera: "There are no cards yet. Create a card so procurement data does not have to be typed into every tool again.",
      pasiulymas: "Latest card:", naudoti: "Use",
      uzpildyta: "Filled in from the card:", sutampa: "The module fields match the card.",
      skiriasi: "Different from the card (kept as entered):", modulyje: "here", kortelejeZ: "on the card",
      taikyti: "Apply", taikytiVisas: "Apply all card values",
      nepritaikoma: "Not used in this module:", pavKorteles: "Procurement cards",
      atnaujinta: "The card was changed in another window.", nerasta: "The selected card no longer exists (deleted or changed in another window).",
      blokuota: "The browser did not allow a new tab. Allow pop-ups for this site or open “All cards”.",
      sukurta: "Card created and selected.", archyvuota: "archived"
    }
  };
  function t(k) { var l = kalba(); return (T[l] && T[l][k]) || T.lt[k] || k; }

  var STILIUS_ID = "gpk-stilius";
  function stilius() {
    if (document.getElementById(STILIUS_ID)) return;
    var css = [
      ".gpk{margin:0 0 16px;box-sizing:border-box;font-family:var(--font-base,inherit);color:var(--color-graphite,#2E3641)}",
      ".gpk--laisva{max-width:var(--container-max,1200px);margin:12px auto 0;padding:0 16px}",
      ".gpk *{box-sizing:border-box}",
      ".gpk-eil{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;padding:8px 12px;background:var(--color-white,#fff);",
      "border:1px solid var(--color-graphite-15,#E1E2E4);border-left:4px solid var(--color-emerald,#00A072);border-radius:8px;font-size:14px;line-height:1.45}",
      ".gpk-ik{display:inline-flex;color:var(--color-emerald-strong,#007554)}",
      ".gpk-et{font-weight:800;font-size:13px;white-space:nowrap}",
      ".gpk-sel{font:inherit;font-size:14px;min-width:0;max-width:100%;flex:0 1 340px;padding:5px 8px;border:1px solid var(--color-graphite-30,#C7CDD3);border-radius:6px;background:#fff;color:inherit}",
      ".gpk-sel:focus-visible,.gpk-btn:focus-visible,.gpk-a:focus-visible{outline:2px solid var(--color-emerald-strong,#007554);outline-offset:2px}",
      ".gpk-sant{flex:1 1 220px;min-width:0;color:#5B6470;font-size:13px;overflow-wrap:anywhere}",
      ".gpk-sant:empty{display:none}",
      ".gpk-mygt{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center}",
      ".gpk-btn{font:inherit;font-size:13px;font-weight:700;cursor:pointer;border-radius:999px;padding:4px 12px;background:#fff;",
      "color:var(--color-graphite,#2E3641);border:1px solid var(--color-graphite-30,#C7CDD3);white-space:nowrap}",
      ".gpk-btn:hover{border-color:var(--color-graphite-50,#737483)}",
      ".gpk-btn--pagr{background:var(--color-emerald-strong,#007554);border-color:var(--color-emerald-strong,#007554);color:#fff}",
      ".gpk-btn--pagr:hover{background:var(--color-emerald-strong-hover,#006649)}",
      ".gpk-a{font-size:13px;font-weight:700;color:var(--color-emerald-strong,#007554);text-decoration:underline;text-underline-offset:2px;white-space:nowrap}",
      ".gpk-zin:empty{display:none}",
      ".gpk-zin{margin-top:6px;padding:8px 12px;border:1px solid var(--color-graphite-15,#E1E2E4);border-radius:8px;background:var(--color-graphite-5,#EFF1F1);font-size:13px;line-height:1.5}",
      ".gpk-zin--ok{background:var(--color-green-5,#EFF9F1);border-color:var(--color-green-15,#D7EEDB)}",
      ".gpk-zin--isp{background:var(--color-warning-5,#FEF6E8);border-color:#F3D9A8}",
      ".gpk-zin p{margin:0 0 4px}.gpk-zin p:last-child{margin-bottom:0}",
      ".gpk-sk{list-style:none;margin:4px 0 6px;padding:0;display:grid;gap:4px}",
      ".gpk-sk li{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}",
      ".gpk-sk b{font-weight:800}",
      ".gpk-past{color:#5B6470}",
      "@media (max-width:640px){.gpk-sel{flex:1 1 100%}.gpk-sant{flex-basis:100%}}",
      "@media print{.gpk{display:none!important}}"
    ].join("");
    var el = document.createElement("style");
    el.id = STILIUS_ID; el.textContent = css;
    document.head.appendChild(el);
  }

  function elementas(b) {
    if (!b.el) return null;
    return typeof b.el === "function" ? b.el() : document.querySelector(b.el);
  }
  function modulioReiksme(b) {
    if (b.gauk) return b.gauk();
    var e = elementas(b);
    return e ? e.value : undefined;
  }
  function ivykiai(e) {
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function dekModulio(b, v, k) {
    if (b.dek) { b.dek(v, k); return; }
    var e = elementas(b);
    if (!e) return;
    e.value = v;
    ivykiai(e);
  }
  /* „Nenurodyta“: null, undefined, "". Tuščias dalių sąrašas [] reiškia „neskaidomas“ - tai reikšmė. */
  function tusciaReiksme(v) { return v === null || v === undefined || v === ""; }
  function vienoda(laukas, a, b) {
    if (tusciaReiksme(a) && tusciaReiksme(b)) return true;
    if (laukas === "verte") return a > 0 && b > 0 && Math.abs(a - b) < 0.005;
    if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
    return String(a).trim().replace(/\s+/g, " ").toLowerCase() === String(b).trim().replace(/\s+/g, " ").toLowerCase();
  }

  /* Vieta: paduota - jos viduje; kitaip - modulio turinio pradžioje, prieš informacinę skiltį
     (#infoPanelMount yra visuose moduliuose, tad juosta lygiuojasi su turiniu); jei jos nėra - po
     antrašte ir skirtukais. */
  /* Ar modulio reikšmė sutampa su kortelės? Modulis gali duoti savo lyginimą (lygu), kai jo lauko
     forma kita (pvz. PP-qual trukmė tekstu „24 mėn. + 12 mėn. opcija“, kortelėje - 36). */
  function sutampa(b, dab, kv, k) {
    if (b.lygu) return !!b.lygu(dab, kv, k);
    if (b.is) return vienoda(b.kortele, b.is(dab), kv);
    if (b.i) { var i = b.i(kv, k); return i !== null && i !== undefined && vienoda(b.kortele, dab, i); }   // tik viena kryptis - lyginama modulio forma
    return vienoda(b.kortele, dab, kv);
  }

  function idek(el, vieta) {
    var v = typeof vieta === "string" ? document.querySelector(vieta) : vieta;
    if (v) { v.appendChild(el); return; }
    var info = document.getElementById("infoPanelMount");
    if (info && info.parentNode) { info.parentNode.insertBefore(el, info); return; }
    el.classList.add("gpk--laisva");
    var po = document.querySelector(".app-header");
    var sek = po && po.nextElementSibling;
    if (sek && sek.matches && sek.matches(".tabbar,.app-tabs,nav[role=tablist]")) po = sek;
    if (po && po.nextElementSibling && po.nextElementSibling.id === "gpb-juostos") po = po.nextElementSibling;
    if (po && po.parentNode) po.parentNode.insertBefore(el, po.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
  }

  function mount(o) {
    o = o || {};
    stilius();
    var laukai = o.laukai || [];
    var ctx = { sar: { busena: "nera", korteles: [] }, kortele: null, pr: null };

    var el = document.createElement("section");
    el.className = "gpk";
    el.id = "gpk";
    el.setAttribute("data-darbas-ne", "");        // kortelės pasirinkimas - ne darbas, kurį galima prarasti
    el.innerHTML = '<div class="gpk-eil"><span class="gpk-ik" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/></svg></span>' +
      '<label class="gpk-et" for="gpk-sel"></label><select id="gpk-sel" class="gpk-sel"></select>' +
      '<span class="gpk-sant" id="gpk-sant"></span><span class="gpk-mygt"></span></div>' +
      '<div class="gpk-zin" id="gpk-zin" role="status" aria-live="polite"></div>';
    idek(el, o.vieta);
    var sel = el.querySelector("#gpk-sel");

    function nuoroda(tekstas, fn, pagr) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "gpk-btn" + (pagr ? " gpk-btn--pagr" : "");
      b.textContent = tekstas;
      b.addEventListener("click", fn);
      return b;
    }

    function skaitykSarasa() { ctx.sar = aktyvios(); }

    function piesk() {
      el.setAttribute("aria-label", t("zyme"));
      el.querySelector(".gpk-et").textContent = t("pirkimas");
      var s = ctx.sar;
      sel.innerHTML = "";
      var tus = document.createElement("option"); tus.value = ""; tus.textContent = t("be"); sel.appendChild(tus);
      var sarase = false;
      s.korteles.forEach(function (k) {
        var op = document.createElement("option");
        op.value = k.id;
        op.textContent = (k.pavadinimas || "?").slice(0, 90) + (k.numeris ? " · " + k.numeris : "");
        if (ctx.kortele && ctx.kortele.id === k.id) sarase = true;
        sel.appendChild(op);
      });
      if (ctx.kortele && !sarase) {           // archyvuota, bet pasirinkta - rodoma, kad nedingtų iš akių
        var a = document.createElement("option");
        a.value = ctx.kortele.id;
        a.textContent = (ctx.kortele.pavadinimas || "?").slice(0, 90) + " (" + t("archyvuota") + ")";
        sel.appendChild(a);
      }
      sel.value = ctx.kortele ? ctx.kortele.id : "";
      var neperskaitoma = s.busena === "sugadinta" || s.busena === "neprieinama";
      sel.disabled = neperskaitoma;
      el.querySelector("#gpk-sant").textContent = ctx.kortele ? santrauka(ctx.kortele) : "";

      var m = el.querySelector(".gpk-mygt");
      m.innerHTML = "";
      if (!neperskaitoma) {
        if (ctx.kortele) m.appendChild(nuoroda(t("redaguoti"), function () { atverk({ id: ctx.kortele.id }); }));
        else m.appendChild(nuoroda(t("kurti"), kurtiIsModulio, !s.korteles.length));
      }
      var a2 = document.createElement("a");
      a2.className = "gpk-a"; a2.href = puslapioAdresas(); a2.target = "_blank"; a2.rel = "noopener";
      a2.textContent = t("visos");
      a2.setAttribute("aria-label", t("visos") + " " + t("naujasSkirtukas"));
      m.appendChild(a2);
      zinute();
    }

    function zinute() {
      var z = el.querySelector("#gpk-zin");
      z.className = "gpk-zin";
      z.innerHTML = "";
      var s = ctx.sar;
      var p = function (tekstas) { var x = document.createElement("p"); x.textContent = tekstas; z.appendChild(x); return x; };
      if (s.busena === "sugadinta" || s.busena === "neprieinama") {
        z.classList.add("gpk-zin--isp");
        p(global.GP_SAUGYKLA ? global.GP_SAUGYKLA.pranesimas(s.r, t("pavKorteles")) : t("nerasta"));
        return;
      }
      if (ctx.info) { p(ctx.info); }
      if (!ctx.kortele) {
        if (!s.korteles.length) { if (!ctx.info) p(t("nera")); return; }
        var n = s.korteles[0];
        var x = p(t("pasiulymas") + " „" + n.pavadinimas + "“ ");
        x.appendChild(nuoroda(t("naudoti"), function () { pasirink(n.id, { pildyti: true }); }));
        return;
      }
      var pr = ctx.pr;
      if (!pr) return;
      if (pr.uzpildyta.length) {
        z.classList.add("gpk-zin--ok");
        p(t("uzpildyta") + " " + pr.uzpildyta.map(function (b) { return mazaja(laukoPav(b.kortele)); }).join(", ") + ".");
      }
      if (pr.skiriasi.length) {
        z.className = "gpk-zin gpk-zin--isp";
        p(t("skiriasi"));
        var ul = document.createElement("ul"); ul.className = "gpk-sk";
        pr.skiriasi.forEach(function (b) {
          var li = document.createElement("li");
          var v = document.createElement("span");
          var zalia = modulioReiksme(b), dabar = b.is ? b.is(zalia) : zalia;
          v.innerHTML = "<b></b> ";
          v.querySelector("b").textContent = laukoPav(b.kortele) + ":";
          v.appendChild(document.createTextNode(t("modulyje") + " „" + ((dabar !== undefined && dabar !== null && reiksmesTekstas(b.kortele, dabar)) || zalia) + "“, " +
            t("kortelejeZ") + " „" + reiksmesTekstas(b.kortele, ctx.kortele[b.kortele]) + "“"));
          li.appendChild(v);
          var btn = nuoroda(t("taikyti"), function () { taikykViena(b); });
          btn.setAttribute("aria-label", t("taikyti") + ": " + laukoPav(b.kortele));
          li.appendChild(btn);
          if (b.pastaba) { var ps = document.createElement("span"); ps.className = "gpk-past"; ps.textContent = b.pastaba; li.appendChild(ps); }
          ul.appendChild(li);
        });
        z.appendChild(ul);
        if (pr.skiriasi.length > 1) z.appendChild(nuoroda(t("taikytiVisas"), function () { taikykViena(null); }));
      } else if (!pr.uzpildyta.length && !ctx.info) {
        z.classList.add("gpk-zin--ok");
        p(t("sutampa"));
      }
      if (pr.nepritaikoma.length) {
        p(t("nepritaikoma") + " " + pr.nepritaikoma.map(function (b) { return mazaja(laukoPav(b.kortele)) + " („" + reiksmesTekstas(b.kortele, ctx.kortele[b.kortele]) + "“)"; }).join(", ") + ".")
          .className = "gpk-past";
      }
    }

    /* Kortelės reikšmės į modulį: tušti (ar tik numatytieji) laukai užpildomi, skirtingi - tik parodomi. */
    function taikyk(k, perrasyti) {
      var r = { uzpildyta: [], skiriasi: [], nepritaikoma: [] };
      laukai.forEach(function (b) {
        var kv = k[b.kortele];
        if (tusciaReiksme(kv)) return;
        var i = b.i ? b.i(kv, k) : kv;
        if (i === null || i === undefined) { r.nepritaikoma.push(b); return; }
        var dab = modulioReiksme(b);
        if (dab === undefined) return;                       // laukas šiame vaizde nerodomas ir būsenos nėra
        var tuscias = dab === "" || dab === null || (b.numatyta && b.numatyta(k));
        if (tuscias || perrasyti) {
          if (!sutampa(b, dab, kv, k)) { dekModulio(b, i, k); r.uzpildyta.push(b); }
        } else if (!sutampa(b, dab, kv, k)) r.skiriasi.push(b);
      });
      if (r.uzpildyta.length && o.poTaikymo) o.poTaikymo(r.uzpildyta.map(function (b) { return b.kortele; }));
      return r;
    }
    function skirtumai() {
      if (!ctx.kortele) return;
      var k = ctx.kortele, r = { uzpildyta: ctx.pr ? ctx.pr.uzpildyta : [], skiriasi: [], nepritaikoma: [] };
      laukai.forEach(function (b) {
        var kv = k[b.kortele];
        if (tusciaReiksme(kv)) return;
        var i = b.i ? b.i(kv, k) : kv;
        if (i === null || i === undefined) { r.nepritaikoma.push(b); return; }
        var dab = modulioReiksme(b);
        if (dab === undefined || dab === "" || dab === null || (b.numatyta && b.numatyta(k))) return;
        if (!sutampa(b, dab, kv, k)) r.skiriasi.push(b);
      });
      ctx.pr = r;
    }
    function taikykViena(b) {
      var k = ctx.kortele;
      if (!k) return;
      var rinkinys = b ? [b] : ctx.pr.skiriasi.slice();
      rinkinys.forEach(function (x) { var i = x.i ? x.i(k[x.kortele], k) : k[x.kortele]; if (i !== null && i !== undefined) dekModulio(x, i, k); });
      if (o.poTaikymo) o.poTaikymo(rinkinys.map(function (x) { return x.kortele; }));
      ctx.info = "";
      skirtumai();
      ctx.pr.uzpildyta = (ctx.pr.uzpildyta || []).concat(rinkinys.filter(function (x) { return ctx.pr.uzpildyta.indexOf(x) < 0; }));
      zinute();
      /* Paspaustas mygtukas dingo - fokusas lieka juostoje (kitas „Taikyti“ arba pasirinkimas). */
      var kitas = el.querySelector(".gpk-sk button");
      (kitas || sel).focus();
    }

    function pasirink(id, x) {
      x = x || {};
      var k = null;
      ctx.sar.korteles.forEach(function (y) { if (y.id === id) k = y; });
      if (!k) k = gauk(id);
      if (!k) { ctx.kortele = null; ctx.pr = null; ctx.info = t("nerasta"); piesk(); return Promise.resolve(false); }
      return Promise.resolve(o.pries ? o.pries(k, ctx.kortele) : true).then(function (gerai) {
        if (gerai === false) { piesk(); return false; }
        ctx.kortele = k;
        ctx.info = x.info || "";
        ctx.pr = x.pildyti === false ? null : taikyk(k, false);
        if (!ctx.pr) skirtumai();
        piesk();
        if (o.onPasirinkta) o.onPasirinkta(k, ctx.pr);
        return true;
      });
    }
    function atsiek() {
      ctx.kortele = null; ctx.pr = null; ctx.info = "";
      piesk();
      if (o.onPasirinkta) o.onPasirinkta(null, null);
    }

    sel.addEventListener("change", function () {
      if (!sel.value) atsiek();
      else pasirink(sel.value, { pildyti: true });
    });

    /* Modulio laukų pokyčiai - skirtumai perskaičiuojami (be jokio taikymo). */
    var laikas = null;
    function perskaiciuok() {
      clearTimeout(laikas);
      laikas = setTimeout(function () { if (ctx.kortele) { ctx.info = ""; skirtumai(); zinute(); } }, 250);
    }
    document.addEventListener("change", function (e) { if (!el.contains(e.target)) perskaiciuok(); }, true);
    document.addEventListener("input", function (e) { if (!el.contains(e.target)) perskaiciuok(); }, true);

    /* Kortelės puslapis naujame skirtuke (atverkPuslapi): išsaugojus ten - kortelė pasirenkama čia. */
    function issaugotaKitur(id) {
      skaitykSarasa();
      var buvo = ctx.kortele && ctx.kortele.id;
      if (buvo === id) { ctx.kortele = gauk(buvo); ctx.info = ""; skirtumai(); piesk(); }
      else pasirink(id, { pildyti: true, info: t("sukurta") });
    }
    function atverk(x) {
      var w = atverkPuslapi({ id: x.id, laukai: x.laukai, modulis: o.modulis || "", onIssaugota: issaugotaKitur });
      if (!w) { ctx.info = t("blokuota"); zinute(); }
    }
    function kurtiIsModulio() {
      var duom = {};
      laukai.forEach(function (b) {
        var dab = modulioReiksme(b);
        if (dab === undefined || dab === "" || dab === null || (b.numatyta && b.numatyta())) return;
        var v = b.is ? b.is(dab) : dab;
        if (v !== undefined && v !== null && v !== "") duom[b.kortele] = v;
      });
      atverk({ laukai: duom });
    }
    /* Kitame lange pakeistos kortelės: sąrašas atnaujinamas, pasirinkta - neperrašoma. */
    global.addEventListener("storage", function (e) {
      if (e.key !== RAKTAS) return;
      atnaujink(true);
    });
    function atnaujink(isKitoLango) {
      skaitykSarasa();
      if (ctx.kortele) {
        var nauja = gauk(ctx.kortele.id);
        if (!nauja) { ctx.kortele = null; ctx.pr = null; ctx.info = t("nerasta"); }
        else {
          if (isKitoLango && nauja.atnaujinta !== ctx.kortele.atnaujinta) ctx.info = t("atnaujinta");
          ctx.kortele = nauja; skirtumai();
        }
      }
      piesk();
    }

    skaitykSarasa();
    piesk();
    var is = null;
    try { is = new URLSearchParams(global.location.search).get("kortele"); } catch (e) { is = null; }
    if (is) pasirink(is, { pildyti: true });

    /* Kalba: dvikalbiuose moduliuose juosta persijungia kartu su <html lang>. */
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(piesk).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }

    return {
      el: el,
      pasirinkta: function () { return ctx.kortele; },
      pasirink: pasirink,
      atsiek: atsiek,
      atnaujink: function () { atnaujink(false); },
      skirtumai: function () { skirtumai(); zinute(); return ctx.pr; }
    };
  }

  global.GP_KORTELE = {
    SCHEMA: SCHEMA, RAKTAS: RAKTAS,
    OBJEKTAI: OBJEKTAI, BUSENOS: BUSENOS, REZIMAI: REZIMAI, LAUKAI: LAUKAI,
    vykdytojai: vykdytojai, vykdytojas: vykdytojas,
    tuscia: tuscia, normalizuok: normalizuok, sandara: sandara,
    skaityk: skaityk, aktyvios: aktyvios, gauk: gauk, issaugok: issaugok, archyvuok: archyvuok,
    naudokSaugykla: naudokSaugykla,
    tikrink: tikrink, pastabos: pastabos,
    santrauka: santrauka, formatas: formatas, budoPav: budoPav, laukoPav: laukoPav, mazaja: mazaja, reiksmesTekstas: reiksmesTekstas,
    objektoPav: function (id, l) { return pav(OBJEKTAI, id, l); },
    busenosPav: function (id, l) { return pav(BUSENOS, id, l); },
    puslapioAdresas: puslapioAdresas, atverkPuslapi: atverkPuslapi,
    mount: mount
  };
})(typeof window !== "undefined" ? window : this);
