/* ============================================================================
 * G-Procure  shared/privalomi-elementai.js   (GP_PRIVALOMI, 2026-10-07)
 * Privalomų pirkimo dokumentų elementų katalogas - pirkimo sąlygų tikrinimo 4 etapas
 * (docs/salygos/auditas-planas-2026-10.md, 2.1 sk. 5 sluoksnis).
 *
 * Ką daro: ieško, ar pirkimo dokumentų pakete (visi failai kartu - skelbimas, BPS, SPS, priedai) yra
 * kiekvienas katalogo elementas. Kiekvienas elementas = registro raktas (shared/teises-nuorodos.js; norma
 * perskaityta e-tar 2026-10-07) + paieškos požymiai + taikymo sąlyga. Rezultatas - tik faktas „rasta (kur)“
 * arba „nerasta (ko ieškota)“: modulis niekada neteigia, kad dokumentas atitinka ar neatitinka įstatymo.
 *
 * Požymiai rašomi be diakritikų mažosiomis (tekstas normalizuojamas taip pat), be \b ir be lookbehind
 * (CLAUDE.md 5 sk.); straipsnių numerių požymiuose nėra - jie gyvena tik registre.
 * Ieškoma visame dokumento tekste (blokai sujungiami), todėl PDF eilučių lūžiai netrukdo.
 * Nieko nesaugo ir nesiunčia. Naudoja shared/parengtis.js (grupė „privalomi“).
 * ========================================================================== */
(function (global) {
  "use strict";

  var DIAKR = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
  /* Mažosios raidės ir be diakritikų, ilgis nekeičiamas (kiekvienas ženklas - vienas ženklas), kad radinio vieta originaliame
     tekste sutaptų ir citata būtų rodoma ties pačiu sutapimu. Tarpai, NBSP ir lūžiai - tarpas; požymio tarpas atitinka 1 ar daugiau. */
  function be(s) {
    return String(s || "").split("").map(function (c) {
      var l = c.toLowerCase(); l = l.length === 1 ? l : c;
      return DIAKR[l] || (/\s/.test(l) ? " " : l);
    }).join("");
  }
  var _re = {};
  function re(p) { return _re[p] || (_re[p] = new RegExp(p.replace(/ /g, " +"))); }
  var SALYGOS = ["bps", "sps", "skelbimas"];     // procedūriniai elementai - pirkimo sąlygose ir skelbime, ne sutarties prieduose

  /* Katalogas. reikia - požymių grupės: kiekvienoje grupėje turi atitikti bent vienas požymis (bet kuriame dokumente).
     salyga(ctx) - grąžina null, jei elementas taikomas, arba priežasties raktą, kodėl netikrinamas.
     jeiTaikytina - įstatyme „jeigu taikytina“: nerastas elementas - informacija, ne „Patikrinkite“.
     neuzpildyta - formos vieta be turinio (tikrinama kiekviena pastraipa atskirai): rasta tik ji - „vieta yra, bet neužpildyta“.
     spsPirma - konkretaus pirkimo sprendimas rašomas SPS (BPS - tik bendra nuostata, pvz. „jei reikalaujama“), todėl SPS tikrinamos pirmiau;
     tvarka - kai tiksli reikšmė yra skelbime, o BPS tik nuoroda į jį (terminas, galiojimas): SPS, skelbimas, BPS.
     etapas (DPS, naudotojo sprendimas 2026-10-07 - tikrinti pagal etapą): „pasiulymai“ - pasiūlymų elementas, DPS sukūrimo sąlygoms
     netaikomas (sukūrimo etape teikiamos paraiškos); „tiekejai“ - tiekėjų elementas, konkretaus pirkimo pagal DPS sąlygose jo ieškoma
     ir įkeltose DPS sukūrimo sąlygose. reikiaDpsSukurimui - požymiai DPS sukūrimo sąlygoms, kai dalis elemento susijusi su sutarties
     sudarymu. */
  var KATALOGAS = [
    { id: "rengimas", etapas: "pasiulymai", raktas: "dok_rengimas",
      lt: "Pasiūlymų rengimo reikalavimai", en: "Requirements for preparing tenders",
      reikia: [["pasiulym\\w* rengim", "pasiulym\\w* (turi buti|privalo buti) (parengt|pateikt|sudaryt)", "pasiulym\\w* (parengimo|pateikimo) reikalavim"]] },
    { id: "pasalinimas", etapas: "tiekejai", raktas: "dok_pasalinimas_kvalifikacija",
      lt: "Pašalinimo pagrindai ir kvalifikacijos reikalavimai", en: "Exclusion grounds and qualification requirements",
      reikia: [["pasalinimo pagrind"], ["kvalifikacijos reikalavim", "kvalifikacija nera tikrinama", "kvalifikacija netikrinama"]] },
    { id: "teise_verstis", etapas: "tiekejai", raktas: "dok_teise_verstis",
      lt: "Įsipareigojimas, kad sutartį vykdys tik teisę verstis veikla turintys asmenys", en: "Undertaking that the contract will be performed only by persons entitled to pursue the activity",
      reikia: [["teis\\w* verstis.{0,400}(isipareigo|vykdys tik)", "(isipareigo|vykdys tik).{0,400}teis\\w* verstis"]] },
    { id: "ebvpd", etapas: "tiekejai", raktas: "ebvpd_dokumentuose",
      lt: "Pašalinimo pagrindų nebuvimą ir kvalifikaciją patvirtinantys dokumentai ir EBVPD", en: "Documents proving the absence of exclusion grounds and qualification, and the ESPD",
      // ne apibrėžimas („EBVPD - Europos bendrasis ... dokumentas“), o reikalavimas jį pateikti
      reikia: [["pateik\\w*.{0,160}(ebvpd|europos bendr\\w* viesuju pirkimu dokument)", "(ebvpd|europos bendr\\w* viesuju pirkimu dokument)\\w*.{0,60}(pateik|pild|teik)", "espd"]],
      kur: SALYGOS.concat(["ebvpd"]), spsPirma: true },
    { id: "ak_pirma", etapas: "pasiulymai", raktas: "ebvpd_dokumentuose", tikAtviram: true,
      lt: "Nuoroda, ar atvirame konkurse pirmiausia vertinamas pasiūlymas, o vėliau tikrinama kvalifikacija", en: "Statement whether, in the open procedure, the tender is evaluated before qualification is checked",
      // LITGRID AK šablonai tai užrašo netiesiogiai: kvalifikaciją pagrindžiančius dokumentus teikia tiekėjas, kurio pasiūlymas
      // „pagal vertinimo rezultatus galės būti pripažintas laimėjusiu“ (AK SPS 10.2 p.). Žodžiai „po“, „tik“ - tik kaip atskiri žodžiai.
      reikia: [["pagal vertinimo rezultatus gales buti pripazint\\w* laimejusiu.{0,250}kvalifikac", "pirmiausia (ivertin|vertin|nagrinej)\\w*.{0,200}(veliau|po to).{0,200}kvalifikac", "pasiulym\\w* (vertinimas|bus vertinami|vertinami).{0,120}(^|[^a-z])(pries|anksciau)([^a-z]).{0,80}kvalifikac"]] },
    { id: "nepasalinti", etapas: "tiekejai", raktas: "dok_nepasalinti",
      lt: "Galimybės nepašalinti tiekėjo (patikimumo įrodymas)", en: "Possibilities not to exclude a supplier (proof of reliability)",
      // LITGRID BPS: „gali nepašalinti ... kai būtina užtikrinti viešojo intereso apsaugą“ ir „įrodyti savo patikimumą“
      reikia: [["(gali )?nepasalin\\w* tiekej\\w*.{0,250}(viesojo intereso|salygos|irodym)", "irodyti savo patikimum", "savo patikimumui irodyti"]] },
    { id: "nesudaryti", etapas: "pasiulymai", raktas: "dok_nesudaryti",
      lt: "Aplinkos apsaugos, socialinės ir darbo teisės įpareigojimai (galimybė nesudaryti sutarties)", en: "Environmental, social and labour law obligations (possibility not to award the contract)",
      reikia: [["aplinkos apsaugos, socialines ir darbo teises ipareigojim"]] },
    { id: "kriterijai", etapas: "pasiulymai", raktas: "dok_kriterijai",
      lt: "Pasiūlymų vertinimo kriterijai ir sąlygos", en: "Tender evaluation criteria and conditions",
      // SPS: „... bus vertinami pagal ekonomiškai naudingiausio Pasiūlymų vertinimo kriterijų – kainą“, DPS konkretaus pirkimo sąlygos - „... išrenka
      // pagal kainos kriterijų“; BPS „vadovaujantis SPS nurodytais kriterijais“ - ne kriterijus
      reikia: [["bus vertinami pagal", "vertinami pagal .{0,80}(kain|sanaud|kokyb|ekonomiskai naudingiaus)", "isrenka pagal .{0,60}(kain|sanaud|kriterij)", "vertinimo kriterij\\w*\\s*[-–:]", "kainos ar sanaudu ir kokybes santyk", "maziausios kainos"]], spsPirma: true },
    { id: "teisine_forma", etapas: "pasiulymai", raktas: "dok_teisine_forma",
      lt: "Tiekėjų grupės teisinės formos reikalavimai", en: "Legal form requirements for a group of suppliers",
      reikia: [["teisin\\w* form"]] },
    { id: "subtiekimas", raktas: "dok_subtiekimas",
      lt: "Subtiekimo reikalavimai", en: "Subcontracting requirements",
      // ne „Kvazisubtiekėjas“ (specialistas) ir ne skyriaus antraštė - nuostata apie subtiekėjų pasitelkimą
      // BPS: „... privalo nurodyti, kuriai Sutarties daliai jis ketina pasitelkti Subtiekėjus“
      reikia: [["(pasitelk|ketina pasitelk)\\w*.{0,120}(^|[^a-z])subtiekej", "(^|[^a-z])subtiekej\\w*,? (kuriuos|kurie) .{0,60}pasitelk", "(^|[^a-z])subtiekej\\w* (pasitelkim|sarasa|keitim)"]], kur: null },
    { id: "alternatyvus", etapas: "pasiulymai", raktas: "dok_alternatyvus",
      lt: "Nuoroda, ar leidžiami alternatyvūs pasiūlymai", en: "Statement whether variants are allowed",
      reikia: [["alternatyv\\w* pasiulym"]], spsPirma: true },
    { id: "kaina", etapas: "pasiulymai", raktas: "dok_kaina",
      lt: "Kainos ar sąnaudų apskaičiavimas (su visais mokesčiais)", en: "Calculation of the price or cost (including all taxes)",
      reikia: [["(kain|sanaud)\\w*.{0,300}mokesci", "mokesci\\w*.{0,300}(kain|sanaud)"]] },
    { id: "uztikrinimas", etapas: "pasiulymai", raktas: "dok_uztikrinimas", jeiTaikytina: true,
      lt: "Pasiūlymų galiojimo užtikrinimo reikalavimai", en: "Tender guarantee requirements",
      // SPS: „Šio Pirkimo metu nereikalaujama pateikti Pasiūlymo galiojimo užtikrinimo“ arba dydis; BPS „(jei ... reikalaujama)“ - ne sprendimas
      reikia: [["(nereikalaujama|nebus reikalaujama|reikalaujama|privalo|turi) pateikti pasiulym\\w* galiojimo uztikrin", "galiojimo uztikrin\\w*.{0,80}(dydis|suma|banko garantij|draudimo bendrov|ne mazesn|nereikalaujam)"]], spsPirma: true },
    { id: "terminas", raktas: "terminas_dokumentuose",
      lt: "Pasiūlymų pateikimo termino pabaiga, vieta ir būdas", en: "Tender deadline, place and method",
      // su data: skelbimo „Pasiūlymų priėmimo terminas: 08/10/2026 15:00“ arba SPS grafiko eilutė „Pirminių pasiūlymų gavimas | 2026-10-26“;
      // arba LITGRID BPS nuoroda į skelbimą (skelbimas - pirkimo dokumentų dalis): „Pasiūlymai turi būti pateikti iki Skelbime apie Pirkimą
      // nurodyto Pasiūlymų pateikimo termino pabaigos“, „Informacija apie Pasiūlymų pateikimo terminą nurodoma CVP IS“; „iki ... termino pabaigos“ - ne terminas
      reikia: [["(pasiulymu|paraisku|dalyvavimo prasymu) (priemimo|pateikimo|gavimo) terminas\\s*:?\\s*\\d", "pateikimo termin\\w*( pabaiga)?\\s*[-–:|]\\s*\\d",
                "(pasiulym\\w*|paraisk\\w*) (pateikimas|gavimas|priemimas|rengimas)\\s*[|:–-]?\\s*\\d", "pateikt\\w* iki .{0,40}skelbim\\w*.{0,60}pateikimo termin",
                "pateikimo termin\\w* (nurodom|pateikiam|nurodyt)\\w* .{0,30}(cvp is|skelbim|sps|kvietim)", "paraisk\\w* pateikimo termin\\w*[\\s|]*[-–]\\s*.{0,40}cvp is nurodyt"],
               ["cvp is", "elektronin\\w* priemon", "pateikimo viet", "pateikimo bud", "pateikimo adresas"]], tvarka: ["sps", "skelbimas", "bps"] },
    { id: "paaiskinimai", raktas: "dok_paaiskinimai",
      lt: "Paaiškinimų prašymo būdai ir ar rengiamas susitikimas su tiekėjais", en: "Ways to request clarifications and whether a meeting with suppliers is held",
      reikia: [["pirkimo (dokumentu|salygu) paaiskinim", "paaiskinim\\w*.{0,80}(prasyt|prasym|kreipt|klausim)", "(prasyti|kreiptis|klausim)\\w*.{0,80}paaiskinim"], ["susitikim\\w* su tiekej", "tiekej\\w*.{0,60}susitikim\\w*.{0,60}(paaiskinim|pirkimo dokument|pirkimo salyg)", "rengti susitikim"]] },
    { id: "galiojimas", etapas: "pasiulymai", raktas: "dok_galiojimas",
      lt: "Pasiūlymo galiojimo data ar laikotarpis", en: "Tender validity date or period",
      // ne „galiojimo užtikrinimas“ (tai kitas elementas)
      // sakinys, ne skyriaus antraštė „PASIŪLYMŲ GALIOJIMAS“; skelbimas: „Laikotarpis, per kurį pasiūlymas turi išlikti galiojantis: 90 Diena“
      reikia: [["pasiulym\\w* turi islikti galiojant\\w*\\s*:?\\s*\\d", "pasiulym\\w* (turi )?(galioti|galioja)", "pasiulym\\w* galiojimo (termin|laikotarp|data|pabaig)\\w*.{0,60}(iki|dien|men|\\d)",
                "galiojimo termin\\w*.{0,60}pasiulym"]], tvarka: ["sps", "skelbimas", "bps"] },
    { id: "susipazinimas", etapas: "pasiulymai", raktas: "dok_susipazinimas", raktai: ["dok_susipazinimas", "dok_susipazinimo_procedura"],
      lt: "Susipažinimo su pasiūlymais data ir procedūros", en: "Date and procedure for opening tenders",
      reikia: [["susipazinim\\w* su .{0,80}pasiulym", "vok\\w* (su pasiulymais )?atplesim", "pasiulym\\w* atplesim"]] },
    { id: "eurais", etapas: "pasiulymai", raktas: "dok_eurais",
      lt: "Kainų vertinimas eurais ir užsienio valiutos perskaičiavimas", en: "Evaluation of prices in euro and conversion of foreign currency",
      reikia: [["eurais"], ["europos centrinio banko", "lietuvos banko"]] },
    { id: "kontaktai", raktas: "dok_kontaktai",
      lt: "Asmenys, įgalioti palaikyti tiesioginį ryšį su tiekėjais, ir jų kontaktai", en: "Persons authorised to communicate directly with suppliers and their contacts",
      // LITGRID SPS nurodo rengėją su kontaktais („Rengė: ..., tel., el. p.“); eForms skelbimas - kontaktinį punktą
      spsPirma: true,
      reikia: [["rysi su tiekej", "igaliot\\w* palaikyti", "kontaktinis asmuo", "renge( / prepared by)?:.{0,120}(tel|el\\. ?p|@|\\+370)", "kontaktinis punktas", "contact point"]],
      // LITGRID formose eilutė „Rengė:“ / „Rengė / Prepared by:“ tuščia (ar „Choose an item.“)
      neuzpildyta: ["^renge( / prepared by)?:\\s*(choose an item\\.?|pasirinkite element\\w*\\.?)?\\s*$"] },
    { id: "gincai", raktas: "dok_gincai",
      lt: "Atidėjimo terminas ir ginčų nagrinėjimo tvarka", en: "Standstill period and review procedures",
      reikia: [["atidejimo termin"], ["gincu nagrinej", "pretenzij"]],
      // DPS sukūrimo sąlygose sutartis nesudaroma - tikrinama tik ginčų nagrinėjimo tvarka
      reikiaDpsSukurimui: [["gincu nagrinej", "pretenzij"]] },
    { id: "stebetojai", raktas: "dok_stebetojai",
      lt: "Nuoroda, ar į Komisijos posėdžius kviečiami stebėtojai", en: "Statement whether observers are invited to the Commission's meetings",
      // ne „posėdžiuose dalyvaujantys stebėtojai“ (kas gali susipažinti su informacija), o ar stebėtojai kviečiami
      // BPS „Komisija gali kviesti ...“ - galimybė, ne sprendimas; SPS „nebus kviečiami ... stebėtojo teisėmis“
      reikia: [["(nebus |bus )kvieciami.{0,120}stebetoj", "stebetoj\\w*.{0,100}(nebus |bus |ne)kvieci"]], spsPirma: true },
    { id: "konfidenciali", raktas: "dok_konfidenciali",
      lt: "Pareiga tiekėjui nurodyti, kuri pasiūlymo informacija konfidenciali", en: "Supplier's obligation to indicate which tender information is confidential",
      reikia: [["konfidencial\\w* informacij"]] },
    { id: "nacsaugumas", raktas: "dok_nacsaugumas_patikra",
      lt: "Dokumentai patikrai dėl atitikties nacionalinio saugumo interesams", en: "Documents for the national security check",
      reikia: [["nacionalinio saugumo"]] },
    { id: "cpo", raktas: "cpo_argumentai", jeiTaikytina: true,
      lt: "Sprendimo nepirkti per centrinę perkančiąją organizaciją argumentai", en: "Reasons for not using a central purchasing body",
      // LITGRID SPS: „Sprendimo neatlikti pirkimo naudojantis centralizuotų pirkimų katalogu pagrindimas: ...“
      spsPirma: true,
      reikia: [["centrines perkanciosios organizacijos", "cpo (katalog|paslaug)", "per cpo", "centralizuot\\w* pirkimu katalog\\w* pagrindimas\\s*[:\\-–]\\s*[^_\\s]"]],
      neuzpildyta: ["katalog\\w* pagrindimas\\s*[:\\-–]?\\s*_*\\s*$", "procurement directory\\s*:?\\s*_*\\s*$"] }
  ];

  /* Įstatyme išvardyti elementai, kurių katalogas automatiškai netikrina - jie taikomi tik tam tikrais atvejais
     (rodomi vienoje informacinėje eilutėje). Techninė specifikacija ir sutartis - tikrinami paketo patikroje. */
  var NETIKRINAMI = {
    lt: "riboto dalyvių skaičiaus kvalifikacijos vertinimo tvarka, objekto kiekis ir terminai (techninėje specifikacijoje), VPĮ - neskaidymo į dalis pagrindimas, energijos vartojimo efektyvumo, aplinkos apsaugos ir socialiniai kriterijai, statinio informacinio modeliavimo kriterijai, nuorodos į orientacinį ar išankstinį informacinį skelbimą ar kvalifikacijos vertinimo sistemą, PĮ - kvalifikacijos vertinimo sistemos konfidencialios informacijos apsauga, ex ante skaidrumo skelbimas, darbuotojų sąrašas ir darbo užmokesčio mediana, kita VPT nustatyta informacija",
    en: "the qualification procedure and minimum number of candidates when participation is limited, quantity and time limits (in the technical specification), under the Public Procurement Law - justification for not dividing into lots, energy efficiency, environmental and social criteria, building information modelling criteria, references to a periodic or prior information notice or a qualification system, under the utilities law - protection of confidential information in a qualification system, voluntary ex ante transparency notice, list of workers and median wage, other information set by the Public Procurement Office"
  };

  /* Dokumento tekstas: blokai sujungiami tarpu; pozicijų žemėlapis - kad radinį būtų galima parodyti bloke. */
  function dokTekstas(doc) {
    var dalys = [], ribos = [], ilgis = 0;
    (doc.blocks || []).forEach(function (b) {
      var t = be(b.text);
      if (!t.trim()) return;
      ribos.push({ nuo: ilgis, b: b });
      dalys.push(t); ilgis += t.length + 1;
    });
    return { t: dalys.join(" "), ribos: ribos };
  }
  /* Bloko indeksas pagal poziciją sujungtame tekste. */
  function blokoNr(dt, poz) {
    var lo = 0, hi = dt.ribos.length - 1, i = 0;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (dt.ribos[mid].nuo <= poz) { i = mid; lo = mid + 1; } else hi = mid - 1; }
    return i;
  }
  /* Turinio eilutė („12.PASIŪLYMŲ GALIOJIMAS13“, „... ......... 9“) - sutapimas joje nerodomas, jei yra kitas. */
  function turinioEilute(t) {
    t = String(t || "").replace(/\s+/g, " ").trim();
    return /\.{5,}/.test(t) || (/\d{1,3}$/.test(t) && t.length < 140 && t.replace(/[^a-ząčęėįšųūž]/g, "").length < t.length * 0.15);
  }
  /* Citata ties sutapimu: originalus bloko tekstas (su diakritikomis), apie 200 ženklų nuo sutapimo pradžios. */
  function citata(dt, poz, ilgis) {
    var r = dt.ribos[blokoNr(dt, poz)]; if (!r) return { b: null, t: "" };
    var t = String(r.b.text || ""), nuo = Math.max(0, poz - r.nuo - 40), iki = Math.min(t.length, poz - r.nuo + Math.max(ilgis, 60) + 120);
    return { b: r.b, t: (nuo > 0 ? "…" : "") + t.slice(nuo, iki).replace(/\s+/g, " ").trim() + (iki < t.length ? "…" : "") };
  }
  /* Ieško visų katalogo elementų. o: { docs, vaidmenys: { dokumento id: vaidmuo }, budasProcedura }.
     Elementas ieškomas dokumentuose, kurių vaidmuo yra jo `kur` sąraše (numatyta - BPS, SPS, skelbimas; null - visi);
     be vaidmenų - visuose dokumentuose. Grąžina [{ el, busena: "rasta" | "neuzpildyta" | "nerasta" | "netaikoma", kur: [{ doc, b, citata }],
     nezinomas, priezastis, dpsSukurimoNera }]: „netaikoma“ - atviro konkurso elementas kitam būdui (ne_atviras) ir pasiūlymų elementai DPS
     sukūrimo sąlygoms (dps_sukurimas), nezinomas - būdas nežinomas; „neuzpildyta“ - rasta tik tuščia formos vieta; dpsSukurimoNera - konkretaus
     pirkimo pagal DPS tiekėjų elementas nerastas, o DPS sukūrimo sąlygų pakete nėra (o.dpsSukurimo - tų sąlygų dokumentai). */
  function ieskok(o) {
    o = o || {};
    var docs = (o.docs || []).filter(function (d) { return d && d.parseStatus === "parsed" && d.blocks && d.blocks.length; });
    var tekstai = docs.map(function (d) { return { d: d, dt: dokTekstas(d), v: o.vaidmenys ? o.vaidmenys[d.id] : null }; });
    var proc = o.budasProcedura || "";
    var dpsSuk = (o.dpsSukurimo || []).filter(function (d) { return d && d.parseStatus === "parsed" && d.blocks && d.blocks.length; });
    return KATALOGAS.map(function (el) {
      if (el.tikAtviram && proc && proc !== "atviras") return { el: el, busena: "netaikoma", kur: [], priezastis: "ne_atviras" };
      if (el.tikAtviram && !proc) return { el: el, busena: "netaikoma", kur: [], nezinomas: true };
      if (proc === "dps_sukurimas" && el.etapas === "pasiulymai") return { el: el, busena: "netaikoma", kur: [], priezastis: "dps_sukurimas" };
      var reikia = proc === "dps_sukurimas" && el.reikiaDpsSukurimui || el.reikia;
      var kurV = el.kur === undefined ? SALYGOS : el.kur;
      // Pirma BPS, tada SPS, skelbimas ir kiti - citata rodoma iš pagrindinio dokumento; konkretaus pirkimo sprendimams - pirma SPS
      var EIL = {}; (el.tvarka || (el.spsPirma ? ["sps", "bps", "skelbimas"] : ["bps", "sps", "skelbimas"])).forEach(function (v, i) { EIL[v] = i; });
      var papildoma = proc === "dps_konkretus" && el.etapas === "tiekejai" ? dpsSuk : [];
      var sritis = tekstai.filter(function (x) { return !kurV || !o.vaidmenys || kurV.indexOf(x.v) >= 0 || papildoma.indexOf(x.d) >= 0; })
        .map(function (x, i) { return { x: x, i: i }; })
        .sort(function (a, b) { return ((EIL[a.x.v] != null ? EIL[a.x.v] : 3) - (EIL[b.x.v] != null ? EIL[b.x.v] : 3)) || a.i - b.i; })
        .map(function (y) { return y.x; });
      var kur = [], truksta = 0;
      reikia.forEach(function (grupe) {
        var radau = null;
        for (var i = 0; i < sritis.length && !radau; i++) {
          for (var j = 0; j < grupe.length && !radau; j++) {
            var g = new RegExp(re(grupe[j]).source, "g"), m, pirmas = null;
            while ((m = g.exec(sritis[i].dt.t))) {
              var c = citata(sritis[i].dt, m.index, m[0].length);
              if (!pirmas) pirmas = c;
              if (!turinioEilute(c.b && c.b.text)) { pirmas = c; break; }
              if (m[0].length === 0) g.lastIndex++;
            }
            if (pirmas) radau = { doc: sritis[i].d, b: pirmas.b, citata: pirmas.t };
          }
        }
        if (radau) kur.push(radau); else truksta++;
      });
      if (truksta && el.neuzpildyta) {
        var tuscia = null;
        sritis.some(function (x) {
          return (x.d.blocks || []).some(function (b) {
            var t = be(b.text).trim();
            if (!t || !el.neuzpildyta.some(function (pt) { return re(pt).test(t); })) return false;
            tuscia = { doc: x.d, b: b, citata: String(b.text || "").replace(/\s+/g, " ").trim() };
            return true;
          });
        });
        if (tuscia) return { el: el, busena: "neuzpildyta", kur: [tuscia] };
      }
      var r = { el: el, busena: truksta ? "nerasta" : "rasta", kur: kur };
      if (truksta && papildoma === dpsSuk && proc === "dps_konkretus" && el.etapas === "tiekejai" && !dpsSuk.length) r.dpsSukurimoNera = true;
      return r;
    });
  }

  function pav(el, l) { return l === "en" ? el.en : el.lt; }

  /* DPS dokumentas pagal antraštę (pirmi blokai): „... SIEKIANT SUKURTI DINAMINĘ PIRKIMO SISTEMĄ, SĄLYGOS“ (LT/EN - „... WITH AN AIM OF
     CREATING A DYNAMIC ...“) - sukūrimas; „KONKRETAUS PIRKIMO „X“, ATLIEKAMO DINAMINĖS PIRKIMO SISTEMOS „Y“ PAGRINDU, SĄLYGOS“ - konkretus. */
  function dpsDokumentas(doc){
    var t = be((doc && doc.blocks || []).slice(0, 6).map(function (b) { return b.text; }).join(" ")).slice(0, 900);
    if (re("konkretaus pirkimo.{0,300}dinamines pirkimo sistemos.{0,300}pagrindu").test(t)) return "konkretus";
    if (re("siekiant sukurti dinamine pirkimo sistema|with an aim of creating a dynamic").test(t)) return "sukurimas";
    return null;
  }
  /* Pirkimo būdo procedūra pagal DPS dokumentus, kai būdas nežinomas: konkretus pirkimas (jo sąlygos yra) arba DPS sukūrimas. */
  function dpsEtapas(docs){
    var r = (docs || []).map(dpsDokumentas);
    return r.indexOf("konkretus") >= 0 ? "dps_konkretus" : r.indexOf("sukurimas") >= 0 ? "dps_sukurimas" : null;
  }

  global.GP_PRIVALOMI = { KATALOGAS: KATALOGAS, NETIKRINAMI: NETIKRINAMI, SALYGOS: SALYGOS, ieskok: ieskok, pav: pav, dpsDokumentas: dpsDokumentas,
    dpsEtapas: dpsEtapas, _be: be,
    // teksto pagalbininkai shared/kvalifikacija.js (tas pats normalizavimas ir citatos)
    tekstas: { be: be, re: re, dokTekstas: dokTekstas, citata: citata, turinioEilute: turinioEilute } };
})(typeof window !== "undefined" ? window : this);
