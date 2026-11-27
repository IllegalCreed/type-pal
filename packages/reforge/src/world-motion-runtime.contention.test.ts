import { describe, expect, test, vi } from 'vitest'
import type { MotionActor, MotionIntent, MotionSnapshotActor, SideStick } from './entity-motion.js'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })
const actor = (id: string): MotionActor => ({ kind: 'entity', id })
const snapshot = (id: string): MotionSnapshotActor => ({
  actor: actor(id),
  pos: pos(id === 'new' ? 3 : 1),
  facing: 'right',
  footprints: [{ dcol: 0, drow: 0 }],
  hasBody: true,
  yieldable: true,
})

function intent(id: string, from = pos(0), desired = pos(1)): MotionIntent {
  return {
    actor: actor(id),
    source: 'auto',
    collision: 'dynamic',
    from,
    desired,
    desiredFacing: 'right',
    floating: false,
    epoch: 1,
    quantum: 1,
    allowSidestep: true,
  }
}

const planSticks = (motion: WorldMotionRuntime, id: string) =>
  motion.plan({
    actors: [snapshot(id)],
    intents: [],
    terrainBlocked: () => false,
    liveActors: new Set([`1:${id}`]),
  }).previousSideSticks

describe('world motion contention and authority', () => {
  test('player direction and authority changes share the side-stick epoch owner', () => {
    const motion = new WorldMotionRuntime(100)
    expect(motion.setPlayerDirection('up')).toBe(2)
    expect(motion.setPlayerDirection('up')).toBe(2)
    motion.coordinator.setAuthority('party', { kind: 'script' })
    expect(motion.setPlayerDirection('up')).toBe(3)
    motion.coordinator.releaseAuthority('party')
    expect(motion.setPlayerDirection(null)).toBe(5)
  })

  test('侧避锁仅保留合法休眠实体与本批新锁；活跃实体和 party 不借旧锁跨轮', () => {
    const motion = new WorldMotionRuntime(100)
    const stick = (id: string): SideStick => ({
      actor: actor(id),
      epoch: 1,
      side: 'positive',
      remainingEligibleTicks: 2,
    })
    const active = stick('active')
    const retained = stick('retained')
    const stale = stick('stale')
    const party: SideStick = { ...stick('unused'), actor: { kind: 'party' } }
    const next = stick('new')
    const retainDormant = vi.fn(
      (entry: SideStick) => entry.actor.kind === 'entity' && entry.actor.id === 'retained',
    )
    motion.commitSideSticks(
      [active, party, retained, stale],
      [next],
      [intent('active')],
      retainDormant,
    )
    const { previousSideSticks, plan } = motion.plan({
      actors: [snapshot('retained'), snapshot('new')],
      intents: [],
      terrainBlocked: () => false,
      liveActors: new Set(['1:retained', '1:new']),
    })
    expect(previousSideSticks).toEqual([retained, next])
    expect(plan.outcomes).toEqual([])
    expect(retainDormant.mock.calls.map(([entry]) => entry)).toEqual([retained, stale])
    motion.clearStick(actor('retained'))
    expect(
      motion.plan({
        actors: [snapshot('new')],
        intents: [],
        terrainBlocked: () => false,
        liveActors: new Set(['1:new']),
      }).previousSideSticks,
    ).toEqual([next])
  })

  test('实体 authority 接管清空旧 script owner 的步态与侧避锁', () => {
    const motion = new WorldMotionRuntime(100)
    motion.advanceCadence(100, false)
    // Automatic gait is paused and retained; main.auto-pose-authority exercises its actual
    // standing presentation and resumed phase. This caller covers the script cleanup boundary.
    motion.markGait('npc', 'script', 4)
    expect(motion.hasGait('npc')).toBe(true)
    const npcStick: SideStick = {
      actor: { kind: 'entity', id: 'npc' },
      epoch: 1,
      side: 'positive',
      remainingEligibleTicks: 2,
    }
    motion.commitSideSticks([npcStick], [], [], () => true)
    expect(planSticks(motion, 'npc')).toHaveLength(1)
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    expect(motion.hasGait('npc')).toBe(false)
    expect(motion.gaitOwner('npc')).toBeUndefined()
    expect(motion.lastMovedWorldTick('npc')).toBeUndefined()
    expect(planSticks(motion, 'npc')).toHaveLength(0)
    motion.coordinator.releaseAuthority('npc')
  })
})
