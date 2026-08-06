/**
 * D13-1 调试战斗 partyPreset 快照回滚(K2)。
 *
 * 语义：开战前 deep-clone world；期间 fn 正常写回（HP/金钱/技能等全部落 world 副本）；
 * fn 结束（胜/败/取消/异常）后把 world 恢复到战前深等状态——调试战斗不污染世界。
 * enemyOverride 不在此列（只进 battle session，战斗局部）。
 */
import type { CharacterInstance, WorldState } from '@type-pal/content'

export interface WorldPreset {
  party: CharacterInstance[]
  inventory?: { itemId: string; count: number }[]
}

export async function withWorldPreset<T>(
  world: WorldState,
  preset: WorldPreset,
  fn: () => Promise<T>,
): Promise<T> {
  const saved = structuredClone(world)
  world.party = preset.party
  if (preset.inventory) world.inventory = preset.inventory
  try {
    return await fn()
  } finally {
    Object.assign(world, saved)
  }
}
