#!/bin/bash
# Rebuilds the liquidGL explainer into deliverables/liquidgl-explainer
# Needs Node 22 + Playwright Chromium, ffmpeg, Python with numpy and scipy.
# build/vo_a.mp3 + build/vo_a_words.json (ElevenLabs take + faster-whisper timings) must exist.
set -e
cd "$(dirname "$0")"
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}
OUT=../../deliverables/liquidgl-explainer
mkdir -p build "$OUT"
python3 vo.py
node render.js cues build/cues.json
python3 audio.py
for i in 0 1 2 3; do node render.js video build/chunk$i.mp4 $((i*563)) $(((i+1)*563)) > build/chunk$i.log 2>&1 & done
wait
printf "file 'chunk%d.mp4'\n" 0 1 2 3 > build/chunks.txt
ffmpeg -y -v error -f concat -safe 0 -i build/chunks.txt -i build/mix.wav -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart \
  "$OUT/liquidGL_explainer_16x9_75s.mp4"
python3 srt.py "$OUT/liquidGL_explainer_captions.srt"
