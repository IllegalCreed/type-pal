import { describe, expect, test } from 'vitest'
import { palPlayerBattleSpriteDefinitionId } from './pal-battle-sprites.js'

describe('player battle sprite resource identity', () => {
  test('player 0..9 → fighter-i、10..18 → summon-i；越界/非整数拒绝', () => {
    expect(palPlayerBattleSpriteDefinitionId(0)).toBe('player-fighter-0')
    expect(palPlayerBattleSpriteDefinitionId(9)).toBe('player-fighter-9')
    expect(palPlayerBattleSpriteDefinitionId(10)).toBe('player-summon-10')
    expect(palPlayerBattleSpriteDefinitionId(18)).toBe('player-summon-18')
    expect(() => palPlayerBattleSpriteDefinitionId(19)).toThrow('期望 0..18')
    expect(() => palPlayerBattleSpriteDefinitionId(-1)).toThrow('期望 0..18')
    expect(() => palPlayerBattleSpriteDefinitionId(1.5)).toThrow('期望 0..18')
  })
})
