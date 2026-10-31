/** PLAYERROLES SoA 行布局（player-roles.ts readPlayers 顺序）：row × 12B + player × 2B。 */
export const PLAYER_ROLE_ROWS = {
  spriteNum: 2,
  name: 3,
  level: 6,
  maxHP: 7,
  maxMP: 8,
  hp: 9,
  mp: 10,
  equipHead: 11,
  equipAccessory: 16,
  attackStrength: 17,
  fleeRate: 21,
  elemWind: 23,
  elemThunder: 24,
  elemWater: 25,
  elemFire: 26,
  elemEarth: 27,
  magicSlot0: 32,
  magicSlot31: 63,
  walkFrames: 64,
  attackSound: 69,
} as const

/** 写 PLAYERROLES chunk3 的一个 (row, player) 单元。 */
export function playerRoleCell(row: number, player: number, value: number): [number, number] {
  return [row * 12 + player * 2, value]
}
