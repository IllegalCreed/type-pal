import { isDeepStrictEqual } from 'node:util'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { rewindPublishedR13SourceSemanticsTransition } from './published-r13-source-semantics-test-fixture.js'
import {
  R13_ENEMY_SCRIPT_SEAL_PATH,
  R13_ENEMY_SCRIPT_TRANSITION_ID,
} from './r13-enemy-script-mg2.js'

interface PublishedR13EnemySeal {
  kind: 'r13-enemy-script-transition'
  transitionId: string
  augmentation: {
    files: { changedPaths: string[] }
    localeDelta: Record<string, string>
  }
}

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

function record(value: MigrationJson | undefined, label: string): Record<string, MigrationJson> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13-5 published fixture ${label} 不是 record`)
  return value as Record<string, MigrationJson>
}

function publishedSeal(baseline: MigrationSnapshot): PublishedR13EnemySeal {
  const raw = baseline.files.get(R13_ENEMY_SCRIPT_SEAL_PATH)
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    raw.kind !== 'r13-enemy-script-transition' ||
    raw.transitionId !== R13_ENEMY_SCRIPT_TRANSITION_ID ||
    !raw.augmentation ||
    typeof raw.augmentation !== 'object' ||
    Array.isArray(raw.augmentation) ||
    !raw.augmentation.files ||
    typeof raw.augmentation.files !== 'object' ||
    Array.isArray(raw.augmentation.files) ||
    !Array.isArray(raw.augmentation.files.changedPaths) ||
    !raw.augmentation.localeDelta ||
    typeof raw.augmentation.localeDelta !== 'object' ||
    Array.isArray(raw.augmentation.localeDelta)
  )
    throw new Error('R13-5 published fixture enemy seal 无效')
  const seal = raw as unknown as PublishedR13EnemySeal
  if (
    new Set(seal.augmentation.files.changedPaths).size !==
    seal.augmentation.files.changedPaths.length
  )
    throw new Error('R13-5 published fixture changed paths 重复')
  return seal
}

function assertSnapshotFileHash(
  snapshot: MigrationSnapshot,
  path: string,
  label: string,
): MigrationJson {
  const value = snapshot.files.get(path)
  const expected = snapshot.hashes?.get(path)
  if (
    value === undefined ||
    expected === undefined ||
    expected !== sha256(serializeMigrationJson(value, path))
  )
    throw new Error(`R13-5 published fixture ${label} 正文/hash 漂移 ${path}`)
  return value
}

function setSnapshotFile(snapshot: MigrationSnapshot, path: string, value: MigrationJson): void {
  if (!snapshot.hashes) throw new Error('R13-5 published fixture snapshot 缺 hashes')
  const cloned = structuredClone(value)
  snapshot.files.set(path, cloned)
  snapshot.hashes.set(path, sha256(serializeMigrationJson(cloned, path)))
}

export function rewindPublishedR13EnemyTransition(args: {
  publishedBaseline: MigrationSnapshot
  publishedProject: MigrationSnapshot
  parent: MigrationSnapshot
  publishedSuccessor?: MigrationSnapshot
}): {
  baseline: MigrationSnapshot
  project: MigrationSnapshot
  changedPaths: readonly string[]
  authoredLocaleIds: readonly string[]
} {
  // The live publication may already be the content11/R13-6B successor. Historical R13-5
  // initialization must compare against its exact 6A parent, not treat 6B-owned scene/skill
  // leaves as author edits. Rewind both sides before validating hashes and author deltas.
  const sourceSemantics = rewindPublishedR13SourceSemanticsTransition({
    publishedBaseline: args.publishedBaseline,
    publishedProject: args.publishedProject,
  })
  const publishedBaseline = sourceSemantics.baseline
  const publishedProject = sourceSemantics.project
  const seal = publishedSeal(publishedBaseline)
  const changedPaths = seal.augmentation.files.changedPaths
  if (
    publishedBaseline.baselineMetadata?.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID] ===
      undefined ||
    !publishedBaseline.managedFiles.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    publishedBaseline.hashes?.has(R13_ENEMY_SCRIPT_SEAL_PATH) !== true
  )
    throw new Error('R13-5 published fixture enemy seal 四态不完整')
  if (
    publishedProject.files.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    publishedProject.hashes?.has(R13_ENEMY_SCRIPT_SEAL_PATH)
  )
    throw new Error('R13-5 published fixture project 泄漏 enemy seal')

  const baseline = cloneSnapshot(publishedBaseline)
  const project = cloneSnapshot(publishedProject)
  const localePath = 'content/locale.json'
  for (const path of changedPaths) {
    const publishedValue = assertSnapshotFileHash(publishedBaseline, path, 'baseline')
    const projectValue = assertSnapshotFileHash(publishedProject, path, 'project')
    const parentValue = args.parent.files.get(path)
    if (parentValue === undefined) throw new Error(`R13-5 published fixture parent 缺 ${path}`)
    const successorValue = args.publishedSuccessor?.files.get(path)
    if (args.publishedSuccessor && !isDeepStrictEqual(publishedValue, successorValue))
      throw new Error(`R13-5 published fixture baseline/successor 漂移 ${path}`)
    if (path !== localePath && !isDeepStrictEqual(projectValue, publishedValue))
      throw new Error(`R13-5 published fixture 无法安全反演作者差异 ${path}`)
    setSnapshotFile(baseline, path, parentValue)
    if (path !== localePath) setSnapshotFile(project, path, parentValue)
  }

  const baselineLocale = record(publishedBaseline.files.get(localePath), 'baseline locale')
  const projectLocale = record(publishedProject.files.get(localePath), 'project locale')
  const parentLocale = structuredClone(record(args.parent.files.get(localePath), 'parent locale'))
  const deletedLocaleIds = Object.keys(baselineLocale).filter(
    (id) => projectLocale[id] === undefined,
  )
  const changedLocaleIds = Object.keys(baselineLocale).filter(
    (id) =>
      projectLocale[id] !== undefined && !isDeepStrictEqual(projectLocale[id], baselineLocale[id]),
  )
  if (deletedLocaleIds.length || changedLocaleIds.length)
    throw new Error(
      `R13-5 published fixture 无法安全反演 locale ` +
        `deleted=${deletedLocaleIds.length} changed=${changedLocaleIds.length}`,
    )
  for (const [id, value] of Object.entries(seal.augmentation.localeDelta)) {
    if (baselineLocale[id] !== value || parentLocale[id] !== undefined)
      throw new Error(`R13-5 published fixture locale owned delta 漂移 ${id}`)
  }
  const authoredLocaleIds = Object.keys(projectLocale)
    .filter((id) => baselineLocale[id] === undefined)
    .sort()
  for (const id of authoredLocaleIds) parentLocale[id] = structuredClone(projectLocale[id]!)
  setSnapshotFile(project, localePath, parentLocale)

  baseline.files.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  baseline.managedFiles.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  baseline.hashes?.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  delete baseline.baselineMetadata?.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID]
  project.managedFiles.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  return { baseline, project, changedPaths, authoredLocaleIds }
}
