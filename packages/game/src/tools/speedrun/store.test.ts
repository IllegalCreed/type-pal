import { beforeEach, describe, expect, it } from 'vitest'
import { enterScene } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import { loadBests, loadSettings, saveBests, saveSetting } from './store.js'
import { SpeedrunTimer } from './timer.js'

describe('speedrun store', () => {
  beforeEach(() => localStorage.clear())

  it('settings 默认:enabled=false, show=true, banana=false', () => {
    expect(loadSettings()).toEqual({ enabled: false, show: true, banana: false })
  })
  it('saveSetting 往返', () => {
    saveSetting('enabled', true)
    saveSetting('show', false)
    expect(loadSettings()).toEqual({ enabled: true, show: false, banana: false })
  })
  it('bests 无记录时返回 defaults 副本', () => {
    const defaults = { a: 1000, b: 2000 }
    expect(loadBests(defaults)).toEqual(defaults)
  })
  it('bests 往返,缺失 key 用 default 补', () => {
    saveBests({ a: 500, b: null })
    expect(loadBests({ a: 1000, b: 2000, c: 3000 })).toEqual({ a: 500, b: null, c: 3000 })
  })

  it('保留真实计时器产生的小数毫秒 PB，刷新后不恢复成默认成绩', () => {
    const defaults = { finish: 5000 }
    const timer = new SpeedrunTimer(
      [{ id: 'finish', name: '终点', defaultBestMs: 5000, detector: enterScene(2) }],
      { scene: 177, cells: [], tolX: 0, tolY: 0, itemId: 291 },
      { ...defaults },
    )
    const initial: ProgressSnapshot = {
      scene: 1,
      canMove: true,
      partyX: 160,
      partyY: 112,
      music: 0,
      inventory: new Set(),
      battle: null,
    }
    timer.tick(initial, 100.25, { bananaEnabled: false })
    timer.tick({ ...initial, scene: 2 }, 1100.75, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('finished')
    expect(timer.getBests()).toEqual({ finish: 1000.5 })
    saveBests(timer.getBests())
    expect(loadBests(defaults)).toEqual({ finish: 1000.5 })
    expect(defaults).toEqual({ finish: 5000 })
  })
})
