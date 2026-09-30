/** TEST-GLM-WAVE-O-1 O04：资源物化/退役计划/bake/供应 IO 的合成合同。
 *  旧证：pal-assets.test.ts（fast 排除，吃真实 corpus census）；glm-next-wave 覆盖
 *  声音 resolver。本卡用 mkdtemp 合成工程与合成 catalog/binaries 走真实公开入口：
 *  materializePalAssets、planPalAssetRetirements、bakeIndexedRgba、loadPalSoundAssets、
 *  loadPalStaticImages。不写真实工程、不跑 bake CLI。
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import { PNG } from 'pngjs'
import { afterEach, describe, expect, test } from 'vitest'
import { bakeIndexedRgba } from './bake-indexed-rgba.js'
import { sha256 } from './migration-baseline.js'
import {
  loadPalSoundAssets,
  loadPalStaticImages,
  materializePalAssets,
  planPalAssetRetirements,
} from './pal-assets.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-o-ast-'))
  roots.push(root)
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function record(
  id: string,
  kind: AssetRecordV1['kind'],
  bytes: number,
  sha256Hex: string,
  origin: AssetRecordV1['origin'] = { kind: 'generated' },
): AssetRecordV1 {
  const prefix =
    origin.kind === 'legacy-migrated'
      ? 'assets/migrated'
      : origin.kind === 'authored'
        ? 'assets/authored'
        : 'assets/generated'
  return {
    kind,
    path: `${prefix}/${id.replaceAll('.', '-')}.bin`,
    mediaType: 'application/octet-stream',
    bytes,
    sha256: sha256Hex,
    origin,
  }
}

const sourceOf = (id: string, content: string) => ({
  id,
  bytes: new TextEncoder().encode(content),
  record: {
    kind: 'sprite' as const,
    path: `assets/generated/${id}.bin`,
    mediaType: 'application/octet-stream',
    bytes: new TextEncoder().encode(content).byteLength,
    sha256: sha256(new TextEncoder().encode(content)),
    origin: { kind: 'generated' as const },
  },
})

describe('O04 materializePalAssets：合成 catalog 的确定性物化', () => {
  test('全量写入报告 written/files/bytes 并落盘到 projects/pal', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const b = sourceOf('b.x', 'bb')
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: Object.fromEntries([a, b].map((s) => [s.id, s.record])),
    }
    const report = materializePalAssets({ repo, catalog, binaries: [a, b] })
    expect(report).toMatchObject({ written: 2, unchanged: 0, authored: 0, files: 2, bytes: 5 })
    expect(readFileSync(resolve(repo, 'projects/pal/assets/generated/a.x.bin'), 'utf8')).toBe('aaa')
  })

  test('重复物化：内容一致 → unchanged，不重写', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'a.x': a.record } }
    materializePalAssets({ repo, catalog, binaries: [a] })
    const before = readFileSync(resolve(repo, 'projects/pal/assets/generated/a.x.bin'))
    const second = materializePalAssets({ repo, catalog, binaries: [a] })
    expect(second).toMatchObject({ written: 0, unchanged: 1 })
    expect(readFileSync(resolve(repo, 'projects/pal/assets/generated/a.x.bin'))).toEqual(before)
  })

  test('内容漂移的目标被重写（written=1）', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'a.x': a.record } }
    materializePalAssets({ repo, catalog, binaries: [a] })
    writeFileSync(resolve(repo, 'projects/pal/assets/generated/a.x.bin'), 'stale')
    const report = materializePalAssets({ repo, catalog, binaries: [a] })
    expect(report.written).toBe(1)
    expect(readFileSync(resolve(repo, 'projects/pal/assets/generated/a.x.bin'), 'utf8')).toBe('aaa')
  })

  test('authored 记录只校验磁盘字节，绝不复制来源（authored 计数来自 binaries）', () => {
    const repo = tempRepo()
    const content = new TextEncoder().encode('xyz')
    const authoredRecord: AssetRecordV1 = {
      kind: 'portrait',
      path: 'assets/authored/c-x.bin',
      mediaType: 'application/octet-stream',
      bytes: content.byteLength,
      sha256: sha256(content),
      origin: { kind: 'authored' },
    }
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'c.x': authoredRecord } }
    mkdirSync(resolve(repo, 'projects/pal/assets/authored'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal', authoredRecord.path), 'xyz')
    const report = materializePalAssets({
      repo,
      catalog,
      binaries: [{ id: 'c.x', bytes: content, record: authoredRecord }],
    })
    expect(report).toMatchObject({ authored: 1, written: 0, unchanged: 0 })
    expect(readFileSync(resolve(repo, 'projects/pal', authoredRecord.path), 'utf8')).toBe('xyz')
  })

  test('catalog 缺迁移资源条目 → fail-loud', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    expect(() =>
      materializePalAssets({ repo, catalog: { version: 1, assets: {} }, binaries: [a] }),
    ).toThrow('PAL catalog 缺迁移资源 a.x')
  })

  test('binaries 重复 AssetId → fail-loud', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'a.x': a.record } }
    expect(() => materializePalAssets({ repo, catalog, binaries: [a, a] })).toThrow(
      'PAL 二进制迁移源存在重复 AssetId',
    )
  })

  test('catalog 两条记录同 path → 路径冲突 fail-loud', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const b = sourceOf('b.x', 'bb')
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'a.x': a.record, 'b.x': { ...b.record, path: a.record.path } },
    }
    expect(() => materializePalAssets({ repo, catalog, binaries: [a] })).toThrow(
      'PAL catalog 资源路径冲突: a.x / b.x',
    )
  })

  test('非 authored 记录被改写（bytes 漂移）→ fail-loud', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'a.x': { ...a.record, bytes: 99 } },
    }
    expect(() => materializePalAssets({ repo, catalog, binaries: [a] })).toThrow(
      '迁移资源 a.x.bytes 被非 authored 记录改写',
    )
  })

  test('非 authored 记录 mediaType 被改写 → fail-loud（origin 轴被所有权前缀守卫前置拦截）', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'a.x': { ...a.record, mediaType: 'text/plain' } },
    }
    expect(() => materializePalAssets({ repo, catalog, binaries: [a] })).toThrow(
      '迁移资源 a.x.mediaType 被非 authored 记录改写',
    )
  })

  test('迁移源 bytes/hash 与自身 catalog 记录不符 → fail-loud', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const lying = { ...a, bytes: new TextEncoder().encode('totally-different') }
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'a.x': a.record } }
    expect(() => materializePalAssets({ repo, catalog, binaries: [lying] })).toThrow(
      '迁移源 a.x 的 bytes/hash 与 catalog 记录不符',
    )
  })

  test('非 sourced 的未知所有权记录（legacy-migrated 无来源）→ fail-loud', () => {
    const repo = tempRepo()
    const legacy = record('l.x', 'sprite', 3, sha256('xyz'), { kind: 'legacy-migrated', ref: 'x' })
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'l.x': legacy } }
    expect(() => materializePalAssets({ repo, catalog, binaries: [] })).toThrow(
      '未知迁移所有权资源 l.x',
    )
  })

  test('authored 记录磁盘字节漂移 → assertBytes fail-loud（缺失/bytes/sha 三轴）', () => {
    const repo = tempRepo()
    const authoredRecord = record('c.x', 'portrait', 3, sha256('xyz'), { kind: 'authored' })
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'c.x': authoredRecord } }
    expect(() => materializePalAssets({ repo, catalog, binaries: [] })).toThrow(
      /资源文件不存在: .*c-x\.bin$/,
    )
    const dir = resolve(repo, 'projects/pal', dirname(authoredRecord.path))
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal', authoredRecord.path), 'toolong')
    expect(() => materializePalAssets({ repo, catalog, binaries: [] })).toThrow(/资源 bytes 不符/)
    writeFileSync(resolve(repo, 'projects/pal', authoredRecord.path), 'xyx')
    expect(() => materializePalAssets({ repo, catalog, binaries: [] })).toThrow(/资源 sha256 不符/)
  })

  test('目标为目录时 rename 失败 → 临时文件清理且错误传播', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'a.x': a.record } }
    mkdirSync(resolve(repo, 'projects/pal/assets/generated/a.x.bin'), { recursive: true })
    expect(() => materializePalAssets({ repo, catalog, binaries: [a] })).toThrow()
    const leftovers = readdirSync(resolve(repo, 'projects/pal/assets/generated'))
    expect(leftovers).toEqual(['a.x.bin'])
    const tempLeftovers = leftovers.filter((name) => name.includes('.tmp-'))
    expect(tempLeftovers).toEqual([])
  })

  test('资源路径越界（catalog path 含 ..）被路径门拒绝', () => {
    const repo = tempRepo()
    const a = sourceOf('a.x', 'aaa')
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'a.x': { ...a.record, path: 'assets/generated/../escape.bin' } },
    }
    expect(() => materializePalAssets({ repo, catalog, binaries: [a] })).toThrow(
      /assets\["a\.x"\]\.path/,
    )
  })
})

describe('O04 planPalAssetRetirements：退役推导合同', () => {
  const migratedRecord = (id: string, content: string): AssetRecordV1 => ({
    ...record(id, 'sprite', content.length, sha256(content), { kind: 'legacy-migrated', ref: id }),
  })

  test('legacy-migrated 且目标缺失且磁盘一致 → 入退役清单并排序', () => {
    const repo = tempRepo()
    const keep = migratedRecord('keep.x', 'keep')
    const dropA = migratedRecord('drop-a.x', 'aaaa')
    const dropB = migratedRecord('drop-b.x', 'bbbb')
    const previous: AssetCatalogV1 = {
      version: 1,
      assets: Object.fromEntries([keep, dropA, dropB].map((r) => [r.path, r])),
    }
    const target: AssetCatalogV1 = {
      version: 1,
      assets: { 'keep.x': keep },
    }
    mkdirSync(resolve(repo, 'projects/pal/assets/migrated'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal', dropB.path), 'bbbb')
    writeFileSync(resolve(repo, 'projects/pal', dropA.path), 'aaaa')
    writeFileSync(resolve(repo, 'projects/pal', keep.path), 'keep')
    const retirements = planPalAssetRetirements({
      repo,
      previousCatalog: previous,
      targetCatalog: target,
    })
    expect(retirements.map(({ path }) => path)).toEqual([dropA.path, dropB.path])
    expect(retirements[0]).toMatchObject({ expectedSha256: sha256('aaaa') })
  })

  test('磁盘文件缺失 → 跳过；authored 与仍在 target 的记录不退役', () => {
    const repo = tempRepo()
    const missing = migratedRecord('missing.x', 'mmm')
    const authored = record('auth.x', 'sprite', 3, sha256('aaa'), { kind: 'authored' })
    const previous: AssetCatalogV1 = {
      version: 1,
      assets: Object.fromEntries([missing, authored].map((r) => [r.path, r])),
    }
    const retirements = planPalAssetRetirements({
      repo,
      previousCatalog: previous,
      targetCatalog: { version: 1, assets: {} },
    })
    expect(retirements).toEqual([])
  })

  test('磁盘字节漂移 → fail-loud（不退役被改文件）', () => {
    const repo = tempRepo()
    const drop = migratedRecord('drop.x', 'aaaa')
    mkdirSync(resolve(repo, 'projects/pal/assets/migrated'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal', drop.path), 'tampered')
    expect(() =>
      planPalAssetRetirements({
        repo,
        previousCatalog: { version: 1, assets: { 'drop.x': drop } },
        targetCatalog: { version: 1, assets: {} },
      }),
    ).toThrow(/资源 bytes 不符/)
    // 等长不同字节 → sha 轴。
    writeFileSync(resolve(repo, 'projects/pal', drop.path), 'aaab')
    expect(() =>
      planPalAssetRetirements({
        repo,
        previousCatalog: { version: 1, assets: { 'drop.x': drop } },
        targetCatalog: { version: 1, assets: {} },
      }),
    ).toThrow(/资源 sha256 不符/)
  })
})

describe('O04 bakeIndexedRgba：indexed RGBA → 真彩合同', () => {
  const PAL: readonly [number, number, number][] = [
    [10, 20, 30],
    [40, 50, 60],
  ]

  test('不透明像素按 R 查表填充且 alpha=255', () => {
    const src = Uint8Array.from([0, 0, 0, 255, 1, 1, 1, 200])
    const out = bakeIndexedRgba(src, PAL)
    expect([...out]).toEqual([10, 20, 30, 255, 40, 50, 60, 255])
  })

  test('A=0 保持全透明（不查表）', () => {
    const src = Uint8Array.from([1, 1, 1, 0])
    expect([...bakeIndexedRgba(src, PAL)]).toEqual([0, 0, 0, 0])
  })

  test('palette 越界下标落到黑色不透明；缺失 alpha 通道按透明处理', () => {
    const src = Uint8Array.from([9, 0, 0, 255])
    expect([...bakeIndexedRgba(src, PAL)]).toEqual([0, 0, 0, 255])
    expect([...bakeIndexedRgba(Uint8Array.from([0, 0, 0]), PAL)]).toEqual([0, 0, 0])
  })
})

// ── 合成 extracted corpus（声音/静态图像）────────────────────────────────

const PALETTE_256 = {
  colors: Array.from(
    { length: 256 },
    (_v, i) => [i, (i * 2) % 256, 255 - i] as [number, number, number],
  ),
}

function writePng(
  path: string,
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
): void {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y)
      const at = (y * width + x) * 4
      png.data[at] = r
      png.data[at + 1] = g
      png.data[at + 2] = b
      png.data[at + 3] = a
    }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, PNG.sync.write(png))
}

// 音效号从 1 起（palSoundAssetId 拒绝 0）；0 号与 ≥4 号为空段。
const wavBytes = (seed: number): Buffer => {
  const data = Buffer.from(`WAVE-${seed}`.repeat(2))
  const header = Buffer.alloc(12)
  header.write('RIFF', 0)
  header.writeUInt32LE(4 + 8 + data.byteLength, 4)
  header.write('WAVE', 8)
  const fmt = Buffer.alloc(8)
  fmt.write('fmt ', 0)
  fmt.writeUInt32LE(16, 4)
  return Buffer.concat([
    header,
    fmt,
    Buffer.from('data'),
    Buffer.from([data.byteLength, 0, 0, 0]),
    data,
  ])
}

interface SoundCorpusOptions {
  chunkCount?: number
  dropWav?: number
  corruptWav?: number
  sizeDrift?: number
  emptyMismatch?: boolean
  manifestDup?: number
  dirExtra?: string
}

function buildSoundCorpus(repo: string, options: SoundCorpusOptions = {}): void {
  const chunkCount = options.chunkCount ?? 505
  const chunks = Array.from({ length: chunkCount }, (_v, index) => {
    const isEmpty = index === 0 || index >= 4
    return { index, size: isEmpty ? 0 : wavBytes(index).byteLength, isEmpty }
  })
  if (options.emptyMismatch) chunks[1] = { ...chunks[1]!, isEmpty: !chunks[1]!.isEmpty }
  const metadata = { chunkCount, chunks }
  mkdirSync(resolve(repo, 'data/extracted/data'), { recursive: true })
  writeFileSync(resolve(repo, 'data/extracted/data/sounds-metadata.json'), JSON.stringify(metadata))
  mkdirSync(resolve(repo, 'data/extracted/sounds'), { recursive: true })
  const manifestFiles: { path: string; size: number }[] = []
  for (const chunk of chunks) {
    if (chunk.isEmpty) continue
    if (chunk.index === options.dropWav) continue
    let bytes = wavBytes(chunk.index)
    // 只破坏 offset 8 的 WAVE 标签（保留 RIFF 魔数），使断言钉在 WAVE 轴上。
    if (chunk.index === options.corruptWav) Buffer.from('WAVX').copy(bytes, 8)
    if (chunk.index === options.sizeDrift) bytes = Buffer.concat([bytes, Buffer.from('x')])
    writeFileSync(resolve(repo, 'data/extracted/sounds', `${chunk.index}.wav`), bytes)
    manifestFiles.push({ path: `sounds/${chunk.index}.wav`, size: bytes.byteLength })
    if (options.manifestDup !== undefined && chunk.index === options.manifestDup)
      manifestFiles.push({ path: `sounds/${chunk.index}.wav`, size: bytes.byteLength })
  }
  if (options.dirExtra) {
    writeFileSync(resolve(repo, 'data/extracted/sounds', options.dirExtra), 'x')
  }
  writeFileSync(
    resolve(repo, 'data/extracted/asset-manifest.json'),
    JSON.stringify({ files: manifestFiles }),
  )
}

describe('O04 loadPalSoundAssets：合成 505 段三向闭包', () => {
  test('合法语料：3 个非空段 + 502 空段全部通过并登记 RIFF 证据', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo)
    const { binaries, report } = loadPalSoundAssets(repo)
    expect(report).toMatchObject({ sounds: 3, emptySounds: 502 })
    expect(binaries).toHaveLength(3)
    expect(binaries[0]).toMatchObject({
      id: 'sound.pal.001',
      record: { kind: 'sound', mediaType: 'audio/wav' },
    })
  })

  test('chunkCount 非 505 → 精确诊断', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo, { chunkCount: 504 })
    expect(() => loadPalSoundAssets(repo)).toThrow('PAL sounds metadata 期望 505 段，收到 504')
  })

  test('chunkCount 与 chunks 长度不一致 → 精确诊断', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo)
    const path = resolve(repo, 'data/extracted/data/sounds-metadata.json')
    const metadata = JSON.parse(readFileSync(path, 'utf8')) as { chunkCount: number }
    metadata.chunkCount = 506
    writeFileSync(path, JSON.stringify(metadata))
    expect(() => loadPalSoundAssets(repo)).toThrow(/chunkCount=506，chunks=505/)
  })

  test('段号不连续 / size 非法 / isEmpty 不一致逐轴拒绝', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo)
    const path = resolve(repo, 'data/extracted/data/sounds-metadata.json')
    const metadata = JSON.parse(readFileSync(path, 'utf8')) as {
      chunks: Array<{ index: number; size: number; isEmpty: boolean }>
    }
    metadata.chunks[4]!.index = 99
    writeFileSync(path, JSON.stringify(metadata))
    expect(() => loadPalSoundAssets(repo)).toThrow('PAL sound 段号不连续，期望 4，实际 99')

    const repo2 = tempRepo()
    buildSoundCorpus(repo2)
    const path2 = resolve(repo2, 'data/extracted/data/sounds-metadata.json')
    const metadata2 = JSON.parse(readFileSync(path2, 'utf8')) as {
      chunks: Array<{ index: number; size: number; isEmpty: boolean }>
    }
    metadata2.chunks[4]!.size = -1
    writeFileSync(path2, JSON.stringify(metadata2))
    expect(() => loadPalSoundAssets(repo2)).toThrow('PAL sound 4: size 非法')

    const repo3 = tempRepo()
    buildSoundCorpus(repo3, { emptyMismatch: true })
    expect(() => loadPalSoundAssets(repo3)).toThrow('PAL sound 1: isEmpty 与 size 不一致')
  })

  test('asset-manifest 重复 sound / 目录非规范文件 / 集合不闭包 逐轴拒绝', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo, { manifestDup: 1 })
    expect(() => loadPalSoundAssets(repo)).toThrow('PAL asset-manifest 重复 sound 1')

    const repo2 = tempRepo()
    buildSoundCorpus(repo2, { dirExtra: 'junk.wav' })
    expect(() => loadPalSoundAssets(repo2)).toThrow('PAL sounds 目录出现非规范文件 junk.wav')

    const repo3 = tempRepo()
    buildSoundCorpus(repo3, { dropWav: 2 })
    expect(() => loadPalSoundAssets(repo3)).toThrow(
      'PAL asset-manifest sounds 与 metadata 不闭包：missing=2 extra=',
    )
  })

  test('metadata/manifest/磁盘 size 三向不一致 → 拒绝；非 RIFF 字节 → 拒绝', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo, { sizeDrift: 1 })
    expect(() => loadPalSoundAssets(repo)).toThrow(
      'PAL sound 1: metadata/manifest/文件 size 不一致',
    )

    const repo2 = tempRepo()
    buildSoundCorpus(repo2, { corruptWav: 2 })
    expect(() => loadPalSoundAssets(repo2)).toThrow('PAL sound 2: 不是 RIFF/WAVE 文件')
  })
})

function buildImageCorpus(
  repo: string,
  options: {
    portraits?: number
    bgWidth?: number
    bgBadColor?: boolean
    dropIcon?: boolean
    badPalette?: boolean
  } = {},
): void {
  const palette = options.badPalette ? { colors: PALETTE_256.colors.slice(0, 255) } : PALETTE_256
  mkdirSync(resolve(repo, 'data/extracted/data/palette'), { recursive: true })
  writeFileSync(resolve(repo, 'data/extracted/data/palette/0.json'), JSON.stringify(palette))
  writeFileSync(
    resolve(repo, 'data/extracted/data/portraits.json'),
    JSON.stringify({ count: options.portraits ?? 88 }),
  )
  const portraits = options.portraits ?? 88
  for (let chunk = 1; chunk <= portraits; chunk++)
    writePng(
      resolve(repo, 'data/extracted/images/portraits', `${String(chunk).padStart(2, '0')}.png`),
      2,
      2,
      () => [1, 1, 1, 255],
    )
  for (const frame of [48, 49, 50, 51, 52])
    writePng(resolve(repo, 'data/extracted/images/ui', `frame-${frame}.png`), 2, 2, () => [
      1, 1, 1, 255,
    ])
  const items = Array.from({ length: 233 }, (_v, i) => ({ id: i + 1, bitmap: i + 1 }))
  items.push({ id: 277, bitmap: 0 })
  mkdirSync(resolve(repo, 'data/extracted/data'), { recursive: true })
  writeFileSync(resolve(repo, 'data/extracted/data/items.json'), JSON.stringify(items))
  for (let chunk = 1; chunk <= 233; chunk++) {
    if (options.dropIcon && chunk === 1) continue
    writePng(
      resolve(repo, 'data/extracted/images/items', `${String(chunk).padStart(3, '0')}.png`),
      2,
      2,
      () => [2, 2, 2, 255],
    )
  }
  for (let chunk = 6; chunk <= 57; chunk++) {
    const width = options.bgWidth ?? 320
    writePng(
      resolve(repo, 'data/extracted/images/battle/bg', `${String(chunk).padStart(3, '0')}.png`),
      width,
      200,
      (x, y) => {
        const index = (x + y) % 256
        return options.bgBadColor
          ? [index, (index + 1) % 256, index, 255]
          : [index, index, index, 255]
      },
    )
  }
}

describe('O04 loadPalStaticImages：合成 88 立绘/5 头像/233 图标/52 背景', () => {
  test('合法合成语料通过全部 census 并产出 378 个登记项', () => {
    const repo = tempRepo()
    buildImageCorpus(repo)
    const { binaries, report } = loadPalStaticImages(repo)
    expect(report).toMatchObject({
      portraits: 88,
      faces: 5,
      itemIcons: 233,
      battleBackgrounds: 52,
    })
    expect(binaries).toHaveLength(88 + 5 + 233 + 52)
    expect(binaries[0]).toMatchObject({ record: { kind: 'portrait', mediaType: 'image/png' } })
  }, 30_000)

  test('调色板非 256 色 / 立绘数量漂移 / 图标缺失逐轴拒绝', () => {
    const repo = tempRepo()
    buildImageCorpus(repo, { badPalette: true })
    expect(() => loadPalStaticImages(repo)).toThrow(/PAL 颜色表必须含 256 色/)

    const repo2 = tempRepo()
    buildImageCorpus(repo2, { portraits: 87 })
    expect(() => loadPalStaticImages(repo2)).toThrow('PAL 立绘期望 88 张，收到 87')

    const repo3 = tempRepo()
    buildImageCorpus(repo3, { dropIcon: true })
    expect(() => loadPalStaticImages(repo3)).toThrow('PAL 物品图标源缺失: images/items/001.png')
  }, 30_000)

  test('战场背景尺寸漂移与 R=G=B 违约逐轴拒绝', () => {
    const repo = tempRepo()
    buildImageCorpus(repo, { bgWidth: 319 })
    expect(() => loadPalStaticImages(repo)).toThrow(
      'PAL 战场背景 006: 战场背景期望 320×200，实际 319×200',
    )

    const repo2 = tempRepo()
    buildImageCorpus(repo2, { bgBadColor: true })
    expect(() => loadPalStaticImages(repo2)).toThrow(/不满足 R=G=B=index 且 alpha=255/)
  }, 30_000)
})

describe('O04 loadPalSoundAssets：metadata/manifest 形状边界', () => {
  test('metadata 非对象与 chunkCount 非整数 → 精确诊断', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, 'data/extracted/data'), { recursive: true })
    writeFileSync(resolve(repo, 'data/extracted/data/sounds-metadata.json'), JSON.stringify([1, 2]))
    expect(() => loadPalSoundAssets(repo)).toThrow(
      'PAL sounds metadata 期望 {chunkCount,chunks} 对象',
    )

    const repo2 = tempRepo()
    buildSoundCorpus(repo2)
    const path = resolve(repo2, 'data/extracted/data/sounds-metadata.json')
    writeFileSync(path, JSON.stringify({ chunkCount: '505', chunks: [] }))
    expect(() => loadPalSoundAssets(repo2)).toThrow(
      'PAL sounds metadata 期望 {chunkCount,chunks} 对象',
    )
  })

  test('asset-manifest.files 非数组 → 精确诊断', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo)
    writeFileSync(
      resolve(repo, 'data/extracted/asset-manifest.json'),
      JSON.stringify({ files: 'nope' }),
    )
    expect(() => loadPalSoundAssets(repo)).toThrow('PAL asset-manifest.files 期望数组')
  })

  test('目录多余非空 wav → 目录轴不闭包报 extra', () => {
    const repo = tempRepo()
    buildSoundCorpus(repo)
    writeFileSync(resolve(repo, 'data/extracted/sounds', '9.wav'), wavBytes(9))
    expect(() => loadPalSoundAssets(repo)).toThrow(
      'PAL sounds 目录 与 metadata 不闭包：missing= extra=9',
    )
  })

  test('全部 505 段为空 → 零非空音效仍通过（空目录闭包）', () => {
    const repo = tempRepo()
    const chunks = Array.from({ length: 505 }, (_v, index) => ({ index, size: 0, isEmpty: true }))
    mkdirSync(resolve(repo, 'data/extracted/data'), { recursive: true })
    writeFileSync(
      resolve(repo, 'data/extracted/data/sounds-metadata.json'),
      JSON.stringify({ chunkCount: 505, chunks }),
    )
    mkdirSync(resolve(repo, 'data/extracted/sounds'), { recursive: true })
    writeFileSync(
      resolve(repo, 'data/extracted/asset-manifest.json'),
      JSON.stringify({ files: [] }),
    )
    const { binaries, report } = loadPalSoundAssets(repo)
    expect(binaries).toEqual([])
    expect(report).toMatchObject({ sounds: 0, emptySounds: 505, soundBytes: 0 })
  })
})

describe('O04 loadPalStaticImages：物品哨兵与立绘 manifest 边界', () => {
  function buildBase(repo: string): void {
    buildImageCorpus(repo)
  }

  function rewriteItems(repo: string, items: unknown): void {
    writeFileSync(resolve(repo, 'data/extracted/data/items.json'), JSON.stringify(items))
  }

  test('portraits manifest count 非正整数 → 精确诊断', () => {
    const repo = tempRepo()
    buildBase(repo)
    writeFileSync(resolve(repo, 'data/extracted/data/portraits.json'), JSON.stringify({ count: 0 }))
    expect(() => loadPalStaticImages(repo)).toThrow('PAL portraits manifest 期望正整数 count')
    writeFileSync(
      resolve(repo, 'data/extracted/data/portraits.json'),
      JSON.stringify({ count: 'x' }),
    )
    expect(() => loadPalStaticImages(repo)).toThrow('PAL portraits manifest 期望正整数 count')
  })

  test('items 数量/零哨兵漂移 → 物品图标哨兵诊断', () => {
    const repo = tempRepo()
    buildBase(repo)
    const items = Array.from({ length: 233 }, (_v, i) => ({ id: i + 1, bitmap: i + 1 }))
    rewriteItems(repo, items)
    expect(() => loadPalStaticImages(repo)).toThrow('PAL 物品图标 0 哨兵漂移: items=233 zero=')

    const repo2 = tempRepo()
    buildBase(repo2)
    const drifted = Array.from({ length: 234 }, (_v, i) => ({
      id: i + 1,
      bitmap: i === 233 ? 0 : i + 1,
    }))
    rewriteItems(repo2, drifted)
    // 唯一零哨兵存在但 id 是 234 而非 277 → 数量计数成立后仍按哨兵漂移拒绝。
    expect(() => loadPalStaticImages(repo2)).toThrow('PAL 物品图标 0 哨兵漂移: items=234 zero=234')

    const repo3 = tempRepo()
    buildBase(repo3)
    // 零哨兵保持 id 277；非零 bitmap 出现重复 → 去重后 chunk 数漂移。
    const dupBitmap = [
      ...Array.from({ length: 233 }, (_v, i) => ({ id: i + 1, bitmap: i === 232 ? 1 : i + 1 })),
      { id: 277, bitmap: 0 },
    ]
    rewriteItems(repo3, dupBitmap)
    expect(() => loadPalStaticImages(repo3)).toThrow('PAL 非零物品图标期望 233 个，收到 232')
  }, 30_000)

  test('零哨兵 id 恰为 277 的正控在语料中成立（防回归锚）', () => {
    const repo = tempRepo()
    buildBase(repo)
    const items = JSON.parse(
      readFileSync(resolve(repo, 'data/extracted/data/items.json'), 'utf8'),
    ) as Array<{ id: number; bitmap: number }>
    const zero = items.filter((item) => item.bitmap === 0).map((item) => item.id)
    expect(zero).toEqual([277])
  }, 30_000)
})

describe('O04 materializePalAssets：混合所有权与嵌套目录', () => {
  test('authored + 双 generated 混合计数与嵌套目录创建', () => {
    const repo = tempRepo()
    const content = new TextEncoder().encode('xyz')
    mkdirSync(resolve(repo, 'projects/pal/assets/authored/deep'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal/assets/authored/deep/c-x.bin'), 'xyz')
    const authoredRecord: AssetRecordV1 = {
      kind: 'portrait',
      path: 'assets/authored/deep/c-x.bin',
      mediaType: 'application/octet-stream',
      bytes: content.byteLength,
      sha256: sha256(content),
      origin: { kind: 'authored' },
    }
    const gen = sourceOf('g.x', 'gg')
    gen.record = { ...gen.record, path: 'assets/generated/deep/nested-g.bin' }
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'c.x': authoredRecord, 'g.x': gen.record },
    }
    const report = materializePalAssets({
      repo,
      catalog,
      binaries: [{ id: 'c.x', bytes: content, record: authoredRecord }, gen],
    })
    expect(report).toMatchObject({ authored: 1, written: 1, files: 2 })
    expect(existsSync(resolve(repo, 'projects/pal/assets/authored/deep/c-x.bin'))).toBe(true)
    expect(existsSync(resolve(repo, 'projects/pal/assets/generated/deep/nested-g.bin'))).toBe(true)
    expect(existsSync(resolve(repo, 'projects/pal/assets/generated/g.x.bin'))).toBe(false)
  })
})
