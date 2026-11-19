import { type AssetId, palSoundAssetId } from '@type-pal/content'

/** 从值域合法的 PAL 音效号读取已登记的音效。缺少对应素材时返回 undefined。 */
export type SoundAssetForNum = (sound: number) => AssetId | undefined

function isPalSoundNumber(sound: number | undefined): sound is number {
  return sound !== undefined && Number.isInteger(sound) && sound > 0
}

export function palOptionalSoundAssetId(sound: number | undefined): AssetId | undefined {
  if (!isPalSoundNumber(sound)) return undefined
  return palSoundAssetId(sound)
}

export function resolveSoundAsset(
  sound: number | undefined,
  resolver?: SoundAssetForNum,
): AssetId | undefined {
  if (!isPalSoundNumber(sound)) return undefined
  return resolver ? resolver(sound) : palSoundAssetId(sound)
}
