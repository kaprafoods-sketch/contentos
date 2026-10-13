# Jev reel

60 second vertical reel on Jev from TypeSafe AI, built from the two storyboard sheets (`assets/sheet1.png`, `assets/sheet2.png`) and the beat by beat brief.

## Deliverables (in `deliverables/jev-reel/`)

| File | What |
|---|---|
| `Jev_reel_instagram_9x16.mp4` | 1080 x 1920, 30 fps, about 59.8 s, ends "Comment Jev and I'll DM you the links", hard cut to black |
| `Jev_reel_shorts_9x16.mp4` | Same reel, ends "Links are in the pinned comment" (YouTube Shorts) |
| `Jev_reel_*_captions.srt` | Caption files with correct spellings (Jev, TypeSafe AI, OpenRouter, Opus, Claude) |
| `Jev_reel_voiceover_*.wav` | Voiceover only, as placed on the timeline, for re-editing elsewhere |

Audio is loudness normalised to -14 LUFS (Instagram and Shorts playback level). Word by word captions are burned in, 2 or 3 words at a time, active word in accent green.

## Voiceover

ElevenLabs, voice "Rian, Energetic Explainer Social Media" (Indian English), model eleven_v4, take `KgKbP3QVsWWqNYkkJKLW` (flow `qhOayIClCjDVgpw486NF`). Both endings were read in one take so the tone matches. Jev is sent as IPA /dʒɛv/ so it is never spelled out. Word timings by faster-whisper small.en. `vo.py` trims long pauses (max 0.32 s, 0.45 s before each list number) and speeds the read up 4% so it lands at 60 s.

Script as read:

> This AI model can't write a single sentence. And that's exactly why you need it. Most of what your AI does all day is tiny decisions. Yes or no. Warm or cold. And you're paying Opus prices for them. It's called Jev, from TypeSafe AI. About four cents per million input tokens. Output is free. Four ways to use it. One. Route first. Jev Router picks the model and the reasoning effort for every request. And it's live on OpenRouter. Two. Triage. Send it a hundred lead emails. It tags each one warm, cold, or not a lead. Claude only writes the warm replies. Three. Score. Give it a rubric. It scores every ticket, and tells you how confident it is. Four. Guardrails. One true or false check before anything ships. Claude does the thinking. Jev makes the calls. It's early access, so test it on your own workflow first. Comment Jev and I'll DM you the links. / Links are in the pinned comment.

## Fact check (13 Oct 2026)

- $0.042 per 1M input tokens, output free, early access: TypeSafe launch post, typesafe.ai/blog/introducing-system-one-models-and-jev ("Input tokens: $0.042 / MTok", "Output tokens: FREE (too cheap to meter)", "available today in early access").
- Jev Router: OpenRouter lists `typesafe/jev-router` and describes it as picking "the best model and reasoning effort for each request". Its API pricing reads -1 (variable, billed by the routed model) and it shows no live endpoints. **Nothing confirms it is free**, so the VO says "it's live on OpenRouter", not "it's free". If your screen recording shows "This model is free to use", the line can be changed back.
- Lanes say SMALL, MEDIUM, LARGE. No model names, the listing doesn't say which models it routes to.
- The cost counter in beat 3 is labelled illustrative. The 100 emails, ticket scores and 0.92 confidence are illustrative examples, not Jev output.
- Every price shown on screen carries its source line.

## How it is built

- `jev.js` + `index.html`: one deterministic canvas timeline, `window.renderFrame(f)`. Every animation is keyed to a spoken word index, so a new take only needs `vo.py` rerun. All on screen copy is in `COPY` at the top.
- `vo.py`: places the take, writes `timing.js` for both versions.
- `audio.py`: synthesised low driving bed (112 bpm), ducked under the voice and further during the price and router beats; SFX only where the brief lists them (pop on the four chips, ding on the red counter and on "free", whoosh on JEV and the four name cards, soft riser into the list). No samples, no licence exposure.
- `render.js`: headless Chromium frame by frame into ffmpeg. `node render.js stills ig build/stills/x 300,900 --safe` renders review frames with the Instagram UI zones shaded.
- `srt.py`: caption files.

Rebuild: `./render_all.sh` (about 25 minutes on 4 cores).

## Placeholders to swap before posting

1. **Presenter.** Beats 1, 6, 12 and 13 use the presenter panels cropped from the storyboard sheets, upscaled. They are soft. When the real character take exists, replace those scenes with the footage (or render the reel and lay the take under it in an editor; the VO wav files are in deliverables).
2. **Screen recordings.** None exist yet, and the brief says never fake UI, so the reel shows only motion graphics and real numbers. Drop real recordings into `recordings/` with these names and rerun `./render_all.sh`; each one is overlaid in its window automatically:
   - `01-typesafe-pricing.mp4`: whole price beat
   - `02-openrouter-router.mp4`: from "live on OpenRouter" to the cut
   - `03-choice-triage.mp4`, `04-score.mp4`, `05-noul-check.mp4`: last 1.2 to 1.6 s of each beat

## Fonts

Barlow Condensed (OFL, Latin subset from Google Fonts) and Anek Latin (OFL), in `assets/fonts`.
