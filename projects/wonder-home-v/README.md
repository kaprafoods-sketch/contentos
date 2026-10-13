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

To change copy, edit `COPY` in `wh.js`, run `node check.js`, then `./render_all.sh`.

## Client instructions

- No UP RERA mention anywhere (no registration number, no up-rera.in, no RERA QR). Client instruction, 13 Oct 2026. `check.js` fails the build if "RERA" appears on screen.
- End card carries: Freehold property. iPhone 17 Pro at every booking.
