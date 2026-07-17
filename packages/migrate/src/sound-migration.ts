import { type AssetId, palSoundAssetId } from '@type-pal/content'

/** 旧 PAL 音效号到工程 AssetId 的迁移边界；undefined 表示 0 或空 chunk。 */
export type SoundAssetForNum = (sound: number) => AssetId | undefined

export function palOptionalSoundAssetId(sound: number | undefined): AssetId | undefined {
  if (sound === undefined || !Number.isInteger(sound) || sound <= 0) return undefined
  return palSoundAssetId(sound)
}

export function resolveSoundAsset(
  sound: number | undefined,
  resolver?: SoundAssetForNum,
): AssetId | undefined {
  if (sound === undefined || !Number.isInteger(sound) || sound <= 0) return undefined
  return resolver ? resolver(sound) : palSoundAssetId(sound)
}
