/**
 * TEST-FOUNDATION-COVERAGE-1 C组 test-only fixture：合成 MKF/表字节薄构造器。
 * 只放数据/构造器，不含产品算法，不被生产导入；布局常量以各解析器源码注释的
 * 原盘结构为准（enemies.ts:22-39 / player-roles.ts SoA 75 行×12B / spells.ts:60-89）。
 */

/** 构造 MKF 容器：N 个 chunk → 头 N+1 个 u32 LE 偏移 + chunk 顺序拼接。 */
export function mkMkf(chunks: ReadonlyArray<Uint8Array>): Uint8Array {
  const headerBytes = (chunks.length + 1) * 4
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const out = new Uint8Array(headerBytes + total)
  const view = new DataView(out.buffer)
  let cursor = headerBytes
  chunks.forEach((chunk, i) => {
    view.setUint32(i * 4, cursor, true)
    out.set(chunk, cursor)
    cursor += chunk.byteLength
  })
  view.setUint32(chunks.length * 4, cursor, true)
  return out
}

/** 全零表 + 指定 u16 LE 写入点（offset 单位=字节）。 */
export function mkTable(totalBytes: number, writes: ReadonlyArray<[number, number]>): Uint8Array {
  const out = new Uint8Array(totalBytes)
  const view = new DataView(out.buffer)
  for (const [offset, value] of writes) view.setUint16(offset, value, true)
  return out
}

/** PLAYERROLES SoA 行布局（player-roles.ts readPlayers 顺序）：row × 12B + player × 2B。 */
export const PLAYER_ROLE_ROWS = {
  avatar: 0,
  spriteNumInBattle: 1,
  spriteNum: 2,
  name: 3,
  attackAll: 4,
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

/** 最小完整 Words 表（flat/system/battleUi 为必填段，本组测试只消费具名段）。 */
export function mkWords(
  over: Partial<{ items: string[]; spells: string[]; persons: string[]; enemies: string[] }> = {},
) {
  return {
    items: over.items ?? [],
    spells: over.spells ?? [],
    persons: over.persons ?? [],
    enemies: over.enemies ?? [],
    scenes: [],
    flat: [],
    system: [],
    battleUi: [],
  }
}
