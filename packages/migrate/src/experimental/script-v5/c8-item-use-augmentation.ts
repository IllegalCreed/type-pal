import type {
  ActorDef,
  Command,
  EntityAddress,
  ItemData,
  ItemDataV5,
  MigrationDiagnostic,
  MigrationDiagnosticsV1,
  ProjectScriptV4V5Issue,
  ProjectScriptV4V5Resolution,
  SceneDef,
  SceneDefV5,
  ScriptChunkV1,
  SpriteDef,
} from '@type-pal/content'
import {
  itemUseSupportsContextV5,
  ProjectScriptV4V5UpgradeError,
  palSoundAssetId,
  palSpriteAssetId,
  projectLocalScriptV4ToV5,
  validateLocale,
  validateMigrationDiagnostics,
  validateSprites,
} from '@type-pal/content'
import { validateHistoricalScenesForCurrentSchema } from '../../historical-enemy-team-authority.js'
import {
  migratedSpriteId,
  resolveSceneScriptPatches,
  type SourceItem,
} from '../../migrate-content.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { mapIdFromSourceNumber } from '../../project-map-converter.js'
import { extractLegacyScriptEdgesV1 } from '../../script-graph.js'
import type { SourceCmd } from '../../source-facts.js'
import {
  assertNoMigrationGaps,
  emptyTranslateReport,
  foldStages,
  type TranslateCtx,
  translateStages,
} from '../../translate-events.js'
import { validateR13ItemThrowParentItems } from './r13-item-throw-parent.js'
import { stableJson, stableJsonSha256 } from './stable-json.js'

export const C8_ITEM_IDS = [
  90, 91, 137, 150, 260, 263, 264, 271, 272, 273, 279, 284, 285, 286, 287, 288, 289, 291, 292, 294,
] as const

export const C8_ITEM_SOURCE_ROOTS = [
  { itemId: 90, channel: 'use', address: 39586 },
  { itemId: 91, channel: 'use', address: 39588 },
  { itemId: 137, channel: 'use', address: 39467 },
  { itemId: 137, channel: 'throw', address: 39499 },
  { itemId: 150, channel: 'use', address: 39561 },
  { itemId: 260, channel: 'use', address: 39768 },
  { itemId: 263, channel: 'use', address: 39781 },
  { itemId: 264, channel: 'use', address: 39787 },
  { itemId: 271, channel: 'use', address: 39715 },
  { itemId: 272, channel: 'use', address: 39647 },
  { itemId: 273, channel: 'use', address: 39644 },
  { itemId: 279, channel: 'use', address: 39632 },
  { itemId: 284, channel: 'use', address: 39651 },
  { itemId: 285, channel: 'use', address: 39654 },
  { itemId: 286, channel: 'use', address: 39660 },
  { itemId: 287, channel: 'use', address: 39722 },
  { itemId: 288, channel: 'use', address: 39742 },
  { itemId: 289, channel: 'use', address: 39749 },
  { itemId: 291, channel: 'use', address: 39757 },
  { itemId: 292, channel: 'use', address: 39831 },
  { itemId: 294, channel: 'use', address: 39856 },
] as const

export const C8_STORY_ITEM_ROOTS = [
  { itemId: 260, address: 39768 },
  { itemId: 263, address: 39781 },
  { itemId: 264, address: 39787 },
  { itemId: 271, address: 39715 },
  { itemId: 272, address: 39647 },
  { itemId: 273, address: 39644 },
  { itemId: 279, address: 39632 },
  { itemId: 284, address: 39651 },
  { itemId: 286, address: 39660 },
  { itemId: 287, address: 39722 },
  { itemId: 288, address: 39742 },
  { itemId: 289, address: 39749 },
  { itemId: 291, address: 39757 },
  { itemId: 292, address: 39831 },
] as const

/**
 * R13-1 独立源审计锁定的 C8 动态自动行为终止集。这里同时钉住安装目标和 PAL
 * 源入口；生成时会重新跑 source CFG 分类，禁止靠“当前产物长得像终止”自证。
 */
export const C8_AUTO_TERMINAL_ORACLE = [
  {
    sceneId: 's003',
    entityId: 'e59',
    behaviorId: 'c8-9013d2e11d8c',
    installer: 1864,
    ownerWord: 60,
    root: 1891,
  },
  {
    sceneId: 's003',
    entityId: 'e60',
    behaviorId: 'c8-460397709cd4',
    installer: 1865,
    ownerWord: 61,
    root: 1894,
  },
  {
    sceneId: 's003',
    entityId: 'e61',
    behaviorId: 'c8-714c2db7894a',
    installer: 1866,
    ownerWord: 62,
    root: 1898,
  },
  {
    sceneId: 's097',
    entityId: 'e1782',
    behaviorId: 'c8-f0eb9cfbf43b',
    installer: 14066,
    ownerWord: 0xffff,
    root: 14127,
  },
  {
    sceneId: 's097',
    entityId: 'e1782',
    behaviorId: 'c8-adc3f9a19936',
    installer: 14074,
    ownerWord: 0xffff,
    root: 14129,
  },
  {
    sceneId: 's273',
    entityId: 'e4724',
    behaviorId: 'c8-a0ab54723b62',
    installer: 34548,
    ownerWord: 0xffff,
    root: 34534,
  },
  {
    sceneId: 's273',
    entityId: 'e4726',
    behaviorId: 'c8-7f025c388a79',
    installer: 34662,
    ownerWord: 4727,
    root: 34639,
  },
  {
    sceneId: 's273',
    entityId: 'e4728',
    behaviorId: 'c8-ce8bb918cff0',
    installer: 34658,
    ownerWord: 4729,
    root: 34629,
  },
  {
    sceneId: 's273',
    entityId: 'e4729',
    behaviorId: 'c8-80a10b0fd027',
    installer: 34748,
    ownerWord: 4730,
    root: 34761,
  },
] as const

export interface C8SourceRootEvidenceV1 {
  channel: 'use' | 'throw'
  address: number
  closureDigest: string
}

export interface C8CanonicalTargetEvidenceV1 {
  channel: 'use' | 'throw'
  identity: { kind: 'item-use'; itemId: string } | { kind: 'item-throw'; itemId: string }
  digest: string
}

export interface C8ItemTransitionEvidenceV1 {
  itemId: string
  sourceRoots: C8SourceRootEvidenceV1[]
  targets: C8CanonicalTargetEvidenceV1[]
}

export type C8OwnedIdentityV1 =
  | {
      kind: 'entity-behavior'
      sceneId: string
      entityId: string
      channel: 'trigger' | 'auto'
      behaviorId: string
    }
  | {
      kind: 'scene-hook'
      sceneId: string
      hook: 'onEnter' | 'onTeleport'
      hookId: string
    }
  | { kind: 'locale'; key: string }
  | { kind: 'sprite'; spriteId: string }

export interface C8OwnedTargetEvidenceV1 {
  identity: C8OwnedIdentityV1
  digest: string
}

export interface C8ItemUseAugmentationEvidenceV1 {
  generator: {
    id: 'c8-item-use-augmentation'
    version: 1
  }
  items: C8ItemTransitionEvidenceV1[]
  ownedTargets: C8OwnedTargetEvidenceV1[]
  diagnostics: {
    removedItemIds: string[]
    remainingItemUseIds: string[]
    sourceDigest: string
  }
  gates: {
    sourceUsableItemIds: string[]
    targetRunnableUseItemIds: string[]
    itemUseDiagnosticCount: 0
  }
}

export interface C8ItemUseAugmentation {
  snapshot: MigrationSnapshot
  evidence: C8ItemUseAugmentationEvidenceV1
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function required<T>(snapshot: MigrationSnapshot, path: string, clone = true): T {
  const value = snapshot.files.get(path)
  if (value === undefined) throw new Error(`C8 item use augmentation: 缺 ${path}`)
  return clone ? (structuredClone(value) as T) : (value as unknown as T)
}

function put(snapshot: MigrationSnapshot, path: string, value: unknown): void {
  snapshot.files.set(path, asJson(value))
  snapshot.managedFiles.add(path)
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // required() clones every value C8 may mutate, and put() replaces every owned
    // output. Retained maps/assets are immutable and can stay shared.
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function sameStringSet(
  expected: readonly string[],
  actual: readonly string[],
  label: string,
): void {
  if (expected.length !== actual.length || expected.some((value, index) => value !== actual[index]))
    throw new Error(
      `C8 item use augmentation: ${label} 不闭合\nexpected=${expected.join(',')}\nactual=${actual.join(',')}`,
    )
}

function minimalLegacyScenes(scenes: readonly SceneDefV5[]): SceneDef[] {
  return scenes.map((scene) => ({
    id: scene.id,
    mapId: scene.mapId,
    entry: structuredClone(scene.entry),
    ...(scene.battleFieldId === undefined ? {} : { battleFieldId: scene.battleFieldId }),
    ...(scene.battleMusic === undefined ? {} : { battleMusic: structuredClone(scene.battleMusic) }),
    entities: scene.entities.map((entity) => {
      const base = {
        id: entity.id,
        pos: structuredClone(entity.pos),
        ...(entity.facing === undefined ? {} : { facing: entity.facing }),
        ...(entity.collide === undefined ? {} : { collide: entity.collide }),
        ...(entity.hidden === undefined ? {} : { hidden: entity.hidden }),
        ...(entity.zBias === undefined ? {} : { zBias: entity.zBias }),
      }
      if ('actor' in entity) return { ...base, actor: entity.actor }
      if ('sprite' in entity) return { ...base, sprite: entity.sprite }
      return { ...base, zone: true }
    }),
  }))
}

function entityAddressIndex(scenes: readonly SceneDef[]): Map<string, EntityAddress[]> {
  const result = new Map<string, EntityAddress[]>()
  for (const scene of scenes)
    for (const entity of scene.entities) {
      const values = result.get(entity.id) ?? []
      values.push({ scene: scene.id, entity: entity.id })
      result.set(entity.id, values)
    }
  for (const values of result.values())
    values.sort(
      (left, right) =>
        left.scene.localeCompare(right.scene) || left.entity.localeCompare(right.entity),
    )
  return result
}

/**
 * projectLocalScriptV4ToV5 treats a non-empty legacy binding as a behavior/hook allocation.
 * The legacy empty binding means "disable", so normalize that one unambiguous case before
 * invoking the shared projector.
 */
function normalizeEmptyBindings(
  value: unknown,
  addresses: ReadonlyMap<string, readonly EntityAddress[]>,
  path = 'root',
): unknown {
  if (Array.isArray(value))
    return value.map((child, index) =>
      normalizeEmptyBindings(child, addresses, `${path}[${index}]`),
    )
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  if (
    (record.kind === 'setEntityTrigger' || record.kind === 'setEntityAuto') &&
    Array.isArray(record.stages) &&
    record.stages.length === 0
  ) {
    const entity = record.entity
    if (typeof entity !== 'string') throw new Error(`${path}.entity: 空行为绑定缺实体 id`)
    const candidates = addresses.get(entity) ?? []
    if (candidates.length !== 1)
      throw new Error(
        `${path}.entity: 空行为绑定 ${entity} 需要唯一地址，实际 ${candidates.length}`,
      )
    return {
      kind: 'selectEntityBehavior',
      target: structuredClone(candidates[0]),
      channel: record.kind === 'setEntityAuto' ? 'auto' : 'trigger',
      selection: { kind: 'disabled' },
    }
  }
  if (
    (record.kind === 'setSceneOnEnter' || record.kind === 'setSceneOnTeleport') &&
    Array.isArray(record.stages) &&
    record.stages.length === 0
  ) {
    if (typeof record.scene !== 'string')
      throw new Error(`${path}.scene: 空场景脚本绑定缺 scene id`)
    const hook = record.kind === 'setSceneOnEnter' ? 'onEnter' : 'onTeleport'
    return {
      kind: 'selectSceneHooks',
      scene: record.scene,
      selection: { [hook]: { kind: 'disabled' } },
    }
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      normalizeEmptyBindings(child, addresses, `${path}.${key}`),
    ]),
  )
}

function resolutionForIssue(issue: ProjectScriptV4V5Issue): ProjectScriptV4V5Resolution {
  if (issue.resolution === 'replace-dynamic-binding') {
    const digest = stableJsonSha256({
      owner: issue.owner,
      path: issue.path,
      message: issue.message,
    }).slice(0, 12)
    return {
      kind: 'replace-dynamic-binding',
      path: issue.path,
      id: `c8-${digest}`,
      label: `物品剧情行为 ${digest}`,
    }
  }
  if (issue.resolution === 'name-stages') {
    const slots = issue.slots
    if (!slots?.length) throw new Error(`${issue.path}: 多步骤命名缺 slots`)
    return {
      kind: 'name-stages',
      path: issue.path,
      stages: slots.map((slot) => ({ stageId: slot.suggestedId })),
    }
  }
  if (issue.resolution === 'resolve-legacy-entity-alias')
    return { kind: 'resolve-legacy-entity-alias', path: issue.path, mode: 'broadcast-v4' }
  if (issue.resolution === 'resolve-legacy-cursor-alias')
    return { kind: 'resolve-legacy-cursor-alias', path: issue.path, mode: 'broadcast-v4' }
  throw new Error(
    `C8 item use augmentation: ${issue.path} 需要人工裁决 ${issue.resolution}: ${issue.message}`,
  )
}

function projectWithDeterministicResolutions(args: Parameters<typeof projectLocalScriptV4ToV5>[0]) {
  const resolutions: ProjectScriptV4V5Resolution[] = []
  const paths = new Set<string>()
  for (let attempt = 0; attempt < 512; attempt++) {
    try {
      return projectLocalScriptV4ToV5({ ...args, resolutions })
    } catch (error) {
      if (!(error instanceof ProjectScriptV4V5UpgradeError)) throw error
      const issue = error.report.issues[0]
      if (!issue) throw error
      if (paths.has(issue.path))
        throw new Error(`C8 item use augmentation: resolution 未消解 ${issue.path}`, {
          cause: error,
        })
      const resolution = resolutionForIssue(issue)
      paths.add(issue.path)
      resolutions.push(resolution)
    }
  }
  throw new Error('C8 item use augmentation: deterministic resolution 超过 512 轮')
}

function rewriteAllocationSelections(
  value: unknown,
  behaviorAliases: ReadonlyMap<string, string>,
  hookAliases: ReadonlyMap<string, string>,
): void {
  if (Array.isArray(value)) {
    for (const child of value) rewriteAllocationSelections(child, behaviorAliases, hookAliases)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (record.kind === 'selectEntityBehavior') {
    const target = record.target as Partial<EntityAddress> | undefined
    const channel = record.channel
    const selection = record.selection as { kind?: unknown; value?: unknown } | undefined
    const cursorHandoff = record.cursorHandoff as { fromBehavior?: unknown } | undefined
    if (
      typeof target?.scene === 'string' &&
      typeof target.entity === 'string' &&
      (channel === 'trigger' || channel === 'auto') &&
      selection?.kind === 'use' &&
      typeof selection.value === 'string'
    ) {
      const alias = behaviorAliases.get(
        `${target.scene}\u0000${target.entity}\u0000${channel}\u0000${selection.value}`,
      )
      if (alias) selection.value = alias
      if (typeof cursorHandoff?.fromBehavior === 'string') {
        const sourceAlias = behaviorAliases.get(
          `${target.scene}\u0000${target.entity}\u0000${channel}\u0000${cursorHandoff.fromBehavior}`,
        )
        if (sourceAlias) cursorHandoff.fromBehavior = sourceAlias
      }
    }
  } else if (record.kind === 'selectSceneHooks') {
    const scene = record.scene
    const selection = record.selection as
      | Partial<Record<'onEnter' | 'onTeleport', { kind?: unknown; value?: unknown }>>
      | undefined
    if (typeof scene === 'string' && selection)
      for (const hook of ['onEnter', 'onTeleport'] as const) {
        const slot = selection[hook]
        if (slot?.kind !== 'use' || typeof slot.value !== 'string') continue
        const alias = hookAliases.get(`${scene}\u0000${hook}\u0000${slot.value}`)
        if (alias) slot.value = alias
      }
  }
  for (const child of Object.values(record))
    rewriteAllocationSelections(child, behaviorAliases, hookAliases)
}

/**
 * The generic upgrader allocates by installer path because arbitrary author projects require
 * explicit names. PAL may install the same target/body from several legacy sites, so collapse
 * those path aliases by canonical owner + flow digest and rewrite every selection to one id.
 */
function dedupeProjectedAllocations(scenes: SceneDefV5[], items: ItemDataV5[]): void {
  const behaviorAliases = new Map<string, string>()
  const hookAliases = new Map<string, string>()
  for (let round = 0; round < 64; round++) {
    let changed = false
    for (const scene of scenes)
      for (const entity of scene.entities)
        for (const channel of ['trigger', 'auto'] as const) {
          const registry = entity.behaviors?.[channel]
          if (!registry) continue
          const groups = new Map<string, string[]>()
          for (const [id, value] of Object.entries(registry)) {
            const key = stableJson(value.flow)
            const ids = groups.get(key) ?? []
            ids.push(id)
            groups.set(key, ids)
          }
          for (const ids of groups.values()) {
            ids.sort()
            const canonical = ids[0]
            if (!canonical) continue
            for (const id of ids.slice(1)) {
              behaviorAliases.set(
                `${scene.id}\u0000${entity.id}\u0000${channel}\u0000${id}`,
                canonical,
              )
              delete registry[id]
              changed = true
            }
          }
        }
    for (const scene of scenes)
      for (const hook of ['onEnter', 'onTeleport'] as const) {
        const variants = scene.hooks?.[hook]?.variants
        if (!variants) continue
        const groups = new Map<string, string[]>()
        for (const [id, value] of Object.entries(variants)) {
          const key = stableJson(value.flow)
          const ids = groups.get(key) ?? []
          ids.push(id)
          groups.set(key, ids)
        }
        for (const ids of groups.values()) {
          ids.sort()
          const canonical = ids[0]
          if (!canonical) continue
          for (const id of ids.slice(1)) {
            hookAliases.set(`${scene.id}\u0000${hook}\u0000${id}`, canonical)
            delete variants[id]
            changed = true
          }
        }
      }
    rewriteAllocationSelections(scenes, behaviorAliases, hookAliases)
    rewriteAllocationSelections(items, behaviorAliases, hookAliases)
    if (!changed) return
  }
  throw new Error('C8 item use augmentation: dynamic allocation 去重超过 64 轮')
}

export function assertProjectedAllocationClosure(
  scenes: readonly SceneDefV5[],
  items: readonly ItemDataV5[],
): void {
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]))
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        visit(child, `${path}[${index}]`)
      })
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (record.kind === 'selectEntityBehavior') {
      const target = record.target as Partial<EntityAddress> | undefined
      const channel = record.channel
      const selection = record.selection as { kind?: unknown; value?: unknown } | undefined
      const cursorHandoff = record.cursorHandoff as { fromBehavior?: unknown } | undefined
      if (
        selection?.kind === 'use' &&
        typeof selection.value === 'string' &&
        typeof target?.scene === 'string' &&
        typeof target.entity === 'string' &&
        (channel === 'trigger' || channel === 'auto')
      ) {
        const entity = sceneById
          .get(target.scene)
          ?.entities.find((candidate) => candidate.id === target.entity)
        if (!entity?.behaviors?.[channel]?.[selection.value])
          throw new Error(
            `C8 item use augmentation: ${path} 悬空 behavior ${target.scene}/${target.entity}/${channel}/${selection.value}`,
          )
        if (
          typeof cursorHandoff?.fromBehavior === 'string' &&
          !entity?.behaviors?.[channel]?.[cursorHandoff.fromBehavior]
        )
          throw new Error(
            `C8 item use augmentation: ${path} 悬空来源 behavior ${target.scene}/${target.entity}/${channel}/${cursorHandoff.fromBehavior}`,
          )
      }
    } else if (record.kind === 'selectSceneHooks') {
      const sceneId = record.scene
      const selection = record.selection as
        | Partial<Record<'onEnter' | 'onTeleport', { kind?: unknown; value?: unknown }>>
        | undefined
      if (typeof sceneId === 'string' && selection)
        for (const hook of ['onEnter', 'onTeleport'] as const) {
          const slot = selection[hook]
          if (slot?.kind !== 'use' || typeof slot.value !== 'string') continue
          if (!sceneById.get(sceneId)?.hooks?.[hook]?.variants[slot.value])
            throw new Error(
              `C8 item use augmentation: ${path} 悬空 hook ${sceneId}/${hook}/${slot.value}`,
            )
        }
    }
    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`)
  }
  visit(scenes, 'scenes')
  visit(items, 'items')
}

/**
 * 三方合并后的最终 target 门禁。C8 seal 记录的是权威生成证据，但作者分支仍可合法
 * 修改内容；因此这里验证能力闭包与可运行性，不用初次生成 digest 覆盖作者修改。
 */
export function assertC8ItemUseFinalTargetClosure(
  snapshot: MigrationSnapshot,
  evidence: C8ItemUseAugmentationEvidenceV1,
): void {
  const sceneIds = required<string[]>(snapshot, 'content/scenes/index.json')
  const sceneValues = sceneIds.map((id) => required(snapshot, `content/scenes/${id}.json`))
  const scenes = validateHistoricalScenesForCurrentSchema(sceneValues)
  const items = validateR13ItemThrowParentItems(required(snapshot, 'content/items.json'))
  const diagnostics = validateMigrationDiagnostics(
    required(snapshot, 'content/migration-diagnostics.json'),
  )
  const runnable = items
    .filter(
      (item) =>
        item.use !== undefined &&
        (itemUseSupportsContextV5(item.use, 'world') ||
          itemUseSupportsContextV5(item.use, 'battle')),
    )
    .map((item) => item.id)
    .sort((left, right) => Number(left) - Number(right))
  sameStringSet(
    evidence.gates.sourceUsableItemIds,
    runnable,
    'final source usable / target runnable',
  )
  const itemUseDiagnosticIds = itemUseDiagnostics(diagnostics)
    .map((entry) => entry.target.objectId)
    .sort((left, right) => Number(left) - Number(right))
  if (itemUseDiagnosticIds.length)
    throw new Error(
      `C8 item use augmentation: final target 仍有 item/use 诊断 ${itemUseDiagnosticIds.join(',')}`,
    )

  const byId = new Map(items.map((item) => [item.id, item]))
  for (const entry of evidence.items) {
    const item = byId.get(entry.itemId)
    if (!item) throw new Error(`C8 item use augmentation: final target 缺物品 ${entry.itemId}`)
    for (const target of entry.targets) {
      if (target.channel === 'use') {
        if (
          !item.use ||
          (!itemUseSupportsContextV5(item.use, 'world') &&
            !itemUseSupportsContextV5(item.use, 'battle'))
        )
          throw new Error(`C8 item use augmentation: final target ${entry.itemId}.use 不可运行`)
        continue
      }
      if (
        !item.throw ||
        item.throw.effects.length === 0 ||
        !item.throw.effects.every(
          (effect) => effect.kind === 'applyPoison' || effect.kind === 'currentHpDamage',
        )
      )
        throw new Error(`C8 item use augmentation: final target ${entry.itemId}.throw 不可运行`)
    }
  }
  assertProjectedAllocationClosure(scenes, items)
}

function projectedSceneHasAllocations(scene: SceneDefV5): boolean {
  for (const entity of scene.entities)
    for (const channel of ['trigger', 'auto'] as const)
      if (Object.keys(entity.behaviors?.[channel] ?? {}).length) return true
  return (['onEnter', 'onTeleport'] as const).some(
    (hook) => Object.keys(scene.hooks?.[hook]?.variants ?? {}).length > 0,
  )
}

function mergeProjectedAllocations(
  sourceScenes: ReadonlyMap<string, SceneDefV5>,
  mutableScene: (sceneId: string) => SceneDefV5,
  projectedScenes: readonly SceneDefV5[],
): C8OwnedTargetEvidenceV1[] {
  const owned: C8OwnedTargetEvidenceV1[] = []
  for (const projected of projectedScenes) {
    if (!sourceScenes.has(projected.id))
      throw new Error(`C8 item use augmentation: 场景不存在 ${projected.id}`)
    // The projector lists every scene, but only a small subset receives a behavior/hook
    // allocation.  Do not clone the other 290+ scene graphs merely to iterate over them.
    if (!projectedSceneHasAllocations(projected)) continue
    const targetScene = mutableScene(projected.id)
    const targetEntities = new Map(targetScene.entities.map((entity) => [entity.id, entity]))
    for (const sourceEntity of projected.entities) {
      if (!sourceEntity.behaviors) continue
      const targetEntity = targetEntities.get(sourceEntity.id)
      if (!targetEntity)
        throw new Error(`C8 item use augmentation: 实体不存在 ${projected.id}/${sourceEntity.id}`)
      targetEntity.behaviors ??= {}
      for (const channel of ['trigger', 'auto'] as const) {
        const sourceRegistry = sourceEntity.behaviors[channel]
        if (!sourceRegistry) continue
        const targetRegistry = targetEntity.behaviors[channel] ?? {}
        for (const [behaviorId, behavior] of Object.entries(sourceRegistry).sort(([a], [b]) =>
          a.localeCompare(b),
        )) {
          const previous = targetRegistry[behaviorId]
          if (previous && stableJson(previous) !== stableJson(behavior))
            throw new Error(
              `C8 item use augmentation: behavior 冲突 ${projected.id}/${sourceEntity.id}/${channel}/${behaviorId}`,
            )
          targetRegistry[behaviorId] = previous ?? structuredClone(behavior)
          owned.push({
            identity: {
              kind: 'entity-behavior',
              sceneId: projected.id,
              entityId: sourceEntity.id,
              channel,
              behaviorId,
            },
            digest: stableJsonSha256(behavior),
          })
        }
        targetEntity.behaviors[channel] = targetRegistry
      }
    }
    for (const hook of ['onEnter', 'onTeleport'] as const) {
      const sourceChannel = projected.hooks?.[hook]
      if (!sourceChannel) continue
      targetScene.hooks ??= {}
      const targetChannel = targetScene.hooks[hook] ?? { variants: {} }
      for (const [hookId, value] of Object.entries(sourceChannel.variants).sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        const previous = targetChannel.variants[hookId]
        if (previous && stableJson(previous) !== stableJson(value))
          throw new Error(`C8 item use augmentation: hook 冲突 ${projected.id}/${hook}/${hookId}`)
        targetChannel.variants[hookId] = previous ?? structuredClone(value)
        owned.push({
          identity: {
            kind: 'scene-hook',
            sceneId: projected.id,
            hook,
            hookId,
          },
          digest: stableJsonSha256(value),
        })
      }
      targetScene.hooks[hook] = targetChannel
    }
  }
  return owned
}

function sourceClosureDigests(commands: readonly SourceCmd[]): (root: number) => string {
  const outgoing = Array.from({ length: commands.length }, () => [] as number[])
  for (const edge of extractLegacyScriptEdgesV1(commands)) outgoing[edge.from]?.push(edge.to)
  const cache = new Map<number, string>()
  return (root: number): string => {
    const cached = cache.get(root)
    if (cached) return cached
    const seen = new Set<number>()
    const queue = [root]
    while (queue.length) {
      const address = queue.pop()!
      if (address < 0 || address >= commands.length || seen.has(address)) continue
      seen.add(address)
      for (const next of outgoing[address] ?? []) queue.push(next)
    }
    const closure = [...seen]
      .sort((left, right) => left - right)
      .map((address) => ({ address, command: commands[address] }))
    const digest = stableJsonSha256({ root, closure })
    cache.set(root, digest)
    return digest
  }
}

function ensureStorySprite(
  sprites: SpriteDef[],
  spriteNum: number,
  layout: SpriteDef['layout'],
): SpriteDef {
  const id = migratedSpriteId(spriteNum)
  const expected: SpriteDef = {
    id,
    asset: palSpriteAssetId(spriteNum),
    // 与 0x65 通用迁移注册表保持同一稳定定义；C8 只补此前未被 P7 materialize 的条目。
    label: `原精灵 ${spriteNum}(0x65 换装)`,
    layout,
  }
  const previous = sprites.find((sprite) => sprite.id === id)
  if (previous) {
    if (stableJson(previous) !== stableJson(expected))
      throw new Error(`C8 item use augmentation: ${id} 与证据布局冲突`)
    return previous
  }
  sprites.push(expected)
  return expected
}

function storySpriteResolver(
  sprites: readonly SpriteDef[],
  actors: readonly ActorDef[],
): (spriteNum: number) => string | undefined {
  const actorSpriteIds = new Set(actors.map((actor) => actor.spriteId))
  return (spriteNum: number): string | undefined => {
    const asset = palSpriteAssetId(spriteNum)
    const candidates = sprites.filter((sprite) => sprite.asset === asset)
    const actorCandidates = candidates.filter((sprite) => actorSpriteIds.has(sprite.id))
    if (actorCandidates.length === 1) return actorCandidates[0]!.id
    const stable = candidates.find((sprite) => sprite.id === migratedSpriteId(spriteNum))
    if (stable) return stable.id
    return candidates.length === 1 ? candidates[0]!.id : undefined
  }
}

function buildItemEvidence(
  itemSources: readonly SourceItem[],
  targetItems: readonly ItemDataV5[],
  closureDigest: (root: number) => string,
): C8ItemTransitionEvidenceV1[] {
  const sources = new Map(itemSources.map((item) => [item.id, item]))
  const targets = new Map(targetItems.map((item) => [item.id, item]))
  return C8_ITEM_IDS.map((itemId) => {
    const source = sources.get(itemId)
    const target = targets.get(String(itemId))
    if (!source || !target?.use) throw new Error(`C8 item use augmentation: 证据缺物品 ${itemId}`)
    const sourceRoots: C8SourceRootEvidenceV1[] = [
      {
        channel: 'use',
        address: source.scriptOnUse,
        closureDigest: closureDigest(source.scriptOnUse),
      },
    ]
    const targetEvidence: C8CanonicalTargetEvidenceV1[] = [
      {
        channel: 'use',
        identity: { kind: 'item-use', itemId: String(itemId) },
        digest: stableJsonSha256(target.use),
      },
    ]
    if (itemId === 137) {
      if (!target.throw || source.scriptOnThrow <= 0)
        throw new Error('C8 item use augmentation: 无影毒 throw 证据缺失')
      sourceRoots.push({
        channel: 'throw',
        address: source.scriptOnThrow,
        closureDigest: closureDigest(source.scriptOnThrow),
      })
      targetEvidence.push({
        channel: 'throw',
        identity: { kind: 'item-throw', itemId: String(itemId) },
        digest: stableJsonSha256(target.throw),
      })
    }
    return { itemId: String(itemId), sourceRoots, targets: targetEvidence }
  })
}

function itemUseDiagnostics(value: MigrationDiagnosticsV1): MigrationDiagnostic[] {
  return value.diagnostics.filter(
    (diagnostic) => diagnostic.target.domain === 'item' && diagnostic.target.capability === 'use',
  )
}

/**
 * C8 runs strictly after P7 canonical generation. It never mutates the P7 project or P6 IR:
 * the 14 source scripts are projected through the shared local v4 -> v5 projector and only
 * their item-private bodies plus dynamically allocated behaviors/hooks are merged into a
 * cloned generated snapshot.
 */
export function augmentC8ItemUsesAfterP7(args: {
  snapshot: MigrationSnapshot
  itemSources: readonly SourceItem[]
  sourceCommands: readonly SourceCmd[]
}): C8ItemUseAugmentation {
  const snapshot = cloneSnapshot(args.snapshot)
  const sceneIds = required<string[]>(snapshot, 'content/scenes/index.json', false)
  const sourceSceneValues = sceneIds.map((id) =>
    required(snapshot, `content/scenes/${id}.json`, false),
  )
  const sourceScenes = validateHistoricalScenesForCurrentSchema(sourceSceneValues)
  const sourceScenesById = new Map(sourceScenes.map((scene) => [scene.id, scene]))
  const mutatedScenes = new Map<string, SceneDefV5>()
  const mutableScene = (sceneId: string): SceneDefV5 => {
    const existing = mutatedScenes.get(sceneId)
    if (existing) return existing
    const source = sourceScenesById.get(sceneId)
    if (!source) throw new Error(`C8 item use augmentation: 场景不存在 ${sceneId}`)
    const clone = structuredClone(source)
    mutatedScenes.set(sceneId, clone)
    return clone
  }
  const items = validateR13ItemThrowParentItems(required(snapshot, 'content/items.json'))
  const locale = validateLocale(required(snapshot, 'content/locale.json'), {
    allowLegacySoftWrap: true,
  })
  const actors = required<ActorDef[]>(snapshot, 'content/actors.json', false)
  const sprites = validateSprites(required(snapshot, 'content/sprites.json'))
  const diagnostics = validateMigrationDiagnostics(
    required(snapshot, 'content/migration-diagnostics.json'),
  )

  const sprite259 = ensureStorySprite(sprites, 259, { kind: 'static' })
  const spriteIdForNum = storySpriteResolver(sprites, actors)
  const assets = required<{ assets?: Record<string, unknown> }>(
    snapshot,
    'assets/index.json',
    false,
  )
  const soundAssetForNum = (sound: number) => {
    const id = palSoundAssetId(sound)
    return assets.assets?.[id] ? id : undefined
  }

  const legacyScenes = minimalLegacyScenes(sourceScenes)
  const sceneBattleDefaults = new Map(
    legacyScenes.map((scene) => [
      scene.id,
      {
        battleFieldId: scene.battleFieldId,
        battleMusic: structuredClone(scene.battleMusic),
      },
    ]),
  )
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  const explicitLabels = new Set<string>()
  args.sourceCommands.forEach((command, address) => {
    const expected = `L_${address}`
    if (command.label !== undefined && command.label !== expected)
      throw new Error(
        `C8 item use augmentation: all.json label/index 漂移 ${command.label} != ${expected}`,
      )
    if (command.label) explicitLabels.add(command.label)
    labelAt.set(expected, { cmds: args.sourceCommands, idx: address })
  })
  const tctx: TranslateCtx = {
    labelAt,
    sourceAddressAt: (commands, index) => (commands === args.sourceCommands ? index : undefined),
    explicitLabels,
    palSemanticProfile: 'historical-r13-4',
    locale: {},
    report: emptyTranslateReport(),
    spriteIdForNum,
    mapIdForNum: mapIdFromSourceNumber,
    soundAssetForNum,
  }

  const sourceItems = new Map(args.itemSources.map((item) => [item.id, item]))
  const translated = C8_STORY_ITEM_ROOTS.map(({ itemId, address }) => {
    const source = sourceItems.get(itemId)
    if (!source?.flags.usable || source.scriptOnUse !== address)
      throw new Error(`C8 item use augmentation: 物品 ${itemId} 源根漂移`)
    const stages = translateStages(`L_${address}`, 'global/items', tctx)
    if (!stages?.length) throw new Error(`C8 item use augmentation: 物品 ${itemId} 无可译正文`)
    return { itemId, address, stages: foldStages(stages) }
  })
  resolveSceneScriptPatches(
    legacyScenes,
    tctx,
    [],
    translated.map((entry) => entry.stages),
  )
  assertNoMigrationGaps(tctx.report)
  for (const scene of legacyScenes) {
    const before = sceneBattleDefaults.get(scene.id)
    if (
      !before ||
      before.battleFieldId !== scene.battleFieldId ||
      before.battleMusic !== scene.battleMusic
    )
      throw new Error(
        `C8 item use augmentation: 物品剧情试图修改场景战斗默认值 ${scene.id}，需显式设计归属`,
      )
  }

  const addresses = entityAddressIndex(legacyScenes)
  const scriptChunk: ScriptChunkV1 = {
    version: 1,
    id: 'c8-item-use',
    scripts: {},
  }
  const targetItems = new Map(items.map((item) => [item.id, item]))
  const legacyItems: ItemData[] = translated.map(({ itemId, stages }) => {
    const stage = stages[0]
    if (stages.length !== 1 || !stage || stage.entry || stage.next !== undefined)
      throw new Error(`C8 item use augmentation: 物品 ${itemId} 根必须是单段无转移正文`)
    const target = targetItems.get(String(itemId))
    const source = sourceItems.get(itemId)
    if (!target || !source) throw new Error(`C8 item use augmentation: 物品 ${itemId} 缺目标`)
    const scriptId = `c8/item/${itemId}/use`
    scriptChunk.scripts[scriptId] = normalizeEmptyBindings(
      stage.body,
      addresses,
      scriptId,
    ) as Command[]
    const { use: _use, throw: _throw, ...base } = target
    return {
      ...(structuredClone(base) as ItemData),
      use: {
        target: 'scene',
        consuming: source.flags.consuming,
        effects: [{ kind: 'runScript', script: { chunk: scriptChunk.id, id: scriptId } }],
        menuAfterUse: 'close',
      },
    }
  })

  const projection = projectWithDeterministicResolutions({
    projectId: 'pal-c8-item-use',
    scenes: legacyScenes,
    items: legacyItems,
    scriptChunks: { [scriptChunk.id]: scriptChunk },
  })
  dedupeProjectedAllocations(projection.scenes, projection.items)
  assertProjectedAllocationClosure(projection.scenes, projection.items)
  const ownedTargets = mergeProjectedAllocations(sourceScenesById, mutableScene, projection.scenes)
  for (const projected of projection.items) {
    const target = targetItems.get(projected.id)
    if (!target || !projected.use)
      throw new Error(`C8 item use augmentation: 投影缺物品 ${projected.id}`)
    const privateEffect = projected.use.effects.find(
      (effect) => effect.kind === 'itemPrivateScript',
    )
    if (!privateEffect || privateEffect.kind !== 'itemPrivateScript')
      throw new Error(`C8 item use augmentation: ${projected.id} 未生成 itemPrivateScript`)
    privateEffect.script.label = `${target.name}使用`
    target.use = structuredClone(projected.use)
  }

  for (const [key, text] of Object.entries(tctx.locale).sort(([a], [b]) => a.localeCompare(b))) {
    const previous = locale[key]
    if (previous !== undefined && previous !== text)
      throw new Error(`C8 item use augmentation: locale 冲突 ${key}`)
    locale[key] = text
    if (previous === undefined)
      ownedTargets.push({
        identity: { kind: 'locale', key },
        digest: stableJsonSha256(text),
      })
  }
  ownedTargets.push({
    identity: { kind: 'sprite', spriteId: sprite259.id },
    digest: stableJsonSha256(sprite259),
  })
  ownedTargets.sort((left, right) =>
    stableJson(left.identity).localeCompare(stableJson(right.identity)),
  )

  const storyIds = new Set(C8_STORY_ITEM_ROOTS.map(({ itemId }) => String(itemId)))
  const removedDiagnostics = itemUseDiagnostics(diagnostics).filter((entry) =>
    storyIds.has(entry.target.objectId),
  )
  if (removedDiagnostics.length !== C8_STORY_ITEM_ROOTS.length)
    throw new Error(
      `C8 item use augmentation: 应删除 ${C8_STORY_ITEM_ROOTS.length} 条剧情用途诊断，实际 ${removedDiagnostics.length}`,
    )
  diagnostics.diagnostics = diagnostics.diagnostics.filter(
    (entry) =>
      !(
        entry.target.domain === 'item' &&
        entry.target.capability === 'use' &&
        storyIds.has(entry.target.objectId)
      ),
  )
  const remaining = itemUseDiagnostics(diagnostics)
    .map((entry) => entry.target.objectId)
    .sort((left, right) => Number(left) - Number(right))
  if (remaining.length)
    throw new Error(`C8 item use augmentation: 仍有 item/use 诊断 ${remaining.join(',')}`)

  const sourceUsableItemIds = args.itemSources
    .filter((item) => item.flags.usable)
    .map((item) => String(item.id))
    .sort((left, right) => Number(left) - Number(right))
  const targetRunnableUseItemIds = items
    .filter(
      (item) =>
        item.use !== undefined &&
        (itemUseSupportsContextV5(item.use, 'world') ||
          itemUseSupportsContextV5(item.use, 'battle')),
    )
    .map((item) => item.id)
    .sort((left, right) => Number(left) - Number(right))
  sameStringSet(sourceUsableItemIds, targetRunnableUseItemIds, 'source usable / target runnable')

  const finalScenes = sourceScenes.map((scene) => mutatedScenes.get(scene.id) ?? scene)
  validateHistoricalScenesForCurrentSchema(finalScenes)
  validateR13ItemThrowParentItems(items)
  validateLocale(locale, { allowLegacySoftWrap: true })
  validateSprites(sprites)
  validateMigrationDiagnostics(diagnostics)
  for (const [sceneId, scene] of mutatedScenes)
    put(snapshot, `content/scenes/${sceneId}.json`, scene)
  put(snapshot, 'content/items.json', items)
  put(snapshot, 'content/locale.json', locale)
  put(snapshot, 'content/sprites.json', sprites)
  put(snapshot, 'content/migration-diagnostics.json', diagnostics)

  const closureDigest = sourceClosureDigests(args.sourceCommands)
  const evidence: C8ItemUseAugmentationEvidenceV1 = {
    generator: { id: 'c8-item-use-augmentation', version: 1 },
    items: buildItemEvidence(args.itemSources, items, closureDigest),
    ownedTargets,
    diagnostics: {
      removedItemIds: [...storyIds].sort((left, right) => Number(left) - Number(right)),
      remainingItemUseIds: remaining,
      sourceDigest: stableJsonSha256(
        removedDiagnostics
          .map((entry) => structuredClone(entry))
          .sort((left, right) => left.target.objectId.localeCompare(right.target.objectId)),
      ),
    },
    gates: {
      sourceUsableItemIds,
      targetRunnableUseItemIds,
      itemUseDiagnosticCount: 0,
    },
  }
  return { snapshot, evidence }
}
