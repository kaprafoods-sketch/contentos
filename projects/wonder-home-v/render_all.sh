#!/bin/bash
# Renders every deliverable into deliverables/wonder-home-v
set -e
cd "$(dirname "$0")"
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}
OUT=../../deliverables/wonder-home-v
mkdir -p build "$OUT"
python3 music.py 45 build/music45.wav; python3 music.py 30 build/music30.wav; python3 music.py 15 build/music15.wav
node render.js film "$OUT/WonderHomeV_film_16x9_45s.mp4" 0 build/music45.wav &
node render.js reel "$OUT/WonderHomeV_reel_9x16_30s.mp4" 0 build/music30.wav &
wait
SLUGS=(2bhk-1075 2bhk-study-1175 3bhk-1410 3bhk-1570 3bhk-1670)
for i in 0 1 2 3 4; do
  node render.js layout "$OUT/WonderHomeV_layout_${SLUGS[$i]}_9x16_15s.mp4" $i build/music15.wav &
done
wait
