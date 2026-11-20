import { afterEach, expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/glm-runtime-contract-fixtures.js'
import {
  type AudioAssetReader,
  type BgmRuntimeAdapter,
  type BgmSequencerAdapter,
  createBgmPlayerWithRuntime,
} from './bgm.js'

afterEach(() => vi.restoreAllMocks())

function harness(context: BgmRuntimeAdapter['context'] = { state: 'running', async resume() {} }) {
  const loads: Array<{ fileName: string; bytes: number[] }> = []
  const sequencer = {
    pause: vi.fn(),
    loadNewSongList(songs: Array<{ binary: ArrayBuffer; fileName: string }>) {
      for (const song of songs) {
        loads.push({ fileName: song.fileName, bytes: [...new Uint8Array(song.binary)] })
      }
    },
    play: vi.fn(),
    fadeTo: vi.fn(),
    cancelFade: vi.fn(),
    loopCount: 0,
  } satisfies BgmSequencerAdapter
  const initialization = deferred<BgmSequencerAdapter>()
  const runtime = { context, initialize: () => initialization.promise } satisfies BgmRuntimeAdapter
  return { runtime, sequencer, loads, initialization }
}

function noteBytes(pitch: number): ArrayBuffer {
  return Uint8Array.from([
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    0,
    96,
    0x4d,
    0x54,
    0x72,
    0x6b,
    0,
    0,
    0,
    12,
    0,
    0x90,
    pitch,
    64,
    96,
    0x80,
    pitch,
    64,
    0,
    0xff,
    0x2f,
    0,
  ]).buffer
}

function score(fileName: string, pitch: number) {
  return { fileName, bytes: [...new Uint8Array(noteBytes(pitch))] }
}

function reader(readBytes: AudioAssetReader['readBytes']): AudioAssetReader {
  return {
    readBytes,
    async readRoleBytes() {
      throw new Error('the injected backend does not read the soundfont')
    },
  }
}

test('coalesces pending resume requests and plays the score after a successful retry', async () => {
  const first = deferred<void>()
  const retry = deferred<void>()
  let state: AudioContextState = 'running'
  const resume = vi.fn<() => Promise<void>>(async () => {
    throw new Error('unexpected extra resume')
  })
  resume.mockReturnValueOnce(first.promise)
  resume.mockImplementationOnce(async () => {
    await retry.promise
    state = 'running'
  })
  const h = harness({
    get state() {
      return state
    },
    resume,
  })
  const player = createBgmPlayerWithRuntime(
    reader(async () => noteBytes(60)),
    h.runtime,
  )
  try {
    player.play('music.menu')
    h.initialization.resolve(h.sequencer)
    await vi.waitFor(() => expect(h.loads).toEqual([score('music.menu', 60)]))
    state = 'suspended'

    player.resume()
    player.resume()
    player.resume()
    expect(resume).toHaveBeenCalledOnce()
    first.reject(new Error('autoplay denied'))
    await first.promise.catch(() => {})
    await Promise.resolve()
    expect(h.sequencer.play).toHaveBeenCalledOnce()

    player.resume()
    expect(resume).toHaveBeenCalledTimes(2)
    expect(state).toBe('suspended')
    retry.resolve()
    await vi.waitFor(() => expect(h.sequencer.play).toHaveBeenCalledTimes(2))
    expect(state).toBe('running')
    expect(h.loads).toEqual([score('music.menu', 60), score('music.menu', 60)])
  } finally {
    await player.dispose()
  }
})

test('while the backend initializes, only the latest request reads and starts a score', async () => {
  const h = harness()
  const readBytes = vi.fn(async () => noteBytes(62))
  const player = createBgmPlayerWithRuntime(reader(readBytes), h.runtime)
  try {
    player.play('music.old')
    player.play('music.latest')
    expect(readBytes).not.toHaveBeenCalled()

    h.initialization.resolve(h.sequencer)
    await vi.waitFor(() => expect(h.sequencer.play).toHaveBeenCalledOnce())
    expect(readBytes).toHaveBeenCalledExactlyOnceWith('music.latest', 'music')
    expect(h.loads).toEqual([score('music.latest', 62)])
  } finally {
    await player.dispose()
  }
})

test('an earlier read that finishes after the next score cannot replace it', async () => {
  const h = harness()
  const oldRead = deferred<ArrayBuffer>()
  const readBytes = vi.fn(async (asset: string) => {
    if (asset === 'music.old') return oldRead.promise
    return noteBytes(asset === 'music.current' ? 60 : 62)
  })
  const player = createBgmPlayerWithRuntime(reader(readBytes), h.runtime)
  try {
    player.play('music.current')
    h.initialization.resolve(h.sequencer)
    await vi.waitFor(() => expect(h.sequencer.play).toHaveBeenCalledOnce())

    player.play('music.old', false)
    expect(readBytes.mock.calls).toEqual([
      ['music.current', 'music'],
      ['music.old', 'music'],
    ])
    player.play('music.latest')
    await vi.waitFor(() => expect(h.sequencer.play).toHaveBeenCalledTimes(2))
    const expected = [score('music.current', 60), score('music.latest', 62)]
    expect(h.loads).toEqual(expected)

    oldRead.resolve(noteBytes(61))
    await oldRead.promise
    await Promise.resolve()
    await Promise.resolve()
    expect(h.loads).toEqual(expected)
    expect(h.sequencer.play).toHaveBeenCalledTimes(2)
    expect(readBytes.mock.calls).toEqual([
      ['music.current', 'music'],
      ['music.old', 'music'],
      ['music.latest', 'music'],
    ])
  } finally {
    oldRead.resolve(noteBytes(61))
    await player.dispose()
  }
})

test('a score read failure reports its asset and error, and the same score can be retried', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const h = harness()
  const failure = new Error('disk error')
  const readBytes = vi.fn(async () => noteBytes(64)).mockRejectedValueOnce(failure)
  const player = createBgmPlayerWithRuntime(reader(readBytes), h.runtime)
  try {
    player.play('music.retry')
    h.initialization.resolve(h.sequencer)
    await vi.waitFor(() =>
      expect(warn.mock.calls).toEqual([['[bgm] MIDI AssetId music.retry 读取失败', failure]]),
    )
    expect(h.loads).toEqual([])
    expect(h.sequencer.play).not.toHaveBeenCalled()

    player.play('music.retry')
    await vi.waitFor(() => expect(h.sequencer.play).toHaveBeenCalledOnce())
    expect(h.loads).toEqual([score('music.retry', 64)])
    expect(readBytes.mock.calls).toEqual([
      ['music.retry', 'music'],
      ['music.retry', 'music'],
    ])
  } finally {
    await player.dispose()
  }
})
