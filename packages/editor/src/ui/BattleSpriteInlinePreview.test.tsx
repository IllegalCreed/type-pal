// @vitest-environment jsdom

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
  loadBattleSpriteProject,
  playerProfile,
} from '../__tests__/battle-sprite-project.js'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { opaqueBounds, pixelAt } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { deferred } from '../__tests__/test-promises.js'
import { battleSpriteSemanticGroup } from './battle-sprite-action-preview.js'

const asset = 'battle-sprite.authored.long-fighter'
const id = 'long-fighter'
const frameWidth = 57
const frameHeight = 66
let project: BattleSpriteProject
let view: MountedBattleInline | undefined
let restoreAct: () => void

beforeEach(async () => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  project = await loadBattleSpriteProject('battle-inline-layouts', [
    {
      asset,
      label: '剑客',
      frameCount: 11,
      frameSizes: Array.from({ length: 11 }, () => [frameWidth, frameHeight]),
      colorPicks: [4, 0, 0, 0, 0, 0, 0, 1, 2, 3, 9],
      definitions: [{ id, label: '剑客', profile: playerProfile({ steal: 10 }) }],
    },
  ])
  assertDistinctFrameColors(project, asset, [0, 7, 8, 9, 10])
})

afterEach(async () => {
  try {
    if (view) await unmountBattleInline(view)
  } finally {
    view = undefined
    restoreAct()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

function definition() {
  const found = project.state.battleSprites.find((entry) => entry.id === id)
  if (!found) throw new Error('Fighter definition is missing from the loaded project')
  return found
}

function center(canvas: HTMLCanvasElement): readonly number[] {
  const bounds = opaqueBounds(canvas)
  if (!bounds) throw new Error('Loaded fighter is missing from the canvas')
  return pixelAt(
    canvas,
    Math.floor((bounds.minX + bounds.maxX) / 2),
    Math.floor((bounds.minY + bounds.maxY) / 2),
  )
}

function expectFrame(canvas: HTMLCanvasElement, frame: number): void {
  expect(center(canvas)).toEqual([...expectedBattleRgb(project, asset, frame), 255])
}

test('资源库布局完整平铺帧，并保持主画布和缩略画布比例', async () => {
  const selectedFrames: number[] = []
  view = await mountBattleInline(project, {
    asset,
    label: definition().label,
    layout: 'library',
    semanticGroups: [battleSpriteSemanticGroup(definition(), 11, true)],
    onRawFrameDragStart: () => undefined,
    onFrameSelect: (frame) => selectedFrames.push(frame),
  })
  const { host } = view
  await waitForReact(() =>
    expect(host.querySelector('.battle-sprite-resource-workbench')).not.toBeNull(),
  )
  const main = host.querySelector<HTMLCanvasElement>('canvas[aria-label="剑客 第 0 帧"]')
  if (!main) throw new Error('Library source image is missing')
  expect([main.width, main.height]).toEqual([220, 220])
  expectFrame(main, 0)

  const thumbnails = [
    ...host.querySelectorAll<HTMLButtonElement>(
      '.sprite-resource-frame-grid button[aria-label^="选择源帧 "]',
    ),
  ]
  expect(thumbnails).toHaveLength(11)
  for (const button of thumbnails) expect(button.draggable).toBe(true)
  expect(host.querySelector('.semantic-frame-shelf')?.textContent).toContain('普通攻击')
  for (const canvas of [
    main,
    ...host.querySelectorAll<HTMLCanvasElement>('.sprite-resource-frame-grid canvas'),
  ]) {
    const bounds = opaqueBounds(canvas)
    if (!bounds) throw new Error('One frame did not paint')
    const width = bounds.maxX - bounds.minX + 1
    const height = bounds.maxY - bounds.minY + 1
    // Nearest-neighbor rasterization can round each edge by a pixel.
    expect(Math.abs(width - (height * frameWidth) / frameHeight)).toBeLessThanOrEqual(2)
  }

  const lastButton = thumbnails[10]
  if (!lastButton) throw new Error('The last source frame is missing')
  await act(async () => lastButton.click())
  const selected = host.querySelector<HTMLCanvasElement>('canvas[aria-label="剑客 第 10 帧"]')
  if (!selected) throw new Error('Selection did not update the source image')
  expectFrame(selected, 10)
  expect(lastButton.getAttribute('aria-pressed')).toBe('true')
  expect(selectedFrames).toEqual([10])
})

test('角色页紧凑预览呈现完整动作分组，并持续循环动态首格', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  let elapsed = 0
  vi.spyOn(window.performance, 'now').mockImplementation(() => elapsed)
  const fighter = definition()
  const ready = deferred<void>()
  view = await mountBattleInline(project, {
    definition: fighter,
    expected: 'player-fighter',
    showPrimaryPreview: false,
    semanticPresentation: 'embedded',
    semanticGroups: [battleSpriteSemanticGroup(fighter, 0, true)],
    onLoaded: (proof) => {
      if (proof) ready.resolve()
    },
  })
  const { host } = view
  const attack = () =>
    [...host.querySelectorAll('.semantic-frame-row')].find(
      (row) => row.querySelector('.semantic-frame-row-label b')?.textContent === '普通攻击',
    )
  await act(async () => ready.promise)
  const dynamic = attack()?.querySelector<HTMLCanvasElement>('.animated canvas')
  if (!dynamic) throw new Error('Compact attack row is missing its animated frame')
  expect(host.querySelector('.battle-sprite-preview > canvas')).toBeNull()
  expect(host.querySelector('.semantic-frame-shelf--embedded > header')).toBeNull()
  expect(host.querySelector('.semantic-frame-group-head')).toBeNull()
  expect(attack()?.querySelectorAll('.sprite-frame-cell:not(.animated)')).toHaveLength(4)
  expectFrame(dynamic, 7)
  for (const [time, frame] of [
    [140, 8],
    [280, 9],
    [420, 0],
    [560, 7],
  ] as const) {
    elapsed = time
    await act(async () => vi.advanceTimersByTimeAsync(140))
    expectFrame(dynamic, frame)
  }
})
