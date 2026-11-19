// Two one-pixel RGBA PNGs with different stored bytes.
export const originalPortrait =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQFYz9DwACZQGLUhCCkAAAAABJRU5ErkJggg=='
export const replacementPortrait =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNIErD8DwADLgGr8b9I7gAAAABJRU5ErkJggg=='

export function pngBytes(input: string): ArrayBuffer {
  return Uint8Array.from(atob(input), (character) => character.charCodeAt(0)).buffer
}
