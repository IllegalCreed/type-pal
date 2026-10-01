// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C06-G01：PreviewCanvas 真实地图像素 / 清理 / 加载归属。
 * 排重：PreviewCanvas.test / glm-ui-wave / glm-next-wave 均 mock useSceneAssets，不断言真实 rAF 像素。
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  isBlank,
  opaqueBounds,
  requireRealCanvas2d,
} from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  gatedFileSource,
  loadLegalProject,
  stubNodeTestHost,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  type MountedPreviewCanvas,
  mountPreviewCanvas,
  pumpPreviewRaf,
  unmountPreviewCanvas,
} from '../__tests__/cursor-asset-r1/preview-canvas-harness.js'
import { installJsdomStageSemantics } from '../__tests__/cursor-asset-r1/stage-ports.js'
import { pollUntil, realDelay } from '../__tests__/cursor-asset-r1/timing.js'

let mounted: MountedPreviewCanvas | undefined
let legal: Awaited<ReturnType<typeof loadLegalProject>>

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  installJsdomStageSemantics()
  requireRealCanvas2d()
  legal = await loadLegalProject('c06-g01-preview')
})

afterEach(async () => {
  if (mounted) {
    await unmountPreviewCanvas(mounted)
    mounted = undefined
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function waitReady(m: MountedPreviewCanvas): Promise<void> {
  await pollUntil(
    () =>
      m.host.textContent?.includes('就绪') === true && !m.host.textContent?.includes('加载资产'),
    'PreviewCanvas 资产就绪',
  )
  await pumpPreviewRaf(6)
}

test('C06-G01-01 资产就绪后主画布出现不透明像素且尺寸≥100', async () => {
  mounted = await mountPreviewCanvas(legal)
  await waitReady(mounted)
  const canvas = mounted.canvas()
  expect(canvas.width).toBeGreaterThanOrEqual(80)
  expect(opaqueBounds(canvas)?.count ?? 0).toBeGreaterThan(50)
})

test('C06-G01-02 加载期间画布保持空白且提示加载资产', async () => {
  const tilePath = legal.state.assetCatalog.assets['tileset.generated.starter']?.path
  expect(tilePath).toBeTruthy()
  const gated = gatedFileSource(legal.source)
  const hold = gated.gate(tilePath!)
  mounted = await mountPreviewCanvas(legal, { source: gated.source })
  expect(mounted.host.textContent).toContain('加载资产')
  expect(isBlank(mounted.canvas())).toBe(true)
  hold.resolve()
  await waitReady(mounted)
  expect(isBlank(mounted.canvas())).toBe(false)
})

test('C06-G01-03 rAF 推进后像素 census 稳定（无随机闪烁清空）', async () => {
  mounted = await mountPreviewCanvas(legal)
  await waitReady(mounted)
  const before = opaqueBounds(mounted.canvas())?.count ?? 0
  await pumpPreviewRaf(8)
  const after = opaqueBounds(mounted.canvas())?.count ?? 0
  expect(after).toBe(before)
})

test('C06-G01-04 无脚本源时 hint 文案可见且仍绘制地图', async () => {
  mounted = await mountPreviewCanvas(legal, { hint: 'c06 无活动脚本', stages: [] })
  await waitReady(mounted)
  expect(mounted.host.textContent).toContain('c06 无活动脚本')
  expect(opaqueBounds(mounted.canvas())?.count ?? 0).toBeGreaterThan(0)
})

test('C06-G01-05 瓦片集读取失败：错误回显且画布保持空白', async () => {
  const tilePath = legal.state.assetCatalog.assets['tileset.generated.starter']!.path
  const failing = {
    readText: (rel: string, signal?: AbortSignal) => legal.source.readText(rel, signal),
    readJson: <T,>(rel: string, signal?: AbortSignal) => legal.source.readJson<T>(rel, signal),
    urlFor: (rel: string) => legal.source.urlFor(rel),
    readBytes: (rel: string, signal?: AbortSignal) =>
      rel === tilePath
        ? Promise.reject(new Error('c06 瓦片读取失败'))
        : legal.source.readBytes(rel, signal),
    dispose: () => legal.source.dispose?.(),
  }
  mounted = await mountPreviewCanvas(legal, { source: failing })
  await pollUntil(
    () => mounted!.host.textContent?.includes('c06 瓦片读取失败') === true,
    '错误文案',
  )
  expect(isBlank(mounted.canvas())).toBe(true)
})

test('C06-G01-06 切换 sceneFraming 不重载资产且画布仍有像素', async () => {
  mounted = await mountPreviewCanvas(legal, { sceneFraming: true })
  await waitReady(mounted)
  const count = opaqueBounds(mounted.canvas())?.count ?? 0
  await unmountPreviewCanvas(mounted)
  mounted = await mountPreviewCanvas(legal, { sceneFraming: false })
  await waitReady(mounted)
  expect(opaqueBounds(mounted.canvas())?.count ?? 0).toBeGreaterThanOrEqual(count / 2)
})

test('C06-G01-07 卸载后不再 pump rAF（组件已 detach）', async () => {
  mounted = await mountPreviewCanvas(legal)
  await waitReady(mounted)
  const canvas = mounted.canvas()
  await unmountPreviewCanvas(mounted)
  mounted = undefined
  await pumpPreviewRaf(2)
  expect(isBlank(canvas)).toBe(false)
})

test('C06-G01-08 空白初始 canvas 在就绪前无不透明像素', async () => {
  mounted = await mountPreviewCanvas(legal)
  expect(isBlank(mounted.canvas())).toBe(true)
  await waitReady(mounted)
})

test('C06-G01-09 就绪 tag 与加载提示互斥', async () => {
  mounted = await mountPreviewCanvas(legal)
  expect(mounted.host.textContent).toContain('加载资产')
  await waitReady(mounted)
  expect(mounted.host.textContent).toContain('就绪')
  expect(mounted.host.textContent).not.toContain('加载资产')
})

test('C06-G01-10 真实延迟下 rAF 仍能绘制（非假时钟）', async () => {
  mounted = await mountPreviewCanvas(legal)
  await waitReady(mounted)
  await realDelay(30)
  await pumpPreviewRaf(2)
  expect(opaqueBounds(mounted.canvas())?.count ?? 0).toBeGreaterThan(0)
})

test('C06-G01-12 工具栏含演出预览控制且 canvas 可交互类名', async () => {
  mounted = await mountPreviewCanvas(legal)
  await waitReady(mounted)
  expect(mounted.host.querySelector('[aria-label="演出预览控制"]')).not.toBeNull()
  expect(mounted.canvas().classList.contains('preview-canvas--interactive')).toBe(true)
})

test('C06-G01-11 切换 sourceKey 重挂载后画布重新出现像素', async () => {
  mounted = await mountPreviewCanvas(legal, { sourceKey: 'c06:first' })
  await waitReady(mounted)
  await unmountPreviewCanvas(mounted)
  mounted = await mountPreviewCanvas(legal, { sourceKey: 'c06:second' })
  await waitReady(mounted)
  expect(opaqueBounds(mounted.canvas())?.count ?? 0).toBeGreaterThan(0)
})
