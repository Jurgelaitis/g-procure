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
  /* ID iš adreso dalies po „#“: tarpai ir brūkšneliai nepaisomi, skyrybos ženklai gale (nukopijuota su tašku ar skliaustu) - irgi */
  function idIs(hash) {
    var x = String(hash || "").replace(/^#/, "").replace(/[\s-]/g, "").replace(/[.,;:!?)\]}>'"»“”]+$/, "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
    return ID_RE.test(x) ? x : null;
  }
  /* Įklijuotas tekstas: trumpa nuoroda (ir per „Safe Links“ - koduota), vien ID arba ilga nuoroda su kvietimo kodu */
  function isTeksto(t) {
    t = String(t || "");
    var m = /g-procure\.com(?:\/|%(?:25)?2F)k(?:\/|%(?:25)?2F)?(?:#|%(?:25)?23)([0-9A-Za-z-]{10,14})/i.exec(t);
    if (m) { var id = idIs(m[1]); if (id) return { id: id }; }
    var k = /[#&]k=(g[01]\.[A-Za-z0-9_-]{16,})/.exec(t.replace(/%23/gi, "#").replace(/%3D/gi, "="));
    if (k) return { kodas: k[1] };
    var x = idIs(t.trim());
    return x ? { id: x } : null;
  }
  function rodyk(rusis) {
    var t = TEKSTAI[rusis], h = document.getElementById("kH");
    h.textContent = t[0]; document.getElementById("kLt").textContent = t[1]; document.getElementById("kEn").textContent = t[2];
    document.getElementById("kKartoti").hidden = rusis !== "rysys";
    document.getElementById("kForma").hidden = rusis === "rysys";
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
  document.getElementById("kForma").addEventListener("submit", function (e) {
    e.preventDefault();
    var r = isTeksto(document.getElementById("kNuoroda").value), kl = document.getElementById("kFormaKl");
    if (!r) { kl.textContent = "Nuoroda neatpažinta - nukopijuokite visą nuorodą iš laiško. / The link was not recognised - copy the whole link from the email."; return; }
    kl.textContent = "";
    if (r.kodas) { location.replace("../PP-report/pasiulymas.html#k=" + r.kodas); return; }
    try { history.replaceState(null, "", "#" + r.id); } catch (x) { /* nebūtina */ }
    atverk("#" + r.id);
  });
  window.GP_TRUMPA = { atverk: atverk, idIs: idIs, isTeksto: isTeksto };
  atverk(location.hash);
})();
