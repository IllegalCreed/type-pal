import type { AiAction, EnemyDef } from '@type-pal/content'

/** runtime 可执行的全部 AI action 槽；readiness 不得各自漏扫 fallback/hook。 */
function enemyAiActions(enemy: EnemyDef): AiAction[] {
  const actions = (enemy.ai.rules ?? []).map((rule) => rule.do)
  if (enemy.ai.fallback) actions.push(enemy.ai.fallback.action)
  for (const flow of Object.values(enemy.ai.hooks ?? {}))
    for (const state of Object.values(flow.states))
      for (const command of state.body) {
        if (command.kind === 'effect') actions.push(command.effect)
        if (command.kind === 'setFallback' && command.fallback)
          actions.push(command.fallback.action)
      }
  return actions
}

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
    for (const action of enemyAiActions(enemy))
      enqueueActionTarget(enemy, action, queue, enemiesById)
  }
  return result
}

/** transform/summon 闭包内全部可达 cast 技能；顺序稳定且去重。 */
export function collectReachableEnemySkillIds(
  initial: readonly EnemyDef[],
  enemiesById: Readonly<Record<string, EnemyDef>>,
): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const enemy of collectReachableEnemyDefs(initial, enemiesById))
    for (const action of enemyAiActions(enemy))
      if (action.kind === 'cast' && !seen.has(action.skillId)) {
        seen.add(action.skillId)
        result.push(action.skillId)
      }
  return result
}
