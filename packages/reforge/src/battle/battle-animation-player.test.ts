import { expect, test, vi } from 'vitest'
import type { OverlayDraw } from './battle-anim.js'
import { AnimPlayer } from './battle-animation-player.js'

test('switches overlays at exact accumulated times and clears the last image once', () => {
  const first: OverlayDraw = { sheet: 'magic', frameIdx: 0, x: 70, y: 120 }
  const second: OverlayDraw = { ...first, frameIdx: 1 }
  const onOverlay = vi.fn()
  const playback = new AnimPlayer(
    [
      { durationMs: 40, overlays: [first] },
      { durationMs: 40, overlays: [second] },
    ],
    { onOverlay },
  )

  expect(playback.tick(10)).toBe(false)
  expect(playback.tick(29)).toBe(false)
  expect(onOverlay.mock.calls).toEqual([[[first]]])
  expect(playback.tick(1)).toBe(false)
  expect(onOverlay.mock.calls).toEqual([[[first]], [[second]]])
  expect(playback.tick(45)).toBe(true)
  expect(playback.overrunMs).toBe(5)
  expect(playback.tick(1000)).toBe(true)
  expect(onOverlay.mock.calls).toEqual([[[first]], [[second]], [null]])
})

test('dispatches damage tone, shake, wave and banner exactly once at frame entry', () => {
  const ordinary = { side: 'enemy', idx: 1 } as const
  const restored = { side: 'player', idx: 0 } as const
  const onDamage = vi.fn()
  const onScreenShake = vi.fn()
  const onWaveAdd = vi.fn()
  const onBanner = vi.fn()
  const onSummonPhase = vi.fn()
  const playback = new AnimPlayer(
    [
      {
        durationMs: 40,
        damageNums: [
          { target: ordinary, value: 12 },
          { target: restored, value: 34, tone: 'yellow' },
        ],
        screenShake: true,
        screenShakeLevel: 2,
        waveAdd: 3,
        banner: { text: '合击', durationMs: 500 },
      },
    ],
    { onDamage, onScreenShake, onWaveAdd, onBanner, onSummonPhase },
  )

  expect(playback.tick(0)).toBe(false)
  expect(playback.tick(15)).toBe(false)
  expect(playback.tick(25)).toBe(true)
  expect(playback.tick(1000)).toBe(true)
  expect(onDamage.mock.calls).toEqual([
    [ordinary, 12, undefined],
    [restored, 34, 'yellow'],
  ])
  expect(onScreenShake).toHaveBeenCalledExactlyOnceWith(40, 2)
  expect(onWaveAdd).toHaveBeenCalledExactlyOnceWith(3)
  expect(onBanner).toHaveBeenCalledExactlyOnceWith('合击', 500, undefined, undefined)
  expect(onSummonPhase).toHaveBeenCalledExactlyOnceWith(null)
})
