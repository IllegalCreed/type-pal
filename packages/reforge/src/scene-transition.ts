import type { Facing } from '@type-pal/content'

/**
 * 场景朝向优先级：脚本显式值 > 上一场景继承值 > 目标入口默认值。
 * 首次启动不传 inherited，仍自然落到入口默认值。
 */
export function resolveSceneFacing(
  explicit: Facing | undefined,
  inherited: Facing | undefined,
  entryDefault: Facing,
): Facing {
  return explicit ?? inherited ?? entryDefault
}
