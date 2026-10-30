/**
 * countdown.test.ts 负责创建、更新时节点身份、移除/重建和 pointer-events。
 * 本文件只核每帧相同文字不触发 DOM 变更，以及无 document 时的宿主边界。
 * MutationObserver 可观察同文字的重复写入，节点数/文字相同不能替代此 oracle。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { showCountdown } from './countdown.js'

const ID = 'tp-speedrun-countdown'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.getElementById(ID)?.remove()
})

describe('L20 showCountdown 宿主边界', () => {
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
