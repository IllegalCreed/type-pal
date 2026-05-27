/**
 * M5.6 Step A:sdlpal `PAL_DrawNumber` 1:1 port — sprite-based digit blit。
 *
 * sdlpal 真值锚:[`reference/sdlpal/ui.c:640-732`](../../../reference/sdlpal/ui.c#L640-L732)
 *
 * Digit sprite 来源 = SPRITEUI(DATA.MKF chunk 9)— M4 P2.T3 已 dump 进
 * `images/ui/frame-NN.png`,通过 LoadedAssets.uiSpriteFrames 暴露。
 *
 * 颜色 base frame(sdlpal ui.c:677 真值):
 *   - kNumColorYellow → 19(0-9 共 10 frame,frame 19-28)
 *   - kNumColorBlue   → 29(frame 29-38)
 *   - kNumColorCyan   → 56(frame 56-65)
 *
 * 每 digit sprite **6×8 px**,blit 时按 sdlpal `x -= 6` 真值步进。
 *
 * Align 模式(sdlpal ui.c:708-721):
 *   - kNumAlignLeft:  x = pos.x - 6 + 6 * nActualLength(blit 起点最右 digit 位置)
 *   - kNumAlignMid:   x = pos.x - 6 + 3 * (nLength + nActualLength)
 *   - kNumAlignRight: x = pos.x - 6 + 6 * nLength(右对齐到 fixed-width nLength)
 *
 * blit 时 R-to-L:取 num%10 digit blit at (x, y),然后 x-=6,num/=10。
 */

import type { IndexedImage } from '../assets/png.js'
import type { Framebuffer } from './framebuffer.js'

export type NumColor = 'yellow' | 'blue' | 'cyan'
export type NumAlign = 'left' | 'mid' | 'right'

const FRAME_BASE: Record<NumColor, number> = {
  yellow: 19, // sdlpal ui.c:677 default
  blue: 29,
  cyan: 56,
}

const DIGIT_WIDTH = 6 // sdlpal ui.c:705 `x -= 6` / :719 `x += 6 * nLength`

/** sprite blit(opaque mask 决定哪些 pixel 写入)。 */
function blitDigitSprite(fb: Framebuffer, frame: IndexedImage, x: number, y: number): void {
  for (let dy = 0; dy < frame.height; dy++) {
    for (let dx = 0; dx < frame.width; dx++) {
      const srcIdx = dy * frame.width + dx
      if (frame.opaque[srcIdx]! > 0) {
        fb.writePixel(x + dx, y + dy, frame.indices[srcIdx]!)
      }
    }
  }
}

/**
 * 画数字 → fb。sdlpal `PAL_DrawNumber` 1:1 port。
 *
 * @param fb              目标 framebuffer
 * @param num             要画的数字
 * @param nLength         最大显示位数(超出 truncate 高位;不足 0 padding 否决,左/中对齐时不影响,右对齐用 nLength 算右起点)
 * @param pos             起 PAL_POS 坐标(sdlpal 真值 PAL_X / PAL_Y)
 * @param color           digit sprite 颜色(yellow / blue / cyan)
 * @param align           对齐模式
 * @param uiSpriteFrames  SPRITEUI(DATA.MKF chunk 9)全 frame 数组
 */
export function drawNumber(
  fb: Framebuffer,
  num: number,
  nLength: number,
  pos: { x: number; y: number },
  color: NumColor,
  align: NumAlign,
  uiSpriteFrames: IndexedImage[],
): void {
  const base = FRAME_BASE[color]

  // sdlpal ui.c:684-694:计算 actual length(num=0 时 nActualLength=1 — 至少画 1 位"0")
  let i = num
  let nActualLength = 0
  while (i > 0) {
    i = Math.floor(i / 10)
    nActualLength++
  }
  if (nActualLength > nLength) nActualLength = nLength
  else if (nActualLength === 0) nActualLength = 1

  // sdlpal ui.c:705-721:计算 blit 起 x(最右 digit 位置)
  let x = pos.x - DIGIT_WIDTH
  const y = pos.y
  switch (align) {
    case 'left':
      x += DIGIT_WIDTH * nActualLength
      break
    case 'mid':
      x += (DIGIT_WIDTH / 2) * (nLength + nActualLength)
      break
    case 'right':
      x += DIGIT_WIDTH * nLength
      break
  }

  // sdlpal ui.c:726-731:R-to-L blit
  let remaining = num
  let count = nActualLength
  while (count-- > 0) {
    const digit = remaining % 10
    const frame = uiSpriteFrames[base + digit]
    if (frame) {
      blitDigitSprite(fb, frame, x, y)
    }
    x -= DIGIT_WIDTH
    remaining = Math.floor(remaining / 10)
  }
}
