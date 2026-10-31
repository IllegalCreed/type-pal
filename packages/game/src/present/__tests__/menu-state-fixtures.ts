/** Menu state inputs and public singleton reset ownership. Snapshot-only callers use the separate pure snapshot module. */
import type { Item, ItemFlags, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { setGlobalEvents } from '../../core/event-system.js'
import {
  createInitialGameState,
  type GameState,
  hydratePlayerRolesRuntime,
} from '../../core/game-state.js'
import { rememberMagicCasterCursor } from '../../core/menu/in-game-magic-menu.js'
import {
  cancelInventoryMenu,
  confirmInventoryItem,
  createInventoryMenu,
} from '../../core/menu/inventory-menu.js'
import { setWordTable } from '../../core/word-lookup.js'

export function makeItem(
  id: number,
  name: string,
  patch: Partial<Omit<Item, 'flags'>> & { flags?: Partial<ItemFlags> } = {},
): Item {
  const { flags, ...rest } = patch
  return {
    id,
    _name: name,
    bitmap: 1,
    price: 10,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    ...rest,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
      ...flags,
    },
  }
}

export function makeRole(id: number, name: string, patch: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: name,
    avatar: id + 1,
    spriteNumInBattle: 1,
    spriteNum: 1,
    name: 36 + id,
    attackAll: 0,
    level: 1,
    maxHP: 100,
    maxMP: 100,
    hp: 99,
    mp: 99,
    attackStrength: 1,
    magicStrength: 1,
    defense: 1,
    dexterity: 1,
    fleeRate: 1,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    equipment: [0, 0, 0, 0, 0, 0],
    magic: [],
    ...patch,
  }
}

const ROLE_NAMES = ['甲', '乙', '丙', '丁', '戊', '己'] as const

export function makeRoles(): PlayerRoles {
  return { roles: ROLE_NAMES.map((name, id) => makeRole(id, name)) }
}

export function makeGs(): GameState {
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, makeRoles())
  return gs
}

/** 正常菜单场景：数值合法且 runtime 已 hydrate；死亡/缺目录等防御输入由各例显式构造。 */
export function makeLiveScene(party: readonly number[] = [0]) {
  const gs = makeGs()
  const roles = makeRoles()
  gs.partyMembers = [...party]
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
  return { gs, roles }
}

export function freezeNow(ms: number): () => void {
  const previous = Date.now
  Date.now = () => ms
  return () => {
    Date.now = previous
  }
}

/** 物品目标光标是模块静态。用公开 confirm/cancel 把它拨回 0，避免用例互相污染。 */
function resetInventoryTargetSlot(): void {
  const item = makeItem(9001, '甲', { flags: { usable: true } })
  const roles = makeRoles()
  const gs = makeGs()
  gs.partyMembers = [0]
  gs.inventory = [{ itemId: item.id, count: 1 }]
  const menu = createInventoryMenu(gs, [item], 'usable')
  confirmInventoryItem(menu, [item], roles, gs.partyMembers)
  if (menu.targetMenu) {
    menu.targetMenu.cursor = 0
    cancelInventoryMenu(menu)
  }
}

export function resetHostSingletons(): void {
  setWordTable([])
  setGlobalEvents([])
  rememberMagicCasterCursor(0)
  resetInventoryTargetSlot()
}
