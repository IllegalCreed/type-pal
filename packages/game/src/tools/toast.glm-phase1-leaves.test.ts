/**
 * TEST-GLM-PHASE1-LEAVES-3 L19（toast.ts）— 去重表：
 *  - toast.test（挂出/success-error class/duration 淡出移除/未到期负控）→ 不重复
 *  - 新差异：多条堆叠（两条共存、移除一条容器保留）、info 类型图标与 class、
 *    最后一条移除后容器自删（多toast 路径）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast } from './toast.js'

const CONTAINER_ID = 'tp-toast-container'

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('L19 showToast 堆叠合同', () => {
  it('两条共存；到期只移除自己，容器保留', () => {
    showToast('第一条', { durationMs: 1000 })
    showToast('第二条', { durationMs: 3000 })
    const container = document.getElementById(CONTAINER_ID)!
    expect(container.childElementCount).toBe(2)
    vi.advanceTimersByTime(1000 + 220)
    expect(container.childElementCount).toBe(1)
    expect(container.textContent).toContain('第二条')
    expect(document.getElementById(CONTAINER_ID)).not.toBeNull()
  })

  it('最后一条移除后容器自删；info 类型用 · 图标与专属 class', () => {
    showToast('提示', { type: 'info', durationMs: 500 })
    const el = document.querySelector('.tp-toast-info')!
    expect(el.textContent).toBe('· 提示')
    vi.advanceTimersByTime(500 + 220)
    expect(document.getElementById(CONTAINER_ID)).toBeNull()
  })
})
