"""Music bed, SFX and final mix for one version. Everything is synthesized here (no samples, no licence exposure).
Inputs: build/vo_<v>.wav (vo.py), build/meta_<v>.json (`node render.js meta <v>`).
Output: build/mix_<v>.wav. Upbeat electronic bed at 122 bpm that builds through the proof shot, peaks just before the CTA
and resolves on the last frame; it ducks under the voice. SFX follow the cue list in research.js (window.cues).
Usage: python3 audio.py ig|yt|ig220"""
import json, sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

v = sys.argv[1]
meta = json.load(open(f'build/meta_{v}.json'))
SR = 48000; DUR = meta['total']; N = int(SR * DUR)
rng = np.random.default_rng(11)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def env(n, a=0.002, d=8.0):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t * d)
def place(buf, sig, t0, pan=0.5, g=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    a = max(0, -i); j = min(N, i + len(sig))
    buf[0, max(i, 0):j] += sig[a:a + j - max(i, 0)] * g * np.sqrt(1 - pan)
    buf[1, max(i, 0):j] += sig[a:a + j - max(i, 0)] * g * np.sqrt(pan)

# ---------- music ----------
BPM = 122; beat = 60 / BPM; bar = 4 * beat
music = np.zeros((2, N))
prog = [57, 53, 60, 55]          # Am  F  C  G (roots, one bar each)
def kick():
    n = int(0.32 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 32)) / SR) * np.exp(-t * 8) + hp(rng.standard_normal(n), 3000) * np.exp(-t * 300) * 0.15
def clap():
    n = int(0.22 * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 900, 4000)
    e = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, 0.011, 0.022)) * np.exp(-t * 14)
    return x * e
def hat(open_=False):
    n = int((0.16 if open_ else 0.05) * SR); return hp(rng.standard_normal(n), 7500) * env(n, 0.001, 18 if open_ else 80)
def bassnote(m, d):
    n = int(d * SR); t = np.arange(n) / SR; f = hz(m - 24)
    s = 2 * (t * f % 1) - 1
    e = np.exp(-t * 12)
    return (lp(s, 1300) * e + lp(s, 380) * (1 - e)) * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.02, 0, 1)
def pluck(m, d=0.22):
    n = int(d * SR); t = np.arange(n) / SR
    s = sum(np.sign(np.sin(2 * np.pi * hz(m) * (1 + det) * t)) for det in (-0.006, 0.006)) * 0.5
    e = np.exp(-t * 9)
    return (lp(s, 2700) * e + lp(s, 500) * (1 - e)) * env(n, 0.003, 11)
def pad(root, d):
    t = np.arange(int(d * SR)) / SR
    s = sum(np.sin(2 * np.pi * hz(root + iv) * (1 + det) * t) for iv in (0, 3 if root in (57,) else 4, 7, 12) for det in (-0.003, 0.003))
    return lp(s, 1500) * np.minimum(1, t / 0.4) * np.clip((d - t) / 0.4, 0, 1)
def triad(root):
    minor = root in (57,)
    return [root, root + (3 if minor else 4), root + 7]

# energy per section: intro hit, groove, build in proof, peak into CTA, lighter CTA, resolve
S = [0, 3.0, 8.9, 16.95, 26.0, 34.1, DUR]
nb = int(np.ceil(DUR / bar)) + 1
for b in range(nb):
    t0 = b * bar
    if t0 >= DUR: break
    r = prog[b % 4]
    end_zone = t0 > DUR - 1.2 * bar          # last bar: just the resolving chord
    place(music, pad(r, bar + 0.4), t0, g=0.012 if not end_zone else 0.0)
    for k in range(4):
        tb = t0 + k * beat
        if tb >= DUR - 0.6: break
        cta = tb >= S[5]
        place(music, kick(), tb, g=0.42 if not cta else 0.30)
        if k in (1, 3): place(music, clap(), tb, pan=0.52, g=0.20)
        place(music, hat(), tb + beat / 2, pan=0.62, g=0.05)
        if not cta: place(music, hat(), tb + beat / 4 * 3, pan=0.38, g=0.025)
        for h in range(2): place(music, bassnote(r if h == 0 else r + 12, beat / 2 * 0.85), tb + h * beat / 2, g=0.12)
    tri = triad(r)
    for k in range(16):                       # sixteenth-note pluck arp
        tb = t0 + k * beat / 4
        if tb >= DUR - 1.0: break
        place(music, pluck(tri[k % 3] + (12 if k % 8 >= 4 else 0)), tb, pan=0.35 + 0.3 * (k % 2), g=0.035)
# build: snare roll + riser in the proof shot, peak just before the CTA cut
def snare():
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 1500, 6000) + np.sin(2 * np.pi * 190 * t) * 0.6) * env(n, 0.001, 30)
ts = 30.9; k = 0
while ts < S[5] - 0.05:
    place(music, snare(), ts, g=0.05 + 0.10 * (ts - 30.9) / 3.2); ts += beat / (2 if ts < 32.4 else 4)
def crash():
    n = int(1.8 * SR); return hp(rng.standard_normal(n), 4500) * env(n, 0.002, 2.4)
place(music, crash(), S[5], g=0.16)
# resolve: final A minor chord and sub on the last downbeat
tend = DUR - 1.3
for m in (45, 57, 60, 64, 69):
    n = int(1.3 * SR); t = np.arange(n) / SR
    place(music, lp(np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(4 * np.pi * hz(m) * t), 2500) * np.minimum(1, t / 0.005) * np.exp(-t * 2.2), tend, g=0.05)
place(music, kick(), tend, g=0.5)
t_all = np.arange(N) / SR
music *= np.clip((DUR - t_all) / 0.25, 0, 1)

# ---------- SFX ----------
sfx = np.zeros((2, N))
def boom(f0=60, d=0.5):
    n = int(d * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f0 + 140 * np.exp(-t * 25)) / SR) * np.exp(-t * 6)
def impact(pitch=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    body = boom(55 * pitch, 0.45) * 0.9
    snap = bp(rng.standard_normal(n), 1500 * pitch, 7000) * np.exp(-t * 45) * 0.6
    tone = np.sin(2 * np.pi * 330 * pitch * t) * np.exp(-t * 18) * 0.25
    return body + snap + tone
def whoosh(d=0.45):
    n = int(d * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    e = np.sin(np.pi * t / d) ** 2
    sweep = np.cumsum(np.linspace(600, 4000, n)) / SR
    return bp(x, 500, 5000) * e * (0.6 + 0.4 * np.sin(2 * np.pi * sweep))
def tick():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 220)
def pop():
    n = int(0.12 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(420 + 1100 * np.exp(-t * 50)) / SR) * np.exp(-t * 32)
def tap():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return lp(rng.standard_normal(n), 2500) * np.exp(-t * 120) + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 80) * 0.6
def swipe():
    return hp(whoosh(0.22), 1200) * 0.8
def stop():   # digital stop: falling pitch zap + low thud
    n = int(0.32 * SR); t = np.arange(n) / SR
    f = 1400 * np.exp(-t * 14) + 60
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.35 * np.exp(-t * 9) + boom(50, 0.32) * 0.6
def key():
    n = int(0.035 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 2000, 8000) * np.exp(-t * 160) * 0.8 + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 200) * 0.2
def data():
    n = int(0.04 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (1800 + rng.integers(0, 4) * 300) * t) * np.exp(-t * 90)
def confirm():
    n = int(0.5 * SR); t = np.arange(n) / SR
    a = np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 9) * (t < 0.12)
    b = np.sin(2 * np.pi * 1760 * t) * np.exp(-np.clip(t - 0.09, 0, None) * 7) * (t >= 0.09)
    return a + b
def riser(d):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    return (bp(rng.standard_normal(n), 800, 7000) * k ** 2 * 0.5 + np.sin(2 * np.pi * np.cumsum(300 + 900 * k ** 2) / SR) * k ** 2 * 0.25) * np.minimum(1, (d - t) / 0.03)
def sheet():
    return lp(whoosh(0.3), 2500)
G = {'impact': 0.32, 'bass': 0.40, 'whoosh': 0.16, 'tick': 0.10, 'swipe': 0.14, 'pop': 0.20, 'stop': 0.26, 'tap': 0.22,
     'sheet': 0.14, 'data': 0.06, 'key': 0.07, 'confirm': 0.13, 'riser': 0.10, 'flash': 0.18}
for c in meta['cues']:
    ty, t0 = c['type'], c['t']
    if ty.startswith('impact'):
        p = {'impact': 1.0, 'impact0': 0.85, 'impact1': 1.0, 'impact2': 1.15, 'impact3': 1.3}[ty]
        place(sfx, impact(p), t0, g=G['impact'])
    elif ty == 'bass': place(sfx, boom(42, 0.8), t0, g=G['bass'])
    elif ty == 'whoosh': place(sfx, whoosh(), t0 - 0.15, g=G['whoosh'])
    elif ty == 'tick': place(sfx, tick(), t0, pan=0.6, g=G['tick'])
    elif ty == 'swipe': place(sfx, swipe(), t0, pan=0.55, g=G['swipe'])
    elif ty == 'pop': place(sfx, pop(), t0, g=G['pop'])
    elif ty == 'stop': place(sfx, stop(), t0, g=G['stop'])
    elif ty == 'tap': place(sfx, tap(), t0, pan=0.58, g=G['tap'])
    elif ty == 'sheet': place(sfx, sheet(), t0, g=G['sheet'])
    elif ty == 'data': place(sfx, data(), t0, pan=0.4 + 0.2 * rng.random(), g=G['data'])
    elif ty == 'key': place(sfx, key(), t0, pan=0.45 + 0.1 * rng.random(), g=G['key'])
    elif ty == 'confirm': place(sfx, confirm(), t0, g=G['confirm'])
    elif ty == 'riser': place(sfx, riser(c['d']), t0, g=G['riser'])
    elif ty == 'flash': place(sfx, impact(0.7), t0, g=G['flash'])

# ---------- mix: duck music under the voice ----------
sr, vo = wavfile.read(f'build/vo_{v}.wav'); vo = vo.astype(np.float64).T / 32768
vo = np.pad(vo, ((0, 0), (0, max(0, N - vo.shape[1]))))[:, :N]
def smooth(x, win):
    c = np.cumsum(np.pad(x, (win // 2, win - win // 2))); return (c[win:] - c[:-win])[:len(x)] / win
lvl = smooth(np.abs(vo[0]), int(0.05 * SR))
act = np.clip(lvl / 0.02, 0, 1)
duck = 1 - 0.72 * smooth(act, int(0.25 * SR))
bed = music * duck * 0.75 + sfx * (1 - 0.35 * smooth(act, int(0.1 * SR)))
sp = act > 0.5
db = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
print('during speech: voice', round(db(vo[0, sp]), 1), 'dB, bed', round(db(bed[0, sp]), 1), 'dB')
mix = vo + bed
peak = np.abs(mix).max(); mix = mix / peak * 10 ** (-1.0 / 20)
wavfile.write(f'build/mix_{v}.wav', SR, (mix.T * 32767).astype(np.int16))
print(v, 'mix written, pre-norm peak', round(peak, 3))
