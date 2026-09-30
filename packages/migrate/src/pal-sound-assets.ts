import type { AssetCatalogV1 } from '@type-pal/content'
import { palSoundAssetId } from '@type-pal/content'
import type { SoundAssetForNum } from './sound-migration.js'

/** PAL 源编号到已物化音效资产的唯一解析口径。 */
export function palSoundAssetForSources(sources: {
  assetCatalog: AssetCatalogV1
}): SoundAssetForNum {
  return (sound) => {
    if (!Number.isInteger(sound) || sound <= 0) return undefined
    const id = palSoundAssetId(sound)
    return sources.assetCatalog.assets[id]?.kind === 'sound' ? id : undefined
  }
}
