/**
 * TEST-GLM-PHASE1-LEAVES-3 L21（store.ts）— 去重表：
 *  - store.test（默认值/setting 往返/bests defaults 副本/缺失 key 补 default）→ 不重复
 *  - 新差异：非法 JSON/非法逐键值/非记录 JSON 的回退，以及 banana 设置和非法设置值。
 *    未知 key 与 bests 往返归主测，不重复执行相同合同。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadBests, loadSettings, saveSetting } from './store.js'

const KEY = 'tp-speedrun-bests'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => localStorage.clear())

describe('L21 store 坏数据与往返', () => {
  it('bests 非法 JSON 返回 defaults 副本', () => {
    localStorage.setItem(KEY, '{not json')
    const defaults = { a: 1000, b: null }
    const out = loadBests(defaults)
    expect(out).toEqual({ a: 1000, b: null })
    expect(out).not.toBe(defaults) // 副本
  })

  it('banana 设置可往返，非法设置值按各键规则回退', () => {
    saveSetting('banana', true)
    expect(loadSettings()).toEqual({ enabled: false, show: true, banana: true })
    localStorage.setItem('tp-speedrun-enabled', 'yes')
    localStorage.setItem('tp-speedrun-show', 'yes')
    localStorage.setItem('tp-speedrun-banana', 'yes')
    expect(loadSettings()).toEqual({ enabled: false, show: true, banana: false })
  })

  it('bests 非法数值逐键回退，保留同批合法值与 null，不污染 defaults', () => {
    const defaults = { a: 1000, b: 2000, c: 3000, d: 4000, e: 5000, f: 6000, g: 7000 }
    localStorage.setItem(KEY, '{"a":-1,"b":"bad","c":1e400,"d":false,"e":{},"f":0,"g":null}')
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
      localStorage.setItem(KEY, raw)
      const result = loadBests(defaults)
      expect(result).toEqual(defaults)
      expect(result).not.toBe(defaults)
    }
  })
})
