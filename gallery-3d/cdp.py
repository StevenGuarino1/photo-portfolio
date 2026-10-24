"""A tiny Chrome DevTools Protocol client: launch Chrome, drive a page,
measure, screenshot, and send keys and touches. No dependencies."""
import base64
import json
import os
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import urllib.request

CHROME = next((c for c in [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
] if os.path.exists(c)), "google-chrome")


class WS:
    def __init__(self, url):
        assert url.startswith("ws://")
        hostport, path = url[5:].split("/", 1)
        host, port = hostport.split(":")
        self.s = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
               f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
        self.s.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self.rest = buf.split(b"\r\n\r\n", 1)[1]

    def _read(self, n):
        while len(self.rest) < n:
            chunk = self.s.recv(1 << 20)
            if not chunk:
                raise EOFError
            self.rest += chunk
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def send(self, text):
        data = text.encode()
        head = bytearray([0x81])
        n = len(data)
        if n < 126:
            head.append(0x80 | n)
        elif n < 65536:
            head.append(0x80 | 126)
            head += struct.pack(">H", n)
        else:
            head.append(0x80 | 127)
            head += struct.pack(">Q", n)
        mask = os.urandom(4)
        head += mask
        self.s.sendall(bytes(head) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        msg = b""
        while True:
            b0, b1 = self._read(2)
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._read(8))[0]
            payload = self._read(n)
            op = b0 & 0x0F
            if op == 9:  # ping
                continue
            msg += payload
            if b0 & 0x80:
                return msg.decode()


class Page:
    def __init__(self, width=1400, height=800, gpu=True):
        self.dir = tempfile.mkdtemp(prefix="cdp-")
        port = 9333
        args = [CHROME, "--headless=new", f"--remote-debugging-port={port}", f"--user-data-dir={self.dir}",
                f"--window-size={width},{height}", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required",
                "--no-first-run", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"]
        if gpu:
            args += (["--use-angle=d3d11"] if os.name == "nt" else []) + ["--enable-gpu", "--ignore-gpu-blocklist"]
        else:
            args += ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
        self.proc = subprocess.Popen(args + ["about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
                page = next(t for t in tabs if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.1)
        self.ws = WS(page["webSocketDebuggerUrl"])
        self.id = 0
        self.events = []
        self.call("Page.enable")
        self.call("Runtime.enable")
        self.call("Log.enable")

    def call(self, method, **params):
        self.id += 1
        mid = self.id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
            self.events.append(msg)

    def eval(self, expr, timeout=60):
        r = self.call("Runtime.evaluate", expression=expr, awaitPromise=True, returnByValue=True, timeout=timeout * 1000)
        if "exceptionDetails" in r:
            raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", r["exceptionDetails"]))
        return r["result"].get("value")

    def phone(self, width=390, height=844, dpr=3, throttle=4):
        self.call("Emulation.setDeviceMetricsOverride", width=width, height=height, deviceScaleFactor=dpr, mobile=True)
        self.call("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
        self.call("Emulation.setUserAgentOverride", userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
        if throttle:
            self.call("Emulation.setCPUThrottlingRate", rate=throttle)

    def desktop(self, width=1400, height=800):
        self.call("Emulation.setDeviceMetricsOverride", width=width, height=height, deviceScaleFactor=1, mobile=False)

    def goto(self, url, wait=3):
        self.events = []
        self.call("Page.navigate", url=url)
        time.sleep(wait)

    def shot(self, path):
        data = self.call("Page.captureScreenshot", format="png")["data"]
        with open(path, "wb") as f:
            f.write(base64.b64decode(data))

    def key(self, code, key, down=True):
        self.call("Input.dispatchKeyEvent", type="keyDown" if down else "keyUp", code=code, key=key)

    def touch(self, kind, points):
        self.call("Input.dispatchTouchEvent", type=kind, touchPoints=[{"x": x, "y": y, "id": i} for i, (x, y) in enumerate(points)])

    def click(self, x, y):
        for t in ("mousePressed", "mouseReleased"):
            self.call("Input.dispatchMouseEvent", type=t, x=x, y=y, button="left", clickCount=1)

    def console_errors(self):
        out = []
        for e in self.events:
            m = e.get("method")
            if m == "Runtime.exceptionThrown":
                out.append("EXC " + e["params"]["exceptionDetails"].get("exception", {}).get("description", "")[:300])
            elif m == "Runtime.consoleAPICalled" and e["params"]["type"] in ("error", "warning"):
                out.append(e["params"]["type"].upper() + " " + " ".join(str(a.get("value", a.get("description", "")))[:200] for a in e["params"]["args"]))
            elif m == "Log.entryAdded" and e["params"]["entry"]["level"] in ("error", "warning"):
                out.append("LOG " + e["params"]["entry"]["text"][:200])
        return out

    def close(self):
        try:
            self.proc.kill()
            self.proc.wait(5)
        except Exception:
            pass
        shutil.rmtree(self.dir, ignore_errors=True)
