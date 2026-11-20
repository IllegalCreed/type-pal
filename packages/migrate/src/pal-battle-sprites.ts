/** PAL 发布目录以 0–9 标识战斗角色定义，以 10–18 标识召唤定义。 */
export function palPlayerBattleSpriteDefinitionId(sourceSpriteNumber: number): string {
  if (!Number.isInteger(sourceSpriteNumber) || sourceSpriteNumber < 0 || sourceSpriteNumber > 18)
    throw new Error(`PAL player 战斗精灵定义号期望 0..18，收到 ${String(sourceSpriteNumber)}`)
  return sourceSpriteNumber <= 9
    ? `player-fighter-${sourceSpriteNumber}`
    : `player-summon-${sourceSpriteNumber}`
}
