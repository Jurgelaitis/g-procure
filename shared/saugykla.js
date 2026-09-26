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
      var naujas = raktas + ZYME + data();
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
    try {
      s.setItem(raktas, typeof reiksme === "string" && o.zalia ? reiksme : JSON.stringify(reiksme));
      return { ok: true };
    } catch (e) {
      var pilna = e && (e.name === "QuotaExceededError" || e.code === 22 || /quota/i.test(String(e.message)));
      return { ok: false, kodas: pilna ? "pilna" : "kita", klaida: pilna ? "naršyklės saugykla pilna" : ((e && e.message) || "įrašyti nepavyko") };
    }
  }

  /* Priežastis angliškai: moduliai paduoda lietuvišką (tikrink), todėl EN - pagal kodą, ne tekstą. */
  var KODAI_EN = { json: "the record is not valid JSON", sandara: "the record has an unexpected structure",
                   neprieinama: "browser storage is unavailable", pilna: "browser storage is full" };

  /* Žmogui suprantamas pranešimas apie nepavykusį skaitymą ar rašymą (kalba - iš <html lang>). */
  function pranesimas(r, pav) {
    if (!r) return "";
    var en = typeof document !== "undefined" && /^en/i.test(document.documentElement.getAttribute("lang") || "");
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

  global.GP_SAUGYKLA = { skaityk: skaityk, rasyk: rasyk, pranesimas: pranesimas, ZYME: ZYME };
})(typeof window !== "undefined" ? window : this);
