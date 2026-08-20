import type { CurrentManifest } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { cloneFromPal } from './clone.js'
import { buildSeedAssets } from './seed-assets.js'

function memSource(files: Record<string, unknown>): FileSource {
  return {
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
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

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

const manifest = {
  id: 'pal',
  name: 'PAL',
  contentVersion: 16,
  minimumSaveVersion: 8,
  entryScene: 's1',
  content: { actors: 'content/actors.json', scenes: 'content/scenes/' },
  assets: { catalog: 'assets/index.json', roles: {} },
  startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
} satisfies CurrentManifest

describe('cloneFromPal', () => {
  test('写当前 manifest、内容和 catalog 资源；进度累计到满', async () => {
    const portraitBytes = new ArrayBuffer(50)
    const portraitSha = await sha256Hex(portraitBytes)
    const source = memSource({
      'manifest.json': manifest,
      'content/scenes/index.json': ['s1'],
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
      'assets/migrated/portraits/001.png': portraitBytes,
    })
    const { dir, written } = recordingDir()
    const progress: Array<[number, number]> = []

    await cloneFromPal(source, dir, (done, total) => progress.push([done, total]))

    expect(JSON.parse(written.get('manifest.json') as string)).toEqual(manifest)
    expect(written.has('content/actors.json')).toBe(true)
    expect(written.has('content/scenes/index.json')).toBe(true)
    expect(written.has('content/scenes/s1.json')).toBe(true)
    expect(written.has('assets/migrated/portraits/001.png')).toBe(true)
    expect(progress.at(-1)).toEqual([50, 50])
  })

  test('catalog tileset 按描述的 gzip 字节逐字复制', async () => {
    const tileBytes = (await buildSeedAssets()).tilesetRle
    const tileHash = await sha256Hex(tileBytes)
    const source = memSource({
      'manifest.json': {
        ...manifest,
        content: { ...manifest.content, tilesets: 'content/tilesets.json' },
      },
      'content/scenes/index.json': ['s1'],
      'content/scenes/s1.json': { id: 's1' },
      'content/actors.json': [],
      'content/tilesets.json': [
        { id: 'tileset-001', name: '瓦片集 1', category: 'builtin', asset: 'tileset.pal.001' },
      ],
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
    expect([...written.keys()].some((path) => path.includes('extracted'))).toBe(false)
  })

  test('battle-sprite 通过结构校验后逐字节复制', async () => {
    const battleBytes = (await buildSeedAssets()).battleSpriteRle
    const battleHash = await sha256Hex(battleBytes)
    const battlePath = 'assets/migrated/battle-sprites/player/000.rle'
    const source = memSource({
      'manifest.json': {
        ...manifest,
        content: { ...manifest.content, battleSprites: 'content/battle-sprites.json' },
      },
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
  })

  test('地图注册表登记的零场景引用地图也完整克隆', async () => {
    const mapIndex = {
      version: 1,
      maps: [{ id: 'unused', name: '未引用地图', path: 'content/maps/unused.json' }],
    }
    const source = memSource({
      'manifest.json': {
        ...manifest,
        content: { ...manifest.content, maps: 'content/maps/index.json' },
      },
      'content/scenes/index.json': ['s1'],
      'content/scenes/s1.json': { id: 's1' },
      'content/actors.json': [],
      'content/maps/index.json': mapIndex,
      'content/maps/unused.json': { version: 4, width: 1, height: 1 },
      'assets/index.json': { version: 1, assets: {} },
    })
    const { dir, written } = recordingDir()

    await cloneFromPal(source, dir, () => {})

    expect(JSON.parse(written.get('content/maps/index.json') as string)).toEqual(mapIndex)
    expect(JSON.parse(written.get('content/maps/unused.json') as string)).toMatchObject({
      version: 4,
      width: 1,
      height: 1,
    })
  })
})
