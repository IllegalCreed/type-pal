import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
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
  { layout: { kind: 'static' }, frameCount: 1 },
  { layout: { kind: 'directional', framesPerDir: 3 }, frameCount: 12 },
] satisfies {
  layout: SpriteDef['layout']
  frameCount: number
}[])('computes the declared demand for $layout.kind layout', ({ layout, frameCount }) => {
  expect(spriteDefinitionFrameDemand(validateWorldSprite(layout))).toBe(frameCount)
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
