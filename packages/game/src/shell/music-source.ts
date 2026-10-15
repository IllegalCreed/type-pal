import type { MusicBackend } from './audio.js'

export type MusicSource = 'midi' | 'rix'
export interface MusicSourceState {
  source: MusicSource
  status: 'loading' | 'ready' | 'error'
  error?: string
}
export interface MusicSourceController extends MusicBackend {
  getState(): MusicSourceState
  setSource(source: MusicSource): void
  subscribe(listener: (state: MusicSourceState) => void): () => void
}
export const MUSIC_SOURCE_KEY = 'tp-music-source'

export function readMusicSource(storage?: Pick<Storage, 'getItem'>): MusicSource {
  try {
    return (storage ?? localStorage).getItem(MUSIC_SOURCE_KEY) === 'rix' ? 'rix' : 'midi'
  } catch {
    return 'midi'
  }
}

/** Keeps the shell's effective music intention across backend replacement. */
export function createMusicSourceController(
  factory: (source: MusicSource) => MusicBackend,
  source: MusicSource,
  storage?: Pick<Storage, 'setItem'>,
): MusicSourceController {
  let state: MusicSourceState = { source, status: 'loading' }
  let backend: MusicBackend | undefined
  let volume = 0
  let last: { track: number; loop: boolean } | undefined
  let disposed = false
  let generation = 0
  const listeners = new Set<(state: MusicSourceState) => void>()
  const publish = (): void => {
    for (const listener of listeners) listener({ ...state })
  }
  const select = (selected: MusicSource): void => {
    if (disposed) return
    const token = ++generation
    backend?.stop()
    backend?.dispose?.()
    backend = undefined
    state = { source: selected, status: 'loading' }
    publish()
    const fail = (error: unknown): void => {
      if (disposed || token !== generation || state.status === 'error') return
      backend?.stop()
      backend?.dispose?.()
      backend = undefined
      state = { source: selected, status: 'error', error: String(error) }
      publish()
    }
    try {
      backend = factory(selected)
      backend.setErrorHandler?.(fail)
      backend.setVolume?.(volume)
      backend.resume?.()
      if (last) backend.play(last.track, last.loop)
      void Promise.resolve(backend.ready).then(() => {
        if (disposed || token !== generation || state.status === 'error') return
        state = { source: selected, status: 'ready' }
        publish()
      }, fail)
    } catch (error) {
      fail(error)
    }
  }
  select(source)
  return {
    getState: () => ({ ...state }),
    setSource(selected) {
      if (selected === state.source && state.status !== 'error') return
      try {
        ;(storage ?? localStorage).setItem(MUSIC_SOURCE_KEY, selected)
      } catch {
        // A blocked browser preference store does not prevent playback.
      }
      select(selected)
    },
    subscribe(listener) {
      listeners.add(listener)
      listener({ ...state })
      return () => listeners.delete(listener)
    },
    play(track, loop) {
      if (disposed) return
      last = { track, loop }
      backend?.play(track, loop)
    },
    stop() {
      last = undefined
      backend?.stop()
    },
    resume() {
      backend?.resume?.()
    },
    setVolume(value) {
      volume = value
      backend?.setVolume?.(value)
    },
    dispose() {
      if (disposed) return
      disposed = true
      generation++
      last = undefined
      backend?.stop()
      backend?.dispose?.()
      backend = undefined
      listeners.clear()
    },
  }
}
