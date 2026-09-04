import {
  type CommandTargetReference,
  collectCanonicalCommandTargetReferences,
  collectCommandTargetReferences,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type {
  EntityAddressReference,
  EntityAddressReferenceLocator,
} from './entity-address-references.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceSource,
  type ProjectReferenceEdgeInput,
  type ProjectReferenceLocator,
  type ProjectReferenceSnapshotV1,
  type ProjectReferenceSource,
  type ProjectReferenceTarget,
} from './project-reference.js'
import type {
  CanonicalScriptCommandVisit,
  ScriptCommandOwner,
  ScriptEditorState,
} from './script-editor.js'
import { describeScriptCommandOwner } from './script-editor.js'

function scriptOwnerDeletedWith(owner: ScriptCommandOwner): ProjectReferenceTarget[] {
  switch (owner.kind) {
    case 'entity-behavior':
    case 'entity-hostile-on-lose':
      return [
        { kind: 'entity', sceneId: owner.sceneId, entityId: owner.entityId },
        { kind: 'scene', id: owner.sceneId },
      ]
    case 'scene-hook':
      return [{ kind: 'scene', id: owner.sceneId }]
    case 'item-private-script':
      return [{ kind: 'item', id: owner.itemId }]
    case 'shared-script':
      return [{ kind: 'shared-script', id: owner.scriptId }]
  }
}

function sourceForScriptOwner(
  owner: ScriptCommandOwner,
  scriptState?: ScriptEditorState,
): ProjectReferenceSource {
  return createProjectReferenceSource(
    { kind: 'script-owner', owner },
    scriptState ? describeScriptCommandOwner(scriptState, owner) : `脚本 ${owner.kind}`,
    { deletedWith: scriptOwnerDeletedWith(owner) },
  )
}

function normalizeCommandTarget(target: CommandTargetReference['target']): ProjectReferenceTarget {
  switch (target.kind) {
    case 'scene':
    case 'map':
    case 'enemy-team':
    case 'ambience':
      return target
    case 'shop':
    case 'battle-field':
      return { kind: target.kind, id: String(target.id) }
    case 'scene-entry':
    case 'scene-hook':
    case 'entity':
      return target
  }
}

/** A loadScene with entryId is one composite edge; its parent scene query reuses the same edge id. */
function withoutRedundantLoadSceneParent(
  references: readonly CommandTargetReference[],
): CommandTargetReference[] {
  const entryScenes = new Set(
    references.flatMap((reference) =>
      reference.target.kind === 'scene-entry' ? [reference.target.sceneId] : [],
    ),
  )
  const hookScenes = new Set(
    references.flatMap((reference) =>
      reference.target.kind === 'scene-hook' ? [reference.target.sceneId] : [],
    ),
  )
  return references.filter(
    (reference) =>
      !(
        reference.target.kind === 'scene' &&
        reference.relation === 'load-scene' &&
        entryScenes.has(reference.target.id)
      ) &&
      !(
        reference.target.kind === 'scene' &&
        reference.relation === 'select-scene-hooks' &&
        hookScenes.has(reference.target.id)
      ),
  )
}

function commandReferenceEdge(
  reference: CommandTargetReference,
  source: ProjectReferenceSource,
  locator: ProjectReferenceLocator,
): ProjectReferenceEdgeInput {
  return {
    target: normalizeCommandTarget(reference.target),
    source,
    relation:
      reference.relation === 'entity-address'
        ? { kind: 'entity-address' }
        : { kind: 'command-target', use: reference.relation },
    where: reference.where,
    locator,
    deletePolicy: locator.kind === 'unavailable' ? 'block' : 'replace-suggest',
  }
}

export function canonicalCommandTargetEdges(
  visits: readonly CanonicalScriptCommandVisit[],
  scriptState?: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const kind = visit.command.kind
    if (
      kind !== 'loadScene' &&
      kind !== 'setSceneMapOverride' &&
      kind !== 'selectSceneHooks' &&
      kind !== 'openShop' &&
      kind !== 'startBattle' &&
      kind !== 'setAmbience' &&
      kind !== 'toggleDayNight' &&
      kind !== 'branch' &&
      kind !== 'loop'
    )
      return []
    const targets = withoutRedundantLoadSceneParent(
      collectCanonicalCommandTargetReferences(visit.command, visit.path),
    ).filter((target) => target.target.kind !== 'entity')
    if (!targets.length) return []
    const reference = {
      kind: 'command' as const,
      path: visit.path,
      locator: visit.locator,
    }
    const source = sourceForScriptOwner(visit.locator.owner, scriptState)
    return targets.map((target) =>
      commandReferenceEdge(target, source, { kind: 'canonical-script', reference }),
    )
  })
}

export function legacyScriptChunkTargetEdges(
  chunks: EditorState['scriptChunks'],
): ProjectReferenceEdgeInput[] {
  return Object.entries(chunks ?? {}).flatMap(([chunkId, chunk]) =>
    Object.entries(chunk.scripts).flatMap(([scriptId, body]) => {
      const source = createProjectReferenceSource(
        { kind: 'script-chunk', chunkId, scriptId },
        `只读脚本 ${scriptId}（${chunkId}）`,
      )
      const locator: ProjectReferenceLocator = {
        kind: 'unavailable',
        reason: '运行时脚本分片只读，没有作者对象可供精确编辑。',
      }
      return withoutRedundantLoadSceneParent(
        collectCommandTargetReferences(
          body,
          `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        ),
      ).map((target) => commandReferenceEdge(target, source, locator))
    }),
  )
}

function entitySource(locator: EntityAddressReferenceLocator): {
  source: ProjectReferenceSource
  locator: ProjectReferenceLocator
} {
  switch (locator.kind) {
    case 'scene': {
      const target = { kind: 'scene', id: locator.sceneId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'scene', id: locator.sceneId },
          `场景 ${locator.sceneId}`,
          { deletedWith: [target] },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'scene-entity': {
      const entity = {
        kind: 'entity',
        sceneId: locator.sceneId,
        entityId: locator.entityId,
      } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'scene-entity', sceneId: locator.sceneId, entityId: locator.entityId },
          `场景 ${locator.sceneId} · 实体 ${locator.entityId}`,
          { deletedWith: [entity, { kind: 'scene', id: locator.sceneId }] },
        ),
        locator: { kind: 'object', object: entity },
      }
    }
    case 'shared-script': {
      const target = { kind: 'shared-script', id: locator.scriptId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'shared-script', id: locator.scriptId },
          `共享脚本 ${locator.scriptId}`,
          { deletedWith: [target] },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'item': {
      const target = { kind: 'item', id: locator.itemId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'item', id: locator.itemId },
          `物品 ${locator.itemId}`,
          {
            deletedWith: [target],
          },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'enemy': {
      const target = { kind: 'enemy', id: locator.enemyId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'enemy', id: locator.enemyId },
          `敌人 ${locator.enemyId}`,
          { deletedWith: [target] },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'world':
      return {
        source: createProjectReferenceSource(
          { kind: 'runtime-world' },
          `世界配置 ${locator.worldId ?? ''}`.trim(),
        ),
        locator: {
          kind: 'unavailable',
          reason: '世界配置当前没有可编辑的精确内容页。',
        },
      }
  }
}

export function entityAddressReferenceEdges(
  references: readonly EntityAddressReference[],
): ProjectReferenceEdgeInput[] {
  const sources = new Map<
    string,
    { source: ProjectReferenceSource; locator: ProjectReferenceLocator }
  >()
  const relation = { kind: 'entity-address' } as const
  return references
    .filter(
      (reference) =>
        !(
          reference.locator.kind === 'scene-entity' &&
          reference.locator.sceneId === reference.sceneId &&
          reference.locator.entityId === reference.entityId
        ),
    )
    .map((reference) => {
      const locatorIdentity = JSON.stringify(reference.locator)
      let mapped = sources.get(locatorIdentity)
      if (!mapped) {
        mapped = entitySource(reference.locator)
        sources.set(locatorIdentity, mapped)
      }
      return {
        target: {
          kind: 'entity',
          sceneId: reference.sceneId,
          entityId: reference.entityId,
        },
        source: mapped.source,
        relation,
        where: reference.path,
        locator: mapped.locator,
        deletePolicy: mapped.locator.kind === 'unavailable' ? 'block' : 'replace-suggest',
      }
    })
}

export function structuralProjectReferenceEdges(
  state: Pick<EditorState, 'manifest' | 'scenes'>,
): ProjectReferenceEdgeInput[] {
  const edges: ProjectReferenceEdgeInput[] = []
  for (const entry of state.manifest.entryPoints) {
    const entryTarget = { kind: 'entry-point', id: entry.id } as const
    edges.push({
      target: { kind: 'scene', id: entry.scene },
      source: createProjectReferenceSource(
        { kind: 'entry-point', id: entry.id },
        `入口 ${entry.label}`,
        { section: 'scene', deletedWith: [entryTarget] },
      ),
      relation: { kind: 'entry-point-scene' },
      where: `manifest.entryPoints.${entry.id}.scene`,
      locator: { kind: 'object', object: entryTarget },
      deletePolicy: 'replace-suggest',
    })
  }
  for (const scene of state.scenes) {
    const sceneTarget = { kind: 'scene', id: scene.id } as const
    edges.push({
      target: { kind: 'map', id: scene.mapId },
      source: createProjectReferenceSource({ kind: 'scene', id: scene.id }, `场景 ${scene.id}`, {
        section: 'map',
        deletedWith: [sceneTarget],
      }),
      relation: { kind: 'scene-map' },
      where: `scenes.${scene.id}.mapId`,
      locator: { kind: 'object', object: sceneTarget, section: 'map' },
      deletePolicy: 'replace-suggest',
    })
  }
  return edges
}

export function buildProjectReferenceSnapshotFromProjection(input: {
  state: EditorState
  scriptState: ScriptEditorState
  commandVisits: readonly CanonicalScriptCommandVisit[]
  entityAddressReferences: readonly EntityAddressReference[]
}): ProjectReferenceSnapshotV1 {
  return buildProjectReferenceSnapshot(
    [
      ...structuralProjectReferenceEdges(input.state),
      ...canonicalCommandTargetEdges(input.commandVisits, input.scriptState),
      ...legacyScriptChunkTargetEdges(input.state.scriptChunks),
      ...entityAddressReferenceEdges(input.entityAddressReferences),
    ],
    { assumeUnique: true },
  )
}
