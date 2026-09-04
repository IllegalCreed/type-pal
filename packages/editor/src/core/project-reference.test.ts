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
    expect(snapshot.targets.map((target) => JSON.stringify(target))).toEqual(
      snapshot.targets.map((target) => JSON.stringify(target)).sort(),
    )

    expect(() =>
      buildProjectReferenceSnapshot([
        first,
        {
          ...edge({ kind: 'scene', id: 'other' }),
          source: { ...first.source, label: '冲突显示名' },
        },
      ]),
    ).toThrow(/定义不一致/)
    expect(() =>
      buildProjectReferenceSnapshot([
        { ...first, source: { ...first.source, key: 'display-derived-or-random' } },
      ]),
    ).toThrow(/不是 owner\/section 的稳定派生 key/)
  })

  test('keeps arbitrary action ids collision-free while interning relation rows', () => {
    const first = edge(
      { kind: 'world-sprite-action', spriteId: 'sprite', actionId: 'a:b' },
      {
        relation: { kind: 'world-sprite-action-use', actionId: 'a:b' },
        where: 'first',
      },
    )
    const second = edge(
      { kind: 'world-sprite-action', spriteId: 'sprite', actionId: 'a' },
      {
        relation: { kind: 'world-sprite-action-use', actionId: 'a\0b' },
        where: 'second',
      },
    )
    const snapshot = buildProjectReferenceSnapshot([first, second])
    expect(snapshot.relations).toEqual([
      { kind: 'world-sprite-action-use', actionId: 'a:b' },
      { kind: 'world-sprite-action-use', actionId: 'a\0b' },
    ])
  })

  test('omits derived source/target keys and interns repeated detail without changing decoded edges', () => {
    const source = createProjectReferenceSource({ kind: 'scene', id: 'source' }, '来源场景', {
      section: 'battle-data',
      deletedWith: [{ kind: 'scene', id: 'source' }],
    })
    const snapshot = buildProjectReferenceSnapshot([
      edge({ kind: 'skill', id: 'one' }, { source, where: 'source.one', detail: '重复说明' }),
      edge({ kind: 'skill', id: 'two' }, { source, where: 'source.two', detail: '重复说明' }),
    ])
    expect('targetKeys' in snapshot).toBe(false)
    expect('key' in snapshot.sources[0]!).toBe(false)
    expect(snapshot.sources[0]?.[0]).toEqual([2, 'source'])
    expect(snapshot.sources[0]?.[4]).toBe('source.')
    expect(snapshot.whereSuffixes).toEqual(['one', 'two'])
    expect(snapshot.rows.map((row) => row[4])).toEqual([0, 1])
    expect('deletionTargets' in snapshot).toBe(false)
    expect(snapshot.targets).not.toContainEqual([2, 'source'])
    expect(snapshot.details).toEqual(['重复说明'])
    expect(snapshot.rows.map((row) => row[5])).toEqual([0, 0])
    const decoded = createProjectReferenceIndex(snapshot).allReferences()
    expect(decoded.map((reference) => reference.detail)).toEqual(['重复说明', '重复说明'])
    expect(decoded.map((reference) => reference.where)).toEqual(['source.one', 'source.two'])
    expect(decoded.every((reference) => reference.source.key === source.key)).toBe(true)
  })

  test('compact locators round-trip every variant and only retain a distinct canonical path', () => {
    const commandLocator = {
      kind: 'command',
      owner: { kind: 'shared-script', scriptId: 'shared/test' },
      container: { kind: 'body' },
      commandPath: '0',
    } as const
    const canonicalSource = createProjectReferenceSource(
      { kind: 'script-owner', owner: commandLocator.owner },
      '共享脚本 shared/test',
      { deletedWith: [{ kind: 'shared-script', id: 'shared/test' }] },
    )
    const inputs: ProjectReferenceEdgeInput[] = [
      edge(
        { kind: 'skill', id: 'exact' },
        {
          source: canonicalSource,
          where: 'shared.test.body[0].skill',
          locator: {
            kind: 'canonical-script',
            reference: {
              kind: 'command',
              path: 'shared.test.body[0].skill',
              locator: commandLocator,
            },
          },
        },
      ),
      edge(
        { kind: 'skill', id: 'root-path' },
        {
          source: canonicalSource,
          where: 'shared.test.body[0].skill',
          locator: {
            kind: 'canonical-script',
            reference: { kind: 'command', path: 'shared.test.body[0]', locator: commandLocator },
          },
        },
      ),
      edge(
        { kind: 'actor', id: 'object' },
        {
          where: 'object',
          locator: {
            kind: 'object',
            object: { kind: 'actor', id: 'object' },
            section: 'relationships',
          },
        },
      ),
      edge(
        { kind: 'actor', id: 'owner' },
        {
          where: 'owner',
          locator: {
            kind: 'script-owner',
            owner: {
              kind: 'entity-behavior',
              sceneId: 'scene',
              entityId: 'entity',
              channel: 'trigger',
              behaviorId: 'default',
            },
          },
        },
      ),
      edge(
        { kind: 'world-sprite-action', spriteId: 'sprite', actionId: 'idle' },
        {
          where: 'page',
          locator: { kind: 'scene-page', sceneId: 'scene', entityId: 'entity', pageId: 'page' },
        },
      ),
      edge(
        { kind: 'actor', id: 'nul-one' },
        {
          where: 'nul-one',
          locator: {
            kind: 'object',
            object: { kind: 'entity', sceneId: 'a\0b', entityId: 'c' },
          },
        },
      ),
      edge(
        { kind: 'actor', id: 'nul-two' },
        {
          where: 'nul-two',
          locator: {
            kind: 'object',
            object: { kind: 'entity', sceneId: 'a', entityId: 'b\0c' },
          },
        },
      ),
      edge({ kind: 'actor', id: 'readonly' }, { where: 'readonly', locator: unavailable }),
    ]
    const snapshot = buildProjectReferenceSnapshot(inputs)
    const canonicalLocators = snapshot.locators.filter((locator) => locator[0] === 1)
    expect(canonicalLocators.map((locator) => locator.length)).toEqual([3, 4])
    expect(
      createProjectReferenceIndex(snapshot)
        .allReferences()
        .map((reference) => reference.locator),
    ).toEqual(inputs.map((input) => input.locator))
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

  test('compact source sentinel preserves an explicit empty label', () => {
    const source = createProjectReferenceSource({ kind: 'scene', id: 'source' }, '')
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot([
        edge({ kind: 'scene', id: 'target' }, { source, where: 'empty-label' }),
      ]),
    )

    expect(index.allReferences()[0]?.source.label).toBe('')
  })

  test('world action aliases its definition unless the source is deleted with that definition', () => {
    const definition = { kind: 'world-sprite', id: 'sprite' } as const
    const action = { kind: 'world-sprite-action', spriteId: 'sprite', actionId: 'wave' } as const
    const external = edge(action, {
      relation: { kind: 'world-sprite-action-use', actionId: 'wave' },
      where: 'external.action',
    })
    const owned = edge(action, {
      source: createProjectReferenceSource(
        { kind: 'world-sprite', id: 'sprite' },
        '世界精灵 sprite',
        {
          deletedWith: [definition],
        },
      ),
      relation: { kind: 'world-sprite-action-use', actionId: 'wave' },
      where: 'owned.action',
    })
    const index = createProjectReferenceIndex(buildProjectReferenceSnapshot([external, owned]))

    expect(index.referencesTo(action).map((reference) => reference.where)).toEqual([
      'external.action',
      'owned.action',
    ])
    expect(index.referencesTo(definition).map((reference) => reference.where)).toEqual([
      'external.action',
    ])
    expect(index.referencesTo(action)[0]?.id).toBe(index.referencesTo(definition)[0]?.id)
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
