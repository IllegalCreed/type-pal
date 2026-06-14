import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPrecacheWidget } from './precache-ui.js'

afterEach(() => {
  vi.useRealTimers()
  document.getElementById('precache-widget')?.remove()
})

describe('createPrecacheWidget', () => {
  it('挂到 document.body,update 写百分比与 MB,done 后淡出移除', () => {
    vi.useFakeTimers()
    const w = createPrecacheWidget()
    const el = document.getElementById('precache-widget')
    expect(el).not.toBeNull()
    w.update({ done: 50, total: 100, bytes: 5 * 1024 * 1024, totalBytes: 10 * 1024 * 1024 })
    expect(el!.textContent).toContain('50%')
    expect(el!.textContent).toContain('5/10MB')
    w.done()
    // done() 触发 0.6s 淡出后从 DOM 移除(用 fake timers 推进动画时长再断言)
    vi.advanceTimersByTime(600)
    expect(document.getElementById('precache-widget')).toBeNull()
  })
})
