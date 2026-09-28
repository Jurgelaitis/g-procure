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
 *  - Jei tik vienas skyriklio tipas ir jis kartojasi - tukstanciai (1,500,000;
 *    1.500.000). Jei vienas: tukstanciai TIK kai po jo 3 skaitmenys, o pries ji
 *    1-3 skaitmenys (ne "0") - "14.900", "1,500", "150.000" (tokia tukstanciu
 *    grupe); kitaip decimalinis: 12,5; 1234.56; 0,125; 12396.686; 1234,5678.
 *  - Nevienareiksmis atvejis "1.500" / "1,500" (vienas skyriklis + 3 skaitmenys)
 *    traktuojamas kaip TUKSTANCIAI (1500), nes pirkimu sumos buna sveiki eurai,
 *    ne 3 skaiciu po kablelio tikslumas. Tai samoningas pasirinkimas.
 *  - Tarpai ir apostrofai skaiciuje - tukstanciu skyrikliai (1 500 000; 1'500'000);
 *    skyriklis, po kurio dar yra tarpu atskirta grupe ("1.500 000"), - irgi.
 *  - Tekste pinigams imamas PIRMAS skaicius ("EUR 1 500", "1 500 Eur."), skyriklis
 *    gale nesiskaito ("12,50 Eur/vnt." - taskas is santrumpos). parseSkaicius skaito
 *    tik lauka, kuris skaiciumi PRASIDEDA: "Kabelis 110 kV", "zr. 2 priedą",
 *    "kg CO2e 12,5" - ne skaiciai (kaip parseFloat). Iki 2026-09-28 visi skaitmenys
 *    buvo suklijuojami: "1 234,56 Eur." -> 123456, "12 500 (15 125 su PVM)" -> 1250015125.
 * ========================================================================== */
;(function (global) {
  "use strict";

  // Skaiciaus tekstas -> { s: be tarpu, grupes: po paskutinio skyriklio dar tarpu atskirta grupe } arba null.
  // Pinigams - pirmas skaicius tekste (skyriklis priekyje - tik teksto pradzioje: ",50"); arSkaicius (kiekiai,
  // koeficientai) - tik jei tekstas skaiciumi PRASIDEDA, su zenklu (-, minusas, bruksnys) ir rodykle (4,52E+02).
  var TARPAS = /[\s\u00a0\u202f]/g;
  function skaiciausTekstas(input, arSkaicius) {
    var t = String(input).replace(/(\d)['\u2019](?=\d)/g, "$1").replace(/[\u2212\u2013]/g, "-");
    var m = arSkaicius ? t.match(/^[\s\u00a0\u202f]*([+-]?[\s\u00a0\u202f]*(?:[.,](?=\d)|\d)[\d.,\s\u00a0\u202f]*(?:[eE][+-]?\d+)?)/)
                       : t.match(/(?:^[\s\u00a0\u202f]*[.,](?=\d)|\d)[\d.,\s\u00a0\u202f]*/);
    if (!m) return null;
    var tok = (m[1] || m[0]).replace(/[.,\s\u00a0\u202f]+$/, "");
    var p = Math.max(tok.lastIndexOf("."), tok.lastIndexOf(","));
    return { s: tok.replace(TARPAS, ""), grupes: p >= 0 && /[\s\u00a0\u202f]/.test(tok.slice(p)) };
  }

  // Vienas skyriklis - tukstanciu, jei po jo 3 skaitmenys, o pries ji 1-3 skaitmenys (ne "0") arba po jo dar tarpu atskirta grupe.
  function tukstanciai(s, i, grupes) {
    var pries = s.slice(0, i);
    return grupes || (s.length - i - 1 === 3 && pries.length >= 1 && pries.length <= 3 && pries !== "0");
  }

  // Pinigu tekstas -> Number arba null (jei neiskaitoma).
  function parseEUR(input) {
    if (input == null) return null;
    var r = skaiciausTekstas(input, false);           // tik skaitmenys, . ir , (zenklas - kvieteju reikalas)
    var s = r && r.s;
    if (!s) return null;

    var lastDot = s.lastIndexOf(".");
    var lastComma = s.lastIndexOf(",");
    var dec = null;                                   // decimalinio skyriklio simbolis

    if (lastDot !== -1 && lastComma !== -1) {
      dec = lastDot > lastComma ? "." : ",";          // paskutinis - decimalinis
    } else if (lastComma !== -1) {
      if (s.indexOf(",") === lastComma && !tukstanciai(s, lastComma, r.grupes)) dec = ",";
    } else if (lastDot !== -1) {
      if (s.indexOf(".") === lastDot && !tukstanciai(s, lastDot, r.grupes)) dec = ".";
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
  // (0,125 lieka 0,125 - kiekiai būna su trimis skaitmenimis po kablelio), neigiami leidžiami (ir „−“). Laukas turi skaičiumi
  // PRASIDĖTI („2,5 val.“ - 2,5; „Kabelis 110 kV“, „žr. 2 priedą“ - null): PP-negotiation PDF eilutės ir tekstiniai langeliai
  // kitaip taptų pozicijomis. Grąžina Number arba null.
  // Iki 2026-09-28 PP-carbon ir PP-negotiation turėjo savus parserius, kurie „1.500.000“ skaitė kaip 1,5.
  function parseSkaicius(input) {
    if (input == null) return null;
    if (typeof input === "number") return isFinite(input) ? input : null;
    var r = skaiciausTekstas(input, true);
    var s = r && r.s;
    if (!s) return null;
    var t = s.lastIndexOf("."), k = s.lastIndexOf(",");
    if (t !== -1 && k !== -1) s = t > k ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
    else if (k !== -1) s = s.indexOf(",") === k && !r.grupes ? s.replace(",", ".") : s.replace(/,/g, "");
    else if (t !== -1 && (s.indexOf(".") !== t || r.grupes)) s = s.replace(/\./g, "");
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  global.GP_MONEY = { parseEUR: parseEUR, formatEUR: formatEUR, parseSkaicius: parseSkaicius };
})(typeof window !== "undefined" ? window : this);
