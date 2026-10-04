/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · sliceByScene 剩余分支合同（events/slice.ts）。
 *
 * 排重 basis（旧 fullName 不重复）：
 * - slice.test.ts：单/双场景归属、shared 改写、eventObject triggerScript 入口、randomJump。
 * - slice.boundaries.test.ts（R06）：globalEntries 独达/重合强制 shared、循环一次、
 *   最后 scene EO 开区间、raw 数字 operand 不改写。
 * 本文件只补以下未覆盖 edge（fast lcov 一手测量）：
 * - scene BFS 遇具名非 raw 命令时 pushRawJumpTargets 早退（slice.ts:30）。
 * - scene EO 区间越过 eventObjects 末尾时 `if (!eo) continue`（:67）；
 *   triggerScript=0 不入口（:68 false）、autoScript>0 入口（:69 true）。
 * - scene end reset 缺 resetTo 只收 i+1（:98 false）。
 * - globalEntries 越界 ip 与重复入口被跳过（:132）；global BFS 的 end advance/reset
 *   变体（:137-141）、goto 跟随与非 L_ 标签不跟随（:145-147）、字符串字段扫描
 *   L_N 命中/未命中（:150-153）。
 * 不覆盖（ledger）：0xA2 `operands[0] ?? 0`（:35，RawCommand operands 为定长三元组，
 * typed/真实 disasm 输入不可缺）、shared predicate `sceneCount[i] ?? 0`（:193，
 * sceneCount 与 commands 同长，构造上不可达）。
 */

import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import type { EventObject, Scene } from '../io/sss.js'
import { sliceByScene } from './slice.js'

function makeScene(scriptOnEnter: number, eventObjectIndex: number, teleport = 0): Scene {
  return {
    mapNum: 0,
    scriptOnEnter,
    scriptOnTeleport: teleport,
    eventObjectIndex,
    raw: new Uint16Array(),
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
    raw: new Uint16Array(),
  }
}

describe('KIMI-R1 sliceByScene scene BFS 残余分支', () => {
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
      { op: 'end' }, // 4 ← eo1.autoScript
    ]
    const result = sliceByScene(
      commands,
      [makeScene(0, 0), makeScene(0, 5)],
      [makeEo(0, 0), makeEo(0, 4)],
    )
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }])
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
})

describe('KIMI-R1 sliceByScene globalEntries BFS 残余分支', () => {
  test('越界与重复入口被跳过：ip>=commands.length 与 visited 去重', () => {
    // [99] 越界丢弃；[1,1] 重复入口第二次被 visited 拦截；结果与单 [1] 一致。
    const commands: Command[] = [{ op: 'end' }, { op: 'end' }, { op: 'end' }]
    const result = sliceByScene(commands, [makeScene(2, 0)], [], [99, 1, 1])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }])
    expect(result.shared.segments[0]!.commands).toEqual([{ op: 'end' }])
  })

  test('end advance：global BFS 收 i+1 续行', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'end', advance: true }, // 1 ← global entry；advance 收 2
      { op: 'end' }, // 2 advance 续行
    ]
    const result = sliceByScene(commands, [makeScene(0, 0)], [], [1])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([])
    expect(result.shared.segments[0]!.commands).toEqual([
      { op: 'end', advance: true },
      { op: 'end' },
    ])
  })

  test('end reset：resetTo 数字收目标 + i+1；缺 resetTo 只收 i+1', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'end', reset: true, resetTo: 4, idleFrames: 30 }, // 1 ← global entry
      { op: 'end', reset: true }, // 2 reset 续行；缺 resetTo 仅收 3
      { op: 'end' }, // 3
      { op: 'end' }, // 4 ← resetTo 目标
    ]
    const result = sliceByScene(commands, [makeScene(0, 0)], [], [1])
    expect(result.shared.segments[0]!.commands).toEqual([
      { op: 'end', reset: true, resetTo: 4, idleFrames: 30 },
      { op: 'end', reset: true },
      { op: 'end' },
      { op: 'end' },
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

  test('字符串字段扫描：text 恰为 L_N 入队、普通文本与数字字段不入队', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'showDialog', messageIndex: 1, text: 'L_3' }, // 1 ← global entry：text 命中 L_3
      { op: 'raw', opcode: 0x0050, operands: [1, 2, 3] }, // 2 fall-through：op 串非标签
      { op: 'end' }, // 3 ← L_3 目标
    ]
    const result = sliceByScene(commands, [makeScene(0, 0)], [], [1])
    expect(result.shared.segments[0]!.commands).toEqual([
      { op: 'showDialog', messageIndex: 1, text: 'L_3' },
      { op: 'raw', opcode: 0x0050, operands: [1, 2, 3] },
      { op: 'end' },
    ])
    // 普通文本（非 L_N 模式）不制造可达性
    const plain = sliceByScene(
      [
        { op: 'end' },
        { op: 'showDialog', messageIndex: 1, text: '借过' },
        { op: 'end' },
        { op: 'end' },
      ] as Command[],
      [makeScene(0, 0)],
      [],
      [1],
    )
    expect(plain.shared.segments[0]!.commands).toEqual([
      { op: 'showDialog', messageIndex: 1, text: '借过' },
      { op: 'end' },
    ])
  })
})
