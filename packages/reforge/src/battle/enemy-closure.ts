import type { EnemyDef } from '@type-pal/content'

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
    for (const rule of enemy.ai.rules ?? []) {
      if (rule.do.kind === 'transform') {
        const target = enemiesById[rule.do.enemyId]
        if (!target)
          throw new Error(`敌人 "${enemy.id}" transform 目标 "${rule.do.enemyId}" 不存在`)
        queue.push(target)
      }
      if (rule.do.kind === 'summon' && rule.do.enemyId) {
        const target = enemiesById[rule.do.enemyId]
        if (!target) throw new Error(`敌人 "${enemy.id}" summon 目标 "${rule.do.enemyId}" 不存在`)
        queue.push(target)
      }
    }
  }
  return result
}
