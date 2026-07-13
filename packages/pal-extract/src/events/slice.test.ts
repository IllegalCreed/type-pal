import { describe, expect, it } from 'vitest'
import { sliceByScene } from './slice.js'

function makeScene(scriptOnEnter: number, eventObjectIndex: number): import('../io/sss.js').Scene {
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
    expect((result.scenes[0]!.segments[0]!.commands[0] as { op: string; to: string }).to).toBe(
      'shared#L_3',
    )
    expect((result.scenes[1]!.segments[0]!.commands[0] as { op: string; to: string }).to).toBe(
      'shared#L_3',
    )
  })

  it('goto 目标在同一场景内不改写', () => {
    // commands: [padding, goto L_2, end] — all reachable only by scene 0
    const result = sliceByScene(
      [{ op: 'end' }, { op: 'goto', to: 'L_2' }, { label: 'L_2', op: 'end' }],
      [makeScene(1, 0)],
      [],
    )
    expect((result.scenes[0]!.segments[0]!.commands[0] as { op: string; to: string }).to).toBe(
      'L_2',
    )
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

  // ── 条件跳转 opcode 目标收集(2026-05-28 A2)──────────────────────────────────
  it('0x95 jumpIfScene:跳转目标(op1)被 BFS 收集进 scene', () => {
    const result = sliceByScene(
      [
        { op: 'end' }, // 0 padding
        { op: 'raw', opcode: 0x95, operands: [5, 3, 0] }, // 1 scene 0 entry — jump 目标 = op1 = 3
        { op: 'end' }, // 2 fall-through
        { op: 'raw', opcode: 0x35, operands: [9, 0, 0] }, // 3 jump 目标 — 必须被收
      ],
      [makeScene(1, 0)],
      [],
    )
    const cmds = result.scenes[0]!.segments[0]!.commands
    expect(cmds).toContainEqual({ op: 'raw', opcode: 0x35, operands: [9, 0, 0] }) // 目标被收集
  })

  it('0xA2 randomJump:相对目标 i+1..i+op0 全被 BFS 收集', () => {
    const result = sliceByScene(
      [
        { op: 'end' }, // 0 padding
        { op: 'raw', opcode: 0xa2, operands: [3, 0, 0] }, // 1 entry — 目标 i+1..i+3 = 2,3,4
        { op: 'raw', opcode: 0x35, operands: [1, 0, 0] }, // 2
        { op: 'raw', opcode: 0x35, operands: [2, 0, 0] }, // 3
        { op: 'raw', opcode: 0x35, operands: [3, 0, 0] }, // 4
        { op: 'end' }, // 5
      ],
      [makeScene(1, 0)],
      [],
    )
    const cmds = result.scenes[0]!.segments[0]!.commands
    expect(cmds).toContainEqual({ op: 'raw', opcode: 0x35, operands: [2, 0, 0] }) // i+2 收集
    expect(cmds).toContainEqual({ op: 'raw', opcode: 0x35, operands: [3, 0, 0] }) // i+3 收集
  })

  // L29:13 个条件跳转 opcode 的跳转目标(rgwOperand[N])此前不在 JUMP_TARGET_OPERAND 表,
  //   BFS 不跟随 → 仅经该跳转可达的块被切片丢弃。补表后逐一验证目标被收集。
  //   [opcode, operandIndex] 对照 reference/sdlpal/script.c wScriptEntry=rgwOperand[N]:
  //   0x06@3305(op1) 0x1E@962(op1) 0x20@1023(op2) 0x2E@1395(op2) 0x33@1448(op0)
  //   0x34@1517(op0) 0x38@1569(op0) 0x3A@1597(op0) 0x68@2031(op0) 0x84@2483/2500(op2)
  //   0x91@2633(op0) 0x9C@2798(op1) 0x9E@2905(op2)。
  it('L29:13 个条件跳转 opcode 的跳转目标被 BFS 收集(script.c wScriptEntry=rgwOperand[N])', () => {
    const cases: Array<[number, number]> = [
      [0x06, 1],
      [0x1e, 1],
      [0x20, 2],
      [0x2e, 2],
      [0x33, 0],
      [0x34, 0],
      [0x38, 0],
      [0x3a, 0],
      [0x68, 0],
      [0x84, 2],
      [0x91, 0],
      [0x9c, 1],
      [0x9e, 2],
    ]
    for (const [opcode, tgtIdx] of cases) {
      const operands: [number, number, number] = [0, 0, 0]
      operands[tgtIdx] = 3 // 跳转目标 = index 3(仅经该条件跳转可达)
      const result = sliceByScene(
        [
          { op: 'end' }, // 0 padding
          { op: 'raw', opcode, operands }, // 1 scene entry — 条件跳转
          { op: 'end' }, // 2 fall-through(plain end,不通到 3)
          { op: 'raw', opcode: 0x35, operands: [opcode, 0, 0] }, // 3 跳转目标 — 仅经条件跳转可达
        ],
        [makeScene(1, 0)],
        [],
      )
      const cmds = result.scenes[0]!.segments[0]!.commands
      expect(cmds, `opcode 0x${opcode.toString(16)} 跳转目标应被收集`).toContainEqual({
        op: 'raw',
        opcode: 0x35,
        operands: [opcode, 0, 0],
      })
    }
  })
})
