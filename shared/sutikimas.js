/* ============================================================================
 * G-Procure  shared/sutikimas.js
 * ----------------------------------------------------------------------------
 * Slapukų ir naršyklės saugyklos sutikimas VISIEMS puslapiams (window.GP_SUTIKIMAS, nuo 2026-10-16).
 *
 * TEISINIS PAGRINDAS (perskaityta e-tar 2026-10-16). Elektroninių ryšių įstatymo 73 straipsnio 4 dalis: informaciją
 * lankytojo įrenginyje saugoti ar ja naudotis leidžiama tik su jo sutikimu, gavus aiškią ir išsamią informaciją pagal
 * BDAR; sutikimo nereikia saugojimui, kuris būtinas paslaugai, kurią lankytojas aiškiai užsako. localStorage šiuo
 * požiūriu - tas pats, kas slapukai. VDAI Gairės dėl slapukų ir panašių priemonių naudojimo (2013-07-25 įsakymas Nr. 1T-32;
 * jose cituojama ankstesnė ERĮ redakcija - 61 straipsnio 4 dalis, tekstas tas pats): būtiniems įrašams
 * sutikimo neprašoma (9 p.), kalbos pasirinkimas - išimtis (11 p.), statistika - ne išimtis (12 p.), sutikimas - aktyvus
 * veiksmas su tikru pasirinkimu (15 p.), iš anksto (19 p.), ribotam laikui, pvz. metams (21 p.); sutikimas su privatumo
 * politika nėra sutikimas dėl slapukų (26 p.); atsisakymo įsiminimas - tik žmogui žinant (20 p.), todėl juosta sako, kad
 * pasirinkimas įsimenamas 12 mėnesių. BDAR 7 str. 3 d. - atšaukti sutikimą taip pat lengva, kaip jį duoti.
 *
 * KATEGORIJOS
 *   butini      - visada: darbo duomenys įrankiuose, šis sprendimas, darbo be interneto failai, apsauga nuo automatinių
 *                 užklausų (Turnstile). Sutikimo nereikia.
 *   nustatymai  - kalba, informacinių skilčių būsena, suvestinės rodiklis, pirkimo sąlygų klausimų vaizdas. Išimtis (VDAI 11 p.), todėl veikia ir iki
 *                 sprendimo, bet naudotojas gali išjungti: tada šie įrašai ištrinami ir nebeįrašomi.
 *   tobulinimo  - PP-salygos sutarčių parinkimo stebėjimo įrašai (taisyklėms tikslinti - ne naudotojo užsakyta paslauga).
 *                 Tik su sutikimu; numatyta - išjungta. Atšaukus nauji nekaupiami, sukaupti lieka, kol naudotojas juos ištrina
 *                 (jie yra tik jo naršyklėje; ištrinti - čia arba PP-salygos bloke „Sutarties projektas“).
 *   statistika  - naudojimosi statistika (nuo 2026-10-16, naudotojo sprendimas - griežtas variantas, tik su sutikimu):
 *                 shared/analitika.js, PostHog ES. Numatyta - išjungta; naršyklėje nieko neįrašo. Atšaukus - nebesiunčiama.
 *   Reklama, socialiniai tinklai, sekimas - NENAUDOJAMA. Pridedant ką nors panašaus: nauja kategorija, VERSIJA, politika.
 *
 * ĮRAŠAS - localStorage „gprocure.sutikimas“: { schema: 1, versija, data, galioja, budas, kategorijos: { nustatymai, tobulinimo, statistika } }.
 * Galioja 12 mėnesių; pasibaigus ar pasikeitus VERSIJA (nauja kategorija ar paskirtis) - klausiama iš naujo. Politikos teksto
 * pataisymas be naujos paskirties VERSIJA nekeičia.
 *
 * JUOSTA - tik viršutiniame lange (ne rėmeliuose) ir ne testų puslapiuose; kol nėra galiojančio sprendimo. Kalba: dvikalbiame
 * puslapyje (yra GP_LANG) - kaip puslapio <html lang>, kituose - pagal lankytoją (Lietuvos laiko juosta ar naršyklės kalba lt
 * = LT, kiti = EN) su perjungikliu juostoje. Nuoroda „Slapukų nustatymai“ - bet koks elementas su [data-gp-slapukai].
 *
 * TESTAI: kai viršutinis langas - testai.html arba adrese ?saugykla=testine, sprendimas laikomas tik atmintyje (testai
 * nepriklauso nuo naudotojo sprendimo ir jo nekeičia); naudokSaugykla(s) - netikra saugykla.
 *
 *   GP_SUTIKIMAS.leidzia("nustatymai")      // true / false
 *   GP_SUTIKIMAS.nustatyk({ nustatymai: true, tobulinimo: false, statistika: false }, "pasirinkta")
 *   GP_SUTIKIMAS.atverk()                   // nustatymų langas
 *   window.addEventListener("gp-sutikimas", e => e.detail)   // sprendimas pasikeitė (ir kitame skirtuke)
 * ==========================================================================*/
(function (global) {
  "use strict";
  if (global.GP_SUTIKIMAS) return;

  var doc = global.document;
  var RAKTAS = "gprocure.sutikimas";
  var VERSIJA = "2026-10-16-2";      // -2: nauja kategorija „statistika“ (iki tol - 2026-10-16)
  var GALIOJA_MEN = 12;

  /* Ne būtini įrašai: prefiksas -> kategorija. Visi kiti šios kilmės įrašai - būtini (darbo duomenys). */
  var NE_BUTINI = [
    ["gprocure-lang", "nustatymai"], ["ppmarket.lang", "nustatymai"], ["ppnegotiation.lang", "nustatymai"],
    ["ppcarbon.lang", "nustatymai"], ["pptiekejams.lang", "nustatymai"], ["ppesg.lang", "nustatymai"],
    ["gprocure.infoPanel.", "nustatymai"], ["gprocure_help_collapsed", "nustatymai"], ["epsog_dash_metric", "nustatymai"],
    ["gprocure.sutartys.stebejimas", "tobulinimo"]
  ];

  var T = {
    lt: {
      juostaPav: "Jūsų privatumas ir naršyklės saugykla",
      juosta: "G-Procure jūsų darbą saugo tik šioje naršyklėje - be to įrankiai neveiktų, todėl šie įrašai veikia visada. " +
        "Nustatymus (kalbą, skilčių būseną) įsimename, kad nereikėtų rinktis iš naujo - tai galite išjungti. " +
        "Su jūsų sutikimu pirkimo sąlygų įrankis kaups sutarčių parinkimo įrašus taisyklėms tikslinti (jie niekur nesiunčiami), " +
        "o mes rinksime naudojimosi statistiką - kurie įrankiai ir žingsniai naudojami, be jūsų įvesto teksto, IP adreso neįrašant. " +
        "Reklamos ir socialinių tinklų slapukų nenaudojame. Jūsų pasirinkimą įsiminsime 12 mėnesių, kad nebeklaustume.",
      visi: "Priimti visus", butini: "Tik būtinieji", nustatymai: "Nustatymai",
      politika: "Slapukų politika", privatumas: "Privatumo politika", kitaKalba: "English", kitaKalbaLang: "en",
      langoPav: "Slapukų ir naršyklės saugyklos nustatymai",
      ivadas: "G-Procure pats slapukų nenustato: duomenys laikomi naršyklės saugykloje (localStorage), kuriai taikomos tos pačios " +
        "taisyklės kaip slapukams. Pasirinkite, ką leidžiate įsiminti. Sprendimą bet kada pakeisite per nuorodą „Slapukų nustatymai“ " +
        "puslapio apačioje.",
      uzdaryti: "Uždaryti",
      visadaIjungti: "Visada įjungti", nenaudojama: "Nenaudojama", ijungta: "Įjungta", isjungta: "Išjungta",
      katButini: "Būtinieji",
      katButiniT: "Jūsų darbas įrankiuose (planai, pirkimų kortelės, protokolai, juodraščiai ir kt.), šis jūsų sprendimas, failai darbui " +
        "be interneto (programų bibliotekos, tiekėjų asistentas, teisės stebėsena) ir apsauga nuo automatinių užklausų (Cloudflare Turnstile - tik siunčiant " +
        "klausimą ar EPD failą). Be jų pasirinkta paslauga neveiktų, todėl sutikimo nereikia.",
      katNustatymai: "Nustatymų įsiminimas",
      katNustatymaiT: "Pasirinkta kalba, informacinių skilčių būsena (atverta ar suskleista), planavimo suvestinės rodiklis ir pirkimo sąlygų klausimų vaizdas (visi klausimai ar po vieną skyrių). " +
        "Išjungus įrašyti nustatymai ištrinami, o kalbą ir skiltis pasirinksite kiekvieną kartą.",
      katTobulinimo: "Tobulinimo įrašai",
      katTobulinimoT: "Pirkimo sąlygų įrankio (PP-salygos) sutarčių parinkimo stebėjimo įrašai: pirkimo pavadinimas ir tipas, ką siūlė " +
        "sistema ir ką pasirinkote. Kaupiami tik šioje naršyklėje ir niekur nesiunčiami - atsisiųstą failą galite perduoti G-Procure " +
        "rengėjui, kad šis tikslintų taisykles. Išjungus nauji įrašai nekaupiami.",
      yraIrasu: "Šioje naršyklėje yra anksčiau sukauptų tobulinimo įrašų - išjungus jie lieka, kol juos ištrinsite.",
      trinti: "Ištrinti sukauptus įrašus", trintiK: "Ištrinti visus sukauptus tobulinimo įrašus?", trintiTaip: "Taip, ištrinti", trintiNe: "Ne",
      istrinta: "Sukaupti tobulinimo įrašai ištrinti.",
      katStatistika: "Naudojimosi statistika",
      katStatistikaT: "Kurie įrankiai ir žingsniai naudojami, kiek veiksmų baigiasi klaida, telefonas ar kompiuteris. Siunčiami tik iš anksto " +
        "apibrėžti įvykiai su reikšmėmis iš sąrašo - be jūsų įvesto teksto, pavadinimų, sumų ir failų. Duomenys - PostHog ES duomenų centre " +
        "(Frankfurtas); IP adresas ir naršyklės aprašas naudojami tik dienos lankytojo kodui apskaičiuoti ir neįrašomi, naršyklėje nieko " +
        "neįrašoma, žmonių profiliai nekuriami, kitą dieną jūs neatpažįstami. " +
        "Išjungus nebesiunčiama.",
      katAnalitika: "Reklama ir socialiniai tinklai",
      katAnalitikaT: "G-Procure nenaudoja reklamos, socialinių tinklų slapukų ar sekimo pikselių ir lankytojų tarp svetainių neseka.",
      issaugoti: "Išsaugoti pasirinkimą",
      sprendimas: function (d, g) { return "Jūsų sprendimas: " + d + ", galioja iki " + g + "."; },
      nera: "Sprendimo dar nepriėmėte - kol jo nėra, veikia būtinieji įrašai ir nustatymų įsiminimas.",
      issaugota: "Slapukų nustatymai išsaugoti.",
      nepavyko: "Sprendimo įsiminti nepavyko (naršyklės saugykla neprieinama) - jis galioja tik šiame puslapyje."
    },
    en: {
      juostaPav: "Your privacy and browser storage",
      juosta: "G-Procure keeps your work only in this browser - the tools cannot work without it, so this storage is always on. " +
        "We remember settings (language, panel state) so you do not have to choose again - you can turn this off. " +
        "With your consent, the procurement conditions tool keeps contract selection records to refine its rules (they are never sent anywhere), " +
        "and we collect usage statistics - which tools and steps are used, without the text you enter and without storing your IP address. " +
        "We use no advertising or social media cookies. We will remember your choice for 12 months so we do not ask again.",
      visi: "Accept all", butini: "Necessary only", nustatymai: "Settings",
      politika: "Cookie policy", privatumas: "Privacy policy", kitaKalba: "Lietuviškai", kitaKalbaLang: "lt",
      langoPav: "Cookie and browser storage settings",
      ivadas: "G-Procure itself sets no cookies: data is kept in browser storage (localStorage), which is subject to the same rules as " +
        "cookies. Choose what you allow us to remember. You can change your decision at any time with the “Cookie settings” link " +
        "at the bottom of the page.",
      uzdaryti: "Close",
      visadaIjungti: "Always on", nenaudojama: "Not used", ijungta: "On", isjungta: "Off",
      katButini: "Necessary",
      katButiniT: "Your work in the tools (plans, procurement cards, minutes, drafts and more), this decision of yours, files for offline " +
        "use (software libraries, supplier assistant, law monitoring) and protection against automated requests (Cloudflare Turnstile - only when you send a " +
        "question or an EPD file). The service you choose would not work without them, so no consent is needed.",
      katNustatymai: "Remember settings",
      katNustatymaiT: "Your chosen language, the state of information panels (open or collapsed), the planning dashboard measure and the procurement conditions question view (all questions or one section at a time). " +
        "If turned off, saved settings are deleted and you will choose the language and panels each time.",
      katTobulinimo: "Improvement records",
      katTobulinimoT: "Contract selection records of the procurement conditions tool (PP-salygos): procurement title and type, what the " +
        "system suggested and what you chose. Kept only in this browser and never sent anywhere - you can download the file and give it " +
        "to the G-Procure developer to refine the rules. If turned off, no new records are kept.",
      yraIrasu: "This browser holds improvement records collected earlier - if you turn this off, they stay until you delete them.",
      trinti: "Delete collected records", trintiK: "Delete all collected improvement records?", trintiTaip: "Yes, delete", trintiNe: "No",
      istrinta: "Collected improvement records deleted.",
      katStatistika: "Usage statistics",
      katStatistikaT: "Which tools and steps are used, how many actions end in an error, phone or computer. Only predefined events with values " +
        "from a fixed list are sent - not the text you enter, titles, amounts or files. The data is kept in the PostHog EU data centre " +
        "(Frankfurt); your IP address and browser description are used only to compute a daily visitor code and are not stored, nothing " +
        "is stored in your browser, no personal profiles are created and you are not recognised the next day. " +
        "If turned off, nothing is sent.",
      katAnalitika: "Advertising and social media",
      katAnalitikaT: "G-Procure uses no advertising or social media cookies or tracking pixels and does not track visitors across websites.",
      issaugoti: "Save my choice",
      sprendimas: function (d, g) { return "Your decision: " + d + ", valid until " + g + "."; },
      nera: "You have not decided yet - until you do, only necessary storage and remembered settings are used.",
      issaugota: "Cookie settings saved.",
      nepavyko: "Your decision could not be saved (browser storage unavailable) - it applies to this page only."
    }
  };

  /* ---------- Saugykla ---------- */
  function atmintis() {
    var d = {};
    return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
             setItem: function (k, v) { d[k] = String(v); }, removeItem: function (k) { delete d[k]; },
             key: function (i) { return Object.keys(d)[i] || null; }, get length() { return Object.keys(d).length; } };
  }
  function testuPuslapis() {
    try {
      if (/[\/-]testai\.html$/.test(global.top.location.pathname)) return true;   // testai.html ir laikini „...-testai.html“
    } catch (e) { /* kitos kilmės viršutinis langas - ne mūsų testai */ }
    return /[?&]saugykla=testine(&|$)/.test((global.location && global.location.search) || "");
  }
  var TESTINE = testuPuslapis() ? atmintis() : null;
  var ATMINTYJE = null;     // sprendimas, kurio įsiminti nepavyko (galioja šiame puslapyje)
  function saug() {
    if (TESTINE) return TESTINE;
    try { return global.localStorage; } catch (e) { return null; }
  }

  function skaityk() {
    if (ATMINTYJE) return { busena: "yra", irasas: ATMINTYJE };
    var s = saug(), v;
    if (!s) return { busena: "neprieinama", irasas: null };
    try { v = s.getItem(RAKTAS); } catch (e) { return { busena: "neprieinama", irasas: null }; }
    if (v === null || v === undefined) return { busena: "nera", irasas: null };
    var r;
    try { r = JSON.parse(v); } catch (e) { return { busena: "sugadintas", irasas: null }; }
    if (!r || r.schema !== 1 || !r.kategorijos || typeof r.kategorijos !== "object") return { busena: "sugadintas", irasas: null };
    if (r.versija !== VERSIJA) return { busena: "kita-versija", irasas: null };
    var g = Date.parse(r.galioja);
    if (!(g > Date.now())) return { busena: "pasibaige", irasas: null };
    return { busena: "yra", irasas: r };
  }
  function galiojantis() { return skaityk().irasas; }

  function leidzia(k) {
    if (k === "butini") return true;
    var r = galiojantis();
    if (k === "nustatymai") return r ? r.kategorijos.nustatymai !== false : true;
    if (k === "tobulinimo") return !!(r && r.kategorijos.tobulinimo === true);
    if (k === "statistika") return !!(r && r.kategorijos.statistika === true);
    return false;                          // reklama ir kita - nenaudojama
  }
  function kategorija(raktas) {
    raktas = String(raktas == null ? "" : raktas);
    if (raktas === RAKTAS) return "butini";
    for (var i = 0; i < NE_BUTINI.length; i++) if (raktas.indexOf(NE_BUTINI[i][0]) === 0) return NE_BUTINI[i][1];
    return "butini";
  }
  function raktaiKategorijos(kat) {
    var s = saug(), out = [];
    if (!s) return out;
    try { for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k && k !== RAKTAS && kategorija(k) === kat) out.push(k); } } catch (e) {}
    return out;
  }
  function salink(raktai) {
    var s = saug();
    raktai.forEach(function (k) { try { s.removeItem(k); } catch (e) {} });
    return raktai;
  }

  function vietineData(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function d2(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + d2(d.getMonth() + 1) + "-" + d2(d.getDate());
  }

  function busena() {
    var r = skaityk();
    return { busena: r.busena, sprendimas: r.irasas, nustatymai: leidzia("nustatymai"), tobulinimo: leidzia("tobulinimo"), statistika: leidzia("statistika"),
             galioja: r.irasas ? r.irasas.galioja : null, versija: VERSIJA };
  }
  function siusk() {
    try { global.dispatchEvent(new global.CustomEvent("gp-sutikimas", { detail: busena() })); } catch (e) {}
  }

  function nustatyk(k, budas) {
    k = k || {};
    var dabar = new Date(), gal = new Date(dabar.getTime());
    gal.setMonth(gal.getMonth() + GALIOJA_MEN);
    var rec = { schema: 1, versija: VERSIJA, data: dabar.toISOString(), galioja: gal.toISOString(),
                budas: budas === "visi" || budas === "butini" ? budas : "pasirinkta",
                kategorijos: { nustatymai: k.nustatymai === true, tobulinimo: k.tobulinimo === true, statistika: k.statistika === true } };
    var s = saug(), ok = false;
    ATMINTYJE = null;
    try { s.setItem(RAKTAS, JSON.stringify(rec)); ok = s.getItem(RAKTAS) !== null; } catch (e) { ok = false; }
    if (!ok) ATMINTYJE = rec;
    var pasalinta = rec.kategorijos.nustatymai ? [] : salink(raktaiKategorijos("nustatymai"));
    atnaujinkSasaja();
    siusk();
    return { ok: ok, irasas: rec, pasalinta: pasalinta };
  }

  /* ---------- Kalba ---------- */
  var RANKINE = null;
  function lietuvoje() {
    if (global.GP_LANG && global.GP_LANG.isLietuva) return global.GP_LANG.isLietuva();
    try { if (global.Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/Vilnius") return true; } catch (e) {}
    var nav = global.navigator || {}, l = (nav.languages && nav.languages.length) ? nav.languages : [nav.language || ""];
    for (var i = 0; i < l.length; i++) if (/^lt(-|_|$)/i.test(String(l[i] || "").trim())) return true;
    return false;
  }
  function dvikalbis() { return !!global.GP_LANG; }
  function kalba() {
    if (dvikalbis()) return /^en/i.test(doc.documentElement.getAttribute("lang") || "") ? "en" : "lt";
    if (RANKINE) return RANKINE;
    return lietuvoje() ? "lt" : "en";
  }

  /* ---------- Svetainės šaknis (nuorodoms į politikas) ---------- */
  var SAKNIS = (function () {
    var src = (doc && doc.currentScript && doc.currentScript.src) || "";
    var m = src.match(/^(.*\/)shared\/sutikimas\.js(\?.*)?$/);
    return m ? m[1] : "/";
  })();
  function nuoroda(failas, l) { return SAKNIS + failas + "?lang=" + l; }

  /* ---------- Sąsaja ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var CSS =
    ".gpsk{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#fff;color:#2E3641;border-top:3px solid #00A072;" +
    "box-shadow:0 -6px 24px rgba(46,54,65,.18);font-family:var(--font-base,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif);" +
    "font-size:14px;line-height:1.5;max-height:85vh;overflow-y:auto;text-align:left}" +
    ".gpsk *,.gpsk-d *{box-sizing:border-box}" +
    ".gpsk-in{max-width:1180px;margin:0 auto;padding:16px 20px;display:flex;gap:14px 28px;align-items:center;flex-wrap:wrap}" +
    ".gpsk-tx{flex:1 1 520px;min-width:0}" +
    ".gpsk-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;margin:0 0 4px}" +
    ".gpsk h2{margin:0;font-size:18px;font-weight:700;line-height:1.3;color:#2E3641}" +
    ".gpsk p{margin:0;color:#2E3641}" +
    ".gpsk a,.gpsk-d a{color:#007554;font-weight:700;text-decoration:underline;text-underline-offset:2px}" +
    ".gpsk-l{margin-top:6px;font-size:14px}" +
    ".gpsk-kalba{font:inherit;font-size:14px;font-weight:700;color:#007554;background:none;border:0;padding:4px 2px;cursor:pointer;" +
    "text-decoration:underline;text-underline-offset:2px;min-height:32px}" +
    ".gpsk-btns{display:flex;gap:8px;flex-wrap:wrap;flex:0 1 auto}" +
    ".gpsk-b{font:inherit;font-size:14px;font-weight:700;line-height:1.25;min-height:44px;padding:10px 18px;border-radius:8px;cursor:pointer;" +
    "border:2px solid #2E3641;background:#2E3641;color:#fff;white-space:normal}" +
    ".gpsk-b:hover{background:#1C2129;border-color:#1C2129}" +
    ".gpsk-b--2{background:#fff;color:#2E3641}" +
    ".gpsk-b--2:hover{background:#EFF1F1;border-color:#2E3641}" +
    ".gpsk-b:focus-visible,.gpsk-kalba:focus-visible,.gpsk-x:focus-visible,.gpsk a:focus-visible,.gpsk-d a:focus-visible,.gpsk-sw input:focus-visible" +
    "{outline:3px solid #007554;outline-offset:2px}" +
    ".gpsk-tarpas{display:block}" +
    ".gpsk-d{position:fixed;inset:0;margin:auto;height:fit-content;border:0;border-radius:16px;padding:0;width:100%;max-width:min(680px,calc(100vw - 32px));max-height:calc(100vh - 32px);" +
    "color:#2E3641;background:#fff;font-family:var(--font-base,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif);font-size:14px;" +
    "line-height:1.5;box-shadow:0 18px 48px rgba(46,54,65,.28);text-align:left}" +
    ".gpsk-d[open]{display:flex;flex-direction:column}" +
    ".gpsk-d::backdrop{background:rgba(46,54,65,.55)}" +
    ".gpsk-dh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 20px 4px 24px}" +
    ".gpsk-dh h2{margin:6px 0 0;font-size:20px;font-weight:700;line-height:1.3;color:#2E3641}" +
    ".gpsk-x{flex:0 0 auto;width:44px;height:44px;border:0;border-radius:8px;background:none;color:#2E3641;font-size:24px;line-height:1;cursor:pointer}" +
    ".gpsk-x:hover{background:#EFF1F1}" +
    ".gpsk-db{padding:0 24px 8px;overflow-y:auto;min-height:0}" +
    ".gpsk-db>p{margin:8px 0 4px}" +
    ".gpsk-kat{border:1px solid #C7CDD3;border-radius:12px;padding:12px 16px;margin:12px 0}" +
    ".gpsk-kh{display:flex;justify-content:space-between;align-items:center;gap:8px 16px;flex-wrap:wrap}" +
    ".gpsk-kh h3{margin:0;font-size:16px;font-weight:700;line-height:1.3;color:#2E3641}" +
    ".gpsk-st{font-size:14px;font-weight:700;color:#5B6470}" +
    ".gpsk-sw{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;cursor:pointer;min-height:32px}" +
    ".gpsk-sw input{width:22px;height:22px;margin:0;accent-color:#007554;cursor:pointer}" +
    ".gpsk-kd{margin:6px 0 0;font-size:14px;color:#2E3641}" +
    ".gpsk-yra{margin:8px 0 0;padding:8px 12px;border-radius:8px;background:#EFF1F1;font-size:14px}" +
    ".gpsk-yra .gpsk-b{margin-top:8px;font-size:14px;min-height:40px;padding:8px 14px}" +
    ".gpsk-yra .gpsk-tr{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}" +
    ".gpsk-yra .gpsk-tr .gpsk-b{margin-top:0}" +
    ".gpsk-sp{margin:4px 0 0;font-size:14px;color:#5B6470}" +
    ".gpsk-df{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 24px 16px;border-top:1px solid #E1E2E4}" +
    ".gpsk-df .gpsk-l{flex:1 1 100%;margin:4px 0 0}" +
    "@media (max-width:640px){.gpsk-in{padding:14px 16px}.gpsk-btns{width:100%}.gpsk-btns .gpsk-b{flex:1 1 140px}.gpsk p{font-size:14px}" +
    ".gpsk-dh{padding:16px 12px 4px 16px}.gpsk-db{padding:0 16px 8px}.gpsk-df{padding:12px 16px 14px}.gpsk-df .gpsk-b{flex:1 1 140px}}" +
    "@media (forced-colors:active){.gpsk{border-top:3px solid CanvasText}.gpsk-b{border:2px solid ButtonText}}" +
    "@media print{.gpsk,.gpsk-d,.gpsk-tarpas{display:none!important}}";

  function stiliai() {
    if (doc.getElementById("gpsk-stiliai")) return;
    var st = doc.createElement("style");
    st.id = "gpsk-stiliai";
    st.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(st);
  }

  var JUOSTA = null, TARPAS = null, LANGAS = null, TRINTI_K = false, STEBETOJAS = null, ATIDARE = null;

  function juostosHtml(L, l) {
    return '<div class="gpsk-in"><div class="gpsk-tx"><div class="gpsk-h"><h2 id="gpsk-t">' + esc(L.juostaPav) + "</h2>" +
      // Perjungiklio tekstas - kita kalba ta kalba („English“ / „Lietuviškai“, lang atributas - ekrano skaitytuvui); pavadinimas - matomas tekstas
      (dvikalbis() ? "" : '<button type="button" class="gpsk-kalba" data-gpsk="kalba" lang="' + L.kitaKalbaLang + '">' + esc(L.kitaKalba) + "</button>") +
      "</div><p>" + esc(L.juosta) + '</p><p class="gpsk-l"><a href="' + esc(nuoroda("slapukai.html", l)) + '">' + esc(L.politika) +
      '</a> · <a href="' + esc(nuoroda("privatumas.html", l)) + '">' + esc(L.privatumas) + "</a></p></div>" +
      '<div class="gpsk-btns"><button type="button" class="gpsk-b" data-gpsk="visi">' + esc(L.visi) + "</button>" +
      '<button type="button" class="gpsk-b" data-gpsk="butini">' + esc(L.butini) + "</button>" +
      '<button type="button" class="gpsk-b gpsk-b--2" data-gpsk="nustatymai" aria-haspopup="dialog">' + esc(L.nustatymai) + "</button></div></div>";
  }

  function kategorijaHtml(id, pav, tekstas, valdiklis, papildomai) {
    return '<section class="gpsk-kat" aria-labelledby="gpsk-k-' + id + '"><div class="gpsk-kh"><h3 id="gpsk-k-' + id + '">' + esc(pav) + "</h3>" +
      valdiklis + '</div><p class="gpsk-kd" id="gpsk-kd-' + id + '">' + esc(tekstas) + "</p>" + (papildomai || "") + "</section>";
  }
  function jungiklis(id, L, ijungtas) {
    return '<label class="gpsk-sw"><input type="checkbox" role="switch" id="gpsk-sw-' + id + '" data-gpsk-kat="' + id + '"' +
      (ijungtas ? " checked" : "") + ' aria-labelledby="gpsk-k-' + id + ' gpsk-swt-' + id + '" aria-describedby="gpsk-kd-' + id + '">' +
      '<span id="gpsk-swt-' + id + '">' + esc(ijungtas ? L.ijungta : L.isjungta) + "</span></label>";
  }
  function yraTobulinimoIrasu() { return raktaiKategorijos("tobulinimo").length > 0; }

  function langoHtml(L, l, pasirinkta) {
    var b = busena(), r = b.sprendimas;
    var yra = yraTobulinimoIrasu() ? '<div class="gpsk-yra" id="gpsk-yra"><span>' + esc(L.yraIrasu) + "</span>" + (TRINTI_K
      ? '<div class="gpsk-tr" role="group" aria-labelledby="gpsk-trk"><span id="gpsk-trk">' + esc(L.trintiK) + '</span>' +
        '<button type="button" class="gpsk-b" data-gpsk="trinti-taip">' + esc(L.trintiTaip) + "</button>" +
        '<button type="button" class="gpsk-b gpsk-b--2" data-gpsk="trinti-ne">' + esc(L.trintiNe) + "</button></div>"
      : '<div><button type="button" class="gpsk-b gpsk-b--2" data-gpsk="trinti">' + esc(L.trinti) + "</button></div>") + "</div>" : "";
    return '<div class="gpsk-dh"><h2 id="gpsk-dt">' + esc(L.langoPav) + '</h2><button type="button" class="gpsk-x" data-gpsk="uzdaryti" ' +
      'data-gp-uzdaryti aria-label="' + esc(L.uzdaryti) + '">✕</button></div>' +
      '<div class="gpsk-db"><p>' + esc(L.ivadas) + "</p>" +
      kategorijaHtml("butini", L.katButini, L.katButiniT, '<span class="gpsk-st">' + esc(L.visadaIjungti) + "</span>") +
      kategorijaHtml("nustatymai", L.katNustatymai, L.katNustatymaiT, jungiklis("nustatymai", L, pasirinkta.nustatymai)) +
      kategorijaHtml("tobulinimo", L.katTobulinimo, L.katTobulinimoT, jungiklis("tobulinimo", L, pasirinkta.tobulinimo), yra) +
      kategorijaHtml("statistika", L.katStatistika, L.katStatistikaT, jungiklis("statistika", L, pasirinkta.statistika)) +
      kategorijaHtml("analitika", L.katAnalitika, L.katAnalitikaT, '<span class="gpsk-st">' + esc(L.nenaudojama) + "</span>") +
      '<p class="gpsk-sp" id="gpsk-sp">' + esc(r ? L.sprendimas(vietineData(r.data), vietineData(r.galioja)) : L.nera) + "</p></div>" +
      '<div class="gpsk-df"><button type="button" class="gpsk-b" data-gpsk="issaugoti">' + esc(L.issaugoti) + "</button>" +
      '<button type="button" class="gpsk-b" data-gpsk="visi">' + esc(L.visi) + "</button>" +
      '<button type="button" class="gpsk-b" data-gpsk="butini">' + esc(L.butini) + "</button>" +
      '<p class="gpsk-l"><a href="' + esc(nuoroda("slapukai.html", l)) + '">' + esc(L.politika) + '</a> · <a href="' +
      esc(nuoroda("privatumas.html", l)) + '">' + esc(L.privatumas) + "</a></p></div>";
  }

  function pasirinkimaiLange() {
    var o = { nustatymai: leidzia("nustatymai"), tobulinimo: leidzia("tobulinimo"), statistika: leidzia("statistika") };
    if (!LANGAS) return o;
    ["nustatymai", "tobulinimo", "statistika"].forEach(function (k) { var x = LANGAS.querySelector("#gpsk-sw-" + k); if (x) o[k] = x.checked; });
    return o;
  }

  function rodyk(o) {
    o = o || {};
    if (!doc || !doc.body) return null;
    stiliai();
    var l = kalba(), L = T[l];
    if (!JUOSTA) {
      JUOSTA = doc.createElement("section");
      JUOSTA.className = "gpsk";
      JUOSTA.setAttribute("data-gpsk-juosta", "");
      JUOSTA.setAttribute("data-darbas-ne", "");
      doc.body.insertBefore(JUOSTA, doc.body.firstChild);
      TARPAS = doc.createElement("div");
      TARPAS.className = "gpsk-tarpas";
      TARPAS.setAttribute("aria-hidden", "true");
      doc.body.appendChild(TARPAS);
      if (global.ResizeObserver) new global.ResizeObserver(tarpas).observe(JUOSTA);
      global.addEventListener("resize", tarpas);
    }
    JUOSTA.setAttribute("aria-labelledby", "gpsk-t");
    JUOSTA.setAttribute("lang", l);
    JUOSTA.innerHTML = juostosHtml(L, l);
    tarpas();
    return JUOSTA;
  }
  function tarpas() {
    if (JUOSTA && TARPAS) TARPAS.style.height = JUOSTA.offsetHeight + "px";
  }
  function slepk() {
    if (!JUOSTA) return;
    var fokusas = doc.activeElement && JUOSTA.contains(doc.activeElement);
    JUOSTA.remove(); if (TARPAS) TARPAS.remove();
    JUOSTA = null; TARPAS = null;
    global.removeEventListener("resize", tarpas);
    if (fokusas) fokusasITurini();
  }
  /* Juostą ar langą uždarius sprendimu, fokusas nepasimeta puslapio pradžioje: pagrindinis turinys arba antraštė. */
  function fokusasITurini() {
    var t = doc.querySelector("main") || doc.querySelector("[role=main]") || doc.querySelector("h1");
    if (!t) return;
    if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
    try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); }
  }

  function atverk(atidare) {
    if (!doc.body) { doc.addEventListener("DOMContentLoaded", function () { atverk(atidare); }, { once: true }); return null; }
    stiliai();
    TRINTI_K = false;
    // Iš kur atverta - uždarius fokusas grįžta ten (Safari nuorodai ir mygtukui paspaudus fokuso neduoda)
    if (!(LANGAS && LANGAS.open)) ATIDARE = atidare && atidare.nodeType === 1 ? atidare : doc.activeElement;
    if (!LANGAS) {
      LANGAS = doc.createElement("dialog");
      LANGAS.className = "gpsk-d";
      LANGAS.setAttribute("aria-labelledby", "gpsk-dt");
      LANGAS.setAttribute("data-darbas-ne", "");
      doc.body.appendChild(LANGAS);
      LANGAS.addEventListener("close", function () { TRINTI_K = false; global.setTimeout(grazinkFokusa, 0); });
      LANGAS.addEventListener("change", function (e) {
        var x = e.target;
        if (x && x.getAttribute && x.getAttribute("data-gpsk-kat")) {
          var L = T[kalba()], t = LANGAS.querySelector("#gpsk-swt-" + x.getAttribute("data-gpsk-kat"));
          if (t) t.textContent = x.checked ? L.ijungta : L.isjungta;
        }
      });
    }
    pieskLanga({ nustatymai: leidzia("nustatymai"), tobulinimo: leidzia("tobulinimo"), statistika: leidzia("statistika") });
    if (!LANGAS.open) {
      if (typeof LANGAS.showModal === "function") LANGAS.showModal(); else LANGAS.setAttribute("open", "");
    }
    return LANGAS;
  }
  function pieskLanga(pasirinkta) {
    if (!LANGAS) return;
    var l = kalba(), aktyvus = doc.activeElement && LANGAS.contains(doc.activeElement) ? doc.activeElement.getAttribute("data-gpsk") : null;
    LANGAS.setAttribute("lang", l);
    LANGAS.innerHTML = langoHtml(T[l], l, pasirinkta);
    if (aktyvus) { var el = LANGAS.querySelector('[data-gpsk="' + aktyvus + '"]'); if (el) el.focus(); }
  }
  /* Uždarius langą: fokusas - į elementą, iš kurio atverta; jei jo nebėra (juostos mygtukas po sprendimo) - į pagrindinį turinį. */
  function grazinkFokusa() {
    var a = ATIDARE; ATIDARE = null;
    if (a && a.isConnected && a !== doc.body && a !== doc.documentElement) {
      try { a.focus({ preventScroll: true }); } catch (e) { try { a.focus(); } catch (e2) {} }
      if (doc.activeElement === a) return;
    }
    if (!doc.activeElement || doc.activeElement === doc.body) fokusasITurini();
  }
  function uzdaryk() {
    if (!LANGAS) return;
    if (typeof LANGAS.close === "function" && LANGAS.open) LANGAS.close(); else LANGAS.removeAttribute("open");
  }

  function atnaujinkSasaja() {
    var r = galiojantis();
    if (r) slepk(); else if (JUOSTA) rodyk();
    if (LANGAS && LANGAS.open) pieskLanga(pasirinkimaiLange());
    else if (LANGAS) pieskLanga({ nustatymai: leidzia("nustatymai"), tobulinimo: leidzia("tobulinimo"), statistika: leidzia("statistika") });
  }

  function pranesk(tekstas, tipas) {
    if (global.GP_PRANESIMAS && global.GP_PRANESIMAS.rodyk) global.GP_PRANESIMAS.rodyk(tekstas, { tipas: tipas || "gerai" });
  }
  function sprendimas(k, budas) {
    var w = nustatyk(k, budas), L = T[kalba()];
    uzdaryk();      // fokusą sutvarko grazinkFokusa (lango „close“); sprendimas juostoje - slepk()
    pranesk(w.ok ? L.issaugota : L.nepavyko, w.ok ? "gerai" : "ispejimas");
    return w;
  }

  function paspaudimas(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-gpsk], [data-gp-slapukai]") : null;
    if (!t) return;
    if (t.hasAttribute("data-gp-slapukai") && !t.hasAttribute("data-gpsk")) { e.preventDefault(); atverk(t); return; }
    if (!(JUOSTA && JUOSTA.contains(t)) && !(LANGAS && LANGAS.contains(t))) return;
    var v = t.getAttribute("data-gpsk"), L = T[kalba()];
    if (v === "visi") sprendimas({ nustatymai: true, tobulinimo: true, statistika: true }, "visi");
    else if (v === "butini") sprendimas({ nustatymai: false, tobulinimo: false, statistika: false }, "butini");
    else if (v === "issaugoti") sprendimas(pasirinkimaiLange(), "pasirinkta");
    else if (v === "nustatymai") atverk(t);
    else if (v === "uzdaryti") uzdaryk();
    else if (v === "kalba") { RANKINE = t.getAttribute("lang") === "en" ? "en" : "lt"; rodyk(); var k = JUOSTA && JUOSTA.querySelector("[data-gpsk=kalba]"); if (k) k.focus(); if (LANGAS) pieskLanga(pasirinkimaiLange()); }
    else if (v === "trinti") { TRINTI_K = true; pieskLanga(pasirinkimaiLange()); var n = LANGAS.querySelector("[data-gpsk=trinti-ne]"); if (n) n.focus(); }
    else if (v === "trinti-ne") { TRINTI_K = false; pieskLanga(pasirinkimaiLange()); var tr = LANGAS.querySelector("[data-gpsk=trinti]"); if (tr) tr.focus(); }
    else if (v === "trinti-taip") {
      TRINTI_K = false; salink(raktaiKategorijos("tobulinimo"));
      pieskLanga(pasirinkimaiLange());
      var sw = LANGAS.querySelector("#gpsk-sw-tobulinimo"); if (sw) sw.focus();
      pranesk(L.istrinta); siusk();
    }
  }

  function kalbosStebetojas() {
    if (STEBETOJAS || !global.MutationObserver || !doc) return;
    STEBETOJAS = new global.MutationObserver(function () {
      if (JUOSTA) rodyk();
      if (LANGAS) pieskLanga(pasirinkimaiLange());
    });
    STEBETOJAS.observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  function pradzia() {
    if (!doc) return;
    doc.addEventListener("click", paspaudimas);
    kalbosStebetojas();
    global.addEventListener("storage", function (e) {
      if (TESTINE) return;
      if (e.key === RAKTAS || e.key === null) { ATMINTYJE = null; atnaujinkSasaja(); siusk(); }
    });
    var virsutinis = false;
    try { virsutinis = global.top === global; } catch (e) { virsutinis = false; }
    function arRodyti() { if (virsutinis && !TESTINE && !galiojantis()) rodyk(); }
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", arRodyti, { once: true }); else arRodyti();
  }

  global.GP_SUTIKIMAS = {
    RAKTAS: RAKTAS, VERSIJA: VERSIJA, GALIOJA_MEN: GALIOJA_MEN,
    KATEGORIJOS: ["butini", "nustatymai", "tobulinimo", "statistika"],
    NE_BUTINI: NE_BUTINI.map(function (x) { return x.slice(); }),
    TEKSTAI: T,
    leidzia: leidzia, kategorija: kategorija, busena: busena, nustatyk: nustatyk,
    rodyk: function (o) { return rodyk(o); }, slepk: slepk, atverk: function (atidare) { return atverk(atidare); }, uzdaryk: uzdaryk, kalba: kalba,
    raktai: raktaiKategorijos,
    naudokSaugykla: function (s) { TESTINE = s || (testuPuslapis() ? atmintis() : null); ATMINTYJE = null; atnaujinkSasaja(); }
  };
  pradzia();
})(typeof window !== "undefined" ? window : this);
