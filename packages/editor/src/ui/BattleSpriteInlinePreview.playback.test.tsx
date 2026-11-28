// @vitest-environment jsdom
/**
 * 紧凑战斗预览的像素、动作时钟与帧选择。
 */

import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  type MountedBattleInline,
  mountBattleInline,
  unmountBattleInline,
} from '../__tests__/battle-inline-test-host.js'
import {
  assertDistinctFrameColors,
  expectedBattleRgb,
} from '../__tests__/battle-sprite-pixel-oracle.js'
import {
  type BattleSpriteProject,
  DISTINCT_COLOR_PICKS,
  enemyProfile,
  loadBattleSpriteProject,
} from '../__tests__/battle-sprite-project.js'
import {
  colorCensus,
  isBlank,
  opaqueBounds,
  pixelAt,
  type Rgb,
  requireRealCanvas2d,
} from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import { gatedFileSource, stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import {
  advance,
  pollUntil,
  releaseIntervalClock,
  useIntervalClock,
} from '../__tests__/cursor-asset-r1/timing.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { BattleSpriteInlinePreview } from './BattleSpriteInlinePreview.js'

const ASSET = 'battle-sprite.authored.inline'
const DEF = 'inline-def'

let project: BattleSpriteProject
let mounted: MountedBattleInline | undefined

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  requireRealCanvas2d()
  useIntervalClock()
  project = await loadBattleSpriteProject('battle-inline-playback', [
    {
      asset: ASSET,
      label: '内联',
      frameCount: 4,
      colorPicks: [0, 1, 2, 3].map((i) => DISTINCT_COLOR_PICKS[i]!),
      definitions: [{ id: DEF, label: '内联', profile: enemyProfile(4, 0, 0) }],
    },
    {
      asset: 'battle-sprite.authored.inline-alt',
      label: '内联B',
      frameCount: 1,
      colorPicks: [DISTINCT_COLOR_PICKS[4]!],
      definitions: [{ id: 'inline-alt-def', label: '内联B', profile: enemyProfile(1, 0, 0) }],
    },
  ])
  assertDistinctFrameColors(project, ASSET, [0, 1, 2, 3])
})

afterEach(async () => {
  if (mounted) {
    await unmountBattleInline(mounted)
    mounted = undefined
  }
  releaseIntervalClock()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function waitDrawn(m: MountedBattleInline): Promise<void> {
  await pollUntil(() => !isBlank(m.primaryCanvas()), '内联主画布绘制')
}

function samplePrimary(m: MountedBattleInline): Rgb {
  const canvas = m.primaryCanvas()
  const box = opaqueBounds(canvas)
  if (!box) throw new Error('主画布无 opaque 像素')
  const x = Math.floor((box.minX + box.maxX) / 2)
  const y = Math.floor((box.minY + box.maxY) / 2)
  const [r, g, b] = pixelAt(canvas, x, y)
  return [r, g, b] as const
}

function definition() {
  return project.state.battleSprites.find((entry) => entry.id === DEF)!
}

async function mountExtra(input: Parameters<typeof mountBattleInline>[1] = {}) {
  mounted = await mountBattleInline(project, { definition: definition(), ...input })
  return mounted
}

test('多帧轮转：40ms 后切换到第 1 帧色', async () => {
  const m = await mountExtra({ playAllFrames: true, frameMs: 40 })
  await waitDrawn(m)
  expect([...samplePrimary(m)]).toEqual(expectedBattleRgb(project, ASSET, 0))
  await advance(40)
  expect([...samplePrimary(m)]).toEqual(expectedBattleRgb(project, ASSET, 1))
})

test('资源闸门：加载期间主画布空白，放行后绘制', async () => {
  const path = project.seeded.get(ASSET)!.path
  const gated = gatedFileSource(project.source)
  const hold = gated.gate(path)
  mounted = await mountExtra({ source: gated.source })
  expect(isBlank(mounted.primaryCanvas())).toBe(true)
  hold.resolve()
  await waitDrawn(mounted)
})

test('读取失败：错误可见且画布保持空白', async () => {
  const path = project.seeded.get(ASSET)!.path
  const failing: BattleSpriteProject['source'] = {
    readText: (rel, signal) => project.source.readText(rel, signal),
    readJson: (rel, signal) => project.source.readJson(rel, signal),
    urlFor: (rel) => project.source.urlFor(rel),
    readBytes: (rel, signal) =>
      rel === path
        ? Promise.reject(new Error('内联资源读取失败'))
        : project.source.readBytes(rel, signal),
    dispose: () => project.source.dispose?.(),
  }
  mounted = await mountExtra({ source: failing })
  await pollUntil(
    () => mounted!.host.textContent?.includes('内联资源读取失败') === true,
    '失败文案',
  )
  expect(isBlank(mounted.primaryCanvas())).toBe(true)
})

test('缩略图 canvas 逐帧着色且互异', async () => {
  const m = await mountExtra({ playAllFrames: true })
  await waitDrawn(m)
  await pollUntil(() => m.thumbCanvases().length === 4, '四帧缩略图')
  const colors = m.thumbCanvases().map((canvas) => {
    expect(isBlank(canvas)).toBe(false)
    const box = opaqueBounds(canvas)!
    const x = Math.floor((box.minX + box.maxX) / 2)
    const y = Math.floor((box.minY + box.maxY) / 2)
    return pixelAt(canvas, x, y).slice(0, 3)
  })
  expect(new Set(colors.map((c) => c.join())).size).toBe(4)
  expect([...colors[0]!]).toEqual(expectedBattleRgb(project, ASSET, 0))
})

test('换定义 asset：清除旧像素且呈现新色', async () => {
  const altAsset = 'battle-sprite.authored.inline-alt'
  mounted = await mountExtra({ playAllFrames: true })
  await waitDrawn(mounted)
  expect([...samplePrimary(mounted)]).toEqual(expectedBattleRgb(project, ASSET, 0))
  const altDef = project.state.battleSprites.find((entry) => entry.id === 'inline-alt-def')!
  const path = project.seeded.get(altAsset)!.path
  const gated = gatedFileSource(project.source)
  const hold = gated.gate(path)
  try {
    await act(async () => {
      mounted!.root.render(
        <BattleSpriteInlinePreview
          definition={altDef}
          assetBase={project.assetBase}
          assetReader={createEditorAssetReader(gated.source, () => project.state)}
          playAllFrames
        />,
      )
    })
    expect(gated.calls).toContain(path)
    expect(gated.completed).not.toContain(path)
    expect(isBlank(mounted.primaryCanvas())).toBe(true)
  } finally {
    hold.resolve()
  }
  await waitDrawn(mounted)
  expect([...samplePrimary(mounted)]).toEqual(expectedBattleRgb(project, altAsset, 0))
  expect(colorCensus(mounted.primaryCanvas()).opaque.size).toBe(1)
})

test('interval 清理：卸载后定时器归零', async () => {
  const m = await mountExtra({ playAllFrames: true, frameMs: 40 })
  await waitDrawn(m)
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  await unmountBattleInline(m)
  mounted = undefined
  expect(vi.getTimerCount()).toBe(0)
})

test('仅 asset 预览：无 definition 时仍绘制第 0 帧', async () => {
  mounted = await mountBattleInline(project, { asset: ASSET })
  await waitDrawn(mounted)
  expect([...samplePrimary(mounted)]).toEqual(expectedBattleRgb(project, ASSET, 0))
})
