/* ============================================================================
 * G-Procure  epd-proxy.js   (Cloudflare Worker - viesas EPD proxy)
 * Saugiai kvieciia Anthropic API is narsykles, rakta laikydamas SERVERIO puseje.
 *
 * KRITINE SAUGUMO SAVYBE: tai NE atviras AI proxy. Worker'is PATS sukonstruoja
 * uzklausa (sistema + modelis + max_tokens), o is kliento priima TIK:
 *   { pdfBase64, factorLabel, expectedUnit, turnstileToken }
 * Tad niekas negali per si gala leisti laisvu uzklausu i AI tavo saskaita.
 *
 * Apsaugos: Turnstile (jei sukonfiguruota), PDF dydzio riba, CORS tik is g-procure.com.
 *
 * Cloudflare paslaptys (Secrets), kurias nustatai TU pats dashboard'e:
 *   ANTHROPIC_API_KEY   - tavo Anthropic raktas (butinas)
 *   TURNSTILE_SECRET_KEY - Turnstile slaptasis raktas (jei tuscias, patikra praleidziama)
 * ========================================================================== */

const ALLOWED_ORIGIN = "https://g-procure.com";
const MODEL = "claude-sonnet-4-6";     // vienas keiciamas konstantas, jei modelio eilute pasikeis
const MAX_TOKENS = 1500;
const MAX_PDF_CHARS = 9 * 1024 * 1024; // ~9 MB base64 (apie 6.5 MB PDF) riba

const SYSTEM_PROMPT = [
  "Tu esi dokumentu analizes asistentas, istraukiantis anglies pedsako",
  "duomenis is EPD (Environmental Product Declaration) arba LCA dokumentu.",
  "",
  "UZDUOTIS: rasti produkto A1-A3 (product stage) GWP reiksme (kg CO2e arba t CO2e).",
  "",
  "GRIEZTOS TAISYKLES:",
  "1. Atsakyk TIK gryno JSON formatu, be jokio kito teksto, be markdown.",
  "2. Jei A1-A3 nera arba nesi tikras - grazink status \"not_found\". NIEKADA nespek.",
  "3. Jei diapazonas - imk VIRSUTINE (konservatyvumo taisykle).",
  "4. Jei keli variantai/neaisku - status \"ambiguous\" ir candidates masyvas.",
  "5. Butinai nurodyk citata: puslapio numeri ir tiksly fragmenta.",
  "",
  "JSON schema:",
  "{",
  "  \"status\": \"found\" | \"not_found\" | \"ambiguous\",",
  "  \"value\": <skaicius arba null>,",
  "  \"unit\": \"<pvz. kg CO2e>\",",
  "  \"declaredUnit\": \"<pvz. 1 vnt / 1 kg / 1 m3>\",",
  "  \"page\": <numeris arba null>,",
  "  \"quote\": \"<fragmentas>\",",
  "  \"standard\": \"<pvz. EN 15804+A2>\",",
  "  \"candidates\": [ {\"label\":\"...\",\"value\":...,\"unit\":\"...\"} ],",
  "  \"notes\": \"<pastaba>\"",
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
      return json({ error: "Leidziamas tik POST" }, 405);
    }

    // Saltinio patikra (narsykles atveju Origin visada bus)
    var origin = request.headers.get("Origin") || "";
    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Neleistinas saltinis" }, 403);
    }

    var body;
    try { body = await request.json(); }
    catch (e) { return json({ error: "Netinkamas JSON" }, 400); }

    // Turnstile patikra (jei sukonfiguruota)
    if (env.TURNSTILE_SECRET_KEY) {
      var ip = request.headers.get("CF-Connecting-IP");
      var human = await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
      if (!human) return json({ error: "Nepavyko patvirtinti, kad esate zmogus" }, 403);
    }

    var pdf = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
    if (!pdf) return json({ error: "Truksta PDF" }, 400);
    if (pdf.length > MAX_PDF_CHARS) return json({ error: "PDF per didelis" }, 413);

    var factorLabel = String(body.factorLabel || "").slice(0, 300);
    var expectedUnit = String(body.expectedUnit || "").slice(0, 60);

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Serveris nesukonfiguruotas (nera rakto)" }, 500);
    }

    var anthropicBody = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
          { type: "text", text: "Produktas/iranga: " + factorLabel +
              ". Musu faktoriaus vienetas: " + expectedUnit +
              ". Rask A1-A3 GWP reiksme ir grazink JSON pagal schema." }
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
      return json({ error: "Nepavyko pasiekti AI serverio" }, 502);
    }

    var data;
    try { data = await apiRes.json(); }
    catch (e) { return json({ error: "AI atsakymas ne JSON" }, 502); }

    // Grazinam Anthropic atsakyma toki, koki yra (klientas ji apdoros per GP_EPD_EXTRACT.parseResponse)
    return json(data, apiRes.status);
  }
};
