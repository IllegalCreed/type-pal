import type { EditorState } from './edit-session.js'

/**
 * 一次编辑操作。apply/invert 都返回**新** EditorState(不可变 —— 不得 mutate 传入)。
 * invert(s) 接收的是 apply 之后的态,要还原成 apply 之前的态。
 */
export interface Command {
  readonly label: string
  /** 仅供 EditSession 增量维护组合模板引用事实；未声明但改 stamps 时会安全回退全量。 */
  readonly mapReferenceStampIds?: readonly string[]
  apply(s: EditorState): EditorState
  invert(s: EditorState): EditorState
}
