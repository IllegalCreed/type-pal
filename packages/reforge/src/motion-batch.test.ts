import { describe, expect, test } from 'vitest'
import { commitMotionBatch, MotionCompletionRecord } from './motion-batch.js'

function hooks(log: string[], touchTookOver = false) {
  return {
    commitCanonicalEndpoints: () => log.push('canonical-endpoint'),
    commitLivePositions: () => log.push('live-positions'),
    afterLiveCommit: () => log.push('terminal-claims'),
    runTouch: () => {
      log.push('touch')
      return touchTookOver
    },
    runPostContact: () => log.push('post-contact'),
    queueContinuations: () => log.push('queue-continuations'),
  }
}

describe('world motion batch side-effect order', () => {
  test('an ordinary batch commits, scans touch, scans post-contact, then queues continuations', () => {
    const log: string[] = []
    commitMotionBatch(hooks(log))
    expect(log).toEqual([
      'canonical-endpoint',
      'live-positions',
      'terminal-claims',
      'touch',
      'post-contact',
      'queue-continuations',
    ])
  })

  test('same-tick endpoint plus dialogue touch keeps settlement but suppresses post-contact', () => {
    const log: string[] = []
    commitMotionBatch(hooks(log, true))
    expect(log).toEqual([
      'canonical-endpoint',
      'live-positions',
      'terminal-claims',
      'touch',
      'queue-continuations',
    ])
  })

  test('same-actor take happens after the committed endpoint and cannot roll it back', () => {
    let canonicalPosition = 0
    let livePosition = 0
    const events: string[] = []
    const queued: (() => void)[] = []
    const record = new MotionCompletionRecord<string>(
      () => events.push('detach'),
      () => events.push('wake'),
      (reason) => events.push(`reject:${reason}`),
    )

    commitMotionBatch({
      commitCanonicalEndpoints: () => {
        canonicalPosition = 7
        record.commit()
      },
      commitLivePositions: () => {
        livePosition = 7
      },
      afterLiveCommit: () => undefined,
      runTouch: () => {
        expect([canonicalPosition, livePosition]).toEqual([7, 7])
        record.cancel('take')
        return true
      },
      runPostContact: () => events.push('enemy contact'),
      queueContinuations: () => queued.push(() => record.resolve()),
    })
    expect(events).toEqual(['detach'])
    for (const wake of queued) wake()
    expect(events).toEqual(['detach', 'wake'])
    expect(livePosition).toBe(7)
  })
})

describe('durable motion completion record', () => {
  test('remove/replace cannot reject a slot after endpoint commit but wake-up still occurs', () => {
    const events: string[] = []
    const record = new MotionCompletionRecord<string>(
      () => events.push('detach'),
      () => events.push('wake'),
      (reason) => events.push(`reject:${reason}`),
    )

    expect(record.commit()).toBe(true)
    expect(record.cancel('remove')).toBe(false)
    expect(record.cancel('behavior-replace')).toBe(false)
    expect(record.resolve()).toBe(true)
    expect(events).toEqual(['detach', 'wake'])
  })

  test('an uncommitted proposal remains cancellable and cannot wake later', () => {
    const events: string[] = []
    const record = new MotionCompletionRecord<string>(
      () => events.push('detach'),
      () => events.push('wake'),
      (reason) => events.push(`reject:${reason}`),
    )

    expect(record.cancel('scene-replace')).toBe(true)
    expect(record.resolve()).toBe(false)
    expect(record.commit()).toBe(false)
    expect(events).toEqual(['detach', 'reject:scene-replace'])
  })
})
