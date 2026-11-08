/* ============================================================================
 * G-Procure sankcijų sąrašų patikra - gryna logika (be įvesties ir išvesties).
 *
 * Paskirtis (2026-11-08, naudotojo sprendimas - PP-esg tiekėjo patikrai tik „Automatinė sankcijų sąrašų patikra“,
 * asmens duomenys - „Rodyti tik bendrovėms“): serveris kartą per parą parsisiunčia oficialius sankcijų sąrašus
 * (ES, JT, OFAC, JK), pasilieka TIK subjektų (ne fizinių asmenų) įrašus ir į užklausą su tiekėjo pavadinimu
 * atsako galimais atitikmenimis su balu ir paaiškinimu. Sprendimą, ar tai tas pats subjektas, priima žmogus.
 *
 * Šis failas neturi priklausomybių ir veikia ir Node (serveris), ir naršyklėje (testai - serveris/testai.html).
 * Įvestis ir išvestis (tinklas, failai, HTTP) - sankcijos-serveris.js. Diegimas ir saugumas - README.md.
 *
 * Principai:
 *  - Sąrašų failai - nepatikimi duomenys: tik išvardyti laukai, ilgio ribos, valdymo simboliai šalinami, nuorodos -
 *    tik žinomi oficialūs adresai (OFAC paieška, EUR-Lex).
 *  - Fizinių asmenų įrašai (ir laivai, orlaiviai) neskaitomi ir nesaugomi - ieškoma tik tarp subjektų.
 *  - Nepasiektas ar neįkeltas sąrašas NIEKADA nerodomas kaip „atitikmenų nerasta“ - būsena „nepatikrinta“ su priežastimi.
 *  - Užklausos turinys (tiekėjo pavadinimas) atsakyme neatkartojamas ir nežurnalizuojamas.
 * ============================================================================ */
(function (saknis, fabrikas) {
  if (typeof module === "object" && module.exports) module.exports = fabrikas();
  else saknis.GP_SANKCIJOS_API = fabrikas();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSIJA = "2026-11-08";
  var KILMES = ["https://g-procure.com", "https://www.g-procure.com"];
  var VIETINE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

  /* Sąrašai. ES failo raktas (token=...) - viešas: jį skelbia oficialus FSF RSS (https://webgate.ec.europa.eu/fsd/fsf/public/rss)
     ir data.europa.eu duomenų rinkinys; tai ne slaptas prieigos raktas. ES serveris failą generuoja ilgiau kaip minutę ir
     kartais iš eilės atsako HTTP 500 - todėl daugiau bandymų ir ilgesnės pauzės. OFAC - du failai (SDN ir kitų sąrašų
     konsoliduotas), atnaujinama tik pavykus abiem. min - mažiausias subjektų skaičius, kad naujas failas būtų priimtas
     (išmatuota 2026-11-08: JT 274, OFAC 10 110 + 368, JK 1 667 subjektai). */
  var SARASAI = [
    { id: "es", pav: "ES konsoliduotas finansinių sankcijų sąrašas", pavEn: "EU consolidated financial sanctions list",
      failai: ["https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw"],
      formatas: "es", min: 500, bandymu: 6, laikasS: 300 },
    { id: "jt", pav: "JT Saugumo Tarybos konsoliduotas sąrašas", pavEn: "UN Security Council Consolidated List",
      failai: ["https://scsanctions.un.org/resources/xml/en/consolidated.xml"], formatas: "jt", min: 150, bandymu: 3, laikasS: 120 },
    { id: "ofac", pav: "OFAC (JAV) SDN ir kiti sąrašai", pavEn: "OFAC (USA) SDN and other lists",
      failai: ["https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML",
        "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/CONSOLIDATED.XML"],
      formatas: "ofac", min: 5000, bandymu: 3, laikasS: 180 },
    { id: "jk", pav: "JK sankcijų sąrašas (FCDO)", pavEn: "UK Sanctions List (FCDO)",
      failai: ["https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.xml"], formatas: "jk", min: 800, bandymu: 3, laikasS: 180 }
  ];
  var MAX_FAILO_BAITU = 120 * 1048576;        // OFAC SDN 2026-11-08 - 29,6 MB, JK - 22 MB, ES - apie 25 MB
  var PASENES_VAL = 72;                        // kopija senesnė - atsakyme pažymima „pasenusi“
  var MAX_KANDIDATU_SARASE = 10, MAX_KANDIDATU = 30;
  var SLENKSTIS = 70;                          // mažiausias balas, kad įrašas būtų rodomas kaip galimas atitikmuo

  // ---------------------------------------------------------------------------
  // Tekstas ir XML
  // ---------------------------------------------------------------------------
  var VALDYMO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g;
  var ENTITETAI = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
  function dekoduok(s) {
    return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-z]{2,4});/g, function (m, k) {
      if (k[0] === "#") {
        var n = k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
        return n > 0 && n <= 0x10FFFF && (n < 0xD800 || n > 0xDFFF) ? String.fromCodePoint(n) : "";
      }
      return ENTITETAI.hasOwnProperty(k) ? ENTITETAI[k] : m;
    });
  }
  function svarus(v, max) {
    if (v === null || v === undefined) return null;
    var s = dekoduok(v).replace(VALDYMO, "").replace(/\s+/g, " ").trim();
    if (!s) return null;
    if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
    return s;
  }
  // Elementų turiniai: [{ attr: "<pradžios žymės atributai>", vidus: "..." }]; vardas - be priešdėlio (ES - numatytoji vardų sritis)
  function elementai(xml, vardas) {
    var re = new RegExp("<(?:[A-Za-z0-9_]+:)?" + vardas + "(\\s[^>]*?)?(?:/>|>([\\s\\S]*?)</(?:[A-Za-z0-9_]+:)?" + vardas + ">)", "g");
    var out = [], m;
    while ((m = re.exec(xml))) out.push({ attr: m[1] || "", vidus: m[2] || "" });
    return out;
  }
  function vaikas(vidus, vardas) { var e = elementai(vidus, vardas); return e.length ? e[0].vidus : null; }
  function vaikai(vidus, vardas) { return elementai(vidus, vardas).map(function (e) { return e.vidus; }); }
  function atributai(attr) {
    var o = {}, re = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g, m;
    while ((m = re.exec(attr || ""))) o[m[1]] = dekoduok(m[3] !== undefined ? m[3] : m[4]);
    return o;
  }
  function unikalus(sar, max, ilgis) {
    var out = [], mat = {};
    (sar || []).forEach(function (x) {
      var s = svarus(x, ilgis || 300);
      if (!s || out.length >= max) return;
      var r = s.toLowerCase();
      if (mat[r]) return;
      mat[r] = 1; out.push(s);
    });
    return out;
  }
  // Datos: „MM/DD/YYYY“ (OFAC), „DD/MM/YYYY“ (JK), ISO (JT, ES) -> „YYYY-MM-DD“
  function data(v, tvarka) {
    if (typeof v !== "string") return null;
    var s = v.trim(), m, y, mo, d;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s))) { y = +m[3]; if (tvarka === "mdy") { mo = +m[1]; d = +m[2]; } else { d = +m[1]; mo = +m[2]; } }
    else return null;
    if (y < 1945 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
    return y + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  function kodas(v) {
    var s = String(v == null ? "" : v).replace(/[^0-9A-Za-z]/g, "").toUpperCase();
    return s.length >= 5 && s.length <= 30 ? s : null;
  }

  // ---------------------------------------------------------------------------
  // Sąrašų skaitymas -> įrašai { s, id, v, a, c, p, k, nr, d, u, r }
  //   s - sąrašas, id - įrašo id sąraše, v - pavadinimas, a - kiti pavadinimai, c - šalys, p - programos ar režimai,
  //   k - registracijos ar mokesčių kodai, nr - oficialus nuorodos numeris, d - įtraukimo data, u - oficialaus įrašo nuoroda,
  //   r - OFAC sąrašas (SDN / ne SDN)
  // ---------------------------------------------------------------------------
  function irasas(o) {
    var v = svarus(o.v, 300);
    if (!v || !o.id || !/^[A-Za-z0-9._-]{1,40}$/.test(String(o.id))) return null;
    var a = unikalus([v].concat(o.a || []), 31).slice(1);
    var u = typeof o.u === "string" && /^https:\/\/(sanctionssearch\.ofac\.treas\.gov\/Details\.aspx\?id=\d{1,9}|eur-lex\.europa\.eu\/[A-Za-z0-9\/._?=&:%-]{1,300})$/.test(o.u) ? o.u : null;
    return {
      s: o.s, id: String(o.id), v: v, a: a, c: unikalus(o.c, 10, 80), p: unikalus(o.p, 10, 160),
      k: unikalus((o.k || []).map(kodas).filter(Boolean), 10, 30), nr: svarus(o.nr, 40), d: data(o.d) || null, u: u,
      r: o.r === "SDN" || o.r === "ne-SDN" ? o.r : null
    };
  }
  function rezultatas(irasai, saltinioData, asmenu, atmesta) {
    return { irasai: irasai, saltinioData: saltinioData || null, asmenu: asmenu, atmesta: atmesta };
  }

  // OFAC SDN.XML ir CONSOLIDATED.XML: sdnEntry, sdnType Entity; vardas - lastName; aka; programos; adresų šalys; kodai
  var OFAC_KODAI = /registration|tax id|company number|business number|commercial registry|legal entity number|license|vat|inn|ogrn|kpp|okpo/i;
  function skaitykOFAC(xml, r) {
    var irasai = [], asmenu = 0, atmesta = 0;
    var data0 = data(svarus(vaikas(String(xml), "Publish_Date"), 20), "mdy");
    elementai(String(xml), "sdnEntry").forEach(function (e) {
      var tipas = svarus(vaikas(e.vidus, "sdnType"), 30);
      if (tipas !== "Entity") { if (tipas === "Individual") asmenu++; return; }
      var uid = svarus(vaikas(e.vidus, "uid"), 12);
      var akaList = vaikas(e.vidus, "akaList") || "";
      var a = vaikai(akaList, "aka").map(function (x) { return [svarus(vaikas(x, "firstName"), 150), svarus(vaikas(x, "lastName"), 300)].filter(Boolean).join(" "); });
      var c = vaikai(vaikas(e.vidus, "addressList") || "", "address").map(function (x) { return vaikas(x, "country"); }).filter(Boolean);
      var k = vaikai(vaikas(e.vidus, "idList") || "", "id").filter(function (x) { return OFAC_KODAI.test(svarus(vaikas(x, "idType"), 80) || ""); })
        .map(function (x) { return vaikas(x, "idNumber"); });
      var o = irasas({ s: "ofac", id: uid, v: vaikas(e.vidus, "lastName"), a: a, c: c, p: vaikai(vaikas(e.vidus, "programList") || "", "program"), k: k,
        nr: uid, u: uid && /^\d{1,9}$/.test(uid) ? "https://sanctionssearch.ofac.treas.gov/Details.aspx?id=" + uid : null, r: r || "SDN" });
      if (o) irasai.push(o); else atmesta++;
    });
    return rezultatas(irasai, data0, asmenu, atmesta);
  }

  // JT: CONSOLIDATED_LIST/ENTITIES/ENTITY (INDIVIDUALS - neskaitoma); vardas - FIRST_NAME; ENTITY_ALIAS/ALIAS_NAME
  function skaitykJT(xml) {
    var s = String(xml), irasai = [], atmesta = 0;
    var gen = /<CONSOLIDATED_LIST\b[^>]*\bdateGenerated="([^"]+)"/.exec(s);
    var asmenu = (s.match(/<INDIVIDUAL>/g) || []).length;
    elementai(s, "ENTITY").forEach(function (e) {
      var v = [vaikas(e.vidus, "FIRST_NAME"), vaikas(e.vidus, "SECOND_NAME"), vaikas(e.vidus, "THIRD_NAME")].map(function (x) { return svarus(x, 300); }).filter(Boolean).join(" ");
      var a = elementai(e.vidus, "ENTITY_ALIAS").map(function (x) { return vaikas(x.vidus, "ALIAS_NAME"); }).concat([vaikas(e.vidus, "NAME_ORIGINAL_SCRIPT")]);
      var c = elementai(e.vidus, "ENTITY_ADDRESS").map(function (x) { return vaikas(x.vidus, "COUNTRY"); });
      var o = irasas({ s: "jt", id: svarus(vaikas(e.vidus, "DATAID"), 20), v: v, a: a, c: c, p: [vaikas(e.vidus, "UN_LIST_TYPE")],
        nr: vaikas(e.vidus, "REFERENCE_NUMBER"), d: svarus(vaikas(e.vidus, "LISTED_ON"), 20) });
      if (o) irasai.push(o); else atmesta++;
    });
    return rezultatas(irasai, gen ? data(gen[1]) : null, asmenu, atmesta);
  }

  // JK (FCDO): Designations/Designation, IndividualEntityShip Entity; Names/Name/Name6 + NameType; NonLatinNames; RegimeName
  function skaitykJK(xml) {
    var s = String(xml), irasai = [], asmenu = 0, atmesta = 0;
    var gen = data(svarus(vaikas(s, "DateGenerated"), 20), "dmy");
    elementai(s, "Designation").forEach(function (e) {
      var tipas = svarus(vaikas(e.vidus, "IndividualEntityShip"), 30);
      if (tipas !== "Entity") { if (tipas === "Individual") asmenu++; return; }
      var vardai = vaikai(vaikas(e.vidus, "Names") || "", "Name").map(function (x) {
        return { v: svarus(vaikas(x, "Name6"), 300), tipas: (svarus(vaikas(x, "NameType"), 40) || "").toLowerCase() };
      }).filter(function (x) { return x.v; });
      var pirmas = vardai.filter(function (x) { return x.tipas === "primary name"; })[0] || vardai[0];
      var kiti = vardai.filter(function (x) { return x !== pirmas; }).map(function (x) { return x.v; })
        .concat(vaikai(vaikas(e.vidus, "NonLatinNames") || "", "NameNonLatinScript"));
      var o = irasas({ s: "jk", id: svarus(vaikas(e.vidus, "UniqueID"), 20), v: pirmas ? pirmas.v : null, a: kiti,
        c: vaikai(vaikas(e.vidus, "Addresses") || "", "AddressCountry"), p: [vaikas(e.vidus, "RegimeName")],
        k: vaikai(vaikas(e.vidus, "EntityDetails") || "", "BusinessRegistrationNumber"), nr: vaikas(e.vidus, "UniqueID"),
        d: data(svarus(vaikas(e.vidus, "DateDesignated"), 20), "dmy") });
      if (o) irasai.push(o); else atmesta++;
    });
    return rezultatas(irasai, gen, asmenu, atmesta);
  }

  // ES (FSF XML 1.1): export/sanctionEntity; subjectType code="enterprise" (person - neskaitoma); nameAlias wholeName;
  // regulation programme ir publicationUrl; address countryIso2Code / countryDescription; identification number
  function skaitykES(xml) {
    var s = String(xml), irasai = [], asmenu = 0, atmesta = 0;
    var gen = /<(?:[A-Za-z0-9_]+:)?export\b[^>]*\bgenerationDate="([^"]+)"/.exec(s);
    elementai(s, "sanctionEntity").forEach(function (e) {
      var ea = atributai(e.attr);
      var st = elementai(e.vidus, "subjectType")[0];
      var kod = st ? (atributai(st.attr).code || "") : "";
      if (kod !== "enterprise") { if (kod === "person") asmenu++; return; }
      var vardai = elementai(e.vidus, "nameAlias").map(function (x) { return atributai(x.attr).wholeName; }).filter(Boolean);
      var reg = elementai(e.vidus, "regulation");
      var c = elementai(e.vidus, "address").map(function (x) { var a = atributai(x.attr); return a.countryDescription && a.countryDescription !== "UNKNOWN" ? a.countryDescription : null; });
      var k = elementai(e.vidus, "identification").map(function (x) { return atributai(x.attr).number; });
      var url = reg.map(function (x) { return svarus(vaikas(x.vidus, "publicationUrl"), 300); }).filter(Boolean)[0] || null;
      var o = irasas({ s: "es", id: ea.logicalId, v: vardai[0], a: vardai.slice(1), c: c, k: k,
        p: reg.map(function (x) { return atributai(x.attr).programme; }), nr: ea.euReferenceNumber || null,
        d: (reg.map(function (x) { return atributai(x.attr).publicationDate; }).filter(Boolean).sort()[0]) || ea.designationDate || null, u: url });
      if (o) irasai.push(o); else atmesta++;
    });
    return rezultatas(irasai, gen ? data(gen[1]) : null, asmenu, atmesta);
  }

  function skaityk(formatas, failai) {
    // failai - XML tekstai pagal SARASAI[...].failai tvarką
    if (formatas === "ofac") {
      // Tas pats subjektas gali būti abiejuose OFAC failuose (tas pats uid) - lieka vienas, SDN
      var a = skaitykOFAC(failai[0], "SDN"), b = failai.length > 1 ? skaitykOFAC(failai[1], "ne-SDN") : rezultatas([], null, 0, 0);
      var buvo = {}; a.irasai.forEach(function (o) { buvo[o.id] = 1; });
      return rezultatas(a.irasai.concat(b.irasai.filter(function (o) { return !buvo[o.id]; })), a.saltinioData, a.asmenu + b.asmenu, a.atmesta + b.atmesta);
    }
    if (formatas === "jt") return skaitykJT(failai[0]);
    if (formatas === "jk") return skaitykJK(failai[0]);
    if (formatas === "es") return skaitykES(failai[0]);
    throw new Error("nezinomas-formatas");
  }
  // Naujas sąrašas priimamas: bent min subjektų ir ne mažiau 80 % ankstesnio (kitaip - netikėta sandara ar dalinis failas)
  function priimtinasKiekis(sarasoId, naujas, senas) {
    var cfg = SARASAI.filter(function (x) { return x.id === sarasoId; })[0];
    if (!cfg || !(naujas >= cfg.min)) return false;
    return !senas || naujas >= Math.floor(senas * 0.8);
  }

  // ---------------------------------------------------------------------------
  // Pavadinimų normalizavimas ir atitikmenys
  // ---------------------------------------------------------------------------
  var KIRIL = { "а": "a", "б": "b", "в": "v", "г": "g", "ґ": "g", "д": "d", "е": "e", "ё": "e", "є": "ie", "ж": "zh", "з": "z", "и": "i", "і": "i", "ї": "i",
    "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ў": "u", "ф": "f", "х": "kh", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "iu", "я": "ia" };
  var SPEC = { "ß": "ss", "æ": "ae", "œ": "oe", "ø": "o", "ł": "l", "đ": "d", "ð": "d", "þ": "th", "ı": "i", "ĸ": "k" };
  // Teisinės formos ir jų ilgosios formos (po normalizavimo; žodžių sekos)
  var FORMOS = [
    "uzdaroji akcine bendrove", "akcine bendrove", "viesoji istaiga", "individuali imone", "mazoji bendrija", "tikroji ukine bendrija",
    "komanditine ukine bendrija", "limited liability company", "limited liability partnership", "public joint stock company",
    "closed joint stock company", "open joint stock company", "joint stock company", "public limited company", "private limited company",
    "limited partnership", "obshchestvo s ogranichennoi otvetstvennostiu", "obshchestvo s ogranichennoi otvetstvennostu",
    "obshchestvo s ogranichennoy otvetstvennostyu", "aktsionernoe obshchestvo", "publichnoe aktsionernoe obshchestvo",
    "otkrytoe aktsionernoe obshchestvo", "zakrytoe aktsionernoe obshchestvo", "spolka z ograniczona odpowiedzialnoscia",
    "spolka akcyjna", "gesellschaft mit beschrankter haftung", "societe anonyme", "sociedad anonima", "societa per azioni",
    "sabiedriba ar ierobezotu atbildibu", "osauhing", "aktsiaselts", "sp zoo", "sp z oo", "sp z o o", "s a", "s r l", "s p a", "b v", "n v"
  ].map(function (f) { return f.split(" ").map(raktas); }).sort(function (a, b) { return b.length - a.length; });
  var FORMU_ZODZIAI = {};
  ("uab ab vsi mb ii tub kub llc ltd limited inc incorporated corp corporation co company plc llp lp jsc ojsc pjsc cjsc ojc pao oao zao ooo ao tov pat " +
   "gmbh ag kg kgaa se sa sas sarl srl spa bv nv oy oyj as asa aps sia ou fze fzco fzc fzllc dmcc sdn bhd pte pvt pty ltda cv eood ood ad dd doo " +
   "sro spzoo zoo kft zrt nyrt").split(" ").forEach(function (z) { FORMU_ZODZIAI[raktas(z)] = 1; });
  var STOP = {}; "the of and for de la le les del der die das und et y e ir bei a an".split(" ").forEach(function (z) { STOP[z] = 1; });
  // Dažni bendriniai žodžiai: vien jų sutapimas nelaikomas atitikmeniu
  var BENDRINIAI = {};
  ("international trading trade group holding holdings services service industries industry industrial engineering energy energija " +
   "technologies technology tech global general national investment investments development construction logistics systems system " +
   "solutions consulting management enterprise enterprises partners products import export impeks market center centre company " +
   "network networks resources commercial commerce production manufacturing plant factory works electric electro elektros " +
   "statyba statybos prekyba paslaugos sistemos technika projektai projects transport transportas baltic baltija lietuva lithuania " +
   "europe european eurasia asia russia russian rossiya middle east new first").split(" ").forEach(function (z) { BENDRINIAI[z] = 1; });

  function lotyniskai(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/[Ѐ-ӿ]/g, function (ch) { return KIRIL.hasOwnProperty(ch) ? KIRIL[ch] : " "; })
      .replace(/[ßæœøłđðþıĸ]/g, function (ch) { return SPEC[ch]; })
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  // Tarimo raktas palyginimui: transliteracijos skirtumai (ye/e, ya/ia, kh/h, y/i, w/v, ph/f) ir dvigubos raidės
  function raktas(z) {
    // Trumpi žodžiai (santrumpos, inicialai) - kaip parašyti: „ABB“ ne „AAB“, „VIYP“ ne „VIP“
    if (z.length < 5) return z;
    return z.replace(/ye/g, "e").replace(/ya/g, "ia").replace(/yu/g, "iu").replace(/yo/g, "io").replace(/y/g, "i")
      .replace(/kh/g, "h").replace(/w/g, "v").replace(/ph/g, "f").replace(/(.)\1+/g, "$1");
  }
  // -> { t: [tarimo raktai be formų], zod: [rodomi žodžiai], k: kompaktiška eilutė }
  function normVardas(s) {
    var z = lotyniskai(s).replace(/['’`´"«»„“”]/g, "").replace(/&/g, " ").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
    // Pavienės raidės iš eilės - viena (S.A. -> sa, O.O.O. -> ooo)
    var t = [];
    for (var i = 0; i < z.length; i++) {
      if (z[i].length === 1 && /[a-z]/.test(z[i])) {
        var j = i, kaupas = "";
        while (j < z.length && z[j].length === 1 && /[a-z]/.test(z[j])) kaupas += z[j++];
        if (kaupas.length > 1) { t.push(kaupas); i = j - 1; continue; }
      }
      t.push(z[i]);
    }
    var visi = t.slice();
    // Teisinės formos (sekos), tada pavieniai formų ir jungiamieji žodžiai
    FORMOS.forEach(function (f) {
      for (var i = 0; i + f.length <= t.length; i++) {
        var ok = true;
        for (var j = 0; j < f.length; j++) if (raktas(t[i + j]) !== f[j]) { ok = false; break; }
        if (ok) { t.splice(i, f.length); i--; }
      }
    });
    t = t.filter(function (x) { return !FORMU_ZODZIAI[raktas(x)] && !STOP[x] && x.length > 1; });
    if (!t.length) t = visi.filter(function (x) { return !STOP[x] && x.length > 1; });
    var mat = {}, zod = [];
    t.forEach(function (x) { if (!mat[x]) { mat[x] = 1; zod.push(x); } });
    return { t: zod.map(raktas), zod: zod, k: zod.map(raktas).join("") };
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m || !n) return m || n;
    var p = new Array(n + 1), q = new Array(n + 1);
    for (var j = 0; j <= n; j++) p[j] = j;
    for (var i = 1; i <= m; i++) {
      q[0] = i;
      for (j = 1; j <= n; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      var x = p; p = q; q = x;
    }
    return p[n];
  }
  function panasumas(a, b) {
    if (a === b) return 1;
    if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 3) return 0;
    return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  }

  /* Balas 0-100: užklausos žodžių padengimas (60 %) ir pavadinimo žodžių padengimas (40 %); žodis sutampa tiksliai arba
     panašus (>= 0,8, ilgesni nei 3 raidžių). Reikia bent vieno ne bendrinio žodžio, sutampančio tiksliai arba labai panašaus
     (>= 0,85, ne trumpesnio kaip 6 raidės - rašybos ar transliteracijos skirtumas), arba visos kompaktiškos eilutės. */
  function balas(q, n) {
    if (!q.t.length || !n.t.length) return null;
    if (q.k.length >= 4 && q.k === n.k) return { b: 100, sutampa: q.zod.slice(), visas: true };
    var naud = {}, m = 0, sutampa = [], tikslus = false;
    q.t.forEach(function (x, qi) {
      var geriausias = 0, gi = -1;
      n.t.forEach(function (y, i) { if (naud[i]) return; var s = panasumas(x, y); if (s > geriausias) { geriausias = s; gi = i; } });
      if (geriausias >= 0.8) {
        naud[gi] = 1; m += geriausias;
        sutampa.push(geriausias === 1 ? q.zod[qi] : q.zod[qi] + " ~ " + n.zod[gi]);
        if (!BENDRINIAI[q.zod[qi]] && ((geriausias === 1 && q.zod[qi].length >= 3) || (geriausias >= 0.85 && q.zod[qi].length >= 6))) tikslus = true;
      }
    });
    if (!tikslus) return null;
    var cq = m / q.t.length, cn = m / n.t.length;
    // Bent pusė užklausos žodžių ir bent pusė pavadinimo žodžių (arba visi užklausos, kai jų ne mažiau dviejų): vienas
    // žodis ilgame pavadinime („BURMA“ - „Ministry of Defense of Burma“) - ne atitikmuo
    if (cq < 0.5 || (cn < 0.5 && !(cq === 1 && q.t.length >= 2))) return null;
    return { b: Math.round(100 * (0.6 * cq + 0.4 * cn)), sutampa: sutampa, visas: false };
  }

  // Šalys: kliento ISO2 kodas -> sąrašų pavadinimai (normalizuoti). Nežinomas kodas - šalis nelyginama.
  var SALYS = {
    LT: ["lithuania"], LV: ["latvia"], EE: ["estonia"], PL: ["poland"], DE: ["germany"], SE: ["sweden"], FI: ["finland"], FR: ["france"],
    IT: ["italy"], ES: ["spain"], US: ["united states", "united states of america", "usa"], CN: ["china", "peoples republic of china", "hong kong"],
    IN: ["india"], TR: ["turkey", "turkiye", "republic of turkiye"], AE: ["united arab emirates", "uae"], RU: ["russia", "russian federation"],
    BY: ["belarus"], UA: ["ukraine"], KZ: ["kazakhstan"], IR: ["iran", "islamic republic of iran", "iran islamic republic of"],
    KP: ["north korea", "democratic peoples republic of korea", "korea north"], GB: ["united kingdom"], NL: ["netherlands"],
    CY: ["cyprus"], CH: ["switzerland"], RS: ["serbia"], AM: ["armenia"], GE: ["georgia"], AZ: ["azerbaijan"], UZ: ["uzbekistan"], KG: ["kyrgyzstan"]
  };
  function salisTekstas(v) { return lotyniskai(v).replace(/[^a-z]+/g, " ").trim(); }
  function salisSutampa(iso, salys) {
    var vardai = SALYS[iso];
    if (!vardai || !salys || !salys.length) return null;
    var zinomos = salys.map(salisTekstas).filter(function (x) { return Object.keys(SALYS).some(function (k) { return SALYS[k].indexOf(x) >= 0; }); });
    if (!zinomos.length) return null;
    return zinomos.some(function (x) { return vardai.indexOf(x) >= 0; });
  }

  /* Indeksas: kiekvienas pavadinimas (ir kiti) normalizuojamas; žodžio ir kompaktiškos eilutės rodyklės - kad būtų lyginama
     tik su pavadinimais, turinčiais bent vieną bendrą žodį (paieška per milisekundes). */
  function sukurkIndeksa(irasaiPagalSarasa) {
    var vardai = [], zodis = new Map(), komp = new Map(), pradzia = new Map();
    Object.keys(irasaiPagalSarasa || {}).forEach(function (sid) {
      (irasaiPagalSarasa[sid] || []).forEach(function (o, oi) {
        [o.v].concat(o.a || []).forEach(function (v, vi) {
          var nv = normVardas(v);
          if (!nv.t.length) return;
          var idx = vardai.length;
          vardai.push({ sid: sid, oi: oi, vi: vi, n: nv });
          var mat = {};
          nv.t.forEach(function (x) {
            if (mat[x]) return;
            mat[x] = 1;
            if (!zodis.has(x)) { zodis.set(x, []); if (x.length >= 5) { var p3 = x.slice(0, 3); if (!pradzia.has(p3)) pradzia.set(p3, []); pradzia.get(p3).push(x); } }
            zodis.get(x).push(idx);
          });
          if (nv.k.length >= 4) { if (!komp.has(nv.k)) komp.set(nv.k, []); komp.get(nv.k).push(idx); }
        });
      });
    });
    return { vardai: vardai, zodis: zodis, komp: komp, pradzia: pradzia, irasai: irasaiPagalSarasa };
  }

  // Užklausa: { pavadinimas, salis (ISO2 arba null), kodas (arba null) } -> kandidatai pagal sąrašą
  function ieskok(ix, uzk) {
    var q = normVardas(uzk.pavadinimas), rasti = {};
    var kand = {};
    q.t.forEach(function (x) {
      (ix.zodis.get(x) || []).forEach(function (i) { kand[i] = 1; });
      // Rašybos ar transliteracijos skirtumas ilgame žodyje: tos pačios pirmos 3 raidės ir panašumas >= 0,85
      if (x.length >= 6) (ix.pradzia.get(x.slice(0, 3)) || []).forEach(function (y) {
        if (y !== x && panasumas(x, y) >= 0.85) (ix.zodis.get(y) || []).forEach(function (i) { kand[i] = 1; });
      });
    });
    (ix.komp.get(q.k) || []).forEach(function (i) { kand[i] = 1; });
    Object.keys(kand).forEach(function (i) {
      var vrd = ix.vardai[i], b = balas(q, vrd.n);
      if (!b) return;
      var raktasI = vrd.sid + "|" + vrd.oi, buv = rasti[raktasI];
      if (!buv || b.b > buv.b.b) rasti[raktasI] = { vrd: vrd, b: b };
    });
    // Kodas: tiksliai sutampantis registracijos kodas - stipriausias požymis
    var uzkKodas = uzk.kodas ? kodas(uzk.kodas) : null;
    if (uzkKodas) Object.keys(ix.irasai).forEach(function (sid) {
      ix.irasai[sid].forEach(function (o, oi) {
        if ((o.k || []).indexOf(uzkKodas) < 0) return;
        var rk = sid + "|" + oi;
        rasti[rk] = { vrd: { sid: sid, oi: oi, vi: 0, n: normVardas(o.v) }, b: { b: 100, sutampa: [], visas: false }, kodas: true, buvo: rasti[rk] };
      });
    });
    var out = [];
    Object.keys(rasti).forEach(function (rk) {
      var r = rasti[rk], o = ix.irasai[r.vrd.sid][r.vrd.oi], b = r.b.b, kodel = [];
      if (r.kodas) kodel.push("sutampa registracijos ar mokesčių kodas");
      var bv = r.kodas ? (r.buvo && r.buvo.b) : r.b;
      if (bv && bv.visas) kodel.push("pavadinimas sutampa (neskaitant teisinės formos, skyrybos ir raidžių dydžio)");
      else if (bv && bv.sutampa.length) kodel.push("sutampa žodžiai: " + bv.sutampa.join(", "));
      if (r.vrd.vi > 0 || (r.buvo && r.buvo.vrd.vi > 0)) kodel.push("pagal kitą sąraše nurodytą pavadinimą");
      var ss = uzk.salis ? salisSutampa(uzk.salis, o.c) : null;
      if (ss === true) { b = Math.min(100, b + 5); kodel.push("sutampa šalis"); }
      else if (ss === false) { b = Math.max(0, b - 10); kodel.push("sąraše nurodyta kita šalis: " + o.c.join(", ")); }
      if (!r.kodas && b < SLENKSTIS) return;
      out.push({ sarasas: o.s, id: o.id, pavadinimas: o.v, atitiko: r.vrd.vi > 0 ? o.a[r.vrd.vi - 1] : null, kiti: o.a.slice(0, 5),
        kitu: o.a.length, salys: o.c, programos: o.p, nr: o.nr, data: o.d, nuoroda: o.u, ofac: o.r, balas: b, kodel: kodel, kodas: !!r.kodas });
    });
    out.sort(function (a, b) { return b.balas - a.balas || String(a.pavadinimas).localeCompare(String(b.pavadinimas)); });
    var pagal = {}, galut = [];
    out.forEach(function (k) { pagal[k.sarasas] = (pagal[k.sarasas] || 0) + 1; if (pagal[k.sarasas] <= MAX_KANDIDATU_SARASE && galut.length < MAX_KANDIDATU) galut.push(k); });
    return galut;
  }

  // ---------------------------------------------------------------------------
  // Užklausos atsakymas: { status, antrastes, kunas } - gryna funkcija
  //   busena: { <sąrašo id>: { atnaujinta, saltinioData, kiekis, klaida: { laikas, rusis } | null } }
  // ---------------------------------------------------------------------------
  function kilmesAntraste(kilme) {
    return typeof kilme === "string" && (KILMES.indexOf(kilme) >= 0 || VIETINE.test(kilme)) ? kilme : null;
  }
  function antrastes(kilme) {
    var h = { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "Vary": "Origin" };
    var k = kilmesAntraste(kilme);
    if (k) { h["Access-Control-Allow-Origin"] = k; h["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"; h["Access-Control-Max-Age"] = "600"; }
    return h;
  }
  function json(status, kunas, kilme) { return { status: status, antrastes: antrastes(kilme), kunas: JSON.stringify(kunas) }; }

  var KLAIDOS = {
    pavadinimas: "Nurodykite tiekėjo pavadinimą (2-200 ženklų, bent dvi raidės).",
    salis: "Šalis - dviejų raidžių ISO kodas (pvz. LT) arba nenurodoma.",
    kodas: "Kodas - 5-20 raidžių ir skaitmenų arba nenurodomas.",
    metodas: "Leidžiamos tik GET užklausos.",
    kelias: "Tokio adreso nėra.",
    neikelta: "Sankcijų sąrašai serveryje dar neįkelti - patikrinti negalima. Patikrinkite oficialiose paieškose."
  };
  var KLAIDU_RUSYS = {
    "rysys": "nepavyko prisijungti prie sąrašo šaltinio", "saltinis-500": "šaltinis atsakė klaida (HTTP 5xx)", "saltinis-kita": "šaltinis atsakė netikėtai",
    "per-didelis": "failas didesnis už leidžiamą", "netiketas-kiekis": "faile per mažai subjektų - netikėta sandara ar dalinis failas",
    "skaitymas": "failo nepavyko perskaityti", "neikeltas": "sąrašas dar neįkeltas", "tuscias": "sąrašas dar neįkeltas"
  };

  function sarasoBusena(cfg, b, dabar) {
    var x = b && b[cfg.id] ? b[cfg.id] : null, yra = !!(x && x.atnaujinta && x.kiekis > 0);
    var amz = yra ? (dabar - Date.parse(x.atnaujinta)) / 3600000 : null;
    var r = { id: cfg.id, pavadinimas: cfg.pav, pavadinimasEn: cfg.pavEn, busena: yra ? "patikrinta" : "nepatikrinta",
      atnaujinta: yra ? x.atnaujinta : null, saltinioData: yra ? (x.saltinioData || null) : null, irasu: yra ? x.kiekis : 0,
      pasenusi: yra ? amz > PASENES_VAL : false, klaida: null };
    if (x && x.klaida) r.klaida = { laikas: x.klaida.laikas, rusis: x.klaida.rusis, tekstas: KLAIDU_RUSYS[x.klaida.rusis] || "nepavyko atnaujinti" };
    else if (!yra) r.klaida = { laikas: null, rusis: "neikeltas", tekstas: KLAIDU_RUSYS.neikeltas };
    return r;
  }

  function uzklausa(sp) {
    var pv = sp.get("pavadinimas"), sal = sp.get("salis"), kd = sp.get("kodas");
    if (sp.getAll("pavadinimas").length !== 1 || typeof pv !== "string") return { klaida: "pavadinimas" };
    pv = pv.replace(VALDYMO, "").replace(/\s+/g, " ").trim();
    if (pv.length < 2 || pv.length > 200 || (pv.match(/\p{L}/gu) || []).length < 2 || !normVardas(pv).t.length) return { klaida: "pavadinimas" };
    if (sal !== null && sal !== "") { if (!/^[A-Z]{2}$/.test(sal)) return { klaida: "salis" }; } else sal = null;
    if (kd !== null && kd !== "") { if (!/^[A-Za-z0-9-]{5,20}$/.test(kd)) return { klaida: "kodas" }; } else kd = null;
    for (var k of sp.keys()) if (["pavadinimas", "salis", "kodas"].indexOf(k) < 0) return { klaida: "pavadinimas" };
    return { u: { pavadinimas: pv, salis: sal, kodas: kd } };
  }

  function atsakymas(ix, metodas, adresas, kilme, busena, dabar) {
    dabar = typeof dabar === "number" ? dabar : Date.now();
    metodas = String(metodas || "").toUpperCase();
    if (metodas === "OPTIONS") return { status: 204, antrastes: antrastes(kilme), kunas: "" };
    if (metodas !== "GET" && metodas !== "HEAD") return json(405, { klaida: KLAIDOS.metodas }, kilme);
    if (typeof adresas !== "string" || adresas.length > 600) return json(404, { klaida: KLAIDOS.kelias }, kilme);
    var u;
    try { u = new URL(adresas, "http://vietinis"); } catch (e) { return json(404, { klaida: KLAIDOS.kelias }, kilme); }
    var sarasai = SARASAI.map(function (cfg) { return sarasoBusena(cfg, busena, dabar); });
    if (u.pathname === "/api/sankcijos/busena") return json(200, { sarasai: sarasai, versija: VERSIJA }, kilme);
    if (u.pathname !== "/api/sankcijos/tikrinti") return json(404, { klaida: KLAIDOS.kelias }, kilme);
    var uz = uzklausa(u.searchParams);
    if (uz.klaida) return json(400, { klaida: KLAIDOS[uz.klaida], parametras: uz.klaida }, kilme);
    var patikrinti = sarasai.filter(function (s) { return s.busena === "patikrinta"; });
    if (!ix || !patikrinti.length) return json(503, { klaida: KLAIDOS.neikelta, sarasai: sarasai }, kilme);
    var kandidatai = ieskok(ix, uz.u).filter(function (k) { return patikrinti.some(function (s) { return s.id === k.sarasas; }); });
    sarasai.forEach(function (s) { s.kandidatu = s.busena === "patikrinta" ? kandidatai.filter(function (k) { return k.sarasas === s.id; }).length : null; });
    return json(200, { sarasai: sarasai, kandidatai: kandidatai, visiPatikrinti: patikrinti.length === SARASAI.length,
      slenkstis: SLENKSTIS, versija: VERSIJA }, kilme);
  }

  // Disko kopijos įrašas tikrinamas ta pačia funkcija (failas galėjo būti pakeistas); pakartotinai - tas pats rezultatas
  function normalizuokIrasa(o) {
    if (!o || typeof o !== "object" || SARASAI.every(function (x) { return x.id !== o.s; })) return null;
    return irasas({ s: o.s, id: o.id, v: o.v, a: Array.isArray(o.a) ? o.a : [], c: Array.isArray(o.c) ? o.c : [], p: Array.isArray(o.p) ? o.p : [],
      k: Array.isArray(o.k) ? o.k : [], nr: o.nr, d: o.d, u: o.u, r: o.r });
  }

  return {
    VERSIJA: VERSIJA, KILMES: KILMES, SARASAI: SARASAI, MAX_FAILO_BAITU: MAX_FAILO_BAITU, PASENES_VAL: PASENES_VAL, SLENKSTIS: SLENKSTIS,
    MAX_KANDIDATU: MAX_KANDIDATU, MAX_KANDIDATU_SARASE: MAX_KANDIDATU_SARASE, KLAIDOS: KLAIDOS, KLAIDU_RUSYS: KLAIDU_RUSYS,
    dekoduok: dekoduok, svarus: svarus, elementai: elementai, atributai: atributai, data: data,
    skaitykOFAC: skaitykOFAC, skaitykJT: skaitykJT, skaitykJK: skaitykJK, skaitykES: skaitykES, skaityk: skaityk,
    priimtinasKiekis: priimtinasKiekis, normalizuokIrasa: normalizuokIrasa,
    normVardas: normVardas, raktas: raktas, panasumas: panasumas, balas: balas, salisSutampa: salisSutampa,
    sukurkIndeksa: sukurkIndeksa, ieskok: ieskok, uzklausa: uzklausa, atsakymas: atsakymas, kilmesAntraste: kilmesAntraste
  };
});
