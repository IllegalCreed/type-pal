/**
 * 升级学技能表命令族。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { LevelUpSkill } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/** 改角色的升级学技能行(整列表替换;空/undefined = 删该角色键)。 */
export class UpdateLevelUpCommand implements Command {
  readonly label = '改升级学技能'
  private readonly actorId: string
  private readonly rows: LevelUpSkill[] | undefined
  private old: LevelUpSkill[] | undefined
  private had = false
  private captured = false

  constructor(actorId: string, rows: LevelUpSkill[] | undefined) {
    this.actorId = actorId
    this.rows = rows?.length ? structuredClone(rows) : undefined
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.captured = true
      this.had = this.actorId in state.levelUp
      this.old = state.levelUp[this.actorId]
        ? structuredClone(state.levelUp[this.actorId])
        : undefined
    }
    const levelUp = { ...state.levelUp }
    if (this.rows) levelUp[this.actorId] = structuredClone(this.rows)
    else delete levelUp[this.actorId]
    return { ...state, levelUp }
  }

  invert(state: EditorState): EditorState {
    const levelUp = { ...state.levelUp }
    if (this.had && this.old) levelUp[this.actorId] = structuredClone(this.old)
    else delete levelUp[this.actorId]
    return { ...state, levelUp }
  }
}
