/** Draw the battle background and depth-sorted sprites in logical 320×200 coordinates. */
import type { Palette } from '@type-pal/shared'
import type { LoadedSprite } from '../assets.js'
import { expectDefined } from '../defined.js'
import {
  applyDitherPaletteTransition,
  buildDitherPalettePlan,
  type DitherPalettePlan,
} from '../dither-transition.js'
import { bakeFrame } from '../render.js'
import { ENEMY_SUMMON_COLOR_SHIFT } from './battle-anim.js'

/** 一个战斗单位的渲染项(精灵 + 底锚位置 + 当前帧下标)。 */
export interface BattleSpriteDraw {
  sprite: LoadedSprite
  /** 脚底中心坐标(320×200 逻辑屏)。 */
  x: number
  y: number
  /** Frame index in the current sprite, including during playback. */
  frame: number
  /** 受击/演出染色等级(一阶段 iColorShift 1:1:索引低 4 位 + n 顶格,bakeFrame 内做;
   *  受击=6 时各部位提到各自色系亮档、层次保留)。0/缺省 = 无。 */
  colorShift?: number
  /** Opacity of this individual draw. Omission is fully opaque. */
  alpha?: number
}

/** 与敌我单位放进同一 Y-sort 队列的法术精灵（底中锚）。 */
export interface BattleDepthOverlayDraw {
  sprite: LoadedSprite
  x: number
  y: number
  frame: number
  /** 排序键 = y + layerOffset；实际绘制坐标仍使用 y。 */
  layerOffset: number
}

export interface BattleScene {
  /** FBP 背景(320×200,palette 着色后的 canvas);缺 = 纯黑底。 */
  bg?: CanvasImageSource
  enemies: BattleSpriteDraw[]
  players: BattleSpriteDraw[]
  /** MAGIC.special 对应的法术精灵；物理命中特效等仍由调用方在单位之后绘制。 */
  depthOverlays?: BattleDepthOverlayDraw[]
  /** 精灵着色调色板。 */
  palette: Palette
}

const VIEW_W = 320
const VIEW_H = 200

/** PAL_BattleFadeScene 混合两份冻结的战斗场景，战斗 UI 由调用方随后绘制。 */
export class BattleSceneFade {
  private canvas: HTMLCanvasElement | undefined
  private frames:
    | { source: ImageData; target: ImageData; output: ImageData; plan: DitherPalettePlan }
    | undefined

  reset(): void {
    this.frames = undefined
  }

  render(
    ctx: CanvasRenderingContext2D,
    sourceScene: BattleScene,
    targetScene: BattleScene,
    worldScale: number,
    step: number,
  ): void {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.canvas.width = VIEW_W
      this.canvas.height = VIEW_H
    }
    const scratch = expectDefined(this.canvas.getContext('2d', { willReadFrequently: true }))
    const pixels = VIEW_W * VIEW_H
    if (!this.frames) {
      renderBattleScene(scratch, sourceScene, 1)
      const source = scratch.getImageData(0, 0, VIEW_W, VIEW_H)
      renderBattleScene(scratch, targetScene, 1)
      const target = scratch.getImageData(0, 0, VIEW_W, VIEW_H)
      this.frames = {
        source,
        target,
        output: scratch.createImageData(VIEW_W, VIEW_H),
        plan: buildDitherPalettePlan(source.data, target.data, targetScene.palette.colors, pixels),
      }
    }
    const { source, target, output, plan } = this.frames
    applyDitherPaletteTransition(source.data, target.data, output.data, step, pixels, plan)
    scratch.putImageData(output, 0, 0)
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.canvas, 0, 0, VIEW_W * worldScale, VIEW_H * worldScale)
    ctx.restore()
  }
}

/** Paint the background, depth-sort both sides with overlays, then repaint tinted arrivals. */
export function renderBattleScene(
  ctx: CanvasRenderingContext2D,
  scene: BattleScene,
  worldScale: number,
): void {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.scale(worldScale, worldScale)
  // 背景铺底(缺则黑)
  if (scene.bg) ctx.drawImage(scene.bg, 0, 0, VIEW_W, VIEW_H)
  else {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }
  // 精灵 + magic overlay 统一按 y(+special) 升序；靠上的先画，近处遮远处。
  const all: Array<
    | { kind: 'enemy' | 'player'; x: number; sortY: number; draw: BattleSpriteDraw }
    | { kind: 'overlay'; x: number; sortY: number; draw: BattleDepthOverlayDraw }
  > = [
    // 同键时保持 overlay 先入列；稳定排序下单位随后覆盖，和一阶段 draw list 一致。
    ...(scene.depthOverlays ?? []).map((draw) => ({
      kind: 'overlay' as const,
      x: draw.x,
      sortY: draw.y + draw.layerOffset,
      draw,
    })),
    ...scene.enemies.map((draw) => ({
      kind: 'enemy' as const,
      x: draw.x,
      sortY: draw.y,
      draw,
    })),
    ...scene.players.map((draw) => ({
      kind: 'player' as const,
      x: draw.x,
      sortY: draw.y,
      draw,
    })),
  ].sort((a, b) => (a.sortY !== b.sortY ? a.sortY - b.sortY : b.x - a.x))
  const tintedSummons: Array<{ image: HTMLCanvasElement; x: number; y: number }> = []
  for (const d of all) {
    if (d.kind === 'overlay') {
      const f = d.draw.sprite.frames[d.draw.frame] ?? d.draw.sprite.frames[0]
      if (!f) continue
      const img = bakeFrame(f, scene.palette)
      ctx.drawImage(img, Math.round(d.draw.x - f.width / 2), Math.round(d.draw.y - f.height))
      continue
    }
    const draw = d.draw
    const f = draw.sprite.frames[draw.frame] ?? draw.sprite.frames[0]
    if (!f) continue
    // colorShift 直接在索引层做原版低 4 位偏移(bakeFrame 内;≠ 白色平涂,层次保留)
    const img = bakeFrame(f, scene.palette, draw.colorShift ?? 0)
    const dx = Math.round(draw.x - f.width / 2)
    const dy = Math.round(draw.y - f.height)
    const alpha = draw.alpha ?? 1
    if (alpha < 1) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, alpha)
      ctx.drawImage(img, dx, dy)
      ctx.restore()
    } else {
      ctx.drawImage(img, dx, dy)
      if (d.kind === 'enemy' && draw.colorShift === ENEMY_SUMMON_COLOR_SHIFT)
        tintedSummons.push({ image: img, x: dx, y: dy })
    }
  }
  // PAL_BattleDrawAllSprites overlays color-shifted sprites in the same depth
  // order. Enemy summon's tint reaches this painter during both fades and the hold.
  for (const { image, x, y } of tintedSummons) ctx.drawImage(image, x, y)
  ctx.restore()
}
