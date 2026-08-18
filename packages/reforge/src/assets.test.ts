import type { AssetCatalogV1, BattleSpriteDef } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { AssetBase } from './assets.js'
import {
  BattleSpriteAssetCache,
  compressGzip,
  loadBattleSpriteDefinition,
  loadProjectMap,
  loadSpriteAsset,
  loadStandardPalette,
  loadTileset,
  SpriteAssetCache,
} from './assets.js'
import { type FileSource, projectRelativeLegacyAdapter } from './file-source.js'

const paletteCatalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    standard: {
      kind: 'color-table',
      path: 'assets/migrated/colors/standard.json',
      mediaType: 'application/json',
      bytes: 0,
      sha256: 'a'.repeat(64),
      origin: { kind: 'legacy-migrated' },
    },
  },
}

const base = (source: FileSource): AssetBase => ({
  root: '/extracted/data',
  palettes: 'palette',
  io: source.legacy ?? projectRelativeLegacyAdapter(source),
  assetResolver: new AssetResolver(
    'test',
    paletteCatalog,
    { 'visual.standardColorTable': 'standard' },
    source,
  ),
})

function memSource(json: unknown, roleJson: unknown = json): FileSource {
  return {
    readText: async (path) => JSON.stringify(path.includes('standard.json') ? roleJson : json),
    readJson: async <T>() => json as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (rel: string) => rel,
  }
}

describe('assets.ts 经 FileSource 读', () => {
  const projectMap = {
    version: 4 as const,
    width: 1,
    height: 1,
    tilesetRefs: ['tileset-001'],
    layers: [{ id: 'floor', name: '地板', tiles: [[null], [null]], sources: [[null], [null]] }],
    collision: [[0], [0]],
  }

  test('地图走 legacy adapter，工程标准色彩只走角色 resolver', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    }
    const src = memSource(projectMap, palette)
    expect(await loadProjectMap(base(src), 'content/maps/a.json')).toEqual(projectMap)
    expect(await loadStandardPalette(base(src))).toEqual(palette)
    expect(fetchMock).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('loadProjectMap 在加载边界校验 ProjectMap schema', async () => {
    expect(await loadProjectMap(base(memSource(projectMap)), 'content/maps/a.json')).toEqual(
      projectMap,
    )
    await expect(
      loadProjectMap(base(memSource({ ...projectMap, collision: [[0]] })), 'content/maps/a.json'),
    ).rejects.toThrow('期望 2 行')
  })

  test('loadProjectMap 只接受当前 v4 且未知 authoring 版本 fail-loud', async () => {
    const current = {
      ...projectMap,
      layers: [{ ...projectMap.layers[0]!, tiles: [[1], [null]], sources: [[0], [null]] }],
      authoring: {
        version: 1,
        stampPlacements: [
          {
            id: 'placement-1',
            anchor: { row: 0, col: 0 },
            visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
            gridPoints: [],
          },
        ],
      },
    }
    await expect(loadProjectMap(base(memSource(current)), 'content/maps/a.json')).resolves.toEqual(
      current,
    )
    await expect(
      loadProjectMap(base(memSource({ ...current, version: 3 })), 'content/maps/a.json'),
    ).rejects.toThrow('仅支持当前版本 4')
    await expect(
      loadProjectMap(
        base(memSource({ ...current, authoring: { ...current.authoring, version: 2 } })),
        'content/maps/a.json',
      ),
    ).rejects.toThrow('authoring.version')
  })
})

describe('loadTileset AssetId 唯一链', () => {
  const gz = async (): Promise<ArrayBuffer> => {
    const out = await compressGzip(new Uint8Array([1, 0, 1, 0, 1, 0, 1, 5]))
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
  }
  test('只按 catalog path 读取并校验 hash', async () => {
    const seen: string[] = []
    const bytes = await gz()
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        tiles: {
          kind: 'tileset',
          path: 'assets/migrated/tilesets/020.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: bytes.byteLength,
          sha256,
          origin: { kind: 'legacy-migrated' },
        },
      },
    }
    const src: FileSource = {
      readText: async () => '',
      readJson: async <T>() => ({}) as T,
      readBytes: async (rel: string) => {
        seen.push(rel)
        return bytes
      },
      urlFor: async (rel: string) => rel,
    }
    const assetBase = base(src)
    assetBase.assetResolver = new AssetResolver('test', catalog, {}, src)
    await expect(loadTileset(assetBase, 'tiles')).resolves.toHaveProperty('size', 1)
    expect(seen).toEqual(['assets/migrated/tilesets/020.rle'])
  })
})

describe('loadSpriteAsset AssetId 唯一链', () => {
  const canonical = new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0x44])
  const fixture = async (pixel = 0x44) => {
    const raw = canonical.slice()
    raw[7] = pixel
    const out = await compressGzip(raw)
    const bytes = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
    return { bytes, sha256 }
  }

  test('只按 catalog record 读取并校验 kind/media/bytes/hash/gzip', async () => {
    const { bytes, sha256 } = await fixture()
    const readBytes = vi.fn(async () => bytes)
    const record = {
      kind: 'sprite' as const,
      path: 'assets/migrated/sprites/007.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256,
      origin: { kind: 'legacy-migrated' as const },
    }
    const reader = { record: () => record, readBytes }
    const loaded = await loadSpriteAsset(reader, 'sprite.pal.007')
    expect(loaded.frames).toHaveLength(1)
    expect(loaded.frames[0]?.pixels[0]).toBe(0x44)
    expect(loaded.profile).toBe('legacy-migrated')
    expect(readBytes).toHaveBeenCalledWith('sprite.pal.007', 'sprite')

    await expect(
      loadSpriteAsset({ ...reader, record: () => ({ ...record, sha256: '0'.repeat(64) }) }, 'bad'),
    ).rejects.toThrow('sha256')
    await expect(
      loadSpriteAsset(
        {
          ...reader,
          record: () => ({ ...record, mediaType: 'application/octet-stream' }),
        },
        'bad',
      ),
    ).rejects.toThrow('mediaType')
    await expect(
      loadSpriteAsset({ ...reader, readBytes: async () => canonical.buffer.slice(0) }, 'bare'),
    ).rejects.toThrow('bytes')
  })

  test('缓存按 AssetId 共享，record SHA/path/origin 变化失效，失败不会污染重试', async () => {
    const first = await fixture(0x11)
    const second = await fixture(0x22)
    let current = first
    let path = 'assets/authored/sprites/first.rle'
    let origin: 'authored' | 'legacy-migrated' = 'authored'
    const readBytes = vi.fn(async () => current.bytes)
    const reader = {
      record: () => ({
        kind: 'sprite' as const,
        path,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: current.bytes.byteLength,
        sha256: current.sha256,
        origin: { kind: origin },
      }),
      readBytes,
    }
    const cache = new SpriteAssetCache()
    const [a, b] = await Promise.all([
      cache.load(reader, 'sprite.shared'),
      cache.load(reader, 'sprite.shared'),
    ])
    expect(a).toBe(b)
    expect(readBytes).toHaveBeenCalledTimes(1)

    current = second
    path = 'assets/authored/sprites/second.rle'
    const changed = await cache.load(reader, 'sprite.shared')
    expect(changed.frames[0]?.pixels[0]).toBe(0x22)
    expect(readBytes).toHaveBeenCalledTimes(2)

    origin = 'legacy-migrated'
    await cache.load(reader, 'sprite.shared')
    expect(readBytes).toHaveBeenCalledTimes(3)

    const failedReader = { ...reader, readBytes: vi.fn(async () => new ArrayBuffer(1)) }
    await expect(cache.load(failedReader, 'sprite.failed')).rejects.toThrow()
    await expect(cache.load(reader, 'sprite.failed')).resolves.toBeDefined()
  })

  test('容量裁剪保留当前场景 protected 资产，并淘汰最旧非保护项', async () => {
    const entries = new Map(
      await Promise.all(
        [
          ['sprite.a', 0x11],
          ['sprite.b', 0x22],
          ['sprite.c', 0x33],
        ].map(async ([asset, pixel]) => [asset, await fixture(pixel as number)] as const),
      ),
    )
    const reader = {
      record: (asset: string) => {
        const entry = entries.get(asset)
        if (!entry) throw new Error(`missing ${asset}`)
        return {
          kind: 'sprite' as const,
          path: `assets/authored/sprites/${asset}.rle`,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: entry.bytes.byteLength,
          sha256: entry.sha256,
          origin: { kind: 'authored' as const },
        }
      },
      readBytes: async (asset: string) => {
        const entry = entries.get(asset)
        if (!entry) throw new Error(`missing ${asset}`)
        return entry.bytes
      },
    }
    const cache = new SpriteAssetCache(2)
    await cache.load(reader, 'sprite.a')
    await cache.load(reader, 'sprite.b')
    await cache.load(reader, 'sprite.c')
    cache.prune(new Set(['sprite.a']))

    expect(cache.get(reader, 'sprite.a')).toBeDefined()
    expect(cache.get(reader, 'sprite.b')).toBeUndefined()
    expect(cache.get(reader, 'sprite.c')).toBeDefined()
  })
})

describe('BattleSpriteDef + catalog loader/cache 唯一链', () => {
  const fixture = async (pixel = 0x44) => {
    const raw = new Uint8Array([1, 0, 1, 0, 1, 0, 1, pixel])
    const out = await compressGzip(raw)
    const bytes = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
    return { bytes, sha256 }
  }
  const definition = (asset = 'battle.shared'): BattleSpriteDef => ({
    id: 'fighter',
    label: '战士',
    asset,
    profile: {
      kind: 'player-fighter',
      frames: {
        idle: 0,
        dying: 0,
        dead: 0,
        defend: 0,
        hurt: 0,
        preMagic: 0,
        magic: 0,
        attackWindup: 0,
        attackRush: 0,
        attackStrike: 0,
      },
      castEffectBase: 0,
      attackEffectBase: 0,
    },
  })

  test('并发共享 promise，完整 record 变化失效，失败驱逐后可重试', async () => {
    const first = await fixture(0x11)
    const second = await fixture(0x22)
    let current = first
    let path = 'assets/authored/battle/first.rle'
    let label = 'first'
    const readBytes = vi.fn(async () => current.bytes)
    const reader = {
      record: () => ({
        kind: 'battle-sprite' as const,
        path,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: current.bytes.byteLength,
        sha256: current.sha256,
        label,
        origin: { kind: 'authored' as const },
      }),
      readBytes,
    }
    const cache = new BattleSpriteAssetCache()
    const [left, right] = await Promise.all([
      cache.load(reader, 'battle.shared'),
      cache.load(reader, 'battle.shared'),
    ])
    expect(left).toBe(right)
    expect(readBytes).toHaveBeenCalledTimes(1)

    current = second
    path = 'assets/authored/battle/second.rle'
    expect((await cache.load(reader, 'battle.shared')).frames[0]?.pixels[0]).toBe(0x22)
    expect(readBytes).toHaveBeenCalledTimes(2)
    label = 'second-label'
    await cache.load(reader, 'battle.shared')
    expect(readBytes).toHaveBeenCalledTimes(3)

    const failed = { ...reader, readBytes: vi.fn(async () => new ArrayBuffer(1)) }
    await expect(cache.load(failed, 'battle.failed')).rejects.toThrow()
    await expect(cache.load(reader, 'battle.failed')).resolves.toBeDefined()
  })

  test('definition profile/kind/帧越界在 readiness fail-loud', async () => {
    const current = await fixture()
    const reader = {
      record: () => ({
        kind: 'battle-sprite' as const,
        path: 'assets/generated/battle.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: current.bytes.byteLength,
        sha256: current.sha256,
        origin: { kind: 'generated' as const },
      }),
      readBytes: async () => current.bytes,
    }
    const cache = new BattleSpriteAssetCache()
    await expect(
      loadBattleSpriteDefinition(cache, reader, definition(), 'player-fighter'),
    ).resolves.toMatchObject({ definition: { id: 'fighter' } })
    await expect(loadBattleSpriteDefinition(cache, reader, definition(), 'enemy')).rejects.toThrow(
      'profile 期望 enemy',
    )
    const outOfRange = definition()
    if (outOfRange.profile.kind !== 'player-fighter') throw new Error('fixture profile')
    outOfRange.profile.frames.attackStrike = 1
    await expect(
      loadBattleSpriteDefinition(cache, reader, outOfRange, 'player-fighter'),
    ).rejects.toThrow(/AssetId.*只有 1 帧/)
  })
})
