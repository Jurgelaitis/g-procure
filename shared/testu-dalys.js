/* G-Procure testų rinkinio dalys (GP_TESTU_DALYS, 2026-10-23).
   Ilgas rinkinys (PP-salygos, shared) padalytas į dalis: paleidiklis (.github/testai/paleisk.py) kiekvieną dalį atveria
   atskira švaria naršykle su ?dalis=k/n, todėl atmintis nesikaupia per visą rinkinį, o vienos dalies laikas lieka toli nuo
   ribos. Be parametro (rankiniu būdu atvertas puslapis) - visos grupės iš eilės, kaip iki tol.
   Puslapis nurodo dalių skaičių <meta name="gp-testu-dalys" content="n"> (jį skaito paleidiklis) ir grupių sąrašą
   GP_TESTU_DALYS.grupes([[...], [...], ...]); neatitikimai - klaida „Nepavyko paleisti“, ne tylus praleidimas:
   meta ir sąrašo dalių skaičius, ta pati grupė keliose dalyse, puslapyje apibrėžta, bet į jokią dalį neįrašyta grupė
   (async function testai...), netinkamas ?dalis. Nieko nesaugo ir nesiunčia.
   Grupių laikas (2026-11-07): GP_TESTU_DALYS.vykdyk(grupes) paleidžia grupes iš eilės ir kiekvienos trukmę įrašo į
   window.GP_TESTU_LAIKAI ([{ grupe, s }], pildoma eigoje - ir nespėjusio rinkinio dalis); paleidiklis lėčiausias grupes
   parašo žurnale, kad dalis būtų galima suvienodinti pagal matavimą, ne spėjimą. */
(function () {
  "use strict";

  function parametras(paieska) {
    const m = /[?&]dalis=(\d+)\/(\d+)(?:&|$)/.exec(paieska === undefined ? location.search : paieska);
    return m ? { k: +m[1], n: +m[2] } : null;
  }

  // Puslapio scenarijuose apibrėžtos grupės: viršutinio lygio „async function testai...(“
  function apibreztos(dok) {
    const vardai = [];
    for (const s of (dok || document).querySelectorAll("script:not([src])")) {
      const re = /^[ \t]*(?:async[ \t]+)?function[ \t]+(testai\w+)[ \t]*\(/gm;
      let m;
      while ((m = re.exec(s.textContent))) vardai.push(m[1]);
    }
    return vardai;
  }

  function grupes(dalys, opt) {
    const o = opt || {}, dok = o.dokumentas || document;
    const n = dalys.length;
    const meta = dok.querySelector('meta[name="gp-testu-dalys"]');
    if (!meta || +meta.content !== n)
      throw new Error("testų dalių skaičius <meta name=\"gp-testu-dalys\"> (" + (meta ? meta.content : "nėra") + ") nesutampa su dalių sąrašu (" + n + ")");
    const visos = [].concat.apply([], dalys);
    if (visos.some(f => typeof f !== "function")) throw new Error("testų dalyse - ne funkcija (gal grupės pavadinimas su klaida)");
    const vardai = visos.map(f => f.name);
    const kartojasi = vardai.filter((v, i) => vardai.indexOf(v) !== i);
    if (kartojasi.length) throw new Error("ta pati testų grupė keliose dalyse: " + kartojasi.join(", "));
    const neitrauktos = apibreztos(dok).filter(v => vardai.indexOf(v) < 0);
    if (neitrauktos.length) throw new Error("testų grupė neįrašyta į jokią dalį: " + neitrauktos.join(", "));
    const p = parametras(o.paieska);
    if (!p) return visos;
    if (p.n !== n || p.k < 1 || p.k > n) throw new Error("netinkama dalis ?dalis=" + p.k + "/" + p.n + " (rinkinyje - " + n + " dalys)");
    if (!o.dokumentas) document.title += " (" + p.k + " dalis iš " + p.n + ")";
    return dalys[p.k - 1];
  }

  // Grupės iš eilės su trukme (sekundėmis, 0,1 s tikslumu); klaida grupėje nutraukia, kaip paprastas ciklas
  async function vykdyk(sarasas, opt) {
    const laikai = (opt && opt.laikai) || (window.GP_TESTU_LAIKAI = []);
    for (const g of sarasas) {
      const t0 = Date.now();
      try { await g(); }
      finally { laikai.push({ grupe: g.name, s: Math.round((Date.now() - t0) / 100) / 10 }); }
    }
    return laikai;
  }

  window.GP_TESTU_DALYS = { grupes, parametras, apibreztos, vykdyk };
})();
