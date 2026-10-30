import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GamepadInputController, type GamepadState, startGamepadInput } from './gamepad-input.js'
import { KeyboardInputSource } from './input.js'
import { setInputRotated } from './input-rotation.js'

function pad(
  pressed: readonly number[] = [],
  axes: readonly number[] = [0, 0],
  index = 0,
): GamepadState {
  return {
    index,
    mapping: 'standard',
    connected: true,
    axes,
    buttons: Array.from({ length: 16 }, (_, button) => ({
      pressed: pressed.includes(button),
      touched: pressed.includes(button),
      value: pressed.includes(button) ? 1 : 0,
    })),
  }
}

describe('standard gamepad through real input snapshots', () => {
  let input: KeyboardInputSource
  let controller: GamepadInputController
  beforeEach(() => {
    input = new KeyboardInputSource(window)
    controller = new GamepadInputController(input)
  })
  afterEach(() => {
    controller.release()
    input.detach()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.removeItem('tp-input-rotation')
  })

  it('maps standard buttons and latches a brief press between logic snapshots', () => {
    controller.poll([pad([0, 1, 9, 12, 13, 14, 15])])
    controller.poll([])
    const snap = input.nextSnapshot(1)
    expect([...snap.pressed]).toEqual(['Confirm', 'Menu', 'Up', 'Down', 'Left', 'Right'])
    expect([...snap.held]).toEqual([])
    expect([...input.nextSnapshot(2).pressed]).toEqual([])
  })

  it('does not repeat held buttons or steal direction priority from a later keyboard press', () => {
    controller.poll([pad([12])])
    input.nextSnapshot(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    input.nextSnapshot(2)
    controller.poll([pad([12])])
    const snap = input.nextSnapshot(3)
    expect([...snap.held]).toEqual(['Up', 'Right'])
    expect([...snap.pressed]).toEqual([])
  })

  it('selects the dominant stick axis, tolerates drift, and releases after returning to center', () => {
    controller.poll([pad([], [0.3, 0])])
    expect([...input.nextSnapshot(1).held]).toEqual([])
    controller.poll([pad([], [0.8, -0.5])])
    expect([...input.nextSnapshot(2).held]).toEqual(['Right'])
    controller.poll([pad([], [0.25, 0])])
    expect([...input.nextSnapshot(3).held]).toEqual(['Right'])
    controller.poll([pad([], [0.1, 0.1])])
    expect([...input.nextSnapshot(4).held]).toEqual([])
    controller.poll([pad([], [-0.8, 0.3])])
    expect([...input.nextSnapshot(5).held]).toEqual(['Left'])
    controller.poll([pad([], [0.1, -0.8])])
    expect([...input.nextSnapshot(6).held]).toEqual(['Up'])
    controller.poll([pad([], [0.1, 0.8])])
    expect([...input.nextSnapshot(7).held]).toEqual(['Down'])
  })

  it('maps the four screen diagonals clockwise without changing raw stick thresholds', () => {
    controller.setRotation(true)
    controller.poll([pad([], [0.3, -0.3])])
    expect([...input.nextSnapshot(1).held]).toEqual([])
    let frame = 1
    for (const [x, y, key] of [
      [0.8, -0.8, 'Up'],
      [0.8, 0.8, 'Right'],
      [-0.8, 0.8, 'Down'],
      [-0.8, -0.8, 'Left'],
    ] as const) {
      controller.poll([pad([], [x, y])])
      expect([...input.nextSnapshot(++frame).held]).toEqual([key])
    }
    controller.poll([pad([], [-0.25, -0.25])])
    expect([...input.nextSnapshot(++frame).held]).toEqual(['Left'])
    controller.poll([pad([], [-0.19, -0.19])])
    expect([...input.nextSnapshot(++frame).held]).toEqual([])
  })

  it('releases old sticks on rotation and rearms each device only after center, preserving other owners', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    controller.poll([pad([12], [0.8, -0.8]), pad([0], [-0.8, 0.8], 1)])
    input.nextSnapshot(1)
    controller.setRotation(true)
    expect([...input.nextSnapshot(2).held]).toEqual(['Right', 'Up', 'Confirm'])
    controller.poll([pad([12], [0.8, -0.8]), pad([0], [-0.8, 0.8], 1)])
    expect([...input.nextSnapshot(3).pressed]).toEqual([])
    controller.poll([pad([12]), pad([0], [-0.8, 0.8], 1)])
    controller.poll([pad([12], [0.8, 0.8]), pad([0], [-0.8, 0.8], 1)])
    expect([...input.nextSnapshot(4).held]).toEqual(['Up', 'Confirm', 'Right'])
    controller.poll([pad([12], [0.8, 0.8]), pad([0], [0, 0], 1)])
    controller.poll([pad([12], [0.8, 0.8]), pad([0], [-0.8, 0.8], 1)])
    expect([...input.nextSnapshot(5).held]).toEqual(['Up', 'Confirm', 'Right', 'Down'])
  })

  it('disconnect releases only gamepad holds and preserves the keyboard owner of the same key', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    controller.poll([pad([0, 14])])
    input.nextSnapshot(1)
    controller.poll([])
    const snap = input.nextSnapshot(2)
    expect([...snap.held]).toEqual(['Confirm'])
    expect([...snap.pressed]).toEqual([])
  })

  it('requires neutral after blur or tool blocking before accepting new presses', () => {
    controller.poll([pad([0])])
    input.nextSnapshot(1)
    controller.poll([pad([0])], false)
    expect([...input.nextSnapshot(2).held]).toEqual([])
    controller.poll([pad([0])])
    expect([...input.nextSnapshot(3).pressed]).toEqual([])
    controller.poll([pad()])
    controller.poll([pad([0])])
    expect([...input.nextSnapshot(4).pressed]).toEqual(['Confirm'])
  })

  it('ignores nonstandard layouts while accepting sparse standard gamepad slots', () => {
    controller.poll([{ ...pad([0]), mapping: '' }, null, pad([13], [0, 0], 3)])
    expect([...input.nextSnapshot(1).held]).toEqual(['Down'])
  })

  it('keeps another controller hold when one device disappears', () => {
    controller.poll([pad([0]), pad([0], [0, 0], 1)])
    input.nextSnapshot(1)
    controller.poll([null, pad([0], [0, 0], 1)])
    expect([...input.nextSnapshot(2).held]).toEqual(['Confirm'])
    controller.release()
    expect([...input.nextSnapshot(3).held]).toEqual([])
  })

  it('the browser adapter immediately releases a held stick on settings changes and waits for center', () => {
    let frame: FrameRequestCallback = () => {}
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    let pads = [pad([], [0.8, -0.6])]
    vi.stubGlobal('navigator', { getGamepads: () => pads })
    const stop = startGamepadInput(input, () => false)
    try {
      frame(1)
      expect([...input.nextSnapshot(1).held]).toEqual(['Right'])
      setInputRotated(true)
      expect([...input.nextSnapshot(2).held]).toEqual([])
      frame(2)
      expect([...input.nextSnapshot(3).held]).toEqual([])
      pads = [pad()]
      frame(3)
      pads = [pad([], [0.8, -0.6])]
      frame(4)
      expect([...input.nextSnapshot(4).held]).toEqual(['Up'])
      stop()
      expect([...input.nextSnapshot(5).held]).toEqual([])
    } finally {
      stop()
    }
  })
})
