#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ES teisės registro (PP-teise/duomenys/registras-es.json) šaltinių patikra - pagalbinis įrankis prižiūrėtojui.

Naudojama tik Python standartinė biblioteka. Duomenys - iš viešos ES leidinių biuro saugyklos
(publications.europa.eu): EUR-Lex puslapiai automatinėms užklausoms neatsako (HTTP 202), o saugykla atiduoda
tuos pačius dokumentus pagal CELEX numerį ir turi viešą SPARQL užklausų sąsają.

  python3 PP-teise/es-saltiniai.py nauji [--nuo 2026-10-01] [--visi] [--pilnas]
      Dokumentai (ES teisės aktai, Komisijos pasiūlymai ir komunikatai, Teisingumo Teismo sprendimai ir
      generalinių advokatų išvados), kurie cituoja pirkimų direktyvas (2014/23/ES, 2014/24/ES, 2014/25/ES, 89/665/EEB,
      92/13/EEB) ir kurių registre dar nėra. Be --nuo - nuo 120 dienų iki paskutinės registro patikros. --visi - ir tie,
      kurie registre jau yra. --pilnas - visas pavadinimas (bylų pavadinimuose išvardyti nagrinėti klausimai).

  python3 PP-teise/es-saltiniai.py tekstas 32025R2150 [--kalba lit] [--trumpai]
      Dokumento tekstas lietuvių kalba (ištraukoms: į registrą rašoma tik pažodinė citata iš šio teksto).
      --trumpai - teismo dokumento pradžia ir rezoliucinė dalis, kitų dokumentų pradžia (savaitinei užduočiai).

Įrankis registro nekeičia. Nuo 2026-11-13 jį kas pirmadienį paleidžia savaitinė užduotis (pp-teise-savaitine-patikra):
aiškiai pirkimų dokumentų faktus ji įrašo į registrą pati, kitus - tik į ataskaitą (žr. docs/teise/administravimas.md).
Sąrašas nėra išsamus: naujausi Teisingumo Teismo dokumentai duomenų bazėje su direktyvomis susiejami ne iš karto.
"""
import argparse
import datetime
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SAKNIS = os.path.dirname(os.path.abspath(__file__))
REGISTRAS = os.path.join(SAKNIS, "duomenys", "registras-es.json")
SPARQL = "https://publications.europa.eu/webapi/rdf/sparql"
SAUGYKLA = "http://publications.europa.eu/resource/celex/"
UA = {"User-Agent": "Mozilla/5.0 (teises stebesenos patikra)"}
LANGAS_D = 120  # kiek dienų iki paskutinės registro patikros žiūrima, kai --nuo nenurodyta
# Pirkimų direktyvos (klasikinė, sektorinė, koncesijų) ir peržiūros procedūrų direktyvos.
DIREKTYVOS = ["32014L0024", "32014L0025", "32014L0023", "31989L0665", "31992L0013"]
# Dokumentų rūšys pagal CELEX: 3 - teisės aktai, 5..PC - pasiūlymai, 5..XC ir 5..DC - komunikatai,
# 6..CJ - Teisingumo Teismo sprendimai, 6..CC - generalinių advokatų išvados, 6..CO - nutartys,
# 6..CA ir 6..CB - pranešimai Oficialiajame leidinyje apie sprendimą ar nutartį (duomenų bazėje jie su direktyvomis
# susiejami patikimiau nei patys sprendimai, todėl rodomi taip pat).
RUSYS = re.compile(r"^(3\d{4}[A-Z]\d{4}|5\d{4}(PC|XC|DC)\d{4,5}|6\d{4}(CJ|CC|CO|CA|CB)\d{4})$")


def raktas(celex):
    """Bylos dokumentai (sprendimas, išvada, pranešimas OL) laikomi ta pačia byla: 62024CJ0820 ir 62024CA0820."""
    c = celex.upper()
    return c[:5] + c[-4:] if c.startswith("6") and len(c) >= 11 else c


def uzklausa(nuo):
    reiksmes = ", ".join('"%s"^^<http://www.w3.org/2001/XMLSchema#string>' % c for c in DIREKTYVOS)
    return """PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?date ?title WHERE {
  ?w cdm:resource_legal_id_celex ?celex ; cdm:work_date_document ?date ; cdm:work_cites_work ?c .
  ?c cdm:resource_legal_id_celex ?cc .
  FILTER(?cc IN (%s))
  FILTER(?date >= "%s"^^<http://www.w3.org/2001/XMLSchema#date>)
  OPTIONAL { ?e cdm:expression_belongs_to_work ?w ;
                cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/LIT> ;
                cdm:expression_title ?title }
} ORDER BY DESC(?date) LIMIT 300""" % (reiksmes, nuo)


def nauji(nuo, visi, pilnas=False):
    try:
        reg = json.load(open(REGISTRAS, encoding="utf-8"))
    except Exception as e:  # registro nėra ar jis sugadintas - patikra neturi su kuo lyginti
        sys.exit("Registro perskaityti nepavyko: %s" % e)
    yra = {raktas(str((r.get("identifikatoriai") or {}).get("celex") or "")) for r in reg.get("irasai", [])}
    if not nuo:
        pat = (reg.get("meta") or {}).get("patikrinta") or datetime.date.today().isoformat()
        # Platus langas: Teisingumo Teismo sprendimus duomenų bazė su direktyvomis susieja pavėluotai (dažnai tik paskelbus
        # pranešimą Oficialiajame leidinyje, praėjus 6-8 savaitėms), todėl siauras langas juos praleistų visam laikui.
        nuo = (datetime.date.fromisoformat(pat) - datetime.timedelta(days=LANGAS_D)).isoformat()
    adresas = SPARQL + "?" + urllib.parse.urlencode({"query": uzklausa(nuo), "format": "application/sparql-results+json"})
    try:
        with urllib.request.urlopen(urllib.request.Request(adresas, headers=UA), timeout=120) as f:
            eilutes = json.load(f)["results"]["bindings"]
    except Exception as e:
        # Nepavykusi patikra nėra „naujų dokumentų nėra“ - tai pasakoma aiškiai ir grąžinamas klaidos kodas.
        sys.exit("PATIKRA NEPAVYKO (%s): %s. Tai nereiškia, kad naujų dokumentų nėra." % (type(e).__name__, e))
    rasta = {}
    for b in eilutes:
        c = b["celex"]["value"].upper()
        if not RUSYS.match(c):
            continue
        r = rasta.setdefault(c, {"celex": c, "data": b["date"]["value"], "pavadinimas": ""})
        if "title" in b and not r["pavadinimas"]:
            r["pavadinimas"] = re.sub(r"\s+", " ", b["title"]["value"]).strip()
    sar = sorted(rasta.values(), key=lambda r: r["data"], reverse=True)
    for r in sar:
        r["registre"] = raktas(r["celex"]) in yra
    rodomi = sar if visi else [r for r in sar if not r["registre"]]
    print("Laikotarpis nuo %s. Rasta dokumentų: %d, registre jau yra: %d, rodoma: %d." % (
        nuo, len(sar), sum(1 for r in sar if r["registre"]), len(rodomi)))
    if not rodomi:
        # Tuščias sąrašas nėra „pokyčių nėra“: duomenų bazė naujus dokumentus su direktyvomis susieja ne iš karto.
        print("Naujų dokumentų, susietų su pirkimų direktyvomis, duomenų bazėje nerasta. Naujausi dokumentai susiejami ne iš karto - "
              "tai nereiškia, kad jų nebuvo paskelbta.")
    for r in rodomi:
        print("%s  %s  %s%s" % (r["data"], r["celex"], "[registre] " if r["registre"] else "", (r["pavadinimas"] if pilnas else r["pavadinimas"][:220]) or "(pavadinimo lietuvių kalba nėra)"))


def sutrumpink(t):
    """Savaitinei užduočiai: teismo dokumento pradžia (šalys, raktiniai žodžiai) ir rezoliucinė dalis ar išvados siūlymas;
    kitų dokumentų - pradžia. Sutrumpinimas pažymimas, kad jo nebūtų galima palaikyti visu tekstu."""
    for zyme in ("nusprendžia:", "siūlau Teisingumo Teismui"):
        i = t.rfind(zyme)
        if i > 3000:
            return t[:3000] + "\n[... tekstas sutrumpintas: rodoma pradžia ir pabaiga nuo „" + zyme + "“; visas tekstas - be --trumpai ...]\n" + t[i:i + 9000]
    if len(t) <= 12000:
        return t
    return t[:12000] + "\n[... tekstas sutrumpintas: rodoma pradžia (12 000 ženklų iš %d); visas tekstas - be --trumpai ...]\n" % len(t)


def tekstas(celex, kalba, trumpai=False):
    if not re.match(r"^[0-9A-Z_()]{6,20}$", celex):
        sys.exit("Netinkamas CELEX numeris")
    antrastes = dict(UA, **{"Accept": "application/xhtml+xml,text/html;q=0.9", "Accept-Language": kalba})
    try:
        with urllib.request.urlopen(urllib.request.Request(SAUGYKLA + celex, headers=antrastes), timeout=120) as f:
            dalys = [f.read()]
    except urllib.error.HTTPError as e:
        if e.code != 300:  # 300 - dokumentas iš kelių dalių (pvz. pasiūlymas ir jo priedai)
            sys.exit("Teksto gauti nepavyko: HTTP %d" % e.code)
        nuorodos = re.findall(r'href="([^"]+/DOC_\d+)"', e.read().decode("utf-8", "replace"))
        if not nuorodos:
            sys.exit("Teksto gauti nepavyko: dokumento dalių nerasta")
        dalys = []
        for n in nuorodos[:4]:
            with urllib.request.urlopen(urllib.request.Request(n, headers=UA), timeout=180) as f:
                dalys.append(f.read())
    t = b"\n".join(dalys).decode("utf-8", "replace")
    t = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", t)
    t = re.sub(r"(?i)</(p|div|tr|li|h\d|table|td)>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    t = re.sub(r"[ \t ]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    sys.stdout.write(sutrumpink(t) if trumpai else t)


def main():
    p = argparse.ArgumentParser(description="ES teisės registro šaltinių patikra (registro nekeičia)")
    k = p.add_subparsers(dest="komanda", required=True)
    n = k.add_parser("nauji", help="dokumentai, kurių registre dar nėra")
    n.add_argument("--nuo", help="data YYYY-MM-DD")
    n.add_argument("--visi", action="store_true", help="rodyti ir jau esančius registre")
    n.add_argument("--pilnas", action="store_true", help="rodyti visą pavadinimą (bylų pavadinimuose - ir nagrinėti klausimai)")
    t = k.add_parser("tekstas", help="dokumento tekstas pagal CELEX numerį")
    t.add_argument("celex")
    t.add_argument("--kalba", default="lit", help="kalbos kodas (lit, eng, ...)")
    t.add_argument("--trumpai", action="store_true", help="tik pradžia ir rezoliucinė dalis (teismo dokumentams) arba pradžia")
    a = p.parse_args()
    if a.komanda == "nauji":
        if a.nuo:
            try:
                if not re.match(r"^\d{4}-\d{2}-\d{2}$", a.nuo): raise ValueError
                datetime.date.fromisoformat(a.nuo)
            except ValueError:  # neegzistuojanti data duomenų bazėje duotų „rasta 0“ - tai būtų melagingas „naujų nėra“
                sys.exit("Data turi būti tikra, YYYY-MM-DD")
        nauji(a.nuo, a.visi, a.pilnas)
    else:
        tekstas(a.celex.upper(), a.kalba, a.trumpai)


if __name__ == "__main__":
    main()
