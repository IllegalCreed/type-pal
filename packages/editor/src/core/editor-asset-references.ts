import {
  type AssetReference,
  type AssetReferenceSource,
  collectAssetReferences,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'

/** 编辑器所有资源页、诊断与保存门共用的完整 typed walker 输入，禁止各页手拼漏域。 */
export function editorAssetReferenceSource(state: EditorState): AssetReferenceSource {
  return {
    assets: state.manifest.assets,
    entryPoints: state.manifest.entryPoints,
    scenes: state.scenes,
    scriptChunks: state.scriptChunks,
    sharedScripts: state.sharedScripts,
    actors: state.actors,
    enemies: state.enemies,
    items: state.items,
    skills: state.skills,
    battleFields: state.battleFields,
    tilesets: state.tilesets,
    sprites: state.sprites,
    battleSprites: state.battleSprites,
  }
}

export function collectEditorAssetReferences(state: EditorState): AssetReference[] {
  return collectAssetReferences(editorAssetReferenceSource(state))
}
