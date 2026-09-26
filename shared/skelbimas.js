/* ============================================================================
 * G-Procure  shared/skelbimas.js   (window.GP_SKELBIMAS)
 * ----------------------------------------------------------------------------
 * CVP IS skelbimo (eForms, PDF tekstas per shared/dokumentai.js) ATPAŽINIMAS
 * naršyklėje, be serverio ir be AI:
 *  - pirkejas() ir rezimas() - pirkimo vykdytojas ir teisinis režimas. Iki
 *    2026-09-26 gyveno PP-tiekejams/cvpis.js (atpazinkPirkeja / atpazinkRezima;
 *    ten jie paliko kaip nuorodos į šiuos). Sandara - iš 4 tikrų skelbimų
 *    (LITGRID 9683631, Amber Grid 9742096, EPSO-G 9281765, Energy cells 9614756);
 *  - atpazink() - pirkimo kortelės laukų PASIŪLYMAI (tobulinimo planas A2):
 *    pavadinimas, būdas, objektas, BVPŽ, vertė, dalys, galiojimas (mėn.),
 *    pasiūlymų ar paraiškų terminas, išsiuntimo data, CVP IS numeris, būsena.
 *
 * TAISYKLĖS:
 *  - Kiekvienas pasiūlymas turi CITATĄ - skelbimo eilutę, iš kurios paimtas.
 *    Jis galioja tik žmogui patvirtinus (kortelių puslapis rodo žymimuosius
 *    langelius) - niekas netaikoma savaime.
 *  - Neaišku - nesiūloma: skelbime nėra vertės - vertės pasiūlymo nėra; būdo
 *    variantas (supaprastintas ar tarptautinis) siūlomas tik pagal failo vardą
 *    („Nacionalinis skelbimas...“ - supaprastintas, „Skelbimas apie pirkimą...“ -
 *    tarptautinis), kitaip - tik pastaba, kurį būdą skelbimas nurodo.
 *  - Režimą lemia skelbimas, ne organizacija (Energy cells 9614756 - perkančiosios
 *    organizacijos formos): abiejų režimų požymiai - neaiškus, nesiūloma.
 *  - BVPŽ skelbime be kontrolinio skaitmens: pilnas kodas imamas iš
 *    shared/cpv-data.js (GP_CPV_DATA), jei jis įkeltas; kitaip - pastaba.
 * Nieko nesiunčia ir nesaugo.
 * ==========================================================================*/
;(function (global) {
  "use strict";

  function minkstas(s) { return String(s == null ? "" : s).replace(/[­‐‑]/g, "-").replace(/\s+/g, " ").trim(); }

  // ---------------------------------------------------------------------------
  // Pirkimo vykdytojas: pirmas „Oficialus pavadinimas“ po „1.1 Pirkėjas“ (8 skyriuje
  // jis kartojasi - peržiūros institucija, e. sistemos tiekėjas).
  // ---------------------------------------------------------------------------
  function pirkejas(tekstas) {
    var t = String(tekstas || "");
    // Prieš „1.1 Pirkėjas“ - eilutės pradžia arba tarpas (pdf.js tekste eilutės skiriamos \n, bet
    // TXT / DOCX blokuose skyrius gali būti toje pačioje eilutėje)
    var a = /(?:^|\s)1\.1\s+(?:Pirk[eė]jas|Buyer)\b/i.exec(t);
    if (!a) return null;
    var po = t.slice(a.index, a.index + 600);
    var m = /(?:Oficialus\s+pavadinimas|Official\s+name)\s*:\s*([^\n]{2,160})/i.exec(po);
    if (!m) return null;
    var zyma = minkstas(m[0]).replace(/:.*$/, ":");
    var v = minkstas(m[1]);
    // Į vieną eilutę sulietame bloke po pavadinimo eina kitas skelbimo laukas (tikruose PDF - nauja
    // eilutė „Pirkėjo teisinė forma: ...“) - pavadinimas nukerpamas ties juo
    var kitas = /\s+(?:Pirk[eė]jo\s+teisin|Perkan[čc]io(?:jo|sios)\s|Legal\s+type|Activity\s+of|Registracijos\s+numeris|Registration\s+number|Pa[šs]to\s+adresas|Postal\s+address)/i.exec(v);
    if (kitas && kitas.index > 0) v = v.slice(0, kitas.index).trim();
    var snippet = (zyma + " " + v).slice(0, 120);
    var pv = /\(PV\)\s*$/i.test(v);
    v = v.replace(/\s*\(PV\)\s*$/i, "").trim();
    // Kabutės nuimamos tik kai visas pavadinimas jose („"UAB X"“); „AB "Amber Grid"“ lieka kaip skelbime
    if (/^["„“]/.test(v) && /["“”]$/.test(v)) v = v.slice(1, -1).trim();
    if (!v) return null;
    return { value: v, pv: pv, snippet: snippet };
  }

  // ---------------------------------------------------------------------------
  // Teisinis režimas: PĮ (perkantysis subjektas, 2014/25/ES) ar VPĮ (perkančioji
  // organizacija, 2014/24/ES). Požymiai - tekste ir failo varde.
  // ---------------------------------------------------------------------------
  var SEKTORIUS = [
    [/perkan[čc]iojo\s+subjekto\s+veiklos\s+sritis/i, "tekstas"], [/direktyva\s*2014\/25/i, "tekstas"], [/directive\s*2014\/25/i, "tekstas"],
    [/activity\s+of\s+the\s+contracting\s+entity/i, "tekstas"], [/komunalinio\s+sektoriaus\s+direktyv/i, "vardas"], [/sectoral\s+directive/i, "vardas"]
  ];
  var KLASIKA = [
    [/perkan[čc]iosios\s+organizacijos\s+veiklos\s+sritis/i, "tekstas"], [/direktyva\s*2014\/24/i, "tekstas"], [/directive\s*2014\/24/i, "tekstas"],
    [/activity\s+of\s+the\s+contracting\s+authority/i, "tekstas"], [/bendroji\s+direktyv/i, "vardas"], [/classic\s+directive/i, "vardas"]
  ];
  function pozymiai(sarasas, tekstas, vardas, rez) {
    var out = [];
    sarasas.forEach(function (p) {
      var kur = p[1] === "vardas" ? vardas : tekstas;
      var m = p[0].exec(String(kur || ""));
      if (m) out.push({ rezimas: rez, kur: p[1], tekstas: minkstas(m[0]) });
    });
    return out;
  }
  // Grąžina { value: "PI" | "VPI" | null, neaiskus, pozymiai } - neaiškus, kai yra abiejų režimų požymių
  function rezimas(tekstas, failoVardas) {
    var vardas = String(failoVardas || "").split(" › ").pop();
    var pi = pozymiai(SEKTORIUS, tekstas, vardas, "PI"), vpi = pozymiai(KLASIKA, tekstas, vardas, "VPI");
    var visi = pi.concat(vpi);
    if (!visi.length) return { value: null, neaiskus: false, pozymiai: [] };
    if (pi.length && vpi.length) return { value: null, neaiskus: true, pozymiai: visi };
    return { value: pi.length ? "PI" : "VPI", neaiskus: false, pozymiai: visi };
  }

  // ---------------------------------------------------------------------------
  // Kortelės laukai (A2)
  // ---------------------------------------------------------------------------
  var ANTRASTE = /^\d+(?:\.\d+)*\s+\S/;                       // „2.1.3 Vertė“, „5 Pirkimo dalis“
  var PORASTE = /^https?:\/\/ted\.europa\.eu\/TED\s+Page\s+\d+\/\d+$/i;
  var ZYMA = /^[A-ZĄČĘĖĮŠŲŪŽ][^:]{1,90}:(\s|$)/;               // „Pirkimo būdas: ...“ - naujas laukas

  function eilutes(tekstas) {
    return String(tekstas || "").replace(/[­‐‑]/g, "-").replace(/ /g, " ")
      .split(/\r?\n/).map(function (e) { return e.replace(/\s+/g, " ").trim(); })
      .filter(function (e) { return e && !PORASTE.test(e); });
  }
  /* Eilučių ruožas nuo antraštės iki kitos nurodytos antraštės (be jos). */
  function ruozas(eil, nuo, iki) {
    var a = -1;
    for (var i = 0; i < eil.length; i++) if (nuo.test(eil[i])) { a = i; break; }
    if (a < 0) return [];
    for (var j = a + 1; j < eil.length; j++) if (iki.test(eil[j])) return eil.slice(a, j);
    return eil.slice(a);
  }
  /* Lauko reikšmė: „Žyma: reikšmė“ + tęsinio eilutės (kol neprasideda kitas laukas ar antraštė).
     Tuščia reikšmė po dvitaškio - kita eilutė („Teisinis pagrindas:“ / „Direktyva 2014/25/ES“). */
  function laukas(eil, zyma) {
    var re = new RegExp("^" + zyma + "\\s*:\\s*(.*)$", "i");
    for (var i = 0; i < eil.length; i++) {
      var m = re.exec(eil[i]);
      if (!m) continue;
      var dalys = m[1] ? [m[1]] : [], citata = [eil[i]];
      for (var j = i + 1; j < eil.length; j++) {
        if (ZYMA.test(eil[j]) || ANTRASTE.test(eil[j])) break;
        if (!m[1] && dalys.length) break;                     // tuščios reikšmės atveju - tik viena eilutė
        dalys.push(eil[j]); citata.push(eil[j]);
      }
      var v = dalys.join(" ").replace(/\s+/g, " ").trim();
      return v ? { reiksme: v, citata: citata.join(" ").slice(0, 240) } : null;
    }
    return null;
  }
  function data(ddmmyyyy) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(ddmmyyyy || ""));
    if (!m) return "";
    var p = function (n) { return String(n).padStart(2, "0"); };
    return m[3] + "-" + p(m[2]) + "-" + p(m[1]);
  }

  /* eForms pirkimo būdo pavadinimas -> bazinė procedūra. Variantą (supaprastintas / tarptautinis)
     lemia skelbimo rūšis failo varde; be jos - tik pastaba. */
  var BUDAI = [
    [/^atviras\b/i, "Atviras konkursas", true],
    [/^ribotas\b/i, "Ribotas konkursas", false],
    [/derybos\s+su\s+i[šs]ankstiniu\s+kvietimu|konkursas\s+su\s+derybomis/i, "Skelbiamos derybos", true],
    [/derybos\s+be\s+i[šs]ankstinio\s+kvietimo/i, "Neskelbiamos derybos", true],
    [/konkurencinis\s+dialogas/i, "Konkurencinis dialogas", false],
    [/inovacij\S*\s+partneryst/i, "Inovacijų partnerystė", false]
  ];
  function skelbimoRusis(failoVardas) {
    var v = String(failoVardas || "").split(" › ").pop();
    if (/nacionalinis\s+skelbimas/i.test(v)) return "supaprastintas";
    if (/(^|_)skelbimas\s+apie\s+pirkim/i.test(v)) return "tarptautinis";
    return null;
  }

  var OBJEKTAI = { "prekės": "prekes", "paslaugos": "paslaugos", "darbai": "darbai" };

  function mastas(tekstas) {
    var m = /(\d+)\s*(mėn|men|metai|metų|metus|m\.|dien)/i.exec(String(tekstas || ""));
    if (!m) return null;
    var n = parseInt(m[1], 10), vnt = m[2].toLowerCase();
    if (/^m[ėe]n/.test(vnt)) return n;
    if (vnt === "dien") return Math.max(1, Math.round(n / 30));
    return n * 12;
  }

  /* Pilnas BVPŽ kodas su kontroliniu skaitmeniu iš žodyno (jei įkeltas). */
  function bvpzPilnas(kodas8) {
    var D = global.GP_CPV_DATA && global.GP_CPV_DATA.codes;
    if (!D) return null;
    for (var i = 0; i < D.length; i++) if (String(D[i][0]).slice(0, 8) === kodas8) return { kodas: D[i][0], lt: D[i][1] };
    return null;
  }

  /* Grąžina { laukai: [{ laukas, reiksme, citata, pastaba? }], pastabos: [], pirkejas } */
  function atpazink(tekstas, failoVardas) {
    var t = String(tekstas || ""), eil = eilutes(t);
    var laukai = [], pastabos = [];
    var prideti = function (laukas_, reiksme, citata, pastaba) {
      var x = { laukas: laukas_, reiksme: reiksme, citata: String(citata || "").slice(0, 240) };
      if (pastaba) x.pastaba = pastaba;
      laukai.push(x);
    };

    // Vykdytojas ir režimas
    var p = pirkejas(t);
    if (p) {
      var org = global.GP_ORG && global.GP_ORG.rask(p.value);
      if (org) prideti("vykdytojas", org.id, p.snippet);
      else pastabos.push("Pirkėjas „" + p.value + "“ organizacijų registre nerastas - vykdytojo nesiūlome.");
    }
    var r = rezimas(t, failoVardas);
    if (r.value) {
      // Citata - visa skelbimo eilutė su požymiu (ne tik rastas kamienas) arba failo vardas
      var cit = r.pozymiai.map(function (x) {
        if (x.kur === "vardas") return "failo vardas: " + minkstas(String(failoVardas || "").split(" › ").pop()).slice(0, 110);
        for (var q = 0; q < eil.length; q++) if (eil[q].toLowerCase().indexOf(x.tekstas.toLowerCase()) >= 0) return eil[q];
        return x.tekstas;
      }).filter(function (x, i, a) { return a.indexOf(x) === i; });
      prideti("rezimas", r.value, cit.join("; "));
    }
    else if (r.neaiskus) pastabos.push("Skelbime yra ir PĮ, ir VPĮ požymių - režimo nesiūlome, patikrinkite skelbimo formą.");

    // 2.1 Procedūra: pavadinimas ir būdas; 2.1.1 - objektas ir BVPŽ; 2.1.3 - vertė
    var pr = ruozas(eil, /^2\.1\s+Proced/i, /^(?:2\.1\.1\s|5\s+Pirkimo\s+dalis|5\.1\s)/i);
    var pav = laukas(pr, "Pavadinimas");
    /* pdf.js teksto sluoksnis išmeta minkštąjį brūkšnelį, kuriuo TED PDF užkoduoja „-“ numeriuose:
       „(VPP-268)“ tampa „(VPP268)“ (patikrinta su Amber Grid 9742096 ir EPSO-G 9281765 PDF). Kur jis
       buvo - atkurti neįmanoma, todėl tik įspėjama, kai skliaustuose - suklijuotas raidžių ir skaičių numeris. */
    if (pav) prideti("pavadinimas", pav.reiksme, pav.citata,
      /\((?:[A-ZĄČĘĖĮŠŲŪŽ]{2,}\d+|\d{4}[A-ZĄČĘĖĮŠŲŪŽ]{2,}\d+)[^)]*\)/.test(pav.reiksme) ? "Patikrinkite numerį skliaustuose: iš PDF brūkšneliai (pvz. „VPP-268“) dingsta." : null);
    var bud = laukas(pr, "Pirkimo b[ūu]das");
    if (bud) {
      var b = null;
      for (var i = 0; i < BUDAI.length; i++) if (BUDAI[i][0].test(bud.reiksme)) { b = BUDAI[i]; break; }
      var rusis = skelbimoRusis(failoVardas);
      var id = null;
      if (b && global.GP_METHODS) {
        var m = b[2] && rusis ? global.GP_METHODS.fromLegacy("skelbimas", b[1], { rezimas: rusis }) : global.GP_METHODS.fromText(b[1]);
        if (m && (m.statusas === "pagrindinis" || m.statusas === "papildomas")) id = m.id;
      }
      if (id) prideti("budas", id, bud.citata + (rusis ? " · failas: " + (rusis === "supaprastintas" ? "nacionalinis skelbimas" : "skelbimas apie pirkimą") : ""),
                      rusis ? "Variantas (" + rusis + ") - pagal skelbimo rūšį failo varde." : null);
      else pastabos.push("Pirkimo būdas skelbime: „" + bud.reiksme + "“" + (b && b[2] ? " - pasirinkite supaprastinto ar tarptautinio pirkimo variantą (failo vardas to nerodo)." : " - kortelėje pasirinkite patys."));
    }
    var tikslas = ruozas(eil, /^2\.1\.1\s/i, /^2\.1\.[2-9]\s|^5\s+Pirkimo\s+dalis/i);
    var obj = laukas(tikslas, "Sutarties objektas");
    if (obj && OBJEKTAI[obj.reiksme.toLowerCase()]) prideti("objektas", OBJEKTAI[obj.reiksme.toLowerCase()], obj.citata);
    var cpv = laukas(tikslas, "Pagrindinis klasifikacijos kodas \\(cpv\\)");
    var km = cpv && /^(\d{8})(?:-\d)?\b\s*(.*)$/.exec(cpv.reiksme);
    if (km) {
      var pilnas = bvpzPilnas(km[1]);
      if (pilnas) prideti("bvpz", pilnas.kodas, cpv.citata);
      else pastabos.push("BVPŽ kodas skelbime - " + km[1] + (km[2] ? " (" + km[2] + ")" : "") + ", be kontrolinio skaitmens; žodyno įkelti nepavyko - įrašykite kodą patys.");
    }
    var vert = laukas(ruozas(eil, /^2\.1\.3\s/i, /^2\.1\.[4-9]\s|^5\s+Pirkimo\s+dalis/i), "Numatoma vert[ėe] be PVM");
    var v = vert && global.GP_MONEY ? global.GP_MONEY.parseEUR(vert.reiksme) : null;
    if (v > 0) prideti("verte", v, vert.citata);

    // 5 Pirkimo dalis: dalys, galiojimas
    var lotai = [], dab = null;
    for (var k = 0; k < eil.length; k++) {
      var lm = /^5\.1\s+Pirkimo\s+dalis\s*:\s*(\S+)/i.exec(eil[k]);
      if (lm) { dab = { id: lm[1], eil: [] }; lotai.push(dab); continue; }
      if (dab && /^(?:8\s+Organizacijos|Skelbimo\s+informacija|[6-9]\s+\S)/i.test(eil[k])) dab = null;
      if (dab) dab.eil.push(eil[k]);
    }
    if (lotai.length === 1) prideti("dalys", [], "5.1 Pirkimo dalis: " + lotai[0].id + " (viena dalis)", "Viena dalis skelbime - pirkimas neskaidomas.");
    else if (lotai.length > 1) {
      prideti("dalys", lotai.map(function (l) {
        var lp = laukas(l.eil, "Pavadinimas"), lv = laukas(ruozas(l.eil, /^5\.1\.5\s/i, /^5\.1\.[6-9]\s|^5\.1\.1\d\s/i), "Numatoma vert[ėe] be PVM");
        var vv = lv && global.GP_MONEY ? global.GP_MONEY.parseEUR(lv.reiksme) : null;
        return { pavadinimas: lp ? lp.reiksme : l.id, verte: vv > 0 ? vv : null };
      }), lotai.map(function (l) { return "5.1 Pirkimo dalis: " + l.id; }).join("; "));
    }
    var trukmes = lotai.map(function (l) { var g = laukas(l.eil, "Galiojimas"); return g ? { men: mastas(g.reiksme), citata: g.citata } : null; })
      .filter(function (x) { return x && x.men; });
    if (trukmes.length && trukmes.every(function (x) { return x.men === trukmes[0].men; })) prideti("trukmeMen", trukmes[0].men, trukmes[0].citata);

    // Terminas, išsiuntimo data, CVP IS numeris, būsena
    var term = laukas(eil, "Pasi[ūu]lym[ųu] pri[ėe]mimo terminas") || laukas(eil, "Dalyvavimo pra[šs]ym[ųu] pri[ėe]mimo terminas");
    var tm = term && /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/.exec(term.reiksme);
    if (tm) prideti("pasiulymuTerminas", tm[3] + "-" + tm[2] + "-" + tm[1] + "T" + tm[4] + ":" + tm[5], term.citata,
                    /Dalyvavimo/i.test(term.citata) ? "Tai dalyvavimo prašymų terminas." : null);
    var isi = laukas(eil, "Skelbimo i[šs]siuntimo data");
    if (isi && data(isi.reiksme)) {
      prideti("paskelbimas", data(isi.reiksme), isi.citata, "Skelbimo išsiuntimo data.");
      prideti("busena", "paskelbtas", isi.citata);
    }
    var nr = /resourceId=(\d{5,9})/.exec(t) || /^(\d{5,9})_/.exec(String(failoVardas || "").split(" › ").pop());
    if (nr) prideti("cvpisNr", nr[1], nr[0]);

    return { laukai: laukai, pastabos: pastabos, pirkejas: p ? p.value : null };
  }

  global.GP_SKELBIMAS = { version: "1.0", pirkejas: pirkejas, rezimas: rezimas, atpazink: atpazink,
                          _eilutes: eilutes, _laukas: laukas, _skelbimoRusis: skelbimoRusis };
})(typeof window !== "undefined" ? window : this);
