// @vitest-environment jsdom

import type { SkillAnimation } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { createFireEffectFixture } from '../__tests__/fire-effect-fixture.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { fieldControlByLabel, setInputValue } from './__tests__/dom-gestures.js'
import { SkillAnimationEditor } from './SkillAnimationEditor.js'

test('an invalid loop draft stops playback until the corrected draft is played', async () => {
  installBrowserHardwarePorts()
  const restoreAct = installReactActEnvironment()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    const fixture = await createFireEffectFixture({
      projectId: 'fire-loop-draft',
      chunk: 64,
      frames: [{ paletteIndex: 1 }, { paletteIndex: 2 }],
    })
    function Draft() {
      const [animation, setAnimation] = useState<SkillAnimation>({
        effectSprite: fixture.chunk,
        fireDelay: 0,
      })
      return (
        <SkillAnimationEditor
          animation={animation}
          onChange={setAnimation}
          assetCatalog={fixture.catalog}
          assetBase={fixture.base}
          assetReader={fixture.reader}
          draftScope="skill:loop-start"
          syncToken={0}
        />
      )
    }
    await act(async () => root.render(<Draft />))
    await waitForReact(() => expect(host.querySelector('.fire-preview canvas')).not.toBeNull())
    const canvas = host.querySelector<HTMLCanvasElement>('.fire-preview canvas')
    const context = canvas?.getContext('2d')
    if (!context) throw new Error('The FIRE preview canvas is unavailable')
    const center = () => [...context.getImageData(100, 85, 1, 1).data]
    const button = () => host.querySelector<HTMLButtonElement>('.fire-preview .fp-controls button')
    const loopStart = fieldControlByLabel<HTMLInputElement>(host, '循环起点')
    await act(async () => button()?.click())
    await act(async () => vi.advanceTimersByTimeAsync(100))
    expect(center()).toEqual([40, 80, 220, 255])

    await setInputValue(loopStart, '-1')
    expect(host.querySelector('.fire-preview [role="status"]')?.textContent).toBe(
      '循环起点必须为非负整数。',
    )
    expect(button()?.disabled).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    expect(center()).toEqual([40, 200, 60, 255])

    await setInputValue(loopStart, '0')
    expect(host.querySelector('.fire-preview [role="status"]')).toBeNull()
    expect(button()?.disabled).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => button()?.click())
    await act(async () => vi.advanceTimersByTimeAsync(100))
    expect(center()).toEqual([40, 80, 220, 255])
  } finally {
    await act(async () => root.unmount())
    host.remove()
    restoreAct()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})
