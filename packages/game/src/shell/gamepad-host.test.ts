import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type GamepadState, startGamepadInput } from './gamepad-input.js'
import { KeyboardInputSource } from './input.js'

describe('browser gamepad polling lifecycle', () => {
  let input: KeyboardInputSource
  let stop: () => void
  let focused: boolean
  let hidden: boolean
  let blocked: boolean
  let sequence: number
  const frames = new Map<number, FrameRequestCallback>()
  const pad = (pressed: boolean): GamepadState => ({
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0],
    buttons: [{ pressed, touched: pressed, value: pressed ? 1 : 0 }],
  })
  const frame = (): void => {
    const scheduled = frames.entries().next().value
    if (!scheduled) throw new Error('No browser frame scheduled')
    const [id, callback] = scheduled
    frames.delete(id)
    callback(id * 16)
  }
  beforeEach(() => {
    frames.clear()
    focused = true
    hidden = false
    blocked = false
    sequence = 0
    stop = () => {}
    vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.set(++sequence, callback)
      return sequence
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id)
    })
    input = new KeyboardInputSource(window)
  })
  afterEach(() => {
    stop()
    input.detach()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    frames.clear()
  })

  it('reads fresh devices, releases on blur/tools/hidden, and disposes pending polling', () => {
    let pads: readonly (GamepadState | null)[] = [pad(true)]
    vi.stubGlobal('navigator', { getGamepads: () => pads })
    stop = startGamepadInput(input, () => blocked)
    frame()
    expect([...input.nextSnapshot(1).held]).toEqual(['Confirm'])
    focused = false
    window.dispatchEvent(new Event('blur'))
    expect([...input.nextSnapshot(2).held]).toEqual([])
    focused = true
    frame()
    expect([...input.nextSnapshot(3).pressed]).toEqual([])
    pads = [pad(false)]
    frame()
    pads = [pad(true)]
    frame()
    expect([...input.nextSnapshot(4).pressed]).toEqual(['Confirm'])
    blocked = true
    frame()
    expect([...input.nextSnapshot(5).held]).toEqual([])
    blocked = false
    pads = [pad(false)]
    frame()
    pads = [pad(true)]
    frame()
    expect([...input.nextSnapshot(6).held]).toEqual(['Confirm'])
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    expect([...input.nextSnapshot(7).held]).toEqual([])
    hidden = false
    pads = [pad(false)]
    frame()
    pads = [pad(true)]
    frame()
    stop()
    expect([...input.nextSnapshot(8).held]).toEqual([])
    expect(frames.size).toBe(0)
  })

  it('stops querying a denied Gamepad API while keyboard input continues', () => {
    const getGamepads = vi.fn(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    vi.stubGlobal('navigator', { getGamepads })
    stop = startGamepadInput(input, () => false)
    frame()
    frame()
    expect(getGamepads).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    expect([...input.nextSnapshot(1).pressed]).toEqual(['Confirm'])
  })
})
