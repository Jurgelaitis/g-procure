/* ============================================================================
 * G-Procure  shared/nacsaug-di.js   (v1.0, 2026-11-23, saugumo auditas G-06)
 * Nacionalinio saugumo užtvara DI siuntimui (GP_NS_DI). Iki tol užtvarą turėjo tik PP-salygos, o jos atsakymą galėjo
 * užpildyti pats DI (iš paraiškos); PP-ts, PP-qual ir PP-negotiation pirkimo duomenis į DI siuntė tik su įspėjimu.
 *
 * Naudotojo sprendimai 2026-11-23:
 *   - klausimas „Ar pirkimas susijęs su nacionaliniu saugumu?“ - visuose įrankiuose, kurie siunčia pirkimo turinį į DI;
 *     DI į jį niekada neatsako, pirkimo kortelės atsakymas perimamas;
 *   - „Taip“ - DI tik po aiškaus patvirtinimo, vieną kartą šiam pirkimui (be patvirtinimo nieko nesiunčiama);
 *   - PP-tiekejams - tik paties tiekėjo įkeltiems failams: vieną kartą paklausiama, ar juose yra neviešai gautos
 *     informacijos (vieši CVP IS dokumentai siunčiami kaip iki tol).
 *
 * Užtvara tikrinama PAČIAME siuntime: shared/ai-proxy.js uzduotis() prieš siųsdamas kviečia GP_NS_DI.leisk(), kai įrankis
 * ją įjungė (ijunk). Todėl jos neapeina joks įrankio mygtukas ar automatinis siuntimas. Neįjungus (kiti įrankiai) - kaip iki tol.
 *
 *   GP_NS_DI.ijunk({ variantas: "pirkimas" | "tiekejas", ats?: () => "taip"|"ne"|null, irasyk?: (v, kilme) => void,
 *                    reikia?: () => bool })
 *       ats / irasyk - kai atsakymas gyvena įrankio lauke (PP-salygos 1 žingsnis); be jų - šio failo būsenoje.
 *       reikia - ar užtvara taikoma dabartiniam siuntimui (PP-tiekejams: tik kai yra paties įkeltų failų).
 *   GP_NS_DI.ats()                      -> "taip" | "ne" | null
 *   GP_NS_DI.nustatyk(v, kilme)          kilme: "zmogus" | "kortele" (kortelės atsakymą įvedė žmogus kortelėje ar plane)
 *   GP_NS_DI.galima()                    -> ar siųsti galima be klausimo
 *   GP_NS_DI.leisk({ signal })           -> Promise<bool>: kai negalima - langas su klausimu ar patvirtinimu
 *   GP_NS_DI.priezastis()                -> kodėl nesiųsta (tekstas klaidos pranešimui)
 *   GP_NS_DI.isvalyk()                   naujas pirkimas (ar PP-tiekejams - nauji paties įkelti failai)
 *   GP_NS_DI.busena() / atkurk(b)        juodraščiui (PP-salygos): { ats, kilme, patvirtinta }
 *   GP_NS_DI.mount(vieta, { id, klase })  klausimas įrankio juostoje (sąrašas Ne / Taip ir būsena; klase - įrankio sąrašo stilius), sinchronizuojamas
 *   GP_NS_DI.klausyk(fn)                 pasikeitus atsakymui ar patvirtinimui
 *
 * Langas - naršyklės <dialog> (Esc ir „Nesiųsti“ - nesiunčiama; fokusas grąžinamas - shared/prieinamumas.js). LT / EN pagal
 * <html lang>. Nieko nesaugo ir nesiunčia. Testai - shared/testai.html („Nacionalinio saugumo užtvara DI“) ir įrankių testai.
 * ========================================================================== */
(function (global) {
  "use strict";
  var doc = global.document;
  if (!doc || global.GP_NS_DI) return;

  var CFG = null;
  var B = { ats: null, kilme: null, patvirtinta: false, matyta: undefined };
  var KLAUSYTOJAI = [];
  var LAUKIA = null;            // atviras langas: { dlg, pazadai: [resolve...] } - keli siuntimai vienu metu gauna tą patį atsakymą
  var NUTRAUKTA = "";           // paskutinė priežastis, kodėl nesiųsta

  var T = {
    lt: {
      pirkimas: {
        klaus: "Ar pirkimas susijęs su nacionaliniu saugumu?",
        klausP: "Prieš siunčiant šio pirkimo duomenis į DI, atsakykite į šį klausimą. DI į jį neatsako. Jei pirkimas susijęs su nacionaliniu saugumu, siųsti galėsite tik patvirtinę.",
        ne: "Ne, nesusijęs", taip: "Taip, susijęs",
        patv: "Pirkimas susijęs su nacionaliniu saugumu",
        patvP: "Siunčiant į DI, šio pirkimo duomenys (pvz., techninė specifikacija, numatoma vertė ar dokumentų tekstas) keliaus per G-Procure serverį į DI paslaugą Claude (Anthropic, JAV). Siųskite tik tada, kai tai leidžia jūsų organizacijos tvarka, ir nesiųskite įslaptintos informacijos. Patvirtinimas galioja šiam pirkimui.",
        neatsakyta: "Nesiųsta į DI: neatsakyta, ar pirkimas susijęs su nacionaliniu saugumu.",
        nepatvirtinta: "Nesiųsta į DI: pirkimas susijęs su nacionaliniu saugumu, o siuntimas nepatvirtintas.",
        lauk: "Pirkimas susijęs su nacionaliniu saugumu",
        bTaipP: "DI siuntimas šiam pirkimui patvirtintas.", bTaip: "Prieš siunčiant į DI bus paprašyta patvirtinti.",
        bNull: "Prieš pirmą siuntimą į DI bus paklausta.", kort: " (iš pirkimo kortelės)"
      },
      tiekejas: {
        klaus: "Ar jūsų įkeltuose failuose yra neviešai gautos informacijos?",
        klausP: "Pavyzdžiui, dokumentai, gauti pasirašius konfidencialumo įsipareigojimą, ar dokumentai, kuriuos CVP IS rodo tik prisijungusiems. Vieši CVP IS dokumentai į DI siunčiami be šio klausimo.",
        ne: "Ne", taip: "Taip",
        patv: "Įkeltuose failuose yra neviešai gautos informacijos",
        patvP: "Užduodant klausimą, ištraukos iš jūsų įkeltų failų keliaus per G-Procure serverį į DI paslaugą Claude (Anthropic, JAV). Siųskite tik tada, kai tai leidžia konfidencialumo įsipareigojimas ar kitos sąlygos. Patvirtinimas galioja, kol įkelsite naujų failų.",
        neatsakyta: "Nesiųsta į DI: neatsakyta, ar įkeltuose failuose yra neviešai gautos informacijos.",
        nepatvirtinta: "Nesiųsta į DI: įkeltuose failuose yra neviešai gautos informacijos, o siuntimas nepatvirtintas.",
        lauk: "Įkeltuose failuose yra neviešai gautos informacijos",
        bTaipP: "DI siuntimas patvirtintas.", bTaip: "Prieš siunčiant į DI bus paprašyta patvirtinti.",
        bNull: "Prieš pirmą siuntimą į DI bus paklausta.", kort: ""
      },
      siusti: "Patvirtinu ir siunčiu", nesiusti: "Nesiųsti", neats: "- neatsakyta -", ne1: "Ne", taip1: "Taip",
      atsaukti: "Atšaukti patvirtinimą"
    },
    en: {
      pirkimas: {
        klaus: "Is the procurement related to national security?",
        klausP: "Answer this question before the data of this procurement is sent to AI. AI does not answer it. If the procurement is related to national security, you will be able to send it only after confirming.",
        ne: "No, it is not", taip: "Yes, it is",
        patv: "The procurement is related to national security",
        patvP: "If sent to AI, the data of this procurement (e.g. the technical specification, the estimated value or document text) will go through the G-Procure server to the AI service Claude (Anthropic, USA). Send it only if your organisation's rules allow it, and do not send classified information. The confirmation applies to this procurement.",
        neatsakyta: "Not sent to AI: it has not been answered whether the procurement is related to national security.",
        nepatvirtinta: "Not sent to AI: the procurement is related to national security and sending has not been confirmed.",
        lauk: "Procurement related to national security",
        bTaipP: "Sending to AI is confirmed for this procurement.", bTaip: "You will be asked to confirm before anything is sent to AI.",
        bNull: "You will be asked before the first sending to AI.", kort: " (from the procurement card)"
      },
      tiekejas: {
        klaus: "Do your uploaded files contain information that is not public?",
        klausP: "For example, documents received after signing a confidentiality undertaking, or documents that CPP IS shows only to logged-in users. Public CPP IS documents are sent to AI without this question.",
        ne: "No", taip: "Yes",
        patv: "Your uploaded files contain information that is not public",
        patvP: "When you ask a question, excerpts from your uploaded files will go through the G-Procure server to the AI service Claude (Anthropic, USA). Send them only if your confidentiality undertaking or other conditions allow it. The confirmation applies until you upload new files.",
        neatsakyta: "Not sent to AI: it has not been answered whether your uploaded files contain information that is not public.",
        nepatvirtinta: "Not sent to AI: your uploaded files contain information that is not public and sending has not been confirmed.",
        lauk: "Uploaded files contain non-public information",
        bTaipP: "Sending to AI is confirmed.", bTaip: "You will be asked to confirm before anything is sent to AI.",
        bNull: "You will be asked before the first sending to AI.", kort: ""
      },
      siusti: "Confirm and send", nesiusti: "Do not send", neats: "- not answered -", ne1: "No", taip1: "Yes",
      atsaukti: "Withdraw confirmation"
    }
  };

  function kalba() { return /^en/i.test(doc.documentElement.getAttribute("lang") || "") ? "en" : "lt"; }
  function tx() { var k = T[kalba()]; return { v: k[(CFG && CFG.variantas) || "pirkimas"], b: k }; }
  function tinkama(v) { return v === "taip" || v === "ne" ? v : null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function ats() {
    var v = CFG && CFG.ats ? tinkama(CFG.ats()) : B.ats;
    // atsakymas pasikeitė (ir įrankio lauke) - ankstesnis patvirtinimas nebegalioja
    if (B.matyta !== undefined && v !== B.matyta) B.patvirtinta = false;
    B.matyta = v;
    return v;
  }
  function prane() {
    var b = busena();
    KLAUSYTOJAI.slice().forEach(function (f) { try { f(b); } catch (e) {} });
  }
  function busena() { var v = ats(); return { ats: v, kilme: v ? (CFG && CFG.ats ? (B.kilme || "zmogus") : B.kilme) : null, patvirtinta: v === "taip" && B.patvirtinta }; }

  function nustatyk(v, kilme) {
    v = tinkama(v);
    if (CFG && CFG.irasyk) CFG.irasyk(v, kilme || "zmogus");
    B.ats = v; B.kilme = v ? (kilme === "kortele" ? "kortele" : "zmogus") : null;
    ats();
    prane();
  }
  function reikia() { return !CFG ? false : (typeof CFG.reikia === "function" ? !!CFG.reikia() : true); }
  function galima() {
    if (!CFG || !reikia()) return true;
    var v = ats();
    return v === "ne" || (v === "taip" && B.patvirtinta);
  }
  function priezastis() { return NUTRAUKTA || tx().v.neatsakyta; }

  /* ---- Langas ---- */
  var STILIUS = ".gpns-dlg{border:1px solid var(--color-graphite-15,#d5d7da);border-radius:12px;padding:20px;max-width:min(520px,calc(100vw - 32px));"
    + "color:var(--color-graphite,#2e3641);background:#fff;font-family:var(--font-base,inherit);box-shadow:0 12px 40px rgba(0,0,0,.2)}"
    + ".gpns-dlg::backdrop{background:rgba(20,24,30,.45)}"
    + ".gpns-dlg h2{font-size:18px;line-height:1.3;margin:0 0 8px;font-weight:700}"
    + ".gpns-dlg p{font-size:14px;line-height:1.5;margin:0 0 16px}"
    + ".gpns-mygt{display:flex;flex-wrap:wrap;gap:8px}"
    + ".gpns-mygt button{font:inherit;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;cursor:pointer;border:1px solid var(--color-graphite-30,#abafb3);background:#fff;color:var(--color-graphite,#2e3641)}"
    + ".gpns-mygt button.gpns-pagr{background:var(--color-emerald-strong,#007554);border-color:var(--color-emerald-strong,#007554);color:#fff}"
    + ".gpns-mygt button.gpns-pagr:hover{background:var(--color-emerald-strong-hover,#006649)}"
    + ".gpns-juosta{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:13px}"
    + ".gpns-juosta label{font-weight:700}"
    + ".gpns-juosta select{font:inherit;font-size:13px;max-width:100%}"
    + ".gpns-p{color:var(--color-graphite-50-strong,#5b6470)}"
    + ".gpns-juosta button{font:inherit;font-size:13px;background:none;border:0;padding:0;color:var(--color-emerald-strong,#007554);text-decoration:underline;cursor:pointer}"
    + "@media print{.gpns-dlg,.gpns-juosta{display:none}}";
  function stilius() {
    if (doc.getElementById("gpns-stilius")) return;
    var s = doc.createElement("style"); s.id = "gpns-stilius"; s.textContent = STILIUS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  function baik(rez) {
    var L = LAUKIA; LAUKIA = null;
    if (!L) return;
    try { if (L.dlg.open) L.dlg.close(); } catch (e) {}
    if (L.dlg.parentNode) L.dlg.parentNode.removeChild(L.dlg);
    L.pazadai.forEach(function (f) { f(rez); });
  }
  function piesk(dlg, zingsnis) {
    var t = tx();
    var id = "gpns-a-" + zingsnis;
    if (zingsnis === "klaus") {
      dlg.innerHTML = '<h2 id="' + id + '">' + esc(t.v.klaus) + '</h2><p id="' + id + 'p">' + esc(t.v.klausP) + "</p>"
        + '<div class="gpns-mygt"><button type="button" data-gpns="ne">' + esc(t.v.ne) + '</button><button type="button" data-gpns="taip">'
        + esc(t.v.taip) + '</button><button type="button" data-gpns="nesiusti">' + esc(t.b.nesiusti) + "</button></div>";
    } else {
      dlg.innerHTML = '<h2 id="' + id + '">' + esc(t.v.patv) + '</h2><p id="' + id + 'p">' + esc(t.v.patvP) + "</p>"
        + '<div class="gpns-mygt"><button type="button" class="gpns-pagr" data-gpns="patvirtinu">' + esc(t.b.siusti) + '</button>'
        + '<button type="button" data-gpns="nesiusti">' + esc(t.b.nesiusti) + "</button></div>";
    }
    dlg.setAttribute("aria-labelledby", id); dlg.setAttribute("aria-describedby", id + "p");
    dlg.setAttribute("data-gpns-zingsnis", zingsnis);
    var pirmas = dlg.querySelector("button");
    if (pirmas) pirmas.focus();
  }
  function atverk() {
    stilius();
    var dlg = doc.createElement("dialog");
    dlg.className = "gpns-dlg";
    dlg.setAttribute("data-gpns-langas", "");
    doc.body.appendChild(dlg);
    LAUKIA = { dlg: dlg, pazadai: [] };
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); NUTRAUKTA = ats() === "taip" ? tx().v.nepatvirtinta : tx().v.neatsakyta; baik(false); });
    dlg.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-gpns]");
      if (!b) return;
      var k = b.getAttribute("data-gpns");
      if (k === "ne") { nustatyk("ne", "zmogus"); baik(true); }
      else if (k === "taip") { nustatyk("taip", "zmogus"); piesk(dlg, "patv"); }
      else if (k === "patvirtinu") { B.patvirtinta = true; ats(); prane(); baik(true); }
      else { NUTRAUKTA = ats() === "taip" ? tx().v.nepatvirtinta : tx().v.neatsakyta; baik(false); }
    });
    piesk(dlg, ats() === "taip" ? "patv" : "klaus");
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    var pirmas = dlg.querySelector("button"); if (pirmas) pirmas.focus();
    return LAUKIA;
  }

  function leisk(o) {
    o = o || {};
    if (galima()) return Promise.resolve(true);
    var signal = o.signal;
    if (signal && signal.aborted) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var L = LAUKIA || atverk();
      L.pazadai.push(resolve);
      if (signal) signal.addEventListener("abort", function () { if (LAUKIA === L) baik(false); else resolve(false); }, { once: true });
    });
  }

  function isvalyk() {
    if (LAUKIA) { NUTRAUKTA = tx().v.neatsakyta; baik(false); }
    B.patvirtinta = false; B.ats = null; B.kilme = null;
    if (CFG && CFG.irasyk && !CFG.ats) CFG.irasyk(null, "zmogus");
    ats(); prane();
  }
  function atkurk(b) {
    if (!b || typeof b !== "object") return;
    if (!(CFG && CFG.ats)) { B.ats = tinkama(b.ats); B.kilme = B.ats ? (b.kilme === "kortele" ? "kortele" : "zmogus") : null; }
    B.matyta = ats();
    B.patvirtinta = !!b.patvirtinta && B.matyta === "taip";
    prane();
  }

  /* ---- Klausimas įrankio juostoje ---- */
  var SKAIT = 0;
  function mount(vieta, o) {
    var el = typeof vieta === "string" ? doc.querySelector(vieta) : vieta;
    if (!el) return null;
    stilius();
    o = o || {};
    var id = o.id || ("gpns-s-" + (++SKAIT));
    el.classList.add("gpns-juosta");
    el.setAttribute("data-darbas-ne", "");
    function nupiesk() {
      var t = tx(), b = busena();
      var p = b.ats === "taip" ? (b.patvirtinta ? t.v.bTaipP : t.v.bTaip) : b.ats === "ne" ? "" : t.v.bNull;
      if (b.ats && b.kilme === "kortele") p = (p ? p + " " : "") + t.v.kort.trim();
      var fokusas = doc.activeElement && el.contains(doc.activeElement) ? doc.activeElement.getAttribute("data-gpns-el") : null;
      el.innerHTML = '<label for="' + id + '">' + esc(t.v.lauk) + "</label>"
        + '<select id="' + id + '"' + (o.klase ? ' class="' + esc(o.klase) + '"' : "") + ' data-gpns-el="s" aria-describedby="' + id + 'p"><option value="">' + esc(t.b.neats) + '</option><option value="ne"'
        + (b.ats === "ne" ? " selected" : "") + ">" + esc(t.b.ne1) + '</option><option value="taip"' + (b.ats === "taip" ? " selected" : "") + ">"
        + esc(t.b.taip1) + "</option></select>"
        + '<span class="gpns-p" id="' + id + 'p">' + esc(p) + "</span>"
        + (b.patvirtinta ? '<button type="button" data-gpns-el="a">' + esc(t.b.atsaukti) + "</button>" : "");
      if (fokusas) { var f = el.querySelector('[data-gpns-el="' + fokusas + '"]') || el.querySelector("select"); if (f) f.focus(); }
    }
    el.addEventListener("change", function (e) {
      if (e.target && e.target.getAttribute("data-gpns-el") === "s") nustatyk(e.target.value || null, "zmogus");
    });
    el.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-gpns-el") === "a") { B.patvirtinta = false; prane(); }
    });
    KLAUSYTOJAI.push(nupiesk);
    new MutationObserver(nupiesk).observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"] });
    nupiesk();
    return { perpiesk: nupiesk };
  }

  global.GP_NS_DI = {
    ijunk: function (cfg) { CFG = cfg || {}; B.matyta = undefined; ats(); prane(); },
    aktyvus: function () { return !!CFG; },
    ats: ats, nustatyk: nustatyk, galima: galima, leisk: leisk, priezastis: priezastis,
    isvalyk: isvalyk, busena: busena, atkurk: atkurk, mount: mount,
    atnaujink: function () { ats(); prane(); },
    klausyk: function (f) { if (typeof f === "function") KLAUSYTOJAI.push(f); },
    // testams ir PP-salygos juodraščiui: atviras langas
    langas: function () { return LAUKIA ? LAUKIA.dlg : null; }
  };
})(typeof window !== "undefined" ? window : this);
