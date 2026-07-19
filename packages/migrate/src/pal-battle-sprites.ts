import type { BattleSpriteDef } from '@type-pal/content'
import { palBattleSpriteAssetId } from '@type-pal/content'
import type { SourceEnemy, SourceEnemyObject } from './migrate-enemies.js'

export const PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS = [
  11, 10, 10, 10, 10, 10, 10, 10, 10, 11, 4, 13, 2, 6, 2, 5, 3, 5, 7,
] as const

export const PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS = [
  4, 3, 4, 2, 3, 4, 3, 4, 3, 4, 4, 3, 3, 3, 3, 3, 4, 3, 3, 3, 6, 3, 3, 4, 5, 2, 3, 2, 2, 3, 4, 4, 3,
  5, 4, 5, 5, 3, 2, 5, 4, 6, 5, 7, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 2, 3, 2, 2, 1,
  7, 3, 3, 4, 2, 1, 1, 3, 4, 3, 3, 7, 4, 5, 9, 5, 5, 8, 10, 5, 5, 4, 3, 3, 3, 4, 4, 4, 4, 6, 3, 15,
  3, 11, 5, 5, 1, 6, 4, 4, 7, 2, 2, 4, 3, 3, 10, 5, 16, 4, 3, 5, 9, 9, 5, 2, 2, 4, 4, 9, 7, 3, 3, 8,
  4, 16, 2, 2, 4, 4, 4, 2, 6, 9, 1, 1, 1, 1, 1, 1, 1, 9, 7, 2, 3, 3, 2,
] as const

export const PAL_PLAYER_BATTLE_EFFECT_INDEX = [
  0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 3, 2, 2, 4, 0, 6, 4, 3, 3,
] as const

export function palPlayerBattleSpriteDefinitionId(sprite: number): string {
  if (!Number.isInteger(sprite) || sprite < 0 || sprite > 18)
    throw new Error(`PAL player 战斗精灵定义号期望 0..18，收到 ${String(sprite)}`)
  return sprite <= 9 ? `player-fighter-${sprite}` : `player-summon-${sprite}`
}

export function palEnemyBattleSpriteDefinitionId(sprite: number): string {
  if (!Number.isInteger(sprite) || sprite <= 0)
    throw new Error(`PAL enemy 战斗精灵定义号期望正整数，收到 ${String(sprite)}`)
  return `enemy-battle-${sprite}`
}

export function palSummonBattleSpriteDefinitionId(godId: number): string {
  if (!Number.isInteger(godId) || godId < 0 || godId > 8)
    throw new Error(`PAL 召唤 godId 期望 0..8，收到 ${String(godId)}`)
  return palPlayerBattleSpriteDefinitionId(godId + 10)
}

export function createPalPlayerBattleSpriteDefinitions(
  frameCounts: readonly number[],
  effectIndex: readonly number[],
): BattleSpriteDef[] {
  if (JSON.stringify(frameCounts) !== JSON.stringify(PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS))
    throw new Error('PAL player 战斗精灵实际帧数发生漂移')
  if (JSON.stringify(effectIndex) !== JSON.stringify(PAL_PLAYER_BATTLE_EFFECT_INDEX))
    throw new Error('PAL battle-effect-index.json 发生漂移')
  return frameCounts.map((frameCount, sprite) => {
    const id = palPlayerBattleSpriteDefinitionId(sprite)
    if (sprite >= 10)
      return {
        id,
        label: `PAL 召唤战斗精灵 ${sprite}`,
        asset: palBattleSpriteAssetId('player', sprite),
        profile: { kind: 'summon' },
      }
    const castEffectIndex = effectIndex[sprite * 2]
    const attackEffectIndex = effectIndex[sprite * 2 + 1]
    if (castEffectIndex === undefined || attackEffectIndex === undefined)
      throw new Error(`PAL fighter ${sprite} 缺 battle-effect-index profile`)
    return {
      id,
      label: `PAL 我方战斗精灵 ${sprite}`,
      asset: palBattleSpriteAssetId('player', sprite),
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
          ...(frameCount > 10 ? { steal: 10 } : {}),
        },
        castEffectBase: castEffectIndex * 10 + 15,
        attackEffectBase: attackEffectIndex * 3,
      },
    }
  })
}

export function createPalEnemyBattleSpriteDefinitions(
  enemies: readonly SourceEnemy[],
  enemyObjects: readonly SourceEnemyObject[],
  frameCounts: readonly number[],
): BattleSpriteDef[] {
  const sourceById = new Map(enemies.map((enemy) => [enemy.id, enemy]))
  if (JSON.stringify(frameCounts) !== JSON.stringify(PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS))
    throw new Error('PAL enemy 战斗精灵实际帧数发生漂移')
  let exact = 0
  let extra = 0
  for (let sprite = 1; sprite <= 153; sprite++) {
    const source = sourceById.get(sprite)
    if (!source) throw new Error(`PAL enemy ${sprite} 缺动画数据`)
    const actual = frameCounts[sprite - 1]
    if (actual === undefined) throw new Error(`PAL enemy ${sprite} 缺实际帧数`)
    const demand = source.idleFrames + source.magicFrames + source.attackFrames
    if (actual < demand)
      throw new Error(`PAL enemy ${sprite} 帧不足: profile 需要 ${demand}，实际 ${actual}`)
    if (actual === demand) exact++
    else extra++
  }
  if (exact !== 145 || extra !== 8)
    throw new Error(`PAL enemy profile/实际帧关系漂移: exact=${exact} extra=${extra}`)
  const used = [...new Set(enemyObjects.map((enemy) => enemy.enemyId))].sort((a, b) => a - b)
  return used.map((sprite) => {
    const source = sourceById.get(sprite)
    if (!source) throw new Error(`PAL enemy ${sprite} 缺动画数据`)
    return {
      id: palEnemyBattleSpriteDefinitionId(sprite),
      label: `PAL 敌方战斗精灵 ${sprite}`,
      asset: palBattleSpriteAssetId('enemy', sprite),
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: source.idleFrames },
        magic: { start: source.idleFrames, count: source.magicFrames },
        attack: {
          start: source.idleFrames + source.magicFrames,
          count: source.attackFrames,
        },
        idleTicksPerFrame: Math.max(1, source.idleAnimSpeed),
        actTicksPerFrame: source.actWaitFrames,
      },
    }
  })
}

export function createPalBattleSpriteDefinitions(
  enemies: readonly SourceEnemy[],
  enemyObjects: readonly SourceEnemyObject[],
  playerFrameCounts: readonly number[],
  enemyFrameCounts: readonly number[],
  effectIndex: readonly number[],
): BattleSpriteDef[] {
  return [
    ...createPalPlayerBattleSpriteDefinitions(playerFrameCounts, effectIndex),
    ...createPalEnemyBattleSpriteDefinitions(enemies, enemyObjects, enemyFrameCounts),
  ]
}
