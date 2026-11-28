/* ==========================================================================
 * PP-sutartys/pakeitimai-ui.js - sutarties pakeitimų įrankio sąsaja (GP_PAKEITIMAI_UI)
 *
 * Sutartys ir jų pakeitimų sąrašai saugomi tik šioje naršyklėje (raktas gprocure.pakeitimai, per GP_SAUGYKLA).
 * Į serverius siunčiama tik naudotojo veiksmu: pirkimo vykdytojo kodas (viešai paskelbtų sutarčių sąrašas paieškai; paieškos žodžiai
 * lieka naršyklėje) ir sutarties numeris - į G-Procure serverį
 * (vieši CVP IS sutarčių duomenys), indekso rinkinio kodas ir laikotarpis - į Oficialiosios statistikos portalą.
 * Veiksmai - per data-veiksmas (shared/ivykiai.js); puslapio CSP griežta, įterptų įvykių atributų nėra.
 * ========================================================================== */
;(function (global) {
  "use strict";
  var G = global.GP_PAKEITIMAI, DK = global.GP_PAKEITIMU_DOK, doc = global.document;
  if (!G || !doc) return;
  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function forma(n, v, k, d) { n = Math.abs(n) % 100; var l = n % 10; return n > 10 && n < 20 ? d : l === 1 ? v : l >= 2 && l <= 9 ? k : d; }

  var B = { visos: [], kiti: [], nezinoma: "", saugykla: null }, S = null, ZING = 1, LAIKM = null, PASIRASYTA = "", TVIRTINA = "";
  /* PASIRINKTA - ką tik iš viešų duomenų pasirinktos sutarties užpildymo santrauka (1 žingsnio viršuje); ATVERTA - išskleistos 1 žingsnio dalys */
  var PASIRINKTA = null, ATVERTA = {};
  var ZINGSNIAI = ["Sutartis", "Pakeitimai", "Dokumentai"];
  /* Paieška viešai paskelbtų sutarčių sąraše: P.sar[organizacija] - gautas sąrašas (tik atmintyje), P.rasta - dabar rodomi rezultatai */
  var P = { org: "litgrid", q: "", kur: "visur", busena: "visos", rodoma: 12, sar: {}, rasta: [], ieskota: false, laikm: null, fetch: null };
  var KUR = [["visur", "Visur"], ["pav", "Pavadinime"], ["tiekejas", "Tiekėjas"], ["nr", "Numeris"]];
  var IKONOS = {
    lupa: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    sutartis: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>',
    keisti: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h11"/><path d="m12 4 3 3-3 3"/><path d="M20 17H9"/><path d="m12 14-3 3 3 3"/></svg>',
    dokumentas: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9 15 2 2 4-4"/></svg>',
    rodykle: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
  };

  /* ---------- saugykla ---------- */
  var TESTINE = false, ATMINTIS = null;
  try { TESTINE = /[?&]saugykla=testine(&|$)/.test(global.location.search) && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(global.location.hostname); } catch (e) {}
  function atmintine() { var d = {}; return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; }, setItem: function (k, v) { d[k] = String(v); }, removeItem: function (k) { delete d[k]; } }; }
  /* Kito skirtuko apsauga - tik tikrai naršyklės saugyklai: paduotai (testų) saugyklai ji netaikoma, kitaip šio lango matyta tikros
     saugyklos reikšmė būtų lyginama su kitos saugyklos turiniu ir antras įrašymas būtų atmestas. */
  function saug() { var o = {}; if (B.saugykla) o.saugykla = B.saugykla; else if (TESTINE) { ATMINTIS = ATMINTIS || atmintine(); o.saugykla = ATMINTIS; } else o.kitasSkirtukas = "Sutarties pakeitimai"; return o; }
  function skaityk() {
    var o = saug();
    o.tikrink = function (v) { return (v && typeof v === "object" && Array.isArray(v.sutartys)) || "netinkama sutarčių įrašo sandara"; };
    var r = global.GP_SAUGYKLA.skaityk(G.RAKTAS, o);
    B.nezinoma = r.busena === "sugadinta" || r.busena === "neprieinama" ? global.GP_SAUGYKLA.pranesimas(r, "Sutarties pakeitimai") : "";
    B.visos = []; B.kiti = [];
    if (r.busena === "yra") r.reiksme.sutartys.forEach(function (x) { var s = G.sutartiesForma(x); if (s) B.visos.push(s); else B.kiti.push(x); });
  }
  function rasyk() {
    if (B.nezinoma) return { ok: false };
    var r = global.GP_SAUGYKLA.rasyk(G.RAKTAS, { schema: G.SCHEMA, sutartys: B.visos.concat(B.kiti) }, saug());
    if (!r.ok && global.GP_BUSENA) global.GP_BUSENA.juosta({ raktas: "pakeitimai", tipas: "klaida", tekstas: global.GP_SAUGYKLA.pranesimas(r, "Sutarties pakeitimai") });
    else if (global.GP_BUSENA && global.GP_BUSENA.juostaSlepk) global.GP_BUSENA.juostaSlepk("pakeitimai");
    zyma(r.ok ? "Išsaugota " + new Date().toTimeString().slice(0, 5) : "Neišsaugota", !r.ok);
    return r;
  }
  function zyma(t, klaida) { var z = $("psZymaT"); if (z) { z.textContent = t; z.parentNode.classList.toggle("header-zyma--klaida", !!klaida); } }
  function issaugok() {
    if (!S) return;
    S.keista = new Date().toISOString();
    clearTimeout(LAIKM);
    LAIKM = setTimeout(issaugokDabar, 500);
  }
  function issaugokDabar() {
    clearTimeout(LAIKM); LAIKM = null;
    if (!S) return { ok: true };
    var i = B.visos.map(function (x) { return x.id; }).indexOf(S.id);
    if (i >= 0) B.visos[i] = S; else B.visos.unshift(S);
    return rasyk();
  }
  function naujasId() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function siandien() { return global.GP_WORKDAYS ? global.GP_WORKDAYS.siandien() : new Date().toISOString().slice(0, 10); }

  /* ---------- laukai ---------- */
  function rodomaReiksme(tipas, v) {
    if (v == null) return "";
    if (tipas === "suma") return G.eur(v);
    if (tipas === "indeksas") return G.fiks(v, 4);
    if (tipas === "skaicius") return String(v).replace(".", ",");
    return String(v);
  }
  function lid(k) { return "ps-" + k.replace(/\./g, "-"); }
  /* o: { k, pav, tipas, v, uz, pvz, klase, parinktys: [[reikšmė, pavadinimas]], perpiesk, eil, privalomas, plotis } */
  function lauk(o) {
    var id = lid(o.k), bendri = ' id="' + id + '" data-kelias="' + esc(o.k) + '" data-tipas="' + (o.tipas || "tekstas") + '"' + (o.perpiesk ? ' data-perpiesk="1"' : "") + (o.tipas === "menuo" ? ' data-buvo="' + esc(o.v || "") + '"' : "") +
      (o.uz ? ' aria-describedby="' + id + '-uz"' : "") + (o.privalomas ? ' aria-required="true"' : ""), vidus;
    var ivykiai = ' data-veiksmas-input="psLaukas" data-veiksmas-change="psLaukasBaigtas"';
    if (o.tipas === "bool") {
      return '<div class="ps-lauk ps-lauk--bool ' + (o.klase || "") + '"><label><input type="checkbox"' + bendri + ' data-veiksmas-change="psLaukasBaigtas"' + (o.v ? " checked" : "") + "> <span>" + esc(o.pav) + "</span></label>" +
        (o.uz ? '<p class="ps-uz" id="' + id + '-uz">' + esc(o.uz) + "</p>" : "") + "</div>";
    }
    if (o.parinktys) {
      vidus = "<select" + bendri + ' data-veiksmas-change="psLaukasBaigtas">' + o.parinktys.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(o.v == null ? "" : o.v) === String(p[0]) ? " selected" : "") + ">" + esc(p[1]) + "</option>"; }).join("") + "</select>";
    } else if (o.eil) {
      vidus = "<textarea" + bendri + ivykiai + ' rows="' + o.eil + '" autocomplete="off" placeholder="' + esc(o.pvz || " ") + '">' + esc(o.v == null ? "" : o.v) + "</textarea>";
    } else {
      var tp = o.tipas === "data" ? "date" : o.tipas === "menuo" ? "month" : "text";
      vidus = '<input type="' + tp + '"' + bendri + ivykiai + ' autocomplete="off" value="' + esc(rodomaReiksme(o.tipas, o.v)) + '"' + (tp === "text" || tp === "month" ? ' placeholder="' + esc(o.pvz || " ") + '"' : "") +
        (o.tipas === "suma" || o.tipas === "indeksas" || o.tipas === "skaicius" || o.tipas === "sveikas" ? ' inputmode="decimal"' : "") + ">";
    }
    return '<div class="ps-lauk ' + (o.klase || "") + '"><label for="' + id + '">' + esc(o.pav) + (o.privalomas ? ' <span class="ps-zv" aria-hidden="true">*</span>' : "") + "</label>" + vidus +
      (o.uz ? '<p class="ps-uz" id="' + id + '-uz">' + esc(o.uz) + "</p>" : "") + (o.po || "") + "</div>";
  }
  function isLauko(el) {
    var tp = el.getAttribute("data-tipas"), v = el.type === "checkbox" ? el.checked : el.value, M = global.GP_MONEY, t = String(v).trim();
    if (tp === "bool") return { v: !!v, ok: true };
    if (tp === "suma") { if (!t) return { v: null, ok: true }; var s = M ? M.sumaLauke(t) : null; return { v: s, ok: s != null }; }
    if (tp === "indeksas" || tp === "skaicius") { if (!t) return { v: null, ok: true }; var n = M ? M.parseSkaicius(t) : parseFloat(t.replace(",", ".")); return { v: n != null && isFinite(n) && n >= 0 ? n : null, ok: n != null && isFinite(n) && n >= 0 }; }
    if (tp === "sveikas") { if (!t) return { v: null, ok: true }; return /^\d{1,3}$/.test(t) ? { v: +t, ok: true } : { v: null, ok: false }; }
    if (tp === "menuo") { if (!t) return { v: "", ok: true }; var m = global.GP_OSP_INDEKSAI ? global.GP_OSP_INDEKSAI.menuo(t) : t; return { v: m || "", ok: !!m }; }
    return { v: v, ok: true };
  }
  function nustatyk(kelias, v) {
    var p = kelias.split(".");
    if (p[0] === "s") { S.sutartis[p[1]] = v; if (p[1] === "pavadinimasKilm") S.sutartis.pavS = ""; }
    else if (p[0] === "r") S.rengiamas[p[1]] = v;
    else if (p[0] === "a" && S.ankstesni[+p[1]]) S.ankstesni[+p[1]][p[2]] = v;
    else if (p[0] === "b") {
      var b = S.rengiamas.blokai[+p[1]];
      if (!b) return;
      if (p[2] === "t") b.taisykle[p[3]] = v;
      else if (p[2] === "esm" && b.esm) b.esm[p[3]] = v;
      else if (p[2] === "e" && b.eilutes[+p[3]]) {
        var e = b.eilutes[+p[3]];
        e[p[4]] = v;
        if (p[4] === "pr") e.prS = v == null ? "" : "ranka";
        if (p[4] === "pb") e.pbS = v == null ? "" : "ranka";
      } else b[p[2]] = v;
    } else if (kelias === "x.pasirasyta") PASIRASYTA = v;
  }
  /* Po reikšmės pakeitimo - priklausomi pakeitimai (kiti laukai, kurie seka šį). */
  function pasekmes(kelias, v, pakito) {
    var p = kelias.split("."), I = global.GP_OSP_INDEKSAI;
    if (kelias === "s.vykdytojas") {
      var O = global.GP_ORG, o = O && O.pagalId(v), rk = O && O.rekvizitai(v);
      if (o) { S.sutartis.pirkejoPav = o.pavadinimas || S.sutartis.pirkejoPav; S.sutartis.pirkejoKodas = rk ? rk.kodas : ""; S.sutartis.pirkejoAdresas = rk ? rk.adresas : ""; }
    }
    if (p[0] === "b" && S.rengiamas.blokai[+p[1]]) {
      var b = S.rengiamas.blokai[+p[1]];
      /* Pakeitus laikotarpio mėnesį, iš šaltinio gautos to mėnesio reikšmės nebetinka; ranka įrašytos lieka. */
      if (p[2] === "pradzia" && pakito) b.eilutes.forEach(function (e) { if (e.prS === "osp") { e.pr = null; e.prS = ""; } });
      if (p[2] === "pabaiga" && pakito) b.eilutes.forEach(function (e) { if (e.pbS === "osp") { e.pb = null; e.pbS = ""; } });
      if (p[2] === "e" && p[4] === "indeksas") {
        var e = b.eilutes[+p[3]], k = I && Object.prototype.hasOwnProperty.call(I.KATALOGAS, v) ? I.KATALOGAS[v] : null;
        e.pav = k ? k.pav : ""; e.saltinis = ""; e.pr = e.pb = null; e.prS = e.pbS = "";
      }
      if (p[2] === "e" && p[4] === "slenksciui" && v) b.eilutes.forEach(function (x, i) { if (i !== +p[3]) x.slenksciui = false; });
    }
  }

  /* ---------- pradžia: sutarties paieška, pradėtos sutartys ---------- */
  function pjOrganizacijos() {
    var O = global.GP_ORG;
    return O ? O.ORGANIZACIJOS.filter(function (o) { return o.rezimasTiketinas === "PI" && /^\d{7,9}$/.test(o.jarKodas || ""); }) : [];
  }
  function orgIrasas(id) { var O = global.GP_ORG; return O ? O.pagalId(id) : null; }
  function paieskaYra() { var V = global.GP_VIESOS_SUTARTYS; return !!(V && V.sarasas && global.GP_BUSENA && pjOrganizacijos().length); }
  /* Tekstas su pažymėtais rastais žodžiais (žymima pagal vietas originaliame tekste; viskas ekranuojama) */
  function zymek(t, zodziai) {
    t = String(t == null ? "" : t);
    var v = zodziai && zodziai.length ? G.zymiuVietos(t, zodziai) : [], h = "", i = 0;
    v.forEach(function (x) { h += esc(t.slice(i, x[0])) + "<mark>" + esc(t.slice(x[0], x[1])) + "</mark>"; i = x[1]; });
    return h + esc(t.slice(i));
  }
  /* Pradėta sutartis - pagal numerį ir, kai abu žinomi, kitos Šalies kodą bei sudarymo datą: LITGRID sąraše numeriai kartojasi */
  /* Pirkimo vykdytojų pavadinimai susitarime - su kabutėmis, kaip jų sutartyse */
  var TEISINIS = { "amber-grid": "AB „Amber Grid“", "energy-cells": "UAB „Energy cells“", "epso-g": "UAB „EPSO-G“" };
  function pradeta(x) {
    if (!x || !x.nr) return null;
    var kod = x.tiekejas && x.tiekejas.kodas;
    return B.visos.filter(function (v) {
      var s = v.sutartis;
      return s.nr === x.nr && (!kod || !s.tiekejoKodas || s.tiekejoKodas === kod) && (!x.sudaryta || !s.data || s.data === x.sudaryta);
    })[0] || null;
  }
  var BUSENU_T = { galioja: "Galioja", baigiasi: "Baigiasi", baigesi: "Galiojimas baigėsi", nezinoma: "Galiojimo data nepaskelbta" };
  function rezEilute(r, i, zod) {
    var x = r.x, bs = G.viesosBusena(x, siandien()), pr = pradeta(x), n = x.pakeitimai.filter(function (p) { return !p.bendras; }).length;
    var bz = bs.kodas === "baigiasi" ? (bs.liko === 0 ? "Galioja iki šiandien" : "Baigiasi po " + bs.liko + " d. (" + x.galiojaV + ")") : bs.kodas === "galioja" ? "Galioja iki " + x.galiojaV
      : bs.kodas === "baigesi" ? "Paskelbta galiojimo pabaiga - " + x.galiojaV : BUSENU_T.nezinoma;
    var kitur = r.kur.filter(function (k) { return k !== "pav"; }).map(function (k) { return { tiekejas: "tiekėjas", nr: "numeris", pirkimoNr: "pirkimo numeris" }[k]; }).filter(Boolean);
    return '<li class="ps-rz-el"><button type="button" class="ps-rz" data-veiksmas="psPasirink" data-i="' + i + '">' +
      '<span class="ps-rz-k"><span class="ps-rz-p">' + (x.pav ? zymek(x.pav, zod) : "Sutartis be pavadinimo") + "</span>" +
      '<span class="ps-rz-d">' + [x.nr ? "Nr. " + zymek(x.nr, zod) : "", x.tiekejas ? zymek(x.tiekejas.pav, zod) : x.tiekejasNerodomas ? "kita Šalis viešuose duomenyse neatskleista" : "", x.sudaryta ? "sudaryta " + esc(x.sudaryta) : ""].filter(Boolean).join(' <span aria-hidden="true">·</span> ') + "</span>" +
      '<span class="ps-zymos"><span class="ps-zyme ps-zyme--' + (bs.kodas === "galioja" ? "ok" : bs.kodas === "baigiasi" ? "reng" : "pilka") + '">' + esc(bz) + "</span>" +
      (n ? '<span class="ps-zyme">paskelbtų pakeitimų: ' + n + "</span>" : "") + (pr ? '<span class="ps-zyme ps-zyme--pagr">jau pradėta šioje naršyklėje</span>' : "") +
      (kitur.length && zod.length ? '<span class="ps-zyme ps-zyme--tyli">rasta pagal: ' + esc(kitur.join(", ")) + "</span>" : "") + "</span></span>" +
      '<span class="ps-rz-s"><span class="ps-rz-v">' + (x.verte != null ? esc(G.eur(x.verte)) + " Eur" : "vertė nepaskelbta") + '</span><span class="ps-rz-vp">' + (x.verte != null ? "paskelbta vertė" : "") + "</span>" +
      '<span class="ps-rz-t">' + (pr ? "Tęsti" : "Pasirinkti") + " " + IKONOS.rodykle + "</span></span></button></li>";
  }
  function rezHtml() {
    var d = P.sar[P.org];
    if (!d) return "";
    var R = G.ieskok(d.sutartys, P.q, { kur: P.kur, busena: P.busena, dabar: siandien() }), sk = R.skaiciai, V = global.GP_VIESOS_SUTARTYS;
    P.rasta = R.rasta;
    var rodoma = R.rasta.slice(0, P.rodoma), org = orgIrasas(P.org), h = "";
    var kada = d.meta && d.meta.atnaujinta && V ? V.atnaujinta(d.meta.atnaujinta, "lt") : "";
    h += '<div class="ps-rez-g"><p class="ps-rez-sk" id="psRezSk" role="status">' + (R.zodziai.length ? "Rasta: <b>" + sk.visos + "</b> iš " + d.sutartys.length : "<b>" + d.sutartys.length + "</b> " + forma(d.sutartys.length, "paskelbta sutartis", "paskelbtos sutartys", "paskelbtų sutarčių")) +
      (org ? " · " + esc(org.pavadinimas) : "") + "</p>" +
      '<div class="ps-seg" role="group" aria-label="Rodyti pagal galiojimą">' + [["visos", "Visos", sk.visos], ["galioja", "Galiojančios", sk.galioja], ["baigesi", "Pasibaigusios", sk.baigesi]].map(function (b) {
        return '<button type="button" class="ps-seg-m" data-veiksmas="psBusena" data-b="' + b[0] + '" aria-pressed="' + (P.busena === b[0]) + '">' + b[1] + ' <span class="ps-seg-n">' + b[2] + "</span></button>";
      }).join("") + "</div></div>";
    if (!R.rasta.length) {
      h += '<div class="ps-nerasta"><p><b>' + (sk.visos ? "Pagal šį filtrą sutarčių nėra." : "Tokios sutarties tarp paskelbtų nerasta.") + "</b> " +
        (sk.visos ? "Pasirinkite „Visos“." : (P.kur && P.kur !== "visur" ? "Ieškota tik lauke „" + ({ pav: "Pavadinime", tiekejas: "Tiekėjas", nr: "Numeris" }[P.kur] || P.kur) + "“ - pasirinkite „Visur“ arba " : "Pabandykite ") + "trumpesnį žodį (pvz., tik objekto pavadinimą). Viešuose duomenyse yra tik paskelbtos rašytinės sutartys.") + "</p>" +
        '<button type="button" class="ps-btn" data-veiksmas="psNauja">Įrašyti sutartį ranka</button></div>';
    } else {
      h += '<ul class="ps-rz-sar">' + rodoma.map(function (r, i) { return rezEilute(r, i, R.zodziai); }).join("") + "</ul>";
      if (R.rasta.length > rodoma.length) h += '<div class="ps-rez-d"><button type="button" class="ps-btn" data-veiksmas="psDaugiau">Rodyti daugiau (liko ' + (R.rasta.length - rodoma.length) + ")</button></div>";
    }
    h += '<p class="ps-uz ps-rez-salt">' + (V ? esc(V.saltiniuTekstas(["vda"], "lt")) : "") + (kada ? " Sąrašas atnaujintas " + esc(kada) + "." : "") + " Galiojimas rodomas pagal paskelbtą datą - pratęsta sutartis gali būti tarp pasibaigusių." + (d.apribota ? " Rodomos tik naujausios sutartys - sąrašas apribotas." : "") +
      (d.meta && d.meta.klaida ? " Naujesnio sąrašo gauti nepavyko - rodomas ankstesnis." : "") + "</p>";
    return h;
  }
  function pieskRez() {
    var v = $("psRez");
    if (!v) return;
    v.innerHTML = rezHtml();
    var k = $("psKaip"); if (k) k.hidden = !!P.sar[P.org];
    doc.querySelectorAll('[data-veiksmas="psKur"]').forEach(function (m) { m.setAttribute("aria-pressed", String(m.getAttribute("data-kur") === P.kur)); });
  }
  /* Sąrašas gaunamas vieną kartą organizacijai (tik atmintyje); nepavykus - klaida su „Bandyti dar kartą“, niekada „sutarčių nėra“ */
  var SARASO_T = { neidiegta: "Sutarčių paieška G-Procure serveryje dar neįdiegta - sutarties duomenis įrašykite ranka.", rysys: "G-Procure serveris nepasiekiamas. Bandykite dar kartą arba įrašykite sutartį ranka.",
    saltinis: "Viešų sutarčių duomenų šaltinis šiuo metu neatsako. Bandykite vėliau arba įrašykite sutartį ranka.", parametrai: "Šiai organizacijai sutarčių sąrašo gauti negalima.",
    uzimta: "Per daug užklausų - palaukite minutę ir bandykite dar kartą.", ruosiama: "Serveris dar renka sutarčių sąrašą - pabandykite po minutės." };
  function gaukSarasa(o) {
    var V = global.GP_VIESOS_SUTARTYS, org = P.org, oi = orgIrasas(org), sel = "#psIeskaBusena";
    if (P.sar[org]) { pieskRez(); return Promise.resolve({ ok: true }); }
    if (!paieskaYra() || !oi) return Promise.resolve(null);
    if (P.kraunama === org) return Promise.resolve(null);
    P.kraunama = org;
    return global.GP_BUSENA.vykdyk(sel, { tekstas: "Gaunamas viešai paskelbtų " + oi.pavadinimas + " sutarčių sąrašas...", atsaukiama: true, kartoti: function () { return gaukSarasa(o); },
      veiksmas: function (signal, h) {
        return V.sarasas(oi.jarKodas, { signal: signal, fetch: (o && o.fetch) || P.fetch || undefined, lauktiMs: o && o.lauktiMs,
          eiga: function () { if (h && h.atnaujink) h.atnaujink("Serveris renka sutarčių sąrašą iš viešo šaltinio - pirmą kartą tai gali užtrukti iki poros minučių..."); } }).then(function (r) {
          if (r && r.rusis === "atsaukta") throw Object.assign(new Error("Aborted"), { name: "AbortError" });
          if (!r || !r.ok) throw new Error(SARASO_T[r && r.rusis] || SARASO_T.rysys);
          return r;
        });
      } }).then(function (rez) {
      if (P.kraunama === org) P.kraunama = "";
      if (!rez || !rez.ok) return rez;
      var r = rez.reiksme;
      P.sar[org] = { sutartys: G.viesasSarasas(r.sutartys), viso: r.viso, apribota: r.apribota, meta: r.meta };
      if (!S && P.org === org) pieskRez();
      return rez;
    });
  }
  function ieskokDabar(o) {
    var q = $("psQ"); if (q) P.q = q.value;
    P.ieskota = true; P.rodoma = 12;
    return gaukSarasa(o).then(function (r) { if (P.sar[P.org]) pieskRez(); return r; });
  }
  function pasirink(x) {
    var pr = pradeta(x);
    if (pr) { atverk(pr.id); return; }
    var oi = orgIrasas(P.org), O = global.GP_ORG, rk = O ? O.rekvizitai(P.org) : null;
    S = G.naujaSutartis(naujasId());
    if (oi) { S.sutartis.vykdytojas = oi.id; S.sutartis.pirkejoPav = TEISINIS[oi.id] || oi.pavadinimas; S.sutartis.pirkejoKodas = rk ? rk.kodas : (oi.jarKodas || ""); S.sutartis.pirkejoAdresas = rk ? rk.adresas : ""; }
    var r = G.isSaraso(S, x, { dabar: siandien() });
    PASIRINKTA = r && r.ok ? { pildyta: r.pildyta, pakeitimu: r.pakeitimu, kelios: !!r.keliosSutartys, abejotini: r.abejotini || [] } : null;
    ZING = 1; TVIRTINA = ""; B.visos.unshift(S); rasyk();
    piesk("#psKortele"); global.scrollTo(0, 0);
  }
  function pradetuHtml() {
    var dsn = siandien(), h = "", arti = G.artimiausi(B.visos, dsn);
    if (!B.visos.length && !arti.length) return "";
    h += '<section class="ps-card ps-pradetos" aria-labelledby="psSarH"><div class="ps-eil"><h2 id="psSarH">Jūsų sutartys šioje naršyklėje</h2><span class="ps-uz">Tęskite ten, kur baigėte - niekas niekur nesiunčiama.</span></div>';
    if (arti.length) h += '<div class="ps-arti" role="group" aria-labelledby="psArtiH"><h3 id="psArtiH" class="ps-h4">Artimiausi darbai</h3><ul>' + arti.map(function (x) {
      return '<li class="ps-arti-el' + (x.veluoja ? " ps-arti-el--vel" : "") + '"><span class="ps-arti-d">' + esc(x.iki) + (x.veluoja ? " · vėluojama " + (-x.liko) + " d." : x.liko === 0 ? " · šiandien" : " · liko " + x.liko + " d.") + "</span>" +
        '<span class="ps-arti-t">Sutartis ' + esc(x.sutartis) + ": " + esc(x.tekstas) + "</span>" +
        (x.ai >= 0 ? '<button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psAtlikta" data-id="' + esc(x.id) + '" data-a="' + x.ai + '" data-p="' + x.pi + '" aria-label="Atlikta: ' + esc(x.tekstas) + '">Atlikta</button>' : "") + "</li>";
    }).join("") + '</ul><p class="ps-uz">Priminimai sudaromi iš pasirašytų susitarimų terminų („Kas toliau“) ir Sutarties galiojimo pabaigos. Jie saugomi tik šioje naršyklėje.</p></div>';
    h += '<ul class="ps-sar">' + B.visos.map(function (x) {
      var s = x.sutartis, n = x.ankstesni.length, bl = x.rengiamas.blokai.length;
      return '<li class="ps-sar-el"><button type="button" class="ps-sut" data-veiksmas="psAtverk" data-id="' + esc(x.id) + '"><span class="ps-sut-p">' + esc(s.pavadinimasKilm ? s.pavadinimasKilm.replace(/sutarties$/i, "sutartis") : (s.viesaPav || "Sutartis be pavadinimo")) + "</span>" +
        '<span class="ps-sut-d">' + esc([s.nr ? "Nr. " + s.nr : "", s.tiekejoPav].filter(Boolean).join(" · ") || "duomenys dar neįrašyti") + "</span>" +
        '<span class="ps-zymos"><span class="ps-zyme">' + n + " " + forma(n, "pakeitimas", "pakeitimai", "pakeitimų") + "</span>" + apzZymos(x, dsn) + (bl ? '<span class="ps-zyme ps-zyme--reng">Rengiamas susitarimas Nr. ' + esc(x.rengiamas.nr || "?") + "</span>" : "") + "</span></button>" +
        '<div class="ps-sar-v"><button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psEksportas" data-id="' + esc(x.id) + '">Atsisiųsti kopiją</button>' +
        (TVIRTINA === "trinti:" + x.id ? '<span class="ps-tvirt" role="group" aria-label="Patvirtinimas">Ištrinti šią sutartį ir jos pakeitimų sąrašą? <button type="button" class="ps-btn ps-btn--maz ps-btn--pav" data-veiksmas="psTrinkTikrai" data-id="' + esc(x.id) + '">Ištrinti</button> <button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psAtsaukTvirtinima">Atšaukti</button></span>'
          : '<button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psTrink" data-id="' + esc(x.id) + '">Ištrinti</button>') + "</div></li>";
    }).join("") + "</ul>";
    return h + "</section>";
  }
  function sarasoHtml() {
    var yra = paieskaYra(), orgs = pjOrganizacijos(), V = global.GP_VIESOS_SUTARTYS, h = "";
    if (B.nezinoma) h += '<p class="ps-pastaba ps-pastaba--klaida" role="alert">' + esc(B.nezinoma) + "</p>";
    h += '<section class="ps-hero" aria-labelledby="psHeroH"><div class="ps-hero-v"><p class="ps-hero-z">Susitarimo dėl sutarties pakeitimo projektas</p>' +
      '<h2 id="psHeroH">Kurią sutartį reikia keisti?</h2>' +
      '<p class="ps-hero-p">' + (yra ? "Įrašykite pirkimo objekto pavadinimo žodį - įrankis suras sutartį tarp viešai paskelbtų ir pats užpildys numerį, datas, kitą Šalį ir jau paskelbtus pakeitimus."
        : "Įrašykite sutarties duomenis ir pasirinkite, ką norite pakeisti - gausite susitarimo projektą su skaičiavimu ir pagrindimu.") + "</p></div>";
    if (yra) {
      h += '<div class="ps-ieska" role="search" aria-label="Sutarties paieška"><div class="ps-ieska-e"><span class="ps-ieska-i">' + IKONOS.lupa + "</span>" +
        '<input type="search" id="psQ" class="ps-ieska-l" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="pvz., Neries TP" value="' + esc(P.q) + '" aria-label="Pirkimo objekto pavadinimo žodis, tiekėjas arba sutarties numeris" aria-describedby="psIeskaUz" data-veiksmas-input="psIeskaRaso" data-veiksmas-keydown="psIeskaKlav">' +
        '<button type="button" class="ps-btn ps-btn--pagr ps-ieska-m" data-veiksmas="psIeskok">Ieškoti</button></div>' +
        '<div class="ps-ieska-f"><span class="ps-ieska-fp" id="psKurP">Ieškoti:</span><div class="ps-seg" role="group" aria-labelledby="psKurP">' + KUR.map(function (k) {
          return '<button type="button" class="ps-seg-m" data-veiksmas="psKur" data-kur="' + k[0] + '" aria-pressed="' + (P.kur === k[0]) + '">' + k[1] + "</button>"; }).join("") + "</div>" +
        (orgs.length > 1 ? '<label class="ps-org" for="psOrg">Pirkimo vykdytojas</label><select id="psOrg" class="ps-org-s" data-veiksmas-change="psOrg">' + orgs.map(function (o) { return '<option value="' + esc(o.id) + '"' + (o.id === P.org ? " selected" : "") + ">" + esc(o.pavadinimas) + "</option>"; }).join("") + "</select>" : "") +
        '<button type="button" class="ps-nuor ps-ieska-visos" data-veiksmas="psVisos">Rodyti visas sutartis</button></div>' +
        '<p class="ps-uz" id="psIeskaUz">' + esc(V.siunciama("sarasas", "lt")) + "</p></div>" +
        '<div id="psIeskaBusena" class="ps-busena" hidden></div><div id="psRez">' + rezHtml() + "</div>";
    }
    h += "</section>";
    h += pradetuHtml();
    h += '<section class="ps-kaip" id="psKaip" aria-labelledby="psKaipH"' + (P.sar[P.org] ? " hidden" : "") + '><h2 id="psKaipH" class="ps-sr">Kaip tai veikia</h2><ol class="ps-kaip-s">' +
      [[IKONOS.sutartis, "Raskite sutartį", "Pagal pavadinimo žodį, tiekėją ar numerį. Sutarties duomenys ir paskelbti pakeitimai užpildomi iš viešų CVP IS duomenų."],
        [IKONOS.keisti, "Pasirinkite, ką keisti", "Kainos perskaičiavimas pagal indeksą, papildomi ar atsisakomi darbai, terminas, subtiekėjai, atsakingi asmenys. Įrankis patikrina Pirkimų įstatymo ribas."],
        [IKONOS.dokumentas, "Gaukite dokumentus", "Susitarimo projektas, skaičiavimas ir pagrindimas Word formatu - belieka suderinti ir pasirašyti."]].map(function (z, i) {
        return '<li class="ps-kaip-z"><span class="ps-kaip-i">' + z[0] + '</span><span class="ps-kaip-n">' + (i + 1) + ' žingsnis</span><h3 class="ps-kaip-p">' + z[1] + '</h3><p class="ps-kaip-t">' + z[2] + "</p></li>"; }).join("") + "</ol></section>";
    h += '<div class="ps-kita"><span class="ps-kita-t">' + (yra ? "Sutartis nepaskelbta arba norite pildyti patys?" : "Pradėkite nuo sutarties duomenų.") + '</span><div class="ps-mygt">' +
      '<button type="button" class="ps-btn' + (yra ? "" : " ps-btn--pagr") + '" data-veiksmas="psNauja">' + (yra ? "Įrašyti sutartį ranka" : "Nauja sutartis") + "</button>" +
      '<button type="button" class="ps-btn" data-veiksmas="psImportas">Įkelti iš failo</button><input type="file" id="psFailas" accept=".json,application/json" hidden data-veiksmas-change="psFailas"></div></div>';
    return h;
  }

  function apzZymos(x, dsn) {
    var A = G.apzvalga(x, dsn), h = "";
    if (A.nuoPradines != null && Math.abs(A.nuoPradines) >= 0.005) h += '<span class="ps-zyme">kaina ' + (A.nuoPradines > 0 ? "+" : "") + esc(G.proc(A.nuoPradines)) + " % nuo pradinės</span>";
    if (A.d2Proc != null && A.d2Riba) h += '<span class="ps-zyme' + (A.d2Proc > A.d2Riba * 0.8 ? " ps-zyme--reng" : "") + '">nedidelės vertės pakeitimai - ' + esc(G.proc(A.d2Proc)) + " % iš " + A.d2Riba + " %</span>";
    if (A.galiojaIki) h += '<span class="ps-zyme' + (A.baigiasi || A.pasibaige ? " ps-zyme--reng" : "") + '">' + (A.pasibaige ? "galiojimas baigėsi " : "galioja iki ") + esc(A.galiojaIki) + "</span>";
    if (A.priminimai.length) h += '<span class="ps-zyme">priminimų: ' + A.priminimai.length + "</span>";
    return h;
  }
  /* ---------- sutarties kortelė (viršuje) ---------- */
  function korteleHtml() {
    var s = S.sutartis, R = G.rezultatas(S), n = S.ankstesni.length;
    function pl(pav, v, klase) { return '<div class="ps-pl' + (klase ? " " + klase : "") + '"><span class="ps-pl-p">' + esc(pav) + '</span><span class="ps-pl-v">' + v + "</span></div>"; }
    var po = R.keiciasi ? (R.nevykdyta && !R.delta ? "neperskaičiuojama" : R.galutine != null ? esc(G.eur(R.galutine)) + " Eur" : "neapskaičiuota") : "nesikeičia";
    return '<div class="ps-k-virsus"><div><p class="ps-k-pav">' + esc(s.pavadinimasKilm ? s.pavadinimasKilm.replace(/sutarties$/i, "sutartis") : (s.viesaPav || "Nauja sutartis")) + "</p>" +
      '<p class="ps-k-sub">' + esc([s.nr ? "Nr. " + s.nr : "", s.tiekejoPav, s.galiojaIki ? "galioja iki " + s.galiojaIki : ""].filter(Boolean).join(" · ") || "Įrašykite sutarties duomenis 1 žingsnyje") + "</p></div>" +
      (s.gauta ? '<span class="ps-zyme ps-zyme--ok">Papildyta iš CVP IS duomenų ' + esc(s.gauta) + "</span>" : "") + "</div>" +
      '<div class="ps-pls">' + pl("Pradinė kaina be PVM", R.pradine != null ? esc(G.eur(R.pradine)) + " Eur" : "neįrašyta") + pl("Kaina iki šio pakeitimo", R.sena != null ? esc(G.eur(R.sena)) + " Eur" : "neįrašyta") +
      pl("Kaina po šio pakeitimo", po, R.keiciasi ? (R.nevykdyta && !R.delta ? "ps-pl--ne" : "ps-pl--nauja") : "") + pl("Pokytis nuo pradinės kainos", R.nuoPradines != null ? esc(G.proc(R.nuoPradines)) + " %" : "-") + "</div>" +
      '<div class="ps-eiga"><span class="ps-eiga-p">Pakeitimų eiga</span>' + (n ? S.ankstesni.map(function (a) { return '<span class="ps-zyme">' + esc("Nr. " + (a.nr || "?") + (a.data ? " · " + a.data : "") + (a.esme ? " · " + a.esme : "")) + "</span>"; }).join("") : '<span class="ps-eiga-n">ankstesnių pakeitimų sąraše nėra</span>') +
      '<span class="ps-zyme ps-zyme--reng">Nr. ' + esc(S.rengiamas.nr || "?") + " · rengiamas</span></div>";
  }

  /* ---------- 1 žingsnis ---------- */
  /* Išskleidžiama 1 žingsnio dalis: būsena įsimenama (ATVERTA), kad perpiešus formą ji nesusiskleistų rašant */
  function dalis(raktas, pav, santrauka, vidus, atvertaNumatyta) {
    var atv = Object.prototype.hasOwnProperty.call(ATVERTA, raktas) ? ATVERTA[raktas] : atvertaNumatyta;
    return '<details class="ps-dalis" data-dalis="' + raktas + '" data-veiksmas-toggle="psDalis"' + (atv ? " open" : "") + '><summary><span class="ps-dalis-p">' + esc(pav) + "</span>" +
      (santrauka ? '<span class="ps-dalis-s">' + esc(santrauka) + "</span>" : "") + "</summary>" + '<div class="ps-dalis-v">' + vidus + "</div></details>";
  }
  function z1Html() {
    var s = S.sutartis, F = G.forma(s), O = global.GP_ORG, V = global.GP_VIESOS_SUTARTYS;
    var orgs = [["", "- kita įmonė -"]];
    if (O) O.ORGANIZACIJOS.forEach(function (o) { if (o.rezimasTiketinas === "PI") orgs.push([o.id, o.pavadinimas]); });
    var formos = [["", "- pasirinkite -"]].concat(Object.keys(G.FORMOS).map(function (k) { return [k, G.FORMOS[k].pav]; }));
    var d = G.dabartine(S), h = "", tr = G.trukstaSutarciai(S), isViesu = !!s.gauta;
    var OBJ_T = { darbai: "darbai", prekes: "prekės", paslaugos: "paslaugos" };
    /* pasiūlymai prie laukų - reikšmę įrašo tik žmogaus paspaudimas */
    var sf = !s.forma ? G.siulomaForma(s.viesaPav || s.pavadinimasKilm, G.objektas(s) || G.objektasIsBvpz(s.bvpz)) : "";
    var formosPo = sf ? '<p class="ps-greita">Pagal pavadinimą ir objektą siūloma: <b>' + esc(G.FORMOS[sf].pav) + '</b>. <button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psForma" data-f="' + sf + '">Pasirinkti</button></p>' : "";
    var tarifas = G.pvmTarifas(), bePvm = s.viesaVerte != null && tarifas != null ? G.r2(s.viesaVerte / (1 + tarifas)) : null;
    var suPvm = G.tiketinaSuPvm(s.viesaVerte);
    var vertesPo = s.pradineVerte == null && s.viesaVerte != null ? '<p class="ps-greita">CVP IS paskelbta vertė - <b>' + esc(G.eur(s.viesaVerte)) + ' Eur</b>. ' +
      (suPvm ? "Tikėtina, kad ji su PVM (atėmus PVM gaunama apvali suma) - pasirinkite:" : "Ji gali būti su PVM arba be jo - pasirinkite:") +
      ' <button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psVerte" data-kaip="kaip">Tai kaina be PVM</button>' +
      (bePvm != null ? ' <button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psVerte" data-kaip="bepvm">Tai kaina su PVM (be PVM - ' + esc(G.eur(bePvm)) + " Eur)</button>" : "") + "</p>" : "";

    h += '<section class="ps-card" aria-labelledby="psZ1a"><h2 id="psZ1a">Sutartis</h2>';
    if (PASIRINKTA) h += '<p class="ps-pastaba ps-pastaba--ok" role="status"><b>Sutarties duomenys užpildyti iš viešų CVP IS duomenų.</b> ' +
      (PASIRINKTA.pildyta.length ? "Užpildyta: " + esc(PASIRINKTA.pildyta.join(", ")) + ". " : "") +
      (PASIRINKTA.pakeitimu ? "Į sąrašą įtraukta paskelbtų pakeitimų: " + PASIRINKTA.pakeitimu + ". " : "Paskelbtų pakeitimų nerasta. ") +
      (PASIRINKTA.kelios ? "Šis pirkimas turi kelias sutartis - patikrinkite, ar visi pakeitimai priklauso šiai. " : "") + "Patikrinkite ir įrašykite, ko trūksta.</p>";
    var abej = PASIRINKTA ? PASIRINKTA.abejotini.filter(function (p) { return !S.ankstesni.some(function (a) { return a.regNr === p.nr; }); }) : [];
    if (abej.length) h += '<div class="ps-pastaba" role="group" aria-labelledby="psAbejH"><p id="psAbejH"><b>Šie paskelbti pakeitimai priskirti kelioms to paties pirkimo sutartims</b> - viešuose duomenyse nenurodyta, kurios. Pridėkite tik šios Sutarties pakeitimus (patikrinkite pagal pakeitimo dokumentą):</p><ul class="ps-abej">' +
      abej.map(function (p) { return "<li>" + esc(p.nr) + (p.sudaryta ? ", " + esc(p.sudaryta) : "") + (p.verte != null ? ", vertė po pakeitimo " + esc(G.eur(p.verte)) + " Eur" : "") + (p.galioja ? ", galioja iki " + esc(p.galioja) : "") +
        ' <button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psPridekViesa" data-nr="' + esc(p.nr) + '" aria-label="Pridėti ' + esc(p.nr) + ' prie šios Sutarties pakeitimų">Pridėti</button></li>'; }).join("") + "</ul></div>";
    h += tr.length ? '<div class="ps-truksta" role="group" aria-labelledby="psTrP"><span class="ps-truksta-p" id="psTrP">Liko įrašyti (' + tr.length + "):</span>" + tr.map(function (x) {
        return '<button type="button" class="ps-truksta-m" data-veiksmas="psEik" data-laukas="' + esc(x.k) + '">' + esc(x.pav) + "</button>"; }).join("") + "</div>"
      : '<p class="ps-truksta ps-truksta--ok" role="status">Pagrindiniai sutarties duomenys įrašyti - galite pereiti prie pakeitimų.</p>';
    h += '<div class="ps-rasti">' + lauk({ k: "s.nr", pav: "Sutarties numeris", v: s.nr, pvz: "pvz., 25VP-SUT-000", privalomas: true }) +
      (V && V.sutartis ? '<button type="button" class="ps-btn" data-veiksmas="psRask">Rasti CVP IS duomenyse</button>' : "") + "</div>" +
      (V && V.sutartis ? '<p class="ps-uz">Paspaudus į G-Procure serverį siunčiamas tik sutarties numeris ir pirkimo vykdytojo kodas; atsakymas - vieši CVP IS sutarčių duomenys. Jau įrašyti laukai neperrašomi.</p>' : "") +
      '<div id="psRastiBusena" class="ps-busena" hidden></div><div class="ps-tink">' +
      lauk({ k: "s.data", pav: "Sutarties sudarymo data", tipas: "data", v: s.data, privalomas: true }) +
      lauk({ k: "s.forma", pav: "Sutarties forma", v: s.forma, parinktys: formos, perpiesk: true, privalomas: true, uz: "Pagal formą įrankis pasiūlo Sutarties punktus ir kainos peržiūros taisyklę. Juos galima pakeisti.", po: formosPo }) +
      lauk({ k: "s.pavadinimasKilm", pav: "Sutarties pavadinimas kilmininku", v: s.pavadinimasKilm, eil: 2, klase: "ps-lauk--plati", privalomas: true, pvz: "pvz., 110 kV skirstyklos rekonstravimo darbų pirkimo sutarties",
        uz: (s.pavS === "cvpis" ? "Pasiūlyta pagal CVP IS pavadinimą - patikrinkite linksnį. " : "Kaip sutarties antraštėje, kilmininku, pabaigoje - „sutarties“. ") + (s.viesaPav ? "CVP IS duomenyse: „" + s.viesaPav + "“." : "") }) +
      lauk({ k: "s.pradineVerte", pav: "Pradinė Sutarties kaina, Eur be PVM", tipas: "suma", v: s.pradineVerte, privalomas: true, pvz: "pvz., 3 600 000,00",
        uz: s.pradineVerte != null && s.viesaVerte != null ? "CVP IS duomenyse nurodyta vertė - " + G.eur(s.viesaVerte) + " Eur (gali būti su PVM - patikrinkite)." : "", po: vertesPo }) +
      lauk({ k: "s.dabartineVerte", pav: "Kaina iki šio pakeitimo, Eur be PVM", tipas: "suma", v: s.dabartineVerte, pvz: d != null ? "pagal sąrašą: " + G.eur(d) : " ", uz: "Su visais ankstesniais pakeitimais. Neįrašius skaičiuojama iš pradinės kainos ir pakeitimų sąrašo." }) + "</div>";
    h += dalis("kiti", "Datos, objektas ir pirkimo rūšis", [s.galiojaIki ? "galioja iki " + s.galiojaIki : "", G.objektas(s) ? OBJ_T[G.objektas(s)] : "", { tarptautinis: "tarptautinis pirkimas", supaprastintas: "supaprastintas pirkimas", mazos: "mažos vertės pirkimas" }[s.pirkimoRusis] || ""].filter(Boolean).join(" · ") || "neįrašyta",
      '<div class="ps-tink">' +
      lauk({ k: "s.pasiulymuData", pav: "Pasiūlymų pateikimo termino pabaiga", tipas: "data", v: s.pasiulymuData, uz: "Nuo jos rangos ir eksploatavimo sutartyse skaičiuojamas pirmo kainos perskaičiavimo laikotarpis." }) +
      lauk({ k: "s.isigaliojo", pav: "Sutarties įsigaliojimo data", tipas: "data", v: s.isigaliojo, uz: "Nuo jos prekių ir paslaugų sutartyse skaičiuojami 6 mėn. iki pirmo kreipimosi dėl kainos perskaičiavimo." }) +
      lauk({ k: "s.galiojaIki", pav: "Sutartis galioja iki", tipas: "data", v: s.galiojaIki }) +
      lauk({ k: "s.objektas", pav: "Sutarties objektas", v: s.objektas, perpiesk: true, parinktys: [["", G.objektas({ forma: s.forma }) ? "pagal formą - " + OBJ_T[G.objektas({ forma: s.forma })] : "- pasirinkite -"], ["darbai", "Darbai"], ["prekes", "Prekės"], ["paslaugos", "Paslaugos"]],
        uz: "Nuo jo priklauso pakeitimų vertės ribos (prekėms ir paslaugoms - 10, darbams - 15 procentų)." + (s.bvpz && s.objektas && s.objektas === G.objektasIsBvpz(s.bvpz) ? " Įrašyta pagal paskelbtą BVPŽ kodą " + s.bvpz + "." : "") }) +
      lauk({ k: "s.pirkimoRusis", pav: "Koks buvo pirkimas", v: s.pirkimoRusis, parinktys: [["", "- nepasirinkta -"], ["tarptautinis", "Tarptautinis"], ["supaprastintas", "Supaprastintas"], ["mazos", "Mažos vertės"]],
        uz: "Pakeitimais negalima peržengti pirkimo rūšies ribos; po tarptautinio pirkimo kai kuriuos pakeitimus reikia paskelbti per 3 darbo dienas." }) + "</div>", !isViesu) + "</section>";
    h += '<section class="ps-card" aria-labelledby="psZ1b"><h2 id="psZ1b">Šalys</h2>' +
      dalis("salys", "Šalių duomenys", [s.pirkejoPav, s.tiekejoPav].filter(Boolean).join(" ir ") || "neįrašyta", '<div class="ps-tink">' +
      lauk({ k: "s.vykdytojas", pav: "Pirkimo vykdytojas", v: s.vykdytojas, parinktys: orgs, perpiesk: true }) +
      lauk({ k: "s.pirkejoPav", pav: "Pirkimo vykdytojo pavadinimas", v: s.pirkejoPav, privalomas: true }) +
      lauk({ k: "s.pirkejoKodas", pav: "Juridinio asmens kodas", v: s.pirkejoKodas }) +
      lauk({ k: "s.pirkejoAdresas", pav: "Buveinė", v: s.pirkejoAdresas, klase: "ps-lauk--plati" }) +
      lauk({ k: "s.tiekejoPav", pav: "Kitos Šalies pavadinimas", v: s.tiekejoPav, privalomas: true, pvz: "pvz., UAB „Pavyzdys“" }) +
      lauk({ k: "s.tiekejoKodas", pav: "Kitos Šalies juridinio asmens kodas", v: s.tiekejoKodas }) +
      lauk({ k: "s.tiekejoAdresas", pav: "Kitos Šalies buveinė", v: s.tiekejoAdresas, klase: "ps-lauk--plati" }) +
      lauk({ k: "s.salisP", pav: "Kaip Sutartyje vadinamas pirkimo vykdytojas", v: s.salisP, pvz: F.pirkejas, uz: "Neįrašius - „" + F.pirkejas + "“." }) +
      lauk({ k: "s.salisT", pav: "Kaip Sutartyje vadinama kita Šalis", v: s.salisT, pvz: F.tiekejas, uz: "Neįrašius - „" + F.tiekejas + "“." }) + "</div>", !isViesu || !s.tiekejoPav) +
      '<p class="ps-uz">Šalių atstovai į susitarimą neįrašomi - juos įrašote pasirašydami.</p></section>';
    h += '<section class="ps-card" aria-labelledby="psZ1c"><div class="ps-eil"><h2 id="psZ1c">Ankstesni Sutarties pakeitimai</h2><button type="button" class="ps-btn" data-veiksmas="psPridekAnkstesni">Pridėti pakeitimą</button></div>' +
      '<p class="ps-uz">Iš šio sąrašo įrankis preambulėje išvardija ankstesnius susitarimus, skaičiuoja kainą iki šio pakeitimo ir tikrina, ar kainos perskaičiavimo laikotarpiai nepersidengia.</p>';
    if (!S.ankstesni.length) h += '<p class="ps-tuscia-eil">Sąrašas tuščias. Jei Sutartis jau buvo keista, pridėkite pakeitimus arba raskite juos CVP IS duomenyse.</p>';
    else {
      var ankstesne = s.viesaVerte, VP = G.viesiPokyciai(S);
      h += S.ankstesni.map(function (a, i) {
        var vz = "", vp = VP.filter(function (x) { return x.i === i; })[0];
        if (a.viesaVerte != null) {
          vz = "CVP IS paskelbta vertė po šio pakeitimo - " + G.eur(a.viesaVerte) + " Eur" + (ankstesne != null ? (Math.abs(a.viesaVerte - ankstesne) < 0.005 ? " (nepasikeitė)" : " (pokytis " + (a.viesaVerte > ankstesne ? "+" : "-") + G.eur(Math.abs(a.viesaVerte - ankstesne)) + " Eur" + (vp && vp.tikPvm ? " - atitinka PVM, tikėtina, kaina nekeista" : "") + ")") : "") + ". Patikrinkite, ar ji be PVM.";
          ankstesne = a.viesaVerte;
        }
        return '<div class="ps-ank" role="group" aria-label="Ankstesnis pakeitimas ' + (i + 1) + '">' + lauk({ k: "a." + i + ".nr", pav: "Eilės Nr.", v: a.nr, klase: "ps-lauk--siaura" }) + lauk({ k: "a." + i + ".data", pav: "Data", tipas: "data", v: a.data }) +
          lauk({ k: "a." + i + ".regNr", pav: "Registracijos Nr.", v: a.regNr }) + lauk({ k: "a." + i + ".esme", pav: "Dėl ko (kilmininku)", v: a.esme, pvz: "pvz., darbų atlikimo termino pratęsimo", klase: "ps-lauk--plati" }) +
          lauk({ k: "a." + i + ".pokytis", pav: "Kainos pokytis, Eur be PVM", tipas: "suma", v: a.pokytis, pvz: "0, jei kaina nekeista", uz: vz }) + lauk({ k: "a." + i + ".indMenuo", pav: "Indekso mėnuo (jei perskaičiuota kaina)", tipas: "menuo", v: a.indMenuo, pvz: "pvz., 2026-03" }) +
          lauk({ k: "a." + i + ".perziura", pav: "Iš jo dėl kainų peržiūros, Eur", tipas: "suma", v: a.perziura, pvz: "jei dalis pokyčio", uz: "Kainų peržiūros dalis - ribos skaičiuojamos nuo patikslintos vertės." }) +
          lauk({ k: "a." + i + ".pagal2d", pav: "Iš jo pagal nedidelės vertės pakeitimų dalį, Eur", tipas: "suma", v: a.pagal2d, pvz: "jei taikyta" }) +
          '<div class="ps-ank-v">' + (a.saltinis === "cvpis" ? '<span class="ps-zyme">iš CVP IS duomenų</span>' : "") +
          (vp && a.pokytis == null && vp.siulomas != null ? '<button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psPokytis" data-i="' + i + '">Įrašyti kainos pokytį: ' + (vp.siulomas > 0 ? "+" : "") + esc(G.eur(vp.siulomas)) + " Eur be PVM</button>" : "") + '<button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psSalinkAnkstesni" data-i="' + i + '" aria-label="Pašalinti ' + (i + 1) + ' pakeitimą iš sąrašo">Pašalinti</button></div></div>';
      }).join("");
    }
    return h + "</section>";
  }

  /* ---------- 2 žingsnis ---------- */
  function dokParinktys() { return [["", "- nenurodyta -"], ["bendrųjų sąlygų", "bendrųjų sąlygų"], ["specialiųjų sąlygų", "specialiųjų sąlygų"]]; }
  function indHtml(b, i) {
    var t = b.taisykle, I = global.GP_OSP_INDEKSAI, K = "b." + i + ".", s = S.sutartis, Pk = G.salisP(s), Tk = G.salisT(s);
    var kat = [["", "Kitas indeksas (reikšmės įrašomos ranka)"]].concat(I ? Object.keys(I.KATALOGAS).map(function (k) { return [k, I.KATALOGAS[k].pav]; }) : []);
    var h = '<div class="ps-tink">' + lauk({ k: K + "dok", pav: "Kainos peržiūra numatyta Sutarties", v: b.dok, parinktys: dokParinktys() }) + lauk({ k: K + "punktas", pav: "punkte (numeris)", v: b.punktas, pvz: "pvz., 7.3", privalomas: true }) + "</div>";
    h += '<details class="ps-tais"><summary>Peržiūros taisyklė pagal Sutartį: <span data-tais="' + i + '">' + esc(taisyklesSantrauka(t)) + '</span></summary><p class="ps-uz">Taisyklė pasiūlyta pagal Sutarties formą. Jei Sutartyje nustatyta kitaip, pakeiskite - skaičiuojama pagal tai, kas įrašyta čia.</p><div class="ps-tink">' +
      lauk({ k: K + "t.slenkstis", pav: "Indekso pokyčio riba, %", tipas: "skaicius", v: t.slenkstis, pvz: "pvz., 5" }) +
      lauk({ k: K + "t.grieztas", pav: "Riba pasiekta, kai pokytis", v: t.grieztas ? "1" : "", parinktys: [["", "ne mažesnis už ribą"], ["1", "didesnis už ribą"]] }) +
      lauk({ k: K + "t.minMen", pav: "Trumpiausias laikotarpis, mėn.", tipas: "sveikas", v: t.minMen, pvz: "pvz., 6" }) +
      lauk({ k: K + "t.pirmamTaikoma", pav: "Trumpiausias laikotarpis taikomas ir pirmam perskaičiavimui", tipas: "bool", v: t.pirmamTaikoma }) +
      lauk({ k: K + "t.formule", pav: "Skaičiavimas", v: t.formule, perpiesk: true, parinktys: [["koef", "koeficientas K = pabaiga / pradžia"], ["proc", "pokytis k procentais (suma + suma x k / 100)"]] }) +
      lauk({ k: K + "t.kTikslumas", pav: t.formule === "proc" ? "k apvalinamas iki skaitmenų po kablelio" : "K apvalinamas iki skaitmenų po kablelio", tipas: "sveikas", v: t.kTikslumas, pvz: "neapvalinama" }) + "</div></details>";
    h += '<div class="ps-tink">' + lauk({ k: K + "pradzia", pav: "Laikotarpio pradžios mėnuo", tipas: "menuo", v: b.pradzia, pvz: "pvz., 2024-10", perpiesk: true, privalomas: true, uz: G.PRADZIOS[t.pradzia] || G.PRADZIOS[""] }) +
      lauk({ k: K + "pabaiga", pav: "Laikotarpio pabaigos mėnuo", tipas: "menuo", v: b.pabaiga, pvz: "pvz., 2026-09", perpiesk: true, privalomas: true, uz: "Mėnuo, kurio indekso reikšmė imama pagal Sutartį (pvz. naujausia paskelbta kreipimosi dieną)." }) +
      lauk({ k: K + "pirmas", pav: "Tai pirmas šios Sutarties kainos perskaičiavimas", tipas: "bool", v: b.pirmas }) + "</div>";
    h += '<div class="ps-ind" role="group" aria-label="Indeksai ir perskaičiuojamos sumos">' + b.eilutes.map(function (e, j) {
      var E = K + "e." + j + ".";
      return '<div class="ps-ind-e">' + lauk({ k: E + "indeksas", pav: "Indeksas", v: e.indeksas, parinktys: kat, perpiesk: true, klase: "ps-lauk--plati" }) +
        (e.indeksas ? "" : lauk({ k: E + "pav", pav: "Indekso pavadinimas", v: e.pav, privalomas: true }) + lauk({ k: E + "saltinis", pav: "Šaltinis", v: e.saltinis, pvz: "pvz., Eurostat" })) +
        lauk({ k: E + "pr", pav: "Reikšmė pradžioje", tipas: "indeksas", v: e.pr, uz: e.prS === "osp" ? "iš Oficialiosios statistikos portalo" : e.pr != null ? "įrašyta ranka" : "" }) +
        lauk({ k: E + "pb", pav: "Reikšmė pabaigoje", tipas: "indeksas", v: e.pb, uz: e.pbS === "osp" ? "iš Oficialiosios statistikos portalo" : e.pb != null ? "įrašyta ranka" : "" }) +
        lauk({ k: E + "slenksciui", pav: "Šio indekso pokytis lyginamas su riba", tipas: "bool", v: e.slenksciui, perpiesk: true }) +
        lauk({ k: E + "suSuma", pav: "Pagal šį indeksą perskaičiuojama suma", tipas: "bool", v: e.suSuma, perpiesk: true }) +
        (e.suSuma ? lauk({ k: E + "suma", pav: "Perskaičiuojama suma, Eur be PVM", tipas: "suma", v: e.suma, privalomas: true }) : "") +
        lauk({ k: E + "taikoma", pav: "Kam taikoma (naudininku)", v: e.taikoma, pvz: "pvz., likusiai neaktuotai Sutarties kainai", klase: "ps-lauk--plati" }) +
        '<div class="ps-ind-r"><span data-ind-rez="' + i + "." + j + '"></span>' + (b.eilutes.length > 1 ? '<button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psSalinkEilute" data-b="' + i + '" data-e="' + j + '" aria-label="Pašalinti ' + (j + 1) + ' indeksą">Pašalinti indeksą</button>' : "") + "</div></div>";
    }).join("") + '<div class="ps-mygt"><button type="button" class="ps-btn ps-btn--pagr" data-veiksmas="psGaukIndeksus" data-b="' + i + '">Gauti reikšmes iš Oficialiosios statistikos portalo</button>' +
      '<button type="button" class="ps-btn" data-veiksmas="psPridekEilute" data-b="' + i + '">Pridėti indeksą</button></div>' +
      '<p class="ps-uz">Į Oficialiosios statistikos portalą siunčiamas tik indekso duomenų rinkinio kodas ir laikotarpis - jokių sutarties duomenų.</p><div class="ps-busena" data-ind-busena="' + i + '" hidden></div>' +
      '<div class="ps-viso" data-ind-viso="' + i + '" role="status"></div></div>';
    h += '<h4 class="ps-h4">Kreipimasis</h4><div class="ps-tink">' + lauk({ k: K + "iniciatorius", pav: "Perskaičiuoti kainą kreipėsi", v: b.iniciatorius, parinktys: [["tiekejas", Tk], ["pirkejas", Pk]] }) +
      lauk({ k: K + "rastoData", pav: "Kreipimosi (rašto) data", tipas: "data", v: b.rastoData }) + lauk({ k: K + "rastoNr", pav: "Rašto numeris", v: b.rastoNr }) +
      (G.laikotarpioMatas(S) === "akto" ? lauk({ k: K + "darbuAktoData", pav: "Paskutinio atliktų darbų akto (pažymos) data", tipas: "data", v: b.darbuAktoData, uz: "Iki jos Sutartyje skaičiuojamas trumpiausias kainos perskaičiavimo laikotarpis." }) : "") +
      lauk({ k: K + "aktas", pav: "Ar pateiktas perskaičiavimo aktas?", v: b.aktas, perpiesk: true, parinktys: [["", "- nepasirinkta -"], ["taip", "Taip"], ["ne", "Ne"]] }) +
      (b.aktas === "taip" ? lauk({ k: K + "aktoData", pav: "Akto data", tipas: "data", v: b.aktoData }) : "") +
      lauk({ k: K + "tiekejoKaina", pav: "Kitos Šalies apskaičiuota Sutarties kaina, Eur be PVM", tipas: "suma", v: b.tiekejoKaina, uz: "Įrašius palyginama su įrankio skaičiavimu." }) + "</div>";
    h += '<h4 class="ps-h4">Susitarimo tekstui</h4><div class="ps-tink">' + lauk({ k: K + "kainosDok", pav: "Sutarties kaina nurodyta Sutarties", v: b.kainosDok, parinktys: dokParinktys() }) +
      lauk({ k: K + "kainosPunktas", pav: "punkte (numeris)", v: b.kainosPunktas, pvz: "pvz., 11", uz: "Neįrašius susitarime bus tik nauja kaina, be nuorodos į keičiamą punktą." }) +
      lauk({ k: K + "garantija", pav: "Ar perskaičiuojamos užtikrinimo ir draudimo sumos?", v: b.garantija, parinktys: [["", "- nepasirinkta -"], ["taip", "Taip - per 10 darbo dienų"], ["ne", "Ne"], ["netaikoma", "Netaikoma"]] }) +
      lauk({ k: K + "ikainiuPriedas", pav: "Prie susitarimo pridedami perskaičiuoti įkainiai (priedas)", tipas: "bool", v: b.ikainiuPriedas }) +
      lauk({ k: K + "skaiciavimoPriedas", pav: "Prie susitarimo pridedamas įrankio skaičiavimas (priedas)", tipas: "bool", v: b.skaiciavimoPriedas }) +
      lauk({ k: K + "taikymas", pav: "Nuo kada taikoma perskaičiuota kaina", v: b.taikymas, eil: 3, klase: "ps-lauk--plati", uz: "Sakinys pagal Sutarties formą - sutikrinkite su Sutarties tekstu." }) + "</div>" +
      '<p class="ps-uz">Jei darbai, prekių tiekimas ar paslaugos vėluoja dėl kitos Šalies kaltės, uždelstos dalies kaina dėl kainų kilimo paprastai neperskaičiuojama - patikrinkite Sutartį ir tokių sumų į perskaičiuojamą dalį neįtraukite.</p>';
    return h;
  }
  function taisyklesSantrauka(t) {
    return (t.slenkstis != null ? "riba - " + (t.grieztas ? "daugiau kaip " : "ne mažiau kaip ") + G.proc(t.slenkstis, 2) + " %" : "riba nenurodyta") + ", " +
      (t.minMen != null ? "laikotarpis - ne trumpesnis kaip " + t.minMen + " mėn." + (t.pirmamTaikoma ? "" : " (pirmam perskaičiavimui netaikoma)") : "trumpiausias laikotarpis nenurodytas") + ", " +
      (t.formule === "proc" ? "pokytis k procentais" : "koeficientas K") + (t.kTikslumas != null ? ", " + t.kTikslumas + " sk. po kablelio" : ", neapvalinama");
  }
  function subHtml(b, i) {
    var K = "b." + i + ".", s = S.sutartis, z = G.forma(s).sub, Tk = G.salisT(s);
    return '<div class="ps-tink">' + lauk({ k: K + "veiksmas", pav: "Kas keičiama", v: b.veiksmas, perpiesk: true, parinktys: [["pridedamas", "pasitelkiamas naujas " + z], ["keiciamas", z + " pakeičiamas kitu"]] }) +
      (b.veiksmas === "keiciamas" ? lauk({ k: K + "senas", pav: "Keičiamo " + G.link(z, "k") + " pavadinimas", v: b.senas, privalomas: true }) : "") +
      lauk({ k: K + "pav", pav: "Naujo " + G.link(z, "k") + " pavadinimas", v: b.pav, privalomas: true, pvz: "pvz., UAB „Pavyzdys“" }) + lauk({ k: K + "kodas", pav: "Juridinio asmens kodas", v: b.kodas }) +
      lauk({ k: K + "darbai", pav: "Kas jam perduodama (tęsiant sakinį „... ir perduoti jam ...“)", v: b.darbai, klase: "ps-lauk--plati", pvz: "pvz., atlikti nuotolinio ryšio sistemų įrengimo darbus" }) +
      lauk({ k: K + "rastoData", pav: G.link(Tk, "k") + " rašto data", tipas: "data", v: b.rastoData, privalomas: true }) + lauk({ k: K + "rastoNr", pav: "Rašto numeris", v: b.rastoNr }) +
      lauk({ k: K + "rastoPav", pav: "Rašto pavadinimas", v: b.rastoPav, klase: "ps-lauk--plati" }) +
      lauk({ k: K + "dok", pav: "Pasitelkimo tvarka nustatyta Sutarties", v: b.dok, parinktys: dokParinktys() }) + lauk({ k: K + "punktas", pav: "punkte (numeris)", v: b.punktas, pvz: "pvz., 5.2" }) +
      lauk({ k: K + "priedoNr", pav: "Sutarties priedo su " + G.link(z, "kd") + " sąrašu numeris", v: b.priedoNr, pvz: "pvz., 5", uz: "Neįrašius susitarime bus sutikimas pasitelkti, be priedo keitimo." }) +
      lauk({ k: K + "priedoPav", pav: "Priedo pavadinimas", v: b.priedoPav, klase: "ps-lauk--plati" }) +
      lauk({ k: K + "pajegumai", pav: "Ar tiekėjas remiasi šio " + G.link(z, "k") + " pajėgumais kvalifikacijai pagrįsti?", v: b.pajegumai, parinktys: [["", "- nepasirinkta -"], ["ne", "Ne"], ["taip", "Taip"]] }) +
      lauk({ k: K + "ivertinta", pav: G.link(z, "k").charAt(0).toUpperCase() + G.link(z, "k").slice(1) + " dokumentai įvertinti ir atitinka pirkimo dokumentų ir Sutarties reikalavimus", tipas: "bool", v: b.ivertinta, klase: "ps-lauk--plati" }) + "</div>";
  }
  function asmHtml(b, i) {
    var K = "b." + i + ".", s = S.sutartis;
    return '<div class="ps-tink">' + lauk({ k: K + "kieno", pav: "Kurios Šalies atsakingi asmenys keičiami", v: b.kieno, privalomas: true, parinktys: [["", "- pasirinkite -"], ["pirkejo", G.link(G.salisP(s), "k")], ["tiekejo", G.link(G.salisT(s), "k")], ["abieju", "abiejų Šalių"]] }) +
      lauk({ k: K + "dok", pav: "Keičiamas Sutarties", v: b.dok, parinktys: dokParinktys() }) + lauk({ k: K + "punktas", pav: "punktas (numeris)", v: b.punktas, pvz: "pvz., 2.1", privalomas: true }) +
      lauk({ k: K + "priezastis", pav: "Priežastis (neprivaloma)", v: b.priezastis, klase: "ps-lauk--plati", pvz: "pvz., pasikeitus projekto vadovui" }) +
      lauk({ k: K + "redakcija", pav: "Nauja punkto redakcija", v: b.redakcija, eil: 5, klase: "ps-lauk--plati", privalomas: true, uz: "Visas naujas punkto tekstas. Asmens duomenys išsaugomi tik šioje naršyklėje; prieš skelbiant susitarimą CVP IS jie pašalinami." }) + "</div>";
  }
  function pagrindoLaukas(b, i) {
    var tp = G.TIPAI[b.tipas];
    return lauk({ k: "b." + i + ".pagrindas", pav: "Pakeitimo pagrindas", v: b.pagrindas, perpiesk: true, privalomas: true, klase: "ps-lauk--plati",
      parinktys: [["", "- pasirinkite -"]].concat(tp.pagrindai.map(function (k) { return [k, G.cit(k) + " - " + G.PAGRINDAI[k].trumpai]; })),
      uz: G.blokoPagrindas(b) ? G.PAGRINDAI[G.blokoPagrindas(b)].sakinys + "." : "Pagrindą pasirinkite pagal faktines aplinkybes - įrankis patikrins įstatymo sąlygas." });
  }
  function kreipimasisHtml(b, i, kas) {
    var K = "b." + i + ".", s = S.sutartis;
    return '<h4 class="ps-h4">Kreipimasis</h4><div class="ps-tink">' + lauk({ k: K + "iniciatorius", pav: kas, v: b.iniciatorius, parinktys: [["pirkejas", G.salisP(s)], ["tiekejas", G.salisT(s)]] }) +
      lauk({ k: K + "rastoData", pav: "Kreipimosi (rašto) data", tipas: "data", v: b.rastoData }) + lauk({ k: K + "rastoNr", pav: "Rašto numeris", v: b.rastoNr }) + "</div>";
  }
  function sutPunktas(b, i, pav, pvz) {
    var K = "b." + i + ".";
    return lauk({ k: K + "dok", pav: pav, v: b.dok, parinktys: dokParinktys() }) + lauk({ k: K + "punktas", pav: "punkte (numeris)", v: b.punktas, pvz: pvz || "pvz., 4.3" });
  }
  function esmHtml(b, i) {
    var K = "b." + i + ".esm.";
    return '<fieldset class="ps-esm"><legend>Ar pakeitimas esminis? Atsakykite į kiekvieną klausimą</legend><p class="ps-uz">Jei bent į vieną atsakote „Taip“, šiuo pagrindu Sutarties keisti negalima.</p>' +
      G.ESM.map(function (q) {
        return lauk({ k: K + q[0], pav: q[1], v: b.esm[q[0]], parinktys: [["", "- neatsakyta -"], ["ne", "Ne"], ["taip", "Taip"]], klase: "ps-lauk--plati", uz: G.ESM_PAAISK[q[0]] || "" });
      }).join("") + "</fieldset>";
  }
  function kainosLaukai(b, i) {
    var K = "b." + i + ".";
    return lauk({ k: K + "kainosDok", pav: "Sutarties kaina nurodyta Sutarties", v: b.kainosDok, parinktys: dokParinktys() }) +
      lauk({ k: K + "kainosPunktas", pav: "punkte (numeris)", v: b.kainosPunktas, pvz: "pvz., 11", uz: "Neįrašius susitarime bus tik nauja kaina, be nuorodos į keičiamą punktą." });
  }
  var VARD = { darbai: "darbai", paslaugos: "paslaugos", prekes: "prekės", "": "darbai (paslaugos, prekės)" };
  function papHtml(b, i) {
    var K = "b." + i + ".", o = G.objektas(S.sutartis), O = G.OBJ[o], pg = G.blokoPagrindas(b), h = '<div class="ps-tink">' + pagrindoLaukas(b, i);
    h += lauk({ k: K + "aprasymas", pav: "Kokie papildomi " + VARD[o] + " reikalingi", v: b.aprasymas, eil: 3, klase: "ps-lauk--plati", privalomas: true, pvz: "pvz., papildomai iškelti dvi atramas ir nutiesti 120 m kabelio" }) +
      lauk({ k: K + "verte", pav: "Vertė, Eur be PVM", tipas: "suma", v: b.verte, privalomas: true }) +
      lauk({ k: K + "atlikimoTerminas", pav: "Atlikimo terminas (neprivaloma)", v: b.atlikimoTerminas, pvz: "pvz., per 60 dienų nuo Susitarimo įsigaliojimo" }) +
      lauk({ k: K + "priezastis", pav: "Kodėl jų reikia", v: b.priezastis, eil: 3, klase: "ps-lauk--plati", privalomas: true, pvz: "pvz., atliekant darbus nustatyta, kad esamos atramos neatitinka projekto" }) +
      lauk({ k: K + "nebaigta", pav: "Sutartis dar vykdoma: rezultatas galutinai nepriimtas, galutinė sąskaita neišrašyta", tipas: "bool", v: b.nebaigta, klase: "ps-lauk--plati" }) + "</div>";
    if (pg === "keitimas_papildomi") h += '<h4 class="ps-h4">Kodėl negalima pirkti iš kito tiekėjo</h4><div class="ps-tink">' +
      lauk({ k: K + "negalimaKeisti", pav: "Tiekėjo pakeisti negalima dėl", v: b.negalimaKeisti, privalomas: true, parinktys: [["", "- pasirinkite -"], ["technines", "techninių priežasčių"], ["ekonomines", "ekonominių priežasčių"], ["abi", "ekonominių ir techninių priežasčių"]] }) +
      lauk({ k: K + "keitimoPagrindimas", pav: "Pagrindimas", v: b.keitimoPagrindimas, eil: 3, klase: "ps-lauk--plati", privalomas: true, pvz: "pvz., įranga turi būti suderinama su jau sumontuota sistema" }) +
      lauk({ k: K + "nepatogumai", pav: "Tiekėjo pakeitimas sukeltų didelių nepatogumų ar nemažą išlaidų dubliavimą", tipas: "bool", v: b.nepatogumai, klase: "ps-lauk--plati" }) + "</div>";
    if (pg === "keitimas_nenumatytos") h += '<h4 class="ps-h4">Nenumatytos aplinkybės</h4><div class="ps-tink">' +
      lauk({ k: K + "aplinkybes", pav: "Kokios aplinkybės atsirado", v: b.aplinkybes, eil: 3, klase: "ps-lauk--plati", privalomas: true }) +
      lauk({ k: K + "suzinota", pav: "Kada jos paaiškėjo", tipas: "data", v: b.suzinota }) + "</div>";
    if (pg === "keitimas_mazos_vertes" || pg === "keitimas_nenumatytos") h += '<div class="ps-tink">' + lauk({ k: K + "pobudisNesikeicia", pav: "Pakeitimu iš esmės nepakeičiamas Sutarties pobūdis (" + (o === "paslaugos" || o === "prekes" ? "perkamos tokios pat " : "perkami tokie pat ") + VARD[o] + ")", tipas: "bool", v: b.pobudisNesikeicia, klase: "ps-lauk--plati" }) + "</div>";
    if (pg === "perziuros_salygos") h += '<h4 class="ps-h4">Sutartyje numatyta galimybė</h4><div class="ps-tink">' + sutPunktas(b, i, "Galimybė numatyta Sutarties") +
      lauk({ k: K + "galimybe", pav: "Ką numato sąlyga (apimtis ir aplinkybės)", v: b.galimybe, eil: 2, klase: "ps-lauk--plati" }) +
      lauk({ k: K + "ribaEur", pav: "Sutartyje nustatyta didžiausia vertė, Eur be PVM (jei yra)", tipas: "suma", v: b.ribaEur }) + "</div>";
    h += '<div class="ps-viso" data-pap-viso="' + i + '" role="status"></div>';
    h += kreipimasisHtml(b, i, "Dėl papildomų " + O[0] + " kreipėsi");
    h += '<h4 class="ps-h4">Kaina ir susitarimo tekstas</h4><div class="ps-tink">' +
      lauk({ k: K + "kainosBudas", pav: "Kaina nustatyta", v: b.kainosBudas, perpiesk: true, parinktys: [["", "- pasirinkite -"], ["ikainiai", "pagal Sutarties įkainius"], ["tvarka", "pagal Sutartyje nustatytą kainos nustatymo tvarką"], ["pasiulymas", "pagal kitos Šalies pasiūlymą"]] }) +
      (b.kainosBudas === "pasiulymas" ? lauk({ k: K + "kainosPagrindimas", pav: "Kaip įvertinta pasiūlyta kaina", v: b.kainosPagrindimas, eil: 2, klase: "ps-lauk--plati", pvz: "pvz., palyginta su Sutarties panašių darbų įkainiais ir rinkos kainomis" }) : "") +
      kainosLaukai(b, i) +
      lauk({ k: K + "garantija", pav: "Ar perskaičiuojamos užtikrinimo ir draudimo sumos?", v: b.garantija, parinktys: [["", "- nepasirinkta -"], ["taip", "Taip - per 10 darbo dienų"], ["ne", "Ne"], ["netaikoma", "Netaikoma"]] }) +
      lauk({ k: K + "samata", pav: "Prie susitarimo pridedamas papildomų " + O[0] + " sąrašas ir kainos apskaičiavimas (priedas)", tipas: "bool", v: b.samata, klase: "ps-lauk--plati" }) + "</div>";
    return h;
  }
  function atsHtml(b, i) {
    var K = "b." + i + ".", O = G.OBJ[G.objektas(S.sutartis)], pg = G.blokoPagrindas(b), h = '<div class="ps-tink">' + pagrindoLaukas(b, i);
    h += lauk({ k: K + "aprasymas", pav: "Kokių " + O[0] + " atsisakoma", v: b.aprasymas, eil: 3, klase: "ps-lauk--plati", privalomas: true }) +
      lauk({ k: K + "verte", pav: "Atsisakomų " + O[0] + " vertė, Eur be PVM", tipas: "suma", v: b.verte, privalomas: true }) +
      lauk({ k: K + "vertesBudas", pav: "Vertė apskaičiuota", v: b.vertesBudas, parinktys: [["", "- pasirinkite -"], ["ikainiai", "pagal Sutarties įkainius"], ["samatos", "pagal Sutarties sąmatas"], ["kitaip", "kitaip"]] }) +
      lauk({ k: K + "poreikis", pav: "Ar šių " + O[0] + " nebereikia apskritai?", v: b.poreikis, parinktys: [["", "- pasirinkite -"], ["visai", "Nebereikia apskritai"], ["kitas", "Juos atliks kitas tiekėjas"]] }) +
      lauk({ k: K + "priezastis", pav: "Kodėl atsisakoma", v: b.priezastis, eil: 3, klase: "ps-lauk--plati", privalomas: true }) +
      lauk({ k: K + "nebaigta", pav: "Sutartis dar vykdoma: rezultatas galutinai nepriimtas, galutinė sąskaita neišrašyta", tipas: "bool", v: b.nebaigta, klase: "ps-lauk--plati" }) + "</div>";
    if (pg === "perziuros_salygos") h += '<h4 class="ps-h4">Sutartyje numatyta galimybė</h4><div class="ps-tink">' + sutPunktas(b, i, "Galimybė numatyta Sutarties") +
      lauk({ k: K + "galimybe", pav: "Ką numato sąlyga (apimtis ir aplinkybės)", v: b.galimybe, eil: 2, klase: "ps-lauk--plati" }) + "</div>";
    if (pg === "keitimas_neesminis") h += esmHtml(b, i);
    h += kreipimasisHtml(b, i, "Dėl atsisakymo kreipėsi");
    h += '<h4 class="ps-h4">Susitarimo tekstui</h4><div class="ps-tink">' + kainosLaukai(b, i) +
      lauk({ k: K + "samata", pav: "Prie susitarimo pridedamas atsisakomų " + O[0] + " sąrašas ir vertės apskaičiavimas (priedas)", tipas: "bool", v: b.samata, klase: "ps-lauk--plati" }) + "</div>";
    return h;
  }
  function terHtml(b, i) {
    var K = "b." + i + ".", pg = G.blokoPagrindas(b), h = '<div class="ps-tink">' + pagrindoLaukas(b, i);
    h += lauk({ k: K + "kas", pav: "Kuris terminas pratęsiamas", v: b.kas, privalomas: true, parinktys: [["", "- pasirinkite -"], ["darbu", "Darbų atlikimo"], ["pristatymo", "Prekių pristatymo"], ["paslaugu", "Paslaugų suteikimo"], ["etapo", "Etapo įvykdymo"], ["galiojimo", "Sutarties galiojimo"]] }) +
      sutPunktas(b, i, "Terminas nustatytas Sutarties", "pvz., 4.1") +
      lauk({ k: K + "dabartinis", pav: "Dabartinė termino pabaiga", tipas: "data", v: b.dabartinis, privalomas: true }) +
      lauk({ k: K + "naujas", pav: "Nauja termino pabaiga", tipas: "data", v: b.naujas, privalomas: true }) +
      lauk({ k: K + "priezastis", pav: "Pratęsimo priežastys ir jų eiga", v: b.priezastis, eil: 3, klase: "ps-lauk--plati", privalomas: true, pvz: "pvz., dėl ilgiau trukusio projekto derinimo su ... (nuo ... iki ...)" }) + "</div>";
    if (pg === "perziuros_salygos") h += '<h4 class="ps-h4">Sutartyje numatytas pratęsimas</h4><div class="ps-tink">' +
      lauk({ k: K + "aplinkybe", pav: "Sutartyje numatyta aplinkybė (tęsiant sakinį „... kai ...“)", v: b.aplinkybe, klase: "ps-lauk--plati", pvz: "pvz., darbai vėluoja dėl Užsakovo ar trečiųjų asmenų veiksmų" }) +
      lauk({ k: K + "maxPrat", pav: "Ilgiausias leidžiamas pratęsimas", tipas: "sveikas", v: b.maxPrat, pvz: "pvz., 6" }) +
      lauk({ k: K + "maxVnt", pav: "Matas", v: b.maxVnt, parinktys: [["men", "mėnesiai"], ["d", "dienos"]] }) +
      lauk({ k: K + "ankstesniPrat", pav: "Jau pratęsta pagal šį punktą (tais pačiais vienetais)", tipas: "sveikas", v: b.ankstesniPrat, pvz: "0" }) + "</div>";
    if (pg === "keitimas_neesminis") h += esmHtml(b, i);
    h += '<div class="ps-viso" data-ter-viso="' + i + '" role="status"></div>';
    h += kreipimasisHtml(b, i, "Dėl pratęsimo kreipėsi");
    h += '<h4 class="ps-h4">Susitarimo tekstui</h4><div class="ps-tink">' +
      lauk({ k: K + "vertinimoKriterijus", pav: "Ar terminas buvo pasiūlymų vertinimo kriterijus?", v: b.vertinimoKriterijus, parinktys: [["", "- pasirinkite -"], ["ne", "Ne"], ["taip", "Taip"]] }) +
      lauk({ k: K + "kainaNesikeicia", pav: "Pratęsimas Sutarties kainos nekeičia", tipas: "bool", v: b.kainaNesikeicia }) +
      lauk({ k: K + "grafikas", pav: "Pridedamas atnaujintas vykdymo grafikas (priedas)", tipas: "bool", v: b.grafikas }) +
      lauk({ k: K + "garantija", pav: "Ar užtikrinimas ir draudimas galios pratęstu terminu?", v: b.garantija, parinktys: [["", "- nepasirinkta -"], ["taip", "Reikia pratęsti - per 10 darbo dienų"], ["galioja", "Jau galioja pratęstu terminu"], ["netaikoma", "Netaikoma"]] }) + "</div>";
    return h;
  }
  function kitHtml(b, i) {
    var K = "b." + i + ".", pg = G.blokoPagrindas(b), h = '<div class="ps-tink">' + pagrindoLaukas(b, i);
    h += lauk({ k: K + "kas", pav: "Kas keičiama", v: b.kas, perpiesk: true, parinktys: [["punktas", "Sutarties punktas"], ["priedas", "Sutarties priedas"]] });
    if (b.kas === "priedas") h += lauk({ k: K + "priedoNr", pav: "Priedo numeris", v: b.priedoNr, privalomas: true, pvz: "pvz., 3" }) + lauk({ k: K + "priedoPav", pav: "Priedo pavadinimas", v: b.priedoPav, klase: "ps-lauk--plati" });
    else h += sutPunktas(b, i, "Keičiamas Sutarties", "pvz., 9.2") + lauk({ k: K + "redakcija", pav: "Nauja punkto redakcija", v: b.redakcija, eil: 5, klase: "ps-lauk--plati", privalomas: true });
    h += lauk({ k: K + "priezastis", pav: "Kodėl keičiama", v: b.priezastis, eil: 3, klase: "ps-lauk--plati", privalomas: true }) + "</div>";
    if (pg === "perziuros_salygos") h += '<h4 class="ps-h4">Sutartyje numatyta galimybė</h4><div class="ps-tink">' +
      lauk({ k: K + "salygosDok", pav: "Galimybė numatyta Sutarties", v: b.salygosDok, parinktys: dokParinktys() }) + lauk({ k: K + "salygosPunktas", pav: "punkte (numeris)", v: b.salygosPunktas, privalomas: true }) +
      lauk({ k: K + "galimybe", pav: "Ką numato sąlyga", v: b.galimybe, eil: 2, klase: "ps-lauk--plati" }) + "</div>";
    if (pg === "keitimas_neesminis") h += esmHtml(b, i);
    h += '<div class="ps-tink">' + lauk({ k: K + "kainaNesikeicia", pav: "Pakeitimas Sutarties kainos ir terminų nekeičia", tipas: "bool", v: b.kainaNesikeicia, klase: "ps-lauk--plati" }) + "</div>";
    return h;
  }
  /* Kuo remiasi patikros: VPT gairės ir teismų praktika (nuorodos į Liteko - naujame skirtuke). */
  function praktikaHtml(b) {
    var nr = G.blokoPraktika(b), vpt = b.tipas !== "ind" && b.tipas !== "sub" && b.tipas !== "asm";
    if (!nr.length && !vpt) return "";
    return '<details class="ps-prakt"><summary>Kuo remiasi patikros</summary><ul>' +
      (vpt ? '<li><a href="' + esc(G.SALTINIAI.vpt.url) + '" target="_blank" rel="noopener">' + esc(G.SALTINIAI.vpt.pav) + "</a>. " + esc(G.SALTINIAI.vpt.pastaba) + "</li>" : "") +
      nr.map(function (n) { var x = G.PRAKTIKA[n]; return '<li><a href="' + esc(G.LITEKO + x.id) + '" target="_blank" rel="noopener">' + esc(x.teismas + " byla Nr. " + n) + "</a> (" + esc(x.data) + (x.istatymas ? ", pagal PĮ" : "") + "): " + esc(x.teze) + ".</li>"; }).join("") +
      '</ul><p class="ps-uz">Dauguma bylų išnagrinėtos pagal Viešųjų pirkimų įstatymą; Lietuvos Aukščiausiasis Teismas byloje Nr. e3K-3-245-916/2023 nurodė, kad PĮ ir VPĮ sutarčių keitimo pagrindai iš esmės sutampa. Tai nėra teisinė išvada.</p></details>';
  }
  function z2Html() {
    var r = S.rengiamas, h = '<section class="ps-card" aria-labelledby="psZ2a"><h2 id="psZ2a">Rengiamas susitarimas</h2><div class="ps-tink">' +
      lauk({ k: "r.nr", pav: "Susitarimo eilės numeris", v: r.nr, klase: "ps-lauk--siaura", privalomas: true, pvz: "pvz., " + (S.ankstesni.length + 1) }) + "</div>" +
      '<p class="ps-uz">Pagal ankstesnių pakeitimų sąrašą eilės numeris būtų ' + (S.ankstesni.length + 1) + ". Vienas susitarimas gali jungti kelis pakeitimus - kiekvienas turi savo pagrindą ir patikras.</p></section>";
    h += r.blokai.map(function (b, i) {
      var tp = G.TIPAI[b.tipas];
      return '<section class="ps-card ps-blokas" data-blokas="' + i + '" aria-labelledby="psB' + i + '"><div class="ps-eil"><h2 id="psB' + i + '" tabindex="-1">' + (i + 1) + ". " + esc(tp.pav) + "</h2>" +
        '<div class="ps-mygt"><span class="ps-zyme ps-zyme--pagr"' + (G.blokoPagrindas(b) ? ' title="' + esc(G.apie(G.blokoPagrindas(b))) + '">' + esc(G.cit(G.blokoPagrindas(b))) : ">pagrindas nepasirinktas") + '</span><button type="button" class="ps-btn ps-btn--maz" data-veiksmas="psSalinkBloka" data-b="' + i + '">Pašalinti pakeitimą</button></div></div>' +
        (b.tipas === "ind" ? indHtml(b, i) : b.tipas === "sub" ? subHtml(b, i) : b.tipas === "asm" ? asmHtml(b, i) : b.tipas === "pap" ? papHtml(b, i) : b.tipas === "ats" ? atsHtml(b, i) : b.tipas === "ter" ? terHtml(b, i) : kitHtml(b, i)) +
        '<div class="ps-pat" data-patikros="' + i + '" aria-live="polite"></div>' + praktikaHtml(b) + "</section>";
    }).join("");
    h += '<section class="ps-card" aria-labelledby="psZ2p"><h2 id="psZ2p">Pridėti pakeitimą</h2><div class="ps-tipai">' + Object.keys(G.TIPAI).map(function (k) {
      return '<button type="button" class="ps-tipas" data-veiksmas="psPridekBloka" data-tipas="' + k + '"><span class="ps-tipas-p">' + esc(G.TIPAI[k].pav) + '</span><span class="ps-tipas-s">' + esc(G.TIPAI[k].pagrindas ? G.cit(G.TIPAI[k].pagrindas) : G.TIPAI[k].pagrindai.map(function (x) { return G.cit(x).replace(/^PĮ /, ""); }).join(", ").replace(/^/, "PĮ ")) + "</span></button>";
    }).join("") + '</div><p class="ps-uz">Kai rūšiai galimi keli pagrindai, juos pasirenkate pakeitime - nuo pagrindo priklauso patikros ir susitarimo tekstas. Jei pakeitimas netelpa į čia esančias rūšis, susitarimą renkite įprastu būdu.</p></section>';
    return h;
  }
  function patikruHtml(sar) {
    var ZN = { ok: ["ps-p--ok", "Patikrinta"], klaida: ["ps-p--kl", "Reikia pataisyti"], tikrinti: ["ps-p--tk", "Patikrinkite"], info: ["ps-p--in", "Pastaba"] };
    return '<ul class="ps-plist">' + sar.map(function (p) {
      return '<li class="ps-p ' + ZN[p.lygis][0] + '"><span class="ps-p-z">' + ZN[p.lygis][1] + '</span><span class="ps-p-t">' + esc(p.tekstas) +
        (p.laukas ? ' <button type="button" class="ps-nuor" data-veiksmas="psEik" data-laukas="' + esc(p.laukas) + '">Eiti į lauką</button>' : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ---------- 3 žingsnis ---------- */
  function z3Html() {
    var r = S.rengiamas, pat = G.patikros(S), kl = pat.filter(function (p) { return p.lygis === "klaida"; }), ind = r.blokai.some(function (b) { return b.tipas === "ind"; });
    var h = '<section class="ps-card" aria-labelledby="psZ3a"><h2 id="psZ3a" tabindex="-1">Patikra prieš rengiant</h2>';
    if (!pat.length) h += '<p class="ps-pastaba ps-pastaba--ok">Pastabų nėra: privalomi duomenys įrašyti, pakeitimų sąlygos patikrintos pagal tai, kas įvesta.</p>';
    else h += '<p class="ps-uz">' + (kl.length ? "Kol yra taisytinų vietų (" + kl.length + "), Word failai nerengiami - peržiūra rodoma." : "Taisytinų vietų nėra. Peržiūrėkite pastabas - jos dokumentų nestabdo.") + "</p>" + patikruHtml(pat);
    h += "</section>";
    h += '<section class="ps-card" aria-labelledby="psZ3b"><h2 id="psZ3b">Susitarimo duomenys</h2><div class="ps-tink">' + lauk({ k: "r.data", pav: "Susitarimo data", tipas: "data", v: r.data, uz: "Neįrašius paliekama vieta įrašyti registruojant." }) +
      lauk({ k: "r.regNr", pav: "Registracijos numeris", v: r.regNr, pvz: "įrašoma registruojant" }) + lauk({ k: "r.vieta", pav: "Sudarymo vieta", v: r.vieta }) + "</div></section>";
    h += '<section class="ps-card" aria-labelledby="psZ3c"><div class="ps-eil"><h2 id="psZ3c">Susitarimo projektas</h2><div class="ps-mygt">' +
      '<button type="button" class="ps-btn ps-btn--pagr" data-veiksmas="psWord" data-dok="susitarimas"' + (kl.length ? " disabled" : "") + ">Atsisiųsti susitarimą (Word)</button>" +
      (ind ? '<button type="button" class="ps-btn" data-veiksmas="psWord" data-dok="skaiciavimas"' + (kl.length ? " disabled" : "") + ">Skaičiavimas (Word)</button>" : "") +
      '<button type="button" class="ps-btn" data-veiksmas="psWord" data-dok="pagrindimas"' + (kl.length ? " disabled" : "") + ">Pagrindimas derinimui (Word)</button>" +
      '<button type="button" class="ps-btn" data-veiksmas="psKopijuok"' + (kl.length ? " disabled" : "") + '>Kopijuoti tekstą</button></div></div><div id="psWordBusena" class="ps-busena" hidden></div>' +
      (kl.length ? '<p class="ps-pastaba ps-pastaba--klaida">Kol patikroje yra taisytinų vietų, peržiūra rodoma tik darbui: tekstas dar netinka derinti ar pasirašyti.</p>' : "") +
      '<p class="ps-uz">Projektą sudaro taisyklės ir šablonai pagal įvestus duomenis, be dirbtinio intelekto. Prieš pasirašant jis derinamas įprasta organizacijos tvarka.</p>' +
      '<div class="ps-lapas" id="psPerziura" tabindex="0" role="group" aria-label="Susitarimo projekto peržiūra">' + DK.html(G.susitarimas(S)) + "</div></section>";
    h += '<section class="ps-card" aria-labelledby="psZ3d"><h2 id="psZ3d">Kas toliau</h2><div class="ps-tink">' + lauk({ k: "x.pasirasyta", pav: "Pasirašymo data (jei jau žinoma)", tipas: "data", v: PASIRASYTA, perpiesk: true, uz: "Pagal ją apskaičiuojami terminai. Data čia neišsaugoma." }) + "</div>" +
      '<ul class="ps-toliau">' + G.terminai(S, PASIRASYTA).map(function (x) { return "<li>" + esc(x.tekstas) + (x.iki ? ' <span class="ps-zyme ps-zyme--reng">iki ' + esc(x.iki) + "</span>" : "") + "</li>"; }).join("") + "</ul>" +
      '<div class="ps-uzbaik">' + (TVIRTINA === "uzbaik" ? '<span class="ps-tvirt" role="group" aria-label="Patvirtinimas">Susitarimas Nr. ' + esc(r.nr || "?") + ' bus įrašytas į ankstesnių pakeitimų sąrašą, o rengiamas - išvalytas. <button type="button" class="ps-btn ps-btn--pagr" data-veiksmas="psUzbaikTikrai">Įrašyti į sąrašą</button> <button type="button" class="ps-btn" data-veiksmas="psAtsaukTvirtinima">Atšaukti</button></span>'
        : '<button type="button" class="ps-btn" data-veiksmas="psUzbaik"' + (r.blokai.length && !kl.length ? "" : " disabled") + ">Susitarimas pasirašytas - įrašyti į pakeitimų sąrašą</button>" +
          (r.blokai.length && kl.length ? '<p class="ps-uz" id="psUzbaikKodel">Kol patikroje yra taisytinų vietų, susitarimas į pakeitimų sąrašą neįrašomas.</p>' : "")) + "</div></section>";
    return h;
  }

  /* ---------- piešimas ---------- */
  function zingsniuHtml() {
    return '<ol class="ps-zingsniai">' + ZINGSNIAI.map(function (p, i) {
      var n = i + 1, b = n < ZING ? "atliktas" : n === ZING ? "dabartinis" : "busimas";
      return '<li><button type="button" class="ps-z ps-z--' + b + '" data-veiksmas="psZingsnis" data-z="' + n + '"' + (n === ZING ? ' aria-current="step"' : "") + '><span class="ps-z-n" aria-hidden="true">' + (b === "atliktas" ? "\u2713" : n) +
        '</span><span class="ps-z-p">' + esc(p) + '</span><span class="ps-sr">, ' + n + " žingsnis iš " + ZINGSNIAI.length + (b === "atliktas" ? ", peržiūrėtas" : "") + "</span></button></li>";
    }).join("") + "</ol>";
  }
  function piesk(fokusas) {
    var sar = $("psSarasas"), dar = $("psDarbas");
    if (!S) { dar.hidden = true; sar.hidden = false; sar.innerHTML = sarasoHtml(); zyma(B.visos.length ? "Išsaugota šioje naršyklėje" : "Dar nieko neįrašyta"); return; }
    sar.hidden = true; dar.hidden = false;
    $("psKortele").innerHTML = korteleHtml();
    $("psZingsniai").innerHTML = zingsniuHtml();
    $("psTurinys").innerHTML = ZING === 1 ? z1Html() : ZING === 2 ? z2Html() : z3Html();
    $("psAtgal").hidden = ZING === 1;
    $("psToliau").hidden = ZING === 3;
    $("psToliau").textContent = ZING === 1 ? "Toliau - pakeitimai" : "Toliau - dokumentai";
    atnaujink();
    if (fokusas) { var f = typeof fokusas === "string" ? doc.querySelector(fokusas) : null; if (f && f.focus) f.focus(); }
  }
  /* Išvestinės vietos (kortelė, patikros, skaičiavimo rezultatai) - be formos perpiešimo, kad rašant nedingtų fokusas. */
  function atnaujink() {
    if (!S) return;
    $("psKortele").innerHTML = korteleHtml();
    /* 3 žingsnis: susitarimo data, registracijos numeris ir sudarymo vieta įrašomi čia pat - peržiūra turi rodyti tai, kas bus Word faile. */
    if (ZING === 3) { var pz = $("psPerziura"), ph = DK.html(G.susitarimas(S)); if (pz && pz.innerHTML !== ph) pz.innerHTML = ph; return; }
    if (ZING !== 2) return;
    S.rengiamas.blokai.forEach(function (b, i) {
      var v = doc.querySelector('[data-patikros="' + i + '"]');
      if (v) v.innerHTML = patikruHtml(G.blokoPatikros(b, S, i));
      if (b.tipas === "pap") { var pv = doc.querySelector('[data-pap-viso="' + i + '"]'), pt = papJuosta(b, i); if (pv && pv.innerHTML !== pt) pv.innerHTML = pt; return; }
      if (b.tipas === "ter") { var tv = doc.querySelector('[data-ter-viso="' + i + '"]'), tt = terJuosta(b); if (tv && tv.innerHTML !== tt) tv.innerHTML = tt; return; }
      if (b.tipas !== "ind") return;
      var R = G.skaiciuokInd(b, S), ts = doc.querySelector('[data-tais="' + i + '"]');
      if (ts) ts.textContent = taisyklesSantrauka(b.taisykle);
      var nev = (R.slenkstis && R.slenkstis.pasiektas === false) || (R.laikotarpis && R.laikotarpis.tinka === false);
      var vs = doc.querySelector('[data-ind-viso="' + i + '"]'), vt = nev
        ? '<span class="ps-viso-p">Kainos peržiūros sąlyga neįvykdyta</span><span class="ps-viso-s">Pagal įrašytą peržiūros taisyklę Sutarties kaina neperskaičiuojama' +
          (R.nauja != null && R.sena != null ? " (palyginimui: " + esc(G.eur(R.sena)) + " \u2192 " + esc(G.eur(R.nauja)) + " Eur)" : "") + ". Jei Sutartyje nustatyta kitokia riba ar laikotarpis, pakeiskite peržiūros taisyklę.</span>"
        : R.nauja != null && R.sena != null
        ? '<span class="ps-viso-p">Sutarties kaina be PVM</span><span class="ps-viso-v">' + esc(G.eur(R.sena)) + " \u2192 " + esc(G.eur(R.nauja)) + ' Eur</span><span class="ps-viso-s">' + (R.pokytisEur >= 0 ? "+" : "") + esc(G.eur(R.pokytisEur)) + " Eur" +
          (R.pokytisProc != null ? ", " + esc(G.proc(R.pokytisProc)) + " % pradinės kainos" : "") + (R.pvm ? "; su PVM - " + esc(G.eur(R.pvm.viso)) + " Eur" : "") + "</span>"
        : '<span class="ps-viso-s">Sutarties kaina po perskaičiavimo bus parodyta, kai bus įrašytos indeksų reikšmės ir perskaičiuojamos sumos.</span>';
      if (vs && vs.innerHTML !== vt) vs.innerHTML = vt;
      if (vs) vs.classList.toggle("ps-viso--ne", !!nev);
      R.eilutes.forEach(function (e) {
        var el = doc.querySelector('[data-ind-rez="' + i + "." + e.i + '"]');
        if (!el) return;
        el.textContent = e.K == null ? "" : "Pokytis " + G.proc(e.pokytis) + " %, " + (b.taisykle.formule === "proc" ? "k = " : "K = ") + G.kTekstas(e.K, b.taisykle) + (e.nauja != null ? "; perskaičiuota suma - " + G.eur(e.nauja) + " Eur (" + (e.skirtumas >= 0 ? "+" : "") + G.eur(e.skirtumas) + ")" : "");
      });
    });
  }
  function papJuosta(b, i) {
    var R = G.skaiciuokPap(b, S, i), pg = R.pagr, z = R.patikslinta ? "patikslintos" : "pradinės";
    if (b.verte == null || R.bazes == null) return '<span class="ps-viso-s">Įrašius vertę ir pradinę Sutarties kainą, čia bus parodyta, kiek pakeitimas sudaro Sutarties vertės ir kokia riba taikoma.</span>';
    var t = '<span class="ps-viso-p">Šis pakeitimas</span><span class="ps-viso-v">' + esc(G.eur(b.verte)) + " Eur (" + esc(G.proc(R.proc)) + " %)</span>";
    if (pg === "keitimas_mazos_vertes" && R.visoProc != null) t += '<span class="ps-viso-s">Visi pakeitimai pagal ' + esc(G.cit(pg)) + ": " + esc(G.eur(R.viso)) + " Eur, " + esc(G.proc(R.visoProc)) + " % " + z + " vertės" +
      (R.ribos.proc != null ? "; riba - " + R.ribos.proc + " % ir " + esc(G.eur(R.ribos.intl)) + " Eur" : "") + "</span>";
    else if (pg === "keitimas_papildomi" || pg === "keitimas_nenumatytos") t += '<span class="ps-viso-s">Riba atskiram pakeitimui - 50 % ' + z + " Sutarties vertės (" + esc(G.eur(R.bazes * 0.5)) + " Eur)</span>";
    if (R.suPakeitimais != null) t += '<span class="ps-viso-s">Sutarties vertė su pakeitimais (be kainų peržiūros): ' + esc(G.eur(R.suPakeitimais)) + " Eur" + (R.rusiesRiba != null ? "; pirkimo rūšies riba - " + esc(G.eur(R.rusiesRiba)) + " Eur" : "") + "</span>";
    return t;
  }
  function terJuosta(b) {
    var T = G.skaiciuokTer(b);
    if (T.dienu == null) return '<span class="ps-viso-s">Įrašius dabartinę ir naują termino pabaigą, čia bus parodyta, kiek terminas pratęsiamas.</span>';
    return '<span class="ps-viso-p">Pratęsiama</span><span class="ps-viso-v">' + T.dienu + " d.</span>" + (T.riba ? '<span class="ps-viso-s">Pagal Sutartį terminą galima pratęsti iki ' + esc(T.riba) + "</span>" : "");
  }
  function perpieskIslaikant(el) {
    var k = el && el.getAttribute && el.getAttribute("data-kelias");
    piesk();
    if (k) { var n = doc.querySelector('[data-kelias="' + k + '"]'); if (n && n.focus) n.focus(); }
  }

  /* ---------- veiksmai ---------- */
  function atverk(id) {
    for (var i = 0; i < B.visos.length; i++) if (B.visos[i].id === id) S = B.visos[i];
    if (!S) return;
    ZING = 1; PASIRASYTA = ""; TVIRTINA = ""; PASIRINKTA = null; ATVERTA = {};
    piesk("#psKortele");
  }
  function busena(vieta, tipas, tekstas) { var v = typeof vieta === "string" ? doc.querySelector(vieta) : vieta; if (v && global.GP_BUSENA) global.GP_BUSENA.rodyk(v, { tipas: tipas, tekstas: tekstas }); }

  function gaukIndeksus(bi, o) {
    var b = S && S.rengiamas.blokai[bi], I = global.GP_OSP_INDEKSAI, sel = '[data-ind-busena="' + bi + '"]';
    if (!b || !I || !global.GP_BUSENA) return Promise.resolve(null);
    if (!b.pradzia || !b.pabaiga || b.pradzia > b.pabaiga) { busena(sel, "klaida", I.klaidosTekstas("laikotarpis")); return Promise.resolve(null); }
    var ids = [];
    b.eilutes.forEach(function (e) { if (e.indeksas && ids.indexOf(e.indeksas) < 0) ids.push(e.indeksas); });
    if (!ids.length) { busena(sel, "tuscia", I.klaidosTekstas("indeksas")); return Promise.resolve(null); }
    var sid = S.id, pr = b.pradzia, pb = b.pabaiga;
    return global.GP_BUSENA.vykdyk(sel, { tekstas: "Gaunamos indeksų reikšmės iš Oficialiosios statistikos portalo...", atsaukiama: true, kartoti: function () { return gaukIndeksus(bi, o); },
      veiksmas: function (signal) {
        return Promise.all(ids.map(function (id) { return I.gauk(id, pr, pb, { signal: signal, fetch: o && o.fetch }); })).then(function (rs) {
          if (rs.some(function (r) { return r.rusis === "atsaukta"; })) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
          if (rs.every(function (r) { return !r.ok; })) throw new Error(I.klaidosTekstas(rs[0].rusis));
          return rs;
        });
      } }).then(function (rez) {
      if (!rez || !rez.ok || !S || S.id !== sid || S.rengiamas.blokai[bi] !== b || b.pradzia !== pr || b.pabaiga !== pb) return rez;
      var pagal = {}, truksta = [], nepavyko = 0;
      rez.reiksme.forEach(function (r, i) { pagal[ids[i]] = r; if (!r.ok) nepavyko++; });
      b.eilutes.forEach(function (e) {
        var r = pagal[e.indeksas];
        if (!r || !r.ok) return;
        if (r.reiksmes[pr] != null) { e.pr = r.reiksmes[pr]; e.prS = "osp"; } else if (truksta.indexOf(pr) < 0) truksta.push(pr);
        if (r.reiksmes[pb] != null) { e.pb = r.reiksmes[pb]; e.pbS = "osp"; } else { if (truksta.indexOf(pb) < 0) truksta.push(pb); e.naujausias = r.paskutinis; }
      });
      var nauj = b.eilutes.map(function (e) { var x = e.naujausias; delete e.naujausias; return x; }).filter(Boolean)[0];
      b.gauta = siandien();
      issaugok(); piesk();
      var t = truksta.length ? ("Šių mėnesių reikšmės šaltinyje dar nepaskelbtos arba jų nėra: " + truksta.map(I.menuoZodziais).join(", ") + "." + (nauj ? " Naujausia paskelbta - " + I.menuoZodziais(nauj) + "." : "")).replace(/\.\./g, ".")
        : "Reikšmės gautos " + b.gauta + "." + (nepavyko ? " Dalies indeksų gauti nepavyko - įrašykite juos ranka arba bandykite dar kartą." : "");
      busena(sel, truksta.length || nepavyko ? "nezinoma" : "gerai", t);
      var m = doc.querySelector('[data-veiksmas="psGaukIndeksus"][data-b="' + bi + '"]'); if (m) m.focus();
      return rez;
    });
  }

  var RASTI_T = { neidiegta: "Viešų sutarčių duomenų paslauga dar neįdiegta - įrašykite sutarties duomenis ranka.", rysys: "G-Procure serveris nepasiekiamas. Bandykite dar kartą arba įrašykite duomenis ranka.",
    saltinis: "Viešų duomenų šaltinis šiuo metu neatsako. Bandykite vėliau arba įrašykite duomenis ranka.", parametrai: "Sutarties numeris neatpažintas - patikrinkite, ar įrašytas visas numeris.",
    uzimta: "Per daug užklausų - palaukite minutę ir bandykite dar kartą.", ruosiama: "Duomenys dar ruošiami - bandykite po kelių sekundžių." };
  function rask(o) {
    var V = global.GP_VIESOS_SUTARTYS, s = S.sutartis, sel = "#psRastiBusena";
    if (!V || !V.sutartis || !global.GP_BUSENA) return Promise.resolve(null);
    if (!s.nr || s.nr.length < 3) { busena(sel, "klaida", "Įrašykite sutarties numerį."); return Promise.resolve(null); }
    var sid = S.id, nr = s.nr;
    return global.GP_BUSENA.vykdyk(sel, { tekstas: "Ieškoma viešuose CVP IS sutarčių duomenyse...", atsaukiama: true, kartoti: function () { return rask(o); },
      veiksmas: function (signal) {
        return V.sutartis(nr, { pirkejas: s.pirkejoKodas, signal: signal, fetch: o && o.fetch }).then(function (r) {
          if (r && r.rusis === "atsaukta") throw Object.assign(new Error("Aborted"), { name: "AbortError" });
          if (!r || (!r.ok && r.rusis !== "nerasta")) throw new Error(RASTI_T[r && r.rusis] || RASTI_T.rysys);
          return r;
        });
      } }).then(function (rez) {
      if (!rez || !rez.ok || !S || S.id !== sid) return rez;
      var r = rez.reiksme;
      if (!r.ok) { busena(sel, "tuscia", "Sutartis Nr. " + nr + " viešuose duomenyse nerasta. Patikrinkite numerį arba įrašykite duomenis ranka (ne visos sutartys viešuose duomenyse turi numerį)."); return rez; }
      var x = G.isViesu(S, r), rv = r.sutartis || {};
      /* Įrašytas pakeitimo numeris - sutarties numeris pakeičiamas tikruoju */
      if (rv.nr && rv.nr !== nr && S.sutartis.nr === nr) { S.sutartis.nr = String(rv.nr).slice(0, 60); x.pildyta.unshift("sutarties numeris " + rv.nr + " (įrašytas " + nr + " - pakeitimo numeris)"); }
      G.papildyk(S, rv, x.pildyta);
      S.sutartis.gauta = siandien();
      issaugok(); piesk();
      busena(sel, "gerai", "Rasta: „" + (S.sutartis.viesaPav || nr) + "“. " + (x.pildyta.length ? "Užpildyta: " + x.pildyta.join(", ") + ". " : "Jau įrašyti laukai nepakeisti. ") +
        (x.pakeitimu ? "Į sąrašą įtraukta paskelbtų pakeitimų: " + x.pakeitimu + " - įrašykite, dėl ko jie sudaryti ir kaip keitėsi kaina." : "Naujų paskelbtų pakeitimų nerasta.") +
        (r.keliosSutartys ? " Šis pirkimas turi kelias sutartis - patikrinkite, kurie pakeitimai priklauso šiai." : ""));
      var m = doc.querySelector('[data-veiksmas="psRask"]'); if (m) m.focus();
      return rez;
    });
  }

  function word(kuris) {
    var s = S.sutartis, r = S.rengiamas, sel = "#psWordBusena";
    if (G.kliuciu(S)) { busena(sel, "klaida", "Pirmiausia pataisykite patikroje nurodytas vietas."); return Promise.resolve(null); }
    if (global.GP_BIBLIOTEKOS && !global.GP_BIBLIOTEKOS.yra("docx", "Word dokumentų biblioteka")) return Promise.resolve(null);
    var dok = kuris === "skaiciavimas" ? G.skaiciavimoDok(S) : kuris === "pagrindimas" ? G.pagrindimoDok(S, { pasirasyta: PASIRASYTA }) : G.susitarimas(S);
    var vardas = kuris === "skaiciavimas" ? "Kainos-perskaiciavimo-skaiciavimas" : kuris === "pagrindimas" ? "Pakeitimo-pagrindimas" : "Susitarimas-Nr-" + (r.nr || "");
    if (!dok) return Promise.resolve(null);
    return DK.docx(dok, { pastaba: "Parengta G-Procure įrankiu pagal įvestus duomenis; prieš pasirašant derinama įprasta tvarka." }).then(function (blob) {
      var fv = global.GP_EKSPORTAS ? global.GP_EKSPORTAS.failoVardas({ numeris: s.nr, dokumentas: vardas, data: siandien(), pletinys: "docx" }) : vardas + ".docx";
      if (global.saveAs) global.saveAs(blob, fv);
      busena(sel, "gerai", "Parengta: " + fv);
      return { blob: blob, vardas: fv };
    }, function (e) { busena(sel, "klaida", "Word failo parengti nepavyko: " + ((e && e.message) || "nežinoma klaida")); return null; });
  }

  function eksportas(id) {
    var x = B.visos.filter(function (s) { return s.id === id; })[0];
    if (!x) return;
    var t = JSON.stringify({ formatas: "g-procure/sutarties-pakeitimai", versija: 1, sukurta: new Date().toISOString(), sutartis: x }, null, 2);
    var fv = global.GP_EKSPORTAS ? global.GP_EKSPORTAS.failoVardas({ numeris: x.sutartis.nr, dokumentas: "Sutarties-pakeitimai", data: siandien(), pletinys: "json" }) : "sutarties-pakeitimai.json";
    if (global.saveAs) global.saveAs(new Blob([t], { type: "application/json" }), fv);
  }
  function importuok(tekstas) {
    var o = null;
    try { o = global.GP_SAUGYKLA && global.GP_SAUGYKLA.json ? global.GP_SAUGYKLA.json(tekstas) : JSON.parse(tekstas); } catch (e) { o = null; }
    if (!o || o.formatas !== "g-procure/sutarties-pakeitimai" || o.versija !== 1) return { ok: false, klaida: "Tai ne G-Procure sutarties pakeitimų failas." };
    var x = G.sutartiesForma(o.sutartis);
    if (!x) return { ok: false, klaida: "Failo perskaityti nepavyko: netinkama sandara." };
    if (B.visos.some(function (s) { return s.id === x.id; })) x.id = naujasId();
    B.visos.unshift(x);
    return { ok: rasyk().ok !== false, sutartis: x };
  }
  function pranesk(t, tipas) { if (global.GP_PRANESIMAS) global.GP_PRANESIMAS.rodyk(t, { tipas: tipas || "gerai" }); }

  var VEIKSMAI = {
    psNauja: function () { S = G.naujaSutartis(naujasId()); ZING = 1; TVIRTINA = ""; PASIRINKTA = null; ATVERTA = {}; B.visos.unshift(S); rasyk(); piesk("#" + lid("s.nr")); },
    psAtverk: function (el) { atverk(el.getAttribute("data-id")); },
    psGrizk: function () { issaugokDabar(); S = null; TVIRTINA = ""; PASIRINKTA = null; piesk(); var m = doc.querySelector('[data-veiksmas="psNauja"]'); if (m) m.focus(); },
    /* --- sutarties paieška --- */
    psIeskaRaso: function (el) {
      P.q = el.value; P.rodoma = 12;
      if (P.sar[P.org]) { pieskRez(); return; }
      /* sąrašas dar negautas: gaunamas žmogui įrašius bent du ženklus (siunčiamas tik pirkimo vykdytojo kodas, ne paieškos žodžiai) */
      clearTimeout(P.laikm);
      if (G.paieskosZodziai(P.q).length) P.laikm = setTimeout(function () { if (!S) ieskokDabar(); }, 400);
    },
    psIeskaKlav: function (el, ev) {
      if (ev.key === "Enter") { ev.preventDefault(); clearTimeout(P.laikm); ieskokDabar(); }
      else if (ev.key === "ArrowDown") { var m = doc.querySelector(".ps-rz"); if (m) { ev.preventDefault(); m.focus(); } }
    },
    psIeskok: function () { clearTimeout(P.laikm); ieskokDabar(); },
    psVisos: function () { clearTimeout(P.laikm); var q = $("psQ"); if (q) q.value = ""; ieskokDabar().then(function () { var r = $("psRezSk"); if (r && r.scrollIntoView) r.scrollIntoView({ block: "nearest" }); }); },
    psKur: function (el) { P.kur = el.getAttribute("data-kur"); P.rodoma = 12; doc.querySelectorAll('[data-veiksmas="psKur"]').forEach(function (m) { m.setAttribute("aria-pressed", String(m === el)); }); if (P.sar[P.org]) pieskRez(); },
    psBusena: function (el) { var b = el.getAttribute("data-b"); P.busena = b; P.rodoma = 12; pieskRez(); var m = doc.querySelector('[data-veiksmas="psBusena"][data-b="' + b + '"]'); if (m) m.focus(); },
    psOrg: function (el) {
      P.org = el.value; P.rodoma = 12; P.rasta = [];
      var v = $("psRez"); if (v) v.innerHTML = "";
      if (global.GP_BUSENA && $("psIeskaBusena")) global.GP_BUSENA.slepk("#psIeskaBusena");
      if (P.sar[P.org]) pieskRez(); else if (P.ieskota) gaukSarasa();
    },
    psDaugiau: function () {
      var buvo = P.rodoma; P.rodoma += 20; pieskRez();
      var m = doc.querySelectorAll(".ps-rz")[buvo]; if (m) m.focus();
    },
    psPasirink: function (el) { var r = P.rasta[+el.getAttribute("data-i")]; if (r) pasirink(r.x); },
    psDalis: function (el) { ATVERTA[el.getAttribute("data-dalis")] = !!el.open; },
    psPridekViesa: function (el) {
      var nr = el.getAttribute("data-nr"), p = PASIRINKTA && PASIRINKTA.abejotini.filter(function (x) { return x.nr === nr; })[0];
      if (!S || !p || !G.pridekViesaPakeitima(S, p)) return;
      issaugok(); piesk(); pranesk("Pakeitimas " + nr + " įtrauktas į ankstesnių pakeitimų sąrašą.");
    },
    psPokytis: function (el) {
      var i = +el.getAttribute("data-i"), v = G.viesiPokyciai(S).filter(function (x) { return x.i === i; })[0];
      if (!S || !v || v.siulomas == null || !S.ankstesni[i]) return;
      S.ankstesni[i].pokytis = v.siulomas; issaugok(); piesk("#" + lid("a." + i + ".pokytis"));
    },
    psForma: function (el) {
      var f = el.getAttribute("data-f");
      if (!S || !Object.prototype.hasOwnProperty.call(G.FORMOS, f)) return;
      S.sutartis.forma = f; issaugok(); piesk("#" + lid("s.forma"));
    },
    psVerte: function (el) {
      var s = S && S.sutartis, t = G.pvmTarifas();
      if (!s || s.viesaVerte == null) return;
      s.pradineVerte = el.getAttribute("data-kaip") === "bepvm" && t != null ? G.r2(s.viesaVerte / (1 + t)) : s.viesaVerte;
      issaugok(); piesk("#" + lid("s.pradineVerte"));
    },
    psTrink: function (el) { TVIRTINA = "trinti:" + el.getAttribute("data-id"); piesk(); var m = doc.querySelector('[data-veiksmas="psTrinkTikrai"]'); if (m) m.focus(); },
    psTrinkTikrai: function (el) { var id = el.getAttribute("data-id"); B.visos = B.visos.filter(function (x) { return x.id !== id; }); TVIRTINA = ""; rasyk(); piesk(); pranesk("Sutartis ištrinta iš šios naršyklės."); var m = doc.querySelector('[data-veiksmas="psNauja"]'); if (m) m.focus(); },
    psAtsaukTvirtinima: function () { TVIRTINA = ""; piesk(); },
    psAtlikta: function (el) {
      var id = el.getAttribute("data-id"), x = B.visos.filter(function (v) { return v.id === id; })[0];
      if (!x || !G.pazymekAtlikta(x, +el.getAttribute("data-a"), +el.getAttribute("data-p"), siandien())) return;
      x.keista = new Date().toISOString(); rasyk(); piesk(); pranesk("Pažymėta, kad atlikta.");
      var m = doc.querySelector('[data-veiksmas="psAtlikta"]') || doc.querySelector('[data-veiksmas="psNauja"]'); if (m) m.focus();
    },
    psEksportas: function (el) { eksportas(el.getAttribute("data-id")); },
    psImportas: function () { var f = $("psFailas"); if (f) f.click(); },
    psFailas: function (el) {
      var f = el.files && el.files[0];
      if (!f) return;
      if (f.size > 2000000) { pranesk("Failas per didelis.", "klaida"); el.value = ""; return; }
      f.text().then(function (t) { var r = importuok(t); el.value = ""; if (!r.ok) { pranesk(r.klaida || "Įkelti nepavyko.", "klaida"); return; } piesk(); pranesk("Sutartis įkelta."); });
    },
    psZingsnis: function (el) {
      var n = +el.getAttribute("data-z");
      if (n < 1 || n > 3 || !S) return;
      issaugokDabar(); ZING = n; TVIRTINA = "";
      if (ZING === 2 && !S.rengiamas.nr) S.rengiamas.nr = String(S.ankstesni.length + 1);
      piesk();
      var h = doc.querySelector("#psTurinys h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
      global.scrollTo(0, 0);
    },
    psAtgalZ: function () { VEIKSMAI.psZingsnis({ getAttribute: function () { return String(ZING - 1); } }); },
    psToliauZ: function () { VEIKSMAI.psZingsnis({ getAttribute: function () { return String(ZING + 1); } }); },
    psLaukas: function (el) {
      var r = isLauko(el);
      nustatyk(el.getAttribute("data-kelias"), r.v);
      if (r.ok) el.removeAttribute("aria-invalid");
      issaugok(); atnaujink();
    },
    psLaukasBaigtas: function (el) {
      var r = isLauko(el), k = el.getAttribute("data-kelias"), nauja = String(r.v == null ? "" : r.v);
      var pakito = !el.hasAttribute("data-buvo") || el.getAttribute("data-buvo") !== nauja;
      if (el.hasAttribute("data-buvo")) el.setAttribute("data-buvo", nauja);
      nustatyk(k, r.v); pasekmes(k, r.v, pakito);
      if (r.ok) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true");
      issaugok();
      if (el.hasAttribute("data-perpiesk")) perpieskIslaikant(el); else atnaujink();
    },
    psPridekAnkstesni: function () {
      if (S.ankstesni.length >= G.RIBOS.ankstesniu) return;
      S.ankstesni.push({ nr: String(S.ankstesni.length + 1), data: "", regNr: "", esme: "", pokytis: null, pagrindas: "", indMenuo: "", saltinis: "ranka" });
      issaugok(); piesk("#" + lid("a." + (S.ankstesni.length - 1) + ".data"));
    },
    psSalinkAnkstesni: function (el) { S.ankstesni.splice(+el.getAttribute("data-i"), 1); issaugok(); piesk('[data-veiksmas="psPridekAnkstesni"]'); },
    psPridekBloka: function (el) {
      var b = G.naujasBlokas(el.getAttribute("data-tipas"), S);
      if (!b || S.rengiamas.blokai.length >= G.RIBOS.bloku) return;
      if (b.tipas === "ind" && S.rengiamas.blokai.some(function (x) { return x.tipas === "ind"; })) { pranesk("Viename susitarime gali būti tik vienas kainos perskaičiavimas.", "ispejimas"); return; }
      S.rengiamas.blokai.push(b); issaugok(); piesk("#psB" + (S.rengiamas.blokai.length - 1));
    },
    psSalinkBloka: function (el) { S.rengiamas.blokai.splice(+el.getAttribute("data-b"), 1); issaugok(); piesk('[data-veiksmas="psPridekBloka"]'); },
    psPridekEilute: function (el) {
      var b = S.rengiamas.blokai[+el.getAttribute("data-b")];
      if (!b || b.eilutes.length >= G.RIBOS.eiluciu) return;
      b.eilutes.push({ indeksas: "", pav: "", saltinis: "", taikoma: "", suSuma: true, slenksciui: false, suma: null, pr: null, pb: null, prS: "", pbS: "" });
      issaugok(); piesk("#" + lid("b." + el.getAttribute("data-b") + ".e." + (b.eilutes.length - 1) + ".indeksas"));
    },
    psSalinkEilute: function (el) { var b = S.rengiamas.blokai[+el.getAttribute("data-b")]; if (b) { b.eilutes.splice(+el.getAttribute("data-e"), 1); issaugok(); piesk('[data-veiksmas="psPridekEilute"][data-b="' + el.getAttribute("data-b") + '"]'); } },
    psGaukIndeksus: function (el) { gaukIndeksus(+el.getAttribute("data-b")); },
    psRask: function () { rask(); },
    psEik: function (el) {
      var l = el.getAttribute("data-laukas"), m = /^b(\d+)\.(.+)$/.exec(l), k = m ? "b." + m[1] + "." + m[2] : /^a(\d+)$/.test(l) ? "a." + l.slice(1) + ".data" : l;
      var z = /^b/.test(k) ? 2 : /^(s|a)\./.test(k) ? 1 : /^r\.nr/.test(k) ? 2 : 3;
      if (z !== ZING) { ZING = z; piesk(); }
      var n = doc.querySelector('[data-kelias="' + k + '"]') || (m ? doc.querySelector('[data-kelias="b.' + m[1] + ".t." + m[2] + '"]') : null) || doc.querySelector('[data-kelias^="' + k + '"]');
      if (n) { var d = n.closest("details"); if (d) { d.open = true; if (d.hasAttribute("data-dalis")) ATVERTA[d.getAttribute("data-dalis")] = true; } n.focus(); if (n.scrollIntoView) n.scrollIntoView({ block: "center" }); }
    },
    psWord: function (el) { word(el.getAttribute("data-dok")); },
    psKopijuok: function () { if (G.kliuciu(S)) { busena("#psWordBusena", "klaida", "Pirmiausia pataisykite patikroje nurodytas vietas."); return; } if (global.GP_KOPIJA) global.GP_KOPIJA.kopijuok(DK.tekstas(G.susitarimas(S)), { sekme: "Susitarimo tekstas nukopijuotas." }); },
    psUzbaik: function () {
      if (G.patikros(S).some(function (p) { return p.lygis === "klaida"; })) return;
      TVIRTINA = "uzbaik"; piesk(); var m = doc.querySelector('[data-veiksmas="psUzbaikTikrai"]'); if (m) m.focus(); },
    psUzbaikTikrai: function () {
      TVIRTINA = "";
      if (G.uzbaik(S, { data: PASIRASYTA || S.rengiamas.data })) { S = G.sutartiesForma(S); issaugokDabar(); ZING = 1; piesk("#psKortele"); pranesk("Susitarimas įrašytas į pakeitimų sąrašą."); }
    }
  };
  if (global.GP_IVYKIAI) global.GP_IVYKIAI.veiksmai(VEIKSMAI);

  /* ---------- informacinė skiltis ---------- */
  var INFO = { lt: { title: "Kas tai ir kaip naudotis",
    purpose: "Sutarties pakeitimo (susitarimo) projektas su skaičiavimu ir pagrindimu: kainos perskaičiavimas pagal indeksą, papildomi ir atsisakomi darbai (paslaugos, prekės) su vertės ribomis, termino pratęsimas, subtiekėjai, atsakingi asmenys ir kitos sąlygos.",
    stepsTitle: "Kaip naudotis", steps: ["<b>Sutartis.</b> Įrašykite pirkimo objekto pavadinimo žodį, tiekėją ar sutarties numerį ir pasirinkite sutartį iš viešai paskelbtų - numeris, datos, kita Šalis ir paskelbti pakeitimai užpildomi patys. Belieka pasirinkti sutarties formą ir patikrinti kainą be PVM. Nepaskelbtą sutartį galima įrašyti ranka.",
      "<b>Pakeitimai.</b> Pridėkite vieną ar kelis pakeitimus ir pasirinkite pagrindą. Įrankis patikrina įstatymo sąlygas ir ribas (pakeitimų vertę, pirkimo rūšies ribą, termino pratęsimo galimybę, esminio pakeitimo požymius); kainos perskaičiavimui indeksų reikšmes gauna iš Oficialiosios statistikos portalo.",
      "<b>Dokumentai.</b> Peržiūrėkite patikrą ir atsisiųskite susitarimo projektą, skaičiavimą ir pagrindimą derinimui. Pasirašytą susitarimą įrašykite į pakeitimų sąrašą."],
    noteTitle: "Duomenys ir ribos", note: "Sutartys ir pakeitimų sąrašai saugomi <b>tik šioje naršyklėje</b>. Ieškant sutarties į G-Procure serverį siunčiamas tik pirkimo vykdytojo kodas (gaunamas jo viešai paskelbtų sutarčių sąrašas; paieškos žodžiai lieka naršyklėje), paspaudus „Rasti CVP IS duomenyse“ - tik sutarties numeris ir pirkimo vykdytojo kodas, o gaunant indeksus į Oficialiosios statistikos portalą - tik duomenų rinkinio kodas ir laikotarpis. Dirbtinis intelektas nenaudojamas. Įrankis parodo, kuriuo pagrindu remiamasi ir kokios sąlygos patikrintos, bet tai nėra teisinė išvada: projektas derinamas įprasta organizacijos tvarka. Patikros remiasi Pirkimų įstatymu, VPT Sutarčių keitimo gairėmis ir teismų praktika - prie kiekvieno pakeitimo nurodyta, kuo. Kol kas - tik Pirkimų įstatymą taikantys perkantieji subjektai." } };
  INFO.en = INFO.lt;

  function pradek() {
    skaityk();
    piesk();
    if (global.GProcureInfoPanel && $("infoPanelMount")) global.GProcureInfoPanel.mount({ target: "#infoPanelMount", moduleId: "pp-sutartys", getLang: function () { return "lt"; }, content: INFO });
    global.addEventListener("pagehide", function () { if (LAIKM) issaugokDabar(); });
  }

  global.GP_PAKEITIMAI_UI = { pradek: pradek, piesk: piesk, busena: function () { return { S: S, zingsnis: ZING, visos: B.visos, nezinoma: B.nezinoma, paieska: P, pasirinkta: PASIRINKTA }; }, atverk: atverk, gaukIndeksus: gaukIndeksus, rask: rask, word: word,
    gaukSarasa: gaukSarasa, ieskokDabar: ieskokDabar, pasirink: pasirink, naudokFetch: function (f) { P.fetch = f; P.sar = {}; P.rasta = []; P.kraunama = ""; },
    importuok: importuok, issaugokDabar: issaugokDabar, naudokSaugykla: function (s) { B.saugykla = s; skaityk(); S = null; piesk(); }, veiksmai: VEIKSMAI, isLauko: isLauko };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", pradek); else pradek();
})(typeof window !== "undefined" ? window : this);
