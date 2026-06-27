import type { TextSpan } from '@type-pal/content'

/** 默认打字速度 24ms/字(GLM spec §3:iDelayTime=3 × 8)。 */

export const DEFAULT_SPEED_MS = 24

/** 已显示字符数 = ⌊elapsedMs / speedMs⌋。渲染层按 performance.now 算,不挂逻辑 tick。 */
export function charsShown(elapsedMs: number, speedMs: number): number {
  return Math.floor(elapsedMs / speedMs)
}

/**
 * 当前行是否「完成」(可推进 / 可画光标):
 * - 全字打完(typeDoneMs)前 = 未完成;
 * - 无 autoAdvance → 全字后即完成;
 * - 有 autoAdvance → 全字后再等 autoAdvanceMs 才完成(尾停顿自动推进)。
 */
export function isLineDone(
  elapsedMs: number,
  speedMs: number,
  totalChars: number,
  autoAdvanceMs?: number,
): boolean {
  const typeDoneMs = totalChars * speedMs
  if (elapsedMs < typeDoneMs) return false
  if (autoAdvanceMs == null) return true
  return elapsedMs >= typeDoneMs + autoAdvanceMs
}

/** spans 总字符数(Σ span.text 长度)。打字进度 / 行完成判定用。 */
export function countChars(spans: readonly TextSpan[]): number {
  let n = 0
  for (const span of spans) n += span.text.length
  return n
}
