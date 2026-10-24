/** Dialogue drawing inputs: fresh buffers/flags per call, no renderer or global test state. */
import type { Item } from '@type-pal/shared'
import type { IndexedImage } from '../assets/png.js'

export function dialogSprite(width: number, height: number, color: number): IndexedImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(color),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

export function dialogItem(id: number, bitmap: number): Item {
  return {
    id,
    bitmap,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}
