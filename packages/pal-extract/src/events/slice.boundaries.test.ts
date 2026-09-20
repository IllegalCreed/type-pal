/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R06：sliceByScene globalEntries 与边界（events/slice.ts）。
 * 既有 slice.test 已覆盖单/双场景、shared 改写、13 跳转、randomJump、end 变体——不重复。
 * 本文件：globalEntries 独达强制 shared、与单 scene 重合仍 shared、循环只收一次、
 * 最后 scene 的 EO 段开区间到末尾、raw 数字 operand 不改写。
 */

import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import type { EventObject, Scene } from '../io/sss.js'
import { sliceByScene } from './slice.js'

function makeScene(scriptOnEnter: number, eventObjectIndex: number, teleport = 0): Scene {
  return {
    mapNum: 0,
    scriptOnEnter: scriptOnEnter,
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

describe('R06 sliceByScene globalEntries 归属', () => {
  test('globalEntries 独达（任何 scene 都不可达）→ 强制 shared', () => {
    // scene0 enter=2 只达指令 2；指令 1 仅 globalEntries 可达（入口号必须 >0）
    const result = sliceByScene(
      [{ op: 'end' }, { op: 'end' }, { op: 'end' }],
      [makeScene(2, 0)],
      [],
      [1],
    )
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }])
    expect(result.shared.segments[0]!.commands).toEqual([{ op: 'end' }])
  })
  test('globalEntries 与单 scene 重合 → 仍 shared（sceneCount 强制 ≥2）', () => {
    const result = sliceByScene([{ op: 'end' }, { op: 'end' }], [makeScene(1, 0)], [], [1])
    // 指令 1 同时被 scene0 与 globalEntries 命中 → shared，scene0 只剩…指令 0 不可达
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([])
    expect(result.shared.segments[0]!.commands).toEqual([{ op: 'end' }])
  })
  test('循环（goto 回自身）只收一次，不重复', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达（入口号必须 >0）
      { op: 'goto', to: 'L_1', frameDelay: 0, label: 'L_1' }, // 1 自循环
      { op: 'end' }, // 2 不可达
    ]
    const result = sliceByScene(commands, [makeScene(1, 0)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([
      { op: 'goto', to: 'L_1', frameDelay: 0, label: 'L_1' },
    ])
  })
  test('最后 scene 的 EO 段开区间到 eventObjects 末尾；enter/teleport 双入口都可达', () => {
    // scene0 EO [0,1)，scene1（最后）EO [1,3)
    const eos = [makeEo(1, 0), makeEo(3, 0), makeEo(4, 0)]
    const scenes = [makeScene(0, 0), makeScene(2, 1, 5)]
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'end' }, // 1 scene0 EO
      { op: 'end' }, // 2 scene1 enter
      { op: 'end' }, // 3 scene1 EO[1]
      { op: 'end' }, // 4 scene1 EO[2]（开区间到末尾）
      { op: 'end' }, // 5 scene1 teleport
    ]
    const result = sliceByScene(commands, scenes, eos)
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }])
    expect(result.scenes[1]!.segments[0]!.commands).toEqual([
      { op: 'end' },
      { op: 'end' },
      { op: 'end' },
      { op: 'end' },
    ])
    expect(result.shared.segments[0]!.commands).toEqual([])
  })
  test('跨文件 goto 改写 shared#L_N；raw 数字 operand 不改写', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'goto', to: 'L_4', frameDelay: 0 }, // 1
      { op: 'end' }, // 2 不可达
      { op: 'end' }, // 3 不可达
      { op: 'raw', opcode: 0x0004, operands: [4, 0, 0] }, // 4 call-script 仍指数字 4
    ]
    // scene0 enter=1 经 goto 到 4；scene1 enter=4 → 指令 4 双达 → shared
    const result = sliceByScene(commands, [makeScene(1, 0), makeScene(4, 0)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([
      { op: 'goto', to: 'shared#L_4', frameDelay: 0 }, // 具名 goto 改写
    ])
    expect(result.shared.segments[0]!.commands).toEqual([
      { op: 'raw', opcode: 0x0004, operands: [4, 0, 0] }, // raw 数字 operand 原样
    ])
  })
})
