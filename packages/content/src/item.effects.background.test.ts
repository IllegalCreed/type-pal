/**
 * TEST-GLM-ITEM-LOGIC-1 I5：resolveWorldItemUse 效果结算残差
 * （item.effects.background.test.ts）。
 * 去重：item.test.ts 已证 craftRecipe 成功/材料不足、drawFromResourcePool 掷档/封顶/空池、
 * modifyHostileAwareness·scaleCurrentHp·levelUp happy、allAllies 结算、chance 显式 50、
 * applyPoison 自毒/解毒、applyStatus 追加/取长、extraPoisonRes——本文件只补冻结池内：
 * invalid-effect-chain 两种形态、modifyHostileAwareness 免目标与零变化原引用、gate 缺省
 * chance=100 仍有 1% 失败、资源池档位越界的第二处空池、revive 复活清态与活人零变化、
 * curePoison 显式 id/缺 defs 保留/未知毒保留/无毒回退、removeStatus 过滤与无毒回退、
 * permanentStatBoost 三种钳位与零变化、dieIfNotPoisoned 中毒不杀不停表、oneAlly 跳过
 * 非目标、allAllies 死亡跳过与 stop 表复合、levelUp 零经验仍可 changed。纯函数：
 * 失败/零变化返回原 world 引用（toBe），有变化返回 clone；原入参逐次快照比较。
 */
import { describe, expect, test } from 'vitest'
import {
  expectInputsUnchanged,
  hero,
  item as makeItem,
  poisonDefs,
  rawItem,
  world,
} from './__tests__/glm-item-logic-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
import type { CharacterInstance, WorldState } from './character.js'
import type { ItemDataMap, ItemUseEffect, WorldItemUseOutcome } from './item.js'
import { resolveWorldItemUse } from './item.js'

const useItem = (
  effects: ItemUseEffect[],
  over: {
    target?: 'oneAlly' | 'allAllies' | 'scene'
    consuming?: boolean
    menuAfterUse?: 'keep' | 'close'
  } = {},
) =>
  makeItem({
    id: 'use-item',
    name: '试用物品',
    use: { target: 'oneAlly', consuming: true, effects, ...over },
  })

const poisoned = (id: string, hp = 50): CharacterInstance => ({
  ...hero(hp, 40, id),
  poisons: [{ poisonId: 551, tickIndex: 0 }],
})

describe('I5 效果链与门', () => {
  test('混链与双外部效果都拒绝 invalid-effect-chain 且返回原 world 引用', () => {
    const w = world([{ itemId: 'use-item', count: 1 }])
    const mixed = {
      ...w,
      inventory: [{ itemId: 'use-item', count: 1 }],
    } satisfies WorldState
    // ⚠ 刻意非法载体：validateItems 会拒绝外部与角色效果混链；此处测 resolve 自身的
    // invalid-effect-chain 防御合同，不作为合法物品正控。
    const mixedItems: ItemDataMap = {
      'use-item': rawItem({
        id: 'use-item',
        name: '混链物品',
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [
            { kind: 'runScript', script: { chunk: 'shared', id: 'user/outer' } },
            { kind: 'healHp', amount: 10 },
          ],
        },
      }),
    }
    let outcome: WorldItemUseOutcome | undefined
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', mixedItems)
    }, mixed)
    expect(outcome?.status).toBe('failure')
    expect(outcome?.reason).toBe('invalid-effect-chain')
    expect(outcome?.world).toBe(mixed)
    const twinExternal = {
      ...mixed,
      inventory: [{ itemId: 'use-item', count: 1 }],
    } satisfies WorldState
    const twinItems: ItemDataMap = {
      'use-item': rawItem({
        id: 'use-item',
        name: '双外部物品',
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [
            { kind: 'runSceneHook', hook: 'onTeleport' },
            { kind: 'runSceneHook', hook: 'onTeleport' },
          ],
        },
      }),
    }
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', twinItems)
    }, twinExternal)
    expect(outcome?.reason).toBe('invalid-effect-chain')
    expect(outcome?.world).toBe(twinExternal)
  })

  test('gate 缺省 chance=100 时 rng 0.999999 仍失败（roll=100 不小于 100）', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'gate' }, { kind: 'healHp', amount: 10 }]),
    }
    const w = world([{ itemId: 'use-item', count: 1 }])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = resolveWorldItemUse(w, 'hero', 'use-item', items, poisonDefs(), () => 0.999999)
    }, [w, items, poisonDefs])
    expect(outcome?.status).toBe('failure')
    expect(outcome?.reason).toBe('gate-failed')
    expect(outcome?.effectResults?.[0]?.gate).toEqual({ chance: 100, roll: 100, passed: false })
    expect(outcome?.world).toBe(w)
  })

  test('modifyHostileAwareness 免目标照常执行；同值重放零变化返回原引用', () => {
    const items: ItemDataMap = {
      'use-item': useItem(
        [{ kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60000 }],
        { target: 'scene' },
      ),
    }
    const w = world([{ itemId: 'use-item', count: 1 }])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = resolveWorldItemUse(w, 'nobody', 'use-item', items)
    }, [w, items])
    expect(outcome?.status).toBe('success')
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world?.hostileAwareness).toEqual({ rangeMultiplier: 0, remainingMs: 60000 })
    const replay = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      hostileAwareness: { rangeMultiplier: 0, remainingMs: 60000 },
    } satisfies WorldState
    const replayItems: ItemDataMap = {
      'use-item': useItem(
        [{ kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60000 }],
        { target: 'scene', consuming: false },
      ),
    }
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', replayItems)
    }, replay)
    expect(outcome?.changed).toBe(false)
    expect(outcome?.world).toBe(replay)
  })
})
describe('I5 目标类效果残差', () => {
  test('revive：倒下队员复活半血并清空附加状态；活人零变化', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'revive', hpPercent: 50 }]),
    }
    const downed = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [{ ...hero(0, 40, 'hero'), extraStatuses: [{ status: 'protect', turns: 7 }] }],
    } satisfies WorldState
    let outcome: WorldItemUseOutcome | undefined
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', items)
    }, downed)
    expect(outcome?.changed).toBe(true)
    const revived = outcome?.world?.party[0]!
    expect(revived?.hp).toBe(50)
    expect(revived?.extraStatuses).toEqual([])
    expect(outcome?.effectResults?.[0]?.targetCharIds).toEqual(['hero'])
    const alive = world([{ itemId: 'use-item', count: 1 }])
    const aliveItems: ItemDataMap = {
      'use-item': useItem([{ kind: 'revive', hpPercent: 50 }], { consuming: false }),
    }
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', aliveItems)
    }, alive)
    expect(outcome?.changed).toBe(false)
    expect(outcome?.world).toBe(alive)
  })

  test('curePoison：显式 id 只解该毒、缺 defs 时档位解不生效、未知毒保留、无毒零变化', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'curePoison', poisonId: '551' }]),
    }
    const w = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [poisoned('hero')],
    } satisfies WorldState
    let outcome: WorldItemUseOutcome | undefined
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', items)
    }, w)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world?.party[0]?.poisons).toEqual([])
    const defsMissing = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [poisoned('hero')],
    } satisfies WorldState
    const tierItems: ItemDataMap = {
      'use-item': useItem([{ kind: 'curePoison', curesTier: 'common' }], { consuming: false }),
    }
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', tierItems)
    }, defsMissing)
    expect(outcome?.changed).toBe(false)
    expect(outcome?.world).toBe(defsMissing)
    const unknownPoison = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [{ ...poisoned('hero'), poisons: [{ poisonId: 999, tickIndex: 1 }] }],
    } satisfies WorldState
    const unknownItems: ItemDataMap = {
      'use-item': useItem([{ kind: 'curePoison', poisonId: '551' }], { consuming: false }),
    }
    expectInputsUnchanged(() => {
      outcome = resolveWorldItemUse(unknownPoison, 'hero', 'use-item', unknownItems, poisonDefs())
    }, [unknownPoison, unknownItems, poisonDefs])
    expect(outcome?.changed).toBe(false)
    expect(outcome?.world?.party[0]?.poisons).toEqual([{ poisonId: 999, tickIndex: 1 }])
    const clean = world([{ itemId: 'use-item', count: 1 }])
    expectInputsUnchanged(() => {
      outcome = resolveWorldItemUse(clean, 'hero', 'use-item', tierItems, poisonDefs())
    }, [clean, tierItems, poisonDefs])
    expect(outcome?.changed).toBe(false)
  })

  test('removeStatus 只删点名状态；无毒/无状态队员零变化', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'removeStatus', statuses: ['protect'] }]),
    }
    const w = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [
        {
          ...hero(80),
          extraStatuses: [
            { status: 'protect', turns: 7 },
            { status: 'haste', turns: 5 },
          ],
        },
      ],
    } satisfies WorldState
    let outcome: WorldItemUseOutcome | undefined
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', items)
    }, w)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world?.party[0]?.extraStatuses).toEqual([{ status: 'haste', turns: 5 }])
    const plain = world([{ itemId: 'use-item', count: 1 }])
    const plainItems: ItemDataMap = {
      'use-item': useItem([{ kind: 'removeStatus', statuses: ['protect'] }], { consuming: false }),
    }
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', plainItems)
    }, plain)
    expect(outcome?.changed).toBe(false)
    expect(outcome?.world).toBe(plain)
  })

  test('permanentStatBoost：maxHP 负钳 1、maxMP 负钳 0、attack 直加与零变化', () => {
    const w = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [{ ...hero(30, 3), maxHP: 10, maxMP: 2 }],
    } satisfies WorldState
    const items: ItemDataMap = {
      'use-item': useItem([
        { kind: 'permanentStatBoost', stat: 'maxHP', delta: -999 },
        { kind: 'permanentStatBoost', stat: 'maxMP', delta: -5 },
        { kind: 'permanentStatBoost', stat: 'attack', delta: 3 },
      ]),
    }
    let outcome: WorldItemUseOutcome | undefined
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', items)
    }, w)
    const after = outcome?.world?.party[0]!
    expect(after?.maxHP).toBe(1)
    expect(after?.maxMP).toBe(0)
    expect(after?.attack).toBe(13)
    expect(outcome?.changed).toBe(true)
    const floored = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [{ ...hero(), maxHP: 1 }],
    } satisfies WorldState
    const floorItems: ItemDataMap = {
      'use-item': useItem([{ kind: 'permanentStatBoost', stat: 'maxHP', delta: -1 }], {
        consuming: false,
      }),
    }
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', floorItems)
    }, floored)
    expect(outcome?.changed).toBe(false)
    expect(floored.party[0]?.maxHP).toBe(1)
    expect(outcome?.world).toBe(floored)
  })

  test('dieIfNotPoisoned：中毒队员不杀不停表，同链后续 healHp 仍对其生效', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'dieIfNotPoisoned' }, { kind: 'healHp', amount: 20 }]),
    }
    const w = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [poisoned('hero', 40)],
    } satisfies WorldState
    let outcome: WorldItemUseOutcome | undefined
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', items)
    }, w)
    expect(outcome?.changed).toBe(true)
    const after = outcome?.world?.party[0]!
    expect(after?.hp).toBe(60)
    expect(after?.poisons).toHaveLength(1)
  })

  test('oneAlly 跳过非目标；allAllies 复合链跳过已停表目标', () => {
    const single = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [hero(80, 40, 'hero'), hero(70, 40, 'mage')],
    } satisfies WorldState
    const singleItems: ItemDataMap = {
      'use-item': useItem([{ kind: 'healHp', amount: 10 }]),
    }
    let outcome: WorldItemUseOutcome | undefined
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', singleItems)
    }, single)
    expect(outcome?.effectResults?.[0]?.targetCharIds).toEqual(['hero'])
    expect(outcome?.world?.party[1]?.hp).toBe(70)
    const groupItems: ItemDataMap = {
      'use-item': useItem([{ kind: 'dieIfNotPoisoned' }, { kind: 'revive', hpPercent: 40 }], {
        target: 'allAllies',
      }),
    }
    const group = {
      ...world([{ itemId: 'use-item', count: 1 }]),
      party: [hero(60, 40, 'hero'), poisoned('mage', 0)],
    } satisfies WorldState
    const groupUse = { ...group, inventory: [{ itemId: 'use-item', count: 1 }] } as WorldState
    expectAcceptsUnchanged((value) => {
      outcome = resolveWorldItemUse(value, 'hero', 'use-item', groupItems)
    }, groupUse)
    expect(outcome?.status).toBe('success')
    const leader = outcome?.world?.party[0]!
    const mage = outcome?.world?.party[1]!
    expect(leader.hp).toBe(0)
    expect(mage.hp).toBe(40)
    expect(mage.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
  })

  test('levelUp：零经验队员仍因属性成长记 changed（固定 rng）', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'levelUp', levels: 1 }]),
    }
    const w = world([{ itemId: 'use-item', count: 1 }])
    let outcome: WorldItemUseOutcome | undefined
    const defs = poisonDefs()
    expectInputsUnchanged(() => {
      outcome = resolveWorldItemUse(w, 'hero', 'use-item', items, defs, () => 0.5)
    }, [w, items, defs])
    expect(outcome?.changed).toBe(true)
    const after = outcome?.world?.party[0]!
    expect(after.level).toBe(2)
    expect(after.maxHP).toBe(114)
    expect(after.maxMP).toBe(61)
    expect(after.attack).toBe(15)
    expect(after.magicAttack).toBe(15)
    expect(after.defense).toBe(13)
    expect(after.speed).toBe(13)
    expect(after.luck).toBe(12)
    expect(after.exp).toBe(0)
    expect(after.hp).toBe(100)
  })
})
