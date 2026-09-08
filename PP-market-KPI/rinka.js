/* ============================================================================
 * PP-market-KPI  rinka.js
 * ----------------------------------------------------------------------------
 * Globalūs rinkos rodikliai (nafta, metalai) per g-procure backend proxy.
 *
 * KODĖL PER PROXY, o VDA rodikliai (osp.js) - tiesiai iš naršyklės. OSP rakto
 * nereikalauja ir leidžia mūsų kilmę, tad ten tarpininko nereikia. FRED reikalauja
 * rakto, o raktas kliento JavaScript'e matomas visiems - CLAUDE.md tai draudžia.
 * Todėl raktas lieka serveryje, o naršyklė kviečia /api/rinka.
 *
 * KĄ ŠITAS SLUOKSNIS DARO IR KO NEDARO. Jis tik parsineša ir sutvarko duomenis.
 * Sprendimą, kur reikšmę įrašyti, priima modulis (`taikykRinka`), nes tik jis žino
 * rodiklio žingsnį ir slenkantį langą.
 *
 * DAŽNIS - NE MŪSŲ PASIRINKIMAS. Brent ir WTI skelbiami kasdien, tad savaitinę
 * seriją atkuriam pilnai. Aliuminio ir vario NEMOKAMAI skelbiamos tik mėnesinės
 * kainos (LME dienos kainos mokamos), todėl jiems grąžinam vieną naujausią tašką
 * ir pažymim `daznis:"mėn."` - modulis tada neapsimeta turįs savaitinę istoriją.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var BAZE = "https://api.g-procure.com/api/rinka";
  var RODIKLIAI = { brent: 1, wti: 1, lme_al: 1, lme_cu: 1 };

  /* TIK NUORODAI kortelėje, kad naudotojas galėtų pats pasitikrinti reikšmę prie šaltinio.
     Autoritetinga serijų lentelė (pagal kurią klausiama FRED) gyvena `backend-rinka-routes.js` -
     ten ji ir turi būti, nes raktas serveryje. Šios dvi vietos privalo sutapti; nesutapus
     sugestų tik nuoroda, ne duomenys, todėl toks dubliavimas priimtinas. Serverio atsakymas
     serijos ID neatiduoda, o pridėti jį reikštų iš naujo diegti serverio dalį. */
  var SERIJU_NUORODOS = {
    brent:  "https://fred.stlouisfed.org/series/DCOILBRENTEU",
    wti:    "https://fred.stlouisfed.org/series/DCOILWTICO",
    lme_al: "https://fred.stlouisfed.org/series/PALUMUSDM",
    lme_cu: "https://fred.stlouisfed.org/series/PCOPPUSDM"
  };

  /* Is kasdienes serijos atrenka reiksmes rodiklio SAVAITINIAM tinkleliui: kiekvienam
     savaites taskui imama tos dienos arba artimiausio ANKSTESNIO prekybos dienos reiksme.
     Nera tinkamos reiksmes -> null („nezinoma"), o ne artimiausia velesne: velesne butu
     ateities zvilgsnis i praeiti. */
  function iSavaitini(eilute, pabaigaIso, kiek) {
    var pagalData = {}, datos = [];
    eilute.forEach(function (o) { pagalData[o.laikotarpis] = o.reiksme; datos.push(o.laikotarpis); });
    datos.sort();
    function reiksmeIki(iso) {
      if (pagalData[iso] !== undefined) return pagalData[iso];
      var geriausia = null;
      for (var i = 0; i < datos.length; i++) {
        if (datos[i] <= iso) geriausia = pagalData[datos[i]]; else break;
      }
      return geriausia;
    }
    var res = [], d = new Date(pabaigaIso + "T00:00:00");
    for (var k = kiek - 1; k >= 0; k--) {
      var t = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7 * k);
      var iso = t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
      var v = reiksmeIki(iso);
      res.push(typeof v === "number" && isFinite(v) ? v : null);
    }
    return res;
  }

  // Grazina Promise: { ok:[{id, laikotarpis, reiksme, daznis, eilute}], klaidos:[{id, priezastis}] }
  function atnaujink(ids) {
    ids = (ids && ids.length ? ids : Object.keys(RODIKLIAI)).filter(function (x) { return RODIKLIAI[x]; });
    var u = BAZE + "?ids=" + encodeURIComponent(ids.join(","));
    return fetch(u, { credentials: "omit" }).then(function (r) {
      if (r.status === 404) throw new Error("maršrutas neįdiegtas serveryje");
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      var ok = ((d && d.rodikliai) || []).map(function (r) {
        r.saltinioUrl = SERIJU_NUORODOS[r.id] || "https://fred.stlouisfed.org/";
        return r;
      });
      return { ok: ok, klaidos: (d && d.klaidos) || [] };
    });
  }

  global.GP_RINKA = { atnaujink: atnaujink, iSavaitini: iSavaitini, RODIKLIAI: RODIKLIAI,
                      SERIJU_NUORODOS: SERIJU_NUORODOS, BAZE: BAZE };
})(typeof window !== "undefined" ? window : this);
