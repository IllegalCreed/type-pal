/** Draws the caller's snapshot and borrowed thumbnail; owns no DOM mount, preferences or cache. */
import {
  type MinimapData,
  type MinimapView,
  SCALE,
  WHOLE_VIEW,
  worldToThumb,
} from './minimap-model.js'

// 16(缩略图 camera.y = -16)
const VIEW_W = 320

// viewport 世界像素宽(framebuffer.ts SCREEN_W)
const VIEW_H = 200

// ── 定位点配色(draw + 图例共用) ──────────────────────────────────────────────
export const DOT_COLORS = {
  player: { fill: '#ffffff', stroke: '#a01e1e' },
  npc: { fill: '#5fd0e0', stroke: '#13484f' },
  item: { fill: '#f0c040', stroke: '#6e5210' },
} as const

// ── 绘制 ──────────────────────────────────────────────────────────────────
function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke: string,
  lw = 1,
): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = lw
  ctx.strokeStyle = stroke
  ctx.stroke()
}

/** 显隐开关:NPC 点 / 宝物点 各自独立(可视白框 + 主角点恒画)。 */
export interface MinimapToggles {
  showNpc: boolean
  showItems: boolean
}

/**
 * 画小地图到方形 canvas(W=H,display 像素)。view=底图源方形(全图或主角居中缩放裁剪);
 * base=底图(null→暗底占位);toggles 控制 NPC/宝物点显隐;主角点 + 可视白框恒画。定位点用画布相对尺寸(不随缩放变形)。
 */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  base: CanvasImageSource | null,
  data: MinimapData,
  toggles: MinimapToggles,
  view: MinimapView = WHOLE_VIEW,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const { sx, sy, sw } = view
  const s = W / sw // display 像素 / 底图像素(缩放后)
  ctx.clearRect(0, 0, W, W)
  ctx.fillStyle = '#0d0b08'
  ctx.fillRect(0, 0, W, W)
  if (base) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(base, sx, sy, sw, sw, 0, 0, W, W)
  }
  const toPx = (wx: number, wy: number): [number, number] => {
    const [tx, ty] = worldToThumb(wx, wy)
    return [(tx - sx) * s, (ty - sy) * s]
  }
  // 可视区白框
  const [bx, by] = toPx(data.camera.x, data.camera.y)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.max(1, W * 0.008)
  ctx.strokeRect(bx, by, VIEW_W * SCALE * s, VIEW_H * SCALE * s)
  // 定位点半径:画布相对(全图视图房间小,点要小才不糊成一团)
  const rItem = Math.max(1.5, W * 0.01)
  const rNpc = Math.max(1.4, W * 0.009)
  const rPlayer = Math.max(2, W * 0.014)
  if (toggles.showItems) {
    for (const it of data.items) {
      const [x, y] = toPx(it.x, it.y)
      dot(ctx, x, y, rItem, DOT_COLORS.item.fill, DOT_COLORS.item.stroke)
    }
  }
  if (toggles.showNpc) {
    for (const n of data.npcs) {
      const [x, y] = toPx(n.x, n.y)
      dot(ctx, x, y, rNpc, DOT_COLORS.npc.fill, DOT_COLORS.npc.stroke)
    }
  }
  const [px, py] = toPx(data.player.x, data.player.y)
  dot(ctx, px, py, rPlayer, DOT_COLORS.player.fill, DOT_COLORS.player.stroke, 2)
}
