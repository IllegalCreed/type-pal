// @vitest-environment jsdom
import type { SceneDef, StampTemplateV1 } from '@type-pal/content'
import type { ProjectMap, ProjectMapV2, RleFrame } from '@type-pal/reforge'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  projectMapStampPlacements,
} from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { MapMode } from './MapMode.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...original,
    bakeFrame: vi.fn(() => document.createElement('canvas')),
    renderSceneFrame: vi.fn(),
  }
})

vi.mock('./map-selection-overlay.js', () => ({ drawMapSelectionOverlay: vi.fn() }))
vi.mock('./stamp-placement-overlay.js', () => ({ drawStampPlacementOverlay: vi.fn() }))
vi.mock('./StampPreviewCanvas.js', () => ({
  StampMiniPreview: (props: { template: StampTemplateV1 }) => (
    <canvas data-stamp-preview={props.template.id} />
  ),
}))

vi.mock('./scene-stage.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./scene-stage.js')>()
  const React = await import('react')
  const opaque = new Uint8Array(32 * 16).fill(1)
  const frame: RleFrame = {
    width: 32,
    height: 16,
    pixels: new Uint8Array(32 * 16),
    opaque,
  }
  return {
    ...original,
    drawGridBlocked: vi.fn(),
    mapBoxOf: vi.fn(() => ({ minX: 0, minY: 0, maxX: 640, maxY: 480 })),
    useStageSize: vi.fn(() => ({ w: 640, h: 480 })),
    useSceneAssets: (options: { mapId: string; projectMaps?: Record<string, ProjectMap> }) => {
      const loadedRef = React.useRef({
        renderer: {} as never,
        map: options.projectMaps?.[options.mapId] as ProjectMapV2,
        spritesByNum: new Map(),
        tiles: new Map([[1, frame]]),
        palette: {
          colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
          cycles: [],
        },
      })
      loadedRef.current.map = options.projectMaps?.[options.mapId] as ProjectMapV2
      return { status: 'ready' as const, err: '', loadedRef }
    },
    useViewZoomPan: (options: { initial: { zoom: number; panX: number; panY: number } }) => {
      const [view, setView] = React.useState(options.initial)
      const viewRef = React.useRef(view)
      viewRef.current = view
      return { view, viewRef, setView }
    },
  }
})

const mountedRoots: { root: Root; host: HTMLDivElement }[] = []

function fixtureMap(): ProjectMapV2 {
  let map = buildBlankProjectMap(2, 2, 'tiles')
  map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 }])
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '上层', 'height'))
  return paintProjectMapTiles(map, [{ layerId: 'objects', row: 0, col: 0, tileId: 1, height: 2 }])
}

function stampTemplate(): StampTemplateV1 {
  return {
    id: 'tree-house',
    name: '树屋',
    category: '建筑',
    tilesetId: 'tiles',
    origin: 'authored',
    layerSlots: [
      { id: 'ground-slot', name: '地面槽', depthMode: 'flat' },
      { id: 'object-slot', name: '物件槽', depthMode: 'height' },
    ],
    visual: [
      { layerSlotId: 'ground-slot', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 },
      { layerSlotId: 'object-slot', offset: { dRow: 1, du: 1 }, tileId: 1, height: 2 },
    ],
    collision: [{ offset: { dRow: 1, du: 1 }, value: 0 }],
  }
}

function editorState(map: ProjectMapV2, stamps: StampTemplateV1[] = []): EditorState {
  return {
    manifest: {} as never,
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps: { 'map-a': map },
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-a', name: '测试地图', path: 'content/maps/map-a.json' }],
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps,
    scriptChunks: {},
  } as EditorState
}

async function mountMapMode(options: { stamps?: StampTemplateV1[] } = {}): Promise<{
  host: HTMLDivElement
  canvas: HTMLCanvasElement
  session: EditSession
  onWorkspaceNotice: ReturnType<typeof vi.fn>
  rerenderWithSession: (session: EditSession, stamps?: StampTemplateV1[]) => Promise<void>
}> {
  const map = fixtureMap()
  const state = editorState(map, options.stamps ?? [])
  const session = new EditSession(state)
  const scene = {
    id: 's',
    mapId: 'map-a',
    entry: { col: 0, row: 0, height: 0 },
    entities: [],
  } as unknown as SceneDef
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onWorkspaceNotice = vi.fn()
  mountedRoots.push({ root, host })
  const renderMode = (renderSession: EditSession, renderStamps: StampTemplateV1[]) => {
    const renderState = renderSession.getState()
    root.render(
      <MapMode
        scene={scene}
        scenes={[scene]}
        session={renderSession}
        assetBase={{} as never}
        projectMaps={renderState.maps}
        mapIndex={renderState.mapIndex}
        selectedMapId="map-a"
        onSelectMap={vi.fn()}
        onOpenScene={vi.fn()}
        tilesets={[{ id: 'tiles', name: '测试瓦片', category: 'test', path: 'tiles/test.rle' }]}
        tilesetBlobs={{}}
        stamps={renderStamps}
        onWorkspaceNotice={onWorkspaceNotice}
      />,
    )
  }
  await act(async () => {
    renderMode(session, options.stamps ?? [])
  })
  return {
    host,
    canvas: host.querySelector<HTMLCanvasElement>('[aria-label="地图内容编辑画布"]')!,
    session,
    onWorkspaceNotice,
    rerenderWithSession: async (nextSession, nextStamps = nextSession.getState().stamps) => {
      await act(async () => renderMode(nextSession, nextStamps))
    },
  }
}

function button(host: HTMLElement, text: string): HTMLButtonElement {
  const result = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!result) throw new Error(`未找到按钮: ${text}`)
  return result
}

function pointer(
  target: HTMLCanvasElement,
  type: 'click' | 'pointerdown' | 'pointermove' | 'pointerup',
  options: { altKey?: boolean; clientX?: number; clientY?: number } = {},
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: options.clientX ?? 1,
    clientY: options.clientY ?? 1,
    altKey: options.altKey,
  })
  Object.defineProperty(event, 'pointerId', { value: 7 })
  target.dispatchEvent(event)
}

async function selectFloor(host: HTMLElement, canvas: HTMLCanvasElement): Promise<void> {
  await act(async () => button(host, '选择').click())
  await act(async () => {
    pointer(canvas, 'pointerdown')
    pointer(canvas, 'pointerup')
  })
}

async function activateStamp(host: HTMLElement): Promise<void> {
  const stampTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (candidate) => candidate.textContent?.trim() === '图章',
  )!
  await act(async () => stampTab.click())
  await act(async () => host.querySelector<HTMLButtonElement>('.map-stamp-card')?.click())
}

async function mapStampSlots(host: HTMLElement): Promise<void> {
  const ground = host.querySelector<HTMLSelectElement>('[aria-label="地面槽 的目标图层"]')!
  const object = host.querySelector<HTMLSelectElement>('[aria-label="物件槽 的目标图层"]')!
  await act(async () => {
    ground.value = 'floor'
    ground.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => {
    object.value = 'objects'
    object.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

beforeEach(() => {
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 640,
      bottom: 480,
      width: 640,
      height: 480,
      toJSON: () => ({}),
    }),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement) {
      return {
        canvas: this,
        clearRect: vi.fn(),
        drawImage: vi.fn(),
      }
    },
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(async () => {
  while (mountedRoots.length) {
    const mounted = mountedRoots.pop()!
    await act(async () => mounted.root.unmount())
    mounted.host.remove()
  }
  vi.clearAllMocks()
})

describe('MapMode 地图内容选择交互', () => {
  test('选择与取样状态隔离：取样后保留地图选区并转回笔刷', async () => {
    const { host, canvas } = await mountMapMode()
    await selectFloor(host, canvas)
    expect(host.querySelector('.map-selection-head')?.textContent).toContain('1 个视觉实例')
    expect(host.querySelector('.map-selection-summary')?.textContent).toContain('地板')

    await act(async () => button(host, '取样').click())
    await act(async () => pointer(canvas, 'pointerdown'))
    expect(host.querySelector('.map-selection-head')?.textContent).toContain('1 个视觉实例')
    expect(button(host, '笔刷').classList).toContain('active')
    expect(host.querySelector('.map-tiles-head .hint2')?.textContent).toContain('#1')
  })

  test('Alt 候选按面板自上而下，方向键移动焦点，Esc 关闭并回到画布', async () => {
    const { host, canvas } = await mountMapMode()
    await act(async () => button(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { altKey: true })
      pointer(canvas, 'pointerup', { altKey: true })
      pointer(canvas, 'click', { altKey: true })
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    const options = [...dialog.querySelectorAll<HTMLButtonElement>('[role="option"]')]
    expect(options).toHaveLength(2)
    expect(options[0]?.textContent).toContain('上层')
    expect(options[1]?.textContent).toContain('地板')
    expect(document.activeElement).toBe(options[0])

    await act(async () =>
      options[0]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      ),
    )
    expect(document.activeElement).toBe(options[1])
    await act(async () =>
      options[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(canvas)
  })

  test('活动层锁定或隐藏后，笔刷与 Inspector 写操作禁用并显示原因', async () => {
    const { host, canvas } = await mountMapMode()
    await selectFloor(host, canvas)
    const floorRow = [...host.querySelectorAll<HTMLElement>('.map-layer-row')].find((row) =>
      row.textContent?.includes('地板'),
    )!

    await act(async () =>
      floorRow.querySelector<HTMLButtonElement>('[aria-label="锁定图层"]')?.click(),
    )
    expect(host.querySelector('.map-selection-warning')?.textContent).toContain('当前活动层已锁定')
    expect(button(host, '笔刷').disabled).toBe(true)
    expect(host.querySelector<HTMLInputElement>('[aria-label="选区 tileId"]')?.disabled).toBe(true)

    await act(async () => floorRow.querySelector<HTMLButtonElement>('.layer-lock')?.click())
    await act(async () =>
      floorRow.querySelector<HTMLButtonElement>('[aria-label="隐藏图层"]')?.click(),
    )
    expect(host.querySelector('.map-selection-warning')?.textContent).toContain('当前活动层已隐藏')
    expect(button(host, '笔刷').disabled).toBe(true)
    expect(host.querySelector<HTMLInputElement>('[aria-label="选区 tileId"]')?.disabled).toBe(true)
  })

  test('变换预览锁定 Inspector，切换工具取消后恢复并替换过期错误消息', async () => {
    const { host, canvas, onWorkspaceNotice } = await mountMapMode()
    await selectFloor(host, canvas)
    await act(async () => button(host, '复制').click())
    await act(async () => button(host, '粘贴').click())
    expect(host.querySelector('.map-transform-bar')).not.toBeNull()
    expect(host.querySelector<HTMLInputElement>('[aria-label="选区 tileId"]')?.disabled).toBe(true)

    await act(async () => button(host, '平移').click())
    expect(host.querySelector('.map-transform-bar')).toBeNull()
    expect(host.querySelector<HTMLInputElement>('[aria-label="选区 tileId"]')?.disabled).toBe(false)
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith({
      kind: 'info',
      message: '已取消地图变换预览。',
    })
  })

  test('图章模板、普通瓦片与既有地图选区正交，多层映射初始绝不自动猜测', async () => {
    const { host, canvas } = await mountMapMode({ stamps: [stampTemplate()] })
    await selectFloor(host, canvas)
    await activateStamp(host)

    expect(button(host, '◆ 图章').classList).toContain('active')
    const mappings = [...host.querySelectorAll<HTMLSelectElement>('.stamp-mapping-list select')]
    expect(mappings).toHaveLength(2)
    expect(mappings.map((select) => select.value)).toEqual(['', ''])
    expect(host.querySelector('.stamp-placement-status')?.textContent).toContain('还需映射 2 个')

    await act(async () => button(host, '退出图章工具').click())
    expect(host.querySelector('.map-selection-head')?.textContent).toContain('1 个视觉实例')
    expect(button(host, '笔刷').classList).not.toContain('active')
  })

  test('同 ID 工程更换 EditSession 时清空图章工具、显式映射与最近使用', async () => {
    const template = stampTemplate()
    const { host, canvas, rerenderWithSession } = await mountMapMode({ stamps: [template] })
    await activateStamp(host)
    await mapStampSlots(host)
    await act(async () => pointer(canvas, 'pointerdown', { clientX: 33, clientY: 17 }))
    expect(host.querySelector('.map-stamp-recent')).not.toBeNull()
    expect(button(host, '◆ 图章').classList).toContain('active')

    const nextSession = new EditSession(editorState(fixtureMap(), [template]))
    await rerenderWithSession(nextSession, [template])
    expect(button(host, '◆ 图章').classList).not.toContain('active')
    expect(host.querySelector('.stamp-placement-inspector')).toBeNull()
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
        (candidate) => candidate.getAttribute('aria-selected') === 'true',
      )?.textContent,
    ).toBe('瓦片')

    await activateStamp(host)
    expect(
      [...host.querySelectorAll<HTMLSelectElement>('.stamp-mapping-list select')].map(
        (select) => select.value,
      ),
    ).toEqual(['', ''])
    expect(host.querySelector('.map-stamp-recent')).toBeNull()
  })

  test('跨层 ghost hover 零写；有效点击一次原子放置，undo 同时恢复矩阵与身份', async () => {
    const { host, canvas, session } = await mountMapMode({ stamps: [stampTemplate()] })
    await activateStamp(host)
    await mapStampSlots(host)

    await act(async () => pointer(canvas, 'pointermove', { clientX: 33, clientY: 17 }))
    expect(host.querySelector('.stamp-placement-status')?.textContent).toContain('预览有效')
    expect(session.getMapRevision('map-a')).toBe(0)
    expect(session.isDirty()).toBe(false)

    await act(async () => pointer(canvas, 'pointerdown', { clientX: 33, clientY: 17 }))
    const placed = session.getState().maps['map-a']!
    expect(session.getMapRevision('map-a')).toBe(1)
    expect(placed.version).toBe(3)
    expect(projectMapStampPlacements(placed)).toHaveLength(1)
    expect(placed.layers[0]?.tiles[2]?.[1]).toBe(1)
    expect(placed.layers[1]?.tiles[3]?.[1]).toBe(1)

    await act(async () => session.undo())
    const undone = session.getState().maps['map-a']!
    expect(session.getMapRevision('map-a')).toBe(2)
    expect(undone.version).toBe(2)
    expect(undone.layers[0]?.tiles[2]?.[1]).toBeNull()
    expect(undone.layers[1]?.tiles[3]?.[1]).toBeNull()
  })

  test('普通内容冲突第一次点击零 dispatch，显式覆盖才提交；随后 ownership 不提供覆盖', async () => {
    const { host, canvas, session, onWorkspaceNotice } = await mountMapMode({
      stamps: [stampTemplate()],
    })
    await activateStamp(host)
    await mapStampSlots(host)
    await act(async () => pointer(canvas, 'pointermove'))
    expect(host.querySelector('.stamp-placement-status')?.textContent).toContain('普通内容冲突')
    expect(host.querySelectorAll('.stamp-placement-problems li.conflict')).not.toHaveLength(0)
    expect(host.querySelector('.stamp-placement-problems')?.textContent).toMatch(
      /普通视觉.*r0:c0.*1 → 1/s,
    )

    await act(async () => pointer(canvas, 'pointerdown'))
    expect(session.getMapRevision('map-a')).toBe(0)
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('显式确认覆盖') }),
    )

    await act(async () => button(host, '覆盖普通格并放置').click())
    expect(session.getMapRevision('map-a')).toBe(1)
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)).toHaveLength(1)
    expect(host.querySelector('.stamp-placement-status')?.textContent).toContain('已属于放置组')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].filter((candidate) =>
        candidate.textContent?.includes('覆盖普通格并放置'),
      ),
    ).toHaveLength(0)
  })
})
