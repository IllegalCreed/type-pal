import { describe, expect, test } from 'vitest'
import { palPlayerBattleSpriteDefinitionId } from './pal-battle-sprites.js'

describe('PAL 玩家战斗精灵定义 id', () => {
  test('保留角色段和召唤段的起止编号', () => {
    expect(palPlayerBattleSpriteDefinitionId(0)).toBe('player-fighter-0')
    expect(palPlayerBattleSpriteDefinitionId(9)).toBe('player-fighter-9')
    expect(palPlayerBattleSpriteDefinitionId(10)).toBe('player-summon-10')
    expect(palPlayerBattleSpriteDefinitionId(18)).toBe('player-summon-18')
  })

  test('拒绝越界编号与非整数', () => {
    expect(() => palPlayerBattleSpriteDefinitionId(-1)).toThrow('期望 0..18，收到 -1')
    expect(() => palPlayerBattleSpriteDefinitionId(19)).toThrow('期望 0..18，收到 19')
    expect(() => palPlayerBattleSpriteDefinitionId(1.5)).toThrow('期望 0..18，收到 1.5')
  })
})
