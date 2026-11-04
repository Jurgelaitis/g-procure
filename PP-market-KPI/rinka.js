/* ============================================================================
 * PP-market-KPI  rinka.js
 * ----------------------------------------------------------------------------
 * Globalūs rinkos rodikliai (nafta, metalai, krovinių kainos, tiekimo grandinės) per
 * g-procure backend proxy, polimerų ir ES transporto paslaugų kainos - tiesiai iš Eurostat.
 *
 * KODĖL PER PROXY, o VDA rodikliai (osp.js) - tiesiai iš naršyklės. OSP rakto
 * nereikalauja ir leidžia mūsų kilmę, tad ten tarpininko nereikia. FRED reikalauja
 * rakto, o raktas kliento JavaScript'e matomas visiems - CLAUDE.md tai draudžia.
 * Todėl raktas lieka serveryje, o naršyklė kviečia /api/rinka. Eurostat rakto nereikalauja
 * ir leidžia bet kokią kilmę (`Access-Control-Allow-Origin: *`, patikrinta 2026-11-03), todėl
 * šie rodikliai veikia ir be serverio.
 *
 * KĄ ŠITAS SLUOKSNIS DARO IR KO NEDARO. Jis tik parsineša ir sutvarko duomenis.
 * Sprendimą, kur reikšmę įrašyti, priima modulis (`taikykRinka`), nes tik jis žino
 * rodiklio žingsnį ir slenkantį langą.
 *
 * DAŽNIS - NE MŪSŲ PASIRINKIMAS. Brent ir WTI skelbiami kasdien, tad savaitinę
 * seriją atkuriam pilnai. Metalų, plieno ir dujų NEMOKAMAI skelbiamos tik mėnesinės
 * kainos (LME dienos kainos mokamos), todėl jie mėnesiniai: `daznis:"mėn."` ir
 * `menesine` - 24 mėn. istorija; modulis iš jos atkuria mėnesinę eilutę.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var BAZE = "https://api.g-procure.com/api/rinka";
  var RODIKLIAI = { brent: 1, wti: 1, lme_al: 1, lme_cu: 1, dujos_eu: 1, plienas: 1, plieno_vamzdziai: 1, gelezies_ruda: 1, nikelis: 1, cinkas: 1,
                    container: 1, aircargo: 1, gscpi: 1, polymers: 1, transp_vanduo: 1, transp_oras: 1 };
  /* Eurostat: gamintojų kainos (visa rinka), NACE C2016 „plastikai pirminėmis formomis“, ES, 2021 = 100, nekoreguota. Atvirieji duomenys:
     naudoti galima nurodant šaltinį. Mėnesinis, naujausias - maždaug prieš 2-3 mėn. Pjūviai patikrinti 2026-11-03. */
  var EUROSTAT = {
    polymers: {
      url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_inpp_m?format=JSON&lang=EN&geo=EU27_2020&nace_r2=C2016&s_adj=NSA&unit=I21&indic_bt=PRC_PRR",
      saltinis: "Eurostat - Producer prices in industry: plastics in primary forms (NACE C2016), EU, 2021 = 100"
    },
    /* Paslaugų gamintojų kainos (sts_sepp_q), ES, 2021 = 100, nekoreguota, ketvirtinės (naudotojo sprendimas 2026-11-04: ES duomenys greta JAV
       krypties ženklų). Vandens transportas ES vidurkiu skelbiamas nuo 2021 m., oro - nuo 2010 m. Pjūviai patikrinti 2026-11-04. */
    transp_vanduo: {
      url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_sepp_q?format=JSON&lang=EN&geo=EU27_2020&nace_r2=H50&indic_bt=PRC_PRR&s_adj=NSA&unit=I21", ketvirtinis: true,
      saltinis: "Eurostat - Services producer prices: water transport (NACE H50), EU, 2021 = 100"
    },
    transp_oras: {
      url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_sepp_q?format=JSON&lang=EN&geo=EU27_2020&nace_r2=H51&indic_bt=PRC_PRR&s_adj=NSA&unit=I21", ketvirtinis: true,
      saltinis: "Eurostat - Services producer prices: air transport (NACE H51), EU, 2021 = 100"
    }
  };

  /* TIK NUORODAI kortelėje, kad naudotojas galėtų pats pasitikrinti reikšmę prie šaltinio.
     Autoritetinga serijų lentelė (pagal kurią klausiama FRED) gyvena `backend-rinka-routes.js` -
     ten ji ir turi būti, nes raktas serveryje. Šios dvi vietos privalo sutapti; nesutapus
     sugestų tik nuoroda, ne duomenys, todėl toks dubliavimas priimtinas. Serverio atsakymas
     serijos ID neatiduoda, o pridėti jį reikštų iš naujo diegti serverio dalį. */
  var SERIJU_NUORODOS = {
    brent:  "https://fred.stlouisfed.org/series/DCOILBRENTEU",
    wti:    "https://fred.stlouisfed.org/series/DCOILWTICO",
    lme_al: "https://fred.stlouisfed.org/series/PALUMUSDM",
    lme_cu: "https://fred.stlouisfed.org/series/PCOPPUSDM",
    dujos_eu: "https://fred.stlouisfed.org/series/PNGASEUUSDM",
    plienas: "https://fred.stlouisfed.org/series/WPU1017",
    plieno_vamzdziai: "https://fred.stlouisfed.org/series/WPU101706",
    gelezies_ruda: "https://fred.stlouisfed.org/series/PIORECRUSDM",
    nikelis: "https://fred.stlouisfed.org/series/PNICKUSDM",
    cinkas: "https://fred.stlouisfed.org/series/PZINCUSDM",
    container: "https://fred.stlouisfed.org/series/PCU483111483111",
    aircargo: "https://fred.stlouisfed.org/series/IC131",
    gscpi: "https://www.newyorkfed.org/research/policy/gscpi",
    polymers: "https://ec.europa.eu/eurostat/databrowser/view/sts_inpp_m/default/table?lang=en",
    transp_vanduo: "https://ec.europa.eu/eurostat/databrowser/view/sts_sepp_q/default/table?lang=en",
    transp_oras: "https://ec.europa.eu/eurostat/databrowser/view/sts_sepp_q/default/table?lang=en"
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

  /* JSON-stat atsakymas -> [{ laikotarpis:"2026-08-01", reiksme }] pagal laiką; ketvirtis - paskutinis jo mėnuo („2026-Q2“ -> „2026-06-01“), kaip VMDU. Visi pjūviai parinkti adrese, todėl vienintelė
     dimensija su keliomis reikšmėmis - laikas; kitokia sandara - klaida, ne svetimi skaičiai. */
  function skaitykEurostat(d) {
    var dim = d && d.dimension, ids = d && d.id, dydziai = d && d.size;
    var laikas = dim && dim.time && dim.time.category && dim.time.category.index;
    if (!laikas || !d.value || !Array.isArray(ids) || !Array.isArray(dydziai)) throw new Error("Eurostat: netikėta dimensijų sandara");
    ids.forEach(function (id, i) { if (id !== "time" && dydziai[i] !== 1) throw new Error("Eurostat: netikėta dimensijų sandara"); });
    var rez = [];
    Object.keys(laikas).forEach(function (per) {
      var v = d.value[laikas[per]];
      if (typeof v !== "number" || !isFinite(v)) return;
      var q = /^(\d{4})-Q([1-4])$/.exec(per);
      if (q) rez.push({ laikotarpis: q[1] + "-" + ("0" + q[2] * 3).slice(-2) + "-01", reiksme: v });
      else if (/^\d{4}-\d{2}$/.test(per)) rez.push({ laikotarpis: per + "-01", reiksme: v });
    });
    if (!rez.length) throw new Error("Eurostat: tuščias atsakymas");
    return rez.sort(function (a, b) { return a.laikotarpis < b.laikotarpis ? -1 : 1; });
  }

  function imkEurostat(id) {
    var nuo = new Date();
    nuo.setMonth(nuo.getMonth() - 30);
    var u = EUROSTAT[id].url + "&sinceTimePeriod=" + nuo.getFullYear() + "-" + (EUROSTAT[id].ketvirtinis ? "Q" + (Math.floor(nuo.getMonth() / 3) + 1) : ("0" + (nuo.getMonth() + 1)).slice(-2));
    return fetch(u, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      var eil = skaitykEurostat(d), pask = eil[eil.length - 1];
      return { id: id, laikotarpis: pask.laikotarpis, reiksme: pask.reiksme, daznis: "mėn.", saltinis: EUROSTAT[id].saltinis,
               saltinioUrl: SERIJU_NUORODOS[id], menesine: eil.slice(-24) };
    });
  }

  /* Grazina Promise: { ok:[{id, laikotarpis, reiksme, daznis, eilute}], klaidos:[{id, priezastis}] }.
     Šaltiniai nepriklausomi: Eurostat klaida nestabdo serverio rodiklių ir atvirkščiai (serverio klaida - vienas įrašas „globalūs“). */
  function atnaujink(ids) {
    ids = (ids && ids.length ? ids : Object.keys(RODIKLIAI)).filter(function (x) { return RODIKLIAI[x]; });
    var tiesiai = ids.filter(function (x) { return EUROSTAT[x]; }), serveriui = ids.filter(function (x) { return !EUROSTAT[x]; });
    var rez = { ok: [], klaidos: [] };
    var darbai = tiesiai.map(function (id) {
      return imkEurostat(id).then(function (r) { rez.ok.push(r); }, function (e) { rez.klaidos.push({ id: id, priezastis: (e && e.message) || String(e) }); });
    });
    if (serveriui.length) {
      var u = BAZE + "?ids=" + encodeURIComponent(serveriui.join(","));
      darbai.push(fetch(u, { credentials: "omit" }).then(function (r) {
        if (r.status === 404) throw new Error("maršrutas neįdiegtas serveryje");
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (d) {
        var g = uzbaik(serveriui, d);
        rez.ok = rez.ok.concat(g.ok); rez.klaidos = rez.klaidos.concat(g.klaidos);
      }).catch(function (e) { rez.klaidos.push({ id: "globalūs", priezastis: (e && e.message) || String(e) }); }));
    }
    return Promise.all(darbai).then(function () { return rez; });
  }

  /* Serverio atsakymas -> { ok, klaidos }. Kiekvienas prašytas rodiklis - arba reikšmė, arba
     priežastis. Anksčiau tuščias atsakymas (200 be rodiklių ir be klaidų) sąsajoje virsdavo
     „jūsų duomenys jau naujausi“ (Q3, 2026-09-26). */
  function uzbaik(ids, d) {
    var ok = ((d && d.rodikliai) || []).map(function (r) {
      r.saltinioUrl = SERIJU_NUORODOS[r.id] || "https://fred.stlouisfed.org/";
      return r;
    });
    var klaidos = ((d && d.klaidos) || []).slice();
    ids.forEach(function (id) {
      var yra = ok.some(function (r) { return r.id === id; }) || klaidos.some(function (k) { return k.id === id; });
      if (!yra) klaidos.push({ id: id, priezastis: "serveris šio rodiklio reikšmės negrąžino" });
    });
    return { ok: ok, klaidos: klaidos };
  }

  global.GP_RINKA = { atnaujink: atnaujink, uzbaik: uzbaik, iSavaitini: iSavaitini, skaitykEurostat: skaitykEurostat, RODIKLIAI: RODIKLIAI,
                      EUROSTAT: EUROSTAT, SERIJU_NUORODOS: SERIJU_NUORODOS, BAZE: BAZE };
})(typeof window !== "undefined" ? window : this);
