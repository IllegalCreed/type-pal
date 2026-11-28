// @vitest-environment jsdom

import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  type MountedBattleSpriteLibrary,
  mountBattleSpriteLibrary,
  unmountBattleSpriteLibrary,
} from '../__tests__/battle-sprite-library-test-host.js'
import { decodeBattleAsset, loadBattleSpriteProject } from '../__tests__/battle-sprite-project.js'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { clickButtonByText, loadFilesIntoInput } from '../__tests__/cursor-asset-r1/kit.js'
import { pngFileOf, pngRgba, solidRgba } from '../__tests__/png-fixtures.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { selectFrame } from '../__tests__/sprite-source-test-gestures.js'
import { installImageDecodePort } from './__tests__/image-preview-ports.js'

const asset = 'battle-sprite.authored.frame-revision'
let mounted: MountedBattleSpriteLibrary | undefined
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
})

afterEach(async () => {
  try {
    if (mounted) await unmountBattleSpriteLibrary(mounted)
  } finally {
    mounted = undefined
    restoreAct()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

async function mount(): Promise<MountedBattleSpriteLibrary> {
  const project = await loadBattleSpriteProject('battle-frame-revision', [
    { asset, label: '测试战斗源帧', frameCount: 2, colorPicks: [0, 1], definitions: [] },
  ])
  mounted = await mountBattleSpriteLibrary(project, { view: 'asset', focus: asset })
  return mounted
}

async function replaceFrame(
  preview: MountedBattleSpriteLibrary,
  frame: number,
  file: File,
): Promise<void> {
  await selectFrame(preview.host, frame)
  await clickButtonByText(preview.host, '替换当前帧')
  const input = preview.host.querySelector<HTMLInputElement>('.sprite-hidden-file-input')
  if (!input) throw new Error('Replace frame input is missing')
  await loadFilesIntoInput(input, [file])
}

test('a late battle frame edit cannot overwrite a newer container revision', async () => {
  const preview = await mount()
  const port = installImageDecodePort()
  const slow = pngRgba(4, 4, solidRgba(4, 4, [181, 30, 30, 255]))
  const fast = pngRgba(6, 5, solidRgba(6, 5, [20, 185, 40, 255]))
  const hold = port.gate(slow.byteLength)
  const before = preview.session.getHistoryVersion()
  const sizes = async () =>
    (await decodeBattleAsset(preview.project, preview.session.getState(), asset)).frames.map(
      ({ width, height }) => [width, height],
    )
  try {
    await replaceFrame(preview, 0, pngFileOf('slow.png', slow))
    await waitForReact(() => expect(port.entries).toContain(slow.byteLength))
    await replaceFrame(preview, 1, pngFileOf('fast.png', fast))
    await waitForReact(() => expect(preview.notices.at(-1)?.kind).toBe('info'))
    expect(await sizes()).toEqual([
      [8, 8],
      [6, 5],
    ])
    const committed = preview.session.getState().assetCatalog.assets[asset]?.sha256
    const settled = preview.notices.length

    await act(async () => hold.resolve())
    await waitForReact(() => expect(preview.notices.length).toBeGreaterThan(settled))
    expect(preview.notices.at(-1)).toEqual({
      kind: 'error',
      message: expect.stringContaining('源帧已更新，请重新选择后再编辑'),
    })
    expect(port.completions).toContain(slow.byteLength)
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
