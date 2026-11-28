// @vitest-environment jsdom

import { fsaSource, loadCurrentProjectFrom } from '@type-pal/reforge'
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { loadLegalProject } from '../__tests__/cursor-asset-r1/kit.js'
import { atlasColors, atlasFile, gridAtlasPng } from '../__tests__/png-fixtures.js'
import { unmountHost } from '../__tests__/react-host-cleanup.js'
import { installReactActEnvironment } from '../__tests__/react-io-wait.js'
import {
  waitDone,
  wizardClickSubmit,
  wizardPick,
  wizardWaitReady,
} from '../__tests__/world-sprite-import-gestures.js'
import { mountWizard } from '../__tests__/world-sprite-import-test-host.js'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { serializeProject } from '../core/project-io.js'

test('every offered initial sprite layout survives author project serialization and reopening', async () => {
  const restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  try {
    const project = await loadLegalProject('sprite-authorable-layout')
    const file = atlasFile('project-sprite.png', gridAtlasPng(3, 4, 4, 4, atlasColors(12)))
    const options = (host: HTMLElement) => [
      ...host.querySelectorAll<HTMLButtonElement>('.sprite-upload-kind-options button'),
    ]
    const first = await mountWizard(project)
    let names: string[]
    try {
      names = options(first.host).map((button) => button.textContent ?? '')
    } finally {
      await unmountHost(first)
    }
    expect(names).toEqual(
      expect.arrayContaining([
        expect.stringContaining('四向行走'),
        expect.stringContaining('默认定格'),
      ]),
    )
    for (const name of names) {
      const wizard = await mountWizard(project)
      try {
        const option = options(wizard.host).find((button) => button.textContent === name)
        if (!option) throw new Error(`Offered layout missing: ${name}`)
        await act(async () => option.click())
        await wizardPick(wizard.host, file)
        await wizardWaitReady(wizard.host)
        await wizardClickSubmit(wizard.host)
        await waitDone(wizard.done)
        expect(wizard.done).toEqual(['project-sprite'])
        const state = wizard.scope.session.getState()
        expect(state.sprites.find((sprite) => sprite.id === 'project-sprite')).toBeDefined()
        const disk = memoryAuthorDirectory({
          ...Object.fromEntries(project.disk.files),
          ...serializeProject(state),
          ...state.assetBlobs,
        })
        const reopened = await loadCurrentProjectFrom(fsaSource(disk.dir))
        expect(reopened.spritesById['project-sprite']?.layout).toEqual(
          state.sprites.find((sprite) => sprite.id === 'project-sprite')?.layout,
        )
      } finally {
        await unmountHost(wizard)
      }
    }
  } finally {
    restoreAct()
    vi.unstubAllGlobals()
  }
})
