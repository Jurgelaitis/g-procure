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

  /* Klaidos zinute ZMOGUI, ne zurnalui.
     Kodel to prireike: virsijus kuno riba nginx grazina savo HTML puslapi
     („413 Request Entity Too Large ... nginx/1.28.3 (Ubuntu)"), o Express -
     PayloadTooLargeError. Anksciau visa tai keliaudavo tiesiai i naudotojo ekrana,
     tad zmogus, ikeles per dideli PDF, matydavo HTML su nginx versija ir jokio
     paaiskinimo, ka daryti. Patikrinta prie saltinio 2026-09-08.
     PASTABA: apie failo skaidyma ar suspaudima cia NERASOM - CLAUDE.md tai draudzia;
     riba kelama serveryje, o ne apeinama kliente. */
  function mbTekstas(baitai) { return Math.floor(baitai / (1024 * 1024)) + " MB"; }
  function arHtml(t) { return typeof t === "string" && /^\s*<(?:!doctype|html|head|body)/i.test(t); }

  function klaidosZinute(status, raw, rawText) {
    if (status === 413) {
      return "Failas per didelis - serveris jo nepriėmė. Didžiausias dokumento dydis apie " +
             mbTekstas(MAX_PDF_BAITU) + ". Pateikite mažesnės apimties failą.";
    }
    if (status === 429) return "Per daug užklausų iš eilės. Palaukite kelias sekundes ir bandykite dar kartą.";
    if (status === 401 || status === 403) return "Serveris atmetė užklausą (" + status + "). Kreipkitės į sistemos prižiūrėtoją.";
    if (status >= 500) return "Serverio klaida (" + status + "). Pabandykite po kelių minučių.";
    var zinute = "API klaida " + status;
    if (raw && raw.error) {
      zinute += ": " + (typeof raw.error === "string" ? raw.error : JSON.stringify(raw.error));
    } else if (typeof rawText === "string" && rawText && !arHtml(rawText)) {
      // HTML puslapio i ekrana nededam - is jo naudotojui jokios naudos.
      zinute += ": " + rawText.slice(0, 300);
    }
    return zinute;
  }

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

  /* Kartojimo sprendimas remiasi STATUSU, ne zinutes tekstu.
     Anksciau cia buvo tikrinamas `result.error` tekstas („overloaded"), o jame guledavo
     neapdorotas atsakymo kunas. Nuo tada, kai zinutes rasomos zmogui, to teksto ten nebera -
     tad Anthropic 529 „overloaded_error" butu nustojes kartotis. Statusas patikimesnis:
     jis nepriklauso nuo to, kaip suformuluota zinute. */
  function isRetryable(result) {
    if (!result || result.ok) return false;
    if (result.status === 429) return true;      // per daug uzklausu
    if (result.status >= 500) return true;       // 529 overloaded ir kitos laikinos serverio klaidos
    // 413 (per didelis failas) NEKARTOJAMAS - kartojimas duotu ta pati atsakyma.
    return /overloaded|rate/i.test(result.error || "");
  }

  // Pauze tarp bandymu (backoff). setTimeout - narsykles aplinka.
  // Atšaukus (signal) pauzė baigiasi iškart: kitas bandymas su nutrauktu signalu
  // grįžta tuoj pat (status 0, nekartojamas), tad „Atšaukti“ nelaukia iki 4 s (Q3, 2026-09-26).
  function delay(ms, signal) {
    return new Promise(function (resolve) {
      if (signal && signal.aborted) { resolve(); return; }
      var t = setTimeout(resolve, ms);
      if (signal && signal.addEventListener) {
        signal.addEventListener("abort", function () { clearTimeout(t); resolve(); }, { once: true });
      }
    });
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
            return { ok: false, text: "", raw: raw, status: status,
                     error: klaidosZinute(status, raw, rawText) };
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
          return delay(1000 * Math.pow(2, attemptIndex), opts.signal).then(function () {
            return run(attemptIndex + 1);
          });
        }
        return result;
      });
    }

    return run(0);
  }

  // PERKELTA 2026-09-25 is PP-tiekejams/asistentas.js: PP-salygos AI pasiūlymų JSON su tikru LITGRID
  // paketu 9683631 irgi sulūžo (tikėtina dėl šaltinio „Packing list" su ASCII uždarančia kabute).
  // Viena kopija visiems moduliams.
  // Modelio JSON su pažeidimais, kuriuos matėme TIKRUOSE atsakymuose (2026-09-02,
  // CVP IS paketas 1159_9187214): neekranuota ASCII kabutė eilutės viduje (lietuviška
  // citata atidaroma „, o uždaroma ") ir tiesioginis eilutės lūžis eilutės viduje.
  // Griežtas JSON.parse tokį tekstą atmeta, ir naudotojas matydavo "Nepavyko gauti
  // atsakymo", nors atsakymas buvo pilnas ir teisingas. Taisymas STRUKTŪRINIS: kabutė
  // laikoma eilutės pabaiga TIK jei po jos eina tai, ko JSON gramatika tikisi
  // (dvitaškis po rakto; kablelis, po kurio prasideda raktas ar reikšmė; uždarantis
  // skliaustas; teksto pabaiga). Neuždaryta eilutė ar neuždarytas JSON NEtaisomi -
  // nutrauktas (max_tokens) atsakymas lieka null, kad dalis nebūtų rodoma kaip visuma.
  function taisykJson(s) {
    var out = "", i = 0, n = s.length, stack = [], expect = "value";
    function top() { return stack[stack.length - 1]; }
    function praleisk(k) { while (k < n && /\s/.test(s.charAt(k))) k++; return k; }
    while (i < n) {
      var ch = s.charAt(i);
      if (ch === '"') {
        var j = i + 1, str = '"', uzdaryta = false;
        while (j < n) {
          var c = s.charAt(j);
          if (c === "\\") { str += c + s.charAt(j + 1); j += 2; continue; }
          if (c === "\n") { str += "\\n"; j++; continue; }
          if (c === "\r") { str += "\\r"; j++; continue; }
          if (c === "\t") { str += "\\t"; j++; continue; }
          if (c !== '"') { str += c; j++; continue; }
          var k = praleisk(j + 1), nx = s.charAt(k), closes;
          if (expect === "key") closes = nx === ":";
          else if (nx === ",") { var nn = s.charAt(praleisk(k + 1)); closes = top() === "o" ? nn === '"' : /["\d\-{\[tfn]/.test(nn); }
          else if (nx === "}") closes = top() === "o";
          else if (nx === "]") closes = top() === "a";
          else closes = k >= n;
          if (closes) { str += '"'; j++; uzdaryta = true; break; }
          str += '\\"'; j++;
        }
        out += str; i = j;
        if (!uzdaryta) return out;
        expect = expect === "key" ? "colon" : "end";
        continue;
      }
      if (ch === "{") { stack.push("o"); expect = "key"; }
      else if (ch === "[") { stack.push("a"); expect = "value"; }
      else if (ch === "}" || ch === "]") { stack.pop(); expect = "end"; }
      else if (ch === ":") expect = "value";
      else if (ch === ",") expect = top() === "o" ? "key" : "value";
      out += ch; i++;
    }
    return out;
  }

  global.GP_AI_PROXY = {
    call: call,
    extractText: extractText,
    taisykJson: taisykJson,
    BASE: PROXY_BASE,
    MODEL: DEFAULT_MODEL,
    MAX_BASE64: MAX_BASE64,
    MAX_PDF_BAITU: MAX_PDF_BAITU
  };
})(typeof window !== "undefined" ? window : this);
