import { describe, expect, test, vi } from 'vitest'
import {
  type CoordinatedMotionSlot,
  MotionRuntimeCoordinator,
} from './motion-runtime-coordinator.js'

type Authority = { kind: 'script' } | { kind: 'mount'; parent: string }

function slot(overrides: Partial<CoordinatedMotionSlot> = {}) {
  const cancel = vi.fn<(message: string) => void>()
  const dropByAuthority = vi.fn<() => void>()
  return {
    source: 'auto',
    kind: 'move',
    commandEpoch: 1,
    sceneSessionId: 's001:1',
    activationOwnerId: 'owner',
    activationEpoch: 7,
    ...overrides,
    cancel,
    dropByAuthority,
  } satisfies CoordinatedMotionSlot
}

describe('production motion runtime coordinator', () => {
  test('take/release pauses an auto move without cancelling its independent slot', () => {
    const changed = vi.fn()
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>(changed)
    const move = slot()
    runtime.autoSlots.set('npc', move)

    runtime.setAuthority('npc', { kind: 'script' })
    expect(runtime.authority.has('npc')).toBe(true)
    expect(runtime.autoSlots.get('npc')).toBe(move)
    expect(move.cancel).not.toHaveBeenCalled()

    runtime.releaseAuthority('npc')
    expect(runtime.authority.has('npc')).toBe(false)
    expect(runtime.autoSlots.get('npc')).toBe(move)
    expect(runtime.epoch('npc')).toBe(2)
    expect(changed).toHaveBeenCalledTimes(2)
  })

  test.each([
    'step',
    'chase',
  ] as const)('%s registered before a complete take/release ABA is dropped at precommit', (kind) => {
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>()
    const oneShot = slot({
      kind,
      authorityEpochAtEnqueue: runtime.epoch('npc'),
    })
    runtime.autoSlots.set('npc', oneShot)
    runtime.setAuthority('npc', { kind: 'script' })
    runtime.releaseAuthority('npc')

    expect(runtime.authority.has('npc')).toBe(false)
    expect(runtime.shouldDropAutoOneShot('npc', oneShot)).toBe(true)
  })

  test('a lifecycle-hidden cross-target owner restarts only after the effective gate opens', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>()
    runtime.rememberHiddenTargetOwner('target', 'owner-b')
    runtime.rememberHiddenTargetOwner('target', 'owner-a')

    expect(runtime.takeHiddenTargetRestartOwners('target', false)).toEqual([])
    expect(runtime.takeHiddenTargetRestartOwners('target', true)).toEqual(['owner-a', 'owner-b'])
    expect(runtime.takeHiddenTargetRestartOwners('target', true)).toEqual([])
  })

  test('a lifecycle-hidden own target survives an intervening suspension until the effective gate opens', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>()
    runtime.rememberLifecycleHiddenAutoTarget('target')

    expect(runtime.pendingLifecycleRestartTargetIds()).toEqual(['target'])
    expect(runtime.takeLifecycleHiddenAutoTarget('target', false)).toBe(false)
    expect(runtime.pendingLifecycleRestartTargetIds()).toEqual(['target'])
    expect(runtime.takeLifecycleHiddenAutoTarget('target', true)).toBe(true)
    expect(runtime.pendingLifecycleRestartTargetIds()).toEqual([])
  })

  test('a committed cross-target endpoint retains owner lineage until its queued wake-up', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>()
    const move = slot({ activationOwnerId: 'owner-a', commandEpoch: 12 })
    runtime.autoSlots.set('target', move)

    runtime.rememberCommittedAutoContinuation('target', move)
    runtime.autoSlots.delete('target')
    expect(runtime.autoLineagesForTarget('target')).toEqual([
      expect.objectContaining({ activationOwnerId: 'owner-a', activationEpoch: 7 }),
    ])

    runtime.rememberHiddenTargetOwner('target', 'owner-a')
    runtime.forgetCommittedAutoContinuation('target', 12)
    expect(runtime.autoLineagesForTarget('target')).toEqual([])
    expect(runtime.takeHiddenTargetRestartOwners('target', true)).toEqual(['owner-a'])
  })

  test('a stale committed lineage does not identify a replacement activation by owner alone', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>()
    const oldMove = slot({ activationOwnerId: 'owner-a', activationEpoch: 7, commandEpoch: 12 })
    runtime.rememberCommittedAutoContinuation('target', oldMove)

    const [lineage] = runtime.autoLineagesForTarget('target')
    expect(lineage?.activationEpoch).toBe(7)
    expect(lineage?.activationEpoch).not.toBe(8)
    expect(runtime.activeAutoLineagesForTarget('target', () => 8)).toEqual([])
  })

  test('slot validation uses the same scene and activation identities as production commit', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>()
    const move = slot()
    expect(runtime.slotInvalidReason(move, 's001:1', () => 7)).toBeUndefined()
    expect(runtime.slotInvalidReason(move, 's002:1', () => 7)).toBe('sceneSession')
    expect(runtime.slotInvalidReason(move, 's001:1', () => 8)).toBe('activation')
  })

  test('scene teardown cancels both source slots, clears authority/dependencies and changes session', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, CoordinatedMotionSlot>()
    const script = slot({
      source: 'script',
      activationOwnerId: undefined,
      activationEpoch: undefined,
    })
    const auto = slot()
    runtime.scriptSlots.set('scripted', script)
    runtime.autoSlots.set('auto', auto)
    runtime.setAuthority('scripted', { kind: 'script' })
    runtime.rememberHiddenTargetOwner('target', 'owner')
    const before = runtime.currentSceneSessionId('s001')

    runtime.cancelAllSlots((source, actor) => `${source}:${actor}`)
    runtime.releaseAllAuthority()
    runtime.clearHiddenTargetRestarts()
    runtime.invalidateSceneSession()

    expect(script.cancel).toHaveBeenCalledWith('script:scripted')
    expect(auto.cancel).toHaveBeenCalledWith('auto:auto')
    expect(runtime.scriptSlots.size).toBe(0)
    expect(runtime.autoSlots.size).toBe(0)
    expect(runtime.authority.size).toBe(0)
    expect(runtime.takeHiddenTargetRestartOwners('target', true)).toEqual([])
    expect(runtime.currentSceneSessionId('s001')).not.toBe(before)
  })
})
