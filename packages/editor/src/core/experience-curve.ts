/** Build the indexed upgrade thresholds from an initial threshold and a growing increment. */
export function generateExperienceCurve(
  first: number,
  increment: number,
  levels: number,
): number[] {
  const thresholds = [0]
  for (let index = 1; index < levels; index++) {
    const step = Math.max(0, first + increment * (index - 1))
    thresholds.push(thresholds[index - 1]! + step)
  }
  return thresholds
}

/** Preserve the authored prefix and extend it using the last nonnegative step. */
export function resizeExperienceCurve(thresholds: readonly number[], levels: number): number[] {
  const next = thresholds.slice(0, Math.max(1, levels))
  while (next.length < levels) {
    const previous = next.at(-1) ?? 0
    const step =
      next.length >= 2 ? Math.max(0, next.at(-1)! - next.at(-2)!) : Math.max(1, next[0] ?? 1)
    next.push(previous + step)
  }
  return next
}

export function isExperienceCurveNonDecreasing(thresholds: readonly number[]): boolean {
  for (let index = 1; index < thresholds.length; index++) {
    if (thresholds[index]! < thresholds[index - 1]!) return false
  }
  return true
}
