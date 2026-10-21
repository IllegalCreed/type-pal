import type { Palette } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playAvi } from './avi-player.js'
import { waitForKey } from './ending-player.js'
import { GamepadInputController, type GamepadState } from './gamepad-input.js'
import { KeyboardInputSource } from './input.js'
import { playSplashFallback } from './splash-fallback.js'
import { bindTouchControls, createTouchButton } from './touch-controls.js'

const pad = (pressed: boolean): GamepadState => ({
  index: 0,
  mapping: 'standard',
  connected: true,
  axes: [0, 0],
  buttons: [{ pressed, touched: pressed, value: pressed ? 1 : 0 }],
})

describe('modal players consume the same actions as gameplay', () => {
  let input: KeyboardInputSource
  beforeEach(() => {
    vi.useFakeTimers()
    input = new KeyboardInputSource(window)
  })
  afterEach(async () => {
    // Also release a failing candidate's modal so it cannot leak into the next case.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.advanceTimersByTimeAsync(2500)
    input.detach()
    document.body.replaceChildren()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('gamepad skips AVI after its buffer without confirming the next menu', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const controller = new GamepadInputController(input)
    const playback = playAvi({ src: '/extracted/videos/2.mp4' })
    let complete = false
    void playback.then(() => {
      complete = true
    })
    controller.poll([pad(true)])
    controller.poll([pad(false)])
    await vi.advanceTimersByTimeAsync(499)
    expect(complete).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(complete).toBe(true)
    expect([...input.nextSnapshot(1).pressed]).toEqual([])
    controller.poll([pad(true)])
    expect([...input.nextSnapshot(2).pressed]).toEqual(['Confirm'])
    controller.release()
  })

  it('virtual confirm exits the ending wait and is consumed only by that wait', async () => {
    const host = document.createElement('div')
    const confirm = createTouchButton('Confirm', '确认')
    host.append(confirm)
    document.body.append(host)
    const detach = bindTouchControls(host, input)
    try {
      let complete = false
      void waitForKey().then(() => {
        complete = true
      })
      confirm.click()
      await Promise.resolve()
      expect(complete).toBe(true)
      expect([...input.nextSnapshot(1).pressed]).toEqual([])
      confirm.click()
      expect([...input.nextSnapshot(2).pressed]).toEqual(['Confirm'])
    } finally {
      detach()
    }
  })

  it('gamepad can leave the DOS splash, which has no automatic end', async () => {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) throw new Error('Canvas context unavailable')
    const bitmap: IndexedImage = {
      width: 320,
      height: 200,
      indices: new Uint8Array(320 * 200),
      opaque: new Uint8Array(320 * 200).fill(1),
    }
    const palette: Palette = { colors: Array.from({ length: 256 }, () => [0, 0, 0]), cycles: [] }
    const controller = new GamepadInputController(input)
    let complete = false
    void playSplashFallback({
      fb: createFramebuffer(),
      canvasCtx: context,
      palette,
      bitmapUp: bitmap,
      bitmapDown: bitmap,
      craneSprite: { frames: [bitmap], anchorX: 0, anchorY: 0 },
      titleFrame: bitmap,
      nowFn: () => Date.now(),
    }).then(() => {
      complete = true
    })
    controller.poll([pad(true)])
    controller.poll([pad(false)])
    await vi.advanceTimersByTimeAsync(2200)
    expect(complete).toBe(true)
    expect([...input.nextSnapshot(1).pressed]).toEqual([])
    controller.poll([pad(true)])
    expect([...input.nextSnapshot(2).pressed]).toEqual(['Confirm'])
    controller.release()
  })
})
