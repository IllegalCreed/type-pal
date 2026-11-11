import assert from 'node:assert/strict'

function selectGrid(menu, field, id) {
  const index = menu.items.findIndex((item) => item[field] === id)
  const label = field === 'itemId' ? 'item' : 'skill'
  assert(index >= 0, `Game ${id} is absent from the real ${label} menu`)
  assert(!menu.items[index].disabled, `Game ${id} is disabled`)
  return menu.cursor === index ? 'Space' : menu.cursor < index ? 'ArrowRight' : 'ArrowLeft'
}

/** Compute one physical key from the actual Game menu. This never edits battle state. */
export function nextGameBattleKey(readout, command) {
  assert.equal(readout.engine, 'game')
  if (readout.canConfirmSettlement) return 'Space'
  if (!command || readout.busy || readout.phase !== 'selectAction') return null
  assert(['attack', 'item', 'cast', 'defend'].includes(command.kind), 'unsupported Game command')
  if (command.turn !== undefined && readout.turn !== undefined && readout.turn !== command.turn)
    return null
  if (readout.selectingPlayerId !== command.actorId) return null
  if (readout.uiState === 'selectMove') {
    if (readout.menuState === 'main') {
      if (command.kind === 'item') return 'KeyE'
      if (command.kind === 'defend') return 'KeyD'
      if (command.kind === 'cast') return readout.selectedAction === 1 ? 'Space' : 'ArrowLeft'
      return readout.selectedAction === 0 ? 'Space' : 'ArrowUp'
    }
    if (readout.menuState === 'useItemSelect' && command.kind === 'item')
      return selectGrid(readout.itemMenu, 'itemId', command.itemId)
    if (readout.menuState === 'magicSelect' && command.kind === 'cast')
      return selectGrid(readout.skillMenu, 'skillId', command.skillId)
    return 'Escape'
  }
  const targetSide =
    readout.uiState === 'selectTargetEnemy'
      ? 'enemies'
      : readout.uiState === 'selectTargetPlayer'
        ? 'players'
        : null
  if (!targetSide) return null
  const targets = readout.snapshot[targetSide]
  const cancel = command.cancelTargetId && readout.targetCancels === 0
  const targetId = cancel ? command.cancelTargetId : command.targetId
  const target = targets.find((entry) => entry?.id === targetId)
  assert(target, `Game target ${targetId} is absent from ${targetSide}`)
  if (targetSide === 'enemies') assert(target.alive, 'Game command targets a defeated enemy')
  return readout.uiCursor === target.slot ? (cancel ? 'Escape' : 'Space') : 'ArrowRight'
}
