// Q-NEXT2（r22 有限批）· dither-transition 十四条程序化合同（Codex next2 packet 核定清单）。
//
// 排重 basis（旧 dither-transition.test.ts + corpus dupcheck 0 命中）：
// - 旧 palette 基表 256 条全 unique（红=index）——重复 exact RGB 取首索引、最近色
//   G/B 距离、同距取先、非精确零索引缓存、palette 快照隔离五轴从未进入旧用例。
// - 旧帧构造全部 offset-0 等长数组——非零偏移视图、同背板异视图拒收、输出容量/
//   plan 容量上界、零预算不动、ragged 二维格六轴无旧证（旧 4× 格 width8/scale4 无
//   垂直逻辑行差与 ragged 边）。
// - 旧 controller 只证旧 owner false、默认 AbortError、普通 supersede——匹配 owner
//   取消、快照捕获失败保护旧 effect、显式 reason 对象身份三轴无旧证。
// - 旧 72 步顺序 / source·target 不变 / 正常 4× 格 / 普通 supersede / 旧 owner
//   false / 默认 AbortError 不重领。
// 四个代表产品控制由 Codex 在最终固定候选统一实采；本文件不伪造。
import { describe, expect, test } from 'vitest'
import {
  paletteWith,
  type RgbTuple,
  rgbaFrame,
  SENTINEL,
  uniformPalette,
  uniquePalette,
} from './__tests__/glm-q/next2/dither2.js'
import {
  applyDitherPaletteTransition,
  buildDitherPalettePlan,
  DitherTransitionController,
} from './dither-transition.js'

describe('Q-NEXT2 dither palette plan / apply / controller', () => {
  test('Q-NEXT2-01 duplicate exact RGB chooses first palette identity', () => {
    const base = uniquePalette()
    const palette = paletteWith(base, { 18: base[1]! }) // 索引 1 与 18 同 RGB
    const rgb = base[1]! // (1, 73, 151)
    const plan = buildDitherPalettePlan(rgbaFrame([rgb]), rgbaFrame([rgb]), palette, 1)
    expect(plan.targetIndices[0]).toBe(1) // 首次 set 胜出，不是 18
    expect(plan.sourceLevels[0]).toBe(1 & 0x0f)
  })

  test('Q-NEXT2-02 nearest RGB uses green and blue distance', () => {
    // 两组独立判别（Q-NEXT2-R1-01：任一分量缺失都须翻转结果）。其余 254 色均为
    // [255,255,255]（距离 ~3×245² 量级，不干扰）；索引 5=[10,0,0]。
    // G 轴：6=[10,10,0]，像素 [10,9,0]——全距 6:0²+1²+0²=1 < 5:0²+9²+0²=81 → 6；
    //   漏 dg² 则 5/6 同距 0 → 取先 → 5（Codex preflight 已核真实入口返回 6）。
    const gPalette = paletteWith(uniformPalette([255, 255, 255]), {
      5: [10, 0, 0],
      6: [10, 10, 0],
    })
    const gPlan = buildDitherPalettePlan(
      rgbaFrame([[10, 9, 0]]),
      rgbaFrame([[10, 9, 0]]),
      gPalette,
      1,
    )
    expect(gPlan.targetIndices[0]).toBe(6)
    // B 轴：6=[10,0,10]，像素 [10,0,9]——全距 6:0²+0²+1²=1 < 5:0²+0²+9²=81 → 6；
    //   漏 db² 则同距 0 → 5。
    const bPalette = paletteWith(uniformPalette([255, 255, 255]), {
      5: [10, 0, 0],
      6: [10, 0, 10],
    })
    const bPlan = buildDitherPalettePlan(
      rgbaFrame([[10, 0, 9]]),
      rgbaFrame([[10, 0, 9]]),
      bPalette,
      1,
    )
    expect(bPlan.targetIndices[0]).toBe(6)
  })

  test('Q-NEXT2-03 nearest distance tie keeps earlier index', () => {
    const palette = paletteWith(uniformPalette([200, 200, 200]), {
      5: [0, 0, 0],
      6: [2, 0, 0],
    })
    const plan = buildDitherPalettePlan(rgbaFrame([[1, 0, 0]]), rgbaFrame([[1, 0, 0]]), palette, 1)
    expect(plan.targetIndices[0]).toBe(5) // 距 5 = 距 6 = 1 → 严格 < 保留先扫描的 5
  })

  test('Q-NEXT2-04 cached nonexact zero identity is preserved', () => {
    const palette = paletteWith(uniformPalette([200, 200, 200]), { 0: [0, 0, 0] })
    const nonexact: RgbTuple = [1, 1, 1] // 最近 = 索引 0（非 exact，走缓存/最近路径）
    const plan = buildDitherPalettePlan(
      rgbaFrame([nonexact, nonexact, nonexact]),
      rgbaFrame([nonexact, nonexact, nonexact]),
      palette,
      3,
    )
    expect(Array.from(plan.targetIndices)).toEqual([0, 0, 0]) // 重复同色全落同一索引身份
    expect(Array.from(plan.sourceLevels)).toEqual([0, 0, 0])
  })

  test('Q-NEXT2-05 palette snapshot is detached', () => {
    const palette = uniquePalette()
    const plan = buildDitherPalettePlan(
      rgbaFrame([palette[0x00]!]),
      rgbaFrame([palette[0xc5]!]),
      palette,
      1,
    )
    const snapshot = plan.colors.slice()
    palette[0xc0] = [9, 9, 9] // 调用方后续改表
    expect(Array.from(plan.colors)).toEqual(Array.from(snapshot)) // plan 持独立快照
    const output = new Uint8ClampedArray(4)
    applyDitherPaletteTransition(
      rgbaFrame([palette[0x00]!]),
      rgbaFrame([palette[0xc5]!]),
      output,
      6,
      1,
      plan,
    )
    // 应用仍用原快照色 0xc0 = (192,192,64)（手算：(0xc0*73)&255=192、(0xc0*151)&255=64）
    expect(Array.from(output)).toEqual([192, 192, 64, 255])
  })

  test('Q-NEXT2-06 output capacity bounds writes', () => {
    const palette = uniquePalette()
    const source = rgbaFrame([palette[0x00]!, palette[0x01]!, palette[0x02]!]) // 3px 端点
    const target = rgbaFrame([palette[0xc5]!, palette[0xc6]!, palette[0xc7]!])
    const plan = buildDitherPalettePlan(source, target, palette, 2)
    const owner = new Uint8ClampedArray(12).fill(SENTINEL)
    const output = owner.subarray(4, 8) // 非零偏移、仅 1 像素容量
    applyDitherPaletteTransition(source, target, output, 1, 999, plan)
    // 容量 = min(端点 3, 输出 1, plan 2) = 1：只写首像素（step1 首访 → target 色系 level0）
    expect(Array.from(owner)).toEqual([
      SENTINEL,
      SENTINEL,
      SENTINEL,
      SENTINEL,
      192,
      192,
      64,
      255,
      SENTINEL,
      SENTINEL,
      SENTINEL,
      SENTINEL,
    ])
  })

  test('Q-NEXT2-07 real plan capacity bounds later apply', () => {
    const palette = uniquePalette()
    const source = rgbaFrame([palette[0x00]!, palette[0x01]!, palette[0x02]!])
    const target = rgbaFrame([palette[0xc5]!, palette[0xc6]!, palette[0xc7]!])
    const plan = buildDitherPalettePlan(source, target, palette, 1) // 真实 plan 只覆盖 1px
    const output = new Uint8ClampedArray(12).fill(SENTINEL)
    applyDitherPaletteTransition(source, target, output, 1, 3, plan)
    expect(Array.from(output)).toEqual([
      192,
      192,
      64,
      255, // 像素 0（plan 容量内）
      SENTINEL,
      SENTINEL,
      SENTINEL,
      SENTINEL, // plan 容量外原样
      SENTINEL,
      SENTINEL,
      SENTINEL,
      SENTINEL,
    ])
  })

  test('Q-NEXT2-08 nonzero endpoint and output views use own offsets', () => {
    const palette = uniquePalette()
    const srcOwner = new Uint8ClampedArray(16).fill(SENTINEL)
    const tarOwner = new Uint8ClampedArray(20).fill(SENTINEL)
    const outOwner = new Uint8ClampedArray(24).fill(SENTINEL)
    const source = srcOwner.subarray(4, 12) // 2px，非零偏移
    const target = tarOwner.subarray(8, 16)
    const output = outOwner.subarray(4, 12)
    source.set(rgbaFrame([palette[0x00]!, palette[0x01]!]))
    target.set(rgbaFrame([palette[0xc5]!, palette[0xc6]!]))
    const sourceBefore = source.slice()
    const targetBefore = target.slice()
    const plan = buildDitherPalettePlan(source, target, palette, 2)
    applyDitherPaletteTransition(source, target, output, 0, 2, plan) // step0 全 source 拷贝
    expect(Array.from(output)).toEqual(Array.from(sourceBefore))
    applyDitherPaletteTransition(source, target, output, 1, 2, plan) // 首访像素 0 换 target 色系
    const expectedPixel0 = [192, 192, 64, 255]
    const expectedPixel1 = Array.from(sourceBefore.slice(4)) // li1 rank2 未访（step1）
    expect(Array.from(output)).toEqual([...expectedPixel0, ...expectedPixel1])
    // 视图外哨兵字节全保持；输入视图不变
    expect(Array.from(srcOwner.subarray(0, 4))).toEqual([SENTINEL, SENTINEL, SENTINEL, SENTINEL])
    expect(Array.from(srcOwner.subarray(12))).toEqual([SENTINEL, SENTINEL, SENTINEL, SENTINEL])
    expect(Array.from(outOwner.subarray(0, 4))).toEqual([SENTINEL, SENTINEL, SENTINEL, SENTINEL])
    expect(Array.from(outOwner.subarray(12))).toEqual(Array.from({ length: 12 }, () => SENTINEL))
    expect(Array.from(source)).toEqual(Array.from(sourceBefore))
    expect(Array.from(target)).toEqual(Array.from(targetBefore))
  })

  test('Q-NEXT2-09 distinct endpoint-buffer views are rejected', () => {
    const palette = uniquePalette()
    const source = rgbaFrame([palette[0x00]!])
    const target = rgbaFrame([palette[0xc5]!])
    const plan = buildDitherPalettePlan(source, target, palette, 1)
    // 与 source 同背板：不同对象、不相交区间（纯守卫，无数据冲突）
    const srcBuffer = new ArrayBuffer(32)
    const srcView = new Uint8ClampedArray(srcBuffer, 0, 8)
    srcView.set(source)
    const outputSharingSource = new Uint8ClampedArray(srcBuffer, 16, 4)
    expect(() =>
      applyDitherPaletteTransition(srcView, target, outputSharingSource, 1, 1, plan),
    ).toThrow(/独立/)
    // 与 target 同背板（旧测试只覆盖 output===source 对象同一）
    const tarBuffer = new ArrayBuffer(32)
    const tarView = new Uint8ClampedArray(tarBuffer, 0, 8)
    tarView.set(target)
    const outputSharingTarget = new Uint8ClampedArray(tarBuffer, 16, 4)
    expect(() =>
      applyDitherPaletteTransition(source, tarView, outputSharingTarget, 1, 1, plan),
    ).toThrow(/独立/)
  })

  test('Q-NEXT2-10 zero requested pixels leave output untouched', () => {
    const palette = uniquePalette()
    const source = rgbaFrame([palette[0x00]!, palette[0x01]!])
    const target = rgbaFrame([palette[0xc5]!, palette[0xc6]!])
    const plan = buildDitherPalettePlan(source, target, palette, 2)
    const output = new Uint8ClampedArray(8).fill(SENTINEL)
    applyDitherPaletteTransition(source, target, output, 1, 0, plan)
    expect(Array.from(output)).toEqual(Array.from({ length: 8 }, () => SENTINEL))
    expect(Array.from(source)).toEqual(Array.from(rgbaFrame([palette[0x00]!, palette[0x01]!])))
    expect(Array.from(target)).toEqual(Array.from(rgbaFrame([palette[0xc5]!, palette[0xc6]!])))
  })

  test('Q-NEXT2-11 ragged two-dimensional grid maps logical rows', () => {
    const palette = uniquePalette()
    const source = rgbaFrame(Array.from({ length: 25 }, () => palette[0x00]!))
    const target = rgbaFrame(Array.from({ length: 25 }, () => palette[0xc5]!))
    const plan = buildDitherPalettePlan(source, target, palette, 25)
    const output = new Uint8ClampedArray(100)
    applyDitherPaletteTransition(source, target, output, 3, 25, plan, {
      width: 5,
      pixelScale: 2,
    })
    // 手算：physicalWidth=5、logicalWidth=ceil(5/2)=3；li = floor(y/2)*3 + floor(x/2)。
    // PHASE_RANK={0,2,4,1,5,3}（li%6 → rank）：li∈{0,1,3,6,7} 的 rank<3 在 step3 已首访，
    // 其余未访。行掩码（y0..y4）：11110 / 11110 / 11000 / 11000 / 11110。
    const visited = [192, 192, 64, 255] // colors[((0xc5&0xf0)|0)*3] = 0xc0 行 + target alpha
    const untouched = [0, 0, 0, 255] // palette[0] = (0,0,0) + source alpha
    const mask = [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0]
    const expected: number[] = []
    for (const bit of mask) expected.push(...(bit ? visited : untouched))
    expect(Array.from(output)).toEqual(expected)
  })

  test('Q-NEXT2-12 owned cancellation accepts matching owner', async () => {
    const controller = new DitherTransitionController<string>()
    const owner = { tag: 'owner-a' }
    const pending = controller.beginEntry('backup', 100, owner)
    const reason = new Error('owned cancel')
    expect(controller.cancelOwned(owner, reason)).toBe(true)
    await expect(pending).rejects.toBe(reason) // 精确对象身份，非替换 AbortError
    expect(controller.active).toBeNull()
  })

  test('Q-NEXT2-13 snapshot capture failure preserves active effect', async () => {
    const controller = new DitherTransitionController<string>()
    const owner = { tag: 'old-owner' }
    const first = controller.beginEntry('first', 100, owner)
    const boom = new Error('snapshot failed')
    // beginSnapshot 先求值 snapshot() 再进入 begin 的 supersede 取消——捕获抛出时
    // 旧 effect 未被取消、Promise 仍 pending
    expect(() =>
      controller.beginSnapshot(
        () => {
          throw boom
        },
        100,
        { tag: 'new' },
      ),
    ).toThrow(boom)
    expect(controller.active?.owner).toBe(owner)
    expect(controller.active?.backup).toBe('first')
    controller.finish()
    await expect(first).resolves.toBeUndefined()
  })

  test('Q-NEXT2-14 explicit cancellation reason preserves object identity', async () => {
    const controller = new DitherTransitionController<string>()
    const pending = controller.beginEntry('active', 100)
    const reason = new Error('custom cancellation reason')
    controller.cancel(reason)
    await expect(pending).rejects.toBe(reason) // 同一对象，不换 AbortError
    expect(controller.active).toBeNull()
  })
})
