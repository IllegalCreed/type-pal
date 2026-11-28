// @vitest-environment jsdom

import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  mountBattleSpriteLibrary,
  unmountBattleSpriteLibrary,
  waitForBattleSpriteResources,
} from '../__tests__/battle-sprite-library-test-host.js'
import { loadBattleSpriteProject } from '../__tests__/battle-sprite-project.js'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { gatedFileSource } from '../__tests__/gated-file-source.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import {
  mountWorldSpriteLibrary,
  unmountWorldSpriteLibrary,
  waitForWorldSpriteResource,
} from '../__tests__/world-sprite-library-test-host.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { sha256Hex } from '../core/binary-signature.js'
import { UpsertAssetCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { clickButton } from './__tests__/dom-gestures.js'

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  installBrowserHardwarePorts()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const domains = [
  {
    kind: 'sprite',
    deleteLabel: '删除源资源',
    load: loadWorldSpriteProject,
    async mount(project: Awaited<ReturnType<typeof loadWorldSpriteProject>>, focus: string) {
      const disk = gatedFileSource(project.source)
      const library = await mountWorldSpriteLibrary(project, {
        focus,
        view: 'asset',
        source: disk.source,
      })
      return {
        ...library,
        disk,
        settle: (asset: string) => waitForWorldSpriteResource(library, asset),
        close: () => unmountWorldSpriteLibrary(library),
      }
    },
  },
  {
    kind: 'battle-sprite',
    deleteLabel: '删除源文件',
    load: loadBattleSpriteProject,
    async mount(project: Awaited<ReturnType<typeof loadBattleSpriteProject>>, focus: string) {
      const disk = gatedFileSource(project.source)
      const library = await mountBattleSpriteLibrary(project, {
        focus,
        view: 'asset',
        source: disk.source,
      })
      return {
        ...library,
        disk,
        settle: () => waitForBattleSpriteResources(library.host),
        close: () => unmountBattleSpriteLibrary(library),
      }
    },
  },
] as const

async function projectWithUnusedAsset(domain: (typeof domains)[number]) {
  const asset = `${domain.kind}.authored.deletion-revision`
  const spec = { asset, label: '待删的源帧', frameCount: 3, definitions: [] }
  if (domain.kind === 'sprite') {
    const project = await domain.load('world-deletion-revision', [spec])
    return { asset, project, library: await domain.mount(project, asset) }
  }
  const project = await domain.load('battle-deletion-revision', [spec])
  return { asset, project, library: await domain.mount(project, asset) }
}

test.each(domains)('$kind 的删除等待旧文件时，换版后保存新版及历史', async (domain) => {
  const { asset, project, library } = await projectWithUnusedAsset(domain)
  try {
    await waitForReact(() => expect(library.host.textContent).toContain('3 帧 · 0 个用途定义'))
    const oldRecord = project.state.assetCatalog.assets[asset]!
    const replacement = await domain.load('deletion-revision-replacement', [
      { asset, label: '新版源帧', frameCount: 4, definitions: [] },
    ])
    const newRecord = replacement.state.assetCatalog.assets[asset]!
    const newBytes = await replacement.source.readBytes(newRecord.path)
    expect(newRecord.sha256).not.toBe(oldRecord.sha256)
    const beforeRead = library.disk.calls.filter((path) => path === oldRecord.path).length
    const hold = library.disk.gate(oldRecord.path)
    try {
      await clickButton(library.host, domain.deleteLabel)
      expect(library.disk.calls.filter((path) => path === oldRecord.path)).toHaveLength(
        beforeRead + 1,
      )
      expect(library.disk.completed.filter((path) => path === oldRecord.path)).toHaveLength(
        beforeRead,
      )
      await act(async () => {
        expect(library.session.dispatch(new UpsertAssetCommand(asset, newRecord, newBytes))).toBe(
          true,
        )
      })
      await library.settle(asset)
      await waitForReact(() => expect(library.host.textContent).toContain('4 帧 · 0 个用途定义'))
      assertProjectSaveValid(library.session.getState())
    } finally {
      await act(async () => hold.resolve())
    }

    await act(async () => {
      await vi.waitFor(() =>
        expect(
          library.session.getHistoryVersion() === 2 || library.notices.at(-1)?.kind === 'error',
        ).toBe(true),
      )
    })
    expect(library.session.getState().assetCatalog.assets[asset]).toEqual(newRecord)
    expect(library.session.getHistoryVersion()).toBe(1)
    expect(library.notices.at(-1)).toEqual({
      kind: 'error',
      message: expect.stringContaining('请重新确认删除'),
    })
    expect(await sha256Hex(await library.reader.readBytes(asset, domain.kind))).toBe(
      newRecord.sha256,
    )
  } finally {
    await library.close()
  }
})
