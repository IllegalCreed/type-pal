// @vitest-environment jsdom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  buttonByLabel,
  clickButton,
  deferred,
  loadFilesIntoInput,
} from './__tests__/glm-ui-wave-kit.js'
import { installImageWorkbenchTestHost } from './__tests__/image-workbench-test-host.js'
import { pngFileOf, pngRgba, solidRgba } from './__tests__/kimi-editor-workflows/kit.js'
import { seedImage } from './__tests__/static-image-fixtures.js'

const { host, mountTab, replacePng, waitPreviewSize, fileInputAt } = installImageWorkbenchTestHost()
const id = 'portrait.replaced'
const original = pngRgba(2, 1, solidRgba(2, 1, [240, 180, 12, 255]))
const first = pngRgba(3, 1, solidRgba(3, 1, [5, 240, 60, 255]))

async function mountPortrait() {
  const mounted = await mountTab({
    focus: id,
    async prepare({ session }) {
      await seedImage(session, { id, kind: 'portrait', label: '英雄', png: original })
    },
  })
  await waitPreviewSize('2 × 1')
  return mounted
}

async function beginReplacement() {
  const file = pngFileOf('first.png', first)
  const bytes = await file.arrayBuffer()
  const gate = deferred<ArrayBuffer>()
  const entered = vi.spyOn(file, 'arrayBuffer').mockReturnValue(gate.promise)
  await clickButton(host, '替换')
  await loadFilesIntoInput(fileInputAt(1), [file])
  await waitForReact(() => expect(entered).toHaveBeenCalledTimes(1))
  return () => act(async () => gate.resolve(bytes))
}

test('interleaved replacements cannot associate undo bytes with a different revision', async () => {
  const second = pngRgba(4, 1, solidRgba(4, 1, [13, 75, 220, 255]))
  const { session, reader } = await mountPortrait()
  const secondSha = await sha256Hex(second)
  const version = session.getHistoryVersion()
  const finish = await beginReplacement()
  try {
    await replacePng('second.png', second)
    await waitForReact(() => expect(session.getHistoryVersion()).toBe(version + 1))
    expect(session.getState().assetCatalog.assets[id]?.sha256).toBe(secondSha)
  } finally {
    await finish()
  }
  await waitForReact(() => expect(session.getHistoryVersion()).toBe(version + 2))
  await act(async () => expect(session.undo()).toBe(true))
  const state = session.getState()
  expect(state.assetCatalog.assets[id]?.sha256).toBe(secondSha)
  expect(new Uint8Array(await reader.readBytes(id, 'portrait'))).toEqual(second)
  assertProjectSaveValid(state)
  await act(async () => expect(session.undo()).toBe(true))
  expect(new Uint8Array(await reader.readBytes(id, 'portrait'))).toEqual(original)
})

test('deletion undo restores the revision replaced while the delete was reading bytes', async () => {
  const { session, reader } = await mountPortrait()
  const originalBytes = await reader.readBytes(id, 'portrait')
  const firstSha = await sha256Hex(first)
  const version = session.getHistoryVersion()
  const finish = await beginReplacement()
  const gate = deferred<ArrayBuffer>()
  const read = vi.spyOn(reader, 'readBytes').mockReturnValueOnce(gate.promise)
  try {
    await clickButton(host, '删除')
    const dialog = host.querySelector('dialog[aria-label="删除图片"]')
    if (!dialog) throw new Error('Missing deletion confirmation')
    await act(async () => buttonByLabel(dialog, '删除图片').click())
    expect(read).toHaveBeenCalledWith(id, 'portrait')
    await finish()
    await waitForReact(() =>
      expect(session.getState().assetCatalog.assets[id]?.sha256).toBe(firstSha),
    )
  } finally {
    await finish()
    await act(async () => gate.resolve(originalBytes))
  }
  await waitForReact(() => expect(session.getHistoryVersion()).toBe(version + 2))
  expect(session.getState().assetCatalog.assets[id]).toBeUndefined()
  await act(async () => expect(session.undo()).toBe(true))
  expect(session.getState().assetCatalog.assets[id]?.sha256).toBe(firstSha)
  expect(new Uint8Array(await reader.readBytes(id, 'portrait'))).toEqual(first)
  assertProjectSaveValid(session.getState())
})
