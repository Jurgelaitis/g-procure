/* ==========================================================================
   PP-salygos - variklis (bendras: kartografas + generatorius)
   ---------------------------------------------------------------------------
   GPDocx - deterministine .docx chirurgija (JSZip + XML). Jokio AI.
   GPMap  - sablono kartografavimas: is paties sablono istraukia salygu
            sluoksni (raudonas tekstas), komentaru sluoksni ir tuscias vietas.
   Reikalauja: vendor/jszip.min.js
   ========================================================================== */
/* Įrašomas tekstas (naudotojo ir AI reikšmės, modulio sakiniai) - be ilgųjų brūkšnių: ilgieji brūkšniai (U+2013, U+2014) -> „-“ (naudotojo sprendimas
   2026-10-02, oficialūs pirkimo dokumentai; taisyklė - shared/docx-stiliai.js). LITGRID šablonų tekstas nekeičiamas. Vidiniai
   eksperto įrankiai be bendro failo (kartografas, E0) rašo kaip yra. */
const gpBruksniai = s => (typeof GP_DOCX_STILIAI !== 'undefined' ? GP_DOCX_STILIAI.bruksniai(s) : String(s == null ? '' : s));

const GPDocx = (() => {
  const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
  const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

  // Rysio tipai, kuriuos laikome "komentaru seima" - visi salinami kartu.
  const COMMENT_REL_TYPES = ['/comments','/commentsExtended','/commentsIds','/people'];

  const ser = new XMLSerializer();
  const parseXml = (s) => {
    const d = new DOMParser().parseFromString(s, 'application/xml');
    const err = d.getElementsByTagName('parsererror')[0];
    if (err) throw new Error('XML parse: ' + err.textContent.slice(0,200));
    return d;
  };

  async function open(arrayBuffer){
    // createFolders:false - JSZip kitu atveju iterptu kataloginius irasus ("word/"),
    // kuriu originaliame Word faile nera ir kuriems nera Content_Types irašo.
    const zip = await JSZip.loadAsync(arrayBuffer, { createFolders:false });
    const doc = { zip, parts:{}, log:[] };
    doc.parts['word/document.xml'] = parseXml(await zip.file('word/document.xml').async('string'));
    return doc;
  }
  async function part(doc, path){
    if (doc.parts[path]) return doc.parts[path];
    const f = doc.zip.file(path);
    if (!f) return null;
    doc.parts[path] = parseXml(await f.async('string'));
    return doc.parts[path];
  }
  const els = (root, name) => Array.from(root.getElementsByTagNameNS(NS_W, name));
  const paraText = (p) => els(p,'t').map(t => t.textContent).join('');
  const note = (doc, msg) => doc.log.push(msg);

  /* ---------- 1. KOMENTARU SALINIMAS -------------------------------------
     Word komentaras gyvena 5 vietose: comments.xml (+Extended/Ids/people),
     document.xml inkarai, comments.xml.rels, document.xml.rels, [Content_Types].
     Palikus bent viena - Word skelbia faila sugadintu. Salinam visas.        */
  async function stripComments(doc){
    const d = doc.parts['word/document.xml'];
    let n = 0;
    for (const tag of ['commentRangeStart','commentRangeEnd']){
      for (const el of els(d, tag)){ el.parentNode.removeChild(el); n++; }
    }
    // commentReference visada gyvena run'e, kuriame nera teksto -> trinam visa run'a
    for (const ref of els(d,'commentReference')){
      const run = ref.parentNode;
      const isBareRun = run.localName === 'r' && els(run,'t').length === 0;
      (isBareRun ? run : ref).parentNode.removeChild(isBareRun ? run : ref);
      n++;
    }
    // rysiai
    const relsPath = 'word/_rels/document.xml.rels';
    const rels = await part(doc, relsPath);
    if (rels){
      for (const r of Array.from(rels.getElementsByTagNameNS(NS_REL,'Relationship'))){
        if (COMMENT_REL_TYPES.some(t => r.getAttribute('Type').endsWith(t)))
          r.parentNode.removeChild(r);
      }
    }
    // content types
    const ct = await part(doc, '[Content_Types].xml');
    const dead = [];
    if (ct){
      for (const o of Array.from(ct.getElementsByTagNameNS(NS_CT,'Override'))){
        const pn = o.getAttribute('PartName') || '';
        if (/\/word\/(comments|commentsExtended|commentsIds|people)\.xml$/.test(pn)){
          dead.push(pn.replace(/^\//,''));
          o.parentNode.removeChild(o);
        }
      }
    }
    // pacios dalys
    for (const p of ['word/comments.xml','word/commentsExtended.xml','word/commentsIds.xml',
                     'word/people.xml','word/_rels/comments.xml.rels', ...dead]){
      if (doc.zip.file(p)) doc.zip.remove(p);
    }
    note(doc, `Komentarai: pasalinta ${n} inkaru + dalys/rysiai/content-types.`);
    return n;
  }

  /* ---------- 2. ZYMU UZPILDYMAS ------------------------------------------
     Word skaido zyma per kelis run'us: "{REFERENCE_" + "3_LT" + ")".
     Tad dirbam su SUJUNGTU pastraipos tekstu ir tik po to rasom atgal:
     pakaitalas ideda i pirma persidengianti <w:t> (issaugo jo formatavima),
     likusios atitikmens raides istrinamos.                                   */
  const TAG_RE = /\{([A-Z0-9_]+)[\}\)]/g;   // priima ir "}" ir sablono defekta ")"

  function fillTags(doc, values){
    const d = doc.parts['word/document.xml'];
    const filled = {}, missing = new Set();
    for (const p of els(d,'p')){
      const ts = els(p,'t');
      if (!ts.length) continue;
      const s = ts.map(t => t.textContent).join('');
      if (s.indexOf('{') < 0) continue;

      // char -> jo <w:t> mazgas
      const owner = [];
      ts.forEach(t => { for (let i=0;i<t.textContent.length;i++) owner.push(t); });

      const matches = [];
      TAG_RE.lastIndex = 0;
      let m;
      while ((m = TAG_RE.exec(s))){
        if (!(m[1] in values)) { missing.add(m[1]); continue; }
        matches.push({ start:m.index, end:m.index+m[0].length, name:m[1] });
      }
      if (!matches.length) continue;

      const out = new Map(ts.map(t => [t, '']));
      let i = 0, mi = 0;
      while (i < s.length){
        if (mi < matches.length && i === matches[mi].start){
          const mt = matches[mi];
          out.set(owner[i], out.get(owner[i]) + gpBruksniai(values[mt.name]));
          filled[mt.name] = (filled[mt.name]||0) + 1;
          i = mt.end; mi++;
        } else {
          out.set(owner[i], out.get(owner[i]) + s[i]); i++;
        }
      }
      for (const t of ts){
        t.textContent = out.get(t);
        t.setAttribute('xml:space','preserve');
      }
    }
    note(doc, `Zymos: uzpildyta ${Object.keys(filled).length} unikaliu (${Object.values(filled).reduce((a,b)=>a+b,0)} vietu).`
              + (missing.size ? ` NEPADENGTA: ${[...missing].join(', ')}` : ''));
    return { filled, missing:[...missing] };
  }

  /* ---------- 3. PASTRAIPU TRYNIMAS ---------------------------------------
     Saugikliai:
     - pastraipa su sectPr (sekcijos formatavimas) NEtrinama - luztu maketas;
     - paskutine pastraipa lenteles langelyje keiciama tuscia (Word reikalauja
       bent vienos <w:p> kiekviename <w:tc>);
     - po trynimo valomi likę be poros bookmark'ai.                            */
  function deleteParagraphs(doc, predicate){
    const d = doc.parts['word/document.xml'];
    const all = els(d,'p');
    const deleted = [], refused = [];
    all.forEach((p, idx) => {
      const txt = paraText(p);
      if (!predicate(txt, idx, p)) return;
      if (p.getElementsByTagNameNS(NS_W,'sectPr').length){
        refused.push({idx, txt: txt.slice(0,50), why:'turi sectPr (sekcijos maketas)'});
        return;
      }
      const tc = p.parentNode;
      if (tc && tc.localName === 'tc'){
        const siblings = Array.from(tc.children).filter(c => c.localName === 'p');
        if (siblings.length === 1){
          while (p.firstChild) p.removeChild(p.firstChild);   // paliekam tuscia <w:p>
          deleted.push({idx, txt: txt.slice(0,50), how:'istustinta (vienintele lentelės langelyje)'});
          return;
        }
      }
      p.parentNode.removeChild(p);
      deleted.push({idx, txt: txt.slice(0,50), how:'istrinta'});
    });
    cleanOrphanBookmarks(d);
    note(doc, `Pastraipos: istrinta ${deleted.length}` + (refused.length ? `, ATMESTA ${refused.length} (saugiklis)` : ''));
    return { deleted, refused };
  }

  function cleanOrphanBookmarks(d){
    const starts = els(d,'bookmarkStart'), ends = els(d,'bookmarkEnd');
    const sIds = new Set(starts.map(e => e.getAttributeNS(NS_W,'id')));
    const eIds = new Set(ends.map(e => e.getAttributeNS(NS_W,'id')));
    let n = 0;
    starts.forEach(e => { if (!eIds.has(e.getAttributeNS(NS_W,'id'))) { e.parentNode.removeChild(e); n++; } });
    ends.forEach(e => { if (!sIds.has(e.getAttributeNS(NS_W,'id'))) { e.parentNode.removeChild(e); n++; } });
    return n;
  }


  /* ---------- 3b. LENTELIU TRYNIMAS ---------------------------------------
     Dalis salygu valdo ne pastraipas, o istisas lenteles ("3 lentele
     paliekama, kitu atveju - istrinama"). Lentele randama pagal artimiausia
     <w:tbl> po nurodytos pastraipos.                                          */
  function tables(doc){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(NS_W,'body')[0];
    return Array.from(body.getElementsByTagNameNS(NS_W,'tbl'));
  }
  /* Salina lenteles PO nurodytos pastraipos. Priimam pastraipos MAZGA (is
     GPGen.snapshot), o ne numeri: zemelapio i skaiciuoja VISAS w:p (ir esancias
     lentelese), o body lygyje ju daug maziau - skaiciuojant poziciju abu
     indeksavimai nesutapdavo ir lenteles budavo salinamos ne tos arba visai
     nesalinamos (dvikalbiuose - nei viena, nes ten beveik viskas lenteleje).
     Dalis taisykliu valdo KELIAS lenteles ("3 ir 4 lenteles paliekamos").     */
  function deleteTableAfter(doc, paraNode, kiek = 1, numeriai = null){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(NS_W,'body')[0];
    if (!paraNode) return 0;
    // Pakylam iki BODY lygio protevio: valdomos lenteles yra body lygyje, o
    // pati pastraipa dvikalbiuose sablonuose gali sedeti lenteles langelyje.
    let vir = paraNode;
    while (vir && vir.parentNode && vir.parentNode !== body) vir = vir.parentNode;
    if (!vir || vir.parentNode !== body) return 0;
    // SAUGIKLIS. Taisykle sako, KURIA lentele valdo ("3 lentele paliekama"),
    // o sablonuose lenteles antraste ("3 lentele / Table 3") eina PRIES pacia
    // lentele. Sablonu tvarka nevienoda: AK taisykle yra PRIES lentele, o
    // TSD_LTEN - PO jos, tad aklas "trink kita lentele" ten pasalintu
    // SOCIALINIU reikalavimu lentele. Todel trinam TIK tada, kai antraste
    // patvirtina numeri; nepatvirtinus - nedarom nieko (kaip ir iki siol).
    const laukiam = Array.isArray(numeriai) && numeriai.length ? numeriai : null;
    let rasta = 0, po = false, antraste = '', antrastesP = null, praleista = 0;
    for (const node of Array.from(body.children)){
      if (node === vir){ po = true; continue; }
      if (!po) continue;
      if (node.localName === 'p'){ const t = paraText(node).trim(); if (t){ antraste = t; antrastesP = node; } continue; }
      if (node.localName !== 'tbl') continue;
      if (rasta >= kiek) break;
      if (laukiam){
        const m = antraste.match(/(\d+)\s*lentel/i);
        if (!m || !laukiam.includes(m[1])){ praleista++; break; }   // ne ta lentele - stojam
      }
      node.parentNode.removeChild(node);
      salintiAntraste(antrastesP);
      rasta++;
      antraste = ''; antrastesP = null;
    }
    note(doc, `Lenteles po pastraipos: istrinta ${rasta} is ${kiek}`
      + (praleista ? ` (sustota: antraste nepatvirtino numerio ${(laukiam||[]).join('/')})` : '') + '.');
    return rasta;
  }

  /* Lenteles antraste („2 lentele“, „2 lentele/Table 2“) be lenteles neturi likti. Lietuviskuose SPS ja dar
     tvarko raudonu pastabu taisykle, bet dvikalbiuose ji - intarpas (raudonas tik numeris), tad iki 2026-10-03
     istrynus lentele antraste likdavo. Salinama TIK trumpa antrastes pastraipa. */
  const ANTRASTE_RE = /^\s*\d+\s*lentel[^\s\/]*(\s*\/\s*table\s*\d+)?\s*$/i;
  function salintiAntraste(p){
    if (p && p.parentNode && ANTRASTE_RE.test(paraText(p))) p.parentNode.removeChild(p);
  }

  /* R2 atsarginis kelias (2026-10-03): sablone be lenteliu taisykles (MVP_LT_SPS) pasirinkus „kvalifikacija
     netikrinama“ kvalifikacijos reikalavimu lentele prieštarautu 3.1 punktui. Trinama TIK pirma kuno lentele,
     kurios antraste „N lentele“ ir kurios tekste yra `privaloma` (pvz. „Kvalifikacijos reikalavim“). */
  function deleteTableByCaption(doc, numeris, privaloma){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(NS_W,'body')[0];
    let antraste = '', antrastesP = null;
    for (const node of Array.from(body.children)){
      if (node.localName === 'p'){ const t = paraText(node).trim(); if (t){ antraste = t; antrastesP = node; } continue; }
      if (node.localName !== 'tbl') continue;
      const m = antraste.match(/^(\d+)\s*lentel/i);
      if (m && m[1] === String(numeris) && els(node,'t').map(t => t.textContent).join('').includes(privaloma)){
        node.parentNode.removeChild(node);
        salintiAntraste(antrastesP);
        note(doc, `Lentele ${numeris} („${privaloma}“) istrinta pagal pasirinkima.`);
        return 1;
      }
      antraste = ''; antrastesP = null;
    }
    return 0;
  }

  /* R2 (2026-10-03): istrina lentele su NURODYTU numeriu po pastraipos, praleisdama kitas. Taisykle „1 ir 2
     lenteles paliekamos. Jei tikrinami tik pasalinimo pagrindai, paliekama atitinkama lentele“: tikrinant tik
     pasalinimo pagrindus lieka 1 lentele, trinama 2 (deleteTableAfter trindavo pirma - 1). Ziurima ne toliau
     kaip `riba` lenteliu; neradus antrastes su tuo numeriu - nieko netrinama. */
  function deleteNumberedTable(doc, paraNode, numeris, riba = 3){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(NS_W,'body')[0];
    if (!paraNode) return 0;
    let vir = paraNode;
    while (vir && vir.parentNode && vir.parentNode !== body) vir = vir.parentNode;
    if (!vir || vir.parentNode !== body) return 0;
    let po = false, antraste = '', antrastesP = null, lenteliu = 0;
    for (const node of Array.from(body.children)){
      if (node === vir){ po = true; continue; }
      if (!po) continue;
      if (node.localName === 'p'){ const t = paraText(node).trim(); if (t){ antraste = t; antrastesP = node; } continue; }
      if (node.localName !== 'tbl') continue;
      if (++lenteliu > riba) break;
      const m = antraste.match(/(\d+)\s*lentel/i);
      if (m && m[1] === String(numeris)){
        node.parentNode.removeChild(node);
        salintiAntraste(antrastesP);
        note(doc, `Lentele ${numeris} po pastraipos istrinta.`);
        return 1;
      }
      antraste = ''; antrastesP = null;
    }
    note(doc, `Lentele ${numeris} po pastraipos nerasta - nieko netrinta.`);
    return 0;
  }

  /* ---------- 3c. LOGOTIPO INJEKCIJA (OOXML, ne docx.js) -------------------
     PP-salygos transformuoja ESAMUS sablonus (JSZip + XML), tad logotipas
     dedamas ne per docx.js ImageRun, o tiesiai i pakuote: PNG baitai -> media
     dalis, png -> Content_Types, rysys -> document.xml.rels, centruotas
     piesinio paragrafas -> kuno virsus.
     Matmenys - EMU (1 pt = 12700 EMU). Numatyta 150x55 pt (islaiko 2,72:1).   */
  const NS_WP  = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
  const NS_A   = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
  const NS_R   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  function logoParaXml(rId, cx, cy){
    return `<w:p xmlns:w="${NS_W}" xmlns:wp="${NS_WP}" xmlns:a="${NS_A}" xmlns:pic="${NS_PIC}" xmlns:r="${NS_R}">`
      + `<w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>`
      + `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">`
      + `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>`
      + `<wp:docPr id="1" name="LITGRID logo"/>`
      + `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>`
      + `<a:graphic><a:graphicData uri="${NS_PIC}"><pic:pic>`
      + `<pic:nvPicPr><pic:cNvPr id="1" name="litgrid-logo.png"/><pic:cNvPicPr/></pic:nvPicPr>`
      + `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
      + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`
      + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
      + `</pic:pic></a:graphicData></a:graphic>`
      + `</wp:inline></w:drawing></w:r></w:p>`;
  }

  /* Ar sablonas JAU turi paveiksla antrasteje (logotipa). Nuo 2026-10 LITGRID sablonuose MONO logotipas yra
     pirmo puslapio (ar visu puslapiu) antrasteje - tada modulio logotipo kuno virsuje nereikia, kitaip butu du.
     Antrastes tikrinamos kaip tekstas (be XML perrasymo - jos lieka nepaliestos). */
  async function antrastejePaveikslas(doc){
    const d = doc.parts['word/document.xml'];
    const relsF = doc.zip.file('word/_rels/document.xml.rels');
    if (!relsF) return false;
    const ids = new Set(els(d,'headerReference').map(h => h.getAttributeNS(NS_R,'id') || h.getAttribute('r:id')));
    const rels = parseXml(await relsF.async('string'));
    for (const rel of Array.from(rels.getElementsByTagNameNS(NS_REL,'Relationship'))){
      if (!ids.has(rel.getAttribute('Id'))) continue;
      const f = doc.zip.file('word/' + String(rel.getAttribute('Target') || '').replace(/^\/?(word\/)?/, ''));
      if (f && /<w:(drawing|pict)\b/.test(await f.async('string'))) return true;
    }
    return false;
  }

  /* Plaukiojantis pirmo puslapio antraštės logotipas virš lentelės (2026-10-05, naudotojo prašymas; matuota Pages): paveikslas
     su „wrapTopAndBottom“ (wp:anchor), kurio apačia žemiau viršutinės paraštės, o dokumentas prasideda lentele. Pages plaukiojančio
     antraštės paveikslo apačios nepaiso ir lentelę piešia ant logotipo (DPS sukūrimo ir konkretaus pirkimo LT/EN sąlygos).
     Paveikslas tampa įdėtiniu (wp:inline) toje pačioje antraštės pastraipoje - antraštė apima logotipą, tekstas prasideda po juo.
     Vieta išlaikoma: horizontaliai - tas pats centras (pastraipa centruojama, įtrauka - jei šablone centras ne teksto srities
     viduryje), teigiamas vertikalus poslinkis - antraštės atstumas nuo krašto. Kai pirmas turinys - tekstas (formos: „SPS priedas Nr.“
     dešinėje šalia logotipo), nekeičiama. Grąžina pakeistų paveikslų skaičių. */
  const twip = emu => Math.round(Number(emu || 0) / 635);
  const PPR_PO_SPACING = ['ind','contextualSpacing','mirrorIndents','suppressOverlap','jc','textDirection','textAlignment','textboxTightWrap','outlineLvl','divId','cnfStyle','rPr','sectPr','pPrChange'];
  function pPrVaikas(p, vardas, po){
    let pPr = Array.from(p.childNodes).find(c => c.localName === 'pPr');
    if (!pPr){ pPr = p.ownerDocument.createElementNS(NS_W, 'w:pPr'); p.insertBefore(pPr, p.firstChild); }
    let el = Array.from(pPr.childNodes).find(c => c.localName === vardas);
    if (!el){
      el = p.ownerDocument.createElementNS(NS_W, 'w:' + vardas);
      const pries = Array.from(pPr.childNodes).find(c => po.includes(c.localName));
      pPr.insertBefore(el, pries || null);
    }
    return el;
  }
  async function antrastesLogotipas(doc){
    const d = doc.parts['word/document.xml'], body = els(d,'body')[0];
    if (!body) return 0;
    const pirmas = Array.from(body.childNodes).find(c => c.nodeType === 1 && (c.localName === 'tbl' || c.localName === 'sdt'
      || (c.localName === 'p' && (paraText(c).trim() || els(c,'drawing').length))));
    if (!pirmas || pirmas.localName !== 'tbl') return 0;
    const sp = els(d,'sectPr')[0], relsF = doc.zip.file('word/_rels/document.xml.rels');
    if (!sp || !relsF) return 0;
    const a = (el, v) => el ? Number(el.getAttributeNS(NS_W, v) || el.getAttribute('w:' + v) || 0) : 0;
    const mar = els(sp,'pgMar')[0], pg = els(sp,'pgSz')[0];
    const top = a(mar,'top'), hd = a(mar,'header'), L = a(mar,'left'), R = a(mar,'right'), W = a(pg,'w');
    const tp = els(sp,'titlePg')[0], pirmasPsl = tp && !/^(0|false)$/.test(tp.getAttributeNS(NS_W,'val') || tp.getAttribute('w:val') || '');
    const ref = els(sp,'headerReference').find(h => (h.getAttributeNS(NS_W,'type') || h.getAttribute('w:type')) === (pirmasPsl ? 'first' : 'default'));
    if (!ref) return 0;
    const id = ref.getAttributeNS(NS_R,'id') || ref.getAttribute('r:id');
    const rels = parseXml(await relsF.async('string'));
    const rel = Array.from(rels.getElementsByTagNameNS(NS_REL,'Relationship')).find(r => r.getAttribute('Id') === id);
    if (!rel) return 0;
    // antraštė skaitoma atskirai ir į doc.parts patenka tik pakeista: įkelta dalis įrašant perrašoma (ir nepakeista)
    const kelias = 'word/' + String(rel.getAttribute('Target') || '').replace(/^\/?(word\/)?/, '');
    const hf = !doc.parts[kelias] && doc.zip.file(kelias);
    const h = doc.parts[kelias] || (hf ? parseXml(await hf.async('string')) : null);
    if (!h) return 0;
    let n = 0;
    for (const an of Array.from(h.getElementsByTagNameNS(NS_WP,'anchor'))){
      if (!an.getElementsByTagNameNS(NS_WP,'wrapTopAndBottom').length) continue;
      const vaikas = (el, vardas) => Array.from(el.childNodes).find(c => c.localName === vardas) || null;
      const pv = vaikas(an,'positionV'), ph = vaikas(an,'positionH'), ext = vaikas(an,'extent');
      const pvOff = pv && vaikas(pv,'posOffset');
      if (!pv || !pvOff || !ext) continue;
      const nuo = pv.getAttribute('relativeFrom'), off = twip(pvOff.textContent), cy = twip(ext.getAttribute('cy')), cx = twip(ext.getAttribute('cx'));
      const pradzia = { page: 0, topMargin: 0, margin: top, paragraph: hd, line: hd }[nuo];
      if (pradzia == null || pradzia + off + cy <= top) continue;
      let p = an.parentNode; while (p && p.localName !== 'p') p = p.parentNode;
      if (!p || paraText(p).trim()) continue;                      // antraštės pastraipoje - tik paveikslas
      // horizontalus centras teksto srities atžvilgiu
      const tw = W - L - R, phAl = ph && vaikas(ph,'align'), phOff = ph && vaikas(ph,'posOffset');
      const phNuo = ph ? ph.getAttribute('relativeFrom') : 'column';
      let X = tw / 2;
      if (phAl && /center/.test(phAl.textContent)) X = phNuo === 'page' ? W / 2 - L : tw / 2;
      else if (phOff) X = (phNuo === 'page' ? twip(phOff.textContent) - L : twip(phOff.textContent)) + cx / 2;
      const inl = h.createElementNS(NS_WP, 'wp:inline');
      ['distT','distB','distL','distR'].forEach(x => inl.setAttribute(x, '0'));
      ['extent','effectExtent','docPr','cNvGraphicFramePr'].forEach(v => { const c = vaikas(an, v); if (c) inl.appendChild(c.cloneNode(true)); });
      const gr = an.getElementsByTagNameNS(NS_A,'graphic')[0];
      if (!gr) continue;
      inl.appendChild(gr.cloneNode(true));
      an.parentNode.replaceChild(inl, an);
      // teigiamas poslinkis žemyn nuo antraštės pastraipos - antraštės atstumas nuo lapo krašto (tarpo prieš antraštės pastraipą
      // Pages nepaiso: logotipas atsidurdavo 0,2 cm nuo krašto); kitų puslapių antraštės DPS sąlygose tuščios
      if (off > 0 && (nuo === 'paragraph' || nuo === 'line')) mar.setAttributeNS(NS_W, 'w:header', String(hd + off));
      const dx = Math.round(2 * X - tw);
      if (Math.abs(dx) > 20){
        const ind = pPrVaikas(p, 'ind', PPR_PO_SPACING.slice(1));
        ind.setAttributeNS(NS_W, dx > 0 ? 'w:left' : 'w:right', String(Math.abs(dx)));
      }
      pPrVaikas(p, 'jc', PPR_PO_SPACING.slice(5)).setAttributeNS(NS_W, 'w:val', 'center');
      n++;
    }
    if (n){ doc.parts[kelias] = h; note(doc, `Antraštės logotipas virš lentelės - įdėtinis (${n}).`); }
    return n;
  }

  /* Pirmo puslapio antraštė Pages (2026-10-05, naudotojo prašymas): Pages antraštes ir poraštes rodo tik tada, kai bent viena
     poraštė arba ne pirmo puslapio antraštė turi turinio. Matuota Pages: 13 LT šablonų (SPS, pasiūlymo formos, konfidenciali
     informacija, TSD paraiška) logotipas yra tik pirmo puslapio antraštėje, o kitos dalys tuščios - logotipo nerodo; tuščia
     įprasta antraštė ar tuščia pirmo puslapio poraštė nepadeda, vienas tarpas tuščioje poraštėje - padeda. Todėl tokiu atveju į
     įprastą poraštę (jos nesant - į naują) įrašomas vienas tarpas (nematomas). Be „titlePg“ pirmo puslapio antraštės nenaudoja
     ir Word (TSD LT paraiška) - jis pridedamas, kai įprastos antraštės nėra (ji negali dingti). Grąžina { titlePg, tarpas }. */
  const SECTPR_PO_TITLEPG = ['textDirection','bidi','rtlGutter','docGrid','printerSettings','sectPrChange'];
  const TURINYS_RE = /<w:t(?:\s[^>]*)?>[^<]*\S|<w:drawing\b|<w:pict\b|<w:fldSimple\b|<w:instrText\b/;
  async function pirmoPuslapioAntraste(doc){
    const out = { titlePg: false, tarpas: false };
    const d = doc.parts['word/document.xml'], sp = els(d,'sectPr')[0], relsF = doc.zip.file('word/_rels/document.xml.rels');
    if (!sp || !relsF) return out;
    const relsD = doc.parts['word/_rels/document.xml.rels'] || parseXml(await relsF.async('string'));
    const tikslas = id => { const r = Array.from(relsD.getElementsByTagNameNS(NS_REL,'Relationship')).find(x => x.getAttribute('Id') === id);
      return r ? 'word/' + String(r.getAttribute('Target') || '').replace(/^\/?(word\/)?/, '') : null; };
    const tekstas = async kel => doc.parts[kel] ? ser.serializeToString(doc.parts[kel]) : (doc.zip.file(kel) ? await doc.zip.file(kel).async('string') : '');
    const refs = [];
    for (const el of Array.from(sp.childNodes).filter(c => c.localName === 'headerReference' || c.localName === 'footerReference')){
      const kel = tikslas(el.getAttributeNS(NS_R,'id') || el.getAttribute('r:id'));
      refs.push({ el, rusis: el.localName === 'headerReference' ? 'header' : 'footer', tipas: el.getAttributeNS(NS_W,'type') || el.getAttribute('w:type') || 'default',
        kel, turinys: kel ? TURINYS_RE.test(await tekstas(kel)) : false });
    }
    if (!refs.some(r => r.rusis === 'header' && r.tipas === 'first' && r.turinys)) return out;
    const tp = els(sp,'titlePg')[0];
    if (!tp && !refs.some(r => r.rusis === 'header' && r.tipas === 'default')){
      const el = d.createElementNS(NS_W, 'w:titlePg');
      sp.insertBefore(el, Array.from(sp.childNodes).find(c => SECTPR_PO_TITLEPG.includes(c.localName)) || null);
      out.titlePg = true;
    }
    if (refs.some(r => r.turinys && !(r.rusis === 'header' && r.tipas === 'first'))) return out;
    const tarpasP = x => { const r = x.createElementNS(NS_W, 'w:r'), t = x.createElementNS(NS_W, 'w:t');
      t.setAttribute('xml:space', 'preserve'); t.textContent = ' '; r.appendChild(t); return r; };
    const pr = refs.find(r => r.rusis === 'footer' && r.tipas === 'default' && r.kel && doc.zip.file(r.kel));
    if (pr){
      const f = await part(doc, pr.kel);
      let p = f.getElementsByTagNameNS(NS_W,'p')[0];
      if (!p){ p = f.createElementNS(NS_W, 'w:p'); f.documentElement.appendChild(p); }
      p.appendChild(tarpasP(f));
    } else {
      // nauja įprasta poraštė su vienu tarpu: dalis, ryšys, turinio tipas, nuoroda skyriuje (nuorodos - sectPr pradžioje)
      let k = 1; while (doc.zip.file('word/footerGP' + k + '.xml')) k++;
      const vardas = 'footerGP' + k + '.xml';
      doc.zip.file('word/' + vardas, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr xmlns:w="${NS_W}"><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p></w:ftr>`, { createFolders:false });
      const ct = await part(doc, '[Content_Types].xml');
      const ov = ct.createElementNS(NS_CT, 'Override');
      ov.setAttribute('PartName', '/word/' + vardas);
      ov.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml');
      ct.documentElement.appendChild(ov);
      const rels = await part(doc, 'word/_rels/document.xml.rels');
      const used = new Set(Array.from(rels.getElementsByTagNameNS(NS_REL,'Relationship')).map(r => r.getAttribute('Id')));
      let j = 1; while (used.has('rId' + j)) j++;
      const rel = rels.createElementNS(NS_REL, 'Relationship');
      rel.setAttribute('Id', 'rId' + j);
      rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer');
      rel.setAttribute('Target', vardas);
      rels.documentElement.appendChild(rel);
      const fr = d.createElementNS(NS_W, 'w:footerReference');
      fr.setAttributeNS(NS_W, 'w:type', 'default');
      fr.setAttributeNS(NS_R, 'r:id', 'rId' + j);
      sp.insertBefore(fr, sp.firstChild);
    }
    out.tarpas = true;
    note(doc, `Pirmo puslapio antraštė: ${out.titlePg ? 'titlePg pridėtas, ' : ''}tarpas poraštėje (Pages).`);
    return out;
  }

  async function insertLogo(doc, opts){
    const fname = opts.fname || 'litgrid-logo.png';
    const cx = opts.cxEmu, cy = opts.cyEmu;
    // 1. media dalis
    doc.zip.file('word/media/' + fname, opts.bytes, { createFolders:false });
    // 2. png Content_Types (jei dar nera)
    const ct = await part(doc, '[Content_Types].xml');
    const hasPng = Array.from(ct.getElementsByTagNameNS(NS_CT,'Default'))
      .some(d => (d.getAttribute('Extension')||'').toLowerCase() === 'png');
    if (!hasPng){
      const def = ct.createElementNS(NS_CT, 'Default');
      def.setAttribute('Extension', 'png');
      def.setAttribute('ContentType', 'image/png');
      ct.documentElement.insertBefore(def, ct.documentElement.firstChild);
    }
    // 3. rysys su unikaliu rId
    const rels = await part(doc, 'word/_rels/document.xml.rels');
    const used = new Set(Array.from(rels.getElementsByTagNameNS(NS_REL,'Relationship')).map(r => r.getAttribute('Id')));
    let k = 1; while (used.has('rId' + k)) k++;
    const rId = 'rId' + k;
    const rel = rels.createElementNS(NS_REL, 'Relationship');
    rel.setAttribute('Id', rId);
    rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
    rel.setAttribute('Target', 'media/' + fname);
    rels.documentElement.appendChild(rel);
    // 4. piesinio paragrafas kuno virsuje
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(NS_W,'body')[0];
    const parsed = parseXml(logoParaXml(rId, cx, cy));
    const imported = d.importNode(parsed.documentElement, true);
    body.insertBefore(imported, body.firstChild);
    note(doc, `Logotipas: iterptas (${fname}, ${cx}x${cy} EMU, ${rId}).`);
    return rId;
  }

  /* ---------- 4. PAPRASTAS TEKSTO KEITIMAS (pvz. /ĮMONĖS PAVADINIMAS/) ----- */
  function replaceText(doc, find, repl){
    const d = doc.parts['word/document.xml'];
    let n = 0;
    for (const p of els(d,'p')){
      const ts = els(p,'t');
      if (!ts.length) continue;
      const s = ts.map(t => t.textContent).join('');
      if (s.indexOf(find) < 0) continue;
      const owner = [];
      ts.forEach(t => { for (let i=0;i<t.textContent.length;i++) owner.push(t); });
      const out = new Map(ts.map(t => [t, '']));
      let i = 0;
      while (i < s.length){
        if (s.startsWith(find, i)){
          out.set(owner[i], out.get(owner[i]) + repl); i += find.length; n++;
        } else { out.set(owner[i], out.get(owner[i]) + s[i]); i++; }
      }
      for (const t of ts){ t.textContent = out.get(t); t.setAttribute('xml:space','preserve'); }
    }
    note(doc, `Tekstas "${find}": pakeista ${n} vietose.`);
    return n;
  }


  /* Reguliariojo reiskinio keitimas pastraipos lygmeniu. Naudinga, kai reiksme
     suskaldyta per run'us (pvz. el. pasto placeholderis "incidentai@____.eu"). */
  function replaceRegex(doc, re, repl){
    const d = doc.parts['word/document.xml'];
    let n = 0;
    for (const p of els(d,'p')){
      const ts = els(p,'t');
      if (!ts.length) continue;
      const s = ts.map(t => t.textContent).join('');
      if (!re.test(s)) continue;
      re.lastIndex = 0;
      const out = s.replace(re, (...a) => { n++; return typeof repl === 'function' ? repl(...a) : repl; });
      ts[0].textContent = out;
      ts[0].setAttribute('xml:space','preserve');
      for (let k=1;k<ts.length;k++) ts[k].textContent = '';
    }
    if (n) note(doc, `Regex "${re}": pakeista ${n}.`);
    return n;
  }

  /* ---------- 5. TURINIO (TOC) ATNAUJINIMAS ------------------------------
     Istrynus punktus, TOC puslapiai/irasai pasensta. updateFields priverčia
     Word atnaujinti laukus atidarant faila.                                  */
  async function setUpdateFields(doc){
    const s = await part(doc, 'word/settings.xml');
    if (!s) return false;
    const root = s.documentElement;
    if (!els(root,'updateFields').length){
      const el = s.createElementNS(NS_W, 'w:updateFields');
      el.setAttributeNS(NS_W, 'w:val', 'true');
      root.insertBefore(el, root.firstChild);
    }
    note(doc, 'settings.xml: ijungtas updateFields (Word atnaujins turini atidarant).');
    return true;
  }

  /* ---------- 6. IRASYMAS ------------------------------------------------- */
  /* ---------- GULSTI PRIEDAI - ATSKIRAS FAILAS (2026-10-04, naudotojo sprendimas) ---------------------
     Pages visam dokumentui taiko PIRMOJO skyriaus orientaciją (patikrinta Pages PDF eksportu: DPS LT sąlygų gulsčius 5 ir 6
     priedus rodė stačius, plačias lenteles suspaudė ir nukirpo; subtiekėjų priedas, kurio pirmas skyrius gulsčias, - teisingas).
     Todėl jei pirmas skyrius statmenas, o toliau yra gulsčias skyrius, prasidedantis priedo antrašte, - nuo jo iki dokumento
     pabaigos viskas perkeliama į atskirą dokumentą (jo pirmas skyrius gulsčias). Tekstas nekeičiamas; pagrindinio dokumento turinio
     eilutės, kurių žymės iškeltos, pašalinamos (Word, atnaujindamas laukus, jas pašalintų pats) ir grąžinamos patikrai.
     Grąžina { doc, numeriai, turinys: [tekstai], nuorodos } arba null. NUSTATYMAI.gulstiAtskirai - testams. */
  const NUSTATYMAI = { gulstiAtskirai: true };
  async function atskirkGulsciusPriedus(doc){
    if (!NUSTATYMAI.gulstiAtskirai) return null;
    const skyriai = d => {
      const body = els(d, 'body')[0], v = Array.from(body.childNodes).filter(n => n.nodeType === 1), out = []; let nuo = 0;
      v.forEach((n, i) => {
        const sp = n.localName === 'sectPr' ? n : n.localName === 'p' ? (Array.from(n.childNodes).find(c => c.localName === 'pPr') || { childNodes: [] }) : null;
        const sect = n.localName === 'sectPr' ? n : sp && Array.from(sp.childNodes).find(c => c.localName === 'sectPr');
        if (sect){ out.push({ nuo, iki: i, sect }); nuo = i + 1; }
      });
      return { body, v, out };
    };
    const gulscias = sk => { const pg = els(sk.sect, 'pgSz')[0]; return !!pg && +pg.getAttributeNS(NS_W, 'w') > +pg.getAttributeNS(NS_W, 'h'); };
    const A = doc.parts['word/document.xml'], a = skyriai(A);
    if (a.out.length < 2 || gulscias(a.out[0])) return null;
    const k = a.out.findIndex(gulscias);
    if (k < 1) return null;
    const pirmaEil = sk => a.v.slice(sk.nuo, sk.iki + 1).map(n => n.localName === 'p' ? paraText(n).trim() : '').find(t => t) || '';
    if (!/pried|annex/i.test(pirmaEil(a.out[k]))) return null;
    // kopija - tas pats paketas (antraštės, išnašos, stiliai), iš jos paliekama tik perkeliama dalis
    const B = await open(await save(doc, 'arraybuffer')), b = skyriai(B.parts['word/document.xml']);
    b.v.slice(0, b.out[k].nuo).forEach(n => b.body.removeChild(n));
    const numeriai = [];
    a.out.slice(k).forEach(sk => { const m = pirmaEil(sk).match(/(\d+)\s+priedas\b|Annex\s+(\d+)/i); if (m) numeriai.push(+(m[1] || m[2])); });
    // pagrindiniame - perkeliama dalis šalinama, paskutinio liekančio skyriaus savybės tampa dokumento savybėmis
    const zymes = new Set();
    a.v.slice(a.out[k].nuo).forEach(n => { els(n, 'bookmarkStart').forEach(z => zymes.add(z.getAttributeNS(NS_W, 'name'))); a.body.removeChild(n); });
    const liko = a.out[k - 1].sect; liko.parentNode.removeChild(liko); a.body.appendChild(liko);
    // turinio eilutės ir kitos nuorodos į iškeltas žymes
    const turinys = []; let nuorodos = 0;
    els(A, 'p').forEach(p => {
      const iZyme = els(p, 'hyperlink').some(h => zymes.has(h.getAttributeNS(NS_W, 'anchor'))) ||
                    els(p, 'instrText').some(t => (t.textContent.match(/PAGEREF\s+(\S+)/) || [])[1] && zymes.has(t.textContent.match(/PAGEREF\s+(\S+)/)[1]));
      if (!iZyme) return;
      const st = (els(p, 'pStyle')[0] || { getAttributeNS: () => '' }).getAttributeNS(NS_W, 'val');
      let sdt = false; for (let u = p.parentNode; u; u = u.parentNode) if (u.localName === 'sdtContent'){ sdt = true; break; }
      if (/^TOC|^Turinys/i.test(st) || sdt){ turinys.push(paraText(p).trim()); p.parentNode.removeChild(p); }
      else nuorodos++;
    });
    cleanOrphanBookmarks(A); cleanOrphanBookmarks(B.parts['word/document.xml']);
    return { doc: B, numeriai, turinys, nuorodos };
  }

  /* ---------- PERTEKLINIAI PUSLAPIO LŪŽIAI (2026-10-04, naudotojo prašymas: tuščias puslapis tarp DPS 5 ir 6 priedo) ----------
     Puslapio lūžis, po kurio iki kito skyriaus, prasidedančio nauju puslapiu, ar iki dokumento pabaigos - tik tuščios pastraipos,
     duoda tuščią puslapį (Word ir Pages): naujas skyrius ir taip prasideda naujame puslapyje. Toks lūžis šalinamas, tekstas
     nekeičiamas. Kaip prasideda skyrius, nurodo JO sectPr (pabaigoje) w:type, numatyta - nextPage. Grąžina pašalintų skaičių. */
  function pertekliniaiLuziai(doc){
    const body = els(doc.parts['word/document.xml'], 'body')[0];
    const v = Array.from(body.childNodes).filter(n => n.nodeType === 1);
    const sekc = n => { if (n.localName === 'sectPr') return n; if (n.localName !== 'p') return null;
      const pp = Array.from(n.childNodes).find(c => c.localName === 'pPr'); return pp ? (Array.from(pp.childNodes).find(c => c.localName === 'sectPr') || null) : null; };
    const turinys = n => n.localName !== 'p' || els(n, 't').some(t => t.textContent.trim()) || ['drawing', 'pict', 'object', 'fldSimple'].some(t => els(n, t).length);
    const naujamePuslapyje = i => {            // ar skyrius, prasidedantis po v[i] (v[i] baigia skyrių), prasideda naujame puslapyje
      const kitas = v.slice(i + 1).map(sekc).find(Boolean);
      if (!kitas) return true;                 // dokumento pabaiga - lūžis duotų tuščią paskutinį puslapį
      const t = els(kitas, 'type')[0];
      return !t || t.getAttributeNS(NS_W, 'val') !== 'continuous';
    };
    let n = 0;
    v.forEach((p, i) => {
      if (p.localName !== 'p') return;
      els(p, 'br').filter(b => b.getAttributeNS(NS_W, 'type') === 'page').forEach(br => {
        // po lūžio šioje pastraipoje - joks tekstas ar paveikslas
        const visi = Array.from(p.getElementsByTagNameNS(NS_W, '*')), k = visi.indexOf(br);
        if (visi.slice(k + 1).some(e => (e.localName === 't' && e.textContent.trim()) || ['drawing', 'pict', 'object', 'br'].includes(e.localName) && e !== br)) return;
        let j = i;
        if (!sekc(p)){ j = i + 1; while (j < v.length && v[j].localName === 'p' && !turinys(v[j]) && !sekc(v[j])) j++; }
        const galas = j >= v.length || v[j].localName === 'sectPr';
        if (!galas && (turinys(v[j]) && v[j] !== p)) return;                 // po lūžio - turinys
        if (!galas && !sekc(v[j])) return;
        if (!galas && !naujamePuslapyje(j)) return;                           // kitas skyrius tęsiasi tame pačiame puslapyje
        const r = br.parentNode; r.removeChild(br);
        if (r.localName === 'r' && !Array.from(r.childNodes).some(c => c.nodeType === 1 && c.localName !== 'rPr')) r.parentNode.removeChild(r);
        n++;
      });
    });
    return n;
  }

  /* ---------- DI POŽYMIAI (2026-10-05, DI akto 50 str. 2 d.; shared/di-zymejimas.js) ----------
     Savi Word požymiai docProps/custom.xml (savybes - [{ name, value }]): jei šablone failas jau yra (ND LT/EN SPS - MSIP žymos),
     papildomas (to paties vardo požymis perrašomas, pid - po didžiausio), kitaip sukuriamas su [Content_Types] įrašu ir ryšiu
     _rels/.rels. Grąžina įrašytų požymių skaičių. */
  async function diPozymiai(doc, savybes){
    if (!savybes || !savybes.length) return 0;
    const NS_CP = 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties';
    const NS_VT = 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes';
    const FMT = '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}';
    if (!doc.zip.file('docProps/custom.xml')){
      doc.zip.file('docProps/custom.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="${NS_CP}" xmlns:vt="${NS_VT}"/>`, { createFolders:false });
      const ct = await part(doc, '[Content_Types].xml');
      if (!Array.from(ct.getElementsByTagNameNS(NS_CT, 'Override')).some(o => o.getAttribute('PartName') === '/docProps/custom.xml')){
        const ov = ct.createElementNS(NS_CT, 'Override');
        ov.setAttribute('PartName', '/docProps/custom.xml');
        ov.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.custom-properties+xml');
        ct.documentElement.appendChild(ov);
      }
      const rels = await part(doc, '_rels/.rels');
      const TIPAS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties';
      const rs = Array.from(rels.getElementsByTagNameNS(NS_REL, 'Relationship'));
      if (!rs.some(r => r.getAttribute('Type') === TIPAS)){
        const used = new Set(rs.map(r => r.getAttribute('Id')));
        let j = 1; while (used.has('rId' + j)) j++;
        const rel = rels.createElementNS(NS_REL, 'Relationship');
        rel.setAttribute('Id', 'rId' + j); rel.setAttribute('Type', TIPAS); rel.setAttribute('Target', 'docProps/custom.xml');
        rels.documentElement.appendChild(rel);
      }
    }
    const x = await part(doc, 'docProps/custom.xml'), root = x.documentElement;
    const esami = Array.from(root.getElementsByTagNameNS(NS_CP, 'property'));
    let pid = esami.reduce((m, p) => Math.max(m, parseInt(p.getAttribute('pid'), 10) || 1), 1);
    for (const { name, value } of savybes){
      const senas = esami.find(p => p.getAttribute('name') === name);
      if (senas) senas.parentNode.removeChild(senas);
      const p = x.createElementNS(NS_CP, 'property');
      p.setAttribute('fmtid', FMT); p.setAttribute('pid', String(++pid)); p.setAttribute('name', String(name));
      const v = x.createElementNS(NS_VT, 'vt:lpwstr'); v.textContent = String(value);
      p.appendChild(v); root.appendChild(p);
    }
    note(doc, 'DI požymiai: ' + savybes.length);
    return savybes.length;
  }

  /* ---------- DVIGUBI TARPAI (2026-10-05, naudotojo leidimas redakcinėms korekcijoms) ----------
     Ta pati taisyklė kaip sablonu-taisymai.py J, tik galutiniam tekstui po numeracijos: šablonuose raudonas tekstas (sąlygos,
     nurodymai) neliečiamas - pagal jį randamos vietos, o generuojant jis tampa juodu („nurodytus SPS  7.2. punkte“). Tarp žodžio,
     skaičiaus ar skyrybos 2-3 tarpai -> vienas, 4-6 - tik tarp raidžių ar skaitmenų. Neliečiama: likęs raudonas (neužpildytas
     nurodymas) ir pabrauktas tekstas (pildymo linija), turinys, tarpai prie tabuliacijos, NBSP, „____“, „[   ]“, „(pareigos)
     (parašas)“, 7 ir daugiau tarpų (išdėstymas). Grąžina pašalintų tarpų skaičių. */
  const RAUDONA = ['FF0000', 'C00000', 'ED1C24'], PRIES_TARPA = '.,;:!?)»“”"\'%', PO_TARPO = '(„"\'«–-';
  const ZODIS = /[\p{L}\p{N}]/u, TARPAS = /\s/;
  function dvigubiTarpai(doc){
    let n = 0;
    for (const [vardas, d] of Object.entries(doc.parts || {})){
      if (!/^word\/(document|footnotes|endnotes|header\d*|footer\d*)\.xml$/.test(vardas) || !d || !d.getElementsByTagNameNS) continue;
      for (const p of els(d, 'p')){
        if (els(p, 'txbxContent').length || els(p, 'instrText').some(t => /PAGEREF/.test(t.textContent))) continue;
        const st = els(p, 'pStyle')[0];
        if (st && /^toc/i.test(st.getAttributeNS(NS_W, 'val') || '')) continue;
        const vietos = []; let s = '';
        for (const r of els(p, 'r')){
          const rpr = Array.from(r.childNodes).find(c => c.localName === 'rPr');
          const spalva = rpr && Array.from(rpr.childNodes).find(c => c.localName === 'color');
          const pabr = rpr && Array.from(rpr.childNodes).find(c => c.localName === 'u');
          const zyme = (spalva && RAUDONA.includes((spalva.getAttributeNS(NS_W, 'val') || '').toUpperCase()))
            || (pabr && (pabr.getAttributeNS(NS_W, 'val') || 'single') !== 'none');
          for (const c of Array.from(r.childNodes)){
            if (c.localName === 't'){ const t = c.textContent; for (let i = 0; i < t.length; i++) vietos.push({ el: c, i, zyme }); s += t; }
            else if (['tab', 'ptab', 'br', 'cr', 'drawing', 'pict', 'object', 'sym'].includes(c.localName)){ vietos.push(null); s += '\t'; }
          }
        }
        const salinti = new Map();
        for (const m of s.matchAll(/ {2,}/g)){
          const a = m.index, b = a + m[0].length;
          if (!a || b >= s.length || vietos.slice(a - 1, b + 1).some(v => !v || v.zyme)) continue;
          const pr = s[a - 1], po = s[b];
          if (TARPAS.test(pr) || TARPAS.test(po)) continue;
          const ok = b - a <= 3 ? (ZODIS.test(pr) || PRIES_TARPA.includes(pr)) && (ZODIS.test(po) || PO_TARPO.includes(po)) && !(pr === ')' && po === '(')
            : b - a <= 6 && ZODIS.test(pr) && ZODIS.test(po);
          if (!ok) continue;
          for (let k = a + 1; k < b; k++){ const v = vietos[k]; (salinti.get(v.el) || salinti.set(v.el, new Set()).get(v.el)).add(v.i); }
          n += b - a - 1;
        }
        for (const [el, is] of salinti) el.textContent = el.textContent.split('').filter((c, i) => !is.has(i)).join('');
      }
    }
    return n;
  }

  /* ---------- TURINIO SPRAGOS (2026-10-04, naudotojo prašymas: DPS LT sąlygų turinyje nėra 10 skyriaus) ----------
     Šablone skyriaus antraštė gali būti ne antraštės stiliumi ir be turinio žymės (DPSK_LT_SALYGOS 10 sk. - ListParagraph, kitų
     skyrių - Heading3), tad turinyje jos nėra ir Word jos neįtrauktų net atnaujindamas laukus. Jei numeruota DIDŽIOSIOMIS
     antraštė N (ne lentelėje, ne turinyje) stovi tarp turinyje esančių N-1 ir N+1 skyrių antraščių, o pati turinyje nėra:
     antraštė gauna N-1 antraštės pastraipos ir teksto formatavimą (stilius, lygiavimas, šriftas - kaip kaimyninių skyrių; Pages
     turinį perstato pats pagal stilius, Word - pagal stiliaus turinio lygį) ir turinio žymę, o turinyje po N-1 eilutės įterpiama
     eilutė (N-1 eilutės kopija su antraštės tekstu; puslapis - N+1 eilutės, Word perskaičiuos). Tekstas nekeičiamas.
     Grąžina įterptų turinio eilučių tekstus. */
  function turinioSpragos(doc){
    const d = doc.parts['word/document.xml'], body = els(d, 'body')[0];
    const toc = /^_Toc/;
    const eil = els(d, 'p').filter(p => els(p, 'hyperlink').some(h => toc.test(h.getAttributeNS(NS_W, 'anchor'))) && els(p, 'instrText').some(t => /PAGEREF/.test(t.textContent)));
    if (eil.length < 2) return [];
    const zymes = new Map(els(d, 'bookmarkStart').map(b => [b.getAttributeNS(NS_W, 'name'), b]));
    const pastraipa = b => { let u = b; while (u && u.localName !== 'p') u = u.parentNode; if (u) return u;
      for (u = b.nextSibling; u; u = u.nextSibling) if (u.localName === 'p') return u; return null; };
    const nr = p => (paraText(p).trim().match(/^(\d+)\.(?!\d)/) || [])[1];
    const zinomi = new Map();
    eil.forEach(e => {
      const a = els(e, 'hyperlink').map(h => h.getAttributeNS(NS_W, 'anchor')).find(x => toc.test(x)), b = zymes.get(a), h = b && pastraipa(b), n = h && nr(h);
      if (n && !zinomi.has(n)) zinomi.set(n, { eil: e, h });
    });
    const viduje = (p, tag) => { for (let u = p.parentNode; u && u !== body; u = u.parentNode) if (u.localName === tag) return true; return false; };
    const pPr = p => Array.from(p.childNodes).find(c => c.localName === 'pPr');
    let id = Math.max(0, ...els(d, 'bookmarkStart').map(b => +b.getAttributeNS(NS_W, 'id') || 0));
    const out = [];
    els(body, 'p').forEach(p => {
      if (viduje(p, 'sdtContent') || viduje(p, 'tbl') || eil.includes(p)) return;
      const n = nr(p);
      if (!n || zinomi.has(n)) return;
      const t = paraText(p).trim(), be = t.replace(/^\d+\.\s*/, '');
      if (be.length < 8 || be !== be.toUpperCase() || !/[A-ZĄČĘĖĮŠŲŪŽ]/.test(be)) return;
      const pr = zinomi.get(String(+n - 1)), po = zinomi.get(String(+n + 1));
      if (!pr || !po || !(pr.h.compareDocumentPosition(p) & 4) || !(p.compareDocumentPosition(po.h) & 4)) return;
      // turinio žymė ir eilutė - N-1 eilutės kopija (pirma - jei nepavyktų, antraštė nekeičiama)
      const vardas = '_TocGP' + n + '_' + (++id), bs = d.createElementNS(NS_W, 'w:bookmarkStart'), bz = d.createElementNS(NS_W, 'w:bookmarkEnd');
      bs.setAttributeNS(NS_W, 'w:id', String(id)); bs.setAttributeNS(NS_W, 'w:name', vardas); bz.setAttributeNS(NS_W, 'w:id', String(id));
      const k = pr.eil.cloneNode(true);
      ['paraId', 'textId'].forEach(a => k.removeAttributeNS('http://schemas.microsoft.com/office/word/2010/wordml', a));
      const hl = els(k, 'hyperlink').find(h => toc.test(h.getAttributeNS(NS_W, 'anchor'))), senas = hl.getAttributeNS(NS_W, 'anchor');
      hl.setAttributeNS(NS_W, 'w:anchor', vardas);
      const visi = els(k, '*'), pradzia = visi.findIndex(e => e.localName === 'fldChar' && e.getAttributeNS(NS_W, 'fldCharType') === 'begin');
      const tekstai = visi.slice(0, pradzia < 0 ? visi.length : pradzia).filter(e => e.localName === 't');
      if (!tekstai.length) return;
      tekstai.forEach((e, i) => { e.textContent = i ? '' : t; });
      els(k, 'instrText').forEach(e => { e.textContent = e.textContent.split(senas).join(vardas); });
      const psl = els(po.eil, '*'), sep = psl.findIndex(e => e.localName === 'fldChar' && e.getAttributeNS(NS_W, 'fldCharType') === 'separate');
      const puslapis = sep < 0 ? null : psl.slice(sep).find(e => e.localName === 't');
      const kv = els(k, '*'), ks = kv.findIndex(e => e.localName === 'fldChar' && e.getAttributeNS(NS_W, 'fldCharType') === 'separate');
      const kt = ks < 0 ? null : kv.slice(ks).find(e => e.localName === 't');
      if (kt && puslapis) kt.textContent = puslapis.textContent;
      // formatavimas - kaip N-1 antraštės: pastraipos savybės (be numeracijos; sekcijos lūžis, jei buvo, lieka) ir teksto savybės
      // (paliekami tik akcentai: kursyvas, pabraukimas, spalva ir pan.)
      const senasPPr = pPr(p), naujas = pPr(pr.h) ? pPr(pr.h).cloneNode(true) : d.createElementNS(NS_W, 'w:pPr');
      Array.from(naujas.childNodes).filter(c => ['numPr', 'sectPr', 'pPrChange'].includes(c.localName)).forEach(c => naujas.removeChild(c));
      const sekc = senasPPr && Array.from(senasPPr.childNodes).find(c => c.localName === 'sectPr');
      if (sekc) naujas.appendChild(sekc);
      if (senasPPr) p.replaceChild(naujas, senasPPr); else p.insertBefore(naujas, p.firstChild);
      const pavyzdys = els(pr.h, 'r').find(r => els(r, 't').some(x => x.textContent.trim()));
      const rprP = pavyzdys && Array.from(pavyzdys.childNodes).find(c => c.localName === 'rPr');
      const AKCENTAI = ['i', 'iCs', 'u', 'strike', 'dstrike', 'vertAlign', 'highlight', 'color'];
      els(p, 'r').forEach(r => {
        const sen = Array.from(r.childNodes).find(c => c.localName === 'rPr'), nauj = rprP ? rprP.cloneNode(true) : d.createElementNS(NS_W, 'w:rPr');
        if (sen) Array.from(sen.childNodes).filter(c => AKCENTAI.includes(c.localName) && !Array.from(nauj.childNodes).some(x => x.localName === c.localName)).forEach(c => nauj.appendChild(c.cloneNode(true)));
        if (sen) r.replaceChild(nauj, sen); else r.insertBefore(nauj, r.firstChild);
      });
      p.insertBefore(bs, naujas.nextSibling); p.appendChild(bz);
      pr.eil.parentNode.insertBefore(k, pr.eil.nextSibling);
      zinomi.set(n, { eil: k, h: p });
      out.push(t);
    });
    return out;
  }

  /* ---------- SULIETI PUNKTAI (2026-10-04, naudotojo prašymas: DPS LT sąlygų 10.3 punktas 10.2 pastraipoje) ----------
     Šablone kito punkto numeris kartais įrašytas tos pačios pastraipos viduryje („... dokumentais. 10.3. Tiekėjas ...“): punktas
     neatskirtas, o numeracija (GPNum) jo nemato ir kitus punktus pernumeruoja vienu mažiau (DPS LT: 10.4 tapdavo 10.3 - du 10.3).
     Jei pastraipa (ne lentelėje) prasideda numeriu N (pvz. 10.2), o po sakinio pabaigos eina KITAS to paties lygio numeris
     (10.3) ir sakinys didžiąja raide, pastraipa skaidoma prieš jį; abi dalys - tos pačios pastraipos savybės (skyriaus lūžis
     lieka antrojoje). Tekstas nekeičiamas (pašalinamas tik tarpas pirmos dalies gale). Kviečiama PRIEŠ GPNum. Grąžina numerius. */
  function sulietiPunktai(doc){
    const d = doc.parts['word/document.xml'], body = els(d, 'body')[0], out = [];
    const DID = 'A-ZĄČĘĖĮŠŲŪŽ';
    const ilgis = n => els(n, 't').reduce((a, t) => a + t.textContent.length, 0) + (n.localName === 't' ? n.textContent.length : 0);
    function skaidyk(p, poz){
      let o = 0, kur = null;
      for (const c of Array.from(p.childNodes)){
        if (c.nodeType !== 1 || c.localName === 'pPr') continue;
        const l = ilgis(c);
        if (o + l > poz){ kur = { c, vid: poz - o }; break; }
        o += l;
      }
      if (!kur || kur.c.localName !== 'r') return null;
      const naujas = d.createElementNS(NS_W, 'w:p'), pPr = Array.from(p.childNodes).find(c => c.localName === 'pPr');
      if (pPr){
        const k = pPr.cloneNode(true), ks = Array.from(k.childNodes).find(c => c.localName === 'sectPr');
        if (ks) k.removeChild(ks);
        const os = Array.from(pPr.childNodes).find(c => c.localName === 'sectPr');
        if (os){ pPr.removeChild(os); k.appendChild(os); }
        naujas.appendChild(k);
      }
      let pirmas = kur.c;
      if (kur.vid > 0){                                    // runas skeliamas: likusi dalis - kopijoje su tomis pačiomis savybėmis
        const r = kur.c, kop = r.cloneNode(false), rPr = Array.from(r.childNodes).find(c => c.localName === 'rPr');
        if (rPr) kop.appendChild(rPr.cloneNode(true));
        let oo = 0;
        Array.from(r.childNodes).filter(c => c.nodeType === 1 && c.localName !== 'rPr').forEach(c => {
          const l = c.localName === 't' ? c.textContent.length : 0;
          if (oo >= kur.vid) kop.appendChild(c);
          else if (c.localName === 't' && oo + l > kur.vid){
            const t2 = c.cloneNode(false); t2.setAttribute('xml:space', 'preserve'); t2.textContent = c.textContent.slice(kur.vid - oo);
            c.textContent = c.textContent.slice(0, kur.vid - oo); c.setAttribute('xml:space', 'preserve'); kop.appendChild(t2);
          }
          oo += l;
        });
        r.parentNode.insertBefore(kop, r.nextSibling);
        pirmas = kop;
      }
      for (let n = pirmas; n; ){ const kitas = n.nextSibling; naujas.appendChild(n); n = kitas; }
      const paskutinis = els(p, 't').pop();
      if (paskutinis) paskutinis.textContent = paskutinis.textContent.replace(/\s+$/, '');
      p.parentNode.insertBefore(naujas, p.nextSibling);
      return naujas;
    }
    els(body, 'p').filter(p => p.parentNode === body).forEach(p => {
      for (let q = p, apsauga = 0; q && apsauga < 20; apsauga++){
        const t = paraText(q), m = t.match(/^\s*(\d+(?:\.\d+)+)\.?/);
        if (!m) break;
        const dalys = m[1].split('.'), kitas = dalys.slice(0, -1).concat(+dalys[dalys.length - 1] + 1).join('.');
        const mm = new RegExp('[.;:]\\s+(' + kitas.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.?)\\s+[' + DID + ']').exec(t.slice(m[0].length));
        if (!mm) break;
        const nq = skaidyk(q, m[0].length + mm.index + mm[0].indexOf(mm[1]));
        if (!nq) break;
        out.push(kitas);
        q = nq;
      }
    });
    return out;
  }

  /* ---------- GENERAVIMO PASAS (2026-10-06, pirkimo sąlygų tikrinimas; naudotojo sprendimas) ----------
     Atskira customXml dalis (vardų erdvė https://g-procure.com/pasas/1, shared/palyginimas.js pasoXml): šablono kodas, formos
     maiša, data ir GALUTINIO dokumento pastraipų maišos - be atsakymų (juose yra numatoma vertė, o failas skelbiamas CVP IS).
     Tikrinant parengtą dokumentą („Tikrinti parengtus dokumentus“) pagal pasą tiksliai matoma, kas pakeista PO generavimo.
     Kviečiama PASKUTINĖ, kai dokumento tekstas nebesikeičia. Šablonuose jau yra customXml/item1.xml (bibliografija) - imamas
     kitas laisvas numeris; jei paso dalis jau yra (generuota iš sugeneruoto failo) - ji perrašoma. Grąžina pastraipų skaičių. */
  async function pasas(doc, info){
    const P = (typeof window !== 'undefined' && window.GP_PALYGINIMAS) || null;
    if (!P) return 0;
    const ps = P.pastraipos(doc.parts['word/document.xml']);
    const xml = P.pasoXml(info || {}, ps);
    let n = 0;
    for (let k = 1; k < 100; k++){
      const f = doc.zip.file(`customXml/item${k}.xml`);
      if (!f){ if (!n) n = k; break; }
      if ((await f.async('string')).indexOf(P.NS_PASAS) >= 0){ n = k; break; }
    }
    if (!n) return 0;
    const yra = !!doc.zip.file(`customXml/item${n}.xml`);
    doc.zip.file(`customXml/item${n}.xml`, xml, { createFolders:false });
    if (!yra){
      const id = '{' + 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]) + '}';
      doc.zip.file(`customXml/itemProps${n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<ds:datastoreItem ds:itemID="${id}" xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml"><ds:schemaRefs><ds:schemaRef ds:uri="${P.NS_PASAS}"/></ds:schemaRefs></ds:datastoreItem>`, { createFolders:false });
      doc.zip.file(`customXml/_rels/item${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS_REL}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps" Target="itemProps${n}.xml"/></Relationships>`, { createFolders:false });
      const ct = await part(doc, '[Content_Types].xml');
      const ovs = Array.from(ct.getElementsByTagNameNS(NS_CT, 'Override'));
      if (!ovs.some(o => o.getAttribute('PartName') === `/customXml/itemProps${n}.xml`)){
        const ov = ct.createElementNS(NS_CT, 'Override');
        ov.setAttribute('PartName', `/customXml/itemProps${n}.xml`);
        ov.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.customXmlProperties+xml');
        ct.documentElement.appendChild(ov);
      }
      // xml plėtinys - Default application/xml (visuose šablonuose yra); jei nėra - Override
      const defs = Array.from(ct.getElementsByTagNameNS(NS_CT, 'Default'));
      if (!defs.some(d => (d.getAttribute('Extension') || '').toLowerCase() === 'xml')){
        const ov = ct.createElementNS(NS_CT, 'Override');
        ov.setAttribute('PartName', `/customXml/item${n}.xml`); ov.setAttribute('ContentType', 'application/xml');
        ct.documentElement.appendChild(ov);
      }
      const rels = await part(doc, 'word/_rels/document.xml.rels');
      if (rels){
        const rs = Array.from(rels.getElementsByTagNameNS(NS_REL, 'Relationship'));
        const used = new Set(rs.map(r => r.getAttribute('Id')));
        let j = 1; while (used.has('rId' + j)) j++;
        const rel = rels.createElementNS(NS_REL, 'Relationship');
        rel.setAttribute('Id', 'rId' + j);
        rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml');
        rel.setAttribute('Target', `../customXml/item${n}.xml`);
        rels.documentElement.appendChild(rel);
      }
    }
    note(doc, 'generavimo pasas: ' + ps.length + ' pastraipų');
    return ps.length;
  }

  async function save(doc, type='blob'){
    for (const [path, xml] of Object.entries(doc.parts)){
      // createFolders:false - kitaip JSZip prideda kataloginius irasus ("word/"),
      // kuriu Word'o pakuoteje nera ir kuriems nera Content_Types irašo.
      doc.zip.file(path, ser.serializeToString(xml), { createFolders:false });
    }
    return doc.zip.generateAsync({ type, compression:'DEFLATE' });
  }

  return { open, part, save, stripComments, fillTags, deleteParagraphs, replaceText, deleteNumberedTable, deleteTableByCaption,
           setUpdateFields, deleteTableAfter, tables, cleanOrphanBookmarks, replaceRegex, insertLogo, antrastejePaveikslas, antrastesLogotipas, pirmoPuslapioAntraste, atskirkGulsciusPriedus, pertekliniaiLuziai, turinioSpragos, sulietiPunktai, dvigubiTarpai, diPozymiai, pasas,
           NUSTATYMAI, paraText, els, NS_W };
})();

/* ==========================================================================
   GPMap - sablono kartografavimas
   --------------------------------------------------------------------------
   PRINCIPAS: kartografas nieko nesprendzia uz zmogu. Jis tik SURANDA visas
   vietas, kurias sablono autoriai pazymejo (raudonas tekstas, komentarai,
   tuscios vietos), ir pasiulo bloku ribas. Ribas patvirtina ekspertas -
   vienareiksmiskai, viena karta. Generavimo metu nera jokio speliojimo.
   ========================================================================== */
const GPMap = (() => {
  const W = GPDocx.NS_W;
  const RED = ['FF0000','C00000','ED1C24'];
  const COND_RE    = /^[\s.,;]*(jei|jeigu|kai)\b/i;   // toleruojam klaidinga skyrybos zenkla pradzioje
  const COND_RE_EN = /^[\s.,;]*(if|where|when|in case)\b/i;   // dvikalbese formose salyga rasoma ir angliskai
  const BLANK_RE = /_+|\[[^\]]{4,}\]/;   // ir viengubas bruksnys ('SPS _ dalyje') yra tuscia vieta

  // "nenumatoma" vs "numatoma", "neskaidomas" vs "skaidomas" - priesingu poru radimas
  const norm = s => s.toLowerCase()
    .replace(/[ąàá]/g,'a').replace(/[čć]/g,'c').replace(/[ęėé]/g,'e').replace(/[įí]/g,'i')
    .replace(/š/g,'s').replace(/[ųūú]/g,'u').replace(/ž/g,'z').replace(/[^a-z ]/g,' ')
    .replace(/\s+/g,' ').trim();

  function isNegationPair(a, b){
    const wa = norm(a).split(' '), wb = norm(b).split(' ');
    const sa = new Set(wa), sb = new Set(wb);
    for (const w of wa){
      if (w.length < 5) continue;
      if (!sb.has(w) && (sb.has('ne'+w) || [...sb].some(x => x === 'ne'+w))) return true;
    }
    for (const w of wb){
      if (w.length < 5) continue;
      if (!sa.has(w) && sa.has('ne'+w)) return true;
    }
    return false;
  }

  const COND_SU_DVITASKIU = /^[\s.,;]*(jei|jeigu|kai|if|where|when|in case)\b[\s\S]*:\s*$/i;
  function raudonasRuno(p){
    let out = '';
    for (const r of GPDocx.els(p,'r')){
      const t = GPDocx.els(r,'t').map(x => x.textContent).join('');
      if (!t.trim()) continue;
      const rpr = r.getElementsByTagNameNS(W,'rPr')[0];
      const col = rpr && rpr.getElementsByTagNameNS(W,'color')[0];
      const v = col ? (col.getAttributeNS(W,'val')||'').toUpperCase() : '';
      if (RED.includes(v)) out += t;
    }
    return out.trim();
  }
  /* Ne raudonu runu tekstas (numeriui pries raudona salyga atpazinti). */
  function juodasRuno(p){
    let out = '';
    for (const r of GPDocx.els(p,'r')){
      const t = GPDocx.els(r,'t').map(x => x.textContent).join('');
      const rpr = r.getElementsByTagNameNS(W,'rPr')[0];
      const col = rpr && rpr.getElementsByTagNameNS(W,'color')[0];
      const v = col ? (col.getAttributeNS(W,'val')||'').toUpperCase() : '';
      if (!RED.includes(v)) out += t;
    }
    return out.trim();
  }

  function runState(p){
    let reds = 0, tot = 0;
    for (const r of GPDocx.els(p,'r')){
      const t = GPDocx.els(r,'t').map(x => x.textContent).join('');
      if (!t.trim()) continue;
      tot++;
      const rpr = r.getElementsByTagNameNS(W,'rPr')[0];
      const col = rpr && rpr.getElementsByTagNameNS(W,'color')[0];
      const val = col ? (col.getAttributeNS(W,'val')||'').toUpperCase() : '';
      if (RED.includes(val)) reds++;
    }
    if (!tot) return 'empty';
    if (reds === tot) return 'red';
    if (reds) return 'inline';
    return 'black';
  }

  /* --- 1. Nuskaitom kiekviena pastraipa su visais pozymiais --------------- */
  function scanParagraphs(doc){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(W,'body')[0];
    const paras = GPDocx.els(body,'p');
    const spans = {};            // komentaro id -> {start,end}
    const out = [];

    paras.forEach((p, i) => {
      for (const s of GPDocx.els(p,'commentRangeStart'))
        (spans[s.getAttributeNS(W,'id')] ||= {}).start = i;
      for (const e of GPDocx.els(p,'commentRangeEnd'))
        (spans[e.getAttributeNS(W,'id')] ||= {}).end = i;

      const txt = GPDocx.paraText(p).trim();
      const numPr = p.getElementsByTagNameNS(W,'numPr')[0];
      const ilvlEl = numPr && numPr.getElementsByTagNameNS(W,'ilvl')[0];
      const pStyle = p.getElementsByTagNameNS(W,'pStyle')[0];
      const style = pStyle ? (pStyle.getAttributeNS(W,'val')||'') : '';
      const ilvl = ilvlEl ? parseInt(ilvlEl.getAttributeNS(W,'val'),10) : null;

      // ar pastraipa lenteleje?
      let inTable = false, up = p.parentNode;
      while (up && up.localName !== 'body'){ if (up.localName === 'tbl'){ inTable = true; break; } up = up.parentNode; }

      let st = runState(p), tekstas = txt;
      // RANKA IRASYTAS NUMERIS PRIES SALYGA (AKV_LT_SPS 4.1 p., 2026-10-03): juodai tik
      // "4.1.", raudonai "Jei ...:". Tai ne sulieta salyga - nuostata eina kitose
      // pastraipose - o SALYGA su numeriu, kaip numeruota (numPr) zaliuju alternatyva
      // kituose sablonuose. Klausimas - be numerio; numeri generatorius perkelia i
      // pirma likusia turinio pastraipa (GPGen.perkeltiNumeri).
      const raud0 = st === 'inline' ? raudonasRuno(p) : '';
      const juoda = raud0 ? juodasRuno(p) : '';
      const numerisTekstu = raud0 && COND_SU_DVITASKIU.test(raud0) && /^\d+(\.\d+)*\.?$/.test(juoda) ? juoda : null;
      if (numerisTekstu){ st = 'red'; tekstas = raud0; }
      // SULIETA SALYGA: dalis sablonu (MVP dvikalbis) salygos antraste iraso i TA
      // PACIA pastraipa kaip nuostata: raudonai "Jei X:" + juodai pati nuostata.
      // Tokia salyga valdo savo pacios pastraipa: itraukiant - raudona antraste
      // trinama, nuostata lieka; neitraukiant - trinama visa pastraipa.
      const raud = st === 'inline' ? raud0 : '';
      const sulieta = !!raud && COND_SU_DVITASKIU.test(raud);
      const numeruota = !!numPr || !!numerisTekstu;
      out.push({
        i, text: tekstas, state: st, style, ilvl, inTable,
        sulieta, raudonas: raud,
        klausimasTekstas: sulieta ? raud.replace(/[:\s]+$/,'').replace(/^[\s.,;]+/,'') : null,
        numbered: numeruota,
        numerisTekstu,
        heading: (!!numPr && ilvl === 0) || /heading|antra/i.test(style),
        // Salygos antraste paprastai NEnumeruota. Bet sablone pasitaiko ir
        // numeruotu (pvz. zaliuju alternatyva) - tokia laikom salyga tik jei ji
        // baigiasi dvitaskiu, t. y. aiskiai iveda toliau einancius punktus.
        cond:   st === 'red' && (COND_RE.test(tekstas) || COND_RE_EN.test(tekstas)) && tekstas.length > 8
                && (!numeruota || /:\s*$/.test(tekstas)),
        condEN: st === 'red' && COND_RE_EN.test(tekstas) && tekstas.length > 8 && (!numeruota || /:\s*$/.test(tekstas)),
        blank: BLANK_RE.test(tekstas),
        comments: []
      });
    });

    for (const [id, s] of Object.entries(spans)){
      if (s.start == null) continue;
      for (let i = s.start; i <= (s.end ?? s.start); i++) out[i]?.comments.push(id);
    }
    return out;
  }

  /* --- 2. Komentaru tekstai ---------------------------------------------- */
  async function readComments(doc){
    const c = await GPDocx.part(doc, 'word/comments.xml');
    if (!c) return {};
    const map = {};
    for (const el of Array.from(c.getElementsByTagNameNS(W,'comment'))){
      map[el.getAttributeNS(W,'id')] = {
        id: el.getAttributeNS(W,'id'),
        author: el.getAttributeNS(W,'author') || '',
        text: GPDocx.els(el,'p').map(p => GPDocx.paraText(p)).join(' ').trim()
      };
    }
    return map;
  }

  /* --- 3. Bloku ribu PASIULYMAS (galutinai tvirtina zmogus) ---------------
     Blokas = pastraipos po salygos antrastes iki artimiausio "stabdzio":
     kitos salygos antrastes, skyriaus antrastes, lenteles pradzios ar
     raudonos redakcines pastabos. Kur stabdis nera kita salyga - riba
     laikoma NEPATIKIMA (over-capture rizika) ir teikiama tvirtinti pirmiausia.
     -------------------------------------------------------------------- */
  function proposeBlocks(paras){
    const conds = paras.filter(p => p.cond);
    const blocks = [];

    // Sulietos salygos - kiekviena valdo savo pastraipa (blokas = ji pati).
    paras.filter(p => p.sulieta).forEach(p => {
      blocks.push({
        id: 'S' + p.i, i: p.i, tipas: 'saka', sulieta: true,
        condEN: /^[\s.,;]*(if|where|when|in case)\b/i.test(p.raudonas),
        klausimas: p.klausimasTekstas,
        blokas: { nuo: p.i, iki: p.i }, pastraipu: 1,
        stabdis: 'sulieta i viena pastraipa', pora: null,
        ribos: 'sulieta', patvirtinta: false
      });
    });
    conds.forEach((c, k) => {
      let from = c.i + 1, to = c.i, stop = 'dokumento pabaiga';
      for (let j = c.i + 1; j < paras.length; j++){
        const p = paras[j];
        if (!p.text){ continue; }
        if (p.cond){ stop = 'kita salyga'; break; }
        if (p.heading){ stop = 'skyriaus antraste'; break; }
        // Pastraipa, kurioje tik VIENALYPIS numeris ("2.", "14.") - tai skyriaus
        // numeris, ne turinys; blokas ties ja baigiasi. Daugialypis ("2.8.1.")
        // yra saraso elemento numeris ir blokui priklauso.
        if (/^\d+\.?$/.test(p.text)){ stop = 'skyriaus numeris'; break; }
        if (p.inTable && !paras[c.i].inTable){ stop = 'lentele'; break; }
        if (p.state === 'red' && !p.numbered){ stop = 'raudona pastaba'; break; }
        to = j;
      }
      const next = conds[k+1];
      const pair = next && isNegationPair(c.text, next.text) && next.i === to + 1;
      // Bloko TIPAS: ne kiekviena raudona "Jei" yra saka.
      //  saka    - valdo pastraipas (itraukti / neitraukti)
      //  lentele - valdo istisa lentele ("3 lentele paliekama, kitu atveju - istrinama")
      //  pastaba - tik nurodymas rengejui, nieko netrina (pvz. "reikalavimai nustatomi kiekvienai daliai")
      const tl = c.text.toLowerCase();
      const tipas = /lentel/.test(tl) && /(palieka|istrina|ištrina|trinam)/.test(tl) ? 'lentele'
                  : /lentel/.test(tl) ? 'pastaba' : 'saka';
      blocks.push({
        id: 'C' + c.i,
        i: c.i,
        tipas,
        condEN: !!c.condEN,
        klausimas: c.text.replace(/[:\s]+$/,''),
        blokas: to >= from ? { nuo: from, iki: to } : null,
        pastraipu: Math.max(0, to - from + 1),
        stabdis: stop,
        pora: pair ? 'C' + next.i : null,
        // ribos patikimumas: tik "kita salyga" stabdis reiskia, kad blokas
        // beveik tikrai baigiasi ties alternatyva. Visa kita - tikrinti.
        ribos: (stop === 'kita salyga') ? 'siulomos' : 'TIKRINTI',
        patvirtinta: false
      });
    });

    blocks.sort((a, b) => a.i - b.i);

    // Angliskai salygai TIK PAZYMIM artimiausia ankstesne lietuviska salyga kaip
    // KANDIDATA i dvynius. Nepriskiriam jos tipo automatiskai: MVP dvikalbiame
    // anglisku lenteliu taisykle neturi lietuviskos poros, ir "artimiausia
    // ankstesne" butu buvusi visai kita salyga (pastaba) - butu trynusi ne ta.
    // Galutinai sprendzia ekspertiniu sprendimu lentele (zemelapiai/perziura.json).
    let pask = null;
    blocks.forEach(b => {
      if (b.condEN && pask) b.dvynysKandidatas = pask.klausimasLT || pask.klausimas;
      else if (!b.condEN) pask = b;
    });
    return blocks;
  }

  /* --- 3b. ALTERNATYVU GRUPES ---------------------------------------------
     Salygos daznai eina grandine ir viena kita PANEIGIA (pvz. kvalifikacija:
     "tik laimetojo pasalinimo pagrindai" / "tik laimetojo kvalifikacija" /
     "visu Tiekeju"). Itraukus dvi tokias - dokumentas prestoretu pats sau.
     Grupuojam gretimas salygas, kuriu tekstai dalijasi >=2 reiksminiais
     zodziais. Tai PASIULYMAS - grupes tvirtina ekspertas kartografe.        */
  const STOP = new Set(['pirkimas','pirkimo','pirkime','pirkimui','jeigu','siame','taikomas','taikoma']);
  function reiksm(t){
    return new Set(norm(t).split(' ').filter(w => w.length >= 5 && !STOP.has(w)));
  }

  /* VIENETAS: ta pati salyga sablone gali kartotis kelis kartus ir valdyti
     skirtingus punktus (ypac dvikalbiuose - "Jei numatoma kviesti stebetojus"
     stovi dukart). Tai VIENAS klausimas, valdantis kelis blokus - ne dvi
     alternatyvos. Sumaisius, is dokumento dingtu punktas, kuris turi likti.  */
  function vienetai(sakos){
    const out = [];
    let paskLT = null;
    sakos.forEach(b => {
      // Angliska salyga ("If the object ... is divided into parts") yra tos pacios
      // salygos dvynys, ne atskiras klausimas - priskiriam artimiausiam LT vienetui.
      if (b.condEN && paskLT){
        paskLT.nariai.push(b);
        b.vienetas = paskLT.id;
        b.dvynys = 'EN';
        return;
      }
      const key = norm(b.klausimas);
      let v = out.find(x => x.key === key);
      if (!v){ v = { id:'V' + (out.length+1), key, tekstas:b.klausimas, nariai:[] }; out.push(v); }
      v.nariai.push(b);
      b.vienetas = v.id;
      if (!b.condEN) paskLT = v;
    });
    return out;
  }

  /* GRUPES: gretimi vienetai, kurie vienas kita paneigia arba dalijasi >=2
     reiksminiais zodziais. Gretimumas skaiciuojamas PRALEIDZIANT tuscias
     pastraipas - kitaip dvikalbiuose sablonuose grandine nutruksta.          */
  function grupuoti(blocks, paras){
    const sakos = blocks.filter(b => b.tipas === 'saka');
    const vien = vienetai(sakos);
    // Gretimumui tuscia pastraipa IR skyriaus numeris ("2.") laikomi ne turiniu:
    // kitaip alternatyvu grandine nutruktu ties numeracijos artefaktu.
    const NUM_ONLY = /^\d+\.?$/;
    const tarpasTuscias = (a, b) => {
      for (let i = a; i < b; i++){
        const t = paras[i] && paras[i].text;
        if (t && !NUM_ONLY.test(t)) return false;
      }
      return true;
    };
    const pabaiga = v => Math.max(...v.nariai.map(n => n.blokas ? n.blokas.iki : n.i));
    const pradzia = v => Math.min(...v.nariai.map(n => n.i));

    let gid = 0;
    for (let i = 0; i < vien.length; i++){
      const a = vien[i];
      if (a.grupe) continue;
      const wa = reiksm(a.tekstas);
      const nariai = [a];
      for (let j = i + 1; j < vien.length; j++){
        const b = vien[j];
        if (b.grupe) break;
        const last = nariai[nariai.length - 1];
        if (!tarpasTuscias(pabaiga(last) + 1, pradzia(b))) break;   // tarp ju yra turinio
        const bendri = [...reiksm(b.tekstas)].filter(w => wa.has(w)).length;
        if (bendri >= 2 || isNegationPair(a.tekstas, b.tekstas)){
          nariai.push(b); [...reiksm(b.tekstas)].forEach(w => wa.add(w));
        } else break;
      }
      if (nariai.length > 1){
        gid++;
        nariai.forEach(v => { v.grupe = 'G' + gid; v.nariai.forEach(n => { n.grupe = 'G' + gid; }); });
      }
    }
    return vien;
  }

  function raudonasTekstas(doc, i){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(W,'body')[0];
    const p = GPDocx.els(body,'p')[i];
    if (!p) return '';
    let out = '';
    for (const r of GPDocx.els(p,'r')){
      const t = GPDocx.els(r,'t').map(x => x.textContent).join('');
      if (!t.trim()) continue;
      const rpr = r.getElementsByTagNameNS(W,'rPr')[0];
      const col = rpr && rpr.getElementsByTagNameNS(W,'color')[0];
      const v = col ? (col.getAttributeNS(W,'val')||'').toUpperCase() : '';
      if (RED.includes(v)) out += t;
    }
    return out.trim();
  }

  async function scan(doc){
    const paras = scanParagraphs(doc);
    const comments = await readComments(doc);
    const blocks = proposeBlocks(paras);
    const vien = grupuoti(blocks, paras);
    const notes   = paras.filter(p => p.state === 'red' && !p.cond && p.text);
    // Intarpui butina zinoti, kas TIKSLIAI yra raudona: kai kuriuose sablonuose
    // salyga ir nuostata sulietos i viena pastraipa ("Jei ... : Pirkimo objektas...").
    // Be to, raudona salygos antraste NIEKADA negali tapti dokumento tekstu.
    const inlines = paras.filter(p => p.state === 'inline').map(p => ({
      ...p, raudonas: raudonasTekstas(doc, p.i)
    }));
    // Tuscia vieta yra tuscia vieta ir RAUDONAME punkte (pasirenkamoje nuostatoje).
    // Anksciau ju nerinkom - vartotojas neturedavo kur uzpildyti, o auditas
    // teisingai skusdavosi, kad liko neuzpildyta vieta.
    const blanks  = paras.filter(p => p.blank);
    const komTaisykles = Object.values(comments).map(c => ({
      ...c,
      pastraipos: paras.filter(p => p.comments.includes(c.id)).map(p => p.i),
      inkaras: (paras.find(p => p.comments.includes(c.id))?.text || '').slice(0,80)
    }));
    return { paras, blocks, vienetai: vien.map(v => ({ id:v.id, tekstas:v.tekstas, grupe:v.grupe||null,
             blokai: v.nariai.map(n => n.id) })), notes, inlines, blanks, komentarai: komTaisykles };
  }

  return { scan, scanParagraphs, readComments, proposeBlocks, grupuoti, runState };
})();

/* ==========================================================================
   GPGen - generavimas pagal patvirtinta zemelapi + GPAudit - baigtumo patikra
   --------------------------------------------------------------------------
   Visos operacijos vykdomos pries PRADINI pastraipu sarasa (snapshot), tad
   indeksai is zemelapio galioja iki pabaigos, nepaisant trynimu.
   ========================================================================== */
const GPGen = (() => {
  const W = GPDocx.NS_W;

  function snapshot(doc){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(W,'body')[0];
    return GPDocx.els(body,'p');
  }

  /* Raudona = nurodymas rengejui. Punktas, kuris LIEKA dokumente, privalo
     tapti juodas - kitaip liks nurodymo spalva galutiniame dokumente.       */
  function juodinti(paras, idx){
    let n = 0;
    for (const i of idx){
      const p = paras[i]; if (!p) continue;
      for (const c of GPDocx.els(p,'color')){
        c.setAttributeNS(W,'w:val','auto'); n++;
      }
    }
    return n;
  }

  function trinti(paras, idx){
    let n = 0;
    for (const i of idx){
      const p = paras[i];
      if (!p || !p.parentNode) continue;
      if (p.getElementsByTagNameNS(W,'sectPr').length) continue;   // saugiklis
      const tc = p.parentNode;
      if (tc.localName === 'tc' && Array.from(tc.children).filter(c => c.localName==='p').length === 1){
        while (p.firstChild) p.removeChild(p.firstChild);
      } else {
        p.parentNode.removeChild(p);
      }
      n++;
    }
    return n;
  }

  /* SALYGOS NUMERIS (2026-10-03). Kai kur salygos antraste pati turi punkto numeri: LT SPS
     zaliuju alternatyva "4.1." - sablono numeracija (numPr), AKV_LT_SPS - ranka irasytas
     "4.1." pries raudona "Jei ...:". Antraste visada trinama, tad iki tol pasirinkta nuostata
     likdavo BE numerio (visuose LT SPS 4 skyriuje). Word'e rengejas istrintu antrastes
     teksta su pastraipos zenklu - nuostata perimtu numeruotos pastraipos formata. Taip ir
     cia: pirma LIEKANTI turinio pastraipa gauna antrastes pastraipos savybes (pPr su
     numeracija) ir ranka irasyta numeri. Ieskoma tik iki kito numeruoto punkto, antrastes
     ar lenteles ribos; neradus (visos alternatyvos atmestos) numeris dingsta su punktu.  */
  const NUMERIS_TEKSTU = /^\d+(\.\d+)*\.?$/;
  const PUNKTO_NUMERIS = /^\d+(\.\d+)+\.?\s/;
  function arRaudonas(r){
    const rpr = r.getElementsByTagNameNS(W,'rPr')[0];
    const col = rpr && rpr.getElementsByTagNameNS(W,'color')[0];
    return ['FF0000','C00000','ED1C24'].includes(col ? (col.getAttributeNS(W,'val')||'').toUpperCase() : '');
  }
  const pPrOf = p => Array.from(p.childNodes).find(c => c.localName === 'pPr') || null;
  const lentelejeP = p => { for (let u = p.parentNode; u; u = u.parentNode) if (u.localName === 'tbl') return u; return null; };
  function perkeltiNumeri(paras, i, trinamos){
    const p = paras[i]; if (!p) return -1;
    const ppr = pPrOf(p);
    const numPr = ppr && ppr.getElementsByTagNameNS(W,'numPr')[0];
    const juodi = GPDocx.els(p,'r').filter(r => !arRaudonas(r));
    const tekstu = juodi.map(r => GPDocx.els(r,'t').map(t => t.textContent).join('')).join('').trim();
    const ranka = NUMERIS_TEKSTU.test(tekstu);
    if (!numPr && !ranka) return -1;
    const lent = lentelejeP(p), saknis = p.ownerDocument.documentElement;
    for (let j = i + 1; j < paras.length; j++){
      const q = paras[j];
      if (!q || trinamos.has(j) || !saknis.contains(q)) continue;     // trinama ar jau pasalinta su eilute
      const t = GPDocx.paraText(q).trim();
      if (!t) continue;
      if (lentelejeP(q) !== lent) return -1;
      const qppr = pPrOf(q);
      const st = qppr && qppr.getElementsByTagNameNS(W,'pStyle')[0];
      if ((qppr && qppr.getElementsByTagNameNS(W,'numPr')[0]) || PUNKTO_NUMERIS.test(t)
          || /heading|antra/i.test(st ? st.getAttributeNS(W,'val') || '' : '')) return -1;   // savas numeris ar kitas skyrius
      // pastraipos savybes - is antrastes, pastraipos zenklo formatas (rPr) - turinio
      const naujas = ppr ? ppr.cloneNode(true) : null;
      if (naujas){
        Array.from(naujas.childNodes).filter(c => c.localName === 'rPr').forEach(c => naujas.removeChild(c));
        const savas = qppr && Array.from(qppr.childNodes).find(c => c.localName === 'rPr');
        if (savas) naujas.appendChild(savas.cloneNode(true));
        if (qppr) q.replaceChild(naujas, qppr); else q.insertBefore(naujas, q.firstChild);
      }
      if (ranka){
        const po = naujas || pPrOf(q);
        let vieta = po ? po.nextSibling : q.firstChild;
        juodi.forEach(r => { q.insertBefore(r.cloneNode(true), vieta); });
        if (!/\s$/.test(juodi.map(r => GPDocx.els(r,'t').map(x => x.textContent).join('')).join(''))){
          const tarpas = q.ownerDocument.createElementNS(W, 'w:r'), tt = q.ownerDocument.createElementNS(W, 'w:t');
          tt.setAttribute('xml:space','preserve'); tt.textContent = ' '; tarpas.appendChild(tt); q.insertBefore(tarpas, vieta);
        }
      }
      return j;
    }
    return -1;
  }

  /* R1 (2026-10-03): numeris tekstu pastraipos pradzioje. SPS 4.2: pasirinkus 2 ar 3 zaliuju reikalavimu varianta,
     antraste „4.2. ... turi atitikti:“ trinama, o jos numeris pereina i pasirinktaji. Formatas - pirmo teksto runo. */
  function idetiNumeri(p, nr){
    if (!p || !nr) return false;
    const r0 = GPDocx.els(p, 'r').find(r => GPDocx.els(r, 't').some(t => t.textContent.trim()));
    const d = p.ownerDocument, r = d.createElementNS(W, 'w:r');
    const rpr = r0 && Array.from(r0.childNodes).find(c => c.localName === 'rPr');
    if (rpr) r.appendChild(rpr.cloneNode(true));
    const t = d.createElementNS(W, 'w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = nr + ' ';
    r.appendChild(t);
    if (r0) r0.parentNode.insertBefore(r, r0); else p.appendChild(r);
    return true;
  }

  /* Salygiskai istrina LENTELES EILUTES (w:tr), kuriu VISOS pastraipos yra
     [nuo, iki] ribose. Skirta salyginiam turinio blokui LENTELEJE (pvz.
     nacionalinio saugumo "5 punktui"): pastraipu trynimas (trinti) tokioje
     vietoje paliktu tuscias eilutes su remeliais, o cia salinama visa eilute.
     SAUGIKLIS: eilute, kuri KERTA riba (turi bent viena pastraipa uz [nuo,iki]),
     NEsalinama - kad neprarastume gretimo, ne salyginio turinio.               */
  function trintiEilutese(paras, nuo, iki){
    const eilutes = new Set();
    for (let i = nuo; i <= iki; i++){
      let cur = paras[i] ? paras[i].parentNode : null;
      while (cur && cur.localName !== 'tr') cur = cur.parentNode;
      if (cur) eilutes.add(cur);
    }
    let n = 0;
    for (const tr of eilutes){
      const idxs = GPDocx.els(tr, 'p').map(p => paras.indexOf(p)).filter(x => x >= 0);
      const visosViduje = idxs.length > 0 && idxs.every(x => x >= nuo && x <= iki);
      if (!visosViduje) continue;                       // eilute kerta riba - saugiai praleidziam
      if (tr.parentNode){ tr.parentNode.removeChild(tr); n++; }
    }
    return n;
  }

  /* Tuscios vietos: "____" arba "[nurodymas]" pakeiciami vartotojo tekstu.  */
  /* Pastraipoje gali buti KELIOS tuscios vietos ("pripazinti __ (_____)").
     Priimam reiksmiu masyva ir uzpildom eiles tvarka; tuscia reiksme palieka
     vieta nepakeista (ir auditas apie ja praneš).                            */
  const VIETA_RE = /_+|\[[^\]]{4,}\]/g;
  // Pabraukimas interneto adreso viduje („draudeju_viesi_duomenys“) - ne pildoma vieta (2026-10-04; iki tol
  // AKV SPS adresas buvo klausiamas kaip du laukai, o patikra ji rodydavo „tuščia“ net uzbaigtame dokumente).
  const ADRESAS_RE = /(https?:\/\/|www\.)[^\s„“"<>]+/gi;
  const adresuSritys = t => { const out = []; let m; ADRESAS_RE.lastIndex = 0; while ((m = ADRESAS_RE.exec(t))) out.push([m.index, m.index + m[0].length]); return out; };
  function vietos(text){
    VIETA_RE.lastIndex = 0;
    const out = [], u = adresuSritys(String(text || '')); let m;
    while ((m = VIETA_RE.exec(text))){
      const s = m.index, e = s + m[0].length;
      if (!u.some(([a, b]) => s >= a && e <= b)) out.push({ start:s, end:e, zyma:m[0] });
    }
    return out;
  }
  /* Teksto keitimai pastraipoje pagal GP_LAUKAI.keitimai() planą (2026-10-04): [{ start, end, tekstas }] pradinio teksto
     pozicijose. Įrašas patenka į runą, kuriam priklauso pirmas keičiamas ženklas (formatavimas išlieka); tuščias
     tekstas - ištrinama (neprivaloma nuoroda be numerio). Tas pats planas rodomas formos peržiūroje. */
  function keisti(paras, i, edits){
    const p = paras[i]; if (!p || !edits || !edits.length) return 0;
    const ts = GPDocx.els(p,'t');
    if (!ts.length) return 0;
    const s = ts.map(t => t.textContent).join('');
    const owner = [];
    ts.forEach(t => { for (let k=0;k<t.textContent.length;k++) owner.push(t); });
    const out = new Map(ts.map(t => [t,'']));
    const E = edits.filter(e => e.start >= 0 && e.end <= s.length && e.end > e.start).sort((a, b) => a.start - b.start);
    let ei = 0, n = 0;
    for (let k=0;k<s.length;k++){
      while (E[ei] && E[ei].start < k) ei++;                           // persidengiantis - praleidžiamas
      const e = E[ei];
      if (e && k === e.start){
        if (e.tekstas){ out.set(owner[k], out.get(owner[k]) + gpBruksniai(e.tekstas)); n++; }
        k = e.end - 1; ei++;
        continue;
      }
      out.set(owner[k], out.get(owner[k]) + s[k]);
    }
    for (const t of ts){ t.textContent = out.get(t); t.setAttribute('xml:space','preserve'); }
    return n;
  }
  function pildyti(paras, i, values){
    const p = paras[i]; if (!p) return 0;
    const ts = GPDocx.els(p,'t');
    if (!ts.length) return 0;
    const s = ts.map(t => t.textContent).join('');
    const vs = vietos(s);
    if (!vs.length) return 0;
    const arr = Array.isArray(values) ? values : [values];
    const owner = [];
    ts.forEach(t => { for (let k=0;k<t.textContent.length;k++) owner.push(t); });
    const out = new Map(ts.map(t => [t,'']));
    let vi = 0, n = 0;
    for (let k=0;k<s.length;k++){
      const v = vs[vi];
      if (v && k === v.start){
        const val = gpBruksniai(arr[vi]||'').trim();
        // Tarpo apsauga: jei tuscia vieta sablone prilipusi prie zodzio (pries
        // ja - raide ar skaitmuo, pvz. "teise_____"), iterpiam tarpa, kad
        // "teise" + "susipazinti" netaptu "teisesusipazinti". Skliaustai, tarpai
        // ar pastraipos pradzia - be tarpo.
        let ins = val;
        if (val && k > 0 && /[\p{L}\p{N}]/u.test(s[k-1])) ins = ' ' + val;
        // Tasko apsauga (2026-09-28): jei po tuscios vietos sablone jau yra taskas, o reiksme baigiasi tasku
        // („Vykdomas [Pasirinkite].“ + „Tarptautinis pirkimas.“), antras taskas nerasomas - iki tol SPS buvo
        // „Vykdomas Tarptautinis pirkimas..“ (daugtaskis „...“ neliečiamas).
        if (ins && s[v.end] === '.' && /[^.]\.$/.test(ins)) ins = ins.slice(0, -1);
        out.set(owner[k], out.get(owner[k]) + (ins || v.zyma));   // tuscia -> paliekam zyma
        if (val) n++;
        k = v.end - 1; vi++;
        continue;
      }
      out.set(owner[k], out.get(owner[k]) + s[k]);
    }
    for (const t of ts){ t.textContent = out.get(t); t.setAttribute('xml:space','preserve'); }
    return n;
  }

  /* ---------- DAUGINIMAS: vienintelis veiksmas, KURIANTIS turini ------------
     Sablonuose fiziskai yra tik DVI daliu eilutes (I ir II). Kai pirkimas
     skaidomas i daugiau daliu, paskutine eilute klonuojama tiek kartu, kiek
     truksta, perrasant romeniska numeri ir uzpildant pavadinima.

     INDEKSAVIMAS. Klonuojama TIK PO snapshot(), tad klonai i paras masyva
     nepatenka ir zemelapio i-indeksai lieka teisingi (paras[i] yra MAZGO
     nuoroda, ne pozicija). Klono NEPASIEKIA indeksu valdomi zingsniai (juodinti,
     trinti, pildyti, intarpai) - VISA ju darba klonui atlieka si funkcija. Visa
     dokumenta apeinantys zingsniai (replaceText, valytiPastraipuZenklus,
     stripComments, auditas) klonus pasiekia, ir taip ir turi buti.
     PRIELAIDA: 'lentele' bloku inkarai visuose 10 SPS sablonu yra UZ paskutines
     daliu eilutes, tad klonai nepatenka tarp inkaro ir jo lenteles (butu
     sugadinta deleteTableAfter antrastes paieska).

     DVI ATMAINOS. LT sablonuose daliu eilute yra body lygio w:p; dvikalbiuose
     ji sedi w:tr, kurioje LT ir EN dvyniai yra gretimuose w:tc - todel ten
     klonuojama EILUTE ir LT+EN pora nusineša kartu.                          */
  const ROMENISKI = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const romeniskas = (n) => ROMENISKI[n-1] || String(n);

  function eilutesProtevis(p){
    let n = p && p.parentNode;
    while (n && n.localName && n.localName !== 'tr'){
      if (n.localName === 'body') return null;
      n = n.parentNode;
    }
    return (n && n.localName === 'tr') ? n : null;
  }

  /* Perrašo pastraipos teksta per sujungta eilute (kaip pildyti). Visas tekstas
     dedamas i pirma w:t - siose eilutese visi runai turi vienoda formatavima. */
  function keistiPastraiposTeksta(p, fn){
    const ts = GPDocx.els(p,'t');
    if (!ts.length) return false;
    const s = ts.map(t => t.textContent).join('');
    if (!s.trim()) return false;
    const naujas = fn(s);
    if (naujas == null || naujas === s) return false;
    ts[0].textContent = naujas;
    ts[0].setAttribute('xml:space','preserve');
    for (let k = 1; k < ts.length; k++) ts[k].textContent = '';
    return true;
  }

  /* Ar pastraipa yra ANGLISKAS dalies dvynys. */
  const angliskaDalis = (s) => /object of procurement|procurement object part/i.test(s);

  /* Daliu eilutes PRIESDELIS iki pavadinimo (su bruksniu ir jo tarpais). Pagal ji
     keiciam pavadinima nepriklausomai nuo to, ar vietoje dar "____", ar jau
     irasytas ankstesnes dalies tekstas. Inkaruota i zinoma sablono formuluote,
     kad pavadinime esantis bruksnys nesuklaidintu.                            */
  const DALIES_PRIESDELIS = /^(\s*(?:[IVX]+\s+Pirkimo objekto dalis|Part\s+[IVX]+\s+of the object of Procurement|[IVX]+\s+Procurement object part)\s*[\u2013\u2014-])\s*/i;
  const TUSCIA_ZYMA = '________________________';

  /* Vienos daliu eilutes (klono ar originalo) sutvarkymas: numeris, pavadinimas,
     skyrybos zenklas gale (";" viduryje, "." paskutinei daliai).              */
  function tvarkytiDali(mazgas, senasNr, naujasNr, d, paskutine){
    // LT atveju klonas PATS yra w:p (els grazina tik palikuonis), dvikalbiuose -
    // w:tr su pastraipomis langeliuose.
    const ps = (mazgas.localName === 'p') ? [mazgas] : GPDocx.els(mazgas,'p');
    for (const p of ps){
      keistiPastraiposTeksta(p, (t) => {
        const en = angliskaDalis(t);
        // EN puseje LT teksto NEDEDAM (produkto savininko sprendimas: laisvam
        // tekstui - AI juodrastis matomame lauke, ne lietuviskas tekstas
        // angliskame dokumente). Tuscias EN -> lieka "____", ir tai pagauna auditas.
        const val = gpBruksniai((en ? d.en : d.lt) || '').trim();
        let x = t;
        if (naujasNr && senasNr && senasNr !== naujasNr){
          x = x.replace(new RegExp('(^|\\s)' + senasNr + '(?=\\s)'), '$1' + naujasNr);
        }
        // Klonuojama PO pildymo, tad pavyzdys jau turi ANKSTESNES dalies
        // pavadinima (ne "____"). Todel keiciam visa teksta po bruksnio, o
        // atsargine iseitis (nepazintas sablonas) - pirma tuscia vieta.
        // Klonas paveldi UZPILDYTA pavyzdi, tad tuscia reiksme NEGALI reiksti
        // "palik kaip yra" - kitaip nauja dalis tyliai gautu ankstesnes dalies
        // pavadinima su nauju numeriu, ir auditas nieko nerastu. Tuscia -> zyma.
        const m = x.match(DALIES_PRIESDELIS);
        if (val)      x = m ? (m[1] + ' ' + val) : x.replace(/_+/, () => val);   // funkcija: „$&“ pavadinime - ne šablonas
        else if (m)   x = m[1] + ' ' + TUSCIA_ZYMA;
        x = x.replace(/[;.\s]+$/, '') + (paskutine ? '.' : ';');
        return x;
      });
    }
  }

  /* i - PASKUTINES esamos dalies pastraipos indeksas paras masyve.
     naujos - [{ nr:3, lt:'pavadinimas', en:'name' }, ...] eiles tvarka.
     Grazina sukurtu daliu skaiciu.                                           */
  function dautiDalis(paras, i, naujos){
    const p = paras[i];
    if (!p || !Array.isArray(naujos) || !naujos.length) return 0;
    const tr = eilutesProtevis(p);
    const sablonas = tr || p;
    const tevas = sablonas.parentNode;
    if (!tevas) return 0;
    const senasNr = (GPDocx.paraText(p).trim().match(/^([IVX]+)\s/) || [])[1] || '';
    let po = sablonas, n = 0;
    for (let k = 0; k < naujos.length; k++){
      const klonas = sablonas.cloneNode(true);
      tevas.insertBefore(klonas, po.nextSibling);
      tvarkytiDali(klonas, senasNr, romeniskas(naujos[k].nr), naujos[k], k === naujos.length - 1);
      po = klonas; n++;
    }
    // Pavyzdine eilute nustojo buti paskutine - jos gale reikia ";", ne ".".
    if (n){
      for (const sp of (tr ? GPDocx.els(tr,'p') : [p])){
        keistiPastraiposTeksta(sp, (t) => t.replace(/[;.\s]+$/, '') + ';');
      }
    }
    return n;
  }

  /* PER-DALI KVALIFIKACIJOS LENTELE. Sablonas PATS nurodo (raudona redakcine
     pastaba pries 2 lentele, visose 5 SPS seimose): "Jeigu Pirkimo objektas
     skaidomas i dalis, 2 lenteleje nurodyti reikalavimai nustatomi kiekvienai
     Pirkimo objekto daliai atskirai (nurodomos atskiros lenteles kiekvienai
     daliai)". Fiziskai sablone yra VIENA kvalifikacijos lentele; kai pirkimas
     skaidomas i N daliu, reikia N (originala pazymim I dalimi, klonuojame
     likusias, kiekviena su savo antrastes zyma "2 lentele (II Pirkimo objekto
     dalis)"). Lentele lieka TUSCIAS karkasas - reikalavimus rengejas pildo pats
     kiekvienai daliai atskirai (PI 59 str. 1 d. -> VPI 47 str. 4 d.); tuscius langelius
     pagauna GPAudit.

     Numeracija: numerio NEKEICIAM (lieka "2 lentele"), tik pridedam dalies zyma.
     Taip nesugadinamos 3/4/5 lenteliu antrastes, deleteTableAfter numerio
     saugiklis (/(\d+)\s*lentel/) nei 28 kryzmines "N lentele" nuorodos (dalis ju
     kituose dokumentuose - PRIEDAI/PASIULYMAS - kur variklis nepernumeruotu).

     Vykdoma VELAI: PO deleteTableAfter (jei rengejas kvalifikacijos netikrina,
     2 lentele istrinta - klonu tada nekuriam) ir PO stripComments/
     cleanOrphanBookmarks (klonai paveldi jau isvalyta originala). Klonuose zymes
     vis tiek nuvalom - dubliuoti bookmark/komentaru ID sugadintu docx.        */
  function nuvalytiKlonoZymes(node){
    for (const tag of ['bookmarkStart','bookmarkEnd','commentReference',
                       'commentRangeStart','commentRangeEnd']){
      for (const e of Array.from(node.getElementsByTagNameNS(W, tag)))
        if (e.parentNode) e.parentNode.removeChild(e);
    }
  }

  function dautiKvalifLenteles(doc){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(W,'body')[0];
    if (!body) return 0;
    // 1. Daliu tapatybes is GYVO dokumento (originalios + dautiDalis klonai).
    //    Skaiciuojam LT eilute; EN dvynys ("Part I of...") sios formuluotes
    //    neatitinka, tad be dvigubo skaiciavimo. Renkam PRIES antrasciu zymejima.
    const dalys = [];
    for (const p of GPDocx.els(body,'p')){
      const m = GPDocx.paraText(p).trim().match(/^([IVX]+)\s+Pirkimo objekto dalis\b/i);
      if (m) dalys.push(m[1].toUpperCase());
    }
    if (dalys.length < 2) return 0;                    // neskaidoma - nieko nedarom
    // 2. Kvalifikacijos lentele: pirma body-lygio w:tbl, kurios ANTRASTES eiluteje
    //    yra "Kvalifikacijos reikalavimas" IR pries kuria stovi "N lentele" antraste.
    //    Antrasciu reikalaujam, nes dvikalbiuose sablonuose yra ir naratyviniu
    //    lenteliu (pvz. "3.2." bendro pasiulymo), kuriu tekste ta pati formuluote
    //    pasitaiko - be antrastes reikalavimo aklas atitikmuo pagautu ne ta lentele.
    const vaikai = Array.from(body.children);
    const antrastePries = (idx) => {
      for (let j = idx - 1; j >= 0; j--){
        if (vaikai[j].localName === 'tbl') return null;
        if (vaikai[j].localName !== 'p') continue;
        const t = GPDocx.paraText(vaikai[j]).trim();
        if (!t) continue;                              // betekste - siekiam gilyn
        return /\d+\s*lentel/i.test(t) ? vaikai[j] : null;   // pirma teksto pastraipa
      }
      return null;
    };
    let tbl = null, caption = null;
    for (let i = 0; i < vaikai.length; i++){
      if (vaikai[i].localName !== 'tbl') continue;
      const eil = Array.from(vaikai[i].getElementsByTagNameNS(W,'tr'));
      const antr = eil.length ? GPDocx.els(eil[0],'t').map(t => t.textContent).join(' ') : '';
      if (!/kvalifikacijos reikalavim/i.test(antr)) continue;
      const cap = antrastePries(i);
      if (cap){ tbl = vaikai[i]; caption = cap; break; }
    }
    if (!tbl || !caption) return 0;                    // istrinta, nera arba be antrastes
    const capText0 = GPDocx.paraText(caption);
    const dvi = capText0.includes('/');                // dvikalbe antraste "2 lentele/Table 2"
    const num = (capText0.match(/(\d+)\s*lentel/i) || [])[1] || '2';
    const etikete = (roman) => {
      const lt = `${num} lentelė (${roman} Pirkimo objekto dalis)`;
      const en = `Table ${num} (Part ${roman} of the object of Procurement)`;
      return dvi ? `${lt}/${en}` : lt;
    };
    const tevas = tbl.parentNode;
    // 3. Originala pazymim pirma dalimi.
    keistiPastraiposTeksta(caption, () => etikete(dalys[0]));
    // 4. Klonuojam {antraste + lentele} kiekvienai kitai daliai.
    let po = tbl, n = 0;
    for (let k = 1; k < dalys.length; k++){
      const capK = caption.cloneNode(true), tblK = tbl.cloneNode(true);
      nuvalytiKlonoZymes(capK); nuvalytiKlonoZymes(tblK);
      keistiPastraiposTeksta(capK, () => etikete(dalys[k]));
      tevas.insertBefore(capK, po.nextSibling);
      tevas.insertBefore(tblK, capK.nextSibling);
      po = tblK; n++;
    }
    return n;
  }

  /* PER-DALI KAINU LENTELES pasiulymo formoje (realaus LITGRID pirkimo pavyzdys:
     kainos lentele kiekvienai daliai, pries kiekviena - antraste
     "I Pirkimo objekto dalis - <pavadinimas>:"). Sablone yra VIENA kainu lentele
     (antrastes eiluteje "Matavimo vienetai"); pries ja - raudona pastaba
     "Koreguojama pagal poreiki:", po jos - zvaigzdiniu pastabu pastraipos.
     Originalas tampa I dalimi; kitoms dalims klonuojama {lentele + uodega}.
     ISNASU nuorodos (w:footnoteReference) klonuose PALIEKAMOS: kelios nuorodos
     i ta pati isnasos apibrezima yra teisetas OOXML ir reiskia ta pati teksta
     (isnasu apibrezimai footnotes.xml nedubliuojami). Bookmark/komentaru zymes
     nuvalomos kaip ir kvalifikacijos lentelese.
     dalys - PILNAS sarasas [{roman:'I', lt:'...', en:'...'}, ...].
     Grazina sukurtu papildomu lenteliu skaiciu.                               */
  function dautiKainuLenteles(doc, dalys){
    if (!Array.isArray(dalys) || dalys.length < 2) return 0;
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(W,'body')[0];
    if (!body) return 0;
    const vaikai = Array.from(body.children);
    let tbl = null, tblIdx = -1;
    for (let i = 0; i < vaikai.length; i++){
      if (vaikai[i].localName !== 'tbl') continue;
      const eil = Array.from(vaikai[i].getElementsByTagNameNS(W,'tr'));
      const antr = eil.length ? GPDocx.els(eil[0],'t').map(t => t.textContent).join(' ') : '';
      if (/matavimo vienetai/i.test(antr)){ tbl = vaikai[i]; tblIdx = i; break; }
    }
    if (!tbl) return 0;                              // formoje kainu lenteles nera (PARAISKA)
    // Uodega: zvaigzdines pastabos, bruksniu eilute, tuscia tarpo pastraipa.
    const uodega = [];
    for (let j = tblIdx + 1; j < vaikai.length; j++){
      if (vaikai[j].localName !== 'p') break;
      const t = GPDocx.paraText(vaikai[j]).trim();
      if (t && !/^\*/.test(t) && !/^_+\s*\.?$/.test(t)) break;
      uodega.push(vaikai[j]);
      if (/^_+\s*\.?$/.test(t)) break;               // bruksniu eilute - uodegos galas
    }
    // Antrastes pagrindas - artimiausia teksto pastraipa pries lentele
    // ("Koreguojama pagal poreiki:"): paveldimas sriftas/tarpai, tekstas,
    // spalva ir kursyvas perrasomi.
    let bazine = null;
    for (let j = tblIdx - 1; j >= 0; j--){
      if (vaikai[j].localName === 'tbl') break;
      if (vaikai[j].localName === 'p' && GPDocx.paraText(vaikai[j]).trim()){ bazine = vaikai[j]; break; }
    }
    if (!bazine) return 0;
    const dvi = /object of the procurement/i.test(
      Array.from(tbl.getElementsByTagNameNS(W,'tr'))[0]
        ? GPDocx.els(Array.from(tbl.getElementsByTagNameNS(W,'tr'))[0],'t').map(t => t.textContent).join(' ') : '');
    const antraste = (dal) => {
      const lt = `${dal.roman} Pirkimo objekto dalis - ${gpBruksniai(dal.lt || TUSCIA_ZYMA)}:`;
      return dvi ? `${lt} / Part ${dal.roman} of the Procurement object - ${gpBruksniai(dal.en || TUSCIA_ZYMA)}:` : lt;
    };
    const darytiAntraste = (dal) => {
      const p = bazine.cloneNode(true);
      nuvalytiKlonoZymes(p);
      const runai = GPDocx.els(p,'r');
      let pirmas = null;
      for (const r of runai){
        const ts = GPDocx.els(r,'t');
        if (!ts.length) continue;
        if (!pirmas){
          pirmas = r;
          ts[0].textContent = antraste(dal);
          ts[0].setAttribute('xml:space','preserve');
          for (let k = 1; k < ts.length; k++) ts[k].textContent = '';
        } else ts.forEach(t => t.textContent = '');
      }
      if (pirmas){
        for (const c of GPDocx.els(pirmas,'color')) c.setAttributeNS(W,'w:val','auto');
        const rpr = pirmas.getElementsByTagNameNS(W,'rPr')[0];
        if (rpr){
          for (const tag of ['i','iCs','u'])
            for (const e of Array.from(rpr.getElementsByTagNameNS(W, tag))) rpr.removeChild(e);
          if (!rpr.getElementsByTagNameNS(W,'b').length){
            const b = pirmas.ownerDocument.createElementNS(W,'w:b');
            const rf = rpr.getElementsByTagNameNS(W,'rFonts')[0];
            rpr.insertBefore(b, rf ? rf.nextSibling : rpr.firstChild);
          }
        }
      }
      return p;
    };
    const tevas = tbl.parentNode;
    // I dalis - antraste pries ORIGINALIA lentele (po raudonos "Koreguojama..." pastabos).
    tevas.insertBefore(darytiAntraste(dalys[0]), tbl);
    // Kitos dalys - {antraste + lenteles klonas + uodegos klonai} po uodegos galo.
    let po = uodega.length ? uodega[uodega.length - 1] : tbl;
    let n = 0;
    for (let k = 1; k < dalys.length; k++){
      const antr = darytiAntraste(dalys[k]);
      tevas.insertBefore(antr, po.nextSibling);
      const tblK = tbl.cloneNode(true);
      nuvalytiKlonoZymes(tblK);                      // isnasu nuorodos SAMONINGAI paliekamos
      tevas.insertBefore(tblK, antr.nextSibling);
      let paskutinis = tblK;
      for (const u of uodega){
        const uk = u.cloneNode(true);
        nuvalytiKlonoZymes(uk);
        tevas.insertBefore(uk, paskutinis.nextSibling);
        paskutinis = uk;
      }
      po = paskutinis; n++;
    }
    return n;
  }

  /* Raudoni INTARPAI juodo teksto viduje. Trys skirtingi veiksmai:
       juodinti - tekstas yra tikras dokumento turinys, raudona tik "patikrink"
       trinti   - nurodymas rengejui skliaustuose, dokumente likti negali
       teksto   - reikia zmogaus teksto (lauztiniai skliaustai)               */
  function raudoniRunai(p){
    const out = [];
    for (const r of GPDocx.els(p,'r')){
      const t = GPDocx.els(r,'t').map(x => x.textContent).join('');
      if (!t.trim()) continue;
      const rpr = r.getElementsByTagNameNS(W,'rPr')[0];
      const col = rpr && rpr.getElementsByTagNameNS(W,'color')[0];
      const v = col ? (col.getAttributeNS(W,'val')||'').toUpperCase() : '';
      if (['FF0000','C00000','ED1C24'].includes(v)) out.push(r);
    }
    return out;
  }
  function trintiRaudonusRunus(paras, i){
    const p = paras[i]; if (!p) return 0;
    const rs = raudoniRunai(p);
    rs.forEach(r => r.parentNode && r.parentNode.removeChild(r));
    if (rs.length) taisytiSkliaustus(p);
    return rs.length;
  }
  /* Nurodymas daznai prasideda "(" raudonai, o ")" lieka juodas. Istrynus
     raudona - lieka kabantis ")". Salinam tik NESUPORUOTUS skliaustus.       */
  function taisytiSkliaustus(p){
    const ts = GPDocx.els(p,'t');
    const s = ts.map(t => t.textContent).join('');
    if (!/[()]/.test(s)) return;
    const drop = new Set();
    const stack = [];
    for (let k=0;k<s.length;k++){
      if (s[k] === '(') stack.push(k);
      else if (s[k] === ')'){ if (stack.length) stack.pop(); else drop.add(k); }
    }
    stack.forEach(k => drop.add(k));
    if (!drop.size) return;
    const owner = [];
    ts.forEach(t => { for (let k=0;k<t.textContent.length;k++) owner.push(t); });
    const out = new Map(ts.map(t => [t,'']));
    for (let k=0;k<s.length;k++){
      if (drop.has(k)) continue;
      out.set(owner[k], out.get(owner[k]) + s[k]);
    }
    for (const t of ts){ t.textContent = out.get(t).replace(/\s{2,}/g,' '); t.setAttribute('xml:space','preserve'); }
  }
  function keistiRaudonaTeksta(paras, i, value, stilius){
    const p = paras[i]; if (!p) return false;
    const rs = raudoniRunai(p);
    if (!rs.length) return false;
    const first = rs[0];
    // Raudoni runai TIK is tarpu tarp raudonu fragmentu - to paties nurodymo dalis: palikti jie duodavo
    // „... perka ir sau .“ (tarpas pries taska). Uz fragmento ribu esantys tarpai neliečiami.
    const visi = GPDocx.els(p,'r'), nuo = visi.indexOf(first), iki = visi.indexOf(rs[rs.length - 1]);
    const tarpai = visi.slice(nuo + 1, iki).filter(r => arRaudonas(r) && !rs.includes(r) && !GPDocx.els(r,'t').map(x => x.textContent).join('').trim());
    irasykIRaudonus(first, rs.slice(1).concat(tarpai), value, stilius);
    return true;
  }
  /* Vienas ištisinis raudonas fragmentas pastraipoje, kurioje jų keli (2026-10-05, DPS konkretaus pirkimo pasiūlymo formos
     antraštė: „DĖL KONKRETAUS PIRKIMO „X“ATLIEKAMO DINAMINĖS PIRKIMO SISTEMOS „Y“ ...“ - X ir Y raudoni): keičiama tik grupė,
     prieš kurią esantis pastraipos tekstas atitinka `pries` (reguliarusis reiškinys arba funkcija (tekstas prieš, grupės tekstas));
     kiti raudoni fragmentai lieka. */
  function keistiRaudonaGrupe(paras, i, pries, value, stilius){
    const p = paras[i]; if (!p) return false;
    const visi = GPDocx.els(p,'r'), txt = r => GPDocx.els(r,'t').map(x => x.textContent).join('');
    let pirma = '';
    for (let k = 0; k < visi.length; k++){
      if (arRaudonas(visi[k]) && txt(visi[k]).trim()){
        let iki = k;
        while (iki + 1 < visi.length && arRaudonas(visi[iki + 1])) iki++;
        while (iki > k && !txt(visi[iki]).trim()) iki--;          // raudonas tarpas grupės gale - ne fragmento dalis
        const grupe = visi.slice(k, iki + 1).map(txt).join('');
        if (typeof pries === 'function' ? pries(pirma, grupe) : pries.test(pirma)){
          irasykIRaudonus(visi[k], visi.slice(k + 1, iki + 1), value, stilius);
          return true;
        }
        for (let j = k; j <= iki; j++) pirma += txt(visi[j]);
        k = iki;
        continue;
      }
      pirma += txt(visi[k]);
    }
    return false;
  }
  function irasykIRaudonus(first, salinti, value, stilius){
    const ts = GPDocx.els(first,'t');
    if (ts.length){ ts[0].textContent = gpBruksniai(value); ts[0].setAttribute('xml:space','preserve'); }
    for (let k=1;k<ts.length;k++) ts[k].textContent = '';
    salinti.forEach(r => r.parentNode && r.parentNode.removeChild(r));
    for (const c of GPDocx.els(first,'color')) c.setAttributeNS(W,'w:val','auto');
    // Formu antrastems: sablono "(Pirkimo objektas)" runas kursyvinis ne-bold,
    // o kaimynai ("LITGRID AB", "PIRKIMUI") - bold DIDZIOSIOMIS. Be suvienodinimo
    // irasytas fragmentas issiskiria (pastaba Nr. 3). Kitiems keliams (data,
    // apklausa, redakcija) stilius nekeiciamas - parametras neperduodamas.
    if (stilius && stilius.kaipAntraste){
      const rpr = first.getElementsByTagNameNS(W,'rPr')[0];
      if (rpr){
        for (const tag of ['i','iCs'])
          for (const e of Array.from(rpr.getElementsByTagNameNS(W, tag))) rpr.removeChild(e);
        if (!rpr.getElementsByTagNameNS(W,'b').length){
          const b = first.ownerDocument.createElementNS(W, 'w:b');
          const rf = rpr.getElementsByTagNameNS(W,'rFonts')[0];
          rpr.insertBefore(b, rf ? rf.nextSibling : rpr.firstChild);
        }
      }
    }
  }

  /* „Rengė:“ / „Rengė / Prepared by:“ eilutė SPS pabaigoje (2026-10-07, naudotojo sprendimas - kontaktinių asmenų vieta): reikšmė
     įrašoma po dvitaškio. Šablone po jo - tik tarpo runas (AK LT - raudonas kursyvas) arba Word sąrašo laukas „Choose an item.“
     (ND LT/EN): jie pašalinami, įrašomas naujas runas su „Rengė:“ runo savybėmis (spalva - auto, be kursyvo). Grąžina, ar įrašyta. */
  function irasykRengeja(paras, i, value){
    const p = paras[i], v = String(value == null ? '' : value).trim();
    if (!p || !v) return false;
    const txt = r => GPDocx.els(r,'t').map(x => x.textContent).join('');
    GPDocx.els(p,'sdt').forEach(sd => sd.parentNode && sd.parentNode.removeChild(sd));
    const rs = GPDocx.els(p,'r');
    let dv = -1;
    rs.forEach((r, k) => { if (/:/.test(txt(r))) dv = k; });
    if (dv < 0) return false;
    rs.slice(dv + 1).forEach(r => { if (!txt(r).trim() && r.parentNode) r.parentNode.removeChild(r); });
    const naujas = rs[dv].cloneNode(true), ts = GPDocx.els(naujas,'t');
    if (!ts.length) return false;
    ts[0].textContent = ' ' + gpBruksniai(v); ts[0].setAttribute('xml:space','preserve');
    for (let k = 1; k < ts.length; k++) ts[k].textContent = '';
    for (const c of GPDocx.els(naujas,'color')) c.setAttributeNS(W,'w:val','auto');
    const rpr = naujas.getElementsByTagNameNS(W,'rPr')[0];
    if (rpr) for (const tag of ['i','iCs']) for (const e of Array.from(rpr.getElementsByTagNameNS(W, tag))) rpr.removeChild(e);
    rs[dv].parentNode.insertBefore(naujas, rs[dv].nextSibling);
    return true;
  }

  /* Formos daliu eilute "I/ II/ III/ IV PIRKIMO OBJEKTO DALIAI (palikti tik ta
     dali...)": romeniskas sarasas - statinis sablono tekstas, neatspindintis
     tikro daliu skaiciaus (pastaba Nr. 4). Perrasomas TIK sarasas jo raudoname
     rune, spalva ISLIEKA raudona (tiekejo instrukcija), kiti raudoni runai
     (pvz. "(palikti tik ta dali...)") nelieciami - todel ne keistiRaudonaTeksta. */
  function keistiDaliuSarasa(paras, i, kiek){
    const p = paras[i]; if (!p || !(kiek >= 2)) return false;
    const sarasas = Array.from({ length: kiek }, (_, k) => romeniskas(k + 1)).join('/ ');
    for (const r of raudoniRunai(p)){
      const ts = GPDocx.els(r,'t');
      const s = ts.map(t => t.textContent).join('');
      if (!/\b[IVX]+\s*\/\s*[IVX]+\b/.test(s)) continue;   // sio runo sarasas ne cia
      const naujas = s.replace(/\b[IVX]+(\s*\/\s*[IVX]+)+\b/, sarasas);
      if (naujas === s) return false;
      ts[0].textContent = naujas;
      ts[0].setAttribute('xml:space','preserve');
      for (let k = 1; k < ts.length; k++) ts[k].textContent = '';
      return true;
    }
    return false;
  }

  /* Pastraipos zenklas (¶) gali tureti raudona spalva, nors tekstas juodas.
     Tekste tai nematoma, bet formaliai dokumente lieka nurodymo spalva - ir
     ji "issilies" i nauja teksta, jei rengejas ras toje vietoje. Valom visur. */
  function valytiPastraipuZenklus(doc){
    const d = doc.parts['word/document.xml'];
    let n = 0;
    for (const ppr of Array.from(d.getElementsByTagNameNS(W,'pPr'))){
      for (const c of Array.from(ppr.getElementsByTagNameNS(W,'color'))){
        const v = (c.getAttributeNS(W,'val')||'').toUpperCase();
        if (['FF0000','C00000','ED1C24'].includes(v)){ c.setAttributeNS(W,'w:val','auto'); n++; }
      }
    }
    return n;
  }

  /* Titulo tarpas. Kai kuriuose sablonuose (AK_LT) titulo raudonas nurodymas
     "(irasomas ... pavadinimas) " turi tarpa GALE ir istrynus ji tas tarpas dingsta,
     tad gaunasi "...kVpirkimas". Uztikrinam VIENA tarpa pries "pirkimas"/"PIRKIMUI",
     jei pries ji nera tarpo. Prependinam tarpa PRIE esamo runo (formatas islieka).
     ND ir kt., kur tarpas jau yra, NEliecia.                                    */
  function taisytiTitulTarpa(paras, i){
    const p = paras[i]; if (!p) return false;
    const ts = GPDocx.els(p,'t');
    let prev = '';
    for (const t of ts){
      const s = t.textContent;
      if (!s) continue;
      if (/^(pirkimas|PIRKIMUI)\b/.test(s) && prev && !/\s$/.test(prev)){
        t.textContent = ' ' + s; t.setAttribute('xml:space','preserve');
        return true;
      }
      prev = s;
    }
    return false;
  }

  /* Sakinio galo tvarkymas po raudonu runu trynimo (2.1 "Pirkimo objektas - X").
     Sablone tarp pildomos vietos ir tasko yra literalus tarpas (jis dengia raudona
     nurodyma, kuris istrinamas) - lieka "X ." Dalyje sablonu (MVP) raudonas runas
     prarija ir taska - lieka "X" be tasko. Cia: nuimam tarpa pries galini taska,
     o jei tasko nera - pridedam. Redaguojami tik konkretus w:t mazgai, rPr
     neliecCiamas.                                                              */
  function taisytiSakinioGala(paras, i){
    const p = paras[i]; if (!p) return false;
    const ts = GPDocx.els(p,'t');
    if (!ts.length) return false;
    let pakeista = false;
    // paskutinis netuscias (ne vien tarpu) mazgas; vien tarpu mazgus gale valom
    let pask = -1;
    for (let k = ts.length - 1; k >= 0; k--){
      if (ts[k].textContent.trim()){ pask = k; break; }
      if (ts[k].textContent){ ts[k].textContent = ''; pakeista = true; }
    }
    if (pask < 0) return pakeista;
    let galas = ts[pask].textContent.replace(/\s+$/, '');
    if (galas === '.'){
      // taskas atskirame rune - tarpas gyvena ANKSTESNIU mazgu gale
      for (let k = pask - 1; k >= 0; k--){
        const s = ts[k].textContent;
        if (!s) continue;
        const be = s.replace(/\s+$/, '');
        if (be !== s){ ts[k].textContent = be; ts[k].setAttribute('xml:space','preserve'); pakeista = true; }
        if (be) break;                               // pasiektas tekstas - stojam
      }
    } else if (galas && !/[.;:]$/.test(galas)){
      galas += '.'; pakeista = true;                 // prarytas taskas (MVP) - grazinam
    }
    if (galas !== ts[pask].textContent){
      ts[pask].textContent = galas;
      ts[pask].setAttribute('xml:space','preserve');
      pakeista = true;
    }
    return pakeista;
  }

  /* Rezimo eilute BE zymos (ND_LT: "Vykdomas    Pasirinkti" - juoda, be skliaustu,
     zemelapyje jos nera). Ivedam visa eilute is naujo: pirmas runas laiko
     "Vykdomas " + rezimo tekstas, likusieji istustinami. Formatas islaikomas
     (visi runai juodi normalus).                                               */
  function keistiRezimoEilute(paras, i, value){
    const p = paras[i]; if (!p) return false;
    const ts = GPDocx.els(p,'t');
    if (!ts.length) return false;
    ts[0].textContent = 'Vykdomas ' + gpBruksniai(value); ts[0].setAttribute('xml:space','preserve');
    for (let k=1;k<ts.length;k++) ts[k].textContent = '';
    return true;
  }

  return { snapshot, juodinti, trinti, perkeltiNumeri, idetiNumeri, trintiEilutese, pildyti, vietos, keisti, dautiDalis, dautiKvalifLenteles, dautiKainuLenteles, romeniskas,
           raudoniRunai, trintiRaudonusRunus,
           keistiRaudonaTeksta, keistiRaudonaGrupe, irasykRengeja, keistiDaliuSarasa, keistiRezimoEilute, taisytiTitulTarpa, taisytiSakinioGala, valytiPastraipuZenklus, taisytiSkliaustus };
})();

/* ==========================================================================
   GPNum - punktu numeracijos sutvarkymas sugeneruotame dokumente (2026-10-03).
   KODEL. LITGRID sablonuose skyriu antrastes ir punktai daznai sunumeruoti SKIRTINGAIS
   Word sarasais: punkto numerio pirmas skaicius imamas is saraso 0 lygio, kurio niekas
   nenaudoja (Word rodo jo „start“ - pvz. TSD BPS 9 skyriuje 1.1-1.8, AKV 10 sk. 7.1),
   sarasai tesiasi per skyrius (AKV 3 sk. - 2.11), du sarasai viename skyriuje kartoja
   numerius (AK SPS 1 sk. - du „1.1“), lygio tekste irasytas kito punkto numeris
   („2.8.%1.“), o Pages nenaudojamo lygio numerio isvis nerodo („1.“, „5.1.“). Istrynus
   alternatyvas lieka ir ranka irasytu numeriu tarpu. Todel po generavimo: Word numeracija
   emuliuojama (patikrinta: atkuria Word TURINIO numerius LT sablonuose), randami skyriai ir
   punktai (LT - kuno pastraipos; dvikalbiuose - numeriu stulpelis lentelese, be turinio
   lenteliu su „Eil. Nr.“), numeriai perskaiciuojami is eiles ir IRASOMI TEKSTU (nebepriklauso
   nuo programos numeracijos). Atitraukimai - is buvusio saraso lygio. TURINIO numeriai suderinami,
   istrinto skyriaus irasas salinamas. Pakeitimai grazinami ataskaitai (buvo -> tapo).
   Formose (ir formu prieduose DPS salygose) numeriai NEperskaiciuojami: Word numeracija jose
   teisinga, o tiekejo alternatyvos turi ta pati numeri („1.5.“ arba „1.5.“, „Pasiūlymo 1.5. punkte“) -
   numeriai tik irasomi tekstu. Po raudono „ARBA“ (sablono alternatyva, sprendziama Word'e) -
   tas pats numeris. Priedai tame paciame faile numeruojami atskirai; be skyriu antrasciu
   (DPS priedai) - 0 lygio punktai is eiles.
   ========================================================================== */
const GPNum = (() => {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const kids = (el, n) => el ? Array.from(el.childNodes).filter(c => c.nodeType === 1 && c.localName === n) : [];
  const kid = (el, n) => kids(el, n)[0] || null;
  const attr = (el, n) => el ? (el.getAttributeNS(W, n) || el.getAttribute('w:' + n)) : null;
  const val = (el, n) => attr(kid(el, n), 'val');
  const tekstas = p => Array.from(p.getElementsByTagNameNS(W, 't')).map(t => t.textContent).join('');
  // pPr vaiku tvarka (OOXML schema): nauji elementai - i savo vieta, kitaip Word faila laiko sugadintu
  const PPR = ['pStyle','keepNext','keepLines','pageBreakBefore','framePr','widowControl','numPr','suppressLineNumbers','pBdr','shd',
    'tabs','suppressAutoHyphens','kinsoku','wordWrap','overflowPunct','topLinePunct','autoSpaceDE','autoSpaceDN','bidi','adjustRightInd',
    'snapToGrid','spacing','ind','contextualSpacing','mirrorIndents','suppressOverlap','jc','textDirection','textAlignment',
    'textboxTightWrap','outlineLvl','divId','cnfStyle','rPr','sectPr','pPrChange'];
  function idek(ppr, el){
    const k = PPR.indexOf(el.localName);
    const po = Array.from(ppr.childNodes).find(c => c.nodeType === 1 && PPR.indexOf(c.localName) > k);
    ppr.insertBefore(el, po || null);
  }
  function pPr(p){
    let ppr = kid(p, 'pPr');
    if (!ppr){ ppr = p.ownerDocument.createElementNS(W, 'w:pPr'); p.insertBefore(ppr, p.firstChild); }
    return ppr;
  }

  /* ---------- Word numeracijos modelis ---------- */
  function modelis(numDoc, styDoc){
    const abst = {}, nums = {}, st = {};
    if (numDoc){
      for (const a of Array.from(numDoc.getElementsByTagNameNS(W, 'abstractNum'))){
        const L = {};
        for (const l of kids(a, 'lvl')){
          const ppr = kid(l, 'pPr');
          L[+attr(l, 'ilvl')] = { start: +(val(l, 'start') || 1), fmt: val(l, 'numFmt') || 'decimal', txt: val(l, 'lvlText') || '',
                                 suff: val(l, 'suff') || 'tab', ind: ppr && kid(ppr, 'ind'), tabs: ppr && kid(ppr, 'tabs') };
        }
        abst[attr(a, 'abstractNumId')] = L;
      }
      for (const n of Array.from(numDoc.getElementsByTagNameNS(W, 'num'))){
        const ov = {};
        for (const o of kids(n, 'lvlOverride')){ const s = val(o, 'startOverride'); if (s != null) ov[+attr(o, 'ilvl')] = +s; }
        nums[attr(n, 'numId')] = { a: val(n, 'abstractNumId'), ov };
      }
    }
    if (styDoc){
      for (const s of Array.from(styDoc.getElementsByTagNameNS(W, 'style'))){
        const ppr = kid(s, 'pPr'), np = ppr && kid(ppr, 'numPr');
        st[attr(s, 'styleId')] = { name: (val(s, 'name') || '').toLowerCase(), based: val(s, 'basedOn'),
                                   numId: np && val(np, 'numId'), ilvl: np && val(np, 'ilvl') };
      }
    }
    return { abst, nums, st };
  }
  function stiliausNumeris(M, sid){
    for (let k = 0, s = M.st[sid]; s && k < 12; k++, s = M.st[s.based]) if (s.numId != null) return s;
    return null;
  }
  function numeris(M, p){
    const ppr = kid(p, 'pPr'), sid = ppr && val(ppr, 'pStyle'), np = ppr && kid(ppr, 'numPr');
    let numId = np && val(np, 'numId'), ilvl = np && val(np, 'ilvl');
    if (numId == null){ const s = stiliausNumeris(M, sid); if (s){ numId = s.numId; if (ilvl == null) ilvl = s.ilvl; } }
    return { numId, ilvl: +(ilvl || 0), sid };
  }
  /* Word numeriai visoms pastraipoms dokumento tvarka. Skaitikliai - pagal abstractNum; nenaudotas tevinis lygis rodo
     savo „start“ ir nuo tol laikomas panaudotu (taip Word: patikrinta su TURINIO numeriais). */
  function wordZymes(M, pars){
    const cnt = {}, ovNaudoti = new Set(), out = new Map();
    for (const p of pars){
      const n = numeris(M, p);
      const nn = n.numId && n.numId !== '0' && M.nums[n.numId];
      const L = nn && M.abst[nn.a];
      if (!L || !L[n.ilvl]) continue;
      const c = cnt[nn.a] || (cnt[nn.a] = {});
      if (Object.keys(nn.ov).length && !ovNaudoti.has(n.numId)){
        ovNaudoti.add(n.numId);
        for (const k of Object.keys(c)) if (!(k in nn.ov)) delete c[k];
        for (const k of Object.keys(nn.ov)) c[k] = nn.ov[k] - 1;
      }
      c[n.ilvl] = (n.ilvl in c) ? c[n.ilvl] + 1 : L[n.ilvl].start;
      for (const k of Object.keys(c)) if (+k > n.ilvl) delete c[k];
      const lv = L[n.ilvl];
      if (lv.fmt === 'bullet' || lv.fmt === 'none') continue;
      let desimt = /^decimal/.test(lv.fmt);
      const label = lv.txt.replace(/%(\d)/g, (m, d) => {
        const k = +d - 1;
        if (!(k in c)) c[k] = (L[k] || { start: 1 }).start;
        if (L[k] && !/^decimal/.test(L[k].fmt)) desimt = false;
        return String(c[k]);
      });
      out.set(p, { label, desimt, lv });
    }
    return out;
  }

  /* ---------- Skyriai ir punktai ---------- */
  const ETIKETE = /^(\d+(?:\.\d+)*)(\.?)(?=$|[\s ]|[^\d.\s)])/;     // „2.1.“, „2.1.Tekstas“, „9. ANTRASTE“; ne „2.1)“
  const TIK_ETIKETE = /^(\d+(?:\.\d+)*)\.?$/;
  const komp = s => s.replace(/\.$/, '').split('.').length;
  function didziosios(s){
    const r = (s || '').replace(/\([^)]*\)/g, '').replace(/[^\p{L}]/gu, '');
    if (r.length < 4) return false;
    let d = 0; for (const ch of r) if (ch !== ch.toLocaleLowerCase('lt')) d++;
    return d >= 0.6 * r.length;
  }
  function turinioLentele(tbl){
    // pasalinimo pagrindu, kitu reikalavimu ir pan. lenteles - antraste „Eil. Nr.“ / „No.“ vienoje is pirmu eiluciu
    return kids(tbl, 'tr').slice(0, 3).some(tr => { const tc = kid(tr, 'tc'); return tc && /^\s*(eil\.?\s*nr|no\.)/i.test(tekstas(tc)); });
  }
  function pastraipa(M, Z, p, kont){
    const t = tekstas(p).trim();
    const ppr = kid(p, 'pPr'), st = M.st[ppr && val(ppr, 'pStyle')] || { name: '' };
    const e = { p, kont, t, antraste: /^heading [1-9]$/.test(st.name), toc: /^toc /.test(st.name), lygis: null };
    if (e.toc || !t && kont === 'kunas') return e;
    const z = Z.get(p);
    e.zy = z && z.desimt && /^\d+(\.\d+)*\.?$/.test(z.label) ? z : null;
    const m = t.match(ETIKETE);
    e.lit = m ? { nr: m[1], taskas: m[2], ilgis: m[0].length } : null;
    if (e.zy && e.lit && komp(e.lit.nr) !== komp(e.zy.label)) e.lit = null;   // ne dvigubas numeris (pvz. metai teksto pradzioje)
    if (!e.zy && !e.lit) return e;
    e.senas = e.zy ? e.zy.label.replace(/\.$/, '') : e.lit.nr;
    e.lygis = komp(e.senas) - 1;
    return e;
  }
  /* Elementu srautas dokumento tvarka. LT dokumente - kuno pastraipos (lentelese numeracija vietine); dvikalbiame - ir lenteliu
     eilutes, kuriu pirmame langelyje vien numeris (dokumento struktura), isskyrus turinio lenteles. */
  // Dokumento priedai tame paciame faile (DPS salygos: „Pirkimo sąlygų 1 priedas „...““) turi savo numeracija - nuo cia nelieciama
  const PRIEDO_PRADZIA = /^(pirkimo|dps|konkretaus pirkimo)\s+sąlygų\s+\d+\s+priedas\b/i;
  // Priedas - forma, sarasas, priedelis ar atskiras dokumentas (EBVPD, TS, sutartis): numeriai lieka kaip Word
  const PRIEDAS_FORMA = /form|sąraš|priedėl|ebvpd|specifikacij|sutarties projekt|įsipareigojim|deklaracij/i;
  // Raudonas „ARBA“ / „OR“ tarp dvieju sablono alternatyvu, kurias rengejas sprendzia Word'e: po jo - tas pats numeris
  const ALTERNATYVA = /^(arba|or)(\s*\([^)]*\))?\s*:?$/i;
  function srautas(M, d, Z, opts){
    const out = [], tuscios = [];
    const eik = (el) => {
      for (const c of Array.from(el.childNodes)){
        if (c.nodeType !== 1) continue;
        if (c.localName === 'p'){
          const e = pastraipa(M, Z, c, 'kunas');
          if (PRIEDO_PRADZIA.test(e.t) && !e.toc){ out.push({ priedas: true, t: e.t }); continue; }   // nauja numeracijos sritis
          if (e.lygis == null && ALTERNATYVA.test(e.t)) e.alternatyva = true;
          out.push(e);
        }
        else if (c.localName === 'sdt'){ const sc = kid(c, 'sdtContent'); if (sc) eik(sc); }
        else if (c.localName === 'tbl' && opts.dvikalbis && !turinioLentele(c)){
          for (const tr of kids(c, 'tr')){
            const tcs = kids(tr, 'tc');
            if (tcs.length < 2) continue;
            const ps = Array.from(tcs[0].getElementsByTagNameNS(W, 'p'));
            const p = ps.find(x => Z.get(x) || TIK_ETIKETE.test(tekstas(x).trim()));
            if (!p || ps.some(x => x !== p && tekstas(x).trim())) continue;        // langelyje - tik numeris
            const e = pastraipa(M, Z, p, c);
            e.ltTekstas = tcs.slice(1).map(tc => tekstas(tc).trim()).find(Boolean) || '';
            if (e.lygis == null) continue;
            // istrynus alternatyva lieka eilute vien su numeriu - salinama (formose tuscios eilutes - pildymui, ju nelieciam)
            if (!e.ltTekstas){ if (!opts.forma) tuscios.push(tr); continue; }
            out.push(e);
          }
        }
      }
    };
    eik(d.getElementsByTagNameNS(W, 'body')[0]);
    return { S: out.filter(e => e.lygis != null || e.alternatyva || e.priedas), tuscios };
  }

  /* ---------- Nauji numeriai ---------- */
  /* Formos: numeriai lieka tokie, kokius rodo Word (tiekejo alternatyvos „1.5.“ / „arba“ / „1.5.“, nuoroda „Pasiūlymo
     1.5. punkte“), tik irasomi tekstu. Ju Word numeracija patikrinta visose formose: klaidu nera. */
  function uzfiksuok(S){
    return S.filter(e => e.lygis != null).map(e => { e.naujas = e.senas; return e; });
  }
  function perskaiciuok(S){
    // Skyrius - vieno skaiciaus numeris su antrastes stiliumi arba DIDZIOSIOMIS raidemis (skliaustai neskaiciuojami:
    // „PRIEDAI (koreguojama pagal poreikį)“). Kiti vieno skaiciaus numeriai - vietiniai sarasai (1., 2. ...), nelieciami.
    S.forEach(e => {
      if (e.lygis !== 0) return;
      const tekst = e.kont === 'kunas' ? e.t.slice(e.lit && !e.zy ? e.lit.ilgis : 0) : e.ltTekstas;
      e.skyrius = e.antraste || didziosios(tekst);
    });
    // Be skyriu antrasciu (DPS priedai: „1. ... 2. ... 3. Reikalavimai ...: 3.1. ...“) - 0 lygio punktai yra pagrindas ir
    // numeruojami is eiles (iki 2026-10-03 DPS LT 2 priede po „5.“ buvo „7.“, dvikalbiame - du „4.“). Lenteliu antrastes
    // („2 priedo 1 lentelė“) ir skaicius be tasko („2026-10-05“) - ne punktai.
    const yraSkyriu = S.filter(e => e.lygis === 0 && e.skyrius).length >= 2;
    const plokscias = e => e.zy || (e.lit && e.lit.taskas === '.' && +e.lit.nr <= 99 && !/^\s*(priedo\s+\d+\s+)?lentel/i.test(e.t.slice(e.lit.ilgis)));
    let sk = 0, cnt = [], alt = false;
    for (const e of S){
      if (e.alternatyva){ alt = true; continue; }
      if (e.lygis === 0){
        if (yraSkyriu ? !e.skyrius : !plokscias(e)) continue;
        sk = (yraSkyriu || sk) ? sk + 1 : (+e.senas || 1);
        cnt = []; alt = false; e.naujas = String(sk); continue;
      }
      const senas = e.senas.split('.').map(Number);
      if (!sk) continue;                                     // punktai pries pirma skyriu (titulinis) - nelieciami
      const L = e.lygis;
      while (cnt.length < L) cnt.push(0);
      cnt.length = L;
      for (let k = 0; k < L - 1; k++) if (!cnt[k]) cnt[k] = senas[k + 1] || 1;   // praleistas tevinis lygis
      if (!(alt && cnt[L - 1])) cnt[L - 1] += 1;                                 // po „arba“ - alternatyva, tas pats numeris
      alt = false;
      e.naujas = [sk, ...cnt].join('.');
    }
    return S.filter(e => e.naujas);
  }

  /* ---------- Irasymas ---------- */
  function rPrIs(p){
    const r = Array.from(p.getElementsByTagNameNS(W, 'r')).find(x => tekstas(x).trim());
    const src = r ? kid(r, 'rPr') : (kid(p, 'pPr') && kid(kid(p, 'pPr'), 'rPr'));
    return src ? src.cloneNode(true) : null;
  }
  function nuimkSarasa(p, lv, d){
    const ppr = pPr(p);
    let np = kid(ppr, 'numPr');
    if (!np){ np = d.createElementNS(W, 'w:numPr'); idek(ppr, np); }
    let ni = kid(np, 'numId');
    if (!ni){ ni = d.createElementNS(W, 'w:numId'); np.appendChild(ni); }
    ni.setAttributeNS(W, 'w:val', '0');
    // atitraukimas ir tabuliacija - buvusio numeracijos lygio (jei pastraipa savo neturi): tekstas lieka toje pacioje vietoje
    if (!kid(ppr, 'ind') && lv.ind) idek(ppr, d.importNode(lv.ind, true));
    if (!kid(ppr, 'tabs') && lv.tabs) idek(ppr, d.importNode(lv.tabs, true));
  }
  function idekZyma(p, zyma, suff, d){
    const r = d.createElementNS(W, 'w:r');
    const rp = rPrIs(p);
    if (rp) r.appendChild(rp);
    const t = d.createElementNS(W, 'w:t');
    t.setAttribute('xml:space', 'preserve');   // kaip visas variklis (kitaip - dvigubas atributas)
    t.textContent = zyma + (suff === 'space' ? ' ' : '');
    r.appendChild(t);
    if (suff === 'tab') r.appendChild(d.createElementNS(W, 'w:tab'));
    const ppr = kid(p, 'pPr');
    p.insertBefore(r, ppr ? ppr.nextSibling : p.firstChild);
  }
  /* Po numerio - vienas skirtukas (2026-10-05, naudotojo prašymas „4.1 punktas“). Šablonuose po numerio būna ir daugiau tarpų:
     automatinis numeris su tabuliacija, o pastraipa prasideda tarpu („4.1.<tab> Pirkimo“), ranka įrašytas numeris su tabuliacija
     ir tarpu („9.3.<tab> Jeigu“) ar dviem tarpais („1.5.  Teikdami“) - Word ir Pages tekstą pradeda toliau nei kitų punktų; o
     ranka įrašytam numeriui su tabuliacija („17.1.1.<tab>Sutarties“) keiskPradzia prideda tarpą prieš ją (tarpo ieško tik w:t tekste).
     Kviečiama įrašius numerį tekstu: šalinamas tarpas prieš tabuliaciją, vienas papildomas tarpas po skirtuko, o pastraipoje su
     nuliniu atitraukimu (w:ind - visi 0) - visi tarpai po tabuliacijos („11.11.<tab>  Vadovaujantis“ - tekstas prasideda ties
     tabuliacijos sustojimu kaip kaimyninių punktų). Paliekama: keli tarpai po tabuliacijos atitrauktoje pastraipoje (ar be savo
     w:ind - atitraukimą tada duoda stilius) - ten tarpai lygiuoja tekstą su kitais punktais (AK SPS 2.1 p. kabantis atitraukimas,
     AKV SPS 2.1 p. kairysis 360 - trys tarpai); keli tarpai po tarpo (lygiavimas tarpais). Tikrinama tik pastraipos pradžia
     (iki eilutės lūžio, paveikslo). */
  const SUSTOK_PRADZIOJE = new Set(['br', 'cr', 'drawing', 'pict', 'object', 'sym']);
  function tarpaiPoNumerio(p){
    const ppr = kid(p, 'pPr');   // jame tabuliacijos sustojimai (w:tabs/w:tab) - ne tekstas
    const vietos = []; let s = '';
    for (const el of Array.from(p.getElementsByTagNameNS(W, '*'))){
      if (ppr && ppr.contains(el)) continue;
      const ln = el.localName;
      if (ln === 't'){ const t = el.textContent; for (let i = 0; i < t.length; i++) vietos.push([el, i]); s += t; }
      else if (ln === 'tab' || ln === 'ptab'){ vietos.push(null); s += '\t'; }
      else if (SUSTOK_PRADZIOJE.has(ln)) break;
      if (s.length > 80) break;
    }
    const m = /^[\t \u00a0]*\d+(?:\.\d+)*\.?/.exec(s);                    // prieš numerį gali būti tabuliacijos (DPS LT 7.2.1)
    if (!m) return 0;
    const del = [];
    let j = m[0].length;                                                  // skirtukas
    if (s[j] === ' ' && s[j + 1] === '\t') del.push(j++);                 // „17.1.1. <tab>“ - tarpas prieš tabuliaciją
    if (s[j] === '\t'){                                                  // po tabuliacijos - visi tarpai, jei atitraukimas nulinis
      let k = j + 1; while (s[k] === ' ' || s[k] === '\u00a0') k++;        // (kitaip tarpai gali lygiuoti tekstą su kitais punktais)
      const ind = ppr && kid(ppr, 'ind');
      const nulinis = !!ind && ['left', 'start', 'hanging', 'firstLine'].every(a => !+(ind.getAttributeNS(W, a) || 0));
      if (k > j + 1 && /\S/.test(s[k] || '') && (k === j + 2 || nulinis)) for (let i = j + 1; i < k; i++) del.push(i);
    } else if (s[j] === ' ' && /[ \u00a0]/.test(s[j + 1] || '') && /\S/.test(s[j + 2] || '')) del.push(j + 1);
    const pagal = new Map();
    for (const i of del){ const [el, o] = vietos[i]; (pagal.get(el) || pagal.set(el, new Set()).get(el)).add(o); }
    for (const [el, os] of pagal) el.textContent = el.textContent.split('').filter((c, i) => !os.has(i)).join('');   // indeksai - kaip vietos (UTF-16)
    return del.length;
  }
  /* Ranka irasyto numerio keitimas: istrinami „ilgis“ simboliai nuo pirmo ne tarpo, ju vietoje - naujas numeris. */
  function keiskPradzia(p, ilgis, naujas, tarpas){
    const ts = Array.from(p.getElementsByTagNameNS(W, 't'));
    const visas = ts.map(t => t.textContent).join('');
    const nuo = visas.length - visas.replace(/^\s+/, '').length, iki = nuo + ilgis;
    let poz = 0, idetas = false;
    for (const t of ts){
      const s = t.textContent, a = poz, b = poz + s.length;
      poz = b;
      if (b <= nuo || a >= iki) continue;
      const x = Math.max(nuo, a) - a, y = Math.min(iki, b) - a;
      t.textContent = s.slice(0, x) + (idetas ? '' : naujas + (tarpas ? ' ' : '')) + s.slice(y);
      if (!idetas) t.setAttribute('xml:space', 'preserve');   // kaip visas variklis (kitaip - dvigubas atributas)
      idetas = true;
    }
  }

  /* Pastraipos teksto atkarpa [nuo, iki) pašalinama iš w:t mazgų (runų savybės nekeičiamos). */
  function salinkAtkarpa(p, nuo, iki){
    let poz = 0;
    for (const t of Array.from(p.getElementsByTagNameNS(W, 't'))){
      const s = t.textContent, a = poz, b = poz + s.length;
      poz = b;
      if (b <= nuo || a >= iki) continue;
      t.textContent = s.slice(0, Math.max(nuo, a) - a) + s.slice(Math.min(iki, b) - a);
      t.setAttribute('xml:space', 'preserve');
    }
  }

  /* ---------- TURINYS ---------- */
  // skliaustai neskaičiuojami: antraštės raudonas nurodymas („PRIEDAI (koreguojama pagal poreikį)“) generuojant pašalinamas, o turinio
  // eilutėje lieka - be to raktai nesutapdavo ir, pašalinus ankstesnį skyrių (2026-10-09 - „Esminės sutarties sąlygos“), numeris nepasikeisdavo
  const raktas = s => s.replace(/\([^)]*\)/g, '').replace(/^\s*\d+(\.\d+)*\.?\s*/, '').replace(/\d+\s*$/, '').replace(/[^\p{L}]/gu, '').toLocaleUpperCase('lt');
  function turinys(M, d, skyriai){
    // raktas - visas antrastes tekstas (TURINIO irasas - tos antrastes kopija); vienodos antrastes - is eiles
    const zem = new Map(), zemT = new Map();
    skyriai.forEach(e => { const at = e.kont === 'kunas' ? e.t.slice(e.lit ? e.lit.ilgis : 0) : e.ltTekstas, k = raktas(at);
      (zem.get(k) || zem.set(k, []).get(k)).push(e.naujas); (zemT.get(k) || zemT.set(k, []).get(k)).push(at); });
    const naudota = new Map();
    const irasai = Array.from(d.getElementsByTagNameNS(W, 'p')).filter(p => {
      const ppr = kid(p, 'pPr'), st = M.st[ppr && val(ppr, 'pStyle')];
      return st && st.name === 'toc 1' && /^\s*\d+\.?/.test(tekstas(p)) && raktas(tekstas(p));
    });
    let pakeista = 0, istrinta = 0, nurodymu = 0;
    const truksta = irasai.filter(p => !zem.has(raktas(tekstas(p))));
    // istrinto skyriaus irasas salinamas tik kai likusieji tiksliai atitinka antrastes (kitaip - tik numeriai)
    const salinti = skyriai.length && truksta.length <= 3 && irasai.length - truksta.length === skyriai.length;
    for (const p of irasai){
      const t = tekstas(p), m = t.match(/^\s*(\d+)(\.?)/), k = raktas(t);
      if (zem.has(k)){
        const i = naudota.get(k) || 0; naudota.set(k, i + 1);
        const nr = zem.get(k)[Math.min(i, zem.get(k).length - 1)];
        if (nr !== m[1]){ keiskPradzia(p, m[1].length + m[2].length, nr + m[2], false); pakeista++; }
        // antraštėje pašalintas raudonas nurodymas skliaustuose („(koreguojama pagal poreikį)“) - šalinamas ir turinio eilutėje (2026-10-09)
        const at = zemT.get(k)[Math.min(i, zemT.get(k).length - 1)] || '';
        const sk = [...tekstas(p).matchAll(/\s*\([^)]*\)/g)].filter(x => !at.includes(x[0].trim()));
        sk.reverse().forEach(x => { salinkAtkarpa(p, x.index, x.index + x[0].length); nurodymu++; });
      } else if (salinti){ p.parentNode.removeChild(p); istrinta++; }
    }
    return { pakeista, istrinta, nurodymu };
  }

  async function sutvarkyti(doc, opts = {}){
    const d = doc.parts['word/document.xml'];
    const M = modelis(await GPDocx.part(doc, 'word/numbering.xml'), await GPDocx.part(doc, 'word/styles.xml'));
    const Z = wordZymes(M, Array.from(d.getElementsByTagNameNS(W, 'p')));
    const sr = srautas(M, d, Z, opts);
    sr.tuscios.forEach(tr => tr.parentNode.removeChild(tr));
    // Sritys: dokumentas ir jo priedai tame paciame faile (DPS salygos). Priedas - forma ar sarasas - kaip forma (numeriai kaip
    // Word, tekstu); kiti priedai (pasalinimo pagrindai, kvalifikacijos reikalavimai) - perskaiciuojami atskirai, nuo 1.
    const sritys = [{ forma: !!opts.forma, S: [] }];
    sr.S.forEach(e => { if (e.priedas) sritys.push({ forma: PRIEDAS_FORMA.test(e.t), S: [] }); else sritys[sritys.length - 1].S.push(e); });
    const pagr = sritys[0].forma ? uzfiksuok(sritys[0].S) : perskaiciuok(sritys[0].S);
    const S = pagr.concat(...sritys.slice(1).map(x => x.forma ? uzfiksuok(x.S) : perskaiciuok(x.S)));
    const pak = [];
    let tarpu = 0;
    for (const e of S){
      const tarpas = e.lit && e.t.length > e.lit.ilgis && !/[\s ]/.test(e.t.charAt(e.lit.ilgis));   // „1.5.Tekstas“
      let keista = true;
      if (e.zy){
        const taskas = /\.$/.test(e.zy.label) ? '.' : '';
        nuimkSarasa(e.p, e.zy.lv, d);
        if (e.lit) keiskPradzia(e.p, e.lit.ilgis, e.naujas + (e.lit.taskas || taskas), tarpas);
        else idekZyma(e.p, e.naujas + taskas, e.kont !== 'kunas' || !e.t ? 'nothing' : e.zy.lv.suff, d);
      } else if (e.naujas !== e.lit.nr || tarpas){
        keiskPradzia(e.p, e.lit.ilgis, e.naujas + e.lit.taskas, tarpas);
      } else keista = false;
      tarpu += tarpaiPoNumerio(e.p);
      if (keista && e.senas !== e.naujas) pak.push({ buvo: e.senas, tapo: e.naujas, tekstas: (e.kont === 'kunas' ? e.t : e.ltTekstas) });
    }
    const toc = turinys(M, d, pagr.filter(e => e.lygis === 0 && e.skyrius));
    doc.log.push('numeracija: ' + S.length + ' numeriu - tekstu, pakeista ' + pak.length + '; tarpu po numerio pasalinta ' + tarpu +
                 '; tusciu eiluciu istrinta ' + sr.tuscios.length +
                 '; TURINYS: pakeista ' + toc.pakeista + ', istrinta ' + toc.istrinta + ', nurodymu pasalinta ' + toc.nurodymu);
    return { numeriu: S.length, pakeitimai: pak, tarpuPoNumerio: tarpu, tusciuEiluciu: sr.tuscios.length, turinys: toc };
  }

  return { sutvarkyti, wordZymes, modelis };
})();

/* ==========================================================================
   GPLent - VISŲ sugeneruotų dokumentų lentelės (2026-10-04, naudotojo užduotis: pasiūlymo formos lentelė „INFORMACIJA APIE
   TIEKĖJĄ“ ir visos panašios). Vienas kodas visoms lentelėms, kviečiamas kiekvienam dokumentui po numeracijos (GPNum).
   Šablonų faktai (visi 24 paketai, 265 failai): fiksuoto aukščio (hRule exact), simbolių tarpų (rPr spacing, w), „distribute“
   lygiavimo ir fiksuotų eilučių tarpų nebuvo; buvo: beveik jokia eilutė neturi cantSplit, etiketės lygiuotos abipusiai
   siauruose langeliuose (netolygūs tarpai), 114 lentelių platesnės už teksto plotį (pasiūlymo formos tiekėjo lentelė - 9855 /
   9638 DXA), 124 be fiksuoto išdėstymo, pločiai ne DXA (auto, pct), hideMark tik dalyje eilučių. Taisoma:
   - visos lentelės: eilutės aukštis niekada „exact“ (-> atLeast); be simbolių tarpų ir mastelio; „distribute“ -> kairėn;
     tblLayout fixed, tblW = tblGrid suma (DXA), tcW = jungiamų gridCol suma (DXA); per plati lentelė proporcingai susiaurinama
     iki teksto pločio (įdėtinė - iki langelio pločio), neigiama įtrauka - 0; aiškios langelių paraštės (jei šablone nėra - Word numatytosios 0/108);
     fonas tik CLEAR; eilutė nedalijama per puslapį (cantSplit), jei ji trumpa (CANTSPLIT_RIBA) - ilgesnė už puslapį eilutė su
     cantSplit Word'e būtų nukirpta;
   - etiketės eilutė (paskutinis langelis tuščias - pildo tiekėjas): etikečių lygiavimas - LYGIAVIMAS_ETIKETESE (abipusis siauruose
     langeliuose daro netolygius tarpus), vertikalus lygiavimas - viršus, be hideMark (vienoda aukščio logika); pusjuodis - pagal
     PUSJUODIS_ETIKETESE (numatyta - kaip šablone; kursyvas nekeičiamas), išskyrus BE_PUSJUODZIO eilutes (tiekėjo el. pašto
     eilutė - visada be pusjuodžio).
   Pages (2026-10-04, matuota Pages eksportu, naudotojo sprendimas „1 ir 2 kartu“):
   - abipusiai lygiuotą tekstą lentelės langelyje Pages išretina raidėmis, o pusjuodžiam - eilutės aukštį skaičiuoja kaip įprastam,
     tad paskutinė eilutė iškrenta: VISOSE lentelėse abipusis ir „distribute“ -> LYGIAVIMAS_LENTELESE (ir iš stiliaus);
   - Pages lentelės eilutės per puslapius NEDALIJA - kas netelpa, nukerpama (13 dokumentų, 209 pastraipos, daugiausia dvikalbiai
     SPS): eilutė, kurios aukščio įvertis > SKAIDYTI_NUO puslapio, skaidoma ties pastraipomis į kelias eilutes (~DALIES_AUKSTIS
     puslapio), tarp jų rėmelių nėra. Kiekviename stulpelyje pastraipų tvarka ta pati; numeruoto sąrašo punktai ir „laikyti su
     kitu“ pastraipos neperskiriami; mažas vertikaliai sujungtas langelis lieka sujungtas; tęsinio langelis be teksto - tuščia pastraipa be
     numeravimo (eilučių numeriai nepasikeičia); per aukštas vertikaliai sujungtas langelis atjungiamas ir jo turinys paskirstomas
     sujungtoms eilutėms (tame stulpelyje be rėmelių). Word tokias eilutes dalijo pats - jame vaizdas beveik toks pat.
   Tekstas, eilučių tvarka ir raudonos žymos nekeičiami.
   ========================================================================== */
const GPLent = (() => {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  // Numatytieji sprendimai - viena vieta, kad būtų lengva atšaukti
  const LYGIAVIMAS_ETIKETESE = 'left';        // null - palikti šablono (abipusį)
  const PUSJUODIS_ETIKETESE = 'sablonas';     // 'sablonas' - kaip šablone; 'ne' - visų etikečių pusjuodis šalinamas
  // Etikečių eilutės, kurių pusjuodis šalinamas visada (naudotojo sprendimas 2026-10-04): pasiūlymo formos tiekėjo el. pašto
  // eilutė - šablonuose (AK, AKV, TSD, DPSP; LT/EN - abiem kalbomis) vienintelė pusjuodė tarp tiekėjo duomenų eilučių, MVP LT - ne.
  // Kitas šablono pusjuodis (pasiūlymo kainos eilutės, lentelių antraštės) lieka. Atpažįstama pagal eilutės tekstą (mažosiomis).
  const BE_PUSJUODZIO = ['nario elektroninio pašto adresas', 'email address of the supplier'];
  const CANTSPLIT_RIBA = 700;                 // simbolių eilutėje (ir iki 12 pastraipų) - tokia eilutė nedalijama per puslapį
  const LYGIAVIMAS_LENTELESE = 'left';        // visų lentelių langeliuose vietoj abipusio; null - palikti šablono
  const SKAIDYTI_NUO = 0.6;                   // eilutės aukščio įvertis (puslapio teksto aukščio dalimis), nuo kurio eilutė skaidoma
  const DALIES_AUKSTIS = 0.33;                // didžiausias dalies aukštis (puslapio dalimis); Pages netelpančią eilutę kelia į kitą puslapį,
                                              // tad mažesnės dalys - mažiau tuščios vietos puslapio apačioje
  const DALIES_MIN = 0.12;                    // mažiausias dalies aukštis, jei galima (mažiau dalių - mažiau tarpų stulpeliuose)
  const SARASAI_KARTU = false;                // numeruoto sąrašo punktai vienoje dalyje; Pages ir Word numeraciją per langelius tęsia
                                              // (patikrinta Pages PDF: 1) - 12 psl., 2)-4) - 13, 5)-8) - 14), tad neprivaloma
  const ZENKLO_PLOTIS = 0.5;                  // vidutinis ženklo plotis šrifto dydžio dalimis (Arial su atsarga; kalibruota Pages PDF)
  const EILUTES_AUKSTIS = 1.15;               // viengubas eilučių tarpas šrifto dydžio dalimis
  const PARASTES = { top: 0, left: 108, bottom: 0, right: 108 };
  const TBLPR = ['tblStyle','tblpPr','tblOverlap','bidiVisual','tblStyleRowBandSize','tblStyleColBandSize','tblW','jc','tblCellSpacing','tblInd',
    'tblBorders','shd','tblLayout','tblCellMar','tblLook','tblCaption','tblDescription','tblPrChange'];
  const TCPR = ['cnfStyle','tcW','gridSpan','hMerge','vMerge','tcBorders','shd','noWrap','tcMar','textDirection','tcFitText','vAlign','hideMark',
    'headers','cellIns','cellDel','cellMerge','tcPrChange'];
  const PPR = ['pStyle','keepNext','keepLines','pageBreakBefore','framePr','widowControl','numPr','suppressLineNumbers','pBdr','shd',
    'tabs','suppressAutoHyphens','kinsoku','wordWrap','overflowPunct','topLinePunct','autoSpaceDE','autoSpaceDN','bidi','adjustRightInd',
    'snapToGrid','spacing','ind','contextualSpacing','mirrorIndents','suppressOverlap','jc','textDirection','textAlignment',
    'textboxTightWrap','outlineLvl','divId','cnfStyle','rPr','sectPr','pPrChange'];
  const ISSKIRSTYTI = new Set(['distribute', 'lowKashida', 'mediumKashida', 'highKashida', 'thaiDistribute']);
  const kids = (n, tag) => n ? Array.from(n.childNodes).filter(c => c.nodeType === 1 && c.localName === tag) : [];
  const kid = (n, tag) => kids(n, tag)[0] || null;
  const att = (n, a) => n ? (n.getAttributeNS(W, a) || n.getAttribute('w:' + a) || null) : null;
  const nustatyk = (n, a, v) => n.setAttributeNS(W, 'w:' + a, String(v));
  const naujas = (d, tag) => d.createElementNS(W, 'w:' + tag);
  const tekstas = n => Array.from(n.getElementsByTagNameNS(W, 't')).map(t => t.textContent).join('');
  function idek(tevas, el, tvarka){
    const k = tvarka.indexOf(el.localName);
    const po = Array.from(tevas.childNodes).find(c => c.nodeType === 1 && tvarka.indexOf(c.localName) > k);
    tevas.insertBefore(el, po || null);
    return el;
  }
  function vaikas(tevas, tag, tvarka){ return kid(tevas, tag) || idek(tevas, naujas(tevas.ownerDocument, tag), tvarka); }
  function savybes(n, tag, pirmiau){
    let pr = kid(n, tag);
    if (!pr){
      pr = naujas(n.ownerDocument, tag);
      const po = Array.from(n.childNodes).find(c => c.nodeType === 1 && !(pirmiau || []).includes(c.localName));
      n.insertBefore(pr, po || null);
    }
    return pr;
  }
  const tuscias = tc => !tekstas(tc).replace(/[\s_.…]/g, '');
  /* Etiketės eilutė: bent du langeliai, paskutinis tuščias (pildo tiekėjas), prieš jį - tekstas. */
  function etiketesEilute(tr){
    const tcs = kids(tr, 'tc');
    return tcs.length >= 2 && tuscias(tcs[tcs.length - 1]) && tcs.slice(0, -1).some(tc => !tuscias(tc));
  }
  const trumpa = tr => tekstas(tr).length <= CANTSPLIT_RIBA && tr.getElementsByTagNameNS(W, 'p').length <= 12;
  const bePusjuodzio = tr => { const t = tekstas(tr).toLowerCase().replace(/\s+/g, ' '); return BE_PUSJUODZIO.some(f => t.includes(f)); };

  /* Teksto plotis ir aukštis kiekvienai lentelei - pagal artimiausią po jos esantį sectPr. */
  function sekcijuPlociai(body){
    const visi = Array.from(body.getElementsByTagNameNS(W, '*'));
    const out = new Map(); let laukia = [];
    visi.forEach(n => {
      if (n.localName === 'tbl') laukia.push(n);
      else if (n.localName === 'sectPr'){
        const pg = kid(n, 'pgSz'), mr = kid(n, 'pgMar'), cols = kid(n, 'cols');
        const w = pg && mr ? (+att(pg, 'w') || 0) - (+att(mr, 'left') || 0) - (+att(mr, 'right') || 0) : null;
        const h = pg && mr ? (+att(pg, 'h') || 0) - Math.abs(+att(mr, 'top') || 0) - Math.abs(+att(mr, 'bottom') || 0) : null;
        const daugStulp = cols && +(att(cols, 'num') || 1) > 1;
        laukia.forEach(t => out.set(t, { w: daugStulp ? null : w, h: h > 0 ? h : null })); laukia = [];
      }
    });
    return out;
  }

  /* Stilių ir numeracijos modelis aukščio įverčiui ir lygiavimui: šrifto dydis, lygiavimas (su basedOn), numeruoti sąrašai. */
  function modelis(doc){
    const M = { sz: {}, jc: {}, num: {}, ind: {}, base: {}, dsz: 20, djc: null, numatytas: null, numFmt: null, numInd: {} };
    const S = doc && doc.parts && doc.parts['word/styles.xml'];
    if (S){
      const dd = S.getElementsByTagNameNS(W, 'rPrDefault')[0], ddsz = dd && dd.getElementsByTagNameNS(W, 'sz')[0];
      if (ddsz) M.dsz = +att(ddsz, 'val') || 20;
      const pd = S.getElementsByTagNameNS(W, 'pPrDefault')[0], pdjc = pd && pd.getElementsByTagNameNS(W, 'jc')[0];
      if (pdjc) M.djc = att(pdjc, 'val');
      Array.from(S.getElementsByTagNameNS(W, 'style')).forEach(s => {
        const id = att(s, 'styleId'); if (!id) return;
        const ppr = kid(s, 'pPr'), rpr = kid(s, 'rPr');
        M.base[id] = att(kid(s, 'basedOn'), 'val');
        if (kid(ppr, 'jc')) M.jc[id] = att(kid(ppr, 'jc'), 'val');
        if (kid(rpr, 'sz')) M.sz[id] = +att(kid(rpr, 'sz'), 'val') || null;
        const np = kid(ppr, 'numPr'); if (np && att(kid(np, 'numId'), 'val') !== '0') M.num[id] = att(kid(np, 'numId'), 'val');
        const si = kid(ppr, 'ind'); if (si) M.ind[id] = +att(si, 'left') || +att(si, 'start') || 0;
        if (att(s, 'type') === 'paragraph' && (att(s, 'default') === '1' || att(s, 'default') === 'true')) M.numatytas = id;
      });
    }
    const N = doc && doc.parts && doc.parts['word/numbering.xml'];
    if (N){
      const abs = {};
      Array.from(N.getElementsByTagNameNS(W, 'abstractNum')).forEach(a => {
        const lv = {}, li = {};
        kids(a, 'lvl').forEach(l => { const k = att(l, 'ilvl') || '0', ind = kid(kid(l, 'pPr'), 'ind'); lv[k] = att(kid(l, 'numFmt'), 'val'); li[k] = +att(ind, 'left') || +att(ind, 'start') || 0; });
        abs[att(a, 'abstractNumId')] = { lv, li };
      });
      M.numFmt = {};
      Array.from(N.getElementsByTagNameNS(W, 'num')).forEach(n => { const a = abs[att(kid(n, 'abstractNumId'), 'val')] || { lv: {}, li: {} }; M.numFmt[att(n, 'numId')] = a.lv; M.numInd[att(n, 'numId')] = a.li; });
    }
    return M;
  }
  const stiliaus = (M, id, k) => { for (let i = 0; id && i < 20; i++){ if (M[k][id] != null) return M[k][id]; id = M.base[id]; } return null; };
  /* Numeruoto (ne ženklelių) sąrašo raktas pastraipai arba null. Be numbering.xml - bet koks sąrašas laikomas numeruotu (atsargiai). */
  function numeruotas(p, M){
    const ppr = kid(p, 'pPr'), np = kid(ppr, 'numPr');
    const sid = att(kid(ppr, 'pStyle'), 'val');
    const id = np ? att(kid(np, 'numId'), 'val') : stiliaus(M, sid, 'num');
    if (!id || id === '0') return null;
    if (!M.numFmt) return id;
    const f = (M.numFmt[id] || {})[np ? (att(kid(np, 'ilvl'), 'val') || '0') : '0'];
    return f === 'bullet' || f === 'none' ? null : id;
  }

  /* Aukščio įvertis (DXA). Sąmoningai su atsarga: per didelis įvertis tik daugiau skaido, per mažas - Pages nukirptų. */
  function pAukstis(p, plotis, M){
    const ppr = kid(p, 'pPr'), sid = att(kid(ppr, 'pStyle'), 'val') || M.numatytas;
    let sz = 0;
    Array.from(p.getElementsByTagNameNS(W, 'r')).forEach(r => { const v = +att(kid(kid(r, 'rPr'), 'sz'), 'val') || 0; if (v > sz && tekstas(r).trim()) sz = v; });
    const pt = (sz || stiliaus(M, sid, 'sz') || M.dsz) / 2;
    const ind = kid(ppr, 'ind'), np = kid(ppr, 'numPr');
    // įtrauka: tiesioginė, kitaip - sąrašo lygio (numbering.xml), kitaip - stiliaus
    const nid = np ? att(kid(np, 'numId'), 'val') : stiliaus(M, sid, 'num');
    const kaire = ind && (att(ind, 'left') || att(ind, 'start')) != null ? (+att(ind, 'left') || +att(ind, 'start') || 0)
      : nid && nid !== '0' && M.numInd[nid] ? (M.numInd[nid][np ? (att(kid(np, 'ilvl'), 'val') || '0') : '0'] || 0) : (stiliaus(M, sid, 'ind') || 0);
    const w = Math.max(plotis - kaire - (+att(ind, 'right') || +att(ind, 'end') || 0), 300);
    const sp = kid(ppr, 'spacing'), line = +att(sp, 'line') || 0, rule = att(sp, 'lineRule') || 'auto';
    let lh = pt * 20 * EILUTES_AUKSTIS;
    if (line) lh = rule === 'auto' ? lh * line / 240 : rule === 'exact' ? line : Math.max(line, lh);
    const t = tekstas(p);
    const luziai = Array.from(p.getElementsByTagNameNS(W, 'br')).filter(b => att(b, 'type') !== 'page').length;
    const eil = (t.trim() ? Math.max(1, Math.ceil(t.length * pt * 20 * ZENKLO_PLOTIS / w * 1.05)) : 1) + luziai;
    return eil * lh + (+att(sp, 'before') || 0) + (+att(sp, 'after') || 0);
  }
  function blokoAukstis(n, plotis, M){
    if (n.localName === 'p') return pAukstis(n, plotis, M);
    if (n.localName === 'tbl') return kids(n, 'tr').reduce((a, tr) => a + eilutesIvertis(tr, M, parastesL(kid(n, 'tblPr'))), 0);
    if (n.localName === 'sdt'){ const c = kid(n, 'sdtContent'); return c ? Array.from(c.childNodes).filter(x => x.nodeType === 1).reduce((a, x) => a + blokoAukstis(x, plotis, M), 0) : 0; }
    return 0;
  }
  const langelioPlotis = (tc, parastes) => (+att(kid(kid(tc, 'tcPr'), 'tcW'), 'w') || 2000) - parastes;
  function eilutesIvertis(tr, M, parastes){
    return Math.max(0, ...kids(tr, 'tc').map(tc => { const w = langelioPlotis(tc, parastes);
      return Array.from(tc.childNodes).filter(n => n.nodeType === 1 && n.localName !== 'tcPr').reduce((a, n) => a + blokoAukstis(n, w, M), 0); }));
  }

  /* Langelio blokai skaidymui: pastraipa, įdėtinė lentelė ar turinio valdiklis; žymės ir kiti langelio vaikai - kartu su kitu bloku.
     Numeruoto sąrašo punktai (nuo pirmo iki paskutinio to paties sąrašo) ir „laikyti su kitu“ pastraipa - vienas blokas. */
  function langelioBlokai(tc, M, parastes){
    const w = langelioPlotis(tc, parastes), out = []; let laukia = [];
    Array.from(tc.childNodes).forEach(n => {
      if (n.nodeType !== 1 || n.localName === 'tcPr') return;
      if (['p', 'tbl', 'sdt'].includes(n.localName)){
        out.push({ mazgai: laukia.concat([n]), h: blokoAukstis(n, w, M), sar: n.localName === 'p' ? numeruotas(n, M) : null,
                   kartu: n.localName === 'p' && !!kid(kid(n, 'pPr'), 'keepNext') });
        laukia = [];
      } else laukia.push(n);
    });
    if (laukia.length){ if (out.length) out[out.length - 1].mazgai.push(...laukia); else out.push({ mazgai: laukia, h: 0, sar: null, kartu: false }); }
    // sąrašų ribos: tas pats sąrašas - nuo pirmo iki paskutinio jo punkto
    const ribos = {};
    out.forEach((b, i) => { if (b.sar){ ribos[b.sar] = ribos[b.sar] || [i, i]; ribos[b.sar][1] = i; } });
    const kartu = out.map(() => false);                      // kartu[i] - blokas i jungiamas su i+1
    if (SARASAI_KARTU) Object.values(ribos).forEach(([a, z]) => { for (let i = a; i < z; i++) kartu[i] = true; });
    out.forEach((b, i) => { if (b.kartu && i < out.length - 1) kartu[i] = true; });
    const grupes = [];
    out.forEach((b, i) => {
      if (i && kartu[i - 1]){ const g = grupes[grupes.length - 1]; g.mazgai.push(...b.mazgai); g.h += b.h; }
      else grupes.push({ mazgai: b.mazgai.slice(), h: b.h });
    });
    return grupes;
  }
  const BORDERS = ['top', 'start', 'left', 'bottom', 'end', 'right', 'insideH', 'insideV', 'tl2br', 'tr2bl'];
  const NUSTATYMAI = { skaidyti: true };      // testams: false - be skaidymo ir sujungimų atjungimo (palyginti tekstą)
  const SKAIDYTOS = new WeakSet();            // suskaidytos eilutės ir jų dalys - ne šablono etiketės eilutės
  function beRemelio(tc, krastas){
    const d = tc.ownerDocument, tcPr = savybes(tc, 'tcPr', []), b = vaikas(tcPr, 'tcBorders', TCPR);
    let e = kid(b, krastas);
    if (!e) e = idek(b, naujas(d, krastas), BORDERS);
    Array.from(e.attributes).map(a => a.name).forEach(a => e.removeAttribute(a));
    nustatyk(e, 'val', 'nil');
  }
  /* Tuščia tęsinio pastraipa: be numeravimo, stiliaus ir „laikyti su kitu“; šrifto dydis - kaip langelio pirmos pastraipos. */
  function tusciaPastraipa(tc){
    const d = tc.ownerDocument, p = naujas(d, 'p'), ppr = naujas(d, 'pPr'), sp = naujas(d, 'spacing');
    nustatyk(sp, 'before', 0); nustatyk(sp, 'after', 0); ppr.appendChild(sp);
    const pirma = kids(tc, 'p')[0], rpr = pirma && kid(kid(pirma, 'pPr'), 'rPr');
    if (rpr) ppr.appendChild(rpr.cloneNode(true));
    p.appendChild(ppr);
    return p;
  }
  function uzbaikLangeli(tc){
    const v = Array.from(tc.childNodes).filter(n => n.nodeType === 1 && n.localName !== 'tcPr');
    if (!v.length || v[v.length - 1].localName !== 'p') tc.appendChild(tusciaPastraipa(tc));
  }
  /* Per aukštas vertikaliai sujungtas langelis (Pages ir jo per puslapius nedalija): sujungimas atjungiamas, turinys iš eilės
     paskirstomas tų pačių eilučių langeliams (pagal kitų stulpelių aukštį, likutis - paskutiniam), tame stulpelyje tarp jų rėmelių
     nėra - atrodo kaip vienas langelis; toliau per aukštas eilutes skaido skaidyk(). Jei tęsinio langelyje yra tekstas - neliečiama. */
  function atjunkSujungimus(tbl, puslapis, M, st){
    const parastes = parastesL(kid(tbl, 'tblPr')), eil = kids(tbl, 'tr');
    const poz = eil.map(tr => { const m = new Map(); let g = +att(kid(kid(tr, 'trPr'), 'gridBefore'), 'val') || 0;
      kids(tr, 'tc').forEach(tc => { m.set(g, tc); g += +att(kid(kid(tc, 'tcPr'), 'gridSpan'), 'val') || 1; }); return m; });
    const vm = tc => kid(kid(tc, 'tcPr'), 'vMerge');
    const aukstis = tc => langelioBlokai(tc, M, parastes).reduce((a, b) => a + b.h, 0);
    eil.forEach((tr, i) => poz[i].forEach((tc, g) => {
      const v = vm(tc);
      if (!v || att(v, 'val') !== 'restart') return;
      const grupe = [tc];
      for (let j = i + 1; j < eil.length; j++){ const c = poz[j].get(g), w = c && vm(c); if (!w || att(w, 'val') === 'restart') break; grupe.push(c); }
      if (grupe.length < 2 || aukstis(tc) <= SKAIDYTI_NUO * puslapis) return;
      if (grupe.slice(1).some(c => tekstas(c).trim())) return;
      const blokai = langelioBlokai(tc, M, parastes);
      const talpa = grupe.map(c => Math.max(0, ...kids(c.parentNode, 'tc').filter(x => x !== c && !vm(x)).map(aukstis)));
      grupe.forEach(c => { const w = vm(c); w.parentNode.removeChild(w);
        const va = kid(kid(c, 'tcPr'), 'vAlign'); if (va && att(va, 'val') !== 'top') nustatyk(va, 'val', 'top'); });
      grupe.slice(1).forEach(c => Array.from(c.childNodes).filter(n => n.nodeType === 1 && n.localName !== 'tcPr').forEach(n => c.removeChild(n)));
      let gi = 0, y = 0;
      blokai.forEach(b => {
        while (gi < grupe.length - 1 && y > 0 && y + b.h / 2 > talpa[gi]){ gi++; y = 0; }
        if (gi) b.mazgai.forEach(m => grupe[gi].appendChild(m));
        y += b.h;
      });
      grupe.forEach((c, ci) => { uzbaikLangeli(c); if (ci < grupe.length - 1) beRemelio(c, 'bottom'); if (ci) beRemelio(c, 'top'); });
      st.atjungta++;
    }));
  }
  /* Dalių ribos: kiekvienai daliai parenkamas aukštis, kuriame pastraipos baigiasi daugelyje stulpelių - kad stulpeliuose liktų kuo
     mažiau tuščios vietos (tarpai / aukštis); viršijus DALIES_AUKSTIS ar nesiekiant DALIES_MIN - bauda. Aukštesnis už ribą blokas
     (numeruotas sąrašas, ilga pastraipa) irgi gali nustatyti dalies aukštį - kiti stulpeliai tada užpildo iki jo.
     Grąžina kiekvienam stulpeliui - kiek blokų kiekvienoje dalyje. */
  function dalys(blokai, puslapis){
    const max = DALIES_AUKSTIS * puslapis, min = DALIES_MIN * puslapis, lubos = 0.9 * puslapis;
    const c = blokai.map(b => b ? { b, i: 0 } : null), out = blokai.map(() => []);
    const liko = x => x && x.i < x.b.length;
    for (let apsauga = 0; c.some(liko) && apsauga < 500; apsauga++){
      const imk = Y => c.map(x => { if (!liko(x)) return { j: x ? x.i : 0, h: 0 }; let y = 0, j = x.i; while (j < x.b.length && y + x.b[j].h <= Y + 1){ y += x.b[j].h; j++; } return { j, h: y }; });
      const kandidatai = new Set();
      c.forEach(x => { if (!liko(x)) return; let y = 0; for (let j = x.i; j < x.b.length; j++){ y += x.b[j].h; if (y > lubos && j > x.i) break; kandidatai.add(y); } });
      let geriausias = null;
      kandidatai.forEach(Y => {
        const t = imk(Y), P = Math.max(...t.map(z => z.h));
        if (!(P > 0)) return;
        const lieka = t.some((z, k) => c[k] && z.j < c[k].b.length);
        const tarpai = t.reduce((a, z, k) => a + (c[k] && z.j < c[k].b.length ? P - z.h : 0), 0);
        const kaina = tarpai / P + 3 * Math.max(0, P - max) / puslapis + (P < min && lieka ? 1 : 0);
        if (!geriausias || kaina < geriausias.kaina - 1e-9 || (Math.abs(kaina - geriausias.kaina) < 1e-9 && P > geriausias.P)) geriausias = { kaina, P, t };
      });
      geriausias.t.forEach((z, k) => { if (c[k]){ out[k].push(z.j - c[k].i); c[k].i = z.j; } else out[k].push(0); });
    }
    return out;
  }
  /* Per aukšta eilutė (Pages jos per puslapius nedalija) - kelios eilutės ties pastraipomis (ribos - dalys()); tarp dalių rėmelių nėra. */
  function skaidyk(tbl, puslapis, M, st){
    if (!puslapis) return;
    const parastes = parastesL(kid(tbl, 'tblPr'));
    kids(tbl, 'tr').forEach(tr => {
      const trPr = kid(tr, 'trPr');
      if (kid(trPr, 'tblHeader')) return;
      const tcs = kids(tr, 'tc');
      if (!tcs.length) return;
      const sujungtas = tcs.map(tc => !!kid(kid(tc, 'tcPr'), 'vMerge'));
      const blokai = tcs.map((tc, i) => sujungtas[i] ? null : langelioBlokai(tc, M, parastes));
      const H = Math.max(0, ...blokai.filter(Boolean).map(b => b.reduce((a, x) => a + x.h, 0)));
      if (H <= SKAIDYTI_NUO * puslapis) return;
      const kiek = dalys(blokai, puslapis), k = Math.max(0, ...kiek.map(x => x.length));
      if (k < 2) return;
      const dalis = blokai.map((b, i) => { const o = []; let j = 0; for (let d = 0; d < k; d++){ const n = kiek[i][d] || 0; o.push(b ? b.slice(j, j + n) : []); j += n; } return o; });
      const naud = Array.from({ length: k }, (_, j) => j).filter(j => dalis.some(o => o[j].length));
      if (naud.length < 2) return;
      st.skaidyta++; SKAIDYTOS.add(tr);
      let po = tr;
      const eilutes = [tr];
      naud.slice(1).forEach(j => {
        const n = naujas(tr.ownerDocument, 'tr');
        const pex = kid(tr, 'tblPrEx'); if (pex) n.appendChild(pex.cloneNode(true));
        if (trPr){ const c = trPr.cloneNode(true); ['trHeight', 'cantSplit'].forEach(t => { const e = kid(c, t); if (e) c.removeChild(e); }); if (c.childNodes.length) n.appendChild(c); }
        tcs.forEach((tc, i) => {
          const t = naujas(tr.ownerDocument, 'tc'), pr = kid(tc, 'tcPr');
          if (pr){ const c = pr.cloneNode(true); const vm = kid(c, 'vMerge'); if (vm){ vm.removeAttributeNS(W, 'val'); vm.removeAttribute('w:val'); } t.appendChild(c); }
          dalis[i][j].forEach(x => x.mazgai.forEach(m => t.appendChild(m)));
          if (!dalis[i][j].length) t.appendChild(tusciaPastraipa(tc));
          uzbaikLangeli(t);
          n.appendChild(t);
        });
        tbl.insertBefore(n, po.nextSibling); po = n; eilutes.push(n); SKAIDYTOS.add(n); st.dalys++;
      });
      tcs.forEach(uzbaikLangeli);
      // tarp dalių - be rėmelių
      eilutes.forEach((e, ei) => kids(e, 'tc').forEach(tc => {
        if (ei < eilutes.length - 1) beRemelio(tc, 'bottom');
        if (ei > 0) beRemelio(tc, 'top');
      }));
      const liko = Math.max(0, ...eilutes.map(e => eilutesIvertis(e, M, parastes)));
      if (liko > puslapis) st.netelpa++;
    });
  }
  const parastesL = tblPr => { const m = kid(tblPr, 'tblCellMar'); return m ? (+att(kid(m, 'left') || kid(m, 'start'), 'w') || 0) + (+att(kid(m, 'right') || kid(m, 'end'), 'w') || 0) : PARASTES.left + PARASTES.right; };

  function vienaLentele(tbl, galima, st, puslapis, M){
    const d = tbl.ownerDocument;
    const tblPr = savybes(tbl, 'tblPr', []);
    const grid = kid(tbl, 'tblGrid');
    let gc = grid ? kids(grid, 'gridCol').map(g => +att(g, 'w') || 0) : [];
    // 1. Plotis: per plati lentelė - proporcingai iki galimo pločio; tblW = tblGrid suma; tcW = gridCol suma
    if (gc.length && gc.every(x => x > 0)){
      // neigiama įtrauka (lentelė išlenda į kairę paraštę, šablonuose iki 601 DXA) - 0: lentelė tarp paraščių, plotis - teksto plotis
      let ind = +att(kid(tblPr, 'tblInd'), 'w') || 0;
      if (ind < 0 && galima){ nustatyk(kid(tblPr, 'tblInd'), 'w', 0); nustatyk(kid(tblPr, 'tblInd'), 'type', 'dxa'); ind = 0; st.itrauka++; }
      const riba = galima ? galima - ind : null;
      const suma = gc.reduce((a, b) => a + b, 0);
      if (riba && suma > riba + 5){
        const k = riba / suma;
        gc = gc.map(x => Math.max(1, Math.floor(x * k)));
        gc[gc.length - 1] += riba - gc.reduce((a, b) => a + b, 0);
        kids(grid, 'gridCol').forEach((g, i) => nustatyk(g, 'w', gc[i]));
        st.siaurinta++;
      }
      const tw = vaikas(tblPr, 'tblW', TBLPR);
      if (att(tw, 'type') !== 'dxa' || +att(tw, 'w') !== gc.reduce((a, b) => a + b, 0)){ nustatyk(tw, 'w', gc.reduce((a, b) => a + b, 0)); nustatyk(tw, 'type', 'dxa'); st.tblW++; }
      kids(tbl, 'tr').forEach(tr => {
        const trPr = kid(tr, 'trPr');
        let gi = +att(kid(trPr, 'gridBefore'), 'val') || 0;
        kids(tr, 'tc').forEach(tc => {
          const tcPr = savybes(tc, 'tcPr', []);
          const span = +att(kid(tcPr, 'gridSpan'), 'val') || 1;
          if (gi + span <= gc.length){
            const plotis = gc.slice(gi, gi + span).reduce((a, b) => a + b, 0);
            const tcW = vaikas(tcPr, 'tcW', TCPR);
            if (att(tcW, 'type') !== 'dxa' || +att(tcW, 'w') !== plotis){ nustatyk(tcW, 'w', plotis); nustatyk(tcW, 'type', 'dxa'); st.tcW++; }
          }
          gi += span;
        });
      });
    }
    // 1a. Per aukštos eilutės - kelios eilutės (Pages jų per puslapius nedalija); naujos eilutės toliau tvarkomos kaip visos
    if (puslapis && NUSTATYMAI.skaidyti){ atjunkSujungimus(tbl, puslapis, M, st); skaidyk(tbl, puslapis, M, st); }
    // 2. Fiksuotas išdėstymas, aiškios paraštės
    const lay = vaikas(tblPr, 'tblLayout', TBLPR);
    if (att(lay, 'type') !== 'fixed'){ nustatyk(lay, 'type', 'fixed'); st.fixed++; }
    if (!kid(tblPr, 'tblCellMar')){
      const m = idek(tblPr, naujas(d, 'tblCellMar'), TBLPR);
      ['top', 'left', 'bottom', 'right'].forEach(k => { const e = naujas(d, k); nustatyk(e, 'w', PARASTES[k]); nustatyk(e, 'type', 'dxa'); m.appendChild(e); });
      st.parastes++;
    }
    // 3. Eilutės ir langeliai
    kids(tbl, 'tr').forEach(tr => {
      const trPr = savybes(tr, 'trPr', ['tblPrEx']);
      const h = kid(trPr, 'trHeight');
      if (h && att(h, 'hRule') === 'exact'){ nustatyk(h, 'hRule', 'atLeast'); st.exact++; }
      if (!kid(trPr, 'cantSplit') && trumpa(tr)){ trPr.appendChild(naujas(d, 'cantSplit')); st.cantSplit++; }
      if (!trPr.childNodes.length) tr.removeChild(trPr);
      const etik = !SKAIDYTOS.has(tr) && etiketesEilute(tr) && trumpa(tr);
      if (etik) st.etikeciu++;
      const beB = etik && (PUSJUODIS_ETIKETESE === 'ne' || bePusjuodzio(tr)), bPries = st.pusjuodis;
      kids(tr, 'tc').forEach((tc, ci, visi) => {
        const tcPr = kid(tc, 'tcPr');
        if (tcPr){
          const fit = kid(tcPr, 'tcFitText'); if (fit){ tcPr.removeChild(fit); st.tarpai++; }
          if (etik){
            const hm = kid(tcPr, 'hideMark'); if (hm){ tcPr.removeChild(hm); st.hideMark++; }
            if (!kid(tcPr, 'vAlign')){ const v = idek(tcPr, naujas(d, 'vAlign'), TCPR); nustatyk(v, 'val', 'top'); }
          }
          const sh = kid(tcPr, 'shd');
          if (sh && att(sh, 'val') === 'solid'){ const sp = att(sh, 'color'); nustatyk(sh, 'val', 'clear'); if (sp && sp !== 'auto') nustatyk(sh, 'fill', sp); nustatyk(sh, 'color', 'auto'); st.shd++; }
        }
        const etiketesLangelis = etik && ci < visi.length - 1;
        Array.from(tc.getElementsByTagNameNS(W, 'p')).forEach(p => {
          let u = p.parentNode; while (u && u !== tc && u.localName !== 'tbl') u = u.parentNode;
          if (u !== tc) return;                                    // įdėtinės lentelės pastraipos - jų lentelėje
          const ppr = kid(p, 'pPr');
          const jc = ppr && kid(ppr, 'jc');
          const v = jc ? att(jc, 'val') : stiliaus(M, att(kid(ppr, 'pStyle'), 'val') || M.numatytas, 'jc') || M.djc;
          if (jc && ISSKIRSTYTI.has(v)){ nustatyk(jc, 'val', 'left'); st.distribute++; }
          else if (jc && etiketesLangelis && LYGIAVIMAS_ETIKETESE && v === 'both'){ nustatyk(jc, 'val', LYGIAVIMAS_ETIKETESE); st.kairen++; }
          else if (LYGIAVIMAS_LENTELESE && (v === 'both' || ISSKIRSTYTI.has(v))){
            if (jc) nustatyk(jc, 'val', LYGIAVIMAS_LENTELESE);
            else { const e = idek(savybes(p, 'pPr', []), naujas(d, 'jc'), PPR); nustatyk(e, 'val', LYGIAVIMAS_LENTELESE); }
            st.kairenVisos++;
          }
        });
        Array.from(tc.getElementsByTagNameNS(W, 'rPr')).forEach(rpr => {
          ['spacing', 'w', 'fitText'].forEach(tag => { const e = kid(rpr, tag); if (e){ rpr.removeChild(e); st.tarpai++; } });
          if (etiketesLangelis && beB) ['b', 'bCs'].forEach(tag => { const e = kid(rpr, tag); if (e){ rpr.removeChild(e); st.pusjuodis++; } });
        });
      });
      if (st.pusjuodis > bPries) st.pusjuodisEil++;
    });
  }
  function sutvarkyti(doc){
    const D = doc.parts['word/document.xml'];
    const body = D.getElementsByTagNameNS(W, 'body')[0];
    const st = { lenteliu: 0, siaurinta: 0, itrauka: 0, tblW: 0, tcW: 0, fixed: 0, parastes: 0, exact: 0, cantSplit: 0, etikeciu: 0, kairen: 0, hideMark: 0,
                 distribute: 0, tarpai: 0, pusjuodis: 0, pusjuodisEil: 0, shd: 0, kairenVisos: 0, skaidyta: 0, dalys: 0, netelpa: 0, atjungta: 0 };
    if (!body) return st;
    const plociai = sekcijuPlociai(body), M = modelis(doc);
    const lenteles = Array.from(body.getElementsByTagNameNS(W, 'tbl')).filter(t => {
      for (let u = t.parentNode; u && u !== body; u = u.parentNode) if (u.localName === 'txbxContent') return false;   // teksto laukai - savo dydžio
      return true;
    });
    // viršutinio lygio pirmos - įdėtinės gauna jau sutvarkyto langelio plotį
    lenteles.forEach(t => {
      st.lenteliu++;
      let tc = null;
      for (let u = t.parentNode; u && u !== body; u = u.parentNode) if (u.localName === 'tc'){ tc = u; break; }
      let galima = null, puslapis = null;
      if (tc){
        const tw = kid(kid(tc, 'tcPr'), 'tcW');
        let tevas = tc; while (tevas && tevas.localName !== 'tbl') tevas = tevas.parentNode;
        galima = tw && att(tw, 'type') === 'dxa' ? (+att(tw, 'w') || 0) - parastesL(kid(tevas, 'tblPr')) : null;
      } else { const m = plociai.get(t) || {}; galima = m.w || null; puslapis = m.h || null; }
      vienaLentele(t, galima, st, puslapis, M);
    });
    return st;
  }
  return { sutvarkyti, etiketesEilute, trumpa, bePusjuodzio, modelis, eilutesIvertis, parastesL, NUSTATYMAI, LYGIAVIMAS_ETIKETESE, LYGIAVIMAS_LENTELESE,
           PUSJUODIS_ETIKETESE, BE_PUSJUODZIO, CANTSPLIT_RIBA, SKAIDYTI_NUO, DALIES_AUKSTIS };
})();

const GPAudit = (() => {
  const W = GPDocx.NS_W;
  /* Baigtumo kriterijus: raudonos = 0, tuscios vietos = 0, komentarai = 0.
     Kas lieka - parodoma zmogui pastraipu tikslumu. Nieko nenutylima.       */
  function check(doc, imone, forma){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(W,'body')[0];
    const paras = GPDocx.els(body,'p');
    const raudonos = [], tuscios = [];
    paras.forEach((p, i) => {
      const txt = GPDocx.paraText(p).trim();
      if (!txt) return;
      // TIK matoma raudona: run'as, kuris turi teksta. Pastraipos zenklo (¶)
      // spalva vartotojui nematoma - ja valom atskirai, bet nekaltinam punkto.
      let red = false;
      for (const r of GPDocx.els(p,'r')){
        const rt = GPDocx.els(r,'t').map(x => x.textContent).join('');
        if (!rt.trim()) continue;
        for (const c of GPDocx.els(r,'color')){
          const v = (c.getAttributeNS(W,'val')||'').toUpperCase();
          if (['FF0000','C00000','ED1C24'].includes(v)) red = true;
        }
      }
      // Visas pastraipos tekstas (iki 2026-10-04 - 110 ženklų, kirpta ir žodžio viduryje); sutraukia rodymas.
      if (red) raudonos.push({ i, text: txt });
      // Betekste bruksniu linija - dokumento pabaigos skirtukas, ne pildomas laukas.
      const vienBruksniai = txt.replace(/[_\s]/g,'') === '';
      if (!vienBruksniai && GPGen.vietos(txt).length) tuscios.push({ i, text: txt });
    });
    // Svelnus ispejimas. Gaudom tris dalykus, kuriu "raudona / bruksneliai"
    // kriterijus nepagauna:
    //   1) "X" vietoj numerio ("SPS X priedas", "dydis - X Eur");
    //   2) vietos rezervai DIDZIOSIOMIS ("PIRKIMO PAVADINIMAS", "PROCUREMENT TITLE");
    //   3) likes ĮMONĖS PAVADINIMAS (su ar be /.../ - jei keitimas nepavyko).
    const patikrinti = [];
    const REZERVAS = /[„"']([A-ZĄČĘĖĮŠŲŪŽ][A-ZĄČĘĖĮŠŲŪŽ \-]{5,})[""']|ĮMONĖS PAVADINIMAS/;
    paras.forEach((p, i) => {
      const t = GPDocx.paraText(p).trim();
      if (!t) return;
      // Ir didzioji, ir mazoji "x" (SPS X priedas / SPS x priedą) - abi yra
      // vietos rezervas vietoj skaiciaus. Atskiras "x" tekste teisiniuose
      // sablonuose praktiskai visada yra rezervas, tad geltona zyma saugi.
      if (/(^|[\s(])[Xx]([\s.,)]|$)/.test(t) || REZERVAS.test(t))
        patikrinti.push({ i, text: t });
      // Dalis sablonu (pvz. konfidencialumo priedas) LITGRID rekvizitus rašo
      // TIESIOGIAI, ne per zyma: pavadinima, el. pasta. Perkant kitai imonei
      // jie liktu dokumente kaip svetimi duomenys.
      if (imone && !/litgrid/i.test(imone) && /litgrid/i.test(t))
        patikrinti.push({ i, text: t, svetimas: true });
    });
    // TUSTI KVALIFIKACIJOS LANGELIAI: kvalifikacijos lenteleje (antraste turi
    // "Kvalifikacijos reikalavimas") duomenu eilute (>=3 langeliai), kurios
    // reikalavimo stulpelio langelis VISAI tuscias. Baigtumo kriterijus
    // "raudona/bruksneliai" tokio langelio nepagauna. NEblokuojam (i patikrinti,
    // ne i tuscios): tuscias langelis gali buti samoningas (kvalifikuojama tik
    // per EBVPD), tad zmogus turi ivertinti - ar ideti reikalavima, ar palikti.
    const kids = (el, ln) => Array.from(el.children).filter(c => c.localName === ln);
    const cellTxt = c => GPDocx.els(c,'t').map(t => t.textContent).join('').trim();
    for (const tbl of GPDocx.els(d,'tbl')){
      const eil = kids(tbl,'tr');
      if (eil.length < 2) continue;
      const antr = kids(eil[0],'tc').map(cellTxt);
      let stulp = antr.findIndex(x => /kvalifikacijos reikalavim/i.test(x));
      if (stulp < 0) continue;                          // ne kvalifikacijos lentele
      for (let ri = 1; ri < eil.length; ri++){
        const c = kids(eil[ri],'tc');
        if (c.length < 3) continue;                     // kategorijos antraste (1 langelis)
        if (!cellTxt(c[stulp] || c[1]))
          patikrinti.push({ i:-1, text:'(tuščias kvalifikacijos reikalavimo langelis - įrašykite reikalavimą arba pagrįskite, kad taikoma tik EBVPD)' });
      }
    }
    const komentarai = GPDocx.els(d,'commentReference').length;
    // TIEKEJO FORMOS: tuscios vietos ir raudonos pastabos jose yra pasiulymu
    // pateikimo etapo dalykas - tiekejas jas pildys pats. Tai ne klaidos, o
    // informacija; formos svara lemia tik komentarai ir imones zymos.
    if (forma){
      const tiekejo = [...raudonos.map(x => ({...x, rusis:'raudona'})),
                       ...tuscios.map(x => ({...x, rusis:'tuscia'}))];
      const zymos = patikrinti.filter(x => /ĮMONĖS PAVADINIMAS/.test(x.text));
      return {
        raudonos: [], tuscios: [], komentarai, patikrinti: zymos, tiekejo,
        svarus: komentarai === 0 && zymos.length === 0
      };
    }
    return {
      raudonos, tuscios, komentarai, patikrinti,
      svarus: raudonos.length === 0 && tuscios.length === 0 && komentarai === 0
    };
  }
  return { check };
})();
