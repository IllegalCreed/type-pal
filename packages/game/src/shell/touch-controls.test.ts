import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeyboardInputSource } from './input.js'
import { setInputRotated } from './input-rotation.js'
import { bindTouchControls, createTouchButton } from './touch-controls.js'

describe('touch controls through the live input source', () => {
  let input: KeyboardInputSource
  let root: HTMLDivElement
  let right: HTMLButtonElement
  let confirm: HTMLButtonElement
  let unbind: () => void
  beforeEach(() => {
    setInputRotated(false)
    input = new KeyboardInputSource(window)
    root = document.createElement('div')
    right = createTouchButton('Right', '向右')
    confirm = createTouchButton('Confirm', '确认')
    // jsdom has no browser pointer-capture implementation; input and event routing stay real.
    for (const button of [right, confirm]) button.setPointerCapture = vi.fn()
    root.append(right, confirm)
    document.body.append(root)
    unbind = bindTouchControls(root, input)
  })
  afterEach(() => {
    unbind()
    setInputRotated(false)
    localStorage.removeItem('tp-input-rotation')
    input.detach()
    root.remove()
    vi.restoreAllMocks()
  })
  const pointer = (button: HTMLElement, type: string, pointerId: number): void => {
    button.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId, button: 0 }))
  }

  const directionPad = (): HTMLDivElement => {
    const pad = document.createElement('div')
    pad.className = 'tp-dpad'
    pad.setPointerCapture = vi.fn()
    pad.append(
      createTouchButton('Up', '向上'),
      createTouchButton('Left', '向左'),
      right,
      createTouchButton('Down', '向下'),
    )
    root.append(pad)
    vi.spyOn(pad, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 150, 150))
    return pad
  }
  const point = (pad: HTMLElement, type: string, x: number, y: number): void => {
    pad.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerId: 5, button: 0, clientX: x, clientY: y }),
    )
  }

  it('a tap between logic ticks latches one press, without a duplicate click edge', () => {
    pointer(confirm, 'pointerdown', 1)
    pointer(confirm, 'pointerup', 1)
    const tap = input.nextSnapshot(1)
    expect([...tap.pressed]).toEqual(['Confirm'])
    expect([...tap.held]).toEqual([])
    confirm.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect([...input.nextSnapshot(2).pressed]).toEqual([])
  })

  it('native keyboard button activation does not also enter the global keyboard source', () => {
    let frame = 0
    for (const code of ['Space', 'Enter', 'NumpadEnter']) {
      confirm.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }))
      expect([...input.nextSnapshot(++frame).pressed]).toEqual([])
      confirm.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))
      confirm.click()
      expect([...input.nextSnapshot(++frame).pressed]).toEqual(['Confirm'])
    }
    const repeat = new KeyboardEvent('keydown', {
      code: 'Enter',
      bubbles: true,
      cancelable: true,
      repeat: true,
    })
    confirm.dispatchEvent(repeat)
    expect(repeat.defaultPrevented).toBe(true)
    confirm.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }))
    expect([...input.nextSnapshot(++frame).pressed]).toEqual(['Right'])
    confirm.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', bubbles: true }))
    // The containing game surface still receives ordinary keyboard confirmation.
    root.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }))
    expect([...input.nextSnapshot(++frame).pressed]).toEqual(['Confirm'])
    root.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', bubbles: true }))
  })

  it('releasing touch does not release a matching physical keyboard hold', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    input.nextSnapshot(1)
    pointer(right, 'pointerdown', 1)
    pointer(right, 'pointerup', 1)
    const held = input.nextSnapshot(2)
    expect([...held.held]).toEqual(['Right'])
    expect([...held.pressed]).toEqual([])
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }))
    expect([...input.nextSnapshot(3).held]).toEqual([])
  })

  it('cancelling one finger preserves the other finger and clears only its visual hold', () => {
    pointer(right, 'pointerdown', 1)
    pointer(confirm, 'pointerdown', 2)
    input.nextSnapshot(1)
    pointer(right, 'pointercancel', 1)
    expect([...input.nextSnapshot(2).held]).toEqual(['Confirm'])
    expect(right.classList.contains('is-held')).toBe(false)
    expect(confirm.classList.contains('is-held')).toBe(true)
    pointer(confirm, 'lostpointercapture', 2)
    expect([...input.nextSnapshot(3).held]).toEqual([])
  })

  it('releasing a newer keyboard alias restores touch direction priority over the older alias', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
    pointer(right, 'pointerdown', 1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Numpad8' }))
    expect([...input.nextSnapshot(1).held]).toEqual(['Right', 'Up'])
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Numpad8' }))
    expect([...input.nextSnapshot(2).held]).toEqual(['Up', 'Right'])
  })

  it('window blur releases physical and touch holds and unconsumed presses', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
    pointer(confirm, 'pointerdown', 2)
    window.dispatchEvent(new Event('blur'))
    const snap = input.nextSnapshot(1)
    expect([...snap.held]).toEqual([])
    expect([...snap.pressed]).toEqual([])
    expect(confirm.classList.contains('is-held')).toBe(false)
  })

  it('tool input blocking clears old holds and requires a new press after closing', () => {
    pointer(right, 'pointerdown', 1)
    input.setEnabled(false)
    pointer(confirm, 'pointerdown', 2)
    input.setEnabled(true)
    const closed = input.nextSnapshot(1)
    expect([...closed.held]).toEqual([])
    expect([...closed.pressed]).toEqual([])
    pointer(confirm, 'pointerup', 2)
    pointer(confirm, 'pointerdown', 3)
    expect([...input.nextSnapshot(2).pressed]).toEqual(['Confirm'])
  })

  it('assistive click activation emits a tap without needing pointer events', () => {
    confirm.click()
    const snap = input.nextSnapshot(1)
    expect([...snap.pressed]).toEqual(['Confirm'])
    expect([...snap.held]).toEqual([])
  })

  it('disposing a touch surface releases its contacts and removes event producers', () => {
    pointer(right, 'pointerdown', 1)
    input.nextSnapshot(1)
    unbind()
    pointer(confirm, 'pointerdown', 2)
    const snap = input.nextSnapshot(2)
    expect([...snap.held]).toEqual([])
    expect([...snap.pressed]).toEqual([])
  })

  it('a held thumb slides between four directions, stops in the center, and resumes after leaving the rim', () => {
    const pad = directionPad()
    const slide = (type: string, x: number, y: number): void => {
      pad.dispatchEvent(
        new PointerEvent(type, { bubbles: true, pointerId: 5, button: 0, clientX: x, clientY: y }),
      )
    }
    slide('pointerdown', 75, 10)
    expect([...input.nextSnapshot(1).held]).toEqual(['Up'])
    slide('pointermove', 10, 75)
    expect([...input.nextSnapshot(2).held]).toEqual(['Left'])
    slide('pointermove', 75, 75)
    expect([...input.nextSnapshot(3).held]).toEqual([])
    slide('pointermove', 250, 75)
    expect([...input.nextSnapshot(4).held]).toEqual([])
    slide('pointermove', 140, 75)
    expect([...input.nextSnapshot(5).held]).toEqual(['Right'])
    slide('pointerup', 140, 75)
    expect([...input.nextSnapshot(6).held]).toEqual([])
  })

  it('maps four clockwise touch sectors while preserving the circular rim and quiet center', () => {
    const pad = directionPad()
    setInputRotated(true)
    point(pad, 'pointerdown', 135, 15)
    expect([...input.nextSnapshot(1).held]).toEqual([])
    point(pad, 'pointerup', 135, 15)
    point(pad, 'pointerdown', 120, 30)
    expect([...input.nextSnapshot(2).held]).toEqual(['Up'])
    point(pad, 'pointermove', 120, 120)
    expect([...input.nextSnapshot(3).held]).toEqual(['Right'])
    point(pad, 'pointermove', 30, 120)
    expect([...input.nextSnapshot(4).held]).toEqual(['Down'])
    point(pad, 'pointermove', 30, 30)
    expect([...input.nextSnapshot(5).held]).toEqual(['Left'])
    point(pad, 'pointermove', 75, 75)
    expect([...input.nextSnapshot(6).held]).toEqual([])
    point(pad, 'pointermove', 74, 10)
    expect([...input.nextSnapshot(7).held]).toEqual(['Left'])
    point(pad, 'pointermove', 76, 10)
    expect([...input.nextSnapshot(8).held]).toEqual(['Up'])
  })

  it('rotation releases old touch contacts and requires a fresh touch without releasing keyboard ownership', () => {
    const pad = directionPad()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    point(pad, 'pointerdown', 75, 10)
    pointer(confirm, 'pointerdown', 2)
    input.nextSnapshot(1)
    setInputRotated(true)
    expect([...input.nextSnapshot(2).held]).toEqual(['Right'])
    expect(root.querySelectorAll('.is-held')).toHaveLength(0)
    point(pad, 'pointermove', 120, 30)
    expect([...input.nextSnapshot(3).pressed]).toEqual([])
    point(pad, 'pointerup', 120, 30)
    point(pad, 'pointerdown', 120, 30)
    expect([...input.nextSnapshot(4).held]).toEqual(['Right', 'Up'])
  })
})
