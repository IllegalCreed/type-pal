import type { ProjectReferenceEdge } from './project-reference.js'

/** Carries the blocking references for the editor to show when deleting battle data. */
export class BattleDataInUseError extends Error {
  readonly references: readonly ProjectReferenceEdge[]

  constructor(kind: string, id: string, references: readonly ProjectReferenceEdge[]) {
    super(`${kind} ${id} 仍被 ${references.length} 处引用`)
    this.name = 'BattleDataInUseError'
    this.references = references
  }
}
