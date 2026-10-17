import { afterEach, describe, expect, it } from 'vitest'
import { showCountdown } from './countdown.js'

afterEach(() => showCountdown(null))

describe('showCountdown', () => {
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
})
