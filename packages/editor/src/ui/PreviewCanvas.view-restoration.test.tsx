// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { requireRealCanvas2d } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import { loadLegalProject, stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import {
  type MountedPreviewCanvas,
  mountPreviewCanvas,
  pumpPreviewRaf,
  unmountPreviewCanvas,
} from '../__tests__/cursor-asset-r1/preview-canvas-harness.js'
import { installJsdomStageSemantics } from '../__tests__/cursor-asset-r1/stage-ports.js'
import { pollUntil } from '../__tests__/cursor-asset-r1/timing.js'

let mounted: MountedPreviewCanvas | undefined
afterEach(async () => {
  if (mounted) await unmountPreviewCanvas(mounted)
  mounted = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('an immediate playback completion restores the pre-play pan and zoom even when React batches running away', async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  installJsdomStageSemantics()
  requireRealCanvas2d()
  const legal = await loadLegalProject('preview-view-restoration')
  mounted = await mountPreviewCanvas(legal, {
    stages: [{ body: [{ kind: 'teleportParty', pos: { col: 10, row: 10, height: 0 } }] }],
  })
  const m = mounted
  await pollUntil(() => !m.host.textContent?.includes('加载资产'), 'source ready')
  const canvas = m.canvas()
  await act(async () => {
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }))
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, clientX: 80, clientY: 80, bubbles: true }),
    )
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 140, clientY: 120, bubbles: true }),
    )
    canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }))
  })
  await pumpPreviewRaf(3)
  const before = canvas.toDataURL()
  const zoom = m.host.querySelector('[aria-label="回正视图"]')?.textContent
  expect(zoom).toContain('112%')
  await act(async () => {
    m.host.querySelector<HTMLButtonElement>('button[aria-label="播放"]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(m.sessionPlayback.mode).toBe('done')
  await pumpPreviewRaf(3)
  expect(m.host.querySelector('[aria-label="回正视图"]')?.textContent).toBe(zoom)
  expect(canvas.toDataURL()).toBe(before)
})

test('a failed target load reports interruption beside its error and leaves the original canvas available', async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  installJsdomStageSemantics()
  requireRealCanvas2d()
  const legal = await loadLegalProject('preview-scene-failure')
  mounted = await mountPreviewCanvas(legal)
  const m = mounted
  await pollUntil(() => !m.host.textContent?.includes('加载资产'), 'source ready')
  const source = { id: m.scene.id, mapId: m.scene.mapId, entry: m.scene.entry, entities: [] }
  const target = { ...source, id: 'target', mapId: 'unavailable-map' }
  await act(async () => {
    m.sessionPlayback.playCanonical(
      'failure',
      {
        kind: 'stages',
        initial: 'start',
        stages: [{ id: 'start', body: [{ kind: 'loadScene', scene: 'target' }] }],
      },
      { scene: source, scenes: [source, target], sharedScripts: {}, actorsById: {} },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(m.host.querySelector('[role="alert"]')?.textContent).toContain('unavailable-map')
  expect(m.host.textContent).toContain('预览中断')
  expect(m.host.textContent).not.toContain('播放完毕')
  expect(m.canvas().getAttribute('aria-label')).toBe(`场景预览：${source.id}`)
  expect(m.host.querySelector<HTMLButtonElement>('button[aria-label="播放"]')?.disabled).toBe(false)
})
