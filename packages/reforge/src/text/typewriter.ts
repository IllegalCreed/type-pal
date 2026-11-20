import type { TextSpan } from '@type-pal/content'

/** 每个显示字符默认用 24 毫秒。 */
export const DEFAULT_SPEED_MS = 24

/** 已显示字符数 = ⌊elapsedMs / speedMs⌋。渲染层按 performance.now 算,不挂逻辑 tick。 */
export function charsShown(elapsedMs: number, speedMs: number): number {
  if (speedMs <= 0) return Number.POSITIVE_INFINITY
  return Math.floor(elapsedMs / speedMs)
}

/** 用与 renderSpans 相同的 Unicode 码点数计算对白行的时间预算。 */
export function countChars(spans: readonly TextSpan[]): number {
  let count = 0
  for (const { text } of spans) {
    for (const _character of text) count++
  }
  return count
}
