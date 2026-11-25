import type { LoadedBattleSpriteDefinition } from '../../assets.js'
import { expectDefined } from '../../defined.js'
import type { MenuAssets } from '../../menu/menu-box.js'

export function bitmap(width: number, height: number, color: string): ImageBitmap {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = expectDefined(canvas.getContext('2d'))
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return Object.assign(canvas, { close() {} })
}

export function battleCanvas(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  return expectDefined(canvas.getContext('2d'))
}

export const poseRed = (frame: number): number => (frame + 1) * 16
export const posePalette = {
  colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [
    index < 16 ? index * 16 : 0,
    0,
    0,
  ]),
  cycles: [],
}

/** 在每个真实 RLE 帧的顶部画不同颜色，观察实际使用的姿态和底点。 */
export function poseSprite(sprite: LoadedBattleSpriteDefinition): LoadedBattleSpriteDefinition {
  const frames = sprite.sprite.frames.map((frame, index) => ({
    ...frame,
    height: 8,
    pixels: new Uint8Array([index + 1, 0, 0, 0, 0, 0, 0, 0]),
    opaque: new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]),
  }))
  return { ...sprite, sprite: { ...sprite.sprite, frames } }
}

export function infoBoxAssets(): MenuAssets {
  const blank = bitmap(1, 1, 'transparent')
  const box = { tiles: Array.from({ length: 9 }, () => blank) }
  const digits = Array.from({ length: 10 }, () => blank)
  return {
    box,
    itembox: box,
    statusBg: blank,
    equipSlot: blank,
    scroll: box,
    nums: digits,
    avatar: undefined,
    numsBlue: digits,
    numsCyan: digits,
    slash: blank,
    itemIcons: {},
    redBox: box,
    magicPlayerBox: bitmap(75, 35, '#ff0000'),
    cursorGrid: blank,
    cursorUp: blank,
    cursorUpRed: blank,
    cursorDown: blank,
    settleArrow: blank,
    battleIcons: [],
  }
}
