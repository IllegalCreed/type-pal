/** W2-B: nonempty preset confirmation sets, actual immutable inputs and real editor state. */

import { loadCurrentProjectFrom, type TrialBag } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { simulatorLibrary } from './__tests__/battle-simulator-fixture.js'
import { battleTrialProjectFiles, fixtureSource } from './__tests__/battle-trial-project.js'
import {
  BattleSimulatorPresetInUseError,
  battleSimulatorDependentPlans,
  deleteBattleSimulatorRecord,
  putBattleSimulatorRecord,
  SetBattleSimulatorLibraryCommand,
} from './battle-simulator-commands.js'
import {
  emptyBattleSimulatorLibrary,
  parseBattleSimulatorLibrary,
  type TrialPreset,
} from './battle-simulator-library.js'
import { toEditorState } from './project-io.js'

const bag = (id: string, name = id): TrialPreset<TrialBag> => ({
  id,
  name,
  description: '',
  config: { items: [{ itemId: 'herb', quantity: 2 }] },
})
function library() {
  const value = simulatorLibrary()
  value.bags = [bag('bag-1')]
  const original = value.plans[0]!
  value.plans = ['plan-1', 'plan-2'].map((id) => ({
    ...structuredClone(original),
    id,
    config: { ...structuredClone(original.config), bag: { kind: 'preset', presetId: 'bag-1' } },
  }))
  return parseBattleSimulatorLibrary(value)
}
test('put inserts and replaces by stable ID without changing ordering or input content', () => {
  const empty = emptyBattleSimulatorLibrary(),
    one = putBattleSimulatorRecord(empty, 'bags', bag('b1'))
  const two = putBattleSimulatorRecord(one, 'bags', bag('b2')),
    before = structuredClone(two)
  const replacement = bag('b1', 'Replacement')
  const result = putBattleSimulatorRecord(two, 'bags', replacement)
  expect(result.bags).toEqual([replacement, bag('b2')])
  expect(two).toEqual(before)
  expect(empty.bags).toEqual([])
  expect(one.bags).toEqual([bag('b1')])
})
test('dependency lookup distinguishes plan records and all three preset source domains', () => {
  const value = library(),
    before = structuredClone(value)
  expect(battleSimulatorDependentPlans(value, 'plans', 'plan-1')).toEqual([])
  expect(battleSimulatorDependentPlans(value, 'bags', 'bag-1')).toEqual(['plan-1', 'plan-2'])
  expect(battleSimulatorDependentPlans(value, 'allies', 'party-a')).toEqual(['plan-1', 'plan-2'])
  expect(battleSimulatorDependentPlans(value, 'enemies', 'enemy-a')).toEqual(['plan-1', 'plan-2'])
  expect(value).toEqual(before)
})
test('missing preset rejects and an independent preset deletes without touching any plan', () => {
  const value = library(),
    before = structuredClone(value)
  expect(() => deleteBattleSimulatorRecord(value, 'bags', 'missing')).toThrow('预设不存在：missing')
  const free = putBattleSimulatorRecord(value, 'bags', bag('free'))
  expect(deleteBattleSimulatorRecord(free, 'bags', 'free', [])).toEqual(value)
  expect(value).toEqual(before)
})
test.each([
  { label: 'empty', confirmed: [] },
  { label: 'partial', confirmed: ['plan-1'] },
  { label: 'stale', confirmed: ['plan-1', 'stale-plan'] },
])('incomplete or stale confirmation $label rejects with exact dependencies and preserves input', ({
  confirmed,
}) => {
  const value = library(),
    before = structuredClone(value)
  let caught: unknown
  try {
    deleteBattleSimulatorRecord(value, 'bags', 'bag-1', confirmed)
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(BattleSimulatorPresetInUseError)
  expect((caught as BattleSimulatorPresetInUseError).planIds).toEqual(['plan-1', 'plan-2'])
  expect(value).toEqual(before)
})
test('complete confirmation is order-independent and preserves full dangling plans for later repair', () => {
  const value = library(),
    before = structuredClone(value)
  expect(deleteBattleSimulatorRecord(value, 'bags', 'bag-1', ['plan-2', 'plan-1'])).toEqual({
    ...before,
    bags: [],
  })
  expect(value).toEqual(before)
})
test('library command apply, undo and redo preserve all other actual editor state', async () => {
  const project = await loadCurrentProjectFrom(fixtureSource(await battleTrialProjectFiles()))
  const input = toEditorState(project, [project.authorContent.entryScene], {}, {}, [])
  const before = structuredClone(input),
    value = library(),
    beforeLibrary = structuredClone(value)
  const command = new SetBattleSimulatorLibraryCommand(value)
  expect(() => command.invert(input)).toThrow('尚未执行')
  const applied = command.apply(input)
  expect(applied).toEqual({ ...before, battleSimulator: value })
  const restored = command.invert(applied)
  expect(restored).toEqual(before)
  expect(command.apply(restored)).toEqual(applied)
  expect(input).toEqual(before)
  expect(value).toEqual(beforeLibrary)
})
