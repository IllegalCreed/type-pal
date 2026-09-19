import { fsaSource } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { simulatorLibrary } from './__tests__/battle-simulator-fixture.js'
import {
  BattleSimulatorPresetInUseError,
  deleteBattleSimulatorRecord,
  putBattleSimulatorRecord,
  SetBattleSimulatorLibraryCommand,
} from './battle-simulator-commands.js'
import {
  BATTLE_SIMULATOR_PATH,
  loadBattleSimulatorLibrary,
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from './battle-simulator-library.js'
import { EditSession } from './edit-session.js'
import { openLocalProject } from './open-local.js'
import { toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'

describe('simulator author library', () => {
  test('parser/resolver detach nested data and section overrides never change presets', () => {
    const original = simulatorLibrary()
    original.plans[0]!.config.overrides.party = {
      members: [
        { ...structuredClone(original.allies[0]!.config.members[0]!), stats: { level: 20 } },
      ],
    }
    const before = structuredClone(original)
    const resolved = resolveBattleSimulatorPlan(original, 'plan-a')
    expect(resolved.party.members[0]!.stats).toEqual({ level: 20 })
    expect(resolved.music).toEqual({ kind: 'silent' })
    resolved.party.members[0]!.equipment.weapon = 'new-weapon'
    resolved.bag.items.push({ itemId: 'herb', quantity: 7 })
    expect(original).toEqual(before)
    const parsed = parseBattleSimulatorLibrary(original)
    parsed.allies[0]!.config.members[0]!.stats.level = 100
    expect(original).toEqual(before)
  })
  test('missing preset references remain repairable but cannot be resolved, even when overridden', () => {
    const value = simulatorLibrary()
    value.plans[0]!.config.overrides.party = { members: [] }
    value.allies = []
    expect(parseBattleSimulatorLibrary(value)).toEqual(value)
    expect(() => resolveBattleSimulatorPlan(value, 'plan-a')).toThrow('我方预设不存在')
    expect(() => resolveBattleSimulatorPlan(value, 'absent')).toThrow('试打方案不存在')
  })
  test('inline plans can be used without creating named presets', () => {
    const value = simulatorLibrary(),
      plan = value.plans[0]!.config
    plan.party = { kind: 'inline', config: value.allies[0]!.config }
    plan.enemies = { kind: 'inline', config: value.enemies[0]!.config }
    plan.bag = { kind: 'inline', config: value.bags[0]!.config }
    value.allies = []
    value.enemies = []
    value.bags = []
    expect(resolveBattleSimulatorPlan(value, 'plan-a').party).toEqual(plan.party.config)
  })
  test.each([
    [
      'version',
      (v: Record<string, unknown>) => {
        v.version = 2
      },
    ],
    [
      'unknown property',
      (v: Record<string, unknown>) => {
        v.progress = {}
      },
    ],
    [
      'missing table',
      (v: Record<string, unknown>) => {
        delete v.allies
      },
    ],
    [
      'duplicate IDs',
      (v: Record<string, unknown>) => {
        v.allies = [simulatorLibrary().allies[0], simulatorLibrary().allies[0]]
      },
    ],
    [
      'sparse rows',
      (v: Record<string, unknown>) => {
        v.plans = new Array(1)
      },
    ],
  ])('rejects %s', (_, corrupt) => {
    const v = simulatorLibrary() as unknown as Record<string, unknown>
    corrupt(v)
    expect(() => parseBattleSimulatorLibrary(v)).toThrow()
  })
  test('only genuine missing files are absent; malformed data and read failures keep their path', async () => {
    const disk = memoryAuthorDirectory()
    const source = fsaSource(disk.dir)
    expect(await loadBattleSimulatorLibrary(source)).toBeUndefined()
    for (const content of ['<html>not JSON</html>', '', '{', JSON.stringify({ version: 2 })]) {
      disk.set(BATTLE_SIMULATOR_PATH, content)
      await expect(loadBattleSimulatorLibrary(source)).rejects.toThrow(BATTLE_SIMULATOR_PATH)
    }
    await expect(
      loadBattleSimulatorLibrary({
        ...source,
        readBytes: async () => {
          throw new DOMException('permission denied', 'NotAllowedError')
        },
      }),
    ).rejects.toThrow('permission denied')
    disk.set(BATTLE_SIMULATOR_PATH, simulatorLibrary())
    expect(await loadBattleSimulatorLibrary(source)).toEqual(simulatorLibrary())
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })
  test('normal project history restores exact configuration, protects aliases and retains redo on no-op', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('sim-test'))
    const opened = await openLocalProject(disk.dir)
    const state = toEditorState(
      opened.project,
      opened.scenes,
      {},
      {},
      opened.stamps,
      opened.battleSimulator,
    )
    const session = new EditSession(state)
    const input = simulatorLibrary(),
      before = structuredClone(input)
    const command = new SetBattleSimulatorLibraryCommand(input)
    input.plans[0]!.name = 'later mutation'
    expect(session.dispatch(command)).toBe(true)
    expect(session.getState().battleSimulator).toEqual(before)
    expect(session.isDirty()).toBe(true)
    expect(state.battleSimulator).toBeUndefined()
    expect(session.undo()).toBe(true)
    expect(session.getState().battleSimulator).toBeUndefined()
    expect(
      session.dispatch(
        new SetBattleSimulatorLibraryCommand({
          ...before,
          allies: [],
          enemies: [],
          bags: [],
          plans: [],
        }),
      ),
    ).toBe(false)
    expect(session.redo()).toBe(true)
    expect(session.getState().battleSimulator).toEqual(before)
    const modified = putBattleSimulatorRecord(before, 'plans', {
      ...before.plans[0]!,
      name: 'Renamed',
    })
    session.dispatch(new SetBattleSimulatorLibraryCommand(modified))
    const actualAfter = session.getState(),
      snapshot = structuredClone(actualAfter)
    expect(session.undo()).toBe(true)
    expect(actualAfter).toEqual(snapshot)
    expect(session.getState().battleSimulator).toEqual(before)
    expect(session.redo()).toBe(true)
    expect(session.getState().battleSimulator).toEqual(modified)
  })
  test('deletion confirmation names exact affected plans and preserves dangling references for undo/repair', () => {
    const input = simulatorLibrary(),
      before = structuredClone(input)
    expect(() => deleteBattleSimulatorRecord(input, 'allies', 'party-a')).toThrow(
      BattleSimulatorPresetInUseError,
    )
    const removed = deleteBattleSimulatorRecord(input, 'allies', 'party-a', ['plan-a'])
    expect(removed.allies).toEqual([])
    expect(removed.plans).toEqual(before.plans)
    expect(input).toEqual(before)
    const expanded = putBattleSimulatorRecord(input, 'plans', { ...input.plans[0]!, id: 'plan-b' })
    expect(() => deleteBattleSimulatorRecord(expanded, 'allies', 'party-a', ['plan-a'])).toThrow(
      '2个',
    )
    expect(() => deleteBattleSimulatorRecord(input, 'allies', 'missing')).toThrow('不存在')
  })
})
