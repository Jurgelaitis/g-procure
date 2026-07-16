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

  var VERSION = "0.1";
  var MODEL = "claude-sonnet-4-6";
  var MAX_TOKENS = 2000;
  var MAX_FAILO_MB = 15;

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

  // PNG (ar kitas rastras) -> JPEG per canvas (ekrano nuotraukos daznai PNG).
  function rastrasToJpegBytes(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement("canvas");
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          var ctx = c.getContext("2d");
          ctx.fillStyle = "#fff";                       // permatomumas -> baltas fonas
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          var dataUrl = c.toDataURL("image/jpeg", 0.92);
          var b64 = dataUrl.split(",")[1];
          var bin = atob(b64);
          var bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          resolve(bytes);
        } catch (e) { reject(e); }
        finally { URL.revokeObjectURL(url); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Nepavyko atidaryti paveikslelio")); };
      img.src = url;
    });
  }

  // Bet koks palaikomas failas -> PDF base64 (proxy kontraktas - tik PDF).
  function fileToPdfBase64(file) {
    if (file.size > MAX_FAILO_MB * 1024 * 1024)
      return Promise.reject(new Error("Failas per didelis (max " + MAX_FAILO_MB + " MB)"));
    var tipas = (file.type || "").toLowerCase();
    var vardas = (file.name || "").toLowerCase();
    if (tipas === "application/pdf" || /\.pdf$/.test(vardas)) {
      return file.arrayBuffer().then(function (ab) { return bytesToBase64(new Uint8Array(ab)); });
    }
    if (tipas === "image/jpeg" || /\.jpe?g$/.test(vardas)) {
      return file.arrayBuffer().then(function (ab) {
        return bytesToBase64(jpegToPdf(new Uint8Array(ab)));
      });
    }
    if (/^image\//.test(tipas) || /\.(png|webp|bmp)$/.test(vardas)) {
      return rastrasToJpegBytes(file).then(function (jb) { return bytesToBase64(jpegToPdf(jb)); });
    }
    return Promise.reject(new Error("Nepalaikomas failo tipas (PDF, JPG, PNG)"));
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
  // Priima JAV ir EU formatus (CLAUDE.md pinigu konvencija).
  function verteIsTeksto(s) {
    if (!s) return null;
    var v = String(s).replace(/[^\d,.\s]/g, "").trim().replace(/\s+/g, "");
    if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, "").replace(",", ".");   // EU: 743.490,00
    else v = v.replace(/,/g, "");                                          // JAV: 743,490.00
    var n = parseFloat(v);
    if (!isFinite(n) || n <= 0) return null;
    var sveika = Math.floor(n);
    var cnt = Math.round((n - sveika) * 100);
    var txt = sveika.toLocaleString("lt-LT").replace(/[  ]/g, " ");
    return cnt ? txt + "," + String(cnt).padStart(2, "0") : txt;
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
        pastaba: tinkamas ? "kanonizuota deterministiškai (GP_METHODS)"
          : (kanonas ? "būdas „" + kanonas.id + "“ šiame modulyje neturi šablonų"
                     : "neatpažintas būdo tekstas - pasirinkite rankiniu būdu")
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
    return fileToPdfBase64(file).then(function (pdfBase64) {
      return root.GP_AI_PROXY.call({
        module: "pp-salygos",
        model: MODEL,
        maxTokens: MAX_TOKENS,
        system: systemPrompt(),
        userMessage: userText(),
        pdfBase64: pdfBase64,
        signal: opts.signal
      });
    }).then(function (r) {
      if (!r.ok) throw new Error(r.error || "AI klaida");
      var p = parseResponse(r.text);
      if (!p.ok) throw new Error(p.error);
      return { laukai: p.laukai, pastabos: p.pastabos, map: mapFields(p.laukai) };
    });
  }

  root.GP_PARAISKA = {
    VERSION: VERSION,
    analizuoti: analizuoti,
    fileToPdfBase64: fileToPdfBase64,
    jpegToPdf: jpegToPdf,
    parseResponse: parseResponse,
    mapFields: mapFields,
    verteIsTeksto: verteIsTeksto,
    systemPrompt: systemPrompt
  };
})(typeof window !== "undefined" ? window : this);
