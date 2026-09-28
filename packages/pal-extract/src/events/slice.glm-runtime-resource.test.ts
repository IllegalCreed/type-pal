/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R06（events/slice.ts）。
 * 去重账：slice.test 覆盖单/双场景、shared 改写、同场景不改写、EO 入口、end 变体、
 * 0x95/0xA2/L29 目标收集；slice.boundaries（RESOURCE-TOOLS R06）覆盖 globalEntries 归属/
 * 循环单收/末景开区间/raw 不改写。本文件只做未占用合同：跨文件标签 goto 的 BFS 死端
 * （不跟外部目标也不 fall-through）、越界目标忽略、globalEntries 过滤非正入口。
 */
import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import type { Scene } from '../io/sss.js'
import { sliceByScene } from './slice.js'

const scene = (scriptOnEnter: number): Scene => ({
  mapNum: 0,
  scriptOnEnter,
  scriptOnTeleport: 0,
  eventObjectIndex: 0,
  raw: new Uint16Array(),
})

describe('R06 sliceByScene 外部标签与越界', () => {
  test('goto 指向跨文件标签 shared#L_2：BFS 死端——不跟目标、也不收 fall-through', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0 不可达
      { op: 'goto', to: 'shared#L_2' }, // 1 入口：外部标签 → 死端
      { op: 'end' }, // 2 不被收集（既非目标也非 fall-through）
    ]
    const result = sliceByScene(commands, [scene(1)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'goto', to: 'shared#L_2' }])
  })

  test('goto 目标越界（L_99）：忽略，不崩、不收', () => {
    const commands: Command[] = [
      { op: 'end' }, // 0
      { op: 'goto', to: 'L_99' }, // 1 入口 → 越界目标
      { op: 'end' }, // 2 fall-through 不存在（goto 不直落）
    ]
    const result = sliceByScene(commands, [scene(1)], [])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'goto', to: 'L_99' }])
  })

  test('globalEntries 过滤非正入口（0 / 负数不参与 BFS）', () => {
    const commands: Command[] = [{ op: 'end' }, { op: 'end' }]
    const result = sliceByScene(commands, [scene(1)], [], [0, -3])
    expect(result.scenes[0]!.segments[0]!.commands).toEqual([{ op: 'end' }]) // 仅 scene 入口 1
    expect(result.shared.segments[0]!.commands).toEqual([]) // 非法全局入口没有产生 shared 归属
  })
})
