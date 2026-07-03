/**
 * 脚本路径编辑纯函数(C-track v1)—— 按 ScriptRunner onStep 同款路径寻址,
 * 对 stages 做不可变的 改/插/删/移。路径形如 [0, 12, 'then', 3]。
 */
import type { Command, ScriptStage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  getCommandAt,
  insertAfterAt,
  moveAt,
  parsePath,
  removeAt,
  updateCommandAt,
} from './script-edit.js'

const dlg = (t: string): Command => ({ kind: 'dialog', line: { text: t } })
const stages = (): ScriptStage[] => [
  {
    body: [
      dlg('a'),
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 50 },
        then: [dlg('t0'), dlg('t1')],
        else: [dlg('e0')],
      },
      dlg('b'),
    ],
  },
  { body: [dlg('s1-0')] },
]

describe('parsePath', () => {
  test('字符串路径 → 段数组(数字/臂名混合)', () => {
    expect(parsePath('0/1/then/1')).toEqual([0, 1, 'then', 1])
    expect(parsePath('1/0')).toEqual([1, 0])
  })
})

describe('getCommandAt', () => {
  test('顶层与臂内寻址', () => {
    const s = stages()
    expect(getCommandAt(s, [0, 0])).toEqual(dlg('a'))
    expect(getCommandAt(s, [0, 1, 'then', 1])).toEqual(dlg('t1'))
    expect(getCommandAt(s, [0, 1, 'else', 0])).toEqual(dlg('e0'))
    expect(getCommandAt(s, [1, 0])).toEqual(dlg('s1-0'))
    expect(getCommandAt(s, [0, 9])).toBeUndefined()
  })
})

describe('updateCommandAt(不可变)', () => {
  test('替换臂内命令;旁路径同引用,源不变', () => {
    const s = stages()
    const out = updateCommandAt(s, [0, 1, 'then', 0], dlg('T0!'))
    expect(getCommandAt(out, [0, 1, 'then', 0])).toEqual(dlg('T0!'))
    expect(getCommandAt(s, [0, 1, 'then', 0])).toEqual(dlg('t0')) // 源不变
    expect(out[1]).toBe(s[1]) // 旁 stage 同引用
    expect(getCommandAt(out, [0, 1, 'else', 0])).toBe(getCommandAt(s, [0, 1, 'else', 0])) // 旁臂同引用
  })
})

describe('insertAfterAt / removeAt / moveAt', () => {
  test('插入到目标命令之后', () => {
    const out = insertAfterAt(stages(), [0, 0], dlg('new'))
    expect(
      out[0]!.body.map((c) => (c as { line?: { text: string } }).line?.text ?? c.kind),
    ).toEqual(['a', 'new', 'branch', 'b'])
  })
  test('臂内插入', () => {
    const out = insertAfterAt(stages(), [0, 1, 'then', 0], dlg('mid'))
    const arm = (getCommandAt(out, [0, 1]) as Extract<Command, { kind: 'branch' }>).then
    expect(arm.map((c) => (c as { line: { text: string } }).line.text)).toEqual(['t0', 'mid', 't1'])
  })
  test('删除(返回新数组,源不变)', () => {
    const s = stages()
    const out = removeAt(s, [0, 1, 'then', 0])
    const arm = (getCommandAt(out, [0, 1]) as Extract<Command, { kind: 'branch' }>).then
    expect(arm).toHaveLength(1)
    expect(s[0]!.body).toHaveLength(3)
  })
  test('上移/下移(边界原样返回)', () => {
    const s = stages()
    const up = moveAt(s, [0, 2], -1)
    expect(up[0]!.body[1]).toEqual(dlg('b'))
    expect(moveAt(s, [0, 0], -1)).toBe(s) // 顶端上移 = 原样
    const down = moveAt(s, [0, 1, 'then', 0], 1)
    const arm = (getCommandAt(down, [0, 1]) as Extract<Command, { kind: 'branch' }>).then
    expect(arm.map((c) => (c as { line: { text: string } }).line.text)).toEqual(['t1', 't0'])
  })
})
