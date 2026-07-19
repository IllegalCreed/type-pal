import { describe, expect, test } from 'vitest'
import type { AssetCatalogV1 } from './asset.js'
import {
  battleSpriteDefinitionFrameDemand,
  battleSpriteDefinitionFrameIndices,
  resolveBattleSpriteDefinition,
  validateBattleSprites,
} from './battle-sprite.js'

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    fighter: {
      kind: 'battle-sprite',
      path: 'assets/generated/fighter.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: '0'.repeat(64),
      origin: { kind: 'generated' },
    },
    wrong: {
      kind: 'sprite',
      path: 'assets/generated/world.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: '1'.repeat(64),
      origin: { kind: 'generated' },
    },
  },
}

const fighter = {
  id: 'hero',
  label: '主角',
  asset: 'fighter',
  profile: {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
      steal: 10,
    },
    castEffectBase: 15,
    attackEffectBase: 0,
  },
}

describe('BattleSpriteDef schema/profile', () => {
  test('player-fighter 命名帧与 optional steal 形成精确需求', () => {
    const [definition] = validateBattleSprites([fighter], catalog)
    expect(battleSpriteDefinitionFrameDemand(definition!)).toBe(11)
    expect([...battleSpriteDefinitionFrameIndices(definition!)]).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    const { steal: _steal, ...frames } = fighter.profile.frames
    const noSteal = { ...fighter, profile: { ...fighter.profile, frames } }
    expect(battleSpriteDefinitionFrameDemand(validateBattleSprites([noSteal], catalog)[0]!)).toBe(
      10,
    )
  })

  test('enemy 区段必须连续，actTicksPerFrame=0 合法', () => {
    const [definition] = validateBattleSprites(
      [
        {
          id: 'enemy',
          label: '敌人',
          asset: 'fighter',
          profile: {
            kind: 'enemy',
            idle: { start: 0, count: 2 },
            magic: { start: 2, count: 0 },
            attack: { start: 2, count: 3 },
            idleTicksPerFrame: 1,
            actTicksPerFrame: 0,
          },
        },
      ],
      catalog,
    )
    expect(battleSpriteDefinitionFrameDemand(definition!)).toBe(5)
    expect(() =>
      validateBattleSprites(
        [
          {
            ...definition,
            profile: { ...definition!.profile, attack: { start: 3, count: 3 } },
          },
        ],
        catalog,
      ),
    ).toThrow('必须紧接')
  })

  test('summon 必须用实际帧数计算，零帧 fail-loud', () => {
    const [definition] = validateBattleSprites(
      [{ id: 'summon', label: '召唤', asset: 'fighter', profile: { kind: 'summon' } }],
      catalog,
    )
    expect(battleSpriteDefinitionFrameDemand(definition!, 4)).toBe(4)
    expect(() => battleSpriteDefinitionFrameDemand(definition!)).toThrow('actualFrameCount')
    expect(() => battleSpriteDefinitionFrameDemand(definition!, 0)).toThrow('至少需要 1 个')
  })

  test('重复 id、缺 asset、kind mismatch 与旧 number/path 全拒绝', () => {
    expect(() => validateBattleSprites([fighter, fighter], catalog)).toThrow('重复 id')
    expect(() => validateBattleSprites([{ ...fighter, asset: 'missing' }], catalog)).toThrow(
      '不在 catalog',
    )
    expect(() => validateBattleSprites([{ ...fighter, asset: 'wrong' }], catalog)).toThrow(
      '期望 battle-sprite',
    )
    expect(() => validateBattleSprites([{ ...fighter, spriteNum: 0 }], catalog)).toThrow(
      '旧 number/path',
    )
  })

  test('定义解析区分缺失与 profile mismatch', () => {
    const definitions = validateBattleSprites([fighter], catalog)
    expect(resolveBattleSpriteDefinition('hero', definitions, 'player-fighter').id).toBe('hero')
    expect(() => resolveBattleSpriteDefinition('missing', definitions)).toThrow('不存在')
    expect(() => resolveBattleSpriteDefinition('hero', definitions, 'enemy')).toThrow(
      'profile 期望 enemy',
    )
  })
})
