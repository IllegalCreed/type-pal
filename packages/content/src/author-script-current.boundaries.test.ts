/**
 * TEST-FOUNDATION-COVERAGE-1 B5：当前作者脚本入口的选项与 stage/state 机边界
 * （author-script.ts:115-159 包装；author-script-core.ts:612-628/950-995 实现）。
 * 既有 author-script-core.test.ts 已覆盖选择/cursor/条件/战斗编排/转移/SCC/分页/scene-entry
 * 归属；本文件补 allowSceneEntry/forbidLoadScene 两个选项门与 stage 机基础 where 路径
 * （重复 id/initial 未命中/next 未命中），全部经当前 checkAuthor* 入口触达。
 */
import { describe, expect, test } from 'vitest'
import { checkAuthorCommands, checkAuthorScriptFlow } from './author-script.js'

const stagesFlow = (stages: unknown[], initial = 'start') => ({
  kind: 'stages' as const,
  initial,
  stages,
})

describe('checkAuthorScriptFlow · 选项门', () => {
  test('最小 stages 流通过；entry 缺席是普通 stage 的合法形态', () => {
    expect(() => checkAuthorScriptFlow(stagesFlow([{ id: 'start', body: [] }]), 'flow')).not.toThrow()
  })

  test('未开 allowSceneEntry 时 entry 拒绝', () => {
    expect(() =>
      checkAuthorScriptFlow(
        stagesFlow([{ id: 'start', entry: { prepare: [], reveal: { kind: 'fade' } }, body: [] }]),
        'flow',
      ),
    ).toThrow(/只允许 onEnter initial stage/)
  })

  test('开 allowSceneEntry 后仅 initial stage 可携带 entry；非 initial 拒绝', () => {
    expect(() =>
      checkAuthorScriptFlow(
        stagesFlow([
          { id: 'start', entry: { prepare: [], reveal: { kind: 'fade' } }, body: [] },
          { id: 'later', body: [] },
        ]),
        'flow',
        { allowSceneEntry: true },
      ),
    ).not.toThrow()
    expect(() =>
      checkAuthorScriptFlow(
        stagesFlow([
          { id: 'start', body: [] },
          { id: 'later', entry: { prepare: [], reveal: { kind: 'fade' } }, body: [] },
        ]),
        'flow',
        { allowSceneEntry: true },
      ),
    ).toThrow(/stages\[1\]\.entry: 只允许 onEnter initial stage/)
  })

  test('forbidLoadScene 开启时 loadScene 命令拒绝；关闭时通过', () => {
    const loadScene = {
      kind: 'loadScene',
      scene: 's002',
      transition: { kind: 'modern', outMs: 260, inMs: 260, color: 'black' },
    }
    const withLoad = stagesFlow([{ id: 'start', body: [loadScene] }])
    expect(() => checkAuthorScriptFlow(withLoad, 'flow', { forbidLoadScene: true })).toThrow(
      /禁止 loadScene/,
    )
    expect(() => checkAuthorScriptFlow(withLoad, 'flow')).not.toThrow()
  })
})

describe('checkAuthorScriptFlow · stage 机 where 路径', () => {
  test('重复 stage id 拒绝且 where 含重复值', () => {
    expect(() =>
      checkAuthorScriptFlow(stagesFlow([{ id: 'start', body: [] }, { id: 'start', body: [] }]), 'flow'),
    ).toThrow(/stages\[1\]\.id: 重复 start/)
  })
  test('initial 未命中拒绝', () => {
    expect(() => checkAuthorScriptFlow(stagesFlow([{ id: 'start', body: [] }], 'gone'), 'flow')).toThrow(
      /initial: 未命中 stage gone/,
    )
  })
  test('next 指向不存在 stage 拒绝', () => {
    expect(() =>
      checkAuthorScriptFlow(stagesFlow([{ id: 'start', body: [], next: 'gone' }]), 'flow'),
    ).toThrow(/stages\[0\]\.next: 未命中 stage gone/)
  })
})

describe('checkAuthorCommands · 数组门', () => {
  test('非数组拒绝；空命令数组合法', () => {
    expect(() => checkAuthorCommands({}, 'cmds')).toThrow(/期望/)
    expect(() => checkAuthorCommands([], 'cmds')).not.toThrow()
  })
  test('未知/已退役命令拒绝且 where 精确', () => {
    expect(() => checkAuthorCommands([{ kind: 'legacyThing' }], 'cmds')).toThrow(
      /cmds\[0\]\.kind: 未知或已退役/,
    )
  })
})
