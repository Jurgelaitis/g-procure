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

  /* ECB euro referencinis kursas - kiek JAV dolerių už 1 eurą (2026-11-19). Mėnesio vidurkis - mėnesiniams rodikliams (metalai, dujos,
     geležies rūda), dienos kursas - savaitiniams (nafta). Be rakto, `Access-Control-Allow-Origin: *` (patikrinta 2026-11-19), todėl tiesiai
     iš naršyklės. Naudoti galima nemokamai nurodant šaltinį ir nekeičiant statistikos (ESCB pakartotinio naudojimo politika:
     „Source: ECB statistics.“). Kursas tik perskaičiuoja dolerių kainą eurais - rodiklių būsenos ir ribos jo nenaudoja. */
  var ECB = {
    menesio: "https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A?format=jsondata&detail=dataonly&startPeriod=",
    dienos: "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?format=jsondata&detail=dataonly&startPeriod=",
    saltinis: "ECB - euro reference exchange rate, US dollar (EXR M.USD.EUR.SP00.A, D.USD.EUR.SP00.A)",
    url: "https://data.ecb.europa.eu/data/datasets/EXR/EXR.M.USD.EUR.SP00.A"
  };

  /* Eurostat Comext (DS-045409 „EU trade since 1988 by HS2-4-6 and CN8“): ES importas iš ne ES šalių pagal prekių kodą ir kilmės šalį
     (2026-11-19). `Access-Control-Allow-Origin: *`, be rakto, CC BY 4.0. Duomenys vėluoja apie 6-8 savaites, atnaujinami kartą per mėnesį.
     Kodai - LITGRID tiekėjų rinkų prekės (pavadinimai ir priskyrimas profiliams - modulyje, IMPORTO_PREKES ir IMPORTO_PROFILIAI);
     patikrinti pagal Comext atsakymo pavadinimus 2026-11-19. Trys grupės - trys nedidelės užklausos (visos kilmės šalys, ~30 mėn.):
     viena bendra truko ~13 s ir svėrė ~360 KB. */
  var COMEXT = {
    url: "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409?freq=M&reporter=EU27_2020&flow=1&indicators=VALUE_IN_EUROS&sinceTimePeriod=",
    grupes: [["850422", "850423", "8535", "853720"], ["854460", "7614", "8546", "730820"], ["853710", "851762", "8471"]],
    saltinis: "Eurostat - EU trade since 1988 by HS2-4-6 and CN8 (DS-045409), EU27 imports from extra-EU partners",
    url2: "https://ec.europa.eu/eurostat/web/international-trade-in-goods/database"
  };
  var ES27 = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
  // Comext specialūs partnerių kodai (atviroji jūra, laivų atsargos, nenurodytos šalys) - ne šalys; QA - Kataras, todėl ne visi Q*
  var NE_SALYS = ["QP", "QQ", "QR", "QS", "QU", "QV", "QW", "QX", "QY", "QZ"];

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

  function menuo(d, kiek) { var x = new Date(d.getFullYear(), d.getMonth() + kiek, 1); return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2); }
  function diena(d, kiek) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + kiek); return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); }
  function imkJson(u) {
    return fetch(u, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /* SDMX-JSON (ECB) -> [{ laikotarpis:"2026-10-01" | "2026-11-18", reiksme }]. Viena serija; kursas - teigiamas skaičius; kitokia sandara -
     klaida, ne tuščias sąrašas („kursas nežinomas“ ir „kurso nėra“ - ne tas pats). */
  function skaitykEcb(d) {
    var s = d && d.dataSets && d.dataSets[0] && d.dataSets[0].series;
    var raktai = s ? Object.keys(s) : [];
    var obsDim = d && d.structure && d.structure.dimensions && d.structure.dimensions.observation;
    var laikai = Array.isArray(obsDim) && obsDim[0] && obsDim[0].values;
    if (raktai.length !== 1 || !Array.isArray(laikai)) throw new Error("ECB: netikėta dimensijų sandara");
    var obs = s[raktai[0]].observations || {};
    var rez = [];
    Object.keys(obs).forEach(function (i) {
      var v = Array.isArray(obs[i]) ? obs[i][0] : null, per = laikai[Number(i)] && laikai[Number(i)].id;
      if (typeof v !== "number" || !isFinite(v) || v <= 0 || typeof per !== "string") return;
      if (/^\d{4}-\d{2}$/.test(per)) rez.push({ laikotarpis: per + "-01", reiksme: v });
      else if (/^\d{4}-\d{2}-\d{2}$/.test(per)) rez.push({ laikotarpis: per, reiksme: v });
    });
    if (!rez.length) throw new Error("ECB: tuščias atsakymas");
    return rez.sort(function (a, b) { return a.laikotarpis < b.laikotarpis ? -1 : 1; });
  }
  /* { menesio:[...30 mėn.], dienos:[...120 d.], saltinis, url } - abi eilutės arba klaida (be vienos iš jų perskaičiavimas būtų tik dalinis). */
  function imkEcb(dabar) {
    var d = dabar ? new Date(dabar) : new Date();
    return Promise.all([imkJson(ECB.menesio + menuo(d, -30)).then(skaitykEcb), imkJson(ECB.dienos + diena(d, -120)).then(skaitykEcb)])
      .then(function (x) { return { menesio: x[0], dienos: x[1], saltinis: ECB.saltinis, url: ECB.url }; });
  }

  /* JSON-stat (Comext) -> { kodas: santrauka }. Santrauka - per paskutinius 12 mėnesių su duomenimis ir 12 prieš juos:
     ne ES importo vertė (EUR), didžiausia ne ES kilmės šalis ir jos dalis, jos dalis prieš metus, Kinijos dalis ir trys didžiausios šalys.
     Mėnuo be reikšmės - 0 (Comext neskelbia nulinių langelių); ankstesnis langas, kurio mėnesių atsakyme nėra, - null („nežinoma“, ne 0). */
  function skaitykComext(d) {
    var ids = d && d.id, dydziai = d && d.size, dim = d && d.dimension, v = d && d.value;
    if (!Array.isArray(ids) || !Array.isArray(dydziai) || !dim || !v || ids.length !== dydziai.length) throw new Error("Comext: netikėta dimensijų sandara");
    ["partner", "product", "time"].forEach(function (k) {
      if (ids.indexOf(k) < 0 || !dim[k] || !dim[k].category || !dim[k].category.index) throw new Error("Comext: netikėta dimensijų sandara");
    });
    ids.forEach(function (id, i) { if (["partner", "product", "time"].indexOf(id) < 0 && dydziai[i] !== 1) throw new Error("Comext: netikėta dimensijų sandara"); });
    var zingsnis = {}, k = 1;
    for (var i = ids.length - 1; i >= 0; i--) { zingsnis[ids[i]] = k; k *= dydziai[i]; }
    var partneriai = dim.partner.category.index, prekes = dim.product.category.index, laikai = dim.time.category.index;
    var pLab = dim.partner.category.label || {}, prLab = dim.product.category.label || {};
    var men = Object.keys(laikai).filter(function (x) { return /^\d{4}-\d{2}$/.test(x); }).sort();
    function reiksme(p, pr, t) {
      var x = v[partneriai[p] * zingsnis.partner + prekes[pr] * zingsnis.product + laikai[t] * zingsnis.time];
      return typeof x === "number" && isFinite(x) && x > 0 ? x : 0;
    }
    var salys = Object.keys(partneriai).filter(function (p) { return /^[A-Z]{2}$/.test(p) && ES27.indexOf(p) < 0 && NE_SALYS.indexOf(p) < 0; });
    var rez = {};
    if (partneriai.EXT_EU27_2020 === undefined) throw new Error("Comext: nėra ne ES importo sumos");
    var dalis = function (x) { return Math.round(x * 10000) / 10000; };
    Object.keys(prekes).forEach(function (pr) {
      var su = men.filter(function (t) { return reiksme("EXT_EU27_2020", pr, t) > 0; });
      if (!su.length) return;
      var ikiI = men.indexOf(su[su.length - 1]);
      /* Langas žinomas tik tada, kai duomenys yra ir pirmą, ir paskutinį jo mėnesį: eilutė, prasidėjusi lango viduryje (ar atsakymas, nepasiekiantis
         lango pradžios), duotų dalį iš kelių mėnesių kaip metinę (rado testas: 3 mėn. iš 12 - „prieš metus 60 %“). Tarpinis mėnuo be duomenų - 0. */
      function langas(nuoI) {
        if (nuoI < 0) return null;
        var ms = men.slice(nuoI, nuoI + 12);
        if (ms.length < 12 || !(reiksme("EXT_EU27_2020", pr, ms[0]) > 0) || !(reiksme("EXT_EU27_2020", pr, ms[11]) > 0)) return null;
        var viso = ms.reduce(function (a, t) { return a + reiksme("EXT_EU27_2020", pr, t); }, 0);
        if (!(viso > 0)) return null;
        var pagal = {};
        salys.forEach(function (s) { pagal[s] = ms.reduce(function (a, t) { return a + reiksme(s, pr, t); }, 0) / viso; });
        return { viso: viso, nuo: ms[0], iki: ms[ms.length - 1], pagal: pagal };
      }
      var dab = langas(ikiI - 11);
      if (!dab) return;
      var ank = langas(ikiI - 23);
      var eile = salys.filter(function (s) { return dab.pagal[s] > 0; }).sort(function (a, b) { return dab.pagal[b] - dab.pagal[a]; });
      if (!eile.length) return;
      rez[pr] = {
        kodas: pr, pav: String(prLab[pr] || "").slice(0, 300), nuo: dab.nuo, iki: dab.iki, neEs: Math.round(dab.viso),
        top: { salis: eile[0], pav: String(pLab[eile[0]] || eile[0]).slice(0, 80), dalis: dalis(dab.pagal[eile[0]]) },
        topAnkst: ank ? dalis(ank.pagal[eile[0]] || 0) : null,
        kinija: dalis(dab.pagal.CN || 0), kinijaAnkst: ank ? dalis(ank.pagal.CN || 0) : null,
        salys: eile.slice(0, 3).map(function (s) { return { salis: s, pav: String(pLab[s] || s).slice(0, 80), dalis: dalis(dab.pagal[s]) }; })
      };
    });
    return rez;
  }
  /* Grupės nepriklausomos: vienos klaida - įrašas klaidose, kitų rezultatai lieka. { kodai, klaidos } */
  function imkImporta(dabar) {
    var d = dabar ? new Date(dabar) : new Date(), rez = { kodai: {}, klaidos: [] };
    return Promise.all(COMEXT.grupes.map(function (g) {
      return imkJson(COMEXT.url + menuo(d, -28) + g.map(function (x) { return "&product=" + x; }).join("")).then(function (j) {
        var s = skaitykComext(j);
        g.forEach(function (kodas) { if (s[kodas]) rez.kodai[kodas] = s[kodas]; else rez.klaidos.push({ id: "importas", priezastis: "Comext: kodo " + kodas + " duomenų nėra" }); });
      }).catch(function (e) { rez.klaidos.push({ id: "importas", priezastis: (e && e.message) || String(e) }); });
    })).then(function () { return rez; });
  }

  /* Grazina Promise: { ok:[{id, laikotarpis, reiksme, daznis, eilute}], klaidos:[{id, priezastis}] }.
     Šaltiniai nepriklausomi: Eurostat klaida nestabdo serverio rodiklių ir atvirkščiai (serverio klaida - vienas įrašas „globalūs“). */
  /* opt.valiuta - ir ECB kursas (rez.valiuta), opt.importas - ir Comext importo kilmė (rez.importas); jų klaidos - id „eur_usd“ ir „importas“. */
  function atnaujink(ids, opt) {
    ids = (ids && ids.length ? ids : Object.keys(RODIKLIAI)).filter(function (x) { return RODIKLIAI[x]; });
    var tiesiai = ids.filter(function (x) { return EUROSTAT[x]; }), serveriui = ids.filter(function (x) { return !EUROSTAT[x]; });
    var rez = { ok: [], klaidos: [] };
    var darbai = tiesiai.map(function (id) {
      return imkEurostat(id).then(function (r) { rez.ok.push(r); }, function (e) { rez.klaidos.push({ id: id, priezastis: (e && e.message) || String(e) }); });
    });
    if (opt && opt.valiuta) darbai.push(imkEcb().then(function (v) { rez.valiuta = v; }, function (e) { rez.klaidos.push({ id: "eur_usd", priezastis: (e && e.message) || String(e) }); }));
    if (opt && opt.importas) darbai.push(imkImporta().then(function (x) { rez.importas = x.kodai; rez.klaidos = rez.klaidos.concat(x.klaidos); }));
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
                      EUROSTAT: EUROSTAT, SERIJU_NUORODOS: SERIJU_NUORODOS, BAZE: BAZE,
                      skaitykEcb: skaitykEcb, imkEcb: imkEcb, skaitykComext: skaitykComext, imkImporta: imkImporta, ECB: ECB, COMEXT: COMEXT };
})(typeof window !== "undefined" ? window : this);
