#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PP-salygos: zemelapiu statytojas.

Ima kartografo skenavima (skenavimas_visi.json, gaunama is kartografas.html) ir
pritaiko EKSPERTINIU SPRENDIMU LENTELE (perziura.json): kiekvienai salygai
nurodyta, kiek TURINIO pastraipu jai priklauso ir ar ji is tikruju yra saka,
lentele ar tik pastaba.

Kodel ne euristika. Bandziau ribas nustatyti automatiskai (pagal zodziu kamienu
sutapima su salygos tekstu) - ji atkartojo tik 15 is 18 rankiniu sprendimu ir
klydo ten, kur zodis atsitiktinai sutampa nesusijusiame punkte. Todel ribos
imamos is perziuretos lenteles, o ko joje nera - lieka pazymeta "TIKRINTI"
ir atiduodama ekspertui. Niekada nespejama tyliai.

Naudojimas: python3 statyk.py            (patikrina lentele pries rankinius sprendimus)
            python3 statyk.py --statyk   (irašo zemelapius)
"""
import json, re, sys, unicodedata
from pathlib import Path

CIA = Path(__file__).parent
SKEN = Path('/private/tmp/claude-501/-Users-aj-Documents-g-procure/'
            '0c8f606a-b7e3-4da2-8d55-a060ec2345eb/scratchpad/e0out/skenavimas_visi.json')
NUM_ONLY = re.compile(r'^\d+(\.\d+)*\.?$')

VARDAI = {
    'BPS': 'Bendrosios pirkimo sąlygos (BPS)',
    'SPS': 'Specialiosios pirkimo sąlygos (SPS)',
    'PARAISKA': 'Paraiškos forma',
    'PASIULYMAS': 'Pasiūlymo forma',
    # DPS turi vieną sąlygų dokumentą (ne BPS+SPS) ir savo priedų rinkinį
    'SALYGOS': 'Pirkimo sąlygos',
    'PASALINIMAS': '1 priedas. Tiekėjų pašalinimo pagrindai',
    'KVALIFIKACIJA': '2 priedas. Kvalifikacijos ir kiti reikalavimai',
    'SUTARTYS': '5 priedas. Sutarčių sąrašas',
    'SPECIALISTAI': '6 priedas. Specialistų sąrašas',
    'SUBTIEKEJAS': 'Priedėlis. Sutikimas būti subtiekėju',
    'IDARBINTAS': 'Priedėlis. Sutikimas būti įdarbintu',
    # Bendri priedai (nepriklauso vienai šeimai). SUTARTYS/SPECIALISTAI jau
    # apibrėžti aukščiau (DPS) - nedubliuojam, tas pats pavadinimas tinka.
    'KONFIDENCIALUMAS': 'Konfidencialumo įsipareigojimas',
    'NACSAUGUMAS': 'Nacionalinio saugumo deklaracija',
    'KONFINFO': 'Konfidenciali informacija',
    'SUBTIEKEJAI': 'Informacija apie subtiekėjus',
    'SANDORIS': 'Sandorio šalies duomenų forma',
    'DERYBOS': 'Pasiūlymų dėl derėtinų sąlygų forma',
}

SEIMOS = {
    'TSD': 'Tarptautinės skelbiamos derybos',
    'AK': 'Atviras konkursas',
    'SSD': 'Supaprastintos skelbiamos derybos',
    'ND': 'Neskelbiamos derybos',
    'MVP': 'Mažos vertės pirkimas (skelbiama apklausa)',
    'DPSK': 'Dinaminė pirkimų sistema - sukūrimas',
    'DPSP': 'Dinaminė pirkimų sistema - konkretus pirkimas',
    'PRIEDAI': 'Bendri priedai',
}



def norm(s):
    s = unicodedata.normalize('NFKD', (s or '').lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s)).strip()


def rask_sprendima(salyga, sprendimai, dok=None):
    """Raktas turi buti TIKRAS salygos pradzios prefiksas, imamas ILGIAUSIAS
       atitikmuo. Laisvesnis lyginimas buvo klaida: "objektas skaidomas i dalis"
       susirasdavo irasa "objektas i dalis NEskaidomas" - priesinga salyga.
       Ta pati salyga skirtinguose dokumentuose gali valdyti skirtinga apimti
       (SPS - sesis punktus, formoje - viena eilute), todel ziurim ir dok tipa."""
    n = norm(salyga)
    tinka = [s for s in sprendimai if n.startswith(s['salyga'])
             and (not s.get('dok') or not dok or dok in s['dok'])]
    if not tinka:
        return None
    return max(tinka, key=lambda s: (1 if s.get('dok') else 0, len(s['salyga'])))


def turinio_pastraipos(paras, nuo, salygu_indeksai=()):
    """Pastraipu indeksai nuo `nuo`, praleidziant tuscias ir numeracijos
       artefaktus ('2.8.1.') - jie nera turinys, bet lieka bloko viduje.

       BUTINA: sustojam ties KITA SALYGA. Kai kurie sablonai (DPS kvalifikacijos
       priedas) kartoja salygas atskirai kiekvienai kalbai, tad "2 pastraipos
       dvikalbiame" prielaida nugriebtu kitos salygos antraste ir generatorius
       istrintu ne tos sakos turini."""
    out = []
    for i in sorted(k for k in paras if k >= nuo):
        if i in salygu_indeksai:
            break
        t = paras[i]
        if not t or NUM_ONLY.match(t):
            continue
        out.append(i)
    return out


def statyk(rasyk):
    P = json.load(open(CIA / 'perziura.json', encoding='utf-8'))
    V = json.load(open(SKEN, encoding='utf-8'))
    sprendimai = P['sprendimai']

    # --- Patikra: ar lentele atkartoja rankinius sprendimus? ---------------
    RANKA = {
        'templates/TSD_LT_SPS.docx':    {'C43': 44, 'C51': 57, 'C64': 65, 'C322': 323, 'C566': 567, 'C574': 575},
        'templates/TSD_LTEN_SPS.docx':  {'C92': 94, 'C109': 120, 'C134': 146, 'C148': 150,
                                         'C614': 615, 'C645': 646, 'C1151': 1153, 'C1170': 1172},
        'templates/TSD_LT_PARAISKA.docx': {'C5': 7},
        'templates/TSD_LT_PASIULYMAS.docx': {'C6': 8},
        'templates/TSD_LTEN_PARAISKA.docx': {'C6': 8},
        'templates/TSD_LTEN_PASIULYMAS.docx': {'C8': 10},
    }
    sutapo = nesutapo = 0
    for f, spr in RANKA.items():
        paras = {int(p['i']): p['text'] for p in V[f]['paras']}
        sal_idx = {b['i'] for b in V[f]['blokai']}
        dvikalbis = 'LTEN' in f
        for b in V[f]['blokai']:
            if b['id'] not in spr:
                continue
            s = rask_sprendima(b['klausimas'], sprendimai,
                               f.replace('.docx', '').split('_')[-1])
            if not s or 'LT' not in s:
                print(f"  ! {f.split('/')[-1]} {b['id']}: lenteleje NERA - {b['klausimas'][:44]}")
                nesutapo += 1
                continue
            kiek = s['LTEN' if dvikalbis else 'LT']
            if isinstance(kiek, list):
                kiek = kiek[0]
            tp = turinio_pastraipos(paras, b['i'] + 1, sal_idx)[:kiek]
            iki = tp[-1] if tp else None
            if iki == spr[b['id']]:
                sutapo += 1
            else:
                nesutapo += 1
                print(f"  ! {f.split('/')[-1]} {b['id']}: lentele={iki}, ranka={spr[b['id']]} - {b['klausimas'][:40]}")
    print(f"\nPATIKRA: lentele atkartoja {sutapo}/{sutapo + nesutapo} rankiniu sprendimu")
    if nesutapo:
        print("Lentele NEATITINKA perziuros - zemelapiai NEstatomi.")
        return
    if not rasyk:
        print("(paleiskite su --statyk, kad butu irasyti zemelapiai)")
        return

    # --- Zemelapiu statymas ------------------------------------------------
    klaidos = []
    print(f"\n{'zemelapis':<22}{'salygos':>8}{'is lenteles':>13}{'TIKRINTI':>10}{'grupes':>8}")
    print('-' * 62)
    for f, v in V.items():
        vardas = f.replace('templates/', '').replace('.docx', '')
        seima, kalba, tipas = vardas.split('_')
        dvikalbis = kalba == 'LTEN'
        paras = {int(p['i']): p['text'] for p in v['paras']}
        red = {n['i'] for n in v['raudonosPastabos']}
        sal_idx = {b['i'] for b in v['blokai']}
        kartai = {}   # ta pati salyga gali kartotis tame paciame dokumente skirtinga apimtimi

        # Angliska salygos antraste ("If the object ... is divided into parts")
        # yra to paties vieneto dvynys - jos sprendimas imamas pagal LIETUVISKA
        # vieneto teksta, nes ekspertiniu sprendimu lentele yra lietuviska.
        vien_tekstas = {u['id']: u['tekstas'] for u in v.get('vienetai', [])}

        blokai, is_lenteles, tikrinti = [], 0, 0
        for b in v['blokai']:
            o = dict(b)
            # Sulieta salyga pati yra savo blokas (salyga ir nuostata vienoje
            # pastraipoje) - ribos perskaiciuoti nereikia ir negalima.
            if b.get('sulieta'):
                o['pagrindimas'] = ('Salyga ir nuostata sablone sulietos i viena pastraipa. '
                                    'Itraukiant - raudona antraste trinama, nuostata lieka; '
                                    'neitraukiant - trinama visa pastraipa.')
                o['patvirtinta'] = False
                blokai.append(o)
                is_lenteles += 1
                continue
            # Anglisku salygu eile: (1) pagal PATI anglisku teksta (lenteleje yra
            # EN raktai), (2) tik tada - pagal lietuviska dvyni. Atvirksciai butu
            # klaida: dvikalbiame MVP anglisku lenteliu taisykle neturi LT poros.
            s = rask_sprendima(b['klausimas'], sprendimai, tipas)
            if not s and b.get('condEN'):
                dv = vien_tekstas.get(b.get('vienetas')) or b.get('dvynysKandidatas')
                if dv:
                    s = rask_sprendima(dv, sprendimai, tipas)
                    if s:
                        o['klausimasLT'] = dv
            if s and s.get('tipas'):
                o['tipas'] = s['tipas']
                o['lenteliu'] = s.get('lenteliu', 1)
                o['blokas'] = None
                o['pagrindimas'] = s['pagrindimas']
                o['ribos'] = 'perziureta'
                is_lenteles += 1
            elif s and 'LT' in s:
                kiek = s['LTEN' if dvikalbis else 'LT']
                if isinstance(kiek, list):
                    n = kartai.get(s['salyga'], 0)
                    kartai[s['salyga']] = n + 1
                    kiek = kiek[min(n, len(kiek) - 1)]
                tp = turinio_pastraipos(paras, b['i'] + 1, sal_idx)[:kiek]
                if tp:
                    o['blokas'] = {'nuo': b['i'] + 1, 'iki': tp[-1]}
                    o['pastraipu'] = len(tp)
                o['pagrindimas'] = s['pagrindimas']
                o['ribos'] = 'perziureta'
                is_lenteles += 1
            else:
                o['pagrindimas'] = ('Riba remiasi i kita salyga.' if b['ribos'] != 'TIKRINTI'
                                    else 'NEPERZIURETA - kartografas nera tikras del ribos. Patvirtinkite kartografe.')
                if b['ribos'] == 'TIKRINTI':
                    tikrinti += 1
            if o['tipas'] != 'saka':
                o['blokas'] = None
                o['pastraipu'] = 0
            if o.get('blokas'):
                o['pasirenkami'] = [i for i in range(o['blokas']['nuo'], o['blokas']['iki'] + 1) if i in red]
            o['patvirtinta'] = False
            blokai.append(o)

        Z = {
            'sablonas': f,
            'pavadinimas': f"{SEIMOS[seima]} - {kalba.replace('LTEN', 'LT/EN')} - {VARDAI[tipas]}",
            'seima': seima, 'kalba': kalba, 'tipas': tipas, 'versija': 3,
            'busena': 'LAUKIA EKSPERTO PATVIRTINIMO' if blokai else 'STATINIS - nereikia tvirtinti',
            'paaiskinimas': 'Ribos is perziura.json (ekspertiniu sprendimu lentele). Ko joje nera - pazymeta TIKRINTI.',
            'blokai': blokai, 'vienetai': v.get('vienetai', []),
            'komentaruTaisykles': v['komentarai'], 'raudonosPastabos': v['raudonosPastabos'],
            'tuscios': v['tuscios'], 'intarpai': v['intarpai'],
            'paras': {str(p['i']): p['text'] for p in v['paras']},
        }
        # APSAUGA: blokas niekada negali apimti kitos salygos antrastes.
        for b in blokai:
            if not b.get('blokas'):
                continue
            kirto = [i for i in sal_idx if b['blokas']['nuo'] <= i <= b['blokas']['iki'] and i != b['i']]
            if kirto:
                klaidos.append(f"{vardas} {b['id']}: blokas {b['blokas']['nuo']}-{b['blokas']['iki']} "
                               f"apima kita salyga ({kirto})")

        json.dump(Z, open(CIA / f'{vardas}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        g = len({u.get('grupe') for u in v.get('vienetai', []) if u.get('grupe')})
        if blokai:
            print(f"{vardas:<22}{len(blokai):>8}{is_lenteles:>13}{tikrinti:>10}{g:>8}")
    print('-' * 62)
    if klaidos:
        print("\n*** APSAUGA SUVEIKE - blokai kertasi su kitomis salygomis: ***")
        for k in klaidos:
            print("  ! " + k)
        print("Zemelapiai IRASYTI, bet siuos blokus BUTINA pataisyti perziura.json.")
    else:
        print("Zemelapiai irasyti. Apsauga: nei vienas blokas neapima kitos salygos.")


if __name__ == '__main__':
    statyk('--statyk' in sys.argv)
