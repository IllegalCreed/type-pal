/** Scene/global entry reachability, defensive labels and readable metadata boundaries. */

import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import type { EventObject, Scene } from '../io/sss.js'
import { sliceByScene } from './slice.js'

describe('scene and global entry ownership', () => {
  function makeScene(scriptOnEnter: number, eventObjectIndex = 0, teleport = 0): Scene {
    return {
      mapNum: 0,
      scriptOnEnter,
      scriptOnTeleport: teleport,
      eventObjectIndex,
      raw: new Uint16Array([0, scriptOnEnter, teleport, eventObjectIndex]),
    }
  }

  function makeEo(triggerScript: number, autoScript: number): EventObject {
    return {
      vanishTime: 0,
      x: 0,
      y: 0,
      layer: 0,
      triggerScript,
      autoScript,
      state: 0,
      triggerMode: 0,
      spriteNum: 0,
      nSpriteFrames: 0,
      direction: 0,
      currentFrameNum: 0,
      scriptIdleFrame: 0,
      spritePtrOffset: 0,
      nSpriteFramesAuto: 0,
      scriptIdleFrameCountAuto: 0,
      raw: new Uint16Array([0, 0, 0, 0, triggerScript, autoScript, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    }
  }

  test('goto 指向跨文件标签 shared#L_2：BFS 死端——不跟目标、也不收 fall-through', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'goto', to: 'shared#L_2' }, // 1 入口：外部标签 → 死端
      { op: 'end' }, // 2 不被收集（既非目标也非 fall-through）
    ]
    const result = sliceByScene(commands, [makeScene(1)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'goto', to: 'shared#L_2' }])
  })

  test('goto 目标越界（L_99）：忽略，不崩、不收', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0
      { op: 'goto', to: 'L_99' }, // 1 入口 → 越界目标
      { op: 'end' }, // 2 fall-through 不存在（goto 不直落）
    ]
    const result = sliceByScene(commands, [makeScene(1)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'goto', to: 'L_99' }])
  })

  test('globalEntries 过滤非正入口（0 / 负数不参与 BFS）', () => {
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      { op: 'end', label: 'L_1' },
    ]
    const result = sliceByScene(commands, [makeScene(1)], [], [0, -3])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end', label: 'L_1' }]) // 仅 scene 入口 1
    expect(result.shared.segments[0]!.commands).toEqual([]) // 非法全局入口没有产生 shared 归属
  })

  test('具名 showDialog 走 fall-through：pushRawJumpTargets 早退、text 非标签不入队', () => {
    // scene0 enter=1 → showDialog(msg 7) → i+1 end。showDialog 是具名非 raw 命令，
    // pushRawJumpTargets 必须早退（不把 messageIndex/text 当跳转目标）。
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'showDialog', messageIndex: 7, text: '客观里边请' }, // 1
      { op: 'end', advance: true }, // 2 advance → 收 3
      { op: 'end' }, // 3 advance 续行
    ]
    const result = sliceByScene(commands, [makeScene(1, 0)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([
      { op: 'showDialog', messageIndex: 7, text: '客观里边请' },
      { op: 'end', advance: true },
      { op: 'end' },
    ])
    expect(result.shared.segments[0]!.commands).toEqual([])
  })

  test('EO 区间越过 eventObjects 末尾：越界槽位跳过、autoScript>0 入口、triggerScript=0 不入口', () => {
    // scene0 EO 区间 [0, scene1.eventObjectIndex=5)，eventObjects 只有 2 条
    // → eoi=2/3/4 越界 `!eo` continue；scene1 自身 enter=0 无入口。
    // eo0 trigger=0/auto=0 双零不入口；eo1 trigger=0/auto=4 → auto 入口（trigger 0 不入口）。
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'end' }, // 1 不可达
      { op: 'end' }, // 2 不可达
      { op: 'end' }, // 3 不可达
      { op: 'end', label: 'L_4' }, // 4 ← eo1.autoScript；身份必须区别于错误入口1的end
    ]
    const result = sliceByScene(
      commands,
      [makeScene(0, 0), makeScene(0, 5)],
      [makeEo(0, 0), makeEo(0, 4)],
    )
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end', label: 'L_4' }])
    expect(result.scenes[1]!.segments[0]!.commands).toEqual([])
    expect(result.shared.segments[0]!.commands).toEqual([])
  })

  test('end reset 缺 resetTo：scene BFS 只收 i+1，不收 undefined 目标', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'end', reset: true }, // 1 scene0 入口；resetTo 缺 → 仅 i+1
      { op: 'end' }, // 2 reset 续行
    ]
    const result = sliceByScene(commands, [makeScene(1, 0)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([
      { op: 'end', reset: true },
      { op: 'end' },
    ])
    expect(result.shared.segments[0]!.commands).toEqual([])
  })

  test('越界与重复入口被跳过：ip>=commands.length 与 visited 去重', () => {
    // [99] 越界丢弃；[1,1] 重复入口第二次被 visited 拦截；结果与单 [1] 一致。
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      { op: 'end', label: 'L_1' },
      { op: 'end', label: 'L_2' },
    ]
    const result = sliceByScene(commands, [makeScene(2, 0)], [], [99, 1, 1])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end', label: 'L_2' }])
    expect(result.shared.segments[0]!.commands).toEqual([{ op: 'end', label: 'L_1' }])
  })

  test('end advance：global BFS 收 i+1 续行', () => {
    const commands: Command[] = [
      { op: 'end', label: 'L_0' }, // 0 不可达
      { op: 'end', advance: true, label: 'L_1' }, // 1 ← global entry；advance 收 2
      { op: 'end', label: 'L_2' }, // 2 advance 续行
    ]
    const result = sliceByScene(commands, [makeScene(0, 0)], [], [1])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([])
    expect(result.shared.segments[0]!.commands).toEqual([
      { op: 'end', advance: true, label: 'L_1' },
      { op: 'end', label: 'L_2' },
    ])
  })

  test('end reset：resetTo 数字收目标 + i+1；缺 resetTo 只收 i+1', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'end', reset: true, resetTo: 4, idleFrames: 30, label: 'L_1' }, // 1 ← global entry
      { op: 'end', reset: true, label: 'L_2' }, // 2 reset 续行；缺 resetTo 仅收 3
      { op: 'end', label: 'L_3' }, // 3
      { op: 'end', label: 'L_4' }, // 4 ← resetTo 目标
    ]
    const result = sliceByScene(commands, [makeScene(0, 0)], [], [1])
    expect(result.shared.segments[0]!.commands).toEqual([
      { op: 'end', reset: true, resetTo: 4, idleFrames: 30, label: 'L_1' },
      { op: 'end', reset: true, label: 'L_2' },
      { op: 'end', label: 'L_3' },
      { op: 'end', label: 'L_4' },
    ])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([])
  })

  test('goto：L_N 跟随；shared#L_N 等非本地标签不跟随', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'goto', to: 'shared#L_99', frameDelay: 0 }, // 1 ← global entry：不跟随跨文件标签
      { op: 'goto', to: 'L_3', frameDelay: 0 }, // 2 fall-through 不收（goto 无续行）→ 不可达
      { op: 'end' }, // 3 不可达
    ]
    const result = sliceByScene(commands, [makeScene(0, 0)], [], [1])
    expect(result.shared.segments[0]!.commands).toEqual([
      { op: 'goto', to: 'shared#L_99', frameDelay: 0 },
    ])
    // L_3 跟随方向：shared 内 goto 指向另一 shared 指令 → 统一改写为 shared#L_3
    const follow = sliceByScene(commands, [makeScene(0, 0)], [], [2])
    expect(follow.shared.segments[0]!.commands).toEqual([
      { op: 'goto', to: 'shared#L_3', frameDelay: 0 },
      { op: 'end' },
    ])
  })

  test.each([
    ['scene', 'dialogue'],
    ['scene', 'item'],
    ['global', 'dialogue'],
    ['global', 'item'],
  ] as const)('%s 的人读 %s 文本 L_N 不制造控制流边', (owner, kind) => {
    const readable: Command =
      kind === 'dialogue'
        ? { op: 'showDialog', messageIndex: 1, text: 'L_3', label: 'L_1' }
        : { op: 'giveItem', itemId: 61, count: 1, _item: 'L_3', label: 'L_1' }
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      readable,
      { op: 'end', label: 'L_2' }, // 真终止阻断普通续行，3不能顺序抵达。
      { op: 'raw', opcode: 0x14, operands: [9, 0, 0], label: 'L_3' },
      { op: 'end', label: 'L_4' },
    ]
    const result = sliceByScene(
      commands,
      [makeScene(owner === 'scene' ? 1 : 0, 0)],
      [],
      owner === 'global' ? [1] : [],
    )
    const expected: Command[] = [readable, { op: 'end', label: 'L_2' }]
    expect(result.scenes[0]!.segments[0]!.commands).toEqual(owner === 'scene' ? expected : [])
    expect(result.shared.segments[0]!.commands).toEqual(owner === 'global' ? expected : [])
  })
})
