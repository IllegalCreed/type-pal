import {
  buildEntityLifecycleReferenceIndexV13,
  type WorldStateV13,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyWorldEntityLifecycleCommandV13,
  commitWorldEntityLifecycleCommandV13,
  reduceEntityLifecycleCommandV13,
} from './entity-lifecycle-command.js'

const references = buildEntityLifecycleReferenceIndexV13([
  { id: 's001', entities: [{ id: 'e001' }] },
  { id: 's002', entities: [{ id: 'e002' }] },
])

const world: WorldStateV13 = {
  party: [],
  money: 0,
  learnedSkills: {},
  inventory: [],
  script: {
    flags: {},
    vars: {},
    entityState: { s001: { e001: 2 } },
    behaviors: {},
  },
}

describe('v13 lifecycle command adapter', () => {
  test('writes a non-current scene without touching script/entityState', () => {
    const next = applyWorldEntityLifecycleCommandV13(
      world,
      { kind: 'suspendEntity', target: { scene: 's002', entity: 'e002' }, ticks: 15 },
      references,
    )
    expect(next.entityLifecycles).toEqual({ s002: { e002: { phase: 'suspended', remainingTicks: 15 } } })
    expect(next.script).toEqual(world.script)
    expect(next).not.toBe(world)
    expect(world.entityLifecycles).toBeUndefined()
  })

  test('supports all four leaves through one reducer boundary', () => {
    let table = reduceEntityLifecycleCommandV13(
      undefined,
      { kind: 'hideEntity', target: { scene: 's001', entity: 'e001' }, ticks: 2 },
      references,
    )
    expect(table.s001?.e001).toEqual({ phase: 'despawned', remainingTicks: 2 })
    table = reduceEntityLifecycleCommandV13(
      table,
      { kind: 'restoreEntity', target: { scene: 's001', entity: 'e001' } },
      references,
    )
    expect(table).toEqual({})
    table = reduceEntityLifecycleCommandV13(
      table,
      { kind: 'removeEntity', target: { scene: 's001', entity: 'e001' } },
      references,
    )
    expect(table.s001?.e001).toEqual({ phase: 'removed' })
  })

  test('manual restore emits the only explicit frame-reset notification', () => {
    const hidden: WorldStateV13 = {
      ...structuredClone(world),
      entityLifecycles: {
        s001: { e001: { phase: 'awaitingExit' } },
      },
    }
    const restored = commitWorldEntityLifecycleCommandV13(
      hidden,
      { kind: 'restoreEntity', target: { scene: 's001', entity: 'e001' } },
      references,
    )
    expect(restored.world.entityLifecycles).toEqual({})
    expect(restored.resetFrameTarget).toEqual({ scene: 's001', entity: 'e001' })

    const removed = commitWorldEntityLifecycleCommandV13(
      world,
      { kind: 'removeEntity', target: { scene: 's001', entity: 'e001' } },
      references,
    )
    expect(removed.resetFrameTarget).toBeUndefined()
  })

  test.each([
    { scene: 'missing', entity: 'e001' },
    { scene: 's001', entity: 'missing' },
  ])('rejects unknown target before writing: %o', (target) => {
    expect(() =>
      reduceEntityLifecycleCommandV13(
        {},
        { kind: 'removeEntity', target },
        references,
      ),
    ).toThrow(/未知/)
  })
})
