// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U2c：TilesetTab 残差。
 * 去重：TilesetTab.test.tsx 已证搜索/分类、检查器 Tab、名称/分类失焦提交、替换守卫、
 * 预览缓存失效、地图引用扫描与删除许可——本文件只补当前公开入口仍未证明的业务交互：
 * 重命名/改分类只动元数据且瓦片集 id 与 asset 绑定保持稳定（undo 精确还原）、
 * focusObjectId 深链直接选中目标瓦片集。
 */
import type { MapIndexV1, ProjectMap, StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap, type TilesetDef } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { TilesetTab } from './TilesetTab.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...original,
    loadStandardPalette: vi.fn(async () => ({
      colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
      cycles: [],
    })),
    loadTilesetAsset: vi.fn(async () => new Map()),
  }
})

const tilesets: TilesetDef[] = [
  { id: 'tiles-a', name: '待删瓦片', category: 'test', asset: 'tileset.a' },
  { id: 'tiles-b', name: '保留瓦片', category: 'production', asset: 'tileset.b' },
]

const assetBytes = {
  'tileset.a': new Uint8Array([1]).buffer,
  'tileset.b': new Uint8Array([2]).buffer,
}
const assetHashes = {
  a: await sha256Hex(assetBytes['tileset.a']),
  b: await sha256Hex(assetBytes['tileset.b']),
}

const assetCatalog = {
  version: 1 as const,
  assets: Object.fromEntries(
    ['a', 'b'].map((id) => [
      `tileset.${id}`,
      {
        kind: 'tileset' as const,
        path: `assets/authored/tilesets/${id}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: 1,
        sha256: assetHashes[id as keyof typeof assetHashes],
        origin: { kind: 'authored' as const },
      },
    ]),
  ),
}
const assetReader = {
  projectId: 'test',
  record: (asset: string) => assetCatalog.assets[asset]!,
  readBytes: async (asset: keyof typeof assetBytes) => assetBytes[asset].slice(0),
  readRoleBytes: async () => new ArrayBuffer(0),
  urlFor: async () => '',
}

const mapIndex: MapIndexV1 = {
  version: 1,
  maps: [
    { id: 'map-a', name: '地图 A', path: 'content/maps/map-a.json' },
    { id: 'map-b', name: '地图 B', path: 'content/maps/map-b.json' },
  ],
}

function editorState(map: ProjectMap, stamps: StampTemplate[] = []): EditorState {
  return {
    manifest: {} as never,
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: { 'map-a': map },
    mapIndex,
    tilesets,
    tilesetBlobs: {},
    assetCatalog,
    assetBlobs: {},
    stamps,
    scriptChunks: {},
  } as EditorState
}

const mounted: Array<{ root: Root; host: HTMLDivElement }> = []

async function mountTilesetTab(input: {
  mapB: ProjectMap
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
}) {
  const session = new EditSession(editorState(buildBlankProjectMap(1, 1, 'tiles-b'), []), {
    loadMap: async (id: string) => {
      if (id !== 'map-b') throw new Error(`unexpected map ${id}`)
      return input.mapB
    },
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  await act(async () => {
    root.render(
      <TilesetTab
        tilesets={tilesets}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        assetBase={{} as never}
        session={session}
        mapIndex={mapIndex}
        focusObjectId={input.focusObjectId}
        onObjectFocus={input.onObjectFocus}
      />,
    )
    await Promise.resolve()
  })
  return { host, session }
}

beforeEach(() => {
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ clearRect: vi.fn(), drawImage: vi.fn() }),
  })
})

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop()!
    await act(async () => item.root.unmount())
    item.host.remove()
  }
  vi.clearAllMocks()
})

describe('U2c TilesetTab 残差', () => {
  test('重命名与分类只动元数据：id 与 asset 绑定稳定，undo 精确还原', async () => {
    const { host, session } = await mountTilesetTab({
      mapB: buildBlankProjectMap(1, 1, 'tiles-b'),
    })
    const idsBefore = session.getState().tilesets?.map(({ id, asset }) => ({ id, asset }))
    const name = host.querySelector<HTMLInputElement>('[aria-label="瓦片集名称"]')!
    await act(async () => name.focus())
    await setCatalogSearch(name, '重命名瓦片集')
    await act(async () => name.blur())
    const category = host.querySelector<HTMLInputElement>('[aria-label="瓦片集分类"]')!
    await act(async () => category.focus())
    await setCatalogSearch(category, 'interior')
    await act(async () => category.blur())
    expect(session.getState().tilesets?.[0]).toEqual({
      id: 'tiles-a',
      name: '重命名瓦片集',
      category: 'interior',
      asset: 'tileset.a',
    })
    expect(session.isDirty()).toBe(true)
    await act(async () => {
      expect(session.undo()).toBe(true)
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().tilesets?.map(({ id, asset }) => ({ id, asset }))).toEqual(idsBefore)
    expect(session.getState().tilesets?.[0]?.name).toBe('待删瓦片')
    expect(session.getState().tilesets?.[0]?.category).toBe('test')
  })

  test('focusObjectId 深链直接选中目标瓦片集', async () => {
    const { host } = await mountTilesetTab({
      mapB: buildBlankProjectMap(1, 1, 'tiles-b'),
      focusObjectId: 'tiles-b',
    })
    expect(host.querySelector('h1')?.textContent).toContain('保留瓦片')
    expect(host.querySelector('.tileset-readonly')?.textContent).toBe('tiles-b')
  })
})
