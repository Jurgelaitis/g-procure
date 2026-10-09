/* ============================================================================
 * G-Procure  shared/sutarties-elementai.js   (GP_SUTARTIES_ELEMENTAI, 2026-10-09)
 * Privalomų pirkimo sutarties elementų katalogas (sutarčių planas 4.5 4 p.; PĮ 95 str. 1 d. ir 3 d. / VPĮ 87 str. 2 d. ir 4 d. - per
 * registrą shared/teises-nuorodos.js, raktai sut_*; perskaityta e-tar 2026-10-09).
 *
 * Ką daro: sutarties dokumentuose (specialiosios ir bendrosios sąlygos kartu) ieško kiekvieno elemento ir grąžina tik faktą - „rasta
 * (kur, citata)“ arba „nerasta (ko ieškota)“; niekada neteigia, kad sutartis atitinka ar neatitinka įstatymo. Kaip ir pirkimo
 * dokumentų katalogas (shared/privalomi-elementai.js - tas pats teksto normalizavimas ir citatos, GP_PRIVALOMI.tekstas):
 * požymiai be diakritikų mažosiomis, be \b ir lookbehind; straipsnių numerių čia nėra.
 *   - „jeigu numatoma“ (peržiūros sąlygos), „jeigu pasitelkiami“ (subtiekėjai), nacionalinio saugumo nutraukimo atvejis (taikoma tik
 *     tam tikriems subjektams) - nerasta = informacija, ne „Patikrinkite“; VPĮ, kai trukmė su pratęsimu > 6 mėn., kainos peržiūra -
 *     „Patikrinkite“;
 *   - numatoma vertė mažesnė už GP_THRESHOLDS.SUTARTIS.reikalavimaiNuo (15 000 Eur be PVM) - viso straipsnio reikalavimai, ir nacionalinio
 *     saugumo nutraukimo atvejis, gali būti netaikomi (PĮ 95 str. 4 d. / VPĮ 87 str. 5 d.): nerasta = informacija. Jungti po shared/thresholds.js.
 * Išmatuota (2026-10-09): prekių ir paslaugų LT ir LT/EN sutarčių šablonai ir sugeneruotos sutartys - rasta viskas.
 * Nieko nesaugo ir nesiunčia. Jungti po shared/privalomi-elementai.js.
 *
 *   GP_SUTARTIES_ELEMENTAI.ieskok({ docs: [GP_DOK dokumentai], rezimas: "PI" | "VPI", verte, trukmeMen })
 *     -> [{ el, busena: "rasta" | "nerasta", kur: [{ doc, b, citata }], lygis: "tikrinti" | "info", priezastis }]
 * ========================================================================== */
(function (global) {
  "use strict";
  if (global.GP_SUTARTIES_ELEMENTAI) return;
  var T = function () { return global.GP_PRIVALOMI && global.GP_PRIVALOMI.tekstas; };

  /* reikia - požymių grupės (kiekvienoje turi atitikti bent vienas; tikslesnis požymis - pirmas, jis ieškomas visuose dokumentuose prieš
     bendresnį, kad citata rodytų skyrių ar nuostatą, ne apibrėžimą); jeiTaikytina - įstatyme „jeigu numatoma / pasitelkiami“ ar taikoma
     tik tam tikriems subjektams. */
  var KATALOGAS = [
    { id: "salys", raktas: "sut_salys", lt: "Sutarties šalių teisės ir pareigos", en: "Rights and obligations of the parties",
      reikia: [["(pirkejas|uzsakovas) isipareigoja", "(pirkejas|uzsakovas) (turi teise|privalo)", "the (buyer|customer) (shall|undertakes|has the right)"],
               ["(tiekejas|rangovas|vykdytojas) isipareigoja", "(tiekejas|rangovas|vykdytojas) (turi teise|privalo)", "the (supplier|contractor) (shall|undertakes|has the right)"]] },
    { id: "objektas", raktas: "sut_objektas", lt: "Perkamos prekės, paslaugos ar darbai ir jų kiekis", en: "Goods, services or works purchased and their quantity",
      reikia: [["sutarties (dalykas|objektas)", "sutarties (dalyk|objekt)", "(tiekejas|rangovas) isipareigoja.{0,200}(pristatyti|tiekti|suteikti|teikti|atlikti|parduoti|perduoti)", "subject matter of the contract"],
               ["kiek(io|is|iai|iu) \\(apimt", "(kiek\\w*|apimt\\w*|aprasym\\w*).{0,150}pried\\w* nr\\.? ?\\d+ .{0,3}technine specifikacija", "(prekiu|paslaugu|darbu) (kiek|apimt)", "kiek(is|io|iu|iai|ius|iui|iams|yb)", "apimt(is|ies|i|imi|yje|ys|ims)", "quantit"]] },
    { id: "kainodara", raktas: "sut_kainodara", lt: "Kainodaros taisyklės", en: "Pricing rules", reikia: [["kainodaros taisykl", "kainodara", "kainodar", "pricing"]] },
    { id: "mokejimas", raktas: "sut_mokejimas", lt: "Mokėjimo tvarka", en: "Payment procedure",
      reikia: [["atsiskaitymo (su tiekeju )?(tvarka|terminas)", "mokejimu tvarka", "apmokejimo salygos", "apmokejim\\w*", "mokejimo (tvark|salyg|termin)", "atsiskait\\w*", "payment"]] },
    { id: "terminai", raktas: "sut_terminai", lt: "Prievolių įvykdymo terminai", en: "Time limits for performance of obligations",
      reikia: [["(pristatymo|suteikimo|atlikimo) terminas", "(pristatymo|tiekimo|teikimo|atlikimo|ivykdymo|suteikimo|vykdymo) termin", "time limit"]] },
    { id: "uztikrinimas", raktas: "sut_uztikrinimas", lt: "Sutarties įvykdymo užtikrinimas", en: "Contract performance security",
      reikia: [["sutarties ivykdymo uztikrinim", "prievoliu pagal sutarti ivykdym\\w* uztikrin", "performance security"]] },
    { id: "perziura", raktas: "sut_perziura", lt: "Sutarties peržiūros sąlygos ar pasirinkimo galimybės", en: "Contract review clauses or options", jeiTaikytina: true,
      reikia: [["(kain\\w*|ikain\\w*).{0,40}(perziur|perskaiciav)", "perziuros salyg", "(price|rates?).{0,40}(review|recalculat)"]] },
    { id: "gincai", raktas: "sut_gincai", lt: "Ginčų sprendimo tvarka", en: "Dispute resolution procedure",
      reikia: [["gincu sprendim", "ginc\\w* sprendziam", "ginc\\w* nagrinejim", "ginc\\w*.{0,150}teism", "disput\\w*.{0,150}(resolv|court|settl)"]] },
    { id: "nutraukimas", raktas: "sut_nutraukimas", lt: "Sutarties nutraukimo atvejai ir tvarka", en: "Cases and procedure for terminating the contract",
      reikia: [["sutarties nutraukimas", "sutarties nutraukim", "nutraukti sutart", "sutartis (gali buti )?nutraukiam", "terminat\\w*"]] },
    { id: "galiojimas", raktas: "sut_galiojimas", lt: "Sutarties galiojimas", en: "Term of the contract",
      reikia: [["sutartis galioja", "sutarties galiojimas", "sutartis (laikoma sudaryta|isigalioja)", "sutarties galiojim", "(enter|entry) into force"]] },
    { id: "subtiekejai", raktas: "sut_subtiekejai", lt: "Subtiekėjai ir jų keitimo tvarka", en: "Subcontractors and the procedure for replacing them", jeiTaikytina: true,
      reikia: [["subtiekeju (bei specialistu )?pasitelkimas", "subtiekej", "subcontract"],
               ["subtiekeju (bei specialistu )?pasitelkimas ir keitimas", "subtiekeju .{0,40}keitim", "subtiekej\\w*.{0,200}keit", "keit\\w*.{0,100}subtiekej", "(replac|chang)\\w*.{0,100}subcontract"]] },
    { id: "atsakingas", raktas: "sut_atsakingas", lt: "Asmuo, atsakingas už sutarties vykdymą", en: "Person responsible for performance of the contract",
      reikia: [["atsaking\\w* asmen", "atsaking\\w*.{0,60}(uz )?sutarties vykdym", "sutarties vykdym\\w*.{0,60}atsaking", "pirkejo atstov\\w*", "responsible for (the )?performance"]] },
    { id: "nacsaugumas", raktas: "sut_nacsaugumas", lt: "Nutraukimo atvejis, kai Vyriausybė nusprendžia, kad sutartis neatitinka nacionalinio saugumo interesų",
      en: "Termination where the Government decides that the contract does not comply with national security interests", jeiTaikytina: true,
      reikia: [["vyriausybe.{0,250}sprendim\\w*.{0,200}neatitinka nacionalinio saugumo interes", "neatitinka nacionalinio saugumo interes\\w*.{0,200}nutrauk",
                "nutrauk\\w*.{0,250}neatitinka nacionalinio saugumo interes", "government.{0,250}(does not|do not) (comply|meet).{0,40}national security"]] }
  ];

  function ieskok(o) {
    o = o || {};
    var t = T();
    if (!t) throw new Error("GP_PRIVALOMI.tekstas neįkeltas (shared/privalomi-elementai.js)");
    var docs = (o.docs || []).filter(function (d) { return d && d.blocks && d.blocks.length && (!d.parseStatus || d.parseStatus === "parsed"); });
    var tekstai = docs.map(function (d) { return { d: d, dt: t.dokTekstas(d) }; });
    var riba = global.GP_THRESHOLDS && global.GP_THRESHOLDS.SUTARTIS ? global.GP_THRESHOLDS.SUTARTIS.reikalavimaiNuo : null;
    var maza = riba != null && o.verte != null && +o.verte > 0 && +o.verte < riba;
    return KATALOGAS.map(function (el) {
      var kur = [], truksta = 0;
      el.reikia.forEach(function (grupe) {
        var radau = null;
        for (var j = 0; j < grupe.length && !radau; j++) for (var i = 0; i < tekstai.length && !radau; i++) {
          var g = new RegExp(t.re(grupe[j]).source, "g"), m, pirmas = null;
          while ((m = g.exec(tekstai[i].dt.t))) {
            var c = t.citata(tekstai[i].dt, m.index, m[0].length);
            if (!pirmas) pirmas = c;
            if (!t.turinioEilute(c.b && c.b.text)) { pirmas = c; break; }
            if (m[0].length === 0) g.lastIndex++;
          }
          if (pirmas) radau = { doc: tekstai[i].d, b: pirmas.b, citata: pirmas.t };
        }
        if (radau) kur.push(radau); else truksta++;
      });
      var r = { el: el, busena: truksta ? "nerasta" : "rasta", kur: kur };
      if (truksta) {
        // VPĮ: ilgesnei nei 6 mėn. sutarčiai kainos peržiūra privaloma (registro sut_perziura); PĮ - „jeigu numatoma“
        var prz = el.id === "perziura" && o.rezimas === "VPI" && +o.trukmeMen > 6;
        r.lygis = maza ? "info" : el.jeiTaikytina && !prz ? "info" : "tikrinti";
        r.priezastis = maza ? "maza_verte" : prz ? "vpi_perziura" : el.jeiTaikytina ? "jei_taikytina" : null;
      }
      return r;
    });
  }
  function pav(el, l) { return l === "en" ? el.en : el.lt; }

  global.GP_SUTARTIES_ELEMENTAI = { versija: "1.0", KATALOGAS: KATALOGAS, ieskok: ieskok, pav: pav };
})(typeof window !== "undefined" ? window : this);
