"""Music bed, sound design and final mix. Everything synthesized locally (no samples, no licence exposure).
Inputs: build/vo.wav (from vo.py), build/cues.json (from `node render.js cues`).
Output: build/mix.wav (48 kHz stereo, 75 s). Loudness is normalised at mux time in render_all.sh.
Usage: python3 audio.py"""
import json, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000; DUR = 75.0; N = int(SR * DUR)
rng = np.random.default_rng(11)
t_all = np.arange(N) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def ir(seed, sec=2.6, decay=2.4):
    r = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR
    return r.standard_normal(n) * np.exp(-t * decay) * 0.02
def place(buf, sig, t0, pan=0.5, g=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    a = max(0, -i); j = min(N, i + len(sig))
    buf[0, max(i, 0):j] += sig[a:a + j - max(i, 0)] * g * np.sqrt(1 - pan)
    buf[1, max(i, 0):j] += sig[a:a + j - max(i, 0)] * g * np.sqrt(pan)

# ---------------- music: calm ambient electronic, 84 bpm, D minor colour ----------------
music = np.zeros((2, N))
beat = 60 / 84; bar = 4 * beat
prog = [[50, 57, 60, 64, 69], [46, 53, 57, 60, 65], [41, 53, 57, 60, 64], [48, 55, 60, 62, 67]]  # Dm9 Bbmaj7 Fmaj7 C6add9
def pad(m, d):
    t = np.arange(int(d * SR)) / SR; f = hz(m)
    s = sum(np.sin(2 * np.pi * f * k * (1 + det) * t + det * 900) / k ** 1.3 for k in (1, 2, 3, 4) for det in (-0.003, 0, 0.003))
    return s * np.minimum(1, t / 2.0) * np.clip((d - t) / 2.0, 0, 1)
def pluck(m, d=1.6):
    t = np.arange(int(d * SR)) / SR; f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9)
    return s * (1 - np.exp(-t * 400)) * np.exp(-t * 3.2)
def sub(m, d):
    t = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t / 0.08) * np.exp(-t * 0.9)
nb = int(np.ceil(DUR / bar)) + 1
for b in range(nb):
    ch = prog[b % 4]; t0 = b * bar
    for m in ch[1:]:
        place(music, lp(pad(m, bar + 2.0), 1800), t0, pan=rng.uniform(.3, .7), g=0.020)
    place(music, sub(ch[0] - 12, bar), t0, g=0.11)
    if b >= 1:   # soft arpeggio, enters after the hook
        for k, step in enumerate([0, 1.5, 2, 3, 3.5] if b % 2 else [0, 1, 2.5, 3]):
            m = ch[1 + (k * 2) % 4] + 12
            place(music, pluck(m), t0 + step * beat + rng.uniform(0, .012), pan=rng.uniform(.25, .75), g=0.045 * rng.uniform(.75, 1))
    if b >= 2:   # barely there pulse: filtered noise ticks on the offbeat
        for k in range(8):
            n = int(0.03 * SR); s = hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR * 140)
            place(music, s, t0 + (k + 0.5) * beat / 2, pan=0.6 if k % 2 else 0.4, g=0.012 if k % 2 else 0.007)
for c in range(2):
    music[c] = lp(0.75 * music[c] + fftconvolve(music[c], ir(c + 1))[:N], 6000)
fade = np.minimum(1, t_all / 2.0) * np.clip((DUR - t_all) / 3.0, 0, 1)
music *= fade

# ---------------- sound design from the timeline cues ----------------
sfx = np.zeros((2, N))
def whoosh():
    d = 0.9; n = int(d * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    lo = bp(x, 300, 1600) * env; hi = bp(x, 1600, 5000) * env * np.sin(np.pi * t / d) ** 4
    return (lo * 0.6 + hi * 0.4)
def chime():
    d = 2.6; t = np.arange(int(d * SR)) / SR; f = 1318.5
    parts = [(1, 1, 2.2), (2.76, .45, 3.5), (5.40, .22, 5), (8.93, .1, 7)]
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in parts)
    s += 0.5 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 2.8)
    return s * (1 - np.exp(-t * 900))
def tick():
    t = np.arange(int(0.06 * SR)) / SR
    return np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 90)
def click(f=3000, d=0.025):
    n = int(d * SR); return bp(rng.standard_normal(n), f * 0.6, min(f * 1.6, 20000)) * np.exp(-np.arange(n) / SR * 260)
def snap():
    t = np.arange(int(0.35 * SR)) / SR
    c = np.zeros(len(t)); k = click(2500, 0.04); c[:len(k)] = k
    return c * 1.2 + np.sin(2 * np.pi * 110 * t) * np.exp(-t * 18) * 0.8
def thud():
    t = np.arange(int(0.3 * SR)) / SR
    return np.sin(2 * np.pi * 80 * t * (1 + 0.5 * np.exp(-t * 30))) * np.exp(-t * 14)
cues = json.load(open('build/cues.json'))
for c in cues:
    ty, t0, g = c['type'], c['t'], c.get('g', 1)
    if ty == 'whoosh':
        w = whoosh(); h = len(w) // 2   # pane travels right to left
        place(sfx, w[:h], t0, pan=0.75, g=0.16 * g); place(sfx, w[h:], t0 + h / SR, pan=0.25, g=0.16 * g)
    elif ty == 'chime': place(sfx, chime(), t0, pan=0.5, g=0.05 * g)
    elif ty == 'tick': place(sfx, tick(), t0, pan=0.5, g=0.045 * g)
    elif ty == 'snap': place(sfx, snap(), t0, pan=0.62, g=0.22 * g)
    elif ty == 'flash':
        place(sfx, click(4200, 0.02), t0, g=0.25); place(sfx, click(3000, 0.03), t0 + 0.07, g=0.2)
    elif ty == 'cut': place(sfx, thud(), t0, g=0.12 * g)
    elif ty == 'key': place(sfx, click(rng.uniform(2500, 4000), 0.015), t0, pan=0.35, g=0.07 * rng.uniform(.6, 1))
    elif ty == 'enter': place(sfx, click(1800, 0.04), t0, pan=0.35, g=0.16)
for c in range(2):
    sfx[c] = 0.8 * sfx[c] + fftconvolve(sfx[c], ir(c + 7, 2.0, 3.0))[:N] * 1.4

# ---------------- voice + ducking ----------------
sr, vo = wavfile.read('build/vo.wav'); vo = vo.astype(np.float64).T / 32768
vo = vo[:, :N] if vo.shape[1] >= N else np.pad(vo, ((0, 0), (0, N - vo.shape[1])))
def smooth(x, win):   # centred moving average via cumulative sum
    c = np.cumsum(np.pad(x, (win // 2, win - win // 2)))
    return (c[win:] - c[:-win])[:len(x)] / win
env = smooth(np.abs(vo[0]), int(0.25 * SR))
duck = smooth(1 - 0.5 * np.clip(env / (env.max() * 0.25), 0, 1), int(0.3 * SR))
db = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
print('rms dB  vo %.1f  music %.1f  sfx %.1f' % (db(vo), db(music * duck), db(sfx)))
mix = vo * 1.0 + music * duck * 0.3 + sfx * 1.3
mix = np.tanh(mix * 0.95) / 0.95
mix = mix / np.abs(mix).max() * 10 ** (-1 / 20)
wavfile.write('build/mix.wav', SR, (mix.T * 32767).astype(np.int16))
print('mix written', mix.shape)
