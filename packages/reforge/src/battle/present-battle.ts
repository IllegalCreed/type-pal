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
  /** 受击/演出染色等级(一阶段 iColorShift 的 RGBA 等价:向白混合 n/6×85%;
   *  受击闪白=6 近乎全白,召唤渐升)。0/缺省 = 无。 */
  colorShift?: number
  /** 不透明度(缺省 1;死亡改走 dissolve)。 */
  alpha?: number
  /** 死亡颗粒溶解进度 0..1(原版 PAL_BattleFadeScene 72 步 dither 的形态等效;
   *  曾 alpha 渐隐,作者报观感怪 → 逐波像素消融)。 */
  dissolve?: number
}

export interface BattleScene {
  /** FBP 背景(320×200,palette 着色后的 canvas);缺 = 纯黑底。 */
  bg?: CanvasImageSource
  enemies: BattleSpriteDraw[]
  players: BattleSpriteDraw[]
  /** 精灵着色调色板。 */
  palette: Palette
}

const VIEW_W = 320
const VIEW_H = 200

// ── 死亡颗粒溶解(原版 PAL_BattleFadeScene 72 步 dither 的 RGBA 形态等效)──
// 像素 6 相位分类((x+2y)%6,周期 6×3),按原版批次序 rgIndex={0,3,1,5,2,4} 逐波
// 消融;波内线性过渡防 6 级跳变。punch 用 destination-out + 相位 pattern。
const DISSOLVE_ORDER = [0, 3, 1, 5, 2, 4] as const
let dissolvePatterns: CanvasPattern[] | null = null
let dissolveScratch: HTMLCanvasElement | null = null

function getDissolvePatterns(ctx: CanvasRenderingContext2D): CanvasPattern[] | null {
  if (dissolvePatterns) return dissolvePatterns
  const pats: CanvasPattern[] = []
  for (let c = 0; c < 6; c++) {
    const tile = document.createElement('canvas')
    tile.width = 6
    tile.height = 3
    const tctx = tile.getContext('2d')
    if (!tctx) return null
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 6; x++)
        if ((x + 2 * y) % 6 === c) tctx.fillRect(x, y, 1, 1)
    const p = ctx.createPattern(tile, 'repeat')
    if (!p) return null
    pats.push(p)
  }
  dissolvePatterns = pats
  return pats
}

/** 按溶解进度画精灵:已落波相位像素消失,进行中波按余量半透明。(死亡/召唤 crossfade 共用) */
export function drawDissolved(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  dx: number,
  dy: number,
  progress: number,
): void {
  const p = Math.min(1, Math.max(0, progress))
  const pats = getDissolvePatterns(ctx)
  if (!pats) {
    // pattern 不可用(极端环境):退化 alpha
    ctx.save()
    ctx.globalAlpha = 1 - p
    ctx.drawImage(img, dx, dy)
    ctx.restore()
    return
  }
  if (!dissolveScratch) dissolveScratch = document.createElement('canvas')
  const off = dissolveScratch
  if (off.width < img.width) off.width = img.width
  if (off.height < img.height) off.height = img.height
  const octx = off.getContext('2d')
  if (!octx) return
  octx.save()
  octx.clearRect(0, 0, off.width, off.height)
  octx.drawImage(img, 0, 0)
  octx.globalCompositeOperation = 'destination-out'
  const waves = p * 6
  const full = Math.floor(waves)
  for (let j = 0; j < full && j < 6; j++) {
    octx.fillStyle = pats[DISSOLVE_ORDER[j]!]!
    octx.fillRect(0, 0, img.width, img.height)
  }
  if (full < 6) {
    octx.globalAlpha = waves - full // 波内线性余量
    octx.fillStyle = pats[DISSOLVE_ORDER[full]!]!
    octx.fillRect(0, 0, img.width, img.height)
  }
  octx.restore()
  ctx.drawImage(off, 0, 0, img.width, img.height, dx, dy, img.width, img.height)
}

// ── 受击/演出闪白(iColorShift 的 RGBA 等效:精灵形状内向白混合)──
let flashScratch: HTMLCanvasElement | undefined

/** 返回叠了白色(强度 t∈0..1,峰值 85% 白)的精灵离屏;t≤0 原样返回。 */
function withWhiteFlash(img: CanvasImageSource & { width: number; height: number }, t: number): CanvasImageSource {
  if (t <= 0) return img
  if (!flashScratch) flashScratch = document.createElement('canvas')
  const off = flashScratch
  if (off.width < img.width) off.width = img.width
  if (off.height < img.height) off.height = img.height
  const octx = off.getContext('2d')
  if (!octx) return img
  octx.save()
  octx.clearRect(0, 0, off.width, off.height)
  octx.drawImage(img, 0, 0)
  octx.globalCompositeOperation = 'source-atop' // 只染精灵不透明像素
  octx.fillStyle = `rgba(255,255,255,${(t * 0.85).toFixed(3)})`
  octx.fillRect(0, 0, img.width, img.height)
  octx.restore()
  // scratch 只增不减;超出 img 的区域已 clear 为透明,调用方整图 drawImage 无残影
  return off
}

/**
 * 画一帧战斗场景到 ctx(逻辑 320×200 × worldScale)。
 * 顺序:背景 → 敌人(靠上先画)→ 队员(靠下后画),底锚对齐 = x 水平居中、y 脚底。
 */
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
  // 精灵:y 升序画(靠上的先,后画的盖前 → 近处遮远处)
  const all = [...scene.enemies, ...scene.players].sort((a, b) => a.y - b.y)
  for (const d of all) {
    const f = d.sprite.frames[d.frame] ?? d.sprite.frames[0]
    if (!f) continue
    const img = bakeFrame(f, scene.palette)
    const dx = Math.round(d.x - f.width / 2)
    const dy = Math.round(d.y - f.height)
    if (d.dissolve !== undefined) {
      drawDissolved(ctx, img, dx, dy, d.dissolve) // 死亡颗粒溶解(原版 dither 形态)
      continue
    }
    const alpha = d.alpha ?? 1
    const shift = d.colorShift ?? 0
    if (shift > 0 || alpha < 1) {
      ctx.save()
      if (alpha < 1) ctx.globalAlpha = Math.max(0, alpha)
      // iColorShift = 原版调色板低 4 位加 shift 顶格(palcommon.c:398-411,经一阶段
      // blitFrame):同色相内亮度顶满 → 观感「闪白」(shift6 时人物近乎全白,作者原版
      // 行军丹截图佐证)。RGBA 等效 = 向白混合;此前 brightness() 乘性提亮对暗色像素
      // 几乎无效、闪不白 = 作者报「动画别扭」的一环。上传素材(quantize 调色板无 band
      // 结构)不宜做索引位移,白混对两类素材观感统一。
      ctx.drawImage(withWhiteFlash(img, Math.min(shift, 6) / 6), dx, dy)
      ctx.restore()
    } else {
      ctx.drawImage(img, dx, dy)
    }
  }
  ctx.restore()
}
