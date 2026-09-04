import {
  type FileSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
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
    expect(index.referencesTo({ kind: 'map', id: 'map-164' })).toHaveLength(1)

    expect(diagnostics.projectReferences.rows).toHaveLength(5_991)
    expect(diagnostics.projectReferences.targetEdgeIds.length).toBeLessThanOrEqual(8_000)
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
