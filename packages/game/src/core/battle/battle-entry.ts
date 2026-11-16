import type { Command } from '@type-pal/shared'
import type { EventCursor } from '../game-state.js'
import { OP_START_BATTLE } from '../script-opcode-ids.js'
import type { BattleState } from './battle-state.js'

// PAL_BattleMain holds the world, then VIDEO_SwitchScreen(5) draws six 60ms bands.
const WORLD_HOLD_MS = 200
const BAND_MS = 60
const BAND_COUNT = 6

const contacts = new WeakMap<EventCursor, number>()
const reveals = new WeakMap<BattleState, { nextAtMs: number }>()

/** Ordinary encounters enter directly through raw 0x07 and permit fleeing. */
export function markBattleContact(
  cursor: EventCursor,
  command: Command | undefined,
  atMs: number,
): void {
  if (
    command?.op === 'raw' &&
    command.opcode === OP_START_BATTLE &&
    (command.operands[2] ?? 0) !== 0
  ) {
    contacts.set(cursor, atMs)
  }
}

export function isBattleContact(cursor: EventCursor | undefined): boolean {
  return cursor !== undefined && contacts.has(cursor)
}

/** A story battle begins at its launch instruction; an ordinary encounter keeps its contact time. */
export function markScriptBattleEntry(cursor: EventCursor, atMs: number): void {
  if (!contacts.has(cursor)) contacts.set(cursor, atMs)
}

/** Bind the browser presentation clock to the live battle, outside its save. */
export function startContactBattleReveal(
  battle: BattleState,
  cursor: EventCursor | undefined,
): void {
  if (!cursor) return
  const contactAtMs = contacts.get(cursor)
  if (contactAtMs === undefined) return
  contacts.delete(cursor)
  battle.introFade = { step: 0, total: BAND_COUNT }
  reveals.set(battle, { nextAtMs: contactAtMs + WORLD_HOLD_MS })
}

/** Sample the 60ms band deadlines once per draw, then hold the final displayed band for 60ms. */
export function advanceContactBattleReveal(
  battle: BattleState,
  nowMs: number,
): 'hold' | 'draw' | 'complete' | undefined {
  const reveal = reveals.get(battle)
  const fade = battle.introFade
  if (!reveal || !fade) return
  if (nowMs < reveal.nextAtMs) return 'hold'
  if (fade.step === BAND_COUNT) {
    reveals.delete(battle)
    return 'complete'
  }
  fade.step++
  reveal.nextAtMs = fade.step === BAND_COUNT ? nowMs + BAND_MS : reveal.nextAtMs + BAND_MS
  return 'draw'
}
