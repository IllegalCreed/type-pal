import { isDeepStrictEqual } from 'node:util'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { rewindPalR13SixBPublication } from '../../pal-r13-six-b-rewind.js'
import {
  R13_SIX_C_SEAL_PATH,
  R13_SIX_C_TRANSITION_ID,
  rewindPalR13SixCPublicationIfPresent,
} from '../../pal-r13-six-c.js'
import {
  R13_EXISTING_SCHEMA_CHANGED_PATHS,
  type R13ExistingSchemaAugmentationEvidenceV1,
  rewindR13ExistingSchemaAugmentation,
} from './r13-existing-schema-augmentation.js'
import {
  R13_SOURCE_SEMANTICS_SEAL_PATH,
  R13_SOURCE_SEMANTICS_TRANSITION_ID,
} from './r13-source-semantics-mg2.js'
import {
  R13_Z_SEAL_PATH,
  R13_Z_TRANSITION_ID,
  rewindPublishedR13ZPublicationIfPresent,
} from './r13-z-transition-mg2.js'

interface PublishedR13SourceSemanticsSeal {
  kind: 'r13-source-semantics-transition'
  transitionId: typeof R13_SOURCE_SEMANTICS_TRANSITION_ID
  augmentation: R13ExistingSchemaAugmentationEvidenceV1
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

/** Project snapshots inherit baseline managed paths although transition seal files never live there. */
function stripProjectManagedPlaceholder(
  source: MigrationSnapshot,
  sealPath: string,
  transitionId: string,
): MigrationSnapshot {
  if (
    source.managedFiles.has(sealPath) &&
    !source.files.has(sealPath) &&
    !source.hashes?.has(sealPath) &&
    source.baselineMetadata?.transitions[transitionId] === undefined
  ) {
    const snapshot = cloneSnapshot(source)
    snapshot.managedFiles.delete(sealPath)
    return snapshot
  }
  return source
}

function setSnapshotFile(snapshot: MigrationSnapshot, path: string, value: MigrationJson): void {
  const cloned = structuredClone(value)
  snapshot.files.set(path, cloned)
  if (snapshot.hashes) snapshot.hashes.set(path, sha256(serializeMigrationJson(cloned, path)))
}

function publishedSeal(snapshot: MigrationSnapshot): PublishedR13SourceSemanticsSeal {
  const raw = snapshot.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH)
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    raw.kind !== 'r13-source-semantics-transition' ||
    raw.transitionId !== R13_SOURCE_SEMANTICS_TRANSITION_ID ||
    !raw.augmentation ||
    typeof raw.augmentation !== 'object' ||
    Array.isArray(raw.augmentation)
  )
    throw new Error('R13-6A published fixture source-semantics seal 无效')
  return raw as unknown as PublishedR13SourceSemanticsSeal
}

function contentSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  for (const path of [...snapshot.files.keys()])
    if (path.startsWith('_transitions/')) snapshot.files.delete(path)
  for (const path of [...snapshot.managedFiles])
    if (path.startsWith('_transitions/')) snapshot.managedFiles.delete(path)
  for (const path of [...(snapshot.hashes?.keys() ?? [])])
    if (path.startsWith('_transitions/')) snapshot.hashes?.delete(path)
  delete snapshot.baselineMetadata
  return snapshot
}

export function rewindPublishedR13SourceSemanticsBaseline(source: MigrationSnapshot): {
  baseline: MigrationSnapshot
  successor: MigrationSnapshot
  evidence: R13ExistingSchemaAugmentationEvidenceV1
} {
  // R13-6C(零内容叶 successor)先剥离,再剥 6B —— 重放 6A 面。
  const successor = rewindPalR13SixBPublication(
    rewindPalR13SixCPublicationIfPresent(rewindPublishedR13ZPublicationIfPresent(source)),
  )
  const seal = publishedSeal(successor)
  if (
    successor.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] === undefined ||
    !successor.managedFiles.has(R13_SOURCE_SEMANTICS_SEAL_PATH) ||
    successor.hashes?.has(R13_SOURCE_SEMANTICS_SEAL_PATH) !== true
  )
    throw new Error('R13-6A published fixture source-semantics seal 四态不完整')

  const parentContent = rewindR13ExistingSchemaAugmentation(
    contentSnapshot(successor),
    seal.augmentation,
  )
  const baseline = cloneSnapshot(successor)
  for (const path of R13_EXISTING_SCHEMA_CHANGED_PATHS) {
    const value = parentContent.files.get(path)
    if (value === undefined) throw new Error(`R13-6A published fixture parent 缺 ${path}`)
    setSnapshotFile(baseline, path, value)
  }
  baseline.files.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  baseline.managedFiles.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  baseline.hashes?.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  delete baseline.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID]
  return { baseline, successor, evidence: seal.augmentation }
}

export function rewindPublishedR13SourceSemanticsTransition(args: {
  publishedBaseline: MigrationSnapshot
  publishedProject: MigrationSnapshot
}): {
  baseline: MigrationSnapshot
  project: MigrationSnapshot
  evidence: R13ExistingSchemaAugmentationEvidenceV1
} {
  const rebuilt = rewindPublishedR13SourceSemanticsBaseline(args.publishedBaseline)
  const projectWithoutPlaceholders = stripProjectManagedPlaceholder(
    stripProjectManagedPlaceholder(args.publishedProject, R13_Z_SEAL_PATH, R13_Z_TRANSITION_ID),
    R13_SIX_C_SEAL_PATH,
    R13_SIX_C_TRANSITION_ID,
  )
  const successorProject = rewindPalR13SixBPublication(
    rewindPalR13SixCPublicationIfPresent(
      rewindPublishedR13ZPublicationIfPresent(projectWithoutPlaceholders),
    ),
  )
  if (
    successorProject.files.has(R13_SOURCE_SEMANTICS_SEAL_PATH) ||
    successorProject.hashes?.has(R13_SOURCE_SEMANTICS_SEAL_PATH)
  )
    throw new Error('R13-6A published fixture project 泄漏 source-semantics seal')

  const project = cloneSnapshot(successorProject)
  for (const path of R13_EXISTING_SCHEMA_CHANGED_PATHS) {
    const publishedValue = rebuilt.successor.files.get(path)
    const projectValue = successorProject.files.get(path)
    const parentValue = rebuilt.baseline.files.get(path)
    if (publishedValue === undefined || projectValue === undefined || parentValue === undefined)
      throw new Error(`R13-6A published fixture 路径缺失 ${path}`)
    if (!isDeepStrictEqual(projectValue, publishedValue))
      throw new Error(`R13-6A published fixture 无法安全反演作者差异 ${path}`)
    setSnapshotFile(project, path, parentValue)
  }
  project.managedFiles.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  return { baseline: rebuilt.baseline, project, evidence: rebuilt.evidence }
}
