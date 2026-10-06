#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PP-salygos: ankstesnių LITGRID formų versijų pastraipų maišos pirkimo sąlygų tikrinimui (shared/palyginimas.js).

KAM. Tikrinant ranka parengtą dokumentą su mūsų (pataisyta) forma, pastraipa, kuri sutampa su OFICIALIA LITGRID forma ar su
ankstesne jos versija, nėra rengėjo nukrypimas - tai mūsų redakcinis taisymas arba senesnė formos versija. Kad tai būtų atpažįstama
be visų senų šablonų kopijų, saugomos tik tų versijų pastraipų, kurių dabartinėje formoje nėra, maišos.

KAIP. Versijos imamos iš git istorijos (žr. VERSIJOS); tekstas ir maiša - tokie pat kaip GP_PALYGINIMAS.pastraipos / norm / maisa
(PP-salygos/testai.html tikrina, kad dabartinės formos maiša sutampa su naršyklės skaičiuojama).

Naudojimas (kai LITGRID atsiunčia naujas formas - pridėkite naują VERSIJOS eilutę su ankstesnio šablonų commit'o žyma):
    python3 PP-salygos/formu-versijos.py
"""
import json, re, subprocess, zipfile, io
from pathlib import Path
from xml.etree import ElementTree as ET

REPO = Path(__file__).resolve().parent.parent
TPL = REPO / 'PP-salygos' / 'templates'
OUT = REPO / 'PP-salygos' / 'zemelapiai' / 'formu-versijos.json'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
VERSIJOS = [
    ('LITGRID 2026-08-07', 'ca25cd4', 'oficialios LITGRID formos (2026-08-07 įsakymas Nr. 26IS121) prieš modulio redakcinius taisymus'),
    ('iki 2026-08-07', 'ca25cd4^', 'ankstesnės LITGRID formos (galiojo iki 2026-08-07)'),
]

def tekstai(b):
    root = ET.fromstring(zipfile.ZipFile(io.BytesIO(b)).read('word/document.xml'))
    out = []
    for p in root.find(W + 'body').iter(W + 'p'):
        txt = ''
        for r in p.iter(W + 'r'):
            t = ''.join((x.text or '') if x.tag == W + 't' else ' ' for x in r if x.tag in (W + 't', W + 'tab'))
            txt += t
        n = re.sub(r'\s+', ' ', txt).strip()
        if n: out.append(n)
    return out

def norm(s):
    s = re.sub('[„“”"]', '"', s)
    s = s.replace(chr(0x2013), '-').replace(chr(0x2014), '-').replace(chr(0xA0), ' ')
    s = re.sub(r'^\s*(\d+(\.\d+)+(?=\s)|\d+(\.\d+)*\.)\s*', '', s)
    s = s.replace('ĮMONĖS PAVADINIMAS', 'LITGRID AB').replace('/LITGRID AB/', 'LITGRID AB')
    return re.sub(r'\s+', ' ', s).strip().lower()

M32 = 0xFFFFFFFF
def imul(a, b): return (a * b) & M32
def maisa(t):
    h1, h2 = 0xdeadbeef, 0x41c6ce57
    for ch in t.encode('utf-16-le').decode('utf-16-le'):
        for cu in ([ord(ch)] if ord(ch) < 0x10000 else [0xD800 + ((ord(ch) - 0x10000) >> 10), 0xDC00 + ((ord(ch) - 0x10000) & 0x3FF)]):
            h1 = imul(h1 ^ cu, 2654435761); h2 = imul(h2 ^ cu, 1597334677)
    h1 = imul(h1 ^ (h1 >> 16), 2246822507) ^ imul(h2 ^ (h2 >> 13), 3266489909)
    h2 = imul(h2 ^ (h2 >> 16), 2246822507) ^ imul(h1 ^ (h1 >> 13), 3266489909)
    n = 4294967296 * (2097151 & h2) + (h1 & M32)
    return ('0000000000000' + format(n, 'x'))[-14:]

def main():
    formos = {}
    for f in sorted(TPL.glob('*.docx')):
        if not re.search(r'_(SPS|BPS|SALYGOS)$', f.stem): continue
        dab = [norm(x) for x in tekstai(f.read_bytes())]
        D = set(dab)
        irasas = {'dabartine': maisa('\n'.join(dab)),
                  # atpažinimui: dabartinės formos ilgesnių (> 40 simb.) pastraipų maišų ketvirtis (paskutinis ženklas 0-3) - paskutiniai 8
                  # ženklai (pirmas maišos ženklas visada 0 arba 1 - 53 bitai); tas pats ketvirtis imamas ir iš dokumento
                  # (GP_PALYGINIMAS.identifikuok), todėl tikslumas ir aprėptis lieka teisingi
                  'pozymiai': ' '.join(sorted({h[-8:] for h in (maisa(n) for n in dab if len(n) > 40) if int(h[-1], 16) < 4}))}
        for pav, rev, _ in VERSIJOS:
            r = subprocess.run(['git', '-C', str(REPO), 'show', f'{rev}:PP-salygos/templates/{f.name}'], capture_output=True)
            if r.returncode or not r.stdout: continue
            kitos = sorted({maisa(n) for n in (norm(x) for x in tekstai(r.stdout)) if n not in D})
            if kitos: irasas[pav] = kitos
        formos[f.stem] = irasas
    duom = {'paaiskinimas': 'Generuoja PP-salygos/formu-versijos.py. Kiekvienai formai: dabartines formos maisa ir ankstesniu versiju '
                            'pastraipu, kuriu dabartineje nera, maisos (GP_PALYGINIMAS.norm + maisa); pozymiai - dabartines formos ilgesniu pastraipu '
                            'maisos formai atpazinti (GP_PALYGINIMAS.identifikuok).',
            'versijos': {pav: apie for pav, _, apie in VERSIJOS}, 'formos': formos}
    OUT.write_text(json.dumps(duom, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(OUT, len(formos), 'formų;', sum(len(v.get(p, [])) for v in formos.values() for p, _, _ in VERSIJOS), 'maišų')

if __name__ == '__main__':
    main()
