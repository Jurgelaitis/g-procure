/* ============================================================================
 * G-Procure  shared/lang-detect.js
 * ----------------------------------------------------------------------------
 * Pradinės sąsajos kalbos parinkimas VISIEMS dvikalbiams moduliams (window.GP_LANG).
 *
 * Taisyklė (viena visai svetainei):
 *   1. Rankinis pasirinkimas visada laimi - jei localStorage rakte jau įrašyta
 *      "lt" arba "en", grąžinama ji (pasirinkimas išlieka tarp apsilankymų).
 *   2. Kitaip: lankytojas iš Lietuvos -> "lt", visi kiti -> "en".
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

  // Pradinė kalba moduliui: rankinis pasirinkimas -> aptikimas.
  // opts: raktas (string) arba { storageKey, env, storage }.
  function detect(opts) {
    opts = typeof opts === "string" ? { storageKey: opts } : (opts || {});
    var s = saved(opts.storageKey, opts.storage);
    if (s) return s;
    return isLietuva(opts.env) ? "lt" : "en";
  }

  // Įrašo rankinį pasirinkimą. Grąžina true, jei pavyko.
  function remember(key, lang, storage) {
    if (!key || !saugiKalba(lang)) return false;
    try { (storage || global.localStorage).setItem(key, lang); return true; } catch (e) { return false; }
  }

  global.GP_LANG = {
    detect: detect,
    isLietuva: isLietuva,
    saved: saved,
    remember: remember,
    LANGS: KALBOS.slice()
  };
})(typeof window !== "undefined" ? window : this);
