/** Borrow the active world for a DEV battle and restore its snapshot in-place on exit.
 * The wrapper preserves the world root so existing host readers see the restored state.
 */
import type { CharacterInstance, WorldState } from '@type-pal/content'

export interface WorldPreset {
  party: CharacterInstance[]
  learnedSkills?: Record<string, string[]>
  inventory?: { itemId: string; count: number }[]
}

export async function withWorldPreset<T>(
  world: WorldState,
  preset: WorldPreset,
  fn: () => Promise<T>,
): Promise<T> {
  const saved = structuredClone(world)
  world.party = preset.party
  if (preset.learnedSkills)
    world.learnedSkills = Object.fromEntries(
      Object.entries(preset.learnedSkills).map(([actorId, skillIds]) => [actorId, [...skillIds]]),
    )
  if (preset.inventory) world.inventory = preset.inventory
  try {
    return await fn()
  } finally {
    const target = world as unknown as Record<string, unknown>
    for (const key of Object.keys(target)) delete target[key]
    Object.assign(world, saved)
  }
}
