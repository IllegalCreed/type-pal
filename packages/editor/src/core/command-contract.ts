import type { EditorState } from './edit-session.js'

/**
 * An immutable editor transition. Return the input state when no edit occurs.
 * Undo receives the current applied state and restores the fields owned by this command.
 */
export interface Command {
  readonly label: string
  /** 仅供 EditSession 增量维护组合模板引用事实；未声明但改 stamps 时会安全回退全量。 */
  readonly mapReferenceStampIds?: readonly string[]
  apply(s: EditorState): EditorState
  invert(s: EditorState): EditorState
}
