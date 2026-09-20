/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 F3-F4：黑屏保持事务（screen-hold-transaction.ts）。
 * screen-hold-transaction.test.ts:5-37 已覆盖 hold/reveal 配对、重复 reveal fail-loud、
 * renderer error 先 finalizer——不重复；本文件补同 token 文字的新 owner、旧 owner 取消边界、
 * 空 token 拒绝与 finalizer 正常路径零调用。
 */
import { describe, expect, test, vi } from 'vitest'
import { runWithPresentationFinalizer, ScreenHoldTransaction } from './screen-hold-transaction.js'

describe('F3 同 token 文字的新 owner', () => {
  test('旧 owner 取消不影响新事务；当前 owner 能清；空 token 拒绝保留活动态', () => {
    const hold = new ScreenHoldTransaction()
    const first = hold.begin('tok-A')
    const second = hold.begin('tok-A') // 同 token 文字的新事务（新 owner 对象）
    expect(second.owner).not.toBe(first.owner)
    hold.cancelOwned(first) // 旧 owner 取消：不影响新事务
    expect(hold.active?.owner).toBe(second.owner)
    hold.cancelOwned(second) // 当前 owner 取消：清空
    expect(hold.active).toBeNull()
    expect(() => hold.begin('')).toThrow('黑屏保持 token 不能为空')
    expect(hold.active).toBeNull() // 拒绝不产生活动态
    // takeForReveal 精确消费 + 失配拒绝（跨 token）
    const active = hold.begin('tok-B')
    expect(() => hold.takeForReveal('tok-A')).toThrow('token 不匹配: tok-A')
    const revealed = hold.takeForReveal('tok-B')
    expect(revealed.owner).toBe(active.owner)
    expect(hold.active).toBeNull()
  })
})

describe('F4 presentation finalizer', () => {
  test('正常返回原值且 finalizer 零调用；失败先收口再抛原错误（身份保持）', () => {
    const finalize = vi.fn()
    expect(runWithPresentationFinalizer(() => 42, finalize)).toBe(42)
    expect(finalize).not.toHaveBeenCalled()
    const boom = new Error('render failed')
    let finalizedBeforeThrow = false
    let thrown: unknown
    try {
      runWithPresentationFinalizer(
        () => {
          throw boom
        },
        () => {
          finalizedBeforeThrow = true
        },
      )
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBe(boom) // 原错误身份保持
    expect(finalizedBeforeThrow).toBe(true) // 收口先于错误交回上层
  })
})
