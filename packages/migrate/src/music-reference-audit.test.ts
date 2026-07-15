import { expect, test } from 'vitest'
import { auditMusicReferences } from './music-reference-audit.js'
import type { MigrationJson } from './pal-migration.js'

test('音乐审计递归覆盖分支并区分播放、停止、场景槽和单场覆盖', () => {
  const files = new Map<string, MigrationJson>([
    [
      'assets/index.json',
      {
        version: 1,
        assets: {
          a: {
            kind: 'music',
            path: 'assets/a.mid',
            mediaType: 'audio/midi',
            bytes: 1,
            sha256: 'a'.repeat(64),
            origin: { kind: 'authored' },
          },
        },
      },
    ],
    [
      'content/scenes/s001.json',
      {
        id: 's001',
        music: 'a',
        battleMusic: null,
        body: [
          { kind: 'branch', then: [{ kind: 'playMusic', asset: 'a' }] },
          { kind: 'stopMusic' },
          { kind: 'startBattle', team: 1, music: 'a' },
        ],
      },
    ],
  ])
  expect(auditMusicReferences(files)).toEqual({
    musicAssets: 1,
    playMusic: 1,
    stopMusic: 1,
    legacyPlayMusicTotal: 2,
    sceneMusic: 1,
    sceneBattleMusic: 1,
    startBattleWithMusic: 1,
    uniqueMusicRefs: 1,
    missingMusicRefs: [],
    legacyMusicKeys: 0,
    internalBattleCfgMarkers: 0,
  })
})
