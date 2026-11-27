/* ============================================================================
 * G-Procure  PP-report/pasiulymas.js
 * ----------------------------------------------------------------------------
 * Tiekėjo puslapis elektroninei apklausai (2026-11-26). Kvietimas perskaitomas iš adreso dalies po „#“ (#k=<kodas>) - ji į serverį
 * nesiunčiama; tiekėjas įrašo įkainius, puslapis suskaičiuoja sumas ir parengia pasiūlymo kodą, kurį tiekėjas pats išsiunčia el. paštu
 * pirkimo vykdytojo kontaktiniam asmeniui. Puslapis nieko nesiunčia ir nesaugo. Bendra logika - apklausa.js (GP_APKLAUSA).
 * ========================================================================== */
;(function () {
  "use strict";
  var A = window.GP_APKLAUSA, doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var KALBA = "lt", K = null, H = "", REZ = null, KLAIDA = "", LAIKMATIS = null;
  var F = { ik: {}, past: {}, pvm: false, pristatymas: "", galioja: "", pastabos: "", pav: "", kodas: "", pvmKodas: "", adresas: "", asmuo: "", pastas: "", tel: "", patv: {} };
  var MAILTO_RIBA = 1900;

  function L(lt, en) { return KALBA === "en" ? en : lt; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tarifas() { var m = window.GP_THRESHOLDS && window.GP_THRESHOLDS.MOKESCIAI; return m && m.pvmStandartinis > 0 ? m.pvmStandartinis : null; }

  /* Skaičius tekstu: tūkstančiai ir dešimtainis skyriklis pagal kalbą; laukuose - paprastas tarpas, tekste - jungiamasis. */
  function fmt(n, dmin, dmax, laukui) {
    if (typeof n !== "number" || !isFinite(n)) return "";
    var s = n.toFixed(dmax === undefined ? 2 : dmax), d = s.split("."), tr = d[1] || "";
    while (tr.length > (dmin === undefined ? 2 : dmin) && tr.charAt(tr.length - 1) === "0") tr = tr.slice(0, -1);
    var sv = d[0].replace(/\B(?=(\d{3})+(?!\d))/g, KALBA === "en" ? "," : (laukui ? " " : "\u00a0"));
    return sv + (tr ? (KALBA === "en" ? "." : ",") + tr : "");
  }
  function eur(n) { return n === null || n === undefined ? "-" : fmt(n, 2, 2) + "\u00a0" + L("Eur", "EUR"); }
  function skaitykSuma(t) {
    t = String(t || "").trim().replace(/[,.]\s*-$/, "");            // „125,-“
    if (/^0+([.,]0+)?\s*(eur|€)?$/i.test(t)) return 0;                // 0 - pvz., pristatymas įskaičiuotas į kitą poziciją
    var v = window.GP_MONEY ? window.GP_MONEY.sumaLauke(t) : null; return typeof v === "number" && v > 0 && v <= A.RIBOS.suma ? Math.round(v * 10000) / 10000 : null;
  }

  /* ---------- kvietimo įkėlimas ---------- */
  /* Įklijuota trumpa nuoroda (https://g-procure.com/k/#<ID>) - atveriama ji (kodą gauna puslapis k/) */
  function trumposId(t) { var m = /g-procure\.com\/k\/?#([0-9A-Za-z-]{10,14})(?![0-9A-Za-z])/.exec(String(t || "")); return m ? m[1].replace(/-/g, "").toUpperCase() : null; }
  function ikelk(tekstas) {
    var tid = trumposId(tekstas);
    if (tid && /^[0-9A-Z]{10}$/.test(tid)) { (window.GP_PASIULYMAS && window.GP_PASIULYMAS.eik || function (u) { location.assign(u); })("../k/#" + tid); return Promise.resolve(); }
    var rasta = A.isSarvo(tekstas).filter(function (x) { return x.rusis !== "pasiulymas"; });
    if (!rasta.length) { K = null; KLAIDA = tekstas ? "kodas" : ""; return Promise.resolve(piesk()); }
    return A.atkoduok(rasta[0]).then(function (r) {
      var f = A.kvietimoForma(r.obj);
      if (!f.ok || !f.kvietimas.t) { K = null; KLAIDA = f.klaida === "versija" ? "versija" : "forma"; return piesk(); }
      K = f.kvietimas; KLAIDA = ""; REZ = null;
      if (K.kalba === "en" && !KALBA_PASIRINKTA) KALBA = "en";
      if (!F.pav) F.pav = K.tiekejas.pav;
      if (!F.pastas) F.pastas = K.tiekejas.pastas;
      return A.antspaudas(A.bendra(K)).then(function (h) { H = h; piesk(); });
    }, function (e) { K = null; KLAIDA = e && e.kodas === "narsykle" ? "narsykle" : "kodas"; piesk(); });
  }
  var KALBA_PASIRINKTA = false;

  /* ---------- formos būsena ---------- */
  function skaitykForma() {
    var s = $("pslForma"); if (!s) return;
    s.querySelectorAll("[data-ik]").forEach(function (el) { F.ik[el.getAttribute("data-ik")] = el.value; });
    s.querySelectorAll("[data-past]").forEach(function (el) { F.past[el.getAttribute("data-past")] = el.value; });
    s.querySelectorAll("[data-f]").forEach(function (el) {
      var k = el.getAttribute("data-f");
      if (el.type === "checkbox") { if (k === "pvm") F.pvm = el.checked; else F.patv[k] = el.checked; } else F[k] = el.value;
    });
  }
  function skaiciuok() {
    var eil = K.pozicijos.map(function (p, i) { var ik = skaitykSuma(F.ik[i]); return { i: i, ikainis: ik, pastaba: A.eilute(F.past[i] || "", A.RIBOS.trumpas) }; });
    return A.sumos(K, { eilutes: eil, pvm: F.pvm }, tarifas());
  }
  function rodykSumas() {
    if (!K || !$("pslForma")) return;
    var s = skaiciuok();
    s.eilutes.forEach(function (e) { var el = doc.querySelector('[data-suma="' + e.i + '"]'); if (el) el.textContent = e.suma === null ? "-" : fmt(e.suma, 2, 2); });
    $("pslSumBe").textContent = eur(s.viso);
    $("pslSumPvmEil").hidden = $("pslSumPvmEil2").hidden = !F.pvm;
    $("pslSumPvm").textContent = eur(s.pvmSuma);
    $("pslSumSu").textContent = eur(s.suPvm === null ? s.viso : s.suPvm);
    $("pslSumSuEt").textContent = F.pvm ? L("Iš viso su PVM", "Total incl. VAT") : L("Iš viso (PVM netaikomas)", "Total (VAT not applicable)");
  }

  /* ---------- piešimas ---------- */
  function pieskAntraste() {
    doc.documentElement.lang = KALBA;
    doc.title = L("Pasiūlymo pateikimas", "Submit a quotation") + " · G-Procure";
    $("pslGrupe").textContent = L("G-Procure · Tiekėjams", "G-Procure · For suppliers");
    $("pslPavadinimas").textContent = L("Pasiūlymo pateikimas", "Submit a quotation");
    doc.querySelectorAll(".lang-toggle button").forEach(function (b) { var a = b.getAttribute("data-kalba") === KALBA; b.classList.toggle("active", a); b.setAttribute("aria-pressed", String(a)); });
    if (window.GProcureInfoPanel && window.GProcureInfoPanel.refresh) window.GProcureInfoPanel.refresh();
  }
  function ivestiesHtml() {
    var kl = { kodas: L("Kvietimo perskaityti nepavyko: nuoroda nepilna arba pakeista. Nukopijuokite visą nuorodą iš kvietimo laiško ir įklijuokite čia.",
        "The invitation could not be read: the link is incomplete or has been changed. Copy the whole link from the invitation email and paste it here."),
      forma: L("Šiame kode nėra tinkamo kvietimo. Paprašykite pirkimo vykdytojo atsiųsti kvietimą iš naujo.", "This code does not contain a valid invitation. Ask the buyer to send the invitation again."),
      versija: L("Kvietimas parengtas naujesne įrankio versija. Atnaujinkite puslapį (perkraukite) ir bandykite dar kartą.", "The invitation was prepared with a newer version of the tool. Reload the page and try again."),
      narsykle: L("Ši naršyklė kvietimo perskaityti negali. Atverkite nuorodą naujesne naršykle (Chrome, Edge, Firefox ar Safari).", "This browser cannot read the invitation. Open the link in a recent browser (Chrome, Edge, Firefox or Safari).") }[KLAIDA];
    return '<section class="ea-card" aria-labelledby="pslIvH">' +
      '<h3 id="pslIvH">' + L("Atverkite kvietimą", "Open the invitation") + '</h3>' +
      '<p class="ea-sub">' + L("Šis puslapis atveriamas iš nuorodos, kurią gavote kvietimo laiške. Jei nuoroda neatsivėrė visa, įklijuokite ją čia.",
        "This page opens from the link you received in the invitation email. If the link did not open completely, paste it here.") + '</p>' +
      (kl ? '<div class="ea-pastaba ea-pastaba--klaida" role="alert">' + esc(kl) + '</div>' : '') +
      '<div class="ea-laukas ea-laukas--visas"><label for="pslNuoroda">' + L("Kvietimo nuoroda arba kodas", "Invitation link or code") + '</label>' +
      '<textarea id="pslNuoroda" rows="3" autocomplete="off" spellcheck="false" placeholder="' + L("pvz., https://g-procure.com/k/#7F3K9QX2MZ", "e.g. https://g-procure.com/k/#7F3K9QX2MZ") + '"></textarea></div>' +
      '<div class="ea-eile" style="margin-top:12px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="pslAtverk">' + L("Atverti kvietimą", "Open the invitation") + '</button></div>' +
      '</section>';
  }
  function kvietimoHtml() {
    var lk = A.liko(K.terminas, new Date(), KALBA), kt = K.kontaktas;
    var s = '<section class="ea-hero" aria-labelledby="pslKvH"><div>' +
      '<div class="ea-hero-nr">' + L("KVIETIMAS PATEIKTI PASIŪLYMĄ", "REQUEST FOR QUOTATION") + ' · ' + esc(K.id) + '</div>' +
      '<h2 id="pslKvH">' + esc(K.pavadinimas) + '</h2>' +
      '<div class="ea-hero-meta"><span>' + L("Pirkimo vykdytojas", "Buyer") + ': <b>' + esc(K.pirkejas.pav) + '</b></span>' +
      '<span>' + L("Kvietimas skirtas", "Invitation for") + ': <b>' + esc(K.tiekejas.pav || K.tiekejas.pastas) + '</b></span></div></div>' +
      '<div class="ea-laikr"><span>' + L("Pasiūlymų terminas (Lietuvos laiku)", "Deadline (Lithuanian time)") + '</span><b>' + esc(A.rodykLaika(K.terminas)) + '</b><i id="pslLiko">' + esc(lk.tekstas) + '</i></div></section>';
    s += '<section class="ea-card" aria-labelledby="pslKaH"><h3 id="pslKaH">' + L("Ką perkame", "What we are buying") + '</h3>';
    if (K.aprasymas) s += '<p style="white-space:pre-line;margin-bottom:16px">' + esc(K.aprasymas) + '</p>';
    s += '<dl class="ea-dl">' +
      (K.pristatymoVieta ? '<dt>' + L("Pristatymo ar atlikimo vieta", "Place of delivery or performance") + '</dt><dd>' + esc(K.pristatymoVieta) + '</dd>' : '') +
      (K.pristatymoTerminas ? '<dt>' + L("Pristatymo ar atlikimo terminas", "Delivery or performance period") + '</dt><dd>' + esc(K.pristatymoTerminas) + '</dd>' : '') +
      (K.apmokejimas ? '<dt>' + L("Apmokėjimas", "Payment") + '</dt><dd>' + esc(K.apmokejimas) + '</dd>' : '') +
      '<dt>' + L("Vertinimas", "Evaluation") + '</dt><dd>' + L("Laimi mažiausia bendra kaina be PVM tarp reikalavimus atitinkančių pasiūlymų; kai kainos vienodos - anksčiau pateiktas pasiūlymas.", "The lowest total price excluding VAT among the quotations that meet the requirements wins; if prices are equal - the quotation submitted earlier.") + '</dd>' +
      '<dt>' + L("Pasiūlymų atvėrimas", "Opening of quotations") + '</dt><dd>' + L("Pasibaigus terminui. Jei pasiūlymus pateikia visi kviesti tiekėjai, jie gali būti atverti ir anksčiau - tada pateikto pasiūlymo pakeisti nebegalima.", "After the deadline. If all invited suppliers submit quotations, they may be opened earlier - then a submitted quotation can no longer be changed.") + '</dd>' +
      (K.dokumentai ? '<dt>' + L("Prie laiško pridėkite", "Attach to the email") + '</dt><dd style="white-space:pre-line">' + esc(K.dokumentai) + '</dd>' : '') +
      '<dt>' + L("Kontaktinis asmuo", "Contact person") + '</dt><dd>' + esc(kt.vardas ? kt.vardas + ", " : "") + '<a href="mailto:' + esc(kt.pastas) + '">' + esc(kt.pastas) + '</a>' + (kt.tel ? ", " + esc(kt.tel) : "") + '</dd>' +
      '</dl>' +
      '<p class="ea-uzuomina" style="margin-top:12px">' + L("Kvietimas perskaitytas iš nuorodos - G-Procure netikrina, kas ją išsiuntė. Jei abejojate, ar kvietimas tikras, susisiekite su pirkimo vykdytoju jums žinomais kontaktais.",
        "The invitation was read from the link - G-Procure does not verify who sent it. If you doubt whether the invitation is genuine, contact the buyer using contact details you already know.") + '</p>' +
      '<details class="ea-tech"><summary>' + L("Techninė informacija", "Technical information") + '</summary><p class="ea-uzuomina">' +
        L("Kvietimo antspaudas: ", "Invitation fingerprint: ") + '<span class="ea-antsp">' + esc(A.trumpas(H)) + '</span>' +
        L(" - pagal jį pirkimo vykdytojas gali patikrinti, kad pasiūlymas parengtas būtent šiam kvietimui.", " - with it the buyer can check that the quotation was prepared for exactly this invitation.") + '</p></details></section>';
    return s;
  }
  function laukas(k, et, o) {
    o = o || {};
    return '<div class="ea-laukas' + (o.visas ? " ea-laukas--visas" : "") + '"><label for="psl-' + k + '"' + (o.privaloma ? ' class="ea-privaloma"' : '') + '>' + esc(et) + '</label>' +
      '<input type="' + (o.tipas || "text") + '" id="psl-' + k + '" data-f="' + k + '" value="' + esc(F[k] || "") + '" autocomplete="' + (o.auto || "off") + '"' +
      (o.pvz ? ' placeholder="' + esc(o.pvz) + '"' : '') + (o.rezimas ? ' inputmode="' + o.rezimas + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + ' aria-describedby="psl-' + k + '-kl">' +
      (o.uzuomina ? '<span class="ea-uzuomina">' + esc(o.uzuomina) + '</span>' : '') + '<span class="ea-klaida" id="psl-' + k + '-kl" hidden></span></div>';
  }
  function formosHtml(praejo) {
    var t = tarifas(), proc = t === null ? "" : " (" + fmt(t * 100, 0, 2) + "\u00a0%)";
    var s = '<form id="pslForma" novalidate' + (REZ ? ' hidden' : '') + '>';
    if (praejo) s += '<div class="ea-pastaba ea-pastaba--klaida" role="alert"><strong>' + L("Pasiūlymų terminas praėjo", "The deadline has passed") + '</strong>' +
      L("Pasiūlymo parengti nebegalima. Jei manote, kad tai klaida, susisiekite su kontaktiniu asmeniu.", "A quotation can no longer be prepared. If you think this is a mistake, contact the contact person.") + '</div>';
    s += '<section class="ea-card" aria-labelledby="pslKnH"><h3 id="pslKnH">' + L("Jūsų kainos", "Your prices") + '</h3>' +
      '<p class="ea-sub">' + L("Įrašykite kiekvienos pozicijos vieneto kainą eurais be PVM. Sumos suskaičiuojamos automatiškai.", "Enter the unit price of each item in euros excluding VAT. Totals are calculated automatically.") + '</p>' +
      '<div class="ea-lent-remas"><table class="ea-lent ea-lent--kort"><thead><tr><th scope="col" style="width:48px">' + L("Nr.", "No.") + '</th><th scope="col" style="min-width:220px">' + L("Pozicija", "Item") + '</th><th scope="col" class="ea-sk" style="width:110px">' + L("Kiekis", "Quantity") +
      '</th><th scope="col" class="ea-sk" style="width:180px">' + L("Vieneto kaina be PVM, Eur", "Unit price excl. VAT, EUR") + '</th><th scope="col" class="ea-sk" style="width:130px">' + L("Suma be PVM, Eur", "Amount excl. VAT, EUR") +
      '</th><th scope="col" style="width:200px">' + L("Jūsų pastaba", "Your remark") + '</th></tr></thead><tbody>';
    K.pozicijos.forEach(function (p, i) {
      s += '<tr><td data-e="' + L("Nr.", "No.") + '">' + (i + 1) + '</td><th scope="row" style="font-weight:400"><span class="ea-poz-pav">' + esc(p.pav) + '</span>' + (p.pastaba ? '<span class="ea-poz-past">' + esc(p.pastaba) + '</span>' : '') + '</th>' +
        '<td class="ea-sk" data-e="' + L("Kiekis", "Quantity") + '">' + fmt(p.kiekis, 0, 4) + (p.mat ? "\u00a0" + esc(p.mat) : "") + '</td>' +
        '<td class="ea-sk ea-su-lauku" data-e="' + L("Vieneto kaina be PVM, Eur", "Unit price excl. VAT, EUR") + '"><input type="text" class="ea-skaicius" inputmode="decimal" autocomplete="off" data-ik="' + i + '" value="' + esc(F.ik[i] || "") + '" placeholder="' + L("pvz., 125,50", "e.g. 125.50") +
          '" aria-label="' + esc(L("Vieneto kaina be PVM", "Unit price excl. VAT") + ": " + p.pav) + '" aria-describedby="psl-ik' + i + '-kl" data-veiksmas-input="pslSumos" data-veiksmas-change="pslIkainis"' + (praejo ? " disabled" : "") + '>' +
          '<span class="ea-klaida" id="psl-ik' + i + '-kl" hidden></span></td>' +
        '<td class="ea-sk" data-e="' + L("Suma be PVM, Eur", "Amount excl. VAT, EUR") + '"><b data-suma="' + i + '">-</b></td>' +
        '<td class="ea-su-lauku" data-e="' + L("Jūsų pastaba", "Your remark") + '"><input type="text" autocomplete="off" maxlength="' + A.RIBOS.trumpas + '" data-past="' + i + '" value="' + esc(F.past[i] || "") + '" placeholder="' + L("pvz., siūlomas modelis", "e.g. model offered") +
          '" aria-label="' + esc(L("Pastaba", "Remark") + ": " + p.pav) + '"' + (praejo ? " disabled" : "") + '></td></tr>';
    });
    s += '</tbody></table></div>' +
      '<label class="ea-zymimas" style="margin-top:16px"><input type="checkbox" data-f="pvm" data-veiksmas-change="pslSumos"' + (F.pvm ? " checked" : "") + (praejo ? " disabled" : "") + '><span>' +
        L("Esame PVM mokėtojai - prie kainos pridedamas PVM", "We are VAT registered - VAT is added to the price") + esc(proc) + '</span></label>' +
      '<dl class="ea-sumos"><dt>' + L("Iš viso be PVM", "Total excl. VAT") + '</dt><dd id="pslSumBe">-</dd>' +
      '<dt id="pslSumPvmEil">' + L("PVM", "VAT") + esc(proc) + '</dt><dd id="pslSumPvmEil2"><span id="pslSumPvm">-</span></dd>' +
      '<dt class="ea-viso" id="pslSumSuEt"></dt><dd class="ea-viso" id="pslSumSu">-</dd></dl></section>';
    s += '<section class="ea-card" aria-labelledby="pslSaH"><h3 id="pslSaH">' + L("Pasiūlymo sąlygos", "Terms of the quotation") + '</h3><div class="ea-laukai" style="margin-top:12px">' +
      laukas("galioja", L("Pasiūlymas galioja (dienų)", "The quotation is valid for (days)"), { privaloma: true, rezimas: "numeric", pvz: L("pvz., 30", "e.g. 30"), max: 3 }) +
      laukas("pristatymas", L("Pristatymo ar atlikimo terminas", "Delivery or performance period"), { pvz: L("pvz., per 14 dienų nuo užsakymo", "e.g. within 14 days of the order"), max: A.RIBOS.trumpas,
        uzuomina: K.pristatymoTerminas ? L("Kvietime nurodyta: ", "Stated in the invitation: ") + K.pristatymoTerminas : "" }) +
      '<div class="ea-laukas ea-laukas--visas"><label for="psl-pastabos">' + L("Pastabos pirkimo vykdytojui", "Remarks for the buyer") + '</label>' +
      '<textarea id="psl-pastabos" data-f="pastabos" rows="3" maxlength="2000" placeholder="' + L("pvz., garantijos sąlygos", "e.g. warranty terms") + '"' + (praejo ? " disabled" : "") + '>' + esc(F.pastabos) + '</textarea></div></div></section>';
    s += '<section class="ea-card" aria-labelledby="pslTkH"><h3 id="pslTkH">' + L("Jūsų duomenys", "Your details") + '</h3><div class="ea-laukai" style="margin-top:12px">' +
      laukas("pav", L("Tiekėjo pavadinimas", "Supplier name"), { privaloma: true, auto: "organization", max: A.RIBOS.pavadinimas }) +
      laukas("kodas", L("Įmonės (asmens) kodas", "Company registration number"), { privaloma: true, max: 20 }) +
      laukas("pvmKodas", L("PVM mokėtojo kodas", "VAT number"), { max: 20, pvz: L("pvz., LT100001234567", "e.g. LT100001234567") }) +
      laukas("adresas", L("Adresas", "Address"), { auto: "street-address", max: A.RIBOS.trumpas }) +
      laukas("asmuo", L("Pasiūlymą teikiantis asmuo", "Person submitting the quotation"), { privaloma: true, auto: "name", max: 120 }) +
      laukas("pastas", L("El. paštas", "Email"), { privaloma: true, tipas: "email", auto: "email", max: 120 }) +
      laukas("tel", L("Telefonas", "Phone"), { tipas: "tel", auto: "tel", max: 40 }) +
      '</div></section>';
    var patv = [["atitinka", L("Siūlomos prekės, paslaugos ar darbai atitinka kvietime nurodytus reikalavimus.", "The goods, services or works offered meet the requirements stated in the invitation.")],
      ["kaina", L("Į kainą įskaičiuotos visos išlaidos ir mokesčiai, išskyrus PVM.", "The price includes all costs and taxes except VAT.")],
      ["igaliotas", L("Turiu teisę teikti šį pasiūlymą tiekėjo vardu.", "I have the right to submit this quotation on behalf of the supplier.")]];
    if (K.nacsaugumas) patv.push([A.NACSAUG, L("Tiekėjas, jo subtiekėjai ir ūkio subjektai, kurių pajėgumais remiamasi, atitinka nacionalinio saugumo reikalavimus, nurodytus pirkimo vykdytojo mažos vertės pirkimų tvarkos aprašo 27.2.3 ir 31.4 punktuose (be kita ko, prekių gamintojas ar paslaugų teikėjas nėra registruotas Vyriausybės patvirtintame sąraše nurodytose valstybėse ar teritorijose). Šis patvirtinimas pateikiamas vietoje atskiros atitikties deklaracijos.",
      "The supplier, its subcontractors and the entities whose capacities are relied upon meet the national security requirements referred to in points 27.2.3 and 31.4 of the buyer's low-value procurement rules (among other things, the manufacturer of the goods or the service provider is not registered in the states or territories listed by the Government). This confirmation is given instead of a separate declaration of conformity.")]);
    s += '<section class="ea-card" aria-labelledby="pslPtH"><h3 id="pslPtH">' + L("Patvirtinimai", "Confirmations") + '</h3><div style="display:grid;gap:10px;margin-top:12px" id="pslPatv" aria-describedby="psl-patv-kl">';
    patv.forEach(function (p) { s += '<label class="ea-zymimas"><input type="checkbox" data-f="' + p[0] + '"' + (F.patv[p[0]] ? " checked" : "") + (praejo ? " disabled" : "") + '><span>' + esc(p[1]) + '</span></label>'; });
    s += '</div><span class="ea-klaida" id="psl-patv-kl" hidden></span>' +
      '<div id="pslKlaidos" tabindex="-1"></div>' +
      '<div class="ea-eile" style="margin-top:20px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="pslParenk"' + (praejo ? " disabled" : "") + '>' + L("Siųsti pasiūlymą", "Send the quotation") + '</button>' +
      '<span class="ea-uzuomina">' + L("Jūsų pašto programoje atsivers paruoštas laiškas kontaktiniam asmeniui - pasiūlymas pateiktas, kai jį išsiunčiate.", "A prepared email to the contact person will open in your email program - the quotation is submitted when you send it.") + '</span></div></section>';
    s += '<p class="ea-uzuomina">' + L("Šis puslapis jūsų įvestų duomenų niekur nesiunčia ir nesaugo: pasiūlymą pirkimo vykdytojas gaus tik tada, kai patys išsiųsite laišką.",
      "This page does not send or store the data you enter: the buyer will receive the quotation only when you send the email yourself.") + '</p></form>';
    return s;
  }
  function laiskoHref() { var l = REZ.laiskas; return "mailto:" + encodeURIComponent(K.kontaktas.pastas) + "?subject=" + encodeURIComponent(l.tema) + "&body=" + encodeURIComponent(l.tekstas); }
  function rezultatoHtml() {
    if (!REZ) return "";
    var l = REZ.laiskas, href = laiskoHref(), trumpas = href.length <= MAILTO_RIBA, s = REZ.sumos;
    return '<section class="ea-card ea-rezult" aria-labelledby="pslRzH" id="pslRezultatas">' +
      '<h3 id="pslRzH" tabindex="-1">' + L("Pasiūlymas paruoštas - dar neišsiųstas", "The quotation is ready - not sent yet") + '</h3>' +
      '<div class="ea-pastaba ea-pastaba--demesio"><strong>' + L("Liko išsiųsti laišką", "Now send the email") + '</strong>' +
        (trumpas ? L("Jūsų pašto programoje atsiveria paruoštas laiškas adresu ", "A prepared email to ") + '<b>' + esc(K.kontaktas.pastas) + '</b>' + L(" - paspauskite jame „Siųsti“ iki ", " opens in your email program - click “Send” in it by ")
          : L("Laiškas per ilgas atverti automatiškai: nukopijuokite jo tekstą ir išsiųskite adresu ", "The email is too long to open automatically: copy its text and send it to ") + '<b>' + esc(K.kontaktas.pastas) + '</b>' + L(" iki ", " by ")) +
        '<b>' + esc(A.rodykLaika(K.terminas)) + '</b> ' + L("(Lietuvos laiku). Kol laiško neišsiuntėte, pasiūlymas nepateiktas.", "(Lithuanian time). Until you send the email, the quotation is not submitted.") +
        '<div class="ea-eile" style="margin-top:10px">' +
        (trumpas ? '<a class="ea-btn ea-btn--pagr" href="' + esc(href) + '" data-veiksmas="pslIssiusta">' + L("Laiškas neatsivėrė? Atverti dar kartą", "Email did not open? Open it again") + '</a>' : '') +
        '<button type="button" class="ea-btn' + (trumpas ? "" : " ea-btn--pagr") + '" data-veiksmas="pslKopijuok" data-ka="tekstas">' + L("Kopijuoti laiško tekstą", "Copy the email text") + '</button>' +
        (trumpas ? '' : '<button type="button" class="ea-btn" data-veiksmas="pslKopijuok" data-ka="adresas">' + L("Kopijuoti adresą", "Copy the address") + '</button>' +
          '<button type="button" class="ea-btn" data-veiksmas="pslKopijuok" data-ka="tema">' + L("Kopijuoti temą", "Copy the subject") + '</button>') + '</div></div>' +
      (K.dokumentai ? '<p style="margin-top:12px"><b>' + L("Prie laiško pridėkite:", "Attach to the email:") + '</b> ' + esc(K.dokumentai) + ' ' + L("Kainų juose nenurodykite - kainos jau yra laiške.", "Do not state prices in them - the prices are already in the email.") + '</p>' : '') +
      '<dl class="ea-dl" style="margin:12px 0"><dt>' + L("Kaina be PVM", "Price excl. VAT") + '</dt><dd><b>' + esc(eur(s.viso)) + '</b></dd>' +
        (REZ.pasiulymas.pvm ? '<dt>' + L("Kaina su PVM", "Price incl. VAT") + '</dt><dd>' + esc(eur(s.suPvm)) + '</dd>' : '<dt>PVM</dt><dd>' + L("netaikomas (ne PVM mokėtojas)", "not applicable (not VAT registered)") + '</dd>') + '</dl>' +
      '<div class="ea-eile"><button type="button" class="ea-btn" data-veiksmas="pslAtsisiusk">' + L("Atsisiųsti kopiją savo įrašams", "Download a copy for your records") + '</button>' +
        '<button type="button" class="ea-btn" data-veiksmas="spausdinti">' + L("Spausdinti", "Print") + '</button>' +
        '<button type="button" class="ea-btn ea-btn--tylus" data-veiksmas="pslKeisk">' + L("Keisti pasiūlymą", "Change the quotation") + '</button></div>' +
      '<details class="ea-tech" style="margin-top:12px"><summary>' + L("Laiško tekstas ir techninė informacija", "Email text and technical information") + '</summary>' +
        '<dl class="ea-dl"><dt>' + L("Gavėjas", "To") + '</dt><dd>' + esc(K.kontaktas.pastas) + '</dd><dt>' + L("Tema", "Subject") + '</dt><dd>' + esc(l.tema) + '</dd>' +
        '<dt>' + L("Pasiūlymo antspaudas", "Quotation fingerprint") + '</dt><dd><span class="ea-antsp">' + esc(A.trumpas(REZ.h)) + '</span> <span class="ea-uzuomina">' +
          L("- pagal jį pirkimo vykdytojas ir jūs galėsite patikrinti, kad vertintas būtent šis pasiūlymas", "- with it the buyer and you can check that exactly this quotation was evaluated") + '</span></dd></dl>' +
        '<pre class="ea-kodas" style="max-height:260px" tabindex="0" aria-label="' + L("Laiško tekstas", "Email text") + '">' + esc(l.tekstas) + '</pre>' +
        '<p class="ea-uzuomina">' + L("Bloko su duomenimis laiške nekeiskite - pakeistas jis nebus perskaitytas. Jame jūsų kainos suspaustos, bet neužšifruotos: pirkimo vykdytojo įrankis kainų nerodo, kol pasiūlymai neatverti, tačiau tai darbo tvarka, ne šifras. Kopijoje savo įrašams kainos matomos atviru tekstu, todėl jos pirkimo vykdytojui nesiųskite.",
          "Do not change the data block in the email - a changed block cannot be read. Your prices in it are compressed but not encrypted: the buyer's tool does not show prices until the quotations are opened, but this is a working procedure, not encryption. Prices are visible in plain text in the copy for your records, so do not send it to the buyer.") + '</p></details></section>';
  }
  /* „Siųsti pasiūlymą“: parengus iškart atveriamas paruoštas laiškas (naudotojo pastaba 2026-11-27 - pateikimas turi būti kelių akimirkų reikalas) */
  function atverkLaiska() {
    if (!REZ) return false;
    var href = laiskoHref();
    if (href.length > MAILTO_RIBA) return false;
    var a = doc.createElement("a"); a.href = href; a.setAttribute("data-psl-laiskas", ""); a.hidden = true;
    doc.body.appendChild(a); a.click(); a.remove(); baigta();
    return true;
  }
  function piesk() {
    pieskAntraste();
    var v = $("pslTurinys"), praejo = K ? A.liko(K.terminas, new Date(), KALBA).praejo : false;
    v.innerHTML = K ? kvietimoHtml() + rezultatoHtml() + formosHtml(praejo) : ivestiesHtml();
    if (K) rodykSumas();
    clearInterval(LAIKMATIS);
    if (K && !praejo) LAIKMATIS = setInterval(function () {
      var lk = A.liko(K.terminas, new Date(), KALBA), el = $("pslLiko");
      if (el) el.textContent = lk.tekstas;
      if (lk.praejo) { skaitykForma(); piesk(); }
    }, 30000);
  }

  /* ---------- patikra ir pasiūlymo parengimas ---------- */
  function zymek(id, tekstas) {
    var el = $(id), kl = $(id + "-kl");
    if (el) { if (tekstas) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid"); }
    if (kl) { kl.hidden = !tekstas; kl.textContent = tekstas || ""; }
  }
  function tikrink() {
    var kl = [];
    function blogai(id, et, tekstas, fokusas) { zymek(id, tekstas); kl.push({ id: fokusas || id, tekstas: et + ": " + tekstas }); }
    K.pozicijos.forEach(function (p, i) {
      var el = doc.querySelector('[data-ik="' + i + '"]'), v = F.ik[i], msg = "";
      if (!v || !String(v).trim()) msg = L("įrašykite vieneto kainą", "enter the unit price");
      else if (skaitykSuma(v) === null) msg = L("kaina turi būti skaičius (pvz., 125,50; jei pozicija įskaičiuota į kitą - 0)", "the price must be a number (e.g. 125.50; if the item is included in another - 0)");
      var s = $("psl-ik" + i + "-kl");
      if (msg) { el.setAttribute("aria-invalid", "true"); s.hidden = false; s.textContent = msg; if (!el.id) el.id = "psl-ik" + i; kl.push({ id: el.id, tekstas: (i + 1) + ". " + p.pav + ": " + msg }); }
      else { el.removeAttribute("aria-invalid"); s.hidden = true; s.textContent = ""; }
    });
    var g = String(F.galioja || "").trim();
    if (!/^\d{1,3}$/.test(g) || +g < 1 || +g > 365) blogai("psl-galioja", L("Pasiūlymas galioja", "Validity"), L("įrašykite dienų skaičių nuo 1 iki 365", "enter the number of days from 1 to 365")); else zymek("psl-galioja", "");
    [["pav", L("Tiekėjo pavadinimas", "Supplier name")], ["kodas", L("Įmonės (asmens) kodas", "Company registration number")], ["asmuo", L("Pasiūlymą teikiantis asmuo", "Person submitting the quotation")]].forEach(function (x) {
      if (!String(F[x[0]] || "").trim()) blogai("psl-" + x[0], x[1], L("užpildykite šį lauką", "fill in this field")); else zymek("psl-" + x[0], "");
    });
    if (!A.pastas(F.pastas || "")) blogai("psl-pastas", L("El. paštas", "Email"), L("įrašykite el. pašto adresą (pvz., vardas@imone.lt)", "enter an email address (e.g. name@company.com)")); else zymek("psl-pastas", "");
    var truksta = A.reikiaPatvirtinti(K).filter(function (a) { return !F.patv[a]; }), pk = $("psl-patv-kl");
    pk.hidden = !truksta.length; pk.textContent = truksta.length ? L("Pažymėkite visus patvirtinimus.", "Tick all confirmations.") : "";
    if (truksta.length) { var pirmas = doc.querySelector('[data-f="' + truksta[0] + '"]'); if (!pirmas.id) pirmas.id = "psl-patv-" + truksta[0]; kl.push({ id: pirmas.id, tekstas: L("Patvirtinimai: pažymėkite visus", "Confirmations: tick all of them") }); }
    return kl;
  }
  function rodykKlaidas(kl) {
    var v = $("pslKlaidos");
    if (!kl.length) { v.innerHTML = ""; return; }
    v.innerHTML = '<div class="ea-pastaba ea-pastaba--klaida" role="alert" style="margin-top:16px"><strong>' + L("Pasiūlymo parengti dar negalima", "The quotation cannot be prepared yet") + '</strong><ul>' +
      kl.map(function (k) { return '<li><a href="#' + esc(k.id) + '" data-veiksmas="pslEik" data-id="' + esc(k.id) + '">' + esc(k.tekstas) + '</a></li>'; }).join("") + '</ul></div>';
    v.focus();
  }
  function parenk() {
    skaitykForma();
    if (A.liko(K.terminas, new Date(), KALBA).praejo) { piesk(); return Promise.resolve(false); }
    var kl = tikrink(); rodykKlaidas(kl);
    if (kl.length) return Promise.resolve(false);
    var obj = { v: 1, tipas: "pasiulymas", apklausa: K.id, kvietimas: H, t: K.t,
      tiekejas: { pav: F.pav, kodas: F.kodas, pvmKodas: F.pvmKodas, adresas: F.adresas, asmuo: F.asmuo, pastas: F.pastas, tel: F.tel }, pvm: !!F.pvm,
      eilutes: K.pozicijos.map(function (p, i) { return { i: i, ikainis: skaitykSuma(F.ik[i]), pastaba: F.past[i] || "" }; }),
      pristatymas: F.pristatymas, galioja: +String(F.galioja).trim(), pastabos: F.pastabos, patvirtinta: A.reikiaPatvirtinti(K),
      pateikta: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), kalba: KALBA };
    var f = A.pasiulymoForma(obj);
    if (!f.ok) { rodykKlaidas([{ id: "pslForma", tekstas: L("Pasiūlymo parengti nepavyko - patikrinkite įvestus duomenis", "The quotation could not be prepared - check the data entered") }]); return Promise.resolve(false); }
    var p = f.pasiulymas;
    return Promise.all([A.koduok(p), A.antspaudas(p)]).then(function (r) {
      REZ = { pasiulymas: p, kodas: r[0], h: r[1], sumos: A.sumos(K, p, tarifas()), laiskas: A.atsakymas(K, p, r[0], r[1], KALBA) };
      piesk();
      var h = $("pslRzH"); if (h) { h.scrollIntoView({ block: "start" }); h.focus(); }
      return true;
    });
  }
  var KOPIJOS_ZYME = "G-PROCURE: TIEKĖJO KOPIJA - NESIŲSTI PIRKIMO VYKDYTOJUI";   // pagal ją iniciatoriaus įrankis atpažįsta per klaidą atsiųstą kopiją
  function kopijaFailui() {
    var p = REZ.pasiulymas, s = REZ.sumos, e = [];
    e.push(KOPIJOS_ZYME, L("Šis failas - jūsų įrašams. Pirkimo vykdytojui jo nesiųskite: jame kainos matomos atviru tekstu, o pasiūlymo kodo nėra.",
      "This file is for your records. Do not send it to the buyer: prices are visible in plain text and it does not contain the quotation code."), "",
      L("PASIŪLYMAS", "QUOTATION"), L("Pirkimas", "Procurement") + ": " + K.pavadinimas + " (" + K.id + ")", L("Pirkimo vykdytojas", "Buyer") + ": " + K.pirkejas.pav,
      L("Tiekėjas", "Supplier") + ": " + p.tiekejas.pav + (p.tiekejas.kodas ? ", " + p.tiekejas.kodas : ""), L("Parengta", "Prepared") + ": " + A.rodykLaika(p.pateikta) + " " + L("(Lietuvos laiku)", "(Lithuanian time)"),
      L("Pasiūlymo antspaudas", "Quotation fingerprint") + ": " + A.trumpas(REZ.h), L("Kvietimo antspaudas", "Invitation fingerprint") + ": " + A.trumpas(H), "");
    K.pozicijos.forEach(function (poz, i) {
      var x = s.eilutes[i];
      e.push((i + 1) + ". " + poz.pav + " - " + fmt(poz.kiekis, 0, 4) + (poz.mat ? " " + poz.mat : "") + " x " + fmt(x.ikainis, 2, 4) + " = " + fmt(x.suma, 2, 2) + " " + L("Eur be PVM", "EUR excl. VAT") + (x.pastaba ? " (" + x.pastaba + ")" : ""));
    });
    e.push("", L("Iš viso be PVM", "Total excl. VAT") + ": " + fmt(s.viso, 2, 2) + " " + L("Eur", "EUR"));
    if (p.pvm) e.push(L("PVM", "VAT") + ": " + fmt(s.pvmSuma, 2, 2) + " " + L("Eur", "EUR"), L("Iš viso su PVM", "Total incl. VAT") + ": " + fmt(s.suPvm, 2, 2) + " " + L("Eur", "EUR"));
    e.push(L("Pasiūlymas galioja (dienų)", "Valid for (days)") + ": " + p.galioja);
    if (p.pristatymas) e.push(L("Pristatymo ar atlikimo terminas", "Delivery or performance period") + ": " + p.pristatymas);
    if (p.pastabos) e.push(L("Pastabos", "Remarks") + ": " + p.pastabos);
    e.push("");
    return e.join("\r\n").replace(/\u00a0/g, " ");
  }
  function atsisiusk() {
    var vardas = window.GP_EKSPORTAS ? window.GP_EKSPORTAS.failoVardas({ numeris: K.id, dokumentas: L("Pasiūlymo-kopija", "Quotation-copy"), pavadinimas: REZ.pasiulymas.tiekejas.pav, pletinys: "txt" }) : K.id + "_pasiulymas.txt";
    var a = doc.createElement("a"), url = URL.createObjectURL(new Blob(["\ufeff" + kopijaFailui()], { type: "text/plain;charset=utf-8" }));
    a.href = url; a.download = vardas; doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    baigta();
  }
  function baigta() { if (window.GP_DARBAS) window.GP_DARBAS.atskaita(); }

  /* ---------- veiksmai ---------- */
  window.GP_IVYKIAI.veiksmai({
    pslKalba: function (el) { skaitykForma(); KALBA = el.getAttribute("data-kalba") === "en" ? "en" : "lt"; KALBA_PASIRINKTA = true; if (REZ) REZ.laiskas = A.atsakymas(K, REZ.pasiulymas, REZ.kodas, REZ.h, KALBA); piesk(); },
    pslAtverk: function () { var t = $("pslNuoroda").value; KLAIDA = ""; ikelk(t).then(function () { var h = $("pslKvH") || $("pslIvH"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); } }); },
    pslSumos: function () { skaitykForma(); rodykSumas(); },
    pslIkainis: function (el) { var v = skaitykSuma(el.value); if (v !== null) { el.value = fmt(v, 2, 4, true); el.removeAttribute("aria-invalid"); var k = $("psl-ik" + el.getAttribute("data-ik") + "-kl"); if (k) { k.hidden = true; k.textContent = ""; } } skaitykForma(); rodykSumas(); },
    pslParenk: function () { parenk().then(function (ok) { if (ok) atverkLaiska(); }); },
    pslEik: function (el) { var t = $(el.getAttribute("data-id")); if (t) { t.scrollIntoView({ block: "center" }); t.focus(); } return false; },
    pslKopijuok: function (el) {
      var ka = el.getAttribute("data-ka"), t = ka === "adresas" ? K.kontaktas.pastas : ka === "tema" ? REZ.laiskas.tema : REZ.laiskas.tekstas;
      window.GP_KOPIJA.kopijuok(t, { sekme: ka === "adresas" ? L("Adresas nukopijuotas", "Address copied") : ka === "tema" ? L("Tema nukopijuota", "Subject copied") : L("Laiško tekstas nukopijuotas", "Email text copied") })
        .then(function (ok) { if (ok && ka === "tekstas") baigta(); });
    },
    pslIssiusta: function () { baigta(); },
    pslAtsisiusk: function () { atsisiusk(); },
    pslKeisk: function () { REZ = null; piesk(); var h = $("pslKnH"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); } }
  });

  /* ---------- informacinė skiltis ---------- */
  var INFO = {
    lt: { title: "Kas tai ir kaip naudotis", purpose: "Pasiūlymo forma mažos vertės pirkimo apklausai: kvietimą gavote el. paštu, pasiūlymą parengiate čia ir išsiunčiate el. paštu.",
      stepsTitle: "Kaip pateikti pasiūlymą", steps: ["<b>Atverkite nuorodą</b> iš kvietimo laiško - puslapis parodys, kas perkama ir iki kada laukiama pasiūlymų.",
        "<b>Įrašykite vieneto kainas</b> be PVM, pasiūlymo galiojimo terminą ir savo duomenis. Sumos suskaičiuojamos automatiškai.",
        "<b>Paspauskite „Siųsti pasiūlymą“</b> - jūsų pašto programoje atsivers paruoštas laiškas kontaktiniam asmeniui; <b>išsiųskite jį</b> iki termino. Kol laiško neišsiuntėte, pasiūlymas nepateiktas."],
      noteTitle: "Duomenys", note: "Kvietimas perskaitomas jūsų naršyklėje iš nuorodos. Įvesti duomenys <b>niekur nesiunčiami ir nesaugomi</b> - pasiūlymą pirkimo vykdytojas gauna tik jūsų išsiųstu laišku. Uždarius puslapį neparengtas pasiūlymas neišlieka." },
    en: { title: "What this is and how to use it", purpose: "A quotation form for a low-value procurement: you received the invitation by email, you prepare the quotation here and send it by email.",
      stepsTitle: "How to submit a quotation", steps: ["<b>Open the link</b> from the invitation email - the page shows what is being bought and the deadline.",
        "<b>Enter the unit prices</b> excluding VAT, the validity of the quotation and your details. Totals are calculated automatically.",
        "<b>Click “Send the quotation”</b> - a prepared email to the contact person opens in your email program; <b>send it</b> before the deadline. Until you send the email, the quotation is not submitted."],
      noteTitle: "Data", note: "The invitation is read in your browser from the link. The data you enter is <b>not sent or stored anywhere</b> - the buyer receives the quotation only in the email you send. If you close the page, an unprepared quotation is not kept." }
  };
  if (window.GProcureInfoPanel && $("infoPanelMount")) window.GProcureInfoPanel.mount({ target: "#infoPanelMount", moduleId: "pp-report-pasiulymas", getLang: function () { return KALBA; }, content: INFO });

  /* ---------- paleidimas ---------- */
  function isAdreso() { return ikelk(location.hash.length > 1 ? location.hash : ""); }
  window.addEventListener("hashchange", function () { F.ik = {}; F.past = {}; REZ = null; isAdreso(); });
  if (window.GP_DARBAS) window.GP_DARBAS.stebek(function () { return REZ ? [REZ.kodas] : []; });
  window.GP_PASIULYMAS = { ikelk: ikelk, parenk: parenk, trumposId: trumposId, busena: function () { return { kvietimas: K, antspaudas: H, rezultatas: REZ, kalba: KALBA, klaida: KLAIDA, forma: F }; }, kopija: function () { return REZ ? kopijaFailui() : ""; } };
  isAdreso();
})();
