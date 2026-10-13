# Research Tool reel

A 42 second vertical reel with Byte, built from the six panel storyboard (`assets/storyboard.png`) and the Opus 5.5 master production brief.

## Deliverables (in `deliverables/research-reel/`)

| File | What it is |
|---|---|
| `Research_tool_reel_instagram_9x16.mp4` | 1080 x 1920, 30 fps, 42.0 s. Ends on Comment "RESEARCH". |
| `Research_tool_reel_shorts_9x16.mp4` | Same reel. The CTA shot says the workflow is in the pinned comment, because Shorts has no DMs. |
| `Research_tool_reel_*_captions.srt` | Caption files with the correct spellings |
| `Research_tool_reel_voiceover_*.wav` | Voiceover only, as placed on the timeline |
| `posting_package.md` | Instagram caption, hashtags, DM reply, YouTube pinned comment and titles |

Audio is normalised to -14 LUFS. During speech the voice sits about 9 dB above the music and effects. Captions are burned in word by word, and the active word is Amber.

## Claims: what is on screen and why

- **71 REELS ANALYZED** is on screen. It came from the brief and **is not verified**. Confirm it before posting, or tell me the real number.
- **220× MORE REACH is not in either rendered version.** The brief says to use it only once the source, the baseline and the meaning of "reach" are confirmed. Until then, shot 5 uses the brief's fallback (FIND WHAT WORKS, voiced as "Now you know what works").
- The 220× version is already built and laid out (`?v=ig220`). The voice take includes the "Two hundred and twenty times the reach" line. Once the claim is confirmed, render it with:
  `node render.js meta ig220 build/meta_ig220.json && python3 audio.py ig220`, then the same video and mux steps as `render_all.sh` with `ig220`.
- The demo shows an honest handoff: Like, Share, **Copy link**, then paste the link into Claude Code with "analyze this reel". It does **not** show a native Instagram to Claude integration. The phone, the terminal and the dashboard are labelled ILLUSTRATIVE UI. The dashboard bars are labelled SAMPLE DATA and carry no numbers.
- **Check this before posting:** Claude Code cannot download an Instagram video or its audio from a bare link on its own. The workflow you send to commenters needs to do that step, for example with yt-dlp plus a transcription step. If your workflow works differently, tell me and I'll change the terminal lines to match.

## Voiceover

ElevenLabs, voice "Rian, Energetic Explainer Social Media" (the same voice as the Jev reel), model eleven_v4, generation `O8dhWXL07ijNEVet48z6` in flow `m5H7OkfBu7XkWuxBbx27`. One take covers every line, both CTA endings and the alternate 220× line, so the tone matches across versions. Word timings come from faster-whisper small.en (`tools/tx.py`).

The account had 208 ElevenLabs credits left after this take, so three of the four requested variations failed. **There are no retakes on the current plan.**

`vo.py` starts each spoken section at its shot time from the brief (0, 3, 9, 17, 26 and 34 s) and keeps the natural read inside each section. The read is about 28 s long, so shot 5 has about 4.5 s with no voice and the CTA holds for about 4 s at the end. That follows the brief, but see the recommendation below.

## Recommendation: test a tighter cut

At 42 s with about 8.5 s of no voice, this reel will probably lose viewers in the proof and end card holds. A 33 to 35 s cut would keep the same six shots and the same take. It needs earlier `STARTS` in `vo.py` and matching `SH` cut times in `research.js`; everything else is keyed to the spoken words. It's worth A/B testing against the 42 s brief version.

## Byte

Byte's five poses (point, think, grin, cheer, wave) are cut from the storyboard panels. They are upscaled 4x with Real-ESRGAN x4plus anime 6B (ONNX, `tools/upscale.py`) and cut out on the Ember background (`tools/cutout.py`). Because they come from the storyboard, the character stays identical across shots.

What animates independently:
- The pointing hand (shot 1) and the waving hand (shot 6) are separate layers that rotate around the wrist.
- Blinks are eyelid overlays.
- Pops, slides, leans, squash and stretch, breathing, the chin scratch and the side-eye tilt with a sweat drop are whole-body moves.

Limits to know:
- The mouth, eyebrows and eye direction are not rigged. Each pose keeps the expression drawn in the storyboard.
- The storyboard panels cut through Byte's hoodie. The cut sides are placed against the frame edge where possible, otherwise they fade softly into the background.
- For mouth and eyebrow animation, Byte needs layered character art (a separate head, mouth, brows and hands). That's the next upgrade if Byte becomes a recurring host.

## How it is built

- `research.js` + `index.html`: one deterministic canvas timeline, `window.renderFrame(f)`. The six shots are separate functions, and every beat keys off a spoken word index.
- `vo.py`: places the take and writes `timing.js` for `ig`, `yt` and `ig220`.
- `audio.py`: a synthesized 122 bpm electronic bed (Am F C G) that builds through the proof shot, peaks into the CTA cut and resolves on the last frame. It ducks under the voice. SFX follow the cue list in `research.js`. There are no samples, so there is no licence exposure.
- `render.js`: headless Chromium, frame by frame, into ffmpeg. `node render.js stills ig build/stills/x 100,400 --safe` renders review frames with the Instagram UI zones shaded.
- `render_all.sh` rebuilds both versions in about 20 minutes on 4 cores.

## Fonts

Montserrat 600 to 900 and JetBrains Mono 500, both under the OFL (licences in `assets/fonts`).
