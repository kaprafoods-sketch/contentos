"""Caption files (script spellings) from the VO timings. Usage: python3 srt.py ig|yt <out.srt>"""
import json, re, sys
v, out = sys.argv[1], sys.argv[2]
S = json.loads(re.search(r'const TIMING = (.*);', open('timing.js').read()).group(1))[v]['secs']
# (section, first word, last word, text)
CAPS = [('s1', 0, 4, 'AI motion design just changed.'), ('s1', 5, 7, "Here's the catch."),
        ('s2', 0, 2, 'A year ago? Fair.'), ('s2', 3, 6, 'Warped clips. Melting text.'), ('s2', 7, 12, 'Your afternoon, gone in After Effects.'),
        ('s3', 0, 4, 'Then Opus 5.5 dropped.'), ('s3', 5, 11, 'People asked Claude Code for a showreel.'), ('s3', 12, 13, 'One line.'),
        ('s4', 0, 7, '"Make a dynamic 15-second motion graphics video.'), ('s4', 8, 10, 'Go all out."'),
        ('s5', 0, 4, 'And got this. Kinetic type.'), ('s5', 5, 6, 'Particle reveals.'),
        ('s6', 0, 2, 'Even the sound.'), ('s6', 3, 9, 'Written in code, synced to every cut.'), ('s7', 0, 4, 'And not just one look.'),
        ('s8', 0, 4, "But plenty weren't one line."), ('s8', 5, 16, 'One viral one-shot had a 10,000 character prompt behind it.'),
        ('s8', 17, 21, 'Skills. Examples. A proper brief.'), ('s8', 22, 26, 'The gap is shrinking fast.'), ('s8', 27, 29, 'Taste still wins.')]
CAPS += [('s9', 0, 2, 'Want my prompts?'), ('s9', 3, 9, 'The library is in the pinned comment.')] if v == 'yt' else \
        [('s9', 0, 2, 'Want my prompts?'), ('s9', 3, 10, "Comment PROMPTS and I'll send you the library.")]
def ts(x): m, s = divmod(x, 60); return f'00:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)) % 1000:03}'
o = []
for k, (s, a, b, text) in enumerate(CAPS):
    t0, t1 = S[s]['w'][a]['t'], S[s]['w'][b]['e'] + 0.4
    if k + 1 < len(CAPS): t1 = min(t1, S[CAPS[k + 1][0]]['w'][CAPS[k + 1][1]]['t'] - 0.04)
    o.append(f'{k + 1}\n{ts(t0)} --> {ts(t1)}\n{text}\n')
open(out, 'w').write('\n'.join(o)); print(len(o), 'captions', out)
