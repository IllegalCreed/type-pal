// Independent real-Canvas pixels for markers and source cropping; no controller host is installed.
import { describe, expect, it } from 'vitest'
import { drawMinimap, type MinimapData, type MinimapToggles } from './minimap.js'

function readPixel(ctx: CanvasRenderingContext2D, x: number, y: number): number[] {
  return Array.from(ctx.getImageData(x, y, 1, 1).data)
}
function markerData(): MinimapData {
  return {
    camera: { x: 1000, y: 1000 },
    player: { x: 1000, y: 1000 },
    items: [{ x: 1500, y: 500 }],
    npcs: [{ x: 500, y: 1500 }],
  }
}
describe('Minimap marker pixels and source crop', () => {
  it('暗底占位 + 玩家白点落在 worldToThumb 手算坐标 + 宝物/NPC 点按 toggle 显隐', () => {
    const draw = (toggles: MinimapToggles): CanvasRenderingContext2D => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 320
      drawMinimap(canvas, null, markerData(), toggles, { sx: 0, sy: 0, sw: 640 })
      return canvas.getContext('2d')!
    }
    // (world+16)*320/2080:玩家(156.31,156.31),宝物(233.23,79.38),NPC(79.38,233.23)。
    // 320画布使这些采样格完全在填充圆内,无需抗锯齿容差/整图颜色扫描。
    const all = draw({ showNpc: true, showItems: true })
    expect(readPixel(all, 0, 0)).toEqual([13, 11, 8, 255])
    expect(readPixel(all, 156, 156)).toEqual([255, 255, 255, 255])
    expect(readPixel(all, 233, 79)).toEqual([240, 192, 64, 255])
    expect(readPixel(all, 79, 233)).toEqual([95, 208, 224, 255])
    const noItems = draw({ showNpc: true, showItems: false })
    expect(readPixel(noItems, 233, 79)).toEqual([13, 11, 8, 255])
    expect(readPixel(noItems, 79, 233)).toEqual([95, 208, 224, 255])
    const noNpc = draw({ showNpc: false, showItems: true })
    expect(readPixel(noNpc, 79, 233)).toEqual([13, 11, 8, 255])
    expect(readPixel(noNpc, 233, 79)).toEqual([240, 192, 64, 255])
  })

  it('非全图 view 使用指定底图裁剪区域', () => {
    const base = document.createElement('canvas')
    base.width = base.height = 640
    const source = base.getContext('2d')!
    source.fillStyle = '#102030'
    source.fillRect(0, 0, 640, 640)
    source.fillStyle = '#123abc'
    source.fillRect(100, 120, 320, 320)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const offscreen = { x: -1000, y: -1000 }
    drawMinimap(
      canvas,
      base,
      { player: offscreen, camera: offscreen, npcs: [], items: [] },
      { showNpc: false, showItems: false },
      { sx: 100, sy: 120, sw: 320 },
    )
    // 输出(5,5)采样源窗口内部蓝色;若误画整图,此处落在窗口外暗底。
    expect(readPixel(canvas.getContext('2d')!, 5, 5)).toEqual([18, 58, 188, 255])
  })
})
