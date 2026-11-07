/* ============================================================================
 * G-Procure  shared/specialiosios-paslaugos.js   (window.GP_SPEC_PASLAUGOS)
 *
 * Socialinės ir kitos specialiosios paslaugos pagal BVPŽ kodus (2026-11-07, PP-plan patikra P2-D5): PĮ 4 priedas ir VPĮ
 * 2 priedas (sąrašai sutampa; perskaityta e-tar 2026-11-07, PĮ ir VPĮ suvestinės redakcijos nuo 2026-11-01). Tokioms
 * paslaugoms tarptautinio pirkimo riba - GP_THRESHOLDS.<PI|VPI>.intl_special (PĮ 12 str. 1 d. 2 p., VPĮ 4 str. 1 d. 2 p.,
 * GP_TEISE „specialiosios_paslaugos“).
 *
 * Tai tik UŽUOMINA: ar perkama paslauga tikrai priklauso priedui, sprendžia žmogus (8 ir 11 eilutėse yra išimtys pagal įstatymo
 * taikymo sritį, o pavienis kodas priede reiškia tik tą kodą). Intervalas „nuo X iki Y“ - visi kodai tarp jų (BVPŽ numeracija
 * hierarchinė). Įstatymo tekste 11 eilutėje įrašyta „794300000-7“ (9 skaitmenys) - laikoma 79430000-7 (krizių valdymo paslaugos).
 * Grynos funkcijos: nieko nesaugo ir nesiunčia.
 * ========================================================================== */
(function (global) {
  "use strict";

  // [eilutė, aprašymas, kodai: "12345678" arba "12345678-87654321"]
  var EILUTES = [
    [1, "Sveikatos, socialinės ir susijusios paslaugos", ["75200000", "75231200", "75231240", "79611000", "79622000", "79624000", "79625000",
      "85000000-85323000", "98133100", "98133000", "98200000", "98500000", "98513000-98514000"]],
    [2, "Administracinės, socialinės, švietimo, sveikatos priežiūros ir kultūros paslaugos", ["85321000", "85322000", "75000000", "75121000",
      "75122000", "75124000", "79995000-79995200", "80000000-80660000", "92000000-92700000", "79950000", "79951000", "79952000", "79952100",
      "79953000", "79954000", "79955000", "79956000"]],
    [3, "Privalomojo socialinio draudimo paslaugos", ["75300000"]],
    [4, "Išmokų paslaugos", ["75310000", "75311000", "75312000", "75313000", "75313100", "75314000", "75320000", "75330000", "75340000"]],
    [5, "Kitos bendruomenės, socialinės ir asmeninės aptarnavimo paslaugos", ["98000000", "98120000", "98132000", "98133110", "98130000"]],
    [6, "Religinės paslaugos", ["98131000"]],
    [7, "Viešbučių ir restoranų paslaugos", ["55100000-55410000", "55521000-55521200", "55520000", "55522000", "55523000", "55524000",
      "55510000", "55511000", "55512000", "55523100"]],
    [8, "Teisinės paslaugos (išskyrus tas, kurioms įstatymas netaikomas)", ["79100000-79140000", "75231100"]],
    [9, "Kitos administracinės ir valdžios paslaugos", ["75100000-75120000", "75123000", "75125000-75131000"]],
    [10, "Paslaugų teikimas bendruomenei", ["75200000-75231000"]],
    [11, "Kalėjimų, visuomenės saugumo ir gelbėjimo paslaugos (išskyrus tas, kurioms įstatymas netaikomas)", ["75231210-75231230",
      "75240000-75252000", "79430000", "98113100"]],
    [12, "Tyrimo ir apsaugos paslaugos", ["79700000-79721000", "79722000", "79723000"]],
    [13, "Tarptautinės paslaugos", ["98900000", "98910000"]],
    [14, "Pašto paslaugos", ["64000000", "64100000", "64110000", "64111000", "64112000", "64113000", "64114000", "64115000", "64116000", "64122000"]],
    [15, "Įvairios paslaugos", ["50116510", "71550000"]]
  ];

  function kodas(bvpz) {
    var s = String(bvpz == null ? "" : bvpz).replace(/\D/g, "");
    return s.length >= 8 ? s.slice(0, 8) : null;
  }

  /* BVPŽ kodas (su kontroliniu skaitmeniu ar be) -> { eilute, aprasas } arba null (nėra priede ar kodas netinkamas). */
  function tikrink(bvpz) {
    var k = kodas(bvpz);
    if (!k) return null;
    var n = +k;
    for (var i = 0; i < EILUTES.length; i++) {
      var e = EILUTES[i];
      for (var j = 0; j < e[2].length; j++) {
        var r = e[2][j].split("-"), nuo = +r[0], iki = +(r[1] || r[0]);
        if (n >= nuo && n <= iki) return { eilute: e[0], aprasas: e[1] };
      }
    }
    return null;
  }

  /* Priedo numeris pagal įstatymą (PĮ - 4 priedas, VPĮ - 2 priedas). */
  function priedas(rezimas) { return rezimas === "VPI" ? 2 : 4; }

  global.GP_SPEC_PASLAUGOS = { tikrink: tikrink, priedas: priedas, EILUTES: EILUTES };
})(typeof window !== "undefined" ? window : this);
