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
    viso += _numeris_28(taisyk)
    return viso


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
