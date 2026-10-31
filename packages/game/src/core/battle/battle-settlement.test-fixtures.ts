/** Explicit defeated-enemy snapshot and real first won tick; never computes rewards or recovery. */
import type { InputSnapshot } from '@type-pal/shared'
import {
  type BattleLifecycleFixtureOptions,
  createBattleLifecycleFixture,
} from './battle-lifecycle.test-fixtures.js'
import { tickBattle } from './battle-system.js'

export const IDLE_INPUT: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
export const CONFIRM_INPUT: InputSnapshot = {
  held: new Set(),
  pressed: new Set(['Confirm']),
  frameNum: 0,
}
export const HELD_CONFIRM_INPUT: InputSnapshot = {
  held: new Set(['Confirm']),
  pressed: new Set(),
  frameNum: 0,
}
export const MENU_INPUT: InputSnapshot = {
  held: new Set(),
  pressed: new Set(['Menu']),
  frameNum: 0,
}

export function makeWonBattle(options: BattleLifecycleFixtureOptions = {}) {
  const fixture = createBattleLifecycleFixture({ ...options, enemyIds: [100] })
  // 单敌全灭/淡出完成后的明确快照;奖励与该敌资源相同,不冒充实际打完整场。
  fixture.state.phase = 'won'
  fixture.state.enemies[0]!.e.health = 0
  fixture.state.enemies[0]!.defeated = true
  fixture.state.expGained = options.expGained ?? 1
  fixture.state.cashGained = options.cashGained ?? 50
  return fixture
}

export function enterWonSettlement(fixture: ReturnType<typeof makeWonBattle>) {
  tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
  const settlement = fixture.state.settlement
  if (!settlement) throw new Error('won host tick must build settlement')
  return settlement
}
