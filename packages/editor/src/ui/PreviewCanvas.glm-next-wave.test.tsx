// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F02a：PreviewCanvas 资产失败态回显。
 * 去重：PreviewCanvas.test.tsx（工具栏/确认键盘/倍速）与 PreviewCanvas.glm-ui-wave.test.tsx
 * （play 委派、deep link、对话行）把 useSceneAssets 永远钉在 loading 且从未断言提示层；
 * 本文件只补当前公开合同仍未证明的失败态：loading/error 提示精确回显、失败态不进入
 * rAF 渲染循环、就绪 tag——不重证任何播放控件。
 */
import type { AssetCatalogV1, MapIndexV1, SceneDef, TilesetDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { Playback } from '../core/playback.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { PreviewCanvas } from './PreviewCanvas.js'

const sceneStage = vi.hoisted(() => ({
  status: 'loading' as 'loading' | 'error',
  err: '',
}))

vi.mock('./scene-stage.js', () => ({
  drawGridBlocked: vi.fn(),
  drawTriggerHighlight: vi.fn(),
  useSceneAssets: () => ({
    status: sceneStage.status,
    err: sceneStage.err,
    loadedRef: { current: null },
  }),
  useStageSize: () => ({ w: 320, h: 200 }),
  useViewZoomPan: () => ({
    view: { zoom: 2, panX: 0, panY: 0 },
    viewRef: { current: { zoom: 2, panX: 0, panY: 0 } },
    setView: vi.fn(),
  }),
}))

let scene: SceneDef
let assetBase: AssetBase
let projectId: string
let catalog: AssetCatalogV1
let mapIndex: MapIndexV1
let tilesets: readonly TilesetDef[]
let reader: EditorAssetReader

beforeAll(async () => {
  installBrowserHardwarePorts()
  const legal = await loadLegalUiProject('glm-next-wave-preview-failure')
  scene = structuredClone(legal.state.scenes![0]!)
  assetBase = legal.assetBase
  projectId = legal.state.manifest.id
  catalog = legal.state.assetCatalog
  mapIndex = legal.state.mapIndex
  tilesets = legal.state.tilesets ?? []
  reader = createEditorAssetReader(legal.source, () => legal.state)
})

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function renderAt(status: 'loading' | 'error', err = ''): Promise<Playback> {
  sceneStage.status = status
  sceneStage.err = err
  const playback = new Playback(scene)
  await act(async () => {
    root.render(
      <PreviewCanvas
        scene={scene}
        stages={[]}
        sourceKey="ui:failure-probe"
        playIdentity={{
          projectId,
          workspaceId: '11111111-1111-4111-8111-111111111111',
          source: 'http',
        }}
        focusEntityId={undefined}
        sprites={[]}
        actorsById={{}}
        leaderSpriteId={undefined}
        assetBase={assetBase}
        assetCatalog={catalog}
        assetReader={reader}
        projectMaps={{}}
        mapIndex={mapIndex}
        tilesets={tilesets}
        locale={{}}
        playback={playback}
      />,
    )
  })
  return playback
}

describe('F02 PreviewCanvas 资产失败态回显', () => {
  test('资产读取中显示加载提示且不进入 rAF 渲染循环', async () => {
    const raf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    const playback = await renderAt('loading')
    expect(host.querySelector('.preview-tip')?.textContent).toBe('加载资产…')
    expect(host.querySelector('.preview-tip.err')).toBeNull()
    expect(raf).not.toHaveBeenCalled()
    expect(host.textContent).toContain('就绪')
    expect(playback.mode).toBe('idle')
  })

  test('资产读取失败精确回显错误消息，同样不排帧', async () => {
    const raf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    await renderAt('error', '地图瓦片集读取失败：tileset.generated.starter')
    const tip = host.querySelector<HTMLDivElement>('.preview-tip.err')
    expect(tip?.textContent).toBe('地图瓦片集读取失败：tileset.generated.starter')
    expect(host.querySelector('.preview-tip.hint')).toBeNull()
    expect(raf).not.toHaveBeenCalled()
  })
})
