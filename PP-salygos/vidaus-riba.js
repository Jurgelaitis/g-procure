/*
 * PP-salygos: vidaus taisyklių riba, nuo kurios sutarties įvykdymo užtikrinimas privalomas (GP_VIDAUS_RIBA, 2026-10-12).
 *
 * Naudotojo sprendimas (sutarčių plano 8 sk. 15 p.): riba - vidinė grupės informacija, todėl kode, šablonuose, testuose ir
 * dokumentacijoje jos NĖRA ir būti negali (saugykla vieša). Kiekvienas naudotojas ją vieną kartą įveda pats; ji saugoma tik jo
 * naršyklėje (localStorage RAKTAS, per GP_SAUGYKLA) ir patenka į jo atsarginę kopiją. Pagal ją sistema primena; kol riba neįvesta -
 * bendras priminimas „patikrinkite pagal vidaus taisykles“. Į dokumentus, ataskaitas, generavimo pasą, stebėjimo įrašus ir serverį
 * riba nerašoma - ji rodoma tik ekrane, tam pačiam žmogui, kuris ją įvedė.
 *
 * Taisyklės tekstas (be skaičiaus) - LITGRID pirkimo sąlygų ir sutarčių šablonų autorių pastaba (žemėlapių `komentaruTaisykles`):
 * užtikrinimas privalomas pirkimuose, kurių vertė viršija ribą; žemesnės vertės pirkimuose - atsižvelgus į įsipareigojimų nevykdymo
 * riziką; virš ribos galima neprašyti, jeigu prieš pirkimą Grupės iždui pateikiama raštiška argumentacija arba vykdomas neskelbiamas
 * pirkimas iš vienintelio tiekėjo.
 *
 *   GP_VIDAUS_RIBA.busena()        -> { busena: "yra" | "nera" | "sugadinta" | "neprieinama", riba, klaida }
 *   GP_VIDAUS_RIBA.vertink(verte)  -> { kodas: "neivesta" | "virsija" | "nevirsija" | "be_vertes" | "neperskaitoma", riba, verte }
 *   GP_VIDAUS_RIBA.tekstas(verte)  -> sakinys žmogui (pagal vertink)
 *   GP_VIDAUS_RIBA.html(verte, { id }) -> priminimo blokas su „Įvesti ribą“ / „Keisti ribą“ (redagavimas - tame pačiame bloke)
 *   GP_VIDAUS_RIBA.nustatyk(v) / pasalink() -> { ok, klaida }
 *   GP_VIDAUS_RIBA.naudokSaugykla(s) - testams; ?saugykla=testine - tik atmintyje (kaip pirkimo kortelės)
 * Pasikeitus ribai - dokumento įvykis "gp-vidaus-riba" (modulis perpiešia klausimus).
 */
(function (global) {
  "use strict";
  var doc = global.document;
  var RAKTAS = "gprocure.salygos.nustatymai";
  var ISIMTYS = "Pagal šablono autorių pastabą užtikrinimo galima neprašyti, jeigu prieš pirkimą Grupės iždui pateikiama raštiška argumentacija " +
    "arba vykdomas neskelbiamas pirkimas iš vienintelio tiekėjo.";
  var atvertas = null, klaida = "";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function atmintis() {
    var d = {};
    return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
             setItem: function (k, v) { d[k] = String(v); }, removeItem: function (k) { delete d[k]; },
             key: function (i) { return Object.keys(d)[i] || null; }, get length() { return Object.keys(d).length; } };
  }
  var SAUG = /[?&]saugykla=testine(&|$)/.test(global.location ? global.location.search : "") ? atmintis() : null;
  function tikrink(v) {
    return v && v.schema === 1 && (v.uztikrinimoRiba == null || (typeof v.uztikrinimoRiba === "number" && isFinite(v.uztikrinimoRiba) && v.uztikrinimoRiba > 0))
      ? true : "netinkama nustatymų sandara";
  }
  function skaityk() {
    if (!global.GP_SAUGYKLA) return { busena: "neprieinama", reiksme: null, klaida: "saugyklos modulis neįkeltas" };
    return global.GP_SAUGYKLA.skaityk(RAKTAS, { saugykla: SAUG, tikrink: tikrink });
  }
  function busena() {
    var r = skaityk();
    if (r.busena === "yra") return { busena: r.reiksme.uztikrinimoRiba ? "yra" : "nera", riba: r.reiksme.uztikrinimoRiba || null, klaida: "" };
    return { busena: r.busena, riba: null, klaida: r.klaida || "" };
  }
  function rasyk(riba) {
    var r = skaityk();
    if (r.busena === "sugadinta" || r.busena === "neprieinama") return { ok: false, klaida: "nustatymo perskaityti nepavyko (" + (r.klaida || r.busena) + ") - neperrašoma" };
    var v = r.busena === "yra" ? JSON.parse(JSON.stringify(r.reiksme)) : { schema: 1 };   // kiti (naujesni) nustatymai paliekami
    if (riba == null) delete v.uztikrinimoRiba; else v.uztikrinimoRiba = riba;
    var w = global.GP_SAUGYKLA.rasyk(RAKTAS, v, { saugykla: SAUG });
    return w.ok ? { ok: true, klaida: "" } : { ok: false, klaida: w.klaida || "įrašyti nepavyko" };
  }
  function skaicius(x) {
    if (typeof x === "number") return isFinite(x) && x > 0 ? x : null;
    if (/^\s*[-\u2212]/.test(String(x == null ? "" : x))) return null;   // neigiama reikšmė - ne riba (parseEUR minuso nepaiso)
    var n = global.GP_MONEY && global.GP_MONEY.parseEUR ? global.GP_MONEY.parseEUR(String(x == null ? "" : x)) : parseFloat(String(x).replace(/\s/g, "").replace(",", "."));
    return n > 0 && isFinite(n) ? n : null;
  }
  function eur(n) { return (global.GP_MONEY && global.GP_MONEY.formatEUR ? global.GP_MONEY.formatEUR(n) : String(n)) + " Eur"; }
  function nustatyk(x) {
    var n = skaicius(x);
    if (!n) return { ok: false, klaida: "Įrašykite ribą skaičiumi, didesniu už nulį." };
    return rasyk(n);
  }
  function pasalink() { return rasyk(null); }

  /* „Viršija“ - kaip taisyklėje: griežtai daugiau už ribą */
  function vertink(verte) {
    var b = busena(), v = skaicius(verte);
    if (b.busena === "sugadinta" || b.busena === "neprieinama") return { kodas: "neperskaitoma", riba: null, verte: v, klaida: b.klaida };
    if (!b.riba) return { kodas: "neivesta", riba: null, verte: v };
    if (!v) return { kodas: "be_vertes", riba: b.riba, verte: null };
    return { kodas: v > b.riba ? "virsija" : "nevirsija", riba: b.riba, verte: v };
  }
  function tekstas(verte) {
    var r = vertink(verte);
    if (r.kodas === "neperskaitoma") return "Vidaus taisyklių ribos nustatymo perskaityti nepavyko (" + r.klaida + ") - ar užtikrinimas privalomas, patikrinkite pagal vidaus taisykles.";
    if (r.kodas === "neivesta") return "Pagal grupės vidaus taisykles sutarties įvykdymo užtikrinimas privalomas pirkimuose, kurių vertė viršija nustatytą ribą - patikrinkite " +
      "pagal vidaus taisykles. Riba šioje naršyklėje neįvesta: ją įvedus, sistema primins pati.";
    if (r.kodas === "be_vertes") return "Numatoma pirkimo vertė 1 žingsnyje neįrašyta, todėl jos negalima palyginti su jūsų įvesta vidaus taisyklių riba (" + eur(r.riba) + ").";
    if (r.kodas === "virsija") return "Numatoma pirkimo vertė (" + eur(r.verte) + " be PVM) viršija jūsų įvestą vidaus taisyklių ribą (" + eur(r.riba) +
      ") - pagal vidaus taisykles sutarties įvykdymo užtikrinimas privalomas. " + ISIMTYS;
    return "Numatoma pirkimo vertė (" + eur(r.verte) + " be PVM) neviršija jūsų įvestos vidaus taisyklių ribos (" + eur(r.riba) +
      ") - užtikrinimas taikomas atsižvelgus į įsipareigojimų nevykdymo riziką.";
  }
  function html(verte, o) {
    var id = (o && o.id) || "vr", r = vertink(verte), yra = !!r.riba, atv = atvertas === id;
    var h = '<div class="vr vr--' + r.kodas + '" id="' + esc(id) + '" data-vr-blokas data-darbas-ne>' +
      '<p class="vr-t" id="' + esc(id) + '-t"><b>Vidaus taisyklės.</b> ' + esc(tekstas(verte)) + "</p>";
    if (r.kodas !== "neperskaitoma") h += '<button type="button" class="sec vr-b" id="' + esc(id) + '-b" data-vr="keisti" aria-expanded="' + (atv ? "true" : "false") +
      '" aria-controls="' + esc(id) + '-red">' + (yra ? "Keisti ribą" : "Įvesti ribą") + "</button>";
    if (atv && r.kodas !== "neperskaitoma") {
      h += '<div class="vr-red" id="' + esc(id) + '-red">' +
        '<label class="vr-l" for="' + esc(id) + '-in">Vidaus taisyklių riba, Eur be PVM</label>' +
        '<input type="text" inputmode="decimal" autocomplete="off" id="' + esc(id) + '-in" value="' + (yra ? esc(global.GP_MONEY && global.GP_MONEY.formatEUR ? global.GP_MONEY.formatEUR(r.riba) : r.riba) : "") +
        '" aria-describedby="' + esc(id) + '-pa' + (klaida ? " " + esc(id) + "-kl" : "") + '">' +
        '<div class="vr-veiksmai"><button type="button" data-vr="saugoti">Išsaugoti</button>' +
        '<button type="button" class="sec" data-vr="atsaukti">Atšaukti</button>' +
        (yra ? '<button type="button" class="sec" data-vr="salinti">Pašalinti ribą</button>' : "") + "</div>" +
        (klaida ? '<p class="vr-kl" id="' + esc(id) + '-kl" role="alert">' + esc(klaida) + "</p>" : "") +
        '<p class="cite" id="' + esc(id) + '-pa">Ribą įrašykite iš grupės vidaus taisyklių. Ji saugoma tik šioje naršyklėje (ir jūsų atsarginėje kopijoje); ' +
        "į dokumentus, ataskaitas ir serverį ji nepatenka.</p></div>";
    }
    return h + "</div>";
  }

  function pranesk(id, fokusas) {
    doc.dispatchEvent(new global.CustomEvent("gp-vidaus-riba"));
    global.setTimeout(function () { var e = doc.getElementById(fokusas || id + "-b"); if (e) e.focus(); }, 0);
  }
  function perpiesk(blokas, fokusas) {
    // blokas piešiamas modulio (innerHTML) - čia perpiešiamas tik jis pats, su ta pačia verte
    var id = blokas.id, verte = blokas.getAttribute("data-vr-verte");
    var t = doc.createElement("div");
    t.innerHTML = html(verte === "" ? null : verte, { id: id });
    var n = t.firstChild; n.setAttribute("data-vr-verte", verte == null ? "" : verte);
    blokas.parentNode.replaceChild(n, blokas);
    var e = doc.getElementById(fokusas); if (e) { e.focus(); if (e.select && /-in$/.test(fokusas)) e.select(); }
  }
  function veiksmas(blokas, v) {
    var id = blokas.id;
    if (v === "keisti") { atvertas = atvertas === id ? null : id; klaida = ""; perpiesk(blokas, atvertas ? id + "-in" : id + "-b"); return; }
    if (v === "atsaukti") { atvertas = null; klaida = ""; perpiesk(blokas, id + "-b"); return; }
    var r = v === "salinti" ? pasalink() : nustatyk((doc.getElementById(id + "-in") || {}).value);
    if (!r.ok) { klaida = r.klaida; perpiesk(blokas, id + "-in"); return; }
    atvertas = null; klaida = "";
    pranesk(id);
  }
  if (doc) {
    doc.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("[data-vr]");
      var blokas = b && b.closest("[data-vr-blokas]");
      if (blokas) veiksmas(blokas, b.getAttribute("data-vr"));
    });
    doc.addEventListener("keydown", function (e) {
      var t = e.target, blokas = t && t.closest && t.closest("[data-vr-blokas]");
      if (!blokas || !t.matches || !t.matches("input")) return;
      if (e.key === "Enter") { e.preventDefault(); veiksmas(blokas, "saugoti"); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); veiksmas(blokas, "atsaukti"); }
    });
  }

  /* html() su verte, kurią blokas įsimena (perpiešiant jį patį) */
  function blokas(verte, o) {
    var v = skaicius(verte);
    return html(verte, o).replace("data-vr-blokas", 'data-vr-blokas data-vr-verte="' + (v == null ? "" : v) + '"');
  }

  global.GP_VIDAUS_RIBA = { RAKTAS: RAKTAS, ISIMTYS: ISIMTYS, busena: busena, vertink: vertink, tekstas: tekstas, html: blokas,
    nustatyk: nustatyk, pasalink: pasalink,
    naudokSaugykla: function (s) { SAUG = s || null; atvertas = null; klaida = ""; } };
})(typeof window !== "undefined" ? window : this);
