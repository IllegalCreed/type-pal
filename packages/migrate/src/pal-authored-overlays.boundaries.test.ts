/**
 * TEST-MIGRATION-BOUNDARIES-1 T07：pal-authored-overlays 多 effect 归属轴。
 * 既有 pal-authored-overlays.test 已覆盖单 effect message 同步/幂等/fail-loud——不重复。
 * 本文件：同 item 多 craft effect 中一条有 message 一条无 message 的归属一致性、
 * craft+pool 混合时各自独立同步、非 message 作者字段全保留、多 item 修改不串引用、
 * current/generated 实参深快照不变。
 */
import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyPalGeneratedCraftMessages,
  applyPalGeneratedResourcePoolMessages,
} from './pal-authored-overlays.js'

const recipe = (ingredient: string, product: string) => ({
  ingredients: [{ itemId: ingredient, count: 1 }],
  products: [{ itemId: product, count: 1 }],
})

const item = (
  id: string,
  effects: ItemData['use'] extends undefined ? never : NonNullable<ItemData['use']>['effects'],
): ItemData =>
  ({
    id,
    name: `作者·${id}`,
    desc: ['作者说明'],
    buyPrice: 10,
    sellPrice: 5,
    sellable: true,
    use: { target: 'scene', consuming: false, effects },
  }) as unknown as ItemData

describe('T07 多 effect 归属', () => {
  test('同 item 两条 craft：仅带 message 的那条同步，无 message 那条保持原样；作者字段全保留', () => {
    const current = [
      item('700', [
        { kind: 'craftRecipe', recipes: [recipe('117', '148')] },
        { kind: 'craftRecipe', recipes: [recipe('118', '149')] },
      ]),
    ]
    const generated = [structuredClone(current[0]!)]
    const effects = generated[0]!.use!.effects as Array<Record<string, unknown>>
    effects[1]!.name = 'producer 标题不得进 current'
    ;(effects[1] as { unavailableMessage?: string }).unavailableMessage = '第二条的失败原文'
    const currentSnapshot = structuredClone(current)
    const generatedSnapshot = structuredClone(generated)

    const once = applyPalGeneratedCraftMessages(current, generated)
    const outEffects = once[0]!.use!.effects as Array<Record<string, unknown>>
    expect(outEffects[0]).not.toHaveProperty('unavailableMessage') // 无 message 那条不动
    expect(outEffects[1]).toMatchObject({ unavailableMessage: '第二条的失败原文' })
    expect(once[0]!.name).toBe('作者·700') // 非 message 作者字段保留
    expect(once[0]!.desc).toEqual(['作者说明'])
    expect(applyPalGeneratedCraftMessages(once, generated)).toEqual(once) // 幂等
    expect(structuredClone(current)).toEqual(currentSnapshot)
    expect(structuredClone(generated)).toEqual(generatedSnapshot)
  })
  test('craft+pool 混合：各自函数只同步各自 kind 的 message，互不触碰；多 item 不串引用', () => {
    const current = [
      item('701', [
        { kind: 'craftRecipe', recipes: [recipe('117', '148')] },
        {
          kind: 'drawFromResourcePool',
          resource: 'collectValue',
          maxRoll: 1,
          rewards: [{ itemId: '100', count: 1 }],
        },
      ]),
      item('702', [
        {
          kind: 'drawFromResourcePool',
          resource: 'collectValue',
          maxRoll: 2,
          rewards: [
            { itemId: '100', count: 1 },
            { itemId: '105', count: 2 },
          ],
        },
      ]),
    ]
    const generated = structuredClone(current)
    const g0 = generated[0]!.use!.effects as Array<Record<string, unknown>>
    ;(g0[0] as { unavailableMessage?: string }).unavailableMessage = 'craft 失败原文'
    ;(g0[1] as { unavailableMessage?: string }).unavailableMessage = 'pool 失败原文'
    const g1 = generated[1]!.use!.effects as Array<Record<string, unknown>>
    ;(g1[0] as { unavailableMessage?: string }).unavailableMessage = '702 的 pool 原文'

    /** 拒绝见证取值形式：返回结果数组或错误消息（mutation 负控下 produces 纯 AssertionError）。 */
    function outcomeOf(run: () => ItemData[]): ItemData[] | string {
      try {
        return run()
      } catch (error) {
        return (error as Error).message
      }
    }
    // craft 同步：只进 701 的 craft 条（失败以消息值断言）
    const viaCraft = outcomeOf(() => applyPalGeneratedCraftMessages(current, generated))
    expect(Array.isArray(viaCraft)).toBe(true) // 合法输入不得拒绝
    if (Array.isArray(viaCraft)) {
      const c0 = viaCraft[0]!.use!.effects as Array<Record<string, unknown>>
      expect(c0[0]).toMatchObject({ unavailableMessage: 'craft 失败原文' })
      expect(c0[1]).not.toHaveProperty('unavailableMessage') // pool 条不受 craft 函数影响
      expect((viaCraft[1]!.use!.effects as Array<Record<string, unknown>>)[0]).not.toHaveProperty(
        'unavailableMessage',
      )
    }
    // pool 同步：只进 pool 条
    const viaPool = applyPalGeneratedResourcePoolMessages(current, generated)
    const p0 = viaPool[0]!.use!.effects as Array<Record<string, unknown>>
    expect(p0[0]).not.toHaveProperty('unavailableMessage') // craft 条不受 pool 函数影响
    expect(p0[1]).toMatchObject({ unavailableMessage: 'pool 失败原文' })
    expect(
      (viaPool[1]!.use!.effects as Array<Record<string, unknown>>)[0]!.unavailableMessage,
    ).toBe('702 的 pool 原文')
    // 多 item 输出互不串引用
    viaPool[0]!.name = '改了 701'
    expect(viaPool[1]!.name).toBe('作者·702')
    expect(current[0]!.name).toBe('作者·701') // 实参不变
  })
})
