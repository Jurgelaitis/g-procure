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
 *    ir ES pagal TED).
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

  var VERSIJA = "2026-11-19";
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
  var ASMENS_FORMA = /(^|[^\p{L}])(individuali(?:oji)?\s+įmonė|individualioji\s+įmonė|mažoji\s+bendrija|tikroji\s+ūkinė\s+bendrija|komanditinė\s+ūkinė\s+bendrija|ūkinė\s+bendrija|ūkininkas|ūkininkė|ūkininko\s+ūkis|fizinis\s+asmuo|IĮ|MB|TŪB|KŪB|ŪB)(?=$|[^\p{L}])/iu;
  function asmensVardoForma(pav) {
    if (typeof pav !== "string") return true;
    return ASMENS_FORMA.test(pav.replace(/[„“"”«»]/g, " "));
  }

  // ---------------------------------------------------------------------------
  // Įvesties tikrinimas
  // ---------------------------------------------------------------------------
  function jarKodas(s) { return typeof s === "string" && /^\d{7,9}$/.test(s) ? s : null; }
  // BVPŽ kodo pradžia: 3-8 skaitmenys; galiniai nuliai nuimami (31210000 -> 3121), bet ne trumpiau nei 3
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
    "winner-identifier", "tender-value", "tender-value-cur", "received-submissions-type-val"];
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
    return { dok: dok, kodas: viesas || juridinis ? kodas : null, pav: viesas ? pav : null, viesas: viesas, juridinis: juridinis };
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
  function tedSkelbimas(o) {
    if (!o || typeof o !== "object" || typeof o["publication-number"] !== "string" || !/^\d{1,8}-\d{4}$/.test(o["publication-number"])) return null;
    var vardai = tedSarasas(o["winner-name"]), salys = tedSarasas(o["winner-country"]), kodai = tedSarasas(o["winner-identifier"]);
    var vertes = tedSarasas(o["tender-value"]), val = tedSarasas(o["tender-value-cur"]), pas = tedSarasas(o["received-submissions-type-val"]);
    var n = Math.max(vardai.length, kodai.length);
    var laimetojai = [];
    for (var i = 0; i < Math.min(n, 20); i++) {
      var pav = svarus(tedTekstas(vardai[i]), 200), salisK = typeof salys[i] === "string" && /^[A-Z]{3}$/.test(salys[i]) ? salys[i] : (typeof salys[0] === "string" && /^[A-Z]{3}$/.test(salys[0]) ? salys[0] : null);
      var kodas = typeof kodai[i] === "string" ? kodai[i].replace(/\s+/g, "") : null;
      if (kodas && !/^[A-Za-z0-9.\-\/]{3,30}$/.test(kodas)) kodas = null;
      if (!pav && !kodas) continue;
      var vertesI = suma(vertes[i] !== undefined ? vertes[i] : null), eur = (val[i] || val[0]) === "EUR";
      laimetojai.push({ pav: pav, salis: salisK, kodas: kodas, verte: eur ? vertesI : null });
    }
    var p = pas.map(function (x) { var k = typeof x === "number" ? x : (typeof x === "string" && /^\d{1,4}$/.test(x) ? +x : NaN); return isFinite(k) && k >= 0 && k < 10000 ? k : null; }).filter(function (x) { return x !== null; });
    return { nr: o["publication-number"], data: data(o["publication-date"]), laimetojai: laimetojai, pasiulymu: p.length ? Math.max.apply(null, p) : null };
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
          tiekejas: t ? (t.viesas ? { pav: t.pav, kodas: t.kodas } : { paslepta: true }) : null, tiekeju: ts.length });
      }
      if (c.sudaryta && c.sudaryta >= l.nuo && c.verte !== null && c.verte >= MIN_VERTE && ts.length) {
        var g = gr(k), dalis = c.verte / ts.length;
        g.koncSuma += c.verte; g.koncSutarciu++;
        ts.forEach(function (s) {
          var raktas = s.kodas || ("~" + s.dok);
          var x = g.konc[raktas] = g.konc[raktas] || { suma: 0, pav: s.viesas ? s.pav : null, kodas: s.viesas ? s.kodas : null };
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
          didziausias: d.pav ? { pav: d.pav, kodas: d.kodas } : { paslepta: true } };
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
    return {
      sutarciu: sutartys.filter(Boolean).length, apribota: !!apribota,
      beTiekejo: sutartys.filter(function (c) { return c && !suTiekeju[c.id]; }).length,
      tiekeju: visi.length,
      tiekejai: viesi.slice(0, MAX_TIEKEJU).map(function (x) { return { pav: x.pav, kodas: x.kodas, kiekis: x.kiekis, suma: Math.round(x.suma), didziausia: Math.round(x.didziausia), paskutine: x.paskutine }; }),
      daugiau: Math.max(0, viesi.length - MAX_TIEKEJU),
      paslepta: Object.keys(paslepti).length,
      nezinomuSaliu: Object.keys(nezinomi).length,
      vidus: visi.map(function (x) { return { kodas: x.kodas, viesas: x.viesas, didziausia: x.didziausia }; })
    };
  }

  /* TED sutarčių sudarymo skelbimai: laimėtojai pagal kodą arba pavadinimą ir šalį. Asmens vardu pavadintos įmonės - tik suskaičiuojamos. */
  function tedSuvestine(skelbimai, viso) {
    var per = {}, paslepta = {}, pas = [], beLaimetojo = 0, n = 0;
    skelbimai.forEach(function (s) {
      if (!s) return;
      n++;
      if (s.pasiulymu !== null) pas.push(s.pasiulymu);
      if (!s.laimetojai.length) { beLaimetojo++; return; }
      s.laimetojai.forEach(function (w) {
        var raktas = (w.salis || "") + ":" + (w.kodas ? "k" + w.kodas.toUpperCase() : "p" + String(w.pav || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim());
        if (w.pav && asmensVardoForma(w.pav)) { paslepta[raktas] = 1; return; }
        var x = per[raktas] = per[raktas] || { pav: w.pav, salis: w.salis, kodas: w.salis === "LTU" && w.kodas && /^\d{7,9}$/.test(w.kodas) ? w.kodas : null, kiekis: 0, suma: 0, didziausia: 0, paskutine: null, skelbimas: s.nr };
        if (!x.pav && w.pav) x.pav = w.pav;
        x.kiekis++;
        if (w.verte !== null) { x.suma += w.verte; x.didziausia = Math.max(x.didziausia, w.verte); }
        if (s.data && (!x.paskutine || s.data > x.paskutine)) { x.paskutine = s.data; x.skelbimas = s.nr; }
      });
    });
    var visi = Object.keys(per).map(function (k) { return per[k]; }).filter(function (x) { return x.pav || x.kodas; })
      .sort(function (a, b) { return b.kiekis - a.kiekis || b.suma - a.suma; });
    return {
      skelbimu: n, viso: typeof viso === "number" && viso >= 0 ? viso : n, apribota: typeof viso === "number" && viso > n,
      beLaimetojo: beLaimetojo, pasiulymuMediana: mediana(pas), pasiulymuSkelbimu: pas.length,
      laimetojai: visi.slice(0, MAX_TIEKEJU).map(function (x) { return { pav: x.pav, salis: x.salis, kodas: x.kodas, kiekis: x.kiekis, suma: Math.round(x.suma), paskutine: x.paskutine, skelbimas: x.skelbimas }; }),
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
     Apyvarta: naujausių finansinių metų pardavimo pajamos (asmens vardu pavadintoms įmonėms neieškoma - „nežinoma“).
     Patirtis: didžiausia panaši sutartis per METU metų. */
  function pajegumas(rinka, ted, pajamos, kodasId, apyvarta, patirtis) {
    var visi = {};
    (rinka && rinka.vidus || []).forEach(function (x) { visi[x.kodas] = { viesas: x.viesas, didziausia: x.didziausia }; });
    (ted && ted.vidus || []).forEach(function (x) {
      var v = visi[x.kodas];
      if (v) v.didziausia = Math.max(v.didziausia, x.didziausia);
      else visi[x.kodas] = { viesas: true, didziausia: x.didziausia, tikTed: true };
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
      var p = { atitiktu: 0, neatitiktu: 0 };
      kodai.forEach(function (k) { if (visi[k].didziausia >= patirtis) p.atitiktu++; else p.neatitiktu++; });
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
    sutartis: sutartis, salis: salis, tedSkelbimas: tedSkelbimas,
    pirkejoZemelapis: pirkejoZemelapis, rinkosSuvestine: rinkosSuvestine, tedSuvestine: tedSuvestine, pajamuSuvestine: pajamuSuvestine, pajegumas: pajegumas,
    vykdykPirkejas: vykdykPirkejas, vykdykRinka: vykdykRinka, vykdykFinansai: vykdykFinansai, lygiagreciai: lygiagreciai,
    marsrutas: marsrutas, atsakymasDarbo: atsakymasDarbo, kilmesAntraste: kilmesAntraste, jsonAtsakymas: json
  };
});
