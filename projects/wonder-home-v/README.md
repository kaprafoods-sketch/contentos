# Wonder Home V motion graphics

2D flat motion graphics and kinetic typography for Wonder Home V, Sector 101, Noida.

## Deliverables (in `deliverables/wonder-home-v/`)

| File | Format |
|---|---|
| `WonderHomeV_film_16x9_45s.mp4` | 1920 x 1080, 45 s, 30 fps, H.264 + AAC |
| `WonderHomeV_reel_9x16_30s.mp4` | 1080 x 1920, 30 s, 30 fps |
| `WonderHomeV_layout_<home>_9x16_15s.mp4` (x5) | 1080 x 1920, 15 s, 30 fps, one per layout |

## How it is built

- `index.html` + `wh.js`: every composition is a deterministic timeline. `window.renderFrame(f)` draws frame `f`. All on screen copy lives in the `COPY` and `LAYOUTS` objects at the top of `wh.js`.
- `render.js`: drives headless Chromium frame by frame and pipes PNGs into ffmpeg.
- `music.py`: synthesizes the soft instrumental bed locally (no samples, no licence exposure).
- `check.js`: checks every brief string is on screen exactly, banned words and dashes are absent, payment steps total 100%, and Anek Devanagari is loaded for the Hindi line.
- `safe.js`: checks no reel text sits in the top 250 px or bottom 350 px.

Rebuild everything: `./render_all.sh` (needs Node 22, Playwright Chromium, ffmpeg, Python with numpy and scipy).

To change copy (for example the RERA number), edit `COPY` in `wh.js`, run `node check.js`, then `./render_all.sh`.

## Placeholders to replace before release

- UP RERA registration no. `UPRERAPRJ000000`
- Project QR code (dashed box on the end card)
