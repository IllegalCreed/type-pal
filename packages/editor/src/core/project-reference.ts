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
  ScriptReferenceLocator,
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

export type ProjectReferenceTargetSnapshot =
  | readonly [kind: ProjectReferenceSimpleKind, id: string]
  | readonly [kind: 'entity', sceneId: string, entityId: string]
  | readonly [kind: 'scene-entry', sceneId: string, entryId: string]
  | readonly [
      kind: 'entity-behavior',
      sceneId: string,
      entityId: string,
      channel: 'trigger' | 'auto',
      behaviorId: string,
    ]
  | readonly [kind: 'scene-hook', sceneId: string, slot: SceneHookSlot, hookId: string]
  | readonly [kind: 'world-sprite-action', spriteId: string, actionId: string]

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

export type ScriptReferenceLocatorSnapshot =
  | readonly [
      kind: 0,
      owner: ScriptCommandOwnerSnapshot,
      container: ScriptCommandContainerSnapshot,
      commandPath: string,
    ]
  | readonly [kind: 1, sceneId: string, entityId: string, pageId: string, channel: 0 | 1]
  | readonly [kind: 2, sceneId: string, slot: 0 | 1, hookId: string]

type ProjectReferenceIdSourceOwnerKind = Exclude<
  ProjectReferenceSourceOwner['kind'],
  | 'scene-entity'
  | 'scene-page'
  | 'world-sprite-action'
  | 'script-owner'
  | 'script-chunk'
  | 'runtime-world'
>

export type ProjectReferenceSourceOwnerSnapshot =
  | readonly [kind: ProjectReferenceIdSourceOwnerKind, id: string]
  | readonly [kind: 'scene-entity', sceneId: string, entityId: string]
  | readonly [kind: 'scene-page', sceneId: string, entityId: string, pageId: string]
  | readonly [kind: 'world-sprite-action', spriteId: string, actionId: string]
  | readonly [kind: 'script-owner', owner: ScriptCommandOwnerSnapshot]
  | readonly [kind: 'script-chunk', chunkId: string, scriptId: string]
  | readonly [kind: 'runtime-world']

/** Worker wire tuple; deletedWith entries index `deletionTargets`, wherePrefix prefixes row paths. */
export type ProjectReferenceSourceSnapshot = readonly [
  owner: ProjectReferenceSourceOwnerSnapshot,
  label: string | 0,
  deletedWith: readonly number[],
  section: string | 0,
  wherePrefix: string,
]

export type ProjectReferenceLocator =
  | { kind: 'object'; object: ProjectReferenceTarget; section?: string }
  | { kind: 'scene-page'; sceneId: string; entityId: string; pageId: string }
  | { kind: 'canonical-script'; reference: CanonicalScriptReference }
  | { kind: 'script-owner'; owner: ScriptCommandOwner }
  | { kind: 'legacy-script'; scriptId: string; commandPath?: string }
  | { kind: 'unavailable'; reason: string }

export type ProjectReferenceLocatorSnapshot =
  | readonly [kind: 0, object: ProjectReferenceTargetSnapshot, section?: string]
  | readonly [kind: 1, locator: ScriptReferenceLocatorSnapshot, path?: string]
  | readonly [kind: 2, owner: ScriptCommandOwnerSnapshot]
  | readonly [kind: 3, scriptId: string, commandPath?: string]
  | readonly [kind: 4, reason: string]
  | readonly [kind: 5, sceneId: string, entityId: string, pageId: string]

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
  detailIndex?: number,
]

export interface ProjectReferenceSnapshotV1 {
  version: 1
  targets: readonly ProjectReferenceTargetSnapshot[]
  sources: readonly ProjectReferenceSourceSnapshot[]
  deletionTargets: readonly string[]
  relations: readonly ProjectReferenceRelation[]
  locators: readonly ProjectReferenceLocatorSnapshot[]
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
      return [target.kind, target.sceneId, target.entityId]
    case 'scene-entry':
      return [target.kind, target.sceneId, target.entryId]
    case 'entity-behavior':
      return [target.kind, target.sceneId, target.entityId, target.channel, target.behaviorId]
    case 'scene-hook':
      return [target.kind, target.sceneId, target.slot, target.hookId]
    case 'world-sprite-action':
      return [target.kind, target.spriteId, target.actionId]
    default:
      return [target.kind, target.id]
  }
}

function decodeProjectReferenceTarget(
  target: ProjectReferenceTargetSnapshot,
): ProjectReferenceTarget {
  switch (target[0]) {
    case 'entity':
      return { kind: target[0], sceneId: target[1], entityId: target[2] }
    case 'scene-entry':
      return { kind: target[0], sceneId: target[1], entryId: target[2] }
    case 'entity-behavior':
      return {
        kind: target[0],
        sceneId: target[1],
        entityId: target[2],
        channel: target[3],
        behaviorId: target[4],
      }
    case 'scene-hook':
      return { kind: target[0], sceneId: target[1], slot: target[2], hookId: target[3] }
    case 'world-sprite-action':
      return { kind: target[0], spriteId: target[1], actionId: target[2] }
    default:
      return { kind: target[0], id: target[1] }
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

function encodeScriptReferenceLocator(
  locator: ScriptReferenceLocator,
): ScriptReferenceLocatorSnapshot {
  switch (locator.kind) {
    case 'command':
      return [
        0,
        encodeScriptCommandOwner(locator.owner),
        encodeScriptCommandContainer(locator.container),
        locator.commandPath,
      ]
    case 'entity-page':
      return [
        1,
        locator.sceneId,
        locator.entityId,
        locator.pageId,
        locator.channel === 'trigger' ? 0 : 1,
      ]
    case 'scene-hook-initial':
      return [2, locator.sceneId, locator.slot === 'onEnter' ? 0 : 1, locator.hookId]
  }
}

function decodeScriptReferenceLocator(
  locator: ScriptReferenceLocatorSnapshot,
): ScriptReferenceLocator {
  switch (locator[0]) {
    case 0:
      return {
        kind: 'command',
        owner: decodeScriptCommandOwner(locator[1]),
        container: decodeScriptCommandContainer(locator[2]),
        commandPath: locator[3],
      }
    case 1:
      return {
        kind: 'entity-page',
        sceneId: locator[1],
        entityId: locator[2],
        pageId: locator[3],
        channel: locator[4] === 0 ? 'trigger' : 'auto',
      }
    case 2:
      return {
        kind: 'scene-hook-initial',
        sceneId: locator[1],
        slot: locator[2] === 0 ? 'onEnter' : 'onTeleport',
        hookId: locator[3],
      }
  }
}

function encodeProjectReferenceSourceOwner(
  owner: ProjectReferenceSourceOwner,
): ProjectReferenceSourceOwnerSnapshot {
  switch (owner.kind) {
    case 'scene-entity':
      return [owner.kind, owner.sceneId, owner.entityId]
    case 'scene-page':
      return [owner.kind, owner.sceneId, owner.entityId, owner.pageId]
    case 'world-sprite-action':
      return [owner.kind, owner.spriteId, owner.actionId]
    case 'script-owner':
      return [owner.kind, encodeScriptCommandOwner(owner.owner)]
    case 'script-chunk':
      return [owner.kind, owner.chunkId, owner.scriptId]
    case 'runtime-world':
      return [owner.kind]
    default:
      return [owner.kind, owner.id]
  }
}

function decodeProjectReferenceSourceOwner(
  owner: ProjectReferenceSourceOwnerSnapshot,
): ProjectReferenceSourceOwner {
  switch (owner[0]) {
    case 'scene-entity':
      return { kind: owner[0], sceneId: owner[1], entityId: owner[2] }
    case 'scene-page':
      return { kind: owner[0], sceneId: owner[1], entityId: owner[2], pageId: owner[3] }
    case 'world-sprite-action':
      return { kind: owner[0], spriteId: owner[1], actionId: owner[2] }
    case 'script-owner':
      return { kind: owner[0], owner: decodeScriptCommandOwner(owner[1]) }
    case 'script-chunk':
      return { kind: owner[0], chunkId: owner[1], scriptId: owner[2] }
    case 'runtime-world':
      return { kind: owner[0] }
    default:
      return { kind: owner[0], id: owner[1] } as ProjectReferenceSourceOwner
  }
}

function encodeProjectReferenceLocator(
  locator: ProjectReferenceLocator,
  where: string,
): ProjectReferenceLocatorSnapshot {
  switch (locator.kind) {
    case 'object':
      return locator.section
        ? [0, encodeProjectReferenceTarget(locator.object), locator.section]
        : [0, encodeProjectReferenceTarget(locator.object)]
    case 'scene-page':
      return [5, locator.sceneId, locator.entityId, locator.pageId]
    case 'canonical-script':
      return locator.reference.path === where
        ? [1, encodeScriptReferenceLocator(locator.reference.locator)]
        : [1, encodeScriptReferenceLocator(locator.reference.locator), locator.reference.path]
    case 'script-owner':
      return [2, encodeScriptCommandOwner(locator.owner)]
    case 'legacy-script':
      return locator.commandPath !== undefined
        ? [3, locator.scriptId, locator.commandPath]
        : [3, locator.scriptId]
    case 'unavailable':
      return [4, locator.reason]
  }
}

function decodeProjectReferenceLocator(
  locator: ProjectReferenceLocatorSnapshot,
  where: string,
): ProjectReferenceLocator {
  switch (locator[0]) {
    case 0:
      return locator[2]
        ? { kind: 'object', object: decodeProjectReferenceTarget(locator[1]), section: locator[2] }
        : { kind: 'object', object: decodeProjectReferenceTarget(locator[1]) }
    case 1: {
      const value = decodeScriptReferenceLocator(locator[1])
      const path = locator[2] ?? where
      if (value.kind === 'command')
        return {
          kind: 'canonical-script',
          reference: { kind: 'command', path, locator: value },
        }
      if (value.kind === 'entity-page')
        return {
          kind: 'canonical-script',
          reference: { kind: 'page', path, locator: value },
        }
      return {
        kind: 'canonical-script',
        reference: { kind: 'initial', path, locator: value },
      }
    }
    case 2:
      return { kind: 'script-owner', owner: decodeScriptCommandOwner(locator[1]) }
    case 3:
      return locator[2] !== undefined
        ? { kind: 'legacy-script', scriptId: locator[1], commandPath: locator[2] }
        : { kind: 'legacy-script', scriptId: locator[1] }
    case 4:
      return { kind: 'unavailable', reason: locator[1] }
    case 5:
      return { kind: 'scene-page', sceneId: locator[1], entityId: locator[2], pageId: locator[3] }
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
  const serializedObjects = new WeakMap<object, string>()
  const serializeIdentity = (value: object): string => {
    const cached = serializedObjects.get(value)
    if (cached !== undefined) return cached
    const serialized = stableSerialize(value)
    serializedObjects.set(value, serialized)
    return serialized
  }

  for (const edge of rawEdges) {
    if (edge.source.key !== projectReferenceSourceKey(edge.source.owner, edge.source.section))
      throw new Error(`引用来源 ${edge.source.key} 不是 owner/section 的稳定派生 key`)
    const targetKey = projectReferenceTargetKey(edge.target)
    const relationKey = serializeIdentity(edge.relation)
    const encodedLocator = encodeProjectReferenceLocator(edge.locator, edge.where)
    const locatorKey = serializeIdentity(encodedLocator)
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
  const deletionTargets = [...new Set(sourceInputs.flatMap((source) => source.deletedWith))].sort()
  const deletionTargetIndexes = new Map(deletionTargets.map((key, index) => [key, index]))
  const sourceWherePrefixes = sourceWheres.map(commonPrefix)
  const sources: ProjectReferenceSourceSnapshot[] = sourceInputs.map((source, index) => [
    encodeProjectReferenceSourceOwner(source.owner),
    source.label === defaultProjectReferenceSourceLabel(source.owner) ? 0 : source.label,
    source.deletedWith.map((key) => deletionTargetIndexes.get(key)!),
    source.section ?? 0,
    sourceWherePrefixes[index]!,
  ])
  const details: string[] = []
  const detailIndexes = new Map<string, number>()
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
      const row = [
        targetIndexes.get(targetKey)!,
        sourceIndex,
        relationIndex,
        locatorIndex,
        policy,
        where.slice(sourceWherePrefixes[sourceIndex]!.length),
      ] as const
      return detailIndex === undefined ? row : ([...row, detailIndex] as const)
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
    deletionTargets,
    relations,
    locators,
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
    this.sourceWherePrefixes = snapshot.sources.map((source) => source[4])
    this.sources = snapshot.sources.map((source) => {
      const owner = decodeProjectReferenceSourceOwner(source[0])
      const section = source[3] === 0 ? undefined : source[3]
      return {
        owner,
        label: source[1] === 0 ? defaultProjectReferenceSourceLabel(owner) : source[1],
        deletedWith: source[2].map((index) => snapshot.deletionTargets[index]!),
        ...(section ? { section } : {}),
        key: projectReferenceSourceKey(owner, section),
      }
    })
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
    const [
      targetIndex,
      sourceIndex,
      relationIndex,
      locatorIndex,
      policy,
      whereSuffix,
      detailIndex,
    ] = row
    const where = `${this.sourceWherePrefixes[sourceIndex]!}${whereSuffix}`
    return {
      id,
      target: this.targets[targetIndex]!,
      source: this.sources[sourceIndex]!,
      relation: this.snapshot.relations[relationIndex]!,
      locator: decodeProjectReferenceLocator(this.snapshot.locators[locatorIndex]!, where),
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
