import { type RuntimeFramePorts, RuntimeFrameSession } from '../runtime-frame-session.js'

export function frameFixture() {
  const session = new RuntimeFrameSession(100)
  const events: unknown[][] = []
  const state = { frozen: false, battle: false, pressed: new Set<string>() }
  const record = (name: string, ...args: unknown[]) => {
    events.push([name, ...args])
  }
  const ports: RuntimeFramePorts = {
    activateConfirm: () => record('activate'),
    resumeScriptGates: () => record('resume'),
    gameplayFrozen: () => state.frozen,
    advanceFade: (now) => record('fade', now),
    settleClosedDialogue: () => record('dialogue'),
    consumePressed: () => {
      record('keys')
      return state.pressed
    },
    tickHostiles: (dt) => record('hostiles', dt),
    advanceMoves: (dt, keys) => record('moves', dt, [...keys]),
    deriveMounts: () => record('mounts'),
    advanceLifecycle: (frozen, step) => record('lifecycle', frozen, step),
    advanceEntityActions: (dt) => record('actions', dt),
    clearWorldTicks: () => record('clearTicks'),
    presentBattle: (dt, keys, now) => {
      record('battle', dt, [...keys], now)
      return state.battle
    },
    routeInput: (keys, real) => record('input', [...keys], real),
    presentWorld: () => record('world'),
  }
  return { session, ports, state, events, tick: (real: number) => session.tick(real, ports) }
}
