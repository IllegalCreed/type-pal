import { describe, expect, it } from 'vitest'
import {
  makeBattleReadoutState,
  makeExploreState,
  makeInspectionBattle,
  makeInspectionState,
} from './__tests__/readout-fixture.js'
import { collectFieldInfoReadout } from './battle-inspect.js'

describe('Battle field and nonbattle guard', () => {
  it('collectFieldInfoReadout:战斗读 field(含 signed 场效);非战斗 null', () => {
    const field = collectFieldInfoReadout(makeBattleReadoutState())
    expect(field?.fieldId).toBe(7)
    expect(field?.elements.find((e) => e.label === '火')?.value).toBe(-2)
    expect(collectFieldInfoReadout(makeExploreState())).toBeNull()
  })

  it('isBoss/screenWave 原样透出；boss 标志 false 时如实 false', () => {
    const boss = makeInspectionBattle([], [], true)
    const field = collectFieldInfoReadout(makeInspectionState(boss))
    expect(field?.isBoss).toBe(true)
    expect(field?.screenWave).toBe(2)
    expect(
      collectFieldInfoReadout(makeInspectionState(makeInspectionBattle([], [], false)))?.isBoss,
    ).toBe(false)
  })
})
