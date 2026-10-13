#!/bin/bash
# Rebuilds the Opus 5.5 motion reel into deliverables/opus-motion-reel (Instagram + YouTube Shorts).
# Needs Node 22 + Playwright Chromium, ffmpeg, Python with numpy, scipy, soundfile.
# build/sec_*.wav + build/sec_words.json (Kokoro voice + faster-whisper timings, tools/tts.py) must exist.
set -e
cd "$(dirname "$0")"
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}
OUT=../../deliverables/opus-motion-reel
mkdir -p build "$OUT"
python3 vo.py > /dev/null
for v in ig yt; do node render.js meta $v build/meta_$v.json; python3 audio.py $v; done
fr() { python3 -c "import json;m=json.load(open('build/meta_$1.json'));print(round(m[$2]*30))" ; }
CTA=$(fr ig "'shots'][8") ; NI=$(fr ig "'total'") ; NY=$(fr yt "'total'")
A=$(( CTA / 3 )); B=$(( CTA * 2 / 3 ))
# shots 1 to 8 are identical in both versions, so the Shorts version only renders its own CTA shot
node render.js video ig build/ig_0.mp4 0 $A > build/ig_0.log 2>&1 &
node render.js video ig build/ig_1.mp4 $A $B > build/ig_1.log 2>&1 &
node render.js video ig build/ig_2.mp4 $B $CTA > build/ig_2.log 2>&1 &
node render.js video ig build/ig_3.mp4 $CTA $NI > build/ig_3.log 2>&1 &
node render.js video yt build/yt_3.mp4 $CTA $NY > build/yt_3.log 2>&1 &
wait
printf "file '%s'\n" ig_0.mp4 ig_1.mp4 ig_2.mp4 ig_3.mp4 > build/chunks_ig.txt
printf "file '%s'\n" ig_0.mp4 ig_1.mp4 ig_2.mp4 yt_3.mp4 > build/chunks_yt.txt
for v in ig yt; do ffmpeg -y -v error -f concat -safe 0 -i build/chunks_$v.txt -c copy build/silent_$v.mp4; done
mux() { ffmpeg -y -v error -i build/silent_$1.mp4 -i build/mix_$1.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$2"; }
mux ig "$OUT/Opus_motion_reel_instagram_9x16.mp4"
mux yt "$OUT/Opus_motion_reel_shorts_9x16.mp4"
python3 srt.py ig "$OUT/Opus_motion_reel_instagram_captions.srt"
python3 srt.py yt "$OUT/Opus_motion_reel_shorts_captions.srt"
cp build/vo_ig.wav "$OUT/Opus_motion_reel_voiceover_instagram.wav"; cp build/vo_yt.wav "$OUT/Opus_motion_reel_voiceover_shorts.wav"
