import type { EnemyDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { makeSoloSession, makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import { SfxReadinessBudgetError, SfxReadinessResourceError } from '../audio/sfx.js'
import { collectTurnActionSounds } from '../audio/sfx-readiness.js'
import { expectDefined } from '../defined.js'
import type { CreatePlayerInput } from './battle-core.js'
import {
  type BattleReadinessErrorContext,
  type BattleSession,
  type BattleTurnReadinessSnapshot,
  battleReadinessOverlayText,
} from './battle-session.js'

function makePlayersSession(
  players: CreatePlayerInput[],
  enemy: EnemyDef,
  extraOpts: NonNullable<ConstructorParameters<typeof BattleSession>[5]> = {},
) {
  return makeWfSession({ players, enemies: [enemy], extraOpts }).session
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

function submitDefaultAttack(session: BattleSession): void {
  session.tick(16, new Set([' ']))
  session.tick(16, new Set([' ']))
  session.tick(16, new Set())
}

describe('回合音效准备', () => {
  test('正常 pending 只冻结战场帧，不闪现内部“准备中”；fatal 才显示错误', () => {
    expect(battleReadinessOverlayText('preparing')).toBeNull()
    expect(battleReadinessOverlayText('readinessError')).toBe('音效工作集错误')
  })

  test('全员交招后只准备一次；pending 锁住 Enter/Escape，resolve 后才进入行动', async () => {
    const gate = deferred<void>()
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const { session } = makeSoloSession(
      wfEnemy('barrier', { health: 999, defense: 999, attackStrength: 0 }),
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

  test('自动施毒跨回合后，准备快照同时包含玩家与敌人的真实毒游标', async () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const venom: SkillData = {
      id: 'enemy-venom',
      name: 'Venom',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [
        { kind: 'applyPoison', poisonId: '562' },
        { kind: 'damage', power: 1, elemental: 0 },
      ],
      animation: { effectSprite: 0 },
    }
    const ticks = [{ hpDelta: -1 }, { hpDelta: -2 }, { hpDelta: -3 }]
    const { session } = makeSoloSession(
      wfEnemy('poisoned', { health: 999, attackStrength: 0 }, { ai: { resistanceToSorcery: 0 } }),
      { skills: [venom.id], poisons: [{ poisonId: 561, tickIndex: 0 }] },
      {
        auto: true,
        skills: { [venom.id]: venom },
        poisonDefs: {
          561: {
            id: 561,
            name: 'seed poison',
            curability: 'incurable',
            color: 0,
            playerTicks: ticks,
          },
          562: { id: 562, name: 'enemy venom', curability: 'severe', color: 0, enemyTicks: ticks },
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
    expect(
      snapshots.map(({ turn, activePlayerPoisons, activeEnemyPoisons }) => ({
        turn,
        activePlayerPoisons,
        activeEnemyPoisons,
      })),
    ).toEqual([
      { turn: 1, activePlayerPoisons: [{ poisonId: 561, tickIndex: 0 }], activeEnemyPoisons: [] },
      {
        turn: 2,
        activePlayerPoisons: [{ poisonId: 561, tickIndex: 1 }],
        activeEnemyPoisons: [{ poisonId: 562, tickIndex: 2 }],
      },
    ])
    expect([...expectDefined(snapshots[0]).actions.values()]).toEqual([
      { kind: 'cast', skillId: venom.id, targetEnemyIdx: 0 },
    ])
  })

  test('资源失败只报告一次并在 allSettled 后降级继续行动', async () => {
    const reports: Array<{ error: Error; context: BattleReadinessErrorContext }> = []
    const resourceError = new SfxReadinessResourceError([new Error('missing.wav')])
    const { session } = makeSoloSession(
      wfEnemy('degraded', { health: 999, defense: 999, attackStrength: 0 }),
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
    const { session } = makeSoloSession(
      wfEnemy('fatal', { health: 999, defense: 999, attackStrength: 0 }),
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
    const { session } = makeSoloSession(
      wfEnemy('cancelled', { health: 999, defense: 999, attackStrength: 0 }),
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
      [wfPlayer('li'), wfPlayer('ling')],
      wfEnemy('shortcut', { health: 999, defense: 999, attackStrength: 0 }),
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
      [{ ...wfPlayer('li'), cooperativeMagicSkillId: coop.id }, wfPlayer('ling')],
      wfEnemy('coop-target', { health: 999, defense: 999, attackStrength: 0 }),
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
      [1, { kind: 'pass' }],
    ])
  })

  test('无菜单队员与敌先手也不得绕过屏障', async () => {
    const gate = deferred<void>()
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const session = makePlayersSession(
      [{ ...wfPlayer('sleepy', { baseDexterity: 1 }), initialStatuses: { sleep: 1 } }],
      wfEnemy('fast-enemy', {
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
    const { session } = makeSoloSession(
      wfEnemy('repeat-target', { health: 999, defense: 999, attackStrength: 0 }),
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
    for (let i = 0; i < 160 && session.debugReadiness().phase !== 'menu'; i++) {
      session.tick(500, new Set())
      await flushPromises()
    }
    expect(session.debugReadiness().phase).toBe('menu')

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
    const { session } = makeSoloSession(
      wfEnemy(
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
    for (let i = 0; i < 160 && session.debugReadiness().phase !== 'menu'; i++) {
      session.tick(500, new Set())
      await flushPromises()
    }
    expect(session.debugReadiness().phase).toBe('menu')
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
