/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S06：item-alchemy 拒绝与隔离（core/item-alchemy.ts）。
 * 既有 item-alchemy.test 已覆盖效果定位/resize/配方/session 主干——不重复。
 * 本文件：缺 surface 精确拒绝、mutator 改另一 kind 拒绝、mutator 原地改克隆再抛错时
 * session 与已派发历史不变、同值 no-dispatch、扩容 rewards 彼此独立且输入不变、重复 effect 拒绝。
 */
import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditSession } from './edit-session.js'
import {
  findItemAlchemyEffect,
  mutateItemAlchemyEffect,
  resizeResourcePoolEffect,
} from './item-alchemy.js'

/** 合法物品（过正式 validateItems：use.consuming + resource 池完整字段）。 */
const gourdItem = (id: string): ItemData =>
  ({
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'drawFromResourcePool',
          resource: 'collectValue',
          maxRoll: 2,
          rewards: [
            { itemId: 'a', count: 1 },
            { itemId: 'b', count: 2 },
          ],
        },
      ],
    },
  }) as unknown as ItemData

function fakeSession(items: ItemData[]) {
  const state = { items: items.map((item) => structuredClone(item)) }
  const dispatched: unknown[] = []
  return {
    dispatched,
    session: {
      getState: () => state,
      dispatch: (command: unknown) => {
        dispatched.push(command)
        return true
      },
    } as unknown as EditSession,
  }
}

describe('S06 mutateItemAlchemyEffect 拒绝与隔离', () => {
  test('缺 surface / 重复 effect / 改另一 kind 精确拒绝且零派发', () => {
    const noEffect = { ...gourdItem('x'), use: { effects: [] } } as unknown as ItemData
    const host = fakeSession([noEffect])
    expect(() =>
      mutateItemAlchemyEffect(host.session, 'x', 'spirit-gourd', (effect) => effect),
    ).toThrow('物品 x 缺 drawFromResourcePool effect')
    expect(host.dispatched).toEqual([])

    const duplicated: ItemData = {
      ...gourdItem('y'),
      use: {
        effects: [
          { kind: 'drawFromResourcePool', maxRoll: 1, rewards: [{ itemId: 'a', count: 1 }] },
          { kind: 'drawFromResourcePool', maxRoll: 2, rewards: [{ itemId: 'b', count: 1 }] },
        ],
      },
    } as unknown as ItemData
    expect(() => findItemAlchemyEffect(duplicated, 'spirit-gourd')).toThrow(
      '物品 y 重复 2 个 drawFromResourcePool effect',
    )

    const host2 = fakeSession([gourdItem('z')])
    expect(() =>
      mutateItemAlchemyEffect(
        host2.session,
        'z',
        'spirit-gourd',
        () =>
          ({
            kind: 'craftRecipe',
            recipes: [],
          }) as never,
      ),
    ).toThrow('炼化 surface spirit-gourd 不能改写为 craftRecipe')
    expect(host2.dispatched).toEqual([])
  })
  test('mutator 原地改克隆再抛错：session 状态与派发历史不变；同值 no-dispatch', () => {
    const item = gourdItem('g')
    const host = fakeSession([item])
    const before = structuredClone(host.session.getState().items)
    expect(() =>
      mutateItemAlchemyEffect(host.session, 'g', 'spirit-gourd', (effect) => {
        effect.maxRoll = 999 // 原地改的是克隆
        throw new Error('mutator 自身失败')
      }),
    ).toThrow('mutator 自身失败')
    expect(host.dispatched).toEqual([])
    expect(host.session.getState().items).toEqual(before)

    const same = fakeSession([gourdItem('g')])
    const applied = mutateItemAlchemyEffect(
      same.session,
      'g',
      'spirit-gourd',
      (effect) => effect, // 同值
    )
    expect(applied).toBe(false)
    expect(same.dispatched).toEqual([])
  })
  test('resize 扩容：末档复制彼此独立、空表才用 fallbackItemId、输入不变、maxRoll 门精确', () => {
    const effect = {
      kind: 'drawFromResourcePool',
      maxRoll: 1,
      rewards: [{ itemId: 'a', count: 3 }],
    } as Parameters<typeof resizeResourcePoolEffect>[0]
    const snapshot = structuredClone(effect)
    const grown = resizeResourcePoolEffect(effect, 3, 'fallback-item')
    expect(grown.maxRoll).toBe(3)
    // 有既有档位时以末档为模板复制（fallbackItemId 只在空表兜底）
    expect(grown.rewards).toEqual([
      { itemId: 'a', count: 3 },
      { itemId: 'a', count: 3 },
      { itemId: 'a', count: 3 },
    ])
    grown.rewards[1]!.itemId = 'mutated'
    expect(grown.rewards[2]!.itemId).toBe('a') // 复制独立
    expect(structuredClone(effect)).toEqual(snapshot)
    // 注：空 rewards 表的 fallbackItemId 兜底政策已在设计收窄（item-alchemy:76 由合法
    // maxRoll≥1/rewards 等长挡住），本批不为其新增正确绿测。
    expect(() => resizeResourcePoolEffect(effect, 0, 'f')).toThrow('奖励档位必须是 1..999 的整数')
    expect(() => resizeResourcePoolEffect(effect, 1000, 'f')).toThrow(
      '奖励档位必须是 1..999 的整数',
    )
  })
})
