import assert from 'node:assert/strict'

function selectInventoryItem(menu, itemId, label) {
  assert(menu, `Reforge ${label} menu was not observed`)
  const { cursor, items } = menu
  const index = items.findIndex((item) => item.itemId === itemId)
  assert(index >= 0, `Reforge ${itemId} is absent from the real ${label} menu`)
  if (cursor === index) return 'Enter'
  return cursor < index ? 'ArrowRight' : 'ArrowLeft'
}

/** Translate an intended command into one real key; the game still owns selection and submission. */
export function nextReforgeBattleKey(readout, command) {
  if (readout.canConfirmDialogue || readout.canConfirmSettlement) return 'Enter'
  if (readout.busy || readout.phase !== 'selectAction' || !command) return null
  assert(
    ['attack', 'item', 'cast', 'coop', 'throw', 'defend'].includes(command.kind),
    'unsupported Reforge command',
  )
  if (command.turn !== undefined && readout.turn !== undefined && readout.turn !== command.turn)
    return null
  if (readout.selectingPlayerId !== command.actorId) return null
  const view = readout.selection
  assert(view, 'ready battle has no command-selection view')
  if (view.phase === 'menu') {
    if (command.kind === 'defend') return 'KeyD'
    if (command.kind === 'throw') return 'KeyW'
    if (command.kind === 'cast') return view.menuIndex === 1 ? 'Enter' : 'ArrowLeft'
    if (command.kind === 'coop') return view.menuIndex === 2 ? 'Enter' : 'ArrowRight'
    const wanted = command.kind === 'attack' ? 0 : 3
    return view.menuIndex === wanted ? 'Enter' : wanted === 0 ? 'ArrowUp' : 'ArrowDown'
  }
  if (view.phase === 'skill' && command.kind === 'cast') {
    const index = readout.skillMenu.items.findIndex(({ skillId }) => skillId === command.skillId)
    assert(index >= 0, `Reforge skill ${command.skillId} is absent from the real menu`)
    assert(!readout.skillMenu.items[index].disabled, `Reforge skill ${command.skillId} is disabled`)
    return view.skillIndex === index
      ? 'Enter'
      : view.skillIndex < index
        ? 'ArrowRight'
        : 'ArrowLeft'
  }
  if (command.kind === 'item') {
    if (view.phase === 'misc') return view.miscIndex === 1 ? 'Enter' : 'ArrowDown'
    if (view.phase === 'miscSub') return view.miscSubIndex === 0 ? 'Enter' : 'ArrowUp'
    if (view.phase === 'item') return selectInventoryItem(readout.itemMenu, command.itemId, 'item')
  }
  if (view.phase === 'throwItem' && command.kind === 'throw')
    return selectInventoryItem(readout.throwMenu, command.itemId, 'throw')
  if (view.phase === 'target') {
    const targets =
      view.targetSide === 'ally'
        ? readout.snapshot.players
        : readout.snapshot.enemies.filter((enemy) => enemy?.alive)
    const cancel = command.cancelTargetId && readout.targetCancels === 0
    const targetId = cancel ? command.cancelTargetId : command.targetId
    const index = targets.findIndex((target) => target.id === targetId)
    assert(index >= 0, `requested battle target ${targetId} is absent`)
    return view.targetIndex === index ? (cancel ? 'Escape' : 'Enter') : 'ArrowRight'
  }
  throw new Error(`unexpected foundation selection phase ${view.phase}`)
}
