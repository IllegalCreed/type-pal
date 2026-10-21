import type { AbstractKey } from '@type-pal/shared'

export interface TouchInput {
  press(key: AbstractKey, contact: string): void
  release(contact: string): void
}

const actions = new WeakMap<HTMLButtonElement, AbstractKey>()
interface TouchContact {
  button: HTMLButtonElement | null
  pad: HTMLElement | null
}

/** One captured contact owns its action until release/cancel, including a slide across the pad. */
export function bindTouchControls(root: HTMLElement, input: TouchInput): () => void {
  const pointers = new Map<number, TouchContact>()
  const buttons = (): NodeListOf<HTMLButtonElement> => root.querySelectorAll('button[data-action]')
  const refresh = (): void => {
    for (const button of buttons()) {
      button.classList.toggle(
        'is-held',
        [...pointers.values()].some((p) => p.button === button),
      )
    }
  }
  const actionButton = (target: EventTarget | null): HTMLButtonElement | null => {
    const button = target instanceof Element ? target.closest('button[data-action]') : null
    return button instanceof HTMLButtonElement && root.contains(button) && actions.has(button)
      ? button
      : null
  }
  const change = (id: number, button: HTMLButtonElement | null, pad: HTMLElement | null): void => {
    if (pointers.has(id) && pointers.get(id)?.button === button) return
    input.release(`touch:${id}`)
    pointers.set(id, { button, pad })
    const key = button ? actions.get(button) : undefined
    if (key) input.press(key, `touch:${id}`)
    refresh()
  }
  const directionButton = (
    pad: HTMLElement,
    x: number,
    y: number,
    dragging: boolean,
  ): HTMLButtonElement | null => {
    const rect = pad.getBoundingClientRect()
    const dx = x - rect.left - rect.width / 2
    const dy = y - rect.top - rect.height / 2
    const distance = Math.hypot(dx, dy)
    // A quiet center stops walking; an expanded held radius tolerates a thumb drifting off the rim.
    if (distance < rect.width * 0.13 || distance > rect.width * (dragging ? 0.75 : 0.5)) return null
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Right' : 'Left') : dy > 0 ? 'Down' : 'Up'
    return (
      [...pad.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => actions.get(button) === key,
      ) ?? null
    )
  }
  const release = (id: number): void => {
    pointers.delete(id)
    input.release(`touch:${id}`)
    refresh()
  }
  const down = (event: PointerEvent): void => {
    if (event.button !== 0 || !(event.target instanceof Element)) return
    const pad = event.target.closest<HTMLElement>('.tp-dpad')
    if (pad && root.contains(pad)) {
      event.preventDefault()
      pad.setPointerCapture(event.pointerId)
      change(event.pointerId, directionButton(pad, event.clientX, event.clientY, false), pad)
      return
    }
    const button = actionButton(event.target)
    if (!button || button.disabled) return
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    change(event.pointerId, button, null)
  }
  const move = (event: PointerEvent): void => {
    const pad = pointers.get(event.pointerId)?.pad
    if (pad) change(event.pointerId, directionButton(pad, event.clientX, event.clientY, true), pad)
  }
  const up = (event: PointerEvent): void => release(event.pointerId)
  const click = (event: MouseEvent): void => {
    // Keyboard / assistive activation has no pointerdown; pointer clicks already emitted an edge.
    const button = actionButton(event.target)
    if (!button || button.disabled || event.detail !== 0) return
    const key = actions.get(button)
    if (key) {
      input.press(key, 'touch:activation')
      input.release('touch:activation')
    }
  }
  const keyActivation = (event: KeyboardEvent): void => {
    if (!actionButton(event.target)) return
    if (event.code !== 'Space' && event.code !== 'Enter' && event.code !== 'NumpadEnter') return
    // Native button activation emits its own click; the global keyboard source must not emit too.
    event.stopPropagation()
    if (event.repeat) event.preventDefault()
  }
  const clear = (): void => {
    for (const id of pointers.keys()) input.release(`touch:${id}`)
    pointers.clear()
    refresh()
  }
  const visibility = (): void => {
    if (document.hidden) clear()
  }
  root.addEventListener('pointerdown', down)
  root.addEventListener('pointermove', move)
  root.addEventListener('pointerup', up)
  root.addEventListener('pointercancel', up)
  root.addEventListener('lostpointercapture', up)
  root.addEventListener('click', click)
  root.addEventListener('keydown', keyActivation)
  window.addEventListener('blur', clear)
  document.addEventListener('visibilitychange', visibility)
  return () => {
    clear()
    root.removeEventListener('pointerdown', down)
    root.removeEventListener('pointermove', move)
    root.removeEventListener('pointerup', up)
    root.removeEventListener('pointercancel', up)
    root.removeEventListener('lostpointercapture', up)
    root.removeEventListener('click', click)
    root.removeEventListener('keydown', keyActivation)
    window.removeEventListener('blur', clear)
    document.removeEventListener('visibilitychange', visibility)
  }
}

export function createTouchButton(key: AbstractKey, label: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.action = key
  button.textContent = label
  actions.set(button, key)
  return button
}
