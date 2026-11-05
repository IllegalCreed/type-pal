/** Real menu dispatch and Save memory IO; this is not browser IndexedDB acceptance. */
import type { AbstractKey, InputSnapshot } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRoleRecord } from '../../__tests__/battle-records.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../game-state.js'
import { Save } from '../save/api.js'
import { createSystemMenu } from './in-game-menu.js'
import { dispatchMenuInput } from './menu-driver.js'
import { openMenu } from './menu-mode.js'
import { createSaveSlotMenu } from './save-slot-menu.js'

function input(pressed: AbstractKey[]): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function freshSaveState() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, { roles: [makeRoleRecord(0)] })
  return gs
}

beforeEach(async () => {
  vi.stubGlobal('indexedDB', undefined)
  await Save._clearAllForTest()
})
afterEach(async () => {
  try {
    await Save._clearAllForTest()
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

describe('Saving through the slot menu', () => {
  it('按其他槽位最大次数加一保存，并保留原槽', async () => {
    const successLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    const seeded = freshSaveState()
    seeded.wSavedTimes = 7
    await Save.saveSlot(3, seeded)
    const gs = freshSaveState()
    gs.dwCash = 555
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })

    dispatchMenuInput(gs, input(['Confirm']))
    expect(gs.menuStack).toHaveLength(0)
    expect(gs.currentSaveSlot).toBe(1)
    // Observe completed IO rather than guessing how many microtasks a zero-delay timer drains.
    await vi.waitFor(async () => expect(await Save.loadSlot(1)).not.toBeNull())
    expect(gs.wSavedTimes).toBe(8)
    const stored = await Save.loadSlot(1)
    expect(stored?.wSavedTimes).toBe(8)
    expect(stored?.dwCash).toBe(555)
    const slots = await Save.listSlots()
    expect(slots).toHaveLength(2)
    expect(slots.find((slot) => slot.id === 1)?.meta.savedTimes).toBe(8)
    expect(slots.find((slot) => slot.id === 1)?.meta.cash).toBe(555)
    expect(slots.find((slot) => slot.id === 3)?.meta.savedTimes).toBe(7)
    expect((await Save.loadSlot(3))?.wSavedTimes).toBe(7)
    expect(successLog).toHaveBeenCalledExactlyOnceWith('[save] saved to slot 1(times=8)')
  })
})
