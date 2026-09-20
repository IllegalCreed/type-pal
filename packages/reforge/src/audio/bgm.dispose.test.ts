import { expect, test, vi } from 'vitest'
import { type BgmSequencerAdapter, createBgmPlayerWithRuntime } from './bgm.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function fixture() {
  const seq = {
    pause: vi.fn(),
    loadNewSongList: vi.fn(),
    loopCount: 0,
    play: vi.fn(),
    fadeTo: vi.fn(),
    cancelFade: vi.fn(),
  }
  const dispose = vi.fn(async () => {})
  const read = vi.fn(async () => new ArrayBuffer(1))
  return { seq, dispose, read }
}
test('dispose is idempotent and a late initialized backend never reads or plays a song', async () => {
  const { seq, dispose, read } = fixture(),
    init = deferred<BgmSequencerAdapter>()
  const runtime = {
    context: { state: 'running' as const, resume: vi.fn(async () => {}) },
    initialize: vi.fn(() => init.promise),
    dispose,
  }
  const player = createBgmPlayerWithRuntime({ readBytes: read, readRoleBytes: read }, runtime)
  player.play('song')
  expect(runtime.initialize).toHaveBeenCalledTimes(1)
  const disposal = player.dispose()
  expect(player.dispose()).toBe(disposal)
  await disposal
  init.resolve(seq)
  await init.promise
  await Promise.resolve()
  player.play('another')
  player.setEnabled(true)
  player.resume()
  player.stop()
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(seq.pause).toHaveBeenCalledTimes(1)
  expect(read).not.toHaveBeenCalled()
  expect(seq.play).not.toHaveBeenCalled()
  expect(runtime.initialize).toHaveBeenCalledTimes(1)
  expect(runtime.context.resume).not.toHaveBeenCalled()
})
test('dispose during an actual song read prevents late playback, with a same-input positive control', async () => {
  for (const cancel of [false, true]) {
    const { seq, dispose } = fixture(),
      bytes = deferred<ArrayBuffer>(),
      entered = deferred<void>()
    const read = vi.fn(() => {
      entered.resolve()
      return bytes.promise
    })
    const player = createBgmPlayerWithRuntime(
      { readBytes: read, readRoleBytes: read },
      {
        context: { state: 'running', resume: async () => {} },
        initialize: async () => seq,
        dispose,
      },
    )
    player.play('song')
    await entered.promise
    if (cancel) await player.dispose()
    const song = new Uint8Array([1, 2, 3]).buffer
    bytes.resolve(song)
    await bytes.promise
    await Promise.resolve()
    expect(seq.play).toHaveBeenCalledTimes(cancel ? 0 : 1)
    if (!cancel)
      expect(seq.loadNewSongList).toHaveBeenCalledWith([{ binary: song, fileName: 'song' }])
    await player.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  }
})
