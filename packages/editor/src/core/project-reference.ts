import type {
  ActorReferenceKind,
  AssetKind,
  BattleSpriteProfileKind,
  CommandTargetReference,
  WorldVariableKindV1,
} from '@type-pal/content'
import type {
  CanonicalScriptReference,
  SceneHookSlot,
  ScriptCommandOwner,
} from './script-editor.js'

export type ProjectReferenceSimpleKind =
  | 'project'
  | 'entry-point'
  | 'scene'
  | 'map'
  | 'shop'
  | 'actor'
  | 'item'
  | 'skill'
  | 'enemy'
  | 'poison'
  | 'battle-field'
  | 'enemy-team'
  | 'ambience'
  | 'world-variable'
  | 'shared-script'
  | 'asset'
  | 'tileset'
  | 'stamp'
  | 'world-sprite'
  | 'battle-sprite'

export type ProjectReferenceTarget =
  | { kind: ProjectReferenceSimpleKind; id: string }
  | { kind: 'entity'; sceneId: string; entityId: string }
  | { kind: 'scene-entry'; sceneId: string; entryId: string }
  | {
      kind: 'entity-behavior'
      sceneId: string
      entityId: string
      channel: 'trigger' | 'auto'
      behaviorId: string
    }
  | { kind: 'scene-hook'; sceneId: string; slot: SceneHookSlot; hookId: string }
  | { kind: 'world-sprite-action'; spriteId: string; actionId: string }

export type ProjectReferenceSourceOwner =
  | { kind: 'project-part'; id: string }
  | { kind: 'entry-point'; id: string }
  | { kind: 'scene'; id: string }
  | { kind: 'scene-entity'; sceneId: string; entityId: string }
  | { kind: 'scene-page'; sceneId: string; entityId: string; pageId: string }
  | { kind: 'actor'; id: string }
  | { kind: 'item'; id: string }
  | { kind: 'skill'; id: string }
  | { kind: 'enemy'; id: string }
  | { kind: 'poison'; id: string }
  | { kind: 'shop'; id: string }
  | { kind: 'battle-field'; id: string }
  | { kind: 'enemy-team'; id: string }
  | { kind: 'tileset'; id: string }
  | { kind: 'stamp'; id: string }
  | { kind: 'world-sprite'; id: string }
  | { kind: 'world-sprite-action'; spriteId: string; actionId: string }
  | { kind: 'battle-sprite'; id: string }
  | { kind: 'shared-script'; id: string }
  | { kind: 'script-owner'; owner: ScriptCommandOwner }
  | { kind: 'script-chunk'; chunkId: string; scriptId: string }
  | { kind: 'runtime-world' }

export interface ProjectReferenceSource {
  /** Stable inside and across revisions; never derived from label/where/array position. */
  key: string
  owner: ProjectReferenceSourceOwner
  label: string
  /** Targets whose removal also removes this source. Used to construct explicit deletion scopes. */
  deletedWith: readonly string[]
}

export type ProjectReferenceLocator =
  | { kind: 'object'; object: ProjectReferenceTarget; section?: string }
  | { kind: 'canonical-script'; reference: CanonicalScriptReference }
  | { kind: 'script-owner'; owner: ScriptCommandOwner }
  | { kind: 'legacy-script'; scriptId: string; commandPath?: string }
  | { kind: 'unavailable'; reason: string }

export type ProjectReferenceItemAccess =
  | 'read'
  | 'lose'
  | 'consume'
  | 'reward'
  | 'hold'
  | 'configure'

export type ProjectReferenceBattleDataUse =
  | 'actor-initial-magic'
  | 'actor-cooperative-magic'
  | 'level-up'
  | 'item-grant-skill'
  | 'enemy-cast'
  | 'enemy-team-slot'
  | 'poison-counter'
  | 'poison-lethal-pair'
  | 'entry-point-seed-poison'
  | 'command-actor-condition-poison'
  | 'skill-poison'
  | 'item-poison'

export type ProjectReferenceRelation =
  | { kind: 'command-target'; use: CommandTargetReference['relation'] }
  | { kind: 'asset-use'; expectedKind: AssetKind }
  | { kind: 'actor-use'; use: ActorReferenceKind }
  | { kind: 'item-use'; access: ProjectReferenceItemAccess }
  | {
      kind: 'battle-data-use'
      target: 'skill' | 'enemy' | 'poison'
      use: ProjectReferenceBattleDataUse
    }
  | { kind: 'entity-address' }
  | {
      kind: 'world-variable'
      variableKind: WorldVariableKindV1
      access: 'read' | 'write'
    }
  | {
      kind: 'script-reference'
      use: 'call' | 'jump' | 'binding'
      expectedChunk: string
      explicitSelf?: string
    }
  | {
      kind: 'battle-field-use'
      use: 'project-default' | 'scene-default' | 'hostile' | 'start-battle'
    }
  | { kind: 'enemy-team-use'; use: 'hostile' | 'start-battle' }
  | { kind: 'ambience-use'; use: 'set-ambience' | 'toggle-day-night' | 'world-state' }
  | { kind: 'scene-map' }
  | { kind: 'entry-point-scene' }
  | { kind: 'world-sprite-use' }
  | { kind: 'world-sprite-action-use'; actionId: string }
  | { kind: 'battle-sprite-use'; expectedProfile: BattleSpriteProfileKind }
  | { kind: 'behavior-reference'; use: 'page-binding' | 'select-behavior' | 'cursor-handoff' }
  | { kind: 'scene-hook-reference'; use: 'hook-initial' | 'select-hook' }

export type ProjectReferenceDeletePolicy = 'block' | 'replace-suggest' | 'warn'

export interface ProjectReferenceEdgeInput {
  target: ProjectReferenceTarget
  source: ProjectReferenceSource
  relation: ProjectReferenceRelation
  where: string
  detail?: string
  locator: ProjectReferenceLocator
  deletePolicy: ProjectReferenceDeletePolicy
}

export interface ProjectReferenceEdge extends Omit<ProjectReferenceEdgeInput, 'source'> {
  id: number
  source: ProjectReferenceSource
}

type ProjectReferenceRow = readonly [
  targetIndex: number,
  sourceIndex: number,
  relationIndex: number,
  locatorIndex: number,
  policy: 0 | 1 | 2,
  where: string,
  detail?: string,
]

export interface ProjectReferenceSnapshotV1 {
  version: 1
  targets: readonly ProjectReferenceTarget[]
  targetKeys: readonly string[]
  sources: readonly ProjectReferenceSource[]
  relations: readonly ProjectReferenceRelation[]
  locators: readonly ProjectReferenceLocator[]
  rows: readonly ProjectReferenceRow[]
  /** target bucket i occupies targetEdgeIds[targetOffsets[i]..targetOffsets[i+1]). */
  targetOffsets: readonly number[]
  targetEdgeIds: readonly number[]
}

export interface ProjectReferenceDeletionScope {
  removedSourceKeys: ReadonlySet<string>
}

export interface ProjectReferenceDeletionImpact {
  references: ProjectReferenceEdge[]
  blockers: ProjectReferenceEdge[]
  warnings: ProjectReferenceEdge[]
}

function tupleKey(values: readonly string[]): string {
  return JSON.stringify(values)
}

export function projectReferenceTargetKey(target: ProjectReferenceTarget): string {
  switch (target.kind) {
    case 'entity':
      return tupleKey([target.kind, target.sceneId, target.entityId])
    case 'scene-entry':
      return tupleKey([target.kind, target.sceneId, target.entryId])
    case 'entity-behavior':
      return tupleKey([
        target.kind,
        target.sceneId,
        target.entityId,
        target.channel,
        target.behaviorId,
      ])
    case 'scene-hook':
      return tupleKey([target.kind, target.sceneId, target.slot, target.hookId])
    case 'world-sprite-action':
      return tupleKey([target.kind, target.spriteId, target.actionId])
    default:
      return tupleKey([target.kind, target.id])
  }
}

function scriptOwnerKey(owner: ScriptCommandOwner): readonly string[] {
  switch (owner.kind) {
    case 'entity-behavior':
      return [owner.kind, owner.sceneId, owner.entityId, owner.channel, owner.behaviorId]
    case 'scene-hook':
      return [owner.kind, owner.sceneId, owner.slot, owner.hookId]
    case 'entity-hostile-on-lose':
      return [owner.kind, owner.sceneId, owner.entityId]
    case 'item-private-script':
      return [owner.kind, owner.itemId, owner.ability, owner.scriptId]
    case 'shared-script':
      return [owner.kind, owner.scriptId]
  }
}

export function projectReferenceSourceOwnerKey(owner: ProjectReferenceSourceOwner): string {
  switch (owner.kind) {
    case 'scene-entity':
      return tupleKey([owner.kind, owner.sceneId, owner.entityId])
    case 'scene-page':
      return tupleKey([owner.kind, owner.sceneId, owner.entityId, owner.pageId])
    case 'world-sprite-action':
      return tupleKey([owner.kind, owner.spriteId, owner.actionId])
    case 'script-owner':
      return tupleKey([owner.kind, ...scriptOwnerKey(owner.owner)])
    case 'script-chunk':
      return tupleKey([owner.kind, owner.chunkId, owner.scriptId])
    case 'runtime-world':
      return tupleKey([owner.kind])
    default:
      return tupleKey([owner.kind, owner.id])
  }
}

export function projectReferenceSourceSceneId(
  owner: ProjectReferenceSourceOwner,
): string | undefined {
  if (owner.kind === 'scene') return owner.id
  if (owner.kind === 'scene-entity' || owner.kind === 'scene-page') return owner.sceneId
  if (owner.kind !== 'script-owner') return undefined
  return owner.owner.kind === 'shared-script' || owner.owner.kind === 'item-private-script'
    ? undefined
    : owner.owner.sceneId
}

export function createProjectReferenceSource(
  owner: ProjectReferenceSourceOwner,
  label: string,
  options: { section?: string; deletedWith?: readonly ProjectReferenceTarget[] } = {},
): ProjectReferenceSource {
  const ownerKey = projectReferenceSourceOwnerKey(owner)
  return {
    key: tupleKey([ownerKey, options.section ?? '']),
    owner,
    label,
    deletedWith: [...new Set((options.deletedWith ?? []).map(projectReferenceTargetKey))].sort(),
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function targetAncestors(target: ProjectReferenceTarget): ProjectReferenceTarget[] {
  switch (target.kind) {
    case 'entity':
      return [{ kind: 'scene', id: target.sceneId }]
    case 'scene-entry':
      return [{ kind: 'scene', id: target.sceneId }]
    case 'entity-behavior':
      return [
        { kind: 'entity', sceneId: target.sceneId, entityId: target.entityId },
        { kind: 'scene', id: target.sceneId },
      ]
    case 'scene-hook':
      return [{ kind: 'scene', id: target.sceneId }]
    case 'world-sprite-action':
      return [{ kind: 'world-sprite', id: target.spriteId }]
    default:
      return []
  }
}

const POLICY_CODE: Readonly<Record<ProjectReferenceDeletePolicy, 0 | 1 | 2>> = {
  block: 0,
  'replace-suggest': 1,
  warn: 2,
}

const CODE_POLICY = ['block', 'replace-suggest', 'warn'] as const

/** Deterministic, serializable and compact: one edge row can be indexed under child and parent targets. */
export function buildProjectReferenceSnapshot(
  rawEdges: readonly ProjectReferenceEdgeInput[],
  options: { assumeUnique?: boolean } = {},
): ProjectReferenceSnapshotV1 {
  const targetByKey = new Map<string, ProjectReferenceTarget>()
  const sources: ProjectReferenceSource[] = []
  const sourceIndexes = new Map<string, number>()
  const sourceDefinitions = new Map<string, string>()
  const relations: ProjectReferenceRelation[] = []
  const relationIndexes = new Map<string, number>()
  const locators: ProjectReferenceLocator[] = []
  const locatorIndexes = new Map<string, number>()
  const rowInputs: Array<
    readonly [
      targetKey: string,
      sourceIndex: number,
      relationIndex: number,
      locatorIndex: number,
      policy: 0 | 1 | 2,
      where: string,
      detail?: string,
    ]
  > = []
  const bucketEdges = new Map<string, number[]>()
  const seenEdges = new Set<string>()
  const serializedObjects = new WeakMap<object, string>()
  const serializeIdentity = (value: object): string => {
    const cached = serializedObjects.get(value)
    if (cached !== undefined) return cached
    const serialized = stableSerialize(value)
    serializedObjects.set(value, serialized)
    return serialized
  }

  for (const edge of rawEdges) {
    const targetKey = projectReferenceTargetKey(edge.target)
    const relationKey = serializeIdentity(edge.relation)
    const locatorKey = serializeIdentity(edge.locator)
    if (!options.assumeUnique) {
      const identity = tupleKey([
        targetKey,
        edge.source.key,
        relationKey,
        edge.where,
        locatorKey,
        edge.deletePolicy,
        edge.detail ?? '',
      ])
      if (seenEdges.has(identity)) continue
      seenEdges.add(identity)
    }

    const sourceDefinition = serializeIdentity(edge.source)
    const previousSourceDefinition = sourceDefinitions.get(edge.source.key)
    if (previousSourceDefinition && previousSourceDefinition !== sourceDefinition)
      throw new Error(`引用来源 ${edge.source.key} 的定义不一致`)
    let sourceIndex = sourceIndexes.get(edge.source.key)
    if (sourceIndex === undefined) {
      sourceIndex = sources.length
      sources.push(edge.source)
      sourceIndexes.set(edge.source.key, sourceIndex)
      sourceDefinitions.set(edge.source.key, sourceDefinition)
    }

    let relationIndex = relationIndexes.get(relationKey)
    if (relationIndex === undefined) {
      relationIndex = relations.length
      relations.push(edge.relation)
      relationIndexes.set(relationKey, relationIndex)
    }
    let locatorIndex = locatorIndexes.get(locatorKey)
    if (locatorIndex === undefined) {
      locatorIndex = locators.length
      locators.push(edge.locator)
      locatorIndexes.set(locatorKey, locatorIndex)
    }

    targetByKey.set(targetKey, edge.target)
    const aliases = [
      edge.target,
      ...targetAncestors(edge.target).filter(
        (ancestor) => !edge.source.deletedWith.includes(projectReferenceTargetKey(ancestor)),
      ),
    ]
    for (const target of aliases) {
      const aliasKey = projectReferenceTargetKey(target)
      targetByKey.set(aliasKey, target)
      const bucket = bucketEdges.get(aliasKey) ?? []
      bucket.push(rowInputs.length)
      bucketEdges.set(aliasKey, bucket)
    }
    rowInputs.push([
      targetKey,
      sourceIndex,
      relationIndex,
      locatorIndex,
      POLICY_CODE[edge.deletePolicy],
      edge.where,
      edge.detail,
    ])
  }

  const targetKeys = [...targetByKey.keys()].sort()
  const targets = targetKeys.map((key) => targetByKey.get(key)!)
  const targetIndexes = new Map(targetKeys.map((key, index) => [key, index]))
  const rows: ProjectReferenceRow[] = rowInputs.map(
    ([targetKey, sourceIndex, relationIndex, locatorIndex, policy, where, detail]) => [
      targetIndexes.get(targetKey)!,
      sourceIndex,
      relationIndex,
      locatorIndex,
      policy,
      where,
      detail,
    ],
  )
  const targetOffsets = [0]
  const targetEdgeIds: number[] = []
  for (const targetKey of targetKeys) {
    targetEdgeIds.push(...(bucketEdges.get(targetKey) ?? []))
    targetOffsets.push(targetEdgeIds.length)
  }
  return {
    version: 1,
    targets,
    targetKeys,
    sources,
    relations,
    locators,
    rows,
    targetOffsets,
    targetEdgeIds,
  }
}

export class ProjectReferenceIndex {
  private readonly targetIndexes: ReadonlyMap<string, number>

  constructor(readonly snapshot: ProjectReferenceSnapshotV1) {
    if (snapshot.targetOffsets.length !== snapshot.targets.length + 1)
      throw new Error('引用索引 targetOffsets 长度不匹配')
    if (snapshot.targetOffsets.at(-1) !== snapshot.targetEdgeIds.length)
      throw new Error('引用索引 targetOffsets 尾界不匹配')
    this.targetIndexes = new Map(snapshot.targetKeys.map((key, index) => [key, index]))
  }

  referencesTo(target: ProjectReferenceTarget): ProjectReferenceEdge[] {
    const targetIndex = this.targetIndexes.get(projectReferenceTargetKey(target))
    if (targetIndex === undefined) return []
    const start = this.snapshot.targetOffsets[targetIndex]!
    const end = this.snapshot.targetOffsets[targetIndex + 1]!
    return this.snapshot.targetEdgeIds.slice(start, end).map((edgeId) => this.edge(edgeId))
  }

  allReferences(): ProjectReferenceEdge[] {
    return this.snapshot.rows.map((_row, edgeId) => this.edge(edgeId))
  }

  deletionImpact(
    target: ProjectReferenceTarget,
    scope: ProjectReferenceDeletionScope = { removedSourceKeys: new Set() },
  ): ProjectReferenceDeletionImpact {
    const references = this.referencesTo(target).filter(
      (edge) => !scope.removedSourceKeys.has(edge.source.key),
    )
    return {
      references,
      blockers: references.filter((edge) => edge.deletePolicy !== 'warn'),
      warnings: references.filter((edge) => edge.deletePolicy === 'warn'),
    }
  }

  deletionScopeFor(targets: readonly ProjectReferenceTarget[]): ProjectReferenceDeletionScope {
    const targetKeys = new Set(targets.map(projectReferenceTargetKey))
    return {
      removedSourceKeys: new Set(
        this.snapshot.sources
          .filter((source) => source.deletedWith.some((key) => targetKeys.has(key)))
          .map((source) => source.key),
      ),
    }
  }

  private edge(id: number): ProjectReferenceEdge {
    const row = this.snapshot.rows[id]
    if (!row) throw new Error(`引用边 ${id} 不存在`)
    const [targetIndex, sourceIndex, relationIndex, locatorIndex, policy, where, detail] = row
    return {
      id,
      target: this.snapshot.targets[targetIndex]!,
      source: this.snapshot.sources[sourceIndex]!,
      relation: this.snapshot.relations[relationIndex]!,
      locator: this.snapshot.locators[locatorIndex]!,
      deletePolicy: CODE_POLICY[policy],
      where,
      ...(detail === undefined ? {} : { detail }),
    }
  }
}

export function createProjectReferenceIndex(
  snapshot: ProjectReferenceSnapshotV1,
): ProjectReferenceIndex {
  return new ProjectReferenceIndex(snapshot)
}
