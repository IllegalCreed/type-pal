import {
  buildEntityLifecycleReferenceIndex,
  type WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyWorldEntityEntityLifecycleCommand,
  commitWorldEntityEntityLifecycleCommand,
  reduceEntityEntityLifecycleCommand,
} from './entity-lifecycle-command.js'

const references = buildEntityLifecycleReferenceIndex([
  { id: 's001', entities: [{ id: 'e001' }] },
  { id: 's002', entities: [{ id: 'e002' }] },
])

const world: WorldState = {
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

describe('current lifecycle command adapter', () => {
  test('writes a non-current scene without touching script/entityState', () => {
    const next = applyWorldEntityEntityLifecycleCommand(
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
    let table = reduceEntityEntityLifecycleCommand(
      undefined,
      { kind: 'hideEntity', target: { scene: 's001', entity: 'e001' }, ticks: 2 },
      references,
    )
    expect(table.s001?.e001).toEqual({ phase: 'despawned', remainingTicks: 2 })
    table = reduceEntityEntityLifecycleCommand(
      table,
      { kind: 'restoreEntity', target: { scene: 's001', entity: 'e001' } },
      references,
    )
    expect(table).toEqual({})
    table = reduceEntityEntityLifecycleCommand(
      table,
      { kind: 'removeEntity', target: { scene: 's001', entity: 'e001' } },
      references,
    )
    expect(table.s001?.e001).toEqual({ phase: 'removed' })
  })

  test('manual restore emits the only explicit frame-reset notification', () => {
    const hidden: WorldState = {
      ...structuredClone(world),
      entityLifecycles: {
        s001: { e001: { phase: 'awaitingExit' } },
      },
    }
    const restored = commitWorldEntityEntityLifecycleCommand(
      hidden,
      { kind: 'restoreEntity', target: { scene: 's001', entity: 'e001' } },
      references,
    )
    expect(restored.world.entityLifecycles).toEqual({})
    expect(restored.resetFrameTarget).toEqual({ scene: 's001', entity: 'e001' })

    const removed = commitWorldEntityEntityLifecycleCommand(
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
      reduceEntityEntityLifecycleCommand(
        {},
        { kind: 'removeEntity', target },
        references,
      ),
    ).toThrow(/未知/)
  })
})
