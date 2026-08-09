/**
 * BattleSession 表现层钩子测试(M4d-3)—— headless tick 驱动,假 SfxPlayer 记录调用。
 * 只验「时机 → play(id)」接线;真实解码/发声浏览器验。
 */
import type {
  ActivePoison,
  BattleSpriteDef,
  CharacterInstance,
  EnemyBattleSpriteProfile,
  EnemyDef,
  PlayerFighterBattleSpriteProfile,
  WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { GlyphTable, LoadedBattleSpriteDefinition } from '../assets.js'
import { type SfxPlayer, SfxReadinessBudgetError, SfxReadinessResourceError } from '../audio/sfx.js'
import { collectTurnActionSounds } from '../audio/sfx-readiness.js'
import { expectDefined } from '../defined.js'
import type { AnimFrame } from './battle-anim.js'
import type { BattlePlayerState, BattleWorldMutation, CreatePlayerInput } from './battle-core.js'
import type { BattleLastAction } from './battle-last-action.js'
import {
  type BattleReadinessErrorContext,
  BattleSession,
  type BattleSessionAssets,
  type BattleTurnReadinessSnapshot,
} from './battle-session.js'

function mkEnemy(
  id: string,
  o: Partial<EnemyDef['stats']> = {},
  extra: Partial<EnemyDef> = {},
): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 30,
      level: 1,
      exp: 5,
      cash: 3,
      attackStrength: 20,
      magicStrength: 0,
      defense: 10,
      dexterity: 10,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...o,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {
      attack: 'sound.pal.355',
      action: 'sound.pal.300',
      death: 'sound.pal.030',
      call: 'sound.pal.002',
    },
    ...extra,
  }
}
const player = (roleId: string, o: Partial<BattlePlayerState> = {}): CreatePlayerInput => ({
  roleId,
  actorTemplateId: roleId,
  hp: 100,
  maxHp: 100,
  mp: 30,
  maxMp: 30,
  attackStrength: 40,
  defense: 30,
  magicStrength: 20,
  baseDexterity: 50,
  skills: [],
  fleeRate: 20,
  ...o,
})

const stubGlyphs = { has: () => false, get: () => undefined } as unknown as GlyphTable

const PLAYER_PROFILE: PlayerFighterBattleSpriteProfile = {
  kind: 'player-fighter',
  frames: {
    idle: 0,
    dying: 1,
    dead: 2,
    defend: 3,
    hurt: 4,
    preMagic: 5,
    magic: 6,
    attackWindup: 7,
    attackRush: 8,
    attackStrike: 9,
    steal: 10,
  },
  castEffectBase: -1,
  attackEffectBase: -1,
}

function enemyProfile(definitionId: string): EnemyBattleSpriteProfile {
  const magicCount = definitionId.endsWith('.magic') ? 1 : 0
  return {
    kind: 'enemy',
    idle: { start: 0, count: 2 },
    magic: { start: 2, count: magicCount },
    attack: { start: 2 + magicCount, count: 2 },
    idleTicksPerFrame: 5,
    actTicksPerFrame: 1,
  }
}

function loadedBattleSprite(
  id: string,
  profile: BattleSpriteDef['profile'],
): LoadedBattleSpriteDefinition {
  return {
    definition: { id, label: id, asset: `asset.${id}`, profile },
    sprite: {
      frames: Array.from({ length: 11 }, () => ({})),
      anchorX: 0,
      anchorY: 0,
      profile: 'canonical',
      decode: { declaredSlots: 11, trailingSentinel: false, skippedLegacyTailSlots: 0 },
    },
  } as unknown as LoadedBattleSpriteDefinition
}

function mockBattleAssets(
  enemies: readonly EnemyDef[],
  playerCount: number,
): Pick<BattleSessionAssets, 'battleSprites' | 'playerBaseDefinitionIds'> {
  const playerId = 'battle-sprite.player'
  const entries: Array<[string, LoadedBattleSpriteDefinition]> = [
    [playerId, loadedBattleSprite(playerId, PLAYER_PROFILE)],
  ]
  for (const enemy of enemies)
    entries.push([
      enemy.battleSprite,
      loadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite)),
    ])
  return {
    battleSprites: new Map(entries),
    playerBaseDefinitionIds: Array.from({ length: playerCount }, () => playerId),
  }
}

function makeSession(
  enemy: EnemyDef,
  playerOverrides: Partial<BattlePlayerState> = {},
  extraOpts: NonNullable<ConstructorParameters<typeof BattleSession>[5]> = {},
  extraAssets: Partial<BattleSessionAssets> = {},
) {
  const plays: string[] = []
  const sfx = { play: (asset: string) => plays.push(asset) } as unknown as SfxPlayer
  const assets: BattleSessionAssets = {
    palette: { colors: [], cycles: [] } as unknown as import('@type-pal/shared').Palette,
    glyphs: stubGlyphs,
    ...mockBattleAssets([enemy], 1),
    sfx,
    ...extraAssets,
  }
  const session = new BattleSession(
    [player('li', playerOverrides)],
    [enemy],
    assets,
    (id) => id,
    () => 0,
    extraOpts,
  )
  return { session, plays }
}

function makePlayersSession(
  players: CreatePlayerInput[],
  enemy: EnemyDef,
  extraOpts: NonNullable<ConstructorParameters<typeof BattleSession>[5]> = {},
) {
  const assets: BattleSessionAssets = {
    palette: { colors: [], cycles: [] } as unknown as import('@type-pal/shared').Palette,
    glyphs: stubGlyphs,
    ...mockBattleAssets([enemy], players.length),
  }
  return new BattleSession(
    players,
    [enemy],
    assets,
    (id) => id,
    () => 0,
    extraOpts,
  )
}

/** 空格确认两下(菜单默认攻击 → 选敌确认),再空跑 N 个 acting tick。 */
function driveOneRound(session: BattleSession, ticks = 12): void {
  session.tick(16, new Set([' ']))
  session.tick(16, new Set([' ']))
  for (let i = 0; i < ticks; i++) session.tick(500, new Set())
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('B10 敌人混乱攻击同伴表现路由', () => {
  test('读取 lastAction 完整 overkill 数字并走专用 12 段 timeline，不落普通敌物攻音', () => {
    const attacker = mkEnemy('confused-attacker', {
      health: 500,
      attackStrength: 100,
      dexterity: 999,
    })
    const target = mkEnemy('confused-target', { health: 30 })
    const assets: BattleSessionAssets = {
      palette: { colors: [], cycles: [] } as unknown as import('@type-pal/shared').Palette,
      glyphs: stubGlyphs,
      ...mockBattleAssets([attacker, target], 1),
    }
    const session = new BattleSession(
      [player('hero')],
      [attacker, null, target],
      assets,
      (id) => id,
      () => 0,
    )
    const internal = session as unknown as {
      state: {
        players: Array<{ hp: number }>
        enemies: Array<{ hp: number; def: EnemyDef } | null>
      }
      buildStepTimeline(
        action: BattleLastAction | null,
        playerHp: number[],
        enemyHp: number[],
        playerAppearances: readonly string[],
        enemyAppearances: readonly string[],
      ): AnimFrame[] | null
    }
    internal.state.enemies[2]!.hp = 0
    const beforeEnemyHp = [attacker.stats.health, 0, target.stats.health, 0, 0]
    const appearances = [attacker.battleSprite, '', target.battleSprite, '', '']
    const attackMate = internal.buildStepTimeline(
      {
        side: 'enemy',
        idx: 0,
        kind: 'attackMate',
        targetEnemyIdx: 2,
        damage: 777,
      },
      [100],
      beforeEnemyHp,
      ['battle-sprite.player'],
      appearances,
    )
    expect(attackMate).toHaveLength(12)
    expect(attackMate?.[3]?.overlays?.[0]).toMatchObject({ sheet: 'effect', frameIdx: 9 })
    expect(attackMate?.[6]?.damageNum).toEqual({
      target: { side: 'enemy', idx: 2 },
      value: 777,
    })
    expect(attackMate?.every((frame) => frame.sound === undefined)).toBe(true)

    const ordinary = internal.buildStepTimeline(
      { side: 'enemy', idx: 0, kind: 'attack', targetPlayerIdx: 0 },
      [100],
      beforeEnemyHp,
      ['battle-sprite.player'],
      appearances,
    )
    expect(ordinary?.some((frame) => frame.sound !== undefined)).toBe(true)
  })
})

describe('梦蛇 active BattleSpriteDef 生命周期', () => {
  test('施放后图与 profile 同源，死亡→复活保持，新战斗恢复基础形象', async () => {
    // 一阶段真值：docs/phase1/game-mechanics.md:1234-1248。
    const enemy = mkEnemy('trance-lifecycle', {
      health: 999,
      defense: 999,
      attackStrength: 0,
    })
    const tranceId = 'battle-sprite.player.dream-snake'
    const tranceProfile: PlayerFighterBattleSpriteProfile = {
      kind: 'player-fighter',
      frames: {
        idle: 10,
        dying: 9,
        dead: 8,
        defend: 7,
        hurt: 6,
        preMagic: 5,
        magic: 4,
        attackWindup: 3,
        attackRush: 2,
        attackStrike: 1,
        steal: 0,
      },
      castEffectBase: 123,
      attackEffectBase: 456,
    }
    const tranceSkill = {
      id: 'dream-snake',
      name: '梦蛇',
      desc: '',
      cost: { mp: 0 },
      usableOutsideBattle: false,
      target: 'self' as const,
      effects: [{ kind: 'trance' as const, battleSprite: tranceId }],
      animation: { effectSprite: 0 },
    }
    const baseAssets = mockBattleAssets([enemy], 1)
    const battleSprites = new Map(baseAssets.battleSprites)
    battleSprites.set(tranceId, loadedBattleSprite(tranceId, tranceProfile))
    const extraAssets = { ...baseAssets, battleSprites }
    const extraOpts = { skills: { [tranceSkill.id]: tranceSkill } }
    const { session } = makeSession(
      enemy,
      { skills: [tranceSkill.id], attackStrength: 0 },
      extraOpts,
      extraAssets,
    )
    const internal = session as unknown as {
      state: { players: BattlePlayerState[] }
      visual: { players: Array<{ frame: number }> }
      playerAppearance(index: number): LoadedBattleSpriteDefinition
      resetVisual(): void
    }

    session.tick(16, new Set(['ArrowLeft']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set())
    await flushPromises()
    for (let i = 0; i < 160 && !internal.state.players[0]?.tranceBattleSprite; i++) {
      session.tick(500, new Set())
      await flushPromises()
    }

    expect(internal.state.players[0]?.tranceBattleSprite).toBe(tranceId)
    expect(internal.playerAppearance(0).definition.id).toBe(tranceId)
    expect(internal.playerAppearance(0).definition.profile).toEqual(tranceProfile)

    internal.state.players[0]!.hp = 0
    internal.resetVisual()
    expect(internal.playerAppearance(0).definition.id).toBe(tranceId)
    expect(internal.visual.players[0]?.frame).toBe(tranceProfile.frames.dead)
    internal.state.players[0]!.hp = internal.state.players[0]!.maxHp
    internal.resetVisual()
    expect(internal.playerAppearance(0).definition.id).toBe(tranceId)
    expect(internal.visual.players[0]?.frame).toBe(tranceProfile.frames.idle)

    const { session: fresh } = makeSession(
      enemy,
      { skills: [tranceSkill.id], attackStrength: 0 },
      extraOpts,
      extraAssets,
    )
    const freshInternal = fresh as unknown as {
      state: { players: BattlePlayerState[] }
      playerAppearance(index: number): LoadedBattleSpriteDefinition
    }
    expect(freshInternal.state.players[0]?.tranceBattleSprite).toBeUndefined()
    expect(freshInternal.playerAppearance(0).definition.id).toBe('battle-sprite.player')
    expect(freshInternal.playerAppearance(0).definition.profile).toEqual(PLAYER_PROFILE)
  })
})

/** 默认攻击提交完成；第三拍命中唯一的“全填”屏障插点。 */
function submitDefaultAttack(session: BattleSession): void {
  session.tick(16, new Set([' ']))
  session.tick(16, new Set([' ']))
  session.tick(16, new Set())
}

describe('A7-1 战斗回合 SFX readiness 屏障', () => {
  test('全员交招后只准备一次；pending 锁住 Enter/Escape，resolve 后才进入行动', async () => {
    const gate = deferred<void>()
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const { session } = makeSession(
      mkEnemy('barrier', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 1 },
      {
        prepareTurnSounds: (snapshot) => {
          snapshots.push(snapshot)
          return gate.promise
        },
      },
    )

    submitDefaultAttack(session)
    expect(snapshots).toHaveLength(1)
    expect([...expectDefined(snapshots[0]).actions.values()]).toEqual([
      { kind: 'attack', targetEnemyIdx: 0 },
    ])
    expect(session.debugReadiness()).toEqual({ phase: 'preparing' })
    expect(session.debugLog()).toEqual([])

    session.tick(500, new Set(['Enter']))
    session.tick(500, new Set(['Escape']))
    session.tick(500, new Set())
    expect(snapshots).toHaveLength(1)
    expect(session.debugLog()).toEqual([])

    gate.resolve()
    await flushPromises()
    expect(session.debugReadiness()).toEqual({ phase: 'acting' })
    session.tick(500, new Set())
    expect(session.debugLog().some((line) => line.includes('攻击 barrier'))).toBe(true)
  })

  test('快照同时携带玩家与敌人活跃毒，且 auto 也经过同一个屏障', () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const { session } = makeSession(
      mkEnemy('poisoned', { health: 999, attackStrength: 0 }),
      { poisons: [{ poisonId: 561, tickIndex: 2 }] },
      {
        auto: true,
        prepareTurnSounds: (snapshot) => {
          snapshots.push(snapshot)
          return new Promise<void>(() => {})
        },
      },
    )
    const state = (session as unknown as { state: { enemies: Array<{ poisons: ActivePoison[] }> } })
      .state
    expectDefined(state.enemies[0]).poisons.push({ poisonId: 561, tickIndex: 4 })

    session.tick(16, new Set()) // auto 填真实动作
    session.tick(16, new Set()) // 全填 → readiness
    expect(snapshots).toHaveLength(1)
    expect(expectDefined(snapshots[0]).activePlayerPoisons).toEqual([
      { poisonId: 561, tickIndex: 2 },
    ])
    expect(expectDefined(snapshots[0]).activeEnemyPoisons).toEqual([
      { poisonId: 561, tickIndex: 4 },
    ])
  })

  test('资源失败只报告一次并在 allSettled 后降级继续行动', async () => {
    const reports: Array<{ error: Error; context: BattleReadinessErrorContext }> = []
    const resourceError = new SfxReadinessResourceError([new Error('missing.wav')])
    const { session } = makeSession(
      mkEnemy('degraded', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 1 },
      {
        prepareTurnSounds: async () => {
          throw resourceError
        },
        reportReadinessError: (error, context) => reports.push({ error, context }),
      },
    )

    submitDefaultAttack(session)
    await flushPromises()
    expect(reports).toEqual([{ error: resourceError, context: { turn: 1, fatal: false } }])
    expect(session.debugReadiness()).toEqual({ phase: 'acting' })
  })

  test('超预算停在可见 fatal 态，绝不进入行动；确认后以原错误退出', async () => {
    const reports: Array<{ error: Error; context: BattleReadinessErrorContext }> = []
    const budgetError = new SfxReadinessBudgetError(65, 64)
    const { session } = makeSession(
      mkEnemy('fatal', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 1 },
      {
        prepareTurnSounds: async () => {
          throw budgetError
        },
        reportReadinessError: (error, context) => reports.push({ error, context }),
      },
    )

    submitDefaultAttack(session)
    await flushPromises()
    expect(reports).toEqual([{ error: budgetError, context: { turn: 1, fatal: true } }])
    expect(session.debugReadiness()).toEqual({
      phase: 'readinessError',
      error: budgetError.message,
    })
    session.tick(500, new Set())
    expect(session.debugLog()).toEqual([])

    const rejected = expect(session.done).rejects.toBe(budgetError)
    session.tick(16, new Set(['Enter']))
    await rejected
  })

  test('pending 后取消会作废旧 token；迟到 resolve 不得推进 core', async () => {
    const gate = deferred<void>()
    const { session } = makeSession(
      mkEnemy('cancelled', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 1 },
      { prepareTurnSounds: () => gate.promise },
    )
    submitDefaultAttack(session)
    const rejected = expect(session.done).rejects.toMatchObject({ name: 'AbortError' })
    session.cancel()
    gate.resolve()
    await flushPromises()
    await rejected
    expect(session.debugLog()).toEqual([])
  })

  test.each([
    { label: 'F 强行', key: 'f' },
    { label: 'R 重复（无上轮动作时退化普攻）', key: 'r' },
    { label: 'A 自动', key: 'a' },
  ])('$label 的粘滞补齐也汇入唯一屏障', ({ key }) => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const session = makePlayersSession(
      [player('li'), player('ling')],
      mkEnemy('shortcut', { health: 999, defense: 999, attackStrength: 0 }),
      {
        prepareTurnSounds: (snapshot) => {
          snapshots.push(snapshot)
          return new Promise<void>(() => {})
        },
      },
    )

    session.tick(16, new Set([key])) // 队员 0 提交并开启本轮粘滞
    session.tick(16, new Set()) // 队员 1 由粘滞自动补齐
    session.tick(16, new Set()) // 全填 → 唯一屏障

    expect(snapshots).toHaveLength(1)
    expect([...expectDefined(snapshots[0]).actions.values()]).toEqual([
      { kind: 'attack', targetEnemyIdx: 0 },
      { kind: 'attack', targetEnemyIdx: 0 },
    ])
  })

  test('合击消费其余队员后仍先冻结完整动作快照，再进入行动', () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const coop = {
      id: 'coop',
      name: '合击',
      desc: '',
      cost: { mp: 0 },
      usableOutsideBattle: false,
      target: 'allEnemies' as const,
      effects: [{ kind: 'damage' as const, power: 1, elemental: 0 }],
      animation: { effectSprite: 0, effectTimes: 1 },
    }
    const session = makePlayersSession(
      [{ ...player('li'), cooperativeMagicSkillId: coop.id }, player('ling')],
      mkEnemy('coop-target', { health: 999, defense: 999, attackStrength: 0 }),
      {
        skills: { [coop.id]: coop },
        prepareTurnSounds: (snapshot) => {
          snapshots.push(snapshot)
          return new Promise<void>(() => {})
        },
      },
    )

    session.tick(16, new Set(['ArrowRight']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set())

    expect(snapshots).toHaveLength(1)
    expect([...expectDefined(snapshots[0]).actions.entries()]).toEqual([
      [0, { kind: 'coop' }],
      [1, { kind: 'attack', targetEnemyIdx: -1 }],
    ])
  })

  test('无菜单队员与敌先手也不得绕过屏障', async () => {
    const gate = deferred<void>()
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const session = makePlayersSession(
      [{ ...player('sleepy', { baseDexterity: 1 }), grantedStatuses: ['sleep'] }],
      mkEnemy('fast-enemy', {
        health: 999,
        defense: 999,
        attackStrength: 1,
        dexterity: 999,
      }),
      {
        prepareTurnSounds: (snapshot) => {
          snapshots.push(snapshot)
          return gate.promise
        },
      },
    )

    session.tick(16, new Set())
    expect(snapshots).toHaveLength(1)
    expect(expectDefined(snapshots[0]).actions.size).toBe(0)
    expect(session.debugLog()).toEqual([])

    gate.resolve()
    await flushPromises()
    session.tick(500, new Set())
    expect(session.debugLog()[0]).toContain('fast-enemy 攻击 sleepy')
  })

  test('done 已 resolve 时，迟到的屏障回调不得再推进 core', async () => {
    const gate = deferred<void>()
    const { session } = makeSession(
      mkEnemy('already-done', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 1 },
      { prepareTurnSounds: () => gate.promise },
    )
    submitDefaultAttack(session)
    ;(
      session as unknown as {
        complete(result: 'win' | 'lose' | 'flee'): void
      }
    ).complete('win')
    await expect(session.done).resolves.toBe('win')

    gate.resolve()
    await flushPromises()
    expect(session.debugLog()).toEqual([])
  })

  test('跨轮重新拍摄毒指针，次轮屏障不复用首轮快照', async () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const { session } = makeSession(
      mkEnemy('poison-round', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 0, poisons: [{ poisonId: 561, tickIndex: 0 }] },
      {
        auto: true,
        poisonDefs: {
          561: {
            id: 561,
            name: '递进毒',
            curability: 'incurable',
            color: 0,
            playerTicks: [{ hpDelta: -1 }, { hpDelta: -1 }],
          },
        },
        prepareTurnSounds: async (snapshot) => {
          snapshots.push(snapshot)
        },
      },
    )

    for (let i = 0; i < 120 && snapshots.length < 2; i++) {
      session.tick(500, new Set())
      await flushPromises()
    }

    expect(snapshots).toHaveLength(2)
    expect(expectDefined(snapshots[0]).activePlayerPoisons).toEqual([
      { poisonId: 561, tickIndex: 0 },
    ])
    expect(expectDefined(snapshots[1]).activePlayerPoisons).toEqual([
      { poisonId: 561, tickIndex: 1 },
    ])
  })

  test('R 真实重复技能：次轮重提同一 cast，并重新枚举其动画音', async () => {
    const repeatSkill = {
      id: 'repeat-skill',
      name: '重复法术',
      desc: '',
      cost: { mp: 0 },
      usableOutsideBattle: false,
      target: 'allEnemies' as const,
      effects: [{ kind: 'damage' as const, power: 0, elemental: 0 }],
      animation: { effectSprite: 0, effectTimes: 1, sound: 'sound.repeat-skill' },
    }
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const worksets: Set<string>[] = []
    const { session } = makeSession(
      mkEnemy('repeat-target', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 0, skills: [repeatSkill.id] },
      {
        skills: { [repeatSkill.id]: repeatSkill },
        prepareTurnSounds: async (snapshot) => {
          snapshots.push(snapshot)
          worksets.push(
            collectTurnActionSounds({
              pendingActions: snapshot.actions.values(),
              activePlayerPoisons: snapshot.activePlayerPoisons,
              activeEnemyPoisons: snapshot.activeEnemyPoisons,
              skills: { [repeatSkill.id]: repeatSkill },
              itemsById: {},
            }),
          )
        },
      },
    )

    session.tick(16, new Set(['ArrowLeft']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set())
    await flushPromises()
    const internal = session as unknown as { state: { turn: number } }
    for (let i = 0; i < 160 && internal.state.turn < 2; i++) {
      session.tick(500, new Set())
      await flushPromises()
    }
    expect(internal.state.turn).toBe(2)

    session.tick(16, new Set(['r']))
    session.tick(16, new Set())

    expect(snapshots).toHaveLength(2)
    expect(expectDefined(snapshots[1]).turn).toBe(2)
    expect([...expectDefined(snapshots[1]).actions.values()]).toEqual([
      { kind: 'cast', skillId: repeatSkill.id },
    ])
    expect(expectDefined(worksets[1]).has('sound.repeat-skill')).toBe(true)
  })

  test('本轮施毒进入次轮活跃毒快照，普通攻击轮仍枚举后续产物音', async () => {
    const poisonId = 701
    const cocoon = {
      id: 'cocoon',
      name: '蛊产物',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'self' as const,
        consuming: true,
        effects: [],
        sound: 'sound.cocoon',
      },
    }
    const poisonDefs = {
      [poisonId]: {
        id: poisonId,
        name: '跨轮毒',
        curability: 'incurable' as const,
        color: 0,
        enemyTicks: [{}, { grantItem: cocoon.id }],
      },
    }
    const venom = {
      id: 'venom',
      name: '施毒术',
      desc: '',
      cost: { mp: 0 },
      usableOutsideBattle: false,
      target: 'allEnemies' as const,
      effects: [{ kind: 'applyPoison' as const, poisonId: String(poisonId) }],
      animation: { effectSprite: 0, effectTimes: 1 },
    }
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const worksets: Set<string>[] = []
    const { session } = makeSession(
      mkEnemy(
        'poison-target',
        { health: 999, defense: 999, attackStrength: 0 },
        {
          ai: { resistanceToSorcery: 0 },
        },
      ),
      { attackStrength: 0, skills: [venom.id] },
      {
        skills: { [venom.id]: venom },
        items: { [cocoon.id]: cocoon },
        poisonDefs,
        prepareTurnSounds: async (snapshot) => {
          snapshots.push(snapshot)
          worksets.push(
            collectTurnActionSounds({
              pendingActions: snapshot.actions.values(),
              activePlayerPoisons: snapshot.activePlayerPoisons,
              activeEnemyPoisons: snapshot.activeEnemyPoisons,
              skills: { [venom.id]: venom },
              itemsById: { [cocoon.id]: cocoon },
              poisonDefs,
            }),
          )
        },
      },
    )

    session.tick(16, new Set(['ArrowLeft']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set())
    await flushPromises()
    const internal = session as unknown as { state: { turn: number } }
    for (let i = 0; i < 160 && internal.state.turn < 2; i++) {
      session.tick(500, new Set())
      await flushPromises()
    }
    expect(internal.state.turn).toBe(2)
    submitDefaultAttack(session)

    expect(snapshots).toHaveLength(2)
    expect(expectDefined(worksets[0]).has('sound.cocoon')).toBe(true)
    expect(expectDefined(snapshots[1]).activeEnemyPoisons).toEqual([{ poisonId, tickIndex: 1 }])
    expect([...expectDefined(snapshots[1]).actions.values()]).toEqual([
      { kind: 'attack', targetEnemyIdx: 0 },
    ])
    expect(expectDefined(worksets[1]).has('sound.cocoon')).toBe(true)
  })
})

describe('M4d-3/M4d-2 战斗音效接线(时间线帧挂载)', () => {
  test('敌人物攻 → 时间线播 action(接近)+ call(命中)音', () => {
    // 玩家打不死敌(高防高血),敌必反击
    const { session, plays } = makeSession(
      mkEnemy('tank', { health: 999, defense: 999, attackStrength: 10 }),
      { attackStrength: 1 },
    )
    driveOneRound(session)
    expect(plays).toContain('sound.pal.300') // action(fixture)
    expect(plays).toContain('sound.pal.002') // call
  })

  test('击杀敌人 → 播 sounds.death', () => {
    const { session, plays } = makeSession(mkEnemy('slime', { health: 10, defense: 0 }), {
      attackStrength: 400,
    })
    driveOneRound(session)
    expect(plays).toContain('sound.pal.030')
  })

  test('遭遇 choreography playSound → 直接播(encounter 绑定,非敌种)', () => {
    const enemy = mkEnemy('bard', { health: 999, defense: 999 })
    const { session, plays } = makeSession(
      enemy,
      { attackStrength: 1 },
      {
        encounterChoreo: [
          { at: 'battleStart', body: [{ kind: 'playSound', asset: 'sound.pal.077' }] },
        ],
      },
    )
    session.tick(16, new Set()) // battleStart 演出:collect + pump(playSound 无横幅,直接消费)
    expect(plays).toContain('sound.pal.077')
  })

  test('未来 choreography action 未接 runtime 时 fail-loud', () => {
    const { session } = makeSession(mkEnemy('unknown-choreography'))
    const internal = session as unknown as {
      executeBattleChoreographyAction(action: unknown): void
    }
    expect(() => internal.executeBattleChoreographyAction({ kind: '__future_action__' })).toThrow(
      'battle choreography: 未处理 action',
    )
  })

  test.each([
    {
      label: '负 magic',
      sounds: { magic: 'sound.enemy-cast', suppressMagicEffectSound: true },
      enemyCast: true,
      skillEffect: false,
    },
    {
      label: '正 magic',
      sounds: { magic: 'sound.enemy-cast' },
      enemyCast: true,
      skillEffect: true,
    },
    { label: '零 magic', sounds: {}, enemyCast: false, skillEffect: true },
  ])('$label 语义显式区分敌吟唱音与技能特效音', ({ sounds, enemyCast, skillEffect }) => {
    const magic = {
      id: 'enemy-magic',
      name: '敌法',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy' as const,
      effects: [{ kind: 'damage' as const, power: 1, elemental: 0 }],
      animation: {
        effectSprite: 1,
        effectTimes: 1,
        sound: 'sound.skill-effect',
      },
    }
    const caster = mkEnemy(
      'caster',
      { health: 999, defense: 999, dexterity: 999 },
      {
        ai: {
          resistanceToSorcery: 5,
          rules: [{ at: 'act', do: { kind: 'cast', skillId: magic.id } }],
        },
        battleSprite: 'battle-sprite.enemy.magic',
        sounds,
      },
    )
    const fireSprite = {
      frames: [{}],
      anchorX: 0,
      anchorY: 0,
    } as unknown as import('../assets.js').LoadedSprite
    const { session, plays } = makeSession(
      caster,
      { attackStrength: 1, defense: 999 },
      { skills: { [magic.id]: magic } },
      { fireSprites: { 1: fireSprite } },
    )
    driveOneRound(session, 30)
    expect(plays.includes('sound.enemy-cast')).toBe(enemyCast)
    expect(plays.includes('sound.skill-effect')).toBe(skillEffect)
  })

  test('玩家物品门熄火：保留 PreMagic 吟唱音，但不播技能效果音或结算伤害', () => {
    const magic = {
      id: 'gu-fizzle',
      name: '蛊术',
      desc: '',
      cost: { mp: 5, items: [{ itemId: '148', amount: 1 }] },
      usableOutsideBattle: false,
      target: 'allEnemies' as const,
      effects: [{ kind: 'damage' as const, power: 999, elemental: 0 }],
      animation: {
        effectSprite: 1,
        effectTimes: 1,
        sound: 'sound.skill-effect',
      },
    }
    const enemy = mkEnemy('fizzle-target', {
      health: 999,
      defense: 999,
      attackStrength: 0,
    })
    const fireSprite = {
      frames: [{}],
      anchorX: 0,
      anchorY: 0,
    } as unknown as import('../assets.js').LoadedSprite
    const { session, plays } = makeSession(
      enemy,
      { attackStrength: 0, skills: [magic.id] },
      {
        skills: { [magic.id]: magic },
        inventory: [],
        playerSounds: [{ magic: 'sound.player-cast' }],
      },
      { fireSprites: { 1: fireSprite } },
    )
    const internal = session as unknown as {
      state: {
        players: BattlePlayerState[]
        enemies: Array<{ hp: number }>
        inventory: Array<{ itemId: string; count: number }>
      }
    }

    session.tick(16, new Set(['ArrowLeft']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 40; i++) session.tick(500, new Set())

    expect(internal.state.players[0]!.mp).toBe(25)
    expect(internal.state.enemies[0]!.hp).toBe(999)
    expect(internal.state.inventory).toEqual([])
    expect(plays).toContain('sound.player-cast')
    expect(plays).not.toContain('sound.skill-effect')
    expect(session.debugLog().some((line) => line.includes('物品不足,蛊术 施放失败'))).toBe(true)
  })

  test('用品显式声音优先于 role；投掷链消费自己的声音', () => {
    const item = {
      id: 'sound-item',
      name: '响铃',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'self' as const,
        consuming: true,
        effects: [{ kind: 'healHp' as const, amount: 1 }],
        sound: 'sound.item-explicit',
      },
      throw: {
        target: 'oneEnemy' as const,
        effects: [
          {
            kind: 'currentHpDamage' as const,
            numerator: 1,
            denominator: 2,
            bonus: 1,
            cap: 1000,
          },
        ],
        sound: 'sound.item-throw',
        presentation: {
          kind: 'magic' as const,
          animation: {
            effectSprite: 24,
            placement: 'normal' as const,
            xOffset: -12,
            layerOffset: 1,
            speed: -1,
            effectTimes: 0,
            sound: 'sound.item-fire',
          },
        },
      },
    }
    const opts = {
      items: { [item.id]: item },
      inventory: [{ itemId: item.id, count: 2 }],
      soundRoles: { 'audio.battleItemUseSound': 'sound.item-role' } as const,
    }
    const using = makeSession(
      mkEnemy('use-target', { health: 999, defense: 999, attackStrength: 0 }),
      { hp: 50, attackStrength: 1 },
      opts,
    )
    using.session.tick(16, new Set())
    using.session.tick(16, new Set(['e']))
    using.session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 30; i++) using.session.tick(500, new Set())
    expect(using.plays).toContain('sound.item-explicit')
    expect(using.plays).not.toContain('sound.item-role')

    const { sound: _explicitSound, ...useWithoutSound } = item.use
    const roleOnlyItem = { ...item, use: useWithoutSound }
    const roleOnly = makeSession(
      mkEnemy('role-target', { health: 999, defense: 999, attackStrength: 0 }),
      { hp: 50, attackStrength: 1 },
      {
        items: { [roleOnlyItem.id]: roleOnlyItem },
        inventory: [{ itemId: roleOnlyItem.id, count: 1 }],
        soundRoles: { 'audio.battleItemUseSound': 'sound.item-role' },
      },
    )
    roleOnly.session.tick(16, new Set())
    roleOnly.session.tick(16, new Set(['e']))
    roleOnly.session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 30; i++) roleOnly.session.tick(500, new Set())
    expect(roleOnly.plays).toContain('sound.item-role')

    const throwing = makeSession(
      mkEnemy('throw-target', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 1 },
      opts,
      {
        fireSprites: {
          24: {
            frames: [{}],
            anchorX: 0,
            anchorY: 0,
          } as unknown as import('../assets.js').LoadedSprite,
        },
      },
    )
    throwing.session.tick(16, new Set())
    throwing.session.tick(16, new Set(['w']))
    throwing.session.tick(16, new Set(['Enter']))
    throwing.session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 30; i++) throwing.session.tick(500, new Set())
    expect(throwing.plays).toContain('sound.item-throw')
    expect(throwing.plays).toContain('sound.item-fire')
  })
})

describe('B9 特殊战斗形态', () => {
  test('endBattle terminate:choreography 撑到 turn → 战斗终止无奖励(林天南 7 回合)', async () => {
    // 打不死的敌 + turn≥2 触发 endBattle terminate;不主动攻击也会终止
    const enemy = mkEnemy('lin', { health: 99999, defense: 99999, attackStrength: 0 })
    const { session } = makeSession(
      enemy,
      { attackStrength: 0, defense: 9999 },
      {
        encounterChoreo: [
          {
            at: 'turnStart',
            once: true,
            when: { kind: 'turn', op: '>=', value: 2 },
            body: [{ kind: 'endBattle', result: 'terminate' }],
          },
        ],
      },
    )
    // 回合 1:防御推进(攻 0 杀不死);回合 2 起手 → endBattle
    let guard = 0
    const result = await Promise.race([
      session.done,
      new Promise<string>((res) => {
        const pump = () => {
          if (guard++ > 400) return res('timeout')
          session.tick(50, new Set([' '])) // 空格推进横幅/确认默认攻击(攻 0 无害)
          setTimeout(pump, 0)
        }
        pump()
      }),
    ])
    expect(result).toBe('win') // terminate → done('win');enemyFled 标记免奖励
    expect(session.enemyFled()).toBe(true) // terminate = 无奖励语义
  })

  test('auto 战斗:无按键输入自动推进到出结果(石长老过场战)', async () => {
    const enemy = mkEnemy('weakling', { health: 20, defense: 0 })
    const { session } = makeSession(enemy, { attackStrength: 100 }, { auto: true })
    let guard = 0
    const result = await Promise.race([
      session.done,
      new Promise<string>((res) => {
        const pump = () => {
          if (guard++ > 400) return res('timeout')
          session.tick(50, new Set()) // 关键:空输入集,auto 自动派攻击
          setTimeout(pump, 0)
        }
        pump()
      }),
    ])
    expect(result).toBe('win') // 玩家不出菜单,AI 代打秒杀
  })
})

describe('R13-5 enemy hook 会话接线', () => {
  test('turnStart 使用 gameplay clock，迟到 fade-stop 不误停随后播放的新曲', () => {
    const enemy = mkEnemy('music-hook', { attackStrength: 0, health: 9999 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'intro',
        states: {
          intro: {
            body: [
              { kind: 'stopMusic', fadeMs: 3000 },
              { kind: 'playSound', asset: 'sound.pal.213' },
              { kind: 'wait', ms: 1600 },
              { kind: 'playMusic', asset: 'music.pal.038' },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const music: string[] = []
    const { session, plays } = makeSession(
      enemy,
      {},
      {
        playMusic: (asset) => music.push(`play:${asset}`),
        stopMusic: () => music.push('stop'),
      },
    )

    session.tick(0, new Set(), 0) // 排队并激活 turnStart
    session.tick(0, new Set(), 0) // stopMusic(fade=3000)
    session.tick(0, new Set(), 0) // sound 213
    session.tick(0, new Set(), 0) // wait 1600
    session.tick(1000, new Set(), 0) // real dt 前进，gameplay clock 冻结
    session.tick(0, new Set(), 1599)
    expect(music).toEqual([])
    session.tick(0, new Set(), 1600)
    expect(plays).toContain('sound.pal.213')
    expect(music).toEqual(['play:music.pal.038'])
    session.tick(0, new Set(), 3000)
    expect(music).toEqual(['play:music.pal.038'])
  })

  test('ready hook 每个行动 entry 先执行，完成后同一敌人仍正常行动', () => {
    const enemy = mkEnemy('ready-hook', {
      attackStrength: 5,
      health: 9999,
      dexterity: 10,
    })
    enemy.ai.hooks = {
      ready: {
        initial: 'ready',
        states: {
          ready: {
            body: [{ kind: 'playSound', asset: 'sound.ready' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const { session, plays } = makeSession(enemy, {
      attackStrength: 0,
      defense: 9999,
    })
    driveOneRound(session, 40)
    expect(plays).toContain('sound.ready')
    expect(session.debugLog().some((line) => line.includes('ready-hook 攻击'))).toBe(true)
  })

  test('fleeBattle 立即播放逃跑演出，但当前 hook closure 排净后才结算', async () => {
    const enemy = mkEnemy('flee-hook', { attackStrength: 0, health: 9999 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'escape',
        states: {
          escape: {
            body: [{ kind: 'fleeBattle' }, { kind: 'playSound', asset: 'sound.after-flee' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const { session, plays } = makeSession(enemy)
    for (let index = 0; index < 40; index += 1) session.tick(1000, new Set())
    const result = await Promise.race([
      session.done,
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ])
    expect(result).toBe('win')
    expect(session.enemyFled()).toBe(true)
    expect(plays).toContain('sound.after-flee')
  })

  test('固定成长先严格定位，再同步战斗快照并保持 exp，复活与回满读取新上限', () => {
    const actor = 'zhao-linger'
    const enemy = mkEnemy('growth-hook', { attackStrength: 0, health: 9999 })
    const delta = {
      level: 11,
      maxHP: 170,
      maxMP: 190,
      attack: 100,
      magicAttack: 155,
      defense: 55,
      speed: 80,
      luck: 30,
    }
    enemy.ai.hooks = {
      turnStart: {
        initial: 'growth',
        states: {
          growth: {
            body: [
              { kind: 'applyActorGrowth', actor, delta },
              { kind: 'revivePartyAll', tenths: 1 },
              { kind: 'increaseHpMp', delta: 9999, pools: 'both' },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const progress = {
      level: 5,
      exp: 77,
      maxHP: 100,
      maxMP: 30,
      attack: 20,
      magicAttack: 15,
      defense: 12,
      speed: 10,
      luck: 8,
    }
    const { session } = makeSession(
      enemy,
      {
        actorTemplateId: actor,
        hp: 0,
        maxHp: 100,
        mp: 0,
        maxMp: 30,
        attackStrength: 20,
        magicStrength: 15,
        defense: 12,
        baseDexterity: 10,
        fleeRate: 8,
        persistentProgress: { ...progress },
      },
      {
        worldPartyIdentities: [{ id: 'li', template: actor }],
      },
    )
    for (let index = 0; index < 6; index += 1) session.tick(0, new Set(), 0)
    const internal = session as unknown as {
      state: {
        players: BattlePlayerState[]
        pendingWorldMutations: BattleWorldMutation[]
      }
    }
    const playerState = expectDefined(internal.state.players[0])
    expect(playerState.persistentProgress).toEqual({
      level: 16,
      exp: 77,
      maxHP: 270,
      maxMP: 220,
      attack: 120,
      magicAttack: 170,
      defense: 67,
      speed: 90,
      luck: 38,
    })
    expect(playerState).toMatchObject({
      hp: 270,
      maxHp: 270,
      mp: 220,
      maxMp: 220,
      attackStrength: 120,
      magicStrength: 170,
      defense: 67,
      baseDexterity: 90,
      fleeRate: 38,
    })
    expect(internal.state.pendingWorldMutations).toEqual([
      {
        kind: 'fixedCharacterGrowth',
        characterId: 'li',
        actorTemplateId: actor,
        delta,
      },
    ])
  })

  test('固定成长定位失败时在任何 mutation 前 fail-loud', () => {
    const enemy = mkEnemy('bad-growth', { attackStrength: 0, health: 9999 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'growth',
        states: {
          growth: {
            body: [
              {
                kind: 'applyActorGrowth',
                actor: 'zhao-linger',
                delta: {
                  level: 1,
                  maxHP: 1,
                  maxMP: 1,
                  attack: 1,
                  magicAttack: 1,
                  defense: 1,
                  speed: 1,
                  luck: 1,
                },
              },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const { session } = makeSession(enemy, {
      actorTemplateId: 'zhao-linger',
      persistentProgress: {
        level: 1,
        exp: 9,
        maxHP: 100,
        maxMP: 30,
        attack: 20,
        magicAttack: 15,
        defense: 12,
        speed: 10,
        luck: 8,
      },
    })
    const internal = session as unknown as {
      state: {
        players: BattlePlayerState[]
        pendingWorldMutations: BattleWorldMutation[]
      }
    }
    session.tick(0, new Set(), 0)
    expect(() => session.tick(0, new Set(), 0)).toThrow('在世界队伍中期望恰好 1 个实例')
    expect(expectDefined(internal.state.players[0]).maxHp).toBe(100)
    expect(internal.state.pendingWorldMutations).toEqual([])
  })
})

describe('P2 库存预占(原版 nAmountInUse,fight.c:1900-1916)', () => {
  test('前一队员选走最后一件消耗品,后一队员 E 打不开列表 —— 不会重复提交同一件', () => {
    const sfx = { play: () => {} } as unknown as SfxPlayer
    const assets: BattleSessionAssets = {
      palette: { colors: [], cycles: [] } as unknown as import('@type-pal/shared').Palette,
      glyphs: stubGlyphs,
      ...mockBattleAssets([mkEnemy('slime', { attackStrength: 0, health: 9999 })], 2),
      sfx,
    }
    const enemy = mkEnemy('slime', { attackStrength: 0, health: 9999 })
    const session = new BattleSession(
      [player('li'), player('ling')],
      [enemy],
      assets,
      (id) => id,
      () => 0,
      {
        items: {
          yao: {
            id: 'yao',
            name: '药',
            desc: [],
            buyPrice: 0,
            sellPrice: 0,
            sellable: false,
            use: { target: 'self', consuming: true, effects: [{ kind: 'healHp', amount: 1 }] },
          },
        },
        inventory: [{ itemId: 'yao', count: 1 }],
      },
    )
    session.tick(16, new Set()) // battleStart choreo
    // 队员0:E 开用品 → Enter 提交最后一件药(self = 直接提交)
    session.tick(16, new Set(['e']))
    session.tick(16, new Set(['Enter']))
    // 队员1:E 应打不开(剩余 0 已被预占)→ Enter Enter 走的是主菜单普攻路径
    session.tick(16, new Set(['e']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 20; i++) session.tick(500, new Set()) // 消费本回合
    const log = session.debugLog()
    expect(log.filter((l) => l.includes('使用 药')).length).toBe(1) // 只用了一次
    expect(log.some((l) => l.includes('已耗尽,降级防御'))).toBe(false) // 未发生重复提交兜底
    expect(log.some((l) => l.includes('攻击 slime'))).toBe(true) // 队员1 落在普攻
  })
})

describe('C8 战斗物品持久效果写回', () => {
  test('成长与明雷感知只写回一次，不覆盖随后发生的战后奖励', () => {
    const { session } = makeSession(mkEnemy('dummy', { attackStrength: 0 }))
    const mutations: BattleWorldMutation[] = [
      {
        kind: 'characterGrowth',
        characterId: 'li',
        expAfter: 0,
        delta: {
          level: 1,
          maxHP: 8,
          maxMP: 6,
          attack: 2,
          magicAttack: 3,
          defense: 4,
          speed: 1,
          luck: 2,
        },
      },
      {
        kind: 'hostileAwareness',
        value: { rangeMultiplier: 3, remainingMs: 60_000 },
      },
    ]
    const internal = session as unknown as {
      state: { pendingWorldMutations: BattleWorldMutation[] }
    }
    internal.state.pendingWorldMutations.push(...mutations)
    const character: CharacterInstance = {
      id: 'li',
      template: 'li',
      level: 10,
      exp: 123,
      hp: 50,
      maxHP: 100,
      mp: 20,
      maxMP: 40,
      attack: 30,
      defense: 20,
      magicAttack: 25,
      speed: 15,
      luck: 12,
      equipment: {},
      tags: [],
    }
    const world: WorldState = {
      party: [character],
      money: 0,
      learnedSkills: {},
      inventory: [],
    }

    session.writeBackPersistentEffects(world)
    expect(character).toMatchObject({
      level: 11,
      exp: 0,
      maxHP: 108,
      maxMP: 46,
      attack: 32,
      magicAttack: 28,
      defense: 24,
      speed: 16,
      luck: 14,
    })
    expect(world.hostileAwareness).toEqual({ rangeMultiplier: 3, remainingMs: 60_000 })

    // 模拟 writeback 之后的胜利经验结算；第二次共路调用必须完全幂等。
    character.level += 1
    character.exp = 42
    character.maxHP += 5
    session.writeBackPersistentEffects(world)
    expect(character.level).toBe(12)
    expect(character.exp).toBe(42)
    expect(character.maxHP).toBe(113)
  })

  test('skillUse mutation 写回：计数持久化 + 满限从 learnedSkills 移除', () => {
    const { session } = makeSession(mkEnemy('target'), {})
    const internal = session as unknown as {
      state: { pendingWorldMutations: BattleWorldMutation[] }
    }
    internal.state.pendingWorldMutations.push({
      kind: 'skillUse',
      characterId: 'li',
      skillId: '370',
      usesAfter: 9,
      removed: true,
    })
    const character: CharacterInstance = {
      id: 'li',
      template: 'li',
      level: 10,
      exp: 0,
      hp: 100,
      maxHP: 100,
      mp: 30,
      maxMP: 30,
      attack: 40,
      defense: 30,
      magicAttack: 20,
      speed: 50,
      luck: 20,
      equipment: {},
      tags: [],
    }
    const world: WorldState = {
      party: [character],
      money: 0,
      learnedSkills: { li: ['370', '330'] },
      inventory: [],
    }
    session.writeBackPersistentEffects(world)
    expect(world.skillUseCounts).toEqual({ li: { '370': 9 } })
    expect(world.learnedSkills.li).toEqual(['330'])
  })

  test('B11-1 伤亡对话经横幅展示并暂停推进,空格后清除(P5)', () => {
    const { session } = makeSession(mkEnemy('target'), {})
    const internal = session as unknown as {
      state: {
        casualtyDialogue?: { speakerRoleId: string; lines: { text: string; style: string }[] }
      }
      choreoBanner: { name: string; text: string } | null
    }
    internal.state.casualtyDialogue = {
      speakerRoleId: 'li',
      lines: [
        { text: 'dlg.13470', style: 'bottom' },
        { text: 'dlg.13471', style: 'narration' },
      ],
    }
    // 展示:横幅挂起,推进暂停
    session.tick(16, new Set())
    expect(internal.choreoBanner?.name).toBe('li')
    expect(internal.choreoBanner?.text).toContain('dlg.13470')
    expect(internal.state.casualtyDialogue).toBeDefined()
    // 空格推进横幅
    session.tick(16, new Set([' ']))
    expect(internal.choreoBanner).toBeNull()
    // 下一 tick 清引用,允许后续 sweep 再开
    session.tick(16, new Set())
    expect(internal.state.casualtyDialogue).toBeUndefined()
  })
})
