/**
 * 战斗动画 overlay 渲染(D17a/D17)—— 画 state.battleAnim.overlay(s) 的单帧 effect / magic sprite。
 *
 * 对照 sdlpal:
 *   - effect(物理攻击命中)`fight.c:2183/2188`:底中 anchor blit lpEffectSprite。
 *   - magic(法术 FIRE.MKF)`fight.c:2760-2761`:`PAL_RLEBlitToSurface(*b, ...,
 *     PAL_XY(x - PAL_RLEGetWidth(*b)/2, y - PAL_RLEGetHeight(*b)))` —— 同底中 anchor。
 * 与战斗精灵同约定(画在 sprite 之上 UI 之下)。
 *
 * sprite 解析:
 *   - kind='effect':DATA.MKF chunk 10 lpEffectSprite → 传入 effectSprite。
 *   - kind='magic'  :FIRE.MKF chunk(overlay.spriteChunk = magic.effect)→ magicSprites.get(chunk)。
 * present 用 overlay.frameIdx 取帧。资源缺(loader 未注入)→ 跳过,不抛。
 */

import type { BattleAnimOverlay } from '../../core/battle/battle-state.js'
import type { Framebuffer } from '../framebuffer.js'
import type { SpriteAsset } from './draw-battle-sprites.js'

/** 把一帧 SpriteFrame 底中 anchor blit 到 framebuffer。 */
function blitFrame(
  fb: Framebuffer,
  sprite: SpriteAsset,
  frameIdx: number,
  x: number,
  y: number,
): void {
  const frame = sprite.frames[frameIdx]
  if (!frame) return
  // 底中 anchor:baseX = x - w/2,baseY = y - h(fight.c:2183/2188/2760)。
  const baseX = x - (frame.width >> 1)
  const baseY = y - frame.height
  for (let py = 0; py < frame.height; py++) {
    for (let px = 0; px < frame.width; px++) {
      const srcOff = py * frame.width + px
      if (frame.opaque[srcOff] === 0) continue
      fb.writePixel(baseX + px, baseY + py, frame.indices[srcOff]!)
    }
  }
}

/**
 * 画一帧 overlay effect sprite 到 framebuffer(kind='effect' 物理攻击命中特效)。
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
  blitFrame(fb, sprite, overlay.frameIdx, overlay.x, overlay.y)
}

/**
 * 画一帧 magic overlay 到 framebuffer(D17,kind='magic' 法术 FIRE.MKF sprite)。
 *
 * @param fb           屏幕 framebuffer
 * @param overlay      当前帧 magic overlay(spriteChunk = magic.effect,frameIdx = 帧循环 k,落点 x,y)
 * @param magicSprites FIRE.MKF chunk → SpriteAsset 表;缺 chunk → no-op(占位透明帧)
 */
export function drawBattleMagicOverlay(
  fb: Framebuffer,
  overlay: BattleAnimOverlay,
  magicSprites: Map<number, SpriteAsset> | undefined,
): void {
  const sprite = magicSprites?.get(overlay.spriteChunk)
  if (!sprite) return
  blitFrame(fb, sprite, overlay.frameIdx, overlay.x, overlay.y)
}
