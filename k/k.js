/* ============================================================================
 * G-Procure trumpa kvietimo nuoroda (2026-11-27): https://g-procure.com/k/#<ID> -> PP-report/pasiulymas.html#k=<kodas>.
 * Kvietimo kodas gaunamas iš G-Procure serverio (GET https://api.g-procure.com/api/k/<ID>, be slapukų ir nukreipimo informacijos).
 * Nerasta - „nuoroda nebegalioja“, ryšys ar serverio klaida - „Bandyti dar kartą“ (niekada „nėra“). Serveris - serveris/nuorodos-*.js.
 * ========================================================================== */
(function () {
  "use strict";
  var API = "https://api.g-procure.com/api/k/";
  var ID_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/, KODO_RE = /^g[01]\.[A-Za-z0-9_-]{16,12000}$/;
  var TEKSTAI = {
    neteisinga: ["Nuoroda neteisinga", "Patikrinkite, ar nukopijavote visą nuorodą iš kvietimo laiško. Jei nepavyks, paprašykite pirkimo vykdytojo atsiųsti kvietimą iš naujo.",
      "The link is incorrect. Check that you copied the whole link from the invitation email. If it still does not work, ask the buyer to send the invitation again."],
    nera: ["Nuoroda nebegalioja", "Kvietimas nebegalioja (pasiūlymų terminas seniai praėjo arba pirkimo vykdytojas jį atšaukė) arba nuoroda neteisinga. Jei manote, kad tai klaida, susisiekite su pirkimo vykdytoju.",
      "The invitation is no longer valid (the deadline passed long ago or the buyer withdrew it) or the link is incorrect. If you think this is a mistake, contact the buyer."],
    rysys: ["Nepavyko atverti kvietimo", "Nepavyko pasiekti G-Procure serverio. Patikrinkite interneto ryšį ir bandykite dar kartą po minutės.",
      "Could not reach the G-Procure server. Check your internet connection and try again in a minute."]
  };
  function idIs(hash) {
    var x = String(hash || "").replace(/^#/, "").replace(/[\s-]/g, "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
    return ID_RE.test(x) ? x : null;
  }
  function rodyk(rusis) {
    var t = TEKSTAI[rusis], h = document.getElementById("kH");
    h.textContent = t[0]; document.getElementById("kLt").textContent = t[1]; document.getElementById("kEn").textContent = t[2];
    document.getElementById("kKartoti").hidden = rusis !== "rysys";
    document.title = t[0] + " - G-Procure";
  }
  /* atverk(hash, { fetch, eik }) -> Promise<"atverta" | "neteisinga" | "nera" | "rysys"> (testams - netikri fetch ir eik) */
  function atverk(hash, o) {
    o = o || {};
    var f = o.fetch || window.fetch.bind(window), eik = o.eik || function (u) { location.replace(u); };
    var id = idIs(hash);
    if (!id) { rodyk("neteisinga"); return Promise.resolve("neteisinga"); }
    return f(API + id, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" }).then(function (r) {
      if (r.status === 404) return "nera";
      if (!r.ok) return "rysys";
      return r.json().then(function (j) {
        if (!j || typeof j.kodas !== "string" || !KODO_RE.test(j.kodas)) return "rysys";
        eik("../PP-report/pasiulymas.html#k=" + j.kodas);
        return "atverta";
      });
    }).catch(function () { return "rysys"; }).then(function (b) { if (b !== "atverta") rodyk(b); return b; });
  }
  document.getElementById("kKartoti").addEventListener("click", function () { atverk(location.hash); });
  window.GP_TRUMPA = { atverk: atverk, idIs: idIs };
  atverk(location.hash);
})();
