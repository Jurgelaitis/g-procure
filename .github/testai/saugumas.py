# -*- coding: utf-8 -*-
"""G-Procure saugumo patikra CI'e (2026-10-06, saugumo planas, 0-30 dienų darbai). Tik Python standartinė biblioteka.

Paleidžiama kartu su testais (.github/testai/paleisk.py - be filtrų arba su žodžiu „saugumas“) ir atskirai:
    python3 .github/testai/saugumas.py
Tikrina:
  1. Bibliotekas (SCA): package.json nėra, todėl surenkamos visų CDN adresų versijos (cdnjs, jsDelivr, unpkg, cdn.sheetjs.com) ir
     saugykloje laikomos kopijos (vendor), o žinomos spragos ieškomos OSV duomenų bazėje (api.osv.dev, npm). Rasta spraga be
     pagrįstos išimties (saugumas-isimtys.json) - krenta. OSV nepasiekiamas - KRENTA (nepavykusi patikra niekada nerodoma kaip
     „spragų nėra“).
  2. Paslaptis saugykloje: API raktai, privatūs raktai, prieigos raktai; ir serverio IP adresas (paimamas iš DNS, ne įrašytas čia -
     serverio duomenys viešoje saugykloje nelaikomi). Rastos reikšmės nespausdinamos - tik failas, eilutė ir rūšis.
  3. /.well-known/security.txt galiojimą (RFC 9116 Expires): pasibaigęs - krenta, liko mažiau nei 30 dienų - įspėjimas.
Išėjimo kodas 1, jei bent viena patikra krito.
"""
import datetime, json, os, re, socket, subprocess, sys, time, urllib.request

SAKNIS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ISIMTYS = os.path.join(os.path.dirname(__file__), "saugumas-isimtys.json")
OSV = "https://api.osv.dev/v1"

# cdnjs bibliotekos vardas -> npm paketas (OSV ieško pagal npm). Nauja biblioteka be įrašo - klaida, kad nebūtų praleista.
CDNJS_NPM = {"pdf.js": "pdfjs-dist", "jszip": "jszip", "mammoth": "mammoth", "FileSaver.js": "file-saver", "Chart.js": "chart.js",
             "jspdf": "jspdf", "jspdf-autotable": "jspdf-autotable", "xlsx": "xlsx", "docx": "docx"}
# Saugykloje laikomos bibliotekų kopijos: paketas ir versija - iš paties failo
VENDOR = {"PP-salygos/vendor/jszip.min.js": ("jszip", r"JSZip v(\d+\.\d+\.\d+)"),
          "PP-cost-benefit/chart.umd.min.js": ("chart.js", r'static version="(\d+\.\d+\.\d+)"')}
CDN_RE = [
    (re.compile(r"https://cdnjs\.cloudflare\.com/ajax/libs/([A-Za-z0-9._-]+)/(\d+\.\d+\.\d+)/"), "cdnjs"),
    (re.compile(r"https://cdn\.jsdelivr\.net/npm/((?:@[a-z0-9._-]+/)?[a-z0-9._-]+)@(\d+\.\d+\.\d+)/"), "npm"),
    (re.compile(r"https://unpkg\.com/((?:@[a-z0-9._-]+/)?[a-z0-9._-]+)@(\d+\.\d+\.\d+)/"), "npm"),
    (re.compile(r"https://cdn\.sheetjs\.com/xlsx-(\d+\.\d+\.\d+)/"), "sheetjs"),
]
# Paslaptys: rūšis -> šablonas. Tik aiškūs formatai (be „slaptazodis =“ spėlionių - per daug klaidingų radinių)
PASLAPTYS = {
    "Anthropic API raktas": r"sk-ant-[A-Za-z0-9]{2,8}-[A-Za-z0-9_-]{20,}",
    "OpenAI API raktas": r"\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{40,}",
    "GitHub raktas": r"\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,})",
    "AWS prieigos raktas": r"\bAKIA[0-9A-Z]{16}\b",
    "Google API raktas": r"\bAIza[0-9A-Za-z_-]{35}\b",
    "Slack raktas": r"\bxox[abposr]-[A-Za-z0-9-]{10,}",
    "Privatus raktas": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
}
TEKSTO_PLETINIAI = (".html", ".js", ".json", ".md", ".py", ".yml", ".yaml", ".css", ".txt", ".xml", ".svg", ".toml", ".sh", ".gitignore")


def failai():
    r = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=SAKNIS, capture_output=True, check=True)
    return [f for f in r.stdout.decode("utf-8").split("\0") if f]


def skaityk(f):
    with open(os.path.join(SAKNIS, f), encoding="utf-8", errors="replace") as h:
        return h.read()


def http_json(url, kunas=None, kartai=3):
    klaida = None
    for i in range(kartai):
        try:
            req = urllib.request.Request(url, data=json.dumps(kunas).encode() if kunas is not None else None,
                                         headers={"Content-Type": "application/json", "User-Agent": "g-procure-ci"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            klaida = e; time.sleep(2 * (i + 1))
    raise ConnectionError("%s: %s" % (url, klaida))


def versija(v):
    return tuple(int(x) for x in v.split("."))


def bibliotekos(visi):
    """{(paketas, versija): [failai]} ir nežinomos cdnjs bibliotekos."""
    rasta, nezinomos = {}, set()
    for f in visi:
        if not f.endswith((".html", ".js")) or f.startswith("docs/"): continue
        src = skaityk(f)
        for rx, tipas in CDN_RE:
            for m in rx.finditer(src):
                if tipas == "sheetjs": pak, ver = "xlsx", m.group(1)
                elif tipas == "cdnjs":
                    pak = CDNJS_NPM.get(m.group(1)); ver = m.group(2)
                    if not pak: nezinomos.add(m.group(1)); continue
                else: pak, ver = m.group(1), m.group(2)
                rasta.setdefault((pak, ver), set()).add(f)
    for f, (pak, rx) in VENDOR.items():
        if f in visi:
            m = re.search(rx, skaityk(f)[:200000])
            if m: rasta.setdefault((pak, m.group(1)), set()).add(f)
            else: nezinomos.add(f + " (versija neatpažinta)")
    return rasta, nezinomos


def sca(visi, isimtys, siandien):
    krito, ispejimai = [], []
    rasta, nezinomos = bibliotekos(visi)
    for n in sorted(nezinomos):
        krito.append("Biblioteka „%s“ neįrašyta į CDNJS_NPM / VENDOR (.github/testai/saugumas.py) - jos spragos netikrinamos" % n)
    raktai = sorted(rasta)
    try:
        ats = http_json(OSV + "/querybatch", {"queries": [{"package": {"name": p, "ecosystem": "npm"}, "version": v} for p, v in raktai]})
    except ConnectionError as e:
        return krito + ["OSV nepasiekiamas - bibliotekų spragos NEPATIKRINTOS (%s)" % e], ispejimai, len(raktai)
    for (pak, ver), r in zip(raktai, ats.get("results", [])):
        for v in r.get("vulns", []):
            vid = v["id"]
            try: d = http_json(OSV + "/vulns/" + vid)
            except ConnectionError as e: krito.append("%s@%s: %s - aprašo gauti nepavyko (%s)" % (pak, ver, vid, e)); continue
            cve = ",".join(a for a in d.get("aliases", []) if a.startswith("CVE-"))
            sev = (d.get("database_specific") or {}).get("severity") or "?"
            tekstas = "%s@%s: %s %s (%s) - %s; naudoja: %s" % (pak, ver, vid, cve, sev, d.get("summary", "")[:140], ", ".join(sorted(rasta[(pak, ver)])))
            isimtis = next((x for x in isimtys.get("bibliotekos", []) if x["id"] == vid and x["paketas"] == pak
                            and versija(ver) >= versija(x.get("nuo_versijos", "0.0.0"))), None)
            if not isimtis:
                krito.append(tekstas)
            elif isimtis.get("perziureti_iki", "9999-12-31") < siandien:
                ispejimai.append("Išimties peržiūros data praėjo (%s): %s - %s" % (isimtis["perziureti_iki"], tekstas, isimtis["priezastis"]))
    return krito, ispejimai, len(raktai)


def paslaptys(visi, isimtys):
    krito, ispejimai = [], []
    sablonai = {k: re.compile(v) for k, v in PASLAPTYS.items()}
    try:
        ip = socket.gethostbyname("api.g-procure.com")
        sablonai["Serverio IP adresas (api.g-procure.com)"] = re.compile(r"(^|[^\d.])" + re.escape(ip) + r"($|[^\d.])")
    except OSError as e:
        ispejimai.append("api.g-procure.com DNS nepavyko - serverio IP saugykloje netikrintas (%s)" % e)
    leidziama = isimtys.get("paslaptys", []); n = 0
    for f in visi:
        if not f.endswith(TEKSTO_PLETINIAI) and "." in os.path.basename(f): continue
        n += 1
        src = skaityk(f)
        for rusis, rx in sablonai.items():
            for m in rx.finditer(src):
                if any(x["failas"] == f and x["rusis"] == rusis for x in leidziama): continue
                eil = src.count("\n", 0, m.start()) + 1
                krito.append("%s:%d - %s (reikšmė nerodoma)" % (f, eil, rusis))
    return krito, ispejimai, n


def security_txt(visi, dabar):
    f = ".well-known/security.txt"
    if f not in visi: return ["Nėra %s (RFC 9116)" % f], []
    m = re.search(r"^Expires:\s*(\S+)\s*$", skaityk(f), re.M)
    if not m: return ["%s: nėra Expires" % f], []
    iki = datetime.datetime.fromisoformat(m.group(1).replace("Z", "+00:00"))
    liko = (iki - dabar).days
    if liko < 0: return ["%s: Expires %s jau praėjo - atnaujinkite (ir peržiūrėkite saugumas.html)" % (f, m.group(1))], []
    if liko < 30: return [], ["%s: Expires %s - liko %d d.; atnaujinkite kartu su saugumas.html peržiūra" % (f, m.group(1), liko)]
    return [], []


def patikrink():
    pr = time.time()
    with open(ISIMTYS, encoding="utf-8") as h: isimtys = json.load(h)
    dabar = datetime.datetime.now(datetime.timezone.utc)
    visi = set(failai())
    k1, i1, n = sca(visi, isimtys, dabar.strftime("%Y-%m-%d"))
    k2, i2, nt = paslaptys(sorted(visi), isimtys)
    k3, i3 = security_txt(visi, dabar)
    krito, isp = k1 + k2 + k3, i1 + i2 + i3
    busena = ("Saugumo patikra: %d bibliotekų versijos (OSV), paslaptys %d tekstiniuose failuose, security.txt - " % (n, nt)
              + ("praėjo" if not krito else "krito %d" % len(krito)) + (", įspėjimų %d" % len(isp) if isp else ""))
    return {"rinkinys": ".github/testai/saugumas.py", "baigta": True, "gerai": not krito, "busena": busena,
            "krito": krito, "ispejimai": isp, "sek": round(time.time() - pr)}


if __name__ == "__main__":
    x = patikrink()
    print(("GERAI " if x["gerai"] else "KRITO ") + x["rinkinys"] + " | " + x["busena"] + " | " + str(x["sek"]) + " s")
    for k in x["krito"]: print("    - " + k)
    for k in x["ispejimai"]: print("    ! " + k)
    sys.exit(0 if x["gerai"] else 1)
