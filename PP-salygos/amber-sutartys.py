#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PP-salygos: AB „Amber Grid“ statybos rangos sutarties specialiųjų sąlygų formos atkūrimas (2026-11-06, naudotojo sprendimas „Atkurkite iš
pavyzdžio ir pažymėkite, kad atkurta“).

KODĖL ATKURIAMA. Tuščios Amber Grid formos neturime: paskelbtuose CVP IS pirkimuose jos specialiosios sąlygos (SUT-36) - Word dokumentas su
turinio valdikliais, užpildytas to pirkimo tekstu, o bendrosios sąlygos (SUT-35) - tik PDF. Naujausia redakcija SUT-36 13.0 (2026-10-02)
rasta viename paskelbtame pavyzdyje; ankstesnės 10.0 ir 11.0 - kitos sandaros. Šis scenarijus iš 13.0 pavyzdžio pašalina to pirkimo įrašus ir
grąžina formos vietas (valdiklius) neužpildytas. Kur pavyzdyje formos tekstas pakeistas pirkimo tekstu, imama 10.0 redakcijos (to paties
formos šeimos) formuluotė - kiekvienas toks atvejis išvardytas ATKURIMAS ir registre („atkurta“). Šablono pradžioje - raudona G-Procure pastaba,
kad forma atkurta (generatorius jos nešalina: prieš skelbiant palyginkite su galiojančia Amber Grid forma ir pastabą ištrinkite).

Bendrosios sąlygos (SUT-35 13.0, PDF, 18 MB) į saugyklą nekeliamos ir negeneruojamos: tai Amber Grid patvirtintas dokumentas, pridedamas prie
pirkimo be pakeitimų. Žemėlapyje (zemelapiai/sutartys/AG_SR_LT_BS.json) - jų punktų numeriai (nuorodų patikrai) ir šaltinio sha256.

Šaltinių aplankas (ne viešoje saugykloje; sha256 tikrinamas - kitas failas stabdo):
    SUT-36_13.0_pavyzdys.docx   paskelbto pirkimo specialiosios sąlygos (SUT-36 13.0 2026-10-02)
    SUT-36_10.0_pavyzdys.docx   paskelbto pirkimo specialiosios sąlygos (SUT-36 10.0 2025-11-03) - formuluotės, kurių 13.0 pavyzdyje nebeliko
    SUT-35_13.0.pdf             bendrosios sąlygos (SUT-35 13.0 2026-10-02)
    SUT-35_13.0_punktai.json    bendrųjų sąlygų punktų numeriai (PDF teksto eilučių pradžios, PDFKit; 2026-11-06)
    SUT-35_13.0_elementai.json  bendrųjų sąlygų eilutės, kuriose rasti privalomi sutarties elementai (GP_SUTARTIES_ELEMENTAI; 2026-11-06)

Naudojimas:
    python3 PP-salygos/amber-sutartys.py --saltinis ~/Documents/g-procure-privatu/sutartys/amber
    python3 PP-salygos/amber-sutartys.py --tikrink     # saugyklos šablonas prieš registrą ir žemėlapį (be šaltinio)
Pakartotinai paleidus - 0 pakeitimų (failai baitas į baitą tie patys).
"""
import argparse, hashlib, html, io, json, re, sys, zipfile, zlib
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / 'PP-salygos'))
from importlib import import_module
S = import_module('sutarciu-sablonai')

KODAS, SEIMA, KALBA, TIPAS = 'AG_SR_LT_SS', 'AG_STATYBOS_RANGOS', 'LT', 'SS'
BS_KODAS = 'AG_SR_LT_BS'
PAV = 'AB „Amber Grid“ statybos rangos sutarties specialiosios sąlygos'
BS_PAV = 'AB „Amber Grid“ statybos rangos sutarties bendrosios sąlygos'
SALTINIAI = {
    'ss13': ('SUT-36_13.0_pavyzdys.docx', 'e3d9967652181ac553403c78568ec661cb7f07d94fc5767d55654f4ef9b27062'),
    'ss10': ('SUT-36_10.0_pavyzdys.docx', 'cda2cd5072f7e943d7d1b1a033c659b163cefa65578b8868bacef11435906517'),
    'bs13': ('SUT-35_13.0.pdf', 'd0e59dceb3196d1295c8f56853dfebaef5142f6ba77ce6ead2ad1d0ff8845d08'),
}
FORMA = 'SUT-36 13.0 2026-10-02'
BS_FORMA = 'SUT-35 13.0 2026-10-02'
PASTABA = ('G-Procure pastaba (prieš skelbiant ištrinkite): ši specialiųjų sąlygų forma atkurta iš AB „Amber Grid“ paskelbto pirkimo '
           'sutarties projekto (' + FORMA + '), nes tuščios formos neturėjome. Prieš skelbdami palyginkite su galiojančia AB „Amber Grid“ forma.')
REDAKCIJA = ('AB „Amber Grid“ statybos rangos sutarties specialiosios sąlygos ' + FORMA + ', ATKURTOS iš paskelbto pirkimo sutarties projekto '
             '(tuščios formos neturime; naudotojo sprendimas 2026-11-06): to pirkimo įrašai pašalinti, valdikliai neužpildyti, pakeistos formos '
             'formuluotės - iš 10.0 redakcijos (registro „atkurta“); metaduomenys be asmenų vardų')

W = 'xmlns'
WP = re.compile(r"<w:p\b[^>]*?(?:/>|>.*?</w:p>)", re.S)
SDT1 = re.compile(r"<w:sdt>(?:(?!<w:sdt>).)*?</w:sdt>", re.S)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def tekstas(x):
    return ''.join(html.unescape(m) for m in re.findall(r"<w:t(?: [^>]*)?>([^<]*)</w:t>", x))


def norm(t):
    return re.sub(r'\s+', ' ', t).strip()


def esc(t):
    return html.escape(t, quote=False)


# ------------------------------------------------------------------ Word elementai
RPR = ('<w:rPr><w:rFonts w:ascii="Nunito Sans" w:eastAsia="Arial Unicode MS" w:hAnsi="Nunito Sans" w:cstheme="minorHAnsi"/>'
       '<w:sz w:val="18"/><w:szCs w:val="18"/><w:bdr w:val="nil"/><w:lang w:eastAsia="en-US"/></w:rPr>')
RPR_PLC = ('<w:rPr><w:rStyle w:val="PlaceholderText"/><w:rFonts w:ascii="Nunito Sans" w:hAnsi="Nunito Sans" w:cstheme="minorHAnsi"/>'
           '<w:sz w:val="18"/><w:szCs w:val="18"/><w:highlight w:val="lightGray"/></w:rPr>')
RPR_RAUD = ('<w:rPr><w:rFonts w:ascii="Nunito Sans" w:eastAsia="Arial Unicode MS" w:hAnsi="Nunito Sans" w:cstheme="minorHAnsi"/>'
            '<w:i/><w:iCs/><w:color w:val="FF0000"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:bdr w:val="nil"/><w:lang w:eastAsia="en-US"/></w:rPr>')


def run(t, rpr=RPR):
    return '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, esc(t))


def sdt_id(raktas):
    """Deterministinis valdiklio identifikatorius (int32, ne 0) - pakartotinai paleidus tas pats failas."""
    v = zlib.crc32(raktas.encode('utf-8')) & 0x7fffffff
    return str(v or 1)


def sdt(alias, rusis, elementai, vieta_rez, raktas):
    """Naujas neužpildytas valdiklis: rusis 'dropDownList' | 'comboBox' | 'text'; elementai - rodomi tekstai (vertė = tekstas)."""
    tipas = '<w:text/>' if rusis == 'text' else '<w:%s>%s%s</w:%s>' % (
        rusis, '<w:listItem w:value="%s"/>' % esc(vieta_rez).replace('"', '&quot;'),
        ''.join('<w:listItem w:displayText="%s" w:value="%s"/>' % ((esc(e).replace('"', '&quot;'),) * 2) for e in elementai), rusis)
    return ('<w:sdt><w:sdtPr><w:rPr><w:rFonts w:ascii="Nunito Sans" w:hAnsi="Nunito Sans" w:cstheme="minorHAnsi"/><w:sz w:val="18"/>'
            '<w:szCs w:val="18"/></w:rPr><w:alias w:val="%s"/><w:tag w:val="%s"/><w:id w:val="%s"/><w:showingPlcHdr/>%s</w:sdtPr>'
            '<w:sdtContent>%s</w:sdtContent></w:sdt>') % (esc(alias).replace('"', '&quot;'), esc(alias).replace('"', '&quot;'), sdt_id(raktas),
                                                          tipas, run(vieta_rez, RPR_PLC))


def nepasirinktas(s):
    """Užpildytas valdiklis -> neužpildytas (vietos rezervas): pirmas sąrašo elementas be rodomo teksto, kitaip „Choose an item.“ / tekstui -
    „Click or tap here to enter text.“"""
    pr = re.search(r'<w:sdtPr>.*?</w:sdtPr>', s, re.S).group(0)
    rusis = re.search(r'<w:(dropDownList|comboBox)\b', pr)
    if rusis:
        m = re.search(r'<w:listItem w:value="([^"]*)"\s*/>', pr)
        rez = html.unescape(m.group(1)) if m else 'Choose an item.'
    else:
        rez = 'Click or tap here to enter text.'
    pr2 = pr
    if '<w:showingPlcHdr/>' not in pr2:
        # schemos tvarka: ... w:id, w:lock, w:placeholder, w:temporary, w:showingPlcHdr, ..., tipas
        m = None
        for el in ('</w:placeholder>', '<w:temporary/>'):
            k = pr2.find(el)
            if k >= 0:
                m = k + len(el)
        if m is None:
            m = re.search(r'<w:id w:val="[^"]*"/>(?:<w:lock w:val="[^"]*"/>)?', pr2).end()
        pr2 = pr2[:m] + '<w:showingPlcHdr/>' + pr2[m:]
    return s.replace(pr, pr2, 1)[:0] + re.sub(r'<w:sdtContent>.*</w:sdtContent>', lambda _: '<w:sdtContent>%s</w:sdtContent>' % run(rez, RPR_PLC),
                                               s.replace(pr, pr2, 1), count=1, flags=re.S)


def elementai(s):
    return [html.unescape(d) for d, _ in re.findall(r'<w:listItem w:displayText="([^"]*)" w:value="([^"]*)"\s*/>', s)]


def ppr(p):
    m = re.match(r'(<w:p\b[^>]*>)\s*(<w:pPr>.*?</w:pPr>)?', p, re.S)
    return m.group(1), m.group(2) or ''


def pastraipa(pradzia, pPr, turinys):
    return pradzia + pPr + turinys + '</w:p>'


# ------------------------------------------------------------------ atkūrimas
# Kiekvienas atkūrimo žingsnis: (id, aprašas žmogui). Tekstas - kaip registre ir 3 žingsnio paaiškinime.
ATKURIMAS = [
    ('valdikliai', 'visi to pirkimo užpildyti valdikliai grąžinti neužpildyti (pirkimo būdas, darbų rūšis, statinio kategorija, projektas, '
                   'kainodara, terminai, procentai, draudimas, užtikrinimai, subranga, įsigaliojimas, egzempliorių skaičius ir kalba); sąrašų '
                   'variantai be tarpų kraštuose (redakcinė korekcija)'),
    ('pirkimas', 'įžanga: pirkimo pavadinimas ir numeris - valdiklis neužpildytas, CVP IS numeris - pildoma vieta „[...]“'),
    ('dalykas', '1 skyrius: pavyzdžio pirkimo dalykas (chromatografai, mokymai) pakeistas formos formuluotėmis iš 10.0 ir 11.0 redakcijų: '
                'objektas - valdiklis, Koordinatoriaus ir Projekto vykdymo priežiūros paslaugos - „taip / ne“ (bendrosiose sąlygose šios '
                'sąvokos yra)'),
    ('kainodara', '2.1 punktas: grupės valdiklis su įdėtu sąrašu - vienas sąrašas (tie patys variantai)'),
    ('indeksas', '2.2 punktas: konkretus indeksas pakeistas 10.0 redakcijos sąrašu (statybos sąnaudų indeksai, galima įrašyti kitą); '
                 'Sutarties sudarymo dienos indekso reikšmė - atskiras 2.2.2 punktas (pavyzdyje - „2.22“)'),
    ('mokejimas', '2.4.1 punktas: be „pagal kiekvieną Darbų užsakymą“ (to pirkimo užsakymų tvarka; 10.0 ir 11.0 redakcijose nėra)'),
    ('grafikas', '3.1.1 punktas: sąrašas - 10.0 redakcijos formuluotė (Grafiko pateikimo terminas dienomis nuo Sutarties pasirašymo) arba „Netaikoma.“ (11.0)'),
    ('terminas', '3.2.1 punktas: 10.0 redakcijos formuluotė (galutinis terminas mėnesiais nuo Sutarties įsigaliojimo); to pirkimo terminai '
                 'pagal užsakymų metus pašalinti'),
    ('priemimas', '3.3.1 punktas: 10.0 redakcijos formuluotė (dalimis arba vieną kartą)'),
    ('uztikrinimas', '5.2.1 punktas: pašalintas antras, tuščias to paties sąrašo valdiklis'),
    ('isigaliojimas', '7.1 punktas: sąlygos sunumeruotos (i), (ii) (pavyzdyje - (i), (iii); (ii) sąlygos turinys nežinomas)'),
    ('kitos', '9 skyrius: to pirkimo bendrųjų sąlygų pakeitimai pašalinti, vietoje jų - valdiklis kitoms nuostatoms (10.0 redakcijoje - „-.“)'),
    ('priedai', '10.4, 10.7 ir 10.9 priedų eilutės - su tašku gale, kaip kitos (redakcinė korekcija)'),
    ('tarpai', 'dvigubi tarpai tekste - vienas tarpas (redakcinė korekcija; lygiavimas po punkto numerio lieka)'),
    ('puslapis', 'puslapis - tikslus A4 (formoje 11907 x 16840 DXA)'),
    ('pastaba', 'šablono pradžioje - raudona G-Procure pastaba, kad forma atkurta'),
    ('metaduomenys', 'failo metaduomenys: be autoriaus ir taisiusiojo vardų, SharePoint ir jautrumo žymų'),
]


def atkurk(b13, b10):
    zi = zipfile.ZipFile(io.BytesIO(b13))
    infos = zi.infolist()
    dalys = {i.filename: zi.read(i.filename) for i in infos}
    x = dalys['word/document.xml'].decode('utf-8')
    x10 = zipfile.ZipFile(io.BytesIO(b10)).read('word/document.xml').decode('utf-8')

    # 0. Grupės valdiklis su įdėtu sąrašu (2.1) - lieka vidinis sąrašas
    gr = re.search(r'<w:sdt><w:sdtPr>(?:(?!</w:sdtPr>).)*<w:group/></w:sdtPr>(?:<w:sdtEndPr>.*?</w:sdtEndPr>)?<w:sdtContent>(<w:sdt>.*?</w:sdt>)</w:sdtContent></w:sdt>', x, re.S)
    if not gr or x.count('<w:group/>') != 1:
        raise SystemExit('2.1 punkto grupės valdiklis nerastas')
    x = x[:gr.start()] + gr.group(1) + x[gr.end():]

    # 1. Visi valdikliai - neužpildyti; sąrašų variantai be tarpų kraštuose (redakcinė korekcija: kitaip sakinyje - dvigubi tarpai)
    x = SDT1.sub(lambda m: nepasirinktas(m.group(0)) if '<w:showingPlcHdr/>' not in m.group(0) else m.group(0), x)
    x = re.sub(r'<w:listItem w:displayText="([^"]*)" w:value="([^"]*)"\s*/>',
               lambda m: '<w:listItem w:displayText="%s" w:value="%s"/>' % (m.group(1).strip(), m.group(2).strip()), x)

    ps = list(WP.finditer(x))
    T = [norm(tekstas(m.group(0))) for m in ps]
    keisti = {}

    def rask(pradzia, n=1):
        qs = [i for i, t in enumerate(T) if t.startswith(pradzia)]
        if len(qs) != n:
            raise SystemExit('pastraipa „%s“ rasta %d kartų (laukta %d)' % (pradzia, len(qs), n))
        return qs if n > 1 else qs[0]

    def p(i):
        return ps[i].group(0)

    def sdt_is(px, alias):
        m = next((m for m in SDT1.finditer(px) if ('<w:alias w:val="%s"/>' % alias if not alias.startswith('~') else alias[1:]) in m.group(0)), None)
        if not m:
            raise SystemExit('valdiklis „%s“ nerastas' % alias)
        return m.group(0)

    def sdt10(alias):
        return sdt_is(x10, alias)

    # 2. Įžanga: „CVP IS Nr. ....(toliau“ -> „CVP IS Nr. [...] (toliau“
    i = rask('remdamiesi ')
    px = p(i)
    if px.count('....') != 1:
        raise SystemExit('įžangos „....“ nerastas')
    keisti[i] = px.replace('....', '[...] ', 1)

    # 3. 1 skyrius: dalykas
    i = rask('Rangovas įsipareigoja pristatyti 16 vienetų')
    a, pr = ppr(p(i))
    v = sdt10('įrašykite objekto pavadinimą/apibūdinimą')
    keisti[i] = pastraipa(a, pr, run('Rangovas įsipareigoja atlikti ') + sdt('įrašykite objekto pavadinimą / apibūdinimą', 'text', [],
                          'Click or tap here to enter text.', 'objektas') + run(' (toliau – Objektas (-ai)):'))
    if '<w:text/>' not in v and 'įrašykite' not in v:
        raise SystemExit('10.0 objekto valdiklis netikėtas')
    i = rask('paprastojo remonto darbus') if False else None
    i = next(k for k, t in enumerate(T) if 'darbus ir su jais susijusias paslaugas (chromatografų' in t or
             (t.startswith('pasirinkite projekto rūšį') and 'chromatografų' in t))
    px = p(i)
    zod = re.search(r'paslaugas \(chromatografų\s+instaliavimo, testavimo, montavimo ir paleidimo-derinimo darbus\) taip pat', tekstas(px))
    if not zod:
        raise SystemExit('1 skyriaus darbų pastraipa netikėta: ' + tekstas(px)[:200])
    keisti[i] = keisk_teksta(px, zod.group(0), 'paslaugas, taip pat')
    i = rask('suteikti mokymus Techninėje specifikacijoje')
    a, pr = ppr(p(i))
    tn = ['taip', 'ne']
    keisti[i] = (pastraipa(a, pr, run('suteikti Koordinatoriaus (-ių), atsakingo (-ų), kad Teisės aktuose numatytais atvejais Projekto rengimo ir '
                                      '(ar) Darbų vykdymo metu būtų numatyti ir vykdomi darbuotojų saugos ir sveikatos reikalavimai, paslaugas – ')
                           + sdt('Pasirinkite ar Rangovas turės atlikti Koordinatoriaus funkcijas', 'dropDownList', tn, 'Choose an item.', 'koordinatorius')
                           + run(','))
                 + pastraipa('<w:p>', pr, run('atlikti Projekto vykdymo priežiūros paslaugas (toliau – Projekto vykdymo priežiūros paslaugos): ')
                             + sdt('Pasirinkite ar Rangovas atliks Projekto vykdymo priežiūrą', 'dropDownList', tn, 'Choose an item.', 'prieziura')
                             + run(',')))
    # 4. 2.2: be konkretaus indekso; 2.2.1 - indekso sąrašas (10.0), 2.2.2 - reikšmė Sutarties sudarymo dieną
    i = rask('2.2. Kainos peržiūros ir keitimo sąlygos')
    px = p(i)
    t = tekstas(px)
    m = re.search(r',\s*taip pat Sutarčiai taikomas\s*–\s*C28 Niekur kitur nepriskirtų mašinų ir įrangos gamyba indeksas\.\s*$', t)
    if not m:
        raise SystemExit('2.2 punkto indekso sakinys netikėtas: ' + t)
    px = keisk_teksta(px, t[m.start():], '.')
    keisti[i] = px
    a, pr = ppr(px)
    i2 = rask('2.22. Sutarties sudarymo dieną')
    p22 = p(i2)
    a2, pr2 = ppr(p22)
    reiksme = [m2.group(0) for m2 in SDT1.finditer(p22)]
    if len(reiksme) != 2:
        raise SystemExit('2.22 punkto valdiklių - ne 2')
    combo10 = sdt10('~Pastatų remonto sąnaudų elementų kainų')  # 10.0 indekso sąrašas be pavadinimo
    ind = elementai(combo10)
    if ind != ['Pastatų remonto sąnaudų elementų kainų', 'Inžinerinių tinklų statybos sąnaudų kainų '] and \
       [e.strip() for e in ind] != ['Pastatų remonto sąnaudų elementų kainų', 'Inžinerinių tinklų statybos sąnaudų kainų']:
        raise SystemExit('10.0 indekso sąrašas netikėtas: %r' % ind)
    pr2 = pr2.replace('<w:color w:val="FF0000"/>', '').replace('<w:i/><w:iCs/>', '')   # pastraipos ženklas buvo raudonas kursyvas
    keisti[i2] = (pastraipa(a2, pr2, run('2.2.1. Sutarčiai taikomas – ') + sdt('Pasirinkite indeksą', 'comboBox', [e.strip() for e in ind],
                                                                           'Choose an item.', 'indeksas') + run(' indeksas.'))
                  + pastraipa('<w:p>', pr2, run('2.2.2. Sutarties sudarymo dieną Sutarčiai taikomas indeksas yra ') + reiksme[0] + run(', ')
                              + reiksme[1] + run('.')))
    # 5. 2.4.1 be „pagal kiekvieną Darbų užsakymą,“
    i = rask('2.4.1.')
    px = p(i)
    if ', pagal kiekvieną Darbų užsakymą,' not in tekstas(px):
        raise SystemExit('2.4.1 netikėtas')
    keisti[i] = keisk_teksta(px, ', pagal kiekvieną Darbų užsakymą,', '')   # kaip 10.0: „(ar jų dalį) ne vėliau“
    # 6. 3.1.1 (10.0 formuluotė): sąrašas „Taikoma ... per [...] dienas“ / „Netaikoma.“ (11.0) - terminas įrašomas į „[...]“
    i = rask('3.1.1. Taikoma.')
    a, pr = ppr(p(i))
    p10 = next(m.group(0) for m in WP.finditer(x10) if norm(tekstas(m.group(0))).startswith('3.1.1. Taikoma.'))
    t10 = norm(tekstas(SDT1.sub('<w:t>[...]</w:t>', p10)))
    if t10 != '3.1.1. Taikoma. Rangovas privalo pateikti Užsakovui tarp Šalių suderintą ir pasirašytą Grafiką ne vėliau kaip [...] dienas (-ų) nuo Sutarties pasirašymo.':
        raise SystemExit('10.0 3.1.1 netikėtas: ' + t10)
    keisti[i] = pastraipa(a, pr, run('3.1.1. ') + sdt('Grafikas', 'dropDownList', [t10[len('3.1.1. '):], 'Netaikoma.'], 'Choose an item.', 'grafikas'))
    # 7. 3.2: to pirkimo terminai -> 3.2.1 (10.0)
    i0 = rask('Galutiniai Darbų atlikimo terminai:')
    i1 = rask('3.2.1. 2027 metais')
    i3 = rask('3.2.3. 2029 metais')
    if not (i1 == i0 + 1 and i3 == i0 + 3):
        raise SystemExit('3.2 punkto terminų pastraipos ne iš eilės')
    a, pr = ppr(p(i1))
    m36 = elementai(sdt_is(x10, 'galutinis Paslaugų atlikimo terminas'))
    keisti[i0] = ''
    keisti[i1] = pastraipa(a, pr, run('3.2.1. ne vėliau kaip numatyta Grafike, bet ne vėliau kaip per ')
                           + sdt('galutinis Darbų atlikimo terminas', 'comboBox', m36, 'Choose an item.', 'terminas')
                           + run(' mėnesį (-ius) nuo Sutarties įsigaliojimo dienos.'))
    keisti[i0 + 2] = ''
    keisti[i3] = ''
    # 8. 3.3.1 (10.0)
    i = rask('3.3.1. Darbų perdavimas ir priėmimas')
    t10 = next(norm(tekstas(m.group(0))) for m in WP.finditer(x10) if norm(tekstas(m.group(0))).startswith('3.3.1.'))
    if not t10.startswith('3.3.1. Darbų perdavimas ir priėmimas bei apmokėjimas už juos vykdomas: (i) dalimis'):
        raise SystemExit('10.0 3.3.1 netikėtas')
    a, pr = ppr(p(i))
    keisti[i] = pastraipa(a, pr, run(t10))
    # 9. 5.2.1: antras tuščias sąrašas
    i = rask('5.2.1.')
    px = p(i)
    vs = [m.group(0) for m in SDT1.finditer(px)]
    if len(vs) != 2:
        raise SystemExit('5.2.1 valdiklių - ne 2')
    k = px.find(vs[1])
    prieš = px[:k]
    # tarpas tarp valdiklių pašalinamas kartu
    prieš = re.sub(r'<w:r(?: [^>]*)?>(?:(?!<w:r[ >]).)*?<w:t xml:space="preserve"> </w:t></w:r>$', '', prieš, flags=re.S)
    keisti[i] = prieš + px[k + len(vs[1]):]
    # 10. 7.1 (iii) -> (ii)
    i = rask('(iii) ')
    px = p(i)
    keisti[i] = px.replace('<w:t>iii</w:t>', '<w:t>ii</w:t>', 1)
    if keisti[i] == px:
        raise SystemExit('7.1 (iii) nepakeistas')
    # 11. 9 skyrius: to pirkimo pakeitimai -> valdiklis
    i = rask('9.1. Bendrųjų sąlygų pakeitimai ir papildymai.')
    j = rask('10.1. Pirkimo dokumentai')
    a, pr = ppr(p(i))
    keisti[i] = pastraipa(a, pr, run('9.1. ') + sdt('nurodykite kitas Sutarties nuostatas', 'text', [], 'Click or tap here to enter text.', 'kitos'))
    # iki 10 skyriaus antraštės (kitas langelis) - tos pačios lentelės eilutės langelyje
    k10 = rask('10. Priedai')
    for q in range(i + 1, k10):
        keisti[q] = ''
    # 11a. Priedų sąrašo eilutės be taško gale (10.4, 10.7, 10.9) - su tašku, kaip kitos (redakcinė korekcija)
    for pr in ('10.4. Subrangovų sąrašas', '10.7. Minimalūs informacijos saugos reikalavimai paslaugų teikimui',
               '10.9. Minimalūs informacijos saugos reikalavimai projektavimui ir diegimui'):
        q = rask(pr)
        if T[q] != pr:
            raise SystemExit('priedo eilutė netikėta: ' + T[q])
        px = p(q)
        k = px.rfind('</w:t>')
        keisti[q] = px[:k] + '.' + px[k:]
    # 12. Pastaba pradžioje (po „SPECIALIOSIOS SĄLYGOS“)
    i = rask('SPECIALIOSIOS SĄLYGOS')
    a, pr = ppr(p(i))
    keisti[i] = p(i) + '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/><w:jc w:val="both"/></w:pPr>%s</w:p>' % run(PASTABA, RPR_RAUD)

    # surenkama
    out, nuo = [], 0
    for q, m in enumerate(ps):
        if q in keisti:
            out += [x[nuo:m.start()], keisti[q]]
            nuo = m.end()
    x = ''.join(out) + x[nuo:]
    # 13. Dvigubi tarpai (redakcinė korekcija, kaip PP-salygos šablonuose): tarp ženklų 2-3 tarpai -> vienas, 4-6 - tik tarp raidžių ar
    #     skaitmenų (lygiavimas po punkto numerio „5.1.1.     užtikrinimo“ lieka)
    x = WP.sub(lambda m: vienas_tarpas(m.group(0)), x)
    # 14. Puslapis - tikslus A4 (formoje 11907 x 16840 - Word „A4“ apvalinimas; LITGRID šablonai - 11906 x 16838); lentelių pločiai -
    #     procentais nuo teksto pločio, kaip formoje, nekeičiami
    if x.count('<w:pgSz w:w="11907" w:h="16840"/>') != 1:
        raise SystemExit('puslapio dydis netikėtas')
    x = x.replace('<w:pgSz w:w="11907" w:h="16840"/>', '<w:pgSz w:w="11906" w:h="16838"/>')
    if '<w:group/>' in x or re.search(r'C28|chromatograf|Chromatograf|2027 metais|mokymus', tekstas(x)):
        raise SystemExit('liko to pirkimo tekstas')
    dalys['word/document.xml'] = x.encode('utf-8')
    metaduomenys(dalys)
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zo:
        for inf in infos:
            if inf.filename in dalys:
                z2 = zipfile.ZipInfo(inf.filename, date_time=(2026, 11, 6, 0, 0, 0))
                z2.compress_type = zipfile.ZIP_DEFLATED
                z2.external_attr = inf.external_attr
                zo.writestr(z2, dalys[inf.filename])
    return out.getvalue()


def vienas_tarpas(px):
    """Pastraipos tekste (be valdiklių turinio) pertekliniai tarpai pašalinami iš tų runų, kuriuose jie yra; valdiklis - ne tarpas."""
    vald = [(m.start(), m.end()) for m in SDT1.finditer(px)]
    ts = []
    for m in re.finditer(r'(<w:t(?: [^>]*)?>)([^<]*)</w:t>', px):
        v = next(((a, z) for a, z in vald if a <= m.start() < z), None)
        ts.append((m.start(), m.end(), html.unescape(m.group(2)), v))
    visas, kur = '', []
    for j, (a, z, tt, v) in enumerate(ts):
        if v:
            if j and ts[j - 1][3] == v:
                continue
            visas += '\ue000'
            kur.append(None)
        else:
            visas += tt
            kur += [(j, k) for k in range(len(tt))]
    salinti = set()
    for m in re.finditer(r'(?<=[^ ])( {2,6})(?=[^ ])', visas):
        if len(m.group(1)) > 3 and not (visas[m.start() - 1].isalnum() and visas[m.end()].isalnum()):
            continue
        salinti.update(range(m.start() + 1, m.end()))
    if not salinti:
        return px
    del_j = {}
    for q in salinti:
        j, k = kur[q]
        del_j.setdefault(j, set()).add(k)
    out, nuo = [], 0
    for j, (a, z, tt, v) in enumerate(ts):
        if j in del_j:
            nn = ''.join(c for k, c in enumerate(tt) if k not in del_j[j])
            out += [px[nuo:a], '<w:t xml:space="preserve">%s</w:t>' % esc(nn)]
            nuo = z
    return ''.join(out) + px[nuo:]


def keisk_teksta(px, sena, nauja):
    """Pakeičia teksto atkarpą pastraipoje per kelis runus (be valdiklių): pirmas paliestas runas gauna naują tekstą, kiti - pašalinama dalis."""
    vald = [(m.start(), m.end()) for m in SDT1.finditer(px)]
    ts = [(m.start(), m.end(), m.group(1), m.group(2)) for m in re.finditer(r'(<w:t(?: [^>]*)?>)([^<]*)</w:t>', px)
          if not any(a <= m.start() < z for a, z in vald)]
    visas = ''.join(html.unescape(g) for _, _, _, g in ts)
    k = visas.find(sena)
    if k < 0 or visas.count(sena) != 1:
        raise SystemExit('atkarpa „%s“ nerasta vieną kartą' % sena)
    out, nuo, poz, idet = [], 0, 0, False
    for a, z, tag, g in ts:
        tt = html.unescape(g)
        s0, e0 = poz, poz + len(tt)
        poz = e0
        if e0 <= k or s0 >= k + len(sena):
            continue
        nn = tt[:max(k, s0) - s0] + ('' if idet else nauja) + tt[min(k + len(sena), e0) - s0:]
        idet = True
        out += [px[nuo:a], '<w:t xml:space="preserve">%s</w:t>' % esc(nn)]
        nuo = z
    return ''.join(out) + px[nuo:]


def pastovus_pozymiai(b):
    """Atpažinimo požymiai „pozymiai_visi“ (GP_PALYGINIMAS.identifikuok: visos ilgesnės nei 40 ženklų pastraipos, paskutiniai 8 maišos ženklai) - tik iš pastraipų be
    valdiklių ir be „[...]“: šioje formoje valdikliai yra beveik kiekvienoje pastraipoje, o užpildytame dokumente jų tekstas kitas, todėl iš visų
    pastraipų sudaryti požymiai sugeneruoto dokumento be generavimo paso nebeatpažindavo (balas 0,48 < 0,5; 2026-11-06)."""
    zin = zipfile.ZipFile(io.BytesIO(b))
    x = zin.read('word/document.xml').decode('utf-8')
    x2 = WP.sub(lambda m: '<w:p/>' if '<w:sdt>' in m.group(0) or '[...]' in tekstas(m.group(0)) else m.group(0), x)
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zo:
        for inf in zin.infolist():
            zo.writestr(inf, x2.encode('utf-8') if inf.filename == 'word/document.xml' else zin.read(inf.filename))
    dab = [S.FV.norm(t) for t in S.FV.tekstai(out.getvalue())]
    poz = sorted({S.FV.maisa(n)[-8:] for n in dab if len(n) > 40})   # visi (kaip registro „pozymiai_visi“ trumpoms formoms)
    if len(poz) < 20:
        raise SystemExit('per mažai atpažinimo požymių: %d' % len(poz))
    return ' '.join(poz)


def metaduomenys(dalys):
    """Be asmenų vardų ir vidinių žymų: autorius, taisęs, SharePoint savybės ir jautrumo žyma."""
    c = dalys['docProps/core.xml'].decode('utf-8')
    c = re.sub(r'<dc:creator>[^<]*</dc:creator>', '<dc:creator></dc:creator>', c)
    c = re.sub(r'<cp:lastModifiedBy>[^<]*</cp:lastModifiedBy>', '<cp:lastModifiedBy></cp:lastModifiedBy>', c)
    c = re.sub(r'<dc:title>[^<]*</dc:title>', '<dc:title>%s</dc:title>' % esc(PAV + ' (atkurta)'), c)
    c = re.sub(r'<cp:lastPrinted>[^<]*</cp:lastPrinted>', '', c)
    dalys['docProps/core.xml'] = c.encode('utf-8')
    cu = dalys['docProps/custom.xml'].decode('utf-8')
    props = re.findall(r'<property [^>]*>.*?</property>', cu, re.S)
    pradzia = cu[:cu.find('<property ')] if props else cu
    nauj = ('<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="G-Procure_forma"><vt:lpwstr>%s</vt:lpwstr></property>'
            '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="G-Procure_atkurta"><vt:lpwstr>%s</vt:lpwstr></property>'
            % (esc(FORMA), esc('Atkurta iš AB „Amber Grid“ paskelbto pirkimo sutarties projekto; prieš skelbiant palyginkite su galiojančia forma')))
    dalys['docProps/custom.xml'] = (pradzia + nauj + '</Properties>').encode('utf-8')
    salinti = [n for n in dalys if re.match(r'customXml/(_rels/)?item(Props)?[234]\.xml(\.rels)?$', n) or n == 'docMetadata/LabelInfo.xml']
    for n in salinti:
        del dalys[n]
    for rn in ('_rels/.rels', 'word/_rels/document.xml.rels'):
        r = dalys[rn].decode('utf-8')
        r = re.sub(r'<Relationship [^>]*Target="(?:\.\./)?(?:customXml/item[234]\.xml|docMetadata/LabelInfo\.xml)"[^>]*/>', '', r)
        dalys[rn] = r.encode('utf-8')
    ct = dalys['[Content_Types].xml'].decode('utf-8')
    ct = re.sub(r'<Override PartName="/(?:customXml/itemProps[234]\.xml|docMetadata/LabelInfo\.xml)"[^>]*/>', '', ct)
    dalys['[Content_Types].xml'] = ct.encode('utf-8')
    a = dalys['docProps/app.xml'].decode('utf-8')
    a = S.HLINKS_RE.sub('', a)
    a = re.sub(r'<Company>[^<]*</Company>', '<Company></Company>', a)
    a = re.sub(r'<Manager>[^<]*</Manager>', '', a)
    dalys['docProps/app.xml'] = a.encode('utf-8')
    for n in list(dalys):
        if n.endswith('.xml') and re.search(rb'Ka\xc4\x8danovskij|\xc5\xa0ipkauskien|\xc5\xbdibel', dalys[n]):
            raise SystemExit('asmens vardas liko: ' + n)


# ------------------------------------------------------------------ bendrosios sąlygos (punktų numeriai)
def bs_zemelapis(punktai, pdf_sha, citatos):
    return {'pavadinimas': BS_PAV, 'redakcija': 'AB „Amber Grid“ statybos rangos sutarties bendrosios sąlygos ' + BS_FORMA +
            ' (PDF, pridedamos prie pirkimo be pakeitimų; generatorius jų nekuria, į saugyklą nekeliamos)',
            'seima': SEIMA, 'kalba': KALBA, 'tipas': 'BS', 'statinis': True, 'forma': BS_FORMA, 'saltinis_sha256': pdf_sha,
            'punktai': punktai,
            # privalomų sutarties elementų patikrai (GP_SUTARTIES_ELEMENTAI): bendrųjų sąlygų eilutės, kuriose elementai rasti (visas tekstas - ne saugykloje)
            'elementu_citatos': citatos,
            # Amber Grid formų nesutapimas (taip ir paskelbtuose pirkimuose, 10.0, 11.0 ir 13.0 redakcijose): bendrosios sąlygos nurodo specialiųjų
            # sąlygų punktus, kurių specialiosiose sąlygose nėra (priedai - 10 skyriuje, atsakingi asmenys - 11 skyriuje)
            'nuorodos_i_ss': [{'bs': '1.5.3', 'ss': '12', 'apie': 'Užsakovo už Sutarties vykdymą atsakingas asmuo (specialiosiose sąlygose - 11.1 punktas)'},
                              {'bs': '5.3.10', 'ss': '11.8', 'apie': 'Konfidencialumo susitarimas (specialiosiose sąlygose - 10.8 priedas)'},
                              {'bs': '5.3.10', 'ss': '11.7', 'apie': 'Susitarimas dėl asmens duomenų tvarkymo (specialiosiose sąlygose tokio priedo nėra)'}]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--saltinis')
    ap.add_argument('--tikrink', action='store_true')
    a = ap.parse_args()
    reg = json.loads(S.REG.read_text(encoding='utf-8'))
    tp, mp, bmp = S.TPL / (KODAS + '.docx'), S.MAP / (KODAS + '.json'), S.MAP / (BS_KODAS + '.json')
    if a.tikrink:
        klaidos = []
        b = tp.read_bytes()
        r = reg['sablonai'].get(KODAS, {})
        if r.get('sha256') != sha(b):
            klaidos.append('%s: šablonas nesutampa su registru' % KODAS)
        z = json.loads(mp.read_text(encoding='utf-8'))
        if z != {k: z[k] for k in ('pavadinimas', 'redakcija', 'sha256')} | S.zemelapis(KODAS, b, SEIMA, KALBA, TIPAS):
            klaidos.append('%s: žemėlapis pasenęs' % KODAS)
        if z['neatpazinta']:
            klaidos.append('%s: neatpažintų vietų %d' % (KODAS, len(z['neatpazinta'])))
        print('GERAI' if not klaidos else '\n'.join(klaidos))
        sys.exit(1 if klaidos else 0)
    if not a.saltinis:
        ap.error('--saltinis būtinas')
    d = Path(a.saltinis).expanduser()
    src = {}
    for k, (f, h) in SALTINIAI.items():
        bb = (d / f).read_bytes()
        if sha(bb) != h:
            raise SystemExit('%s: šaltinis kitas (sha256 %s) - nauja Amber Grid redakcija? Peržiūrėkite atkūrimą ir pakeiskite SALTINIAI' % (f, sha(bb)))
        src[k] = bb
    punktai = json.loads((d / 'SUT-35_13.0_punktai.json').read_text(encoding='utf-8'))
    citatos = json.loads((d / 'SUT-35_13.0_elementai.json').read_text(encoding='utf-8'))
    if punktai.get('sha256') != SALTINIAI['bs13'][1] or citatos.get('sha256') != SALTINIAI['bs13'][1]:
        raise SystemExit('SUT-35_13.0_punktai.json ar _elementai.json - ne to PDF')
    if PASTABA not in S.BLOKAI[KODAS]['rengejo_pastabos']:
        raise SystemExit('PASTABA nesutampa su sutarciu-sablonai.py BLOKAI_AG')
    b = atkurk(src['ss13'], src['ss10'])
    z = S.zemelapis(KODAS, b, SEIMA, KALBA, TIPAS)
    if z['neatpazinta']:
        raise SystemExit('NIEKAS NEĮRAŠYTA - neatpažintos vietos:\n  ' + '\n  '.join('%s: %s' % (n['vieta'], n['tekstas']) for n in z['neatpazinta']))
    ir = S.irasas(KODAS, b)
    ir['pozymiai_visi'] = pastovus_pozymiai(b)
    z = {'pavadinimas': PAV, 'redakcija': REDAKCIJA, 'sha256': ir['sha256']} | z
    pakeista = 0
    if not tp.exists() or tp.read_bytes() != b:
        tp.write_bytes(b); pakeista += 1
    for f, obj in ((mp, z), (bmp, bs_zemelapis(punktai['punktai'], SALTINIAI['bs13'][1], citatos['citatos']))):
        js = json.dumps(obj, ensure_ascii=False, indent=1) + '\n'
        if not f.exists() or f.read_text(encoding='utf-8') != js:
            f.write_text(js, encoding='utf-8'); pakeista += 1
    reg['sablonai'][KODAS] = {'failas': 'templates/sutartys/%s.docx' % KODAS, 'pavadinimas': PAV, 'seima': SEIMA, 'kalba': KALBA, 'tipas': TIPAS,
                              'redakcija': REDAKCIJA, 'forma': FORMA, 'imone': 'amber-grid',
                              'atkurta': {'is': 'AB „Amber Grid“ paskelbto pirkimo sutarties projektas (' + FORMA + ')',
                                          'saltinis_sha256': SALTINIAI['ss13'][1], 'pagalbinis_sha256': SALTINIAI['ss10'][1],
                                          'zingsniai': [{'id': k, 'aprasas': t} for k, t in ATKURIMAS]}} | ir
    reg['sablonai'][BS_KODAS] = {'failas': None, 'pavadinimas': BS_PAV, 'seima': SEIMA, 'kalba': KALBA, 'tipas': 'BS', 'forma': BS_FORMA,
                                 'imone': 'amber-grid', 'statinis': True, 'saltinis_sha256': SALTINIAI['bs13'][1]}
    js = json.dumps(reg, ensure_ascii=False, indent=1) + '\n'
    if S.REG.read_text(encoding='utf-8') != js:
        S.REG.write_text(js, encoding='utf-8'); pakeista += 1
    print('%s | %s' % (KODAS, ', '.join('%s %d' % (k, v) for k, v in z['suvestine'].items() if v)))
    print('pakeista failų:', pakeista)


if __name__ == '__main__':
    main()
