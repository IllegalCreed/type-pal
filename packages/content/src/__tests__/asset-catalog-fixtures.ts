import type { AssetCatalogV1, AssetRecordV1, ManifestAssetConfig } from '../asset.js'

/** Synthetic sprite catalog metadata for guard tests.
 * Shape alone does not prove file bytes or PNG validity; closure tests supply their own bytes/hash.
 */
export const spriteAssetRecord = (id: string, sha: string = 'a'.repeat(64)) => ({
  kind: 'sprite' as const,
  path: `assets/generated/${id}.png`,
  mediaType: 'image/png',
  bytes: 3,
  sha256: sha,
  origin: { kind: 'generated' as const },
  label: id,
})

export function audioProjectAssetFixture(): {
  catalog: AssetCatalogV1
  assets: ManifestAssetConfig
} {
  const sha256 = 'a'.repeat(64)
  const musicEntries = ['002', '003', '004', '037'].map(
    (track) =>
      [
        `music.pal.${track}`,
        {
          kind: 'music',
          path: `assets/migrated/music/${track}.mid`,
          mediaType: 'audio/midi',
          bytes: 3,
          sha256,
          origin: { kind: 'legacy-migrated' },
        } satisfies AssetRecordV1,
      ] as const,
  )
  return {
    catalog: {
      version: 1,
      assets: {
        ...Object.fromEntries(musicEntries),
        'soundfont.default': {
          kind: 'soundfont',
          path: 'assets/runtime/soundfont.sf3',
          mediaType: 'audio/sf3',
          bytes: 3,
          sha256,
          origin: { kind: 'licensed' },
        },
        'sound.pal.045': {
          kind: 'sound',
          path: 'assets/migrated/sounds/045.wav',
          mediaType: 'audio/wav',
          bytes: 3,
          sha256,
          origin: { kind: 'legacy-migrated' },
        },
        'color.project-standard': {
          kind: 'color-table',
          path: 'assets/migrated/color/project-standard.json',
          mediaType: 'application/json',
          bytes: 3,
          sha256,
          origin: { kind: 'legacy-migrated' },
        },
      },
    },
    assets: {
      catalog: 'assets/index.json',
      roles: {
        'audio.midiSoundfont': 'soundfont.default',
        'audio.defaultBattleMusic': 'music.pal.037',
        'audio.bossVictoryMusic': 'music.pal.002',
        'audio.normalVictoryMusic': 'music.pal.003',
        'audio.openingMenuMusic': 'music.pal.004',
        'audio.battleItemUseSound': 'sound.pal.045',
        'visual.standardColorTable': 'color.project-standard',
      },
    },
  }
}
