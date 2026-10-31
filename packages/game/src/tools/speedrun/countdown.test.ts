/** Caller-owned text, not a clock. MutationObserver detects writes that node identity cannot. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showCountdown } from './countdown.js'

beforeEach(() => showCountdown(null))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  showCountdown(null)
})

const ID = 'tp-speedrun-countdown'

describe('Countdown DOM and host boundaries', () => {
  it('传字符串挂出、更新文本', () => {
    showCountdown('3')
    const el = document.getElementById('tp-speedrun-countdown')
    expect(el?.textContent).toBe('3')
    showCountdown('2')
    expect(document.getElementById('tp-speedrun-countdown')).toBe(el)
    expect(document.querySelectorAll('#tp-speedrun-countdown')).toHaveLength(1)
    expect(el?.textContent).toBe('2')
    expect(el?.style.pointerEvents).toBe('none')
  })
  it('传 null 移除', () => {
    showCountdown('1')
    const first = document.getElementById('tp-speedrun-countdown')
    showCountdown(null)
    expect(document.getElementById('tp-speedrun-countdown')).toBeNull()
    showCountdown(null)
    expect(document.getElementById('tp-speedrun-countdown')).toBeNull()
    showCountdown('1')
    const next = document.getElementById('tp-speedrun-countdown')
    expect(next).not.toBe(first)
    expect(next?.textContent).toBe('1')
  })
  it('相同文字逐帧刷新时不触发 DOM 变更', () => {
    showCountdown('3')
    const first = document.getElementById(ID)!
    const observer = new MutationObserver(() => {})
    observer.observe(first, { childList: true, characterData: true, subtree: true })
    try {
      showCountdown('3')
      expect(observer.takeRecords()).toHaveLength(0)
    } finally {
      observer.disconnect()
    }
  })
  it('无 document 时字符串和 null 调用均不访问 DOM', () => {
    const createElement = vi.spyOn(document, 'createElement')
    vi.stubGlobal('document', undefined)
    showCountdown('3')
    showCountdown(null)
    expect(createElement).not.toHaveBeenCalled()
  })
})
