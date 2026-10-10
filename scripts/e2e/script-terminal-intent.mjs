import assert from 'node:assert/strict'

/** An authored successor, never a cursor inferred from the observed terminal itself. */
export function authoredTerminalCursor(stage) {
  const exit = stage.body.at(-1)?.kind === 'finishStep' ? stage.body.at(-1).next : stage.next
  if (exit?.kind === 'complete') return { kind: 'completed' }
  return { kind: 'stage', stage: typeof exit === 'string' ? exit : (exit?.stage ?? stage.id) }
}

/** Same-scene finite execution. Callers supply independently verified author/ready evidence.
 * Cross-scene loadScene and cancelled/infinite runs have separate lifecycle contracts.
 */
export function verifyScriptTerminalReceipt(command, events, draws, expected) {
  const ready = expected.ready ?? command
  const terminals = events.filter((e) => e.phase === 'stage-settled' && e.runId === command.runId)
  const endings = events.filter((e) => e.phase === 'run-ended' && e.runId === command.runId)
  assert.equal(terminals.length, 1, 'finite script lacks unique terminal receipt')
  assert.equal(endings.length, 1, 'finite script lacks unique successful end')
  const terminal = terminals[0],
    end = endings[0]
  assert.deepEqual(terminal.cursor, expected.cursor, 'terminal cursor differs from author')
  assert.equal(
    terminal.decision,
    expected.decision,
    'terminal decision differs from ownership evidence',
  )
  assert.deepEqual(terminal.self, command.occurrence.self, 'terminal owner changed')
  assert.equal(terminal.stage, command.occurrence.path[0], 'terminal stage changed')
  assert.equal(terminal.timing, command.occurrence.timing, 'terminal timing changed')
  assert(ready.clock && command.clock, 'finite script lacks real ready clock')
  for (const receipt of [terminal, end]) {
    assert.deepEqual(receipt.occurrence, command.occurrence, 'end belongs to another command')
    assert.equal(receipt.engine, command.engine, 'end engine changed')
    assert.equal(receipt.scene, command.scene, 'end scene changed')
    assert.equal(receipt.sceneVisit, command.sceneVisit, 'end scene visit changed')
    assert.deepEqual(receipt.clock, ready.clock, 'end missed ready frame')
  }
  assert.equal(end.aborted, false, 'finite script aborted instead of completing')
  assert.equal(end.resolved, true, 'finite script did not resolve successfully')
  const draw = draws.find((e) => e.order > ready.order)
  assert(
    ready.order < terminal.order && terminal.order < end.order && draw && end.order < draw.order,
    'finite script did not finish before first available draw',
  )
  return {
    runId: command.runId,
    command: command.order,
    ready: ready.order,
    terminal: terminal.order,
    ended: end.order,
    draw: draw.order,
    cursor: expected.cursor,
    decision: expected.decision,
  }
}
