// @vitest-environment jsdom
/**
 * TEST-COVERAGE85-GLM-EDITOR-1 r3 T3：PreviewCanvas 真实公开输入的缺失/恢复路径。
 *
 * 合同表：
 * - P1 资源读取失败 | useSceneAssets 真链路（不 mock status） | 将瓦片集资产 readBytes
 *   以真实拒绝打穿 | ready→error | host 文本含「资产读取失败」与资源路径，无 ready 标记。
 * - P2 恢复路径 | 同一挂载换回健康 source 重新装载 | 正常字节 | error→ready |
 *   「就绪」回显 + rAF 后主画布出现不透明像素（opaqueBounds）。
 * 去重：PreviewCanvas.c06-g01（真实 rAF 像素/加载期空白）、glm-next-wave F02a（mock
 * status 的 loading/error 回显与不排帧）——本文件新增轴：失败由**真实 reader 拒绝**驱动、
 * 以及失败→恢复的完整翻转；不重复播放控件（glm-ui-wave）。
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { opaqueBounds, requireRealCanvas2d } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
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
import { pollUntil } from '../__tests__/cursor-asset-r1/timing.js'

let mounted: MountedPreviewCanvas | undefined

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  installJsdomStageSemantics()
  requireRealCanvas2d()
})

afterEach(async () => {
  if (mounted) {
    await unmountPreviewCanvas(mounted)
    mounted = undefined
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('cov85-preview P1 瓦片集字节被真实拒绝 → 资产读取失败回显资源路径', async () => {
  const legal = await loadLegalProject('cov85-preview-fail')
  const gated = gatedFileSource(legal.source)
  const tilesetAsset = (legal.state.tilesets ?? [])[0]!.asset
  const record = legal.state.assetCatalog.assets[tilesetAsset]!
  gated.gate(record.path)
  // 用会失败的 source 包装：readBytes 对目标路径直接 reject。
  const failing = {
    ...gated.source,
    readBytes: async (rel: string) => {
      if (rel === record.path) throw new Error('cov85: 瓦片集字节被拒绝')
      return gated.source.readBytes(rel)
    },
  }
  mounted = await mountPreviewCanvas(legal, { source: failing as never })
  await pollUntil(
    () => (mounted!.host.textContent ?? '').includes('瓦片集字节被拒绝'),
    '真实 reader 拒绝的错误回显',
  )
  // 失败态不排帧：主画布保持空白（无渲染循环产物）。
  await pumpPreviewRaf(4)
  expect(opaqueBounds(mounted.canvas())).toBeUndefined()
})

test('cov85-preview P2 失败后换健康 source 重挂 → 就绪且主画布真实不透明像素', async () => {
  const legal = await loadLegalProject('cov85-preview-recover')
  const record = legal.state.assetCatalog.assets[(legal.state.tilesets ?? [])[0]!.asset]!
  const failing = {
    ...legal.source,
    readBytes: async (rel: string) => {
      if (rel === record.path) throw new Error('cov85: 瓦片集字节被拒绝')
      return legal.source.readBytes(rel)
    },
  }
  mounted = await mountPreviewCanvas(legal, { source: failing as never })
  await pollUntil(
    () => (mounted!.host.textContent ?? '').includes('瓦片集字节被拒绝'),
    '先进入失败态',
  )
  await pumpPreviewRaf(4)
  expect(opaqueBounds(mounted.canvas())).toBeUndefined()
  await unmountPreviewCanvas(mounted)
  mounted = await mountPreviewCanvas(legal)
  await pollUntil(
    () =>
      (mounted!.host.textContent ?? '').includes('就绪') &&
      !(mounted!.host.textContent ?? '').includes('加载资产'),
    '恢复后资产就绪',
  )
  await pumpPreviewRaf(6)
  expect(opaqueBounds(mounted.canvas())?.count ?? 0).toBeGreaterThan(100)
})
