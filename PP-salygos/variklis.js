/* ==========================================================================
   PP-salygos - variklis (bendras: kartografas + generatorius)
   ---------------------------------------------------------------------------
   GPDocx - deterministine .docx chirurgija (JSZip + XML). Jokio AI.
   GPMap  - sablono kartografavimas: is paties sablono istraukia salygu
            sluoksni (raudonas tekstas), komentaru sluoksni ir tuscias vietas.
   Reikalauja: vendor/jszip.min.js
   ========================================================================== */
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
          out.set(owner[i], out.get(owner[i]) + String(values[mt.name]));
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
  function deleteTableAfter(doc, paraIndex, kiek = 1){
    const d = doc.parts['word/document.xml'];
    const body = d.getElementsByTagNameNS(NS_W,'body')[0];
    // Dalis taisykliu valdo KELIAS lenteles ("3 ir 4 lenteles paliekamos").
    let n = -1, rasta = 0;
    for (const node of Array.from(body.children)){
      if (node.localName === 'p') n++;
      if (node.localName === 'tbl' && n >= paraIndex && rasta < kiek){
        node.parentNode.removeChild(node);
        rasta++;
      }
    }
    note(doc, `Lenteles po pastraipos ${paraIndex}: istrinta ${rasta} is ${kiek}.`);
    return rasta;
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
  async function save(doc, type='blob'){
    for (const [path, xml] of Object.entries(doc.parts)){
      // createFolders:false - kitaip JSZip prideda kataloginius irasus ("word/"),
      // kuriu Word'o pakuoteje nera ir kuriems nera Content_Types irašo.
      doc.zip.file(path, ser.serializeToString(xml), { createFolders:false });
    }
    return doc.zip.generateAsync({ type, compression:'DEFLATE' });
  }

  return { open, part, save, stripComments, fillTags, deleteParagraphs, replaceText,
           setUpdateFields, deleteTableAfter, tables, cleanOrphanBookmarks, replaceRegex, insertLogo, paraText, els, NS_W };
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

      const st = runState(p);
      // SULIETA SALYGA: dalis sablonu (MVP dvikalbis) salygos antraste iraso i TA
      // PACIA pastraipa kaip nuostata: raudonai "Jei X:" + juodai pati nuostata.
      // Tokia salyga valdo savo pacios pastraipa: itraukiant - raudona antraste
      // trinama, nuostata lieka; neitraukiant - trinama visa pastraipa.
      const raud = st === 'inline' ? raudonasRuno(p) : '';
      const sulieta = !!raud && COND_SU_DVITASKIU.test(raud);
      out.push({
        i, text: txt, state: st, style, ilvl, inTable,
        sulieta, raudonas: raud,
        klausimasTekstas: sulieta ? raud.replace(/[:\s]+$/,'').replace(/^[\s.,;]+/,'') : null,
        numbered: !!numPr,
        heading: (!!numPr && ilvl === 0) || /heading|antra/i.test(style),
        // Salygos antraste paprastai NEnumeruota. Bet sablone pasitaiko ir
        // numeruotu (pvz. zaliuju alternatyva) - tokia laikom salyga tik jei ji
        // baigiasi dvitaskiu, t. y. aiskiai iveda toliau einancius punktus.
        cond:   st === 'red' && (COND_RE.test(txt) || COND_RE_EN.test(txt)) && txt.length > 8
                && (!numPr || /:\s*$/.test(txt)),
        condEN: st === 'red' && COND_RE_EN.test(txt) && txt.length > 8 && (!numPr || /:\s*$/.test(txt)),
        blank: BLANK_RE.test(txt),
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

  /* Tuscios vietos: "____" arba "[nurodymas]" pakeiciami vartotojo tekstu.  */
  /* Pastraipoje gali buti KELIOS tuscios vietos ("pripazinti __ (_____)").
     Priimam reiksmiu masyva ir uzpildom eiles tvarka; tuscia reiksme palieka
     vieta nepakeista (ir auditas apie ja praneš).                            */
  const VIETA_RE = /_+|\[[^\]]{4,}\]/g;
  function vietos(text){
    VIETA_RE.lastIndex = 0;
    const out = []; let m;
    while ((m = VIETA_RE.exec(text))) out.push({ start:m.index, end:m.index+m[0].length, zyma:m[0] });
    return out;
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
        const val = (arr[vi]||'').trim();
        out.set(owner[k], out.get(owner[k]) + (val || v.zyma));   // tuscia -> paliekam zyma
        if (val) n++;
        k = v.end - 1; vi++;
        continue;
      }
      out.set(owner[k], out.get(owner[k]) + s[k]);
    }
    for (const t of ts){ t.textContent = out.get(t); t.setAttribute('xml:space','preserve'); }
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
  function keistiRaudonaTeksta(paras, i, value){
    const p = paras[i]; if (!p) return false;
    const rs = raudoniRunai(p);
    if (!rs.length) return false;
    const first = rs[0];
    const ts = GPDocx.els(first,'t');
    if (ts.length){ ts[0].textContent = value; ts[0].setAttribute('xml:space','preserve'); }
    for (let k=1;k<ts.length;k++) ts[k].textContent = '';
    rs.slice(1).forEach(r => r.parentNode && r.parentNode.removeChild(r));
    for (const c of GPDocx.els(first,'color')) c.setAttributeNS(W,'w:val','auto');
    return true;
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

  /* Rezimo eilute BE zymos (ND_LT: "Vykdomas    Pasirinkti" - juoda, be skliaustu,
     zemelapyje jos nera). Ivedam visa eilute is naujo: pirmas runas laiko
     "Vykdomas " + rezimo tekstas, likusieji istustinami. Formatas islaikomas
     (visi runai juodi normalus).                                               */
  function keistiRezimoEilute(paras, i, value){
    const p = paras[i]; if (!p) return false;
    const ts = GPDocx.els(p,'t');
    if (!ts.length) return false;
    ts[0].textContent = 'Vykdomas ' + value; ts[0].setAttribute('xml:space','preserve');
    for (let k=1;k<ts.length;k++) ts[k].textContent = '';
    return true;
  }

  return { snapshot, juodinti, trinti, pildyti, vietos, raudoniRunai, trintiRaudonusRunus,
           keistiRaudonaTeksta, keistiRezimoEilute, taisytiTitulTarpa, valytiPastraipuZenklus, taisytiSkliaustus };
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
      if (red) raudonos.push({ i, text: txt.slice(0,110) });
      // Betekste bruksniu linija - dokumento pabaigos skirtukas, ne pildomas laukas.
      const vienBruksniai = txt.replace(/[_\s]/g,'') === '';
      if (!vienBruksniai && /_+|\[[^\]]{4,}\]/.test(txt)) tuscios.push({ i, text: txt.slice(0,110) });
    });
    // Svelnus ispejimas. Gaudom tris dalykus, kuriu "raudona / bruksneliai"
    // kriterijus nepagauna:
    //   1) "X" vietoj numerio ("SPS X priedas", "dydis - X Eur");
    //   2) vietos rezervai DIDZIOSIOMIS ("PIRKIMO PAVADINIMAS", "PROCUREMENT TITLE");
    //   3) likes /ĮMONĖS PAVADINIMAS/ (jei keitimas nepavyko).
    const patikrinti = [];
    const REZERVAS = /[„"']([A-ZĄČĘĖĮŠŲŪŽ][A-ZĄČĘĖĮŠŲŪŽ \-]{5,})[""']|\/ĮMONĖS PAVADINIMAS\//;
    paras.forEach((p, i) => {
      const t = GPDocx.paraText(p).trim();
      if (!t) return;
      if (/(^|[\s(])X([\s.,)]|$)/.test(t) || REZERVAS.test(t))
        patikrinti.push({ i, text: t.slice(0,110) });
      // Dalis sablonu (pvz. konfidencialumo priedas) LITGRID rekvizitus rašo
      // TIESIOGIAI, ne per zyma: pavadinima, el. pasta. Perkant kitai imonei
      // jie liktu dokumente kaip svetimi duomenys.
      if (imone && !/litgrid/i.test(imone) && /litgrid/i.test(t))
        patikrinti.push({ i, text: t.slice(0,110), svetimas: true });
    });
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
