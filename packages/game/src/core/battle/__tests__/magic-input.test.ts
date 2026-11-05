/** Defensive input rejection occurs before costs, scripts, or presentation. */
import type { PlayerRoles } from '@type-pal/shared'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { runScript as realRunScript } from '../../event-system.js'
import { performMagic } from '../actions/magic.js'
import { makeMagic, makeRole, makeSpell, makeState } from './magic-action.test-fixtures.js'

describe('magic caster input rejection', () => {
  test('caster 索引越界：warn + 不扣 MP + 不 emit + 不跑脚本', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const st = makeState({}, [{}]).state
    const playerRoles = { roles: [makeRole()] }
    const bus: CommandBus = createCommandBus()
    const runScript = vi.fn(realRunScript)
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 9,
      spellId: 297,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 297, magicNumber: 297 })],
      magics: [makeMagic({ id: 297, baseDamage: 30, elemental: 0 })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(warn.mock.calls).toEqual([['[magic] caster player idx 9 越界']])
    expect(playerRoles.roles[0]!.mp).toBe(30) // 不扣
    expect(bus.drain()).toEqual([])
    expect(runScript).not.toHaveBeenCalled()
  })

  test('caster role 不在 playerRoles：warn + 不扣 MP + 不 emit + 不跑脚本', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const st = makeState({}, [{}]).state
    const playerRoles: PlayerRoles = { roles: [] } // caster roleId 0 缺席
    const bus: CommandBus = createCommandBus()
    const runScript = vi.fn(realRunScript)
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 297,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 297, magicNumber: 297 })],
      magics: [makeMagic({ id: 297, baseDamage: 30, elemental: 0 })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(warn.mock.calls).toEqual([['[magic] caster role 0 不在 playerRoles']])
    expect(bus.drain()).toEqual([])
    expect(runScript).not.toHaveBeenCalled()
  })
})
