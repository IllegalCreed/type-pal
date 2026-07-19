import {
  type AssetCatalogV1,
  exitLegacySoundFamily,
  type LoadedManifest,
  validateManifestAssetConfigV3,
} from '@type-pal/content'
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
  // 既有 PAL manifest 含已退役的 ghost family，不能先交给当前 schema 的逐步 validator；
  // 在内存中一次性完成全部退场，最后只校验 canonical 结果。
  const soundClosed = structuredClone(current)
  soundClosed.assets.roles = { ...PAL_ASSET_ROLES, ...current.assets.roles }
  const legacy = soundClosed.assets.legacy
  let assets = soundClosed.assets
  if (legacy) {
    const {
      portraits: _retiredPortraits,
      faces: _retiredFaces,
      itemIcons: _retiredItemIcons,
      tilesets: _retiredTilesets,
      sprites: _retiredSprites,
      sounds: _retiredSounds,
      ...rest
    } = legacy
    // PAL 的既有 manifest 还带两条已确认无真实工程消费者的 ghost family；R1 普查后
    // 只在这条 PAL 专用升级边界删除，第三方工程仍须走 actionable fail。
    const retired = new Set<string>([
      'portrait',
      'face',
      'item-icon',
      'battle-background',
      'glyph-table',
      'ui-image',
      'sound',
      'tileset',
      'sprite',
      'battle-sprite',
    ])
    const families = legacy.families.filter((family) => !retired.has(family))
    assets = families.length
      ? { ...soundClosed.assets, legacy: { ...rest, families } }
      : { catalog: soundClosed.assets.catalog, roles: soundClosed.assets.roles }
  }
  validateManifestAssetConfigV3(assets, catalog, 'PAL 升级后 manifest.assets')
  return {
    ...soundClosed,
    content: {
      ...soundClosed.content,
      stamps: 'content/stamps.json',
      battleSprites: 'content/battle-sprites.json',
    },
    assets,
  }
}
