/* ============================================================================
 * G-Procure  tiekejams-proxy.js   (Cloudflare Worker - viešas DI tarpinis taškas tiekėjams)
 * ----------------------------------------------------------------------------
 * Atsarginis viešos sekcijos „G-Procure Tiekėjams“ kelias su Turnstile: Worker'is patikrina, kad užklausa iš g-procure.com
 * ir kad ją siunčia žmogus (Turnstile), o tada persiunčia DI užduotį į G-Procure serverį (/api/uzduotis). Iš kliento priima TIK:
 *   { uzduotis: "pp-tiekejams.atsakymas" | "pp-tiekejams.kontrolinis", duomenys: { kalba, organizacija, rezimas, patvirtinta, uzklausa },
 *     turnstileToken }
 * Instrukcija, modelis ir atsakymo ilgis - serverio šablone, todėl per šį galą laisvų užklausų į DI leisti negalima.
 *
 * Nuo 2026-11-08 (naudotojo sprendimas „Neutralūs žingsniai“ - kodo apsauga): DI instrukcijų ir Anthropic rakto Worker'is nebeturi
 * (iki tol čia buvo kanoninė sistemos instrukcijos kopija). Klientas (PP-tiekejams/index.html) šį kelią naudoja tik nustačius
 * AI_ENDPOINT ir TURNSTILE_SITE_KEY; kol jie tušti - DI užduotis siunčiama tiesiai į G-Procure serverį (shared/ai-proxy.js).
 *
 * Apsaugos: Origin tik https://g-procure.com, Turnstile PRIVALOMAS, tik žinomos užduotys, užklausos dydžio riba; turinys
 * nesaugomas ir nežurnalizuojamas.
 *
 * Cloudflare paslaptys (Secrets), nustatomos dashboard'e:
 *   TURNSTILE_SECRET_KEY - būtinas (be jo Worker'is atsako 500)
 *
 * DIEGIMAS (rankinis, kaip epd-proxy.js): Workers & Pages > Create > paste šio failo turinį > Deploy; Custom domain, pvz.
 * tiekejams-api.g-procure.com; Variables > Secrets: TURNSTILE_SECRET_KEY. Papildomai - Cloudflare Rate Limiting taisyklė šio
 * Worker'io domenui (pvz. 20 užklausų / 10 min per IP).
 * ========================================================================== */

const ALLOWED_ORIGIN = "https://g-procure.com";
const SERVERIS = "https://api.g-procure.com/api/uzduotis";   // G-Procure serverio DI užduotys
const UZDUOTYS = ["pp-tiekejams.atsakymas", "pp-tiekejams.kontrolinis"];
const MAX_KUNAS = 300000;   // užklausos JSON ženklų (fragmentai ir klausimas; serverio šablonas uzklausa riboja 200 000)

function corsHeaders() {
  return { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status, headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders()) });
}
async function verifyTurnstile(token, secret, ip) {
  try {
    var form = new FormData(); form.append("secret", secret); form.append("response", token || ""); if (ip) form.append("remoteip", ip);
    var r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    var data = await r.json(); return !!(data && data.success);
  } catch (e) { return false; }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
    if (request.method !== "POST") return json({ error: "Leidžiamas tik POST" }, 405);
    // Be Origin (ne naršyklė) - atmetama (2026-10-06, saugumo planas); Origin suklastoti galima - todėl ir Turnstile
    var origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) return json({ error: "Neleistinas šaltinis" }, 403);
    var tekstas = await request.text();
    if (tekstas.length > MAX_KUNAS) return json({ error: "Užklausa per didelė" }, 413);
    var body; try { body = JSON.parse(tekstas); } catch (e) { return json({ error: "Netinkamas JSON" }, 400); }
    // Turnstile PRIVALOMAS: be jo tai būtų atviras DI galinis taškas (Origin antraštė curl'u suklastojama)
    if (!env.TURNSTILE_SECRET_KEY) return json({ error: "Serveris nesukonfigūruotas (nėra Turnstile rakto)" }, 500);
    var human = await verifyTurnstile(body && body.turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"));
    if (!human) return json({ error: "Nepavyko patvirtinti, kad esate žmogus" }, 403);
    if (!body || UZDUOTYS.indexOf(body.uzduotis) < 0 || !body.duomenys || typeof body.duomenys !== "object") return json({ error: "Netinkama užklausa" }, 400);

    // Serveris tikrina duomenis pagal šabloną ir sudaro DI užklausą; Worker'is siunčia tik užduotį ir duomenis (Origin - G-Procure, kaip naršyklė)
    var apiRes;
    try {
      apiRes = await fetch(SERVERIS, { method: "POST", headers: { "Content-Type": "application/json", "Origin": ALLOWED_ORIGIN },
        body: JSON.stringify({ uzduotis: body.uzduotis, duomenys: body.duomenys }) });
    } catch (e) { return json({ error: "Nepavyko pasiekti DI serverio" }, 502); }
    var data; try { data = await apiRes.json(); } catch (e) { return json({ error: "DI atsakymas ne JSON" }, 502); }
    if (!apiRes.ok) return json({ error: (data && typeof data.error === "string" && data.error.slice(0, 200)) || "DI paslauga atsakė klaida" }, apiRes.status >= 500 ? 502 : apiRes.status);
    return json(data, apiRes.status);
  }
};
