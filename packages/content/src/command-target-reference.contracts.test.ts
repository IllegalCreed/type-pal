/**
 * TEST-CONTENT-CONTRACTS-1 E6/E7：command-target typed 引用与 rewrite（command-target-reference.ts:111-340）。
 * 各现行 tag、显式 EntityAddress、整树/canonical 分域、rewrite 只改 typed 自身 scene。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  collectCanonicalCommandTargetReferences,
  collectCommandTargetReferences,
  rewriteExplicitSceneReferences,
} from './command-target-reference.js'

const entityAddress = () => ({ scene: 's1', entity: 'e1' })
const loadScene = () => ({ kind: 'loadScene', scene: 's1', entryId: 'main' })
const currentScene = () => ({ kind: 'currentScene', scene: 's1' })

describe('E6 commandTargetReferences · typed tag 与 EntityAddress', () => {
  test('显式 EntityAddress 产出 entity 目标；loadScene 产出 scene+scene-entry 双边', () => {
    const tree = [entityAddress(), loadScene()]
    const refs = collectCommandTargetReferences(tree, 'body')
    const targets = refs.map((r) => r.target.kind)
    expect(targets).toEqual(['entity', 'scene', 'scene-entry'])
    expect(refs[0]).toMatchObject({
      target: { kind: 'entity', sceneId: 's1', entityId: 'e1' },
      relation: 'entity-address',
    })
  })
  test('currentScene 条件边；空值/错型不产生假边', () => {
    const refs = collectCommandTargetReferences(
      [currentScene(), { kind: 'loadScene' }, { scene: '', entity: 'x' }],
      'b',
    )
    // {kind:'loadScene'} 无 scene、空 sceneId EntityAddress → 不产边
    expect(refs.map((r) => r.relation)).toEqual(['condition-current-scene'])
  })
  test('整树 vs canonical 分域：canonical 只取叶+target/cond，不递归嵌套数组臂', () => {
    const command = {
      kind: 'branch',
      cond: { kind: 'currentScene', scene: 's1' },
      then: [loadScene()],
      self: { scene: 's1', entity: 'e1' },
    }
    const full = collectCommandTargetReferences(command, 'cmd')
    expect(full.map((r) => r.relation)).toContain('load-scene') // 整树命中嵌套臂
    const canonical = collectCanonicalCommandTargetReferences(command, 'cmd')
    expect(canonical.map((r) => r.relation)).not.toContain('load-scene') // canonical 不递归 then
    expect(canonical.map((r) => r.relation)).toContain('condition-current-scene') // cond 在域内
  })
})

describe('E7 rewriteExplicitSceneReferences · 只改 typed 自身 scene', () => {
  test('typed scene 全部改写；普通文字/外部 scene 不改；输入不被污染；完整树预期', () => {
    const tree = {
      command: { kind: 'loadScene', scene: 's1', entryId: 'main' },
      label: '前往 s1', // 普通文字
      outer: { kind: 'currentScene', scene: 's2' }, // 外部 scene
      nested: [{ scene: 's1', entity: 'e1' }],
    }
    const before = deepSnapshot(tree)
    const rewritten = rewriteExplicitSceneReferences(tree, 's1', 's9')
    expect(rewritten.command.scene).toBe('s9')
    expect(rewritten.label).toBe('前往 s1') // 普通文字不改
    expect(rewritten.outer.scene).toBe('s2') // 外部 scene 不改
    expect(rewritten.nested[0]!.scene).toBe('s9')
    expect(tree).toEqual(before) // 输入不变
  })
})
