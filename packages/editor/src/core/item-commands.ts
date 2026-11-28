import type { ItemData } from '@type-pal/content'
import type { Command } from './command-contract.js'
import { applyDefinitionPatch, captureDefinitionPatch } from './definition-patch.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

/** 物品补丁(浅字段;equip/use/throw 整体替换)。 */
type ItemPatch = Partial<Omit<ItemData, 'id'>>

function withItem(state: EditorState, itemId: string, next: ItemData): EditorState {
  let hit = false
  const items = state.items.map((i) => {
    if (i.id !== itemId) return i
    hit = true
    return next
  })
  return hit ? { ...state, items } : state
}

/** 新增物品；id 冲突必须 fail-loud，避免复制/异步导入覆盖既有定义。 */
export class AddItemCommand implements Command {
  readonly label = '新增物品'
  private readonly item: ItemData
  private readonly index: number | undefined

  constructor(item: ItemData, index?: number) {
    this.item = structuredClone(item)
    this.index = index
  }

  apply(state: EditorState): EditorState {
    if (state.items.some((item) => item.id === this.item.id))
      throw new Error(`物品 id 已存在：${this.item.id}`)
    const index = Math.min(Math.max(0, this.index ?? state.items.length), state.items.length)
    const items = [...state.items]
    items.splice(index, 0, structuredClone(this.item))
    return { ...state, items }
  }

  invert(state: EditorState): EditorState {
    if (!state.items.some((item) => item.id === this.item.id)) return state
    return { ...state, items: state.items.filter((item) => item.id !== this.item.id) }
  }
}

/** 删除前每次从 current-author 统一索引重验；物品内部边由 deletion scope 排除。 */
export class ItemInUseError extends Error {
  constructor(
    readonly itemId: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(
      `物品 ${itemId} 仍被 ${references.length} 处引用：\n${references
        .slice(0, 20)
        .map((reference) => `${reference.source.label} · ${reference.where}`)
        .join('\n')}`,
    )
    this.name = 'ItemInUseError'
  }
}

export class DeleteItemCommand implements Command {
  readonly label = '删除物品'
  private removed:
    | {
        item: ItemData
        index: number
        migrationDiagnostics: EditorState['migrationDiagnostics']
      }
    | undefined

  constructor(
    private readonly itemId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.items.findIndex((item) => item.id === this.itemId)
    if (index < 0) return state
    const blockers = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'item',
      id: this.itemId,
    }).blockers
    if (blockers.length) throw new ItemInUseError(this.itemId, blockers)
    this.removed ??= {
      item: structuredClone(state.items[index]!),
      index,
      migrationDiagnostics: structuredClone(state.migrationDiagnostics),
    }
    const migrationDiagnostics = state.migrationDiagnostics
      ? {
          ...state.migrationDiagnostics,
          diagnostics: state.migrationDiagnostics.diagnostics.filter(
            (diagnostic) =>
              !(diagnostic.target.domain === 'item' && diagnostic.target.objectId === this.itemId),
          ),
        }
      : undefined
    return {
      ...state,
      items: state.items.filter((item) => item.id !== this.itemId),
      migrationDiagnostics,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if (state.items.some((item) => item.id === this.itemId))
      throw new Error(`无法撤销删除：物品 id 已被占用 ${this.itemId}`)
    const items = [...state.items]
    const { index, item, migrationDiagnostics } = this.removed
    items.splice(Math.min(Math.max(0, index), items.length), 0, structuredClone(item))
    return { ...state, items, migrationDiagnostics: structuredClone(migrationDiagnostics) }
  }
}

/** Undo restores only the fields changed by this edit. An undefined value removes a field. */
export class UpdateItemCommand implements Command {
  readonly label = '修改物品'
  private readonly patch: ItemPatch
  private previous: ItemPatch | undefined

  constructor(
    private readonly itemId: string,
    patch: ItemPatch,
  ) {
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const item = state.items.find((candidate) => candidate.id === this.itemId)
    if (!item) return state
    this.previous ??= captureDefinitionPatch(item, this.patch)
    return withItem(state, this.itemId, applyDefinitionPatch(item, this.patch))
  }

  invert(state: EditorState): EditorState {
    const item = state.items.find((candidate) => candidate.id === this.itemId)
    if (!item || !this.previous) return state
    return withItem(state, this.itemId, applyDefinitionPatch(item, this.previous))
  }
}
