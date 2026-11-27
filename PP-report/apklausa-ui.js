/* ============================================================================
 * G-Procure  PP-report/apklausa-ui.js   (window.GP_APKLAUSA_UI)
 * ----------------------------------------------------------------------------
 * Elektroninė apklausa (2026-11-26) - iniciatoriaus vaizdai pažymos įrankyje (PP-report.html): apklausų sąrašas, naujos apklausos
 * forma, kvietimai tiekėjams, pasiūlymų įkėlimas, atvėrimas pasibaigus terminui, palyginimas ir sprendimas, pirkimo pažymos (1 priedo)
 * užpildymas. Serverio nėra: kvietimą ir pasiūlymą el. paštu siunčia žmonės, įrankis juos paruošia ir perskaito.
 *
 * Principai: pasiūlymų turinys nerodomas, kol jie neatverti (atveriama pasibaigus terminui arba kai pasiūlymus pateikė visi kviesti
 * tiekėjai); pasiūlymų eilę sudaro taisyklės (GP_APKLAUSA.vertink), ne dirbtinis intelektas; atitiktį poreikiui įvertina ir sprendimą
 * patvirtina žmogus; kiekvienas veiksmas įrašomas į žurnalą su grandine. Duomenys - tik šioje naršyklėje (gprocure.apklausos).
 * Bendra logika - apklausa.js. Testai - PP-report/testai.html.
 * ========================================================================== */
;(function (global) {
  "use strict";
  var A = global.GP_APKLAUSA, doc = global.document;
  if (!A || !doc) return;
  var RAKTAS = "gprocure.apklausos", SCHEMA = 1, RIBA_CVPIS = 15000, RIBA_PAZYMA = 5000, MIN_TIEKEJU = 3, MAILTO_RIBA = 1900;
  var S = { vaizdas: "", id: "", darbinis: null, klaidos: [], ikelimas: [], nuorodos: {}, patikra: null, laikmatis: null, kiti: [], nezinoma: "" };
  var $ = function (id) { return doc.getElementById(id); };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dabarIso() { return new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); }
  function tarifas() { var m = global.GP_THRESHOLDS && global.GP_THRESHOLDS.MOKESCIAI; return m && m.pvmStandartinis > 0 ? m.pvmStandartinis : null; }
  function fmt(n, dmin, dmax) {
    if (typeof n !== "number" || !isFinite(n)) return "";
    var s = n.toFixed(dmax === undefined ? 2 : dmax), d = s.split("."), tr = d[1] || "";
    while (tr.length > (dmin === undefined ? 2 : dmin) && tr.charAt(tr.length - 1) === "0") tr = tr.slice(0, -1);
    return d[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + (tr ? "," + tr : "");
  }
  function eur(n) { return typeof n === "number" ? fmt(n, 2, 2) + "\u00a0Eur" : "-"; }
  function suma(t) { var v = global.GP_MONEY ? global.GP_MONEY.sumaLauke(t) : null; return typeof v === "number" && v > 0 ? Math.round(v * 100) / 100 : null; }
  function kiek(n, viena, kelios, daug) { return n + " " + A.forma(n, viena, kelios, daug); }
  function pranesk(t, tipas) { if (global.GP_PRANESIMAS) global.GP_PRANESIMAS.rodyk(t, { tipas: tipas || "gerai" }); }
  function darbasIssaugotas() { if (global.GP_DARBAS) global.GP_DARBAS.atskaita(); }

  /* ---------- saugykla ---------- */
  var TESTINE = false, ATMINTIS = null;
  try { TESTINE = /[?&]saugykla=testine(&|$)/.test(global.location.search) && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(global.location.hostname); } catch (e) {}
  function atmintine() { var d = {}; return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; }, setItem: function (k, v) { d[k] = String(v); }, removeItem: function (k) { delete d[k]; } }; }
  function saug() { if (S.saugykla) return { saugykla: S.saugykla }; if (TESTINE) { ATMINTIS = ATMINTIS || atmintine(); return { saugykla: ATMINTIS }; } return {}; }
  function skaitykVisas() {
    var o = saug();
    o.tikrink = function (v) { return (v && typeof v === "object" && Array.isArray(v.apklausos)) || "netinkama apklausų įrašo sandara"; };
    var r = global.GP_SAUGYKLA.skaityk(RAKTAS, o), sar = [], kiti = [];
    S.nezinoma = r.busena === "sugadinta" || r.busena === "neprieinama" ? global.GP_SAUGYKLA.pranesimas(r, "Elektroninės apklausos") : "";
    if (r.busena === "yra") r.reiksme.apklausos.forEach(function (x) { var a = A.apklausosForma(x); if (a) sar.push(a); else kiti.push(x); });
    S.kiti = kiti;
    return sar;
  }
  function rasykVisas(sar) {
    if (S.nezinoma) return { ok: false, klaida: S.nezinoma };
    var r = global.GP_SAUGYKLA.rasyk(RAKTAS, { schema: SCHEMA, apklausos: sar.concat(S.kiti) }, saug());
    if (!r.ok && global.GP_BUSENA) global.GP_BUSENA.juosta({ raktas: "apklausos", tipas: "klaida", tekstas: global.GP_SAUGYKLA.pranesimas(r, "Elektroninės apklausos") });
    else if (global.GP_BUSENA && global.GP_BUSENA.juostaSlepk) global.GP_BUSENA.juostaSlepk("apklausos");
    return r;
  }
  function gauk(id) { return skaitykVisas().filter(function (a) { return a.id === id; })[0] || null; }
  function issaugok(a) {
    var sar = skaitykVisas(), i = -1;
    sar.forEach(function (x, n) { if (x.id === a.id) i = n; });
    a.keista = dabarIso();
    if (i >= 0) sar[i] = a; else sar.unshift(a);
    var r = rasykVisas(sar);
    if (r.ok) darbasIssaugotas();
    return r.ok;
  }
  function salink(id) { return rasykVisas(skaitykVisas().filter(function (a) { return a.id !== id; })).ok; }
  function irasas(a, ivykis, detales, ref) {
    return A.zurnaloIrasas(a.zurnalas[a.zurnalas.length - 1] || null, ivykis, detales, undefined, ref).then(function (e) { a.zurnalas.push(e); return a; });
  }

  /* ---------- būsenos ---------- */
  function praejo(a) { return A.liko(a.kvietimas.terminas, new Date()).praejo; }
  function visiPateike(a) { return a.tiekejai.length > 0 && a.tiekejai.every(function (t) { return a.pasiulymai.some(function (p) { return p.t === t.t; }); }); }
  function busena(a) {
    if (a.busena === "juodrastis") return { k: "juodrastis", t: "Juodraštis", z: "" };
    if (a.busena === "nutraukta") return { k: "nutraukta", t: "Nutraukta", z: "klaida" };
    if (a.busena === "uzbaigta") return { k: "uzbaigta", t: "Užbaigta", z: "gerai" };
    if (a.busena === "ivertinta") return { k: "ivertinta", t: "Sprendimas patvirtintas", z: "gerai", veiksmas: true };
    if (a.busena === "atverta") return { k: "atverta", t: "Vertinama", z: "demesio", veiksmas: true };
    if (praejo(a)) return { k: "laukia", t: "Terminas praėjo - atverkite pasiūlymus", z: "demesio", veiksmas: true };
    if (visiPateike(a)) return { k: "visi", t: "Visi pasiūlymai gauti", z: "demesio", veiksmas: true };
    if (a.tiekejai.some(function (t) { return !t.issiusta; })) return { k: "siusti", t: "Išsiųskite kvietimus", z: "demesio", veiksmas: true };
    return { k: "vyksta", t: "Laukiama pasiūlymų", z: "info" };
  }
  /* Pirkimui skirtos lėšos (2026-11-27, naudotojo pasiūlymas): atskiro lauko nebėra - lėšomis laikoma numatoma pirkimo vertė.
     Apklausose, sukurtose iki tol su atskirai įrašytomis lėšomis, naudojamos jos. */
  function skirtosLesos(a) { return a.vidaus.lesos !== null && a.vidaus.lesos !== undefined ? a.vidaus.lesos : a.vidaus.verte; }
  function vertink(a) {
    return A.vertink({ kvietimas: a.kvietimas, tiekejai: a.tiekejai, pasiulymai: a.pasiulymai, lesos: skirtosLesos(a), tarifas: tarifas(), neatitinka: a.sprendimas ? a.sprendimas.neatitinka : {} });
  }
  function tiekejas(a, t) { return a.tiekejai.filter(function (x) { return x.t === t; })[0] || null; }
  function pasiulymas(a, t) { return a.pasiulymai.filter(function (x) { return x.t === t; })[0] || null; }

  /* ---------- kortelė formos pasirinkime ---------- */
  function atnaujinkKortele() {
    var v = $("ea-kortele"); if (!v) return;
    var sar = skaitykVisas(), akt = sar.filter(function (a) { return ["paskelbta", "atverta", "ivertinta"].indexOf(a.busena) >= 0; }), veiksmo = akt.filter(function (a) { return busena(a).veiksmas; }).length;
    var eil = S.nezinoma ? "Apklausų įrašo perskaityti nepavyko - atverkite ir pamatysite kodėl"
      : akt.length ? "Vykdomos apklausos: " + akt.length + (veiksmo ? " · laukia jūsų veiksmo: " + veiksmo : "") : sar.length ? "Apklausų šioje naršyklėje: " + sar.length : "";
    v.innerHTML = '<button type="button" class="ea-kvietimas" data-veiksmas="eaAtverk" aria-label="Elektroninė apklausa - atverti apklausų sąrašą">' +
      '<span><span class="ea-kv-zyma">Nauja</span><span class="ea-kv-pav">Elektroninė apklausa</span><span class="ea-kv-riba">iki 15 000 Eur be PVM</span>' +
      '<span class="ea-kv-apr">Pakvieskite tiekėjus, gaukite pasiūlymus viena forma ir pirkimo pažymą užpildykite vienu paspaudimu.</span>' +
      (eil ? '<span class="ea-kv-busena">' + esc(eil) + '</span>' : '') + '</span>' +
      '<span class="ea-kv-zingsniai"><span class="ea-kv-z"><b>1</b>Aprašote poreikį ir nurodote tiekėjus</span><span class="ea-kv-z"><b>2</b>Tiekėjai gauna kvietimą ir įrašo kainas</span>' +
      '<span class="ea-kv-z"><b>3</b>Pasiūlymai palyginami, sudaroma eilė</span><span class="ea-kv-z"><b>4</b>Patvirtinate sprendimą - pažyma užpildoma</span></span></button>';
  }

  /* ---------- vaizdų perjungimas ---------- */
  function rodyk(vaizdas, id) {
    S.vaizdas = vaizdas; S.id = id || ""; S.ikelimas = [];
    clearInterval(S.laikmatis); S.laikmatis = null;
    var v = $("ea-vieta"), sel = $("form-selector");
    if (!v) return Promise.resolve();
    var gpk = $("gpk");    // pirkimo kortelės juosta - pažymos formai; apklausa jos nenaudoja
    if (!vaizdas) { v.hidden = true; v.innerHTML = ""; if (sel) sel.style.display = "block"; if (gpk) gpk.hidden = false; atnaujinkKortele(); return Promise.resolve(); }
    if (sel) sel.style.display = "none";
    if (gpk) gpk.hidden = true;
    ["toolbar", "form-container"].forEach(function (x) { var e = $(x); if (e) e.style.display = "none"; });
    v.hidden = false;
    return piesk().then(function () {
      var h = v.querySelector("h2");
      if (h) { h.setAttribute("tabindex", "-1"); if (global.GP_PRIEINAMUMAS && global.GP_PRIEINAMUMAS.jeiDingo) global.GP_PRIEINAMUMAS.jeiDingo(v); }
      global.scrollTo(0, 0);
    });
  }
  function piesk() {
    var v = $("ea-vieta");
    if (S.vaizdas === "registras") { v.innerHTML = registroHtml(); return Promise.resolve(); }
    if (S.vaizdas === "kurimas") { v.innerHTML = kurimoHtml(); kurimoPapildymai(); return Promise.resolve(); }
    if (S.vaizdas === "apklausa") {
      var a = gauk(S.id);
      if (!a) { S.vaizdas = "registras"; v.innerHTML = registroHtml(); return Promise.resolve(); }
      return paruoskNuorodas(a).then(function () {
        v.innerHTML = apklausosHtml(a);
        if (!S.laikmatis && a.busena === "paskelbta") S.laikmatis = setInterval(function () {
          var b = gauk(S.id), el = $("ea-liko"); if (!b || S.vaizdas !== "apklausa") return;
          var buvo = v.getAttribute("data-b"), yra = busena(b).k;
          if (buvo !== yra) piesk(); else if (el) el.textContent = A.liko(b.kvietimas.terminas, new Date()).tekstas;
        }, 30000);
        v.setAttribute("data-b", busena(a).k);
      });
    }
    return Promise.resolve();
  }
  /* Pažymos forma atveriama (selectForm) - apklausos vaizdas paslepiamas, formos pasirinkimo nekeičiant. */
  function slepk() { var v = $("ea-vieta"); S.vaizdas = ""; S.id = ""; clearInterval(S.laikmatis); S.laikmatis = null; if (v) { v.hidden = true; v.innerHTML = ""; } }
  function perpiesk(fokusas) {
    return piesk().then(function () { if (fokusas) { var e = typeof fokusas === "string" ? $(fokusas) : fokusas; if (e) { if (!e.hasAttribute("tabindex") && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(e.tagName)) e.setAttribute("tabindex", "-1"); e.focus(); } } });
  }

  /* ---------- sąrašas ---------- */
  function registroHtml() {
    var sar = skaitykVisas(), akt = 0, veiksmo = 0, uzb = 0, pasSk = 0, apkSk = 0;
    sar.forEach(function (a) {
      var b = busena(a);
      if (["paskelbta", "atverta", "ivertinta"].indexOf(a.busena) >= 0) akt++;
      if (b.veiksmas) veiksmo++;
      if (a.busena === "uzbaigta" || a.busena === "ivertinta") {
        if (a.busena === "uzbaigta") uzb++;
        pasSk += a.pasiulymai.length; apkSk++;
      }
    });
    var s = '<div class="ea-virsus"><div><h2>Elektroninės apklausos</h2><p class="ea-sub">Neskelbiamos apklausos raštu - iki 15 000 Eur be PVM.</p></div>' +
      '<div class="ea-eile"><button type="button" class="ea-btn" data-veiksmas="eaUzdaryk">&larr; Pažymų formos</button>' +
      '<button type="button" class="ea-btn" data-veiksmas="eaBylaIkelk">Įkelti apklausos bylą</button><input type="file" id="ea-bylos-failas" accept=".json,application/json" hidden data-veiksmas-change="eaBylaFailas" aria-label="Apklausos bylos failas">' +
      (sar.length ? '<button type="button" class="ea-btn" data-veiksmas="eaCsv">Sąrašas (CSV)</button>' : '') +
      '<button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="eaNauja">+ Nauja apklausa</button></div></div>';
    if (S.nezinoma) s += '<div class="ea-pastaba ea-pastaba--klaida" role="alert"><strong>Apklausų įrašo perskaityti nepavyko</strong>' + esc(S.nezinoma) + ' Kol tai neišspręsta, naujos apklausos neišsaugomos, kad nebūtų perrašyti esami duomenys.</div>';
    if (S.kiti.length) s += '<div class="ea-pastaba ea-pastaba--demesio">Neperskaityta apklausų: ' + S.kiti.length + '. Jos nerodomos, bet saugykloje paliekamos.</div>';
    if (!sar.length) {
      return s + '<div class="ea-card"><div class="ea-tuscia"><b>Apklausų dar nėra</b>Sukurkite pirmą apklausą: aprašykite, ką perkate, nurodykite tiekėjus ir pasiūlymų terminą.' +
        '<div class="ea-eile" style="justify-content:center;margin-top:16px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="eaNauja">Sukurti apklausą</button></div></div></div>' + kaipVeikiaHtml();
    }
    s += '<div class="ea-rodikliai"><div class="ea-rod"><b>' + akt + '</b><span>vykdomos</span></div><div class="ea-rod"><b>' + veiksmo + '</b><span>laukia jūsų veiksmo</span></div>' +
      '<div class="ea-rod"><b>' + uzb + '</b><span>užbaigtos</span></div><div class="ea-rod"><b>' + (apkSk ? fmt(pasSk / apkSk, 0, 1) : "-") + '</b><span>vidutiniškai pasiūlymų įvertintose apklausose</span></div></div>';
    s += '<ul class="ea-sar">';
    sar.forEach(function (a) {
      var b = busena(a), k = a.kvietimas, lk = k.terminas ? A.liko(k.terminas, new Date()) : null;
      s += '<li><button type="button" class="ea-ir" data-veiksmas="eaRodyk" data-id="' + esc(a.id) + '">' +
        '<span class="ea-ir-pav">' + esc(k.pavadinimas || "(be pavadinimo)") + '</span>' +
        '<span class="ea-ir-desine"><span class="ea-zyma' + (b.z ? " ea-zyma--" + b.z : "") + '">' + esc(b.t) + '</span>' +
          (lk && a.busena === "paskelbta" && !lk.praejo ? '<span class="ea-sub">' + esc(lk.tekstas) + '</span>' : '') + '</span>' +
        '<span class="ea-ir-meta"><span>' + esc(a.id) + '</span>' + (k.terminas ? '<span>terminas ' + esc(A.rodykLaika(k.terminas)) + '</span>' : '') +
          '<span>kviesta ' + a.tiekejai.length + (a.busena !== "juodrastis" ? ', gauta ' + a.pasiulymai.length : '') + '</span>' +
          (a.vidaus.verte !== null ? '<span>numatoma vertė ' + esc(eur(a.vidaus.verte)) + '</span>' : '') + '</span></button></li>';
    });
    return s + '</ul>';
  }
  function kaipVeikiaHtml() {
    return '<div class="ea-card"><h3>Kaip tai veikia</h3><ol style="margin:12px 0 0;padding-left:20px;display:grid;gap:8px">' +
      '<li><b>Sukuriate apklausą.</b> Įrankis patikrina, ar vertė neviršija 15 000 Eur be PVM ir ar kviečiama pakankamai tiekėjų.</li>' +
      '<li><b>Išsiunčiate kvietimus.</b> Kiekvienam tiekėjui paruošiamas laiškas su asmenine nuoroda - išsiunčiate jį iš savo el. pašto.</li>' +
      '<li><b>Tiekėjai pateikia pasiūlymus.</b> Tiekėjas atveria nuorodą, įrašo kainas ir atsiunčia jums laišką su pasiūlymo kodu. Laišką įkeliate čia - kainos nerodomos, kol pasiūlymai neatverti. Kodas suspaustas, bet neužšifruotas: tai darbo tvarka, ne apsauga nuo kainų perskaitymo.</li>' +
      '<li><b>Pasiūlymai atveriami ir palyginami.</b> Pasibaigus terminui (arba anksčiau, jei pasiūlymus pateikė visi kviesti tiekėjai) įrankis sudaro pasiūlymų eilę pagal kainą, o vienodų kainų atveju pirmesnis - anksčiau gautas pasiūlymas. Atitiktį poreikiui įvertinate ir sprendimą patvirtinate jūs.</li>' +
      '<li><b>Pažyma užpildoma.</b> Pirkimo pažyma (1 priedas) užpildoma iš apklausos duomenų - peržiūrite, papildote ir sugeneruojate Word.</li></ol></div>';
  }
  function laimejusiKaina(a) {
    if (!a.sprendimas || a.sprendimas.rezultatas !== "laimetojas" || !a.atverta) return null;
    var e = vertink(a).eilutes.filter(function (x) { return x.t === a.sprendimas.laimetojas; })[0];
    return e && typeof e.viso === "number" ? e.viso : null;
  }

  /* ---------- nauja apklausa ---------- */
  function nauja(is) {
    var sar = skaitykVisas(), pask = sar[0], kt = is ? is.kvietimas.kontaktas : pask ? pask.kvietimas.kontaktas : { vardas: "", pastas: "", tel: "" };
    var vd = is ? is.vidaus : pask ? { padalinys: pask.vidaus.padalinys, pareigos: pask.vidaus.pareigos } : {};
    var org = global.GP_ORG && global.GP_ORG.pagalId ? global.GP_ORG.pagalId("litgrid") : null, rekv = org && org.rekvizitai;
    return A.apklausosForma({ id: A.id(), busena: "juodrastis", sukurta: dabarIso(), keista: dabarIso(),
      kvietimas: { pirkejas: { pav: org ? org.pavadinimas || "LITGRID AB" : "LITGRID AB", kodas: rekv ? rekv.kodas : "" }, pavadinimas: is ? is.kvietimas.pavadinimas : "", aprasymas: is ? is.kvietimas.aprasymas : "",
        pozicijos: is ? is.kvietimas.pozicijos : [], terminas: "", pristatymoVieta: is ? is.kvietimas.pristatymoVieta : "", pristatymoTerminas: is ? is.kvietimas.pristatymoTerminas : "",
        apmokejimas: is ? is.kvietimas.apmokejimas : "", kontaktas: kt },
      vidaus: { verte: is ? is.vidaus.verte : null, lesos: null, bvpz: is ? is.vidaus.bvpz : "", padalinys: vd.padalinys || "", pareigos: vd.pareigos || "", mazaiTiekeju: "" },
      tiekejai: is ? is.tiekejai.map(function (t) { return { t: A.zetonas(), pav: t.pav, pastas: t.pastas, kalba: t.kalba }; }) : [], pasiulymai: [], zurnalas: [] });
  }
  function ankstesniTiekejai() {
    var m = {};
    skaitykVisas().forEach(function (a) { a.tiekejai.forEach(function (t) { if (t.pav && t.pastas && !m[t.pav.toLowerCase()]) m[t.pav.toLowerCase()] = t; }); });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  function lauk(id, et, reiksme, o) {
    o = o || {};
    var kl = S.klaidos.filter(function (k) { return k.id === id; })[0];
    return '<div class="ea-laukas' + (o.visas ? " ea-laukas--visas" : "") + '"><label for="' + id + '"' + (o.privaloma ? ' class="ea-privaloma"' : '') + '>' + esc(et) + '</label>' +
      (o.textarea ? '<textarea id="' + id + '" rows="' + (o.eil || 4) + '" maxlength="' + (o.max || 3000) + '"' + (o.pvz ? ' placeholder="' + esc(o.pvz) + '"' : '') + (kl ? ' aria-invalid="true"' : '') + ' aria-describedby="' + id + '-kl">' + esc(reiksme || "") + '</textarea>'
        : '<input type="' + (o.tipas || "text") + '" id="' + id + '" value="' + esc(reiksme == null ? "" : reiksme) + '" autocomplete="off"' + (o.pvz ? ' placeholder="' + esc(o.pvz) + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') +
          (o.rezimas ? ' inputmode="' + o.rezimas + '"' : '') + (o.veiksmas ? ' data-veiksmas-input="' + o.veiksmas + '"' : '') + (kl ? ' aria-invalid="true"' : '') + ' aria-describedby="' + id + '-kl' + (o.uzuomina ? " " + id + "-uz" : "") + '">') +
      (o.uzuomina ? '<span class="ea-uzuomina" id="' + id + '-uz">' + o.uzuomina + '</span>' : '') +
      '<span class="ea-klaida" id="' + id + '-kl"' + (kl ? "" : " hidden") + '>' + esc(kl ? kl.tekstas : "") + '</span></div>';
  }
  function pozicijuEilute(p, i) {
    return '<tr data-poz="' + i + '"><td data-e="Nr.">' + (i + 1) + '</td>' +
      '<td class="ea-su-lauku" data-e="Pavadinimas"><input type="text" data-p="pav" value="' + esc(p.pav) + '" maxlength="300" autocomplete="off" placeholder="pvz., Biuro kėdė, ergonominė" aria-label="' + (i + 1) + ' pozicijos pavadinimas"></td>' +
      '<td class="ea-su-lauku" data-e="Kiekis"><input type="text" class="ea-skaicius" data-p="kiekis" value="' + esc(typeof p._kiekis === "string" ? p._kiekis : typeof p.kiekis === "number" ? fmt(p.kiekis, 0, 4).replace(/\u00a0/g, " ") : "") + '" inputmode="decimal" autocomplete="off" placeholder="pvz., 12" aria-label="' + (i + 1) + ' pozicijos kiekis"></td>' +
      '<td class="ea-su-lauku" data-e="Mato vnt."><input type="text" data-p="mat" value="' + esc(p.mat) + '" maxlength="20" autocomplete="off" placeholder="pvz., vnt." aria-label="' + (i + 1) + ' pozicijos mato vienetas"></td>' +
      '<td class="ea-su-lauku" data-e="Pastaba tiekėjui"><input type="text" data-p="pastaba" value="' + esc(p.pastaba) + '" maxlength="300" autocomplete="off" placeholder="pvz., spalva, modelis ar lygiavertis" aria-label="' + (i + 1) + ' pozicijos pastaba tiekėjui"></td>' +
      '<td><button type="button" class="ea-btn ea-btn--maz ea-btn--tylus" data-veiksmas="eaPozSalink" data-i="' + i + '" aria-label="Pašalinti ' + (i + 1) + ' poziciją">✕</button></td></tr>';
  }
  function tiekejoEilute(t, i) {
    return '<tr data-tk="' + i + '"><td data-e="Nr.">' + (i + 1) + '</td>' +
      '<td class="ea-su-lauku" data-e="Tiekėjas"><input type="text" data-t="pav" value="' + esc(t.pav) + '" maxlength="200" autocomplete="off" list="ea-tk-sar" placeholder="pvz., UAB „Tiekėjas“" aria-label="' + (i + 1) + ' tiekėjo pavadinimas" data-veiksmas-change="eaTiekejoPav"></td>' +
      '<td class="ea-su-lauku" data-e="El. paštas"><input type="email" data-t="pastas" value="' + esc(t.pastas) + '" maxlength="120" autocomplete="off" placeholder="pvz., info@tiekejas.lt" aria-label="' + (i + 1) + ' tiekėjo el. paštas"></td>' +
      '<td class="ea-su-lauku" data-e="Kvietimo kalba"><select data-t="kalba" aria-label="' + (i + 1) + ' tiekėjo kvietimo kalba"><option value="lt"' + (t.kalba !== "en" ? " selected" : "") + '>Lietuvių</option><option value="en"' + (t.kalba === "en" ? " selected" : "") + '>Anglų</option></select></td>' +
      '<td><button type="button" class="ea-btn ea-btn--maz ea-btn--tylus" data-veiksmas="eaTkSalink" data-i="' + i + '" aria-label="Pašalinti ' + (i + 1) + ' tiekėją">✕</button></td></tr>';
  }
  function kurimoHtml() {
    var a = S.darbinis, k = a.kvietimas, vd = a.vidaus;
    if (!k.pozicijos.length) k.pozicijos = [{ pav: "", mat: "", kiekis: null, pastaba: "" }];
    if (!a.tiekejai.length) a.tiekejai = [0, 1, 2].map(function () { return { t: A.zetonas(), pav: "", pastas: "", kalba: "lt" }; });
    var s = '<div class="ea-virsus"><div><h2>' + (gauk(a.id) ? "Apklausos juodraštis" : "Nauja apklausa") + '</h2><p class="ea-sub">' + esc(a.id) + ' · tiekėjai matys tik tai, kas pažymėta „tiekėjams“.</p></div>' +
      '<div class="ea-eile"><button type="button" class="ea-btn" data-veiksmas="eaISarasa">&larr; Apklausų sąrašas</button></div></div>';
    s += '<div id="ea-klaidos" tabindex="-1">' + klaiduHtml() + '</div>';
    s += '<section class="ea-card" aria-labelledby="ea-h1"><h3 id="ea-h1">1. Ką perkate</h3><p class="ea-sub">Šią dalį matys tiekėjai.</p><div class="ea-laukai">' +
      lauk("ea-pav", "Pirkimo pavadinimas", k.pavadinimas, { privaloma: true, visas: true, max: 200, pvz: "pvz., Biuro kėdžių pirkimas" }) +
      lauk("ea-apr", "Aprašymas ir reikalavimai", k.aprasymas, { textarea: true, visas: true, pvz: "pvz., techniniai reikalavimai, garantija, ką tiekėjas turi pateikti kartu su pasiūlymu" }) + '</div>' +
      '<div class="ea-etikete" style="margin:16px 0 6px">Pozicijos <span class="ea-uzuomina">- tiekėjas kiekvienai įrašys vieneto kainą. Galite įklijuoti eilutes iš „Excel“ (pavadinimas, kiekis, mato vienetas).</span></div>' +
      '<div class="ea-lent-remas"><table class="ea-lent ea-lent--kort" id="ea-poz" data-veiksmas-paste="eaPozIklijuok"><thead><tr><th scope="col">Nr.</th><th scope="col" style="min-width:220px">Pavadinimas</th><th scope="col" style="width:110px">Kiekis</th>' +
      '<th scope="col" style="width:110px">Mato vnt.</th><th scope="col" style="min-width:180px">Pastaba tiekėjui</th><th scope="col"><span class="visually-hidden" style="position:absolute;clip:rect(0 0 0 0)">Veiksmai</span></th></tr></thead><tbody>' +
      k.pozicijos.map(pozicijuEilute).join("") + '</tbody></table></div>' +
      '<span class="ea-klaida" id="ea-poz-kl"' + (S.klaidos.some(function (x) { return x.id === "ea-poz"; }) ? "" : " hidden") + '>' + esc((S.klaidos.filter(function (x) { return x.id === "ea-poz"; })[0] || {}).tekstas || "") + '</span>' +
      '<div class="ea-eile" style="margin-top:8px"><button type="button" class="ea-btn ea-btn--maz" data-veiksmas="eaPozPridek">+ Pridėti poziciją</button></div></section>';
    s += '<section class="ea-card" aria-labelledby="ea-h2"><h3 id="ea-h2">2. Numatoma vertė</h3><p class="ea-sub">Tiekėjams nerodoma. Pagal vertę įrankis patikrina, ar apklausą galima vykdyti šiuo būdu.</p><div class="ea-laukai">' +
      lauk("ea-verte", "Numatoma pirkimo vertė be PVM, Eur", typeof vd._verte === "string" ? vd._verte : vd.verte === null ? "" : fmt(vd.verte, 0, 2).replace(/\u00a0/g, " "), { privaloma: true, rezimas: "decimal", pvz: "pvz., 8 500", veiksmas: "eaVerte",
        uzuomina: "Ji laikoma ir pirkimui skirtomis lėšomis: pasiūlymai, viršijantys šią sumą, bus pažymėti, o pažymoje ji įrašoma kaip skirtos lėšos." }) +
      lauk("ea-bvpz", "BVPŽ kodas", vd.bvpz, { max: 40, pvz: "pvz., 39112000-0" }) + '</div><div id="ea-vertes-pastaba" aria-live="polite"></div></section>';
    s += '<section class="ea-card" aria-labelledby="ea-h3"><h3 id="ea-h3">3. Sąlygos tiekėjams</h3><p class="ea-sub">Šią dalį matys tiekėjai.</p><div class="ea-laukai">' +
      lauk("ea-terminas", "Pasiūlymų terminas (Lietuvos laiku)", typeof k._terminas === "string" ? k._terminas : k.terminas ? A.utcIVilniaus(k.terminas) : "", { privaloma: true, tipas: "datetime-local", veiksmas: "eaTerminas", uzuomina: '<span id="ea-termino-pastaba"></span>' }) +
      lauk("ea-vieta-l", "Pristatymo ar atlikimo vieta", k.pristatymoVieta, { max: 300, pvz: "pvz., Vilnius" }) +
      lauk("ea-ptermin", "Pristatymo ar atlikimo terminas", k.pristatymoTerminas, { max: 300, pvz: "pvz., per 30 dienų nuo užsakymo" }) +
      lauk("ea-apmok", "Apmokėjimo sąlygos", k.apmokejimas, { max: 300, pvz: "pvz., per 30 dienų nuo sąskaitos gavimo" }) +
      lauk("ea-dok", "Ką tiekėjas prideda prie laiško (neprivaloma)", k.dokumentai || "", { textarea: true, visas: true, eil: 2, max: 1000, pvz: "pvz., prekės techninis aprašas ar katalogo lapas",
        uzuomina: "Tiekėjas pridės šiuos dokumentus prie laiško su pasiūlymo kodu; jam bus priminta juose kainų nenurodyti." }) + '</div>' +
      '<div id="ea-nacsaug-pastaba" aria-live="polite"></div></section>';
    s += '<section class="ea-card" aria-labelledby="ea-h4"><h3 id="ea-h4">4. Tiekėjai</h3><p class="ea-sub">Kiekvienas tiekėjas gaus atskirą nuorodą; kitų kviestų tiekėjų jis nematys.</p>' +
      '<datalist id="ea-tk-sar">' + ankstesniTiekejai().map(function (t) { return '<option value="' + esc(t.pav) + '">'; }).join("") + '</datalist>' +
      '<div class="ea-lent-remas"><table class="ea-lent ea-lent--kort" id="ea-tk"><thead><tr><th scope="col">Nr.</th><th scope="col" style="min-width:220px">Tiekėjas</th><th scope="col" style="min-width:220px">El. paštas</th><th scope="col" style="width:130px">Kvietimo kalba</th><th scope="col"></th></tr></thead><tbody>' +
      a.tiekejai.map(tiekejoEilute).join("") + '</tbody></table></div>' +
      '<span class="ea-klaida" id="ea-tk-kl"' + (S.klaidos.some(function (x) { return x.id === "ea-tk"; }) ? "" : " hidden") + '>' + esc((S.klaidos.filter(function (x) { return x.id === "ea-tk"; })[0] || {}).tekstas || "") + '</span>' +
      '<div class="ea-eile" style="margin-top:8px"><button type="button" class="ea-btn ea-btn--maz" data-veiksmas="eaTkPridek">+ Pridėti tiekėją</button></div>' +
      '<div id="ea-maz-vieta" style="margin-top:12px"></div></section>';
    s += '<section class="ea-card" aria-labelledby="ea-h5"><h3 id="ea-h5">5. Jūsų duomenys</h3><p class="ea-sub">Vardą, el. paštą ir telefoną matys tiekėjai - šiuo adresu jie atsiųs pasiūlymus. Padalinys ir pareigos - tik pirkimo pažymai.</p><div class="ea-laukai ea-laukai--3">' +
      lauk("ea-kvardas", "Vardas ir pavardė", k.kontaktas.vardas, { privaloma: true, max: 120 }) +
      lauk("ea-kpastas", "El. paštas", k.kontaktas.pastas, { privaloma: true, tipas: "email", max: 120, pvz: "pvz., vardas.pavarde@litgrid.eu" }) +
      lauk("ea-ktel", "Telefonas", k.kontaktas.tel, { tipas: "tel", max: 40 }) +
      lauk("ea-padalinys", "Padalinys", vd.padalinys, { max: 120, pvz: "pvz., IT skyrius" }) +
      lauk("ea-pareigos", "Pareigos", vd.pareigos, { max: 120, pvz: "pvz., Vyresnysis specialistas" }) + '</div></section>';
    s += '<div class="ea-card ea-card--plona"><div class="ea-eile"><button type="button" class="ea-btn" data-veiksmas="eaJuodrastis">Išsaugoti juodraštį</button>' +
      (gauk(a.id) ? '<button type="button" class="ea-btn ea-btn--pavojus" data-veiksmas="eaTrink" data-id="' + esc(a.id) + '">Ištrinti juodraštį</button>' : '') + '<span class="ea-tarpas"></span>' +
      '<span class="ea-uzuomina">Paskelbus apklausą kvietimo keisti nebegalima.</span><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="eaSkelbk">Paskelbti apklausą</button></div></div>';
    return s;
  }
  function klaiduHtml() {
    if (!S.klaidos.length) return "";
    return '<div class="ea-pastaba ea-pastaba--klaida" role="alert"><strong>Apklausos paskelbti dar negalima</strong><ul>' +
      S.klaidos.map(function (k) { return '<li><a href="#' + esc(k.fokusas || k.id) + '" data-veiksmas="eaEik" data-id="' + esc(k.fokusas || k.id) + '">' + esc(k.tekstas) + '</a></li>'; }).join("") + '</ul></div>';
  }
  function kurimoPapildymai() { vertesPastaba(); terminoPastaba(); mazaiTiekejuLaukas(); }
  function vertesPastaba() {
    var v = $("ea-vertes-pastaba"); if (!v) return;
    var x = suma($("ea-verte").value), t = $("ea-verte").value.trim();
    v.innerHTML = !t ? "" : x === null ? '<div class="ea-pastaba ea-pastaba--klaida">Vertė turi būti skaičius, didesnis už nulį (pvz., 8 500).</div>'
      : x > RIBA_CVPIS ? '<div class="ea-pastaba ea-pastaba--klaida"><strong>Vertė viršija 15 000 Eur be PVM</strong>Tokios vertės mažos vertės pirkimą atlieka Pirkimų skyriaus darbuotojai arba Pirkimų komisija, ne pirkimo iniciatorius (Aprašo 20 p.), todėl šis įrankis jam netaikomas. Pažymai naudojama 2 priedo forma.</div>'
      : x <= RIBA_PAZYMA ? '<div class="ea-pastaba ea-pastaba--info"><strong>Vertė neviršija 5 000 Eur be PVM</strong>Apklausą vykdyti galima. Pirkimo pažyma tokios vertės pirkimui nepildoma (Aprašo 12 p.), o apklausos duomenys lieka sąraše.</div>'
      : '<div class="ea-pastaba ea-pastaba--gerai"><strong>Apklausą galima vykdyti šiuo būdu</strong>Vertė nuo 5 000 iki 15 000 Eur be PVM: kreipiamasi ne mažiau kaip į 3 tiekėjus arba pažymoje pagrindžiama, kodėl į mažiau (Aprašo 27.2.1 p.). Pabaigoje užpildoma pažyma (1 priedas).</div>';
    mazaiTiekejuLaukas(); nacsaugPastaba();
  }
  /* Nacionalinis saugumas (2026-11-27, naudotojo sprendimas): kai vertė viršija 5 000 Eur be PVM, tiekėjai pasiūlymo formoje patvirtina
     atitiktį Aprašo 27.2.3 ir 31.4 p. reikalavimams - atskiros deklaracijos neprašoma. */
  function nacsaugReikia(verte) { return verte !== null && verte > RIBA_PAZYMA && verte <= RIBA_CVPIS; }
  function nacsaugPastaba() {
    var v = $("ea-nacsaug-pastaba"); if (!v) return;
    var x = suma(($("ea-verte") || {}).value || "");
    v.innerHTML = nacsaugReikia(x) ? '<div class="ea-pastaba ea-pastaba--info" style="margin-top:12px"><strong>Nacionalinio saugumo reikalavimai</strong>Vertė viršija 5 000 Eur be PVM, todėl tiekėjo pasiūlymo formoje bus papildomas patvirtinimas, kad tiekėjas atitinka Aprašo 27.2.3 ir 31.4 p. nurodytus nacionalinio saugumo reikalavimus. Atskiros atitikties deklaracijos tiekėjui pildyti nereikia.</div>' : "";
  }
  function terminoPastaba() {
    var el = $("ea-termino-pastaba"), l = $("ea-terminas"); if (!el || !l) return;
    var iso = A.vilniausIUtc(l.value);
    if (!l.value) { el.textContent = "Iki šio laiko tiekėjai turi atsiųsti pasiūlymus."; return; }
    if (!iso) { el.textContent = "Tokio laiko nėra - patikrinkite datą ir valandą."; return; }
    var lk = A.liko(iso, new Date()), d = new Date(iso), sav = ["sekmadienis", "pirmadienis", "antradienis", "trečiadienis", "ketvirtadienis", "penktadienis", "šeštadienis"];
    var diena = l.value.slice(0, 10), dd = "";
    if (global.GP_WORKDAYS && global.GP_WORKDAYS.isWorkday) { try { var p = diena.split("-").map(Number); if (!global.GP_WORKDAYS.isWorkday(new Date(p[0], p[1] - 1, p[2]))) dd = " Tai ne darbo diena."; } catch (e) {} }
    var sd = new Date(Date.UTC(+diena.slice(0, 4), +diena.slice(5, 7) - 1, +diena.slice(8, 10))).getUTCDay();
    var dd2 = dd, ddSk = darboDienuIki(iso);
    if (!lk.praejo && ddSk < 3) dd2 += " Iki termino lieka mažiau kaip 3 darbo dienos - patikrinkite, ar tiekėjams pakaks laiko parengti pasiūlymą (Aprašo 31.2 p.).";
    el.textContent = lk.praejo ? "Šis laikas jau praėjo." : sav[sd].charAt(0).toUpperCase() + sav[sd].slice(1) + ", " + lk.tekstas.replace(/\.$/, "") + "." + dd2;
    void d;
  }
  /* Kiek pilnų darbo dienų nuo rytojaus iki termino dienos (imtinai) - orientyras, ar tiekėjams pakaks laiko. */
  function darboDienuIki(iso) {
    var W = global.GP_WORKDAYS, n = 0, d = new Date(), pab = A.utcIVilniaus(iso).slice(0, 10);
    for (var i = 0; i < 60; i++) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      var k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      if (k > pab) break;
      if (W && W.isWorkday ? W.isWorkday(d) : d.getDay() % 6 !== 0) n++;
    }
    return n;
  }
  function tiekejuSk() { var n = 0; doc.querySelectorAll("#ea-tk tbody tr").forEach(function (tr) { if (tr.querySelector('[data-t="pav"]').value.trim() || tr.querySelector('[data-t="pastas"]').value.trim()) n++; }); return n; }
  function mazaiTiekejuLaukas() {
    var v = $("ea-maz-vieta"); if (!v) return;
    var x = suma(($("ea-verte") || {}).value || ""), n = tiekejuSk(), reikia = x !== null && x > RIBA_PAZYMA && x <= RIBA_CVPIS && n > 0 && n < MIN_TIEKEJU, yra = $("ea-maz");
    if (yra) S.darbinis.vidaus.mazaiTiekeju = yra.value;
    if (!reikia) { v.innerHTML = ""; return; }
    if (!yra) v.innerHTML = lauk("ea-maz", "Kodėl kviečiama mažiau kaip 3 tiekėjai", S.darbinis.vidaus.mazaiTiekeju, { textarea: true, privaloma: true, eil: 2, max: 1000, pvz: "pvz., rinkoje yra tik du šios įrangos tiekėjai",
      uzuomina: "Kai vertė viršija 5 000 Eur be PVM, kreipiantis į mažiau kaip 3 tiekėjus priežastis nurodoma pažymoje (Aprašo 27.2.1 p.)." });
  }
  /* Kiekis: „1 000“ - 1000, „1,5“ - 1,5, „1.000.000“ - milijonas; vienas skyriklis ir lygiai trys skaitmenys po jo („1.000“, „1,000“) -
     dviprasmiška (tūkstantis ar vienetas?) - NaN, kad būtų paklausta (iki 2026-11-27 tyliai tapdavo 1). */
  function kiekisIsTeksto(t) {
    t = String(t || "").replace(/[\s\u00a0\u202f]/g, "");
    if (!t) return null;
    if (/^\d{1,3}[.,]\d{3}$/.test(t)) return NaN;
    var v = global.GP_MONEY ? global.GP_MONEY.parseSkaicius(t) : parseFloat(t.replace(",", "."));
    return typeof v === "number" && isFinite(v) && /^[\d.,]+$/.test(t) ? v : NaN;
  }
  function skaitykKurima() {
    var a = S.darbinis; if (!a || !$("ea-pav")) return a;
    var k = a.kvietimas, vd = a.vidaus, val = function (id) { var e = $(id); return e ? e.value : ""; };
    k.pavadinimas = val("ea-pav"); k.aprasymas = val("ea-apr");
    k.pozicijos = [];
    doc.querySelectorAll("#ea-poz tbody tr").forEach(function (tr) {
      var g = function (n) { return tr.querySelector('[data-p="' + n + '"]').value; }, kt = g("kiekis").trim(), kv = kt ? kiekisIsTeksto(kt) : null;
      k.pozicijos.push({ pav: g("pav"), mat: g("mat"), kiekis: typeof kv === "number" && isFinite(kv) ? kv : (kt ? NaN : null), pastaba: g("pastaba"), _kiekis: kt });
    });
    vd.verte = suma(val("ea-verte")); vd._verte = val("ea-verte").trim();
    vd.bvpz = val("ea-bvpz");
    k.terminas = A.vilniausIUtc(val("ea-terminas")); k._terminas = val("ea-terminas");
    k.pristatymoVieta = val("ea-vieta-l"); k.pristatymoTerminas = val("ea-ptermin"); k.apmokejimas = val("ea-apmok");
    if (val("ea-dok").trim()) k.dokumentai = val("ea-dok"); else delete k.dokumentai;
    var seni = a.tiekejai; a.tiekejai = [];
    doc.querySelectorAll("#ea-tk tbody tr").forEach(function (tr, i) {
      var g = function (n) { return tr.querySelector('[data-t="' + n + '"]').value; };
      a.tiekejai.push({ t: seni[i] ? seni[i].t : A.zetonas(), pav: g("pav"), pastas: g("pastas").trim(), kalba: g("kalba") === "en" ? "en" : "lt" });
    });
    k.kontaktas = { vardas: val("ea-kvardas"), pastas: val("ea-kpastas").trim(), tel: val("ea-ktel") };
    vd.padalinys = val("ea-padalinys"); vd.pareigos = val("ea-pareigos");
    if ($("ea-maz")) vd.mazaiTiekeju = $("ea-maz").value;
    return a;
  }
  /* Juodraščio kopija saugyklai: tik tinkamos reikšmės (netinkamas kiekis - tuščias). */
  function svarus(a) {
    var c = JSON.parse(JSON.stringify(a));
    c.kvietimas.pozicijos = c.kvietimas.pozicijos.filter(function (p) { return p.pav || p.mat || p.pastaba || p.kiekis; }).map(function (p) { return { pav: p.pav, mat: p.mat, kiekis: typeof p.kiekis === "number" ? p.kiekis : null, pastaba: p.pastaba }; });
    c.tiekejai = c.tiekejai.filter(function (t) { return t.pav.trim() || t.pastas; });
    return A.apklausosForma(c);
  }
  function tikrinkKurima() {
    var a = skaitykKurima(), k = a.kvietimas, vd = a.vidaus, kl = [];
    function b(id, tekstas, fokusas) { kl.push({ id: id, tekstas: tekstas, fokusas: fokusas }); }
    if (!k.pavadinimas.trim()) b("ea-pav", "Pirkimo pavadinimas: įrašykite, ką perkate");
    var poz = k.pozicijos.filter(function (p) { return p.pav.trim() || p._kiekis || p.mat.trim() || p.pastaba.trim(); });
    if (!poz.length) b("ea-poz", "Pozicijos: įrašykite bent vieną poziciją su pavadinimu ir kiekiu", "ea-poz");
    else if (poz.some(function (p) { return /^\d{1,3}[.,]\d{3}$/.test(String(p._kiekis || "").replace(/[\s\u00a0]/g, "")); })) {
      var dv = poz.filter(function (p) { return /^\d{1,3}[.,]\d{3}$/.test(String(p._kiekis || "").replace(/[\s\u00a0]/g, "")); })[0];
      b("ea-poz", "Pozicijos: kiekis „" + dv._kiekis + "“ dviprasmiškas: tūkstantį rašykite be skyriklio (1000), dešimtainę dalį - su kableliu (pvz., 1,5)", "ea-poz");
    }
    else if (poz.some(function (p) { return !p.pav.trim() || !(p.kiekis > 0); })) b("ea-poz", "Pozicijos: kiekvienai pozicijai reikia pavadinimo ir kiekio, didesnio už nulį", "ea-poz");
    if (!vd._verte) b("ea-verte", "Numatoma pirkimo vertė: įrašykite sumą be PVM");
    else if (vd.verte === null) b("ea-verte", "Numatoma pirkimo vertė: suma turi būti skaičius, didesnis už nulį");
    else if (vd.verte > RIBA_CVPIS) b("ea-verte", "Numatoma pirkimo vertė viršija 15 000 Eur be PVM - toks pirkimas vykdomas CVP IS priemonėmis");
    if (!k._terminas) b("ea-terminas", "Pasiūlymų terminas: nurodykite datą ir laiką");
    else if (!k.terminas) b("ea-terminas", "Pasiūlymų terminas: tokio laiko nėra");
    else if (A.liko(k.terminas, new Date()).praejo) b("ea-terminas", "Pasiūlymų terminas: laikas jau praėjęs");
    var tk = a.tiekejai.filter(function (t) { return t.pav.trim() || t.pastas; }), pastai = {};
    if (!tk.length) b("ea-tk", "Tiekėjai: nurodykite bent vieną tiekėją", "ea-tk");
    else if (tk.some(function (t) { return !t.pav.trim() || !A.pastas(t.pastas); })) b("ea-tk", "Tiekėjai: kiekvienam reikia pavadinimo ir el. pašto adreso", "ea-tk");
    else if (tk.some(function (t) { var p = t.pastas.toLowerCase(); if (pastai[p]) return true; pastai[p] = true; return false; })) b("ea-tk", "Tiekėjai: tas pats el. pašto adresas nurodytas du kartus", "ea-tk");
    else if (tk.length > A.RIBOS.tiekejai) b("ea-tk", "Tiekėjai: ne daugiau kaip " + A.RIBOS.tiekejai, "ea-tk");
    if (vd.verte !== null && vd.verte > RIBA_PAZYMA && vd.verte <= RIBA_CVPIS && tk.length > 0 && tk.length < MIN_TIEKEJU && !String(vd.mazaiTiekeju || "").trim())
      b("ea-maz", "Tiekėjai: kviečiate mažiau kaip 3 - nurodykite kodėl (Aprašo 27.2.1 p.)");
    if (!k.kontaktas.vardas.trim()) b("ea-kvardas", "Jūsų vardas ir pavardė: užpildykite");
    if (!A.pastas(k.kontaktas.pastas)) b("ea-kpastas", "Jūsų el. paštas: įrašykite adresą, kuriuo tiekėjai atsiųs pasiūlymus");
    return kl;
  }

  /* ---------- nuorodos ir laiškai tiekėjams ---------- */
  function puslapioAdresas() { var u = new URL("pasiulymas.html", global.location.href); u.search = ""; u.hash = ""; return u.href; }
  function paruoskNuorodas(a) {
    if (a.busena === "juodrastis" || !a.antspaudas) return Promise.resolve();
    S.nuorodos = S.nuorodos.__id === a.id ? S.nuorodos : { __id: a.id };
    return Promise.all(a.tiekejai.map(function (t) {
      if (S.nuorodos[t.t]) return null;
      var kv = JSON.parse(JSON.stringify(a.kvietimas)); kv.tiekejas = { pav: t.pav, pastas: t.pastas }; kv.t = t.t; kv.kalba = t.kalba;
      return A.koduok(kv).then(function (kodas) {
        var nuoroda = puslapioAdresas() + "#k=" + kodas, l = A.laiskas(a.kvietimas, nuoroda, a.antspaudas, t.kalba);
        var href = "mailto:" + encodeURIComponent(t.pastas) + "?subject=" + encodeURIComponent(l.tema) + "&body=" + encodeURIComponent(l.tekstas);
        S.nuorodos[t.t] = { nuoroda: nuoroda, laiskas: l, mailto: href.length <= MAILTO_RIBA ? href : "mailto:" + encodeURIComponent(t.pastas) + "?subject=" + encodeURIComponent(l.tema), visas: href.length <= MAILTO_RIBA };
      });
    }));
  }

  /* ---------- apklausos vaizdas ---------- */
  function apklausosHtml(a) {
    var k = a.kvietimas, b = busena(a), lk = A.liko(k.terminas, new Date()), atv = !!a.atverta;
    var s = '<div class="ea-eile ea-nespausdinti" style="margin-bottom:12px"><button type="button" class="ea-btn" data-veiksmas="eaISarasa">&larr; Apklausų sąrašas</button></div>';
    s += '<section class="ea-hero" aria-labelledby="ea-hero-h"><div><div class="ea-hero-nr">ELEKTRONINĖ APKLAUSA · ' + esc(a.id) + '</div><h2 id="ea-hero-h">' + esc(k.pavadinimas) + '</h2>' +
      '<div class="ea-hero-meta"><span class="ea-zyma' + (b.z ? " ea-zyma--" + b.z : "") + '">' + esc(b.t) + '</span><span>kviesta ' + kiek(a.tiekejai.length, "tiekėjas", "tiekėjai", "tiekėjų") + '</span><span>gauta ' + kiek(a.pasiulymai.length, "pasiūlymas", "pasiūlymai", "pasiūlymų") + '</span>' +
      (a.vidaus.verte !== null ? '<span>numatoma vertė ' + esc(eur(a.vidaus.verte)) + ' be PVM</span>' : '') + '</div></div>' +
      '<div class="ea-laikr"><span>Pasiūlymų terminas (Lietuvos laiku)</span><b>' + esc(A.rodykLaika(k.terminas)) + '</b><i id="ea-liko">' + esc(lk.tekstas) + '</i></div></section>';
    var zing = [["Kvietimai", a.tiekejai.every(function (t) { return t.issiusta; }) || atv], ["Pasiūlymai", atv], ["Vertinimas", !!(a.sprendimas && a.sprendimas.patvirtinta)], ["Pažyma", a.busena === "uzbaigta"]];
    var dabartinis = a.busena === "nutraukta" ? -1 : zing.map(function (z) { return z[1]; }).indexOf(false);
    s += '<ol class="ea-eiga" aria-label="Apklausos eiga">' + zing.map(function (z, i) {
      return '<li' + (z[1] ? ' data-b="atlikta"' : '') + (i === dabartinis ? ' aria-current="step"' : '') + '><b aria-hidden="true">' + (z[1] ? "✓" : i + 1) + '</b><span>' + z[0] + (z[1] ? '<span class="visually-hidden" style="position:absolute;clip:rect(0 0 0 0)"> (atlikta)</span>' : '') + '</span></li>';
    }).join("") + '</ol>';
    s += '<div id="ea-kas-toliau">' + kasToliauHtml(a, b) + '</div>';
    if (a.busena === "nutraukta") s += '';
    if (atv) s += vertinimoHtml(a);
    if (!atv && a.busena !== "nutraukta") s += pasiulymuHtml(a);
    s += kvietimuHtml(a, atv || a.busena === "nutraukta" || a.tiekejai.every(function (t) { return t.issiusta; }), atv || a.busena === "nutraukta");
    s += duomenuHtml(a) + zurnaloHtml(a);
    return s;
  }
  function kasToliauHtml(a, b) {
    var k = a.kvietimas, s = "", n;
    if (b.k === "siusti") s = siuntimoSekaHtml(a);
    else if (b.k === "vyksta") s = '<div class="ea-pastaba ea-pastaba--info"><strong>Laukiama pasiūlymų</strong>Gavę tiekėjo laišką su pasiūlymo kodu, įkelkite jį žemiau. Kainos nebus rodomos, kol pasiūlymai neatverti.</div>';
    else if (b.k === "visi") s = '<div class="ea-pastaba ea-pastaba--gerai"><strong>Pasiūlymus pateikė visi kviesti tiekėjai</strong>Galite laukti termino arba atverti pasiūlymus dabar. Atvėrus anksčiau termino pakeisti pasiūlymai nebepriimami, o atvėrimas įrašomas į žurnalą.' +
      '<div class="ea-eile" style="margin-top:10px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="eaAtverkPasiulymus" data-anksciau="1">Atverti pasiūlymus dabar</button></div></div>';
    else if (b.k === "laukia") s = a.pasiulymai.length
      ? '<div class="ea-pastaba ea-pastaba--gerai"><strong>Terminas praėjo - galima atverti pasiūlymus</strong>Prieš atverdami įkelkite visus iki termino gautus laiškus. Atvėrus naujų pasiūlymų įkelti nebegalima.' +
        '<div class="ea-eile" style="margin-top:10px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="eaAtverkPasiulymus">Atverti pasiūlymus (' + a.pasiulymai.length + ')</button></div></div>'
      : '<div class="ea-pastaba ea-pastaba--demesio"><strong>Terminas praėjo, pasiūlymų neįkelta</strong>Jei laiškų gavote - įkelkite juos žemiau ir nurodykite gavimo laiką. Jei pasiūlymų negauta, užfiksuokite tai.' +
        '<div class="ea-eile" style="margin-top:10px"><button type="button" class="ea-btn" data-veiksmas="eaNegauta">Užfiksuoti: pasiūlymų negauta</button></div></div>';
    else if (b.k === "atverta") s = '<div class="ea-pastaba ea-pastaba--demesio"><strong>Įvertinkite pasiūlymus</strong>Prie kiekvieno pasiūlymo pažymėkite, ar jis atitinka poreikį, ir patvirtinkite sprendimą.</div>';
    else if (b.k === "ivertinta" || b.k === "uzbaigta") s = pazymosHtml(a);
    else if (b.k === "nutraukta") s = '<div class="ea-pastaba ea-pastaba--klaida"><strong>Apklausa nutraukta</strong>' + esc(a.sprendimas && a.sprendimas.pastaba ? a.sprendimas.pastaba : "") + '</div>';
    void k;
    return s;
  }
  /* Siuntimas paeiliui (2026-11-27, naudotojo sprendimas): vienu paspaudimu atveriamas kito tiekėjo laiškas jūsų pašto programoje;
     išsiuntus - „Išsiųsta - atverti kitą“ pažymi ankstesnį išsiųstu (žurnale) ir atveria kitą. Laišką siunčia žmogus savo pašto programoje,
     todėl išsiųstu pažymima tik jo patvirtinimu, ne atvėrus. Per ilgam laiškui atveriamas tuščias laiškas, o tekstas nukopijuojamas. */
  function sekaMygtukas(t, tekstas, buvo, pagr) {
    var n = S.nuorodos[t.t] || {};
    return '<a class="ea-btn' + (pagr ? " ea-btn--pagr" : "") + '" id="' + (pagr ? "ea-seka-kitas" : "ea-seka-dar") + '" href="' + esc(n.mailto || "#") + '" data-veiksmas="eaSeka" data-t="' + esc(t.t) + '"' +
      (buvo ? ' data-buvo="' + esc(buvo) + '"' : '') + '>' + tekstas + '</a>';
  }
  function siuntimoSekaHtml(a) {
    var liko = a.tiekejai.filter(function (t) { return !t.issiusta; }), n = a.tiekejai.length;
    if (!liko.length) return "";
    var dabar = S.seka && S.seka.id === a.id ? tiekejas(a, S.seka.t) : null;
    if (dabar && dabar.issiusta) dabar = null;
    var kitas = liko.filter(function (t) { return !dabar || t.t !== dabar.t; })[0], nr = function (t) { return a.tiekejai.indexOf(t) + 1; };
    var s = '<section class="ea-pastaba ea-pastaba--demesio ea-seka" aria-labelledby="ea-seka-h"><strong id="ea-seka-h" tabindex="-1">Išsiųskite kvietimus - neišsiųsta ' + liko.length + ' iš ' + n + '</strong>';
    if (!dabar) {
      s += 'Laiškai atveriami jūsų pašto programoje po vieną: atverkite, patikrinkite ir išsiųskite, tada grįžkite čia ir atverkite kitą.' +
        '<div class="ea-eile" style="margin-top:10px">' + sekaMygtukas(kitas, 'Atverti laišką: ' + esc(kitas.pav) + ' (' + nr(kitas) + ' iš ' + n + ')', "", true) + '</div>';
    } else {
      var nd = S.nuorodos[dabar.t] || {};
      s += 'Atvertas laiškas tiekėjui <b>' + esc(dabar.pav) + '</b> (' + esc(dabar.pastas) + '). Išsiuntę jį savo pašto programoje, pažymėkite' + (kitas ? ' ir atverkite kitą' : '') + '.' +
        (nd.visas === false ? '<div class="ea-uzuomina" style="margin-top:6px">Laiškas per ilgas atverti su tekstu: atvertas tuščias laiškas, o laiško tekstas nukopijuotas - įklijuokite jį.</div>' : '') +
        '<div class="ea-eile" style="margin-top:10px">' +
        (kitas ? sekaMygtukas(kitas, 'Išsiųsta - atverti kitą: ' + esc(kitas.pav) + ' (' + nr(kitas) + ' iš ' + n + ')', dabar.t, true)
          : '<button type="button" class="ea-btn ea-btn--pagr" id="ea-seka-kitas" data-veiksmas="eaSeka" data-buvo="' + esc(dabar.t) + '">Išsiųsta - visi kvietimai išsiųsti</button>') +
        sekaMygtukas(dabar, 'Atverti dar kartą', "", false) +
        '<button type="button" class="ea-btn ea-btn--tylus" data-veiksmas="eaKopijuok" data-t="' + esc(dabar.t) + '" data-ka="laiskas">Kopijuoti laiško tekstą</button></div>';
    }
    return s + '<div class="ea-uzuomina" style="margin-top:8px">Kiekvienam tiekėjui - atskiras laiškas su asmenine nuoroda. Visus laiškus galite matyti ir siųsti ir skiltyje „Kvietimai“ žemiau.</div></section>';
  }
  function kvietimuHtml(a, suskleista, beVeiksmu) {
    var s = '<section class="ea-card" aria-labelledby="ea-kv-h"><details' + (suskleista ? "" : " open") + '><summary id="ea-kv-h">Kvietimai (' + a.tiekejai.filter(function (t) { return t.issiusta; }).length + ' iš ' + a.tiekejai.length + ' išsiųsta)</summary>' +
      '<p class="ea-sub" style="margin-bottom:12px">Laišką išsiunčiate iš savo el. pašto: taip kvietimas ir tiekėjo atsakymas lieka jūsų pašte kaip įrodymas. Kvietimo antspaudas: <span class="ea-antsp">' + esc(A.trumpas(a.antspaudas)) + '</span></p><div class="ea-tiek">';
    a.tiekejai.forEach(function (t) {
      var n = S.nuorodos[t.t] || {}, p = pasiulymas(a, t.t);
      s += '<div class="ea-tk" data-b="' + (p ? "gauta" : "laukiama") + '" data-tiekejas="' + esc(t.t) + '"><div><div class="ea-tk-pav">' + esc(t.pav) + '</div><div class="ea-tk-meta">' + esc(t.pastas) + ' · kvietimas ' + (t.kalba === "en" ? "anglų k." : "lietuvių k.") + '</div></div>' +
        '<span class="ea-zyma' + (t.issiusta ? " ea-zyma--gerai" : "") + '">' + (t.issiusta ? "Išsiųsta " + esc(A.rodykLaika(t.issiusta)) : "Neišsiųsta") + '</span>';
      if (!beVeiksmu) s += '<div class="ea-tk-veiksmai ea-nespausdinti">' +
        '<a class="ea-btn ea-btn--maz' + (t.issiusta ? "" : " ea-btn--pagr") + '" href="' + esc(n.mailto || "#") + '" data-veiksmas="eaLaiskas" data-t="' + esc(t.t) + '">' + (n.visas ? "Atverti laišką" : "Atverti tuščią laišką") + '</a>' +
        '<button type="button" class="ea-btn ea-btn--maz" data-veiksmas="eaKopijuok" data-t="' + esc(t.t) + '" data-ka="laiskas">Kopijuoti laiško tekstą</button>' +
        '<button type="button" class="ea-btn ea-btn--maz" data-veiksmas="eaKopijuok" data-t="' + esc(t.t) + '" data-ka="nuoroda">Kopijuoti nuorodą</button>' +
        '<a class="ea-btn ea-btn--maz ea-btn--tylus" href="' + esc(n.nuoroda || "#") + '" target="_blank" rel="noopener">Peržiūrėti kaip tiekėjas</a>' +
        '<button type="button" class="ea-btn ea-btn--maz ea-btn--tylus" data-veiksmas="eaIssiusta" data-t="' + esc(t.t) + '" aria-pressed="' + (t.issiusta ? "true" : "false") + '">' + (t.issiusta ? "Atžymėti" : "Pažymėti išsiųstu") + '</button></div>' +
        (n.visas === false ? '<div class="ea-uzuomina" style="grid-column:1/-1">Laiškas per ilgas atverti su tekstu: nukopijuokite laiško tekstą ir įklijuokite į atvertą tuščią laišką.</div>' : '');
      s += '</div>';
    });
    return s + '</div></details></section>';
  }
  function pasiulymuHtml(a) {
    var po = praejo(a);
    var s = '<section class="ea-card" aria-labelledby="ea-ps-h"><h3 id="ea-ps-h">Pasiūlymai (' + a.pasiulymai.length + ' iš ' + a.tiekejai.length + ')</h3>' +
      '<p class="ea-sub">Įklijuokite tiekėjo laiško tekstą arba įkelkite išsaugotą laišką (.eml ar .txt). Įrankis patikrina, kuriam tiekėjui ir kuriai apklausai pasiūlymas skirtas; kainų nerodo, kol pasiūlymai neatverti. Pasiūlymo kodas suspaustas, bet neužšifruotas - tai darbo tvarka, ne apsauga nuo kainų perskaitymo.</p>' +
      '<div class="ea-zona ea-nespausdinti" id="ea-zona" data-veiksmas-dragover="eaVirs" data-veiksmas-dragleave="eaNeVirs" data-veiksmas-drop="eaNumesk" data-darbas-ne>' +
      '<div class="ea-laukas"><label for="ea-laisko-tekstas">Tiekėjo laiško tekstas</label><textarea id="ea-laisko-tekstas" rows="4" spellcheck="false" autocomplete="off" data-darbas-ne placeholder="pvz., visas laiško tekstas su eilutėmis -----BEGIN G-PROCURE OFFER----- ... -----END G-PROCURE OFFER-----"></textarea></div>';
    s += '<div class="ea-laukas" style="margin-top:12px;max-width:420px"><label for="ea-gauta"' + (po ? ' class="ea-privaloma"' : '') + '>Kada laiškas gautas (Lietuvos laiku)' + (po ? '' : ' - neprivaloma') + '</label><input type="datetime-local" id="ea-gauta" data-darbas-ne aria-describedby="ea-gauta-uz">' +
      '<span class="ea-uzuomina" id="ea-gauta-uz">' + (po ? 'Terminas jau praėjo, todėl nurodykite laiško gavimo laiką iš savo el. pašto - pagal jį nustatoma, ar pasiūlymas pateiktas laiku.'
        : 'Jei laišką gavote anksčiau, nei jį įkeliate, nurodykite gavimo laiką iš savo el. pašto: kai kainos vienodos, pirmesnis - anksčiau gautas pasiūlymas (Aprašo 30.17 p.). Nenurodžius - įkėlimo laikas.') + '</span></div>';
    s += '<div class="ea-eile" style="margin-top:12px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="eaIkelk">Įkelti pasiūlymą</button>' +
      '<button type="button" class="ea-btn" data-veiksmas="eaFailas">Pasirinkti failą</button><input type="file" id="ea-pasiulymo-failas" accept=".txt,.eml,text/plain,message/rfc822" multiple hidden data-veiksmas-change="eaFailasPasirinktas" aria-label="Pasiūlymo failas">' +
      '<span class="ea-uzuomina">Failus galima ir įtempti į šį langelį.</span></div></div>' +
      '<div id="ea-ikelimo-rez" role="status" aria-live="polite">' + ikelimoHtml() + '</div><div class="ea-tiek" style="margin-top:12px">';
    a.tiekejai.forEach(function (t) {
      var p = pasiulymas(a, t.t), veluoja = p && new Date(p.gauta) > new Date(a.kvietimas.terminas);
      s += '<div class="ea-tk" data-b="' + (p ? (veluoja ? "veluoja" : "gauta") : "laukiama") + '"><div><div class="ea-tk-pav">' + esc(t.pav) + '</div><div class="ea-tk-meta">' +
        (p ? 'gauta ' + esc(A.rodykLaika(p.gauta)) + (p.gautaKaip === "nurodyta" ? " (laiką nurodėte jūs)" : "") + ' · antspaudas <span class="ea-antsp">' + esc(A.trumpas(p.h)) + '</span>' + (p.pakeista ? " · pakeistas " + p.pakeista + " k." : "") : "pasiūlymas dar negautas") + '</div></div>' +
        '<span class="ea-zyma' + (p ? (veluoja ? " ea-zyma--klaida" : " ea-zyma--gerai") : "") + '">' + (p ? (veluoja ? "Gautas po termino" : "Gautas - neatvertas") : "Laukiama") + '</span></div>';
    });
    return s + '</div></section>';
  }
  function ikelimoHtml() {
    return S.ikelimas.map(function (x) { return '<div class="ea-pastaba ea-pastaba--' + (x.ok ? "gerai" : "klaida") + '"' + (x.ok ? "" : ' role="alert"') + '>' + esc(x.tekstas) + '</div>'; }).join("");
  }

  /* ---------- vertinimas ---------- */
  var PATV_PAV = { atitinka: "atitiktis reikalavimams", kaina: "visos išlaidos kainoje", igaliotas: "teisė teikti pasiūlymą" };
  function vertinimoHtml(a) {
    var v = vertink(a), sp = a.sprendimas || { neatitinka: {}, atitinka: {} }, baigta = !!(a.sprendimas && a.sprendimas.patvirtinta), k = a.kvietimas;
    var rik = v.eilutes.slice().sort(function (x, y) { var r = function (e) { return e.vieta ? e.vieta : e.busena === "neatitinka" ? 100 : e.busena === "nepilnas" ? 200 : e.busena === "pavėluotas" ? 300 : 400; }; return r(x) - r(y); });
    var s = '<section class="ea-card" aria-labelledby="ea-vt-h"><h3 id="ea-vt-h">Pasiūlymų eilė</h3><p class="ea-sub">Eilė sudaryta automatiškai pagal bendrą kainą be PVM (taisyklėmis, be dirbtinio intelekto). Pasiūlymai atverti ' + esc(A.rodykLaika(a.atverta)) +
      (a.atvertaAnksciau ? " - anksčiau termino, nes pasiūlymus buvo pateikę visi kviesti tiekėjai" : "") + '.</p>';
    v.lygios.forEach(function (g) {
      s += '<div class="ea-pastaba ea-pastaba--demesio"><strong>Vienodos kainos</strong>Pirmesnis - anksčiau gautas pasiūlymas (Aprašo 30.17 p.): ' + g.map(function (t) {
        var e = v.eilutes.filter(function (x) { return x.t === t; })[0], p = pasiulymas(a, t);
        return esc(e.tiekejas) + ' - gautas ' + esc(A.rodykLaika(e.gauta)) + (p && p.gautaKaip === "nurodyta" ? " (laiką nurodėte jūs)" : " (įkėlimo laikas)");
      }).join("; ") + '. Jei laiškus gavote kitu laiku, nei jie įkelti, eilę patikrinkite pagal savo el. paštą ir tai nurodykite pastaboje prie sprendimo.</div>';
    });
    s += '<div class="ea-eilej">';
    rik.forEach(function (e) {
      var p = pasiulymas(a, e.t), d = p && p.duomenys, zymos = "", pirmas = e.vieta === 1;
      if (e.busena === "negautas") { s += '<div class="ea-pas"><div class="ea-vieta" aria-hidden="true">-</div><div class="ea-pas-pav">' + esc(e.tiekejas) + '</div><div class="ea-pas-meta"><span class="ea-zyma">Pasiūlymo nepateikė</span></div></div>'; return; }
      if (pirmas) zymos += '<span class="ea-zyma ea-zyma--gerai">Mažiausia kaina</span>';
      if (e.busena === "pavėluotas") zymos += '<span class="ea-zyma ea-zyma--klaida">Gautas po termino - nevertinamas</span>';
      if (e.busena === "nepilnas") zymos += '<span class="ea-zyma ea-zyma--klaida">Trūksta kainų: ' + e.truksta + ' poz.</span>';
      if (e.busena === "neatitinka") zymos += '<span class="ea-zyma ea-zyma--klaida">Neatitinka poreikio</span>';
      if (e.virsLesu) zymos += '<span class="ea-zyma ea-zyma--demesio">Viršija numatomą vertę</span>';
      if (e.nmk) zymos += '<span class="ea-zyma ea-zyma--demesio">Neįprastai maža kaina</span>';
      if (e.kitasTiekejas) zymos += '<span class="ea-zyma ea-zyma--demesio">Kviestas kitas tiekėjas: ' + esc(e.kitasTiekejas) + '</span>';
      if (e.nepatvirtinta && e.nepatvirtinta.length) zymos += '<span class="ea-zyma ea-zyma--demesio">Tiekėjas nepatvirtino: ' + esc(e.nepatvirtinta.map(function (x) { return PATV_PAV[x]; }).join(", ")) + '</span>';
      s += '<div class="ea-pas"' + (pirmas ? ' data-b="pirmas"' : '') + ' data-tiekejas="' + esc(e.t) + '"><div class="ea-vieta"' + (e.vieta ? ' aria-label="' + e.vieta + ' vieta"' : ' aria-hidden="true"') + '>' + (e.vieta || "-") + '</div>' +
        '<div class="ea-pas-pav">' + esc(e.tiekejas) + '</div><div class="ea-pas-kaina"><b>' + esc(eur(e.viso)) + '</b><span>be PVM' + (e.pvm ? " · su PVM " + esc(eur(e.suPvm)) : " · ne PVM mokėtojas") + '</span></div>' +
        '<div class="ea-pas-meta">' + zymos + '<span>gauta ' + esc(A.rodykLaika(e.gauta)) + '</span><span>antspaudas <span class="ea-antsp">' + esc(A.trumpas(p.h)) + '</span></span></div>';
      s += '<div class="ea-pas-sprend">';
      if (d) s += '<details><summary style="font-size:13px">Pasiūlymo sąlygos ir tiekėjo duomenys</summary><dl class="ea-dl" style="margin-top:8px">' +
        '<dt>Pasiūlymas galioja</dt><dd>' + (d.galioja ? kiek(d.galioja, "dieną", "dienas", "dienų") : "nenurodyta") + '</dd>' +
        (d.pristatymas ? '<dt>Pristatymo ar atlikimo terminas</dt><dd>' + esc(d.pristatymas) + '</dd>' : '') + (d.pastabos ? '<dt>Tiekėjo pastabos</dt><dd style="white-space:pre-line">' + esc(d.pastabos) + '</dd>' : '') +
        '<dt>Tiekėjas</dt><dd>' + esc([d.tiekejas.pav, d.tiekejas.kodas && "kodas " + d.tiekejas.kodas, d.tiekejas.pvmKodas && "PVM kodas " + d.tiekejas.pvmKodas, d.tiekejas.adresas].filter(Boolean).join(", ")) + '</dd>' +
        '<dt>Pasiūlymą pateikė</dt><dd>' + esc([d.tiekejas.asmuo, d.tiekejas.pastas, d.tiekejas.tel].filter(Boolean).join(", ")) + '</dd></dl></details>';
      if ((e.busena === "tinkamas" || e.busena === "neatitinka") && !baigta) {
        var at = sp.atitinka && sp.atitinka[e.t] ? "taip" : Object.prototype.hasOwnProperty.call(sp.neatitinka || {}, e.t) ? "ne" : "";
        s += '<fieldset><legend>Ar pasiūlymas atitinka poreikį?</legend>' +
          '<label><input type="radio" name="ea-at-' + esc(e.t) + '" value="taip"' + (at === "taip" ? " checked" : "") + ' data-veiksmas-change="eaAtitiktis" data-t="' + esc(e.t) + '"> Atitinka</label>' +
          '<label><input type="radio" name="ea-at-' + esc(e.t) + '" value="ne"' + (at === "ne" ? " checked" : "") + ' data-veiksmas-change="eaAtitiktis" data-t="' + esc(e.t) + '"> Neatitinka</label></fieldset>';
        if (at === "ne") s += '<div class="ea-laukas"><label for="ea-pr-' + esc(e.t) + '" class="ea-privaloma">Kuo neatitinka</label><input type="text" id="ea-pr-' + esc(e.t) + '" maxlength="500" value="' + esc(sp.neatitinka[e.t] || "") +
          '" data-veiksmas-change="eaPriezastis" data-t="' + esc(e.t) + '" placeholder="pvz., siūlomas modelis neturi reikalaujamos garantijos"></div>';
      } else if (e.busena === "neatitinka") s += '<div class="ea-sub">Neatitinka: ' + esc(e.priezastis) + '</div>';
      else if (baigta && e.busena === "tinkamas") s += '<div class="ea-sub">Įvertinta: atitinka poreikį.</div>';
      s += '</div></div>';
    });
    s += '</div></section>';
    /* palyginimo lentelė */
    var st = v.eilutes.filter(function (e) { return e.sumos && e.busena !== "pavėluotas"; });
    if (st.length) {
      s += '<section class="ea-card" aria-labelledby="ea-mt-h"><h3 id="ea-mt-h">Kainų palyginimas</h3><p class="ea-sub">Vieneto kainos be PVM. Mažiausia vertinamų pasiūlymų kaina pažymėta ▼.' + (st.length > 1 ? '<span class="ea-tik-telefone"> Lentelę galima slinkti į šoną.</span>' : '') + '</p><div class="ea-lent-remas"><table class="ea-lent"><thead><tr><th scope="col">Pozicija</th><th scope="col" class="ea-sk">Kiekis</th>' +
        st.map(function (e) { return '<th scope="col" class="ea-sk">' + esc(e.tiekejas) + '</th>'; }).join("") + '</tr></thead><tbody>';
      k.pozicijos.forEach(function (poz, i) {
        s += '<tr><th scope="row" style="font-weight:400">' + (i + 1) + '. ' + esc(poz.pav) + '</th><td class="ea-sk">' + fmt(poz.kiekis, 0, 4) + (poz.mat ? "\u00a0" + esc(poz.mat) : "") + '</td>' +
          st.map(function (e) { var x = e.sumos.eilutes[i], maz = e.busena === "tinkamas" && x.ikainis !== null && x.ikainis === v.matrica[i].maziausias && st.length > 1;
            return '<td class="ea-sk' + (maz ? " ea-maz" : "") + (e.busena !== "tinkamas" ? " ea-pilka" : "") + '">' + (x.ikainis === null ? "-" : fmt(x.ikainis, 2, 4)) + (x.pastaba ? '<span class="ea-poz-past">' + esc(x.pastaba) + '</span>' : '') + '</td>'; }).join("") + '</tr>';
      });
      s += '</tbody><tfoot><tr><th scope="row" colspan="2">Iš viso be PVM</th>' + st.map(function (e) { return '<td class="ea-sk">' + fmt(e.viso, 2, 2) + '</td>'; }).join("") + '</tr>' +
        '<tr><th scope="row" colspan="2" style="font-weight:400">Iš viso su PVM</th>' + st.map(function (e) { return '<td class="ea-sk" style="font-weight:400">' + (e.pvm ? fmt(e.suPvm, 2, 2) : "PVM netaikomas") + '</td>'; }).join("") + '</tr></tfoot></table></div></section>';
    }
    if (!baigta) s += sprendimoHtml(a, v);
    return s;
  }
  function sprendimoKliutys(a, v) {
    var sp = a.sprendimas || { neatitinka: {}, atitinka: {} }, kl = [];
    v.eilutes.forEach(function (e) {
      if (e.busena === "tinkamas" && !(sp.atitinka && sp.atitinka[e.t])) kl.push(e.tiekejas + ": pažymėkite, ar pasiūlymas atitinka poreikį");
      if (e.busena === "neatitinka" && !String(e.priezastis || "").trim()) kl.push(e.tiekejas + ": įrašykite, kuo pasiūlymas neatitinka");
    });
    return kl;
  }
  function sprendimoHtml(a, v) {
    var kl = sprendimoKliutys(a, v), lm = v.siulomas ? v.eilutes.filter(function (e) { return e.t === v.siulomas; })[0] : null, gauta = v.eilutes.filter(function (e) { return e.busena !== "negautas" && e.busena !== "pavėluotas"; }).length;
    var velai = v.eilutes.filter(function (e) { return e.busena === "pavėluotas"; }).length;
    var s = '<section class="ea-card" aria-labelledby="ea-sp-h" id="ea-sprendimas"><h3 id="ea-sp-h">Sprendimas</h3>';
    if (!gauta) s += '<div class="ea-pastaba ea-pastaba--demesio">' + (velai ? "<strong>Per nustatytą terminą pasiūlymų negauta</strong>Gauti tik pasiūlymai po termino - jie nevertinami ir pažymoje bus pažymėti „Nevertintas“." : "Pasiūlymų negauta.") + '</div>';
    else if (!lm) s += '<div class="ea-pastaba ea-pastaba--demesio"><strong>Vertinamų pasiūlymų nėra</strong>Visi gauti pasiūlymai pavėluoti, nepilni arba pažymėti kaip neatitinkantys poreikio. Patvirtinus bus užfiksuota, kad visi pasiūlymai atmesti.</div>';
    else {
      s += '<div class="ea-pastaba ea-pastaba--gerai"><strong>Siūlomas laimėtojas: ' + esc(lm.tiekejas) + ' <span class="ea-zyma ea-zyma--demesio">Siūloma (nepatvirtinta)</span></strong>Mažiausia kaina tarp vertinamų pasiūlymų - ' + esc(eur(lm.viso)) + ' be PVM' +
        (a.vidaus.verte !== null ? " (numatoma vertė " + esc(eur(a.vidaus.verte)) + ")" : "") + '. Eilę sudarė taisyklės; ar pasiūlymas atitinka poreikį, įvertinate ir sprendimą priimate jūs.</div>';
      if (lm.virsLesu) s += '<div class="ea-pastaba ea-pastaba--demesio"><strong>Kaina viršija numatomą vertę (pirkimui skirtas lėšas)</strong>' + (a.vidaus.lesos !== null ? 'Skirta ' : 'Numatoma vertė ') + esc(eur(v.lesos)) + ' be PVM. Pažymoje reikės nurodyti, ar lėšos padidintos.</div>';
      if (lm.nmk) s += '<div class="ea-pastaba ea-pastaba--demesio"><strong>Kaina gali būti neįprastai maža</strong>Ji 30 ir daugiau procentų mažesnė už vertinamų pasiūlymų kainų vidurkį (' + esc(eur(v.vidurkis)) + '). Paprašykite tiekėjo kainą pagrįsti ir rezultatą nurodykite pažymoje' + teise("nmk_riba") + '.</div>';
      if (gauta === 1 && a.tiekejai.length > 1) s += '<div class="ea-pastaba ea-pastaba--info">Gautas vienas pasiūlymas iš ' + a.tiekejai.length + ' kviestų tiekėjų - palyginti kainų nėra su kuo.</div>';
      else if (v.nmkNetikrinta) s += '<div class="ea-pastaba ea-pastaba--info">Neįprastai mažos kainos patikra neatlikta: numatomos vertės (pirkimui skirtų lėšų) neviršija mažiau kaip du vertinami pasiūlymai, todėl kainų vidurkio palyginti nėra su kuo. Jei kaina atrodo neįprastai maža, įvertinkite patys.</div>';
      if (lm.kitasTiekejas) s += '<div class="ea-pastaba ea-pastaba--demesio"><strong>Pasiūlymą pateikė ne kviestas tiekėjas</strong>Kvietimas buvo išsiųstas „' + esc(lm.kitasTiekejas) + '“, o pasiūlymą pateikė „' + esc(lm.tiekejas) + '“ (nuoroda galėjo būti persiųsta). Prieš patvirtindami įsitikinkite, kad tai priimtina.</div>';
    }
    s += '<div class="ea-laukas" style="margin-top:12px"><label for="ea-sp-pastaba">Pastaba prie sprendimo</label><textarea id="ea-sp-pastaba" rows="2" maxlength="1000" placeholder="pvz., kaina suderinta su biudžeto valdytoju">' + esc(a.sprendimas ? a.sprendimas.pastaba : "") + '</textarea></div>';
    if (kl.length) s += '<div class="ea-pastaba ea-pastaba--demesio" id="ea-sp-kliutys"><strong>Prieš patvirtinant</strong><ul>' + kl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul></div>';
    s += '<div class="ea-eile ea-nespausdinti" style="margin-top:16px"><button type="button" class="ea-btn ea-btn--pavojus" data-veiksmas="eaNutrauk">Nutraukti apklausą</button><span class="ea-tarpas"></span>' +
      '<button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="eaPatvirtink">' + (!gauta ? (velai ? "Patvirtinti: per terminą pasiūlymų negauta" : "Patvirtinti: pasiūlymų negauta") : !lm ? "Patvirtinti: visi pasiūlymai atmesti" : "Patvirtinti sprendimą") + '</button></div></section>';
    return s;
  }
  function teise(raktas) {
    try { return global.GP_TEISE ? " (" + global.GP_TEISE.cit(raktas, "PI") + ")" : ""; } catch (e) { return ""; }
  }

  /* ---------- pažyma ---------- */
  function pazymosHtml(a) {
    var sp = a.sprendimas, v = vertink(a), lm = sp.rezultatas === "laimetojas" ? v.eilutes.filter(function (e) { return e.t === sp.laimetojas; })[0] : null, maza = a.vidaus.verte !== null && a.vidaus.verte <= RIBA_PAZYMA;
    var rez = lm ? 'Laimėtojas - <b>' + esc(lm.tiekejas) + '</b>, ' + esc(eur(lm.viso)) + ' be PVM' : sp.rezultatas === "negauta" ? "Pasiūlymų negauta" : "Visi pasiūlymai atmesti";
    var s = '<div class="ea-pastaba ea-pastaba--gerai"><strong>Sprendimas patvirtintas ' + esc(A.rodykLaika(sp.patvirtinta)) + '</strong>' + rez + '.' + (sp.pastaba ? " " + esc(sp.pastaba) : "");
    if (a.busena === "uzbaigta") s += '<div style="margin-top:8px">Pirkimo pažyma užpildyta ' + esc(A.rodykLaika(a.pazyma)) + '.</div>';
    s += maza ? '<div style="margin-top:8px">Vertė neviršija 5 000 Eur be PVM, todėl pirkimo pažyma nepildoma (Aprašo 12 p.). Jei reikia pranešimų tiekėjams apie rezultatą, pažymą vis tiek galite užpildyti - pranešimai parengiami kartu su ja.</div>'
      : '<div style="margin-top:8px">Pažyma (1 priedas) užpildoma iš apklausos duomenų: pirkimo objektas, kviesti tiekėjai, pasiūlymai, jų įvertinimas ir apklausos eiga. Likusius laukus papildote ir sugeneruojate Word; pranešimai tiekėjams parengiami kartu.</div>';
    s += '<div class="ea-eile ea-nespausdinti" style="margin-top:12px"><button type="button" class="ea-btn' + (maza ? "" : " ea-btn--pagr") + '" data-veiksmas="eaPazyma">' + (a.busena === "uzbaigta" ? "Užpildyti pažymą iš naujo" : "Užpildyti pirkimo pažymą") + '</button>' +
      '<button type="button" class="ea-btn" data-veiksmas="eaSpausdink">Spausdinti apklausos suvestinę</button>' +
      (a.busena === "ivertinta" ? '<button type="button" class="ea-btn ea-btn--tylus" data-veiksmas="eaKeiskSprendima">Keisti sprendimą</button>' : '') + '</div></div>';
    return s;
  }
  function pazymosDuomenys(a) {
    var v = vertink(a), sp = a.sprendimas, k = a.kvietimas, tar = tarifas(), st = function (n) { return typeof n === "number" ? String(Math.round(n * 100) / 100) : ""; };
    var gauta = v.eilutes.filter(function (e) { return e.busena !== "negautas"; });
    var eil = gauta.map(function (e) {
      return { tiekejas: e.tiekejas, kainaBePvm: st(e.viso), kainaSuPvm: st(e.pvm ? e.suPvm : e.viso), balai: "",
        pasiulVert: e.busena === "tinkamas" ? "Atitinka" : e.busena === "pavėluotas" ? "Nevertintas" : "Neatitinka", kitiVert: "",
        neatitikimas: e.busena === "pavėluotas" ? "Pasiūlymas gautas pasibaigus pasiūlymų pateikimo terminui (" + A.rodykLaika(e.gauta) + ")" : e.busena === "nepilnas" ? "Nepateiktos visų pozicijų kainos" : e.busena === "neatitinka" ? e.priezastis : "" };
    });
    var info = ["Pirkimas atliktas elektronine apklausa (G-Procure, apklausos Nr. " + a.id + ", kvietimo antspaudas " + A.trumpas(a.antspaudas) + ").",
      "Kvietimai pateikti pasiūlymus išsiųsti el. paštu " + kiek(a.tiekejai.length, "tiekėjui", "tiekėjams", "tiekėjų") + ": " + a.tiekejai.map(function (t) { return t.pav + (t.issiusta ? " (" + A.rodykLaika(t.issiusta) + ")" : ""); }).join("; ") + ".",
      "Pasiūlymų terminas - " + A.rodykLaika(k.terminas) + ". Gauta pasiūlymų: " + gauta.length + ". Pasiūlymai atverti " + A.rodykLaika(a.atverta) + (a.atvertaAnksciau ? " (anksčiau termino, pasiūlymus pateikus visiems kviestiems tiekėjams)" : "") + "."];
    if (gauta.length) info.push("Pasiūlymų antspaudai: " + gauta.map(function (e) { return e.tiekejas + " - " + A.trumpas(pasiulymas(a, e.t).h); }).join("; ") + ".");
    info.push("Pasiūlymų eilė sudaryta automatiškai pagal kainą be PVM (taisyklėmis, dirbtinis intelektas nenaudotas); atitiktį poreikiui įvertino ir sprendimą " + A.rodykLaika(sp.patvirtinta) + " patvirtino pirkimo iniciatorius.");
    if (v.nmk.length) info.push("Kaina 30 ir daugiau procentų mažesnė už vertinamų pasiūlymų kainų vidurkį (" + fmt(v.vidurkis, 2, 2) + " Eur): " + v.nmk.map(function (t) { return (tiekejas(a, t) || {}).pav; }).join(", ") + ".");
    if (a.vidaus.mazaiTiekeju) info.push("Kreiptasi į mažiau kaip 3 tiekėjus: " + a.vidaus.mazaiTiekeju);
    if (k.nacsaugumas) info.push("Tiekėjai pasiūlymo formoje patvirtino atitiktį Aprašo 27.2.3 ir 31.4 p. nurodytiems nacionalinio saugumo reikalavimams (vietoje atskiros atitikties deklaracijos).");
    v.lygios.forEach(function (g) { info.push("Vienodos kainos: pirmesnis - anksčiau gautas pasiūlymas (Aprašo 30.17 p.): " + g.map(function (t) { var e = v.eilutes.filter(function (x) { return x.t === t; })[0]; return e.tiekejas + " (gautas " + A.rodykLaika(e.gauta) + ")"; }).join(", ") + "."); });
    var kit = v.eilutes.filter(function (e) { return e.kitasTiekejas && e.busena !== "negautas"; });
    if (kit.length) info.push("Pasiūlymą pateikė ne kviestas tiekėjas: " + kit.map(function (e) { return e.tiekejas + " (kviestas " + e.kitasTiekejas + ")"; }).join(", ") + ".");
    if (sp.pastaba) info.push(sp.pastaba);
    var galas = a.zurnalas[a.zurnalas.length - 1];
    if (galas) info.push("Paskutinio apklausos žurnalo įrašo antspaudas (pažymos pildymo metu): " + String(galas.h).toUpperCase().replace(/(.{4})(?=.)/g, "$1-") + ".");
    var tinkamu = v.eile.length, laiku = v.eilutes.filter(function (e) { return e.busena !== "negautas" && e.busena !== "pavėluotas"; }).length;
    return { formNum: 1, timestamp: dabarIso(),
      fields: { pirkimoPavadinimas: k.pavadinimas, verteBePvm: st(a.vidaus.verte), verteSuPvm: a.vidaus.verte !== null && tar ? st(a.vidaus.verte * (1 + tar)) : "", lesosBePvm: st(skirtosLesos(a)), bvpzKodas: a.vidaus.bvpz,
        pirkimoBudas: "Neskelbiama apklausa raštu", vertinimoKriterijus: "Kaina", iniPadalinys: a.vidaus.padalinys, iniPareigos: a.vidaus.pareigos, iniVardas: k.kontaktas.vardas,
        kviestaSkaicius: String(a.tiekejai.length), kviestiTiekejai: a.tiekejai.map(function (t) { return t.pav; }).join(", "), kitaInfo: info.join("\n"),
        sprendimoScenarijus: sp.rezultatas === "negauta" || !laiku ? "negauta" : sp.rezultatas === "atmesta" ? "atmesta" : tinkamu === 1 ? "vienas-tiekejas" : "sutartis" },
      radios: { atliekamas: "El. paštu" }, rows: { pasiulymai: eil, galutiniai: [], natSaug: [], dalys: [], kvalif: [] }, perDalis: {} };
  }
  function uzpildykPazyma(a) {
    var d = pazymosDuomenys(a);
    rodyk("");
    global.selectForm(1);
    global.loadFormData(d);
    doc.querySelectorAll("#pasiulymu-tbody tr").forEach(function (tr) { tr.querySelectorAll('[data-field="kainaBePvm"], [data-field="kainaSuPvm"]').forEach(function (el) { if (el.value) el.dataset.ranka = "1"; }); });
    ["validateValue", "tvirtintojoUzuomina", "tikrinkLesas", "tikrinkKviestus", "syncGalutiniaiFromPasiulymai", "autoFillSprendimai", "likoAtnaujink"].forEach(function (f) { try { if (typeof global[f] === "function") global[f](); } catch (e) {} });
    var di = $("draft-info"); if (di) di.textContent = "Užpildyta iš elektroninės apklausos " + a.id;
    var s = $("form-selector"); if (s) s.style.display = "none";
    if (global.GP_DARBAS) { global.GP_DARBAS.stebek(function () { return [a.id]; }); }
    pranesk("Pažyma užpildyta iš apklausos " + a.id + ". Peržiūrėkite ir papildykite likusius laukus.");
    var fc = $("form-container"), h = fc && fc.querySelector(".section-header, h2, h3");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
  }

  /* ---------- apklausos duomenys, žurnalas, patikra ---------- */
  function duomenuHtml(a) {
    var k = a.kvietimas, vd = a.vidaus;
    return '<section class="ea-card" aria-labelledby="ea-dm-h"><details><summary id="ea-dm-h">Apklausos duomenys</summary><dl class="ea-dl">' +
      '<dt>Pirkimo vykdytojas</dt><dd>' + esc(k.pirkejas.pav) + '</dd>' + (k.aprasymas ? '<dt>Aprašymas ir reikalavimai</dt><dd style="white-space:pre-line">' + esc(k.aprasymas) + '</dd>' : '') +
      '<dt>Pozicijos</dt><dd>' + k.pozicijos.map(function (p, i) { return (i + 1) + ". " + esc(p.pav) + " - " + fmt(p.kiekis, 0, 4) + (p.mat ? " " + esc(p.mat) : "") + (p.pastaba ? " (" + esc(p.pastaba) + ")" : ""); }).join("<br>") + '</dd>' +
      (k.pristatymoVieta ? '<dt>Pristatymo ar atlikimo vieta</dt><dd>' + esc(k.pristatymoVieta) + '</dd>' : '') + (k.pristatymoTerminas ? '<dt>Pristatymo ar atlikimo terminas</dt><dd>' + esc(k.pristatymoTerminas) + '</dd>' : '') +
      (k.apmokejimas ? '<dt>Apmokėjimo sąlygos</dt><dd>' + esc(k.apmokejimas) + '</dd>' : '') +
      '<dt>Kontaktinis asmuo</dt><dd>' + esc([k.kontaktas.vardas, k.kontaktas.pastas, k.kontaktas.tel].filter(Boolean).join(", ")) + '</dd>' +
      '<dt>Numatoma vertė be PVM</dt><dd>' + esc(eur(vd.verte)) + ' <span class="ea-uzuomina">(tiekėjams nerodoma)</span></dd>' + (vd.lesos !== null ? '<dt>Skirtos lėšos be PVM</dt><dd>' + esc(eur(vd.lesos)) + ' <span class="ea-uzuomina">(tiekėjams nerodoma)</span></dd>' : '') +
      (vd.bvpz ? '<dt>BVPŽ kodas</dt><dd>' + esc(vd.bvpz) + '</dd>' : '') + (vd.mazaiTiekeju ? '<dt>Kodėl mažiau kaip 3 tiekėjai</dt><dd>' + esc(vd.mazaiTiekeju) + '</dd>' : '') +
      (a.importuota ? '<dt>Įkelta iš failo</dt><dd>' + esc(a.importuota) + '</dd>' : '') + '</dl></details></section>';
  }
  var IVYKIAI = { paskelbta: "Apklausa paskelbta", issiusta: "Kvietimas pažymėtas išsiųstu", atzymeta: "Kvietimo išsiuntimo žyma nuimta", gauta: "Pasiūlymas įkeltas", pakeista: "Pasiūlymas pakeistas naujesniu", atverta: "Pasiūlymai atverti",
    atitiktis: "Atitiktis poreikiui įvertinta", sprendimas: "Sprendimas patvirtintas", atsaukta: "Sprendimas atšauktas", pazyma: "Pirkimo pažyma užpildyta", nutraukta: "Apklausa nutraukta", negauta: "Užfiksuota: pasiūlymų negauta", importuota: "Apklausa įkelta iš bylos failo", nepriimta: "Pakeistas pasiūlymas gautas po termino - nepriimtas" };
  function zurnaloHtml(a) {
    var pt = S.patikra && S.patikra.id === a.id ? S.patikra.rez : null, s = '<section class="ea-card" aria-labelledby="ea-zr-h"><details><summary id="ea-zr-h">Žurnalas ir vientisumo patikra (' + a.zurnalas.length + ')</summary>';
    s += '<p class="ea-sub" style="margin-bottom:8px">Kiekvienas žurnalo įrašas apima ankstesnio įrašo antspaudą, o įrašuose - kvietimo ir pasiūlymų antspaudai, gavimo laikai, vertė ir sprendimas. Patikra palygina apklausos duomenis su žurnalu, todėl randamas pakeistas gavimo laikas, pašalintas pasiūlymas ar grąžinta būsena. Jei kartu būtų pakeistas ir žurnalas, tai parodo tik paskutinio įrašo antspaudas, palygintas su pažymoje įrašytuoju. Kvietimo ir pasiūlymų antspaudus turi ir tiekėjai - savo laiškuose.</p>';
    if (pt) s += '<div class="ea-pastaba ea-pastaba--' + (pt.ok ? "gerai" : "klaida") + '" role="status"><strong>' + (pt.ok ? "Vientisumo patikra: neatitikimų nerasta" : "Vientisumo patikra: rasta neatitikimų") + '</strong><ul>' +
      '<li>Kvietimo antspaudas: ' + (pt.kvietimas ? "sutampa" : "NESUTAMPA") + '</li><li>Pasiūlymų antspaudai: ' + (pt.pasiulymai.length ? (pt.pasiulymai.every(function (x) { return x.ok; }) ? "sutampa (" + pt.pasiulymai.length + ")" : "NESUTAMPA - " +
        pt.pasiulymai.filter(function (x) { return !x.ok; }).map(function (x) { return esc((tiekejas(a, x.t) || {}).pav || x.t); }).join(", ")) : "pasiūlymų nėra") + '</li>' +
      '<li>Žurnalo grandinė: ' + (pt.zurnalas ? "nepažeista" : "PAŽEISTA ties " + (pt.zurnaloVieta + 1) + " įrašu") + '</li>' +
      '<li>Apklausos duomenys ir žurnalas: ' + (!pt.duomenysTikrinti ? "nepatikrinta (žurnalas sudarytas iki 2026-11-27)" : pt.duomenys.length ? "NESUTAMPA:<ul>" + pt.duomenys.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "sutampa") + '</li>' +
      (pt.galas ? '<li>Paskutinis žurnalo įrašas: ' + esc(A.rodykLaika(pt.galas.laikas)) + ' (' + esc(IVYKIAI[pt.galas.ivykis] || pt.galas.ivykis) + '), antspaudas <span class="ea-antsp">' + esc(String(pt.galas.h).toUpperCase().replace(/(.{4})(?=.)/g, "$1-")) + '</span> - palyginkite su pažymoje įrašytuoju</li>' : '') + '</ul></div>';
    s += '<ol class="ea-zurn">' + a.zurnalas.map(function (e) { return '<li><time>' + esc(A.rodykLaika(e.laikas)) + '</time><span><b>' + esc(IVYKIAI[e.ivykis] || e.ivykis) + '</b>' + (e.detales ? ' <span class="ea-zurn-d">- ' + esc(e.detales) + '</span>' : '') + '</span></li>'; }).join("") + '</ol>' +
      '<div class="ea-eile ea-nespausdinti" style="margin-top:12px"><button type="button" class="ea-btn ea-btn--maz" data-veiksmas="eaPatikra">Tikrinti vientisumą</button>' +
      '<button type="button" class="ea-btn ea-btn--maz" data-veiksmas="eaByla">Atsisiųsti apklausos bylą (JSON)</button><button type="button" class="ea-btn ea-btn--maz" data-veiksmas="eaKopija">Kopijuoti kaip naują apklausą</button>' +
      '<span class="ea-tarpas"></span>' + (["paskelbta"].indexOf(a.busena) >= 0 ? '<button type="button" class="ea-btn ea-btn--maz ea-btn--pavojus" data-veiksmas="eaNutrauk">Nutraukti apklausą</button>' : '') +
      '<button type="button" class="ea-btn ea-btn--maz ea-btn--pavojus" data-veiksmas="eaTrink" data-id="' + esc(a.id) + '">Ištrinti</button></div></details></section>';
    return s;
  }

  /* ---------- pasiūlymų įkėlimas ---------- */
  var KOPIJOS_ZYME = "G-PROCURE: TIEKĖJO KOPIJA";
  /* Pasiūlymo įkėlimas. gautaIso - laiško gavimo laikas iš iniciatoriaus el. pašto: po termino privalomas, iki termino - neprivalomas
     (nenurodžius - įkėlimo laikas). Jis lemia, ar pasiūlymas pateiktas laiku, ir vienodų kainų eilę (Aprašo 30.17 p.). */
  function ikelkTeksta(tekstas, gautaIso, id) {
    var a = gauk(id || S.id), rez = [];
    if (!a || a.busena !== "paskelbta") return Promise.resolve(rez);
    if (String(tekstas).indexOf(KOPIJOS_ZYME) >= 0) {
      rez.push({ ok: false, tekstas: "Tai tiekėjo kopija savo įrašams, ne pasiūlymo laiškas: pasiūlymo kodo joje nėra, o kainos matomos atviru tekstu. Paprašykite tiekėjo atsiųsti laišką su pasiūlymo kodu." });
      return Promise.resolve(rez);
    }
    var kodai = A.isSarvo(tekstas).filter(function (x) { return x.rusis !== "kvietimas"; });
    if (!kodai.length) { rez.push({ ok: false, tekstas: "Pasiūlymo kodo tekste nerasta. Nukopijuokite visą tiekėjo laiško tekstą - nuo eilutės „-----BEGIN G-PROCURE OFFER-----“ iki „-----END G-PROCURE OFFER-----“." }); return Promise.resolve(rez); }
    var po = praejo(a), grandine = Promise.resolve(), terminas = new Date(a.kvietimas.terminas);
    kodai.forEach(function (x) {
      grandine = grandine.then(function () {
        return A.atkoduok(x).then(function (r) {
          var f = A.pasiulymoForma(r.obj), kodas = r.kodas;
          if (!f.ok) { rez.push({ ok: false, tekstas: f.klaida === "versija" ? "Pasiūlymas parengtas naujesne įrankio versija - perkraukite puslapį ir įkelkite dar kartą." : "Kode nėra tinkamo pasiūlymo." }); return; }
          var p = f.pasiulymas, tk = tiekejas(a, p.t);
          if (p.apklausa !== a.id) { rez.push({ ok: false, tekstas: "Šis pasiūlymas skirtas kitai apklausai (" + p.apklausa + "), ne šiai." }); return; }
          if (p.kvietimas !== a.antspaudas) { rez.push({ ok: false, tekstas: "Pasiūlymas parengtas pagal kitą kvietimą (kvietimo antspaudas nesutampa). Paprašykite tiekėjo pasiūlymą parengti iš jam išsiųstos nuorodos." }); return; }
          if (!tk) { rez.push({ ok: false, tekstas: "Pasiūlymas parengtas iš nuorodos, kuri nebuvo išduota nė vienam šios apklausos tiekėjui." }); return; }
          var gauta = gautaIso || (po ? "" : dabarIso());
          if (!gauta) { rez.push({ ok: false, tekstas: tk.pav + ": terminas jau praėjo - nurodykite, kada laiškas gautas, ir įkelkite dar kartą." }); return; }
          var velai = new Date(gauta) > terminas;
          return A.antspaudas(p).then(function (h) {
            var senas = pasiulymas(a, p.t), senasLaiku = senas && !(new Date(senas.gauta) > terminas);
            if (senas && senas.h === h) { rez.push({ ok: true, tekstas: tk.pav + ": šis pasiūlymas jau įkeltas (antspaudas " + A.trumpas(h) + ")." }); return; }
            // Po termino gautas pakeitimas laiku pateikto pasiūlymo nekeičia (Aprašo 31.2 p. - terminas): galioja laiku pateiktas, įvykis įrašomas į žurnalą
            if (senasLaiku && velai) {
              rez.push({ ok: false, tekstas: tk.pav + ": pakeistas pasiūlymas gautas po termino - nepriimtas, galioja laiku pateiktas pasiūlymas (antspaudas " + A.trumpas(senas.h) + ")." });
              return irasas(a, "nepriimta", tk.pav + ", antspaudas " + A.trumpas(h) + ", gauta " + A.rodykLaika(gauta) + ", po termino - galioja laiku pateiktas", { t: p.t, h: h, g: gauta }).then(function () { a.__keista = true; });
            }
            if (senas && !(senasLaiku === false && !velai) && !(new Date(p.pateikta) > new Date(senas.pateikta))) { rez.push({ ok: false, tekstas: tk.pav + ": jau įkeltas vėliau parengtas šio tiekėjo pasiūlymas - senesnis neįkeltas." }); return; }
            var naujas = { t: p.t, kodas: kodas, h: h, gauta: gauta, gautaKaip: gautaIso ? "nurodyta" : "ikelta", pateikta: p.pateikta, tiekejas: p.tiekejas.pav, pakeista: senas ? (senas.pakeista || 0) + 1 : 0, duomenys: null };
            a.pasiulymai = a.pasiulymai.filter(function (y) { return y.t !== p.t; }).concat([naujas]);
            var kitas = A.kitasPavadinimas(tk.pav, p.tiekejas.pav) ? " Dėmesio: pasiūlymą pateikė „" + p.tiekejas.pav + "“, nors kviestas „" + tk.pav + "“." : "";
            rez.push({ ok: true, tekstas: tk.pav + ": pasiūlymas " + (senas ? "pakeistas naujesniu" : "įkeltas") + " (antspaudas " + A.trumpas(h) + ")" + (velai ? " - GAUTAS PO TERMINO, nebus vertinamas." : ".") + kitas });
            return irasas(a, senas ? "pakeista" : "gauta", tk.pav + ", antspaudas " + A.trumpas(h) + ", gauta " + A.rodykLaika(gauta) + (gautaIso ? " (laiką nurodė iniciatorius)" : "") + (velai ? ", po termino" : ""), { t: p.t, h: h, g: gauta })
              .then(function () { a.__keista = true; });
          });
        }, function () { rez.push({ ok: false, tekstas: "Pasiūlymo kodo perskaityti nepavyko - jis nepilnas arba pakeistas. Nukopijuokite visą laiško tekstą iš naujo." }); });
      });
    });
    return grandine.then(function () { if (a.__keista) { delete a.__keista; issaugok(a); } return rez; });
  }
  function ikelk(tekstas) {
    var g = $("ea-gauta"), a = gauk(S.id), gautaIso = "";
    if (a && g && g.value) {
      gautaIso = A.vilniausIUtc(g.value);
      var kl = !gautaIso ? "Tokio laiko nėra - patikrinkite datą ir valandą." : new Date(gautaIso) > new Date() ? "Laiško gavimo laikas negali būti ateityje."
        : a.zurnalas[0] && new Date(gautaIso) < new Date(a.zurnalas[0].laikas) ? "Laiškas negalėjo būti gautas anksčiau, nei apklausa paskelbta." : "";
      if (kl) { S.ikelimas = [{ ok: false, tekstas: kl }]; $("ea-ikelimo-rez").innerHTML = ikelimoHtml(); g.setAttribute("aria-invalid", "true"); g.focus(); return Promise.resolve(); }
    } else if (a && praejo(a)) {
      S.ikelimas = [{ ok: false, tekstas: "Nurodykite, kada laiškas gautas (iš savo el. pašto)." }]; $("ea-ikelimo-rez").innerHTML = ikelimoHtml(); if (g) { g.setAttribute("aria-invalid", "true"); g.focus(); } return Promise.resolve();
    }
    return ikelkTeksta(tekstas, gautaIso).then(function (rez) { S.ikelimas = rez; var buvo = rez; return perpiesk("ea-ps-h").then(function () { S.ikelimas = buvo; }); });
  }
  function atverkPasiulymus(anksciau, id) {
    var a = gauk(id || S.id); if (!a || a.busena !== "paskelbta") return Promise.resolve(false);
    if (anksciau ? !visiPateike(a) : !praejo(a)) return Promise.resolve(false);
    return Promise.all(a.pasiulymai.map(function (p) { return A.iskoduok(p.kodas).then(function (o) { var f = A.pasiulymoForma(o); p.duomenys = f.ok ? f.pasiulymas : null; }, function () { p.duomenys = null; }); })).then(function () {
      var x = a.pasiulymai.filter(function (p) { return !p.duomenys; }).map(function (p) { return p.t; });
      a.pasiulymai = a.pasiulymai.filter(function (p) { return p.duomenys; });
      a.atverta = dabarIso(); a.atvertaAnksciau = !!anksciau && !praejo(a); a.busena = "atverta"; a.sprendimas = { rezultatas: "", laimetojas: "", neatitinka: {}, atitinka: {}, pastaba: "", patvirtinta: "" };
      return irasas(a, "atverta", "pasiūlymų: " + a.pasiulymai.length + (a.atvertaAnksciau ? ", anksčiau termino (pasiūlymus pateikė visi kviesti tiekėjai)" : "") + (x.length ? ", neperskaityta: " + x.length : ""),
        { n: String(a.pasiulymai.length), x: x.join(",") });
    }).then(function () { return issaugok(a); });
  }
  function patvirtink(id) {
    var a = gauk(id || S.id); if (!a || a.busena !== "atverta") return Promise.resolve(false);
    var v = vertink(a), kl = sprendimoKliutys(a, v), pt = $("ea-sp-pastaba");
    if (pt) a.sprendimas.pastaba = pt.value;
    if (kl.length) { issaugok(a); return (id ? Promise.resolve() : perpiesk("ea-sp-kliutys")).then(function () { return false; }); }
    var gauta = v.eilutes.filter(function (e) { return e.busena !== "negautas" && e.busena !== "pavėluotas"; }).length, lm = v.siulomas ? v.eilutes.filter(function (e) { return e.t === v.siulomas; })[0] : null;
    a.sprendimas.rezultatas = !gauta ? "negauta" : lm ? "laimetojas" : "atmesta"; a.sprendimas.laimetojas = lm ? lm.t : ""; a.sprendimas.patvirtinta = dabarIso(); a.busena = "ivertinta";
    return irasas(a, "sprendimas", lm ? "laimėtojas " + lm.tiekejas + ", " + fmt(lm.viso, 2, 2) + " Eur be PVM" : !gauta ? "per terminą pasiūlymų negauta" : "visi pasiūlymai atmesti",
      { r: a.sprendimas.rezultatas, w: a.sprendimas.laimetojas }).then(function () { issaugok(a); return true; });
  }

  /* ---------- failai ---------- */
  function atsisiusk(vardas, tekstas, tipas) {
    var el = doc.createElement("a"), url = URL.createObjectURL(new Blob([tekstas], { type: tipas }));
    el.href = url; el.download = vardas; doc.body.appendChild(el); el.click(); el.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function failoVardas(a, dokumentas, pletinys) {
    return global.GP_EKSPORTAS ? global.GP_EKSPORTAS.failoVardas({ numeris: a ? a.id : "", dokumentas: dokumentas, pavadinimas: a ? a.kvietimas.pavadinimas : "", pletinys: pletinys }) : (a ? a.id + "_" : "") + dokumentas + "." + pletinys;
  }
  function csvLangelis(v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csv() {
    var eil = [["Apklausos Nr.", "Pavadinimas", "Būsena", "Sukurta", "Pasiūlymų terminas", "Numatoma vertė be PVM", "Skirtos lėšos be PVM", "Kviesta tiekėjų", "Gauta pasiūlymų", "Rezultatas", "Laimėtojas", "Laimėjusi kaina be PVM", "Kvietimo antspaudas"]];
    skaitykVisas().forEach(function (a) {
      var sp = a.sprendimas, lm = sp && sp.rezultatas === "laimetojas" ? tiekejas(a, sp.laimetojas) : null, kn = laimejusiKaina(a), n = function (x) { return typeof x === "number" ? String(x).replace(".", ",") : ""; };
      eil.push([a.id, a.kvietimas.pavadinimas, busena(a).t, A.rodykLaika(a.sukurta), A.rodykLaika(a.kvietimas.terminas), n(a.vidaus.verte), n(skirtosLesos(a)), a.tiekejai.length, a.pasiulymai.length,
        sp && sp.patvirtinta ? { laimetojas: "Nustatytas laimėtojas", atmesta: "Visi pasiūlymai atmesti", negauta: "Pasiūlymų negauta", nutraukta: "Nutraukta" }[sp.rezultatas] || "" : "", lm ? lm.pav : "", n(kn), A.trumpas(a.antspaudas)]);
    });
    return "\ufeff" + eil.map(function (e) { return e.map(csvLangelis).join(";"); }).join("\r\n") + "\r\n";
  }
  function skaitykFaila(f) { return new Promise(function (ok, ne) { var r = new FileReader(); r.onload = function () { ok(String(r.result || "")); }; r.onerror = function () { ne(r.error); }; r.readAsText(f); }); }
  function ikelkByla(tekstas, vardas) {
    var r = A.isBylos(tekstas);
    if (!r.ok) { pranesk({ "per-didelis": "Failas per didelis.", json: "Failo perskaityti nepavyko - tai ne apklausos byla.", formatas: "Tai ne apklausos bylos failas.", versija: "Byla sukurta naujesne įrankio versija - perkraukite puslapį.", forma: "Byloje nėra tinkamų apklausos duomenų." }[r.klaida] || "Bylos įkelti nepavyko.", "klaida"); return Promise.resolve(false); }
    var a = r.apklausa, yra = gauk(a.id);
    if (yra && !global.confirm("Apklausa " + a.id + " šioje naršyklėje jau yra. Pakeisti ją failo duomenimis?")) return Promise.resolve(false);
    a.importuota = String(vardas || "").slice(0, 200);
    return A.patikra(a).then(function (pt) {
      if (!issaugok(a)) return false;
      S.patikra = { id: a.id, rez: pt };
      pranesk(pt.ok ? "Apklausos byla įkelta, vientisumo patikra neatitikimų nerado." : "Apklausos byla įkelta, tačiau vientisumo patikra rado neatitikimų - žr. žurnalą.", pt.ok ? "gerai" : "ispejimas");
      return rodyk("apklausa", a.id).then(function () { return true; });
    });
  }

  /* ---------- veiksmai ---------- */
  /* Pozicijos iš „Excel“: stulpeliai pavadinimas, kiekis, mato vienetas, pastaba (bet kuria tvarka po pavadinimo). Eilės numeris pirmame
     stulpelyje praleidžiamas tik kai po jo eina tekstas; antraštės eilutė („Pavadinimas | Kiekis | Mato vnt.“) praleidžiama. */
  var ANTRASTE_RE = /^(eil\.?\s*nr\.?|nr\.?|pavadinimas|pozicija|prek[eė]s?|paslaug[aos]*|kiekis|mato\s*vnt\.?|mato\s*vienetas|mat\.?\s*vnt\.?|vnt\.?|pastab[aos]*|name|item|description|quantity|qty|unit|notes?|remarks?)$/i;
  function pozIsTeksto(tekstas) {
    var out = [];
    String(tekstas).split(/\r?\n/).forEach(function (eil) {
      var c = eil.split("\t").map(function (x) { return x.trim(); });
      if (c.length >= 2 && /^\d{1,3}\.?$/.test(c[0]) && c[1] && !/^[\d\s., ]+$/.test(c[1])) c.shift();
      if (!c.filter(Boolean).length) return;
      var tekstai = c.filter(Boolean);
      if (tekstai.length >= 2 && tekstai.every(function (x) { return ANTRASTE_RE.test(x.replace(/[:*]+$/, "")); })) return;   // antraštės eilutė
      if (!c[0]) c = c.filter(Boolean);
      var kiekis = null, kiekisT = "", mat = "", past = [];
      c.slice(1).forEach(function (x) {
        if (!x) return;
        var sk = /^[\d\s., ]+$/.test(x);
        if (kiekis === null && !kiekisT && sk) { var n = kiekisIsTeksto(x); if (typeof n === "number" && isFinite(n) && n > 0) kiekis = n; else kiekisT = x; }
        else if (!mat && !sk && x.length <= 12) mat = x;
        else past.push(x);
      });
      var pz = { pav: c[0].slice(0, 300), mat: mat, kiekis: kiekis, pastaba: past.join("; ").slice(0, 300) };
      if (kiekisT) { pz.kiekis = NaN; pz._kiekis = kiekisT; }
      out.push(pz);
    });
    return out;
  }
  global.GP_IVYKIAI.veiksmai({
    eaAtverk: function () { rodyk("registras"); },
    eaUzdaryk: function () { rodyk("").then(function () { var h = doc.querySelector("#form-selector h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); } }); },
    eaISarasa: function () {
      if (S.vaizdas === "kurimas" && global.GP_DARBAS && global.GP_DARBAS.pakeista && global.GP_DARBAS.pakeista() && !global.confirm("Neišsaugoti apklausos pakeitimai bus prarasti. Grįžti į sąrašą?")) return;
      S.darbinis = null; S.klaidos = []; darbasIssaugotas(); rodyk("registras");
    },
    eaNauja: function () { S.darbinis = nauja(); S.klaidos = []; if (global.GP_DARBAS) { global.GP_DARBAS.stebek(); global.GP_DARBAS.atskaita(); } rodyk("kurimas"); },
    eaRodyk: function (el) {
      var a = gauk(el.getAttribute("data-id")); if (!a) return;
      if (a.busena === "juodrastis") { S.darbinis = a; S.klaidos = []; if (global.GP_DARBAS) { global.GP_DARBAS.stebek(); global.GP_DARBAS.atskaita(); } rodyk("kurimas"); } else { S.patikra = null; rodyk("apklausa", a.id); }
    },
    eaEik: function (el) { var t = $(el.getAttribute("data-id")); if (t) { t.scrollIntoView({ block: "center" }); var f = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ? t : t.querySelector("input, textarea, select") || t; f.focus(); } return false; },
    eaVerte: function () { vertesPastaba(); },
    eaTerminas: function () { terminoPastaba(); },
    eaPozPridek: function () { skaitykKurima(); S.darbinis.kvietimas.pozicijos.push({ pav: "", mat: "", kiekis: null, pastaba: "" }); perpieskKurima('#ea-poz tbody tr:last-child [data-p="pav"]'); },
    eaPozSalink: function (el) { skaitykKurima(); S.darbinis.kvietimas.pozicijos.splice(+el.getAttribute("data-i"), 1); perpieskKurima('[data-veiksmas="eaPozPridek"]'); },
    eaPozIklijuok: function (el, ev) {
      var t = ev.clipboardData ? ev.clipboardData.getData("text") : "";
      if (!/\t|\n/.test(t.trim())) return;
      var nauji = pozIsTeksto(t); if (!nauji.length) return;
      ev.preventDefault(); skaitykKurima();
      var k = S.darbinis.kvietimas, buvo = k.pozicijos.filter(function (p) { return p.pav.trim() || p._kiekis; }), visos = buvo.concat(nauji), netilpo = Math.max(0, visos.length - A.RIBOS.pozicijos);
      k.pozicijos = visos.slice(0, A.RIBOS.pozicijos);
      perpieskKurima('[data-veiksmas="eaPozPridek"]');
      pranesk("Įklijuota pozicijų: " + (nauji.length - netilpo) + (netilpo ? ". Netilpo: " + netilpo + " (daugiausia " + A.RIBOS.pozicijos + " pozicijų)" : "") + ". Patikrinkite pavadinimus, kiekius ir mato vienetus.", netilpo ? "ispejimas" : undefined);
    },
    eaTkPridek: function () { skaitykKurima(); if (S.darbinis.tiekejai.length < A.RIBOS.tiekejai) S.darbinis.tiekejai.push({ t: A.zetonas(), pav: "", pastas: "", kalba: "lt" }); perpieskKurima('#ea-tk tbody tr:last-child [data-t="pav"]'); },
    eaTkSalink: function (el) { skaitykKurima(); S.darbinis.tiekejai.splice(+el.getAttribute("data-i"), 1); perpieskKurima('[data-veiksmas="eaTkPridek"]'); },
    eaTiekejoPav: function (el) {
      var tr = el.closest("tr"), p = tr.querySelector('[data-t="pastas"]'), z = ankstesniTiekejai().filter(function (t) { return t.pav.toLowerCase() === el.value.trim().toLowerCase(); })[0];
      if (z && !p.value.trim()) { p.value = z.pastas; tr.querySelector('[data-t="kalba"]').value = z.kalba; }
      mazaiTiekejuLaukas();
    },
    eaJuodrastis: function () { skaitykKurima(); var c = svarus(S.darbinis); if (c && issaugok(c)) pranesk("Apklausos juodraštis išsaugotas šioje naršyklėje."); },
    eaSkelbk: function () {
      S.klaidos = tikrinkKurima();
      if (S.klaidos.length) { perpieskKurima("#ea-klaidos"); return; }
      var a = svarus(S.darbinis); if (!a) return;
      var f = A.kvietimoForma(a.kvietimas);
      if (!f.ok) { S.klaidos = [{ id: "ea-pav", tekstas: "Kvietimo parengti nepavyko - patikrinkite įvestus duomenis" }]; perpieskKurima("#ea-klaidos"); return; }
      if (nacsaugReikia(a.vidaus.verte)) a.kvietimas.nacsaugumas = true; else delete a.kvietimas.nacsaugumas;
      f = A.kvietimoForma(a.kvietimas);
      var trumpas = darboDienuIki(a.kvietimas.terminas) < 3 ? "\n\nDĖMESIO: iki termino lieka mažiau kaip 3 darbo dienos. Patikrinkite, ar tiekėjams pakaks laiko parengti pasiūlymą (Aprašo 31.2 p.)." : "";
      if (!global.confirm("Paskelbti apklausą „" + a.kvietimas.pavadinimas + "“?\n\nKviečiama tiekėjų: " + a.tiekejai.length + "\nPasiūlymų terminas: " + A.rodykLaika(a.kvietimas.terminas) + " (Lietuvos laiku)" +
        (a.kvietimas.nacsaugumas ? "\nTiekėjai patvirtins atitiktį nacionalinio saugumo reikalavimams (vertė viršija 5 000 Eur)." : "") + trumpas + "\n\nPaskelbus kvietimo keisti nebegalima.")) return;
      a.kvietimas = f.kvietimas; a.busena = "paskelbta";
      A.antspaudas(A.bendra(a.kvietimas)).then(function (h) {
        a.antspaudas = h;
        var vd = a.vidaus;
        return irasas(a, "paskelbta", "kviesta tiekėjų: " + a.tiekejai.length + ", terminas " + A.rodykLaika(a.kvietimas.terminas) + ", kvietimo antspaudas " + A.trumpas(h),
          { k: h, v: vd.verte === null ? "" : String(vd.verte), l: vd.lesos === null ? "" : String(vd.lesos) });
      }).then(function () {
        if (!issaugok(a)) return;
        S.darbinis = null; S.klaidos = []; pranesk("Apklausa paskelbta. Išsiųskite kvietimus tiekėjams."); rodyk("apklausa", a.id);
      });
    },
    eaLaiskas: function (el) { var n = S.nuorodos[el.getAttribute("data-t")]; if (!n) return false; },
    eaKopijuok: function (el) {
      var n = S.nuorodos[el.getAttribute("data-t")], ka = el.getAttribute("data-ka"); if (!n) return;
      global.GP_KOPIJA.kopijuok(ka === "nuoroda" ? n.nuoroda : n.laiskas.tema + "\n\n" + n.laiskas.tekstas, { sekme: ka === "nuoroda" ? "Nuoroda nukopijuota" : "Laiško tema ir tekstas nukopijuoti" });
    },
    eaSeka: function (el) {
      var a = gauk(S.id); if (!a) return false;
      var t = el.getAttribute("data-t"), buvo = el.getAttribute("data-buvo"), n = t ? S.nuorodos[t] : null, darbas = Promise.resolve();
      if (t && !n) return false;
      if (buvo) {
        var tb = tiekejas(a, buvo);
        if (tb && !tb.issiusta) { tb.issiusta = dabarIso(); darbas = irasas(a, "issiusta", tb.pav + " (" + tb.pastas + ")").then(function () { issaugok(a); }); }
      }
      S.seka = t ? { id: a.id, t: t } : null;
      if (n && n.visas === false && global.GP_KOPIJA) global.GP_KOPIJA.kopijuok(n.laiskas.tekstas, { tylus: true });
      // perpiešiama po nuorodos numatytojo veiksmo (setTimeout), kad paspausta nuoroda spėtų atverti laišką
      setTimeout(function () { darbas.then(function () { return perpiesk(t ? "ea-seka-kitas" : "ea-ps-h"); }).then(function () { if (!t) pranesk("Visi kvietimai išsiųsti. Laukiama pasiūlymų."); }); }, 0);
      // nuorodos numatytasis veiksmas (mailto) atveria laišką pašto programoje
    },
    eaIssiusta: function (el) {
      var a = gauk(S.id), t = a && tiekejas(a, el.getAttribute("data-t")); if (!t) return;
      var buvo = !!t.issiusta; t.issiusta = buvo ? "" : dabarIso();
      irasas(a, buvo ? "atzymeta" : "issiusta", t.pav + " (" + t.pastas + ")").then(function () { issaugok(a); return piesk(); }).then(function () {
        var kv = $("ea-kv-h"), b; if (kv) kv.parentElement.open = true;
        b = doc.querySelector('.ea-tk[data-tiekejas="' + t.t + '"] [data-veiksmas="eaIssiusta"]'); if (b) b.focus();
      });
    },
    eaIkelk: function () { var t = $("ea-laisko-tekstas"); ikelk(t ? t.value : ""); },
    eaFailas: function () { $("ea-pasiulymo-failas").click(); },
    eaFailasPasirinktas: function (el) { var f = [].slice.call(el.files || []); if (f.length) Promise.all(f.map(skaitykFaila)).then(function (t) { ikelk(t.join("\n")); }); },
    eaVirs: function (el, ev) { ev.preventDefault(); el.setAttribute("data-virs", "1"); },
    eaNeVirs: function (el) { el.removeAttribute("data-virs"); },
    eaNumesk: function (el, ev) {
      ev.preventDefault(); el.removeAttribute("data-virs");
      var f = [].slice.call((ev.dataTransfer && ev.dataTransfer.files) || []), t = ev.dataTransfer ? ev.dataTransfer.getData("text") : "";
      if (f.length) Promise.all(f.map(skaitykFaila)).then(function (x) { ikelk(x.join("\n")); }); else if (t) ikelk(t);
    },
    eaAtverkPasiulymus: function (el) {
      var anks = el.getAttribute("data-anksciau") === "1";
      if (!global.confirm(anks ? "Atverti pasiūlymus anksčiau termino?\n\nPasiūlymus pateikė visi kviesti tiekėjai. Atvėrus tiekėjai nebegalės pateikti pakeistų pasiūlymų, nors terminas dar nepasibaigęs. Atvėrimas bus įrašytas į žurnalą." : "Atverti pasiūlymus?\n\nAtvėrus naujų pasiūlymų įkelti nebegalima.")) return;
      atverkPasiulymus(anks).then(function (ok) { if (ok) perpiesk("ea-vt-h"); });
    },
    eaNegauta: function () {
      var a = gauk(S.id); if (!a || a.busena !== "paskelbta" || !praejo(a) || a.pasiulymai.length) return;
      if (!global.confirm("Užfiksuoti, kad pasiūlymų negauta? Po to pasiūlymų įkelti nebegalima.")) return;
      a.atverta = dabarIso(); a.busena = "ivertinta"; a.sprendimas = { rezultatas: "negauta", laimetojas: "", neatitinka: {}, atitinka: {}, pastaba: "", patvirtinta: dabarIso() };
      irasas(a, "negauta", "").then(function () { issaugok(a); perpiesk("ea-hero-h"); });
    },
    eaAtitiktis: function (el) {
      var a = gauk(S.id), t = el.getAttribute("data-t"); if (!a || a.busena !== "atverta") return;
      var sp = a.sprendimas, pt = $("ea-sp-pastaba"); if (pt) sp.pastaba = pt.value;
      delete sp.atitinka[t]; delete sp.neatitinka[t];
      if (el.value === "taip") sp.atitinka[t] = true; else sp.neatitinka[t] = "";
      irasas(a, "atitiktis", (tiekejas(a, t) || {}).pav + ": " + (el.value === "taip" ? "atitinka" : "neatitinka"), { t: t, a: el.value === "taip" ? "taip" : "ne" }).then(function () {
        issaugok(a);
        perpiesk().then(function () { var f = el.value === "ne" ? $("ea-pr-" + t) : doc.querySelector('input[name="ea-at-' + t + '"][value="taip"]'); if (f) f.focus(); });
      });
    },
    eaPriezastis: function (el) {
      var a = gauk(S.id), t = el.getAttribute("data-t"); if (!a || a.busena !== "atverta" || !Object.prototype.hasOwnProperty.call(a.sprendimas.neatitinka, t)) return;
      var pt = $("ea-sp-pastaba"); if (pt) a.sprendimas.pastaba = pt.value;
      a.sprendimas.neatitinka[t] = el.value; issaugok(a);
      var v = vertink(a), kl = sprendimoKliutys(a, v), vieta = $("ea-sprendimas");
      if (vieta) { var d = doc.createElement("div"); d.innerHTML = sprendimoHtml(a, v); vieta.replaceWith(d.firstChild); }
      void kl;
    },
    eaPatvirtink: function () {
      patvirtink().then(function (ok) { if (ok) { pranesk("Sprendimas patvirtintas."); perpiesk("ea-hero-h"); } });
    },
    eaKeiskSprendima: function () {
      var a = gauk(S.id); if (!a || a.busena !== "ivertinta" || !a.pasiulymai.length) return;
      if (!global.confirm("Atšaukti patvirtintą sprendimą ir grįžti prie vertinimo? Atšaukimas bus įrašytas į žurnalą.")) return;
      a.busena = "atverta"; a.sprendimas.patvirtinta = ""; a.sprendimas.rezultatas = ""; a.sprendimas.laimetojas = "";
      irasas(a, "atsaukta", "").then(function () { issaugok(a); perpiesk("ea-vt-h"); });
    },
    eaNutrauk: function () {
      var a = gauk(S.id); if (!a || ["paskelbta", "atverta"].indexOf(a.busena) < 0) return;
      var kodel = global.prompt("Kodėl apklausa nutraukiama? (priežastis bus įrašyta į žurnalą)");
      if (kodel === null) return;
      if (!String(kodel).trim()) { pranesk("Apklausa nenutraukta: nenurodyta priežastis.", "ispejimas"); return; }
      a.busena = "nutraukta"; a.sprendimas = { rezultatas: "nutraukta", laimetojas: "", neatitinka: (a.sprendimas || {}).neatitinka || {}, atitinka: (a.sprendimas || {}).atitinka || {}, pastaba: String(kodel).slice(0, 1000), patvirtinta: dabarIso() };
      irasas(a, "nutraukta", String(kodel).slice(0, 300)).then(function () { issaugok(a); perpiesk("ea-hero-h"); });
    },
    eaPazyma: function () {
      var a = gauk(S.id); if (!a || !a.sprendimas || !a.sprendimas.patvirtinta || ["ivertinta", "uzbaigta"].indexOf(a.busena) < 0) return;
      a.pazyma = dabarIso(); a.busena = "uzbaigta";
      irasas(a, "pazyma", "").then(function () { issaugok(a); uzpildykPazyma(a); });
    },
    eaSpausdink: function () { doc.querySelectorAll("#ea-vieta details").forEach(function (d) { d.open = true; }); doc.body.classList.add("ea-spausdinama"); global.print(); },
    eaPatikra: function () { var a = gauk(S.id); if (!a) return; A.patikra(a).then(function (r) { S.patikra = { id: a.id, rez: r }; return piesk(); }).then(function () { var d = $("ea-zr-h"); if (d) { d.parentElement.open = true; d.focus(); } }); },
    eaByla: function () { var a = gauk(S.id); if (!a) return; atsisiusk(failoVardas(a, "Apklausos-byla", "json"), JSON.stringify(A.byla(a), null, 2), "application/json"); },
    eaKopija: function () { var a = gauk(S.id); if (!a) return; S.darbinis = nauja(a); S.klaidos = []; if (global.GP_DARBAS) { global.GP_DARBAS.stebek(); global.GP_DARBAS.atskaita(); } rodyk("kurimas"); },
    eaTrink: function (el) {
      var id = el.getAttribute("data-id"), a = gauk(id); if (!a) { S.darbinis = null; rodyk("registras"); return; }
      if (!global.confirm(a.busena === "juodrastis" ? "Ištrinti šį apklausos juodraštį?" : "Ištrinti apklausą " + a.id + "?\n\nKartu bus ištrinti įkelti pasiūlymai ir žurnalas. Šio veiksmo atšaukti negalima - jei duomenų dar gali prireikti, pirma atsisiųskite apklausos bylą.")) return;
      if (salink(id)) { S.darbinis = null; darbasIssaugotas(); pranesk("Apklausa ištrinta."); rodyk("registras"); }
    },
    eaCsv: function () { atsisiusk(failoVardas(null, "Elektroninių-apklausų-sąrašas", "csv"), csv(), "text/csv;charset=utf-8"); },
    eaBylaIkelk: function () { $("ea-bylos-failas").click(); },
    eaBylaFailas: function (el) { var f = el.files && el.files[0]; if (f) skaitykFaila(f).then(function (t) { return ikelkByla(t, f.name); }); el.value = ""; }
  });
  function perpieskKurima(fokusas) {
    $("ea-vieta").innerHTML = kurimoHtml(); kurimoPapildymai();
    var e = fokusas ? doc.querySelector(fokusas) : null; if (e) e.focus();
  }
  global.addEventListener("afterprint", function () { doc.body.classList.remove("ea-spausdinama"); });

  global.GP_APKLAUSA_UI = {
    RAKTAS: RAKTAS, atnaujinkKortele: atnaujinkKortele, rodyk: rodyk, slepk: slepk, busena: busena, vertink: vertink, pazymosDuomenys: pazymosDuomenys, uzpildykPazyma: uzpildykPazyma,
    skaitykVisas: skaitykVisas, gauk: gauk, issaugok: issaugok, nauja: nauja, ikelkTeksta: ikelkTeksta, atverkPasiulymus: atverkPasiulymus, patvirtink: patvirtink, ikelkByla: ikelkByla, csv: csv,
    pozIsTeksto: pozIsTeksto, tikrinkKurima: tikrinkKurima, paruoskNuorodas: paruoskNuorodas, busenaS: function () { return S; }, naudokSaugykla: function (s) { S.saugykla = s; }
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", atnaujinkKortele); else atnaujinkKortele();
})(typeof window !== "undefined" ? window : this);
