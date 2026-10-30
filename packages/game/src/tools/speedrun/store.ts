// 速通计时器设置与最佳成绩的 localStorage 持久化(全局,跨存档)。
import { isMobileLayout } from '../../shell/presentation.js'

const K_ENABLED = 'tp-speedrun-enabled'
const K_SHOW = 'tp-speedrun-show'
const K_BANANA = 'tp-speedrun-banana'
const K_BESTS = 'tp-speedrun-bests'

export interface SpeedrunSettings {
  enabled: boolean
  show: boolean
  banana: boolean
}
export type BestTimes = Record<string, number | null>

const ls = (): Storage | undefined =>
  typeof localStorage !== 'undefined' ? localStorage : undefined

export function loadSettings(): SpeedrunSettings {
  const s = ls()
  return {
    enabled: !isMobileLayout() && s?.getItem(K_ENABLED) === '1',
    show: !isMobileLayout() && s?.getItem(K_SHOW) !== '0', // 桌面启用后默认显示
    banana: s?.getItem(K_BANANA) === '1',
  }
}

const SETTING_KEY: Record<keyof SpeedrunSettings, string> = {
  enabled: K_ENABLED,
  show: K_SHOW,
  banana: K_BANANA,
}
export function saveSetting(key: keyof SpeedrunSettings, val: boolean): void {
  ls()?.setItem(SETTING_KEY[key], val ? '1' : '0')
}

/** 读最佳成绩;无记录返回 defaults 副本;有记录则以 defaults 为骨架、覆盖已存在的 key。 */
export function loadBests(defaults: BestTimes): BestTimes {
  const raw = ls()?.getItem(K_BESTS)
  if (!raw) return { ...defaults }
  try {
    const parsed: unknown = JSON.parse(raw)
    const out: BestTimes = { ...defaults }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return out
    const record = parsed as Record<string, unknown>
    for (const [k, value] of Object.entries(record)) {
      if (
        Object.hasOwn(out, k) &&
        (value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0))
      )
        out[k] = value
    }
    return out
  } catch {
    return { ...defaults }
  }
}
export function saveBests(bests: BestTimes): void {
  ls()?.setItem(K_BESTS, JSON.stringify(bests))
}
