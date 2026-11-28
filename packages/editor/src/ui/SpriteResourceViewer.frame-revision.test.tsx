// @vitest-environment jsdom

import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { pngFileOf, pngRgba, solidRgba } from '../__tests__/png-fixtures.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import {
  type MountedWorldSpriteLibrary,
  mountWorldSpriteLibrary,
  unmountWorldSpriteLibrary,
} from '../__tests__/world-sprite-library-test-host.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import { installImageDecodePort } from './__tests__/image-preview-ports.js'

const asset = 'sprite.authored.frame-revision'
let mounted: MountedWorldSpriteLibrary | undefined
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
})

afterEach(async () => {
  try {
    if (mounted) await unmountWorldSpriteLibrary(mounted)
  } finally {
    mounted = undefined
    restoreAct()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

async function mount(): Promise<MountedWorldSpriteLibrary> {
  const project = await loadWorldSpriteProject('sprite-frame-revision', [
    {
      asset,
      label: '测试源帧',
      frameCount: 2,
      definitions: [],
    },
  ])
  mounted = await mountWorldSpriteLibrary(project, { view: 'asset', focus: asset })
  await waitForReact(() =>
    expect(mounted?.host.querySelector('.sprite-raw-inspector')).not.toBeNull(),
  )
  return mounted
}

async function replaceFrame(
  preview: MountedWorldSpriteLibrary,
  frame: number,
  file: File,
): Promise<void> {
  const button = preview.host.querySelector<HTMLButtonElement>(
    `.sprite-resource-frame-grid button[aria-label^="选择源帧 ${frame}，"]`,
  )
  if (!button) throw new Error(`Frame ${frame} is missing`)
  await act(async () => button.click())
  const input = preview.host.querySelector<HTMLInputElement>('.sprite-hidden-file-input')
  if (!input) throw new Error('Replace frame input is missing')
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
}

function image(
  name: string,
  width: number,
  height: number,
  color: [number, number, number, number],
) {
  const bytes = pngRgba(width, height, solidRgba(width, height, color))
  return { file: pngFileOf(name, bytes), size: bytes.byteLength }
}

test('a late edit based on old frames cannot reset a frame committed while it was decoding', async () => {
  const preview = await mount()
  const port = installImageDecodePort()
  const slow = image('slow-first.png', 4, 4, [181, 30, 30, 255])
  const fast = image('fast-second.png', 6, 5, [20, 185, 40, 255])
  const hold = port.gate(slow.size)
  const before = preview.session.getHistoryVersion()
  const sizes = async () =>
    (await loadEditorSprite(preview.reader, asset)).frames.map(({ width, height }) => [
      width,
      height,
    ])
  try {
    await replaceFrame(preview, 0, slow.file)
    await waitForReact(() => expect(port.entries).toContain(slow.size))
    await replaceFrame(preview, 1, fast.file)
    await waitForReact(() => expect(preview.notices.at(-1)?.kind).toBe('info'))
    const committed = preview.session.getState().assetCatalog.assets[asset]?.sha256
    expect(committed).toMatch(/^[a-f0-9]{64}$/)
    expect(await sizes()).toEqual([
      [8, 8],
      [6, 5],
    ])

    const settled = preview.notices.length
    await act(async () => hold.resolve())
    await waitForReact(() => expect(preview.notices.length).toBeGreaterThan(settled))
    expect(preview.notices.at(-1)).toEqual({
      kind: 'error',
      message: expect.stringContaining('源帧已更新，请重新选择后再编辑'),
    })
    expect(port.completions).toContain(slow.size)
    expect(await sizes()).toEqual([
      [8, 8],
      [6, 5],
    ])
    expect(preview.session.getState().assetCatalog.assets[asset]?.sha256).toBe(committed)
    expect(preview.session.getHistoryVersion()).toBe(before + 1)
  } finally {
    hold.resolve()
  }
})

test('failure to allocate the decoded image canvas closes its bitmap and preserves the source', async () => {
  const preview = await mount()
  const port = installImageDecodePort()
  const { file, size } = image('context-failure.png', 6, 7, [180, 30, 30, 255])
  const previous = preview.session.getState().assetCatalog.assets[asset]
  const history = preview.session.getHistoryVersion()
  const getContext = HTMLCanvasElement.prototype.getContext
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    type: string,
    options?: unknown,
  ) {
    if (this.width === 6 && this.height === 7 && type === '2d') return null
    return getContext.call(this, type, options)
  })
  await replaceFrame(preview, 0, file)
  await waitForReact(() => expect(preview.notices.at(-1)?.message).toContain('2d context 不可用'))
  expect(port.completions).toEqual([size])
  expect(preview.session.getState().assetCatalog.assets[asset]).toEqual(previous)
  expect(preview.session.getHistoryVersion()).toBe(history)
  expect(port.liveBitmaps()).toBe(0)
})
