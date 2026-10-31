import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { RecordingInputSource, ReplayInputSource } from './input.js'

function recordedSnapshot(
  frameNum: number,
  held: InputSnapshot['held'] = new Set(),
): InputSnapshot {
  return { held, pressed: new Set(), frameNum }
}
describe('recorded snapshot ownership', () => {
  it('按帧顺序回放', () => {
    const snaps = [
      { held: new Set<'Confirm'>(), pressed: new Set<'Confirm'>(['Confirm']), frameNum: 0 },
      { held: new Set<'Right'>(['Right']), pressed: new Set<'Right'>(), frameNum: 1 },
    ]
    const src = new ReplayInputSource(snaps)
    expect(src.nextSnapshot(0).pressed.has('Confirm')).toBe(true)
    expect(src.nextSnapshot(1).held.has('Right')).toBe(true)
  })

  it('装饰任意 source,把每帧 snapshot 留档', () => {
    const inner = new ReplayInputSource([
      { held: new Set<'Right'>(['Right']), pressed: new Set<'Right'>(), frameNum: 0 },
    ])
    const rec = new RecordingInputSource(inner)
    rec.nextSnapshot(0)
    expect(rec.getRecording()).toHaveLength(1)
    expect(rec.getRecording()[0]?.held.has('Right')).toBe(true)
  })

  it('回放耗尽时，空快照的帧号等于本次入参', () => {
    const src = new ReplayInputSource([])
    const shot = src.nextSnapshot(8)
    expect(shot.frameNum).toBe(8)
    expect(shot.held.size).toBe(0)
    expect(shot.pressed.size).toBe(0)
  })

  it('回放游标越过末帧后，调用方再追加的快照不会被读到', () => {
    const first = recordedSnapshot(0, new Set(['Up']))
    const second = recordedSnapshot(1, new Set(['Down']))
    const shots: InputSnapshot[] = [first, second]
    const src = new ReplayInputSource(shots)
    expect(src.nextSnapshot(99)).toBe(first)
    const mid = src.nextSnapshot(99)
    expect(mid.frameNum).toBe(1)
    expect(mid).toBe(second)
    expect(src.nextSnapshot(9).frameNum).toBe(9)
    shots.push(recordedSnapshot(2, new Set(['Left'])))
    const after = src.nextSnapshot(11)
    expect(after.frameNum).toBe(11)
    expect(after.held.size).toBe(0)
  })

  it('录制源返回的就是内层那一个快照对象', () => {
    const shot = recordedSnapshot(4, new Set(['Menu']))
    const rec = new RecordingInputSource({ nextSnapshot: () => shot })
    expect(rec.nextSnapshot(4)).toBe(shot)
  })

  it('getRecording 一直是同一个数组，第二次快照追加在后面', () => {
    const first = recordedSnapshot(1, new Set(['Menu']))
    const second = recordedSnapshot(2, new Set(['Confirm']))
    const queued = [first, second]
    const rec = new RecordingInputSource({
      nextSnapshot: () => queued.shift() ?? recordedSnapshot(0),
    })
    rec.nextSnapshot(1)
    const log = rec.getRecording()
    expect(rec.getRecording()).toBe(log)
    expect(log[0]).toBe(first)
    rec.nextSnapshot(2)
    expect(log).toEqual([first, second])
  })
})
