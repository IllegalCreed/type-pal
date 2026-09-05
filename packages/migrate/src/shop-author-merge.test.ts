import { describe, expect, test } from 'vitest'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import type { MigrationJson } from './pal-migration.js'

const path = 'content/shops.json'
const snapshot = (shops: MigrationJson) => ({
  files: new Map([[path, shops]]),
  managedFiles: new Set([path]),
})
const base = snapshot([
  { id: 1, items: ['a', 'b'] },
  { id: 2, items: ['c'] },
])

describe('shop author ownership uses existing id/atomic-stock merge', () => {
  test.each(
    [
      [
        { id: 1, items: ['a', 'b'] },
        { id: 2, items: ['c'] },
        { id: 3, items: [] },
      ],
      [
        { id: 1, items: ['a', 'b'] },
        { id: 2, items: ['c'] },
        { id: 0, items: ['b', 'a', 'b'] },
      ],
      [{ id: 1, items: ['b', 'a', 'b'] }],
      [],
    ].map((shops) => ({ shops })),
  )('preserves author stock, including empty table and id0: $shops', ({ shops }) => {
    const ours = snapshot(shops as MigrationJson)
    const plan = createMigrationPlan(base, ours, base)
    expect(plan.target.get(path)).toEqual(shops)
    expect(plan.summary).toMatchObject({ writes: 0, deletes: 0, conflicts: 0 })
    const replay = createMigrationPlan(
      snapshotOf(base),
      snapshotOf({ files: plan.target, managedFiles: new Set(plan.target.keys()) }),
      base,
    )
    expect(replay.target.get(path)).toEqual(shops)
    expect(replay.summary).toMatchObject({ writes: 0, deletes: 0, conflicts: 0 })
  })
  test('different shops merge, but same-stock and delete/modify conflict', () => {
    const ours = snapshot([
      { id: 1, items: ['b', 'a', 'b'] },
      { id: 2, items: ['c'] },
    ])
    const other = snapshot([
      { id: 1, items: ['a', 'b'] },
      { id: 2, items: ['d'] },
    ])
    expect(createMigrationPlan(base, ours, other).target.get(path)).toEqual([
      { id: 1, items: ['b', 'a', 'b'] },
      { id: 2, items: ['d'] },
    ])
    const both = snapshot([
      { id: 1, items: ['z'] },
      { id: 2, items: ['c'] },
    ])
    expect(createMigrationPlan(base, ours, both).conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'value', path: '/@number:1/items' }),
      ]),
    )
    expect(
      createMigrationPlan(base, snapshot([{ id: 1, items: ['a', 'b'] }]), other).conflicts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'delete-modify', path: '/@number:2' }),
      ]),
    )
    expect(
      createMigrationPlan(
        base,
        snapshot([
          { id: 1, items: [] },
          { id: 1, items: [] },
        ]),
        base,
      ).conflicts,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'invalid-identity' })]))
    const collision = snapshot([
      { id: 1, items: ['a', 'b'] },
      { id: 2, items: ['c'] },
      { id: 3, items: ['x'] },
    ])
    const different = snapshot([
      { id: 1, items: ['a', 'b'] },
      { id: 2, items: ['c'] },
      { id: 3, items: ['y'] },
    ])
    expect(createMigrationPlan(base, collision, different).conflicts).not.toEqual([])
  })
})
