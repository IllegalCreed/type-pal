import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast } from './toast.js'

describe('toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
  })
  afterEach(() => vi.useRealTimers())

  it('挂出含消息的 toast', () => {
    showToast('已存到存档位 1')
    const el = document.querySelector('.tp-toast')
    expect(el).not.toBeNull()
    expect(el!.textContent).toContain('已存到存档位 1')
  })

  it('success / error 不同类型 class', () => {
    showToast('ok', { type: 'success' })
    showToast('bad', { type: 'error' })
    expect(document.querySelector('.tp-toast-success')).not.toBeNull()
    expect(document.querySelector('.tp-toast-error')).not.toBeNull()
  })

  it('duration 后淡出并移除(容器也清掉)', () => {
    showToast('x', { durationMs: 1000 })
    expect(document.querySelectorAll('.tp-toast').length).toBe(1)
    vi.advanceTimersByTime(1000 + 220)
    expect(document.querySelectorAll('.tp-toast').length).toBe(0)
    expect(document.getElementById('tp-toast-container')).toBeNull()
  })
})
