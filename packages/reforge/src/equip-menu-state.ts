// 装备菜单状态机(纯逻辑;非视觉)。两阶段(对齐原版 PAL_GameEquipItem):
//   list     选可装物(网格)→ Enter 记下选中、进 pick-role(不立即换)
//   pick-role 确认面板(显角色当前 6 槽装备 + 5 属性)→ Enter 才真换 / Esc 回 list
// 换装走 content equipItem(返回新 world)。
import { equipItem, type ItemData, type ItemDataMap, type WorldState } from '@type-pal/content'
import { type GridDirection, stepMenuGridCursor } from './menu/grid-cursor.js'

export type EquipPhase = 'list' | 'pick-role'

export interface EquipMenuState {
  active: boolean
  phase: EquipPhase
  items: ItemData[] // 背包中至少一位队员可穿戴的物品
  cursor: number // list 阶段网格光标
  /** Selected wearer ID, exposed under this key by the runtime observation used by replays. */
  casterId: string
  /** pick-role 阶段:list 里选中、待换上的物品 id。 */
  selectedItemId?: string
}

export function openEquipMenu(
  world: WorldState,
  wearerId: string,
  items: ItemDataMap,
): EquipMenuState {
  const wearerIsInParty = world.party.some(({ id }) => id === wearerId)
  const templates = new Set(world.party.map(({ template }) => template))
  const available = wearerIsInParty
    ? world.inventory.flatMap(({ itemId, count }) => {
        const item = items[itemId]
        return count > 0 && item?.equip?.equipableBy.some((template) => templates.has(template))
          ? [item]
          : []
      })
    : []
  return {
    active: true,
    phase: 'list',
    items: available,
    cursor: 0,
    casterId: wearerId,
  }
}

export function closeEquipMenu(): EquipMenuState {
  return { active: false, phase: 'list', items: [], cursor: 0, casterId: '' }
}

export function equipMoveCursor(s: EquipMenuState, direction: GridDirection): EquipMenuState {
  if (s.phase !== 'list' || s.items.length === 0) return s
  return { ...s, cursor: stepMenuGridCursor(s.cursor, s.items.length, direction) }
}

/** 选人阶段按在队实例顺序环绕，保持选中物件和背包光标。 */
export function equipMoveRole(
  s: EquipMenuState,
  world: WorldState,
  direction: -1 | 1,
): EquipMenuState {
  if (s.phase !== 'pick-role' || world.party.length < 2) return s
  const current = world.party.findIndex(({ id }) => id === s.casterId)
  if (current < 0) return s
  const next = world.party[(current + direction + world.party.length) % world.party.length]
  return next ? { ...s, casterId: next.id } : s
}

/** list Confirm:记下选中物 → 进 pick-role 确认面板(不立即换)。空列表/越界 no-op。 */
export function equipConfirmItem(s: EquipMenuState): EquipMenuState {
  if (s.phase !== 'list') return s
  const sel = s.items[s.cursor]
  if (!sel) return s
  return { ...s, phase: 'pick-role', selectedItemId: sel.id }
}

/** pick-role Esc:回 list + 重算(swap 后背包可能变了,列表须刷新)。 */
export function equipBackToList(
  s: EquipMenuState,
  world: WorldState,
  items: ItemDataMap,
): EquipMenuState {
  if (s.phase !== 'pick-role') return s
  return openEquipMenu(world, world.party[0]?.id ?? '', items)
}

/**
 * pick-role Confirm(空格):换上选中物。原版 PAL_EquipItemMenu swap loop(uigame.c:2016-2019):
 * 换下的旧件 != 0 → 留 pick-role、选中变旧件(可一直空格在两件间切换对比);旧件 == 0(空槽)→ 回 list。
 * Esc 才主动回 list。
 */
export function equipApply(
  s: EquipMenuState,
  world: WorldState,
  items: ItemDataMap,
): { world: WorldState; state: EquipMenuState } {
  if (s.phase !== 'pick-role' || !s.selectedItemId) return { world, state: s }
  const slot = items[s.selectedItemId]?.equip?.slot
  const wearer = world.party.find((member) => member.id === s.casterId)
  if (!slot || !wearer) return { world, state: openEquipMenu(world, s.casterId, items) }
  const oldItemId = wearer.equipment[slot]
  const next = equipItem(world, s.casterId, s.selectedItemId, items)
  if (next === world) return { world, state: s }
  if (oldItemId) return { world: next, state: { ...s, selectedItemId: oldItemId } } // 留面板续换
  return { world: next, state: equipBackToList(s, next, items) } // 空槽 → 回 list
}
