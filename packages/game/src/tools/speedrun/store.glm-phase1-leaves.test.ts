/**
 * TEST-GLM-PHASE1-LEAVES-3 L21（store.ts）— 去重表：
 *  - store.test（默认值/setting 往返/bests defaults 副本/缺失 key 补 default）→ 不重复
 *  - 新差异：坏数据降级（bests 非法 JSON → defaults 副本）、存储里 defaults 外的 key 忽略、
 *    saveBests→loadBests 全往返。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { loadBests, loadSettings, saveBests, saveSetting } from './store.js'

const KEY = 'tp-speedrun-bests'

beforeEach(() => {
  localStorage.clear()
})

describe('L21 store 坏数据与往返', () => {
  it('bests 非法 JSON → 返回 defaults 副本不抛；defaults 外的存储 key 忽略', () => {
    localStorage.setItem(KEY, '{not json')
    const defaults = { a: 1000, b: null }
    const out = loadBests(defaults)
    expect(out).toEqual({ a: 1000, b: null })
    expect(out).not.toBe(defaults) // 副本
    localStorage.setItem(KEY, JSON.stringify({ a: 500, ghost: 1 }))
    expect(loadBests({ a: 1000, b: null })).toEqual({ a: 500, b: null }) // ghost 不并入
  })

  it('saveBests → loadBests 全往返；settings 仅识别 1/0（坏值走各自默认）', () => {
    saveBests({ a: 42, b: null })
    expect(loadBests({ a: 0, b: 0 })).toEqual({ a: 42, b: null })
    saveSetting('enabled', true)
    saveSetting('show', false)
    saveSetting('banana', true)
    expect(loadSettings()).toEqual({ enabled: true, show: false, banana: true })
    localStorage.setItem('tp-speedrun-enabled', 'yes')
    expect(loadSettings().enabled).toBe(false) // 仅 '1' 为真
    localStorage.setItem('tp-speedrun-show', 'yes')
    expect(loadSettings().show).toBe(true) // 仅 '0' 为假（默认显示）
  })
})
