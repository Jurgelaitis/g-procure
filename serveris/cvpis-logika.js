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

  var VERSIJA = "2026-10-18";
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

  function sukurkIndeksa(irasai, atnaujinta) {
    var pagalId = new Map(), paieska = [];
    irasai.forEach(function (o) {
      if (!o || pagalId.has(o.id)) return;
      pagalId.set(o.id, o);
      paieska.push([o.id, " " + paieskosTekstas((o.title || "") + " " + (o.caName || "") + " " + o.id) + " "]);
    });
    return { pagalId: pagalId, paieska: paieska, kiekis: pagalId.size, atnaujinta: atnaujinta || null };
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
    metodas: "Leidžiamos tik GET užklausos.",
    kelias: "Tokio adreso nėra."
  };

  function atsakymas(ix, metodas, adresas, kilme, busena) {
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

    if (kelias === "/api/cvpis/paieska") {
      var q = u.searchParams.get("q");
      var norm = paieskosTekstas(q);
      if (typeof q !== "string" || q.length > 100 || norm.length < 3) return json(400, { klaida: KLAIDOS.paieska }, kilme, false);
      if (!ix) return json(503, { klaida: KLAIDOS.neikelta }, kilme, false);
      var zodziai = norm.split(" ").filter(Boolean).slice(0, 8);
      var rasti = [];
      for (var i = 0; i < ix.paieska.length; i++) {
        var t = ix.paieska[i][1], visi = true;
        for (var j = 0; j < zodziai.length; j++) if (t.indexOf(zodziai[j]) < 0) { visi = false; break; }
        if (visi) rasti.push(ix.pagalId.get(ix.paieska[i][0]));
      }
      rasti.sort(function (a, b) { return String(b.datePublished || "").localeCompare(String(a.datePublished || "")) || b.id - a.id; });
      var viso = rasti.length;
      var rezultatai = rasti.slice(0, 20).map(function (o) {
        return { id: o.id, title: o.title, caName: o.caName, procedure: o.procedure, status: o.status,
          datePublished: o.datePublished, tenderSubmissionDeadline: o.tenderSubmissionDeadline, nuoroda: CVP_IS_NUORODA + o.id };
      });
      return json(200, { rezultatai: rezultatai, viso: viso, rodoma: rezultatai.length, meta: meta(ix) }, kilme, true);
    }

    return json(404, { klaida: KLAIDOS.kelias }, kilme, false);
  }

  return {
    VERSIJA: VERSIJA, KILMES: KILMES, TEKSTAI: TEKSTAI, DATOS: DATOS, LOGINIAI: LOGINIAI, KLAIDOS: KLAIDOS,
    tekstas: tekstas, data: data, verte: verte, bvpz: bvpz, nuts: nuts, tedNuorodos: tedNuorodos,
    normalizuokIrasa: normalizuokIrasa, tikrinkPuslapi: tikrinkPuslapi, priimtinasKiekis: priimtinasKiekis,
    paieskosTekstas: paieskosTekstas, sukurkIndeksa: sukurkIndeksa, atsakymas: atsakymas, kilmesAntraste: kilmesAntraste
  };
});
