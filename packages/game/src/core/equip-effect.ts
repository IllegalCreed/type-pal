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

import type { Item } from '@type-pal/shared'
import { addItemToInventory, consumeItemFromInventory, getSharedCommands, getSharedLabelMap } from './event-system.js'
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
function addPlayerStatRow(gs: GameState, rowIdx: number, roleId: number, delta: number): void {
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

/** Helper:set PlayerRolesRuntime 某 row 给 role(sdlpal opcode 0x1A)。 */
function setPlayerStatRow(gs: GameState, rowIdx: number, roleId: number, value: number): void {
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
  // DualAttack status reset(Hand)/ poison level 99 清(Wear):留 follow-up
}

/** SHORT signed 16-bit cast(sdlpal `(SHORT)operand[N]` 真值)。 */
function signExtendI16(u: number): number {
  return (u & 0x8000) ? u - 0x10000 : u
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
  const commands = getSharedCommands()
  const labelMap = getSharedLabelMap()
  const startIp = labelMap[`L_${scriptOnEquip}`]
  if (startIp === undefined) {
    console.warn(`runEquipScriptSync: L_${scriptOnEquip} 不在 shared.json labelMap`)
    return
  }

  let ip = startIp
  let step = 0
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
          consumeItemFromInventory(gs, newItem) // 移除新装备 1
          if (cur !== 0) addItemToInventory(gs, cur, 1) // 旧装备入包
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
      default:
        // 0x2D set player status / 0x29 / 其它:scriptOnEquip 实测共 7 次,留 follow-up
        console.debug(
          `runEquipScriptSync: opcode 0x${cmd.opcode.toString(16)} ip=${ip} `
          + `op=${JSON.stringify(cmd.operands)} — skip(follow-up)`,
        )
    }

    ip++
  }
  console.warn(`runEquipScriptSync: SCRIPT_TICK_LIMIT ${SCRIPT_TICK_LIMIT} 超出 — 死循环?`)
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
