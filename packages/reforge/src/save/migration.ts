import {
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  canonicalLegacyBindingV4,
  canonicalScriptTransitionJson,
  checkWorldScriptStateV5,
  emptyWorldScriptStateV5,
  type ProjectManifest,
  type ProjectMigrationDescriptorV1,
  type ProjectMigrationSidecarV1,
  SCRIPT_V4_V5_TRANSITION_ID,
  validateProjectMigrationDescriptorV1,
  validateProjectMigrationSidecarV1,
  type WorldScriptStateV5,
} from '@type-pal/content'
import type { FileSource } from '../file-source.js'
import { type NormalizePayloadOptions, normalizePayloadV4Envelope } from './ops.js'
import {
  type LegacySavePayloadV7,
  type LegacySavePayloadV8Content9,
  type LegacySavePayloadV8Content10,
  SAVE_VERSION,
  type SavePayload,
  type SavePayloadV5,
  type SavePayloadV6,
  type SavePayloadV7,
  type SavePayloadV8,
} from './types.js'

export type {
  LegacySavePayloadV7,
  LegacySavePayloadV8Content9,
  LegacySavePayloadV8Content10,
  SavePayloadV5,
  SavePayloadV6,
  SavePayloadV7,
  SavePayloadV8,
} from './types.js'

/** N3-1 的目标 envelope 版本；P7 原子切换时与 SAVE_VERSION 一同成为 5。 */
export const SCRIPT_V5_SAVE_VERSION = 5 as const

export interface SavePayloadHeader {
  version: number
  projectId: string
  contentVersion: number
}

export type LegacySaveMigrationResolverV5 =
  | {
      kind: 'current-v5'
      projectId: string
      targetContentVersion: 5
      targetSaveVersion: 5
    }
  | {
      kind: 'v4-v5'
      projectId: string
      targetContentVersion: 5
      targetSaveVersion: 5
      sidecar: Readonly<ProjectMigrationSidecarV1>
      sceneHookSelections: Readonly<
        Record<
          string,
          Partial<
            Record<'onEnter' | 'onTeleport', { kind: 'disabled' } | { kind: 'use'; value: string }>
          >
        >
      >
    }

export interface SaveMigrationResolverV6 {
  kind: 'current-v6'
  projectId: string
  targetContentVersion: 6
  targetSaveVersion: 6
}

export interface SaveMigrationResolverV7 {
  kind: 'current-v7'
  projectId: string
  targetContentVersion: 7
  targetSaveVersion: 7
}

export type SaveMigrationResolver =
  | {
      kind: 'current-v11'
      projectId: string
      targetContentVersion: 11
      targetSaveVersion: 8
    }
  | {
      kind: 'content-v10-v11'
      projectId: string
      targetContentVersion: 11
      targetSaveVersion: 8
    }

/** R13-4 已发布 8/9 epoch 的历史 byte-pin resolver；当前 runtime 不调用。 */
export interface SaveMigrationResolverV9Historical {
  kind: 'current-v9'
  projectId: string
  targetContentVersion: 9
  targetSaveVersion: 8
}

/** R13-3 historical 7/7 -> 7/8 内容轴 identity resolver；当前 runtime 不调用。 */
export type SaveMigrationResolverV8Historical =
  | {
      kind: 'current-v8'
      projectId: string
      targetContentVersion: 8
      targetSaveVersion: 7
    }
  | {
      kind: 'content-v7-v8'
      projectId: string
      targetContentVersion: 8
      targetSaveVersion: 7
    }

function assertIntegerVersion(value: unknown, path: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) throw new Error(`${path}: 期望正整数版本`)
  return Number(value)
}

export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('当前环境缺 Web Crypto SHA-256')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function legacyBindingDigest(value: unknown): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(JSON.stringify(canonicalLegacyBindingV4(value))))
}

export interface ValidatedProjectMigrationBlobV1 {
  id: typeof SCRIPT_V4_V5_TRANSITION_ID
  descriptor: Readonly<ProjectMigrationDescriptorV1>
  bytes: Uint8Array
  sidecar: Readonly<ProjectMigrationSidecarV1>
}

export type ValidatedProjectMigrationRegistryV1 = Readonly<
  Partial<Record<typeof SCRIPT_V4_V5_TRANSITION_ID, ValidatedProjectMigrationBlobV1>>
>

async function loadScriptV4V5MigrationBlob(args: {
  manifest: ProjectManifest<5 | 6 | 7 | 8 | 9 | 10 | 11>
  source: Pick<FileSource, 'readBytes'>
  descriptorValue: unknown
  signal?: AbortSignal
}): Promise<ValidatedProjectMigrationBlobV1> {
  const descriptor = validateProjectMigrationDescriptorV1(args.descriptorValue)
  const bytes = new Uint8Array(await args.source.readBytes(descriptor.path, args.signal))
  const actualSha256 = await sha256Bytes(bytes)
  if (actualSha256 !== descriptor.sha256)
    throw new Error(
      `${descriptor.path}: manifest 登记 SHA-256 ${descriptor.sha256}，实际 ${actualSha256}`,
    )
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } catch (cause) {
    throw new Error(
      `${descriptor.path}: JSON 解析失败；${cause instanceof Error ? cause.message : String(cause)}`,
    )
  }
  const sidecar = validateProjectMigrationSidecarV1(parsed, args.manifest.id)
  const { digest: declaredSidecarDigest, ...sidecarWithoutDigest } = sidecar
  const actualSidecarDigest = await sha256Bytes(
    new TextEncoder().encode(canonicalScriptTransitionJson(sidecarWithoutDigest)),
  )
  if (actualSidecarDigest !== declaredSidecarDigest)
    throw new Error(
      `${descriptor.path}: sidecar 自摘要 ${declaredSidecarDigest}，实际 ${actualSidecarDigest}`,
    )
  return {
    id: SCRIPT_V4_V5_TRANSITION_ID,
    descriptor: Object.freeze(structuredClone(descriptor)),
    bytes: Uint8Array.from(bytes),
    sidecar: Object.freeze(structuredClone(sidecar)),
  }
}

/**
 * v5 工程加载边界：registry 中实际登记的历史迁移 blob 必须逐项验签并以原始字节持有。
 * 当前只定义 script-v4-v5；未知 transition 不允许被静默透传成“已验证”。
 */
export async function loadProjectMigrationRegistryV5(args: {
  manifest: ProjectManifest<5 | 6 | 7 | 8 | 9 | 10 | 11>
  source: Pick<FileSource, 'readBytes'>
  signal?: AbortSignal
}): Promise<ValidatedProjectMigrationRegistryV1> {
  const registry: Partial<
    Record<typeof SCRIPT_V4_V5_TRANSITION_ID, ValidatedProjectMigrationBlobV1>
  > = {}
  for (const [id, descriptorValue] of Object.entries(args.manifest.migrations ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (id !== SCRIPT_V4_V5_TRANSITION_ID)
      throw new Error(`manifest.migrations.${id}: 引擎不支持该 content transition`)
    registry[id] = await loadScriptV4V5MigrationBlob({
      ...args,
      descriptorValue,
    })
  }
  return Object.freeze(registry)
}

async function resolveSceneHookSelections(
  payload: SavePayloadHeader & { world?: unknown },
  sidecar: ProjectMigrationSidecarV1,
): Promise<
  Record<
    string,
    Partial<Record<'onEnter' | 'onTeleport', { kind: 'disabled' } | { kind: 'use'; value: string }>>
  >
> {
  const world =
    payload.world && typeof payload.world === 'object'
      ? (payload.world as Record<string, unknown>)
      : undefined
  const script =
    world?.script && typeof world.script === 'object'
      ? (world.script as Record<string, unknown>)
      : undefined
  const overrides = script?.sceneScriptOverrides
  if (overrides === undefined) return {}
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw new Error('payload.world.script.sceneScriptOverrides: 期望对象')
  const aliases = new Map(
    sidecar.legacyBindings.map((alias) => [
      `${alias.from.sceneId}\u0000${alias.from.hook}\u0000${alias.from.digest}`,
      alias.target,
    ]),
  )
  const result: Record<
    string,
    Partial<Record<'onEnter' | 'onTeleport', { kind: 'disabled' } | { kind: 'use'; value: string }>>
  > = {}
  for (const [sceneId, rawSlots] of Object.entries(overrides)) {
    if (!rawSlots || typeof rawSlots !== 'object' || Array.isArray(rawSlots))
      throw new Error(`payload.world.script.sceneScriptOverrides.${sceneId}: 期望对象`)
    const slots = rawSlots as Record<string, unknown>
    for (const key of Object.keys(slots))
      if (key !== 'onEnter' && key !== 'onTeleport')
        throw new Error(`payload.world.script.sceneScriptOverrides.${sceneId}.${key}: 未知槽`)
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      if (!Object.hasOwn(slots, slot)) continue
      const binding = slots[slot]
      let sceneSelections = result[sceneId]
      if (!sceneSelections) {
        sceneSelections = {}
        result[sceneId] = sceneSelections
      }
      if (binding === null) {
        sceneSelections[slot] = { kind: 'disabled' }
        continue
      }
      const digest = await legacyBindingDigest(binding)
      const target = aliases.get(`${sceneId}\u0000${slot}\u0000${digest}`)
      if (!target)
        throw new Error(
          `payload.world.script.sceneScriptOverrides.${sceneId}.${slot}: 未命中兼容 binding alias (${digest})`,
        )
      sceneSelections[slot] = { kind: 'use', value: target.hookId }
    }
  }
  return result
}

/**
 * 当前工程是 content10/minimum8；接受 SAVE8/content10，或把已发布的 SAVE8/content9
 * 纯内存 identity normalization 到 content10。其它组合在任何兼容 IO 前拒绝。
 */
export async function preflightSaveMigration(args: {
  manifest: ProjectManifest<10 | 11>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolver> {
  const minimum = args.manifest.minimumSaveVersion
  if (minimum !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion ${CONTENT_VERSION} 期望 ` +
        `${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}，收到 ${String(minimum)}`,
    )
  const saveVersion = assertIntegerVersion(args.payload.version, 'payload.version')
  const contentVersion = assertIntegerVersion(args.payload.contentVersion, 'payload.contentVersion')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.manifest.contentVersion !== CONTENT_VERSION)
    throw new Error(
      `工程 "${args.manifest.id}": 当前存档预检只接受 contentVersion ${CONTENT_VERSION}`,
    )
  if (saveVersion !== SAVE_VERSION || (contentVersion !== CONTENT_VERSION && contentVersion !== 10))
    throw new Error(
      `不支持的存档 epoch：收到 SAVE v${saveVersion} / contentVersion ${contentVersion}，` +
        `当前只接受 SAVE v${SAVE_VERSION} / contentVersion 10|${CONTENT_VERSION}；` +
        '不会读取或重放历史兼容 sidecar',
    )
  return {
    kind: contentVersion === 10 ? 'content-v10-v11' : 'current-v11',
    projectId: args.manifest.id,
    targetContentVersion: CONTENT_VERSION,
    targetSaveVersion: SAVE_VERSION,
  }
}

/** R13-4 historical 8/9 预检；保持字面量固定，current runtime 不调用。 */
export async function preflightLegacySaveMigrationV9(args: {
  manifest: ProjectManifest<9>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV9Historical> {
  if (args.manifest.minimumSaveVersion !== 8)
    throw new Error(
      `manifest.minimumSaveVersion: historical contentVersion 9 期望 8，收到 ${String(
        args.manifest.minimumSaveVersion,
      )}`,
    )
  const saveVersion = assertIntegerVersion(args.payload.version, 'payload.version')
  const contentVersion = assertIntegerVersion(args.payload.contentVersion, 'payload.contentVersion')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.manifest.contentVersion !== 9)
    throw new Error(`工程 "${args.manifest.id}": historical v9 预检只接受 contentVersion 9`)
  if (saveVersion !== 8 || contentVersion !== 9)
    throw new Error('historical contentVersion 9 只接受 SAVE8/content9')
  return {
    kind: 'current-v9',
    projectId: args.manifest.id,
    targetContentVersion: 9,
    targetSaveVersion: 8,
  }
}

/** R13-3 historical 7/7 或 7/8 预检；当前 runtime 不调用。 */
export async function preflightLegacySaveMigrationV8(args: {
  manifest: ProjectManifest<8>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV8Historical> {
  if (args.manifest.minimumSaveVersion !== 7)
    throw new Error(
      `manifest.minimumSaveVersion: historical contentVersion 8 期望 7，收到 ${String(
        args.manifest.minimumSaveVersion,
      )}`,
    )
  const saveVersion = assertIntegerVersion(args.payload.version, 'payload.version')
  const contentVersion = assertIntegerVersion(args.payload.contentVersion, 'payload.contentVersion')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (saveVersion !== 7 || (contentVersion !== 7 && contentVersion !== 8))
    throw new Error('historical contentVersion 8 只接受 SAVE7/content7 或 SAVE7/content8')
  return {
    kind: contentVersion === 8 ? 'current-v8' : 'content-v7-v8',
    projectId: args.manifest.id,
    targetContentVersion: 8,
    targetSaveVersion: 7,
  }
}

/** R13-2 已发布 7/7 epoch 的历史 byte-pin 入口；当前 runtime 不调用。 */
export async function preflightLegacySaveMigrationV7(args: {
  manifest: ProjectManifest<7>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV7> {
  if (args.manifest.minimumSaveVersion !== 7)
    throw new Error(
      `manifest.minimumSaveVersion: historical contentVersion 7 期望 7，收到 ${String(
        args.manifest.minimumSaveVersion,
      )}`,
    )
  const saveVersion = assertIntegerVersion(args.payload.version, 'payload.version')
  const contentVersion = assertIntegerVersion(args.payload.contentVersion, 'payload.contentVersion')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.manifest.contentVersion !== 7)
    throw new Error(`工程 "${args.manifest.id}": historical v7 预检只接受 contentVersion 7`)
  if (saveVersion !== 7 || contentVersion !== 7)
    throw new Error(
      `开发期存档 epoch 已断开：收到 SAVE v${saveVersion} / contentVersion ${contentVersion}，` +
        'historical v7 只接受 SAVE v7 / contentVersion 7；请新开游戏',
    )
  return {
    kind: 'current-v7',
    projectId: args.manifest.id,
    targetContentVersion: 7,
    targetSaveVersion: 7,
  }
}

/**
 * R13-1 已发布 6/6 epoch 的历史 byte-pin 入口。当前 runtime 不得调用；保留它只用于证明
 * 原 6/6 预检和 normalizer 没有随 R13-2 的 SAVE_VERSION=7 漂移。
 */
export async function preflightLegacySaveMigrationV6(args: {
  manifest: ProjectManifest<6>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV6> {
  if (args.manifest.minimumSaveVersion !== 6)
    throw new Error(
      `manifest.minimumSaveVersion: historical contentVersion 6 期望 6，收到 ${String(
        args.manifest.minimumSaveVersion,
      )}`,
    )
  const saveVersion = assertIntegerVersion(args.payload.version, 'payload.version')
  const contentVersion = assertIntegerVersion(args.payload.contentVersion, 'payload.contentVersion')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.manifest.contentVersion !== 6)
    throw new Error(`工程 "${args.manifest.id}": historical v6 预检只接受 contentVersion 6`)
  if (saveVersion !== 6 || contentVersion !== 6)
    throw new Error(
      `historical 6/6 epoch 只接受 SAVE v6 / contentVersion 6，收到 SAVE v${saveVersion} / ` +
        `contentVersion ${contentVersion}`,
    )
  return {
    kind: 'current-v6',
    projectId: args.manifest.id,
    targetContentVersion: 6,
    targetSaveVersion: 6,
  }
}

/**
 * 历史 v4→v5 迁移证明专用入口。当前 runtime 不得调用；保留它只为 byte-pin 与旧迁移测试。
 */
export async function preflightLegacySaveMigrationV5(args: {
  manifest: ProjectManifest<5>
  source: Pick<FileSource, 'readBytes'>
  payload: SavePayloadHeader & { world?: unknown }
  signal?: AbortSignal
}): Promise<LegacySaveMigrationResolverV5> {
  const minimum = args.manifest.minimumSaveVersion ?? 1
  if (!Number.isInteger(minimum) || minimum < 1 || minimum > SCRIPT_V5_SAVE_VERSION)
    throw new Error(`manifest.minimumSaveVersion: 期望 1..${SCRIPT_V5_SAVE_VERSION} 的整数`)
  const saveVersion = assertIntegerVersion(args.payload.version, 'payload.version')
  if (saveVersion < minimum)
    throw new Error(
      `存档格式 v${saveVersion} 低于工程 minimumSaveVersion v${minimum}，拒绝读取兼容 sidecar`,
    )
  if (saveVersion > SCRIPT_V5_SAVE_VERSION)
    throw new Error(`存档格式 v${saveVersion} 新于历史 v5 迁移器支持的 v5`)
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  const contentVersion = assertIntegerVersion(args.payload.contentVersion, 'payload.contentVersion')
  if (saveVersion === 5 && contentVersion === 5)
    return {
      kind: 'current-v5',
      projectId: args.manifest.id,
      targetContentVersion: 5,
      targetSaveVersion: 5,
    }
  if (saveVersion === 5 && contentVersion === 4)
    throw new Error('非法存档中间态：SAVE v5 不能携带 contentVersion 4')
  if (saveVersion <= 4 && contentVersion === 5)
    throw new Error('非法存档中间态：旧 SAVE envelope 不能携带 contentVersion 5')
  if (saveVersion > 4 || contentVersion !== 4)
    throw new Error(
      `存档版本组合不受支持：SAVE v${saveVersion} / contentVersion ${contentVersion} / project 5`,
    )
  const rawDescriptor = args.manifest.migrations?.[SCRIPT_V4_V5_TRANSITION_ID]
  if (rawDescriptor === undefined)
    throw new Error(
      `manifest.migrations 缺 ${SCRIPT_V4_V5_TRANSITION_ID}，无法升级 contentVersion 4 存档`,
    )
  const { sidecar } = await loadScriptV4V5MigrationBlob({
    manifest: args.manifest,
    source: args.source,
    descriptorValue: rawDescriptor,
    signal: args.signal,
  })
  const sceneHookSelections = await resolveSceneHookSelections(args.payload, sidecar)
  return {
    kind: 'v4-v5',
    projectId: args.manifest.id,
    targetContentVersion: 5,
    targetSaveVersion: 5,
    sidecar: Object.freeze(sidecar),
    sceneHookSelections: Object.freeze(sceneHookSelections),
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function validateHostileAwareness(world: unknown, path: string): void {
  const value = record(world, path).hostileAwareness
  if (value === undefined) return
  const awareness = record(value, `${path}.hostileAwareness`)
  for (const key of Object.keys(awareness))
    if (key !== 'rangeMultiplier' && key !== 'remainingMs')
      throw new Error(`${path}.hostileAwareness.${key}: 未知字段`)
  if (awareness.rangeMultiplier !== 0 && awareness.rangeMultiplier !== 3)
    throw new Error(`${path}.hostileAwareness.rangeMultiplier: 期望 0 或 3`)
  if (!Number.isFinite(awareness.remainingMs) || Number(awareness.remainingMs) <= 0)
    throw new Error(`${path}.hostileAwareness.remainingMs: 期望正有限毫秒`)
}

function aliasTargets(
  alias: ProjectMigrationSidecarV1['legacyEntities'][number],
): Array<{ scene: string; entity: string }> {
  return alias.mode === 'single' ? [alias.target] : alias.targets
}

function writeNestedValue(
  target: Record<string, Record<string, unknown>>,
  address: { scene: string; entity: string },
  value: unknown,
  path: string,
): void {
  let scene = target[address.scene]
  if (!scene) {
    scene = {}
    target[address.scene] = scene
  }
  const current = scene[address.entity]
  if (current !== undefined && JSON.stringify(current) !== JSON.stringify(value))
    throw new Error(`${path}: 目标 ${address.scene}/${address.entity} 发生冲突`)
  scene[address.entity] = structuredClone(value)
}

function migrateEntityMap(
  value: unknown,
  aliases: Map<string, ProjectMigrationSidecarV1['legacyEntities'][number]>,
  path: string,
): Record<string, Record<string, unknown>> | undefined {
  if (value === undefined) return undefined
  const source = record(value, path)
  const output: Record<string, Record<string, unknown>> = {}
  for (const [legacyId, entry] of Object.entries(source)) {
    const alias = aliases.get(legacyId)
    if (!alias) throw new Error(`${path}.${legacyId}: 缺 LegacyEntityAlias`)
    for (const target of aliasTargets(alias)) writeNestedValue(output, target, entry, path)
  }
  return output
}

function writeCursor(
  behaviors: WorldScriptStateV5['behaviors'],
  target: ProjectMigrationSidecarV1['legacyCursors'][number] extends infer _Alias
    ? import('@type-pal/content').LegacyCursorTargetV1
    : never,
  rawIndex: number,
  path: string,
): void {
  const index = Math.max(0, Math.min(rawIndex, target.legacyStageCount - 1))
  const mapped = target.indices.find((entry) => entry.index === index)
  if (!mapped) throw new Error(`${path}: index ${index} 缺 FlowCursor alias`)
  if (target.target.kind === 'entity-behavior') {
    if (!behaviors.entities) behaviors.entities = {}
    let scene = behaviors.entities[target.target.sceneId]
    if (!scene) {
      scene = {}
      behaviors.entities[target.target.sceneId] = scene
    }
    let entity = scene[target.target.entityId]
    if (!entity) {
      entity = {}
      scene[target.target.entityId] = entity
    }
    let slot = entity[target.target.channel]
    if (!slot) {
      slot = {}
      entity[target.target.channel] = slot
    }
    const next = { behavior: target.target.behaviorId, at: structuredClone(mapped.cursor) }
    if (slot.cursor !== undefined && JSON.stringify(slot.cursor) !== JSON.stringify(next))
      throw new Error(`${path}: entity behavior cursor 冲突`)
    slot.cursor = next
    return
  }
  if (!behaviors.scenes) behaviors.scenes = {}
  let scene = behaviors.scenes[target.target.sceneId]
  if (!scene) {
    scene = {}
    behaviors.scenes[target.target.sceneId] = scene
  }
  let slot = scene[target.target.hook]
  if (!slot) {
    slot = {}
    scene[target.target.hook] = slot
  }
  const next = { hook: target.target.hookId, at: structuredClone(mapped.cursor) }
  if (slot.cursor !== undefined && JSON.stringify(slot.cursor) !== JSON.stringify(next))
    throw new Error(`${path}: scene hook cursor 冲突`)
  slot.cursor = next
}

function resolvedCursorTargets(
  alias: ProjectMigrationSidecarV1['legacyCursors'][number],
  resolver: Extract<LegacySaveMigrationResolverV5, { kind: 'v4-v5' }>,
  path: string,
): import('@type-pal/content').LegacyCursorTargetV1[] {
  const targets = alias.mode === 'single' ? [alias.target] : alias.targets
  const hookTargets = targets.filter((target) => target.target.kind === 'scene-hook')
  if (hookTargets.length === 0) return targets
  if (hookTargets.length !== targets.length)
    throw new Error(`${path}: 同一 legacy cursor 不得混合 entity behavior 与 scene hook`)
  const firstTarget = hookTargets[0]
  if (!firstTarget) throw new Error(`${path}: scene hook cursor targets 为空`)
  const first = firstTarget.target
  if (first.kind !== 'scene-hook') throw new Error(`${path}: scene hook cursor 类型错误`)
  if (
    hookTargets.some(
      (target) =>
        target.target.kind !== 'scene-hook' ||
        target.target.sceneId !== first.sceneId ||
        target.target.hook !== first.hook,
    )
  )
    throw new Error(`${path}: scene hook cursor targets 必须属于同一 scene/slot`)
  const selection = resolver.sceneHookSelections[first.sceneId]?.[first.hook]
  if (selection?.kind === 'disabled') return []
  const hookId = selection?.kind === 'use' ? selection.value : 'default'
  const selected = hookTargets.filter(
    (target) => target.target.kind === 'scene-hook' && target.target.hookId === hookId,
  )
  if (selected.length === 1) return selected
  if (selection === undefined && hookTargets.length === 1) return hookTargets
  throw new Error(`${path}: ${first.sceneId}.${first.hook} cursor 未唯一命中 hook ${hookId}`)
}

/**
 * 纯同步 v4 -> v5 payload normalizer。resolver 已完成所有异步 sidecar IO/digest 解析；
 * 返回隔离副本，失败或成功都不修改调用方输入。
 */
export function normalizePayloadV5(
  input: SavePayload | SavePayloadV5,
  resolver: LegacySaveMigrationResolverV5,
  options: NormalizePayloadOptions = {},
): SavePayloadV5 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  if (resolver.kind === 'current-v5') {
    if (input.version !== 5 || input.contentVersion !== 5)
      throw new Error('current-v5 resolver 只接受 version=5/contentVersion=5')
    const payload = structuredClone(input) as SavePayloadV5
    payload.world.script ??= emptyWorldScriptStateV5()
    checkWorldScriptStateV5(payload.world.script, 'payload.world.script')
    validateHostileAwareness(payload.world, 'payload.world')
    return payload
  }
  if (input.version >= 5 || input.contentVersion !== 4)
    throw new Error('v4-v5 resolver 只接受 SAVE 1..4/contentVersion 4')

  const payload = structuredClone(input) as SavePayload
  normalizePayloadV4Envelope(payload, options)
  if (payload.version !== 4) throw new Error(`v4 envelope 归一化结果错误：收到 ${payload.version}`)
  const legacyScript = record(payload.world.script ?? {}, 'payload.world.script')
  const entityAliases = new Map(
    resolver.sidecar.legacyEntities.map((alias) => [alias.legacyId, alias]),
  )
  const entityState = migrateEntityMap(
    legacyScript.entityState ?? {},
    entityAliases,
    'payload.world.script.entityState',
  ) as Record<string, Record<string, number>>
  const entityPos = migrateEntityMap(
    legacyScript.entityPos,
    entityAliases,
    'payload.world.script.entityPos',
  ) as Record<string, Record<string, import('@type-pal/content').GridPos>> | undefined
  const entityLayer = migrateEntityMap(
    legacyScript.entityLayer,
    entityAliases,
    'payload.world.script.entityLayer',
  ) as Record<string, Record<string, number>> | undefined
  const behaviors: WorldScriptStateV5['behaviors'] = {}
  const cursorAliases = new Map(
    resolver.sidecar.legacyCursors.map((alias) => [alias.legacyKey, alias]),
  )
  const legacyStages = record(legacyScript.entityStage ?? {}, 'payload.world.script.entityStage')
  for (const [legacyKey, rawIndex] of Object.entries(legacyStages)) {
    if (!Number.isFinite(rawIndex) || !Number.isInteger(rawIndex))
      throw new Error(`payload.world.script.entityStage.${legacyKey}: 期望有限整数`)
    const alias = cursorAliases.get(legacyKey)
    if (!alias)
      throw new Error(`payload.world.script.entityStage.${legacyKey}: 缺 LegacyCursorAlias`)
    const path = `payload.world.script.entityStage.${legacyKey}`
    const targets = resolvedCursorTargets(alias, resolver, path)
    for (const target of targets) writeCursor(behaviors, target, Number(rawIndex), path)
  }
  for (const [sceneId, selections] of Object.entries(resolver.sceneHookSelections)) {
    if (!behaviors.scenes) behaviors.scenes = {}
    let scene = behaviors.scenes[sceneId]
    if (!scene) {
      scene = {}
      behaviors.scenes[sceneId] = scene
    }
    for (const slotName of ['onEnter', 'onTeleport'] as const) {
      const selection = selections[slotName]
      if (selection === undefined) continue
      let slot = scene[slotName]
      if (!slot) {
        slot = {}
        scene[slotName] = slot
      }
      slot.selection = structuredClone(selection)
    }
  }
  const script: WorldScriptStateV5 = {
    flags: structuredClone(
      record(legacyScript.flags ?? {}, 'payload.world.script.flags'),
    ) as Record<string, boolean>,
    vars: structuredClone(record(legacyScript.vars ?? {}, 'payload.world.script.vars')) as Record<
      string,
      number
    >,
    entityState,
    behaviors,
    ...(entityPos === undefined ? {} : { entityPos }),
    ...(entityLayer === undefined ? {} : { entityLayer }),
    ...(legacyScript.followers === undefined
      ? {}
      : { followers: structuredClone(legacyScript.followers) as string[] }),
    ...(legacyScript.mapOverride === undefined
      ? {}
      : {
          mapOverride: structuredClone(legacyScript.mapOverride) as Record<string, string>,
        }),
  }
  payload.world.script = script as unknown as typeof payload.world.script
  payload.version = 5
  payload.contentVersion = 5
  checkWorldScriptStateV5(payload.world.script, 'payload.world.script')
  validateHostileAwareness(payload.world, 'payload.world')
  return payload as unknown as SavePayloadV5
}

/** 历史 6/6 payload 只做结构验证与缺省容器补齐，不执行任何跨 epoch 迁移。 */
export function normalizePayloadV6(
  input: SavePayload | SavePayloadV5 | SavePayloadV6,
  resolver: SaveMigrationResolverV6,
): SavePayloadV6 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  if (resolver.kind !== 'current-v6' || input.version !== 6 || input.contentVersion !== 6)
    throw new Error('current-v6 resolver 只接受 version=6/contentVersion=6')
  const payload = structuredClone(input) as SavePayloadV6
  payload.world.script ??= emptyWorldScriptStateV5()
  checkWorldScriptStateV5(payload.world.script, 'payload.world.script')
  validateHostileAwareness(payload.world, 'payload.world')
  return payload
}

/** R13-2 historical 7/7 normalizer byte-pin；当前 runtime 不调用。 */
export function normalizeLegacyPayloadV7(
  input: SavePayload | SavePayloadV5 | SavePayloadV6 | LegacySavePayloadV7,
  resolver: SaveMigrationResolverV7,
): LegacySavePayloadV7 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  if (resolver.kind !== 'current-v7' || input.version !== 7 || input.contentVersion !== 7)
    throw new Error('current-v7 resolver 只接受 version=7/contentVersion=7')
  const payload = structuredClone(input) as LegacySavePayloadV7
  payload.world.script ??= emptyWorldScriptStateV5()
  checkWorldScriptStateV5(payload.world.script, 'payload.world.script')
  validateHostileAwareness(payload.world, 'payload.world')
  return payload
}

/**
 * SAVE7/content7 -> SAVE7/content8 是纯内容 epoch identity normalization：
 * 只改副本的 contentVersion，world/position/projectId 深相等且不读取 sidecar。
 */
export function normalizePayloadV7(
  input: SavePayload | SavePayloadV5 | SavePayloadV6 | LegacySavePayloadV7 | SavePayloadV7,
  resolver: SaveMigrationResolverV8Historical,
): SavePayloadV7 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  if (input.version !== 7) throw new Error('historical content8 resolver 只接受 version=7')
  if (
    (resolver.kind === 'current-v8' && input.contentVersion !== 8) ||
    (resolver.kind === 'content-v7-v8' && input.contentVersion !== 7)
  )
    throw new Error(`${resolver.kind} resolver 与 payload.contentVersion 不匹配`)
  const payload = structuredClone(input) as SavePayloadV7
  payload.contentVersion = 8
  if (payload.world.script !== undefined)
    checkWorldScriptStateV5(payload.world.script, 'payload.world.script')
  validateHostileAwareness(payload.world, 'payload.world')
  return payload
}

/** historical SAVE8/content9 只做隔离副本验证；current runtime 不调用。 */
export function normalizeLegacyPayloadV8Content9(
  input: LegacySavePayloadV8Content9,
  resolver: SaveMigrationResolverV9Historical,
): LegacySavePayloadV8Content9 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  if (resolver.kind !== 'current-v9' || input.version !== 8 || input.contentVersion !== 9)
    throw new Error('current-v9 resolver 只接受 version=8/contentVersion=9')
  const payload = structuredClone(input)
  if (payload.world.script !== undefined)
    checkWorldScriptStateV5(payload.world.script, 'payload.world.script')
  validateHostileAwareness(payload.world, 'payload.world')
  return payload
}

/** 当前 SAVE8/content11 或 historical content10 identity normalization；不读取 sidecar。 */
export function normalizePayloadV8(
  input: LegacySavePayloadV8Content9 | LegacySavePayloadV8Content10 | SavePayloadV8,
  resolver: SaveMigrationResolver,
): SavePayloadV8 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  if (
    input.version !== SAVE_VERSION ||
    (resolver.kind === 'current-v11' && input.contentVersion !== 11) ||
    (resolver.kind === 'content-v10-v11' && input.contentVersion !== 10)
  )
    throw new Error(
      `${resolver.kind} resolver 与 SAVE${SAVE_VERSION}/contentVersion ${input.contentVersion} 不匹配`,
    )
  const payload = structuredClone(input) as SavePayloadV8
  payload.contentVersion = 11
  if (payload.world.script !== undefined)
    checkWorldScriptStateV5(payload.world.script, 'payload.world.script')
  validateHostileAwareness(payload.world, 'payload.world')
  return payload
}
