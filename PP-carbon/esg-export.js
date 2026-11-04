/* ============================================================================
 * G-Procure  pp-carbon/esg-export.js   (v0.1 - Faze 4C branduolys)
 * PP-carbon -> PP-ESG duomenu srautas (ESRS E1-6 / Scope 3).
 *
 * PASKIRTIS: PP-carbon projekto anglies pedsaka (bendra SESD) performatuoti i
 * PP-ESG ESRS duomenu tasko struktura ir SAUGIAI iterpti i bendra localStorage
 * rakta "ppesg.esrs", kad PP-ESG modulis ji perskaitytu kaip Scope 3 ivesti.
 *
 * PP-ESG KONTRAKTAS (istirtas is PP-esg/index.html):
 *  - Raktas: "ppesg.esrs" (masyvas ESRS duomenu tasku).
 *  - Tasko forma: { id, name, esrs, value, unit, coverage, source, sourceRef, date }
 *  - Konvencijos:
 *      esrs      = "E1-6" (Scope 3)
 *      value     = STRING (ne skaicius!), pvz. "42.8"
 *      unit      = "tCO2e" (TONOS, ne kg)
 *      source    = "module"
 *      sourceRef = "PP-CARBON"
 *      coverage  = 0-100 (%)
 *      id        = priskiria PATI PP-ESG (newId("DP")) - MES NEPADUODAM
 *      date      = ISO string
 *
 * KRITINIAI SUDERINIMO NIUANSAI:
 *  1) Vienetai: pp-carbon skaiciuoja kg, PP-ESG laukia tonu -> dalinam is 1000.
 *  2) value privalo buti STRING, ne skaicius.
 *  3) id nepaduodam - leidziam PP-ESG ji priskirti.
 *
 * SAUGUMAS (rasom i "svetimo" modulio rakta - todel atsargiai):
 *  - PIRMA perskaitom esama "ppesg.esrs" masyva (jei nera - pradedam tuscia).
 *  - Papildom, NE perrasom (islaikom PP-ESG rankiniu budu ivestus taskus).
 *  - Dublikato apsauga: jei jau yra taskas su source="module" IR
 *    sourceRef="PP-CARBON", ji ATNAUJINAM (ne kuriam antro), kad kartotinis
 *    eksportas nedaugintu ivedimu.
 *  - NELIECIAM jokiu kitu ppesg.* raktu.
 *
 * Sis branduolys NELIECIA localStorage tiesiogiai testuojamumui - jam paduodama
 * "storage" abstrakcija (getItem/setItem). UI paduoda tikra window.localStorage.
 *
 * 2026-11-04 (naujo naudotojo patikra K7, D8, V5): pavadinimas pagal tai, kas sudėta (visos įvestos skaičiuoklės eilutės, ne „A1-A3“;
 * žyma „Scope 3“ ir ESRS kodas nekeisti - naudotojo klausimas); padengimo numatytosios reikšmės nėra - jį įrašo žmogus, 0-100
 * (iki tol tuščias ir 150 tapdavo 100 % be pranešimo); esamasTaskas() - kad prieš perrašant būtų galima paklausti.
 *
 * Naudojimas: <script src="esg-export.js"></script> -> window.GP_ESG_EXPORT
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.1";
  var ESG_KEY = "ppesg.esrs";
  var SOURCE = "module";
  var SOURCE_REF = "PP-CARBON";
  var ESRS_CODE = "E1-6";
  var UNIT = "tCO2e";

  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function round(x, dp) { var f = Math.pow(10, dp || 0); return Math.round(num(x) * f) / f; }

  // kg -> t, grazinam kaip STRING (PP-ESG konvencija). 3 skaiciai po kablelio.
  function kgToTonString(kg) {
    return String(round(num(kg) / 1000, 3));
  }

  // Suformuoja ESRS duomenu taska is pp-carbon duomenu.
  //  totalKg    - bendra projekto SESD (kg CO2e)
  //  opts:
  //    coverage    - kiek % projekto emisiju padengta (0-100); numatytosios reiksmes nera - iraso zmogus
  //    projectName - itraukiama i "name", kad PP-ESG matytu, kurio projekto
  //  Grazina taska BE id (id priskiria PP-ESG).
  function buildEsrsPoint(totalKg, opts) {
    opts = opts || {};
    var cov = padengimas(opts.coverage);
    // 2026-10-17: pavadinimas su lietuviškomis raidėmis (iki tol „pirkimu anglies pedsakas“); taškas atpažįstamas pagal source / sourceRef, ne pavadinimą.
    var name = "Scope 3 emisijos - projekto ŠESD (visos įvestos skaičiuoklės eilutės)";
    if (opts.projectName) name += " · " + String(opts.projectName);
    return {
      name: name,
      esrs: ESRS_CODE,
      value: kgToTonString(totalKg), // STRING, tonos
      unit: UNIT,
      coverage: cov,
      source: SOURCE,
      sourceRef: SOURCE_REF,
      date: (opts.date ? new Date(opts.date) : new Date()).toISOString()
    };
  }

  // Padengimas - tik skaičius nuo 0 iki 100; kitaip null (ne numatytasis 100)
  function padengimas(x) {
    if (x === null || x === undefined || x === "") return null;
    var n = Number(x);
    return isFinite(n) && n >= 0 && n <= 100 ? n : null;
  }

  // Ar tai musu (PP-CARBON) modulinis taskas?
  function isOurPoint(p) {
    return p && p.source === SOURCE && p.sourceRef === SOURCE_REF;
  }

  // Saugiai iterpia/atnaujina taska "ppesg.esrs" masyve per paduota storage.
  //  storage - objektas su getItem(key)/setItem(key,val) (pvz. window.localStorage)
  //  point   - is buildEsrsPoint()
  // Grazina { action: "inserted"|"updated", list } arba { error }.
  function upsertToEsg(storage, point) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      return { error: "Naršyklės saugykla nepasiekiama" };
    }
    var list;
    try {
      var raw = storage.getItem(ESG_KEY);
      list = raw ? JSON.parse(raw) : [];
    } catch (e) {
      // Jei esamas raktas sugadintas - NEtrinam aklai; pranesam klaida.
      return { error: "Nepavyko perskaityti esamų ESRS duomenų (ppesg.esrs) - galimai sugadinti; niekas neperrašyta" };
    }

    /* Galiojantis JSON, bet ne sąrašas (sugadintas ar kitos sandaros raktas) - irgi neperrašomas: iki 2026-09-28 jis būdavo
       pakeičiamas [] ir įrašomas vienas taškas, t. y. PP-ESG duomenys dingdavo (shared/saugykla.js principas). */
    if (!Array.isArray(list)) return { error: "Esami ESRS duomenys (ppesg.esrs) netikėtos sandaros - neperrašomi" };

    // Dublikato apsauga: ieskom esamo musu tasko.
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (isOurPoint(list[i])) { idx = i; break; }
    }

    var action;
    if (idx === -1) {
      list.push(point); // naujas
      action = "inserted";
    } else {
      // Atnaujinam - islaikom PP-ESG priskirta id, jei buvo.
      var keptId = list[idx] && list[idx].id;
      list[idx] = point;
      if (keptId !== undefined) list[idx].id = keptId;
      action = "updated";
    }

    try {
      storage.setItem(ESG_KEY, JSON.stringify(list));
    } catch (e) {
      return { error: "Nepavyko įrašyti į ppesg.esrs (naršyklės saugykla pilna ar nepasiekiama)" };
    }
    return { action: action, list: list };
  }

  // Esamas PP-CARBON taškas (kad prieš perrašant būtų galima paklausti). Neperskaitoma - null: klaidą pasakys upsertToEsg.
  function esamasTaskas(storage) {
    try {
      var list = JSON.parse(storage.getItem(ESG_KEY) || "[]");
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) if (isOurPoint(list[i])) return list[i];
    } catch (e) { /* neperskaitoma */ }
    return null;
  }

  // Patogumo funkcija: is bendra SESD tiesiai i PP-ESG.
  function exportTotal(storage, totalKg, opts) {
    var point = buildEsrsPoint(totalKg, opts);
    if (point.coverage === null) return { point: point, error: "Padengimas turi būti skaičius nuo 0 iki 100 %" };
    var res = upsertToEsg(storage, point);
    return Object.assign({ point: point }, res);
  }

  root.GP_ESG_EXPORT = {
    version: VERSION,
    ESG_KEY: ESG_KEY,
    kgToTonString: kgToTonString,
    buildEsrsPoint: buildEsrsPoint,
    isOurPoint: isOurPoint,
    upsertToEsg: upsertToEsg,
    esamasTaskas: esamasTaskas,
    padengimas: padengimas,
    exportTotal: exportTotal
  };
})(typeof window !== "undefined" ? window : this);
