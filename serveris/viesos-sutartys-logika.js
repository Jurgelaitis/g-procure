/* ============================================================================
 * G-Procure viešų pirkimų sutarčių duomenų paslauga - gryna logika (be įvesties ir išvesties).
 *
 * Paskirtis (2026-11-19, naudotojo „Darome“ - G-Procure ateities perspektyvų 3 žingsnis): iš viešų šaltinių,
 * kurie nepriima naršyklės užklausų (nėra CORS), surinkti tai, ko reikia trims sprendimams:
 *  - PP-plan „Sutarčių žemėlapis“: pirkimo vykdytojo sutartys, kurios baigiasi per 24 mėn., pagal tas pačias
 *    BVPŽ grupes (3 skaitmenys) kaip planas, ir didžiausio tiekėjo dalis grupėje per 3 metus;
 *  - PP-qual „Rinkos pajėgumas“: kiek juridinių asmenų, laimėjusių panašias sutartis per 3 metus, atitiktų
 *    apyvartos ir patirties reikalavimą - TIK skaičiai (atitiktų, neatitiktų, nežinoma), be pavadinimų;
 *  - PP-ts „Galimi rinkos konsultacijos adresatai“: juridiniai asmenys, laimėję panašias sutartis (Lietuvoje
 *    ir ES pagal TED);
 *  - PP-sutartys „Sutarties pakeitimai“ (nuo 2026-11-28): sutartis pagal jos numerį - pavadinimas, datos, kita
 *    Šalis ir to paties pirkimo paskelbti sutarties pakeitimai (numeris ir data), kad jų nereikėtų įrašyti ranka.
 *
 * Šaltiniai (vieši, be raktų; patikrinta 2026-11-19):
 *  - Valstybės duomenų agentūra, „Viešųjų pirkimų sutartys“ (get.data.gov.lt/datasets/gov/lsd/vpt/cvpp - Sutartis
 *    ir Salis), CC BY 4.0;
 *  - Registrų centras, juridinių asmenų finansinės ataskaitos (get.data.gov.lt/datasets/gov/rc/jar - pelno
 *    ataskaitos, tik eilutė „PARDAVIMO PAJAMOS“), CC BY 4.0 - naudojama tik suskaičiuoti;
 *  - TED (api.ted.europa.eu/v3/notices/search), Leidinių biuras - skelbimus galima laisvai pakartotinai naudoti.
 *
 * Kodėl ne kopija, o tikslinės užklausos (išmatuota 2026-11-19): sutarčių - 6,1 mln., šalių eilučių - 12 mln.;
 * tikslinė užklausa atsako per 0,1-0,5 s (šalių paieška pagal kelis dok_id - ~0,7 s), visas LITGRID žemėlapis -
 * ~17 s, rinka pagal BVPŽ grupę - iki ~15 s. Kopija būtų keli GB ir kasdienis kelių valandų atnaujinimas. Todėl -
 * tik iš anksto apibrėžtos užklausos, rezultatas laikomas 24 val. (talpykla), nepavykus - paskutinis geras
 * rezultatas (iki 7 d.) pažymėtas „pasenęs“.
 *
 * Šis failas neturi priklausomybių ir veikia ir Node (serveris), ir naršyklėje (testai - serveris/testai.html).
 * Tinklas, talpykla ir HTTP - viesos-sutartys-serveris.js. Diegimas ir saugumas - README.md.
 *
 * Principai:
 *  - Šaltinių atsakymai - nepatikimi duomenys: tik išvardyti laukai, tipai, ilgio ir reikšmių ribos, datų klaidos
 *    (pvz. 2525 m.) atmetamos ir suskaičiuojamos.
 *  - Asmens duomenys: rodomi tik juridiniai asmenys, kurių pavadinimas nėra asmens vardu pavadinta įmonė
 *    (individuali įmonė, mažoji bendrija, ūkinės bendrijos, ūkininkas) - tokie tik suskaičiuojami, be pavadinimo
 *    ir kodo; jų finansinės ataskaitos neieškomos.
 *  - Nepavykęs šaltinis NIEKADA nerodomas kaip „sutarčių nėra“ - klaida su priežastimi.
 *  - Užklausos turinys (pirkėjo kodas, BVPŽ, ribos) atsakyme neatkartojamas ir nežurnalizuojamas.
 * ============================================================================ */
(function (saknis, fabrikas) {
  if (typeof module === "object" && module.exports) module.exports = fabrikas();
  else saknis.GP_VIESOS_SUTARTYS_API = fabrikas();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSIJA = "2026-11-28";
  var KILMES = ["https://g-procure.com", "https://www.g-procure.com"];
  var VIETINE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

  // Šaltiniai - tik šie kompiuteriai ir keliai (serveris kitur nesikreipia)
  var SALTINIAI = {
    vda: { kompiuteris: "get.data.gov.lt", kelias: "/datasets/gov/lsd/vpt/cvpp/" },
    jar: { kompiuteris: "get.data.gov.lt", kelias: "/datasets/gov/rc/jar/" },
    ted: { kompiuteris: "api.ted.europa.eu", kelias: "/v3/notices/search" }
  };

  var MENESIU = 24;               // sutartys, kurios baigiasi per tiek mėnesių
  var METU = 3;                   // rinka ir koncentracija - sutartys, sudarytos per tiek metų
  var MIN_VERTE = 10000;          // rinkai ir koncentracijai - sutartys nuo tiek EUR (smulkūs žodiniai pirkimai - triukšmas)
  var MAX_PIRKEJO_SUTARCIU = 20000;   // pirkėjo sutarčių identifikatorių riba (LITGRID 2026-11-19 - 6 894)
  var MAX_RINKOS_SUTARCIU = 1000;     // rinkos užklausa - naujausios tiek sutarčių (daugiau - „apribota“)
  var MAX_TED = 250;                  // TED - vienas puslapis
  var MAX_TIEKEJU = 100;              // rodomų tiekėjų ar laimėtojų riba
  var MAX_FINANSU = 400;              // kiek įmonių finansinių duomenų ieškoma vienai rinkai
  var PAKETAS_SUTARCIU = 150, PAKETAS_SALIU = 60, PAKETAS_JAR = 40;
  var MAX_PAKEITIMU = 100;            // vienos sutarties paskelbtų pakeitimų riba
  var MAX_PIRKIMO_SUTARCIU = 240;     // to paties pirkimo sutarčių ir pakeitimų įrašų riba
  var TTL_VAL = 24, PASENES_MAX_D = 7;

  var VALDYMO = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g;

  // ---------------------------------------------------------------------------
  // Pagalbinės funkcijos
  // ---------------------------------------------------------------------------
  function siandien(dabar) {
    var d = new Date(typeof dabar === "number" ? dabar : Date.now());
    try { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vilnius" }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function pridekMen(iso, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    var y = +m[1], mo = +m[2] - 1 + n, d = +m[3];
    y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
    var paskutine = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return y + "-" + String(mo + 1).padStart(2, "0") + "-" + String(Math.min(d, paskutine)).padStart(2, "0");
  }
  function menesiuIki(nuo, iki) {
    var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nuo), b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iki);
    if (!a || !b) return null;
    var m = (+b[1] - +a[1]) * 12 + (+b[2] - +a[2]) - (+b[3] < +a[3] ? 1 : 0);
    return Math.max(0, m);
  }
  var ENTITY = { quot: "\"", amp: "&", apos: "'", lt: "<", gt: ">", nbsp: " " };
  function svarus(s, max) {
    if (typeof s !== "string") return null;
    var t = s.replace(/&#(\d{1,6});/g, function (m, n) { var k = +n; return k > 31 && k < 0x110000 ? String.fromCodePoint(k) : " "; })
      .replace(/&(quot|amp|apos|lt|gt|nbsp);/g, function (m, n) { return ENTITY[n]; })
      .replace(VALDYMO, " ").replace(/\s+/g, " ").trim();
    if (!t) return null;
    return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, "") || t.slice(0, max) : t;
  }
  function data(s, maxMetai) {
    if (typeof s !== "string") return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1995 || y > (maxMetai || 2100) || mo < 1 || mo > 12 || d < 1) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return m[1] + "-" + m[2] + "-" + m[3];
  }
  function suma(x) {
    var n = typeof x === "number" ? x : (typeof x === "string" && /^\d{1,12}(\.\d{1,4})?$/.test(x.trim()) ? +x : NaN);
    return isFinite(n) && n >= 0 && n < 1e11 ? Math.round(n * 100) / 100 : null;
  }
  function cpvKodai(s) {
    if (typeof s !== "string") return [];
    var out = [], re = /(^|[^\d])(\d{8})(?:-\d)?(?=$|[^\d])/g, m;
    while ((m = re.exec(s)) && out.length < 10) if (out.indexOf(m[2]) < 0) out.push(m[2]);
    return out;
  }
  function mediana(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), k = Math.floor(s.length / 2);
    return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
  }

  /* Asmens vardu pavadinta įmonė: individuali įmonė, mažoji bendrija, tikroji ir komanditinė ūkinė bendrija, ūkininkas.
     Jų pavadinimas dažnai yra savininko vardas - tokie tiekėjai tik suskaičiuojami (be pavadinimo, kodo ir finansų). */
  var ASMENS_FORMA = /(^|[^\p{L}])(individuali(?:oji)?\s+(?:įmonė|firma)|individualioji\s+įmonė|mažoji\s+bendrija|tikroji\s+ūkinė\s+bendrija|komanditinė\s+ūkinė\s+bendrija|ūkinė\s+bendrija|ūkininkas|ūkininkė|ūkininko\s+ūkis|fizinis\s+asmuo|IĮ|MB|TŪB|KŪB|ŪB|e\.\s?K\.|Einzelunternehm(?:en|er(?:in)?)|sole\s+(?:trader|proprietor(?:ship)?)|enskild\s+firma|toiminimi)(?=$|[^\p{L}])/iu;
  /* Senos individualios įmonės dažnai pavadintos savininko vardu be „IĮ“: „V. Pavardienės firma „X““, „Jono Jonaičio prekybinė firma“,
     „A. Petraičio įmonė“ (2026-11-20, trečias pilotas: toks pavadinimas buvo rodomas). Atpažįstama: žodis didžiąja raide su asmenvardžio
     kilmininko galūne (ir vardininko -ė - „Danutės Pavardienė prekybos firma“), iki 4 žodžių mažąja raide ir „firma“ ar „įmonė“ kaip
     atskiras žodis. Bendrovė (UAB, AB, ŽŪB, „uždaroji akcinė bendrovė“ ir pan.) - ne asmens vardu pavadinta įmonė, net jei pavadinime
     yra asmens vardas („UAB „P. Petraičio firma““); „agrofirma“ - ne žodis „firma“. */
  var ASMENS_FIRMA = /(^|[^\p{L}])\p{Lu}\p{Ll}+(?:o|io|ės|os|aus|iaus|ienės|ytės|aitės|utės|ūtės|ė)\s+(?:\p{Ll}+\s+){0,4}(?:firma|įmonė)(?=$|[^\p{L}])/u;
  var BENDROVE = /(^|[^\p{L}])(UAB|AB|ŽŪB|SIA|AS|OÜ|VšĮ)(?=$|[^\p{L}])/u;
  var BENDROVE_ZODZIAI = /(^|[^\p{L}])((uždaroji\s+akcinė|akcinė|žemės\s+ūkio|kooperatinė)\s+bendrovė|viešoji\s+įstaiga)(?=$|[^\p{L}])/iu;
  function bendrove(t) { return BENDROVE.test(t) || BENDROVE_ZODZIAI.test(t); }
  function asmensVardoForma(pav) {
    if (typeof pav !== "string") return true;
    var t = pav.replace(/[„“"”«»'‘’]/g, " ");
    if (ASMENS_FORMA.test(t)) return true;
    return !bendrove(t) && ASMENS_FIRMA.test(t);
  }

  // ---------------------------------------------------------------------------
  // Įvesties tikrinimas
  // ---------------------------------------------------------------------------
  function jarKodas(s) { return typeof s === "string" && /^\d{7,9}$/.test(s) ? s : null; }
  // BVPŽ kodo pradžia: 3-8 skaitmenys; galiniai nuliai nuimami (31210000 -> 3121), bet ne trumpiau nei 3
  /* Sutarties ir pirkimo numeris užklausai: tik raidės be diakritikų, skaitmenys ir - / . _ (į šaltinio užklausą dedamas tarp kabučių) */
  function sutartiesNr(s) { return typeof s === "string" && /^[0-9A-Za-z][0-9A-Za-z\-\/._]{2,59}$/.test(s) ? s : null; }
  function pirkimoNr(s) { return typeof s === "string" && /^[0-9A-Za-z][0-9A-Za-z\-\/._]{0,39}$/.test(s) ? s : null; }
  function cpvPradzia(s) {
    if (typeof s !== "string" || !/^\d{3,8}$/.test(s)) return null;
    var t = s;
    while (t.length > 3 && t.charAt(t.length - 1) === "0") t = t.slice(0, -1);
    return t;
  }
  function riba(s) {
    if (typeof s !== "string" || !/^\d{1,11}(\.\d{1,2})?$/.test(s)) return null;
    var n = +s;
    return n > 0 && n < 1e11 ? n : null;
  }

  // ---------------------------------------------------------------------------
  // Užklausos šaltiniams (tik iš patikrintų reikšmių; kabutės ir ženklai - be kodavimo, kaip reikalauja šaltinio užklausų kalba)
  // ---------------------------------------------------------------------------
  function arba(laukas, reiksmes, kabutes) {
    return "(" + reiksmes.map(function (v) { return laukas + "=" + (kabutes ? "\"" + v + "\"" : v); }).join("|") + ")";
  }
  function uzklausaPirkejoId(jar) {
    return { saltinis: "vda", kelias: "Salis?salies_kodas=\"" + jar + "\"&ar_salis_tiekejas=false&select(dok_id)&limit(" + MAX_PIRKEJO_SUTARCIU + ")" };
  }
  function pirkejoLaikotarpis(dabar) {
    var s = siandien(dabar);
    return { siandien: s, iki: pridekMen(s, MENESIU), nuo: pridekMen(s, -12 * METU) };
  }
  function uzklausaPirkejoSutartys(ids, dabar) {
    var l = pirkejoLaikotarpis(dabar);
    return { saltinis: "vda", kelias: "Sutartis?" + arba("dok_id", ids, true) +
      "&((dok_sut_galiojimo_data>=\"" + l.siandien + "\"&dok_sut_galiojimo_data<=\"" + l.iki + "\")|(dok_sudarymo_data>=\"" + l.nuo + "\"&dok_sut_verte>=" + MIN_VERTE + "))" +
      "&select(dok_id,cpv_codes,dok_sut_verte,dok_sudarymo_data,dok_sut_galiojimo_data,dok_sut_obj_pav,dok_pirk_numeris,imported)&limit(" + (ids.length * 2) + ")" };
  }
  function uzklausaTiekejai(ids) {
    return { saltinis: "vda", kelias: "Salis?" + arba("dok_id", ids, true) + "&ar_salis_tiekejas=true&select(dok_id,salies_kodas,salies_asmens_rusis,salies_pavadinimas)&limit(" + (ids.length * 10) + ")" };
  }
  var SUT_LAUKAI = "dok_id,dok_sut_tipas,dok_sut_numeris,dok_pirk_numeris,dok_sut_obj_pav,dok_sut_verte,dok_sudarymo_data,dok_sut_galiojimo_data";
  function uzklausaSutartisNr(nr) {
    return { saltinis: "vda", kelias: "Sutartis?dok_sut_numeris=\"" + nr + "\"&select(" + SUT_LAUKAI + ")&limit(20)" };
  }
  function uzklausaPirkimoSutartys(pnr) {
    return { saltinis: "vda", kelias: "Sutartis?dok_pirk_numeris=\"" + pnr + "\"&select(" + SUT_LAUKAI + ")&sort(dok_sudarymo_data)&limit(" + MAX_PIRKIMO_SUTARCIU + ")" };
  }
  function uzklausaSalys(ids) {
    return { saltinis: "vda", kelias: "Salis?" + arba("dok_id", ids, true) + "&select(dok_id,salies_kodas,salies_asmens_rusis,salies_pavadinimas,ar_salis_tiekejas)&limit(" + (ids.length * 10) + ")" };
  }
  function uzklausaRinka(cpv, dabar) {
    var nuo = pridekMen(siandien(dabar), -12 * METU);
    return { saltinis: "vda", kelias: "Sutartis?cpv_codes.startswith(\"" + cpv + "\")&dok_sudarymo_data>=\"" + nuo + "\"&dok_sut_verte>=" + MIN_VERTE +
      "&select(dok_id,cpv_codes,dok_sut_verte,dok_sudarymo_data,imported)&sort(-dok_sudarymo_data)&limit(" + MAX_RINKOS_SUTARCIU + ")" };
  }
  function uzklausaJa(kodai) {
    return { saltinis: "jar", kelias: "iregistruoti/JuridinisAsmuo?" + arba("ja_kodas", kodai, false) + "&select(_id,ja_kodas)&limit(" + (kodai.length * 2) + ")" };
  }
  function uzklausaPajamos(idai, dabar) {
    var y = +siandien(dabar).slice(0, 4);
    return { saltinis: "jar", kelias: "pelno_ataskaitos/PelnoAtaskaita?" + arba("juridinis_asmuo._id", idai, true) +
      "&line_name.startswith(\"PARDAVIMO\")&laikotarpis_iki>=\"" + (y - METU - 1) + "-01-01\"&select(juridinis_asmuo,line_name,reiksme,laikotarpis_iki)&limit(" + (idai.length * 20) + ")" };
  }
  var TED_LAUKAI = ["publication-number", "publication-date", "buyer-country", "classification-cpv", "winner-name", "winner-country",
    "winner-identifier", "tender-value", "tender-value-cur", "received-submissions-type-val", "organisation-name-tenderer",
    "organisation-identifier-tenderer", "organisation-country-tenderer", "contract-tender-id", "tender-identifier"];
  function uzklausaTed(cpv, apimtis, dabar) {
    var nuo = pridekMen(siandien(dabar), -12 * METU).replace(/-/g, "");
    return { saltinis: "ted", kunas: {
      query: "notice-type IN (can-standard, can-social, can-desg) AND classification-cpv = " + cpv + "* AND publication-date >= " + nuo +
        (apimtis === "es" ? "" : " AND buyer-country = LTU") + " SORT BY publication-date DESC",
      fields: TED_LAUKAI, limit: MAX_TED, page: 1, scope: "ALL", paginationMode: "PAGE_NUMBER" } };
  }

  // ---------------------------------------------------------------------------
  // Šaltinių atsakymų tikrinimas
  // ---------------------------------------------------------------------------
  function duomenys(j) { return j && typeof j === "object" && Array.isArray(j._data) ? j._data : null; }
  function dokId(x) { return typeof x === "string" && /^\d{1,20}$/.test(x) ? x : (typeof x === "number" && isFinite(x) && x > 0 ? String(Math.floor(x)) : null); }
  function sutartis(o, dabar) {
    if (!o || typeof o !== "object") return null;
    var id = dokId(o.dok_id);
    if (!id) return null;
    var maxMetai = +siandien(dabar).slice(0, 4) + 30;
    var galRaw = o.dok_sut_galiojimo_data, gal = data(galRaw, maxMetai);
    return {
      id: id,
      cpv: cpvKodai(o.cpv_codes),
      verte: suma(o.dok_sut_verte),
      sudaryta: data(o.dok_sudarymo_data, +siandien(dabar).slice(0, 4) + 1),
      galioja: gal,
      datosKlaida: typeof galRaw === "string" && galRaw && !gal,
      pav: svarus(o.dok_sut_obj_pav, 200),
      pirkimoNr: svarus(typeof o.dok_pirk_numeris === "number" ? String(o.dok_pirk_numeris) : o.dok_pirk_numeris, 40),
      importuota: o.imported === true
    };
  }
  function salis(o) {
    if (!o || typeof o !== "object") return null;
    var dok = dokId(o.dok_id);
    if (!dok) return null;
    var kodas = typeof o.salies_kodas === "string" && /^\d{7,9}$/.test(o.salies_kodas) ? o.salies_kodas : null;
    var pav = svarus(o.salies_pavadinimas, 200);
    var juridinis = o.salies_asmens_rusis === "Juridinis" && !!kodas;
    var viesas = juridinis && !!pav && !asmensVardoForma(pav);
    /* Kodėl tiekėjas nerodomas - kad sąsaja nesakytų daugiau, nei žinoma (2026-11-20, trečias pilotas: „juridinis asmuo“ buvo rašoma
       ir tada, kai šaltinis asmens rūšies nežino, o kodas ir pavadinimas užkoduoti): asmens vardu pavadinta įmonė, fizinis asmuo arba
       nežinoma (rūšis „Nežinomas“, kodas ar pavadinimas nenurodytas). */
    var priezastis = viesas ? null : juridinis && pav ? "asmens-vardu" : o.salies_asmens_rusis === "Fizinis" ? "fizinis" : "nezinomas";
    return { dok: dok, kodas: viesas || juridinis ? kodas : null, pav: viesas ? pav : null, viesas: viesas, juridinis: juridinis, priezastis: priezastis };
  }
  /* Sutarties ar jos pakeitimo įrašas paieškai pagal numerį: tipas "1" - sutartis, "5" - sutarties pakeitimas (kiti - kaip šaltinyje) */
  function sutartiesIrasas(o, dabar) {
    var c = sutartis(o, dabar);
    if (!c) return null;
    var tp = typeof o.dok_sut_tipas === "number" ? String(o.dok_sut_tipas) : o.dok_sut_tipas;
    return { id: c.id, tipas: typeof tp === "string" && /^\d{1,2}$/.test(tp) ? tp : null, nr: svarus(typeof o.dok_sut_numeris === "number" ? String(o.dok_sut_numeris) : o.dok_sut_numeris, 60),
      pirkimoNr: c.pirkimoNr, pav: c.pav, verte: c.verte, sudaryta: c.sudaryta, galioja: c.galioja };
  }
  function salisSuPuse(o) {
    var x = salis(o);
    if (!x) return null;
    x.tiekejas = o.ar_salis_tiekejas === true;
    return x;
  }
  function tedTekstas(v) {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { var t = tedTekstas(v[i]); if (t) return t; } return null; }
    if (v && typeof v === "object") {
      var k = ["lit", "eng"].concat(Object.keys(v));
      for (var j = 0; j < k.length; j++) if (v[k[j]] !== undefined) { var x = tedTekstas(v[k[j]]); if (x) return x; }
    }
    return null;
  }
  function tedSarasas(v) {
    if (Array.isArray(v)) return v;
    if (v === undefined || v === null) return [];
    if (typeof v === "object") { var k = Object.keys(v); return k.length ? tedSarasas(v[k.indexOf("lit") >= 0 ? "lit" : (k.indexOf("eng") >= 0 ? "eng" : k[0])]) : []; }
    return [v];
  }
  /* TED paieškos laukai - atskiri sąrašai be tarpusavio sąsajų, todėl pagal eilės numerį jų poruoti negalima (2026-11-20, trečias pilotas:
     įmonės kodas buvo priskirtas kitai įmonei). Išmatuota su TED XML (14 skelbimų) ir 413 skelbimų paieškos atsakymais:
      - winner-name - po vieną kiekvienam pirkimo dalies rezultatui (tas pats laimėtojas kartojasi, tvarka - ne organizacijų);
      - winner-identifier, winner-country - po vieną kiekvienai laimėtojo organizacijai, kita tvarka nei winner-name;
      - tender-value - kiekvienam skelbime nurodytam pasiūlymui (ir nelaimėjusiam), dar kita tvarka;
      - organisation-name-tenderer, organisation-identifier-tenderer, organisation-country-tenderer - ta pati organizacijų tvarka (XML
        patikrinta visais atvejais, kai sąrašų ilgiai vienodi; organizacija su keliais kodais ilgius išskiria - tada nesiejama).
     Todėl: laimėtojai - skirtingi winner-name; kodas ir šalis - iš pasiūlymų teikėjų sąrašų, kai tas pavadinimas ten vienas, o vienam
     laimėtojui su vienu laimėtojo kodu - tas kodas; vertė - tik vieninteliam laimėtojui ir tik kai visi skelbimo pasiūlymai yra sudarytų
     sutarčių (pasiūlymų, sutarčių pasiūlymų ir verčių skaičius sutampa, visos vertės EUR ir didesnės už nulį). Kitaip - nežinoma (null),
     ne priskirta spėjant. Ne įmonės laimėtojo vietoje („Pirkimas pabaigtas nesudarius sutarties“, „Rahmenvereinbarungspartner 1“) -
     atmetamos ir suskaičiuojamos. */
  var MAX_LAIMETOJU = 20;
  var NE_IMONE = /(^|[^\p{L}])(nesudar\p{L}*|nesudaryt\p{L}*|nutrauk\p{L}*|neįvyk\p{L}*|nenustatyt\p{L}*|nėra\s+laimėtoj\p{L}*|not\s+awarded|no\s+(?:contract|award|winner)|unsuccessful|non\s+aggiudicat\p{L}*|nicht\s+vergeben|kein\s+zuschlag|anonym\p{L}*|confidential|konfidencial\p{L}*|not\s+disclosed|nicht\s+veröffentlicht|redacted|withheld|n\/a)(?=$|[^\p{L}])/iu;
  var VIETOS_ZYME = /^\s*\p{L}+(?:\s+\p{L}+)?\s*(?:nr\.?\s*|no\.?\s*)?\d{1,2}\s*$/iu;   // „Rahmenvereinbarungspartner 1“, „Bieter 2“, „Lot 3“
  var DALIES_PRIESAGA = /\s+-\s+L\d{1,3}\s*$/;                                         // „Siemens AG - L2“ - ta pati organizacija kitai daliai
  function tedPavadinimas(v) { var p = svarus(tedTekstas(v), 200); return p ? (p.replace(DALIES_PRIESAGA, "").trim() || p) : null; }
  function vardoRaktas(p) {
    if (typeof p !== "string") return "";
    // be diakritikų, raidžių dydžio, skyrybos („S.R.L.“ = „SRL“) ir žodžių tvarkos („UAB „X““ = „X, UAB“)
    return p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\./g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean).sort().join(" ");
  }
  function tedKodas(v) {
    var k = typeof v === "string" ? v.replace(/\s+/g, "") : (typeof v === "number" && isFinite(v) ? String(v) : null);
    return k && /^[A-Za-z0-9.\-\/]{3,30}$/.test(k) ? k : null;
  }
  // Kodo raktas palyginimui: be skyrybos, didžiosiomis, be PVM šalies priešdėlio („RO 1057757“ = „1057757“)
  function kodoRaktas(k) { var t = String(k).toUpperCase().replace(/[.\-\/]/g, ""); return /^[A-Z]{2}\d{5,}$/.test(t) ? t.slice(2) : t; }
  function tedSalis(v) { return typeof v === "string" && /^[A-Z]{3}$/.test(v) ? v : null; }
  function unikalus(a) { return a.filter(function (x, i) { return x !== null && x !== undefined && a.indexOf(x) === i; }); }
  function neImone(pav, kodas) {
    if (!pav) return false;
    if (!/\p{L}{2}/u.test(pav) || NE_IMONE.test(pav)) return true;
    if (VIETOS_ZYME.test(pav) && !bendrove(pav)) return true;
    return !!kodas && /\s/.test(pav) && vardoRaktas(kodas) === vardoRaktas(pav);   // kodo vietoje - tas pats tekstas
  }
  function tedSkelbimas(o) {
    if (!o || typeof o !== "object" || typeof o["publication-number"] !== "string" || !/^\d{1,8}-\d{4}$/.test(o["publication-number"])) return null;
    var wKodai = unikalus(tedSarasas(o["winner-identifier"]).map(tedKodas)), wSalys = unikalus(tedSarasas(o["winner-country"]).map(tedSalis));
    var tn = tedSarasas(o["organisation-name-tenderer"]).map(tedPavadinimas), ti = tedSarasas(o["organisation-identifier-tenderer"]).map(tedKodas);
    var tc = tedSarasas(o["organisation-country-tenderer"]).map(tedSalis);
    var porinti = tn.length > 0 && tn.length === ti.length, tnr = porinti ? tn.map(vardoRaktas) : [];
    var laimetojai = [], matyta = {};
    tedSarasas(o["winner-name"]).forEach(function (v) {
      var pav = tedPavadinimas(v), r = vardoRaktas(pav);
      if (!pav || !r || matyta[r] || laimetojai.length >= MAX_LAIMETOJU) return;
      matyta[r] = 1;
      laimetojai.push({ pav: pav, r: r, salis: null, kodas: null, vertes: null });
    });
    if (!laimetojai.length && wKodai.length === 1) laimetojai.push({ pav: null, r: "", salis: null, kodas: null, vertes: null });   // tik kodas, be pavadinimo
    var vienas = laimetojai.length === 1;
    laimetojai.forEach(function (w) {
      var at = [];
      if (w.r) tnr.forEach(function (r, i) { if (r === w.r) at.push(i); });
      if (at.length === 1) { w.kodas = ti[at[0]]; w.salis = tc.length === tn.length ? tc[at[0]] : null; }
      else if (vienas && wKodai.length === 1) w.kodas = wKodai[0];
      if (!w.salis && wSalys.length === 1) w.salis = wSalys[0];   // visi laimėtojai - vienos šalies
    });
    // Vertė - tik vieninteliam laimėtojui, kai visi skelbimo pasiūlymai yra sudarytų sutarčių
    var tv = tedSarasas(o["tender-value"]).map(function (x) { return suma(typeof x === "string" ? x.trim() : x); });
    var cur = unikalus(tedSarasas(o["tender-value-cur"])), ct = unikalus(tedSarasas(o["contract-tender-id"]).filter(function (x) { return typeof x === "string"; }));
    var tid = tedSarasas(o["tender-identifier"]);
    // winner-name ne visada išvardija visus laimėtojus (rasta: trys tie patys pavadinimai, o laimėtojų kodai - du), todėl ir kodų ne daugiau vieno
    if (vienas && wKodai.length <= 1 && cur.length === 1 && cur[0] === "EUR" && tv.length > 0 && tv.every(function (x) { return x !== null && x > 0; }) && tv.length === ct.length && tid.length === tv.length) laimetojai[0].vertes = tv;
    var neImoniu = 0;
    laimetojai = laimetojai.filter(function (w) { if (neImone(w.pav, w.kodas)) { neImoniu++; return false; } return true; })
      .map(function (w) { return { pav: w.pav, salis: w.salis, kodas: w.kodas, vertes: w.vertes }; });
    var pas = tedSarasas(o["received-submissions-type-val"]);
    var p = pas.map(function (x) { var k = typeof x === "number" ? x : (typeof x === "string" && /^\d{1,4}$/.test(x) ? +x : NaN); return isFinite(k) && k >= 0 && k < 10000 ? k : null; }).filter(function (x) { return x !== null; });
    return { nr: o["publication-number"], data: data(o["publication-date"]), laimetojai: laimetojai, pasiulymu: p.length ? Math.max.apply(null, p) : null, neImoniu: neImoniu };
  }

  // ---------------------------------------------------------------------------
  // Suvestinės
  // ---------------------------------------------------------------------------
  function grupe3(c) { return c && c.length ? c[0].slice(0, 3) : null; }

  /* Pirkėjo sutarčių žemėlapis: sutartys, kurios baigiasi per MENESIU mėn., pagal BVPŽ grupę (3 skaitmenys); kiekvienai grupei -
     ir koncentracija: didžiausio tiekėjo dalis grupės sutarčių (nuo MIN_VERTE, per METU metų) vertėje. Kelių tiekėjų sutarties
     vertė dalijama po lygiai. */
  function pirkejoZemelapis(sutartys, salys, dabar) {
    var l = pirkejoLaikotarpis(dabar);
    var tiek = {};
    salys.forEach(function (s) { if (s) (tiek[s.dok] = tiek[s.dok] || []).push(s); });
    var grupes = {}, beTiekejo = 0, datuKlaidu = 0, matyta = {};
    function gr(k) { return grupes[k] = grupes[k] || { grupe: k, sutartys: [], konc: {}, koncSuma: 0, koncSutarciu: 0 }; }
    sutartys.forEach(function (c) {
      if (!c || matyta[c.id]) return;
      matyta[c.id] = 1;
      if (c.datosKlaida) datuKlaidu++;
      var k = grupe3(c.cpv);
      if (!k) return;
      var ts = tiek[c.id] || [];
      if (!ts.length) beTiekejo++;
      if (c.galioja && c.galioja >= l.siandien && c.galioja <= l.iki) {
        var t = ts.length ? ts[0] : null;
        gr(k).sutartys.push({ id: c.id, cpv: c.cpv.slice(0, 3), pav: c.pav, verte: c.verte, sudaryta: c.sudaryta, galioja: c.galioja, pirkimoNr: c.pirkimoNr,
          menesiu: menesiuIki(l.siandien, c.galioja), importuota: c.importuota,
          tiekejas: t ? (t.viesas ? { pav: t.pav, kodas: t.kodas } : { paslepta: true, priezastis: t.priezastis || "nezinomas" }) : null, tiekeju: ts.length });
      }
      if (c.sudaryta && c.sudaryta >= l.nuo && c.verte !== null && c.verte >= MIN_VERTE && ts.length) {
        var g = gr(k), dalis = c.verte / ts.length;
        g.koncSuma += c.verte; g.koncSutarciu++;
        ts.forEach(function (s) {
          var raktas = s.kodas || ("~" + s.dok);
          var x = g.konc[raktas] = g.konc[raktas] || { suma: 0, pav: s.viesas ? s.pav : null, kodas: s.viesas ? s.kodas : null, priezastis: s.priezastis || "nezinomas" };
          x.suma += dalis;
        });
      }
    });
    var out = Object.keys(grupes).map(function (k) {
      var g = grupes[k];
      g.sutartys.sort(function (a, b) { return a.galioja < b.galioja ? -1 : a.galioja > b.galioja ? 1 : 0; });
      var koncentracija = null;
      var raktai = Object.keys(g.konc);
      if (raktai.length && g.koncSuma > 0) {
        raktai.sort(function (a, b) { return g.konc[b].suma - g.konc[a].suma; });
        var d = g.konc[raktai[0]];
        koncentracija = { sutarciu: g.koncSutarciu, suma: Math.round(g.koncSuma), tiekeju: raktai.length,
          didziausioDalis: Math.round(1000 * d.suma / g.koncSuma) / 10,
          didziausias: d.pav ? { pav: d.pav, kodas: d.kodas } : { paslepta: true, priezastis: d.priezastis } };
      }
      var baigiasi = g.sutartys.reduce(function (s, x) { return s + (x.verte || 0); }, 0);
      return { grupe: k, sutartys: g.sutartys.slice(0, 50), sutarciu: g.sutartys.length, baigiasiSuma: Math.round(baigiasi),
        artimiausia: g.sutartys.length ? g.sutartys[0].galioja : null, koncentracija: koncentracija };
    }).filter(function (g) { return g.sutarciu > 0; });
    out.sort(function (a, b) { return a.artimiausia < b.artimiausia ? -1 : a.artimiausia > b.artimiausia ? 1 : b.baigiasiSuma - a.baigiasiSuma; });
    var viso = out.reduce(function (s, g) { return s + g.sutarciu; }, 0);
    return { laikotarpis: l, grupes: out, sutarciu: viso, beTiekejo: beTiekejo, datuKlaidu: datuKlaidu };
  }

  /* Rinka pagal BVPŽ grupę (Lietuva): tiekėjai, laimėję sutartis nuo MIN_VERTE per METU metų. Viešai - tik juridiniai asmenys,
     ne asmens vardu pavadintos įmonės; kiti - tik suskaičiuojami. vidus - pajėgumui (kodai ir didžiausia sutartis), į atsakymą nepatenka. */
  function rinkosSuvestine(sutartys, salys, apribota) {
    var sut = {};
    sutartys.forEach(function (c) { if (c) sut[c.id] = c; });
    var per = {}, paslepti = {}, nezinomi = {}, suTiekeju = {};
    salys.forEach(function (s) {
      if (!s || !sut[s.dok]) return;
      var c = sut[s.dok];
      suTiekeju[s.dok] = 1;
      if (!s.juridinis) { nezinomi[s.dok + ":" + (s.kodas || "")] = 1; return; }
      var x = per[s.kodas] = per[s.kodas] || { kodas: s.kodas, pav: s.pav, viesas: s.viesas, kiekis: 0, suma: 0, didziausia: 0, paskutine: null, d: {} };
      if (x.d[c.id]) return;
      x.d[c.id] = 1;
      x.kiekis++;
      if (c.verte !== null) { x.suma += c.verte; x.didziausia = Math.max(x.didziausia, c.verte); }
      if (c.sudaryta && (!x.paskutine || c.sudaryta > x.paskutine)) x.paskutine = c.sudaryta;
      if (!s.viesas) paslepti[s.kodas] = 1;
    });
    var visi = Object.keys(per).map(function (k) { return per[k]; });
    var viesi = visi.filter(function (x) { return x.viesas; }).sort(function (a, b) { return b.suma - a.suma || b.kiekis - a.kiekis; });
    // Kada sudarytos įvertintos sutartys (kai apribota - naujausios MAX_RINKOS_SUTARCIU, ne visi 3 metai)
    var datos = sutartys.filter(function (c) { return c && c.sudaryta; }).map(function (c) { return c.sudaryta; }).sort();
    return {
      sutarciu: sutartys.filter(Boolean).length, apribota: !!apribota,
      laikotarpis: datos.length ? { nuo: datos[0], iki: datos[datos.length - 1] } : null,
      beTiekejo: sutartys.filter(function (c) { return c && !suTiekeju[c.id]; }).length,
      tiekeju: visi.length,
      tiekejai: viesi.slice(0, MAX_TIEKEJU).map(function (x) { return { pav: x.pav, kodas: x.kodas, kiekis: x.kiekis, suma: Math.round(x.suma), didziausia: Math.round(x.didziausia), paskutine: x.paskutine }; }),
      daugiau: Math.max(0, viesi.length - MAX_TIEKEJU),
      paslepta: Object.keys(paslepti).length,
      nezinomuSaliu: Object.keys(nezinomi).length,
      vidus: visi.map(function (x) { return { kodas: x.kodas, viesas: x.viesas, didziausia: x.didziausia }; })
    };
  }

  /* TED sutarčių sudarymo skelbimai: laimėtojai pagal šalį ir kodą arba pavadinimą. Ta pati įmonė su kodu ir be jo, kitomis kabutėmis
     ar žodžių tvarka („UAB „X““, „X, UAB“) - viena eilutė: įrašas be kodo prijungiamas prie to paties pavadinimo įrašo su kodu;
     Lietuvos įmonės su skirtingais kodais - atskiros, užsienio (jų kodai nerodomi) - pagal pavadinimą. kiekis - laimėtų skelbimų skaičius,
     suma ir didžiausia - tik žinomų verčių (null - nė vienos), beVertes - skelbimų be žinomos vertės. Asmens vardu pavadintos įmonės -
     tik suskaičiuojamos. laikotarpis - kada paskelbti įvertinti skelbimai (TED atsakymas - naujausi MAX_TED). */
  function tedSuvestine(skelbimai, viso) {
    var irasai = [], idx = {}, paslepta = {}, pas = [], beLaimetojo = 0, n = 0, neImoniu = 0, nuo = null, iki = null;
    skelbimai.forEach(function (s) {
      if (!s) return;
      n++;
      if (s.data) { if (!nuo || s.data < nuo) nuo = s.data; if (!iki || s.data > iki) iki = s.data; }
      if (s.pasiulymu !== null) pas.push(s.pasiulymu);
      neImoniu += s.neImoniu || 0;
      if (!s.laimetojai.length) { beLaimetojo++; return; }
      s.laimetojai.forEach(function (w) {
        var sal = w.salis || "", vr = vardoRaktas(w.pav), kr = w.kodas ? kodoRaktas(w.kodas) : null;
        var pk = vr ? sal + ":p:" + vr : null, kk = kr ? sal + ":k:" + kr : null;
        if (w.pav && asmensVardoForma(w.pav)) { paslepta[kk || pk] = 1; return; }
        if (!pk && !kk) return;
        var x = kk ? idx[kk] : null;
        if (!x && pk && idx[pk]) { var c = idx[pk]; if (!kr || !c.kodai.length || c.kodai.indexOf(kr) >= 0 || sal !== "LTU") x = c; }
        if (!x) { x = { pav: w.pav, salis: w.salis, kodai: [], kiekis: 0, zinomu: 0, suma: 0, didziausia: null, paskutine: null, skelbimas: s.nr, sk: {} }; irasai.push(x); }
        if (kk) { if (!idx[kk]) idx[kk] = x; if (x.kodai.indexOf(kr) < 0) x.kodai.push(kr); }
        if (pk && !idx[pk]) idx[pk] = x;
        if (!x.pav && w.pav) x.pav = w.pav;
        if (x.sk[s.nr]) return;
        x.sk[s.nr] = 1;
        x.kiekis++;
        if (w.vertes && w.vertes.length) {
          x.zinomu++;
          x.suma += w.vertes.reduce(function (a, b) { return a + b; }, 0);
          x.didziausia = Math.max(x.didziausia || 0, Math.max.apply(null, w.vertes));
        }
        if (s.data && (!x.paskutine || s.data > x.paskutine)) { x.paskutine = s.data; x.skelbimas = s.nr; }
      });
    });
    var visi = irasai.map(function (x) {
      x.kodas = x.salis === "LTU" && x.kodai.length === 1 && /^\d{7,9}$/.test(x.kodai[0]) ? x.kodai[0] : null;
      return x;
    }).sort(function (a, b) { return b.kiekis - a.kiekis || (b.suma || 0) - (a.suma || 0); });
    return {
      skelbimu: n, viso: typeof viso === "number" && viso >= 0 ? viso : n, apribota: typeof viso === "number" && viso > n,
      laikotarpis: nuo ? { nuo: nuo, iki: iki } : null,
      beLaimetojo: beLaimetojo, neImoniu: neImoniu, pasiulymuMediana: mediana(pas), pasiulymuSkelbimu: pas.length,
      laimetojai: visi.slice(0, MAX_TIEKEJU).map(function (x) {
        return { pav: x.pav, salis: x.salis, kodas: x.kodas, kiekis: x.kiekis, suma: x.zinomu ? Math.round(x.suma) : null, beVertes: x.kiekis - x.zinomu, paskutine: x.paskutine, skelbimas: x.skelbimas };
      }),
      daugiau: Math.max(0, visi.length - MAX_TIEKEJU), paslepta: Object.keys(paslepta).length,
      vidus: visi.filter(function (x) { return x.kodas; }).map(function (x) { return { kodas: x.kodas, didziausia: x.didziausia }; })
    };
  }

  /* Naujausių finansinių metų (ne senesnių nei METU + 1 m.) pardavimo pajamos kiekvienai įmonei: { _id -> { pajamos, metai } } */
  function pajamuSuvestine(eilutes) {
    var per = {};
    (eilutes || []).forEach(function (e) {
      if (!e || typeof e !== "object" || e.line_name !== "PARDAVIMO PAJAMOS") return;
      var id = e.juridinis_asmuo && typeof e.juridinis_asmuo._id === "string" && /^[0-9a-f-]{36}$/.test(e.juridinis_asmuo._id) ? e.juridinis_asmuo._id : null;
      var d = data(e.laikotarpis_iki), v = typeof e.reiksme === "number" && isFinite(e.reiksme) && e.reiksme >= 0 && e.reiksme < 1e12 ? e.reiksme : null;
      if (!id || !d || v === null) return;
      var x = per[id];
      if (!x || d > x.iki || (d === x.iki && v > x.pajamos)) per[id] = { pajamos: v, iki: d, metai: +d.slice(0, 4) };
    });
    return per;
  }

  /* Rinkos pajėgumas - tik skaičiai. Visi: juridiniai asmenys, laimėję panašias sutartis (Lietuva - VDA, ir TED Lietuvos kodai).
     Imtis - tik Lietuvos įmonės ir tik Lietuvos viešos sutartys: užsienio tiekėjų čia nėra, o patirtis kitur nežinoma (sąsaja tai sako).
     Apyvarta: naujausių finansinių metų pardavimo pajamos (asmens vardu pavadintoms įmonėms neieškoma - „nežinoma“).
     Patirtis: didžiausia panaši sutartis per METU metų; kai žinomos vertės nėra (tik TED be priskiriamos vertės) - „nežinoma“. */
  function pajegumas(rinka, ted, pajamos, kodasId, apyvarta, patirtis) {
    var visi = {};
    (rinka && rinka.vidus || []).forEach(function (x) { visi[x.kodas] = { viesas: x.viesas, didziausia: x.didziausia }; });
    // TED vertė gali būti nežinoma (null): skelbimas su keliais laimėtojais ar nelaimėjusiais pasiūlymais - vertės priskirti negalima
    (ted && ted.vidus || []).forEach(function (x) {
      var v = visi[x.kodas], d = typeof x.didziausia === "number" && isFinite(x.didziausia) ? x.didziausia : null;
      if (v) { if (d !== null) v.didziausia = v.didziausia === null ? d : Math.max(v.didziausia, d); }
      else visi[x.kodas] = { viesas: true, didziausia: d, tikTed: true };
    });
    var kodai = Object.keys(visi), metai = {};
    var r = { visi: kodai.length, apyvarta: null, patirtis: null, finansiniaiMetai: null };
    if (apyvarta) {
      var a = { atitiktu: 0, neatitiktu: 0, nezinoma: 0 };
      kodai.forEach(function (k) {
        var id = kodasId[k], p = id ? pajamos[id] : null;
        if (!visi[k].viesas || !p) { a.nezinoma++; return; }
        metai[p.metai] = 1;
        if (p.pajamos >= apyvarta) a.atitiktu++; else a.neatitiktu++;
      });
      r.apyvarta = a;
      var m = Object.keys(metai).map(Number).sort();
      r.finansiniaiMetai = m.length ? { nuo: m[0], iki: m[m.length - 1] } : null;
    }
    if (patirtis) {
      var p = { atitiktu: 0, neatitiktu: 0, nezinoma: 0 };
      kodai.forEach(function (k) { var d = visi[k].didziausia; if (d === null) p.nezinoma++; else if (d >= patirtis) p.atitiktu++; else p.neatitiktu++; });
      r.patirtis = p;
    }
    return r;
  }

  // ---------------------------------------------------------------------------
  // Darbai (vykdomi serveryje su įterpta gauk(uzklausa) -> Promise<JSON>; testuose - su netikra)
  // ---------------------------------------------------------------------------
  function paketai(a, n) { var out = []; for (var i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
  async function lygiagreciai(darbai, n) {
    var rez = new Array(darbai.length), i = 0;
    async function vienas() { while (i < darbai.length) { var k = i++; rez[k] = await darbai[k](); } }
    var g = [];
    for (var j = 0; j < Math.max(1, Math.min(n, darbai.length)); j++) g.push(vienas());
    await Promise.all(g);
    return rez;
  }
  function tikrasSarasas(j) {
    var d = duomenys(j);
    if (!d) { var e = new Error("netiketa-sandara"); e.rusis = "netiketa-sandara"; throw e; }
    return d;
  }

  /* Sutartis pagal numerį ir jos paskelbti pakeitimai.
     pagalNr - įrašai su tuo sutarties numeriu; pirkimo - visi to paties pirkimo įrašai; salys - jų šalys (su puse); jar - pirkimo vykdytojo
     kodas (neprivalomas: nurodžius, kito pirkimo vykdytojo sutartis tuo pačiu numeriu atmetama).
     Pakeitimai šaltinyje su sutartimi susieti tik pirkimo numeriu, todėl kai pirkime kelios sutartys, paliekami tik tie, kurių tiekėjas -
     šios sutarties tiekėjas (jei jis žinomas), o atsakyme - keliosSutartys: true (žmogus sutikrina). */
  function sutartiesSuvestine(pagalNr, pirkimo, salys, jar) {
    var pagalDok = {};
    salys.forEach(function (x) { (pagalDok[x.dok] = pagalDok[x.dok] || []).push(x); });
    function pirkejoTinka(c) {
      if (!jar) return true;
      var pk = (pagalDok[c.id] || []).filter(function (x) { return !x.tiekejas; });
      return !pk.length || pk.some(function (x) { return x.kodas === jar; });
    }
    var visi = {}, sar = [];
    pagalNr.concat(pirkimo).forEach(function (c) { if (c && !visi[c.id]) { visi[c.id] = 1; sar.push(c); } });
    var baz = pagalNr.filter(function (c) { return c.tipas === "1" && pirkejoTinka(c); });
    if (!baz.length) {
      /* įrašytas pakeitimo numeris - sutartis randama pagal jo pirkimo numerį, jei pirkime ji viena */
      var pn = unikalus(pagalNr.filter(pirkejoTinka).map(function (c) { return c.pirkimoNr; }));
      var kand = sar.filter(function (c) { return c.tipas === "1" && pn.indexOf(c.pirkimoNr) >= 0 && pirkejoTinka(c); });
      if (kand.length === 1) baz = kand;
    }
    if (!baz.length) return { sutartis: null, pakeitimai: [], keliosSutartys: false };
    baz.sort(function (a, b) { return (b.sudaryta || "") < (a.sudaryta || "") ? -1 : 1; });
    var b = baz[0], tiek = (pagalDok[b.id] || []).filter(function (x) { return x.tiekejas; }), vs = tiek.filter(function (x) { return x.viesas; })[0];
    var kodai = tiek.map(function (x) { return x.kodas; }).filter(Boolean);
    var pirkimoBaziniu = sar.filter(function (c) { return c.tipas === "1" && c.pirkimoNr && c.pirkimoNr === b.pirkimoNr; }).length;
    var matyti = {}, pak = [];
    sar.filter(function (c) { return c.tipas === "5" && c.pirkimoNr && c.pirkimoNr === b.pirkimoNr && (!b.sudaryta || !c.sudaryta || c.sudaryta >= b.sudaryta); }).forEach(function (c) {
      var ct = (pagalDok[c.id] || []).filter(function (x) { return x.tiekejas && x.kodas; });
      if (pirkimoBaziniu > 1 && kodai.length && ct.length && !ct.some(function (x) { return kodai.indexOf(x.kodas) >= 0; })) return;
      var r = (c.nr || "") + "|" + (c.sudaryta || "");
      if (matyti[r] || !c.nr) return;
      matyti[r] = 1;
      pak.push({ nr: c.nr, sudaryta: c.sudaryta, verte: c.verte });
    });
    pak.sort(function (x, y) { return (x.sudaryta || "9") < (y.sudaryta || "9") ? -1 : (x.sudaryta || "9") > (y.sudaryta || "9") ? 1 : 0; });
    return {
      sutartis: { nr: b.nr, sudaryta: b.sudaryta, galioja: b.galioja, pirkimoNr: b.pirkimoNr, pav: b.pav, verte: b.verte,
        tiekejas: vs ? { pav: vs.pav, kodas: vs.kodas } : (tiek.length ? { paslepta: true, priezastis: tiek[0].priezastis } : null), tiekeju: tiek.length },
      pakeitimai: pak.slice(0, MAX_PAKEITIMU), keliosSutartys: baz.length > 1 || pirkimoBaziniu > 1
    };
  }
  async function vykdykSutartis(p, gauk, o) {
    o = o || {};
    var dabar = o.dabar, n = o.lygiagreciai || 2;
    var pagalNr = tikrasSarasas(await gauk(uzklausaSutartisNr(p.nr))).map(function (x) { return sutartiesIrasas(x, dabar); }).filter(Boolean);
    if (!pagalNr.length) return { sutartis: null, pakeitimai: [], keliosSutartys: false };
    var pnr = unikalus(pagalNr.map(function (c) { return pirkimoNr(c.pirkimoNr); })).slice(0, 2), pirkimo = [];
    for (var i = 0; i < pnr.length; i++) pirkimo = pirkimo.concat(tikrasSarasas(await gauk(uzklausaPirkimoSutartys(pnr[i]))).map(function (x) { return sutartiesIrasas(x, dabar); }).filter(Boolean));
    var ids = unikalus(pagalNr.concat(pirkimo).map(function (c) { return c.id; })).slice(0, MAX_PIRKIMO_SUTARCIU);
    var salys = (await lygiagreciai(paketai(ids, PAKETAS_SALIU).map(function (pk) {
      return async function () { return tikrasSarasas(await gauk(uzklausaSalys(pk))); };
    }), n)).reduce(function (a, b) { return a.concat(b); }, []).map(salisSuPuse).filter(Boolean);
    return sutartiesSuvestine(pagalNr, pirkimo, salys, p.jar || null);
  }

  async function vykdykPirkejas(p, gauk, o) {
    o = o || {};
    var dabar = o.dabar, n = o.lygiagreciai || 2;
    var ids = tikrasSarasas(await gauk(uzklausaPirkejoId(p.jar))).map(function (x) { return dokId(x && x.dok_id); }).filter(Boolean);
    var unik = ids.filter(function (x, i) { return ids.indexOf(x) === i; });
    var sut = (await lygiagreciai(paketai(unik, PAKETAS_SUTARCIU).map(function (pk) {
      return async function () { return tikrasSarasas(await gauk(uzklausaPirkejoSutartys(pk, dabar))); };
    }), n)).reduce(function (a, b) { return a.concat(b); }, []).map(function (x) { return sutartis(x, dabar); }).filter(Boolean);
    var salys = (await lygiagreciai(paketai(sut.map(function (c) { return c.id; }), PAKETAS_SALIU).map(function (pk) {
      return async function () { return tikrasSarasas(await gauk(uzklausaTiekejai(pk))); };
    }), n)).reduce(function (a, b) { return a.concat(b); }, []).map(salis).filter(Boolean);
    var z = pirkejoZemelapis(sut, salys, dabar);
    z.pirkejoSutarciu = unik.length;
    z.apribota = ids.length >= MAX_PIRKEJO_SUTARCIU;
    return z;
  }

  async function vykdykRinka(p, gauk, o) {
    o = o || {};
    var dabar = o.dabar, n = o.lygiagreciai || 2;
    var lt = null, ted = null, klaidos = {};
    try {
      var sut = tikrasSarasas(await gauk(uzklausaRinka(p.cpv, dabar))).map(function (x) { return sutartis(x, dabar); }).filter(Boolean);
      var salys = (await lygiagreciai(paketai(sut.map(function (c) { return c.id; }), PAKETAS_SALIU).map(function (pk) {
        return async function () { return tikrasSarasas(await gauk(uzklausaTiekejai(pk))); };
      }), n)).reduce(function (a, b) { return a.concat(b); }, []).map(salis).filter(Boolean);
      lt = rinkosSuvestine(sut, salys, sut.length >= MAX_RINKOS_SUTARCIU);
    } catch (e) { klaidos.vda = e && e.rusis ? e.rusis : "saltinis"; }
    try {
      var j = await gauk(uzklausaTed(p.cpv, p.ted || "lt", dabar));
      if (!j || typeof j !== "object" || !Array.isArray(j.notices)) { var e2 = new Error("netiketa-sandara"); e2.rusis = "netiketa-sandara"; throw e2; }
      ted = tedSuvestine(j.notices.slice(0, MAX_TED).map(tedSkelbimas), typeof j.totalNoticeCount === "number" ? j.totalNoticeCount : null);
      ted.apimtis = p.ted === "es" ? "es" : "lt";
    } catch (e) { klaidos.ted = e && e.rusis ? e.rusis : "saltinis"; }
    if (!lt && !ted) { var k = new Error("saltinis"); k.rusis = klaidos.vda || klaidos.ted || "saltinis"; throw k; }
    return { lt: lt, ted: ted, klaidos: klaidos };
  }

  // Finansai pajėgumui: tik viešų (ne asmens vardu pavadintų) juridinių asmenų kodai, iki MAX_FINANSU
  async function vykdykFinansai(kodai, gauk, o) {
    o = o || {};
    var dabar = o.dabar, n = o.lygiagreciai || 2;
    kodai = kodai.filter(function (k, i) { return /^\d{7,9}$/.test(k) && kodai.indexOf(k) === i; }).slice(0, MAX_FINANSU);
    var kodasId = {};
    (await lygiagreciai(paketai(kodai, PAKETAS_JAR).map(function (pk) {
      return async function () { return tikrasSarasas(await gauk(uzklausaJa(pk))); };
    }), n)).forEach(function (eil) {
      eil.forEach(function (x) {
        if (x && typeof x._id === "string" && /^[0-9a-f-]{36}$/.test(x._id) && (typeof x.ja_kodas === "number" || typeof x.ja_kodas === "string")) {
          var k = String(x.ja_kodas);
          if (kodai.indexOf(k) >= 0) kodasId[k] = x._id;
        }
      });
    });
    var idai = Object.keys(kodasId).map(function (k) { return kodasId[k]; });
    var eil = (await lygiagreciai(paketai(idai, PAKETAS_JAR).map(function (pk) {
      return async function () { return tikrasSarasas(await gauk(uzklausaPajamos(pk, dabar))); };
    }), n)).reduce(function (a, b) { return a.concat(b); }, []);
    return { kodasId: kodasId, pajamos: pajamuSuvestine(eil), ieskota: kodai.length };
  }

  // ---------------------------------------------------------------------------
  // HTTP: maršrutai ir atsakymai (grynos funkcijos)
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
    jar: "Pirkimo vykdytojo kodas - 7-9 skaitmenys.",
    cpv: "BVPŽ kodo pradžia - 3-8 skaitmenys.",
    nr: "Sutarties numeris - 3-60 ženklų: raidės be diakritikų, skaitmenys ir ženklai - / . _",
    ted: "TED apimtis - lt arba es.",
    apyvarta: "Apyvartos riba - teigiamas skaičius eurais.",
    patirtis: "Patirties riba - teigiamas skaičius eurais.",
    ribos: "Nurodykite apyvartos arba patirties ribą.",
    parametras: "Neleidžiamas arba pasikartojantis parametras.",
    metodas: "Leidžiamos tik GET užklausos.",
    kelias: "Tokio adreso nėra.",
    saltinis: "Viešų sutarčių duomenų šaltinis neatsakė - bandykite vėliau.",
    ruosiama: "Duomenys ruošiami - pakartokite užklausą po kelių sekundžių."
  };
  var KLAIDU_RUSYS = {
    "rysys": "nepavyko prisijungti prie šaltinio", "saltinis-500": "šaltinis atsakė klaida (HTTP 5xx)", "saltinis-kita": "šaltinis atsakė netikėtai",
    "per-didelis": "atsakymas didesnis už leidžiamą", "netiketa-sandara": "šaltinio atsakymo sandara netikėta", "laikas": "šaltinis neatsakė laiku",
    "saltinis": "šaltinis neatsakė"
  };

  function parametrai(sp, leidziami) {
    for (var k of sp.keys()) if (leidziami.indexOf(k) < 0 || sp.getAll(k).length !== 1) return { klaida: "parametras" };
    return null;
  }

  /* marsrutas(metodas, adresas, kilme, busena) -> { atsakymas } arba { darbas: { tipas, raktas, p } }.
     Darbo rezultatą į atsakymą paverčia atsakymasDarbo(). */
  function marsrutas(metodas, adresas, kilme, busena) {
    metodas = String(metodas || "").toUpperCase();
    if (metodas === "OPTIONS") return { atsakymas: { status: 204, antrastes: antrastes(kilme), kunas: "" } };
    if (metodas !== "GET" && metodas !== "HEAD") return { atsakymas: json(405, { klaida: KLAIDOS.metodas }, kilme) };
    if (typeof adresas !== "string" || adresas.length > 300) return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) };
    var u;
    try { u = new URL(adresas, "http://vietinis"); } catch (e) { return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) }; }
    var sp = u.searchParams, m;
    if (u.pathname === "/api/sutartys/busena") {
      if (sp.toString()) return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) };
      return { atsakymas: json(200, Object.assign({ versija: VERSIJA }, busena || {}), kilme) };
    }
    if ((m = /^\/api\/sutartys\/pirkejas\/([^\/]+)$/.exec(u.pathname))) {
      var jar = jarKodas(m[1]);
      if (!jar) return { atsakymas: json(400, { klaida: KLAIDOS.jar, parametras: "jar" }, kilme) };
      if (sp.toString()) return { atsakymas: json(400, { klaida: KLAIDOS.kelias, parametras: "kelias" }, kilme) };
      return { darbas: { tipas: "pirkejas", raktas: "p:" + jar, p: { jar: jar } } };
    }
    if (u.pathname === "/api/sutartys/sutartis") {
      var e0 = parametrai(sp, ["nr", "pirkejas"]);
      if (e0) return { atsakymas: json(400, { klaida: KLAIDOS.parametras, parametras: "parametras" }, kilme) };
      var nr = sutartiesNr(sp.get("nr"));
      if (!nr) return { atsakymas: json(400, { klaida: KLAIDOS.nr, parametras: "nr" }, kilme) };
      var pj = sp.has("pirkejas") ? jarKodas(sp.get("pirkejas")) : null;
      if (sp.has("pirkejas") && !pj) return { atsakymas: json(400, { klaida: KLAIDOS.jar, parametras: "pirkejas" }, kilme) };
      return { darbas: { tipas: "sutartis", raktas: "s:" + nr + ":" + (pj || ""), p: { nr: nr, jar: pj } } };
    }
    if (u.pathname === "/api/sutartys/rinka") {
      var e1 = parametrai(sp, ["cpv", "ted"]);
      if (e1) return { atsakymas: json(400, { klaida: KLAIDOS.parametras, parametras: "parametras" }, kilme) };
      var cpv = cpvPradzia(sp.get("cpv"));
      if (!cpv) return { atsakymas: json(400, { klaida: KLAIDOS.cpv, parametras: "cpv" }, kilme) };
      var ted = sp.get("ted");
      if (ted !== null && ted !== "lt" && ted !== "es") return { atsakymas: json(400, { klaida: KLAIDOS.ted, parametras: "ted" }, kilme) };
      ted = ted || "lt";
      return { darbas: { tipas: "rinka", raktas: "r:" + cpv + ":" + ted, p: { cpv: cpv, ted: ted } } };
    }
    if (u.pathname === "/api/sutartys/pajegumas") {
      var e2 = parametrai(sp, ["cpv", "apyvarta", "patirtis"]);
      if (e2) return { atsakymas: json(400, { klaida: KLAIDOS.parametras, parametras: "parametras" }, kilme) };
      var cpv2 = cpvPradzia(sp.get("cpv"));
      if (!cpv2) return { atsakymas: json(400, { klaida: KLAIDOS.cpv, parametras: "cpv" }, kilme) };
      var ap = sp.has("apyvarta") ? riba(sp.get("apyvarta")) : null, pt = sp.has("patirtis") ? riba(sp.get("patirtis")) : null;
      if (sp.has("apyvarta") && !ap) return { atsakymas: json(400, { klaida: KLAIDOS.apyvarta, parametras: "apyvarta" }, kilme) };
      if (sp.has("patirtis") && !pt) return { atsakymas: json(400, { klaida: KLAIDOS.patirtis, parametras: "patirtis" }, kilme) };
      if (!ap && !pt) return { atsakymas: json(400, { klaida: KLAIDOS.ribos, parametras: "apyvarta" }, kilme) };
      return { darbas: { tipas: "pajegumas", raktas: "g:" + cpv2, p: { cpv: cpv2, apyvarta: ap, patirtis: pt } } };
    }
    return { atsakymas: json(404, { klaida: KLAIDOS.kelias }, kilme) };
  }

  function meta(irasas, dabar) {
    var amz = (dabar - irasas.laikas) / 3600000;
    return { atnaujinta: new Date(irasas.laikas).toISOString().replace(/\.\d{3}Z$/, "Z"), pasenusi: amz > TTL_VAL,
      klaida: irasas.klaida ? { rusis: irasas.klaida, tekstas: KLAIDU_RUSYS[irasas.klaida] || KLAIDU_RUSYS.saltinis } : null, versija: VERSIJA };
  }
  function be(o, laukai) { var x = {}; Object.keys(o).forEach(function (k) { if (laukai.indexOf(k) < 0) x[k] = o[k]; }); return x; }

  /* Darbo rezultatas -> atsakymas. irasas: { laikas, duomenys, klaida? } (klaida - kai tai paskutinis geras rezultatas, o naujas nepavyko);
     pajėgumui - ir rinka bei finansai. Įvestis (kodas, BVPŽ, ribos) į atsakymą nededama. */
  function atsakymasDarbo(darbas, irasas, kilme, dabar, papildomai) {
    dabar = typeof dabar === "number" ? dabar : Date.now();
    var d = irasas.duomenys, mt = meta(irasas, dabar);
    if (darbas.tipas === "pirkejas") return json(200, { zemelapis: d, meta: mt }, kilme);
    if (darbas.tipas === "sutartis") return json(200, { sutartis: d.sutartis, pakeitimai: d.pakeitimai, keliosSutartys: d.keliosSutartys, meta: mt }, kilme);
    if (darbas.tipas === "rinka") {
      return json(200, { lt: d.lt ? be(d.lt, ["vidus"]) : null, ted: d.ted ? be(d.ted, ["vidus"]) : null,
        klaidos: Object.keys(d.klaidos || {}).reduce(function (o, k) { o[k] = KLAIDU_RUSYS[d.klaidos[k]] || KLAIDU_RUSYS.saltinis; return o; }, {}), meta: mt }, kilme);
    }
    if (darbas.tipas === "pajegumas") {
      var f = papildomai || { kodasId: {}, pajamos: {} };
      var r = pajegumas(d.lt, d.ted, f.pajamos, f.kodasId, darbas.p.apyvarta, darbas.p.patirtis);
      r.saltiniai = { lt: !!d.lt, ted: !!d.ted, finansai: !!papildomai };
      r.sutarciu = d.lt ? d.lt.sutarciu : null;
      r.apribota = !!(d.lt && d.lt.apribota);
      return json(200, { pajegumas: r, meta: mt }, kilme);
    }
    return json(404, { klaida: KLAIDOS.kelias }, kilme);
  }

  return {
    VERSIJA: VERSIJA, KILMES: KILMES, SALTINIAI: SALTINIAI, MENESIU: MENESIU, METU: METU, MIN_VERTE: MIN_VERTE,
    MAX_PIRKEJO_SUTARCIU: MAX_PIRKEJO_SUTARCIU, MAX_RINKOS_SUTARCIU: MAX_RINKOS_SUTARCIU, MAX_TED: MAX_TED, MAX_TIEKEJU: MAX_TIEKEJU,
    MAX_FINANSU: MAX_FINANSU, TTL_VAL: TTL_VAL, PASENES_MAX_D: PASENES_MAX_D, KLAIDOS: KLAIDOS, KLAIDU_RUSYS: KLAIDU_RUSYS,
    siandien: siandien, pridekMen: pridekMen, menesiuIki: menesiuIki, svarus: svarus, data: data, suma: suma, cpvKodai: cpvKodai,
    asmensVardoForma: asmensVardoForma, jarKodas: jarKodas, cpvPradzia: cpvPradzia, riba: riba,
    uzklausaPirkejoId: uzklausaPirkejoId, uzklausaPirkejoSutartys: uzklausaPirkejoSutartys, uzklausaTiekejai: uzklausaTiekejai,
    uzklausaRinka: uzklausaRinka, uzklausaJa: uzklausaJa, uzklausaPajamos: uzklausaPajamos, uzklausaTed: uzklausaTed,
    sutartis: sutartis, salis: salis, tedSkelbimas: tedSkelbimas, vardoRaktas: vardoRaktas, kodoRaktas: kodoRaktas, neImone: neImone, TED_LAUKAI: TED_LAUKAI,
    pirkejoZemelapis: pirkejoZemelapis, rinkosSuvestine: rinkosSuvestine, tedSuvestine: tedSuvestine, pajamuSuvestine: pajamuSuvestine, pajegumas: pajegumas,
    sutartiesNr: sutartiesNr, uzklausaSutartisNr: uzklausaSutartisNr, uzklausaPirkimoSutartys: uzklausaPirkimoSutartys, uzklausaSalys: uzklausaSalys,
    sutartiesIrasas: sutartiesIrasas, sutartiesSuvestine: sutartiesSuvestine, vykdykSutartis: vykdykSutartis, MAX_PAKEITIMU: MAX_PAKEITIMU,
    vykdykPirkejas: vykdykPirkejas, vykdykRinka: vykdykRinka, vykdykFinansai: vykdykFinansai, lygiagreciai: lygiagreciai,
    marsrutas: marsrutas, atsakymasDarbo: atsakymasDarbo, kilmesAntraste: kilmesAntraste, jsonAtsakymas: json
  };
});
