import type { EnemyDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { type CreatePlayerInput, createBattleState, stepBattle } from './battle-core.js'

const rng0 = () => 0

function enemy(id: string, over: Partial<EnemyDef['stats']> = {}): EnemyDef {
  return {
    id,
    name: id,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 999,
      level: 1,
      exp: 0,
      cash: 0,
      attackStrength: -999,
      magicStrength: 50,
      defense: 0,
      dexterity: 0,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...over,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

function player(over: Partial<CreatePlayerInput> = {}): CreatePlayerInput {
  return {
    roleId: 'hero',
    actorTemplateId: 'hero',
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    attackStrength: 30,
    defense: 0,
    magicStrength: 30,
    baseDexterity: 500,
    skills: [],
    fleeRate: 0,
    ...over,
  }
}

function skill(id: string, over: Partial<SkillData>): SkillData {
  return {
    id,
    name: id,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [],
    animation: { effectSprite: 0 },
    ...over,
  }
}

function finishTurn(state: ReturnType<typeof createBattleState>): void {
  let guard = 0
  do {
    stepBattle(state, rng0)
  } while (state.phase === 'performAction' && ++guard < 60)
}

function playerCast(definition: SkillData, mp = 100, wine = 0) {
  const state = createBattleState({
    players: [player({ mp, maxMp: Math.max(100, mp), skills: [definition.id] })],
    enemies: [enemy('target')],
    skills: { [definition.id]: definition },
    inventory: wine > 0 ? [{ itemId: '86', count: wine }] : [],
  })
  stepBattle(state, rng0)
  state.pendingActions.set(0, { kind: 'cast', skillId: definition.id, targetEnemyIdx: 0 })
  finishTurn(state)
  return state
}

function enemyCast(definition: SkillData) {
  const caster = enemy('caster', { dexterity: 999 })
  caster.ai = {
    resistanceToSorcery: 0,
    rules: [{ at: 'act', do: { kind: 'cast', skillId: definition.id } }],
  }
  const state = createBattleState({
    players: [player({ mp: 30, maxMp: 30 })],
    enemies: [caster],
    skills: { [definition.id]: definition },
    inventory: [{ itemId: '86', count: 1 }],
  })
  stepBattle(state, rng0)
  state.pendingActions.set(0, { kind: 'defend' })
  finishTurn(state)
  return state
}

describe('R13-6B 技能施放者分支', () => {
  const dream = skill('303', {
    name: '回梦',
    effects: [
      { kind: 'gate', chance: 60 },
      { kind: 'applyStatus', status: 'sleep', turns: 4 },
    ],
    execution: {
      enemy: {
        effects: [
          { kind: 'gate', chance: 60 },
          { kind: 'resourceDelta', resource: 'hp', delta: -1 },
        ],
      },
    },
  })
  const soul = skill('304', {
    name: '夺魂',
    effects: [
      { kind: 'gate', magicResist: true },
      { kind: 'gate', chance: 33 },
      { kind: 'instantKill' },
    ],
    execution: {
      enemy: {
        effects: [{ kind: 'gate', chance: 33 }, { kind: 'instantKill' }],
      },
    },
  })
  const ghost = skill('305', {
    name: '鬼降',
    effects: [
      { kind: 'gate', chance: 44 },
      { kind: 'applyStatus', status: 'confused', turns: 4 },
    ],
    execution: {
      enemy: {
        effects: [
          { kind: 'gate', chance: 44 },
          { kind: 'resourceDelta', resource: 'hp', delta: -1 },
        ],
      },
    },
  })

  test('303 玩家侧沿用睡眠链，敌侧只直接扣 1 HP', () => {
    const byPlayer = playerCast(dream)
    // 回合收尾已推进一次状态寿命：4 回合效果落地后剩 3。
    expect(byPlayer.enemies[0]!.status.sleep).toBe(3)
    expect(byPlayer.enemies[0]!.hp).toBe(999)

    const byEnemy = enemyCast(dream)
    expect(byEnemy.players[0]!.hp).toBe(99)
    expect(byEnemy.players[0]!.status.sleep).toBe(0)
    expect(byEnemy.log).toContain('caster 施展 回梦,hero HP -1')
  })

  test('304 两侧都是独立即死，不会退化成 HP -1', () => {
    const byPlayer = playerCast(soul)
    expect(byPlayer.enemies[0]!.hp).toBe(0)
    expect(byPlayer.log.some((line) => line.includes('魂飞魄散'))).toBe(true)

    const byEnemy = enemyCast(soul)
    expect(byEnemy.players[0]!.hp).toBe(0)
    expect(byEnemy.log.some((line) => line.includes('魂飞魄散'))).toBe(true)
  })

  test('305 玩家侧沿用混乱链，敌侧只直接扣 1 HP', () => {
    const byPlayer = playerCast(ghost)
    expect(byPlayer.enemies[0]!.status.confused).toBe(3)
    expect(byPlayer.enemies[0]!.hp).toBe(999)

    const byEnemy = enemyCast(ghost)
    expect(byEnemy.players[0]!.hp).toBe(99)
    expect(byEnemy.players[0]!.status.confused).toBe(0)
    expect(byEnemy.log).toContain('caster 施展 鬼降,hero HP -1')
  })
})

describe('R13-6B 酒神剩余真气结算', () => {
  const wineGod = skill('370', {
    name: '酒神',
    cost: { mp: 1, items: [{ itemId: '86', amount: 1 }] },
    target: 'allEnemies',
    effects: [
      { kind: 'summon', battleSprite: 'player-summon-15' },
      { kind: 'damage', power: 3, elemental: 0 },
    ],
    execution: {
      player: {
        prepare: [
          {
            kind: 'remainingResourceDamage',
            resource: 'mp',
            multiplier: 8,
            consume: 'all',
          },
        ],
        effects: [{ kind: 'summon', battleSprite: 'player-summon-15' }],
      },
    },
  })

  test('MP=1 时先扣常规 MP，余量为 0，不产生第二份占位伤害', () => {
    const state = playerCast(wineGod, 1, 1)
    expect(state.players[0]!.mp).toBe(0)
    expect(state.inventory).toEqual([{ itemId: '86', count: 0 }])
    expect(state.enemies[0]!.hp).toBe(999)
  })

  test('满 MP 成功时按（扣 1 后余量）×8 直伤并清空 MP', () => {
    const state = playerCast(wineGod, 30, 1)
    expect(state.players[0]!.mp).toBe(0)
    expect(state.enemies[0]!.hp).toBe(999 - 29 * 8)
    expect(state.inventory).toEqual([{ itemId: '86', count: 0 }])
  })

  test('酒不足仍扣常规 MP，但不扣酒、不结算伤害或隐藏成长', () => {
    const state = playerCast(wineGod, 30, 0)
    expect(state.players[0]!.mp).toBe(29)
    expect(state.enemies[0]!.hp).toBe(999)
    expect(state.players[0]!.hiddenCounts.magicAttack).toBeUndefined()
    expect(state.log.some((line) => line.includes('物品不足,酒神 施放失败'))).toBe(true)
  })

  test('MP 不足时降级普攻且不消费酒；敌方施放不误用玩家 prepare 或背包门', () => {
    const insufficient = playerCast(wineGod, 0, 1)
    expect(insufficient.players[0]!.mp).toBe(0)
    expect(insufficient.inventory).toEqual([{ itemId: '86', count: 1 }])
    expect(insufficient.log.some((line) => line.includes('降级普攻'))).toBe(true)

    const hostile = enemyCast(wineGod)
    expect(hostile.players[0]!.mp).toBe(30)
    expect(hostile.inventory).toEqual([{ itemId: '86', count: 1 }])
    expect(hostile.players[0]!.hp).toBeLessThan(100)
  })
})
