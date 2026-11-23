/* ============================================================================
 * G-Procure  shared/testu-aplinka.js   (window.GP_TESTU_APLINKA)
 * ----------------------------------------------------------------------------
 * Testų puslapiai - tik vietoje (saugumo auditas G-10, 2026-11-23).
 *
 * KODĖL. Testai rašo ir trina naršyklės saugyklą (localStorage), o kai kurie prieš
 * testą ją išvalo visą. Toje pačioje kilmėje kaip tikras darbas (g-procure.com)
 * nutrūkęs testų puslapis galėtų negrįžtamai ištrinti naudotojo pirkimų korteles ir
 * juodraščius (shared/testu-apsauga.js kopiją laiko tik atmintyje). Todėl nuo
 * 2026-11-23 testų puslapiai svetainėje neskelbiami (_config.yml exclude), o šis
 * failas - antra apsauga: testai vykdomi tik vietiniu adresu (localhost, 127.0.0.1,
 * [::1]). Paleidiklis .github/testai/paleisk.py (ir GitHub Actions) kiekvienam
 * paleidimui naudoja naują kilmę (laisvą prievadą) ir švarią naršyklę - ten tikrų
 * duomenų nėra.
 *
 * Kitur puslapis sustabdomas (window.stop: likusi puslapio dalis nebeskaitoma, jos
 * skriptai nevykdomi) ir rodomas paaiškinimas. Jungiamas PIRMAS testų puslapio
 * <head> skriptas - tai tikrina paleidiklis (paleisk.py) ir shared/testai.html.
 * Nieko nesaugo ir nesiunčia.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var VIETINIS = /^(localhost|127\.0\.0\.1|\[::1\])$/;
  function vietine(l) {
    try {
      l = l || global.location;
      return (l.protocol === "http:" || l.protocol === "https:") && VIETINIS.test(l.hostname);
    } catch (e) { return false; }
  }

  var ok = vietine();
  global.GP_TESTU_APLINKA = { vietine: ok, tikrink: vietine };
  if (ok) return;

  try { global.stop(); } catch (e) { /* senesnė naršyklė - turinys vis tiek pakeičiamas */ }
  var d = global.document;
  try {
    d.documentElement.innerHTML = "<head><meta charset=\"utf-8\"><title>Testai vykdomi tik vietoje</title></head><body></body>";
    var p = d.createElement("p");
    p.textContent = "Automatiniai testai vykdomi tik vietoje (python3 .github/testai/paleisk.py) ir GitHub Actions. " +
      "Šiame adrese jie nevykdomi, kad nepaliestų šioje naršyklėje išsaugotų G-Procure duomenų.";
    p.style.cssText = "font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px";
    d.body.appendChild(p);
    d.documentElement.setAttribute("data-busena", "stabdyta");
  } catch (e) { /* dokumentas jau uždarytas */ }
})(typeof window !== "undefined" ? window : this);
