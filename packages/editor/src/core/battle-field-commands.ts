/**
 * 战场命令族(D24 战场页):新建/复制/删除/修改战场 + 表快照与 id 分配 helper。
 *
 * 自 commands.ts 原样搬移(模块归属治理,不改行为):命令合同与 commands.ts 头注一致 ——
 * apply 产新态(不可变)、invert 还原;旧值/旧表在首次 apply 捕获。删除命令经
 * collectCurrentProjectDeletionImpact 做引用阻断。对 Command 仅 type import
 * (commands.ts 反向 re-export 本文件),运行期无环。
 */

import type { BattleFieldDef } from '@type-pal/content'
import { DEFAULT_BATTLE_FIELD_ID, validateBattleFields } from '@type-pal/content'
import type { Command } from './commands.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

function withBattleField(state: EditorState, fieldId: number, next: BattleFieldDef): EditorState {
  const list = state.battleFields ?? []
  let hit = false
  const battleFields = list.map((f) => {
    if (f.id !== fieldId) return f
    hit = true
    return next
  })
  return hit ? { ...state, battleFields } : state
}

export const BATTLE_FIELDS_PATH = 'content/battle-fields.json'

export function nextBattleFieldId(fields: readonly BattleFieldDef[]): number {
  if (fields.length === 0) return DEFAULT_BATTLE_FIELD_ID
  const next = Math.max(...fields.map((field) => field.id)) + 1
  if (!Number.isSafeInteger(next)) throw new Error('无法分配新的战场 id：已超出安全整数范围')
  return next
}

interface BattleFieldTableSnapshot {
  manifest: EditorState['manifest']
  battleFields: BattleFieldDef[] | undefined
}

function captureBattleFieldTable(state: EditorState): BattleFieldTableSnapshot {
  return {
    manifest: structuredClone(state.manifest),
    battleFields:
      state.battleFields === undefined ? undefined : structuredClone(state.battleFields),
  }
}

function restoreBattleFieldTable(
  state: EditorState,
  snapshot: BattleFieldTableSnapshot | undefined,
): EditorState {
  if (!snapshot) return state
  return {
    ...state,
    manifest: structuredClone(snapshot.manifest),
    battleFields:
      snapshot.battleFields === undefined ? undefined : structuredClone(snapshot.battleFields),
  }
}

function appendBattleField(state: EditorState, field: BattleFieldDef): EditorState {
  const battleFields = [...(state.battleFields ?? []), structuredClone(field)]
  validateBattleFields(battleFields)
  return {
    ...state,
    manifest: {
      ...state.manifest,
      content: {
        ...state.manifest.content,
        battleFields: state.manifest.content.battleFields ?? BATTLE_FIELDS_PATH,
      },
    },
    battleFields,
  }
}

/** 新建战场；首次创建时与 manifest.content.battleFields 原子登记并整体可撤销。 */
export class AddBattleFieldCommand implements Command {
  readonly label = '新建战场'
  private readonly field: BattleFieldDef
  private before: BattleFieldTableSnapshot | undefined

  constructor(field: BattleFieldDef) {
    this.field = structuredClone(field)
    validateBattleFields([this.field])
  }

  apply(state: EditorState): EditorState {
    if ((state.battleFields ?? []).some((field) => field.id === this.field.id))
      throw new Error(`战场 id 已存在：${this.field.id}`)
    this.before ??= captureBattleFieldTable(state)
    return appendBattleField(state, this.field)
  }

  invert(state: EditorState): EditorState {
    return restoreBattleFieldTable(state, this.before)
  }
}

/** 复制战场定义到新稳定 id；资源引用保持共享，不复制资源文件。 */
export class CopyBattleFieldCommand implements Command {
  readonly label = '复制战场'
  private readonly sourceId: number
  private readonly nextId: number
  private before: BattleFieldTableSnapshot | undefined
  private copy: BattleFieldDef | undefined

  constructor(sourceId: number, nextId: number) {
    this.sourceId = sourceId
    this.nextId = nextId
  }

  apply(state: EditorState): EditorState {
    const source = (state.battleFields ?? []).find((field) => field.id === this.sourceId)
    if (!source) throw new Error(`复制失败：找不到战场 ${this.sourceId}`)
    if ((state.battleFields ?? []).some((field) => field.id === this.nextId))
      throw new Error(`战场 id 已存在：${this.nextId}`)
    this.before ??= captureBattleFieldTable(state)
    this.copy ??= { ...structuredClone(source), id: this.nextId }
    return appendBattleField(state, this.copy)
  }

  invert(state: EditorState): EditorState {
    return restoreBattleFieldTable(state, this.before)
  }
}

export class BattleFieldInUseError extends Error {
  readonly fieldId: number
  readonly references: readonly ProjectReferenceEdge[]

  constructor(fieldId: number, references: readonly ProjectReferenceEdge[]) {
    super(`战场 ${fieldId} 仍被 ${references.length} 处引用，不能删除`)
    this.name = 'BattleFieldInUseError'
    this.fieldId = fieldId
    this.references = references
  }
}

/** 删除未使用战场；最后一项删除后仍保留已声明的空表文件。 */
export class DeleteBattleFieldCommand implements Command {
  readonly label = '删除战场'
  private readonly fieldId: number
  private before: BattleFieldTableSnapshot | undefined

  constructor(
    fieldId: number,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {
    this.fieldId = fieldId
  }

  apply(state: EditorState): EditorState {
    const index = (state.battleFields ?? []).findIndex((field) => field.id === this.fieldId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'battle-field',
      id: String(this.fieldId),
    }).blockers
    if (references.length > 0) throw new BattleFieldInUseError(this.fieldId, references)
    this.before ??= captureBattleFieldTable(state)
    return {
      ...state,
      battleFields: (state.battleFields ?? []).filter((field) => field.id !== this.fieldId),
    }
  }

  invert(state: EditorState): EditorState {
    return restoreBattleFieldTable(state, this.before)
  }
}

/** UpdateBattleField 的 patch 范围(id 不可改 —— 数字稳定身份被场景/脚本引用)。 */
export type BattleFieldPatch = Partial<
  Pick<BattleFieldDef, 'name' | 'background' | 'screenWave' | 'magicEffect'>
>

/** 改战场字段(D24 战场页)。语义同 UpdateItemCommand:首次 apply 捕获旧值,invert 还原。 */
export class UpdateBattleFieldCommand implements Command {
  readonly label = '修改战场'
  private readonly fieldId: number
  private readonly patch: BattleFieldPatch
  private oldPatch: BattleFieldPatch | undefined

  constructor(fieldId: number, patch: BattleFieldPatch) {
    this.fieldId = fieldId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const f = (state.battleFields ?? []).find((x) => x.id === this.fieldId)
    if (!f) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((f as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as BattleFieldPatch
    }
    const next = { ...f, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    validateBattleFields(
      (state.battleFields ?? []).map((field) =>
        field.id === this.fieldId ? (next as unknown as BattleFieldDef) : field,
      ),
    )
    return withBattleField(state, this.fieldId, next as unknown as BattleFieldDef)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const f = (state.battleFields ?? []).find((x) => x.id === this.fieldId)
    if (!f) return state
    const restored = { ...f, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withBattleField(state, this.fieldId, restored as unknown as BattleFieldDef)
  }
}
