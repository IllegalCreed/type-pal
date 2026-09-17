/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 D4/D5：current provider 与真实删除命令闭环
 * （project-reference-adapters.ts:1878-1950 + DeleteWorldVariable/DeleteActor 实链）。
 * 既有 project-reference-adapters.test.ts 已覆盖结构边/命令域关系/legacy 只读阻断。
 * 本文件补：current provider 对最小真实 EditorState 产出可查询索引、
 * 真实 Delete 命令经 provider 阻断/放行→undo 闭环、provider 输入不被污染。
 */
import { describe, expect, test } from 'vitest'
import { baseState, deepSnapshot } from './__tests__/glm-editor-logic-fixtures.js'
import {
  DeleteActorCommand,
  DeleteWorldVariableCommand,
  WorldVariableInUseError,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

function referencedState(): EditorState {
  return baseState({
    worldVariables: {
      used: { kind: 'flag', name: '被引用', description: '', initial: false },
      unused: { kind: 'number', name: '未引用', description: '', initial: 0 },
    },
    sharedScripts: {
      main: {
        name: '主线',
        self: 'none',
        body: [{ kind: 'setFlag', flag: 'used', value: true }],
      },
    },
    actors: [{ id: 'hero', name: 'name.hero', spriteId: 'sprite.hero' }],
    sprites: [
      { id: 'sprite.hero', asset: 'sprite.hero.png', label: '主角', layout: { kind: 'static' } },
    ],
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'e1', actor: 'hero', pos: { col: 1, row: 1, height: 0 } }],
      },
    ],
  })
}

describe('D4 current provider · 真实 state', () => {
  test('最小真实 state 产出可查询索引：世界变量引用命中、未引用为零', () => {
    const s0 = referencedState()
    const before = deepSnapshot(s0)
    const index = collectCurrentProjectReferenceIndex(s0)
    const used = index.referencesTo({ kind: 'world-variable', id: 'used' })
    expect(used.length).toBeGreaterThanOrEqual(1)
    expect(used.every((edge) => edge.source.label.length > 0)).toBe(true)
    expect(index.referencesTo({ kind: 'world-variable', id: 'unused' })).toEqual([])
    // provider 不污染输入（深快照对账）
    expect(s0).toEqual(before)
  })
})

describe('D5 真实删除命令 → provider 阻断/放行 → undo 闭环', () => {
  test('被引用世界变量：阻断并保留；未引用：删除→undo 完整恢复', () => {
    const s0 = referencedState()
    expect(() =>
      new DeleteWorldVariableCommand('used', collectCurrentProjectReferenceIndex).apply(s0),
    ).toThrow(WorldVariableInUseError)
    const command = new DeleteWorldVariableCommand('unused', collectCurrentProjectReferenceIndex)
    const s1 = command.apply(s0)
    expect(s1.worldVariables).not.toHaveProperty('unused')
    expect(s1.worldVariables?.used).toBeDefined()
    const s2 = command.invert(s1)
    expect(s2.worldVariables?.unused).toEqual({
      kind: 'number',
      name: '未引用',
      description: '',
      initial: 0,
    })
  })
  test('被实体引用的 actor 阻断（provider 真实阻断链）', () => {
    const s0 = referencedState()
    expect(() =>
      new DeleteActorCommand('hero', collectCurrentProjectReferenceIndex).apply(s0),
    ).toThrow(/仍被 \d+ 处引用/)
  })
})
