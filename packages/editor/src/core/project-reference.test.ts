import { describe, expect, test } from 'vitest'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
  type ProjectReferenceEdgeInput,
  type ProjectReferenceTarget,
  projectReferenceSourceOwnerKey,
  projectReferenceTargetKey,
} from './project-reference.js'

const unavailable = { kind: 'unavailable', reason: '只读来源' } as const

function edge(
  target: ProjectReferenceTarget,
  options: Partial<ProjectReferenceEdgeInput> = {},
): ProjectReferenceEdgeInput {
  return {
    target,
    source: createProjectReferenceSource({ kind: 'scene', id: 'source' }, '来源场景', {
      deletedWith: [{ kind: 'scene', id: 'source' }],
    }),
    relation: { kind: 'command-target', use: 'load-scene' },
    where: 'scenes.source.command.scene',
    locator: unavailable,
    deletePolicy: 'block',
    ...options,
  }
}

describe('project reference contract', () => {
  test('uses tuple keys without delimiter collisions or display/path identity', () => {
    expect(projectReferenceTargetKey({ kind: 'scene', id: 'a:b/c' })).not.toBe(
      projectReferenceTargetKey({ kind: 'scene', id: 'a:b' }),
    )
    expect(projectReferenceTargetKey({ kind: 'entity', sceneId: 'a:b', entityId: 'c/d' })).not.toBe(
      projectReferenceTargetKey({ kind: 'entity', sceneId: 'a', entityId: 'b:c/d' }),
    )
    expect(projectReferenceSourceOwnerKey({ kind: 'runtime-world' })).toBe('["runtime-world"]')
    expect(createProjectReferenceSource({ kind: 'scene', id: 'same' }, '显示名甲').key).toBe(
      createProjectReferenceSource({ kind: 'scene', id: 'same' }, '显示名乙').key,
    )
  })

  test('interns deterministic tables and rejects inconsistent definitions for one source', () => {
    const first = edge({ kind: 'scene', id: 'target' })
    const duplicate = structuredClone(first)
    const snapshot = buildProjectReferenceSnapshot([duplicate, first])
    expect(snapshot.rows).toHaveLength(1)
    expect(snapshot.sources).toHaveLength(1)
    expect(snapshot.targetKeys).toEqual([...snapshot.targetKeys].sort())

    expect(() =>
      buildProjectReferenceSnapshot([
        first,
        {
          ...edge({ kind: 'scene', id: 'other' }),
          source: { ...first.source, label: '冲突显示名' },
        },
      ]),
    ).toThrow(/定义不一致/)
  })

  test('indexes one composite entity edge under entity and ancestor scene without duplicating rows', () => {
    const target = { kind: 'entity', sceneId: 'target', entityId: 'guard' } as const
    const snapshot = buildProjectReferenceSnapshot([
      edge(target, {
        relation: { kind: 'entity-address' },
        where: 'address',
        deletePolicy: 'replace-suggest',
      }),
    ])
    const index = createProjectReferenceIndex(snapshot)
    expect(snapshot.rows).toHaveLength(1)
    expect(index.referencesTo(target)).toHaveLength(1)
    expect(index.referencesTo({ kind: 'scene', id: 'target' })).toHaveLength(1)
    expect(index.referencesTo({ kind: 'scene', id: 'target' })[0]?.id).toBe(
      index.referencesTo(target)[0]?.id,
    )
  })

  test('deletion impact blocks block/replace-suggest, preserves warn and excludes explicit sources', () => {
    const target = { kind: 'scene', id: 'target' } as const
    const external = edge(target)
    const replace = edge(target, {
      source: createProjectReferenceSource({ kind: 'scene', id: 'other' }, '另一场景'),
      where: 'replace',
      deletePolicy: 'replace-suggest',
    })
    const warning = edge(target, {
      source: createProjectReferenceSource({ kind: 'runtime-world' }, '运行态'),
      where: 'runtime',
      deletePolicy: 'warn',
    })
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot([external, replace, warning]),
    )
    const all = index.deletionImpact(target)
    expect(all.blockers.map((reference) => reference.where)).toEqual([
      'scenes.source.command.scene',
      'replace',
    ])
    expect(all.warnings.map((reference) => reference.where)).toEqual(['runtime'])

    const withoutSelf = index.deletionImpact(target, {
      removedSourceKeys: new Set([external.source.key]),
    })
    expect(withoutSelf.references.map((reference) => reference.where)).toEqual([
      'replace',
      'runtime',
    ])
  })

  test('A↔B scope excludes A sources while preserving B→A', () => {
    const sceneA = { kind: 'scene', id: 'a' } as const
    const sourceA = createProjectReferenceSource({ kind: 'scene', id: 'a' }, 'A', {
      deletedWith: [sceneA],
    })
    const sourceB = createProjectReferenceSource({ kind: 'scene', id: 'b' }, 'B', {
      deletedWith: [{ kind: 'scene', id: 'b' }],
    })
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot([
        edge({ kind: 'scene', id: 'b' }, { source: sourceA, where: 'A→B' }),
        edge(sceneA, { source: sourceB, where: 'B→A' }),
        edge(sceneA, { source: sourceA, where: 'A→A' }),
      ]),
    )
    const scope = index.deletionScopeFor([sceneA])
    expect([...scope.removedSourceKeys]).toEqual([sourceA.key])
    const impact = index.deletionImpact(sceneA, scope)
    expect(impact.blockers.map((reference) => reference.where)).toEqual(['B→A'])
  })
})
