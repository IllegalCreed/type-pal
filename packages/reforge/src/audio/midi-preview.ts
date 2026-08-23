import type { AssetId } from '@type-pal/content'
import type { NoteTime } from 'spessasynth_core'
import type { AudioAssetReader } from './bgm.js'
import { initializeBrowserSpessaSynth } from './spessa-browser-runtime.js'

export interface MidiNoteActivity {
  kind: 'note-activity'
  duration: number
  buckets: readonly number[]
  noteCount: number
}

export interface MidiPreviewSnapshot {
  asset?: AssetId
  currentTime: number
  duration: number
  paused: boolean
}

export interface MidiPreviewTransport {
  load(
    asset: AssetId,
    cacheKey?: string,
    cachedActivity?: MidiNoteActivity,
  ): Promise<MidiNoteActivity>
  play(): Promise<void>
  pause(): void
  stop(): void
  seek(seconds: number): void
  snapshot(): MidiPreviewSnapshot
  dispose(): void
}

export interface MidiPreviewSequencerAdapter {
  load(binary: ArrayBuffer, fileName: string): void
  play(): void
  pause(): void
  currentTime: number
  readonly duration: number
  readonly paused: boolean
  readonly finished: boolean
}

export interface MidiPreviewRuntimeAdapter {
  context: {
    readonly state: AudioContextState
    resume(): Promise<void>
  }
  initialize(): Promise<MidiPreviewSequencerAdapter>
  dispose(): void
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))

/** MIDI 可视化只表达音符活动，不冒充 PCM 振幅。 */
export function createMidiNoteActivity(
  notes: readonly (Pick<NoteTime, 'start' | 'length' | 'velocity'> & { midiNote?: number })[],
  duration: number,
  bucketCount = 160,
): MidiNoteActivity {
  const safeDuration = Math.max(0, Number.isFinite(duration) ? duration : 0)
  const count = Math.max(1, Math.floor(bucketCount))
  const values = Array.from({ length: count }, () => 0)
  if (safeDuration <= 0 || notes.length === 0)
    return { kind: 'note-activity', duration: safeDuration, buckets: values, noteCount: notes.length }

  for (const note of notes) {
    const start = clamp(note.start, 0, safeDuration)
    const end = clamp(note.start + Math.max(note.length, 0.01), start, safeDuration)
    const first = clamp(Math.floor((start / safeDuration) * count), 0, count - 1)
    const last = clamp(Math.floor((end / safeDuration) * count), first, count - 1)
    const weight = clamp(note.velocity / 127, 0.05, 1)
    for (let bucket = first; bucket <= last; bucket++) values[bucket]! += weight
  }
  const peak = Math.max(1, ...values)
  return {
    kind: 'note-activity',
    duration: safeDuration,
    buckets: values.map((value) => value / peak),
    noteCount: notes.length,
  }
}

export async function analyzeMidiBytes(
  bytes: ArrayBuffer,
  bucketCount = 160,
): Promise<MidiNoteActivity> {
  const { BasicMIDI } = await import('spessasynth_core')
  const midi = BasicMIDI.fromArrayBuffer(bytes.slice(0), 'preview.mid')
  const notes = midi.getNoteTimes().flat()
  return createMidiNoteActivity(notes, midi.duration, bucketCount)
}

export function createBrowserMidiPreviewRuntime(
  resolver: AudioAssetReader,
): MidiPreviewRuntimeAdapter | undefined {
  const browser =
    typeof window === 'undefined'
      ? undefined
      : (window as unknown as {
          AudioContext?: typeof AudioContext
          webkitAudioContext?: typeof AudioContext
        })
  const AudioCtor = browser?.AudioContext ?? browser?.webkitAudioContext
  if (!AudioCtor) return undefined
  const context = new AudioCtor()
  let disposed = false
  let sequencer: MidiPreviewSequencerAdapter | undefined
  let synth: { destroy(): void; disconnect(): void } | undefined
  let initializePromise: Promise<MidiPreviewSequencerAdapter> | undefined

  return {
    context,
    async initialize() {
      if (disposed) throw new DOMException('MIDI 试听已关闭', 'AbortError')
      if (sequencer) return sequencer
      initializePromise ??= (async () => {
        const { Sequencer } = await import('spessasynth_lib')
        const workletSynth = await initializeBrowserSpessaSynth(
          context,
          resolver,
          context.destination,
          'preview',
        )
        if (disposed) {
          workletSynth.destroy()
          throw new DOMException('MIDI 试听已关闭', 'AbortError')
        }
        synth = workletSynth
        const instance = new Sequencer(workletSynth, { skipToFirstNoteOn: false })
        const adapter: MidiPreviewSequencerAdapter = {
          load(binary, fileName) {
            instance.loadNewSongList([{ binary, fileName }])
            instance.loopCount = 0
          },
          play: () => instance.play(),
          pause: () => instance.pause(),
          get currentTime() {
            return instance.currentTime
          },
          set currentTime(value: number) {
            instance.currentTime = value
          },
          get duration() {
            return instance.duration
          },
          get paused() {
            return instance.paused
          },
          get finished() {
            return instance.isFinished
          },
        }
        sequencer = adapter
        return adapter
      })().catch((cause: unknown) => {
        initializePromise = undefined
        throw cause
      })
      return initializePromise
    },
    dispose() {
      if (disposed) return
      disposed = true
      sequencer?.pause()
      synth?.destroy()
      void context.close()
      sequencer = undefined
      synth = undefined
    },
  }
}

export function createMidiPreviewTransport(
  resolver: AudioAssetReader,
  providedRuntime?: MidiPreviewRuntimeAdapter,
): MidiPreviewTransport {
  let runtime = providedRuntime
  let runtimeResolved = providedRuntime !== undefined
  let serial = 0
  let playSerial = 0
  let disposed = false
  let asset: AssetId | undefined
  let bytes: ArrayBuffer | undefined
  let activity: MidiNoteActivity | undefined
  let position = 0
  let hasExplicitPosition = false
  let sequencer: MidiPreviewSequencerAdapter | undefined
  let loadedAsset: AssetId | undefined
  let initializePromise: Promise<MidiPreviewSequencerAdapter> | undefined
  let playPromise: { serial: number; promise: Promise<void> } | undefined
  let loadedKey: string | undefined
  let loadPromise: { key: string; promise: Promise<MidiNoteActivity> } | undefined

  const getRuntime = (): MidiPreviewRuntimeAdapter | undefined => {
    if (!runtimeResolved) {
      runtime = createBrowserMidiPreviewRuntime(resolver)
      runtimeResolved = true
    }
    return runtime
  }

  const cancelPendingPlay = (): void => {
    playSerial++
    playPromise = undefined
  }

  const duration = (): number => activity?.duration ?? sequencer?.duration ?? 0
  const loadSequencer = (): void => {
    if (!sequencer || !asset || !bytes || loadedAsset === asset) return
    sequencer.pause()
    sequencer.load(bytes.slice(0), asset)
    sequencer.currentTime = clamp(position, 0, duration())
    hasExplicitPosition = true
    loadedAsset = asset
  }
  const ensureSequencer = async (): Promise<MidiPreviewSequencerAdapter> => {
    if (!runtime) throw new Error('当前浏览器不支持 MIDI 试听。')
    if (sequencer) return sequencer
    initializePromise ??= runtime.initialize().catch((cause: unknown) => {
      initializePromise = undefined
      throw cause
    })
    const initialized = await initializePromise
    if (disposed) throw new DOMException('MIDI 试听已关闭', 'AbortError')
    sequencer = initialized
    loadSequencer()
    return sequencer
  }

  return {
    async load(nextAsset, cacheKey = nextAsset, cachedActivity) {
      if (asset === nextAsset && loadedKey === cacheKey && bytes && activity) return activity
      if (asset === nextAsset && loadPromise?.key === cacheKey) return loadPromise.promise
      const request = ++serial
      cancelPendingPlay()
      asset = nextAsset
      loadedKey = undefined
      bytes = undefined
      activity = undefined
      position = 0
      hasExplicitPosition = true
      loadedAsset = undefined
      sequencer?.pause()
      const promise = (async () => {
        const nextBytes = await resolver.readBytes(nextAsset, 'music')
        const nextActivity = cachedActivity ?? (await analyzeMidiBytes(nextBytes))
        if (disposed || request !== serial || asset !== nextAsset)
          throw new DOMException('MIDI 选择已变化', 'AbortError')
        bytes = nextBytes
        activity = nextActivity
        loadedKey = cacheKey
        loadSequencer()
        return nextActivity
      })().finally(() => {
        if (loadPromise?.promise === promise) loadPromise = undefined
      })
      loadPromise = { key: cacheKey, promise }
      return promise
    },
    async play() {
      if (!asset || !bytes || !activity) throw new Error('请等待 MIDI 读取完成。')
      const runtime = getRuntime()
      if (!runtime) throw new Error('当前浏览器不支持 MIDI 试听。')
      if (sequencer && !sequencer.paused) return
      if (playPromise) return playPromise.promise
      const request = serial
      const playRequest = ++playSerial
      const promise = (async () => {
        if (runtime.context.state === 'suspended') await runtime.context.resume()
        if (disposed || request !== serial || playRequest !== playSerial)
          throw new DOMException('MIDI 选择已变化', 'AbortError')
        const instance = await ensureSequencer()
        if (disposed || request !== serial || playRequest !== playSerial)
          throw new DOMException('MIDI 选择已变化', 'AbortError')
        loadSequencer()
        const observedPosition =
          loadedAsset === asset ? clamp(instance.currentTime, 0, duration()) : position
        const requestedPosition = hasExplicitPosition ? position : observedPosition
        position =
          (!hasExplicitPosition && instance.finished) || requestedPosition >= duration()
            ? 0
            : requestedPosition
        instance.currentTime = clamp(position, 0, duration())
        instance.play()
        hasExplicitPosition = false
      })().finally(() => {
        if (playPromise?.serial === playRequest) playPromise = undefined
      })
      playPromise = { serial: playRequest, promise }
      return promise
    },
    pause() {
      cancelPendingPlay()
      if (!sequencer) return
      position = clamp(sequencer.finished ? duration() : sequencer.currentTime, 0, duration())
      hasExplicitPosition = true
      sequencer.pause()
    },
    stop() {
      cancelPendingPlay()
      sequencer?.pause()
      position = 0
      hasExplicitPosition = true
      if (sequencer) sequencer.currentTime = 0
    },
    seek(seconds) {
      cancelPendingPlay()
      position = clamp(seconds, 0, duration())
      hasExplicitPosition = !sequencer || sequencer.paused || sequencer.finished
      if (sequencer) sequencer.currentTime = position
    },
    snapshot() {
      const finished = Boolean(
        !hasExplicitPosition && sequencer && loadedAsset === asset && sequencer.finished,
      )
      const currentTime = hasExplicitPosition
        ? position
        : finished
        ? duration()
        : sequencer && loadedAsset === asset
          ? sequencer.currentTime
          : position
      return {
        asset,
        currentTime: clamp(currentTime, 0, duration()),
        duration: duration(),
        paused: finished || (sequencer?.paused ?? true),
      }
    },
    dispose() {
      disposed = true
      serial++
      cancelPendingPlay()
      sequencer?.pause()
      runtime?.dispose()
      asset = undefined
      loadedKey = undefined
      loadPromise = undefined
      bytes = undefined
      activity = undefined
      sequencer = undefined
    },
  }
}
