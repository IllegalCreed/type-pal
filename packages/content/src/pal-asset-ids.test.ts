import { describe, expect, test } from 'vitest'
import {
  PAL_PHYSICAL_EFFECT_ASSET_ID,
  palBattleBackgroundAssetId,
  palBattleSpriteAssetId,
  palFaceAssetId,
  palFrameAnimationAssetId,
  palItemIconAssetId,
  palMagicEffectSpriteAssetId,
  palMusicAssetId,
  palPortraitAssetId,
  palSoundAssetId,
  palSpriteAssetId,
  palTilesetAssetId,
  palVideoAssetId,
} from './asset.js'

describe('PAL numeric asset keys', () => {
  test.each([
    ['music', palMusicAssetId, 31, 'music.pal.031', 0, 'PAL 音乐号必须是正整数，收到 0'],
    ['sound', palSoundAssetId, 45, 'sound.pal.045', 0, 'PAL 音效号必须是正整数，收到 0'],
    ['video', palVideoAssetId, 1, 'video.pal.001', 0, 'PAL 视频号必须是正整数，收到 0'],
    [
      'frame animation',
      palFrameAnimationAssetId,
      0,
      'frame-animation.pal.000',
      -1,
      'PAL 帧动画号必须是非负整数，收到 -1',
    ],
    [
      'magic effect',
      palMagicEffectSpriteAssetId,
      7,
      'effect-sprite.pal.magic.007',
      -1,
      'PAL 法术特效号必须是非负整数，收到 -1',
    ],
    ['portrait', palPortraitAssetId, 7, 'portrait.pal.007', 0, 'PAL 立绘号必须是正整数，收到 0'],
    [
      'item icon',
      palItemIconAssetId,
      12,
      'item-icon.pal.012',
      0,
      'PAL 物品图标号必须是正整数，收到 0',
    ],
    [
      'battle background',
      palBattleBackgroundAssetId,
      6,
      'battle-background.pal.006',
      -1,
      'PAL 战场背景号必须是非负整数，收到 -1',
    ],
    ['tileset', palTilesetAssetId, 225, 'tileset.pal.225', 0, 'PAL 瓦片集号必须是正整数，收到 0'],
    [
      'world sprite',
      palSpriteAssetId,
      82,
      'sprite.pal.082',
      0,
      'PAL 大世界精灵号必须是正整数，收到 0',
    ],
  ])('uses the %s namespace and its minimum index', (_asset, toAssetId, number, assetId, invalid, error) => {
    expect(toAssetId(number)).toBe(assetId)
    expect(() => toAssetId(invalid)).toThrow(new Error(error))
  })
})

test('PAL faces use the stable actor id', () => {
  expect(palFaceAssetId('li-xiaoyao')).toBe('face.pal.li-xiaoyao')
  expect(() => palFaceAssetId('')).toThrow(
    new Error('PAL 角色 id 必须是无首尾空白的非空字符串，收到 ""'),
  )
})

test('the physical hit effect has a fixed asset id', () => {
  expect(PAL_PHYSICAL_EFFECT_ASSET_ID).toBe('effect-sprite.pal.physical-hit')
})

describe('PAL battle sprite channels', () => {
  test('player slots start at zero and preserve the player namespace', () => {
    expect(palBattleSpriteAssetId('player', 0)).toBe('battle-sprite.pal.player.000')
    expect(palBattleSpriteAssetId('player', 7)).toBe('battle-sprite.pal.player.007')
    expect(() => palBattleSpriteAssetId('player', -1)).toThrow(
      new Error('PAL player 战斗精灵号必须是 非负整数，收到 -1'),
    )
    expect(() => palBattleSpriteAssetId('player', 1.5)).toThrow(
      new Error('PAL player 战斗精灵号必须是 非负整数，收到 1.5'),
    )
  })

  test('enemy slots start at one and preserve the enemy namespace', () => {
    expect(palBattleSpriteAssetId('enemy', 1)).toBe('battle-sprite.pal.enemy.001')
    expect(palBattleSpriteAssetId('enemy', 123)).toBe('battle-sprite.pal.enemy.123')
    expect(() => palBattleSpriteAssetId('enemy', 0)).toThrow(
      new Error('PAL enemy 战斗精灵号必须是 正整数，收到 0'),
    )
  })
})
