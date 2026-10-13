"""Music bed, SFX and final mix for one version. Everything is synthesized here (no samples, no licence exposure).
Inputs: build/vo_<v>.wav (vo.py), build/meta_<v>.json (`node render.js meta <v>`).
Output: build/mix_<v>.wav. SFX only where the brief lists them: pop on the 4 chips, ding on the red counter and on "free",
whoosh on the JEV reveal and the 4 name cards, soft riser under "Four ways". Music ducks under the voice and further
during the price beat and the router beat. Usage: python3 audio.py ig|yt"""
import json, sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

v = sys.argv[1]
meta = json.load(open(f'build/meta_{v}.json'))
SR = 48000; DUR = meta['total']; N = int(SR * DUR)
rng = np.random.default_rng(7)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def place(buf, sig, t0, pan=0.5, g=1.0):
    i = int(t0 * SR)
    if i >= N: return
    a = max(0, -i); j = min(N, i + len(sig))
    buf[0, max(i, 0):j] += sig[a:a + j - max(i, 0)] * g * np.sqrt(1 - pan)
    buf[1, max(i, 0):j] += sig[a:a + j - max(i, 0)] * g * np.sqrt(pan)

# ---------- music: low, driving, 112 bpm, A minor ----------
music = np.zeros((2, N)); beat = 60 / 112; bar = 4 * beat
roots = [45, 41, 43, 40]   # Am F G Em, bass register
def kick():
    t = np.arange(int(0.35 * SR)) / SR
    return np.sin(2 * np.pi * (45 + 90 * np.exp(-t * 28)) * t) * np.exp(-t * 9)
def bassnote(m, d):
    t = np.arange(int(d * SR)) / SR; f = hz(m)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * f * t)
    return lp(s, 420) * np.minimum(1, t / 0.01) * np.exp(-t * 3.5)
def hat():
    n = int(0.05 * SR); return hp(rng.standard_normal(n), 8000) * np.exp(-np.arange(n) / SR * 90)
def pad(m, d):
    t = np.arange(int(d * SR)) / SR
    s = sum(np.sin(2 * np.pi * hz(m + iv) * (1 + det) * t) for iv in (12, 19, 24) for det in (-0.004, 0.004))
    return lp(s, 1200) * np.minimum(1, t / 0.6) * np.clip((d - t) / 0.6, 0, 1)
nb = int(np.ceil(DUR / bar)) + 1
for b in range(nb):
    t0 = b * bar; r = roots[b % 4]
    place(music, pad(r, bar + 0.6), t0, g=0.010)
    for k in range(8):
        place(music, bassnote(r if k % 4 != 3 else r + 7, beat / 2 * 0.9), t0 + k * beat / 2, g=0.07 * (1 if k % 2 == 0 else 0.7))
    if b >= 1:
        for k in range(4): place(music, kick(), t0 + k * beat, g=0.22)
        for k in range(8): place(music, hat(), t0 + k * beat / 2 + beat / 4, pan=0.6, g=0.02)
t_all = np.arange(N) / SR
music *= np.minimum(1, t_all / 0.3)

# ---------- SFX ----------
sfx = np.zeros((2, N))
def pop():
    t = np.arange(int(0.12 * SR)) / SR
    return np.sin(2 * np.pi * (500 + 900 * np.exp(-t * 60)) * t) * np.exp(-t * 35)
def ding():
    t = np.arange(int(1.4 * SR)) / SR; f = 1760
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in ((1, 1, 3), (2.76, .3, 6), (5.4, .12, 9))) * (1 - np.exp(-t * 800))
def whoosh():
    d = 0.6; n = int(d * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); env = np.sin(np.pi * t / d) ** 2 * np.exp(-t * 1.5)
    return bp(x, 400, 3000) * env * 0.8 + bp(x, 3000, 9000) * env * np.sin(np.pi * t / d) ** 6 * 0.4
def riser(d):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    noise = bp(rng.standard_normal(n), 800, 6000) * k ** 2
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * k ** 2) / SR) * k ** 2 * 0.3
    return (noise * 0.6 + tone) * np.minimum(1, (d - t) / 0.04)
duck_extra = np.ones(N)
for c in meta['cues']:
    ty, t0 = c['type'], c['t']
    if ty == 'pop': place(sfx, pop(), t0, pan=0.62, g=0.30)
    elif ty == 'ding': place(sfx, ding(), t0, g=0.10)
    elif ty == 'whoosh': place(sfx, whoosh(), t0, pan=0.5, g=0.22)
    elif ty == 'riser': place(sfx, riser(c['d']), t0, g=0.08)
    elif ty == 'duck':
        i0, i1 = int(t0 * SR), int((t0 + c['d']) * SR); duck_extra[i0:i1] = 0.55
def smooth(x, win):
    c = np.cumsum(np.pad(x, (win // 2, win - win // 2))); return (c[win:] - c[:-win])[:len(x)] / win
duck_extra = smooth(duck_extra, int(0.25 * SR))

# ---------- voice, ducking, mix ----------
sr, vo = wavfile.read(f'build/vo_{v}.wav'); vo = vo.astype(np.float64).T / 32768
vo = vo[:, :N] if vo.shape[1] >= N else np.pad(vo, ((0, 0), (0, N - vo.shape[1])))
env = smooth(np.abs(vo[0]), int(0.2 * SR))
duck = smooth(1 - 0.45 * np.clip(env / (env.max() * 0.2), 0, 1), int(0.3 * SR)) * duck_extra
mix = vo + music * duck * 0.75 + sfx
end = int(next(c['t'] for c in meta['cues'] if c['type'] == 'end') * SR)   # hard cut to black: sound stops with it
mix[:, end:] = 0; f = int(0.03 * SR); mix[:, end - f:end] *= np.linspace(1, 0, f)
mix = np.tanh(mix * 0.95) / 0.95
mix = mix / np.abs(mix).max() * 10 ** (-1 / 20)
wavfile.write(f'build/mix_{v}.wav', SR, (mix.T * 32767).astype(np.int16))
db = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
print(v, 'rms dB vo %.1f music %.1f sfx %.1f' % (db(vo), db(music * duck * 0.75), db(sfx)))
