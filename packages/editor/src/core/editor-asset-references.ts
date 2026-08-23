import {
  type AssetReference,
  type AssetReferenceSource,
  collectAssetReferences,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'
import { projectCurrentAuthorReferenceSlices } from './script-editor-projection.js'

export interface EditorAssetReferenceSnapshot {
  /** 同一份 source 同时供资源页展示、删除门禁和保存诊断消费。 */
  source: AssetReferenceSource
  references: AssetReference[]
}

export type EditorAssetReferenceResult =
  | { status: 'ready'; snapshot: EditorAssetReferenceSnapshot }
  | { status: 'error'; message: string }

/** 编辑器所有资源页、诊断与保存门共用的完整 typed walker 输入，禁止各页手拼漏域。 */
export function editorAssetReferenceSource(
  state: EditorState,
  currentAuthor?: ScriptEditorState,
): AssetReferenceSource {
  const author = currentAuthor ? projectCurrentAuthorReferenceSlices(currentAuthor, state) : state
  return {
    assets: state.manifest.assets,
    entryPoints: state.manifest.entryPoints,
    scenes: author.scenes,
    scriptChunks: state.scriptChunks,
    // ScriptEditSession 是脚本作者态真值；主 EditSession 的副本只会在保存边界合并。
    // 资源页必须显式传入 App/DataMode 已投影的 current author state，不能在页面内再拼一套合并逻辑。
    sharedScripts: author.sharedScripts,
    actors: state.actors,
    enemies: state.enemies,
    items: author.items,
    skills: state.skills,
    battleFields: state.battleFields,
    tilesets: state.tilesets,
    sprites: state.sprites,
    battleSprites: state.battleSprites,
  }
}

export function collectEditorAssetReferenceSnapshot(
  state: EditorState,
  currentAuthor?: ScriptEditorState,
): EditorAssetReferenceSnapshot {
  const source = editorAssetReferenceSource(state, currentAuthor)
  return { source, references: collectAssetReferences(source) }
}

/** UI 使用的 fail-closed 入口；扫描异常不会退化成“零引用”。 */
export function tryCollectEditorAssetReferenceSnapshot(
  state: EditorState,
  currentAuthor?: ScriptEditorState,
): EditorAssetReferenceResult {
  try {
    return { status: 'ready', snapshot: collectEditorAssetReferenceSnapshot(state, currentAuthor) }
  } catch (cause) {
    return {
      status: 'error',
      message: cause instanceof Error ? cause.message : String(cause),
    }
  }
}

export function collectEditorAssetReferences(
  state: EditorState,
  currentAuthor?: ScriptEditorState,
): AssetReference[] {
  return collectEditorAssetReferenceSnapshot(state, currentAuthor).references
}
