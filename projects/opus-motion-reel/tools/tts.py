"""Voiceover with Kokoro-82M (Apache 2.0, local ONNX), one clip per section, plus faster-whisper word timings.
Usage: python3 tools/tts.py <voice> [speed]   writes build/sec_<k>.wav and build/sec_words.json"""
import json, sys, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel
voice = sys.argv[1]; speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.1
M = '/home/user/models/kokoro/'
SECTIONS = {
    's1': "AI motion design just changed. Here's the catch.",
    's2': "A year ago? Fair. Warped clips. Melting text. Your afternoon, gone in After Effects.",
    's3': "Then Opus five point five dropped. People asked Claude Code for a showreel. One line.",
    's4': "Make a dynamic fifteen second motion graphics video. Go all out.",
    's5': "And got this. Kinetic type. Particle reveals.",
    's6': "Even the sound. Written in code, synced to every cut.",
    's7': "And not just one look.",
    's8': "But plenty weren't one line. One viral one shot had a ten thousand character prompt behind it. Skills. Examples. A proper brief. The gap is shrinking fast. Taste still wins.",
    's9ig': "Want my prompts? Comment prompts, and I'll send you the library.",
    's9yt': "Want my prompts? The library is in the pinned comment.",
}
k = Kokoro(M + 'kokoro-v1.0.onnx', M + 'voices-v1.0.bin')
wm = WhisperModel('small.en', device='cpu', compute_type='int8')
out = {}
for key, txt in SECTIONS.items():
    a, sr = k.create(txt, voice=voice, speed=speed, lang='en-us')
    a = np.asarray(a, np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, nz[0] - 600):nz[-1] + 1200]   # trim silence
    sf.write(f'build/sec_{key}.wav', a, sr)
    segs, _ = wm.transcribe(f'build/sec_{key}.wav', word_timestamps=True, initial_prompt='Opus 5.5, Claude Code, After Effects.')
    out[key] = {'sr': sr, 'dur': round(len(a) / sr, 3), 'text': txt,
                'words': [{'w': x.word.strip(), 's': round(x.start, 3), 'e': round(x.end, 3)} for s in segs for x in s.words]}
    print(key, out[key]['dur'], ' '.join(w['w'] for w in out[key]['words']))
json.dump(out, open('build/sec_words.json', 'w'), indent=1)
