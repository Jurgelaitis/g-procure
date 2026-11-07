/* ============================================================================
 * G-Procure  PP-plan/plano-grupes.js   (window.GP_PLANO_GRUPES)
 *
 * Metinio pirkimų plano suvestinė pagal to paties tipo pirkimų grupes (2026-11-07, naudotojo užduotis - PP-plan
 * pertvarka): kiekvienai įmonei ir grupei - kiek planuojama mažos vertės, supaprastintų ir tarptautinių pirkimų,
 * kiek jų galima pagal įstatymo vertės skaičiavimo taisykles ir kiek dar liko.
 *
 * Taisyklės (PĮ 13 str. 7-10 d., VPĮ 5 str. 7-10 d. - perskaityta e-tar, nuorodos - GP_TEISE):
 *   - to paties tipo prekių ar paslaugų ir darbų dalys sumuojamos, o taikomos nuostatos parenkamos pagal visų dalių
 *     vertę (7 d.);
 *   - kai grupės vertė siekia tarptautinio pirkimo ribą, atskiroms dalims (kiekviena mažesnė už dalių išimties ribą -
 *     GP_THRESHOLDS.DALYS) galima supaprastintas pirkimas (8 d.);
 *   - kai grupės vertė siekia mažos vertės ribą, mažos vertės pirkimas galimas dalims, kurių bendra vertė mažesnė už
 *     mažos vertės ribą (9 d.);
 *   - kai grupės vertė siekia tarptautinio pirkimo ribą, 8 ir 9 d. dalių bendra vertė - ne daugiau kaip 20 % visų dalių
 *     vertės (10 d.).
 * Kaip nustatoma, kurie pirkimai yra „to paties tipo“, - parametras `grupavimas` (žr. GRUPAVIMAS): jį nustato modulis
 * pagal VPT vertės skaičiavimo metodiką. Grynos funkcijos: nieko nesaugo ir nesiunčia, ribos - iš GP_THRESHOLDS.
 * ========================================================================== */
(function (global) {
  "use strict";

  var KAT = { mv: "mv", s: "s", t: "t", cpo: "cpo", dps: "dps" };

  function bvpzSkaitmenys(bvpz) { return String(bvpz == null ? "" : bvpz).replace(/\D/g, "").slice(0, 8); }
  // Žmogaus įrašyti pavadinimai lyginami be raidžių dydžio ir pertekliniai tarpų (2026-11-07, patikra P2-D7: „Pastatas A“ ir
  // „pastatas A “ buvo du objektai), „Taip“ - ir „taip“ (P2-V11: nereguliarus mažąja raide buvo sumuojamas į grupę)
  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(); }
  function taip(v) { return norm(v) === "taip"; }

  /* Grupės raktas. `grupavimas.skaitmenys` - kiek pirmųjų BVPŽ skaitmenų laiko pirkimus to paties tipo (prekėms ir
     paslaugoms); darbai - atskirai (`grupavimas.darbai`: "bvpz" - tais pačiais skaitmenimis, "objektas" - kiekvienas plano
     įrašas atskiras objektas, kol žmogus nesujungė - `p.objektoGrupe`). Žmogaus priskirta grupė (`p.grupe`) - pirmesnė.
     Darbų objektas (vertės skaičiavimo metodikos 22 p.): pagal vieną statinio projektą ar techninę specifikaciją (21.1 p.) -
     sumuojama nepriklausomai nuo laikotarpio (`visuMetu`), panašūs to paties statinio darbai be projekto (21.2 p.,
     `p.objektoPagrindas === "panasus"`) - per finansinius metus; pagrindo nenurodžius - kaip 21.1 p. (sumuojama daugiau) ir pasakoma. */
  function raktas(p, grupavimas) {
    var g = grupavimas || {}, n = g.skaitmenys || 3;
    // Nereguliaraus pobūdžio sutartis, kurios nenumatoma atnaujinti, - jos vertė skaičiuojama atskirai (vertės skaičiavimo metodikos 13 p.)
    if (taip(p.nereguliarus)) return { raktas: "n:" + p.id, kodas: null, nereguliarus: true };
    if (norm(p.grupe)) return { raktas: "z:" + norm(p.grupe), kodas: null, zmogaus: true, pavadinimas: String(p.grupe).replace(/\s+/g, " ").trim() };
    var s = bvpzSkaitmenys(p.bvpz);
    if (p.rusis === "Darbai" && g.darbai === "objektas") {
      var og = norm(p.objektoGrupe), panasus = p.objektoPagrindas === "panasus";
      return og ? { raktas: "o:" + (panasus ? "p:" : "") + og, kodas: null, objektas: true, visuMetu: !panasus,
          pagrindas: panasus ? "panasus" : p.objektoPagrindas === "projektas" ? "projektas" : null }
        : { raktas: "o:" + p.id, kodas: s.length >= n ? s.slice(0, n) : null, objektas: true };
    }
    if (s.length < n || /^0+$/.test(s)) return null;
    return { raktas: "k:" + s.slice(0, n), kodas: s.slice(0, n) };
  }

  /* Ribos grupei: mažos vertės, tarptautinė ir dalių išimties riba pagal įstatymą, rūšį ir vykdytoją
     (VPĮ - ir centrinės valdžios statusas: GP_TAISYKLES.ribos). Socialinės ir kitos specialiosios paslaugos (PĮ 4 priedas,
     VPĮ 2 priedas; `specialiosios`) - tarptautinė riba intl_special (PĮ 12 str. 1 d. 2 p., VPĮ 4 str. 1 d. 2 p.; 2026-11-07, P2-D5). */
  function grupesRibos(rezimas, darbai, vykdytojas, specialiosios) {
    var T = global.GP_THRESHOLDS, R = T && T[rezimas];
    if (!R) return null;
    var rb = global.GP_TAISYKLES ? global.GP_TAISYKLES.ribos(rezimas, darbai ? "darbai" : "prekes", vykdytojas) : null;
    var D = T.DALYS || {};
    return {
      maza: darbai ? R.mv_works : R.mv_goods,
      tarptautine: specialiosios && !darbai && R.intl_special ? R.intl_special : rb ? rb.tarptautine : (darbai ? R.intl_works : R.intl_goods),
      specialiosios: !!(specialiosios && !darbai && R.intl_special),
      dalis: darbai ? D.darbai : D.prekes_paslaugos,
      proc: D.dalisProc || 20
    };
  }

  function suma(a) { return a.reduce(function (s, p) { return s + (p.verte > 0 ? p.verte : 0); }, 0); }

  /* Vienos grupės analizė. items - vienos įmonės (vieno įstatymo) to paties tipo pirkimai.
     kategorija(p) -> "mv" | "s" | "t" | "cpo" | "dps" | null (būdas nenurodytas ar neatpažintas). */
  function analizuok(items, rb, kategorija) {
    var T = suma(items);
    var kat = { mv: [], s: [], t: [], cpo: [], dps: [], be: [] };
    items.forEach(function (p) { var k = kategorija(p); (kat[k] || kat.be).push(p); });
    var sum = {}; Object.keys(kat).forEach(function (k) { sum[k] = suma(kat[k]); });
    var lygis = T >= rb.tarptautine ? "t" : T >= rb.maza ? "s" : "mv";
    var r = { verte: T, lygis: lygis, ribos: rb, kat: kat, sum: sum, pastabos: [], busena: "gerai" };
    // Pirkimas be vertės į sumą nepatenka - grupės lygis ir likučiai gali būti per maži (P2-D6: grupė rodyta tvarkinga)
    var beVertes = items.filter(function (p) { return !(p.verte > 0); });
    if (beVertes.length) r.pastabos.push({ id: "be_vertes", lygis: "tikrinti", items: beVertes });

    // Be būdo - į išimtis įskaičiuojami pagal savo vertę (kaip būtų perkami savo verte), ir tai pasakoma
    var beMv = kat.be.filter(function (p) { return p.verte < rb.maza; });
    var beS = kat.be.filter(function (p) { return p.verte >= rb.maza && p.verte < rb.tarptautine; });
    var mvSum = sum.mv + suma(beMv);
    r.mvSum = mvSum;

    if (lygis === "mv") {
      r.mvLiko = rb.maza - T;                       // kiek dar galima, kol visa grupė lieka mažos vertės
      r.sLiko = null; r.isimtysLiko = null;
      if (items.length > 1 && r.mvLiko < rb.maza * 0.15) r.pastabos.push({ id: "arti_mazos", lygis: "tikrinti" });
    } else {
      // 9 d.: mažos vertės dalių bendra vertė - mažesnė už mažos vertės ribą
      r.mvLiko = rb.maza - mvSum;
      if (mvSum >= rb.maza) r.pastabos.push({ id: "mv_dalys", lygis: "klaida", suma: mvSum });
      else if (rb.maza - mvSum < rb.maza * 0.15 && kat.mv.length) r.pastabos.push({ id: "mv_dalys_arti", lygis: "tikrinti", suma: mvSum });
    }
    if (lygis === "s") {
      r.sLiko = rb.tarptautine - T;                 // kiek dar galima, kol grupė nepasiekia tarptautinės ribos
      if (r.sLiko < rb.tarptautine * 0.1) r.pastabos.push({ id: "arti_tarptautines", lygis: "tikrinti" });
      r.isimtysLiko = null;
    }
    if (lygis === "t") {
      // 8 d.: supaprastinta tvarka - tik dalims, kurių kiekviena mažesnė už dalių išimties ribą; 10 d.: 8 ir 9 d. dalys <= 20 %
      var sVirs = kat.s.concat(beS).filter(function (p) { return p.verte >= rb.dalis; });
      var sDalys = kat.s.concat(beS).filter(function (p) { return p.verte < rb.dalis; });
      var isimtys = suma(sDalys) + mvSum, leidziama = T * rb.proc / 100;
      r.isimtys = isimtys; r.isimtysRiba = leidziama; r.isimtysLiko = leidziama - isimtys;
      r.isimtysProc = T > 0 ? isimtys / T * 100 : 0;
      r.sLiko = null;
      if (sVirs.length) r.pastabos.push({ id: "s_dalis_virs", lygis: "klaida", items: sVirs });
      if (isimtys > leidziama) r.pastabos.push({ id: "isimtys_virs", lygis: "klaida" });
      else if (isimtys > 0 && leidziama - isimtys < leidziama * 0.15) r.pastabos.push({ id: "isimtys_arti", lygis: "tikrinti" });
    }
    if (kat.be.length) r.pastabos.push({ id: "be_budo", lygis: "info", items: kat.be });
    // Skirtingi pirmi 5 BVPŽ skaitmenys - žmogus gali įvertinti, ar tai ne to paties tipo pirkimai (vertės skaičiavimo metodikos 2.7 ir 2.9 p. išimtys)
    var penki = unikalus(items.map(function (p) { return bvpzSkaitmenys(p.bvpz).slice(0, 5); }).filter(function (x) { return x.length === 5; }));
    if (penki.length > 1) r.pastabos.push({ id: "skirtingi_5", lygis: "info", kodai: penki });
    r.busena = r.pastabos.some(function (x) { return x.lygis === "klaida"; }) ? "klaida"
      : r.pastabos.some(function (x) { return x.lygis === "tikrinti"; }) ? "tikrinti" : "gerai";
    return r;
  }

  /* Visas planas: grupės pagal įmonę (įstatymą), rūšį (darbai - atskirai) ir grupavimo taisyklę.
     o: { imone(p) -> { kodas, rezimas, org } | null, kategorija(p), grupavimas, metai(p)?, metaiFiltras? }
     Grąžina { grupes: [...], nepatikrinti: { imone, rusis, bvpz } }. */
  function grupuok(procs, o) {
    var map = {}, nep = { imone: [], rusis: [], bvpz: [] };
    (procs || []).forEach(function (p) {
      if (o.metaiFiltras && o.metai && o.metai(p) !== o.metaiFiltras) return;
      var im = o.imone(p);
      if (!im) { nep.imone.push(p); return; }
      if (p.rusis !== "Prekės" && p.rusis !== "Paslaugos" && p.rusis !== "Darbai") { nep.rusis.push(p); return; }
      var r = raktas(p, o.grupavimas);
      if (!r) { nep.bvpz.push(p); return; }
      var darbai = p.rusis === "Darbai";
      var k = im.kodas + "|" + (darbai ? "d" : "pp") + "|" + r.raktas;
      if (!map[k]) map[k] = { raktas: k, imone: im.kodas, rezimas: im.rezimas, org: im.org, darbai: darbai,
        kodas: r.kodas, zmogaus: !!r.zmogaus, objektas: !!r.objektas, nereguliarus: !!r.nereguliarus, pavadinimas: r.pavadinimas || null,
        visuMetu: !!r.visuMetu, pagrindas: r.pagrindas || null, items: [] };
      map[k].items.push(p);
    });
    var grupes = Object.keys(map).map(function (k) {
      var g = map[k];
      // specialiosios paslaugos - tik kai visi grupės pirkimai tokie; mišri grupė - bendra (mažesnė) riba ir pastaba
      var sp = !g.darbai && g.items.filter(function (p) { return p.rusis === "Paslaugos" && taip(p.specialiosios); }).length;
      g.specialiosios = !!sp && sp === g.items.length;
      var rb = grupesRibos(g.rezimas, g.darbai, g.org, g.specialiosios);
      if (!rb) return null;
      var a = analizuok(g.items, rb, o.kategorija);
      if (sp && !g.specialiosios) { a.pastabos.push({ id: "specialiosios_misri", lygis: "tikrinti" }); if (a.busena === "gerai") a.busena = "tikrinti"; }
      if (g.objektas && g.visuMetu && !g.pagrindas) a.pastabos.push({ id: "objekto_pagrindas", lygis: "info" });
      Object.keys(a).forEach(function (x) { g[x] = a[x]; });
      g.rusys = unikalus(g.items.map(function (p) { return p.rusis; }));
      return g;
    }).filter(Boolean);
    return { grupes: grupes, nepatikrinti: nep };
  }

  function unikalus(a) { var s = {}; return a.filter(function (x) { return s[x] ? false : (s[x] = true); }); }

  /* Neplaninis (ar naujas) pirkimas: kokį pirkimą galima atlikti, pridėjus V eurų prie grupės g (ar naujos grupės, kai
     g - null; tada reikia rezimas, darbai, org). Grąžina { galima: ["mv"|"s"|"t"], lygis, nauja, kodel: [...] }. */
  function naujas(g, V, kontekstas) {
    var rb = g ? g.ribos : grupesRibos(kontekstas.rezimas, kontekstas.darbai, kontekstas.org, kontekstas.specialiosios);
    if (!rb || !(V > 0)) return null;
    var T0 = g ? g.verte : 0, T = T0 + V, mv0 = g ? g.mvSum : 0, is0 = g && g.lygis === "t" ? g.isimtys : 0;
    var out = { verte: T, buvo: T0, lygis: T >= rb.tarptautine ? "t" : T >= rb.maza ? "s" : "mv", ribos: rb, kodel: [] };
    if (out.lygis === "mv") { out.galima = ["mv", "s", "t"]; out.kodel.push("grupe_mv"); return out; }
    var mvGalima = mv0 + V < rb.maza;
    if (out.lygis === "s") {
      out.galima = mvGalima ? ["mv", "s", "t"] : ["s", "t"];
      out.kodel.push(mvGalima ? "mv_dalis_galima" : "mv_dalis_negalima");
      return out;
    }
    // Grupė pasiekia tarptautinę ribą: išimtys (8 ir 9 d.) - kartu ne daugiau kaip 20 % visų dalių vertės (10 d.).
    // Kai grupė ribą pasiekia tik su šiuo pirkimu, ankstesni pirkimai irgi tampa dalimis - jų išimtys perskaičiuojamos.
    // (kaip analizuok(): be būdo mažesni už MV ribą - mažos vertės dalys, kiti - supaprastintos, jei mažesni už dalies ribą)
    var ankstesnes = g ? (g.lygis === "t" ? is0 : g.mvSum + suma(g.kat.s.concat(g.kat.be.filter(function (p) { return p.verte >= rb.maza; }))
      .filter(function (p) { return p.verte < rb.dalis; }))) : 0;
    var leidziama = T * rb.proc / 100;
    var sGalima = V < rb.dalis && ankstesnes + V <= leidziama;
    out.galima = ["t"];
    if (sGalima) out.galima.unshift("s");
    if (sGalima && mvGalima) out.galima.unshift("mv");
    out.isimtys = ankstesnes; out.isimtysRiba = leidziama;
    out.kodel.push(V >= rb.dalis ? "dalis_per_didele" : ankstesnes + V > leidziama ? "isimtys_virs" : "isimtys_galima");
    if (sGalima && !mvGalima) out.kodel.push("mv_dalis_negalima");
    if (g && g.lygis !== "t") {
      out.kodel.push("tampa_tarptautine");
      // Jau suplanuoti pirkimai, kurie su šiuo pirkimu taip pirkti nebegali (P2-D4): supaprastinti, ne mažesni už dalių
      // išimties ribą, - tik tarptautiniu būdu; ir kai jau suplanuotos išimtys pačios viršija 20 %
      out.paveikti = g.kat.s.concat(g.kat.be.filter(function (p) { return p.verte >= rb.maza; })).filter(function (p) { return p.verte >= rb.dalis; });
      if (out.paveikti.length) out.kodel.push("paveikti_s");
      if (ankstesnes > leidziama) out.kodel.push("ankstesnes_virs");
    }
    return out;
  }

  global.GP_PLANO_GRUPES = { raktas: raktas, ribos: grupesRibos, analizuok: analizuok, grupuok: grupuok, naujas: naujas,
    bvpzSkaitmenys: bvpzSkaitmenys, norm: norm, taip: taip, KAT: KAT };
})(typeof window !== "undefined" ? window : this);
