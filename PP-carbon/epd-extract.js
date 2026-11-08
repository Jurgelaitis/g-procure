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
 *    tik paruosia duomenis (duomenys) ir parsina atsakyma; instrukcija - serverio
 *    sablone pp-carbon.epd (nuo 2026-11-08).
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
 * 2026-10-17: klaidų žinutės, įspėjimai ir AI užklausa - su lietuviškomis raidėmis (iki tol be jų).
 *
 * 2026-11-04 (naujo naudotojo patikra K5, K6, V8): užklausa prašo reikšmės pažodžiui (modulių sumą skaičiuoja programa), rodiklio,
 * net / gross ir galiojimo; patikrink() - reikšmė turi būti citatoje, o citata - dokumento tekste, jei jį turime (iki tol tikras EPD
 * „GWP-total, net 9,96E+01“ grąžino 99,31 ir citatą be tokio skaičiaus); value: null netampa 0; deklaruotas vienetas skaitomas su
 * skaičiumi („1000 kg“ prieš /kg - dalinama iš 1000, „1 kg“ prieš /vnt - įspėjimas ir neįrašoma). Ši užklausa turi sutapti su
 * worker/epd-proxy.js (testas tikrina).
 *
 * Naudojimas:  <script src="epd-extract.js"></script> -> window.GP_EPD_EXTRACT
 * ========================================================================== */
(function (root) {
  "use strict";

  var VERSION = "0.2";

  // Modelio cia NEnurodom: numatytasis gyvena VIENOJE vietoje -
  // shared/ai-proxy.js (DEFAULT_MODEL). Zr. CLAUDE.md 6 sk.
  // Atsakymo ilgis (2000) - serverio sablone pp-carbon.epd

  // Žinutės naudotojui - puslapio kalba (LT / EN). Be document (testai, Worker'is) - lietuviškai.
  function kalba() {
    var d = root.document, l = d && d.documentElement && d.documentElement.getAttribute("lang");
    return /^en/i.test(l || "") ? "en" : "lt";
  }
  function T(lt, en) { return kalba() === "en" ? en : lt; }

  // --- 1. UZKLAUSOS KONSTRAVIMAS -------------------------------------------

  // DI užduotis pp-carbon.epd (2026-11-08, naudotojo sprendimas - kodo apsauga): sisteminis promptas (griežtas JSON, jokių spėjimų,
  // citatos privalomos) ir užklausos tekstas - privačiame serverio šablone. Modulis siunčia tik duomenis: faktoriaus pavadinimą ir vienetą,
  // o PDF - kaip dokumentą. Tą pačią užduotį naudoja ir viešo epd.html Cloudflare Worker'is (worker/epd-proxy.js).
  var UZDUOTIS = "pp-carbon.epd";
  // factorLabel - kurio faktoriaus EPD ieskome (pvz. "Jungtuvai 110-400 kV"); expectedUnit - musu faktoriaus vienetas (pvz. "kg CO2e/vnt")
  function duomenys(factorLabel, expectedUnit) {
    var d = {};
    if (factorLabel) d.produktas = String(factorLabel).slice(0, 300);
    if (expectedUnit != null && expectedUnit !== "") d.vienetas = String(expectedUnit).slice(0, 60);
    return d;
  }

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
      // Neekranuota kabutė ar eilutės lūžis eilutėje (pvz. lietuviška „ uždaryta ASCII kabute) - struktūrinis taisymas
      // (shared/ai-proxy.js, 2026-09-28); nutrūkęs JSON netaisomas ir lieka null.
      try { return root.GP_AI_PROXY && root.GP_AI_PROXY.taisykJson ? JSON.parse(root.GP_AI_PROXY.taisykJson(clean.slice(a, b + 1))) : null; }
      catch (e2) { return null; }
    }
  }

  function str(x) { return x === null || x === undefined ? "" : String(x).trim(); }

  // Griežtas skaičius iš atsakymo: null, tuščia ir „n/a“ - null (iki 2026-11-04 Number(null) = 0, t. y. reikšmė 0).
  function skaicius(x) {
    if (typeof x === "number") return isFinite(x) ? x : null;
    if (typeof x !== "string") return null;
    var s = x.trim().replace(/−/g, "-").replace(",", ".");
    if (!s) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }
  function rodiklioLaukai(d) {
    var b = str(d.basis).toLowerCase();
    return { indicator: str(d.indicator), basis: b === "net" || b === "gross" ? b : "" };
  }

  // Pilna validacija: grąžina normalizuotą objektą arba {status:"error"}. NIEKO nepriima be citatos, kai status "found".
  function parseResponse(apiResponse) {
    var text = extractText(apiResponse);
    // Nutrūkęs atsakymas (ilgio riba) - klaida su priežastimi, ne „ne JSON“
    if (apiResponse && apiResponse.stop_reason === "max_tokens") {
      return { status: "error", error: T("DI atsakymas nutrūko (per ilgas) - bandykite dar kartą.", "The AI response was cut off (too long) - please try again."), raw: text };
    }
    var data = parseJsonLoose(text);

    if (!data || typeof data !== "object") {
      return { status: "error", error: T("DI atsakymas ne JSON formato", "The AI response is not in JSON format"), raw: text };
    }

    var st = data.status;
    if (st !== "found" && st !== "not_found" && st !== "ambiguous") {
      return { status: "error", error: T("Nežinomas status: ", "Unknown status: ") + st, raw: text };
    }

    if (st === "not_found") {
      return { status: "not_found", notes: str(data.notes) };
    }

    if (st === "ambiguous") {
      var cands = Array.isArray(data.candidates) ? data.candidates.filter(function (c) {
        return c && skaicius(c.value) !== null;
      }).map(function (c) {
        var r = rodiklioLaukai(c);
        return { label: str(c.label), value: skaicius(c.value), valueText: str(c.valueText), unit: str(c.unit),
                 declaredUnit: str(c.declaredUnit), indicator: r.indicator, basis: r.basis, page: skaicius(c.page), quote: str(c.quote) };
      }) : [];
      if (!cands.length) {
        return { status: "not_found", notes: T("DI nurodė kelis variantus, bet nė vieno su skaičiumi", "The AI listed several options, but none with a number") };
      }
      return { status: "ambiguous", candidates: cands, standard: str(data.standard), validUntil: str(data.validUntil), notes: str(data.notes) };
    }

    // status === "found": griežtieji reikalavimai
    var r0 = rodiklioLaukai(data);
    var bendra = { unit: str(data.unit), declaredUnit: str(data.declaredUnit), indicator: r0.indicator, basis: r0.basis,
                   validUntil: str(data.validUntil), page: skaicius(data.page), standard: str(data.standard), notes: str(data.notes) };
    var value = skaicius(data.value);
    // Bendros A1-A3 reikšmės nėra - suma iš atskirų modulių, ją skaičiuoja programa ir tai pasako
    if (value === null && Array.isArray(data.modules) && data.modules.length) {
      var mod = moduliai(data.modules);
      if (mod.klaida) return { status: "error", error: mod.klaida, raw: text };
      return Object.assign(bendra, { status: "found", value: mod.suma, moduliai: mod.sarasas, sumaPrograma: true,
        quote: mod.sarasas.map(function (m) { return m.quote; }).join(" | ") });
    }
    if (value === null || value < 0) {
      return { status: "error", error: T("Rasta reikšmė ne teigiamas skaičius", "The value found is not a positive number"), raw: text };
    }
    if (!data.quote || !String(data.quote).trim()) {
      // Be citatos nepriimam - žmogus negali patikrinti.
      return { status: "error", error: T("DI nepateikė citatos - reikšmė nepriimama", "The AI gave no citation - the value is not accepted"), raw: text };
    }
    return Object.assign(bendra, { status: "found", value: value, valueText: str(data.valueText), quote: str(data.quote) });
  }

  // A1, A2 ir A3 atskirai: visi trys, kiekvienas su skaičiumi ir citata
  function moduliai(sar) {
    var pagal = {};
    sar.forEach(function (m) {
      var k = str(m && m.module).toUpperCase(), v = skaicius(m && m.value);
      if (k && v !== null && v >= 0 && str(m.quote)) pagal[k] = { module: k, value: v, valueText: str(m.valueText), page: skaicius(m.page), quote: str(m.quote) };
    });
    var sarasas = ["A1", "A2", "A3"].map(function (k) { return pagal[k]; });
    if (sarasas.some(function (m) { return !m; })) {
      return { klaida: T("DI nepateikė visų A1, A2 ir A3 reikšmių su citatomis - suma neskaičiuojama", "The AI did not give all of A1, A2 and A3 with citations - no sum is calculated") };
    }
    var suma = sarasas.reduce(function (s, m) { return s + m.value; }, 0);
    return { sarasas: sarasas, suma: Math.round(suma * 1e6) / 1e6 };
  }

  // --- 3. REIKŠMĖ CITATOJE IR CITATA DOKUMENTE -----------------------------

  /* Visi skaičiai tekste su galimais perskaitymais: 9,96E+01 ir 9.96E+01 = 99,6; „1 234,5“, „1,234.5“, „1.234,5“ = 1234,5;
     „1,234“ - ir 1,234, ir 1234. Skaitmuo žodžio dalyje („A1“, „CO2“) - ne skaičius. Be lookbehind (CLAUDE.md 5 sk.). */
  function perskaitymai(m, laipsnis) {
    var z = /^[-−]/.test(m) ? -1 : 1, s = m.replace(/^[+\-−]/, "");
    var grupes = /[   ']/.test(s), be = s.replace(/[   ']/g, "");
    var t = be.lastIndexOf("."), k = be.lastIndexOf(","), rez = [];
    if (t >= 0 && k >= 0) {
      var dec = t > k ? "." : ",";
      rez.push(Number(be.split(dec === "." ? "," : ".").join("").replace(dec, ".")));
    } else if (t >= 0 || k >= 0) {
      var dalys = be.split(t >= 0 ? "." : ",");
      if (dalys.length === 2) {
        rez.push(Number(dalys[0] + "." + dalys[1]));
        if (dalys[1].length === 3 && dalys[0].length <= 3 && !laipsnis) rez.push(Number(dalys.join("")));
      } else rez.push(Number(dalys.join("")));
    } else rez.push(Number(be));
    // „100 200“ gali būti ir du gretimi lentelės skaičiai
    if (grupes) s.split(/[   ']/).forEach(function (d) { rez.push(Number(d.replace(",", "."))); });
    var e = laipsnis ? Math.pow(10, Number(String(laipsnis).replace("−", "-"))) : 1;
    return rez.filter(function (x) { return isFinite(x); }).map(function (x) { return z * x * e; });
  }
  function skaiciaiTekste(tekstas) {
    var re = /(^|[^\p{L}\p{N}.,])([+\-−]?\d{1,3}(?:[   ']\d{3})+(?:[.,]\d+)?|[+\-−]?\d+(?:[.,]\d+)*)(?:\s?[eE]\s?([+\-−]?\d{1,3}))?/gu;
    var rez = [], m;
    while ((m = re.exec(String(tekstas == null ? "" : tekstas)))) rez = rez.concat(perskaitymai(m[2], m[3]));
    return rez;
  }
  // Tik tiksliai tas pats skaičius: artimas apvalinimas (99,31 prieš 9,96E+01 ar 99,6 prieš 100) - ne
  function lygus(a, b) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }
  function yraCitatoje(value, quote) {
    if (typeof value !== "number" || !isFinite(value)) return false;
    return skaiciaiTekste(quote).some(function (x) { return lygus(x, value); });
  }

  // Palyginimui - tik raidės ir skaitmenys mažosiomis, be diakritikų: tarpai, brūkšniai ir lūžiai PDF tekste nesvarbu.
  function palyginimui(s) {
    return String(s == null ? "" : s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }
  /* Ar citata yra dokumente: true / false; null - dokumento teksto neturime (skenuotas PDF, nepavyko perskaityti).
     Lentelėje modelis citatą sudeda iš stulpelio antraštės ir eilutės, todėl užtenka visų citatos žodžių ir skaičių netoli
     vienas kito (RIBA ženklų); sugalvota citata („Visai kitas sakinys“) jų neturi. */
  var RIBA = 600;
  function citataDokumente(quote, tekstas) {
    var dok = palyginimui(tekstas);
    if (!dok) return null;
    var q = palyginimui(quote);
    if (!q) return false;
    if (dok.indexOf(q) >= 0 || dok.split(" ").join("").indexOf(q.split(" ").join("")) >= 0) return true;
    var zodziai = q.split(" ").filter(function (z) { return z.length > 1 || /\d/.test(z); });
    if (!zodziai.length) return false;
    var retas = zodziai.slice().sort(function (a, b) { return b.length - a.length; })[0];
    for (var p = dok.indexOf(retas); p >= 0; p = dok.indexOf(retas, p + 1)) {
      var langas = dok.slice(Math.max(0, p - RIBA), p + RIBA);
      if (zodziai.every(function (z) { return langas.indexOf(z) >= 0; })) return true;
    }
    return false;
  }

  /* Ar reikšmę galima siūlyti patvirtinti: skaičius turi būti citatoje, citata - dokumente (jei tekstą turime). Modulių suma -
     kiekvienas modulis su sava citata. Grąžina { galima, citatojeYra, citataRasta, priezastis }; kai negalima - rodoma pastaba su
     citata ir laukas, kurį žmogus užpildo pats. */
  function patikrink(r, tekstas) {
    var dalys = r && r.moduliai ? r.moduliai : [r || {}];
    var citatoje = dalys.every(function (d) { return yraCitatoje(d.value, d.quote); });
    var rasta = dalys.map(function (d) { return citataDokumente(d.quote, tekstas); });
    var citataRasta = rasta.indexOf(false) >= 0 ? false : (rasta.indexOf(null) >= 0 ? null : true);
    var priezastis = "";
    if (!citatoje) priezastis = T("DI nurodyto skaičiaus citatoje nėra - reikšmė nepatvirtinta.", "The number given by the AI is not in the citation - the value is not verified.");
    else if (citataRasta === false) priezastis = T("Tokios citatos dokumento tekste nerasta - reikšmė nepatvirtinta.", "This citation was not found in the document text - the value is not verified.");
    return { galima: citatoje && citataRasta !== false, citatojeYra: citatoje, citataRasta: citataRasta, priezastis: priezastis };
  }

  // --- 4. VIENETŲ SUDERINAMUMAS --------------------------------------------

  // Normalizuoja vienetą palyginimui: mažosios, be tarpų, be "co2e"/"co2" skirtumo.
  // 2026-09-28: EPD užrašai „kg CO2-eq.“, „kg CO2 eq“, „kg CO₂e“, „m³“ - taškai, brūkšniai, apatiniai ir viršutiniai indeksai
  // nebeskaido vieneto. Iki tol veikė tik „kg CO2e“: net numatytas „co2eq“ nesutapdavo (alternatyva „co2e“ sutapdavo pirma ir
  // palikdavo „q“), tad dažniausio EN 15804 užrašo reikšmė būdavo laikoma nesuderinama ir nepritaikoma.
  function normUnit(u) {
    return str(u).toLowerCase()
      .replace(/[₂²]/g, "2").replace(/³/g, "3")
      .replace(/\s+per\s+/g, "/")
      .replace(/[\s.\-]+/g, "")
      .replace(/co2(?:ekv|eq|e)/g, "co2e");
  }

  // Vardiklio vienetai: bazė ir daugiklis. Tik tos pačios bazės vienetus galima perskaičiuoti.
  var VARDIKLIAI = {
    kg: ["kg", 1], t: ["kg", 1000], g: ["kg", 0.001], m: ["m", 1], km: ["m", 1000], m2: ["m2", 1], m3: ["m3", 1],
    vnt: ["vnt", 1], l: ["l", 1], kwh: ["kwh", 1], mwh: ["kwh", 1000]
  };
  var ZODZIAI = {
    kilogram: "kg", kilograms: "kg", kilogramas: "kg", kilogramui: "kg", tona: "t", tonos: "t", tonai: "t", tonne: "t", tonnes: "t", ton: "t", tons: "t",
    metras: "m", metrui: "m", metre: "m", metres: "m", meter: "m", meters: "m", kilometras: "km", kilometrui: "km", kilometre: "km", kilometer: "km",
    vienetas: "vnt", vienetui: "vnt", vieneto: "vnt", unit: "vnt", units: "vnt", piece: "vnt", pieces: "vnt", pc: "vnt", pcs: "vnt", szt: "vnt", item: "vnt",
    litras: "l", litrui: "l", litre: "l", liter: "l"
  };
  function vardiklioRaktas(z) {
    var x = String(z || "").toLowerCase().replace(/\.+$/, "");
    return VARDIKLIAI[x] ? x : (ZODZIAI[x] || null);
  }
  // „1000 kg“, „1 000 kg“, „1,000 kg“, „1,5 kg“, „1 m³“, „kg“: kiekis ir vienetas. Žodis lyginamas visas: „vnt“ NEsutampa su „t“.
  function skaitykDeklaruota(s) {
    var x = str(s).toLowerCase().replace(/[  ]/g, " ").replace(/[₂²]/g, "2").replace(/³/g, "3")
      .replace(/^(?:declared unit|deklaruotas vienetas)\s*:?\s*/, "").replace(/^(?:per|už|uz|for)\s+/, "").trim();
    var m = /^(\d[\d\s.,']*)?\s*(\p{L}[\p{L}0-9]*)/u.exec(x);
    if (!m) return null;
    var kiekis = 1;
    if (m[1]) {
      var d = m[1].replace(/[\s']/g, "").replace(/[.,]$/, "").split(/[.,]/);
      kiekis = d.length === 2 && d[1].length !== 3 ? Number(d[0] + "." + d[1]) : Number(d.join(""));
    }
    if (!isFinite(kiekis) || kiekis <= 0) return null;
    return { kiekis: kiekis, raktas: vardiklioRaktas(m[2]), zodis: m[2] };
  }
  function formatuok(x) { return String(Math.round(x * 1e6) / 1e6).replace(".", kalba() === "lt" ? "," : "."); }

  // Ar EPD reikšmė (unit + declaredUnit) suderinama su mūsų faktoriaus vienetu?
  // Grąžina { ok, factor, perFactor, converted, warning, paaiskinimas }:
  //  - factor: masės vieneto daugiklis (t -> kg x1000); perFactor: vardiklio daugiklis („1000 kg“ prieš /kg - 1/1000);
  //  - ok:false - nesuderinama arba nežinoma: rodomas įspėjimas, automatiškai neįrašoma (sprendžia žmogus).
  function checkUnitCompatibility(epdUnit, epdDeclaredUnit, ourUnit) {
    var eDalys = normUnit(epdUnit).split("/");      // pvz. "kgco2e" arba "kgco2e/kg"
    var eu = eDalys[0];
    var oDalys = normUnit(ourUnit).split("/");      // pvz. "kgco2e/vnt"
    var ourMass = oDalys[0];
    var ourPerTekstas = oDalys.length > 1 ? str(ourUnit).split("/").slice(1).join("/") : "";

    var factor = null;
    if (eu === ourMass) factor = 1;
    else if (eu === "tco2e" && ourMass === "kgco2e") factor = 1000;
    else if (eu === "kgco2e" && ourMass === "tco2e") factor = 0.001;

    function ne(w) { return { ok: false, factor: null, perFactor: null, converted: false, warning: w, paaiskinimas: "" }; }
    if (factor === null) {
      return ne(T("EPD vienetas (", "The EPD unit (") + str(epdUnit) + T(") nesuderinamas su faktoriaus vienetu (", ") does not match the factor unit (") + str(ourUnit) + ")");
    }
    var masesTekstas = factor === 1 ? "" : T("Reikšmė perskaičiuota iš " + str(epdUnit) + " į " + str(ourUnit).split("/")[0] + ". ", "The value was converted from " + str(epdUnit) + " to " + str(ourUnit).split("/")[0] + ". ");
    if (!ourPerTekstas) return { ok: true, factor: factor, perFactor: 1, converted: factor !== 1, warning: "", paaiskinimas: masesTekstas };

    var our = skaitykDeklaruota(ourPerTekstas);
    var ourV = our && our.raktas ? VARDIKLIAI[our.raktas] : null;
    // Vardiklis pačiame vienete („kg CO2e/kg“): patikslina deklaruotą vienetą, o prieštaraujantis - nesuderinama
    var vienetoV = eDalys.length > 1 ? skaitykDeklaruota(eDalys.slice(1).join("/")) : null;
    var dek = skaitykDeklaruota(epdDeclaredUnit) || (vienetoV && vienetoV.raktas ? vienetoV : null);
    var rodomas = str(epdDeclaredUnit) || (vienetoV ? vienetoV.zodis : "");
    if (!dek) {
      return ne(T("EPD deklaruotas vienetas nenurodytas - palyginti su faktoriaus vardikliu (/", "The EPD declared unit is not stated - it cannot be compared with the factor denominator (/") + ourPerTekstas + T(") negalima. Patikrinkite dokumente.", "). Check the document."));
    }
    var dekV = dek.raktas ? VARDIKLIAI[dek.raktas] : null;
    if (vienetoV && vienetoV.raktas && dekV && VARDIKLIAI[vienetoV.raktas][0] !== dekV[0]) {
      return ne(T("EPD vienetas (", "The EPD unit (") + str(epdUnit) + T(") prieštarauja deklaruotam vienetui (", ") contradicts the declared unit (") + str(epdDeclaredUnit) + ")");
    }
    if (!dekV || !ourV || dekV[0] !== ourV[0]) {
      return ne(T("EPD deklaruotas vienetas („", "The EPD declared unit (“") + rodomas + T("“) neatitinka faktoriaus vardiklio (/", "”) does not match the factor denominator (/") + ourPerTekstas +
        T("). Automatiškai perskaičiuoti negalima - reikšmę vienam vienetui įrašykite patys.", "). It cannot be converted automatically - enter the value per unit yourself."));
    }
    var perFactor = ourV[1] / (dek.kiekis * dekV[1]);
    var paaiskinimas = masesTekstas;
    if (perFactor !== 1) {
      var dalink = perFactor < 1, kartai = formatuok(dalink ? 1 / perFactor : perFactor);
      paaiskinimas += T("EPD reikšmė nurodyta „" + rodomas + "“, o faktoriaus vardiklis - /" + ourPerTekstas + ", todėl reikšmė " + (dalink ? "padalinta iš " : "padauginta iš ") + kartai + ".",
        "The EPD value is stated per “" + rodomas + "” and the factor denominator is /" + ourPerTekstas + ", so the value was " + (dalink ? "divided by " : "multiplied by ") + kartai + ".");
    }
    return { ok: true, factor: factor, perFactor: perFactor, converted: factor !== 1 || perFactor !== 1, warning: "", paaiskinimas: paaiskinimas };
  }

  // Pritaiko konvertavimą rastai reikšmei. Grąžina reikšmę mūsų vienetais arba null, jei nesuderinama.
  // converted - ar reikšmė tikrai perskaičiuota („Konvertuota“ rodoma tik tada); paaiskinimas - kaip.
  function convertValue(found, ourUnit) {
    var chk = checkUnitCompatibility(found.unit, found.declaredUnit, ourUnit);
    if (!chk.ok) return { value: null, warning: chk.warning, converted: false, paaiskinimas: "" };
    return { value: Math.round(found.value * chk.factor * chk.perFactor * 1e9) / 1e9, warning: chk.warning, converted: chk.converted, paaiskinimas: chk.paaiskinimas };
  }

  root.GP_EPD_EXTRACT = {
    version: VERSION,
    UZDUOTIS: UZDUOTIS,
    duomenys: duomenys,
    extractText: extractText,
    parseResponse: parseResponse,
    skaiciaiTekste: skaiciaiTekste,
    yraCitatoje: yraCitatoje,
    citataDokumente: citataDokumente,
    patikrink: patikrink,
    skaitykDeklaruota: skaitykDeklaruota,
    checkUnitCompatibility: checkUnitCompatibility,
    convertValue: convertValue
  };
})(typeof window !== "undefined" ? window : this);
