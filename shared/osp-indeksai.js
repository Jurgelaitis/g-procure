/* ==========================================================================
 * shared/osp-indeksai.js - kainų indeksų reikšmės sutarties kainos perskaičiavimui (GP_OSP_INDEKSAI)
 *
 * Valstybės duomenų agentūros Oficialiosios statistikos portalo (osp.stat.gov.lt) atvirų duomenų sąsaja,
 * kreipiamasi tiesiai iš naršyklės (be slapukų). Siunčiamas tik duomenų rinkinio kodas ir laikotarpis -
 * jokių sutarties duomenų.
 *
 * Katalogas - tik indeksai, kuriais remiasi LITGRID sutarčių formų kainos peržiūros nuostatos:
 *   sski_visos - Statybos sąnaudų elementų kainų indeksas „Visos statybos sąnaudos“ (sutartyse - Bendras Indeksas);
 *   sski_du, sski_med, sski_mas - to paties rodiklio grupės (sutartyse - Konkretūs Indeksai);
 *   vki - vartotojų kainų indeksas „Vartojimo prekės ir paslaugos“ (prekių ir paslaugų sutartys).
 * Rinkinių kodai sutampa su PP-market-KPI/osp.js (sargas - PP-sutartys/testai.html); patikrinta prie šaltinio
 * 2026-11-28: 2024 m. rugpjūčio ir 2026 m. rugsėjo reikšmės sutapo su paskelbtuose LITGRID susitarimuose naudotomis.
 *
 * gauk(id, nuo, iki, { fetch, signal }) -> Promise<{ ok, reiksmes: { "2024-10": 126.868 }, paskutinis, indeksas }>
 *   arba { ok: false, rusis: "indeksas" | "laikotarpis" | "rysys" | "saltinis" | "pjuvis" | "atsaukta", klaida }.
 * Nepavykęs gavimas NIEKADA nėra „reikšmės nėra“ - modulis rodo klaidą ir leidžia reikšmę įrašyti ranka.
 * ========================================================================== */
;(function (global) {
  "use strict";

  var BAZE = "https://osp-rs.stat.gov.lt/ords/ipospp/ospp/rest_json/data/";
  var SALTINIS = { lt: "Valstybės duomenų agentūra, Oficialiosios statistikos portalas (osp.stat.gov.lt)", en: "State Data Agency, Official Statistics Portal (osp.stat.gov.lt)" };
  var SSKI = "Statybos sąnaudų elementų kainų indeksas (2021 m. - 100)";

  var KATALOGAS = {
    sski_visos: { flow: "S7R287_M2020424_2", pjuvis: "Visos statybos sąnaudos", rodiklis: SSKI,
      pav: "Statybos sąnaudų elementų kainų indeksas „Visos statybos sąnaudos“", trumpai: "Bendras Indeksas" },
    sski_du: { flow: "S7R287_M2020424_2", pjuvis: "Darbo užmokestis ir pridėtinės išlaidos", rodiklis: SSKI,
      pav: "Statybos sąnaudų elementų kainų indeksas „Darbo užmokestis ir pridėtinės išlaidos“", trumpai: "Konkretus Indeksas „Darbo užmokestis ir pridėtinės išlaidos“" },
    sski_med: { flow: "S7R287_M2020424_2", pjuvis: "Medžiagos ir gaminiai", rodiklis: SSKI,
      pav: "Statybos sąnaudų elementų kainų indeksas „Medžiagos ir gaminiai“", trumpai: "Konkretus Indeksas „Medžiagos ir gaminiai“" },
    sski_mas: { flow: "S7R287_M2020424_2", pjuvis: "Mašinų ir mechanizmų darbas", rodiklis: SSKI,
      pav: "Statybos sąnaudų elementų kainų indeksas „Mašinų ir mechanizmų darbas“", trumpai: "Konkretus Indeksas „Mašinų ir mechanizmų darbas“" },
    vki: { flow: "S7R330_M2020121_2", pjuvis: "Visos vartojimo prekės ir paslaugos", rodiklis: "Vartotojų kainų indeksas",
      pav: "Vartotojų kainų indeksas „Vartojimo prekės ir paslaugos“", trumpai: "indeksas „Vartojimo prekės ir paslaugos“" }
  };

  /* "2024-10-15", "2024-10", "2024M10" -> "2024-10"; kita - null. */
  function menuo(s) {
    var m = /^(\d{4})[-M](\d{1,2})(?:-\d{1,2})?$/.exec(String(s == null ? "" : s).trim());
    if (!m) return null;
    var y = +m[1], n = +m[2];
    if (y < 2000 || y > 2100 || n < 1 || n > 12) return null;
    return y + "-" + (n < 10 ? "0" : "") + n;
  }
  function menesiuTarp(nuo, iki) {
    var a = menuo(nuo), b = menuo(iki);
    if (!a || !b) return null;
    return (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5) - +a.slice(5));
  }
  var MEN_K = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"];
  /* "2024-10" -> "2024 m. spalio mėn." */
  function menuoZodziais(s) {
    var m = menuo(s);
    return m ? m.slice(0, 4) + " m. " + MEN_K[+m.slice(5) - 1] + " mėn." : "";
  }

  /* SDMX atsakymas -> { "2024-10": reikšmė } vienam pjūviui. Meta klaidą su priežastimi, jei pjūvio ar laikotarpio nėra. */
  function eilute(d, pjuvis) {
    if (!d || !d.structure || !d.dataSets || !d.dataSets[0] || !d.structure.dimensions) throw new Error("tuščias atsakymas");
    var dims = d.structure.dimensions.observation || [], lp = -1, pd = -1, pi = -1;
    dims.forEach(function (dim, i) {
      if (/aikotarp/.test(dim.name || "") || dim.id === "LAIKOTARPIS") lp = i;
      (dim.values || []).forEach(function (v, j) { if (v && v.name === pjuvis) { pd = i; pi = j; } });
    });
    if (lp < 0) throw new Error("atsakyme nėra laikotarpio");
    if (pd < 0) { var e = new Error("pjūvis „" + pjuvis + "“ nerastas"); e.rusis = "pjuvis"; throw e; }
    var obs = d.dataSets[0].observations || {}, out = {};
    Object.keys(obs).forEach(function (k) {
      var idx = k.split(":").map(Number);
      if (idx[pd] !== pi) return;
      var lv = dims[lp].values[idx[lp]], m = lv && menuo(lv.name || lv.id), v = obs[k] && obs[k][0];
      if (m && typeof v === "number" && isFinite(v) && v > 0) out[m] = v;
    });
    return out;
  }

  var ATMINTIS = {};
  function gauk(id, nuo, iki, o) {
    o = o || {};
    var ap = Object.prototype.hasOwnProperty.call(KATALOGAS, id) ? KATALOGAS[id] : null;
    if (!ap) return Promise.resolve({ ok: false, rusis: "indeksas", klaida: "nežinomas indeksas" });
    var a = menuo(nuo), b = menuo(iki);
    if (!a || !b || a > b) return Promise.resolve({ ok: false, rusis: "laikotarpis", klaida: "netinkamas laikotarpis" });
    if (o.signal && o.signal.aborted) return Promise.resolve({ ok: false, rusis: "atsaukta" });
    var f = o.fetch || global.fetch;
    if (typeof f !== "function") return Promise.resolve({ ok: false, rusis: "rysys", klaida: "naršyklė negali kreiptis į šaltinį" });
    var raktas = ap.flow + "|" + a + "|" + b;
    if (!ATMINTIS[raktas] || o.fetch) {
      var u = BAZE + encodeURIComponent(ap.flow) + "?startPeriod=" + a + "&endPeriod=" + b;
      var p = f(u, { credentials: "omit", referrerPolicy: "no-referrer", signal: o.signal }).then(function (r) {
        if (!r.ok) { var e = new Error("HTTP " + r.status); e.rusis = "saltinis"; throw e; }
        return r.json();
      }).then(function (d) {
        if (d && d.errors && d.errors.length) { var e = new Error("šaltinio klaida"); e.rusis = "saltinis"; throw e; }
        return d;
      });
      if (o.fetch) ATMINTIS[raktas] = null; else ATMINTIS[raktas] = p;
      p.catch(function () { if (ATMINTIS[raktas] === p) delete ATMINTIS[raktas]; });
      return p.then(function (d) { return rezultatas(d, ap, id); }, klaida);
    }
    return ATMINTIS[raktas].then(function (d) { return rezultatas(d, ap, id); }, klaida);
  }
  function rezultatas(d, ap, id) {
    try {
      var r = eilute(d, ap.pjuvis), ks = Object.keys(r).sort();
      if (!ks.length) return { ok: false, rusis: "saltinis", klaida: "šaltinis laikotarpiui reikšmių nepateikė" };
      return { ok: true, indeksas: id, reiksmes: r, paskutinis: ks[ks.length - 1] };
    } catch (e) { return { ok: false, rusis: e.rusis || "saltinis", klaida: e.message }; }
  }
  function klaida(e) {
    if (e && e.name === "AbortError") return { ok: false, rusis: "atsaukta" };
    return { ok: false, rusis: (e && e.rusis) || "rysys", klaida: (e && e.message) || "" };
  }

  function klaidosTekstas(rusis, kalba) {
    var en = kalba === "en", T = {
      rysys: ["Indekso reikšmių gauti nepavyko: nėra ryšio su Oficialiosios statistikos portalu. Bandykite dar kartą arba įrašykite reikšmę ranka.", "The index values could not be fetched: no connection to the Official Statistics Portal. Try again or enter the value by hand."],
      saltinis: ["Oficialiosios statistikos portalas reikšmių nepateikė. Bandykite vėliau arba įrašykite reikšmę ranka.", "The Official Statistics Portal returned no values. Try later or enter the value by hand."],
      pjuvis: ["Šaltinyje toks indeksas nerastas - gali būti, kad pasikeitė duomenų rinkinys. Įrašykite reikšmę ranka.", "The index was not found at the source - the dataset may have changed. Enter the value by hand."],
      laikotarpis: ["Nurodykite laikotarpio pradžios ir pabaigos mėnesį.", "Enter the first and the last month of the period."],
      indeksas: ["Šio indekso reikšmės automatiškai negaunamos - įrašykite jas ranka.", "The values of this index are not fetched automatically - enter them by hand."],
      atsaukta: ["Atšaukta.", "Cancelled."]
    };
    return (T[rusis] || T.rysys)[en ? 1 : 0];
  }

  global.GP_OSP_INDEKSAI = {
    KATALOGAS: KATALOGAS, SALTINIS: SALTINIS,
    menuo: menuo, menesiuTarp: menesiuTarp, menuoZodziais: menuoZodziais,
    eilute: eilute, gauk: gauk, klaidosTekstas: klaidosTekstas
  };
})(typeof window !== "undefined" ? window : this);
