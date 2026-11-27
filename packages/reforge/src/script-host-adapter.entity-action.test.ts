import type { RuntimeCommand, SpriteDef } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { deferred, nextTestTask } from './__tests__/deferred.js'
import {
  recordScriptHost,
  runAdapterCommands,
  villageEntity,
} from './__tests__/script-host-adapter-fixture.js'
import { EntityActionPlayer, resolveSpriteActionBinding } from './entity-action-player.js'

const action = {
  kind: 'playEntityAction',
  target: villageEntity('guide'),
  sprite: 'walker',
  action: 'wave',
  loop: false,
} satisfies RuntimeCommand

const sprite: SpriteDef = {
  id: 'walker',
  label: 'Walker',
  asset: 'sprite.walker',
  layout: { kind: 'static' },
  poses: {
    wave: {
      label: 'Wave',
      steps: [
        { frame: 0, durationMs: 100 },
        { frame: 1, durationMs: 100 },
        { frame: 2, durationMs: 100 },
      ],
    },
  },
}

function actionHost() {
  const player = new EntityActionPlayer()
  const installed = deferred<void>()
  const { host, calls } = recordScriptHost({
    playEntityAction: (entity, binding, signal) => {
      const pending = player.play(
        entity,
        resolveSpriteActionBinding(sprite, binding, 3, entity),
        signal,
      )
      installed.resolve()
      return pending
    },
    stopEntityAction: (entity, reset) => player.stop(entity, reset),
  })
  return { player, installed: installed.promise, host, calls }
}

test('one-shot action at a nonzero offset owns its caller until the actual final frame', async () => {
  const { player, installed, host, calls } = actionHost()
  const done = runAdapterCommands(host, [
    { ...action, startAtMs: 120 },
    { kind: 'giveMoney', delta: 7 },
  ])
  try {
    await installed
    expect(player.frame('guide')).toBe(1)
    player.advance(179)
    await nextTestTask()
    expect(player.frame('guide')).toBe(2)
    expect(calls).toEqual([])
  } finally {
    player.advance(1)
    await done
  }
  expect(player.frame('guide')).toBeUndefined()
  expect(calls).toStrictEqual([{ method: 'giveMoney', args: [7] }])
})

test('an unawaited one-shot lets the caller continue while the installed animation is in flight', async () => {
  const { player, host, calls } = actionHost()
  const done = runAdapterCommands(host, [
    { ...action, wait: false },
    { kind: 'giveMoney', delta: 9 },
  ])
  try {
    expect(
      await Promise.race([done.then(() => 'ready'), nextTestTask().then(() => 'pending')]),
    ).toBe('ready')
    expect(player.frame('guide')).toBe(0)
    expect(calls).toStrictEqual([{ method: 'giveMoney', args: [9] }])
    await runAdapterCommands(host, [
      { kind: 'stopEntityAction', target: action.target, reset: true },
    ])
    expect(player.frame('guide')).toBeUndefined()
  } finally {
    player.clearScene()
    await done
  }
})

test('a waited action propagates the original asynchronous failure before the next command', async () => {
  const started = deferred<void>()
  const playback = deferred<void>()
  const signal = new AbortController().signal
  const failure = new Error('missing frame data')
  const { host, calls } = recordScriptHost({
    playEntityAction: (entity, binding, received) => {
      expect(entity).toBe('guide')
      expect(binding).toStrictEqual({ sprite: 'walker', action: 'wave', loop: false })
      expect(received).toBe(signal)
      started.resolve()
      return playback.promise
    },
  })
  const done = runAdapterCommands(
    host,
    [
      { ...action, wait: true },
      { kind: 'giveMoney', delta: 7 },
    ],
    { signal },
  )
  const rejected = expect(done).rejects.toBe(failure)
  await started.promise
  playback.reject(failure)
  await rejected
  expect(calls).toEqual([])
})

test.each([
  { error: new Error('missing frame data'), text: 'missing frame data' },
  { error: 'asset unavailable', text: 'asset unavailable' },
])('a background failure reports the playback outcome $text once', async ({ error, text }) => {
  const playback = deferred<void>()
  const reported = deferred<string>()
  const report = vi.fn((message: string) => reported.resolve(message))
  const { host, calls } = recordScriptHost({ playEntityAction: () => playback.promise, report })
  try {
    await runAdapterCommands(host, [
      { ...action, loop: true, wait: false },
      { kind: 'giveMoney', delta: 9 },
    ])
    expect(report).not.toHaveBeenCalled()
    expect(calls).toStrictEqual([{ method: 'giveMoney', args: [9] }])
    playback.reject(error)
    expect(await reported.promise).toBe(`playEntityAction(guide,walker,wave) 后台播放失败: ${text}`)
    expect(report).toHaveBeenCalledTimes(1)
  } finally {
    playback.resolve()
  }
})

test('cancelling a real unawaited action releases its track and suppresses stale error reporting', async () => {
  const { player, host, calls } = actionHost()
  const controller = new AbortController()
  await runAdapterCommands(host, [{ ...action, wait: false }], { signal: controller.signal })
  expect(player.frame('guide')).toBe(0)
  controller.abort()
  await nextTestTask()
  expect(player.frame('guide')).toBeUndefined()
  expect(calls).toEqual([])
})
