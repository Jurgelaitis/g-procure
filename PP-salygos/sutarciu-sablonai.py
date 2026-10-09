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
SABLONAI = [
    ('PREKES_LT_BS', 'PREKES', 'LT', 'BS', PREKES + '0922-PREKIŲ bendrosios sąlygos.docx', 'Prekių pirkimo-pardavimo sutarties bendrosios sąlygos'),
    ('PREKES_LT_SS', 'PREKES', 'LT', 'SS', PREKES + '0922- PREKIŲ pirkimo-pardavimo sutarties specialiosios sąlygos.docx', 'Prekių pirkimo-pardavimo sutarties specialiosios sąlygos'),
    ('PREKES_LTEN_BS', 'PREKES', 'LTEN', 'BS', PREKES + '0922-Bendrosios PREKIŲ sutarties sąlygos LT EN (arial).docx', 'Prekių pirkimo-pardavimo sutarties bendrosios sąlygos LT/EN'),
    ('PREKES_LTEN_SS', 'PREKES', 'LTEN', 'SS', PREKES + '0922- PREKIŲ specialiosios sutarties sąlygos LT EN (arial).docx', 'Prekių pirkimo-pardavimo sutarties specialiosios sąlygos LT/EN'),
    ('PASLAUGOS_LT_BS', 'PASLAUGOS', 'LT', 'BS', PASLAUGOS + '0922-Paslaugų pirkimo–pardavimo sutarties bendrosios sąlygos 05.docx', 'Paslaugų pirkimo-pardavimo sutarties bendrosios sąlygos'),
    ('PASLAUGOS_LT_SS', 'PASLAUGOS', 'LT', 'SS', PASLAUGOS + '0922-PASLAUGŲ sutarties spec. sąlygos.docx', 'Paslaugų pirkimo-pardavimo sutarties specialiosios sąlygos'),
    ('PASLAUGOS_LTEN_BS', 'PASLAUGOS', 'LTEN', 'BS', PASLAUGOS + '0922-Paslaugų sutarties Bendrosios sąlygos LT EN 0508.docx', 'Paslaugų pirkimo-pardavimo sutarties bendrosios sąlygos LT/EN'),
    ('PASLAUGOS_LTEN_SS', 'PASLAUGOS', 'LTEN', 'SS', PASLAUGOS + '0922-Paslaugų sutarties Specialiosios sąlygos LT EN.docx', 'Paslaugų pirkimo-pardavimo sutarties specialiosios sąlygos LT/EN'),
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
A4 = (11906, 16838)

WP = re.compile(r"<w:p\b[^>]*?(?:/>|>.*?</w:p>)", re.S)
SDT = re.compile(r"<w:sdt>(?:(?!<w:sdt>).)*?</w:sdt>", re.S)
RUN = re.compile(r"<w:r(?: [^>]*)?>(?:(?!<w:r[ >]).)*?</w:r>", re.S)
CELL = re.compile(r"(<w:sdt>\s*<w:sdtPr>(?:(?!</w:sdtPr>).)*</w:sdtPr>\s*(?:<w:sdtEndPr/>|<w:sdtEndPr>.*?</w:sdtEndPr>)?\s*<w:sdtContent>\s*)?"
                  r"(<w:tc>.*?</w:tc>)(\s*</w:sdtContent>\s*</w:sdt>)?", re.S)
NR = re.compile(r"^[\s ]*(\d+(?:\.\d+)*)\.(?![\d,])")


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


def i_a4(x):
    """Puslapis A4; per plačios lentelės - iki teksto pločio (stulpeliai proporcingai, langeliai pagal tinklelį). -> (xml, pakeitimai)."""
    pk = []
    sect = re.findall(r'<w:sectPr\b.*?</w:sectPr>', x, re.S)
    if len(sect) != 1:
        raise SystemExit('tikėtasi vieno skyriaus, rasta %d' % len(sect))
    pg = re.search(r'<w:pgSz [^>]*/>', sect[0]).group(0)
    if 'w:orient=' in pg:
        raise SystemExit('gulsčias puslapis - A4 keitimas nenumatytas')
    naujas = '<w:pgSz w:w="%d" w:h="%d"/>' % A4
    if pg != naujas:
        pk.append('puslapis %s -> A4' % 'x'.join(re.findall(r'w:[wh]="(\d+)"', pg)))
        x = x.replace(pg, naujas, 1)
    mar = re.search(r'<w:pgMar [^>]*/>', sect[0]).group(0)
    plotis = A4[0] - int(re.search(r'w:left="(\d+)"', mar).group(1)) - int(re.search(r'w:right="(\d+)"', mar).group(1))

    def lentele(m):
        t = m.group(0)
        if t.count('<w:tbl>') != 1:
            raise SystemExit('įdėtinė lentelė - nenumatyta')
        grid = [int(g) for g in re.findall(r'<w:gridCol w:w="(\d+)"/>', t)]
        if sum(grid) <= plotis:
            return t
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
    x = re.sub(r'<w:tbl>.*?</w:tbl>', lentele, x, flags=re.S)
    return x, pk


def paruosk(b):
    zi = zipfile.ZipFile(io.BytesIO(b))
    infos = zi.infolist()
    dalys = {i.filename: zi.read(i.filename) for i in infos}
    dalys['word/document.xml'] = dalys['word/document.xml'].decode('utf-8')
    kom = be_komentaru(dalys)
    x, pk = i_a4(dalys['word/document.xml'])
    dalys['word/document.xml'] = x.encode('utf-8')
    if kom:
        pk.insert(0, 'pašalinta komentarų: %d' % len(kom))
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zo:
        for i in infos:
            if i.filename in dalys:
                zi2 = zipfile.ZipInfo(i.filename, date_time=i.date_time)
                zi2.compress_type = zipfile.ZIP_DEFLATED
                zi2.external_attr = i.external_attr
                zo.writestr(zi2, dalys[i.filename])
    return out.getvalue(), kom, pk


# ------------------------------------------------------------------ žemėlapis
SPALVA_MELYNA = {'0070C0', '4472C4', '4471C4', '2B579A', '156082', '0F2D46'}
SPALVA_RAUDONA = {'FF0000'}
SPALVA_NUORODA = {'0563C1'}
# Nurodymas rengėjui - tik tai, kas liepia ką nors įrašyti, nurodyti ar pasirinkti. „(jeigu ...)“, „(taikoma, jei ...)“ sakinio viduje -
# sutarties sąlyga (lieka sutartyje), ne nurodymas.
NURODYMAS = re.compile(r"^\(\s*(nurodyti|nurodomos|įrašyti|jei reikalinga, nurodyti|jei tiekėjas yra|pasirinkti|pirkėjas gali|nereikalingą|"
                       r"arba nurodyti|pasirenkamas|specify|insert|delete|select|please specify|or specify|or such other \w+ as may be specified|the buyer may (select|choose)|"
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
    langeliai = []
    for ti, tm in enumerate(re.finditer(r'<w:tbl>.*?</w:tbl>', x, re.S)):
        for ri, rm in enumerate(re.finditer(r'<w:tr[ >].*?</w:tr>', tm.group(0), re.S)):
            base = tm.start() + rm.start()
            for ci, cm in enumerate(CELL.finditer(rm.group(0))):
                langeliai.append((base + cm.start(), base + cm.end(), ti, ri, ci))
    def kur(pos):
        for a, z, ti, ri, ci in langeliai:
            if a <= pos < z:
                return ti, ri, ci
        return None
    pars = [(m.start(), m.group(0)) for m in WP.finditer(x)]
    sdts = [(m.start(), m.end(), m.group(0)) for m in SDT.finditer(x)]
    lten = kalba == 'LTEN'
    Z = {'sablonas': 'templates/sutartys/%s.docx' % kodas, 'seima': seima, 'kalba': kalba, 'tipas': tipas,
         'valdikliai': [], 'pildomos': [], 'nurodymai': [], 'alternatyvos': [], 'trynimo_nurodymai': [], 'salygos': [],
         'laukai': [], 'organizacija': [], 'taikymo_salygos': [], 'linijos': [], 'paryskinimai': [], 'pritaikomos_nuostatos': [], 'keiciamos_reiksmes': [],
         'di_juodrasciai': [], 'neatpazinta': [], 'pastraipos': []}
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
        if not en:
            m = NR.match(t)
            if m:
                vieta = m.group(1)
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
        if ts in ORG:
            Z['organizacija'].append({'i': i, 'vieta': vieta, 'laukas': ORG[ts]}); padengta.append((0, len(t)))
        for m in ([] if re.fullmatch(r'_{5,}', ts) else PILDOMA.finditer(t)):
            Z['pildomos'].append({'i': i, 'vieta': vieta, 'tekstas': m.group(0)}); padengta.append(m.span())
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
    for lg, ps in pagal_langeli.items():
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
            elif not tekstu and not any(i in sdt_par for i, _ in ps) and k > 0:
                et = next((cells[c][-1][1] for c in reversed(cis[:k]) if any(ts for _, ts in cells[c])), '')
                et = next((ts for _, ts in reversed(cells[cis[k - 1]]) if ts), et)
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
                for a, z_, ti, ri, ci in langeliai:
                    if a <= sdts[v['nr']][0] < z_:
                        l = (ti, ri, ci)
                        break
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
            for vt, rx, sal, apr in ATSAKYMAI:
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
            'G-Procure ankstesnės redakcijos': 'ankstesnės šio modulio sutarčių šablonų redakcijos (git istorija)'}


def kitos_versijos(kodas, rel, aplankai):
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
        out['LITGRID 0922'] = sorted(litgrid)
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
            kv, kp, nj = kitos_versijos(kodas, rel, a.versijos)
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
        z = {'pavadinimas': pav, 'redakcija': REDAKCIJOS['LTEN' if kalba == 'LTEN' else tipas], 'sha256': r['sha256']} | z
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
