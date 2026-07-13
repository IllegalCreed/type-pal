/**
 * getScriptDescLines 单测 — sdlpal itemmenu.c:267-284 WIN95 path,木剑 40133 真值 chain。
 *
 * 防回归:user 反复怒怼 "物品描述没渲染"(2026-05-29 session 4)— 当时简版只画 _name。
 * 修后必须真跑 chain 取所有 showDialog text。
 */

import type { Command } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../event-system.js'
import { getScriptDescLines } from './script-desc.js'

const FIXTURE_COMMANDS: Command[] = [
  // L_40133 木剑(idx 0)
  { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_40133' },
  { op: 'showDialog', messageIndex: 12718, text: '用木材雕刻的剑，小孩玩具。' },
  { op: 'showDialog', messageIndex: 12719, text: '武术+2 身法+3' },
  { op: 'end' },
  // L_40265 玉佛珠(idx 4)
  { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_40265' },
  { op: 'showDialog', messageIndex: 12796, text: '西方如来檀前的念珠，经佛法薰陶' },
  { op: 'showDialog', messageIndex: 12797, text: '变化通灵。合体法术：佛法无边' },
  { op: 'showDialog', messageIndex: 12798, text: '灵力+88 防御+18 避毒率+30' },
  { op: 'end' },
] as Command[]

describe('getScriptDescLines', () => {
  beforeEach(() => {
    // P2#5:单一全局脚本数组。labelMap 由命令的 label 字段建(L_40133 在 idx 0,L_40265 在 idx 4)。
    setGlobalEvents(FIXTURE_COMMANDS)
  })

  afterEach(() => {
    setGlobalEvents([])
  })

  it('木剑 40133 → 2 行真值描述', () => {
    expect(getScriptDescLines(40133)).toEqual(['用木材雕刻的剑，小孩玩具。', '武术+2 身法+3'])
  })

  it('玉佛珠 40265 → 3 行真值描述', () => {
    expect(getScriptDescLines(40265)).toEqual([
      '西方如来檀前的念珠，经佛法薰陶',
      '变化通灵。合体法术：佛法无边',
      '灵力+88 防御+18 避毒率+30',
    ])
  })

  it('scriptDesc=0 → 空数组(防 wScript=0 死循环)', () => {
    expect(getScriptDescLines(0)).toEqual([])
  })

  it('label 不存在 → 空数组(防 ip undefined crash)', () => {
    expect(getScriptDescLines(99999)).toEqual([])
  })

  it('遇 end 立刻 stop(不会越界吃下一段描述)', () => {
    // 木剑 chain end 在 idx 3,玉佛珠从 idx 4 起 — 不应混到木剑结果
    const wooden = getScriptDescLines(40133)
    expect(wooden).toHaveLength(2)
    expect(wooden).not.toContain('西方如来檀前的念珠，经佛法薰陶')
  })

  it('遇非 showDialog 的 raw op 跳过(0xA7 noop 不算行)', () => {
    // L_40133 idx 0 是 raw 0xA7,getScriptDescLines 应忽略,只取 idx 1/2 showDialog
    expect(getScriptDescLines(40133)).not.toContain(undefined)
    expect(getScriptDescLines(40133)).toHaveLength(2)
  })
})
