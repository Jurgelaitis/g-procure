#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Įrankių ekrano vaizdai „Apie G-Procure“ kortelėms: shared/img/irankiai/<id>.webp (1280 x 800).

Paleidimas (saugyklos šaknyje):
    python3 .github/testai/miniaturos.py            # visi įrankiai
    python3 .github/testai/miniaturos.py pp-plan    # tik išvardyti

Kiekvienas vaizdas - tikras įrankis vietiniame serveryje su DEMONSTRACINIAIS duomenimis: įrankio paties pavyzdžiai
arba čia surašyti išgalvoti pirkimai ir tiekėjai. Tikrų pirkimų, asmenų ar sumų vaizduose neturi būti; jokie duomenys
niekur nesiunčiami (DI kvietimai pakeičiami vietiniais atsakymais, CVP IS atsakymai - netikri).
Rinkos rodiklių įrankis atvėrus pats parsisiunčia viešus rodiklius iš savo šaltinių - vaizde jie tikri, tad tam vaizdui reikia interneto.
Pakeitus įrankio išvaizdą - paleisti iš naujo ir peržiūrėti rezultatą akimis prieš įrašant į saugyklą.
Reikia tik Python standartinės bibliotekos ir Chrome (kaip paleisk.py)."""
import base64, datetime, os, sys, threading, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paleisk as P

SAKNIS = P.SAKNIS
KUR = os.path.join(SAKNIS, "shared", "img", "irankiai")
PLOTIS, AUKSTIS, KOKYBE = 1280, 800, 80

# Išgalvotas pirkimas, kartojamas visuose vaizduose, kad jie atrodytų kaip vieno pirkimo kelias.
PIRKIMAS = "110 kV galios transformatorių pirkimas"

# Tiekėjų asistento pavyzdžio datos - nuo šiandienos (kitaip „liko N d.“ vaizde būtų beprasmis)
MEN = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"]
SIANDIEN = datetime.date.today()
def po(d): return SIANDIEN + datetime.timedelta(days=d)
def zodziu(d): return "%d m. %s %d d." % (d.year, MEN[d.month - 1], d.day)

PROTOKOLO_DUOMENYS = r"""
  const kom = { tipas: "nuolatine", date: "2026-01-10", nr: "K-1", name: "Pirkimo komisija", chair: "Vardenis Pavardenis", secretary: "Vardenė Pavardenė",
    members: ["Komisijos narys A", "Komisijos narys B"], nesaliskumas: true, nesaliskumasData: "2026-09-01" };
  const p = (id, name, type, val_cat) => ({ id, name, korteles_data: "2026-09-01", val_ex: 500000, val_inc: 605000, obj_type: "prekes",
    terminas: "24", parts_enabled: false, parts: [], type, eval_criteria: "kainą", val_cat, komisija: kom, channel: "cvp", cvp_nr: "000001", kval: "abu",
    protocols: {}, createdAt: "2026-09-01" });
  localStorage.setItem("litgrid_procurements_v2", JSON.stringify({
    "PVZ-1": p("PVZ-1", "110 kV galios transformatorių pirkimas", "derybos_tarptautinis", "Tarptautinės vertės pirkimas"),
    "PVZ-2": p("PVZ-2", "Relinės apsaugos įrenginių pirkimas", "atviras_tarptautinis", "Tarptautinės vertės pirkimas") }));
  localStorage.setItem("litgrid_user_profile_v1", JSON.stringify({ name: "Vardenis Pavardenis", email: "" }));
"""

TS_TEKSTAS = ("1. PIRKIMO OBJEKTAS\n1.1. Perkami 4 vnt. 110 kV galios transformatoriai su pristatymu ir montavimo priežiūra.\n"
              "1.2. Įranga turi būti aukštos kokybės, moderni ir patikima, Siemens gamybos.\n\n"
              "2. TECHNINIAI REIKALAVIMAI\n2.1. Transformatoriai turi atitikti IEC 60076 standartą.\n"
              "2.2. Atsarginės dalys tiekiamos pagal poreikį, reikiamą kiekį.\n"
              "2.3. Tiekėjas per paskutinius 3 metus turi būti įvykdęs bent 2 panašias sutartis.\n\n"
              "3. GARANTIJA\n3.1. Garantinis laikotarpis - ne trumpesnis kaip 60 mėnesių nuo perdavimo.\n")

IRANKIAI = [
    {"id": "pp-plan", "kelias": "PP-plan/EPSO-G_pirkimu_planavimas_MVP.html",
     "js": "window.confirm = () => true; loadDemo();", "slinkti": "document.querySelector('#imonesJuosta')", "atstumas": 150},
    {"id": "pp-market-kpi", "kelias": "PP-market-KPI/EPSO-G_Rinkos_KPI_skydelis.html?lang=lt",
     "js": "document.getElementById('focusName').value = %r; runFocus();" % PIRKIMAS, "slinkti": "document.querySelector('#focusSec')", "atstumas": 96, "laukti": 2.5},
    {"id": "pp-ts", "kelias": "PP-ts/TS_Asistentas.html",
     "js": "document.getElementById('specText').value = %r; App.runRulesOnly();" % TS_TEKSTAS, "slinkti": "document.querySelector('#analysisResults')", "atstumas": 150, "laukti": 1.5},
    {"id": "pp-qual", "kelias": "PP-qual/PP-QUAL.html",
     "js": r"""
       eval(`PPQ.settings.context = 'sektorinis'; PPQ.settings.green = false;
         Object.assign(PPQ.procurement, { name: '%s', value: 1200000, objectType: 'Prekės', duration: '24 mėn.' });
         PPQ.entry = 'check';
         PPQ.requirements = [
           reikalavimas({ category: 'C', text: 'Tiekėjas per paskutinius 5 metus yra įvykdęs bent vieną transformatorių tiekimo sutartį, kurios vertė ne mažesnė kaip 1 000 000 EUR be PVM.', evidence: 'Įvykdytų sutarčių sąrašas' }, 'review'),
           reikalavimas({ category: 'B', text: 'Tiekėjo vidutinės metinės pajamos per paskutinius 3 finansinius metus - ne mažesnės kaip 3 000 000 EUR.', evidence: 'Finansinės atskaitomybės dokumentai' }, 'review'),
           reikalavimas({ category: 'D', text: 'Tiekėjas turi pasiūlyti projekto vadovą, turintį ne mažesnę kaip 3 metų transformatorių montavimo priežiūros patirtį.', evidence: 'Specialistų sąrašas' }, 'review')];
         PPQ.audit = naujasAuditas();`);
       window.callAI = async () => "[]"; await runFullAudit();""" % PIRKIMAS.replace(" pirkimas", ""),
     "slinkti": "[...document.querySelectorAll('h1,h2,h3')].find(e => /Audito suvestinė/.test(e.textContent) && e.offsetParent).closest('.card, section, div')", "atstumas": 150, "laukti": 1.5},
    {"id": "pp-salygos", "kelias": "PP-salygos/PP-SALYGOS.html",
     "js": r"""
       const d = document, n = (id, v) => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); };
       n("pavadinimas", "110 kV galios transformatorių"); n("budas", "T-AK"); budasPagalPI();
       const zym = id => { const e = d.getElementById(id); if (e) { e.checked = true; e.dispatchEvent(new Event("change", { bubbles: true })); } };
       zym("tipas-prekes"); zym("nacsaug-ne"); zym("energ-taip"); n("verte", "1 200 000");
       rezimas(); zingsniuBusena(); await iStep2();""", "slinkti": "document.querySelector('.steps')", "atstumas": 91, "laukti": 3.5},
    {"id": "pp-cost-benefit", "kelias": "PP-cost-benefit/ekonominio_naudingumo_skaiciuokle.html?lang=lt",
     "js": "ikelkPavyzdi();", "slinkti": "document.querySelector('#s5')", "atstumas": 150, "laukti": 1.2},
    {"id": "pp-graphs", "kelias": "PP-graphs/Litgrid_Pirkimu_grafiku_generatorius.html",
     "js": r"""
       const d = document; d.querySelector(".tabbar .tab").click();
       const n = (id, v) => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); };
       n("f-company", "litgrid"); n("f-pavadinimas", %r); n("f-budas", "T-AK"); onMethodChange(); n("f-pradzia", "2026-11-16"); refreshAll();""" % PIRKIMAS,
     "slinkti": "document.querySelector('#preview-A table')", "atstumas": 395, "laukti": 1.2},
    {"id": "pp-protocols", "kelias": "PP-protocol/LITGRID_Generatorius_v3.html", "pries": PROTOKOLO_DUOMENYS,
     "js": "renderDetail('PVZ-1'); showPage('page-detail');", "slinkti": "document.querySelector('.app-header')", "atstumas": 0, "laukti": 1.0},
    {"id": "pp-negotiation", "kelias": "PP-negotiation/EPSO-G_Derybu_Pasirengimo_Irankis.html?lang=lt",
     "js": r"""
       eval(`storage.save = () => {}; APP.state = defaultState(); APP.state.project.name = '%s'; APP.state.project.plannedValue = 0;
         APP.state.suppliers = [{ id: 'a', name: 'UAB Alfa' }, { id: 'b', name: 'Betatechnika OÜ' }, { id: 'c', name: 'AB Gamatronas' }];
         APP.state.positions = [{ id: 'p1', name: 'Galios transformatorius 110/10 kV, 25 MVA', unit: 'vnt.', quantity: 4, plannedUnitPrice: 250000 },
           { id: 'p2', name: 'Transportavimas ir iškrovimas', unit: 'kompl.', quantity: 4, plannedUnitPrice: 12000 },
           { id: 'p3', name: 'Montavimo priežiūra', unit: 'd.', quantity: 20, plannedUnitPrice: 900 },
           { id: 'p4', name: 'Atsarginių dalių komplektas', unit: 'kompl.', quantity: 1, plannedUnitPrice: 18000 },
           { id: 'p5', name: 'Mokymai', unit: 'd.', quantity: 3, plannedUnitPrice: 800 }];
         APP.state.offers = { a: { p1: { unitPrice: 262000 }, p2: { unitPrice: 11000 }, p3: { unitPrice: 950 }, p4: { unitPrice: 17500 }, p5: { unitPrice: 700 } },
           b: { p1: { unitPrice: 248000 }, p2: { unitPrice: 15500 }, p3: { unitPrice: 600 }, p4: { unitPrice: 21000 } },
           c: { p1: { unitPrice: 255000 }, p2: { unitPrice: 11800 }, p3: { unitPrice: 1200 }, p4: { unitPrice: 18200 }, p5: { unitPrice: 850 } } };
         render.all();`);
       go("analysis");""" % PIRKIMAS, "slinkti": "document.querySelector('#matricaRodymas').closest('.card')", "atstumas": 100, "laukti": 1.5},
    {"id": "pp-report", "kelias": "PP-report/PP-report.html",
     "js": r"""selectForm(2);
       const n = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); };
       n("pirkimo-pavadinimas", "Biuro baldų pirkimas"); n("verte-be-pvm", "28000"); n("bvpz-kodas", "39130000-2");""",
     "slinkti": "document.querySelector('#form-container')", "atstumas": 100, "laukti": 1.0},
    {"id": "pp-carbon", "kelias": "PP-carbon/index.html?lang=lt",
     "js": r"""
       Store.updateEvalOffers(sar => { [["Tiekėjas A", "1000000", "800"], ["Tiekėjas B", "950000", "1500"], ["Tiekėjas C", "980000", "1150"]]
         .forEach((b, i) => sar.push({ id: "PVZ" + (i + 1), name: b[0], bidPrice: b[1], embodiedCarbon: b[2] })); });
       setView("bids");""",
     "slinkti": "[...document.querySelectorAll('.card-title')].find(e => /^Pasiūlymai/.test(e.textContent.trim())).closest('.card')", "atstumas": 138, "laukti": 1.5},
    {"id": "pp-esg", "kelias": "PP-esg/index.html?lang=lt",
     "js": "rodykPavyzdi(); setView('dashboard');", "slinkti": "[...document.querySelectorAll('h1,h2')].find(e => /ESG ir atitikties/.test(e.textContent))", "atstumas": 232, "laukti": 1.5},
    {"id": "tiekejams", "kelias": "PP-tiekejams/index.html?lang=lt",
     "js": r"""
       const w = window, d = document;
       w.fetch = u => { u = String(u);
         if (/\/dokumentai\//.test(u)) return Promise.resolve(new Response(JSON.stringify({ klaida: "x", kodas: "prisijungimas" }), { status: 403 }));
         return Promise.resolve(new Response(JSON.stringify({ klaida: "nera" }), { status: 404 })); };
       w.__PPT.atsaukDokumentus(); w.__PPT.CVPD.klaida = null; w.__PPT.CVPD.laukia = null; w.__PPT.CVPD.id = null;
       w.__PPT.S.docs = []; w.__PPT.perindeksuok(); w.setView("pirkimas");
       const zip = new JSZip();
       zip.file("Bendrosios pirkimo sąlygos.txt", "BENDROSIOS PIRKIMO SĄLYGOS\n\n1.1. Šios sąlygos taikomos kartu su specialiosiomis pirkimo sąlygomis.\n\n9.1. Pasiūlymai vertinami specialiosiose pirkimo sąlygose nustatyta tvarka.");
       zip.file("Specialiosios pirkimo sąlygos.txt", "7.1. Pasiūlymą reikia pateikti CVP IS priemonėmis į elektroninių pasiūlymų dėžutę ne vėliau kaip iki CVP IS nurodyto termino pabaigos.\n\n1.5. Šio Pirkimo metu bus vykdomos Derybos.\n\n2.7. Dėl Pirkimo objekto bus vykdoma apžiūra. Tiekėjai, norintys apžiūrėti statybvietę, turi iki __APZIURA__ 13.00 val. kreiptis.\n\nTiekėjai privalo pateikti Paraišką ir EBVPD.");
       zip.file("SPS 1 priedas. Techninė specifikacija.txt", "TECHNINĖ SPECIFIKACIJA\n\n1. Pirkimo objektas - 110 kV transformatorių pastotės rekonstrukcijos projektavimo paslaugos.\n\n2. Projektas rengiamas pagal galiojančius statybos techninius reglamentus.");
       zip.file("SPS 2 priedas. Pasiūlymo forma.txt", "PASIŪLYMAS\n\nPasiūlymas galioja 90 kalendorinių dienų nuo termino pabaigos.\n\nPASIŪLYMO KAINA");
       zip.file("SPS 3 priedas. Sutarties projektas.txt", "SUTARTIES SPECIALIOSIOS SĄLYGOS\n\n3.1. Paslaugos suteikiamos per 12 mėnesių nuo Sutarties įsigaliojimo dienos.");
       await w.__PPT.onFiles([new File([await zip.generateAsync({ type: "blob" })], "Pirkimas.zip")]);
       for (let i = 0; i < 100 && !d.getElementById("chkDiBtn"); i++) await new Promise(r => setTimeout(r, 50));
       w.__PPT.VPT.id = "0000001"; w.__PPT.VPT.rez = { ok: true, meta: {}, nuoroda: "https://viesiejipirkimai.lt/", pirkimas: { id: 1, title: "Pavyzdinis pirkimas: 110 kV transformatorių pastotės rekonstrukcijos projektavimas",
         caName: "Pavyzdinė energetikos įmonė, AB", procedure: "Negotiated with prior call for competition", status: "Bid submission", datePublished: "__PASKELBTA__T10:00:00", tenderSubmissionDeadline: "__TERMINAS__T12:00:00", clarificationPeriodEnd: "__KLAUSIMAI__T12:00:00" } };
       w.__PPT.renderVpt();""".replace("__APZIURA__", zodziu(po(9))).replace("__PASKELBTA__", po(-12).isoformat()).replace("__TERMINAS__", po(24).isoformat()).replace("__KLAUSIMAI__", po(14).isoformat()),
     "slinkti": "document.querySelector('#apzvalga')", "atstumas": 150, "laukti": 1.5},
    # EPD: viešos versijos sąsaja (?epd=worker); Cloudflare patikros valdiklis vietoje neveikia - jo scenarijus blokuojamas; rezultatas - pavyzdinis atsakymas, niekas nesiunčiama
    {"id": "epd", "kelias": "PP-carbon/epd.html?epd=worker&lang=lt", "blokuoti": ["*challenges.cloudflare.com*"],
     "js": r"""
       const d = document, n = (id, v) => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); };
       n("prodName", "Galios transformatorius 110/10 kV, 25 MVA"); n("unit", "kg CO2e/vnt");
       const ats = { content: [{ type: "text", text: JSON.stringify({ status: "found", value: 152300, unit: "kg CO2e", declaredUnit: "1 vnt", page: 6, standard: "EN 15804+A2",
         quote: "GWP-total, A1-A3: 152 300 kg CO2e" }) }] };
       renderResult(GP_EPD_EXTRACT.parseResponse(ats), "Galios transformatorius 110/10 kV, 25 MVA", "kg CO2e/vnt",
         "Aplinkosauginė produkto deklaracija (pavyzdys). Deklaruotas vienetas: 1 vnt. GWP-total, A1-A3: 152 300 kg CO2e. EN 15804+A2.");""",
     "slinkti": "document.querySelector('#analyzeBtn')", "atstumas": 330, "laukti": 1.0},
]

VALYK = r"""
  document.querySelectorAll(".gpsk, .gpsk-tarpas, .gpsk-d, .gp-pranesimai").forEach(e => e.remove());
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
"""


def vykdyk(ch, kodas):
    return ch.vykdyk("(async () => { try { " + kodas + "; return 'ok'; } catch (e) { return 'KLAIDA: ' + (e && e.message || e); } })()")


def main():
    norimi = set(sys.argv[1:])
    os.makedirs(KUR, exist_ok=True)
    port = P.laisvas_portas()
    srv = P.Serveris(("127.0.0.1", port), P.Tylus)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    bazine = "http://127.0.0.1:%d/" % port
    blogai = 0
    for ir in IRANKIAI:
        if norimi and ir["id"] not in norimi:
            continue
        ch = P.Chrome()          # kiekvienam įrankiui - švari naršyklė (tuščia saugykla)
        try:
            ch.komanda("Emulation.setDeviceMetricsOverride", {"width": PLOTIS, "height": AUKSTIS, "deviceScaleFactor": 1, "mobile": False})
            ch.komanda("Emulation.setScrollbarsHidden", {"hidden": True})
            if ir.get("blokuoti"):
                ch.komanda("Network.enable"); ch.komanda("Network.setBlockedURLs", {"urls": ir["blokuoti"]})
            if ir.get("pries"):
                ch.komanda("Page.navigate", {"url": bazine + "robots.txt"})
                time.sleep(0.8)
                r = vykdyk(ch, ir["pries"])
                if r != "ok":
                    print("KLAIDA", ir["id"], "pries:", r); blogai += 1; continue
            ch.komanda("Page.navigate", {"url": bazine + ir["kelias"]})
            time.sleep(2.5)
            r = vykdyk(ch, ir["js"]) if ir.get("js") else "ok"
            if r != "ok":
                print("KLAIDA", ir["id"], r); blogai += 1; continue
            time.sleep(ir.get("laukti", 1.0))
            vykdyk(ch, VALYK)
            if ir.get("slinkti"):
                r = vykdyk(ch, "const e = %s; if (!e) throw new Error('nėra elemento slinkčiai'); const y = e.getBoundingClientRect().top + scrollY - %d; window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });"
                           % (ir["slinkti"], ir.get("atstumas", 96)))
                if r != "ok":
                    print("KLAIDA", ir["id"], "slinktis:", r); blogai += 1; continue
                time.sleep(0.6)
                vykdyk(ch, VALYK)
            kl = ch.vykdyk("Promise.resolve(document.documentElement.scrollWidth)")
            pav = ch.komanda("Page.captureScreenshot", {"format": "webp", "quality": KOKYBE, "captureBeyondViewport": False})
            kelias = os.path.join(KUR, ir["id"] + ".webp")
            with open(kelias, "wb") as f:
                f.write(base64.b64decode(pav["data"]))
            print("GERAI %-16s %4d KB (puslapio plotis %s)" % (ir["id"], os.path.getsize(kelias) // 1024, kl))
        finally:
            ch.uzdaryk()
    srv.shutdown()
    return 1 if blogai else 0


if __name__ == "__main__":
    sys.exit(main())
