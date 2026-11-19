#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""es-saltiniai.py komandos „eiga“ testai be tinklo (tik Python standartinė biblioteka).

  python3 PP-teise/es-saltiniai-testai.py

Europos Parlamento API ir Teisėkūros observatorijos (OEIL) atsakymai - sumažintos tikrų 2026-11-19 atsakymų kopijos.
Registras - laikinas failas; tikras PP-teise/duomenys/registras-es.json neliečiamas.
"""
import copy
import importlib.util
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout

KELIAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "es-saltiniai.py")
_spec = importlib.util.spec_from_file_location("es_saltiniai", KELIAS)
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)

FAZE = "http://publications.europa.eu/resource/authority/procedure-phase/"


def veikla(data, kodas, etapas="RDG1"):
    return {"type": "Activity", "activity_date": data, "had_activity_type": "def/ep-activities/" + kodas, "occured_at_stage": FAZE + etapas}


def ep_atsakymas(label="2026/0068(COD)", etapas="RDG1", veiklos=None):
    return {"data": [{"id": "eli/dl/proc/2026-0068", "type": "Process", "label": label, "current_stage": FAZE + etapas,
                      "consists_of": veiklos if veiklos is not None else [
                          veikla("2026-04-30", "REFERRAL"), veikla("2026-09-11", "COMMITTEE_TABLING_REPORT"),
                          veikla("2026-10-05", "COMMITTEE_ADOPTING_OPINION"),
                          veikla("2026-10-13", "COMMITTEE_TABLING_AMENDMENT"), veikla("2026-10-19", "COMMITTEE_TABLING_AMENDMENT"),
                          veikla("2026-10-19", "COMMITTEE_TABLING_AMENDMENT")]}], "@context": {}}


def oeil_puslapis(proc="2026/0068(COD)", busena="Awaiting committee decision", prognozes=(("14/12/2026", "Indicative plenary sitting date, 1st reading"),)):
    eil = "".join('<tr>\n<td class="align-middle">%s</td>\n<td class="align-middle">%s</td>\n</tr>' % p for p in prognozes)
    return ('<html><h2 class="es_title-h2 mb-2">Forecasts</h2><div><table><thead><tr><th>Date</th><th>Subject</th></tr></thead>'
            '<tbody>%s</tbody></table></div>'
            '<table><tr><th class="align-middle" scope="row">Procedure reference</th><td>%s</td></tr>'
            '<tr>\n <th class="align-middle" scope="row">Stage reached in procedure</th>\n <td class="align-middle">%s</td>\n</tr></table></html>') % (eil, proc, busena)


class IsEp(unittest.TestCase):
    def test_veiksmai_ir_paskutinis(self):
        r = M.is_ep(ep_atsakymas(), "2026/0068(COD)")
        self.assertEqual(r["etapas"], {"kodas": "RDG1", "pavadinimas": "Pirmasis svarstymas"})
        self.assertEqual([(v["nuo"], v["iki"], v["kodas"], v["kiek"]) for v in r["veiksmai"]],
                         [("2026-04-30", "2026-04-30", "REFERRAL", 1), ("2026-09-11", "2026-09-11", "COMMITTEE_TABLING_REPORT", 1),
                          ("2026-10-05", "2026-10-05", "COMMITTEE_ADOPTING_OPINION", 1), ("2026-10-13", "2026-10-19", "COMMITTEE_TABLING_AMENDMENT", 3)])
        self.assertEqual(r["veiksmai"][3]["tekstas"], "Atsakingame komitete pateikti pakeitimų dokumentai (3)")
        self.assertEqual(r["veiksmai"][1]["tekstas"], "Atsakingame komitete pateiktas pranešimo projektas")
        self.assertEqual(r["paskutinisVeiksmas"], {"data": "2026-10-19", "kodas": "COMMITTEE_TABLING_AMENDMENT", "tekstas": "Atsakingame komitete pateikti pakeitimų dokumentai (3)"})
        self.assertEqual((r["nezinomi"], r["netinkami"]), ([], 0))

    def test_ta_pati_rusis_kitame_etape_atskirai(self):
        r = M.is_ep(ep_atsakymas(etapas="RDG2", veiklos=[veikla("2026-01-10", "PLENARY_VOTE", "RDG1"), veikla("2027-03-01", "PLENARY_VOTE", "RDG2")]), "2026/0068(COD)")
        self.assertEqual([(v["nuo"], v["kiek"]) for v in r["veiksmai"]], [("2026-01-10", 1), ("2027-03-01", 1)])
        self.assertEqual(r["etapas"]["pavadinimas"], "Antrasis svarstymas")

    def test_paskutinis_pagal_veliausia_data(self):
        r = M.is_ep(ep_atsakymas(veiklos=[veikla("2026-10-13", "COMMITTEE_TABLING_AMENDMENT"), veikla("2026-10-19", "COMMITTEE_TABLING_AMENDMENT"),
                                          veikla("2026-10-15", "COMMITTEE_ADOPTING_OPINION")]), "2026/0068(COD)")
        self.assertEqual([v["kodas"] for v in r["veiksmai"]], ["COMMITTEE_TABLING_AMENDMENT", "COMMITTEE_ADOPTING_OPINION"])
        self.assertEqual(r["paskutinisVeiksmas"]["kodas"], "COMMITTEE_TABLING_AMENDMENT")

    def test_daugiskaita_be_formos(self):
        r = M.is_ep(ep_atsakymas(veiklos=[veikla("2026-05-01", "PLENARY_DEBATE"), veikla("2026-05-02", "PLENARY_DEBATE")]), "2026/0068(COD)")
        self.assertEqual(r["veiksmai"][0]["tekstas"], "Diskusijos plenariniame posėdyje (2)")

    def test_nezinomas_ir_netinkami(self):
        r = M.is_ep(ep_atsakymas(veiklos=[veikla("2026-05-01", "NAUJA_RUSIS"), veikla("2026-02-30", "REFERRAL"), veikla("2026/05/01", "REFERRAL"),
                                          {"activity_date": "2026-05-01", "had_activity_type": "kita/REFERRAL"}, "x"]), "2026/0068(COD)")
        self.assertEqual(r["nezinomi"], ["NAUJA_RUSIS"])
        self.assertEqual(r["netinkami"], 4)
        self.assertEqual(r["veiksmai"][0]["tekstas"], "Europos Parlamento veiksmas (EP kodas NAUJA_RUSIS)")

    def test_be_veiksmu(self):
        r = M.is_ep(ep_atsakymas(veiklos=[]), "2026/0068(COD)")
        self.assertEqual((r["veiksmai"], r["paskutinisVeiksmas"]), ([], None))

    def test_klaidos(self):
        with self.assertRaisesRegex(ValueError, "kitos procedūros"):
            M.is_ep(ep_atsakymas(label="2026/0011(COD)"), "2026/0068(COD)")
        with self.assertRaisesRegex(ValueError, "nežinomas etapo kodas"):
            M.is_ep(ep_atsakymas(etapas="RDG9"), "2026/0068(COD)")
        with self.assertRaisesRegex(ValueError, "sandara"):
            M.is_ep({"duomenys": []}, "2026/0068(COD)")
        with self.assertRaisesRegex(ValueError, "ne viena"):
            M.is_ep({"data": []}, "2026/0068(COD)")


class IsOeil(unittest.TestCase):
    def test_busena_ir_prognoze(self):
        r = M.is_oeil(oeil_puslapis(), "2026/0068(COD)")
        self.assertEqual(r["en"], "Awaiting committee decision")
        self.assertEqual(r["lt"], "laukiama atsakingo komiteto sprendimo")
        self.assertEqual(r["prognozes"], [{"data": "2026-12-14", "tekstas": "preliminari plenarinio posėdžio data (pirmasis svarstymas)"}])
        self.assertEqual(r["nezinomi"], [])

    def test_nezinomos_reiksmes_angliskai(self):
        r = M.is_oeil(oeil_puslapis(busena="Awaiting something new &amp; else", prognozes=(("01/02/2027", "Brand new forecast"), ("31/02/2027", "Indicative plenary sitting date"))), "2026/0068(COD)")
        self.assertEqual(r["lt"], "„Awaiting something new & else“ (OEIL, anglų k.)")
        self.assertEqual(r["prognozes"], [{"data": "2027-02-01", "tekstas": "„Brand new forecast“ (OEIL, anglų k.)"}])
        self.assertEqual(r["nezinomi"], ["Brand new forecast", "Awaiting something new & else"])

    def test_kitos_proceduros_ar_be_lauko(self):
        self.assertIsNone(M.is_oeil(oeil_puslapis(proc="2026/0011(COD)"), "2026/0068(COD)"))
        self.assertIsNone(M.is_oeil("<html>2026/0068(COD)</html>", "2026/0068(COD)"))
        self.assertIsNone(M.is_oeil(None, "2026/0068(COD)"))

    def test_be_prognoziu_ir_svetima_lentele(self):
        t = oeil_puslapis(prognozes=()).replace("<tbody></tbody>", "") + '<h2>Key players</h2><tbody><tr><td>01/01/2027</td><td>Indicative plenary sitting date</td></tr></tbody>'
        self.assertEqual(M.is_oeil(t, "2026/0068(COD)")["prognozes"], [])


class Sudaryk(unittest.TestCase):
    def test_su_oeil(self):
        ep = M.is_ep(ep_atsakymas(), "2026/0068(COD)")
        e = M.sudaryk_eiga("2026/0068(COD)", ep, M.is_oeil(oeil_puslapis(), "2026/0068(COD)"), "2026-11-19")
        self.assertEqual(e["busena"], "Europos Parlamento duomenimis - pirmasis svarstymas, laukiama atsakingo komiteto sprendimo")
        self.assertEqual(e["prognoze"]["data"], "2026-12-14")
        self.assertEqual(e["saltinis"], "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2026/0068(COD)")
        self.assertEqual((e["procedura"], e["patikrinta"], e["parlamentas"]), ("2026/0068(COD)", "2026-11-19", "laukiama atsakingo komiteto sprendimo"))
        self.assertIn("Svarstymo Taryboje šie šaltiniai nerodo.", e["pastaba"])
        self.assertIn("Preliminari data - Parlamento planas", e["pastaba"])
        self.assertNotIn("nepavyko", e["pastaba"])

    def test_praejusi_prognoze_nerodoma(self):
        ep = M.is_ep(ep_atsakymas(), "2026/0068(COD)")
        e = M.sudaryk_eiga("2026/0068(COD)", ep, M.is_oeil(oeil_puslapis(prognozes=(("01/11/2026", "Indicative plenary sitting date"), ("05/01/2027", "Indicative plenary sitting date"))), "2026/0068(COD)"), "2026-11-19")
        self.assertEqual(e["prognoze"]["data"], "2027-01-05")
        e = M.sudaryk_eiga("2026/0068(COD)", ep, M.is_oeil(oeil_puslapis(prognozes=(("01/11/2026", "Indicative plenary sitting date"),)), "2026/0068(COD)"), "2026-11-19")
        self.assertIsNone(e["prognoze"])
        self.assertNotIn("Preliminari data", e["pastaba"])

    def test_be_oeil(self):
        ep = M.is_ep(ep_atsakymas(), "2026/0068(COD)")
        e = M.sudaryk_eiga("2026/0068(COD)", ep, None, "2026-11-19")
        self.assertEqual(e["busena"], "Europos Parlamento duomenimis - pirmasis svarstymas, paskutinis veiksmas 2026-10-19")
        self.assertIsNone(e["parlamentas"])
        self.assertIn("Teisėkūros observatorijos būsenos ir preliminarių datų gauti nepavyko", e["pastaba"])


class Registras(unittest.TestCase):
    def test_procedura_is_iraso(self):
        self.assertEqual(M.procedura_is_iraso({"identifikatoriai": {"proceduraNr": " 2026/0265(COD) "}}), "2026/0265(COD)")
        self.assertEqual(M.procedura_is_iraso({"projektoEiga": {"procedura": "2026/0011(COD)"}}), "2026/0011(COD)")
        self.assertEqual(M.procedura_is_iraso({"projektoEiga": {"busena": "Pasiūlymas (2026/0068(COD)) pateiktas"}}), "2026/0068(COD)")
        self.assertIsNone(M.procedura_is_iraso({"identifikatoriai": {"proceduraNr": "2026/265(COD)"}}))
        self.assertIsNone(M.procedura_is_iraso({}))

    def test_versija(self):
        self.assertEqual(M.nauja_versija("2026-11-19.3", "2026-11-19"), "2026-11-19.4")
        self.assertEqual(M.nauja_versija("2026-11-13.2", "2026-11-19"), "2026-11-19.1")
        self.assertEqual(M.nauja_versija(None, "2026-11-19"), "2026-11-19.1")
        self.assertEqual(M.nauja_versija("bloga", "2026-11-19"), "2026-11-19.1")

    def test_taikyk(self):
        reg = {"meta": {"versija": "2026-11-13.2"}, "irasai": [
            {"id": "a", "rusis": "projektas", "identifikatoriai": {"proceduraNr": "2026/0265(COD)"}, "projektoEiga": {"busena": "sena"}},
            {"id": "b", "rusis": "priimtas", "identifikatoriai": {"proceduraNr": "2026/0265(COD)"}},
            {"id": "c", "rusis": "projektas", "identifikatoriai": {"proceduraNr": "2026/0011(COD)"}, "projektoEiga": {"busena": "nekeičiama"}}]}
        nauja = {"busena": "nauja", "procedura": "2026/0265(COD)"}
        self.assertEqual(M.taikyk_eiga(reg, {"2026/0265(COD)": nauja}, "2026-11-19"), ["a"])
        self.assertEqual((reg["irasai"][0]["projektoEiga"], "projektoEiga" in reg["irasai"][1], reg["irasai"][2]["projektoEiga"]["busena"], reg["meta"]["versija"]),
                         (nauja, False, "nekeičiama", "2026-11-19.1"))
        self.assertEqual(M.taikyk_eiga(reg, {"2026/0265(COD)": dict(nauja)}, "2026-11-19"), [])
        self.assertEqual(reg["meta"]["versija"], "2026-11-19.1")


class Komanda(unittest.TestCase):
    """eiga() su laikinu registru ir netikru tinklu."""

    def setUp(self):
        self.d = tempfile.mkdtemp()
        self.kelias = os.path.join(self.d, "registras-es.json")
        self.reg = {"meta": {"versija": "2026-11-13.2", "patikrinta": "2026-11-19"}, "irasai": [
            {"id": "p1", "rusis": "projektas", "identifikatoriai": {"proceduraNr": "2026/0068(COD)"}, "projektoEiga": {"busena": "rankinė", "patikrinta": "2026-11-13"}},
            {"id": "p2", "rusis": "projektas", "identifikatoriai": {"proceduraNr": "2026/0011(COD)"}, "projektoEiga": {"busena": "rankinė", "patikrinta": "2026-11-13"}}]}
        with open(self.kelias, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.reg, ensure_ascii=False, indent=2) + "\n")
        self.senas = (M.REGISTRAS, M._gauk)
        M.REGISTRAS = self.kelias
        self.kvietimai = []

    def tearDown(self):
        M.REGISTRAS, M._gauk = self.senas

    def tinklas(self, nepavyksta=()):
        def gauk(adresas, accept, bandymai=3):
            self.kvietimai.append((adresas, accept))
            if any(n in adresas for n in nepavyksta):
                raise OSError("ryšys")
            proc = "2026/0068(COD)" if "0068" in adresas else "2026/0011(COD)"
            if adresas.startswith(M.EP_API):
                return json.dumps(ep_atsakymas(label=proc))
            return oeil_puslapis(proc=proc)
        M._gauk = gauk

    def paleisk(self, *a, **k):
        out = io.StringIO()
        with redirect_stdout(out):
            M.eiga(*a, **k)
        return out.getvalue()

    def registras(self):
        with open(self.kelias, encoding="utf-8") as f:
            return f.read()

    def test_be_rasyk_nekeicia(self):
        self.tinklas()
        pries = self.registras()
        out = self.paleisk([], False)
        self.assertEqual(self.registras(), pries)
        self.assertIn("Registras nekeistas", out)
        self.assertIn(("https://data.europarl.europa.eu/api/v2/procedures/2026-0068?format=application%2Fld%2Bjson", "application/ld+json"), self.kvietimai)

    def test_rasyk(self):
        self.tinklas()
        out = self.paleisk([], True)
        t = self.registras()
        r = json.loads(t)
        self.assertTrue(t.endswith("}\n") and '"busena": "Europos Parlamento duomenimis' in t)
        self.assertIn("Teisėkūros observatorijoje", t, "lietuviškos raidės, ne \\u kodai (kaip registro failas)")
        self.assertEqual(r["meta"]["versija"][-2:], ".1")
        self.assertTrue(all(i["projektoEiga"]["etapas"]["kodas"] == "RDG1" for i in r["irasai"]))
        self.assertIn("Įrašyta: p1, p2", out)
        self.paleisk([], True)
        self.assertEqual(json.loads(self.registras())["meta"]["versija"], r["meta"]["versija"], "nepakitus - versija ta pati")

    def test_dalis_nepavyksta(self):
        self.tinklas(nepavyksta=("procedures/2026-0011",))
        with self.assertRaises(SystemExit) as e:
            self.paleisk([], True)
        self.assertIn("PATIKRA NEPAVYKO", str(e.exception))
        self.assertIn("2026/0011(COD)", str(e.exception))
        r = json.loads(self.registras())
        self.assertEqual(r["irasai"][0]["projektoEiga"]["procedura"], "2026/0068(COD)")
        self.assertEqual(r["irasai"][1]["projektoEiga"], {"busena": "rankinė", "patikrinta": "2026-11-13"}, "nepavykusio - nekeista")

    def test_oeil_nepavyksta(self):
        self.tinklas(nepavyksta=("oeil.europarl",))
        out = self.paleisk(["2026/0068(COD)"], True)
        r = json.loads(self.registras())
        self.assertIn("paskutinis veiksmas", r["irasai"][0]["projektoEiga"]["busena"])
        self.assertEqual(r["irasai"][1]["projektoEiga"]["busena"], "rankinė", "netikrintas - nekeistas")
        self.assertIn("OEIL", out)

    def test_netinkamas_ar_nezinomas_numeris(self):
        self.tinklas()
        with self.assertRaisesRegex(SystemExit, "Netinkamas"):
            self.paleisk(["2026/68(COD)"], True)
        with self.assertRaisesRegex(SystemExit, "registre nėra"):
            self.paleisk(["2025/0001(COD)"], True)
        self.assertEqual(self.kvietimai, [])

    def test_be_pasiulymu(self):
        with open(self.kelias, "w", encoding="utf-8") as f:
            json.dump({"meta": {}, "irasai": []}, f)
        self.tinklas()
        self.assertIn("nėra ką tikrinti", self.paleisk([], True))
        self.assertEqual(self.kvietimai, [])


if __name__ == "__main__":
    unittest.main(verbosity=1)
