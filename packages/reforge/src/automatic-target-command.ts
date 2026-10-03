import type { AutomaticCommandCheckpoint } from './script-runner-core.js'

export interface AutomaticTargetCommandGate {
  signal: AbortSignal
  checkpoint?: AutomaticCommandCheckpoint
  /** Also rejects obsolete activation/scene lineages, at wake and at the commit boundary. */
  eligible(): boolean
  wait(eligible: () => boolean): Promise<void>
}

async function atAutomaticTargetBoundary(
  gate: AutomaticTargetCommandGate,
  commit: () => Promise<void>,
  checkpointWhilePending: boolean,
): Promise<void> {
  while (true) {
    gate.signal.throwIfAborted()
    gate.checkpoint?.ready()
    await gate.wait(gate.eligible)
    await gate.checkpoint?.beginMutation()
    gate.signal.throwIfAborted()
    // Both awaits may observe a new take or a save-barrier replacement. No await is allowed
    // between this final target check and the host's synchronous side-effect installation.
    if (!gate.eligible()) continue
    const pending = commit()
    if (checkpointWhilePending) gate.checkpoint?.ready()
    await pending
    gate.signal.throwIfAborted()
    return
  }
}

/** Pause exactly one automatic visual command; no gameplay time or motion phase is invented. */
export async function executeAutomaticTargetCommand(
  gate: AutomaticTargetCommandGate,
  execute: () => Promise<void>,
  checkpointWhilePending = false,
): Promise<void> {
  await atAutomaticTargetBoundary(gate, execute, checkpointWhilePending)
  // An awaited action may have been taken/superseded while it was playing. Its visual leaf
  // may restart after restore, but its following reward must not run through that takeover.
  if (checkpointWhilePending) await atAutomaticTargetBoundary(gate, () => Promise.resolve(), false)
}
