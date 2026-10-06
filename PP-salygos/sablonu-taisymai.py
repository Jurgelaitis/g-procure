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
    viso += _numeris_28(taisyk)
    viso += _akv_numeracija(taisyk)
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
