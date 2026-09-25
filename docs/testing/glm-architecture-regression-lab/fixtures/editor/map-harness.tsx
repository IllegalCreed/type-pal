/**
 * ARCH-REGRESSION-LAB-GLM-1 · 共享地图实验 harness（G02+ 使用；G01 自持同款实现）。
 * 真实 MapMode + 真实 EditSession；jsdom 打桩与既有 MapMode 测试同口径。
 * mountLabMap 返回真实 canvas / session / onWorkspaceNotice，供手势与会话失效轴驱动。
 */
// @vitest-environment jsdom
import type { SceneDef, StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import type { ProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { vi } from 'vitest'
import { EditSession } from './lab-session.js'
import type { EditorState } from './lab-session.js'
import { MapMode } from '@lab/editor/map-mode'

export function labMap(): ProjectMap {
  return buildBlankProjectMap(3, 2, 'tiles')
}

export function labState(map: ProjectMap): EditorState {
  return {
    manifest: { content: {} } as never,
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
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-a', name: '测试地图', path: 'content/maps/map-a.json' }],
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
  } as EditorState
}

const mountedRoots: { root: Root; host: HTMLDivElement }[] = []

export async function mountLabMap(options: {
  map?: ProjectMap
  selectedMapId?: string
  /** 直接提供完整初始 state（如双地图会话）；优先于 map。 */
  state?: EditorState
} = {}) {
  const map = options.map ?? labMap()
  const state = options.state ?? labState(map)
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
  let selectedMapId = options.selectedMapId ?? 'map-a'
  const render = (renderSession: EditSession) => {
    root.render(
      <MapMode
        scene={scene}
        session={renderSession}
        assetBase={{}} as never
        assetCatalog={{ version: 1, assets: {} }}
        assetReader={{} as never}
        projectMaps={renderSession.getState().maps}
        mapIndex={renderSession.getState().mapIndex}
        selectedMapId={selectedMapId}
        onSelectMap={vi.fn()}
        tilesets={[{ id: 'tiles', name: '测试瓦片', category: 'test', asset: 'tileset.test' }]}
        stamps={[] as StampTemplate[]}
        onRequestInspectorOpen={vi.fn()}
        onWorkspaceNotice={onWorkspaceNotice}
      />,
    )
  }
  await act(async () => {
    render(session)
  })
  const canvas = host.querySelector('canvas')!
  if (!canvas) throw new Error('lab harness: canvas 未渲染')
  return {
    host,
    canvas,
    session,
    onWorkspaceNotice,
    /** 用新 EditSession 重渲染（换会话不换 mapId 的失效轴）。 */
    rerenderWithSession: async (next: EditSession) => {
      await act(async () => {
        render(next)
      })
    },
    /** 换 selectedMapId 重渲染（跨 mapId 失效轴；session 内须已含两图）。 */
    rerenderWithSelectedMap: async (mapId: string, next: EditSession) => {
      selectedMapId = mapId
      await act(async () => {
        render(next)
      })
    },
  }
}

/** 卸载全部挂载（各测试文件 afterEach 自行调用）。 */
export async function unmountAllLabMaps(): Promise<void> {
  for (const { root, host } of mountedRoots.reverse()) {
    await act(async () => {
      root.unmount()
    })
    host.remove()
  }
  mountedRoots.length = 0
}

export function pointer(
  target: HTMLCanvasElement,
  type: string,
  options: { button?: number; clientX?: number; clientY?: number } = {},
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: options.button ?? 0,
    clientX: options.clientX ?? 1,
    clientY: options.clientY ?? 1,
  })
  Object.defineProperty(event, 'pointerId', { value: 7 })
  target.dispatchEvent(event)
}

export function labButton(host: HTMLElement, text: string): HTMLButtonElement {
  const el = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  if (!el) throw new Error(`未找到按钮: ${text}`)
  return el
}

/** jsdom 缺口打桩（scrollIntoView/rect/context/showModal/pointer capture）。 */
export function installLabDomStubs(): void {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0, y: 0, top: 0, left: 0, right: 640, bottom: 480,
      width: 640, height: 480, toJSON: () => ({}),
    }),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement) {
      return { canvas: this, clearRect: vi.fn(), drawImage: vi.fn(), setTransform: vi.fn(),
        save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
        closePath: vi.fn(), stroke: vi.fn() }
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
}
