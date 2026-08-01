import { isDeepStrictEqual } from 'node:util'
import type { SceneDefV5, SkillData } from '@type-pal/content'
import {
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
} from '../../migration-baseline.js'
import type { MigrationPlan } from '../../migration-plan.js'
import { createMigrationPlan } from '../../migration-plan.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import {
  R13_ENEMY_SCRIPT_SEAL_PATH,
  R13_ENEMY_SCRIPT_TRANSITION_ID,
} from './r13-enemy-script-mg2.js'
import {
  assertR13ExistingSchemaAugmentationEvidence,
  assertR13ExistingSchemaFinalTargetClosure,
  augmentR13ExistingSchemaAfterEnemy,
  digestR13ExistingSchemaContentSnapshot,
  R13_EXISTING_SCHEMA_CHANGED_PATHS,
  R13_EXISTING_SCHEMA_COMMAND_ORACLE,
  R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST,
  type R13ExistingSchemaAugmentation,
  type R13ExistingSchemaAugmentationEvidenceV1,
  rewindR13ExistingSchemaAugmentation,
} from './r13-existing-schema-augmentation.js'
import type { PreparedR13SourceExecutionCensus } from './source-execution-census.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_SOURCE_SEMANTICS_TRANSITION_ID = 'r13-source-semantics-v1' as const
export const R13_SOURCE_SEMANTICS_SEAL_PATH = '_transitions/r13-source-semantics-v1.json' as const
export const R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST =
  '54804a6c69e644e9c44fd98fd489d0f73eee6580c4ffc3c3753322074361fab6' as const
export const R13_SOURCE_SEMANTICS_PARENT_ENEMY_FILE_SHA256 =
  'e913123d9f01b6b1caf530bb168c9e78abc7339d4ac5dbcd55b731433c39f9c9' as const

interface R13SourceSemanticsSealBodyV1 {
  kind: 'r13-source-semantics-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_SOURCE_SEMANTICS_TRANSITION_ID
  parent: {
    transitionId: typeof R13_ENEMY_SCRIPT_TRANSITION_ID
    digest: typeof R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST
  }
  augmentation: R13ExistingSchemaAugmentationEvidenceV1
  merge: {
    changedPaths: string[]
    commandSites: 22
    skillCosts: 3
  }
  externalPrerequisites: R13ExistingSchemaAugmentationEvidenceV1['externalPrerequisites']
}

export interface R13SourceSemanticsTransitionSealV1 extends R13SourceSemanticsSealBodyV1 {
  digest: string
}

export interface PreparedR13SourceSemanticsAuthority {
  readonly parentContent: MigrationSnapshot
  readonly currentSources: PalMigrationSources
  readonly currentMigration: MigrationFileSet
  readonly preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  readonly augmentation: R13ExistingSchemaAugmentation
  readonly digest: string
}

export interface R13SourceSemanticsV5MigrationPlan {
  plan: MigrationPlan
  target: MigrationSnapshot
  nextBaseline: MigrationSnapshot
  augmentation: R13ExistingSchemaAugmentation
  seal: R13SourceSemanticsTransitionSealV1
  sealMode: 'initialize' | 'replay'
  authority: PreparedR13SourceSemanticsAuthority
}

const preparedAuthorities = new WeakSet<PreparedR13SourceSemanticsAuthority>()

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

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function digestRecord<T>(value: Omit<T, 'digest'>): T {
  return { ...value, digest: stableJsonSha256(value) } as T
}

function recordDigest(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13 source semantics MG2: ${path} 无效`)
  const digest = value.digest
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13 source semantics MG2: ${path}.digest 无效`)
  const { digest: _ignored, ...body } = value
  if (stableJsonSha256(body) !== digest)
    throw new Error(`R13 source semantics MG2: ${path} 自摘要不符`)
  return digest
}

function contentView(source: MigrationSnapshot): MigrationSnapshot {
  const result = cloneSnapshot(source)
  for (const path of [...result.files.keys()])
    if (path.startsWith('_transitions/')) result.files.delete(path)
  for (const path of [...result.managedFiles])
    if (path.startsWith('_transitions/')) result.managedFiles.delete(path)
  for (const path of [...(result.hashes?.keys() ?? [])])
    if (path.startsWith('_transitions/')) result.hashes?.delete(path)
  delete result.baselineMetadata
  return result
}

function assertNoTransitionControls(snapshot: MigrationSnapshot, label: string): void {
  const leaked = [
    ...[...snapshot.files.keys()].filter((path) => path.startsWith('_transitions/')),
    ...[...snapshot.managedFiles].filter((path) => path.startsWith('_transitions/')),
    ...[...(snapshot.hashes?.keys() ?? [])].filter((path) => path.startsWith('_transitions/')),
  ]
  if (leaked.length)
    throw new Error(`R13 source semantics MG2: ${label} 泄漏 control ${leaked.join(',')}`)
}

/** A checked-out project may inherit baseline control paths in its managed seed, but it
 * must never carry the actual transition JSON/hash. The seed-only entries are removed by
 * contentView later and are therefore harmless. */
function assertProjectHasNoTransitionFiles(snapshot: MigrationSnapshot, label: string): void {
  const leaked = [
    ...[...snapshot.files.keys()].filter((path) => path.startsWith('_transitions/')),
    ...[...(snapshot.hashes?.keys() ?? [])].filter((path) => path.startsWith('_transitions/')),
  ]
  if (leaked.length)
    throw new Error(`R13 source semantics MG2: ${label} 携带 transition file ${leaked.join(',')}`)
}

function assertWarmAmbiencePrerequisite(args: {
  ours: MigrationSnapshot
  currentMigration: MigrationFileSet
  projectPrerequisites?: ReadonlyMap<string, MigrationJson>
}): void {
  const path = 'content/ambiences.json'
  const value =
    args.projectPrerequisites?.get(path) ??
    args.ours.files.get(path) ??
    args.currentMigration.files.get(path)
  const record = Array.isArray(value)
    ? value.find(
        (entry) =>
          !!entry &&
          typeof entry === 'object' &&
          !Array.isArray(entry) &&
          (entry as Record<string, MigrationJson>).id === 'warm',
      )
    : undefined
  if (
    !record ||
    !Array.isArray((record as { tint?: unknown }).tint) ||
    !isDeepStrictEqual((record as { tint: unknown }).tint, [255, 230, 102])
  )
    throw new Error(
      'R13 source semantics MG2: 外部 prerequisite content/ambiences.json 缺 warm/[255,230,102]',
    )
}

function transitionState(base: MigrationSnapshot): 'initialize' | 'replay' {
  const metadata =
    base.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] !== undefined
  const file = base.files.has(R13_SOURCE_SEMANTICS_SEAL_PATH)
  const managed = base.managedFiles.has(R13_SOURCE_SEMANTICS_SEAL_PATH)
  const hash = base.hashes?.has(R13_SOURCE_SEMANTICS_SEAL_PATH) === true
  if (!metadata && !file && !managed && !hash) return 'initialize'
  if (metadata && file && managed && hash) return 'replay'
  throw new Error(
    `R13 source semantics MG2: transition 半状态 metadata=${metadata} file=${file} ` +
      `managed=${managed} hash=${hash}`,
  )
}

function assertPublishedEnemyParent(base: MigrationSnapshot): void {
  const raw = base.files.get(R13_ENEMY_SCRIPT_SEAL_PATH)
  const digest = recordDigest(raw, R13_ENEMY_SCRIPT_SEAL_PATH)
  if (
    digest !== R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST ||
    base.baselineMetadata?.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID] !== digest ||
    !base.managedFiles.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    base.hashes?.get(R13_ENEMY_SCRIPT_SEAL_PATH) !==
      R13_SOURCE_SEMANTICS_PARENT_ENEMY_FILE_SHA256 ||
    sha256(serializeMigrationJson(raw!, R13_ENEMY_SCRIPT_SEAL_PATH)) !==
      R13_SOURCE_SEMANTICS_PARENT_ENEMY_FILE_SHA256
  )
    throw new Error('R13 source semantics MG2: published enemy parent byte-pin 漂移')
}

function buildSeal(
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
  changedPaths: readonly string[],
): R13SourceSemanticsTransitionSealV1 {
  assertR13ExistingSchemaAugmentationEvidence(evidence)
  return digestRecord<R13SourceSemanticsTransitionSealV1>({
    kind: 'r13-source-semantics-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_SOURCE_SEMANTICS_TRANSITION_ID,
    parent: {
      transitionId: R13_ENEMY_SCRIPT_TRANSITION_ID,
      digest: R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST,
    },
    augmentation: structuredClone(evidence),
    merge: {
      changedPaths: [...changedPaths],
      commandSites: 22,
      skillCosts: 3,
    },
    externalPrerequisites: structuredClone(evidence.externalPrerequisites),
  })
}

function targetSnapshot(plan: MigrationPlan, managedFiles: ReadonlySet<string>): MigrationSnapshot {
  return {
    files: new Map(plan.target),
    managedFiles: new Set(managedFiles),
  }
}

function withoutAtomicMaps(source: MigrationSnapshot): MigrationSnapshot {
  const result = cloneSnapshot(source)
  for (const path of [...result.files.keys()])
    if (isAtomicProjectMapPath(path)) result.files.delete(path)
  for (const path of [...result.managedFiles])
    if (isAtomicProjectMapPath(path)) result.managedFiles.delete(path)
  for (const path of [...(result.hashes?.keys() ?? [])])
    if (isAtomicProjectMapPath(path)) result.hashes?.delete(path)
  return result
}

function mergeUnownedAtomicMapRepresentation(
  target: MigrationSnapshot,
  base: MigrationSnapshot,
  ours: MigrationSnapshot,
  generated: MigrationSnapshot,
): void {
  const paths = new Set<string>()
  for (const view of [base, ours, generated])
    for (const path of view.managedFiles) if (isAtomicProjectMapPath(path)) paths.add(path)
  for (const view of [base, ours, generated])
    for (const path of [...view.files.keys(), ...(view.hashes?.keys() ?? [])])
      if (isAtomicProjectMapPath(path)) paths.add(path)
  for (const path of paths) {
    // The generated successor must not alter maps in this transition. Compare the
    // canonical atomic state (presence + hash), then preserve the checked-out project
    // state verbatim, including an intentional author deletion.
    const basePresent = base.files.has(path) || base.hashes?.has(path) === true
    const generatedPresent = generated.files.has(path) || generated.hashes?.has(path) === true
    const baseHash = snapshotFileHash(base, path)
    const generatedHash = snapshotFileHash(generated, path)
    if (basePresent !== generatedPresent || baseHash !== generatedHash)
      throw new Error(`R13 source semantics MG2: generated 改动非 owned map ${path}`)

    target.files.delete(path)
    target.hashes?.delete(path)
    if (ours.files.has(path)) target.files.set(path, ours.files.get(path)!)
    target.managedFiles.add(path)
    const hash = ours.hashes?.get(path)
    if (hash && ours.files.has(path)) {
      target.hashes ??= new Map()
      target.hashes.set(path, hash)
    } else if (!ours.files.has(path) && ours.hashes?.has(path)) {
      target.hashes ??= new Map()
      target.hashes.set(path, ours.hashes.get(path)!)
    }
  }
}

function assertTargetShape(target: MigrationSnapshot, label: string): void {
  assertNoTransitionControls(target, label)
  for (const path of R13_EXISTING_SCHEMA_CHANGED_PATHS)
    if (!target.files.has(path) || !target.managedFiles.has(path))
      throw new Error(`R13 source semantics MG2: ${label} 缺 owned path ${path}`)
}

function commandClosureSnapshot(
  target: MigrationSnapshot,
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
): void {
  // The pure closure is intentionally strict on the generated side. The merged target uses
  // the same command/skill selectors below, but permits unrelated author leaves in the file.
  assertR13ExistingSchemaFinalTargetClosure(target, evidence)
}

function assertMergedOwnedClosure(
  target: MigrationSnapshot,
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
): void {
  assertR13ExistingSchemaAugmentationEvidence(evidence)
  assertTargetShape(target, 'merged target')
  const owners = [...new Set(evidence.sites.map((entry) => entry.owner))].sort(stableStringCompare)
  for (const owner of owners) {
    const ownerSites = evidence.sites.filter((entry) => entry.owner === owner)
    const site = ownerSites[0]
    if (!site) throw new Error(`R13 source semantics MG2: owner evidence 缺失 ${owner}`)
    const scenePath = `content/scenes/${owner.split('/')[0]}.json`
    const sceneValue = target.files.get(scenePath)
    if (!sceneValue || typeof sceneValue !== 'object' || Array.isArray(sceneValue))
      throw new Error(`R13 source semantics MG2: merged scene 缺失 ${scenePath}`)
    const commandValues = collectCommandsAtOwner(target, owner)
    for (const owned of ownerSites) {
      const matches = commandValues
        .map((command, index) => ({ command, index }))
        .filter((entry) => stableJsonSha256(entry.command) === owned.commandDigest)
      const anchored = matches.filter(({ index }) => {
        const before = commandValues[index - 1]
        const after = commandValues[index + 1]
        return (
          (owned.beforeDigest === undefined
            ? index === 0
            : before !== undefined && stableJsonSha256(before) === owned.beforeDigest) &&
          (owned.afterDigest === undefined
            ? index === commandValues.length - 1
            : after !== undefined && stableJsonSha256(after) === owned.afterDigest)
        )
      })
      if (anchored.length !== 1)
        throw new Error(
          `R13 source semantics MG2: merged owned command 不唯一 ${owner}/${owned.commandDigest}`,
        )
    }
    if (site.parentContainerDigest === site.successorContainerDigest)
      throw new Error(`R13 source semantics MG2: owner parent/successor evidence 未变化 ${owner}`)
  }
  const skills = target.files.get('content/skills.json')
  if (!skills || typeof skills !== 'object' || Array.isArray(skills))
    throw new Error('R13 source semantics MG2: merged skills 缺失')
  const rawSkills = (skills as { skills?: unknown }).skills
  const indexed = new Map(
    (Array.isArray(rawSkills) ? (rawSkills as SkillData[]) : []).map((skill) => [
      String(skill.id),
      skill,
    ]),
  )
  for (const expected of evidence.skills) {
    if (!isDeepStrictEqual(indexed.get(expected.skillId)?.cost?.items, expected.items))
      throw new Error(`R13 source semantics MG2: merged skill cost 漂移 ${expected.skillId}`)
  }
}

/**
 * Resolve all commands below one owned flow from a canonical scene file. This deliberately
 * returns values, not mutable references: author edits are allowed, but an owned inserted
 * command must still occur exactly once.
 */
function collectCommandsAtOwner(target: MigrationSnapshot, owner: string): unknown[] {
  const oracle = R13_EXISTING_SCHEMA_COMMAND_ORACLE.find((entry) => entry.id === owner)
  if (!oracle) return []
  const sceneId = oracle.owner.sceneId
  const scene = target.files.get(`content/scenes/${sceneId}.json`) as unknown as
    | SceneDefV5
    | undefined
  if (!scene) return []
  const ownerDef = oracle.owner
  const flow =
    ownerDef.kind === 'entity'
      ? scene.entities.find((candidate) => candidate.id === ownerDef.entityId)?.behaviors?.[
          ownerDef.channel
        ]?.[ownerDef.behaviorId]?.flow
      : scene.hooks?.[ownerDef.channel]?.variants?.[ownerDef.behaviorId]?.flow
  if (!flow) return []
  const nodeId = oracle.node.id
  const node =
    oracle.node.kind === 'stage'
      ? flow.kind === 'stages'
        ? flow.stages.find((candidate) => candidate.id === nodeId)
        : undefined
      : flow.kind === 'stateMachine'
        ? flow.machine?.states?.[nodeId]
        : undefined
  if (!node) return []
  return oracle.segment === 'body' ? [...(node.body ?? [])] : [...(node.entry?.prepare ?? [])]
}

function assertOldControlsBytePinned(before: MigrationSnapshot, after: MigrationSnapshot): void {
  const controls = [...before.managedFiles].filter((path) => path.startsWith('_transitions/'))
  for (const path of controls) {
    if (
      !isDeepStrictEqual(before.files.get(path), after.files.get(path)) ||
      before.managedFiles.has(path) !== after.managedFiles.has(path) ||
      snapshotFileHash(before, path) !== snapshotFileHash(after, path)
    )
      throw new Error(`R13 source semantics MG2: historical control 漂移 ${path}`)
  }
  const beforeTransitions = before.baselineMetadata?.transitions ?? {}
  const afterTransitions = after.baselineMetadata?.transitions ?? {}
  for (const [id, digest] of Object.entries(beforeTransitions))
    if (id !== R13_SOURCE_SEMANTICS_TRANSITION_ID && afterTransitions[id] !== digest)
      throw new Error(`R13 source semantics MG2: historical metadata 漂移 ${id}`)
}

function installSeal(baseline: MigrationSnapshot, seal: R13SourceSemanticsTransitionSealV1): void {
  baseline.files.set(R13_SOURCE_SEMANTICS_SEAL_PATH, asJson(seal))
  baseline.managedFiles.add(R13_SOURCE_SEMANTICS_SEAL_PATH)
  baseline.hashes?.set(
    R13_SOURCE_SEMANTICS_SEAL_PATH,
    sha256(serializeMigrationJson(asJson(seal), R13_SOURCE_SEMANTICS_SEAL_PATH)),
  )
  if (!baseline.baselineMetadata) throw new Error('R13 source semantics MG2: baseline 缺 metadata')
  baseline.baselineMetadata.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] = seal.digest
}

function installAuthorityIntoBaseline(
  baseline: MigrationSnapshot,
  authoritySnapshot: MigrationSnapshot,
): void {
  for (const path of R13_EXISTING_SCHEMA_CHANGED_PATHS) {
    const value = authoritySnapshot.files.get(path)
    if (value === undefined) throw new Error(`R13 source semantics MG2: target 缺 ${path}`)
    baseline.files.set(path, structuredClone(value))
    baseline.managedFiles.add(path)
    baseline.hashes?.set(path, sha256(serializeMigrationJson(value, path)))
  }
}

function prepareAuthority(args: {
  parent: MigrationSnapshot
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
}): PreparedR13SourceSemanticsAuthority {
  const parentContent = contentView(args.parent)
  if (
    digestR13ExistingSchemaContentSnapshot(parentContent) !==
    R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST
  )
    throw new Error('R13 source semantics MG2: parent content digest 漂移')
  const augmentation = augmentR13ExistingSchemaAfterEnemy({
    parent: parentContent,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
  })
  const digest = stableJsonSha256({
    parent: R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST,
    evidence: augmentation.evidence.digest,
  })
  const prepared = Object.freeze({
    parentContent,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
    augmentation,
    digest,
  })
  preparedAuthorities.add(prepared)
  return prepared
}

function assertPreparedAuthority(
  authority: PreparedR13SourceSemanticsAuthority,
  args: {
    parent: MigrationSnapshot
    currentSources: PalMigrationSources
    currentMigration: MigrationFileSet
    preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  },
): void {
  if (!preparedAuthorities.has(authority))
    throw new Error('R13 source semantics MG2: prepared authority 不是本模块构建')
  if (
    authority.currentSources !== args.currentSources ||
    authority.currentMigration !== args.currentMigration ||
    authority.preparedCurrentSourceCensus !== args.preparedCurrentSourceCensus
  )
    throw new Error('R13 source semantics MG2: prepared authority 输入身份漂移')
  if (authority.parentContent !== contentView(args.parent)) {
    // contentView creates a new shell, so compare the immutable parent identity by digest rather
    // than object identity. The expensive source-backed augmentation itself remains branded.
    if (
      digestR13ExistingSchemaContentSnapshot(contentView(args.parent)) !==
      digestR13ExistingSchemaContentSnapshot(authority.parentContent)
    )
      throw new Error('R13 source semantics MG2: prepared parent 漂移')
  }
  assertR13ExistingSchemaFinalTargetClosure(
    authority.augmentation.snapshot,
    authority.augmentation.evidence,
  )
  const expectedDigest = stableJsonSha256({
    parent: R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST,
    evidence: authority.augmentation.evidence.digest,
  })
  if (authority.digest !== expectedDigest)
    throw new Error('R13 source semantics MG2: prepared authority 摘要漂移')
}

export function createR13SourceSemanticsV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  projectPrerequisites?: ReadonlyMap<string, MigrationJson>
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  preparedAuthority?: PreparedR13SourceSemanticsAuthority
}): R13SourceSemanticsV5MigrationPlan {
  assertPublishedEnemyParent(args.base)
  const sealMode = transitionState(args.base)
  assertProjectHasNoTransitionFiles(args.ours, 'project')
  assertWarmAmbiencePrerequisite(args)

  let authority: PreparedR13SourceSemanticsAuthority
  let publishedSeal: R13SourceSemanticsTransitionSealV1 | undefined
  let expectedSeal: R13SourceSemanticsTransitionSealV1
  if (sealMode === 'replay') {
    const raw = args.base.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH)
    const digest = recordDigest(raw, R13_SOURCE_SEMANTICS_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] !== digest)
      throw new Error('R13 source semantics MG2: seal 与 metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13SourceSemanticsTransitionSealV1
    assertR13ExistingSchemaAugmentationEvidence(publishedSeal.augmentation)
    if (
      publishedSeal.kind !== 'r13-source-semantics-transition' ||
      publishedSeal.version !== 1 ||
      publishedSeal.projectId !== 'pal' ||
      publishedSeal.transitionId !== R13_SOURCE_SEMANTICS_TRANSITION_ID
    )
      throw new Error('R13 source semantics MG2: published seal envelope 无效')
    const successorContent = contentView(args.base)
    assertR13ExistingSchemaFinalTargetClosure(successorContent, publishedSeal.augmentation)
    const parentContent = rewindR13ExistingSchemaAugmentation(
      successorContent,
      publishedSeal.augmentation,
    )
    const authorityArgs = {
      parent: parentContent,
      currentSources: args.currentSources,
      currentMigration: args.currentMigration,
      ...(args.preparedCurrentSourceCensus
        ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
        : {}),
    }
    if (args.preparedAuthority) {
      assertPreparedAuthority(args.preparedAuthority, authorityArgs)
      authority = args.preparedAuthority
    } else authority = prepareAuthority(authorityArgs)
    expectedSeal = buildSeal(authority.augmentation.evidence, R13_EXISTING_SCHEMA_CHANGED_PATHS)
    assertR13SourceSemanticsPublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  } else {
    const parentContent = contentView(args.base)
    if (args.preparedAuthority) {
      assertPreparedAuthority(args.preparedAuthority, {
        parent: parentContent,
        currentSources: args.currentSources,
        currentMigration: args.currentMigration,
        ...(args.preparedCurrentSourceCensus
          ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
          : {}),
      })
      authority = args.preparedAuthority
    } else {
      authority = prepareAuthority({
        parent: parentContent,
        currentSources: args.currentSources,
        currentMigration: args.currentMigration,
        ...(args.preparedCurrentSourceCensus
          ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
          : {}),
      })
    }
    expectedSeal = buildSeal(authority.augmentation.evidence, R13_EXISTING_SCHEMA_CHANGED_PATHS)
  }
  const baseContent = contentView(args.base)
  const oursContent = contentView(args.ours)
  const generated = authority.augmentation.snapshot
  const generatedContent = contentView(generated)
  assertNoTransitionControls(baseContent, 'base content')
  assertNoTransitionControls(oursContent, 'ours content')
  assertNoTransitionControls(generatedContent, 'generated content')
  const mergeBase = withoutAtomicMaps(baseContent)
  const mergeOurs = withoutAtomicMaps(oursContent)
  const mergeGenerated = withoutAtomicMaps(generatedContent)
  const plan = createMigrationPlan(mergeBase, mergeOurs, mergeGenerated)
  if (plan.conflicts.length)
    throw new Error(`R13 source semantics MG2: 三方 merge 冲突 ${JSON.stringify(plan.conflicts)}`)
  if (
    plan.target.has(R13_SOURCE_SEMANTICS_SEAL_PATH) ||
    plan.writes.has(R13_SOURCE_SEMANTICS_SEAL_PATH) ||
    plan.deletes.includes(R13_SOURCE_SEMANTICS_SEAL_PATH)
  )
    throw new Error('R13 source semantics MG2: control 泄漏到 plan')
  const unexpectedWrites = [...plan.writes.keys()].filter(
    (path) =>
      !R13_EXISTING_SCHEMA_CHANGED_PATHS.includes(
        path as (typeof R13_EXISTING_SCHEMA_CHANGED_PATHS)[number],
      ),
  )
  const unexpectedDeletes = plan.deletes.filter(
    (path) =>
      !R13_EXISTING_SCHEMA_CHANGED_PATHS.includes(
        path as (typeof R13_EXISTING_SCHEMA_CHANGED_PATHS)[number],
      ),
  )
  if (unexpectedWrites.length || unexpectedDeletes.length)
    throw new Error(
      `R13 source semantics MG2: 非 owned delta writes=${unexpectedWrites.join(',')} ` +
        `deletes=${unexpectedDeletes.join(',')}`,
    )
  const targetManaged = new Set([
    ...mergeBase.managedFiles,
    ...mergeOurs.managedFiles,
    ...mergeGenerated.managedFiles,
    ...plan.target.keys(),
  ])
  const target = targetSnapshot(plan, targetManaged)
  mergeUnownedAtomicMapRepresentation(target, baseContent, oursContent, generatedContent)
  assertTargetShape(target, 'target')
  commandClosureSnapshot(generatedContent, authority.augmentation.evidence)
  assertMergedOwnedClosure(target, authority.augmentation.evidence)

  const nextBaseline = cloneSnapshot(args.base)
  installAuthorityIntoBaseline(nextBaseline, authority.augmentation.snapshot)
  const seal = publishedSeal ?? expectedSeal
  installSeal(nextBaseline, seal)
  assertOldControlsBytePinned(args.base, nextBaseline)
  const expectedManaged = new Set([...args.base.managedFiles, R13_SOURCE_SEMANTICS_SEAL_PATH])
  if (!isDeepStrictEqual(nextBaseline.managedFiles, expectedManaged))
    throw new Error('R13 source semantics MG2: nextBaseline managed set 漂移')
  if (!nextBaseline.baselineMetadata)
    throw new Error('R13 source semantics MG2: nextBaseline metadata 缺失')
  if (nextBaseline.baselineMetadata.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] !== seal.digest)
    throw new Error('R13 source semantics MG2: nextBaseline transition digest 漂移')
  return {
    plan,
    target,
    nextBaseline,
    augmentation: authority.augmentation,
    seal,
    sealMode,
    authority,
  }
}

export function assertR13SourceSemanticsPublishedSealMatchesAuthority(
  published: unknown,
  expected: R13SourceSemanticsTransitionSealV1,
): void {
  if (!isDeepStrictEqual(published, expected))
    throw new Error('R13 source semantics MG2: published seal 与 authority 不符')
}
