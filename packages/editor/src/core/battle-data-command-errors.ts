import type { ProjectReferenceEdge } from './project-reference.js'

/** 删除敌人。apply 记原索引,invert 插回原位。 */
export class BattleDataInUseError extends Error {
  readonly references: readonly ProjectReferenceEdge[]

  constructor(kind: string, id: string, references: readonly ProjectReferenceEdge[]) {
    super(`${kind} ${id} 仍被 ${references.length} 处引用`)
    this.name = 'BattleDataInUseError'
    this.references = references
  }
}
