/**
 * 战斗动画 overlay 渲染(D17a)—— 画 state.battleAnim.overlay 的单帧 effect / magic sprite。
 *
 * 对照 sdlpal `fight.c:2183/2188`:`PAL_RLEBlitToSurface(b, gpScreen,
 *   PAL_XY(x - PAL_RLEGetWidth(b)/2, y - PAL_RLEGetHeight(b)))` —— 底中 anchor,
 * 与战斗精灵同约定(画在 sprite 之上 UI 之下)。
 *
 * effect sprite = DATA.MKF chunk 10 lpEffectSprite(overlay.spriteChunk);
 * present 用 overlay.frameIdx 取帧。资源缺(loader 未注入 effectSprite)→ 跳过,不抛。
 */

import type { BattleAnimOverlay } from '../../core/battle/battle-state.js'
import type { Framebuffer } from '../framebuffer.js'
import type { SpriteAsset } from './draw-battle-sprites.js'

/**
 * 画一帧 overlay effect sprite 到 framebuffer。
 *
 * @param fb       屏幕 framebuffer
 * @param overlay  当前帧 overlay(spriteChunk + frameIdx + 落点 x,y)
 * @param sprite   该 chunk 的 SpriteAsset(frames);缺 → no-op
 */
export function drawBattleEffectOverlay(
  fb: Framebuffer,
  overlay: BattleAnimOverlay,
  sprite: SpriteAsset | undefined,
): void {
  if (!sprite) return
  const frame = sprite.frames[overlay.frameIdx]
  if (!frame) return
  // 底中 anchor:baseX = x - w/2,baseY = y - h(fight.c:2183/2188)。
  const baseX = overlay.x - (frame.width >> 1)
  const baseY = overlay.y - frame.height
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const srcOff = y * frame.width + x
      if (frame.opaque[srcOff] === 0) continue
      fb.writePixel(baseX + x, baseY + y, frame.indices[srcOff]!)
    }
  }
}
