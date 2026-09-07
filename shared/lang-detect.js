/* ============================================================================
 * G-Procure  shared/lang-detect.js
 * ----------------------------------------------------------------------------
 * Pradinės sąsajos kalbos parinkimas VISIEMS dvikalbiams moduliams (window.GP_LANG).
 *
 * Taisyklė (viena visai svetainei):
 *   1. Adreso parametras ?lang=lt|en - jei jis yra, laimi jis. Tai nuoroda, kurią
 *      žmogus gavo (iš Google, kolegos ar el. laiško), ir ji turi atidaryti būtent
 *      tą kalbą. Į localStorage NEįrašoma: tai vienkartinė peržiūra, ne pasirinkimas.
 *   2. Rankinis pasirinkimas - jei localStorage rakte jau įrašyta "lt" arba "en",
 *      grąžinama ji (pasirinkimas išlieka tarp apsilankymų).
 *   3. Kitaip: lankytojas iš Lietuvos -> "lt", visi kiti -> "en".
 *
 * Kas yra "iš Lietuvos" be serverio. Svetainė gyvena GitHub Pages
 * (server: GitHub.com, ne Cloudflare proxy), tad IP geolokacijos naršyklė
 * gauti negali. Naršyklėje prieinami du patikimi signalai, ir pakanka bet kurio:
 *   - laiko juosta Europe/Vilnius (įrenginys nustatytas Lietuvoje);
 *   - naršyklės kalbų sąraše yra lietuvių (lt, lt-LT).
 * Rankinis LT/EN jungiklis moduliuose lieka - jis įrašo pasirinkimą raktu, ir
 * nuo tada 1 taisyklė nustelbia aptikimą.
 *
 * Jei svetainė kada nors atsidurtų už Cloudflare proxy, čia (ir TIK čia) galima
 * pridėti tikslesnį šalies signalą (/cdn-cgi/trace -> loc=LT). Moduliai keisti
 * nereikėtų - jie kviečia tik GP_LANG.detect(raktas).
 *
 * KODĖL ?lang= APSKRITAI ATSIRADO (paieškos sistemoms). Iki 2026-09 abi kalbos
 * gyveno tuo pačiu adresu, todėl `hreflang` buvo sąmoningai nepridėtas - jis
 * reikalauja ATSKIRO URL kiekvienai kalbai, kitaip būtų melagingas. Bet be jo
 * Google indeksuoja tik tą versiją, kurią pats atvaizduoja, o Googlebot dirba ne
 * iš Lietuvos, tad gaudavo ANGLIŠKĄ versiją, nors puslapio statinis tekstas ir
 * `<title>` yra lietuviški. Dabar kiekvienas dvikalbis puslapis turi tris adresus:
 *   .../puslapis.html            - aptinka kalbą pats (hreflang x-default)
 *   .../puslapis.html?lang=lt    - lietuviškai
 *   .../puslapis.html?lang=en    - angliškai
 * Visi trys rodo tą patį failą, todėl kanoninę nuorodą reikia pataisyti vykdymo
 * metu - tai daro `zymekKanonini()` (žemiau), kitaip visi trys kanonizuotųsi į
 * vieną ir hreflang būtų ignoruojamas.
 *
 * Naudojimas modulyje:
 *   <script src="../shared/lang-detect.js"></script>
 *   let LANG = GP_LANG.detect("ppcarbon.lang");        // pradinė kalba
 *   function setLang(l) { LANG = l; GP_LANG.remember("ppcarbon.lang", l); ... }
 * ==========================================================================*/

;(function (global) {
  "use strict";

  var KALBOS = ["lt", "en"];
  var VILNIUS = "Europe/Vilnius";

  function saugiKalba(v) { return KALBOS.indexOf(v) !== -1 ? v : null; }

  // Rankinis pasirinkimas iš localStorage (arba null, jei nėra / neprieinama).
  function saved(key, storage) {
    if (!key) return null;
    try {
      var st = storage || global.localStorage;
      return st ? saugiKalba(st.getItem(key)) : null;
    } catch (e) { return null; }
  }

  // Ar lankytojas iš Lietuvos pagal naršyklės signalus. `env` - tik testams
  // ({ timeZone, languages }); be jo imama tikra naršyklės aplinka.
  function isLietuva(env) {
    env = env || {};
    var tz = env.timeZone;
    if (tz === undefined) {
      try { tz = global.Intl && global.Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { tz = ""; }
    }
    if (tz === VILNIUS) return true;

    var langs = env.languages;
    if (langs === undefined) {
      var nav = global.navigator || {};
      langs = (nav.languages && nav.languages.length) ? nav.languages : [nav.language || nav.userLanguage || ""];
    }
    for (var i = 0; i < (langs || []).length; i++) {
      if (/^lt(-|_|$)/i.test(String(langs[i] || "").trim())) return true;
    }
    return false;
  }

  // Kalba iš adreso (?lang=lt / ?lang=en) arba null. `search` - tik testams.
  function urlLang(search) {
    if (search === undefined) {
      try { search = global.location ? global.location.search : ""; } catch (e) { search = ""; }
    }
    var m = /[?&]lang=([^&#]*)/i.exec(String(search || ""));
    if (!m) return null;
    try { return saugiKalba(decodeURIComponent(m[1]).toLowerCase()); }
    catch (e) { return saugiKalba(String(m[1]).toLowerCase()); }
  }

  // Pradinė kalba moduliui: adresas -> rankinis pasirinkimas -> aptikimas.
  // opts: raktas (string) arba { storageKey, env, storage, url }.
  function detect(opts) {
    opts = typeof opts === "string" ? { storageKey: opts } : (opts || {});
    var u = urlLang(opts.url);
    if (u) return u;
    var s = saved(opts.storageKey, opts.storage);
    if (s) return s;
    return isLietuva(opts.env) ? "lt" : "en";
  }

  /* Kanoninė nuoroda turi rodyti į TĄ PATĮ adresą, kuriuo atėjo lankytojas - kitaip
     ?lang=lt ir ?lang=en kanonizuotųsi į beparametrį adresą, Google juos išmestų iš
     indekso ir hreflang nustotų galioti. Statiniame faile stovi beparametrė nuoroda
     (teisinga pačiam beparametriam adresui), o čia ji pataisoma, kai parametras yra. */
  function zymekKanonini(lang) {
    try {
      var doc = global.document;
      if (!doc) return;
      var el = doc.querySelector('link[rel="canonical"]');
      if (!el) return;
      var baze = String(el.getAttribute("href") || "").split("?")[0];
      if (!baze) return;
      var l = saugiKalba(lang) || urlLang();
      el.setAttribute("href", l ? baze + "?lang=" + l : baze);
    } catch (e) { /* kanoninė nuoroda nėra būtina moduliui veikti */ }
  }

  /* Rankinis pasirinkimas turi atsispindėti ir adrese: žmogus, atėjęs per ?lang=en
     ir paspaudęs LT, po perkrovimo vėl gautų EN, nes adresas nustelbia įrašą. */
  function sinchronizuokAdresa(lang) {
    try {
      if (!global.history || !global.history.replaceState || !global.location) return;
      if (urlLang() === null) return;               // adrese parametro nebuvo - nepridedam
      if (urlLang() === lang) return;
      var u = global.location.pathname + global.location.search.replace(/([?&])lang=[^&#]*/i, "$1lang=" + lang) + global.location.hash;
      global.history.replaceState(null, "", u);
    } catch (e) { /* adreso sinchronizavimas yra patogumas, ne būtinybė */ }
  }

  // Įrašo rankinį pasirinkimą. Grąžina true, jei pavyko.
  function remember(key, lang, storage) {
    if (!key || !saugiKalba(lang)) return false;
    sinchronizuokAdresa(lang);
    zymekKanonini(lang);
    try { (storage || global.localStorage).setItem(key, lang); return true; } catch (e) { return false; }
  }

  global.GP_LANG = {
    detect: detect,
    isLietuva: isLietuva,
    saved: saved,
    urlLang: urlLang,
    remember: remember,
    markCanonical: zymekKanonini,
    LANGS: KALBOS.slice()
  };

  // Beparametriam adresui statinė kanoninė nuoroda jau teisinga, tad dirbam tik su parametru.
  if (urlLang()) {
    if (global.document && global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", function () { zymekKanonini(); });
    } else {
      zymekKanonini();
    }
  }
})(typeof window !== "undefined" ? window : this);
