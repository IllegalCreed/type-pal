// @vitest-environment jsdom
import { expect, test } from 'vitest'
import { expectDefined } from './defined.js'
import { GameOverPresentation } from './game-over-presentation.js'

test('a held battle frame tints red then fades to black at its exit deadline', async () => {
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
  let complete = false
  const exit = presentation.fadeOut(owner, 2501).then(() => {
    complete = true
  })
  presentation.draw(ctx, 2801)
  expect(pixels()).toEqual([72, 0, 0, 255, 46, 0, 0, 255])
  await Promise.resolve()
  expect(complete).toBe(false)
  presentation.draw(ctx, 3101)
  expect(pixels()).toEqual([0, 0, 0, 255, 0, 0, 0, 255])
  await exit
  presentation.release(owner)
  expect(presentation.draw(ctx, 3101)).toBe(false)
})
