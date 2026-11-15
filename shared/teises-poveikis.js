/* ============================================================================
 * G-Procure  shared/teises-poveikis.js   (window.GP_TEISES_POVEIKIS)
 * ----------------------------------------------------------------------------
 * TEISĖS POKYČIŲ POVEIKIS PIRKIMAMS (2026-11-15, krypties 3.3 žingsnis, naudotojo
 * „Darome - 3.3 Teisės pokyčių poveikis pirkimams“): prie kiekvieno aktyvaus pirkimo -
 * jam aktualūs teisės pokyčiai iš teisės stebėsenos registrų (PP-teise, nacionalinis ir ES).
 *
 * Kortelė (shared/pirkimo-kortele.js) paverčiama registro aktualumo kontekstu
 * (GP_STEBESENA.aktualumas): taikomas įstatymas (kortelės, o nenurodžius - pirkimo vykdytojo
 * įprastas), pirkimo būdas (GP_METHODS kodas -> registro būdas), objektas, etapai (dabartinis
 * ir visi vėlesni - pirkimas dar juos praeis) ir planuojama paskelbimo data. Pokyčiai
 * skirstomi pagal laiką:
 *  - busimi - įsigalios ar bus pradėti taikyti vėliau;
 *  - pirkimoMetu - įsigaliojo, pradėti taikyti ar priimti (teismų sprendimai, gairės) nuo pirkimo
 *    pradžios (anksčiausia iš kortelės pradžios, paskelbimo ir sukūrimo datų);
 *  - projektai - dar nepriimti (gali keistis ar likti nepriimti);
 *  - beDatos - data registre nenurodyta.
 * Pokyčiai iki pirkimo pradžios čia neskaičiuojami - tai galiojanti teisė, kurią pirkimas jau
 * taiko (ją rodo teisės stebėsena). Neaktualūs pagal registro požymius - tik suskaičiuojami.
 * Aktualumas, kurio nustatyti negalima, niekada nevirsta „neaktualu“ - rodomas su priežastimi.
 * Nieko nesiunčia ir neišsaugo; registrus įkelia puslapis (GP_STEBESENA.ikelk / ikelkKarta).
 * ==========================================================================*/
(function (global) {
  "use strict";

  /* GP_METHODS kodas -> registro pirkimo būdas (GP_STEBESENA.PROCEDUROS). Be atitikmens (konkurencinis dialogas, inovacijų
     partnerystė, kvalifikacijos sistema, CPO) - nenurodyta: įrašui, kuris riboja būdus, aktualumas nenustatomas. */
  var BUDAI = {
    "T-AK": "atviras", "S-AK": "atviras", "RK": "ribotas",
    "T-SD": "derybos-skelbiamos", "S-SD": "derybos-skelbiamos", "T-ND": "derybos-neskelbiamos", "S-ND": "derybos-neskelbiamos",
    "MV-NZ": "mv", "MV-NR": "mv", "MV-SAB": "mv", "MV-SAD": "mv",
    "DPS": "dps", "DPS-K": "dps", "PS": "preliminarioji", "VS": "vidaus-sandoris"
  };
  /* Kortelės objektas -> registro objektai (registre statyba ir IT - atskiri; mišrus - visi trys pagrindiniai). */
  var OBJEKTAI = {
    prekes: ["prekes"], paslaugos: ["paslaugos"], paslaugos_it: ["paslaugos", "it"],
    darbai: ["darbai", "statyba"], misrus: ["prekes", "paslaugos", "darbai"]
  };
  /* Kortelės būsena -> registro etapai: dabartinis ir vėlesni (būsimas pokytis palies tolesnius etapus). */
  var VISI_ETAPAI = ["planavimas", "rengimas", "vertinimas", "sutartis", "vykdymas"];
  var ETAPAS_NUO = { planuojamas: "planavimas", rengiamas: "rengimas", paskelbtas: "vertinimas", vertinamas: "vertinimas", sutartis: "sutartis" };
  var BAIGTOS = { sutartis: 1, nutrauktas: 1 };

  var T = {
    lt: { busena: "būsena", budas: "pirkimo būdas", objektas: "pirkimo objektas", rezimas: "taikomas įstatymas",
          isigalios: "Įsigalios", taikoma: "Bus taikoma nuo", isigaliojo: "Įsigaliojo", taikomaNuo: "Taikoma nuo", priimta: "Priimta",
          paskelbta: "Paskelbta", projektas: "Projektas", beDatos: "Data nenurodyta", po: "po", d: "d.",
          pagal: "Atrinkta pagal kortelę: ", etapaiNuo: "dabartinis etapas (ir vėlesni): ", pradzia: "pirkimo pradžia ", skelbimas: "planuojamas paskelbimas ",
          rezimasVykdytojo: " (pirkimo vykdytojo įprastai taikomas)",
          kbusimi: "įsigalios - {n}", kpirkimoMetu: "pasikeitė pirkimo metu - {n}", kprojektai: "svarstomi projektai - {n}", kbeDatos: "be datos - {n}" },
    en: { busena: "status", budas: "procedure", objektas: "subject", rezimas: "applicable law",
          isigalios: "Enters into force", taikoma: "Applies from", isigaliojo: "In force since", taikomaNuo: "Applied since", priimta: "Adopted",
          paskelbta: "Published", projektas: "Draft", beDatos: "Date not stated", po: "in", d: "days",
          pagal: "Selected by the card: ", etapaiNuo: "stages from: ", pradzia: "procurement start ", skelbimas: "planned publication ",
          rezimasVykdytojo: " (usual for the contracting body)",
          kbusimi: "entering into force - {n}", kpirkimoMetu: "changed during the procurement - {n}", kprojektai: "drafts under discussion - {n}", kbeDatos: "without a date - {n}" }
  };
  function kal(l) { return l === "en" ? "en" : "lt"; }
  function S() { return global.GP_STEBESENA; }
  function data(v) { v = String(v == null ? "" : v).trim(); return /^\d{4}-\d{2}-\d{2}$/.test(v) && S() && S().yraData(v) ? v : ""; }
  function vietineData(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return "";
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }

  /* Ar kortelė - aktyvus pirkimas (kaip „Mano pirkimai“): ne archyvuota, ne su sudaryta sutartimi ir ne nutrauktas. */
  function aktyvi(k) { return !!(k && !k.archyvuota && !BAIGTOS[k.busena]); }

  /* Pirkimo pradžia: anksčiausia iš kortelės pradžios, paskelbimo ir sukūrimo (vietinė) datų. */
  function pradzia(k) {
    var d = [data(k.pradzia), data(k.paskelbimas), vietineData(k.sukurta)].filter(Boolean).sort();
    return d[0] || "";
  }

  /* Kortelė -> aktualumo kontekstas ir ko trūksta. */
  function kontekstas(k, o) {
    o = o || {};
    var l = kal(o.kalba), t = T[l], truksta = [];
    var rez = k.rezimas === "PI" || k.rezimas === "VPI" ? k.rezimas : "", rezVykd = false;
    if (!rez && global.GP_KORTELE && k.vykdytojas) {
      var v = global.GP_KORTELE.vykdytojas(k.vykdytojas);
      if (v && (v.rezimas === "PI" || v.rezimas === "VPI")) { rez = v.rezimas; rezVykd = true; }
    }
    if (!rez) truksta.push(t.rezimas);
    var proc = BUDAI[k.budas] || "";
    if (!proc) truksta.push(t.budas);
    var obj = OBJEKTAI[k.objektas] || null;
    if (!obj) truksta.push(t.objektas);
    var nuo = ETAPAS_NUO[k.busena], et = nuo ? VISI_ETAPAI.slice(VISI_ETAPAI.indexOf(nuo)) : null;
    if (!et) truksta.push(t.busena);
    return { ctx: { rezimas: rez, procedura: proc, objektas: obj, etapas: et, skelbimoData: data(k.paskelbimas) || null },
             rezimasPagalVykdytoja: rezVykd, truksta: truksta, nuo: pradzia(k) };
  }

  /* Vienos reikšmės kontekstas teisės stebėsenos „Mano pirkimas“ laukams (PP-teise ?kortele=): būdas, pagrindinis objektas,
     dabartinis etapas, planuojama paskelbimo data ir įstatymas (kortelės arba vykdytojo įprastas). Nežinoma - "". */
  var VIENAS_OBJEKTAS = { prekes: "prekes", paslaugos: "paslaugos", paslaugos_it: "it", darbai: "darbai" };
  function vienasKontekstas(k) {
    var kt = kontekstas(k);
    return { rezimas: kt.ctx.rezimas, procedura: kt.ctx.procedura, objektas: VIENAS_OBJEKTAS[k.objektas] || "",
             etapas: ETAPAS_NUO[k.busena] || "", skelbimoData: kt.ctx.skelbimoData || "" };
  }

  /* Kontekstas žmogui (be HTML): „Atrinkta pagal kortelę: PĮ, atviras konkursas, darbai, etapai nuo: dokumentų rengimas, pirkimo pradžia 2026-11-14“. */
  function kontekstoTekstas(kt, o) {
    var l = kal(o && o.kalba), t = T[l], SS = S(), c = kt.ctx, d = [];
    if (c.rezimas) d.push((c.rezimas === "PI" ? "PĮ" : "VPĮ") + (kt.rezimasPagalVykdytoja ? t.rezimasVykdytojo : ""));
    if (c.procedura && SS) d.push(SS.PROCEDUROS[c.procedura][l].toLowerCase());
    if (c.objektas && SS) d.push(c.objektas.map(function (x) { return SS.OBJEKTAI[x][l].toLowerCase(); }).join(" / "));
    if (c.etapas && SS) d.push(t.etapaiNuo + SS.ETAPAI[c.etapas[0]][l].toLowerCase());
    if (kt.nuo) d.push(t.pradzia + kt.nuo);
    if (c.skelbimoData) d.push(t.skelbimas + c.skelbimoData);
    return t.pagal + d.join(", ");
  }

  /* Pokyčio data ir laikas pirkimo atžvilgiu. */
  function laikas(r, nuo, dabar) {
    var SS = S(), sk = SS.skiltis(r, dabar);
    if (sk === "archyvas") return null;
    if (sk === "projektas") return { grupe: "projektai", data: r.datos.paskelbta || r.datos.priimta || "" };
    var d = SS.veikimoData(r) || r.datos.priimta || r.datos.paskelbta || "";
    if (sk === "isigalios") return { grupe: "busimi", data: d };
    if (sk === "nezinoma" || !d) return { grupe: "beDatos", data: "" };
    return d >= (nuo || dabar) ? { grupe: "pirkimoMetu", data: d } : { grupe: "iki", data: d };
  }

  /* Pagrindinė funkcija. o: { registrai: [GP_STEBESENA.tikrink() rezultatai: nacionalinis, ES], dabar: "YYYY-MM-DD", kalba }.
     -> { kontekstas, busimi, pirkimoMetu, projektai, beDatos: [{ irasas, aktualumas, data }], neaktualu: n, iki: n } */
  function kortelei(k, o) {
    o = o || {};
    var SS = S(), l = kal(o.kalba), dabar = data(o.dabar) || (SS ? SS.dienaISO() : "");
    var out = { kontekstas: null, busimi: [], pirkimoMetu: [], projektai: [], beDatos: [], neaktualu: 0, iki: 0 };
    if (!k || !SS) return out;
    var kt = kontekstas(k, o);
    out.kontekstas = kt;
    var rodomi = {};
    (o.registrai || []).forEach(function (reg) {
      ((reg && reg.irasai) || []).forEach(function (r) {
        if (r.demo) return;
        var lk = laikas(r, kt.nuo, dabar);
        if (!lk) return;
        if (lk.grupe === "iki") { out.iki++; return; }
        var a = SS.aktualumas(r, kt.ctx, l);
        if (a.lygis === "neaktualu") { out.neaktualu++; return; }
        // tas pats pakeitimas PĮ ir VPĮ (susieti įrašai), kai įstatymas nežinomas, - vieną kartą
        if (rodomi[r.id] || (r.susije || []).some(function (id) { return rodomi[id]; })) return;
        rodomi[r.id] = true;
        out[lk.grupe].push({ irasas: r, aktualumas: a, data: lk.data });
      });
    });
    var eile = { aktualu: 0, galimai: 1, nezinoma: 2 };
    var pagal = function (kryptis) {
      return function (a, b) {
        if (a.data !== b.data) return (a.data < b.data ? -1 : 1) * kryptis;
        return (eile[a.aktualumas.lygis] - eile[b.aktualumas.lygis]) || String(a.irasas.id).localeCompare(String(b.irasas.id));
      };
    };
    out.busimi.sort(pagal(1));                 // artimiausi pirmi
    out.pirkimoMetu.sort(pagal(-1));           // naujausi pirmi
    out.projektai.sort(pagal(-1));
    out.beDatos.sort(pagal(1));
    return out;
  }

  /* Atvirkščiai (teisės stebėsenos įrašui): kurias aktyvias korteles šis pokytis gali liesti.
     -> [{ kortele, grupe, aktualumas, data }] (be neaktualių ir pokyčių iki pirkimo pradžios) */
  function irasuiKorteles(r, korteles, o) {
    o = o || {};
    var SS = S(), l = kal(o.kalba), dabar = data(o.dabar) || (SS ? SS.dienaISO() : ""), out = [];
    if (!r || !SS || r.demo) return out;
    (korteles || []).filter(aktyvi).forEach(function (k) {
      var kt = kontekstas(k, o), lk = laikas(r, kt.nuo, dabar);
      if (!lk || lk.grupe === "iki") return;
      var a = SS.aktualumas(r, kt.ctx, l);
      if (a.lygis === "neaktualu") return;
      out.push({ kortele: k, grupe: lk.grupe, aktualumas: a, data: lk.data });
    });
    return out;
  }

  /* Laiko žyma žmogui: „Įsigalios 2027-01-01 (po 47 d.)“, „Įsigaliojo 2026-11-01“, „Priimta 2026-10-28“, „Projektas“. */
  function laikoTekstas(x, dabar, kalba) {
    var SS = S();
    if (!SS) return "";
    var l = kal(kalba), t = T[l], r = x.irasas, d = data(dabar) || SS.dienaISO();
    var sd = SS.svarbiausiaData(r, d, l);
    return sd.zyma + (sd.data ? " " + sd.data : "") + (sd.ateitis && sd.data ? " (" + t.po + " " + SS.dienuSkirtumas(d, sd.data) + " " + t.d + ")" : "");
  }

  /* Santrauka: „įsigalios - 1, pasikeitė pirkimo metu - 2“ (o.projektai - ir projektai; tuščios grupės praleidžiamos). */
  function santrauka(rez, o) {
    o = o || {};
    var t = T[kal(o.kalba)], g = ["busimi", "pirkimoMetu"].concat(o.projektai ? ["projektai"] : []).concat(o.beDatos ? ["beDatos"] : []);
    return g.filter(function (x) { return rez[x].length; }).map(function (x) { return t["k" + x].replace("{n}", rez[x].length); }).join(", ");
  }

  global.GP_TEISES_POVEIKIS = {
    version: "1.0",
    BUDAI: BUDAI, OBJEKTAI: OBJEKTAI, VISI_ETAPAI: VISI_ETAPAI, ETAPAS_NUO: ETAPAS_NUO,
    aktyvi: aktyvi, pradzia: pradzia, kontekstas: kontekstas, kontekstoTekstas: kontekstoTekstas, vienasKontekstas: vienasKontekstas,
    kortelei: kortelei, irasuiKorteles: irasuiKorteles, laikoTekstas: laikoTekstas, santrauka: santrauka
  };
})(typeof window !== "undefined" ? window : this);
