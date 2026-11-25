import type { AiAction, EnemyDef } from '@type-pal/content'

/** Actions available to the runtime, including those installed by a hook. */
function* enemyAiActions(enemy: EnemyDef): Iterable<AiAction> {
  for (const rule of enemy.ai.rules ?? []) yield rule.do
  if (enemy.ai.fallback) yield enemy.ai.fallback.action
  for (const flow of Object.values(enemy.ai.hooks ?? {}))
    for (const state of Object.values(flow.states))
      for (const command of state.body) {
        if (command.kind === 'effect') yield command.effect
        if (command.kind === 'setFallback' && command.fallback) yield command.fallback.action
      }
}

/** Collect the enemy and skill assets reachable through battle AI in first-seen order. */
export function collectBattleEnemyDependencies(
  initial: readonly EnemyDef[],
  enemiesById: Readonly<Record<string, EnemyDef>>,
): { enemies: EnemyDef[]; skillIds: string[] } {
  const enemies: EnemyDef[] = []
  const seen = new Set<string>()
  const skillIds = new Set<string>()
  const enqueue = (enemy: EnemyDef): void => {
    if (seen.has(enemy.id)) return
    seen.add(enemy.id)
    enemies.push(enemy)
  }
  for (const enemy of initial) enqueue(enemy)
  for (const enemy of enemies) {
    for (const action of enemyAiActions(enemy)) {
      if (action.kind === 'cast') skillIds.add(action.skillId)
      if (action.kind !== 'transform' && action.kind !== 'summon') continue
      // A summon without a target uses the current enemy, which is already in the queue.
      if (action.enemyId === undefined) continue
      const target = Object.hasOwn(enemiesById, action.enemyId)
        ? enemiesById[action.enemyId]
        : undefined
      if (!target)
        throw new Error(`敌人 "${enemy.id}" ${action.kind} 目标 "${action.enemyId}" 不存在`)
      enqueue(target)
    }
  }
  return { enemies, skillIds: [...skillIds] }
}
