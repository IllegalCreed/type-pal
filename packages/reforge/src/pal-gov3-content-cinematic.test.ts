import { expect, test } from 'vitest'
import { gov3Body, gov3Runtime } from './pal-gov3-content-harness.js'

test('灵儿父母往事的完整六帧段经真实compiler/runtime携带揭幕与保持合同，声音边界未移动', async () => {
  const body = gov3Body('s011', 'e195', 'default', 'initial')
  const first = body.findIndex((command) => command.kind === 'playFrameAnimation')
  const end = body.findIndex((command) => command.kind === 'clearFrameAnimation')
  expect(first).toBeGreaterThan(0)
  expect(end).toBeGreaterThan(first)
  const run = gov3Runtime('s011')
  await run.runtime.runCommands(body.slice(first, end + 1), { signal: run.controller.signal })
  const frames = run.effects
    .filter((effect) => effect.command.kind === 'playFrameAnimation')
    .map((effect) => effect.command)
  expect(frames).toEqual([
    {
      kind: 'playFrameAnimation',
      asset: 'frame-animation.pal.001',
      startFrame: 0,
      endFrame: 112,
      frameRate: 16,
      holdLastFrame: true,
      initialFadeInMs: 600,
    },
    {
      kind: 'playFrameAnimation',
      asset: 'frame-animation.pal.001',
      startFrame: 113,
      endFrame: 162,
      frameRate: 16,
      holdLastFrame: true,
    },
    {
      kind: 'playFrameAnimation',
      asset: 'frame-animation.pal.001',
      startFrame: 163,
      endFrame: 186,
      frameRate: 16,
      holdLastFrame: true,
    },
    {
      kind: 'playFrameAnimation',
      asset: 'frame-animation.pal.001',
      startFrame: 187,
      endFrame: 195,
      frameRate: 16,
      holdLastFrame: true,
    },
    {
      kind: 'playFrameAnimation',
      asset: 'frame-animation.pal.001',
      startFrame: 196,
      endFrame: 266,
      frameRate: 16,
      holdLastFrame: true,
    },
    {
      kind: 'playFrameAnimation',
      asset: 'frame-animation.pal.001',
      startFrame: 267,
      frameRate: 16,
      holdLastFrame: true,
    },
  ])
  expect(run.effects.map((effect) => effect.command.kind)).toEqual([
    'playFrameAnimation',
    'playSound',
    'playFrameAnimation',
    'playSound',
    'playFrameAnimation',
    'playSound',
    'playFrameAnimation',
    'playSound',
    'playFrameAnimation',
    'playSound',
    'playFrameAnimation',
    'fade',
    'clearFrameAnimation',
  ])
  expect(
    run.effects
      .filter((effect) => effect.command.kind === 'playSound')
      .map((effect) => effect.command),
  ).toEqual(
    [86, 87, 85, 85, 88].map((id) => ({
      kind: 'playSound',
      asset: `sound.pal.${String(id).padStart(3, '0')}`,
    })),
  )
  // First-frame fade and normal frame timing are owned by the actual playback API,
  // tested independently by Core. This is canonical compiler-to-host integration.
  const returning = body.slice(end, end + 14)
  expect(returning[0]?.kind).toBe('clearFrameAnimation')
  const reveal = returning.findIndex((command) => command.kind === 'fade' && command.dir === 'in')
  const place = returning.findIndex((command) => command.kind === 'teleportParty')
  expect(place).toBeGreaterThan(0)
  expect(reveal).toBeGreaterThan(place)
})
