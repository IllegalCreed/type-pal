import assert from 'node:assert/strict'
import test from 'node:test'
import { nextGameBattleKey } from './battle-game-input.mjs'
import { nextReforgeBattleKey } from './battle-reforge-input.mjs'

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

test('Game confirms a group item only in its inventory grid, then lets native selection commit', () => {
  const cases = [
    ['item', '145', 'player', 'useItemSelect', 'selectTargetPlayerAll', 'KeyE'],
    ['throw', '67', 'enemy', 'throwItemSelect', 'selectTargetEnemyAll', 'KeyW'],
  ]
  for (const [kind, itemId, targetSide, menuState, uiState, shortcut] of cases) {
    const command = { actorId: 'hero', kind, itemId, targetId: null, targetSide }
    const itemMenu = { cursor: 0, items: [{ itemId, disabled: false }] }
    assert.equal(nextGameBattleKey(menu(), command), shortcut)
    assert.equal(nextGameBattleKey(menu({ menuState, itemMenu }), command), 'Space')
    assert.equal(nextGameBattleKey(menu({ uiState }), command), null)
  }
})

test('Reforge uses the requested consumable in the native inventory grid', () => {
  const command = { actorId: 'hero', kind: 'item', targetId: 'anu', itemId: '104' }
  const items = [{ itemId: '99' }, { itemId: '104' }, { itemId: '145' }]
  const reforgeItem = (cursor) => ({
    ...menu({ engine: 'reforge' }),
    selection: { phase: 'item' },
    itemMenu: { cursor, items },
  })
  assert.equal(nextReforgeBattleKey(reforgeItem(0), command), 'ArrowRight')
  assert.equal(nextReforgeBattleKey(reforgeItem(2), command), 'ArrowLeft')
  assert.equal(nextReforgeBattleKey(reforgeItem(1), command), 'Enter')
  assert.throws(
    () => nextReforgeBattleKey(reforgeItem(1), { ...command, itemId: '95' }),
    /absent from the real item menu/,
  )
})

test('throw follows each native inventory to the specified weapon', () => {
  const command = { actorId: 'hero', kind: 'throw', targetId: 'lamp-a', itemId: '166' }
  const items = [{ itemId: '165' }, { itemId: '166' }]
  const gameThrow = (cursor) => menu({ menuState: 'throwItemSelect', itemMenu: { cursor, items } })
  const reforgeThrow = (cursor) => ({
    ...menu({ engine: 'reforge' }),
    selection: { phase: 'throwItem' },
    throwMenu: { cursor, items },
  })
  assert.equal(nextGameBattleKey(menu(), command), 'KeyW')
  assert.equal(
    nextReforgeBattleKey({ ...menu({ engine: 'reforge' }), selection: { phase: 'menu' } }, command),
    'KeyW',
  )
  assert.equal(nextGameBattleKey(gameThrow(0), command), 'ArrowRight')
  assert.equal(nextReforgeBattleKey(reforgeThrow(0), command), 'ArrowRight')
  assert.equal(nextGameBattleKey(gameThrow(1), command), 'Space')
  assert.equal(nextReforgeBattleKey(reforgeThrow(1), command), 'Enter')
  assert.throws(() => nextGameBattleKey(gameThrow(1), { ...command, itemId: '167' }), /absent/)
  assert.throws(
    () => nextReforgeBattleKey(reforgeThrow(1), { ...command, itemId: '167' }),
    /absent/,
  )
})

test('the driver waits for animations and other actors, then confirms actual settlement', () => {
  const command = { actorId: 'hero', kind: 'attack', targetId: 'lamp-a' }
  assert.equal(nextGameBattleKey(menu({ busy: true }), command), null)
  assert.equal(nextGameBattleKey(menu({ phase: 'performAction' }), command), null)
  assert.equal(nextGameBattleKey(menu({ selectingPlayerId: 'anu' }), command), null)
  assert.equal(nextGameBattleKey(menu({ canConfirmSettlement: true }), undefined), 'Space')
})
