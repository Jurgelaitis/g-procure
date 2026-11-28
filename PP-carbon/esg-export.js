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
 *      value     = STRING (ne skaicius!), pvz., "42.8"
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
 * 2026-11-28 (v0.3, naudotojo sprendimas sujungti PP-carbon ir PP-ESG ESRS dalį): ESRS duomenys tvarkomi šiame įrankyje (skirtukas „ESRS duomenys“),
 * raktas „ppesg.esrs“ nekeistas (atsarginė kopija, ankstesni duomenys). Vienas E1-6 taškas kiekvienam projektui ir ataskaitiniams metams (`projektas`, `metai`;
 * iki tol - vienas PP-carbon taškas, todėl metų sumos nebuvo galima sudaryti); senas taškas be projekto ir metų laikomas tuo pačiu, kai jo pavadinimas baigiasi
 * projekto pavadinimu. id suteikiamas čia (PP-ESG jo nebesuteikia). Metų sumos, eksportas JSON ir CSV - `suvestine`, `eksportas`, `csv`.
 *
 * Naudojimas: <script src="esg-export.js"></script> -> window.GP_ESG_EXPORT
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.3";
  /* ESRS duomenų vienetai, kuriuos galima įrašyti (kaip PP-ESG): E1 - klimato kaita, S2 - vertės grandinės darbuotojai, G1 - verslo etika. */
  var KODAI = ["E1-6", "E1-4", "S2-1", "S2-4", "G1-1", "G1-2", "G1-6"];
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
      projektas: opts.projectName ? String(opts.projectName) : "",
      metai: metai(opts.metai),
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

  // Ataskaitiniai metai - keturi skaitmenys; kitaip „“ (nenurodyta)
  function metai(x) { var s = String(x == null ? "" : x).trim(); return /^(19|20)\d{2}$/.test(s) ? s : ""; }
  function naujasId() { return "DP-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  /* Tas pats projekto ir metų taškas. Senas (iki 2026-11-28) PP-CARBON taškas be projekto ir metų - tas pats, kai jo pavadinimas baigiasi
     „ · <projektas>“ (be projekto - kai pavadinime projekto nėra). */
  function tasPats(p, n) {
    if (!isOurPoint(p) || !n) return false;
    var pj = String(n.projektas || ""), mt = n.metai || "";
    if (p.projektas !== undefined && p.projektas !== null) return String(p.projektas) === pj && (p.metai || "") === mt;
    if (p.metai) return false;
    var vardas = String(p.name || "");
    return pj ? vardas.slice(-(pj.length + 3)) === " · " + pj : vardas.indexOf(" · ") < 0;
  }

  // Ar tai musu (PP-CARBON) modulinis taskas?
  function isOurPoint(p) {
    return p && p.source === SOURCE && p.sourceRef === SOURCE_REF;
  }

  // Saugiai iterpia/atnaujina taska "ppesg.esrs" masyve per paduota storage.
  //  storage - objektas su getItem(key)/setItem(key,val) (pvz., window.localStorage)
  //  point   - is buildEsrsPoint()
  // Grazina { action: "inserted"|"updated", list } arba { error }.
  function upsertToEsg(storage, point) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      return { error: "Naršyklės saugykla nepasiekiama" };
    }
    var list;
    try {
      var raw = storage.getItem(ESG_KEY);
      list = raw ? (root.GP_SAUGYKLA && root.GP_SAUGYKLA.json ? root.GP_SAUGYKLA.json(raw) : JSON.parse(raw)) : [];
    } catch (e) {
      // Jei esamas raktas sugadintas - NEtrinam aklai; pranesam klaida.
      return { error: "Nepavyko perskaityti esamų ESRS duomenų (ppesg.esrs) - galimai sugadinti; niekas neperrašyta" };
    }

    /* Galiojantis JSON, bet ne sąrašas (sugadintas ar kitos sandaros raktas) - irgi neperrašomas: iki 2026-09-28 jis būdavo
       pakeičiamas [] ir įrašomas vienas taškas, t. y. PP-ESG duomenys dingdavo (shared/saugykla.js principas). */
    if (!Array.isArray(list)) return { error: "Esami ESRS duomenys (ppesg.esrs) netikėtos sandaros - neperrašomi" };

    // Dublikato apsauga: to paties projekto ir metų taškas atnaujinamas, kitas - pridedamas.
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (tasPats(list[i], point)) { idx = i; break; }
    }

    var action;
    if (idx === -1) {
      if (!point.id) point.id = naujasId();
      list.push(point); // naujas
      action = "inserted";
    } else {
      // Atnaujinam - islaikom esama id.
      var keptId = list[idx] && list[idx].id;
      list[idx] = point;
      list[idx].id = keptId !== undefined && keptId !== null && keptId !== "" ? keptId : naujasId();
      action = "updated";
    }

    try {
      storage.setItem(ESG_KEY, JSON.stringify(list));
    } catch (e) {
      return { error: "Nepavyko įrašyti į ppesg.esrs (naršyklės saugykla pilna ar nepasiekiama)" };
    }
    return { action: action, list: list };
  }

  // Esamas to paties projekto ir metų PP-CARBON taškas (kad prieš perrašant būtų galima paklausti). Neperskaitoma - null: klaidą pasakys upsertToEsg.
  function esamasTaskas(storage, point) {
    try {
      var list = JSON.parse(storage.getItem(ESG_KEY) || "[]");
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) if (point ? tasPats(list[i], point) : isOurPoint(list[i])) return list[i];
    } catch (e) { /* neperskaitoma */ }
    return null;
  }

  /* ---------- ESRS duomenų sąrašas: skaitymas, ranka įrašyti ir šalinami taškai (2026-11-28) ---------- */
  // { list } (ir `nera: true`, kai įrašo dar nėra) arba { error: "neprieinama" | "sugadinta" | "sandara" } - neperskaitytas sąrašas neperrašomas
  function skaitykSarasa(storage) {
    if (!storage || typeof storage.getItem !== "function") return { error: "neprieinama" };
    var raw;
    try { raw = storage.getItem(ESG_KEY); } catch (e) { return { error: "neprieinama" }; }
    if (raw === null || raw === undefined || raw === "") return { list: [], nera: true };
    var list;
    try { list = root.GP_SAUGYKLA && root.GP_SAUGYKLA.json ? root.GP_SAUGYKLA.json(raw) : JSON.parse(raw); } catch (e) { return { error: "sugadinta" }; }
    if (!Array.isArray(list)) return { error: "sandara" };
    return { list: list };
  }
  function rasykSarasa(storage, list) {
    try { storage.setItem(ESG_KEY, JSON.stringify(list)); return { ok: true }; }
    catch (e) { return { error: "irasyti" }; }
  }
  // Taško vieta sąraše: pagal id, o be id (seni taškai) - pagal eilės numerį ir tą patį turinį, kokį matė žmogus
  function rask(list, ref) {
    if (!Array.isArray(list) || !ref) return -1;
    if (ref.id) { for (var i = 0; i < list.length; i++) if (list[i] && String(list[i].id) === String(ref.id)) return i; return -1; }
    var j = Number(ref.i);
    return j >= 0 && j < list.length && JSON.stringify(list[j]) === ref.json ? j : -1;
  }
  // Ranka įrašomas taškas: kodas iš sąrašo, pavadinimas, vertė, aprėptis 0-100 ir metai - privalomi; klaidos - { klaidos: { laukas: priežastis } }
  function rankinisTaskas(f, senas) {
    f = f || {};
    var k = {};
    var esrs = String(f.esrs || "");
    if (KODAI.indexOf(esrs) < 0) k.esrs = "kodas";
    var name = String(f.name == null ? "" : f.name).trim();
    if (!name) k.name = "tuscias"; else if (name.length > 300) k.name = "ilgas";
    var value = String(f.value == null ? "" : f.value).trim();
    if (!value) k.value = "tuscias"; else if (value.length > 200) k.value = "ilgas";
    var unit = String(f.unit == null ? "" : f.unit).trim();
    if (unit.length > 40) k.unit = "ilgas";
    var cov = padengimas(skaicius(f.coverage));
    if (cov === null) k.coverage = "ribos";
    var mt = metai(f.metai);
    if (!mt) k.metai = "metai";
    if (Object.keys(k).length) return { klaidos: k };
    var p = {};
    if (senas && typeof senas === "object") Object.keys(senas).forEach(function (x) { if (x !== "__proto__" && x !== "constructor" && x !== "prototype") p[x] = senas[x]; });
    p.esrs = esrs; p.name = name; p.value = value; p.unit = unit; p.coverage = cov; p.metai = mt;
    p.source = "manual"; delete p.sourceRef; delete p.projektas;
    p.date = new Date().toISOString();
    if (!p.id) p.id = naujasId();
    return { point: p };
  }
  // Ar taškas taisomas ranka (taškų iš projekto skaičiuoklės ir pavyzdžių - ne)
  function taisomas(p) { return !!p && typeof p === "object" && !arDemo(p) && !isOurPoint(p) && p.source !== "module"; }
  function irasykRankini(storage, f, ref) {
    var r = skaitykSarasa(storage); if (r.error) return { error: r.error };
    var list = r.list, idx = ref ? rask(list, ref) : -1;
    if (ref && idx < 0) return { error: "pakeista" };
    if (idx >= 0 && !taisomas(list[idx])) return { error: "netaisomas" };
    var t = rankinisTaskas(f, idx >= 0 ? list[idx] : null);
    if (t.klaidos) return { klaidos: t.klaidos };
    if (idx >= 0) list[idx] = t.point; else list.push(t.point);
    var w = rasykSarasa(storage, list); if (w.error) return { error: w.error };
    return { ok: true, point: t.point, action: idx >= 0 ? "updated" : "inserted" };
  }
  function salink(storage, ref) {
    var r = skaitykSarasa(storage); if (r.error) return { error: r.error };
    var idx = rask(r.list, ref); if (idx < 0) return { error: "pakeista" };
    var buvo = r.list.splice(idx, 1)[0];
    var w = rasykSarasa(storage, r.list); if (w.error) return { error: w.error };
    return { ok: true, point: buvo };
  }

  /* ---------- ESRS duomenys: suvestinė ir eksportas (2026-11-28) ---------- */
  // Demonstraciniai PP-ESG taškai (seni įrašyti ir pavyzdys) į suvestines ir eksportą nepatenka
  function arDemo(p) { return !!p && (p.demo === true || p.pavyzdys === true || /^DP-[1-7]$/.test(String(p.id || ""))); }
  function skaicius(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    var t = String(v == null ? "" : v).trim(); if (!t) return null;
    var M = root.GP_MONEY, n = M && M.parseSkaicius ? M.parseSkaicius(t) : Number(t.replace(",", "."));
    return n !== null && n !== undefined && isFinite(n) ? n : null;
  }
  // Vertė tonomis CO2e: „t“, „tCO2e“, „t CO₂e“ - tonos, „kg ...“ - kilogramai; kitas vienetas - null
  function tonomis(p) {
    var n = skaicius(p.value); if (n === null) return null;
    var u = String(p.unit || "").replace(/\s+/g, "").replace(/₂/g, "2").toLowerCase();
    if (/^t(co2e?(-?eq)?)?$/.test(u)) return n;
    if (/^kg(co2e?(-?eq)?)?$/.test(u)) return n / 1000;
    return null;
  }
  function taskoMetai(p) { return metai(p.metai) || (p.date ? metai(String(p.date).slice(0, 4)) : ""); }
  function suvestine(list) {
    var tikri = (Array.isArray(list) ? list : []).filter(function (p) { return p && typeof p === "object" && !arDemo(p); });
    var cov = tikri.map(function (p) { return padengimas(p.coverage); }).filter(function (x) { return x !== null; });
    var kat = { E1: 0, S2: 0, G1: 0 }, metu = {}, neisk = 0;
    tikri.forEach(function (p) {
      var k = String(p.esrs || "").slice(0, 2); if (kat[k] !== undefined) kat[k]++;
      if (p.esrs !== "E1-6") return;
      var t = tonomis(p), m = taskoMetai(p);
      if (t === null || !m) { neisk++; return; }
      if (!metu[m]) metu[m] = { metai: m, t: 0, taskai: 0, projektai: [] };
      metu[m].t += t; metu[m].taskai++;
      if (p.projektas && metu[m].projektai.indexOf(p.projektas) < 0) metu[m].projektai.push(p.projektas);
    });
    var scope3 = Object.keys(metu).sort().reverse().map(function (m) { var x = metu[m]; x.t = round(x.t, 3); return x; });
    return { taskai: tikri.length, vidAprepts: cov.length ? Math.round(cov.reduce(function (a, b) { return a + b; }, 0) / cov.length) : null,
      bePadengimo: tikri.length - cov.length, kategorijos: kat, scope3: scope3, neiskaiciuota: neisk, demo: (Array.isArray(list) ? list : []).filter(arDemo).length };
  }
  function eksportas(list, o) {
    o = o || {};
    var sv = suvestine(list), tikri = (Array.isArray(list) ? list : []).filter(function (p) { return p && typeof p === "object" && !arDemo(p); });
    return {
      meta: { module: "PP-carbon", dataset: "ESRS", framework: "CSRD/ESRS", generatedAt: (o.dabar || new Date()).toISOString(), lang: o.kalba === "en" ? "en" : "lt", dataPointCount: tikri.length, storedIn: "browser" },
      summary: { averageCoverage: sv.vidAprepts, scope3ByYear: sv.scope3.map(function (x) { return { year: x.metai, tCO2e: x.t, dataPoints: x.taskai }; }), scope3NotCounted: sv.neiskaiciuota },
      dataPoints: tikri.map(function (p) { return { esrsCode: String(p.esrs || ""), name: String(p.name || ""), value: String(p.value == null ? "" : p.value), unit: String(p.unit || ""),
        coverage: padengimas(p.coverage), year: taskoMetai(p) || null, project: p.projektas ? String(p.projektas) : null, source: p.source === "module" ? "module" : "manual", sourceRef: p.sourceRef ? String(p.sourceRef) : null, date: p.date ? String(p.date) : null }; })
    };
  }
  // CSV: kabliataškis, UTF-8 žymė, formulės pradžioje apsaugotos (=, +, -, @); tikri skaičiai lieka skaičiais (kaip PP-ESG)
  function csvLangelis(v) {
    var x = String(v === null || v === undefined ? "" : v);
    if (/^[=+\-@\t\r]/.test(x) && !/^[-+]?\d+(?:[.,]\d+)?$/.test(x)) x = "'" + x;
    return '"' + x.replace(/"/g, '""') + '"';
  }
  function csv(list) {
    var e = eksportas(list), rows = [["esrsCode", "name", "value", "unit", "coverage", "year", "project", "source", "date"]];
    e.dataPoints.forEach(function (p) { rows.push([p.esrsCode, p.name, p.value, p.unit, p.coverage, p.year, p.project, p.source, p.date]); });
    return "\uFEFF" + rows.map(function (r) { return r.map(csvLangelis).join(";"); }).join("\r\n");
  }

  // Patogumo funkcija: is bendra SESD tiesiai i PP-ESG.
  function exportTotal(storage, totalKg, opts) {
    var point = buildEsrsPoint(totalKg, opts);
    if (point.coverage === null) return { point: point, error: "Aprėptis turi būti skaičius nuo 0 iki 100 %" };
    // Nuo 2026-11-28 - kiekvieniems ataskaitiniams metams atskiras taškas: be metų metų sumos sudaryti negalima
    if (!point.metai) return { point: point, error: "Nurodykite ataskaitinius metus" };
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
    KODAI: KODAI,
    metai: metai,
    tasPats: tasPats,
    arDemo: arDemo,
    skaicius: skaicius,
    tonomis: tonomis,
    taskoMetai: taskoMetai,
    suvestine: suvestine,
    eksportas: eksportas,
    csv: csv,
    naujasId: naujasId,
    skaitykSarasa: skaitykSarasa,
    rask: rask,
    rankinisTaskas: rankinisTaskas,
    taisomas: taisomas,
    irasykRankini: irasykRankini,
    salink: salink,
    padengimas: padengimas,
    exportTotal: exportTotal
  };
})(typeof window !== "undefined" ? window : this);
