/**
 * 物品命令族：新增/修改/删除物品定义。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { ItemData } from '@type-pal/content'
import type { Command } from './command-contract.js'
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
  private removed: ItemData | undefined
  private index = -1
  private migrationDiagnosticsBeforeDelete: EditorState['migrationDiagnostics'] | undefined
  private capturedMigrationDiagnostics = false

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
    if (!this.removed) {
      this.removed = structuredClone(state.items[index]!)
      this.index = index
    }
    if (!this.capturedMigrationDiagnostics) {
      this.migrationDiagnosticsBeforeDelete = state.migrationDiagnostics
        ? structuredClone(state.migrationDiagnostics)
        : undefined
      this.capturedMigrationDiagnostics = true
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
    items.splice(Math.min(Math.max(0, this.index), items.length), 0, structuredClone(this.removed))
    return {
      ...state,
      items,
      migrationDiagnostics: this.migrationDiagnosticsBeforeDelete
        ? structuredClone(this.migrationDiagnosticsBeforeDelete)
        : undefined,
    }
  }
}

/** 修改物品字段(undo 恢复旧值;undefined 值 = 删键,如清空 use)。 */
export class UpdateItemCommand implements Command {
  readonly label = '修改物品'
  private readonly itemId: string
  private readonly patch: ItemPatch
  private oldPatch: ItemPatch | undefined

  constructor(itemId: string, patch: ItemPatch) {
    this.itemId = itemId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const it = state.items.find((x) => x.id === this.itemId)
    if (!it) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((it as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as ItemPatch
    }
    const next = { ...it, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    return withItem(state, this.itemId, next as unknown as ItemData)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const it = state.items.find((x) => x.id === this.itemId)
    if (!it) return state
    const restored = { ...it, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withItem(state, this.itemId, restored as unknown as ItemData)
  }
}
