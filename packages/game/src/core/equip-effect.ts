/**
 * C5 装备 effect 真值层 — sdlpal `global.c:1333-1900+` 1:1 port。
 *
 * 6 个 stat getter:effective = base PlayerRolesRuntime + Σ rgEquipmentEffect[i].
 * sdlpal 真值见 [global.c:1736-1900](../../../reference/sdlpal/global.c#L1736-L1900)。
 *
 * 2 个 mutator:
 *  - updateAllEquipments(gs, items):启动 / 读档时跨 role × 6 part 跑 scriptOnEquip
 *    填 rgEquipmentEffect(sdlpal global.c:1333 真值)
 *  - removeEquipmentEffect(gs, roleId, partIdx):卸下某 role 某 part 装备时清零
 *    对应 rgEquipmentEffect 行(sdlpal global.c:1372 真值)
 *
 * 1 个 sync opcode runner:
 *  - runEquipScriptSync(gs, items, scriptIp, role):同步消费 scriptOnEquip chain,
 *    只处理 0x17/0x18/0x19/0x1A/end/goto,撞到其它 log skip + 继续。
 */

import type { Item, PlayerRole } from '@type-pal/shared'
import { addItemToInventory, addPoisonForPlayer, consumeItemFromInventory, getGlobalCommands, getGlobalLabelMap, removePoisonLevel99, runPlayerPoisonEntrySync } from './event-system.js'
import { createInitialEquipmentEffect, type GameState } from './game-state.js'

const MAX_PLAYER_ROLES = 6
const MAX_PLAYER_EQUIPMENTS = 6
const SCRIPT_TICK_LIMIT = 256 // 防御 — scriptOnEquip 实测最长 ~5 op

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
export function resyncBattleRoleStatsFromRuntime(role: PlayerRole, gs: GameState, roleId: number): void {
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
  EQUIPMENT_0: 11, EQUIPMENT_1: 12, EQUIPMENT_2: 13,
  EQUIPMENT_3: 14, EQUIPMENT_4: 15, EQUIPMENT_5: 16,
  ATTACK_STRENGTH: 17,
  MAGIC_STRENGTH: 18,
  DEFENSE: 19,
  DEXTERITY: 20,
  FLEE_RATE: 21,
  POISON_RESISTANCE: 22,
  ELEM_RESIST_0: 23, ELEM_RESIST_1: 24, ELEM_RESIST_2: 25,
  ELEM_RESIST_3: 26, ELEM_RESIST_4: 27,
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
    case PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE: eff.rgwSpriteNumInBattle[roleId] = value; break
    case PLAYERROLES_ROW.ATTACK_ALL: eff.rgwAttackAll[roleId] = value; break
    case PLAYERROLES_ROW.COOPERATIVE_MAGIC: eff.rgwCooperativeMagic[roleId] = value; break
    case PLAYERROLES_ROW.LEVEL: eff.rgwLevel[roleId] = value; break
    case PLAYERROLES_ROW.MAX_HP: eff.rgwMaxHP[roleId] = value; break
    case PLAYERROLES_ROW.MAX_MP: eff.rgwMaxMP[roleId] = value; break
    case PLAYERROLES_ROW.HP: eff.rgwHP[roleId] = value; break
    case PLAYERROLES_ROW.MP: eff.rgwMP[roleId] = value; break
    case PLAYERROLES_ROW.ATTACK_STRENGTH: eff.rgwAttackStrength[roleId] = value; break
    case PLAYERROLES_ROW.MAGIC_STRENGTH: eff.rgwMagicStrength[roleId] = value; break
    case PLAYERROLES_ROW.DEFENSE: eff.rgwDefense[roleId] = value; break
    case PLAYERROLES_ROW.DEXTERITY: eff.rgwDexterity[roleId] = value; break
    case PLAYERROLES_ROW.FLEE_RATE: eff.rgwFleeRate[roleId] = value; break
    case PLAYERROLES_ROW.POISON_RESISTANCE: eff.rgwPoisonResistance[roleId] = value; break
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
    case PLAYERROLES_ROW.COVERED_BY: eff.rgwCoveredBy[roleId] = value; break
    default:
      console.warn(`writeEquipmentEffectField: row ${rowIdx} 未支持(装备 effect 真值)`)
  }
}

/** Helper:给 PlayerRolesRuntime 某 row 给 role 加上 delta(sdlpal opcode 0x19)。 */
export function addPlayerStatRow(gs: GameState, rowIdx: number, roleId: number, delta: number): void {
  const r = gs.PlayerRolesRuntime
  switch (rowIdx) {
    case PLAYERROLES_ROW.LEVEL: r.rgwLevel[roleId] = (r.rgwLevel[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.MAX_HP: r.rgwMaxHP[roleId] = (r.rgwMaxHP[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.MAX_MP: r.rgwMaxMP[roleId] = (r.rgwMaxMP[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.HP: r.rgwHP[roleId] = (r.rgwHP[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.MP: r.rgwMP[roleId] = (r.rgwMP[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.ATTACK_STRENGTH: r.rgwAttackStrength[roleId] = (r.rgwAttackStrength[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.MAGIC_STRENGTH: r.rgwMagicStrength[roleId] = (r.rgwMagicStrength[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.DEFENSE: r.rgwDefense[roleId] = (r.rgwDefense[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.DEXTERITY: r.rgwDexterity[roleId] = (r.rgwDexterity[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.FLEE_RATE: r.rgwFleeRate[roleId] = (r.rgwFleeRate[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.POISON_RESISTANCE: r.rgwPoisonResistance[roleId] = (r.rgwPoisonResistance[roleId] ?? 0) + delta; break
    case PLAYERROLES_ROW.COVERED_BY: r.rgwCoveredBy[roleId] = (r.rgwCoveredBy[roleId] ?? 0) + delta; break
    default:
      console.warn(`addPlayerStatRow: row ${rowIdx} 未支持`)
  }
}

/** Helper:set PlayerRolesRuntime 某 row 给 role(sdlpal opcode 0x1A,script.c:834-865)。 */
export function setPlayerStatRow(gs: GameState, rowIdx: number, roleId: number, value: number): void {
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
    case PLAYERROLES_ROW.LEVEL: r.rgwLevel[roleId] = value; break
    case PLAYERROLES_ROW.MAX_HP: r.rgwMaxHP[roleId] = value; break
    case PLAYERROLES_ROW.MAX_MP: r.rgwMaxMP[roleId] = value; break
    case PLAYERROLES_ROW.HP: r.rgwHP[roleId] = value; break
    case PLAYERROLES_ROW.MP: r.rgwMP[roleId] = value; break
    case PLAYERROLES_ROW.ATTACK_STRENGTH: r.rgwAttackStrength[roleId] = value; break
    case PLAYERROLES_ROW.MAGIC_STRENGTH: r.rgwMagicStrength[roleId] = value; break
    case PLAYERROLES_ROW.DEFENSE: r.rgwDefense[roleId] = value; break
    case PLAYERROLES_ROW.DEXTERITY: r.rgwDexterity[roleId] = value; break
    case PLAYERROLES_ROW.FLEE_RATE: r.rgwFleeRate[roleId] = value; break
    case PLAYERROLES_ROW.POISON_RESISTANCE: r.rgwPoisonResistance[roleId] = value; break
    case PLAYERROLES_ROW.COVERED_BY: r.rgwCoveredBy[roleId] = value; break
    // M2(2026-06-07 sdlpal 审查):0x1A 剧情变身写造型 row(原先落 default no-op → 变身造型不更新)。
    //   sprite/coop 本有 runtime 字段、只是没路由;avatar/battleSprite/attackAll/walkFrames 本次补字段。
    case PLAYERROLES_ROW.AVATAR: r.rgwAvatar[roleId] = value; break
    case PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE: r.rgwSpriteNumInBattle[roleId] = value; break
    case PLAYERROLES_ROW.SPRITE_NUM: r.rgwSpriteNum[roleId] = value; break
    case PLAYERROLES_ROW.ATTACK_ALL: r.rgwAttackAll[roleId] = value; break
    case PLAYERROLES_ROW.WALK_FRAMES: r.rgwWalkFrames[roleId] = value; break
    case PLAYERROLES_ROW.COOPERATIVE_MAGIC: r.rgwCooperativeMagic[roleId] = value; break
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

/** SHORT signed 16-bit cast(sdlpal `(SHORT)operand[N]` 真值)。 */
function signExtendI16(u: number): number {
  return (u & 0x8000) ? u - 0x10000 : u
}

// kStatus(CLASSIC,global.h:42-55)
const K_STATUS_PUPPET = 4
const K_STATUS_DUAL_ATTACK = 8

/**
 * sdlpal `PAL_SetPlayerStatus`(global.c:2173-2277,CLASSIC)写持久 `gs.rgPlayerStatus`。
 * scriptOnEquip 0x2D 用(装备授状态,如仙女剑 DualAttack=32760)。
 *  - bad(Confused0/Paralyzed1/Sleep2/Silence3):仅当当前 0 才 set(global.c:2234)
 *  - Puppet(4):仅死人 + set-if-longer(global.c:2244)
 *  - good(Bravery5/Protect6/Haste7/DualAttack8):HP!=0 && cur<rounds(global.c:2264)
 */
function setPersistentPlayerStatus(gs: GameState, roleId: number, statusId: number, rounds: number): void {
  const arr = gs.rgPlayerStatus[roleId]
  if (!arr) return
  const hp = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
  switch (statusId) {
    case 0: // Confused
    case 1: // Paralyzed(CLASSIC)
    case 2: // Sleep
    case 3: // Silence
      if ((arr[statusId] ?? 0) === 0) arr[statusId] = rounds
      break
    case K_STATUS_PUPPET:
      if (hp === 0 && (arr[statusId] ?? 0) < rounds) arr[statusId] = rounds
      break
    case 5: // Bravery
    case 6: // Protect
    case 7: // Haste
    case K_STATUS_DUAL_ATTACK:
      if (hp !== 0 && (arr[statusId] ?? 0) < rounds) arr[statusId] = rounds
      break
    default:
      console.warn(`setPersistentPlayerStatus: 未知 status ${statusId}`)
  }
}

/**
 * sdlpal `PAL_RunTriggerScript(scriptOnEquip, role)` 同步消费 scriptOnEquip chain。
 *
 * scriptOnEquip 实测只含 5 opcode(0x17/0x18/0x19/0x1A/0x2D + end + goto),所有
 * 都是同步纯数据写入,不会有 dialog / fade / waiting。我们写 mini sync runner
 * 而非走 tickEventSystem(async)或 runScript(battle ctx)。
 *
 * 支持 opcode(sdlpal script.c case):
 *  - 0x17 set extra attr → rgEquipmentEffect[i].field[role] = SHORT(operand[2])
 *  - 0x18 Equip item → 在 update 上下文是 noop swap(item 已装备),只更新 iCurEquipPart + removeEquipmentEffect
 *  - 0x19 increase player attr → PlayerRoles += SHORT(operand[1])
 *  - 0x1A set player stat → PlayerRoles = SHORT(operand[1])
 *  - end → return
 *  - goto → 跳到 label
 *  - 其它 → log skip + ip++
 *
 * 注:0x2D set player status / 0x29 (待 identify):scriptOnEquip 占 5/2 次,留 follow-up。
 */
function runEquipScriptSync(
  gs: GameState,
  scriptOnEquip: number,
  roleId: number,
): void {
  if (scriptOnEquip === 0) return
  // P2#5:装备脚本是全局 entry → 全局数组 + 全局 labelMap(identity)。
  const commands = getGlobalCommands()
  const labelMap = getGlobalLabelMap()
  const startIp = labelMap[`L_${scriptOnEquip}`]
  if (startIp === undefined) {
    console.warn(`runEquipScriptSync: L_${scriptOnEquip} 不在全局 labelMap`)
    return
  }

  let ip = startIp
  let step = 0
  // sdlpal PAL_RunTriggerScript 末尾(script.c:3476)`g_iCurEquipPart = -1` — 0x18 设的 part 不泄漏到
  // 后续脚本(否则后续无关 0x1A 误写 rgEquipmentEffect 覆盖层)。try/finally 保证各出口都 reset。
  try {
  while (step++ < SCRIPT_TICK_LIMIT) {
    if (ip < 0 || ip >= commands.length) {
      console.warn(`runEquipScriptSync: ip ${ip} 越界`)
      return
    }
    const cmd = commands[ip]!

    if (cmd.op === 'end') return
    if (cmd.op === 'goto') {
      const target = labelMap[cmd.to]
      if (target === undefined) {
        console.warn(`runEquipScriptSync: goto label ${cmd.to} 不在 labelMap`)
        return
      }
      ip = target
      continue
    }
    if (cmd.op !== 'raw') {
      // 已具名 opcode 转 raw 处理:数据 opcode 实测不会 hit(showDialog/setDialogStyle 等都不在 scriptOnEquip)
      console.warn(`runEquipScriptSync: 撞到 non-raw op '${cmd.op}',skip + ip++`)
      ip++
      continue
    }

    const [a, b, c] = cmd.operands as [number, number, number]

    switch (cmd.opcode) {
      case 0x17: {
        // sdlpal script.c:752-766 真值:p[op[1] * MAX + role] = SHORT(op[2]); i = op[0] - 0xB
        const partIdx = (a ?? 0) - 0x0B
        writeEquipmentEffectField(gs, partIdx, b ?? 0, roleId, signExtendI16(c ?? 0))
        break
      }
      case 0x18: {
        // sdlpal script.c:768-811 真值:i=op0-0xB(装备部位);iCurEquipPart=i;removeEquipmentEffect。
        //   **若该槽当前装备 != op1**(新装备未装在此槽)→ 真换装:
        //     - rgwEquipment[i][role] = op1
        //     - inventory swap:移除新装备 1、旧装备入包 1
        //     - wLastUnequippedItem = 旧装备
        //   此条件同时服务两上下文:updateAllEquipments(已装着自己 → 相等 → 不 swap,只重算 effect);
        //   装备菜单(未装 → 不等 → 真换)。之前 ts 无条件跳 swap,导致"换不了装备"。
        const partIdx = (a ?? 0) - 0x0B
        const newItem = b ?? 0
        gs.iCurEquipPart = partIdx
        removeEquipmentEffect(gs, roleId, partIdx)
        const rgwEquipment = gs.PlayerRolesRuntime.rgwEquipment
        const cur = rgwEquipment[partIdx]?.[roleId] ?? 0
        if (cur !== newItem) {
          if (rgwEquipment[partIdx]) rgwEquipment[partIdx]![roleId] = newItem
          // DL11:新件库存恰 1 件且身上旧件不在背包 → `rgInventory[i].wItem = w` **原位替换**
          //   (script.c:784-805 "instead of removing items and adding them at the end")——
          //   换下的旧装备保持原列表槽位,不掉到末尾。
          const newEntry = gs.inventory.find((e) => e.itemId === newItem)
          const oldInInv = cur !== 0 && gs.inventory.some((e) => e.itemId === cur)
          if (newEntry && newEntry.count === 1 && cur !== 0 && !oldInInv) {
            newEntry.itemId = cur
          }
          else {
            consumeItemFromInventory(gs, newItem) // 移除新装备 1
            if (cur !== 0) addItemToInventory(gs, cur, 1) // 旧装备入包
          }
          gs.wLastUnequippedItem = cur
        }
        break
      }
      case 0x19: {
        // sdlpal script.c:813-832:p[op[0] * MAX + role] += SHORT(op[1]);role override by op[2]
        const targetRole = (c ?? 0) === 0 ? roleId : ((c ?? 0) - 1)
        addPlayerStatRow(gs, a ?? 0, targetRole, signExtendI16(b ?? 0))
        break
      }
      case 0x1A: {
        // sdlpal script.c:834-865:p[op[0] * MAX + role] = SHORT(op[1])
        const targetRole = (c ?? 0) === 0 ? roleId : ((c ?? 0) - 1)
        setPlayerStatRow(gs, a ?? 0, targetRole, signExtendI16(b ?? 0))
        break
      }
      case 0x2d: {
        // sdlpal script.c:1367 PAL_SetPlayerStatus(wEventObjectID=role, op0=statusId, op1=rounds)
        //   装备授状态(仙女剑等 5 把 Hand 武器授 DualAttack=32760)。写持久 gs.rgPlayerStatus。
        setPersistentPlayerStatus(gs, roleId, a ?? 0, b ?? 0)
        break
      }
      case 0x29: {
        // sdlpal script.c:1257 apply poison to player(寿葫芦 Wear 授 level-99 正面"毒":
        //   毒 563=+20HP/回合 / 564=+20MP/回合)。op0=applyAll, op1=poisonId。
        //   gate:RandomLong(1,100) > poisonResistance(script.c:1280;五毒珠 resist=100 → 永不中)。
        const applyAll = (a ?? 0) !== 0
        const poisonId = b ?? 0
        const targets = applyAll ? gs.partyMembers : [roleId]
        for (const r of targets) {
          if (Math.floor(Math.random() * 100) + 1 > getPlayerPoisonResistance(gs, r)) {
            addPoisonForPlayer(gs, r, poisonId, ip => runPlayerPoisonEntrySync(gs, r, ip))
          }
        }
        break
      }
      default:
        // scriptOnEquip 实测 opcode 已全覆盖(0x17/0x18/0x19/0x1A/0x2D/0x29);其它意外 op 记日志
    }

    ip++
  }
  console.warn(`runEquipScriptSync: SCRIPT_TICK_LIMIT ${SCRIPT_TICK_LIMIT} 超出 — 死循环?`)
  }
  finally {
    gs.iCurEquipPart = -1
  }
}

/**
 * sdlpal `PAL_UpdateEquipments`(global.c:1333-1369)。
 *
 * 真值:全部 rgEquipmentEffect memset 0,跨 MAX_PLAYER_ROLES × MAX_PLAYER_EQUIPMENTS
 * 调 `PAL_RunTriggerScript(item.wScriptOnEquip, role)`。每个 scriptOnEquip 内含
 * opcode 0x17(set extra attr)写入 rgEquipmentEffect 累加 stat。
 *
 * 调用时机(sdlpal):
 *  - PAL_LoadGame:读档完毕 重算装备 effect
 *  - PAL_LoadDefaultGame:新游戏起手
 *  - PAL_GameUseItem / GameEquipItem 内某些 script 调
 *
 * ts 同 — bootstrap hydratePlayerRolesRuntime 后调一次,装备菜单装备完后 dispatcher 再调。
 */
export function updateAllEquipments(gs: GameState, items: Item[]): void {
  // sdlpal global.c:1354 memset 全 0
  gs.rgEquipmentEffect = createInitialEquipmentEffect()
  for (let role = 0; role < MAX_PLAYER_ROLES; role++) {
    for (let part = 0; part < MAX_PLAYER_EQUIPMENTS; part++) {
      const wItem = gs.PlayerRolesRuntime.rgwEquipment[part]?.[role] ?? 0
      if (wItem === 0) continue
      const item = items.find((it) => it.id === wItem)
      if (!item) continue
      const sid = item.scriptOnEquip ?? 0
      if (sid === 0) continue
      runEquipScriptSync(gs, sid, role)
    }
  }
}

/**
 * sdlpal EquipItemMenu Confirm 后跑装备脚本 — 单次(`PAL_RunTriggerScript(scriptOnEquip, role)`)。
 *
 * EquipItemMenu(uigame.c:2050-2053)真值:Confirm 选了某 role + 该 role 能装此 item →
 *   scriptOnEquip = PAL_RunTriggerScript(scriptOnEquip, role)
 *
 * 装备脚本 chain 内含 opcode 0x18(swap 装备 + 写 wLastUnequippedItem),所以 dispatcher
 * 直接调此 fn 即等价 sdlpal 整套 swap 流程。
 *
 * 注:**与 updateAllEquipments 区别**:此 fn 跑的是 EquipItemMenu 装备时,opcode 0x18
 * 内 sdlpal 真值 rgwEquipment 还没装 → 会真 swap inventory(`PAL_AddItemToInventory` ±1)+
 * wLastUnequippedItem 写。runEquipScriptSync 当前是 `update 上下文`(假定已装备),swap
 * 路径不真做 — 我们让 EquipItemMenu dispatcher 用 event-system 的 opcode 0x18 真 swap
 * handler(已 port),所以这里独立 path:dispatcher 自己处理 0x18 真 swap,scriptOnEquip
 * 内 0x18 走 runEquipScriptSync 等价 noop。
 *
 * 等价:dispatcher 流程是:
 *   1. 设置 currentEventObjectId = roleId
 *   2. 跑 scriptOnEquip chain → 内含 0x18 真做 swap(走 event-system 现有 handler)+
 *      多个 0x17 写 rgEquipmentEffect。
 *
 * 简单起见,本 fn 用 runEquipScriptSync 同步跑(0x18 当 noop)+ wLastUnequippedItem 由
 * dispatcher 手动管理(读 rgwEquipment 旧值,赋 wLastUnequippedItem)。
 */
export function runEquipScript(gs: GameState, scriptOnEquip: number, roleId: number): void {
  runEquipScriptSync(gs, scriptOnEquip, roleId)
}
