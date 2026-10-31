import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enterScene } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import { loadBests, loadSettings, saveBests, saveSetting } from './store.js'
import { SpeedrunTimer } from './timer.js'

const BESTS_KEY = 'tp-speedrun-bests'
const OWNED_STORAGE_KEYS = [
  'tp-speedrun-enabled',
  'tp-speedrun-show',
  'tp-speedrun-banana',
  BESTS_KEY,
]
let previousValues = new Map<string, string | null>()
let previousLayout: string | undefined
beforeEach(() => {
  previousValues = new Map()
  for (const key of OWNED_STORAGE_KEYS) previousValues.set(key, localStorage.getItem(key))
  previousLayout = document.documentElement.dataset.tpLayout
  for (const key of OWNED_STORAGE_KEYS) localStorage.removeItem(key)
  document.documentElement.dataset.tpLayout = 'desktop'
})
afterEach(() => {
  try {
    for (const [key, value] of previousValues) {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }
  } finally {
    if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
    else document.documentElement.dataset.tpLayout = previousLayout
  }
})

describe('Settings and personal best persistence', () => {
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
    const loaded = loadBests(defaults)
    expect(loaded).toEqual(defaults)
    expect(loaded).not.toBe(defaults)
  })
  it('bests 往返只覆盖默认骨架中的 key，缺失项保留默认值', () => {
    saveBests({ a: 500, b: null, ghost: 1 })
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
  it('banana 设置可往返，非法设置值按各键规则回退', () => {
    saveSetting('banana', true)
    expect(loadSettings()).toEqual({ enabled: false, show: true, banana: true })
    localStorage.setItem('tp-speedrun-enabled', 'yes')
    localStorage.setItem('tp-speedrun-show', 'yes')
    localStorage.setItem('tp-speedrun-banana', 'yes')
    expect(loadSettings()).toEqual({ enabled: false, show: true, banana: false })
  })
})

describe('Personal best input validation', () => {
  it('bests 非法 JSON 返回 defaults 副本', () => {
    localStorage.setItem(BESTS_KEY, '{not json')
    const defaults = { a: 1000, b: null }
    const out = loadBests(defaults)
    expect(out).toEqual({ a: 1000, b: null })
    expect(out).not.toBe(defaults) // 副本
  })
  it('bests 非法数值逐键回退，保留同批合法值与 null，不污染 defaults', () => {
    const defaults = { a: 1000, b: 2000, c: 3000, d: 4000, e: 5000, f: 6000, g: 7000 }
    localStorage.setItem(BESTS_KEY, '{"a":-1,"b":"bad","c":1e400,"d":false,"e":{},"f":0,"g":null}')
    expect(loadBests(defaults)).toEqual({
      a: 1000,
      b: 2000,
      c: 3000,
      d: 4000,
      e: 5000,
      f: 0,
      g: null,
    })
    expect(defaults).toEqual({ a: 1000, b: 2000, c: 3000, d: 4000, e: 5000, f: 6000, g: 7000 })
  })
  it('bests 必须是记录对象，合法 JSON 标量或数组仍回退默认副本', () => {
    const defaults = { a: 1000 }
    for (const raw of ['null', '42', '"text"', 'true', '[42]']) {
      localStorage.setItem(BESTS_KEY, raw)
      const result = loadBests(defaults)
      expect(result).toEqual(defaults)
      expect(result).not.toBe(defaults)
    }
  })
})
