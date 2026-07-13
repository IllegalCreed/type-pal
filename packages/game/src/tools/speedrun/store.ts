// 速通计时器设置与最佳成绩的 localStorage 持久化(全局,跨存档)。
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
    enabled: s?.getItem(K_ENABLED) === '1',
    show: s?.getItem(K_SHOW) !== '0', // 默认显示
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
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: BestTimes = { ...defaults }
    for (const k of Object.keys(out)) if (k in parsed) out[k] = parsed[k] as number | null
    return out
  } catch {
    return { ...defaults }
  }
}
export function saveBests(bests: BestTimes): void {
  ls()?.setItem(K_BESTS, JSON.stringify(bests))
}
