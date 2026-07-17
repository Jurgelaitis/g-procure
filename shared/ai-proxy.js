/* ============================================================================
 * G-Procure  shared/ai-proxy.js
 * ----------------------------------------------------------------------------
 * Bendras AI transporto sluoksnis VISIEMS moduliams (window.GP_AI_PROXY).
 *
 * Saugumo invariantas (A variantas):
 *   - Klientas kreipiasi TIK i serverio proxy (PROXY_BASE).
 *   - Raktas NIEKADA nebuna narsykleje: cia nera jokio rakto antrastes, nera
 *     tiesioginio narsykles rezimo, nera kreipimosi i Anthropic tiesiogiai.
 *   - Rakto negalima "patogiai" grazinti: jei opts turi apiKey ar headers,
 *     funkcija meta klaida (fail-fast).
 *
 * Backend prie /api/analyze priima gryna Anthropic native kuna
 * {model, max_tokens, system, messages}, apdoroja ir teksta, ir PDF (document
 * bloka), o grazina Anthropic atsakyma "kaip yra".
 * ==========================================================================*/

;(function (global) {
  "use strict";

  // --- Vienintelis tiesos saltinis (keiciama TIK cia) ----------------------
  var PROXY_BASE        = "https://api.g-procure.com";
  var DEFAULT_PATH      = "/api/analyze";
  var DEFAULT_MODEL     = "claude-sonnet-4-6";
  var DEFAULT_MAX_TOKENS = 4000;

  /* Backend'o UZKLAUSOS KUNO riba (patikrinta gyvai 2026-07-17).
     Serveryje veikia express.json({ limit: "10mb" }), o pries ji - nginx su
     client_max_body_size 10m (/etc/nginx/conf.d/upload-limit.conf). Abu
     sluoksnius reikejo kelti KARTU: nginx numatytieji 1 MB kitaip butu tape
     naujomis lubomis. Patikrinta: 2 MB uzklausa grazina 200, ne 413.

     MAX_BASE64 laikomas ZEMIAU serverio ribos - i ta pati JSON kuna dar telpa
     promptas, sistemos zinute ir apvalkalas.

     Skaicius gyvena CIA, o ne moduliuose (CLAUDE.md 4 ir 10 sk.): jis kyla is
     VIENOS serverio konfiguracijos, tad pasikeitus serveriui taisoma viena
     vieta. Naudoja pp-salygos (paraiskos kortele) ir pp-carbon (EPD).

     DEMESIO - tai NEGALIOJA serverio pusei ir Cloudflare Worker'iui:
     worker/epd-proxy.js turi SAVO, nesusijusia riba (jis kreipiasi tiesiai i
     Anthropic, per nginx/express neina isvis). Zr. CLAUDE.md 6 sk.          */
  var MAX_BASE64    = 9 * 1024 * 1024;
  // base64 pripucia 4/3, tad neapdorotas PDF negali virsyti ~3/4 biudzeto.
  var MAX_PDF_BAITU = Math.floor(MAX_BASE64 * 3 / 4);

  // Normalizuoja path: leidziam TIK santykini kelia savo proxy viduje.
  // Jei kas paduoda pilna URL ar host'a - ignoruojam ir imam tik kelio dali,
  // taip klientas negali nurodyti kito host'o.
  function safePath(path) {
    if (typeof path !== "string" || !path) return DEFAULT_PATH;
    // Numetam bet koki schema://host pradzia (pvz. https://evil.com/x -> /x)
    var p = path.replace(/^[a-z]+:\/\/[^/]+/i, "");
    if (p.charAt(0) !== "/") p = "/" + p;
    return p;
  }

  // Sudaro user zinutes content: arba PDF blokai, arba paprastas string.
  function buildUserContent(userMessage, pdfBase64) {
    var text = typeof userMessage === "string" ? userMessage : "";
    if (pdfBase64) {
      // Tiksliai ta forma, kuri veikia backend teste:
      // document (base64 / application/pdf) + text.
      return [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }
        },
        { type: "text", text: text }
      ];
    }
    return text;
  }

  // Tolerantiskas teksto istraukimas is ivairiu atsakymo formu.
  // Atlaiko: Anthropic content[] (blokai su .text), completion, text, message.
  function extractText(resp) {
    if (resp == null) return "";
    if (typeof resp === "string") return resp;

    // Anthropic native: { content: [ { type:"text", text:"..." }, ... ] }
    if (Array.isArray(resp.content)) {
      return resp.content
        .map(function (b) {
          if (!b) return "";
          if (typeof b === "string") return b;
          return b.text || b.content || "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
    }
    if (typeof resp.content === "string") return resp.content;
    if (typeof resp.completion === "string") return resp.completion;
    if (typeof resp.text === "string") return resp.text;

    // { message: "..." } arba { message: { content: [...] } }
    if (resp.message) {
      if (typeof resp.message === "string") return resp.message;
      if (resp.message.content) return extractText(resp.message);
    }
    return "";
  }

  // --- 429 / rate-limit auto-retry -----------------------------------------
  // Kartojama TIK kai: status 429 ARBA atsakymo klaidoje matomas "overloaded"
  // ar "rate". Backend gali wrap'inti Anthropic 429 i kita statusa, todel
  // tikrinamas ir tekstas. Kitos klaidos (400, 500, tinklo) - nekartojamos.
  var MAX_RETRIES = 3;   // max 3 pakartojimai (is viso 4 bandymai)

  function isRetryable(result) {
    if (!result || result.ok) return false;
    if (result.status === 429) return true;
    return /overloaded|rate/i.test(result.error || "");
  }

  // Pauze tarp bandymu (backoff). setTimeout - narsykles aplinka.
  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // --- Pagrindine funkcija -------------------------------------------------
  // opts: {
  //   module, path, system, model, maxTokens, userMessage, pdfBase64, signal
  // }
  // Grazina Promise< { ok, text, raw, status, error } >.
  function call(opts) {
    opts = opts || {};

    // Saugumo guard: rakto ar antrasciu is kliento NEPRIIMAM.
    if ("apiKey" in opts) {
      return Promise.reject(new Error(
        "GP_AI_PROXY: apiKey neleidziamas - raktas gyvena tik serverio puseje."));
    }
    if ("headers" in opts) {
      return Promise.reject(new Error(
        "GP_AI_PROXY: rankiniu headers neleidziama - transporto antrastes fiksuotos."));
    }

    var url = PROXY_BASE + safePath(opts.path);

    var body = {
      model: opts.model || DEFAULT_MODEL,
      max_tokens: opts.maxTokens || DEFAULT_MAX_TOKENS,
      system: opts.system || "",
      messages: [
        { role: "user", content: buildUserContent(opts.userMessage, opts.pdfBase64) }
      ]
    };

    var fetchOpts = {
      method: "POST",
      // VIENINTELES antrastes. Jokios rakto ar versijos antrastes.
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    };
    if (opts.signal) fetchOpts.signal = opts.signal;

    // Vienas bandymas: grazina normalizuota { ok, text, raw, status, error }.
    // opts / body / fetchOpts NEKEICIAMI tarp bandymu - kartojama identiska uzklausa.
    function attempt() {
      return fetch(url, fetchOpts).then(function (response) {
        var status = response.status;
        return response.text().then(function (rawText) {
          var raw = null;
          try { raw = rawText ? JSON.parse(rawText) : null; } catch (e) { raw = rawText; }

          if (!response.ok) {
            var errMsg = "API klaida " + status;
            if (raw && raw.error) {
              errMsg += ": " + (typeof raw.error === "string" ? raw.error : JSON.stringify(raw.error));
            } else if (typeof rawText === "string" && rawText) {
              errMsg += ": " + rawText.slice(0, 300);
            }
            return { ok: false, text: "", raw: raw, status: status, error: errMsg };
          }

          return { ok: true, text: extractText(raw), raw: raw, status: status, error: null };
        });
      }).catch(function (err) {
        return {
          ok: false,
          text: "",
          raw: null,
          status: 0,
          error: (err && err.message) ? err.message : "Tinklo klaida"
        };
      });
    }

    // Retry ciklas: backoff 1s / 2s / 4s. Po visu bandymu grazina normalia
    // forma { ok:false, ... } - NIEKADA nemeta del retry.
    function run(attemptIndex) {
      return attempt().then(function (result) {
        if (attemptIndex < MAX_RETRIES && isRetryable(result)) {
          return delay(1000 * Math.pow(2, attemptIndex)).then(function () {
            return run(attemptIndex + 1);
          });
        }
        return result;
      });
    }

    return run(0);
  }

  global.GP_AI_PROXY = {
    call: call,
    extractText: extractText,
    BASE: PROXY_BASE,
    MODEL: DEFAULT_MODEL,
    MAX_BASE64: MAX_BASE64,
    MAX_PDF_BAITU: MAX_PDF_BAITU
  };
})(typeof window !== "undefined" ? window : this);
