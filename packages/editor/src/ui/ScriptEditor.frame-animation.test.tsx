// @vitest-environment jsdom
import { act } from 'react'
import { expect, test } from 'vitest'
import { commandForm } from './__tests__/command-form-current-fixture.js'
import { describeCanonicalCommand } from './ScriptEditor.js'

test('frame animation form exposes explicit first-frame fade and hold, preserving range and unrelated fields', async () => {
  const command = {
    kind: 'playFrameAnimation' as const,
    asset: 'movie-a',
    startFrame: 0,
    endFrame: 112,
    frameRate: 16,
  }
  const f = await commandForm(command, { requireLeafFormRow: false })
  const labels = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')]
  const fadeLabel = labels.find((label) => label.textContent?.trim() === '首帧淡入（毫秒）')
  expect(fadeLabel).toBeDefined()
  const fade = document.getElementById(fadeLabel!.htmlFor)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(fade, '600')
    fade?.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const hold = document.querySelector<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')
  expect(hold).not.toBeNull()
  await act(async () => hold!.click())
  const expected = { ...command, initialFadeInMs: 600, holdLastFrame: true }
  const summary = describeCanonicalCommand(expected, f.context)
  expect(summary.detail).toContain('首帧淡入 600ms')
  expect(summary.detail).toContain('保留末帧')
  await f.finish(expected)
  expect(describeCanonicalCommand({ kind: 'clearFrameAnimation' }, f.context).label).toBe(
    '清除帧动画画面',
  )
})
