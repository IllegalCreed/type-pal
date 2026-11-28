// @vitest-environment jsdom

import type { SkillAnimation } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { opaqueBounds, pixelAt } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { createFireEffectFixture } from '../__tests__/fire-effect-fixture.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { FireEffectPreview } from './FireEffectPreview.js'

type Fixture = Awaited<ReturnType<typeof createFireEffectFixture>>
const RED = [240, 40, 40, 255]
const GREEN = [40, 200, 60, 255]
const BLUE = [40, 80, 220, 255]

let root: Root
let host: HTMLDivElement
let restoreAct: () => void
let fixture: Fixture

beforeEach(async () => {
  installBrowserHardwarePorts()
  restoreAct = installReactActEnvironment()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  fixture = await createFireEffectFixture({
    projectId: 'fire-frame-playback',
    chunk: 9,
    frames: [{ paletteIndex: 0 }, { paletteIndex: 1, size: 8 }, { paletteIndex: 2 }],
  })
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    restoreAct()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})

async function render(anim: SkillAnimation = { effectSprite: fixture.chunk }): Promise<void> {
  await act(async () =>
    root.render(
      <FireEffectPreview assetBase={fixture.base} assetReader={fixture.reader} anim={anim} />,
    ),
  )
}

function canvas(): HTMLCanvasElement {
  const preview = host.querySelector('canvas')
  if (!preview) throw new Error('Fire preview canvas is unavailable')
  return preview
}

async function clickPlayback(mode: '播放' | '暂停'): Promise<void> {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${mode} FIRE 特效预览"]`)
  if (!button) throw new Error(`Missing FIRE playback button: ${mode}`)
  await act(async () => button.click())
}

async function ready(anim?: SkillAnimation): Promise<void> {
  await render(anim)
  await waitForReact(() => expect(host.querySelector('canvas')).not.toBeNull())
}

async function advance(ms: number): Promise<void> {
  await act(async () => vi.advanceTimersByTimeAsync(ms))
}

const center = () => pixelAt(canvas(), 100, 85)

test('the idle preview draws the centered first frame in the project palette', async () => {
  await ready()

  expect(center()).toEqual(RED)
  expect(opaqueBounds(canvas())).toMatchObject({ count: 48 * 48 })
  expect(host.querySelector('figcaption')?.textContent).toContain('3 帧 · 实速 50ms/帧')
  expect(vi.getTimerCount()).toBe(0)
})

test('the clock advances the first pass and loops from the configured start', async () => {
  await ready({ effectSprite: fixture.chunk, fireDelay: 1 })
  await clickPlayback('播放')

  expect(center()).toEqual(RED)
  await advance(99)
  expect(center()).toEqual(RED)
  await advance(1)
  expect(center()).toEqual(GREEN)
  await advance(100)
  expect(center()).toEqual(BLUE)
  await advance(100)
  expect(center()).toEqual(GREEN)
})

test('a smaller animation frame clears the uncovered pixels of the previous frame', async () => {
  await ready()
  await clickPlayback('播放')
  expect(pixelAt(canvas(), 80, 65)).toEqual(RED)

  await advance(100)

  expect(center()).toEqual(GREEN)
  expect(pixelAt(canvas(), 80, 65)).toEqual([0, 0, 0, 0])
  expect(opaqueBounds(canvas())).toMatchObject({ count: 24 * 24 })
})

test('pause restores the first image and ends the running clock', async () => {
  await ready()
  await clickPlayback('播放')
  await advance(100)
  expect(center()).toEqual(GREEN)

  await clickPlayback('暂停')
  await advance(300)

  expect(center()).toEqual(RED)
  expect(vi.getTimerCount()).toBe(0)
})

test('changing authored speed and playback rate restarts the same frame sequence', async () => {
  await ready({ effectSprite: fixture.chunk, speed: 1 })
  expect(host.querySelector('figcaption')?.textContent).toContain('实速 60ms/帧')
  await clickPlayback('播放')
  await advance(120)
  expect(center()).toEqual(GREEN)

  await render({ effectSprite: fixture.chunk, speed: 5 })
  expect(center()).toEqual(RED)
  await advance(199)
  expect(center()).toEqual(RED)
  await advance(1)
  expect(center()).toEqual(GREEN)

  const rate = host.querySelector<HTMLButtonElement>('button[aria-label="FIRE 特效预览倍速"]')
  if (!rate) throw new Error('FIRE rate selector is unavailable')
  await act(async () => rate.click())
  const quarter = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (option) => option.textContent === '0.25×',
  )
  if (!quarter) throw new Error('Quarter-speed option is unavailable')
  await act(async () => quarter.click())
  expect(center()).toEqual(RED)
  await advance(399)
  expect(center()).toEqual(RED)
  await advance(1)
  expect(center()).toEqual(GREEN)
})

test('leaving a silent preview stops its frame clock', async () => {
  await ready()
  await clickPlayback('播放')
  expect(vi.getTimerCount()).toBe(1)

  await act(async () => root.render(null))

  expect(vi.getTimerCount()).toBe(0)
})
