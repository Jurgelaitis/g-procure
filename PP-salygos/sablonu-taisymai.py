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
    VPT_BLOGAS = b'https://vpt.lrv.lt/melaginga-informacija-pateikusiutiekeju-sarasas-3'
    VPT_GERAS  = b'https://vpt.lrv.lt/lt/nuorodos/kiti-duomenys/powerbi/melaginga-informacija-pateikusiu-tiekeju-sarasas-3/'
    EBVPD_BLOGAS = b'http://ebvpd.eviesiejipirkimai.lt/espd-web/'
    EBVPD_GERAS  = b'https://ebvpd.eviesiejipirkimai.lt/espd-web/'
    TAISYMAI = [
        ('DPSK_LT_SALYGOS.docx',   [(VPT_BLOGAS, VPT_GERAS), (EBVPD_BLOGAS, EBVPD_GERAS)]),
        ('DPSK_LTEN_SALYGOS.docx', [(EBVPD_BLOGAS, EBVPD_GERAS)]),
    ]
    ENTRYS = ('word/document.xml', 'word/_rels/document.xml.rels')
    print("\nTAISYMAS URL - VPT 404 ir EBVPD http->https:")
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
    print(f"  (saltinis: AK_LT_SPS teisinga VPT nuoroda; abi nuorodos patikrintos 200)")
    return total


if __name__ == '__main__':
    taisyk = '--taisyk' in sys.argv
    print("=" * 74)
    print("LITGRID sablonu QA taisymai" + ("" if taisyk else "  [PERZIURA - nieko nerasoma]"))
    print("=" * 74)
    n = taisymas_2(taisyk)
    n += taisymas_url(taisyk)
    print("\n" + "=" * 74)
    print(f"Is viso: {n} pakeitimai" + ("  IRASYTA" if taisyk else "  (paleiskite su --taisyk)"))
