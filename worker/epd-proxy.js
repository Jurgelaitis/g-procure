/* ============================================================================
 * G-Procure  epd-proxy.js   (Cloudflare Worker - viešas EPD tarpinis taškas)
 * Saugiai kviečia Anthropic API iš naršyklės, raktą laikydamas SERVERIO pusėje.
 *
 * KRITINĖ SAUGUMO SAVYBĖ: tai NE atviras DI tarpinis taškas. Worker'is PATS sukonstruoja
 * užklausą (sistema + modelis + max_tokens), o iš kliento priima TIK:
 *   { pdfBase64, factorLabel, expectedUnit, turnstileToken }
 * Tad niekas negali per šį galą leisti laisvų užklausų į DI tavo sąskaita.
 *
 * Apsaugos: Turnstile (jei sukonfigūruota), PDF dydžio riba, CORS tik iš g-procure.com.
 *
 * Cloudflare paslaptys (Secrets), kurias nustatai TU pats dashboard'e:
 *   ANTHROPIC_API_KEY   - tavo Anthropic raktas (būtinas)
 *   TURNSTILE_SECRET_KEY - Turnstile slaptasis raktas (jei tuščias, patikra praleidžiama)
 *
 * 2026-11-04 (naujo naudotojo patikra K5, D7, V8): užklausa - ta pati kaip PP-carbon/epd-extract.js (testas tikrina; iki tol kita:
 * nereikalavo reikšmės pažodžiui, rodiklio, net / gross), klaidos - su lietuviškomis raidėmis ir kodu (kodas), kurį naršyklė verčia
 * LT / EN; Anthropic klaidos objektas į naršyklę nebesiunčiamas (ten virsdavo „[object Object]“). Diegiama ranka Cloudflare skydelyje.
 * ========================================================================== */

const ALLOWED_ORIGIN = "https://g-procure.com";
const MODEL = "claude-sonnet-4-6";     // vienas keičiamas konstantas, jei modelio eilutė pasikeis
const MAX_TOKENS = 2000;
const MAX_PDF_CHARS = 9 * 1024 * 1024; // ~9 MB base64 (apie 6.5 MB PDF) riba

const SYSTEM_PROMPT = [
  "Tu esi dokumentų analizės asistentas, ištraukiantis anglies pėdsako",
  "duomenis iš EPD (Environmental Product Declaration) arba LCA dokumentų.",
  "",
  "UŽDUOTIS: rasti produkto A1-A3 (product stage / gamybos etapo) GWP",
  "reikšmę (Global Warming Potential, kg CO2e arba t CO2e).",
  "",
  "GRIEŽTOS TAISYKLĖS:",
  "1. Atsakyk TIK gryno JSON formatu, be jokio kito teksto, be markdown.",
  "2. Jei A1-A3 reikšmės dokumente NĖRA arba nesi tikras - grąžink",
  "   status \"not_found\". NIEKADA nespėk.",
  "3. Reikšmė - PAŽODŽIUI iš dokumento: nesumuok, neapvalink, neperskaičiuok",
  "   ir neversk vienetų. Laukas value - dokumente parašytas skaičius, o",
  "   valueText - jo užrašas taip, kaip dokumente (pvz. 9,96E+01).",
  "4. Jei dokumente yra tik atskiros A1, A2 ir A3 reikšmės, o bendros A1-A3",
  "   nėra, value palik null ir išrašyk jas masyve modules (kiekvieną su jos",
  "   citata). Modulių sumos neskaičiuok - ją apskaičiuos programa.",
  "5. Nurodyk rodiklį (indicator: GWP-total, GWP-GHG, GWP-fossil ir pan.;",
  "   pirmenybė - GWP-total) ir ar reikšmė net ar gross (basis: \"net\",",
  "   \"gross\", jei nenurodyta - \"\"). Jei tas pats rodiklis pateiktas ir net,",
  "   ir gross - status \"ambiguous\": du variantai candidates masyve.",
  "6. Jei dokumente pateiktas diapazonas - imk VIRŠUTINĘ (didžiausią) ribą",
  "   (konservatyvumo taisyklė).",
  "7. Jei yra keli scenarijai ar produktai - imk tą, kuris atitinka",
  "   užklausoje nurodytą produktą; jei neaišku - status \"ambiguous\" ir",
  "   išrašyk variantus candidates masyve.",
  "8. Kiekvienai reikšmei būtinai nurodyk citatą: puslapio numerį ir tikslų",
  "   teksto fragmentą iš dokumento, kuriame yra pats skaičius.",
  "9. Jei EPD nurodyta, iki kada ji galioja, - validUntil (YYYY-MM-DD).",
  "",
  "JSON schema:",
  "{",
  "  \"status\": \"found\" | \"not_found\" | \"ambiguous\",",
  "  \"value\": <skaičius arba null>,",
  "  \"valueText\": \"<skaičius, kaip parašyta dokumente>\",",
  "  \"unit\": \"<matavimo vienetas, pvz. kg CO2e>\",",
  "  \"declaredUnit\": \"<deklaruotas vienetas, pvz. 1 vnt / 1000 kg / 1 m3>\",",
  "  \"indicator\": \"<rodiklis, pvz. GWP-total>\",",
  "  \"basis\": \"net\" | \"gross\" | \"\",",
  "  \"validUntil\": \"<YYYY-MM-DD arba tuščia>\",",
  "  \"page\": <puslapio numeris arba null>,",
  "  \"quote\": \"<tikslus fragmentas iš dokumento>\",",
  "  \"standard\": \"<pvz. EN 15804+A2, jei nurodyta>\",",
  "  \"modules\": [ {\"module\":\"A1\",\"value\":...,\"valueText\":\"...\",\"page\":...,\"quote\":\"...\"} ],",
  "  \"candidates\": [ {\"label\":\"...\",\"value\":...,\"valueText\":\"...\",\"unit\":\"...\",\"declaredUnit\":\"...\",\"indicator\":\"...\",\"basis\":\"...\",\"page\":...,\"quote\":\"...\"} ],",
  "  \"notes\": \"<trumpa pastaba, jei reikia>\"",
  "}"
].join("\n");

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

    if (!env.ANTHROPIC_API_KEY) {
      return klaida("nesukonfiguruota", "Serveris nesukonfigūruotas (nėra rakto)", 500);
    }

    var anthropicBody = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
          { type: "text", text: "Produktas/įranga: " + (factorLabel || "nenurodyta") +
              ". Mūsų faktoriaus vienetas: " + expectedUnit +
              ". Rask A1-A3 GWP reikšmę ir grąžink JSON pagal schemą." }
        ]
      }]
    };

    var apiRes;
    try {
      apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(anthropicBody)
      });
    } catch (e) {
      return klaida("di_ryshys", "Nepavyko pasiekti DI serverio", 502);
    }

    var data;
    try { data = await apiRes.json(); }
    catch (e) { return klaida("di_atsakymas", "DI atsakymas ne JSON", 502); }

    // DI klaidos objekto į naršyklę nesiunčiame: naudotojui jis nieko nesako
    if (!apiRes.ok) {
      if (apiRes.status === 429 || apiRes.status === 529) return klaida("di_uzimta", "DI paslauga šiuo metu užimta", apiRes.status);
      if (apiRes.status === 400) return klaida("di_pdf", "DI paslauga šio PDF neperskaitė", 400);
      return klaida("di_klaida", "DI paslauga atsakė klaida", 502);
    }

    // Atsakymą grąžinam tokį, koks yra (klientas jį apdoros per GP_EPD_EXTRACT.parseResponse)
    return json(data, apiRes.status);
  }
};
