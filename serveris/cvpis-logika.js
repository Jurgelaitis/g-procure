/* ============================================================================
 * G-Procure CVP IS duomenų paslauga - gryna logika (be įvesties ir išvesties).
 *
 * Paskirtis (2026-10-18, naudotojo sprendimas - VPT API per Hetzner serverį, aukštas saugumo lygis):
 * VPT CVP IS API (POST /epps-integration/api/cft-details-export, antraštė apiKey) neturi paieškos pagal
 * pirkimo numerį ir nepriima naršyklės užklausų (nėra CORS). Viešas OpenAPI aprašas
 * (/epps-integration/v3/api-docs) leidžia tik puslapiavimą pageSize / pageNum, todėl serveris
 * periodiškai parsisiunčia visą sąrašą (2026-10-18 - apie 80 400 įrašų, iki 5 000 per puslapį) ir
 * atsako iš savo kopijos. Saugomi TIK vieši pirkimų duomenys - jokių naudotojų duomenų.
 *
 * Šis failas neturi priklausomybių ir veikia ir Node (serveris), ir naršyklėje (testai -
 * serveris/testai.html). Įvestis ir išvestis (tinklas, failai, HTTP) - cvpis-serveris.js.
 *
 * Saugumo principai (README.md):
 *  - VPT atsakymas - nepatikimi duomenys: tik išvardyti laukai, tipai ir ilgio ribos, valdymo
 *    simboliai šalinami, TED nuorodos - tik https://ted.europa.eu/, datos - tik galiojančios.
 *  - Užklausos: tik GET / HEAD / OPTIONS, griežti keliai ir parametrai; įvestis atsakyme
 *    neatkartojama (tik patikrintas numeris).
 *  - Nepavykęs ar dar neįkeltas sąrašas NIEKADA nerodomas kaip „pirkimo nėra“ (503, ne 404).
 * ============================================================================ */
(function (saknis, fabrikas) {
  if (typeof module === "object" && module.exports) module.exports = fabrikas();
  else saknis.GP_CVPIS_API = fabrikas();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSIJA = "2026-10-29";
  // Kilmės, kurioms grąžinama CORS antraštė (kaip /api/analyze): svetainė ir vietinis tikrinimas.
  var KILMES = ["https://g-procure.com", "https://www.g-procure.com"];
  var VIETINE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
  var CVP_IS_NUORODA = "https://viesiejipirkimai.lt/epps/cft/prepareViewCfTWS.do?resourceId=";

  // ---------------------------------------------------------------------------
  // Laukai: vardas -> [tipas, didžiausias ilgis]. Kitų VPT laukų neperduodame.
  // ---------------------------------------------------------------------------
  var TEKSTAI = {
    title: 500, caName: 300, procedure: 100, status: 60, evaluationMechanism: 100, description: 2000,
    procurementType: 40, directive: 60, cftInvolves: 80, contractDuration: 120, tenderValidity: 120,
    publicationLanguage: 20, planReference: 200, cftCaUniqueId: 200, awardPerItem: 40
  };
  var DATOS = ["datePublished", "tenderSubmissionDeadline", "awardDate", "dispatchingInvitationDeadline",
    "clarificationPeriodEnd", "tendersOpeningDate", "contractAwardDate", "dateAcceptedByContractor"];
  var LOGINIAI = ["inclusionEAuctions", "aboveThreshold", "uploadClarification", "onlineInterestAllowed",
    "contractAwardedInLots", "euFunding", "multipleTenders"];

  // Valdymo simboliai (išskyrus eilutės lūžį ir tabuliaciją), nematomi krypties ženklai ir BOM.
  var VALDYMO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g;

  function tekstas(v, max) {
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return null;
    var s = v.replace(/\r\n?/g, "\n").replace(VALDYMO, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!s) return null;
    // Kerpama iki max ženklų su daugtaškiu - kad pakartotinis tikrinimas (disko kopija) teksto nebekeistų
    if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
    return s;
  }

  // VPT data „dd-mm-yyyy hh:mm:ss“ -> „yyyy-mm-ddThh:mm:ss“ (laiko juosta API nenurodyta - README).
  // Priimama ir jau perrašyta „yyyy-mm-ddThh:mm:ss“ - disko kopija tikrinama ta pačia funkcija (2026-10-18: be to
  // perkrovus paslaugą datos dingdavo).
  function data(v) {
    if (typeof v !== "string") return null;
    var s = v.trim(), m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
    if (m) m = [m[0], m[1], m[2], m[3], m[4], m[5], m[6]];
    else {
      var iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(s);
      if (!iso) return null;
      m = [iso[0], iso[3], iso[2], iso[1], iso[4], iso[5], iso[6]];
    }
    var d = +m[1], men = +m[2], met = +m[3], h = +m[4], min = +m[5], sek = +m[6];
    if (met < 2000 || met > 2100 || men < 1 || men > 12 || h > 23 || min > 59 || sek > 59) return null;
    var dienu = new Date(Date.UTC(met, men, 0)).getUTCDate();
    if (d < 1 || d > dienu) return null;
    return m[3] + "-" + m[2] + "-" + m[1] + "T" + m[4] + ":" + m[5] + ":" + m[6];
  }

  function loginis(v) { return v === true ? true : v === false ? false : null; }

  function sveikas(v, min, max) {
    var n = typeof v === "number" ? v : (typeof v === "string" && /^\d{1,12}$/.test(v.trim()) ? +v.trim() : NaN);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  }

  // Numatoma vertė VPT - tekstas („180000“, kartais su trupmena).
  function verte(v) {
    if (typeof v === "number") return isFinite(v) && v >= 0 && v < 1e12 ? v : null;
    if (typeof v !== "string") return null;
    var s = v.trim();
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) return null;
    return +s;
  }

  function bvpz(v) {
    if (Array.isArray(v)) v = v.filter(function (x) { return typeof x === "string"; }).join(" ");
    if (typeof v !== "string") return [];
    var kodai = v.match(/\d{8}(-\d)?/g) || [];
    var out = [];
    kodai.forEach(function (k) { if (out.indexOf(k) < 0 && out.length < 30) out.push(k); });
    return out;
  }

  function nuts(v) {
    if (Array.isArray(v)) v = v.filter(function (x) { return typeof x === "string"; }).join(" ");
    if (typeof v !== "string") return [];
    var out = [];
    (v.toUpperCase().match(/[A-Z]{2}[A-Z0-9]{0,3}/g) || []).forEach(function (k) {
      if (out.indexOf(k) < 0 && out.length < 20) out.push(k);
    });
    return out;
  }

  // TED nuorodos - tik https://ted.europa.eu/ (kitaip per mūsų atsakymą galėtų ateiti javascript: ar svetimas adresas).
  var TED = /^https:\/\/ted\.europa\.eu\/[A-Za-z0-9\-._~\/?=&%#:+]{1,300}$/;
  function tedNuorodos(v) {
    if (!Array.isArray(v)) return [];
    var out = [];
    v.forEach(function (x) { if (typeof x === "string" && TED.test(x.trim()) && out.length < 10) out.push(x.trim()); });
    return out;
  }

  function normalizuokIrasa(r) {
    if (!r || typeof r !== "object" || Array.isArray(r)) return null;
    var id = sveikas(r.id, 1, 999999999);
    if (id === null) return null;
    var o = { id: id };
    Object.keys(TEKSTAI).forEach(function (k) { o[k] = tekstas(r[k], TEKSTAI[k]); });
    o.caNumber = typeof r.caNumber === "string" && /^\d{5,15}$/.test(r.caNumber.trim()) ? r.caNumber.trim() : null;
    DATOS.forEach(function (k) { o[k] = data(r[k]); });
    LOGINIAI.forEach(function (k) { o[k] = loginis(r[k]); });
    o.estimatedValue = verte(r.estimatedValue);
    o.activeCycle = sveikas(r.activeCycle, 0, 1000);
    o.numberOfOpeners = sveikas(r.numberOfOpeners, 0, 1000);
    o.cpvCodes = bvpz(r.cpvCodes);
    o.nutsCode = nuts(r.nutsCode);
    o.tedLink = tedNuorodos(r.tedLink);
    return o;
  }

  // Vienas API puslapis: turi būti JSON masyvas iš objektų. Netinkami įrašai praleidžiami ir suskaičiuojami.
  function tikrinkPuslapi(json) {
    if (!Array.isArray(json)) throw new Error("VPT atsakymas - ne sąrašas");
    var irasai = [], atmesta = 0;
    for (var i = 0; i < json.length; i++) {
      var o = normalizuokIrasa(json[i]);
      if (o) irasai.push(o); else atmesta++;
    }
    return { irasai: irasai, atmesta: atmesta };
  }

  // Naujas sąrašas priimamas tik jei nėra mažesnis už ankstesnį daugiau nei 20 % ir turi bent 1 000 įrašų
  // (kitaip - VPT klaida ar nepilnas atsakymas; paliekama ankstesnė kopija).
  function priimtinasKiekis(naujas, senas) {
    if (!(naujas >= 1000)) return false;
    if (senas > 0 && naujas < senas * 0.8) return false;
    return true;
  }

  // Paieškai: mažosios raidės be diakritikų, tik raidės ir skaitmenys.
  function paieskosTekstas(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  /* Indeksas: pagalId - pirkimas pagal numerį; paieska - [id, tekstas (pavadinimas, vykdytojas, numeris), vykdytojas], surikiuota
     nuo naujausio paskelbimo (paieškos ir statistikos rezultatai jau tvarkingi); kesas - statistikos atsakymai (išvalomi su nauju sąrašu). */
  function sukurkIndeksa(irasai, atnaujinta) {
    var pagalId = new Map(), paieska = [];
    irasai.forEach(function (o) {
      if (!o || pagalId.has(o.id)) return;
      pagalId.set(o.id, o);
      paieska.push([o.id, " " + paieskosTekstas((o.title || "") + " " + (o.caName || "") + " " + o.id) + " ", " " + paieskosTekstas(o.caName || "") + " "]);
    });
    paieska.sort(function (a, b) {
      var x = pagalId.get(a[0]), y = pagalId.get(b[0]);
      return String(y.datePublished || "").localeCompare(String(x.datePublished || "")) || y.id - x.id;
    });
    return { pagalId: pagalId, paieska: paieska, kiekis: pagalId.size, atnaujinta: atnaujinta || null, kesas: new Map() };
  }

  /* Dabartinis Lietuvos laikas „yyyy-mm-ddThh:mm:ss“ - VPT datos be laiko juostos yra Lietuvos laikas (README). */
  function dabarLT(d) {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d || new Date())
      .forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute + ":" + p.second;
  }

  /* ---------------------------------------------------------------------------
     Paieškos ir statistikos filtrai (2026-10-18b). Visi neprivalomi, bet bent vienas būtinas; netinkamas - 400 su parametro
     pavadinimu (įvestis neatkartojama).
       q          - žodžiai pavadinime, vykdytojo pavadinime ar numeryje (3-100 ženklų, iki 8 žodžių, visi)
       vykdytojas - žodžiai pirkimo vykdytojo pavadinime (3-100 ženklų)
       ca         - pirkimo vykdytojo kodas (5-15 skaitmenų; VPT duomenyse jo dažnai nėra - tada vykdytojas)
       cpv        - BVPŽ kodo pradžia, 2-8 skaitmenys, iki 5 kodų per kablelį (bet kuris pirkimo kodas)
       tipas      - Supplies / Services / Works
       budas      - VPT procedūros pavadinimas („Open“, „Simplified Open“ ...), būsena - VPT būsena arba „aktyvus“
                    (pasiūlymų terminas dar nepraėjęs ir pirkimas nenutrauktas)
       nuo, iki   - paskelbimo data yyyy-mm-dd (imtinai)
       rikiuoti   - naujausi (numatyta) / terminas (artimiausias terminas pirmas, be termino - gale)
       psl        - puslapis 1-50 (po 20; tik paieškai)
   --------------------------------------------------------------------------- */
  var TIPAI = { Supplies: 1, Services: 1, Works: 1 };
  var KODAS_VPT = /^[A-Za-z][A-Za-z ]{2,59}$/;
  var PSL_DYDIS = 20, PSL_MAX = 50;
  function galiojantiData(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split("-").map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return p[0] >= 2000 && p[0] <= 2100 && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }
  function zodziai(s, ilgiausias) {
    if (typeof s !== "string" || s.length > (ilgiausias || 100)) return null;
    var n = paieskosTekstas(s);
    return n.length >= 3 ? n.split(" ").filter(Boolean).slice(0, 8) : null;
  }
  function filtrai(sp) {
    var f = {}, yra = false, v;
    var gauk = function (k) { var x = sp.get(k); return x === null ? null : String(x); };
    if ((v = gauk("q")) !== null) { if (!(f.q = zodziai(v))) return { klaida: "q" }; yra = true; }
    if ((v = gauk("vykdytojas")) !== null) { if (!(f.vykdytojas = zodziai(v))) return { klaida: "vykdytojas" }; yra = true; }
    if ((v = gauk("ca")) !== null) { if (!/^\d{5,15}$/.test(v)) return { klaida: "ca" }; f.ca = v; yra = true; }
    if ((v = gauk("cpv")) !== null) {
      var k = v.split(",").map(function (x) { return x.trim(); });
      if (!k.length || k.length > 5 || !k.every(function (x) { return /^\d{2,8}$/.test(x); })) return { klaida: "cpv" };
      f.cpv = k; yra = true;
    }
    if ((v = gauk("tipas")) !== null) { if (!TIPAI[v]) return { klaida: "tipas" }; f.tipas = v; yra = true; }
    if ((v = gauk("budas")) !== null) { if (!KODAS_VPT.test(v)) return { klaida: "budas" }; f.budas = v; yra = true; }
    if ((v = gauk("busena")) !== null) { if (!KODAS_VPT.test(v)) return { klaida: "busena" }; f.busena = v; yra = true; }
    if ((v = gauk("nuo")) !== null) { if (!galiojantiData(v)) return { klaida: "nuo" }; f.nuo = v; yra = true; }
    if ((v = gauk("iki")) !== null) { if (!galiojantiData(v)) return { klaida: "iki" }; f.iki = v; yra = true; }
    if ((v = gauk("rikiuoti")) !== null) { if (v !== "naujausi" && v !== "terminas") return { klaida: "rikiuoti" }; f.rikiuoti = v; }
    if ((v = gauk("psl")) !== null) { if (!/^\d{1,2}$/.test(v) || +v < 1 || +v > PSL_MAX) return { klaida: "psl" }; f.psl = +v; }
    if (!yra) return { klaida: "tuscia" };
    return { f: f };
  }
  function visiYra(tekstas, zodz) {
    for (var j = 0; j < zodz.length; j++) if (tekstas.indexOf(zodz[j]) < 0) return false;
    return true;
  }
  function atitinka(e, o, f, dabar) {
    if (f.q && !visiYra(e[1], f.q)) return false;
    if (f.vykdytojas && !visiYra(e[2], f.vykdytojas)) return false;
    if (f.ca && o.caNumber !== f.ca) return false;
    if (f.cpv && !o.cpvCodes.some(function (c) { return f.cpv.some(function (p) { return c.indexOf(p) === 0; }); })) return false;
    if (f.tipas && o.procurementType !== f.tipas) return false;
    if (f.budas && o.procedure !== f.budas) return false;
    if (f.busena === "aktyvus") {
      if (!o.tenderSubmissionDeadline || o.tenderSubmissionDeadline <= dabar || o.status === "Cancelled") return false;
    } else if (f.busena && o.status !== f.busena) return false;
    var pd = o.datePublished ? o.datePublished.slice(0, 10) : null;
    if (f.nuo && (!pd || pd < f.nuo)) return false;
    if (f.iki && (!pd || pd > f.iki)) return false;
    return true;
  }
  function atrinkti(ix, f, dabar) {
    var out = [];
    for (var i = 0; i < ix.paieska.length; i++) {
      var e = ix.paieska[i], o = ix.pagalId.get(e[0]);
      if (atitinka(e, o, f, dabar)) out.push(o);
    }
    return out;
  }
  var FILTRU_KLAIDOS = {
    tuscia: "Nurodykite bent vieną paieškos parametrą (q, vykdytojas, ca, cpv, tipas, budas, busena, nuo, iki).",
    q: "Paieškos tekstas (q) turi būti 3-100 ženklų (raidės ir skaitmenys).",
    vykdytojas: "Vykdytojo pavadinimas (vykdytojas) turi būti 3-100 ženklų.",
    ca: "Vykdytojo kodas (ca) - 5-15 skaitmenų.",
    cpv: "BVPŽ kodas (cpv) - 2-8 skaitmenys, iki 5 kodų per kablelį.",
    tipas: "Pirkimo objektas (tipas) - Supplies, Services arba Works.",
    budas: "Būdas (budas) - VPT procedūros pavadinimas lotyniškomis raidėmis.",
    busena: "Būsena (busena) - VPT būsena lotyniškomis raidėmis arba „aktyvus“.",
    nuo: "Data (nuo) - yyyy-mm-dd.", iki: "Data (iki) - yyyy-mm-dd.",
    rikiuoti: "Rikiavimas (rikiuoti) - naujausi arba terminas.", psl: "Puslapis (psl) - 1-50."
  };

  /* --- statistika --- */
  function dienos(a, b) {
    if (!a || !b) return null;
    var x = Date.parse(a + "Z"), y = Date.parse(b + "Z");
    if (!isFinite(x) || !isFinite(y) || y < x) return null;
    return Math.round((y - x) / 86400000 * 10) / 10;
  }
  function menesiais(s) {
    var m = /^(\d{1,4})_(days|weeks|months|years)$/.exec(String(s || ""));
    if (!m) return null;
    var n = +m[1], k = { days: 1 / 30.4375, weeks: 7 / 30.4375, months: 1, years: 12 }[m[2]];
    var r = Math.round(n * k * 10) / 10;
    return r > 0 && r <= 600 ? r : null;
  }
  // Kvantiliai - tik kai reikšmių bent 5 (kitaip mediana būtų klaidinanti)
  var MAZIAUSIAI = 5;
  function kvantiliai(v) {
    var a = v.filter(function (x) { return typeof x === "number" && isFinite(x); }).sort(function (x, y) { return x - y; });
    if (a.length < MAZIAUSIAI) return { n: a.length };
    var q = function (p) { return a[Math.round(p * (a.length - 1))]; };
    return { n: a.length, p10: q(0.1), p25: q(0.25), mediana: q(0.5), p75: q(0.75), p90: q(0.9) };
  }
  function skaiciuok(m, k) { if (k === null || k === undefined || k === "") k = "-"; m[k] = (m[k] || 0) + 1; }
  function statistika(sar, dabar) {
    var s = { viso: sar.length, pagalBuda: {}, pagalBusena: {}, pagalTipa: {}, vertinimas: {}, direktyva: {}, kalba: {},
      tarptautiniai: 0, esLesos: 0, dalimis: 0, eAukcionas: 0, nutraukta: 0, rinkosKonsultacijos: 0, aktyvus: 0,
      paskelbtaNuo: null, paskelbtaIki: null };
    var terminai = {}, sprendimas = [], sutartis = [], vertes = [], trukme = [], menesiai = {}, vykd = {};
    sar.forEach(function (o) {
      skaiciuok(s.pagalBuda, o.procedure); skaiciuok(s.pagalBusena, o.status); skaiciuok(s.pagalTipa, o.procurementType);
      skaiciuok(s.vertinimas, o.evaluationMechanism); skaiciuok(s.direktyva, o.directive); skaiciuok(s.kalba, o.publicationLanguage);
      if (o.aboveThreshold === true) s.tarptautiniai++;
      if (o.euFunding === true) s.esLesos++;
      if (o.contractAwardedInLots === true) s.dalimis++;
      if (o.inclusionEAuctions === true) s.eAukcionas++;
      if (o.status === "Cancelled") s.nutraukta++;
      if (o.procedure === "Preliminary Market Consultation") s.rinkosKonsultacijos++;
      if (o.tenderSubmissionDeadline && o.tenderSubmissionDeadline > dabar && o.status !== "Cancelled") s.aktyvus++;
      if (o.datePublished) {
        var pd = o.datePublished.slice(0, 10);
        if (!s.paskelbtaNuo || pd < s.paskelbtaNuo) s.paskelbtaNuo = pd;
        if (!s.paskelbtaIki || pd > s.paskelbtaIki) s.paskelbtaIki = pd;
        skaiciuok(menesiai, o.datePublished.slice(0, 7));
      }
      // Pasiūlymų (paraiškų) teikimo laikotarpis - nuo paskelbimo iki termino; pagal būdą ir tarptautinę vertę
      var d = dienos(o.datePublished, o.tenderSubmissionDeadline);
      if (d !== null && o.procedure) {
        var rk = o.procedure + "|" + (o.aboveThreshold === true ? "T" : o.aboveThreshold === false ? "S" : "-");
        (terminai[rk] = terminai[rk] || []).push(d);
      }
      var sp = dienos(o.tenderSubmissionDeadline, o.awardDate);
      if (sp !== null) sprendimas.push(sp);
      var su = dienos(o.tenderSubmissionDeadline, o.contractAwardDate);
      if (su !== null) sutartis.push(su);
      if (typeof o.estimatedValue === "number" && o.estimatedValue > 0) vertes.push(o.estimatedValue);
      var tr = menesiais(o.contractDuration);
      if (tr !== null) trukme.push(tr);
      if (o.caName) {
        var vk = o.caName + "|" + (o.caNumber || "");
        vykd[vk] = (vykd[vk] || 0) + 1;
      }
    });
    s.terminai = Object.keys(terminai).map(function (k) {
      var p = k.split("|"), q = kvantiliai(terminai[k]);
      q.budas = p[0]; q.tarptautinis = p[1] === "T" ? true : p[1] === "S" ? false : null;
      return q;
    }).sort(function (a, b) { return b.n - a.n; }).slice(0, 20);
    s.sprendimoDienos = kvantiliai(sprendimas);
    s.sutartiesDienos = kvantiliai(sutartis);
    s.verte = kvantiliai(vertes);
    s.trukmeMen = kvantiliai(trukme);
    s.menesiai = Object.keys(menesiai).sort().slice(-36).map(function (m) { return [m, menesiai[m]]; });
    s.vykdytojai = Object.keys(vykd).map(function (k) { var p = k.split("|"); return { pavadinimas: p[0], kodas: p[1] || null, kiekis: vykd[k] }; })
      .sort(function (a, b) { return b.kiekis - a.kiekis || a.pavadinimas.localeCompare(b.pavadinimas); }).slice(0, 10);
    return s;
  }
  function trumpas(o) {
    return { id: o.id, title: o.title, caName: o.caName, caNumber: o.caNumber, procedure: o.procedure, status: o.status,
      procurementType: o.procurementType, cpvCodes: o.cpvCodes.slice(0, 5), estimatedValue: o.estimatedValue, aboveThreshold: o.aboveThreshold,
      datePublished: o.datePublished, tenderSubmissionDeadline: o.tenderSubmissionDeadline, nuoroda: CVP_IS_NUORODA + o.id };
  }

  // ---------------------------------------------------------------------------
  // Užklausos atsakymas: { status, antrastes, kunas } - gryna funkcija.
  // ---------------------------------------------------------------------------
  function kilmesAntraste(kilme) {
    return typeof kilme === "string" && (KILMES.indexOf(kilme) >= 0 || VIETINE.test(kilme)) ? kilme : null;
  }

  function antrastes(kilme, kesuoti) {
    var h = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": kesuoti ? "public, max-age=300" : "no-store",
      "Vary": "Origin"
    };
    var k = kilmesAntraste(kilme);
    if (k) { h["Access-Control-Allow-Origin"] = k; h["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"; h["Access-Control-Max-Age"] = "600"; }
    return h;
  }

  function json(status, kunas, kilme, kesuoti) {
    return { status: status, antrastes: antrastes(kilme, kesuoti), kunas: JSON.stringify(kunas) };
  }

  function meta(ix) {
    return { saltinis: "VPT CVP IS API (cft-details-export)", atnaujinta: ix ? ix.atnaujinta : null, kiekis: ix ? ix.kiekis : 0, versija: VERSIJA };
  }

  var KLAIDOS = {
    neikelta: "CVP IS duomenys serveryje dar neįkelti arba įkelti nepavyko - pirkimo duomenų patikrinti negalima. Patikrinkite CVP IS.",
    numeris: "Pirkimo numeris turi būti 5-9 skaitmenys.",
    paieska: "Paieškos tekstas turi būti 3-100 ženklų (raidės ir skaitmenys).",
    statistika: "Statistikai nurodykite bent vieną parametrą (q, vykdytojas, ca, cpv, tipas, budas, busena, nuo, iki).",
    metodas: "Leidžiamos tik GET užklausos.",
    kelias: "Tokio adreso nėra."
  };

  // ---------------------------------------------------------------------------
  // Pirkimo dokumentų paketas (2026-10-29): GET /api/cvpis/dokumentai/<nr> - serveris parsisiunčia viešą CVP IS
  // dokumentų ZIP taip, kaip jį gauna naršyklė be prisijungimo, ir perduoda srautu naršyklei; nieko nesaugo.
  // Naršyklė to padaryti negali pati - CVP IS neleidžia kitų svetainių užklausų (nėra CORS) ir naudoja seanso slapuką.
  // Adresai - konstantos, numeris - tik skaitmenys, todėl užklausa į kitą adresą neįmanoma.
  // ---------------------------------------------------------------------------
  var DOK_BAZE = "https://viesiejipirkimai.lt/epps/cft/";
  var DOK_MAX_BAITU = 250 * 1048576;     // kaip shared/dokumentai.js archyvo riba
  var DOK_KLAIDOS = {
    prisijungimas: "Šio pirkimo dokumentai CVP IS prieinami tik prisijungus (pvz. konkretaus pirkimo pagal DPS - tik DPS dalyviams). Prisijunkite prie CVP IS, atsisiųskite dokumentus ir įkelkite juos patys.",
    nera: "CVP IS šio pirkimo dokumentų nepateikė.",
    rysys: "CVP IS dokumentų gauti nepavyko (ryšys ar CVP IS klaida). Bandykite dar kartą arba atsisiųskite dokumentus iš CVP IS patys.",
    per_didelis: "Dokumentų paketas didesnis nei 250 MB - atsisiųskite jį iš CVP IS ir įkelkite patys.",
    ne_zip: "CVP IS grąžino ne dokumentų paketą (ZIP) - atsisiųskite dokumentus iš CVP IS patys.",
    uzimta: "Šiuo metu siunčiama per daug dokumentų paketų - pabandykite po minutės.",
    kilme: "Dokumentus galima gauti tik iš G-Procure puslapio.",
    numeris: KLAIDOS.numeris,
    metodas: KLAIDOS.metodas
  };
  var DOK_STATUSAI = { prisijungimas: 403, nera: 404, rysys: 502, per_didelis: 413, ne_zip: 502, uzimta: 429, kilme: 403, numeris: 400, metodas: 405 };

  // null - ne dokumentų adresas (OPTIONS ir kiti keliai - bendram atsakymui); { id } arba { klaida }
  function dokumentuUzklausa(metodas, adresas) {
    if (typeof adresas !== "string" || adresas.length > 300) return null;
    var u;
    try { u = new URL(adresas, "http://vietinis"); } catch (e) { return null; }
    var m = /^\/api\/cvpis\/dokumentai\/([^/]{1,20})$/.exec(u.pathname);
    if (!m) return null;
    metodas = String(metodas || "").toUpperCase();
    if (metodas === "OPTIONS") return null;
    if (metodas !== "GET") return { klaida: "metodas" };
    if (!/^\d{5,9}$/.test(m[1])) return { klaida: "numeris" };
    return { id: +m[1] };
  }
  function dokumentuAdresai(id) {
    var n = String(Math.floor(Math.abs(+id)));
    return {
      perziura: DOK_BAZE + "prepareViewCfTWS.do?resourceId=" + n,
      paruosimas: DOK_BAZE + "prepareAnonymousDownload.do?resourceId=" + n + "&isContract=null",
      atsisiuntimas: DOK_BAZE + "downloadCftResourceItems.do?resourceId=" + n + "&resourceType=ContractDocument&isContract=null"
    };
  }
  // CVP IS peradresavimas: į prisijungimą (CAS) - dokumentai ne vieši; kitur - dokumentų nėra
  function peradresavimoRusis(vieta) {
    return /\/cas\/login|\/login\b|authenticate/i.test(String(vieta || "")) ? "prisijungimas" : "nera";
  }
  function arZip(b) {
    return !!b && b.length >= 4 && b[0] === 0x50 && b[1] === 0x4B && ((b[2] === 3 && b[3] === 4) || (b[2] === 5 && b[3] === 6));
  }
  function dokumentuKlaida(rusis, kilme) {
    var r = DOK_STATUSAI[rusis] ? rusis : "rysys";
    var a = json(DOK_STATUSAI[r], { klaida: DOK_KLAIDOS[r], kodas: r }, kilme, false);
    if (r === "uzimta") a.antrastes["Retry-After"] = "60";
    return a;
  }
  function dokumentuAntrastes(id, kilme, ilgis) {
    var h = {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="cvpis-' + String(Math.floor(Math.abs(+id))) + '.zip"',
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    };
    var k = kilmesAntraste(kilme);
    if (k) { h["Access-Control-Allow-Origin"] = k; h["Access-Control-Expose-Headers"] = "Content-Length"; }
    if (typeof ilgis === "number" && isFinite(ilgis) && ilgis >= 0) h["Content-Length"] = String(Math.floor(ilgis));
    return h;
  }

  function atsakymas(ix, metodas, adresas, kilme, busena, dabar) {
    dabar = typeof dabar === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dabar) ? dabar : dabarLT();
    metodas = String(metodas || "").toUpperCase();
    if (metodas === "OPTIONS") return { status: 204, antrastes: antrastes(kilme, false), kunas: "" };
    if (metodas !== "GET" && metodas !== "HEAD") return json(405, { klaida: KLAIDOS.metodas }, kilme, false);
    if (typeof adresas !== "string" || adresas.length > 300) return json(404, { klaida: KLAIDOS.kelias }, kilme, false);
    var u;
    try { u = new URL(adresas, "http://vietinis"); } catch (e) { return json(404, { klaida: KLAIDOS.kelias }, kilme, false); }
    var kelias = u.pathname;

    if (kelias === "/api/cvpis/busena") {
      var b = meta(ix);
      b.busena = ix ? "veikia" : "neikelta";
      if (busena && busena.klaida) b.paskutineKlaida = { laikas: busena.klaida.laikas, rusis: busena.klaida.rusis };
      if (busena && busena.kita) b.kitasAtnaujinimas = busena.kita;
      return json(200, b, kilme, false);
    }

    var m = /^\/api\/cvpis\/pirkimas\/([^/]{1,20})$/.exec(kelias);
    if (m) {
      if (!/^\d{5,9}$/.test(m[1])) return json(400, { klaida: KLAIDOS.numeris }, kilme, false);
      if (!ix) return json(503, { klaida: KLAIDOS.neikelta }, kilme, false);
      var id = +m[1], o = ix.pagalId.get(id);
      if (!o) return json(404, { klaida: "Pirkimo Nr. " + id + " VPT API sąraše nėra (sąrašas atnaujintas " + (ix.atnaujinta || "-") + "). Jei pirkimas ką tik paskelbtas, patikrinkite CVP IS.", meta: meta(ix) }, kilme, false);
      return json(200, { pirkimas: o, nuoroda: CVP_IS_NUORODA + id, meta: meta(ix) }, kilme, true);
    }

    if (kelias === "/api/cvpis/paieska" || kelias === "/api/cvpis/statistika") {
      var st = kelias === "/api/cvpis/statistika";
      var fr = filtrai(u.searchParams);
      if (fr.klaida) return json(400, { klaida: fr.klaida === "tuscia" ? (st ? KLAIDOS.statistika : KLAIDOS.paieska) : FILTRU_KLAIDOS[fr.klaida] }, kilme, false);
      if (!ix) return json(503, { klaida: KLAIDOS.neikelta }, kilme, false);
      var f = fr.f;
      if (st) {
        // Statistika kešuojama iki naujo sąrašo; „aktyvus“ priklauso nuo laiko - raktas su valanda
        var raktas = JSON.stringify(f) + (f.busena === "aktyvus" ? "|" + dabar.slice(0, 13) : "");
        var kb = ix.kesas && ix.kesas.get(raktas);
        if (!kb) {
          kb = JSON.stringify({ statistika: statistika(atrinkti(ix, f, dabar), dabar), meta: meta(ix) });
          if (ix.kesas) { if (ix.kesas.size >= 300) ix.kesas.delete(ix.kesas.keys().next().value); ix.kesas.set(raktas, kb); }
        }
        return { status: 200, antrastes: antrastes(kilme, true), kunas: kb };
      }
      var rasti = atrinkti(ix, f, dabar);
      if (f.rikiuoti === "terminas") {
        rasti.sort(function (a, b) {
          var x = a.tenderSubmissionDeadline, y = b.tenderSubmissionDeadline;
          if (!x !== !y) return x ? -1 : 1;
          return String(x || "").localeCompare(String(y || "")) || b.id - a.id;
        });
      }
      var psl = f.psl || 1, viso = rasti.length;
      var rezultatai = rasti.slice((psl - 1) * PSL_DYDIS, psl * PSL_DYDIS).map(trumpas);
      return json(200, { rezultatai: rezultatai, viso: viso, rodoma: rezultatai.length, psl: psl, dydis: PSL_DYDIS, meta: meta(ix) }, kilme, true);
    }

    return json(404, { klaida: KLAIDOS.kelias }, kilme, false);
  }

  return {
    VERSIJA: VERSIJA, KILMES: KILMES, TEKSTAI: TEKSTAI, DATOS: DATOS, LOGINIAI: LOGINIAI, KLAIDOS: KLAIDOS,
    tekstas: tekstas, data: data, verte: verte, bvpz: bvpz, nuts: nuts, tedNuorodos: tedNuorodos,
    normalizuokIrasa: normalizuokIrasa, tikrinkPuslapi: tikrinkPuslapi, priimtinasKiekis: priimtinasKiekis,
    paieskosTekstas: paieskosTekstas, sukurkIndeksa: sukurkIndeksa, atsakymas: atsakymas, kilmesAntraste: kilmesAntraste,
    filtrai: filtrai, statistika: statistika, kvantiliai: kvantiliai, dabarLT: dabarLT, PSL_DYDIS: PSL_DYDIS,
    DOK_MAX_BAITU: DOK_MAX_BAITU, DOK_KLAIDOS: DOK_KLAIDOS, dokumentuUzklausa: dokumentuUzklausa, dokumentuAdresai: dokumentuAdresai,
    peradresavimoRusis: peradresavimoRusis, arZip: arZip, dokumentuKlaida: dokumentuKlaida, dokumentuAntrastes: dokumentuAntrastes
  };
});
