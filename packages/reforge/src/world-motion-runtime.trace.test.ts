import { describe, expect, test } from 'vitest'
import type { MotionActor, MotionIntent, MotionOutcome } from './entity-motion.js'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })
const actor = (id: string): MotionActor => ({ kind: 'entity', id })

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

describe('recording world motion diagnostics', () => {
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
