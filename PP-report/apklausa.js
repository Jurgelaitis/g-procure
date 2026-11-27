/* ============================================================================
 * G-Procure  PP-report/apklausa.js   (window.GP_APKLAUSA)
 * ----------------------------------------------------------------------------
 * Elektroninė apklausa (2026-11-26): mažos vertės pirkimo iki 15 000 Eur be PVM neskelbiama apklausa raštu, kai kvietimas ir
 * pasiūlymas keliauja el. paštu (LITGRID Mažos vertės pirkimų tvarkos aprašo 27.2.1 p. - „CVP IS priemonėmis, elektroniniu paštu“),
 * o įrankis juos tik paruošia ir perskaito. Serverio nėra: kvietimas - nuorodos dalyje po „#“ (į serverį nesiunčiama), pasiūlymas -
 * kodas tiekėjo laiške. Šis failas - grynos funkcijos, bendros iniciatoriaus (PP-report.html) ir tiekėjo (pasiulymas.html) puslapiams:
 *
 *   id(), zetonas()                         - atsitiktiniai identifikatoriai
 *   koduok(obj) / iskoduok(kodas)           - JSON <-> kodas („g1.“ - suspaustas, „g0.“ - nesuspaustas; base64url)
 *   sarvas(kodas, rusis) / isSarvo(tekstas) - kodas laiško tekste tarp žymių ir jo ištraukimas iš įklijuoto laiško, nuorodos ar failo
 *   kvietimoForma(x) / pasiulymoForma(x)    - NEPATIKIMŲ duomenų (nuoroda, laiškas, failas) patikra: tik žinomi laukai, tipai ir ribos
 *   bendra(k), antspaudas(obj), trumpas(h)  - kvietimo dalis, bendra visiems tiekėjams, ir SHA-256 antspaudas
 *   sumos(k, p, tarifas)                    - pasiūlymo eilučių sumos ir bendra kaina
 *   vertink({...})                          - pasiūlymų palyginimas, eilė ir požymiai (taisyklės, ne DI; sprendimą priima žmogus)
 *   zurnaloIrasas(), tikrinkZurnala()       - įvykių žurnalas su grandine (kiekvienas įrašas apima ankstesnio antspaudą)
 *   vilniausIUtc(), rodykLaika(), liko()    - laikas (terminas saugomas UTC, rodomas Lietuvos laiku)
 *   laiskas(), atsakymas()                  - kvietimo ir pasiūlymo laiškų tekstai (LT / EN)
 *   apklausosForma(x), byla(a), isBylos(t)  - apklausos įrašas saugykloje ir apklausos bylos faile (nepatikimi duomenys: tik žinomi laukai)
 *   patikra(a)                              - vientisumo patikra: kvietimo ir pasiūlymų antspaudai, žurnalo grandinė
 *
 * Nieko nesaugo ir nesiunčia. Testai - PP-report/testai.html.
 * ========================================================================== */
;(function (global) {
  "use strict";

  var TRUMPOS_ID_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/, TRYNIMO_RE = /^[A-Za-z0-9_-]{22}$/;   // kaip serveris/nuorodos-logika.js
  var RIBOS = { pozicijos: 40, tiekejai: 12, tekstas: 3000, trumpas: 300, pavadinimas: 200, kodas: 80000, json: 200000, suma: 1e9 };
  var ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // be O, I, 0, 1 - kad kodą būtų galima perskaityti ir padiktuoti
  var ID_RE = /^GP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/, ZETONO_RE = /^[A-HJ-NP-Z2-9]{16}$/, HEX64 = /^[0-9a-f]{64}$/;
  var PATVIRTINIMAI = ["atitinka", "kaina", "igaliotas"];
  /* Nacionalinio saugumo patvirtinimas (2026-11-27, naudotojo sprendimas): kai numatoma vertė viršija 5 000 Eur be PVM, tiekėjas pasiūlymo
     formoje patvirtina atitiktį Aprašo 27.2.3 ir 31.4 p. nurodytiems reikalavimams - atskiros deklaracijos pildyti nereikia. */
  var NACSAUG = "nacsaugumas";
  function reikiaPatvirtinti(k) { return k && k.nacsaugumas ? PATVIRTINIMAI.concat([NACSAUG]) : PATVIRTINIMAI.slice(); }
  var NMK_DALIS = 0.30;   // neįprastai maža kaina: 30 ir daugiau proc. mažesnė už vidurkį (shared/teises-nuorodos.js „nmk_riba“ - tekstas iš e-tar)
  var ZYME = { pasiulymas: "G-PROCURE OFFER", kvietimas: "G-PROCURE INVITATION" };

  /* ---------- atsitiktiniai identifikatoriai ---------- */
  function atsitiktinis(n) {
    var b = new Uint8Array(n), s = "";
    global.crypto.getRandomValues(b);
    for (var i = 0; i < n; i++) s += ABC[b[i] % ABC.length];
    return s;
  }
  function id() { return "GP-" + atsitiktinis(4) + "-" + atsitiktinis(4); }
  function zetonas() { return atsitiktinis(16); }

  /* ---------- baitai, base64url, suspaudimas ---------- */
  function b64(baitai) {
    var s = "";
    for (var i = 0; i < baitai.length; i += 0x8000) s += String.fromCharCode.apply(null, baitai.subarray(i, i + 0x8000));
    return global.btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function isB64(t) {
    if (!/^[A-Za-z0-9_-]*$/.test(t)) throw klaida("kodas");
    var s;
    try { s = global.atob(t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4)); } catch (e) { throw klaida("kodas"); }
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function klaida(kodas) { var e = new Error(kodas); e.kodas = kodas; return e; }
  function srautu(baitai, srautas, riba) {
    var r = new global.Blob([baitai]).stream().pipeThrough(srautas).getReader(), dalys = [], viso = 0;
    function kita() {
      return r.read().then(function (x) {
        if (x.done) { var out = new Uint8Array(viso), p = 0; dalys.forEach(function (d) { out.set(d, p); p += d.length; }); return out; }
        viso += x.value.length;
        if (riba && viso > riba) { try { r.cancel(); } catch (e) {} throw klaida("per-didelis"); }
        dalys.push(x.value); return kita();
      });
    }
    return kita();
  }
  function saugusJson(t) {
    return JSON.parse(t, function (k, v) { return k === "__proto__" || k === "constructor" || k === "prototype" ? undefined : v; });
  }
  function koduok(obj) {
    var baitai = new global.TextEncoder().encode(JSON.stringify(obj));
    if (typeof global.CompressionStream !== "function") return Promise.resolve("g0." + b64(baitai));
    return srautu(baitai, new global.CompressionStream("deflate-raw")).then(function (z) { return "g1." + b64(z); },
      function () { return "g0." + b64(baitai); });
  }
  function iskoduok(kodas) {
    return Promise.resolve().then(function () {
      kodas = String(kodas || "").trim();
      if (kodas.length > RIBOS.kodas) throw klaida("per-didelis");
      var m = /^g([01])\.([A-Za-z0-9_-]+)$/.exec(kodas);
      if (!m) throw klaida("kodas");
      var baitai = isB64(m[2]);
      if (m[1] === "0") { if (baitai.length > RIBOS.json) throw klaida("per-didelis"); return baitai; }
      if (typeof global.DecompressionStream !== "function") throw klaida("narsykle");
      return srautu(baitai, new global.DecompressionStream("deflate-raw"), RIBOS.json).catch(function (e) { throw e && e.kodas ? e : klaida("kodas"); });
    }).then(function (baitai) {
      try { return saugusJson(new global.TextDecoder("utf-8", { fatal: true }).decode(baitai)); } catch (e) { throw klaida("kodas"); }
    });
  }

  /* ---------- kodas laiško tekste ---------- */
  function sarvas(kodas, rusis) {
    var z = ZYME[rusis || "pasiulymas"], eil = [];
    for (var i = 0; i < kodas.length; i += 64) eil.push(kodas.slice(i, i + 64));
    return "-----BEGIN " + z + "-----\n" + eil.join("\n") + "\n-----END " + z + "-----";
  }
  /* Įklijuotas laiškas, nuoroda („...#p=kodas“, „...#k=kodas“), grynas kodas arba pasiūlymo failo tekstas -> { rusis, kodas, kiti } sąrašas.
     Laiškų realybė: pašto programos ilgas eilutes laužo ir cituoja („> “), „--“ kartais pakeičia brūkšniu, nuorodų tikrinimo paslaugos
     „#k=“ užkoduoja („%23k%3D“). Todėl žymės atpažįstamos ir su brūkšnių variantais, o nuorodos kodui grąžinami keli KANDIDATAI
     (kodas - iki pirmo tarpo; kiti - prijungus tolesnes eilutes ar žodžius): tinkamą parenka atkoduok() - netinkamas neišsiskleidžia. */
  var BR = "[-\\u2010-\\u2015]";
  function kandidatai(likutis) {
    var out = [], kodas = "", zodziai = likutis.split(/[\s ]+/);
    for (var i = 0; i < zodziai.length && out.length < 80; i++) {
      var z = zodziai[i].replace(/^>+/, "");
      if (!z) continue;                                           // citavimo ženklas „>“ eilutės pradžioje
      if (!(kodas ? /^[A-Za-z0-9_-]+$/ : /^g[01]\.[A-Za-z0-9_-]+$/).test(z)) {
        if (!kodas) { var pr = /^g[01]\.[A-Za-z0-9_-]+/.exec(z); if (pr) out.push(pr[0]); }   // „...kodas).“ - skyryba po nuorodos
        break;
      }
      kodas += z; out.push(kodas);
    }
    return out;
  }
  function isSarvo(tekstas) {
    tekstas = String(tekstas || "");
    var rasta = [], m, re = new RegExp(BR + "+\\s*BEGIN (G" + BR + "PROCURE (?:OFFER|INVITATION))\\s*" + BR + "+([\\s\\S]*?)" + BR + "+\\s*END G" + BR + "PROCURE (?:OFFER|INVITATION)\\s*" + BR + "+", "gi");
    while ((m = re.exec(tekstas))) rasta.push({ rusis: /INVITATION/i.test(m[1]) ? "kvietimas" : "pasiulymas", kodas: m[2].replace(/[^A-Za-z0-9_.-]/g, "") });
    if (rasta.length) return rasta;
    var t = tekstas.replace(/%23/gi, "#").replace(/%3D/gi, "="), re2 = /#([kp])=(?=g[01]\.)/g;
    while ((m = re2.exec(t))) {
      var k = kandidatai(t.slice(m.index + m[0].length, m.index + m[0].length + RIBOS.kodas + 2000));
      if (k.length) { var r = { rusis: m[1] === "k" ? "kvietimas" : "pasiulymas", kodas: k[0] }; if (k.length > 1) r.kiti = k.slice(1); rasta.push(r); }
    }
    if (rasta.length) return rasta;
    var g = /^\s*(g[01]\.[A-Za-z0-9_\s-]+?)\s*$/.exec(tekstas);
    if (g) rasta.push({ rusis: null, kodas: g[1].replace(/\s+/g, "") });
    return rasta;
  }
  /* isSarvo() radinio atkodavimas: bandomas kodas ir, jei jis neišsiskleidžia, kiti kandidatai (perlaužta nuoroda). Grąžina { kodas, obj }. */
  function atkoduok(x) {
    var visi = [x.kodas].concat(x.kiti || []), pirma = null;
    function bandyk(i) {
      return iskoduok(visi[i]).then(function (obj) { return { kodas: visi[i], obj: obj }; }, function (e) {
        if (!pirma) pirma = e;
        if (i + 1 < visi.length) return bandyk(i + 1);
        throw pirma;
      });
    }
    return bandyk(0);
  }

  /* ---------- nepatikimų duomenų patikra ---------- */
  function tekstas(v, max) {
    return typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
  }
  function eilute(v, max) { return tekstas(v, max).replace(/\s*\n\s*/g, " "); }
  function skaicius(v, min, max) { return typeof v === "number" && isFinite(v) && v >= min && v <= max ? v : null; }
  function pastas(v) { v = eilute(v, 120); return /^[^\s@<>"'(),;:\\]+@[^\s@<>"'(),;:\\]+\.[^\s@<>"'(),;:\\.]{2,}$/.test(v) ? v : ""; }
  function laikas(v) {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/.test(v)) return "";
    var d = new Date(v);
    return isNaN(d) ? "" : d.toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  function objektas(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : {}; }

  /* Kvietimas (iš nuorodos ar iniciatoriaus formos). Grąžina { ok, kvietimas } arba { ok: false, klaida }. */
  function kvietimoForma(x) {
    x = objektas(x);
    if (x.v !== 1) return { ok: false, klaida: x.v > 1 ? "versija" : "forma" };
    var pk = objektas(x.pirkejas), kt = objektas(x.kontaktas), tk = objektas(x.tiekejas);
    var k = {
      v: 1, id: ID_RE.test(x.id) ? x.id : "",
      pirkejas: { pav: eilute(pk.pav, RIBOS.pavadinimas), kodas: eilute(pk.kodas, 20) },
      pavadinimas: eilute(x.pavadinimas, RIBOS.pavadinimas), aprasymas: tekstas(x.aprasymas, RIBOS.tekstas),
      pozicijos: (Array.isArray(x.pozicijos) ? x.pozicijos : []).slice(0, RIBOS.pozicijos).map(function (p) {
        p = objektas(p);
        return { pav: eilute(p.pav, RIBOS.trumpas), mat: eilute(p.mat, 20), kiekis: skaicius(p.kiekis, 0, 1e9), pastaba: eilute(p.pastaba, RIBOS.trumpas) };
      }),
      terminas: laikas(x.terminas),
      pristatymoVieta: eilute(x.pristatymoVieta, RIBOS.trumpas), pristatymoTerminas: eilute(x.pristatymoTerminas, RIBOS.trumpas),
      apmokejimas: eilute(x.apmokejimas, RIBOS.trumpas),
      kontaktas: { vardas: eilute(kt.vardas, 120), pastas: pastas(kt.pastas), tel: eilute(kt.tel, 40) }
    };
    var dok = tekstas(x.dokumentai, 1000);
    if (dok) k.dokumentai = dok;          // dokumentai, kuriuos tiekėjas prideda prie laiško (neprivaloma)
    if (x.nacsaugumas === true) k.nacsaugumas = true;   // tik kai taikoma - anksčiau paskelbtų kvietimų antspaudas nesikeičia
    if (x.tiekejas !== undefined || x.t !== undefined) {
      k.tiekejas = { pav: eilute(tk.pav, RIBOS.pavadinimas), pastas: pastas(tk.pastas) };
      k.t = ZETONO_RE.test(x.t) ? x.t : "";
      k.kalba = x.kalba === "en" ? "en" : "lt";
      if (!k.t) return { ok: false, klaida: "forma" };
    }
    if (!k.id || !k.pirkejas.pav || !k.pavadinimas || !k.terminas || !k.kontaktas.pastas || !k.pozicijos.length) return { ok: false, klaida: "forma" };
    if (k.pozicijos.some(function (p) { return !p.pav || !(p.kiekis > 0); })) return { ok: false, klaida: "forma" };
    return { ok: true, kvietimas: k };
  }
  /* Kvietimo dalis, bendra visiems tiekėjams (be gavėjo, žetono ir kalbos) - pagal ją skaičiuojamas kvietimo antspaudas. */
  function bendra(k) {
    var b = {}; Object.keys(k).forEach(function (r) { if (r !== "tiekejas" && r !== "t" && r !== "kalba") b[r] = k[r]; });
    return b;
  }
  function pasiulymoForma(x) {
    x = objektas(x);
    if (x.v !== 1 || x.tipas !== "pasiulymas") return { ok: false, klaida: x.v > 1 ? "versija" : "forma" };
    var tk = objektas(x.tiekejas), matyta = {};
    var p = {
      v: 1, tipas: "pasiulymas", apklausa: ID_RE.test(x.apklausa) ? x.apklausa : "", kvietimas: HEX64.test(x.kvietimas) ? x.kvietimas : "",
      t: ZETONO_RE.test(x.t) ? x.t : "",
      tiekejas: { pav: eilute(tk.pav, RIBOS.pavadinimas), kodas: eilute(tk.kodas, 20), pvmKodas: eilute(tk.pvmKodas, 20), adresas: eilute(tk.adresas, RIBOS.trumpas),
        asmuo: eilute(tk.asmuo, 120), pastas: pastas(tk.pastas), tel: eilute(tk.tel, 40) },
      pvm: x.pvm === true,
      eilutes: (Array.isArray(x.eilutes) ? x.eilutes : []).slice(0, RIBOS.pozicijos).map(function (e) {
        e = objektas(e);
        return { i: typeof e.i === "number" && Math.floor(e.i) === e.i && e.i >= 0 && e.i < RIBOS.pozicijos ? e.i : -1,
          ikainis: e.ikainis === null ? null : skaicius(e.ikainis, 0, RIBOS.suma), pastaba: eilute(e.pastaba, RIBOS.trumpas) };
      }).filter(function (e) { if (e.i < 0 || matyta[e.i]) return false; matyta[e.i] = true; return true; }),
      pristatymas: eilute(x.pristatymas, RIBOS.trumpas),
      galioja: typeof x.galioja === "number" && Math.floor(x.galioja) === x.galioja && x.galioja >= 1 && x.galioja <= 365 ? x.galioja : null,
      pastabos: tekstas(x.pastabos, 2000),
      patvirtinta: (Array.isArray(x.patvirtinta) ? x.patvirtinta : []).filter(function (a, i, s) { return (PATVIRTINIMAI.indexOf(a) >= 0 || a === NACSAUG) && s.indexOf(a) === i; }),
      pateikta: laikas(x.pateikta), kalba: x.kalba === "en" ? "en" : "lt"
    };
    if (!p.apklausa || !p.kvietimas || !p.t || !p.tiekejas.pav || !p.pateikta) return { ok: false, klaida: "forma" };
    return { ok: true, pasiulymas: p };
  }

  /* ---------- antspaudas ---------- */
  function kanonas(v) {
    if (Array.isArray(v)) return "[" + v.map(kanonas).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + kanonas(v[k]); }).join(",") + "}";
    return JSON.stringify(v === undefined ? null : v);
  }
  function sha(tekstas) {
    return global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(tekstas)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join("");
    });
  }
  function antspaudas(obj) { return sha(kanonas(obj)); }
  function trumpas(h) { return String(h || "").slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, "$1-"); }

  /* ---------- sumos ir vertinimas ---------- */
  function apvalink(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function sumos(k, p, tarifas) {
    var pagal = {}, truksta = 0, viso = 0;
    (p.eilutes || []).forEach(function (e) { pagal[e.i] = e; });
    var eil = k.pozicijos.map(function (poz, i) {
      var e = pagal[i], ik = e && typeof e.ikainis === "number" ? e.ikainis : null, suma = ik === null ? null : apvalink(poz.kiekis * ik);
      if (suma === null) truksta++; else viso += suma;
      return { i: i, ikainis: ik, suma: suma, pastaba: e && e.pastaba ? String(e.pastaba) : "" };
    });
    viso = apvalink(viso);
    var pvmSuma = p.pvm && typeof tarifas === "number" ? apvalink(viso * tarifas) : 0;
    return { eilutes: eil, truksta: truksta, viso: viso, pvmSuma: pvmSuma, suPvm: p.pvm && typeof tarifas !== "number" ? null : apvalink(viso + pvmSuma) };
  }
  /* Ar pasiūlymą pateikė kitas tiekėjas nei kviestas (persiųsta nuoroda): palyginami pavadinimai be teisinės formos, kabučių ir tarpų. */
  function pavKamienas(v) {
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/(^|[^a-z0-9])(uab|ab|mb|ii|vsi|ou|as|sia|uab|ltd|llc|gmbh|oy|sp\.? ?z\.? ?o\.? ?o\.?|s\.?a\.?)(?=[^a-z0-9]|$)/g, " ").replace(/[^a-z0-9]+/g, "");
  }
  function kitasPavadinimas(kviestas, pateike) {
    var a = pavKamienas(kviestas), b = pavKamienas(pateike);
    return !!(a && b && a.indexOf(b) < 0 && b.indexOf(a) < 0);
  }
  /* Pasiūlymų palyginimas. o: { kvietimas, tiekejai: [{ t, pav }], pasiulymai: [{ t, duomenys, gauta }], lesos, tarifas, neatitinka: { t: priežastis } }.
     Į eilę patenka tik laiku gauti pasiūlymai su visų pozicijų įkainiais, kurių žmogus nepažymėjo neatitinkančiais poreikio; eilė - pagal kainą
     be PVM, vienodos kainos - anksčiau gautas pirmesnis. Požymiai (viršija lėšas, neįprastai maža kaina) pasiūlymo nepašalina - juos įvertina
     ir sprendimą priima žmogus. Vidurkis neįprastai mažai kainai - iš eilėje esančių, skirtų lėšų neviršijančių pasiūlymų (registro „nmk_riba“). */
  function vertink(o) {
    var k = o.kvietimas, terminas = new Date(k.terminas).getTime(), pagalT = {}, lesos = typeof o.lesos === "number" && o.lesos > 0 ? o.lesos : null;
    var neat = o.neatitinka || {};
    (o.pasiulymai || []).forEach(function (x) { pagalT[x.t] = x; });
    var eil = (o.tiekejai || []).map(function (tk) {
      var x = pagalT[tk.t];
      if (!x || !x.duomenys) return { t: tk.t, tiekejas: tk.pav, busena: "negautas", pastabos: [] };
      var s = sumos(k, x.duomenys, o.tarifas), gauta = new Date(x.gauta).getTime(), veluoja = !(gauta <= terminas);
      var busena = veluoja ? "pavėluotas" : s.truksta ? "nepilnas" : Object.prototype.hasOwnProperty.call(neat, tk.t) ? "neatitinka" : "tinkamas";
      return { t: tk.t, tiekejas: x.duomenys.tiekejas.pav || tk.pav, gauta: x.gauta, sumos: s, viso: s.viso, suPvm: s.suPvm, pvm: x.duomenys.pvm,
        busena: busena, truksta: s.truksta, priezastis: busena === "neatitinka" ? String(neat[tk.t] || "") : "",
        nepatvirtinta: reikiaPatvirtinti(k).filter(function (a) { return x.duomenys.patvirtinta.indexOf(a) < 0; }),
        kitasTiekejas: kitasPavadinimas(tk.pav, x.duomenys.tiekejas.pav) ? tk.pav : "", parengta: x.duomenys.pateikta || "" };
    });
    var tinkami = eil.filter(function (e) { return e.busena === "tinkamas"; }).sort(function (a, b) {
      return a.viso - b.viso || new Date(a.gauta) - new Date(b.gauta) || (a.t < b.t ? -1 : 1);
    });
    tinkami.forEach(function (e, i) { e.vieta = i + 1; });
    /* Vienodos kainos (Aprašo 30.17 p.): pirmesnis - pasiūlymas, pateiktas anksčiausiai, t. y. anksčiau gautas. Grupės pažymimos, kad
       iniciatorius patikrintų gavimo laikus pagal savo el. paštą. */
    var lygios = [];
    tinkami.forEach(function (e, i) { if (i && tinkami[i - 1].viso === e.viso) { var g = lygios[lygios.length - 1]; if (g && g.indexOf(tinkami[i - 1].t) >= 0) g.push(e.t); else lygios.push([tinkami[i - 1].t, e.t]); } });
    var virsLesu = [], nmk = [], lyginami = tinkami.filter(function (e) { return lesos === null || e.viso <= lesos; }), vidurkis = null;
    if (lesos !== null) tinkami.forEach(function (e) { if (e.viso > lesos) { e.virsLesu = true; virsLesu.push(e.t); } });
    if (lyginami.length >= 2) {
      vidurkis = apvalink(lyginami.reduce(function (s, e) { return s + e.viso; }, 0) / lyginami.length);
      lyginami.forEach(function (e) { if (vidurkis > 0 && (vidurkis - e.viso) / vidurkis >= NMK_DALIS) { e.nmk = true; nmk.push(e.t); } });
    }
    var palyginami = eil.filter(function (e) { return e.sumos && e.busena !== "pavėluotas"; });
    var matrica = k.pozicijos.map(function (poz, i) {
      var maz = null;
      palyginami.forEach(function (e) { var ik = e.sumos.eilutes[i].ikainis; if (e.busena === "tinkamas" && ik !== null && (maz === null || ik < maz)) maz = ik; });
      return { i: i, maziausias: maz };
    });
    return { eilutes: eil, eile: tinkami.map(function (e) { return e.t; }), siulomas: tinkami.length ? tinkami[0].t : null,
      virsLesu: virsLesu, nmk: nmk, vidurkis: vidurkis, matrica: matrica, lesos: lesos, lygios: lygios,
      nmkNetikrinta: tinkami.length >= 2 && lyginami.length < 2,
      gauta: eil.filter(function (e) { return e.busena !== "negautas"; }).length, kviesta: eil.length };
  }

  /* ---------- apklausos įrašas (saugykla ir apklausos bylos failas - NEPATIKIMI duomenys) ---------- */
  var BUSENOS = ["juodrastis", "paskelbta", "atverta", "ivertinta", "uzbaigta", "nutraukta"];
  var REZULTATAI = ["laimetojas", "atmesta", "negauta", "nutraukta"];
  function suma(v) { return skaicius(v, 0, RIBOS.suma); }
  /* Grąžina sutvarkytą apklausos įrašą arba null. Juodraščio kvietimas gali būti nepilnas (laukai tikrinami skelbiant). */
  function apklausosForma(x) {
    x = objektas(x);
    if (!ID_RE.test(x.id)) return null;
    var busena = BUSENOS.indexOf(x.busena) >= 0 ? x.busena : "juodrastis", kv = objektas(x.kvietimas), pk = objektas(kv.pirkejas), kt = objektas(kv.kontaktas);
    var vd = objektas(x.vidaus), sp = objektas(x.sprendimas), tokenai = {};
    var a = {
      id: x.id, busena: busena, sukurta: laikas(x.sukurta), keista: laikas(x.keista),
      kvietimas: {
        v: 1, id: x.id, pirkejas: { pav: eilute(pk.pav, RIBOS.pavadinimas), kodas: eilute(pk.kodas, 20) },
        pavadinimas: eilute(kv.pavadinimas, RIBOS.pavadinimas), aprasymas: tekstas(kv.aprasymas, RIBOS.tekstas),
        pozicijos: (Array.isArray(kv.pozicijos) ? kv.pozicijos : []).slice(0, RIBOS.pozicijos).map(function (p) {
          p = objektas(p);
          return { pav: eilute(p.pav, RIBOS.trumpas), mat: eilute(p.mat, 20), kiekis: skaicius(p.kiekis, 0, 1e9), pastaba: eilute(p.pastaba, RIBOS.trumpas) };
        }),
        terminas: laikas(kv.terminas), pristatymoVieta: eilute(kv.pristatymoVieta, RIBOS.trumpas), pristatymoTerminas: eilute(kv.pristatymoTerminas, RIBOS.trumpas),
        apmokejimas: eilute(kv.apmokejimas, RIBOS.trumpas), kontaktas: { vardas: eilute(kt.vardas, 120), pastas: pastas(kt.pastas), tel: eilute(kt.tel, 40) }
      },
      antspaudas: HEX64.test(x.antspaudas) ? x.antspaudas : "",
      vidaus: { verte: suma(vd.verte), lesos: suma(vd.lesos), bvpz: eilute(vd.bvpz, 40), padalinys: eilute(vd.padalinys, 120), pareigos: eilute(vd.pareigos, 120),
        mazaiTiekeju: tekstas(vd.mazaiTiekeju, 1000) },
      tiekejai: (Array.isArray(x.tiekejai) ? x.tiekejai : []).slice(0, RIBOS.tiekejai).map(function (t) {
        t = objektas(t);
        var tr = objektas(t.trumpa), x = { t: ZETONO_RE.test(t.t) ? t.t : "", pav: eilute(t.pav, RIBOS.pavadinimas), pastas: pastas(t.pastas), kalba: t.kalba === "en" ? "en" : "lt", issiusta: laikas(t.issiusta) };
        // trumpa nuoroda (2026-11-27): ID ir trynimo raktas iš G-Procure serverio (serveris/nuorodos-logika.js)
        if (TRUMPOS_ID_RE.test(tr.id) && TRYNIMO_RE.test(tr.trynimas) && laikas(tr.galioja)) x.trumpa = { id: tr.id, trynimas: tr.trynimas, galioja: laikas(tr.galioja) };
        return x;
      }).filter(function (t) { if (!t.t || tokenai[t.t]) return false; tokenai[t.t] = true; return true; }),
      pasiulymai: [], atverta: laikas(x.atverta), atvertaAnksciau: x.atvertaAnksciau === true,
      sprendimas: null, pazyma: laikas(x.pazyma), importuota: eilute(x.importuota, 200),
      zurnalas: (Array.isArray(x.zurnalas) ? x.zurnalas : []).slice(-500).map(function (e) {
        e = objektas(e);
        var z = { laikas: laikas(e.laikas), ivykis: eilute(e.ivykis, 60), detales: eilute(e.detales, 500), h: /^[0-9a-f]{24}$/.test(e.h) ? e.h : "" }, r = refForma(e.ref);
        if (r) z.ref = r;
        return z;
      }).filter(function (e) { return e.laikas && e.ivykis; })
    };
    var matyta = {};
    (Array.isArray(x.pasiulymai) ? x.pasiulymai : []).slice(0, RIBOS.tiekejai * 2).forEach(function (p) {
      p = objektas(p);
      if (!tokenai[p.t] || matyta[p.t] || typeof p.kodas !== "string" || p.kodas.length > RIBOS.kodas || !/^g[01]\.[A-Za-z0-9_-]+$/.test(p.kodas)) return;
      var d = null;
      if (a.atverta && p.duomenys) { var f = pasiulymoForma(p.duomenys); if (f.ok && f.pasiulymas.t === p.t) d = f.pasiulymas; }
      matyta[p.t] = true;
      a.pasiulymai.push({ t: p.t, kodas: p.kodas, h: HEX64.test(p.h) ? p.h : "", gauta: laikas(p.gauta), gautaKaip: p.gautaKaip === "nurodyta" ? "nurodyta" : "ikelta",
        pateikta: laikas(p.pateikta), tiekejas: eilute(p.tiekejas, RIBOS.pavadinimas), pakeista: typeof p.pakeista === "number" && p.pakeista > 0 && p.pakeista < 100 ? Math.floor(p.pakeista) : 0, duomenys: d });
    });
    a.pasiulymai = a.pasiulymai.filter(function (p) { return p.gauta; });
    if (REZULTATAI.indexOf(sp.rezultatas) >= 0) {
      var neat = {}, o2 = objektas(sp.neatitinka), ati = {}, o3 = objektas(sp.atitinka);
      Object.keys(o2).forEach(function (t) { if (tokenai[t]) neat[t] = eilute(o2[t], 500); });
      Object.keys(o3).forEach(function (t) { if (tokenai[t] && o3[t] === true) ati[t] = true; });
      a.sprendimas = { rezultatas: sp.rezultatas, laimetojas: tokenai[sp.laimetojas] ? sp.laimetojas : "", neatitinka: neat, atitinka: ati,
        pastaba: tekstas(sp.pastaba, 1000), patvirtinta: laikas(sp.patvirtinta) };
    } else if (sp && (sp.neatitinka || sp.atitinka)) {
      var n2 = {}, a2 = {}, q2 = objektas(sp.neatitinka), q3 = objektas(sp.atitinka);
      Object.keys(q2).forEach(function (t) { if (tokenai[t]) n2[t] = eilute(q2[t], 500); });
      Object.keys(q3).forEach(function (t) { if (tokenai[t] && q3[t] === true) a2[t] = true; });
      a.sprendimas = { rezultatas: "", laimetojas: "", neatitinka: n2, atitinka: a2, pastaba: tekstas(sp.pastaba, 1000), patvirtinta: "" };
    }
    var kdok = tekstas(kv.dokumentai, 1000); if (kdok) a.kvietimas.dokumentai = kdok;
    if (kv.nacsaugumas === true) a.kvietimas.nacsaugumas = true;
    if (busena !== "juodrastis" && (!a.antspaudas || !kvietimoForma(a.kvietimas).ok)) return null;
    if (!a.sukurta) a.sukurta = a.keista || "";
    return a;
  }
  /* Apklausos byla (failas): { formatas, versija, apklausa }. */
  var BYLOS_FORMATAS = "g-procure/apklausos-byla";
  function byla(a, dabarIso) { return { formatas: BYLOS_FORMATAS, versija: 1, sudaryta: dabarIso || new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), apklausa: a }; }
  function isBylos(tekstoJson) {
    if (typeof tekstoJson !== "string" || tekstoJson.length > 2000000) return { ok: false, klaida: "per-didelis" };
    var x;
    try { x = saugusJson(tekstoJson.replace(/^\uFEFF/, "")); } catch (e) { return { ok: false, klaida: "json" }; }
    x = objektas(x);
    if (x.formatas !== BYLOS_FORMATAS) return { ok: false, klaida: "formatas" };
    if (x.versija !== 1) return { ok: false, klaida: x.versija > 1 ? "versija" : "formatas" };
    var a = apklausosForma(x.apklausa);
    return a ? { ok: true, apklausa: a } : { ok: false, klaida: "forma" };
  }
  /* Vientisumo patikra: kvietimo antspaudas, pasiūlymų antspaudai (iš kodų) ir žurnalo grandinė. */
  function patikra(a) {
    var rez = { kvietimas: null, pasiulymai: [], zurnalas: null };
    var p = a.antspaudas ? antspaudas(bendra(a.kvietimas)).then(function (h) { rez.kvietimas = h === a.antspaudas; }) : Promise.resolve();
    (a.pasiulymai || []).forEach(function (x) {
      p = p.then(function () {
        return iskoduok(x.kodas).then(function (obj) {
          var f = pasiulymoForma(obj);
          if (!f.ok) { rez.pasiulymai.push({ t: x.t, ok: false }); return; }
          return antspaudas(f.pasiulymas).then(function (h) {
            rez.pasiulymai.push({ t: x.t, ok: h === x.h && f.pasiulymas.t === x.t && f.pasiulymas.apklausa === a.id && f.pasiulymas.kvietimas === a.antspaudas &&
              (!x.duomenys || kanonas(x.duomenys) === kanonas(f.pasiulymas)) });
          });
        }, function () { rez.pasiulymai.push({ t: x.t, ok: false }); });
      });
    });
    return p.then(function () { return tikrinkZurnala(a.zurnalas); }).then(function (z) {
      rez.zurnalas = z.ok; rez.zurnaloVieta = z.ok ? null : z.vieta;
      var dz = duomenysPrieZurnalo(a); rez.duomenys = dz.problemos; rez.duomenysTikrinti = dz.tikrinta;
      var g = (a.zurnalas || [])[(a.zurnalas || []).length - 1]; rez.galas = g ? { laikas: g.laikas, ivykis: g.ivykis, h: g.h } : null;
      rez.ok = rez.kvietimas !== false && rez.zurnalas && rez.pasiulymai.every(function (x) { return x.ok; }) && !rez.duomenys.length;
      return rez;
    });
  }

  /* Apklausos duomenys prieš žurnalą: kvietimo antspaudas, vertė ir lėšos, kiekvienas pasiūlymas (antspaudas ir gavimo laikas), būsena ir
     sprendimas turi sutapti su tuo, kas įrašyta žurnale. Taip randamas pakeistas gavimo laikas, pašalintas pasiūlymas, grąžinta būsena ar
     pakeista vertė. Kartu pakeistus ir žurnalą, ir duomenis rodo tik paskutinio įrašo antspaudas, palygintas su pažyma (rez.galas). */
  var IVYKIO_BUSENA = { paskelbta: "paskelbta", atverta: "atverta", negauta: "ivertinta", sprendimas: "ivertinta", atsaukta: "atverta", nutraukta: "nutraukta", pazyma: "uzbaigta" };
  function duomenysPrieZurnalo(a) {
    var zr = a.zurnalas || [], pr = [], tikrinta = zr.some(function (e) { return e.ref; });
    if (!tikrinta) return { problemos: pr, tikrinta: false };
    var vardas = function (t) { var tk = (a.tiekejai || []).filter(function (x) { return x.t === t; })[0]; return tk ? tk.pav : t; };
    var exp = {}, busena = "", sp = null, neperskaityti = {};
    zr.forEach(function (e) {
      var r = e.ref || {};
      if (e.ivykis === "paskelbta" && e.ref) {
        if (r.k !== a.antspaudas) pr.push("Kvietimo antspaudas nesutampa su įrašytu paskelbiant");
        var vd = a.vidaus || {};
        if (r.v !== (vd.verte === null || vd.verte === undefined ? "" : String(vd.verte))) pr.push("Numatoma vertė pakeista po paskelbimo");
        if (r.l !== (vd.lesos === null || vd.lesos === undefined ? "" : String(vd.lesos))) pr.push("Pirkimui skirtos lėšos pakeistos po paskelbimo");
      }
      if ((e.ivykis === "gauta" || e.ivykis === "pakeista") && r.t) exp[r.t] = { h: r.h, g: r.g };
      if (e.ivykis === "atverta" && r.x) r.x.split(",").forEach(function (t) { if (t) neperskaityti[t] = true; });
      if (e.ivykis === "sprendimas") sp = { r: r.r, w: r.w || "" };
      if (e.ivykis === "atsaukta") sp = null;
      if (IVYKIO_BUSENA[e.ivykis]) busena = IVYKIO_BUSENA[e.ivykis];
    });
    (a.pasiulymai || []).forEach(function (p) {
      var x = exp[p.t];
      if (!x) pr.push(vardas(p.t) + ": pasiūlymo gavimas žurnale neįrašytas");
      else if (x.h !== p.h || x.g !== p.gauta) pr.push(vardas(p.t) + ": pasiūlymo antspaudas ar gavimo laikas nesutampa su žurnalu");
    });
    Object.keys(exp).forEach(function (t) {
      if (!neperskaityti[t] && !(a.pasiulymai || []).some(function (p) { return p.t === t; })) pr.push(vardas(t) + ": žurnale įrašytas gautas pasiūlymas, kurio apklausoje nėra");
    });
    if (busena && busena !== a.busena) pr.push("Apklausos būsena nesutampa su žurnalu");
    if (sp && a.sprendimas && (sp.r !== a.sprendimas.rezultatas || sp.w !== (a.sprendimas.laimetojas || ""))) pr.push("Sprendimas nesutampa su įrašytu žurnale");
    return { problemos: pr, tikrinta: true };
  }

  /* ---------- žurnalas su grandine ---------- */
  /* ref - įvykio duomenys patikrai (antspaudai, gavimo laikas, vertė, sprendimas): tik trumpos tekstinės reikšmės. Įrašai be ref
     (iki 2026-11-27) tikrinami kaip iki tol. */
  function refForma(r) {
    var o = {}, n = 0;
    Object.keys(objektas(r)).sort().forEach(function (k) { if (/^[a-z]{1,3}$/.test(k) && typeof r[k] === "string" && n < 12) { o[k] = r[k].slice(0, 300); n++; } });
    return n ? o : null;
  }
  function zurnaloIrasas(ankstesnis, ivykis, detales, laikasIso, ref) {
    var e = { laikas: laikasIso || new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), ivykis: String(ivykis), detales: detales === undefined ? "" : String(detales).slice(0, 500) };
    var r = refForma(ref); if (r) e.ref = r;
    return sha((ankstesnis && ankstesnis.h || "") + kanonas(e)).then(function (h) { e.h = h.slice(0, 24); return e; });
  }
  function tikrinkZurnala(sar) {
    var p = Promise.resolve({ ok: true, ankstesnis: null });
    (sar || []).forEach(function (e, i) {
      p = p.then(function (b) {
        if (!b.ok) return b;
        var be = { laikas: e.laikas, ivykis: e.ivykis, detales: e.detales };
        if (e.ref) be.ref = e.ref;
        return sha((b.ankstesnis && b.ankstesnis.h || "") + kanonas(be)).then(function (h) {
          return h.slice(0, 24) === e.h ? { ok: true, ankstesnis: e } : { ok: false, vieta: i };
        });
      });
    });
    return p.then(function (b) { return b.ok ? { ok: true } : { ok: false, vieta: b.vieta }; });
  }

  /* ---------- laikas ---------- */
  var VILNIUS = "Europe/Vilnius";
  function dalys(d) {
    var f = new Intl.DateTimeFormat("en-GB", { timeZone: VILNIUS, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), o = {};
    f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  /* „2026-12-03T14:00“ Lietuvos laiku -> „2026-12-03T12:00:00Z“ (nepriklauso nuo kompiuterio laiko juostos). */
  function vilniausIUtc(vietinis) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(vietinis || ""));
    if (!m) return "";
    var norimas = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), t = norimas;
    for (var i = 0; i < 3; i++) { var d = dalys(new Date(t)); t += norimas - Date.UTC(+d.year, +d.month - 1, +d.day, +d.hour, +d.minute); }
    var g = dalys(new Date(t));
    // neegzistuojantis laikas: valanda, praleista keičiant laiką, arba data, kurios nėra (2026-02-30 - Date.UTC ją tyliai paverstų kovo 2 d.)
    if (g.year + "-" + g.month + "-" + g.day + "T" + g.hour + ":" + g.minute !== vietinis) return "";
    return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  function utcIVilniaus(iso) { var d = dalys(new Date(iso)); return d.year + "-" + d.month + "-" + d.day + "T" + d.hour + ":" + d.minute; }
  function rodykLaika(iso) { return iso ? utcIVilniaus(iso).replace("T", " ") : ""; }
  function forma(n, viena, kelios, daug) { var a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 || b === 0 ? daug : b === 1 ? viena : kelios; }
  function liko(iso, dabar, kalba) {
    var ms = new Date(iso).getTime() - (dabar && typeof dabar.getTime === "function" ? dabar.getTime() : Date.now()), en = kalba === "en";
    if (!(ms > 0)) return { praejo: true, tekstas: en ? "the deadline has passed" : "terminas praėjo" };
    var min = Math.floor(ms / 60000), val = Math.floor(min / 60), d = Math.floor(val / 24);
    if (d >= 2) return { praejo: false, tekstas: en ? d + " days left" : "liko " + d + " " + forma(d, "diena", "dienos", "dienų") };
    if (val >= 1) return { praejo: false, tekstas: en ? val + " h left" : "liko " + val + " val." };
    return { praejo: false, skubu: true, tekstas: en ? Math.max(min, 1) + " min left" : "liko " + Math.max(min, 1) + " min." };
  }

  /* ---------- laiškų tekstai ---------- */
  /* Kvietimo laiškas (2026-11-27, naudotojo pastaba „ar jis ne per sudėtingas?“): trumpas, be kodų ir antspaudų - kas, iki kada, trys
     žingsniai ir nuoroda pabaigoje. Antspaudas lieka kvietime ir pasiūlyme (vientisumo patikrai), bet tiekėjui laiške jo nereikia. */
  function laiskas(k, nuoroda, h, kalba) {
    var en = kalba === "en", kt = k.kontaktas, kas = kt.vardas ? kt.vardas + ", " + kt.pastas : kt.pastas, data = rodykLaika(k.terminas).slice(0, 10);
    if (kt.tel) kas += ", " + kt.tel;
    if (en) return {
      tema: "Request for quotation: " + k.pavadinimas + " (by " + data + ")",
      tekstas: ["Hello,", "", k.pirkejas.pav + " invites you to submit a quotation for the low-value procurement “" + k.pavadinimas + "”.",
        "Deadline: " + rodykLaika(k.terminas) + " (Lithuanian time).", "",
        "It only takes a few minutes:", "1. Open the link below - it shows what is being bought and the terms.", "2. Enter your prices and details.",
        "3. Click “Send the quotation” - a prepared email will open in your email program; just send it."]
        .concat(k.dokumentai ? ["", "Please attach to the email: " + k.dokumentai] : [])
        .concat(["", "Submit a quotation:", nuoroda, "", "Questions: " + kas]).join("\n")
    };
    return {
      tema: "Kvietimas pateikti pasiūlymą: " + k.pavadinimas + " (iki " + data + ")",
      tekstas: ["Laba diena,", "", k.pirkejas.pav + " kviečia Jus pateikti pasiūlymą mažos vertės pirkimui „" + k.pavadinimas + "“.",
        "Pasiūlymų terminas: " + rodykLaika(k.terminas) + " (Lietuvos laiku).", "",
        "Pasiūlymą pateiksite per kelias minutes:", "1. Atverkite nuorodą žemiau - joje rasite, kas perkama ir kokios sąlygos.", "2. Įrašykite kainas ir savo duomenis.",
        "3. Paspauskite „Siųsti pasiūlymą“ - jūsų pašto programoje atsivers paruoštas laiškas, kurį tereikės išsiųsti."]
        .concat(k.dokumentai ? ["", "Prie laiško pridėkite: " + k.dokumentai] : [])
        .concat(["", "Pateikti pasiūlymą:", nuoroda, "", "Kilus klausimų: " + kas]).join("\n")
    };
  }
  /* Tiekėjo atsakymas: kainos - tik bloke su kodu (atviru tekstu laiške jų nėra), antspaudo laiške nebėra (jis - tiekėjo kopijoje). */
  function atsakymas(k, p, kodas, h, kalba) {
    var en = kalba === "en", pas = p.tiekejas.pav + (p.tiekejas.asmuo ? ", " + p.tiekejas.asmuo : "");
    if (en) return {
      tema: "Quotation: " + k.pavadinimas + " (" + k.id + ") - " + p.tiekejas.pav,
      tekstas: ["Hello,", "", "Please find our quotation for the procurement “" + k.pavadinimas + "” below.",
        "The quotation data is in the block below - please do not change it; the buyer's tool will read it.", "", sarvas(kodas, "pasiulymas"), "", pas].join("\n")
    };
    return {
      tema: "Pasiūlymas: " + k.pavadinimas + " (" + k.id + ") - " + p.tiekejas.pav,
      tekstas: ["Laba diena,", "", "Siunčiame pasiūlymą pirkimui „" + k.pavadinimas + "“.",
        "Pasiūlymo duomenys - žemiau esančiame bloke; jo nekeiskite, jį perskaitys pirkimo vykdytojo įrankis.", "", sarvas(kodas, "pasiulymas"), "", pas].join("\n")
    };
  }

  global.GP_APKLAUSA = {
    RIBOS: RIBOS, PATVIRTINIMAI: PATVIRTINIMAI, NACSAUG: NACSAUG, reikiaPatvirtinti: reikiaPatvirtinti, kitasPavadinimas: kitasPavadinimas, NMK_DALIS: NMK_DALIS, ID_RE: ID_RE, ZETONO_RE: ZETONO_RE,
    id: id, zetonas: zetonas, koduok: koduok, iskoduok: iskoduok, sarvas: sarvas, isSarvo: isSarvo, atkoduok: atkoduok,
    kvietimoForma: kvietimoForma, pasiulymoForma: pasiulymoForma, bendra: bendra, kanonas: kanonas, antspaudas: antspaudas, trumpas: trumpas,
    apvalink: apvalink, sumos: sumos, vertink: vertink, zurnaloIrasas: zurnaloIrasas, tikrinkZurnala: tikrinkZurnala,
    vilniausIUtc: vilniausIUtc, utcIVilniaus: utcIVilniaus, rodykLaika: rodykLaika, liko: liko, forma: forma,
    laiskas: laiskas, atsakymas: atsakymas, pastas: pastas, eilute: eilute, tekstas: tekstas,
    BUSENOS: BUSENOS, REZULTATAI: REZULTATAI, BYLOS_FORMATAS: BYLOS_FORMATAS, apklausosForma: apklausosForma, byla: byla, isBylos: isBylos, patikra: patikra
  };
})(typeof window !== "undefined" ? window : this);
