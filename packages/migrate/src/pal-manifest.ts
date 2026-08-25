import {
  type AssetCatalogV1,
  CONTENT_VERSION,
  type CurrentManifest,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  validateManifestAssetConfig,
} from '@type-pal/content'
import { PAL_ASSET_ROLES } from './pal-assets.js'

/** PAL 当前工程 manifest 的唯一生成口；不读取或升级任何旧 manifest。 */
export function buildPalCurrentManifest(catalog: AssetCatalogV1): CurrentManifest {
  const assets = {
    catalog: 'assets/index.json',
    roles: { ...PAL_ASSET_ROLES },
  }
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
