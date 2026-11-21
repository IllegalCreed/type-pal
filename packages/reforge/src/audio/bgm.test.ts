import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
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
    fadeTo: vi.fn<(value: number, ms: number) => void>(),
    cancelFade: vi.fn<() => void>(),
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

describe('Encounter score preparation', () => {
  test('launching without browser audio does not read or play the score', async () => {
    const assets = reader()
    const player = createBgmPlayerWithRuntime(assets, undefined)
    const launch = await player.prepare('music.battle', new AbortController().signal)
    launch()
    expect(assets.readBytes).not.toHaveBeenCalled()
    await player.dispose()
  })

  test('disabled music does not prepare and still records the battle score for re-enable', async () => {
    const backend = sequencer()
    const assets = reader()
    const initialize = vi.fn(async () => backend)
    const player = createBgmPlayerWithRuntime(assets, runtime(initialize))
    try {
      player.setEnabled(false)
      const start = await player.prepare('music.battle', new AbortController().signal)
      start()
      expect(initialize).not.toHaveBeenCalled()
      expect(assets.readBytes).not.toHaveBeenCalled()
      player.setEnabled(true)
      await vi.waitFor(() =>
        expect(backend.loadNewSongList).toHaveBeenCalledExactlyOnceWith([
          { binary: expect.any(ArrayBuffer), fileName: 'music.battle' },
        ]),
      )
    } finally {
      await player.dispose()
    }
  })

  test('a canceled preload cannot play or replace the next requested score', async () => {
    const bytes = deferred<ArrayBuffer>()
    const backend = sequencer()
    const read = vi.fn((asset: string) =>
      asset === 'music.old-battle' ? bytes.promise : Promise.resolve(new ArrayBuffer(4)),
    )
    const player = createBgmPlayerWithRuntime(
      { readBytes: read, readRoleBytes: async () => new ArrayBuffer(0) },
      runtime(async () => backend),
    )
    const owner = new AbortController()
    vi.useFakeTimers()
    try {
      const pending = player.prepare('music.old-battle', owner.signal)
      expect(read).toHaveBeenCalledExactlyOnceWith('music.old-battle', 'music')
      owner.abort()
      const canceled = await pending
      player.play('music.current-world')
      await vi.advanceTimersByTimeAsync(0)
      expect(backend.play).toHaveBeenCalledOnce()
      bytes.resolve(new ArrayBuffer(4))
      canceled()
      // Drain the playback continuation as well as the shared bytes promise.
      await vi.advanceTimersByTimeAsync(0)
      expect(backend.loadNewSongList).toHaveBeenCalledExactlyOnceWith([
        { binary: expect.any(ArrayBuffer), fileName: 'music.current-world' },
      ])
      expect(backend.play).toHaveBeenCalledOnce()
    } finally {
      bytes.resolve(new ArrayBuffer(4))
      await player.dispose()
      vi.useRealTimers()
    }
  })

  test('pending audio cannot keep the encounter waiting past its preparation deadline', async () => {
    vi.useFakeTimers()
    const bytes = deferred<ArrayBuffer>()
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(vi.fn(() => bytes.promise)),
      runtime(async () => backend),
    )
    try {
      const pending = player.prepare('music.battle', new AbortController().signal)
      let completed = false
      void pending.then(() => {
        completed = true
      })
      await vi.advanceTimersByTimeAsync(999)
      expect(completed).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(completed).toBe(true)
      expect(backend.play).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      bytes.resolve(new ArrayBuffer(4))
      await player.dispose()
      vi.useRealTimers()
    }
  })
})

describe('BgmPlayer fade transitions', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  test('换曲串行:fade-out 完成(过 isCurrent 门)后才 load 新曲 + fade-in', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    player.play('music.b', true, 100)
    // 旧曲 fade-out 先调度,新曲尚未 load。
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.fadeTo).toHaveBeenCalledWith(0, 100)
    expect(backend.loadNewSongList).toHaveBeenCalledTimes(1) // 仅 A
    await vi.advanceTimersByTimeAsync(99)
    expect(backend.loadNewSongList).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(backend.loadNewSongList).toHaveBeenCalledTimes(2)
    expect(backend.loadNewSongList).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ fileName: 'music.b' })]),
    )
    expect(backend.fadeTo).toHaveBeenLastCalledWith(1, 100)
  })

  test('fade-out 期间新 play 立即接管,旧 fade 完成回调不误停/不误换', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    player.play('music.b', true, 100) // A→B fade 窗口
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.fadeTo).toHaveBeenCalledWith(0, 100)
    player.play('music.c', true, 0) // 立即接管
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(2)
    // B 从未 load;最终只有 A、C 两次 load;fade 完成后无多余 pause。
    const loaded = backend.loadNewSongList.mock.calls.map((c) => c[0][0]?.fileName)
    expect(loaded.filter((n) => n === 'music.b')).toHaveLength(0)
    expect(loaded.filter((n) => n === 'music.c')).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(100)
    expect(backend.pause).not.toHaveBeenCalled()
  })

  test('stop 淡出期间的换曲接管不会被旧计时器暂停', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    player.stop(100)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.fadeTo).toHaveBeenCalledWith(0, 100)
    player.play('music.b', true, 0) // 淡出期间接管
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(100)
    expect(backend.pause).not.toHaveBeenCalled() // stop 完成回调被 serial 门拦下
  })

  test('换曲窗口内 play 旧曲 → 取消进行中换曲,旧曲续播、记账一致', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    player.play('music.b', true, 100) // A→B 窗口
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.fadeTo).toHaveBeenCalledWith(0, 100)
    player.play('music.a', true, 0) // 同曲守卫命中 + inflight=B → 取消 B
    await vi.advanceTimersByTimeAsync(100)
    const loaded = backend.loadNewSongList.mock.calls.map((c) => c[0][0]?.fileName)
    expect(loaded.filter((n) => n === 'music.b')).toHaveLength(0) // B 不播
    expect(loaded.filter((n) => n === 'music.a')).toHaveLength(1) // A 未重载(续播)
    expect(backend.cancelFade).toHaveBeenCalled()
    expect(backend.fadeTo).toHaveBeenLastCalledWith(1, 0)
  })

  test('stop fade 窗口内重申同曲 → 接管 timer、恢复增益且不暂停/重载', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    player.stop(100)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.fadeTo).toHaveBeenCalledWith(0, 100)
    player.play('music.a', true, 0)
    await vi.advanceTimersByTimeAsync(100)

    expect(backend.cancelFade).toHaveBeenCalled()
    expect(backend.fadeTo).toHaveBeenLastCalledWith(1, 0)
    expect(backend.pause).not.toHaveBeenCalled()
    expect(backend.loadNewSongList).toHaveBeenCalledTimes(1)
    expect(backend.play).toHaveBeenCalledTimes(1)
  })

  test('记账含 fadeInMs,re-enable 补播仍走 fade-in', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true, 100)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    player.setEnabled(false)
    player.setEnabled(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(2)
    expect(backend.fadeTo).toHaveBeenLastCalledWith(1, 100)
  })

  test('fade 期间 setEnabled(false) → cancelFade + 归零 + 不残留换曲', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    player.play('music.b', true, 100)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.fadeTo).toHaveBeenCalledWith(0, 100)
    player.setEnabled(false)
    expect(backend.cancelFade).toHaveBeenCalled()
    expect(backend.fadeTo).toHaveBeenCalledWith(0, 0)
    await vi.advanceTimersByTimeAsync(100)
    const loaded = backend.loadNewSongList.mock.calls.map((c) => c[0][0]?.fileName)
    expect(loaded.filter((n) => n === 'music.b')).toHaveLength(0)
  })

  test('fadeInMs=0 走快捷路径(不回全增益 ramp 序列,直接 setValueAtTime 语义)', async () => {
    const backend = sequencer()
    const player = createBgmPlayerWithRuntime(
      reader(),
      runtime(async () => backend),
    )
    player.play('music.a', true, 0)
    await vi.advanceTimersByTimeAsync(0)
    expect(backend.play).toHaveBeenCalledTimes(1)
    // 首次播放:无旧曲,fadeTo(1, 0) 快捷回全增益,不调度 fade-out。
    expect(backend.fadeTo).toHaveBeenLastCalledWith(1, 0)
    expect(backend.fadeTo).not.toHaveBeenCalledWith(0, expect.anything())
  })
})
