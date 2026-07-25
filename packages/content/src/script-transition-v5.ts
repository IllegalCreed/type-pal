import type { BehaviorId, EntityAddress, FlowCursor, HookId, PageId, StageId } from './script-v5.js'

export const SCRIPT_V4_V5_TRANSITION_ID = 'script-v4-v5' as const
export const SCRIPT_V4_V5_SIDECAR_PATH = 'content/migrations/script-v4-v5-save.json' as const

function isLegacyScriptRefShape(value: Record<string, unknown>): boolean {
  return (
    typeof value.chunk === 'string' &&
    value.chunk.length > 0 &&
    typeof value.id === 'string' &&
    value.id.length > 0
  )
}

/**
 * v4 scene hook binding identity projection. ScriptRef.chunk is only a loading hint;
 * stable id and all surrounding author semantics remain in the digest input.
 */
export function canonicalLegacyBindingV4(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalLegacyBindingV4)
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !(key === 'chunk' && isLegacyScriptRefShape(record)))
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, child]) => [key, canonicalLegacyBindingV4(child)]),
  )
}

/** Canonical JSON bytes shared by sidecar producers and async loader digest verification. */
export function canonicalScriptTransitionJson(value: unknown): string {
  const canonical = (child: unknown, path: string): unknown => {
    if (child === null || typeof child === 'string' || typeof child === 'boolean') return child
    if (typeof child === 'number') {
      if (!Number.isFinite(child)) throw new Error(`${path}: 非有限 number`)
      return child
    }
    if (Array.isArray(child))
      return child.map((entry, index) => canonical(entry, `${path}[${index}]`))
    if (!child || typeof child !== 'object') throw new Error(`${path}: 不是 JSON value`)
    const record = child as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(record)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, canonical(entry, `${path}.${key}`)]),
    )
  }
  return JSON.stringify(canonical(value, 'script transition'))
}

export interface ProjectMigrationDescriptorV1 {
  version: 1
  fromContentVersion: 4
  toContentVersion: 5
  path: typeof SCRIPT_V4_V5_SIDECAR_PATH
  sha256: string
}

function descriptorRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!allowedKeys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new Error(`${path}: 期望非空字符串`)
  return value
}

function sha256(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new Error(`${path}: 期望小写 SHA-256`)
  return value
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望数组`)
  return value
}

function entityAddress(value: unknown, path: string): EntityAddress {
  const address = descriptorRecord(value, path)
  exactKeys(address, ['scene', 'entity'], path)
  nonEmptyString(address.scene, `${path}.scene`)
  nonEmptyString(address.entity, `${path}.entity`)
  return address as unknown as EntityAddress
}

function owner(value: unknown, path: string): CanonicalScriptOwnerV5 {
  const identity = descriptorRecord(value, path)
  if (identity.kind === 'entity-behavior') {
    exactKeys(identity, ['kind', 'sceneId', 'entityId', 'channel', 'behaviorId'], path)
    nonEmptyString(identity.sceneId, `${path}.sceneId`)
    nonEmptyString(identity.entityId, `${path}.entityId`)
    if (identity.channel !== 'trigger' && identity.channel !== 'auto')
      throw new Error(`${path}.channel: 期望 trigger|auto`)
    nonEmptyString(identity.behaviorId, `${path}.behaviorId`)
    return identity as unknown as CanonicalScriptOwnerV5
  }
  if (identity.kind === 'scene-hook') {
    exactKeys(identity, ['kind', 'sceneId', 'hook', 'hookId'], path)
    nonEmptyString(identity.sceneId, `${path}.sceneId`)
    if (identity.hook !== 'onEnter' && identity.hook !== 'onTeleport')
      throw new Error(`${path}.hook: 期望 onEnter|onTeleport`)
    nonEmptyString(identity.hookId, `${path}.hookId`)
    return identity as unknown as CanonicalScriptOwnerV5
  }
  throw new Error(`${path}.kind: 期望 entity-behavior|scene-hook`)
}

function authorIdentity(value: unknown, path: string): CanonicalAuthorIdentityV5 {
  const identity = descriptorRecord(value, path)
  if (identity.kind === 'entity-behavior' || identity.kind === 'scene-hook')
    return owner(identity, path)
  if (identity.kind === 'entity-page') {
    exactKeys(identity, ['kind', 'sceneId', 'entityId', 'pageId'], path)
    nonEmptyString(identity.sceneId, `${path}.sceneId`)
    nonEmptyString(identity.entityId, `${path}.entityId`)
    nonEmptyString(identity.pageId, `${path}.pageId`)
    return identity as unknown as CanonicalAuthorIdentityV5
  }
  if (identity.kind === 'state-machine') {
    exactKeys(identity, ['kind', 'owner', 'machineId'], path)
    owner(identity.owner, `${path}.owner`)
    nonEmptyString(identity.machineId, `${path}.machineId`)
    return identity as unknown as CanonicalAuthorIdentityV5
  }
  if (identity.kind === 'shared-script') {
    exactKeys(identity, ['kind', 'scriptId'], path)
    nonEmptyString(identity.scriptId, `${path}.scriptId`)
    return identity as unknown as CanonicalAuthorIdentityV5
  }
  if (identity.kind === 'item-private-script') {
    exactKeys(identity, ['kind', 'itemId', 'scriptId'], path)
    nonEmptyString(identity.itemId, `${path}.itemId`)
    if (identity.scriptId !== 'use') throw new Error(`${path}.scriptId: 期望 use`)
    return identity as unknown as CanonicalAuthorIdentityV5
  }
  throw new Error(`${path}.kind: 未知 canonical author identity`)
}

function flowCursor(value: unknown, path: string): FlowCursor {
  const cursor = descriptorRecord(value, path)
  if (cursor.kind === 'stage') {
    exactKeys(cursor, ['kind', 'stage'], path)
    nonEmptyString(cursor.stage, `${path}.stage`)
    return cursor as unknown as FlowCursor
  }
  if (cursor.kind === 'state') {
    exactKeys(cursor, ['kind', 'machine', 'state'], path)
    nonEmptyString(cursor.machine, `${path}.machine`)
    nonEmptyString(cursor.state, `${path}.state`)
    return cursor as unknown as FlowCursor
  }
  throw new Error(`${path}.kind: 期望 stage|state`)
}

function sortedUniqueAddresses(values: unknown, path: string): EntityAddress[] {
  const targets = array(values, path).map((target, index) =>
    entityAddress(target, `${path}[${index}]`),
  )
  if (targets.length === 0) throw new Error(`${path}: broadcast-v4 targets 不得为空`)
  const keys = targets.map((target) => `${target.scene}\u0000${target.entity}`)
  for (let index = 0; index < keys.length; index++) {
    if (index > 0 && keys[index - 1]! >= keys[index]!)
      throw new Error(`${path}: targets 必须严格排序且无重复`)
  }
  return targets
}

function cursorTarget(value: unknown, path: string): LegacyCursorTargetV1 {
  const target = descriptorRecord(value, path)
  exactKeys(target, ['legacyStageCount', 'target', 'indices'], path)
  if (!Number.isInteger(target.legacyStageCount) || Number(target.legacyStageCount) <= 0)
    throw new Error(`${path}.legacyStageCount: 期望正整数`)
  owner(target.target, `${path}.target`)
  const indices = array(target.indices, `${path}.indices`)
  if (indices.length !== target.legacyStageCount)
    throw new Error(`${path}.indices: 必须逐项覆盖 legacyStageCount`)
  const seen = new Set<number>()
  indices.forEach((raw, index) => {
    const entry = descriptorRecord(raw, `${path}.indices[${index}]`)
    exactKeys(entry, ['index', 'cursor'], `${path}.indices[${index}]`)
    if (
      !Number.isInteger(entry.index) ||
      Number(entry.index) < 0 ||
      Number(entry.index) >= Number(target.legacyStageCount)
    )
      throw new Error(`${path}.indices[${index}].index: 越界`)
    if (seen.has(Number(entry.index)))
      throw new Error(`${path}.indices[${index}].index: 重复 ${String(entry.index)}`)
    seen.add(Number(entry.index))
    flowCursor(entry.cursor, `${path}.indices[${index}].cursor`)
  })
  return target as unknown as LegacyCursorTargetV1
}

/** manifest registry 的精确 guard；文件存在性与 bytes digest 由异步 loader/preflight 负责。 */
export function validateProjectMigrationDescriptorV1(
  value: unknown,
  path = `manifest.migrations.${SCRIPT_V4_V5_TRANSITION_ID}`,
): ProjectMigrationDescriptorV1 {
  const descriptor = descriptorRecord(value, path)
  const allowed = new Set(['version', 'fromContentVersion', 'toContentVersion', 'path', 'sha256'])
  for (const key of Object.keys(descriptor))
    if (!allowed.has(key)) throw new Error(`${path}.${key}: 未知字段`)
  if (descriptor.version !== 1) throw new Error(`${path}.version: 期望 1`)
  if (descriptor.fromContentVersion !== 4) throw new Error(`${path}.fromContentVersion: 期望 4`)
  if (descriptor.toContentVersion !== 5) throw new Error(`${path}.toContentVersion: 期望 5`)
  if (descriptor.path !== SCRIPT_V4_V5_SIDECAR_PATH)
    throw new Error(`${path}.path: 期望 ${SCRIPT_V4_V5_SIDECAR_PATH}`)
  if (typeof descriptor.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(descriptor.sha256))
    throw new Error(`${path}.sha256: 期望小写 SHA-256`)
  return descriptor as unknown as ProjectMigrationDescriptorV1
}

export type CanonicalScriptOwnerV5 =
  | {
      kind: 'entity-behavior'
      sceneId: string
      entityId: string
      channel: 'trigger' | 'auto'
      behaviorId: BehaviorId
    }
  | {
      kind: 'scene-hook'
      sceneId: string
      hook: 'onEnter' | 'onTeleport'
      hookId: HookId
    }

export type CanonicalAuthorIdentityV5 =
  | CanonicalScriptOwnerV5
  | { kind: 'entity-page'; sceneId: string; entityId: string; pageId: PageId }
  | { kind: 'state-machine'; owner: CanonicalScriptOwnerV5; machineId: string }
  | { kind: 'shared-script'; scriptId: string }
  | { kind: 'item-private-script'; itemId: string; scriptId: 'use' }

export type LegacyEntityAliasV1 =
  | { legacyId: string; mode: 'single'; target: EntityAddress }
  | { legacyId: string; mode: 'broadcast-v4'; targets: EntityAddress[] }

export interface LegacyCursorTargetV1 {
  legacyStageCount: number
  target: CanonicalScriptOwnerV5
  indices: Array<{ index: number; cursor: FlowCursor }>
}

export type LegacyCursorAliasV1 =
  | { legacyKey: string; mode: 'single'; target: LegacyCursorTargetV1 }
  | { legacyKey: string; mode: 'broadcast-v4'; targets: LegacyCursorTargetV1[] }

export interface LegacyBindingAliasV1 {
  from: {
    kind: 'scene-hook-binding'
    sceneId: string
    hook: 'onEnter' | 'onTeleport'
    digest: string
  }
  target: Extract<CanonicalAuthorIdentityV5, { kind: 'scene-hook' }>
}

export interface LegacyPageLineagePlanV1 {
  owner: EntityAddress
  entries: Array<{
    oursPageIndex: number
    lineage: { kind: 'baseline'; baselinePageIndex: number } | { kind: 'new'; pageId: PageId }
  }>
}

export type StageLineageFlowV1 =
  | {
      kind: 'legacy'
      flow:
        | {
            kind: 'legacy-entity-flow'
            sceneId: string
            entityId: string
            pageIndex: number
            channel: 'trigger' | 'auto'
          }
        | {
            kind: 'legacy-scene-hook'
            sceneId: string
            hook: 'onEnter' | 'onTeleport'
          }
    }
  | { kind: 'canonical'; flow: CanonicalScriptOwnerV5 }

export interface LegacyStageLineagePlanV1 {
  flow: StageLineageFlowV1
  entries: Array<{
    oursStageIndex: number
    lineage: { kind: 'baseline'; baselineStageIndex: number } | { kind: 'new'; stageId: StageId }
  }>
}

export type ProjectLocalAllocationV1 =
  | {
      kind: 'author-cell'
      source: { path: string; sourceSha256: string }
      target: CanonicalAuthorIdentityV5
    }
  | { kind: 'page'; owner: EntityAddress; oursPageIndex: number; pageId: PageId }
  | { kind: 'stage'; flow: StageLineageFlowV1; oursStageIndex: number; stageId: StageId }

export interface ProjectMigrationSidecarV1 {
  version: 1
  projectId: string
  transitionId: typeof SCRIPT_V4_V5_TRANSITION_ID
  fromContentVersion: 4
  toContentVersion: 5
  sourceAuditDigest: string
  provenance:
    | { kind: 'pal-baseline'; fullLedgerDigest: string }
    | { kind: 'project-local'; transformDigest: string }
  legacyBindings: LegacyBindingAliasV1[]
  legacyCursors: LegacyCursorAliasV1[]
  legacyEntities: LegacyEntityAliasV1[]
  lineagePlans: {
    pages: LegacyPageLineagePlanV1[]
    stages: LegacyStageLineagePlanV1[]
  }
  localAllocations: ProjectLocalAllocationV1[]
  targetClosures: Array<{ target: CanonicalAuthorIdentityV5; identityDigest: string }>
  digest: string
}

/**
 * 兼容 sidecar 精确结构 guard。descriptor 的文件 bytes digest 另由异步 preflight 校验；
 * 本函数负责 alias/lineage/closure 自身的唯一性和可执行形状。
 */
export function validateProjectMigrationSidecarV1(
  value: unknown,
  expectedProjectId?: string,
  path = SCRIPT_V4_V5_SIDECAR_PATH,
): ProjectMigrationSidecarV1 {
  const sidecar = descriptorRecord(value, path)
  exactKeys(
    sidecar,
    [
      'version',
      'projectId',
      'transitionId',
      'fromContentVersion',
      'toContentVersion',
      'sourceAuditDigest',
      'provenance',
      'legacyBindings',
      'legacyCursors',
      'legacyEntities',
      'lineagePlans',
      'localAllocations',
      'targetClosures',
      'digest',
    ],
    path,
  )
  if (sidecar.version !== 1) throw new Error(`${path}.version: 期望 1`)
  const projectId = nonEmptyString(sidecar.projectId, `${path}.projectId`)
  if (expectedProjectId !== undefined && projectId !== expectedProjectId)
    throw new Error(`${path}.projectId: 期望 ${expectedProjectId}，收到 ${projectId}`)
  if (sidecar.transitionId !== SCRIPT_V4_V5_TRANSITION_ID)
    throw new Error(`${path}.transitionId: 期望 ${SCRIPT_V4_V5_TRANSITION_ID}`)
  if (sidecar.fromContentVersion !== 4 || sidecar.toContentVersion !== 5)
    throw new Error(`${path}: 期望 content transition 4 -> 5`)
  sha256(sidecar.sourceAuditDigest, `${path}.sourceAuditDigest`)
  sha256(sidecar.digest, `${path}.digest`)

  const provenance = descriptorRecord(sidecar.provenance, `${path}.provenance`)
  if (provenance.kind === 'pal-baseline') {
    exactKeys(provenance, ['kind', 'fullLedgerDigest'], `${path}.provenance`)
    sha256(provenance.fullLedgerDigest, `${path}.provenance.fullLedgerDigest`)
  } else if (provenance.kind === 'project-local') {
    exactKeys(provenance, ['kind', 'transformDigest'], `${path}.provenance`)
    sha256(provenance.transformDigest, `${path}.provenance.transformDigest`)
  } else throw new Error(`${path}.provenance.kind: 期望 pal-baseline|project-local`)

  const entityKeys = new Set<string>()
  array(sidecar.legacyEntities, `${path}.legacyEntities`).forEach((raw, index) => {
    const aliasPath = `${path}.legacyEntities[${index}]`
    const alias = descriptorRecord(raw, aliasPath)
    if (alias.mode === 'single') {
      exactKeys(alias, ['legacyId', 'mode', 'target'], aliasPath)
      entityAddress(alias.target, `${aliasPath}.target`)
    } else if (alias.mode === 'broadcast-v4') {
      exactKeys(alias, ['legacyId', 'mode', 'targets'], aliasPath)
      sortedUniqueAddresses(alias.targets, `${aliasPath}.targets`)
    } else throw new Error(`${aliasPath}.mode: 期望 single|broadcast-v4`)
    const legacyId = nonEmptyString(alias.legacyId, `${aliasPath}.legacyId`)
    if (entityKeys.has(legacyId)) throw new Error(`${aliasPath}.legacyId: 重复 ${legacyId}`)
    entityKeys.add(legacyId)
  })

  const cursorKeys = new Set<string>()
  array(sidecar.legacyCursors, `${path}.legacyCursors`).forEach((raw, index) => {
    const aliasPath = `${path}.legacyCursors[${index}]`
    const alias = descriptorRecord(raw, aliasPath)
    if (alias.mode === 'single') {
      exactKeys(alias, ['legacyKey', 'mode', 'target'], aliasPath)
      cursorTarget(alias.target, `${aliasPath}.target`)
    } else if (alias.mode === 'broadcast-v4') {
      exactKeys(alias, ['legacyKey', 'mode', 'targets'], aliasPath)
      const targets = array(alias.targets, `${aliasPath}.targets`)
      if (targets.length === 0) throw new Error(`${aliasPath}.targets: 不得为空`)
      targets.forEach((target, targetIndex) =>
        cursorTarget(target, `${aliasPath}.targets[${targetIndex}]`),
      )
    } else throw new Error(`${aliasPath}.mode: 期望 single|broadcast-v4`)
    const legacyKey = nonEmptyString(alias.legacyKey, `${aliasPath}.legacyKey`)
    if (cursorKeys.has(legacyKey)) throw new Error(`${aliasPath}.legacyKey: 重复 ${legacyKey}`)
    cursorKeys.add(legacyKey)
  })

  const bindingKeys = new Set<string>()
  array(sidecar.legacyBindings, `${path}.legacyBindings`).forEach((raw, index) => {
    const aliasPath = `${path}.legacyBindings[${index}]`
    const alias = descriptorRecord(raw, aliasPath)
    exactKeys(alias, ['from', 'target'], aliasPath)
    const from = descriptorRecord(alias.from, `${aliasPath}.from`)
    exactKeys(from, ['kind', 'sceneId', 'hook', 'digest'], `${aliasPath}.from`)
    if (from.kind !== 'scene-hook-binding')
      throw new Error(`${aliasPath}.from.kind: 期望 scene-hook-binding`)
    nonEmptyString(from.sceneId, `${aliasPath}.from.sceneId`)
    if (from.hook !== 'onEnter' && from.hook !== 'onTeleport')
      throw new Error(`${aliasPath}.from.hook: 期望 onEnter|onTeleport`)
    sha256(from.digest, `${aliasPath}.from.digest`)
    const target = owner(alias.target, `${aliasPath}.target`)
    if (target.kind !== 'scene-hook') throw new Error(`${aliasPath}.target: 必须是 scene-hook`)
    const key = `${from.sceneId}\u0000${from.hook}\u0000${from.digest}`
    if (bindingKeys.has(key)) throw new Error(`${aliasPath}.from: 重复 binding alias`)
    bindingKeys.add(key)
  })

  const lineagePlans = descriptorRecord(sidecar.lineagePlans, `${path}.lineagePlans`)
  exactKeys(lineagePlans, ['pages', 'stages'], `${path}.lineagePlans`)
  array(lineagePlans.pages, `${path}.lineagePlans.pages`).forEach((raw, index) => {
    const planPath = `${path}.lineagePlans.pages[${index}]`
    const plan = descriptorRecord(raw, planPath)
    exactKeys(plan, ['owner', 'entries'], planPath)
    entityAddress(plan.owner, `${planPath}.owner`)
    array(plan.entries, `${planPath}.entries`).forEach((entryRaw, entryIndex) => {
      const entryPath = `${planPath}.entries[${entryIndex}]`
      const entry = descriptorRecord(entryRaw, entryPath)
      exactKeys(entry, ['oursPageIndex', 'lineage'], entryPath)
      if (!Number.isInteger(entry.oursPageIndex) || Number(entry.oursPageIndex) < 0)
        throw new Error(`${entryPath}.oursPageIndex: 期望非负整数`)
      const lineage = descriptorRecord(entry.lineage, `${entryPath}.lineage`)
      if (lineage.kind === 'baseline') {
        exactKeys(lineage, ['kind', 'baselinePageIndex'], `${entryPath}.lineage`)
        if (!Number.isInteger(lineage.baselinePageIndex) || Number(lineage.baselinePageIndex) < 0)
          throw new Error(`${entryPath}.lineage.baselinePageIndex: 期望非负整数`)
      } else if (lineage.kind === 'new') {
        exactKeys(lineage, ['kind', 'pageId'], `${entryPath}.lineage`)
        nonEmptyString(lineage.pageId, `${entryPath}.lineage.pageId`)
      } else throw new Error(`${entryPath}.lineage.kind: 期望 baseline|new`)
    })
  })
  array(lineagePlans.stages, `${path}.lineagePlans.stages`).forEach((raw, index) => {
    const planPath = `${path}.lineagePlans.stages[${index}]`
    const plan = descriptorRecord(raw, planPath)
    exactKeys(plan, ['flow', 'entries'], planPath)
    const flow = descriptorRecord(plan.flow, `${planPath}.flow`)
    if (flow.kind === 'canonical') {
      exactKeys(flow, ['kind', 'flow'], `${planPath}.flow`)
      owner(flow.flow, `${planPath}.flow.flow`)
    } else if (flow.kind === 'legacy') {
      exactKeys(flow, ['kind', 'flow'], `${planPath}.flow`)
      const legacy = descriptorRecord(flow.flow, `${planPath}.flow.flow`)
      if (legacy.kind === 'legacy-entity-flow') {
        exactKeys(
          legacy,
          ['kind', 'sceneId', 'entityId', 'pageIndex', 'channel'],
          `${planPath}.flow.flow`,
        )
        nonEmptyString(legacy.sceneId, `${planPath}.flow.flow.sceneId`)
        nonEmptyString(legacy.entityId, `${planPath}.flow.flow.entityId`)
        if (!Number.isInteger(legacy.pageIndex) || Number(legacy.pageIndex) < 0)
          throw new Error(`${planPath}.flow.flow.pageIndex: 期望非负整数`)
        if (legacy.channel !== 'trigger' && legacy.channel !== 'auto')
          throw new Error(`${planPath}.flow.flow.channel: 期望 trigger|auto`)
      } else if (legacy.kind === 'legacy-scene-hook') {
        exactKeys(legacy, ['kind', 'sceneId', 'hook'], `${planPath}.flow.flow`)
        nonEmptyString(legacy.sceneId, `${planPath}.flow.flow.sceneId`)
        if (legacy.hook !== 'onEnter' && legacy.hook !== 'onTeleport')
          throw new Error(`${planPath}.flow.flow.hook: 期望 onEnter|onTeleport`)
      } else throw new Error(`${planPath}.flow.flow.kind: 未知 legacy flow`)
    } else throw new Error(`${planPath}.flow.kind: 期望 legacy|canonical`)
    array(plan.entries, `${planPath}.entries`).forEach((entryRaw, entryIndex) => {
      const entryPath = `${planPath}.entries[${entryIndex}]`
      const entry = descriptorRecord(entryRaw, entryPath)
      exactKeys(entry, ['oursStageIndex', 'lineage'], entryPath)
      if (!Number.isInteger(entry.oursStageIndex) || Number(entry.oursStageIndex) < 0)
        throw new Error(`${entryPath}.oursStageIndex: 期望非负整数`)
      const lineage = descriptorRecord(entry.lineage, `${entryPath}.lineage`)
      if (lineage.kind === 'baseline') {
        exactKeys(lineage, ['kind', 'baselineStageIndex'], `${entryPath}.lineage`)
        if (!Number.isInteger(lineage.baselineStageIndex) || Number(lineage.baselineStageIndex) < 0)
          throw new Error(`${entryPath}.lineage.baselineStageIndex: 期望非负整数`)
      } else if (lineage.kind === 'new') {
        exactKeys(lineage, ['kind', 'stageId'], `${entryPath}.lineage`)
        nonEmptyString(lineage.stageId, `${entryPath}.lineage.stageId`)
      } else throw new Error(`${entryPath}.lineage.kind: 期望 baseline|new`)
    })
  })

  array(sidecar.localAllocations, `${path}.localAllocations`).forEach((raw, index) => {
    const allocationPath = `${path}.localAllocations[${index}]`
    const allocation = descriptorRecord(raw, allocationPath)
    if (allocation.kind === 'author-cell') {
      exactKeys(allocation, ['kind', 'source', 'target'], allocationPath)
      const source = descriptorRecord(allocation.source, `${allocationPath}.source`)
      exactKeys(source, ['path', 'sourceSha256'], `${allocationPath}.source`)
      nonEmptyString(source.path, `${allocationPath}.source.path`)
      sha256(source.sourceSha256, `${allocationPath}.source.sourceSha256`)
      authorIdentity(allocation.target, `${allocationPath}.target`)
    } else if (allocation.kind === 'page') {
      exactKeys(allocation, ['kind', 'owner', 'oursPageIndex', 'pageId'], allocationPath)
      entityAddress(allocation.owner, `${allocationPath}.owner`)
      if (!Number.isInteger(allocation.oursPageIndex) || Number(allocation.oursPageIndex) < 0)
        throw new Error(`${allocationPath}.oursPageIndex: 期望非负整数`)
      nonEmptyString(allocation.pageId, `${allocationPath}.pageId`)
    } else if (allocation.kind === 'stage') {
      exactKeys(allocation, ['kind', 'flow', 'oursStageIndex', 'stageId'], allocationPath)
      // flow 的精确验证复用一个最小 lineage plan 外壳。
      validateProjectMigrationSidecarFlowForStageAllocation(
        allocation.flow,
        `${allocationPath}.flow`,
      )
      if (!Number.isInteger(allocation.oursStageIndex) || Number(allocation.oursStageIndex) < 0)
        throw new Error(`${allocationPath}.oursStageIndex: 期望非负整数`)
      nonEmptyString(allocation.stageId, `${allocationPath}.stageId`)
    } else throw new Error(`${allocationPath}.kind: 未知 local allocation`)
  })

  const closureKeys = new Set<string>()
  array(sidecar.targetClosures, `${path}.targetClosures`).forEach((raw, index) => {
    const closurePath = `${path}.targetClosures[${index}]`
    const closure = descriptorRecord(raw, closurePath)
    exactKeys(closure, ['target', 'identityDigest'], closurePath)
    const identity = authorIdentity(closure.target, `${closurePath}.target`)
    sha256(closure.identityDigest, `${closurePath}.identityDigest`)
    const key = JSON.stringify(identity)
    if (closureKeys.has(key)) throw new Error(`${closurePath}.target: 重复 closure`)
    closureKeys.add(key)
  })
  return sidecar as unknown as ProjectMigrationSidecarV1
}

function validateProjectMigrationSidecarFlowForStageAllocation(value: unknown, path: string): void {
  const flow = descriptorRecord(value, path)
  if (flow.kind === 'canonical') {
    exactKeys(flow, ['kind', 'flow'], path)
    owner(flow.flow, `${path}.flow`)
    return
  }
  if (flow.kind !== 'legacy') throw new Error(`${path}.kind: 期望 legacy|canonical`)
  exactKeys(flow, ['kind', 'flow'], path)
  const legacy = descriptorRecord(flow.flow, `${path}.flow`)
  if (legacy.kind === 'legacy-entity-flow') {
    exactKeys(legacy, ['kind', 'sceneId', 'entityId', 'pageIndex', 'channel'], `${path}.flow`)
    nonEmptyString(legacy.sceneId, `${path}.flow.sceneId`)
    nonEmptyString(legacy.entityId, `${path}.flow.entityId`)
    if (!Number.isInteger(legacy.pageIndex) || Number(legacy.pageIndex) < 0)
      throw new Error(`${path}.flow.pageIndex: 期望非负整数`)
    if (legacy.channel !== 'trigger' && legacy.channel !== 'auto')
      throw new Error(`${path}.flow.channel: 期望 trigger|auto`)
    return
  }
  if (legacy.kind === 'legacy-scene-hook') {
    exactKeys(legacy, ['kind', 'sceneId', 'hook'], `${path}.flow`)
    nonEmptyString(legacy.sceneId, `${path}.flow.sceneId`)
    if (legacy.hook !== 'onEnter' && legacy.hook !== 'onTeleport')
      throw new Error(`${path}.flow.hook: 期望 onEnter|onTeleport`)
    return
  }
  throw new Error(`${path}.flow.kind: 未知 legacy flow`)
}
