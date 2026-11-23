/* ============================================================================
 * G-Procure  shared/testu-apsauga.js   (window.GP_TESTU_APSAUGA)
 * ----------------------------------------------------------------------------
 * Tikrų naudotojo duomenų apsauga testų puslapiams (2026-09-26).
 *
 * KODĖL. Testų puslapiai gyvena tame pačiame adrese kaip moduliai
 * (g-procure.com/<modulis>/testai.html), tad naršyklės saugykla (localStorage)
 * jiems BENDRA su tikru darbu. Iki šiol PP-market-KPI, PP-cost-benefit ir
 * PP-tiekejams testai prieš kiekvieną testą ištrindavo modulio įrašus: atidarius
 * testus gyvai, naudotojo įvesti rodikliai ar skaičiuoklės duomenys dingdavo
 * negrįžtamai.
 *
 * TAISYKLĖ. Testų puslapis, kurio testai skaito ar rašo modulio saugyklą, PAČIOJE
 * PRADŽIOJE (prieš įkeldamas modulį į rėmelį) iškviečia:
 *   const APSAUGA = GP_TESTU_APSAUGA.pradek(k => k.indexOf("epsog_rinkos_kpi") === 0);
 * o baigęs testus - APSAUGA.atkurk(). Atkuriama ir uždarant ar perkraunant puslapį
 * (pagehide), jei testai nutrūko. Atkūrimas tikslus: testų sukurti raktai
 * (tarp jų „.sugadinta-“ kopijos) pašalinami, pakeisti ir ištrinti - grąžinami.
 * Kiti raktai neliečiami. Nieko nesiunčia.
 *
 * Nuo 2026-11-23 (saugumo auditas G-10) su tikra naršyklės saugykla pradek()
 * veikia tik vietiniu adresu (localhost, 127.0.0.1, [::1]) - kitur meta klaidą, net
 * jei testų puslapis kada nors vėl būtų paskelbtas svetainėje (žr. testu-aplinka.js).
 * ==========================================================================*/
(function (global) {
  "use strict";

  var VIETINIS = /^(localhost|127\.0\.0\.1|\[::1\])$/;
  function vietine() {
    try { var l = global.location; return !l || ((l.protocol === "http:" || l.protocol === "https:") && VIETINIS.test(l.hostname)); }
    catch (e) { return false; }
  }

  function pradek(tinka, saugykla) {
    if (!saugykla && !vietine()) throw new Error("Testai su tikra naršyklės saugykla vykdomi tik vietoje (localhost, 127.0.0.1) - čia G-Procure duomenys neliečiami.");
    var s = saugykla || (function () { try { return global.localStorage; } catch (e) { return null; } })();
    var kopija = {};
    function raktai() {
      var r = [];
      try { for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k !== null && tinka(k)) r.push(k); } } catch (e) {}
      return r;
    }
    raktai().forEach(function (k) { kopija[k] = s.getItem(k); });

    /* Galima kviesti kelis kartus (pvz., pabaigoje ir dar kartą uždarant puslapį). */
    function atkurk() {
      if (!s) return false;
      try {
        raktai().forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(kopija, k)) s.removeItem(k); });
        Object.keys(kopija).forEach(function (k) { if (s.getItem(k) !== kopija[k]) s.setItem(k, kopija[k]); });
        return true;
      } catch (e) { return false; }
    }
    if (!saugykla && global.addEventListener) global.addEventListener("pagehide", atkurk);
    return { atkurk: atkurk, kiek: Object.keys(kopija).length };
  }

  global.GP_TESTU_APSAUGA = { pradek: pradek, vietine: vietine };
})(typeof window !== "undefined" ? window : this);
