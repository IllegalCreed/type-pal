import type { FileSource } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { cloneFromPal } from './clone.js'
import { buildSeedAssets } from './seed-assets.js'

function memSource(files: Record<string, unknown>): FileSource {
  const lane: NonNullable<FileSource['legacy']> = {
    readText: async (rel) => JSON.stringify(files[rel]),
    readJson: async <T>(rel: string) => {
      if (!(rel in files)) throw new Error(`memSource 404 ${rel}`)
      return files[rel] as T
    },
    readBytes: async (rel) => {
      if (!(rel in files)) throw new Error(`memSource 404 ${rel}`)
      return files[rel] as ArrayBuffer
    },
    urlFor: async (rel) => rel,
  }
  return { ...lane, legacy: lane }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 录写 mock 目录句柄:createWritable 的 write→close 把内容记进 written(全路径为键)。 */
function recordingDir(): { dir: FileSystemDirectoryHandle; written: Map<string, unknown> } {
  const written = new Map<string, unknown>()
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      async getDirectoryHandle(name: string) {
        return make(prefix ? `${prefix}/${name}` : name)
      },
      async getFileHandle(name: string) {
        const full = prefix ? `${prefix}/${name}` : name
        return {
          async createWritable() {
            let buf: unknown
            return {
              async write(v: unknown) {
                buf = v
              },
              async close() {
                written.set(full, buf)
              },
            }
          },
        }
      },
    }) as unknown as FileSystemDirectoryHandle
  return { dir: make(''), written }
}

describe('cloneFromPal', () => {
  const portraitBytes = new ArrayBuffer(50)
  const portraitSha = 'cc2786e1f9910a9d811400edcddaf7075195f7a16b216dcbefba3bc7c4f2ae51'
  const manifest = {
    id: 'pal',
    name: 'PAL',
    contentVersion: 4,
    entryScene: 's1',
    content: { actors: 'content/actors.json', scenes: 'content/scenes/' },
    assets: {
      catalog: 'assets/index.json',
      roles: {},
      legacy: {
        families: ['tileset', 'sprite', 'color-table'],
        root: '/extracted/data',
        tilesets: 'tileset',
        sprites: 'sprite',
        palettes: 'palette',
      },
    },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  }
  const seedFiles: Record<string, unknown> = {
    'manifest.json': manifest,
    'content/scenes/index.json': ['s1'],
    '/extracted/asset-manifest.json': { files: [{ path: 'data/tileset/1.rle', size: 100 }] },
    'content/actors.json': [{ id: 'a' }],
    'content/scenes/s1.json': { id: 's1' },
    'assets/index.json': {
      version: 1,
      assets: {
        'portrait.pal.001': {
          kind: 'portrait',
          path: 'assets/migrated/portraits/001.png',
          mediaType: 'image/png',
          bytes: 50,
          sha256: portraitSha,
          origin: { kind: 'legacy-migrated' },
        },
      },
    },
    '/extracted/data/tileset/1.rle': new ArrayBuffer(100),
    'assets/migrated/portraits/001.png': portraitBytes,
  }

  test('写相对化 manifest + 全部内容/素材文件;进度累计到满', async () => {
    const { dir, written } = recordingDir()
    const prog: Array<[number, number]> = []
    await cloneFromPal(memSource(seedFiles), dir, (d, t) => prog.push([d, t]))

    // manifest 相对化落盘
    const m = JSON.parse(written.get('manifest.json') as string)
    expect(m.assets.legacy.root).toBe('assets/extracted/data')
    expect(m.assets.legacy.portraits).toBeUndefined()
    // 内容 + 场景 + 素材(catalog/extracted)都写了
    expect(written.has('content/actors.json')).toBe(true)
    expect(written.has('content/scenes/index.json')).toBe(true)
    expect(written.has('content/scenes/s1.json')).toBe(true)
    expect(written.has('assets/extracted/data/tileset/1.rle')).toBe(true)
    expect(written.has('assets/migrated/portraits/001.png')).toBe(true)
    // 进度:末次 = 满(100 + 50)
    expect(prog.at(-1)).toEqual([150, 150])
  })

  test('canonical PAL clone 逐字节复制 catalog tileset，并过滤 extracted 重复项', async () => {
    const tileBytes = (await buildSeedAssets()).tilesetRle
    const tileHash = await sha256Hex(tileBytes)
    const canonicalManifest = {
      ...manifest,
      content: { ...manifest.content, tilesets: 'content/tilesets.json' },
      assets: {
        ...manifest.assets,
        legacy: {
          ...manifest.assets.legacy,
          families: ['sprite', 'color-table'],
          tilesets: undefined,
        },
      },
    }
    const source = memSource({
      'manifest.json': canonicalManifest,
      'content/scenes/index.json': ['s1'],
      'content/scenes/s1.json': { id: 's1' },
      'content/actors.json': [],
      'content/tilesets.json': [
        { id: 'tileset-001', name: '瓦片集 1', category: 'builtin', asset: 'tileset.pal.001' },
      ],
      '/extracted/asset-manifest.json': {
        files: [{ path: 'data/tileset/1.rle', size: tileBytes.byteLength }],
      },
      '/extracted/data/tileset/1.rle': tileBytes,
      'assets/index.json': {
        version: 1,
        assets: {
          'tileset.pal.001': {
            kind: 'tileset',
            path: 'assets/migrated/tilesets/001.rle',
            mediaType: 'application/vnd.type-pal.rle',
            bytes: tileBytes.byteLength,
            sha256: tileHash,
            origin: { kind: 'legacy-migrated' },
          },
        },
      },
      'assets/migrated/tilesets/001.rle': tileBytes,
    })
    const { dir, written } = recordingDir()
    await cloneFromPal(source, dir, () => {})

    const copied = written.get('assets/migrated/tilesets/001.rle') as Blob
    expect(new Uint8Array(await copied.arrayBuffer())).toEqual(new Uint8Array(tileBytes))
    expect(written.has('assets/extracted/data/tileset/1.rle')).toBe(false)
    expect(JSON.parse(written.get('manifest.json') as string).assets.legacy.families).not.toContain(
      'tileset',
    )
  })

  test('canonical battle-sprite clone 全结构校验、逐字节复制并过滤旧目录与描述清单', async () => {
    const battleBytes = (await buildSeedAssets()).battleSpriteRle
    const battleHash = await sha256Hex(battleBytes)
    const battlePath = 'assets/migrated/battle-sprites/player/000.rle'
    const canonicalManifest = {
      ...manifest,
      content: { ...manifest.content, battleSprites: 'content/battle-sprites.json' },
      assets: {
        ...manifest.assets,
        legacy: { ...manifest.assets.legacy, families: ['sprite', 'color-table'] },
      },
    }
    const source = memSource({
      'manifest.json': canonicalManifest,
      'content/scenes/index.json': ['s1'],
      'content/scenes/s1.json': { id: 's1' },
      'content/actors.json': [],
      'content/battle-sprites.json': [
        {
          id: 'fighter-0',
          label: '李逍遥',
          asset: 'battle-sprite.pal.player.000',
          profile: { kind: 'summon' },
        },
      ],
      '/extracted/asset-manifest.json': {
        files: [
          { path: 'data/battle-sprites.json', size: 10 },
          { path: 'data/battle-sprite/player/0.rle', size: battleBytes.byteLength },
        ],
      },
      '/extracted/data/battle-sprites.json': new ArrayBuffer(10),
      '/extracted/data/battle-sprite/player/0.rle': battleBytes,
      'assets/index.json': {
        version: 1,
        assets: {
          'battle-sprite.pal.player.000': {
            kind: 'battle-sprite',
            path: battlePath,
            mediaType: 'application/vnd.type-pal.rle',
            bytes: battleBytes.byteLength,
            sha256: battleHash,
            origin: { kind: 'legacy-migrated', ref: 'battle-sprite/player/0.rle' },
          },
        },
      },
      [battlePath]: battleBytes,
    })
    const { dir, written } = recordingDir()
    await cloneFromPal(source, dir, () => {})
    expect(new Uint8Array(await (written.get(battlePath) as Blob).arrayBuffer())).toEqual(
      new Uint8Array(battleBytes),
    )
    expect(written.has('assets/extracted/data/battle-sprites.json')).toBe(false)
    expect(written.has('assets/extracted/data/battle-sprite/player/0.rle')).toBe(false)
  })

  test('.rle 下载后解压再写(去 gzip 头,避 Safe Browsing 深扫)', async () => {
    const raw = new Uint8Array([9, 8, 7, 6, 5])
    const gz = await new Response(
      new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer()
    const seed = memSource({
      'manifest.json': manifest,
      'content/scenes/index.json': ['s1'],
      '/extracted/asset-manifest.json': {
        files: [{ path: 'data/sprite/1.rle', size: gz.byteLength }],
      },
      'assets/index.json': { version: 1, assets: {} },
      'content/actors.json': [],
      'content/scenes/s1.json': { id: 's1' },
      '/extracted/data/sprite/1.rle': gz,
    })
    const { dir, written } = recordingDir()
    await cloneFromPal(seed, dir, () => {})
    const w = written.get('assets/extracted/data/sprite/1.rle') as Blob
    const bytes = new Uint8Array(await w.arrayBuffer())
    expect([...bytes]).toEqual([9, 8, 7, 6, 5]) // 写的是解压后的原始字节,不是 gzip
  })

  test('分片脚本工程克隆 index 与全部 chunk', async () => {
    const scriptsManifest = {
      ...manifest,
      content: { ...manifest.content, scripts: 'content/scripts/' },
    }
    const index = {
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: { 'scene/s1': { path: 'chunks/scene/s1.json', bytes: 10 } },
    }
    const source = memSource({
      ...seedFiles,
      'manifest.json': scriptsManifest,
      'content/scripts/index.json': index,
      'content/scripts/chunks/scene/s1.json': {
        version: 1,
        id: 'scene/s1',
        scripts: { 'scene/s1/root': [] },
      },
    })
    const { dir, written } = recordingDir()
    await cloneFromPal(source, dir, () => {})
    expect(written.has('content/scripts/index.json')).toBe(true)
    expect(written.has('content/scripts/chunks/scene/s1.json')).toBe(true)
  })

  test('地图注册表与零场景引用地图也会完整克隆', async () => {
    const mapsManifest = {
      ...manifest,
      contentVersion: 4,
      content: { ...manifest.content, maps: 'content/maps/index.json' },
    }
    const mapIndex = {
      version: 1,
      maps: [{ id: 'unused', name: '未引用地图', path: 'content/maps/unused.json' }],
    }
    const source = memSource({
      ...seedFiles,
      'manifest.json': mapsManifest,
      'content/maps/index.json': mapIndex,
      'content/maps/unused.json': { version: 1, width: 1, height: 1 },
    })
    const { dir, written } = recordingDir()
    await cloneFromPal(source, dir, () => {})

    expect(JSON.parse(written.get('content/maps/index.json') as string)).toEqual(mapIndex)
    expect(JSON.parse(written.get('content/maps/unused.json') as string)).toMatchObject({
      version: 1,
      width: 1,
      height: 1,
    })
  })
})
