"""Caption files (written spellings) from the VO word timings. Usage: python3 srt.py ig|yt|ig220 <out.srt>"""
import json, re, sys
v, out = sys.argv[1], sys.argv[2]
T = json.loads(re.search(r'const TIMING = (.*);', open('timing.js').read()).group(1))[v]
w = {x['i']: x for x in T['words']}
CAPS = [(0, 'Research tool.'), (2, 'Saving reels is easy.'), (6, 'Finding the good ones later?'), (11, 'Absolute chaos.'),
        (13, 'Share a reel, send it into your Claude Code workflow,'), (23, 'and analyze the content'),
        (27, 'instead of manually digging through everything.'), (33, 'Get the transcript.'), (36, 'Break down the hook.'),
        (40, 'Identify the format.'), (43, 'And organize the performance numbers.'), (48, 'Seventy-one reels analyzed.')]
CAPS += [(68, 'Two hundred and twenty times the reach.')] if v == 'ig220' else [(52, 'Now you know what works.')]
CAPS += [(75, 'Want the research workflow?'), (79, "It's in the pinned comment.")] if v == 'yt' else \
        [(57, 'Want the research workflow?'), (61, "Comment RESEARCH and I'll send it over.")]
order = [x['i'] for x in T['words']]
def ts(x): m, s = divmod(x, 60); return f'00:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)) % 1000:03}'
o = []
for k, (i, text) in enumerate(CAPS):
    nxt = CAPS[k + 1][0] if k + 1 < len(CAPS) else None
    seg = order[order.index(i):order.index(nxt) if nxt is not None else len(order)]
    b = w[seg[-1]]['e'] + 0.4
    if nxt is not None: b = min(b, w[nxt]['t'] - 0.04)
    o.append(f'{k + 1}\n{ts(w[i]["t"])} --> {ts(b)}\n{text}\n')
open(out, 'w').write('\n'.join(o)); print(len(o), 'captions', out)
