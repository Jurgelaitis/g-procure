#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PP-salygos: sutarčių šablonų paruošimas generatoriui (sutarčių planas S1, 2026-10-08; docs/salygos/sutartys-planas-2026-10.md).

KĄ DARO. Iš LITGRID sutarčių šablonų aplanko paima prekių ir paslaugų pirkimo-pardavimo sutarčių bendrąsias (BS) ir specialiąsias (SS)
sąlygas lietuviškai (LT) ir dvikalbes (LT/EN) ir:
  1. patikrina, kad šaltinis - tas pats failas, kuriam patvirtinti 2026-10-07 taisymai (sha256 registre). Kitas failas - stabdoma:
     nauja LITGRID redakcija ar sena kopija negali tyliai atšaukti taisymų (paleiskite su --nauja-redakcija, kai jie peržiūrėti);
  2. pašalina komentarus (juose - vidinės grupės taisyklės; į viešą saugyklą jie nekeliami, su --komentarai išrašomi į nurodytą failą);
  3. puslapis - A4 (naudotojo sprendimas 2026-10-08; 7 iš 8 failų buvo US Letter), per plačios lentelės proporcingai sumažinamos iki
     teksto pločio (tekstas ir kitas formatavimas nekeičiami);
  4. įrašo templates/sutartys/<KODAS>.docx, žemėlapį zemelapiai/sutartys/<KODAS>.json ir registrą zemelapiai/sutarciu-versijos.json.
Žemėlapyje - kiekvienas valdiklis (išskleidžiamas sąrašas su elementais ir atsakymo šaltiniu pagal plano 3.4 lentelę), pildoma vieta,
nurodymas rengėjui, alternatyvų grupė („Netaikoma / arba“), trynimo nurodymas, tuščias laukas, organizacijos rekvizitas, paryškinimas,
LT/EN - eilučių ir valdiklių poros ir DI juodraščiai. Spalvota ar pažymėta vieta, kurios neatpažįsta nė viena taisyklė, - klaida
(„žemėlapis be neatpažintų vietų“). LT/EN lietuviškas stulpelis turi sutapti su LT rinkiniu (visos netuščios pastraipos) - kitaip klaida.
Pakartotinai paleidus - 0 pakeitimų (failai baitas į baitą tie patys).

Naudojimas:
    python3 PP-salygos/sutarciu-sablonai.py --saltinis <LITGRID sutarčių aplankas> [--komentarai <failas.json>] [--nauja-redakcija "aprašas"]
    python3 PP-salygos/sutarciu-sablonai.py --tikrink     # saugyklos šablonai prieš registrą ir žemėlapius (be šaltinio)
    python3 PP-salygos/sutarciu-sablonai.py --versijos <aplankas> [<aplankas> ...]
        # ankstesnių redakcijų pastraipų maišos tikrinimui (registro „kitos_versijos“; 2026-10-09): LITGRID šaltinių aplankas ir originalų
        # kopijos (to paties vardo failai bet kuriame poaplankyje) bei šių šablonų git istorija. Tikrinant ranka parengtą sutartį, pastraipa,
        # sutampanti su LITGRID „0922“ tekstu ar ankstesne mūsų redakcija, - ne rengėjo nukrypimas (kaip formu-versijos.py pirkimo sąlygoms).
        # Paleiskite po kiekvieno šablonų pakeitimo commit'o; registre - tik maišos, ne tekstas.
"""
import argparse, hashlib, html, io, json, re, subprocess, sys, unicodedata, zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TPL = REPO / 'PP-salygos' / 'templates' / 'sutartys'
MAP = REPO / 'PP-salygos' / 'zemelapiai' / 'sutartys'
REG = REPO / 'PP-salygos' / 'zemelapiai' / 'sutarciu-versijos.json'
sys.path.insert(0, str(REPO / 'PP-salygos'))
from importlib import import_module
FV = import_module('formu-versijos')  # tie patys tekstai, norm ir maisa kaip pirkimo sąlygų formoms (GP_PALYGINIMAS)

PREKES, PASLAUGOS = 'Prekių pirkimo - pardavimo sutartis/', 'Paslaugų pirkimo - pardavimo sutartis/'
PSR = 'Projektavimo ir statybos rangos sutartis/'
SABLONAI = [
    ('PREKES_LT_BS', 'PREKES', 'LT', 'BS', PREKES + '0922-PREKIŲ bendrosios sąlygos.docx', 'Prekių pirkimo-pardavimo sutarties bendrosios sąlygos'),
    ('PREKES_LT_SS', 'PREKES', 'LT', 'SS', PREKES + '0922- PREKIŲ pirkimo-pardavimo sutarties specialiosios sąlygos.docx', 'Prekių pirkimo-pardavimo sutarties specialiosios sąlygos'),
    ('PREKES_LTEN_BS', 'PREKES', 'LTEN', 'BS', PREKES + '0922-Bendrosios PREKIŲ sutarties sąlygos LT EN (arial).docx', 'Prekių pirkimo-pardavimo sutarties bendrosios sąlygos LT/EN'),
    ('PREKES_LTEN_SS', 'PREKES', 'LTEN', 'SS', PREKES + '0922- PREKIŲ specialiosios sutarties sąlygos LT EN (arial).docx', 'Prekių pirkimo-pardavimo sutarties specialiosios sąlygos LT/EN'),
    ('PASLAUGOS_LT_BS', 'PASLAUGOS', 'LT', 'BS', PASLAUGOS + '0922-Paslaugų pirkimo–pardavimo sutarties bendrosios sąlygos 05.docx', 'Paslaugų pirkimo-pardavimo sutarties bendrosios sąlygos'),
    ('PASLAUGOS_LT_SS', 'PASLAUGOS', 'LT', 'SS', PASLAUGOS + '0922-PASLAUGŲ sutarties spec. sąlygos.docx', 'Paslaugų pirkimo-pardavimo sutarties specialiosios sąlygos'),
    ('PASLAUGOS_LTEN_BS', 'PASLAUGOS', 'LTEN', 'BS', PASLAUGOS + '0922-Paslaugų sutarties Bendrosios sąlygos LT EN 0508.docx', 'Paslaugų pirkimo-pardavimo sutarties bendrosios sąlygos LT/EN'),
    ('PASLAUGOS_LTEN_SS', 'PASLAUGOS', 'LTEN', 'SS', PASLAUGOS + '0922-Paslaugų sutarties Specialiosios sąlygos LT EN.docx', 'Paslaugų pirkimo-pardavimo sutarties specialiosios sąlygos LT/EN'),
    # 2026-10-09 (3 etapas): LITGRID 2026-10-05 rangos šablonai (naudotojas: galutiniai); LT/EN nėra
    ('PSR_LT_BS', 'PROJEKTAVIMO_STATYBOS', 'LT', 'BS', PSR + 'Projektavimo ir statybos rangos sutarties BS.docx', 'Projektavimo ir statybos rangos sutarties bendrosios sąlygos'),
    ('PSR_LT_SS', 'PROJEKTAVIMO_STATYBOS', 'LT', 'SS', PSR + 'Projektavimo ir statybos rangos sutarties SS.docx', 'Projektavimo ir statybos rangos sutarties specialiosios sąlygos'),
]
REDAKCIJOS = {
    'BS': 'VPT tipinės sutarties bendrosios sąlygos (prekių - Nr. 1S-19, paslaugų - Nr. 1S-209) su 2025-04-17 pakeitimais Nr. 1S-51 / 1S-52 '
          '(nuo 2025-05-01); LITGRID šablonas „0922“; G-Procure redakciniai taisymai 2026-10-07 (sutarčių plano 5.5)',
    'SS': 'LITGRID specialiosios sąlygos pagal VPT tipinę formą; naudotojo patvirtinti taisymai ir standartinės reikšmės 2026-10-07 '
          '(sutarčių plano 5.5 ir 5.6), valdikliai nepasirinkti',
    'LTEN': 'LT/EN = LT rinkinys + vertimas (2026-10-07): BS anglų stulpelis - VPT neoficialus vertimas (vpt.lrv.lt, 2026-08-07) su '
            'suvienodintais terminais; SS anglų stulpelis 2026-10-08 suredaguotas naudojant DI pagal VPT vertimų ir ES pirkimų terminiją '
            '(naudotojo sprendimas: vertėjas netikrins), be geltono žymėjimo - DI požymis sugeneruoto Word failo savybėse',
}
# Šeimos sava redakcija (vietoj REDAKCIJOS pagal tipą)
REDAKCIJOS_SEIMOS = {'PROJEKTAVIMO_STATYBOS': {
    'BS': 'LITGRID projektavimo ir statybos rangos sutarties bendrosios sąlygos, patvirtintos 2026-10-05 įsakymu Nr. 26IS-147 (naudotojas: '
          'galutinė redakcija); G-Procure redakciniai taisymai 2026-10-09 (rašyba, skyryba, dvigubi tarpai, 9.1.10.7 a)-e) stilius) ir naudotojo '
          'patvirtinti 2026-10-10 (5.2.3.1 raidės, 11.3.4 šalis, 7.3.3 el. paštas, 2.3.12 sąvoka, 1.1.2.18 straipsnių dalys, STR 1.04.02:2011 pavadinimas)',
    'SS': 'LITGRID projektavimo ir statybos rangos sutarties specialiosios sąlygos (2026-10-05, naudotojas: galutinė redakcija); G-Procure '
          'redakciniai taisymai 2026-10-09 ir naudotojo patvirtinti 2026-10-10 (vientisa punktų numeracija 1-29, 1.5 nuoroda, 10 p. delspinigių '
          'pakopos, 15 p. grafiko forma, el. paštas); pasirinkimai - „//“ nurodymai ir „arba“ (žemėlapio blokai), neužpildyta'}}
A4 = (11906, 16838)

WP = re.compile(r"<w:p\b[^>]*?(?:/>|>.*?</w:p>)", re.S)
SDT = re.compile(r"<w:sdt>(?:(?!<w:sdt>).)*?</w:sdt>", re.S)
RUN = re.compile(r"<w:r(?: [^>]*)?>(?:(?!<w:r[ >]).)*?</w:r>", re.S)
CELL = re.compile(r"(<w:sdt>\s*<w:sdtPr>(?:(?!</w:sdtPr>).)*</w:sdtPr>\s*(?:<w:sdtEndPr/>|<w:sdtEndPr>.*?</w:sdtEndPr>)?\s*<w:sdtContent>\s*)?"
                  r"(<w:tc>.*?</w:tc>)(\s*</w:sdtContent>\s*</w:sdt>)?", re.S)
NR = re.compile(r"^[\s ]*(\d+(?:\.\d+)*)\.(?![\d,])")


TOK = re.compile(r"<w:tbl>|</w:tbl>|<w:tr[ >]|</w:tr>|<w:tc>|</w:tc>")
SDT_PRIES = re.compile(r"<w:sdt>\s*<w:sdtPr>(?:(?!</w:sdtPr>).)*</w:sdtPr>\s*(?:<w:sdtEndPr/>|<w:sdtEndPr>(?:(?!</w:sdtEndPr>).)*</w:sdtEndPr>)?\s*<w:sdtContent>\s*$", re.S)
SDT_PO = re.compile(r"\s*</w:sdtContent>\s*</w:sdt>")


PTOK = re.compile(r"<w:p(?=[\s>/])[^>]*?/>|<w:p(?=[\s>])[^>]*>|</w:p>")


def pastraipu_sarasas(x):
    """[(pradžia, pastraipos XML)] - visos <w:p> dokumento tvarka kaip DOM (getElementsByTagName, ElementTree iter): ir pastraipos teksto
    lauke kitos pastraipos viduje (2026-10-09, projektavimo ir statybos rangos BS - rėmelis „LT“; WP reguliarioji išraiška jas suliedavo -
    žemėlapyje 931 pastraipa, naršyklėje 932). Be įdėtų pastraipų - tas pats kaip WP.finditer."""
    st, out = [], []
    for m in PTOK.finditer(x):
        k = m.group(0)
        if k.endswith('/>'):
            out.append((m.start(), m.end()))
        elif k == '</w:p>':
            out.append((st.pop(), m.end()))
        else:
            st.append(m.start())
    if st:
        raise SystemExit('neuždaryta pastraipa')
    return [(a, x[a:z]) for a, z in sorted(out)]


def lenteles(x):
    """[(pradžia, pabaiga, gylis)] - visos lentelės dokumento tvarka, ir įdėtinės (balansuotai; 2026-10-09 - projektavimo ir statybos
    rangos SS 16 p. derinimo terminų lentelė yra langelyje)."""
    st, out = [], []
    for m in re.finditer(r"<w:tbl>|</w:tbl>", x):
        if m.group(0) == '<w:tbl>':
            st.append(m.start())
        else:
            a = st.pop()
            out.append((a, m.end(), len(st)))
    if st:
        raise SystemExit('neuždaryta lentelė')
    return sorted(out)


def langeliu_sarasas(x):
    """[(pradžia, pabaiga, lentelė, eilutė, stulpelis)] - visi langeliai (ir įdėtinių lentelių); lentelės numeruojamos pagal pradžią,
    pradžia ir pabaiga apima langelį gaubiantį valdiklį (langelio valdiklis)."""
    lt, ln, out, nr = [], [], [], 0
    for m in TOK.finditer(x):
        k = m.group(0)
        if k == '<w:tbl>':
            lt.append([nr, -1, -1]); nr += 1
        elif k == '</w:tbl>':
            lt.pop()
        elif k.startswith('<w:tr'):
            lt[-1][1] += 1; lt[-1][2] = -1
        elif k == '<w:tc>':
            lt[-1][2] += 1
            ln.append((m.start(), lt[-1][0], lt[-1][1], lt[-1][2]))
        elif k == '</w:tc>':
            a, ti, ri, ci = ln.pop()
            z = m.end()
            pm = SDT_PRIES.search(x, max(0, a - 20000), a)
            if pm:
                a = pm.start()
                po = SDT_PO.match(x, z)
                if po:
                    z = po.end()
            out.append((a, z, ti, ri, ci))
    return sorted(out)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def tekstas(x):
    return ''.join(html.unescape(m) for m in re.findall(r"<w:t(?: [^>]*)?>([^<]*)</w:t>", x))


# ------------------------------------------------------------------ paruošimas
def be_komentaru(dalys):
    """Pašalina komentarus: žymes dokumente, komentarų dalis, jų ryšius ir turinio tipus. -> komentarų sąrašas."""
    x = dalys['word/document.xml']
    kom = []
    if 'word/comments.xml' in dalys:
        c = dalys['word/comments.xml'].decode('utf-8')
        for m in re.finditer(r'<w:comment [^>]*w:id="(\d+)"[^>]*>(.*?)</w:comment>', c, re.S):
            i = x.find('<w:commentRangeStart w:id="%s"/>' % m.group(1))
            kom.append({'id': m.group(1), 'tekstas': re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', m.group(2)))).strip(),
                        'prie': tekstas(x[i:i + 4000])[:120] if i >= 0 else ''})
    x = re.sub(r'<w:commentRange(?:Start|End) w:id="\d+"/>', '', x)
    x = re.sub(r'<w:r(?: [^>]*)?>(?:(?!</w:r>).)*?<w:commentReference w:id="\d+"/>(?:(?!</w:r>).)*?</w:r>', '', x, flags=re.S)
    if 'commentReference' in x or 'commentRange' in x:
        raise SystemExit('komentarų žymės liko dokumente')
    dalys['word/document.xml'] = x
    salinti = [n for n in dalys if re.match(r'word/(_rels/)?comments\w*\.xml(\.rels)?$', n)]
    for n in salinti:
        del dalys[n]
    rels = dalys['word/_rels/document.xml.rels'].decode('utf-8')
    rels = re.sub(r'<Relationship [^>]*Target="comments\w*\.xml"[^>]*/>', '', rels)
    dalys['word/_rels/document.xml.rels'] = rels.encode('utf-8')
    ct = dalys['[Content_Types].xml'].decode('utf-8')
    ct = re.sub(r'<Override PartName="/word/comments\w*\.xml"[^>]*/>', '', ct)
    dalys['[Content_Types].xml'] = ct.encode('utf-8')
    return kom


# Vidinės grupės taisyklės „//“ nurodymuose (2026-10-09, projektavimo ir statybos rangos SS 19 p.: EPSO-G iždo politikos užtikrinimo riba) -
# kaip ir komentarai, į viešą saugyklą nekeliamos: skaičius pakeičiamas žodžiais, originalas - į --komentarai failą. Sutartyje nurodymų nelieka.
# Skaičius kode nerašomas (saugykla vieša): sumos tūkstančiais „//“ nurodyme apie užtikrinimo priemones
VIDINES = [(re.compile(r'\d+ tūkstančių eurų'), 'vidaus taisyklėse nustatytos ribos')]
VIDINIU_POZYMIS = 'užtikrinimo priemonės'
WT_RE = re.compile(r"(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)")


def be_vidiniu(x):
    """„//“ pastraipose VIDINES atkarpos pakeičiamos (formatavimas - pirmo paliesto runo). -> (xml, [{tekstas, prie}])."""
    out, nuo, kom = [], 0, []
    for a, px in pastraipu_sarasas(x):
        t = tekstas(px)
        if not DVIGUBAS.match(t) or VIDINIU_POZYMIS not in t or not any(v.search(t) for v, _ in VIDINES):
            continue
        nx = px
        for rv, n in VIDINES:
            while rv.search(tekstas(nx)):
                mv = rv.search(tekstas(nx)); k, v = mv.start(), mv.group(0)
                poz, idet = [0], [False]
                def f(m, k=k, v=v, n=n):
                    tt = html.unescape(m.group(2)); s0 = poz[0]; e0 = s0 + len(tt); poz[0] = e0
                    if e0 <= k or s0 >= k + len(v):
                        return m.group(0)
                    nn = tt[:max(k, s0) - s0] + ('' if idet[0] else n) + tt[min(k + len(v), e0) - s0:]
                    idet[0] = True
                    tag = m.group(1) if 'xml:space' in m.group(1) else m.group(1)[:-1] + ' xml:space="preserve">'
                    return tag + html.escape(nn, quote=False) + m.group(3)
                nx = WT_RE.sub(f, nx)
        kom.append({'id': 'vidine-%d' % len(kom), 'tekstas': re.sub(r'\s+', ' ', t).strip(), 'prie': 'šablono „//“ nurodymas (pakeista: %s)' % re.sub(r'\s+', ' ', tekstas(nx)).strip()[:160]})
        out += [x[nuo:a], nx]; nuo = a + len(px)
    return ''.join(out) + x[nuo:], kom


def i_a4(x):
    """Puslapis A4 (gulsčias skyrius - A4 gulsčias); per plačios lentelės - iki savo skyriaus teksto pločio (stulpeliai proporcingai,
    langeliai pagal tinklelį). -> (xml, pakeitimai). Keli skyriai (2026-10-09, projektavimo ir statybos rangos BS ir SS) - kiekvienas
    atskirai; lentelė priklauso skyriui, kurio sectPr - pirmas po jos."""
    pk = []
    sect = list(re.finditer(r'<w:sectPr\b.*?</w:sectPr>', x, re.S))
    if not sect:
        raise SystemExit('skyriaus savybių nerasta')
    ribos = []   # (sectPr pabaiga, teksto plotis)
    for sm in sect:
        s = sm.group(0)
        pg = re.search(r'<w:pgSz [^>]*/>', s).group(0)
        gulscias = 'w:orient="landscape"' in pg
        naujas = ('<w:pgSz w:w="%d" w:h="%d" w:orient="landscape"/>' % (A4[1], A4[0])) if gulscias else '<w:pgSz w:w="%d" w:h="%d"/>' % A4
        if pg != naujas:
            pk.append('puslapis %s -> A4%s' % ('x'.join(re.findall(r'w:[wh]="(\d+)"', pg)), ' gulsčias' if gulscias else ''))
        mar = re.search(r'<w:pgMar [^>]*/>', s).group(0)
        ribos.append((sm.end(), (A4[1] if gulscias else A4[0]) - int(re.search(r'w:left="(\d+)"', mar).group(1))
                      - int(re.search(r'w:right="(\d+)"', mar).group(1)), pg, naujas))
    for _, _, pg, naujas in ribos:
        if pg != naujas:
            x = x.replace(pg, naujas, 1)
    sect = list(re.finditer(r'<w:sectPr\b.*?</w:sectPr>', x, re.S))
    ribos = [(sm.end(), r[1]) for sm, r in zip(sect, ribos)]

    def lentele(a, t):
        plotis = next(w for pab, w in ribos if a < pab)
        grid = [int(g) for g in re.findall(r'<w:gridCol w:w="(\d+)"/>', re.search(r'<w:tblGrid>.*?</w:tblGrid>', t, re.S).group(0))]
        if sum(grid) <= plotis:
            return t
        if t.count('<w:tbl>') != 1:
            raise SystemExit('per plati lentelė su įdėtine lentele - nenumatyta')
        if re.search(r'<w:grid(Before|After)', t) or re.search(r'<w:tblInd w:w="[1-9]', t):
            raise SystemExit('lentelė su gridBefore / gridAfter ar įtrauka - nenumatyta')
        f = plotis / sum(grid)
        nauji = [int(round(g * f)) for g in grid]
        nauji[-1] += plotis - sum(nauji)
        it = iter(nauji)
        t = re.sub(r'<w:gridCol w:w="\d+"/>', lambda _m: '<w:gridCol w:w="%d"/>' % next(it), t)
        t = re.sub(r'<w:tblW w:w="\d+" w:type="dxa"/>', '<w:tblW w:w="%d" w:type="dxa"/>' % plotis, t, count=1)

        def eilute(rm):
            r = rm.group(0)
            st = [0]
            def langelis(cm):
                c = cm.group(0)
                sp = re.search(r'<w:gridSpan w:val="(\d+)"/>', c)
                n = int(sp.group(1)) if sp else 1
                w = sum(nauji[st[0]:st[0] + n])
                st[0] += n
                return re.sub(r'<w:tcW w:w="\d+" w:type="dxa"/>', '<w:tcW w:w="%d" w:type="dxa"/>' % w, c, count=1)
            r = re.sub(r'<w:tc>.*?</w:tc>', langelis, r, flags=re.S)
            if st[0] != len(nauji):
                raise SystemExit('eilutės langeliai neatitinka tinklelio (%d / %d)' % (st[0], len(nauji)))
            return r
        t = re.sub(r'<w:tr[ >].*?</w:tr>', eilute, t, flags=re.S)
        pk.append('lentelė %d -> %d' % (sum(grid), plotis))
        return t
    dalys, nuo = [], 0
    for a, z, gylis in lenteles(x):
        if gylis == 0:
            dalys += [x[nuo:a], lentele(a, x[a:z])]
            nuo = z
    x = ''.join(dalys) + x[nuo:]
    return x, pk


def paruosk(b):
    zi = zipfile.ZipFile(io.BytesIO(b))
    infos = zi.infolist()
    dalys = {i.filename: zi.read(i.filename) for i in infos}
    dalys['word/document.xml'] = dalys['word/document.xml'].decode('utf-8')
    kom = be_komentaru(dalys)
    x, vid = be_vidiniu(dalys['word/document.xml'])
    x, pk = i_a4(x)
    kom += vid
    dalys['word/document.xml'] = x.encode('utf-8')
    if len(kom) > len(vid):
        pk.insert(0, 'pašalinta komentarų: %d' % (len(kom) - len(vid)))
    if vid:
        pk.insert(1 if len(kom) > len(vid) else 0, 'vidinės taisyklės nurodymuose: %d' % len(vid))
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zo:
        for i in infos:
            if i.filename in dalys:
                zi2 = zipfile.ZipInfo(i.filename, date_time=i.date_time)
                zi2.compress_type = zipfile.ZIP_DEFLATED
                zi2.external_attr = i.external_attr
                zo.writestr(zi2, dalys[i.filename])
    return out.getvalue(), kom, pk


# ------------------------------------------------------------------ Word numeracija
def word_numeriai(zi):
    """Word automatiniai numeriai visoms pastraipoms (WP tvarka) -> [žymė | None] - kaip PP-salygos/variklis.js GPNum wordZymes:
    skaitikliai pagal abstractNum, lvlOverride startOverride - pirmą kartą panaudojus numId, nenaudotas tėvinis lygis rodo savo start;
    ženkleliai ir „none“ - None. Projektavimo ir statybos rangos SS punktai sunumeruoti tik Word (2026-10-09)."""
    nx = zi.read('word/numbering.xml').decode('utf-8') if 'word/numbering.xml' in zi.namelist() else ''
    sx = zi.read('word/styles.xml').decode('utf-8') if 'word/styles.xml' in zi.namelist() else ''
    x = zi.read('word/document.xml').decode('utf-8')
    v = lambda el, n: (re.search(r'<w:%s w:val="([^"]*)"' % n, el) or [None, None])[1]
    abst, nums, st = {}, {}, {}
    for am in re.finditer(r'<w:abstractNum [^>]*w:abstractNumId="(\d+)"[^>]*>(.*?)</w:abstractNum>', nx, re.S):
        L = {}
        for lm in re.finditer(r'<w:lvl [^>]*w:ilvl="(\d+)"[^>]*>(.*?)</w:lvl>', am.group(2), re.S):
            L[int(lm.group(1))] = {'start': int(v(lm.group(2), 'start') or 1), 'fmt': v(lm.group(2), 'numFmt') or 'decimal',
                                   'txt': v(lm.group(2), 'lvlText') or ''}
        abst[am.group(1)] = L
    for nm in re.finditer(r'<w:num [^>]*w:numId="(\d+)"[^>]*>(.*?)</w:num>', nx, re.S):
        ov = {int(o.group(1)): int(o.group(2)) for o in re.finditer(r'<w:lvlOverride w:ilvl="(\d+)"[^>]*>\s*<w:startOverride w:val="(\d+)"', nm.group(2))}
        nums[nm.group(1)] = {'a': v(nm.group(2), 'abstractNumId'), 'ov': ov}
    for sm in re.finditer(r'<w:style [^>]*w:styleId="([^"]+)"[^>]*>(.*?)</w:style>', sx, re.S):
        ppr = re.search(r'<w:pPr>.*?</w:pPr>', sm.group(2), re.S)
        np_ = ppr and re.search(r'<w:numPr>.*?</w:numPr>', ppr.group(0), re.S)
        st[sm.group(1)] = {'based': v(sm.group(2), 'basedOn'), 'numId': np_ and v(np_.group(0), 'numId'), 'ilvl': np_ and v(np_.group(0), 'ilvl')}
    cnt, ov_naudoti, out = {}, set(), []
    for _, p in pastraipu_sarasas(x):
        ppr = re.match(r'<w:p\b[^>]*>\s*(<w:pPr>.*?</w:pPr>)?', p, re.S).group(1) or ''
        ppr = re.sub(r'<w:rPr>.*?</w:rPr>|<w:sectPr\b.*?</w:sectPr>|<w:pPrChange\b.*?</w:pPrChange>', '', ppr, flags=re.S)
        np_ = re.search(r'<w:numPr>.*?</w:numPr>', ppr, re.S)
        num_id, ilvl = (v(np_.group(0), 'numId'), v(np_.group(0), 'ilvl')) if np_ else (None, None)
        # numId ir lygis - kiekvienas iš artimiausio juos nurodančio stiliaus (BS „list by letter“: stiliuje tik ilvl 3, numId - iš
        # „List Paragraph“, kurio ilvl 2)
        sid, k = v(ppr, 'pStyle'), 0
        while sid in st and k < 12 and (num_id is None or ilvl is None):
            if num_id is None and st[sid]['numId'] is not None:
                num_id = st[sid]['numId']
            if ilvl is None and st[sid]['ilvl'] is not None:
                ilvl = st[sid]['ilvl']
            sid, k = st[sid]['based'], k + 1
        ilvl = int(ilvl or 0)
        nn = num_id not in (None, '0') and nums.get(num_id)
        L = nn and abst.get(nn['a'])
        if not L or ilvl not in L:
            out.append(None); continue
        c = cnt.setdefault(nn['a'], {})
        if nn['ov'] and num_id not in ov_naudoti:
            ov_naudoti.add(num_id)
            for k in [k for k in c if k not in nn['ov']]:
                del c[k]
            for k, sv in nn['ov'].items():
                c[k] = sv - 1
        c[ilvl] = c[ilvl] + 1 if ilvl in c else L[ilvl]['start']
        for k in [k for k in c if k > ilvl]:
            del c[k]
        lv = L[ilvl]
        if lv['fmt'] in ('bullet', 'none'):
            out.append(None); continue
        def zyme(m):
            k = int(m.group(1)) - 1
            if k not in c:
                c[k] = (L.get(k) or {'start': 1})['start']
            f = (L.get(k) or {'fmt': 'decimal'})['fmt']
            n = c[k]
            if f == 'lowerLetter': return chr(96 + n) if 1 <= n <= 26 else str(n)
            if f == 'upperLetter': return chr(64 + n) if 1 <= n <= 26 else str(n)
            if f in ('lowerRoman', 'upperRoman'):
                r, sk = '', n
                for a, b in ((1000, 'm'), (900, 'cm'), (500, 'd'), (400, 'cd'), (100, 'c'), (90, 'xc'), (50, 'l'), (40, 'xl'), (10, 'x'), (9, 'ix'), (5, 'v'), (4, 'iv'), (1, 'i')):
                    while sk >= a: r, sk = r + b, sk - a
                return r if f == 'lowerRoman' else r.upper()
            return str(n)
        out.append(re.sub(r'%(\d)', zyme, lv['txt']))
    return out


# ------------------------------------------------------------------ žemėlapis
SPALVA_MELYNA = {'0070C0', '4472C4', '4471C4', '2B579A', '156082', '0F2D46'}
SPALVA_RAUDONA = {'FF0000'}
SPALVA_NUORODA = {'0563C1'}
# Nurodymas rengėjui - tik tai, kas liepia ką nors įrašyti, nurodyti ar pasirinkti. „(jeigu ...)“, „(taikoma, jei ...)“ sakinio viduje -
# sutarties sąlyga (lieka sutartyje), ne nurodymas.
NURODYMAS = re.compile(r"^\(\s*(nurodyti|nurodomos|įrašyti|jei reikalinga, nurodyti|jei tiekėjas yra|pasirinkti|pirkėjas gali|nereikalingą|"
                       r"arba nurodyti|pasirenkamas?|rengiant sutartį pasirenkama|specify|insert|delete|select|please specify|or specify|or such other \w+ as may be specified|the buyer may (select|choose)|"
                       r"name, title|position, name|if applicable, (indicate|specify)|if necessary, specify|if the supplier is a natural person)", re.I)
# Skyriaus antraštės taikymo sąlyga („10. ESMINĖS SUTARTIES SĄLYGOS (taikoma, jeigu užpildyta)“)
TAIKYMO_SALYGA = re.compile(r"^\(\s*(taikoma, jei|applicable where|applicable if)", re.I)
ANTRASTE = re.compile(r"^\d+\.\s+[A-ZĄČĘĖĮŠŲŪŽ][A-ZĄČĘĖĮŠŲŪŽ ,()/–-]{6,}")
TRYNIMAS = {'jei netaikoma, visą žemiau esantį tekstą ištrinti:', 'jei punktas netaikomas, visą žemiau esantį tekstą ištrinti:',
            'if not applicable, delete all the text below:', 'if the clause does not apply, delete all the text below:'}
ARBA = {'arba', 'or'}
SALYGA = {'jei punktas taikomas:', 'if the clause applies:'}
NETAIKOMA = {'netaikoma', 'netaikomas', 'punktas netaikomas.', 'not applicable', 'the clause does not apply.'}
PILDOMA = re.compile(r"\[\.\.\.\]|\[…\]|\[_\]|\{\.*\}|_{3,}")
ORG = {'ĮMONĖS PAVADINIMAS': 'pavadinimas', '302564383': 'kodas', 'Karlo Gustavo Emilio Manerheimo g. 8': 'adresas',
       'Karlo Gustavo Emilio Manerheimo str. 8': 'adresas', 'LT-05131 Vilnius': 'adresas', 'LT100005748413': 'pvm_kodas',
       'LT24 2150 0510 0002 1766': 'saskaita', 'OP Corporate Bank plc Lietuvos filialas (banko kodas 21500)': 'bankas',
       'OP Corporate Bank plc Lithuanian branch (bank code 21500)': 'bankas', '+370 707 02171': 'telefonas', 'info@litgrid.eu': 'el_pastas'}
# Rekvizitai sakinio viduje ir kitokia jų rašyba (projektavimo ir statybos rangos SS ir BS, 2026-10-09) - atkarpa pastraipoje
ORG_DALYS = dict(ORG, **{'LT242150051000021766': 'saskaita', 'OP Corporate Bank plc Lietuvos filialas': 'bankas',
                         'banko kodas 21500': 'bankas'})
# LITGRID rangos šablonų žymėjimas be spalvų ir valdiklių (2026-10-09): nurodymas rengėjui - pastraipa, prasidedanti „//“; pildoma vieta -
# žodis laužtiniuose skliaustuose („[Rangovo pavadinimas]“, „[]“); „[Sąvoka 1.1.2.13 punktas]“, „[2.2.3. punktas]“ - nuoroda į BS punktą
# (sutarties tekstas, lieka); „[a]“ - išvardijimo raidė; lentelės langelyje „Turi būti pasirinkta:“ - kitos langelio eilutės yra variantai
DVIGUBAS = re.compile(r'^\s*//')
LAUZTINIAI = re.compile(r'\[[^\[\]]{0,120}\]')
BS_NUORODA = re.compile(r'^\[(Sąvoka\s+)?\d+(\.\d+)*\.?(\s[^\[\]]{0,40})?\]$')
ISVARDIJIMAS = re.compile(r'^\[[a-z]\]$')
PASIRINKTI = {'turi būti pasirinkta:'}
# Šeimos, kurių punktai sunumeruoti Word (ne tekstu): žemėlapio vieta - Word numeris (word_numeriai)
WORD_SEIMOS = {'PROJEKTAVIMO_STATYBOS'}
# Blokai šablonuose, kur langelyje - keli punktai, o pasirinkimai ir neprivalomi punktai pažymėti „//“ ir „arba“ (projektavimo ir statybos
# rangos SS, audito 5 sk.). Pastraipos nurodomos pradžia (pirma nepanaudota nuo paieškos vietos), „arba“ - visa. Kiekvienas „//“ nurodymas ir
# kiekvienas „arba“ turi priklausyti blokui - kitaip neatpažinta vieta.
#   irasyti     - nurodymas, kurio vietoje įrašomas tekstas (id, nurodymo pradžia)
#   pasirinkimai - vienas iš variantų: (id, [(skyriklis - „//“ ar „arba“, varianto pirma pastraipa, paskutinė | None)])
#   salyginiai  - neprivalomas punktas ar punktai: (id, „//“ nurodymas, [(pirma, paskutinė | None)] - kiekviena dalis atskirai)
#   nurodymu_blokai - nurodymų sąrašas, generuojant šalinamas visas: (id, „//“ antraštė, pirma, paskutinė)
#   sritys      - nuo nurodytos pastraipos žemėlapio vieta prasideda srities vardu (Word numeriai ten - kito sąrašo, ne SS punktai)
BLOKAI = {'PSR_LT_SS': {
    'sritys': [('priedų sąrašas', 'SUTARTIES DOKUMENTAI IR PRIEDAI:'), ('parašai', 'Užsakovo vardu:'), ('1.1 priedas', '[OBJEKTAS]')],
    'irasyti': [('objektas', '//nurodomas statomas'), ('techninė_užduotis', '// nurodomas priedas, kuriame pateikiama Techninė užduotis'),
                ('pagrindiniai_įrenginiai', '// nurodomas Pagrindinių įrenginių sąrašas'), ('fizinė_sauga', '// punkto reikalavimus parengia Fizinės saugos'),
                ('dalinis_apmokėjimas', '// Už Rangovo teikiamus'), ('es_fondai', '// Jei Darbus numatoma finansuoti'),
                ('bim', '// nurodoma ar turi būti taikomas statinio informacinis'), ('investicinis_projektas', '// nurodomas Užsakovo vykdomo investicinio')],
    'pasirinkimai': [
        ('apmokėjimas', [('// Jei atliekami naujos statybos', 'Sutarties kaina bus mokama dalimis pagal Darbų žiniaraštį', None),
                         ('// Jei atliekami remonto darbai', 'Sutarties kaina bus mokama dalimis pagal atliktus', None),
                         ('// Jei atliekami darbai trunka', 'Sutarties kaina bus sumokėta Rangovui', None)]),
        ('netesybos', [('//Jei darbai atliekami vienu etapu', 'Laiku neužbaigęs visų Sutartyje numatytų Darbų, Rangovas Užsakovui moka 0,04%', None),
                       ('arba', 'Laiku neužbaigęs visų Sutartyje numatytų Darbų, Rangovas Užsakovui moka šiuos', '4) Rangovui vėluojant'),
                       ('//Jei darbai atliekami etapais', 'Netesybos už laiku neperduotus', None)]),
        ('užtikrinimas', [('//įrašoma, kai atliekami nedidelės vertės', 'Sutarties bendrųjų sąlygų 9.7. punktas', None),
                          ('//Tuo atveju, jeigu užtikrinimo priemonės taikomos pirkimuose iki', 'Sutarties įvykdymas užtikrinamas', 'Sutarties įvykdymo užtikrinimo suma'),
                          ('//Tuo atveju, jeigu užtikrinimo priemonės taikomos pirkimuose virš', 'Sutarties įvykdymas užtikrinamas', 'Sutarties įvykdymo užtikrinimo suma')])],
    'salyginiai': [
        ('etapai', '//Jei Darbai atliekami etapais', [('Darbus Rangovas turi atlikti priede Nr.', None)]),
        ('grafikas', '// punktas įrašomas, jei Grafiką', [('Sutarties bendrųjų sąlygų 2.3.1. punkto', 'Grafiką Rangovas turi parengti pagal tipinę')]),
        ('ekspertizė', '// punktas įrašomas, jei Techninio darbo projekto', [('Sutarties bendrųjų sąlygų 3.3.10. punkto', 'Ekspertizės aktą Užsakovo')]),
        ('atjungimai', '// punktas papildomas, jei yra galimybė', [('Sutarties bendrųjų sąlygų 4.5.1. punktą', '[...];')]),
        ('garantinis_užtikrinimas', '//įrašoma, kai atliekami nedidelės vertės', [('Sutarties bendrųjų sąlygų 9.9. punktas', None)]),
        ('esminės_sąlygos', '// įrašomos Sutarties sąlygos, dėl kurių', [('Esminėmis yra laikomos šios Sutarties sąlygos:', None)]),
        ('kitos_nuostatos', '// pagal poreikį įrašomos kitos nuostatos', [('Vadovaujantis Sutarties bendrųjų sąlygų 4.1.12', None),
                                                                         ('Esant Sutarties bendrųjų sąlygų 5.2.5', None),
                                                                         ('Rangovas ir Užsakovas susitaria, kad Koordinatorius', None)])],
    'nurodymu_blokai': [('pildymo_sąlygos', '//Pildymo sąlygos:', 'Lentelė pildoma tik tuo atveju', 'Mokėtinos sumos stulpelis')]}}
# Tušti laukai: ką pildo generatorius, ko - niekas iki sutarties sudarymo
LAUKAI_GENERATORIUS = re.compile(r"^(Sutarties pavadinimas|Title of the Contract|3\.2\.|\d+\.\d+\. (Priedas Nr\.|Annex))")
# Valdiklių atsakymai - sutarčių plano 3.4 lentelė (naudotojo sprendimai 2026-10-07): (vietos pradžia | None, elementų požymis) -> šaltinis
ATSAKYMAI = [
    (None, r'projekto Nr\.', 'klausimas', 'ES lėšomis finansuojamas projektas (3.3)'),
    (None, r'įsipareigoja (pristatyti|suteikti) nuo', 'seka:5.1', 'variantas pagal kainodarą: fiksuota kaina - nuo įsigaliojimo, įkainiai užsakymais - nuo užsakymo'),
    ('4.1', r'^punktas netaikomas\.\|mėnesių', 'klausimas', 'bendras paslaugų teikimo terminas (vienetas)'),
    ('4.1', r'mėnes', 'klausimas', 'pristatymo / suteikimo terminas (skaičius ir vienetas)'),
    (None, r'kainodara\.$|kainodara\.\|', 'klausimas', 'kainodara (5.1)'),
    (None, r'Pradinės Sutarties vertė (yra )?lygi', 'seka:5.1', 'pradinės sutarties vertės apibrėžimas pagal kainodarą'),
    (None, r'dėl kainų lygio pokyčio', 'standartas', 'kainų peržiūra: taikoma, kai sutarties trukmė > 6 mėn. (pirkimo kortelė), kitaip - netaikoma'),
    ('5.4', r'Punktas taikomas\.', 'seka:5.1', 'kiekio (apimties) keitimas pagal kainodarą'),
    (None, r'vieną kartą per kalendorinį mėnesį', 'seka:5.1', 'apmokėjimo sąlygos pagal kainodarą'),
    (None, r'Maksimali avanso suma', 'standartas', 'avansas: „Punktas netaikomas.“'),
    (None, r'Avanso užtikrinimo dydis', 'seka:5.6', 'seka 5.6 avanso atsakymą'),
    (None, r'privalo pašalinti trūkumus', 'standartas', 'garantinė priežiūra: trūkumai per TS terminą, ne ilgiau 10 dienų'),
    (None, r'subtiekėjai ir \(ar\) specialistai', 'klausimas', 'subtiekėjai - iš laimėjusio pasiūlymo, rengiant pasirašyti'),
    (None, r'netesybos; pirmo pareikalavimo', 'sps:uztikrinimas', 'užtikrinimo dydis SPS: yra - garantija ir 8.3 taikomas, nėra - tik netesybos'),
    ('8.3', r'Punktas taikomas:', 'sps:uztikrinimas', 'užtikrinimo pateikimas - kaip 8.1'),
    (None, r'1000 \(vienas tūkstantis\)', 'sps:kriterijus', 'kokybiniai kriterijai: kaina ar sąnaudos - netaikoma; kokybės santykis - pagal laimėjusį pasiūlymą'),
    (None, r'\{\.\.\.\} Eur', 'standartas', 'bauda dėl Pirkėjo simbolių ir intelektinės nuosavybės: „Netaikoma.“'),
    (None, r'100 \(vienas šimtas\)', 'seka:14.4', 'seka 14.4 sutikimo atsakymą'),
    (None, r'laikoma sudaryta', 'seka:8.3+3.3', 'užtikrinimas - 2 variantas, ES lėšos - 3, kitaip - 1 (valdybos pritarimas - tik klausus)'),
    (None, r'6 \(šeši\) mėnesiai', 'kortele:trukme', 'sutarties trukmė iš pirkimo kortelės: 6 / 12 / 24 / 36 mėn., kitaip „iki [...]“'),
    ('14.3', r'Punktas taikomas:', 'sps:nacsaugumas', 'nacionalinis saugumas - SPS 1 žingsnio atsakymas'),
    ('14.4', r'Punktas taikomas:', 'klausimas', 'darbas veikiančiuose elektros perdavimo tinklo objektuose (kartu su sutarties parinkimo klausimais)'),
    (None, r'^tekstas$', 'klausimas', 'pirkimo dokumentų adresas CVP IS'),
]
# Šeimos savi valdiklių atsakymai (tikrinami prieš ATSAKYMAI)
ATSAKYMAI_SEIMOS = {'PROJEKTAVIMO_STATYBOS': [
    (None, r'^tekstas$', 'sudarant', 'Rangovo registracijos valstybė („[Lietuvos] Respublikos“) - iš pasiūlymo, sudarant sutartį')]}


def atkarpos(p):
    """Pastraipos runai be valdiklių -> [(spalva, paryškinimas, tekstas)] (tik su tekstu)."""
    out = []
    for rm in RUN.finditer(SDT.sub('', p)):
        r = rm.group(0)
        t = tekstas(r)
        if not t:
            continue
        c = re.search(r'<w:color w:val="([0-9A-Fa-f]{6})"', r)
        h = re.search(r'<w:highlight w:val="(\w+)"', r)
        out.append(((c.group(1).upper() if c and c.group(1).upper() != '000000' else ''), h.group(1) if h else '', t))
    return out


def skliaustai(t):
    """Skliaustų atkarpos [(pradžia, pabaiga)] aukščiausiame lygyje; neuždaryta - iki galo (tęsiasi kitoje pastraipoje)."""
    out, gylis, st = [], 0, None
    for i, ch in enumerate(t):
        if ch == '(':
            if gylis == 0:
                st = i
            gylis += 1
        elif ch == ')' and gylis:
            gylis -= 1
            if gylis == 0:
                out.append((st, i + 1))
    if gylis:
        out.append((st, len(t)))
    return out, gylis > 0


def valdiklis(s):
    pr = re.search(r'<w:sdtPr>.*?</w:sdtPr>', s, re.S).group(0)
    k = re.search(r'<w:(dropDownList|comboBox|text|richText|date|checkbox|docPartObj)\b', pr)  # be tipo elemento - teksto valdiklis
    el = [{'tekstas': html.unescape(d), 'reiksme': html.unescape(v)}
          for d, v in re.findall(r'<w:listItem w:displayText="([^"]*)" w:value="([^"]*)"\s*/>', pr)]
    turinys = re.search(r'<w:sdtContent>(.*)</w:sdtContent>', s, re.S).group(1)
    lygis = 'langelis' if '<w:tc>' in turinys else ('blokas' if re.search(r'<w:p[ >/]', turinys) else 'eilute')
    return {'rusis': k.group(1) if k else 'tekstas', 'lygis': lygis, 'nepasirinktas': '<w:showingPlcHdr/>' in pr, 'elementai': el,
            'zyma': (re.search(r'<w:tag w:val="([^"]*)"', pr) or [None, None])[1]}


def zemelapis(kodas, b, seima, kalba, tipas, lt_laukai=None):
    x = zipfile.ZipFile(io.BytesIO(b)).read('word/document.xml').decode('utf-8')
    # langeliai: (pradžia, pabaiga, lentelė, eilutė, stulpelis)
    langeliai = langeliu_sarasas(x)
    def kur(pos):
        r = None
        for a, z, ti, ri, ci in langeliai:   # įdėtinės lentelės langelis - vėliau prasidedantis, todėl paskutinis tinkamas
            if a <= pos < z:
                r = (ti, ri, ci)
            elif a > pos:
                break
        return r
    pars = pastraipu_sarasas(x)
    sdts = [(m.start(), m.end(), m.group(0)) for m in SDT.finditer(x)]
    lten = kalba == 'LTEN'
    Z = {'sablonas': 'templates/sutartys/%s.docx' % kodas, 'seima': seima, 'kalba': kalba, 'tipas': tipas,
         'valdikliai': [], 'pildomos': [], 'nurodymai': [], 'alternatyvos': [], 'trynimo_nurodymai': [], 'salygos': [],
         'laukai': [], 'organizacija': [], 'taikymo_salygos': [], 'linijos': [], 'paryskinimai': [], 'pritaikomos_nuostatos': [], 'keiciamos_reiksmes': [],
         'bs_nuorodos': [], 'salyginiai': [], 'nurodymu_blokai': [], 'di_juodrasciai': [], 'neatpazinta': [], 'pastraipos': []}
    wn = word_numeriai(zipfile.ZipFile(io.BytesIO(b))) if seima in WORD_SEIMOS else None
    sritys, sritis_v = list(BLOKAI.get(kodas, {}).get('sritys', [])), ''
    dvigubi, pasirinkti = [], []
    vieta, pastr_info = '', []
    atviras = False  # skliaustas, atidarytas ankstesnėje to paties langelio pastraipoje
    ankst_l = None
    vald_par = {i for i, (pos, p) in enumerate(pars) if any(a <= pos < z for a, z, _ in sdts)}
    for i, (pos, p) in enumerate(pars):
        t = tekstas(SDT.sub('', p))
        l = kur(pos)
        if i in vald_par:
            # pastraipa valdiklio viduje (blokinis ar langelio valdiklis) - jos tekstas yra valdiklio vietos rezervas
            pastr_info.append({'i': i, 'vieta': vieta, 'stulpelis': ('EN' if (lten and l is not None and l[2] == 1) else 'LT') if lten else None,
                               'langelis': l, 'valdiklyje': True})
            Z['pastraipos'].append(re.sub(r'\s+', ' ', t).strip())
            continue
        en = lten and l is not None and l[2] == 1
        if sritys and re.sub(r'\s+', ' ', t).strip().startswith(sritys[0][1]):
            sritis_v = sritys.pop(0)[0]; vieta = sritis_v
        if not en:
            m = NR.match(t)
            if m:
                vieta = m.group(1)
            elif wn and wn[i] and re.fullmatch(r'\d+(\.\d+)*\.?', wn[i]):
                vieta = (sritis_v + ' ' if sritis_v else '') + wn[i].rstrip('.')
        if l != ankst_l:
            atviras = False
        ankst_l = l
        ts = re.sub(r'\s+', ' ', t).strip()
        pastr_info.append({'i': i, 'vieta': vieta, 'stulpelis': ('EN' if en else 'LT') if lten else None, 'langelis': l})
        Z['pastraipos'].append(ts)
        tl = ts.lower()
        padengta = []  # (pradžia, pabaiga) atkarpos t, kurias paaiškina taisyklės
        if tl in TRYNIMAS:
            Z['trynimo_nurodymai'].append({'i': i, 'vieta': vieta}); padengta.append((0, len(t)))
        elif tl in ARBA:
            padengta.append((0, len(t)))
        elif tl in SALYGA:
            Z['salygos'].append({'i': i, 'vieta': vieta}); padengta.append((0, len(t)))
        elif tl in NETAIKOMA:
            padengta.append((0, len(t)))
        dvig = bool(DVIGUBAS.match(t))
        if dvig:
            dvigubi.append(i); padengta.append((0, len(t)))
        elif tl in PASIRINKTI:
            pasirinkti.append(i); padengta.append((0, len(t)))
        if ts in ORG:
            Z['organizacija'].append({'i': i, 'vieta': vieta, 'laukas': ORG[ts]}); padengta.append((0, len(t)))
        elif ts and not dvig:
            uz = []   # rekvizitai sakinio viduje: ilgiausias pirmas, persidengiantys nesiskaito
            for k in sorted(ORG_DALYS, key=len, reverse=True):
                for m in re.finditer(re.escape(k), t):
                    if not any(a < m.end() and m.start() < z for a, z, _ in uz):
                        uz.append((m.start(), m.end(), k))
            for a, z, k in sorted(uz):
                Z['organizacija'].append({'i': i, 'vieta': vieta, 'laukas': ORG_DALYS[k], 'tekstas': k}); padengta.append((a, z))
        pild = [] if re.fullmatch(r'_{5,}', ts) or dvig else [m for m in PILDOMA.finditer(t)]
        for m in pild:
            Z['pildomos'].append({'i': i, 'vieta': vieta, 'tekstas': m.group(0)}); padengta.append(m.span())
        for m in ([] if dvig else LAUZTINIAI.finditer(t)):
            if any(q.start() <= m.start() and m.end() <= q.end() for q in pild) or ISVARDIJIMAS.match(m.group(0)):
                continue
            if BS_NUORODA.match(m.group(0)):
                Z['bs_nuorodos'].append({'i': i, 'vieta': vieta, 'tekstas': m.group(0)}); continue
            Z['pildomos'].append({'i': i, 'vieta': vieta, 'tekstas': m.group(0), 'etikete': m.group(0)[1:-1].strip()}); padengta.append(m.span())
        sk, liko = skliaustai(t)
        if atviras:
            uz = t.find(')')
            sk.insert(0, (0, uz + 1 if uz >= 0 else len(t)))
            Z['nurodymai'].append({'i': i, 'vieta': vieta, 'tekstas': t[:uz + 1 if uz >= 0 else len(t)].strip(), 'tesinys': True})
            padengta.append(sk[0])
            atviras = uz < 0
        if re.fullmatch(r'_{5,}', ts):
            Z['linijos'].append({'i': i, 'vieta': vieta}); padengta.append((0, len(t)))
        for a, z in (sk[1:] if Z['nurodymai'] and Z['nurodymai'][-1].get('tesinys') and Z['nurodymai'][-1]['i'] == i else sk):
            if TAIKYMO_SALYGA.match(t[a:z]) and ANTRASTE.match(ts):
                Z['taikymo_salygos'].append({'i': i, 'vieta': vieta, 'tekstas': t[a:z]}); padengta.append((a, z))
                continue
            if NURODYMAS.match(t[a:z]):
                Z['nurodymai'].append({'i': i, 'vieta': vieta, 'tekstas': t[a:z]}); padengta.append((a, z))
                if z == len(t) and liko:
                    atviras = True
        # spalvotos ir pažymėtos atkarpos
        pos_t = 0
        for spalva, pz, seg in atkarpos(p):
            a, z = pos_t, pos_t + len(seg)
            pos_t = z
            if not seg.strip():
                continue
            if pz:
                if pz == 'yellow' and en:
                    Z['di_juodrasciai'].append({'i': i, 'vieta': vieta, 'tekstas': seg.strip()})
                else:
                    Z['paryskinimai'].append({'i': i, 'vieta': vieta, 'spalva': pz, 'tekstas': seg.strip()})
            if not spalva:
                continue
            ok = any(pa <= a + len(seg) - len(seg.lstrip()) and z - (len(seg) - len(seg.rstrip())) <= pz2 for pa, pz2 in padengta)
            if ok:
                continue
            if spalva in SPALVA_MELYNA | SPALVA_NUORODA and re.fullmatch(r'[\d\s.,]+', seg):
                Z['keiciamos_reiksmes'].append({'i': i, 'vieta': vieta, 'tekstas': seg.strip(), 'spalva': spalva}); continue
            if re.fullmatch(r'[\d\s.,]+', seg) and spalva not in SPALVA_RAUDONA:
                Z['keiciamos_reiksmes'].append({'i': i, 'vieta': vieta, 'tekstas': seg.strip(), 'spalva': spalva}); continue
            if spalva in SPALVA_MELYNA | SPALVA_NUORODA:
                # VPT formos legenda: mėlynas tekstas - nuostata, kurią pirkėjas gali tikslinti ar papildyti
                Z['pritaikomos_nuostatos'].append({'i': i, 'vieta': vieta, 'tekstas': seg.strip()[:160], 'spalva': spalva}); continue
            Z['neatpazinta'].append({'i': i, 'vieta': vieta, 'tekstas': seg.strip()[:160], 'spalva': spalva})
        # pastraipos ženklo paryškinimas
        ppr = re.match(r'<w:p\b[^>]*>\s*(<w:pPr>.*?</w:pPr>)?', p, re.S)
        if ppr and ppr.group(1) and '<w:highlight ' in ppr.group(1):
            Z['paryskinimai'].append({'i': i, 'vieta': vieta, 'spalva': re.search(r'<w:highlight w:val="(\w+)"', ppr.group(1)).group(1),
                                      'tekstas': '', 'pastraipos_zenklas': True})
    # alternatyvos: langelis su „arba“ / „or“ skyrikliais
    pagal_langeli = {}
    for inf, ts in zip(pastr_info, Z['pastraipos']):
        if inf['langelis'] is not None:
            pagal_langeli.setdefault(inf['langelis'], []).append((inf['i'], ts))
    for lg, ps in ([] if kodas in BLOKAI else pagal_langeli.items()):
        sk = [i for i, ts in ps if ts.lower() in ARBA]
        if not sk and any(ts.lower() in NETAIKOMA for _, ts in ps):
            # „Netaikoma / Jei punktas taikomas: ...“ (paslaugų 10.1, 10.2) - alternatyva be „arba“, skyriklis - sąlyga
            sk = [i for i, ts in ps if ts.lower() in SALYGA]
        if not sk:
            continue
        variantai, cur = [], []
        for i, ts in ps:
            if i in sk:
                variantai.append(cur); cur = []
            elif ts:
                cur.append(i)
        variantai.append(cur)
        pradzios = [NR.match(Z['pastraipos'][v[0]]).group(1) for v in variantai if v and NR.match(Z['pastraipos'][v[0]])]
        alt = {'vieta': pastr_info[ps[0][0]]['vieta'], 'stulpelis': pastr_info[ps[0][0]]['stulpelis'], 'skyrikliai': sk, 'variantai': variantai}
        if len(pradzios) != len(set(pradzios)):
            alt['pastaba'] = 'keli variantai prasideda tuo pačiu punktu - alternatyva gali būti sudėtinė (išsprendžiama S4)'
        Z['alternatyvos'].append(alt)
        if any(not v for v in variantai):
            Z['neatpazinta'].append({'i': sk[0], 'vieta': pastr_info[sk[0]]['vieta'], 'tekstas': 'tuščias alternatyvos variantas', 'spalva': ''})
    # „Turi būti pasirinkta:“ - langelio eilutės yra variantai (projektavimo ir statybos rangos SS derinimo terminai)
    PS = Z['pastraipos']
    for k in pasirinkti:
        lg = pastr_info[k]['langelis']
        var = []
        for q in range(k + 1, len(PS)):
            if pastr_info[q]['langelis'] != lg:
                break
            if PS[q]:
                var.append([q])
        eil = lg and [inf['i'] for inf in pastr_info if inf['langelis'] and inf['langelis'][0] == lg[0] and inf['langelis'][1] <= lg[1]
                      and inf['langelis'][2] == 0 and PS[inf['i']]]
        Z['alternatyvos'].append({'vieta': pastr_info[k]['vieta'], 'stulpelis': None, 'skyrikliai': [k], 'variantai': var,
                                  'eilute': ' / '.join(x for x in ((PS[eil[-1]] if eil else ''), next((PS[inf['i']] for inf in pastr_info
                                            if inf['langelis'] == (lg[0], lg[1], 1) and PS[inf['i']]), '')) if x)})
        if len(var) < 2:
            Z['neatpazinta'].append({'i': k, 'vieta': pastr_info[k]['vieta'], 'tekstas': '„Turi būti pasirinkta:“ be variantų', 'spalva': ''})
    # „//“ nurodymų ir „arba“ blokai (BLOKAI)
    naudoti = set()
    def rask(pr, nuo):
        for q in range(nuo, len(PS)):
            if q not in naudoti and ((PS[q] == pr) if pr.lower() in ARBA else PS[q].startswith(pr)):
                return q
        raise SystemExit('%s: bloko pastraipa nerasta: %s' % (kodas, pr))
    sritis = lambda a, z: [q for q in range(a, z + 1) if PS[q]]
    B = BLOKAI.get(kodas, {})
    for bid, pr in B.get('irasyti', []):
        q = rask(pr, 0); naudoti.add(q)
        Z['nurodymai'].append({'i': q, 'vieta': pastr_info[q]['vieta'], 'tekstas': PS[q], 'id': bid, 'zyme': '//'})
    for bid, dalys in B.get('pasirinkimai', []):
        sky, var, nuo = [], [], 0
        for j, (s_pr, v_pr, v_iki) in enumerate(dalys):
            sq = rask(s_pr, nuo); naudoti.add(sq)
            a = rask(v_pr, sq + 1); z = rask(v_iki, a) if v_iki else a
            sky.append(sq); var.append(sritis(a, z)); naudoti.update(var[-1]); nuo = z + 1
        Z['alternatyvos'].append({'vieta': pastr_info[var[0][0]]['vieta'], 'stulpelis': None, 'skyrikliai': sky, 'variantai': var, 'id': bid})
    for bid, galva, dalys in B.get('salyginiai', []):
        h = rask(galva, 0); naudoti.add(h)
        ds, nuo = [], h + 1
        for v_pr, v_iki in dalys:
            a = rask(v_pr, nuo); z = rask(v_iki, a) if v_iki else a
            ds.append(sritis(a, z)); naudoti.update(ds[-1]); nuo = z + 1
        Z['salyginiai'].append({'id': bid, 'vieta': pastr_info[ds[0][0]]['vieta'], 'i': h, 'tekstas': PS[h], 'dalys': ds})
    for bid, galva, v_pr, v_iki in B.get('nurodymu_blokai', []):
        h = rask(galva, 0); a = rask(v_pr, h + 1); z = rask(v_iki, a)
        Z['nurodymu_blokai'].append({'id': bid, 'vieta': pastr_info[h]['vieta'], 'i': h, 'apima': sritis(h + 1, z)})
        naudoti.update([h] + sritis(h + 1, z))
    for q in dvigubi:
        if q not in naudoti:
            Z['neatpazinta'].append({'i': q, 'vieta': pastr_info[q]['vieta'], 'tekstas': '„//“ nurodymas be bloko: ' + PS[q][:100], 'spalva': ''})
    if B:
        for q, tq in enumerate(PS):
            if tq.lower() in ARBA and q not in naudoti:
                Z['neatpazinta'].append({'i': q, 'vieta': pastr_info[q]['vieta'], 'tekstas': '„arba“ be bloko', 'spalva': ''})
    # tušti laukai: lentelės eilutėje tuščias langelis po užpildyto (LT) arba langelis „etiketė + tuščios pastraipos“ (LT/EN)
    eilutes = {}
    for inf, ts in zip(pastr_info, Z['pastraipos']):
        if inf['langelis'] is not None:
            ti, ri, ci = inf['langelis']
            eilutes.setdefault((ti, ri), {}).setdefault(ci, []).append((inf['i'], ts))
    sdt_par = set()
    for a, z, s in sdts:
        for i, (pos, p) in enumerate(pars):
            if a <= pos < z or pos <= a < pos + len(p):
                sdt_par.add(i)
    for (ti, ri), cells in eilutes.items():
        cis = sorted(cells)
        for k, ci in enumerate(cis):
            ps = cells[ci]
            tekstu = [ts for _, ts in ps if ts]
            if lten:
                lt_et = next((t for _, t in cells.get(0, []) if t), '')
                if lt_laukai is not None and lt_et not in lt_laukai:
                    continue
                if len(tekstu) == 1 and ps[0][1] and len(ps) > 1 and not any(ts for _, ts in ps[1:]) and not any(i in sdt_par for i, _ in ps):
                    Z['laukai'].append({'i': ps[1][0], 'vieta': pastr_info[ps[0][0]]['vieta'], 'etikete': ps[0][1],
                                        'stulpelis': pastr_info[ps[0][0]]['stulpelis'],
                                        'pildo': 'generatorius' if LAUKAI_GENERATORIUS.match(ps[0][1]) else 'sudarant'})
            elif not tekstu and not any(i in sdt_par for i, _ in ps) and k > 0 and not (wn and ri == 0):
                et = next((cells[c][-1][1] for c in reversed(cis[:k]) if any(ts for _, ts in cells[c])), '')
                et = next((ts for _, ts in reversed(cells[cis[k - 1]]) if ts), et)
                if wn:   # Word šeimos (rangos SS etapų lentelė): eilutės pavadinimas / stulpelio antraštė
                    eil = next((ts for _, ts in cells.get(cis[0], []) if ts), et)
                    galva = next((ts for _, ts in eilutes.get((ti, 0), {}).get(ci, []) if ts), '')
                    et = eil + (' / ' + galva if galva else '')
                if et:
                    Z['laukai'].append({'i': ps[0][0], 'vieta': pastr_info[ps[0][0]]['vieta'], 'etikete': et,
                                        'pildo': 'generatorius' if LAUKAI_GENERATORIUS.match(et) else 'sudarant'})
    # valdikliai
    for nr, (a, z, s) in enumerate(sdts):
        i = next((k for k, (pos, p) in enumerate(pars) if pos <= a < pos + len(p) or a <= pos < z), None)
        v = valdiklis(s)
        inf = pastr_info[i] if i is not None else {'vieta': '', 'stulpelis': None}
        if v['lygis'] == 'langelis':
            # langelio valdiklis: vieta - eilutės antraštė (ankstesnė pastraipa)
            inf = pastr_info[i] if i is not None else inf
        nrs = {NR.match(e['tekstas']).group(1) for e in v['elementai'] if NR.match(e['tekstas'])}
        v.update({'nr': nr, 'i': i, 'vieta': nrs.pop() if len(nrs) == 1 and len(v['elementai']) > 1 and all(NR.match(e['tekstas']) for e in v['elementai'])
                  else inf['vieta'], 'stulpelis': inf['stulpelis']})
        Z['valdikliai'].append(v)
    # LT/EN: valdiklių poros pagal eilutę ir tvarką
    if lten and tipas == 'SS':
        pagal_eil = {}
        for v in Z['valdikliai']:
            l = pastr_info[v['i']]['langelis'] if v['i'] is not None else None
            if v['lygis'] == 'langelis':
                l = None
                l = kur(sdts[v['nr']][0])
            pagal_eil.setdefault((l[0], l[1]), {}).setdefault(l[2], []).append(v)
        for key, st in pagal_eil.items():
            lt_, en_ = st.get(0, []), st.get(1, [])
            if len(lt_) != len(en_):
                Z['neatpazinta'].append({'i': None, 'vieta': lt_[0]['vieta'] if lt_ else '', 'tekstas': 'LT ir EN valdiklių skaičius eilutėje nesutampa', 'spalva': ''})
            for a_, b_ in zip(lt_, en_):
                a_['pora'] = b_['nr']; b_['pora'] = a_['nr']
                a_['stulpelis'] = 'LT'; b_['stulpelis'] = 'EN'
    # atsakymų šaltiniai (SS)
    if tipas == 'SS':
        for v in Z['valdikliai']:
            if v.get('stulpelis') == 'EN':
                v['atsakymas'] = {'saltinis': 'kaip LT', 'pora': v.get('pora')}
                continue
            raktas = '|'.join(e['tekstas'].strip() for e in v['elementai']) if v['rusis'] in ('dropDownList', 'comboBox') else 'tekstas'
            for vt, rx, sal, apr in ATSAKYMAI_SEIMOS.get(seima, []) + ATSAKYMAI:
                if (vt is None or v['vieta'] == vt or v['vieta'].startswith(vt + '.')) and re.search(rx, raktas, re.I):
                    v['atsakymas'] = {'saltinis': sal, 'taisykle': apr}
                    break
            else:
                Z['neatpazinta'].append({'i': v['i'], 'vieta': v['vieta'], 'tekstas': 'valdiklis be atsakymo šaltinio: ' + raktas[:120], 'spalva': ''})
    # LT/EN: kiekvienai vietai - stulpelis (generatorius LT sprendimus taiko ir angliškiems atitikmenims pagal vietą ir eilę)
    if lten:
        for k, v in Z.items():
            if isinstance(v, list) and k not in ('pastraipos', 'valdikliai', 'alternatyvos', 'neatpazinta'):
                for e in v:
                    if isinstance(e, dict) and e.get('i') is not None and 'stulpelis' not in e:
                        e['stulpelis'] = pastr_info[e['i']]['stulpelis']
    Z['suvestine'] = {k: len(v) for k, v in Z.items() if isinstance(v, list) and k != 'pastraipos'}
    return Z


# ------------------------------------------------------------------ LT/EN atitiktis
def netuscios(b, stulpelis=None):
    """Netuščių pastraipų tekstai (be valdiklių turinio - jis lyginamas atskirai). stulpelis 0/1 - tik to LT/EN stulpelio."""
    x = zipfile.ZipFile(io.BytesIO(b)).read('word/document.xml').decode('utf-8')
    if stulpelis is not None:
        dalys = []
        for rm in re.finditer(r'<w:tr[ >].*?</w:tr>', x, re.S):
            c = [m.group(0) for m in CELL.finditer(rm.group(0))]
            dalys.append(c[stulpelis] if len(c) == 2 else '')
        kitur = re.sub(r'<w:tbl>.*?</w:tbl>', '', x, flags=re.S)
        x = kitur + ''.join(dalys)
    return sorted(t for t in (re.sub(r'\s+', ' ', tekstas(m.group(0))).strip() for m in WP.finditer(x)) if t)


def paritetas(lt_b, lten_b):
    lt, lten_lt = netuscios(lt_b), netuscios(lten_b, 0)
    if lt == lten_lt:
        return []
    from collections import Counter
    a, b = Counter(lt), Counter(lten_lt)
    return ['LT/EN lietuviškame stulpelyje trūksta: %s' % [k[:80] for k in (a - b)][:5],
            'LT/EN lietuviškame stulpelyje perteklius: %s' % [k[:80] for k in (b - a)][:5]]


# ------------------------------------------------------------------ registras
def irasas(kodas, b):
    dab = [FV.norm(x) for x in FV.tekstai(b)]
    return {'sha256': sha(b), 'dabartine': FV.maisa('\n'.join(dab)),
            'pozymiai': ' '.join(sorted({h[-8:] for h in (FV.maisa(n) for n in dab if len(n) > 40) if int(h[-1], 16) < 4}))}


PAAISKINIMAS = ('Generuoja PP-salygos/sutarciu-sablonai.py. Kiekvienam sutarties šablonui: šaltinis LITGRID aplanke ir jo sha256 '
                '(kitas šaltinis - paruošimas stabdomas), paruošto šablono sha256, teksto maiša ir požymiai (GP_PALYGINIMAS.norm + maisa, '
                'kaip formu-versijos.json), redakcija, paruošimo pakeitimai; ankstesnes - ankstesnių redakcijų maišos; kitos_versijos - '
                'ankstesnių redakcijų pastraipų, kurių dabartiniame šablone nėra, maišos, kitos_pozymiai - jų atpažinimo požymiai, naujos - '
                'dabartinio šablono pastraipos, kurių pradinėje LITGRID redakcijoje nebuvo (--versijos).')
VERSIJOS = {'LITGRID 0922': 'LITGRID sutarčių šablonų „0922“ tekstas prieš G-Procure redakcinius taisymus (ir tarpinės taisymų būsenos)',
            'G-Procure ankstesnės redakcijos': 'ankstesnės šio modulio sutarčių šablonų redakcijos (git istorija)',
            'LITGRID 2026-10-05': 'LITGRID rangos sutarčių šablonų (2026-10-05) tekstas prieš G-Procure redakcinius taisymus'}
VERSIJU_ZYME = {'PROJEKTAVIMO_STATYBOS': 'LITGRID 2026-10-05'}   # kitaip - 'LITGRID 0922'


def kitos_versijos(kodas, rel, aplankai, seima=None):
    """({ versija: [maišos] }, požymiai) - pastraipos, kurių dabartiniame šablone nėra (žr. --versijos), ir jų atpažinimo požymiai (kaip
    irasas() „pozymiai“: ilgesnės nei 40 ženklų pastraipos, maišų ketvirtis, paskutiniai 8 ženklai) - kad ir ankstesnės redakcijos
    dokumentas (pvz. LT/EN su LITGRID anglų tekstu) būtų atpažintas kaip šita forma, o ne kaip LT (GP_PALYGINIMAS.identifikuok)."""
    # Skaičiuojama su pasikartojimais: ta pati pastraipa (pvz. „1.1.1. Name“ - pirkėjo ir tiekėjo rekvizituose) ankstesnėje redakcijoje gali
    # būti kitą kartų skaičių - perteklinė kopija dokumente ar trūkstama formoje tada irgi ne nukrypimas
    from collections import Counter
    D = Counter(n for n in (FV.norm(x) for x in FV.tekstai((TPL / (kodas + '.docx')).read_bytes())) if n)
    nfc = lambda t: unicodedata.normalize('NFC', t)
    ilgos = set()
    def kitos(b):
        C = Counter(n for n in (FV.norm(x) for x in FV.tekstai(b)) if n)
        ns = {n for n in C if C[n] > D[n]}
        ilgos.update(FV.maisa(n) for n in ns if len(n) > 40 and n not in D)
        return {FV.maisa(n) for n in ns}
    vardas, litgrid, gp, rasti = nfc(Path(rel).name), set(), set(), []
    for ap in aplankai:
        for f in sorted(Path(ap).expanduser().rglob('*.docx')):
            if nfc(f.name) == vardas:
                litgrid |= kitos(f.read_bytes()); rasti.append(f)
    # Pradinė LITGRID redakcija - seniausiai keistas to paties vardo failas (originalų kopijos išsaugo keitimo laiką); naujos - dabartinio
    # šablono pastraipos, kurių joje nėra (G-Procure taisymai): dokumente pagal pradinę redakciją jų nebūna, ir tai ne rengėjo nukrypimas
    naujos = set()
    if rasti:
        O = Counter(n for n in (FV.norm(x) for x in FV.tekstai(min(rasti, key=lambda f: f.stat().st_mtime).read_bytes())) if n)
        naujos = {FV.maisa(n) for n in D if D[n] > O[n]}
    kelias = 'PP-salygos/templates/sutartys/%s.docx' % kodas
    for rev in subprocess.run(['git', '-C', str(REPO), 'log', '--format=%h', '--', kelias], capture_output=True, text=True).stdout.split():
        r = subprocess.run(['git', '-C', str(REPO), 'show', '%s:%s' % (rev, kelias)], capture_output=True)
        if not r.returncode and r.stdout:
            gp |= kitos(r.stdout)
    out = {}
    if litgrid:
        out[VERSIJU_ZYME.get(seima, 'LITGRID 0922')] = sorted(litgrid)
    if gp - litgrid:
        out['G-Procure ankstesnės redakcijos'] = sorted(gp - litgrid)
    return out, ' '.join(sorted({h[-8:] for h in ilgos if int(h[-1], 16) < 4})), sorted(naujos)


def lt_laukai(kodas, kalba, nauji):
    """LT/EN žemėlapiui - LT žemėlapio laukų etiketės (LT failas paruošiamas anksčiau: SABLONAI tvarka LT, tada LT/EN)."""
    if kalba != 'LTEN':
        return None
    lt = nauji.get(kodas.replace('LTEN', 'LT'))
    if not lt:
        raise SystemExit('LT/EN %s: LT šablonas dar neparuoštas' % kodas)
    return {l['etikete'] for l in lt['_zemelapis']['laukai']}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--saltinis')
    ap.add_argument('--komentarai')
    ap.add_argument('--nauja-redakcija')
    ap.add_argument('--tikrink', action='store_true')
    ap.add_argument('--versijos', nargs='+')
    a = ap.parse_args()
    reg = json.loads(REG.read_text(encoding='utf-8')) if REG.exists() else {'sablonai': {}}
    klaidos, pakeista = [], 0
    if a.versijos:
        for kodas, seima, kalba, tipas, rel, pav in SABLONAI:
            if kodas not in reg['sablonai']:
                continue
            kv, kp, nj = kitos_versijos(kodas, rel, a.versijos, seima)
            for k in ('kitos_versijos', 'kitos_pozymiai', 'naujos'):
                reg['sablonai'][kodas].pop(k, None)
            if kv:
                reg['sablonai'][kodas]['kitos_versijos'] = kv
            if kp:
                reg['sablonai'][kodas]['kitos_pozymiai'] = kp
            if nj:
                reg['sablonai'][kodas]['naujos'] = nj
            print('%-18s %s; naujų pastraipų %d' % (kodas, ', '.join('%s %d' % (k, len(v)) for k, v in kv.items()) or 'ankstesnių redakcijų nėra', len(nj)))
        reg = {'paaiskinimas': PAAISKINIMAS, 'versijos': VERSIJOS, 'sablonai': reg['sablonai']}
        js = json.dumps(reg, ensure_ascii=False, indent=1) + '\n'
        if REG.read_text(encoding='utf-8') != js:
            REG.write_text(js, encoding='utf-8'); pakeista += 1
        print('pakeista failų:', pakeista)
        return
    if a.tikrink:
        for kodas, seima, kalba, tipas, rel, pav in SABLONAI:
            b = (TPL / (kodas + '.docx')).read_bytes()
            r = reg['sablonai'].get(kodas, {})
            if r.get('sha256') != sha(b):
                klaidos.append('%s: šablonas nesutampa su registru' % kodas)
            z = json.loads((MAP / (kodas + '.json')).read_text(encoding='utf-8'))
            lt_z = json.loads((MAP / (kodas.replace('LTEN', 'LT') + '.json')).read_text(encoding='utf-8')) if kalba == 'LTEN' else None
            if z != {k: z[k] for k in ('pavadinimas', 'redakcija', 'sha256')} | zemelapis(kodas, b, seima, kalba, tipas,
                                                                                      {l['etikete'] for l in lt_z['laukai']} if lt_z else None):
                klaidos.append('%s: žemėlapis pasenęs' % kodas)
            if z['neatpazinta']:
                klaidos.append('%s: neatpažintų vietų %d' % (kodas, len(z['neatpazinta'])))
        for kodas, seima, kalba, tipas, rel, pav in SABLONAI:
            if kalba == 'LTEN':
                klaidos += ['%s: %s' % (kodas, k) for k in paritetas((TPL / (kodas.replace('LTEN', 'LT') + '.docx')).read_bytes(), (TPL / (kodas + '.docx')).read_bytes())]
        print('GERAI' if not klaidos else '\n'.join(klaidos))
        sys.exit(1 if klaidos else 0)
    if not a.saltinis:
        ap.error('--saltinis būtinas')
    saltinis = Path(a.saltinis).expanduser()
    TPL.mkdir(parents=True, exist_ok=True)
    MAP.mkdir(parents=True, exist_ok=True)
    nauji, visi_kom, paruosti = {}, {}, {}
    for kodas, seima, kalba, tipas, rel, pav in SABLONAI:
        src = (saltinis / rel).read_bytes()
        senas = reg['sablonai'].get(kodas, {}).get('saltinis', {}).get('sha256')
        if senas and senas != sha(src) and not a.nauja_redakcija:
            klaidos.append('%s: šaltinis pasikeitė (%s) - nauja LITGRID redakcija ar sena kopija? Peržiūrėkite taisymus ir paleiskite su '
                           '--nauja-redakcija "aprašas"' % (kodas, rel))
            continue
        b, kom, pk = paruosk(src)
        paruosti[kodas] = b
        if kom:
            visi_kom[kodas] = kom
        z = zemelapis(kodas, b, seima, kalba, tipas, lt_laukai(kodas, kalba, nauji))
        if z['neatpazinta']:
            klaidos += ['%s: neatpažinta vieta %s: %s' % (kodas, n['vieta'], n['tekstas']) for n in z['neatpazinta']]
        r = irasas(kodas, b)
        red = REDAKCIJOS_SEIMOS.get(seima, {}).get(tipas) or REDAKCIJOS['LTEN' if kalba == 'LTEN' else tipas]
        z = {'pavadinimas': pav, 'redakcija': red, 'sha256': r['sha256']} | z
        senas_ir = reg['sablonai'].get(kodas, {})
        nauji[kodas] = {'failas': 'templates/sutartys/%s.docx' % kodas, 'pavadinimas': pav, 'seima': seima, 'kalba': kalba, 'tipas': tipas,
                        'redakcija': z['redakcija'], 'saltinis': {'failas': rel, 'sha256': sha(src)}, 'paruosimas': pk} | r
        if a.nauja_redakcija and senas_ir.get('saltinis', {}).get('sha256') not in (None, sha(src)):
            nauji[kodas]['ankstesnes'] = senas_ir.get('ankstesnes', []) + [{'aprasas': a.nauja_redakcija, 'saltinis': senas_ir['saltinis'],
                                                                           'sha256': senas_ir.get('sha256'), 'dabartine': senas_ir.get('dabartine')}]
        elif senas_ir.get('ankstesnes'):
            nauji[kodas]['ankstesnes'] = senas_ir['ankstesnes']
        for k in ('kitos_versijos', 'kitos_pozymiai', 'naujos'):   # --versijos rezultatas (perskaičiuojamas atskirai)
            if senas_ir.get(k):
                nauji[kodas][k] = senas_ir[k]
        nauji[kodas]['_zemelapis'] = z
    for kodas, seima, kalba, tipas, rel, pav in SABLONAI:
        if kalba == 'LTEN' and kodas in paruosti and kodas.replace('LTEN', 'LT') in paruosti:
            klaidos += ['%s: %s' % (kodas, k) for k in paritetas(paruosti[kodas.replace('LTEN', 'LT')], paruosti[kodas])]
    if klaidos:
        print('NIEKAS NEĮRAŠYTA:\n  ' + '\n  '.join(klaidos))
        sys.exit(1)
    for kodas, ir in nauji.items():
        z = ir.pop('_zemelapis')
        tp, mp = TPL / (kodas + '.docx'), MAP / (kodas + '.json')
        js = json.dumps(z, ensure_ascii=False, indent=1) + '\n'
        if not tp.exists() or tp.read_bytes() != paruosti[kodas]:
            tp.write_bytes(paruosti[kodas]); pakeista += 1
        if not mp.exists() or mp.read_text(encoding='utf-8') != js:
            mp.write_text(js, encoding='utf-8'); pakeista += 1
        print('%-18s %s | %s' % (kodas, ', '.join(ir['paruosimas']) or 'be pakeitimų',
                                 ', '.join('%s %d' % (k, v) for k, v in z['suvestine'].items() if v)))
    duom = {'paaiskinimas': PAAISKINIMAS, 'versijos': reg.get('versijos', VERSIJOS), 'sablonai': nauji}
    js = json.dumps(duom, ensure_ascii=False, indent=1) + '\n'
    if not REG.exists() or REG.read_text(encoding='utf-8') != js:
        REG.write_text(js, encoding='utf-8'); pakeista += 1
    if a.komentarai:
        Path(a.komentarai).expanduser().write_text(json.dumps(visi_kom, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('pakeista failų:', pakeista)


if __name__ == '__main__':
    main()
