import { describe, expect, it } from 'vitest'
import { sliceByScene } from './slice.js'

function makeScene(
  scriptOnEnter: number,
  eventObjectIndex: number,
): import('../io/sss.js').Scene {
  return {
    mapNum: 0,
    scriptOnEnter,
    scriptOnTeleport: 0,
    eventObjectIndex,
    raw: new Uint16Array(),
  }
}

describe('sliceByScene', () => {
  it('单场景:可达的命令进 scene-0;不可达不出现', () => {
    // commands: [padding, end, end] — scene 0 scriptOnEnter=1, index 2 unreachable
    const result = sliceByScene(
      [{ op: 'end' }, { op: 'end' }, { op: 'end' }],
      [makeScene(1, 0)],
      [],
    )
    // index 1 reachable (end → stops); index 2 unreachable
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }])
    expect(result.shared.segments[0]!.commands).toEqual([])
  })

  it('两场景独占的命令分别进 scene-0 / scene-1', () => {
    // scene 0 scriptOnEnter=1 (index 1), scene 1 scriptOnEnter=2 (index 2)
    const result = sliceByScene(
      [{ op: 'end' }, { op: 'end' }, { op: 'end' }],
      [makeScene(1, 0), makeScene(2, 0)],
      [],
    )
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }])
    expect(result.scenes[1]!.segments[0]!.commands).toEqual([{ op: 'end' }])
    expect(result.shared.segments[0]!.commands).toEqual([])
  })

  it('两场景都能 reach 的命令进 shared,跳转改写为 shared#L_X', () => {
    // commands: [padding, goto L_3, goto L_3, end]
    // scene 0 scriptOnEnter=1, scene 1 scriptOnEnter=2. Both reach index 3.
    const result = sliceByScene(
      [
        { op: 'end' }, // index 0: padding (unreachable)
        { op: 'goto', to: 'L_3' }, // index 1: scene 0 entry
        { op: 'goto', to: 'L_3' }, // index 2: scene 1 entry
        { label: 'L_3', op: 'end' }, // index 3: shared target
      ],
      [makeScene(1, 0), makeScene(2, 0)],
      [],
    )
    expect(result.shared.segments[0]!.commands).toContainEqual({ label: 'L_3', op: 'end' })
    expect(
      (result.scenes[0]!.segments[0]!.commands[0] as { op: string; to: string }).to,
    ).toBe('shared#L_3')
    expect(
      (result.scenes[1]!.segments[0]!.commands[0] as { op: string; to: string }).to,
    ).toBe('shared#L_3')
  })

  it('goto 目标在同一场景内不改写', () => {
    // commands: [padding, goto L_2, end] — all reachable only by scene 0
    const result = sliceByScene(
      [{ op: 'end' }, { op: 'goto', to: 'L_2' }, { label: 'L_2', op: 'end' }],
      [makeScene(1, 0)],
      [],
    )
    expect(
      (result.scenes[0]!.segments[0]!.commands[0] as { op: string; to: string }).to,
    ).toBe('L_2')
    expect(result.scenes[0]!.segments[0]!.commands).toHaveLength(2)
  })

  it('eventObject triggerScript 作为入口参与 BFS', () => {
    // scene 0 scriptOnEnter=0 (no direct entry), eventObject triggerScript=2
    const result = sliceByScene(
      [{ op: 'end' }, { op: 'end' }, { op: 'end' }],
      [makeScene(0, 0)],
      [
        {
          triggerScript: 2,
          autoScript: 0,
          state: 0,
          vanishTime: 0,
          x: 0,
          y: 0,
          spriteNum: 0,
          layer: 0,
          triggerMode: 0,
          raw: new Uint16Array(),
        },
      ],
    )
    // index 2 reachable from triggerScript; indices 0,1 unreachable
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }])
  })

  it('objects 文件 M1 下为空', () => {
    const result = sliceByScene([{ op: 'end' }], [makeScene(1, 0)], [])
    expect(result.objects.segments).toEqual([])
  })

  it('SceneFile 有正确的 scene 字段', () => {
    const result = sliceByScene(
      [{ op: 'end' }, { op: 'end' }, { op: 'end' }],
      [makeScene(1, 0), makeScene(2, 0)],
      [],
    )
    expect(result.scenes[0]!.scene).toBe(0)
    expect(result.scenes[1]!.scene).toBe(1)
  })
})
