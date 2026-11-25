import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  wfEnemy,
  wfHealItem,
  wfIdleEnemy,
  wfPlayer,
} from '../__tests__/battle-workflows/catalog.js'
import { createBattleState, stepBattle } from './battle-core.js'

const rng0 = () => 0

describe('用品和撤离', () => {
  const runSingleItemAction = (item: ItemData, action: import('./battle-core.js').BattleAction) => {
    const s = createBattleState({
      players: [wfPlayer('li', { poisonRes: 10 })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      items: { [item.id]: item },
      inventory: [{ itemId: item.id, count: 1 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, action)
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    return s
  }

  test('世界专用物品误用或误投掷时不扣库存；大蒜战斗毒抗有真实消费方', () => {
    const worldScript: ItemData = {
      id: 'story',
      name: '剧情道具',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: true,
        effects: [
          {
            kind: 'runScript',
            script: { chunk: 'shared/c00', id: 'shared/user/story' },
          },
        ],
      },
    }
    const rejectedUse = runSingleItemAction(worldScript, { kind: 'item', itemId: 'story' })
    expect(rejectedUse.inventory[0]!.count).toBe(1)
    expect(rejectedUse.log.some((line) => line.includes('不能在战斗中使用'))).toBe(true)
    expect(rejectedUse.log.some((line) => line.includes('防御'))).toBe(true)

    const rejectedThrow = runSingleItemAction(worldScript, {
      kind: 'throw',
      itemId: worldScript.id,
      targetEnemyIdx: 0,
    })
    expect(rejectedThrow.inventory[0]!.count).toBe(1)
    expect(rejectedThrow.log.some((line) => line.includes('投掷数据无效'))).toBe(true)

    const garlic: ItemData = {
      ...worldScript,
      id: 'garlic',
      name: '大蒜',
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'extraPoisonRes', amount: 30 }],
      },
    }
    const used = runSingleItemAction(garlic, { kind: 'item', itemId: 'garlic' })
    expect(used.inventory[0]!.count).toBe(0)
    expect(used.players[0]!.poisonRes).toBe(40)

    const repeatedGarlic: ItemData = {
      ...garlic,
      id: 'garlic-repeat',
      use: {
        ...garlic.use!,
        effects: [
          { kind: 'extraPoisonRes', amount: 30 },
          { kind: 'extraPoisonRes', amount: 30 },
        ],
      },
    }
    const refreshed = runSingleItemAction(repeatedGarlic, {
      kind: 'item',
      itemId: 'garlic-repeat',
    })
    expect(refreshed.players[0]!.poisonRes).toBe(40)
    expect(refreshed.players[0]!.itemPoisonResBonus).toBe(30)
  })

  test('物品:回血 + consuming 扣库存;逃跑:str vs Σ敌(吉运+(lv+6)*4) 掷骰', () => {
    const potion = wfHealItem('tonic', 50)
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 10, maxHp: 100 })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      items: { [potion.id]: potion },
      inventory: [{ itemId: potion.id, count: 2 }],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'item', itemId: potion.id })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.players[0]!.hp).toBe(60)
    expect(s.inventory[0]!.count).toBe(1)

    // 逃跑失败:str 低 + rng 高 → roll 大
    const s2 = createBattleState({
      players: [wfPlayer('li', { fleeRate: 0 })],
      enemySlots: [wfEnemy('e', { level: 10, fleeRate: 50, health: 500, attackStrength: 1 })],
    })
    const r9 = () => 0.99
    stepBattle(s2, r9)
    s2.pendingActions.set(0, { kind: 'flee' })
    guard = 0
    while (s2.phase !== 'selectAction' || s2.turn === 1) {
      if ((s2.phase as string) === 'fled') break
      stepBattle(s2, r9)
      if (++guard > 50) break
    }
    expect(s2.log.some((l) => l.includes('逃跑失败'))).toBe(true)
    expect(s2.phase).not.toBe('fled')
    expect(s2.players[0]!.hiddenCounts.luck).toBe(2) // 失败 → 吉运池 +2(fight.c:4170)
  })

  test('金蚕王与遇敌香写入通用持久队列；成长只加基础值且不回满血蓝', () => {
    const genericItems: Record<string, ItemData> = {
      level: {
        id: 'level',
        name: '金蚕王',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'levelUp', levels: 1 }],
        },
      },
      incense: {
        id: 'incense',
        name: '驱魔香',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [{ kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60_000 }],
        },
      },
    }
    const persistentProgress = {
      level: 1,
      exp: 77,
      maxHP: 100,
      maxMP: 30,
      attack: 40,
      magicAttack: 20,
      defense: 30,
      speed: 50,
      luck: 20,
    }
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 40, mp: 9, persistentProgress })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      items: genericItems,
      inventory: [
        { itemId: 'level', count: 1 },
        { itemId: 'incense', count: 1 },
      ],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'level' })
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.players[0]).toMatchObject({
      hp: 40,
      mp: 9,
      maxHp: 110,
      maxMp: 38,
      attackStrength: 44,
      magicStrength: 24,
      defense: 32,
      baseDexterity: 52,
      fleeRate: 22,
    })
    expect(s.pendingWorldMutations[0]).toEqual({
      kind: 'characterGrowth',
      characterId: 'li',
      delta: {
        level: 1,
        maxHP: 10,
        maxMP: 8,
        attack: 4,
        magicAttack: 4,
        defense: 2,
        speed: 2,
        luck: 2,
      },
      expAfter: 0,
    })
    expect(persistentProgress).toMatchObject({ level: 1, exp: 77 })

    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'incense' })
    guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.pendingWorldMutations[1]).toEqual({
      kind: 'hostileAwareness',
      value: { rangeMultiplier: 0, remainingMs: 60_000 },
    })
  })

  test('战斗 allAllies 逐个回复活着的队员，不再只作用施用者', () => {
    const feast: ItemData = {
      id: 'feast',
      name: '全体药',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'allAllies',
        consuming: true,
        effects: [{ kind: 'healHp', amount: 25 }],
      },
    }
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 10, maxHp: 100 }), wfPlayer('ling', { hp: 20, maxHp: 100 })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      items: { feast },
      inventory: [{ itemId: 'feast', count: 1 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'feast' })
    s.pendingActions.set(1, { kind: 'defend' })
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.players.map((member) => member.hp)).toEqual([35, 45])
    expect(s.inventory[0]!.count).toBe(0)
  })

  test('战斗用物 roll 49 生效，roll 50 消耗一份且记录失败旁白', () => {
    const gated: ItemData = {
      id: 'salt',
      name: '盐巴',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [
          { kind: 'gate', chance: 50 },
          { kind: 'healHp', amount: 10 },
        ],
      },
    }
    const run = (rng: () => number) => {
      const s = createBattleState({
        players: [wfPlayer('li', { hp: 10, maxHp: 100 })],
        enemySlots: [wfIdleEnemy('e', { health: 500 })],
        items: { salt: gated },
        inventory: [{ itemId: 'salt', count: 1 }],
      })
      stepBattle(s, rng)
      s.enemies[0]!.status.sleep = 99
      s.pendingActions.set(0, { kind: 'item', itemId: 'salt' })
      let guard = 0
      let itemAction: typeof s.lastAction = null
      do {
        stepBattle(s, rng)
        if (s.lastAction?.kind === 'item') itemAction = s.lastAction
      } while (s.phase === 'performAction' && guard++ < 40)
      return { state: s, itemAction }
    }
    const passed = run(() => 0.48)
    expect(passed.state.players[0]!.hp).toBe(20)
    expect(passed.itemAction).toMatchObject({ itemId: 'salt' })
    expect(passed.itemAction?.failureFeedback).toBeUndefined()
    const failed = run(() => 0.49)
    expect(failed.state.players[0]!.hp).toBe(10)
    expect(failed.state.inventory[0]!.count).toBe(0)
    expect(failed.itemAction).toMatchObject({ itemId: 'salt', failureFeedback: 'itemIneffective' })
  })

  test('gate 缺省阈值 100 仍遵循严格小于：roll 100 失败且与大世界一致', () => {
    const defaultGate: ItemData = {
      id: 'default-gate',
      name: '缺省概率物',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'gate' }, { kind: 'healHp', amount: 10 }],
      },
    }
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 10, maxHp: 100 })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      items: { 'default-gate': defaultGate },
      inventory: [{ itemId: 'default-gate', count: 1 }],
    })
    stepBattle(s, () => 0.999)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'default-gate' })
    let guard = 0
    do stepBattle(s, () => 0.999)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.players[0]!.hp).toBe(10)
    expect(s.inventory[0]!.count).toBe(0)
  })
})
