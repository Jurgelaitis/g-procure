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

  python3 PP-teise/es-saltiniai.py eiga [2026/0265(COD) ...] [--rasyk]
      Komisijos pasiūlymų svarstymo eiga Europos Parlamente (nuo 2026-11-19): registro įrašams su teisėkūros procedūros
      numeriu (identifikatoriai.proceduraNr) - etapas pagal ES leidinių biuro etapų sąrašą (procedure-phase), Parlamento
      veiksmai pagal Europos Parlamento atvirų duomenų API (data.europarl.europa.eu, JSON-LD) ir, kai pavyksta, būsena bei
      preliminari plenarinio posėdžio data iš Teisės aktų rengimo observatorijos (OEIL). Be --rasyk - tik parodo, kas
      pasikeistų; su --rasyk - įrašo įrašų projektoEiga ir naują meta.versija. Tarybos eigos šie šaltiniai nerodo.
      Nepavykusi patikra - klaida ir klaidos kodas, registras nekeičiamas (niekada nerašoma „eiga nežinoma“ ar „pokyčių nėra“).

Komandos nauji ir tekstas registro nekeičia, eiga - tik su --rasyk. Nuo 2026-11-13 nauji ir tekstas kas pirmadienį paleidžia
savaitinė užduotis (pp-teise-savaitine-patikra): aiškiai pirkimų dokumentų faktus ji įrašo į registrą pati, kitus - tik į ataskaitą
(žr. docs/teise/administravimas.md). Sąrašas nėra išsamus: naujausi Teisingumo Teismo dokumentai duomenų bazėje su direktyvomis
susiejami ne iš karto.
"""
import argparse
import datetime
import html
import json
import os
import re
import sys
import time
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


# ---------------------------------------------------------------------------------------------------------------------------
# Pasiūlymų svarstymo eiga Europos Parlamente (nuo 2026-11-19)
# ---------------------------------------------------------------------------------------------------------------------------
EP_API = "https://data.europarl.europa.eu/api/v2/procedures/"
OEIL = "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference="
PROCEDURA_RE = re.compile(r"^(\d{4})/(\d{4})\(([A-Z]{3})\)$")
DATA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Etapai - ES leidinių biuro sąrašas „procedure-phase“ (publications.europa.eu/resource/authority/procedure-phase),
# lietuviški pavadinimai iš paties sąrašo (skos:prefLabel lt; patikrinta 2026-11-19). Nežinomas kodas - klaida, ne spėjimas.
ETAPAI = {
    "PROP": "Pasiūlymas", "RDG1": "Pirmasis svarstymas", "RDG2": "Antrasis svarstymas", "RDG3": "Trečiasis svarstymas",
    "CONCILIA": "Taikinimas", "CONCILIA_RDG3": "Taikinimas ir trečiasis svarstymas", "NGT": "Derybos",
    "PROC_END": "Procedūros pabaiga", "INI_LEGIS": "Teisėkūros iniciatyva", "OP_DATPRO": "Laikinieji duomenys",
}

# Europos Parlamento veiksmai - EP žodynas „ep-activities“ (data.europarl.europa.eu/api/v2/controlled-vocabularies/ep-activities).
# Žodyno lietuviški pavadinimai dalyviniai („Parlamento komitetas, priimantis nuomonę“), todėl tekstai čia - sakiniai, o prasmė
# sutikrinta su Teisėkūros observatorijos (OEIL) įvykių pavadinimais (2026-11-19: REFERRAL - „Committee referral announced in
# Parliament, 1st reading“, COMMITTEE_TABLING_REPORT - „Committee draft report“, COMMITTEE_TABLING_AMENDMENT - „Amendments tabled
# in committee“, COMMITTEE_ADOPTING_OPINION - „Committee opinion“). (vienaskaita, daugiskaita) - daugiskaita, kai tos pačios rūšies
# veiksmų tame pačiame etape keli. Nežinomas kodas rašomas kodu ir pranešamas prižiūrėtojui (įrašomas, nes tai faktas).
VEIKLOS = {
    "REFERRAL": ("Plenariniame posėdyje paskelbta, kad pasiūlymas perduotas atsakingam komitetui", None),
    "COMMITTEE_APPOINT_RAPPORTEUR": ("Paskirtas pranešėjas", "Paskirti pranešėjai"),
    "COMMITTEE_TABLING_REPORT": ("Atsakingame komitete pateiktas pranešimo projektas", "Atsakingame komitete pateikti pranešimų projektai"),
    "COMMITTEE_TABLING_AMENDMENT": ("Atsakingame komitete pateiktas pakeitimų dokumentas", "Atsakingame komitete pateikti pakeitimų dokumentai"),
    "COMMITTEE_ADOPTING_OPINION": ("Nuomonę teikiantis komitetas priėmė nuomonę", "Nuomonę teikiantys komitetai priėmė nuomones"),
    "COMMITTEE_DEBATE": ("Svarstyta Parlamento komitete", None),
    "COMMITTEE_VOTE": ("Balsuota Parlamento komitete", None),
    "COMMITTEE_ADOPTING_REPORT": ("Atsakingas komitetas priėmė pranešimą", None),
    "COMMITTEE_APPROVE_PROVISIONAL_AGREEMENT": ("Atsakingas komitetas pritarė preliminariam susitarimui su Taryba", None),
    "COMMITTEE_VOTE_PROVISIONAL_AGREEMENT": ("Atsakingame komitete balsuota dėl preliminaraus susitarimo su Taryba", None),
    "COMMITTEE_REJECT_PROVISIONAL_AGREEMENT": ("Atsakingas komitetas atmetė preliminarų susitarimą su Taryba", None),
    "INTERINSTITUTIONAL_NEGOTIATION": ("Tarpinstitucinės derybos su Taryba", None),
    "INTERINSTITUTIONAL_NEGOTIATIONS_MEETING": ("Tarpinstitucinių derybų susitikimas", "Tarpinstitucinių derybų susitikimai"),
    "PLENARY_ENDORSE_COMMITTEE_INTERINSTITUTIONAL_NEGOTIATIONS": ("Plenariniame posėdyje pritarta atsakingo komiteto sprendimui pradėti derybas su Taryba", None),
    "PLENARY_REJECT_COMMITTEE_INTERINSTITUTIONAL_NEGOTIATIONS": ("Plenariniame posėdyje atmestas atsakingo komiteto sprendimas pradėti derybas su Taryba", None),
    "PLENARY_REFER_COMMITTEE_INTERINSTITUTIONAL_NEGOTIATIONS": ("Plenariniame posėdyje klausimas grąžintas atsakingam komitetui derėtis su Taryba", None),
    "PLENARY_REFER_COMMITTEE_RECONSIDERATION": ("Plenariniame posėdyje klausimas grąžintas atsakingam komitetui nagrinėti iš naujo", None),
    "TABLING_PLENARY": ("Dokumentas pateiktas plenariniam posėdžiui", "Dokumentai pateikti plenariniam posėdžiui"),
    "PLENARY_DEBATE": ("Diskusijos plenariniame posėdyje", None),
    "PLENARY_VOTE": ("Balsavimas plenariniame posėdyje", None),
    "PLENARY_ADOPT_POSITION": ("Parlamentas priėmė poziciją per pirmąjį svarstymą", None),
    "PLENARY_AMEND_PROPOSAL": ("Parlamentas priėmė poziciją su pakeitimais per pirmąjį svarstymą", None),
    "PLENARY_DECISION": ("Parlamento sprendimas plenariniame posėdyje", None),
    "PLENARY_REJECT_PROPOSAL": ("Plenariniame posėdyje pasiūlymas atmestas", None),
    "PLENARY_APPROVE_REQUEST_PROCEDURE_URGENT": ("Plenariniame posėdyje patvirtinta skubos tvarka", None),
    "ANNOUNCE_PLENARY_COUNCIL_POSITION": ("Plenariniame posėdyje paskelbta Tarybos pozicija, priimta per pirmąjį svarstymą", None),
    "PLENARY_APPROVE_COUNCIL_POSITION": ("Parlamentas per antrąjį svarstymą pritarė Tarybos pozicijai (aktas priimtas)", None),
    "PLENARY_AMEND_COUNCIL_POSITION": ("Parlamentas per antrąjį svarstymą priėmė Tarybos pozicijos pakeitimus", None),
    "PLENARY_REJECT_COUNCIL_POSITION": ("Parlamentas per antrąjį svarstymą atmetė Tarybos poziciją", None),
    "REQUEST_CONCILIATION_COMMITTEE": ("Sušauktas Taikinimo komitetas", None),
    "PLENARY_ADOPT_JOINT_TEXT": ("Parlamentas patvirtino Taikinimo komitete suderintą tekstą", None),
    "PLENARY_REJECT_JOINT_TEXT": ("Parlamentas atmetė Taikinimo komitete suderintą tekstą", None),
    "SIGNATURE": ("Aktas pasirašytas", None),
    "PUBLICATION_OFFICIAL_JOURNAL": ("Aktas paskelbtas Europos Sąjungos oficialiajame leidinyje", None),
    "NATIONAL_CHAMBER_SUBMIT_CONTRIBUTION": ("Nacionalinio parlamento rūmai pateikė nuomonę", "Nacionalinių parlamentų rūmai pateikė nuomones"),
    "NATIONAL_CHAMBER_SUBMIT_OPINION": ("Nacionalinio parlamento rūmai pateikė pagrįstą nuomonę", "Nacionalinių parlamentų rūmai pateikė pagrįstas nuomones"),
}

# Teisėkūros observatorijos (OEIL) laukas „Stage reached in procedure“ - tik žinomos reikšmės; kita rodoma angliškai su pastaba.
OEIL_BUSENOS = {
    "Preparatory phase in Parliament": "parengiamasis etapas Parlamente",
    "Awaiting committee decision": "laukiama atsakingo komiteto sprendimo",
    "Awaiting Parliament's position in 1st reading": "laukiama Parlamento pozicijos per pirmąjį svarstymą",
    "Awaiting Parliament 1st reading / single reading / budget 1st stage": "laukiama Parlamento sprendimo per pirmąjį svarstymą",
    "Awaiting Council's 1st reading position": "laukiama Tarybos pozicijos per pirmąjį svarstymą",
    "Awaiting Parliament's position in 2nd reading": "laukiama Parlamento pozicijos per antrąjį svarstymą",
    "Awaiting signature of act": "laukiama akto pasirašymo",
    "Procedure completed": "procedūra baigta",
    "Procedure completed, awaiting publication in Official Journal": "procedūra baigta, laukiama paskelbimo Oficialiajame leidinyje",
    "Procedure lapsed or withdrawn": "procedūra nebetęsiama arba pasiūlymas atsiimtas",
    "Procedure rejected": "pasiūlymas atmestas",
}
OEIL_PROGNOZES = {
    "Indicative plenary sitting date, 1st reading": "preliminari plenarinio posėdžio data (pirmasis svarstymas)",
    "Indicative plenary sitting date, 2nd reading": "preliminari plenarinio posėdžio data (antrasis svarstymas)",
    "Indicative plenary sitting date": "preliminari plenarinio posėdžio data",
    "Vote scheduled in committee, 1st reading": "planuojamas balsavimas atsakingame komitete (pirmasis svarstymas)",
    "Vote scheduled in committee, 2nd reading": "planuojamas balsavimas atsakingame komitete (antrasis svarstymas)",
}


def mazaja(t):
    return t[:1].lower() + t[1:] if t else t


def procedura_is_iraso(r):
    """Teisėkūros procedūros numeris („2026/0265(COD)“): identifikatoriai.proceduraNr, projektoEiga.procedura arba busenoje."""
    i = r.get("identifikatoriai") or {}
    e = r.get("projektoEiga") or {}
    for t in (i.get("proceduraNr"), e.get("procedura")):
        if isinstance(t, str) and PROCEDURA_RE.match(t.strip()):
            return t.strip()
    m = re.search(r"\d{4}/\d{4}\([A-Z]{3}\)", str(e.get("busena") or ""))
    return m.group(0) if m else None


def oeil_adresas(proc):
    return OEIL + urllib.parse.quote(proc, safe="/()")


def ep_adresas(proc):
    m = PROCEDURA_RE.match(proc)
    return EP_API + m.group(1) + "-" + m.group(2) + "?format=application%2Fld%2Bjson"


def is_ep(d, proc):
    """EP API atsakymas (JSON-LD) -> etapas ir veiksmai. Netikėta sandara ar kitos procedūros atsakymas - ValueError."""
    if not isinstance(d, dict) or not isinstance(d.get("data"), list):
        raise ValueError("EP: netikėta atsakymo sandara")
    pr = [x for x in d["data"] if isinstance(x, dict) and x.get("type") == "Process"]
    if len(pr) != 1:
        raise ValueError("EP: atsakyme ne viena procedūra")
    p = pr[0]
    if p.get("label") != proc:
        raise ValueError("EP: atsakymas kitos procedūros (%s)" % p.get("label"))
    st = str(p.get("current_stage") or "").rsplit("/", 1)[-1]
    if st not in ETAPAI:
        raise ValueError("EP: nežinomas etapo kodas „%s“ - papildykite ETAPAI pagal procedure-phase sąrašą" % st)
    grupes, nezinomi, netinkami = {}, [], 0
    for a in p.get("consists_of") or []:
        if not isinstance(a, dict):
            netinkami += 1
            continue
        data, tipas = a.get("activity_date"), str(a.get("had_activity_type") or "")
        kodas = tipas.rsplit("/", 1)[-1] if tipas.startswith("def/ep-activities/") else ""
        if not (isinstance(data, str) and DATA_RE.match(data)) or not kodas:
            netinkami += 1
            continue
        try:
            datetime.date.fromisoformat(data)
        except ValueError:
            netinkami += 1
            continue
        etapas = str(a.get("occured_at_stage") or "").rsplit("/", 1)[-1]
        g = grupes.setdefault((kodas, etapas), {"kodas": kodas, "nuo": data, "iki": data, "kiek": 0})
        g["nuo"], g["iki"], g["kiek"] = min(g["nuo"], data), max(g["iki"], data), g["kiek"] + 1
        if kodas not in VEIKLOS and kodas not in nezinomi:
            nezinomi.append(kodas)
    veiksmai = []
    for g in sorted(grupes.values(), key=lambda g: (g["nuo"], g["iki"], g["kodas"])):
        v = VEIKLOS.get(g["kodas"])
        tekstas = ((v[1] if g["kiek"] > 1 and v[1] else v[0]) if v else "Europos Parlamento veiksmas (EP kodas %s)" % g["kodas"])
        if g["kiek"] > 1:
            tekstas += " (%d)" % g["kiek"]
        veiksmai.append({"nuo": g["nuo"], "iki": g["iki"], "kodas": g["kodas"], "kiek": g["kiek"], "tekstas": tekstas})
    pask = max(veiksmai, key=lambda v: (v["iki"], v["nuo"])) if veiksmai else None
    return {"etapas": {"kodas": st, "pavadinimas": ETAPAI[st]}, "veiksmai": veiksmai,
            "paskutinisVeiksmas": {"data": pask["iki"], "kodas": pask["kodas"], "tekstas": pask["tekstas"]} if pask else None,
            "nezinomi": nezinomi, "netinkami": netinkami}


def _svarus(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def is_oeil(t, proc):
    """OEIL puslapis -> būsena („Stage reached in procedure“) ir prognozės („Forecasts“). Kitos procedūros puslapis ar be
    būsenos lauko - None (puslapio sandara galėjo pasikeisti; tada rašoma tik EP API dalis ir tai pasakoma)."""
    if not isinstance(t, str) or proc not in t:
        return None
    m = re.search(r"<th[^>]*>\s*Stage reached in procedure\s*</th>\s*<td[^>]*>(.*?)</td>", t, re.S)
    if not m:
        return None
    en = _svarus(m.group(1))
    prognozes, nezinomi = [], []
    i = t.find(">Forecasts</h2>")
    if i >= 0:
        j = t.find("<tbody>", i)
        k = t.find("</tbody>", j)
        if j >= 0 and k > j and "<h2" not in t[i + 15:j]:
            for eil in re.findall(r"<tr[^>]*>(.*?)</tr>", t[j:k], re.S):
                td = [_svarus(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", eil, re.S)]
                dm = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", td[0]) if len(td) == 2 else None
                if not dm:
                    continue
                iso = "%s-%s-%s" % (dm.group(3), dm.group(2), dm.group(1))
                try:
                    datetime.date.fromisoformat(iso)
                except ValueError:
                    continue
                lt = OEIL_PROGNOZES.get(td[1])
                if not lt:
                    nezinomi.append(td[1])
                prognozes.append({"data": iso, "tekstas": lt or "„%s“ (OEIL, anglų k.)" % td[1]})
    lt = OEIL_BUSENOS.get(en)
    if en and not lt:
        nezinomi.append(en)
    return {"en": en, "lt": lt or ("„%s“ (OEIL, anglų k.)" % en if en else None), "prognozes": prognozes, "nezinomi": nezinomi}


def sudaryk_eiga(proc, ep, oeil, siandien):
    """projektoEiga įrašas iš EP API ir (jei pavyko) OEIL duomenų."""
    et = ep["etapas"]
    busena = "Europos Parlamento duomenimis - " + mazaja(et["pavadinimas"])
    if oeil and oeil.get("lt"):
        busena += ", " + mazaja(oeil["lt"])
    elif ep.get("paskutinisVeiksmas"):
        busena += ", paskutinis veiksmas " + ep["paskutinisVeiksmas"]["data"]
    ateities = sorted([p for p in (oeil or {}).get("prognozes", []) if p["data"] >= siandien], key=lambda p: p["data"])
    pastaba = "Tikrinta Europos Parlamento atviruose duomenyse ir Teisėkūros observatorijoje (OEIL). Svarstymo Taryboje šie šaltiniai nerodo."
    if ateities:
        pastaba += " Preliminari data - Parlamento planas, ji gali keistis."
    if oeil is None:
        pastaba += " Teisėkūros observatorijos būsenos ir preliminarių datų gauti nepavyko - rodomi tik Europos Parlamento atvirų duomenų veiksmai."
    return {"busena": busena, "procedura": proc, "etapas": dict(et), "parlamentas": (oeil or {}).get("lt"),
            "paskutinisVeiksmas": ep.get("paskutinisVeiksmas"), "veiksmai": ep.get("veiksmai") or [],
            "prognoze": ateities[0] if ateities else None, "patikrinta": siandien, "saltinis": oeil_adresas(proc), "pastaba": pastaba}


def nauja_versija(sena, siandien):
    """Kaip admin.html: ta pati diena - kitas numeris, kita diena - <šiandien>.1."""
    m = re.match(r"^(\d{4}-\d{2}-\d{2})\.(\d+)$", str(sena or ""))
    return "%s.%d" % (siandien, int(m.group(2)) + 1) if m and m.group(1) == siandien else siandien + ".1"


def taikyk_eiga(reg, eigos, siandien):
    """eigos: {procedūra: projektoEiga}. Grąžina pakeistų įrašų id; pakeitus - nauja meta.versija ir meta.patikrinta.
    Įrašai be gautos eigos neliečiami (jų ankstesnė patikros data lieka)."""
    pakeisti = []
    for r in reg.get("irasai", []):
        if r.get("rusis") != "projektas":
            continue
        proc = procedura_is_iraso(r)
        if proc in eigos and r.get("projektoEiga") != eigos[proc]:
            r["projektoEiga"] = eigos[proc]
            pakeisti.append(r.get("id"))
    if pakeisti:
        m = reg.setdefault("meta", {})
        m["versija"] = nauja_versija(m.get("versija"), siandien)
    return pakeisti


def _gauk(adresas, accept, bandymai=3):
    paskutine = None
    for n in range(bandymai):
        try:
            with urllib.request.urlopen(urllib.request.Request(adresas, headers=dict(UA, Accept=accept)), timeout=90) as f:
                return f.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            paskutine = e
            if e.code < 500 and e.code != 429:
                break
        except Exception as e:  # ryšys, laikas
            paskutine = e
        if n + 1 < bandymai:
            time.sleep(5 * (n + 1))
    raise paskutine


def eiga(proceduros, rasyk):
    try:
        with open(REGISTRAS, encoding="utf-8") as f:
            reg = json.load(f)
    except Exception as e:
        sys.exit("Registro perskaityti nepavyko: %s" % e)
    siandien = datetime.date.today().isoformat()
    turimos = []
    for r in reg.get("irasai", []):
        p = procedura_is_iraso(r) if r.get("rusis") == "projektas" else None
        if p and p not in turimos:
            turimos.append(p)
    for p in proceduros:
        if not PROCEDURA_RE.match(p):
            sys.exit("Netinkamas procedūros numeris „%s“ (pavyzdys: 2026/0265(COD))" % p)
        if p not in turimos:
            sys.exit("Procedūros %s registre nėra - pirmiausia įrašykite pasiūlymą (identifikatoriai.proceduraNr)" % p)
    tikrinti = proceduros or turimos
    if not tikrinti:
        print("Registre nėra pasiūlymų su teisėkūros procedūros numeriu - nėra ką tikrinti.")
        return
    eigos, klaidos = {}, []
    for proc in tikrinti:
        try:
            ep = is_ep(json.loads(_gauk(ep_adresas(proc), "application/ld+json")), proc)
        except Exception as e:
            klaidos.append("%s: Europos Parlamento duomenų gauti nepavyko (%s: %s)" % (proc, type(e).__name__, e))
            continue
        try:
            oeil = is_oeil(_gauk(oeil_adresas(proc), "text/html"), proc)
        except Exception:
            oeil = None
        eigos[proc] = sudaryk_eiga(proc, ep, oeil, siandien)
        e = eigos[proc]
        print("%s  %s" % (proc, e["busena"]))
        if e["paskutinisVeiksmas"]:
            print("    paskutinis veiksmas %s: %s" % (e["paskutinisVeiksmas"]["data"], e["paskutinisVeiksmas"]["tekstas"]))
        if e["prognoze"]:
            print("    %s: %s" % (e["prognoze"]["data"], e["prognoze"]["tekstas"]))
        if oeil is None:
            print("    ! Teisėkūros observatorijos (OEIL) duomenų gauti nepavyko - įrašoma tik EP API dalis")
        for k in ep["nezinomi"] + ((oeil or {}).get("nezinomi") or []):
            print("    ! nežinoma reikšmė „%s“ - papildykite VEIKLOS / OEIL_BUSENOS / OEIL_PROGNOZES" % k)
        if ep["netinkami"]:
            print("    ! praleista netinkamų veiksmų: %d" % ep["netinkami"])
    if rasyk and eigos:
        pakeisti = taikyk_eiga(reg, eigos, siandien)
        if pakeisti:
            with open(REGISTRAS, "w", encoding="utf-8") as f:
                f.write(json.dumps(reg, ensure_ascii=False, indent=2) + "\n")
            print("Įrašyta: %s; meta.versija %s." % (", ".join(pakeisti), reg["meta"]["versija"]))
        else:
            print("Registre eiga ta pati - failas nekeistas.")
    elif eigos:
        print("Registras nekeistas (įrašyti - su --rasyk).")
    if klaidos:
        # Nepavykusi patikra nėra „eiga nepasikeitė“: tų įrašų eiga lieka ankstesnė su ankstesne patikros data.
        sys.exit("PATIKRA NEPAVYKO:\n  " + "\n  ".join(klaidos) + "\nŠių pasiūlymų eiga registre nekeista - tai nereiškia, kad ji nepasikeitė.")


def main():
    p = argparse.ArgumentParser(description="ES teisės registro šaltinių patikra (registrą keičia tik eiga --rasyk)")
    k = p.add_subparsers(dest="komanda", required=True)
    n = k.add_parser("nauji", help="dokumentai, kurių registre dar nėra")
    n.add_argument("--nuo", help="data YYYY-MM-DD")
    n.add_argument("--visi", action="store_true", help="rodyti ir jau esančius registre")
    n.add_argument("--pilnas", action="store_true", help="rodyti visą pavadinimą (bylų pavadinimuose - ir nagrinėti klausimai)")
    t = k.add_parser("tekstas", help="dokumento tekstas pagal CELEX numerį")
    t.add_argument("celex")
    t.add_argument("--kalba", default="lit", help="kalbos kodas (lit, eng, ...)")
    t.add_argument("--trumpai", action="store_true", help="tik pradžia ir rezoliucinė dalis (teismo dokumentams) arba pradžia")
    e = k.add_parser("eiga", help="pasiūlymų svarstymo eiga Europos Parlamente")
    e.add_argument("proceduros", nargs="*", help="procedūrų numeriai, pvz. 2026/0265(COD); be jų - visi registro pasiūlymai su numeriu")
    e.add_argument("--rasyk", action="store_true", help="įrašyti eigą į registrą (kitaip tik parodoma)")
    a = p.parse_args()
    if a.komanda == "eiga":
        eiga(a.proceduros, a.rasyk)
    elif a.komanda == "nauji":
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
