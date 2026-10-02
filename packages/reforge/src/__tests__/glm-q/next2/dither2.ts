// Q-NEXT2（r22 有限批）· dither-transition 专属 fixture（Q 纯数据构造器，无测试、无算法）。
//
// 纪律（codex-opq-next2-dispatch/packet）：palette 一律真实完整 256 条合法 RGB tuple
// （无短板/holes/假 Partial）；预期是独立常量/手算小图，不复制生产 nearest/grid 算法；
// plan 只经真实 buildDitherPalettePlan 产出；controller 只调公开 begin/finish/cancel/
// cancelOwned。旧 dither-transition.test.ts 的 unique 基表同构（红色分量 = index 保证
// 基表无重复），重复/同距等轴通过 overrides 构造。

export type RgbTuple = [number, number, number]

/** 基表：256 条 unique 合法 RGB（红 = index → packRgb 必不碰撞）。 */
export function uniquePalette(): RgbTuple[] {
  return Array.from(
    { length: 256 },
    (_, index): RgbTuple => [index, (index * 73) & 0xff, (index * 151) & 0xff],
  )
}

/** 克隆基表并覆盖指定槽位（构造重复 RGB / 最近色对照点）。 */
export function paletteWith(base: RgbTuple[], overrides: Record<number, RgbTuple>): RgbTuple[] {
  const out = base.map((c) => [c[0], c[1], c[2]] as RgbTuple)
  for (const [index, rgb] of Object.entries(overrides)) out[Number(index)] = [...rgb] as RgbTuple
  return out
}

/** 256 条同色 filler（配合少数覆盖位构造大距离背景）。 */
export function uniformPalette(rgb: RgbTuple): RgbTuple[] {
  return Array.from({ length: 256 }, () => [...rgb] as RgbTuple)
}

/** RGBA 帧（每像素 4B，alpha 缺省 255）。 */
export function rgbaFrame(pixels: RgbTuple[], alpha = 255): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flatMap((c) => [c[0], c[1], c[2], alpha]))
}

/** 视图/容量合同的哨兵填充字节（产品合法域外常量，区分「未写」与「写了同值」）。 */
export const SENTINEL = 167
