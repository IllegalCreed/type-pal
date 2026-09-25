import type { Item, ItemFlags, PlayerRole, PlayerRoles } from '@type-pal/shared'
import type { IndexedImage } from '../../../assets/png.js'
import { setGlobalEvents } from '../../../core/event-system.js'
import { createInitialGameState, type GameState } from '../../../core/game-state.js'
import { rememberMagicCasterCursor } from '../../../core/menu/in-game-magic-menu.js'
import {
  cancelInventoryMenu,
  confirmInventoryItem,
  createInventoryMenu,
} from '../../../core/menu/inventory-menu.js'
import { setWordTable } from '../../../core/word-lookup.js'

const NO_ROLE: ItemFlags['equipableBy'] = [false, false, false, false, false, false]

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
      equipableBy: NO_ROLE,
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
    maxMP: 40,
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
  return createInitialGameState({ x: 160, y: 112, facing: 'down' })
}

export function freezeNow(ms: number): () => void {
  const previous = Date.now
  Date.now = () => ms
  return () => {
    Date.now = previous
  }
}

/** 物品目标光标是模块静态。用公开 confirm/cancel 把它拨回 0，避免用例互相污染。 */
export function resetInventoryTargetSlot(): void {
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

interface BitmapSize {
  width: number
  height: number
  indices: Uint8Array
}

function snapImage(frame: IndexedImage): {
  width: number
  height: number
  indices: number[]
  opaque: number[]
} {
  return {
    width: frame.width,
    height: frame.height,
    indices: Array.from(frame.indices),
    opaque: Array.from(frame.opaque),
  }
}

function snapMap(icons: ReadonlyMap<number, IndexedImage> | undefined): unknown[] {
  if (!icons) return []
  return [...icons.entries()].map(([key, frame]) => ({ key, ...snapImage(frame) }))
}

function snapBitmap(bitmap: BitmapSize | undefined): unknown {
  if (!bitmap) return undefined
  return {
    width: bitmap.width,
    height: bitmap.height,
    indices: Array.from(bitmap.indices),
  }
}

/** 一次真实 draw 的可变实参。IndexedImage 含宽高；没传给该次绘制的字段不要塞进来。 */
export function cloneInputs(parts: {
  gs?: GameState
  menu?: unknown
  items?: readonly Item[]
  roles?: PlayerRoles
  frames?: readonly IndexedImage[]
  icons?: ReadonlyMap<number, IndexedImage>
  portraits?: ReadonlyMap<number, IndexedImage>
  spells?: readonly object[]
  magics?: readonly object[]
  equipBg?: BitmapSize
  statusBg?: BitmapSize
  battleBg?: BitmapSize
  poisons?: ReadonlyMap<number, { level: number; color: number }>
  levelUpExp?: readonly number[]
  screen?: unknown
  bitmap?: IndexedImage
}): unknown {
  return structuredClone({
    gs: parts.gs,
    menu: parts.menu,
    items: parts.items ?? [],
    roles: parts.roles,
    frames: parts.frames?.map(snapImage),
    icons: snapMap(parts.icons),
    portraits: snapMap(parts.portraits),
    spells: parts.spells ?? [],
    magics: parts.magics ?? [],
    equipBg: snapBitmap(parts.equipBg),
    statusBg: snapBitmap(parts.statusBg),
    battleBg: snapBitmap(parts.battleBg),
    poisons: parts.poisons ? [...parts.poisons.entries()] : [],
    levelUpExp: parts.levelUpExp ? [...parts.levelUpExp] : undefined,
    screen: parts.screen,
    bitmap: parts.bitmap ? snapImage(parts.bitmap) : undefined,
  })
}
