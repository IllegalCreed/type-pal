/** Real use/success scripts, including the failure gate and its sound feedback. */
import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { runScript } from '../../event-system.js'
import { performMagic, type RunScriptFn } from '../actions/magic.js'
import { makeMagic, makeSpell, makeState } from './magic-action.test-fixtures.js'

describe('magic script sequencing', () => {
  test('use runs before success and both receive the selected party target', () => {
    const fixture = makeState({ hp: 50 }, [{}])
    const calls: Array<{ ip: number; target?: { type: string; idx: number } }> = []
    const runObserved: RunScriptFn = (options) => {
      calls.push({ ip: options.ip, target: options.battleCtx?.target })
      return runScript(options)
    }
    const commands: Command[] = [
      { op: 'end' },
      { op: 'giveItem', itemId: 99, count: 1 },
      { op: 'end' },
      { op: 'giveItem', itemId: 100, count: 2 },
      { op: 'end' },
    ]
    performMagic({
      ...fixture,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell({ scriptOnUse: 1, scriptOnSuccess: 3 })],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 0 })],
      commands,
      runScript: runObserved,
    })
    expect(calls).toEqual([
      { ip: 1, target: { type: 'player', idx: 0 } },
      { ip: 3, target: { type: 'player', idx: 0 } },
    ])
    expect(fixture.gs.inventory).toEqual([
      { itemId: 99, count: 1 },
      { itemId: 100, count: 2 },
    ])
    expect(fixture.playerRoles.roles[0]!.mp).toBe(25)
  })

  test('zero use entry is skipped while the success script actually heals', () => {
    const fixture = makeState({ hp: 50, maxHP: 200 }, [])
    const calls: number[] = []
    const runObserved: RunScriptFn = (options) => {
      calls.push(options.ip)
      return runScript(options)
    }
    performMagic({
      ...fixture,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell({ scriptOnSuccess: 1 })],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 0 })],
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x1b, operands: [0, 80, 0] }, { op: 'end' }],
      runScript: runObserved,
    })
    expect(calls).toEqual([1])
    expect(fixture.playerRoles.roles[0]!.hp).toBe(130)
    expect(fixture.playerRoles.roles[0]!.mp).toBe(25)
  })

  test.each([
    9, 0,
  ])('failed use keeps MP cost, skips success/effects, and handles cast sound %i', (sound) => {
    const fixture = makeState({ hp: 50, magicSound: sound }, [])
    const calls: number[] = []
    const runObserved: RunScriptFn = (options) => {
      calls.push(options.ip)
      return runScript(options)
    }
    performMagic({
      ...fixture,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell({ scriptOnUse: 1, scriptOnSuccess: 3 })],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 0 })],
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x41, operands: [0, 0, 0] },
        { op: 'end' },
        { op: 'raw', opcode: 0x1b, operands: [0, 80, 0] },
        { op: 'end' },
      ],
      runScript: runObserved,
    })
    expect(fixture.playerRoles.roles[0]!.hp).toBe(50)
    expect(calls).toEqual([1])
    expect(fixture.gs.fScriptSuccess).toBe(false)
    expect(fixture.playerRoles.roles[0]!.mp).toBe(25)
    expect(fixture.gs.pendingSounds).toEqual(sound === 9 ? [9] : undefined)
    expect(fixture.state.battleAnim).toBeUndefined()
    expect(fixture.bus.drain()).toEqual([])
  })
})
