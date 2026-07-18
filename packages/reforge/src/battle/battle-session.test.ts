/**
 * BattleSession 表现层钩子测试(M4d-3)—— headless tick 驱动,假 SfxPlayer 记录调用。
 * 只验「时机 → play(id)」接线;真实解码/发声浏览器验。
 */
import type { ActivePoison, EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { GlyphTable } from '../assets.js'
import { type SfxPlayer, SfxReadinessBudgetError, SfxReadinessResourceError } from '../audio/sfx.js'
import { collectTurnActionSounds } from '../audio/sfx-readiness.js'
import { expectDefined } from '../defined.js'
import type { BattlePlayerState, CreatePlayerInput } from './battle-core.js'
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
    spriteNum: 1,
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
    anim: {
      idleFrames: 2,
      magicFrames: 0,
      attackFrames: 2,
      idleAnimSpeed: 5,
      actWaitFrames: 1,
      yPosOffset: 0,
    },
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
    enemySprites: [undefined],
    playerSprites: [undefined],
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
    enemySprites: [undefined],
    playerSprites: players.map(() => undefined),
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
        anim: {
          idleFrames: 2,
          magicFrames: 1,
          attackFrames: 0,
          idleAnimSpeed: 5,
          actWaitFrames: 1,
          yPosOffset: 0,
        },
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

  test('用品显式声音优先于 role；投掷链消费自己的声音', () => {
    const item = {
      id: 'sound-item',
      name: '响铃',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        consuming: true,
        effects: [{ kind: 'healHp' as const, amount: 1 }],
        sound: 'sound.item-explicit',
      },
      throw: { effects: [], sound: 'sound.item-throw' },
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
    )
    throwing.session.tick(16, new Set())
    throwing.session.tick(16, new Set(['w']))
    throwing.session.tick(16, new Set(['Enter']))
    throwing.session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 30; i++) throwing.session.tick(500, new Set())
    expect(throwing.plays).toContain('sound.item-throw')
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

describe('P2 库存预占(原版 nAmountInUse,fight.c:1900-1916)', () => {
  test('前一队员选走最后一件消耗品,后一队员 E 打不开列表 —— 不会重复提交同一件', () => {
    const sfx = { play: () => {} } as unknown as SfxPlayer
    const assets: BattleSessionAssets = {
      palette: { colors: [], cycles: [] } as unknown as import('@type-pal/shared').Palette,
      glyphs: stubGlyphs,
      enemySprites: [undefined],
      playerSprites: [undefined, undefined],
      sfx,
    }
    const session = new BattleSession(
      [player('li'), player('ling')],
      [mkEnemy('slime', { attackStrength: 0, health: 9999 })],
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
            use: { consuming: true, effects: [{ kind: 'healHp', amount: 1 }] },
          },
        },
        inventory: [{ itemId: 'yao', count: 1 }],
      },
    )
    session.tick(16, new Set()) // battleStart choreo
    // 队员0:E 开用品 → Enter 提交最后一件药(target 缺省 = 直接提交)
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
