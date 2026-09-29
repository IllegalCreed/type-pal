/**
 * TEST-GLM-NEW-G-1 G06：screen-fx 残差（node 环境，canvas 只替外部 IO）。
 * 旧证（screen-fx.test.ts 波表/相位/震屏 + screen-fx.residual.test.ts 卷行/关闭态）
 * 已证 0 < shift < w 两段卷行、amp 关闭态、整行复制（shift 0）；本文件只补旧题
 * 未覆盖的公开臂（screen-fx.ts:61-83）：
 *   1) shift ≥ w（小画布大波幅）走整行复制 else 臂；
 *   2) 缓存画布尺寸在首次烘焙时冻结：后续不同 w/h 实参不改变已缓存画布；
 *   3) 同 srcTag/amp/phase 下换 src 对象：命中缓存返回旧烘焙，不重卷。
 * 不接剧情 E2E、不声称画面观感；只断言纯派生输出与 drawImage 实参。
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { WavedBgCache } from './screen-fx.js'

interface DrawCall {
  source: unknown
  args: unknown[]
}

function installCanvasHost(): { draws: DrawCall[] } {
  const draws: DrawCall[] = []
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0 }
      const ctx = {
        canvas,
        imageSmoothingEnabled: true,
        drawImage: (...args: unknown[]) => {
          draws.push({ source: args[0], args })
        },
      }
      return { ...canvas, getContext: () => ctx }
    },
  })
  return { draws }
}

const sourceA = { width: 16, height: 1, close() {} } as ImageBitmap
const sourceB = { width: 16, height: 1, close() {} } as ImageBitmap

describe('G06 screen-fx 波动背景缓存残差', () => {
  beforeEach(() => installCanvasHost())
  afterEach(() => vi.unstubAllGlobals())

  test('shift ≥ w（小画布大波幅）走整行复制 else 臂；0<shift<w 对照两段卷行', () => {
    const { draws } = installCanvasHost()
    const cache = new WavedBgCache()
    // w=16、amp=128：wave[0]=trunc(60·128/256)=30 ≥ 16 → 单次整行复制。
    const wide = cache.render(sourceA, 128, 0, 16, 1, 'probe')
    expect(draws).toHaveLength(1)
    expect(draws[0]?.args).toEqual([sourceA, 0, 0, 16, 1, 0, 0, 16, 1])
    expect(wide).not.toBe(sourceA) // 有波 = 卷动后的缓存画布
    // 对照：amp=8 → shift=1 ∈ (0,16) → 两段卷行（旧题已证形状，此处锁小画布参数）。
    draws.length = 0
    const narrowCache = new WavedBgCache()
    narrowCache.render(sourceA, 8, 0, 16, 1, 'probe')
    expect(draws).toHaveLength(2)
    expect(draws[0]?.args).toEqual([sourceA, 1, 0, 15, 1, 0, 0, 15, 1])
    expect(draws[1]?.args).toEqual([sourceA, 0, 0, 1, 1, 15, 0, 1, 1])
  })

  test('缓存画布尺寸首次烘焙冻结：后续不同 w/h 实参复用旧画布', () => {
    const { draws } = installCanvasHost()
    const cache = new WavedBgCache()
    const first = cache.render(sourceA, 128, 0, 32, 2, 'freeze')
    const firstCanvas = first as { width: number; height: number }
    expect(firstCanvas.width).toBe(32)
    expect(firstCanvas.height).toBe(2)
    // 相位推进 + 更小 w/h 实参：键变化触发重卷，但画布实例与尺寸不变。
    draws.length = 0
    const second = cache.render(sourceA, 128, 40, 8, 8, 'freeze')
    expect(second).toBe(first)
    expect((second as { width: number }).width).toBe(32)
    expect(draws.length).toBeGreaterThan(0) // 确实按新相位重卷到同一画布
  })

  test('同 srcTag/amp/phase 换 src 对象：命中缓存返回旧烘焙，不重卷', () => {
    const { draws } = installCanvasHost()
    const cache = new WavedBgCache()
    const baked = cache.render(sourceA, 8, 0, 16, 1, 'same-tag')
    const drawsAfterFirst = draws.length
    expect(drawsAfterFirst).toBeGreaterThan(0)
    const stale = cache.render(sourceB, 8, 0, 16, 1, 'same-tag')
    expect(stale).toBe(baked) // 缓存键不含 src 身份：返回旧烘焙
    expect(draws.length).toBe(drawsAfterFirst) // 未重卷
  })
})
