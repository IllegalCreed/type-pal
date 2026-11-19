import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  firstNewUnavailableSpriteFrame,
  type SpriteDef,
  spriteDefinitionFrameDemand,
  spriteDefinitionFrameIndices,
} from './sprite.js'
import { validateSprites } from './validate.js'

function validateWorldSprite(layout: SpriteDef['layout'], poses?: SpriteDef['poses']): SpriteDef {
  const sprite: SpriteDef = { id: 'guide', label: '向导', asset: 'sprite.guide', layout, poses }
  validateSprites([sprite])
  return sprite
}

test.each([
  { layout: { kind: 'static' }, frameCount: 1, frames: [0] },
  {
    layout: { kind: 'directional', framesPerDir: 3 },
    frameCount: 12,
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
] satisfies {
  layout: SpriteDef['layout']
  frameCount: number
  frames: number[]
}[])('computes the declared demand for $layout.kind layout', ({ layout, frameCount, frames }) => {
  const sprite = validateWorldSprite(layout)
  expect(spriteDefinitionFrameDemand(sprite)).toBe(frameCount)
  expect([...spriteDefinitionFrameIndices(sprite)]).toEqual(frames)
})

test('includes out-of-layout actions and deduplicates reused frame numbers', () => {
  const sprite = validateWorldSprite(
    { kind: 'directional', framesPerDir: 1 },
    {
      motion: {
        label: '招手',
        steps: [
          { frame: 3, durationMs: 90 },
          { frame: 5, durationMs: 80 },
          { frame: 5, durationMs: 100 },
        ],
      },
    },
  )
  const original = deepSnapshot(sprite)
  expect(spriteDefinitionFrameDemand(sprite)).toBe(6)
  expect([...spriteDefinitionFrameIndices(sprite)]).toEqual([0, 1, 2, 3, 5])
  expect(sprite).toEqual(original)
})

test('preserves the frame range of an in-memory loop layout', () => {
  const sprite: Pick<SpriteDef, 'layout' | 'poses'> = {
    layout: { kind: 'loop', frameCount: 3 },
    poses: { gesture: { label: '低声', steps: [{ frame: 1, durationMs: 50 }] } },
  }
  expect(spriteDefinitionFrameDemand(sprite)).toBe(3)
  expect([...spriteDefinitionFrameIndices(sprite)]).toEqual([0, 1, 2])
})

test('finds a new layout gap after an existing action frame beyond safe integer precision', () => {
  const framesPerDir = 2 ** 52
  const previous = validateWorldSprite(
    { kind: 'directional', framesPerDir },
    { motion: { label: '招手', steps: [{ frame: framesPerDir * 4, durationMs: 90 }] } },
  )
  const grown = validateWorldSprite(
    { kind: 'directional', framesPerDir: framesPerDir + 1 },
    previous.poses,
  )

  expect(firstNewUnavailableSpriteFrame(previous, grown, 4)).toBe(2n ** 54n + 1n)
  expect(firstNewUnavailableSpriteFrame(grown, previous, 4)).toBeUndefined()
})

test('only reports a new out-of-range action when its slot was outside the previous layout', () => {
  const previous = validateWorldSprite({ kind: 'directional', framesPerDir: 2 })
  const edited = validateWorldSprite(
    { kind: 'static' },
    {
      motion: {
        label: '招手',
        steps: [
          { frame: 3, durationMs: 90 },
          { frame: 6, durationMs: 90 },
        ],
      },
    },
  )
  expect(firstNewUnavailableSpriteFrame(previous, edited, 4)).toBeUndefined()

  const withNewSlot = validateWorldSprite(edited.layout, {
    ...edited.poses,
    stride: { label: '迈步', steps: [{ frame: 8, durationMs: 90 }] },
  })
  expect(firstNewUnavailableSpriteFrame(previous, withNewSlot, 4)).toBe(8n)
})
