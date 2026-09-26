/**
 * 敌队命令族。对 Command 仅 type import，运行期不回引 commands.ts。
 */
import type { EnemyTeamDef } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

/** 敌队整表替换(380 队,粗粒度 undo 足够;成员/增删队都经它)。 */
export class UpdateEnemyTeamsCommand implements Command {
  readonly label = '修改敌队'
  private readonly teams: EnemyTeamDef[]
  private old: EnemyTeamDef[] | undefined
  constructor(teams: readonly EnemyTeamDef[]) {
    this.teams = structuredClone(teams) as EnemyTeamDef[]
  }
  apply(state: EditorState): EditorState {
    if (!this.old) this.old = structuredClone(state.enemyTeams ?? []) as EnemyTeamDef[]
    return { ...state, enemyTeams: this.teams }
  }
  invert(state: EditorState): EditorState {
    if (!this.old) return state
    return { ...state, enemyTeams: this.old }
  }
}

function withEnemyTeam(state: EditorState, teamId: string, next: EnemyTeamDef): EditorState {
  let hit = false
  const enemyTeams = (state.enemyTeams ?? []).map((team) => {
    if (team.id !== teamId) return team
    hit = true
    return next
  })
  return hit ? { ...state, enemyTeams } : state
}

/** 新增独立敌队预制。稳定 id 创建后不可修改。 */
export class AddEnemyTeamCommand implements Command {
  readonly label = '新增敌队'
  private readonly team: EnemyTeamDef
  constructor(team: EnemyTeamDef) {
    this.team = structuredClone(team)
  }
  apply(state: EditorState): EditorState {
    if ((state.enemyTeams ?? []).some((candidate) => candidate.id === this.team.id)) return state
    return { ...state, enemyTeams: [...(state.enemyTeams ?? []), this.team] }
  }
  invert(state: EditorState): EditorState {
    return {
      ...state,
      enemyTeams: (state.enemyTeams ?? []).filter((candidate) => candidate.id !== this.team.id),
    }
  }
}

/** 修改敌队语义槽；槽位最多五个，null 保留空洞。 */
export class UpdateEnemyTeamCommand implements Command {
  readonly label = '修改敌队'
  private previous: EnemyTeamDef | undefined
  private readonly next: EnemyTeamDef
  constructor(
    private readonly teamId: string,
    next: EnemyTeamDef,
  ) {
    this.next = structuredClone(next)
  }
  apply(state: EditorState): EditorState {
    const team = (state.enemyTeams ?? []).find((candidate) => candidate.id === this.teamId)
    if (!team) return state
    if (!this.previous) this.previous = structuredClone(team)
    return withEnemyTeam(state, this.teamId, {
      ...this.next,
      id: this.teamId,
      slots: this.next.slots.slice(0, 5),
    })
  }
  invert(state: EditorState): EditorState {
    return this.previous ? withEnemyTeam(state, this.teamId, this.previous) : state
  }
}

export class EnemyTeamInUseError extends Error {
  readonly references: readonly ProjectReferenceEdge[]
  constructor(teamId: string, references: readonly ProjectReferenceEdge[]) {
    super(`敌队 ${teamId} 仍被 ${references.length} 处引用`)
    this.name = 'EnemyTeamInUseError'
    this.references = references
  }
}

/** 删除未被场景或脚本引用的敌队；invert 插回原索引。 */
export class DeleteEnemyTeamCommand implements Command {
  readonly label = '删除敌队'
  private removed: { team: EnemyTeamDef; index: number } | undefined
  constructor(
    private readonly teamId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}
  apply(state: EditorState): EditorState {
    const teams = state.enemyTeams ?? []
    const index = teams.findIndex((candidate) => candidate.id === this.teamId)
    if (index === -1) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'enemy-team',
      id: this.teamId,
    }).blockers
    if (references.length) throw new EnemyTeamInUseError(this.teamId, references)
    if (!this.removed) this.removed = { team: structuredClone(teams[index]!), index }
    return { ...state, enemyTeams: teams.filter((_, candidateIndex) => candidateIndex !== index) }
  }
  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const enemyTeams = [...(state.enemyTeams ?? [])]
    enemyTeams.splice(this.removed.index, 0, this.removed.team)
    return { ...state, enemyTeams }
  }
}
