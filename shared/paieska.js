/* ============================================================================
 * G-Procure  shared/paieska.js   (window.GP_PAIESKA)
 * Svetainės paieška (2026-11-14, naudotojo užduotis: portalo antraštė ir pagrindinės nuorodos - „ar nereikia paieškos?“).
 * Mygtukas antraštėje ([data-gp-paieska]) ir Ctrl / ⌘ K arba „/“ atveria paieškos langą: ką norite padaryti -> įrankis.
 *   - Įrankiai - iš shared/irankiai.js (GP_IRANKIAI; įkeliamas tik atvėrus, jei puslapis jo dar neturi): pavadinimas,
 *     santrauka, ką daro ir kitos galimybės.
 *   - Darbai - UZDUOTYS žemiau: dažnas pirkimų darbas -> tiksli vieta įrankyje.
 *   - Mano pirkimai - šios naršyklės pirkimų kortelės (tik kai puslapis jungia shared/pirkimo-kortele.js; niekur nesiunčiama).
 *   - Teisės pokyčiai - PP-teise registrai (nacionalinė ir ES teisė; parsisiunčiami iš šios svetainės tik atvėrus).
 *   - BVPŽ kodai - kai įvesti skaitmenys (shared/cpv-data.js įkeliamas tik tada).
 *   - Puslapiai - informaciniai svetainės puslapiai.
 * Ieškoma tik naršyklėje: įvestas tekstas į serverį nesiunčiamas ir niekur neįsimenamas (vienintelė išimtis - pasirinkus
 * „Ieškoti BVPŽ žodyne“ tekstas perduodamas to puslapio adreso daliai po # (ji į serverį nesiunčiama)).
 * Lietuviški linksniai: užklausos žodis atitinka teksto žodį, kai šis prasideda užklausa arba abu turi bendrą kamieną
 * (bendra pradžia ne trumpesnė kaip trumpesnysis žodis be 2 raidžių ir ne trumpesnė kaip 4): „sankcijų“ - „sankcijos“.
 * Stilius įterpiamas pats (jungti <head> dalyje, kad mygtukas nešokinėtų). Dydžiai - tik iš skalės.
 * ========================================================================== */
(function (root) {
  "use strict";
  var doc = root.document;

  /* Svetainės šaknis - iš šio skripto adreso (puslapiai šaknyje ir pakatalogiuose). */
  var SAKNIS = (function () {
    try { var src = doc.currentScript && doc.currentScript.src; return src ? new URL("..", src).href : ""; } catch (e) { return ""; }
  })();
  var CVP_IS = "https://viesiejipirkimai.lt/epps/cft/prepareViewCfTWS.do?resourceId=";   // kaip shared/vpt-duomenys.js (sargas)

  function kalba() { return /^en/i.test(doc.documentElement.getAttribute("lang") || "") ? "en" : "lt"; }
  function L(lt, en) { return kalba() === "en" ? en : lt; }

  /* ---------- Duomenys ---------- */

  /* Darbai: dažnas pirkimų darbas -> vieta įrankyje. irankis - GP_IRANKIAI MODULES id arba SUPPLY ikona.
     kw - papildomi žodžiai paieškai (abiem kalbomis). Naujas darbas - tik į esamą vietą (sargas tikrina failus ir įrankius). */
  var UZDUOTYS = [
    { id: "plano-analize", irankis: "pp-plan", href: "PP-plan/EPSO-G_pirkimu_planavimas_MVP.html",
      lt: "Įkelti ir patikrinti metinį pirkimų planą", en: "Load and check the annual procurement plan",
      kw: "planas MPP metinis Excel CSV importas klaidos plan annual import" },
    { id: "ribos", irankis: "pp-plan", href: "PP-plan/EPSO-G_pirkimu_planavimas_MVP.html",
      lt: "Patikrinti vertės ribas ir to paties tipo pirkimų grupes", en: "Check value thresholds and groups of same-type procurements",
      kw: "ribos riba tarptautinis supaprastintas mažos vertės dalys neplaninis pirkimo būdas thresholds lots unplanned" },
    { id: "bvpz", irankis: "pp-plan", href: "PP-plan/bvpz-kodai.html",
      lt: "Rasti BVPŽ kodą", en: "Find a CPV code",
      kw: "BVPŽ CPV kodas klasifikatorius žodynas code vocabulary" },
    { id: "rinkos-apzvalga", irankis: "pp-market-kpi", href: "PP-market-KPI/EPSO-G_Rinkos_KPI_skydelis.html",
      lt: "Pirkimo rinkos apžvalga: kainos, darbo užmokestis, tiekimas", en: "Market review for a procurement: prices, wages, supply",
      kw: "rinka rodikliai kainos infliacija VKI metalai varis aliuminis darbo užmokestis market indicators prices inflation" },
    { id: "indeksavimas", irankis: "pp-market-kpi", href: "PP-market-KPI/EPSO-G_Rinkos_KPI_skydelis.html",
      lt: "Parengti kainos peržiūros (indeksavimo) sąlygą", en: "Draft a price review (indexation) clause",
      kw: "indeksavimas kainos peržiūra perskaičiavimas formulė sutartis indexation price adjustment clause" },
    { id: "ts-rengti", irankis: "pp-ts", href: "PP-ts/TS_Asistentas.html",
      lt: "Parengti techninę specifikaciją", en: "Draft a technical specification",
      kw: "TS techninė specifikacija reikalavimai technical specification requirements" },
    { id: "ts-tikrinti", irankis: "pp-ts", href: "PP-ts/TS_Asistentas.html",
      lt: "Patikrinti techninę specifikaciją", en: "Check a technical specification",
      kw: "TS patikra auditas prekių ženklai lygiavertis standartai review audit equivalent" },
    { id: "rinkos-konsultacija", irankis: "pp-ts", href: "PP-ts/TS_Asistentas.html",
      lt: "Parengti rinkos konsultaciją", en: "Prepare a market consultation",
      kw: "rinkos konsultacija klausimynas kvietimas suvestinė susitikimas market consultation questionnaire" },
    { id: "kvalifikacija", irankis: "pp-qual", href: "PP-qual/PP-QUAL.html",
      lt: "Nustatyti kvalifikacijos reikalavimus", en: "Set qualification requirements",
      kw: "kvalifikacija patirtis pajamos specialistai proporcingumas metodika qualification experience turnover proportionality" },
    { id: "salygos", irankis: "pp-salygos", href: "PP-salygos/PP-SALYGOS.html",
      lt: "Parengti pirkimo sąlygas", en: "Prepare procurement conditions",
      kw: "sąlygos BPS SPS formos pirkimo dokumentai pasiūlymo forma conditions tender documents forms" },
    { id: "sutartis", irankis: "pp-salygos", href: "PP-salygos/PP-SALYGOS.html",
      lt: "Parengti sutarties projektą", en: "Prepare a draft contract",
      kw: "sutartis sutarties projektas bendrosios specialiosios sąlygos ranga contract draft" },
    { id: "tikrinti-dokumentus", irankis: "pp-salygos", href: "PP-salygos/PP-SALYGOS.html#tikrinti",
      lt: "Patikrinti parengtus dokumentus prieš skelbiant", en: "Check prepared documents before publication",
      kw: "tikrinti patikra parengtis skelbimas nuoseklumas palyginimas forma check readiness consistency publication" },
    { id: "ekonominis-naudingumas", irankis: "pp-cost-benefit", href: "PP-cost-benefit/ekonominio_naudingumo_skaiciuokle.html",
      lt: "Sudaryti ekonominio naudingumo vertinimą", en: "Build a most economically advantageous tender evaluation",
      kw: "vertinimas kriterijai svoriai balai ekonomiškai naudingiausias kokybė metodika MEAT criteria weights scoring" },
    { id: "kna", irankis: "pp-cost-benefit", href: "PP-cost-benefit/kastu_naudos_analize.html",
      lt: "Atlikti kaštų ir naudos analizę", en: "Run a cost-benefit analysis",
      kw: "kaštai nauda KNA NPV investicija alternatyvos cost benefit analysis" },
    { id: "grafikas", irankis: "pp-graphs", href: "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html",
      lt: "Sudaryti pirkimo grafiką ir terminus", en: "Build a procurement schedule and deadlines",
      kw: "grafikas terminai trukmė datos darbo dienos schedule timeline deadlines duration" },
    { id: "protokolas", irankis: "pp-protocols", href: "PP-protocol/LITGRID_Generatorius_v3.html",
      lt: "Parengti komisijos protokolą ir pranešimus tiekėjams", en: "Prepare committee minutes and notices to suppliers",
      kw: "protokolas komisija sprendimas pranešimas raštas laimėtojas atmetimas minutes notice decision" },
    { id: "derybos", irankis: "pp-negotiation", href: "PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html",
      lt: "Pasirengti deryboms", en: "Prepare for negotiations",
      kw: "derybos įkainiai matrica pasiūlymai ribos negotiation unit prices" },
    { id: "pazyma", irankis: "pp-report", href: "PP-report/PP-report.html",
      lt: "Parengti mažos vertės pirkimo pažymą", en: "Prepare a low-value procurement report",
      kw: "pažyma mažos vertės apklausa ataskaita report low value survey" },
    { id: "sesd", irankis: "pp-carbon", href: "PP-carbon/index.html",
      lt: "Įvertinti anglies pėdsaką (ŠESD)", en: "Assess the carbon footprint (GHG)",
      kw: "anglies pėdsakas ŠESD CO2 emisijos žalieji carbon footprint emissions green" },
    { id: "epd", irankis: "epd", href: "PP-carbon/epd.html",
      lt: "Perskaityti tiekėjo EPD", en: "Read a supplier EPD",
      kw: "EPD aplinkosauginė produkto deklaracija GWP environmental product declaration" },
    { id: "sankcijos", irankis: "pp-esg", href: "PP-esg/index.html",
      lt: "Patikrinti tiekėją sankcijų sąrašuose", en: "Screen a supplier against sanctions lists",
      kw: "sankcijos sąrašai ES JT OFAC tiekėjo patikra rizika ESG sanctions screening risk" },
    { id: "tiekejams", irankis: "tiekejams", href: "PP-tiekejams/index.html",
      lt: "Tiekėjui: suprasti pirkimo dokumentus ir užduoti klausimą", en: "For suppliers: understand procurement documents and ask a question",
      kw: "tiekėjas pasiūlymas klausimas CVP IS dokumentai kontrolinis sąrašas supplier bid question checklist" }
  ];
  /* Darbai, rodomi neįvedus užklausos */
  var DAZNI = ["salygos", "tikrinti-dokumentus", "grafikas", "kvalifikacija", "protokolas", "ts-rengti"];

  /* Svetainės puslapiai (ne įrankiai). */
  var PUSLAPIAI = [
    { href: "index.html", lt: "Pradžia - visi įrankiai", en: "Home - all tools",
      aprLt: "G-Procure portalas", aprEn: "The G-Procure portal", kw: "portalas pradžia įrankiai katalogas home portal tools" },
    { href: "G-Procure_Project.html", lt: "Apie G-Procure", en: "About G-Procure",
      aprLt: "Kokia kiekvieno įrankio paskirtis ir kas juos jungia", aprEn: "What each tool is for and what connects them",
      kw: "apie projektas aprašymas about project" },
    { href: "kryptis.html", lt: "Kryptis", en: "Direction",
      aprLt: "Kur link eina G-Procure", aprEn: "Where G-Procure is heading",
      kw: "kryptis vizija strategija ateitis kelias direction vision strategy roadmap future" },
    { href: "pirkimu-korteles.html", lt: "Pirkimų kortelės", en: "Procurement cards",
      aprLt: "Pirkimo duomenys vieną kartą - visiems įrankiams", aprEn: "Procurement data once - for every tool",
      kw: "kortelė kortelės mano pirkimai duomenys card cards my procurements" },
    { href: "PP-teise/index.html", lt: "Pirkimų teisės stebėsena", en: "Procurement law monitoring",
      aprLt: "Kas pasikeitė, kas įsigalios, ką peržiūrėti", aprEn: "What changed, what takes effect, what to review",
      kw: "teisė įstatymas pakeitimai PĮ VPĮ teismų praktika ES direktyva law changes legislation case law" },
    { href: "G-Procure_About.html", lt: "Kūrėjas - Arūnas Jurgelaitis", en: "Creator - Arūnas Jurgelaitis",
      aprLt: "Autorius ir kontaktai", aprEn: "Author and contact details", kw: "kūrėjas autorius kontaktai creator author contact" },
    { href: "ai-valdymas.html", lt: "DI valdymas ir rizikų kontrolė", en: "AI governance and risk control",
      aprLt: "Kaip naudojamas DI ir kas siunčiama", aprEn: "How AI is used and what is sent",
      kw: "DI dirbtinis intelektas AI aktas rizika governance artificial intelligence" },
    { href: "privatumas.html", lt: "Privatumo politika", en: "Privacy policy",
      aprLt: "Kokie duomenys tvarkomi ir kur", aprEn: "What data is processed and where", kw: "privatumas asmens duomenys BDAR privacy GDPR personal data" },
    { href: "slapukai.html", lt: "Slapukų politika", en: "Cookie policy",
      aprLt: "Naršyklės įrašai ir sutikimas", aprEn: "Browser storage and consent", kw: "slapukai sutikimas nustatymai cookies consent settings" },
    { href: "saugumas.html", lt: "Pranešimas apie saugumo spragas", en: "Reporting security vulnerabilities",
      aprLt: "Kaip pranešti apie spragą", aprEn: "How to report a vulnerability", kw: "saugumas spraga pažeidžiamumas security vulnerability" },
    { href: "atsargine-kopija.html", lt: "Atsarginė duomenų kopija", en: "Data backup",
      aprLt: "Išsaugoti ir atkurti savo duomenis", aprEn: "Save and restore your data", kw: "atsarginė kopija atkurti eksportas backup restore export" }
  ];

  /* ---------- Paieška (grynos funkcijos) ---------- */

  function fold(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function zodziai(s) { return fold(s).split(/[^a-z0-9]+/).filter(Boolean); }
  /* Užklausos žodis z atitinka teksto žodį w: w prasideda z arba bendras kamienas (žr. failo pradžią). */
  function atitinka(z, w) {
    if (w.indexOf(z) === 0) return 1;
    if (z.length < 4 || w.length < 4) return 0;
    var n = 0;
    while (n < z.length && n < w.length && z.charAt(n) === w.charAt(n)) n++;
    return n >= Math.max(4, Math.min(z.length, w.length) - 2) ? 0.8 : 0;
  }
  /* Įvertina įrašą: laukai [{ tekstas, svoris, zyme? }]. Kiekvienas užklausos žodis turi atitikti bent vieną lauką (IR).
     Grąžina { balas, zyme } (zyme - lauko, kuriame rasta, žymė; pvz. įrankio galimybė) arba null. */
  function ivertink(uzklausa, laukai) {
    var zz = zodziai(uzklausa);
    if (!zz.length) return null;
    var balas = 0, zyme = null, zymesBalas = 0;
    for (var i = 0; i < zz.length; i++) {
      var geriausias = 0, kur = null;
      for (var j = 0; j < laukai.length; j++) {
        var ww = laukai[j].zodziai || (laukai[j].zodziai = zodziai(laukai[j].tekstas));
        for (var k = 0; k < ww.length; k++) {
          var a = atitinka(zz[i], ww[k]);
          if (a && a * laukai[j].svoris > geriausias) { geriausias = a * laukai[j].svoris; kur = laukai[j]; }
        }
      }
      if (!geriausias) return null;
      balas += geriausias;
      if (kur && kur.zyme && geriausias > zymesBalas) { zyme = kur.zyme; zymesBalas = geriausias; }
    }
    var visa = fold(uzklausa).trim();
    if (visa.length > 2 && laukai.length && fold(laukai[0].tekstas).indexOf(visa) !== -1) balas += 5;
    return { balas: balas, zyme: zyme };
  }
  function lauk(t, svoris, zyme) { return { tekstas: t || "", svoris: svoris, zyme: zyme || null }; }
  function abiKalbos(lt, en, svoris, zyme) {
    var a = L(lt, en), b = L(en, lt);
    return [lauk(a, svoris, zyme), lauk(b, svoris * 0.8, zyme)];
  }

  function irankis(id) {
    var I = root.GP_IRANKIAI;
    if (!I) return null;
    for (var i = 0; i < I.MODULES.length; i++) if (I.MODULES[i].id === id) return I.MODULES[i];
    for (var j = 0; j < I.SUPPLY.length; j++) if (I.SUPPLY[j].ikona === id) return I.SUPPLY[j];
    return null;
  }
  function irankioIkona(t) { var I = root.GP_IRANKIAI; return I && t ? I.IKONOS[t.id || t.ikona] || "" : ""; }

  /* Rezultatų grupės: [{ id, pav, elementai: [{ pav, apr, href, naujas, isorinis, ikona, zyme }] }] */
  function rask(uzklausa, duom) {
    duom = duom || {};
    var q = String(uzklausa || "").trim(), I = root.GP_IRANKIAI, grupes = [];
    function grupe(id, pav, sar, riba) {
      sar.sort(function (a, b) { return b.balas - a.balas; });
      if (sar.length) grupes.push({ id: id, pav: pav, elementai: sar.slice(0, riba) });
    }
    if (!q) {
      grupe("darbai", L("Dažni darbai", "Common tasks"), DAZNI.map(function (id, n) {
        var u = UZDUOTYS.filter(function (x) { return x.id === id; })[0];
        return uzduotiesElementas(u, 10 - n);
      }), 6);
      grupe("korteles", L("Mano pirkimai", "My procurements"), (duom.korteles || []).slice(0, 3).map(function (k, n) { return kortelesElementas(k, 10 - n); }), 3);
      return grupes;
    }
    // Įrankiai
    var irank = [];
    if (I) {
      I.MODULES.concat(I.SUPPLY).forEach(function (t) {
        var laukai = abiKalbos(t.nameLt, t.nameEn, 10)
          .concat([lauk(t.code, 6)])
          .concat(abiKalbos(t.badgeLt, t.badgeEn, 4))
          .concat(abiKalbos(t.sumLt || t.descLt, t.sumEn || t.descEn, 3));
        (t.galiLt || []).concat(t.daugiauLt || []).forEach(function (g, n) {
          var en = (t.galiEn || []).concat(t.daugiauEn || [])[n] || g;
          laukai = laukai.concat(abiKalbos(g, en, 2, L(g, en)));
        });
        laukai = laukai.concat(abiKalbos(t.rezLt, t.rezEn, 2));
        var v = ivertink(q, laukai);
        if (v) irank.push({ balas: v.balas, pav: L(t.nameLt, t.nameEn), apr: L(t.sumLt || t.descLt, t.sumEn || t.descEn),
          zyme: v.zyme, href: t.href, naujas: true, ikona: irankioIkona(t), kodas: t.code });
      });
    }
    grupe("irankiai", L("Įrankiai", "Tools"), irank, 5);
    // Darbai
    var darb = [];
    UZDUOTYS.forEach(function (u) {
      var t = irankis(u.irankis);
      var laukai = abiKalbos(u.lt, u.en, 8).concat([lauk(u.kw, 6)]);
      if (t) laukai = laukai.concat(abiKalbos(t.nameLt, t.nameEn, 3));
      var v = ivertink(q, laukai);
      if (v) darb.push(uzduotiesElementas(u, v.balas));
    });
    grupe("darbai", L("Darbai", "Tasks"), darb, 5);
    // Mano pirkimai
    var kort = [];
    (duom.korteles || []).forEach(function (k) {
      var v = ivertink(q, [lauk(k.pavadinimas, 10), lauk(k.numeris, 8), lauk(k.cvpisNr, 8), lauk(k.santrauka, 2)]);
      if (v) kort.push(kortelesElementas(k, v.balas));
    });
    grupe("korteles", L("Mano pirkimai", "My procurements"), kort, 5);
    // Teisės pokyčiai
    var teis = [];
    (duom.teise || []).forEach(function (r) {
      var v = ivertink(q, [lauk(r.trumpai, 8), lauk(r.pavadinimas, 5), lauk(r.numeriai, 6)]);
      if (v) teis.push({ balas: v.balas, pav: r.trumpai || r.pavadinimas, apr: r.apr,
        href: "PP-teise/index.html" + (r.es ? "?lygmuo=es" : "") + "#irasas=" + encodeURIComponent(r.id), ikona: IKONA_TEISE });
    });
    grupe("teise", L("Teisės pokyčiai", "Legal changes"), teis, 4);
    // BVPŽ kodai (skaitmenys)
    var sk = skaitmenys(q), bk = bvpzSkaitmenys(q);
    if (bk && duom.bvpz) {
      var bv = [];
      for (var i = 0; i < duom.bvpz.length && bv.length < 6; i++) {
        var c = duom.bvpz[i];
        if (c[0].replace(/\D/g, "").indexOf(bk) === 0) {
          bv.push({ balas: 10 - bv.length, pav: c[0] + " " + L(c[1], c[2]), apr: L("BVPŽ kodas", "CPV code"),
            href: "PP-plan/bvpz-kodai.html#q=" + encodeURIComponent(c[0].slice(0, 8)), ikona: IKONA_KODAS });
        }
      }
      grupe("bvpz", L("BVPŽ kodai", "CPV codes"), bv, 6);
    }
    // Puslapiai
    var pusl = [];
    PUSLAPIAI.forEach(function (p) {
      var v = ivertink(q, abiKalbos(p.lt, p.en, 8).concat([lauk(p.kw, 5)]).concat(abiKalbos(p.aprLt, p.aprEn, 2)));
      if (v) pusl.push({ balas: v.balas, pav: L(p.lt, p.en), apr: L(p.aprLt, p.aprEn), href: p.href, ikona: IKONA_PUSLAPIS });
    });
    grupe("puslapiai", L("Puslapiai", "Pages"), pusl, 4);
    // Veiksmai
    var veik = [];
    if (sk && sk.length >= 5 && sk.length <= 9 && !kodasSuKontroliniu(q)) {
      veik.push({ balas: 1, pav: L("Atverti CVP IS pirkimą Nr. " + sk, "Open CVP IS procurement No. " + sk),
        apr: "viesiejipirkimai.lt", href: CVP_IS + sk, naujas: true, isorinis: true, ikona: IKONA_ISORE });
    }
    if (!sk && zodziai(q).join("").length >= 3) {
      veik.push({ balas: 0, pav: L("Ieškoti „" + q + "“ BVPŽ žodyne", "Search the CPV vocabulary for “" + q + "”"),
        apr: L("BVPŽ kodų paieška lietuvių ir anglų kalba", "CPV code search in Lithuanian and English"),
        href: "PP-plan/bvpz-kodai.html#q=" + encodeURIComponent(q), ikona: IKONA_KODAS });
    }
    grupe("veiksmai", L("Kiti veiksmai", "Other actions"), veik, 3);
    return grupes;
  }
  function uzduotiesElementas(u, balas) {
    var t = irankis(u.irankis);
    return { balas: balas, pav: L(u.lt, u.en), apr: t ? L(t.nameLt, t.nameEn) : "", href: u.href, naujas: true, ikona: irankioIkona(t) };
  }
  function kortelesElementas(k, balas) {
    var d = [];
    if (k.numeris) d.push(k.numeris);
    if (k.cvpisNr) d.push("CVP IS " + k.cvpisNr);
    if (k.busenaPav) d.push(k.busenaPav);
    return { balas: balas, pav: k.pavadinimas || L("Be pavadinimo", "Untitled"), apr: d.join(" · "),
      href: "pirkimu-korteles.html#kortele=" + encodeURIComponent(k.id), ikona: IKONA_KORTELE };
  }
  /* Užklausa - tik skaitmenys (BVPŽ kodas su kontroliniu skaitmeniu ar CVP IS numeris): grąžina skaitmenis, kitaip "". */
  function skaitmenys(q) { var s = String(q || "").trim(); return /^[\d\s-]+$/.test(s) ? s.replace(/\D/g, "") : ""; }
  /* BVPŽ kodas su kontroliniu skaitmeniu („45231000-5“) - ne CVP IS numeris. */
  function kodasSuKontroliniu(q) { return /^\s*\d{8}\s*-\s*\d\s*$/.test(String(q || "")); }
  /* Skaitmenys BVPŽ kodo paieškai: 2-8 skaitmenų pradžia arba kodas be kontrolinio skaitmens; kitaip "". */
  function bvpzSkaitmenys(q) {
    var sk = skaitmenys(q);
    if (kodasSuKontroliniu(q)) return sk.slice(0, 8);
    return sk.length >= 2 && sk.length <= 8 ? sk : "";
  }

  var IKONA_TEISE = '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0Z"/><path d="m19 7-3 7a3 3 0 0 0 6 0Z"/><path d="M8 21h8"/>';
  var IKONA_KODAS = '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>';
  var IKONA_PUSLAPIS = '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/>';
  var IKONA_KORTELE = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6"/><path d="M7 14h10"/>';
  var IKONA_ISORE = '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>';
  var IKONA_PAIESKA = '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>';

  /* ---------- Duomenų įkėlimas (tik atvėrus) ---------- */

  function skriptas(kelias) {
    return new Promise(function (res, rej) {
      var s = doc.createElement("script");
      s.src = SAKNIS + kelias; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { rej(new Error(kelias)); };
      doc.head.appendChild(s);
    });
  }
  var irankiaiPazadas = null, teisePazadas = null, bvpzPazadas = null;
  function irankiai() {
    if (root.GP_IRANKIAI) return Promise.resolve();
    return irankiaiPazadas || (irankiaiPazadas = skriptas("shared/irankiai.js").catch(function (e) { irankiaiPazadas = null; throw e; }));
  }
  function teise() {
    if (teisePazadas) return teisePazadas;
    function viena(kelias, es) {
      return root.fetch(SAKNIS + kelias, { credentials: "same-origin" }).then(function (r) {
        if (!r.ok) throw new Error(kelias + ": " + r.status);
        return r.json();
      }).then(function (d) {
        return (d && Array.isArray(d.irasai) ? d.irasai : []).filter(function (r) {
          return r && r.id && r.demo !== true && r.busena !== "archyvuota" && (r.trumpai || r.pavadinimas);
        }).map(function (r) {
          var id = r.identifikatoriai || {}, dat = r.datos || {};
          var data = dat.taikomaNuo || dat.isigalioja || dat.priimta || dat.paskelbta || "";
          return { id: String(r.id), es: es, trumpai: String(r.trumpai || ""), pavadinimas: String(r.pavadinimas || ""),
            numeriai: [id.numeris, id.celex, id.nutartis, id.byla].filter(Boolean).join(" "),
            apr: (es ? L("ES teisė", "EU law") : L("Nacionalinė teisė", "National law")) + (data ? " · " + data : "") };
        });
      });
    }
    teisePazadas = Promise.all([viena("PP-teise/duomenys/registras.json", false), viena("PP-teise/duomenys/registras-es.json", true)])
      .then(function (a) { return a[0].concat(a[1]); })
      .catch(function (e) { teisePazadas = null; throw e; });
    return teisePazadas;
  }
  function bvpz() {
    if (root.GP_CPV_DATA) return Promise.resolve(root.GP_CPV_DATA.codes);
    return bvpzPazadas || (bvpzPazadas = skriptas("shared/cpv-data.js").then(function () { return root.GP_CPV_DATA.codes; })
      .catch(function (e) { bvpzPazadas = null; throw e; }));
  }
  /* Šios naršyklės pirkimų kortelės - tik per shared/pirkimo-kortele.js (jei puslapis jį jungia). */
  function korteles() {
    var K = root.GP_KORTELE;
    if (!K || !K.aktyvios) return [];
    try {
      var s = K.aktyvios();
      return (s.korteles || []).map(function (k) {
        return { id: k.id, pavadinimas: k.pavadinimas, numeris: k.numeris, cvpisNr: k.cvpisNr,
          busenaPav: k.busena && K.busenosPav ? K.busenosPav(k.busena, kalba()) : "",
          santrauka: K.santrauka ? K.santrauka(k, kalba()) : "" };
      });
    } catch (e) { return []; }
  }

  /* ---------- Sąsaja ---------- */

  function mac() { var n = root.navigator || {}; return /Mac|iPhone|iPad/.test(n.platform || n.userAgent || ""); }
  function sparcusis() { return mac() ? "⌘ K" : "Ctrl K"; }

  function stilius() {
    if (doc.getElementById("gpp-stilius")) return;
    var s = doc.createElement("style");
    s.id = "gpp-stilius";
    s.textContent = [
      /* Mygtukas antraštėje: plačiame ekrane - kaip paieškos laukas su sparčiuoju klavišu, siauresniame - tik ikona */
      ".gpp-btn{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 8px 0 12px;border:1px solid var(--color-graphite-15);border-radius:999px;background:var(--color-white);color:var(--color-graphite-50-strong);font-family:var(--font-base);font-size:14px;font-weight:600;line-height:1;cursor:pointer;white-space:nowrap;transition:border-color .18s ease,color .18s ease}",
      ".gpp-btn:hover{border-color:var(--color-emerald);color:var(--color-graphite)}",
      ".gpp-btn:focus-visible{outline:2px solid var(--color-emerald-strong);outline-offset:2px}",
      ".gpp-btn svg{width:16px;height:16px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
      ".gpp-btn__t{min-width:72px;text-align:left}",
      ".gpp-btn__kbd{font-family:var(--font-base);font-size:12px;font-weight:600;color:var(--color-graphite-50-strong);background:var(--color-graphite-5);border:1px solid var(--color-graphite-15);border-radius:6px;padding:2px 6px}",
      "@media (max-width:1180px){.gpp-btn__kbd{display:none}.gpp-btn{padding-right:12px}.gpp-btn__t{min-width:0}}",
      "@media (max-width:1023.98px){.gpp-btn{width:38px;padding:0;justify-content:center}.gpp-btn__t{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}",
      "@media (max-width:640px){.gpp-btn{width:44px;min-height:44px}}",
      "@media print{.gpp-btn{display:none}}",
      /* Langas */
      ".gpp{width:min(640px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 96px));margin:12vh auto auto;padding:0;border:1px solid var(--color-graphite-15);border-radius:16px;background:var(--color-white);color:var(--color-graphite);box-shadow:0 24px 64px rgba(46,54,65,.24);overflow:hidden;font-family:var(--font-base)}",
      ".gpp[open]{display:flex;flex-direction:column}",
      ".gpp::backdrop{background:rgba(46,54,65,.42)}",
      ".gpp__virsus{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 18px;border-bottom:1px solid var(--color-graphite-15)}",
      ".gpp__virsus>svg{width:20px;height:20px;flex-shrink:0;fill:none;stroke:var(--color-emerald-strong);stroke-width:2;stroke-linecap:round}",
      ".gpp__q{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;font-family:var(--font-base);font-size:18px;color:var(--color-graphite);padding:8px 0}",
      ".gpp__q::placeholder{color:var(--color-graphite-50-strong);font-style:italic}",
      /* Laukelio fokuso žymė - linija po paieškos eilute (laukelis be savo rėmelio) */
      ".gpp__virsus:focus-within{box-shadow:inset 0 -2px 0 var(--color-emerald-strong)}",
      ".gpp__q::-webkit-search-cancel-button{display:none}",
      ".gpp__esc{flex-shrink:0;border:1px solid var(--color-graphite-15);border-radius:6px;background:var(--color-graphite-5);color:var(--color-graphite-50-strong);font-family:var(--font-base);font-size:12px;font-weight:700;padding:4px 8px;cursor:pointer}",
      ".gpp__esc:hover{color:var(--color-graphite)}",
      ".gpp__esc:focus-visible{outline:2px solid var(--color-emerald-strong);outline-offset:2px}",
      ".gpp__turinys{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:8px}",
      ".gpp__sar,.gpp__gr{list-style:none;margin:0;padding:0}",
      ".gpp__gp{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--color-graphite-50-strong);padding:12px 10px 6px}",
      ".gpp__o{display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:12px;cursor:pointer;scroll-margin:8px}",
      ".gpp__o[aria-selected=true]{background:var(--color-green-5);box-shadow:inset 3px 0 0 var(--color-emerald-strong)}",
      ".gpp__ik{flex:0 0 32px;width:32px;height:32px;border-radius:8px;background:var(--color-green-5);color:var(--color-emerald-strong);display:inline-flex;align-items:center;justify-content:center}",
      ".gpp__o[aria-selected=true] .gpp__ik{background:var(--color-white)}",
      ".gpp__ik svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}",
      ".gpp__tx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}",
      ".gpp__pav{font-size:14px;font-weight:700;line-height:1.35;color:var(--color-graphite);overflow-wrap:anywhere}",
      ".gpp__apr{font-size:13px;line-height:1.4;color:var(--color-graphite-50-strong);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".gpp__zy{font-size:12px;line-height:1.4;color:var(--color-emerald-strong);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".gpp__nauj{flex-shrink:0;width:16px;height:16px;fill:none;stroke:var(--color-graphite-50-strong);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
      ".gpp__info{font-size:13px;line-height:1.5;color:var(--color-graphite-50-strong);padding:10px}",
      ".gpp__tuscia{font-size:14px;line-height:1.55;color:var(--color-graphite);padding:16px 10px}",
      ".gpp__apacia{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 16px;padding:10px 16px;border-top:1px solid var(--color-graphite-15);background:var(--color-graphite-5);font-size:12px;line-height:1.5;color:var(--color-graphite-50-strong)}",
      ".gpp__apacia kbd{font-family:var(--font-base);font-size:12px;font-weight:700;color:var(--color-graphite);background:var(--color-white);border:1px solid var(--color-graphite-15);border-radius:4px;padding:0 4px}",
      ".gpp-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
      "@media (max-width:640px){.gpp{width:calc(100vw - 16px);max-height:calc(100vh - 16px);margin:8px auto auto;border-radius:12px}.gpp__q{font-size:16px}.gpp__klav{display:none}}",
      "@media (prefers-reduced-motion:reduce){.gpp-btn{transition:none}}"
    ].join("\n");
    (doc.head || doc.documentElement).appendChild(s);
  }

  var D = null;   // lango elementai
  var BUS = { korteles: [], teise: null, teiseKlaida: false, bvpz: null, bvpzKlaida: false, bvpzKrauna: false, irankiaiKlaida: false };
  var REZ = [], AKT = -1, GRYZTI = null, PRANESTI = null;

  function el(tag, cls, tekstas) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (tekstas != null) e.textContent = tekstas;
    return e;
  }
  function svg(vidus, cls) {
    var s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
    if (cls) s.setAttribute("class", cls);
    s.innerHTML = vidus;   // tik šio failo ir GP_IRANKIAI ikonos (ne naudotojo duomenys)
    return s;
  }

  function kurkLanga() {
    if (D) return D;
    var dlg = el("dialog", "gpp");
    dlg.id = "gpp";
    dlg.setAttribute("aria-labelledby", "gpp-pav");
    var virsus = el("div", "gpp__virsus");
    virsus.appendChild(svg(IKONA_PAIESKA));
    var pav = el("label", "gpp-sr"); pav.id = "gpp-pav"; pav.htmlFor = "gpp-q";
    var q = el("input", "gpp__q");
    q.id = "gpp-q"; q.type = "search"; q.autocomplete = "off"; q.spellcheck = false;
    q.setAttribute("role", "combobox"); q.setAttribute("aria-autocomplete", "list"); q.setAttribute("aria-expanded", "true");
    q.setAttribute("aria-controls", "gpp-sar"); q.setAttribute("aria-describedby", "gpp-pagalba");
    var esc = el("button", "gpp__esc", "Esc"); esc.type = "button";
    virsus.appendChild(pav); virsus.appendChild(q); virsus.appendChild(esc);
    var turinys = el("div", "gpp__turinys");
    var sar = el("ul", "gpp__sar"); sar.id = "gpp-sar"; sar.setAttribute("role", "listbox");
    var info = el("p", "gpp__info"); info.id = "gpp-info";
    turinys.appendChild(sar); turinys.appendChild(info);
    var apacia = el("div", "gpp__apacia");
    var klav = el("span", "gpp__klav"); klav.id = "gpp-pagalba";
    var priv = el("span", "gpp__priv");
    apacia.appendChild(klav); apacia.appendChild(priv);
    var gyva = el("div", "gpp-sr"); gyva.setAttribute("aria-live", "polite"); gyva.id = "gpp-gyva";
    dlg.appendChild(virsus); dlg.appendChild(turinys); dlg.appendChild(apacia); dlg.appendChild(gyva);
    doc.body.appendChild(dlg);
    D = { dlg: dlg, q: q, sar: sar, info: info, klav: klav, priv: priv, esc: esc, pav: pav, gyva: gyva, turinys: turinys };

    q.addEventListener("input", function () { piesk(); });
    q.addEventListener("keydown", klavisas);
    esc.addEventListener("click", function () { uzdaryk(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) uzdaryk(); });   // paspaudus šalia lango
    dlg.addEventListener("close", function () {
      if (GRYZTI && doc.contains(GRYZTI)) { try { GRYZTI.focus(); } catch (e) {} }
      GRYZTI = null;
    });
    sar.addEventListener("mousemove", function (e) {
      var o = e.target.closest && e.target.closest(".gpp__o");
      if (o) zymek(+o.getAttribute("data-i"), false);
    });
    sar.addEventListener("click", function (e) {
      var o = e.target.closest && e.target.closest(".gpp__o");
      if (o) atverk(+o.getAttribute("data-i"), e.ctrlKey || e.metaKey);
    });
    tekstai();
    return D;
  }

  function tekstai() {
    if (!D) return;
    D.pav.textContent = L("Ieškoti G-Procure", "Search G-Procure");
    D.q.placeholder = L("pvz., sankcijų patikra, protokolas, 45231000", "e.g. sanctions screening, minutes, 45231000");
    D.sar.setAttribute("aria-label", L("Paieškos rezultatai", "Search results"));
    D.esc.setAttribute("aria-label", L("Uždaryti paiešką", "Close search"));
    D.klav.textContent = "";
    [["↑ ↓", L(" pasirinkti", " select")], ["Enter", L(" atverti", " open")], ["Esc", L(" uždaryti", " close")]].forEach(function (p, n) {
      if (n) D.klav.appendChild(doc.createTextNode(" · "));
      D.klav.appendChild(el("kbd", null, p[0])); D.klav.appendChild(doc.createTextNode(p[1]));
    });
    D.priv.textContent = L("Ieškoma jūsų naršyklėje - įvestas tekstas į serverį nesiunčiamas.",
                           "Search runs in your browser - the text you type is not sent to the server.");
  }

  function piesk() {
    if (!D) return;
    var q = D.q.value, sk = skaitmenys(q);
    if (bvpzSkaitmenys(q) && !BUS.bvpz && !BUS.bvpzKrauna && !BUS.bvpzKlaida) {
      BUS.bvpzKrauna = true;
      bvpz().then(function (c) { BUS.bvpz = c; }, function () { BUS.bvpzKlaida = true; })
        .then(function () { BUS.bvpzKrauna = false; if (D.dlg.open) piesk(); });
    }
    var grupes = rask(q, { korteles: BUS.korteles, teise: BUS.teise || [], bvpz: BUS.bvpz });
    REZ = [];
    D.sar.textContent = "";
    grupes.forEach(function (g, gi) {
      var li = el("li"); li.setAttribute("role", "presentation");
      var gp = el("div", "gpp__gp", g.pav); gp.id = "gpp-g" + gi; gp.setAttribute("role", "presentation");
      var ul = el("ul", "gpp__gr"); ul.setAttribute("role", "group"); ul.setAttribute("aria-labelledby", gp.id);
      g.elementai.forEach(function (x) {
        var i = REZ.length; REZ.push(x);
        var o = el("li", "gpp__o"); o.id = "gpp-o" + i; o.setAttribute("role", "option"); o.setAttribute("aria-selected", "false");
        o.setAttribute("data-i", String(i)); o.setAttribute("data-grupe", g.id);
        var ik = el("span", "gpp__ik"); ik.appendChild(svg(x.ikona || IKONA_PUSLAPIS)); o.appendChild(ik);
        var tx = el("span", "gpp__tx");
        tx.appendChild(el("span", "gpp__pav", x.pav));
        if (x.zyme) tx.appendChild(el("span", "gpp__zy", L("Atitinka: ", "Matches: ") + x.zyme));
        else if (x.apr) tx.appendChild(el("span", "gpp__apr", x.apr));
        if (x.naujas) tx.appendChild(el("span", "gpp-sr", L(" (atsidaro naujame skirtuke)", " (opens in a new tab)")));
        o.appendChild(tx);
        if (x.naujas) o.appendChild(svg(IKONA_ISORE, "gpp__nauj"));
        ul.appendChild(o);
      });
      li.appendChild(gp); li.appendChild(ul); D.sar.appendChild(li);
    });
    // Būsenos po sąrašu: kas dar kraunama ar neįkelta (niekada - „nėra“, kai neįkelta)
    var pastabos = [];
    if (BUS.irankiaiKlaida) pastabos.push(L("Įrankių sąrašo įkelti nepavyko - ieškoma tik darbuose ir puslapiuose.", "The tool list could not be loaded - only tasks and pages are searched."));
    if (q.trim() && BUS.teise === null && !BUS.teiseKlaida) pastabos.push(L("Įkeliami teisės pokyčiai...", "Loading legal changes..."));
    if (q.trim() && BUS.teiseKlaida) pastabos.push(L("Teisės pokyčių įkelti nepavyko - jų rezultatų nėra.", "Legal changes could not be loaded - no results from them."));
    if (BUS.bvpzKrauna && sk) pastabos.push(L("Įkeliamas BVPŽ žodynas...", "Loading the CPV vocabulary..."));
    if (BUS.bvpzKlaida && sk) pastabos.push(L("BVPŽ žodyno įkelti nepavyko.", "The CPV vocabulary could not be loaded."));
    D.info.textContent = pastabos.join(" ");
    D.info.hidden = !pastabos.length;
    var tusc = D.turinys.querySelector(".gpp__tuscia");
    if (tusc) tusc.remove();
    if (!REZ.length) {
      var t = el("p", "gpp__tuscia", q.trim()
        ? L("Pagal „" + q.trim() + "“ nieko nerasta. Pabandykite kitą žodį - pvz., protokolas, grafikas, kvalifikacija.",
            "Nothing found for “" + q.trim() + "”. Try another word - e.g. minutes, schedule, qualification.")
        : L("Įveskite, ką norite padaryti ar rasti.", "Type what you want to do or find."));
      D.turinys.insertBefore(t, D.info);
    }
    D.q.setAttribute("aria-expanded", REZ.length ? "true" : "false");
    zymek(REZ.length ? 0 : -1, false);
    pranesk(q.trim() ? (REZ.length ? L("Rezultatų: ", "Results: ") + REZ.length : L("Nieko nerasta", "Nothing found")) : "");
  }
  function pranesk(t) {
    clearTimeout(PRANESTI);
    PRANESTI = setTimeout(function () { if (D) D.gyva.textContent = t; }, 400);
  }
  function zymek(i, slinkti) {
    AKT = i;
    var oo = D.sar.querySelectorAll(".gpp__o");
    for (var k = 0; k < oo.length; k++) oo[k].setAttribute("aria-selected", k === i ? "true" : "false");
    if (i >= 0 && oo[i]) {
      D.q.setAttribute("aria-activedescendant", oo[i].id);
      if (slinkti) oo[i].scrollIntoView({ block: "nearest" });
    } else D.q.removeAttribute("aria-activedescendant");
  }
  function klavisas(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!REZ.length) return;
      var n = AKT + (e.key === "ArrowDown" ? 1 : -1);
      if (n < 0) n = REZ.length - 1;
      if (n >= REZ.length) n = 0;
      zymek(n, true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (AKT >= 0) atverk(AKT, e.ctrlKey || e.metaKey);
    }
  }
  function adresas(x) { return /^https:/.test(x.href) ? x.href : SAKNIS + x.href; }
  function atverk(i, naujame) {
    var x = REZ[i];
    if (!x) return;
    var href = adresas(x);
    if (x.naujas || naujame) {
      var w = root.open(href, "_blank", "noopener");
      if (w || x.isorinis) { uzdaryk(); return; }
    }
    uzdaryk();
    root.location.assign(href);
  }

  function atidaryk(saltinis) {
    var d = kurkLanga();
    if (d.dlg.open) { d.q.focus(); d.q.select(); return; }
    GRYZTI = saltinis || doc.activeElement;
    BUS.korteles = korteles();
    tekstai();
    d.q.value = "";
    piesk();
    if (d.dlg.showModal) d.dlg.showModal(); else d.dlg.setAttribute("open", "");
    d.q.focus();
    irankiai().then(function () { BUS.irankiaiKlaida = false; if (d.dlg.open) piesk(); },
                    function () { BUS.irankiaiKlaida = true; if (d.dlg.open) piesk(); });
    if (BUS.teise === null) {
      teise().then(function (t) { BUS.teise = t; BUS.teiseKlaida = false; }, function () { BUS.teiseKlaida = true; })
        .then(function () { if (d.dlg.open) piesk(); });
    }
  }
  function uzdaryk() { if (D && D.dlg.open) { if (D.dlg.close) D.dlg.close(); else { D.dlg.removeAttribute("open"); } } }

  function rasomaLauke(t) {
    return t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName || ""));
  }
  function susiek() {
    var kbd = sparcusis();
    [].forEach.call(doc.querySelectorAll("[data-gp-paieska]"), function (b) {
      if (b.getAttribute("data-gpp-susieta")) return;
      b.setAttribute("data-gpp-susieta", "1");
      b.setAttribute("aria-haspopup", "dialog");
      b.setAttribute("aria-keyshortcuts", mac() ? "Meta+K" : "Control+K");
      var k = b.querySelector(".gpp-btn__kbd");
      if (k) k.textContent = kbd;
      b.addEventListener("click", function () { atidaryk(b); });
    });
  }
  function init() {
    susiek();
    doc.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if (k === "k" && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        if (!doc.querySelector("[data-gp-paieska]")) return;
        e.preventDefault();
        atidaryk();   // uždarius fokusas grįžta ten, kur buvo (ne į antraštės mygtuką)
      } else if (k === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !rasomaLauke(e.target) && !(D && D.dlg.open)) {
        if (!doc.querySelector("[data-gp-paieska]")) return;
        e.preventDefault();
        atidaryk();
      }
    });
    // Kalba pasikeitė - atviras langas perpiešiamas ta kalba
    try {
      new MutationObserver(function () { if (D) { tekstai(); if (D.dlg.open) piesk(); } })
        .observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"] });
    } catch (e) {}
  }

  stilius();
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();

  root.GP_PAIESKA = {
    UZDUOTYS: UZDUOTYS, PUSLAPIAI: PUSLAPIAI, DAZNI: DAZNI, CVP_IS: CVP_IS,
    fold: fold, zodziai: zodziai, atitinka: atitinka, ivertink: ivertink, rask: rask, skaitmenys: skaitmenys, bvpzSkaitmenys: bvpzSkaitmenys,
    atidaryk: atidaryk, uzdaryk: uzdaryk,
    /* testams */ _busena: function () { return { REZ: REZ, AKT: AKT, BUS: BUS, D: D }; }
  };
})(window);
