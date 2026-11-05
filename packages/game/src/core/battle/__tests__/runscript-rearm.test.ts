/** Script return-entry contracts and the enemy-ready caller that owns the saved entry. */
import type { Command } from '@type-pal/shared'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { makeBattleFixture } from '../../../__tests__/battle-fixture.js'
import { runScript } from '../../event-system.js'
import { battleInput, startTestBattle } from '../battle-start.test-fixtures.js'
import { tickBattle } from '../battle-system.js'

const PREFIX: Command = { op: 'setDialogStyleNarration' }

function run(commands: Command[], ip = 1): number {
  const { state, gs, playerRoles, bus } = makeBattleFixture()
  return runScript({
    commands,
    ip,
    bus,
    runtimeMode: 'battle',
    battleCtx: { state, gs, playerRoles },
  })
}

describe('script return entry', () => {
  it('plain end returns the initial entry even after preceding instructions', () => {
    expect(run([{ op: 'end' }, PREFIX, { op: 'end' }])).toBe(1)
    expect(run([{ op: 'end' }, { op: 'end' }])).toBe(1)
  })

  it('advance end returns the instruction after that end', () => {
    expect(run([{ op: 'end' }, PREFIX, { op: 'end', advance: true }])).toBe(3)
    expect(run([{ op: 'end' }, { op: 'end', advance: true }])).toBe(2)
  })

  it('reset end resolves the label to its command index', () => {
    const commands: Command[] = [
      { op: 'end' },
      { op: 'end', reset: true, resetTo: 7 },
      PREFIX,
      { op: 'end', label: 'L_7' },
    ]
    expect(run(commands)).toBe(3)
  })

  it('missing reset labels leave the original entry armed', () => {
    expect(run([{ op: 'end' }, { op: 'end', reset: true, resetTo: 999 }])).toBe(1)
  })

  it('running past the command list reports its exact warning and keeps the original entry', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warning.mockRestore())
    expect(run([{ op: 'end' }, PREFIX])).toBe(1)
    expect(warning.mock.calls).toEqual([['[event-system battle] ip 2 越界 → 退出']])
  })
})

it('enemy-ready writes back an advance-end result and does not replay its script on the next action', () => {
  const { gs, bus } = startTestBattle({
    commands: [
      { op: 'end' },
      { op: 'giveItem', itemId: 99, count: 1 },
      { op: 'end', advance: true },
      { op: 'end' },
    ],
  })
  const state = gs.battleState!
  state.enemies[0]!.scriptOnReady = 1
  const selectEnemy = () => {
    state.phase = 'performAction'
    state.actionQueue = [{ isEnemy: true, idx: 0, dex: 100, fIsSecond: false }]
    state.currentActionIndex = 0
    // The isolated next action starts after the previous timeline, not during it.
    state.battleAnim = undefined
  }
  selectEnemy()
  tickBattle(gs, battleInput(), bus)
  expect(state.enemies[0]!.scriptOnReady).toBe(3)
  expect(gs.inventory).toEqual([{ itemId: 99, count: 1 }])
  for (let i = 0; state.battleAnim && i < 200; i++) tickBattle(gs, battleInput(), bus)
  expect(state.battleAnim).toBeUndefined()
  selectEnemy()
  tickBattle(gs, battleInput(), bus)
  expect(state.enemies[0]!.scriptOnReady).toBe(3)
  expect(gs.inventory).toEqual([{ itemId: 99, count: 1 }])
})
