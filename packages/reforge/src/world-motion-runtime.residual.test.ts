import { describe, expect, test, vi } from 'vitest'
import type {
  MotionActor,
  MotionIntent,
  MotionOutcome,
  MotionSnapshotActor,
  SideStick,
} from './entity-motion.js'
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

describe('当前世界走位所有权与稀疏诊断边界', () => {
  test('已登记的一次性 auto 步进在 authority 换代后只回 dropped，不留下成功续点', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const pending = motion.registerAutoStep({
      id: 'npc',
      dir: 'left',
      sceneId: 's1',
      signal: controller.signal,
      activation: { ownerId: 'scene-auto', epoch: 3 },
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    expect(slot).toMatchObject({ kind: 'step', source: 'auto', authorityEpochAtEnqueue: 0 })
    if (slot?.kind !== 'step') throw new Error('step registration missing')
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    expect(motion.coordinator.shouldDropAutoOneShot('npc', slot)).toBe(true)
    slot.dropByAuthority()
    await expect(pending).resolves.toEqual({ outcome: 'droppedByAuthority' })
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
    expect(motion.coordinator.autoLineagesForTarget('npc')).toEqual([])
    controller.abort()
  })

  test('追逐入队前/后两种 authority 丢弃分别只触发一次回调；脚本源不误丢', async () => {
    const motion = new WorldMotionRuntime(100)
    const signal = new AbortController().signal
    const dropped = vi.fn()
    const registered = vi.fn()
    const cancelled = vi.fn()
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    await expect(
      motion.registerChase({
        source: 'auto',
        id: 'npc',
        range: 3,
        floating: false,
        sceneId: 's1',
        signal,
        activation: { ownerId: 'scene-auto', epoch: 1 },
        onDropped: dropped,
        onRegistered: registered,
        onCancelled: cancelled,
      }),
    ).resolves.toBe('droppedByAuthority')
    expect(dropped).toHaveBeenCalledTimes(1)
    expect(registered).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)

    const scripted = motion.registerChase({
      source: 'script',
      id: 'npc',
      range: 4,
      floating: true,
      sceneId: 's1',
      signal,
      onDropped: dropped,
      onRegistered: registered,
      onCancelled: cancelled,
    })
    const scriptSlot = motion.coordinator.scriptSlots.get('npc')
    expect(scriptSlot).toMatchObject({ kind: 'chase', source: 'script', range: 4, floating: true })
    if (scriptSlot?.kind !== 'chase') throw new Error('script chase missing')
    expect(motion.coordinator.shouldDropAutoOneShot('npc', scriptSlot)).toBe(false)
    scriptSlot.resolve()
    await expect(scripted).resolves.toBe('attempted')
    expect(registered).toHaveBeenCalledTimes(1)
    expect(dropped).toHaveBeenCalledTimes(1)
    expect(cancelled).not.toHaveBeenCalled()

    motion.coordinator.releaseAuthority('npc')
    const auto = motion.registerChase({
      source: 'auto',
      id: 'npc',
      range: 5,
      floating: false,
      sceneId: 's1',
      signal,
      activation: { ownerId: 'scene-auto', epoch: 2 },
      onDropped: dropped,
      onRegistered: registered,
      onCancelled: cancelled,
    })
    const autoSlot = motion.coordinator.autoSlots.get('npc')
    if (autoSlot?.kind !== 'chase') throw new Error('auto chase missing')
    motion.coordinator.setAuthority('npc', { kind: 'mount', parent: 'party', dx: 0, dy: 0 })
    expect(motion.coordinator.shouldDropAutoOneShot('npc', autoSlot)).toBe(true)
    autoSlot.dropByAuthority?.()
    await expect(auto).resolves.toBe('droppedByAuthority')
    expect(dropped).toHaveBeenCalledTimes(2)
    expect(registered).toHaveBeenCalledTimes(2)
    expect(cancelled).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
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

  test('阻挡原因与被动退让按稳定 actor 顺序记录实际提交，不拿计划位置冒充已移动', () => {
    const motion = new WorldMotionRuntime(100)
    motion.advanceCadence(100, false)
    const blocked = (
      id: string,
      reason: Extract<MotionOutcome, { kind: 'blocked' }>['reason'],
    ): MotionOutcome => ({
      kind: 'blocked',
      actor: actor(id),
      from: pos(1),
      facing: 'right',
      reason,
    })
    const outcomes: MotionOutcome[] = [
      blocked('z', { kind: 'terrain' }),
      blocked('c', { kind: 'cycle', actors: [actor('z'), actor('a')] }),
      blocked('b', { kind: 'actor', actor: actor('a') }),
      blocked('r', { kind: 'reservation', actor: { kind: 'party' } }),
      {
        kind: 'passive-yield',
        actor: actor('a'),
        from: pos(1),
        to: pos(2),
        facing: 'right',
        actualDirection: 'right',
      },
    ]
    motion.recordTrace(false, 's1', [intent('z')], outcomes)
    expect(motion.dumpTrace()).toEqual([])
    motion.recordTrace(true, 's1', [intent('z', pos(1), pos(9))], outcomes)
    expect(
      motion.dumpTrace().map(({ actor, source, proposed, outcome, to, blockReason }) => ({
        actor,
        source,
        proposed,
        outcome,
        to,
        blockReason,
      })),
    ).toEqual([
      {
        actor: '1:a',
        source: 'passive-yield',
        proposed: pos(2),
        outcome: 'passive-yield',
        to: pos(2),
        blockReason: undefined,
      },
      {
        actor: '1:b',
        source: 'passive-yield',
        proposed: pos(1),
        outcome: 'blocked',
        to: pos(1),
        blockReason: 'actor:1:a',
      },
      {
        actor: '1:c',
        source: 'passive-yield',
        proposed: pos(1),
        outcome: 'blocked',
        to: pos(1),
        blockReason: 'cycle:1:a,1:z',
      },
      {
        actor: '1:r',
        source: 'passive-yield',
        proposed: pos(1),
        outcome: 'blocked',
        to: pos(1),
        blockReason: 'reservation:0:party',
      },
      {
        actor: '1:z',
        source: 'auto',
        proposed: pos(9),
        outcome: 'blocked',
        to: pos(1),
        blockReason: 'terrain',
      },
    ])
  })

  test('诊断记录达到上限后只淘汰最早条，失败现场仍保留最新提交', () => {
    const motion = new WorldMotionRuntime(100)
    for (let index = 0; index < 4097; index++) {
      motion.recordTrace(
        true,
        `s${index}`,
        [],
        [
          {
            kind: 'moved',
            actor: actor('npc'),
            from: pos(index),
            to: pos(index + 1),
            facing: 'right',
            actualDirection: 'right',
          },
        ],
      )
    }
    const trace = motion.dumpTrace()
    expect(trace).toHaveLength(4096)
    expect([trace[0]?.scene, trace.at(-1)?.scene]).toEqual(['s1', 's4096'])
    expect([trace[0]?.from, trace.at(-1)?.to]).toEqual([pos(1), pos(4097)])
  })
})
