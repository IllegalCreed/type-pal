/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 D1～D3：引用快照/索引/删除守卫纯函数边界
 * （project-reference.ts:1012-1330）。既有 project-reference.test.ts 已覆盖键防碰撞、
 * 表内嵌、locator 往返、复合实体边、deletion impact 的 block/warn 基础与 A↔B scope。
 * 本文件补：多目标/多来源代表性矩阵的 referencesTo/allReferences 精确往返、
 * deletionScopeFor 自删来源与真正外部引用分开、blockers/warnings 分栏、输入顺序无关性。
 */
import { describe, expect, test } from 'vitest'
import {
  buildProjectReferenceSnapshot,
  type ProjectReferenceEdgeInput,
  ProjectReferenceIndex,
  type ProjectReferenceSource,
  type ProjectReferenceTarget,
} from './project-reference.js'

const target = { kind: 'actor', id: 'hero' } as const satisfies ProjectReferenceTarget
const otherTarget = { kind: 'item', id: 'sword' } as const satisfies ProjectReferenceTarget

/** 稳定 key 必须由 owner/section 派生（D1 合同：key 不是任意字符串）。
 * scene owner 的 ownerKey = tupleKey([kind, id])，最终 key = tupleKey([ownerKey, section ?? ''])。 */
const source = (sceneId: string, deletedWith: string[] = []): ProjectReferenceSource => ({
  key: JSON.stringify([JSON.stringify(['scene', sceneId]), '']),
  owner: { kind: 'scene', id: sceneId },
  label: `来源${sceneId}`,
  deletedWith,
})

const edge = (
  partial: Partial<ProjectReferenceEdgeInput> &
    Pick<ProjectReferenceEdgeInput, 'target' | 'source'>,
): ProjectReferenceEdgeInput => ({
  relation: { kind: 'entity-address' },
  where: '场景/引用点',
  locator: { kind: 'object', object: target },
  deletePolicy: 'block',
  ...partial,
})

describe('D1 稳定 key 合同', () => {
  test('非 owner/section 派生的 source key 拒绝（现行合同）', () => {
    const badSource = {
      key: 'arbitrary-string',
      owner: { kind: 'scene', id: 's1' } as ProjectReferenceSource['owner'],
      label: '假来源',
      deletedWith: [],
    }
    expect(() => buildProjectReferenceSnapshot([edge({ target, source: badSource })])).toThrow(
      /不是 owner\/section 的稳定派生 key/,
    )
  })
})

describe('D1/D2 snapshot→index 精确往返', () => {
  test('多目标/多来源：referencesTo 按 target 分桶、allReferences 保全、detail/where/locator 逐字段往返', () => {
    const edges: ProjectReferenceEdgeInput[] = [
      edge({ target, source: source('s-a'), where: '场景一/对话', detail: '第 3 行' }),
      edge({
        target,
        source: source('s-b'),
        deletePolicy: 'warn',
        relation: { kind: 'entity-address' },
        locator: { kind: 'object', object: otherTarget },
      }),
      edge({ target: otherTarget, source: source('s-a'), deletePolicy: 'replace-suggest' }),
    ]
    const index = new ProjectReferenceIndex(buildProjectReferenceSnapshot(edges))
    const toHero = index.referencesTo(target)
    expect(toHero).toHaveLength(2)
    expect(toHero.map((e) => e.source.label)).toEqual(['来源s-a', '来源s-b'])
    expect(toHero[0]!.detail).toBe('第 3 行')
    expect(toHero[0]!.where).toBe('场景一/对话')
    expect(toHero[0]!.locator).toEqual({ kind: 'object', object: target })
    expect(toHero[1]!.deletePolicy).toBe('warn')
    expect(index.referencesTo(otherTarget)).toHaveLength(1)
    expect(index.allReferences()).toHaveLength(3)
    // 未知目标 → 空数组（已定义）
    expect(index.referencesTo({ kind: 'actor', id: 'ghost' })).toEqual([])
  })
  test('输入顺序无关：同一边集任意排列产生等价查询结果', () => {
    const edges: ProjectReferenceEdgeInput[] = [
      edge({ target, source: source('s-a') }),
      edge({ target: otherTarget, source: source('s-b') }),
      edge({ target, source: source('s-c'), deletePolicy: 'warn' }),
    ]
    const forward = new ProjectReferenceIndex(buildProjectReferenceSnapshot(edges))
    const reversed = new ProjectReferenceIndex(buildProjectReferenceSnapshot([...edges].reverse()))
    const key = (e: { source: { label: string }; deletePolicy: string }) =>
      `${e.source.label}:${e.deletePolicy}`
    expect(forward.referencesTo(target).map(key).sort()).toEqual(
      reversed.referencesTo(target).map(key).sort(),
    )
  })
})

describe('D3 deletionImpact / deletionScopeFor', () => {
  test('blockers/warnings 分栏：warn 不阻断、block/replace-suggest 阻断', () => {
    const edges: ProjectReferenceEdgeInput[] = [
      edge({ target, source: source('s-blocker'), deletePolicy: 'block' }),
      edge({ target, source: source('s-warner'), deletePolicy: 'warn' }),
      edge({ target, source: source('s-suggester'), deletePolicy: 'replace-suggest' }),
    ]
    const index = new ProjectReferenceIndex(buildProjectReferenceSnapshot(edges))
    const impact = index.deletionImpact(target)
    expect(impact.blockers.map((e) => e.source.label).sort()).toEqual([
      '来源s-blocker',
      '来源s-suggester',
    ])
    expect(impact.warnings.map((e) => e.source.label)).toEqual(['来源s-warner'])
    expect(impact.references).toHaveLength(3)
  })
  test('deletionScopeFor：自身随删来源被排除，真正外部引用保留', () => {
    // s-owned 的 deletedWith 指向被删 target 的现行 tuple key → 随删；s-external 指向其它 target key
    const heroKey = JSON.stringify(['actor', 'hero']) // tupleKey 形态，非猜保留前缀
    const edges: ProjectReferenceEdgeInput[] = [
      edge({ target, source: { ...source('s-owned'), deletedWith: [heroKey] } }),
      edge({ target, source: source('s-external', [JSON.stringify(['item', 'other'])]) }),
    ]
    const index = new ProjectReferenceIndex(buildProjectReferenceSnapshot(edges))
    const scope = index.deletionScopeFor([target])
    const impact = index.deletionImpact(target, scope)
    // 随删来源的边被排除，外部引用保留
    expect(impact.references.map((e) => e.source.label)).toEqual(['来源s-external'])
  })
})
