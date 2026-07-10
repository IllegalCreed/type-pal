/**
 * 氛围系统(W6 昼夜)数据模型。见 docs/phase2/ambience-design.md。
 *
 * 原版「夜晚调色板」实测 = 昼盘逐通道均匀乘法(R×0.458 / G×0.899 / B×1.000,
 * p10–p90 极窄)—— clean 版用全帧 multiply 合成复现,**零调色盘概念**。
 * 氛围 = content 数据,作者可自定义(黄昏/水下/血月),引擎零改动。
 */

/** 氛围定义:全帧乘法色(0-255)。恒等([255,255,255])= 不染。 */
export interface AmbienceDef {
  id: string // 'day' / 'night' / 作者自定义
  name: string // 编辑器显示名
  tint: [number, number, number]
}

/** 恒等乘色(白天)。 */
export const AMBIENCE_IDENTITY: [number, number, number] = [255, 255, 255]

/** 乘色是否恒等(全通道 ≥254 视为不染,免一次全屏合成)。 */
export function isIdentityTint(tint: readonly [number, number, number]): boolean {
  return tint[0] >= 254 && tint[1] >= 254 && tint[2] >= 254
}

/** 解析氛围 id → 乘色。缺 id / 表里没有 / 'day' 兜底 → 恒等(工程没带氛围表时零影响)。 */
export function resolveAmbienceTint(
  id: string | undefined,
  ambiences: readonly AmbienceDef[],
): [number, number, number] {
  if (!id || id === 'day') {
    // 'day' 允许被工程覆写(自定义白天色调);没定义就是恒等
    const custom = ambiences.find((a) => a.id === id)
    return custom ? custom.tint : AMBIENCE_IDENTITY
  }
  return ambiences.find((a) => a.id === id)?.tint ?? AMBIENCE_IDENTITY
}

/** 乘色线性插值(切换过渡用;t∈[0,1] 夹取,分量四舍五入)。 */
export function lerpTint(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  return [
    Math.round(from[0] + (to[0] - from[0]) * k),
    Math.round(from[1] + (to[1] - from[1]) * k),
    Math.round(from[2] + (to[2] - from[2]) * k),
  ]
}
