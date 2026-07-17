import type { AssetId, AssetKind, AssetRecordV1 } from '@type-pal/content'

/** 设计签字冻结：阶段工作集最多 64 条；超出必须缩集或显式报错，不得偷偷全量缓存。 */
export const SFX_DECODE_BUDGET = 64

/** 工作集本身无效，不能通过静音降级掩盖。 */
export class SfxReadinessFatalError extends Error {
  override readonly name: string = 'SfxReadinessFatalError'
}

/** 阶段工作集超过固定 LRU 预算；必须在任何读取/解码前失败。 */
export class SfxReadinessBudgetError extends SfxReadinessFatalError {
  override readonly name: string = 'SfxReadinessBudgetError'

  constructor(
    readonly actual: number,
    readonly budget: number,
  ) {
    super(`SFX readiness 集 ${actual} 项超过解码预算 ${budget}；请缩小阶段工作集`)
  }
}

/** collector/ScriptRef 无法给出完整工作集时，同样属于 fail-loud 配置错误。 */
export class SfxReadinessCollectionError extends SfxReadinessFatalError {
  override readonly name: string = 'SfxReadinessCollectionError'
}

/** 合法工作集已全部结算，但其中部分资源不可用；成功项仍保持 ready，可由战斗降级继续。 */
export class SfxReadinessResourceError extends Error {
  override readonly name: string = 'SfxReadinessResourceError'

  constructor(readonly failures: readonly Error[]) {
    super(
      `SFX readiness ${failures.length} 项资源准备失败：${failures.map((error) => error.message).join(' | ')}`,
      failures[0] ? { cause: failures[0] } : undefined,
    )
  }
}

export interface SfxAssetReader {
  readonly projectId?: string
  record(asset: AssetId, expectedKind?: AssetKind): AssetRecordV1
  readBytes(asset: AssetId, expectedKind?: AssetKind): Promise<ArrayBuffer>
}

export interface SfxPlaybackSource {
  stop(): void
}

/** Web Audio 的窄适配器；测试不依赖真实时钟或浏览器音频设备。 */
export interface SfxAudioAdapter {
  readonly state: AudioContextState
  resume(): Promise<void>
  decode(bytes: ArrayBuffer): Promise<unknown>
  play(buffer: unknown, onended: () => void): SfxPlaybackSource
  dispose?(): Promise<void> | void
}

function browserAdapter(): SfxAudioAdapter | undefined {
  const host =
    typeof window === 'undefined'
      ? undefined
      : (window as unknown as {
          AudioContext?: typeof AudioContext
          webkitAudioContext?: typeof AudioContext
        })
  const AudioCtor = host?.AudioContext ?? host?.webkitAudioContext
  if (!AudioCtor) return undefined
  const context = new AudioCtor()
  return {
    get state() {
      return context.state
    },
    resume: () => context.resume(),
    decode: (bytes) => context.decodeAudioData(bytes.slice(0)),
    play(buffer, onended) {
      const source = context.createBufferSource()
      source.buffer = buffer as AudioBuffer
      source.connect(context.destination)
      source.onended = onended
      source.start()
      return { stop: () => source.stop() }
    },
    async dispose() {
      if (context.state !== 'closed') await context.close()
    },
  }
}

function assertWave(bytes: ArrayBuffer, label: string): void {
  const view = new Uint8Array(bytes)
  const tag = (offset: number): string => String.fromCharCode(...view.subarray(offset, offset + 4))
  if (view.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error(`${label}: 不是 RIFF/WAVE`)
}

interface InFlightDecode {
  generation: number
  promise: Promise<unknown>
}

/**
 * AssetId-only SFX player。readiness 与播放严格分离：未 prepare 的声音绝不迟到补播。
 */
export class SfxPlayer {
  private readonly decoded = new Map<AssetId, unknown>()
  private readonly inFlight = new Map<AssetId, InFlightDecode>()
  private readonly generations = new Map<AssetId, number>()
  private readonly active = new Set<SfxPlaybackSource>()
  private enabled = true
  private disposed = false
  private lastSfx: AssetId | undefined
  private resumePromise: Promise<void> | undefined
  /**
   * readiness 批次串行提交。LRU 只能保证一个 ≤ maxDecoded 的工作集全驻留；若让两个不相交批次并发
   * decode，它们可能互相淘汰却都 resolve。队列保证前一调用方的 continuation 先于下一批启动。
   */
  private prepareQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly reader: SfxAssetReader,
    private readonly adapter: SfxAudioAdapter | undefined = browserAdapter(),
    private readonly maxDecoded = SFX_DECODE_BUDGET,
  ) {
    if (!Number.isInteger(maxDecoded) || maxDecoded <= 0)
      throw new Error(`SfxPlayer maxDecoded 必须是正整数，收到 ${maxDecoded}`)
    if (!adapter && typeof window !== 'undefined')
      console.warn('[sfx] AudioContext 不可用，音效播放器停用')
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /** 当前 readiness 集必须能同时留在 LRU 中，否则挂帧播放没有确定性。 */
  async prepare(assets: Iterable<AssetId>): Promise<void> {
    this.assertAlive()
    const unique = [...new Set(assets)]
    if (unique.length > this.maxDecoded)
      throw new SfxReadinessBudgetError(unique.length, this.maxDecoded)
    if (!this.adapter) return

    const pending = this.prepareQueue.then(() => this.prepareBatch(unique))
    // 失败只属于本批调用方；队列本身恢复为空闲，后续屏障仍可重试。
    this.prepareQueue = pending.then(
      () => undefined,
      () => undefined,
    )
    return pending
  }

  private async prepareBatch(unique: readonly AssetId[]): Promise<void> {
    this.assertAlive()
    // Promise.all 会在首败时提前释放屏障，其余 decode 仍可后台回填，令首挂帧是否命中取决于时机。
    // 必须等全批落定：成功项保持 ready，失败项清掉 in-flight 后统一交给上层决定是否降级。
    const settled = await Promise.allSettled(unique.map((asset) => this.ensureDecoded(asset)))
    const failures = settled.flatMap((result) =>
      result.status === 'rejected'
        ? [result.reason instanceof Error ? result.reason : new Error(String(result.reason))]
        : [],
    )
    if (failures.length) throw new SfxReadinessResourceError(failures)
  }

  /** 同步挂帧播放。冷缓存/禁用/suspended 均返回 false，绝不异步补播。 */
  play(asset: AssetId): boolean {
    if (this.disposed || !this.enabled || !this.adapter || this.adapter.state !== 'running')
      return false
    const buffer = this.decoded.get(asset)
    if (buffer === undefined || this.lastSfx === asset) return false
    this.touch(asset, buffer)
    this.lastSfx = asset
    let source: SfxPlaybackSource | undefined
    const ended = (): void => {
      if (source) this.active.delete(source)
      if (this.lastSfx === asset) this.lastSfx = undefined
    }
    try {
      source = this.adapter.play(buffer, ended)
      this.active.add(source)
      return true
    } catch (error) {
      if (this.lastSfx === asset) this.lastSfx = undefined
      throw this.contextError(asset, '播放失败', error)
    }
  }

  /** 必须在用户手势回调中直接调用；并发 resume 只触发一次后端请求。 */
  resume(): Promise<void> {
    if (this.disposed || !this.adapter || this.adapter.state !== 'suspended')
      return Promise.resolve()
    this.resumePromise ??= this.adapter.resume().finally(() => {
      this.resumePromise = undefined
    })
    return this.resumePromise
  }

  /** 作者替换同 AssetId 后使旧 buffer 与尚未完成的 decode 一并失效。 */
  invalidate(asset: AssetId): void {
    this.generations.set(asset, this.generation(asset) + 1)
    this.decoded.delete(asset)
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    for (const asset of new Set([...this.generations.keys(), ...this.inFlight.keys()]))
      this.generations.set(asset, this.generation(asset) + 1)
    for (const source of this.active) {
      try {
        source.stop()
      } catch {
        // 已自然结束的 source 目标态相同。
      }
    }
    this.active.clear()
    this.decoded.clear()
    this.inFlight.clear()
    this.lastSfx = undefined
    await this.adapter?.dispose?.()
  }

  private generation(asset: AssetId): number {
    return this.generations.get(asset) ?? 0
  }

  private ensureDecoded(asset: AssetId): Promise<unknown> {
    const adapter = this.adapter
    if (!adapter) throw new Error('SfxPlayer 音频适配器不可用')
    const cached = this.decoded.get(asset)
    if (cached !== undefined) {
      this.touch(asset, cached)
      return Promise.resolve(cached)
    }
    const generation = this.generation(asset)
    const current = this.inFlight.get(asset)
    if (current?.generation === generation) return current.promise

    // async 函数在首个 await 前即构造 promise；随后立即登记，保证并发只读/解码一次。
    const promise = (async (): Promise<unknown> => {
      let record: AssetRecordV1 | undefined
      try {
        record = this.reader.record(asset, 'sound')
        const bytes = await this.reader.readBytes(asset, 'sound')
        assertWave(bytes, `AssetId "${asset}" path=${record.path}`)
        const decoded = await adapter.decode(bytes)
        if (this.disposed) throw new Error('播放器已 dispose，丢弃解码结果')
        if (this.generation(asset) !== generation)
          throw new Error('准备期间资源已失效，请按新版本重试')
        this.touch(asset, decoded)
        this.evict()
        return decoded
      } catch (error) {
        throw this.contextError(asset, `准备失败${record ? ` path=${record.path}` : ''}`, error)
      }
    })()
    const entry: InFlightDecode = { generation, promise }
    this.inFlight.set(asset, entry)
    void promise
      .finally(() => {
        if (this.inFlight.get(asset) === entry) this.inFlight.delete(asset)
      })
      .catch(() => {})
    return promise
  }

  private touch(asset: AssetId, buffer: unknown): void {
    this.decoded.delete(asset)
    this.decoded.set(asset, buffer)
  }

  private evict(): void {
    while (this.decoded.size > this.maxDecoded) {
      const oldest = this.decoded.keys().next().value as AssetId | undefined
      if (oldest === undefined) break
      this.decoded.delete(oldest)
    }
  }

  private assertAlive(): void {
    if (this.disposed) throw new Error('SfxPlayer 已 dispose')
  }

  private contextError(asset: AssetId, action: string, error: unknown): Error {
    let path = 'unknown'
    try {
      path = this.reader.record(asset, 'sound').path
    } catch {
      // record 本身的错误已带 project/AssetId/kind；保留原 cause 文本。
    }
    return new Error(
      `工程 "${this.reader.projectId ?? 'unknown'}" SFX AssetId "${asset}" ${action} ` +
        `(kind=sound, path=${path}): ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
}
