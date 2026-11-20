import {
  type AssetCatalogV1,
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  validateManifestAssetConfig,
} from '@type-pal/content'
import { PAL_ASSET_ROLES } from './pal-assets.js'

/** 构建供当前 PAL 发布使用的 manifest，入口状态与开场视频各自登记。 */
export function buildPalCurrentManifest(catalog: AssetCatalogV1): CurrentManifest {
  const assets: CurrentManifest['assets'] = {
    catalog: 'assets/index.json',
    roles: { ...PAL_ASSET_ROLES },
  }
  // 败北演出只在配置此角色时播放曲目。已登记的错误类型仍须报错。
  if (!Object.hasOwn(catalog.assets, PAL_ASSET_ROLES['audio.defeatMusic']))
    delete assets.roles['audio.defeatMusic']
  validateManifestAssetConfig(assets, catalog, 'PAL current manifest.assets')
  return {
    id: 'pal',
    name: '仙剑奇侠传·复刻',
    contentVersion: CONTENT_VERSION,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
    defaultEntryId: 'new-game',
    content: {
      scenes: 'content/scenes/',
      actors: 'content/actors.json',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      sprites: 'content/sprites.json',
      enemies: 'content/enemies.json',
      enemyTeams: 'content/enemy-teams.json',
      battleFields: 'content/battle-fields.json',
      poisons: 'content/poisons.json',
      tilesets: 'content/tilesets.json',
      ambiences: 'content/ambiences.json',
      shops: 'content/shops.json',
      maps: 'content/maps/index.json',
      stamps: 'content/stamps.json',
      battleSprites: 'content/battle-sprites.json',
      migrationDiagnostics: 'content/migration-diagnostics.json',
      sharedScripts: 'content/shared-scripts.json',
      worldVariables: 'content/world-variables.json',
    },
    assets,
    entryPoints: [
      {
        id: 'new-game',
        label: '新的故事',
        scene: 's000',
        introVideo: 'video.pal.003',
        startWorld: {
          party: ['li-xiaoyao'],
          money: 0,
          inventory: [],
        },
      },
    ],
  }
}
