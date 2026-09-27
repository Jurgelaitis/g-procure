# -*- coding: utf-8 -*-
"""G-Procure testų paleidiklis (R4, 2026-09-28): visi modulių testai.html tikru Chrome be ekrano.

Naudojamas GitHub Actions (.github/workflows/testai.yml) ir vietoje:
    python3 .github/testai/paleisk.py                  # visi rinkiniai
    python3 .github/testai/paleisk.py PP-qual shared   # tik tie, kurių kelyje yra žodis
Chrome: aplinkos kintamasis CHROME arba google-chrome / chromium / macOS Chrome.
Tik Python standartinė biblioteka (be pip): statinis serveris + Chrome DevTools protokolas per WebSocket.
Aplinka - kaip patikrinta vietoje: naršyklės kalba en-GB, laiko juosta Europe/Vilnius (workflow nustato TZ) - datų
testai (00:30 Lietuvos laiku) prasmingi tik rytinėje laiko juostoje.
Testų puslapiai pranešimą apie pabaigą duoda dvejopai: #busena („praėjo“ / „krito“ / „Nepavyko“) arba
document.title („OK ...“ / „KRITO ...“) su #santrauka (PP-market-KPI, PP-cost-benefit).
Išėjimo kodas 1, jei bent vienas testas krito ar rinkinys nepasibaigė.
"""
import base64, http.server, json, os, shutil, socket, struct, subprocess, sys, tempfile, threading, time, urllib.request

SAKNIS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
# Rinkiniai randami patys: kiekvienas <katalogas>/testai.html (naujas modulis su testais įtraukiamas be šio failo keitimo)
RINKINIAI = sorted((d + "/testai.html" for d in os.listdir(SAKNIS)
                    if not d.startswith(".") and os.path.isfile(os.path.join(SAKNIS, d, "testai.html"))),
                   key=lambda r: (not r.startswith("shared/"), r.lower()))
LAIKAS = 900   # s vienam rinkiniui


# ---------- statinis serveris (didelė eilė: puslapiai vienu metu krauna daug failų) ----------
class Serveris(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True

    def handle_error(self, request, client_address):
        # Naršyklė nutraukia ryšį (puslapis pakeistas, rinkinys baigtas) - ne testo klaida
        if isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)): return
        super().handle_error(request, client_address)


class Tylus(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=SAKNIS, **k)

    def log_message(self, *a):
        pass


def laisvas_portas():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


# ---------- minimalus WebSocket ir DevTools klientas ----------
class WS:
    def __init__(self, url):
        hostport, kelias = url[5:].split("/", 1)
        host, port = hostport.split(":")
        self.s = socket.create_connection((host, int(port)), timeout=LAIKAS + 60)
        raktas = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (kelias, hostport, raktas)).encode())
        atsakymas = b""
        while b"\r\n\r\n" not in atsakymas:
            atsakymas += self.s.recv(4096)
        if b" 101 " not in atsakymas.split(b"\r\n")[0]:
            raise ConnectionError(atsakymas[:200])
        self.buf = atsakymas.split(b"\r\n\r\n", 1)[1]

    def siusk(self, tekstas):
        d = tekstas.encode(); n = len(d); h = bytearray([0x81])
        if n < 126: h.append(0x80 | n)
        elif n < 65536: h.append(0x80 | 126); h += struct.pack(">H", n)
        else: h.append(0x80 | 127); h += struct.pack(">Q", n)
        kauke = os.urandom(4); h += kauke
        self.s.sendall(bytes(h) + bytes(b ^ kauke[i % 4] for i, b in enumerate(d)))

    def _skaityk(self, n):
        while len(self.buf) < n:
            dalis = self.s.recv(1 << 16)
            if not dalis: raise ConnectionError("ryšys nutrūko")
            self.buf += dalis
        o, self.buf = self.buf[:n], self.buf[n:]
        return o

    def gauk(self):
        z = b""
        while True:
            b0, b1 = self._skaityk(2); n = b1 & 0x7F
            if n == 126: n = struct.unpack(">H", self._skaityk(2))[0]
            elif n == 127: n = struct.unpack(">Q", self._skaityk(8))[0]
            p = self._skaityk(n); op = b0 & 0x0F
            if op == 8: raise ConnectionError("ryšys uždarytas")
            if op in (0, 1, 2): z += p
            if b0 & 0x80 and op in (0, 1, 2): return z.decode("utf-8", "replace")


def chrome_kelias():
    for k in [os.environ.get("CHROME"), shutil.which("google-chrome"), shutil.which("google-chrome-stable"), shutil.which("chromium"),
              shutil.which("chromium-browser"), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]:
        if k and os.path.exists(k): return k
    sys.exit("Chrome nerastas - nurodykite CHROME=<kelias>")


class Chrome:
    def __init__(self):
        self.portas = laisvas_portas(); self.profilis = tempfile.mkdtemp(prefix="gp-testai-")
        self.p = subprocess.Popen([chrome_kelias(), "--headless=new", "--remote-debugging-port=%d" % self.portas, "--user-data-dir=" + self.profilis,
                                   "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox", "--lang=en-GB",
                                   "--window-size=1280,1000", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(150):
            try:
                puslapiai = [t for t in json.load(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % self.portas, timeout=2)) if t.get("type") == "page"]
                if puslapiai: break
            except Exception:
                pass
            time.sleep(0.2)
        else:
            raise RuntimeError("Chrome nepasileido")
        self.ws = WS(puslapiai[0]["webSocketDebuggerUrl"]); self.n = 0
        self.komanda("Page.enable"); self.komanda("Runtime.enable")
        self.komanda("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 1000, "deviceScaleFactor": 1, "mobile": False})

    def komanda(self, metodas, param=None):
        self.n += 1; nr = self.n
        self.ws.siusk(json.dumps({"id": nr, "method": metodas, "params": param or {}}))
        while True:
            m = json.loads(self.ws.gauk())
            if m.get("id") == nr:
                if "error" in m: raise RuntimeError(metodas + ": " + json.dumps(m["error"]))
                return m.get("result", {})

    def vykdyk(self, kodas):
        r = self.komanda("Runtime.evaluate", {"expression": kodas, "awaitPromise": True, "returnByValue": True})
        if r.get("exceptionDetails"): raise RuntimeError(json.dumps(r["exceptionDetails"])[:500])
        return r.get("result", {}).get("value")

    def uzdaryk(self):
        try: self.komanda("Browser.close")
        except Exception: pass
        try: self.p.wait(timeout=15)
        except Exception: self.p.kill()
        shutil.rmtree(self.profilis, ignore_errors=True)


LAUK = """(async () => {
  const pabaiga = Date.now() + %d * 1000;
  while (Date.now() < pabaiga) {
    const b = document.getElementById('busena');
    if (/^(OK|KRITO)/.test(document.title) && document.getElementById('santrauka')) {
      return { baigta: true, busena: document.getElementById('santrauka').textContent.replace(/\\s+/g, ' ').trim(), gerai: /^OK/.test(document.title),
        krito: [...document.querySelectorAll('.z-blogai')].map(z => z.closest('tr')).filter(Boolean).map(tr => tr.textContent.replace(/\\s+/g, ' ').trim().slice(0, 600)) };
    }
    if (b && /praėjo|krito|Nepavyko/.test(b.textContent)) {
      const krito = [...document.querySelectorAll('.t.krito, .t.blogai')].map(e => e.textContent.replace(/\\s+/g, ' ').trim().slice(0, 600));
      return { baigta: true, busena: b.textContent.trim() + ((document.getElementById('n-ok') || {}).textContent ? ' (' + document.getElementById('n-ok').textContent + ')' : ''),
        gerai: !krito.length && !/krito|Nepavyko/.test(b.textContent), krito };
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return { baigta: false, busena: 'nepasibaigė per laiką', gerai: false, krito: [] };
})()"""


def main():
    filtrai = sys.argv[1:]
    rinkiniai = [r for r in RINKINIAI if not filtrai or any(f in r for f in filtrai)]
    portas = laisvas_portas()
    srv = Serveris(("127.0.0.1", portas), Tylus)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    rezultatai = []
    for r in rinkiniai:
        ch = Chrome()   # kiekvienam rinkiniui - švari naršyklė (tikra saugykla nesidalijama)
        pr = time.time()
        try:
            ch.komanda("Page.navigate", {"url": "http://127.0.0.1:%d/%s?ci=%d" % (portas, r, time.time())})
            time.sleep(2)
            x = ch.vykdyk(LAUK % LAIKAS)
        except Exception as e:
            x = {"baigta": False, "busena": "klaida: " + str(e)[:300], "gerai": False, "krito": []}
        finally:
            ch.uzdaryk()
        x["rinkinys"] = r; x["sek"] = round(time.time() - pr)
        rezultatai.append(x)
        print(("GERAI " if x["gerai"] else "KRITO ") + r + " | " + x["busena"] + " | " + str(x["sek"]) + " s", flush=True)
        for k in x["krito"]: print("    - " + k, flush=True)
    srv.shutdown()
    blogi = [x for x in rezultatai if not x["gerai"]]
    santrauka = os.environ.get("GITHUB_STEP_SUMMARY")
    if santrauka:
        with open(santrauka, "a", encoding="utf-8") as f:
            f.write("## G-Procure testai\n\n| Rinkinys | Būsena | Laikas |\n|---|---|---|\n")
            for x in rezultatai:
                f.write("| %s %s | %s | %s s |\n" % ("✅" if x["gerai"] else "❌", x["rinkinys"], x["busena"].replace("|", "/"), x["sek"]))
            for x in blogi:
                for k in x["krito"]: f.write("\n- **%s**: %s" % (x["rinkinys"], k.replace("|", "/")))
            f.write("\n")
    print("\n%d rinkinių, kritusių: %d" % (len(rezultatai), len(blogi)))
    sys.exit(1 if blogi else 0)


if __name__ == "__main__":
    main()
