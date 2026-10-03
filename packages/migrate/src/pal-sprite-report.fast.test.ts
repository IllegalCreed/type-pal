import { expect, test } from 'vitest'
import {
  formatPalBattleSpriteReport,
  formatPalWorldSpriteReport,
  PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_TUPLE_DIGEST,
  PAL_WORLD_SPRITE_TUPLE_DIGEST,
} from './pal-assets.js'

// Existing proof: pal-assets.test.ts:451-465 and :548-569 already assert these exact
// public formatter contracts after real loading. Keep those integration assertions;
// this fast-only companion does not read ignored PAL assets or claim a net-new oracle.
test('public sprite reports preserve the existing complete field order without asset IO', () => {
  expect(
    formatPalWorldSpriteReport({
      sprites: 636,
      spriteBytes: 1_332_725,
      spriteFrames: 4_133,
      spriteMalformedTailSlots: 30,
      spriteTupleDigest: PAL_WORLD_SPRITE_TUPLE_DIGEST,
    }),
  ).toBe(
    `[大世界精灵资源] sprites=636 bytes=1332725 frames=4133 ` +
      `malformed-tail-slots=30 tuple-digest=${PAL_WORLD_SPRITE_TUPLE_DIGEST}`,
  )
  expect(
    formatPalBattleSpriteReport({
      battleSprites: 172,
      battleSpriteBytes: 900_973,
      battleSpriteRawBytes: 2_313_598,
      battleSpriteFrames: 775,
      battleSpriteMalformedTailSlots: 6,
      battleSpritePlayerTupleDigest: PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST,
      battleSpriteEnemyTupleDigest: PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST,
      battleSpriteTupleDigest: PAL_BATTLE_SPRITE_TUPLE_DIGEST,
    }),
  ).toBe(
    `[战斗精灵资源] sprites=172 bytes=900973 raw-bytes=2313598 frames=775 ` +
      `malformed-tail-slots=6 player-digest=${PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST} ` +
      `enemy-digest=${PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST} ` +
      `tuple-digest=${PAL_BATTLE_SPRITE_TUPLE_DIGEST}`,
  )
})
