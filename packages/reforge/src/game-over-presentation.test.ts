// @vitest-environment jsdom
import { expect, test } from 'vitest'
import { expectDefined } from './defined.js'
import { GameOverPresentation } from './game-over-presentation.js'

test('red steps tint two preserved battle colors and release the frame only for its owner', () => {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 1
  const ctx = expectDefined(canvas.getContext('2d'))
  const source = ctx.createImageData(2, 1)
  source.data.set([200, 80, 40, 255, 10, 5, 100, 255])
  ctx.putImageData(source, 0, 0)
  const presentation = new GameOverPresentation()
  const owner = new AbortController().signal
  presentation.hold(ctx, owner)
  ctx.clearRect(0, 0, 2, 1)
  expect(presentation.draw(ctx, 100)).toBe(true)
  const pixels = () => Array.from(ctx.getImageData(0, 0, 2, 1).data)
  expect(pixels()).toEqual([200, 80, 40, 255, 10, 5, 100, 255])

  presentation.begin(ctx, owner, 100)
  presentation.draw(ctx, 174)
  expect(pixels()).toEqual([192, 72, 32, 255, 18, 0, 92, 255])
  presentation.draw(ctx, 175)
  expect(pixels()).toEqual([184, 64, 24, 255, 26, 0, 84, 255])
  presentation.draw(ctx, 2500)
  expect(pixels()).toEqual([144, 0, 0, 255, 92, 0, 0, 255])

  presentation.release(new AbortController().signal)
  expect(presentation.draw(ctx, 2501)).toBe(true)
  presentation.release(owner)
  expect(presentation.draw(ctx, 2501)).toBe(false)
})
