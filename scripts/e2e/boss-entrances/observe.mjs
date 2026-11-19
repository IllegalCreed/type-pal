import assert from 'node:assert/strict'
import { scriptedDefeatObserver } from '../battle-scripted-defeat-observer.mjs'

export function bossObserver(input) {
  let world = scriptedDefeatObserver(input)
  if (input.watched?.length) {
    const watchers = [
      [
        '.filter(({ id }) => id === Number(owner.slice(1)) || id === Number(owner.slice(1)) - 1)',
        `.filter(({ id }) => id === Number(owner.slice(1)) || ${JSON.stringify(input.watched)}.includes('e' + id))`,
      ],
      [
        '.filter(({ id }) => id === owner || Number(id.slice(1)) === Number(owner.slice(1)) - 1)',
        `.filter(({ id }) => id === owner || ${JSON.stringify(input.watched)}.includes(id))`,
      ],
    ]
    for (const [anchor, replacement] of watchers) {
      assert.equal(world.split(anchor).length, 2, 'boss actor observation source changed')
      world = world.replace(anchor, replacement)
    }
  }
  return `${world};(${installBossFrameObserver})(${JSON.stringify(input.engine)})`
}

function installBossFrameObserver(engine) {
  const observation = globalThis.__defeat
  let drop
  const observeRandom = globalThis.__battleGameRandom
  globalThis.__battleGameRandom = (...args) => {
    observeRandom(...args)
    if (drop) observation.event('drop-sample', { ...drop, value: args[2] })
  }
  globalThis.__bossDrop = {
    begin(slot, id) {
      drop = { slot, id }
      observation.event('defeated-script-start', drop)
    },
    end() {
      const inventory =
        engine === 'game' ? globalThis.__tpgs.inventory : globalThis.__rfWorld.inventory
      observation.event('defeated-script-end', {
        ...drop,
        inventory: inventory
          .filter(({ count }) => count > 0)
          .map(({ itemId, count }) => ({ itemId: String(itemId), count })),
      })
      drop = undefined
    },
    active: () => !!drop,
    sample() {
      const value = observation.rng()
      observation.event('drop-sample', { ...drop, value })
      return value
    },
  }
  globalThis.__bossSettlement = (screen) => {
    if (screen?.kind === 'exp-cash')
      observation.eventOnce('victory-summary-drawn', {
        exp: screen.expGained ?? screen.exp,
        cash: screen.cashGained ?? screen.cash,
      })
  }
  const nativeTerminal = globalThis.__battleGameTerminal
  let victory = false
  globalThis.__battleGameTerminal = (gs, outcome) => {
    nativeTerminal(gs, outcome)
    victory = outcome === 'won'
  }
  globalThis.__bossNarration = (state) => {
    const text = state.currentLineText ?? state.shownLines[0]
    if (text && (victory || globalThis.__tpgs.battleState?.phase === 'won')) {
      const kind = victory ? 'reward-note-drawn' : 'defeated-note-drawn'
      observation.eventOnce(kind, { text })
    }
  }
  const seen = new WeakMap()
  const frameKeys = new Map()
  let actor, lastAction
  const nativeStart = globalThis.__battleGameActionStart
  globalThis.__battleGameActionStart = (state, gs, who, action, roles) => {
    nativeStart(state, gs, who, action, roles)
    actor = {
      turn: state.turn + 1,
      side: who.isEnemy ? 'enemy' : 'player',
      slot: who.idx,
      kind: action.type,
      target: action.target,
    }
  }
  const nativeComplete = globalThis.__battleGameActionComplete
  globalThis.__battleGameActionComplete = (...args) => {
    nativeComplete(...args)
    actor = undefined
  }
  const nativeReforgeAction = observation.reforgeAction
  observation.reforgeAction = (action, state) => {
    nativeReforgeAction(action, state)
    lastAction = {
      turn: state.turn,
      side: action.side,
      slot: action.idx,
      kind: action.kind,
      target: action.targetPlayerIdx ?? action.targetEnemyIdx ?? null,
    }
  }
  Object.assign(globalThis.__battleEvidence, {
    labelFighter(draw, side, slot, fading, frame) {
      seen.set(draw, { side, slot, fading, frame })
    },
    fighterDrawn(draw, frame) {
      const identity = seen.get(draw)
      if (identity?.side !== 'enemy' || identity.fading) return
      const active =
        engine === 'game'
          ? globalThis.__tpgs.battleState?.battleAnim && actor
          : globalThis.__rfBattle?.actionPresentation.active && lastAction
      const { x, y } = draw
      const recorded = {
        slot: identity.slot,
        frame: frame ?? identity.frame,
        x,
        y,
        active: active || null,
      }
      const key = JSON.stringify(recorded)
      if (frameKeys.get(identity.slot) !== key) {
        observation.event('boss-frame', recorded)
        frameKeys.set(identity.slot, key)
      }
    },
    magicOverlayDrawn() {},
  })
}
