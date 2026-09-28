/* ============================================================================
 * G-Procure  shared/saugykla.js   (window.GP_SAUGYKLA)
 * ----------------------------------------------------------------------------
 * Saugus naršyklės saugyklos (localStorage) skaitymas ir rašymas VISIEMS
 * moduliams (tobulinimo planas Q3, 2026-09-26).
 *
 * KODĖL. Iki šiol beveik kiekvienas modulis neperskaitomą (sugadintą) įrašą
 * tyliai paversdavo tuščiu ar demonstraciniu: naudotojas matydavo „pirkimų nėra“,
 * o KITAS išsaugojimas negrįžtamai perrašydavo tikrus duomenis. „Išsaugota“ kai
 * kur buvo rodoma net tada, kai įrašymas nepavyko (pilna saugykla).
 *
 * TAISYKLĖS:
 *  - skaityk() skiria keturias būsenas: yra / nera / sugadinta / neprieinama.
 *    „Sugadinta“ NIEKADA netampa „nera“.
 *  - Sugadinta žalia reikšmė iškart nukopijuojama į atskirą raktą
 *    „<raktas>.sugadinta-<data>“ - ją išsaugo ir atsarginė kopija
 *    (shared/backup.js), tad perrašius pagrindinį raktą duomenys nedingsta.
 *  - rasyk() grąžina { ok, klaida }: „Išsaugota“ rodoma tik pavykus.
 *  - Saugykla gali būti paduota iš išorės (testai nenaudoja tikros).
 *  - Du to paties modulio skirtukai (2026-09-28): moduliai, kurie laiko visą būseną atmintyje
 *    ir įrašo ją visą, iki tol tyliai perrašydavo kito skirtuko pakeitimus (laimėdavo paskutinis
 *    įrašęs). Su { kitasSkirtukas: "Žmogui suprantamas pavadinimas" } skaityk() ir rasyk() įsimena
 *    šio lango matytą reikšmę (arba prisimink(), jei modulis skaito pats; pavadinimas gali būti ir
 *    funkcija - dvikalbiams moduliams); jei kitas skirtukas ją
 *    pakeitė, rasyk() neperrašo - { ok: false, kodas: "kitas-skirtukas" } - o vos pakeitus (storage
 *    įvykis) viršuje rodoma juosta su „Perkrauti“.
 *
 * Naudojimas:
 *   const r = GP_SAUGYKLA.skaityk("epsog_mpp_v1");
 *   if (r.busena === "yra") DATA = r.reiksme;
 *   else if (r.busena === "sugadinta" || r.busena === "neprieinama")
 *     GP_BUSENA.juosta({ tipas: "nezinoma", tekstas: GP_SAUGYKLA.pranesimas(r, "Metinis pirkimų planas") });
 *   const w = GP_SAUGYKLA.rasyk("epsog_mpp_v1", DATA);   // { ok: true } | { ok: false, klaida }
 * Nieko nesiunčia; saugo tik tai, ką modulis ir taip saugojo.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var ZYME = ".sugadinta-";
  var MATYTA = {};            // raktas -> { zalia, pav }: ką šis langas paskutinį kartą matė (tik su kitasSkirtukas)

  function saugykla(s) {
    if (s) return s;
    try { return global.localStorage; } catch (e) { return null; }
  }
  function data() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  /* Sugadintos reikšmės kopija - vieną kartą tai pačiai reikšmei. Grąžina rakto vardą arba null. */
  function kopija(s, raktas, zalia) {
    try {
      for (var i = 0; i < s.length; i++) {
        var k = s.key(i);
        if (k && k.indexOf(raktas + ZYME) === 0 && s.getItem(k) === zalia) return k;
      }
      // Tą pačią sekundę kita sugadinta reikšmė gauna priesagą („-2“): iki 2026-09-28 ji perrašydavo ankstesnę kopiją
      var naujas = raktas + ZYME + data(), n = 1;
      while (s.getItem(naujas + (n > 1 ? "-" + n : "")) !== null) n++;
      naujas += n > 1 ? "-" + n : "";
      s.setItem(naujas, zalia);
      return naujas;
    } catch (e) { return null; }
  }

  /* o: { saugykla, tikrink(reiksme) -> true | "priežastis" } - tikrink leidžia atmesti
     ne tos formos JSON (pvz. tikėtasi masyvo) kaip sugadintą, o ne kaip tuščią. */
  function skaityk(raktas, o) {
    o = o || {};
    var s = saugykla(o.saugykla);
    if (!s) return { busena: "neprieinama", kodas: "neprieinama", klaida: "naršyklės saugykla neprieinama" };
    var zalia;
    try { zalia = s.getItem(raktas); }
    catch (e) { return { busena: "neprieinama", kodas: "neprieinama", klaida: (e && e.message) || "naršyklės saugykla neprieinama" }; }
    if (o.kitasSkirtukas && !o.saugykla) isimink(raktas, zalia, o.kitasSkirtukas);
    if (zalia === null || zalia === undefined) return { busena: "nera" };
    var reiksme;
    try { reiksme = JSON.parse(zalia); }
    catch (e) {
      return { busena: "sugadinta", kodas: "json", zalia: zalia, klaida: "įrašas neperskaitomas (" + ((e && e.message) || "JSON") + ")",
               kopija: kopija(s, raktas, zalia) };
    }
    if (o.tikrink) {
      var t = o.tikrink(reiksme);
      if (t !== true) {
        return { busena: "sugadinta", kodas: "sandara", zalia: zalia, klaida: typeof t === "string" ? t : "netinkama įrašo sandara",
                 kopija: kopija(s, raktas, zalia) };
      }
    }
    return { busena: "yra", reiksme: reiksme };
  }

  function rasyk(raktas, reiksme, o) {
    o = o || {};
    var s = saugykla(o.saugykla);
    if (!s) return { ok: false, kodas: "neprieinama", klaida: "naršyklės saugykla neprieinama" };
    var tekstas = typeof reiksme === "string" && o.zalia ? reiksme : JSON.stringify(reiksme);
    if (o.kitasSkirtukas && Object.prototype.hasOwnProperty.call(MATYTA, raktas)) {
      var dabar;
      try { dabar = s.getItem(raktas); } catch (e) { dabar = MATYTA[raktas].zalia; }
      // Kitas skirtukas pakeitė, ką šis langas matė: neperrašom jo pakeitimų. Ne konfliktas: tas pats turinys ir pašalintas
      // raktas (moduliai „Išvalyti“ / „Naujas“ patys jį šalina tiesiogiai; blogiausiu atveju grąžinamas išvalytas, bet niekas neprarandama)
      if (dabar !== null && dabar !== MATYTA[raktas].zalia && dabar !== tekstas) {
        rodykKitaSkirtuka(raktas);
        return { ok: false, kodas: "kitas-skirtukas", klaida: "duomenys pakeisti kitame šios naršyklės skirtuke ar puslapyje" };
      }
    }
    try {
      s.setItem(raktas, tekstas);
      if (o.kitasSkirtukas && !o.saugykla) isimink(raktas, tekstas, o.kitasSkirtukas);
      return { ok: true };
    } catch (e) {
      var pilna = e && (e.name === "QuotaExceededError" || e.code === 22 || /quota/i.test(String(e.message)));
      return { ok: false, kodas: pilna ? "pilna" : "kita", klaida: pilna ? "naršyklės saugykla pilna" : ((e && e.message) || "įrašyti nepavyko") };
    }
  }

  /* Kas matyta šiame lange; pirmą kartą - ir klausomasi kitų skirtukų (storage įvykis ateina tik į KITUS langus).
     Vėl sutapus (perskaityta iš naujo, įrašyta, kitas skirtukas grąžino tą pačią reikšmę ar ją pašalino) - juosta nuimama. */
  var klausoma = false, VEIKSMAI = {};
  function isimink(raktas, zalia, pav) {
    MATYTA[raktas] = { zalia: zalia === undefined ? null : zalia, pav: (typeof pav === "string" || typeof pav === "function") ? pav : "" };
    slepkKitaSkirtuka(raktas);
    if (klausoma || !global.addEventListener) return;
    klausoma = true;
    global.addEventListener("storage", function (e) {
      if (e.key === null) return;                                     // visa saugykla išvalyta - ne konfliktas (žr. rasyk)
      if (!Object.prototype.hasOwnProperty.call(MATYTA, e.key)) return;
      if (e.newValue === null || e.newValue === MATYTA[e.key].zalia) { slepkKitaSkirtuka(e.key); return; }
      rodykKitaSkirtuka(e.key);
    });
    // Grįžus atgal naršyklės mygtuku puslapis atkuriamas iš talpyklos su senais duomenimis - tikrinama iš karto
    global.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      var s = saugykla();
      Object.keys(MATYTA).forEach(function (k) {
        var dabar; try { dabar = s && s.getItem(k); } catch (x) { return; }
        if (dabar !== null && dabar !== undefined && dabar !== MATYTA[k].zalia) rodykKitaSkirtuka(k);
      });
    });
  }
  /* Modulis skaito pats (ne per skaityk): įsimenama dabartinė reikšmė. */
  function prisimink(raktas, pav, o) {
    var s = saugykla(o && o.saugykla);
    if (!s || (o && o.saugykla)) return;
    try { isimink(raktas, s.getItem(raktas), pav); } catch (e) { /* neprieinama - nėra ko saugoti */ }
  }
  /* Juostos mygtukas: numatytasis - „Perkrauti“ (modulis įkelia išsaugotus duomenis paleisdamas); modulis, kuris jų paleisdamas
     neįkelia (KNA - „Atverti“), duoda savo: atnaujinimas(raktas, { tekstas, veiksmas }). Kitaip perkrovus rodomas tuščias
     darbas, o rašant jis perrašytų kito skirtuko duomenis (penktoji peržiūra, 2026-09-28). */
  function atnaujinimas(raktas, v) { VEIKSMAI[raktas] = v; }
  function mygtukoTekstas(raktas) {
    var v = VEIKSMAI[raktas];
    if (v && v.tekstas) return typeof v.tekstas === "function" ? v.tekstas() : v.tekstas;
    return en() ? "Reload" : "Perkrauti";
  }
  function juostosRaktas(raktas) { return "kitas-skirtukas-" + raktas; }
  function rodykKitaSkirtuka(raktas) {
    if (!global.GP_BUSENA || !global.GP_BUSENA.juosta || typeof document === "undefined") return;
    // Jau rodoma - neperpiešiama (kitaip kiekvienas nepavykęs įrašas, pvz. kiekvienu klavišu, ją perpieštų ir skaitytuvas kartotų)
    if (document.querySelector('[data-gpb-raktas="' + juostosRaktas(raktas) + '"]')) return;
    var pav = (MATYTA[raktas] && MATYTA[raktas].pav) || "";          // tekstas arba funkcija (dvikalbiams moduliams)
    global.GP_BUSENA.juosta({ raktas: juostosRaktas(raktas), tipas: "nezinoma",
      tekstas: function () { return pranesimas({ ok: false, kodas: "kitas-skirtukas", juosta: true, mygtukas: mygtukoTekstas(raktas) }, typeof pav === "function" ? pav() : pav); },
      mygtukai: [{ tekstas: function () { return mygtukoTekstas(raktas); }, veiksmas: function () {
        var v = VEIKSMAI[raktas];
        if (!(v && typeof v.veiksmas === "function")) { global.location.reload(); return; }
        v.veiksmas();
        // Juosta su mygtuku nuimta - fokusas neturi likti niekur (šeštoji peržiūra): į puslapio antraštę
        var d = global.document, a = d.activeElement;
        if (!a || a === d.body || !d.documentElement.contains(a)) {
          var h = d.querySelector("h1") || d.querySelector("main, [role=main]");
          if (h) { if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); h.focus(); }
        }
      } }] });
  }
  function slepkKitaSkirtuka(raktas) {
    if (global.GP_BUSENA && global.GP_BUSENA.juostaSlepk) global.GP_BUSENA.juostaSlepk(juostosRaktas(raktas));
  }
  function en() { return typeof document !== "undefined" && /^en/i.test(document.documentElement.getAttribute("lang") || ""); }

  /* Priežastis angliškai: moduliai paduoda lietuvišką (tikrink), todėl EN - pagal kodą, ne tekstą. */
  var KODAI_EN = { json: "the record is not valid JSON", sandara: "the record has an unexpected structure",
                   neprieinama: "browser storage is unavailable", pilna: "browser storage is full" };

  /* Žmogui suprantamas pranešimas apie nepavykusį skaitymą ar rašymą (kalba - iš <html lang>). */
  function pranesimas(r, pav) {
    if (!r) return "";
    var en = typeof document !== "undefined" && /^en/i.test(document.documentElement.getAttribute("lang") || "");
    if (r.kodas === "kitas-skirtukas") {
      var kas = pav ? (en ? "The \u201C" + pav + "\u201D data" : "Duomenys „" + pav + "“") : (en ? "The data" : "Duomenys");
      var myg = r.mygtukas || (en ? "Reload" : "Perkrauti");
      // „Ar puslapyje“ - ir tame pačiame skirtuke: grįžus atgal naršyklės mygtuku atkuriamas senas puslapis
      if (r.juosta) return en ? kas + " changed in another tab or page of this browser. Press \u201C" + myg + "\u201D to see the latest - until then, changes here are not saved, so as not to overwrite those."
                              : kas + " pakeisti kitame šios naršyklės skirtuke ar puslapyje. Spauskite „" + myg + "“, kad matytumėte naujausius - iki tol pakeitimai čia neišsaugomi, kad nebūtų perrašyti anie.";
      // Trumpas (modulio „Neišsaugota“ juostai) - be mygtuko: jis gali būti jau nuimtas, o pavadinimas - kitos kalbos (šeštoji peržiūra)
      return en ? "Not saved: " + kas.charAt(0).toLowerCase() + kas.slice(1) + " changed in another tab or page of this browser, so it is not overwritten here."
                : "Neišsaugota: " + kas.charAt(0).toLowerCase() + kas.slice(1) + " pakeisti kitame šios naršyklės skirtuke ar puslapyje, todėl čia neperrašomi.";
    }
    if (en) {
      var what = pav ? "\u201C" + pav + "\u201D" : "saved data";
      var why = KODAI_EN[r.kodas] || (r.kodas === "kita" ? "the write failed" : "unknown reason");
      if (r.busena === "sugadinta") return "Saved data " + what + " could not be read (" + why + "). It is not lost: " +
        (r.kopija ? "a copy was kept separately and will be included in the backup. " : "") +
        "The data status is unknown - restore it from a backup or continue from empty.";
      if (r.busena === "neprieinama") return "Browser storage is unavailable - the status of " + what +
        " is unknown and new changes will not be saved (e.g. private window or blocked site data).";
      if (r.ok === false) return "Could not save " + what + ": " + why + ". Changes remain only in the open page.";
      return "";
    }
    var ka = pav ? "„" + pav + "“" : "išsaugotų duomenų";
    if (r.busena === "sugadinta") {
      return "Išsaugotų duomenų " + ka + " perskaityti nepavyko (" + r.klaida + "). Jie nedingo: " +
        (r.kopija ? "kopija išsaugota atskirai ir pateks į atsarginę kopiją. " : "") +
        "Duomenų būsena nežinoma - galite atkurti juos iš atsarginės kopijos arba tęsti nuo tuščio.";
    }
    if (r.busena === "neprieinama") {
      return "Naršyklės saugykla neprieinama (" + r.klaida + ") - išsaugotų duomenų " + ka +
        " būsena nežinoma, o nauji pakeitimai nebus išsaugoti (pvz. privatus langas ar užblokuoti svetainės duomenys).";
    }
    if (r.ok === false) return "Nepavyko išsaugoti " + ka + ": " + r.klaida + ". Pakeitimai lieka tik atidarytame puslapyje.";
    return "";
  }

  global.GP_SAUGYKLA = { skaityk: skaityk, rasyk: rasyk, pranesimas: pranesimas, prisimink: prisimink, atnaujinimas: atnaujinimas, ZYME: ZYME };
})(typeof window !== "undefined" ? window : this);
