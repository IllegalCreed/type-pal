// @vitest-environment jsdom

import { parseProjectMap, validateScenes } from '@type-pal/content'
import {
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  type ProjectMap,
  type RleFrame,
} from '@type-pal/reforge'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { fixtureSource } from '../core/__tests__/battle-trial-project.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { toEditorState } from '../core/project-io.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
} from '../core/project-reference.js'
import { buildBlankProject } from '../core/seed.js'
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

vi.mock('./scene-stage.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./scene-stage.js')>()
  const React = await import('react')
  const frame: RleFrame = {
    width: 32,
    height: 16,
    pixels: new Uint8Array(32 * 16),
    opaque: new Uint8Array(32 * 16).fill(1),
  }
  return {
    ...original,
    drawGridBlocked: vi.fn(),
    mapBoxOf: vi.fn(() => ({ minX: 0, minY: 0, maxX: 640, maxY: 480 })),
    useStageSize: vi.fn(() => ({ w: 640, h: 480 })),
    useSceneAssets: (options: { mapId: string; projectMaps?: Record<string, ProjectMap> }) => {
      const loadedRef = React.useRef({
        renderer: {} as never,
        map: options.projectMaps?.[options.mapId] as ProjectMap,
        spritesByNum: new Map(),
        tiles: new Map([
          [0, frame],
          [1, frame],
        ]),
        tilesets: new Map([
          [
            'starter',
            new Map([
              [0, frame],
              [1, frame],
            ]),
          ],
        ]),
        palette: {
          colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
          cycles: [],
        },
      })
      loadedRef.current.map = options.projectMaps?.[options.mapId] as ProjectMap
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

const mounted: Array<{ root: Root; host: HTMLDivElement }> = []
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
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
        setTransform: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
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
  for (const { root, host } of mounted.splice(0).reverse()) {
    await act(async () => root.unmount())
    host.remove()
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mount() {
  const nodeBuffer = 'node:buffer'
  const native: { Blob: typeof Blob } = await import(nodeBuffer)
  vi.stubGlobal('Blob', native.Blob)
  const files = await buildBlankProject('map-catalog-coverage')
  const source = fixtureSource(files)
  const project = await loadCurrentProjectFrom(source)
  const authorScenes = await loadAllAuthorScenes(project)
  const scene = validateScenes([files['content/scenes/start.json']])[0]!
  const map = parseProjectMap(files['content/maps/start.json'] as string)
  const state = toEditorState(project, authorScenes, { start: map }, {}, [])
  const session = new EditSession(state)
  const assetReader = createEditorAssetReader(source, {
    manifest: project.manifest,
    assetCatalog: project.assetCatalog,
    assetBlobs: {},
  })
  const references = createProjectReferenceIndex(
    buildProjectReferenceSnapshot([
      {
        target: { kind: 'map', id: 'start' },
        source: createProjectReferenceSource({ kind: 'scene', id: scene.id }, `场景 ${scene.id}`, {
          deletedWith: [{ kind: 'scene', id: scene.id }],
        }),
        relation: { kind: 'scene-map' },
        where: `scenes.${scene.id}.mapId`,
        locator: { kind: 'object', object: { kind: 'scene', id: scene.id } },
        deletePolicy: 'replace-suggest',
      },
    ]),
  )
  const before = structuredClone(session.getState())
  const onSelectMap = vi.fn()
  const onWorkspaceNotice = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  function Harness() {
    const [selectedMapId, setSelectedMapId] = useState('start')
    return (
      <MapMode
        scene={scene}
        session={session}
        assetBase={project.assetBase}
        assetCatalog={project.assetCatalog}
        assetReader={assetReader}
        projectMaps={session.getState().maps}
        mapIndex={session.getState().mapIndex}
        selectedMapId={selectedMapId}
        onSelectMap={(id) => {
          onSelectMap(id)
          setSelectedMapId(id ?? 'start')
        }}
        referenceIndex={references}
        referenceStatus="current"
        getCurrentReferenceIndex={() => references}
        onOpenReference={vi.fn()}
        tilesets={project.tilesets}
        stamps={[]}
        onWorkspaceNotice={onWorkspaceNotice}
      />
    )
  }
  await act(async () => root.render(<Harness />))
  return { host, session, before, onSelectMap, onWorkspaceNotice, map }
}

function button(host: ParentNode, label: string) {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label,
  )
  expect(found, `missing ${label}`).toBeDefined()
  return found!
}

async function overflow(host: HTMLElement) {
  await act(async () => button(host, '更多操作').click())
  const menu = document.querySelector<HTMLElement>('[role="menu"][aria-label="更多操作"]')
  expect(menu).not.toBeNull()
  return menu!
}

describe('当前合法工程的地图目录工作流', () => {
  test('新建地图只追加稳定索引和空白地图，保留起始场景引用及原图字节', async () => {
    const { host, session, before, onSelectMap, map } = await mount()
    expect(session.getState()).toEqual(before)
    await act(async () => button(host, '新建地图').click())
    const state = session.getState()
    expect(state.mapIndex.maps).toHaveLength(2)
    const created = state.mapIndex.maps[1]!
    expect(created.id).not.toBe('start')
    expect(created.name).toBe('新地图')
    expect(state.maps[created.id]).toMatchObject({ width: 24, height: 24 })
    expect(onSelectMap).toHaveBeenCalledExactlyOnceWith(created.id)
    expect(state.scenes[0]?.mapId).toBe('start')
    expect(state.maps.start).toEqual(map)
    expect(before.mapIndex.maps).toHaveLength(1)
  })

  test('复制当前地图建立新的资产身份，地图正文独立且原项目入口不漂移', async () => {
    const { host, session, before, onSelectMap, map } = await mount()
    const menu = await overflow(host)
    await act(async () => button(menu, '复制地图').click())
    const state = session.getState()
    expect(state.mapIndex.maps).toHaveLength(2)
    const copy = state.mapIndex.maps[1]!
    expect(copy).toMatchObject({ name: '起始地图 副本' })
    expect(copy.id).not.toBe('start')
    expect(copy.path).not.toBe(before.mapIndex.maps[0]!.path)
    expect(state.maps[copy.id]).toEqual(map)
    expect(state.maps[copy.id]).not.toBe(map)
    expect(state.maps.start).toEqual(map)
    expect(state.scenes[0]?.mapId).toBe('start')
    expect(onSelectMap).toHaveBeenCalledExactlyOnceWith(copy.id)
    expect(before.mapIndex.maps).toHaveLength(1)
  })

  test('目录重命名只改作者显示名，稳定 ID、文件路径、场景引用与地图内容不变', async () => {
    const { host, session, before, map } = await mount()
    const menu = await overflow(host)
    await act(async () => button(menu, '重命名地图').click())
    const input = host.querySelector<HTMLInputElement>('input[aria-label="地图名称"]')
    expect(input).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    expect(setter).toBeDefined()
    await act(async () => {
      setter!.call(input, '  新起始地图  ')
      input!.dispatchEvent(new Event('input', { bubbles: true }))
      input!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(session.getState().mapIndex.maps).toEqual([
      { ...before.mapIndex.maps[0], name: '新起始地图' },
    ])
    expect(session.getState().scenes[0]?.mapId).toBe('start')
    expect(session.getState().maps.start).toEqual(map)
  })

  test('仅无引用副本允许二次确认删除；首次点击零写，确认后回选起始地图', async () => {
    const { host, session, onSelectMap, map } = await mount()
    let menu = await overflow(host)
    await act(async () => button(menu, '复制地图').click())
    const copyId = session.getState().mapIndex.maps[1]!.id
    const afterCopy = structuredClone(session.getState())
    menu = await overflow(host)
    const firstDelete = button(menu, '删除地图')
    expect(firstDelete.disabled).toBe(false)
    await act(async () => firstDelete.click())
    expect(session.getState()).toEqual(afterCopy)

    menu = await overflow(host)
    await act(async () => button(menu, '确认删除地图').click())
    const state = session.getState()
    expect(state.mapIndex.maps.map((asset) => asset.id)).toEqual(['start'])
    expect(state.maps[copyId]).toBeUndefined()
    expect(state.maps.start).toEqual(map)
    expect(state.scenes[0]?.mapId).toBe('start')
    expect(onSelectMap.mock.calls).toEqual([[copyId], ['start']])
  })

  test('正式起始场景仍引用 start 地图时，目录删除禁用且没有会话写入', async () => {
    const { host, session, before, onSelectMap } = await mount()
    const menu = await overflow(host)
    const deleteStart = button(menu, '删除地图')
    expect(deleteStart.disabled).toBe(true)
    expect(deleteStart.title).toBe('仍有 1 处引用，不能删除')
    await act(async () => deleteStart.click())
    expect(session.getState()).toEqual(before)
    expect(onSelectMap).not.toHaveBeenCalled()
  })
})
