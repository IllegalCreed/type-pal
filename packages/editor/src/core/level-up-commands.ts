import type { LevelUpSkill } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

type LevelUpTable = EditorState['levelUp']

export function readLevelUpRows(table: LevelUpTable, actorId: string): LevelUpSkill[] | undefined {
  return Object.hasOwn(table, actorId) ? table[actorId] : undefined
}

/** Copy an authored entry or remove it; callers own the outstanding history snapshot. */
export function replaceLevelUpRows(
  table: LevelUpTable,
  actorId: string,
  rows: LevelUpSkill[] | undefined,
): LevelUpTable {
  if (rows) return { ...table, [actorId]: structuredClone(rows) }
  const next = { ...table }
  delete next[actorId]
  return next
}

/** Empty input removes the actor's level-up entry. */
export class UpdateLevelUpCommand implements Command {
  readonly label = '改升级学技能'
  private readonly rows: LevelUpSkill[] | undefined
  private previous: LevelUpSkill[] | undefined
  private captured = false

  constructor(
    private readonly actorId: string,
    rows: LevelUpSkill[] | undefined,
  ) {
    this.rows = rows?.length ? structuredClone(rows) : undefined
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.previous = structuredClone(readLevelUpRows(state.levelUp, this.actorId))
      this.captured = true
    }
    return { ...state, levelUp: replaceLevelUpRows(state.levelUp, this.actorId, this.rows) }
  }

  invert(state: EditorState): EditorState {
    return { ...state, levelUp: replaceLevelUpRows(state.levelUp, this.actorId, this.previous) }
  }
}
