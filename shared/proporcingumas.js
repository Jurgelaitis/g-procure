/* ============================================================================
 * G-Procure  shared/proporcingumas.js   (GP_PROPORCINGUMAS, 2026-10-07)
 * Kvalifikacijos reikalavimų proporcingumo skaičiavimas pagal VPT Tiekėjo kvalifikacijos reikalavimų nustatymo
 * metodiką - PERKELTA iš PP-qual (iki 2026-10-07 - PP-QUAL.html proporcingumas(), trukmeMen(), vertesRibos()),
 * kad tą patį skaičiavimą naudotų ir PP-salygos pirkimo dokumentų tikrinimas (shared/kvalifikacija.js).
 * Logika nepakeista: Metodikos skaičiai (0,7, 2 kartai, 12 mėn., patirties metai) - GP_TEISE.normos, vertės ribos -
 * shared/thresholds.js, modulio patirties koeficientas (MODULIO_KOEF) - PP-qual rekomendacija, ne teisės norma.
 * Nieko nesaugo ir nesiunčia.
 * ========================================================================== */
(function (global) {
  "use strict";

  /* Modulio rekomendacija patirties koeficientui (NE teisės norma): Metodika leidžia iki 0,7, o didesnės vertės sutartims
     PP-qual siūlo mažiau. Kategorija - pagal vertę (GP_TEISE.vertesKategorija). */
  var MODULIO_KOEF = { didele: "0.3", vidutine: "0.5", maza: "0.7" };
  /* Pirkimo kortelės objekto kodas -> PP-qual objekto rūšis. */
  var KORTELES_OBJEKTAI = { prekes: "Prekės", paslaugos: "Paslaugos (kita)", paslaugos_it: "Paslaugos (IT/IS)", darbai: "Darbai (statyba)", misrus: "Mišrus" };

  /* Sutarties trukmė mėnesiais iš laisvo teksto: „24 mėn. + 12 mėn. opcija“ -> 36, „3 metai“ -> 36, „1,5 metų“ -> 18.
     Pratęsimai sudedami - trukmė skaičiuojama su jais. Datos („2027 m.“) praleidžiamos. null - neatpažinta
     (tada pajamų riba skaičiuojama kaip trumpalaikei). */
  function trukmeMen(tekstas) {
    var t = String(tekstas || "").toLowerCase().replace(/(\d),(\d)/g, "$1.$2");
    var re = /(\d+(?:\.\d+)?)\s*(mėn|men\b|metai|metų|metus|metams|m\.|dien)/g;
    var men = 0, rasta = false, m;
    while ((m = re.exec(t))) {
      var n = parseFloat(m[1]), vnt = m[2];
      if (vnt === "m." && n >= 1900) continue;            // „2027 m.“ - data, ne trukmė
      if (/^m(ė|e)n/.test(vnt)) men += n;
      else if (vnt === "dien") men += n / 30;
      else men += n * 12;
      rasta = true;
    }
    return rasta && men > 0 ? Math.round(men * 10) / 10 : null;
  }

  /* Vertės ribos Metodikos kategorijai: darbams - darbų, prekėms, paslaugoms ir mišriam - prekių ir paslaugų. */
  function vertesRibos(objectType, rezimas) {
    var T = (global.GP_THRESHOLDS || {})[rezimas];
    if (!T) return null;
    var darbai = objectType === "Darbai (statyba)";
    return { maza: darbai ? T.mv_works : T.mv_goods, tarptautine: darbai ? T.intl_works : T.intl_goods,
             darbai: darbai, misrus: objectType === "Mišrus" };
  }

  /* Viskas apie proporcingumą vienoje vietoje - PP-qual skaičiuoklė, AI užklausa, taisyklės, Word priedas ir pirkimo
     dokumentų tikrinimas naudoja tą patį. p = { value, valueCat, objectType, duration }, rezimas - „PI“ / „VPI“. */
  function skaiciuok(p, rezimas) {
    // Neigiama ar nulinė vertė - kaip nenurodyta (iki 2026-09-23 -100 davė neigiamas sumas).
    var N = global.GP_TEISE.normos, v = p.value > 0 ? p.value : 0;
    var ribos = vertesRibos(p.objectType, rezimas);
    var kategorija = global.GP_TEISE.vertesKategorija(v, ribos);
    var men = trukmeMen(p.duration);
    var trukme = global.GP_TEISE.sutartiesTrukme(men);
    var ilgalaike = !!(trukme && trukme.kodas === "ilgalaike");
    var koef = parseFloat(p.valueCat) || parseFloat(MODULIO_KOEF[kategorija ? kategorija.kodas : "vidutine"]);
    var metine = ilgalaike ? v * 12 / men : v;        // didžiausia metinė vertė, kai vykdoma tolygiai
    var tipas = p.objectType || "";
    var laikotarpis = tipas === "Darbai (statyba)" ? { metai: N.patirtiesMetaiDarbai.reiksme, raktas: "met_patirtis_darbai" }
      : tipas === "Mišrus" ? { metai: null, raktas: "met_patirtis_misrus" }
      : tipas ? { metai: N.patirtiesMetaiPrekesPaslaugos.reiksme, raktas: "met_patirtis_prekes_paslaugos" }
      : { metai: null, raktas: null };
    return {
      verte: v, kategorija: kategorija, ribos: ribos, misrus: !!(ribos && ribos.misrus), men: men, trukme: trukme, ilgalaike: ilgalaike,
      patirtis: { koef: koef, rekomenduojama: v * koef, riba: v * N.patirtiesRiba.reiksme },
      pajamos: {
        nenustatomos: !!(kategorija && kategorija.kodas === "maza"),
        istatymoRiba: v * N.pajamuKartai.reiksme,
        metodikosRiba: metine * N.pajamuKartai.reiksme,
        metine: metine,
        pavyzdys36: (ilgalaike && Math.abs(men - 36) < 0.5) ? [v * N.pajamu36men.nuo, v * N.pajamu36men.iki] : null
      },
      laikotarpis: laikotarpis,
      santykiai: !!(kategorija && kategorija.kodas === "didele")
    };
  }

  global.GP_PROPORCINGUMAS = { MODULIO_KOEF: MODULIO_KOEF, KORTELES_OBJEKTAI: KORTELES_OBJEKTAI, trukmeMen: trukmeMen, vertesRibos: vertesRibos, skaiciuok: skaiciuok };
})(typeof window !== "undefined" ? window : this);
