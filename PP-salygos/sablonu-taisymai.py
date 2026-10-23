#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PP-salygos: LITGRID sablonu QA taisymai.

PASKIRTIS. Šablonuose rasta raštvedybos ir logikos klaidų (trūkstamas lietuviškas
sakinys dvikalbėje versijoje, netinkamo pirkimo būdo formuluotė). Šis vienkartinis
priežiūros įrankis jas ištaiso chirurgiškai - keičiamas tik nurodytas tekstas,
visa kita pakuotė lieka nepaliesta.

PRINCIPAS. Nė vienas sakinys nėra sukurtas: kiekvienas taisymas remiasi kitu
AUTENTIŠKU LITGRID šablonu (pvz. trūkstamas LT sakinys imamas iš vienkalbės LT SPS,
kur jis yra). Šaltinis nurodomas prie kiekvienos taisyklės.

Tai NE modulio dalis - modulis (PP-SALYGOS.html) veikia naršyklėje be build žingsnio.
Šis skriptas paleidžiamas rankomis, kai LITGRID atsiunčia naujus šablonus.

Naudojimas:  python3 sablonu-taisymai.py          (parodo, ką darytų)
             python3 sablonu-taisymai.py --taisyk (irašo pakeitimus)
"""
import shutil, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
ET.register_namespace('w', W[1:-1])
TPL = Path(__file__).parent / 'templates'


def skaityk(f):
    z = zipfile.ZipFile(f)
    return z, ET.fromstring(z.read('word/document.xml'))


def pastraipos(root):
    return list(root.find(W + 'body').iter(W + 'p'))


def tekstas(p):
    return ''.join(t.text or '' for t in p.iter(W + 't')).strip()


def irasyk(zip_in, root, kelias):
    """Perrašo tik word/document.xml, visa kita perkelia baitas į baitą."""
    tmp = Path(str(kelias) + '.tmp')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
        for item in zip_in.infolist():
            data = (ET.tostring(root, encoding='UTF-8', xml_declaration=True)
                    if item.filename == 'word/document.xml' else zip_in.read(item.filename))
            out.writestr(item, data)
    shutil.move(tmp, kelias)


def nustatyk_teksta(p, naujas):
    """Įrašo tekstą į pirmą <w:t>, likusius ištuština - formatavimas išlieka."""
    ts = list(p.iter(W + 't'))
    if not ts:
        return False
    ts[0].text = naujas
    ts[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    for t in ts[1:]:
        t.text = ''
    return True


# ---------------------------------------------------------------------------
# NEPASITVIRTINO. Buvo itariama, kad dvikalbeje SPS truksta lietuvisku sakiniu
#   prie zaliuju salygu (ties 607, 611, 614 matomi tik angliski). Patikrinus
#   paaiskejo, kad dvikalbis sablonas KARTOJA tas pacias lietuviskas salygu
#   antrastes dukart: pirma su lietuviskais sakiniais (598, 601, 604), po to su
#   anglikais (609, 612, 615). Sakiniai YRA. Defekto nera, taisymas atsauktas.
#   (Butent todel kiekvienas itariamas defektas pries taisant tikrinamas.)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# TAISYMAS 2. Vienkalbeje TSD SPS 1.2 p. rasoma „Vykdomas Supaprastintas
#   pirkimas...", nors tai TARPTAUTINIU skelbiamu derybu sablonas.
#   Saltinis: TSD_LTEN_SPS.docx dvynys, kuriame rasoma „Vykdomas Tarptautinis pirkimas."
# ---------------------------------------------------------------------------
def taisymas_2(taisyk):
    z, root = skaityk(TPL / 'TSD_LT_SPS.docx')
    blogas = 'Vykdomas Supaprastintas pirkimas'
    geras = 'Vykdomas Tarptautinis pirkimas.'
    pak = []
    for p in pastraipos(root):
        t = tekstas(p)
        if t.startswith(blogas):
            nustatyk_teksta(p, geras)
            pak.append(t)
    print(f"\nTAISYMAS 2 - vienkalbe TSD SPS 1.2 p.: {len(pak)} pakeitimas")
    for t in pak:
        print(f"  - buvo: {t}")
        print(f"  + tapo: {geras}   (saltinis: dvikalbis TSD dvynys)")
    if taisyk and pak:
        irasyk(z, root, TPL / 'TSD_LT_SPS.docx')
        print("  -> irasyta i TSD_LT_SPS.docx")
    return len(pak)


def taisymas_url(taisyk):
    """URL taisymai. Chirurginis RAW baitu pakeitimas zip viduje (be XML
    reserializacijos) - keiciamas tik tikslus URL substringas, viskas kita
    (runai, formatavimas, rels) lieka nepaliesta.

    1) DPSK_LT_SALYGOS: VPT „melaginga informacija" nuoroda grazina 404
       (truksta bruksnio: „pateikusiutiekeju"). Aktuali nuoroda patikrinta
       (200) ir imama is AUTENTISKO saltinio - AK_LT_SPS, kur ji teisinga.
    2) DPSK_LT_SALYGOS ir DPSK_LTEN_SALYGOS: EBVPD nuoroda http -> https
       (http persikelia i https; saugom galutini adresa). LT versijoje ji
       yra ir tekste, ir hipernuorodos rels Target - keiciam abu."""
    # 3) (2026-10-03, nauji LITGRID sablonai) BPS isnasose CVP IS uzsifravimo instrukcija - 404 (http://vpt.lrv.lt/...)
    #    ir neegzistuojantis serveris (v17.1.2.pt.lrv.lt). Veikianti tos pacios instrukcijos nuoroda (200, PDF) - is
    #    AUTENTISKU LITGRID sablonu DPSP_LT_SALYGOS / DPSP_LTEN_SALYGOS.
    UZS_GERAS   = b'https://vpt.lrv.lt/uploads/vpt/documents/files/LT_versija/CVP_IS/Mokymu_medziaga/Tiekejams/Uzsifravimo_instrukcija.pdf'
    UZS_BLOGI   = [b'http://vpt.lrv.lt/uploads/vpt/documents/files/uzsifravimo_instrukcija.pdf',
                   b'http://v17.1.2.pt.lrv.lt/uploads/vpt/documents/files/uzsifravimo_instrukcija.pdf']
    VPT_BLOGAS = b'https://vpt.lrv.lt/melaginga-informacija-pateikusiutiekeju-sarasas-3'
    VPT_GERAS  = b'https://vpt.lrv.lt/lt/nuorodos/kiti-duomenys/powerbi/melaginga-informacija-pateikusiu-tiekeju-sarasas-3/'
    EBVPD_BLOGAS = b'http://ebvpd.eviesiejipirkimai.lt/espd-web/'
    EBVPD_GERAS  = b'https://ebvpd.eviesiejipirkimai.lt/espd-web/'
    # 4) (2026-10-03) Visu 11 BPS isnasa: EIMIN puslapis perkeltas (senas - 404, naujas - 200, tas pats pavadinimas
    #    „Reglamentuojamų profesinių kvalifikacijų pripažinimas", adresas is ministerijos sitemap.xml).
    EIMIN_BLOGAS = b'https://eimin.lrv.lt/lt/veiklos-sritys/verslo-aplinka/reglamentuojamu-profesiniu-kvalifikaciju-pripazinimas'
    EIMIN_GERAS  = b'https://eimin.lrv.lt/lt/veiklos-sritys/verslo-aplinka/zmogiskuju-istekliu-pletra/reglamentuojamu-profesiniu-kvalifikaciju-pripazinimas/'
    # 5) Konfidencialumo isipareigojimo isnasa: LITGRID asmens duomenu puslapis - 404; dabartinis - LITGRID svetaines
    #    LT privatumo pranesimas (hreflang lt is veikiancios EN nuorodos https://www.litgrid.eu/en/privacy-notice).
    LG_BLOGAS = b'https://www.litgrid.eu/index.php/apie-litgrid/asmens-duomenu-apsauga/3936'
    LG_GERAS  = b'https://www.litgrid.eu/privatumo-pranesimas'
    # 6) AKV pasiulymo formos isnasa: VPT straipsnis „Kaip turi būti suprantamas konfidencialumas viešuosiuose
    #    pirkimuose?" pasalintas („Ieškomas puslapis neegzistuoja"); archyvo (web.archive.org, 2022-01-18) kopijoje
    #    jis buvo VPT DUK skiltyje „Konfidencialumas" - ta skiltis tebeegzistuoja (VPT API, 2026-10-03).
    VPTK_BLOGAS = b'https://klausk.vpt.lt/hc/lt/articles/115005730625-Kaip-turi-b%C5%ABti-suprantamas-konfidencialumas-vie%C5%A1uosiuose-pirkimuose-'
    VPTK_GERAS  = b'https://klausk.vpt.lt/hc/lt/sections/115001605645-Konfidencialumas'
    # 7) DPS konkretaus pirkimo salygu 1.1 p.: juoda nuoroda „CVP IS (viesiejipirkimai.lt)" vede i KITO pirkimo
    #    („330 kV oro linijų ...") paieska, nors pavyzdys - kita DPS. Nuoroda nukreipiama ten, ka sako jos tekstas
    #    (https://viesiejipirkimai.lt - kaip 13 kitu LITGRID sablonu nuorodu); konkretu skelbima iraso rengejas.
    CVPP_BLOGAS = (b'https://cvpp.eviesiejipirkimai.lt/?SelectedTextFilter=&amp;Query=330+kV+oro+linij%C5%B3+rekonstrukcijos+ir+naujos+statybos+'
                   b'&amp;OrderingType=0&amp;OrderingDirection=0&amp;IncludeExpired=false&amp;Cpvs=&amp;TenderId=&amp;EpsReferenceNr=&amp;DeadlineFromDate='
                   b'&amp;DeadlineToDate=&amp;PublishedFromDate=&amp;PublishedToDate=&amp;IsGreenProcurement=false&amp;PageNumber=1&amp;PageSize=10')
    CVPP_GERAS  = b'https://viesiejipirkimai.lt'
    TAISYMAI = [
        ('DPSK_LT_SALYGOS.docx',   [(VPT_BLOGAS, VPT_GERAS), (EBVPD_BLOGAS, EBVPD_GERAS)]),
        ('DPSK_LTEN_SALYGOS.docx', [(EBVPD_BLOGAS, EBVPD_GERAS)]),
        ('PRIEDAI_LT_KONFIDENCIALUMAS.docx',   [(LG_BLOGAS, LG_GERAS)]),
        ('PRIEDAI_LTEN_KONFIDENCIALUMAS.docx', [(LG_BLOGAS, LG_GERAS)]),
        ('AKV_LT_PASIULYMAS.docx', [(VPTK_BLOGAS, VPTK_GERAS)]),
        ('DPSP_LT_SALYGOS.docx',   [(CVPP_BLOGAS, CVPP_GERAS)]),
        ('DPSP_LTEN_SALYGOS.docx', [(CVPP_BLOGAS, CVPP_GERAS)]),
    ] + [(f, [(b, UZS_GERAS) for b in UZS_BLOGI]) for f in
         ('AK_LT_BPS.docx', 'AK_LTEN_BPS.docx', 'AKV_LT_BPS.docx', 'MVP_LT_BPS.docx', 'MVP_LTEN_BPS.docx', 'TSD_LT_BPS.docx', 'TSD_LTEN_BPS.docx')] \
      + [(f, [(EIMIN_BLOGAS, EIMIN_GERAS)]) for f in
         ('AK_LT_BPS.docx', 'AK_LTEN_BPS.docx', 'AKV_LT_BPS.docx', 'MVP_LT_BPS.docx', 'MVP_LTEN_BPS.docx', 'ND_LT_BPS.docx',
          'ND_LTEN_BPS.docx', 'SSD_LT_BPS.docx', 'SSD_LTEN_BPS.docx', 'TSD_LT_BPS.docx', 'TSD_LTEN_BPS.docx')]
    ENTRYS = ('word/document.xml', 'word/_rels/document.xml.rels', 'word/footnotes.xml', 'word/_rels/footnotes.xml.rels')
    print("\nTAISYMAS URL - VPT 404, EBVPD http->https, CVP IS uzsifravimo instrukcija (BPS isnasos):")
    total = 0
    for fname, poros in TAISYMAI:
        path = TPL / fname
        with zipfile.ZipFile(path, 'r') as zin:
            infos = zin.infolist()
            items = {n: zin.read(n) for n in zin.namelist()}
        pak = 0
        for entry in ENTRYS:
            if entry not in items:
                continue
            data = items[entry]
            for senas, naujas in poros:
                c = data.count(senas)
                if c:
                    data = data.replace(senas, naujas)
                    pak += c
                    print(f"  {fname} [{entry.split('/')[-1]}]: {c}x")
                    print(f"    - {senas.decode()}")
                    print(f"    + {naujas.decode()}")
            items[entry] = data
        if pak and taisyk:
            with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for info in infos:
                    zout.writestr(info, items[info.filename])
            print(f"  -> irasyta i {fname}")
        total += pak
    print(f"  (saltiniai: AK_LT_SPS teisinga VPT nuoroda, DPSP sablonu uzsifravimo instrukcija; nuorodos patikrintos 200)")
    return total


# ---------------------------------------------------------------------------
# TEKSTO TAISYMAI (2026-10-03, nauji LITGRID sablonai; naudotojo prasymu „kad modulis veiktu efektyviai").
#   Keiciamas tik nurodytas tekstas pastraipos viduje: XML eilute redaguojama vietoje (be ElementTree
#   reserializacijos - kitaip pasikeistu vardu erdviu priesdeliai ir mc:Ignorable), formatavimas lieka
#   pirmojo paliesto runo, kiti paliesti runai tik sutrumpinami. Kiekvienas taisymas remiasi AUTENTISKU
#   saltiniu - to paties sablono apibrezimais, sarasu ar kitu LITGRID sablonu; pakartotinai paleidus - 0.
# ---------------------------------------------------------------------------
import html as _html
import re as _re
from xml.sax.saxutils import escape as _esc

_P_RE = _re.compile(rb'<w:p(?:\s[^>]*)?>.*?</w:p>', _re.S)
_T_RE = _re.compile(rb'(<w:t(?:\s[^>]*)?>)(.*?)(</w:t>)', _re.S)


def _pastraipos_tekstas(seg):
    return ''.join(_html.unescape(m.group(2).decode('utf-8')) for m in _T_RE.finditer(seg))


def _keisk_pastraipa(seg, pakeitimai):
    """pakeitimai: [(pradzia, pabaiga, naujas)] sujungto pastraipos teksto koordinatemis.
    Grazina nauja segmenta. Persidengiantys pakeitimai neleidziami."""
    ts = list(_T_RE.finditer(seg))
    tekstai = [_html.unescape(m.group(2).decode('utf-8')) for m in ts]
    rib = [0]
    for t in tekstai:
        rib.append(rib[-1] + len(t))
    for s, e, naujas in sorted(pakeitimai, key=lambda x: -x[0]):
        # pirmas runas, kuriame prasideda pakeitimas (iterpimas - i runa, kurio viduje ar gale yra pozicija)
        i = next(k for k in range(len(tekstai)) if rib[k] <= s < rib[k + 1] or (s == e and rib[k] <= s <= rib[k + 1]))
        j = next(k for k in range(len(tekstai)) if rib[k] < e <= rib[k + 1]) if e > s else i
        if i == j:
            t = tekstai[i]
            tekstai[i] = t[:s - rib[i]] + naujas + t[e - rib[i]:]
        elif len(naujas) == e - s:
            # to paties ilgio (pvz. priedo numeris „11“ -> „13“, raudoni runai „ 1“ + „1 “) - po simboli i tuos pacius
            # runus, kad runu ribos ir tarpai liktu kaip sablone
            for poz, c in zip(range(s, e), naujas):
                k = next(k for k in range(i, j + 1) if rib[k] <= poz < rib[k + 1])
                t = tekstai[k]; o = poz - rib[k]
                tekstai[k] = t[:o] + c + t[o + 1:]
        else:
            tekstai[i] = tekstai[i][:s - rib[i]] + naujas
            for k in range(i + 1, j):
                tekstai[k] = ''
            tekstai[j] = tekstai[j][e - rib[j]:]
    out, poz = [], 0
    for m, t in zip(ts, tekstai):
        atid = m.group(1)
        if (t[:1].isspace() or t[-1:].isspace()) and b'xml:space' not in atid:
            atid = atid[:-1] + b' xml:space="preserve">'
        out.append(seg[poz:m.start()])
        out.append(atid + _esc(t).encode('utf-8') + m.group(3))
        poz = m.end()
    out.append(seg[poz:])
    return b''.join(out)


def _redaguok(xml, fn):
    """fn(tekstas, segmentas) -> [(pradzia, pabaiga, naujas)] arba None. Grazina (xml, pakeitimu_skaicius)."""
    out, poz, n = [], 0, 0
    for m in _P_RE.finditer(xml):
        seg = m.group(0)
        if b'<w:txbxContent' in seg:
            continue
        pak = fn(_pastraipos_tekstas(seg), seg)
        if pak:
            out.append(xml[poz:m.start()])
            out.append(_keisk_pastraipa(seg, pak))
            poz = m.end()
            n += len(pak)
    out.append(xml[poz:])
    return b''.join(out), n


def _regex_pakeitimai(*poros):
    """poros: (regex, naujas | fn(m) -> naujas, grupe). Keiciama tik nurodyta grupe (0 - visa atitiktis)."""
    def fn(tekstas, seg):
        pak, uzimta = [], []
        for rx, naujas, g in poros:
            for m in rx.finditer(tekstas):
                s, e = m.span(g)
                if any(s < b and a < e for a, b in uzimta) or (s == e and any(a <= s <= b for a, b in uzimta)):
                    continue
                v = naujas(m) if callable(naujas) else naujas
                if v != tekstas[s:e]:
                    pak.append((s, e, v)); uzimta.append((s, e))
        return pak
    return fn


# AKV (VPĮ) - BPS apibrezia „Pirkimo vykdytojas“ ir „Įgaliojusioji organizacija“; PĮ terminas „Perkantysis subjektas“
# AKV sablone neapibreztas. Keiciama i apibrezta termina (tas pats asmuo - LITGRID AB). NELIECIAMA: istatymo
# pavadinimas („... perkančiųjų subjektų, įstatymas“) ir VPĮ citata „ankstesnę sutartį su perkančiuoju subjektu“.
_AKV_TERMINAS = {'perkantysis subjektas': 'Pirkimo vykdytojas', 'perkančiojo subjekto': 'Pirkimo vykdytojo',
                 'perkančiajam subjektui': 'Pirkimo vykdytojui', 'perkantįjį subjektą': 'Pirkimo vykdytoją',
                 'perkančiuoju subjektu': 'Pirkimo vykdytoju'}
_AKV_TERMINAS_RE = _re.compile(r'(?<!sutartį su )\b(' + '|'.join(_AKV_TERMINAS) + r')\b', _re.I)


def _dokumento_dalys(z):
    return [n for n in z.namelist() if _re.match(r'word/(document|footnotes|endnotes|header\d*|footer\d*)\.xml$', n)]


def _sarasas(xml, rx):
    """Pirmas sablono priedu saraso eilutes numeris (pvz. „13 priedas – Priimtinų bankų sąrašas.“)."""
    for m in _P_RE.finditer(xml):
        mm = rx.match(_pastraipos_tekstas(m.group(0)).strip())
        if mm:
            return mm.group(1)
    return None


def taisymas_tekstas(taisyk):
    print("\nTEKSTO TAISYMAI (2026-10-03):")
    viso = 0
    # A. AKV terminai ir VPĮ nuoroda; tarpas pavyzdyje
    akv = [(_AKV_TERMINAS_RE, lambda m: _AKV_TERMINAS[m.group(1).lower()], 1),
           (_re.compile(r'(?:^|[^V])(PĮ 29)( straipsnio 4 dalyje)'), 'VPĮ 17', 1),        # BPS jau „VPĮ 17 straipsnio 4 dalyje“; e-tar: ta pati norma
           (_re.compile(r'Pirkimo vykdytojas()\d{4}-\d{2}-\d{2}'), ' ', 1)]
    # B. Pavyzdys „Jeigu perkantysis subjektas ... kreipėsi į tiekėją prašydama“ - vyriskoji gimine (subjektas / vykdytojas)
    prasydama = [(_re.compile(r'Jeigu (?:perkantysis subjektas|Pirkimo vykdytojas) ?\d{4}-\d{2}-\d{2} kreipėsi į tiekėją (prašydama)\b'), 'prašydamas', 1)]
    darbai = [(f, akv) for f in ('AKV_LT_SPS.docx', 'AKV_LT_BPS.docx', 'AKV_LT_PASIULYMAS.docx')] + \
             [(f, prasydama) for f in ('AKV_LT_SPS.docx', 'AK_LT_SPS.docx', 'AK_LTEN_SPS.docx', 'DPSK_LT_SALYGOS.docx',
                                       'DPSK_LTEN_PASALINIMAS.docx', 'ND_LT_SPS.docx', 'ND_LTEN_SPS.docx', 'SSD_LT_SPS.docx',
                                       'SSD_LTEN_SPS.docx', 'TSD_LT_SPS.docx', 'TSD_LTEN_SPS.docx')]
    # C. Banku saraso priedo numeris garantijos punkte (raudonas) = to paties sablono priedu saraso numeris.
    BANKAI_LT = _re.compile(r'^(\d+) priedas\s*[–-]\s*Priimtinų bankų sąrašas')
    BANKAI_EN = _re.compile(r'^Annex (\d+)\s*[–-]\s*List of eligible banks')
    for f in ('AKV_LT_SPS.docx', 'AK_LT_SPS.docx', 'AK_LTEN_SPS.docx', 'ND_LT_SPS.docx', 'ND_LTEN_SPS.docx', 'MVP_LT_SPS.docx',
              'MVP_LTEN_SPS.docx', 'SSD_LT_SPS.docx', 'SSD_LTEN_SPS.docx', 'TSD_LT_SPS.docx', 'TSD_LTEN_SPS.docx'):
        doc = zipfile.ZipFile(TPL / f).read('word/document.xml')
        lt, en = _sarasas(doc, BANKAI_LT), _sarasas(doc, BANKAI_EN)
        poros = []
        if lt: poros.append((_re.compile(r'banko, nurodyto SPS (\d+) priede'), lt, 1))
        if en: poros.append((_re.compile(r'bank specified in Annex (\d+) to the SPC'), en, 1))
        if poros: darbai.append((f, poros))
    # D. Valdymo organu formos antraste - AKV SPS priedu sarase ji yra N priedas (sablone juodu „SPS 11 priedas“)
    nv = _sarasas(zipfile.ZipFile(TPL / 'AKV_LT_SPS.docx').read('word/document.xml'),
                  _re.compile(r'^(\d+) priedas\s*[–-]\s*Informacija apie valdymo ar priežiūros organus'))
    if nv:
        darbai.append(('PRIEDAI_LT_VALDYMAS.docx', [(_re.compile(r'^\s*SPS (\d+) priedas\s*$'), nv, 1)]))
    # E. DPS konkretaus pirkimo LT/EN salygos (2026-10-04, naudotojo sprendimas): priedu saraso eilute „6 priedas – Sandorio šalies ...“
    #    angliskai „Annex 7 – Counterparty ...“ - numeris pagal to paties sarašo lietuviska eilute; antraste „ANEXXES“ -> „ANNEXES“
    #    (pridejus 7 priedą angliškai butu du „Annex 7“).
    nd = _sarasas(zipfile.ZipFile(TPL / 'DPSP_LTEN_SALYGOS.docx').read('word/document.xml'),
                  _re.compile(r'^(\d+) priedas\s*[–-]\s*Sandorio šalies'))
    dps = [(_re.compile(r'^\s*(ANEXXES)\s*$'), 'ANNEXES', 1)]
    if nd: dps.append((_re.compile(r'^Annex (\d+)\s*[–-]\s*Counterparty'), nd, 1))
    #    2026-10-05 (naudotojo prašymas): pirmoje pastraipoje prieš antraštės lentelę - pavienis žodis „Linti“ (rengimo likutis;
    #    vienkalbėse DPS konkretaus pirkimo sąlygose jo nėra). Tekstas pašalinamas, pastraipa lieka - žemėlapio numeracija nesikeičia.
    dps.append((_re.compile(r'^(Linti)$'), '', 1))
    darbai.append(('DPSP_LTEN_SALYGOS.docx', dps))
    # G. DPS LT sąlygos (2026-10-05, naudotojo prašymas „3.6 punktas“): nuorodos į sutikimų priedėlius - pagal to paties šablono
    #    priedėlių antraštes („Pirkimo sąlygų 6 priedo priedėlis Nr. 1“ - sutikimas būti subtiekėju / ūkio subjektu, „Nr. 2“ - būti
    #    įdarbintu). Šablone: 2 priedo 3.6 p. „5 priedo 2 priedėlį (Kvazisubtiekėjo sutikimą ...)“ (5 priedas - Atliktų darbų sąrašas),
    #    5.5.5 p. „(Pirkimo sąlygų 2.2 priedo 1 priedėlis)“, 5.5.6 p. „(... 2.2 priedo 1 ir 2 priedėliai)“ ir 6 priedo tekste „(užpildant Pirkimo sąlygų 2.2 priedo priedėlius)“ (2.2
    #    priedo nėra). Turinio eilutės baigiasi puslapio numeriu, todėl antraštė imama tik visa pastraipa.
    dx = zipfile.ZipFile(TPL / 'DPSK_LT_SALYGOS.docx').read('word/document.xml')
    p1 = _sarasas(dx, _re.compile(r'^Pirkimo sąlygų (\d+) priedo priedėlis Nr\.\s*1$'))
    p2 = _sarasas(dx, _re.compile(r'^Pirkimo sąlygų (\d+) priedo priedėlis Nr\.\s*2$'))
    pried = []
    if p2: pried.append((_re.compile(r'Pirkimo sąlygų (\d+(?:\.\d+)?) priedo 2 priedėlį \(Kvazisubtiekėjo sutikimą'), p2, 1))
    if p1: pried += [(_re.compile(r'\(Pirkimo sąlygų (\d+(?:\.\d+)?) priedo 1 priedėlis\)'), p1, 1),
                     (_re.compile(r'\(Pirkimo sąlygų (\d+(?:\.\d+)?) priedo 1 ir 2 priedėliai\)'), p1, 1),
                     (_re.compile(r'\(užpildant Pirkimo sąlygų (\d+(?:\.\d+)?) priedo priedėlius\)'), p1, 1)]
    if pried: darbai.append(('DPSK_LT_SALYGOS.docx', pried))
    # H. DPS LT/EN paketas (2026-10-05, naudotojo sprendimas: sutikimų priedėliai priklauso 5 priedui) - numeris pagal to paties paketo
    #    subtiekėjo sutikimo antraštę „Pirkimo sąlygų 5 priedo 1 priedėlis / Appendix 1 to Annex 5 ...“: sąlygų 5.5.5 ir 5.5.6 p. „2.2 priedo“
    #    (EN „sub-annex 2.2“) ir įdarbinimo sutikimo angliška antraštė „Appendix 2 to the Annex 6“ (lietuviškai - „5 priedo 2 priedėlis“).
    #    Lietuviškame pakete priedėliai - 6 priedo (jo paties antraštės, G).
    pe = _sarasas(zipfile.ZipFile(TPL / 'DPSK_LTEN_SUBTIEKEJAS.docx').read('word/document.xml'),
                  _re.compile(r'^Pirkimo sąlygų (\d+) priedo 1 priedėlis\s*/\s*Appendix 1 to Annex \d+'))
    if pe:
        darbai.append(('DPSK_LTEN_SALYGOS.docx', [
            (_re.compile(r'\(Pirkimo sąlygų (2\.2) priedo 1 priedėlis\)'), pe, 1),
            (_re.compile(r'\(Pirkimo sąlygų (2\.2) priedo 1 ir 2 priedėliai\)'), pe, 1),
            (_re.compile(r'\((Annex 1 of sub-annex 2\.2) of the Procurement conditions\)'), 'Appendix 1 to Annex ' + pe, 1),
            (_re.compile(r'\((Annexes 1 and 2 of sub-annex 2\.2) of the Procurement conditions\)'), 'Appendices 1 and 2 to Annex ' + pe, 1)]))
        darbai.append(('DPSK_LTEN_IDARBINTAS.docx', [
            (_re.compile(r'^Pirkimo sąlygų ' + pe + r' priedo 2 priedėlis\s*/\s*(Appendix 2 to the Annex \d+) to the Procurement Conditions'), 'Appendix 2 to Annex ' + pe, 1)]))
    # I. DPS sąlygos LT ir LT/EN (2026-10-05, naudotojo prašymas „4.1 punktas“): „ne vėliau kaip likus: 10 dienų iki pirminių paraiškų“ -
    #    dvitaškis po „likus“ (nieko neišvardija) ir kilmininkas. To paties šablono 4.3 p. ir visuose kituose LITGRID šablonuose -
    #    „ne vėliau kaip likus N dienoms“ (47 vietos); angliškai „no later than 10 days prior to“ - nekeičiama. Terminas nekeičiamas.
    likus = [(_re.compile(r'ne vėliau kaip likus(:) ?10 dienų iki pirminių'), '', 1),
             (_re.compile(r'ne vėliau kaip likus:? ?10 (dienų) iki pirminių'), 'dienoms', 1)]
    darbai += [('DPSK_LT_SALYGOS.docx', likus), ('DPSK_LTEN_SALYGOS.docx', likus)]
    # F. Ilgasis brūkšnys (U+2014) - nei LT, nei EN versijoje (naudotojo taisyklė 2026-10-04). Šablonuose - angliškas sakinys
    #    „... no supporting documents are required[U+2014]submission of the ESPD is sufficient.“ (lietuviškai - kablelis); keičiama į
    #    „ - “ su tarpais (be tarpų žodžiai susilietų). Taikoma visiems šablonams - ir būsimiems.
    ilgas = [(_re.compile(r'\s*\u2014\s*'), ' - ', 0)]
    for f in sorted(p.name for p in TPL.glob('*.docx')):
        darbai.append((f, ilgas))
    for f, poros in darbai:
        path = TPL / f
        with zipfile.ZipFile(path) as zin:
            infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}; dalys = _dokumento_dalys(zin)
        pak = 0
        for d in dalys:
            items[d], n = _redaguok(items[d], _regex_pakeitimai(*poros))
            pak += n
        if pak:
            print(f"  {f}: {pak} pakeitimai")
            if taisyk:
                with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
                    for info in infos:
                        zout.writestr(info, items[info.filename])
        viso += pak
    viso += _dvigubi_tarpai(taisyk)
    viso += _skyryba(taisyk)
    viso += _dps_61(taisyk)
    viso += _dps_71(taisyk)
    viso += _dps_72_rely(taisyk)
    viso += _vertimas_entities(taisyk)
    viso += _dps_81(taisyk)
    viso += _sankciju_kablelis(taisyk)
    viso += _fizinio_asmens_skliaustai(taisyk)
    viso += _dps_91(taisyk)
    viso += _numeris_28(taisyk)
    viso += _akv_numeracija(taisyk)
    viso += _vidine_riba(taisyk)
    viso += _uztikrinimo_sakinys(taisyk)
    viso += _spc_nuorodos(taisyk)
    viso += _tarpas_priede(taisyk)
    viso += _tarpas_antrasteje(taisyk)
    viso += _vyriausybes_sakinys(taisyk)
    viso += _preliminarioji_sutartis(taisyk)
    viso += _dps_eilute_10(taisyk)
    viso += _dps_paraiskos_forma(taisyk)
    viso += _nd_lten_11131(taisyk)
    viso += _lenteliu_numeriai(taisyk)
    viso += _priedeli(taisyk)
    viso += _nuorodos_37(taisyk)
    viso += _akv_37(taisyk)
    return viso


_RUN_RE = _re.compile(rb'<w:r(?:\s[^>]*)?>.*?</w:r>', _re.S)
_RAUD_RE = _re.compile(rb'<w:color w:val="(?:FF0000|C00000|ED1C24)"', _re.I)       # kaip variklis.js (raudonas sluoksnis)
_PABR_RE = _re.compile(rb'<w:u w:val="(?!none")')                                 # pabraukti tarpai - pildymo linija
_TURINYS_RE = _re.compile(rb'PAGEREF|w:pStyle w:val="(?:TOC|toc)', _re.S)
_VISOS_P_RE = _re.compile(rb'<w:p(?:\s[^>]*?)?(?:/>|>.*?</w:p>)', _re.S)          # ir tuscios <w:p/> - kaip zemelapio indeksai
_PRIES = set('.,;:!?)»“”"\'%')
_PO = set('(„"\'«–-')


def _tarpu_pakeitimai(tekstas, seg):
    """Dvigubi tarpai pastraipoje: tarp zodzio, skaiciaus ar skyrybos 2-3 tarpai -> vienas; 4-6 - tik tarp raidziu ar
    skaitmenu; 7 ir daugiau - isdestymas (NACSAUGUMAS „carried out by               ĮMONĖS PAVADINIMAS“). Nelieciama: raudonas tekstas (salygos ir nurodymai - pagal juos generatorius randa vietas),
    pabraukti tarpai (pildymo linija), turinys, tarpai prie „____“,
    „[   ]“, „(pareigos)    (parasas)“, tabuliacija ir NBSP."""
    if _TURINYS_RE.search(seg):
        return None
    raud, skirt = [], set()                                              # skirt - tabuliacija ar luzis pries simboli k
    for r in _RUN_RE.finditer(seg):
        red = bool(_RAUD_RE.search(r.group(0)) or _PABR_RE.search(r.group(0)))
        for m in _re.finditer(rb'<w:t(?:\s[^>]*)?>(.*?)</w:t>|<w:(?:p?tab|br|cr)(?:\s[^>]*)?/>', r.group(0), _re.S):
            if m.group(1) is None: skirt.add(len(raud))
            else: raud += [red] * len(_html.unescape(m.group(1).decode('utf-8')))
    if len(raud) != len(tekstas):
        return None                                                      # w:t ne rune - nesiimama
    pak = []
    for m in _re.finditer(r' {2,}', tekstas):
        a, b = m.start(), m.end()
        if a == 0 or b >= len(tekstas) or any(raud[a - 1:b + 1]):           # raudonas ar pabrauktas
            continue
        if any(k in skirt for k in range(a, b + 1)):                         # salia tabuliacijos ar luzio - isdestymas
            continue
        p, n = tekstas[a - 1], tekstas[b]
        if b - a <= 3:
            ok = (p.isalnum() or p in _PRIES) and (n.isalnum() or n in _PO) and not (p == ')' and n == '(')
        else:                                                           # ilgesnė eilė - tik klaida sakinio viduryje
            ok = b - a <= 6 and p.isalnum() and n.isalnum()                 # („politika    prieš“); 7+ - išdėstymas
        if ok:
            pak.append((a + 1, b, ''))
    return pak


def _dvigubi_tarpai(taisyk):
    """J. Dvigubi tarpai (2026-10-05, naudotojo prasymas: DPS salygu 4.3 p. „likus 6  dienoms“, 4.6 p. „subjektą  dėl“ ir
    leidimas tokias redakcines korekcijas daryti neklausiant). Visuose zemelapiu sablonuose; zemelapio pastraipu tekstas
    suderinamas (tos pacios reiksmes - sena -> nauja). Pakartotinai - 0."""
    import json as _json
    viso = 0
    ZEM = Path(__file__).parent / 'zemelapiai'
    zem = {}
    for zf in sorted(ZEM.glob('*.json')):
        try:
            Z = _json.loads(zf.read_text(encoding='utf-8'))
        except Exception:
            continue
        if isinstance(Z, dict) and Z.get('sablonas') and 'paras' in Z:
            zem.setdefault(Path(Z['sablonas']).stem, []).append(zf)
    tekstai = lambda xml: [_pastraipos_tekstas(m.group(0)).strip() for m in _VISOS_P_RE.finditer(xml)]
    for f in sorted(zem):
        path = TPL / (f + '.docx')
        with zipfile.ZipFile(path) as zin:
            infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}; dalys = _dokumento_dalys(zin)
        pries = tekstai(items['word/document.xml'])
        pak = 0
        for d in dalys:
            items[d], n = _redaguok(items[d], _tarpu_pakeitimai)
            pak += n
        if not pak:
            continue
        po = tekstai(items['word/document.xml'])
        poros = {a: b for a, b in zip(pries, po) if a != b} if len(pries) == len(po) else {}
        print(f"  {f}.docx: dvigubi tarpai - {pak}" + ("" if len(pries) == len(po) else "  (PASTRAIPU SKAICIUS PASIKEITE - zemelapis nederinamas)"))
        if taisyk:
            with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for info in infos:
                    zout.writestr(info, items[info.filename])
            for zf in zem[f]:
                tekstas0 = zf.read_text(encoding='utf-8'); Z = _json.loads(tekstas0); k = [0]
                def keisk(v):
                    if isinstance(v, str):
                        if v in poros: k[0] += 1; return poros[v]
                        return v
                    if isinstance(v, list): return [keisk(x) for x in v]
                    if isinstance(v, dict): return {a: keisk(b) for a, b in v.items()}
                    return v
                Z = keisk(Z)
                if k[0]:
                    zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if tekstas0.endswith('\n') else ''), encoding='utf-8')
                    print(f"      {zf.name}: suderinta {k[0]} reiksmiu")
        viso += pak
    return viso


_SKYRYBA = [
    # „kuris pagal sudarytą pasiūlymų eilę, pateikė“ - kablelis skiria tarinį nuo aplinkybės (intarpo nėra); 62 vietos
    (_re.compile(r'pasiūlymų eilę(,) pateikė'), '', 1),
    # „ūkio subjektas, kurio pajėgumais remiamasi privalo“ - šalutinis sakinys neuždarytas kableliu; 9 vietos (TPS formoje - ir trys tarpai)
    (_re.compile(r'kurio pajėgumais remiamasi( +)privalo'), ', ', 1),
    # „t. y., bent vieną“ - po „t. y.“ kablelis nerašomas (tik prieš šalutinį sakinį ar intarpą - AK BPS „t. y., ar nėra“
    # paliekama); 10 vietų
    (_re.compile(r't\. y\.(,) bent vieną'), '', 1),
    # „ir / arba“ - kaip kitur tuose pačiuose šablonuose (191 pastraipa) „ir (arba)“; tiekėjo formų „(ir/arba)“ - kitas darinys, nelieciama
    (_re.compile(r'derinimo priemonių ir (/ arba) bent'), '(arba)', 1),
]


def _skyryba(taisyk):
    """K. Skyryba (2026-10-06, naudotojo prasymas „DPS salygu 5.1 punktas“ ir sprendimas taisyti visuose sablonuose):
    socialiniu reikalavimu punktas (DPS konkretaus pirkimo 5.1 p., SPS) ir sakinys „... bus prašoma pateikti tik iš Tiekėjo,
    kuris pagal sudarytą pasiūlymų eilę pateikė ...“. Raudonas tekstas nelieciamas (siu vietu raudonose nera). Zemelapiu
    pastraipu tekstas suderinamas kaip J. Pakartotinai - 0."""
    return _su_zemelapiais(_SKYRYBA, None, 'skyryba', taisyk)


# L. DPS konkretaus pirkimo LT salygos (2026-10-06, naudotojo prasymas „DPS sąlygų 6.1 punktas“): 6.1 p. sakinys nutruksta -
#    „Konkretų pasiūlymą sudaro Tiekėjo CVP IS priemonėmis pateiktų dokumentų visuma “ (be pabaigos ir tasko). Saltinis - to paties
#    paketo dvikalbis DPSP_LTEN_SALYGOS 6.1 p.: „... dokumentų visuma (įskaitant konkretaus pasiūlymo paaiškinimus (jei tokių bus)).“
_DPS_61 = [(_re.compile(r'Konkretų pasiūlymą sudaro Tiekėjo CVP IS priemonėmis pateiktų dokumentų visuma( *)$'),
            ' (įskaitant konkretaus pasiūlymo paaiškinimus (jei tokių bus)).', 1)]


def _dps_61(taisyk):
    return _su_zemelapiais(_DPS_61, ['DPSP_LT_SALYGOS'], 'DPS 6.1 p.', taisyk)


# M. DPS sukūrimo sąlygų 7.1 p. (2026-10-06, naudotojo prasymas „DPS sąlygų 7.1 punktas“; konkretaus pirkimo sąlygų 7.1 p. klaidų neturi):
#    „neįtraukiamas DPS“ - be prielinksnio (įtraukti į ką); „CPV IS“ - rašybos klaida (tame pačiame šablone „CVP IS“ - 28 kartus; CPV - BVPŽ
#    kodų žodynas); LT šablone ranka įrašyti „7.1.2“ ir „7.1.3“ - be taško (kiti punktai - „7.1.1.“, „7.1.4.“); tarpai sakinio gale;
#    angliškai „on whose capacity the supplier relies on“ - du prielinksniai. Turinys, nuorodos ir terminai nekeičiami.
_DPS_71 = [
    (_re.compile(r'tiekėjas neįtraukiamas( )DPS, kai:'), ' į ', 1),
    (_re.compile(r'[Pp]araišką pateikė ne (CPV) IS priemonėmis'), 'CVP', 1),
    (_re.compile(r'^\s*7\.1\.[23]()\s+tiekėjas'), '.', 1),
    (_re.compile(r'nustatytos 7\.2 punkte;( +)$'), '', 1),
    (_re.compile(r'nepaaiškino prašomos informacijos;( +)$'), '', 1),
    (_re.compile(r'on whose capacity the supplier relies( on) does not meet'), '', 1),
]


def _dps_71(taisyk):
    return _su_zemelapiais(_DPS_71, ['DPSK_LT_SALYGOS', 'DPSK_LTEN_SALYGOS'], 'DPS 7.1 p.', taisyk)


# N. Tas pats 7 skyrius ir angliski sablonai (2026-10-06, naudotojo atsakymas „Taip, prašau sutvarkyti ir tai.“):
#    DPS sukūrimo LT sąlygų ranka įrašytas „7.2“ - be taško; EN 7.2.1.2 p. „... committed by them, if applicable“ - be kabliataškio
#    (kiti papunkčiai baigiasi „;“); ir dvigubas prielinksnis „on whose / on which ... relies on“ (taip pat „rely on“, „does not rely
#    on“, „intends to rely on“) 20-yje angliškų šablonų - antras „on“ šalinamas. Raudonas tekstas paprastai nelieciamas (kaip J), isskyrus
#    DPS sukūrimo LT/EN 8.4 p. - visa raudona NEPRIVALOMA nuostata (paliekama - tampa juoda, tad klaida patektu i dokumenta; zemelapio
#    tekstas suderinamas). „on whose entities“ (vertimo klaida - turinys) nekeičiama.
_DPS_72 = [
    (_re.compile(r'^\s*7\.2()\s+Jeigu tiekėjas neatitinka reikalavimų'), '.', 1),
    (_re.compile(r'investigate and clarify the criminal act or violation committed by them, if applicable()$'), ';', 1),
    (_re.compile(r'on whose capacities the supplier intends to rely( on) meet the grounds for exclusion specified in Annex 1'), '', 1),
]
_RELY_ON_RE = _re.compile(r'\bon (?:whose|which)\b[^.;,()]{0,60}?\brel(?:y|ies)( on)\b', _re.I)
_RELY_RAUDONI = []


def _rely_on(tekstas, seg):
    if not _RELY_ON_RE.search(tekstas):
        return None
    raud = []
    for r in _RUN_RE.finditer(seg):
        red = bool(_RAUD_RE.search(r.group(0)))
        for m in _re.finditer(rb'<w:t(?:\s[^>]*)?>(.*?)</w:t>', r.group(0), _re.S):
            raud += [red] * len(_html.unescape(m.group(1).decode('utf-8')))
    if len(raud) != len(tekstas):
        return None
    pak = []
    for m in _RELY_ON_RE.finditer(tekstas):
        a, b = m.span(1)
        if any(raud[a:b]):
            _RELY_RAUDONI.append(tekstas[max(0, a - 50):b + 20])
            continue
        pak.append((a, b, ''))
    return pak


# O. Vertimo klaida (2026-10-06, naudotojo patvirtinimas „Patvirtinu, ištaisykite.“): dvikalbių BPS (AK, MVP, ND, SSD, TSD) sakinyje apie
#    priesaikos ar oficialią deklaraciją „the economic entities on whose entities the Supplier relies“ - LT „Ūkio subjektai, kurių pajėgumais
#    remiamasi“, todėl „on whose capacities“ (kaip kitur tuose pačiuose šablonuose). Raudonas tekstas nelieciamas.
_ENTITIES_RE = _re.compile(r'economic entities on whose (entities) the Supplier relies', _re.I)
_ENTITIES_RAUDONI = []


def _entities(tekstas, seg):
    if not _ENTITIES_RE.search(tekstas):
        return None
    raud = []
    for r in _RUN_RE.finditer(seg):
        red = bool(_RAUD_RE.search(r.group(0)))
        for m in _re.finditer(rb'<w:t(?:\s[^>]*)?>(.*?)</w:t>', r.group(0), _re.S):
            raud += [red] * len(_html.unescape(m.group(1).decode('utf-8')))
    if len(raud) != len(tekstas):
        return None
    pak = []
    for m in _ENTITIES_RE.finditer(tekstas):
        a, b = m.span(1)
        if any(raud[a:b]):
            _ENTITIES_RAUDONI.append(tekstas[max(0, a - 50):b + 30])
            continue
        pak.append((a, b, 'capacities'))
    return pak


def _vertimas_entities(taisyk):
    n = _su_zemelapiais(_entities, None, 'EN „on whose capacities“', taisyk)
    for t in _ENTITIES_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# P. DPS konkretaus pirkimo sąlygų 8.1 p. (2026-10-06, naudotojo prasymas „DPS sąlygų 8.1 punktas“; DPS sukūrimo sąlygų 8.1 p. klaidų
#    neturi; teisės nuorodos - PĮ 58 str. 1 ir 5 d., 29 str. 2 d. 2 p. ir 4 d., Nacionaliniam saugumui užtikrinti svarbių objektų apsaugos
#    įstatymo 13 str. 4 d. 1 p., SESV 107 str. 1 d. - perskaitytos e-tar ir teisingos, nekeičiamos):
#    8.1.4 - „dokumentų, patvirtinančių ... nustatytų reikalavimų“ -> „patvirtinančių atitiktį ... nustatytiems reikalavimams“ (raudona nuoroda
#    „4.1 punkto 1 lentelėje“ nelieciama); 8.1.7 - skliaustuose „(jeigu Tiekėjas, ..., ar Kvazisubtiekėjas yra fizinis asmuo - ...)“, kaip
#    įstatyme (PĮ 29 str. 5 d.) ir to paties šablono 8.2.3 p.; 8.1.14 - kablelis tarp veiksnio ir tarinio - žr. Q; 8.1.15 ir 8.1.16 - „Vyriausybei
#    priėmė“ -> „Vyriausybė priėmė“ (kaip PĮ 58 str. 4¹ d. 4 p.); 8.1.18 - kablelis po šalutinio sakinio - žr. Q; 8.1.22 - „Yra“ -> „yra“ (kaip kiti papunkčiai ir dvikalbis); tarpai sakinio gale. EN: 8.1.7 - sąraše trūko „Supplier“,
#    8.1.8 - „abnormally low“ (LT „neįprastai mažos kainos“), 8.1.14 - „The“ -> „the“ (kaip kiti papunkčiai). Raudonas tekstas nelieciamas.
_DPS_81 = [
    (_re.compile(r'nepatikslino dokumentų, patvirtinančių() konkretaus pirkimo sąlygų'), ' atitiktį', 1),
    (_re.compile(r'lentelėje (nustatytų reikalavimų) per Komisijos nustatytą terminą'), 'nustatytiems reikalavimams', 1),
    (_re.compile(r'nėra registruotas \((Tiekėjas, Subtiekėjas, Tiekėjų grupės narys, Ūkio subjektas, kurio pajėgumais remiamasi, '
                 r'Kvazisubtiekėjas, kuris yra) fizinis asmuo'),
     'jeigu Tiekėjas, Subtiekėjas, Tiekėjų grupės narys, Ūkio subjektas, kurio pajėgumais remiamasi, ar Kvazisubtiekėjas yra', 1),
    (_re.compile(r'Lietuvos Respublikos (Vyriausybei) priėmė sprendimą'), 'Vyriausybė', 1),
    (_re.compile(r'^\s*(?:8\.1\.22\.\s*)?(Yra) kitų Pirkimo sąlygose ar PĮ numatytų konkretaus pasiūlymo atmetimo'), 'yra', 1),
    (_re.compile(r'Konkretus pasiūlymas atmetamas, jeigu:( +)$'), '', 1),
    (_re.compile(r'per Komisijos nustatytą terminą;( +)$'), '', 1),
    (_re.compile(r'kuris nustatytas EBVPD;( +)$'), '', 1),
    (_re.compile(r'negalėjo iššifruoti visų konkretaus pasiūlymo dokumentų;( +)$'), '', 1),
    (_re.compile(r'CVP IS elektroninėmis priemonėmis;( +)$'), '', 1),
    (_re.compile(r'kaip tai numatyta PĮ 58 straipsnio 5 dalyje;( +)$'), '', 1),
    (_re.compile(r'\(if the() sub-supplier, group member, economic operator, or quasi-subcontractor is a natural person'), ' Supplier,', 1),
    (_re.compile(r'fails to provide appropriate justification of the offered() price or costs'), ' abnormally low', 1),
    (_re.compile(r'^(The) Supplier who submitted a tender, upon request of the Contracting Entity'), 'the', 1),
]
_P_RAUDONI = []


def _be_raudono(poros, kaupti):
    """_regex_pakeitimai, bet raudono teksto (salygos ir nurodymai - pagal juos generatorius randa vietas) nelieciant."""
    fn = _regex_pakeitimai(*poros)
    def f(tekstas, seg):
        pak = fn(tekstas, seg)
        if not pak:
            return pak
        raud = []
        for r in _RUN_RE.finditer(seg):
            red = bool(_RAUD_RE.search(r.group(0)))
            for m in _re.finditer(rb'<w:t(?:\s[^>]*)?>(.*?)</w:t>', r.group(0), _re.S):
                raud += [red] * len(_html.unescape(m.group(1).decode('utf-8')))
        if len(raud) != len(tekstas):
            return None
        geri = []
        for a, b, v in pak:
            sritis = raud[a:b] if b > a else raud[max(0, a - 1):a + 1]
            if any(sritis):
                kaupti.append(tekstas[max(0, a - 40):b + 40]); continue
            geri.append((a, b, v))
        return geri
    return f


# Q. Sankcijų sakinys (2026-10-06, rastas tvarkant DPS 8.1.18 p.; redakcinė korekcija - naudotojo leidimas 2026-10-05): „... kitų tarptautinių
#    organizacijų, kurių narė yra arba kuriose dalyvauja Lietuvos Respublika[,] bei Jungtinių Amerikos Valstijų sankcijos“ - įterptas šalutinis
#    sakinys neuždarytas kableliu, todėl galima perskaityti, kad „dalyvauja Lietuvos Respublika bei JAV“ (EN - „... or the United States of
#    America“). 31 vieta: BPS atmetimo pagrindas, SPS ir DPS sąlygų „Pirkime negali dalyvauti ...“, sena TPS forma. Ir „Pasiūlymą pateikęs
#    Tiekėjas[,] Perkančiojo subjekto ir/ar kompetentingų institucijų prašymu nepateikė“ - kablelis tarp veiksnio ir tarinio (DPS 8.1.14 p. ir
#    BPS nacionalinio saugumo atmetimo pagrindas). Raudonas tekstas nelieciamas.
_SANKCIJOS = [(_re.compile(r'kurių narė yra arba kuriose dalyvauja Lietuvos Respublika() bei Jungtinių Amerikos Valstijų'), ',', 1),
              (_re.compile(r'Pasiūlymą pateikęs Tiekėjas(,) Perkančiojo subjekto ir/ar kompetentingų institucijų prašymu'), '', 1)]
_Q_RAUDONI = []


def _sankciju_kablelis(taisyk):
    n = _su_zemelapiais(_be_raudono(_SANKCIJOS, _Q_RAUDONI), None, 'skyryba (sankcijos, veiksnys)', taisyk)
    for t in _Q_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# T. Fizinio asmens skliaustai (2026-10-06, naudotojo patvirtinimas „Patvirtinu, sutvarkykite visur vienodai.“): „nėra registruotas
#    (Tiekėjas, ..., Kvazisubtiekėjas, kuris yra fizinis asmuo – nuolat gyvenantis ar turintis pilietybę)“ - „kuris“ gramatiškai siejasi tik su
#    paskutiniu sąrašo nariu, o 23 vietose dar ir „turintys“; vienodai, kaip DPS 8.1.7 p. (P), įstatyme (PĮ 29 str. 5 d.) ir DPS 8.2.3 p.:
#    „(jeigu Tiekėjas, ..., ar Kvazisubtiekėjas yra fizinis asmuo – nuolat gyvenantis ar turintis pilietybę)“; sąrašo eilė ir raidžių dydis -
#    kaip šablone, prieš „ar“ kablelis tik po šalutinio sakinio „kurio pajėgumais remiamasi“. 42 vietos 36 šablonuose (BPS, SPS, DPS sąlygos,
#    pasiūlymo ir paraiškos formos, sena TPS forma); angliškas tekstas nekeičiamas. Raudonas tekstas nelieciamas.
def _fizinis_asmuo(m):
    sar = m.group(1)
    return 'jeigu ' + sar + (', ar' if sar.endswith('remiamasi') else ' ar') + ' Kvazisubtiekėjas yra fizinis asmuo – nuolat gyvenantis ar turintis pilietybę'


_FIZINIS = [(_re.compile(r'\(([^()]*?, Kvazisubtiekėjas, kuris yra fizinis asmuo,? – nuolat gyvenantis ar turint[iy]s pilietybę)\)'),
             lambda m: _fizinis_asmuo(_re.match(r'(.*?), Kvazisubtiekėjas, kuris yra', m.group(1))), 1)]
_T_RAUDONI = []


def _fizinio_asmens_skliaustai(taisyk):
    n = _su_zemelapiais(_be_raudono(_FIZINIS, _T_RAUDONI), None, 'fizinio asmens skliaustai', taisyk)
    for t in _T_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# U. DPS sukūrimo sąlygų 9.1 p. (2026-10-06, naudotojo prašymas „DPS sąlygų 9.1 punktas“; konkretaus pirkimo sąlygų 9.1 p. klaidų neturi):
#    „ūkio subjektams, kurių pajėgumais tiekėjai remiasi[,] ir, kai taikoma, subtiekėjams“ - šalutinis sakinys neuždarytas kableliu;
#    2 priedo pavadinimas - kaip pačiame priede, turinyje ir priedų sąraše („... ir reikalaujami aplinkos apsaugos vadybos sistemų standartai“;
#    9.1 p. buvo pridėta „kokybės bei“, EN - „Quality and“); EN tekste praleisti kokybės vadybos sistemos reikalavimai ir „ir (arba)“ (LT -
#    „kvalifikacijos reikalavimai ir (arba) reikalavimai dėl kokybės vadybos sistemos ir (arba) aplinkos apsaugos vadybos sistemos standartų
#    laikymosi“). Ir 9.4 p. (naudotojo patvirtinimas „Patvirtinu, suvienodinkite ir 9.4 punktą.“; šablone ranka „9.5.“ - numerį sutvarko GPNum):
#    „2 priede „Tiekėjų kvalifikacijos reikalavimai ir reikalavimai laikytis ... standartų““ - taip pat priedo pavadinimu. Raudonas tekstas nelieciamas.
_DPS_91 = [
    (_re.compile(r'2 priede „Tiekėjų kvalifikacijos reikalavimai ir (reikalavimai laikytis aplinkos apsaugos vadybos sistemų standartų)“'),
     'reikalaujami aplinkos apsaugos vadybos sistemų standartai', 1),
    (_re.compile(r'ūkio subjektams, kurių pajėgumais tiekėjai remiasi() ir, kai taikoma, subtiekėjams'), ',', 1),
    (_re.compile(r'2 priede „Tiekėjų kvalifikacijos reikalavimai ir reikalaujami (kokybės bei )aplinkos apsaugos vadybos sistemų standartai“'), '', 1),
    (_re.compile(r'Annex 2 of these conditions, "Qualification Requirements and Required (Quality and )Environmental Management System Standards"'), '', 1),
    (_re.compile(r'^(Qualification requirements and required environmental management system standards) for suppliers, Economic entities on whose'),
     'Qualification requirements and/or requirements regarding compliance with quality management system and/or environmental management '
     'system standards', 1),
]
_U_RAUDONI = []


def _dps_91(taisyk):
    n = _su_zemelapiais(_be_raudono(_DPS_91, _U_RAUDONI), ['DPSK_LT_SALYGOS', 'DPSK_LTEN_SALYGOS'], 'DPS 9.1 p.', taisyk)
    for t in _U_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


def _dps_81(taisyk):
    n = _su_zemelapiais(_be_raudono(_DPS_81, _P_RAUDONI), ['DPSP_LT_SALYGOS', 'DPSP_LTEN_SALYGOS'], 'DPS 8.1 p.', taisyk)
    for t in _P_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


def _dps_72_rely(taisyk):
    n = _su_zemelapiais(_DPS_72, ['DPSK_LT_SALYGOS', 'DPSK_LTEN_SALYGOS'], 'DPS 7.2 p.', taisyk)
    n += _su_zemelapiais(_rely_on, None, 'EN „relies on“', taisyk)
    for t in _RELY_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


def _su_zemelapiais(poros, failai, vardas, taisyk):
    """Teksto pakeitimai sablonuose (failai - stem sarasas, None - visi) ir to paties teksto suderinimas zemelapiuose
    (sena -> nauja reiksme), kaip J. poros - _regex_pakeitimai poros arba pati funkcija fn(tekstas, segmentas).
    Grazina pakeitimu skaiciu."""
    import json as _json
    viso = 0
    ZEM = Path(__file__).parent / 'zemelapiai'
    zem = {}
    for zf in sorted(ZEM.glob('*.json')):
        try:
            Z = _json.loads(zf.read_text(encoding='utf-8'))
        except Exception:
            continue
        if isinstance(Z, dict) and Z.get('sablonas') and 'paras' in Z:
            zem.setdefault(Path(Z['sablonas']).stem, []).append(zf)
    tekstai = lambda xml: [_pastraipos_tekstas(m.group(0)).strip() for m in _VISOS_P_RE.finditer(xml)]
    for path in sorted(TPL.glob('*.docx')):
        f = path.stem
        if failai is not None and f not in failai:
            continue
        with zipfile.ZipFile(path) as zin:
            infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}; dalys = _dokumento_dalys(zin)
        pries = tekstai(items['word/document.xml'])
        pak = 0
        for d in dalys:
            items[d], n = _redaguok(items[d], poros if callable(poros) else _regex_pakeitimai(*poros))
            pak += n
        if not pak:
            continue
        po = tekstai(items['word/document.xml'])
        pakeisti = {a: b for a, b in zip(pries, po) if a != b} if len(pries) == len(po) else {}
        print(f"  {f}.docx: {vardas} - {pak}" + ("" if len(pries) == len(po) else "  (PASTRAIPU SKAICIUS PASIKEITE - zemelapis nederinamas)"))
        if taisyk:
            with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for info in infos:
                    zout.writestr(info, items[info.filename])
            for zf in zem.get(f, []):
                tekstas0 = zf.read_text(encoding='utf-8'); Z = _json.loads(tekstas0); k = [0]
                def keisk(v):
                    if isinstance(v, str):
                        if v in pakeisti: k[0] += 1; return pakeisti[v]
                        return v
                    if isinstance(v, list): return [keisk(x) for x in v]
                    if isinstance(v, dict): return {a: keisk(b) for a, b in v.items()}
                    return v
                Z = keisk(Z)
                if k[0]:
                    zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if tekstas0.endswith('\n') else ''), encoding='utf-8')
                    print(f"      {zf.name}: suderinta {k[0]} reiksmiu")
        viso += pak
    return viso


# V. Vidinė grupės taisyklė šablonų komentaruose (2026-10-11, naudotojo sprendimas: iždo politikos užtikrinimo riba - vidinė informacija,
#    iš viešų šablonų šalinama). SPS ir DPS konkretaus pirkimo sąlygų šablonų Word komentare prie „Kai taikomas sutarties užtikrinimas:“
#    („Vadovaujantis UAB „EPSO-G“ įmonių grupės iždo ir finansinių rizikų politika, Sutarties įvykdymo užtikrinimas privalo būti taikomas
#    pirkimuose, kurių vertė viršija <riba> ...“) riba pakeičiama žodžiais „vidaus taisyklėse nustatytą ribą“ - kaip rangos SS „//“
#    nurodyme (sutarciu-sablonai.py). Tas pats tekstas - žemėlapių `komentaruTaisykles` (modulis jį rodo 2 žingsnio paaiškinime „Šablono
#    autorių pastaba“). Pati riba šiame scenarijuje neįrašyta - taisyklė bendra (skaičius su „tūkstančių eurų“ pastaboje apie užtikrinimą).
_VIDINE_RIBA = _re.compile(r'viršija \d[\d \u00a0]*(?:tūkstanči\w+|tūkst\.|mln\.)\s+eurų')
_VIDINE_RIBA_NAUJA = 'viršija vidaus taisyklėse nustatytą ribą'


# W. Sutarties įvykdymo užtikrinimo sakinys (2026-10-16, rasta tvarkant naudotojo pastebėjimą dėl SPS „Sutarties projekto X punkte/priede“;
#    redakcinė korekcija - naudotojo leidimas 2026-10-05): „Laimėjęs Tiekėjas pateikia Sutarties užtikrinimo įvykdymo užtikrinimą“ - žodis
#    „užtikrinimo“ perteklinis (to paties sakinio AK ir MVP LT SPS: „pateikia Sutarties įvykdymo užtikrinimą“) - ND, SSD, TSD SPS (LT ir LT/EN),
#    MVP ir AK LT/EN SPS, sena TPS forma; AK LT/EN SPS dar „Reikalavimai Sutarties įvykdymo užtikrinimui, nurodyti“ - be kablelio, kaip LT SPS.
#    Angliškas tekstas nekeičiamas, raudonas - nelieciamas. Šis sakinys - 2 žingsnio laukas (užtikrinimo dydis), jo raktas - pastraipos tekstas,
#    todėl ankstesnio juodraščio atsakymas perkeliamas į naują raktą (PP-SALYGOS.html RAKTU_PERVADINIMAI).
_UZTIKRINIMO_SAKINYS = [(_re.compile(r'pateikia Sutarties (užtikrinimo )įvykdymo užtikrinimą'), '', 1),
                        (_re.compile(r'Reikalavimai Sutarties įvykdymo užtikrinimui(,) nurodyti'), '', 1)]
_W_RAUDONI = []


def _uztikrinimo_sakinys(taisyk):
    print("\nSUTARTIES ĮVYKDYMO UŽTIKRINIMO SAKINYS (W, 2026-10-16):")
    n = _su_zemelapiais(_be_raudono(_UZTIKRINIMO_SAKINYS, _W_RAUDONI), None, 'užtikrinimo sakinys', taisyk)
    for t in _W_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# Y. Tarpas prieš „priede“ (2026-10-20, rado PP-salygos D3 testai; redakcinė korekcija - naudotojo leidimas 2026-10-05): AK LT SPS 8.1 p.
#    „... metodika pateikiama SPS ___priede.“ - po pildomos vietos nėra tarpo, todėl sugeneruotame SPS „SPS 10priede.“ (kitų SPS šablonų sakinys
#    „SPS priede Nr.__.“ - tvarkingas). Įterpiamas tarpas; pildoma vieta „___“ ir raudonas tekstas nekeičiami.
_TARPAS_PRIEDE = [(_re.compile(r'metodika pateikiama SPS ___()priede'), ' ', 1)]
_Y_RAUDONI = []


def _tarpas_priede(taisyk):
    print("\nTARPAS PRIEŠ „PRIEDE“ (Y, 2026-10-20):")
    n = _su_zemelapiais(_be_raudono(_TARPAS_PRIEDE, _Y_RAUDONI), None, 'tarpas prieš „priede“', taisyk)
    for t in _Y_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# Z. Tarpas formos antraštėje (2026-10-20, rado naujo darbuotojo patikra; redakcinė korekcija - naudotojo leidimas 2026-10-05): DPS konkretaus
#    pirkimo LT pasiūlymo formos antraštė „Konkretaus pirkimo sąlygų1 priedas „Pasiūlymo forma““ - be tarpo prieš numerį (DPS sąlygų priedų
#    sąraše - „1 priedas – Pasiūlymo forma;“, numeris teisingas). Įterpiamas tarpas; numeris ir raudonas tekstas nekeičiami.
_TARPAS_ANTRASTEJE = [(_re.compile(r'Konkretaus pirkimo sąlygų()1 priedas „Pasiūlymo forma“'), ' ', 1)]
_Z_RAUDONI = []


def _tarpas_antrasteje(taisyk):
    print("\nTARPAS FORMOS ANTRAŠTĖJE (Z, 2026-10-20):")
    n = _su_zemelapiais(_be_raudono(_TARPAS_ANTRASTEJE, _Z_RAUDONI), None, 'tarpas formos antraštėje', taisyk)
    for t in _Z_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# AA. Angliškas SPS lentelės sakinys priešingos prasmės (2026-10-21, rado naujo darbuotojo patikra; naudotojo sprendimas „Prašau ištaisyti anglišką
#    sakinį pagal lietuvišką ir įtraukti tai į laišką LITGRID“): dvikalbių SPS ir DPS konkretaus pirkimo sąlygų lentelėje apie nacionalinio saugumo
#    deklaraciją lietuviškai - Vyriausybė „nėra priėmusi sprendimo, patvirtinančio, kad šios lentelės 1 ir 2 punktuose nurodyti subjektai ar su jais
#    ketinamas sudaryti (sudarytas) sandoris neatitinka nacionalinio saugumo interesų“, o angliškai - „has adopted a decision confirming that the
#    entities specified in Clauses 1 and / or 2 of this table do not meet national security interests“ (priešinga prasmė ir be sandorio). Angliškas
#    sakinys verčiamas pagal lietuvišką; sakinio pabaiga (kabliataškis ar taškas) ir raudonas tekstas nekeičiami. AK, MVP, ND, SSD, TSD LT/EN SPS,
#    DPS konkretaus pirkimo LT/EN sąlygos ir sena TPS forma. BPS ir formų sakiniai „has adopted a decision confirming that ... do not meet“ yra
#    atmetimo pagrindai („priėmė sprendimą“) - teisingi, nekeičiami.
_VYRIAUSYBES_SAKINYS = [(_re.compile(r'(has adopted a decision confirming that the entities specified in Clauses 1 and / or 2\s+of this table) do not meet national security interests'),
                         'has not adopted a decision confirming that the entities specified in Clauses 1 and 2 of this table, or the transaction intended '
                         'to be concluded (concluded) with them,', 1)]
_AA_RAUDONI = []


def _vyriausybes_sakinys(taisyk):
    print("\nANGLIŠKAS VYRIAUSYBĖS SPRENDIMO SAKINYS (AA, 2026-10-21):")
    n = _su_zemelapiais(_be_raudono(_VYRIAUSYBES_SAKINYS, _AA_RAUDONI), None, 'EN „has not adopted a decision“', taisyk)
    for t in _AA_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# AB. „Preliminarioji sutartis“ angliškai (2026-10-21, rado trečioji naujo darbuotojo patikra; naudotojo sprendimas „Pataisykite.“): dvikalbių SPS
#    (AK, SSD, TSD) 1 skyriaus sakinys „Pirkimas vykdomas siekiant sudaryti Preliminariąją sutartį.“ angliškai - „... for the purpose of concluding
#    a Draft Contract.“, o „Draft Contract“ tame pačiame pakete reiškia sutarties projektą. To paties paketo BPS sąvoką „Preliminarioji sutartis“
#    verčia „Preliminary Contract“ (1 skyrius ir 9.29 / 11.28 / 14.29 p.), todėl angliškas sakinys - BPS apibrėžta sąvoka. Raudonas tekstas nekeičiamas.
_PRELIMINARIOJI = [(_re.compile(r'for the purpose of concluding a (Draft Contract)\.'), 'Preliminary Contract', 1)]
_AB_RAUDONI = []


def _preliminarioji_sutartis(taisyk):
    print("\n„PRELIMINARIOJI SUTARTIS“ ANGLIŠKAI (AB, 2026-10-21):")
    n = _su_zemelapiais(_be_raudono(_PRELIMINARIOJI, _AB_RAUDONI), None, 'EN „Preliminary Contract“', taisyk)
    for t in _AB_RAUDONI:
        print("      raudonas tekstas - nelieciama: ..." + t)
    return n


# AC. DPS konkretaus pirkimo LT/EN sąlygų nacionalinio saugumo reikalavimų lentelė (2026-10-21, rasta modeliuojant BVPŽ punktą - naudotojo sprendimas
#    „Taip, prašau įtraukti“; redakcinė korekcija - naudotojo leidimas 2026-10-05): eilutės numeruotos tekstu 1-9, o paskutinė - „11.“ (praleistas
#    „10.“; LT šablone eilutės numeruoja Word, ten 10). Nuorodų į šios lentelės 10 ar 11 punktą šablone nėra. Keičiamas tik tos eilutės numeris
#    (pirmas langelis, po kurio - „Ekonomiškai naudingiausią pasiūlymą pateikęs Tiekėjas/ Tiekėjų grupės nariai privalo užpildyti ...“); kiti „11.“
#    (skyriaus numeris) nekeičiami; žemėlapio tekstas - pagal tą patį pastraipos indeksą.
def _dps_eilute_10(taisyk):
    import json as _json
    print("\nDPS LT/EN NACIONALINIO SAUGUMO LENTELĖS EILUTĖ „11.“ -> „10.“ (AC, 2026-10-21):")
    f = 'DPSP_LTEN_SALYGOS'
    path = TPL / (f + '.docx')
    with zipfile.ZipFile(path) as zin:
        infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}
    xml = items['word/document.xml']
    segs = list(_VISOS_P_RE.finditer(xml))
    T = [_pastraipos_tekstas(m.group(0)).strip() for m in segs]
    kur = [k for k, x in enumerate(T) if x == '11.' and next((y for y in T[k + 1:k + 4] if y), '').startswith('Ekonomiškai naudingiausią pasiūlymą pateikęs Tiekėjas/ Tiekėjų grupės nariai privalo užpil')]
    if not kur:
        return 0
    k = kur[0]; m = segs[k]
    s0 = _pastraipos_tekstas(m.group(0)).index('11')
    seg2 = _keisk_pastraipa(m.group(0), [(s0, s0 + 2, '10')])
    print(f"  {f}.docx: pastraipa {k} „11.“ -> „10.“")
    if taisyk:
        items['word/document.xml'] = xml[:m.start()] + seg2 + xml[m.end():]
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for info in infos:
                zout.writestr(info, items[info.filename])
        zf = Path(__file__).parent / 'zemelapiai' / (f + '.json')
        raw = zf.read_text(encoding='utf-8'); Z = _json.loads(raw)
        if str(Z['paras'].get(str(k), '')).strip() == '11.':
            Z['paras'][str(k)] = Z['paras'][str(k)].replace('11', '10', 1)
            zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if raw.endswith('\n') else ''), encoding='utf-8')
            print(f"      {zf.name}: pastraipa {k} suderinta")
    return 1


# AD. DPS sukūrimo paraiškos forma (2026-10-23, rado ketvirtoji naujo darbuotojo patikra T4-D1; redakcinė korekcija - naudotojo leidimas 2026-10-05,
#    nuoroda į priedėlius - kaip to paties šablono nuorodos, ištaisytos 2026-10-05 naudotojo prašymu): DPS LT sąlygų 4 priedo ir LT/EN paraiškos formos
#    pateikiamų dokumentų lentelės eilutės numeruotos tekstu 1, 2, 3, 4, 6, 7 (praleistas 5) - po 4 eilutės „6.“ -> „5.“, „7.“ -> „6.“; 4 eilutės tekstas
#    prasideda neuždarytu skliaustu „(Užpildyti sutikimai ...“ (ir EN „(Completed consents ...“) - skliaustas pašalinamas; LT sąlygose sutikimų
#    priedėliai - 6 priedo („Pirkimo sąlygų 6 priedo priedėlis Nr. 1 / Nr. 2“), todėl „5 priedo 1-2 priedėliai“ -> „6 priedo 1-2 priedėliai“ (LT/EN
#    pakete jie - 5 priedo, naudotojo sprendimas 2026-10-05, nekeičiama). Nuorodų į šios lentelės eilučių numerius šablonuose nėra; raudonas tekstas
#    nekeičiamas; pakartotinai - 0.
_PARAISKOS_FORMA = {'DPSK_LT_SALYGOS': True, 'DPSK_LTEN_PARAISKA': False}      # True - ir priedėlių priedo numeris


def _dps_paraiskos_forma(taisyk):
    import json as _json
    print("\nDPS SUKŪRIMO PARAIŠKOS FORMOS EILUTĖS (AD, 2026-10-23):")
    viso = 0
    for f, priedelis in _PARAISKOS_FORMA.items():
        path = TPL / (f + '.docx')
        with zipfile.ZipFile(path) as zin:
            infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}
        xml = items['word/document.xml']
        segs = list(_VISOS_P_RE.finditer(xml))
        T = [_pastraipos_tekstas(m.group(0)) for m in segs]
        k4 = next((k for k, t in enumerate(T) if t.startswith('(Užpildyti sutikimai būti')), None)
        if k4 is None or _RAUD_RE.search(segs[k4].group(0)):
            continue
        kei = {k4: [(0, 1, '')]}
        m5 = _re.search(r'5 priedo 1-2 priedėliai', T[k4])
        if priedelis and m5:
            kei[k4].append((m5.start(), m5.start() + 1, '6'))
        ken = next((k for k in range(k4 + 1, min(k4 + 3, len(T))) if T[k].startswith('(Completed consents')), None)
        if ken is not None and not _RAUD_RE.search(segs[ken].group(0)):
            kei[ken] = [(0, 1, '')]
        nr = [k for k in range(k4 + 1, min(k4 + 20, len(T))) if _re.fullmatch(r'\d\.', T[k].strip())]
        if [T[k].strip() for k in nr[:2]] == ['6.', '7.']:
            for k, naujas in zip(nr[:2], ['5', '6']):
                s0 = T[k].index(T[k].strip()[0]); kei[k] = [(s0, s0 + 1, naujas)]
        nauji = {k: _keisk_pastraipa(segs[k].group(0), v) for k, v in kei.items()}
        for k in sorted(kei):
            print(f"  {f}.docx: pastraipa {k} „{T[k].strip()[:60]}“ -> „{_pastraipos_tekstas(nauji[k]).strip()[:60]}“")
        viso += len(kei)
        if not taisyk:
            continue
        for k in sorted(kei, reverse=True):
            m = segs[k]; xml = xml[:m.start()] + nauji[k] + xml[m.end():]
        items['word/document.xml'] = xml
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for info in infos:
                zout.writestr(info, items[info.filename])
        # tekstas - pagal reikšmę (sakiniai unikalūs), eilučių numeriai („6.“) - tik pagal pastraipos indeksą (kitaip pakistų ir kiti „6.“)
        pak, nrK = {}, [k for k in kei if _re.fullmatch(r'\d\.', T[k].strip())]
        for k in kei:
            if k in nrK:
                continue
            a, b = T[k], _pastraipos_tekstas(nauji[k]); pak[a] = b; pak[a.strip()] = b.strip()
        for zf in sorted((Path(__file__).parent / 'zemelapiai').glob('*.json')):
            raw = zf.read_text(encoding='utf-8')
            try:
                Z = _json.loads(raw)
            except Exception:
                continue
            if not isinstance(Z, dict) or Path(str(Z.get('sablonas', ''))).stem != f:
                continue
            n = [0]
            def keisk(v):
                if isinstance(v, str):
                    if v in pak: n[0] += 1; return pak[v]
                    return v
                if isinstance(v, list): return [keisk(x) for x in v]
                if isinstance(v, dict): return {a: keisk(b) for a, b in v.items()}
                return v
            Z = keisk(Z)
            for k in nrK:
                v = Z.get('paras', {}).get(str(k))
                if isinstance(v, str) and v.strip() == T[k].strip():
                    Z['paras'][str(k)] = _pastraipos_tekstas(nauji[k]) if v == T[k] else _pastraipos_tekstas(nauji[k]).strip(); n[0] += 1
            if n[0]:
                zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if raw.endswith('\n') else ''), encoding='utf-8')
                print(f"      {zf.name}: suderinta {n[0]} reiksmiu")
    return viso


# AE. ND LT/EN BPS eilutė „11.13.1.“ (2026-10-23, rado D2 numeracijos auditas - naudotojo užduotis „Prašau sutvarkyti ... numeracija ...
#    patikrinti, ar teisinga“): po „11.13. Jeigu Tiekėjas neatitinka ... kai yra abi šios sąlygos kartu:“ iškart eina „11.13.1.1.“ - trūksta
#    „11.13.1. Tiekėjas pateikė Perkančiajam subjektui informaciją apie tai, kad ėmėsi šių priemonių:“, nors 11.13.2 p. nurodo „BPS 11.13.1
#    punktą“, o ND LT BPS ši eilutė yra. Įterpiama to paties šablono 9.7.1 eilutės kopija (tas pats sakinys LT ir EN, kaip ND LT BPS 11.13.1 p.)
#    su numeriu „11.13.1.“; „11.13.2“ -> „11.13.2.“ (kaip kiti numeriai). Žemėlapio pastraipų indeksai po įterpimo - pastumiami; pakartotinai - 0.
_TR_RE = _re.compile(rb'<w:tr[ >](?:(?!<w:tr[ >]).)*?</w:tr>', _re.S)
_TC_RE = _re.compile(rb'<w:tc[ >].*?</w:tc>', _re.S)


def _nd_lten_11131(taisyk):
    import json as _json
    print("\nND LT/EN BPS EILUTĖ „11.13.1.“ (AE, 2026-10-23):")
    f = 'ND_LTEN_BPS'
    path = TPL / (f + '.docx')
    with zipfile.ZipFile(path) as zin:
        infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}
    xml = items['word/document.xml']
    rows = list(_TR_RE.finditer(xml))
    L = [[_pastraipos_tekstas(c).strip() for c in _TC_RE.findall(r.group(0))] for r in rows]
    if any(x and x[0] == '11.13.1.' for x in L):
        return 0
    k97 = next((k for k, x in enumerate(L) if x[:2] == ['9.7.1.', 'Tiekėjas pateikė Perkančiajam subjektui informaciją apie tai, kad ėmėsi šių priemonių:']), None)
    k = next((k for k, x in enumerate(L) if x and x[0] == '11.13.1.1.'), None)
    if k97 is None or k is None or not (L[k - 1] and L[k - 1][0] == '11.13.'):
        print("  ND_LTEN_BPS.docx: eilučių nerasta - nekeičiama")
        return 0
    seg = _re.sub(rb'\sw14:(?:paraId|textId)="[^"]*"', b'', rows[k97].group(0))
    p0 = _P_RE.search(seg)
    t0 = _pastraipos_tekstas(p0.group(0)); s0 = t0.index('9.7.1')
    nauja = seg[:p0.start()] + _keisk_pastraipa(p0.group(0), [(s0, s0 + len('9.7.1'), '11.13.1')]) + seg[p0.end():]
    if _RAUD_RE.search(nauja):
        print("  ND_LTEN_BPS.docx: 9.7.1 eilutėje raudonas tekstas - nekeičiama")
        return 0
    # „11.13.2“ be taško
    k2 = next((j for j, x in enumerate(L) if x and x[0] == '11.13.2'), None)
    ins = len(_VISOS_P_RE.findall(xml[:rows[k].start()]))
    nauji = [_pastraipos_tekstas(m.group(0)).strip() for m in _VISOS_P_RE.finditer(nauja)]
    print(f"  {f}.docx: prieš „11.13.1.1.“ įterpta eilutė „11.13.1. {L[k97][1][:50]}...“ ({len(nauji)} pastraipos nuo {ins})")
    pak = 1
    if k2 is not None:
        r2 = rows[k2]; p2 = _P_RE.search(r2.group(0)); t2 = _pastraipos_tekstas(p2.group(0)); j2 = t2.index('11.13.2') + len('11.13.2')
        seg2 = r2.group(0)[:p2.start()] + _keisk_pastraipa(p2.group(0), [(j2, j2, '.')]) + r2.group(0)[p2.end():]
        k2p = len(_VISOS_P_RE.findall(xml[:r2.start()]))
        print(f"  {f}.docx: „11.13.2“ -> „11.13.2.“")
        pak += 1
    if not taisyk:
        return pak
    out = xml
    if k2 is not None:
        out = out[:r2.start()] + seg2 + out[r2.end():]
    out = out[:rows[k].start()] + nauja + out[rows[k].start():]
    items['word/document.xml'] = out
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in infos:
            zout.writestr(info, items[info.filename])
    zf = Path(__file__).parent / 'zemelapiai' / (f + '.json')
    raw = zf.read_text(encoding='utf-8'); Z = _json.loads(raw)
    for kk in ('blokai', 'vienetai', 'raudonosPastabos', 'intarpai'):
        if Z.get(kk):
            raise SystemExit(f"{zf.name}: {kk} netuščias - indeksų pastūmimas neįgyvendintas")
    P = Z['paras']; n = len(nauji); NP = {}
    for a, v in P.items():
        a = int(a)
        if k2 is not None and a == k2p:
            v = v + '.' if v == '11.13.2' else v
        NP[str(a + n if a >= ins else a)] = v
    for j, v in enumerate(nauji):
        NP[str(ins + j)] = v
    Z['paras'] = {str(a): NP[str(a)] for a in sorted(map(int, NP))}
    for e in Z.get('tuscios', []):
        if e.get('i', -1) >= ins:
            e['i'] += n
    zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if raw.endswith('\n') else ''), encoding='utf-8')
    print(f"      {zf.name}: pastraipų indeksai nuo {ins} pastumti +{n}, įrašytos naujos pastraipos")
    return pak


# AF. Lentelių numeriai (2026-10-23, D2 numeracijos auditas; redakcinės korekcijos - naudotojo leidimas 2026-10-05 ir užduotis patikrinti numeraciją):
#    1) SSD LT SPS - antra antraštė „4 lentelė“ (kitų reikalavimų lentelė, 6.1 p. „... nurodyti 5 lentelėje“) -> „5 lentelė“ (kaip kituose SPS);
#       antraštė raudona - generatorius ją palieka ar trina kartu su lentele (SEKIMO), tekstas ten ne raktas;
#    2) DPS konkretaus pirkimo LT pasiūlymo forma: lentelės 1, 2, 3, 5 (praleistas 4; LT/EN formoje - 4) - „5 lentelė“ ir „6.2. Mums žinoma, kad
#       5 lentelėje ...“ -> 4;
#    3) DPS sukūrimo LT/EN sąlygų 2 priedas (KVALIFIKACIJA): lentelės 1 ir 3 (praleista 2; LT sąlygų 2 priede - 1 ir 2), o 4.2 p. nurodo
#       „SPS 3 lentelės“ - DPS pakete SPS nėra: „3 lentelė/Table 3“ -> „2 lentelė/Table 2“, „nurodyti 3 lentelėje“ / „specified in Table 3“ -> 2,
#       „pagal SPS 3 lentelės reikalavimą“ -> „pagal šio priedo 2 lentelės reikalavimą“ (kaip LT sąlygų 2 priedo 7 p. „Šio priedo 2 lentelėje“),
#       „set out in SPC Table 3“ -> „set out in Table 2 of this Annex“. Raudonas tekstas keičiamas tik šiais žodžiais (spalva lieka), žemėlapiuose -
#       pastraipų tekstai ir raudonos dalys. Pakartotinai - 0.
_LENT_NR = {
    'SSD_LT_SPS': [(_re.compile(r'^(4) lentelė$'), '5', 1, lambda T, k: next((t for t in reversed(T[max(0, k - 4):k]) if t), '').startswith('6.1. Pirkime taikomi kiti reikalavimai, nurodyti 5 lentelėje'))],
    'DPSP_LT_PASIULYMAS': [(_re.compile(r'^(5) lentelė$'), '4', 1, None), (_re.compile(r'^6\.2\. Mums žinoma, kad (5) lentelėje nurodyta'), '4', 1, None)],
    'DPSK_LTEN_KVALIFIKACIJA': [(_re.compile(r'^(3 lentelė/Table 3)$'), '2 lentelė/Table 2', 1, None),
                                (_re.compile(r'žalieji reikalavimai, nurodyti (3) lentelėje'), '2', 1, None),
                                (_re.compile(r'environmental requirements specified in Table (3)\.'), '2', 1, None),
                                (_re.compile(r'Žaliuosius reikalavimus pagal (SPS 3) lentelės reikalavimą'), 'šio priedo 2', 1, None),
                                (_re.compile(r'according to the requirement set out in (SPC Table 3) (?:shall|must)'), 'Table 2 of this Annex', 1, None)],
}
_LENT_NR_RAUDONI = {'DPSK_LTEN_KVALIFIKACIJA': [('3 lentelė/Table 3', '2 lentelė/Table 2'), ('3 lentelėje', '2 lentelėje'), ('Table 3', 'Table 2'),
                                                ('pagal SPS 3 lentelės', 'pagal šio priedo 2 lentelės'), ('SPC Table 3', 'Table 2 of this Annex')]}


def _zemelapio_raudoni(f, poros):
    """Žemėlapio raudonų dalių (intarpai[].raudonas) tekstas - tie patys žodžiai kaip šablone (pastraipų tekstus suderina _su_zemelapiais)."""
    import json as _json
    for zf in sorted((Path(__file__).parent / 'zemelapiai').glob('*.json')):
        raw = zf.read_text(encoding='utf-8')
        try:
            Z = _json.loads(raw)
        except Exception:
            continue
        if not isinstance(Z, dict) or Path(str(Z.get('sablonas', ''))).stem != f:
            continue
        n = 0
        for e in Z.get('intarpai', []):
            r = e.get('raudonas')
            if not isinstance(r, str):
                continue
            r2 = r
            for a, b in poros:
                r2 = r2.replace(a, b)
            if r2 != r:
                e['raudonas'] = r2; n += 1
        if n:
            zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if raw.endswith('\n') else ''), encoding='utf-8')
            print(f"      {zf.name}: raudonų dalių suderinta {n}")


def _lenteliu_numeriai(taisyk):
    import json as _json
    print("\nLENTELIŲ NUMERIAI (AF, 2026-10-23):")
    viso = 0
    for f, taisykles in _LENT_NR.items():
        path = TPL / (f + '.docx')
        with zipfile.ZipFile(path) as zin:
            T = [_pastraipos_tekstas(m.group(0)).strip() for m in _VISOS_P_RE.finditer(zin.read('word/document.xml'))]
        # leidžiama - kelintas to paties teksto pasikartojimas (SSD: tik antra „4 lentelė“; fn indekso negauna)
        leisti, matyta = {}, {}
        for j, (rx, naujas, g, salyga) in enumerate(taisykles):
            leisti[j] = {(t, sum(1 for x in T[:k] if x == t)) for k, t in enumerate(T) if rx.search(t) and (salyga is None or salyga(T, k))}
        def fn(tekstas, seg, taisykles=taisykles, leisti=leisti, matyta=matyta):
            t = tekstas.strip()
            kelintas = matyta.get(t, 0); matyta[t] = kelintas + 1
            pak = []
            for j, (rx, naujas, g, salyga) in enumerate(taisykles):
                m = rx.search(t)
                if not m or (t, kelintas) not in leisti[j]:
                    continue
                o = len(tekstas) - len(tekstas.lstrip())
                s, e = m.span(g)
                pak.append((s + o, e + o, naujas))
            return pak
        # žemėlapis derinamas pagal pastraipos indeksą (ne pagal tekstą - SSD abi antraštės „4 lentelė“ vienodos)
        with zipfile.ZipFile(path) as zin:
            infos = zin.infolist(); items = {nm: zin.read(nm) for nm in zin.namelist()}
        items['word/document.xml'], n = _redaguok(items['word/document.xml'], fn)
        if not n:
            continue
        T2 = [_pastraipos_tekstas(m.group(0)).strip() for m in _VISOS_P_RE.finditer(items['word/document.xml'])]
        kur = [k for k in range(min(len(T), len(T2))) if T[k] != T2[k]]
        print(f"  {f}.docx: lentelės numeris - {n} (pastraipos {', '.join(map(str, kur))})")
        viso += n
        if not taisyk or len(T) != len(T2):
            continue
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for info in infos:
                zout.writestr(info, items[info.filename])
        for zf in sorted((Path(__file__).parent / 'zemelapiai').glob('*.json')):
            raw = zf.read_text(encoding='utf-8')
            try:
                Z = _json.loads(raw)
            except Exception:
                continue
            if not isinstance(Z, dict) or Path(str(Z.get('sablonas', ''))).stem != f:
                continue
            c = 0
            for k in kur:
                if Z['paras'].get(str(k)) == T[k]:
                    Z['paras'][str(k)] = T2[k]; c += 1
            for v in Z.values():
                for e in (v if isinstance(v, list) else []):
                    if isinstance(e, dict) and e.get('i') in kur and e.get('text') == T[e['i']]:
                        e['text'] = T2[e['i']]; c += 1
            zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if raw.endswith('\n') else ''), encoding='utf-8')
            print(f"      {zf.name}: suderinta {c} reiksmiu")
        if f in _LENT_NR_RAUDONI:
            _zemelapio_raudoni(f, _LENT_NR_RAUDONI[f])
    return viso


# AG. „priedelį“ -> „priedėlį“ (2026-10-23, D2 numeracijos auditas; rašybos klaida, naudotojo leidimas 2026-10-05): bendrų ūkio subjektų priedų
#    (LT ir LT/EN) pastaboje „... užpildant Pirkimo sąlygų N priedo 1 priedelį ir 2 priedelį.“ (dalis raudona - tik raidė keičiama, spalva lieka).
_PRIEDELI = [(_re.compile(r'pried(e)lį'), 'ė', 1)]


def _priedeli(taisyk):
    print("\n„PRIEDELĮ“ -> „PRIEDĖLĮ“ (AG, 2026-10-23):")
    n = _su_zemelapiais(_regex_pakeitimai(*_PRIEDELI), ['PRIEDAI_LT_SUBTIEKEJAI', 'PRIEDAI_LTEN_SUBTIEKEJAI'], '„priedėlį“', taisyk)
    if n and taisyk:
        for f in ('PRIEDAI_LT_SUBTIEKEJAI', 'PRIEDAI_LTEN_SUBTIEKEJAI'):
            _zemelapio_raudoni(f, [('priedelį', 'priedėlį')])
    return n


# AH. Nuorodos 3.7 punkte ir BPS 11.9.4 punkte (2026-10-23, rado penktoji naujo darbuotojo patikra T5-K3, T5-V1; nuorodų taisymas - kaip X,
#    naujo darbuotojo užduotis patikrinti numeraciją): TSD LT ir LT/EN SPS 3.7 p. „(jeigu Tiekėjas SPS 5 priede nebus nurodęs ...“ / „as indicated
#    in Annex 5 of the SPC“ - TSD priedų sąraše 5 yra Sutarties projektas, ūkio subjektų informacija - 6 (to paties punkto „SPS 6 priedo 2
#    priedėlį“); SSD LT BPS 11.9.4 p. „BPS 14.9.1 ir/ar 14.9.2 punktuose“ - SSD bendrųjų sąlygų skyrius 11 (11.9.5 p. ir SSD LT/EN BPS -
#    „11.9.1 ir/ar 11.9.2“). Pakartotinai - 0.
_NUORODOS_37 = {
    'TSD_LT_SPS': [(_re.compile(r'SPS (5) priede nebus nurodęs'), '6', 1)],
    'TSD_LTEN_SPS': [(_re.compile(r'SPS (5) priede nebus nurodęs'), '6', 1), (_re.compile(r'as indicated in Annex (5) of the SPC'), '6', 1)],
    'SSD_LT_BPS': [(_re.compile(r'patvirtinantį, kad BPS (14)\.9\.1 ir/ar (?:14)\.9\.2 punktuose'), '11', 1),
                   (_re.compile(r'patvirtinantį, kad BPS (?:11|14)\.9\.1 ir/ar (14)\.9\.2 punktuose'), '11', 1)],
}


def _nuorodos_37(taisyk):
    print("\nNUORODOS 3.7 P. IR BPS 11.9.4 P. (AH, 2026-10-23):")
    return sum(_su_zemelapiais(_regex_pakeitimai(*poros), [f], 'nuoroda', taisyk) for f, poros in _NUORODOS_37.items())


# AH (tęsinys). AKV LT SPS 3.7 p. (T5-K4): visa pastraipa raudona (nurodymas rengėjui), o geltonai pažymėtos koreguotinos vietos - kito pirkimo
#    reikšmės („SPS 2 lentelės 2, 3, 4 ir 6 punktų“, „SPS 4 priede“ - AKV sąraše 4 yra Sutarties projektas, „SPS 1 lentelės 1 ir/ar 2 punktui“ -
#    1 lentelė yra pašalinimo pagrindai); palikus punktą jos tapdavo juodu galutiniu tekstu. Pastraipa - kaip AK LT SPS 3.7 p. (tas pats LITGRID
#    šablono sakinys): juodas tekstas, raudonos pildomos vietos „X“, „SPS 5 priede“ (AKV sąraše 5 - ūkio subjektų informacija), „SPS 2 lentelės“;
#    pastraipos savybės, komentaras ir runų savybės (be spalvos ir žymėjimo) - AKV. Žemėlapyje - pildomų vietų pastraipa (intarpai), ne nurodymas.
def _akv_37(taisyk):
    import json as _json
    print("\nAKV LT SPS 3.7 P. (AH, 2026-10-23):")
    f = 'AKV_LT_SPS'
    path = TPL / (f + '.docx')
    with zipfile.ZipFile(path) as zin:
        infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}
    xml = items['word/document.xml']
    segs = list(_VISOS_P_RE.finditer(xml))
    T = [_pastraipos_tekstas(m.group(0)) for m in segs]
    k = next((j for j, t in enumerate(T) if t.startswith('3.7.') and 'SPS 2 lentelės 2, 3, 4 ir 6 punktų' in t and 'SPS 4 priede nebus nurodęs' in t), None)
    if k is None:
        return 0
    seg = segs[k].group(0)
    pp = _re.search(rb'<w:pPr>.*?</w:pPr>', seg, _re.S).group(0)
    rpr = _re.search(rb'<w:r(?:\s[^>]*)?>\s*(<w:rPr>.*?</w:rPr>)', seg[len(pp):], _re.S).group(1)
    juod = _re.sub(rb'<w:color [^>]*/>|<w:highlight [^>]*/>', b'', rpr)
    raud = juod.replace(b'</w:rPr>', b'<w:color w:val="FF0000"/></w:rPr>')
    ra = lambda t, r: b'<w:r>' + r + b'<w:t xml:space="preserve">' + _esc(t).encode('utf-8') + b'</w:t></w:r>'
    cs = _re.search(rb'<w:commentRangeStart [^>]*/>', seg).group(0); ce = _re.search(rb'<w:commentRangeEnd [^>]*/>', seg).group(0)
    cr = _re.search(rb'<w:r(?:\s[^>]*)?>(?:(?!</w:r>).)*<w:commentReference [^>]*/>\s*</w:r>', seg, _re.S).group(0)
    D = [('3.7. ', 0), ('Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais turi pateikti įrodymus '
          '(išrašus iš darbo sutarčių ar pan., kuriuose matytųsi vardas, pavardė, sutarties data), jog SPS 2 lentelės ', 0), ('X, X, X ', 1), ('ir ', 0), ('X', 1),
         (' punktų reikalavimams pagrįsti siūlomi specialistai yra Tiekėjo/Tiekėjų grupės nario arba Ūkio subjekto, kurio pajėgumais remiamasi grindžiant '
          'atitiktį Kvalifikacijos reikalavimams, darbuotojai (jeigu Tiekėjas SPS 5 priede nebus nurodęs, kad SPS 2 lentelės ', 0), ('X', 1), (' ir/ar ', 0),
         ('X', 1), (' ir/ar ', 0), ('X', 1), (' ir/ar ', 0), ('X', 1), (' punktui pagrįsti pasitelkia Kvazisubtiekėjus).', 0)]
    pradzia = _re.match(rb'<w:p(?:\s[^>]*)?>', seg).group(0)
    kunas = ra(*D[0][:1], juod) + cs + b''.join(ra(t, raud if r else juod) for t, r in D[1:]) + ce + cr
    nauja = pradzia + pp + kunas + b'</w:p>'
    naujas_t = _pastraipos_tekstas(nauja)
    print(f"  {f}.docx: pastraipa {k} -> „{naujas_t[:90]}...“")
    if not taisyk:
        return 1
    m = segs[k]
    items['word/document.xml'] = xml[:m.start()] + nauja + xml[m.end():]
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in infos:
            zout.writestr(info, items[info.filename])
    zf = Path(__file__).parent / 'zemelapiai' / (f + '.json')
    raw = zf.read_text(encoding='utf-8'); Z = _json.loads(raw)
    Z['paras'][str(k)] = naujas_t.strip()
    Z['raudonosPastabos'] = [e for e in Z.get('raudonosPastabos', []) if e.get('i') != k]
    Z['intarpai'] = sorted([e for e in Z.get('intarpai', []) if e.get('i') != k] + [{'i': k, 'text': naujas_t.strip(), 'raudonas': 'X, X, X XXXXX'}], key=lambda e: e['i'])
    zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if raw.endswith('\n') else ''), encoding='utf-8')
    print(f"      {zf.name}: pastraipa {k} - pildomų vietų (intarpai), ne nurodymas")
    return 1


# X. Nuorodos į SPS priedus (2026-10-19, naudotojo „Taip, ištaisykite šablonų nuorodas“; rado sugeneruoto paketo patikra): tekstas nurodo ne
#    tą priedo numerį, kuris yra to paties SPS priedų sąraše. Kvazisubtiekėjo sutikimas būti įdarbintu ir ūkio subjektų deklaracijų priedėliai -
#    priedo „Informacija apie ūkio subjektus, kurių pajėgumais remiamasi, subtiekėjus ir kvazisubtiekėjus“ („SPS 6 priedo 2 priedėlį
#    (Kvazisubtiekėjo sutikimą ...)“, „pagal SPS 6 priedo formoje esančius priedėlius“, EN „Appendix 2 to Annex 6 to the SPC (the consent of the
#    Quasi...“, „according to the appendixes attached to Annex 6 to the SPC“), forma „Konfidenciali informacija“ - savo eilutės numeriu („SPS 6 priedą
#    „Konfidenciali informacija““). Numeris - pagal to paties šablono priedų sąrašą (LT ir EN eilutės atskirai); „X“ / „x“ vietos (pildo
#    generatorius) ir teisingi numeriai nekeičiami; raudonas tekstas (sąlygų sluoksnis) keičiamas tik numeriu, žemėlapių tekstas ir raudoni
#    fragmentai suderinami. Bendrų priedų antraštės (tas pats failas kelioms šeimoms) - generuojant, pagal paketo SPS sąrašą (PP-SALYGOS.html).
_X_SAR = {'sub': _re.compile(r'^(\d+) priedas\s*[–-]\s*Informacija apie ūkio subjektus', _re.I),
          'konf': _re.compile(r'^(\d+) priedas\s*[–-]\s*Konfidenciali informacija', _re.I),
          'subEN': _re.compile(r'^Annex (\d+)\s*[–-]\s*Information about the economic entit', _re.I)}
_X_NUORODOS = [('sub', r'SPS (\d+) priedo 2 priedėlį \(Kvazisubtiekėjo sutikimą'), ('sub', r'pagal SPS (\d+) priedo formoje esančius priedėlius'),
               ('konf', r'SPS (\d+) priedą „Konfidenciali informacija“'),
               ('subEN', r'Appendix 2 to Annex (\d+) to the SPC \(the consent of the Quasi'), ('subEN', r'according to the appendixes attached to Annex (\d+) to the SPC')]


def _spc_nuorodos(taisyk):
    import json as _json
    print("\nNUORODOS Į SPS PRIEDUS (X, 2026-10-19):")
    viso = 0
    ZEM = Path(__file__).parent / 'zemelapiai'
    for path in sorted(TPL.glob('*_SPS.docx')):
        dx = zipfile.ZipFile(path).read('word/document.xml')
        nr = {k: _sarasas(dx, rx) for k, rx in _X_SAR.items()}
        poros = [(_re.compile(r), nr[k], 1) for k, r in _X_NUORODOS if nr[k]]
        if not poros:
            continue
        viso += _su_zemelapiais(poros, [path.stem], 'nuorodos į priedus', taisyk)
        # žemėlapių raudoni fragmentai (intarpų „raudonas“ - tik nuorodos atkarpa, pvz. „SPS 6 priedo 2 priedėlį“): numeris - kaip jau
        # suderintame tos pačios pastraipos tekste (tik pastraipose su šiomis nuorodomis)
        if not taisyk:
            continue
        visos = [_re.compile(r) for _, r in _X_NUORODOS]
        for zf in sorted(ZEM.glob('*.json')):
            try:
                tekstas0 = zf.read_text(encoding='utf-8'); Z = _json.loads(tekstas0)
            except Exception:
                continue
            if not (isinstance(Z, dict) and Path(str(Z.get('sablonas', ''))).stem == path.stem):
                continue
            k = 0
            for x in Z.get('intarpai', []):
                raud, tx = x.get('raudonas'), x.get('text', '')
                if not (isinstance(raud, str) and _re.search(r'\d', raud) and any(rx.search(tx) for rx in visos)):
                    continue
                m = _re.compile(_re.sub(r'\d+', lambda _: r'\d+', _re.escape(raud))).search(tx)
                if m and m.group(0) != raud:
                    x['raudonas'] = m.group(0); k += 1
            if k:
                zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if tekstas0.endswith('\n') else ''), encoding='utf-8')
                print(f"      {zf.name}: raudoni fragmentai suderinti {k}")
    return viso


def _vidine_riba(taisyk):
    import json as _json
    print("\nVIDINĖ GRUPĖS TAISYKLĖ KOMENTARUOSE (V, 2026-10-11):")
    viso = 0

    def fn(tekstas, seg):
        if 'žtikrinim' not in tekstas:
            return None
        return [(m.start(), m.end(), _VIDINE_RIBA_NAUJA) for m in _VIDINE_RIBA.finditer(tekstas)]
    for path in sorted(TPL.glob('*.docx')):
        with zipfile.ZipFile(path) as zin:
            infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}
        if 'word/comments.xml' not in items:
            continue
        items['word/comments.xml'], n = _redaguok(items['word/comments.xml'], fn)
        if n:
            print(f"  {path.name}: komentaruose - {n}")
            if taisyk:
                with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
                    for info in infos:
                        zout.writestr(info, items[info.filename])
        viso += n
    for zf in sorted((Path(__file__).parent / 'zemelapiai').glob('*.json')):
        tekstas0 = zf.read_text(encoding='utf-8')
        try:
            Z = _json.loads(tekstas0)
        except Exception:
            continue
        if not isinstance(Z, dict) or not Z.get('komentaruTaisykles'):
            continue
        k = 0
        for kom in Z['komentaruTaisykles']:
            t = kom.get('text') or ''
            if 'žtikrinim' in t and _VIDINE_RIBA.search(t):
                kom['text'], n = _VIDINE_RIBA.subn(_VIDINE_RIBA_NAUJA, t); k += n
        if k:
            print(f"  zemelapiai/{zf.name}: komentaruTaisykles - {k}")
            if taisyk:
                zf.write_text(_json.dumps(Z, ensure_ascii=False, indent=1) + ('\n' if tekstas0.endswith('\n') else ''), encoding='utf-8')
        viso += k
    return viso


def _akv_numeracija(taisyk):
    """AKV SPS numeracija, kaip AK (PĮ) SPS (2026-10-03). AKV skyriu antrastes (Heading 1) sunumeruotos KITU Word sarasu
    nei punktai, tad:
    a) 3 sk. pirmoji alternatyva („Tiekėjų kvalifikacija nėra tikrinama ...“) buvo 2 skyriaus punktu sarase - numeris
       tesdavo 2 skyriu (2.11). Kitos dvi alternatyvos ranka „3.1.“ - pirmoji gauna ta pati „3.1.“ ir ju pPr;
    b) 10 sk. punktu sarasas prasidejo 7 (7.1-7.3), nors alternatyvos ranka „10.1.“ - saraso 0 lygio pradzia = 10
       (AK sablone tas pats sarasas prasideda 10). Keiciama tik jei sarasa naudoja vien sie trys punktai."""
    f = 'AKV_LT_SPS.docx'; path = TPL / f
    with zipfile.ZipFile(path) as zin:
        infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}
    xml, num = items['word/document.xml'], items['word/numbering.xml']
    segs = [(m, _pastraipos_tekstas(m.group(0)).strip()) for m in _P_RE.finditer(xml)]
    n = 0
    # a) 3 sk. pirmoji alternatyva
    i1 = next((k for k, (m, t) in enumerate(segs) if t.startswith('Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime')
               and b'<w:numPr>' in m.group(0)), None)
    i2 = next((k for k, (m, t) in enumerate(segs) if k > (i1 or 0) and t.startswith('3.1. Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami')), None)
    if i1 is not None and i2 is not None:
        seg = segs[i1][0].group(0)
        ppr = _re.search(rb'<w:pPr>.*?</w:pPr>', segs[i2][0].group(0), _re.S).group(0)
        seg2 = _keisk_pastraipa(seg, [(0, 0, '3.1. ')])
        seg2 = _re.sub(rb'<w:pPr>.*?</w:pPr>', lambda x: ppr, seg2, count=1, flags=_re.S)
        m = segs[i1][0]
        xml = xml[:m.start()] + seg2 + xml[m.end():]
        n += 1
        print(f"  {f}: 3 sk. pirmoji alternatyva -> „3.1.“ kaip kitos dvi (buvo 2 skyriaus sarase)")
    # b) 10 sk. punktu saraso pradzia
    nums = dict(_re.findall(rb'<w:num w:numId="(\d+)"[^>]*>\s*<w:abstractNumId w:val="(\d+)"/>', num))
    def abstr(seg):
        mm = _re.search(rb'<w:numId w:val="(\d+)"/>', seg)
        return nums.get(mm.group(1)) if mm else None
    p10 = next((m.group(0) for m, t in segs if t.startswith('Jei Tiekėjas, kurio Pasiūlymas pagal vertinimo rezultatus') and b'<w:numPr>' in m.group(0)), None)
    lit = next((t for m, t in segs if _re.match(r'^(\d+)\.1\. Jei Tiekėjas, kurio pasiūlymas pagal vertinimo rezultatus', t, _re.I)), None)
    a = abstr(p10) if p10 else None
    if a and lit:
        tikslas = lit.split('.')[0].encode()
        naudoja = [t for m, t in _P_RE_tekstai(xml) if abstr(m) == a]
        zinomi = _re.compile(r'^(Jei Tiekėjas, kurio Pasiūlymas pagal vertinimo|(Perkantysis subjektas|Pirkimo vykdytojas) informuos Koordinavimo|'
                             r'Pirkime numatoma, kad (Perkantysis subjektas|Pirkimo vykdytojas) informuos)')
        if all(zinomi.match(t) for t in naudoja):
            blokas = _re.search(rb'<w:abstractNum [^>]*w:abstractNumId="' + a + rb'".*?</w:abstractNum>', num, _re.S)
            lvl0 = _re.search(rb'<w:lvl w:ilvl="0"[^>]*>.*?</w:lvl>', blokas.group(0), _re.S)
            st = _re.search(rb'<w:start w:val="(\d+)"/>', lvl0.group(0))
            if st and st.group(1) != tikslas:
                lvl0n = lvl0.group(0)[:st.start()] + b'<w:start w:val="' + tikslas + b'"/>' + lvl0.group(0)[st.end():]
                bl = blokas.group(0)[:lvl0.start()] + lvl0n + blokas.group(0)[lvl0.end():]
                num = num[:blokas.start()] + bl + num[blokas.end():]
                n += 1
                print(f"  {f}: 10 sk. punktu sarasas prasideda {tikslas.decode()} (buvo {st.group(1).decode()})")
        else:
            print(f"  {f}: 10 sk. sarasa naudoja ir kiti punktai - nekeista: {naudoja}")
    if n and taisyk:
        items['word/document.xml'], items['word/numbering.xml'] = xml, num
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for info in infos:
                zout.writestr(info, items[info.filename])
    return n


def _P_RE_tekstai(xml):
    return [(m.group(0), _pastraipos_tekstas(m.group(0)).strip()) for m in _P_RE.finditer(xml)]


def _numeris_28(taisyk):
    """AK_LT_SPS ir AKV_LT_SPS 2 skyriuje punktas „Jeigu ... gaus klausimų dėl Pirkimo dokumentų ...“ numeruotas
    RANKA („2.8.“), o pries ji 10 punktu - automatiskai: istrynus alternatyvas jis neatitikdavo eiles. Kituose SPS
    (ND, MVP, SSD, TSD) tas pats punktas numeruojamas automatiskai - perimama ankstesnio punkto numeracija (pPr)."""
    RX = _re.compile(r'^2\.8\.\s*(?=Jeigu (Perkantysis subjektas|Pirkimo vykdytojas) gaus klausimų dėl Pirkimo dokumentų)')
    viso = 0
    for f in ('AK_LT_SPS.docx', 'AKV_LT_SPS.docx'):
        path = TPL / f
        with zipfile.ZipFile(path) as zin:
            infos = zin.infolist(); items = {n: zin.read(n) for n in zin.namelist()}
        xml = items['word/document.xml']
        out, poz, ppr, n = [], 0, None, 0
        for m in _P_RE.finditer(xml):
            seg = m.group(0)
            t = _pastraipos_tekstas(seg)
            mm = RX.match(t)
            if mm and ppr is not None:
                seg2 = _keisk_pastraipa(seg, [(0, mm.end(), '')])
                senas = _re.search(rb'<w:pPr>.*?</w:pPr>', seg2, _re.S)
                seg2 = (seg2[:senas.start()] + ppr + seg2[senas.end():]) if senas else \
                    _re.sub(rb'^(<w:p(?:\s[^>]*)?>)', lambda x: x.group(1) + ppr, seg2, count=1)
                out.append(xml[poz:m.start()]); out.append(seg2); poz = m.end(); n += 1
                print(f"  {f}: „2.8.“ -> automatine numeracija (kaip ankstesnis punktas: „{ppr_t[:45]}...“)")
            elif _re.search(rb'<w:numPr><w:ilvl w:val="1"/><w:numId w:val="\d+"/></w:numPr>', seg) and \
                    _re.search(rb'<w:pPr>.*?</w:pPr>', seg, _re.S):
                ppr = _re.search(rb'<w:pPr>.*?</w:pPr>', seg, _re.S).group(0)
                ppr_t = t
        out.append(xml[poz:])
        if n and taisyk:
            items['word/document.xml'] = b''.join(out)
            with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for info in infos:
                    zout.writestr(info, items[info.filename])
        viso += n
    return viso


if __name__ == '__main__':
    taisyk = '--taisyk' in sys.argv
    print("=" * 74)
    print("LITGRID sablonu QA taisymai" + ("" if taisyk else "  [PERZIURA - nieko nerasoma]"))
    print("=" * 74)
    n = taisymas_2(taisyk)
    n += taisymas_url(taisyk)
    n += taisymas_tekstas(taisyk)
    print("\n" + "=" * 74)
    print(f"Is viso: {n} pakeitimai" + ("  IRASYTA" if taisyk else "  (paleiskite su --taisyk)"))
