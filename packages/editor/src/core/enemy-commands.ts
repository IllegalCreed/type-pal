/**
 * 敌人命令族。BattleDataInUseError 来自 C00；withEnemy 留给同文件未迁出的战斗精灵切换命令使用。
 */
import type { EnemyDef } from '@type-pal/content'
import { BattleDataInUseError } from './battle-data-command-errors.js'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

export function withEnemy(state: EditorState, enemyId: string, next: EnemyDef): EditorState {
  const list = state.enemies ?? []
  let hit = false
  const enemies = list.map((e) => {
    if (e.id !== enemyId) return e
    hit = true
    return next
  })
  return hit ? { ...state, enemies } : state
}

/** UpdateEnemy 的 patch 范围(name 是 locale 键,名字文本走 locale 命令另做)。 */
export type EnemyPatch = Partial<
  Pick<
    EnemyDef,
    | 'battleSprite'
    | 'yPosOffset'
    | 'stats'
    | 'ai'
    | 'sounds'
    | 'steal'
    | 'attackEquivItem'
    | 'choreography'
    | 'onDefeated'
  >
>

/** 改敌人字段。语义同 UpdateActorCommand:首次 apply 捕获旧值,invert 还原;对象深拷贝。 */
export class UpdateEnemyCommand implements Command {
  readonly label = '修改敌人'
  private readonly enemyId: string
  private readonly patch: EnemyPatch
  private oldPatch: EnemyPatch | undefined

  constructor(enemyId: string, patch: EnemyPatch) {
    this.enemyId = enemyId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const e = (state.enemies ?? []).find((x) => x.id === this.enemyId)
    if (!e) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((e as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as EnemyPatch
    }
    return withEnemy(state, this.enemyId, { ...e, ...this.patch })
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const e = (state.enemies ?? []).find((x) => x.id === this.enemyId)
    if (!e) return state
    const restored = { ...e, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withEnemy(state, this.enemyId, restored as unknown as EnemyDef)
  }
}

/** 新增敌人(末尾)。invert 移除。 */
export class AddEnemyCommand implements Command {
  readonly label = '新增敌人'
  private readonly enemy: EnemyDef
  constructor(enemy: EnemyDef) {
    this.enemy = structuredClone(enemy)
  }
  apply(state: EditorState): EditorState {
    return { ...state, enemies: [...(state.enemies ?? []), this.enemy] }
  }
  invert(state: EditorState): EditorState {
    return { ...state, enemies: (state.enemies ?? []).filter((e) => e.id !== this.enemy.id) }
  }
}

export class DeleteEnemyCommand implements Command {
  readonly label = '删除敌人'
  private readonly enemyId: string
  private removed: { enemy: EnemyDef; index: number } | undefined
  constructor(
    enemyId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {
    this.enemyId = enemyId
  }
  apply(state: EditorState): EditorState {
    const list = state.enemies ?? []
    const index = list.findIndex((e) => e.id === this.enemyId)
    if (index === -1) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'enemy',
      id: this.enemyId,
    }).blockers
    if (references.length) throw new BattleDataInUseError('敌人', this.enemyId, references)
    if (!this.removed) this.removed = { enemy: structuredClone(list[index]!), index }
    return { ...state, enemies: list.filter((_, i) => i !== index) }
  }
  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const next = [...(state.enemies ?? [])]
    next.splice(this.removed.index, 0, this.removed.enemy)
    return { ...state, enemies: next }
  }
}
