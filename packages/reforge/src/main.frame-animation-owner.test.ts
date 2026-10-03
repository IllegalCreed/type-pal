// @vitest-environment jsdom
import { type AuthorCommand, encodeFrameSequence } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellProject } from './__tests__/runtime-shell/project.js'
import { advance, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import { sha256Bytes } from './hash.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { IndexedDbSaveStore } from './save/store.js'
import type { ScriptHost } from './script-runner.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
  vi.useRealTimers()
})

function movie() {
  const current: unknown = Reflect.get(window, '__reforge')
  if (
    !current ||
    typeof current !== 'object' ||
    !('renderDebug' in current) ||
    !('playFrameAnimation' in current) ||
    typeof current.playFrameAnimation !== 'function' ||
    !('clearFrameAnimation' in current) ||
    typeof current.clearFrameAnimation !== 'function'
  )
    throw new Error('actual movie host unavailable')
  const debug = current.renderDebug
  if (
    !debug ||
    typeof debug !== 'object' ||
    !('frameAnimationLayerMode' in debug) ||
    !('frameAnimationLayerVisible' in debug) ||
    !('fadeBlack' in debug)
  )
    throw new Error('actual movie observer unavailable')
  const play = current.playFrameAnimation
  const clear = current.clearFrameAnimation
  return {
    mode: debug.frameAnimationLayerMode,
    visible: debug.frameAnimationLayerVisible,
    black: debug.fadeBlack,
    play: (asset: string, opts?: Parameters<ScriptHost['playFrameAnimation']>[1]): Promise<void> =>
      play(asset, opts),
    clear: () => clear(),
  }
}

async function boot(body: AuthorCommand[] = []) {
  host = await installShellHost()
  const f = await shellProject()
  const catalog = structuredClone(f.project.assetCatalog)
  for (const [asset, value] of [
    ['movie-a', 17],
    ['movie-b', 29],
  ] as const) {
    const bytes = await encodeFrameSequence(
      {
        width: 1,
        height: 1,
        defaultFrameMs: 62.5,
        frames: [
          { rgba: new Uint8Array([value, 0, 0, 255]) },
          { rgba: new Uint8Array([value + 1, 0, 0, 255]) },
        ],
      },
      async (raw) =>
        new Uint8Array(
          await new Response(
            new Blob([raw.slice().buffer]).stream().pipeThrough(new CompressionStream('deflate')),
          ).arrayBuffer(),
        ),
    )
    const path = `assets/generated/${asset}.tpfs`
    f.binaries.set(path, bytes)
    catalog.assets[asset] = {
      kind: 'frame-animation',
      path,
      mediaType: 'application/vnd.type-pal.frame-sequence',
      bytes: bytes.length,
      sha256: await sha256Bytes(bytes),
      origin: { kind: 'generated' },
    }
  }
  f.files['assets/index.json'] = catalog
  f.files['content/scenes/a.json'] = sceneWithCommands('a', body)
  const before = structuredClone(f.files)
  const project = await loadCurrentProjectFrom(f.source)
  await (await import('./main.js')).bootGame(project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame(100)
  await drain()
  return { h: host, f, unchanged: () => expect(f.files).toEqual(before) }
}

test('explicit initial reveal owns black from alpha0, presents first frame, completes600 before normal62.5ms and holds until clear', async () => {
  const { h, unchanged } = await boot()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const { FrameAnimationPresentationState } = await import('./frame-animation-presentation.js')
  const frames = vi.spyOn(FrameAnimationPresentationState.prototype, 'present')
  const playing = movie().play('movie-a', { initialFadeInMs: 600, holdLastFrame: true })
  await drain()
  expect(movie().black).toBe(1)
  for (let turn = 0; turn < 20 && frames.mock.calls.length === 0; turn++) {
    await h.settleIO()
    await drain()
  }
  expect(frames.mock.calls.map((call) => call[0].rgba[0])).toEqual([17])
  expect(movie().visible).toBe(true)
  for (let turn = 0; turn < 5; turn++) {
    h.frame(100)
    await drain()
  }
  expect(frames).toHaveBeenCalledTimes(1)
  expect(movie().black).toBeGreaterThan(0)
  h.frame(100)
  await drain()
  expect(movie().black).toBe(0)
  await vi.advanceTimersByTimeAsync(61)
  expect(frames).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(2)
  expect(frames.mock.calls.map((call) => call[0].rgba[0])).toEqual([17, 18])
  await vi.advanceTimersByTimeAsync(63)
  await playing
  expect(movie().mode).toBe('held')
  expect(movie().visible).toBe(true)
  movie().clear()
  expect(movie().mode).toBe('idle')
  expect(movie().visible).toBe(false)
  unchanged()
})

test('a delayed old decode and its finally cannot repaint or hide a superseding held request', async () => {
  const { h, f, unchanged } = await boot()
  let entered = false,
    release!: () => void
  const stalled = new Promise<void>((resolve) => {
    release = resolve
  })
  f.hooks.read = async (path) => {
    if (path.endsWith('movie-a.tpfs')) {
      entered = true
      await stalled
    }
  }
  const old = movie().play('movie-a', { holdLastFrame: true })
  const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
  await drain()
  expect(entered).toBe(true)
  const next = movie().play('movie-b', { holdLastFrame: true })
  await rejected
  for (let turn = 0; turn < 20 && movie().mode !== 'held'; turn++) {
    h.frame(100)
    await h.settleIO()
    await new Promise((resolve) => setTimeout(resolve, 15))
    await drain()
  }
  await next
  expect(movie().mode).toBe('held')
  release()
  await h.settleIO()
  await drain()
  expect(movie().mode).toBe('held')
  expect(movie().visible).toBe(true)
  unchanged()
})

test('clear during slow first decode releases its owned black and prevents resurrection', async () => {
  const { h, f, unchanged } = await boot()
  let release!: () => void
  const stalled = new Promise<void>((resolve) => {
    release = resolve
  })
  f.hooks.read = (path) => (path.endsWith('movie-a.tpfs') ? stalled : undefined)
  const old = movie().play('movie-a', { initialFadeInMs: 600, holdLastFrame: true })
  const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
  await drain()
  expect(movie().black).toBe(1)
  movie().clear()
  await rejected
  expect(movie().black).toBe(0)
  release()
  await h.settleIO()
  await drain()
  expect(movie().mode).toBe('idle')
  expect(movie().visible).toBe(false)
  unchanged()
})

test('superseding during first-frame fade cannot let the old fade callback or finally cancel the new fade', async () => {
  const { h, unchanged } = await boot()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const { FrameAnimationPresentationState } = await import('./frame-animation-presentation.js')
  const frames = vi.spyOn(FrameAnimationPresentationState.prototype, 'present')
  const old = movie().play('movie-a', { initialFadeInMs: 600, holdLastFrame: true })
  const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
  for (let i = 0; i < 20 && frames.mock.calls.length < 1; i++) {
    await h.settleIO()
    await drain()
  }
  h.frame(100)
  await drain()
  const next = movie().play('movie-b', { initialFadeInMs: 600, holdLastFrame: true })
  await rejected
  expect(movie().black).toBe(1)
  for (let i = 0; i < 20 && frames.mock.calls.length < 2; i++) {
    await h.settleIO()
    await drain()
  }
  expect(frames.mock.calls.map((call) => call[0].rgba[0])).toEqual([17, 29])
  for (let i = 0; i < 6; i++) {
    h.frame(100)
    await drain()
  }
  expect(movie().black).toBe(0)
  await vi.advanceTimersByTimeAsync(130)
  await next
  expect(movie().mode).toBe('held')
  expect(frames.mock.calls.at(-1)?.[0].rgba[0]).toBe(30)
  unchanged()
})

test('real author clear between movie and world does not leave a held layer through the following command', async () => {
  const { h, unchanged } = await boot([
    { kind: 'wait', ms: 200 },
    { kind: 'playFrameAnimation', asset: 'movie-a', endFrame: 0, holdLastFrame: true },
    { kind: 'wait', ms: 500 },
    { kind: 'clearFrameAnimation' },
    { kind: 'giveMoney', delta: 9 },
  ])
  await vi.waitFor(async () => {
    h.frame(100)
    await h.settleIO()
    await drain()
    expect(movie().mode).toBe('held')
  })
  expect(movie().visible).toBe(true)
  expect(state().world.money).toBe(50)
  await advance(h, () => state().world.money === 59 && !state().script.running)
  expect(movie().mode).toBe('idle')
  expect(movie().visible).toBe(false)
  unchanged()
})

test('a legal SAVE11 restore resets held cinematic state rather than replaying its pixels', async () => {
  const { h, unchanged } = await boot()
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5')
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const playing = movie().play('movie-a', { holdLastFrame: true })
  await playing
  expect(movie().mode).toBe('held')
  await key(h, 'F9')
  await vi.waitFor(async () => {
    h.frame(100)
    await h.settleIO()
    await drain()
    expect(movie().mode).toBe('idle')
  })
  expect(movie().visible).toBe(false)
  expect((await store.getPayload('quick'))?.version).toBe(11)
  unchanged()
})

test('a real scene commit clears held cinematic pixels while its own scene fade stays authoritative', async () => {
  const { h, unchanged } = await boot([
    { kind: 'wait', ms: 200 },
    { kind: 'playFrameAnimation', asset: 'movie-a', endFrame: 0, holdLastFrame: true },
    { kind: 'loadScene', scene: 'b' },
    { kind: 'giveMoney', delta: 9 },
  ])
  await vi.waitFor(async () => {
    h.frame(100)
    await h.settleIO()
    await drain()
    expect(state().sceneId).toBe('b')
    expect(state().script.running).toBe(false)
  })
  expect(movie().mode).toBe('idle')
  expect(movie().visible).toBe(false)
  expect(movie().black).toBe(0)
  expect(state().world.money).toBe(59)
  unchanged()
})

test('author clear does not remove a later ordinary fade that belongs to the surrounding script', async () => {
  const { h, unchanged } = await boot([
    { kind: 'wait', ms: 200 },
    {
      kind: 'playFrameAnimation',
      asset: 'movie-a',
      endFrame: 0,
      holdLastFrame: true,
      initialFadeInMs: 0,
    },
    { kind: 'fade', dir: 'out', ms: 0 },
    { kind: 'clearFrameAnimation' },
    { kind: 'wait', ms: 500 },
    { kind: 'fade', dir: 'in', ms: 0 },
    { kind: 'giveMoney', delta: 9 },
  ])
  await vi.waitFor(async () => {
    h.frame(100)
    await h.settleIO()
    await drain()
    expect(movie().mode).toBe('idle')
    expect(movie().black).toBe(1)
  })
  expect(movie().visible).toBe(false)
  expect(state().world.money).toBe(50)
  await advance(h, () => state().world.money === 59 && !state().script.running)
  expect(movie().black).toBe(0)
  unchanged()
})
