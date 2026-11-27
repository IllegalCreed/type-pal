import type { RuntimeCommand } from '@type-pal/content'
import { expect, test } from 'vitest'
import { deferred } from './__tests__/deferred.js'
import {
  recordScriptHost,
  runAdapterCommands,
  villageEntity,
  villageScene,
} from './__tests__/script-host-adapter-fixture.js'
import { compileAdapterLeaves } from './__tests__/script-host-adapter-input.js'
import { expectDefined } from './defined.js'
import { executeScriptHostEffect } from './script-host-adapter.js'

test('scene changes preserve named and explicit arrivals, source transition and defaults', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const transition = {
    kind: 'source',
    outMs: 1200,
    inMs: 600,
    color: 'black',
    evidenceId: 'scene-arrival',
  } as const
  const pos = { col: 1, row: 2, height: 0 }
  await runAdapterCommands(
    host,
    [
      { kind: 'loadScene', scene: 'shore', entryId: 'west', transition },
      { kind: 'loadScene', scene: 'forest', pos, facing: 'up', transition },
      { kind: 'loadScene', scene: 'inn' },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'loadScene', args: ['shore', { entryId: 'west' }, signal, transition] },
    { method: 'loadScene', args: ['forest', { pos, facing: 'up' }, signal, transition] },
    { method: 'loadScene', args: ['inn', {}, signal] },
  ])
})

test('only an immediate map change passes the synchronous commit to the reload owner', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const transitions: string[] = []
  const commitControl = {
    kind: 'sceneMap' as const,
    commitSceneMapOverride: () => transitions.push('committed'),
  }
  host.reloadMap = async (mapId, requestSignal, commit) => {
    expect(requestSignal).toBe(signal)
    expect(commit).toBe(commitControl.commitSceneMapOverride)
    transitions.push(mapId)
    expectDefined(commit)()
  }
  await runAdapterCommands(
    host,
    [
      { kind: 'setSceneMapOverride', scene: 'forest', mapId: 'future-map' },
      { kind: 'setSceneMapOverride', mapId: 'current-map' },
    ],
    { signal, options: { ...villageScene, commitControl } },
  )
  expect(transitions).toStrictEqual(['current-map', 'committed'])
  expect(calls).toEqual([])
})

test('a map-only preview commits without a reload port and a missing commit is an error', async () => {
  const { host, calls } = recordScriptHost()
  let currentMap = 'start'
  const command = { kind: 'setSceneMapOverride', mapId: 'preview' } satisfies RuntimeCommand
  const commitControl = {
    kind: 'sceneMap' as const,
    commitSceneMapOverride: () => {
      currentMap = 'preview'
    },
  }
  await expect(runAdapterCommands(host, [command])).rejects.toThrow(
    'setSceneMapOverride 缺同步提交控制',
  )
  expect(currentMap).toBe('start')
  await runAdapterCommands(host, [command], { options: { ...villageScene, commitControl } })
  expect(currentMap).toBe('preview')
  expect(calls).toEqual([])
})

test('darkness, palette fades and screen shake dispatch through their visual owners', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  await runAdapterCommands(
    host,
    [
      { kind: 'holdScreen', color: 'black', token: 'arrival' },
      { kind: 'revealScreen', token: 'arrival' },
      { kind: 'fade', dir: 'out', ms: 1600 },
      { kind: 'fade', dir: 'in', ms: 600 },
      { kind: 'fade', dir: 'out' },
      { kind: 'ditherScreen' },
      { kind: 'shakeScreen', frames: 12, level: 3 },
      { kind: 'toggleDayNight', ms: 0 },
      { kind: 'toggleDayNight', ms: 3200 },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'holdScreen', args: ['black', 'arrival', signal] },
    { method: 'revealScreen', args: ['arrival', signal] },
    { method: 'fade', args: ['out', 1600, undefined, signal] },
    { method: 'fade', args: ['in', 600, undefined, signal] },
    { method: 'fade', args: ['out', 300, undefined, signal] },
    { method: 'ditherScreen', args: [720, signal] },
    { method: 'shakeScreen', args: [12, 3] },
    { method: 'toggleDayNight', args: [0] },
    { method: 'toggleDayNight', args: [3200] },
  ])
})

test('a missing optional shake engine leaves the preview available', async () => {
  const { host, calls } = recordScriptHost({ shakeScreen: undefined })
  await runAdapterCommands(host, [{ kind: 'shakeScreen', frames: 3, level: 1 }])
  expect(calls).toEqual([])
})

test.each([
  {
    command: { kind: 'holdScreen', color: 'black', token: 'arrival' } satisfies RuntimeCommand,
    name: 'holdScreen',
  },
  {
    command: { kind: 'revealScreen', token: 'arrival' } satisfies RuntimeCommand,
    name: 'revealScreen',
  },
])('a host without $name rejects instead of presenting a partial transition', async ({
  command,
  name,
}) => {
  const { host, calls } = recordScriptHost({ holdScreen: undefined, revealScreen: undefined })
  await expect(runAdapterCommands(host, [command])).rejects.toThrow(`宿主未实现 ${name}`)
  expect(calls).toEqual([])
})

test('camera and frame animation preserve pacing, separate rendering options and exact absent values', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const input: RuntimeCommand[] = [
    {
      kind: 'playFrameAnimation',
      asset: 'animation.a',
      startFrame: 1,
      endFrame: 6,
      frameRate: 12,
      holdLastFrame: true,
      initialFadeInMs: 500,
    },
    { kind: 'playFrameAnimation', asset: 'animation.b' },
    { kind: 'cameraPan', dx: -3, dy: 2, frames: 40 },
    { kind: 'cameraPan', dx: 4, dy: 0, frames: 9, startImmediately: true },
    { kind: 'cameraSnap' },
    { kind: 'clearFrameAnimation' },
  ]
  const compiled = compileAdapterLeaves(input)
  const before = structuredClone(compiled)
  for (const command of compiled)
    await executeScriptHostEffect(host, command, {}, signal, villageScene)
  expect(compiled).toStrictEqual(before)
  expect(calls).toStrictEqual([
    {
      method: 'playFrameAnimation',
      args: [
        'animation.a',
        { frameRate: 12, startFrame: 1, endFrame: 6, holdLastFrame: true, initialFadeInMs: 500 },
        signal,
      ],
    },
    {
      method: 'playFrameAnimation',
      args: [
        'animation.b',
        {
          frameRate: undefined,
          startFrame: undefined,
          endFrame: undefined,
          holdLastFrame: undefined,
          initialFadeInMs: undefined,
        },
        signal,
      ],
    },
    { method: 'cameraPan', args: [-3, 2, 40, signal] },
    { method: 'cameraPan', args: [4, 0, 9, signal, true] },
    { method: 'cameraSnap', args: [undefined] },
    { method: 'clearFrameAnimation', args: [] },
  ])
})

test('video decode failure reaches the same caller and prevents the following dispatch', async () => {
  const pending = deferred<void>()
  const started = deferred<void>()
  const failure = new Error('decode failed')
  const controller = new AbortController()
  const { host, calls } = recordScriptHost({
    playVideo: (asset, signal) => {
      expect(asset).toBe('video.intro')
      expect(signal).toBe(controller.signal)
      started.resolve()
      return pending.promise
    },
  })
  const commands = [
    { kind: 'playVideo', asset: 'video.intro' },
    { kind: 'setEntityFrame', target: villageEntity('guide'), frame: 3 },
  ] satisfies RuntimeCommand[]
  const operation = runAdapterCommands(host, commands, { signal: controller.signal })
  const rejects = expect(operation).rejects.toBe(failure)
  await started.promise
  pending.reject(failure)
  await rejects
  expect(calls).toEqual([])
  const reconnection = recordScriptHost()
  await runAdapterCommands(reconnection.host, commands, { signal: controller.signal })
  expect(reconnection.calls).toStrictEqual([
    { method: 'playVideo', args: ['video.intro', controller.signal] },
    { method: 'setEntityFrame', args: ['guide', 3] },
  ])
})
