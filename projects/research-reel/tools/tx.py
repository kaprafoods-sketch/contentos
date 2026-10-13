"""Word timings for the VO take (faster-whisper small.en). Usage: python3 tools/tx.py"""
import json
from faster_whisper import WhisperModel
m = WhisperModel('small.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe('build/vo_a.mp3', word_timestamps=True, initial_prompt='Research tool. Claude Code. Seventy one reels analyzed.')
w = [{'w': x.word.strip(), 's': round(x.start, 3), 'e': round(x.end, 3)} for s in segs for x in s.words]
json.dump(w, open('build/vo_a_words.json', 'w'))
for i, x in enumerate(w): print(i, x['w'], x['s'], x['e'])
