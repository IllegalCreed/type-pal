import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSpessaSynthBackend } from './audio-midi.js'

const media = vi.hoisted(() => ({
  sequencers: [] as Array<{
    loadNewSongList: ReturnType<typeof vi.fn>
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    loopCount: number
    isFinished: boolean
    eventHandler: { listeners: Map<string, (error?: Error) => void> }
  }>,
}))
vi.mock('spessasynth_lib', () => ({
  WorkletSynthesizer: class {
    soundBankManager = {
      addSoundBank: async (bytes: ArrayBuffer) => {
        structuredClone(bytes, { transfer: [bytes] })
      },
    }
    isReady = Promise.resolve()
    midiChannels = []
    connect() {}
    controllerChange() {}
  },
  Sequencer: class {
    eventHandler = {
      listeners: new Map<string, (error?: Error) => void>(),
      addEvent: (name: string, _id: string, callback: (error?: Error) => void) => {
        this.eventHandler.listeners.set(name, callback)
      },
      removeEvent: (name: string) => {
        this.eventHandler.listeners.delete(name)
      },
    }
    loadNewSongList = vi.fn(() => {
      queueMicrotask(() => this.eventHandler.listeners.get('songChange')?.())
    })
    play = vi.fn()
    pause = vi.fn()
    loopCount = 0
    isFinished = false
    constructor() {
      media.sequencers.push(this)
    }
  },
}))

class Context {
  static instances: Context[] = []
  state = 'running'
  destination = {}
  gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }
  audioWorklet = { addModule: async () => {} }
  close = vi.fn(async () => {})
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  constructor() {
    Context.instances.push(this)
  }
  createGain() {
    return this.gain
  }
}
function pending<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const sf = new Uint8Array(readFileSync('public/soundfont.sf3')).buffer
const midi = new Uint8Array([
  77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96, 77, 84, 114, 107, 0, 0, 0, 15, 0, 0xc0, 0, 0,
  0x90, 60, 64, 96, 0x80, 60, 0, 0, 0xff, 0x2f, 0,
]).buffer
const make = () =>
  createSpessaSynthBackend({
    baseUrl: '/extracted',
    workletUrl: '/midi.js',
    soundfontUrl: '/soundfont.sf3',
    soundfontData: Promise.resolve(sf),
  })
const response = () => new Response(midi.slice(0))
function controlledResponse() {
  const data = pending<ArrayBuffer>()
  const value = response()
  const read = vi.spyOn(value, 'arrayBuffer').mockImplementation(() => data.promise)
  return { value, read, complete: () => data.resolve(midi.slice(0)), finished: data.promise }
}

beforeEach(() => {
  Context.instances = []
  media.sequencers = []
  vi.stubGlobal('window', { AudioContext: Context })
})
afterEach(() => vi.unstubAllGlobals())

describe('MIDI backend lifecycle at media IO boundaries', () => {
  it('reloads A when returning to it while B is replacing the active sequence', async () => {
    const requests: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      requests.push(url)
      return response()
    })
    const backend = make()
    await backend.ready
    const seq = media.sequencers[0]!
    backend.play(49, true)
    await vi.waitFor(() => expect(seq.play).toHaveBeenCalledOnce())
    seq.loadNewSongList.mockImplementation((songs: Array<{ fileName: string }>) => {
      if (songs[0]?.fileName === '49.mid')
        queueMicrotask(() => seq.eventHandler.listeners.get('songChange')?.())
    })
    backend.play(3, false)
    await vi.waitFor(() => expect(seq.loadNewSongList).toHaveBeenCalledTimes(2))
    backend.play(49, true)
    seq.eventHandler.listeners.get('songChange')?.()
    await vi.waitFor(() => expect(seq.play).toHaveBeenCalledTimes(2))
    expect(seq.loadNewSongList.mock.calls.map(([songs]) => songs[0]?.fileName)).toEqual([
      '49.mid',
      '3.mid',
      '49.mid',
    ])
    expect(requests).toEqual([
      '/extracted/music/049.mid',
      '/extracted/music/003.mid',
      '/extracted/music/049.mid',
    ])
    expect(seq.loopCount).toBe(Infinity)
    backend.dispose?.()
  })
  it('drains an old parser failure before submitting the next song without failing the new source', async () => {
    const nextBody = controlledResponse()
    vi.stubGlobal('fetch', async (url: string) =>
      url.endsWith('/003.mid') ? nextBody.value : response(),
    )
    const backend = make()
    const failed = vi.fn()
    backend.setErrorHandler?.(failed)
    await backend.ready
    const seq = media.sequencers[0]!
    seq.loadNewSongList.mockImplementation((songs: Array<{ fileName: string }>) => {
      if (songs[0]?.fileName === '3.mid')
        queueMicrotask(() => seq.eventHandler.listeners.get('songChange')?.())
    })
    backend.play(49, true)
    await vi.waitFor(() => expect(seq.loadNewSongList).toHaveBeenCalledOnce())
    backend.play(3, false)
    await vi.waitFor(() => expect(nextBody.read).toHaveBeenCalledOnce())
    nextBody.complete()
    await nextBody.finished
    expect(seq.loadNewSongList).toHaveBeenCalledOnce()
    seq.eventHandler.listeners.get('midiError')?.(new Error('old parser failure'))
    await vi.waitFor(() => expect(seq.play).toHaveBeenCalledOnce())
    expect(seq.loadNewSongList).toHaveBeenCalledTimes(2)
    expect(failed).not.toHaveBeenCalled()
    expect(seq.loopCount).toBe(0)
    backend.dispose?.()
  })
  it('reports asynchronous MIDI parser errors delivered by the library worklet', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>not a MIDI file</html>'))
    const backend = make()
    const failed = vi.fn()
    backend.setErrorHandler?.(failed)
    await backend.ready
    const error = new Error('Malformed MIDI')
    media.sequencers[0]!.loadNewSongList.mockImplementation(() => {
      queueMicrotask(() => media.sequencers[0]?.eventHandler.listeners.get('midiError')?.(error))
    })
    backend.play(49, true)
    await vi.waitFor(() => expect(failed).toHaveBeenCalledExactlyOnceWith(error))
    expect(media.sequencers[0]?.play).not.toHaveBeenCalled()
    backend.dispose?.()
  })

  it('ignores a retired request rejection while the newer track remains playable', async () => {
    const old = pending<Response>()
    vi.stubGlobal('fetch', (url: string) =>
      url.endsWith('/049.mid') ? old.promise : Promise.resolve(response()),
    )
    const backend = make()
    const failed = vi.fn()
    backend.setErrorHandler?.(failed)
    await backend.ready
    backend.play(49, true)
    old.reject(new Error('old network failure'))
    backend.play(3, false)
    await vi.waitFor(() => expect(media.sequencers[0]?.play).toHaveBeenCalledOnce())
    expect(failed).not.toHaveBeenCalled()
    expect(media.sequencers[0]?.loadNewSongList).toHaveBeenCalledExactlyOnceWith([
      { binary: midi.slice(0), fileName: '3.mid' },
    ])
    backend.dispose?.()
  })
  it('unlocks the latest queued music once when a user gesture resumes a suspended context', async () => {
    vi.stubGlobal('fetch', async () => response())
    const backend = make()
    await backend.ready
    const ctx = Context.instances[0]!
    ctx.state = 'suspended'
    const gesture = pending<void>()
    ctx.resume.mockImplementation(async () => {
      await gesture.promise
      ctx.state = 'running'
    })
    backend.play(49, true)
    backend.play(3, false)
    backend.resume?.()
    backend.resume?.()
    gesture.resolve()
    await vi.waitFor(() => expect(media.sequencers[0]?.play).toHaveBeenCalledOnce())
    expect(media.sequencers[0]?.loadNewSongList).toHaveBeenCalledExactlyOnceWith([
      { binary: midi.slice(0), fileName: '3.mid' },
    ])
    expect(media.sequencers[0]?.loopCount).toBe(0)
    backend.dispose?.()
  })

  it('reports a track load failure to the current source rather than silently keeping ready status', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))
    const backend = make()
    const failed = vi.fn()
    backend.setErrorHandler?.(failed)
    await backend.ready
    backend.play(49, true)
    await vi.waitFor(() =>
      expect(failed).toHaveBeenCalledExactlyOnceWith(new Error('MIDI 曲目 49 加载失败 (404)')),
    )
    backend.dispose?.()
  })
  it('keeps gain instance-local and closes/disconnects disposed output once', async () => {
    const first = make(),
      second = make()
    first.setVolume?.(0)
    second.setVolume?.(0.3)
    await Promise.all([first.ready, second.ready])
    expect(Context.instances.map((ctx) => ctx.gain.gain.value)).toEqual([0, 0.3])
    first.dispose?.()
    first.dispose?.()
    expect(Context.instances[0]?.close).toHaveBeenCalledOnce()
    expect(Context.instances[0]?.gain.disconnect).toHaveBeenCalledOnce()
    expect(Context.instances[1]?.close).not.toHaveBeenCalled()
    second.dispose?.()
  })

  it('does not play a fetch response that arrives after stop', async () => {
    const request = pending<Response>()
    vi.stubGlobal('fetch', () => request.promise)
    const backend = make()
    await backend.ready
    backend.play(49, true)
    backend.stop()
    const body = controlledResponse()
    request.resolve(body.value)
    await vi.waitFor(() => expect(body.read).toHaveBeenCalledOnce())
    body.complete()
    await body.finished
    expect(media.sequencers[0]?.loadNewSongList).not.toHaveBeenCalled()
    expect(media.sequencers[0]?.play).not.toHaveBeenCalled()
    backend.dispose?.()
  })

  it('a newer track wins when the earlier request resolves last', async () => {
    const old = pending<Response>()
    vi.stubGlobal('fetch', (url: string) =>
      url.endsWith('/049.mid') ? old.promise : Promise.resolve(response()),
    )
    const backend = make()
    await backend.ready
    backend.play(49, true)
    backend.play(3, false)
    await vi.waitFor(() => expect(media.sequencers[0]?.play).toHaveBeenCalledOnce())
    const body = controlledResponse()
    old.resolve(body.value)
    await vi.waitFor(() => expect(body.read).toHaveBeenCalledOnce())
    body.complete()
    await body.finished
    expect(media.sequencers[0]?.loadNewSongList).toHaveBeenCalledExactlyOnceWith([
      { binary: midi.slice(0), fileName: '3.mid' },
    ])
    expect(media.sequencers[0]?.loopCount).toBe(0)
    backend.dispose?.()
  })

  it('does not complete initialization or revive queued music after disposal', async () => {
    const soundfont = pending<ArrayBuffer>()
    const backend = createSpessaSynthBackend({
      baseUrl: '/extracted',
      workletUrl: '/midi.js',
      soundfontUrl: '/soundfont.sf3',
      soundfontData: soundfont.promise,
    })
    backend.play(18, true)
    backend.dispose?.()
    soundfont.resolve(sf)
    await backend.ready
    expect(media.sequencers).toEqual([])
    expect(Context.instances[0]?.close).toHaveBeenCalledOnce()
  })

  it('updates a loaded track loop flag without refetching or restarting it', async () => {
    const fetch = vi.fn(async () => response())
    vi.stubGlobal('fetch', fetch)
    const backend = make()
    await backend.ready
    backend.play(2, true)
    await vi.waitFor(() => expect(media.sequencers[0]?.play).toHaveBeenCalledOnce())
    backend.play(2, false)
    expect(fetch).toHaveBeenCalledOnce()
    expect(media.sequencers[0]?.play).toHaveBeenCalledOnce()
    expect(media.sequencers[0]?.loopCount).toBe(0)
    backend.dispose?.()
  })
  it('restarts a naturally finished track when its loop intention changes', async () => {
    vi.stubGlobal('fetch', async () => response())
    const backend = make()
    await backend.ready
    backend.play(2, false)
    await vi.waitFor(() => expect(media.sequencers[0]?.play).toHaveBeenCalledOnce())
    const seq = media.sequencers[0]!
    seq.isFinished = true
    backend.play(2, true)
    await vi.waitFor(() => expect(seq.play).toHaveBeenCalledTimes(2))
    expect(seq.loopCount).toBe(Infinity)
    backend.dispose?.()
  })
})
