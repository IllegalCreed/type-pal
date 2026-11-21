import type { AssetCatalogV1, ProjectMap } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import { loadProjectMap, loadStandardPalette } from './assets.js'
import type { FileSource } from './file-source.js'
import { sha256Bytes } from './hash.js'

const mapPath = 'content/authored/stone-court.json'
const palettePath = 'assets/authored/project-colors.json'
const map: ProjectMap = {
  version: 4,
  width: 1,
  height: 1,
  tilesetRefs: ['tileset-001'],
  layers: [{ id: 'floor', name: '地板', tiles: [[null], [null]], sources: [[null], [null]] }],
  collision: [[0], [0]],
}
const palette = {
  colors: Array.from({ length: 256 }, (_, index) => [index, 255 - index, 17]),
  cycles: [],
}

async function project(mapJson: unknown, paletteText = JSON.stringify(palette)) {
  const bytes = new TextEncoder().encode(paletteText)
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: {
      'color-table.project': {
        kind: 'color-table',
        path: palettePath,
        mediaType: 'application/json',
        bytes: bytes.byteLength,
        sha256: await sha256Bytes(bytes),
        origin: { kind: 'authored' },
      },
    },
  }
  const reads: string[] = []
  const source: FileSource = {
    async readJson<T>(path: string): Promise<T> {
      reads.push(`json:${path}`)
      if (path !== mapPath) throw new DOMException(`missing ${path}`, 'NotFoundError')
      return JSON.parse(JSON.stringify(mapJson))
    },
    async readText(path) {
      reads.push(`text:${path}`)
      if (path !== palettePath) throw new Error(`unexpected text path ${path}`)
      return paletteText
    },
    async readBytes(path) {
      throw new Error(`unexpected binary path ${path}`)
    },
    async urlFor(path) {
      throw new Error(`unexpected URL path ${path}`)
    },
  }
  return {
    source,
    assetResolver: new AssetResolver(
      'fixture-project',
      catalog,
      { 'visual.standardColorTable': 'color-table.project' },
      source,
    ),
    reads,
  }
}

test('地图正文与工程标准色各走登记路径，不经全局 fetch', async () => {
  const base = await project(map)
  const fetchUnused = vi.fn(() => {
    throw new Error('工程 JSON 应通过 FileSource')
  })
  vi.stubGlobal('fetch', fetchUnused)
  try {
    await expect(loadProjectMap(base, mapPath)).resolves.toEqual(map)
    await expect(loadStandardPalette(base)).resolves.toEqual(palette)
    expect(base.reads).toEqual([`json:${mapPath}`, `text:${palettePath}`])
    expect(fetchUnused).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

test('地图网格行不一致时从加载入口拒收', async () => {
  const base = await project({ ...map, collision: [[0]] })
  await expect(loadProjectMap(base, mapPath)).rejects.toThrow('期望 2 行')
})

test('地图支持当前版本的组合放置，拒收旧地图与未知组合版本', async () => {
  const current: ProjectMap = {
    ...map,
    layers: [{ id: 'floor', name: '地板', tiles: [[1], [null]], sources: [[0], [null]] }],
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
  await expect(loadProjectMap(await project(current), mapPath)).resolves.toEqual(current)
  await expect(loadProjectMap(await project({ ...current, version: 3 }), mapPath)).rejects.toThrow(
    '仅支持当前版本 4',
  )
  const unknownPlacementVersion = { ...current, authoring: { ...current.authoring, version: 2 } }
  await expect(loadProjectMap(await project(unknownPlacementVersion), mapPath)).rejects.toThrow(
    'authoring.version',
  )
})

test('缺失地图保留真实路径、提取指引和缺文件原因', async () => {
  const missing = 'content/maps/missing.json'
  await expect(loadProjectMap(await project(map), missing)).rejects.toThrow(
    /content\/maps\/missing\.json.*pnpm extract.*missing content\/maps\/missing\.json/,
  )
})

test('工程标准色拒收坏 JSON、错误根、缺色、非整数和缺少 cycles', async () => {
  await expect(loadStandardPalette(await project(map, '{not json'))).rejects.toThrow(
    /工程标准色彩 JSON 非法/,
  )
  for (const text of ['null', '[]', '0']) {
    const base = await project(map, text)
    await expect(loadStandardPalette(base)).rejects.toThrow(
      new Error('工程标准色彩 JSON 根必须是对象'),
    )
  }
  await expect(
    loadStandardPalette(await project(map, JSON.stringify({ colors: [[0, 0, 0]], cycles: [] }))),
  ).rejects.toThrow('工程标准色彩必须包含 256 个 RGB 颜色')
  const colors = [...palette.colors.slice(0, 255), [1.5, 0, 0]]
  await expect(
    loadStandardPalette(await project(map, JSON.stringify({ colors, cycles: [] }))),
  ).rejects.toThrow('工程标准色彩第 255 项不是合法 RGB')
  await expect(
    loadStandardPalette(await project(map, JSON.stringify({ colors: palette.colors }))),
  ).rejects.toThrow('工程标准色彩缺 cycles 数组')
})
