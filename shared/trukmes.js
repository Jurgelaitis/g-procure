/* ==================== STANDARTINĖS PIRKIMŲ TRUKMĖS PAGAL METUS ====================
 * GP_TRUKMES (nuo 2026-10-27, naudotojo pateikta 2026 ir 2027 m. trukmių lentelė): kiekvienam pirkimo būdui -
 * pasirengimo (techninė specifikacija ir pirkimo dokumentai) ir vykdymo (procedūros iki sutarties) trukmė darbo dienomis.
 * Tai pirkimų organizavimo standartas (vidaus planavimo įvertis), ne teisės aktų terminai.
 *
 * Kiekviena versija galioja nuo „nuo“ iki „iki“ (imtinai; paskutinės - be pabaigos). Kol ateities versija dar
 * negalioja, galima rinktis tarp dabartinės ir jos (planuojant ateinančių metų pirkimus); pasibaigusi versija
 * pasirinkimuose nebelieka - nuo 2027-01-01 lieka tik 2027 m. trukmės ir jos taikomos pačios.
 * Naujų metų trukmės - nauja VERSIJOS eilutė (ankstesnės pabaiga - „iki“); moduliai jų nesikopijuoja.
 * Būdų kodai - shared/procurement-methods.js (GP_METHODS). Etapų trukmės (grafikui) - PP-graphs.
 * Naudoja: PP-graphs (grafikų generatorius ir trukmių skaičiuoklė), PP-plan (terminų skaičiuoklė, katalogas, datų perskaičiavimas).
 */
(function (root) {
  "use strict";

  function t(prep, exec) { return Object.freeze({ prep: prep, exec: exec, total: prep + exec }); }

  // CPO ir MV-NZ lentelėje pasirengimo etapo nėra (bendra trukmė = vykdymas)
  var VERSIJOS = [
    { metai: 2026, nuo: "2026-01-01", iki: "2026-12-31", trukmes: {
      "CPO": t(0, 20), "MV-NZ": t(0, 3), "MV-NR": t(5, 25), "MV-SAB": t(10, 35), "MV-SAD": t(10, 50),
      "S-ND": t(5, 45), "S-AK": t(15, 60), "S-SD": t(20, 75),
      "T-ND": t(10, 65), "T-AK": t(15, 75), "T-SD": t(25, 110),
      "DPS": t(10, 50), "DPS-K": t(7, 45) } },
    { metai: 2027, nuo: "2027-01-01", iki: null, trukmes: {
      "CPO": t(0, 20), "MV-NZ": t(0, 3), "MV-NR": t(5, 25), "MV-SAB": t(10, 35), "MV-SAD": t(10, 50),
      "S-ND": t(5, 45), "S-AK": t(15, 55), "S-SD": t(20, 65),
      "T-ND": t(10, 65), "T-AK": t(15, 80), "T-SD": t(25, 115),
      "DPS": t(10, 50), "DPS-K": t(10, 55) } }
  ];
  VERSIJOS.forEach(function (v) { Object.freeze(v.trukmes); Object.freeze(v); });
  Object.freeze(VERSIJOS);

  // Vietinė data „YYYY-MM-DD“ (ne toISOString - tai UTC, naktį vakarykštė)
  function diena(d) {
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (d instanceof Date && !isNaN(d)) {
      var p = function (n) { return (n < 10 ? "0" : "") + n; };
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    }
    if (root.GP_WORKDAYS && root.GP_WORKDAYS.siandien) return root.GP_WORKDAYS.siandien();
    return diena(new Date());
  }
  function galioja(v, d) { return v.nuo <= d && (!v.iki || d <= v.iki); }

  /* Versijos, kurias galima pasirinkti šią dieną: dabartinė ir ateities (pasibaigusios - ne) */
  function pasirenkamos(dabar) {
    var d = diena(dabar);
    return VERSIJOS.filter(function (v) { return !v.iki || v.iki >= d; });
  }
  /* Taikoma pagal numatymą - ta, kuri galioja šią dieną */
  function numatyta(dabar) {
    var d = diena(dabar);
    return VERSIJOS.filter(function (v) { return galioja(v, d); })[0] || pasirenkamos(d)[0] || VERSIJOS[VERSIJOS.length - 1];
  }
  /* Versija, galiojanti nurodytą dieną (pvz. pirkimo pradžios) - arba null */
  function pagalData(d) {
    if (!d) return null;
    d = diena(d);
    return VERSIJOS.filter(function (v) { return galioja(v, d); })[0] || null;
  }
  function versija(metai) {
    metai = Number(metai);
    return VERSIJOS.filter(function (v) { return v.metai === metai; })[0] || null;
  }
  /* { prep, exec, total } - kopija; nežinomas būdas ar metai - null */
  function trukme(budas, metai) {
    var v = versija(metai), x = v && v.trukmes[budas];
    return x ? { prep: x.prep, exec: x.exec, total: x.total } : null;
  }
  /* Būdai, kurių trukmės tarp dviejų versijų skiriasi: [{ budas, is: {...}, i: {...} }] */
  function pokyciai(isMetu, iMetu) {
    var a = versija(isMetu), b = versija(iMetu);
    if (!a || !b) return [];
    return Object.keys(b.trukmes).filter(function (k) {
      var x = a.trukmes[k], y = b.trukmes[k];
      return !x || x.prep !== y.prep || x.exec !== y.exec;
    }).map(function (k) { return { budas: k, is: trukme(k, isMetu), i: trukme(k, iMetu) }; });
  }

  root.GP_TRUKMES = Object.freeze({
    VERSIJOS: VERSIJOS,
    diena: diena,
    pasirenkamos: pasirenkamos,
    numatyta: numatyta,
    pagalData: pagalData,
    versija: versija,
    trukme: trukme,
    pokyciai: pokyciai
  });
})(typeof window !== "undefined" ? window : this);
