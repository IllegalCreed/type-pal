/** Pure snapshots of actual render inputs; no state construction, global reset or clock installation. */
import type { Item, PlayerRoles } from '@type-pal/shared'
import type { IndexedImage } from '../../assets/png.js'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { GameState } from '../../core/game-state.js'

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

/** 背景平面只记录indices；snapshotRaster另保可选mask，不能互换输出合同。 */
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

export function snapshotRaster(img: {
  width: number
  height: number
  indices: Uint8Array
  opaque?: Uint8Array
}): { width: number; height: number; indices: number[]; opaque?: number[] } {
  return {
    width: img.width,
    height: img.height,
    indices: Array.from(img.indices),
    ...(img.opaque ? { opaque: Array.from(img.opaque) } : {}),
  }
}

/** 渲染不该改的世界字段。波和震的计数由对应用例单独断言。 */
export function worldView(gs: GameState) {
  return {
    party: { ...gs.party },
    camera: { ...gs.camera },
    npcs: gs.npcs.map((npc) => ({
      id: npc.id,
      x: npc.x,
      y: npc.y,
      sLayer: npc.sLayer ?? 0,
      spriteNum: npc.spriteNum,
    })),
    partyMembers: [...gs.partyMembers],
    trail: gs.trail.map((entry) => ({ ...entry })),
    walking: { ...gs.walkingFrame },
    wLayer: gs.wLayer,
    mode: gs.mode,
    inventory: gs.inventory.map((entry) => ({ ...entry })),
    menuLength: gs.menuStack.length,
    dialogText: gs.dialogBox?.currentLineText ?? null,
    dialogChars: gs.dialogBox?.charsRevealed ?? 0,
    followerFrozen: gs.followerFrozenOffset.map((entry) => (entry ? { ...entry } : null)),
  }
}

export function bitmapView(
  img: { width: number; height: number; indices: Uint8Array; opaque?: Uint8Array } | undefined,
) {
  return img ? snapshotRaster(img) : null
}

/** 绘制不该偷改的战斗公开状态。 */
export function battleView(state: BattleState) {
  return {
    uiState: state.uiState,
    menuState: state.menuState,
    turn: state.turn,
    selectingPlayerIdx: state.selectingPlayerIdx,
    selectedAction: state.selectedAction,
    introFade: state.introFade ? { ...state.introFade } : null,
    settlementIndex: state.settlement?.index ?? null,
    magicCursor: state.magicSelect?.cursor ?? null,
    itemCursor: state.itemSelect?.cursor ?? null,
    players: state.players.map((player) => ({
      roleId: player.roleId,
      status: { ...player.status },
    })),
    enemies: state.enemies.map((entry) => ({ id: entry.e.id, health: entry.e.health })),
    summonStep: state.battleAnim?.summon?.fadeStep ?? null,
    summonFrame: state.battleAnim?.summon?.frame ?? null,
  }
}
