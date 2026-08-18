// @vitest-environment jsdom
import type { AssetCatalogV1, ProjectMap, StampTemplateV1 } from '@type-pal/content'
import type { TilesetDef } from '@type-pal/reforge'
import { buildBlankProjectMap, latticeCenter, paintProjectMapTiles } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { stampDraftBounds } from '../core/stamp-draft.js'
import type { StampSelectionSource } from '../core/stamp-template.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { StampLibraryTab } from './StampLibraryTab.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  const frame: import('@type-pal/reforge').RleFrame = {
    width: 32,
    height: 16,
    pixels: new Uint8Array(32 * 16),
    opaque: new Uint8Array(32 * 16),
  }
  return {
    ...original,
    loadStandardPalette: vi.fn(async () => ({
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    })),
    loadTilesetAsset: vi.fn(async () => new Map([0, 1, 2].map((tileId) => [tileId, frame]))),
    bakeFrame: vi.fn(() => document.createElement('canvas')),
  }
})

const tilesetFixture: TilesetDef = {
  id: 'tiles-a',
  name: '测试瓦片集',
  category: 'test',
  asset: 'tileset.a',
}

const assetCatalogFixture: AssetCatalogV1 = {
  version: 1,
  assets: {
    'tileset.a': {
      kind: 'tileset',
      path: 'assets/authored/tilesets/a.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

function template(id = 'tree', tilesetId = 'tiles-a'): StampTemplateV1 {
  return {
    id,
    name: id,
    category: '植被',
    tilesetId,
    origin: 'authored',
    layerSlots: [{ id: 'floor', name: '地板', depthMode: 'flat' }],
    visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
    collision: [],
  }
}

function placedMap(sourceStampId: string, tilesetId = 'tiles-a'): ProjectMap {
  let map = buildBlankProjectMap(2, 2, tilesetId)
  map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 }])
  return {
    ...map,
    version: 3,
    authoring: {
      version: 1,
      stampPlacements: [
        {
          id: 'placement-1',
          sourceStampId,
          anchor: { row: 0, col: 0 },
          visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
          gridPoints: [],
        },
      ],
    },
  }
}

function state(stamps: StampTemplateV1[], maps: Record<string, ProjectMap>): EditorState {
  return {
    manifest: { content: { stamps: 'content/stamps.json' } } as unknown as EditorState['manifest'],
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps,
    mapIndex: {
      version: 1,
      maps: Object.keys(maps).map((id) => ({ id, name: id, path: `content/maps/${id}.json` })),
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps,
  } as EditorState
}

function Harness(props: {
  session: EditSession
  tilesets?: readonly TilesetDef[]
  assetCatalog?: AssetCatalogV1
  selectionSource?: StampSelectionSource
  onObjectFocus?: (id: string | undefined) => void
  onOpenMap?: (id: string) => void
  onOpenTileset?: (id: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const {
    session,
    tilesets = [],
    assetCatalog = { version: 1, assets: {} },
    selectionSource,
    onObjectFocus,
    onOpenMap,
    onOpenTileset,
    onStatusNotice,
  } = props
  useSyncExternalStore(
    (callback) => session.subscribe(callback),
    () => session.getVersion(),
  )
  const current = session.getState()
  return (
    <StampLibraryTab
      stamps={current.stamps}
      tilesets={tilesets}
      assetCatalog={assetCatalog}
      assetReader={{} as never}
      assetBase={{} as never}
      session={session}
      mapIndex={current.mapIndex}
      selectionSource={selectionSource}
      onObjectFocus={onObjectFocus}
      onOpenMap={onOpenMap ?? vi.fn()}
      onOpenTileset={onOpenTileset}
      onStatusNotice={onStatusNotice}
    />
  )
}

function button(text: string, root: ParentNode = document): HTMLButtonElement {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function chooseSelectOption(label: string, optionText: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(`[role="combobox"][aria-label="${label}"]`)!
  await act(async () => trigger.click())
  const listbox = document.getElementById(trigger.getAttribute('aria-controls')!)!
  const option = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(optionText),
  )!
  await act(async () => option.click())
}

async function clickDraftPoint(point: { row: number; col: number }): Promise<void> {
  const canvas = host.querySelector<HTMLCanvasElement>('[aria-label="组合局部地图编辑画布"]')!
  const bounds = stampDraftBounds(template(), 2)
  const center = latticeCenter(point)
  const clientX = 16 - bounds.minU * 32 + center.x * 2
  const clientY = 16 - bounds.minRow * 16 + center.y * 2
  await act(async () => {
    for (const type of ['pointerdown', 'pointerup']) {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type === 'pointerdown' ? 1 : 0,
        clientX,
        clientY,
      })
      Object.defineProperty(event, 'pointerId', { value: 11 })
      canvas.dispatchEvent(event)
    }
  })
}

async function dragDraftPoints(
  start: { row: number; col: number },
  end: { row: number; col: number },
): Promise<void> {
  const canvas = host.querySelector<HTMLCanvasElement>('[aria-label="组合局部地图编辑画布"]')!
  const bounds = stampDraftBounds(template(), 2)
  const clientPoint = (point: { row: number; col: number }) => {
    const center = latticeCenter(point)
    return {
      clientX: 16 - bounds.minU * 32 + center.x * 2,
      clientY: 16 - bounds.minRow * 16 + center.y * 2,
    }
  }
  await act(async () => {
    for (const [type, point, buttons] of [
      ['pointerdown', start, 1],
      ['pointermove', end, 1],
      ['pointerup', end, 0],
    ] as const) {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons,
        ...clientPoint(point),
      })
      Object.defineProperty(event, 'pointerId', { value: 12 })
      canvas.dispatchEvent(event)
    }
  })
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = ''
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      imageSmoothingEnabled: false,
      lineWidth: 1,
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
    }),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: this.width,
        bottom: this.height,
        width: this.width,
        height: this.height,
        toJSON: () => ({}),
      }
    },
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => true,
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
    },
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('StampLibraryTab', () => {
  test('搜索、分类和来源覆盖各值、组合、空结果和清空恢复，且不偷换选择', async () => {
    const authoredTree = template('tree', 'tiles-a')
    const authoredShrub = { ...template('shrub', 'tiles-b'), name: '灌木' }
    const migratedRock = {
      ...template('rock', 'tiles-b'),
      name: '岩石',
      category: '地貌',
      origin: 'migrated' as const,
    }
    const session = new EditSession(state([authoredTree, authoredShrub, migratedRock], {}))
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    const rows = () => host.querySelectorAll('.stamp-library-row')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索组合模板"]')!
    expect(rows()).toHaveLength(3)

    await chooseSelectOption('筛选组合分类', '地貌')
    await chooseSelectOption('筛选组合来源', '预置')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]?.textContent).toContain('岩石')
    expect(host.querySelector('.stamp-library-row.selected')).toBeNull()

    await setCatalogSearch(search, 'tree')
    expect(rows()).toHaveLength(0)
    await chooseSelectOption('筛选组合分类', '植被')
    await chooseSelectOption('筛选组合来源', '作者')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]?.textContent).toContain('tree')

    await setCatalogSearch(search, '不存在')
    expect(rows()).toHaveLength(0)
    await setCatalogSearch(search, '')
    await chooseSelectOption('筛选组合分类', '全部分类')
    await chooseSelectOption('筛选组合来源', '全部来源')
    expect(rows()).toHaveLength(3)
    expect(host.querySelector('.stamp-library-row.selected')?.textContent).toContain('tree')
  })

  test('检查器使用共享属性/引用/瓦片 Tab，且选中模板直接进入编辑工作区', async () => {
    const session = new EditSession(state([template()], {}))
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    await verifyInspectorTabs(host, '组合模板检查器', ['属性', /^引用 \d+$/, '瓦片'])
    expect(host.querySelector('[aria-label="组合局部地图编辑画布"]')).not.toBeNull()
    expect(host.textContent).not.toContain('编辑组合内容')
    expect(host.textContent).not.toContain('退出内容编辑')
  })

  test('改名/分类/复制/删除均走 undo，删除模板不改 placement 且库级显示悬空来源', async () => {
    const map = placedMap('tree')
    const session = new EditSession(state([template()], { 'map-a': map }))
    const beforeMap = structuredClone(map)
    const onOpenMap = vi.fn()
    await act(async () => {
      root.render(
        <Harness
          session={session}
          onOpenMap={onOpenMap}
          tilesets={[tilesetFixture]}
          assetCatalog={assetCatalogFixture}
        />,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    await input(host.querySelector<HTMLInputElement>('[aria-label="组合名称"]')!, '古树')
    await input(host.querySelector<HTMLInputElement>('[aria-label="组合分类"]')!, '古迹')
    await act(async () => button('保存组合', host).click())
    expect(session.getState().stamps[0]).toMatchObject({ name: '古树', category: '古迹' })

    await act(async () => button('复制为作者模板', host).click())
    expect(session.getState().stamps).toHaveLength(2)
    expect(session.getState().stamps[1]).toMatchObject({ id: 'tree-copy', origin: 'authored' })

    const originalRow = [...host.querySelectorAll<HTMLButtonElement>('.stamp-library-row')].find(
      (candidate) => candidate.dataset.stampId === 'tree',
    )!
    await act(async () => originalRow.click())
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => button('删除模板', host).click())
    const confirm = button('确认删除', host)
    expect(confirm.disabled).toBe(false)
    expect(host.textContent).toContain('检测到 1 处来源引用')
    await act(async () => confirm.click())

    expect(session.getState().maps['map-a']).toEqual(beforeMap)
    expect(session.getState().stamps.map((item) => item.id)).toEqual(['tree-copy'])
    expect(host.textContent).toContain('悬空来源引用')
    expect(host.textContent).toContain('tree · 1 处')
    await act(async () => button('map-a', host).click())
    expect(onOpenMap).toHaveBeenCalledWith('map-a')

    await act(async () => session.undo())
    expect(session.getState().stamps.map((item) => item.id)).toEqual(['tree', 'tree-copy'])
    await act(async () => session.redo())
    expect(session.getState().stamps.map((item) => item.id)).toEqual(['tree-copy'])
  })

  test('地图扫描失败时不把 partial 0 当精确值，也不允许确认删除', async () => {
    const initial = state([template()], {})
    initial.mapIndex = {
      version: 1,
      maps: [{ id: 'missing-map', name: '缺失地图', path: 'content/maps/missing.json' }],
    }
    const session = new EditSession(initial)
    await act(async () => {
      root.render(<Harness session={session} />)
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(host.textContent).toContain('扫描不完整')
    expect(host.textContent).toContain('引用数未知')
    expect(host.textContent).toContain('至少 0 处')
    expect(
      host.querySelector('[role="tablist"][aria-label="组合模板检查器"] .ds-tab__count'),
    ).toBeNull()
    await act(async () => button('删除模板', host).click())
    expect(button('确认删除', host).disabled).toBe(true)
  })

  test('扫描失败提示会在重试成功时清除，卸载时也不残留', async () => {
    const initial = state([template()], {})
    initial.mapIndex = {
      version: 1,
      maps: [{ id: 'recover-map', name: '可恢复地图', path: 'content/maps/recover.json' }],
    }
    const session = new EditSession(initial)
    vi.spyOn(session, 'ensureMapLoaded')
      .mockRejectedValueOnce(new Error('第一次读取失败'))
      .mockResolvedValueOnce(placedMap('tree'))
    const onStatusNotice = vi.fn()
    await act(async () => {
      root.render(<Harness session={session} onStatusNotice={onStatusNotice} />)
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(onStatusNotice).toHaveBeenLastCalledWith({
      kind: 'error',
      message: '组合来源扫描不完整：1 张地图读取失败。',
    })

    await act(async () => {
      button('重试扫描', host).click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(host.textContent).toContain('已扫描 1/1 张地图')
    expect(onStatusNotice).toHaveBeenLastCalledWith(undefined)

    await act(async () => root.unmount())
    expect(onStatusNotice).toHaveBeenLastCalledWith(undefined)
    root = createRoot(host)
  })

  test('来源瓦片集按钮精确跳转到当前模板的 tileset', async () => {
    const session = new EditSession(state([template()], {}))
    const onOpenTileset = vi.fn()
    await act(async () => {
      root.render(<Harness session={session} onOpenTileset={onOpenTileset} />)
      await Promise.resolve()
    })
    await act(async () => button('打开来源瓦片集', host).click())
    expect(onOpenTileset).toHaveBeenCalledWith('tiles-a')
  })

  test('内容编辑只在保存时提交一笔模板 history，undo/redo 全程不改地图与 MapIndex', async () => {
    const map = placedMap('tree')
    const session = new EditSession(state([template()], { 'map-a': map }))
    const beforeMaps = structuredClone(session.getState().maps)
    const beforeMapIndex = structuredClone(session.getState().mapIndex)
    const historyBefore = session.getHistoryVersion()
    await act(async () => {
      root.render(
        <Harness
          session={session}
          tilesets={[tilesetFixture]}
          assetCatalog={assetCatalogFixture}
        />,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    await act(async () => button('瓦片', host).click())
    expect(host.textContent).toContain('3 块 · 当前 #1')
    const toolbar = host.querySelector('.stamp-draft-toolbar')!
    for (const label of ['平移', '选择', '取样', '笔刷', '矩形', '填充', '擦除', '碰撞', '视图'])
      expect(button(label, toolbar)).not.toBeNull()
    expect(toolbar.querySelector('[role="tablist"]')).toBeNull()
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().maps).toEqual(beforeMaps)
    expect(session.getState().mapIndex).toEqual(beforeMapIndex)

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="新增图层"]')!.click())
    expect(host.querySelectorAll('.stamp-layer-host .map-layer-row')).toHaveLength(2)
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="瓦片 #2"]')!.click())
    await input(host.querySelector<HTMLInputElement>('#stamp-paint-height')!, '3')
    await clickDraftPoint({ row: 1, col: 0 })
    await act(async () => button('碰撞', toolbar).click())
    await chooseSelectOption('碰撞标记值', '0 · 显式可通行')
    await clickDraftPoint({ row: 0, col: 1 })
    expect(host.querySelector('.stamp-content-editor')?.getAttribute('data-dirty')).toBe('true')
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().maps).toEqual(beforeMaps)
    expect(session.getState().mapIndex).toEqual(beforeMapIndex)

    await act(async () => button('保存组合', host).click())
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(session.getState().stamps[0]).toMatchObject({
      layerSlots: [
        { id: 'floor', depthMode: 'flat' },
        { id: 'layer', depthMode: 'height' },
      ],
      collision: [{ value: 0 }],
    })
    expect(session.getState().stamps[0]?.visual).toContainEqual(
      expect.objectContaining({ layerSlotId: 'layer', tileId: 2, height: 3 }),
    )
    expect(session.getState().maps).toEqual(beforeMaps)
    expect(session.getState().mapIndex).toEqual(beforeMapIndex)

    await act(async () => session.undo())
    expect(session.getState().stamps[0]?.visual).toHaveLength(1)
    expect(session.getState().maps).toEqual(beforeMaps)
    expect(session.getState().mapIndex).toEqual(beforeMapIndex)

    await act(async () => session.redo())
    expect(session.getState().stamps[0]?.visual).toHaveLength(2)
    expect(session.getState().stamps[0]?.collision).toEqual([
      { offset: { dRow: 0, du: 2 }, value: 0 },
    ])
    expect(session.getState().maps).toEqual(beforeMaps)
    expect(session.getState().mapIndex).toEqual(beforeMapIndex)
  })

  test('组合中央复用地图工具栏并闭合矩形、填充、取样和平移', async () => {
    const session = new EditSession(state([template()], {}))
    await act(async () => {
      root.render(
        <Harness
          session={session}
          tilesets={[tilesetFixture]}
          assetCatalog={assetCatalogFixture}
        />,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    await act(async () => button('瓦片', host).click())
    const toolbar = host.querySelector('.stamp-draft-toolbar')!

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="瓦片 #2"]')!.click())
    await act(async () => button('矩形', toolbar).click())
    await dragDraftPoints({ row: 0, col: 0 }, { row: 1, col: 1 })

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="瓦片 #0"]')!.click())
    await act(async () => button('取样', toolbar).click())
    await clickDraftPoint({ row: 1, col: 1 })
    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="瓦片 #2"]')?.getAttribute('aria-pressed'),
    ).toBe('true')

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="瓦片 #0"]')!.click())
    await act(async () => button('填充', toolbar).click())
    await clickDraftPoint({ row: 2, col: 0 })

    const canvas = host.querySelector<HTMLCanvasElement>('[aria-label="组合局部地图编辑画布"]')!
    await act(async () => button('平移', toolbar).click())
    await act(async () => {
      for (const [type, clientX, clientY, buttons] of [
        ['pointerdown', 10, 10, 1],
        ['pointermove', 30, 22, 1],
        ['pointerup', 30, 22, 0],
      ] as const) {
        const event = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons,
          clientX,
          clientY,
        })
        Object.defineProperty(event, 'pointerId', { value: 13 })
        canvas.dispatchEvent(event)
      }
    })
    expect(canvas.style.transform).toBe('translate(20px, 12px)')

    await act(async () => button('保存组合', host).click())
    expect(session.getState().stamps[0]?.visual.length).toBeGreaterThan(4)
    expect(session.getState().stamps[0]?.visual.some((member) => member.tileId === 0)).toBe(true)
  })

  test('组合笔刷面积在笔刷后出现并按 2 × 2 写入草稿', async () => {
    const session = new EditSession(state([template()], {}))
    await act(async () => {
      root.render(
        <Harness
          session={session}
          tilesets={[tilesetFixture]}
          assetCatalog={assetCatalogFixture}
        />,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    await act(async () => button('瓦片', host).click())
    const toolbar = host.querySelector('.stamp-draft-toolbar')!
    expect(toolbar.querySelector('[aria-label="笔刷面积"]')).not.toBeNull()

    await chooseSelectOption('笔刷面积', '2 × 2')
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="瓦片 #2"]')!.click())
    await clickDraftPoint({ row: 0, col: 0 })
    await act(async () => button('保存组合', host).click())

    const painted = session.getState().stamps[0]!.visual.filter((member) => member.tileId === 2)
    expect(painted).toHaveLength(4)
  })

  test('内容草稿离开时先确认，取消编辑保持工程与迁移来源不变', async () => {
    const migrated = { ...template('tree'), origin: 'migrated' as const }
    const session = new EditSession(state([migrated, template('rock')], {}))
    const historyBefore = session.getHistoryVersion()
    await act(async () => {
      root.render(
        <Harness
          session={session}
          tilesets={[tilesetFixture]}
          assetCatalog={assetCatalogFixture}
        />,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    await clickDraftPoint({ row: 1, col: 0 })

    const rock = host.querySelector<HTMLButtonElement>('[data-stamp-id="rock"]')!
    await act(async () => rock.click())
    expect(document.querySelector('dialog')?.textContent).toContain('放弃未保存的组合修改？')
    expect(session.getState().stamps[0]?.origin).toBe('migrated')
    expect(session.getHistoryVersion()).toBe(historyBefore)

    await act(async () => button('继续编辑', document).click())
    expect(host.querySelector('[aria-label="组合局部地图编辑画布"]')).not.toBeNull()
    await act(async () => button('恢复已保存', host).click())
    expect(host.querySelector('[aria-label="组合局部地图编辑画布"]')).not.toBeNull()
    expect(host.querySelector('.stamp-content-editor')?.hasAttribute('data-dirty')).toBe(false)
    expect(session.getState().stamps[0]?.origin).toBe('migrated')
    expect(session.getHistoryVersion()).toBe(historyBefore)
  })

  test('空库可选择瓦片集新建组合，首个视觉成员与模板一起原子提交', async () => {
    const session = new EditSession(state([], {}))
    await act(async () => {
      root.render(
        <Harness
          session={session}
          tilesets={[tilesetFixture]}
          assetCatalog={assetCatalogFixture}
        />,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => button('新建组合', host).click())
    await input(document.querySelector<HTMLInputElement>('[aria-label="新组合名称"]')!, '村口门楼')
    await act(async () => button('进入内容编辑', document).click())
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    await act(async () => button('瓦片', host).click())
    expect(host.textContent).toContain('3 块 · 当前 #0')
    expect(session.getState().stamps).toHaveLength(0)

    await act(async () => button('保存组合', host).click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().stamps[0]).toMatchObject({
      id: 'stamp-user',
      name: '村口门楼',
      tilesetId: 'tiles-a',
      origin: 'authored',
    })
    expect(session.getState().stamps[0]?.visual).toHaveLength(1)
    await act(async () => session.undo())
    expect(session.getState().stamps).toHaveLength(0)
  })

  test('迁移预置内容直到确认保存才接管为 authored', async () => {
    const migrated = { ...template(), origin: 'migrated' as const }
    const session = new EditSession(state([migrated], {}))
    await act(async () => {
      root.render(
        <Harness
          session={session}
          tilesets={[tilesetFixture]}
          assetCatalog={assetCatalogFixture}
        />,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    await clickDraftPoint({ row: 1, col: 0 })
    await act(async () => button('保存组合', host).click())
    expect(document.querySelector('dialog')?.textContent).toContain('接管预置组合？')
    expect(session.getState().stamps[0]?.origin).toBe('migrated')
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => button('接管并保存', document).click())
    expect(session.getState().stamps[0]?.origin).toBe('authored')
    expect(session.getState().stamps[0]?.visual).toHaveLength(2)
    expect(session.getHistoryVersion()).toBe(1)
    await act(async () => session.undo())
    expect(session.getState().stamps[0]?.origin).toBe('migrated')
  })

  test('预置接管确认出现后把焦点移到取消按钮', async () => {
    const migrated = { ...template(), origin: 'migrated' as const }
    const session = new EditSession(state([migrated], {}))
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    await input(host.querySelector<HTMLInputElement>('[aria-label="组合名称"]')!, '接管后的树')
    const save = button('保存组合', host)
    await act(async () => save.click())
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 20)))
    const cancel = button('取消', host)
    expect(document.activeElement).toBe(cancel)
    await act(async () => cancel.click())
  })

  test('库页用选区更新前先拒绝 tileset mismatch，不会覆盖其他模板', async () => {
    const map = placedMap('unrelated', 'tiles-b')
    const stamps = [template('wanted', 'tiles-a'), template('other', 'tiles-b')]
    const session = new EditSession(state(stamps, { 'map-b': map }))
    const selectionSource: StampSelectionSource = {
      mapId: 'map-b',
      selection: {
        kind: 'cells',
        hitScope: 'active-layer',
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    }
    await act(async () => {
      root.render(<Harness session={session} selectionSource={selectionSource} />)
      await Promise.resolve()
    })
    await act(async () => button('用当前地图选区更新', host).click())
    expect(host.textContent).toContain('不能更新 tileset “tiles-a”')
    expect(document.querySelector('dialog')).toBeNull()
    expect(session.getState().stamps).toEqual(stamps)
  })
})
