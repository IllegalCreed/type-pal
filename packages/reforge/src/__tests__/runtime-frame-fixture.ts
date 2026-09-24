import { type RuntimeFramePorts, RuntimeFrameSession } from '../runtime-frame-session.js'
import type { RuntimeInputPorts } from '../runtime-input-router.js'

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

export function inputFixture() {
  const state = {
    confirm: false,
    shop: false,
    reward: false,
    menu: false,
    dialogue: false,
    runner: false,
    hostile: false,
  }
  const events: unknown[][] = []
  const record = (name: string, ...args: unknown[]) => {
    events.push([name, ...args])
  }
  const ports: RuntimeInputPorts = {
    confirm: {
      active: () => state.confirm,
      toggle: () => record('toggle'),
      yes: () => record('yes'),
      no: () => record('no'),
    },
    consumeShop: (keys) => {
      if (!state.shop) return false
      record('shop', [...keys])
      return true
    },
    consumeReward: (keys) => {
      if (!state.reward) return false
      record('reward', [...keys])
      return true
    },
    menu: {
      active: () => state.menu,
      input: (keys) => record('menu', [...keys]),
      open: () => {
        state.menu = true
        record('open')
      },
    },
    dialogue: { active: () => state.dialogue, advance: (time) => record('dialogue', time) },
    scriptRunning: () => state.runner,
    hostileBusy: () => state.hostile,
    quickSave: () => record('save'),
    quickLoad: () => record('load'),
    interact: () => record('interact'),
    changeDebugScene: (keys) => record('scene', [...keys]),
  }
  return { state, events, ports }
}
