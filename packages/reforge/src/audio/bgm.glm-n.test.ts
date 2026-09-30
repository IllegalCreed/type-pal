// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  type AudioAssetReader,
  type BgmRuntimeAdapter,
  type BgmSequencerAdapter,
  createBgmPlayer,
  createBgmPlayerWithRuntime,
} from './bgm.js'

afterEach(() => {
  vi.restoreAllMocks()
})

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

function runtime(initialize: BgmRuntimeAdapter['initialize']): BgmRuntimeAdapter {
  return {
    context: { state: 'running', resume: vi.fn(async () => {}) },
    initialize,
  }
}

function reader(readBytes = vi.fn(async () => new ArrayBuffer(4))): AudioAssetReader {
  return {
    readBytes,
    readRoleBytes: vi.fn(async () => new ArrayBuffer(4)),
  }
}

describe('N02 BGM 生产工厂在缺失音源环境下的精确形态', () => {
  test('无 AudioContext 的浏览器环境：createBgmPlayer 返回可安全调用的静音播放器', async () => {
    // jsdom 无 AudioContext/webkitAudioContext → createBrowserBgmRuntime 返回 undefined。
    expect(window.AudioContext).toBeUndefined()
    expect((window as { webkitAudioContext?: unknown }).webkitAudioContext).toBeUndefined()
    const player = createBgmPlayer(reader())
    expect(() => {
      player.play('music.any')
      player.play('music.any', false, 300)
      player.setEnabled(false)
      player.setEnabled(true)
      player.resume()
      player.stop(500)
      player.stop()
    }).not.toThrow()
    await expect(player.dispose()).resolves.toBeUndefined()
    // dispose 后继续调用同样安全（终态 no-op）。
    expect(() => {
      player.play('music.any')
      player.setEnabled(false)
    }).not.toThrow()
  })
})

describe('N02 BGM 后端初始化失败降级', () => {
  test('initialize 拒绝 → 静默告警、不抛出、init 不重试，播放器仍可关闭', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const initialize = vi.fn(async () => {
      throw new Error('worklet unavailable')
    })
    const assets = reader()
    const player = createBgmPlayerWithRuntime(assets, runtime(initialize))
    player.play('music.menu')
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
    expect(warn.mock.calls[0]?.[0]).toBe('[bgm] ✗ MIDI 后端初始化失败 → BGM 静默:')
    expect(initialize).toHaveBeenCalledTimes(1)
    // 同曲/换曲继续请求不重试 init，也不再读取资源。
    player.play('music.other')
    await new Promise<void>((resolve) => setTimeout(resolve, 20))
    expect(initialize).toHaveBeenCalledTimes(1)
    expect(assets.readBytes).not.toHaveBeenCalled()
    await expect(player.dispose()).resolves.toBeUndefined()
  })
})

describe('N02 BGM dispose 与迟到初始化的释放次序', () => {
  test('初始化悬置期间 dispose：迟到后端只被 pause，不读取、不播放任何曲', async () => {
    const pending = {
      promise: new Promise<BgmSequencerAdapter>(() => {}),
    } as { promise: Promise<BgmSequencerAdapter>; release?: (seq: BgmSequencerAdapter) => void }
    pending.promise = new Promise<BgmSequencerAdapter>((resolve) => {
      pending.release = resolve
    })
    const backend = sequencer()
    const assets = reader()
    const player = createBgmPlayerWithRuntime(
      assets,
      runtime(() => pending.promise),
    )
    player.play('music.menu')
    await expect(player.dispose()).resolves.toBeUndefined()
    pending.release?.(backend)
    await pending.promise
    await new Promise<void>((resolve) => setTimeout(resolve, 20))
    expect(backend.pause).toHaveBeenCalledTimes(1)
    expect(backend.loadNewSongList).not.toHaveBeenCalled()
    expect(backend.play).not.toHaveBeenCalled()
    expect(assets.readBytes).not.toHaveBeenCalled()
    // dispose 后 play 不复活任何后端交互。
    player.play('music.menu')
    await new Promise<void>((resolve) => setTimeout(resolve, 20))
    expect(backend.play).not.toHaveBeenCalled()
  })
})
