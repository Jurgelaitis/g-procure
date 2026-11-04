#!/usr/bin/env python3
"""Rinkos rodiklių ribų skaičiavimas (PP-market-KPI, naudotojo sprendimas 2026-11-04). Paleisti kartą per metus:

    python3 docs/market-kpi/ribu-skaiciavimas.py

Taisyklė: geltona - 75-as, raudona - 95-as procentilis pagal pokyčius nuo 2015 m. tame pačiame lange, kaip rodiklio palyginimas modulyje,
be 2021-04 - 2023-12 kainų šoko ir be 2019 m. mokesčių reformos šuolio darbo užmokesčio rodikliuose; ne mažiau kaip 3 ir 5 %. Procentiliai - su interpoliacija,
ribos suapvalintos iki sveiko skaičiaus. Vandens transportas (H50): ES vidurkis tik nuo 2021 m., be šoko liktų 10 taškų, todėl - visa eilutė.
GSCPI (lygis, standartiniai nuokrypiai) - ne pagal šią taisyklę: 1 ir 2.

Šaltiniai - vieši, be rakto: DBnomics (IMF PCPS, BLS - FRED eilučių kilmė), EIA (savaitinė nafta), OSP (VDA), Eurostat ir G-Procure /api/rinka (naujausi 24 mėn.).
Išveda lentelę ir, kiek laikotarpių rodiklis būtų raudonas; modulio ribas keičia žmogus (DEFAULT_DATA thr), kartu su ribos-*.md.
"""
import json, re, urllib.request

H = {"User-Agent": "g-procure-ribos", "Origin": "https://g-procure.com"}


def gauk(u, laikas=120):
    return urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=laikas).read()


DBNOMICS = {"lme_al": "IMF/PCPS/M.W00.PALUM.USD", "lme_cu": "IMF/PCPS/M.W00.PCOPP.USD", "dujos_eu": "IMF/PCPS/M.W00.PNGASEU.USD",
            "gelezies_ruda": "IMF/PCPS/M.W00.PIORECR.USD", "nikelis": "IMF/PCPS/M.W00.PNICK.USD", "cinkas": "IMF/PCPS/M.W00.PZINC.USD",
            "plienas": "BLS/wp/WPU1017", "plieno_vamzdziai": "BLS/wp/WPU101706", "container": "BLS/pc/PCU483111483111", "aircargo": "BLS/ei/EIUIC131"}
EIA = {"brent": "RBRTE", "wti": "RWTC"}
OSP = {"sski": ("S7R287_M2020423_2", ["Inžineriniai statiniai"]), "sski_med": ("S7R287_M2020424_2", ["Medžiagos ir gaminiai"]),
       "sski_mas": ("S7R287_M2020424_2", ["Mašinų ir mechanizmų darbas"]), "sski_du": ("S7R287_M2020424_2", ["Darbo užmokestis ir pridėtinės išlaidos"]),
       "gki": ("S7R130_M2020330", ["Pramonė", "Visa rinka"]), "vki": ("S7R330_M2020121_2", ["Visos vartojimo prekės ir paslaugos"]),
       "vmdu": ("S3R0050_M3060322", ["Bruto", "Lietuvos Respublika", "Šalies ūkis su individualiosiomis įmonėmis", "Vyrai ir moterys"])}
EU_Q = {"transp_vanduo": "H50", "transp_oras": "H51"}
TVARKA = ["brent", "wti", "lme_al", "lme_cu", "polymers", "dujos_eu", "plienas", "plieno_vamzdziai", "gelezies_ruda", "nikelis", "cinkas", "container", "aircargo",
          "transp_vanduo", "transp_oras", "sski", "sski_med", "sski_mas", "sski_du", "vki", "gki", "vmdu"]
LANGAS = {"brent": 4, "wti": 4, "transp_vanduo": 1, "transp_oras": 1, "vmdu": 4, "sski": 12, "sski_med": 12, "sski_mas": 12, "sski_du": 12, "vki": 12, "gki": 12}   # kitiems - 3 mėn.
DU = ("vmdu", "sski_du")


def dbnomics(sid):
    d = json.loads(gauk("https://api.db.nomics.world/v22/series/%s?observations=1" % sid))["series"]["docs"][0]
    return [(a[:7], b) for a, b in zip(d["period"], d["value"]) if isinstance(b, (int, float))]


def eia(s):
    h = gauk("https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=%s&f=W" % s).decode("latin1"); e = []
    for m in re.finditer(r"<td class='B6'>&nbsp;&nbsp;(\d{4})-[A-Za-z]{3}</td>(.*?)</tr>", h, re.S):
        c = re.findall(r"<td class='B[35]'>([^<]*?)(?:&nbsp;)*</td>", m.group(2))
        for i in range(0, len(c) - 1, 2):
            v = c[i + 1].replace("&nbsp;", "").strip()
            if re.match(r"\d\d/\d\d", c[i].strip()) and v: e.append((m.group(1) + "-" + c[i].strip().replace("/", "-"), float(v)))
    return e


def osp(kes, flow, pjuvis):
    if flow not in kes: kes[flow] = json.loads(gauk("https://osp-rs.stat.gov.lt/ords/ipospp/ospp/rest_json/data/%s?startPeriod=2010-01&endPeriod=2100-12" % flow))
    d = kes[flow]; dims = d["structure"]["dimensions"]["observation"]; vardai = [[v["name"] for v in x.get("values", [])] for x in dims]
    lp = [i for i, x in enumerate(dims) if re.search("aikotarp", x.get("name", ""))][0]; e = []
    for k, v in d["dataSets"][0]["observations"].items():
        idx = [int(x) for x in k.split(":")]; turi = {vardai[i][idx[i]] for i in range(len(idx)) if i != lp}
        if all(p in turi for p in pjuvis) and isinstance(v[0], (int, float)): e.append((vardai[lp][idx[lp]].replace("M", "-"), v[0]))
    return sorted(e)


def eurostat(u):
    d = json.loads(gauk(u)); rev = {v: k for k, v in d["dimension"]["time"]["category"]["index"].items()}
    return [(rev[int(a)], b) for a, b in sorted(d["value"].items(), key=lambda z: int(z[0]))]


def metai_men(a):
    m = re.match(r"(\d{4})[-K]Q?(\d)$", a)
    return (int(m.group(1)), int(m.group(2)) * 3) if m else (int(a[:4]), int(a[5:7]))


def sokas(a):
    y, mo = metai_men(a); return (y == 2021 and mo >= 4) or y in (2022, 2023)


def pct(a, p):
    s = sorted(a); x = (len(s) - 1) * p; i = int(x); j = min(i + 1, len(s) - 1); return s[i] + (s[j] - s[i]) * (x - i)


def main():
    eil = {}; kes = {}; live = {x["id"]: x for x in json.loads(gauk("https://api.g-procure.com/api/rinka"))["rodikliai"]}
    for k, s in DBNOMICS.items():
        m = dict(dbnomics(s))
        for r in live.get(k, {}).get("menesine") or []:
            if isinstance(r.get("reiksme"), (int, float)): m[r["laikotarpis"][:7]] = r["reiksme"]
        eil[k] = sorted(m.items())
    for k, s in EIA.items(): eil[k] = eia(s)
    for k, (f, p) in OSP.items(): eil[k] = osp(kes, f, p)
    B = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
    eil["polymers"] = eurostat(B + "sts_inpp_m?format=JSON&lang=EN&geo=EU27_2020&nace_r2=C2016&s_adj=NSA&unit=I21&indic_bt=PRC_PRR&sinceTimePeriod=2014-01")
    for k, n in EU_Q.items(): eil[k] = eurostat(B + "sts_sepp_q?format=JSON&lang=EN&geo=EU27_2020&nace_r2=%s&indic_bt=PRC_PRR&s_adj=NSA&unit=I21&sinceTimePeriod=2014-Q1" % n)
    print("rodiklis           P75    P95   ribos  raudona %  naujausias pokytis")
    for k in TVARKA:
        lb = LANGAS.get(k, 3); e = eil[k]
        ch = [(e[i][0], (e[i][1] / e[i - lb][1] - 1) * 100) for i in range(lb, len(e)) if e[i - lb][1]]
        ch = [c for c in ch if c[0] >= "2015" and not (k in DU and metai_men(c[0])[0] == 2019)]
        v = [c[1] for c in ch]; be = v if k == "transp_vanduo" else [c[1] for c in ch if not sokas(c[0])]
        y, r = pct(be, .75), pct(be, .95); Y = max(3, round(y)); R = max(5, round(r))
        if R <= Y: R = Y + 1
        print("%-17s %5.1f  %5.1f  %2d/%-3d  %3d        %s %+.1f" % (k, y, r, Y, R, round(100 * sum(1 for a in v if a >= R) / len(v)), ch[-1][0], ch[-1][1]))


if __name__ == "__main__":
    main()
