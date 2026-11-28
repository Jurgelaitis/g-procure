/* Pasiūlymai ir pastebėjimai apie G-Procure (GP_PASIULYMAI, 2026-11-28; naudotojo užduotis - puslapyje „Kontaktai“ paskatinti
   dalytis idėjomis). Laiško ruošinys: tema, įrankis ar puslapis ir tekstas -> laiškas žmogaus el. pašto programoje (mailto).
   G-Procure šio teksto niekur nesiunčia ir nesaugo. Įrankių sąrašas - shared/di-funkcijos.js (IRANKIAI pagal informacinės skilties
   moduleId), todėl naujas įrankis atsiranda pats; nuoroda iš įrankio: G-Procure_About.html?irankis=<moduleId>#pasiulymai,
   ?tema=pastebejimas|patobulinimas|ideja|bendradarbiavimas - iš anksto pažymėta tema. Kalba - pagal <html lang>. */
(function (global) {
  "use strict";
  var doc = global.document;
  var ADRESAS = "arunas.jurgelaitis@litgrid.eu";
  var MAX_MAILTO = 1800;     // ilgesnį mailto dalis el. pašto programų (pvz., Outlook) nukerpa - tada tekstas kopijuojamas

  var TEMOS = [
    { id: "pastebejimas", lt: "Pastebėjimas ar klaida", en: "Issue or error" },
    { id: "patobulinimas", lt: "Patobulinimas", en: "Improvement" },
    { id: "ideja", lt: "Nauja idėja", en: "New idea" },
    { id: "bendradarbiavimas", lt: "Bendradarbiavimas", en: "Collaboration" }
  ];
  var BENDRI = [
    { id: "bendrai", lt: "Bendrai apie G-Procure", en: "G-Procure in general" },
    { id: "vizija", lt: "G-Procure vizija", en: "The G-Procure vision" }
  ];
  /* Įrankių sąraše rodomi pavadinimai, kai di-funkcijos.js pavadinimas skirtas kitam kontekstui */
  var PERVARDYTI = { "pp-teise": { lt: "Pirkimų teisės stebėsena", en: "Procurement law monitoring" } };
  var PASLEPTI = { "pp-esg": true };   // nebevystomas (2026-11-28) - rodomas tik atėjus iš jo

  var T = {
    lt: { pagal: "pasiūlymas", sveiki: "Sveiki,", tusc: "[Įrašykite savo pastebėjimą ar idėją]", tema: "Tema", nenurodyta: "nenurodyta",
          irankis: "Įrankis ar puslapis", paruosta: "Laiškas parengtas g-procure.com puslapyje „Kontaktai“.",
          atverta: "Laiškas turėjo atsiverti jūsų el. pašto programoje. Neatsivėrė? Paspauskite „Kopijuoti tekstą“ ir parašykite adresu " + ADRESAS + ".",
          ilgas: "Tekstas ilgas, todėl jis nukopijuotas: atsivėrusiame laiške įklijuokite jį (Ctrl / ⌘ V).",
          ilgasNe: "Tekstas ilgas, o nukopijuoti nepavyko - pažymėkite jį lauke ir nukopijuokite patys.",
          ilgasKunas: "[Laiško tekstas nukopijuotas - įklijuokite jį čia]",
          nukopijuota: "Laiško tekstas nukopijuotas. Adresas: " + ADRESAS + ".", nepavyko: "Nukopijuoti nepavyko." },
    en: { pagal: "suggestion", sveiki: "Hello,", tusc: "[Write your observation or idea]", tema: "Topic", nenurodyta: "not specified",
          irankis: "Tool or page", paruosta: "Prepared on the g-procure.com Contact page.",
          atverta: "The message should have opened in your email app. It did not? Press “Copy text” and write to " + ADRESAS + ".",
          ilgas: "The text is long, so it has been copied: paste it into the message that opened (Ctrl / ⌘ V).",
          ilgasNe: "The text is long and could not be copied - select it in the field and copy it yourself.",
          ilgasKunas: "[The message text has been copied - paste it here]",
          nukopijuota: "Message text copied. Address: " + ADRESAS + ".", nepavyko: "Copying failed." }
  };
  function kalba() { return (doc.documentElement.getAttribute("lang") || "lt").slice(0, 2) === "en" ? "en" : "lt"; }

  function irankiai() {
    var f = global.GP_DI_FUNKCIJOS, sar = BENDRI.slice();
    ((f && f.IRANKIAI) || []).forEach(function (x) {
      if (!x || !x.id) return;
      var p = PERVARDYTI[x.id] || x;
      sar.push({ id: x.id, lt: p.lt, en: p.en, paslept: !!PASLEPTI[x.id] });
    });
    return sar;
  }
  function rask(sar, id) { for (var i = 0; i < sar.length; i++) if (sar[i].id === id) return sar[i]; return null; }

  /* Laiškas: { tema, irankis, tekstas, kalba } -> { adresas, tema (laiško tema), kunas, mailto, ilgas } */
  function laiskas(o) {
    o = o || {};
    var k = o.kalba === "en" ? "en" : "lt", t = T[k];
    var tema = rask(TEMOS, o.tema), ir = rask(irankiai(), o.irankis);
    var irPav = ir && ir.id !== "bendrai" ? ir[k] : "";
    var subj = "G-Procure: " + (tema ? tema[k] : t.pagal) + (irPav ? " - " + irPav : "");
    var tekstas = String(o.tekstas == null ? "" : o.tekstas).replace(/\r\n?/g, "\n").trim();
    var kunas = [t.sveiki, "", tekstas || t.tusc, "", t.tema + ": " + (tema ? tema[k] : t.nenurodyta),
      t.irankis + ": " + (ir ? ir[k] : BENDRI[0][k]), "", "--", t.paruosta].join("\n");
    var mailto = "mailto:" + ADRESAS + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(kunas.replace(/\n/g, "\r\n"));
    return { adresas: ADRESAS, tema: subj, kunas: kunas, mailto: mailto, ilgas: mailto.length > MAX_MAILTO,
      trumpas: "mailto:" + ADRESAS + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(t.ilgasKunas) };
  }

  /* Naršyklės veiksmai - pakeičiami testuose */
  var NUST = {
    atverk: function (url) { global.location.href = url; },
    kopijuok: function (tekstas) {
      return global.GP_KOPIJA ? global.GP_KOPIJA.kopijuok(tekstas, { tylus: true }) : Promise.resolve(false);
    }
  };
  function nustatyk(o) { for (var k in o) if (Object.prototype.hasOwnProperty.call(NUST, k)) NUST[k] = o[k]; }

  function parametrai() {
    var q = {}, s = (global.location && global.location.search) || "";
    s.replace(/^\?/, "").split("&").forEach(function (p) {
      var i = p.indexOf("="); if (i < 1) return;
      try { q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, " ")); } catch (e) { /* netinkamas parametras - praleidžiamas */ }
    });
    return q;
  }

  var B = null;   // prijungtos formos elementai
  function pieskSarasa(pradinis) {
    if (!B) return;
    var k = kalba(), sar = irankiai(), dab = pradinis || B.irankis.value || "bendrai";
    while (B.irankis.firstChild) B.irankis.removeChild(B.irankis.firstChild);
    sar.forEach(function (x) {
      if (x.paslept && x.id !== dab) return;
      var op = doc.createElement("option");
      op.value = x.id; op.textContent = x[k];
      B.irankis.appendChild(op);
    });
    B.irankis.value = rask(sar, dab) ? dab : "bendrai";
    var ph = B.tekstas && B.tekstas.getAttribute("data-" + k + "-placeholder");
    if (ph) B.tekstas.setAttribute("placeholder", ph);
  }
  function busena(tekstas, rusis) {
    if (!B) return;
    B.busena.textContent = tekstas || "";
    B.busena.setAttribute("data-rusis", rusis || "");
  }
  function dabartinis() {
    var r = B.forma.querySelector('input[name="fbTema"]:checked');
    return laiskas({ tema: r ? r.value : "", irankis: B.irankis.value, tekstas: B.tekstas.value, kalba: kalba() });
  }
  function siusk() {
    var l = dabartinis(), t = T[kalba()];
    if (!l.ilgas) { NUST.atverk(l.mailto); busena(t.atverta, "info"); return Promise.resolve(l); }
    return Promise.resolve(NUST.kopijuok(l.kunas)).then(function (ok) {
      NUST.atverk(l.trumpas);
      busena(ok ? t.ilgas : t.ilgasNe, ok ? "info" : "klaida");
      return l;
    });
  }
  function kopijuok() {
    var l = dabartinis(), t = T[kalba()];
    return Promise.resolve(NUST.kopijuok(l.tema + "\n\n" + l.kunas)).then(function (ok) {
      busena(ok ? t.nukopijuota : t.nepavyko + " " + t.ilgasNe, ok ? "gerai" : "klaida");
      return ok;
    });
  }

  function mount(forma) {
    forma = typeof forma === "string" ? doc.getElementById(forma) : forma;
    if (!forma) return null;
    B = { forma: forma, irankis: forma.querySelector("#fbIrankis"), tekstas: forma.querySelector("#fbTekstas"),
      busena: forma.querySelector("#fbBusena"), kopijuoti: forma.querySelector("#fbKopijuoti") };
    var q = parametrai();
    pieskSarasa(q.irankis && /^[a-z0-9-]{2,40}$/.test(q.irankis) ? q.irankis : "bendrai");
    if (q.tema && rask(TEMOS, q.tema)) {
      var r = forma.querySelector('input[name="fbTema"][value="' + q.tema + '"]');
      if (r) r.checked = true;
    }
    forma.addEventListener("submit", function (e) { e.preventDefault(); siusk(); });
    if (B.kopijuoti) B.kopijuoti.addEventListener("click", function () { kopijuok(); });
    /* Kalba pasikeitė - įrankių pavadinimai ir būsenos tekstas perrašomi */
    if (global.MutationObserver) new MutationObserver(function () { pieskSarasa(); busena(""); })
      .observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return B;
  }

  function init() { if (doc.getElementById("fbForma")) mount("fbForma"); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();

  global.GP_PASIULYMAI = { versija: "1.0", ADRESAS: ADRESAS, TEMOS: TEMOS, MAX_MAILTO: MAX_MAILTO, irankiai: irankiai, laiskas: laiskas,
    mount: mount, nustatyk: nustatyk, siusk: siusk, kopijuok: kopijuok };
})(window);
