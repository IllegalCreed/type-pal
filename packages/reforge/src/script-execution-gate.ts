import type { SafePointDecision, ScriptGateBoundary } from './script-runner-core.js'

export interface ScriptExecutionGate {
  gate?(
    signal: AbortSignal,
    boundary?: ScriptGateBoundary,
  ): void | SafePointDecision | Promise<void> | Promise<SafePointDecision | undefined>
  /** Recheck after awaits; no asynchronous gap may separate this read from a mutation. */
  gateOpen?(signal: AbortSignal, boundary?: ScriptGateBoundary): boolean
}

export class ScriptGateStopped extends Error {
  constructor() {
    super('script activation lost its cursor ownership')
  }
}

export async function atScriptExecutionGate<T>(
  host: ScriptExecutionGate,
  signal: AbortSignal,
  boundary: ScriptGateBoundary | undefined,
  action: () => T | Promise<T>,
  checkpoint?: { ready(): void; beginMutation(): Promise<void>; terminal?: boolean },
): Promise<T> {
  while (true) {
    checkpoint?.ready()
    const lockBeforeGate =
      checkpoint?.terminal && (!host.gateOpen || host.gateOpen(signal, boundary))
    if (lockBeforeGate) {
      await checkpoint.beginMutation()
      signal.throwIfAborted()
      if (host.gateOpen && !host.gateOpen(signal, boundary)) continue
    }
    const decision = await host.gate?.(signal, boundary)
    signal.throwIfAborted()
    if (decision === 'stop') throw new ScriptGateStopped()
    if (!lockBeforeGate) await checkpoint?.beginMutation()
    signal.throwIfAborted()
    if (host.gateOpen && !host.gateOpen(signal, boundary)) continue
    return action()
  }
}
