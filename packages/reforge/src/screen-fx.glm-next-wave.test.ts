/**
 * TEST-GLM-NEW-G-1 G06：screen-fx 残差（node 环境，canvas 只替外部 IO）。
 * 旧证（screen-fx.test.ts 波表/相位/震屏 + screen-fx.residual.test.ts 卷行/关闭态）
 * 已证 0 < shift < w 两段卷行、amp 关闭态、整行复制（shift 0）；本文件只补旧题
 * 未覆盖的 shift 轴臂（screen-fx.ts:73-79）：shift ≥ w 走整行复制 else 臂，
 * 以 0 < shift < w 两段卷行为同文件对照。仅纯派生输出与 drawImage 实参，
 * 不接剧情 E2E、不声称画面观感。
 *
 * Codex r1 审查（codex-review-G-07140f75.md）裁定移除并登记未证的两例（不回补）：
 * 「同 srcTag 换 source 返回旧缓存」「同缓存实例改 w/h 保留旧尺寸」——生产唯一
 * 调用方 battle-session.ts:2299-2322 以固定 320×200 + srcTag 表背景身份调用，
 * 两种输入无现行消费者证据，旧缓存行为可能是缺陷而非期望合同。
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { WavedBgCache } from './screen-fx.js'

function installCanvasHost(): { draws: unknown[][] } {
  const draws: unknown[][] = []
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0 }
      const ctx = {
        canvas,
        imageSmoothingEnabled: true,
        drawImage: (...args: unknown[]) => {
          draws.push(args)
        },
      }
      return { ...canvas, getContext: () => ctx }
    },
  })
  return { draws }
}

const source = { width: 16, height: 1, close() {} } as ImageBitmap

describe('G06 screen-fx 波动背景缓存残差', () => {
  beforeEach(() => installCanvasHost())
  afterEach(() => vi.unstubAllGlobals())

  test('shift ≥ w（小画布大波幅）走整行复制 else 臂；0<shift<w 对照两段卷行', () => {
    const { draws } = installCanvasHost()
    const cache = new WavedBgCache()
    // w=16、amp=128：wave[0]=trunc(60·128/256)=30 ≥ 16 → 单次整行复制。
    const wide = cache.render(source, 128, 0, 16, 1, 'probe')
    expect(draws).toHaveLength(1)
    expect(draws[0]).toEqual([source, 0, 0, 16, 1, 0, 0, 16, 1])
    expect(wide).not.toBe(source) // 有波 = 卷动后的缓存画布
    // 对照：amp=8 → shift=1 ∈ (0,16) → 两段卷行（旧题已证形状，此处锁小画布参数）。
    draws.length = 0
    const narrowCache = new WavedBgCache()
    narrowCache.render(source, 8, 0, 16, 1, 'probe')
    expect(draws).toHaveLength(2)
    expect(draws[0]).toEqual([source, 1, 0, 15, 1, 0, 0, 15, 1])
    expect(draws[1]).toEqual([source, 0, 0, 1, 1, 15, 0, 1, 1])
  })
})
