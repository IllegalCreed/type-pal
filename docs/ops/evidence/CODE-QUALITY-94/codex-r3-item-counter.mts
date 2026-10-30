// Independent reproduction of the C4 fixture, with a real-caller positive control.
// Exit 0 means the counter is reproduced; it is not a passing product gate.
import assert from 'node:assert/strict'
import type { Item } from '@type-pal/shared'
import { makeRole } from '../../../../packages/game/src/__tests__/coverage85-glm-game/harness.js'
import { createCommandBus } from '../../../../packages/game/src/core/command-bus.js'
import { setGlobalEvents } from '../../../../packages/game/src/core/event-system.js'
import { createInitialGameState } from '../../../../packages/game/src/core/game-state.js'
import { createInventoryMenu } from '../../../../packages/game/src/core/menu/inventory-menu.js'
import { setMenuCatalogs } from '../../../../packages/game/src/core/menu/menu-driver.js'
import { openMenu, tickMenu } from '../../../../packages/game/src/core/menu/menu-mode.js'

const item: Item = {
  id: 10,
  _name: 'fixture',
  bitmap: 0,
  price: 0,
  scriptOnUse: 500,
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

function observe(withRole: boolean) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  gs.inventory = [{ itemId: 10, count: 2 }]
  setMenuCatalogs({
    items: [item],
    spells: [],
    magics: [],
    playerRoles: { roles: withRole ? [makeRole(0)] : [] },
  })
  setGlobalEvents([
    { op: 'end' },
    { op: 'raw', opcode: 0x05, operands: [0, 0, 0], label: 'L_500' },
    { op: 'end' },
  ])
  const state = createInventoryMenu(gs, [item])
  openMenu(gs, { kind: 'inventory', state })
  for (let i = 0; i < 2; i++) {
    tickMenu(
      gs,
      { held: new Set(), pressed: new Set(['Confirm']), frameNum: i },
      createCommandBus(),
    )
  }
  return {
    phase: state.phase,
    mode: gs.mode,
    scriptStarted: gs.eventCursor !== undefined,
    count: gs.inventory[0]?.count,
  }
}

const existingFixture = observe(false)
const positiveControl = observe(true)
assert.deepEqual(existingFixture, {
  phase: 'use-target',
  mode: 'menu',
  scriptStarted: false,
  count: 2,
})
assert.equal(positiveControl.phase, 'use-target')
assert.equal(positiveControl.mode, 'event')
assert.equal(positiveControl.scriptStarted, true)
setGlobalEvents([])
console.log(
  JSON.stringify(
    {
      existingFixture,
      positiveControl,
      verdict: 'COUNTER: phase alone passes without starting the item script',
    },
    null,
    2,
  ),
)
