import { describe, expect, test, vi } from 'vitest'
import { runWithPresentationFinalizer, ScreenHoldTransaction } from './screen-hold-transaction.js'

describe('ScreenHoldTransaction', () => {
  test('正常 hold/reveal 精确配对，重复 reveal fail-loud', () => {
    const transaction = new ScreenHoldTransaction()
    transaction.begin('night')
    expect(transaction.active?.token).toBe('night')
    transaction.takeForReveal('night')
    expect(transaction.active).toBeNull()
    expect(() => transaction.takeForReveal('night')).toThrow(/token 不匹配/)
  })

  test('跨 token reveal fail-loud 且不丢当前事务', () => {
    const transaction = new ScreenHoldTransaction()
    transaction.begin('night')
    expect(() => transaction.takeForReveal('morning')).toThrow(/token 不匹配/)
    expect(transaction.active?.token).toBe('night')
  })

  test('二次 begin 接管后，旧 owner cleanup 不能清掉新事务', () => {
    const transaction = new ScreenHoldTransaction()
    const first = transaction.begin('first')
    const second = transaction.begin('second')
    transaction.cancelOwned(first)
    expect(transaction.active?.owner).toBe(second.owner)
    expect(transaction.active?.token).toBe('second')
  })

  test.each(['脚本 abort', '读档', 'loadScene'])('%s 使用同一 cancel finalizer', () => {
    const transaction = new ScreenHoldTransaction()
    transaction.begin('held')
    transaction.cancel()
    expect(transaction.active).toBeNull()
  })

  test('renderer error 先执行 finalizer，再保留原错误', () => {
    const transaction = new ScreenHoldTransaction()
    transaction.begin('held')
    const finalize = vi.fn(() => transaction.cancel())
    const error = new Error('renderer failed')
    expect(() =>
      runWithPresentationFinalizer(() => {
        throw error
      }, finalize),
    ).toThrow(error)
    expect(finalize).toHaveBeenCalledOnce()
    expect(transaction.active).toBeNull()
  })
})
