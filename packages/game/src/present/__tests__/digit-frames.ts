import type { IndexedImage } from '../../assets/png.js'

/** 覆盖三色数字的 UI 槽 0..65；6×8 实心帧的索引等于槽号，每次返回独立可修改缓冲。 */
export function createDigitFrames(): IndexedImage[] {
  return Array.from({ length: 66 }, (_, slot) => ({
    width: 6,
    height: 8,
    indices: new Uint8Array(48).fill(slot),
    opaque: new Uint8Array(48).fill(1),
  }))
}
