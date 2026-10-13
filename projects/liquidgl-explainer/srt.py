"""Writes the caption file from the VO word timings in timing.js. Usage: python3 srt.py <out.srt>"""
import json, re, sys
T = json.loads(re.search(r'const TIMING = (.*);', open('timing.js').read()).group(1))
w = T['words']
# caption text (written spelling) and the index of the first VO word of each caption
CAPS = [
    (0, 'Glass on the web has always looked a little fake.'), (10, 'A blur, a border, done.'),
    (15, 'liquidGL makes it real.'), (20, "Glass that actually bends what's behind it."),
    (27, 'The catch? Browsers won\'t let the GPU read live screen pixels.'), (38, "It's a security rule."),
    (42, 'So liquidGL takes its own high resolution snapshot of the page,'), (54, 'hands it to a shader, and bends it.'),
    (62, 'Strongest at the edges, like a real bevel.'),
    (70, 'You control the look.'), (74, 'Refraction. Bevel. Frost.'), (77, 'Moving highlights. Soft shadows.'),
    (81, 'Version three adds tinted glass,'), (86, 'true colour dispersion at the edges,'), (92, 'and a fluid surface that follows your finger.'),
    (100, 'Run as many lenses as you like. Stack them.'), (109, 'They all draw through one shared canvas.'),
    (116, 'It renders with WebGPU,'), (120, 'and falls back to WebGL, then CSS, automatically.'),
    (128, "Install it. Point it at an element. That's it."),
    (137, 'liquidGL. Open source, MIT licensed.'), (143, 'Try the demos at liquidgl.naughtyduk.com'),
]
def ts(x): h, r = divmod(x, 3600); m, s = divmod(r, 60); return f'{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)) % 1000:03}'
out = []
for k, (i, text) in enumerate(CAPS):
    j = (CAPS[k + 1][0] if k + 1 < len(CAPS) else len(w)) - 1
    a, b = w[i]['t'], min(w[j]['e'] + 0.35, w[j + 1]['t'] - 0.05 if j + 1 < len(w) else 75)
    out.append(f'{k + 1}\n{ts(a)} --> {ts(b)}\n{text}\n')
open(sys.argv[1], 'w').write('\n'.join(out))
print(len(out), 'captions')
