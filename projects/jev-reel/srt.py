"""Caption file (written spellings) from the VO word timings. Usage: python3 srt.py ig|yt <out.srt>"""
import json, re, sys
v, out = sys.argv[1], sys.argv[2]
T = json.loads(re.search(r'const TIMING = (.*);', open('timing.js').read()).group(1))[v]
w = {x['i']: x for x in T['words']}
CAPS = [(0, "This AI model can't write a single sentence."), (8, "And that's exactly why you need it."),
        (15, 'Most of what your AI does all day is tiny decisions.'), (26, 'Yes or no. Warm or cold.'),
        (32, "And you're paying Opus prices for them."), (39, "It's called Jev, from TypeSafe AI."),
        (45, 'About 4 cents per million input tokens.'), (52, 'Output is free.'), (55, 'Four ways to use it.'),
        (60, 'One. Route first.'), (63, 'Jev Router picks the model and the reasoning effort for every request.'),
        (75, "And it's live on OpenRouter."), (80, 'Two. Triage.'), (82, 'Send it a hundred lead emails.'),
        (88, 'It tags each one warm, cold or not a lead.'), (98, 'Claude only writes the warm replies.'),
        (104, 'Three. Score.'), (106, 'Give it a rubric.'), (110, 'It scores every ticket and tells you how confident it is.'),
        (121, 'Four. Guardrails.'), (123, 'One true or false check before anything ships.'),
        (131, 'Claude does the thinking. Jev makes the calls.'), (139, "It's early access, so test it on your own workflow first.")]
CAPS += [(150, "Comment JEV and I'll DM you the links.")] if v == 'ig' else [(158, 'Links are in the pinned comment.')]
ends = {150: 157, 158: 163}
def ts(x): m, s = divmod(x, 60); return f'00:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)) % 1000:03}'
o = []
for k, (i, text) in enumerate(CAPS):
    j = ends.get(i, (CAPS[k + 1][0] if k + 1 < len(CAPS) else max(w)) - 1)
    if j not in w: j = max(x for x in w if x < CAPS[k + 1][0])
    b = w[j]['e'] + 0.3
    if k + 1 < len(CAPS): b = min(b, w[CAPS[k + 1][0]]['t'] - 0.04)
    o.append(f'{k + 1}\n{ts(w[i]["t"])} --> {ts(b)}\n{text}\n')
open(out, 'w').write('\n'.join(o)); print(len(o), 'captions', out)
