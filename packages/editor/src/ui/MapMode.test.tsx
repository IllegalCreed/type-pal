// @vitest-environment jsdom
import type { SceneDef, StampTemplateV1 } from '@type-pal/content'
import type { ProjectMap, ProjectMapV2, RleFrame } from '@type-pal/reforge'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapStampPlacements,
  withProjectMapStampPlacements,
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
vi.mock('./stamp-placement-selection-overlay.js', () => ({
  drawStampPlacementSelectionOverlay: vi.fn(),
}))
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

async function mountMapMode(
  options: { stamps?: StampTemplateV1[]; map?: ProjectMap; referenceSelectedMap?: boolean } = {},
): Promise<{
  host: HTMLDivElement
  canvas: HTMLCanvasElement
  session: EditSession
  onWorkspaceNotice: ReturnType<typeof vi.fn>
  rerenderWithSession: (session: EditSession, stamps?: StampTemplateV1[]) => Promise<void>
}> {
  const map = options.map ?? fixtureMap()
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
        scenes={options.referenceSelectedMap === false ? [] : [scene]}
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
  type: 'click' | 'dblclick' | 'pointerdown' | 'pointermove' | 'pointerup',
  options: {
    altKey?: boolean
    shiftKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
    clientX?: number
    clientY?: number
  } = {},
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: options.clientX ?? 1,
    clientY: options.clientY ?? 1,
    altKey: options.altKey,
    shiftKey: options.shiftKey,
    ctrlKey: options.ctrlKey,
    metaKey: options.metaKey,
  })
  Object.defineProperty(event, 'pointerId', { value: 7 })
  target.dispatchEvent(event)
}

function placementMap(two = false): ProjectMap {
  let map: ProjectMap = fixtureMap()
  map = paintProjectMapCollision(map, [
    { row: 0, col: 0, value: 0 },
    { row: 2, col: 0, value: 1 },
  ])
  if (two)
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 2, col: 0, tileId: 1, height: 0 },
      { layerId: 'objects', row: 2, col: 0, tileId: 1, height: 2 },
    ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-a',
      sourceStampId: 'tree-house',
      sourceStampName: '树屋 A',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 0, col: 0 },
      ],
      gridPoints: [{ row: 0, col: 0 }],
    },
    ...(two
      ? [
          {
            id: 'tree-b',
            sourceStampId: 'tree-house',
            sourceStampName: '树屋 B',
            anchor: { row: 2, col: 0 },
            visualSlots: [
              { layerId: 'floor', row: 2, col: 0 },
              { layerId: 'objects', row: 2, col: 0 },
            ],
            gridPoints: [{ row: 2, col: 0 }],
          },
        ]
      : []),
  ])
}

function placementMapWithTwoFloorMembers(): ProjectMap {
  let map = placementMap()
  map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 1, tileId: 4, height: 0 }])
  const [placement] = projectMapStampPlacements(map)
  return withProjectMapStampPlacements(map, [
    {
      ...placement!,
      visualSlots: [...placement!.visualSlots, { layerId: 'floor', row: 0, col: 1 }],
    },
  ])
}

function splitFillPlacementMap(): ProjectMap {
  let map: ProjectMap = buildBlankProjectMap(2, 2, 'tiles')
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
    { layerId: 'floor', row: 1, col: 0, tileId: 1, height: 0 },
    { layerId: 'floor', row: 2, col: 0, tileId: 1, height: 0 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'split',
      sourceStampName: '分离成员',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'floor', row: 2, col: 0 },
      ],
      gridPoints: [],
    },
  ])
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
  test('点击成员选择完整放置组，Enter/Esc 两级进退，解组保留矩阵且可撤销', async () => {
    const map = placementMap()
    const { host, canvas, session } = await mountMapMode({ map, stamps: [stampTemplate()] })
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'pointerdown'))
    expect(host.querySelector('.stamp-group-selection-head')?.textContent).toContain('2 个视觉成员')
    expect(host.querySelector('.stamp-group-summary')?.textContent).toContain('tree-a')

    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('.stamp-group-selection-head.editing')?.textContent).toContain(
      'Esc 退出组内',
    )
    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('.stamp-group-selection-head.editing')).toBeNull()
    expect(host.querySelector('.stamp-group-selection-head')).not.toBeNull()
    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('.stamp-group-selection-head')).toBeNull()

    await act(async () => pointer(canvas, 'pointerdown'))
    const beforeLayers = session.getState().maps['map-a']!.layers
    const beforeCollision = session.getState().maps['map-a']!.collision
    await act(async () => button(host, '解组（保留地图内容）').click())
    const ungrouped = session.getState().maps['map-a']!
    expect(ungrouped.version).toBe(2)
    expect(ungrouped.layers).toBe(beforeLayers)
    expect(ungrouped.collision).toBe(beforeCollision)
    await act(async () => session.undo())
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)[0]?.id).toBe('tree-a')
  })

  test('Shift/Ctrl 对完整放置组增减，相邻同款按 placementId 不串组', async () => {
    const { host, canvas } = await mountMapMode({ map: placementMap(true) })
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'pointerdown', { clientX: 1, clientY: 1 }))
    await act(async () =>
      pointer(canvas, 'pointerdown', { clientX: 1, clientY: 17, shiftKey: true }),
    )
    expect(host.querySelector('.stamp-group-selection-head')?.textContent).toContain('2 组')
    await act(async () => pointer(canvas, 'pointerdown', { clientX: 1, clientY: 1, ctrlKey: true }))
    expect(host.querySelector('.stamp-group-selection-head')?.textContent).toContain('1 组')
    expect(host.querySelector('.stamp-group-summary')?.textContent).toContain('tree-b')
  })

  test('Alt 对同组跨层命中去重；hidden 不命中、locked 仅能显式选为只读整组', async () => {
    const { host, canvas } = await mountMapMode({ map: placementMap() })
    await act(async () => button(host, '选择').click())
    const rows = [...host.querySelectorAll<HTMLElement>('.map-layer-row')]
    const floor = rows.find((row) => row.textContent?.includes('地板'))!
    const objects = rows.find((row) => row.textContent?.includes('上层'))!
    await act(async () =>
      floor.querySelector<HTMLButtonElement>('[aria-label="锁定图层"]')?.click(),
    )
    await act(async () =>
      objects.querySelector<HTMLButtonElement>('[aria-label="隐藏图层"]')?.click(),
    )

    await act(async () => pointer(canvas, 'pointerdown'))
    expect(host.querySelector('.stamp-group-selection-head')).toBeNull()
    await act(async () => {
      pointer(canvas, 'pointerdown', { altKey: true })
      pointer(canvas, 'click', { altKey: true })
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    const options = host.querySelectorAll<HTMLButtonElement>('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]?.textContent).toContain('树屋 A')
    expect(options[0]?.textContent).toContain('整组')
    await act(async () => options[0]?.click())
    expect(host.querySelector('.stamp-group-selection-head')?.textContent).toContain('2 个视觉成员')
    expect(host.querySelector('.map-selection-warning')?.textContent).toContain('隐藏或锁定')
  })

  test('双击 fresh placement hit 直接进入组内，不依赖上一次 selection render', async () => {
    const { host, canvas } = await mountMapMode({ map: placementMap() })
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'dblclick'))
    expect(host.querySelector('.stamp-group-selection-head.editing')).not.toBeNull()
  })

  test('组内双击其他放置组不会绕过隔离切换编辑目标', async () => {
    const { host, canvas, onWorkspaceNotice } = await mountMapMode({ map: placementMap(true) })
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'dblclick', { clientX: 1, clientY: 1 }))
    expect(host.querySelector('.stamp-group-selection-head.editing')?.textContent).toContain(
      '树屋 A',
    )

    await act(async () => pointer(canvas, 'dblclick', { clientX: 1, clientY: 17 }))
    expect(host.querySelector('.stamp-group-selection-head.editing')?.textContent).toContain(
      '树屋 A',
    )
    expect(host.querySelector('.stamp-group-selection-head.editing')?.textContent).not.toContain(
      '树屋 B',
    )
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('请先按 Esc') }),
    )
  })

  test('组内 cells 可单选当前层成员，Inspector 只修改该子选区，Ctrl+A 恢复全组', async () => {
    const { host, canvas, session } = await mountMapMode({
      map: placementMapWithTwoFloorMembers(),
    })
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'dblclick', { clientX: 1, clientY: 1 }))
    expect(host.querySelector('.stamp-group-edit-summary')?.textContent).toContain(
      '当前层选中 2 个',
    )

    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    expect(host.querySelector('.stamp-group-edit-summary')?.textContent).toContain(
      '当前层选中 1 个',
    )
    const tileInput = host.querySelector<HTMLInputElement>('[aria-label="组内当前层 tileId"]')!
    await act(async () => {
      tileInput.focus()
      tileInput.value = '9'
      tileInput.blur()
    })
    const edited = session.getState().maps['map-a']!
    expect(edited.layers[0]?.tiles[0]?.[0]).toBe(1)
    expect(edited.layers[0]?.tiles[0]?.[1]).toBe(9)
    expect(edited.layers[1]?.tiles[0]?.[0]).toBe(1)

    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('.stamp-group-edit-summary')?.textContent).toContain(
      '当前层选中 1 个',
    )

    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    expect(host.querySelector('.stamp-group-edit-summary')?.textContent).toContain(
      '当前层选中 2 个',
    )
  })

  test('活动层普通逻辑槽不被非活动层 placement 的透明逻辑命中劫持', async () => {
    let map: ProjectMap = fixtureMap()
    map = paintProjectMapTiles(map, [{ layerId: 'objects', row: 0, col: 0, tileId: 9, height: 2 }])
    map = withProjectMapStampPlacements(map, [
      {
        id: 'upper-only',
        sourceStampName: '透明上层组',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
        gridPoints: [],
      },
    ])
    const { host, canvas } = await mountMapMode({ map })
    await act(async () => button(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown')
      pointer(canvas, 'pointerup')
    })
    expect(host.querySelector('.map-selection-head')).not.toBeNull()
    expect(host.querySelector('.stamp-group-selection-head')).toBeNull()
  })

  test('活动层普通不透明像素优先于非活动层 placement 的不透明像素', async () => {
    let map: ProjectMap = fixtureMap()
    map = withProjectMapStampPlacements(map, [
      {
        id: 'upper-opaque',
        sourceStampName: '上层不透明组',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
        gridPoints: [],
      },
    ])
    const { host, canvas } = await mountMapMode({ map })
    await act(async () => button(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown')
      pointer(canvas, 'pointerup')
    })
    expect(host.querySelector('.map-selection-head')).not.toBeNull()
    expect(host.querySelector('.stamp-group-selection-head')).toBeNull()
  })

  test('活动层普通视觉命中优先于同坐标 placement collision ownership', async () => {
    let map: ProjectMap = fixtureMap()
    map = paintProjectMapTiles(map, [{ layerId: 'objects', row: 2, col: 0, tileId: 1, height: 2 }])
    map = withProjectMapStampPlacements(map, [
      {
        id: 'collision-owner',
        sourceStampName: '碰撞归组',
        anchor: { row: 2, col: 0 },
        visualSlots: [{ layerId: 'objects', row: 2, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    ])
    const { host, canvas } = await mountMapMode({ map })
    await act(async () => button(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown')
      pointer(canvas, 'pointerup')
    })
    expect(host.querySelector('.map-selection-head')).not.toBeNull()
    expect(host.querySelector('.stamp-group-selection-head')).toBeNull()
  })

  test('活动层空视觉槽不会压住 placement collision 的直接整组选中', async () => {
    let map: ProjectMap = buildBlankProjectMap(2, 2, 'tiles')
    map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 2, col: 0, tileId: 1, height: 0 }])
    map = withProjectMapStampPlacements(map, [
      {
        id: 'collision-only-hit',
        sourceStampName: '远处视觉成员',
        anchor: { row: 2, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 2, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    ])
    const { host, canvas } = await mountMapMode({ map })
    await act(async () => button(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown')
      pointer(canvas, 'pointerup')
    })
    expect(host.querySelector('.stamp-group-selection-head')?.textContent).toContain('1 组')
    expect(host.querySelector('.stamp-group-summary')?.textContent).toContain('collision-only-hit')
  })

  test('切换到同 mapId / placementId 的另一工程会话会清空组选择与组内上下文', async () => {
    const { host, canvas, rerenderWithSession } = await mountMapMode({ map: placementMap() })
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'dblclick'))
    expect(host.querySelector('.stamp-group-selection-head.editing')).not.toBeNull()

    const nextSession = new EditSession(editorState(placementMap()))
    await rerenderWithSession(nextSession)
    expect(host.querySelector('.stamp-group-selection-head')).toBeNull()
    expect(host.querySelector('.stamp-group-selection-head.editing')).toBeNull()
  })

  test('组内 Alt 与普通剪贴板快捷键不能打开外部候选或变换', async () => {
    let map = placementMap(true)
    map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 1, tileId: 1, height: 0 }])
    const { host, canvas, onWorkspaceNotice } = await mountMapMode({ map })
    await act(async () => button(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    await act(async () => pointer(canvas, 'pointerdown', { clientX: 1, clientY: 1 }))
    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('.stamp-group-selection-head.editing')?.textContent).toContain(
      '树屋 A',
    )

    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 1, clientY: 17, altKey: true })
      pointer(canvas, 'pointerup', { clientX: 1, clientY: 17, altKey: true })
      pointer(canvas, 'click', { clientX: 1, clientY: 17, altKey: true })
    })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(host.querySelector('.stamp-group-selection-head.editing')?.textContent).toContain(
      '树屋 A',
    )

    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'v',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    expect(host.querySelector('.map-transform-bar')).toBeNull()
    expect(host.querySelector('.stamp-group-selection-head.editing')?.textContent).toContain(
      '树屋 A',
    )
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('先按 Esc') }),
    )
  })

  test('切换 EditSession 会清掉旧工程正在进行的变换预览与剪贴板', async () => {
    const { host, canvas, rerenderWithSession } = await mountMapMode()
    await selectFloor(host, canvas)
    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    await act(async () =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'v',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    expect(host.querySelector('.map-transform-bar')).not.toBeNull()

    const nextSession = new EditSession(editorState(fixtureMap()))
    await rerenderWithSession(nextSession)
    expect(host.querySelector('.map-transform-bar')).toBeNull()
    expect(button(host, '平移').classList).toContain('active')
    expect(button(host, '粘贴').disabled).toBe(true)
  })

  test('切换同 mapId 的 EditSession 会清掉旧工程删除二次确认', async () => {
    const { host, rerenderWithSession } = await mountMapMode({ referenceSelectedMap: false })
    const deleteButton = host.querySelector<HTMLButtonElement>('[title="删除地图"]')!
    await act(async () => deleteButton.click())
    expect(deleteButton.title).toBe('再次点击确认删除')

    const nextSession = new EditSession(editorState(fixtureMap()))
    await rerenderWithSession(nextSession)
    expect(deleteButton.title).toBe('删除地图')
    await act(async () => deleteButton.click())
    expect(nextSession.getState().maps['map-a']).toBeDefined()
    expect(deleteButton.title).toBe('再次点击确认删除')
  })

  test.each([
    '笔刷',
    '矩形',
    '填充',
    '擦除',
  ])('%s 命中组成员整笔零写并提示进入组内或解组', async (tool) => {
    const map = placementMap()
    const { host, canvas, session, onWorkspaceNotice } = await mountMapMode({ map })
    await act(async () => button(host, tool).click())
    const before = session.getState()
    await act(async () => {
      pointer(canvas, 'pointerdown')
      if (tool === '矩形') pointer(canvas, 'pointermove', { clientX: 17, clientY: 9 })
      pointer(canvas, 'pointerup')
    })
    expect(session.getState()).toBe(before)
    expect(session.getMapRevision('map-a')).toBe(0)
    expect(session.isDirty()).toBe(false)
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('先解组') }),
    )
  })

  test.each(['标记', '清除'])('普通碰撞%s 命中组成员整笔零写', async (mode) => {
    const map = placementMap()
    const { host, canvas, session, onWorkspaceNotice } = await mountMapMode({ map })
    await act(async () => button(host, mode).click())
    const before = session.getState()
    await act(async () => {
      pointer(canvas, 'pointerdown')
      pointer(canvas, 'pointerup')
    })
    expect(session.getState()).toBe(before)
    expect(session.getMapRevision('map-a')).toBe(0)
    expect(session.isDirty()).toBe(false)
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('先解组') }),
    )
  })

  test('普通 fill 即使写回同值也先报告 ownership，不被 helper no-op 吞掉', async () => {
    let map = placementMap()
    map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 0, tileId: 0, height: 0 }])
    const { host, canvas, session, onWorkspaceNotice } = await mountMapMode({ map })
    await act(async () => button(host, '填充').click())
    await act(async () => pointer(canvas, 'pointerdown'))
    expect(session.getMapRevision('map-a')).toBe(0)
    expect(session.isDirty()).toBe(false)
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('组内编辑') }),
    )
  })

  test('组内 fill 从组外起点零写，且普通格不能桥接两个组成员', async () => {
    const { host, canvas, session, onWorkspaceNotice } = await mountMapMode({
      map: splitFillPlacementMap(),
    })
    await act(async () => button(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 1, clientY: 1, altKey: true })
      pointer(canvas, 'pointerup', { clientX: 1, clientY: 1, altKey: true })
      pointer(canvas, 'click', { clientX: 1, clientY: 1, altKey: true })
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => host.querySelector<HTMLButtonElement>('.stamp-group-candidate')?.click())
    await act(async () => button(host, '进入组内编辑').click())
    expect(host.querySelector('.stamp-group-selection-head.editing')).not.toBeNull()
    await act(async () => button(host, '填充').click())
    const before = session.getState().maps['map-a']!
    await act(async () => pointer(canvas, 'pointerdown', { clientX: 16, clientY: 9 }))
    expect(session.getState().maps['map-a']).toBe(before)

    await act(async () => pointer(canvas, 'pointerdown', { clientX: 1, clientY: 1 }))
    expect(onWorkspaceNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'info', message: expect.stringContaining('可撤销') }),
    )
    const edited = session.getState().maps['map-a']!
    expect(edited.layers[0]?.tiles[0]?.[0]).toBe(0)
    expect(edited.layers[0]?.tiles[1]?.[0]).toBe(1)
    expect(edited.layers[0]?.tiles[2]?.[0]).toBe(1)
  })

  test('组内 Inspector 只改活动层；collision=0/非零均保留身份，显式移出只删身份', async () => {
    const { host, canvas, session } = await mountMapMode({ map: placementMap() })
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'pointerdown'))
    await act(async () => button(host, '进入组内编辑').click())

    const tileInput = host.querySelector<HTMLInputElement>('[aria-label="组内当前层 tileId"]')!
    await act(async () => {
      tileInput.focus()
      tileInput.value = '9'
      tileInput.blur()
    })
    let edited = session.getState().maps['map-a']!
    expect(edited.layers[0]?.tiles[0]?.[0]).toBe(9)
    expect(edited.layers[1]?.tiles[0]?.[0]).toBe(1)

    const collisionInput = host.querySelector<HTMLInputElement>('[aria-label="组内碰撞值"]')!
    await act(async () => {
      collisionInput.focus()
      collisionInput.value = '3'
      collisionInput.blur()
    })
    edited = session.getState().maps['map-a']!
    expect(edited.collision[0]?.[0]).toBe(3)
    expect(projectMapStampPlacements(edited)[0]?.gridPoints).toHaveLength(1)
    await act(async () => button(host, '移出碰撞成员').click())
    edited = session.getState().maps['map-a']!
    expect(edited.collision[0]?.[0]).toBe(3)
    expect(projectMapStampPlacements(edited)[0]?.gridPoints).toEqual([])
  })

  test('组内碰撞控件在任一 placement 视觉层锁定时只读', async () => {
    const { host, canvas } = await mountMapMode({ map: placementMap() })
    const objectRow = [...host.querySelectorAll<HTMLElement>('.map-layer-row')].find((row) =>
      row.textContent?.includes('上层'),
    )!
    await act(async () =>
      objectRow.querySelector<HTMLButtonElement>('[aria-label="锁定图层"]')?.click(),
    )
    await act(async () => button(host, '选择').click())
    await act(async () => pointer(canvas, 'pointerdown'))
    await act(async () => button(host, '进入组内编辑').click())
    expect(host.querySelector<HTMLInputElement>('[aria-label="组内碰撞值"]')?.disabled).toBe(true)
    expect(host.querySelector('.map-selection-warning')?.textContent).toContain('所有视觉层可写')
  })

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
