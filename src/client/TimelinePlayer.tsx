import { useEffect, useMemo, useRef, useState } from "react";
import type { Assembly, FilmPlan, ProjectId } from "@shared";

type Props = {
  projectId: ProjectId;
  assembly: Assembly;
  filmPlan?: FilmPlan;
};

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TimelinePlayer({ projectId, assembly, filmPlan }: Props) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const total = assembly.totalDurationSeconds;

  const currentBeatIndex = useMemo(() => {
    const idx = assembly.beats.findIndex(
      (beat) =>
        elapsed >= beat.startSeconds &&
        elapsed < beat.startSeconds + beat.durationSeconds,
    );
    return idx === -1 ? Math.max(0, assembly.beats.length - 1) : idx;
  }, [assembly.beats, elapsed]);

  const currentBeat = assembly.beats[currentBeatIndex];
  const currentShot = filmPlan?.shots.find((shot) => shot.id === currentBeat?.shotId);

  useEffect(() => {
    let cancelled = false;
    async function preload() {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const map = new Map<string, AudioBuffer>();
      for (const beat of assembly.beats) {
        if (!beat.voiceoverAssetPath) continue;
        const url = `/api/projects/${projectId}/${beat.voiceoverAssetPath}`;
        const response = await fetch(url);
        if (!response.ok) continue;
        try {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          map.set(beat.shotId, buffer);
        } catch {
          // Fake voiceover bytes may not be decodable; Player still works visually.
        }
      }
      if (!cancelled) {
        buffersRef.current = map;
        setAudioReady(true);
      }
    }
    void preload().catch(() => setAudioReady(true));
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      for (const source of sourcesRef.current) {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
      }
      void audioContextRef.current?.close();
    };
  }, [assembly, projectId]);

  function stopSources() {
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* ignore */
      }
    }
    sourcesRef.current = [];
  }

  function scheduleFrom(atSeconds: number) {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    stopSources();
    for (const beat of assembly.beats) {
      const buffer = buffersRef.current.get(beat.shotId);
      if (!buffer) continue;
      const localOffset = atSeconds - beat.startSeconds;
      if (localOffset >= beat.durationSeconds) continue;
      if (beat.startSeconds + beat.durationSeconds <= atSeconds) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const when = ctx.currentTime + Math.max(0, beat.startSeconds - atSeconds);
      const offset = Math.max(0, localOffset);
      const duration = Math.max(0, Math.min(buffer.duration - offset, beat.durationSeconds - offset));
      try {
        source.start(when, offset, duration);
        sourcesRef.current.push(source);
      } catch {
        /* ignore */
      }
    }
  }

  function tick() {
    const ctx = audioContextRef.current;
    if (!ctx || startedAtRef.current == null) return;
    const next = offsetRef.current + (ctx.currentTime - startedAtRef.current);
    if (next >= total) {
      setElapsed(total);
      setPlaying(false);
      stopSources();
      startedAtRef.current = null;
      offsetRef.current = 0;
      return;
    }
    setElapsed(next);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function togglePlay() {
    const ctx = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    if (playing) {
      offsetRef.current = elapsed;
      startedAtRef.current = null;
      setPlaying(false);
      stopSources();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      videoRef.current?.pause();
      return;
    }

    const startAt = elapsed >= total ? 0 : elapsed;
    offsetRef.current = startAt;
    startedAtRef.current = ctx.currentTime;
    setElapsed(startAt);
    scheduleFrom(startAt);
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  function jumpToBeat(index: number) {
    const beat = assembly.beats[index];
    if (!beat) return;
    const wasPlaying = playing;
    stopSources();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setElapsed(beat.startSeconds);
    offsetRef.current = beat.startSeconds;
    if (wasPlaying && audioContextRef.current) {
      startedAtRef.current = audioContextRef.current.currentTime;
      scheduleFrom(beat.startSeconds);
      rafRef.current = requestAnimationFrame(tick);
      setPlaying(true);
    } else {
      startedAtRef.current = null;
      setPlaying(false);
    }
  }

  const stillUrl = currentBeat?.stillAssetPath
    ? `/api/projects/${projectId}/${currentBeat.stillAssetPath}`
    : undefined;
  const clipUrl =
    currentBeat?.clipAssetPath && !currentBeat.clipFailed
      ? `/api/projects/${projectId}/${currentBeat.clipAssetPath}`
      : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clipUrl || !currentBeat) return;
    const local = elapsed - currentBeat.startSeconds;
    if (playing) {
      if (video.paused) void video.play().catch(() => undefined);
      if (Math.abs(video.currentTime - local) > 0.35) {
        video.currentTime = Math.max(0, local);
      }
    } else {
      video.pause();
      video.currentTime = Math.max(0, local);
    }
  }, [playing, elapsed, clipUrl, currentBeat]);

  const aspectClass =
    assembly.aspectRatio === "9:16"
      ? "player__stage--portrait"
      : "player__stage--landscape";

  return (
    <section className="player" aria-label="Timeline Player">
      <div className={`player__stage ${aspectClass}`}>
        {clipUrl ? (
          <video
            ref={videoRef}
            className="player__media"
            src={clipUrl}
            muted
            playsInline
          />
        ) : stillUrl ? (
          <img
            className="player__media"
            src={stillUrl}
            alt={currentShot?.stillPrompt ?? currentBeat?.shotId}
          />
        ) : (
          <div className="player__media player__media--empty">No visual</div>
        )}
        <div className={`player__chrome ${playing ? "player__chrome--quiet" : ""}`}>
          {filmPlan && (
            <div className="player__titles">
              <p className="player__film-title">{filmPlan.title}</p>
              <p className="player__logline">{filmPlan.logline}</p>
            </div>
          )}
          <p className="player__caption">{currentShot?.voiceover || "\u00A0"}</p>
          <div className="player__controls">
            <button type="button" onClick={() => void togglePlay()}>
              {playing ? "Pause" : "Play"}
            </button>
            <span className="player__chip">{currentBeat?.shotId}</span>
            <span className="player__time">
              {formatTime(elapsed)} / {formatTime(total)}
            </span>
          </div>
          <div className="player__rail" role="list">
            {assembly.beats.map((beat, index) => {
              const width = total > 0 ? (beat.durationSeconds / total) * 100 : 0;
              const active = index === currentBeatIndex;
              return (
                <button
                  key={beat.shotId}
                  type="button"
                  role="listitem"
                  className={`player__beat ${active ? "player__beat--active" : ""}`}
                  style={{ width: `${width}%` }}
                  onClick={() => jumpToBeat(index)}
                  title={beat.shotId}
                />
              );
            })}
          </div>
        </div>
      </div>
      {!audioReady && <p className="player__loading">Loading audio…</p>}
    </section>
  );
}
