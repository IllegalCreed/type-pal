// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import { installShellHost } from './__tests__/runtime-shell/dom-host.js'
import { ScreenShakePresentation } from './screen-shake-presentation.js'

test('the final frame repeats its offset between beats and expires after the last beat', async () => {
  const host = await installShellHost()
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 400
    const context = canvas.getContext('2d')
    if (!context) throw new Error('test canvas is unavailable')
    const drawImage = vi.spyOn(context, 'drawImage')
    const fillRect = vi.spyOn(context, 'fillRect')
    const shake = new ScreenShakePresentation()
    shake.start(3, 3)
    shake.advance()
    shake.apply(context, 2)
    shake.apply(context, 2)
    shake.advance()
    shake.apply(context, 2)
    shake.advance()
    shake.apply(context, 2)
    shake.advance()
    shake.apply(context, 2)
    expect(drawImage.mock.calls).toEqual([
      [canvas, 0, -6],
      [canvas, 0, -6],
      [canvas, 0, 6],
      [canvas, 0, -6],
    ])
    expect(fillRect.mock.calls).toEqual([
      [0, 394, 640, 6],
      [0, 394, 640, 6],
      [0, 0, 640, 6],
      [0, 394, 640, 6],
    ])
  } finally {
    await host.close()
  }
})

test('an explicit stop clears the current phase', async () => {
  const host = await installShellHost()
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('test canvas is unavailable')
    const drawImage = vi.spyOn(context, 'drawImage')
    const shake = new ScreenShakePresentation()
    shake.start(2, 1)
    shake.advance()
    shake.apply(context, 1)
    shake.start(0, 4)
    shake.apply(context, 1)
    shake.advance()
    shake.apply(context, 1)
    expect(drawImage.mock.calls).toEqual([[canvas, 0, 1]])
  } finally {
    await host.close()
  }
})
