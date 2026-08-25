/**
 * 项目工作台共用诊断。
 *
 * 这里不建立第二套资产扫描器：资产引用统一来自 content 的
 * `collectAssetReferences`，入口点的 scene/id/数量约束是 manifest 本地不变式。
 * UI、保存前校验和测试都消费同一组纯函数。
 */
import {
  ASSET_ROLES,
  type AssetKind,
  type AssetRole,
  type CurrentManifest,
  type EntryPoint,
  type Issue,
  type SceneDef,
  type StartWorld,
  validateAssetCatalog,
  validateAuthorDialogueReferences,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateBattleFields,
  validateManifestAssetConfig,
  validateReferences,
  validateStartWorldResources,
  validateWorldVariableRegistryV1,
} from '@type-pal/content'
import { isRuntimeScriptRef } from '@type-pal/reforge'
import { type ActorReference, blockingActorReferenceMap } from './actor-references.js'
import { collectEditorAssetDiagnostics, type EditorAssetDiagnostic } from './asset-diagnostics.js'
import { type BattleDataReference, blockingPoisonReferenceMap } from './battle-data-references.js'
import type { EditorState } from './edit-session.js'
import {
  collectEditorAssetReferenceSnapshotFromSlices,
  collectEditorAssetReferences,
  type EditorAssetReferenceSnapshot,
} from './editor-asset-references.js'
import {
  collectEntityAddressReferences,
  collectMissingEntityAddressReferences,
  type EntityAddressReference,
  missingEntityAddressReferencesFrom,
} from './entity-address-references.js'
import { type ItemReference, itemReferenceMap } from './item-references.js'
import {
  buildCanonicalSchemeReferenceIndexesFromVisits,
  type CanonicalSchemeReferenceIndexes,
  type CanonicalScriptCommandVisit,
  collectCanonicalScriptCommandVisits,
  collectScriptReferenceIssuesFromVisits,
  type ScriptEditorState,
  type ScriptReferenceIssue,
} from './script-editor.js'
import {
  projectCurrentAuthorReferenceSlices,
  scriptEditorStateFromCurrentAuthorSlices,
} from './script-editor-projection.js'
import {
  buildCanonicalSceneEntryReferenceIndexFromVisits,
  type SceneEntryReferenceEntry,
} from './script-references.js'
import {
  collectWorldVariableReferencesV1FromVisits,
  collectWorldVariableRegistryIssuesV1,
  type WorldVariableReferenceIndexV1,
  worldVariableScriptStateFromEditorStateV1,
} from './world-variable-references.js'

export type ProjectIssueSeverity = 'error' | 'warn'

export type ProjectIssueCode =
  | 'missing-default-entry'
  | 'empty-entry-points'
  | 'blank-entry-id'
  | 'noncanonical-entry-id'
  | 'duplicate-entry-id'
  | 'missing-entry-point-scene'
  | 'missing-role-asset'
  | 'role-kind-mismatch'
  | 'missing-asset'
  | 'asset-kind-mismatch'
  | 'missing-intro-video'
  | 'intro-video-kind-mismatch'
  | 'unused-asset'
  | 'invalid-start-world'
  | 'asset-catalog-invalid'
  | 'manifest-assets-invalid'
  | 'invalid-item-data'
  | 'migration-pending'
  | 'unknown-manifest-field'

export type ManifestLike = CurrentManifest

export interface ProjectIssue {
  severity: ProjectIssueSeverity
  code: ProjectIssueCode
  message: string
  path: string
  /** 资源诊断的结构化主体；分组和展示不得反向解析 message/path。 */
  asset?: {
    id: string
    expectedKind?: AssetKind
    actualKind?: AssetKind
  }
  /** manifest 资源角色诊断的结构化角色；概览不得反向解析 message/path。 */
  assetRole?: AssetRole
  /** 深链接目标；只提供稳定 id，不把数组位置作为身份。 */
  target?: {
    module: 'scene' | 'asset' | 'item' | 'project'
    page: string
    objectId?: string
    domain?: 'world' | 'battle'
    view?: 'definition' | 'asset'
  }
}

const CURRENT_MANIFEST_TOP_LEVEL_KEYS = {
  id: true,
  name: true,
  contentVersion: true,
  defaultEntryId: true,
  entryPoints: true,
  content: true,
  assets: true,
  minimumSaveVersion: true,
} satisfies Record<keyof ManifestLike, true>

/** 损坏恢复只允许改坏条目；合法唯一 id 仍是稳定引用，不借修复模式开放重命名。 */
export function getRepairableEntryIndexes(entries: readonly EntryPoint[]): Set<number> {
  const normalizedIds = entries.map((entry) => entry.id.trim())
  const counts = new Map<string, number>()
  for (const id of normalizedIds) {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return new Set(
    entries.flatMap((entry, index) => {
      const normalized = normalizedIds[index]!
      return !normalized || entry.id !== normalized || counts.get(normalized) !== 1 ? [index] : []
    }),
  )
}

/** 入口点本地不变式；保存前和问题面板共用。 */
export function validateManifestEntryPoints(
  manifest: ManifestLike,
  scenes: readonly SceneDef[],
): ProjectIssue[] {
  const issues: ProjectIssue[] = []
  const sceneIds = new Set(scenes.map((scene) => scene.id))
  if (!manifest.entryPoints.some((entry) => entry.id === manifest.defaultEntryId)) {
    issues.push({
      severity: 'error',
      code: 'missing-default-entry',
      message: `直接启动入口 "${manifest.defaultEntryId}" 不存在`,
      path: 'defaultEntryId',
      target: { module: 'project', page: 'entrypoint' },
    })
  }

  if (manifest.entryPoints.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-entry-points',
      message: '显式入口点列表不能为空，至少保留一个入口',
      path: 'entryPoints',
      target: { module: 'project', page: 'entrypoint' },
    })
  }

  const entries = manifest.entryPoints
  const idCounts = new Map<string, number>()
  for (const entry of entries) {
    const id = typeof entry.id === 'string' ? entry.id.trim() : ''
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
  }
  const seen = new Set<string>()
  for (const [index, entry] of entries.entries()) {
    const path = `entryPoints[${index}]`
    const id = typeof entry.id === 'string' ? entry.id.trim() : ''
    if (!id) {
      issues.push({
        severity: 'error',
        code: 'blank-entry-id',
        message: '入口点 id 不能为空',
        path: `${path}.id`,
        target: { module: 'project', page: 'entrypoint' },
      })
    } else if (entry.id !== id) {
      issues.push({
        severity: 'error',
        code: 'noncanonical-entry-id',
        message: `入口点 id "${entry.id}" 不得包含首尾空格`,
        path: `${path}.id`,
        target: { module: 'project', page: 'entrypoint' },
      })
    } else if (seen.has(id)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-entry-id',
        message: `入口点 id "${id}" 重复`,
        path: `${path}.id`,
        // 重复 id 不是稳定身份，不能伪造一个会同时命中多条的对象深链。
        target: { module: 'project', page: 'entrypoint' },
      })
    }
    seen.add(id)
    if (!sceneIds.has(entry.scene)) {
      issues.push({
        severity: 'error',
        code: 'missing-entry-point-scene',
        message: `入口点 "${id || `#${index}`}" 指向不存在的场景 "${entry.scene}"`,
        path: `${path}.scene`,
        target: {
          module: 'project',
          page: 'entrypoint',
          ...(id && entry.id === id && idCounts.get(id) === 1 ? { objectId: id } : {}),
        },
      })
    }
  }
  return issues
}

function validateSeedStats(
  startWorld: StartWorld,
  pathPrefix: string,
  target: ProjectIssue['target'] = { module: 'project', page: 'entrypoint' },
): ProjectIssue[] {
  const issues: ProjectIssue[] = []
  for (const [actorId, stats] of Object.entries(startWorld.seedStats ?? {})) {
    for (const key of ['hp', 'mp'] as const) {
      const value = stats?.[key]
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        issues.push({
          severity: 'error',
          code: 'invalid-start-world',
          message: `角色 “${actorId}”的开局当前 ${key.toUpperCase()} 必须是非负整数`,
          path: `${pathPrefix}.seedStats.${actorId}.${key}`,
          target,
        })
      }
    }
  }
  return issues
}

function validateStartWorldResourceIssues(
  startWorld: StartWorld,
  pathPrefix: string,
  target: ProjectIssue['target'] = { module: 'project', page: 'entrypoint' },
): ProjectIssue[] {
  try {
    validateStartWorldResources(startWorld, pathPrefix)
    return []
  } catch (error) {
    return [
      {
        severity: 'error',
        code: 'invalid-start-world',
        message: error instanceof Error ? error.message : String(error),
        path: `${pathPrefix}.resources`,
        target,
      },
    ]
  }
}

function validateStartWorldUniqueness(
  startWorld: StartWorld,
  pathPrefix: string,
  target: ProjectIssue['target'] = { module: 'project', page: 'entrypoint' },
): ProjectIssue[] {
  const issues: ProjectIssue[] = []
  const partySeen = new Set<string>()
  for (const [index, actorId] of startWorld.party.entries()) {
    if (partySeen.has(actorId)) {
      issues.push({
        severity: 'error',
        code: 'invalid-start-world',
        message: `初始队伍角色 "${actorId}" 重复`,
        path: `${pathPrefix}.party[${index}]`,
        target,
      })
    }
    partySeen.add(actorId)
  }

  const itemSeen = new Set<string>()
  for (const [index, entry] of startWorld.inventory.entries()) {
    if (itemSeen.has(entry.itemId)) {
      issues.push({
        severity: 'error',
        code: 'invalid-start-world',
        message: `初始道具 "${entry.itemId}" 重复，请合并数量`,
        path: `${pathPrefix}.inventory[${index}].itemId`,
        target,
      })
    }
    itemSeen.add(entry.itemId)
  }

  return issues
}

interface EditorDiagnosticScan {
  referenceIssues: readonly Issue[]
  assetSnapshot: EditorAssetReferenceSnapshot
  assetDiagnostics: readonly EditorAssetDiagnostic[]
}

/** 项目页问题汇总；scanner 已由同一 revision 的 orchestrator 统一执行。 */
function collectProjectIssuesFromScan(
  state: EditorState,
  scan: EditorDiagnosticScan,
): ProjectIssue[] {
  const issues = validateManifestEntryPoints(state.manifest, state.scenes)
  for (const key of Object.keys(state.manifest)) {
    if (Object.hasOwn(CURRENT_MANIFEST_TOP_LEVEL_KEYS, key)) continue
    issues.push({
      severity: 'warn',
      code: 'unknown-manifest-field',
      message: `项目配置包含当前规范未登记的顶层字段 “${key}”`,
      path: key,
    })
  }
  let catalogValid = true
  try {
    validateAuthorItems(state.items)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const itemIndex = Number(/^items\[(\d+)\]/.exec(message)?.[1])
    const item = Number.isInteger(itemIndex) ? state.items[itemIndex] : undefined
    issues.push({
      severity: 'error',
      code: 'invalid-item-data',
      message,
      path: Number.isInteger(itemIndex) ? `items[${itemIndex}]` : 'items',
      target: {
        module: 'item',
        page: 'item',
        ...(item ? { objectId: item.id } : {}),
      },
    })
  }
  const entries = state.manifest.entryPoints
  const entryIdCounts = new Map<string, number>()
  for (const entry of entries) {
    const id = entry.id.trim()
    if (id) entryIdCounts.set(id, (entryIdCounts.get(id) ?? 0) + 1)
  }
  for (const [index, entry] of entries.entries()) {
    const normalizedId = entry.id.trim()
    const target: ProjectIssue['target'] = {
      module: 'project',
      page: 'entrypoint',
      ...(normalizedId && normalizedId === entry.id && entryIdCounts.get(normalizedId) === 1
        ? { objectId: normalizedId }
        : {}),
    }
    const pathPrefix = `entryPoints[${index}].startWorld`
    issues.push(
      ...validateSeedStats(entry.startWorld, pathPrefix, target),
      ...validateStartWorldUniqueness(entry.startWorld, pathPrefix, target),
      ...validateStartWorldResourceIssues(entry.startWorld, pathPrefix, target),
    )
  }
  for (const issue of scan.referenceIssues)
    if (issue.where.startsWith('entryPoints[')) {
      const entry = entries.find(
        (candidate) =>
          entryIdCounts.get(candidate.id) === 1 &&
          issue.where.startsWith(`entryPoints[${candidate.id}].`),
      )
      issues.push({
        severity: issue.severity,
        code: 'invalid-start-world',
        message: issue.message,
        path: issue.where,
        target: {
          module: 'project',
          page: 'entrypoint',
          ...(entry ? { objectId: entry.id } : {}),
        },
      })
    }

  try {
    validateAssetCatalog(state.assetCatalog)
  } catch (error) {
    catalogValid = false
    issues.push({
      severity: 'error',
      code: 'asset-catalog-invalid',
      message: error instanceof Error ? error.message : String(error),
      path: 'assets/index.json',
      target: { module: 'project', page: 'advanced' },
    })
  }

  try {
    validateManifestAssetConfig(state.manifest.assets, state.assetCatalog)
  } catch (error) {
    issues.push({
      severity: 'error',
      code: 'manifest-assets-invalid',
      message: error instanceof Error ? error.message : String(error),
      path: 'assets',
      target: { module: 'project', page: 'startup' },
    })
  }

  // 调用统一引用收集器 + closure validator，确保诊断覆盖脚本/场景/敌人引用；本页只展示摘要。
  for (const closure of catalogValid ? scan.assetDiagnostics : []) {
    const reference = closure.reference
    const isIntro =
      reference?.site.startsWith('entryPoint:') ?? closure.where.includes('introVideo')
    const isRole = reference?.site.startsWith('manifest.assets.roles.') ?? false
    const assetRole = isRole
      ? ASSET_ROLES.find((role) => reference?.site === `manifest.assets.roles.${role}`)
      : undefined
    const isUnused = closure.code === 'unused-asset'
    const code: ProjectIssueCode = isUnused
      ? 'unused-asset'
      : closure.code === 'kind-mismatch'
        ? isIntro
          ? 'intro-video-kind-mismatch'
          : isRole
            ? 'role-kind-mismatch'
            : 'asset-kind-mismatch'
        : isIntro
          ? 'missing-intro-video'
          : isRole
            ? 'missing-role-asset'
            : 'missing-asset'
    const assetId = closure.assetId
    const entryId =
      reference?.site.startsWith('entryPoint:') && reference.site.endsWith(':introVideo')
        ? reference.site.slice('entryPoint:'.length, -':introVideo'.length)
        : undefined
    const expectedKind = closure.expectedKind
    const spriteDefinitionIndex = reference
      ? /^sprites\[(\d+)\]\.asset$/.exec(reference.where)?.[1]
      : undefined
    const spriteDefinitionId =
      spriteDefinitionIndex === undefined
        ? undefined
        : state.sprites[Number(spriteDefinitionIndex)]?.id
    const battleSpriteDefinitionIndex = reference
      ? /^battleSprites\[(\d+)\]\.asset$/.exec(reference.where)?.[1]
      : undefined
    const battleSpriteDefinitionId =
      battleSpriteDefinitionIndex === undefined
        ? undefined
        : state.battleSprites[Number(battleSpriteDefinitionIndex)]?.id
    const actualKind = closure.actualKind
    const targetKind = actualKind ?? expectedKind
    const assetPage =
      targetKind === 'music'
        ? 'music'
        : targetKind === 'sound'
          ? 'sound'
          : targetKind === 'sprite'
            ? 'sprite'
            : targetKind === 'battle-sprite'
              ? 'sprite'
              : targetKind === 'portrait' ||
                  targetKind === 'face' ||
                  targetKind === 'item-icon' ||
                  targetKind === 'battle-background'
                ? 'image'
                : targetKind === 'video' || targetKind === 'frame-animation'
                  ? 'cutscene'
                  : undefined
    issues.push({
      severity: closure.severity,
      code,
      message: closure.title,
      path: reference?.site ?? closure.where,
      ...(assetId
        ? {
            asset: {
              id: assetId,
              ...(expectedKind ? { expectedKind } : {}),
              ...(actualKind ? { actualKind } : {}),
            },
          }
        : {}),
      ...(assetRole ? { assetRole } : {}),
      target: isIntro
        ? { module: 'project', page: 'entrypoint', ...(entryId ? { objectId: entryId } : {}) }
        : isRole
          ? { module: 'project', page: 'startup' }
          : battleSpriteDefinitionId
            ? {
                module: 'asset',
                page: 'sprite',
                objectId: battleSpriteDefinitionId,
                domain: 'battle',
                view: 'definition',
              }
            : spriteDefinitionId
              ? {
                  module: 'asset',
                  page: 'sprite',
                  objectId: spriteDefinitionId,
                  domain: 'world',
                  view: 'definition',
                }
              : assetId && assetPage
                ? {
                    module: 'asset',
                    page: assetPage,
                    objectId: assetId,
                    ...(targetKind === 'battle-sprite'
                      ? { domain: 'battle' as const, view: 'asset' as const }
                      : targetKind === 'sprite'
                        ? { domain: 'world' as const, view: 'asset' as const }
                        : {}),
                  }
                : { module: 'project', page: 'advanced' },
    })
  }

  for (const [index, diagnostic] of (state.migrationDiagnostics?.diagnostics ?? []).entries()) {
    const item = state.items.find((candidate) => candidate.id === diagnostic.target.objectId)
    if (item?.[diagnostic.target.capability]) continue
    issues.push({
      severity: 'warn',
      code: 'migration-pending',
      message: `${diagnostic.target.label}的${diagnostic.target.capability}能力尚待迁移：${diagnostic.reason}（来源 ${diagnostic.source.label}）`,
      path: `migrationDiagnostics.diagnostics[${index}]`,
      target: {
        module: 'item',
        page: 'item',
        objectId: diagnostic.target.objectId,
      },
    })
  }

  // 去掉 collector 与 manifest 角色/入口点专门检查造成的重复行。
  const unique = new Map<string, ProjectIssue>()
  for (const issue of issues) unique.set(`${issue.code}:${issue.path}:${issue.message}`, issue)
  return [...unique.values()]
}

/**
 * 编辑器底部状态条的统一诊断摘要。
 *
 * `validateReferences` 仍是内容域跨表引用的唯一校验器；项目聚合器额外覆盖
 * manifest、资产闭包和入口不变式。这里仅合并两者，不把项目页的展示问题列表
 * 伪装成新的扫描器，也不重复计数 startWorld（项目聚合器已经负责这部分）。
 */
export interface EditorStatusIssue {
  severity: ProjectIssueSeverity
  message: string
  path: string
  target?: ProjectIssue['target']
}

function runtimeItemScriptProjectionPaths(state: EditorState): Set<string> {
  const paths = new Set<string>()
  for (const [itemIndex, item] of state.items.entries()) {
    for (const [effectIndex, effect] of (item.use?.effects ?? []).entries()) {
      if (effect.kind === 'runScript' && isRuntimeScriptRef(effect.script))
        paths.add(`items[${itemIndex}](${item.id}).use.effects[${effectIndex}].script`)
    }
  }
  return paths
}

function collectEditorStatusIssuesFromScan(
  state: EditorState,
  canonical: ScriptEditorState | undefined,
  referenceIssues: readonly Issue[],
  projectIssues: readonly ProjectIssue[],
  scriptReferenceIssues: readonly ScriptReferenceIssue[],
  worldVariableReferences: WorldVariableReferenceIndexV1,
  entityAddressReferences: readonly EntityAddressReference[],
): EditorStatusIssue[] {
  const projectedItemScriptPaths = canonical
    ? runtimeItemScriptProjectionPaths(state)
    : new Set<string>()
  const contentIssues: EditorStatusIssue[] = referenceIssues
    .filter((issue) => !issue.where.startsWith('entryPoints['))
    .filter((issue) => !projectedItemScriptPaths.has(issue.where))
    .map((issue) => ({
      severity: issue.severity,
      message: issue.message,
      path: issue.where,
    }))
  const canonicalScriptIssues: EditorStatusIssue[] = canonical ? [...scriptReferenceIssues] : []
  const worldVariableIssues: EditorStatusIssue[] = collectWorldVariableRegistryIssuesV1(
    state.worldVariables ?? {},
    worldVariableReferences,
  ).map((issue) => ({ severity: 'error', message: issue.message, path: issue.path }))
  const entityAddressIssues: EditorStatusIssue[] = missingEntityAddressReferencesFrom(
    state.scenes,
    entityAddressReferences,
  ).map((reference) => ({
    severity: 'error',
    message: `实体 "${reference.sceneId}/${reference.entityId}" 不在 scenes`,
    path: reference.path,
  }))
  const projectStatusIssues: EditorStatusIssue[] = projectIssues.map((issue) => ({
    severity: issue.severity,
    message: issue.message,
    path: issue.path,
    ...(issue.target ? { target: issue.target } : {}),
  }))
  const battleFieldIssues: EditorStatusIssue[] =
    (state.manifest.content.battleFields !== undefined || (state.battleFields?.length ?? 0) > 0) &&
    !(state.battleFields ?? []).some((field) => field.id === 24)
      ? [
          {
            severity: 'warn',
            message: '项目默认战场 #24 缺失；未显式指定战场的战斗会回落到黑底。',
            path: 'battleFields[24]',
          },
        ]
      : []
  const unique = new Map<string, EditorStatusIssue>()
  for (const issue of [
    ...contentIssues,
    ...canonicalScriptIssues,
    ...worldVariableIssues,
    ...entityAddressIssues,
    ...projectStatusIssues,
    ...battleFieldIssues,
  ]) {
    unique.set(`${issue.severity}:${issue.path}:${issue.message}`, issue)
  }
  return [...unique.values()]
}

export interface EditorDiagnosticsSnapshot {
  statusIssues: EditorStatusIssue[]
  projectIssues: ProjectIssue[]
  assetSnapshot: EditorAssetReferenceSnapshot
  assetDiagnostics: EditorAssetDiagnostic[]
  entityAddressReferences: EntityAddressReference[]
  actorReferenceIndex: Map<string, ActorReference[]>
  itemReferenceIndex: Map<string, ItemReference[]>
  poisonReferenceIndex: Map<string, BattleDataReference[]>
  worldVariableReferences: WorldVariableReferenceIndexV1
  sceneEntryReferenceIndex: Map<string, SceneEntryReferenceEntry[]>
  canonicalSchemeReferenceIndexes: CanonicalSchemeReferenceIndexes
}

export interface EditorDiagnosticsDependencies {
  validateReferences: typeof validateReferences
  projectCurrentAuthorReferenceSlices: typeof projectCurrentAuthorReferenceSlices
  collectEditorAssetReferenceSnapshotFromSlices: typeof collectEditorAssetReferenceSnapshotFromSlices
  collectEditorAssetDiagnostics: typeof collectEditorAssetDiagnostics
  collectCanonicalScriptCommandVisits: typeof collectCanonicalScriptCommandVisits
  collectScriptReferenceIssuesFromVisits: typeof collectScriptReferenceIssuesFromVisits
  collectWorldVariableReferencesV1FromVisits: typeof collectWorldVariableReferencesV1FromVisits
  collectEntityAddressReferences: typeof collectEntityAddressReferences
  buildCanonicalSceneEntryReferenceIndexFromVisits: typeof buildCanonicalSceneEntryReferenceIndexFromVisits
  buildCanonicalSchemeReferenceIndexesFromVisits: typeof buildCanonicalSchemeReferenceIndexesFromVisits
  blockingActorReferenceMap: typeof blockingActorReferenceMap
  itemReferenceMap: typeof itemReferenceMap
  blockingPoisonReferenceMap: typeof blockingPoisonReferenceMap
}

/**
 * The only full diagnostics orchestrator for one editor revision. Content validation, current
 * author projection and asset collection each run once; status and project consumers share it.
 */
export function createEditorDiagnosticsSnapshotCollector(
  overrides: Partial<EditorDiagnosticsDependencies> = {},
): (state: EditorState, canonical?: ScriptEditorState) => EditorDiagnosticsSnapshot {
  const dependencies: EditorDiagnosticsDependencies = {
    validateReferences,
    projectCurrentAuthorReferenceSlices,
    collectEditorAssetReferenceSnapshotFromSlices,
    collectEditorAssetDiagnostics,
    collectCanonicalScriptCommandVisits,
    collectScriptReferenceIssuesFromVisits,
    collectWorldVariableReferencesV1FromVisits,
    collectEntityAddressReferences,
    buildCanonicalSceneEntryReferenceIndexFromVisits,
    buildCanonicalSchemeReferenceIndexesFromVisits,
    blockingActorReferenceMap,
    itemReferenceMap,
    blockingPoisonReferenceMap,
    ...overrides,
  }
  return (state, canonical) => {
    const author = canonical
      ? dependencies.projectCurrentAuthorReferenceSlices(canonical, state)
      : state
    const currentAuthorState: EditorState = {
      ...state,
      scenes: author.scenes as EditorState['scenes'],
      items: author.items as EditorState['items'],
      sharedScripts: author.sharedScripts as EditorState['sharedScripts'],
    }
    const scriptState: ScriptEditorState = canonical
      ? scriptEditorStateFromCurrentAuthorSlices(canonical, author)
      : worldVariableScriptStateFromEditorStateV1(currentAuthorState)
    const referenceIssues = dependencies.validateReferences({
      ...currentAuthorState,
      entryPoints: currentAuthorState.manifest.entryPoints,
    })
    const commandVisits: CanonicalScriptCommandVisit[] =
      dependencies.collectCanonicalScriptCommandVisits(scriptState)
    const assetSnapshot = dependencies.collectEditorAssetReferenceSnapshotFromSlices(
      currentAuthorState,
      author,
    )
    const assetDiagnostics = dependencies.collectEditorAssetDiagnostics(
      currentAuthorState.assetCatalog,
      assetSnapshot.references,
    )
    const entityAddressReferences = dependencies.collectEntityAddressReferences(currentAuthorState)
    const scriptReferenceIssues = canonical
      ? dependencies.collectScriptReferenceIssuesFromVisits(scriptState, commandVisits)
      : []
    const worldVariableReferences = dependencies.collectWorldVariableReferencesV1FromVisits(
      scriptState,
      commandVisits,
    )
    const sceneEntryReferenceIndex = canonical
      ? dependencies.buildCanonicalSceneEntryReferenceIndexFromVisits(scriptState, commandVisits)
      : new Map<string, SceneEntryReferenceEntry[]>()
    const canonicalSchemeReferenceIndexes = canonical
      ? dependencies.buildCanonicalSchemeReferenceIndexesFromVisits(scriptState, commandVisits)
      : { behavior: new Map(), sceneHook: new Map() }
    const actorReferenceIndex = dependencies.blockingActorReferenceMap(currentAuthorState)
    const itemReferenceIndex = dependencies.itemReferenceMap(
      currentAuthorState,
      canonical ? scriptState : undefined,
    )
    const poisonReferenceIndex = dependencies.blockingPoisonReferenceMap(currentAuthorState)
    const scan = { referenceIssues, assetSnapshot, assetDiagnostics }
    const projectIssues = collectProjectIssuesFromScan(currentAuthorState, scan)
    const statusIssues = collectEditorStatusIssuesFromScan(
      currentAuthorState,
      canonical ? scriptState : undefined,
      referenceIssues,
      projectIssues,
      scriptReferenceIssues,
      worldVariableReferences,
      entityAddressReferences,
    )
    return {
      statusIssues,
      projectIssues,
      assetSnapshot,
      assetDiagnostics,
      entityAddressReferences,
      actorReferenceIndex,
      itemReferenceIndex,
      poisonReferenceIndex,
      worldVariableReferences,
      sceneEntryReferenceIndex,
      canonicalSchemeReferenceIndexes,
    }
  }
}

const collectCombinedEditorDiagnostics = createEditorDiagnosticsSnapshotCollector()

export function collectEditorDiagnosticsSnapshot(
  state: EditorState,
  canonical?: ScriptEditorState,
): EditorDiagnosticsSnapshot {
  return collectCombinedEditorDiagnostics(state, canonical)
}

/** Compatibility wrapper for synchronous save/actions and focused pure-function tests. */
export function collectProjectIssues(
  state: EditorState,
  currentAuthor?: ScriptEditorState,
): ProjectIssue[] {
  return collectEditorDiagnosticsSnapshot(state, currentAuthor).projectIssues
}

/** Compatibility wrapper for synchronous save/actions and focused pure-function tests. */
export function collectEditorStatusIssues(
  state: EditorState,
  canonical?: ScriptEditorState,
): EditorStatusIssue[] {
  return collectEditorDiagnosticsSnapshot(state, canonical).statusIssues
}

function sameWorldVariableDiagnosticShape(
  left: EditorState['worldVariables'],
  right: EditorState['worldVariables'],
): boolean {
  if (left === right) return true
  const leftEntries = Object.entries(left ?? {})
  if (leftEntries.length !== Object.keys(right ?? {}).length) return false
  return leftEntries.every(([id, definition]) => right?.[id]?.kind === definition.kind)
}

/**
 * Component-local status collector cache. Author-only world-variable metadata cannot affect any
 * status diagnostic, so those edits reuse the previous result; every other immutable state slice,
 * variable id/kind change, and canonical script change invalidates it.
 */
export function createEditorStatusIssueCollector(): (
  state: EditorState,
  canonical?: ScriptEditorState,
) => EditorStatusIssue[] {
  let previousState: EditorState | undefined
  let previousCanonical: ScriptEditorState | undefined
  let previousIssues: EditorStatusIssue[] | undefined
  return (state, canonical) => {
    const left = previousState as unknown as Record<string, unknown> | undefined
    const right = state as unknown as Record<string, unknown>
    const leftKeys = left ? Object.keys(left) : []
    const rightKeys = Object.keys(right)
    const sameOtherSlices =
      left !== undefined &&
      leftKeys.length === rightKeys.length &&
      rightKeys.every((key) => key === 'worldVariables' || left[key] === right[key])
    if (
      previousIssues &&
      previousCanonical === canonical &&
      sameOtherSlices &&
      sameWorldVariableDiagnosticShape(previousState?.worldVariables, state.worldVariables)
    )
      return previousIssues
    previousState = state
    previousCanonical = canonical
    previousIssues = collectEditorStatusIssues(state, canonical)
    return previousIssues
  }
}

/** serializeProject 的 G2 保存门；入口点、角色配置和现有资产引用共用既有 validator。 */
export function assertProjectSaveValid(state: EditorState): void {
  const errors = validateManifestEntryPoints(state.manifest, state.scenes).filter(
    (issue) => issue.severity === 'error',
  )
  if (errors.length) throw new Error(`保存前项目校验失败：${errors[0]!.message}`)
  if (state.manifest.content.battleFields !== undefined || state.battleFields !== undefined) {
    try {
      validateBattleFields(state.battleFields ?? [])
    } catch (error) {
      throw new Error(
        `保存前战场数据校验失败：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  const validateSection = (label: string, validate: () => void): void => {
    try {
      validate()
    } catch (error) {
      throw new Error(
        `保存前${label}校验失败：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  validateSection('世界变量', () => {
    if (!state.manifest.content.worldVariables)
      throw new Error('manifest 缺 worldVariables 注册表路径')
    validateWorldVariableRegistryV1(state.worldVariables ?? {})
  })
  validateSection('场景数据', () => validateAuthorScenes(state.scenes))
  validateSection('物品数据', () => validateAuthorItems(state.items))
  validateSection('敌人数据', () => validateAuthorEnemies(state.enemies ?? []))
  const sharedScripts = state.sharedScripts ?? {}
  validateSection('共享脚本', () => validateAuthorSharedScripts(sharedScripts))
  validateSection('对话身份', () =>
    validateAuthorDialogueReferences({
      scenes: state.scenes as never,
      items: state.items as never,
      sharedScripts: sharedScripts as never,
      enemies: (state.enemies ?? []) as never,
      actors: state.actors,
    }),
  )
  const currentScriptState = worldVariableScriptStateFromEditorStateV1(state)
  const currentCommandVisits = collectCanonicalScriptCommandVisits(currentScriptState)
  const scriptReferenceIssue = collectScriptReferenceIssuesFromVisits(
    currentScriptState,
    currentCommandVisits,
  )[0]
  if (scriptReferenceIssue)
    throw new Error(
      `保存前脚本引用校验失败：${scriptReferenceIssue.path}: ${scriptReferenceIssue.message}`,
    )
  const missingEntityAddress = collectMissingEntityAddressReferences(state)[0]
  if (missingEntityAddress)
    throw new Error(
      '保存前实体引用校验失败：' +
        missingEntityAddress.path +
        ' 指向不存在的实体 "' +
        missingEntityAddress.sceneId +
        '/' +
        missingEntityAddress.entityId +
        '"',
    )
  const variableIssue = collectWorldVariableRegistryIssuesV1(
    state.worldVariables ?? {},
    collectWorldVariableReferencesV1FromVisits(currentScriptState, currentCommandVisits),
  )[0]
  if (variableIssue)
    throw new Error(`保存前世界变量校验失败：${variableIssue.path}: ${variableIssue.message}`)

  const startWorldInvariantErrors = state.manifest.entryPoints.flatMap((entry, index) => [
    ...validateSeedStats(entry.startWorld, `entryPoints[${index}].startWorld`),
    ...validateStartWorldUniqueness(entry.startWorld, `entryPoints[${index}].startWorld`),
    ...validateStartWorldResourceIssues(entry.startWorld, `entryPoints[${index}].startWorld`),
  ])
  if (startWorldInvariantErrors.length)
    throw new Error(`保存前开局数据校验失败：${startWorldInvariantErrors[0]!.message}`)
  const referenceErrors = validateReferences({
    ...state,
    entryPoints: state.manifest.entryPoints,
  }).filter((issue) => issue.severity === 'error')
  if (referenceErrors.length)
    throw new Error(`保存前内容引用校验失败：${referenceErrors[0]!.message}`)

  try {
    validateAssetCatalog(state.assetCatalog)
  } catch (error) {
    throw new Error(
      `保存前资源注册表校验失败：${error instanceof Error ? error.message : String(error)}`,
    )
  }
  try {
    validateManifestAssetConfig(state.manifest.assets, state.assetCatalog)
  } catch (error) {
    throw new Error(
      `保存前资源角色校验失败：${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const references = collectEditorAssetReferences(state)
  const closureErrors = collectEditorAssetDiagnostics(state.assetCatalog, references).filter(
    (issue) => issue.severity === 'error',
  )
  if (closureErrors.length) throw new Error(`保存前资源引用校验失败：${closureErrors[0]!.title}`)
}
