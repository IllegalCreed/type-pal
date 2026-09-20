/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S01：author-command-edit 路径 API 边界。
 * 既有 author-command-edit.test 已覆盖 nested 编辑/no-op/copy 递归清新 ID——不重复。
 * 本文件：七类子键 get 按 kind 命中/错配 undefined、parse 非法段抛、顶层叶越界
 * update/remove 返回副本、move 边界返回原引用、update/remove 后改调用方 command 不影响输出。
 */
import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  authorCommandChildBody,
  getAuthorCommandAt,
  moveAuthorCommandAt,
  parseAuthorCommandPath,
  removeAuthorCommandAt,
  updateAuthorCommandAt,
} from './author-command-edit.js'

/** 合法叶命令（wait 为现行 current 命令；dialogue 已退役——validateAuthorSharedScripts 拒绝）。 */
const leaf = (ms: number): AuthorCommand => ({ kind: 'wait', ms })
const cond = { kind: 'flag', flag: 'f', is: true } as const
const branch: AuthorCommand = {
  kind: 'branch',
  cond,
  then: [leaf(11)],
  else: [leaf(12)],
} as AuthorCommand
const loop: AuthorCommand = {
  kind: 'loop',
  mode: 'while',
  cond,
  yield: 'worldTick',
  maxIterations: 10,
  body: [leaf(13)],
} as AuthorCommand
const confirm: AuthorCommand = { kind: 'confirm', onNo: [leaf(14)] } as AuthorCommand
const battle: AuthorCommand = {
  kind: 'startBattle',
  enemyTeamId: 'team-1',
  onLose: [leaf(15)],
  onFlee: [leaf(16)],
} as AuthorCommand
const teleport: AuthorCommand = { kind: 'teleportOut', onFail: [leaf(17)] } as AuthorCommand

const body = [leaf(10), branch, loop, confirm, battle, teleport]

describe('S01 七类子键 get 与 parse', () => {
  test('get 按 kind 命中；错配 kind/越界/缺下标 undefined', () => {
    expect(getAuthorCommandAt(body, [1, 'then', 0])).toEqual(leaf(11))
    expect(getAuthorCommandAt(body, [1, 'else', 0])).toEqual(leaf(12))
    expect(getAuthorCommandAt(body, [2, 'body', 0])).toEqual(leaf(13))
    expect(getAuthorCommandAt(body, [3, 'onNo', 0])).toEqual(leaf(14))
    expect(getAuthorCommandAt(body, [4, 'onLose', 0])).toEqual(leaf(15))
    expect(getAuthorCommandAt(body, [4, 'onFlee', 0])).toEqual(leaf(16))
    expect(getAuthorCommandAt(body, [5, 'onFail', 0])).toEqual(leaf(17))
    // 错配：branch 没有 body；loop 没有 then；越界下标；路径以键开头
    expect(getAuthorCommandAt(body, [1, 'body', 0])).toBeUndefined()
    expect(getAuthorCommandAt(body, [2, 'then', 0])).toBeUndefined()
    expect(getAuthorCommandAt(body, [9])).toBeUndefined()
    expect(getAuthorCommandAt(body, [-1])).toBeUndefined()
    expect(authorCommandChildBody(branch, 'onNo')).toBeUndefined()
  })
  test('parse：合法键/下标；非法段抛错', () => {
    expect(parseAuthorCommandPath('1/then/0')).toEqual([1, 'then', 0])
    expect(parseAuthorCommandPath('')).toEqual([])
    expect(() => parseAuthorCommandPath('1/oops/0')).toThrow('非法 canonical 指令路径 1/oops/0')
    expect(() => parseAuthorCommandPath('1/1.5')).toThrow('非法 canonical 指令路径 1/1.5')
  })
})

describe('S01 顶层叶越界与 move 边界', () => {
  test('越界 update/remove 返回等值副本（非原引用）；合法 update 克隆不别名调用方 command', () => {
    const bodySnapshot = structuredClone(body)
    const replacement = leaf(18)
    const updated = updateAuthorCommandAt(body, [9], replacement)
    expect(updated).toEqual(body)
    expect(updated).not.toBe(body)
    const removed = removeAuthorCommandAt(body, [-2])
    expect(removed).toEqual(body)
    expect(removed).not.toBe(body)
    // 合法 update：改 replacement 不影响输出（内部 structuredClone）
    const ok = updateAuthorCommandAt(body, [0], replacement)
    ;(replacement as unknown as { ms: number }).ms = 999
    expect((ok[0] as unknown as { ms: number }).ms).toBe(18)
    expect(structuredClone(body)).toEqual(bodySnapshot)
  })
  test('move 边界（首上移/尾下移/非法路径）返回原数组引用；合法移动重排', () => {
    expect(moveAuthorCommandAt(body, [0], -1)).toBe(body)
    expect(moveAuthorCommandAt(body, [5], 1)).toBe(body)
    expect(moveAuthorCommandAt(body, ['then'], 1)).toBe(body)
    const moved = moveAuthorCommandAt(body, [0], 1)
    expect(
      moved.map((command) => (command as unknown as { ms?: number }).ms ?? command.kind),
    ).toEqual(['branch', 10, 'loop', 'confirm', 'startBattle', 'teleportOut'])
    expect(moved).not.toBe(body)
  })
})
