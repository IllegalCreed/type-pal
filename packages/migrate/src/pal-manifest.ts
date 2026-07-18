import { type AssetCatalogV1, exitLegacySoundFamily, type LoadedManifest } from '@type-pal/content'
import { PAL_ASSET_ROLES } from './pal-assets.js'

/**
 * PAL 音效 catalog 闭环后的 manifest 纯变换。
 *
 * 已有工程角色优先于 PAL 默认角色，作者覆写不会被迁移器夺回；legacy 仅退役 sound
 * family 及其目录字段，其余迁移债务原样保留。
 */
export function closePalSoundManifest(
  current: LoadedManifest,
  catalog?: AssetCatalogV1,
): LoadedManifest {
  return exitLegacySoundFamily({ manifest: current, roles: PAL_ASSET_ROLES, catalog })
}

/** PAL 迁移事务的综合 manifest 目标；contentVersion 保持 3。 */
export function preparePalManifest(
  current: LoadedManifest,
  catalog?: AssetCatalogV1,
): LoadedManifest {
  const soundClosed = closePalSoundManifest(current, catalog)
  return {
    ...soundClosed,
    content: { ...soundClosed.content, stamps: 'content/stamps.json' },
  }
}
