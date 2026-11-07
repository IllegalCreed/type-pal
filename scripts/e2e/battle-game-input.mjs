import assert from 'node:assert/strict'

/** Compute one physical key from the actual Game menu. This never edits battle state. */
export function nextGameBattleKey(readout, command) {
  assert.equal(readout.engine, 'game')
  if (readout.canConfirmSettlement) return 'Space'
  if (!command || readout.busy || readout.phase !== 'selectAction') return null
  assert(['attack', 'item'].includes(command.kind), 'unsupported first-batch Game command')
  if (readout.selectingPlayerId !== command.actorId) return null
  if (readout.uiState === 'selectMove') {
    if (readout.menuState === 'main') {
      if (command.kind === 'item') return 'KeyE'
      return readout.selectedAction === 0 ? 'Space' : 'ArrowUp'
    }
    if (readout.menuState === 'useItemSelect' && command.kind === 'item') {
      const index = readout.itemMenu.items.findIndex((item) => item.itemId === command.itemId)
      assert(index >= 0, `Game item ${command.itemId} is absent from the real item menu`)
      assert(!readout.itemMenu.items[index].disabled, `Game item ${command.itemId} is disabled`)
      const cursor = readout.itemMenu.cursor
      return cursor === index ? 'Space' : cursor < index ? 'ArrowRight' : 'ArrowLeft'
    }
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
  const target = targets.find((entry) => entry?.id === command.targetId)
  assert(target, `Game target ${command.targetId} is absent from ${targetSide}`)
  if (targetSide === 'enemies') assert(target.alive, 'Game command targets a defeated enemy')
  return readout.uiCursor === target.slot ? 'Space' : 'ArrowRight'
}
