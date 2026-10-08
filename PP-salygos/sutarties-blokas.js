/*
 * PP-salygos: blokas „Sutarties projektas“ 1 žingsnyje (GP_SUTARTIES_BLOKAS, sutarčių planas S3, 2026-10-08;
 * docs/salygos/sutartys-planas-2026-10.md 3.3). Parinkimą daro GP_SUTARTYS (sutartys.js), čia - tik sąsaja.
 *
 *   GP_SUTARTIES_BLOKAS.mount({ vieta, duomenys, onKeista }) -> { atnaujink, busena, atstatyk, zurnalas, naudokSaugykla }
 *     duomenys() -> { pavadinimas, objektas, bvpz, kalba, rezimas, salyguSeima, budas }   (1 žingsnio ir kortelės reikšmės)
 *     busena()   -> { rodoma, laukia, sistema, pasirinkta, zmogaus, patvirtinta, buvoPatvirtinta, sablonai, kalba, stebejimas }
 *     zurnalas() -> { busena: "yra" | "nera" | "sugadinta" | "neprieinama", irasai, klaida }   (stebėjimo įrašai naršyklėje)
 *
 * Principai (2026-10-04 formos principai ir plano 8 sk. 6-7 p. rekomendacijos):
 *  - sistemos parinkta sutartis visada „Siūloma (nepatvirtinta)“ su priežastimi; „Patvirtinta“ - tik paspaudus „Patvirtinti“
 *    arba pačiam pasirinkus kitą sutartį („Pakeisti“);
 *  - patvirtinimas galioja konkrečiai sutarčiai: pasikeitus duomenims taip, kad siūloma kita, patvirtinimas nebegalioja ir tai
 *    pasakoma (ankstesnė ir nauja), o vėl siūlant patvirtintąją - galioja vėl; žmogaus pasirinkta sutartis duomenims pasikeitus
 *    nekeičiama - parodoma, ką siūlytų sistema;
 *  - klausimai (K0-K5, CPO) - radijo grupės: atsakytas klausimas lieka matomas su pasirinkimu (rodyklėmis galima keisti);
 *  - stebėjimo įrašai (naudotojo sprendimas 2026-10-08 - kaupti naršyklėje taisyklėms tikslinti): kol sutartis patvirtinta, šios
 *    naršyklės saugykloje (RAKTAS, per GP_SAUGYKLA) laikomas vienas šio puslapio atvėrimo įrašas - pirkimo pavadinimas, objekto tipas,
 *    BVPŽ, kalba, režimas, būdas, ką siūlė sistema, atsakymai į klausimus ir ką pasirinko žmogus; patvirtinimui nebegaliojant
 *    įrašas pašalinamas. Iki RIBA įrašų (seniausi šalinami), atsisiunčiami JSON failu, išvalomi žmogaus veiksmu; neperskaitomas
 *    įrašas neperrašomas (GP_SAUGYKLA kopija). Niekur nesiunčiama; patenka į atsarginę kopiją (shared/backup.js).
 * Nuo 2026-10-08 (S4) patvirtinta prekių ar paslaugų sutartis generuojama 3 žingsnyje (klausimai - 2 žingsnyje, sutarties-forma.js);
 * kitoms šeimoms šablonai dar neparuošti - blokas tai sako.
 */
(function (global) {
  "use strict";
  var doc = global.document;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, kur) { return (kur || doc).querySelector(sel); }
  function lygios(a, b) {
    if (!a || !b) return false;
    return (a.seima || null) === (b.seima || null) && (a.variantas || null) === (b.variantas || null) &&
           ((a.nerengiama && a.nerengiama.id) || null) === ((b.nerengiama && b.nerengiama.id) || null);
  }
  var KALBA = { LT: "lietuvių kalba", LTEN: "dvikalbės (LT/EN)" };
  var RAKTAS = "gprocure.sutartys.stebejimas", RIBA = 500;
  var SESIJA = "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  function siandien() { return global.GP_WORKDAYS ? global.GP_WORKDAYS.siandien() : ""; }
  /* Tik atmintyje (testams ir ?saugykla=testine - kaip pirkimo kortelės) */
  function atmintis() {
    var d = {};
    return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
             setItem: function (k, v) { d[k] = String(v); }, removeItem: function (k) { delete d[k]; },
             key: function (i) { return Object.keys(d)[i] || null; }, get length() { return Object.keys(d).length; } };
  }
  function irasuZodis(n) {   // 1, 21 įrašą; 2-9, 22 įrašus; 0, 10-20 įrašų
    var d = n % 10, s = n % 100;
    return d === 1 && s !== 11 ? "įrašą" : d >= 2 && (s < 12 || s > 19) ? "įrašus" : "įrašų";
  }
  function tikrinkZurnala(v) { return v && v.schema === 1 && Array.isArray(v.irasai) ? true : "netinkama stebėjimo įrašų sandara"; }

  function mount(o) {
    var G = global.GP_SUTARTYS, vieta = typeof o.vieta === "string" ? $(o.vieta) : o.vieta;
    if (!G || !vieta) return null;
    var S = { ats: {}, zmogaus: null, patvirtinta: null, buvo: null, keiciama: false, sistema: null, galut: null, d: {} };
    var REG = { busena: "neikelta", sablonai: null, klaida: "", zem: {} };
    var SAUG = /[?&]saugykla=testine(&|$)/.test(global.location ? global.location.search : "") ? atmintis() : null;
    var Z = { busena: "nera", irasai: [], klaida: "" }, steb = { atvira: false, valyti: false };

    /* Stebėjimo įrašai naršyklėje */
    function skaitykZurnala() {
      if (!global.GP_SAUGYKLA) { Z = { busena: "neprieinama", irasai: [], klaida: "saugyklos modulis neįkeltas" }; return Z; }
      var r = global.GP_SAUGYKLA.skaityk(RAKTAS, { saugykla: SAUG, tikrink: tikrinkZurnala });
      Z = r.busena === "yra" ? { busena: "yra", irasai: r.reiksme.irasai, klaida: "" }
        : { busena: r.busena, irasai: [], klaida: r.klaida || "" };
      return Z;
    }
    function irasas() {
      var p = G.palygink(S.sistema, S.galut.seima, S.galut.variantas), d = S.d;
      return { sesija: SESIJA, data: siandien(), versija: G.versija, pavadinimas: d.pavadinimas || "", objektas: d.objektas || "",
               bvpz: d.bvpz || "", kalba: S.sistema.kalba, rezimas: d.rezimas || "", salyguSeima: d.salyguSeima || "", budas: d.budas || "",
               sistemosBusena: p.busena, siulyta: p.siulyta, siulytasVariantas: p.siulytasVariantas, klausimai: p.klausimai,
               pasirinkta: p.pasirinkta, pasirinktasVariantas: p.pasirinktasVariantas,
               nerengiama: S.galut.nerengiama ? S.galut.nerengiama.id : null, zmogaus: !!S.zmogaus, sutampa: p.sutampa };
    }
    function irasyk() {
      if (skaitykZurnala().busena === "sugadinta" || Z.busena === "neprieinama") return;   // neperskaitomas - neperrašomas
      var irasai = Z.irasai.slice(), k = -1;
      for (var i = 0; i < irasai.length; i++) if (irasai[i] && irasai[i].sesija === SESIJA) k = i;
      var naujas = S.patvirtinta && S.galut ? irasas() : null;
      if (k >= 0 && naujas && JSON.stringify(irasai[k]) === JSON.stringify(naujas)) return;
      if (k >= 0) { if (naujas) irasai[k] = naujas; else irasai.splice(k, 1); }
      else if (naujas) irasai.push(naujas);
      else return;
      while (irasai.length > RIBA) irasai.shift();
      var w = global.GP_SAUGYKLA.rasyk(RAKTAS, { schema: 1, irasai: irasai }, { saugykla: SAUG });
      Z = w.ok ? { busena: "yra", irasai: irasai, klaida: "" } : { busena: "klaida", irasai: Z.irasai, klaida: w.klaida || "įrašyti nepavyko" };
    }
    function atsisiusk() {
      var turinys = { schema: 1, aprasas: "G-Procure PP-salygos: sutarčių parinkimo stebėjimo įrašai (ką siūlė sistema ir ką pasirinko žmogus)",
                      eksportuota: siandien(), variklis: G.versija, irasai: Z.irasai };
      var blob = new global.Blob([JSON.stringify(turinys, null, 2)], { type: "application/json" });
      var a = doc.createElement("a"), url = global.URL.createObjectURL(blob);
      a.href = url;
      a.download = global.GP_EKSPORTAS ? global.GP_EKSPORTAS.failoVardas({ dokumentas: "Sutarčių-parinkimo-stebėjimas", pletinys: "json" })
                                       : "sutarciu-parinkimo-stebejimas.json";
      doc.body.appendChild(a); a.click(); a.remove();
      global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
    }
    function isvalyk() {
      var s = SAUG || (function () { try { return global.localStorage; } catch (e) { return null; } })();
      try { if (s) s.removeItem(RAKTAS); } catch (e) {}
      skaitykZurnala(); irasyk();   // dabartinis patvirtintas sprendimas lieka vienintelis įrašas
    }
    function stebejimoHtml() {
      var n = Z.irasai.length, h = '<details class="sb-steb" id="sbSteb"' + (steb.atvira ? " open" : "") + "><summary>";
      if (Z.busena === "sugadinta" || Z.busena === "neprieinama" || Z.busena === "klaida")
        h += "Stebėjimo įrašai: " + (Z.busena === "klaida" ? "paskutinio įrašyti nepavyko" : "neperskaitomi - nauji neįrašomi") + "</summary>" +
             '<div class="sb-isp">Priežastis: ' + esc(Z.klaida) + "." + (Z.busena === "sugadinta" ? " Neperskaitomas įrašas išsaugotas atskira kopija." : "") + "</div>";
      else h += "Stebėjimo įrašai šioje naršyklėje: " + n + "</summary>";
      h += '<div class="sb-steb-t">Kai patvirtinate ar pasirenkate sutartį, šioje naršyklėje įsimenama: pirkimo pavadinimas, objekto tipas, BVPŽ, ' +
           "kalba, pirkimo būdas, ką siūlė sistema, jūsų atsakymai į klausimus ir ką pasirinkote (vienas įrašas šiam puslapio atvėrimui). " +
           "Įrašai niekur nesiunčiami ir naudojami sutarčių parinkimo taisyklėms tikslinti - atsisiųstą failą galite perduoti G-Procure rengėjui. " +
           "Įrašai patenka į atsarginę kopiją; laikoma ne daugiau kaip " + RIBA + " naujausių.</div>";
      h += '<div class="sb-veiksmai">';
      if (n) h += '<button type="button" class="sec" id="sbAtsisiusti" data-sb="atsisiusti">Atsisiųsti įrašus (JSON)</button>';
      if (n || Z.busena === "sugadinta") h += steb.valyti
        ? '<span class="sb-steb-k" id="sbValytiK">Ištrinti ' + (n ? n + " " + irasuZodis(n) : "neperskaitomus įrašus") + "?</span>" +
          '<button type="button" class="sec" id="sbValytiTaip" data-sb="valyti-taip">Taip, ištrinti</button>' +
          '<button type="button" class="sec" id="sbValytiNe" data-sb="valyti-ne">Ne</button>'
        : '<button type="button" class="sec" id="sbValyti" data-sb="valyti">Išvalyti</button>';
      return h + "</div></details>";
    }

    /* Šablonų registras (redakcija) ir LT/EN žemėlapiai (DI juodraščių skaičius) - įkeliami tik prireikus */
    function registras() {
      if (REG.busena !== "neikelta") return;
      REG.busena = "kraunama";
      global.fetch("zemelapiai/sutarciu-versijos.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) { REG.sablonai = j.sablonai || {}; REG.busena = "yra"; piesk(); })
        .catch(function (e) { REG.busena = "klaida"; REG.klaida = (e && e.message) || String(e); piesk(); });
    }
    function zemelapis(kodas) {
      if (REG.zem[kodas]) return;
      REG.zem[kodas] = { busena: "kraunama" };
      global.fetch("zemelapiai/sutartys/" + kodas + ".json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) { REG.zem[kodas] = { busena: "yra", di: (j.di_juodrasciai || []).length }; piesk(); })
        .catch(function (e) { REG.zem[kodas] = { busena: "klaida", klaida: (e && e.message) || String(e) }; piesk(); });
    }

    function skaiciuok() {
      var d = o.duomenys() || {};
      S.d = d;
      S.sistema = G.parink({ pavadinimas: d.pavadinimas, objektas: d.objektas, bvpz: d.bvpz, kalba: d.kalba, rezimas: d.rezimas,
                             vykdytojas: "LITGRID AB", atsakymai: S.ats });
      var sis = S.sistema.busena === "klausimas" ? null
        : { seima: S.sistema.seima, variantas: S.sistema.variantas || null,
            nerengiama: S.sistema.busena === "nerengiama" ? { id: "sistema", tekstas: S.sistema.nerengiama } : null };
      S.galut = S.zmogaus || sis;
      // patvirtinimas galioja tai pačiai sutarčiai: siūlant kitą - nebegalioja (pasakoma), vėl siūlant patvirtintąją - galioja vėl
      if (S.patvirtinta && !lygios(S.patvirtinta, S.galut)) { S.buvo = S.patvirtinta; S.patvirtinta = null; }
      else if (!S.patvirtinta && S.buvo && lygios(S.buvo, S.galut)) { S.patvirtinta = S.buvo; S.buvo = null; }
    }
    function laukia() { return !String(S.d.pavadinimas || "").trim(); }
    function rodoma() { return S.d.salyguSeima !== "DPSK"; }
    function pavadinimas(g) {
      if (!g) return "";
      if (g.nerengiama) return "Sutarties projektas nerengiamas";
      var s = G.SEIMOS[g.seima];
      return s ? s.pav + (g.variantas && s.variantai ? " - " + s.variantai[g.variantas] : "") : g.seima;
    }
    function sablonai() {
      var g = S.galut;
      if (!g || g.nerengiama || !G.SEIMOS[g.seima] || !G.SEIMOS[g.seima].sablonai || S.d.rezimas === "VPI") return null;
      var k = S.sistema.kalba === "LTEN" ? "LTEN" : "LT", ss = G.SEIMOS[g.seima].sablonai;
      return ss[k] ? { kodai: ss[k], kalba: k } : { kodai: ss.LT, kalba: "LT" };
    }

    function klausimoHtml(kodas, pasirinkta) {
      var K = G.KLAUSIMAI[kodas], id = "sb-" + kodas;
      return '<fieldset class="sb-kl" aria-describedby="' + id + '-pa">' +
        '<legend class="sb-kl-t">' + esc(K.tekstas) + "</legend>" +
        GP_PAAISKINIMAS.html({ id: id + "-pa", etikete: K.tekstas, turinys: esc(K.paaiskinimas) }) +
        '<div class="opts sb-opts">' + K.atsakymai.map(function (a) {
          return '<label class="opt"><input type="radio" name="' + id + '" id="' + id + "-" + esc(a.id) + '" value="' + esc(a.id) + '" data-sb-kl="' + kodas + '"' +
                 (pasirinkta === a.id ? " checked" : "") + "> " + esc(a.tekstas) + "</label>";
        }).join("") + "</div></fieldset>";
    }

    function rankinisHtml() {
      var opt = [];
      Object.keys(G.SEIMOS).forEach(function (k) {
        var s = G.SEIMOS[k];
        if (s.variantai) Object.keys(s.variantai).forEach(function (v) { opt.push(['s:' + k + ':' + v, s.pav + " - " + s.variantai[v]]); });
        else opt.push(['s:' + k + ':', s.pav + (s.sablonai ? "" : " (šablonas dar neparuoštas)")]);
      });
      G.NERENGIAMA.forEach(function (n) { opt.push(["n:" + n.id, "Nerengti: " + n.tekstas]); });
      var dab = S.galut ? (S.galut.nerengiama ? (S.galut.nerengiama.id === "sistema" ? "" : "n:" + S.galut.nerengiama.id) : "s:" + S.galut.seima + ":" + (S.galut.variantas || "")) : "";
      return '<div class="sb-ranka" id="sbRanka">' +
        '<label class="sb-ranka-l" for="sbRankaSel">Kokia sutartis šiam pirkimui?</label>' +
        '<select id="sbRankaSel"><option value="">Pasirinkite...</option>' +
        opt.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === dab ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") +
        "</select>" +
        '<div class="sb-veiksmai"><button type="button" data-sb="rinktis">Pasirinkti</button>' +
        '<button type="button" class="sec" data-sb="atsaukti">Atšaukti</button></div>' +
        '<div class="cite">Jūsų pasirinkimas pakeičia siūlomą sutartį ir laikomas patvirtintu; sistema ir toliau parodys, ką ji siūlytų.</div></div>';
    }

    function dokumentuHtml() {
      var sb = sablonai();
      if (!sb) return "";
      var h = '<div class="sb-dok">Dokumentai: bendrosios ir specialiosios sąlygos, ' + KALBA[sb.kalba] + ".";
      if (REG.busena === "yra") {
        var bs = REG.sablonai[sb.kodai.BS], ss = REG.sablonai[sb.kodai.SS];
        if (bs && ss) h += ' <details class="sb-red"><summary>Šablonų redakcija</summary><div><b>' + esc(bs.pavadinimas) + ":</b> " + esc(bs.redakcija) +
          "</div><div><b>" + esc(ss.pavadinimas) + ":</b> " + esc(ss.redakcija) + "</div></details>";
        else h += ' <span class="sb-isp">Šablono registre nėra (' + esc(sb.kodai.BS) + ", " + esc(sb.kodai.SS) + ").</span>";
      } else if (REG.busena === "klaida") h += ' <span class="sb-isp">Šablonų registro įkelti nepavyko (' + esc(REG.klaida) + ") - redakcija nežinoma.</span>";
      else { registras(); h += ' <span class="sb-kr">Tikrinamas šablonų registras...</span>'; }
      h += "</div>";
      if (sb.kalba === "LTEN") {
        var z = [sb.kodai.BS, sb.kodai.SS].map(function (k) { zemelapis(k); return REG.zem[k]; });
        if (z.every(function (x) { return x && x.busena === "yra"; })) {
          var n = z[0].di + z[1].di;
          if (n) h += '<div class="sb-isp">Anglų tekste yra nepatikrintų vertimo vietų: ' + n + " (bendrosiose sąlygose " + z[0].di + ", specialiosiose " + z[1].di +
            ") - tai DI vertimo juodraščiai, kuriuos turi patikrinti vertėjas.</div>";
          // 2026-10-08 (naudotojo sprendimas): anglų tekstas suredaguotas, DI juodraščių nebeliko - sakoma, kaip jis parengtas
          else h += '<div class="sb-dok" id="sbEn">Anglų kalbos tekstas: specialiosiose sąlygose - parengtas naudojant DI (Claude) pagal VPT vertimų ir ES pirkimų ' +
            "terminiją, bendrosiose - VPT neoficialus vertimas su suvienodintais terminais; vertėjas netikrino. DI požymis įrašomas Word failų savybėse.</div>";
        } else if (z.some(function (x) { return x && x.busena === "klaida"; }))
          h += '<div class="sb-isp">Nepavyko patikrinti, ar anglų tekste liko nepatikrintų vertimo vietų (šablono žemėlapis neįkeltas).</div>';
      }
      return h;
    }

    function piesk() {
      var aktyvus = doc.activeElement && vieta.contains(doc.activeElement) ? doc.activeElement.id : "";
      var h = '<div class="t sb-gal"><span id="q-sutartis">Sutarties projektas</span> <span class="pz-nepriv">bandomoji</span>' +
        GP_PAAISKINIMAS.html({ id: "sb-pa", etikete: "Sutarties projektas", turinys:
          "<p>Sutarties forma parenkama taisyklėmis pagal pirkimo objekto tipą ir pavadinimą (DI nenaudojamas). Kai požymiai nevienareikšmiai, " +
          "užduodamas klausimas - sistema nespėja.</p><p>Siūlomą sutartį patvirtinate jūs arba pasirenkate kitą. Generatoriui paruošti prekių ir " +
          "paslaugų pirkimo-pardavimo sutarčių šablonai; kitų šeimų sutartis atpažįstama, bet jos šablonas dar neparuoštas.</p>" }) + "</div>";
      if (!rodoma()) {
        vieta.innerHTML = h + '<div class="cite">LITGRID DPS sukūrimo sąlygose sutarties projekto priedo nėra - sutarties projektas parenkamas konkrečiam pirkimui pagal DPS.</div>';
        return;
      }
      if (laukia()) {
        vieta.innerHTML = h + '<div class="cite">Įrašykite pirkimo pavadinimą ir pasirinkite objekto tipą - sistema pasiūlys sutarties projektą.</div>';
        return;
      }
      var r = S.sistema;
      h += '<div class="sb" role="group" aria-labelledby="q-sutartis">';
      (r.atsakyta || []).forEach(function (a) { h += klausimoHtml(a.kodas, a.atsakymas); });
      if (r.busena === "klausimas" && !S.zmogaus) {
        h += klausimoHtml(r.klausimas.kodas, null);
        h += '<div class="sb-kodel">Kodėl klausiama: ' + esc(r.priezastys.join("; ")) + ".</div>";
      }
      var g = S.galut;
      if (g) {
        var busena = S.patvirtinta ? "patvirtinta" : "siuloma";
        var neparuosta = !g.nerengiama && (!sablonai());
        h += '<div class="sb-rez sb-rez--' + busena + '">' +
          '<div class="sb-pav"><b id="sbPav">' + esc(pavadinimas(g)) + "</b>" +
          '<span class="lk-b lk-b--' + busena + '">' + (busena === "patvirtinta" ? "Patvirtinta" : "Siūloma (nepatvirtinta)") + "</span></div>";
        if (g.nerengiama) h += '<div class="sb-kodel">' + esc(g.nerengiama.tekstas) + ".</div>";
        if (S.zmogaus) {
          h += '<div class="sb-kodel">Jūsų pasirinkimas.' + (r.busena === "klausimas" ? " Sistema dar klausia: " + esc(r.klausimas.tekstas)
            : lygios(S.zmogaus, { seima: r.seima, variantas: r.variantas, nerengiama: r.busena === "nerengiama" ? { id: "sistema" } : null })
              ? " Sistema siūlo tą pačią." : " Sistema siūlytų: " + esc(r.busena === "nerengiama" ? "projekto nerengti (" + r.nerengiama + ")" : r.pavadinimas) + ".") + "</div>";
        } else h += '<div class="sb-kodel">Kodėl: ' + esc(r.priezastys.join("; ")) + ".</div>";
        if (S.buvo && !S.patvirtinta) h += '<div class="sb-isp">Anksčiau patvirtinote: ' + esc(pavadinimas(S.buvo)) + ". Pagal pakeistus duomenis siūloma kita - patvirtinkite iš naujo.</div>";
        if (!g.nerengiama) {
          var past = (S.zmogaus ? [] : r.pastabos || []).filter(function (p) { return !/tuščias/.test(p); });
          if (S.zmogaus && neparuosta) past.push(S.d.rezimas === "VPI"
            ? "Centralizuotam pirkimui pagal VPĮ sutarties projektas kol kas nesiūlomas - VPĮ pirkimų sutarties forma dar nenuspręsta."
            : "Šios šeimos šablonas generatoriui dar neparuoštas.");
          past.forEach(function (p) { h += '<div class="sb-past">' + esc(p) + "</div>"; });
          h += dokumentuHtml();
        }
        h += '<div class="sb-veiksmai">' + (S.patvirtinta ? "" : '<button type="button" class="lk-patv" id="sbPatv" data-sb="patvirtinti">Patvirtinti</button>') +
          '<button type="button" class="sec" id="sbKeisti" data-sb="keisti" aria-expanded="' + (S.keiciama ? "true" : "false") + '" aria-controls="sbRanka">Pakeisti</button>' +
          (S.zmogaus ? '<button type="button" class="sec" id="sbGrazinti" data-sb="grazinti">Grąžinti siūlomą</button>' : "") + "</div>";
        h += "</div>";
      } else {
        h += '<div class="sb-veiksmai"><button type="button" class="sec" id="sbKeisti" data-sb="keisti" aria-expanded="' + (S.keiciama ? "true" : "false") +
          '" aria-controls="sbRanka">Pasirinkti patiems</button></div>';
      }
      if (S.keiciama) h += rankinisHtml();
      if (g) h += '<div class="cite">' + (sablonai() ? 'Patvirtinus sutartį, 2 žingsnyje atsiras sutarties klausimai, o 3 žingsnyje - sutarties bendrosios ir specialiosios sąlygos (iš LITGRID šablonų, tekstas nekeičiamas).'
        : g.nerengiama ? 'Sutarties projektas į pirkimo sąlygų paketą neįtraukiamas.'
        : 'Šios sutarties dokumentų generatorius dar nekuria - pirkimo sąlygų paketas nuo to nesikeičia.') + '</div>';
      h += stebejimoHtml();
      h += "</div>";
      vieta.innerHTML = h;
      if (aktyvus) { var el = doc.getElementById(aktyvus); if (el) el.focus(); }
    }

    function keista() { skaiciuok(); irasyk(); piesk(); if (o.onKeista) o.onKeista(); }

    vieta.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.matches && t.matches("input[data-sb-kl]")) { S.ats[t.getAttribute("data-sb-kl")] = t.value; keista(); }
    });
    vieta.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("[data-sb]");
      if (!b) return;
      var v = b.getAttribute("data-sb");
      if (b.closest("#sbSteb")) steb.atvira = true;   // veiksmas stebėjimo skiltyje - po perpiešimo ji lieka atverta (fokusas jos viduje)
      if (v === "patvirtinti" && S.galut) {
        S.patvirtinta = JSON.parse(JSON.stringify(S.galut)); S.buvo = null; S.keiciama = false;
        irasyk(); piesk(); var k = doc.getElementById("sbKeisti"); if (k) k.focus();
        if (o.onKeista) o.onKeista();
      } else if (v === "keisti") {
        S.keiciama = !S.keiciama; piesk();
        var f = doc.getElementById(S.keiciama ? "sbRankaSel" : "sbKeisti"); if (f) f.focus();
      } else if (v === "atsaukti") {
        S.keiciama = false; piesk(); var k2 = doc.getElementById("sbKeisti"); if (k2) k2.focus();
      } else if (v === "rinktis") {
        var sel = doc.getElementById("sbRankaSel"), x = sel && sel.value;
        if (!x) { sel.focus(); return; }
        if (x.indexOf("n:") === 0) {
          var n = G.NERENGIAMA.filter(function (q) { return q.id === x.slice(2); })[0];
          S.zmogaus = { seima: null, variantas: null, nerengiama: { id: n.id, tekstas: n.tekstas } };
        } else { var p = x.split(":"); S.zmogaus = { seima: p[1], variantas: p[2] || null, nerengiama: null }; }
        S.keiciama = false; skaiciuok(); S.patvirtinta = JSON.parse(JSON.stringify(S.galut)); S.buvo = null;
        irasyk(); piesk(); var k3 = doc.getElementById("sbKeisti"); if (k3) k3.focus();
        if (o.onKeista) o.onKeista();
      } else if (v === "atsisiusti") {
        atsisiusk();
      } else if (v === "valyti" || v === "valyti-ne") {
        steb.valyti = v === "valyti"; piesk();
        var vf = doc.getElementById(steb.valyti ? "sbValytiNe" : "sbValyti"); if (vf) vf.focus();
      } else if (v === "valyti-taip") {
        steb.valyti = false; isvalyk(); piesk();
        var vs = doc.getElementById("sbValyti") || doc.querySelector("#sbSteb summary"); if (vs) vs.focus();
      } else if (v === "grazinti") {
        S.zmogaus = null; S.patvirtinta = null; S.buvo = null; keista();
        var pv = doc.getElementById("sbPatv") || doc.getElementById("sbKeisti"); if (pv) pv.focus();
      }
    });

    vieta.addEventListener("toggle", function (e) { if (e.target && e.target.id === "sbSteb") steb.atvira = e.target.open; }, true);

    var api = {
      atnaujink: function () { skaiciuok(); irasyk(); piesk(); },
      zurnalas: function () { skaitykZurnala(); return { busena: Z.busena, irasai: Z.irasai.slice(), klaida: Z.klaida }; },
      naudokSaugykla: function (s) { SAUG = s || null; skaiciuok(); irasyk(); piesk(); },
      busena: function () {
        var g = S.galut, sb = sablonai();
        return { rodoma: rodoma(), laukia: laukia(), sistema: S.sistema, pasirinkta: g ? JSON.parse(JSON.stringify(g)) : null,
                 pavadinimas: pavadinimas(g), zmogaus: !!S.zmogaus, patvirtinta: !!S.patvirtinta,
                 buvoPatvirtinta: S.buvo ? pavadinimas(S.buvo) : null, sablonai: sb ? sb.kodai : null, kalba: sb ? sb.kalba : null,
                 stebejimas: g ? G.palygink(S.sistema, g.seima, g.variantas) : null };
      },
      atstatyk: function () { S.ats = {}; S.zmogaus = null; S.patvirtinta = null; S.buvo = null; S.keiciama = false; skaiciuok(); irasyk(); piesk(); }
    };
    skaiciuok(); skaitykZurnala(); piesk();
    return api;
  }

  global.GP_SUTARTIES_BLOKAS = { mount: mount };
})(typeof window !== "undefined" ? window : this);
