/**
 * sdlpal `PAL_DrawNumber` 的数字精灵布局；TS 资源表缺帧时跳过该位，仍保留位间距。
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
import { blitSpriteOpaque } from './blit-indexed-sprite.js'
import type { Framebuffer } from './framebuffer.js'

export type NumColor = 'yellow' | 'blue' | 'cyan'
export type NumAlign = 'left' | 'mid' | 'right'

const FRAME_BASE: Record<NumColor, number> = {
  yellow: 19, // sdlpal ui.c:677 default
  blue: 29,
  cyan: 56,
}

const DIGIT_WIDTH = 6 // sdlpal ui.c:705 `x -= 6` / :719 `x += 6 * nLength`

/**
 * 将非负有限整数按 PAL_DrawNumber 布局写入 fb；非有限值跳过，其余输入由caller负责。
 *
 * @param fb              目标 framebuffer
 * @param num             要画的数字
 * @param nLength         显示槽数(超出截去高位，不补前导零；中/右对齐参与定位，左对齐仅影响截断)
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
  // TS派生值可从有限输入溢出；跳过异常数字，避免位数循环阻塞整帧。
  if (!Number.isFinite(num)) return
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
      blitSpriteOpaque(fb, frame, x, y)
    }
    x -= DIGIT_WIDTH
    remaining = Math.floor(remaining / 10)
  }
}
