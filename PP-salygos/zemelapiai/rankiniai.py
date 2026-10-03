#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PP-salygos: rankiniai zemelapiu pataisymai, susieti su TEKSTU, ne su pastraipos numeriu.

KODEL. statyk.py zemelapius stato is kartografo skenavimo ir ekspertiniu sprendimu lenteles
(perziura.json). Dalis sprendimu daryta ranka tiesiai zemelapiuose: nacionalinio saugumo ir
Koordinavimo komisijos eiluciu blokai lentelese (NAC5, KOM1), dvikalbiu daliu bloku ribos,
raudonos pastabos, LT -> EN tusciu vietu poros. Iki 2026-10-03 jie gyveno tik zemelapiuose, tad
pakeitus sablonus ir is naujo paleidus statyk.py butu tyliai dinge. Atnaujinant sablonus 2026-10-03
jie perkelti sugretinant pastraipas; dabar jie aprasyti rankiniai.json ir statyk.py juos pritaiko
pats. Kiekviena pastraipa randama pagal normalizuota teksta ir jo eiles numeri (kelintas tas pats
tekstas dokumente); tuscia pastraipa - pagal artimiausia netuscia ir poslinki. Neradus - klaida,
zemelapis nekeiciamas tyliai.

Naudojimas:
  python3 rankiniai.py --isvesk AUTO_KATALOGAS GALUTINIS_KATALOGAS   (is statyk.py rezultato ir galutiniu
      zemelapiu sudaro rankiniai.json; kviesti tik pakeitus zemelapi ranka)
  python3 rankiniai.py --patikra AUTO_KATALOGAS                      (pritaiko ir palygina su zemelapiai/)
statyk.py --statyk pataisymus pritaiko automatiskai.
"""
import copy, json, os, re, sys, unicodedata
from pathlib import Path

CIA = Path(__file__).parent
FAILAS = CIA / 'rankiniai.json'
SARASAI = ('raudonosPastabos', 'intarpai', 'tuscios')
INDEKSO_LAUKAI = ('i',)


def norm(s):
    s = unicodedata.normalize('NFKD', (s or '').lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s)).strip()[:120]


class Tekstai:
    """Zemelapio pastraipu tekstai: indeksas <-> (tekstas, kelintas)."""
    def __init__(self, Z):
        self.P = {int(k): norm(v) for k, v in (Z.get('paras') or {}).items()}
        self.eile = {}
        for i in sorted(self.P):
            if self.P[i]:
                self.eile.setdefault(self.P[i], []).append(i)

    def inkaras(self, i):
        if self.P.get(i):
            t = self.P[i]
            return {'t': t, 'k': self.eile[t].index(i), 'd': 0}
        for zingsnis in range(1, 9):
            for j in (i + zingsnis, i - zingsnis):
                if self.P.get(j):
                    t = self.P[j]
                    return {'t': t, 'k': self.eile[t].index(j), 'd': i - j}
        raise ValueError('pastraipai %d nerasta netuscia kaimyne' % i)

    def rask(self, a):
        idx = self.eile.get(a['t'], [])
        if a['k'] >= len(idx):
            return None
        return idx[a['k']] + a['d']


def _bloko_inkarai(b, T):
    o = copy.deepcopy(b)
    o['i'] = T.inkaras(b['i'])
    if b.get('blokas'):
        o['blokas'] = {'nuo': T.inkaras(b['blokas']['nuo']), 'iki': T.inkaras(b['blokas']['iki'])}
    if b.get('pasirenkami'):
        o['pasirenkami'] = [T.inkaras(i) for i in b['pasirenkami']]
    return o


def _bloko_indeksai(o, T, klaidos, kur):
    b = copy.deepcopy(o)
    def r(a, kas):
        i = T.rask(a)
        if i is None:
            klaidos.append('%s: nerasta %s „%s“ (%d)' % (kur, kas, a['t'][:60], a['k']))
        return i
    b['i'] = r(o['i'], 'i')
    if o.get('blokas'):
        b['blokas'] = {'nuo': r(o['blokas']['nuo'], 'nuo'), 'iki': r(o['blokas']['iki'], 'iki')}
    if o.get('pasirenkami'):
        b['pasirenkami'] = [r(a, 'pasirenkami') for a in o['pasirenkami']]
    return b


def _iraso_inkarai(e, T):
    o = {k: v for k, v in e.items() if k != 'i'}
    if 'pora' in o and o['pora'] is not None:
        o['pora'] = T.inkaras(o['pora'])
    return o


def _iraso_indeksai(o, T, klaidos, kur):
    e = dict(o)
    if 'pora' in e and isinstance(e['pora'], dict):
        i = T.rask(e['pora'])
        if i is None:
            klaidos.append('%s: nerasta poros pastraipa „%s“' % (kur, e['pora']['t'][:60]))
        e['pora'] = i
    return e


def isvesk(auto_dir, galutinis_dir):
    out = {'paaiskinimas': __doc__.strip().split('\n\n')[1].replace('\n', ' '), 'zemelapiai': {}}
    for f in sorted(os.listdir(galutinis_dir)):
        if not f.endswith('.json') or f in ('perziura.json', 'priedai.json', 'rankiniai.json'):
            continue
        a_p = os.path.join(auto_dir, f)
        if not os.path.exists(a_p):
            continue
        A = json.load(open(a_p, encoding='utf-8'))
        G = json.load(open(os.path.join(galutinis_dir, f), encoding='utf-8'))
        T = Tekstai(G)
        p = []
        # blokai: pagal id (pridėti - nauji id, pakeisti - tas pats id)
        ab = {b['id']: b for b in A.get('blokai', [])}
        gb = {b['id']: b for b in G.get('blokai', [])}
        for bid, b in gb.items():
            if bid not in ab:
                p.append({'rusis': 'blokas+', 'blokas': _bloko_inkarai(b, T)})
            elif ab[bid] != b:
                pak = {k: b.get(k) for k in set(b) | set(ab[bid]) if b.get(k) != ab[bid].get(k)}
                o = _bloko_inkarai(b, T)
                p.append({'rusis': 'blokas~', 'inkaras': T.inkaras(b['i']), 'klausimas': norm(b.get('klausimas')),
                          'laukai': {k: o.get(k) for k in pak if k in b}, 'pasalinti': [k for k in pak if k not in b]})
        for bid in ab:
            if bid not in gb:
                p.append({'rusis': 'blokas-', 'inkaras': T.inkaras(ab[bid]['i']), 'klausimas': norm(ab[bid].get('klausimas'))})
        for lst in SARASAI:
            ae = {e['i']: e for e in A.get(lst, [])}
            ge = {e['i']: e for e in G.get(lst, [])}
            for i, e in ge.items():
                if i not in ae:
                    p.append({'rusis': '+', 'sarasas': lst, 'inkaras': T.inkaras(i), 'irasas': _iraso_inkarai(e, T)})
                elif ae[i] != e:
                    pak = [k for k in set(e) | set(ae[i]) if e.get(k) != ae[i].get(k)]
                    o = _iraso_inkarai(e, T)
                    p.append({'rusis': '~', 'sarasas': lst, 'inkaras': T.inkaras(i),
                              'laukai': {k: o[k] for k in pak if k in o}, 'pasalinti': [k for k in pak if k not in e]})
            for i in ae:
                if i not in ge:
                    p.append({'rusis': '-', 'sarasas': lst, 'inkaras': T.inkaras(i)})
        for k in sorted(set(G) - {'blokai', 'paras', 'vienetai', 'komentaruTaisykles'} - set(SARASAI)):
            if G.get(k) != A.get(k):
                p.append({'rusis': 'laukas', 'raktas': k, 'reiksme': G[k]})
        if p:
            out['zemelapiai'][f[:-5]] = p
    return out


def pritaikyk(vardas, Z, pataisymai=None):
    """Pritaiko rankinius pataisymus vienam zemelapiui (vietoje). Grazina klaidu sarasa."""
    if pataisymai is None:
        pataisymai = json.load(open(FAILAS, encoding='utf-8')) if FAILAS.exists() else {'zemelapiai': {}}
    klaidos = []
    T = Tekstai(Z)
    for x in pataisymai['zemelapiai'].get(vardas, []):
        kur = '%s %s' % (vardas, x['rusis'])
        if x['rusis'] == 'blokas+':
            b = _bloko_indeksai(x['blokas'], T, klaidos, kur + ' ' + x['blokas'].get('id', ''))
            Z['blokai'] = [y for y in Z.get('blokai', []) if y['id'] != b['id']] + [b]
        elif x['rusis'] in ('blokas~', 'blokas-'):
            i = T.rask(x['inkaras'])
            c = [b for b in Z.get('blokai', []) if b['i'] == i and norm(b.get('klausimas')) == x['klausimas']]
            if len(c) != 1:
                klaidos.append('%s: blokas „%s“ nerastas' % (kur, x['klausimas'][:60]))
                continue
            if x['rusis'] == 'blokas-':
                Z['blokai'].remove(c[0])
                continue
            b = c[0]
            nauji = _bloko_indeksai(dict(x['laukai'], i=x['inkaras']), T, klaidos, kur)
            for k in x['laukai']:
                b[k] = nauji[k]
            for k in x.get('pasalinti', []):
                b.pop(k, None)
        elif x['rusis'] in ('+', '~', '-'):
            i = T.rask(x['inkaras'])
            if i is None:
                klaidos.append('%s %s: nerasta pastraipa „%s“' % (kur, x['sarasas'], x['inkaras']['t'][:60]))
                continue
            cur = {e['i']: e for e in Z.get(x['sarasas'], [])}
            if x['rusis'] == '+':
                e = _iraso_indeksai(x['irasas'], T, klaidos, kur)
                cur[i] = dict(e, i=i)
            elif x['rusis'] == '-':
                if i not in cur:
                    klaidos.append('%s %s: salintino iraso %d nera' % (kur, x['sarasas'], i))
                    continue
                del cur[i]
            else:
                if i not in cur:
                    klaidos.append('%s %s: keiciamo iraso %d nera' % (kur, x['sarasas'], i))
                    continue
                cur[i].update(_iraso_indeksai(x['laukai'], T, klaidos, kur))
                for k in x.get('pasalinti', []):
                    cur[i].pop(k, None)
            Z[x['sarasas']] = [cur[k] for k in sorted(cur)]
        elif x['rusis'] == 'laukas':
            Z[x['raktas']] = x['reiksme']
    return klaidos


if __name__ == '__main__':
    if '--isvesk' in sys.argv:
        a, g = sys.argv[sys.argv.index('--isvesk') + 1:][:2]
        d = isvesk(a, g)
        json.dump(d, open(FAILAS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('irasyta:', FAILAS, '| zemelapiu:', len(d['zemelapiai']), '| pataisymu:', sum(len(v) for v in d['zemelapiai'].values()))
    elif '--patikra' in sys.argv:
        a = sys.argv[sys.argv.index('--patikra') + 1]
        blogi = 0
        for f in sorted(os.listdir(a)):
            if not f.endswith('.json'):
                continue
            Z = json.load(open(os.path.join(a, f), encoding='utf-8'))
            kl = pritaikyk(f[:-5], Z)
            G = json.load(open(CIA / f, encoding='utf-8'))
            if kl or Z != G:
                blogi += 1
                print('!!', f, kl[:5], '' if Z == G else '(skiriasi nuo zemelapiai/)')
        print('PATIKRA:', 'visi zemelapiai sutampa' if not blogi else '%d skiriasi' % blogi)
    else:
        print(__doc__)
