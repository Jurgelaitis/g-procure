#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PP-salygos: neskelbiamų derybų (ND) pasiūlymo formos iš LITGRID TSD pasiūlymo formų.

Naudotojo užduotis (2026-10-23): ND šablonų rinkinyje nebuvo pasiūlymo formos (SPS priedų sąraše -
„1 priedas – Pasiūlymo forma (Pirminio ir Galutinio pasiūlymo pateikimui)“), naudotojas pateikė tris
LITGRID ND pirkimuose naudotas formas (LT ir LT/EN) - „adaptuokite ir sutvarkykite formas, kad atitiktų
visus reikalavimus; vietoje „Įmonės pavadinimas“ - LITGRID AB“.

Pavyzdžiai - tos pačios LITGRID formos (TSD: Pirminis / Galutinis pasiūlymas) užpildytos konkrečiam pirkimui,
su numeracijos klaidomis (2 skyriaus nėra, po 1.8 - 1.11) ir dalimi senesnės redakcijos punktų. Todėl ND forma
daroma iš dabartinės LITGRID TSD formos (templates/, jau su sablonu-taisymai.py pataisymais), ir keičiama tik tai,
kas ND pirkime kitaip:
  1. pašalinamas skyrius „ATITIKTIS SOCIALINIAMS REIKALAVIMAMS“ - ND SPS socialinių reikalavimų dalies neturi
     (jos patvirtinimai nurodo „SPS 5.1 p. 4 lentelę“, o ND SPS 4 lentelė - „Kiti reikalavimai“); kaip naudotojo
     pavyzdžiuose ir MVP formose;
  2. kiti skyriai pernumeruojami (3-5 -> 2-4): LT formoje skyriai - Word numeracija, ranka įrašytas tik „5.2.“;
     LT/EN formoje numeriai - tekstas lentelės langeliuose;
  3. „ĮMONĖS PAVADINIMAS“ -> „LITGRID AB“ (naudotojo nurodymas);
  4. konfidencialios informacijos lentelėje - be paraiškos: ND pirkime paraiškų etapo nėra
     („Su Pasiūlymu pateikiama informacija“, „Užpildyta Pasiūlymo forma“ - kaip naudotojo pavyzdyje);
  5. nuoroda „šios Pasiūlymo formos 5.2. punkte“ (EN „point 5.2.“) - 4.2.
Kita (Pirminis / Galutinis pasiūlymas, 1.2 p. variantai, nesaugių branduolinių elektrinių, nacionalinio saugumo,
Rusijos subjektų ir registracijos deklaracijos, Veiklos partnerių patikros klausimyno el. paštas, kainų lentelė,
galiojimas, konfidenciali informacija) - kaip dabartinėje LITGRID formoje.

XML redaguojamas eilutėje vietoje (be reserializacijos), kiti ZIP failai kopijuojami be pakeitimų.
Naudojimas: python3 nd-formos.py            (įrašo templates/ND_LT_PASIULYMAS.docx ir ND_LTEN_PASIULYMAS.docx)
            python3 nd-formos.py --tikrink  (tik patikrina, ar įrašytos formos sutampa su gaunamomis)
Pakeitus TSD formas (nauja LITGRID redakcija) - paleisk iš naujo, tada kartografas -> zemelapiai/statyk.py.
"""
import re, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

CIA = Path(__file__).parent
T = CIA / 'templates'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def zymes(s, vardas):
    """[(pradžia, pabaiga, gylis)] - elemento <w:vardas> intervalai dokumento tvarka (įdėtiniai - ir jie)."""
    out, stekas = [], []
    for m in re.finditer(r'<(/?)w:%s(?=[ >/])([^>]*)>' % vardas, s):
        if m.group(1):
            a = stekas.pop()
            out[a][1] = m.end()
        elif m.group(2).endswith('/'):
            out.append([m.start(), m.end(), len(stekas)])
        else:
            stekas.append(len(out))
            out.append([m.start(), None, len(stekas) - 1])
    assert not stekas, vardas
    return out


def tekstai(xml):
    root = ET.fromstring(xml.encode('utf-8'))
    return [''.join(t.text or '' for t in p.iter(W + 't')) for p in root.find(W + 'body').iter(W + 'p')]


def pastraipa(P, txt, re_):
    k = [i for i, t in enumerate(txt) if re.search(re_, t)]
    assert len(k) == 1, (re_, k)
    return k[0]


def pirmas_t(s, a, b, senas, naujas):
    """Pastraipos [a, b) pirmojo <w:t> teksto pradžia „senas“ -> „naujas“."""
    m = re.compile(r'(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)').search(s, a, b)
    assert m and m.group(2).startswith(senas), (s[a:a + 200], senas)
    return s[:m.start(2)] + naujas + m.group(2)[len(senas):] + s[m.end(2):]


def visas_tekstas(s, a, b, senas, naujas):
    """Pastraipos [a, b) tekstas (per kelias atkarpas) „senas“ -> „naujas“: pirmoje atkarpoje - naujas, kitos ištuštinamos
    (formatavimas - pirmosios atkarpos)."""
    T_ = list(re.compile(r'(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)').finditer(s, a, b))
    assert ''.join(m.group(2) for m in T_) == senas, ([m.group(2) for m in T_], senas)
    for k, m in reversed(list(enumerate(T_))):
        s = s[:m.start(2)] + (naujas if k == 0 else '') + s[m.end(2):]
    return s


NUOR_5_2_LT, NUOR_5_2_EN = r'šios Pasiūlymo formos (5)\.2\. punkte', r'in point (5)\.2\. of this Tender form'


def nuoroda_5_2(s, *res):
    """Konfidencialios informacijos punkto nuoroda į jo 2 papunktį („... kaip nurodyta šios Pasiūlymo formos 5.2. punkte“, EN „... in point
    5.2. of this Tender form“) - 4.2. (pašalinus socialinių reikalavimų skyrių). Keičiamas tik skaitmuo „5“ toje atkarpoje, kurioje jis yra."""
    for re_ in res:
        P, txt = zymes(s, 'p'), tekstai(s)
        i = pastraipa(P, txt, re_)
        poz = re.search(re_, txt[i]).start(1)
        n = 0
        for m in re.compile(r'(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)').finditer(s, P[i][0], P[i][1]):
            if n <= poz < n + len(m.group(2)):
                k = m.start(2) + poz - n
                assert s[k] == '5', s[k]
                s = s[:k] + '4' + s[k + 1:]
                break
            n += len(m.group(2))
        else:
            raise AssertionError(re_)
    return s


def keisk(s, senas, naujas, kiek):
    assert s.count(senas) == kiek, (senas, s.count(senas))
    return s.replace(senas, naujas)


def nd_lt(s):
    P, txt = zymes(s, 'p'), tekstai(s)
    assert len(P) == len(txt)
    i0 = pastraipa(P, txt, r'^\s*ATITIKTIS SOCIALINIAMS REIKALAVIMAMS\s*$')
    i1 = pastraipa(P, txt, r'^\s*PASIŪLYMO KAINA ARBA SĄNAUDOS\s*$')
    i52 = pastraipa(P, txt, r'^5\.2\. Mums žinoma, kad Lentelėje Nr\. 1')
    # „5.2.“ - pirmoji atkarpa „5“; keičiama prieš šalinant (indeksai dar galioja)
    s = pirmas_t(s, P[i52][0], P[i52][1], '5', '4')
    a, b = P[i0][0], P[i1][0]
    dalis = s[a:b]
    assert '<w:tbl' not in dalis and '<w:tc' not in dalis and '</w:tc>' not in dalis and '<w:sectPr' not in dalis and dalis.count('<w:p ') + dalis.count('<w:p>') == i1 - i0, (i0, i1)
    assert 'Patvirtiname, kad atitinkame SPS 5.1 p. 4 lentelėje' in ''.join(txt[i0:i1])
    s = s[:a] + s[b:]
    s = keisk(s, '>ĮMONĖS PAVADINIMAS<', '>LITGRID AB<', 1)
    s = keisk(s, '>Su Paraiška/Pasiūlymu pateikiama informacija<', '>Su Pasiūlymu pateikiama informacija<', 1)
    s = keisk(s, '>Užpildyta Paraiškos/Pasiūlymo forma <', '>Užpildyta Pasiūlymo forma <', 1)
    return nuoroda_5_2(s, NUOR_5_2_LT)


def nd_lten(s):
    P, txt = zymes(s, 'p'), tekstai(s)
    R = [x for x in zymes(s, 'tr') if x[2] == 0]
    eil = lambda i: next(r for r in R if r[0] <= P[i][0] < r[1])
    i0 = pastraipa(P, txt, r'^\s*ATITIKTIS SOCIALINIAMS REIKALAVIMAMS\s*$')
    i1 = pastraipa(P, txt, r'^\s*PASIŪLYMO KAINA ARBA SĄNAUDOS\s*$')
    r0, r1 = eil(i0), eil(i1)
    assert r0 is not r1
    # pagrindinės lentelės numerių langeliai po socialinių reikalavimų skyriaus: 3-5 -> 2-4
    # (konfidencialios informacijos „Lentelė Nr. 1“ eilučių numeriai 1-5 - kita lentelė, nekeičiami)
    k = pastraipa(P, txt, r'^Eil\. Nr\. / No\.$')
    lent1 = next(x for x in zymes(s, 'tbl') if x[2] == 0 and x[0] <= P[k][0] < x[1])
    num = [i for i in range(i1 - 1, len(txt)) if re.fullmatch(r'[345]\.(\d\.)?', txt[i]) and not lent1[0] <= P[i][0] < lent1[1]]
    assert [txt[i] for i in num] == ['3.', '3.1.', '3.2.', '4.', '4.1.', '5.', '5.1.', '5.2.', '5.3.'], [txt[i] for i in num]
    for i in sorted(num, reverse=True):
        s = pirmas_t(s, P[i][0], P[i][1], txt[i][0], str(int(txt[i][0]) - 1))
    a, b = r0[0], r1[0]
    dalis = s[a:b]
    assert dalis.startswith('<w:tr') and 'COMPLIANCE WITH SOCIAL REQUIREMENTS' in dalis and 'PASIŪLYMO KAINA' not in dalis and '<w:tbl' not in dalis
    s = s[:a] + s[b:]
    s = keisk(s, '>ĮMONĖS PAVADINIMAS<', '>LITGRID AB<', 2)
    s = keisk(s, '>Su Paraiška/Pasiūlymu pateikiama informacija<', '>Su Pasiūlymu pateikiama informacija<', 1)
    P, txt = zymes(s, 'p'), tekstai(s)
    i = pastraipa(P, txt, r'^Information provided in the Application / Tender$')
    s = visas_tekstas(s, P[i][0], P[i][1], 'Information provided in the Application / Tender', 'Information provided in the Tender')
    s = keisk(s, '>Užpildyta Paraiškos/Pasiūlymo forma<', '>Užpildyta Pasiūlymo forma<', 1)
    s = keisk(s, '>Filled in form of the Application / Tender<', '>Filled in Tender form<', 1)
    return nuoroda_5_2(s, NUOR_5_2_LT, NUOR_5_2_EN)


FORMOS = [('TSD_LT_PASIULYMAS.docx', 'ND_LT_PASIULYMAS.docx', nd_lt), ('TSD_LTEN_PASIULYMAS.docx', 'ND_LTEN_PASIULYMAS.docx', nd_lten)]


def be_nasliaiciu(dalys):
    """Šablono autorių komentaras, kurio vietos dokumente neliko (socialinių reikalavimų skyriaus „Jei vykdomos neskelbiamos derybos ir
    šie reikalavimai netaikomi, ištrinti šią skiltį.“ - LT formoje), šalinamas iš comments.xml ir jo paraId - iš commentsExtended.xml,
    commentsIds.xml (kitaip Word rodytų komentarą be vietos)."""
    doc = dalys['word/document.xml'].decode('utf-8')
    if 'word/comments.xml' not in dalys:
        return dalys
    yra = set(re.findall(r'<w:commentReference w:id="(\d+)"', doc))
    c = dalys['word/comments.xml'].decode('utf-8')
    para = []
    for m in reversed(list(re.finditer(r'<w:comment w:id="(\d+)"[^>]*>.*?</w:comment>', c, re.S))):
        if m.group(1) not in yra:
            para += re.findall(r'w14:paraId="([0-9A-F]+)"', m.group(0))
            c = c[:m.start()] + c[m.end():]
    dalys['word/comments.xml'] = c.encode('utf-8')
    for f, el in (('word/commentsExtended.xml', 'w15:commentEx w15:paraId'), ('word/commentsIds.xml', 'w16cid:commentId w16cid:paraId')):
        if f in dalys:
            t = dalys[f].decode('utf-8')
            for pid in para:
                t = re.sub(r'<%s="%s"[^>]*/>' % (el, pid), '', t)
            dalys[f] = t.encode('utf-8')
    return dalys


def gauk(saltinis, keitimas):
    zin = zipfile.ZipFile(T / saltinis)
    dalys = {z.filename: zin.read(z.filename) for z in zin.infolist()}
    dalys['word/document.xml'] = keitimas(dalys['word/document.xml'].decode('utf-8')).encode('utf-8')
    dalys = be_nasliaiciu(dalys)
    return [(z, dalys[z.filename]) for z in zin.infolist()]


def rasyk(kelias, failai):
    with zipfile.ZipFile(kelias, 'w') as zout:
        for z, d in failai:
            zout.writestr(z, d)


if __name__ == '__main__':
    blogi = 0
    for saltinis, tikslas, keitimas in FORMOS:
        failai = gauk(saltinis, keitimas)
        if '--tikrink' in sys.argv:
            esami = zipfile.ZipFile(T / tikslas)
            if [z.filename for z, _ in failai] != esami.namelist() or any(esami.read(z.filename) != d for z, d in failai):
                blogi += 1
                print('!!', tikslas, 'nesutampa su', saltinis)
            else:
                print(tikslas, '- sutampa')
        else:
            rasyk(T / tikslas, failai)
            print(tikslas, '<-', saltinis)
    sys.exit(1 if blogi else 0)
