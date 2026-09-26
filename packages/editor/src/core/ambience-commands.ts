/**
 * 氛围(昼夜)命令族：新建/修改/删除氛围定义。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { AmbienceDef } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

export type AmbiencePatch = Partial<Omit<AmbienceDef, 'id'>>

/** 改氛围定义(name/tint)。 */
export class UpdateAmbienceCommand implements Command {
  readonly label = '修改氛围'
  private readonly id: string
  private readonly patch: AmbiencePatch
  private oldPatch: AmbiencePatch | undefined

  constructor(id: string, patch: AmbiencePatch) {
    this.id = id
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const a = (state.ambiences ?? []).find((x) => x.id === this.id)
    if (!a) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((a as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as AmbiencePatch
    }
    const ambiences = (state.ambiences ?? []).map((x) =>
      x.id === this.id ? { ...x, ...this.patch } : x,
    )
    return { ...state, ambiences }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const ambiences = (state.ambiences ?? []).map((x) =>
      x.id === this.id ? { ...x, ...this.oldPatch } : x,
    )
    return { ...state, ambiences }
  }
}

/** 新建氛围(缺省恒等白 = 不染;作者随后调色)。 */
export class AddAmbienceCommand implements Command {
  readonly label = '新建氛围'
  private readonly ambience: AmbienceDef
  private added = false

  constructor(id: string, name: string) {
    this.ambience = { id, name, tint: [255, 255, 255] }
  }

  apply(state: EditorState): EditorState {
    if ((state.ambiences ?? []).some((a) => a.id === this.ambience.id)) return state
    this.added = true
    return { ...state, ambiences: [...(state.ambiences ?? []), structuredClone(this.ambience)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, ambiences: (state.ambiences ?? []).filter((a) => a.id !== this.ambience.id) }
  }
}

export class AmbienceInUseError extends Error {
  readonly ambienceId: string
  readonly references: readonly ProjectReferenceEdge[]

  constructor(ambienceId: string, references: readonly ProjectReferenceEdge[]) {
    super(`氛围 ${ambienceId} 仍被 ${references.length} 处引用，不能删除`)
    this.name = 'AmbienceInUseError'
    this.ambienceId = ambienceId
    this.references = references
  }
}

/** 删除未被脚本或运行态引用的氛围；invert 按原索引恢复。 */
export class DeleteAmbienceCommand implements Command {
  readonly label = '删除氛围'
  private removed: { ambience: AmbienceDef; index: number } | undefined

  constructor(
    private readonly ambienceId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const ambiences = state.ambiences ?? []
    const index = ambiences.findIndex((ambience) => ambience.id === this.ambienceId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'ambience',
      id: this.ambienceId,
    }).blockers
    if (references.length) throw new AmbienceInUseError(this.ambienceId, references)
    if (!this.removed) this.removed = { ambience: structuredClone(ambiences[index]!), index }
    return {
      ...state,
      ambiences: ambiences.filter((_, candidateIndex) => candidateIndex !== index),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if ((state.ambiences ?? []).some((ambience) => ambience.id === this.ambienceId))
      throw new Error(`无法撤销删除：氛围 id 已被占用 ${this.ambienceId}`)
    const ambiences = [...(state.ambiences ?? [])]
    ambiences.splice(this.removed.index, 0, structuredClone(this.removed.ambience))
    return { ...state, ambiences }
  }
}
