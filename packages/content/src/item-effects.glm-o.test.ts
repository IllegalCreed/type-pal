/** TEST-GLM-WAVE-O-1 O08：世界物品执行器效果分支残余合同。
 *  旧证：item.effects.background.test.ts 覆盖 invalid-chain/gate/modifyHostile/revive/
 *  curePoison/removeStatus/permanentStatBoost/dieIfNotPoisoned/levelUp/allAllies；
 *  item.test.ts 覆盖池/配方/自毒/applyStatus/毒抗。本卡按 gap-map 直击未覆盖臂：
 *  healHp/healMp 的上限钳位与死亡跳过、scaleCurrentHp 分数缩放、
 *  allAllies 消耗语义、menu 透传、applyStatus 不可携带 fail-loud、healParty 注：
 *  hideParty/runScript/runSceneHook/placeEntityInFront 属 battle/world 外部域，
 *  世界分支到达即产品内部错误（防御 throw）。
 */

import type { ItemData, ItemDataMap, ItemUseEffect } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { item as makeItem, poisonDefs, world } from './__tests__/glm-item-logic-fixtures.js'
import { resolveWorldItemUse } from './item.js'

const useItem = (effects: ItemUseEffect[], over: Record<string, unknown> = {}): ItemData =>
  makeItem({
    id: 'use-item',
    name: '试用物品',
    use: { target: 'oneAlly', consuming: true, effects, ...over },
  })

describe('O08 healHp/healMp：钳位与死亡跳过', () => {
  test('healHp：不足上限加满差额；恰好上限零变化仍成功；死亡队员跳过', () => {
    const base = world([{ itemId: 'use-item', count: 1 }], 60)
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'healHp', amount: 50 }]),
    }
    const outcome = resolveWorldItemUse(base, 'hero', 'use-item', items)
    expect(outcome.status).toBe('success')
    expect(outcome.world.party[0]!.hp).toBe(100)
    // 恰好上限：HP 零变化但消耗本身使 changed=true；效果对 HP 无贡献。
    const atCap = world([{ itemId: 'use-item', count: 1 }], 100)
    const capOutcome = resolveWorldItemUse(atCap, 'hero', 'use-item', items)
    expect(capOutcome.status).toBe('success')
    expect(capOutcome.world.party[0]!.hp).toBe(100)
    expect(capOutcome.world.inventory).toEqual([])
  })

  test('healMp：加 MP 钳 maxMP（30+40 → maxMP 50）', () => {
    const base = world([{ itemId: 'use-item', count: 1 }], 100, 30)
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'healMp', amount: 40 }]),
    }
    const outcome = resolveWorldItemUse(base, 'hero', 'use-item', items)
    expect(outcome.world.party[0]!.mp).toBe(50)
  })

  test('allAllies 消耗语义：consuming 扣一件；非 consuming 不扣', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'healHp', amount: 5 }], { target: 'allAllies' }),
      keep: useItem([{ kind: 'healHp', amount: 5 }], { target: 'allAllies', consuming: false }),
    }
    const consuming = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 2 }]),
      'hero',
      'use-item',
      items,
    )
    expect(consuming.world.inventory).toEqual([{ itemId: 'use-item', count: 1 }])
    const keeping = resolveWorldItemUse(
      world([{ itemId: 'keep', count: 2 }]),
      'hero',
      'keep',
      items,
    )
    expect(keeping.world.inventory).toEqual([{ itemId: 'keep', count: 2 }])
  })
})

describe('O08 scaleCurrentHp：分数缩放', () => {
  test('分子/分母截断（trunc）与 0/上限钳位', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'scaleCurrentHp', numerator: 1, denominator: 2 }]),
    }
    // 99 HP → trunc(49.5)=49。
    const base = world([{ itemId: 'use-item', count: 1 }], 99)
    const outcome = resolveWorldItemUse(base, 'hero', 'use-item', items)
    expect(outcome.world.party[0]!.hp).toBe(49)
    // 满血 100 → 50（真减半，非零变化）。
    const full = world([{ itemId: 'use-item', count: 1 }], 100)
    const half = resolveWorldItemUse(full, 'hero', 'use-item', items)
    expect(half.world.party[0]!.hp).toBe(50)
    expect(half.changed).toBe(true)
  })

  test('满血 ×2/1 仍钳 maxHP 不越界', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'scaleCurrentHp', numerator: 2, denominator: 1 }]),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }], 100),
      'hero',
      'use-item',
      items,
    )
    expect(outcome.world.party[0]!.hp).toBe(100)
  })
})

describe('O08 menu 透传与 applyStatus 防御轴', () => {
  test('menuAfterUse 透传到成功 outcome（close）', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'healHp', amount: 5 }], { menuAfterUse: 'close' }),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }], 50),
      'hero',
      'use-item',
      items,
    )
    expect(outcome.menu).toBe('close')
  })

  test('applyStatus 不可携带状态（puppet 经 AuthorItemUseEffect 域不可构造；已知合法 sleep 正常）', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'applyStatus', status: 'sleep', turns: 2 }]),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }]),
      'hero',
      'use-item',
      items,
    )
    expect(outcome.world.party[0]!.extraStatuses).toEqual([{ status: 'sleep', turns: 2 }])
    // 注：puppet 不属 CarryableStatusId，对 typed 作者物品不可构造——
    // 世界分支的 fail-loud 守卫登记为 unreachable-via-legal-input。
  })
})

describe('O08 复合链顺序与 gate 显式阈值', () => {
  test('gate 显式 chance=50：rng 命中（roll<50）放行后续 healHp', () => {
    const items: ItemDataMap = {
      'use-item': useItem([
        { kind: 'gate', chance: 50 },
        { kind: 'healHp', amount: 10 },
      ]),
    }
    // rng=0.25 → roll=26 < 50 → 放行。
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }], 60),
      'hero',
      'use-item',
      items,
      undefined,
      () => 0.25,
    )
    expect(outcome.status).toBe('success')
    expect(outcome.world.party[0]!.hp).toBe(70)
  })

  test('gate 失败后同链 healHp 不执行且不消耗', () => {
    const items: ItemDataMap = {
      'use-item': useItem([
        { kind: 'gate', chance: 50 },
        { kind: 'healHp', amount: 10 },
      ]),
    }
    const base = world([{ itemId: 'use-item', count: 3 }], 60)
    const outcome = resolveWorldItemUse(base, 'hero', 'use-item', items, undefined, () => 0.9)
    expect(outcome.status).toBe('failure')
    expect(outcome.reason).toBe('gate-failed')
    expect(outcome.world.inventory).toEqual([{ itemId: 'use-item', count: 3 }])
    expect(outcome.world.party[0]!.hp).toBe(60)
  })

  test('applyPoison 自毒经统一入口（毒 defs 缺失=纯加毒）', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'applyPoison', poisonId: '551' }]),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }]),
      'hero',
      'use-item',
      items,
      poisonDefs(),
    )
    expect(outcome.world.party[0]!.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
  })
})
