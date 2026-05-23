import { describe, expect, it } from 'vitest'
import { FPS_BATTLE, FPS_EXPLORE, FRAME_MS_BATTLE, FRAME_MS_EXPLORE } from './index.js'

describe('engine timing constants (D13)', () => {
  it('exploration 跑 10 fps(100ms/frame)', () => {
    expect(FPS_EXPLORE).toBe(10)
    expect(FRAME_MS_EXPLORE).toBe(100)
  })

  it('battle 跑 25 fps(40ms/frame)', () => {
    expect(FPS_BATTLE).toBe(25)
    expect(FRAME_MS_BATTLE).toBe(40)
  })
})
