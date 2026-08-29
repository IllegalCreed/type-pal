// @vitest-environment jsdom

import type { CurrentManifest, SceneDef } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState, EditSession } from '../core/edit-session.js'
import { AmbienceScenePreview, type AmbienceScenePreviewProps } from './AmbienceScenePreview.js'

const mocks = vi.hoisted(() => ({
  compositeAmbienceTint: vi.fn(),
  renderSceneFrame: vi.fn(),
  sceneAssetError: '',
  sceneAssetStatus: 'ready' as 'loading' | 'ready' | 'error',
  sceneAssetOptions: [] as Array<{
    mapId: string
    projectMaps: Record<string, ProjectMap>
    sourceKey?: string
  }>,
}))

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...original,
    compositeAmbienceTint: mocks.compositeAmbienceTint,
    renderSceneFrame: mocks.renderSceneFrame,
  }
})

vi.mock('./scene-stage.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./scene-stage.js')>()
  const React = await import('react')
  return {
    ...original,
    buildInitialSceneSpriteDraws: vi.fn(() => []),
    collectInitialSceneSpriteAssets: vi.fn(() => []),
    fitStageView: vi.fn(() => ({ zoom: 1, panX: 0, panY: 0 })),
    mapBoxOf: vi.fn(() => ({ minX: 0, minY: 0, maxX: 32, maxY: 16 })),
    useSceneAssets: (options: {
      mapId: string
      projectMaps: Record<string, ProjectMap>
      sourceKey?: string
    }) => {
      mocks.sceneAssetOptions.push(options)
      const loadedRef = React.useRef({
        renderer: {},
        map:
          options.projectMaps[options.mapId] ??
          ({ width: 1, height: 1, layers: [], collision: [] } as unknown as ProjectMap),
        spritesByAsset: new Map(),
      })
      return {
        status: mocks.sceneAssetStatus,
        err: mocks.sceneAssetError,
        loadedRef,
      }
    },
    useStageSize: vi.fn(() => ({ w: 320, h: 180 })),
  }
})

const projectMap = {
  version: 4,
  width: 1,
  height: 1,
  tilesetRefs: [],
  layers: [],
  collision: [[0]],
} as unknown as ProjectMap

const scene: SceneDef = {
  id: 'scene-a',
  mapId: 'map-a',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

function manifest(overrides: Partial<CurrentManifest> = {}): CurrentManifest {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 19,
    minimumSaveVersion: 8,
    defaultEntryId: 'new-game',
    entryPoints: [
      {
        id: 'new-game',
        label: '开始',
        scene: scene.id,
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
    content: {},
    assets: {},
    ...overrides,
  } as CurrentManifest
}

function sessionFor(maps: Record<string, ProjectMap> = { 'map-a': projectMap }) {
  const dispatch = vi.fn()
  const ensureMapLoaded = vi.fn()
  const state = { maps } as unknown as EditorState
  const session = {
    dispatch,
    ensureMapLoaded,
    getMapRevision: vi.fn(() => 0),
    getState: () => state,
    getVersion: () => 0,
    subscribe: () => () => {},
  } as unknown as EditSession
  return { dispatch, ensureMapLoaded, session }
}

function previewProps(
  session: EditSession,
  overrides: Partial<AmbienceScenePreviewProps> = {},
): AmbienceScenePreviewProps {
  return {
    session,
    manifest: manifest(),
    scenes: [scene],
    actors: [],
    sprites: [],
    assetBase: {} as never,
    assetCatalog: { version: 1, assets: {} },
    assetReader: {} as never,
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    projectKey: 'demo:workspace-a',
    tint: [117, 229, 255],
    ...overrides,
  }
}

describe('AmbienceScenePreview', () => {
  let host: HTMLDivElement
  let root: Root
  let nextFrameId: number
  let frames: Map<number, FrameRequestCallback>

  const flushFrames = (): void => {
    const pending = [...frames.values()]
    frames.clear()
    for (const callback of pending) callback(0)
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.clearAllMocks()
    mocks.sceneAssetError = ''
    mocks.sceneAssetStatus = 'ready'
    mocks.sceneAssetOptions.length = 0
    nextFrameId = 1
    frames = new Map()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = nextFrameId++
      frames.set(id, callback)
      return id
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id)
    })
    const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(
      this: HTMLCanvasElement,
    ) {
      let context = contexts.get(this)
      if (!context) {
        context = {
          clearRect: vi.fn(),
          drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D
        contexts.set(this, context)
      }
      return context
    })
    Object.defineProperties(HTMLCanvasElement.prototype, {
      hasPointerCapture: { configurable: true, value: vi.fn(() => false) },
      releasePointerCapture: { configurable: true, value: vi.fn() },
      setPointerCapture: { configurable: true, value: vi.fn() },
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  test('缓存真实底帧，连续调色只合成最后一帧且不写入项目', async () => {
    const current = sessionFor()
    const initial = previewProps(current.session)
    await act(async () => root.render(<AmbienceScenePreview {...initial} />))
    await act(async () => flushFrames())

    expect(mocks.renderSceneFrame).toHaveBeenCalledTimes(1)
    expect(mocks.compositeAmbienceTint).toHaveBeenCalledWith(
      expect.anything(),
      [117, 229, 255],
      320,
      180,
    )
    expect(mocks.sceneAssetOptions[0]?.projectMaps['map-a']).toBe(projectMap)
    expect(mocks.sceneAssetOptions[0]?.sourceKey).toBe('demo:workspace-a\0scene-a\0map-a')
    expect(current.ensureMapLoaded).not.toHaveBeenCalled()
    expect(current.dispatch).not.toHaveBeenCalled()

    mocks.compositeAmbienceTint.mockClear()
    await act(async () => root.render(<AmbienceScenePreview {...initial} tint={[80, 90, 100]} />))
    await act(async () => root.render(<AmbienceScenePreview {...initial} tint={[10, 20, 30]} />))
    await act(async () => flushFrames())

    expect(mocks.renderSceneFrame).toHaveBeenCalledTimes(1)
    expect(mocks.compositeAmbienceTint).toHaveBeenCalledTimes(1)
    expect(mocks.compositeAmbienceTint).toHaveBeenLastCalledWith(
      expect.anything(),
      [10, 20, 30],
      320,
      180,
    )
    expect(current.dispatch).not.toHaveBeenCalled()
  })

  test('原图与滤镜切换不重建底帧，跨项目则换掉画布和缓存', async () => {
    const current = sessionFor()
    const initial = previewProps(current.session)
    await act(async () => root.render(<AmbienceScenePreview {...initial} />))
    await act(async () => flushFrames())
    const firstCanvas = host.querySelector('canvas')

    mocks.compositeAmbienceTint.mockClear()
    const original = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '原图',
    )!
    await act(async () => original.click())
    await act(async () => flushFrames())
    expect(mocks.renderSceneFrame).toHaveBeenCalledTimes(1)
    expect(mocks.compositeAmbienceTint).not.toHaveBeenCalled()

    await act(async () =>
      root.render(<AmbienceScenePreview {...initial} projectKey="demo:workspace-b" />),
    )
    await act(async () => flushFrames())
    expect(host.querySelector('canvas')).not.toBe(firstCanvas)
    expect(mocks.renderSceneFrame).toHaveBeenCalledTimes(2)
    expect(current.dispatch).not.toHaveBeenCalled()
  })

  test('入口或默认入口场景失效时明确报错，不静默选择首个场景', async () => {
    const current = sessionFor()
    await act(async () =>
      root.render(
        <AmbienceScenePreview
          {...previewProps(current.session)}
          manifest={manifest({ defaultEntryId: 'missing' })}
        />,
      ),
    )
    expect(host.textContent).toContain('直接启动入口“missing”不存在')
    expect(host.querySelector('canvas')).toBeNull()

    await act(async () =>
      root.render(
        <AmbienceScenePreview
          {...previewProps(current.session)}
          manifest={manifest({
            entryPoints: [
              {
                id: 'new-game',
                label: '开始',
                scene: 'missing-scene',
                startWorld: { party: [], money: 0, inventory: [] },
              },
            ],
          })}
        />,
      ),
    )
    expect(host.textContent).toContain('默认入口场景“missing-scene”不在当前项目')
    expect(host.querySelector('canvas')).toBeNull()
  })

  test('区分无场景、资产加载中与加载失败，且不写入工程', async () => {
    const current = sessionFor()
    await act(async () =>
      root.render(<AmbienceScenePreview {...previewProps(current.session)} scenes={[]} />),
    )
    expect(host.textContent).toContain('当前项目没有可预览场景')
    expect(host.querySelector('canvas')).toBeNull()

    mocks.sceneAssetStatus = 'loading'
    await act(async () => root.render(<AmbienceScenePreview {...previewProps(current.session)} />))
    expect(host.querySelector('[role="status"]')?.textContent).toContain('正在读取场景')
    expect(mocks.renderSceneFrame).not.toHaveBeenCalled()

    mocks.sceneAssetStatus = 'error'
    mocks.sceneAssetError = '地图文件损坏'
    await act(async () => root.render(<AmbienceScenePreview {...previewProps(current.session)} />))
    expect(host.textContent).toContain('场景预览失败：地图文件损坏')
    expect(mocks.renderSceneFrame).not.toHaveBeenCalled()
    expect(current.dispatch).not.toHaveBeenCalled()
  })

  test('适应、平移与缩放只改视图，不产生编辑命令', async () => {
    const current = sessionFor()
    await act(async () => root.render(<AmbienceScenePreview {...previewProps(current.session)} />))
    await act(async () => flushFrames())

    const canvas = host.querySelector('canvas')!
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 180,
      width: 320,
      height: 180,
      toJSON: () => ({}),
    })
    const pointer = (type: string, x: number, y: number): void => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y })
      Object.defineProperty(event, 'pointerId', { value: 7 })
      canvas.dispatchEvent(event)
    }

    const fit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '适应画布',
    )!
    await act(async () => fit.click())
    await act(async () => {
      pointer('pointerdown', 20, 20)
      pointer('pointermove', 44, 36)
      pointer('pointerup', 44, 36)
      canvas.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100, clientX: 80 }),
      )
    })
    await act(async () => flushFrames())

    expect(current.dispatch).not.toHaveBeenCalled()
    expect(mocks.renderSceneFrame.mock.calls.length).toBeGreaterThan(1)
  })
})
