# liquidGL explainer

75 second explainer for liquidGL (github.com/naughtyduk/liquidGL, README v3.0.0, checked 13 Oct 2026).

## Deliverables (in `deliverables/liquidgl-explainer/`)

| File | Format |
|---|---|
| `liquidGL_explainer_16x9_75s.mp4` | 1920 x 1080, 75 s, 30 fps, H.264 + AAC, loudness normalised to -16 LUFS |
| `liquidGL_explainer_captions.srt` | Captions timed to the voiceover |

## How it is built

- `lg.js` + `index.html`: one deterministic timeline, `window.renderFrame(f)` draws frame `f`. Scene content is painted into two 2D canvases (behind the glass and on top of it). A WebGL2 pass chain then refracts the background through every pane: rounded rect SDF, bevel displacement that is strongest at the edge, magnification, optional frost, tint, chromatic aberration (blue displaced further than red, vanishing at the flat centre) and a viscous fluid displacement. Panes are drawn in order, so a stacked pane refracts the panes below it. Scene transitions are a tall glass pane sweeping right to left with the next scene revealed through it.
- All on screen copy lives in `COPY` at the top of `lg.js`.
- `vo.py`: places each voiceover line at its scene and writes `timing.js` (scene starts and the absolute time of every spoken word). Animations key off spoken words, so changing the voice take only needs `vo.py` rerun.
- `audio.py`: synthesises the ambient bed and sound design (whooshes on pane moves, glass chimes on reveals, ticks, key clicks), ducks the bed under the voice and mixes.
- `render.js`: drives headless Chromium (SwiftShader WebGL) frame by frame into ffmpeg. `node render.js stills build/stills/x 120,270` renders review frames.
- `srt.py`: writes the caption file.

Rebuild everything: `./render_all.sh` (about 35 minutes on 4 cores).

## Voiceover

ElevenLabs, voice "Aabo, Engaging Confident Explainer", model eleven_v4, take `ZtZwNa6uSMJ14XLOtSiQ` (flow etb6U18CgvNbx4Fx0cZN). Word timings by faster-whisper small.en. Product names are spelled phonetically in the TTS prompt (Liquid G L, Web G L, naughty duck) and correctly on screen and in captions.

## Accuracy notes

- Fallback chain shown is the README's: WebGPU, WebGL2, WebGL1, CSS backdrop-filter. The CSS pill is drawn as flat frosted glass because that is what the CSS fallback is.
- Aberration is shown as red and blue splitting at the bevel, matching the README description.
- No performance numbers, star counts, Apple marks or device frames. No claim that CSS animations refract or that it works flawlessly everywhere.
- The code shown (`npm install liquid-gl`, `liquidGL({ target: ".liquidGL" })`) is taken from the README.

## Fonts

Inter (OFL) and JetBrains Mono (OFL), bundled in `assets/fonts`.
