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

function battleItem(id: string, throwTarget?: NonNullable<ItemData['throw']>['target']): ItemData {
  const item: ItemData = {
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    ...(throwTarget
      ? {
          throw: {
            target: throwTarget,
            effects: [{ kind: 'fixedDamage', amount: 5 }],
          },
        }
      : {
          use: {
            target: 'oneAlly',
            consuming: true,
            effects: [{ kind: 'healHp', amount: 10 }],
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
    selectablePlayerIndices: [0, 1],
    aliveEnemyIndices: [2, 4],
    usableItems: [],
    throwableItems: [],
    skills: {},
    items: {},
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

describe('战斗技能与物品列表', () => {
  test('杂项→二级使用/投掷往返不消耗行动；两个列表各保留自己的入口', () => {
    const herb = battleItem('herb')
    const stone = battleItem('stone', 'oneEnemy')
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

  test('全体投掷直接提交，下一名队员的单体投掷可取消并重选活敌', () => {
    const all = battleItem('powder', 'allEnemies')
    const one = battleItem('stone', 'oneEnemy')
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

    const next = context({
      playerIndex: 1,
      items: ctx.items,
      throwableItems: [{ itemId: one.id, count: 1 }],
    })
    press(selection, next, recorded.api, 'w')
    press(selection, next, recorded.api, 'Enter')
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'enemy' })
    press(selection, next, recorded.api, 'Escape')
    expect(selection.phase).toBe('throwItem')
    expect(recorded.submissions).toHaveLength(1)
    press(selection, next, recorded.api, 'Enter')
    press(selection, next, recorded.api, 'ArrowRight', 'Enter')
    expect(recorded.submissions[1]).toEqual({
      playerIndex: 1,
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
      healthyPlayerCount: 3,
      selectablePlayerIndices: [0, 1, 2],
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

  test('技能确认检查真气，金钱成本留到出手结算', () => {
    const bolt = skill('bolt', 'oneEnemy', 8, 4)
    const selection = new BattleCommandSelection()
    const recorded = port()
    const poor = context({
      player: { skills: [bolt.id], mp: 7, silenced: false, healthy: true },
      skills: { [bolt.id]: bolt },
    })
    press(selection, poor, recorded.api, 'ArrowLeft', 'Enter')
    press(selection, poor, recorded.api, 'Enter')
    expect(selection.phase).toBe('skill')
    expect(recorded.submissions).toEqual([])
    const affordable = context({
      player: { skills: [bolt.id], mp: 8, silenced: false, healthy: true },
      skills: { [bolt.id]: bolt },
    })
    press(selection, affordable, recorded.api, 'Enter')
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'enemy' })
    press(selection, affordable, recorded.api, 'Enter')
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'cast', skillId: bolt.id, targetEnemyIdx: 2 } },
    ])
  })

  test('R 重放已经用光的物品退回当前活敌普攻，F 在无活敌时退回防御', () => {
    const herb = battleItem('herb')
    const ctx = context({
      playerCount: 1,
      healthyPlayerCount: 1,
      selectablePlayerIndices: [0],
      usableItems: [{ itemId: herb.id, count: 1 }],
      items: { [herb.id]: herb },
    })
    const selection = new BattleCommandSelection()
    const recorded = port()
    press(selection, ctx, recorded.api, 'e')
    press(selection, ctx, recorded.api, 'Enter')
    expect(recorded.submissions[0]?.action).toEqual({ kind: 'item', itemId: herb.id })
    selection.beginRound()
    press(selection, { ...ctx, usableItems: [] }, recorded.api, 'r')
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

  test('技能光标每行三格，首尾钳制并可确认当前位置的法术', () => {
    const selection = new BattleCommandSelection()
    const recorded = port()
    const skills = ['heal', 'ward', 'revive', 'protect', 'focus']
    const ctx = context({
      player: { skills, mp: 40, silenced: false, healthy: true },
      skills: Object.fromEntries(skills.map((id) => [id, skill(id, 'self')])),
    })
    press(selection, ctx, recorded.api, 'ArrowLeft', 'Enter')
    for (const [key, expected] of [
      ['ArrowDown', 3],
      ['ArrowDown', 4],
      ['ArrowDown', 4],
      ['ArrowUp', 1],
      ['ArrowUp', 0],
      ['ArrowUp', 0],
    ] as const) {
      press(selection, ctx, recorded.api, key)
      expect(selection.view.skillIndex).toBe(expected)
    }
    press(selection, ctx, recorded.api, 'Enter')
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'cast', skillId: 'heal' } },
    ])
  })

  test('使用快捷键直达列表，逐层取消不提交动作', () => {
    const selection = new BattleCommandSelection()
    const recorded = port()
    const tonic = battleItem('tonic')
    const ctx = context({ usableItems: [{ itemId: tonic.id, count: 2 }], items: { tonic } })
    press(selection, ctx, recorded.api, 'E')
    expect(selection.phase).toBe('item')
    for (const phase of ['miscSub', 'misc', 'menu'] as const) {
      press(selection, ctx, recorded.api, 'Escape')
      expect(selection.phase).toBe(phase)
    }
    expect(recorded.submissions).toEqual([])
  })

  test('取消已移动的用品目标，重新选择时光标回到使用者', () => {
    const selection = new BattleCommandSelection()
    const recorded = port()
    const tonic = battleItem('tonic')
    const ctx = context({ usableItems: [{ itemId: tonic.id, count: 2 }], items: { tonic } })
    press(selection, ctx, recorded.api, 'E')
    press(selection, ctx, recorded.api, 'Enter')
    press(selection, ctx, recorded.api, 'ArrowRight')
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'ally', targetIndex: 1 })
    press(selection, ctx, recorded.api, 'Escape')
    expect(selection.phase).toBe('item')
    expect(recorded.submissions).toEqual([])
    press(selection, ctx, recorded.api, 'Enter')
    press(selection, ctx, recorded.api, 'Enter')
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'item', itemId: tonic.id, targetAllyIdx: 0 } },
    ])
    expect(selection.phase).toBe('menu')
  })
})
