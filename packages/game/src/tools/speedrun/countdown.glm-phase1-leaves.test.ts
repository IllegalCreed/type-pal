/**
 * TEST-GLM-PHASE1-LEAVES-3 L20（countdown.ts）— 去重表：
 *  - countdown.test（挂出/更新文本/null 移除）→ 不重复
 *  - 新差异：单例元素复用（连显不重复建、更新同一节点）、移除后再显重建、
 *    相同文本不重写 textContent（无副作用可观察 → 只锁节点数与文本）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { showCountdown } from './countdown.js'

const ID = 'tp-speedrun-countdown'

afterEach(() => {
  document.getElementById(ID)?.remove()
})

describe('L20 showCountdown 单例合同', () => {
  it('连显 3→2：同一元素更新，不产生第二个节点', () => {
    showCountdown('3')
    const first = document.getElementById(ID)!
    showCountdown('2')
    const second = document.getElementById(ID)
    expect(second).toBe(first) // 同一节点
    expect(document.querySelectorAll(`#${ID}`)).toHaveLength(1)
    expect(first.textContent).toBe('2')
    expect(first.style.pointerEvents).toBe('none') // 不挡操作
  })

  it('null 移除后可重建；再 null 幂等', () => {
    showCountdown('3')
    showCountdown(null)
    expect(document.getElementById(ID)).toBeNull()
    showCountdown(null) // 幂等
    expect(document.getElementById(ID)).toBeNull()
    showCountdown('1')
    expect(document.getElementById(ID)?.textContent).toBe('1')
  })
})
