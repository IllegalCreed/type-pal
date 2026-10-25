/**
 * 装备脚本协调层：启动/读档重算与菜单换装共用同步runner。
 * 数值getter和效果行写入由equipment-state拥有，本模块保留原有转出口；
 * 全局script catalog提供只读指令，inventory/poison owner负责各自状态变更。
 * 支持的0x17/0x18/0x19/0x1A/0x2D/0x29及控制流见runner下方说明；
 * 不推进对白/fade等异步演出，也不宣称整个实现与SDL逐边界等价。
 */

import type { Item } from '@type-pal/shared'
import {
  addPlayerStatRow,
  getPlayerPoisonResistance,
  K_STATUS_DUAL_ATTACK,
  MAX_PLAYER_EQUIPMENTS,
  removeEquipmentEffect,
  setPlayerStatRow,
  writeEquipmentEffectField,
} from './equipment-state.js'
import { runPlayerPoisonEntrySync } from './event-system.js'
import { createInitialEquipmentEffect, type GameState } from './game-state.js'
import { addItemToInventory, consumeItemFromInventory } from './inventory-state.js'
import { getItemScriptEntry, setItemScriptEntry } from './object-script-state.js'
import { addPoisonForPlayer } from './player-poison-state.js'
import { getGlobalCommands, getGlobalLabelMap } from './script-catalog.js'

export {
  addPlayerStatRow,
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
  getPlayerPoisonResistance,
  PLAYERROLES_ROW,
  removeEquipmentEffect,
  resyncBattleRoleStatsFromRuntime,
  setPlayerStatRow,
  writeEquipmentEffectField,
} from './equipment-state.js'

const MAX_PLAYER_ROLES = 6

const SCRIPT_TICK_LIMIT = 256 // 防御 — scriptOnEquip 实测最长 ~5 op

/** SHORT signed 16-bit cast(sdlpal `(SHORT)operand[N]` 真值)。 */
function signExtendI16(u: number): number {
  return u & 0x8000 ? u - 0x10000 : u
}

// kStatus(CLASSIC,global.h:42-55)
const K_STATUS_PUPPET = 4

/**
 * sdlpal `PAL_SetPlayerStatus`(global.c:2173-2277,CLASSIC)写持久 `gs.rgPlayerStatus`。
 * scriptOnEquip 0x2D 用(装备授状态,如仙女剑 DualAttack=32760)。
 *  - bad(Confused0/Paralyzed1/Sleep2/Silence3):仅当当前 0 才 set(global.c:2234)
 *  - Puppet(4):仅死人 + set-if-longer(global.c:2244)
 *  - good(Bravery5/Protect6/Haste7/DualAttack8):HP!=0 && cur<rounds(global.c:2264)
 */
function setPersistentPlayerStatus(
  gs: GameState,
  roleId: number,
  statusId: number,
  rounds: number,
): void {
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
 * 此 runner 处理同步装备数据写入,不推进 dialog / fade / waiting。使用独立同步循环,
 * 而非走 tickEventSystem(async)或 runScript(battle ctx)。
 *
 * 支持 opcode(sdlpal script.c case):
 *  - 0x17 set extra attr → rgEquipmentEffect[i].field[role] = SHORT(operand[2])
 *  - 0x18 Equip item → 在 update 上下文是 noop swap(item 已装备),只更新 iCurEquipPart + removeEquipmentEffect
 *  - 0x19 increase player attr → PlayerRoles += SHORT(operand[1])
 *  - 0x1A set player stat → PlayerRoles = SHORT(operand[1])
 *  - 0x2D / 0x29 → 装备授予玩家状态 / 毒状态
 *  - end → return
 *  - goto → 跳到 label
 *  - 其它 raw → skip + ip++；不支持的具名命令则warn后跳过
 *
 * 注:0x2D set player status / 0x29 apply poison 已实现(见下方 case:仙女剑等授
 * DualAttack=32760;寿葫芦 Wear 授 level-99 正面"毒" 563/564)。
 */
function runEquipScriptSync(gs: GameState, scriptOnEquip: number, roleId: number): number {
  if (scriptOnEquip === 0) return 0
  // P2#5:装备脚本是全局 entry → 全局数组 + 全局 labelMap(identity)。
  const commands = getGlobalCommands()
  const labelMap = getGlobalLabelMap()
  const startIp = labelMap[`L_${scriptOnEquip}`]
  if (startIp === undefined) {
    console.warn(`runEquipScriptSync: L_${scriptOnEquip} 不在全局 labelMap`)
    return scriptOnEquip
  }

  let ip = startIp
  let step = 0
  // sdlpal PAL_RunTriggerScript 末尾(script.c:3476)`g_iCurEquipPart = -1` — 0x18 设的 part 不泄漏到
  // 后续脚本(否则后续无关 0x1A 误写 rgEquipmentEffect 覆盖层)。进入循环后的各出口由finally reset。
  try {
    while (step++ < SCRIPT_TICK_LIMIT) {
      if (ip < 0 || ip >= commands.length) {
        console.warn(`runEquipScriptSync: ip ${ip} 越界`)
        return scriptOnEquip
      }
      const cmd = commands[ip]!

      if (cmd.op === 'end') {
        if (cmd.advance) return ip + 1
        if (cmd.reset && cmd.resetTo !== undefined)
          return labelMap[`L_${cmd.resetTo}`] ?? scriptOnEquip
        return scriptOnEquip
      }
      if (cmd.op === 'goto') {
        const target = labelMap[cmd.to]
        if (target === undefined) {
          console.warn(`runEquipScriptSync: goto label ${cmd.to} 不在 labelMap`)
          return scriptOnEquip
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

      const [a, b, c] = cmd.operands

      switch (cmd.opcode) {
        case 0x17: {
          // sdlpal script.c:752-766 真值:p[op[1] * MAX + role] = SHORT(op[2]); i = op[0] - 0xB
          const partIdx = (a ?? 0) - 0x0b
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
          const partIdx = (a ?? 0) - 0x0b
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
            } else {
              consumeItemFromInventory(gs, newItem) // 移除新装备 1
              if (cur !== 0) addItemToInventory(gs, cur, 1) // 旧装备入包
            }
            gs.wLastUnequippedItem = cur
          }
          break
        }
        case 0x19: {
          // sdlpal script.c:813-832:p[op[0] * MAX + role] += SHORT(op[1]);role override by op[2]
          const targetRole = (c ?? 0) === 0 ? roleId : (c ?? 0) - 1
          addPlayerStatRow(gs, a ?? 0, targetRole, signExtendI16(b ?? 0))
          break
        }
        case 0x1a: {
          // sdlpal script.c:834-865:p[op[0] * MAX + role] = SHORT(op[1])
          const targetRole = (c ?? 0) === 0 ? roleId : (c ?? 0) - 1
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
              addPoisonForPlayer(gs, r, poisonId, (ip) => runPlayerPoisonEntrySync(gs, r, ip))
            }
          }
          break
        }
        default:
        // 只处理上述同步子集；其它raw沿用静默跳过，不冒充通用脚本解释器。
      }

      ip++
    }
    console.warn(`runEquipScriptSync: SCRIPT_TICK_LIMIT ${SCRIPT_TICK_LIMIT} 超出 — 死循环?`)
    return scriptOnEquip
  } finally {
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
      const sid = getItemScriptEntry(gs, item, 'scriptOnEquip')
      if (sid === 0) continue
      setItemScriptEntry(gs, item, 'scriptOnEquip', runEquipScriptSync(gs, sid, role))
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
 * 注:**与 updateAllEquipments 区别**:本 fn 服务 EquipItemMenu 单次装备 — scriptOnEquip
 * 内 0x18 在 runEquipScriptSync 里**真做 swap**(rgwEquipment 写 + inventory ±1 +
 * wLastUnequippedItem,见 case 0x18 的 cur!==newItem 分支);updateAllEquipments 上下文中
 * 该槽已装着自己 → cur===newItem → 不 swap,只重算 effect。dispatcher 另按 DM23 在进
 * pick-role 时写 wLastUnequippedItem 入口值(uigame.c:1820,menu-driver 已做)。
 */
export function runEquipScript(gs: GameState, scriptOnEquip: number, roleId: number): number {
  return runEquipScriptSync(gs, scriptOnEquip, roleId)
}
