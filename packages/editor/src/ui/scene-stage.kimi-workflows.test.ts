// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K12（批C）：scene-stage 共享层真实工作流补测
 * （锚 scene-stage.ts:100 useSceneAssets / 386·403 useViewZoomPan）。
 *
 * 与旧测试的本质差异：不 mock @type-pal/reforge 的加载器 —— 真实 blank 项目磁盘源 +
 * 活 EditorAssetReader（gatedFileSource 只闸 readBytes 磁盘端口），palette/tileset 经真实
 * gzip+RLE 解码；catalog sha 变化用真实命令换字节触发重载。
 *
 * 旧 file/title → 已证合同 → 本组缺口：
 * - scene-stage.test.tsx（vi.mock 掉 loadProjectMap/loadTilesetAsset/loadStandardPalette）：
 *   - '共享适应画布公式居中内容并保留统一边距' → 已证 fitStageView 纯函数；不重复。
 *   - '地图/场景舞台以 record sha 为失效键，同路径同长度替换仍重载' → 已证 sha 进依赖键（mock
 *     loader 计数）；缺口：真实命令换字节后 useSceneAssets 重载并**真实解出新帧**，且 live 地图
 *     编辑只换 map 引用、不重读瓦片集（本文件 test 3）。
 *   - '磁盘回退地图按读取后的 tilesetRefs 加载瓦片集，不能 ready 后黑屏' → 已证磁盘回退加载
 *     顺序（mock）；缺口：磁盘回退**失败**时 error 状态与真实错误消息（test 4）。
 *   - 旧 test.each 两参数化（mapId 切换 / 仅 sourceKey 切换）丢弃迟到的旧地图结果 → 已证 alive 丢弃
 *     （mock deferred）；归属的消费者侧证据由 SceneCanvas.kimi-workflows.test.tsx test 4 承担。
 *   - '碰撞遮罩…' / '网格只裁在非倾斜画布矩形内…' / '触发高亮…' → 已证绘制纯函数；不重复。
 * - useViewZoomPan 在全部旧测试中被 mock（SceneCanvas/PreviewCanvas/MapMode 旧测试）→ 缺口：
 *   真实滚轮监听的光标锚缩放精数、往返对称、上下限夹回与 centerAnchor（test 1/2）。
 *
 * jsdom 补齐（k12-fixtures.ts，观测范围以 fixture 头注释为准）：Path2D 记录型、pointer capture、
 * canvas 矩形、scrollIntoView。无产品 mock。
 */
import type { AssetRecordV1 } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import {
  compressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
} from '@type-pal/reforge'
import { act, createElement, useEffect, useRef, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import { ApplyProjectMapPatchCommand, UpsertAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { loadLegalUiProject, useActEnvironment } from './__tests__/glm-ui-wave-kit.js'
import {
  diskMapIndex,
  installJsdomStageSemantics,
  type StageViewLike,
  wheelOn,
} from './__tests__/kimi-editor-workflows/k12-fixtures.js'
import {
  atlasColors,
  gatedFileSource,
  installBrowserHardwarePorts,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { type StageAssets, useSceneAssets, useViewZoomPan } from './scene-stage.js'

const MAP_ID = 'start'
const TILESET_ASSET = 'tileset.generated.starter'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  installJsdomStageSemantics()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function ZoomHarness(props: {
  initial: StageViewLike
  centerAnchor?: boolean
  onView: (view: StageViewLike) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { view } = useViewZoomPan({
    canvasRef,
    initial: props.initial,
    ...(props.centerAnchor !== undefined ? { centerAnchor: props.centerAnchor } : {}),
  })
  const { onView } = props
  useEffect(() => {
    onView(view)
  }, [onView, view])
  // 冻结路径是 .ts（targets.json K12），不用 JSX：createElement 直写。
  return createElement('canvas', { ref: canvasRef, width: 100, height: 100 })
}

async function mountZoom(
  initial: StageViewLike,
  centerAnchor?: boolean,
): Promise<{ views: StageViewLike[]; canvas: HTMLCanvasElement }> {
  const views: StageViewLike[] = []
  await act(async () => {
    root.render(
      createElement(ZoomHarness, {
        // 同 root 复渲染时以 key 强制重挂载（initial 只在挂载时进入 useState）。
        key: `${initial.zoom}:${initial.panX}:${initial.panY}:${centerAnchor === true}`,
        initial,
        ...(centerAnchor !== undefined ? { centerAnchor } : {}),
        onView: (view) => views.push({ ...view }),
      }),
    )
  })
  const canvas = host.querySelector('canvas')!
  expect(canvas).not.toBeNull()
  return { views, canvas }
}

interface SceneAssetsStatus {
  status: 'loading' | 'ready' | 'error'
  err: string
  loaded: StageAssets | null
}

function AssetsHarness(props: {
  session: EditSession
  reader: EditorAssetReader
  assetBase: AssetBase
  mapId?: string
  diskFallback?: boolean
  onStatus: (status: SceneAssetsStatus) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const state = props.session.getState()
  const result = useSceneAssets({
    canvasRef,
    assetBase: props.assetBase,
    mapId: props.mapId ?? MAP_ID,
    spriteAssets: [],
    projectMaps: props.diskFallback ? {} : state.maps,
    ...(props.diskFallback
      ? {
          mapIndex: diskMapIndex([
            {
              id: props.mapId ?? MAP_ID,
              name: '磁盘地图',
              path: `content/maps/${props.mapId ?? MAP_ID}.json`,
            },
          ]),
        }
      : { mapIndex: state.mapIndex }),
    tilesets: state.tilesets ?? [],
    assetCatalog: state.assetCatalog,
    assetReader: props.reader,
  })
  const { onStatus } = props
  // 每个渲染拍都上报：loadedRef 是稳定 ref 身份，swap 只有 map 引用变化，不能靠依赖数组捕获。
  useEffect(() => {
    onStatus({ status: result.status, err: result.err, loaded: result.loadedRef.current })
  })
  return createElement('canvas', { ref: canvasRef, width: 100, height: 100 })
}

describe('K12 scene-stage 共享层真实工作流', () => {
  test('滚轮光标锚缩放：精数、往返对称与下限夹回', async () => {
    const mounted = await mountZoom({ zoom: 2, panX: 10, panY: 20 })
    // 放大：nz=2.24；锚点 (25,40) 的世界坐标 (22.5,40) 不动。
    await act(async () => {
      wheelOn(mounted.canvas, { deltaY: -100, clientX: 25, clientY: 40 })
    })
    let view = mounted.views.at(-1)!
    expect(view.zoom).toBeCloseTo(2.24, 10)
    expect(view.panX).toBeCloseTo(11.3393, 3)
    expect(view.panY).toBeCloseTo(22.1429, 3)
    // 缩小回到原视图（同一光标锚的往返对称）。
    await act(async () => {
      wheelOn(mounted.canvas, { deltaY: 100, clientX: 25, clientY: 40 })
    })
    view = mounted.views.at(-1)!
    expect(view.zoom).toBeCloseTo(2, 10)
    expect(view.panX).toBeCloseTo(10, 10)
    expect(view.panY).toBeCloseTo(20, 10)

    // 下限夹回：0.05 → 0.0446（未夹）→ 0.0398 夹到 0.04；继续缩小稳定在夹回后的不动点。
    const floored = await mountZoom({ zoom: 0.05, panX: 0, panY: 0 })
    await act(async () => {
      wheelOn(floored.canvas, { deltaY: 100, clientX: 25, clientY: 40 })
    })
    expect(floored.views.at(-1)!.zoom).toBeCloseTo(0.0446, 3)
    await act(async () => {
      wheelOn(floored.canvas, { deltaY: 100, clientX: 25, clientY: 40 })
    })
    let floorView = floored.views.at(-1)!
    expect(floorView.zoom).toBe(0.04)
    expect(floorView.panX).toBeCloseTo(-125, 10)
    expect(floorView.panY).toBeCloseTo(-200, 10)
    await act(async () => {
      wheelOn(floored.canvas, { deltaY: 100, clientX: 25, clientY: 40 })
    })
    floorView = floored.views.at(-1)!
    expect(floorView.zoom).toBe(0.04)
    expect(floorView.panX).toBeCloseTo(-125, 10)
    expect(floorView.panY).toBeCloseTo(-200, 10)
  })

  test('centerAnchor 预览模式：滚轮只改缩放，pan 偏移不动', async () => {
    const mounted = await mountZoom({ zoom: 2, panX: 7, panY: 9 }, true)
    await act(async () => {
      wheelOn(mounted.canvas, { deltaY: -100, clientX: 25, clientY: 40 })
    })
    let view = mounted.views.at(-1)!
    expect(view.zoom).toBeCloseTo(2.24, 10)
    expect(view.panX).toBe(7)
    expect(view.panY).toBe(9)
    await act(async () => {
      wheelOn(mounted.canvas, { deltaY: 100, clientX: 25, clientY: 40 })
    })
    view = mounted.views.at(-1)!
    expect(view.zoom).toBeCloseTo(2, 10)
    expect(view.panX).toBe(7)
    expect(view.panY).toBe(9)
  })

  test('useSceneAssets：live 编辑只换 map 引用不重读；catalog 换字节真实重载解出新帧', async () => {
    const legal = await loadLegalUiProject('kimi-k12-scene-stage')
    const gate = gatedFileSource(legal.source)
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(gate.source, () => session.getState())
    const tilesetPath = session.getState().assetCatalog.assets[TILESET_ASSET]!.path
    const statuses: SceneAssetsStatus[] = []
    await act(async () => {
      root.render(
        createElement(AssetsHarness, {
          session,
          reader,
          assetBase: legal.assetBase,
          onStatus: (status) => statuses.push(status),
        }),
      )
    })
    await vi.waitFor(() => {
      expect(statuses.at(-1)?.status).toBe('ready')
    })
    const first = statuses.at(-1)!.loaded!
    expect(first.map).toBe(session.getState().maps[MAP_ID])
    expect(first.tilesets.get('starter')?.get(0)?.height).toBe(15)
    expect(gate.calls).toEqual([tilesetPath])
    const loadingCount = () => statuses.filter((status) => status.status === 'loading').length
    const loadingAtReady = loadingCount()

    // live 地图编辑：只换 map 引用（无 loading 闪烁、无磁盘重读、tilesets 身份不变）。
    await act(async () => {
      session.dispatch(
        new ApplyProjectMapPatchCommand(
          MAP_ID,
          {
            visual: [{ channel: 'height', ref: { layerId: 'floor', row: 0, col: 0 }, value: 9 }],
            collision: [],
          },
          { hiddenLayerIds: [], lockedLayerIds: [], requiredWritableLayerIds: ['floor'] },
          '测试内编辑',
        ),
      )
    })
    const afterEdit = statuses.at(-1)!
    expect(afterEdit.status).toBe('ready')
    expect(afterEdit.loaded!.map).toBe(session.getState().maps[MAP_ID])
    expect(afterEdit.loaded!.map).not.toBe(first.map)
    expect(afterEdit.loaded!.tilesets).toBe(first.tilesets)
    expect(loadingCount()).toBe(loadingAtReady)
    expect(gate.calls).toEqual([tilesetPath])

    // catalog 换字节：真实量化 4 帧 32×16 → gzip → UpsertAssetCommand → 重载真实解出新帧。
    const palette = await loadStandardPalette(legal.assetBase)
    const colors = atlasColors(4)
    const expectedFrames = colors.map((color) =>
      quantizeToRleFrame(solidRgba(32, 16, color), 32, 16, palette),
    )
    const gz = await compressGzip(encodeSpriteChunk(expectedFrames))
    const bytes = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
    const sha256 = await sha256Hex(bytes)
    const originalRecord = session.getState().assetCatalog.assets[TILESET_ASSET]!
    const originalBytes = await legal.source.readBytes(originalRecord.path)
    const record: AssetRecordV1 = {
      ...originalRecord,
      path: `assets/authored/tilesets/${sha256}.rle`,
      bytes: bytes.byteLength,
      sha256,
    }
    await act(async () => {
      session.dispatch(new UpsertAssetCommand(TILESET_ASSET, record, bytes, originalBytes))
    })
    await vi.waitFor(() => {
      expect(statuses.at(-1)?.loaded?.tilesets.get('starter')?.get(0)?.height).toBe(16)
    })
    const reloaded = statuses.at(-1)!
    expect(reloaded.status).toBe('ready')
    // 重载从 pending blob 读新字节，不再碰磁盘闸门。
    expect(gate.calls).toEqual([tilesetPath])
    expect([...reloaded.loaded!.tilesets.get('starter')!.values()]).toEqual(expectedFrames)
    // live 地图副本在重载后仍然是会话里的那一份。
    expect(reloaded.loaded!.map).toBe(session.getState().maps[MAP_ID])
    expect(loadingCount()).toBeGreaterThan(loadingAtReady)
  })

  test('磁盘回退读取失败：error 状态带真实路径消息，不冒充 loading', async () => {
    const legal = await loadLegalUiProject('kimi-k12-scene-stage-error')
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    const statuses: SceneAssetsStatus[] = []
    await act(async () => {
      root.render(
        createElement(AssetsHarness, {
          session,
          reader,
          assetBase: legal.assetBase,
          mapId: 'lost',
          diskFallback: true,
          onStatus: (status) => statuses.push(status),
        }),
      )
    })
    await vi.waitFor(() => {
      expect(statuses.at(-1)?.status).toBe('error')
    })
    expect(statuses.at(-1)!.err).toContain('content/maps/lost.json')
    expect(statuses.at(-1)!.loaded).toBeNull()
  })
})
