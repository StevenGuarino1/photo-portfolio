import sys, time, json
sys.path.insert(0, ".")
from cdp import Page
page = Page(1000, 640)
page.goto("http://localhost:8000/crowd-lab/v2/", wait=4)
page.eval("document.getElementById('enter').click()")
time.sleep(1.5)
print("audio state:", page.eval("window.__app.audio && window.__app.audio.ctx.state"))
page.eval("""(() => { const A = window.__app.audio; const an = A.ctx.createAnalyser(); an.fftSize = 2048; A.master.connect(an); window.__an = an; })()""")
res = {}
for room, spot in [("lobby", "spawn"), ("gallery", "spawn"), ("gallery", "osprey"), ("gallery", "globes"), ("moor", "spawn"), ("lighthouse", "spawn"), ("lighthouse", "gallery"), ("overlook", "spawn"), ("subway", "car"), ("drivein", "spawn"), ("drivein", "front")]:
    page.eval(f"window.__app.goTo('{room}', '{spot}')")
    time.sleep(4)
    rms = page.eval("""new Promise((res) => { const an = window.__an; const buf = new Float32Array(an.fftSize); let sum = 0, n = 0, peak = 0; const iv = setInterval(() => { an.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); } n += buf.length; }, 40); setTimeout(() => { clearInterval(iv); res([Math.sqrt(sum / n), peak]); }, 5000); })""")
    import math
    db = 20 * math.log10(max(rms[0], 1e-6))
    res[f"{room}/{spot}"] = round(db, 1)
    print(f"{room}/{spot}: {db:.1f} dB rms, peak {rms[1]:.2f}", flush=True)
json.dump(res, open("sound-levels.json", "w"))
page.close()
