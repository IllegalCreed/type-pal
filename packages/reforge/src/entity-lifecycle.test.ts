import { describe, expect, test } from 'vitest'
import {
  advanceEntityLifecycleWorldStep,
  applyEntityLifecycleMutation,
  deriveEntityLifecycleGates,
  footAnchorOutsideReappearRect,
  restoreAwaitingExitIfOutside,
  tickEntityLifecycles,
} from './entity-lifecycle.js'

const target = { scene: 's001', entity: 'e001' }

describe('entity lifecycle reducer and derived gates', () => {
  test('suspend keeps visibility/manual interaction but gates touch/auto/hostile', () => {
    expect(
      deriveEntityLifecycleGates({
        staticCollide: true,
        lifecycle: { phase: 'suspended', remainingTicks: 15 },
        hasTrigger: true,
        triggerKind: 'manual',
        hasAuto: true,
        hasHostile: true,
      }),
    ).toEqual({
      visible: true,
      collidable: true,
      manualInteractable: true,
      touchTriggerable: false,
      autoAllowed: false,
      hostileAllowed: false,
    })
  })

  test('hidden/removed states gate every consumer and entityState remains a separate input', () => {
    for (const lifecycle of [
      { phase: 'despawned', remainingTicks: 1 },
      { phase: 'awaitingExit' },
      { phase: 'removed' },
    ] as const) {
      expect(
        deriveEntityLifecycleGates({
          entityState: 2,
          staticCollide: true,
          lifecycle,
          hasTrigger: true,
          triggerKind: 'touch',
          hasAuto: true,
          hasHostile: true,
        }),
      ).toEqual({
        visible: false,
        collidable: false,
        manualInteractable: false,
        touchTriggerable: false,
        autoAllowed: false,
        hostileAllowed: false,
      })
    }
    expect(
      deriveEntityLifecycleGates({ staticHidden: false, staticCollide: false, entityState: 0 }),
    ).toMatchObject({ visible: false, collidable: false })
  })

  test('mutations are immutable and restore removes the scene container', () => {
    const source = {}
    const hidden = applyEntityLifecycleMutation(source, { ...target, kind: 'hideEntity', ticks: 2 })
    expect(source).toEqual({})
    expect(hidden).toEqual({ s001: { e001: { phase: 'despawned', remainingTicks: 2 } } })
    const restored = applyEntityLifecycleMutation(hidden, { ...target, kind: 'restoreEntity' })
    expect(restored).toEqual({})
    expect(() => applyEntityLifecycleMutation({}, { ...target, kind: 'suspendEntity', ticks: 0 })).toThrow(
      /正安全整数/,
    )
  })

  test('explicit entityState overrides a static hidden/collision definition before lifecycle gates', () => {
    expect(
      deriveEntityLifecycleGates({
        staticHidden: true,
        staticCollide: true,
        entityState: 1,
      }),
    ).toMatchObject({ visible: true, collidable: false })
    expect(
      deriveEntityLifecycleGates({
        staticHidden: true,
        staticCollide: false,
        entityState: 2,
        lifecycle: { phase: 'suspended', remainingTicks: 2 },
      }),
    ).toMatchObject({ visible: true, collidable: true, autoAllowed: false })
  })

  test('eligible ticks freeze, decrement, and transition hide to awaitingExit', () => {
    const table = {
      s001: {
        e001: { phase: 'suspended' as const, remainingTicks: 2 },
        e002: { phase: 'despawned' as const, remainingTicks: 1 },
        e003: { phase: 'removed' as const },
      },
      s002: { e004: { phase: 'suspended' as const, remainingTicks: 1 } },
    }
    expect(tickEntityLifecycles(table, { currentScene: 's001', eligible: false })).toEqual({
      table,
      changed: false,
    })
    const first = tickEntityLifecycles(table, { currentScene: 's001', eligible: true })
    expect(first.table.s001).toEqual({
      e001: { phase: 'suspended', remainingTicks: 1 },
      e002: { phase: 'awaitingExit' },
      e003: { phase: 'removed' },
    })
    const second = tickEntityLifecycles(first.table, { currentScene: 's001', eligible: true })
    // awaitingExit persists until the foot-anchor crosses the off-screen gate;
    // a world tick alone must not restore or delete it.
    expect(second.table.s001).toEqual({
      e002: { phase: 'awaitingExit' },
      e003: { phase: 'removed' },
    })
    expect(second.table.s002).toEqual(table.s002)
  })

  test('foot-anchor boundary includes 0/320 and restores only outside', () => {
    expect(footAnchorOutsideReappearRect({ x: 0, y: 320 })).toBe(false)
    expect(footAnchorOutsideReappearRect({ x: -1, y: 0 })).toBe(true)
    expect(footAnchorOutsideReappearRect({ x: 321, y: 0 })).toBe(true)
    const table = { s001: { e001: { phase: 'awaitingExit' as const } } }
    expect(restoreAwaitingExitIfOutside(table, 's001', 'e001', { x: 320, y: 0 })).toEqual(table)
    expect(restoreAwaitingExitIfOutside(table, 's001', 'e001', { x: 321, y: 0 })).toEqual({})
  })

  test('awaitingExit reappears on the first eligible return tick and reports a frame reset', () => {
    const table = {
      s001: { waiting: { phase: 'awaitingExit' as const } },
      s002: { frozen: { phase: 'suspended' as const, remainingTicks: 2 } },
    }
    expect(
      advanceEntityLifecycleWorldStep(table, {
        currentScene: 's001',
        eligible: false,
        footAnchors: { waiting: { x: 321, y: 0 } },
      }),
    ).toEqual({ table, changed: false, reappearedEntities: [] })

    const returned = advanceEntityLifecycleWorldStep(table, {
      currentScene: 's001',
      eligible: true,
      footAnchors: { waiting: { x: 321, y: 0 } },
    })
    expect(returned).toEqual({
      table: { s002: table.s002 },
      changed: true,
      reappearedEntities: ['waiting'],
    })
  })

  test('despawn final countdown and off-screen restore occupy separate eligible ticks', () => {
    const table = {
      s001: { enemy: { phase: 'despawned' as const, remainingTicks: 1 } },
    }
    const countdown = advanceEntityLifecycleWorldStep(table, {
      currentScene: 's001',
      eligible: true,
      footAnchors: { enemy: { x: -1, y: 0 } },
    })
    expect(countdown).toEqual({
      table: { s001: { enemy: { phase: 'awaitingExit' } } },
      changed: true,
      reappearedEntities: [],
    })

    const restored = advanceEntityLifecycleWorldStep(countdown.table, {
      currentScene: 's001',
      eligible: true,
      footAnchors: { enemy: { x: -1, y: 0 } },
    })
    expect(restored).toEqual({ table: {}, changed: true, reappearedEntities: ['enemy'] })
  })
})
