#!/bin/bash
# Rebuilds both Jev reel versions into deliverables/jev-reel
# Needs Node 22 + Playwright Chromium, ffmpeg, Python with numpy and scipy.
# build/vo_a.mp3 + build/vo_a_words.json (ElevenLabs take + faster-whisper timings) must exist.
# Optional real screen recordings in recordings/<name>.mp4 (names in README) are overlaid in their windows.
set -e
cd "$(dirname "$0")"
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}
OUT=../../deliverables/jev-reel
mkdir -p build "$OUT"
python3 vo.py
for v in ig yt; do node render.js meta $v build/meta_$v.json; python3 audio.py $v; done
for v in ig yt; do
  N=$(python3 -c "import json;print(round(json.load(open('build/meta_$v.json'))['total']*30))"); H=$(( (N+1)/2 ))
  node render.js video $v build/${v}_0.mp4 0 $H > build/${v}_0.log 2>&1 &
  node render.js video $v build/${v}_1.mp4 $H $N > build/${v}_1.log 2>&1 &
done
wait
for v in ig yt; do
  printf "file '%s'\n" ${v}_0.mp4 ${v}_1.mp4 > build/chunks_$v.txt
  ffmpeg -y -v error -f concat -safe 0 -i build/chunks_$v.txt -c copy build/silent_$v.mp4
  # overlay any real screen recordings that exist, inside the content box, in their windows
  python3 - "$v" > build/ovl_$v.sh <<'PY'
import json, os, sys
v = sys.argv[1]; m = json.load(open(f'build/meta_{v}.json'))
ins, fl, last, n = [], [], '0:v', 0
for r in m['recs']:
    p = f"recordings/{r['file']}.mp4"
    if not os.path.exists(p): continue
    n += 1; ins += ['-i', p]
    fl.append(f"[{n}:v]scale=900:860:force_original_aspect_ratio=increase,crop=900:860,setpts=PTS-STARTPTS+{r['t0']}/TB[r{n}]")
    fl.append(f"[{last}][r{n}]overlay=90:400:eof_action=pass:enable='between(t,{r['t0']},{r['t1']})'[o{n}]"); last = f'o{n}'
if n: print('ffmpeg -y -v error -i build/silent_%s.mp4 %s -filter_complex "%s" -map "[%s]" -c:v libx264 -crf 16 -pix_fmt yuv420p build/video_%s.mp4' % (v, ' '.join(ins), ';'.join(fl), last, v))
else: print(f'cp build/silent_{v}.mp4 build/video_{v}.mp4')
PY
  bash build/ovl_$v.sh
done
ffmpeg -y -v error -i build/video_ig.mp4 -i build/mix_ig.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/Jev_reel_instagram_9x16.mp4"
ffmpeg -y -v error -i build/video_yt.mp4 -i build/mix_yt.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/Jev_reel_shorts_9x16.mp4"
python3 srt.py ig "$OUT/Jev_reel_instagram_captions.srt"
python3 srt.py yt "$OUT/Jev_reel_shorts_captions.srt"
cp build/vo_ig.wav "$OUT/Jev_reel_voiceover_instagram.wav"; cp build/vo_yt.wav "$OUT/Jev_reel_voiceover_shorts.wav"
