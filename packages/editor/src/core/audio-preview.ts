import type { AssetId } from '@type-pal/content'
import type { EditorAssetReader } from './editor-asset-reader.js'

import { computePcmPeaks, type PcmPeaks } from './pcm-preview-peaks.js'

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

function createBrowserWavPreviewRuntime(): WavPreviewRuntimeAdapter | undefined {
  const browser: (typeof window & { webkitAudioContext?: typeof AudioContext }) | undefined =
    typeof window === 'undefined' ? undefined : window
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
  reader: Pick<EditorAssetReader, 'readBytes'>,
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
      // 源可能在停止前已经结束，仍须断开连接。
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
    const startTime = runtime.currentTime
    const nextSource = runtime.createSource(decoded, () => {
      if (ownSerial !== sourceSerial) return
      nextSource.disconnect()
      source = undefined
      playing = false
      position = duration()
    })
    try {
      nextSource.start(clamp(position, 0, Math.max(0, duration() - 0.001)))
    } catch (cause) {
      nextSource.disconnect()
      throw cause
    }
    startedAt = startTime
    source = nextSource
    playing = true
  }

  return {
    async load(nextAsset, cacheKey = nextAsset, cachedPeaks) {
      if (disposed) throw new DOMException('WAV 试听已关闭', 'AbortError')
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
      const requireCurrentRequest = (): void => {
        if (request !== serial) throw new DOMException('WAV 选择已变化', 'AbortError')
      }
      const promise = (async () => {
        const bytes = await reader.readBytes(nextAsset, 'sound')
        requireCurrentRequest()
        const nextDecoded = await runtime.decode(bytes)
        requireCurrentRequest()
        const nextPeaks =
          cachedPeaks ??
          computePcmPeaks(
            Array.from({ length: nextDecoded.numberOfChannels }, (_, channel) =>
              nextDecoded.getChannelData(channel),
            ),
            nextDecoded.duration,
          )
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
      if (disposed) return
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
