/** Native events only; each test owns the attached KeyboardInputSource and its detach. */
export function keyDown(
  target: { dispatchEvent: (e: Event) => boolean },
  code: string,
  repeat = false,
) {
  const event = new KeyboardEvent('keydown', { code, repeat })
  target.dispatchEvent(event)
}

export function keyUp(target: { dispatchEvent: (e: Event) => boolean }, code: string) {
  const event = new KeyboardEvent('keyup', { code })
  target.dispatchEvent(event)
}
