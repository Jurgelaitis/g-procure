#!/usr/bin/env python3
# G-Procure stebėsena (2026-11-23, naudotojo sprendimas po saugumo audito - priemonė vietoj Cloudflare tarpinio serverio).
# Paleidžia .github/workflows/stebesena.yml kas valandą: tikrina svetainę ir API ir krenta (GitHub atsiunčia laišką), kai:
#   - svetainė ar kuri nors serverio paslauga neatsako (ne 200 ar ne JSON);
#   - pasiekta bendra DI užklausų dienos riba (DI funkcijos neveiks iki vidurnakčio Lietuvos laiku);
#   - CVP IS duomenų kopija senesnė nei 24 val. (2026-11-20 - 2026-11-23 ji neatsinaujino ir niekas nepastebėjo);
#   - nė vienas sankcijų sąrašas nepatikrintas;
#   - API atsakyme trūksta saugumo antraščių (nuo 2026-11-24, saugumo auditas G-09: CSP, Referrer-Policy, nosniff, HSTS).
# Vienas pasenęs sankcijų sąrašas - tik įspėjimas (ES sąrašo šaltinis kartais neveikia dienas, pataisyti negalime).
# Tik Python standartinė biblioteka, tik GET užklausos, jokių duomenų nesiunčia. Vietoje: python3 .github/stebesena/tikrink.py
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone

SVETAINE = "https://g-procure.com/"
API = "https://api.g-procure.com"
ANTRASTES = {"Origin": "https://g-procure.com", "User-Agent": "G-Procure stebesena (https://g-procure.com/saugumas.html)",
             "Accept": "application/json"}
CVPIS_MAX_VAL = 24

klaidos, ispejimai, eilutes = [], [], []
GAUTOS_ANTRASTES = {}  # url -> atsakymo antraštės (mažosiomis raidėmis)

# Kiekvienas API atsakymas turi turėti šias antraštes (DI serveriui jas prideda nginx, kitoms paslaugoms - jos pačios)
SAUGUMO_ANTRASTES = {
    "content-security-policy": lambda v: "default-src 'none'" in v and "frame-ancestors 'none'" in v,
    "referrer-policy": lambda v: v.strip() == "no-referrer",
    "x-content-type-options": lambda v: v.strip() == "nosniff",
    "strict-transport-security": lambda v: "max-age=" in v,
}


def gauk(url, json_atsakymas=True):
    """Du bandymai su 20 s pauze: trumpas sutrikimas neturi siųsti laiško."""
    paskutine = None
    for bandymas in range(2):
        try:
            u = urllib.request.Request(url, headers=ANTRASTES)
            with urllib.request.urlopen(u, timeout=30) as r:
                kunas = r.read(2_000_000)
                GAUTOS_ANTRASTES[url] = {k.lower(): v for k, v in r.headers.items()}
                return (json.loads(kunas.decode("utf-8")) if json_atsakymas else kunas), None
        except urllib.error.HTTPError as e:
            paskutine = "HTTP %d" % e.code
        except Exception as e:  # ryšys, laikas, ne JSON
            paskutine = type(e).__name__
        if bandymas == 0:
            time.sleep(20)
    return None, paskutine


def amzius_val(iso):
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - t).total_seconds() / 3600
    except Exception:
        return None


def tikrink():
    _, k = gauk(SVETAINE, json_atsakymas=False)
    if k: klaidos.append("Svetainė g-procure.com neatsako: " + k)
    else: eilutes.append("Svetainė - veikia")

    d, k = gauk(API + "/")
    if k or not isinstance(d, dict) or "status" not in d: klaidos.append("DI serveris neatsako: " + (k or "netinkamas atsakymas"))
    else: eilutes.append("DI serveris - veikia")

    d, k = gauk(API + "/api/di/busena")
    if k or not isinstance(d, dict) or "dienosRibaPasiekta" not in d:
        klaidos.append("DI kvotos būsena negauta: " + (k or "netinkamas atsakymas"))
    elif d["dienosRibaPasiekta"]:
        klaidos.append("Pasiekta bendra DI užklausų dienos riba (%s) - DI funkcijos neveiks iki vidurnakčio Lietuvos laiku. "
                       "Patikrinkite, ar tai ne piktnaudžiavimas (journalctl -u g-procure: „DI kvota“)." % d.get("diena"))
    else: eilutes.append("DI dienos riba - nepasiekta")

    d, k = gauk(API + "/api/cvpis/busena")
    if k or not isinstance(d, dict): klaidos.append("CVP IS duomenų paslauga neatsako: " + (k or "netinkamas atsakymas"))
    else:
        a = amzius_val(d.get("atnaujinta"))
        if a is None: klaidos.append("CVP IS duomenų kopija neįkelta")
        elif a > CVPIS_MAX_VAL:
            kl = d.get("paskutineKlaida") or {}
            klaidos.append("CVP IS duomenys neatsinaujino %.0f val. (paskutinė klaida: %s) - journalctl -u g-procure-cvpis" % (a, kl.get("rusis", "nėra")))
        else: eilutes.append("CVP IS duomenys - atnaujinti prieš %.1f val. (%s pirkimų)" % (a, d.get("kiekis")))

    d, k = gauk(API + "/api/sankcijos/busena")
    if k or not isinstance(d, dict) or not isinstance(d.get("sarasai"), list):
        klaidos.append("Sankcijų paslauga neatsako: " + (k or "netinkamas atsakymas"))
    else:
        sar = d["sarasai"]
        geri = [s for s in sar if s.get("busena") == "patikrinta" and not s.get("pasenusi")]
        if not geri: klaidos.append("Nė vienas sankcijų sąrašas nepatikrintas ar visi pasenę")
        for s in sar:
            if s not in geri: ispejimai.append("Sankcijų sąrašas „%s“: %s%s" % (s.get("id"), s.get("busena"), ", pasenęs" if s.get("pasenusi") else ""))
        if geri: eilutes.append("Sankcijų sąrašai - patikrinta %d iš %d" % (len(geri), len(sar)))

    d, k = gauk(API + "/api/sutartys/busena")
    if k or not isinstance(d, dict): klaidos.append("Viešų sutarčių paslauga neatsako: " + (k or "netinkamas atsakymas"))
    else: eilutes.append("Viešų sutarčių paslauga - veikia")

    tikrink_antrastes()


def tikrink_antrastes():
    """Saugumo antraštės kiekviename gautame API atsakyme (neatsakiusios paslaugos jau įvardytos kaip klaida)."""
    patikrinta, trukumai = 0, []
    for url, a in GAUTOS_ANTRASTES.items():
        if not url.startswith(API): continue
        patikrinta += 1
        for vardas, gerai in SAUGUMO_ANTRASTES.items():
            if vardas not in a or not gerai(a[vardas]):
                trukumai.append("%s: %s" % (url[len(API):] or "/", vardas))
    if trukumai:
        klaidos.append("API atsakyme trūksta saugumo antraščių ar jos pakeistos (%s) - patikrinkite nginx (sites-enabled/g-procure) ir paslaugas" % "; ".join(trukumai))
    elif patikrinta:
        eilutes.append("API saugumo antraštės - yra (%d atsakymai)" % patikrinta)


def main():
    tikrink()
    for i in ispejimai: print("::warning::" + i)
    for k in klaidos: print("::error::" + k)
    santrauka = ["## G-Procure stebėsena", ""] + ["- " + e for e in eilutes] + \
                ["- Įspėjimas: " + i for i in ispejimai] + ["- **Klaida: " + k + "**" for k in klaidos]
    print("\n".join(santrauka))
    kelias = os.environ.get("GITHUB_STEP_SUMMARY")
    if kelias:
        with open(kelias, "a", encoding="utf-8") as f: f.write("\n".join(santrauka) + "\n")
    return 1 if klaidos else 0


if __name__ == "__main__":
    sys.exit(main())
