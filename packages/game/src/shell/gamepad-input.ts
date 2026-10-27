import type { AbstractKey } from '@type-pal/shared'
import type { KeyboardInputSource } from './input.js'
import { inputDirection } from './input-direction.js'
import { INPUT_ROTATION_CHANGE, isInputRotated } from './input-rotation.js'

type ActionSink = Pick<KeyboardInputSource, 'press' | 'release'>

export type GamepadState = Pick<Gamepad, 'index' | 'mapping' | 'connected' | 'axes' | 'buttons'>
const BUTTONS = new Map<number, AbstractKey>([
  [0, 'Confirm'],
  [1, 'Menu'],
  [9, 'Menu'],
  [12, 'Up'],
  [13, 'Down'],
  [14, 'Left'],
  [15, 'Right'],
])

/** Poll transitions only; a held button must not reorder directions or emit repeated presses. */
export class GamepadInputController {
  private readonly contacts = new Map<string, AbstractKey>()
  private readonly sticks = new Map<number, AbstractKey>()
  private waitForNeutral = false
  private readonly waitingSticks = new Set<number>()
  private rotated = isInputRotated()
  constructor(private readonly input: ActionSink) {}

  setRotation(rotated: boolean): void {
    if (rotated === this.rotated) return
    this.rotated = rotated
    for (const index of this.sticks.keys()) {
      const contact = `gamepad:${index}:stick`
      this.input.release(contact)
      this.contacts.delete(contact)
      this.waitingSticks.add(index)
    }
    this.sticks.clear()
  }

  poll(pads: readonly (GamepadState | null)[], active = true): void {
    const desired = new Map<string, AbstractKey>()
    const stickDirections = new Map<number, AbstractKey>()
    for (const pad of pads) {
      if (!pad?.connected || pad.mapping !== 'standard') continue
      for (const [index, key] of BUTTONS) {
        if (pad.buttons[index]?.pressed) desired.set(`gamepad:${pad.index}:button:${index}`, key)
      }
      const x = pad.axes[0] ?? 0
      const y = pad.axes[1] ?? 0
      const magnitude = Math.max(Math.abs(x), Math.abs(y))
      if (this.waitingSticks.has(pad.index)) {
        if (magnitude >= 0.2) continue
        this.waitingSticks.delete(pad.index)
      }
      const threshold = this.sticks.has(pad.index) ? 0.2 : 0.35
      if (magnitude >= threshold) {
        const key = inputDirection(x, y, this.rotated)
        stickDirections.set(pad.index, key)
        desired.set(`gamepad:${pad.index}:stick`, key)
      }
    }
    for (const index of this.waitingSticks) {
      if (!pads.some((pad) => pad?.connected && pad.index === index))
        this.waitingSticks.delete(index)
    }
    if (!active) {
      this.release()
      this.waitForNeutral = true
      return
    }
    if (this.waitForNeutral) {
      if (desired.size) return
      this.waitForNeutral = false
    }
    for (const [contact, key] of this.contacts) {
      if (desired.get(contact) !== key) this.input.release(contact)
    }
    for (const [contact, key] of desired) {
      if (this.contacts.get(contact) !== key) this.input.press(key, contact)
    }
    this.contacts.clear()
    for (const [contact, key] of desired) this.contacts.set(contact, key)
    this.sticks.clear()
    for (const [index, key] of stickDirections) this.sticks.set(index, key)
  }

  release(): void {
    for (const contact of this.contacts.keys()) this.input.release(contact)
    this.contacts.clear()
    this.sticks.clear()
  }
}

/** Browser polling runs at display cadence, before the slower game logic consumes its snapshot. */
export function startGamepadInput(input: ActionSink, isBlocked: () => boolean): () => void {
  const controller = new GamepadInputController(input)
  let available = typeof navigator.getGamepads === 'function'
  const poll = (): void => {
    let pads: readonly (Gamepad | null)[] = []
    if (available) {
      try {
        pads = navigator.getGamepads()
      } catch {
        // Permissions Policy / unsupported host: no repeated exception on every animation frame.
        available = false
      }
    }
    controller.poll(pads, !document.hidden && document.hasFocus() && !isBlocked())
    frame = window.requestAnimationFrame(poll)
  }
  const rotation = (): void => controller.setRotation(isInputRotated())
  const blur = (): void => controller.poll([], false)
  const visibility = (): void => {
    if (document.hidden) blur()
  }
  window.addEventListener(INPUT_ROTATION_CHANGE, rotation)
  window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', visibility)
  let frame = window.requestAnimationFrame(poll)
  return () => {
    window.cancelAnimationFrame(frame)
    window.removeEventListener(INPUT_ROTATION_CHANGE, rotation)
    window.removeEventListener('blur', blur)
    document.removeEventListener('visibilitychange', visibility)
    controller.release()
  }
}
