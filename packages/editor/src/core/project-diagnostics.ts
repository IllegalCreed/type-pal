/**
 * 工程工作台共用诊断。
 *
 * 这里不建立第二套资产扫描器：资产引用统一来自 content 的
 * `collectAssetReferences`，入口点的 scene/id/数量约束是 manifest 本地不变式。
 * UI、保存前校验和测试都消费同一组纯函数。
 */
import {
  ACTOR_REFERENCE_POLICIES,
  type CurrentManifest,
  type EntryPoint,
  type SceneDef,
  validateAssetCatalog,
  validateAssetReferenceClosure,
  validateBattleFields,
  validateAuthorDialogueReferences,
  validateAuthorEnemies,
  validateAuthorItems,
  validateManifestAssetConfig,
  validateReferences,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateStartWorldResources,
  validateWorldVariableRegistryV1,
} from '@type-pal/content'
import { isRuntimeScriptRef } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'
import { collectEditorAssetReferences } from './editor-asset-references.js'
import { collectMissingEntityAddressReferences } from './entity-address-references.js'
import { collectScriptReferenceIssues, type ScriptEditorState } from './script-editor.js'
import {
  collectWorldVariableReferencesV1,
  collectWorldVariableRegistryIssuesV1,
  worldVariableScriptStateFromEditorStateV1,
} from './world-variable-references.js'

export type ProjectIssueSeverity = 'error' | 'warn'

export type ProjectIssueCode =
  | 'missing-entry-scene'
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

export type ManifestLike = CurrentManifest

export interface ProjectIssue {
  severity: ProjectIssueSeverity
  code: ProjectIssueCode
  message: string
  path: string
  /** 深链接目标；只提供稳定 id，不把数组位置作为身份。 */
  target?: {
    module: 'scene' | 'asset' | 'item' | 'project'
    page: string
    objectId?: string
    domain?: 'world' | 'battle'
    view?: 'definition' | 'asset'
  }
}

/** 缺省 entryPoints 只在 UI/runtime 中合成，绝不直接写回 manifest。 */
export function resolveProjectEntryPoints(manifest: ManifestLike): EntryPoint[] {
  return manifest.entryPoints ?? [{ id: 'new-game', label: '开始游戏', scene: manifest.entryScene }]
}

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
  if (!sceneIds.has(manifest.entryScene)) {
    issues.push({
      severity: 'error',
      code: 'missing-entry-scene',
      message: `默认入口场景 "${manifest.entryScene}" 不存在`,
      path: 'entryScene',
      target: { module: 'project', page: 'entrypoint' },
    })
  }

  if (manifest.entryPoints && manifest.entryPoints.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-entry-points',
      message: '显式入口点列表不能为空，至少保留一个入口',
      path: 'entryPoints',
      target: { module: 'project', page: 'entrypoint' },
    })
  }

  const entries = resolveProjectEntryPoints(manifest)
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
    if (!sceneIds.has(entry.scene) && manifest.entryPoints !== undefined) {
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
  startWorld: CurrentManifest['startWorld'],
  actors: readonly { id: string }[],
  pathPrefix: string,
  target: ProjectIssue['target'] = { module: 'project', page: 'entrypoint' },
): ProjectIssue[] {
  const issues: ProjectIssue[] = []
  const actorIds = new Set(actors.map((actor) => actor.id))
  const actorReferencePolicy =
    ACTOR_REFERENCE_POLICIES[
      pathPrefix.startsWith('entryPoints[') ? 'entry-point-seed-stats' : 'manifest-seed-stats'
    ]
  for (const [actorId, stats] of Object.entries(startWorld.seedStats ?? {})) {
    if (!actorIds.has(actorId)) {
      issues.push({
        severity: actorReferencePolicy.danglingSeverity,
        code: 'invalid-start-world',
        message: `${actorReferencePolicy.label}角色 "${actorId}" 不在 actors 表`,
        path: `${pathPrefix}.seedStats.${actorId}`,
        target,
      })
    }
    for (const key of ['hp', 'mp'] as const) {
      const value = stats?.[key]
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        issues.push({
          severity: 'error',
          code: 'invalid-start-world',
          message: `seedStats.${actorId}.${key} 必须是非负整数`,
          path: `${pathPrefix}.seedStats.${actorId}.${key}`,
          target,
        })
      }
    }
  }
  return issues
}

function validateStartWorldResourceIssues(
  startWorld: CurrentManifest['startWorld'],
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
  startWorld: CurrentManifest['startWorld'],
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

  for (const [actorId, skillIds] of Object.entries(startWorld.learnedSkills)) {
    const skillSeen = new Set<string>()
    for (const [index, skillId] of skillIds.entries()) {
      if (skillSeen.has(skillId)) {
        issues.push({
          severity: 'error',
          code: 'invalid-start-world',
          message: `角色 "${actorId}" 的初始技能 "${skillId}" 重复`,
          path: `${pathPrefix}.learnedSkills.${actorId}[${index}]`,
          target,
        })
      }
      skillSeen.add(skillId)
    }
  }
  return issues
}

/** 工程页问题汇总；资产正向引用来自唯一 collector。 */
export function collectProjectIssues(state: EditorState): ProjectIssue[] {
  const issues = validateManifestEntryPoints(state.manifest, state.scenes)
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
  issues.push(...validateSeedStats(state.manifest.startWorld, state.actors, 'startWorld'))
  issues.push(...validateStartWorldUniqueness(state.manifest.startWorld, 'startWorld'))
  issues.push(...validateStartWorldResourceIssues(state.manifest.startWorld, 'startWorld'))
  for (const issue of validateReferences(state)) {
    if (!issue.where.startsWith('startWorld')) continue
    issues.push({
      severity: issue.severity,
      code: 'invalid-start-world',
      message: issue.message,
      path: issue.where,
      target: { module: 'project', page: 'entrypoint' },
    })
  }

  const entries = state.manifest.entryPoints ?? []
  const entryIdCounts = new Map<string, number>()
  for (const entry of entries) {
    const id = entry.id.trim()
    if (id) entryIdCounts.set(id, (entryIdCounts.get(id) ?? 0) + 1)
  }
  for (const [index, entry] of entries.entries()) {
    // 入口点覆盖沿用既有 content 引用校验；这里只改展示路径，不复制校验规则。
    if (entry.startWorld) {
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
        ...validateSeedStats(entry.startWorld, state.actors, pathPrefix, target),
        ...validateStartWorldUniqueness(entry.startWorld, pathPrefix, target),
        ...validateStartWorldResourceIssues(entry.startWorld, pathPrefix, target),
      )
      const overrideIssues = validateReferences({ ...state, startWorld: entry.startWorld })
      for (const issue of overrideIssues) {
        if (!issue.where.startsWith('startWorld')) continue
        issues.push({
          severity: issue.severity,
          code: 'invalid-start-world',
          message: issue.message,
          path: `entryPoints[${index}].${issue.where}`,
          target,
        })
      }
    }
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
  const references = collectEditorAssetReferences(state)
  for (const closure of catalogValid
    ? validateAssetReferenceClosure(state.assetCatalog, references)
    : []) {
    const reference = references.find((candidate) => candidate.where === closure.where)
    const isIntro =
      reference?.site.startsWith('entryPoint:') ?? closure.where.includes('introVideo')
    const isRole = reference?.site.startsWith('manifest.assets.roles.') ?? false
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
    const assetId = reference?.asset ?? /AssetId "([^"]+)"/.exec(closure.message)?.[1]
    const entryId =
      reference?.site.startsWith('entryPoint:') && reference.site.endsWith(':introVideo')
        ? reference.site.slice('entryPoint:'.length, -':introVideo'.length)
        : undefined
    const expectedKind = reference?.expectedKind
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
    const actualKind = assetId ? state.assetCatalog.assets[assetId]?.kind : undefined
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
      message: closure.message,
      path: reference?.site ?? closure.where,
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
 * `validateReferences` 仍是内容域跨表引用的唯一校验器；工程聚合器额外覆盖
 * manifest、资产闭包和入口不变式。这里仅合并两者，不把工程页的展示问题列表
 * 伪装成新的扫描器，也不重复计数 startWorld（工程聚合器已经负责这部分）。
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

export function collectEditorStatusIssues(
  state: EditorState,
  canonical?: ScriptEditorState,
): EditorStatusIssue[] {
  const projectedItemScriptPaths = canonical ? runtimeItemScriptProjectionPaths(state) : new Set<string>()
  const contentIssues: EditorStatusIssue[] = validateReferences(state)
    .filter((issue) => !issue.where.startsWith('startWorld'))
    .filter((issue) => !projectedItemScriptPaths.has(issue.where))
    .map((issue) => ({
      severity: issue.severity,
      message: issue.message,
      path: issue.where,
    }))
  const canonicalScriptIssues: EditorStatusIssue[] = canonical
    ? collectScriptReferenceIssues(canonical)
    : []
  const worldVariableIssues: EditorStatusIssue[] = collectWorldVariableRegistryIssuesV1(
    state.worldVariables ?? {},
    collectWorldVariableReferencesV1(
      canonical ?? worldVariableScriptStateFromEditorStateV1(state),
    ),
  ).map((issue) => ({ severity: 'error', message: issue.message, path: issue.path }))
  const entityAddressIssues: EditorStatusIssue[] = collectMissingEntityAddressReferences(state).map(
    (reference) => ({
      severity: 'error',
      message: '实体 "' + reference.sceneId + '/' + reference.entityId + '" 不在 scenes',
      path: reference.path,
    }),
  )
  const projectIssues: EditorStatusIssue[] = collectProjectIssues(state).map((issue) => ({
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
    ...projectIssues,
    ...battleFieldIssues,
  ]) {
    unique.set(`${issue.severity}:${issue.path}:${issue.message}`, issue)
  }
  return [...unique.values()]
}

/** serializeProject 的 G2 保存门；入口点、角色配置和现有资产引用共用既有 validator。 */
export function assertProjectSaveValid(state: EditorState): void {
  const errors = validateManifestEntryPoints(state.manifest, state.scenes).filter(
    (issue) => issue.severity === 'error',
  )
  if (errors.length) throw new Error(`保存前工程校验失败：${errors[0]!.message}`)
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
      throw new Error(`保存前${label}校验失败：${error instanceof Error ? error.message : String(error)}`)
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
    collectWorldVariableReferencesV1(worldVariableScriptStateFromEditorStateV1(state)),
  )[0]
  if (variableIssue)
    throw new Error(`保存前世界变量校验失败：${variableIssue.path}: ${variableIssue.message}`)

  const referenceErrors = [
    ...validateReferences(state),
    ...Array.from(
      (state.manifest.entryPoints ?? []).flatMap((entry) =>
        entry.startWorld
          ? validateReferences({ ...state, startWorld: entry.startWorld })
              .filter((issue) => issue.where.startsWith('startWorld'))
              .map((issue) => ({
                ...issue,
                where: `entryPoints[${entry.id}].${issue.where}`,
              }))
          : [],
      ),
    ),
  ].filter((issue) => issue.severity === 'error')
  if (referenceErrors.length)
    throw new Error(`保存前内容引用校验失败：${referenceErrors[0]!.message}`)
  const startWorldInvariantErrors = [
    ...validateSeedStats(state.manifest.startWorld, state.actors, 'startWorld'),
    ...validateStartWorldUniqueness(state.manifest.startWorld, 'startWorld'),
    ...validateStartWorldResourceIssues(state.manifest.startWorld, 'startWorld'),
    ...(state.manifest.entryPoints ?? []).flatMap((entry, index) =>
      entry.startWorld
        ? [
            ...validateSeedStats(
              entry.startWorld,
              state.actors,
              `entryPoints[${index}].startWorld`,
            ),
            ...validateStartWorldUniqueness(entry.startWorld, `entryPoints[${index}].startWorld`),
            ...validateStartWorldResourceIssues(
              entry.startWorld,
              `entryPoints[${index}].startWorld`,
            ),
          ]
        : [],
    ),
  ]
  if (startWorldInvariantErrors.length)
    throw new Error(`保存前开局数据校验失败：${startWorldInvariantErrors[0]!.message}`)

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
  const closureErrors = validateAssetReferenceClosure(state.assetCatalog, references).filter(
    (issue) => issue.severity === 'error',
  )
  if (closureErrors.length) throw new Error(`保存前资源引用校验失败：${closureErrors[0]!.message}`)
}
