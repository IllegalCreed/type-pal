/** 装备派生值与行写入；只操作当前GameState，不依赖脚本执行器。 */
import type { PlayerRole } from '@type-pal/shared'
import type { GameState } from './game-state.js'
import { removePoisonLevel99 } from './player-poison-state.js'

export const MAX_PLAYER_EQUIPMENTS = 6
export const K_STATUS_DUAL_ATTACK = 8

// ── 6 effective stat getter(sdlpal global.c:1736-1900 1:1)──────────────────

/** sdlpal `PAL_GetPlayerAttackStrength`(global.c:1736-1767)。 */
export function getPlayerAttackStrength(gs: GameState, roleId: number): number {
  let value = gs.PlayerRolesRuntime.rgwAttackStrength[roleId] ?? 0
  for (let i = 0; i <= MAX_PLAYER_EQUIPMENTS; i++) {
    value += gs.rgEquipmentEffect[i]?.rgwAttackStrength[roleId] ?? 0
  }
  return value
}

/** sdlpal `PAL_GetPlayerMagicStrength`(global.c:1768-1799)。 */
export function getPlayerMagicStrength(gs: GameState, roleId: number): number {
  let value = gs.PlayerRolesRuntime.rgwMagicStrength[roleId] ?? 0
  for (let i = 0; i <= MAX_PLAYER_EQUIPMENTS; i++) {
    value += gs.rgEquipmentEffect[i]?.rgwMagicStrength[roleId] ?? 0
  }
  return value
}

/** sdlpal `PAL_GetPlayerDefense`(global.c:1800-1831)。 */
export function getPlayerDefense(gs: GameState, roleId: number): number {
  let value = gs.PlayerRolesRuntime.rgwDefense[roleId] ?? 0
  for (let i = 0; i <= MAX_PLAYER_EQUIPMENTS; i++) {
    value += gs.rgEquipmentEffect[i]?.rgwDefense[roleId] ?? 0
  }
  return value
}

/** sdlpal `PAL_GetPlayerDexterity`(global.c:1832-1867)— 注:不含 haste/slow 修饰,
 * 那部分在 battle formulas.ts `getPlayerActualDexterity` 处理。 */
export function getPlayerDexterity(gs: GameState, roleId: number): number {
  let value = gs.PlayerRolesRuntime.rgwDexterity[roleId] ?? 0
  for (let i = 0; i <= MAX_PLAYER_EQUIPMENTS; i++) {
    value += gs.rgEquipmentEffect[i]?.rgwDexterity[roleId] ?? 0
  }
  return value
}

/** sdlpal `PAL_GetPlayerFleeRate`(global.c:1868-1899)。 */
export function getPlayerFleeRate(gs: GameState, roleId: number): number {
  let value = gs.PlayerRolesRuntime.rgwFleeRate[roleId] ?? 0
  for (let i = 0; i <= MAX_PLAYER_EQUIPMENTS; i++) {
    value += gs.rgEquipmentEffect[i]?.rgwFleeRate[roleId] ?? 0
  }
  return value
}

/** sdlpal `PAL_GetPlayerPoisonResistance`(global.c:1900-1935)。 */
export function getPlayerPoisonResistance(gs: GameState, roleId: number): number {
  let value = gs.PlayerRolesRuntime.rgwPoisonResistance[roleId] ?? 0
  for (let i = 0; i <= MAX_PLAYER_EQUIPMENTS; i++) {
    value += gs.rgEquipmentEffect[i]?.rgwPoisonResistance[roleId] ?? 0
  }
  return Math.max(0, Math.min(100, value)) // sdlpal clamp [0, 100]
}

/**
 * 战斗中脚本以 0x19(increase)/0x1A(set)改了 PlayerRolesRuntime base 后,把派生属性回灌到战斗
 * 工作副本 snapshot(projectRuntimeToBattleRoles 开战投影的那份 role),使加成**当场生效** ——
 * 对齐 sdlpal 单一 `gpGlobals->g.PlayerRoles`(战内直接读写、无快照,加成天然即时)。
 *
 * 镇狱明王「赵灵儿力量觉醒」(all.json@42309)正是战内 0x19 连发。此前只写 runtime、不刷快照,致:
 *   ① 伤害/防御/UI 全用旧值 → 加成"没效果";
 *   ② 紧随其后的 0x1D 治疗(+9999,战斗侧写快照)封顶到旧 maxHP(374 而非 544);
 *   ③ 菜单(读 runtime)与战斗(读 snapshot)显示对不上。
 *
 * **不动** hp/mp —— 它们是战斗 live 当前值(扣血/治疗由战斗侧 opcode 写快照,writeBack 在边界回
 * runtime);从 runtime 回灌会抹掉战内伤害。派生数值经 effective getter(base + Σ
 * rgEquipmentEffect[0..6] 含 Extra 槽),故 0x30 临时 buff(梦蛇 攻/身法 +100%)不被清。
 */
export function resyncBattleRoleStatsFromRuntime(
  role: PlayerRole,
  gs: GameState,
  roleId: number,
): void {
  const rt = gs.PlayerRolesRuntime
  // maxHP/maxMP/level 投影时不吃装备(projectRuntimeToBattleRoles game-state.ts:1539-1541)→ 直接取 runtime base
  role.level = rt.rgwLevel[roleId] ?? role.level
  role.maxHP = rt.rgwMaxHP[roleId] ?? role.maxHP
  role.maxMP = rt.rgwMaxMP[roleId] ?? role.maxMP
  role.attackStrength = getPlayerAttackStrength(gs, roleId)
  role.magicStrength = getPlayerMagicStrength(gs, roleId)
  role.defense = getPlayerDefense(gs, roleId)
  role.dexterity = getPlayerDexterity(gs, roleId)
  role.fleeRate = getPlayerFleeRate(gs, roleId)
  role.poisonResistance = getPlayerPoisonResistance(gs, roleId)
}

// ── PlayerRoles row-index field map(sdlpal global.h:299-336 tagPLAYERROLES)──
//
// sdlpal `gpGlobals->g.PlayerRoles` 整张 SoA 表,每 row = PLAYERS(MAX_PLAYER_ROLES WORDs)。
// row index 是 byte-cast (`(WORD*)&PlayerRoles`) 的 row offset(每 row N WORDs)。
//
// 用于 opcode 0x17 / 0x19 / 0x1A — operand[0/1] = row index。
//
// 关键(2026-05-28 audit 发现):ts mutatePlayerStat 此前 FIELD_MAP 全错位 -1
// (5=Level / 16=AttackStrength),实际 sdlpal 真值是 6=Level / 17=AttackStrength。
// 这里按真值 1:1。

export const PLAYERROLES_ROW = {
  AVATAR: 0,
  SPRITE_NUM_IN_BATTLE: 1,
  SPRITE_NUM: 2,
  NAME: 3,
  ATTACK_ALL: 4,
  UNKNOWN1: 5,
  LEVEL: 6,
  MAX_HP: 7,
  MAX_MP: 8,
  HP: 9,
  MP: 10,
  EQUIPMENT_0: 11,
  EQUIPMENT_1: 12,
  EQUIPMENT_2: 13,
  EQUIPMENT_3: 14,
  EQUIPMENT_4: 15,
  EQUIPMENT_5: 16,
  ATTACK_STRENGTH: 17,
  MAGIC_STRENGTH: 18,
  DEFENSE: 19,
  DEXTERITY: 20,
  FLEE_RATE: 21,
  POISON_RESISTANCE: 22,
  ELEM_RESIST_0: 23,
  ELEM_RESIST_1: 24,
  ELEM_RESIST_2: 25,
  ELEM_RESIST_3: 26,
  ELEM_RESIST_4: 27,
  COVERED_BY: 31,
  // row 32-63 = rgwMagic[32][6]
  WALK_FRAMES: 64,
  COOPERATIVE_MAGIC: 65, // 装备改合击,圣灵珠 0x1A[65,...]
} as const

/** Helper:把 EquipmentEffectRoles 某 row 给 role 写入(sdlpal opcode 0x17 真值)。 */
export function writeEquipmentEffectField(
  gs: GameState,
  partIdx: number,
  rowIdx: number,
  roleId: number,
  value: number,
): void {
  if (partIdx < 0 || partIdx > MAX_PLAYER_EQUIPMENTS) return
  const eff = gs.rgEquipmentEffect[partIdx]
  if (!eff) return
  switch (rowIdx) {
    // 装备 override 类(sdlpal flat WORD row;长鞭 sprite=6/attackAll=1、圣灵珠 coopMagic=351)
    case PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE:
      eff.rgwSpriteNumInBattle[roleId] = value
      break
    case PLAYERROLES_ROW.ATTACK_ALL:
      eff.rgwAttackAll[roleId] = value
      break
    case PLAYERROLES_ROW.COOPERATIVE_MAGIC:
      eff.rgwCooperativeMagic[roleId] = value
      break
    case PLAYERROLES_ROW.LEVEL:
      eff.rgwLevel[roleId] = value
      break
    case PLAYERROLES_ROW.MAX_HP:
      eff.rgwMaxHP[roleId] = value
      break
    case PLAYERROLES_ROW.MAX_MP:
      eff.rgwMaxMP[roleId] = value
      break
    case PLAYERROLES_ROW.HP:
      eff.rgwHP[roleId] = value
      break
    case PLAYERROLES_ROW.MP:
      eff.rgwMP[roleId] = value
      break
    case PLAYERROLES_ROW.ATTACK_STRENGTH:
      eff.rgwAttackStrength[roleId] = value
      break
    case PLAYERROLES_ROW.MAGIC_STRENGTH:
      eff.rgwMagicStrength[roleId] = value
      break
    case PLAYERROLES_ROW.DEFENSE:
      eff.rgwDefense[roleId] = value
      break
    case PLAYERROLES_ROW.DEXTERITY:
      eff.rgwDexterity[roleId] = value
      break
    case PLAYERROLES_ROW.FLEE_RATE:
      eff.rgwFleeRate[roleId] = value
      break
    case PLAYERROLES_ROW.POISON_RESISTANCE:
      eff.rgwPoisonResistance[roleId] = value
      break
    case PLAYERROLES_ROW.ELEM_RESIST_0:
    case PLAYERROLES_ROW.ELEM_RESIST_1:
    case PLAYERROLES_ROW.ELEM_RESIST_2:
    case PLAYERROLES_ROW.ELEM_RESIST_3:
    case PLAYERROLES_ROW.ELEM_RESIST_4: {
      const elemIdx = rowIdx - PLAYERROLES_ROW.ELEM_RESIST_0
      const row = eff.rgwElementalResistance[elemIdx]
      if (row) row[roleId] = value
      break
    }
    case PLAYERROLES_ROW.COVERED_BY:
      eff.rgwCoveredBy[roleId] = value
      break
    default:
      console.warn(`writeEquipmentEffectField: row ${rowIdx} 未支持(装备 effect 真值)`)
  }
}

/** Helper:给 PlayerRolesRuntime 某 row 给 role 加上 delta(sdlpal opcode 0x19)。 */
export function addPlayerStatRow(
  gs: GameState,
  rowIdx: number,
  roleId: number,
  delta: number,
): void {
  const r = gs.PlayerRolesRuntime
  switch (rowIdx) {
    case PLAYERROLES_ROW.LEVEL:
      r.rgwLevel[roleId] = (r.rgwLevel[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.MAX_HP:
      r.rgwMaxHP[roleId] = (r.rgwMaxHP[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.MAX_MP:
      r.rgwMaxMP[roleId] = (r.rgwMaxMP[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.HP:
      r.rgwHP[roleId] = (r.rgwHP[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.MP:
      r.rgwMP[roleId] = (r.rgwMP[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.ATTACK_STRENGTH:
      r.rgwAttackStrength[roleId] = (r.rgwAttackStrength[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.MAGIC_STRENGTH:
      r.rgwMagicStrength[roleId] = (r.rgwMagicStrength[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.DEFENSE:
      r.rgwDefense[roleId] = (r.rgwDefense[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.DEXTERITY:
      r.rgwDexterity[roleId] = (r.rgwDexterity[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.FLEE_RATE:
      r.rgwFleeRate[roleId] = (r.rgwFleeRate[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.POISON_RESISTANCE:
      r.rgwPoisonResistance[roleId] = (r.rgwPoisonResistance[roleId] ?? 0) + delta
      break
    case PLAYERROLES_ROW.COVERED_BY:
      r.rgwCoveredBy[roleId] = (r.rgwCoveredBy[roleId] ?? 0) + delta
      break
    default:
      console.warn(`addPlayerStatRow: row ${rowIdx} 未支持`)
  }
}

/** Helper:set PlayerRolesRuntime 某 row 给 role(sdlpal opcode 0x1A,script.c:834-865)。 */
export function setPlayerStatRow(
  gs: GameState,
  rowIdx: number,
  roleId: number,
  value: number,
): void {
  // sdlpal script.c:838-847:装备进行中(g_iCurEquipPart != -1)→ 写 rgEquipmentEffect[part] 覆盖层而非 base。
  // 装备脚本(scriptOnEquip)的 0x1A 把 stat 加进可卸下的效果层;卸装时 removeEquipmentEffect 清掉。
  // 关键:脚本结束必须 reset iCurEquipPart=-1(event-system trigger-end / runEquipScriptSync 末尾),
  // 否则后续无关脚本的 0x1A 会误写覆盖层(2026-05-29 P1#4)。
  if (gs.iCurEquipPart !== -1) {
    writeEquipmentEffectField(gs, gs.iCurEquipPart, rowIdx, roleId, value)
    return
  }
  const r = gs.PlayerRolesRuntime
  switch (rowIdx) {
    case PLAYERROLES_ROW.LEVEL:
      r.rgwLevel[roleId] = value
      break
    case PLAYERROLES_ROW.MAX_HP:
      r.rgwMaxHP[roleId] = value
      break
    case PLAYERROLES_ROW.MAX_MP:
      r.rgwMaxMP[roleId] = value
      break
    case PLAYERROLES_ROW.HP:
      r.rgwHP[roleId] = value
      break
    case PLAYERROLES_ROW.MP:
      r.rgwMP[roleId] = value
      break
    case PLAYERROLES_ROW.ATTACK_STRENGTH:
      r.rgwAttackStrength[roleId] = value
      break
    case PLAYERROLES_ROW.MAGIC_STRENGTH:
      r.rgwMagicStrength[roleId] = value
      break
    case PLAYERROLES_ROW.DEFENSE:
      r.rgwDefense[roleId] = value
      break
    case PLAYERROLES_ROW.DEXTERITY:
      r.rgwDexterity[roleId] = value
      break
    case PLAYERROLES_ROW.FLEE_RATE:
      r.rgwFleeRate[roleId] = value
      break
    case PLAYERROLES_ROW.POISON_RESISTANCE:
      r.rgwPoisonResistance[roleId] = value
      break
    case PLAYERROLES_ROW.COVERED_BY:
      r.rgwCoveredBy[roleId] = value
      break
    // M2(2026-06-07 sdlpal 审查):0x1A 剧情变身写造型 row(原先落 default no-op → 变身造型不更新)。
    //   sprite/coop 本有 runtime 字段、只是没路由;avatar/battleSprite/attackAll/walkFrames 本次补字段。
    case PLAYERROLES_ROW.AVATAR:
      r.rgwAvatar[roleId] = value
      break
    case PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE:
      r.rgwSpriteNumInBattle[roleId] = value
      break
    case PLAYERROLES_ROW.SPRITE_NUM:
      r.rgwSpriteNum[roleId] = value
      break
    case PLAYERROLES_ROW.ATTACK_ALL:
      r.rgwAttackAll[roleId] = value
      break
    case PLAYERROLES_ROW.WALK_FRAMES:
      r.rgwWalkFrames[roleId] = value
      break
    case PLAYERROLES_ROW.COOPERATIVE_MAGIC:
      r.rgwCooperativeMagic[roleId] = value
      break
    default:
      console.warn(`setPlayerStatRow: row ${rowIdx} 未支持`)
  }
}

// ── 2 mutator(sdlpal global.c:1333 / 1372 1:1)──────────────────────────────

/**
 * sdlpal `PAL_RemoveEquipmentEffect`(global.c:1372-1456)。
 *
 * 真值:把 `rgEquipmentEffect[wEquipPart]` 当 byte 数组,对该 part 所有 field row
 * (sizeof PLAYERROLES / sizeof PLAYERS 行)给定 wPlayerRole 列清 0。
 *
 * ts 等价:把该 part 所有 stat field 给定 roleId 清 0。
 *
 * 额外副作用(sdlpal global.c:1406-1455):
 *  - Hand(part 3)卸下 → reset DualAttack status(`rgPlayerStatus[role][kStatusDualAttack] = 0`)
 *  - Wear(part 5)卸下 → 清 poison level 99(rgPoisonStatus where level == 99)
 * ts 简版:DualAttack status 模型未做(留 follow-up),poison level 99 清留 D15 poison 整组做时一并。
 */
export function removeEquipmentEffect(gs: GameState, roleId: number, partIdx: number): void {
  if (partIdx < 0 || partIdx > MAX_PLAYER_EQUIPMENTS) return
  const eff = gs.rgEquipmentEffect[partIdx]
  if (!eff) return
  eff.rgwSpriteNumInBattle[roleId] = 0
  eff.rgwAttackAll[roleId] = 0
  eff.rgwCooperativeMagic[roleId] = 0
  eff.rgwLevel[roleId] = 0
  eff.rgwMaxHP[roleId] = 0
  eff.rgwMaxMP[roleId] = 0
  eff.rgwHP[roleId] = 0
  eff.rgwMP[roleId] = 0
  eff.rgwAttackStrength[roleId] = 0
  eff.rgwMagicStrength[roleId] = 0
  eff.rgwDefense[roleId] = 0
  eff.rgwDexterity[roleId] = 0
  eff.rgwFleeRate[roleId] = 0
  eff.rgwPoisonResistance[roleId] = 0
  for (let elem = 0; elem < 5; elem++) {
    const row = eff.rgwElementalResistance[elem]
    if (row) row[roleId] = 0
  }
  eff.rgwCoveredBy[roleId] = 0

  // sdlpal global.c:1406-1412:卸 Hand(part3)→ reset DualAttack status(装备授的 32760 唯一清除点)
  if (partIdx === 3 /* kBodyPartHand */) {
    const st = gs.rgPlayerStatus[roleId]
    if (st) st[K_STATUS_DUAL_ATTACK] = 0
  } else if (partIdx === 5 /* kBodyPartWear */) {
    // 卸 Wear → 清 level≥99 毒(寿葫芦的常驻回血"毒"随饰品卸下消失,global.c:1413-1454)
    removePoisonLevel99(gs, roleId)
  }
}
