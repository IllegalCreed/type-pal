import { describe, expect, test, vi } from 'vitest'
import type { AssetBase } from './assets.js'
import {
  compressGzip,
  loadBattleSprite,
  loadPalette,
  loadProjectMap,
  loadSprite,
  loadTilesetByPath,
} from './assets.js'
import { type FileSource, projectRelativeLegacyAdapter } from './file-source.js'

const base = (source: FileSource): AssetBase => ({
  root: '/extracted/data',
  tilesets: 'tileset',
  sprites: 'sprite',
  palettes: 'palette',
  sounds: '',
  portraits: '',
  faces: '',
  itemIcons: '',
  io: source.legacy ?? projectRelativeLegacyAdapter(source),
})

function memSource(json: unknown): FileSource {
  return {
    readText: async () => JSON.stringify(json),
    readJson: async <T>() => json as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (rel: string) => rel,
  }
}

describe('assets.ts 经 FileSource 读', () => {
  const projectMap = {
    version: 2 as const,
    width: 1,
    height: 1,
    tilesetId: 'tileset-001',
    layers: [{ id: 'floor', name: '地板', depthMode: 'flat' as const, tiles: [[null], [null]] }],
    collision: [[0], [0]],
  }

  test('loadProjectMap/loadPalette 只走显式 legacy adapter(不碰 fetch)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const src = memSource(projectMap)
    expect(await loadProjectMap(base(src), 'content/maps/a.json')).toEqual(projectMap)
    expect(await loadPalette(base(src), 0)).toEqual(projectMap)
    expect(fetchMock).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('loadProjectMap 在加载边界校验 ProjectMapV2 schema', async () => {
    expect(await loadProjectMap(base(memSource(projectMap)), 'content/maps/a.json')).toEqual(
      projectMap,
    )
    await expect(
      loadProjectMap(base(memSource({ ...projectMap, collision: [[0]] })), 'content/maps/a.json'),
    ).rejects.toThrow('期望 2 行')
  })
})

describe('loadTilesetByPath 路径约定(W7B)', () => {
  const gz = async (): Promise<ArrayBuffer> => {
    // 最小合法 gzip(空 chunk):frameCount=0 → parseSpriteChunk []。用浏览器原生 gzip
    // (compressGzip,与被测模块同源),不引 node zlib/Buffer(reforge 是浏览器包,tsc 无 node 类型)。
    const out = await compressGzip(new Uint8Array([0, 0]))
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
  }
  test('assets/ 前缀 = 工程根相对,不拼 root;其余拼 assets root(原版借用)', async () => {
    const seen: string[] = []
    const src: FileSource = {
      readText: async () => '',
      readJson: async <T>() => ({}) as T,
      readBytes: async (rel: string) => {
        seen.push(rel)
        return gz()
      },
      urlFor: async (rel: string) => rel,
    }
    await loadTilesetByPath(base(src), 'assets/tilesets/grass.rle')
    await loadTilesetByPath(base(src), 'tileset/20.rle')
    expect(seen).toEqual(['assets/tilesets/grass.rle', '/extracted/data/tileset/20.rle'])
  })
})

describe('loadSprite 双轨路径(A4 自有上传)', () => {
  const gz = async (): Promise<ArrayBuffer> => {
    const out = await compressGzip(new Uint8Array([0, 0]))
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
  }
  test('缺 path = 原版号约定;assets/ 前缀 path = 工程根相对(不拼 root);其余 path 拼 root', async () => {
    const seen: string[] = []
    const src: FileSource = {
      readText: async () => '',
      readJson: async <T>() => ({}) as T,
      readBytes: async (rel: string) => {
        seen.push(rel)
        return gz()
      },
      urlFor: async (rel: string) => rel,
    }
    await loadSprite(base(src), 7) // 原版号
    await loadSprite(base(src), 580, 'assets/sprites/hero.rle') // 自有上传
    await loadSprite(base(src), 9, 'sprite/9.rle') // root 相对显式路径
    expect(seen).toEqual([
      '/extracted/data/sprite/7.rle',
      'assets/sprites/hero.rle',
      '/extracted/data/sprite/9.rle',
    ])
  })
})

describe('loadBattleSprite 双轨路径(A4c 战斗外观上传)', () => {
  const gz = async (): Promise<ArrayBuffer> => {
    const out = await compressGzip(new Uint8Array([0, 0]))
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
  }
  test('缺 path = 原版号约定;assets/ 前缀 path = 工程根相对', async () => {
    const seen: string[] = []
    const src: FileSource = {
      readText: async () => '',
      readJson: async <T>() => ({}) as T,
      readBytes: async (rel: string) => {
        seen.push(rel)
        return gz()
      },
      urlFor: async (rel: string) => rel,
    }
    await loadBattleSprite(base(src), 'enemy', 42) // 原版号
    await loadBattleSprite(base(src), 'enemy', 900, 'assets/battle-sprites/slime.rle') // 自有上传
    await loadBattleSprite(base(src), 'player', 3) // 玩家侧原版号
    expect(seen).toEqual([
      '/extracted/data/battle-sprite/enemy/42.rle',
      'assets/battle-sprites/slime.rle',
      '/extracted/data/battle-sprite/player/3.rle',
    ])
  })
})
