import { afterEach, describe, expect, it } from 'vitest'
import { showCountdown } from './countdown.js'

afterEach(() => showCountdown(null))

describe('showCountdown', () => {
  it('传字符串挂出、更新文本', () => {
    showCountdown('3')
    const el = document.getElementById('tp-speedrun-countdown')
    expect(el?.textContent).toBe('3')
    showCountdown('2')
    expect(document.getElementById('tp-speedrun-countdown')?.textContent).toBe('2')
  })
  it('传 null 移除', () => {
    showCountdown('1')
    showCountdown(null)
    expect(document.getElementById('tp-speedrun-countdown')).toBeNull()
  })
})
