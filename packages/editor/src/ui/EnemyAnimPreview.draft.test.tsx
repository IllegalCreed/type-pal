// @vitest-environment jsdom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  buildExternalReplace,
  enemyProfile,
  loadBattleSpriteProject,
} from '../__tests__/battle-sprite-project.js'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import {
  enemyDef,
  mountEnemyAnim,
  unmountEnemyAnim,
} from '../__tests__/enemy-animation-test-host.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { fieldControlByLabel, setInputValue } from './__tests__/dom-gestures.js'

test('a frame revision during a draft rejects the stale edit and accepts one fresh undoable commit', async () => {
  const restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  const asset = 'battle-sprite.authored.enemy-profile'
  try {
    const project = await loadBattleSpriteProject('enemy-profile-draft', [
      {
        asset,
        label: '敌人动画',
        definitions: [
          {
            id: 'enemy-profile',
            label: '待机测试',
            profile: enemyProfile(2, 1, 2, { idle: 1 }),
          },
        ],
        frameCount: 5,
      },
    ])
    const preview = await mountEnemyAnim(project, { enemy: enemyDef('enemy', 'enemy-profile') })
    try {
      const idle = () => fieldControlByLabel<HTMLInputElement>(preview.host, '待机速度')
      await waitForReact(() => expect(idle().disabled).toBe(false))
      const replacement = await buildExternalReplace(
        preview.session,
        preview.reader,
        project.palette,
        asset,
        5,
        5,
      )
      const input = idle()
      const historyBeforeDraft = preview.session.getHistoryVersion()
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!setValue) throw new Error('Native input value setter is missing')
      await act(async () => {
        input.focus()
        setValue.call(input, '7')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      expect(preview.session.getHistoryVersion()).toBe(historyBeforeDraft)
      await act(async () => {
        expect(preview.session.dispatch(replacement.command)).toBe(true)
        // The scheduled rerender has yet to replace the byte proof captured by the field.
        input.blur()
      })
      expect(preview.session.getHistoryVersion()).toBe(historyBeforeDraft + 1)
      expect(idle().value).toBe('1')
      expect(preview.host.querySelector('.ea-settings__error')?.textContent).toContain(
        '证明缺失或已过期',
      )
      expect(preview.session.getState().assetCatalog.assets[asset]?.sha256).toBe(
        replacement.encoded.sha256,
      )

      await waitForReact(() => expect(idle().disabled).toBe(false))
      await setInputValue(idle(), '4')
      expect(preview.session.getHistoryVersion()).toBe(historyBeforeDraft + 2)
      expect(
        preview.session.getState().battleSprites.find((entry) => entry.id === 'enemy-profile')
          ?.profile,
      ).toMatchObject({ idleTicksPerFrame: 4 })

      await act(async () => {
        expect(preview.session.undo()).toBe(true)
      })
      expect(idle().value).toBe('1')
      await act(async () => {
        expect(preview.session.redo()).toBe(true)
      })
      expect(idle().value).toBe('4')
    } finally {
      await unmountEnemyAnim(preview)
    }
  } finally {
    restoreAct()
    vi.unstubAllGlobals()
  }
})
