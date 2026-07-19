import type { EditorState } from '../core/edit-session.js'
import { type EditorLocation, editorSubpage } from './editor-navigation.js'

/**
 * 判断 URL 中的对象定位在当前作者态是否仍有效。
 *
 * 普通深链保留“目标不存在”诊断；undo/redo 刚移除当前对象时，调用方用本函数把
 * object 参数收回到当前页面，避免历史操作把工作区留在一个已经撤销的临时对象上。
 */
export function editorObjectTargetMissing(state: EditorState, location: EditorLocation): boolean {
  const objectId = location.objectId
  const subpage = editorSubpage(location)
  if (!objectId || !subpage.acceptsObject) return false
  if (subpage.kind === 'scene') {
    return !state.scenes.some((candidate) => candidate.id === objectId)
  }
  if (subpage.kind === 'map') {
    return !state.mapIndex.maps.some((candidate) => candidate.id === objectId)
  }
  if (subpage.kind === 'actor') {
    return !state.actors.some((candidate) => candidate.id === objectId)
  }
  if (subpage.dataPage === 'sprite') {
    return !state.sprites.some((candidate) => candidate.id === objectId)
  }
  if (subpage.dataPage === 'music') {
    return state.assetCatalog.assets[objectId]?.kind !== 'music'
  }
  if (subpage.dataPage === 'sound') {
    return state.assetCatalog.assets[objectId]?.kind !== 'sound'
  }
  if (subpage.dataPage === 'image') {
    const kind = state.assetCatalog.assets[objectId]?.kind
    return (
      kind !== 'portrait' && kind !== 'face' && kind !== 'item-icon' && kind !== 'battle-background'
    )
  }
  if (subpage.dataPage === 'cutscene') {
    const kind = state.assetCatalog.assets[objectId]?.kind
    return kind !== 'video' && kind !== 'frame-animation'
  }
  if (subpage.dataPage === 'stamp') {
    return !state.stamps.some((candidate) => candidate.id === objectId)
  }
  if (subpage.dataPage === 'tileset') {
    return !(state.tilesets ?? []).some((candidate) => candidate.id === objectId)
  }
  if (subpage.dataPage === 'scripts') {
    return !state.scriptIndex?.library?.[objectId]
  }
  if (subpage.kind === 'project' && subpage.projectPage === 'entrypoint') {
    const entries = state.manifest.entryPoints ?? [
      { id: 'new-game', label: '开始游戏', scene: state.manifest.entryScene },
    ]
    return !entries.some((entry) => entry.id === objectId)
  }
  return false
}
