import { describe, expect, test, vi } from 'vitest'
import type { MotionIntent, MotionOutcome } from './entity-motion.js'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })

describe('WorldMotionRuntime ownership', () => {
  test('owns the one-tick cadence, carry remainder and frozen-frame reset', () => {
    const motion = new WorldMotionRuntime(100)
    expect(motion.advanceCadence(60, false)).toBe(false)
    expect(motion.worldTick).toBe(0)
    expect(motion.advanceCadence(50, false)).toBe(true)
    expect(motion.worldTick).toBe(1)
    expect(motion.worldTicksThisFrame).toBe(1)
    expect(motion.advanceCadence(1000, true)).toBe(false)
    expect(motion.worldTicksThisFrame).toBe(0)
    expect(motion.advanceCadence(89, false)).toBe(false)
    expect(motion.advanceCadence(1, false)).toBe(true)
    expect(motion.worldTick).toBe(2)
    motion.resetCadence()
    expect(motion.advanceCadence(99, false)).toBe(false)
  })

  test('party move replacement wakes the old waiter while abort rejects only the current waiter', async () => {
    const motion = new WorldMotionRuntime(100)
    const firstSignal = new AbortController()
    const first = motion.schedulePartyMove(pos(3), 'slow', firstSignal.signal)
    const secondSignal = new AbortController()
    const second = motion.schedulePartyMove(pos(7), 'fast', secondSignal.signal)
    await first
    expect(motion.partyMove).toMatchObject({ to: pos(7), speed: 'fast' })

    secondSignal.abort()
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    expect(motion.partyMove).toBeNull()
    firstSignal.abort()
  })

  test('party endpoint completion detaches the abort listener before waking its waiter', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const detach = vi.spyOn(controller.signal, 'removeEventListener')
    const done = motion.schedulePartyMove(pos(2), 'normal', controller.signal)
    const slot = motion.partyMove
    expect(slot).not.toBeNull()
    motion.completePartyMove(slot!)
    await done
    expect(motion.partyMove).toBeNull()
    expect(detach).toHaveBeenCalledOnce()
    controller.abort()
  })

  test('script and auto durable slots coexist and commit before their deferred wake-up', async () => {
    const motion = new WorldMotionRuntime(100)
    const script = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(2),
      speed: 'normal',
      sceneId: 'a',
    })
    const auto = motion.registerMove({
      source: 'auto',
      id: 'npc',
      to: pos(3),
      speed: 'fast',
      sceneId: 'a',
      activation: { ownerId: 'owner', epoch: 5 },
    })
    const scriptSlot = motion.coordinator.scriptSlots.get('npc')
    const autoSlot = motion.coordinator.autoSlots.get('npc')
    expect(scriptSlot?.kind).toBe('move')
    expect(autoSlot?.kind).toBe('move')
    if (scriptSlot?.kind !== 'move' || autoSlot?.kind !== 'move') throw new Error('missing slots')

    scriptSlot.commitSettlement()
    autoSlot.commitSettlement()
    expect(motion.coordinator.scriptSlots.has('npc')).toBe(false)
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
    scriptSlot.cancel('late replacement')
    autoSlot.cancel('late lifecycle')
    scriptSlot.resolve()
    autoSlot.resolve()
    expect(await script).toBe(scriptSlot.commandEpoch)
    expect(await auto).toBe(autoSlot.commandEpoch)
  })

  test('auto one-shot registration samples authority and activation identities once', async () => {
    const motion = new WorldMotionRuntime(100)
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    await expect(
      motion.registerAutoStep({
        id: 'npc',
        dir: 'left',
        sceneId: 'a',
        signal: new AbortController().signal,
        activation: { ownerId: 'owner', epoch: 4 },
      }),
    ).resolves.toEqual({ outcome: 'droppedByAuthority' })

    motion.coordinator.releaseAuthority('npc')
    const pending = motion.registerAutoStep({
      id: 'npc',
      dir: 'right',
      sceneId: 'a',
      signal: new AbortController().signal,
      activation: { ownerId: 'owner', epoch: 4 },
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    expect(slot).toMatchObject({
      kind: 'step',
      activationOwnerId: 'owner',
      activationEpoch: 4,
      authorityEpochAtEnqueue: 2,
    })
    slot?.resolve()
    await expect(pending).resolves.toMatchObject({ outcome: 'attempted' })
    expect(motion.coordinator.autoLineagesForTarget('npc')).toHaveLength(1)
  })

  test('chase registration publishes its exact slot and cancellation callback before rejection', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const registered = vi.fn()
    const cancelled = vi.fn()
    const dropped = vi.fn()
    const pending = motion.registerChase({
      source: 'auto',
      id: 'npc',
      range: 8,
      floating: false,
      sceneId: 'a',
      signal: controller.signal,
      activation: { ownerId: 'owner', epoch: 3 },
      onRegistered: registered,
      onDropped: dropped,
      onCancelled: cancelled,
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    expect(registered).toHaveBeenCalledWith(slot)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelled).toHaveBeenCalledWith(slot)
    expect(dropped).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
  })

  test('gait and explicit animation have one owner with expected-epoch clearing', () => {
    const motion = new WorldMotionRuntime(100)
    motion.advanceCadence(100, false)
    motion.advanceExplicitAnimation('npc')
    expect(motion.explicitAnimation('npc')).toBe(1)
    motion.markGait('npc', 'auto', 7)
    expect(motion.explicitAnimation('npc')).toBeUndefined()
    expect(motion.gaitPhase('npc')).toBe(1)
    expect(motion.lastMovedWorldTick('npc')).toBe(1)
    motion.clearGait('npc', { source: 'auto', epoch: 8 })
    expect(motion.hasGait('npc')).toBe(true)
    motion.clearGait('npc', { source: 'auto', epoch: 7 })
    expect(motion.hasGait('npc')).toBe(false)
  })

  test('player direction and authority changes share the side-stick epoch owner', () => {
    const motion = new WorldMotionRuntime(100)
    expect(motion.setPlayerDirection('up')).toBe(2)
    expect(motion.setPlayerDirection('up')).toBe(2)
    motion.coordinator.setAuthority('party', { kind: 'script' })
    expect(motion.setPlayerDirection('up')).toBe(3)
    motion.coordinator.releaseAuthority('party')
    expect(motion.setPlayerDirection(null)).toBe(5)
  })

  test('trace capture owns cloning, stable order and explicit clearing', () => {
    const motion = new WorldMotionRuntime(100)
    motion.advanceCadence(100, false)
    const intents: MotionIntent[] = [
      {
        actor: { kind: 'entity', id: 'z' },
        source: 'auto',
        collision: 'dynamic',
        from: pos(0),
        desired: pos(1),
        desiredFacing: 'right',
        floating: false,
        epoch: 1,
        quantum: 1,
        allowSidestep: true,
      },
    ]
    const outcomes: MotionOutcome[] = [
      {
        kind: 'moved',
        actor: { kind: 'entity', id: 'z' },
        from: pos(0),
        to: pos(1),
        facing: 'right',
        actualDirection: 'right',
      },
    ]
    motion.recordTrace(true, 'a', intents, outcomes)
    const first = motion.dumpTrace()
    first[0]!.to.col = 99
    expect(motion.dumpTrace()).toEqual([
      expect.objectContaining({ scene: 'a', worldTick: 1, actor: '1:z', to: pos(1) }),
    ])
    motion.clearTrace()
    expect(motion.dumpTrace()).toEqual([])
  })

  test('scene teardown cancels both registries, releases authority and clears visual motion', async () => {
    const motion = new WorldMotionRuntime(100)
    const pending = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(4),
      speed: 'normal',
      sceneId: 'a',
    })
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    motion.markGait('npc', 'script', 1)
    motion.advanceExplicitAnimation('other')
    const before = motion.currentSceneSessionId('a')
    motion.teardownScene({
      beforeCancelSlots: vi.fn(),
      beforeReleaseAllAuthority: vi.fn(),
      slotMessage: (source, actorId) => `${source}:${actorId}`,
    })
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(motion.coordinator.authority.size).toBe(0)
    expect(motion.hasGait('npc')).toBe(false)
    expect(motion.hasExplicitAnimation('other')).toBe(false)
    expect(motion.currentSceneSessionId('a')).not.toBe(before)
  })
})
