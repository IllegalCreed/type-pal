import { isDeepStrictEqual } from 'node:util'
import {
  type AuthorCommandV5,
  type EnemyDef,
  type SceneDefV5,
  type ScriptFlowV5,
  validateEnemies,
  validateLocale,
  validateSkills,
} from '@type-pal/content'
import { validateHistoricalScenesForCurrentSchema } from '../../historical-enemy-team-authority.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import {
  assertR13EnemySourceDispositionFromPal,
  buildR13EnemySourceDispositionFromPal,
  type R13EnemySourceDispositionV1,
} from './r13-enemy-source-disposition.js'
import {
  buildAndAssertHistoricalR13_5RuntimeCapabilityAuditV3,
  type R13RuntimeCapabilityAuditV3,
} from './runtime-capability-audit-v3.js'
import { digestR13ContentSnapshot } from './source-instruction-disposition.js'
import { digestRecord, stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST =
  'f4b1a1e8be9a2a902e70e88f838b3fa03e433b97f6f802a86ccac3ee822158a2' as const
/** Published R13-5 enemy successor content. 6A consumes this snapshot as its source parent. */
export const R13_ENEMY_SCRIPT_SUCCESSOR_CONTENT_DIGEST =
  '5750ac4fbaec8cc487be1bdbd88881005d239a7f6a118adba8286643208c2603' as const
export const R13_ENEMY_SCRIPT_PARENT_ENEMIES_DIGEST =
  '28917ea42cb7bc8ca90dcb9268f7c3badbcc3ad1996db9f91d55a33a2ea3a119' as const
export const R13_ENEMY_SCRIPT_CURRENT_ENEMIES_DIGEST =
  'c79b1228171abcd1ab85fa15df29a0be6583688b6b55fcb2dd32f75000b24630' as const
export const R13_ENEMY_SCRIPT_SKILLS_DIGEST =
  '0aabffe36ebe42266904ad3f114252ab051d5a8e244f838f6bd77f83564ef937' as const
export const R13_ENEMY_SCRIPT_HISTORICAL_RAW_LOCALE_DIGEST =
  '68c3bdd2c9de93befd8d7743ac456b2e64d6b5210358cc0f42545678fd7ef5b4' as const
export const R13_ENEMY_SCRIPT_CURRENT_RAW_LOCALE_DIGEST =
  '635de2f13ed6d73cfef77faabd213d3fa49982293d3da2961ca1abdde3ea1c43' as const
export const R13_ENEMY_SCRIPT_PARENT_LOCALE_DIGEST =
  '27527a116033074fed52c937d484bc15a09cb2120b0929dd16eac83ba41ee22d' as const
export const R13_ENEMY_SCRIPT_SUCCESSOR_LOCALE_DIGEST =
  '8247bbb8cbcaf76428a3d94d1935474f505f8eab5094fc400275d67d60952ce1' as const

export const R13_ENEMY_SCRIPT_LOCALE_DELTA = Object.freeze({
  'dlg.13242': '别以为仗着人多就能赢得了我',
  'dlg.13244': '好说．．石老长您虽神功盖世',
  'dlg.13245': '终究要叹岁月不饶人吧',
  'dlg.13247': '哼！　老夫就算敌不过你　',
  'dlg.13248': '也要拼个同归于尽',
})

interface EntityEncounterOwner {
  kind: 'entity'
  sceneId: string
  entityId: string
  channel: 'trigger'
  behaviorId: string
  stateId: string
  team: number
  oldChoreographyDigest: string
}

interface HookEncounterOwner {
  kind: 'hook'
  sceneId: string
  channel: 'onEnter'
  behaviorId: string
  stateId: string
  team: number
  oldChoreographyDigest: string
}

export type R13EnemyEncounterOverlayOracle = EntityEncounterOwner | HookEncounterOwner

export const R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE = Object.freeze([
  {
    kind: 'entity',
    sceneId: 's003',
    entityId: 'e59',
    channel: 'trigger',
    behaviorId: 'legacy-002',
    stateId: 'initial',
    team: 19,
    oldChoreographyDigest: '7ed6335601bcdd5492f209f8d85d7dc2e84d81d18f7c4df511846413e0427e5b',
  },
  {
    kind: 'entity',
    sceneId: 's003',
    entityId: 'e60',
    channel: 'trigger',
    behaviorId: 'legacy-002',
    stateId: 'initial',
    team: 19,
    oldChoreographyDigest: '7ed6335601bcdd5492f209f8d85d7dc2e84d81d18f7c4df511846413e0427e5b',
  },
  {
    kind: 'entity',
    sceneId: 's003',
    entityId: 'e61',
    channel: 'trigger',
    behaviorId: 'legacy-002',
    stateId: 'initial',
    team: 19,
    oldChoreographyDigest: '7ed6335601bcdd5492f209f8d85d7dc2e84d81d18f7c4df511846413e0427e5b',
  },
  {
    kind: 'entity',
    sceneId: 's021',
    entityId: 'e403',
    channel: 'trigger',
    behaviorId: 'legacy-002',
    stateId: 'initial',
    team: 22,
    oldChoreographyDigest: '6b38f3cd81d633e16fd24132e3c8311bad492e2652f9699ba3010dd697a6b264',
  },
  {
    kind: 'entity',
    sceneId: 's086',
    entityId: 'e1629',
    channel: 'trigger',
    behaviorId: 'default',
    stateId: 'initial',
    team: 29,
    oldChoreographyDigest: '6e2a38e400b04ef001e1bf4088a864ca426d65027e19eeded4cea04d6fb9101c',
  },
  {
    kind: 'entity',
    sceneId: 's093',
    entityId: 'e1759',
    channel: 'trigger',
    behaviorId: 'default',
    stateId: 'initial',
    team: 29,
    oldChoreographyDigest: '6e2a38e400b04ef001e1bf4088a864ca426d65027e19eeded4cea04d6fb9101c',
  },
  {
    kind: 'hook',
    sceneId: 's106',
    channel: 'onEnter',
    behaviorId: 'legacy-001',
    stateId: 'initial',
    team: 37,
    oldChoreographyDigest: '710154c55c72ffdf6a8d49bdbb000ecebf4933b53eb9cc68f1e100b974b46b3c',
  },
  {
    kind: 'entity',
    sceneId: 's138',
    entityId: 'e2341',
    channel: 'trigger',
    behaviorId: 'default',
    stateId: 'initial',
    team: 42,
    oldChoreographyDigest: '3da2e14e1a74d9152f99aed9b76d0cc470fd096f8d62964eeac043ddd6ae33d0',
  },
] as const satisfies readonly R13EnemyEncounterOverlayOracle[])

type StartBattleCommand = Extract<AuthorCommandV5, { kind: 'startBattle' }>

export interface R13EnemyEncounterCleanupEvidenceV1 {
  locator: string
  sceneId: string
  team: number
  oldChoreographyDigest: string
  oldCommandDigest: string
  successorCommandDigest: string
}

interface R13EnemyScriptAugmentationEvidenceBodyV1 {
  kind: 'r13-enemy-script-augmentation-evidence'
  version: 1
  projectId: 'pal'
  generator: {
    id: 'r13-enemy-script-augmentation'
    version: 1
  }
  summary: {
    enemies: 153
    resistanceTenEnemies: 30
    localeAdded: 5
    localeDeleted: 0
    localeChanged: 0
    encounterChoreographyRemoved: 8
    changedScenes: 6
    changedFiles: 8
  }
  parentContentDigest: string
  successorContentDigest: string
  files: {
    parentEnemiesDigest: string
    successorEnemiesDigest: string
    skillsDigest: string
    historicalRawLocaleDigest: string
    currentRawLocaleDigest: string
    parentLocaleDigest: string
    successorLocaleDigest: string
    changedPaths: string[]
  }
  localeDelta: Record<string, string>
  encounterCleanup: R13EnemyEncounterCleanupEvidenceV1[]
  audits: {
    enemySourceDispositionDigest: string
    enemySourceDispositionSummary: R13EnemySourceDispositionV1['summary']
    runtimeCapabilityDigest: string
    runtimeCapabilitySummary: R13RuntimeCapabilityAuditV3['summary']
  }
}

export interface R13EnemyScriptAugmentationEvidenceV1
  extends R13EnemyScriptAugmentationEvidenceBodyV1 {
  digest: string
}

export interface R13EnemyScriptAugmentation {
  snapshot: MigrationSnapshot
  evidence: R13EnemyScriptAugmentationEvidenceV1
  enemySourceDisposition: R13EnemySourceDispositionV1
  runtimeCapability: R13RuntimeCapabilityAuditV3
}

export interface PreparedR13EnemyScriptMergedTargetClosure {
  readonly parentContentDigest: typeof R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST
  readonly successorContentDigest: string
  readonly evidenceDigest: string
}

interface PreparedR13EnemyScriptMergedTargetDetails {
  parentEnemies: ReadonlyMap<string, EnemyDef>
  successorEnemies: ReadonlyMap<string, EnemyDef>
  localeDelta: Readonly<Record<string, string>>
}

const preparedMergedTargetDetails = new WeakMap<
  PreparedR13EnemyScriptMergedTargetClosure,
  PreparedR13EnemyScriptMergedTargetDetails
>()

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function asMigrationJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function sceneOf(snapshot: MigrationSnapshot, sceneId: string): SceneDefV5 {
  const value = snapshot.files.get(`content/scenes/${sceneId}.json`)
  const scenes = validateHistoricalScenesForCurrentSchema([value])
  const scene = scenes[0]
  if (!scene || scene.id !== sceneId)
    throw new Error(`R13 enemy augmentation: scene ${sceneId} identity 漂移`)
  return scene
}

function flowBody(flow: ScriptFlowV5, stateId: string, locator: string): AuthorCommandV5[] {
  if (flow.kind === 'stages') {
    const matches = flow.stages.filter((stage) => stage.id === stateId)
    if (matches.length !== 1)
      throw new Error(`R13 enemy augmentation: ${locator} stage ${stateId} 数量=${matches.length}`)
    return matches[0]!.body
  }
  const state = flow.machine.states[stateId]
  if (!state) throw new Error(`R13 enemy augmentation: ${locator} state ${stateId} 不存在`)
  return state.body
}

function locatorOf(spec: R13EnemyEncounterOverlayOracle): string {
  return spec.kind === 'entity'
    ? `entity:${spec.sceneId}:${spec.entityId}:${spec.channel}:${spec.behaviorId}/state:${spec.stateId}/startBattle:team-${spec.team}`
    : `hook:${spec.sceneId}:${spec.channel}:${spec.behaviorId}/state:${spec.stateId}/startBattle:team-${spec.team}`
}

function locateEncounter(
  snapshot: MigrationSnapshot,
  spec: R13EnemyEncounterOverlayOracle,
  expected: 'legacy' | 'successor' = 'legacy',
): { command: StartBattleCommand; locator: string } {
  const locator = locatorOf(spec)
  const scene = sceneOf(snapshot, spec.sceneId)
  let flow: ScriptFlowV5 | undefined
  if (spec.kind === 'entity') {
    const owners = scene.entities.filter((entity) => entity.id === spec.entityId)
    if (owners.length !== 1)
      throw new Error(`R13 enemy augmentation: ${locator} entity 数量=${owners.length}`)
    flow = owners[0]!.behaviors?.[spec.channel]?.[spec.behaviorId]?.flow
  } else {
    flow = scene.hooks?.[spec.channel]?.variants[spec.behaviorId]?.flow
  }
  if (!flow) throw new Error(`R13 enemy augmentation: ${locator} flow 不存在`)
  const matches = flowBody(flow, spec.stateId, locator).filter(
    (command): command is StartBattleCommand =>
      command.kind === 'startBattle' &&
      ((command as unknown as { team?: number }).team === spec.team ||
        command.enemyTeamId === `team-${spec.team}`),
  )
  if (matches.length !== 1)
    throw new Error(`R13 enemy augmentation: ${locator} startBattle 数量=${matches.length}`)
  const command = matches[0]!
  if (expected === 'legacy' && command.boss !== true)
    throw new Error(`R13 enemy augmentation: ${locator} boss 漂移`)
  if (
    expected === 'legacy'
      ? !command.choreography ||
        stableJsonSha256(command.choreography) !== spec.oldChoreographyDigest
      : command.choreography !== undefined
  )
    throw new Error(`R13 enemy augmentation: ${locator} choreography 漂移`)
  return { command, locator }
}

function preflightEncounterCleanup(parent: MigrationSnapshot): Array<{
  spec: R13EnemyEncounterOverlayOracle
  locator: string
  oldCommandDigest: string
}> {
  const locators = new Set<string>()
  const preflight = R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE.map((spec) => {
    const located = locateEncounter(parent, spec)
    if (locators.has(located.locator))
      throw new Error(`R13 enemy augmentation: duplicate locator ${located.locator}`)
    locators.add(located.locator)
    return {
      spec,
      locator: located.locator,
      oldCommandDigest: stableJsonSha256(located.command),
    }
  })
  if (preflight.length !== 8 || new Set(preflight.map(({ spec }) => spec.sceneId)).size !== 6)
    throw new Error('R13 enemy augmentation: encounter cleanup manifest 漂移')
  return preflight
}

function cleanupEncounters(
  snapshot: MigrationSnapshot,
  preflight: ReturnType<typeof preflightEncounterCleanup>,
): R13EnemyEncounterCleanupEvidenceV1[] {
  const clonedScenes = new Set<string>()
  for (const { spec } of preflight) {
    if (clonedScenes.has(spec.sceneId)) continue
    const path = `content/scenes/${spec.sceneId}.json`
    snapshot.files.set(path, asMigrationJson(structuredClone(sceneOf(snapshot, spec.sceneId))))
    clonedScenes.add(spec.sceneId)
  }
  return preflight.map(({ spec, locator, oldCommandDigest }) => {
    const { command } = locateEncounter(snapshot, spec)
    delete command.choreography
    return {
      locator,
      sceneId: spec.sceneId,
      team: spec.team,
      oldChoreographyDigest: spec.oldChoreographyDigest,
      oldCommandDigest,
      successorCommandDigest: stableJsonSha256(command),
    }
  })
}

function exactLocaleDelta(args: {
  historical: Record<string, string>
  current: Record<string, string>
}): Record<string, string> {
  const added = Object.keys(args.current)
    .filter((id) => args.historical[id] === undefined)
    .sort(stableStringCompare)
  const deleted = Object.keys(args.historical)
    .filter((id) => args.current[id] === undefined)
    .sort(stableStringCompare)
  const changed = Object.keys(args.current)
    .filter((id) => args.historical[id] !== undefined && args.current[id] !== args.historical[id])
    .sort(stableStringCompare)
  const expectedIds = Object.keys(R13_ENEMY_SCRIPT_LOCALE_DELTA).sort(stableStringCompare)
  if (!isDeepStrictEqual(added, expectedIds) || deleted.length !== 0 || changed.length !== 0)
    throw new Error(
      `R13 enemy augmentation: raw locale delta 漂移 add=${added.length} ` +
        `delete=${deleted.length} changed=${changed.length}`,
    )
  const delta = Object.fromEntries(added.map((id) => [id, args.current[id]!]))
  if (!isDeepStrictEqual(delta, R13_ENEMY_SCRIPT_LOCALE_DELTA))
    throw new Error('R13 enemy augmentation: raw locale 五键正文漂移')
  return delta
}

function changedPaths(parent: MigrationSnapshot, successor: MigrationSnapshot): string[] {
  if (
    !isDeepStrictEqual(
      [...parent.managedFiles].sort(stableStringCompare),
      [...successor.managedFiles].sort(stableStringCompare),
    ) ||
    !isDeepStrictEqual(
      [...parent.files.keys()].sort(stableStringCompare),
      [...successor.files.keys()].sort(stableStringCompare),
    )
  )
    throw new Error('R13 enemy augmentation: snapshot path 集合漂移')
  return [...parent.files]
    .filter(
      ([path, value]) => stableJsonSha256(value) !== stableJsonSha256(successor.files.get(path)),
    )
    .map(([path]) => path)
    .sort(stableStringCompare)
}

export function assertR13EnemyScriptAugmentationEvidence(
  evidence: R13EnemyScriptAugmentationEvidenceV1,
): void {
  const { digest, ...body } = evidence
  if (stableJsonSha256(body) !== digest)
    throw new Error('R13 enemy augmentation: evidence 自摘要不符')
  const expectedChangedPaths = [
    'content/enemies.json',
    'content/locale.json',
    ...[...new Set(R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE.map((spec) => spec.sceneId))].map(
      (sceneId) => `content/scenes/${sceneId}.json`,
    ),
  ].sort(stableStringCompare)
  if (
    !isDeepStrictEqual(evidence.summary, {
      enemies: 153,
      resistanceTenEnemies: 30,
      localeAdded: 5,
      localeDeleted: 0,
      localeChanged: 0,
      encounterChoreographyRemoved: 8,
      changedScenes: 6,
      changedFiles: 8,
    }) ||
    evidence.parentContentDigest !== R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST ||
    evidence.files.parentEnemiesDigest !== R13_ENEMY_SCRIPT_PARENT_ENEMIES_DIGEST ||
    evidence.files.successorEnemiesDigest !== R13_ENEMY_SCRIPT_CURRENT_ENEMIES_DIGEST ||
    evidence.files.skillsDigest !== R13_ENEMY_SCRIPT_SKILLS_DIGEST ||
    evidence.files.historicalRawLocaleDigest !== R13_ENEMY_SCRIPT_HISTORICAL_RAW_LOCALE_DIGEST ||
    evidence.files.currentRawLocaleDigest !== R13_ENEMY_SCRIPT_CURRENT_RAW_LOCALE_DIGEST ||
    evidence.files.parentLocaleDigest !== R13_ENEMY_SCRIPT_PARENT_LOCALE_DIGEST ||
    evidence.files.successorLocaleDigest !== R13_ENEMY_SCRIPT_SUCCESSOR_LOCALE_DIGEST ||
    !isDeepStrictEqual(evidence.files.changedPaths, expectedChangedPaths) ||
    !isDeepStrictEqual(evidence.localeDelta, R13_ENEMY_SCRIPT_LOCALE_DELTA) ||
    evidence.encounterCleanup.length !== 8 ||
    new Set(evidence.encounterCleanup.map((entry) => entry.locator)).size !== 8 ||
    evidence.encounterCleanup.some(
      (entry, index) =>
        entry.locator !== locatorOf(R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE[index]!) ||
        entry.sceneId !== R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE[index]!.sceneId ||
        entry.team !== R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE[index]!.team ||
        entry.oldChoreographyDigest !==
          R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE[index]!.oldChoreographyDigest ||
        !/^[0-9a-f]{64}$/.test(entry.oldCommandDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.successorCommandDigest) ||
        entry.oldCommandDigest === entry.successorCommandDigest,
    ) ||
    evidence.successorContentDigest !== R13_ENEMY_SCRIPT_SUCCESSOR_CONTENT_DIGEST ||
    !/^[0-9a-f]{64}$/.test(evidence.audits.enemySourceDispositionDigest) ||
    !/^[0-9a-f]{64}$/.test(evidence.audits.runtimeCapabilityDigest) ||
    evidence.audits.enemySourceDispositionSummary.cursorTraceStates !== 25 ||
    evidence.audits.runtimeCapabilitySummary.refusedUses !== 0 ||
    evidence.audits.runtimeCapabilitySummary.openIssues !== 0
  )
    throw new Error('R13 enemy augmentation: evidence payload 漂移')
}

export function assertR13EnemyScriptFinalTargetClosure(
  snapshot: MigrationSnapshot,
  evidence: R13EnemyScriptAugmentationEvidenceV1,
): void {
  assertR13EnemyScriptAugmentationEvidence(evidence)
  if (digestR13ContentSnapshot(snapshot) !== evidence.successorContentDigest)
    throw new Error('R13 enemy augmentation: successor content digest 漂移')
  const enemies = validateEnemies(snapshot.files.get('content/enemies.json'))
  if (
    enemies.length !== 153 ||
    enemies.filter((enemy) => enemy.ai.resistanceToSorcery === 10).length !== 30 ||
    stableJsonSha256(enemies) !== R13_ENEMY_SCRIPT_CURRENT_ENEMIES_DIGEST
  )
    throw new Error('R13 enemy augmentation: final enemies 漂移')
  const skills = validateSkills(snapshot.files.get('content/skills.json'))
  if (stableJsonSha256(skills) !== R13_ENEMY_SCRIPT_SKILLS_DIGEST)
    throw new Error('R13 enemy augmentation: final skills 漂移')
  const locale = validateLocale(snapshot.files.get('content/locale.json'))
  if (
    Object.keys(locale).length !== 9552 ||
    stableJsonSha256(locale) !== R13_ENEMY_SCRIPT_SUCCESSOR_LOCALE_DIGEST ||
    Object.entries(R13_ENEMY_SCRIPT_LOCALE_DELTA).some(([id, text]) => locale[id] !== text)
  )
    throw new Error('R13 enemy augmentation: final locale 漂移')
  for (const [index, spec] of R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE.entries()) {
    const locator = locatorOf(spec)
    const scene = sceneOf(snapshot, spec.sceneId)
    let flow: ScriptFlowV5 | undefined
    if (spec.kind === 'entity')
      flow = scene.entities.find((entity) => entity.id === spec.entityId)?.behaviors?.[
        spec.channel
      ]?.[spec.behaviorId]?.flow
    else flow = scene.hooks?.[spec.channel]?.variants[spec.behaviorId]?.flow
    if (!flow) throw new Error(`R13 enemy augmentation: final ${locator} flow 不存在`)
    const matches = flowBody(flow, spec.stateId, locator).filter(
      (command): command is StartBattleCommand =>
        command.kind === 'startBattle' &&
        ((command as unknown as { team?: number }).team === spec.team ||
          command.enemyTeamId === `team-${spec.team}`),
    )
    const command = matches[0]
    if (
      matches.length !== 1 ||
      !command ||
      command.boss !== true ||
      command.choreography !== undefined ||
      stableJsonSha256(command) !== evidence.encounterCleanup[index]!.successorCommandDigest
    )
      throw new Error(`R13 enemy augmentation: final ${locator} cleanup 漂移`)
  }
}

function indexEnemySnapshot(snapshot: MigrationSnapshot, label: string): Map<string, EnemyDef> {
  const result = new Map<string, EnemyDef>()
  for (const enemy of validateEnemies(snapshot.files.get('content/enemies.json'))) {
    if (result.has(enemy.id))
      throw new Error(`R13 enemy augmentation: ${label} duplicate enemy ${enemy.id}`)
    result.set(enemy.id, structuredClone(enemy))
  }
  return result
}

export function prepareR13EnemyScriptMergedTargetClosure(
  parent: MigrationSnapshot,
  successor: MigrationSnapshot,
  evidence: R13EnemyScriptAugmentationEvidenceV1,
): PreparedR13EnemyScriptMergedTargetClosure {
  if (digestR13ContentSnapshot(parent) !== R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST)
    throw new Error('R13 enemy augmentation: merged closure parent authority 漂移')
  assertR13EnemyScriptFinalTargetClosure(successor, evidence)
  const prepared = Object.freeze({
    parentContentDigest: R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST,
    successorContentDigest: evidence.successorContentDigest,
    evidenceDigest: evidence.digest,
  })
  preparedMergedTargetDetails.set(prepared, {
    parentEnemies: indexEnemySnapshot(parent, 'parent'),
    successorEnemies: indexEnemySnapshot(successor, 'successor'),
    localeDelta: Object.freeze(structuredClone(evidence.localeDelta)),
  })
  return prepared
}

export function assertPreparedR13EnemyScriptMergedTargetClosure(
  prepared: PreparedR13EnemyScriptMergedTargetClosure,
  target: MigrationSnapshot,
): void {
  const details = preparedMergedTargetDetails.get(prepared)
  if (!details) throw new Error('R13 enemy augmentation: prepared merged closure 来源无效')
  const parentEnemies = details.parentEnemies
  const successorEnemies = details.successorEnemies
  const targetEnemies = indexEnemySnapshot(target, 'target')
  const changedFields = new Map<string, number>()
  const changedOwners = new Set<string>()
  const assertField = (
    enemyId: string,
    path: string,
    parentValue: unknown,
    successorValue: unknown,
    targetValue: unknown,
  ): void => {
    if (isDeepStrictEqual(parentValue, successorValue)) return
    if (!isDeepStrictEqual(targetValue, successorValue))
      throw new Error(`R13 enemy augmentation: merged target owned delta 漂移 ${enemyId}.${path}`)
    changedOwners.add(enemyId)
    changedFields.set(path, (changedFields.get(path) ?? 0) + 1)
  }
  for (const [enemyId, successorEnemy] of successorEnemies) {
    const parentEnemy = parentEnemies.get(enemyId)
    const targetEnemy = targetEnemies.get(enemyId)
    if (!parentEnemy) throw new Error(`R13 enemy augmentation: parent 缺 enemy ${enemyId}`)
    const parentRecord = parentEnemy as unknown as Record<string, unknown>
    const successorRecord = successorEnemy as unknown as Record<string, unknown>
    const targetRecord = (targetEnemy ?? {}) as unknown as Record<string, unknown>
    for (const key of new Set([...Object.keys(parentRecord), ...Object.keys(successorRecord)])) {
      if (key === 'ai') continue
      assertField(enemyId, key, parentRecord[key], successorRecord[key], targetRecord[key])
    }
    const parentAi = parentEnemy.ai as unknown as Record<string, unknown>
    const successorAi = successorEnemy.ai as unknown as Record<string, unknown>
    const targetAi = (targetEnemy?.ai ?? {}) as unknown as Record<string, unknown>
    for (const key of new Set([...Object.keys(parentAi), ...Object.keys(successorAi)]))
      assertField(enemyId, `ai.${key}`, parentAi[key], successorAi[key], targetAi[key])
  }
  if (
    changedOwners.size !== 99 ||
    !isDeepStrictEqual(Object.fromEntries([...changedFields].sort()), {
      'ai.fallback': 85,
      'ai.hooks': 44,
      'ai.rules': 95,
      choreography: 21,
    })
  )
    throw new Error(
      `R13 enemy augmentation: merged ownership manifest 漂移 ${JSON.stringify(
        Object.fromEntries([...changedFields].sort()),
      )}`,
    )

  const targetLocale = validateLocale(target.files.get('content/locale.json'))
  for (const [id, value] of Object.entries(details.localeDelta))
    if (targetLocale[id] !== value)
      throw new Error(`R13 enemy augmentation: merged target owned locale 漂移 ${id}`)
  validateSkills(target.files.get('content/skills.json'))
  for (const spec of R13_ENEMY_ENCOUNTER_OVERLAY_ORACLE) locateEncounter(target, spec, 'successor')
}

/**
 * MG2 合并后允许保留 parent 未触及的作者数据；R13-5 只重新验自己实际改变的叶子。
 * 这与纯 successor 的全摘要闭包分开，避免把合法作者字段误当成迁移漂移。
 */
export function assertR13EnemyScriptMergedTargetClosure(
  parent: MigrationSnapshot,
  successor: MigrationSnapshot,
  target: MigrationSnapshot,
  evidence: R13EnemyScriptAugmentationEvidenceV1,
): void {
  const prepared = prepareR13EnemyScriptMergedTargetClosure(parent, successor, evidence)
  assertPreparedR13EnemyScriptMergedTargetClosure(prepared, target)
}

export function augmentR13EnemyScriptsAfterConfirm(args: {
  parent: MigrationSnapshot
  historicalMigration: MigrationFileSet
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
}): R13EnemyScriptAugmentation {
  if (digestR13ContentSnapshot(args.parent) !== R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST)
    throw new Error('R13 enemy augmentation: parent content authority 漂移')
  const parentEnemies = validateEnemies(args.parent.files.get('content/enemies.json'))
  const historicalEnemies = validateEnemies(
    args.historicalMigration.files.get('content/enemies.json'),
  )
  const currentEnemies = validateEnemies(args.currentMigration.files.get('content/enemies.json'))
  if (
    parentEnemies.length !== 153 ||
    historicalEnemies.length !== 153 ||
    currentEnemies.length !== 153 ||
    stableJsonSha256(parentEnemies) !== R13_ENEMY_SCRIPT_PARENT_ENEMIES_DIGEST ||
    stableJsonSha256(historicalEnemies) !== R13_ENEMY_SCRIPT_PARENT_ENEMIES_DIGEST ||
    stableJsonSha256(currentEnemies) !== R13_ENEMY_SCRIPT_CURRENT_ENEMIES_DIGEST ||
    currentEnemies.filter((enemy) => enemy.ai.resistanceToSorcery === 10).length !== 30
  )
    throw new Error('R13 enemy augmentation: enemy authority 漂移')

  const parentSkills = validateSkills(args.parent.files.get('content/skills.json'))
  const historicalSkills = validateSkills(args.historicalMigration.files.get('content/skills.json'))
  const currentSkills = validateSkills(args.currentMigration.files.get('content/skills.json'))
  if (
    stableJsonSha256(parentSkills) !== R13_ENEMY_SCRIPT_SKILLS_DIGEST ||
    stableJsonSha256(historicalSkills) !== R13_ENEMY_SCRIPT_SKILLS_DIGEST ||
    stableJsonSha256(currentSkills) !== R13_ENEMY_SCRIPT_SKILLS_DIGEST
  )
    throw new Error('R13 enemy augmentation: skills closure 漂移')

  const historicalRawLocale = validateLocale(
    args.historicalMigration.files.get('content/locale.json'),
  )
  const currentRawLocale = validateLocale(args.currentMigration.files.get('content/locale.json'))
  const parentLocale = validateLocale(args.parent.files.get('content/locale.json'))
  const localeAuthority = {
    historical: {
      count: Object.keys(historicalRawLocale).length,
      digest: stableJsonSha256(historicalRawLocale),
    },
    current: {
      count: Object.keys(currentRawLocale).length,
      digest: stableJsonSha256(currentRawLocale),
    },
    parent: {
      count: Object.keys(parentLocale).length,
      digest: stableJsonSha256(parentLocale),
    },
  }
  if (
    localeAuthority.historical.count !== 9129 ||
    localeAuthority.historical.digest !== R13_ENEMY_SCRIPT_HISTORICAL_RAW_LOCALE_DIGEST ||
    localeAuthority.current.count !== 9134 ||
    localeAuthority.current.digest !== R13_ENEMY_SCRIPT_CURRENT_RAW_LOCALE_DIGEST ||
    localeAuthority.parent.count !== 9547 ||
    localeAuthority.parent.digest !== R13_ENEMY_SCRIPT_PARENT_LOCALE_DIGEST
  )
    throw new Error(
      `R13 enemy augmentation: locale authority 漂移 ${JSON.stringify(localeAuthority)}`,
    )
  const localeDelta = exactLocaleDelta({
    historical: historicalRawLocale,
    current: currentRawLocale,
  })
  if (Object.keys(localeDelta).some((id) => parentLocale[id] !== undefined))
    throw new Error('R13 enemy augmentation: locale delta 与 parent 键冲突')

  const preflight = preflightEncounterCleanup(args.parent)
  const snapshot = cloneSnapshot(args.parent)
  snapshot.files.set('content/enemies.json', asMigrationJson(currentEnemies))
  snapshot.files.set(
    'content/locale.json',
    asMigrationJson({ ...structuredClone(parentLocale), ...localeDelta }),
  )
  const encounterCleanup = cleanupEncounters(snapshot, preflight)
  const paths = changedPaths(args.parent, snapshot)

  const dispositionArgs = {
    sources: args.currentSources,
    migration: args.currentMigration,
    final: snapshot,
  }
  const enemySourceDisposition = buildR13EnemySourceDispositionFromPal(dispositionArgs)
  assertR13EnemySourceDispositionFromPal(enemySourceDisposition, dispositionArgs)
  const runtimeCapability = buildAndAssertHistoricalR13_5RuntimeCapabilityAuditV3(snapshot)

  const evidence = digestRecord<R13EnemyScriptAugmentationEvidenceV1>({
    kind: 'r13-enemy-script-augmentation-evidence',
    version: 1,
    projectId: 'pal',
    generator: { id: 'r13-enemy-script-augmentation', version: 1 },
    summary: {
      enemies: 153,
      resistanceTenEnemies: 30,
      localeAdded: 5,
      localeDeleted: 0,
      localeChanged: 0,
      encounterChoreographyRemoved: 8,
      changedScenes: 6,
      changedFiles: 8,
    },
    parentContentDigest: digestR13ContentSnapshot(args.parent),
    successorContentDigest: digestR13ContentSnapshot(snapshot),
    files: {
      parentEnemiesDigest: stableJsonSha256(parentEnemies),
      successorEnemiesDigest: stableJsonSha256(currentEnemies),
      skillsDigest: stableJsonSha256(parentSkills),
      historicalRawLocaleDigest: stableJsonSha256(historicalRawLocale),
      currentRawLocaleDigest: stableJsonSha256(currentRawLocale),
      parentLocaleDigest: stableJsonSha256(parentLocale),
      successorLocaleDigest: stableJsonSha256(snapshot.files.get('content/locale.json')),
      changedPaths: paths,
    },
    localeDelta: structuredClone(localeDelta),
    encounterCleanup,
    audits: {
      enemySourceDispositionDigest: enemySourceDisposition.digest,
      enemySourceDispositionSummary: structuredClone(enemySourceDisposition.summary),
      runtimeCapabilityDigest: runtimeCapability.digest,
      runtimeCapabilitySummary: structuredClone(runtimeCapability.summary),
    },
  })
  assertR13EnemyScriptFinalTargetClosure(snapshot, evidence)
  return { snapshot, evidence, enemySourceDisposition, runtimeCapability }
}
