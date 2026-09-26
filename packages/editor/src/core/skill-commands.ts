/**
 * 技能命令族：新建/修改/删除技能定义。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { SkillData } from '@type-pal/content'
import { BattleDataInUseError } from './battle-data-command-errors.js'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

/** 不可变:替换 skillId 技能;旁技能同引用。 */
function withSkill(state: EditorState, skillId: string, next: SkillData): EditorState {
  let hit = false
  const skills = state.skills.map((s) => {
    if (s.id !== skillId) return s
    hit = true
    return next
  })
  return hit ? { ...state, skills } : state
}

/** UpdateSkill 的 patch 范围(同 UpdateItem 模式:undefined 值 = 删键)。 */
export type SkillPatch = Partial<Omit<SkillData, 'id'>>

/** 修改技能字段(undo 恢复旧值)。 */
export class UpdateSkillCommand implements Command {
  readonly label = '修改技能'
  private readonly skillId: string
  private readonly patch: SkillPatch
  private oldPatch: SkillPatch | undefined

  constructor(skillId: string, patch: SkillPatch) {
    this.skillId = skillId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const sk = state.skills.find((x) => x.id === this.skillId)
    if (!sk) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((sk as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as SkillPatch
    }
    const next = { ...sk, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    return withSkill(state, this.skillId, next as unknown as SkillData)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const sk = state.skills.find((x) => x.id === this.skillId)
    if (!sk) return state
    const next = { ...sk, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete next[k]
    return withSkill(state, this.skillId, next as unknown as SkillData)
  }
}

/**
 * 新建技能(SkillTab「＋」;缺省单 damage 效果 + 空动画)。invert 删回。
 */
export class AddSkillCommand implements Command {
  readonly label = '新建技能'
  private readonly skill: SkillData
  private added = false

  constructor(id: string, name: string) {
    this.skill = {
      id,
      name,
      desc: '',
      cost: { mp: 10 },
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [{ kind: 'damage', power: 20, elemental: 0 }],
      animation: {
        effectSprite: 0,
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
      },
    }
  }

  apply(state: EditorState): EditorState {
    if (state.skills.some((s) => s.id === this.skill.id)) return state
    this.added = true
    return { ...state, skills: [...state.skills, structuredClone(this.skill)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, skills: state.skills.filter((s) => s.id !== this.skill.id) }
  }
}

/** 删除技能；任何作者态引用仍存在时 fail closed，invert 按原索引恢复。 */
export class DeleteSkillCommand implements Command {
  readonly label = '删除技能'
  private removed: { skill: SkillData; index: number } | undefined

  constructor(
    private readonly skillId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.skills.findIndex((skill) => skill.id === this.skillId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'skill',
      id: this.skillId,
    }).blockers
    if (references.length) throw new BattleDataInUseError('技能', this.skillId, references)
    if (!this.removed) this.removed = { skill: structuredClone(state.skills[index]!), index }
    return { ...state, skills: state.skills.filter((skill) => skill.id !== this.skillId) }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if (state.skills.some((skill) => skill.id === this.skillId))
      throw new Error(`无法撤销删除：技能 id 已被占用 ${this.skillId}`)
    const skills = [...state.skills]
    skills.splice(this.removed.index, 0, structuredClone(this.removed.skill))
    return { ...state, skills }
  }
}
