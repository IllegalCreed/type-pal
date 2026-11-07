import assert from 'node:assert/strict'
import test from 'node:test'
import { nextGameBattleKey } from './battle-game-input.mjs'

const menu = (overrides = {}) => ({
  engine: 'game',
  phase: 'selectAction',
  busy: false,
  selectingPlayerId: 'hero',
  uiState: 'selectMove',
  menuState: 'main',
  selectedAction: 0,
  uiCursor: 0,
  snapshot: {
    players: [
      { id: 'hero', slot: 0 },
      { id: 'anu', slot: 1 },
    ],
    enemies: [
      { id: 'lamp-a', slot: 0, alive: true },
      null,
      { id: 'lamp-c', slot: 2, alive: true },
      null,
      null,
    ],
  },
  ...overrides,
})

test('manual attack follows the native target cursor without collapsing empty slots', () => {
  const command = { actorId: 'hero', kind: 'attack', targetId: 'lamp-c' }
  assert.equal(nextGameBattleKey(menu(), command), 'Space')
  assert.equal(nextGameBattleKey(menu({ uiState: 'selectTargetEnemy' }), command), 'ArrowRight')
  assert.equal(
    nextGameBattleKey(menu({ uiState: 'selectTargetEnemy', uiCursor: 2 }), command),
    'Space',
  )
  assert.throws(
    () =>
      nextGameBattleKey(menu({ uiState: 'selectTargetEnemy' }), {
        ...command,
        targetId: 'missing',
      }),
    /absent from enemies/,
  )
})

test('use-item navigates actual inventory and the actual ally target', () => {
  const command = { actorId: 'hero', kind: 'item', targetId: 'anu', itemId: '99' }
  assert.equal(nextGameBattleKey(menu(), command), 'KeyE')
  const itemMenu = {
    cursor: 0,
    items: [
      { itemId: '61', disabled: false },
      { itemId: '99', disabled: false },
    ],
  }
  const selecting = menu({ menuState: 'useItemSelect', itemMenu })
  assert.equal(nextGameBattleKey(selecting, command), 'ArrowRight')
  assert.equal(
    nextGameBattleKey({ ...selecting, itemMenu: { ...itemMenu, cursor: 1 } }, command),
    'Space',
  )
  assert.equal(nextGameBattleKey(menu({ uiState: 'selectTargetPlayer' }), command), 'ArrowRight')
  assert.equal(
    nextGameBattleKey(menu({ uiState: 'selectTargetPlayer', uiCursor: 1 }), command),
    'Space',
  )
  assert.throws(
    () => nextGameBattleKey({ ...selecting, itemMenu: { cursor: 0, items: [] } }, command),
    /absent from the real item menu/,
  )
})

test('the driver waits for animations and other actors, then confirms actual settlement', () => {
  const command = { actorId: 'hero', kind: 'attack', targetId: 'lamp-a' }
  assert.equal(nextGameBattleKey(menu({ busy: true }), command), null)
  assert.equal(nextGameBattleKey(menu({ phase: 'performAction' }), command), null)
  assert.equal(nextGameBattleKey(menu({ selectingPlayerId: 'anu' }), command), null)
  assert.equal(nextGameBattleKey(menu({ canConfirmSettlement: true }), undefined), 'Space')
})
