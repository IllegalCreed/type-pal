import { describe, expect, test } from 'vitest'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })

describe('gait and action pose ownership', () => {
  test('gait and explicit animation share the source current-frame phase', () => {
    const motion = new WorldMotionRuntime(100)
    motion.advanceCadence(100, false)
    motion.advanceExplicitAnimation('npc')
    expect(motion.explicitAnimation('npc')).toBe(1)
    motion.markGait('npc', 'auto', 7)
    expect(motion.explicitAnimation('npc')).toBeUndefined()
    expect(motion.gaitPhase('npc')).toBe(2)
    expect(motion.lastMovedWorldTick('npc')).toBe(1)
    motion.clearGait('npc', { source: 'auto', epoch: 8 })
    expect(motion.hasGait('npc')).toBe(true)
    motion.clearGait('npc', { source: 'auto', epoch: 7 })
    expect(motion.hasGait('npc')).toBe(false)
  })

  test('a fixed source frame seeds the next animation and step phase', () => {
    const motion = new WorldMotionRuntime(100)
    motion.setExplicitAnimation('npc', 0)
    expect(motion.explicitAnimation('npc')).toBe(0)
    motion.advanceExplicitAnimation('npc')
    expect(motion.explicitAnimation('npc')).toBe(1)
    motion.markGait('npc', 'script', 1)
    expect(motion.gaitPhase('npc')).toBe(2)
    motion.advanceExplicitAnimation('npc')
    expect(motion.explicitAnimation('npc')).toBe(3)
    expect(motion.gaitPhase('npc')).toBeUndefined()
  })

  test.each([
    'continue',
    'release-all',
    'next-tick',
    'presented',
    'pose',
    'explicit-animation',
    'owner-replaced',
    'relocated',
    'retaken',
    'endpoint',
  ] as const)('a foreground arrival hands its exact gait only to a same-frame live continuation: %s', async (boundary) => {
    const motion = new WorldMotionRuntime(100)
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    motion.advanceCadence(100, false)
    for (let step = 0; step < 10; step++) motion.markGait('npc', 'script', 1)
    motion.rememberScriptGaitHandoff('npc', pos(4), motion.currentSceneSessionId('a'), {
      ownerId: 'npc',
      epoch: 5,
    })
    expect(motion.captureEntity('npc')).toEqual({})
    if (boundary === 'release-all') motion.coordinator.releaseAllAuthority()
    else motion.coordinator.releaseAuthority('npc')
    if (boundary === 'next-tick') motion.advanceCadence(100, false)
    if (boundary === 'presented') motion.clearScriptGaitHandoffs()
    if (boundary === 'pose') motion.clearScriptGaitHandoffs('npc')
    if (boundary === 'explicit-animation') motion.advanceExplicitAnimation('npc')
    if (boundary === 'retaken') {
      motion.coordinator.setAuthority('npc', { kind: 'script' })
      motion.coordinator.releaseAuthority('npc')
    }
    const pending = motion.registerMove({
      source: 'auto',
      id: 'npc',
      to: pos(boundary === 'endpoint' ? 4 : 5),
      speed: 'normal',
      sceneId: 'a',
      activation: { ownerId: 'npc', epoch: boundary === 'owner-replaced' ? 6 : 5 },
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    if (slot?.kind !== 'move') throw new Error('missing live move')
    motion.adoptScriptGaitHandoff('npc', pos(boundary === 'relocated' ? 3 : 4), slot)
    const continued = boundary === 'continue' || boundary === 'release-all'
    expect(motion.gaitPhase('npc')).toBe(continued ? 11 : undefined)
    if (boundary === 'explicit-animation') expect(motion.explicitAnimation('npc')).toBe(1)
    motion.markGait('npc', 'auto', slot.commandEpoch)
    expect(motion.explicitAnimation('npc')).toBeUndefined()
    expect(motion.gaitPhase('npc')).toBe(continued ? 12 : boundary === 'explicit-animation' ? 2 : 1)
    slot.resolve()
    await pending
  })
})
