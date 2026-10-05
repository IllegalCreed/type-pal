import { describe, expect, test } from 'vitest'
import { AsyncIntentController } from './async-intent.js'

/**
 * TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 补充合同：既有 async-intent.test.ts 已证明
 * begin/invalidate 的最新启动胜出与跨 await 失效；未证明 capture() 的只读语义。
 * 生产 caller：main.ts:931-932（sceneSwitchIntent.begin() + worldMutationIntent.capture()）
 * 与 main.ts:1168/1902（scriptMutationIntent.capture() 的同世界提交门）。
 */
describe('AsyncIntentController capture (world-lifecycle-1)', () => {
  test('capture() 是只读快照：不换代、不作废在途 token；后续 begin 才使旧 token 失效', () => {
    const controller = new AsyncIntentController()
    const session = controller.begin()
    const first = controller.capture()
    const second = controller.capture()
    // 只读：重复 capture 返回同一 serial，且不推翻已启动会话的 token。
    expect(first).toBe(second)
    expect(controller.isCurrent(session)).toBe(true)
    expect(() => controller.assertCurrent(first, '同世界提交前失效')).not.toThrow()

    // 最新 begin 胜出：session 与所有已 capture 的旧 token 一并失效，错误携带原 message。
    const takeover = controller.begin()
    expect(controller.isCurrent(takeover)).toBe(true)
    expect(controller.isCurrent(session)).toBe(false)
    expect(controller.isCurrent(first)).toBe(false)
    expect(() => controller.assertCurrent(first, '旧启动已失效')).toThrowError(
      expect.objectContaining({ name: 'AbortError', message: '旧启动已失效' }),
    )
  })
})
