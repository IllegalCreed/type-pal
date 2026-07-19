import { buildWorld, emptyWorldScriptState, type WorldState } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { AsyncIntentController } from './async-intent.js'
import { DitherTransitionController } from './dither-transition.js'
import { SupersedingFadeDriver } from './fade-driver.js'
import {
  assertSceneSwitchDependenciesCurrent,
  captureSceneSwitchDependencies,
  prepareAndCommitSceneSwitch,
  type SceneActorSpriteOverride,
} from './scene-switch-transaction.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

function worldFixture(): WorldState {
  const world = buildWorld(
    { party: ['hero'], money: 10, learnedSkills: {}, inventory: [{ itemId: 'herb', count: 2 }] },
    {
      hero: {
        id: 'hero',
        name: 'hero',
        spriteId: 'sprite.hero',
        portraits: { default: 'portrait.hero' },
        battler: {
          baseStats: {
            level: 1,
            hp: 10,
            maxHP: 10,
            mp: 10,
            maxMP: 10,
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    },
  )
  world.script = emptyWorldScriptState()
  return world
}

describe('scene switch dependency guard', () => {
  test('所有预检依赖变化都拒绝陈旧 plan，无关世界字段不误伤', () => {
    const overrides = new Map<string, SceneActorSpriteOverride>()
    const base = worldFixture()
    const expected = captureSceneSwitchDependencies(base, 's002', overrides, true)
    const mutations: Array<
      (world: WorldState, map: Map<string, SceneActorSpriteOverride>) => void
    > = [
      (world) => {
        world.script!.mapOverride = { s002: 'map.changed' }
      },
      (world) => {
        world.party[0]!.appearance = { spriteId: 'sprite.changed' }
      },
      (world) => {
        world.party[0]!.equipment.weapon = 'sword'
      },
      (world) => {
        world.script!.followers = ['sprite.follower']
      },
      (world) => {
        world.inventory[0]!.count++
      },
      (world) => {
        world.script!.sceneScriptOverrides = { s002: { onEnter: null } }
      },
      (world) => {
        world.script!.entityStage['s:s002'] = 2
      },
      (_world, map) => {
        map.set('hero', { def: { id: 'sprite.override', asset: 'asset.override' } })
      },
    ]

    for (const mutate of mutations) {
      const current = structuredClone(base)
      const currentOverrides = new Map(overrides)
      mutate(current, currentOverrides)
      expect(() =>
        assertSceneSwitchDependenciesCurrent(
          expected,
          captureSceneSwitchDependencies(current, 's002', currentOverrides, true),
          '依赖已变化',
        ),
      ).toThrowError(expect.objectContaining({ name: 'AbortError' }))
    }

    const unrelated = structuredClone(base)
    unrelated.money++
    unrelated.script!.flags.unrelated = true
    expect(captureSceneSwitchDependencies(unrelated, 's002', overrides, true)).toEqual(expected)
  })

  test('读档计划显式忽略活动 actor override', () => {
    const world = worldFixture()
    const before = captureSceneSwitchDependencies(world, 's002', new Map(), false)
    const overrides = new Map<string, SceneActorSpriteOverride>([
      ['hero', { def: { id: 'sprite.override', asset: 'asset.override' } }],
    ])
    expect(captureSceneSwitchDependencies(world, 's002', overrides, false)).toEqual(before)
  })
})

describe('prepareAndCommitSceneSwitch', () => {
  test.each([
    'scene',
    'map',
    'palette',
    'sprite',
    'sound',
  ])('%s 预检失败零提交并清理当前呈现', async (stage) => {
    const stop = vi.fn()
    const commit = vi.fn()
    const cleanup = vi.fn()
    await expect(
      prepareAndCommitSceneSwitch({
        prepare: async () => {
          throw new Error(`${stage} failed`)
        },
        assertCurrent: vi.fn(),
        present: vi.fn(),
        commit: (plan) => {
          stop()
          commit(plan)
        },
        shouldCleanup: () => true,
        cleanup,
      }),
    ).rejects.toThrow(`${stage} failed`)
    expect(stop).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
    expect(cleanup).toHaveBeenCalledOnce()
  })

  test('A 淡出时 B 预检失败：只由当前 B 收口黑幕，A 不得提交或二次清理', async () => {
    const intent = new AsyncIntentController()
    const aToken = intent.begin()
    const aFade = deferred<void>()
    const commits: string[] = []
    const cleanups: string[] = []
    const a = prepareAndCommitSceneSwitch({
      prepare: async () => 'A',
      assertCurrent: () => intent.assertCurrent(aToken, 'A stale'),
      present: () => aFade.promise,
      commit: (plan) => commits.push(plan),
      shouldCleanup: () => intent.isCurrent(aToken),
      cleanup: () => cleanups.push('A'),
    })
    await Promise.resolve()

    const bToken = intent.begin()
    const b = prepareAndCommitSceneSwitch({
      prepare: async () => {
        throw new Error('B preflight failed')
      },
      assertCurrent: () => intent.assertCurrent(bToken, 'B stale'),
      present: async () => undefined,
      commit: (plan) => commits.push(plan),
      shouldCleanup: () => intent.isCurrent(bToken),
      cleanup: () => cleanups.push('B'),
    })
    await expect(b).rejects.toThrow('B preflight failed')
    aFade.resolve()
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })
    expect(commits).toEqual([])
    expect(cleanups).toEqual(['B'])
  })

  test('A 正在淡出时 B 成功接管：A 立即收敛且仅 B 提交一次', async () => {
    const intent = new AsyncIntentController()
    const fade = new SupersedingFadeDriver(0)
    const commits: string[] = []
    const aToken = intent.begin()
    const a = prepareAndCommitSceneSwitch({
      prepare: async () => 'A',
      assertCurrent: () => intent.assertCurrent(aToken, 'A stale'),
      present: () => fade.begin(1, 0, 100),
      commit: (plan) => commits.push(plan),
      shouldCleanup: () => intent.isCurrent(aToken),
      cleanup: vi.fn(),
    })
    await Promise.resolve()
    expect(fade.advance(40)).toBeCloseTo(0.4)

    const bToken = intent.begin()
    const b = prepareAndCommitSceneSwitch({
      prepare: async () => 'B',
      assertCurrent: () => intent.assertCurrent(bToken, 'B stale'),
      present: () => fade.begin(1, 40, 60),
      commit: (plan) => commits.push(plan),
      shouldCleanup: () => intent.isCurrent(bToken),
      cleanup: vi.fn(),
    })
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })
    expect(fade.value).toBeCloseTo(0.4)
    expect(commits).toEqual([])
    fade.advance(100)
    await expect(b).resolves.toBe('B')
    expect(commits).toEqual(['B'])
  })

  test('A 已提交并淡入时 B 成功接管：A 后置检查失败，B 正常提交', async () => {
    const intent = new AsyncIntentController()
    const fade = new SupersedingFadeDriver(1)
    const commits: string[] = []
    const done: string[] = []
    const aToken = intent.begin()
    const a = (async () => {
      await prepareAndCommitSceneSwitch({
        prepare: async () => 'A',
        assertCurrent: () => intent.assertCurrent(aToken, 'A stale'),
        present: async () => undefined,
        commit: (plan) => commits.push(plan),
        shouldCleanup: () => intent.isCurrent(aToken),
        cleanup: vi.fn(),
      })
      await fade.begin(0, 0, 100)
      intent.assertCurrent(aToken, 'A post-commit stale')
      done.push('A')
    })()
    await vi.waitFor(() => expect(commits).toEqual(['A']))
    expect(fade.advance(40)).toBeCloseTo(0.6)

    const bToken = intent.begin()
    const b = prepareAndCommitSceneSwitch({
      prepare: async () => 'B',
      assertCurrent: () => intent.assertCurrent(bToken, 'B stale'),
      present: () => fade.begin(1, 40, 60),
      commit: (plan) => commits.push(plan),
      shouldCleanup: () => intent.isCurrent(bToken),
      cleanup: vi.fn(),
    })
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })
    expect(done).toEqual([])
    expect(fade.value).toBeCloseTo(0.6)
    fade.advance(100)
    await expect(b).resolves.toBe('B')
    expect(commits).toEqual(['A', 'B'])
  })

  test('切场 fade 被非 scene owner 接管后，旧 cleanup 不得取消新演出', async () => {
    const intent = new AsyncIntentController()
    const fade = new SupersedingFadeDriver(0)
    const sceneOwner = {}
    const newerOwner = {}
    const token = intent.begin()
    const switching = prepareAndCommitSceneSwitch({
      prepare: async () => 'scene',
      assertCurrent: () => intent.assertCurrent(token, 'scene stale'),
      present: () => fade.begin(1, 0, 100, undefined, sceneOwner),
      commit: vi.fn(),
      shouldCleanup: () => intent.isCurrent(token),
      cleanup: () => fade.cancelOwned(sceneOwner, 0),
    })
    await Promise.resolve()
    expect(fade.advance(40)).toBeCloseTo(0.4)

    const newer = fade.begin(0, 40, 60, undefined, newerOwner)
    await expect(switching).rejects.toMatchObject({ name: 'AbortError' })
    expect(fade.active).toBe(true)
    expect(fade.advance(100)).toBeCloseTo(0)
    await expect(newer).resolves.toBeUndefined()
  })

  test('fade-out 完成后后置校验失败，呈现 owner 的 cleanup 仍会复位黑幕', async () => {
    const fade = new SupersedingFadeDriver(0)
    const sceneOwner = {}
    let checks = 0
    const switching = prepareAndCommitSceneSwitch({
      prepare: async () => 'scene',
      assertCurrent: () => {
        checks++
        if (checks === 2) throw new Error('post-present stale')
      },
      present: async () => {
        const done = fade.begin(1, 0, 100, undefined, sceneOwner)
        fade.advance(100)
        await done
      },
      commit: vi.fn(),
      shouldCleanup: () => true,
      cleanup: () => fade.cancelOwned(sceneOwner, 0),
    })

    await expect(switching).rejects.toThrow('post-present stale')
    expect(fade.active).toBe(false)
    expect(fade.value).toBe(0)
  })

  test('切场预检失败时，旧 cleanup 不得取消并行启动的新 dither owner', async () => {
    const intent = new AsyncIntentController()
    const dither = new DitherTransitionController<string>()
    const sceneOwner = {}
    const newerOwner = {}
    const gate = deferred<void>()
    const token = intent.begin()
    const switching = prepareAndCommitSceneSwitch({
      prepare: async () => {
        await gate.promise
        throw new Error('preflight failed')
      },
      assertCurrent: () => intent.assertCurrent(token, 'scene stale'),
      present: vi.fn(),
      commit: vi.fn(),
      shouldCleanup: () => intent.isCurrent(token),
      cleanup: () => dither.cancelOwned(sceneOwner),
    })
    await Promise.resolve()
    const newer = dither.beginSnapshot(() => 'newer', 100, newerOwner)
    gate.resolve()

    await expect(switching).rejects.toThrow('preflight failed')
    expect(dither.active?.owner).toBe(newerOwner)
    dither.finish()
    await expect(newer).resolves.toBeUndefined()
  })

  test('停止旧 auto 会失效已经进入资源 await 的 host 提交', async () => {
    const scriptMutations = new AsyncIntentController()
    const gate = deferred<void>()
    const token = scriptMutations.capture()
    let partyCommitted = false
    const pending = (async () => {
      await gate.promise
      scriptMutations.assertCurrent(token, '旧场景 auto 已停止')
      partyCommitted = true
    })()

    scriptMutations.invalidate()
    gate.resolve()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(partyCommitted).toBe(false)
  })
})
