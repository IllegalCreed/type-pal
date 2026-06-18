// index.ts —— 速通计时器单例编排:每 rAF tick(主循环调用)+ 工具面板用的各动作。
import type { GameState } from '../../core/game-state.js'
import { showToast } from '../toast.js'
import { BANANA, CHECKPOINTS } from './checkpoints.js'
import { showCountdown } from './countdown.js'
import { hideOverlay, renderOverlay } from './overlay.js'
import { buildSnapshot } from './snapshot.js'
import { type BestTimes, loadBests, loadSettings, saveBests, saveSetting } from './store.js'
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

/** 手动暂停/恢复切换(F8):停表 / 起 3 秒倒计时恢复。进入暂停时弹提示(恢复由倒计时 UI 体现)。 */
export function toggleSpeedrunPause(): void {
  const t = getTimer()
  t.toggleManualPause(performance.now())
  const run = t.getRun()
  if (run.manualPaused && run.countdownEndMs == null) showToast('计时器已暂停', { type: 'success' })
}

/**
 * 绑定速通计时器快捷键(仅计时器启用时生效,否则按键无副作用):
 *   F8 = 暂停/恢复;F4 = 重置本局;F2 = 切换覆盖层显隐。
 * 全部用浏览器无默认动作的 F 键(避开 F3 查找 / F5 刷新 / F6 地址栏 / F7 光标浏览 / F10 菜单)。返回解绑函数。
 */
export function setupSpeedrunHotkeys(): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: KeyboardEvent): void => {
    if (!loadSettings().enabled) return
    if (e.code === 'F8') {
      e.preventDefault()
      toggleSpeedrunPause()
    } else if (e.code === 'F4') {
      e.preventDefault()
      resetSpeedrun()
      showToast('计时器已重置', { type: 'success' })
    } else if (e.code === 'F2') {
      e.preventDefault()
      const next = !loadSettings().show
      saveSetting('show', next)
      showToast(next ? '计时器覆盖层:显示' : '计时器覆盖层:隐藏', { type: 'success' })
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
