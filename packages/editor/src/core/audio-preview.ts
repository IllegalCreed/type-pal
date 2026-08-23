import type { AssetId } from '@type-pal/content'
import type { EditorAssetReader } from './editor-asset-reader.js'

export interface PcmPeaks {
  kind: 'pcm-peaks'
  duration: number
  minimums: readonly number[]
  maximums: readonly number[]
}

export interface WavPreviewSnapshot {
  asset?: AssetId
  currentTime: number
  duration: number
  paused: boolean
}

export interface WavPreviewTransport {
  load(asset: AssetId, cacheKey?: string, cachedPeaks?: PcmPeaks): Promise<PcmPeaks>
  play(): Promise<void>
  pause(): void
  stop(): void
  seek(seconds: number): void
  snapshot(): WavPreviewSnapshot
  dispose(): void
}

export interface WavDecodedAudio {
  readonly duration: number
  readonly numberOfChannels: number
  getChannelData(channel: number): Float32Array
}

export interface WavPreviewSource {
  start(offset: number): void
  stop(): void
  disconnect(): void
}

export interface WavPreviewRuntimeAdapter {
  readonly currentTime: number
  readonly state: AudioContextState
  resume(): Promise<void>
  decode(bytes: ArrayBuffer): Promise<WavDecodedAudio>
  createSource(buffer: WavDecodedAudio, onEnded: () => void): WavPreviewSource
  dispose(): void
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))

/** Web Audio 解码后的真实 PCM 峰值；每个 bucket 同时扫描全部声道。 */
export function computePcmPeaks(
  channels: readonly Float32Array[],
  duration: number,
  bucketCount = 160,
): PcmPeaks {
  const count = Math.max(1, Math.floor(bucketCount))
  const frameCount = channels.reduce((max, channel) => Math.max(max, channel.length), 0)
  const minimums = Array.from({ length: count }, () => 0)
  const maximums = Array.from({ length: count }, () => 0)
  if (!frameCount || !channels.length)
    return { kind: 'pcm-peaks', duration: Math.max(0, duration), minimums, maximums }

  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor((bucket / count) * frameCount)
    const end = Math.max(start + 1, Math.floor(((bucket + 1) / count) * frameCount))
    let minimum = Number.POSITIVE_INFINITY
    let maximum = Number.NEGATIVE_INFINITY
    for (const channel of channels) {
      for (let frame = start; frame < Math.min(end, channel.length); frame++) {
        const sample = channel[frame] ?? 0
        minimum = Math.min(minimum, sample)
        maximum = Math.max(maximum, sample)
      }
    }
    minimums[bucket] = Number.isFinite(minimum) ? minimum : 0
    maximums[bucket] = Number.isFinite(maximum) ? maximum : 0
  }
  return {
    kind: 'pcm-peaks',
    duration: Math.max(0, Number.isFinite(duration) ? duration : 0),
    minimums,
    maximums,
  }
}

export function createBrowserWavPreviewRuntime(): WavPreviewRuntimeAdapter | undefined {
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
  return {
    get currentTime() {
      return context.currentTime
    },
    get state() {
      return context.state
    },
    resume: () => context.resume(),
    decode: (bytes) => context.decodeAudioData(bytes.slice(0)),
    createSource(buffer, onEnded) {
      const source = context.createBufferSource()
      source.buffer = buffer as AudioBuffer
      source.connect(context.destination)
      source.addEventListener('ended', onEnded, { once: true })
      return {
        start: (offset) => source.start(0, offset),
        stop: () => source.stop(),
        disconnect: () => source.disconnect(),
      }
    },
    dispose: () => void context.close(),
  }
}

export function createWavPreviewTransport(
  reader: EditorAssetReader,
  providedRuntime?: WavPreviewRuntimeAdapter,
): WavPreviewTransport {
  let runtime = providedRuntime
  let runtimeResolved = providedRuntime !== undefined
  let serial = 0
  let playSerial = 0
  let sourceSerial = 0
  let disposed = false
  let asset: AssetId | undefined
  let decoded: WavDecodedAudio | undefined
  let peaks: PcmPeaks | undefined
  let source: WavPreviewSource | undefined
  let position = 0
  let startedAt = 0
  let playing = false
  let playPromise: { serial: number; promise: Promise<void> } | undefined
  let loadedKey: string | undefined
  let loadPromise: { key: string; promise: Promise<PcmPeaks> } | undefined

  const getRuntime = (): WavPreviewRuntimeAdapter | undefined => {
    if (!runtimeResolved) {
      runtime = createBrowserWavPreviewRuntime()
      runtimeResolved = true
    }
    return runtime
  }

  const duration = (): number => peaks?.duration ?? decoded?.duration ?? 0
  const currentTime = (): number =>
    clamp(playing && runtime ? position + runtime.currentTime - startedAt : position, 0, duration())

  const releaseSource = (): void => {
    if (!source) return
    sourceSerial++
    try {
      source.stop()
    } catch {
      // AudioBufferSourceNode 只能 stop 一次；重复清理保持幂等。
    }
    source.disconnect()
    source = undefined
  }

  const cancelPendingPlay = (): void => {
    playSerial++
    playPromise = undefined
  }

  const startSource = (): void => {
    if (!runtime || !decoded) throw new Error('当前浏览器不支持 WAV 试听。')
    releaseSource()
    const ownSerial = ++sourceSerial
    startedAt = runtime.currentTime
    const nextSource = runtime.createSource(decoded, () => {
      if (ownSerial !== sourceSerial) return
      nextSource.disconnect()
      source = undefined
      playing = false
      position = duration()
    })
    source = nextSource
    playing = true
    nextSource.start(clamp(position, 0, Math.max(0, duration() - 0.001)))
  }

  return {
    async load(nextAsset, cacheKey = nextAsset, cachedPeaks) {
      const runtime = getRuntime()
      if (!runtime) throw new Error('当前浏览器不支持 WAV 解码。')
      if (asset === nextAsset && loadedKey === cacheKey && decoded && peaks) return peaks
      if (asset === nextAsset && loadPromise?.key === cacheKey) return loadPromise.promise
      const request = ++serial
      cancelPendingPlay()
      releaseSource()
      playing = false
      position = 0
      asset = nextAsset
      loadedKey = undefined
      decoded = undefined
      peaks = undefined
      const promise = (async () => {
        const bytes = await reader.readBytes(nextAsset, 'sound')
        const nextDecoded = await runtime.decode(bytes)
        const nextPeaks =
          cachedPeaks ??
          computePcmPeaks(
            Array.from({ length: nextDecoded.numberOfChannels }, (_, channel) =>
              nextDecoded.getChannelData(channel),
            ),
            nextDecoded.duration,
          )
        if (disposed || request !== serial || asset !== nextAsset)
          throw new DOMException('WAV 选择已变化', 'AbortError')
        decoded = nextDecoded
        peaks = nextPeaks
        loadedKey = cacheKey
        return nextPeaks
      })().finally(() => {
        if (loadPromise?.promise === promise) loadPromise = undefined
      })
      loadPromise = { key: cacheKey, promise }
      return promise
    },
    async play() {
      if (!runtime || !decoded || !peaks) throw new Error('请等待 WAV 读取完成。')
      if (playing) return
      if (playPromise) return playPromise.promise
      const request = serial
      const playRequest = ++playSerial
      const promise = (async () => {
        if (position >= duration()) position = 0
        if (runtime.state === 'suspended') await runtime.resume()
        if (disposed || request !== serial || playRequest !== playSerial)
          throw new DOMException('WAV 选择已变化', 'AbortError')
        startSource()
      })().finally(() => {
        if (playPromise?.serial === playRequest) playPromise = undefined
      })
      playPromise = { serial: playRequest, promise }
      return promise
    },
    pause() {
      cancelPendingPlay()
      if (!playing) return
      position = currentTime()
      playing = false
      releaseSource()
    },
    stop() {
      cancelPendingPlay()
      playing = false
      releaseSource()
      position = 0
    },
    seek(seconds) {
      cancelPendingPlay()
      const resume = playing
      if (playing) {
        position = currentTime()
        playing = false
      }
      releaseSource()
      position = clamp(seconds, 0, duration())
      if (resume && position < duration()) startSource()
    },
    snapshot() {
      return { asset, currentTime: currentTime(), duration: duration(), paused: !playing }
    },
    dispose() {
      disposed = true
      serial++
      cancelPendingPlay()
      playing = false
      releaseSource()
      runtime?.dispose()
      asset = undefined
      loadedKey = undefined
      loadPromise = undefined
      decoded = undefined
      peaks = undefined
    },
  }
}

/** SHA 派生的临时分析缓存；LRU 上限防止大项目持续累积 AudioBuffer。 */
export class AudioPreviewCache<T> {
  readonly #limit: number
  readonly #values = new Map<string, T>()
  readonly #inflight = new Map<string, Promise<T>>()

  constructor(limit = 8) {
    this.#limit = Math.max(1, Math.floor(limit))
  }

  get size(): number {
    return this.#values.size
  }

  get(key: string): T | undefined {
    const value = this.#values.get(key)
    if (value === undefined) return undefined
    this.#values.delete(key)
    this.#values.set(key, value)
    return value
  }

  load(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.get(key)
    if (cached !== undefined) return Promise.resolve(cached)
    const running = this.#inflight.get(key)
    if (running) return running
    const promise = loader()
      .then((value) => {
        this.#values.set(key, value)
        while (this.#values.size > this.#limit) {
          const oldest = this.#values.keys().next().value as string | undefined
          if (oldest === undefined) break
          this.#values.delete(oldest)
        }
        return value
      })
      .finally(() => this.#inflight.delete(key))
    this.#inflight.set(key, promise)
    return promise
  }

  clear(): void {
    this.#values.clear()
    this.#inflight.clear()
  }
}
