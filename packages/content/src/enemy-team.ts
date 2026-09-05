import type { EnemyTeamDef } from './enemy.js'

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

export function validateEnemyTeamStructure(value: unknown): EnemyTeamDef[] {
  if (!Array.isArray(value)) throw new Error('enemyTeams: 期望数组')
  const seen = new Set<string>()
  return value.map((raw, index) => {
    const path = `enemyTeams[${index}]`
    const team = record(raw, path)
    exactKeys(team, ['id', 'slots'], path)
    if (typeof team.id !== 'string' || !team.id) throw new Error(`${path}.id: 期望非空 string`)
    if (seen.has(team.id)) throw new Error(`${path}.id: 重复敌队 id "${team.id}"`)
    seen.add(team.id)
    if (!Array.isArray(team.slots)) throw new Error(`${path}.slots: 期望数组`)
    if (team.slots.length > 5) throw new Error(`${path}.slots: 槽位数超上限 5`)
    team.slots.forEach((slot, slotIndex) => {
      if (slot !== null && (typeof slot !== 'string' || !slot))
        throw new Error(`${path}.slots[${slotIndex}]: 期望 string|null`)
    })
    return { id: team.id, slots: [...team.slots] as Array<string | null> }
  })
}

export function validateEnemyTeamReferences(
  teams: readonly EnemyTeamDef[],
  enemyIds: ReadonlySet<string>,
): void {
  teams.forEach((team, teamIndex) => {
    team.slots.forEach((enemyId, slotIndex) => {
      if (enemyId !== null && !enemyIds.has(enemyId))
        throw new Error(
          `enemyTeams[${teamIndex}](${team.id}).slots[${slotIndex}]: 敌人 "${enemyId}" 不在 enemies`,
        )
    })
  })
}

export function validateEnemyTeams(value: unknown, enemyIds?: ReadonlySet<string>): EnemyTeamDef[] {
  const teams = validateEnemyTeamStructure(value)
  if (enemyIds) validateEnemyTeamReferences(teams, enemyIds)
  return teams
}
