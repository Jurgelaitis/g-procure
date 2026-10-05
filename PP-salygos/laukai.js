/* ==========================================================================
   PP-salygos laukų registras (GP_LAUKAI, 2026-10-04) - VIENAS šaltinis 2 žingsnio pildomoms vietoms:
   kas yra pildoma vieta, koks jos klausimas ir užuomina, kokio tipo įvestis, ar nuoroda neprivaloma
   ir ką siūlyti. Forma (PP-SALYGOS.html) generuojama iš čia, generavimas pildo pagal tą patį planą
   (planas()), todėl peržiūra „Taip atrodys dokumente“ ir Word dokumentas sutampa.

   Iki 2026-10-04: laukai be pavadinimo („reikšmė 1“, „reikšmė 2“), sakiniai formoje kirpti ties 160-200
   simbolių (ir žodžio viduryje), „(SPS ___ priedas)“ dokumente likdavo be numerio, o „X“ vietoj priedo
   numerio ar sumos (123 vietos šablonuose) formoje visai nebuvo klausiama.

   Klausimų ir užuominų tekstai - naudotojo patvirtinti 2026-10-04 (inventorius docs/salygos/
   formos-lauku-inventorius.md, 3 sk.). Laukų užrašai (priedų pavadinimai, šablono nurodymai) - iš paties
   šablono. Teisinių teiginių čia nėra: nuorodos į įstatymus - tik per GP_TEISE pačiame modulyje.
   Neprivalomos nuorodos - tik skliaustuose esanti nuoroda į SPS priedą („(SPS ___ priedas)“, „(SPS X
   priedas)“, „(Annex ___ to SPC)“): palikus be numerio, ji pašalinama visa (naudotojo sprendimas
   2026-10-04), ir tai rodoma peržiūroje bei baigtumo patikroje.

   Be lookbehind ir be \w / \b greta lietuviškų raidžių (CLAUDE.md 5 sk.).
   ========================================================================== */
(function (root) {
  'use strict';

  /* Vietos reikšmė „pašalinti“ (ne tekstas): planas() vietą su tarpu prieš ją pašalina, patikra tai parodo. */
  const SALINTI = '⟦SALINTI⟧';
  const norm = s => String(s || '').toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[čć]/g, 'c').replace(/[ęėé]/g, 'e').replace(/[įí]/g, 'i')
    .replace(/š/g, 's').replace(/[ųūú]/g, 'u').replace(/ž/g, 'z')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------- Pildomos vietos tekste -------------------------------------------------------------
     „___“ (brūkšniai) ir „[nurodymas]“, kaip variklio GPGen.vietos. Pabraukimas interneto adreso
     viduje (AKV SPS: „draudejai.sodra.lt/draudeju_viesi_duomenys/“) - ne vieta: iki 2026-10-04 jis
     buvo klausiamas kaip du laukai, o įrašius reikšmę adresas būtų sugadintas.
     „X [nurodyti datą ...]“ (DPS galiojimas) - viena vieta su „X“. */
  const BLANK_RE = /_+|\[[^\]]{4,}\]/g;
  const URL_RE = /(https?:\/\/|www\.)[^\s„“"<>]+/gi;
  function urlSritys(t){
    const out = []; let m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(t))) out.push([m.index, m.index + m[0].length]);
    return out;
  }
  function tusciosVietos(t){
    t = String(t || '');
    const u = urlSritys(t), out = []; let m;
    BLANK_RE.lastIndex = 0;
    while ((m = BLANK_RE.exec(t))){
      let s = m.index; const e = s + m[0].length;
      if (u.some(([a, b]) => s >= a && e <= b)) continue;
      if (m[0][0] === '['){                                            // „X [nurodyti datą ...]“ - „X“ priklauso vietai
        const mx = t.slice(Math.max(0, s - 4), s).match(/(^|[\s(])([Xx])\s+$/);
        if (mx) s -= mx[0].length - mx[1].length;
      }
      const pr = out[out.length - 1];
      if (pr && pr.end === s){ pr.end = e; pr.zyma = t.slice(pr.start, e); continue; }   // „[nurodymas]____“ - viena vieta
      out.push({ start: s, end: e, zyma: t.slice(s, e), rusis: m[0][0] === '_' ? 'bruksnys' : 'nurodymas' });
    }
    return out;
  }

  /* „X“ vietoj numerio ar sumos. Tik rengėjo dokumentuose (tiekėjo formos paliekamos kaip šablone).
     Grupė „SPS 2 lentelės X, X, X ir X punktų“ - viena vieta (punktų numeriai įrašomi vienu tekstu). */
  const X_SABLONAI = [
    { rusis: 'lenteles-punktai', re: /(lentelės\s+)(X(?:(?:,\s*|\s+ir(?:\/ar)?\s+)X)*)(?=\s+punkt)/g },
    { rusis: 'lenteles-punktai', re: /(Clause\s+)([Xx])(?=\s+of\s+Table)/g },
    { rusis: 'priedas', re: /((?:SPS|KPS)\s+)([Xx])(?=\s+pried)/g },
    { rusis: 'priedas', re: /(pried(?:ą|as|o|e)\s+Nr\.\s*)([Xx])(?=[\s.,;:)]|$)/g },
    { rusis: 'priedas', re: /(Annex\s+(?:[Nn]o\.\s*)?)([Xx])(?=[\s.,;:)“”"]|$)/g },
    { rusis: 'suma', re: /(^|[\s(–-])([Xx])(?=\s+(?:Eur|EUR)(?:[\s.,;:)]|$))/g },
    { rusis: 'sutarties-punktas', re: /(projekto\s+)([Xx])(?=\s+punkte)/g },
    { rusis: 'sutarties-punktas', re: /(clause\s+)([Xx])(?=\s*\/\s*Annex)/g }
  ];
  function xVietos(t){
    t = String(t || '');
    const out = [];
    X_SABLONAI.forEach(s => {
      s.re.lastIndex = 0; let m;
      while ((m = s.re.exec(t))){
        const start = m.index + m[1].length, end = start + m[2].length;
        if (out.some(v => start < v.end && end > v.start)) continue;
        out.push({ start, end, zyma: m[2], rusis: 'x', xRusis: s.rusis });
      }
    });
    return out.sort((a, b) => a.start - b.start);
  }

  /* ---------- Priedai: SPS priedų sąrašas ir nuorodos į jį ---------------------------------------- */
  const PRIEDU_RAKTAI = [
    { raktas: 'sandoris',        lt: /sandorio šalies/iu,                                en: /counterparty/i },
    { raktas: 'nacsaug',         lt: /nacionalinio saugumo/iu,                           en: /national security/i },
    { raktas: 'konfidencialumas', lt: /konfidencialumo įsipareigojim/iu,                 en: /confidentiality (obligation|liability|commitment)|commitment of confidentiality/i },
    { raktas: 'konfinfo',        lt: /konfidenciali\p{L}* informacij/iu,                 en: /confidential information/i },
    { raktas: 'derybos',         lt: /derėtinų sąlygų|deryboms/iu,                       en: /negotiat/i },
    { raktas: 'irangos',         lt: /įrangos sąraš/iu,                                  en: /list of equipment|equipment list/i },
    { raktas: 'valdymas',        lt: /valdymo ar priežiūros organ/iu,                    en: /management or supervisory bod/i },
    { raktas: 'metodika',        lt: /vertinimo metodik/iu,                              en: /methodology/i },
    { raktas: 'sutartys',        lt: /sutarčių sąraš/iu,                                 en: /list of contracts/i },
    { raktas: 'specialistai',    lt: /specialistų sąraš/iu,                              en: /list of specialists|specialist list/i },
    { raktas: 'subtiekejai',     lt: /pajėgumais remiamasi|subtiekėj|priedėl/iu,         en: /sub-supplier|economic entit|quasi|appendix/i },
    { raktas: 'paraiska',        lt: /paraiškos forma/iu,                                en: /application form/i },
    { raktas: 'ebvpd',           lt: /EBVPD|Europos bendr\p{L}* viešųjų pirkimų dokument/iu, en: /ESPD|European Single Procurement Document/i },
    { raktas: 'pasiulymas',      lt: /pasiūlymo forma/iu,                                en: /tender form/i },
    { raktas: 'ts',              lt: /techninė specifikacija/iu,                         en: /technical specification/i },
    { raktas: 'sutartis',        lt: /sutarties projektas/iu,                            en: /draft contract/i },
    { raktas: 'bankai',          lt: /priimtinų bankų/iu,                                en: /eligible banks/i }
  ];
  const PRIEDO_EIL_RE = /^\s*(\d+)\s*priedas\s*(?:[–-]\s*)?(.+)$/iu;
  const priedoRaktasIsTeksto = (t, kalba) => {
    const r = PRIEDU_RAKTAI.find(p => (kalba === 'en' ? p.en : p.lt).test(t));
    return r ? r.raktas : null;
  };
  /* Sąrašas iš žemėlapio pastraipų: [{ nr, tekstas, raktas, i }] (lietuviškos eilutės). */
  function prieduSarasas(paras){
    const out = [];
    Object.keys(paras || {}).map(Number).sort((a, b) => a - b).forEach(i => {
      const t = String(paras[i] || paras[String(i)] || '').trim();
      const m = t.match(PRIEDO_EIL_RE);
      if (!m) return;
      if (/^\d+\s*priedo\s/iu.test(t)) return;                     // „1 priedo 1 lentelė ...“ - ne sąrašo eilutė
      out.push({ nr: m[1], tekstas: t, raktas: priedoRaktasIsTeksto(m[2], 'lt'), i });
    });
    return out;
  }
  /* Sakiniai be santrumpų lūžių („Nr. X“, „str. 2 d.“ - ne sakinio galas). */
  const sakiniai = t => String(t || '').replace(/(^|[\s(])(Nr|str|d|p|psl|No|no|t\. y)\.\s/g, '$1$2§ ')
    .split(/[.;](?:\s+|$)/).map(x => x.replace(/§/g, '.'));
  /* Kuriam priedui priklauso nuoroda vietoje v (tekstas t). null - nežinoma (numeris nesiūlomas). */
  function nuorodosPriedas(t, v, ankstesnis){
    const pries = t.slice(Math.max(0, v.start - 160), v.start), po = t.slice(v.end, v.end + 160);
    const en = !/[ąčęėįšųūž]/i.test(t) && /\b(the|and|of|to|shall|annex)\b/i.test(t);
    // (1) „(SPS ___ priedas)“: kuriam dokumentui skliaustai - pagal žodį prieš juos
    if (/\(\s*(SPS\s*)?$/.test(pries) || /\(\s*Annex\s*$/i.test(pries)){
      const p = pries.replace(/\(\s*(SPS|Annex)?\s*$/i, '').trim();
      if (/(EBVPD|ESPD)\)?$/i.test(p)) return 'ebvpd';
      if (/paraišk\p{L}*(\s+su\s+priedais)?$/iu.test(p) || /application(\s+with\s+annexes)?$/i.test(p)) return 'paraiska';
      if (/pasiūlym\p{L}*(\s+su\s+priedais)?$/iu.test(p) || /tender(\s+with\s+annexes)?$/i.test(p)) return 'pasiulymas';
    }
    // (2) Pavadinimas kabutėse iškart po nuorodos: „SPS x priedą „Konfidenciali informacija““, „Annex X “Counterparty ...”“
    const kab = po.match(/^\s*(?:pried\p{L}*|to the SPC|of the SPC)?\s*[„“"]([^“”"]{4,80})/iu);
    if (kab){ const r = priedoRaktasIsTeksto(kab[1], en ? 'en' : 'lt'); if (r) return r; }
    // (2a) „SPS X priedo lentelės ...“ - to paties priedo dalis, kuris minėtas anksčiau pastraipoje
    if (ankstesnis && /^\s*pried\p{L}*\s+(lentel|pozicij)/iu.test(po)) return ankstesnis;
    // (3) Artimiausias raktinis žodis tame pačiame sakinyje: prieš nuorodą (iki 90 ženklų), tada po jos (iki 140)
    const sakPo = (sakiniai(po)[0] || '').slice(0, 140), sp = sakiniai(pries);
    let sakPries = sp.pop() || '';
    if (/^[\s(]*(SPS|KPS|Annex)?[\s(]*$/i.test(sakPries)) sakPries = (sp.pop() || '') + ' ' + sakPries;   // „... CPP IS. (Annex X of SPC)“
    sakPries = sakPries.slice(-90);
    const artimiausias = (s, nuoGalo) => {
      let geriausias = null, at = Infinity;
      PRIEDU_RAKTAI.forEach(p => {
        const re = new RegExp((en ? p.en : p.lt).source, (en ? p.en : p.lt).flags.replace('g', '') + 'g');
        let m;
        while ((m = re.exec(s))){
          const d = nuoGalo ? s.length - m.index : m.index;
          if (d < at){ at = d; geriausias = p.raktas; }
          if (!m[0].length) break;
        }
      });
      return geriausias;
    };
    return artimiausias(sakPries, true) || artimiausias(sakPo, false) || ankstesnis || null;
  }

  /* ---------- Neprivaloma nuoroda (klasė b) -----------------------------------------------------
     Tik skliaustuose esanti nuoroda į SPS priedą. Šalinama visa su tarpu prieš ją. */
  function neprivalomosSritis(t, v){
    const ZODIS = '(?:' + v.zyma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')';
    const sablonai = [
      new RegExp('\\(\\s*(?:SPS|KPS)\\s*' + ZODIS + '\\s*pried\\p{L}*\\s*\\)', 'gu'),
      new RegExp('\\(\\s*SPS\\s+pried\\p{L}*\\s+Nr\\.\\s*' + ZODIS + '\\s*\\)', 'gu'),
      new RegExp('\\(\\s*Annex\\s+(?:[Nn]o\\.\\s*)?' + ZODIS + '\\s+(?:to|of)\\s+(?:the\\s+)?SP[CS]\\.?\\s*\\)', 'g')
    ];
    for (const re of sablonai){
      let m;
      while ((m = re.exec(t))){
        if (m.index <= v.start && m.index + m[0].length >= v.end){
          let s = m.index;
          if (s > 0 && /[  ]/.test(t[s - 1])) s--;
          return { start: s, end: m.index + m[0].length };
        }
      }
    }
    return null;
  }

  /* ---------- Sakinių tipai: klausimas, užuomina, kiekvienos vietos įvestis --------------------- */
  const PRIEDU_PAV = { pasiulymas: 'Pasiūlymo forma', paraiska: 'Paraiškos forma', ebvpd: 'EBVPD forma', nacsaug: 'Nacionalinio saugumo reikalavimų atitikties deklaracija',
    konfidencialumas: 'Konfidencialumo įsipareigojimas', konfinfo: 'Konfidenciali informacija', sandoris: 'Sandorio šalies ir (ar) subtiekėjo duomenų forma',
    subtiekejai: 'Informacija apie ūkio subjektus, kurių pajėgumais remiamasi, subtiekėjus ir kvazisubtiekėjus', derybos: 'Tiekėjo pasiūlymų dėl derėtinų sąlygų forma',
    irangos: 'Įrangos sąrašas', valdymas: 'Informacija apie valdymo ar priežiūros organus', metodika: 'Ekonomiškai naudingiausio pasiūlymo vertinimo metodika',
    sutartys: 'Sutarčių sąrašo forma', specialistai: 'Specialistų sąrašo forma', ts: 'Techninė specifikacija', sutartis: 'Sutarties projektas', bankai: 'Priimtinų bankų sąrašas' };
  const EN_MENESIAI = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* 8.1 p. kriterijų sąrašas ir metodikos sakinys - šablono tekstas (LT ir LT/EN SPS). Kodai bendri abiem kalboms. */
  const KRITERIJAI_LT = { sarasas: 'kainos ir kokybės santykį / sąnaudų ir kokybės santykį / sąnaudas / kainą',
    variantai: { kks: 'kainos ir kokybės santykį', sks: 'sąnaudų ir kokybės santykį', sanaudos: 'sąnaudas', kaina: 'kainą' },
    sakinys: /Pasiūlymų vertinimo kriterijai ir ekonominio naudingumo vertinimo metodika pateikiama/ };
  const KRITERIJAI_EN = { sarasas: 'price/quality ratio / cost and quality ratio / cost / price',
    variantai: { kks: 'price/quality ratio', sks: 'cost and quality ratio', sanaudos: 'cost', kaina: 'price' },
    sakinys: /The Tender evaluation criteria and cost-effectiveness evaluation methodology are provided/ };
  // Formos pasirinkimų tvarka ir užrašai - šablono žodžiai
  const KRITERIJU_PASIRINKIMAI = [['kks', 'Kainos ir kokybės santykį'], ['sks', 'Sąnaudų ir kokybės santykį'], ['sanaudos', 'Sąnaudas'], ['kaina', 'Kainą']];

  /* Vietos įvesties aprašas pagal sakinio tipą. Laukas be tipo (nauja šablono vieta) - klaida, ne „reikšmė N“:
     testai tikrina, kad visose 24 konfigūracijose kiekviena vieta turi tipą ir užrašą. */
  const priedoVieta = (raktas) => ({ ivestis: 'priedo-nr', uzrasas: PRIEDU_PAV[raktas] ? PRIEDU_PAV[raktas] + ' - SPS priedo Nr.' : 'SPS priedo Nr.', pvz: '3', priedas: raktas || null });
  const TIPAI = [
    { id: 'pavadinimas', auto: true, re: /irasomas pirkimo objekto pavadinim|^(\d+ )*pirkimo objektas( pirkimo objekto pavadinimas)?$|^the object of procurement( the title of the object of procurement)?$|title of the object of procurement/,
      klausimas: '', uzuomina: '', vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Pirkimo pavadinimas (iš 1 žingsnio)' })) },
    { id: 'cpo-pagrindimas', formuluote: true, re: /centralizuotu pirkimu katalogu pagrindimas|centralized procurement directory/,
      klausimas: 'Kodėl pirkimas vykdomas ne per CPO LT katalogą?', uzuomina: '', vietos: vs => vs.map(() => ({ ivestis: 'tekstas-ilgas', uzrasas: 'Pagrindimas' })) },
    { id: 'esminiu-salygu-dalis', re: /esmines sutarties salygos isdestytos sps|terms of the contract are laid down|conditions of the contract are established/,
      klausimas: 'Kurioje SPS dalyje išdėstytos esminės sutarties sąlygos?',
      uzuomina: 'Įrašykite SPS dalies numerį. Tas pats numeris įrašomas abiejose sakinio vietose.',
      vietos: vs => vs.map((v, k) => k === 0 ? { ivestis: 'skyrius', uzrasas: 'SPS dalies numeris', pvz: '12', skyrius: 'ESMINĖS SUTARTIES SĄLYGOS' } : { kopija: 0, uzrasas: '' }) },
    { id: 'teise-verstis-veikla', re: /tiekejas turi teise/,
      klausimas: 'Kokią teisę verstis veikla turi turėti tiekėjas?',
      uzuomina: 'Tekstas įrašomas į sakinį „Tiekėjas turi teisę ...“ (kvalifikacijos reikalavimų lentelė).',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Teisė verstis veikla' })) },
    { id: 'pateikiami-dokumentai', re: /^pateikiam(a|os)/,
      klausimas: 'Kokius dokumentus tiekėjas turi pateikti šiam reikalavimui pagrįsti?',
      uzuomina: 'Tekstas įrašomas po „PATEIKIAMA:“ (kvalifikacijos reikalavimų lentelė).',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas-ilgas', uzrasas: 'Pateikiami dokumentai' })) },
    // 8.1 p. (naudotojo sprendimas 2026-10-04, 5 klausimo A variantas): kriterijus pasirenkamas iš paties šablono sąrašo
    // („kainos ir kokybės santykį / sąnaudų ir kokybės santykį / sąnaudas / kainą“ - lieka tik pasirinktasis); kainos atveju
    // metodikos priedo nėra, todėl sakinys „... metodika pateikiama SPS priede Nr.__.“ pašalinamas.
    { id: 'metodikos-priedas', kriterijus: true, re: /metodika pateikiama sps|methodology are provided in annex/,
      klausimas: 'Pagal kokį kriterijų vertinami pasiūlymai?',
      uzuomina: 'Pasirinkite vieną iš šablono 8.1 punkto kriterijų - kiti iš sakinio ištrinami. Pagal kriterijų parenkamas ir metodikos priedas bei pasiūlymo galiojimo užtikrinimo variantas.',
      // šablone be kriterijų sąrašo - tik priedo numeris, kaip iki tol
      klausimasBe: 'Kuriame SPS priede pateikta ekonominio naudingumo vertinimo metodika?', uzuominaBe: 'Įrašykite priedo numerį iš SPS priedų sąrašo.',
      vietos: vs => vs.map(() => priedoVieta('metodika')),
      pakeitimai: (t, anglu) => {
        const K = anglu ? KRITERIJAI_EN : KRITERIJAI_LT, out = [];
        const i = t.indexOf(K.sarasas);
        if (i < 0) return out;
        out.push({ start: i, end: i + K.sarasas.length, ivestis: 'kriterijus', uzrasas: 'Vertinimo kriterijus', variantai: K.variantai });
        const j = t.search(K.sakinys);
        if (j > i) out.push({ start: j, end: t.length, ivestis: 'salinamas', uzrasas: '', kopijaIvestis: 'kriterijus',
          variantai: { kaina: '', sanaudos: null, kks: null, sks: null } });
        return out;
      } },
    { id: 'daliu-skaicius', re: /skaidomas i .*dali|divided into .*parts|subdivided into/,
      klausimas: 'Į kiek dalių skaidomas pirkimo objektas?',
      uzuomina: 'Šablone yra 2 dalių eilutės; daugiau dalių sukuriama automatiškai.',
      vietos: vs => vs.map(() => ({ ivestis: 'skaicius', uzrasas: 'Dalių skaičius', pvz: '3' })) },
    { id: 'dalies-pavadinimas', re: /^(i{1,3}|iv|v|vi) pirkimo objekto dalis|^part (i{1,3}|iv|v|vi) of the object of procurement|^(i{1,3}|iv|v|vi) procurement object part/,
      klausimas: 'Pirkimo objekto dalies pavadinimas', uzuomina: '',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Dalies pavadinimas' })) },
    { id: 'formos-ir-ebvpd-priedai', re: /sps\s*priedas.*(europos bendraji|ebvpd)|europos bendraji viesuju pirkimu dokumenta|european single procurement document|hereinafter (referred to as )?espd/,
      klausimas: 'Kuris SPS priedas yra pasiūlymo (paraiškos) forma ir kuris - EBVPD forma?',
      uzuomina: 'Numeriai iš SPS priedų sąrašo. Palikus tuščią, nuoroda „(SPS ___ priedas)“ bus pašalinta.',
      vietos: (vs, t) => { let ank = null; return vs.map(v => { const r = nuorodosPriedas(t, v, ank) || ank; ank = r; return priedoVieta(r); }); } },
    { id: 'laimetoju-skaicius', re: /laimejusiais pasiulymais bus pripazinti|tenders will be recogni/,
      klausimas: 'Kiek pasiūlymų bus pripažinta laimėjusiais?',
      uzuomina: 'Taikoma, kai siekiama sudaryti preliminariąją sutartį.',
      vietos: vs => vs.map((v, k) => k === 0 ? { ivestis: 'skaicius', uzrasas: 'Pasiūlymų skaičius', pvz: '3' } : { ivestis: 'tekstas', uzrasas: 'Skaičius žodžiais', zodziais: 0 }) },
    { id: 'stebetojai', re: /stebetojo teisemis|as observers/,
      klausimas: 'Kokių institucijų ar įstaigų atstovai kviečiami dalyvauti stebėtojo teisėmis?', uzuomina: '',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Institucijos ar įstaigos' })) },
    { id: 'apziura-en', re: /^the object of the procurement will be inspected/,
      klausimas: 'Objekto apžiūra (angliškas tekstas): iki kada kreiptis ir kada planuojama apžiūra?',
      uzuomina: 'Lietuviškame sakinyje tos pačios datos yra pavyzdinės (raudonos) - jas pakeiskite Word\'e.',
      vietos: vs => vs.map((v, k) => [
        { ivestis: 'skaicius', uzrasas: 'Kreiptis iki (valanda, p.m.)', pvz: '3' },
        { ivestis: 'skaicius', uzrasas: 'Kreiptis iki (diena)', pvz: '15' },
        { ivestis: 'menuo-en', uzrasas: 'Kreiptis iki (mėnuo)' },
        { ivestis: 'skaicius', uzrasas: 'Apžiūra (diena)', pvz: '20' },
        { ivestis: 'menuo-en', uzrasas: 'Apžiūra (mėnuo)' }][k] || { ivestis: 'tekstas', uzrasas: 'Reikšmė ' + (k + 1) }) },
    { id: 'derybu-dalykas', re: /derasi del( |$)/,
      klausimas: 'Dėl ko perkantysis subjektas derasi?', uzuomina: '',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Derybų dalykas' })) },
    { id: 'min-reikalavimai', re: /minimalus reikalavimai pirkimo objektui|minimum requirements set by/,
      klausimas: 'Kokie minimalūs reikalavimai pirkimo objektui?',
      uzuomina: 'Šablono nurodymas: jei deramasi tik dėl kainos, rašoma „Techninėje specifikacijoje ir Sutarties projekte nustatyti reikalavimai“.',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Minimalūs reikalavimai' })) },
    { id: 'derybu-salygos', re: /deresis del siu salygu|will negotiate the following conditions/,
      klausimas: 'Dėl kokių sąlygų bus deramasi?',
      uzuomina: 'Seka 1 žingsnio atsakymą „Dėl ko bus deramasi?“.',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Derėtinos sąlygos' })) },
    { id: 'dps-konkretaus-pavadinimas', re: /konkretaus pirkimo .*(pavadinimas|proceduras)|procedures of the specific procurement/,
      klausimas: 'Konkretaus pirkimo pavadinimas',
      uzuomina: 'Gali būti imamas iš 1 žingsnio pirkimo pavadinimo.',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Konkretaus pirkimo pavadinimas' })) },
    { id: 'dps-galiojimas', re: /konkretus pasiulymai turi galioti/,
      klausimas: 'Kiek kalendorinių dienų turi galioti konkretūs pasiūlymai?', uzuomina: '',
      vietos: vs => vs.map(() => ({ ivestis: 'skaicius', uzrasas: 'Kalendorinių dienų skaičius', pvz: '90' })) },
    { id: 'dps-priedu-nuorodos', re: /yra pateikti siuose prieduose/,
      klausimas: 'Kuriuose konkretaus pirkimo sąlygų prieduose aprašytas pirkimo objektas?', uzuomina: '',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas', uzrasas: 'Nuorodos į priedus' })) },
    // Klausimas „Taip / Ne“ (naudotojo patvirtintas 2026-10-04): „Taip“ - nurodymas „[arba ...]“ pašalinamas (SALINTI),
    // „Ne“ - įrašomi vertinimo kriterijai ir tvarka.
    { id: 'dps-kriterijai', taipNe: true, re: /isrenka pagal kainos kriteriju|according to the price criterion/,
      // „Ne“ (naudotojo sprendimas 2026-10-04): „kainos kriterijų [arba ...]“ -> nuoroda į papildomą priedą (numeris - kodas „priedas:N“)
      pakeitimai: (t, anglu) => {
        const pr = anglu ? 'the price criterion' : 'kainos kriterijų', i = t.indexOf(pr), j = i < 0 ? -1 : t.indexOf(']', i);
        if (i < 0 || j < 0) return [];
        return [{ start: i, end: j + 1, ivestis: 'dps-priedas', uzrasas: 'Nuoroda į vertinimo kriterijų priedą', variantai: kodas => {
          const m = /^priedas:(\d+)$/.exec(kodas || '');
          if (!m) return null;
          return anglu ? 'the evaluation criteria and procedure set out in Annex ' + m[1] + ' to these conditions'
            : 'pasiūlymų vertinimo kriterijus ir tvarką, nurodytus šio konkretaus pirkimo sąlygų ' + m[1] + ' priede';
        } }];
      },
      klausimas: 'Ar vertinama tik pagal kainą?',
      uzuomina: 'Atsakius „Taip“, šablono nurodymas „[arba ...]“ pašalinamas. Atsakius „Ne“, įrašykite vertinimo kriterijus ir tvarką.',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas-ilgas', uzrasas: 'Vertinimo kriterijai ir tvarka' })) },
    { id: 'dps-apziura', re: /suteiks galimybe apziureti pirkimo objekta|wishing to inspect the object must/,
      klausimas: 'Objekto apžiūra: iki kada kreiptis ir kada planuojama apžiūra?', uzuomina: '',
      vietos: vs => vs.map((v, k) => [
        { ivestis: 'tekstas', uzrasas: 'Kreiptis iki (mėnuo ir diena)', pvz: 'spalio 15' },
        { ivestis: 'skaicius', uzrasas: 'Kreiptis iki (valanda)', pvz: '10' },
        { ivestis: 'tekstas', uzrasas: 'Apžiūra (mėnuo ir diena)', pvz: 'spalio 20' }][k] || { ivestis: 'tekstas', uzrasas: 'Reikšmė ' + (k + 1) }),
      vietosEn: vs => vs.map((v, k) => [
        { ivestis: 'skaicius', uzrasas: 'Kreiptis iki (valanda)', pvz: '10' },
        { ivestis: 'tekstas', uzrasas: 'Kreiptis iki (mėnuo ir diena, angliškai)', pvz: 'October 15' },
        { ivestis: 'tekstas', uzrasas: 'Apžiūra (mėnuo ir diena, angliškai)', pvz: 'October 20' }][k] || { ivestis: 'tekstas', uzrasas: 'Reikšmė ' + (k + 1) }) },
    { id: 'dps-kiti-dokumentai', re: /^kiti dokumentai/,
      klausimas: 'Kokie kiti dokumentai teikiami su konkrečiu pasiūlymu?', uzuomina: '',
      vietos: vs => vs.map(() => ({ ivestis: 'tekstas-ilgas', uzrasas: 'Kiti dokumentai' })) }
  ];

  /* Vietos be sakinio tipo: „X“ ir laužtiniai šablono nurodymai - užrašas iš paties šablono. */
  function xVietosAprasas(t, v, ankstesnis){
    if (v.xRusis === 'priedas'){ const r = nuorodosPriedas(t, v, ankstesnis); return priedoVieta(r); }
    if (v.xRusis === 'suma') return { ivestis: 'suma', uzrasas: /užtikrinim|security/i.test(t) ? 'Sutarties įvykdymo užtikrinimo dydis, Eur' : 'Suma, Eur', pvz: '50 000' };
    if (v.xRusis === 'sutarties-punktas') return { ivestis: 'tekstas', uzrasas: 'Sutarties projekto punktas arba priedas', pvz: '8.1' };
    if (v.xRusis === 'lenteles-punktai'){
      const lent = (t.slice(Math.max(0, v.start - 40), v.start).match(/(\d+)\s*lentelės\s*$/u) || t.slice(v.end, v.end + 30).match(/of\s+Table\s+(\d+)/i) || [])[1];
      return { ivestis: 'tekstas', uzrasas: (lent ? 'SPS ' + lent + ' lentelės' : 'SPS lentelės') + ' punktų numeriai', pvz: '1.3, 1.4' };
    }
    return null;
  }
  const nurodymoZyma = z => { const s = String(z || '').replace(/^\[|\]$/g, '').replace(/^X\s+\[/, '').trim(); return s ? s.charAt(0).toLocaleUpperCase('lt') + s.slice(1) : ''; };

  /* Visa pastraipos pildymo struktūra: sakinio tipas ir vietos su įvestimi, klase (a / b / c) ir priedu.
     opts.x - ar ieškoti „X“ (rengėjo dokumentai). */
  function laukas(tekstas, opts){
    const t = String(tekstas || '');
    const nt = norm(t);
    const tipas = TIPAI.find(x => x.re.test(nt)) || null;
    const anglu = !/[ąčęėįšųūž]/i.test(t) && /\b(the|and|of|shall|must)\b/i.test(t);
    // pakeitimų vietos: šablono teksto atkarpa, kurią pakeičia ar pašalina žmogaus atsakymas (kodas, ne tekstas)
    const pk = tipas && tipas.pakeitimai ? tipas.pakeitimai(t, anglu).map(v => Object.assign({ rusis: 'pakeitimas', pakeitimas: true, zyma: t.slice(v.start, v.end) }, v)) : [];
    const vs = tusciosVietos(t).concat(opts && opts.x ? xVietos(t) : []).concat(pk).sort((a, b) => a.start - b.start);
    const aprasai = tipas ? ((anglu && tipas.vietosEn) || tipas.vietos)(vs.filter(v => v.rusis !== 'x' && v.rusis !== 'pakeitimas'), t) : [];
    let bi = 0, ank = null;
    const vietos = vs.map(v => {
      let a = null;
      if (v.rusis === 'pakeitimas') a = {};
      else if (v.rusis === 'x') a = xVietosAprasas(t, v, ank);
      else { a = aprasai[bi++] || null; if (!a && v.rusis === 'nurodymas') a = { ivestis: 'tekstas', uzrasas: nurodymoZyma(v.zyma), nurodymas: true }; }
      if (a && a.priedas) ank = a.priedas;
      const sritis = v.rusis === 'pakeitimas' ? null : neprivalomosSritis(t, v);
      return Object.assign({}, v, a || {}, { aprasyta: !!a, klase: sritis ? 'b' : (a && (a.ivestis === 'priedo-nr' || a.ivestis === 'skyrius') ? 'a' : 'c'), salinti: sritis });
    });
    vietos.forEach(v => { if (v.kopijaIvestis){ const j = vietos.findIndex(x => x.ivestis === v.kopijaIvestis); if (j >= 0) v.kopija = j; } });
    const be = tipas && tipas.kriterijus && !vietos.some(v => v.ivestis === 'kriterijus');
    return { tekstas: t, tipas: tipas ? tipas.id : (vs.some(v => v.rusis === 'x') ? 'x' : null),
      klausimas: tipas ? (be ? tipas.klausimasBe : tipas.klausimas) : xKlausimas(nt, vietos), uzuomina: tipas ? (be ? tipas.uzuominaBe : tipas.uzuomina) : '', vietos };
  }
  /* „X“ vietų sakinio klausimas (naudotojo patvirtintas 2026-10-04); kitiems - struktūrinis klausimas modulyje. */
  const xKlausimas = (nt, vietos) => vietos.some(v => v.xRusis === 'suma') && /sutarties ivykdymo uztikrinim|contract performance security/.test(nt)
    ? 'Koks sutarties įvykdymo užtikrinimo dydis (Eur)?' : '';

  /* ---------- Alternatyvų grupių klausimai (naudotojo patvirtinti 2026-10-04) ----------------------
     Grupė atpažįstama pagal VISŲ narių (šablono sąlygų) tekstą; kitoms grupėms modulis klausia struktūriškai
     („Kuris variantas atitinka šį pirkimą?“). Pašalinimo pagrindų ir kvalifikacijos grupė klausiama dviem
     klausimais (kas tikrinama ir iš ko) - narys parenkamas pagal abu atsakymus (`tikrinimoVariantas`). */
  const GRUPES = [
    { id: 'dalys', re: /^jei pirkimo objektas (i dalis neskaidomas|skaidomas i dalis)/, klausimas: 'Ar pirkimo objektas skaidomas į dalis?' },
    { id: 'stebetojai', re: /^jei (ne)?numatoma kviesti stebetoj/, klausimas: 'Ar į komisijos posėdžius kviečiami stebėtojai?' },
    { id: 'zalieji', re: /^jei zalieji reikalavimai nurod/, klausimas: 'Kur nustatomi žalieji reikalavimai?' },
    { id: 'uztikrinimas', re: /^jei (ne)?taikomas pasiulymo galiojimo uztikrinimas/, klausimas: 'Ar taikomas pasiūlymo galiojimo užtikrinimas?' },
    { id: 'tikrinimas', re: /pasalinimo pagrind/, klausimas: 'Ar tikrinate tik pašalinimo pagrindus ar ir kvalifikaciją?',
      klausimas2: 'Tik galimo laimėtojo ar visų tiekėjų tikriname?' }
  ];
  function grupesKlausimas(nariai){
    const ts = (nariai || []).map(n => norm(n && n.tekstas != null ? n.tekstas : n));
    return (ts.length && GRUPES.find(g => ts.every(t => g.re.test(t)))) || null;
  }
  /* Pašalinimo pagrindų ir kvalifikacijos varianto prasmė pagal šablono sąlygą: kas - 'pasalinimo' (tik pašalinimo
     pagrindai) arba 'abu'; kieno - 'laimetojas' (galimo laimėtojo) arba 'visi'. Šablonuose kvalifikacijos netikrinimas
     pasakomas trimis būdais: „netikrinama kvalifikacija“, „kvalifikacija netikrinama“, „kvalifikacija nėra tikrinama“
     (MVP LT/EN; iki 2026-10-04 lentelių taisyklė trečiojo neatpažino ir palikdavo kvalifikacijos lentelę). */
  /* Pasiūlymo galiojimo užtikrinimo varianto prasmė: 'taikomas', o netaikomas - pagal vertinimo kriterijų: 'kaina' („perkame pagal
     kainą ar sąnaudas“) arba 'kokybe' („... kainos (ar sąnaudų) ir kokybės santykį“). Kriterijaus kodas -> variantas: kaina, sąnaudos - 'kaina'. */
  function uztikrinimoVariantas(tekstas){
    const t = norm(tekstas);
    if (/^jei taikomas pasiulymo galiojimo uztikrinimas/.test(t)) return 'taikomas';
    if (!/^jei netaikomas pasiulymo galiojimo uztikrinimas/.test(t)) return null;
    return /kokybes santyki/.test(t) ? 'kokybe' : /kaina ar sanaudas$/.test(t) ? 'kaina' : null;
  }
  const UZT_PAGAL_KRITERIJU = { kaina: 'kaina', sanaudos: 'kaina', kks: 'kokybe', sks: 'kokybe' };
  function tikrinimoVariantas(tekstas){
    const t = norm(tekstas);
    if (!/pasalinimo pagrind/.test(t)) return null;
    return { kas: /netikrinama kvalifikacija|kvalifikacija (nera |ne)tikrinama/.test(t) || !/kvalifikacij/.test(t) ? 'pasalinimo' : 'abu',
      kieno: /\bvisu\b/.test(t) ? 'visi' : /laimejusio|laimetojo/.test(t) ? 'laimetojas' : null };
  }

  /* ---------- Pildymo planas: viena funkcija ir peržiūrai, ir dokumentui -------------------------
     reiksmes[k] - k-osios vietos reikšmė (tuščia - vieta lieka su žyma; klasė b - nuoroda šalinama).
     Grąžina segmentus: { t:'tekstas'|'reiksme'|'tuscia'|'salinama', s, k }. Apsaugos - kaip GPGen.pildyti:
     tarpas, kai vieta prilipusi prie žodžio; antras taškas nerašomas. */
  function planas(tekstas, vietos, reiksmes, opts){
    const t = String(tekstas || ''), out = [];
    const bruks = (opts && opts.bruksniai) || (s => s);
    let p = 0;
    (vietos || []).forEach((v, k) => {
      const raw = String((reiksmes || [])[k] == null ? '' : reiksmes[k]).trim();
      // Pakeitimo vieta: reikšmė - kodas; null (nėra kodo ar variantas paliekamas) - šablono tekstas lieka, vieta praleidžiama;
      // '' - atkarpa pašalinama su tarpu prieš ją; tekstas - įrašomas vietoj atkarpos
      if (v.pakeitimas){
        const rep = !raw ? null : (typeof v.variantai === 'function' ? v.variantai(raw) : (v.variantai || {})[raw]);
        if (rep == null || v.start < p) return;
        let s = v.start;
        if (rep === '') while (s > p && /\s/.test(t[s - 1])) s--;
        if (s > p) out.push({ t: 'tekstas', s: t.slice(p, s) });
        out.push(rep === '' ? { t: 'salinama', s: t.slice(s, v.end), k, sprendimu: true } : { t: 'reiksme', s: bruks(rep), k });
        p = v.end;
        return;
      }
      // Vieta pašalinama pagal žmogaus atsakymą (pvz. „Vertinama tik pagal kainą“ - „[arba ...]“) kartu su tarpu prieš ją.
      if (raw === SALINTI){
        if (v.start < p) return;
        let s = v.start;
        while (s > p && /\s/.test(t[s - 1])) s--;
        if (s > p) out.push({ t: 'tekstas', s: t.slice(p, s) });
        out.push({ t: 'salinama', s: t.slice(s, v.end), k, sprendimu: true });
        p = v.end;
        return;
      }
      const val = raw ? bruks(raw) : '';
      if (!val && v.klase === 'b' && v.salinti){
        if (v.salinti.start < p) return;
        if (v.salinti.start > p) out.push({ t: 'tekstas', s: t.slice(p, v.salinti.start) });
        out.push({ t: 'salinama', s: t.slice(v.salinti.start, v.salinti.end), k });
        p = v.salinti.end;
        return;
      }
      if (v.start < p) return;                                          // vieta jau pašalintoje srityje
      if (v.start > p) out.push({ t: 'tekstas', s: t.slice(p, v.start) });
      if (val){
        let ins = val;
        if (v.start > 0 && /[\p{L}\p{N}]/u.test(t[v.start - 1]) && v.rusis !== 'x') ins = ' ' + ins;
        if (t[v.end] === '.' && /[^.]\.$/.test(ins)) ins = ins.slice(0, -1);
        out.push({ t: 'reiksme', s: ins, k });
      } else out.push({ t: 'tuscia', s: v.zyma, k });
      p = v.end;
    });
    if (p < t.length) out.push({ t: 'tekstas', s: t.slice(p) });
    return out;
  }
  const tekstasIsPlano = segs => segs.filter(s => s.t !== 'salinama').map(s => s.s).join('');
  /* Keitimai dokumentui: [{ start, end, tekstas }] pradiniame tekste. */
  function keitimai(tekstas, vietos, reiksmes, opts){
    const out = []; let p = 0;
    planas(tekstas, vietos, reiksmes, opts).forEach(s => {
      const ilgis = s.t === 'reiksme' ? null : s.s.length;
      if (s.t === 'tekstas'){ p += ilgis; return; }
      if (s.t === 'tuscia'){ p += ilgis; return; }
      if (s.t === 'salinama'){ out.push({ start: p, end: p + ilgis, tekstas: '', k: s.k, salinta: true, sprendimu: !!s.sprendimu }); p += ilgis; return; }
      const v = vietos[s.k];
      out.push({ start: v.start, end: v.end, tekstas: s.s, k: s.k });
      p = v.end;
    });
    return out;
  }

  /* ---------- Gramatinė patikra (testams ir saugikliui) ------------------------------------------ */
  function gramatika(pries, po){
    const kl = [];
    const dvigubi = s => (s.match(/[^\s] {2,}[^\s]/g) || []).length;
    if (/\(\s*\)/.test(po)) kl.push('tušti skliaustai');
    if (dvigubi(po) > dvigubi(pries)) kl.push('dvigubas tarpas');
    if (/\s[,.;:]/.test(po) && !/\s[,.;:]/.test(pries)) kl.push('tarpas prieš skyrybos ženklą');
    if (/\bSPS\s*[).,;]|\bSPS\s*$|\(\s*SPS\s+pried\p{L}*\s*\)/u.test(po)) kl.push('kabantis „SPS“');
    return kl;
  }

  /* ---------- Sutraukimas tik pilnų žodžių ribose ----------------------------------------------- */
  function sutrauk(tekstas, riba){
    const t = String(tekstas || '');
    if (!riba || t.length <= riba) return { trumpas: t, sutraukta: false };
    let i = t.lastIndexOf(' ', riba);
    if (i < riba * 0.6) i = t.indexOf(' ', riba);
    if (i < 0) return { trumpas: t, sutraukta: false };
    return { trumpas: t.slice(0, i).replace(/[\s,;:–-]+$/, ''), sutraukta: true };
  }

  /* ---------- Dokumento skyriai (grupavimui pagal dokumento dalį) -------------------------------- */
  const didziosiomis = s => { const r = String(s || '').replace(/\([^)]*\)/g, '').replace(/[^A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]/g, '');
    return r.length >= 5 && [...r].filter(c => c !== c.toLocaleLowerCase('lt')).length >= 0.75 * r.length; };
  const angliskaAntraste = s => !/[ĄČĘĖĮŠŲŪŽ]/.test(s) && /\b(OF|AND|THE|FOR|PROVISIONS|PROCUREMENT|TENDERS?|REQUIREMENTS|ANNEXES|CONTRACT|SECURITY|SUBMISSION|GROUNDS|EXAMINATION|OTHER)\b/.test(s)
    && !/\b(REIKALAVIMAI|NUOSTATOS|PIRKIMO|PIRKIMAMS|PRIEDAI|KITI|KITOS|SUTARTIES|DPS)\b/.test(s);
  // „KITI REIKALAVIMAI/OTHER REQUIREMENTS“ - lietuviška dalis
  const lietuviskaDalis = t => String(t || '').split(/\s*\/\s*(?=[A-Z])/)[0];
  function arAntraste(t){
    t = lietuviskaDalis(String(t || '').trim());
    return didziosiomis(t) && t.length >= 4 && t.length <= 160 && !/\d\s*$/.test(t) && !/:\s*$/.test(t) && !/[_[]/.test(t)
      && !/^(PATEIKIAMA|PASTABA|NOTE|SUBMITTED|EIL|NO\.|NR\.|TURINYS|CONTENTS|ĮMONĖS PAVADINIMAS)/.test(t) && !angliskaAntraste(t);
  }
  const antrastesTekstas = t => lietuviskaDalis(String(t || '').trim()).replace(/^\d+(\.\d+)*\.?\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
  /* Skyrių sąrašas [{ i, pavadinimas }] - kešuojamas žemėlapyje. */
  function skyriai(Z){
    if (Z.__skyriai) return Z.__skyriai;
    const P = Z.paras || {};
    const out = Object.keys(P).map(Number).sort((a, b) => a - b).filter(i => arAntraste(P[i])).map(i => ({ i, pavadinimas: antrastesTekstas(P[i]) }));
    // pakartotinė ta pati antraštė (lentelės antraštės eilutė puslapio viršuje) - viena
    const vienos = out.filter((x, k) => !k || x.pavadinimas !== out[k - 1].pavadinimas);
    Object.defineProperty(Z, '__skyriai', { value: vienos, enumerable: false, configurable: true });
    return vienos;
  }
  function skyrius(Z, i){
    const S = skyriai(Z);
    let r = null;
    for (const s of S){ if (s.i <= i) r = s; else break; }
    return r;
  }

  /* DPS, kurios pagrindu vykdomas konkretus pirkimas, pavadinimas (naudotojo sprendimas 2026-10-05; tik DPS konkretaus pirkimo
     šablonai). Šablone jo vietoje - kito pirkimo pavyzdys raudonai („110 KV ...“, „TITLE OF THE DPS“), ne „___“, todėl laukas
     aprašomas atskirai: konteksto sakinys - antraštės žodžiai su pavyzdžiu, vieta - pavyzdžio atkarpa (planas ir peržiūra kaip
     kitų laukų). Vienas laukas visoms vietoms (sąlygų antraštė ir 1.1 p., pasiūlymo formos antraštė); dvikalbiame - ir angliškas. */
  const DPS_PAVADINIMAS = { klausimas: 'Dinaminės pirkimo sistemos pavadinimas',
    uzuomina: 'DPS, kurios pagrindu vykdomas šis konkretus pirkimas, pavadinimas - kaip DPS sukūrimo dokumentuose. Įrašomas konkretaus pirkimo sąlygų antraštėje ir 1.1 punkte bei pasiūlymo formos antraštėje.',
    uzrasas: 'DPS pavadinimas', uzrasasEn: 'DPS pavadinimas anglų kalba' };
  function dpsPavadinimoLaukas(pavyzdys){
    const zyma = String(pavyzdys || '').trim(), pr = 'ATLIEKAMO DINAMINĖS PIRKIMO SISTEMOS „', tekstas = pr + zyma + '“ PAGRINDU, SĄLYGOS';
    return { tekstas, lk: { tekstas, tipas: 'dps-pavadinimas', klausimas: DPS_PAVADINIMAS.klausimas, uzuomina: DPS_PAVADINIMAS.uzuomina,
      vietos: [{ start: pr.length, end: pr.length + zyma.length, zyma, rusis: 'pavyzdys', ivestis: 'tekstas', uzrasas: DPS_PAVADINIMAS.uzrasas, aprasyta: true, klase: 'c', salinti: null }] } };
  }

  /* Tiekėjo pildoma vieta priedo formoje, įdėtoje į sąlygų dokumentą (DPS sukūrimo sąlygos): „____ Nr.____“, „202_-__-__“. */
  const arTiekejoVieta = t => /^[\s_]*Nr\.[\s_]*$/.test(String(t || '').trim()) || /^20\d_-_+-_+$/.test(String(t || '').trim());

  root.GP_LAUKAI = { norm, arTiekejoVieta, tusciosVietos, xVietos, laukas, planas, keitimai, tekstasIsPlano, gramatika, sutrauk,
    prieduSarasas, nuorodosPriedas, priedoRaktasIsTeksto, PRIEDU_PAV, EN_MENESIAI, skyriai, skyrius, arAntraste, TIPAI,
    GRUPES, grupesKlausimas, tikrinimoVariantas, uztikrinimoVariantas, UZT_PAGAL_KRITERIJU, SALINTI, KRITERIJU_PASIRINKIMAI,
    DPS_PAVADINIMAS, dpsPavadinimoLaukas };
})(typeof window !== 'undefined' ? window : globalThis);
