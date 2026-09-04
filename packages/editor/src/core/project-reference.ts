import type {
  ActorReferenceKind,
  AssetKind,
  BattleSpriteProfileKind,
  CommandTargetReference,
  WorldVariableKindV1,
} from '@type-pal/content'
import type { BattleDataReferenceKind } from './battle-data-references.js'
import type {
  CanonicalScriptReference,
  SceneHookSlot,
  ScriptCommandContainer,
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

export type ProjectReferenceTargetSnapshot = readonly [
  kind: number,
  ...parts: readonly (string | number)[],
]

export type ProjectReferenceSourceOwner =
  | { kind: 'project-part'; id: string }
  | { kind: 'entry-point'; id: string }
  | { kind: 'scene'; id: string }
  | { kind: 'map'; id: string }
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
  /** Stable discriminator for distinct semantic sections owned by the same object. */
  section?: string
}

export type ScriptCommandOwnerSnapshot =
  | readonly [kind: 0, sceneId: string, entityId: string, channel: 0 | 1, behaviorId: string]
  | readonly [kind: 1, sceneId: string, slot: 0 | 1, hookId: string]
  | readonly [kind: 2, sceneId: string, entityId: string]
  | readonly [kind: 3, itemId: string, ability: 0 | 1, scriptId: string]
  | readonly [kind: 4, scriptId: string]

export type ScriptCommandContainerSnapshot =
  | readonly [kind: 0]
  | readonly [kind: 1, stepId: string, section: 0 | 1]
  | readonly [kind: 2, machineId: string, stateId: string, section: 0 | 1]

export type ProjectReferenceSourceOwnerSnapshot = readonly [
  kind: number,
  ...parts: readonly unknown[],
]

/** Worker wire tuple; deletedWith entries index `deletionTargets`, wherePrefix prefixes row paths. */
export type ProjectReferenceSourceSnapshot = readonly [
  owner: ProjectReferenceSourceOwnerSnapshot,
  label: string | 0,
  deletedWith: readonly number[] | 0,
  section: string | 0,
  wherePrefix: string | 0,
]

export type ProjectReferenceLocator =
  | { kind: 'object'; object: ProjectReferenceTarget; section?: string }
  | {
      kind: 'scene-page'
      sceneId: string
      entityId: string
      pageId: string
      channel?: 'trigger' | 'auto'
    }
  | { kind: 'scene-hook-initial'; sceneId: string; slot: SceneHookSlot; hookId: string }
  | {
      kind: 'canonical-script'
      reference: Extract<CanonicalScriptReference, { kind: 'command' }>
    }
  | { kind: 'script-owner'; owner: ScriptCommandOwner }
  | { kind: 'unavailable'; reason: string }

export type ProjectReferenceLocatorSnapshot =
  | readonly [kind: 0, object: ProjectReferenceTargetSnapshot, section?: string]
  | readonly [
      kind: 1,
      container: ScriptCommandContainerSnapshot,
      commandPath: string,
      path?: string,
    ]
  | readonly [kind: 2, owner: ScriptCommandOwnerSnapshot]
  | readonly [kind: 4, reason: string]
  | readonly [kind: 5]
  | readonly [kind: 5, sceneId: string, entityId: string, pageId: string, channel?: 0 | 1]
  | readonly [kind: 6, hookId: string]
  | readonly [kind: 6, sceneId: string, slot: 0 | 1, hookId: string]

export type ProjectReferenceItemAccess =
  | 'read'
  | 'lose'
  | 'consume'
  | 'reward'
  | 'hold'
  | 'configure'

export type ProjectReferenceBattleDataUse = BattleDataReferenceKind

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
      use: 'call' | 'binding'
      explicitSelf: boolean
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
  | { kind: 'tileset-use'; use: 'map' | 'stamp' }
  | { kind: 'stamp-placement-source' }

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
  whereSuffixIndex: number,
  /** undefined = replace-suggest without detail; -1/-2 = block/warn; otherwise detailIndex*3+policy. */
  tail?: number,
]

export interface ProjectReferenceSnapshotV1 {
  version: 1
  targets: readonly ProjectReferenceTargetSnapshot[]
  sources: readonly ProjectReferenceSourceSnapshot[]
  relations: readonly ProjectReferenceRelation[]
  locators: readonly ProjectReferenceLocatorSnapshot[]
  whereSuffixes: readonly string[]
  details: readonly string[]
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

const SIMPLE_TARGET_KINDS = [
  'project',
  'entry-point',
  'scene',
  'map',
  'shop',
  'actor',
  'item',
  'skill',
  'enemy',
  'poison',
  'battle-field',
  'enemy-team',
  'ambience',
  'world-variable',
  'shared-script',
  'asset',
  'tileset',
  'stamp',
  'world-sprite',
  'battle-sprite',
] as const satisfies readonly ProjectReferenceSimpleKind[]
const SIMPLE_TARGET_KIND_CODE = new Map(
  SIMPLE_TARGET_KINDS.map((kind, index) => [kind, index] as const),
)
const ENTITY_TARGET_CODE = SIMPLE_TARGET_KINDS.length
const SCENE_ENTRY_TARGET_CODE = ENTITY_TARGET_CODE + 1
const ENTITY_BEHAVIOR_TARGET_CODE = ENTITY_TARGET_CODE + 2
const SCENE_HOOK_TARGET_CODE = ENTITY_TARGET_CODE + 3
const WORLD_SPRITE_ACTION_TARGET_CODE = ENTITY_TARGET_CODE + 4

const ID_SOURCE_OWNER_KINDS = [
  'project-part',
  'entry-point',
  'scene',
  'actor',
  'item',
  'skill',
  'enemy',
  'poison',
  'shop',
  'battle-field',
  'enemy-team',
  'tileset',
  'stamp',
  'world-sprite',
  'battle-sprite',
  'shared-script',
  'map',
] as const
const ID_SOURCE_OWNER_KIND_CODE = new Map(
  ID_SOURCE_OWNER_KINDS.map((kind, index) => [kind, index] as const),
)
const SCENE_ENTITY_SOURCE_CODE = ID_SOURCE_OWNER_KINDS.length
const SCENE_PAGE_SOURCE_CODE = SCENE_ENTITY_SOURCE_CODE + 1
const WORLD_SPRITE_ACTION_SOURCE_CODE = SCENE_ENTITY_SOURCE_CODE + 2
const SCRIPT_OWNER_SOURCE_CODE = SCENE_ENTITY_SOURCE_CODE + 3
const SCRIPT_CHUNK_SOURCE_CODE = SCENE_ENTITY_SOURCE_CODE + 4
const RUNTIME_WORLD_SOURCE_CODE = SCENE_ENTITY_SOURCE_CODE + 5

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

function encodeProjectReferenceTarget(
  target: ProjectReferenceTarget,
): ProjectReferenceTargetSnapshot {
  switch (target.kind) {
    case 'entity':
      return [ENTITY_TARGET_CODE, target.sceneId, target.entityId]
    case 'scene-entry':
      return [SCENE_ENTRY_TARGET_CODE, target.sceneId, target.entryId]
    case 'entity-behavior':
      return [
        ENTITY_BEHAVIOR_TARGET_CODE,
        target.sceneId,
        target.entityId,
        target.channel === 'trigger' ? 0 : 1,
        target.behaviorId,
      ]
    case 'scene-hook':
      return [
        SCENE_HOOK_TARGET_CODE,
        target.sceneId,
        target.slot === 'onEnter' ? 0 : 1,
        target.hookId,
      ]
    case 'world-sprite-action':
      return [WORLD_SPRITE_ACTION_TARGET_CODE, target.spriteId, target.actionId]
    default: {
      const code = SIMPLE_TARGET_KIND_CODE.get(target.kind)
      if (code === undefined) throw new Error(`未知引用目标类型 ${target.kind}`)
      return [code, target.id]
    }
  }
}

function decodeProjectReferenceTarget(
  target: ProjectReferenceTargetSnapshot,
): ProjectReferenceTarget {
  switch (target[0]) {
    case ENTITY_TARGET_CODE:
      return { kind: 'entity', sceneId: String(target[1]), entityId: String(target[2]) }
    case SCENE_ENTRY_TARGET_CODE:
      return { kind: 'scene-entry', sceneId: String(target[1]), entryId: String(target[2]) }
    case ENTITY_BEHAVIOR_TARGET_CODE:
      return {
        kind: 'entity-behavior',
        sceneId: String(target[1]),
        entityId: String(target[2]),
        channel: target[3] === 0 ? 'trigger' : 'auto',
        behaviorId: String(target[4]),
      }
    case SCENE_HOOK_TARGET_CODE:
      return {
        kind: 'scene-hook',
        sceneId: String(target[1]),
        slot: target[2] === 0 ? 'onEnter' : 'onTeleport',
        hookId: String(target[3]),
      }
    case WORLD_SPRITE_ACTION_TARGET_CODE:
      return {
        kind: 'world-sprite-action',
        spriteId: String(target[1]),
        actionId: String(target[2]),
      }
    default: {
      const kind = SIMPLE_TARGET_KINDS[target[0]]
      if (!kind) throw new Error(`未知引用目标编码 ${target[0]}`)
      return { kind, id: String(target[1]) }
    }
  }
}

function decodeProjectReferenceTargetKey(key: string): ProjectReferenceTarget {
  const [kind, ...parts] = JSON.parse(key) as string[]
  switch (kind) {
    case 'entity':
      return { kind, sceneId: parts[0]!, entityId: parts[1]! }
    case 'scene-entry':
      return { kind, sceneId: parts[0]!, entryId: parts[1]! }
    case 'entity-behavior':
      return {
        kind,
        sceneId: parts[0]!,
        entityId: parts[1]!,
        channel: parts[2] === 'trigger' ? 'trigger' : 'auto',
        behaviorId: parts[3]!,
      }
    case 'scene-hook':
      return {
        kind,
        sceneId: parts[0]!,
        slot: parts[1] === 'onEnter' ? 'onEnter' : 'onTeleport',
        hookId: parts[2]!,
      }
    case 'world-sprite-action':
      return { kind, spriteId: parts[0]!, actionId: parts[1]! }
    default:
      if (!SIMPLE_TARGET_KIND_CODE.has(kind as ProjectReferenceSimpleKind))
        throw new Error(`未知引用目标 key ${key}`)
      return { kind: kind as ProjectReferenceSimpleKind, id: parts[0]! }
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

function defaultProjectReferenceSourceDeletedWith(
  owner: ProjectReferenceSourceOwner,
): readonly string[] {
  let targets: ProjectReferenceTarget[]
  switch (owner.kind) {
    case 'project-part':
    case 'script-chunk':
    case 'runtime-world':
      targets = []
      break
    case 'scene-entity':
      targets = [
        { kind: 'entity', sceneId: owner.sceneId, entityId: owner.entityId },
        { kind: 'scene', id: owner.sceneId },
      ]
      break
    case 'scene-page':
      targets = [
        { kind: 'entity', sceneId: owner.sceneId, entityId: owner.entityId },
        { kind: 'scene', id: owner.sceneId },
      ]
      break
    case 'world-sprite-action':
      targets = [
        {
          kind: 'world-sprite-action',
          spriteId: owner.spriteId,
          actionId: owner.actionId,
        },
        { kind: 'world-sprite', id: owner.spriteId },
      ]
      break
    case 'script-owner': {
      const script = owner.owner
      switch (script.kind) {
        case 'entity-behavior':
          targets = [
            {
              kind: 'entity-behavior',
              sceneId: script.sceneId,
              entityId: script.entityId,
              channel: script.channel,
              behaviorId: script.behaviorId,
            },
            { kind: 'entity', sceneId: script.sceneId, entityId: script.entityId },
            { kind: 'scene', id: script.sceneId },
          ]
          break
        case 'scene-hook':
          targets = [
            {
              kind: 'scene-hook',
              sceneId: script.sceneId,
              slot: script.slot,
              hookId: script.hookId,
            },
            { kind: 'scene', id: script.sceneId },
          ]
          break
        case 'entity-hostile-on-lose':
          targets = [
            { kind: 'entity', sceneId: script.sceneId, entityId: script.entityId },
            { kind: 'scene', id: script.sceneId },
          ]
          break
        case 'item-private-script':
          targets = [{ kind: 'item', id: script.itemId }]
          break
        case 'shared-script':
          targets = [{ kind: 'shared-script', id: script.scriptId }]
          break
      }
      break
    }
    default:
      targets = [{ kind: owner.kind, id: owner.id }]
      break
  }
  return [...new Set(targets.map(projectReferenceTargetKey))].sort()
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function defaultProjectReferenceSourceWherePrefix(
  owner: ProjectReferenceSourceOwner,
  section: string | undefined,
): string | undefined {
  if (owner.kind === 'scene-page' && (section === 'trigger' || section === 'auto'))
    return `scenes.${owner.sceneId}.entities.${owner.entityId}.pages.${owner.pageId}.${section}`
  if (owner.kind === 'scene' && section?.startsWith('hook-initial:'))
    return `scenes.${owner.id}.hooks.${section.slice('hook-initial:'.length)}.initial`
  if (owner.kind === 'script-owner') {
    const script = owner.owner
    if (script.kind === 'entity-behavior')
      return `scenes.${script.sceneId}.entities.${script.entityId}.behaviors.${script.channel}.${script.behaviorId}.flow`
    if (script.kind === 'scene-hook')
      return `scenes.${script.sceneId}.hooks.${script.slot}.variants.${script.hookId}.flow`
    if (script.kind === 'entity-hostile-on-lose')
      return `scenes.${script.sceneId}.entities.${script.entityId}.hostile.onLose`
    if (script.kind === 'shared-script') return `sharedScripts.${script.scriptId}.body`
  }
  return undefined
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

function projectReferenceSourceKey(owner: ProjectReferenceSourceOwner, section?: string): string {
  return tupleKey([projectReferenceSourceOwnerKey(owner), section ?? ''])
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

export function defaultProjectReferenceSourceLabel(owner: ProjectReferenceSourceOwner): string {
  switch (owner.kind) {
    case 'project-part':
      return `项目配置 ${owner.id}`
    case 'entry-point':
      return `入口 ${owner.id}`
    case 'scene':
      return `场景 ${owner.id}`
    case 'map':
      return `地图 ${owner.id}`
    case 'scene-entity':
      return `场景 ${owner.sceneId} · 实体 ${owner.entityId}`
    case 'scene-page':
      return `场景 ${owner.sceneId} · 实体 ${owner.entityId} · 页面 ${owner.pageId}`
    case 'actor':
      return `人物 ${owner.id}`
    case 'item':
      return `物品 ${owner.id}`
    case 'skill':
      return `技能 ${owner.id}`
    case 'enemy':
      return `敌人 ${owner.id}`
    case 'poison':
      return `毒 ${owner.id}`
    case 'shop':
      return `商店 ${owner.id}`
    case 'battle-field':
      return `战场 ${owner.id}`
    case 'enemy-team':
      return `敌队 ${owner.id}`
    case 'tileset':
      return `瓦片集 ${owner.id}`
    case 'stamp':
      return `组合 ${owner.id}`
    case 'world-sprite':
      return `世界精灵 ${owner.id}`
    case 'world-sprite-action':
      return `世界精灵 ${owner.spriteId} · 动作 ${owner.actionId}`
    case 'battle-sprite':
      return `战斗精灵 ${owner.id}`
    case 'shared-script':
      return `共享脚本 ${owner.id}`
    case 'script-owner': {
      const script = owner.owner
      switch (script.kind) {
        case 'entity-behavior':
          return `场景 ${script.sceneId} · 实体 ${script.entityId} · ${script.channel === 'trigger' ? '交互脚本' : '自动行为'} ${script.behaviorId}`
        case 'scene-hook':
          return `场景 ${script.sceneId} · ${script.slot === 'onEnter' ? '进场脚本' : '传送出口'} ${script.hookId}`
        case 'entity-hostile-on-lose':
          return `场景 ${script.sceneId} · 实体 ${script.entityId} · 战败脚本`
        case 'item-private-script':
          return `物品 ${script.itemId} · ${script.ability === 'use' ? '使用' : '投掷'}脚本 ${script.scriptId}`
        case 'shared-script':
          return `共享脚本 ${script.scriptId}`
      }
      throw new Error('未知脚本来源')
    }
    case 'script-chunk':
      return `只读脚本 ${owner.scriptId}（${owner.chunkId}）`
    case 'runtime-world':
      return '运行态/存档'
  }
}

export function createProjectReferenceSource(
  owner: ProjectReferenceSourceOwner,
  label: string,
  options: { section?: string; deletedWith?: readonly ProjectReferenceTarget[] } = {},
): ProjectReferenceSource {
  return {
    key: projectReferenceSourceKey(owner, options.section),
    owner,
    label,
    deletedWith: [...new Set((options.deletedWith ?? []).map(projectReferenceTargetKey))].sort(),
    ...(options.section ? { section: options.section } : {}),
  }
}

function projectReferenceRelationKey(relation: ProjectReferenceRelation): string {
  switch (relation.kind) {
    case 'command-target':
    case 'actor-use':
    case 'battle-field-use':
    case 'enemy-team-use':
    case 'ambience-use':
    case 'behavior-reference':
    case 'scene-hook-reference':
    case 'tileset-use':
      return tupleKey([relation.kind, relation.use])
    case 'asset-use':
      return tupleKey([relation.kind, relation.expectedKind])
    case 'item-use':
      return tupleKey([relation.kind, relation.access])
    case 'battle-data-use':
      return tupleKey([relation.kind, relation.target, relation.use])
    case 'world-variable':
      return tupleKey([relation.kind, relation.variableKind, relation.access])
    case 'script-reference':
      return tupleKey([relation.kind, relation.use, relation.explicitSelf ? '1' : '0'])
    case 'world-sprite-action-use':
      return tupleKey([relation.kind, relation.actionId])
    case 'battle-sprite-use':
      return tupleKey([relation.kind, relation.expectedProfile])
    case 'entity-address':
    case 'scene-map':
    case 'entry-point-scene':
    case 'world-sprite-use':
    case 'stamp-placement-source':
      return tupleKey([relation.kind])
  }
}

function projectReferenceSourceDefinitionKey(source: ProjectReferenceSource): string {
  return tupleKey([source.label, source.section ?? '', ...[...source.deletedWith].sort()])
}

function encodeScriptCommandOwner(owner: ScriptCommandOwner): ScriptCommandOwnerSnapshot {
  switch (owner.kind) {
    case 'entity-behavior':
      return [
        0,
        owner.sceneId,
        owner.entityId,
        owner.channel === 'trigger' ? 0 : 1,
        owner.behaviorId,
      ]
    case 'scene-hook':
      return [1, owner.sceneId, owner.slot === 'onEnter' ? 0 : 1, owner.hookId]
    case 'entity-hostile-on-lose':
      return [2, owner.sceneId, owner.entityId]
    case 'item-private-script':
      return [3, owner.itemId, owner.ability === 'use' ? 0 : 1, owner.scriptId]
    case 'shared-script':
      return [4, owner.scriptId]
  }
}

function decodeScriptCommandOwner(owner: ScriptCommandOwnerSnapshot): ScriptCommandOwner {
  switch (owner[0]) {
    case 0:
      return {
        kind: 'entity-behavior',
        sceneId: owner[1],
        entityId: owner[2],
        channel: owner[3] === 0 ? 'trigger' : 'auto',
        behaviorId: owner[4],
      }
    case 1:
      return {
        kind: 'scene-hook',
        sceneId: owner[1],
        slot: owner[2] === 0 ? 'onEnter' : 'onTeleport',
        hookId: owner[3],
      }
    case 2:
      return { kind: 'entity-hostile-on-lose', sceneId: owner[1], entityId: owner[2] }
    case 3:
      return {
        kind: 'item-private-script',
        itemId: owner[1],
        ability: owner[2] === 0 ? 'use' : 'throw',
        scriptId: owner[3],
      }
    case 4:
      return { kind: 'shared-script', scriptId: owner[1] }
  }
}

function encodeScriptCommandContainer(
  container: ScriptCommandContainer,
): ScriptCommandContainerSnapshot {
  switch (container.kind) {
    case 'body':
      return [0]
    case 'step':
      return [1, container.stepId, container.section === 'prepare' ? 0 : 1]
    case 'state':
      return [2, container.machineId, container.stateId, container.section === 'prepare' ? 0 : 1]
  }
}

function decodeScriptCommandContainer(
  container: ScriptCommandContainerSnapshot,
): ScriptCommandContainer {
  switch (container[0]) {
    case 0:
      return { kind: 'body' }
    case 1:
      return {
        kind: 'step',
        stepId: container[1],
        section: container[2] === 0 ? 'prepare' : 'body',
      }
    case 2:
      return {
        kind: 'state',
        machineId: container[1],
        stateId: container[2],
        section: container[3] === 0 ? 'prepare' : 'body',
      }
  }
}

function encodeProjectReferenceSourceOwner(
  owner: ProjectReferenceSourceOwner,
): ProjectReferenceSourceOwnerSnapshot {
  switch (owner.kind) {
    case 'scene-entity':
      return [SCENE_ENTITY_SOURCE_CODE, owner.sceneId, owner.entityId]
    case 'scene-page':
      return [SCENE_PAGE_SOURCE_CODE, owner.sceneId, owner.entityId, owner.pageId]
    case 'world-sprite-action':
      return [WORLD_SPRITE_ACTION_SOURCE_CODE, owner.spriteId, owner.actionId]
    case 'script-owner':
      return [SCRIPT_OWNER_SOURCE_CODE, encodeScriptCommandOwner(owner.owner)]
    case 'script-chunk':
      return [SCRIPT_CHUNK_SOURCE_CODE, owner.chunkId, owner.scriptId]
    case 'runtime-world':
      return [RUNTIME_WORLD_SOURCE_CODE]
    default: {
      const code = ID_SOURCE_OWNER_KIND_CODE.get(owner.kind)
      if (code === undefined) throw new Error(`未知引用来源类型 ${owner.kind}`)
      return [code, owner.id]
    }
  }
}

function decodeProjectReferenceSourceOwner(
  owner: ProjectReferenceSourceOwnerSnapshot,
): ProjectReferenceSourceOwner {
  switch (owner[0]) {
    case SCENE_ENTITY_SOURCE_CODE:
      return { kind: 'scene-entity', sceneId: String(owner[1]), entityId: String(owner[2]) }
    case SCENE_PAGE_SOURCE_CODE:
      return {
        kind: 'scene-page',
        sceneId: String(owner[1]),
        entityId: String(owner[2]),
        pageId: String(owner[3]),
      }
    case WORLD_SPRITE_ACTION_SOURCE_CODE:
      return {
        kind: 'world-sprite-action',
        spriteId: String(owner[1]),
        actionId: String(owner[2]),
      }
    case SCRIPT_OWNER_SOURCE_CODE:
      return {
        kind: 'script-owner',
        owner: decodeScriptCommandOwner(owner[1] as ScriptCommandOwnerSnapshot),
      }
    case SCRIPT_CHUNK_SOURCE_CODE:
      return { kind: 'script-chunk', chunkId: String(owner[1]), scriptId: String(owner[2]) }
    case RUNTIME_WORLD_SOURCE_CODE:
      return { kind: 'runtime-world' }
    default: {
      const kind = ID_SOURCE_OWNER_KINDS[owner[0]]
      if (!kind) throw new Error(`未知引用来源编码 ${owner[0]}`)
      return { kind, id: String(owner[1]) }
    }
  }
}

function encodeProjectReferenceLocator(
  locator: ProjectReferenceLocator,
  where: string,
  source: ProjectReferenceSource,
): ProjectReferenceLocatorSnapshot {
  switch (locator.kind) {
    case 'object':
      return locator.section
        ? [0, encodeProjectReferenceTarget(locator.object), locator.section]
        : [0, encodeProjectReferenceTarget(locator.object)]
    case 'scene-page':
      if (
        source.owner.kind === 'scene-page' &&
        source.owner.sceneId === locator.sceneId &&
        source.owner.entityId === locator.entityId &&
        source.owner.pageId === locator.pageId &&
        source.section === locator.channel
      )
        return [5]
      return locator.channel
        ? [
            5,
            locator.sceneId,
            locator.entityId,
            locator.pageId,
            locator.channel === 'trigger' ? 0 : 1,
          ]
        : [5, locator.sceneId, locator.entityId, locator.pageId]
    case 'scene-hook-initial':
      if (
        source.owner.kind === 'scene' &&
        source.owner.id === locator.sceneId &&
        source.section === `hook-initial:${locator.slot}`
      )
        return [6, locator.hookId]
      return [6, locator.sceneId, locator.slot === 'onEnter' ? 0 : 1, locator.hookId]
    case 'canonical-script': {
      const command = locator.reference.locator
      return locator.reference.path === where
        ? [1, encodeScriptCommandContainer(command.container), command.commandPath]
        : [
            1,
            encodeScriptCommandContainer(command.container),
            command.commandPath,
            locator.reference.path,
          ]
    }
    case 'script-owner':
      return [2, encodeScriptCommandOwner(locator.owner)]
    case 'unavailable':
      return [4, locator.reason]
  }
}

function decodeProjectReferenceLocator(
  locator: ProjectReferenceLocatorSnapshot,
  where: string,
  source: ProjectReferenceSource,
): ProjectReferenceLocator {
  switch (locator[0]) {
    case 0:
      return locator[2]
        ? { kind: 'object', object: decodeProjectReferenceTarget(locator[1]), section: locator[2] }
        : { kind: 'object', object: decodeProjectReferenceTarget(locator[1]) }
    case 1: {
      if (source.owner.kind !== 'script-owner')
        throw new Error('canonical locator 的来源不是 script owner')
      return {
        kind: 'canonical-script',
        reference: {
          kind: 'command',
          path: locator[3] ?? where,
          locator: {
            kind: 'command',
            owner: source.owner.owner,
            container: decodeScriptCommandContainer(locator[1]),
            commandPath: locator[2],
          },
        },
      }
    }
    case 2:
      return { kind: 'script-owner', owner: decodeScriptCommandOwner(locator[1]) }
    case 4:
      return { kind: 'unavailable', reason: locator[1] }
    case 5:
      if (locator.length === 1) {
        if (source.owner.kind !== 'scene-page')
          throw new Error('derived scene-page locator 的来源不是 scene page')
        return {
          kind: 'scene-page',
          sceneId: source.owner.sceneId,
          entityId: source.owner.entityId,
          pageId: source.owner.pageId,
          ...(source.section === 'trigger' || source.section === 'auto'
            ? { channel: source.section }
            : {}),
        }
      }
      return {
        kind: 'scene-page',
        sceneId: locator[1],
        entityId: locator[2],
        pageId: locator[3],
        ...(locator[4] === undefined
          ? {}
          : { channel: locator[4] === 0 ? ('trigger' as const) : ('auto' as const) }),
      }
    case 6:
      if (locator.length === 2) {
        if (source.owner.kind !== 'scene' || !source.section?.startsWith('hook-initial:'))
          throw new Error('derived scene-hook locator 的来源不是 hook initial')
        return {
          kind: 'scene-hook-initial',
          sceneId: source.owner.id,
          slot: source.section.slice('hook-initial:'.length) as SceneHookSlot,
          hookId: locator[1],
        }
      }
      return {
        kind: 'scene-hook-initial',
        sceneId: locator[1],
        slot: locator[2] === 0 ? 'onEnter' : 'onTeleport',
        hookId: locator[3],
      }
  }
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

function encodeProjectReferenceRowTail(
  policy: 0 | 1 | 2,
  detailIndex: number | undefined,
): number | undefined {
  if (detailIndex !== undefined) return detailIndex * 3 + policy
  if (policy === 0) return -1
  if (policy === 2) return -2
  return undefined
}

function decodeProjectReferenceRowTail(tail: number | undefined): {
  policy: 0 | 1 | 2
  detailIndex?: number
} {
  if (tail === undefined) return { policy: 1 }
  if (tail === -1) return { policy: 0 }
  if (tail === -2) return { policy: 2 }
  return {
    policy: (tail % 3) as 0 | 1 | 2,
    detailIndex: Math.floor(tail / 3),
  }
}

/** Deterministic, serializable and compact: one edge row can be indexed under child and parent targets. */
export function buildProjectReferenceSnapshot(
  rawEdges: readonly ProjectReferenceEdgeInput[],
  options: { assumeUnique?: boolean } = {},
): ProjectReferenceSnapshotV1 {
  const targetByKey = new Map<string, ProjectReferenceTarget>()
  const sourceInputs: ProjectReferenceSource[] = []
  const sourceWheres: string[][] = []
  const sourceIndexes = new Map<string, number>()
  const sourceDefinitions = new Map<string, string>()
  const relations: ProjectReferenceRelation[] = []
  const relationIndexes = new Map<string, number>()
  const locators: ProjectReferenceLocatorSnapshot[] = []
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

  for (const edge of rawEdges) {
    if (edge.source.key !== projectReferenceSourceKey(edge.source.owner, edge.source.section))
      throw new Error(`引用来源 ${edge.source.key} 不是 owner/section 的稳定派生 key`)
    const targetKey = projectReferenceTargetKey(edge.target)
    const relationKey = projectReferenceRelationKey(edge.relation)
    const encodedLocator = encodeProjectReferenceLocator(edge.locator, edge.where, edge.source)
    const locatorKey = JSON.stringify(encodedLocator)
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

    const sourceDefinition = projectReferenceSourceDefinitionKey(edge.source)
    const previousSourceDefinition = sourceDefinitions.get(edge.source.key)
    if (previousSourceDefinition && previousSourceDefinition !== sourceDefinition)
      throw new Error(`引用来源 ${edge.source.key} 的定义不一致`)
    let sourceIndex = sourceIndexes.get(edge.source.key)
    if (sourceIndex === undefined) {
      sourceIndex = sourceInputs.length
      sourceInputs.push(edge.source)
      sourceWheres.push([])
      sourceIndexes.set(edge.source.key, sourceIndex)
      sourceDefinitions.set(edge.source.key, sourceDefinition)
    }
    sourceWheres[sourceIndex]!.push(edge.where)

    let relationIndex = relationIndexes.get(relationKey)
    if (relationIndex === undefined) {
      relationIndex = relations.length
      relations.push(edge.relation)
      relationIndexes.set(relationKey, relationIndex)
    }
    let locatorIndex = locatorIndexes.get(locatorKey)
    if (locatorIndex === undefined) {
      locatorIndex = locators.length
      locators.push(encodedLocator)
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

  for (const source of sourceInputs) {
    const deletedWith = [...source.deletedWith].sort()
    if (sameStrings(deletedWith, defaultProjectReferenceSourceDeletedWith(source.owner))) continue
    for (const targetKey of deletedWith)
      if (!targetByKey.has(targetKey))
        targetByKey.set(targetKey, decodeProjectReferenceTargetKey(targetKey))
  }
  const targetKeys = [...targetByKey.keys()].sort()
  const targets = targetKeys.map((key) => encodeProjectReferenceTarget(targetByKey.get(key)!))
  const targetIndexes = new Map(targetKeys.map((key, index) => [key, index]))
  const commonPrefix = (values: readonly string[]): string => {
    const first = values[0] ?? ''
    let length = first.length
    for (let valueIndex = 1; valueIndex < values.length && length > 0; valueIndex += 1) {
      const value = values[valueIndex]!
      length = Math.min(length, value.length)
      let index = 0
      while (index < length && first[index] === value[index]) index += 1
      length = index
    }
    return first.slice(0, length)
  }
  const sourceWherePrefixes = sourceWheres.map((wheres, index) => {
    const source = sourceInputs[index]!
    const derived = defaultProjectReferenceSourceWherePrefix(source.owner, source.section)
    return derived && wheres.every((where) => where.startsWith(derived))
      ? derived
      : commonPrefix(wheres)
  })
  const sources: ProjectReferenceSourceSnapshot[] = sourceInputs.map((source, index) => {
    const deletedWith = [...source.deletedWith].sort()
    const defaultDeletedWith = defaultProjectReferenceSourceDeletedWith(source.owner)
    const wherePrefix = sourceWherePrefixes[index]!
    return [
      encodeProjectReferenceSourceOwner(source.owner),
      source.label === defaultProjectReferenceSourceLabel(source.owner) ? 0 : source.label,
      sameStrings(deletedWith, defaultDeletedWith)
        ? 0
        : deletedWith.map((key) => targetIndexes.get(key)!),
      source.section ?? 0,
      wherePrefix === defaultProjectReferenceSourceWherePrefix(source.owner, source.section)
        ? 0
        : wherePrefix,
    ]
  })
  const details: string[] = []
  const detailIndexes = new Map<string, number>()
  const whereSuffixes: string[] = []
  const whereSuffixIndexes = new Map<string, number>()
  const rows: ProjectReferenceRow[] = rowInputs.map(
    ([targetKey, sourceIndex, relationIndex, locatorIndex, policy, where, detail]) => {
      let detailIndex: number | undefined
      if (detail !== undefined) {
        detailIndex = detailIndexes.get(detail)
        if (detailIndex === undefined) {
          detailIndex = details.length
          details.push(detail)
          detailIndexes.set(detail, detailIndex)
        }
      }
      const whereSuffix = where.slice(sourceWherePrefixes[sourceIndex]!.length)
      let whereSuffixIndex = whereSuffixIndexes.get(whereSuffix)
      if (whereSuffixIndex === undefined) {
        whereSuffixIndex = whereSuffixes.length
        whereSuffixes.push(whereSuffix)
        whereSuffixIndexes.set(whereSuffix, whereSuffixIndex)
      }
      const row = [
        targetIndexes.get(targetKey)!,
        sourceIndex,
        relationIndex,
        locatorIndex,
        whereSuffixIndex,
      ] as const
      const tail = encodeProjectReferenceRowTail(policy, detailIndex)
      return tail === undefined ? row : ([...row, tail] as const)
    },
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
    sources,
    relations,
    locators,
    whereSuffixes,
    details,
    rows,
    targetOffsets,
    targetEdgeIds,
  }
}

export class ProjectReferenceIndex {
  private readonly targetIndexes: ReadonlyMap<string, number>
  private readonly targets: readonly ProjectReferenceTarget[]
  private readonly sources: readonly ProjectReferenceSource[]
  private readonly sourceWherePrefixes: readonly string[]

  constructor(readonly snapshot: ProjectReferenceSnapshotV1) {
    if (snapshot.targetOffsets.length !== snapshot.targets.length + 1)
      throw new Error('引用索引 targetOffsets 长度不匹配')
    if (snapshot.targetOffsets.at(-1) !== snapshot.targetEdgeIds.length)
      throw new Error('引用索引 targetOffsets 尾界不匹配')
    this.targets = snapshot.targets.map(decodeProjectReferenceTarget)
    this.targetIndexes = new Map(
      this.targets.map((target, index) => [projectReferenceTargetKey(target), index]),
    )
    this.sources = snapshot.sources.map((source) => {
      const owner = decodeProjectReferenceSourceOwner(source[0])
      const section = source[3] === 0 ? undefined : source[3]
      return {
        owner,
        label: source[1] === 0 ? defaultProjectReferenceSourceLabel(owner) : source[1],
        deletedWith:
          source[2] === 0
            ? defaultProjectReferenceSourceDeletedWith(owner)
            : source[2].map((index) => projectReferenceTargetKey(this.targets[index]!)),
        ...(section ? { section } : {}),
        key: projectReferenceSourceKey(owner, section),
      }
    })
    this.sourceWherePrefixes = snapshot.sources.map((source, index) =>
      source[4] === 0
        ? (defaultProjectReferenceSourceWherePrefix(
            this.sources[index]!.owner,
            this.sources[index]!.section,
          ) ?? '')
        : source[4],
    )
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
        this.sources
          .filter((source) => source.deletedWith.some((key) => targetKeys.has(key)))
          .map((source) => source.key),
      ),
    }
  }

  private edge(id: number): ProjectReferenceEdge {
    const row = this.snapshot.rows[id]
    if (!row) throw new Error(`引用边 ${id} 不存在`)
    const [targetIndex, sourceIndex, relationIndex, locatorIndex, whereSuffixIndex, tail] = row
    const { policy, detailIndex } = decodeProjectReferenceRowTail(tail)
    const where = `${this.sourceWherePrefixes[sourceIndex]!}${this.snapshot.whereSuffixes[whereSuffixIndex]!}`
    return {
      id,
      target: this.targets[targetIndex]!,
      source: this.sources[sourceIndex]!,
      relation: this.snapshot.relations[relationIndex]!,
      locator: decodeProjectReferenceLocator(
        this.snapshot.locators[locatorIndex]!,
        where,
        this.sources[sourceIndex]!,
      ),
      deletePolicy: CODE_POLICY[policy],
      where,
      ...(detailIndex === undefined ? {} : { detail: this.snapshot.details[detailIndex]! }),
    }
  }
}

export function createProjectReferenceIndex(
  snapshot: ProjectReferenceSnapshotV1,
): ProjectReferenceIndex {
  return new ProjectReferenceIndex(snapshot)
}
