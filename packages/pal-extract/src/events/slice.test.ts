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
          nSpriteFrames: 0,
          direction: 0,
          currentFrameNum: 0,
          scriptIdleFrame: 0,
          spritePtrOffset: 0,
          nSpriteFramesAuto: 0,
          scriptIdleFrameCountAuto: 0,
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

  // ── end fall-through(2026-05-28 黑屏根因回归)────────────────────────────
  //
  // sdlpal 0x0001(end advance)运行时推进至下一行 i+1、0x0002(end reset)跳 resetTo。
  // BFS 必须收这些续行,否则 local 数组把邻接脚本错塞在 autoscript 后 → 运行时 ip++
  // 跑进不相干脚本(原 bug:scene-3 autoscript 跑进 L_1649 setPartyPos → 黑屏)。
  it('0x0001 end advance:收 fall-through i+1(autoscript 续行)', () => {
    const result = sliceByScene(
      [
        { op: 'end' }, // 0: padding
        { op: 'end', advance: true }, // 1: scene 0 entry — 0x0001 推进 i+1
        { op: 'raw', opcode: 0x14, operands: [1, 0, 0] }, // 2: 续行,必须被收
        { op: 'end' }, // 3: 0x0000 park
      ],
      [makeScene(1, 0)],
      [],
    )
    const cmds = result.scenes[0]!.segments[0]!.commands
    expect(cmds).toContainEqual({ op: 'raw', opcode: 0x14, operands: [1, 0, 0] })
    expect(cmds).toContainEqual({ op: 'end', advance: true })
  })

  it('0x0002 end reset:收 resetTo 目标 + fall-through i+1', () => {
    const result = sliceByScene(
      [
        { op: 'end' }, // 0: padding
        { op: 'end', reset: true, resetTo: 3, idleFrames: 0 }, // 1: scene 0 entry → 跳 3 + i+1=2
        { op: 'end' }, // 2: fall-through 续行
        { label: 'L_3', op: 'raw', opcode: 0x14, operands: [9, 0, 0] }, // 3: resetTo 目标,必须被收
      ],
      [makeScene(1, 0)],
      [],
    )
    const cmds = result.scenes[0]!.segments[0]!.commands
    expect(cmds).toContainEqual({ label: 'L_3', op: 'raw', opcode: 0x14, operands: [9, 0, 0] })
  })
})
