/* ============================================================================
 * PP-market-KPI  osp.js
 * ----------------------------------------------------------------------------
 * Gyva jungtis su Lietuvos statistikos departamento (VDA) atviru OSP servisu.
 * Atnaujina SEPTYNIS C lygmens rodiklius (SSKI ir jo dedamosios, GKI, VKI, VMDU).
 *
 * KODĖL BE SERVERIO. OSP leidžia kreiptis TIESIAI IŠ NARŠYKLĖS būtent iš mūsų
 * adreso: atsakyme yra `Access-Control-Allow-Origin: https://g-procure.com`
 * (patikrinta 2026-09-08). Todėl proxy nereikia, ir modulis lieka vienas .html
 * su vienu pagalbiniu .js.
 *
 * KODĖL PJŪVIAI APRAŠOMI VARDAIS, NE INDEKSAIS. SDMX atsakyme stebėjimo raktas yra
 * „0:2:0:15" - dimensijų pozicijos. Pozicijos kinta, kai departamentas prideda ar
 * pertvarko pjūvius, o vardai laikosi. Todėl ieškom pagal vardą ir, neradę, sakom
 * garsiai, o NEIMAM pirmo pasitaikiusio.
 *
 * DĖMESIO - SERIJOS MIRŠTA TYLIAI. Pasenęs dataflow grąžina HTTP 200 ir korektišką
 * JSON, tik be naujų stebėjimų. Būtent taip 2026-09-08 buvo rastas ir pakeistas VKI
 * šaltinis: `S7R260_M2020121` sustojo ties 2025M12, nors atsakinėjo normaliai.
 * Prieš keičiant bet kurį dataflow ID BŪTINA patikrinti, ar serija dar gyva.
 *
 * Visi žemiau esantys dataflow ID ir pjūviai patikrinti prie šaltinio 2026-09-08,
 * pavadinimai su baze ir pjūviai žodžiais - 2026-10-27.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  var BAZE = "https://osp-rs.stat.gov.lt/ords/ipospp/ospp/rest_json/data/";

  /* Kiekvienam rodikliui - dataflow, pjūvis (dimensijų vardai) ir APRAŠAS žmogui bei sutarčiai:
     oficialus pavadinimas su baze, pjūvis žodžiais, dažnis. Tas pats aprašas naudojamas ir duomenims,
     ir apžvalgos sąlygoje - kodas imamas iš dataflow (`S7R330_M2020121_2` -> S7R330), todėl sutartis
     negali rodyti į kitą rodiklį nei tas, iš kurio ateina reikšmės (2026-10-27 patikra: sąlygoje buvo
     nebeskelbiamas S7R260, o duomenys - iš S7R330). Pavadinimai ir pjūviai perskaityti prie šaltinio
     2026-10-27 (SDMX `structure.name` ir dimensijų reikšmės). */
  var RODIKLIAI = {
    sski:     { flow: "S7R287_M2020423_2", pjuvis: ["Inžineriniai statiniai"],
                pavadinimas: "Statybos sąnaudų elementų kainų indeksai (2021 m. = 100)",
                pjuvisTekstas: "statinių tipas „Inžineriniai statiniai“" },
    sski_med: { flow: "S7R287_M2020424_2", pjuvis: ["Medžiagos ir gaminiai"], dedamoji: true,
                pavadinimas: "Statybos sąnaudų elementų kainų indeksai (2021 m. = 100)",
                pjuvisTekstas: "pagrindinė statybos sąnaudų grupė „Medžiagos ir gaminiai“" },
    sski_mas: { flow: "S7R287_M2020424_2", pjuvis: ["Mašinų ir mechanizmų darbas"], dedamoji: true,
                pavadinimas: "Statybos sąnaudų elementų kainų indeksai (2021 m. = 100)",
                pjuvisTekstas: "pagrindinė statybos sąnaudų grupė „Mašinų ir mechanizmų darbas“" },
    sski_du:  { flow: "S7R287_M2020424_2", pjuvis: ["Darbo užmokestis ir pridėtinės išlaidos"], dedamoji: true,
                pavadinimas: "Statybos sąnaudų elementų kainų indeksai (2021 m. = 100)",
                pjuvisTekstas: "pagrindinė statybos sąnaudų grupė „Darbo užmokestis ir pridėtinės išlaidos“" },
    gki:      { flow: "S7R130_M2020330",   pjuvis: ["Pramonė", "Visa rinka"],
                pavadinimas: "Gamintojų parduotos pramonės produkcijos kainų indeksai (2021 m. = 100)",
                pjuvisTekstas: "ekonominės veiklos rūšis „Pramonė“, rinka „Visa rinka“" },
    vki:      { flow: "S7R330_M2020121_2", pjuvis: ["Visos vartojimo prekės ir paslaugos"],
                pavadinimas: "Vartotojų kainų indeksai (2025 m. = 100)",
                pjuvisTekstas: "„Visos vartojimo prekės ir paslaugos“" },
    /* VMDU departamentas skelbia KETVIRTINIAI, o modulyje C rodiklių tinklelis mėnesinis.
       Ketvirtis pririšamas prie paskutinio jo mėnesio, ir grąžinama ketvirčių istorija
       (`ketvirtine`): modulis ją sudeda į tų mėnesių vietas, kiti mėnesiai lieka nežinomi.
       Iki 2026-10-27 grąžinta tik naujausia reikšmė, o 12 mėn. pokytis skaičiuotas nuo
       iliustracinės reikšmės (patikra K2). Pjūvis - visas šalies ūkis, ne sektorius. */
    vmdu:     { flow: "S3R0050_M3060322",
                pjuvis: ["Bruto", "Lietuvos Respublika", "Šalies ūkis su individualiosiomis įmonėmis", "Vyrai ir moterys"],
                ketvirtinis: true,
                pavadinimas: "Darbo užmokestis (mėnesinis)",
                pjuvisTekstas: "bruto, Lietuvos Respublika, šalies ūkis su individualiosiomis įmonėmis, vyrai ir moterys" }
  };
  /* Paslaugų kainų indeksai skydelyje NEstebimi (reikšmė nesiunčiama) - aprašas tik sutarties sąlygai.
     Ekonominės veiklos rūšį parenka rengėjas (serijoje 64 rūšys). */
  var NESTEBIMI = {
    paslaugu_ki: { flow: "S7R290_M2020910_1", ketvirtinis: true,
                   pavadinimas: "Paslaugų kainų indeksai (2021 m. = 100)",
                   pjuvisTekstas: null }
  };
  /* Aprašai moduliui: { kodas, flow, pavadinimas, pjuvis, daznis, dedamoji }. */
  var APRASAI = {};
  [RODIKLIAI, NESTEBIMI].forEach(function (rink) {
    Object.keys(rink).forEach(function (id) {
      var r = rink[id];
      APRASAI[id] = { kodas: r.flow.split("_")[0], flow: r.flow, pavadinimas: r.pavadinimas,
        pjuvis: r.pjuvisTekstas, daznis: r.ketvirtinis ? "ketvirtinis" : "mėnesinis", dedamoji: !!r.dedamoji };
    });
  });

  // „2026M07" -> „2026-07-01"; „2026K2" -> paskutinis ketvirčio mėnuo („2026-06-01").
  function periodasIIso(p) {
    var m = /^(\d{4})M(\d{1,2})$/.exec(p);
    if (m) return m[1] + "-" + ("0" + m[2]).slice(-2) + "-01";
    var k = /^(\d{4})K(\d)$/.exec(p);
    if (k) return k[1] + "-" + ("0" + (parseInt(k[2], 10) * 3)).slice(-2) + "-01";
    return null;
  }

  function metai() { return new Date().getFullYear(); }

  function imkSrauta(flow) {
    var u = BAZE + encodeURIComponent(flow) +
            "?startPeriod=" + (metai() - 2) + "-01&endPeriod=" + metai() + "-12";
    return fetch(u, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      if (d && d.errors && d.errors.length) throw new Error(d.errors[0].message || "OSP klaida");
      if (!d || !d.dataSets || !d.dataSets[0]) throw new Error("tuščias atsakymas");
      return d;
    });
  }

  /* Iš SDMX atsakymo ištraukia VIENĄ eilutę: [{laikotarpis, reiksme}, ...] didėjimo tvarka. */
  function istraukEilute(d, pjuvis) {
    var dims = d.structure.dimensions.observation;
    var vardai = dims.map(function (dim) {
      return (dim.values || []).map(function (v) { return v.name; });
    });
    var lp = -1;
    for (var i = 0; i < dims.length; i++) if (/aikotarp/.test(dims[i].name || "")) lp = i;
    if (lp < 0) throw new Error("atsakyme nėra laikotarpio dimensijos");

    var obs = d.dataSets[0].observations, eil = [], neSkaiciu = 0;
    Object.keys(obs).forEach(function (k) {
      var idx = k.split(":").map(Number), turi = {};
      for (var i = 0; i < idx.length; i++) if (i !== lp) turi[vardai[i][idx[i]]] = true;
      for (var j = 0; j < pjuvis.length; j++) if (!turi[pjuvis[j]]) return;
      var v = obs[k] && obs[k][0];
      if (typeof v !== "number" || !isFinite(v)) { neSkaiciu++; return; }
      eil.push({ laikotarpis: vardai[lp][idx[lp]], reiksme: v });
    });
    // Pjūvis rastas, bet reikšmės ne skaičiai - tai kita priežastis nei „pjūvis nerastas“ (2026-10-27, patikra V3)
    if (!eil.length && neSkaiciu) throw new Error("šaltinio reikšmės ne skaičiai");
    if (!eil.length) {
      var galimi = [];
      for (var i2 = 0; i2 < dims.length; i2++) if (i2 !== lp) galimi = galimi.concat(vardai[i2].slice(0, 6));
      throw new Error("pjūvis nerastas (" + pjuvis.join(" + ") + "); serijoje yra: " + galimi.join(", "));
    }
    eil.sort(function (a, b) { return a.laikotarpis < b.laikotarpis ? -1 : 1; });
    return eil;
  }

  /* Grazina Promise: { ok: [{id, laikotarpis, reiksme, eilute}], klaidos: [{id, priezastis}] }.
     `kiek` - kiek naujausiu stebejimu grazinti kiekvienam rodikliui (serijos ilgis). */
  function atnaujink(ids, kiek) {
    ids = ids && ids.length ? ids : Object.keys(RODIKLIAI);
    kiek = kiek || 13;
    var kesas = {}, ok = [], klaidos = [];

    function vienas(id) {
      var r = RODIKLIAI[id];
      if (!r) { klaidos.push({ id: id, priezastis: "nėra OSP atitikmens" }); return Promise.resolve(); }
      if (!kesas[r.flow]) kesas[r.flow] = imkSrauta(r.flow);
      return kesas[r.flow].then(function (d) {
        var eil = istraukEilute(d, r.pjuvis);
        var pask = eil[eil.length - 1];
        // Tuščias pjūvis - aiški priežastis, ne techninė „Cannot read properties of undefined“.
        if (!pask) throw new Error("šaltinis šio rodiklio reikšmių negrąžino");
        var iso = periodasIIso(pask.laikotarpis);
        if (!iso) throw new Error("nesuprantamas laikotarpis: " + pask.laikotarpis);
        ok.push({
          id: id,
          laikotarpis: iso,
          osp: pask.laikotarpis,
          reiksme: pask.reiksme,
          // Ketvirtiniam rodikliui - ketvirčių istorija su laikotarpiais (5 ketvirčiai = 12 mėn. pokytis);
          // mėnesiniam - paskutinės `kiek` reikšmės iš eilės.
          eilute: r.ketvirtinis ? null : eil.slice(-kiek).map(function (x) { return x.reiksme; }),
          ketvirtine: r.ketvirtinis ? eil.slice(-5).map(function (x) {
            return { laikotarpis: periodasIIso(x.laikotarpis), osp: x.laikotarpis, reiksme: x.reiksme };
          }).filter(function (x) { return x.laikotarpis; }) : null
        });
      }).catch(function (e) {
        klaidos.push({ id: id, priezastis: (e && e.message) || String(e) });
      });
    }

    return Promise.all(ids.map(vienas)).then(function () {
      return { ok: ok, klaidos: klaidos };
    });
  }

  global.GP_OSP = {
    atnaujink: atnaujink,
    periodasIIso: periodasIIso,
    istraukEilute: istraukEilute,
    RODIKLIAI: RODIKLIAI,
    APRASAI: APRASAI,
    BAZE: BAZE
  };
})(typeof window !== "undefined" ? window : this);
