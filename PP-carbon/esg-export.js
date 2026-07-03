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
  //    coverage    - kiek % projekto emisiju padengta (0-100), numatyta 100
  //    projectName - itraukiama i "name", kad PP-ESG matytu, kurio projekto
  //  Grazina taska BE id (id priskiria PP-ESG).
  function buildEsrsPoint(totalKg, opts) {
    opts = opts || {};
    var cov = opts.coverage === undefined ? 100 : num(opts.coverage, 100);
    if (cov < 0) cov = 0; if (cov > 100) cov = 100;
    var name = "Scope 3 emisijos - pirkimu anglies pedsakas (A1-A3)";
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
      return { error: "Netinkama storage abstrakcija" };
    }
    var list;
    try {
      var raw = storage.getItem(ESG_KEY);
      list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = []; // apsauga nuo sugadinto rakto
    } catch (e) {
      // Jei esamas raktas sugadintas - NEtrinam aklai; pranesam klaida.
      return { error: "Nepavyko perskaityti esamo ppesg.esrs (galimai sugadintas)" };
    }

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
      return { error: "Nepavyko irasyti i ppesg.esrs" };
    }
    return { action: action, list: list };
  }

  // Patogumo funkcija: is bendra SESD tiesiai i PP-ESG.
  function exportTotal(storage, totalKg, opts) {
    var point = buildEsrsPoint(totalKg, opts);
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
    exportTotal: exportTotal
  };
})(typeof window !== "undefined" ? window : this);
