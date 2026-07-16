import { describe, expect, test, vi } from 'vitest'
import {
  type AudioAssetReader,
  type BgmRuntimeAdapter,
  type BgmSequencerAdapter,
  createBgmPlayerWithRuntime,
} from './bgm.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function sequencer() {
  return {
    pause: vi.fn<() => void>(),
    loadNewSongList: vi.fn<(songs: Array<{ binary: ArrayBuffer; fileName: string }>) => void>(),
    loopCount: 0,
    play: vi.fn<() => void>(),
  } satisfies BgmSequencerAdapter
}

function reader(readBytes = vi.fn(async () => new ArrayBuffer(4))): AudioAssetReader {
  return {
    readBytes,
    readRoleBytes: vi.fn(async () => new ArrayBuffer(4)),
  }
}

function runtime(initialize: BgmRuntimeAdapter['initialize']): BgmRuntimeAdapter {
  return {
    context: { state: 'running', resume: vi.fn(async () => {}) },
    initialize,
  }
}

describe('BgmPlayer 生命周期', () => {
  test('soundfont 初始化未完成时 stop 清账，初始化完成后不迟到补播', async () => {
    const pending = deferred<BgmSequencerAdapter>()
    const backend = sequencer()
    const assets = reader()
    const player = createBgmPlayerWithRuntime(
      assets,
      runtime(() => pending.promise),
    )

    player.play('music.menu', true)
    player.stop()
    pending.resolve(backend)
    await pending.promise
    await Promise.resolve()

    expect(assets.readBytes).not.toHaveBeenCalled()
    expect(backend.play).not.toHaveBeenCalled()
  })

  test('MIDI 字节读取未完成时 stop 同样取消迟到播放', async () => {
    const pendingBytes = deferred<ArrayBuffer>()
    const backend = sequencer()
    const assets = reader(vi.fn(() => pendingBytes.promise))
    const player = createBgmPlayerWithRuntime(
      assets,
      runtime(async () => backend),
    )

    player.play('music.menu', true)
    await vi.waitFor(() => expect(assets.readBytes).toHaveBeenCalledOnce())
    player.stop()
    pendingBytes.resolve(new ArrayBuffer(4))
    await pendingBytes.promise
    await Promise.resolve()

    expect(backend.play).not.toHaveBeenCalled()
  })

  test('音乐开关停播留账可续播，stop 清账后不再恢复', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )

    player.play('music.scene', false)
    await vi.waitFor(() => expect(backend.play).toHaveBeenCalledTimes(1))
    expect(backend.loopCount).toBe(0)

    player.setEnabled(false)
    player.setEnabled(true)
    await vi.waitFor(() => expect(backend.play).toHaveBeenCalledTimes(2))

    player.stop()
    player.setEnabled(false)
    player.setEnabled(true)
    await Promise.resolve()
    expect(backend.play).toHaveBeenCalledTimes(2)
  })
})
