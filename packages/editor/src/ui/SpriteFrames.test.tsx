// @vitest-environment jsdom

import type { SpriteDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { pixelAt } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { SpriteFrames } from './SpriteFrames.js'

const asset = 'sprite.authored.actor-preview'
let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    restoreAct()
    vi.unstubAllGlobals()
  }
})

async function renderActorPreview(layout: SpriteDef['layout'], poses?: SpriteDef['poses']) {
  const definition = { id: 'preview', label: '主角精灵', layout, poses }
  const project = await loadWorldSpriteProject('actor-sprite-preview', [
    { asset, label: '主角精灵源帧', frameCount: 14, definitions: [definition] },
  ])
  const sprite = project.state.sprites.find((value) => value.id === definition.id)
  if (!sprite) throw new Error('The loaded definition is missing')
  const reader = createEditorAssetReader(project.source, () => project.state)
  await act(async () =>
    root.render(
      <SpriteFrames sprite={sprite} assetBase={project.assetBase} assetReader={reader} />,
    ),
  )
  await waitForReact(() =>
    expect(host.querySelector('.semantic-frame-shelf--embedded')).not.toBeNull(),
  )
  const shelf = host.querySelector<HTMLElement>('.semantic-frame-shelf--embedded')
  if (!shelf) throw new Error('The actor preview did not mount the embedded shelf')
  return shelf
}

function readFrames(row: Element): Array<string | null> {
  return [
    ...row.querySelectorAll('.sprite-frame-cell:not(.animated) .sprite-frame-cell-caption b'),
  ].map((label) => label.textContent)
}

test('actor view shows read-only direction slots and a named action from a loaded sprite', async () => {
  const shelf = await renderActorPreview(
    { kind: 'directional', framesPerDir: 3 },
    {
      wave: {
        label: '挥手',
        order: 1,
        steps: [
          { frame: 12, durationMs: 120 },
          { frame: 13, durationMs: 180 },
        ],
        loopFrom: 0,
      },
    },
  )
  expect(shelf.getAttribute('aria-label')).toBe('四向行走与动作帧预览')
  expect(shelf.querySelector(':scope > header')).toBeNull()
  expect(shelf.querySelector('.semantic-frame-group-head')).toBeNull()
  expect(shelf.querySelector('button,input,select,textarea')).toBeNull()
  const rows = [...shelf.querySelectorAll('.semantic-frame-row')]
  expect(rows.map((row) => row.querySelector('.semantic-frame-row-label b')?.textContent)).toEqual([
    '下 · 行走',
    '左 · 行走',
    '上 · 行走',
    '右 · 行走',
    '挥手',
  ])
  expect(rows.map(readFrames)).toEqual([
    ['#0', '#1', '#2'],
    ['#3', '#4', '#5'],
    ['#6', '#7', '#8'],
    ['#9', '#10', '#11'],
    ['#12', '#13'],
  ])
  expect(shelf.textContent).toContain('循环动作 · 第 1 步开始循环')
  const first = rows[0]?.querySelector<HTMLCanvasElement>(
    '.sprite-frame-cell:not(.animated) canvas',
  )
  if (!first) throw new Error('The south-facing standing frame did not mount')
  expect(pixelAt(first, 36, 60)).toEqual([200, 84, 68, 255])
})

test('a historical frame declaration above the RLE table budget shows only existing frames', async () => {
  const shelf = await renderActorPreview({ kind: 'directional', framesPerDir: 2 ** 32 })
  expect(host.textContent).toContain('资源实际 14 帧')
  const rows = [...shelf.querySelectorAll('.semantic-frame-row')]
  expect(rows.map((row) => readFrames(row).length)).toEqual([14, 0, 0, 0])
})

test('an absent historical slot keeps the requested index and paints the first source image', async () => {
  const shelf = await renderActorPreview({ kind: 'directional', framesPerDir: 4 })
  expect(host.textContent).toContain('声明需要 16 帧，资源实际 14 帧')
  const missing = [...shelf.querySelectorAll('.sprite-frame-cell.missing')]
  expect(missing.map((frame) => frame.querySelector('b')?.textContent)).toEqual(['#14', '#15'])
  const first = shelf.querySelector<HTMLCanvasElement>('.sprite-frame-cell:not(.animated) canvas')
  const missingFrame = missing[1]?.querySelector<HTMLCanvasElement>('canvas')
  if (!first || !missingFrame) throw new Error('Fallback source/target image is missing')
  expect(pixelAt(first, 36, 60)).toEqual([200, 84, 68, 255])
  expect(pixelAt(missingFrame, 36, 60)).toEqual([200, 84, 68, 255])
})
