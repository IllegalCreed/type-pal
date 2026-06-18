import { beforeEach, describe, expect, it } from 'vitest'
import { loadBests, loadSettings, saveBests, saveSetting } from './store.js'

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
})
