import type { AssetCatalogV1 } from '@type-pal/content'
import { palOptionalSoundAssetId, type SoundAssetForNum } from './sound-migration.js'

/** PAL 源编号到已物化音效资产的唯一解析口径。 */
export function palSoundAssetForSources(sources: {
  assetCatalog: AssetCatalogV1
}): SoundAssetForNum {
  return (sound) => {
    const id = palOptionalSoundAssetId(sound)
    return id !== undefined && sources.assetCatalog.assets[id]?.kind === 'sound' ? id : undefined
  }
}
