// Independent probes against real public callers, without modifying product files.
// Run: pnpm exec tsx docs/ops/evidence/CODE-QUALITY-94/codex-r2-menu-counter.mts
import assert from 'node:assert/strict'
import type { AbstractKey, Magic, Spell } from '@type-pal/shared'
import { makeRole } from '../../../../packages/game/src/__tests__/coverage85-glm-game/harness.js'
import { createCommandBus } from '../../../../packages/game/src/core/command-bus.js'
import { createInitialGameState } from '../../../../packages/game/src/core/game-state.js'
import { createInGameMagicMenu } from '../../../../packages/game/src/core/menu/in-game-magic-menu.js'
import { dispatchMenuInput } from '../../../../packages/game/src/core/menu/menu-driver.js'
import { openMenu } from '../../../../packages/game/src/core/menu/menu-stack.js'
import { createOpeningMenu } from '../../../../packages/game/src/core/menu/opening-menu.js'

const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
const opening = createOpeningMenu()
openMenu(gs, { kind: 'opening', state: opening })
const send = (keys: AbstractKey[]) =>
  dispatchMenuInput(
    gs,
    { held: new Set(), pressed: new Set(keys), frameNum: 0 },
    createCommandBus(),
  )
send(['Down'])
assert.equal(opening.selection.cursor, 1)
send(['Confirm'])
assert.equal(gs.menuStack.at(-1)?.kind, 'save-slot')
send(['Menu'])
assert.equal(gs.menuStack.at(-1)?.kind, 'opening')
assert.equal(opening.selection.cursor, 1) // SDLPal uigame.c:150 resets this to 0.

function spell(id: number, outside: boolean): Spell {
  return {
    id,
    magicNumber: 1,
    scriptOnUse: 0,
    scriptOnSuccess: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: outside,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
  }
}
const magic: Magic = {
  id: 1,
  effect: 0,
  type: 'normal',
  xOffset: 0,
  yOffset: 0,
  special: 0,
  speed: 0,
  keepEffect: 0,
  fireDelay: 0,
  effectTimes: 0,
  shake: 0,
  wave: 0,
  unknown: 0,
  costMP: 5,
  baseDamage: 0,
  elemental: 0,
  sound: 0,
}
const state = createInGameMagicMenu(
  { roles: [makeRole(0, { magic: [300, 305], hp: 100, mp: 50 })] },
  [0],
  [spell(300, true), spell(305, false)],
  [magic],
)
assert.deepEqual(
  state.spellMenu?.items.map((item) => item.id),
  [300],
)
console.log(
  JSON.stringify(
    {
      openingCancel: {
        observedCursor: opening.selection.cursor,
        primaryCursor: 0,
        primary: 'SDLPal uigame.c:143-150',
        sameOpeningObjectRetained: gs.menuStack[0]?.state === opening,
      },
      outsideMagic: {
        observedIds: state.spellMenu?.items.map((item) => item.id),
        primaryIds: [300, 305],
        primary305Enabled: false,
        primary: 'SDLPal magicmenu.c:338-372',
      },
      conclusion:
        'COUNTER: current assertions miss opening cursor reset and enshrine hiding a disabled learned spell',
    },
    null,
    2,
  ),
)
