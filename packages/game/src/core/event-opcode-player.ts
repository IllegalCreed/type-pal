import {
  addPlayerStatRow,
  getPlayerPoisonResistance,
  removeEquipmentEffect,
  setPlayerStatRow,
  writeEquipmentEffectField,
} from './equipment-state.js'
import type { GameState } from './game-state.js'
import { addItemToInventory } from './inventory-state.js'
import {
  addPoisonForPlayer,
  curePlayerPoisonByKind,
  curePlayerPoisonByLevel,
} from './player-poison-state.js'

export const OP_SET_PLAYER_EXTRA_ATTR = 0x0017
export const OP_EQUIP_ITEM = 0x0018
export const OP_INCREASE_PLAYER_ATTR = 0x0019
export const OP_SET_PLAYER_STAT = 0x001a
export const OP_INCREASE_HP = 0x001b
export const OP_INCREASE_MP = 0x001c
export const OP_INCREASE_HP_MP = 0x001d
export const OP_DAMAGE_ENEMY = 0x0021
export const OP_REVIVE_PLAYER = 0x0022
export const OP_REMOVE_EQUIPMENT = 0x0023
export const OP_POISON_ENEMY = 0x0028
export const OP_POISON_PLAYER = 0x0029
export const OP_CURE_ENEMY_POISON_KIND = 0x002a
export const OP_CURE_PLAYER_POISON_KIND = 0x002b
export const OP_CURE_PLAYER_POISON_LEVEL = 0x002c
export const OP_SET_PLAYER_STATUS = 0x002d
export const OP_SET_ENEMY_STATUS = 0x002e
export const OP_REMOVE_PLAYER_STATUS = 0x002f
export const OP_MARK_SCRIPT_FAILED = 0x0041
export const OP_ADD_MAGIC = 0x0055
export const OP_REMOVE_MAGIC = 0x0056
export const OP_INCREASE_PLAYER_LEVEL = 0x008d

export type PlayerPoisonEntryRunner = (
  gs: GameState,
  roleId: number,
  playerScriptIp: number,
) => number

export interface PlayerOpcodeInput {
  gs: GameState
  opcode: number
  operands: [number, number, number]
  currentEventObjectId?: number
  runPlayerPoisonEntry: PlayerPoisonEntryRunner
}

/**
 * Owns the event interpreter's player/equipment/poison/status opcode family.
 * Returns false only when the opcode belongs to another family.
 */
export function applyPlayerOpcode(input: PlayerOpcodeInput): boolean {
  const { gs, opcode, operands, currentEventObjectId, runPlayerPoisonEntry } = input
  switch (opcode) {
    case OP_INCREASE_PLAYER_LEVEL: {
      const role = currentEventObjectId
      if (role === undefined || role === 0xffff) {
        console.warn('event-system: increasePlayerLevel 无 role 上下文,跳过')
        return true
      }
      playerLevelUp(gs, role, operands[0] ?? 0)
      return true
    }

    case OP_SET_PLAYER_EXTRA_ATTR: {
      const partIdx = (operands[0] ?? 0) - 0x0b
      const rowIdx = operands[1] ?? 0
      const value = signExtendI16(operands[2] ?? 0)
      const roleId = currentEventObjectId
      if (roleId === undefined || roleId === 0xffff) {
        console.warn('event-system: setPlayerExtraAttr no role context')
        return true
      }
      writeEquipmentEffectField(gs, partIdx, rowIdx, roleId, value)
      return true
    }

    case OP_EQUIP_ITEM: {
      const slot = (operands[0] ?? 0) - 0x0b
      const newItem = operands[1] ?? 0
      const roleId = currentEventObjectId
      if (roleId === undefined || roleId === 0xffff) {
        console.warn('event-system: equipItem no role context')
        return true
      }
      if (slot < 0 || slot >= 6) {
        console.warn(`event-system: equipItem invalid slot=${slot}(op[0]=${operands[0]})`)
        return true
      }
      gs.iCurEquipPart = slot
      removeEquipmentEffect(gs, roleId, slot)
      const eqRow = gs.PlayerRolesRuntime.rgwEquipment[slot]
      if (!eqRow) return true
      const oldItem = eqRow[roleId] ?? 0
      if (oldItem !== newItem) {
        eqRow[roleId] = newItem
        const newEntry = gs.inventory.find((entry) => entry.itemId === newItem)
        const oldInInventory =
          oldItem !== 0 && gs.inventory.some((entry) => entry.itemId === oldItem)
        if (newEntry && newEntry.count === 1 && oldItem !== 0 && !oldInInventory) {
          newEntry.itemId = oldItem
        } else {
          addItemToInventory(gs, newItem, -1)
          if (oldItem !== 0) addItemToInventory(gs, oldItem, 1)
        }
        gs.wLastUnequippedItem = oldItem
      }
      return true
    }

    case OP_INCREASE_PLAYER_ATTR: {
      const fieldIdx = operands[0] ?? 0
      const delta = signExtendI16(operands[1] ?? 0)
      const roleId = (operands[2] ?? 0) === 0 ? currentEventObjectId : (operands[2] ?? 0) - 1
      if (roleId === undefined || roleId === 0xffff) {
        console.warn('event-system: increasePlayerAttr no role context')
        return true
      }
      addPlayerStatRow(gs, fieldIdx, roleId, delta)
      return true
    }

    case OP_SET_PLAYER_STAT: {
      const fieldIdx = operands[0] ?? 0
      const newValue = signExtendI16(operands[1] ?? 0)
      const roleId = (operands[2] ?? 0) === 0 ? currentEventObjectId : (operands[2] ?? 0) - 1
      if (roleId === undefined || roleId === 0xffff) {
        console.warn('event-system: setPlayerStat no role context')
        return true
      }
      setPlayerStatRow(gs, fieldIdx, roleId, newValue)
      return true
    }

    case OP_INCREASE_HP: {
      const { applyAll, anyChanged } = applyHPMPDelta(
        gs,
        currentEventObjectId,
        operands,
        true,
        false,
      )
      if (applyAll) gs.fScriptSuccess = anyChanged
      else if (!anyChanged) gs.fScriptSuccess = false
      return true
    }

    case OP_INCREASE_MP: {
      const { applyAll, anyChanged } = applyHPMPDelta(
        gs,
        currentEventObjectId,
        operands,
        false,
        true,
      )
      if (!applyAll && !anyChanged) gs.fScriptSuccess = false
      return true
    }

    case OP_INCREASE_HP_MP: {
      const { applyAll, anyChanged } = applyHPMPDelta(
        gs,
        currentEventObjectId,
        operands,
        true,
        true,
      )
      if (!applyAll && !anyChanged) gs.fScriptSuccess = false
      return true
    }

    case OP_DAMAGE_ENEMY:
    case OP_POISON_ENEMY:
    case OP_CURE_ENEMY_POISON_KIND:
    case OP_SET_ENEMY_STATUS:
      // BattleState-owned variants remain handled by battle-opcodes.
      return true

    case OP_REVIVE_PLAYER: {
      const applyAll = (operands[0] ?? 0) !== 0
      const ratioTenths = operands[1] ?? 0
      const targets = applyAll
        ? gs.partyMembers
        : currentEventObjectId !== undefined && currentEventObjectId !== 0xffff
          ? [currentEventObjectId]
          : []
      let revivedAny = false
      for (const roleId of targets) {
        const currentHP = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
        const maxHP = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
        if (currentHP !== 0) continue
        gs.PlayerRolesRuntime.rgwHP[roleId] = Math.floor((maxHP * ratioTenths) / 10)
        curePlayerPoisonByLevel(gs, roleId, 3)
        revivedAny = true
        const statuses = gs.rgPlayerStatus[roleId]
        if (statuses)
          for (let index = 0; index < statuses.length; index++)
            if ((statuses[index] ?? 0) <= 999) statuses[index] = 0
      }
      if (applyAll) gs.fScriptSuccess = revivedAny
      else if (!revivedAny) gs.fScriptSuccess = false
      return true
    }

    case OP_REMOVE_EQUIPMENT: {
      const roleId = operands[0] ?? 0
      const slotPlusOne = operands[1] ?? 0
      const equipment = gs.PlayerRolesRuntime.rgwEquipment
      if (slotPlusOne === 0) {
        for (let slot = 0; slot < 6; slot++) {
          const itemId = equipment[slot]?.[roleId] ?? 0
          if (itemId !== 0) {
            addItemToInventory(gs, itemId, 1)
            equipment[slot]![roleId] = 0
          }
          removeEquipmentEffect(gs, roleId, slot)
        }
      } else {
        const slot = slotPlusOne - 1
        const itemId = equipment[slot]?.[roleId] ?? 0
        if (itemId !== 0) {
          removeEquipmentEffect(gs, roleId, slot)
          addItemToInventory(gs, itemId, 1)
          equipment[slot]![roleId] = 0
        }
      }
      return true
    }

    case OP_POISON_PLAYER: {
      const applyAll = (operands[0] ?? 0) !== 0
      const poisonId = operands[1] ?? 0
      const targets = applyAll
        ? gs.partyMembers
        : currentEventObjectId !== undefined && currentEventObjectId !== 0xffff
          ? [currentEventObjectId]
          : []
      for (const roleId of targets) {
        if (Math.floor(Math.random() * 100) + 1 <= getPlayerPoisonResistance(gs, roleId)) continue
        addPoisonForPlayer(gs, roleId, poisonId, (ip) => runPlayerPoisonEntry(gs, roleId, ip))
      }
      return true
    }

    case OP_CURE_PLAYER_POISON_KIND: {
      const targets = playerTargets(gs, currentEventObjectId, (operands[0] ?? 0) !== 0)
      for (const roleId of targets) curePlayerPoisonByKind(gs, roleId, operands[1] ?? 0)
      return true
    }

    case OP_CURE_PLAYER_POISON_LEVEL: {
      const targets = playerTargets(gs, currentEventObjectId, (operands[0] ?? 0) !== 0)
      for (const roleId of targets) curePlayerPoisonByLevel(gs, roleId, operands[1] ?? 0)
      return true
    }

    case OP_SET_PLAYER_STATUS: {
      const statusId = operands[0] ?? 0
      const rounds = operands[1] ?? 0
      const targets =
        currentEventObjectId === undefined || currentEventObjectId === 0xffff
          ? gs.partyMembers
          : [currentEventObjectId]
      for (const roleId of targets) {
        const row = gs.rgPlayerStatus[roleId]
        if (!row || statusId >= row.length) continue
        const current = row[statusId] ?? 0
        const hp = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
        if (statusId <= 3) {
          if (current === 0) row[statusId] = rounds
        } else if (statusId === 4) {
          if (hp === 0) {
            if (current < rounds) row[statusId] = rounds
          } else gs.fScriptSuccess = false
        } else if (hp !== 0 && current < rounds) row[statusId] = rounds
      }
      return true
    }

    case OP_REMOVE_PLAYER_STATUS: {
      const statusId = operands[0] ?? 0
      const targets =
        currentEventObjectId === undefined || currentEventObjectId === 0xffff
          ? gs.partyMembers
          : [currentEventObjectId]
      for (const roleId of targets) {
        const row = gs.rgPlayerStatus[roleId]
        if (row && statusId < row.length && (row[statusId] ?? 0) <= 999) row[statusId] = 0
      }
      return true
    }

    case OP_MARK_SCRIPT_FAILED:
      gs.fScriptSuccess = false
      return true

    case OP_ADD_MAGIC: {
      const roleId = (operands[1] ?? 0) === 0 ? (currentEventObjectId ?? 0) : (operands[1] ?? 0) - 1
      addMagicToRole(gs, roleId, operands[0] ?? 0)
      return true
    }

    case OP_REMOVE_MAGIC: {
      const roleId = (operands[1] ?? 0) === 0 ? (currentEventObjectId ?? 0) : (operands[1] ?? 0) - 1
      removeMagicFromRole(gs, roleId, operands[0] ?? 0)
      return true
    }

    default:
      return false
  }
}

function playerTargets(
  gs: GameState,
  currentEventObjectId: number | undefined,
  applyAll: boolean,
): number[] {
  if (applyAll) return gs.partyMembers
  return currentEventObjectId !== undefined && currentEventObjectId !== 0xffff
    ? [currentEventObjectId]
    : []
}

function signExtendI16(value: number): number {
  return value & 0x8000 ? value - 0x10000 : value
}

function applyHPMPDelta(
  gs: GameState,
  currentEventObjectId: number | undefined,
  operands: [number, number, number],
  hp: boolean,
  mp: boolean,
): { applyAll: boolean; anyChanged: boolean } {
  const applyAll = (operands[0] ?? 0) !== 0
  const delta = signExtendI16(operands[1] ?? 0)
  const targets = playerTargets(gs, currentEventObjectId, applyAll)
  let anyChanged = false
  for (const roleId of targets) {
    if ((gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0) <= 0) continue
    if (hp) {
      const current = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
      const next = Math.max(0, Math.min(max, current + delta))
      if (next !== current) anyChanged = true
      gs.PlayerRolesRuntime.rgwHP[roleId] = next
    }
    if (mp) {
      const current = gs.PlayerRolesRuntime.rgwMP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxMP[roleId] ?? 0
      const next = Math.max(0, Math.min(max, current + delta))
      if (next !== current) anyChanged = true
      gs.PlayerRolesRuntime.rgwMP[roleId] = next
    }
  }
  return { applyAll, anyChanged }
}

const MAX_LEVELS = 99
const STAT_CAP = 999

function randomInclusive(max: number): number {
  return Math.floor(Math.random() * (max + 1))
}

function playerLevelUp(gs: GameState, role: number, levels: number): void {
  const runtime = gs.PlayerRolesRuntime
  if (runtime.rgwLevel[role] === undefined) {
    console.warn(`event-system: playerLevelUp role=${role} 不在 PlayerRoles,跳过`)
    return
  }
  runtime.rgwLevel[role] = Math.min(MAX_LEVELS, (runtime.rgwLevel[role] ?? 0) + levels)
  for (let index = 0; index < levels; index++) {
    runtime.rgwMaxHP[role] = (runtime.rgwMaxHP[role] ?? 0) + 10 + randomInclusive(7)
    runtime.rgwMaxMP[role] = (runtime.rgwMaxMP[role] ?? 0) + 8 + randomInclusive(5)
    runtime.rgwAttackStrength[role] =
      (runtime.rgwAttackStrength[role] ?? 0) + 4 + randomInclusive(1)
    runtime.rgwMagicStrength[role] = (runtime.rgwMagicStrength[role] ?? 0) + 4 + randomInclusive(1)
    runtime.rgwDefense[role] = (runtime.rgwDefense[role] ?? 0) + 2 + randomInclusive(1)
    runtime.rgwDexterity[role] = (runtime.rgwDexterity[role] ?? 0) + 2 + randomInclusive(1)
    runtime.rgwFleeRate[role] = (runtime.rgwFleeRate[role] ?? 0) + 2
  }
  for (const values of [
    runtime.rgwMaxHP,
    runtime.rgwMaxMP,
    runtime.rgwAttackStrength,
    runtime.rgwMagicStrength,
    runtime.rgwDefense,
    runtime.rgwDexterity,
    runtime.rgwFleeRate,
  ])
    if ((values[role] ?? 0) > STAT_CAP) values[role] = STAT_CAP
  const primaryExp = gs.Exp.rgPrimaryExp[role]
  if (primaryExp) {
    primaryExp.wExp = 0
    primaryExp.wLevel = runtime.rgwLevel[role] ?? 0
  }
}

function addMagicToRole(gs: GameState, roleId: number, spellObjectId: number): void {
  const magic = gs.PlayerRolesRuntime.rgwMagic
  const roleCount = magic[0]?.length ?? 0
  if (roleId < 0 || roleId >= roleCount || spellObjectId === 0) return
  for (const slot of magic) if (slot?.[roleId] === spellObjectId) return
  for (const slot of magic)
    if ((slot?.[roleId] ?? 0) === 0) {
      slot[roleId] = spellObjectId
      return
    }
}

function removeMagicFromRole(gs: GameState, roleId: number, spellObjectId: number): void {
  const magic = gs.PlayerRolesRuntime.rgwMagic
  const roleCount = magic[0]?.length ?? 0
  if (roleId < 0 || roleId >= roleCount) return
  for (const slot of magic)
    if (slot?.[roleId] === spellObjectId) {
      slot[roleId] = 0
      return
    }
}
