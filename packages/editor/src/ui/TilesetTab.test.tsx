// @vitest-environment jsdom
import type { MapIndexV1, ProjectMap, StampTemplateV1 } from '@type-pal/content'
import { buildBlankProjectMap, loadTilesetAsset, type TilesetDef } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
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
  { id: 'tiles-b', name: '保留瓦片', category: 'test', asset: 'tileset.b' },
]

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
        sha256: id.repeat(64),
        origin: { kind: 'authored' as const },
      },
    ]),
  ),
}
const assetReader = {
  projectId: 'test',
  record: (asset: string) => assetCatalog.assets[asset]!,
  readBytes: async () => new ArrayBuffer(1),
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

function stamp(tilesetId: string): StampTemplateV1 {
  return {
    id: 'tree',
    name: '树木组合',
    tilesetId,
    origin: 'authored',
    layerSlots: [{ id: 'floor', name: '地面', depthMode: 'flat' }],
    visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 0, height: 0 }],
    collision: [],
  }
}

function editorState(map: ProjectMap, stamps: StampTemplateV1[] = []): EditorState {
  return {
    manifest: {} as never,
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
  stamps?: StampTemplateV1[]
  onOpenMap?: (id: string) => void
  onOpenStamp?: (id: string) => void
  loadMap?: (id: string) => Promise<ProjectMap>
}) {
  const loadMap = vi.fn(
    input.loadMap ??
      (async (id: string) => {
        if (id !== 'map-b') throw new Error(`unexpected map ${id}`)
        return input.mapB
      }),
  )
  const session = new EditSession(
    editorState(buildBlankProjectMap(1, 1, 'tiles-b'), input.stamps),
    { loadMap },
  )
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  const render = async (catalog = assetCatalog): Promise<void> => {
    await act(async () => {
      root.render(
        <TilesetTab
          tilesets={tilesets}
          assetCatalog={catalog}
          assetReader={assetReader}
          assetBase={{} as never}
          session={session}
          mapIndex={mapIndex}
          stamps={input.stamps ?? []}
          onOpenMap={input.onOpenMap}
          onOpenStamp={input.onOpenStamp}
        />,
      )
      await Promise.resolve()
    })
  }
  await render()
  return { host, session, loadMap, rerenderCatalog: render }
}

function button(host: HTMLElement, text: string): HTMLButtonElement {
  const result = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!result) throw new Error(`未找到按钮：${text}`)
  return result
}

async function runReferenceScan(host: HTMLElement): Promise<void> {
  await act(async () => {
    button(host, '检查引用后移除').click()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
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

describe('TilesetTab 全工程引用删除', () => {
  test('选中态使用共享资源/引用 Tab，上传工作流不虚构 Tab', async () => {
    const mounted = await mountTilesetTab({ mapB: buildBlankProjectMap(1, 1, 'tiles-b') })
    await verifyInspectorTabs(mounted.host, '瓦片集检查器', ['资源', '引用'])
    await act(async () =>
      mounted.host.querySelector<HTMLButtonElement>('[aria-label^="上传 PNG"]')!.click(),
    )
    expect(mounted.host.querySelector('[role="tablist"][aria-label="瓦片集检查器"]')).toBeNull()
  })

  test('同 AssetId/path 但 record sha 改变时重新载入工作台预览', async () => {
    const mounted = await mountTilesetTab({ mapB: buildBlankProjectMap(1, 1, 'tiles-b') })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    expect(vi.mocked(loadTilesetAsset)).toHaveBeenCalledTimes(1)
    await mounted.rerenderCatalog({
      ...assetCatalog,
      assets: {
        ...assetCatalog.assets,
        'tileset.a': { ...assetCatalog.assets['tileset.a']!, sha256: 'c'.repeat(64) },
      },
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    expect(vi.mocked(loadTilesetAsset)).toHaveBeenCalledTimes(2)
  })

  test('扫描未加载地图和组合模板，列出可跳转引用并保持删除禁用', async () => {
    const onOpenMap = vi.fn()
    const onOpenStamp = vi.fn()
    const { host, session, loadMap } = await mountTilesetTab({
      mapB: buildBlankProjectMap(1, 1, 'tiles-a'),
      stamps: [stamp('tiles-a')],
      onOpenMap,
      onOpenStamp,
    })
    await runReferenceScan(host)

    expect(loadMap).toHaveBeenCalledOnce()
    expect(host.querySelector('.ds-reference-panel')?.textContent).toContain('地图 B')
    expect(host.querySelector('.ds-reference-panel')?.textContent).toContain('树木组合')
    expect(button(host, '重新检查引用')).toBeDefined()
    expect(session.getState().tilesets?.map(({ id }) => id)).toEqual(['tiles-a', 'tiles-b'])

    await act(async () => button(host, '地图 B').click())
    await act(async () => button(host, '树木组合').click())
    expect(onOpenMap).toHaveBeenCalledWith('map-b')
    expect(onOpenStamp).toHaveBeenCalledWith('tree')
  })

  test('完整零引用扫描后才出现确认移除，删除仍可一步撤销', async () => {
    let attempts = 0
    const { host, session } = await mountTilesetTab({
      mapB: buildBlankProjectMap(1, 1, 'tiles-b'),
      loadMap: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('磁盘读取失败')
        return buildBlankProjectMap(1, 1, 'tiles-b')
      },
    })
    await runReferenceScan(host)
    expect(host.querySelector('.ds-reference-panel')?.textContent).toContain('已保守禁止移除')
    expect(
      host.querySelector('[role="tablist"][aria-label="瓦片集检查器"] .ds-tab__count'),
    ).toBeNull()
    expect(session.isDirty()).toBe(false)
    expect(session.getState().tilesets?.map(({ id }) => id)).toEqual(['tiles-a', 'tiles-b'])

    await act(async () => {
      button(host, '重新检查引用').click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(host.querySelector('.ds-reference-panel')?.textContent).toContain('均未引用')

    await act(async () => button(host, '确认移除未引用条目').click())
    expect(session.getState().tilesets?.map(({ id }) => id)).toEqual(['tiles-b'])
    expect(session.isDirty()).toBe(true)
    await act(async () => session.undo())
    expect(session.getState().tilesets?.map(({ id }) => id)).toEqual(['tiles-a', 'tiles-b'])
  })
})
