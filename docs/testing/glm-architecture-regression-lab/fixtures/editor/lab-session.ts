/**
 * LAB fixture：从本工作树真实生产模块 re-export（不复制实现）。
 * candidates 统一引用此入口，便于后续按包适配（仅改此处）。
 */

export type { EditorState } from '@lab/editor/edit-session'
export { EditSession } from '@lab/editor/edit-session'
