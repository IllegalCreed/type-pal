import { type BattleState, stepBattle } from '../../battle/battle-core.js'

/** Drive the real core to a result and fail if the selected commands never complete it. */
export function runBattleToEnd(
  state: BattleState,
  chooseActions: (state: BattleState) => void,
  rng: () => number,
  maxSteps = 10_000,
): 'won' | 'lost' | 'fled' {
  for (let step = 0; step <= maxSteps; step += 1) {
    const { phase } = state
    if (phase === 'won' || phase === 'lost' || phase === 'fled') return phase
    if (step === maxSteps) break
    if (
      phase === 'selectAction' &&
      state.players.some((player, slot) => player.hp > 0 && !state.pendingActions.has(slot))
    )
      chooseActions(state)
    stepBattle(state, rng)
  }
  throw new Error('runBattleToEnd: 超过 maxSteps 未终结')
}

/** Complete the current choice and advance through its action queue and end-of-turn effects. */
export function finishBattleTurn(state: BattleState, rng: () => number, maxSteps = 60): void {
  stepBattle(state, rng)
  let step = 0
  while (state.phase === 'performAction') {
    if (step++ === maxSteps) throw new Error('Battle turn did not finish within the step limit')
    stepBattle(state, rng)
  }
}
