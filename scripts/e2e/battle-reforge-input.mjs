import assert from 'node:assert/strict'

/** Translate an intended command into one real key; the game still owns selection and submission. */
export function nextReforgeBattleKey(readout, command) {
  if (readout.canConfirmSettlement) return 'Enter'
  if (readout.busy || readout.phase !== 'selectAction' || !command) return null
  assert(['attack', 'item'].includes(command.kind), 'unsupported first-batch Reforge command')
  if (readout.selectingPlayerId !== command.actorId) return null
  const view = readout.selection
  assert(view, 'ready battle has no command-selection view')
  if (view.phase === 'menu') {
    const wanted = command.kind === 'attack' ? 0 : 3
    return view.menuIndex === wanted ? 'Enter' : wanted === 0 ? 'ArrowUp' : 'ArrowDown'
  }
  if (command.kind === 'item') {
    if (view.phase === 'misc') return view.miscIndex === 1 ? 'Enter' : 'ArrowDown'
    if (view.phase === 'miscSub') return view.miscSubIndex === 0 ? 'Enter' : 'ArrowUp'
    if (view.phase === 'item') return 'Enter'
  }
  if (view.phase === 'target') {
    const targets =
      view.targetSide === 'ally'
        ? readout.snapshot.players
        : readout.snapshot.enemies.filter((enemy) => enemy?.alive)
    const index = targets.findIndex((target) => target.id === command.targetId)
    assert(index >= 0, `requested battle target ${command.targetId} is absent`)
    return view.targetIndex === index ? 'Enter' : 'ArrowRight'
  }
  throw new Error(`unexpected foundation selection phase ${view.phase}`)
}
