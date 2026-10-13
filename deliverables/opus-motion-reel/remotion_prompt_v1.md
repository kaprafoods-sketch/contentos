# Claude Code Prompt — Motion Graphics for the Complete Reel

Paste into Claude Code. It scaffolds a Remotion project and builds every animated
scene for the 45-second Opus 5.5 reel, ready to render to 1080x1920 MP4.

---

> Build a Remotion project that renders the complete motion-graphics reel described
> below. React + Remotion, TypeScript.
>
> ## Canvas
> - 1080x1920 (9:16), 30 fps, 45 seconds total (1350 frames)
> - Background: flat `#FF3300` on every scene. No gradients.
> - Font: Montserrat ExtraBold (Google Fonts) for all headline/kinetic text, white
>   `#FFFFFF`. Accent keyword color: amber `#FFB020`.
> - One `Reel.tsx` composition assembling six `<Sequence>` scenes with the timings below.
>
> ## Assets
> Copy these into `public/` and use them as the Byte character (do not redraw him):
> - `~/workspace/ai-character/media-generation-byte-v3-pointing-0-98d305f2-826a-40ac-8834-1455708b29b5.webp` → `public/byte-pointing.webp`
> - `~/workspace/ai-character/media-generation-byte-v3-board-0-a933b3cb-78d6-4708-9428-642a1a67a363.webp` → crop the four poses into `public/byte-neutral.webp`, `public/byte-grin.webp`, `public/byte-thinking.webp`, `public/byte-wave.webp` (crop with sharp/similar before building)
> - `~/workspace/ai-character/media-generation-byte-v3-pfp-0-a2c11201-f74a-4d30-9556-9e82007a235e.webp` → `public/byte-pfp.webp`
>
> ## Animation language (use everywhere)
> - Text: spring-in word by word (stagger 3 frames), scale 0.6→1, slight overshoot
> - Scene transitions: hard cut or 6-frame push-zoom. No fades, no wipes.
> - Byte entrances: slide up + spring scale from 0.8
> - Emphasis: 8-frame punch-zoom (scale 1→1.15) on the key number/word of each scene
> - Loop subtle float (±10px, 2s) on Byte when he holds a pose
>
> ## Scenes
>
> ### Scene 1 — Title card (0:00–0:03, frames 0–90)
> - White text top-center, upper third: `OPUS 5.5` (120px), spring word-by-word
> - Byte pointing pose lower-right, slides up on frame 10
> - VO line: "Most people still think AI can't do real motion design."
>
> ### Scene 2 — The old pain (0:03–0:10, frames 90–300)
> - White text top: `A YEAR AGO…`
> - Build with code (no stock): a wobbling distorted rectangle with warped
>   placeholder text melting via skew/wave animation, then a fake After Effects
>   timeline bar filling slowly with a "rendering…" label
> - Byte thinking pose bottom corner from frame 150
> - VO line: "A year ago, fair. You'd get a wobbly clip with melting text — and lose the whole afternoon fixing it in After Effects."
>
> ### Scene 3 — The shift (0:10–0:18, frames 300–540)
> - White text top: `EVERY FRAME IS CODE`
> - Terminal window (dark `#111111`, rounded 24px): monospace code lines typing
>   themselves, then rendered frames popping into a row beneath, snapping into a
>   timeline with amber sound-wave cues aligning to cuts
> - Byte grin pose watching from the side, frame 380
> - VO line: "Now Opus 5.5 writes the whole piece as code inside Claude Code. Every frame, every sound cue, lined up with the cuts. One prompt."
>
> ### Scene 4 — The showreel (0:18–0:30, frames 540–900)
> - White text top: `ONE PROMPT` (punch-zoom on frame 560)
> - Montage, 3 beats × 4s, hard cuts: (a) kinetic typography words slamming in
>   with spring overshoot, (b) particle dots converging into shapes, (c) amber
>   waveform bars pulsing like an equalizer
> - Byte cheering pose layered small in a corner throughout
> - VO line: "One prompt made this entire twenty-second showreel. Kinetic type, particles, waveforms — sound effects included."
>
> ### Scene 5 — Templates (0:30–0:38, frames 900–1140)
> - White text top: `9 TEMPLATES`
> - 3×3 grid of tiles staggering in with springs; each tile a mini-loop (one word
>   pop, one waveform, one particle burst — reuse Scene 4 primitives)
> - Punch-zoom on the grid at frame 1000
> - VO line: "Nine templates deep. The gap to a good human designer is shrinking fast."
>
> ### Scene 6 — End card (0:38–0:45, frames 1140–1350)
> - Byte wave pose centered, gentle float loop
> - White text above: `Comment "PROMPTS"` — the word PROMPTS in amber `#FFB020`
> - VO line: "Comment PROMPTS and I'll DM you the exact prompt library I use for these."
>
> ## Captions
> - Burn in word-by-word captions for the VO lines above: white Montserrat Bold
>   64px, dark `#111111` outline, bottom-center safe area, current word highlighted
>   amber. Timing follows the per-scene VO lines; distribute words evenly across
>   each scene's frame range.
>
> ## Render
> - `npx remotion render Reel out/reel.mp4 --codec h264`
> - Verify: `ffprobe` duration ≈ 45s, resolution 1080x1920.
> - Leave a clearly marked `AUDIO` slot (voiceover MP3 + background music ducked
>   to −18dB under voice) so I can drop the final mix in without touching scenes.
>
> Keep every visual inside the Ember/Ink/Paper/Amber palette. If a scene needs a
> supporting graphic, build it in code — no external images except the Byte assets.

---

## Notes for you (not part of the paste)

- The VO lines are timed for ~140 words at a punchy pace. Generate the voiceover
  first (TTS), then tell Claude the exact MP3 durations if any scene needs retiming.
- Music: add your track in the AUDIO slot; Claude ducks it automatically per the spec.
- Same prompt structure works for any reel — swap the 6 scenes + VO lines with that
  reel's storyboard PART 2.
