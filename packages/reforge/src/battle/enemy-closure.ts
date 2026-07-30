import type { AiAction, EnemyDef } from '@type-pal/content'

function enqueueActionTarget(
  owner: EnemyDef,
  action: AiAction,
  queue: EnemyDef[],
  enemiesById: Readonly<Record<string, EnemyDef>>,
): void {
  if (action.kind !== 'transform' && action.kind !== 'summon') return
  const enemyId = action.enemyId
  if (enemyId === undefined) return
  const target = enemiesById[enemyId]
  if (!target) throw new Error(`敌人 "${owner.id}" ${action.kind} 目标 "${enemyId}" 不存在`)
  queue.push(target)
}

/** 敌方 transform/summon 的可达闭包；音频与视觉 readiness 共用，避免各自漂移。 */
export function collectReachableEnemyDefs(
  initial: readonly EnemyDef[],
  enemiesById: Readonly<Record<string, EnemyDef>>,
): EnemyDef[] {
  const queue = [...initial]
  const result: EnemyDef[] = []
  const seen = new Set<string>()
  while (queue.length) {
    const enemy = queue.shift()
    if (!enemy || seen.has(enemy.id)) continue
    seen.add(enemy.id)
    result.push(enemy)
    for (const rule of enemy.ai.rules ?? []) enqueueActionTarget(enemy, rule.do, queue, enemiesById)
    for (const flow of Object.values(enemy.ai.hooks ?? {}))
      for (const state of Object.values(flow.states))
        for (const command of state.body)
          if (command.kind === 'effect')
            enqueueActionTarget(enemy, command.effect, queue, enemiesById)
  }
  return result
}
