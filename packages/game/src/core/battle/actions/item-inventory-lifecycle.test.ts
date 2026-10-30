/** Inventory lifetime across real battle scripts; expected consumption follows fight.c's post-script lookup. */
import type { Command, Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { runScript } from '../../event-system.js'
import { getItemObjectState } from '../../object-script-state.js'
import { createBattleLifecycleFixture } from '../battle-lifecycle.test-fixtures.js'
import { performItem } from './item.js'

function useItem(commands: Command[], count: number) {
  const fx = createBattleLifecycleFixture({ commands })
  const item: Item = {
    id: 61,
    bitmap: 0,
    price: 0,
    scriptOnUse: 1,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      consuming: true,
      equipable: false,
      throwable: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
  fx.gs.inventory = [{ itemId: 61, count }]
  // A complete existing Win OBJECT is a valid runtime/save overlay; do not
  // depend on the unrelated zero-filled non-enemy fallback in opcode 0x90.
  getItemObjectState(fx.gs, item)
  performItem({
    ...fx,
    itemId: 61,
    items: [item],
    commands,
    runScript,
    casterIsEnemy: false,
    casterIdx: 0,
    targetIsEnemy: false,
    targetIdx: 0,
  })
  return fx.gs
}

describe('battle item inventory ownership', () => {
  it('consumes from the current entry after the script removes and recreates the same item', () => {
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      { op: 'raw', opcode: 0x20, operands: [61, 1, 0], label: 'L_1' },
      { op: 'giveItem', itemId: 61, count: 2 },
      { op: 'end' },
    ]
    const gs = useItem(commands, 1)
    expect(gs.inventory).toEqual([{ itemId: 61, count: 1 }])
  })

  it('retains the existing empty entry when an ordinary use consumes the last item', () => {
    const gs = useItem(
      [
        { op: 'end', label: 'L_0' },
        { op: 'end', label: 'L_1' },
      ],
      1,
    )
    expect(gs.inventory).toEqual([{ itemId: 61, count: 0 }])
  })

  it('uses the current consuming flag after the script clears it', () => {
    const gs = useItem(
      [
        { op: 'end', label: 'L_0' },
        { op: 'raw', opcode: 0x90, operands: [61, 1, 4], label: 'L_1' },
        { op: 'end' },
      ],
      1,
    )
    expect(gs.rgObject[61]?.rgwData[6]).toBe(1) // Usable, without Consuming (bit 3).
    expect(gs.inventory).toEqual([{ itemId: 61, count: 1 }])
  })
})
