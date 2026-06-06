/**
 * DATA.MKF 余下 chunks 的 parser(M4 P2 T2)。
 * sdlpal 真值:reference/sdlpal/global.c::PAL_LoadDefaultGame。
 * inventory 参考:docs/resource-status.md DATA.MKF section。
 *
 * 覆盖 chunk:
 *   6  — lprgLevelUpMagic (LEVELUPMAGIC_ALL 数组)
 *   11 — rgwBattleEffectIndex[10][2]
 *   14 — rgLevelUpExp[100]
 *
 * 跳过:
 *   7/8  — 空 chunk(0 字节)
 *   9/10 — sprite 数据,P2.T3 处理
 *   12   — 对话框图标 sprite,P2.T3 处理
 */

// ── chunk 14: rgLevelUpExp ─────────────────────────────────────────────────

/**
 * 解析 DATA.MKF chunk 14 → rgLevelUpExp(per-level 经验阈值)。
 *
 * sdlpal global.h:
 *   `LEVELUPEXP rgLevelUpExp[MAX_LEVELS + 1];`
 *   `typedef WORD LEVELUPEXP;`
 *   MAX_LEVELS = 99 → 数组长 100,200 字节。
 *
 * index 0 = 升至 1 级所需;index 99 = 升至 100 级所需(sdlpal 中通常为 0 占位)。
 */
export function parseLevelUpExp(buf: Uint8Array): number[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const count = Math.min(100, Math.floor(buf.byteLength / 2))
  const out: number[] = []
  for (let i = 0; i < count; i++) out.push(view.getUint16(i * 2, true))
  return out
}

// ── chunk 6: lprgLevelUpMagic ─────────────────────────────────────────────

/**
 * 每个 level-up 条目中单个角色的习得信息。
 * sdlpal global.h tagLEVELUPMAGIC:
 *   `WORD wLevel;` — 触发习得的等级
 *   `WORD wMagic;` — 习得的法术编号
 */
export interface LevelUpMagicEntry { level: number; magic: number }

/**
 * 解析 DATA.MKF chunk 6 → lprgLevelUpMagic。
 *
 * sdlpal struct 布局:
 *   `LEVELUPMAGIC_ALL = { LEVELUPMAGIC m[MAX_PLAYABLE_PLAYER_ROLES] }`
 *   `LEVELUPMAGIC     = { WORD wLevel; WORD wMagic }`
 *   MAX_PLAYABLE_PLAYER_ROLES = 5
 *
 * 每条 LEVELUPMAGIC_ALL = 5 roles × 4 bytes = 20 bytes。
 * chunk 6 = 400 bytes / 20 = 20 条(nLevelUpMagic = 20)。
 *
 * 返回:二维数组 `result[entryIndex][roleIndex]` = `{level, magic}`。
 * entryIndex = 0..nLevelUpMagic-1,roleIndex = 0..roleCount-1。
 *
 * @param buf       DATA.MKF chunk 6 原始字节
 * @param roleCount MAX_PLAYABLE_PLAYER_ROLES(= 5)
 */
export function parseLevelUpMagic(buf: Uint8Array, roleCount: number): LevelUpMagicEntry[][] {
  if (roleCount <= 0) return []
  const entrySize = roleCount * 4 // LEVELUPMAGIC(4 bytes) × roleCount
  if (entrySize === 0 || buf.byteLength < entrySize) return []
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const numEntries = Math.floor(buf.byteLength / entrySize)
  const out: LevelUpMagicEntry[][] = []
  for (let e = 0; e < numEntries; e++) {
    const row: LevelUpMagicEntry[] = []
    for (let r = 0; r < roleCount; r++) {
      const off = e * entrySize + r * 4
      const level = view.getUint16(off, true)     // wLevel
      const magic = view.getUint16(off + 2, true) // wMagic
      row.push({ level, magic })
    }
    out.push(row)
  }
  return out
}

// ── chunk 11: rgwBattleEffectIndex ────────────────────────────────────────

/**
 * 解析 DATA.MKF chunk 11 → rgwBattleEffectIndex(WORD 数组)。
 *
 * sdlpal global.h:
 *   `WORD rgwBattleEffectIndex[10][2];` = 20 WORD = 40 字节。
 *
 * 直接 dump 为一维 WORD 数组(length = byteLength / 2),与 sdlpal
 * 二维数组内存连续等价,使用时 `arr[role * 2 + subIdx]` 解读。
 */
export function parseBattleEffectIndex(buf: Uint8Array): number[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const count = Math.floor(buf.byteLength / 2)
  return Array.from({ length: count }, (_, i) => view.getUint16(i * 2, true))
}
