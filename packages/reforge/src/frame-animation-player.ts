import type { AssetKind } from '@type-pal/content'
import {
  type AssetId,
  decodeFrameSequenceBlock,
  frameSequenceFrameDurationMs,
  type ParsedFrameSequenceV1,
  parseFrameSequence,
  resolveFrameSequencePlayback,
} from '@type-pal/content'

export interface FrameSequenceAssetReader {
  readBytes(asset: AssetId, expectedKind?: AssetKind): Promise<ArrayBuffer>
}

export interface FrameAnimationFrameSnapshot {
  readonly width: number
  readonly height: number
  readonly rgba: Uint8Array | Uint8ClampedArray
}

export type FrameSequenceInflate = (bytes: Uint8Array) => Promise<Uint8Array>

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export async function decompressFrameSequenceBlock(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([arrayBufferOf(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** TPFS 随机读取器；容器 Promise 与 block Promise 均在 await 前入缓存。 */
export class FrameSequenceReader {
  readonly #sequences = new Map<AssetId, Promise<ParsedFrameSequenceV1>>()
  readonly #inflightBlocks = new Map<string, Promise<Uint8Array[]>>()
  readonly #frames = new Map<string, Uint8Array>()

  constructor(
    private readonly resolver: FrameSequenceAssetReader,
    private readonly inflate: FrameSequenceInflate = decompressFrameSequenceBlock,
    private readonly frameLimit = 64,
  ) {
    if (!Number.isInteger(frameLimit) || frameLimit <= 0)
      throw new Error(`FrameSequenceReader.frameLimit 必须是正整数，收到 ${frameLimit}`)
  }

  sequence(asset: AssetId): Promise<ParsedFrameSequenceV1> {
    const cached = this.#sequences.get(asset)
    if (cached) return cached
    const promise = this.resolver
      .readBytes(asset, 'frame-animation')
      .then((bytes) => parseFrameSequence(new Uint8Array(bytes)))
    this.#sequences.set(asset, promise)
    void promise.catch(() => {
      if (this.#sequences.get(asset) === promise) this.#sequences.delete(asset)
    })
    return promise
  }

  async frame(asset: AssetId, frameIndex: number): Promise<FrameAnimationFrameSnapshot> {
    const sequence = await this.sequence(asset)
    if (
      !Number.isInteger(frameIndex) ||
      frameIndex < 0 ||
      frameIndex >= sequence.index.frames.length
    )
      throw new Error(`帧动画 ${asset}: 帧索引 ${String(frameIndex)} 越界`)
    const cacheKey = this.frameKey(asset, frameIndex)
    const cached = this.#frames.get(cacheKey)
    if (cached) {
      this.#frames.delete(cacheKey)
      this.#frames.set(cacheKey, cached)
      return { width: sequence.index.width, height: sequence.index.height, rgba: cached }
    }

    const blockIndex = Math.floor(frameIndex / sequence.index.blockFrames)
    const blockKey = `${asset}\0${blockIndex}`
    let promise = this.#inflightBlocks.get(blockKey)
    if (!promise) {
      promise = decodeFrameSequenceBlock(sequence, blockIndex, this.inflate).then((frames) => {
        const block = sequence.index.blocks[blockIndex]
        if (!block) throw new Error(`帧动画 ${asset}: 缺 block ${blockIndex}`)
        for (const [local, rgba] of frames.entries())
          this.rememberFrame(this.frameKey(asset, block.firstFrame + local), rgba)
        return frames
      })
      this.#inflightBlocks.set(blockKey, promise)
      const clearInflight = (): void => {
        if (this.#inflightBlocks.get(blockKey) === promise) this.#inflightBlocks.delete(blockKey)
      }
      void promise.then(clearInflight, clearInflight)
    }
    const frames = await promise
    const block = sequence.index.blocks[blockIndex]
    const rgba = block ? frames[frameIndex - block.firstFrame] : undefined
    if (!rgba) throw new Error(`帧动画 ${asset}: 解码后缺帧 ${frameIndex}`)
    return { width: sequence.index.width, height: sequence.index.height, rgba }
  }

  prefetch(asset: AssetId, frameIndex: number): void {
    void this.frame(asset, frameIndex).catch(() => undefined)
  }

  invalidate(asset?: AssetId): void {
    if (asset === undefined) {
      this.#sequences.clear()
      this.#inflightBlocks.clear()
      this.#frames.clear()
      return
    }
    this.#sequences.delete(asset)
    for (const key of [...this.#inflightBlocks.keys()]) {
      if (key.startsWith(`${asset}\0`)) this.#inflightBlocks.delete(key)
    }
    for (const key of [...this.#frames.keys()]) {
      if (key.startsWith(`${asset}\0`)) this.#frames.delete(key)
    }
  }

  get cachedFrameCount(): number {
    return this.#frames.size
  }

  get inflightBlockCount(): number {
    return this.#inflightBlocks.size
  }

  private frameKey(asset: AssetId, frameIndex: number): string {
    return `${asset}\0${frameIndex}`
  }

  private rememberFrame(key: string, rgba: Uint8Array): void {
    this.#frames.delete(key)
    this.#frames.set(key, rgba)
    while (this.#frames.size > this.frameLimit) {
      const oldest = this.#frames.keys().next().value
      if (oldest === undefined) break
      this.#frames.delete(oldest)
    }
  }
}

export interface PlayFrameAnimationOptions {
  reader: FrameSequenceReader
  asset: AssetId
  startFrame?: number
  endFrame?: number
  frameRate?: number
  skipKeys?: readonly string[]
  eventTarget?: EventTarget
  onFrame(frame: FrameAnimationFrameSnapshot): void
  wait?: (ms: number) => Promise<void>
  signal?: AbortSignal
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 阻塞播放完整帧序列；容器/区间错误 fail-loud。
 *
 * 原版剧情 RNG 不读取输入，因此默认不可跳过。开发/编辑器预览如需快捷跳过，必须通过
 * `skipKeys` 显式 opt-in；跳过只结束当前调用。
 */
export async function playFrameAnimation(
  options: PlayFrameAnimationOptions,
): Promise<FrameAnimationFrameSnapshot | undefined> {
  const abortError = (): DOMException => new DOMException('frame animation aborted', 'AbortError')
  const assertActive = (): void => {
    if (options.signal?.aborted) throw abortError()
  }
  const awaitActive = <T>(promise: Promise<T>): Promise<T> => {
    const signal = options.signal
    if (!signal) return promise
    assertActive()
    return new Promise<T>((resolve, reject) => {
      let settled = false
      const finish = (result: { value: T } | { error: unknown }): void => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', abort)
        if ('error' in result) reject(result.error)
        else resolve(result.value)
      }
      const abort = (): void => finish({ error: abortError() })
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
      void promise.then(
        (value) => finish({ value }),
        (error: unknown) => finish({ error }),
      )
    })
  }
  const sequence = await awaitActive(options.reader.sequence(options.asset))
  const range = resolveFrameSequencePlayback(sequence.index, {
    ...(options.startFrame === undefined ? {} : { startFrame: options.startFrame }),
    ...(options.endFrame === undefined ? {} : { endFrame: options.endFrame }),
    ...(options.frameRate === undefined ? {} : { frameRate: options.frameRate }),
  })
  const target = options.eventTarget ?? (typeof window === 'undefined' ? undefined : window)
  const skipKeys = new Set(options.skipKeys ?? [])
  const wait = options.wait ?? sleep
  let skipped = false
  let last: FrameAnimationFrameSnapshot | undefined
  const onKey = (event: Event): void => {
    const keyboard = event as KeyboardEvent
    if (!skipKeys.has(keyboard.code)) return
    keyboard.preventDefault()
    keyboard.stopImmediatePropagation()
    skipped = true
  }
  target?.addEventListener('keydown', onKey, true)
  try {
    for (let frameIndex = range.startFrame; frameIndex <= range.endFrame; frameIndex++) {
      assertActive()
      if (skipped) break
      const frame = await awaitActive(options.reader.frame(options.asset, frameIndex))
      if (skipped) break
      options.onFrame(frame)
      last = frame
      if (frameIndex < range.endFrame) options.reader.prefetch(options.asset, frameIndex + 1)
      await awaitActive(
        wait(frameSequenceFrameDurationMs(sequence.index, frameIndex, range.frameRate)),
      )
    }
  } finally {
    target?.removeEventListener('keydown', onKey, true)
  }
  return last
}
