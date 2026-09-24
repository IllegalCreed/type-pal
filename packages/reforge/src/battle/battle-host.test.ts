// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { battleHostFixture, gate } from '../__tests__/battle-host-fixture.js'
import { drain } from '../__tests__/runtime-shell/driver.js'
import { SfxReadinessResourceError } from '../audio/sfx.js'

let f: Awaited<ReturnType<typeof battleHostFixture>> | undefined
afterEach(async () => {
  await f?.close()
  f = undefined
})

test('battle host commits real victory once, then hooks, scene sounds and music in order', async () => {
  f = await battleHostFixture()
  const operation = f.observe(f.host.start('encounter', { auto: true }))
  await f.until(() => f!.host.active !== null)
  expect(f.world()).toEqual(f.originalWorld)
  await f.finish()
  await operation.consumed
  expect(operation.state).toEqual({ settled: true, result: 'victory' })
  const expected = structuredClone(f.originalWorld)
  expected.money += 7
  expected.party[0]!.hp = 90
  expected.party[0]!.mp = 35
  expect(f.world()).toEqual(expected)
  expect(f.events).toEqual([
    'music:stop',
    'publish',
    'settlement',
    'clear',
    'write:victory',
    'defeated',
    'restore',
    'music:stop',
  ])
  f.host.cancel()
  expect(f.world()).toEqual(expected)
  f.assertInputs()
})

test.each([
  'cancel',
  'runner',
  'world',
  'script',
] as const)('battle host refuses delayed preparation after %s invalidation with zero music or writeback', async (mode) => {
  f = await battleHostFixture()
  const wait = f.blockSprite()
  const controller = new AbortController()
  const operation = f.observe(f.host.start('encounter', undefined, controller.signal))
  await f.until(() => wait.entered() > 0)
  expect(operation.state.settled).toBe(false)
  if (mode === 'cancel') f.host.cancel()
  if (mode === 'runner') controller.abort()
  if (mode === 'world') f.replaceWorld()
  if (mode === 'script') f.script.invalidate()
  wait.release()
  await f.until(() => operation.state.settled || f!.host.active !== null)
  expect(operation.state).toMatchObject({ settled: true, error: { name: 'AbortError' } })
  expect(f.host.active).toBeNull()
  expect(f.events).toEqual([])
  expect(f.world()).toEqual(f.originalWorld)
  f.assertInputs()
})

test('pre-aborted battle request changes neither frame mode nor resource IO', async () => {
  f = await battleHostFixture()
  const prepare = vi.spyOn(f.prep, 'prepare')
  const controller = new AbortController()
  controller.abort()
  await expect(f.host.start('encounter', undefined, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(prepare).not.toHaveBeenCalled()
  expect(f.ports.exitFrameStep).not.toHaveBeenCalled()
  expect(f.events).toEqual([])
})

test('new launch invalidates older preparation while preserving the new live session', async () => {
  f = await battleHostFixture()
  const wait = f.blockSprite()
  const old = f.observe(f.host.start('encounter'))
  await f.until(() => wait.entered() > 0)
  const current = f.observe(f.host.start('encounter'))
  wait.release()
  await f.until(() => old.state.settled && f!.host.active !== null)
  expect(old.state).toMatchObject({ settled: true, error: { name: 'AbortError' } })
  expect(current.state.settled).toBe(false)
  expect(f.events).toEqual(['music:stop', 'publish'])
  expect(f.world()).toEqual(f.originalWorld)
})

test('old session finally cannot clear a new session published in the same turn', async () => {
  f = await battleHostFixture()
  const old = f.observe(f.host.start('encounter'))
  await f.until(() => f!.host.active !== null)
  const previous = f.host.active!
  let replacement: typeof previous | undefined
  const publish = f.ports.publishDebug
  f.ports.publishDebug = (session) => {
    publish(session)
    if (session && session !== previous) {
      replacement = session
      previous.cancel()
    }
  }
  const current = f.observe(f.host.start('encounter'))
  await f.until(() => old.state.settled && replacement !== undefined)
  expect(old.state).toMatchObject({ settled: true, error: { name: 'AbortError' } })
  expect(f.host.active).toBe(replacement)
  expect(current.state.settled).toBe(false)
  expect(f.events).toEqual(['music:stop', 'publish', 'music:stop', 'publish'])
  expect(f.world()).toEqual(f.originalWorld)
})

test('running cancellation consumes the real session and never restores or writes old world state', async () => {
  f = await battleHostFixture()
  const controller = new AbortController()
  const operation = f.observe(f.host.start('encounter', undefined, controller.signal))
  await f.until(() => f!.host.active !== null)
  controller.abort()
  await operation.consumed
  expect(operation.state).toMatchObject({ settled: true, error: { name: 'AbortError' } })
  expect(f.events).toEqual(['music:stop', 'publish', 'clear'])
  expect(f.world()).toEqual(f.originalWorld)
})

test('fatal session failure restores scene resources and retains original failure even if restoration fails', async () => {
  f = await battleHostFixture()
  const failure = new Error('fatal readiness'),
    restoreFailure = new Error('scene IO')
  f.ports.restoreSceneSounds = vi.fn(async () => {
    throw restoreFailure
  })
  const operation = f.observe(f.host.start('encounter'))
  await f.until(() => f!.host.active !== null)
  f.host.active!.cancel(failure)
  await operation.consumed
  expect(operation.state).toEqual({ settled: true, error: failure })
  expect(f.ports.reportRestoreFailure).toHaveBeenCalledExactlyOnceWith(restoreFailure)
  expect(f.events).toEqual(['music:stop', 'publish', 'music:stop', 'clear'])
  expect(f.world()).toEqual(f.originalWorld)
})

test('stale fatal recovery cannot play music or clear the replacement session', async () => {
  f = await battleHostFixture()
  const wait = gate()
  let entered = false
  f.ports.restoreSceneSounds = async () => {
    entered = true
    await wait.promise
  }
  const old = f.observe(f.host.start('encounter'))
  try {
    await f.until(() => f!.host.active !== null)
    f.host.active!.cancel(new Error('fatal'))
    await f.until(() => entered)
    const previous = f.host.active
    f.observe(f.host.start('encounter'))
    await f.until(() => f!.host.active !== previous)
    const replacement = f.host.active
    wait.release()
    await old.consumed
    expect(old.state).toMatchObject({ settled: true, error: { name: 'AbortError' } })
    expect(f.host.active).toBe(replacement)
    expect(f.events).toEqual(['music:stop', 'publish', 'music:stop', 'publish'])
  } finally {
    wait.release()
  }
})

test('defeated script failure propagates after world writeback and scene recovery', async () => {
  f = await battleHostFixture()
  const failure = new Error('script failed')
  f.ports.runDefeated = async () => {
    f!.events.push('defeated')
    throw failure
  }
  const operation = f.observe(f.host.start('encounter', { auto: true }))
  await f.until(() => f!.host.active !== null)
  await f.finish()
  await operation.consumed
  expect(operation.state).toEqual({ settled: true, error: failure })
  expect(f.events.slice(-4)).toEqual(['write:victory', 'defeated', 'restore', 'music:stop'])
  expect(f.world().money).toBe(f.originalWorld.money + 7)
})

test('world replacement after session completion blocks final writeback', async () => {
  f = await battleHostFixture()
  const publish = f.ports.publishDebug
  let before: ReturnType<typeof f.world> | undefined
  f.ports.publishDebug = (session) => {
    publish(session)
    if (!session) {
      f!.replaceWorld()
      before = structuredClone(f!.world())
    }
  }
  const operation = f.observe(f.host.start('encounter', { auto: true }))
  await f.until(() => f!.host.active !== null)
  await f.finish()
  await operation.consumed
  expect(operation.state).toMatchObject({ settled: true, error: { name: 'AbortError' } })
  expect(f.world()).toEqual(before)
  expect(f.events).toEqual(['music:stop', 'publish', 'settlement', 'clear'])
})

test('readiness diagnostics deduplicate by error identity text across launches, not by stage', async () => {
  f = await battleHostFixture()
  const error = new SfxReadinessResourceError([])
  vi.spyOn(f.sfx, 'prepare').mockRejectedValue(error)
  for (let i = 0; i < 2; i++) {
    const run = f.observe(f.host.start('encounter'))
    await f.until(() => f!.host.active !== null)
    f.host.cancel()
    await run.consumed
  }
  expect(f.ports.reportReadiness).toHaveBeenCalledExactlyOnceWith(
    'encounter',
    'battleBase',
    error,
    false,
  )
  expect(f.world()).toEqual(f.originalWorld)
  await drain()
})
