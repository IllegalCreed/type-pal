/**
 * 世界变量命令族：新建/修改/删除项目级变量。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { WorldVariableDefinitionV1 } from '@type-pal/content'
import { validateWorldVariableIdV1, validateWorldVariableRegistryV1 } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

export class WorldVariableInUseError extends Error {
  constructor(
    readonly variableId: string,
    readonly referenceCount: number,
  ) {
    super(`世界变量 "${variableId}" 仍有 ${referenceCount} 处脚本引用`)
    this.name = 'WorldVariableInUseError'
  }
}

export class AddWorldVariableCommand implements Command {
  readonly label = '新建世界变量'
  private added = false

  constructor(
    private readonly id: string,
    private readonly definition: WorldVariableDefinitionV1,
  ) {
    validateWorldVariableIdV1(id)
    validateWorldVariableRegistryV1({ [id]: definition })
  }

  apply(state: EditorState): EditorState {
    if (state.worldVariables?.[this.id]) return state
    this.added = true
    return {
      ...state,
      worldVariables: validateWorldVariableRegistryV1({
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.definition),
      }),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    const worldVariables = { ...(state.worldVariables ?? {}) }
    delete worldVariables[this.id]
    return { ...state, worldVariables }
  }
}

export class UpdateWorldVariableCommand implements Command {
  readonly label = '修改世界变量'
  private previous?: WorldVariableDefinitionV1

  constructor(
    private readonly id: string,
    private readonly definition: WorldVariableDefinitionV1,
  ) {
    validateWorldVariableRegistryV1({ [id]: definition })
  }

  apply(state: EditorState): EditorState {
    const current = state.worldVariables?.[this.id]
    if (!current) return state
    if (
      current.kind === this.definition.kind &&
      current.name === this.definition.name &&
      current.description === this.definition.description &&
      current.initial === this.definition.initial
    )
      return state
    if (!this.previous) this.previous = structuredClone(current)
    return {
      ...state,
      worldVariables: validateWorldVariableRegistryV1({
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.definition),
      }),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    return {
      ...state,
      worldVariables: {
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.previous),
      },
    }
  }
}

export class DeleteWorldVariableCommand implements Command {
  readonly label = '删除世界变量'
  private previous?: WorldVariableDefinitionV1

  constructor(
    private readonly id: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const current = state.worldVariables?.[this.id]
    if (!current) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'world-variable',
      id: this.id,
    }).blockers
    if (references.length) throw new WorldVariableInUseError(this.id, references.length)
    if (!this.previous) this.previous = structuredClone(current)
    const worldVariables = { ...(state.worldVariables ?? {}) }
    delete worldVariables[this.id]
    return { ...state, worldVariables }
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    if (state.worldVariables?.[this.id])
      throw new Error(`无法撤销删除：变量 id 已被占用 ${this.id}`)
    return {
      ...state,
      worldVariables: {
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.previous),
      },
    }
  }
}
