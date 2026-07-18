/* ============================================================================
 * G-Procure  pp-salygos/paraiska-extract.js   (v0.1)
 * DocLogix pirkimo paraiskos korteles (PDF/JPG/PNG) duomenu istraukimas su AI
 * ir DETERMINISTINIS ju atvaizdavimas i pp-salygos 1 zingsnio laukus.
 *
 * ATSAKOMYBIU PADALIJIMAS (pagal pp-carbon/epd-extract.js pavyzdi):
 *  - Sis failas: failo paruosimas (JPG/PNG -> PDF, be isoriniu biblioteku),
 *    prompto konstravimas, atsakymo parsinimas ir VALIDACIJA, deterministinis
 *    zemelapis i modulio laukus (budas per GP_METHODS.fromText - ne AI).
 *  - UI (PP-SALYGOS.html): failo ikelimas, siulymu rodymas vartotojui
 *    PATVIRTINTI. AI niekada neuzpildo lauku pats - tik pasiulo; galutinis
 *    sprendimas ZMOGAUS (spaudzia "Pritaikyti").
 *
 * TRANSPORTAS: TIK shared/ai-proxy.js (GP_AI_PROXY) - raktas serverio puseje.
 * Backend priima PDF document bloka, todel paveiksleliai (ekrano nuotraukos)
 * cia ivyniojami i minimalu PDF (DCTDecode) - proxy ir backend nekeiciami.
 *
 * SAUGIKLIAI:
 *  - AI atsakymas grieztai JSON; parseResponse() atmeta neatitinkanti schemos.
 *  - "nenustatyta" / null - teisetas atsakymas; joks spejimas nepriimamas.
 *  - Kiekviena rasta reiksme turi CITATA is korteles - zmogus patikrina.
 *  - Pirkimo BUDAS kanonizuojamas deterministiskai (GP_METHODS.fromText),
 *    ne AI - AI grazina tik teksta, koks parasytas korteleje.
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.3";
  // Modelio cia NEnurodom: numatytasis gyvena VIENOJE vietoje -
  // shared/ai-proxy.js (DEFAULT_MODEL). Zr. CLAUDE.md 6 sk.
  var MAX_TOKENS = 2000;
  var MAX_FAILO_MB = 15;         // sveiko proto saugiklis narsykles atminciai

  /* Backend'o kuno riba gyvena VIENOJE vietoje - shared/ai-proxy.js
     (MAX_BASE64, MAX_PDF_BAITU). Cia jos NEDUBLIUOJAM: skaicius kyla is
     serverio konfiguracijos, o ne is sio modulio. Zr. CLAUDE.md 4 sk.
     Atsargines reiksmes - tik tam atvejui, jei ai-proxy.js nebutu prijungtas
     (tada analizuoti() vis tiek suklups anksciau su aiskia klaida).

     ISTORIJA (kad nebutu bandoma "optimizuoti" atgal): iki 2026-07-17 riba
     buvo 100 KB - express.json() be argumento. Del jos cia gyveno 10 pakopu
     suspaudimo kopecia ir korteles skaidymas i fragmentus, siunciamus
     atskiromis uzklausomis, su ju rezultatu suliejimu. Abu apejimai pasalinti:
     jie kainavo AI tiksluma ir iki 3 kartu daugiau apmokamu uzklausu.        */
  var BASE64_BIUDZETAS = (root.GP_AI_PROXY && root.GP_AI_PROXY.MAX_BASE64) || 9 * 1024 * 1024;
  var PDF_MAX_BAITU    = (root.GP_AI_PROXY && root.GP_AI_PROXY.MAX_PDF_BAITU) ||
                         Math.floor(BASE64_BIUDZETAS * 3 / 4);

  /* Suspaudimo kandidatai nuo GERIAUSIO iki blogiausio. Renkamas PIRMAS, kuris
     telpa - dydis MATUOJAMAS tikras, ne spejamas.
     Prie 9 MB biudzeto pirmas kandidatas telpa VISADA (iprasta DocLogix
     kortele 1850x972 ties q=0.92 uzima ~200 KB), tad likusieji yra tik atsarga
     milziniskiems ekranams. Zemiau q=0.6 JPEG artefaktai sulieja smulku srifta
     ir AI klysta (issematuota: q=0.5 duoda "PL5L24126" vietoj "PLSL24126") -
     todel tokiu pakopu cia SAMONINGAI nebera. Geriau aiski klaida nei tyliai
     blogai perskaityta kortele.                                              */
  var KANDIDATAI = [
    { plotis: 1850, q: 0.92 }, { plotis: 1850, q: 0.75 }, { plotis: 1400, q: 0.70 }
  ];

  /* ==== 1. FAILO PARUOSIMAS =============================================== */

  // JPEG matmenys is SOF zymu (SOF0..SOF15, isskyrus DHT/DAC/RST zymes).
  function jpegMatmenys(bytes) {
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;   // ne JPEG
    var i = 2;
    while (i < bytes.length - 9) {
      if (bytes[i] !== 0xFF) { i++; continue; }
      var marker = bytes[i + 1];
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        return { h: (bytes[i + 5] << 8) | bytes[i + 6],
                 w: (bytes[i + 7] << 8) | bytes[i + 8],
                 komponentai: bytes[i + 9] };
      }
      i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
    }
    return null;
  }

  // Minimalus vieno puslapio PDF su JPEG (DCTDecode) - be isoriniu biblioteku.
  function jpegToPdf(jpegBytes) {
    var dim = jpegMatmenys(jpegBytes);
    if (!dim) throw new Error("Nepavyko nuskaityti JPEG matmenu");
    var cs = dim.komponentai === 1 ? "/DeviceGray" : "/DeviceRGB";
    var enc = new TextEncoder();
    var dalys = [];
    var offsets = [];
    var pos = 0;
    function push(s) {
      var b = typeof s === "string" ? enc.encode(s) : s;
      dalys.push(b); pos += b.length;
    }
    function obj(n, s) { offsets[n] = pos; push(n + " 0 obj\n" + s + "\nendobj\n"); }

    push("%PDF-1.4\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + dim.w + " " + dim.h + "] " +
           "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
    offsets[4] = pos;
    push("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + dim.w + " /Height " + dim.h +
         " /ColorSpace " + cs + " /BitsPerComponent 8 /Filter /DCTDecode /Length " +
         jpegBytes.length + " >>\nstream\n");
    push(jpegBytes);
    push("\nendstream\nendobj\n");
    var turinys = "q " + dim.w + " 0 0 " + dim.h + " 0 0 cm /Im0 Do Q";
    obj(5, "<< /Length " + turinys.length + " >>\nstream\n" + turinys + "\nendstream");
    var xrefPos = pos;
    push("xref\n0 6\n0000000000 65535 f \n");
    for (var n = 1; n <= 5; n++) push(String(offsets[n]).padStart(10, "0") + " 00000 n \n");
    push("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF");

    var viso = 0;
    dalys.forEach(function (d) { viso += d.length; });
    var out = new Uint8Array(viso);
    var o = 0;
    dalys.forEach(function (d) { out.set(d, o); o += d.length; });
    return out;
  }

  function bytesToBase64(bytes) {
    var s = "";
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK)
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    return btoa(s);
  }

  function dataUrlToBytes(dataUrl) {
    var bin = atob(dataUrl.split(",")[1]);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function ikeltiPaveiksleli(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Nepavyko atidaryti paveikslelio")); };
      img.src = url;
    });
  }

  // Vienas variantas: mazinam iki plocio, koduojam JPEG->PDF.
  // Grazina base64 ir TIKRA dydi.
  function variantas(img, k) {
    var nat = { w: img.naturalWidth, h: img.naturalHeight };
    var sk = Math.min(1, k.plotis / nat.w);
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(nat.w * sk));
    c.height = Math.max(1, Math.round(nat.h * sk));
    var ctx = c.getContext("2d");
    ctx.fillStyle = "white";                         // permatomumas -> baltas fonas (JPEG be alfa)
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";              // svaresnis tekstas mazinant
    ctx.drawImage(img, 0, 0, nat.w, nat.h, 0, 0, c.width, c.height);
    var b64 = bytesToBase64(jpegToPdf(dataUrlToBytes(c.toDataURL("image/jpeg", k.q))));
    return { base64: b64, plotis: c.width, aukstis: c.height, q: k.q,
             kb: Math.round(b64.length / 1024), suspausta: sk < 1 };
  }

  // Paveikslelis -> VISA kortele viena uzklausa. Renkam PIRMA kandidata, kurio
  // TIKRAS (ne spejamas) dydis telpa i biudzeta.
  function paruostiPaveiksleli(img, biudzetas) {
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("Paveikslelis be matmenu");
    for (var i = 0; i < KANDIDATAI.length; i++) {
      var v = variantas(img, KANDIDATAI[i]);
      if (v.base64.length <= biudzetas) return v;
    }
    throw new Error(
      "Nuotraukos nepavyko paruošti analizei - ji per didelė net suspausta. " +
      "Iškirpkite tik tą kortelės dalį, kurioje yra pirkimo duomenys.");
  }

  // Bet koks palaikomas failas -> viena paruosta dalis (proxy priima tik PDF).
  function paruostiFaila(file, biudzetas) {
    biudzetas = biudzetas || BASE64_BIUDZETAS;
    if (file.size > MAX_FAILO_MB * 1024 * 1024)
      return Promise.reject(new Error("Failas per didelis (max " + MAX_FAILO_MB + " MB)"));
    var tipas = (file.type || "").toLowerCase();
    var vardas = (file.name || "").toLowerCase();

    if (tipas === "application/pdf" || /\.pdf$/.test(vardas)) {
      // PDF persiunciamas kaip yra - narsykleje jo perspausti negalim be
      // papildomos bibliotekos, todel per didelis PDF atmetamas AISKIAI
      // (o ne kaip nesuprantama 413 klaida is serverio).
      if (file.size > PDF_MAX_BAITU)
        return Promise.reject(new Error(
          "Šis PDF per didelis analizei (" + (file.size / (1024 * 1024)).toFixed(1) + " MB, riba " +
          Math.floor(PDF_MAX_BAITU / (1024 * 1024)) + " MB). Išsaugokite tik tą puslapį, " +
          "kuriame yra pirkimo duomenys, ir įkelkite jį."));
      return file.arrayBuffer().then(function (ab) {
        var b64 = bytesToBase64(new Uint8Array(ab));
        // Tikslus patikrinimas: file.size buvo tik greitas filtras, o i kuna
        // keliauja butent base64.
        if (b64.length > biudzetas)
          throw new Error("Šis PDF per didelis analizei (" + Math.round(b64.length / 1024) + " KB).");
        return { base64: b64, kb: Math.round(b64.length / 1024), pdf: true, suspausta: false };
      });
    }
    if (/^image\//.test(tipas) || /\.(jpe?g|png|webp|bmp)$/.test(vardas)) {
      // Paveiksleli pertraukiam per canvas: proxy priima tik PDF.
      return ikeltiPaveiksleli(file).then(function (img) {
        return paruostiPaveiksleli(img, biudzetas);
      });
    }
    return Promise.reject(new Error("Nepalaikomas failo tipas (PDF, JPG, PNG)"));
  }

  // Suderinamumas su v0.1 API.
  function fileToPdfBase64(file) {
    return paruostiFaila(file).then(function (d) { return d.base64; });
  }

  /* ==== 2. PROMPTAI ======================================================= */

  function systemPrompt() {
    return [
      "Tu esi dokumentu analizes asistentas, istraukiantis pirkimo duomenis is",
      "DocLogix pirkimo paraiskos korteles (lietuviu kalba).",
      "",
      "GRIEZTOS TAISYKLES:",
      "1. Atsakyk TIK gryno JSON formatu, be jokio kito teksto, be markdown.",
      "2. Jei lauko korteleje NERA arba nesi tikras - grazink null (objektams)",
      "   arba \"nenustatyta\" (pasirinkimams). NIEKADA nespek.",
      "3. Kiekvienam rastam laukui BUTINA citata - tikslus teksto fragmentas",
      "   is korteles, is kurio paimta reiksme.",
      "4. pirkimo_budas - perrasyk TIKSLIAI taip, kaip parasyta korteleje",
      "   (jo nekeisk ir neinterpretuok - kanonizuojama atskirai).",
      "5. pavadinimas_kilmininkas - pirkimo pavadinimas KILMININKO linksniu",
      "   BE zodzio \"pirkimas\" gale (pvz. is \"X paslaugu ir darbu pirkimas\"",
      "   -> \"X paslaugu ir darbu\"). Jei pavadinimas jau be \"pirkimas\" -",
      "   palik kaip yra.",
      "6. objekto_tipas: \"prekes\" | \"paslaugos\" | \"darbai\" | \"nenustatyta\".",
      "   Spresk is pavadinimo/objekto aprasymo. Jei misrus (pvz. \"paslaugu ir",
      "   rangos darbu\") - parink VYRAUJANTI pagal pirkimo esme, o alternatyvas",
      "   israsyk i tipo_kandidatai.",
      "7. nacionalinis_saugumas: \"taip\", jei korteleje nurodyta, kad sutartis",
      "   atitiks nacionaliniam saugumui svarbiu objektu apsaugos kriterijus",
      "   (pvz. minimas istatymo 13 str. 4 d.); \"ne\", jei aiskiai nurodyta",
      "   priesingai; kitaip \"nenustatyta\".",
      "",
      "JSON schema:",
      "{",
      "  \"status\": \"ok\" | \"neiskaitoma\",",
      "  \"laukai\": {",
      "    \"pavadinimas\":              {\"reiksme\":\"...\", \"citata\":\"...\"} | null,",
      "    \"pavadinimas_kilmininkas\":  {\"reiksme\":\"...\"} | null,",
      "    \"pirkimo_budas\":            {\"reiksme\":\"...\", \"citata\":\"...\"} | null,",
      "    \"verte_be_pvm\":             {\"reiksme\":\"<kaip parasyta, pvz. 743490,00>\", \"citata\":\"...\"} | null,",
      "    \"objekto_tipas\":            {\"reiksme\":\"prekes|paslaugos|darbai|nenustatyta\", \"citata\":\"...\"},",
      "    \"tipo_kandidatai\":          [\"paslaugos\",\"darbai\"] | [],",
      "    \"nacionalinis_saugumas\":    {\"reiksme\":\"taip|ne|nenustatyta\", \"citata\":\"...\"},",
      "    \"registracijos_nr\":         {\"reiksme\":\"...\", \"citata\":\"...\"} | null,",
      "    \"dokumento_tipas\":          {\"reiksme\":\"...\"} | null,",
      "    \"dpa\":                      {\"reiksme\":\"taip|ne|nenustatyta\", \"citata\":\"...\"},",
      "    \"es_lesos\":                 {\"reiksme\":\"taip|ne|nenustatyta\", \"citata\":\"...\"},",
      "    \"projekto_nr\":              {\"reiksme\":\"...\"} | null",
      "  },",
      "  \"pastabos\": \"<trumpa pastaba, jei reikia>\"",
      "}"
    ].join("\n");
  }

  function userText() {
    return "Istrauk pirkimo duomenis is pridetos DocLogix pirkimo paraiskos korteles. " +
           "Atsakyk grieztai pagal sistemos zinuteje aprasyta JSON schema.";
  }

  /* ==== 3. ATSAKYMO PARSINIMAS IR VALIDACIJA ============================== */

  function isTrijuVienas(v) { return v === "taip" || v === "ne" || v === "nenustatyta"; }

  function parseResponse(text) {
    if (!text) return { ok: false, error: "Tuscias AI atsakymas" };
    var m = String(text).match(/\{[\s\S]*\}/);            // toleruojam aplinkini teksta
    if (!m) return { ok: false, error: "Atsakyme nera JSON" };
    var d;
    try { d = JSON.parse(m[0]); }
    catch (e) { return { ok: false, error: "JSON klaida: " + e.message }; }
    if (d.status === "neiskaitoma")
      return { ok: false, error: "AI nurodo, kad dokumentas neiskaitomas" + (d.pastabos ? ": " + d.pastabos : "") };
    if (d.status !== "ok" || !d.laukai || typeof d.laukai !== "object")
      return { ok: false, error: "Atsakymas neatitinka schemos (status/laukai)" };
    var L = d.laukai;
    // Grieztos pasirinkimu reiksmes - kitaip atmetam i "nenustatyta".
    ["nacionalinis_saugumas", "dpa", "es_lesos"].forEach(function (k) {
      if (L[k] && !isTrijuVienas(L[k].reiksme)) L[k] = { reiksme: "nenustatyta", citata: null };
    });
    if (L.objekto_tipas && !/^(prekes|paslaugos|darbai|nenustatyta)$/.test(L.objekto_tipas.reiksme || ""))
      L.objekto_tipas = { reiksme: "nenustatyta", citata: null };
    if (!Array.isArray(L.tipo_kandidatai)) L.tipo_kandidatai = [];
    return { ok: true, laukai: L, pastabos: d.pastabos || "" };
  }

  /* ==== 4. DETERMINISTINIS ZEMELAPIS I MODULIO LAUKUS ===================== */

  // Vertes tekstas -> modulio formato eilute ("743 490" arba "743 490,50").
  // Parsinima ir formatavima ima is shared/money.js (vienas tiesos saltinis -
  // JAV ir EU formatai). Cia NEdubliuojam. Zr. CLAUDE.md 4 ir 5 sk.
  function verteIsTeksto(s) {
    var GM = root.GP_MONEY;
    if (!GM) return null;                       // money.js visada prijungtas PP-SALYGOS.html
    var n = GM.parseEUR(s);
    return (n == null) ? null : GM.formatEUR(n);
  }

  // Istraukti laukai -> siulymu sarasas UI perziurai. Kiekvienas siulymas:
  // { id, laukas, kortele, citata, reiksme, ok, pastaba }.
  // Budas kanonizuojamas DETERMINISTISKAI per GP_METHODS.fromText.
  function mapFields(L) {
    var out = { siulymai: [], info: [] };

    if (L.pavadinimas_kilmininkas && L.pavadinimas_kilmininkas.reiksme) {
      out.siulymai.push({
        id: "pavadinimas", laukas: "Pirkimo pavadinimas (kilmininku, be „pirkimas“)",
        kortele: (L.pavadinimas && L.pavadinimas.reiksme) || L.pavadinimas_kilmininkas.reiksme,
        citata: (L.pavadinimas && L.pavadinimas.citata) || null,
        reiksme: L.pavadinimas_kilmininkas.reiksme.replace(/\s+pirkimas\s*$/i, "").trim(),
        ok: true
      });
    }

    if (L.pirkimo_budas && L.pirkimo_budas.reiksme) {
      var kanonas = root.GP_METHODS ? root.GP_METHODS.fromText(L.pirkimo_budas.reiksme) : null;
      var tinkamas = kanonas && root.GP_METHODS.toSalygos(kanonas.id);
      out.siulymai.push({
        id: "budas", laukas: "Pirkimo būdas",
        kortele: L.pirkimo_budas.reiksme, citata: L.pirkimo_budas.citata || null,
        reiksme: tinkamas ? kanonas.id : null,
        rodoma: tinkamas ? (kanonas.label + " · " + kanonas.id) : null,
        ok: !!tinkamas,
        // Vartotojui rodoma pastaba - be vidiniu terminu. Kai budas atpazintas,
        // pastabos isvis nereikia: eilute jau rodo "Korteleje: X -> Bus irasyta: Y".
        pastaba: tinkamas ? null
          : (kanonas ? "šiam būdui modulis dar neturi šablonų - pasirinkite kitą arba pildykite ranka"
                     : "būdo atpažinti nepavyko - pasirinkite jį rankiniu būdu")
      });
    }

    if (L.verte_be_pvm && L.verte_be_pvm.reiksme) {
      var v = verteIsTeksto(L.verte_be_pvm.reiksme);
      out.siulymai.push({
        id: "verte", laukas: "Numatoma pirkimo vertė (EUR be PVM)",
        kortele: L.verte_be_pvm.reiksme, citata: L.verte_be_pvm.citata || null,
        reiksme: v, ok: !!v,
        pastaba: v ? null : "nepavyko išskaityti skaičiaus - įrašykite rankiniu būdu"
      });
    }

    if (L.objekto_tipas && L.objekto_tipas.reiksme && L.objekto_tipas.reiksme !== "nenustatyta") {
      var kand = (L.tipo_kandidatai || []).filter(function (t) { return t !== L.objekto_tipas.reiksme; });
      out.siulymai.push({
        id: "tipas", laukas: "Pirkimo objekto tipas",
        kortele: L.objekto_tipas.reiksme + (kand.length ? " (galimi: " + kand.join(", ") + ")" : ""),
        citata: L.objekto_tipas.citata || null,
        reiksme: L.objekto_tipas.reiksme, ok: true,
        pastaba: kand.length ? "mišrus objektas - peržiūrėkite" : null
      });
    }

    if (L.nacionalinis_saugumas && L.nacionalinis_saugumas.reiksme !== "nenustatyta") {
      out.siulymai.push({
        id: "nacsaug", laukas: "Susijęs su nacionaliniu saugumu",
        kortele: L.nacionalinis_saugumas.reiksme,
        citata: L.nacionalinis_saugumas.citata || null,
        reiksme: L.nacionalinis_saugumas.reiksme, ok: true
      });
    }

    // Informaciniai laukai - pp-salygos ju neklausia, bet rengejui naudinga.
    [["registracijos_nr", "Registracijos Nr."], ["dokumento_tipas", "Dokumento tipas"],
     ["projekto_nr", "Projekto Nr."], ["dpa", "Asmens duomenų tvarkymo sutartis (DPA)"],
     ["es_lesos", "ES lėšos"]].forEach(function (p) {
      var k = p[0], label = p[1];
      if (L[k] && L[k].reiksme && L[k].reiksme !== "nenustatyta")
        out.info.push({ laukas: label, reiksme: L[k].reiksme });
    });

    return out;
  }

  /* ==== 5. PILNAS ISKVIETIMAS ============================================= */

  function analizuoti(file, opts) {
    opts = opts || {};
    if (!root.GP_AI_PROXY) return Promise.reject(new Error("GP_AI_PROXY neprijungtas"));
    var paruosta = null;
    return paruostiFaila(file, opts.biudzetas).then(function (p) {
      paruosta = p;
      if (opts.onParuosta) opts.onParuosta(p);        // UI: paruosta, siunciam
      // VISA kortele - viena uzklausa. Skaidymo nebera: backend priima 10 MB.
      return root.GP_AI_PROXY.call({
        module: "pp-salygos",
        maxTokens: MAX_TOKENS,
        system: systemPrompt(),
        userMessage: userText(),
        pdfBase64: p.base64,
        signal: opts.signal
      });
    }).then(function (r) {
      if (!r.ok) throw new Error(r.error || "AI klaida");
      var p = parseResponse(r.text);
      if (!p.ok) throw new Error(p.error);
      return { laukai: p.laukai, pastabos: p.pastabos || "",
               map: mapFields(p.laukai), failas: paruosta };
    });
  }

  root.GP_PARAISKA = {
    VERSION: VERSION,
    BASE64_BIUDZETAS: BASE64_BIUDZETAS,
    analizuoti: analizuoti,
    paruostiFaila: paruostiFaila,
    fileToPdfBase64: fileToPdfBase64,
    jpegToPdf: jpegToPdf,
    parseResponse: parseResponse,
    mapFields: mapFields,
    verteIsTeksto: verteIsTeksto,
    systemPrompt: systemPrompt,
    userText: userText
  };
})(typeof window !== "undefined" ? window : this);
