/* ============================================================================
 * G-Procure  shared/money.js   (window.GP_MONEY)
 * ----------------------------------------------------------------------------
 * VIENAS teisingas pinigu sumos parseris ir formuotojas visiems moduliams.
 * CLAUDE.md 5 sk. pinigu konvencija: numatytai EUR be PVM; importuojant priimam
 * ir JAV, ir EU formatus (14,900.00 IR 14.900,00).
 *
 * Kodel shared/: iki 2026-07-18 ta pati logika buvo dubliuota DVIEJOSE vietose
 * su PRIESINGOMIS klaidomis - PP-SALYGOS.html verteEUR() luzo ties JAV formatu
 * (1,500,000 -> 1.5), o paraiska-extract.js verteIsTeksto() luzo ties EU
 * tukstanciais be centu (1.500.000 -> 1.5). Sujungus i viena, taisoma kartu.
 *
 * PARSINIMO taisykle (US/EU maisyma sprendziam pagal SKYRIKLIU pozicija):
 *  - Jei yra IR taskas, IR kablelis: decimalinis tas, kuris paskutinis
 *    (14,900.00 -> taskas decimalinis; 743.490,00 -> kablelis decimalinis).
 *  - Jei tik vienas skyriklio tipas: jis decimalinis TIK kai vienas ir po jo
 *    1-2 skaitmenys (12,5 arba 1234.56); kitaip - tukstanciu skyriklis
 *    (1,500,000; 1.500.000; 743.490).
 *  - Nevienareiksmis atvejis "1.500" / "1,500" (vienas skyriklis + 3 skaitmenys)
 *    traktuojamas kaip TUKSTANCIAI (1500), nes pirkimu sumos buna sveiki eurai,
 *    ne 3 skaiciu po kablelio tikslumas. Tai samoningas pasirinkimas.
 * ========================================================================== */
;(function (global) {
  "use strict";

  // Pinigu tekstas -> Number arba null (jei neiskaitoma).
  function parseEUR(input) {
    if (input == null) return null;
    var s = String(input).replace(/[^\d.,]/g, "");   // paliekam tik skaitmenis, . ,
    if (!s) return null;                              // (tarpai - visada tukstanciu skyrikliai)

    var lastDot = s.lastIndexOf(".");
    var lastComma = s.lastIndexOf(",");
    var dec = null;                                   // decimalinio skyriklio simbolis

    if (lastDot !== -1 && lastComma !== -1) {
      dec = lastDot > lastComma ? "." : ",";          // paskutinis - decimalinis
    } else if (lastComma !== -1) {
      var afterC = s.length - lastComma - 1;
      if (s.indexOf(",") === lastComma && afterC >= 1 && afterC <= 2) dec = ",";
    } else if (lastDot !== -1) {
      var afterD = s.length - lastDot - 1;
      if (s.indexOf(".") === lastDot && afterD >= 1 && afterD <= 2) dec = ".";
    }

    var norm;
    if (dec === ".") norm = s.replace(/,/g, "");                  // kableliai - tukstanciai
    else if (dec === ",") norm = s.replace(/\./g, "").replace(",", ".");  // taskai - tukstanciai, kablelis - decimalinis
    else norm = s.replace(/[.,]/g, "");                           // decimaliniu nera - abu tukstanciai

    var n = parseFloat(norm);
    return isFinite(n) ? n : null;
  }

  // Number -> "743 490" arba "743 490,50" (lt-LT, tarpai kaip tukstanciu skyriklis,
  // kablelis centams). Grazina null netinkamai reiksmei. <= 0 laiko netinkama:
  // pirkimo verte visada teigiama.
  function formatEUR(n) {
    if (!isFinite(n) || n <= 0) return null;
    var sveika = Math.floor(n);
    var cnt = Math.round((n - sveika) * 100);
    if (cnt === 100) { sveika += 1; cnt = 0; }        // 999,999 -> 1 000 000, ne ",100"
    var txt = sveika.toLocaleString("lt-LT").replace(/\s/g, " ");   // NBSP/narrow -> paprastas tarpas
    return cnt ? txt + "," + String(cnt).padStart(2, "0") : txt;
  }

  global.GP_MONEY = { parseEUR: parseEUR, formatEUR: formatEUR };
})(typeof window !== "undefined" ? window : this);
