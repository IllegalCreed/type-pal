export function palPlayerBattleSpriteDefinitionId(sprite: number): string {
  if (!Number.isInteger(sprite) || sprite < 0 || sprite > 18)
    throw new Error(`PAL player 战斗精灵定义号期望 0..18，收到 ${String(sprite)}`)
  return sprite <= 9 ? `player-fighter-${sprite}` : `player-summon-${sprite}`
}
