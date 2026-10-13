#!/bin/bash
# Rebuilds the Research Tool reel into deliverables/research-reel (Instagram + YouTube Shorts versions).
# Needs Node 22 + Playwright Chromium, ffmpeg, Python with numpy and scipy.
# build/vo_a.mp3 + build/vo_a_words.json (ElevenLabs take + faster-whisper timings, tools/tx.py) must exist.
# The ig220 version (220x proof line) is not built here on purpose; see README before rendering it.
set -e
cd "$(dirname "$0")"
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}
OUT=../../deliverables/research-reel
mkdir -p build "$OUT"
python3 vo.py > /dev/null
for v in ig yt; do node render.js meta $v build/meta_$v.json; python3 audio.py $v; done
# shots 1 to 5 are identical in both versions, so the Shorts version only renders its own CTA shot
CTA=1023; N=1260
node render.js video ig build/ig_0.mp4 0 420 > build/ig_0.log 2>&1 &
node render.js video ig build/ig_1.mp4 420 840 > build/ig_1.log 2>&1 &
node render.js video ig build/ig_2.mp4 840 $CTA > build/ig_2.log 2>&1 &
node render.js video ig build/ig_3.mp4 $CTA $N > build/ig_3.log 2>&1 &
node render.js video yt build/yt_3.mp4 $CTA $N > build/yt_3.log 2>&1 &
wait
printf "file '%s'\n" ig_0.mp4 ig_1.mp4 ig_2.mp4 ig_3.mp4 > build/chunks_ig.txt
printf "file '%s'\n" ig_0.mp4 ig_1.mp4 ig_2.mp4 yt_3.mp4 > build/chunks_yt.txt
for v in ig yt; do
  ffmpeg -y -v error -f concat -safe 0 -i build/chunks_$v.txt -c copy build/silent_$v.mp4
done
ffmpeg -y -v error -i build/silent_ig.mp4 -i build/mix_ig.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/Research_tool_reel_instagram_9x16.mp4"
ffmpeg -y -v error -i build/silent_yt.mp4 -i build/mix_yt.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/Research_tool_reel_shorts_9x16.mp4"
python3 srt.py ig "$OUT/Research_tool_reel_instagram_captions.srt"
python3 srt.py yt "$OUT/Research_tool_reel_shorts_captions.srt"
cp build/vo_ig.wav "$OUT/Research_tool_reel_voiceover_instagram.wav"; cp build/vo_yt.wav "$OUT/Research_tool_reel_voiceover_shorts.wav"
