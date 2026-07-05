/* ============================================================================
 * G-Procure  pp-carbon/epd-extract.js   (v0.1 - Faze 3 branduolys)
 * EPD/LCA dokumentu A1-A3 reiksmiu istraukimo logika su AI pagalba.
 *
 * ATSAKOMYBIU PADALIJIMAS:
 *  - Sis failas: uzklausos AI konstravimas, AI atsakymo parsinimas ir
 *    VALIDACIJA, vienetu suderinamumo tikrinimas, dvigubas rezimas.
 *  - UI (index.html): PDF ikelimas, base64 kodavimas, AI atsakymo rodymas
 *    vartotojui PATVIRTINTI. AI niekada neuzpildo faktoriaus pats - tik
 *    pasiulo; galutinis sprendimas ZMOGAUS (spaudzia "Patvirtinti").
 *
 * TRANSPORTAS:
 *  - Transportas iskeltas i shared/ai-proxy.js (GP_AI_PROXY). Sis modulis
 *    tik konstruoja prompta (systemPrompt / userText) ir parsina atsakyma.
 *    Raktas gyvena TIK serverio puseje - jokio narsykles rakto cia.
 *
 * SAUGIKLIAI:
 *  - AI atsakymas grieztai JSON; parseResponse() atmeta viska, kas neatitinka
 *    schemos (status: "found" | "not_found").
 *  - "not_found" yra teisetas atsakymas - joks spejimas nepriimamas.
 *  - Kiekviena rasta reiksme privalo tureti citata (puslapis + fragmentas),
 *    kad zmogus galetu patikrinti pries tvirtindamas.
 *  - Vienetu tikrinimas: checkUnitCompatibility() lygina EPD deklaruota
 *    vieneta su musu faktoriaus vienetu; nesutampa -> ispejimas, ne tylus
 *    priemimas.
 *  - Konservatyvumo taisykle: jei EPD pateikia diapazona, imama VIRSUTINE riba.
 *
 * Naudojimas:  <script src="epd-extract.js"></script> -> window.GP_EPD_EXTRACT
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.1";

  // Modelis AI iskvietimui (pigus ir pakankamas dokumentu istraukimui)
  var MODEL = "claude-sonnet-4-6";
  var MAX_TOKENS = 1500;

  // --- 1. UZKLAUSOS KONSTRAVIMAS -------------------------------------------

  // Sisteminis promptas: grieztas JSON, jokiu spejimu, citatos privalomos.
  function systemPrompt() {
    return [
      "Tu esi dokumentu analizes asistentas, istraukiantis anglies pedsako",
      "duomenis is EPD (Environmental Product Declaration) arba LCA dokumentu.",
      "",
      "UZDUOTIS: rasti produkto A1-A3 (product stage / gamybos etapo) GWP",
      "reiksme (Global Warming Potential, kg CO2e arba t CO2e).",
      "",
      "GRIEZTOS TAISYKLES:",
      "1. Atsakyk TIK gryno JSON formatu, be jokio kito teksto, be markdown.",
      "2. Jei A1-A3 reiksmes dokumente NERA arba nesi tikras - grazink",
      "   status \"not_found\". NIEKADA nespek ir neskaiciuok pats.",
      "3. Jei dokumente pateiktas diapazonas - imk VIRSUTINE (didziausia)",
      "   riba (konservatyvumo taisykle).",
      "4. Jei yra keli scenarijai/produktai - imk ta, kuris atitinka",
      "   uzklausoje nurodyta produkta; jei neaisku - status \"ambiguous\"",
      "   ir israsyk variantus candidates masyve.",
      "5. Butinai nurodyk citata: puslapio numeri ir tikslų teksto fragmenta,",
      "   is kurio paimta reiksme.",
      "",
      "JSON schema:",
      "{",
      "  \"status\": \"found\" | \"not_found\" | \"ambiguous\",",
      "  \"value\": <skaicius arba null>,",
      "  \"unit\": \"<matavimo vienetas, pvz. kg CO2e>\",",
      "  \"declaredUnit\": \"<deklaruotas vienetas, pvz. 1 vnt / 1 kg / 1 m3>\",",
      "  \"page\": <puslapio numeris arba null>,",
      "  \"quote\": \"<tikslus fragmentas is dokumento>\",",
      "  \"standard\": \"<pvz. EN 15804+A2, jei nurodyta>\",",
      "  \"candidates\": [ {\"label\":\"...\",\"value\":...,\"unit\":\"...\"} ],",
      "  \"notes\": \"<trumpa pastaba, jei reikia>\"",
      "}"
    ].join("\n");
  }

  // Vartotojo zinutes TEKSTO dalis (be PDF). Promptas apibreztas cia vienoje vietoje.
  // factorLabel - kurio faktoriaus EPD ieskome (pvz. "Jungtuvai 110-400 kV").
  // expectedUnit - musu faktoriaus vienetas (pvz. "kg CO2e/vnt").
  function userText(factorLabel, expectedUnit) {
    return "Produktas/iranga: " + factorLabel +
           ". Musu faktoriaus vienetas: " + expectedUnit +
           ". Rask A1-A3 GWP reiksme ir grazink JSON pagal schema.";
  }

  // Vartotojo zinute su PDF priedu (document + text). Teksta ima is userText().
  // pdfBase64 - base64 uzkoduotas PDF (be data: prefikso).
  function userMessage(pdfBase64, factorLabel, expectedUnit) {
    return {
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }
        },
        {
          type: "text",
          text: userText(factorLabel, expectedUnit)
        }
      ]
    };
  }

  // Pastaba: transportas (fetch) iskeltas i shared/ai-proxy.js (GP_AI_PROXY).
  // Sis modulis tik konstruoja prompta ir parsina atsakyma; PDF siunciamas
  // per GP_AI_PROXY.call({ pdfBase64, system, userMessage, maxTokens }).

  // --- 2. ATSAKYMO PARSINIMAS IR VALIDACIJA --------------------------------

  // Isima teksta is Anthropic atsakymo (content masyvas gali tureti kelis blokus).
  function extractText(apiResponse) {
    if (!apiResponse || !Array.isArray(apiResponse.content)) return "";
    return apiResponse.content
      .map(function (b) { return b && b.type === "text" ? b.text : ""; })
      .filter(Boolean)
      .join("\n");
  }

  // Nuvalo galimus markdown apvalkalus (```json ... ```) ir parsina JSON.
  function parseJsonLoose(text) {
    if (typeof text !== "string") return null;
    var clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    // Papildomas saugiklis: iskerpam nuo pirmo { iki paskutinio }
    var a = clean.indexOf("{");
    var b = clean.lastIndexOf("}");
    if (a === -1 || b === -1 || b <= a) return null;
    try {
      return JSON.parse(clean.slice(a, b + 1));
    } catch (e) {
      return null;
    }
  }

  // Pilna validacija: grazina normalizuota objekta arba {status:"error"}.
  // NIEKO nepriima be citatos, kai status "found".
  function parseResponse(apiResponse) {
    var text = extractText(apiResponse);
    var data = parseJsonLoose(text);

    if (!data || typeof data !== "object") {
      return { status: "error", error: "AI atsakymas ne JSON formato", raw: text };
    }

    var st = data.status;
    if (st !== "found" && st !== "not_found" && st !== "ambiguous") {
      return { status: "error", error: "Nezinomas status: " + st, raw: text };
    }

    if (st === "not_found") {
      return { status: "not_found", notes: str(data.notes) };
    }

    if (st === "ambiguous") {
      var cands = Array.isArray(data.candidates) ? data.candidates.filter(function (c) {
        return c && isFinite(Number(c.value));
      }).map(function (c) {
        return { label: str(c.label), value: Number(c.value), unit: str(c.unit) };
      }) : [];
      if (!cands.length) {
        return { status: "not_found", notes: "AI grazino ambiguous be tinkamu variantu" };
      }
      return { status: "ambiguous", candidates: cands, notes: str(data.notes) };
    }

    // status === "found": grieztieji reikalavimai
    var value = Number(data.value);
    if (!isFinite(value) || value < 0) {
      return { status: "error", error: "Rasta reiksme ne teigiamas skaicius", raw: text };
    }
    if (!data.quote || !String(data.quote).trim()) {
      // Be citatos nepriimam - zmogus negali patikrinti.
      return { status: "error", error: "AI nepateike citatos - reiksme nepriimama", raw: text };
    }

    return {
      status: "found",
      value: value,
      unit: str(data.unit),
      declaredUnit: str(data.declaredUnit),
      page: isFinite(Number(data.page)) ? Number(data.page) : null,
      quote: str(data.quote),
      standard: str(data.standard),
      notes: str(data.notes)
    };
  }

  function str(x) { return x === null || x === undefined ? "" : String(x).trim(); }

  // --- 3. VIENETU SUDERINAMUMAS --------------------------------------------

  // Normalizuoja vieneta palyginimui: mazosios, be tarpu, be "co2e"/"co2" skirtumo.
  function normUnit(u) {
    return str(u).toLowerCase()
      .replace(/\s+/g, "")
      .replace(/co2e|co2ekv|co2eq/g, "co2e")
      .replace(/vnt\.?|unit|piece|pcs|szt/g, "vnt")
      .replace(/tona|tonne|ton(?!n)/g, "t");
  }

  // Ar EPD reiksme (unit + declaredUnit) suderinama su musu faktoriaus vienetu?
  // Grazina { ok, converted, factor, warning }.
  //  - ok:true, factor:1        -> vienetai sutampa (kg CO2e / musu vienetas)
  //  - ok:true, factor:1000     -> EPD tonomis, konvertuojam i kg (x1000)
  //  - ok:false                 -> nesuderinama, rodyti ispejima, zmogus sprendzia
  function checkUnitCompatibility(epdUnit, epdDeclaredUnit, ourUnit) {
    var eu = normUnit(epdUnit);          // pvz. "kgco2e"
    var ou = normUnit(ourUnit);          // pvz. "kgco2e/vnt"
    var dd = normUnit(epdDeclaredUnit);  // pvz. "1vnt"

    // Musu vienetas skaidomas i skaitiklio dali ir vardikli
    var parts = ou.split("/");
    var ourMass = parts[0];              // "kgco2e" arba "tco2e"
    var ourPer = parts.length > 1 ? parts[1] : ""; // "vnt", "kg", "km", "m3"...

    var factor = null;
    if (eu === ourMass) factor = 1;
    else if (eu === "tco2e" && ourMass === "kgco2e") factor = 1000;
    else if (eu === "kgco2e" && ourMass === "tco2e") factor = 0.001;

    if (factor === null) {
      return {
        ok: false, factor: null, converted: null,
        warning: "EPD vienetas (" + str(epdUnit) + ") nesuderinamas su faktoriaus vienetu (" + str(ourUnit) + ")"
      };
    }

    // Deklaruoto vieneto patikra: ar EPD "uz 1 vnt" atitinka musu "/vnt"?
    var perOk = !ourPer || !dd || dd.indexOf(ourPer) !== -1;
    var warning = "";
    if (!perOk) {
      warning = "EPD deklaruotas vienetas (" + str(epdDeclaredUnit) + ") gali neatitikti faktoriaus vardiklio (/" + ourPer + ") - patikrinkite pries tvirtindami";
    }

    return { ok: true, factor: factor, converted: null, warning: warning };
  }

  // Pritaiko konvertavima rastai reiksmei. Grazina reiksme musu vienetais
  // arba null, jei nesuderinama.
  function convertValue(found, ourUnit) {
    var chk = checkUnitCompatibility(found.unit, found.declaredUnit, ourUnit);
    if (!chk.ok) return { value: null, warning: chk.warning };
    return { value: found.value * chk.factor, warning: chk.warning };
  }

  root.GP_EPD_EXTRACT = {
    version: VERSION,
    MODEL: MODEL,
    systemPrompt: systemPrompt,
    userText: userText,
    extractText: extractText,
    parseResponse: parseResponse,
    checkUnitCompatibility: checkUnitCompatibility,
    convertValue: convertValue
  };
})(typeof window !== "undefined" ? window : this);
