# -*- coding: utf-8 -*-
"""G-Procure programų bibliotekų sąrašas mašinai skaitomu formatu (SBOM) ir bibliotekų kilmės patikra (2026-11-24, saugumo auditas G-17).
Tik Python standartinė biblioteka.

Šaltinis - shared/vendor/bibliotekos.json (bibliotekos svetainėje: npm paketas, versija, licencija, kiekvieno failo sha384, oficialus
paketas ir jo maiša, failo vieta pakete). Iš jo sudaromas CycloneDX 1.6 SBOM shared/sbom.cdx.json - nekintamai (be laiko žymos ir
atsitiktinių reikšmių), todėl jį galima laikyti saugykloje ir tikrinti, ar atitinka sąrašą.

    python3 .github/testai/sbom.py              # tikrina, ar shared/sbom.cdx.json atitinka sąrašą (be tinklo; kviečia ir saugumas.py)
    python3 .github/testai/sbom.py --rasyk      # perrašo shared/sbom.cdx.json pagal sąrašą
    python3 .github/testai/sbom.py --kilme      # atsisiunčia oficialius paketus ir tikrina: paketo maiša = registro, kiekvienas
                                                # svetainės failas baitas į baitą = failas pakete (tinklas; GitHub Actions - kas savaitę)
Išėjimo kodas 1, jei patikra nepavyko. Nepavykęs atsisiuntimas - nepavykusi patikra (niekada „viskas gerai“).
"""
import base64, hashlib, io, json, os, sys, tarfile, urllib.parse, urllib.request, uuid

SAKNIS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SARASAS = os.path.join(SAKNIS, "shared", "vendor", "bibliotekos.json")
SBOM = os.path.join(SAKNIS, "shared", "sbom.cdx.json")
# Licencijos sąraše žmogui („MIT (arba GPL-3.0 - pasirinkta MIT)“) -> SPDX išraiška
SPDX = {"MIT (arba GPL-3.0 - pasirinkta MIT)": "MIT", "Apache-2.0 ir MIT": "Apache-2.0 AND MIT"}


def sarasas():
    with open(SARASAS, encoding="utf-8") as f:
        return json.load(f)


def purl(b):
    p = "pkg:npm/%s@%s" % (urllib.parse.quote(b["npm"], safe="@/"), b["versija"])
    # SheetJS npm registre neplatinama - paketas iš jo paties svetainės
    if not b["paketas"].startswith("https://registry.npmjs.org/"):
        p += "?download_url=" + urllib.parse.quote(b["paketas"], safe="")
    return p


def maisa_hex(sri):
    alg, h = sri.split("-", 1)
    return {"sha384": "SHA-384", "sha512": "SHA-512"}[alg], base64.b64decode(h).hex()


def generuok(d=None):
    d = d or sarasas()
    komp = []
    for b in d["bibliotekos"]:
        ref = purl(b)
        lic = SPDX.get(b["licencija"], b["licencija"])
        lic_obj = {"expression": lic} if " " in lic else {"license": {"id": lic}}
        alg, h = maisa_hex(b["paketo_maisa"])
        failai = []
        for fn, sri in b["failai"].items():
            a2, h2 = maisa_hex(sri)
            failai.append({"type": "file", "bom-ref": ref + "#" + fn, "name": "shared/vendor/%s/%s" % (b["katalogas"], fn),
                           "hashes": [{"alg": a2, "content": h2}],
                           "properties": [{"name": "g-procure:paketo-failas", "value": b["paketo_failai"][fn]}]})
        komp.append({"type": "library", "bom-ref": ref, "name": b["npm"], "version": b["versija"], "purl": ref,
                     "description": b["kam"], "licenses": [lic_obj], "hashes": [{"alg": alg, "content": h}],
                     "externalReferences": [{"type": "distribution", "url": b["paketas"]}],
                     "properties": [{"name": "g-procure:kilme-tikrinta", "value": b["kilme_tikrinta"]}],
                     "components": failai})
    datos = sorted(b["kilme_tikrinta"] for b in d["bibliotekos"])
    sbom = {"bomFormat": "CycloneDX", "specVersion": "1.6", "version": 1,
            "metadata": {"timestamp": datos[-1] + "T00:00:00Z",
                         "component": {"type": "application", "bom-ref": "g-procure", "name": "G-Procure", "description": "Pirkimų įrankių prototipai (https://g-procure.com)",
                                       "externalReferences": [{"type": "website", "url": "https://g-procure.com/"}, {"type": "vcs", "url": "https://github.com/Jurgelaitis/g-procure"}]},
                         "properties": [{"name": "g-procure:saltinis", "value": "shared/vendor/bibliotekos.json"}]},
            "components": komp,
            "dependencies": [{"ref": "g-procure", "dependsOn": [c["bom-ref"] for c in komp]}]}
    # Serijos numeris - iš turinio (tas pats sąrašas - tas pats numeris)
    sbom["serialNumber"] = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, "https://g-procure.com/sbom#" + json.dumps(sbom, sort_keys=True, ensure_ascii=False)))
    return sbom


def tekstas(sbom):
    return json.dumps(sbom, ensure_ascii=False, indent=2) + "\n"


def tikrink():
    """Be tinklo: SBOM failas atitinka sąrašą. Grąžina klaidų sąrašą."""
    if not os.path.exists(SBOM):
        return ["shared/sbom.cdx.json nėra - paleiskite: python3 .github/testai/sbom.py --rasyk"]
    with open(SBOM, encoding="utf-8") as f:
        esamas = f.read()
    if esamas != tekstas(generuok()):
        return ["shared/sbom.cdx.json neatitinka shared/vendor/bibliotekos.json - paleiskite: python3 .github/testai/sbom.py --rasyk"]
    return []


def gauk(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "g-procure-sbom"}), timeout=120) as a:
        return a.read()


def kilme():
    """Tinklas: oficialaus paketo maiša ir kiekvieno svetainės failo atitiktis failui pakete."""
    klaidos = []
    for b in sarasas()["bibliotekos"]:
        vardas = "%s %s" % (b["npm"], b["versija"])
        try:
            tgz = gauk(b["paketas"])
        except Exception as e:
            klaidos.append("%s: paketo atsisiųsti nepavyko (%s) - kilmė nepatikrinta" % (vardas, type(e).__name__)); continue
        alg, h = b["paketo_maisa"].split("-", 1)
        if base64.b64encode(hashlib.new(alg, tgz).digest()).decode() != h:
            klaidos.append("%s: paketo maiša nesutampa su įrašyta" % vardas); continue
        if b["paketas"].startswith("https://registry.npmjs.org/"):
            try:
                reg = json.loads(gauk("https://registry.npmjs.org/%s/%s" % (b["npm"], b["versija"])))["dist"]["integrity"]
                if reg != b["paketo_maisa"]:
                    klaidos.append("%s: npm registro maiša kita nei įrašyta" % vardas)
            except Exception as e:
                klaidos.append("%s: npm registro atsakymo gauti nepavyko (%s)" % (vardas, type(e).__name__))
        tar = tarfile.open(fileobj=io.BytesIO(tgz))
        for fn, kelias in b["paketo_failai"].items():
            try:
                x = tar.extractfile(kelias).read()
            except (KeyError, AttributeError):
                klaidos.append("%s: pakete nėra %s" % (vardas, kelias)); continue
            with open(os.path.join(SAKNIS, "shared", "vendor", b["katalogas"], fn), "rb") as f:
                svetaineje = f.read()
            if svetaineje != x:
                klaidos.append("%s: shared/vendor/%s/%s skiriasi nuo %s pakete" % (vardas, b["katalogas"], fn, kelias))
    return klaidos


def main():
    if "--rasyk" in sys.argv:
        with open(SBOM, "w", encoding="utf-8") as f:
            f.write(tekstas(generuok()))
        print("Įrašyta: shared/sbom.cdx.json"); return 0
    kl = kilme() if "--kilme" in sys.argv else tikrink()
    for k in kl:
        print("KRITO: " + k)
    if not kl:
        print("Bibliotekų kilmė patikrinta: visi svetainės failai baitas į baitą tokie kaip oficialiuose paketuose." if "--kilme" in sys.argv
              else "SBOM (shared/sbom.cdx.json) atitinka bibliotekų sąrašą.")
    return 1 if kl else 0


if __name__ == "__main__":
    sys.exit(main())
