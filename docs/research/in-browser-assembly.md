# In-browser assembly: stills + voiceover (+ optional clips) without MP4 export

**Research date:** 2026-09-05 (UTC)  
**Ticket:** `.scratch/short-film-generator/issues/09-in-browser-assembly-research.md`  
**Primary sources:** [MDN Web Docs](https://developer.mozilla.org/), [WHATWG HTML Living Standard (media)](https://html.spec.whatwg.org/multipage/media.html), [W3C Web Audio API](https://www.w3.org/TR/webaudio/), [Chrome for Developers — Autoplay policy](https://developer.chrome.com/blog/autoplay), [WebKit — iOS video policies](https://webkit.org/blog/6784/new-video-policies-for-ios/). No third-party blogs.

**Scope:** First-party / high-trust techniques to assemble a reliable **in-browser Timeline Player** from still images, a voiceover (VO) track, and optional short `<video>` clips — **playback only**, without encoding or exporting an MP4.

---

## Executive answer

| Concern | First-party approach | Trust notes |
| --- | --- | --- |
| Sequence stills | Swap pre-decoded `<img>` / `ImageBitmap` on a single stage (DOM or canvas) from a scripted timeline | Decode ahead of cut points ([`HTMLImageElement.decode()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode), [`createImageBitmap()`](https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap)) |
| Master clock | Prefer **Web Audio** `AudioContext.currentTime` for VO-led timing | High-precision audio timeline ([`BaseAudioContext.currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)); visuals follow audio |
| VO playback | Short VO (~15–30s): `decodeAudioData` → `AudioBufferSourceNode.start(when)` | Preferred for sample-accurate scheduling ([MDN best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices); [`decodeAudioData`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)) |
| Alt VO path | `<audio>` / `HTMLMediaElement.currentTime` as clock | Simpler; coarser, approximated position ([`currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime); [HTML media timeline](https://html.spec.whatwg.org/multipage/media.html)) |
| Optional clips | Muted `<video playsinline>` (DOM overlay or `drawImage` to canvas) started at timeline offsets | Muted / no-audio autoplay often allowed; audible needs gesture ([Chrome](https://developer.chrome.com/blog/autoplay), [WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/)) |
| Autoplay | Explicit **Play** control; resume `AudioContext` + `play()` under user gesture | Treat any scripted start as autoplay ([MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)) |
| Drift | Drive visuals from audio clock each frame; do not chain `setTimeout` cut lists | rAF pauses in background ([`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)); audio clock stops when context is suspended ([`currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)) |

**Recommended for a ~15–30s stills+VO player:** preload and decode all stills; decode the full VO into an `AudioBuffer`; start playback from a user gesture; use `AudioContext.currentTime` as the sole master clock; advance stills (and optional muted clips) in a `requestAnimationFrame` loop by comparing wall-timeline offsets to that clock. Do **not** encode an MP4 for preview.

---

## 1. Sequencing images (stills)

### Technique A — DOM stage (single `<img>` or stacked layers)

- Build a shot list: `{ src, startSec, endSec }[]` on a shared timeline.
- Preload each still with `new Image()`, set `src`, then `await img.decode()` so the bitmap is ready before the cut ([`HTMLImageElement.decode()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)). MDN states this avoids delaying the next paint after the image is added to the DOM.
- On each cut, swap `src` / visibility / opacity on one (or two) elements. Crossfades are CSS/`requestAnimationFrame` opacity only — still not a muxed file.

### Technique B — Canvas stage

- Decode into `ImageBitmap` via [`createImageBitmap()`](https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap) (or draw from a loaded `HTMLImageElement`).
- Each frame (or only on cut), call [`CanvasRenderingContext2D.drawImage()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage). The canvas 2D API accepts `HTMLImageElement`, `ImageBitmap`, `HTMLVideoElement`, and related sources.
- Useful when optional clip frames must share one compositor (still + video frame painted into the same canvas).

### Constraints

- Still sequencing is **application-defined**; HTML has no first-party “image timeline” element. Timing must come from script (see §5).
- Decode cost and memory scale with resolution × shot count. For a short film preview, decode-all-up-front is appropriate; for long programs, decode a look-ahead window instead.
- Obsolete HTML **`MediaController` / `mediagroup`** must not be used for sync — MDN marks them obsolete on [`HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement).

---

## 2. Syncing audio: Web Audio vs `<audio>`

### Web Audio (recommended master for short VO)

MDN’s Web Audio overview: timing is controlled with **high precision and low latency**, suitable for sequencers ([Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)).

| Step | API | Role |
| --- | --- | --- |
| Decode file bytes | [`BaseAudioContext.decodeAudioData()`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) | Complete file → `AudioBuffer` (resampled to context sample rate). Preferred path to create a Web Audio source from a track ([same page](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)). |
| Play once | [`AudioBufferSourceNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) + [`start(when)`](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start) | `when` is in the **same time coordinate system** as `AudioContext.currentTime`. Node is one-shot; recreate to replay (buffers are reusable). |
| Read clock | [`BaseAudioContext.currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime) | Seconds on the audio timeline; advances in render-quantum steps (~128 frames); **stops while the context is suspended**; separate from `Date.now()`. Spec: [Web Audio API — `currentTime`](https://www.w3.org/TR/webaudio/#dom-baseaudiocontext-currenttime). |

**Buffer vs media element (MDN best practices):** use a **buffer** for shorter, sample-like assets needing precision; use an **HTMLMediaElement** graph source when you need streaming of full-length tracks ([Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)). A 15–30s VO fits the buffer model.

**Lookahead scheduling pattern (authoritative MDN tutorial):** schedule audio slightly ahead using `audioCtx.currentTime`, and drive UI from that same clock in `requestAnimationFrame` — not from chained timeouts alone ([Advanced techniques: Creating and sequencing audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)). The tutorial’s `draw()` loop compares queued note times to `audioCtx.currentTime` then calls `requestAnimationFrame(draw)`.

### `<audio>` / `HTMLMediaElement` (acceptable simpler clock)

- Play VO with [`HTMLMediaElement.play()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play); read [`currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime) each frame to decide which still is active.
- WHATWG HTML: media elements have a **current playback position** on the media timeline; `currentTime` returns the **official playback position**, kept stable while scripts run ([HTML Living Standard — media](https://html.spec.whatwg.org/multipage/media.html)).
- MDN: `currentTime` is an **approximation**; successive reads can repeat the same value; update frequency depends on the browser/media pipeline ([`HTMLMediaElement.currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime)).

**Trade-off for this product:** `<audio>` is easier (seeking, native controls, streaming) but weaker as a sample-accurate film clock. Web Audio buffers are stronger for a fixed short VO + hard still cuts.

### Hybrid

- `MediaElementAudioSourceNode` can route `<audio>`/`<video>` into a Web Audio graph for effects/metering ([Web Audio API interfaces](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)), but the media element’s transport remains the media timeline — still not as schedulable as `AudioBufferSourceNode.start(when)`.

---

## 3. Embedding short `<video>` clips

### DOM overlay

- Place a single (or pooled) [`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) above/beside the still stage.
- At clip start: set `src` / `srcObject`, seek if needed (`currentTime`), call `play()`.
- Prefer **`muted` + `playsinline`** when the clip is B-roll under VO (VO already occupies the audible role). WebKit documents `playsinline` for inline iPhone playback; muted / no-audio tracks may autoplay without a gesture ([WebKit iOS video policies](https://webkit.org/blog/6784/new-video-policies-for-ios/)). Chrome: muted autoplay is always allowed ([Chrome autoplay policy](https://developer.chrome.com/blog/autoplay)).

### Canvas paint

- WebKit’s iOS policy examples show painting a playing `<video>` to canvas with `drawImage` + `requestAnimationFrame` ([WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/)).
- MDN notes `drawImage()` on `HTMLVideoElement` works correctly when `readyState` is greater than 1 ([`drawImage` notes](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)).
- WHATWG: a `video` element provides a paint source for the frame at the current playback position ([HTML media — video](https://html.spec.whatwg.org/multipage/media.html)).

### Sync model for clips under a VO master

1. Record clip `{ startSec, durationSec, src }` on the same timeline as stills.
2. When `audioClock >= startSec`, start (or resume) the muted video; when past `endSec`, pause and hide.
3. If the clip has its **own** audio, either mute it (VO wins) or mix carefully — simultaneous audible elements multiply autoplay and ducking complexity ([MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)).

### Constraints

- Each audible `play()` outside a user gesture is subject to autoplay blocking ([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide); [Chrome](https://developer.chrome.com/blog/autoplay)).
- Safari historically grants autoplay relief **per element**; WebKit advises reusing one media element and changing `src` for back-to-back clips when sound is involved ([WebKit macOS auto-play](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)).
- Decoding multiple concurrent videos is costly; pool one player for a short timeline.

---

## 4. Autoplay policies (blocking and unlock)

### What counts as autoplay

MDN: autoplay includes the HTML `autoplay` attribute **and** any script that starts media **outside** a user-input handler — including `media.play()` and Web Audio source `start()` ([Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)).

### Typical allow rules

| Source | Rule of thumb |
| --- | --- |
| [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide) | Audible media generally needs prior user interaction, mute/volume 0, site allowlist, or Permissions Policy; inaudible/muted often exempt |
| [Chrome](https://developer.chrome.com/blog/autoplay) | Muted autoplay always allowed; sound allowed after domain interaction, high Media Engagement Index (desktop), or installed PWA/homescreen |
| [WebKit iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/) | Muted / no-audio-track video may `autoplay` / `play()` without gesture; unmute without gesture pauses; use `playsinline` for inline iPhone |
| Web Audio ([Chrome](https://developer.chrome.com/blog/autoplay), [MDN best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)) | Create or **`resume()`** `AudioContext` from a user gesture; contexts created on load often start `suspended` |

### Product implications

- Ship an explicit **Play** control. On click/`pointerup`: `await audioCtx.resume()`, then `source.start(audioCtx.currentTime + offset)` (and start any unmuted media).
- Handle [`play()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play) promise rejection (`NotAllowedError`) by showing Play UI ([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide); [Chrome](https://developer.chrome.com/blog/autoplay)).
- Optional: `navigator.getAutoplayPolicy(...)` where supported ([MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)).
- Do not depend on VO autoplaying on first paint.

---

## 5. Timing drift and background behavior

### Clocks available

| Clock | Resolution / behavior | Use |
| --- | --- | --- |
| `AudioContext.currentTime` | Audio render quanta; pauses when context suspended ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)) | **Master** for VO-led film |
| `HTMLMediaElement.currentTime` | Official playback position; approximate ([HTML](https://html.spec.whatwg.org/multipage/media.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime)) | Alt master if VO is `<audio>` |
| rAF `timestamp` / `document.timeline.currentTime` | Display refresh; **paused in background tabs** ([`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)) | Paint / still swaps |
| `performance.now()` | Monotonic ms; coarsened for fingerprinting ([`performance.now`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)) | Profiling; not a substitute for media clocks |

MDN’s rAF docs warn: always advance animation from the callback timestamp (or another clock); syncing to `BaseAudioContext.currentTime` is limited to about one frame of precision ([`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)).

### Drift failure modes

1. **Chained `setTimeout` cut lists** — main-thread jitter; MDN Page Visibility notes timers are **throttled** in background tabs ([Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)). Prefer absolute times on the audio/media timeline.
2. **Visual clock independent of audio** — stills “run away” from VO. Fix: each frame `shotIndex = findShot(audioCtx.currentTime - t0)`.
3. **Background tabs** — rAF stops; audio may continue if playing (tabs playing audio are often treated as foreground for throttling) ([Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)). On `visibilitychange`, optionally pause both VO and visuals for preview UX (MDN example pauses `<audio>` when hidden).
4. **Suspended `AudioContext`** — `currentTime` stops advancing ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)); resume on user gesture ([`AudioContext.resume()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)).
5. **Video vs VO** — clip media timeline can stall on buffer underrun (`waiting` events on [`HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)). For short muted clips, preload to `canplaythrough` before Play.

### Anti-drift pattern (short form)

```text
t0 = audioCtx.currentTime   // captured when VO starts
on each animation frame:
  t = audioCtx.currentTime - t0
  show still (or clip) whose [start, end) contains t
  if t >= totalDuration: stop
```

This matches MDN’s sequencer pattern: schedule/play audio on the audio clock; draw UI from that clock in rAF ([Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)).

---

## 6. Recommended approach (~15–30s stills + VO player)

**Goal:** reliable preview Timeline Player, no MP4 encode.

1. **Asset prep**
   - Fetch VO bytes → `decodeAudioData` → hold one `AudioBuffer`.
   - For each still: `Image` / `createImageBitmap` + `decode()`; keep an ordered shot list with absolute `startSec`/`endSec` (derived from VO duration / edit decisions).
   - Optional clips: one pooled `<video muted playsinline preload="auto">`; wait for enough data before enabling Play.

2. **Transport**
   - UI: Play / Pause / scrub (optional).
   - On Play (user gesture): `audioCtx.resume()`; create `AudioBufferSourceNode`, set `buffer`, `connect(destination)`, `start(when, offset)` for pause/resume semantics (new node per start — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)).
   - Store `t0 = when` (or `audioCtx.currentTime` at start) and any pause offset.

3. **Compositor**
   - Default: full-bleed still stage (DOM or canvas).
   - rAF loop reads `t = audioCtx.currentTime - t0` and selects the active still; swap only when the shot id changes.
   - When a clip window is active, show/play muted video (DOM or `drawImage`); otherwise hide/pause it.

4. **Pause / seek**
   - Pause: `source.stop()`; remember `pausedAt = t`; suspend or leave context running per UX.
   - Seek: set `pausedAt`; on resume, `start(now, pausedAt)` with correct buffer offset; jump still/clip to match.

5. **Autoplay / a11y**
   - Never assume autoplay; gate on gesture ([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)).
   - Provide visible play/pause and volume/mute ([Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)).

6. **Out of scope (this ticket)**
   - Client-side MP4 mux/encode (WebCodecs, ffmpeg.wasm, MediaRecorder capture of canvas+audio) — valid for **export**, not required for an in-browser timeline **player**.

### Optional libraries (documented on MDN only)

MDN lists **Tone.js** (scheduling/instruments) and **howler.js** (Web Audio with HTML Audio fallback) as libraries built on these APIs ([Web Audio API — See also](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API); [best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)). They are wrappers, not a separate platform capability; a 15–30s stills+VO player does not require them if the first-party pattern above is implemented carefully.

---

## 7. Claim → source index

| Claim | Source |
| --- | --- |
| Web Audio supports high-precision scheduling for sequencers | [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) |
| `currentTime` is the audio timeline; stops when suspended | [MDN `currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime); [W3C Web Audio](https://www.w3.org/TR/webaudio/#dom-baseaudiocontext-currenttime) |
| `start(when)` uses `AudioContext` time coordinates | [MDN `AudioScheduledSourceNode.start`](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start) |
| Buffers preferred for short precise sounds; media elements for long streaming | [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) |
| Lookahead schedule + rAF UI from `audioCtx.currentTime` | [MDN Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) |
| `decodeAudioData` decodes complete files to `AudioBuffer` | [MDN `decodeAudioData`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) |
| `AudioBufferSourceNode` is one-shot / fire-and-forget | [MDN `AudioBufferSourceNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) |
| Image decode-before-DOM avoids next-frame delay | [MDN `HTMLImageElement.decode`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode) |
| Canvas can draw images and video frames | [MDN `drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage); [HTML video paint source](https://html.spec.whatwg.org/multipage/media.html) |
| `currentTime` on media is official/approximate playback position | [HTML media](https://html.spec.whatwg.org/multipage/media.html); [MDN `currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime) |
| Autoplay includes scripted `play()` and Web Audio start | [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide) |
| Chrome muted vs audible autoplay rules | [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay) |
| iOS muted/`playsinline` video policies | [WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/) |
| rAF paused in background; use timestamp for progress | [MDN `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) |
| Background timer throttling; audio-playing tabs often unthrottled | [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) |
| Resume suspended `AudioContext` after gesture | [MDN `resume`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume); [Chrome autoplay](https://developer.chrome.com/blog/autoplay) |
| `MediaController` obsolete | [MDN `HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement) |
