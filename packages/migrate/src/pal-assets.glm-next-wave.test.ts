/** TEST-GLM-NEW-J-1 J01：pal-assets 冻结资源身份表。
 * 旧证：pal-assets.test.ts / ownership / retirements 盖物化与退役 IO；
 * pal-manifest.test.ts 只断言 manifest.roles === PAL_ASSET_ROLES 透传，
 * 角色→AssetId 绑定本身与 PAL_RNG_LEGACY_PALETTE 在旧测试零直接钉值。
 * 漂移会静默改写发布 manifest 的角色资源；此处冻结精确身份。
 */
import { palMusicAssetId, palSoundAssetId, palVideoAssetId } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  PAL_ASSET_ROLES,
  PAL_AUDIO_ROLES,
  PAL_RNG_LEGACY_PALETTE,
  PAL_SOUND_ROLES,
} from './pal-assets.js'

describe('PAL 资源角色身份表（manifest roles 冻结绑定）', () => {
  test('音频角色精确绑定：soundfont / boss 胜利 002 / 普通胜利 003 / 开局菜单 004 / 默认战斗 037', () => {
    expect(PAL_AUDIO_ROLES).toEqual({
      'audio.midiSoundfont': 'soundfont.default',
      'audio.defaultBattleMusic': palMusicAssetId(37),
      'audio.bossVictoryMusic': palMusicAssetId(2),
      'audio.normalVictoryMusic': palMusicAssetId(3),
      'audio.openingMenuMusic': palMusicAssetId(4),
    })
  })

  test('战斗音效角色精确绑定 028/029/045/047，且与音频角色键不相交', () => {
    expect(PAL_SOUND_ROLES).toEqual({
      'audio.battleItemUseSound': palSoundAssetId(28),
      'audio.battleCoopCastSound': palSoundAssetId(29),
      'audio.battleEscapeSound': palSoundAssetId(45),
      'audio.battleEnemyTransformSound': palSoundAssetId(47),
    })
    expect(Object.keys(PAL_SOUND_ROLES).filter((key) => key in PAL_AUDIO_ROLES)).toEqual([])
  })

  test('PAL_ASSET_ROLES = 音频+音效角色并集 + 三个非音频角色，无多余键', () => {
    expect(PAL_ASSET_ROLES).toEqual({
      ...PAL_AUDIO_ROLES,
      ...PAL_SOUND_ROLES,
      'video.startupTrademark': palVideoAssetId(1),
      'video.startupSplash': palVideoAssetId(2),
      'visual.standardColorTable': 'color.project-standard',
    })
    expect(Object.keys(PAL_ASSET_ROLES)).toHaveLength(
      Object.keys(PAL_AUDIO_ROLES).length + Object.keys(PAL_SOUND_ROLES).length + 3,
    )
  })

  test('RNG 帧动画 legacy 调色板映射冻结为 {3:2, 6:3, 7:6}，其余段缺省 0', () => {
    expect(PAL_RNG_LEGACY_PALETTE).toEqual({ 3: 2, 6: 3, 7: 6 })
  })
})
