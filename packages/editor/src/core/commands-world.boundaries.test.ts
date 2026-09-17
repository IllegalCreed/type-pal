/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 A1：世界变量命令边界（commands.ts:129-243）。
 * 既有 world-variable-commands.test.ts 已覆盖：增/改参与 undo、同值 no-op 不留历史、
 * 被引用删除阻断与未引用删除可撤销。本文件补：缺目标 no-op、invert 被占用拒绝、
 * apply→invert→reapply 往返、合法 false/0/空 description、独立深快照与未触域保持。
 */
import { describe, expect, test } from 'vitest'
import { baseState, deepSnapshot } from './__tests__/glm-editor-logic-fixtures.js'
import {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const registry = () => ({
  used: { kind: 'flag' as const, name: '被引用', description: '', initial: false },
  unusedNumber: { kind: 'number' as const, name: '未引用', description: '', initial: 0 },
  unusedFlag: { kind: 'flag' as const, name: '未引用旗', description: '', initial: true },
})

function state(): EditorState {
  return baseState({
    worldVariables: registry() as EditorState['worldVariables'],
    sharedScripts: {
      main: {
        name: '主线',
        self: 'none',
        body: [{ kind: 'setFlag', flag: 'used', value: true }],
      },
    } as EditorState['sharedScripts'],
  })
}

describe('AddWorldVariableCommand · 边界', () => {
  test('重复 id no-op：apply/invert 幂等返回原引用对象（直接调用合同，不经 dispatch 历史）', () => {
    const session = new EditSession(state())
    const first = new AddWorldVariableCommand('used', {
      kind: 'flag',
      name: '旧名',
      description: '',
      initial: false,
    })
    const s0 = session.getState()
    expect(first.apply(s0)).toBe(s0) // 已存在 → 原样返回（同引用），无副作用
    expect(first.invert(s0)).toBe(s0) // 未 added → invert 也原样
  })
  test('合法零值/false/空 description 全字段保真 + invert 完整移除', () => {
    const session = new EditSession(state())
    session.dispatch(
      new AddWorldVariableCommand('zero', {
        kind: 'number',
        name: '零',
        description: '',
        initial: 0,
      }),
    )
    expect(session.getState().worldVariables?.zero).toEqual({
      kind: 'number',
      name: '零',
      description: '',
      initial: 0,
    })
    expect(session.undo()).toBe(true)
    expect(session.getState().worldVariables).not.toHaveProperty('zero')
  })
})

describe('UpdateWorldVariableCommand · 边界', () => {
  test('缺目标 no-op（不抛错、状态原样、invert 原样）', () => {
    const command = new UpdateWorldVariableCommand('ghost', {
      kind: 'number',
      name: '幽灵',
      description: '',
      initial: 1,
    })
    const s0 = state()
    const before = deepSnapshot(s0)
    expect(command.apply(s0)).toBe(s0)
    expect(command.invert(s0)).toBe(s0)
    expect(s0).toEqual(before) // 输入未被污染
  })
})

describe('DeleteWorldVariableCommand · 边界', () => {
  test('缺目标 no-op', () => {
    const command = new DeleteWorldVariableCommand('ghost', collectCurrentProjectReferenceIndex)
    const s0 = state()
    expect(command.apply(s0)).toBe(s0)
  })
  test('invert 遇 id 已被占用：显式拒绝（现行合同）', () => {
    const command = new DeleteWorldVariableCommand(
      'unusedNumber',
      collectCurrentProjectReferenceIndex,
    )
    const s1 = command.apply(state())
    expect(s1.worldVariables).not.toHaveProperty('unusedNumber')
    // 占用者出现后再 invert
    const occupied: EditorState = {
      ...s1,
      worldVariables: {
        ...s1.worldVariables,
        unusedNumber: { kind: 'number', name: '占用者', description: '', initial: 9 },
      },
    }
    expect(() => command.invert(occupied)).toThrow(/无法撤销删除：变量 id 已被占用 unusedNumber/)
  })
})

describe('apply → invert → reapply 往返（独立深快照）', () => {
  test('删除未引用变量后完整恢复，再删仍一致；未触域深相等', () => {
    const s0 = state()
    const before = deepSnapshot(s0)
    const command = new DeleteWorldVariableCommand(
      'unusedFlag',
      collectCurrentProjectReferenceIndex,
    )
    const s1 = command.apply(s0)
    expect(s1.worldVariables).not.toHaveProperty('unusedFlag')
    expect(s1.sceneIndex).toEqual(before.sceneIndex)
    expect(s1.manifest).toEqual(before.manifest)
    const s2 = command.invert(s1)
    expect(s2.worldVariables?.unusedFlag).toEqual(before.worldVariables?.unusedFlag)
    const s3 = command.apply(s2)
    expect(s3.worldVariables).not.toHaveProperty('unusedFlag')
    // 深快照自证：改 before 不影响任何状态
    before.worldVariables!.used!.name = '被改'
    expect(s0.worldVariables?.used?.name).toBe('被引用')
    expect(s2.worldVariables?.used?.name).toBe('被引用')
  })
})
