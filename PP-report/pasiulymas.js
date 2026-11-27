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
  var KALBA = "lt", K = null, H = "", REZ = null, KLAIDA = "", LAIKMATIS = null, PASKUTINIS_T = null, ATKURTA = "", VYKSTA = false;
  /* Formos būsena. PVM - be numatytojo (null: neatsakyta), pvmKitas - „Taip, bet taikomas kitas PVM tarifas“ (T1); ikAiskus - tiekėjo patikslintos
     dviprasmiškos kainos („2,375“). */
  function naujaF() {
    return { ik: {}, past: {}, ikAiskus: {}, pvm: null, pvmKitas: false, pvmTarifas: "", fizinis: false, pristatymas: "", galioja: "", pastabos: "", pav: "", kodas: "", pvmKodas: "", adresas: "", asmuo: "", pastas: "", tel: "", patv: {} };
  }
  var F = naujaF();
  var DVI_T = {}, DVI_MS = 900;
  var MAILTO_RIBA = 1900;

  function L(lt, en) { return KALBA === "en" ? en : lt; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tarifas() { var m = window.GP_THRESHOLDS && window.GP_THRESHOLDS.MOKESCIAI; return m && m.pvmStandartinis > 0 ? m.pvmStandartinis : null; }
  /* Tiekėjo įrašytas kitas PVM tarifas procentais (T1): skaičius tarp 0 ir 100, iki dviejų skaitmenų po kablelio; kitaip - null */
  function pvmTarifasSk() {
    var t = String(F.pvmTarifas || "").trim().replace(/\s*%$/, "");
    if (!/^\d{1,2}([.,]\d{1,2})?$/.test(t)) return null;
    var v = Number(t.replace(",", "."));
    return v > 0 && v < 100 ? v : null;
  }
  /* Taikomas PVM tarifas (dalis): kitas - tiekėjo įrašytas, kitaip - standartinis; neperskaitytas kitas - null */
  function taikomasTarifas() { if (F.pvm === true && F.pvmKitas) { var v = pvmTarifasSk(); return v === null ? null : v / 100; } return tarifas(); }
  function procTekstas(t) { return typeof t === "number" ? " (" + fmt(t * 100, 0, 2) + "\u00a0%)" : ""; }
  /* Sakinys su taškas gale (kvietimo tekstą iniciatorius gali parašyti be jo, M6) */
  function sakinys(t) { t = String(t || "").replace(/\s*\n\s*/g, "; ").trim(); return t && !/[.!?…]$/.test(t) ? t + "." : t; }

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
  /* Dviprasmiška kaina (2026-11-27, tiekėjo patikra D3): vienas skyriklis ir lygiai trys skaitmenys po jo („2,375“, „12.500“) gali būti ir
     eurai su tūkstantosiomis, ir tūkstančiai - tiekėjas patikslina pats, tyliai nepasirenkama. */
  function dviTekstas(t) { return String(t || "").trim().replace(/^(eur|€)\s*/i, "").replace(/\s*(eur|€)$/i, "").trim(); }
  function dviprasmiska(t) { return /^[1-9]\d{0,2}[.,]\d{3}$/.test(dviTekstas(t)); }
  function dviReiksmes(t) { var x = dviTekstas(t); return { d: Number(x.replace(",", ".")), t: Number(x.replace(/[.,]/, "")), x: x }; }
  function ikainis(i) {
    var t = F.ik[i];
    if (dviprasmiska(t)) { var a = F.ikAiskus[i]; return a && a.t === String(t).trim() ? a.v : "dvi"; }
    return skaitykSuma(t);
  }
  /* Kvietimo tekstai pagal kalbą (T5): anglų pavadinimai - jei iniciatorius juos įrašė, mato vienetai - dažniausi išverčiami. */
  function pozPav(p) { return KALBA === "en" && p.pavEn ? p.pavEn : p.pav; }
  function pozMat(p) { return KALBA === "en" ? A.matEn(p.mat) : p.mat; }
  function mailtoAdresas(p) { return encodeURIComponent(p).replace(/%40/g, "@"); }

  /* ---------- kvietimo įkėlimas ---------- */
  /* Įklijuota trumpa nuoroda (https://g-procure.com/k/#<ID>) - atveriama ji (kodą gauna puslapis k/) */
  /* Ir per „Safe Links“ (koduota „%2F“, „%23“) ar vien ID (2026-11-27, tiekėjo patikra V5, M7) */
  function trumposId(t) {
    t = A.nuorodosTekstas(t);     // ir Proofpoint perrašytos nuorodos (M3)
    var m = /g-procure\.com(?:\/|%(?:25)?2F)k(?:\/|%(?:25)?2F)?(?:#|%(?:25)?23)([0-9A-Za-z-]{10,14})(?![0-9A-Za-z])/i.exec(t);
    if (m) return m[1].replace(/-/g, "").toUpperCase();
    /* Vien 10 ženklų ID - ir be skaitmenų (M1): serveris ID kuria iš 32 ženklų abėcėlės be I, L, O ir U (O laikomas 0, I ir L - 1, kaip puslapyje k/) */
    var x = t.trim().replace(/[\s-]/g, "").replace(/[.,;:!?)\]]+$/, "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
    return /^[0-9A-HJKMNP-TV-Z]{10}$/.test(x) ? x : null;
  }
  function ikelk(tekstas) {
    var tid = trumposId(tekstas);
    if (tid && /^[0-9A-Z]{10}$/.test(tid)) { (window.GP_PASIULYMAS && window.GP_PASIULYMAS.eik || function (u) { location.assign(u); })("../k/#" + tid); return Promise.resolve(); }
    var visi = A.isSarvo(tekstas), rasta = visi.filter(function (x) { return x.rusis !== "pasiulymas"; });
    if (!rasta.length) { K = null; KLAIDA = !tekstas ? "" : visi.length ? "pasiulymas" : "kodas"; return Promise.resolve(piesk()); }
    return A.atkoduok(rasta[0]).then(function (r) {
      var f = A.kvietimoForma(r.obj);
      if (!f.ok || !f.kvietimas.t) { K = null; KLAIDA = f.klaida === "versija" ? "versija" : "forma"; return piesk(); }
      K = f.kvietimas; KLAIDA = ""; REZ = null; ATKURTA = "";
      if (PASKUTINIS_T !== K.t) F = naujaF();    // kitas kvietimas - ankstesnio pasiūlymo duomenys ir patvirtinimai neperimami (M2)
      PASKUTINIS_T = K.t;
      if (!KALBA_PASIRINKTA) KALBA = K.kalba === "en" ? "en" : "lt";
      if (!F.pav) F.pav = K.tiekejas.pav;
      if (!F.pastas) F.pastas = K.tiekejas.pastas;
      return A.antspaudas(A.bendra(K)).then(function (h) { H = h; piesk(); });
    }, function (e) { K = null; KLAIDA = e && e.kodas === "narsykle" ? "narsykle" : "kodas"; piesk(); });
  }
  var KALBA_PASIRINKTA = false;
  /* Be kvietimo (sugadinta nuoroda) - naršyklės kalba: užsienio tiekėjui puslapis angliškai (trečia patikra M8); kvietimas kalbą nustato pats */
  try { var nk = String(navigator.language || "").toLowerCase(), lz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (!/^lt/.test(nk) && lz !== "Europe/Vilnius") KALBA = "en"; } catch (e) { /* lieka lietuvių */ }

  /* ---------- formos būsena ---------- */
  function skaitykForma() {
    var s = $("pslForma"); if (!s) return;
    s.querySelectorAll("[data-ik]").forEach(function (el) { F.ik[el.getAttribute("data-ik")] = el.value; });
    s.querySelectorAll("[data-past]").forEach(function (el) { F.past[el.getAttribute("data-past")] = el.value; });
    var pvm = s.querySelectorAll('[data-f="pvm"]');
    if (pvm.length) { F.pvm = null; F.pvmKitas = false; pvm.forEach(function (r) { if (r.checked) { F.pvm = r.value !== "ne"; F.pvmKitas = r.value === "kitas"; } }); }
    s.querySelectorAll("[data-f]").forEach(function (el) {
      var k = el.getAttribute("data-f");
      if (k === "pvm") return;
      if (el.type === "checkbox") { if (k === "fizinis") F.fizinis = el.checked; else F.patv[k] = el.checked; } else F[k] = el.value;
    });
  }
  function skaiciuok() {
    var eil = K.pozicijos.map(function (p, i) { var ik = ikainis(i); return { i: i, ikainis: ik === "dvi" ? null : ik, pastaba: A.eilute(F.past[i] || "", A.RIBOS.trumpas) }; });
    return A.sumos(K, { eilutes: eil, pvm: F.pvm === true }, taikomasTarifas());
  }
  function rodykSumas() {
    if (!K || !$("pslForma")) return;
    var s = skaiciuok();
    s.eilutes.forEach(function (e) { var el = doc.querySelector('[data-suma="' + e.i + '"]'); if (el) el.textContent = e.suma === null ? "-" : fmt(e.suma, 2, 2); });
    /* Kol ne visos kainos įrašytos ar patikslintos, dalinė suma nerodoma kaip galutinė (M2) */
    var dalis = s.truksta > 0;
    $("pslSumBe").textContent = dalis ? trukstaTekstas(s) : eur(s.viso);
    /* Labai maža bendra kaina - įspėjimas, ne kliūtis (trečia patikra M6): gal kaina įrašyta ne tais vienetais */
    var mz = $("pslSumPst"); if (mz) { var rodyti = !dalis && s.viso > 0 && s.viso < 1; mz.hidden = !rodyti; mz.textContent = rodyti ? L("Bendra kaina mažesnė nei 1 Eur - patikrinkite, ar kainos įrašytos teisingai.", "The total price is below 1 EUR - check that the prices are entered correctly.") : ""; }
    $("pslSumPvmEil").hidden = $("pslSumPvmEil2").hidden = F.pvm !== true;
    $("pslSumPvmProc").textContent = procTekstas(s.tarifas);
    $("pslSumPvm").textContent = dalis || s.suPvm === null ? "-" : eur(s.pvmSuma);
    $("pslSumSu").textContent = F.pvm === null || dalis ? "-" : F.pvm ? (s.suPvm === null ? "-" : eur(s.suPvm)) : eur(s.viso);
    $("pslSumSuEt").textContent = F.pvm === true ? L("Iš viso su PVM", "Total incl. VAT") : F.pvm === false ? L("Iš viso (PVM nepridedamas)", "Total (VAT not added)") : L("Iš viso", "Total");
    var tl = $("psl-pvmTarifas-l"); if (tl) tl.hidden = !(F.pvm === true && F.pvmKitas);
    pvmPastaba();
  }
  /* Kiek kainų trūksta ir kiek reikia patikslinti (dviprasmiškos „2,375“ - įrašytos, bet neaiškios; trečia patikra M4) */
  function neaiskiu() { return K.pozicijos.filter(function (p, i) { return ikainis(i) === "dvi"; }).length; }
  function trukstaTekstas(s) {
    var n = neaiskiu(), t = s.truksta - n, d = [];
    if (t > 0) d.push(L("trūksta kainų: " + t + " poz.", "prices missing: " + t + " item(s)"));
    if (n > 0) d.push(L("patikslinkite kainą: " + n + " poz.", "clarify the price: " + n + " item(s)"));
    return d.join(L("; ", "; "));
  }
  /* PVM kodo ir atsakymo nesutapimas - įspėjimas, ne kliūtis (D3): Lietuvos PVM kodas ir „Ne“ - gal pamiršta pridėti PVM; ne Lietuvos kodas ir
     „Taip“ - „Taip“ reiškia Lietuvos PVM. Įrankis PVM taikymo nevertina - sprendžia tiekėjas, prireikus paklausęs kontaktinio asmens. */
  function pvmPastaba() {
    var el = $("psl-pvm-pst"); if (!el) return;
    /* Lietuvos PVM kodas - „LT“ ir 9 arba 12 skaitmenų (ir be „LT“); kiti vien skaitmenys šalies neparodo (trečia patikra M1) */
    var kodas = String(F.pvmKodas || "").toUpperCase().replace(/[\s.-]/g, ""), lt = /^(LT)?(\d{9}|\d{12})$/.test(kodas), uzs = /^[A-Z]{2}/.test(kodas) && kodas.slice(0, 2) !== "LT", kitas = !!kodas && !lt && !uzs;
    var t = F.pvm === false && kitas ? L("Įrašėte PVM mokėtojo kodą, bet pažymėjote, kad PVM nepridedamas. Jei esate PVM mokėtojai Lietuvoje ir PVM taikomas, pasirinkite „Taip“.",
        "You entered a VAT number but chose that VAT is not added. If you are VAT registered in Lithuania and VAT applies, choose “Yes”.")
      : F.pvm === false && lt ? L("Įrašėte Lietuvos PVM mokėtojo kodą, bet pažymėjote, kad PVM nepridedamas. Jei PVM taikomas, pasirinkite „Taip“ - kitaip jūsų kaina bus laikoma galutine, be PVM.",
        "You entered a Lithuanian VAT number but chose that VAT is not added. If VAT applies, choose “Yes” - otherwise your price will be treated as final, without VAT.")
      : F.pvm === true && uzs ? L("Įrašėte ne Lietuvos PVM mokėtojo kodą. „Taip“ pasirinkite tik tada, kai esate įregistruoti PVM mokėtojais Lietuvoje ir prie kainos pridedate Lietuvos PVM. Jei neaišku, paklauskite kontaktinio asmens.",
        "You entered a non-Lithuanian VAT number. Choose “Yes” only if you are VAT registered in Lithuania and add Lithuanian VAT to the price. If unsure, ask the contact person.") : "";
    el.hidden = !t;
    el.textContent = t;
  }
  /* „Įmonės kodas“ lauke 11 skaitmenų, panašių į asmens kodą (trečia patikra D2): įspėjimas, ne kliūtis - Latvijos įmonių kodai irgi 11 skaitmenų */
  function kodoPastaba() {
    var el = $("psl-kodas-pst"); if (!el) return false;
    var rodyti = !F.fizinis && /^[3-6]\d{10}$/.test(String(F.kodas || "").replace(/[\s.-]/g, ""));
    el.hidden = !rodyti;
    el.textContent = rodyti ? L("Įrašytas 11 skaitmenų kodas panašus į asmens kodą. Jei pasiūlymą teikiate kaip fizinis asmuo, pažymėkite langelį „Pasiūlymą teikiu kaip fizinis asmuo“ ir asmens kodo nenurodykite. Jei tai užsienio įmonės kodas, šio įspėjimo nepaisykite.",
      "The 11-digit number entered looks like a personal identification number. If you are submitting as a natural person, tick “I am submitting the quotation as a natural person” and do not enter your personal code. If this is a foreign company code, ignore this warning.") : "";
    return rodyti;
  }
  /* Dviprasmiškos kainos klausimas prie lauko */
  /* Rodoma jau rašant (M3), sritis gyva - klausimą išgirsta ir ekrano skaitytuvas; tas pats klausimas neperpiešiamas */
  function rodykDvi(i) {
    var el = $("psl-ik" + i + "-dv"); if (!el) return;
    if (ikainis(i) !== "dvi") { if (!el.hidden) { el.hidden = true; el.innerHTML = ""; el.removeAttribute("data-x"); } return; }
    var r = dviReiksmes(F.ik[i]);
    if (!el.hidden && el.getAttribute("data-x") === r.x + KALBA) return;
    var sv = Math.floor(r.d), ct = Math.round((r.d - sv) * 1000) / 10;
    el.hidden = false; el.setAttribute("data-x", r.x + KALBA);
    el.innerHTML = '<span>' + esc(L("Kaip suprasti „" + r.x + "“?", "How should “" + r.x + "” be read?")) + '</span>' +
      '<button type="button" class="ea-btn ea-btn--maz" data-veiksmas="pslDvi" data-i="' + i + '" data-v="d">' + esc(fmt(r.d, 2, 4) + "\u00a0" + L("Eur", "EUR") + " (" + sv + "\u00a0" + L("Eur", "EUR") + " " + fmt(ct, 0, 1) + "\u00a0" + L("ct", "cents") + ")") + '</button>' +
      '<button type="button" class="ea-btn ea-btn--maz" data-veiksmas="pslDvi" data-i="' + i + '" data-v="t">' + esc(fmt(r.t, 2, 4) + "\u00a0" + L("Eur", "EUR")) + '</button>';
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
      narsykle: L("Ši naršyklė kvietimo perskaityti negali. Atverkite nuorodą kompiuteryje arba atnaujinkite telefono ar planšetės sistemą (iPhone ir iPad - iOS 16.4 ar naujesnė; jose visos naršyklės veikia tuo pačiu varikliu, todėl kita naršyklė nepadės).",
        "This browser cannot read the invitation. Open the link on a computer or update your phone or tablet (iPhone and iPad - iOS 16.4 or later; all browsers there use the same engine, so another browser will not help)."),
      pasiulymas: L("Įklijavote pasiūlymo laišką, ne kvietimą. Pirmiausia atverkite nuorodą iš kvietimo laiško; norėdami pakeisti išsiųstą pasiūlymą, formoje pasirinkite „Norite pakeisti jau išsiųstą pasiūlymą?“.",
        "You pasted a quotation email, not the invitation. First open the link from the invitation email; to change a quotation you have sent, choose “Want to change a quotation you have already sent?” in the form.") }[KLAIDA];
    return '<section class="ea-card" aria-labelledby="pslIvH">' +
      '<h3 id="pslIvH">' + L("Atverkite kvietimą", "Open the invitation") + '</h3>' +
      '<p class="ea-sub">' + L("Šis puslapis atveriamas iš nuorodos, kurią gavote kvietimo laiške. Jei nuoroda neatsivėrė visa, įklijuokite ją čia.",
        "This page opens from the link you received in the invitation email. If the link did not open completely, paste it here.") + '</p>' +
      (kl ? '<div class="ea-pastaba ea-pastaba--klaida" role="alert">' + esc(kl) + '</div>' : '') +
      '<div class="ea-laukas ea-laukas--visas"><label for="pslNuoroda">' + L("Kvietimo nuoroda arba kodas", "Invitation link or code") + '</label>' +
      '<textarea id="pslNuoroda" rows="3" autocomplete="off" spellcheck="false" aria-describedby="pslNuorodaUz" placeholder="' + L("pvz., https://g-procure.com/k/#7F3K9QX2MZ", "e.g. https://g-procure.com/k/#7F3K9QX2MZ") + '"></textarea>' +
      '<span class="ea-uzuomina" id="pslNuorodaUz">' + L("Tinka visa nuoroda, nuoroda iš „Outlook“ apsaugos ar vien 10 ženklų kodas po „#“.", "The whole link, a link rewritten by Outlook protection or just the 10-character code after “#” will do.") + '</span></div>' +
      '<div class="ea-eile" style="margin-top:12px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="pslAtverk">' + L("Atverti kvietimą", "Open the invitation") + '</button></div>' +
      '</section>';
  }
  /* Terminas ir tiekėjo laiku, kai jo naršyklės laiko juosta ne Lietuvos (užsienio tiekėjui) */
  function vietinisLaikas(iso) {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz || tz === "Europe/Vilnius") return "";
      return new Date(iso).toLocaleString(KALBA === "en" ? "en-GB" : "lt-LT", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }
  /* Kontaktinio asmens adresas ne pirkimo vykdytojo domeno (V3, T4): tik įspėjimas - domenas iš G-Procure organizacijų sąrašo
     (organizacijos el. paštas iš jos dokumentų); organizacijos ar jos adreso sąraše nėra - netikrinama */
  function domenoPastaba() {
    var r = window.GP_ORG && window.GP_ORG.rekvizitai(K.pirkejas.pav), pd = r && r.elPastas ? String(r.elPastas).split("@")[1].toLowerCase() : "", kd = (String(K.kontaktas.pastas || "").split("@")[1] || "").toLowerCase();
    if (!pd || !kd || kd === pd || kd.slice(-(pd.length + 1)) === "." + pd) return "";
    return '<div class="ea-pastaba ea-pastaba--demesio" id="pslDomenas"><strong>' + L("Patikrinkite, ar kvietimas tikras", "Check that the invitation is genuine") + '</strong>' +
      esc(L("Kontaktinio asmens adresas („" + K.kontaktas.pastas + "“) ne " + K.pirkejas.pav + " domeno („" + pd + "“). Prieš siųsdami pasiūlymą patikrinkite kvietimą jums žinomais " + K.pirkejas.pav + " kontaktais.",
        "The contact person's address (“" + K.kontaktas.pastas + "”) is not on the " + K.pirkejas.pav + " domain (“" + pd + "”). Before sending your quotation, check the invitation using " + K.pirkejas.pav + " contact details you already know.")) + '</div>';
  }
  function kvietimoHtml() {
    var lk = A.liko(K.terminas, new Date(), KALBA), kt = K.kontaktas, vl = vietinisLaikas(K.terminas);
    var ltTekstas = KALBA === "en" && (!K.pavadinimasEn || K.pozicijos.some(function (p) { return !p.pavEn; }) || K.aprasymas || K.pristatymoVieta || K.pristatymoTerminas || K.apmokejimas || K.dokumentai);
    var s = '<section class="ea-hero" aria-labelledby="pslKvH"><div>' +
      '<div class="ea-hero-nr">' + L("KVIETIMAS PATEIKTI PASIŪLYMĄ", "REQUEST FOR QUOTATION") + ' · ' + esc(K.id) + '</div>' +
      '<h2 id="pslKvH">' + esc(A.pavadinimas(K, KALBA)) + '</h2>' +
      '<div class="ea-hero-meta"><span>' + L("Pirkimo vykdytojas", "Buyer") + ': <b>' + esc(K.pirkejas.pav) + '</b></span>' +
      '<span>' + L("Kvietimas skirtas", "Invitation for") + ': <b>' + esc(K.tiekejas.pav || K.tiekejas.pastas) + '</b></span></div></div>' +
      '<div class="ea-laikr"><span>' + L("Pasiūlymų terminas (Lietuvos laiku)", "Deadline (Lithuanian time)") + '</span><b>' + esc(A.rodykLaika(K.terminas)) + '</b>' +
      (vl ? '<i>' + esc(L("jūsų laiku: ", "your time: ") + vl) + '</i>' : '') + '<i id="pslLiko"' + (lk.skubu ? ' class="ea-skubu"' : '') + '>' + esc(lk.tekstas) + '</i></div></section>' + domenoPastaba();
    s += '<section class="ea-card" aria-labelledby="pslKaH"><h3 id="pslKaH">' + L("Ką perkame", "What we are buying") + '</h3>' +
      (ltTekstas ? '<p class="ea-uzuomina" style="margin-bottom:12px">Some of the text below is in Lithuanian, as written by the buyer. If anything is unclear, ask the contact person.</p>' : '');
    if (K.aprasymas) s += '<p style="white-space:pre-line;margin-bottom:16px">' + esc(K.aprasymas) + '</p>';
    s += '<dl class="ea-dl">' +
      (K.pristatymoVieta ? '<dt>' + L("Pristatymo ar atlikimo vieta", "Place of delivery or performance") + '</dt><dd>' + esc(K.pristatymoVieta) + '</dd>' : '') +
      (K.pristatymoTerminas ? '<dt>' + L("Pristatymo ar atlikimo terminas", "Delivery or performance period") + '</dt><dd>' + esc(K.pristatymoTerminas) + '</dd>' : '') +
      (K.apmokejimas ? '<dt>' + L("Apmokėjimas", "Payment") + '</dt><dd>' + esc(K.apmokejimas) + '</dd>' : '') +
      '<dt>' + L("Vertinimas", "Evaluation") + '</dt><dd>' + L("Laimi mažiausia bendra kaina be PVM iš reikalavimus atitinkančių pasiūlymų; jei kainos vienodos, laimi anksčiau gautas pasiūlymas.", "The lowest total price excluding VAT among the quotations that meet the requirements wins; if prices are equal, the quotation received earlier wins.") + '</dd>' +
      (K.galiojaMin ? '<dt>' + L("Pasiūlymo galiojimas", "Validity of the quotation") + '</dt><dd>' + L("ne trumpiau kaip " + K.galiojaMin + " d. nuo pasiūlymų termino", "at least " + K.galiojaMin + " days from the deadline") + '</dd>' : '') +
      '<dt>' + L("Pasiūlymų atvėrimas", "Opening of quotations") + '</dt><dd>' + L("Pasibaigus terminui. Jei pasiūlymus pateikia visi kviesti tiekėjai, jie gali būti atverti ir anksčiau - tada pateikto pasiūlymo pakeisti nebegalima.", "After the deadline. If all invited suppliers submit quotations, they may be opened earlier - then a submitted quotation can no longer be changed.") + '</dd>' +
      (K.dokumentai ? '<dt>' + L("Prie laiško pridėkite", "Attach to the email") + '</dt><dd style="white-space:pre-line">' + esc(K.dokumentai) + '</dd>' : '') +
      '<dt>' + L("Kontaktinis asmuo", "Contact person") + '</dt><dd>' + esc(kt.vardas ? kt.vardas + ", " : "") + '<a href="mailto:' + esc(mailtoAdresas(kt.pastas)) + '">' + esc(kt.pastas) + '</a>' + (kt.tel ? ', <span class="ea-nelauz">' + esc(kt.tel) + '</span>' : "") + '</dd>' +
      '</dl>' +
      '<p class="ea-uzuomina" style="margin-top:12px">' + L("Kvietimas atvertas iš nuorodos - G-Procure netikrina, kas ją išsiuntė. Jei abejojate, ar kvietimas tikras, susisiekite su pirkimo vykdytoju jums žinomais kontaktais.",
        "The invitation was opened from the link - G-Procure does not verify who sent it. If you doubt whether the invitation is genuine, contact the buyer using contact details you already know.") + '</p>' +
      '<details class="ea-tech"><summary>' + L("Techninė informacija", "Technical information") + '</summary><p class="ea-uzuomina">' +
        L("Kvietimo antspaudas: ", "Invitation fingerprint: ") + '<span class="ea-antsp">' + esc(A.trumpas(H)) + '</span>' +
        L(" - pagal jį pirkimo vykdytojas gali patikrinti, kad pasiūlymas parengtas būtent šiam kvietimui.", " - with it the buyer can check that the quotation was prepared for exactly this invitation.") + '</p></details></section>';
    return s;
  }
  function laukas(k, et, o) {
    o = o || {};
    return '<div class="ea-laukas' + (o.visas ? " ea-laukas--visas" : "") + '"><label for="psl-' + k + '"' + (o.privaloma ? ' class="ea-privaloma"' : '') + '>' + esc(et) + '</label>' +
      '<input type="' + (o.tipas || "text") + '" id="psl-' + k + '" data-f="' + k + '" value="' + esc(F[k] || "") + '" autocomplete="' + (o.auto || "off") + '"' +
      (o.pvz ? ' placeholder="' + esc(o.pvz) + '"' : '') + (o.rezimas ? ' inputmode="' + o.rezimas + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.privaloma ? ' aria-required="true"' : '') +
      (o.veiksmas ? ' data-veiksmas-input="' + o.veiksmas + '"' : '') + (o.isjungta ? ' disabled' : '') + ' aria-describedby="psl-' + k + '-kl' + (o.uzuomina ? " psl-" + k + "-uz" : "") + '">' +
      (o.uzuomina ? '<span class="ea-uzuomina" id="psl-' + k + '-uz">' + esc(o.uzuomina) + '</span>' : '') + '<span class="ea-klaida" id="psl-' + k + '-kl" hidden></span>' +
      (o.pst ? '<div class="ea-pastaba ea-pastaba--demesio" id="psl-' + k + '-pst" hidden></div>' : '') + '</div>';
  }
  /* Patvirtinimai - formai ir spausdinamam pasiūlymui */
  function patvirtinimai() {
    var patv = [["atitinka", L("Siūlomos prekės, paslaugos ar darbai atitinka kvietime nurodytus reikalavimus.", "The goods, services or works offered meet the requirements stated in the invitation.")],
      ["kaina", L("Į kainą įskaičiuotos visos išlaidos ir mokesčiai, išskyrus PVM.", "The price includes all costs and taxes except VAT.")],
      ["igaliotas", L("Turiu teisę teikti šį pasiūlymą tiekėjo vardu.", "I have the right to submit this quotation on behalf of the supplier.")]];
    if (K.nacsaugumas) patv.push([A.NACSAUG, L("Tiekėjas, jo subtiekėjai ir ūkio subjektai, kurių pajėgumais remiamasi, atitinka nacionalinio saugumo reikalavimus, nurodytus pirkimo vykdytojo mažos vertės pirkimų tvarkos aprašo 27.2.3 ir 31.4 punktuose (be kita ko, prekių gamintojas ar paslaugų teikėjas nėra registruotas Lietuvos Respublikos Vyriausybės patvirtintame sąraše nurodytose valstybėse ar teritorijose). Šis patvirtinimas pateikiamas vietoje atskiros atitikties deklaracijos.",
      "The supplier, its subcontractors and the entities whose capacities are relied upon meet the national security requirements referred to in points 27.2.3 and 31.4 of the buyer's low-value procurement rules (among other things, the manufacturer of the goods or the service provider is not registered in the states or territories listed by the Government of the Republic of Lithuania). This confirmation is given instead of a separate declaration of conformity.")]);
    return patv;
  }
  function formosHtml(praejo) {
    var t = tarifas(), proc = t === null ? "" : " (" + fmt(t * 100, 0, 2) + "\u00a0%)";
    var s = '<form id="pslForma" novalidate' + (REZ ? ' hidden' : '') + '>';
    /* Po termino forma neužrakinama (M5): terminą lemia, kada laišką gauna pirkimo vykdytojas, o tiekėjo kompiuterio laikrodis gali skubėti */
    if (praejo) s += '<div class="ea-pastaba ea-pastaba--klaida" role="alert" id="pslPraejoF" tabindex="-1"><strong>' + L("Pagal jūsų kompiuterio laikrodį pasiūlymų terminas praėjo", "According to your computer's clock, the deadline has passed") + '</strong>' +
      L("Ar pasiūlymas pateiktas laiku, lemia, kada laišką gauna pirkimo vykdytojas: po termino gautas pasiūlymas nevertinamas. Jei manote, kad terminas dar nepraėjo, siųskite nedelsdami; jei abejojate - susisiekite su kontaktiniu asmeniu.",
        "Whether the quotation is on time depends on when the buyer receives the email: a quotation received after the deadline is not evaluated. If you believe the deadline has not passed yet, send it without delay; if in doubt, contact the contact person.") + '</div>';
    if (ATKURTA) s += '<div class="ea-pastaba ea-pastaba--gerai" role="status"><strong>' + L("Forma užpildyta pagal jūsų pasiūlymą", "The form has been filled in from your quotation") + '</strong>' +
      esc(L("Parengta " + ATKURTA + " (Lietuvos laiku). Pakeiskite, ką reikia, iš naujo pažymėkite patvirtinimus ir paspauskite „Siųsti pasiūlymą“.", "Prepared " + ATKURTA + " (Lithuanian time). Change what you need, tick the confirmations again and click “Send the quotation”.")) + '</div>';
    if (!praejo) s += atkurimoHtml();
    s += '<section class="ea-card" aria-labelledby="pslKnH"><h3 id="pslKnH">' + L("Jūsų kainos", "Your prices") + '</h3>' +
      '<p class="ea-sub">' + L("Įrašykite kiekvienos pozicijos vieneto kainą eurais be PVM. Sumos suskaičiuojamos automatiškai.", "Enter the unit price of each item in euros excluding VAT. Totals are calculated automatically.") + '</p>' +
      '<div class="ea-lent-remas"><table class="ea-lent ea-lent--kort"><thead><tr><th scope="col" style="width:48px">' + L("Nr.", "No.") + '</th><th scope="col" style="min-width:220px">' + L("Pozicija", "Item") + '</th><th scope="col" class="ea-sk" style="width:110px">' + L("Kiekis", "Quantity") +
      '</th><th scope="col" class="ea-sk" style="width:180px">' + L("Vieneto kaina be PVM, Eur", "Unit price excl. VAT, EUR") + '</th><th scope="col" class="ea-sk" style="width:130px">' + L("Suma be PVM, Eur", "Amount excl. VAT, EUR") +
      '</th><th scope="col" style="width:200px">' + L("Jūsų pastaba", "Your remark") + '</th></tr></thead><tbody>';
    K.pozicijos.forEach(function (p, i) {
      s += '<tr><td data-e="' + L("Nr.", "No.") + '">' + (i + 1) + '</td><th scope="row" style="font-weight:400"><span class="ea-poz-pav">' + esc(pozPav(p)) + '</span>' + (p.pastaba ? '<span class="ea-poz-past">' + esc(p.pastaba) + '</span>' : '') + '</th>' +
        '<td class="ea-sk" data-e="' + L("Kiekis", "Quantity") + '">' + fmt(p.kiekis, 0, 4) + (p.mat ? "\u00a0" + esc(pozMat(p)) : "") + '</td>' +
        '<td class="ea-sk ea-su-lauku" data-e="' + L("Vieneto kaina be PVM, Eur", "Unit price excl. VAT, EUR") + '"><input type="text" class="ea-skaicius" inputmode="decimal" autocomplete="off" data-ik="' + i + '" value="' + esc(F.ik[i] || "") + '" placeholder="' + L("pvz., 125,50", "e.g. 125.50") +
          '" aria-label="' + esc(L("Vieneto kaina be PVM", "Unit price excl. VAT") + ": " + pozPav(p)) + '" aria-required="true" aria-describedby="psl-ik' + i + '-kl psl-ik' + i + '-dv" data-veiksmas-input="pslSumos" data-veiksmas-change="pslIkainis"' + '>' +
          '<span class="ea-klaida" id="psl-ik' + i + '-kl" hidden></span><div class="ea-dvi" id="psl-ik' + i + '-dv" aria-live="polite" hidden></div></td>' +
        '<td class="ea-sk" data-e="' + L("Suma be PVM, Eur", "Amount excl. VAT, EUR") + '"><b data-suma="' + i + '">-</b></td>' +
        '<td class="ea-su-lauku" data-e="' + L("Jūsų pastaba", "Your remark") + '"><input type="text" autocomplete="off" maxlength="' + A.RIBOS.trumpas + '" data-past="' + i + '" value="' + esc(F.past[i] || "") + '" placeholder="' + L("pvz., siūlomas modelis", "e.g. model offered") +
          '" aria-label="' + esc(L("Pastaba", "Remark") + ": " + pozPav(p)) + '"' + '></td></tr>';
    });
    var dis = "";
    s += '</tbody></table></div>' +
      /* PVM - trys atsakymai (T1): Lietuvos PVM mokėtojas standartiniu tarifu, kitu tarifu (tiekėjas įrašo procentus), PVM nepridedamas */
      '<fieldset class="ea-grupe" id="psl-pvm" role="radiogroup" aria-required="true" style="margin-top:16px" aria-describedby="psl-pvm-uz psl-pvm-kl psl-pvm-pst"><legend class="ea-privaloma">' + L("Ar prie kainos pridedamas PVM?", "Is VAT added to the price?") + '</legend>' +
        '<label class="ea-zymimas"><input type="radio" name="psl-pvm" id="psl-pvm-taip" data-f="pvm" value="taip" data-veiksmas-change="pslPvm"' + (F.pvm === true && !F.pvmKitas ? " checked" : "") + dis + '><span>' +
          L("Taip - esame PVM mokėtojai Lietuvoje, pridedamas PVM", "Yes - we are VAT registered in Lithuania, VAT is added") + esc(proc) + '</span></label>' +
        '<label class="ea-zymimas"><input type="radio" name="psl-pvm" id="psl-pvm-kitas" data-f="pvm" value="kitas" data-veiksmas-change="pslPvm"' + (F.pvm === true && F.pvmKitas ? " checked" : "") + dis + '><span>' +
          L("Taip, bet taikomas kitas PVM tarifas", "Yes, but a different VAT rate applies") + '</span></label>' +
        '<div class="ea-laukas" id="psl-pvmTarifas-l" style="max-width:240px;margin:0 0 4px 28px"' + (F.pvm === true && F.pvmKitas ? '' : ' hidden') + '><label for="psl-pvmTarifas" class="ea-privaloma">' + L("PVM tarifas, %", "VAT rate, %") + '</label>' +
          '<input type="text" id="psl-pvmTarifas" data-f="pvmTarifas" inputmode="decimal" autocomplete="off" maxlength="6" aria-required="true" value="' + esc(F.pvmTarifas || "") + '" placeholder="' + L("pvz., 9", "e.g. 9") + '" data-veiksmas-input="pslSumos" aria-describedby="psl-pvmTarifas-kl"><span class="ea-klaida" id="psl-pvmTarifas-kl" hidden></span></div>' +
        '<label class="ea-zymimas"><input type="radio" name="psl-pvm" id="psl-pvm-ne" data-f="pvm" value="ne" data-veiksmas-change="pslPvm"' + (F.pvm === false ? " checked" : "") + dis + '><span>' +
          L("Ne - PVM nepridedamas (nesame PVM mokėtojai Lietuvoje arba PVM netaikomas)", "No - VAT is not added (not VAT registered in Lithuania or VAT does not apply)") + '</span></label>' +
        '<span class="ea-uzuomina" id="psl-pvm-uz">' + L("Įrankis PVM taikymo nevertina: jei neaišku, kuris atsakymas tinka, paklauskite kontaktinio asmens.", "The tool does not assess how VAT applies: if unsure which answer fits, ask the contact person.") + '</span>' +
        '<span class="ea-klaida" id="psl-pvm-kl" hidden></span><div class="ea-pastaba ea-pastaba--demesio" id="psl-pvm-pst" hidden></div></fieldset>' +
      '<dl class="ea-sumos"><dt>' + L("Iš viso be PVM", "Total excl. VAT") + '</dt><dd id="pslSumBe">-</dd>' +
      '<dt id="pslSumPvmEil">' + L("PVM", "VAT") + '<span id="pslSumPvmProc">' + esc(proc) + '</span></dt><dd id="pslSumPvmEil2"><span id="pslSumPvm">-</span></dd>' +
      '<dt class="ea-viso" id="pslSumSuEt"></dt><dd class="ea-viso" id="pslSumSu">-</dd></dl><div class="ea-pastaba ea-pastaba--demesio" id="pslSumPst" hidden></div><p class="ea-sr" id="pslSumPr" aria-live="polite"></p></section>';
    s += '<section class="ea-card" aria-labelledby="pslSaH"><h3 id="pslSaH">' + L("Pasiūlymo sąlygos", "Terms of the quotation") + '</h3><div class="ea-laukai" style="margin-top:12px">' +
      laukas("galioja", L("Pasiūlymas galioja (dienų nuo pasiūlymų termino)", "The quotation is valid for (days from the deadline)"), { privaloma: true, rezimas: "numeric", pvz: L("pvz., ", "e.g. ") + (K.galiojaMin || 30), max: 3,
        uzuomina: K.galiojaMin ? L("Kvietime reikalaujama ne trumpiau kaip " + K.galiojaMin + " d.", "The invitation requires at least " + K.galiojaMin + " days.") : "" }) +
      laukas("pristatymas", L("Pristatymo ar atlikimo terminas", "Delivery or performance period"), { pvz: L("pvz., per 14 dienų nuo užsakymo", "e.g. within 14 days of the order"), max: A.RIBOS.trumpas,
        uzuomina: K.pristatymoTerminas ? L("Kvietime nurodyta: ", "Stated in the invitation: ") + K.pristatymoTerminas : "" }) +
      '<div class="ea-laukas ea-laukas--visas"><label for="psl-pastabos">' + L("Pastabos pirkimo vykdytojui", "Remarks for the buyer") + '</label>' +
      '<textarea id="psl-pastabos" data-f="pastabos" rows="3" maxlength="2000" placeholder="' + L("pvz., garantijos sąlygos", "e.g. warranty terms") + '"' + '>' + esc(F.pastabos) + '</textarea></div></div></section>';
    s += '<section class="ea-card" aria-labelledby="pslTkH"><h3 id="pslTkH">' + L("Jūsų duomenys", "Your details") + '</h3><div class="ea-laukai" style="margin-top:12px">' +
      laukas("pav", L("Tiekėjo pavadinimas", "Supplier name"), { privaloma: true, auto: "organization", max: A.RIBOS.pavadinimas }) +
      /* Žymimasis langelis - prieš kodo lauką; jį pažymėjus ar nuėmus kodas išvalomas, kad asmens kodas nepatektų į pasiūlymą (D2) */
      '<div class="ea-laukas ea-laukas--visas"><label class="ea-zymimas"><input type="checkbox" data-f="fizinis" data-veiksmas-change="pslFizinis"' + (F.fizinis ? " checked" : "") + dis + '><span>' +
        L("Pasiūlymą teikiu kaip fizinis asmuo (individuali veikla)", "I am submitting the quotation as a natural person (self-employed)") + '</span></label></div>' +
      (F.fizinis ? laukas("kodas", L("Individualios veiklos pažymos ar verslo liudijimo numeris (neprivaloma)", "Individual activity certificate or business licence number (optional)"), { max: 20, uzuomina: L("Asmens kodo nenurodykite.", "Do not enter your personal identification number.") })
        : laukas("kodas", L("Įmonės kodas", "Company registration number"), { privaloma: true, max: 20, veiksmas: "pslKodas", pst: true })) +
      laukas("pvmKodas", L("PVM mokėtojo kodas", "VAT number"), { max: 20, pvz: L("pvz., LT100001234567", "e.g. LT100001234567"), veiksmas: "pslSumos" }) +
      laukas("adresas", L("Adresas", "Address"), { auto: "street-address", max: A.RIBOS.trumpas }) +
      laukas("asmuo", L("Pasiūlymą teikiantis asmuo", "Person submitting the quotation"), { privaloma: true, auto: "name", max: 120 }) +
      laukas("pastas", L("El. paštas", "Email"), { privaloma: true, tipas: "email", auto: "email", max: 120 }) +
      laukas("tel", L("Telefonas", "Phone"), { tipas: "tel", auto: "tel", max: 40 }) +
      '</div></section>';
    var patv = patvirtinimai();
    s += '<section class="ea-card" aria-labelledby="pslPtH"><h3 id="pslPtH">' + L("Patvirtinimai", "Confirmations") + '</h3>' +
      '<fieldset class="ea-grupe" id="pslPatv" style="display:grid;gap:10px;margin-top:12px" aria-describedby="psl-patv-kl"><legend class="ea-privaloma">' + L("Pažymėkite visus patvirtinimus", "Tick all confirmations") + '</legend>';
    patv.forEach(function (p) { s += '<label class="ea-zymimas"><input type="checkbox" data-f="' + p[0] + '" aria-required="true"' + (F.patv[p[0]] ? " checked" : "") + dis + '><span>' + esc(p[1]) + '</span></label>'; });
    s += '</fieldset><span class="ea-klaida" id="psl-patv-kl" hidden></span>' +
      (K.nacsaugumas ? '<details class="ea-tech" style="margin-top:12px"><summary>' + L("Ką reiškia nacionalinio saugumo patvirtinimas?", "What does the national security confirmation mean?") + '</summary><p class="ea-uzuomina">' +
        L("Šiame pirkime pagal pirkimo vykdytojo mažos vertės pirkimų tvarkos aprašo 27.2.3 ir 31.4 punktus taikomi įstatymų nacionalinio saugumo reikalavimai tiekėjams: tiekėjas, jo subtiekėjai ir ūkio subjektai, kurių pajėgumais remiamasi (ir juos kontroliuojantys asmenys), neturi būti registruoti Lietuvos Respublikos Vyriausybės patvirtintame sąraše nurodytose valstybėse ar teritorijose. Tas pats taikoma prekių gamintojui ar paslaugų teikėjui: jis neturi būti ten registruotas, o jei tai fizinis asmuo - ten nuolat gyventi ar turėti tos valstybės pilietybę. Aprašas tam reikalauja atitikties deklaracijos - šiame pirkime ją atstoja šis patvirtinimas. Jei jūsų pasiūlymas bus ekonomiškai naudingiausias, pirkimo vykdytojas gali paprašyti tai patvirtinančių dokumentų (pvz., juridinių asmenų registro išrašo). Tikslūs reikalavimai nustatyti apraše - jei reikia, paprašykite jo kontaktinio asmens.",
          "Under points 27.2.3 and 31.4 of the buyer's low-value procurement rules, the national security requirements of Lithuanian law apply to suppliers in this procurement: the supplier, its subcontractors and the entities whose capacities are relied upon (and the persons controlling them) must not be registered in the states or territories listed by the Government of the Republic of Lithuania. The same applies to the manufacturer of the goods or the service provider: it must not be registered there, and if it is a natural person, it must not permanently reside there or be a citizen of that state. The rules require a declaration of conformity for this - in this procurement this confirmation replaces it. If your quotation is the most economically advantageous, the buyer may ask for supporting documents (e.g. an extract from the register of legal entities). The exact requirements are set out in the rules - ask the contact person for them if needed.") + '</p></details>' : '') +
      '<div id="pslKlaidos" tabindex="-1"></div>' +
      /* Priedų priminimas - prieš siunčiant: pašto programa atsiveria virš naršyklės, rezultato kortelės tada nesimato (V1) */
      /* Domeno įspėjimas pakartojamas prie siuntimo (trečia patikra M8) */
      (domenoPastaba() ? '<div class="ea-pastaba ea-pastaba--demesio" id="pslDomenas2" style="margin-top:16px">' + esc(L("Prieš siųsdami: kontaktinio asmens adresas ne " + K.pirkejas.pav + " domeno - žr. įspėjimą puslapio viršuje.", "Before sending: the contact person's address is not on the " + K.pirkejas.pav + " domain - see the warning at the top of the page.")) + '</div>' : '') +
      (K.dokumentai ? '<div class="ea-pastaba ea-pastaba--demesio" id="pslPriedai" style="margin-top:16px"><strong>' + L("Prie laiško pridėkite", "Attach to the email") + '</strong>' + esc(sakinys(K.dokumentai)) + ' ' +
        L("Atsivėrusiame laiške juos pridėkite prieš paspausdami „Siųsti“.", "Attach them in the email that opens before clicking “Send”.") + '</div>' : '') +
      '<div class="ea-eile" style="margin-top:20px"><button type="button" class="ea-btn ea-btn--pagr" data-veiksmas="pslParenk"' + dis + '>' + L("Siųsti pasiūlymą", "Send the quotation") + '</button>' +
      '<span class="ea-uzuomina">' + (praejo ? L("Pagal jūsų kompiuterio laikrodį terminas praėjo - po termino gautas pasiūlymas nevertinamas.", "According to your computer's clock, the deadline has passed - a quotation received after the deadline is not evaluated.")
        : L("Jūsų pašto programoje turėtų atsiverti paruoštas laiškas kontaktiniam asmeniui - pasiūlymas pateiktas, kai jį išsiunčiate.", "A prepared email to the contact person should open in your email program - the quotation is submitted when you send it.")) + '</span></div></section>';
    s += '<p class="ea-uzuomina">' + L("Šis puslapis jūsų įvestų duomenų niekur nesiunčia ir nesaugo: pasiūlymą pirkimo vykdytojas gaus tik tada, kai patys išsiųsite laišką.",
      "This page does not send or store the data you enter: the buyer will receive the quotation only when you send the email yourself.") + '</p></form>';
    return s;
  }
  function laiskoHref() { var l = REZ.laiskas; return "mailto:" + mailtoAdresas(K.kontaktas.pastas) + "?subject=" + encodeURIComponent(l.tema) + "&body=" + encodeURIComponent(l.tekstas); }
  /* Pasiūlymo keitimas (V7): įklijavus savo išsiųstą laišką forma užpildoma iš naujo */
  function atkurimoHtml() {
    return '<details class="ea-tech ea-card ea-card--plona" id="pslAtkurti"><summary>' + L("Norite pakeisti jau išsiųstą pasiūlymą?", "Want to change a quotation you have already sent?") + '</summary>' +
      '<p class="ea-uzuomina" style="margin-top:8px">' + L("Iki termino galite parengti ir išsiųsti naują pasiūlymą - pirkimo vykdytojas vertins vėliau parengtą, jei jį gaus iki termino ir dar nebus atvėręs pasiūlymų (jei pasiūlymus pateikia visi kviesti tiekėjai, jie gali būti atverti anksčiau). Pakeisto pasiūlymo gavimo laikas - naujo laiško gavimo laikas: jei kainos vienodos, laimi anksčiau gautas pasiūlymas. Kad nereikėtų visko vesti iš naujo, įklijuokite savo išsiųstą laišką - forma bus užpildyta.",
        "Until the deadline you can prepare and send a new quotation - the buyer will evaluate the one prepared later if it is received before the deadline and before the quotations are opened (if all invited suppliers submit quotations, they may be opened earlier). The time a changed quotation is received is the time the new email is received: if prices are equal, the quotation received earlier wins. To avoid re-entering everything, paste the email you sent - the form will be filled in.") + '</p>' +
      '<div class="ea-laukas ea-laukas--visas"><label for="pslAtkurtiT">' + L("Jūsų išsiųstas laiškas", "The email you sent") + '</label><textarea id="pslAtkurtiT" rows="3" autocomplete="off" spellcheck="false" aria-describedby="pslAtkurtiB"></textarea></div>' +
      '<div class="ea-eile" style="margin-top:8px"><button type="button" class="ea-btn" data-veiksmas="pslAtkurk">' + L("Užpildyti formą", "Fill in the form") + '</button><span class="ea-uzuomina" id="pslAtkurtiB" role="status"></span></div></details>';
  }
  /* Spausdinamas visas pasiūlymas (V6) - ekrane nerodomas */
  function spaudaiHtml() {
    var p = REZ.pasiulymas, s = REZ.sumos, tk = p.tiekejas;
    var e = '<section class="ea-tik-spaudai" aria-hidden="true"><h3>' + L("Pasiūlymas", "Quotation") + '</h3><table class="ea-lent"><thead><tr><th>' + L("Nr.", "No.") + '</th><th>' + L("Pozicija", "Item") + '</th><th>' + L("Kiekis", "Quantity") + '</th><th>' +
      L("Vieneto kaina be PVM, Eur", "Unit price excl. VAT, EUR") + '</th><th>' + L("Suma be PVM, Eur", "Amount excl. VAT, EUR") + '</th><th>' + L("Pastaba", "Remark") + '</th></tr></thead><tbody>';
    K.pozicijos.forEach(function (poz, i) {
      var x = s.eilutes[i];
      e += '<tr><td>' + (i + 1) + '</td><td>' + esc(pozPav(poz)) + '</td><td>' + fmt(poz.kiekis, 0, 4) + (poz.mat ? " " + esc(pozMat(poz)) : "") + '</td><td>' + esc(fmt(x.ikainis, 2, 4)) + '</td><td>' + esc(fmt(x.suma, 2, 2)) + '</td><td>' + esc(x.pastaba || "") + '</td></tr>';
    });
    e += '</tbody></table><dl class="ea-dl"><dt>' + L("Iš viso be PVM", "Total excl. VAT") + '</dt><dd>' + esc(eur(s.viso)) + '</dd>' +
      (p.pvm ? '<dt>' + L("PVM", "VAT") + esc(procTekstas(s.tarifas)) + '</dt><dd>' + esc(eur(s.pvmSuma)) + '</dd><dt>' + L("Iš viso su PVM", "Total incl. VAT") + '</dt><dd>' + esc(eur(s.suPvm)) + '</dd>' : '<dt>' + L("PVM", "VAT") + '</dt><dd>' + L("nepridedamas", "not added") + '</dd>') +
      '<dt>' + L("Pasiūlymas galioja", "Valid for") + '</dt><dd>' + esc(p.galioja + " " + L("d. nuo pasiūlymų termino", "days from the deadline")) + '</dd>' +
      (p.pristatymas ? '<dt>' + L("Pristatymo ar atlikimo terminas", "Delivery or performance period") + '</dt><dd>' + esc(p.pristatymas) + '</dd>' : '') +
      (p.pastabos ? '<dt>' + L("Pastabos", "Remarks") + '</dt><dd style="white-space:pre-line">' + esc(p.pastabos) + '</dd>' : '') +
      '<dt>' + L("Tiekėjas", "Supplier") + '</dt><dd>' + esc(tk.pav + (tk.fizinis ? " (" + L("fizinis asmuo", "natural person") + ")" : "")) + '</dd>' +
      (tk.kodas ? '<dt>' + (tk.fizinis ? L("Pažymos ar verslo liudijimo numeris", "Certificate or business licence number") : L("Įmonės kodas", "Company registration number")) + '</dt><dd>' + esc(tk.kodas) + '</dd>' : '') +
      (tk.pvmKodas ? '<dt>' + L("PVM mokėtojo kodas", "VAT number") + '</dt><dd>' + esc(tk.pvmKodas) + '</dd>' : '') +
      (tk.adresas ? '<dt>' + L("Adresas", "Address") + '</dt><dd>' + esc(tk.adresas) + '</dd>' : '') +
      '<dt>' + L("Pasiūlymą teikia", "Submitted by") + '</dt><dd>' + esc([tk.asmuo, tk.pastas, tk.tel].filter(Boolean).join(", ")) + '</dd>' +
      '<dt>' + L("Patvirtinta", "Confirmed") + '</dt><dd>' + patvirtinimai().filter(function (x) { return (p.patvirtinta || []).indexOf(x[0]) >= 0; }).map(function (x) { return esc(x[1]); }).join("<br>") + '</dd>' +
      '<dt>' + L("Parengta", "Prepared") + '</dt><dd>' + esc(A.rodykLaika(p.pateikta) + " " + L("(Lietuvos laiku)", "(Lithuanian time)")) + '</dd>' +
      '<dt>' + L("Pasiūlymo antspaudas", "Quotation fingerprint") + '</dt><dd>' + esc(A.trumpas(REZ.h)) + '</dd></dl></section>';
    return e;
  }
  function kopijavimoHtml(pagr) {
    return '<p class="ea-uzuomina" style="margin-top:10px">' + (pagr ? L("Sukurkite naują laišką savo pašte ir nukopijuokite į jį:", "Create a new email in your mail and copy into it:")
        : L("Naudojate „Gmail“, „Outlook“ ar kitą paštą naršyklėje ir laiškas neatsivėrė? Sukurkite naują laišką ir nukopijuokite į jį:", "Using Gmail, Outlook or other webmail and the email did not open? Create a new email and copy into it:")) + '</p>' +
      '<div class="ea-eile" style="margin-top:6px">' +
      '<button type="button" class="ea-btn' + (pagr ? " ea-btn--pagr" : "") + '" data-veiksmas="pslKopijuok" data-ka="adresas">' + L("Kopijuoti adresą", "Copy the address") + '</button>' +
      '<button type="button" class="ea-btn" data-veiksmas="pslKopijuok" data-ka="tema">' + L("Kopijuoti temą", "Copy the subject") + '</button>' +
      '<button type="button" class="ea-btn" data-veiksmas="pslKopijuok" data-ka="tekstas">' + L("Kopijuoti laiško tekstą", "Copy the email text") + '</button></div>';
  }
  function rezultatoHtml(praejo) {
    if (!REZ) return "";
    var l = REZ.laiskas, href = laiskoHref(), trumpas = href.length <= MAILTO_RIBA, s = REZ.sumos, terminas = '<b class="ea-nelauz">' + esc(A.rodykLaika(K.terminas)) + '</b> ' + L("(Lietuvos laiku)", "(Lithuanian time)");
    var h, pagr;
    if (REZ.issiusta) {
      var velai = !REZ.ikiTermino && new Date(REZ.issiusta) > new Date(K.terminas);
      h = L("Pasiūlymas išsiųstas", "The quotation has been sent");
      pagr = '<div class="ea-pastaba ' + (velai ? "ea-pastaba--klaida" : "ea-pastaba--gerai") + '"><strong>' + esc(REZ.ikiTermino ? L("Pažymėjote, kad laišką išsiuntėte iki termino", "You marked the email as sent before the deadline")
          : L("Pažymėjote, kad laišką išsiuntėte " + A.rodykLaika(REZ.issiusta), "You marked the email as sent at " + A.rodykLaika(REZ.issiusta))) + '</strong>' +
        (velai ? L("Tai po pasiūlymų termino - pirkimo vykdytojas šio pasiūlymo gali nebevertinti. Susisiekite su kontaktiniu asmeniu ", "This is after the deadline - the buyer may not evaluate this quotation. Contact the contact person ") + '<b>' + esc(K.kontaktas.pastas) + '</b>.'
          : L("Pasiūlymas pateiktas, kai laiškas pasiekia kontaktinį asmenį iki termino ", "The quotation is submitted when the email reaches the contact person before the deadline ") + terminas + '. ' +
            (praejo ? L("Terminas baigėsi - pasiūlymo pakeisti nebegalima.", "The deadline has passed - the quotation can no longer be changed.")
              : L("Norėdami pakeisti pasiūlymą, spauskite „Keisti pasiūlymą“, parenkite naują ir išsiųskite naują laišką iki termino - galios vėliau parengtas, jei pirkimo vykdytojas dar nebus atvėręs pasiūlymų. Pakeisto pasiūlymo gavimo laikas - naujo laiško gavimo laikas.",
                "To change the quotation, click “Change the quotation”, prepare a new one and send a new email before the deadline - the one prepared later will apply if the buyer has not opened the quotations yet. The time a changed quotation is received is the time the new email is received."))) +
        '<div class="ea-eile" style="margin-top:10px"><button type="button" class="ea-btn ea-btn--tylus" data-veiksmas="pslPazymek" data-ka="ne">' + L("Laiško dar neišsiunčiau", "I have not sent the email yet") + '</button></div></div>';
    } else if (praejo && REZ.poTermino) {
      /* Parengta jau po termino (pagal tiekėjo laikrodį; trečia patikra V1): laiškas automatiškai neatveriamas, „Laišką išsiunčiau iki termino“ nesiūloma */
      h = L("Pasiūlymas parengtas po termino", "The quotation was prepared after the deadline");
      pagr = '<div class="ea-pastaba ea-pastaba--klaida" id="pslPraejo" tabindex="-1"><strong>' + L("Pagal jūsų kompiuterio laikrodį terminas baigėsi ", "According to your computer's clock, the deadline was ") + terminas + '</strong>' +
        L("Ar pasiūlymas bus vertinamas, lemia, kada laišką gaus pirkimo vykdytojas: po termino gautas pasiūlymas nevertinamas. Jei manote, kad terminas dar nepraėjo, atverkite laišką ir siųskite nedelsdami; jei abejojate - susisiekite su kontaktiniu asmeniu ",
          "Whether the quotation is evaluated depends on when the buyer receives the email: a quotation received after the deadline is not evaluated. If you believe the deadline has not passed yet, open the email and send it without delay; if in doubt, contact the contact person ") + '<b>' + esc(K.kontaktas.pastas) + '</b>.' +
        (trumpas ? '<div class="ea-eile" style="margin-top:10px"><a class="ea-btn" href="' + esc(href) + '" data-veiksmas="pslIssiusta">' + L("Atverti laišką vis tiek", "Open the email anyway") + '</a></div>' : '') + kopijavimoHtml(!trumpas) +
        '<div class="ea-eile" style="margin-top:12px"><span class="ea-uzuomina">' + L("Išsiuntėte?", "Sent it?") + '</span><button type="button" class="ea-btn" data-veiksmas="pslPazymek" data-ka="taip">' + L("Taip, laišką išsiunčiau", "Yes, I sent the email") + '</button></div></div>';
    } else if (praejo) {
      h = L("Pasiūlymų terminas praėjo", "The deadline has passed");
      pagr = '<div class="ea-pastaba ea-pastaba--klaida" id="pslPraejo" tabindex="-1"><strong>' + L("Terminas baigėsi ", "The deadline was ") + terminas + '</strong>' +
        L("Ar pasiūlymas pateiktas laiku, lemia, kada laišką gauna pirkimo vykdytojas: po termino gautas pasiūlymas nevertinamas. Jei laiško dar neišsiuntėte, susisiekite su kontaktiniu asmeniu ", "Whether the quotation is on time depends on when the buyer receives the email: a quotation received after the deadline is not evaluated. If you have not sent the email yet, contact the contact person ") + '<b>' + esc(K.kontaktas.pastas) + '</b>.' +
        '<div class="ea-eile" style="margin-top:10px"><button type="button" class="ea-btn ea-btn--tylus" data-veiksmas="pslPazymek" data-ka="iki">' + L("Laišką išsiunčiau iki termino", "I sent the email before the deadline") + '</button></div>' +
        /* Kompiuterio laikrodis gali skubėti (M5) - išsiųsti vis tiek galima, bet tai ne pagrindinis veiksmas */
        '<details class="ea-tech" style="margin-top:10px"><summary>' + L("Siųsti vis tiek", "Send anyway") + '</summary>' +
          (trumpas ? '<div class="ea-eile" style="margin-top:8px"><a class="ea-btn" href="' + esc(href) + '" data-veiksmas="pslIssiusta">' + L("Atverti paruoštą laišką", "Open the prepared email") + '</a></div>' : '') + kopijavimoHtml(!trumpas) + '</details></div>';
    } else {
      h = L("Pasiūlymas paruoštas - liko išsiųsti laišką", "The quotation is ready - now send the email");
      pagr = '<div class="ea-pastaba ea-pastaba--demesio"><strong>' + L("Išsiųskite laišką iki ", "Send the email by ") + terminas + '</strong>' +
        (trumpas ? L("Jūsų pašto programoje turėjo atsiverti paruoštas laiškas adresu ", "A prepared email to ") + '<b>' + esc(K.kontaktas.pastas) + '</b>' + L(" - paspauskite jame „Siųsti“.", " should have opened in your email program - click “Send” in it.")
          : L("Laiškas per ilgas atverti automatiškai: nukopijuokite jo tekstą ir išsiųskite adresu ", "The email is too long to open automatically: copy its text and send it to ") + '<b>' + esc(K.kontaktas.pastas) + '</b>.') + ' ' +
        L("Kol laiško neišsiuntėte, pasiūlymas nepateiktas.", "Until you send the email, the quotation is not submitted.") +
        (trumpas ? '<div class="ea-eile" style="margin-top:10px"><a class="ea-btn ea-btn--pagr" href="' + esc(href) + '" data-veiksmas="pslIssiusta">' + L("Laiškas neatsivėrė? Atverti dar kartą", "Email did not open? Open it again") + '</a></div>' : '') +
        kopijavimoHtml(!trumpas) +
        '<div class="ea-eile" style="margin-top:12px"><span class="ea-uzuomina">' + L("Išsiuntėte?", "Sent it?") + '</span><button type="button" class="ea-btn" data-veiksmas="pslPazymek" data-ka="taip">' + L("Taip, laišką išsiunčiau", "Yes, I sent the email") + '</button></div></div>';
    }
    return '<section class="ea-card ea-rezult" aria-labelledby="pslRzH" id="pslRezultatas">' +
      '<h3 id="pslRzH" tabindex="-1">' + h + '</h3>' + pagr +
      (K.dokumentai ? '<p style="margin-top:12px"><b>' + L("Prie laiško pridėkite:", "Attach to the email:") + '</b> ' + esc(sakinys(K.dokumentai)) + ' ' + L("Kainos jau yra laiško bloke; jei pridedate kainų dokumentą, kainos jame turi sutapti su įrašytomis.", "The prices are already in the email block; if you attach a price document, its prices must match the ones entered.") + '</p>' : '') +
      '<dl class="ea-dl" style="margin:12px 0"><dt>' + L("Kaina be PVM", "Price excl. VAT") + '</dt><dd><b>' + esc(eur(s.viso)) + '</b></dd>' +
        (REZ.pasiulymas.pvm ? '<dt>' + L("Kaina su PVM", "Price incl. VAT") + esc(procTekstas(s.tarifas)) + '</dt><dd>' + esc(eur(s.suPvm)) + '</dd>' : '<dt>' + L("PVM", "VAT") + '</dt><dd>' + L("nepridedamas (nesame PVM mokėtojai Lietuvoje arba PVM netaikomas)", "not added (not VAT registered in Lithuania or VAT does not apply)") + '</dd>') + '</dl>' +
      '<div class="ea-eile"><button type="button" class="ea-btn" data-veiksmas="pslAtsisiusk">' + L("Atsisiųsti kopiją savo įrašams", "Download a copy for your records") + '</button>' +
        '<button type="button" class="ea-btn" data-veiksmas="spausdinti">' + L("Spausdinti", "Print") + '</button>' +
        (praejo ? '' : '<button type="button" class="ea-btn ea-btn--tylus" data-veiksmas="pslKeisk">' + L("Keisti pasiūlymą", "Change the quotation") + '</button>') + '</div>' +
      '<details class="ea-tech" style="margin-top:12px"><summary>' + L("Laiško tekstas ir techninė informacija", "Email text and technical information") + '</summary>' +
        '<dl class="ea-dl"><dt>' + L("Gavėjas", "To") + '</dt><dd>' + esc(K.kontaktas.pastas) + '</dd><dt>' + L("Tema", "Subject") + '</dt><dd>' + esc(l.tema) + '</dd>' +
        '<dt>' + L("Pasiūlymo antspaudas", "Quotation fingerprint") + '</dt><dd><span class="ea-antsp">' + esc(A.trumpas(REZ.h)) + '</span> <span class="ea-uzuomina">' +
          L("- pagal jį pirkimo vykdytojas ir jūs galėsite patikrinti, kad vertintas būtent šis pasiūlymas", "- with it the buyer and you can check that exactly this quotation was evaluated") + '</span></dd></dl>' +
        '<pre class="ea-kodas" style="max-height:260px" tabindex="0" aria-label="' + L("Laiško tekstas", "Email text") + '">' + esc(l.tekstas) + '</pre>' +
        '<p class="ea-uzuomina">' + L("Bloko su duomenimis laiške nekeiskite - pakeistas jis nebus perskaitytas. Jame jūsų kainos suspaustos, bet neužšifruotos: pirkimo vykdytojo įrankis kainų nerodo, kol pasiūlymai neatverti, tačiau tai darbo tvarka, ne šifras. Kopijoje savo įrašams kainos matomos atviru tekstu, todėl jos pirkimo vykdytojui nesiųskite.",
          "Do not change the data block in the email - a changed block cannot be read. Your prices in it are compressed but not encrypted: the buyer's tool does not show prices until the quotations are opened, but this is a working procedure, not encryption. Prices are visible in plain text in the copy for your records, so do not send it to the buyer.") + '</p></details>' + spaudaiHtml() + '</section>';
  }
  /* „Siųsti pasiūlymą“: parengus iškart atveriamas paruoštas laiškas (naudotojo pastaba 2026-11-27 - pateikimas turi būti kelių akimirkų reikalas) */
  function atverkLaiska() {
    if (!REZ) return false;
    var href = laiskoHref();
    if (href.length > MAILTO_RIBA) return false;
    laiskasAtvertas();    // prieš atveriant: kitaip naršyklė paklaustų „Palikti svetainę?“ (D1)
    var a = doc.createElement("a"); a.href = href; a.setAttribute("data-psl-laiskas", ""); a.hidden = true;
    doc.body.appendChild(a); a.click(); a.remove();
    return true;
  }
  function piesk() {
    pieskAntraste();
    var v = $("pslTurinys"), praejo = K ? A.liko(K.terminas, new Date(), KALBA).praejo : false;
    v.innerHTML = K ? kvietimoHtml() + rezultatoHtml(praejo) + formosHtml(praejo) : ivestiesHtml();
    if (K) { rodykSumas(); K.pozicijos.forEach(function (p, i) { if (F.ik[i]) rodykDvi(i); }); }
    clearInterval(LAIKMATIS);
    if (K && !praejo) LAIKMATIS = setInterval(function () {
      var lk = A.liko(K.terminas, new Date(), KALBA), el = $("pslLiko");
      if (el) { el.textContent = lk.tekstas; el.classList.toggle("ea-skubu", !!lk.skubu); }
      if (lk.praejo) {
        /* Terminas praėjo pildant (M5): fokusas - į pranešimą, ne į puslapio pradžią */
        var t = $("pslTurinys"), buvo = t && t.contains(doc.activeElement);
        skaitykForma(); piesk();
        var al = REZ ? $("pslRzH") : $("pslPraejoF"); if (buvo && al) al.focus();    // D4: ne į paslėptą formą
      }
    }, 30000);
  }

  /* ---------- patikra ir pasiūlymo parengimas ---------- */
  /* Neperskaityta kaina: netaisyklingai sugrupuoti skaitmenys („1.250.50“, „1 2 3“) - aiškus paaiškinimas (trečia patikra D1) */
  function kainosKlaida(v) {
    return /\d[.,\s\u00a0][\d\s\u00a0.,]*[.,\s\u00a0]\d|\d[.,]\d{1,2}[.,]\d/.test(String(v || "").trim()) ? L("netaisyklingai sugrupuoti skaitmenys - rašykite, pvz., 1 250,50", "the digits are not grouped correctly - write, e.g., 1,250.50")
      : L("kaina turi būti skaičius (pvz., 125,50; jei pozicija įskaičiuota į kitą - 0)", "the price must be a number (e.g. 125.50; if the item is included in another - 0)");
  }
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
      var ik = v && String(v).trim() ? ikainis(i) : null;
      if (!v || !String(v).trim()) msg = L("įrašykite vieneto kainą", "enter the unit price");
      else if (ik === "dvi") msg = L("patikslinkite, kaip suprasti „" + dviTekstas(v) + "“ - pasirinkite po lauku", "specify how to read “" + dviTekstas(v) + "” - choose below the field");
      else if (ik === null) msg = kainosKlaida(v);
      rodykDvi(i);
      var s = $("psl-ik" + i + "-kl");
      if (msg) { el.setAttribute("aria-invalid", "true"); s.hidden = false; s.textContent = msg; if (!el.id) el.id = "psl-ik" + i; kl.push({ id: el.id, tekstas: (i + 1) + ". " + pozPav(p) + ": " + msg }); }
      else { el.removeAttribute("aria-invalid"); s.hidden = true; s.textContent = ""; }
    });
    /* Visų pozicijų kaina 0 - klaida (M4): toks pasiūlymas eilėje būtų pirmas */
    if (!kl.length && K.pozicijos.length && K.pozicijos.every(function (p, i) { return ikainis(i) === 0; })) {
      var e0 = doc.querySelector('[data-ik="0"]'), s0 = $("psl-ik0-kl"), m0 = L("visų pozicijų kaina 0 Eur - įrašykite kainas", "all item prices are 0 EUR - enter the prices");
      e0.setAttribute("aria-invalid", "true"); s0.hidden = false; s0.textContent = m0; if (!e0.id) e0.id = "psl-ik0";
      kl.push({ id: e0.id, tekstas: L("Kainos", "Prices") + ": " + m0 });
    }
    var pk0 = $("psl-pvm-kl");
    if (F.pvm === null) { if (pk0) { pk0.hidden = false; pk0.textContent = L("Pasirinkite vieną iš atsakymų.", "Choose one of the answers."); } kl.push({ id: "psl-pvm-taip", tekstas: L("PVM: pasirinkite, ar prie kainos pridedamas PVM", "VAT: choose whether VAT is added to the price") }); }
    else if (pk0) { pk0.hidden = true; pk0.textContent = ""; }
    if (F.pvm === true && F.pvmKitas && pvmTarifasSk() === null) blogai("psl-pvmTarifas", L("PVM tarifas", "VAT rate"), /^0+([.,]0+)?\s*%?$/.test(String(F.pvmTarifas || "").trim())
      ? L("0 % - jei PVM nepridedamas, pasirinkite „Ne“", "0 % - if VAT is not added, choose “No”") : L("įrašykite tarifą procentais (pvz., 9)", "enter the rate in percent (e.g. 9)"));
    else zymek("psl-pvmTarifas", "");
    var g = String(F.galioja || "").trim();
    if (!/^\d{1,3}$/.test(g) || +g < 1 || +g > 365) blogai("psl-galioja", L("Pasiūlymas galioja", "Validity"), L("įrašykite dienų skaičių nuo 1 iki 365", "enter the number of days from 1 to 365"));
    else if (K.galiojaMin && +g < K.galiojaMin) blogai("psl-galioja", L("Pasiūlymas galioja", "Validity"), L("kvietime reikalaujama ne trumpiau kaip " + K.galiojaMin + " d.", "the invitation requires at least " + K.galiojaMin + " days"));
    else zymek("psl-galioja", "");
    [["pav", L("Tiekėjo pavadinimas", "Supplier name")]].concat(F.fizinis ? [] : [["kodas", L("Įmonės kodas", "Company registration number")]]).concat([["asmuo", L("Pasiūlymą teikiantis asmuo", "Person submitting the quotation")]]).forEach(function (x) {
      if (!String(F[x[0]] || "").trim()) blogai("psl-" + x[0], x[1], L("užpildykite šį lauką", "fill in this field")); else zymek("psl-" + x[0], "");
    });
    /* Fiziniam asmeniui - asmens kodo pavidalo skaičius neleidžiamas (D2; naudotojo sprendimas T3 - asmens kodo neprašoma) */
    if (F.fizinis) {
      if (/^[1-6]\d{10}$/.test(String(F.kodas || "").replace(/[\s.-]/g, ""))) blogai("psl-kodas", L("Pažymos ar verslo liudijimo numeris", "Certificate or business licence number"), L("tai atrodo kaip asmens kodas - jo nenurodykite (laukas neprivalomas)", "this looks like a personal identification number - do not enter it (the field is optional)"));
      else zymek("psl-kodas", "");
    } else kodoPastaba();
    if (!A.pastas(F.pastas || "")) blogai("psl-pastas", L("El. paštas", "Email"), L("įrašykite el. pašto adresą (pvz., vardas@imone.lt)", "enter an email address (e.g. name@company.com)")); else zymek("psl-pastas", "");
    var truksta = A.reikiaPatvirtinti(K).filter(function (a) { return !F.patv[a]; }), pk = $("psl-patv-kl");
    pk.hidden = !truksta.length; pk.textContent = truksta.length ? L("Pažymėkite visus patvirtinimus.", "Tick all confirmations.") : "";
    if (truksta.length) { var pirmas = doc.querySelector('[data-f="' + truksta[0] + '"]'); if (!pirmas.id) pirmas.id = "psl-patv-" + truksta[0]; kl.push({ id: pirmas.id, tekstas: L("Patvirtinimai: pažymėkite visus", "Confirmations: tick all of them") }); }
    return kl;
  }
  function rodykKlaidas(kl) {
    var v = $("pslKlaidos");
    if (!kl.length) { v.innerHTML = ""; return; }
    v.innerHTML = '<div class="ea-pastaba ea-pastaba--klaida" role="alert" style="margin-top:16px"><strong>' + L("Pasiūlymo išsiųsti dar negalima", "The quotation cannot be sent yet") + '</strong><ul>' +
      kl.map(function (k) { return '<li><a href="#' + esc(k.id) + '" data-veiksmas="pslEik" data-id="' + esc(k.id) + '">' + esc(k.tekstas) + '</a></li>'; }).join("") + '</ul></div>';
    v.focus();
  }
  function parenk() {
    skaitykForma();
    var kl = tikrink(); rodykKlaidas(kl);
    if (kl.length) return Promise.resolve(false);
    var obj = { v: 1, tipas: "pasiulymas", apklausa: K.id, kvietimas: H, t: K.t,
      tiekejas: { pav: F.pav, kodas: F.kodas, pvmKodas: F.pvmKodas, adresas: F.adresas, asmuo: F.asmuo, pastas: F.pastas, tel: F.tel, fizinis: F.fizinis === true }, pvm: F.pvm === true, pvmTarifas: F.pvm === true && F.pvmKitas ? pvmTarifasSk() : undefined,
      eilutes: K.pozicijos.map(function (p, i) { var ik = ikainis(i); return { i: i, ikainis: ik === "dvi" ? null : ik, pastaba: F.past[i] || "" }; }),
      pristatymas: F.pristatymas, galioja: +String(F.galioja).trim(), pastabos: F.pastabos, patvirtinta: A.reikiaPatvirtinti(K),
      pateikta: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), kalba: KALBA };
    var f = A.pasiulymoForma(obj);
    if (!f.ok) { rodykKlaidas([{ id: "pslForma", tekstas: L("Pasiūlymo parengti nepavyko - patikrinkite įvestus duomenis", "The quotation could not be prepared - check the data entered") }]); return Promise.resolve(false); }
    var p = f.pasiulymas;
    return Promise.all([A.koduok(p), A.antspaudas(p)]).then(function (r) {
      REZ = { pasiulymas: p, kodas: r[0], h: r[1], sumos: A.sumos(K, p, tarifas()), laiskas: A.atsakymas(K, p, r[0], r[1], KALBA), issiusta: null, poTermino: A.liko(K.terminas, new Date(), KALBA).praejo, saugiklis: 0 }; ATKURTA = "";
      piesk();
      var h = $("pslRzH"); if (h) { h.scrollIntoView({ block: "start" }); h.focus(); }
      return true;
    });
  }
  /* Pagal ją iniciatoriaus įrankis ir „Norite pakeisti ...?“ atpažįsta kopiją savo įrašams (abi kalbos) */
  function kopijosZyme() { return L("G-PROCURE: TIEKĖJO KOPIJA - NESIŲSTI PIRKIMO VYKDYTOJUI", "G-PROCURE: SUPPLIER'S COPY - DO NOT SEND TO THE BUYER"); }
  var KOPIJA_RE = /G-PROCURE: (TIEKĖJO KOPIJA|SUPPLIER'S COPY)/;
  function kopijaFailui() {
    var p = REZ.pasiulymas, s = REZ.sumos, e = [];
    e.push(kopijosZyme(), L("Šis failas - jūsų įrašams. Pirkimo vykdytojui jo nesiųskite: jame kainos matomos atviru tekstu, o pasiūlymo kodo nėra.",
      "This file is for your records. Do not send it to the buyer: prices are visible in plain text and it does not contain the quotation code."), "",
      L("PASIŪLYMAS", "QUOTATION"), L("Pirkimas", "Procurement") + ": " + A.pavadinimas(K, KALBA) + " (" + K.id + ")", L("Pirkimo vykdytojas", "Buyer") + ": " + K.pirkejas.pav,
      L("Tiekėjas", "Supplier") + ": " + p.tiekejas.pav + (p.tiekejas.fizinis ? " (" + L("fizinis asmuo", "natural person") + ")" : "") + (p.tiekejas.kodas ? ", " + (p.tiekejas.fizinis ? L("pažymos nr. ", "certificate no. ") : L("kodas ", "code ")) + p.tiekejas.kodas : "") + (p.tiekejas.pvmKodas ? ", " + L("PVM kodas ", "VAT number ") + p.tiekejas.pvmKodas : ""), L("Parengta", "Prepared") + ": " + A.rodykLaika(p.pateikta) + " " + L("(Lietuvos laiku)", "(Lithuanian time)"),
      L("Pasiūlymo antspaudas", "Quotation fingerprint") + ": " + A.trumpas(REZ.h), L("Kvietimo antspaudas", "Invitation fingerprint") + ": " + A.trumpas(H), "");
    K.pozicijos.forEach(function (poz, i) {
      var x = s.eilutes[i];
      e.push((i + 1) + ". " + pozPav(poz) + " - " + fmt(poz.kiekis, 0, 4) + (poz.mat ? " " + pozMat(poz) : "") + " x " + fmt(x.ikainis, 2, 4) + " = " + fmt(x.suma, 2, 2) + " " + L("Eur be PVM", "EUR excl. VAT") + (x.pastaba ? " (" + x.pastaba + ")" : ""));
    });
    e.push("", L("Iš viso be PVM", "Total excl. VAT") + ": " + fmt(s.viso, 2, 2) + " " + L("Eur", "EUR"));
    if (p.pvm) e.push(L("PVM", "VAT") + procTekstas(s.tarifas) + ": " + fmt(s.pvmSuma, 2, 2) + " " + L("Eur", "EUR"), L("Iš viso su PVM", "Total incl. VAT") + ": " + fmt(s.suPvm, 2, 2) + " " + L("Eur", "EUR"));
    if (!p.pvm) e.push(L("PVM", "VAT") + ": " + L("nepridedamas", "not added"));
    e.push(L("Pasiūlymas galioja (dienų nuo pasiūlymų termino)", "Valid for (days from the deadline)") + ": " + p.galioja);
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
  /* Atveriant laišką atskaita nustatoma (be „Palikti svetainę?“), bet po kelių sekundžių apsauga grąžinama, kol laiškas nepažymėtas išsiųstu ar nenukopijuotas:
     naršyklės pašto naudotojui laiškas neatsiveria, o uždarius skirtuką parengtas pasiūlymas dingtų (trečia patikra M7) */
  var SAUGIKLIS = null;
  function laiskasAtvertas() {
    baigta(); clearTimeout(SAUGIKLIS);
    SAUGIKLIS = setTimeout(function () { if (REZ && !REZ.issiusta && !REZ.nukopijuota) REZ.saugiklis = (REZ.saugiklis || 0) + 1; }, SAUGIKLIO_MS);
  }
  var SAUGIKLIO_MS = 4000;
  function sumuPranesimas() {
    var el = $("pslSumPr"); if (!el || !K) return;
    var s = skaiciuok();
    el.textContent = s.truksta ? trukstaTekstas(s).replace(/^./, function (c) { return c.toUpperCase(); })
      : L("Iš viso be PVM: ", "Total excl. VAT: ") + eur(s.viso) + (F.pvm === true && s.suPvm !== null ? L(", su PVM: ", ", incl. VAT: ") + eur(s.suPvm) : "");
  }
  /* Pasiūlymo keitimas (V7): forma užpildoma iš savo išsiųsto laiško; patvirtinimai - iš naujo */
  function atkurk(tekstas) {
    var b = function (t) { var el = $("pslAtkurtiB"); if (el) el.textContent = t; };
    var x = A.isSarvo(tekstas || "").filter(function (y) { return y.rusis === "pasiulymas"; });
    if (!x.length && KOPIJA_RE.test(String(tekstas || ""))) { b(L("Įklijavote kopiją savo įrašams - joje nėra pasiūlymo kodo, todėl formos ji neužpildo. Įklijuokite išsiųstą laišką.", "You pasted the copy for your records - it does not contain the quotation code, so it cannot fill in the form. Paste the email you sent.")); return Promise.resolve(false); }
    if (!x.length) { b(L("Pasiūlymo bloko nerasta - įklijuokite visą išsiųstą laišką.", "No quotation block found - paste the whole email you sent.")); return Promise.resolve(false); }
    return A.atkoduok(x[0]).then(function (r) {
      var f = A.pasiulymoForma(r.obj);
      if (!f.ok) { b(L("Šio pasiūlymo perskaityti nepavyko.", "This quotation could not be read.")); return false; }
      var p = f.pasiulymas;
      if (p.apklausa !== K.id || p.t !== K.t || p.kvietimas !== H) { b(L("Šis pasiūlymas parengtas kitam kvietimui - forma nekeista.", "This quotation was prepared for another invitation - the form is not changed.")); return false; }
      var n = naujaF();
      p.eilutes.forEach(function (e) { if (typeof e.ikainis === "number") { var t = fmt(e.ikainis, 2, 4, true); n.ik[e.i] = t; n.ikAiskus[e.i] = { t: t, v: e.ikainis }; } n.past[e.i] = e.pastaba || ""; });
      n.pvm = p.pvm; n.pvmKitas = !!(p.pvm && typeof p.pvmTarifas === "number"); n.pvmTarifas = n.pvmKitas ? fmt(p.pvmTarifas, 0, 2, true) : ""; n.fizinis = !!p.tiekejas.fizinis; n.galioja = p.galioja ? String(p.galioja) : ""; n.pristatymas = p.pristatymas; n.pastabos = p.pastabos;
      ["pav", "kodas", "pvmKodas", "adresas", "asmuo", "pastas", "tel"].forEach(function (k) { n[k] = p.tiekejas[k] || ""; });
      F = n; REZ = null; ATKURTA = A.rodykLaika(p.pateikta);
      piesk(); var h = $("pslKnH"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
      return true;
    }, function (e) { b(e && e.kodas === "narsykle" ? L("Ši naršyklė pasiūlymo perskaityti negali.", "This browser cannot read the quotation.") : L("Šio pasiūlymo perskaityti nepavyko.", "This quotation could not be read.")); return false; });
  }

  /* ---------- veiksmai ---------- */
  window.GP_IVYKIAI.veiksmai({
    pslKalba: function (el) { skaitykForma(); KALBA = el.getAttribute("data-kalba") === "en" ? "en" : "lt"; KALBA_PASIRINKTA = true; if (REZ) REZ.laiskas = A.atsakymas(K, REZ.pasiulymas, REZ.kodas, REZ.h, KALBA); piesk(); },
    pslAtverk: function () { var t = $("pslNuoroda").value; KLAIDA = ""; ikelk(t).then(function () { var h = $("pslKvH") || $("pslIvH"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); } }); },
    pslSumos: function (el) {
      skaitykForma(); rodykSumas();
      /* Dviprasmiškos kainos klausimas rašant - tik nustojus rašyti (trečia patikra M4: rašant „1.250,50“ ties „1.250“ jis mirksėdavo); dingsta iškart */
      var i = el && el.getAttribute("data-ik");
      if (i === null || i === undefined || i === "") return;
      clearTimeout(DVI_T[i]);
      if (ikainis(i) === "dvi") DVI_T[i] = setTimeout(function () { rodykDvi(i); }, DVI_MS); else rodykDvi(i);
    },
    pslKodas: function () { skaitykForma(); kodoPastaba(); },
    pslPvm: function () { skaitykForma(); rodykSumas(); sumuPranesimas(); },
    pslIkainis: function (el) {
      var i = el.getAttribute("data-ik");
      skaitykForma();
      var v = ikainis(i);
      var k = $("psl-ik" + i + "-kl");
      if (typeof v === "number") {
        if (!dviprasmiska(el.value)) { el.value = fmt(v, 2, 4, true); F.ik[i] = el.value; }
        el.removeAttribute("aria-invalid"); if (k) { k.hidden = true; k.textContent = ""; }
      } else if (v === null && String(el.value).trim()) {
        /* Neperskaityta kaina - klaida iškart išėjus iš lauko (trečia patikra D1), ne tik siunčiant */
        el.setAttribute("aria-invalid", "true"); if (k) { k.hidden = false; k.textContent = kainosKlaida(el.value); }
      }
      clearTimeout(DVI_T[i]); rodykDvi(i); rodykSumas(); sumuPranesimas();
    },
    pslDvi: function (el) {
      var i = el.getAttribute("data-i"), r = dviReiksmes(F.ik[i]), v = el.getAttribute("data-v") === "t" ? r.t : r.d, tekstas = fmt(v, 2, 4, true), lauk = doc.querySelector('[data-ik="' + i + '"]');
      F.ik[i] = tekstas; F.ikAiskus[i] = { t: tekstas, v: v };
      if (lauk) { lauk.value = tekstas; lauk.removeAttribute("aria-invalid"); }
      var k = $("psl-ik" + i + "-kl"); if (k) { k.hidden = true; k.textContent = ""; }
      rodykDvi(i); rodykSumas(); sumuPranesimas();
      if (lauk) lauk.focus();
    },
    pslFizinis: function () { skaitykForma(); F.kodas = ""; piesk(); var c = doc.querySelector('[data-f="fizinis"]'); if (c) c.focus(); },
    pslParenk: function () {
      if (VYKSTA) return;      // dvigubas paspaudimas - vienas laiškas (M7)
      VYKSTA = true;
      parenk().then(function (ok) { VYKSTA = false; if (ok && !REZ.poTermino) atverkLaiska(); }, function () { VYKSTA = false; });
    },
    pslPazymek: function (el) {
      var ka = el.getAttribute("data-ka");
      REZ.issiusta = ka === "taip" || ka === "iki" ? new Date().toISOString().replace(/\.\d{3}Z$/, "Z") : null; REZ.ikiTermino = ka === "iki";
      if (REZ.issiusta) baigta();
      piesk(); var h = $("pslRzH"); if (h) h.focus();
    },
    pslAtkurk: function () { atkurk($("pslAtkurtiT").value); },
    pslEik: function (el) { var t = $(el.getAttribute("data-id")); if (t) { t.scrollIntoView({ block: "center" }); t.focus(); } return false; },
    pslKopijuok: function (el) {
      var ka = el.getAttribute("data-ka"), t = ka === "adresas" ? K.kontaktas.pastas : ka === "tema" ? REZ.laiskas.tema : REZ.laiskas.tekstas;
      window.GP_KOPIJA.kopijuok(t, { sekme: ka === "adresas" ? L("Adresas nukopijuotas", "Address copied") : ka === "tema" ? L("Tema nukopijuota", "Subject copied") : L("Laiško tekstas nukopijuotas", "Email text copied") })
        .then(function (ok) { if (ok && ka === "tekstas") { if (REZ) REZ.nukopijuota = true; baigta(); } });
    },
    pslIssiusta: function () { laiskasAtvertas(); },     // atskaita - prieš naršyklei atveriant laišką
    pslAtsisiusk: function () { atsisiusk(); },
    pslKeisk: function () { REZ = null; piesk(); var h = $("pslKnH"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); } }
  });

  /* ---------- informacinė skiltis ---------- */
  var INFO = {
    lt: { title: "Kas tai ir kaip naudotis", purpose: "Pasiūlymo forma mažos vertės pirkimo apklausai: kvietimą gavote el. paštu, pasiūlymą parengiate čia ir išsiunčiate el. paštu.",
      stepsTitle: "Kaip pateikti pasiūlymą", steps: ["<b>Atverkite nuorodą</b> iš kvietimo laiško - puslapis parodys, kas perkama ir iki kada laukiama pasiūlymų.",
        "<b>Įrašykite vieneto kainas</b> be PVM, pasiūlymo galiojimo terminą ir savo duomenis. Sumos suskaičiuojamos automatiškai.",
        "<b>Paspauskite „Siųsti pasiūlymą“</b> - jūsų pašto programoje atsivers paruoštas laiškas kontaktiniam asmeniui; <b>išsiųskite jį</b> iki termino. Kol laiško neišsiuntėte, pasiūlymas nepateiktas."],
      noteTitle: "Duomenys", note: "Kvietimas perskaitomas jūsų naršyklėje iš nuorodos (trumpos nuorodos atveju kvietimas gaunamas iš G-Procure serverio). Įvesti duomenys <b>niekur nesiunčiami ir nesaugomi</b> - pasiūlymą pirkimo vykdytojas gauna tik jūsų išsiųstu laišku. Uždarius puslapį įvesti duomenys neišlieka - parengto pasiūlymo kopiją galite atsisiųsti savo įrašams." },
    en: { title: "What this is and how to use it", purpose: "A quotation form for a low-value procurement: you received the invitation by email, you prepare the quotation here and send it by email.",
      stepsTitle: "How to submit a quotation", steps: ["<b>Open the link</b> from the invitation email - the page shows what is being bought and the deadline.",
        "<b>Enter the unit prices</b> excluding VAT, the validity of the quotation and your details. Totals are calculated automatically.",
        "<b>Click “Send the quotation”</b> - a prepared email to the contact person opens in your email program; <b>send it</b> before the deadline. Until you send the email, the quotation is not submitted."],
      noteTitle: "Data", note: "The invitation is read in your browser from the link (for a short link, the invitation is fetched from the G-Procure server). The data you enter is <b>not sent or stored anywhere</b> - the buyer receives the quotation only in the email you send. If you close the page, the data you entered is not kept - you can download a copy of the prepared quotation for your records." }
  };
  if (window.GProcureInfoPanel && $("infoPanelMount")) window.GProcureInfoPanel.mount({ target: "#infoPanelMount", moduleId: "pp-report-pasiulymas", getLang: function () { return KALBA; }, content: INFO });

  /* ---------- paleidimas ---------- */
  function isAdreso() { return ikelk(location.hash.length > 1 ? location.hash : ""); }
  window.addEventListener("hashchange", function () { REZ = null; isAdreso(); });
  if (window.GP_DARBAS) window.GP_DARBAS.stebek(function () { return REZ ? [REZ.kodas, REZ.saugiklis || 0] : []; });
  window.GP_PASIULYMAS = { nustatyk: function (o) { if (o && o.saugiklisMs >= 0) SAUGIKLIO_MS = o.saugiklisMs; if (o && o.dviMs >= 0) DVI_MS = o.dviMs; }, ikelk: ikelk, parenk: parenk, trumposId: trumposId, atkurk: atkurk, dviprasmiska: dviprasmiska, busena: function () { return { kvietimas: K, antspaudas: H, rezultatas: REZ, kalba: KALBA, klaida: KLAIDA, forma: F }; }, kopija: function () { return REZ ? kopijaFailui() : ""; } };
  isAdreso();
})();
