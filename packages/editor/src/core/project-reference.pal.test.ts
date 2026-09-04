import {
  type FileSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { actorReferenceBlocksDeletion, collectActorReferences } from './actor-references.js'
import { collectBattleDataReferences } from './battle-data-references.js'
import { createEditorDerivedWorkerRuntime } from './editor-derived-core.js'
import { editorDiagnosticState } from './editor-derived-store.js'
import type { EntityAddressReferenceLocator } from './entity-address-references.js'
import { entityAddressReferenceBlocksDeletion } from './entity-address-references.js'
import { collectEditorDiagnosticsSnapshot } from './project-diagnostics.js'
import { toEditorState } from './project-io.js'
import { createProjectReferenceIndex, projectReferenceSourceOwnerKey } from './project-reference.js'

const rawJsonModules = import.meta.glob<string>('../../../../projects/pal/**/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const rawJson = new Map(
  Object.entries(rawJsonModules).map(([path, value]) => {
    const marker = '/projects/pal/'
    const offset = path.indexOf(marker)
    if (offset < 0) throw new Error(`PAL fixture 路径不在 projects/pal：${path}`)
    return [path.slice(offset + marker.length), value] as const
  }),
)
const readText = (path: string): string => {
  const value = rawJson.get(path)
  if (value === undefined) throw new Error(`PAL fixture 缺文件：${path}`)
  return value
}
const source: FileSource = {
  async readText(path: string): Promise<string> {
    return readText(path)
  },
  async readJson<T>(path: string): Promise<T> {
    return JSON.parse(readText(path)) as T
  },
  async readBytes(path: string): Promise<ArrayBuffer> {
    return new TextEncoder().encode(readText(path)).buffer
  },
  async urlFor(path: string): Promise<string> {
    return `fixture://${path}`
  },
}

function oldSourceKey(locator: EntityAddressReferenceLocator): string {
  switch (locator.kind) {
    case 'scene':
      return projectReferenceSourceOwnerKey({ kind: 'scene', id: locator.sceneId })
    case 'scene-entity':
      return projectReferenceSourceOwnerKey({
        kind: 'scene-entity',
        sceneId: locator.sceneId,
        entityId: locator.entityId,
      })
    case 'shared-script':
      return projectReferenceSourceOwnerKey({ kind: 'shared-script', id: locator.scriptId })
    case 'item':
      return projectReferenceSourceOwnerKey({ kind: 'item', id: locator.itemId })
    case 'enemy':
      return projectReferenceSourceOwnerKey({ kind: 'enemy', id: locator.enemyId })
    case 'world':
      return projectReferenceSourceOwnerKey({ kind: 'runtime-world' })
  }
}

describe('ED-3 PAL project reference index', () => {
  test('keeps blocker parity, named-entry/shop/map facts and compact worker payload', async () => {
    const project = await loadCurrentProjectFrom(source)
    const [scenes, stamps] = await Promise.all([
      loadAllAuthorScenes(project),
      loadStampTemplates(project),
    ])
    const state = toEditorState(project, scenes, {}, {}, stamps)
    const canonical = {
      scenes: structuredClone(scenes),
      items: structuredClone(project.authorContent.items),
      sharedScripts: structuredClone(project.authorContent.sharedScripts),
    }
    const diagnostics = collectEditorDiagnosticsSnapshot(state, canonical)
    const index = createProjectReferenceIndex(diagnostics.projectReferences)
    const edges = index.allReferences()

    expect(diagnostics.entityAddressReferences).toHaveLength(38_126)
    const expectedEntityBlockers = diagnostics.entityAddressReferences
      .filter((reference) =>
        entityAddressReferenceBlocksDeletion(reference, {
          scene: reference.sceneId,
          entity: reference.entityId,
        }),
      )
      .map(
        (reference) =>
          `${reference.sceneId}\0${reference.entityId}\0${oldSourceKey(reference.locator)}\0${reference.path}`,
      )
      .sort()
    const actualEntityBlockers = edges
      .filter((edge) => edge.relation.kind === 'entity-address')
      .map((edge) => {
        if (edge.target.kind !== 'entity') throw new Error('entity-address target 必须是 entity')
        return `${edge.target.sceneId}\0${edge.target.entityId}\0${projectReferenceSourceOwnerKey(
          edge.source.owner,
        )}\0${edge.where}`
      })
      .sort()
    expect(actualEntityBlockers).toEqual(expectedEntityBlockers)
    expect(actualEntityBlockers).toHaveLength(4_362)

    expect(
      edges.filter(
        (edge) =>
          edge.relation.kind === 'command-target' && edge.relation.use === 'load-scene-entry',
      ),
    ).toHaveLength(795)
    expect(edges.filter((edge) => edge.target.kind === 'shop')).toHaveLength(29)
    expect(
      edges.filter(
        (edge) =>
          edge.relation.kind === 'command-target' && edge.relation.use === 'scene-map-override',
      ),
    ).toHaveLength(2)
    expect(edges.filter((edge) => edge.relation.kind === 'battle-field-use')).toHaveLength(141)
    expect(edges.filter((edge) => edge.relation.kind === 'enemy-team-use')).toHaveLength(1_002)
    expect(edges.filter((edge) => edge.relation.kind === 'ambience-use')).toHaveLength(42)
    const battleDataEdges = edges.filter((edge) => edge.relation.kind === 'battle-data-use')
    expect(
      battleDataEdges.filter(
        (edge) => edge.relation.kind === 'battle-data-use' && edge.relation.target === 'skill',
      ),
    ).toHaveLength(338)
    expect(
      battleDataEdges.filter(
        (edge) => edge.relation.kind === 'battle-data-use' && edge.relation.target === 'enemy',
      ),
    ).toHaveLength(791)
    expect(
      battleDataEdges.filter(
        (edge) => edge.relation.kind === 'battle-data-use' && edge.relation.target === 'poison',
      ),
    ).toHaveLength(65)
    expect(
      battleDataEdges.filter(
        (edge) =>
          edge.relation.kind === 'battle-data-use' && edge.relation.use === 'command-learn-skill',
      ),
    ).toHaveLength(15)
    const oldBattleDataKeys = (['skill', 'enemy', 'poison'] as const)
      .flatMap((target) => collectBattleDataReferences(state, target))
      .map(
        (reference) =>
          `${reference.target}\0${reference.targetId}\0${reference.kind}\0${reference.where}`,
      )
      .sort()
    const unifiedBattleDataKeys = battleDataEdges
      .filter(
        (edge) =>
          edge.relation.kind === 'battle-data-use' &&
          edge.relation.use !== 'command-learn-skill' &&
          !edge.relation.use.startsWith('world-'),
      )
      .map((edge) => {
        if (edge.relation.kind !== 'battle-data-use') throw new Error('预期战斗数据边')
        if (edge.target.kind !== edge.relation.target) throw new Error('战斗数据 target 不一致')
        return `${edge.relation.target}\0${edge.target.id}\0${edge.relation.use}\0${edge.where}`
      })
      .sort()
    expect(unifiedBattleDataKeys).toEqual(oldBattleDataKeys)
    const actorEdges = edges.filter((edge) => edge.relation.kind === 'actor-use')
    expect(actorEdges).toHaveLength(808)
    const oldActorReferences = collectActorReferences(state)
    const oldActorKeys = oldActorReferences
      .map((reference) => `${reference.actorId}\0${reference.kind}`)
      .sort()
    const unifiedActorKeys = actorEdges
      .map((edge) => {
        if (edge.relation.kind !== 'actor-use' || edge.target.kind !== 'actor')
          throw new Error('预期人物引用边')
        return `${edge.target.id}\0${edge.relation.use}`
      })
      .sort()
    expect(unifiedActorKeys).toEqual(oldActorKeys)
    const structuralActorKinds = new Set([
      'scene-entity-actor',
      'entry-point-party',
      'entry-point-seed-stats',
      'entry-point-seed-condition',
      'actor-covered-by',
      'item-equipable-by',
      'item-battle-sprite-by-actor',
      'level-up-owner',
      'world-party-template',
      'world-reserve-template',
    ])
    expect(
      actorEdges
        .filter(
          (edge) =>
            edge.relation.kind === 'actor-use' && structuralActorKinds.has(edge.relation.use),
        )
        .map(
          (edge) =>
            `${edge.target.kind === 'actor' ? edge.target.id : ''}\0${edge.relation.kind === 'actor-use' ? edge.relation.use : ''}\0${edge.where}`,
        )
        .sort(),
    ).toEqual(
      oldActorReferences
        .filter((reference) => structuralActorKinds.has(reference.kind))
        .map((reference) => `${reference.actorId}\0${reference.kind}\0${reference.where}`)
        .sort(),
    )
    expect(oldActorReferences.filter(actorReferenceBlocksDeletion)).toHaveLength(804)
    expect(actorEdges.filter((edge) => edge.locator.kind === 'canonical-script')).toHaveLength(516)
    expect(actorEdges.filter((edge) => edge.locator.kind === 'script-owner')).toHaveLength(1)
    expect(
      state.actors.reduce((count, actor) => {
        const target = { kind: 'actor', id: actor.id } as const
        return (
          count + index.deletionImpact(target, index.deletionScopeFor([target])).blockers.length
        )
      }, 0),
    ).toBe(804)
    expect(
      Object.fromEntries(
        [
          ...new Set(
            actorEdges.map((edge) => edge.relation.kind === 'actor-use' && edge.relation.use),
          ),
        ]
          .filter(Boolean)
          .map((kind) => [
            kind,
            actorEdges.filter(
              (edge) => edge.relation.kind === 'actor-use' && edge.relation.use === kind,
            ).length,
          ]),
      ),
    ).toMatchObject({
      'scene-entity-actor': 6,
      'entry-point-party': 1,
      'condition-in-party': 4,
      'enemy-condition-player-in-party': 4,
      'actor-covered-by': 6,
      'item-equipable-by': 261,
      'item-battle-sprite-by-actor': 7,
      'command-set-actor-sprite': 122,
      'command-set-actor-appearance': 9,
      'command-set-party-member': 219,
      'enemy-apply-actor-growth': 1,
      'enemy-play-actor-cast-effect': 1,
      'dialogue-actor': 163,
      'level-up-owner': 4,
    })
    expect(
      actorEdges.find(
        (edge) =>
          edge.target.kind === 'actor' &&
          edge.target.id === 'zhao-linger' &&
          edge.where.includes('.machine.states.') &&
          edge.where.includes('.next.'),
      ),
    ).toMatchObject({
      source: {
        owner: {
          kind: 'script-owner',
          owner: { kind: 'entity-behavior', sceneId: 's023', entityId: 'e433' },
        },
      },
      relation: { kind: 'actor-use', use: 'condition-in-party' },
      locator: { kind: 'script-owner' },
    })
    expect(index.referencesTo({ kind: 'map', id: 'map-164' })).toMatchObject([
      {
        source: {
          owner: {
            kind: 'script-owner',
            owner: {
              kind: 'scene-hook',
              sceneId: 's230',
              slot: 'onEnter',
              hookId: 'default',
            },
          },
        },
        locator: {
          kind: 'canonical-script',
          reference: { locator: { commandPath: '7' } },
        },
      },
    ])
    expect(index.referencesTo({ kind: 'map', id: 'map-165' })).toMatchObject([
      { source: { owner: { kind: 'scene', id: 's244' } } },
      {
        source: {
          owner: {
            kind: 'script-owner',
            owner: { kind: 'scene-hook', sceneId: 's243' },
          },
        },
        locator: {
          kind: 'canonical-script',
          reference: { locator: { commandPath: '3' } },
        },
      },
    ])

    expect(diagnostics.projectReferences.rows).toHaveLength(8_930)
    expect(diagnostics.projectReferences.targetEdgeIds).toHaveLength(10_706)
    expect('targetKeys' in diagnostics.projectReferences).toBe(false)
    expect(diagnostics.projectReferences.sources.every((source) => !('key' in source))).toBe(true)
    expect(
      new TextEncoder().encode(JSON.stringify(diagnostics.projectReferences)).byteLength,
    ).toBeLessThanOrEqual(2_500_000)

    const request = {
      kind: 'init' as const,
      epoch: 1,
      jobId: 1,
      revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 },
      input: { state: editorDiagnosticState(state), canonical },
    }
    const reply = createEditorDerivedWorkerRuntime().handle(request)
    if (reply.kind !== 'ready') throw new Error(reply.message)
    expect(reply.data.projectReferences).toEqual(diagnostics.projectReferences)
    expect('entityAddressReferences' in reply.data).toBe(false)
    expect('sceneEntryReferences' in reply.data).toBe(false)
  }, 30_000)
})
