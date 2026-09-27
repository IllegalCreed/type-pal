import { type ItemData, type SkillData, validateItems, validateSkills } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  BattleCommandSelection,
  type BattleCommandSelectionContext,
  type BattleCommandSelectionPort,
} from './battle-command-selection.js'
import type { BattleAction } from './battle-core.js'

function skill(id: string, target: SkillData['target'], mp = 0, money = 0): SkillData {
  const skill: SkillData = {
    id,
    name: id,
    desc: id,
    cost: { mp, money },
    usableOutsideBattle: false,
    target,
    effects: [],
    animation: { effectSprite: 0 },
  }
  return validateSkills({ skills: [skill], levelUp: {} }).skills[0]!
}

function battleItem(
  id: string,
  capability: 'use' | 'throw',
  target: 'oneAlly' | 'oneEnemy' | 'allEnemies',
): ItemData {
  const item: ItemData = {
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    ...(capability === 'use'
      ? {
          use: {
            target: 'oneAlly' as const,
            consuming: true,
            effects: [{ kind: 'healHp' as const, amount: 10 }],
          },
        }
      : {
          throw: {
            target: target as 'oneEnemy' | 'allEnemies',
            effects: [{ kind: 'fixedDamage' as const, amount: 5 }],
          },
        }),
  }
  return validateItems([item])[0]!
}

function context(
  overrides: Partial<BattleCommandSelectionContext> = {},
): BattleCommandSelectionContext {
  return {
    playerIndex: 0,
    player: { skills: [], mp: 40, silenced: false, healthy: true },
    playerCount: 2,
    healthyPlayerCount: 2,
    aliveEnemyIndices: [2, 4],
    usableItems: [],
    throwableItems: [],
    skills: {},
    items: {},
    money: 20,
    ...overrides,
  }
}

function port() {
  const submissions: Array<{ playerIndex: number; action: BattleAction }> = []
  const retract = vi.fn<(playerIndex: number) => void>()
  const consumeOthersForCoop = vi.fn<(casterIndex: number) => void>()
  const api: BattleCommandSelectionPort = {
    submit: (playerIndex, action) => submissions.push({ playerIndex, action }),
    retract,
    consumeOthersForCoop,
  }
  return { api, submissions, retract, consumeOthersForCoop }
}

const press = (
  selection: BattleCommandSelection,
  ctx: BattleCommandSelectionContext,
  api: BattleCommandSelectionPort,
  ...keys: string[]
) => selection.advance(ctx, new Set(keys), api)

describe('战斗命令选择剩余当前流程', () => {
  test('杂项→二级使用/投掷往返不消耗行动；两个列表各保留自己的入口', () => {
    const herb = battleItem('herb', 'use', 'oneAlly')
    const stone = battleItem('stone', 'throw', 'oneEnemy')
    const ctx = context({
      usableItems: [{ itemId: herb.id, count: 1 }],
      throwableItems: [{ itemId: stone.id, count: 1 }],
      items: { [herb.id]: herb, [stone.id]: stone },
    })
    const before = structuredClone(ctx)
    const selection = new BattleCommandSelection()
    const recorded = port()
    press(selection, ctx, recorded.api, 'ArrowDown', 'Enter')
    expect(selection.view).toMatchObject({ phase: 'misc', menuIndex: 3, miscIndex: 0 })
    press(selection, ctx, recorded.api, 'ArrowDown', 'Enter')
    expect(selection.view).toMatchObject({ phase: 'miscSub', miscSubIndex: 0 })
    press(selection, ctx, recorded.api, 'ArrowRight', 'Enter')
    expect(selection.phase).toBe('throwItem')
    press(selection, ctx, recorded.api, 'Escape')
    expect(selection.phase).toBe('miscSub')
    press(selection, ctx, recorded.api, 'ArrowLeft', 'Enter')
    expect(selection.phase).toBe('item')
    press(selection, ctx, recorded.api, 'Escape')
    expect(selection.phase).toBe('miscSub')
    expect(recorded.submissions).toEqual([])
    expect(ctx).toEqual(before)
  })

  test('全体投掷不打开目标格而直接提交一次；单体投掷可退出重选后提交活敌', () => {
    const all = battleItem('powder', 'throw', 'allEnemies')
    const one = battleItem('stone', 'throw', 'oneEnemy')
    const ctx = context({
      throwableItems: [
        { itemId: all.id, count: 1 },
        { itemId: one.id, count: 1 },
      ],
      items: { [all.id]: all, [one.id]: one },
    })
    const before = structuredClone(ctx)
    const selection = new BattleCommandSelection()
    const recorded = port()
    press(selection, ctx, recorded.api, 'w')
    expect(selection.phase).toBe('throwItem')
    press(selection, ctx, recorded.api, 'Enter')
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'throw', itemId: 'powder' } },
    ])
    expect(selection.phase).toBe('menu')

    press(selection, ctx, recorded.api, 'w')
    press(selection, ctx, recorded.api, 'ArrowRight', 'Enter')
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'enemy' })
    press(selection, ctx, recorded.api, 'Escape')
    expect(selection.phase).toBe('throwItem')
    expect(recorded.submissions).toHaveLength(1)
    press(selection, ctx, recorded.api, 'Enter')
    press(selection, ctx, recorded.api, 'ArrowRight', 'Enter')
    expect(recorded.submissions[1]).toEqual({
      playerIndex: 0,
      action: { kind: 'throw', itemId: 'stone', targetEnemyIdx: 4 },
    })
    expect(ctx).toEqual(before)
  })

  test('己方单体法术取消目标会退回技能，再次选择才提交队友槽位', () => {
    const heal = skill('heal', 'oneAlly', 5)
    const ctx = context({
      player: { skills: [heal.id], mp: 40, silenced: false, healthy: true },
      skills: { [heal.id]: heal },
      playerCount: 3,
    })
    const before = structuredClone(ctx)
    const selection = new BattleCommandSelection()
    const recorded = port()
    press(selection, ctx, recorded.api, 'ArrowLeft', 'Enter')
    expect(selection.phase).toBe('skill')
    press(selection, ctx, recorded.api, 'Enter')
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'ally', targetIndex: 0 })
    press(selection, ctx, recorded.api, 'Escape')
    expect(selection.view).toMatchObject({ phase: 'skill', targetSide: 'enemy' })
    expect(recorded.submissions).toEqual([])
    press(selection, ctx, recorded.api, 'Enter')
    press(selection, ctx, recorded.api, 'ArrowLeft', 'Enter')
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'cast', skillId: heal.id, targetAllyIdx: 2 } },
    ])
    expect(ctx).toEqual(before)
  })

  test('真气或金钱不足时技能确认不提交；补足两种成本后才进入目标选择', () => {
    const bolt = skill('bolt', 'oneEnemy', 8, 4)
    const selection = new BattleCommandSelection()
    const recorded = port()
    const poor = context({
      player: { skills: [bolt.id], mp: 7, silenced: false, healthy: true },
      skills: { [bolt.id]: bolt },
      money: 3,
    })
    press(selection, poor, recorded.api, 'ArrowLeft', 'Enter')
    press(selection, poor, recorded.api, 'Enter')
    expect(selection.phase).toBe('skill')
    expect(recorded.submissions).toEqual([])
    const affordable = context({
      player: { skills: [bolt.id], mp: 8, silenced: false, healthy: true },
      skills: { [bolt.id]: bolt },
      money: 4,
    })
    press(selection, affordable, recorded.api, 'Enter')
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'enemy' })
    press(selection, affordable, recorded.api, 'Enter')
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'cast', skillId: bolt.id, targetEnemyIdx: 2 } },
    ])
  })

  test('R 重放已经用光的物品退回当前活敌普攻，F 在无活敌时退回防御', () => {
    const herb = battleItem('herb', 'use', 'oneAlly')
    const ctx = context({
      playerCount: 1,
      healthyPlayerCount: 1,
      usableItems: [{ itemId: herb.id, count: 1 }],
      items: { [herb.id]: herb },
    })
    const selection = new BattleCommandSelection()
    const recorded = port()
    press(selection, ctx, recorded.api, 'e')
    press(selection, ctx, recorded.api, 'Enter')
    expect(recorded.submissions[0]?.action).toEqual({ kind: 'item', itemId: herb.id })
    selection.beginRound()
    press(selection, context({ usableItems: [], items: { [herb.id]: herb } }), recorded.api, 'r')
    expect(recorded.submissions[1]?.action).toEqual({ kind: 'attack', targetEnemyIdx: 2 })

    const empty = new BattleCommandSelection()
    const noEnemy = port()
    press(empty, context({ aliveEnemyIndices: [] }), noEnemy.api, 'f')
    expect(noEnemy.submissions).toEqual([{ playerIndex: 0, action: { kind: 'defend' } }])
  })

  test('单体合击走活敌目标并恰一次消费队友，逃回主菜单时零代价', () => {
    const duo = skill('duo', 'oneEnemy')
    const ctx = context({
      player: {
        skills: [],
        mp: 40,
        silenced: false,
        healthy: true,
        cooperativeMagicSkillId: duo.id,
      },
      skills: { [duo.id]: duo },
    })
    const selection = new BattleCommandSelection()
    const recorded = port()
    press(selection, ctx, recorded.api, 'ArrowRight', 'Enter')
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'enemy' })
    press(selection, ctx, recorded.api, 'Escape')
    expect(selection.phase).toBe('menu')
    expect(recorded.submissions).toEqual([])
    expect(recorded.consumeOthersForCoop).not.toHaveBeenCalled()
    press(selection, ctx, recorded.api, 'ArrowRight', 'Enter')
    press(selection, ctx, recorded.api, 'ArrowRight', 'Enter')
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'coop', targetEnemyIdx: 4 } },
    ])
    expect(recorded.consumeOthersForCoop).toHaveBeenCalledExactlyOnceWith(0)
  })
})
