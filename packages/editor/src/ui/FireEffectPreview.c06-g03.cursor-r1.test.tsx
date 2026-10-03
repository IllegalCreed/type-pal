// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C06-G03：FireEffectPreview 真实像素 / 清理 / 播放归属。
 * 排重：preview-cache-boundaries 使用 mock 2d 上下文；本文件只走 node-canvas 真像素。
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  type C06FireFixture,
  expectedFireRgb,
  loadC06FireFixture,
} from '../__tests__/cursor-asset-r1/c06-fire-fixtures.js'
import {
  colorCensus,
  isBlank,
  opaqueBounds,
  pixelAt,
  requireRealCanvas2d,
} from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import { stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import {
  advance,
  pollUntil,
  releaseIntervalClock,
  useIntervalClock,
} from '../__tests__/cursor-asset-r1/timing.js'
import { FireEffectPreview } from './FireEffectPreview.js'

let root: Root
let host: HTMLDivElement
let fixture: C06FireFixture

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  requireRealCanvas2d()
  useIntervalClock()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  fixture = await loadC06FireFixture({
    projectId: 'c06-fire',
    chunk: 9,
    framePixels: [0, 1, 2],
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  releaseIntervalClock()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mountFire(anim: { effectSprite: number; speed?: number; fireDelay?: number }) {
  await act(async () => {
    root.render(
      <FireEffectPreview assetBase={fixture.base} assetReader={fixture.reader} anim={anim} />,
    )
    await Promise.resolve()
  })
}

function canvas(): HTMLCanvasElement {
  const hit = host.querySelector('canvas')
  if (!hit) throw new Error('FIRE 画布未挂载')
  return hit
}

async function waitLoaded(): Promise<void> {
  await pollUntil(() => host.querySelector('canvas') !== null, 'FIRE 帧解码完成')
}

test('C06-G03-01 首帧：画布中心附近出现与 palette 对齐的不透明像素', async () => {
  await mountFire({ effectSprite: fixture.chunk })
  await waitLoaded()
  expect(isBlank(canvas())).toBe(false)
  const rgb = pixelAt(canvas(), 100, 85).slice(0, 3)
  expect([...rgb]).toEqual(expectedFireRgb(fixture, 0))
})

test('C06-G03-02 播放前进：步进后像素色切换到下一帧', async () => {
  await mountFire({ effectSprite: fixture.chunk, speed: 0, fireDelay: 0 })
  await waitLoaded()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('button[aria-label="播放 FIRE 特效预览"]')!.click()
  })
  const first = pixelAt(canvas(), 100, 85).slice(0, 3)
  await advance(((0 + 5) * 10) / 0.5)
  const second = pixelAt(canvas(), 100, 85).slice(0, 3)
  expect([...first]).toEqual(expectedFireRgb(fixture, 0))
  expect([...second]).toEqual(expectedFireRgb(fixture, 1))
})

test('C06-G03-03 暂停后像素冻结且 interval 清理', async () => {
  await mountFire({ effectSprite: fixture.chunk })
  await waitLoaded()
  const play = host.querySelector<HTMLButtonElement>('button[aria-label="播放 FIRE 特效预览"]')!
  await act(async () => play.click())
  await advance(50)
  const frozen = pixelAt(canvas(), 100, 85).slice(0, 3)
  await act(async () => play.click())
  await advance(200)
  expect(pixelAt(canvas(), 100, 85).slice(0, 3)).toEqual(frozen)
  expect(vi.getTimerCount()).toBe(0)
})

test('C06-G03-04 换 effectSprite：重载后只呈现新 chunk 的单色帧', async () => {
  await mountFire({ effectSprite: fixture.chunk })
  await waitLoaded()
  fixture = await loadC06FireFixture({
    projectId: 'c06-fire-b',
    chunk: 10,
    framePixels: [3],
  })
  await mountFire({ effectSprite: 10 })
  await waitLoaded()
  expect([...pixelAt(canvas(), 100, 85).slice(0, 3)]).toEqual(expectedFireRgb(fixture, 0))
  expect(colorCensus(canvas()).opaque.size).toBe(1)
})

test('C06-G03-05 fireDelay 循环：序列末回到 delay 帧色', async () => {
  await mountFire({ effectSprite: fixture.chunk, speed: 0, fireDelay: 1 })
  await waitLoaded()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('button[aria-label="播放 FIRE 特效预览"]')!.click()
  })
  await advance(((0 + 5) * 10) / 0.5)
  expect(pixelAt(canvas(), 100, 85).slice(0, 3)).toEqual(expectedFireRgb(fixture, 1))
  await advance(((0 + 5) * 10) / 0.5)
  expect(pixelAt(canvas(), 100, 85).slice(0, 3)).toEqual(expectedFireRgb(fixture, 2))
  await advance(((0 + 5) * 10) / 0.5)
  expect(pixelAt(canvas(), 100, 85).slice(0, 3)).toEqual(expectedFireRgb(fixture, 1))
})

test('C06-G03-06 加载态无 canvas；失败 chunk 显示无法加载且无不透明像素', async () => {
  await mountFire({ effectSprite: 9999 })
  await pollUntil(() => host.textContent?.includes('无法加载') === true, '无效 chunk 失败')
  expect(host.querySelector('canvas')).toBeNull()
})

test('C06-G03-07 非播放 idle 仍绘制首帧（画布非空白）', async () => {
  await mountFire({ effectSprite: fixture.chunk })
  await waitLoaded()
  expect(opaqueBounds(canvas())?.count ?? 0).toBeGreaterThan(200)
})

test('C06-G03-08 改 speed 参数重启：步进间隔随 anim.speed 变化', async () => {
  await mountFire({ effectSprite: fixture.chunk, speed: 5, fireDelay: 0 })
  await waitLoaded()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('button[aria-label="播放 FIRE 特效预览"]')!.click()
  })
  await advance(((5 + 5) * 10) / 0.5 - 1)
  expect(pixelAt(canvas(), 100, 85).slice(0, 3)).toEqual(expectedFireRgb(fixture, 0))
  await advance(2)
  expect(pixelAt(canvas(), 100, 85).slice(0, 3)).toEqual(expectedFireRgb(fixture, 1))
})

test('C06-G03-09 卸载后 interval 归零', async () => {
  await mountFire({ effectSprite: fixture.chunk })
  await waitLoaded()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('button[aria-label="播放 FIRE 特效预览"]')!.click()
  })
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  await act(async () => root.unmount())
  expect(vi.getTimerCount()).toBe(0)
})

test('C06-G03-10 帧 caption 显示真实帧数', async () => {
  await mountFire({ effectSprite: fixture.chunk })
  await waitLoaded()
  expect(host.textContent).toContain('3 帧')
})

test('C06-G03-11 clearRect 清理：换帧后 census 仍单一 opaque 色', async () => {
  await mountFire({ effectSprite: fixture.chunk })
  await waitLoaded()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('button[aria-label="播放 FIRE 特效预览"]')!.click()
  })
  await advance(100)
  expect(colorCensus(canvas()).translucent).toBe(0)
  expect(colorCensus(canvas()).opaque.size).toBe(1)
})
