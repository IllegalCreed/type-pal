import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast } from './toast.js'

const CONTAINER_ID = 'tp-toast-container'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  try {
    vi.runAllTimers()
  } finally {
    document.getElementById(CONTAINER_ID)?.remove()
    vi.useRealTimers()
  }
})

describe('toast', () => {
  it('默认成功消息保留图标、文本和不拦输入的节点', () => {
    showToast('已存到存档位 1')
    const toast = document.querySelector<HTMLElement>('.tp-toast-success')
    expect(toast?.textContent).toBe('✓ 已存到存档位 1')
    expect(toast?.style.pointerEvents).toBe('none')
    expect(document.getElementById(CONTAINER_ID)?.style.pointerEvents).toBe('none')
  })

  it('错误和提示分别使用对应图标与类型 class', () => {
    showToast('bad', { type: 'error' })
    showToast('提示', { type: 'info' })
    expect(document.querySelector('.tp-toast-error')?.textContent).toBe('✗ bad')
    expect(document.querySelector('.tp-toast-info')?.textContent).toBe('· 提示')
  })

  it('默认停留到 2000ms 才淡出，220ms 过渡结束才移除最后一条及容器', () => {
    showToast('x')
    const toast = document.querySelector<HTMLElement>('.tp-toast')
    vi.advanceTimersByTime(1999)
    expect(toast?.isConnected).toBe(true)
    expect(toast?.style.opacity).toBe('1')
    vi.advanceTimersByTime(1)
    expect(toast?.style.opacity).toBe('0')
    expect(toast?.style.transform).toBe('translateY(-8px)')
    expect(toast?.isConnected).toBe(true)
    vi.advanceTimersByTime(219)
    expect(toast?.isConnected).toBe(true)
    vi.advanceTimersByTime(1)
    expect(toast?.isConnected).toBe(false)
    expect(document.getElementById(CONTAINER_ID)).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('两条共享容器，到期只移除自己，最后一条结束后释放容器', () => {
    showToast('第一条', { durationMs: 1000 })
    showToast('第二条', { durationMs: 3000 })
    const container = document.getElementById(CONTAINER_ID)
    const first = container?.children[0]
    const second = container?.children[1]
    expect(container?.childElementCount).toBe(2)
    vi.advanceTimersByTime(999)
    expect(first?.isConnected).toBe(true)
    vi.advanceTimersByTime(221)
    expect(first?.isConnected).toBe(false)
    expect(second?.isConnected).toBe(true)
    expect(container?.textContent).toBe('✓ 第二条')
    expect(document.getElementById(CONTAINER_ID)).toBe(container)
    vi.advanceTimersByTime(2000)
    expect(second?.isConnected).toBe(false)
    expect(document.getElementById(CONTAINER_ID)).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
})
