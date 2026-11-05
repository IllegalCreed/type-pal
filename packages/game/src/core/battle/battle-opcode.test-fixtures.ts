import { makeBattleFixture } from '../../__tests__/battle-fixture.js'
import { lowerBoundRng } from '../../__tests__/scripted-rng.js'
import type { BusEntry } from '../command-bus.js'

/** Direct dispatcher input: shared state construction, explicit lower-bound RNG, no startBattle/hydration. */
export function makeOpcodeBattle(options: Parameters<typeof makeBattleFixture>[0] = {}) {
  return makeBattleFixture({ ...options, rng: options.rng ?? lowerBoundRng() })
}

/** Preserve the discriminated command (including op), not a weakened structural projection. */
export function damageNums(entries: BusEntry[]) {
  return entries.flatMap((entry) => (entry.cmd.op === 'showDamageNum' ? [entry.cmd] : []))
}
