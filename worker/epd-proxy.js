/* ============================================================================
 * G-Procure  epd-proxy.js   (Cloudflare Worker - viešas EPD tarpinis taškas)
 * Viešo PP-carbon/epd.html PDF analizė: Turnstile ir užklausos patikra čia, DI užduotis - G-Procure serveryje.
 *
 * KRITINĖ SAUGUMO SAVYBĖ: tai NE atviras DI tarpinis taškas. Iš kliento priimama TIK:
 *   { pdfBase64, factorLabel, expectedUnit, turnstileToken }
 * ir persiunčiama į G-Procure serverio DI užduotį pp-carbon.epd (/api/uzduotis): instrukcija, modelis ir atsakymo ilgis -
 * serverio šablone, todėl per šį galą laisvų užklausų į DI leisti negalima.
 *
 * Nuo 2026-11-08 (naudotojo sprendimas „Neutralūs žingsniai“ - kodo apsauga): DI instrukcijos ir Anthropic rakto Worker'is
 * nebeturi - užklausos tekstą sudaro serveris pagal privatų šabloną (tą patį naudoja PP-carbon skaičiuoklė ir vietinis epd.html).
 * Klientas (epd.html) nepasikeitė, todėl iki šio kodo įdiegimo veikia ir ankstesnis Worker'is.
 *
 * Apsaugos: Turnstile (jei sukonfigūruota), PDF dydžio riba, CORS tik iš g-procure.com.
 *
 * Cloudflare paslaptys (Secrets), kurias nustatai TU pats dashboard'e:
 *   TURNSTILE_SECRET_KEY - Turnstile slaptasis raktas (jei tuščias, patikra praleidžiama)
 *   (ANTHROPIC_API_KEY nebereikalingas - jį galima pašalinti)
 *
 * Klaidos - su lietuviškomis raidėmis ir kodu (kodas), kurį naršyklė verčia LT / EN; serverio ar DI klaidos objektas į naršyklę
 * nesiunčiamas. Diegiama ranka Cloudflare skydelyje.
 * ========================================================================== */

const ALLOWED_ORIGIN = "https://g-procure.com";
const SERVERIS = "https://api.g-procure.com/api/uzduotis";   // G-Procure serverio DI užduotys
const UZDUOTIS = "pp-carbon.epd";
const MAX_PDF_CHARS = 9 * 1024 * 1024; // ~9 MB base64 (apie 6.5 MB PDF) riba - kaip serverio šablone

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders())
  });
}

// Klaida naršyklei: kodas - sutartinis (epd.html jį verčia LT / EN), error - lietuviškas tekstas tiems, kas skaito tiesiogiai
function klaida(kodas, tekstas, status) { return json({ error: tekstas, kodas: kodas }, status); }

async function verifyTurnstile(token, secret, ip) {
  try {
    var form = new FormData();
    form.append("secret", secret);
    form.append("response", token || "");
    if (ip) form.append("remoteip", ip);
    var r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form });
    var data = await r.json();
    return !!(data && data.success);
  } catch (e) { return false; }
}

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return klaida("metodas", "Leidžiamas tik POST", 405);
    }

    // Šaltinio patikra: naršyklė kryžminei POST užklausai Origin siunčia visada, todėl be jos (curl, skriptai) - atmetama
    // (2026-10-06, saugumo planas; iki tol užklausa be Origin praeidavo). Origin suklastoti galima - tikra apsauga yra Turnstile.
    var origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) {
      return klaida("saltinis", "Neleistinas šaltinis", 403);
    }

    var body;
    try { body = await request.json(); }
    catch (e) { return klaida("uzklausa", "Netinkama užklausa", 400); }

    // Turnstile patikra (jei sukonfigūruota)
    if (env.TURNSTILE_SECRET_KEY) {
      var ip = request.headers.get("CF-Connecting-IP");
      var human = await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
      if (!human) return klaida("patikra", "Nepavyko patvirtinti, kad esate žmogus", 403);
    }

    var pdf = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
    if (!pdf) return klaida("be_pdf", "Trūksta PDF", 400);
    if (pdf.length > MAX_PDF_CHARS) return klaida("dydis", "PDF per didelis", 413);

    var factorLabel = String(body.factorLabel || "").slice(0, 300);
    var expectedUnit = String(body.expectedUnit || "").slice(0, 60);

    // Serveris sudaro DI užklausą pagal savo šabloną; Worker'is siunčia tik duomenis ir PDF (Origin - G-Procure, kaip naršyklė)
    var duomenys = {};
    if (factorLabel) duomenys.produktas = factorLabel;
    if (expectedUnit) duomenys.vienetas = expectedUnit;
    var apiRes;
    try {
      apiRes = await fetch(SERVERIS, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": ALLOWED_ORIGIN },
        body: JSON.stringify({ uzduotis: UZDUOTIS, duomenys: duomenys, dokumentas: { tipas: "application/pdf", duomenys: pdf } })
      });
    } catch (e) {
      return klaida("di_ryshys", "Nepavyko pasiekti DI serverio", 502);
    }

    var data;
    try { data = await apiRes.json(); }
    catch (e) { return klaida("di_atsakymas", "DI atsakymas ne JSON", 502); }

    // Serverio ar DI klaidos objekto į naršyklę nesiunčiame: naudotojui jis nieko nesako
    if (!apiRes.ok) {
      if (apiRes.status === 429 || apiRes.status === 529) return klaida("di_uzimta", "DI paslauga šiuo metu užimta", 429);
      if (apiRes.status === 413) return klaida("dydis", "PDF per didelis", 413);
      if (apiRes.status === 400) return klaida("di_pdf", "DI paslauga šio PDF neperskaitė", 400);
      return klaida("di_klaida", "DI paslauga atsakė klaida", 502);
    }

    // Atsakymą grąžinam tokį, koks yra (klientas jį apdoros per GP_EPD_EXTRACT.parseResponse)
    return json(data, apiRes.status);
  }
};
