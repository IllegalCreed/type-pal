import type { Item, Spell } from '@type-pal/shared'
import type { GameState, ObjectStateMutable } from './game-state.js'

type ItemScript = 'scriptOnUse' | 'scriptOnEquip' | 'scriptOnThrow'
type MagicScript = 'scriptOnUse' | 'scriptOnSuccess'
const ITEM_SLOT = { scriptOnUse: 2, scriptOnEquip: 3, scriptOnThrow: 4 } as const
const MAGIC_SLOT = { scriptOnSuccess: 2, scriptOnUse: 3 } as const

/** The existing saved OBJECT overlay owns script progress, never the shared resource tables.
 * Seed the complete Win OBJECT union before changing a slot so other hooks retain their entries.
 */
export function getItemObjectState(gs: GameState, item: Item): ObjectStateMutable {
  const existing = gs.rgObject[item.id]
  if (existing) return existing
  const flags = item.flags
  const state: ObjectStateMutable = {
    rgwData: [
      item.bitmap,
      item.price,
      item.scriptOnUse,
      item.scriptOnEquip,
      item.scriptOnThrow,
      item.scriptDesc,
      Number(flags.usable) |
        (Number(flags.equipable) << 1) |
        (Number(flags.throwable) << 2) |
        (Number(flags.consuming) << 3) |
        (Number(flags.applyToAll) << 4) |
        (Number(flags.sellable) << 5) |
        flags.equipableBy.reduce(
          (bits, enabled, role) => bits | (Number(enabled) << (role + 6)),
          0,
        ),
    ],
  }
  gs.rgObject[item.id] = state
  return state
}

export function getItemScriptEntry(gs: GameState, item: Item, script: ItemScript): number {
  return gs.rgObject[item.id]?.rgwData[ITEM_SLOT[script]] ?? item[script]
}

export function setItemScriptEntry(
  gs: GameState,
  item: Item,
  script: ItemScript,
  entry: number,
): void {
  if (entry !== getItemScriptEntry(gs, item, script)) {
    getItemObjectState(gs, item).rgwData[ITEM_SLOT[script]] = entry
  }
}

export function getMagicScriptEntry(
  gs: GameState | undefined,
  spell: Spell,
  script: MagicScript,
): number {
  return gs?.rgObject[spell.id]?.rgwData[MAGIC_SLOT[script]] ?? spell[script]
}

export function setMagicScriptEntry(
  gs: GameState | undefined,
  spell: Spell,
  script: MagicScript,
  entry: number,
): void {
  if (!gs || entry === getMagicScriptEntry(gs, spell, script)) return
  const flags = spell.flags
  const state = gs.rgObject[spell.id] ?? {
    rgwData: [
      spell.magicNumber,
      0,
      spell.scriptOnSuccess,
      spell.scriptOnUse,
      0,
      spell.scriptDesc,
      Number(flags.usableOutsideBattle) |
        (Number(flags.usableInBattle) << 1) |
        (Number(flags.usableToEnemy) << 3) |
        (Number(flags.applyToAll) << 4),
    ],
  }
  state.rgwData[MAGIC_SLOT[script]] = entry
  gs.rgObject[spell.id] = state
}
