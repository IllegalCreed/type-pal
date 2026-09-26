/**
 * 毒定义命令族：新建/修改/删除毒状态。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { PoisonDef } from '@type-pal/content'
import { BattleDataInUseError } from './battle-data-command-errors.js'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

export type PoisonPatch = Partial<Omit<PoisonDef, 'id'>>

function withPoison(state: EditorState, id: number, next: PoisonDef): EditorState {
  let hit = false
  const poisons = (state.poisons ?? []).map((p) => {
    if (p.id !== id) return p
    hit = true
    return next
  })
  return hit ? { ...state, poisons } : state
}

/** 改毒定义(patch 语义同 UpdateItemCommand:undefined 值 = 删键,如清掉 lethalWith)。 */
export class UpdatePoisonCommand implements Command {
  readonly label = '修改毒'
  private readonly id: number
  private readonly patch: PoisonPatch
  private oldPatch: PoisonPatch | undefined

  constructor(id: number, patch: PoisonPatch) {
    this.id = id
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const p = (state.poisons ?? []).find((x) => x.id === this.id)
    if (!p) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((p as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as PoisonPatch
    }
    const next = { ...p, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    return withPoison(state, this.id, next as unknown as PoisonDef)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const p = (state.poisons ?? []).find((x) => x.id === this.id)
    if (!p) return state
    const restored = { ...p, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withPoison(state, this.id, restored as unknown as PoisonDef)
  }
}

/** 新建毒(最小可用缺省:常规可解、单 tick 扣血;作者随后在表单里改)。 */
export class AddPoisonCommand implements Command {
  readonly label = '新建毒'
  private readonly poison: PoisonDef
  private added = false

  constructor(id: number, name: string) {
    this.poison = {
      id,
      name,
      curability: 'common',
      color: 0,
      playerTicks: [{ hpDelta: -10 }],
      enemyTicks: [{ hpDelta: -10 }],
    }
  }

  apply(state: EditorState): EditorState {
    if ((state.poisons ?? []).some((p) => p.id === this.poison.id)) return state
    this.added = true
    return { ...state, poisons: [...(state.poisons ?? []), structuredClone(this.poison)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, poisons: (state.poisons ?? []).filter((p) => p.id !== this.poison.id) }
  }
}

/** 删除毒定义；技能、物品与其他毒的关系边必须先解除。 */
export class DeletePoisonCommand implements Command {
  readonly label = '删除毒'
  private removed: { poison: PoisonDef; index: number } | undefined

  constructor(
    private readonly poisonId: number,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const list = state.poisons ?? []
    const index = list.findIndex((poison) => poison.id === this.poisonId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'poison',
      id: String(this.poisonId),
    }).blockers
    if (references.length) throw new BattleDataInUseError('毒', String(this.poisonId), references)
    if (!this.removed) this.removed = { poison: structuredClone(list[index]!), index }
    return { ...state, poisons: list.filter((poison) => poison.id !== this.poisonId) }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if ((state.poisons ?? []).some((poison) => poison.id === this.poisonId))
      throw new Error(`无法撤销删除：毒 id 已被占用 ${this.poisonId}`)
    const poisons = [...(state.poisons ?? [])]
    poisons.splice(this.removed.index, 0, structuredClone(this.removed.poison))
    return { ...state, poisons }
  }
}
