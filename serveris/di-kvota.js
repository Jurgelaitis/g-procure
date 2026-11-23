/* ============================================================================
 * G-Procure DI užduočių kvota (serverio index.js, POST /api/uzduotis) - gryna logika (2026-11-23, saugumo auditas G-01).
 *
 * Kodėl: DI kelią saugo tik kilmės antraštė, kurią galima suklastoti, todėl bet kas galėjo naudoti G-Procure kaip
 * nemokamą DI ir per kelias valandas išnaudoti mėnesio biudžetą (Anthropic paskyros riba - paskutinė apsauga, bet
 * ją pasiekus DI neveiktų visiems iki kito mėnesio). Kvota riboja:
 *   - vienu metu vykdomas užklausas (vienam IP ir visas),
 *   - užklausų skaičių vienam IP per 10 min.,
 *   - apskaičiuotas DI išlaidas per dieną (Lietuvos laiku) vienam IP ir visas - pagal Anthropic atsakymo usage.
 * Išlaidos skaičiuojamos apytiksliai (kainos - KAINOS, USD už milijoną žetonų); tikslią sumą rodo Anthropic Console.
 * Būsena - tik atmintyje (perkrovus prasideda iš naujo); IP adresai niekur neįrašomi, žurnale - tik kvotos rūšis.
 *
 *   const K = GP_DI_KVOTA.sukurk({ ipVienuMetu, visoVienuMetu, ipPer10Min, ipDienai, visoDienai, dabar })
 *   const r = K.pradek(ip)   -> { ok: true, pridek(modelis, usage), baik() } | { ok: false, status: 429, kvota, klaida, kartotiPo }
 *   K.busena()               -> { diena, viso, vienuMetu, ip, ribos, dienosRibaPasiekta } - testams
 *   K.viesaBusena()          -> { diena, dienosRibaPasiekta } - GET /api/di/busena (stebėsenai)
 *   ipRaktas(ip)             - IPv6 - /64 tinklas, IPv4 - adresas
 *
 * Šis failas neturi priklausomybių ir veikia ir Node (serveris), ir naršyklėje (testai - serveris/testai.html).
 * ============================================================================ */
(function (saknis, fabrikas) {
  if (typeof module === "object" && module.exports) module.exports = fabrikas();
  else saknis.GP_DI_KVOTA = fabrikas();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSIJA = "2026-11-23";
  // USD už milijoną žetonų (įvesties, išvesties); nežinomas modelis - brangiausio kaina (atsargiai)
  var KAINOS = {
    "claude-haiku-4-5-20251001": [1, 5],
    "claude-sonnet-4-6": [3, 15],
    "claude-opus-4-6": [5, 25]
  };
  var BRANGIAUSIA = [5, 25];
  var NUMATYTA = { ipVienuMetu: 6, visoVienuMetu: 12, ipPer10Min: 150, ipDienai: 1, visoDienai: 4 };   // ipDienai - $1 nuo 2026-11-23 (naudotojo sprendimas; iki tol 2,5)
  var DESIMT_MIN = 10 * 60 * 1000;

  var KLAIDOS = {
    vienuMetu: "Vienu metu vykdoma per daug DI užklausų. Palaukite, kol baigsis ankstesnės, ir bandykite dar kartą.",
    per10Min: "Per trumpą laiką išsiųsta per daug DI užklausų. Bandykite po kelių minučių.",
    ipDiena: "Šiandien iš šio tinklo išsiųsta daug DI užklausų - dienos riba pasiekta. DI funkcijos vėl veiks rytoj (nuo 00:00 Lietuvos laiku).",
    diena: "Šiandienos G-Procure DI užklausų riba pasiekta. DI funkcijos vėl veiks rytoj (nuo 00:00 Lietuvos laiku)."
  };

  // Lietuvos kalendorinė diena „YYYY-MM-DD“ (dienos riba - vidurnaktis Lietuvoje, ne UTC)
  function dienaLT(ms) {
    try {
      var d = new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ms));
      var g = function (t) { for (var i = 0; i < d.length; i++) if (d[i].type === t) return d[i].value; return ""; };
      return g("year") + "-" + g("month") + "-" + g("day");
    } catch (e) { return new Date(ms).toISOString().slice(0, 10); }
  }
  // Sekundės iki kito vidurnakčio Lietuvoje (Retry-After dienos ribai)
  function ikiRytojaus(ms) {
    var d = dienaLT(ms), t = ms;
    // ieškoma valandos tikslumu, tada minutės - vasaros laiko pokytis netrukdo
    while (dienaLT(t) === d) t += 3600 * 1000;
    t -= 3600 * 1000;
    while (dienaLT(t) === d) t += 60 * 1000;
    return Math.max(60, Math.round((t - ms) / 1000));
  }

  // Kvotos raktas pagal adresą (2026-11-23): IPv6 - visas /64 tinklas (vienas naudotojas paprastai gauna visą /64, todėl kitaip ribos
  // apeinamos keičiant adresą), IPv4 ir IPv4 IPv6 pavidalu (::ffff:1.2.3.4) - pats adresas.
  function ipRaktas(ip) {
    var s = String(ip || "").trim().toLowerCase();
    var m4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
    if (m4) return m4[1];
    if (s.indexOf(":") < 0) return s || "nezinomas";
    s = s.replace(/%.*$/, "");
    var dalys = s.split("::");
    if (dalys.length > 2) return s;
    var pr = dalys[0] ? dalys[0].split(":") : [], gal = dalys.length === 2 && dalys[1] ? dalys[1].split(":") : [];
    if (gal.length && /\./.test(gal[gal.length - 1])) gal.splice(gal.length - 1, 1, "0", "0");   // įterptas IPv4 - du blokai
    var visi = dalys.length === 2 ? pr.concat(new Array(Math.max(0, 8 - pr.length - gal.length)).fill("0"), gal) : pr;
    if (visi.length !== 8 || !visi.every(function (h) { return /^[0-9a-f]{1,4}$/.test(h); })) return s;
    return visi.slice(0, 4).map(function (h) { return parseInt(h, 16).toString(16); }).join(":") + "::/64";
  }

  function kaina(modelis, usage) {
    if (!usage || typeof usage !== "object") return 0;
    var k = KAINOS[modelis] || BRANGIAUSIA;
    var sk = function (x) { return typeof x === "number" && isFinite(x) && x > 0 ? x : 0; };
    // talpyklos įrašymas - 1,25 įvesties kainos, skaitymas - 0,1 (Anthropic kainodara); apytiksliai
    var ivestis = sk(usage.input_tokens) + 1.25 * sk(usage.cache_creation_input_tokens) + 0.1 * sk(usage.cache_read_input_tokens);
    return (ivestis * k[0] + sk(usage.output_tokens) * k[1]) / 1e6;
  }

  function sukurk(o) {
    o = o || {};
    var R = {};
    Object.keys(NUMATYTA).forEach(function (k) { R[k] = typeof o[k] === "number" && o[k] > 0 ? o[k] : NUMATYTA[k]; });
    var dabar = typeof o.dabar === "function" ? o.dabar : function () { return Date.now(); };
    var B = { diena: dienaLT(dabar()), viso: 0, vienuMetu: 0, ip: Object.create(null) };

    function naujaDiena(ms) {
      var d = dienaLT(ms);
      if (d !== B.diena) {
        B.diena = d; B.viso = 0;
        // dienos išlaidos nunulinamos, vykdomos užklausos ir 10 min. langas lieka
        Object.keys(B.ip).forEach(function (ip) { B.ip[ip].diena = 0; if (!B.ip[ip].vienuMetu && !B.ip[ip].laikai.length) delete B.ip[ip]; });
      }
    }
    function irasas(ip) {
      return B.ip[ip] || (B.ip[ip] = { vienuMetu: 0, laikai: [], diena: 0 });
    }
    function atmesk(kvota, kartotiPo) {
      return { ok: false, status: 429, kvota: kvota, klaida: KLAIDOS[kvota], kartotiPo: kartotiPo };
    }

    function pradek(ip) {
      var ms = dabar();
      naujaDiena(ms);
      ip = ipRaktas(ip);
      var I = irasas(ip);
      I.laikai = I.laikai.filter(function (t) { return ms - t < DESIMT_MIN; });
      if (B.viso >= R.visoDienai) return atmesk("diena", ikiRytojaus(ms));
      if (I.diena >= R.ipDienai) return atmesk("ipDiena", ikiRytojaus(ms));
      if (B.vienuMetu >= R.visoVienuMetu || I.vienuMetu >= R.ipVienuMetu) return atmesk("vienuMetu", 10);
      if (I.laikai.length >= R.ipPer10Min) return atmesk("per10Min", Math.max(10, Math.round((DESIMT_MIN - (ms - I.laikai[0])) / 1000)));
      I.laikai.push(ms); I.vienuMetu++; B.vienuMetu++;
      var baigta = false;
      return {
        ok: true,
        pridek: function (modelis, usage) {
          var k = kaina(modelis, usage);
          naujaDiena(dabar());
          I.diena += k; B.viso += k;
          return k;
        },
        baik: function () {
          if (baigta) return;
          baigta = true;
          I.vienuMetu = Math.max(0, I.vienuMetu - 1); B.vienuMetu = Math.max(0, B.vienuMetu - 1);
        }
      };
    }
    function busena() {
      naujaDiena(dabar());
      return { diena: B.diena, viso: B.viso, vienuMetu: B.vienuMetu, ip: Object.keys(B.ip).length, ribos: R, dienosRibaPasiekta: B.viso >= R.visoDienai };
    }
    // Viešai (stebėsenai, GET /api/di/busena) - tik ar pasiekta bendra dienos riba; sumos ir adresai neatskleidžiami
    function viesaBusena() {
      naujaDiena(dabar());
      return { diena: B.diena, dienosRibaPasiekta: B.viso >= R.visoDienai };
    }
    return { pradek: pradek, busena: busena, viesaBusena: viesaBusena };
  }

  return { VERSIJA: VERSIJA, KAINOS: KAINOS, NUMATYTA: NUMATYTA, KLAIDOS: KLAIDOS, sukurk: sukurk, kaina: kaina, dienaLT: dienaLT, ikiRytojaus: ikiRytojaus, ipRaktas: ipRaktas };
});
