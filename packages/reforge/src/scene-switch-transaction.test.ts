import { describe, expect, test, vi } from 'vitest'
import { deferred } from './__tests__/world-async-fixture.js'
import { AsyncIntentController } from './async-intent.js'
import { DitherTransitionController } from './dither-transition.js'
import { SupersedingFadeDriver } from './fade-driver.js'
import { prepareAndCommitSceneSwitch } from './scene-switch-transaction.js'

describe('prepareAndCommitSceneSwitch', () => {
  test('preflight failure preserves the original error and cannot present or publish', async () => {
    const failure = new Error('map preflight failed')
    const assertCurrent = vi.fn()
    const present = vi.fn()
    const commit = vi.fn()
    const cleanup = vi.fn()
    await expect(
      prepareAndCommitSceneSwitch({
        prepare: async () => {
          throw failure
        },
        assertCurrent,
        present,
        commit,
        shouldCleanup: () => true,
        cleanup,
      }),
    ).rejects.toBe(failure)
    expect(assertCurrent).not.toHaveBeenCalled()
    expect(present).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
    expect(cleanup).toHaveBeenCalledTimes(1)
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
    const revealingA = deferred<void>()
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
      const reveal = fade.begin(0, 0, 100)
      revealingA.resolve()
      await reveal
      intent.assertCurrent(aToken, 'A post-commit stale')
      done.push('A')
    })()
    await revealingA.promise
    expect(commits).toEqual(['A'])
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
})
