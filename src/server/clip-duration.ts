/** Veo-style supported Clip lengths (seconds); pick shortest >= soft floor. */
export function shortestClipDurationSeconds(softDurationSeconds: number): number {
  const supported = [4, 6, 8] as const;
  const need = Math.max(1, softDurationSeconds);
  return supported.find((d) => d >= need) ?? supported[supported.length - 1]!;
}
