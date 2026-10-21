/* Tiekėjo pasiūlymo skaitymas su DI (GP_NEG_DI; tobulinimo planas 2.3, C lygis, naudotojo sprendimas 2026-10-21 „PP-negotiation failų
   skaitymas su DI - taip“). Taisyklės (plano 2.3 p.):
   - tik aiškiai paspaudus „Skaityti su DI“ prie konkretaus failo importo peržiūroje (ne masiškai ir ne pagal numatymą) ir tik kai
     įrankis pats (B lygis, be DI) lentelės nerado arba PDF skenuotas (be teksto sluoksnio);
   - siunčiamas tik tas vienas PDF failas per G-Procure serverį į Claude API (GP_AI_PROXY) - prie mygtuko tai pasakoma;
   - DI perrašo pozicijas, kiekius, įkainius, sumas, puslapius ir tiekėjo pavadinimą su citata; NIEKO neskaičiuoja ir nespėja;
   - atsakymas tikrinamas PRIEŠ rodant: tik žinomi laukai ir ribos, skaičiai - baigtiniai ir neneigiami, eilutės kiekis × įkainis -
     su eilutės suma, pozicijų suma - su bendra suma, įkainio tekstas - su skaičiumi; nesutapimai - įspėjimai prie eilutės, ne tylūs
     taisymai; nutrūkęs atsakymas (atsakymo ilgio riba) - klaida, ne dalinis rezultatas;
   - rezultatas - pasiūlymas su žyma „DI pasiūlymas“ (data-di): failas peržiūroje nepažymėtas, priima žmogus („Priimti pažymėtus“).
   Grynos funkcijos (be DOM), todėl tikrinamos testuose be serverio. */
(function (root) {
  "use strict";
  var MAX_TOKENS = 8000;                       // serverio riba (R5, CLAUDE.md 6 sk.)
  var MAX_POZ = 500, MAX_PAV = 300, MAX_VNT = 20, MAX_CIT = 300, MAX_PSL = 5000, MAX_SKAICIUS = 1e12;

  function systemPrompt() {
    return [
      "Tu esi pirkimu dokumentu duomenu israsymo asistentas. Gauni tiekejo komercini pasiulyma (PDF; gali buti skenuotas).",
      "Tavo uzduotis - ISRASYTI pasiulymo kainu lentele (pozicijas) ir tiekejo pavadinima tiksliai taip, kaip parasyta.",
      "",
      "GRIEZTOS TAISYKLES:",
      "1. Atsakyk TIK gryno JSON formatu, be jokio kito teksto, be markdown.",
      "2. Nieko neskaiciuok, netaisyk, nepapildyk ir nespek. Jei reiksmes dokumente nera arba ji neiskaitoma - null.",
      "3. pozicijos - kiekviena kainu lenteles eilute su kaina ta pacia tvarka kaip dokumente: pavadinimas (pazodziui),",
      "   vienetas (kaip parasyta, pvz. \"vnt.\", \"m\", \"kompl.\"), kiekis ir ikainis (vieneto kaina) - JSON skaiciais su tasku",
      "   kaip desimtainiu skyrikliu (\"1 500,50\" -> 1500.5), ikainis_tekstas - vieneto kaina TIKSLIAI kaip parasyta dokumente,",
      "   suma - eilutes suma, jei ji dokumente parasyta (kitaip null), puslapis - PDF puslapio numeris (nuo 1).",
      "4. Tarpines sumas, PVM eilutes, nuolaidu ir \"Is viso\" eilutes i pozicijas NEDEK - bendra suma be PVM - i viso_be_pvm,",
      "   su PVM - i viso_su_pvm (su citata ir puslapiu).",
      "5. kainos_su_pvm - true, jei poziciju ikainiai dokumente nurodyti SU PVM; false - jei be PVM; null - jei neaisku.",
      "6. tiekejas - pasiulyma teikiancios imones pavadinimas su teisine forma ir imones kodas, jei parasyti, su citata.",
      "   Pirkimo vykdytojas (perkantysis subjektas, pvz. LITGRID AB) - NE tiekejas.",
      "7. Jei kainu lenteles nera, bet yra bendra pasiulymo kaina - pozicijos: [] ir viso_be_pvm.",
      "8. Jei dokumentas neiskaitomas - {\"status\":\"neiskaitoma\",\"pastabos\":\"...\"}; jei kainu nera visai -",
      "   {\"status\":\"nera_kainu\",\"pastabos\":\"...\"}.",
      "",
      "JSON schema:",
      "{ \"status\": \"ok\", \"valiuta\": \"EUR\", \"kainos_su_pvm\": false,",
      "  \"tiekejas\": { \"pavadinimas\": \"...\", \"kodas\": \"...\", \"citata\": \"...\", \"puslapis\": 1 } | null,",
      "  \"pozicijos\": [ { \"pavadinimas\": \"...\", \"vienetas\": \"...\", \"kiekis\": 1, \"ikainis\": 0, \"ikainis_tekstas\": \"...\", \"suma\": null, \"puslapis\": 1 } ],",
      "  \"viso_be_pvm\": { \"reiksme\": 0, \"citata\": \"...\", \"puslapis\": 1 } | null,",
      "  \"viso_su_pvm\": { \"reiksme\": 0, \"citata\": \"...\", \"puslapis\": 1 } | null,",
      "  \"pastabos\": \"<trumpa pastaba, jei reikia>\" }"
    ].join("\n");
  }
  function userText(vardas) {
    return "Israsyk pridedamo tiekejo pasiulymo kainu lentele" + (vardas ? " (failas: " + String(vardas).slice(0, 120) + ")" : "") +
           ". Atsakyk grieztai pagal sistemos zinuteje aprasyta JSON schema.";
  }

  var L = function (k, lt, en) { return k === "en" ? en : lt; };
  var str = function (x, n) { return typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, n) : ""; };
  var M = function () { return root.GP_MONEY; };
  /* Skaičius iš DI: JSON skaičius arba (jei modelis grąžino tekstą) - per GP_MONEY.parseSkaicius; neigiamas, begalinis ar per didelis - null */
  function sk(v) {
    var n = typeof v === "number" ? v : (typeof v === "string" && v.trim() && M() ? M().parseSkaicius(v) : null);
    return typeof n === "number" && isFinite(n) && n >= 0 && n < MAX_SKAICIUS ? n : null;
  }
  function psl(v) { var n = Number(v); return Number.isInteger(n) && n >= 1 && n <= MAX_PSL ? n : null; }
  var apv = function (n) { return Math.round(n * 100) / 100; };
  var fmt = function (n, k) { return new Intl.NumberFormat(k === "en" ? "en-GB" : "lt-LT", { maximumFractionDigits: 4 }).format(n); };
  /* Ar dokumento tekste parašytas įkainis atitinka DI skaičių (pinigų ir skaičių taisyklėmis - „1.500“ gali būti ir 1 500, ir 1,5) */
  function tekstasAtitinka(t, n) {
    if (!t || !M()) return true;
    var a = M().parseEUR(t), b = M().parseSkaicius(t), lyg = function (x) { return x != null && Math.abs(x - n) <= 0.005; };
    return lyg(a) || lyg(b);
  }
  function suma(x) {
    if (!x || typeof x !== "object") return null;
    var r = sk(x.reiksme);
    return r == null ? null : { reiksme: r, citata: str(x.citata, MAX_CIT), puslapis: psl(x.puslapis) };
  }

  /* Atsakymas -> { ok, pozicijos, viso, visoSuPvm, tiekejas, valiuta, kainosSuPvm, ispejimai, atmesta, pastabos } arba { ok: false, error } */
  function issAtsakymo(text, stop, kalba) {
    var k = kalba;
    if (stop === "max_tokens") return { ok: false, error: L(k, "Pasiūlymas per ilgas perskaityti vienu kartu - DI atsakymas nutrūko. Išsaugokite tik įkainių lentelės puslapius ir bandykite dar kartą.", "The offer is too long to read at once - the AI response was cut off. Save only the pages with the price table and try again.") };
    var m = String(text || "").match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: L(k, "DI atsakyme nėra JSON", "The AI response contains no JSON") };
    var d;
    try { d = JSON.parse(m[0]); }
    catch (e) {
      try { d = JSON.parse(root.GP_AI_PROXY.taisykJson(m[0])); }
      catch (e2) { return { ok: false, error: L(k, "DI atsakymas sugadintas", "The AI response is corrupted") + " (" + e.message + ")" }; }
    }
    if (d && d.status === "neiskaitoma") return { ok: false, error: L(k, "DI nurodo, kad dokumentas neįskaitomas", "The AI reports that the document is unreadable") + (d.pastabos ? ": " + str(d.pastabos, MAX_CIT) : "") };
    if (d && d.status === "nera_kainu") return { ok: false, error: L(k, "DI pasiūlyme kainų nerado", "The AI found no prices in the offer") + (d.pastabos ? ": " + str(d.pastabos, MAX_CIT) : "") };
    if (!d || d.status !== "ok" || (d.pozicijos != null && !Array.isArray(d.pozicijos))) return { ok: false, error: L(k, "DI atsakymas neatitinka schemos", "The AI response does not match the schema") };

    var ispejimai = [], atmesta = 0, poz = [];
    (d.pozicijos || []).slice(0, MAX_POZ).forEach(function (x) {
      if (!x || typeof x !== "object") { atmesta++; return; }
      var name = str(x.pavadinimas, MAX_PAV), qty = sk(x.kiekis), price = sk(x.ikainis), eilSuma = sk(x.suma);
      if (!name || qty == null || price == null) { atmesta++; return; }
      var p = { name: name, unit: str(x.vienetas, MAX_VNT), qty: qty, price: price, total: qty * price, puslapis: psl(x.puslapis), ispejimai: [] };
      if (eilSuma != null && Math.abs(qty * price - eilSuma) > Math.max(0.01, 0.005 * eilSuma))
        p.ispejimai.push(L(k, "kiekis × įkainis = " + fmt(apv(qty * price), k) + ", o faile eilutės suma " + fmt(eilSuma, k),
          "quantity × unit price = " + fmt(apv(qty * price), k) + ", but the line total in the file is " + fmt(eilSuma, k)));
      var t = str(x.ikainis_tekstas, 40);
      if (t && !tekstasAtitinka(t, price))
        p.ispejimai.push(L(k, "faile įkainis parašytas „" + t + "“, DI perskaitė " + fmt(price, k), "the unit price in the file reads “" + t + "”, the AI read " + fmt(price, k)));
      poz.push(p);
    });
    if ((d.pozicijos || []).length > MAX_POZ) ispejimai.push(L(k, "Pozicijų daugiau kaip " + MAX_POZ + " - rodomos pirmos " + MAX_POZ + ".", "More than " + MAX_POZ + " items - the first " + MAX_POZ + " are shown."));
    if (atmesta) ispejimai.push(L(k, "Eilučių be pavadinimo, kiekio ar įkainio: " + atmesta + " - jos neperkeliamos.", "Lines without a name, quantity or unit price: " + atmesta + " - they are not transferred."));
    var viso = suma(d.viso_be_pvm), visoSuPvm = suma(d.viso_su_pvm);
    var pozSuma = poz.reduce(function (a, p) { return a + p.total; }, 0);
    if (poz.length && viso && Math.abs(pozSuma - viso.reiksme) > Math.max(1, 0.005 * viso.reiksme))
      ispejimai.push(L(k, "Pozicijų suma (" + fmt(apv(pozSuma), k) + ") nesutampa su pasiūlymo suma be PVM (" + fmt(viso.reiksme, k) + ") - patikrinkite, ar perskaitytos visos eilutės.",
        "The total of the items (" + fmt(apv(pozSuma), k) + ") does not match the offer total excl. VAT (" + fmt(viso.reiksme, k) + ") - check that all lines were read."));
    var kainosSuPvm = d.kainos_su_pvm === true ? true : d.kainos_su_pvm === false ? false : null;
    if (kainosSuPvm === true) ispejimai.push(L(k, "DI nurodo, kad įkainiai faile - su PVM; įrankis lygina kainas be PVM, todėl jie neperskaičiuoti - patikrinkite.", "The AI reports that the unit prices in the file include VAT; the tool compares prices excl. VAT, so they are not recalculated - check."));
    var valiuta = /^[A-Z]{3}$/.test(String(d.valiuta || "")) ? d.valiuta : null;
    if (valiuta && valiuta !== "EUR") ispejimai.push(L(k, "Pasiūlymo valiuta - " + valiuta + ", ne EUR: sumos neperskaičiuotos.", "The offer currency is " + valiuta + ", not EUR: amounts are not converted."));
    if (!poz.length && !viso) return { ok: false, error: L(k, "DI pozicijų su kiekiu ir įkainiu ir bendros sumos be PVM nerado", "The AI found no items with a quantity and unit price and no total excl. VAT") + (atmesta ? " (" + L(k, "atmesta eilučių: ", "lines rejected: ") + atmesta + ")" : "") };
    var tk = d.tiekejas && typeof d.tiekejas === "object" ? d.tiekejas : null, kodas = tk ? str(String(tk.kodas == null ? "" : tk.kodas), 20) : "";
    var tiekejas = tk && str(tk.pavadinimas, 120) ? { pavadinimas: str(tk.pavadinimas, 120), kodas: /^\d{7,12}$/.test(kodas) ? kodas : "", citata: str(tk.citata, MAX_CIT), puslapis: psl(tk.puslapis) } : null;
    return { ok: true, pozicijos: poz, viso: viso, visoSuPvm: visoSuPvm, tiekejas: tiekejas, valiuta: valiuta, kainosSuPvm: kainosSuPvm, ispejimai: ispejimai, atmesta: atmesta, pastabos: str(d.pastabos, MAX_CIT) };
  }

  /* „1 poziciją“, „3 pozicijas“, „10 pozicijų“ (galininkas) */
  function pozicijos(n) { var d = n % 10, s = n % 100; return n + (d === 1 && s !== 11 ? " poziciją" : d >= 2 && d <= 9 && (s < 12 || s > 19) ? " pozicijas" : " pozicijų"); }

  /* Patikrintas atsakymas -> to paties pavidalo rezultatas kaip įrankio skaitytuvų (positions / fixed), su žyme di ir įspėjimais */
  function iRezultata(a, fileName, kalba) {
    var k = kalba, bendri = { di: true, diIspejimai: a.ispejimai.slice(), diPastabos: a.pastabos, diViso: a.viso, diVisoSuPvm: a.visoSuPvm, fileName: fileName };
    if (a.pozicijos.length) {
      var total = a.pozicijos.reduce(function (s, p) { return s + p.total; }, 0), sp = a.pozicijos.filter(function (p) { return p.ispejimai.length; }).length;
      return Object.assign({ ok: true, positions: a.pozicijos, rowsFound: a.pozicijos.length, total: total,
        message: L(k, "DI perskaitė " + pozicijos(a.pozicijos.length) + (sp ? ", iš jų " + sp + " su įspėjimu" : "") + ". Patikrinkite su pasiūlymu ir pažymėkite failą.",
          "The AI read " + a.pozicijos.length + " items" + (sp ? ", " + sp + " of them with a warning" : "") + ". Check them against the offer and select the file.") }, bendri);
    }
    return Object.assign({ ok: true, fixed: { totalPrice: a.viso.reiksme }, total: a.viso.reiksme, rowsFound: 0, positions: [],
      message: L(k, "DI pozicijų nerado, tik bendrą sumą be PVM. Patikrinkite su pasiūlymu ir pažymėkite failą.", "The AI found no items, only the total excl. VAT. Check it against the offer and select the file.") }, bendri);
  }

  function base64(u8) {
    var s = "", ZINGSNIS = 0x8000;
    for (var i = 0; i < u8.length; i += ZINGSNIS) s += String.fromCharCode.apply(null, u8.subarray(i, i + ZINGSNIS));
    return btoa(s);
  }
  var arPdf = function (file) { return !!file && (/\.pdf$/i.test(file.name || "") || file.type === "application/pdf"); };

  /* Visas kelias: PDF failas -> DI -> patikrintas atsakymas (issAtsakymo). Siunčiamas tik šis failas; atšaukus (signal) - nesiunčiama. */
  function perskaityk(file, opts) {
    opts = opts || {};
    var k = opts.kalba, P = root.GP_AI_PROXY;
    if (!P) return Promise.reject(new Error(L(k, "DI jungtis neprijungta", "The AI connection is not loaded")));
    if (!arPdf(file)) return Promise.reject(new Error(L(k, "DI skaito tik PDF pasiūlymus.", "The AI reads PDF offers only.")));
    if (file.size > P.MAX_PDF_BAITU) return Promise.reject(new Error(L(k, "PDF per didelis DI skaitymui (" + (file.size / 1048576).toFixed(1) + " MB, riba " + Math.floor(P.MAX_PDF_BAITU / 1048576) + " MB). Išsaugokite tik įkainių lentelės puslapius.",
      "The PDF is too large for AI reading (" + (file.size / 1048576).toFixed(1) + " MB, limit " + Math.floor(P.MAX_PDF_BAITU / 1048576) + " MB). Save only the pages with the price table.")));
    return file.arrayBuffer().then(function (ab) {
      if (opts.signal && opts.signal.aborted) throw Object.assign(new Error("Atšaukta"), { name: "AbortError" });
      var b64 = base64(new Uint8Array(ab));
      if (b64.length > P.MAX_BASE64) throw new Error(L(k, "PDF per didelis DI skaitymui.", "The PDF is too large for AI reading."));
      return P.call({ module: "pp-negotiation", maxTokens: MAX_TOKENS, system: systemPrompt(), userMessage: userText(file.name), pdfBase64: b64, signal: opts.signal });
    }).then(function (r) {
      if (!r.ok) throw new Error(r.error || L(k, "DI klaida", "AI error"));
      var a = issAtsakymo(r.text, r.raw && r.raw.stop_reason, k);
      if (!a.ok) throw new Error(a.error);
      return a;
    });
  }

  root.GP_NEG_DI = { systemPrompt: systemPrompt, userText: userText, issAtsakymo: issAtsakymo, iRezultata: iRezultata, perskaityk: perskaityk, arPdf: arPdf, MAX_TOKENS: MAX_TOKENS, MAX_POZ: MAX_POZ };
})(typeof window !== "undefined" ? window : this);
