/* ============================================================================
 * G-Procure  shared/korteles-poveikis.js   (window.GP_POVEIKIS)
 * ----------------------------------------------------------------------------
 * KORTELĖS PAKEITIMŲ POVEIKIS KITIEMS ĮRANKIAMS (2026-11-14, krypties 1.2 žingsnis,
 * naudotojo „Pradėkime 1.2: kortelės pakeitimų poveikis kitiems įrankiams“).
 *
 * Kai pirkimo kortelėje pakeičiamas laukas, įrankių rezultatai, sudaryti pagal ankstesnius
 * duomenis, gali nebetikti. Čia - tik taisyklės ir faktai, jokio DI:
 *  - REZULTATAI: kokie įrankių rezultatai susieti su kortele (pirkimo grafikas, vertinimo metodika,
 *    rinkos apžvalgos veiksmai - kortelėje; pirkimo sąlygų juodraščiai - šioje naršyklėje su kortelės id)
 *    ir nuo kurių kortelės laukų jie priklauso;
 *  - poveikis(k, { juodrasciai }): kurie rezultatai sudaryti anksčiau, nei pakeisti nuo jų priklausantys
 *    laukai (pagal kortelės pakeitimų istoriją, shared/pirkimo-kortele.js 1.1), ir tiesioginiai neatitikimai
 *    (pvz. grafiko būdas nebe tas, kuris kortelėje) - su „buvo -> tapo“, data ir šaltiniu;
 *  - IRANKIAI ir naudojantys(laukai): kurie įrankiai skaito pakeistus laukus, bet savo rezultato kortelėje
 *    nesaugo (TS, kvalifikacija, protokolai ir kt.) - tik pasakoma, kad juose parengtus dokumentus verta peržiūrėti;
 *  - kategorijosPokytis(buvo, tapo): pirkimo rūšis pagal vertę prieš ir po (GP_TAISYKLES).
 *
 * Atskaitos laikas rezultatui - kada jis įrašytas į kortelę (kilmė), o jei žmogus pažymėjo, kad poveikį
 * peržiūrėjo (kortelės `poveikisPerziureta`), - vėlesnis iš jų. Įrankio paties įrašyti laukai jo rezultatui
 * poveikiu nelaikomi. Kortelės nekeičia, nieko nesiunčia ir neišsaugo.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var JD_PREF = "gprocure.salygos.juodrastis.";

  /* Įrankiai, kurie skaito kortelę (laukai - kaip modulių GP_KORTELE.mount; sargas shared/testai.html lygina su moduliais),
     ir rezultatai, kuriuos jie saugo kortelėje ar susieja su ja. */
  var IRANKIAI = {
    "pp-graphs": { lt: "Pirkimų grafikų generatorius", en: "Procurement schedule generator", kelias: "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html",
      laukai: ["budas", "bvpz", "iniciatorius", "organizatorius", "pavadinimas", "pradzia", "vykdytojas"] },
    "pp-cost-benefit": { lt: "Ekonominio naudingumo skaičiuoklė", en: "Economic advantage calculator", kelias: "PP-cost-benefit/ekonominio_naudingumo_skaiciuokle.html",
      laukai: ["kriterijus", "objektas", "pavadinimas", "rezimas", "vykdytojas", "dalys"] },
    "pp-kna": { lt: "Kaštų ir naudos analizė", en: "Cost-benefit analysis", kelias: "PP-cost-benefit/kastu_naudos_analize.html",
      laukai: ["budas", "numeris", "objektas", "pavadinimas", "rezimas", "trukmeMen", "verte", "vykdytojas"] },
    "pp-market-kpi": { lt: "Rinkos rodiklių stebėsena", en: "Market indicators monitoring", kelias: "PP-market-KPI/EPSO-G_Rinkos_KPI_skydelis.html",
      laukai: ["objektas", "pavadinimas", "vykdytojas"] },
    "pp-salygos": { lt: "Pirkimo sąlygų generatorius", en: "Procurement conditions generator", kelias: "PP-salygos/PP-SALYGOS.html",
      laukai: ["budas", "bvpz", "nacsaugumas", "objektas", "paskelbimas", "pavadinimas", "rezimas", "verte", "vykdytojas",
               "numeris", "dalys", "trukmeMen", "kriterijus", "kvalifikacija", "zaliasis", "esLesos", "organizatoriausKontaktai", "grafikas", "vertinimas"] },
    "pp-ts": { lt: "TS asistentas", en: "TS assistant", kelias: "PP-ts/TS_Asistentas.html",
      laukai: ["budas", "bvpz", "dalys", "kriterijus", "objektas", "pavadinimas", "rezimas", "trukmeMen", "verte", "vykdytojas", "zaliasis"] },
    "pp-qual": { lt: "Kvalifikaciniai reikalavimai", en: "Qualification requirements", kelias: "PP-qual/PP-QUAL.html",
      laukai: ["dalys", "objektas", "pavadinimas", "rezimas", "trukmeMen", "verte", "vykdytojas", "zaliasis"] },
    "pp-report": { lt: "Tiekėjų apklausos pažyma", en: "Supplier survey report", kelias: "PP-report/PP-report.html",
      laukai: ["budas", "bvpz", "cpo", "cvpisNr", "dalys", "iniciatorius", "kriterijus", "kvalifikacija", "nacsaugumas", "numeris", "organizatorius", "pavadinimas", "rezimas", "verte", "vykdytojas"] },
    "pp-protocol": { lt: "Protokolų generatorius", en: "Protocol generator", kelias: "PP-protocol/LITGRID_Generatorius_v3.html",
      laukai: ["budas", "cpo", "cvpisNr", "dalys", "iniciatorius", "kriterijus", "kvalifikacija", "numeris", "objektas", "pavadinimas", "rezimas", "trukmeMen", "verte", "vykdytojas"] },
    "pp-negotiation": { lt: "Derybų pasirengimo įrankis", en: "Negotiation preparation tool", kelias: "PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html",
      laukai: ["budas", "pavadinimas", "rezimas", "trukmeMen", "verte", "vykdytojas"] }
  };

  /* Rezultatai, susieti su kortele. laukai - kortelės laukai, nuo kurių rezultatas priklauso (ne visi, kuriuos įrankis skaito:
     pvz. grafikui pavadinimas ar iniciatorius - tik dokumento antraštė, kurią įrankis rodo iš kortelės). */
  var REZULTATAI = {
    grafikas: { irankis: "pp-graphs", laukai: ["budas", "pradzia", "vykdytojas", "pasiulymuTerminas", "paskelbimas"],
      lt: "Pirkimo grafikas", en: "Procurement schedule",
      kodelLt: "Grafiko etapai ir trukmės skaičiuojami pagal pirkimo būdą, pradžios datą ir pirkimo vykdytojui taikomą įstatymą; kortelės paskelbimo data ir pasiūlymų terminas lyginami su grafiku.",
      kodelEn: "The schedule stages and durations are calculated from the procurement procedure, the start date and the law applied to the contracting body; the card's publication date and tender deadline are compared with the schedule.",
      veiksmasLt: "Atverkite grafikų generatorių su šia kortele ir įrašykite grafiką iš naujo.", veiksmasEn: "Open the schedule generator with this card and save the schedule again." },
    vertinimas: { irankis: "pp-cost-benefit", laukai: ["kriterijus", "objektas", "rezimas", "dalys"],
      lt: "Vertinimo metodika", en: "Evaluation methodology",
      kodelLt: "Kriterijai ir priedo tekstas priklauso nuo vertinimo kriterijaus, pirkimo objekto, pirkimo objekto dalių ir taikomo įstatymo (priedo teisės nuorodos).",
      kodelEn: "The criteria and the annex text depend on the award criterion, the subject, the lots and the applicable law (legal references in the annex).",
      veiksmasLt: "Atverkite skaičiuoklę su šia kortele, peržiūrėkite kriterijus ir įrašykite metodiką iš naujo.", veiksmasEn: "Open the calculator with this card, review the criteria and save the methodology again." },
    veiksmai: { irankis: "pp-market-kpi", laukai: ["objektas", "pavadinimas", "vykdytojas"],
      lt: "Rinkos apžvalgos veiksmai", en: "Market review actions",
      kodelLt: "Rinkos profilis parenkamas pagal pirkimo objektą ir pavadinimą, profilių rinkinys - pagal pirkimo vykdytoją.",
      kodelEn: "The market profile is chosen from the subject and the title, the set of profiles - from the contracting body.",
      veiksmasLt: "Atverkite rinkos rodiklių stebėseną su šia kortele ir peržiūrėkite apžvalgą.", veiksmasEn: "Open market indicators monitoring with this card and review the analysis." },
    juodrastis: { irankis: "pp-salygos", laukai: IRANKIAI["pp-salygos"].laukai,
      lt: "Pirkimo sąlygų juodraštis", en: "Procurement conditions draft",
      kodelLt: "Pirkimo sąlygose naudojami šie kortelės duomenys; atvėrus juodraštį, pakeisti laukai parodomi kortelės juostoje, o dokumentus reikia sugeneruoti iš naujo.",
      kodelEn: "The procurement conditions use these card data; when the draft is opened, the changed fields are shown in the card bar, and the documents need to be generated again.",
      veiksmasLt: "Atverkite juodraštį, peržiūrėkite pakeistus duomenis ir sugeneruokite dokumentus iš naujo.", veiksmasEn: "Open the draft, review the changed data and generate the documents again." }
  };

  var TXT = {
    lt: { kat: { tarptautinis: "tarptautinis pirkimas", supaprastintas: "supaprastintas pirkimas", mazos_vertes: "mažos vertės pirkimas" },
          neskaidomas: "neskaidomas", dalys: "{n} dalys", daliu: "{n} dalių", dalis1: "{n} dalis", nenurodyta: "(nenurodyta)",
          grafikeBudas: "Grafikas sudarytas būdui", grafikePradzia: "Grafiko pradžia", metodikaKriterijus: "Metodikos vertinimo kriterijus",
          metodikaDalys: "Metodikoje - atskiri kriterijų rinkiniai dalims", korteleje: "kortelėje" },
    en: { kat: { tarptautinis: "international procurement", supaprastintas: "simplified procurement", mazos_vertes: "low-value procurement" },
          neskaidomas: "not divided", dalys: "{n} lots", daliu: "{n} lots", dalis1: "{n} lot", nenurodyta: "(not stated)",
          grafikeBudas: "The schedule was made for the procedure", grafikePradzia: "Schedule start", metodikaKriterijus: "Award criterion of the methodology",
          metodikaDalys: "The methodology has separate criteria sets for lots", korteleje: "on the card" }
  };

  function K() { return global.GP_KORTELE; }
  function kalba(l) { return l === "en" ? "en" : "lt"; }
  function laikoMs(iso) { var t = Date.parse(iso || ""); return isNaN(t) ? null : t; }
  function lygu(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }
  function vienas(v) { return v === null || v === undefined || v === ""; }

  /* Pirkimo sąlygų juodraščiai šioje naršyklėje (PP-salygos juodrastis.js forma): tik aprašas - id, keista, pavadinimas, kortelė, etapas.
     saugykla - kortelių saugykla (GP_KORTELE.saugykla(); testams - netikra). Neperskaitomas - praleidžiamas ir suskaičiuojamas. */
  function juodrasciai(o) {
    o = o || {};
    var s = o.saugykla;
    if (!s) { try { s = global.localStorage; } catch (e) { s = null; } }
    if (!s) return { busena: "neprieinama", sarasas: [], neperskaityta: 0 };
    var out = [], blogi = 0;
    try {
      for (var i = 0; i < s.length; i++) {
        var raktas = s.key(i);
        if (!raktas || raktas.indexOf(JD_PREF) !== 0 || raktas.indexOf(".sugadinta-") >= 0) continue;
        var r = null;
        try { r = JSON.parse(s.getItem(raktas)); } catch (e) { r = null; }
        var id = raktas.slice(JD_PREF.length);
        if (!r || typeof r !== "object" || r.id !== id || !/^[a-z0-9]{4,40}$/.test(id) || !r.meta || typeof r.meta !== "object" || laikoMs(r.keista) === null) { blogi++; continue; }
        out.push({ id: id, keista: String(r.keista), kortele: typeof r.meta.kortele === "string" ? r.meta.kortele : null,
          pavadinimas: String(r.meta.pavadinimas || "").slice(0, 200), etapoPav: String(r.meta.etapoPav || "").slice(0, 120) });
      }
    } catch (e) { return { busena: "neprieinama", sarasas: [], neperskaityta: 0 }; }
    out.sort(function (a, b) { return a.keista < b.keista ? 1 : a.keista > b.keista ? -1 : 0; });
    return { busena: "yra", sarasas: out, neperskaityta: blogi };
  }

  /* Kortelės rezultatai: [{ id, rusis, irankis, kada (atskaitos laikas ISO), sudaryta (kada įrašytas), nuoroda, ... }] */
  function rezultatai(k, o) {
    o = o || {};
    var out = [], km = k.kilme || {}, pz = k.poveikisPerziureta || {};
    function atskaita(id, isoRez) {
      var a = laikoMs(isoRez), b = laikoMs(pz[id]);
      return a === null ? pz[id] || null : (b !== null && b > a ? pz[id] : isoRez);
    }
    function perziureta(id, isoRez) { var a = laikoMs(isoRez), b = laikoMs(pz[id]); return b !== null && (a === null || b > a); }
    if (k.grafikas && Array.isArray(k.grafikas.etapai) && k.grafikas.etapai.length) {
      var gi = (km.grafikas && km.grafikas.laikas) || k.grafikas.sudaryta || "";
      out.push({ id: "grafikas", rusis: "grafikas", irankis: "pp-graphs", sudaryta: gi, kada: atskaita("grafikas", gi), perziureta: perziureta("grafikas", gi) });
    }
    if (k.vertinimas && Array.isArray(k.vertinimas.kriterijai) && k.vertinimas.kriterijai.length) {
      var vi = (km.vertinimas && km.vertinimas.laikas) || k.vertinimas.sudaryta || "";
      out.push({ id: "vertinimas", rusis: "vertinimas", irankis: "pp-cost-benefit", sudaryta: vi, kada: atskaita("vertinimas", vi), perziureta: perziureta("vertinimas", vi) });
    }
    if (Array.isArray(k.veiksmai) && k.veiksmai.length) {
      var vv = "";
      k.veiksmai.forEach(function (v) { [v.atnaujinta, v.data].forEach(function (x) { if (laikoMs(x) !== null && String(x) > vv) vv = String(x); }); });
      out.push({ id: "veiksmai", rusis: "veiksmai", irankis: "pp-market-kpi", sudaryta: vv, kada: atskaita("veiksmai", vv), perziureta: perziureta("veiksmai", vv) });
    }
    ((o.juodrasciai && o.juodrasciai.sarasas) || []).forEach(function (j) {
      if (j.kortele !== k.id) return;
      out.push({ id: "juodrastis:" + j.id, rusis: "juodrastis", irankis: "pp-salygos", sudaryta: j.keista, kada: atskaita("juodrastis:" + j.id, j.keista),
        perziureta: perziureta("juodrastis:" + j.id, j.keista), juodrastis: j });
    });
    return out;
  }

  /* Pakeitimai po atskaitos laiko pagal istoriją (be paties įrankio įrašų): vienam laukui - pirma „buvo“, paskutinė „tapo“; grįžęs - praleidžiamas. */
  function pakeitimaiPo(k, nuo, laukai, irankis) {
    var t0 = laikoMs(nuo), pagal = {}, tvarka = [];
    (k.istorija || []).forEach(function (e) {
      if (e.saltinis === irankis || e.veiksmas === "sukurta") return;
      (e.laukai || []).forEach(function (x) {
        var kada = x.t || e.laikas, t = laikoMs(kada);          // sujungto įrašo laukas - su savo laiku (shared/pirkimo-kortele.js)
        if (t === null || (t0 !== null && t <= t0) || laukai.indexOf(x.l) < 0) return;
        if (x.s && x.s === irankis) return;
        if (!pagal[x.l]) { pagal[x.l] = { l: x.l, buvo: x.buvo, tapo: x.tapo, laikas: kada, saltinis: x.s || e.saltinis, modulis: e.modulis || "" }; tvarka.push(x.l); }
        else { pagal[x.l].tapo = x.tapo; pagal[x.l].laikas = kada; pagal[x.l].saltinis = x.s || e.saltinis; pagal[x.l].modulis = e.modulis || ""; }
      });
    });
    return tvarka.map(function (f) { return pagal[f]; }).filter(function (p) {
      return ["dalys", "grafikas", "vertinimas"].indexOf(p.l) >= 0 || !lygu(p.buvo, p.tapo);
    });
  }

  function daliuSk(dalys) { return Array.isArray(dalys) ? dalys.length : null; }
  function daliuTekstas(n, l) {
    var t = TXT[kalba(l)];
    if (n === 0) return t.neskaidomas;
    if (n === null || n === undefined) return t.nenurodyta;
    var d = n % 100, v = n % 10;
    return (l === "en" ? (n === 1 ? t.dalis1 : t.dalys) : v === 1 && d !== 11 ? t.dalis1 : v >= 2 && v <= 9 && (d < 10 || d >= 20) ? t.dalys : t.daliu).replace("{n}", n);
  }
  /* Tiesioginiai neatitikimai tarp rezultato ir kortelės (nepriklauso nuo istorijos - tinka ir senoms kortelėms). */
  function neatitikimai(k, r, l) {
    var out = [], t = TXT[kalba(l)], KK = K();
    if (r.rusis === "grafikas") {
      var g = k.grafikas;
      if (g.budas && k.budas && g.budas !== k.budas)
        out.push({ l: "budas", tekstas: t.grafikeBudas, rezultate: KK.reiksmesTekstas("budas", g.budas, l) || g.budas, kortele: KK.reiksmesTekstas("budas", k.budas, l) || k.budas });
      if (g.pradzia && k.pradzia && g.pradzia !== k.pradzia)
        out.push({ l: "pradzia", tekstas: t.grafikePradzia, rezultate: g.pradzia, kortele: k.pradzia });
    }
    if (r.rusis === "vertinimas") {
      var v = k.vertinimas;
      if (v.kriterijus && k.kriterijus && v.kriterijus !== k.kriterijus)
        out.push({ l: "kriterijus", tekstas: t.metodikaKriterijus, rezultate: KK.reiksmesTekstas("kriterijus", v.kriterijus, l), kortele: KK.reiksmesTekstas("kriterijus", k.kriterijus, l) });
      var vd = Array.isArray(v.dalys) ? v.dalys.length : 0, kd = daliuSk(k.dalys);
      if (vd >= 2 && kd !== null && kd !== vd)
        out.push({ l: "dalys", tekstas: t.metodikaDalys, rezultate: daliuTekstas(vd, l), kortele: daliuTekstas(kd, l) });
    }
    return out;
  }

  /* Pagrindinė funkcija: kortelės rezultatai, kuriuos paveikė vėlesni pakeitimai. o: { juodrasciai: juodrasciai(), kalba }.
     -> { rezultatai: [{ id, rusis, irankis, pavadinimas, kodel, veiksmas, sudaryta, kada, pakeitimai, neatitikimai, nuoroda, juodrastis }],
          visi: [... visi susieti rezultatai, ir nepaveikti], juodrasciuBusena } */
  function poveikis(k, o) {
    o = o || {};
    var l = kalba(o.kalba), out = [], visi = [];
    if (!k || !k.id || !K()) return { rezultatai: out, visi: visi, juodrasciuBusena: o.juodrasciai ? o.juodrasciai.busena : "neikelta" };
    rezultatai(k, o).forEach(function (r) {
      var R = REZULTATAI[r.rusis], I = IRANKIAI[R.irankis];
      var x = { id: r.id, rusis: r.rusis, irankis: R.irankis, irankioPav: I[l], pavadinimas: R[l], kodel: R[l === "en" ? "kodelEn" : "kodelLt"],
        veiksmas: R[l === "en" ? "veiksmasEn" : "veiksmasLt"], sudaryta: r.sudaryta, kada: r.kada,
        pakeitimai: pakeitimaiPo(k, r.kada, R.laukai, R.irankis), neatitikimai: neatitikimai(k, r, l),
        nuoroda: r.rusis === "juodrastis" ? I.kelias + "?juodrastis=" + encodeURIComponent(r.juodrastis.id) + "&kortele=" + encodeURIComponent(k.id)
          : I.kelias + "?kortele=" + encodeURIComponent(k.id) };
      if (r.juodrastis) x.juodrastis = r.juodrastis;
      // žmogus pažymėjo, kad peržiūrėjo (po rezultato) - esami neatitikimai priimti; vėlesni pakeitimai vis tiek rodomi
      if (r.perziureta) x.neatitikimai = [];
      // neatitikimas, kurį jau parodo pakeitimas tame pačiame lauke, nekartojamas
      x.neatitikimai = x.neatitikimai.filter(function (n) { return !x.pakeitimai.some(function (p) { return p.l === n.l; }); });
      x.paveiktas = !!(x.pakeitimai.length || x.neatitikimai.length);
      visi.push(x);
      if (x.paveiktas) out.push(x);
    });
    return { rezultatai: out, visi: visi, juodrasciuBusena: o.juodrasciai ? o.juodrasciai.busena : "neikelta" };
  }

  /* Įrankiai, kurie skaito šiuos laukus, bet rezultato kortelėje nesaugo (be tų, kurių rezultatai jau susieti su kortele). */
  function naudojantys(laukai, o) {
    o = o || {};
    var l = kalba(o.kalba), be = o.be || [];
    return Object.keys(IRANKIAI).filter(function (id) {
      return be.indexOf(id) < 0 && IRANKIAI[id].laukai.some(function (f) { return laukai.indexOf(f) >= 0; });
    }).map(function (id) {
      return { id: id, pavadinimas: IRANKIAI[id][l], kelias: IRANKIAI[id].kelias,
        laukai: IRANKIAI[id].laukai.filter(function (f) { return laukai.indexOf(f) >= 0; }) };
    });
  }

  /* Pirkimo rūšis pagal vertę prieš ir po pakeitimo (GP_TAISYKLES.kategorija); be taisyklių ar nežinoma - null. */
  function kategorijosPokytis(buvo, tapo, l) {
    var T = global.GP_TAISYKLES;
    if (!T || !buvo || !tapo) return null;
    var a = T.kategorija(buvo), b = T.kategorija(tapo);
    if (!a || !b || !a.kodas || !b.kodas || a.kodas === b.kodas) return null;
    var t = TXT[kalba(l)];
    return { buvo: a.kodas, tapo: b.kodas, buvoTekstas: t.kat[a.kodas], tapoTekstas: t.kat[b.kodas] };
  }

  /* Pakeitimo tekstas: „Būdas: A → B (2026-11-14, Kortelių puslapis)“ - visos dalys tekstu (rodoma per textContent). */
  function pakeitimoTekstas(p, l) {
    var KK = K(), d = KK.irasoData ? KK.irasoData(p.laikas) : String(p.laikas || "").slice(0, 10);
    var s = p.saltinis === "modulis" && p.modulis ? KK.saltinioPav("modulis", l) + " „" + p.modulis + "“" : KK.saltinioPav(p.saltinis, l);
    return KK.laukoPav(p.l, l) + ": " + KK.istorijosTekstas(p.l, p.buvo, l) + " → " + KK.istorijosTekstas(p.l, p.tapo, l) + " (" + d + ", " + s + ")";
  }
  function neatitikimoTekstas(n, l) {
    return n.tekstas + ": " + n.rezultate + "; " + TXT[kalba(l)].korteleje + " - " + n.kortele;
  }

  global.GP_POVEIKIS = {
    version: "1.0",
    IRANKIAI: IRANKIAI, REZULTATAI: REZULTATAI, JD_PREF: JD_PREF,
    juodrasciai: juodrasciai, rezultatai: rezultatai, pakeitimaiPo: pakeitimaiPo, neatitikimai: neatitikimai,
    poveikis: poveikis, naudojantys: naudojantys, kategorijosPokytis: kategorijosPokytis,
    pakeitimoTekstas: pakeitimoTekstas, neatitikimoTekstas: neatitikimoTekstas, daliuTekstas: daliuTekstas
  };
})(typeof window !== "undefined" ? window : this);
