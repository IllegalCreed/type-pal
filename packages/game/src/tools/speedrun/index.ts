// index.ts —— 速通计时器单例编排:每 rAF tick(主循环调用)+ 工具面板用的各动作。
import type { GameState } from '../../core/game-state.js'
import { showToast } from '../toast.js'
import { BANANA, CHECKPOINTS } from './checkpoints.js'
import { showCountdown } from './countdown.js'
import { hideOverlay, renderOverlay } from './overlay.js'
import { buildSnapshot } from './snapshot.js'
import { type BestTimes, loadBests, loadSettings, saveBests } from './store.js'
import { SpeedrunTimer } from './timer.js'

const DEFAULT_BESTS: BestTimes = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))

let timer: SpeedrunTimer | null = null
function getTimer(): SpeedrunTimer {
  if (!timer) timer = new SpeedrunTimer(CHECKPOINTS, BANANA, loadBests(DEFAULT_BESTS))
  return timer
}

/** 仅测试用:重置单例,使下一次 getTimer() 从(已清空的)localStorage 重新播种。 */
export function __resetSpeedrunForTest(): void {
  timer = null
}

/** 主循环每 rAF 调用:推进时钟、检测打点、刷新覆盖层与倒计时。未启用则隐藏 UI 并跳过。 */
export function tickSpeedrunTimer(gs: GameState, nowMs: number): void {
  if (typeof document === 'undefined') return
  const settings = loadSettings()
  if (!settings.enabled) {
    hideOverlay()
    showCountdown(null)
    return
  }
  const t = getTimer()
  t.tick(buildSnapshot(gs), nowMs, { bananaEnabled: settings.banana })
  if (t.consumeBestsDirty()) saveBests(t.getBests())
  if (t.consumeJustResumed()) showToast('开始!', { type: 'success', durationMs: 800 })

  if (settings.show) renderOverlay(t.getRun(), CHECKPOINTS, t.getBests())
  else hideOverlay()

  const sec = t.getCountdownRemainingSec()
  showCountdown(sec != null && sec > 0 ? String(sec) : null)
}

export function resetSpeedrun(): void {
  getTimer().reset()
}
export function getSpeedrunRun() {
  return getTimer().getRun()
}
export function getSpeedrunBests() {
  return getTimer().getBests()
}
export function setSpeedrunBestFromCurrent(): void {
  const t = getTimer()
  t.setBestsFromCurrentRun()
  saveBests(t.getBests())
}
export function clearSpeedrunBests(): void {
  const t = getTimer()
  t.clearBests()
  saveBests(t.getBests())
}
export function setSpeedrunBest(id: string, ms: number | null): void {
  const t = getTimer()
  t.setBest(id, ms)
  saveBests(t.getBests())
}
