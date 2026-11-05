/** Synchronous battle scripts and their existing unsupported-input policies.
 * These are direct-runner contracts, not complete startBattle or natural-story tests.
 */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeBattleFixture } from '../__tests__/battle-fixture.js'
import { makeRoleRecord as makeRole } from '../__tests__/battle-records.js'
import { createCommandBus } from './command-bus.js'
import { runScript } from './event-system.js'
import { type GameState, hydratePlayerRolesRuntime } from './game-state.js'
import { setObjectPoisons } from './player-poison-state.js'

function makeBattle(options: Parameters<typeof makeBattleFixture>[0] = {}) {
  const fixture = makeBattleFixture(options)
  hydratePlayerRolesRuntime(fixture.gs.PlayerRolesRuntime, fixture.playerRoles)
  fixture.gs.mode = 'battle'
  return fixture
}

function runBattle(gs: GameState, commands: Command[], eventObjectId?: number): number {
  const state = gs.battleState
  if (!state) throw new Error('battle script fixture requires an attached battle state')
  return runScript({
    commands,
    ip: 0,
    bus: createCommandBus(),
    runtimeMode: 'battle',
    battleCtx: { state, gs },
    eventObjectId,
  })
}

function markerScript(opcode: number, operands: [number, number, number]): Command[] {
  return [
    { op: 'raw', opcode, operands },
    { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
    { op: 'raw', opcode: 0x1e, operands: [222, 0, 0], label: 'L_2' },
    { op: 'end' },
  ]
}

afterEach(() => {
  setObjectPoisons([])
  vi.restoreAllMocks()
})

describe('synchronous battle script boundaries', () => {
  it('poison-kind branch reads the current role through its party slot', () => {
    setObjectPoisons([{ id: 7, level: 1, color: 0, playerScript: 0, enemyScript: 0 }])
    const gs = makeBattle({ roles: [makeRole(0), makeRole(1)], party: [1, 0] }).gs
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 7, wPoisonScript: 0 }
    runBattle(gs, markerScript(0x5d, [7, 2, 0]), 1)
    expect(gs.dwCash).toBe(333)
    const clean = makeBattle({ roles: [makeRole(0), makeRole(1)], party: [1, 0] }).gs
    runBattle(clean, markerScript(0x5d, [7, 2, 0]), 1)
    expect(clean.dwCash).toBe(222)
  })
  it('full-HP branch distinguishes a wounded party from a fully healed one', () => {
    const wounded = makeBattle({ roles: [makeRole(0), makeRole(1)] }).gs
    wounded.partyMembers = [0, 1]
    wounded.PlayerRolesRuntime.rgwHP[0] = 100
    wounded.PlayerRolesRuntime.rgwMaxHP[0] = 100
    wounded.PlayerRolesRuntime.rgwHP[1] = 50
    wounded.PlayerRolesRuntime.rgwMaxHP[1] = 100
    runBattle(wounded, markerScript(0x74, [2, 0, 0]))
    expect(wounded.dwCash).toBe(222)
    const full = makeBattle({ roles: [makeRole(0), makeRole(1)] }).gs
    full.partyMembers = [0, 1]
    for (const r of [0, 1]) {
      full.PlayerRolesRuntime.rgwHP[r] = 100
      full.PlayerRolesRuntime.rgwMaxHP[r] = 100
    }
    runBattle(full, markerScript(0x74, [2, 0, 0]))
    expect(full.dwCash).toBe(333)
  })
  it('party-name branch compares the runtime role name, not the role index', () => {
    const gs = makeBattle({ roles: [makeRole(0), makeRole(1)] }).gs
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwName[1] = 1234
    runBattle(gs, markerScript(0x79, [1234, 2, 0]))
    expect(gs.dwCash).toBe(222)
    const absent = makeBattle({ roles: [makeRole(0), makeRole(1)] }).gs
    absent.partyMembers = [0, 1]
    absent.PlayerRolesRuntime.rgwName[1] = 1234
    runBattle(absent, markerScript(0x79, [4321, 2, 0]))
    expect(absent.dwCash).toBe(333)
  })
  it('object-state branch executes only the matching object path', () => {
    const match = makeBattle().gs
    match.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    runBattle(match, markerScript(0x94, [1, 2, 2]))
    expect(match.dwCash).toBe(222)
    const differ = makeBattle().gs
    differ.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    runBattle(differ, markerScript(0x94, [1, 3, 2]))
    expect(differ.dwCash).toBe(333)
  })
  it('item removal falls back to an equipped slot and removes that slot’s effect', () => {
    const gs = makeBattle({ roles: [makeRole(0), makeRole(1)] }).gs
    gs.partyMembers = [0, 1]
    gs.inventory = []
    const equipRow = gs.PlayerRolesRuntime.rgwEquipment[2]
    if (!equipRow) throw new Error('fixture requires equipment part 2')
    equipRow[1] = 42
    const effRow = gs.rgEquipmentEffect[2]?.rgwAttackStrength
    if (!effRow) throw new Error('fixture requires equipment effect part 2')
    effRow[1] = 7
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]?.[1]).toBe(42)
    expect(gs.rgEquipmentEffect[2]?.rgwAttackStrength[1]).toBe(7)
    runBattle(gs, [{ op: 'raw', opcode: 0x20, operands: [42, 1, 0] }, { op: 'end' }])
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]?.[1]).toBe(0)
    expect(gs.rgEquipmentEffect[2]?.rgwAttackStrength[1]).toBe(0)
    expect(gs.inventory).toEqual([])
  })
  it('existing no-op and unsupported opcode policies continue to the cash instruction', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const gs = makeBattle().gs
    const ret = runBattle(gs, [
      { op: 'raw', opcode: 0x78, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0xb9, operands: [1, 2, 3] },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    expect(gs.dwCash).toBe(50)
    expect(ret).toBe(0)
    expect(gs.shakeTime ?? 0).toBe(0)
    expect(debug).toHaveBeenCalledTimes(1)
    expect(debug).toHaveBeenCalledWith('event-system: skip raw opcode=0x00b9', [1, 2, 3])
  })
  it('a missing goto label throws its exact diagnostic', () => {
    const gs = makeBattle().gs
    expect(() => runBattle(gs, [{ op: 'goto', to: 'L_40' }, { op: 'end' }])).toThrow(
      'runScript: goto label L_40 不在 labelMap',
    )
  })
  it('blocking dialogue is rejected by the synchronous explore runner', () => {
    expect(() =>
      runScript({
        commands: [{ op: 'showDialog', messageIndex: 1, text: 'x' }, { op: 'end' }],
        ip: 0,
        bus: createCommandBus(),
        runtimeMode: 'explore',
      }),
    ).toThrow('runScript: showDialog in explore mode 应走 tickEventSystem')
  })
  it('unsupported structured commands each throw their own diagnostic', () => {
    const gs = makeBattle().gs
    expect(() => runBattle(gs, [{ op: 'sequence', steps: [] }])).toThrow(
      'runScript: 结构化 op sequence M3 未实现',
    )
    expect(() => runBattle(gs, [{ op: 'if', cond: { op: 'end' }, then: [] }])).toThrow(
      'runScript: 结构化 op if M3 未实现',
    )
    expect(() => runBattle(gs, [{ op: 'choice', prompt: '选', options: [] }])).toThrow(
      'runScript: 结构化 op choice M3 未实现',
    )
  })
  it('unsupported battle scene operations continue without replacing their owned state', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const gs = makeBattle().gs
    const sceneBefore = gs.wNumScene
    const paletteBefore = gs.palette
    const battleBefore = gs.battleState
    const ret = runBattle(gs, [
      { op: 'startBattle', enemyTeamId: 3 },
      { op: 'loadScene', sceneId: 5 },
      { op: 'setPalette', paletteIndex: 7 },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    expect(gs.dwCash).toBe(50)
    expect(ret).toBe(0)
    expect(gs.wNumScene).toBe(sceneBefore)
    expect(gs.palette).toBe(paletteBefore)
    expect(gs.battleState).toBe(battleBefore)
    expect(debug).toHaveBeenCalledTimes(2)
    expect(debug).toHaveBeenNthCalledWith(
      1,
      '[event-system battle] skip loadScene sceneId=5 ip=1(B 路线 stub)',
    )
    expect(debug).toHaveBeenNthCalledWith(
      2,
      '[event-system battle] skip setPalette paletteIndex=7 ip=2',
    )
  })
  it('a child call finishes before the caller halves cash and adds its suffix', () => {
    const gs = makeBattle().gs
    const ret = runBattle(gs, [
      { op: 'raw', opcode: 0x04, operands: [4, 0, 0] },
      { op: 'raw', opcode: 0x8f, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x1e, operands: [77, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x1e, operands: [33, 0, 0], label: 'L_4' },
      { op: 'end' },
    ])
    // Noncommutative oracle: floor(33 / 2) + 77 = 93; caller-first would give 110.
    expect(gs.dwCash).toBe(93)
    expect(ret).toBe(0)
  })
  it('a child call overrides the current role for a poison-kind branch', () => {
    setObjectPoisons([{ id: 7, level: 1, color: 0, playerScript: 0, enemyScript: 0 }])
    const gs = makeBattle({
      roles: Array.from({ length: 5 }, (_, i) => makeRole(i)),
      party: [4, 1],
    }).gs
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 7, wPoisonScript: 0 }
    const ret = runBattle(
      gs,
      [
        { op: 'raw', opcode: 0x04, operands: [3, 5, 0] },
        { op: 'end' },
        { op: 'end' },
        { op: 'raw', opcode: 0x5d, operands: [7, 5, 0], label: 'L_3' },
        { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
        { op: 'raw', opcode: 0x1e, operands: [222, 0, 0] },
        { op: 'end' },
      ],
      1,
    )
    expect(ret).toBe(0)
    expect(gs.dwCash).toBe(333)
  })
})
