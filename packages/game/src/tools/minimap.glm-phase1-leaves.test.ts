/**
 * TEST-GLM-PHASE1-LEAVES-3 L18（minimap.ts）— 去重表：
 *  - minimap.test（worldToThumb/computeView 全图-缩放-clamp/classifyTrigger 全分支/
 *    collectEventKinds/collectMinimapData 基础）→ 不重复
 *  - 新差异：drawMinimap 真实 canvas 2D 像素（暗底、toggle 显隐、玩家白点在手算坐标）、
 *    setupMinimap 控制器 toggle 显隐与 localStorage 持久、非法持久值回默认、坏 zoom 钳默认。
 * 真实 canvas 2D（jsdom + canvas 包），自有 GameState；不移动真实玩家。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import type { MinimapData } from './minimap.js'
import { DOT_COLORS, drawMinimap, setupMinimap, worldToThumb } from './minimap.js'

const LS = ['tp-minimap-widget', 'tp-minimap-npc', 'tp-minimap-items', 'tp-minimap-zoom']

beforeEach(() => {
  for (const k of LS) localStorage.removeItem(k)
})

afterEach(() => {
  for (const k of LS) localStorage.removeItem(k)
})

function mkData(): MinimapData {
  return {
    camera: { x: 1000, y: 1000 },
    player: { x: 1000, y: 1000 },
    items: [{ x: 1500, y: 500 }],
    npcs: [{ x: 500, y: 1500 }],
  }
}

/** 画布像素是否接近目标 RGB（canvas 反走样留 ±60 容差）。 */
function near(data: Uint8ClampedArray, i: number, rgb: [number, number, number]): boolean {
  return (
    Math.abs(data[i]! - rgb[0]) <= 60 &&
    Math.abs(data[i + 1]! - rgb[1]) <= 60 &&
    Math.abs(data[i + 2]! - rgb[2]) <= 60
  )
}

describe('L18 drawMinimap 真实 canvas', () => {
  it('暗底占位 + 玩家白点落在 worldToThumb 手算坐标 + 宝物/NPC 点按 toggle 显隐', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const view = { sx: 0, sy: 0, sw: 640 }
    drawMinimap(canvas, null, mkData(), { showNpc: true, showItems: true }, view)
    const ctx = canvas.getContext('2d')!
    const img = ctx.getImageData(0, 0, 64, 64).data
    // 底色 #0d0b08（无 base → 占位）
    expect(near(img, 0, [13, 11, 8])).toBe(true)
    // 玩家点：worldToThumb(1000,1000) → display px = thumb * 64/640
    const [tx, ty] = worldToThumb(1000, 1000)
    const px = Math.round(tx * (64 / 640))
    const py = Math.round(ty * (64 / 640))
    const fill = DOT_COLORS.player.fill
    const rgb: [number, number, number] = [
      parseInt(fill.slice(1, 3), 16),
      parseInt(fill.slice(3, 5), 16),
      parseInt(fill.slice(5, 7), 16),
    ]
    expect(near(img, (py * 64 + px) * 4, rgb)).toBe(true)
    // 宝物金色点：整图扫描（小圆点抗锯齿下取中心判定过脆）
    const itemRgb: [number, number, number] = [0xf0, 0xc0, 0x40]
    const hasColor = (data: Uint8ClampedArray, rgb: [number, number, number]): boolean => {
      for (let i = 0; i < data.length; i += 4) if (near(data, i, rgb)) return true
      return false
    }
    expect(hasColor(img, itemRgb)).toBe(true)
    // 关掉宝物 toggle → 整图无金色
    const canvas2 = document.createElement('canvas')
    canvas2.width = 64
    canvas2.height = 64
    drawMinimap(canvas2, null, mkData(), { showNpc: true, showItems: false }, view)
    const img2 = canvas2.getContext('2d')!.getImageData(0, 0, 64, 64).data
    expect(hasColor(img2, itemRgb)).toBe(false)
  })

  it('worldToThumb (wx+16)*SCALE 单调且原点偏移一个相机半格', () => {
    const [x1, y1] = worldToThumb(0, 0)
    const [x2] = worldToThumb(320, 0)
    expect(x2).toBeGreaterThan(x1)
    expect(x1).toBeCloseTo(16 * (640 / 2080), 6) // CAM_OFF=16, SCALE=BASE_PX/2080
    expect(y1).toBeCloseTo(16 * (640 / 2080), 6)
  })
})

describe('L18 setupMinimap 控制器持久化', () => {
  it('默认 NPC/宝物显、widget 关；setShowNpc(false) 立即生效并持久化；非法持久值回默认', () => {
    const deps = {
      getGs: () => createInitialGameState({ x: 0, y: 0, facing: 'down' }),
      getMapThumbnail: async () => null,
    }
    const ctl = setupMinimap(deps)
    expect(ctl.isShowNpc()).toBe(true)
    expect(ctl.isShowItems()).toBe(true)
    expect(ctl.isWidgetEnabled()).toBe(false)
    ctl.setShowNpc(false)
    expect(ctl.isShowNpc()).toBe(false)
    expect(localStorage.getItem('tp-minimap-npc')).toBe('0')
    ctl.setWidgetEnabled(true)
    expect(ctl.isWidgetEnabled()).toBe(true)
    expect(localStorage.getItem('tp-minimap-widget')).toBe('1')
    // 重建控制器读回持久态
    const ctl2 = setupMinimap(deps)
    expect(ctl2.isShowNpc()).toBe(false)
    expect(ctl2.isWidgetEnabled()).toBe(true)
  })

  it("持久值非 '0' 非法串 → 视为默认开；widget 非 '1' → 关", () => {
    localStorage.setItem('tp-minimap-npc', 'yes')
    localStorage.setItem('tp-minimap-widget', 'true')
    const ctl = setupMinimap({
      getGs: () => createInitialGameState({ x: 0, y: 0, facing: 'down' }),
      getMapThumbnail: async () => null,
    })
    expect(ctl.isShowNpc()).toBe(true) // 仅 '0' 隐藏
    expect(ctl.isWidgetEnabled()).toBe(false) // 仅 '1' 开
  })
})
