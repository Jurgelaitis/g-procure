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
 *  - Jei tik vienas skyriklio tipas: jis decimalinis, kai vienas ir po jo NE 3
 *    skaitmenys (12,5; 1234.56; 1234,5678 - su 4+ skaitmenimis tukstanciu grupe
 *    negalima); kitaip - tukstanciu skyriklis (1,500,000; 1.500.000; 743.490).
 *  - Nevienareiksmis atvejis "1.500" / "1,500" (vienas skyriklis + 3 skaitmenys)
 *    traktuojamas kaip TUKSTANCIAI (1500), nes pirkimu sumos buna sveiki eurai,
 *    ne 3 skaiciu po kablelio tikslumas. Tai samoningas pasirinkimas.
 *  - Tekste imamas PIRMAS skaicius (tarpai - tukstanciu skyrikliai, todel
 *    pasalinami); skyriklis gale nesiskaito ("2,5 val.", "12,50 Eur/vnt." -
 *    taskas is santrumpos). Iki 2026-09-28 visi skaitmenys ir skyrikliai buvo
 *    suklijuojami: "1 234,56 Eur." -> 123456, "12 500 (15 125 su PVM)" -> 1250015125.
 * ========================================================================== */
;(function (global) {
  "use strict";

  // Pirmas skaicius tekste be tarpu. Skyriklis priekyje - tik teksto pradzioje (",50"), gale - atmetamas.
  // suZenklu: minusas ir rodykle (4,52E+02 - EPD lentelese) - ne pinigams.
  function skaiciausTekstas(input, suZenklu) {
    var s = String(input).replace(/[\s\u00a0\u202f]/g, "");
    var m = s.match(suZenklu ? /^-?[.,]\d[\d.,]*(?:[eE][+-]?\d+)?|-?\d[\d.,]*(?:[eE][+-]?\d+)?/ : /^[.,]\d[\d.,]*|\d[\d.,]*/);
    return m ? m[0].replace(/[.,]+$/, "") : "";
  }

  // Pinigu tekstas -> Number arba null (jei neiskaitoma).
  function parseEUR(input) {
    if (input == null) return null;
    var s = skaiciausTekstas(input, false);           // tik skaitmenys, . ir , (zenklas - kvieteju reikalas)
    if (!s) return null;

    var lastDot = s.lastIndexOf(".");
    var lastComma = s.lastIndexOf(",");
    var dec = null;                                   // decimalinio skyriklio simbolis

    if (lastDot !== -1 && lastComma !== -1) {
      dec = lastDot > lastComma ? "." : ",";          // paskutinis - decimalinis
    } else if (lastComma !== -1) {
      var afterC = s.length - lastComma - 1;
      if (s.indexOf(",") === lastComma && afterC !== 3) dec = ",";
    } else if (lastDot !== -1) {
      var afterD = s.length - lastDot - 1;
      if (s.indexOf(".") === lastDot && afterD !== 3) dec = ".";
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

  // Skaičius, kuris NE pinigai (kiekis, faktorius, trukmė, anglis): priimami ir LT, ir EN formatai. Kaip parseEUR - jei yra abu
  // skyrikliai, dešinysis dešimtainis; tas pats skyriklis kartojasi - tūkstančių. Skirtumas: VIENAS skyriklis visada dešimtainis
  // (0,125 lieka 0,125 - kiekiai būna su trimis skaitmenimis po kablelio), neigiami leidžiami. Grąžina Number arba null.
  // Iki 2026-09-28 PP-carbon ir PP-negotiation turėjo savus parserius, kurie „1.500.000“ skaitė kaip 1,5.
  function parseSkaicius(input) {
    if (input == null) return null;
    if (typeof input === "number") return isFinite(input) ? input : null;
    var s = skaiciausTekstas(input, true);
    if (!s) return null;
    var t = s.lastIndexOf("."), k = s.lastIndexOf(",");
    if (t !== -1 && k !== -1) s = t > k ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
    else if (k !== -1) s = s.indexOf(",") === k ? s.replace(",", ".") : s.replace(/,/g, "");
    else if (t !== -1 && s.indexOf(".") !== t) s = s.replace(/\./g, "");
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  global.GP_MONEY = { parseEUR: parseEUR, formatEUR: formatEUR, parseSkaicius: parseSkaicius };
})(typeof window !== "undefined" ? window : this);
