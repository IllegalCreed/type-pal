import type { EnemyDef, EnemyTeamDef, ScriptChunkV1 } from '@type-pal/content'

const LEAD_BOSSES = new Set(['enemy-435', 'enemy-454', 'enemy-478', 'enemy-496'])
const EXPLICIT_BOSS_TEAMS: Readonly<Record<string, readonly number[]>> = {
  'enemy-485': [19],
}

export interface BossOverlayResult {
  enemies: EnemyDef[]
  chunks: Record<string, ScriptChunkV1>
  attached: number
  clearedEnemies: string[]
}

/** 把带门禁的 boss 台词从敌种定义搬到具体遭遇，避免同敌种作杂兵时误说。 */
export function applyPalBossEncounterOverlay(
  inputEnemies: readonly EnemyDef[],
  teams: readonly EnemyTeamDef[],
  inputChunks: Readonly<Record<string, ScriptChunkV1>>,
): BossOverlayResult {
  const enemies = structuredClone(inputEnemies) as EnemyDef[]
  const chunks = structuredClone(inputChunks) as Record<string, ScriptChunkV1>
  const bossEnemies = new Set([...LEAD_BOSSES, ...Object.keys(EXPLICIT_BOSS_TEAMS)])
  const teamsOf = new Map<string, Set<number>>()
  for (const team of teams) {
    const lead = team.members[0]
    if (!lead || !LEAD_BOSSES.has(lead)) continue
    const id = Number(team.id.replace('team-', ''))
    const set = teamsOf.get(lead) ?? new Set<number>()
    set.add(id)
    teamsOf.set(lead, set)
  }
  for (const [enemy, teamIds] of Object.entries(EXPLICIT_BOSS_TEAMS)) {
    const set = teamsOf.get(enemy) ?? new Set<number>()
    for (const id of teamIds) set.add(id)
    teamsOf.set(enemy, set)
  }

  const choreography = new Map(
    enemies
      .filter((enemy) => bossEnemies.has(enemy.id) && enemy.choreography?.length)
      .map((enemy) => [enemy.id, structuredClone(enemy.choreography!)]),
  )
  const byTeam = new Map<number, { enemy: string; value: NonNullable<EnemyDef['choreography']> }>()
  for (const [enemy, teamIds] of teamsOf) {
    const value = choreography.get(enemy)
    if (!value) continue
    for (const team of teamIds) byTeam.set(team, { enemy, value })
  }

  let attached = 0
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const value of node) visit(value)
      return
    }
    if (!node || typeof node !== 'object') return
    const command = node as Record<string, unknown>
    if (
      command.kind === 'startBattle' &&
      typeof command.team === 'number' &&
      !command.choreography
    ) {
      const hit = byTeam.get(command.team)
      if (hit) {
        command.choreography = structuredClone(hit.value)
        attached++
      }
    }
    for (const value of Object.values(command)) visit(value)
  }
  for (const chunk of Object.values(chunks)) visit(chunk.scripts)

  const clearedEnemies: string[] = []
  for (const enemy of enemies) {
    if (!choreography.has(enemy.id) || !teamsOf.has(enemy.id) || !enemy.choreography) continue
    delete enemy.choreography
    clearedEnemies.push(enemy.id)
  }
  return { enemies, chunks, attached, clearedEnemies }
}
