import type { AssetId, AssetRecordV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  type SfxAssetReader,
  type SfxAudioAdapter,
  type SfxPlaybackSource,
  SfxPlayer,
  SfxReadinessBudgetError,
  SfxReadinessResourceError,
} from './sfx.js'

const wave = (id: number): ArrayBuffer =>
  Uint8Array.from([0x52, 0x49, 0x46, 0x46, 5, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, id]).buffer

class FakeReader implements SfxAssetReader {
  readonly projectId = 'test-project'
  readonly reads = new Map<AssetId, number>()
  readImpl?: (asset: AssetId) => Promise<ArrayBuffer>

  record(asset: AssetId): AssetRecordV1 {
    return {
      kind: 'sound',
      path: `assets/${asset}.wav`,
      mediaType: 'audio/wav',
      bytes: 13,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    }
  }

  async readBytes(asset: AssetId): Promise<ArrayBuffer> {
    this.reads.set(asset, (this.reads.get(asset) ?? 0) + 1)
    return this.readImpl ? this.readImpl(asset) : wave(Number(asset.slice(1)))
  }
}

class FakeSource implements SfxPlaybackSource {
  stopped = false

  constructor(readonly onended: () => void) {}

  stop(): void {
    this.stopped = true
  }

  end(): void {
    this.onended()
  }
}

class FakeAdapter implements SfxAudioAdapter {
  state: AudioContextState = 'running'
  readonly sources: Array<{ buffer: unknown; source: FakeSource }> = []
  decodeCalls = 0
  resumeCalls = 0
  failDecode = 0
  failPlay = false
  resumeImpl: () => Promise<void> = async () => {
    this.state = 'running'
  }
  disposed = false

  async resume(): Promise<void> {
    this.resumeCalls++
    await this.resumeImpl()
  }

  async decode(bytes: ArrayBuffer): Promise<unknown> {
    this.decodeCalls++
    if (this.failDecode-- > 0) throw new Error('decode-fault')
    return new Uint8Array(bytes)[12]
  }

  play(buffer: unknown, onended: () => void): SfxPlaybackSource {
    if (this.failPlay) throw new Error('start-fault')
    const source = new FakeSource(onended)
    this.sources.push({ buffer, source })
    return source
  }

  dispose(): void {
    this.disposed = true
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe('SfxPlayer readiness', () => {
  test('冷缓存不迟播；并发 prepare 只读解码一次', async () => {
    const reader = new FakeReader()
    const adapter = new FakeAdapter()
    const player = new SfxPlayer(reader, adapter)
    expect(player.play('s1')).toBe(false)
    await Promise.all([player.prepare(['s1']), player.prepare(['s1', 's1'])])
    expect(reader.reads.get('s1')).toBe(1)
    expect(adapter.decodeCalls).toBe(1)
    expect(adapter.sources).toHaveLength(0)
    expect(player.play('s1')).toBe(true)
    expect(adapter.sources[0]?.buffer).toBe(1)
  })

  test('失败可重试，invalidate 期间旧结果不能回填', async () => {
    const reader = new FakeReader()
    const adapter = new FakeAdapter()
    const player = new SfxPlayer(reader, adapter)
    adapter.failDecode = 1
    await expect(player.prepare(['s1'])).rejects.toThrow('decode-fault')
    await player.prepare(['s1'])
    expect(reader.reads.get('s1')).toBe(2)

    const first = deferred<ArrayBuffer>()
    const second = deferred<ArrayBuffer>()
    let request = 0
    reader.readImpl = async () => (++request === 1 ? first.promise : second.promise)
    player.invalidate('s2')
    const oldPrepare = player.prepare(['s2'])
    await Promise.resolve() // 让旧批进入 read/in-flight 后再失效
    player.invalidate('s2')
    const newPrepare = player.prepare(['s2'])
    first.resolve(wave(21))
    await expect(oldPrepare).rejects.toThrow('资源已失效')
    second.resolve(wave(22))
    await newPrepare
    expect(player.play('s2')).toBe(true)
    expect(adapter.sources.at(-1)?.buffer).toBe(22)
  })

  test('不相交并发工作集串行提交；每个 resolve 时该批仍完整驻留', async () => {
    const reader = new FakeReader()
    const adapter = new FakeAdapter()
    const gates = new Map(['s1', 's2', 's3', 's4'].map((asset) => [asset, deferred<ArrayBuffer>()]))
    reader.readImpl = (asset) => gates.get(asset)!.promise
    const player = new SfxPlayer(reader, adapter, 2)

    const first = player.prepare(['s1', 's2'])
    const second = player.prepare(['s3', 's4'])
    await Promise.resolve()
    expect([...reader.reads.keys()].sort()).toEqual(['s1', 's2'])

    gates.get('s1')!.resolve(wave(1))
    gates.get('s2')!.resolve(wave(2))
    await first
    expect(player.play('s1')).toBe(true)
    adapter.sources.at(-1)?.source.end()
    expect(player.play('s2')).toBe(true)
    adapter.sources.at(-1)?.source.end()

    await Promise.resolve()
    expect([...reader.reads.keys()].sort()).toEqual(['s1', 's2', 's3', 's4'])
    gates.get('s3')!.resolve(wave(3))
    gates.get('s4')!.resolve(wave(4))
    await second
    expect(player.play('s1')).toBe(false)
    expect(player.play('s3')).toBe(true)
    adapter.sources.at(-1)?.source.end()
    expect(player.play('s4')).toBe(true)
  })

  test('LRU 触碰顺序和 readiness 预算可观察且 fail-loud', async () => {
    const reader = new FakeReader()
    const adapter = new FakeAdapter()
    const player = new SfxPlayer(reader, adapter, 2)
    await player.prepare(['s1', 's2'])
    expect(player.play('s1')).toBe(true)
    adapter.sources.at(-1)?.source.end()
    await player.prepare(['s3'])
    expect(player.play('s2')).toBe(false)
    expect(player.play('s3')).toBe(true)
    await expect(player.prepare(['s1', 's2', 's3'])).rejects.toThrow('超过解码预算 2')
  })

  test('无 adapter 也在任何资源读取前抛 typed budget error', async () => {
    const reader = new FakeReader()
    let recordCalls = 0
    const record = reader.record.bind(reader)
    reader.record = (asset) => {
      recordCalls++
      return record(asset)
    }
    const player = new SfxPlayer(reader, undefined, 1)

    const error = await player.prepare(['s1', 's2']).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(SfxReadinessBudgetError)
    expect(error).toMatchObject({ actual: 2, budget: 1 })
    expect(recordCalls).toBe(0)
    expect(reader.reads.size).toBe(0)
  })

  test('prepare 等同批全部落定：成功项 ready 后才抛聚合 resource error', async () => {
    const reader = new FakeReader()
    const adapter = new FakeAdapter()
    const failed = deferred<ArrayBuffer>()
    const succeeded = deferred<ArrayBuffer>()
    reader.readImpl = (asset) => (asset === 's1' ? failed.promise : succeeded.promise)
    const player = new SfxPlayer(reader, adapter)
    const preparing = player.prepare(['s1', 's2'])

    failed.reject(new Error('read-fault'))
    const beforeRestSettles = await Promise.race([
      preparing.then(
        () => 'settled' as const,
        () => 'settled' as const,
      ),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 0)),
    ])
    expect(beforeRestSettles).toBe('pending')

    succeeded.resolve(wave(2))
    const error = await preparing.catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(SfxReadinessResourceError)
    expect(error).toMatchObject({ failures: [expect.any(Error)] })
    expect((error as SfxReadinessResourceError).failures[0]?.message).toContain('read-fault')
    expect(player.play('s1')).toBe(false)
    expect(player.play('s2')).toBe(true)
    expect(adapter.decodeCalls).toBe(1)
  })
})

describe('SfxPlayer 一阶段 lastSFX 状态机', () => {
  test('同号拒绝、异号覆盖、旧 ended 不清当前号', async () => {
    const adapter = new FakeAdapter()
    const player = new SfxPlayer(new FakeReader(), adapter)
    await player.prepare(['s1', 's2'])
    expect(player.play('s1')).toBe(true)
    const firstA = adapter.sources[0]!.source
    expect(player.play('s1')).toBe(false)
    expect(player.play('s2')).toBe(true)
    const b = adapter.sources[1]!.source
    firstA.end()
    expect(player.play('s2')).toBe(false)
    b.end()
    expect(player.play('s2')).toBe(true)
  })

  test('播放 start 失败复位去重，禁用尝试不污染状态', async () => {
    const adapter = new FakeAdapter()
    const player = new SfxPlayer(new FakeReader(), adapter)
    await player.prepare(['s1'])
    player.setEnabled(false)
    expect(player.play('s1')).toBe(false)
    player.setEnabled(true)
    adapter.failPlay = true
    expect(() => player.play('s1')).toThrow('start-fault')
    adapter.failPlay = false
    expect(player.play('s1')).toBe(true)
  })
})

test('resume 防重入，suspended 不建 source，dispose 停止并失效', async () => {
  const adapter = new FakeAdapter()
  const player = new SfxPlayer(new FakeReader(), adapter)
  await player.prepare(['s1'])
  adapter.state = 'suspended'
  expect(player.play('s1')).toBe(false)
  const gate = deferred<void>()
  adapter.resumeImpl = async () => {
    await gate.promise
    adapter.state = 'running'
  }
  const resumes = [player.resume(), player.resume()]
  expect(adapter.resumeCalls).toBe(1)
  gate.resolve()
  await Promise.all(resumes)
  expect(player.play('s1')).toBe(true)
  const source = adapter.sources[0]!.source
  await player.dispose()
  expect(source.stopped).toBe(true)
  expect(adapter.disposed).toBe(true)
  expect(player.play('s1')).toBe(false)
  await expect(player.prepare(['s1'])).rejects.toThrow('已 dispose')
  await player.dispose()
})

test('resume 失败后清除防重入状态，下一次用户手势可重试', async () => {
  const adapter = new FakeAdapter()
  adapter.state = 'suspended'
  let attempt = 0
  adapter.resumeImpl = async () => {
    if (attempt++ === 0) throw new Error('gesture-rejected')
    adapter.state = 'running'
  }
  const player = new SfxPlayer(new FakeReader(), adapter)
  await expect(player.resume()).rejects.toThrow('gesture-rejected')
  await player.resume()
  expect(adapter.resumeCalls).toBe(2)
  expect(adapter.state).toBe('running')
})

test('dispose 期间完成的 decode 不会让旧 prepare 假成功', async () => {
  const reader = new FakeReader()
  const adapter = new FakeAdapter()
  const gate = deferred<ArrayBuffer>()
  reader.readImpl = async () => gate.promise
  const player = new SfxPlayer(reader, adapter)
  const preparing = player.prepare(['s1'])
  await player.dispose()
  gate.resolve(wave(1))
  await expect(preparing).rejects.toThrow('已 dispose')
})

test('错误包含 project、AssetId、path 与 kind 上下文', async () => {
  const reader = new FakeReader()
  reader.readImpl = async () => {
    throw new Error('ENOENT')
  }
  const player = new SfxPlayer(reader, new FakeAdapter())
  await expect(player.prepare(['s9'])).rejects.toThrow(
    /test-project.*s9.*path=assets\/s9\.wav.*kind=sound|kind=sound.*path=assets\/s9\.wav/,
  )

  const missing = new FakeReader()
  missing.record = () => {
    throw new Error('catalog missing')
  }
  await expect(new SfxPlayer(missing, new FakeAdapter()).prepare(['s404'])).rejects.toThrow(
    /test-project.*s404.*kind=sound.*catalog missing/,
  )
})
