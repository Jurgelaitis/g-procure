#!/usr/bin/env python3
# CSP maišos įterptiems skriptams (2026-11-24, saugumo auditas G-09 antras etapas).
#
# Puslapis, kurio Content-Security-Policy script-src neturi 'unsafe-inline', įterptus <script> blokus vykdo tik tada, kai jų
# SHA-256 maiša yra script-src sąraše ('sha256-...'). Šis įrankis maišas apskaičiuoja ir įrašo (--rasyk) arba tik patikrina.
# Puslapiai su 'unsafe-inline' (dar turintys onclick ir kitų įterptų įvykių atributų) nekeičiami ir netikrinami.
#
#   python3 .github/testai/csp.py            - patikra: klaida (išėjimo kodas 1), jei kurio nors griežto puslapio maišos nesutampa
#   python3 .github/testai/csp.py --rasyk    - įrašo dabartines maišas (paleisk po kiekvieno įterpto skripto pakeitimo griežtame puslapyje)
#
# Maiša skaičiuojama nuo teksto tarp <script ...> ir </script> lygiai taip, kaip faile (UTF-8); failuose CR ženklų būti negali -
# naršyklė juos pakeičia prieš skaičiuodama maišą. Nevykdomi blokai (application/ld+json ir pan.) maišos nereikalauja.
# Tą pačią taisyklę tikrina shared/testai.html (CSP testas) ir saugumas.py. Tik Python standartinė biblioteka.
import base64, hashlib, os, re, sys

SAKNIS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PRALEISTI_KATALOGAI = {".git", ".github", ".claude", "Video", "_site", "node_modules", "templates", "vendor"}
CSP_RE = re.compile(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(">)', re.I)
SKRIPTAS_RE = re.compile(r'<script\b([^>]*)>(.*?)</script\s*>', re.I | re.S)
NEVYKDOMI = re.compile(r'\btype\s*=\s*["\']?(application/(ld\+)?json|text/template|text/plain)', re.I)
IVYKIAI_RE = re.compile(r'\son[a-z]+\s*=\s*["\']', re.I)


def puslapiai():
    for katalogas, dirs, failai in os.walk(SAKNIS):
        dirs[:] = [d for d in dirs if d not in PRALEISTI_KATALOGAI and not d.startswith(".")]
        for f in failai:
            if f.endswith(".html") and not f.startswith("testai"):
                yield os.path.join(katalogas, f)


def maisos(html):
    out = []
    for atr, kunas in SKRIPTAS_RE.findall(html):
        if re.search(r'\bsrc\s*=', atr) or NEVYKDOMI.search(atr):
            continue
        out.append("'sha256-" + base64.b64encode(hashlib.sha256(kunas.encode("utf-8")).digest()).decode() + "'")
    return out


def tvarkyk(kelias, rasyti):
    """-> (pakeista, klaidos) vienam puslapiui."""
    html = open(kelias, encoding="utf-8").read()
    m = CSP_RE.search(html)
    if not m:
        return False, []
    direktyvos = [d.strip() for d in m.group(2).split(";")]
    i = next((k for k, d in enumerate(direktyvos) if d.startswith("script-src ")), None)
    if i is None:
        return False, []
    zodziai = direktyvos[i].split()
    if "'unsafe-inline'" in zodziai:
        return False, []
    rel = os.path.relpath(kelias, SAKNIS)
    klaidos = []
    if "\r" in html:
        klaidos.append(rel + ": faile yra CR ženklų - maišos nesutaptų su naršyklės")
    if "'unsafe-eval'" in zodziai:
        klaidos.append(rel + ": griežtame puslapyje 'unsafe-eval' (testams jį prideda tik paleidiklis)")
    if IVYKIAI_RE.search(html):
        klaidos.append(rel + ": griežtame puslapyje yra įterptų įvykių atributų (onclick= ir pan.) - CSP juos užblokuotų")
    naujos = maisos(html)
    kiti = [z for z in zodziai[1:] if not z.startswith("'sha256-")]
    nauja = "script-src " + " ".join(kiti + naujos)
    if nauja == direktyvos[i]:
        return False, klaidos
    if not rasyti:
        senos = [z for z in zodziai if z.startswith("'sha256-")]
        klaidos.append(rel + ": CSP maišos nesutampa su įterptais skriptais (yra %d, reikia %d) - paleiskite: python3 .github/testai/csp.py --rasyk"
                       % (len(senos), len(naujos)))
        return False, klaidos
    direktyvos[i] = nauja
    html = html[:m.start(2)] + "; ".join(direktyvos) + html[m.end(2):]
    open(kelias, "w", encoding="utf-8").write(html)
    return True, klaidos


def main():
    rasyti = "--rasyk" in sys.argv[1:]
    griezti, pakeisti, visos = 0, [], []
    for p in sorted(puslapiai()):
        html = open(p, encoding="utf-8").read()
        m = CSP_RE.search(html)
        if m and "script-src " in m.group(2) and "'unsafe-inline'" not in m.group(2).split("script-src ", 1)[1].split(";")[0]:
            griezti += 1
        pak, kl = tvarkyk(p, rasyti)
        if pak:
            pakeisti.append(os.path.relpath(p, SAKNIS))
        visos += kl
    for p in pakeisti:
        print("įrašyta:", p)
    for k in visos:
        print("KLAIDA:", k)
    print("griežtų puslapių (be 'unsafe-inline'): %d%s" % (griezti, "" if visos else " - maišos sutampa"))
    return 1 if visos else 0


if __name__ == "__main__":
    sys.exit(main())
