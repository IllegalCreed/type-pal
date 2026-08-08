import type { ActorDef, CasualtyScript, EnemyDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  type CreatePlayerInput,
  createBattleState,
  shouldCheckPlayerCasualties,
  stepBattle,
} from './battle-core.js'

const rng0 = () => 0
const rngGate1 = () => 0.75 // roll 76 ≥ 75 → 门1
const rngGate2 = () => 0.68 // roll 69 ≥ 66 → 门2

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
      attackStrength: 10,
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
    mp: 50,
    maxMp: 50,
    attackStrength: 30,
    defense: 0,
    magicStrength: 30,
    baseDexterity: 50,
    skills: [],
    fleeRate: 20,
    ...over,
  }
}

function skill(id: string, effects: SkillData['effects']): SkillData {
  return {
    id,
    name: id,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects,
    animation: { effectSprite: 0 },
  }
}

function actor(id: string, casualty?: NonNullable<ActorDef['battler']>['casualty']): ActorDef {
  return {
    id,
    name: id,
    spriteId: id,
    ...(casualty
      ? {
          battler: {
            baseStats: {
              level: 1,
              hp: 100,
              maxHP: 100,
              mp: 50,
              maxMP: 50,
              attack: 30,
              defense: 0,
              magicAttack: 30,
              speed: 50,
              luck: 20,
            },
            initialEquipment: {},
            initialMagic: [],
            battleSprite: `battle-sprite.${id}`,
            casualty,
          },
        }
      : {}),
  }
}

const FRIEND_DEATH: CasualtyScript = {
  gates: [
    {
      chance: 75,
      branch: {
        lines: [{ text: 'dlg.g1', style: 'bottom' }],
        effects: [
          { kind: 'heal', resource: 'mp' },
          { kind: 'tempStatBuff', stat: 'magic', percent: 10 },
        ],
      },
    },
    {
      chance: 66,
      branch: {
        lines: [{ text: 'dlg.g2', style: 'bottom' }],
        effects: [
          { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
          { kind: 'tempStatBuff', stat: 'magic', percent: 25 },
        ],
      },
    },
    {
      chance: 50,
      branch: {
        lines: [{ text: 'dlg.g3', style: 'bottom' }],
        effects: [
          { kind: 'tempStatBuff', stat: 'speed', percent: 90 },
          { kind: 'tempStatBuff', stat: 'luck', percent: 90 },
        ],
      },
    },
  ],
  fallback: {
    lines: [{ text: 'dlg.fallback', style: 'bottom' }],
    effects: [
      { kind: 'heal', resource: 'hp' },
      { kind: 'tempStatBuff', stat: 'attack', percent: 5 },
    ],
  },
}

const DYING: CasualtyScript = {
  gates: [
    {
      chance: 75,
      branch: { lines: [{ text: 'dlg.d1', style: 'top' }], effects: [] },
    },
    {
      chance: 66,
      branch: { lines: [{ text: 'dlg.d2', style: 'top' }], effects: [] },
    },
    {
      chance: 50,
      branch: { lines: [{ text: 'dlg.d3', style: 'top' }], effects: [] },
    },
  ],
  fallback: { lines: [{ text: 'dlg.dying', style: 'top' }], effects: [] },
}

function runBattle(
  players: CreatePlayerInput[],
  options: {
    rng?: () => number
    auto?: boolean
    delta?: number
    actorsById?: Record<string, ActorDef>
  } = {},
): ReturnType<typeof createBattleState> {
  const rng = options.rng ?? rng0
  const attacker = enemy('caster', { dexterity: 999 })
  attacker.ai = {
    resistanceToSorcery: 0,
    // lowestHp 定标:不消费 RNG,保证命中测试想杀/想打濒死的队员。
    rules: [{ at: 'act', do: { kind: 'cast', skillId: 'hit', target: 'lowestHp' } }],
  }
  const state = createBattleState({
    players,
    enemies: [attacker],
    skills: {
      hit: skill('hit', [{ kind: 'resourceDelta', resource: 'hp', delta: options.delta ?? -150 }]),
    },
    actorsById: options.actorsById ?? {
      yue: actor('yue', { friendDeath: FRIEND_DEATH }),
      zhao: actor('zhao', { dying: DYING }),
      li: actor('li'),
      hero: actor('hero'),
    },
    auto: options.auto ?? false,
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  if (players.length > 1) state.pendingActions.set(1, { kind: 'defend' })
  let guard = 0
  do {
    stepBattle(state, rng)
  } while (state.phase === 'performAction' && ++guard < 60)
  return state
}

describe('B11-1 战斗伤亡 sweep', () => {
  test('队友阵亡:健康援护者跑 friendDeath 兜底(HP 满 + attack+5%)', () => {
    const state = runBattle([
      player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
      player({
        roleId: 'yue',
        actorTemplateId: 'yue',
        hp: 20,
        maxHp: 100,
        attackStrength: 100,
      }),
    ])
    const yue = state.players[1]!
    expect(state.players[0]!.hp).toBe(0)
    expect(yue.hp).toBe(100)
    expect(yue.attackStrength).toBe(105)
    expect(state.casualtyDialogue).toEqual({
      speakerRoleId: 'yue',
      lines: [{ text: 'dlg.fallback', style: 'bottom' }],
    })
    expect(yue.prevHp).toBe(100)
  })

  test('概率门按序掷:r≥75 命中门1(MP 满 + magic+10%)', () => {
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 50,
          maxHp: 100,
          mp: 10,
          maxMp: 100,
          magicStrength: 100,
        }),
      ],
      { rng: rngGate1 },
    )
    const yue = state.players[1]!
    expect(yue.mp).toBe(100)
    expect(yue.magicStrength).toBe(110)
    expect(state.casualtyDialogue?.lines[0]?.text).toBe('dlg.g1')
  })

  test('门2:r≥66 命中(attack+25% + magic+25%)', () => {
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 50,
          maxHp: 100,
          attackStrength: 100,
          magicStrength: 100,
        }),
      ],
      { rng: rngGate2 },
    )
    const yue = state.players[1]!
    expect(yue.attackStrength).toBe(125)
    expect(yue.magicStrength).toBe(125)
  })

  test('自己濒死:守护者在队且健康时跑 dying(纯对白)', () => {
    const state = runBattle(
      [
        player({
          roleId: 'zhao',
          actorTemplateId: 'zhao',
          hp: 105,
          maxHp: 500,
          coveredBy: 'li',
        }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -10 },
    )
    const zhao = state.players[0]!
    expect(zhao.hp).toBe(95)
    expect(state.casualtyDialogue?.speakerRoleId).toBe('zhao')
    expect(state.casualtyDialogue?.lines).toEqual([{ text: 'dlg.dying', style: 'top' }])
    expect(zhao.maxHp).toBe(500)
    expect(zhao.prevHp).toBe(95)
  })

  test('P2:maxHP>500 双阈值分叉各钉(600→dying 钳 100 / prevHp 阈值 120)', () => {
    // (a) prevHp=125 ≥ 120 但 hp=115 落 100~119 区间(dying 钳未到)→ 不触发
    const gap = runBattle(
      [
        player({ roleId: 'zhao', actorTemplateId: 'zhao', hp: 125, maxHp: 600, coveredBy: 'li' }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -10 },
    )
    expect(gap.casualtyDialogue).toBeUndefined()
    // (b) prevHp=110 < 120(未钳 raw maxHP/5)但 hp=90 已 dying → 不触发
    const rawPrev = runBattle(
      [
        player({ roleId: 'zhao', actorTemplateId: 'zhao', hp: 110, maxHp: 600, coveredBy: 'li' }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -20 },
    )
    expect(rawPrev.casualtyDialogue).toBeUndefined()
    // (c) prevHp=125 ≥ 120 且 hp=95 < 100 → 触发
    const hit = runBattle(
      [
        player({ roleId: 'zhao', actorTemplateId: 'zhao', hp: 125, maxHp: 600, coveredBy: 'li' }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -30 },
    )
    expect(hit.casualtyDialogue?.speakerRoleId).toBe('zhao')
  })

  test('P1:dying 目标被麻痹仍触发(只排 sleep/confused)', () => {
    const state = runBattle(
      [
        player({
          roleId: 'zhao',
          actorTemplateId: 'zhao',
          hp: 105,
          maxHp: 500,
          coveredBy: 'li',
          grantedStatuses: ['paralyzed'],
        }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -10 },
    )
    expect(state.casualtyDialogue?.speakerRoleId).toBe('zhao')
  })

  test('守护者失能被睡:濒死不触发', () => {
    const state = runBattle(
      [
        player({
          roleId: 'zhao',
          actorTemplateId: 'zhao',
          hp: 105,
          maxHp: 500,
          coveredBy: 'li',
        }),
        player({
          roleId: 'li',
          actorTemplateId: 'li',
          hp: 200,
          maxHp: 200,
          grantedStatuses: ['sleep'],
        }),
      ],
      { delta: -10 },
    )
    expect(state.casualtyDialogue).toBeUndefined()
  })

  test('自动战斗不触发伤亡脚本', () => {
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 20,
          maxHp: 100,
          attackStrength: 100,
        }),
      ],
      { auto: true },
    )
    expect(state.players[0]!.hp).toBe(0)
    expect(state.players[1]!.hp).toBe(20)
    expect(state.casualtyDialogue).toBeUndefined()
  })

  test('P3:同一 stat 连续 buff 以未 buff 基数为准(100 → 150,不叠加)', () => {
    const doubleAttack: CasualtyScript = {
      gates: [
        {
          chance: 75,
          branch: {
            lines: [{ text: 'dlg.x', style: 'bottom' }],
            effects: [
              { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
              { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
            ],
          },
        },
      ],
      fallback: { lines: [], effects: [] },
    }
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 50,
          maxHp: 100,
          attackStrength: 100,
        }),
      ],
      {
        rng: rngGate1,
        actorsById: {
          yue: actor('yue', { friendDeath: doubleAttack }),
          li: actor('li'),
          hero: actor('hero'),
          zhao: actor('zhao'),
        },
      },
    )
    expect(state.players[1]!.attackStrength).toBe(150)
  })

  test('P6:prevHp 防重入:未再次受伤不得重放 dying', () => {
    const state = runBattle(
      [
        player({ roleId: 'zhao', actorTemplateId: 'zhao', hp: 125, maxHp: 500, coveredBy: 'li' }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -10 },
    )
    const zhao = state.players[0]!
    const round = (): void => {
      state.pendingActions.set(0, { kind: 'defend' })
      state.pendingActions.set(1, { kind: 'defend' })
      let guard = 0
      do {
        stepBattle(state, rng0)
      } while (state.phase === 'performAction' && ++guard < 60)
    }
    const scriptLogs = (): number => state.log.filter((entry) => entry.includes('伤亡脚本')).length
    // runBattle 只打一下:125→115(未到 dying 钳 100,不触发)
    expect(zhao.hp).toBe(115)
    expect(state.casualtyDialogue).toBeUndefined()
    round() // 115→105 仍不触发
    expect(zhao.hp).toBe(105)
    expect(scriptLogs()).toBe(0)
    round() // 105→95:触发一次
    expect(zhao.hp).toBe(95)
    expect(state.casualtyDialogue?.speakerRoleId).toBe('zhao')
    expect(scriptLogs()).toBe(1)
    round() // 95→85:prevHp 已刷新为 95(< 未钳阈值 100),不再重放
    expect(zhao.hp).toBe(85)
    expect(state.log.filter((entry) => entry.includes('伤亡脚本')).length).toBe(1)
    expect(state.casualtyDialogue?.lines).toEqual([{ text: 'dlg.dying', style: 'top' }])
  })

  test('回合末毒死只刷新 prevHp，不触发 casualty 或消费其概率门', () => {
    const attacker = enemy('caster', { dexterity: 999 })
    attacker.ai = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'cast', skillId: 'hit', target: 'lowestHp' } }],
    }
    const state = createBattleState({
      players: [
        player({
          roleId: 'hero',
          actorTemplateId: 'li',
          hp: 2,
          maxHp: 100,
          coveredBy: 'yue',
          poisons: [{ poisonId: 555, tickIndex: 0 }],
        }),
        player({
          roleId: 'zhao',
          actorTemplateId: 'zhao',
          hp: 2,
          maxHp: 100,
          coveredBy: 'yue',
          poisons: [{ poisonId: 555, tickIndex: 0 }],
        }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 50, maxHp: 100 }),
        player({ roleId: 'yue', actorTemplateId: 'yue', hp: 50, maxHp: 100, attackStrength: 100 }),
      ],
      enemies: [attacker],
      skills: { hit: skill('hit', [{ kind: 'resourceDelta', resource: 'hp', delta: 0 }]) },
      poisonDefs: {
        555: {
          id: 555,
          name: '毒555',
          curability: 'severe',
          color: 0,
          playerTicks: [{ hpDelta: -2 }],
          enemyTicks: [{ hpDelta: -1 }],
        },
      },
      actorsById: {
        li: actor('li'),
        yue: actor('yue', { friendDeath: FRIEND_DEATH }),
        zhao: actor('zhao'),
        hero: actor('hero'),
      },
    })
    stepBattle(state, rng0)
    state.pendingActions.set(0, { kind: 'defend' })
    state.pendingActions.set(1, { kind: 'defend' })
    state.pendingActions.set(2, { kind: 'defend' })
    state.pendingActions.set(3, { kind: 'defend' })
    let guard = 0
    do {
      stepBattle(state, rng0)
    } while (state.phase === 'performAction' && ++guard < 60)
    expect(state.players[0]!.hp).toBe(0)
    expect(state.players[1]!.hp).toBe(0)
    expect(state.casualtyDialogue).toBeUndefined()
    expect(state.log.filter((entry) => entry.includes('伤亡脚本')).length).toBe(0)
    expect(state.players[0]!.prevHp).toBe(0)
    expect(state.players[1]!.prevHp).toBe(0)
  })

  test('玩家友伤致死不触发 casualty；只有敌方 attack/cast 是有效来源', () => {
    expect(shouldCheckPlayerCasualties({ side: 'enemy', idx: 0, kind: 'attack' })).toBe(true)
    expect(shouldCheckPlayerCasualties({ side: 'enemy', idx: 0, kind: 'cast' })).toBe(true)
    expect(shouldCheckPlayerCasualties({ side: 'player', idx: 0, kind: 'attackMate' })).toBe(false)
    expect(shouldCheckPlayerCasualties({ side: 'enemy', idx: 0, kind: 'transform' })).toBe(false)

    const attacker = enemy('caster', { attackStrength: -999, dexterity: 0 })
    const state = createBattleState({
      players: [
        player({
          roleId: 'confused',
          actorTemplateId: 'li',
          attackStrength: 999,
          baseDexterity: 999,
          grantedStatuses: ['confused'],
        }),
        player({ roleId: 'victim', actorTemplateId: 'zhao', hp: 1, coveredBy: 'yue' }),
        player({ roleId: 'yue', actorTemplateId: 'yue', hp: 100 }),
      ],
      enemies: [attacker],
      actorsById: {
        li: actor('li'),
        zhao: actor('zhao'),
        yue: actor('yue', { friendDeath: FRIEND_DEATH }),
      },
    })
    stepBattle(state, () => 0.5)
    state.pendingActions.set(1, { kind: 'defend' })
    state.pendingActions.set(2, { kind: 'defend' })
    let guard = 0
    do {
      stepBattle(state, () => 0.5)
    } while (state.phase === 'performAction' && ++guard < 60)
    expect(state.players[1]!.hp).toBe(0)
    expect(state.casualtyDialogue).toBeUndefined()
    expect(state.log.some((entry) => entry.includes('伤亡脚本'))).toBe(false)
  })
})

describe('敌方巫术下毒(结构化毒模型)', () => {
  const poison = (id: number, over: Partial<import('@type-pal/content').PoisonDef> = {}) => ({
    id,
    name: `毒${id}`,
    curability: 'severe' as const,
    color: 0,
    playerTicks: [{ hpDelta: -1 }],
    enemyTicks: [{ hpDelta: -1 }],
    ...over,
  })

  function enemyCastPoison(
    playerOver: Partial<CreatePlayerInput> & {
      poisons?: { poisonId: number; tickIndex: number }[]
    },
    poisonId = '555',
  ) {
    const attacker = enemy('caster', { dexterity: 999 })
    attacker.ai = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'cast', skillId: 'gu', target: 'lowestHp' } }],
    }
    const state = createBattleState({
      players: [player({ hp: 100, maxHp: 100, ...playerOver })],
      enemies: [attacker],
      skills: {
        gu: {
          id: 'gu',
          name: '蛊术',
          desc: '',
          cost: {},
          usableOutsideBattle: false,
          target: 'oneEnemy',
          effects: [{ kind: 'applyPoison', poisonId }],
          animation: { effectSprite: 0 },
          execution: {
            enemy: { effects: [{ kind: 'applyPoison', poisonId }] },
          },
        },
      },
      poisonDefs: {
        555: poison(555, { counters: 557, lethalWith: 558 }),
        557: poison(557),
        558: poison(558),
      },
    })
    stepBattle(state, rng0)
    state.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    do {
      stepBattle(state, rng0)
    } while (state.phase === 'performAction' && ++guard < 60)
    return state
  }

  test('巫术下毒是普通 0x29:不触发 lethalWith 双毒暴毙', () => {
    const state = enemyCastPoison({ poisons: [{ poisonId: 558, tickIndex: 0 }] })
    // 无双毒暴毙(回合末 558 毒 tick 扣了 2 点,但远没到 0);新毒 555 叠上。
    expect(state.players[0]!.hp).toBeGreaterThan(0)
    expect(state.players[0]!.poisons.map((p) => p.poisonId)).toContain(555)
  })

  test('巫术下毒不触发 counters 相克解,直接叠新毒', () => {
    const state = enemyCastPoison({ poisons: [{ poisonId: 557, tickIndex: 0 }] })
    expect(state.players[0]!.poisons.map((p) => p.poisonId).sort()).toEqual([555, 557])
  })

  test('毒抗门:毒抗 ≥ R(1,100) 抵抗,不加毒', () => {
    const state = enemyCastPoison({ poisonRes: 100 })
    expect(state.players[0]!.poisons).toEqual([])
  })
})
