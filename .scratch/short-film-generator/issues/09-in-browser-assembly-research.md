# 09 — In-browser Assembly without MP4 export

Type: research
Status: resolved

## Question

What first-party / high-trust techniques exist to Assemble Stills + Voiceover (+ optional Clip elements) into a reliable in-browser Timeline Player without encoding an MP4?

Investigate HTML/Web APIs (e.g. `<img>`/`<video>` sequencing, Web Audio, `requestAnimationFrame` timelines, libraries only if widely used and documented from primary sources). Capture constraints around autoplay, decoding, and sync. Write findings to `docs/research/in-browser-assembly.md` and leave a pointer on this ticket.

## Answer

**Gist:** For a ~15–30s stills+VO preview, decode the VO into an `AudioBuffer`, use `AudioContext.currentTime` as the master clock, pre-decode stills (`decode()` / `ImageBitmap`), and advance cuts in `requestAnimationFrame` from that clock. Optional B-roll uses muted `playsinline` `<video>` (DOM or canvas `drawImage`). Gate start on a user gesture (`AudioContext.resume()` / `play()`). Do not encode an MP4 for playback.

Full write-up (primary-source citations): [`docs/research/in-browser-assembly.md`](../../../docs/research/in-browser-assembly.md)
