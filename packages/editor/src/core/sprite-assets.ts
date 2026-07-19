import type { AssetId } from '@type-pal/content'
import { type LoadedWorldSprite, SpriteAssetCache } from '@type-pal/reforge'
import type { EditorAssetReader } from './editor-asset-reader.js'

/** 每个稳定 reader（即一个已打开工程）只有一个 world-sprite 解码缓存。 */
const caches = new WeakMap<EditorAssetReader, SpriteAssetCache>()

export function editorSpriteCache(reader: EditorAssetReader): SpriteAssetCache {
  let cache = caches.get(reader)
  if (!cache) {
    cache = new SpriteAssetCache(96)
    caches.set(reader, cache)
  }
  return cache
}

export function loadEditorSprite(
  reader: EditorAssetReader,
  asset: AssetId,
): Promise<LoadedWorldSprite> {
  return editorSpriteCache(reader).load(reader, asset)
}

export function spriteAssetRevision(reader: EditorAssetReader, asset: AssetId): string {
  const record = reader.record(asset, 'sprite')
  return `${asset}\0${record.sha256}`
}

export function clearEditorSpriteCache(reader: EditorAssetReader): void {
  editorSpriteCache(reader).clear()
}
