"""Soft, warm, unhurried instrumental bed. Synthesized locally, no samples, no licence issues.
Usage: python3 music.py <seconds> <out.wav>"""
import sys, numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
SR = 48000
dur = float(sys.argv[1]); out = sys.argv[2]
rng = np.random.default_rng(7)
N = int(SR * (dur + 3))
L = np.zeros(N); R = np.zeros(N)
bpm = 70; beat = 60 / bpm; bar = 4 * beat
def hz(m): return 440 * 2 ** ((m - 69) / 12)
# Fmaj9, Am7, Dm9, Bbmaj9 (midi)
prog = [[53, 57, 60, 64, 67], [57, 60, 64, 67, 71], [50, 57, 60, 64, 65], [46, 53, 57, 62, 65]]
t_all = np.arange(N) / SR
def add(sig, start, pan=0.5, gain=1.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N: return
    L[i:j] += sig[:j - i] * gain * (1 - pan) * 2 ** .5
    R[i:j] += sig[:j - i] * gain * pan * 2 ** .5
def pad(m, d):
    t = np.arange(int(d * SR)) / SR
    s = sum(np.sin(2 * np.pi * hz(m) * k * (1 + det) * t) / k ** 1.6 for k in (1, 2, 3) for det in (-0.0015, 0.0015))
    env = np.minimum(1, t / 1.6) * np.minimum(1, (d - t) / 1.6).clip(0)
    return s * env
def keys(m, d=2.6):
    t = np.arange(int(d * SR)) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3) + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5)
    env = (1 - np.exp(-t * 200)) * np.exp(-t * 1.4)
    return s * env
nb = int(np.ceil((dur + 2) / bar))
for b in range(nb):
    ch = prog[b % 4]; t0 = b * bar
    for m in ch[1:]:
        add(pad(m, bar + 1.0), t0, pan=rng.uniform(.35, .65), gain=0.045)
    add(pad(ch[0] - 12, bar + 0.6), t0, gain=0.07)
    # gentle arpeggio: a few notes per bar, never busy
    pattern = [(0, 2), (1.5, 3), (2, 4), (3, 3)] if b % 2 == 0 else [(0, 1), (1, 3), (2.5, 4)]
    for pos, idx in pattern:
        m = ch[idx] + 12
        add(keys(m), t0 + pos * beat + rng.uniform(0, 0.015), pan=rng.uniform(.3, .7), gain=0.09 * rng.uniform(.8, 1))
# reverb
def ir(seed):
    r = np.random.default_rng(seed); n = int(2.8 * SR); t = np.arange(n) / SR
    return r.standard_normal(n) * np.exp(-t * 2.2) * 0.02
wetL = fftconvolve(L, ir(1))[:N]; wetR = fftconvolve(R, ir(2))[:N]
sos = butter(2, 5500, 'low', fs=SR, output='sos')
L = sosfilt(sos, 0.7 * L + wetL); R = sosfilt(sos, 0.7 * R + wetR)
n = int(dur * SR); L = L[:n]; R = R[:n]
t = np.arange(n) / SR
fade = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 2.5).clip(0)
st = np.stack([L, R], 1) * fade[:, None]
st = st / np.abs(st).max() * 10 ** (-3 / 20)
wavfile.write(out, SR, (st * 32767).astype(np.int16))
print(out, dur)
