/*
 * PP-salygos: pirkimo sąlygų juodraštis (GP_JUODRASTIS, 2026-10-15; naudotojo pasiūlymas - parengti pirkimo sąlygas, padaryti pauzę
 * ir vėliau tęsti sutarties projektą neprarandant atsakymų).
 *
 * Iki tol modulis nieko nesaugojo: perkrovus puslapį ar uždarius skirtuką visi atsakymai dingdavo (GP_DARBAS tik įspėdavo).
 * Dabar darbas automatiškai saugomas juodraštyje TIK šioje naršyklėje (localStorage, per GP_SAUGYKLA) - kaip pirkimų kortelės:
 * niekur nesiunčiamas, patenka į atsarginę kopiją (shared/backup.js), aprašytas privatumas.html. Juodraštyje yra numatoma vertė ir
 * kiti pirkimo duomenys, todėl failu atsisiųstą juodraštį laikykite kaip pirkimo dokumentus (ne tiekėjams).
 *
 *   GP_JUODRASTIS.mount({ sarasas, busena, zyma, surink, meta, sritis, darbas })
 *     sarasas  - vieta juodraščių sąrašui (dabartinis - pirmas su „Atsisiųsti“ ir „Ištrinti“, kiti - su „Tęsti“; rodomas, kai juodraščių yra)
 *     zyma     - antraštės žyma (trumpa būsena: „Juodraštis išsaugotas 14:32“, „Juodraštis neišsaugotas“; 2026-10-15 - vietoj modulio žymų)
 *     busena   - vieta problemoms po žingsniais (išsaugoti nepavyko - priežastis ir „Atsisiųsti juodraštį“; kitas skirtukas); kitaip tuščia
 *     surink() -> duomenys (JSON objektas; tas pats objektas -> tas pats juodraštis - lyginama eilute)
 *     meta()   -> { pavadinimas, kortele, numeris, etapas, etapoPav } - sąrašui
 *     sritis   - elementas, kurio naudotojo veiksmai (input / change / click) pradeda juodraštį ir jį išsaugo
 *     onAtkurk(irasas) - puslapis atkuria juodraštį (kviečiama, kai adrese yra ?juodrastis=<id>)
 *   -> { issaugok(), pakeista(), dabartinis(), irasas(id), sarasas(), trink(id), naudokSaugykla(s), failas(irasas), isFailo(tekstas) }
 *
 * Principai:
 *  - juodraštis sukuriamas tik po tikro naudotojo veiksmo (vien atvertas puslapis juodraščio nekuria);
 *  - „Išsaugota“ rodoma tik pavykus įrašyti; nepavykus - priežastis ir „Atsisiųsti juodraštį“ (darbas lieka tik šiame lange);
 *  - kiekvienas juodraštis - atskiras raktas (PREF + id), todėl du skirtukai su skirtingais pirkimais vienas kito nepaliečia, o tas pats
 *    juodraštis dviejuose skirtukuose neperrašomas tyliai (GP_SAUGYKLA kitasSkirtukas - juosta su „Perkrauti“);
 *  - neperskaitomas juodraštis rodomas kaip neperskaitomas (ne dingsta), jo kopija - GP_SAUGYKLA „.sugadinta-“;
 *  - tęsiama švariame puslapyje (adresas ?juodrastis=<id>): dabartinis darbas prieš tai išsaugomas savo juodraštyje;
 *  - sugeneruoti dokumentai juodraštyje nesaugomi - atkūrus juos reikia sugeneruoti iš naujo (puslapis tai sako);
 *  - failas: { tipas: TIPAS, schema, eksportuota, juodrastis } - įkeliamas tik patikrintas, visas tekstas į HTML - per esc().
 */
(function (global) {
  "use strict";
  var doc = global.document;
  var PREF = "gprocure.salygos.juodrastis.";
  var SCHEMA = 1;
  var TIPAS = "g-procure/pp-salygos-juodrastis";
  var PAV = "Pirkimo sąlygų juodraštis";
  var DELSA = 700;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel) { return typeof sel === "string" ? doc.querySelector(sel) : sel; }
  function p2(n) { return String(n).padStart(2, "0"); }
  function laikas(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var siandien = global.GP_EKSPORTAS ? global.GP_EKSPORTAS.siandien() : "";
    var data = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
    return (data === siandien ? "" : data + " ") + p2(d.getHours()) + ":" + p2(d.getMinutes());
  }
  function naujasId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  /* antraštės žymai: šiandien - tik laikas, kitaip - tik data (plotis - kaip ilgiausio teksto) */
  function laikasTrumpas(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var siandien = global.GP_EKSPORTAS ? global.GP_EKSPORTAS.siandien() : "";
    var data = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
    return data === siandien ? p2(d.getHours()) + ":" + p2(d.getMinutes()) : data;
  }

  var SAUG = null;                         // testams - paduota saugykla (tada kitų skirtukų patikros nėra)
  function saug() { if (SAUG) return SAUG; try { return global.localStorage; } catch (e) { return null; } }
  function o(extra) { var x = { tikrink: tikrink, kitasSkirtukas: PAV }; if (SAUG) x.saugykla = SAUG; for (var k in extra) x[k] = extra[k]; return x; }

  /* Įrašo forma: true arba priežastis (sugadintu laikomas ne tos formos JSON, o ne tuščias) */
  function tikrink(r) {
    if (!r || typeof r !== "object" || Array.isArray(r)) return "ne objektas";
    if (r.schema !== SCHEMA) return "nežinoma schema (" + esc(r.schema) + ")";
    if (typeof r.id !== "string" || !/^[a-z0-9]{4,40}$/.test(r.id)) return "netinkamas identifikatorius";
    if (!r.duomenys || typeof r.duomenys !== "object" || Array.isArray(r.duomenys)) return "nėra duomenų";
    if (!r.meta || typeof r.meta !== "object") return "nėra aprašo";
    return true;
  }

  function raktai() {
    var s = saug(), out = [];
    if (!s) return null;
    try {
      for (var i = 0; i < s.length; i++) {
        var k = s.key(i);
        if (k && k.indexOf(PREF) === 0 && k.indexOf(".sugadinta-") < 0) out.push(k);
      }
    } catch (e) { return null; }
    return out;
  }
  /* Visi šios naršyklės juodraščiai: { busena: "yra" | "sugadinta" | "neprieinama", id, irasas, klaida }, naujausi pirmi */
  function sarasas() {
    var k = raktai();
    if (k === null) return { busena: "neprieinama", juodrasciai: [] };
    var out = k.map(function (raktas) {
      var id = raktas.slice(PREF.length);
      var r = global.GP_SAUGYKLA.skaityk(raktas, SAUG ? { tikrink: tikrink, saugykla: SAUG } : { tikrink: tikrink });
      return { id: id, raktas: raktas, busena: r.busena, irasas: r.busena === "yra" ? r.reiksme : null, klaida: r.klaida || "" };
    }).filter(function (x) { return x.busena !== "nera"; });
    out.sort(function (a, b) { return String((b.irasas || {}).keista || "").localeCompare(String((a.irasas || {}).keista || "")); });
    return { busena: "yra", juodrasciai: out };
  }
  function skaityk(id) { return global.GP_SAUGYKLA.skaityk(PREF + id, o()); }
  function rasyk(irasas) { return global.GP_SAUGYKLA.rasyk(PREF + irasas.id, irasas, o()); }
  function trink(id) {
    var s = saug();
    try { if (s) s.removeItem(PREF + id); return true; } catch (e) { return false; }
  }

  /* Failas: tas pats įrašas su tipu - kad netyčia neįkeltumėte kito modulio JSON */
  function failas(irasas) {
    return JSON.stringify({ tipas: TIPAS, schema: SCHEMA, eksportuota: new Date().toISOString(),
      pastaba: "G-Procure PP-salygos juodraštis: jame yra numatoma vertė ir kiti pirkimo duomenys - neperduokite tiekėjams.", juodrastis: irasas }, null, 2);
  }
  function isFailo(tekstas) {
    var j;
    try { j = JSON.parse(tekstas); } catch (e) { return { ok: false, klaida: "failas nėra JSON" }; }
    if (!j || j.tipas !== TIPAS) return { ok: false, klaida: "tai ne pirkimo sąlygų juodraščio failas" };
    if (j.schema !== SCHEMA) return { ok: false, klaida: "failas parengtas kitos versijos moduliu (schema " + esc(j.schema) + ")" };
    var t = tikrink(j.juodrastis);
    if (t !== true) return { ok: false, klaida: "juodraštis faile netinkamas: " + t };
    return { ok: true, irasas: j.juodrastis };
  }
  function atsisiusk(irasas) {
    var blob = new global.Blob([failas(irasas)], { type: "application/json" });
    var a = doc.createElement("a"), url = global.URL.createObjectURL(blob);
    a.href = url;
    a.download = global.GP_EKSPORTAS ? global.GP_EKSPORTAS.failoVardas({ numeris: (irasas.meta || {}).numeris || "", dokumentas: "Sąlygų-juodraštis",
      pavadinimas: (irasas.meta || {}).pavadinimas || "", pletinys: "json" }) : "salygu-juodrastis.json";
    doc.body.appendChild(a); a.click(); a.remove();
    global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
    return a.download;
  }

  function mount(cfg) {
    var dabar = null, irasas = null, paskutinis = null, pradeta = false, laikmatis = null, busena = { kodas: "nera" }, klausti = null, rodytiSar = false;
    var sarEl = $(cfg.sarasas), busEl = $(cfg.busena), zymaEl = $(cfg.zyma), sritis = $(cfg.sritis);
    var param = (global.location.search.match(/[?&]juodrastis=([a-z0-9]{4,40})/) || [])[1] || null;
    // atverta iš pirkimo kortelės (?kortele=<id>, pvz. „Mano pirkimai“) - tos kortelės juodraščiai sąraše pirmi ir pažymėti
    var korteleParam = (global.location.search.match(/[?&]kortele=([^&#]+)/) || [])[1] || null;
    try { if (korteleParam) korteleParam = decodeURIComponent(korteleParam); } catch (e) { korteleParam = null; }

    var problema = function () { return busena.kodas === "klaida" || busena.kodas === "kitas-skirtukas"; };
    function zymosTekstas() {
      var b = busena;
      if (b.kodas === "issaugota" || b.kodas === "atkurtas") return "Juodraštis išsaugotas " + laikasTrumpas(b.kada);
      if (b.kodas === "saugoma") return "Išsaugoma...";
      if (problema()) return "Juodraštis neišsaugotas";
      return "Juodraštis dar nepradėtas";
    }
    function tekstoBusena() {
      var b = busena;
      if (b.kodas === "kitas-skirtukas") return '<span class="jd-kl" role="alert">Šį juodraštį pakeitė kitas skirtukas - šio lango pakeitimai neįrašyti, kad neperrašytų ' +
        "kito skirtuko darbo. Perkraukite puslapį ir tęskite juodraštį (bus atvertas naujausias) arba atsisiųskite šio lango juodraštį failu.</span>";
      if (b.kodas === "klaida") return '<span class="jd-kl" role="alert">Juodraščio išsaugoti nepavyko: ' + esc(b.klaida) +
        ". Atsakymai lieka tik šiame lange - atsisiųskite juodraštį failu, kad jų neprarastumėte.</span>";
      return "";
    }
    /* antraštės žyma - visada (trumpa būsena); po žingsniais - tik problema su „Atsisiųsti juodraštį“ */
    function pieskBusena() {
      if (zymaEl) {
        var zt = zymaEl.querySelector("[data-jd-zyma]") || zymaEl;
        zt.textContent = zymosTekstas();
        zymaEl.classList.toggle("header-zyma--klaida", problema());
      }
      if (!busEl) return;
      busEl.innerHTML = problema()
        ? '<div class="jd-b" id="jdB">' + tekstoBusena() + ' <span class="jd-v"><button type="button" class="sec jd-mz" data-jd="atsisiusti">Atsisiųsti juodraštį</button></span></div>'
        : "";
    }
    function etapoTekstas(m) { return m && m.etapoPav ? m.etapoPav : ""; }
    function pieskSarasa() {
      if (!sarEl) return;
      var S = sarasas(), kiti = S.juodrasciai.filter(function (x) { return x.id !== dabar; });
      var sios = function (x) { return !!(korteleParam && x.irasas && x.irasas.meta && x.irasas.meta.kortele === korteleParam); };
      kiti.sort(function (a, b) { return sios(b) - sios(a); });
      if (S.busena === "neprieinama") {
        sarEl.innerHTML = '<div class="jd-sar jd-sar--kl" role="status">Naršyklės saugykla neprieinama: juodraščiai neišsaugomi ir neparodomi. Darbą galite atsisiųsti failu.</div>';
        return;
      }
      var ikelti = '<button type="button" class="sec jd-mz" data-jd="ikelti">Įkelti juodraštį iš failo</button>' +
        '<input type="file" id="jdFailas" accept=".json,application/json" hidden aria-label="Juodraščio failas (JSON)">';
      if (!kiti.length && !dabar) { sarEl.innerHTML = '<div class="jd-sar jd-sar--tuscias">' + ikelti + "</div>"; return; }
      // dabartinis juodraštis - pirmas: „Atsisiųsti“ ir „Ištrinti“ (su patvirtinimu) čia, ne po žingsniais (2026-10-15)
      var dab = "";
      if (dabar) {
        var md = (irasas && irasas.meta) || {};
        dab = '<li class="jd-e jd-e--dabar"><span class="jd-e-t"><b>' + (md.pavadinimas ? esc(md.pavadinimas) : "<i>be pavadinimo</i>") + '</b> <span class="jd-e-z">šis pirkimas</span>' +
          '<span class="jd-e-m">' + [md.numeris ? "Nr. " + esc(md.numeris) : "", irasas && irasas.keista ? (busena.kodas === "klaida" || busena.kodas === "kitas-skirtukas" ? "neišsaugota" : "išsaugota " + esc(laikas(irasas.keista))) : ""].filter(Boolean).join(" · ") +
          "</span></span><span class=\"jd-v\"><button type=\"button\" class=\"sec jd-mz\" data-jd=\"atsisiusti\">Atsisiųsti</button>" +
          (klausti === "trinti-dabar"
            ? ' <span class="jd-kl-t">Ištrinti šį juodraštį? Atsakymai liks tik šiame lange.</span> <button type="button" class="sec jd-mz" data-jd="trinti-dabar-taip">Taip, ištrinti</button>' +
              ' <button type="button" class="sec jd-mz" data-jd="trinti-ne">Ne</button>'
            : ' <button type="button" class="sec jd-mz" data-jd="trinti-dabar">Ištrinti</button>') + "</span></li>";
      }
      var eil = dab + kiti.map(function (x) {
        var r = x.irasas, m = (r && r.meta) || {};
        if (x.busena !== "yra")
          return '<li class="jd-e"><span class="jd-e-t"><b>Neperskaitomas juodraštis</b> <span class="jd-e-m">' + esc(x.klaida || x.busena) +
            " - jis paliktas saugykloje (kopija - atsarginėje kopijoje)</span></span>" +
            (klausti === "trinti:" + x.id
              ? ' <span class="jd-v"><span class="jd-kl-t">Ištrinti?</span> <button type="button" class="sec jd-mz" data-jd="trinti-taip" data-id="' + esc(x.id) + '">Taip, ištrinti</button>' +
                ' <button type="button" class="sec jd-mz" data-jd="trinti-ne">Ne</button></span>'
              : ' <span class="jd-v"><button type="button" class="sec jd-mz" data-jd="trinti" data-id="' + esc(x.id) + '">Ištrinti</button></span>') + "</li>";
        var pav = m.pavadinimas ? esc(m.pavadinimas) : "<i>be pavadinimo</i>";
        return '<li class="jd-e' + (sios(x) ? " jd-e--sios" : "") + '"><span class="jd-e-t"><b>' + pav + "</b>" + (sios(x) ? ' <span class="jd-e-z">šio pirkimo kortelė</span>' : "") + '<span class="jd-e-m">' +
          [m.numeris ? "Nr. " + esc(m.numeris) : "", esc(etapoTekstas(m)), "išsaugota " + esc(laikas(r.keista))].filter(Boolean).join(" · ") + "</span></span>" +
          '<span class="jd-v"><button type="button" class="jd-mz" data-jd="testi" data-id="' + esc(x.id) + '" aria-label="Tęsti - ' + (m.pavadinimas ? esc(m.pavadinimas) : "juodraštis be pavadinimo") + '">Tęsti</button>' +
          ' <button type="button" class="sec jd-mz" data-jd="atsisiusti" data-id="' + esc(x.id) + '">Atsisiųsti</button>' +
          (klausti === "trinti:" + x.id
            ? ' <span class="jd-kl-t">Ištrinti?</span> <button type="button" class="sec jd-mz" data-jd="trinti-taip" data-id="' + esc(x.id) + '">Taip, ištrinti</button>' +
              ' <button type="button" class="sec jd-mz" data-jd="trinti-ne">Ne</button>'
            : ' <button type="button" class="sec jd-mz" data-jd="trinti" data-id="' + esc(x.id) + '">Ištrinti</button>') + "</span></li>";
      }).join("");
      var antr = dabar ? "Juodraščiai šioje naršyklėje (" + (kiti.length + 1) + ")" : "Neužbaigti pirkimo sąlygų juodraščiai šioje naršyklėje (" + kiti.length + ")";
      sarEl.innerHTML = '<details class="jd-sar" id="jdSar"' + (dabar && !rodytiSar ? "" : " open") + '><summary><h2 class="jd-sar-h">' + antr + "</h2></summary>" +
        '<div class="hint">Juodraštis saugomas tik šioje naršyklėje: niekur nesiunčiamas, patenka į atsarginę kopiją. Jame yra numatoma vertė - ' +
        "atsisiųstą failą laikykite kaip pirkimo dokumentus. Tęsiant atveriamas atskiras puslapis; dabartinis darbas prieš tai išsaugomas.</div>" +
        '<ul class="jd-l">' + eil + "</ul>" + ikelti + '<div id="jdSarBusena" role="status"></div></details>';
    }
    function pranesk(t, tipas) { if (global.GP_PRANESIMAS) global.GP_PRANESIMAS.rodyk(t, { tipas: tipas || "info" }); }

    /* priverstinai - „Išsaugoti ir tęsti vėliau“: juodraštis sukuriamas ir be ankstesnių įvesčių */
    function issaugok(x) {
      clearTimeout(laikmatis); laikmatis = null;
      if (x && x.priverstinai) pradeta = true;
      if (!dabar && !pradeta) return { ok: false, kodas: "nepradeta" };
      if (busena.kodas === "kitas-skirtukas") return { ok: false, kodas: "kitas-skirtukas" };
      var d;
      try { d = cfg.surink(); } catch (e) { busena = { kodas: "klaida", klaida: "nepavyko surinkti atsakymų (" + ((e && e.message) || e) + ")" }; pieskBusena(); return { ok: false }; }
      var s = JSON.stringify(d);
      if (dabar && s === paskutinis) return { ok: true, kodas: "nepakito" };
      var buvo = !!dabar;
      if (!dabar) dabar = naujasId();
      var dabarKada = new Date().toISOString();
      var naujas = { schema: SCHEMA, id: dabar, sukurta: (irasas && irasas.sukurta) || dabarKada, keista: dabarKada, meta: cfg.meta ? cfg.meta() : {}, duomenys: d };
      var w = rasyk(naujas);
      if (w.ok) {
        irasas = naujas; paskutinis = s;
        busena = { kodas: "issaugota", kada: dabarKada };
        if (cfg.darbas) cfg.darbas();
      } else if (w.kodas === "kitas-skirtukas") {
        busena = { kodas: "kitas-skirtukas" };
        irasas = naujas;                           // atsisiųsti galima šio lango versiją
      } else {
        busena = { kodas: "klaida", klaida: w.klaida || "naršyklės saugykla neprieinama" };
        irasas = naujas;
        if (!buvo) paskutinis = null;
      }
      pieskBusena();
      pieskSarasa();
      return w;
    }
    // naują juodraštį pradeda tik įvestis (rašymas, pasirinkimas, įkeltas failas); paspaudimai (pvz. perėjimas tarp žingsnių) - tik išsaugo esamą
    function pakeista(e) {
      if (e && e.isTrusted && e.type !== "click" && !(e.target && e.target.closest && e.target.closest("[data-darbas-ne],[data-jd],.jd-sar"))) pradeta = true;
      if (!dabar && !pradeta) return;
      clearTimeout(laikmatis);
      laikmatis = global.setTimeout(issaugok, DELSA);
    }
    function testi(id) {
      if (dabar) issaugok();
      var url = global.location.pathname + "?juodrastis=" + encodeURIComponent(id);
      global.location.href = url;
    }
    function ikelkFaila(f) {
      var el = doc.getElementById("jdSarBusena");
      var rd = new global.FileReader();
      rd.onload = function () {
        var r = isFailo(String(rd.result || ""));
        if (!r.ok) { if (el) el.innerHTML = '<span class="jd-kl" role="alert">Failo „' + esc(f.name) + "“ įkelti nepavyko: " + esc(r.klaida) + ".</span>"; return; }
        var x = r.irasas, esama = skaityk(x.id);
        // tas pats juodraštis šioje naršyklėje jau yra - failas įkeliamas kaip kopija (esamas neperrašomas)
        if (esama.busena !== "nera") {
          x = JSON.parse(JSON.stringify(x));
          x.id = naujasId();
          x.meta = Object.assign({}, x.meta, { kopija: true });
        }
        var w = global.GP_SAUGYKLA.rasyk(PREF + x.id, x, SAUG ? { saugykla: SAUG } : {});
        if (!w.ok) { if (el) el.innerHTML = '<span class="jd-kl" role="alert">Juodraščio įrašyti nepavyko: ' + esc(w.klaida || "") + ".</span>"; return; }
        testi(x.id);
      };
      rd.onerror = function () { if (el) el.innerHTML = '<span class="jd-kl" role="alert">Failo „' + esc(f.name) + "“ perskaityti nepavyko.</span>"; };
      rd.readAsText(f);
    }
    function veiksmas(e) {
      var b = e.target.closest && e.target.closest("[data-jd]");
      if (!b || b.tagName === "INPUT") return;
      var v = b.getAttribute("data-jd"), id = b.getAttribute("data-id");
      if (v === "testi") return testi(id);
      if (v === "atsisiusti") {
        var x = id ? (skaityk(id).reiksme || null) : (issaugok(), irasas);
        if (x) pranesk("Atsisiųstas juodraštis: " + atsisiusk(x) + ". Jame yra numatoma vertė - neperduokite tiekėjams.", "gerai");
        return;
      }
      if (v === "ikelti") { var f = doc.getElementById("jdFailas"); if (f) f.click(); return; }
      if (v === "trinti") { klausti = "trinti:" + id; rodytiSar = true; pieskSarasa(); var t = sarEl && sarEl.querySelector('[data-jd="trinti-taip"]'); if (t) t.focus(); return; }
      if (v === "trinti-taip") { trink(id); klausti = null; pieskSarasa(); pranesk("Juodraštis ištrintas.", "gerai"); return; }
      if (v === "trinti-dabar") { klausti = "trinti-dabar"; rodytiSar = true; pieskSarasa(); var t2 = doc.querySelector('[data-jd="trinti-dabar-taip"]'); if (t2) t2.focus(); return; }
      if (v === "trinti-dabar-taip") {
        trink(dabar); dabar = null; irasas = null; paskutinis = null; pradeta = false; klausti = null; busena = { kodas: "nera" };
        if (global.history && /[?&]juodrastis=/.test(global.location.search)) global.history.replaceState(null, "", global.location.pathname + global.location.hash);
        pieskBusena(); pieskSarasa(); pranesk("Juodraštis ištrintas. Šio lango atsakymai išsaugoti nebus, kol vėl ką nors pakeisite.", "gerai");
        return;
      }
      if (v === "trinti-ne") { klausti = null; pieskBusena(); pieskSarasa(); var f2 = doc.querySelector('[data-jd="trinti"],[data-jd="trinti-dabar"]'); if (f2) f2.focus(); }
    }
    doc.addEventListener("click", veiksmas);
    doc.addEventListener("change", function (e) {
      if (e.target && e.target.id === "jdFailas" && e.target.files && e.target.files[0]) { ikelkFaila(e.target.files[0]); e.target.value = ""; }
    });
    if (sarEl) sarEl.addEventListener("toggle", function (e) { if (e.target && e.target.id === "jdSar") rodytiSar = e.target.open; }, true);
    if (sritis) ["input", "change", "click", "drop"].forEach(function (ev) { sritis.addEventListener(ev, pakeista, true); });
    // uždarant ar paslepiant skirtuką - išsaugoma iš karto (localStorage rašomas sinchroniškai); prieš GP_DARBAS klausimą - per
    // GP_DARBAS.priesUzdarant (puslapis jį prijungia: klausiama tik tada, kai išsaugoti nepavyko)
    global.addEventListener("pagehide", function () { if (laikmatis) issaugok(); });
    doc.addEventListener("visibilitychange", function () { if (doc.visibilityState === "hidden" && laikmatis) issaugok(); });

    var api = {
      issaugok: issaugok,
      pakeista: pakeista,
      /* laukiantis išsaugojimas (po paskutinio pakeitimo dar nepraėjo DELSA) - dabar; uždarant puslapį */
      issaugokJeiLaukia: function () { if (laikmatis) return issaugok(); return null; },
      dabartinis: function () { return dabar; },
      irasas: function (id) { return id ? skaityk(id) : irasas; },
      busena: function () { return busena; },
      sarasas: sarasas,
      trink: trink,
      testi: testi,
      parametras: function () { return param; },
      /* Puslapis atkūrė juodraštį - toliau saugoma į tą patį raktą; paskutinis - atkurtų duomenų eilutė (kitaip pirmas surinkimas
         po atkūrimo, kuriame dar nėra perskaičiuotų reikšmių, būtų įrašytas kaip pakeitimas) */
      atkurtas: function (r) { dabar = r.id; irasas = r; paskutinis = JSON.stringify(cfg.surink()); pradeta = true; busena = { kodas: "atkurtas", kada: r.keista }; pieskBusena(); pieskSarasa(); },
      piesk: function () { pieskBusena(); pieskSarasa(); }
    };
    pieskBusena(); pieskSarasa();
    return api;
  }

  global.GP_JUODRASTIS = {
    versija: "1-2026-10-15", PREF: PREF, TIPAS: TIPAS, SCHEMA: SCHEMA,
    mount: mount, tikrink: tikrink, failas: failas, isFailo: isFailo, sarasas: sarasas, skaityk: skaityk, trink: trink,
    naudokSaugykla: function (s) { SAUG = s || null; }
  };
})(window);
