// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U2c：TilesetTab 残差。
 * 去重：TilesetTab.test.tsx 已证搜索/分类、检查器 Tab、名称/分类失焦提交、替换守卫、
 * 预览缓存失效、地图引用扫描与删除许可——本文件只补当前公开入口仍未证明的业务交互：
 * 重命名/改分类只动元数据且瓦片集 id 与 asset 绑定保持稳定（undo 精确还原）、
 * focusObjectId 深链直接选中目标瓦片集。
 */

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { ProjectMap } from '@type-pal/content'
import { buildBlankProjectMap, type TilesetDef } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { buildSeedAssets } from '../core/seed-assets.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
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

// 正式 blank 项目（含 starter 瓦片集与起始地图），追加两个真实字节的新瓦片集；
// mapIndex 取自项目（starter 地图保留），追加地图正文仅用于 loadMap 响应。
const addedTilesets: TilesetDef[] = [
  { id: 'tiles-a', name: '待删瓦片', category: 'test', asset: 'tileset.glm.a' },
  { id: 'tiles-b', name: '保留瓦片', category: 'production', asset: 'tileset.glm.b' },
]

async function legalTilesetProject(_input: {
  mapB: ProjectMap
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
}) {
  const seedAssets = await buildSeedAssets()
  const { state } = await loadLegalUiProject('glm-ui-wave-tileset')
  const bytesA = seedAssets.tilesetRle.slice(0)
  const bytesB = seedAssets.spriteRle.slice(0)
  const tilesets = [
    ...(state.tilesets ?? []),
    { ...addedTilesets[0]!, asset: 'tileset.glm.a' },
    { ...addedTilesets[1]!, asset: 'tileset.glm.b' },
  ]
  const assetCatalog = {
    version: 1 as const,
    assets: {
      ...state.assetCatalog.assets,
      'tileset.glm.a': {
        kind: 'tileset' as const,
        path: 'assets/authored/tilesets/glm-a.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: bytesA.byteLength,
        sha256: await sha256Hex(bytesA),
        origin: { kind: 'authored' as const },
      },
      'tileset.glm.b': {
        kind: 'tileset' as const,
        path: 'assets/authored/tilesets/glm-b.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: bytesB.byteLength,
        sha256: await sha256Hex(bytesB),
        origin: { kind: 'authored' as const },
      },
    },
  }
  const assetBlobs = {
    ...state.assetBlobs,
    'assets/authored/tilesets/glm-a.rle': bytesA,
    'assets/authored/tilesets/glm-b.rle': bytesB,
  }
  const next = {
    ...state,
    tilesets,
    assetCatalog,
    assetBlobs,
  } as EditorState
  assertProjectSaveValid(next)
  return next
}

// Node test-host bridge（模块级一次性）：blank seed 的 gzip 依赖 Node Blob.stream。
vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)
afterAll(() => {
  vi.unstubAllGlobals()
})

const mounted: Array<{ root: Root; host: HTMLDivElement }> = []

async function mountTilesetTab(input: {
  mapB: ProjectMap
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
}) {
  const state = await legalTilesetProject({ mapB: input.mapB })
  const session = new EditSession(state, {
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
        tilesets={state.tilesets ?? []}
        assetCatalog={state.assetCatalog}
        assetReader={{
          projectId: 'test',
          record: (asset: string) => state.assetCatalog.assets[asset]!,
          readBytes: async (asset: string) => {
            const record = state.assetCatalog.assets[asset]!
            return (state.assetBlobs[record.path] as ArrayBuffer | undefined) ?? new ArrayBuffer(0)
          },
          readRoleBytes: async () => new ArrayBuffer(0),
          urlFor: async () => '',
        }}
        assetBase={{} as never}
        session={session}
        mapIndex={state.mapIndex}
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
    const selected = (session.getState().tilesets ?? [])[0] as TilesetDef
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
      id: selected.id,
      name: '重命名瓦片集',
      category: 'interior',
      asset: selected.asset,
    })
    expect(session.isDirty()).toBe(true)
    await act(async () => {
      expect(session.undo()).toBe(true)
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().tilesets?.map(({ id, asset }) => ({ id, asset }))).toEqual(idsBefore)
    expect(session.getState().tilesets?.[0]?.name).toBe(selected.name)
    expect(session.getState().tilesets?.[0]?.category).toBe(selected.category)
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
