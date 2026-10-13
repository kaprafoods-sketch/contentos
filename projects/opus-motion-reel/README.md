# Opus 5.5 motion design reel

A 9 shot vertical reel with Byte about the Opus 5.5 motion design trend, built from the storyboard (`assets/storyboard.png`). It uses the verified script in `deliverables/opus-motion-reel/script.md`, not the storyboard's VO lines (the @leadgenman demo and "nine templates" could not be verified).

## Deliverables (in `deliverables/opus-motion-reel/`)

| File | What it is |
|---|---|
| `Opus_motion_reel_instagram_9x16.mp4` | 1080 x 1920, 30 fps, about 42.2 s. Ends on Comment "PROMPTS". |
| `Opus_motion_reel_shorts_9x16.mp4` | Same reel, about 41.7 s. Ends on the pinned comment, because Shorts has no DMs. |
| `Opus_motion_reel_*_captions.srt` | Caption files |
| `Opus_motion_reel_voiceover_*.wav` | Voiceover only, as placed |
| `script.md` | The verified script, what changed from the storyboard and why, and the fact sheet with sources |
| `posting_package.md` | Caption, hashtags, DM reply, pinned comment, Shorts titles |

## Voice

Kokoro-82M (Apache 2.0, local ONNX via kokoro-onnx), voice `am_puck`, speed 1.12. It's free and runs offline, chosen because ElevenLabs had 208 of the roughly 750 credits needed. `tools/tts.py` makes one clip per section and the faster-whisper word timings. `vo.py` places the sections back to back with short beats, adds extra room after the visual proof shots, and splits shot 5 so KINETIC TYPE can be read.

To swap in another voice (ElevenLabs or your own read): write one clip per section to `build/sec_<k>.wav`, rerun the whisper part of `tools/tts.py` for `build/sec_words.json`, then `./render_all.sh`. Every beat and caption follows the new timing.

## How it is built

Same engine as the Research Tool reel:
- `opus.js`: a deterministic canvas timeline with nine shot functions, keyed to the spoken words.
- Byte poses are the cutouts from the Research Tool reel (same character, same art).
- The melting text, particle reveal, waveform, style tiles and globe are all drawn in code.
- `audio.py`: a synthesized 126 bpm bed (no samples) that builds under "the gap is shrinking", crashes into the CTA and ducks under the voice, plus SFX on every cue.
- `./render_all.sh` rebuilds both versions in about 5 minutes on 4 cores.

The phone, terminal, timeline and director's brief are illustrative and labelled ILLUSTRATIVE on screen. The brief text in shot 8 is made-up example content, there to show what a long brief looks like.

## Why not the Remotion prompt

`remotion_prompt_v1.md` describes a different cut (6 scenes and different VO). It also points to Byte files under `~/workspace/ai-character/`, which aren't in this environment. I built this reel on the same canvas pipeline as the last two so the look stays consistent. The prompt is still useful as a DM asset (see the posting package).
