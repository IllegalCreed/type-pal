/**
 * 战斗场景渲染(M4b-1)—— 画战斗背景 + 敌我精灵(idle 帧,底锚摆位)。
 * 背景 = FBP 真彩 RGBA(drawImage 铺底);精灵 = indexed RLE 帧经 bakeFrame 着色。
 * M4b-1 静态渲染;动画时间线/renderIdx 拍频 = M4b-3。
 */
import type { Palette } from '@type-pal/shared'
import type { LoadedSprite } from '../assets.js'
import { bakeFrame } from '../render.js'

/** 一个战斗单位的渲染项(精灵 + 底锚位置 + 当前帧下标)。 */
export interface BattleSpriteDraw {
  sprite: LoadedSprite
  /** 脚底中心坐标(320×200 逻辑屏)。 */
  x: number
  y: number
  /** 当前帧下标(idle=0;M4b-3 动画驱动改)。 */
  frame: number
}

export interface BattleScene {
  /** FBP 背景(320×200 真彩);缺 = 纯黑底。 */
  bg?: ImageBitmap
  enemies: BattleSpriteDraw[]
  players: BattleSpriteDraw[]
  /** 精灵着色调色板。 */
  palette: Palette
}

const VIEW_W = 320
const VIEW_H = 200

/**
 * 画一帧战斗场景到 ctx(逻辑 320×200 × worldScale)。
 * 顺序:背景 → 敌人(靠上先画)→ 队员(靠下后画),底锚对齐 = x 水平居中、y 脚底。
 */
export function renderBattleScene(ctx: CanvasRenderingContext2D, scene: BattleScene, worldScale: number): void {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.scale(worldScale, worldScale)
  // 背景铺底(缺则黑)
  if (scene.bg) ctx.drawImage(scene.bg, 0, 0, VIEW_W, VIEW_H)
  else {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }
  // 精灵:y 升序画(靠上的先,后画的盖前 → 近处遮远处)
  const all = [...scene.enemies, ...scene.players].sort((a, b) => a.y - b.y)
  for (const d of all) {
    const f = d.sprite.frames[d.frame] ?? d.sprite.frames[0]
    if (!f) continue
    const img = bakeFrame(f, scene.palette)
    ctx.drawImage(img, Math.round(d.x - f.width / 2), Math.round(d.y - f.height))
  }
  ctx.restore()
}
