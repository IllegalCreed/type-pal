import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../../migration-baseline.js'
import type { R13SourceSemanticsCanaryGoldenV1 } from './r13-source-semantics-canary.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'

export const PAL_TEST_ORACLE_METHOD = 'migrate-pal-oracle-v1' as const
export const PAL_TEST_ORACLE_MANIFEST =
  'packages/migrate/test-fixtures/pal-oracle/v1/manifest.json' as const

export const PAL_TEST_ORACLE_INPUT_PATHS = [
  'data/extracted/events/all.json',
  'packages/migrate/baselines/script-control-flow/pal-v1.json',
  'packages/migrate/baselines/pal/_state.json',
  'packages/migrate/baselines/pal/_transitions/c8-item-use-v5-v1.json',
  'packages/migrate/baselines/pal/_transitions/r13-cadence-v1.json',
  'packages/migrate/baselines/pal/_transitions/r13-confirm-v1.json',
  'packages/migrate/baselines/pal/_transitions/r13-cross-activation-v1.json',
  'packages/migrate/baselines/pal/_transitions/r13-enemy-script-v1.json',
  'packages/migrate/baselines/pal/_transitions/r13-item-throw-v1.json',
  'packages/migrate/baselines/pal/_transitions/script-v4-v5.json',
  'packages/migrate/baselines/pal/content/scenes/index.json',
  'packages/migrate/baselines/pal/content/items.json',
  'packages/migrate/baselines/pal/content/enemies.json',
  'packages/migrate/baselines/pal/content/locale.json',
  'projects/pal/manifest.json',
  'projects/pal/content/ambiences.json',
  'packages/migrate/test-fixtures/pal-oracle/v1/r13-source-semantics.json',
  'packages/migrate/.shadow/N3-1/v5/p6/ir/script-migration-ir.json',
  'packages/migrate/.shadow/N3-1/v5/p6/transitions/script-v4-v5.draft.json',
] as const

export const PAL_TEST_ORACLE_TREE_SPECS = [
  { role: 'extracted-source', root: 'data/extracted', selector: 'all' },
  { role: 'published-baseline', root: 'packages/migrate/baselines/pal', selector: 'all' },
  { role: 'project-prerequisite', root: 'projects/pal', selector: 'all' },
  {
    role: 'generated-shadow',
    root: 'packages/migrate/.shadow/N3-1/v5/p6',
    selector: 'all',
  },
  { role: 'producer-code', root: 'packages/migrate/src', selector: 'production-typescript' },
  { role: 'producer-code', root: 'packages/content/src', selector: 'production-typescript' },
  { role: 'producer-code', root: 'packages/reforge/src', selector: 'production-typescript' },
  { role: 'runtime-code', root: 'packages/shared/src', selector: 'production-typescript' },
] as const satisfies ReadonlyArray<
  Pick<PalTestOracleTreeFingerprintV1, 'role' | 'root' | 'selector'>
>

interface PalTestOracleInputV1 {
  path: string
  bytes: number
  sha256: string
}

export interface PalTestOracleTreeFingerprintV1 {
  role:
    | 'extracted-source'
    | 'published-baseline'
    | 'project-prerequisite'
    | 'producer-code'
    | 'runtime-code'
    | 'generated-shadow'
  root: string
  selector: 'all' | 'production-typescript'
  files: number
  bytes: number
  sha256: string
}

export interface PalTestOracleManifestV1 {
  kind: 'pal-test-oracle-manifest'
  version: 1
  methodVersion: typeof PAL_TEST_ORACLE_METHOD
  cacheFormatVersion: 1
  producerContractVersion: string
  profiles: {
    historicalR13_4: 'pal-v9-projected-v8'
    historicalR13_5: 'pal-v10-r13-5'
    current: 'pal-v10-r13-6a'
  }
  projection: string
  projectionSha256: string
  inputs: PalTestOracleInputV1[]
  inputTrees: PalTestOracleTreeFingerprintV1[]
}

interface PalTransitionProjectionV1 {
  digest: string
  fileSha256: string
  parentDigest: string | null
  kind: string
  version: number
}

export interface PalTestOracleProjectionV1 {
  kind: 'pal-test-oracle-projection'
  version: 1
  methodVersion: typeof PAL_TEST_ORACLE_METHOD
  generatorEpoch: string
  managedFiles: number
  transitions: Record<string, PalTransitionProjectionV1>
  scriptV4V5: {
    entries: number
    evidence: number
    groups: number
    canonicalTargets: number
    digest: string
  }
  releaseCore: {
    p2: string
    p3: string
    p4: string
  }
  proofs: {
    p6Ir: string
    p6Ledger: string
    sourceAudit: string
    canonicalProject: string
    compatibility: string
    sourceCensus: string
    executionSites: number
    crossDisposition: string
    crossRawContent: string
    crossAugmentedContent: string
    crossFinalContent: string
    cadenceEvidence: string
    cadenceLifecycle: string
    itemThrowEvidence: string
    confirmEvidence: string
    confirmDisposition: string
    confirmRuntime: string
    enemyAugmentation: string
    enemyDisposition: string
    enemyRuntime: string
    r13SourceSemantics: R13SourceSemanticsCanaryGoldenV1
  }
  content: {
    scenes: number
    items: number
    enemies: number
    localeKeys: number
  }
}

export interface PalTestOracleV1 {
  manifest: PalTestOracleManifestV1
  projection: PalTestOracleProjectionV1
}

let verifiedOracle: PalTestOracleV1 | undefined

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')

const RELEASE_CORE_DIGESTS = Object.freeze({
  p2: 'e29bfd90d470d1954a94445c0a9bab80984f7ccc265975d6e4146fcfe6449748',
  p3: 'd7102cbc361999e8b40e5184f755a91336ba29a0be4c48c68bf0f722af43c8be',
  p4: 'f33fcdbacf7a982188f3b5dc66da705e80b9759fc20bee1cfaf5cef9d2745d3f',
})

const TRANSITION_IDS = [
  'script-v4-v5',
  'c8-item-use-v5-v1',
  'r13-cadence-v1',
  'r13-cross-activation-v1',
  'r13-item-throw-v1',
  'r13-confirm-v1',
  'r13-enemy-script-v1',
  'r13-source-semantics-v1',
  'r13-6c-lossy-closure-v1',
  'r13-z-source-closure-v1',
  'b10-enemy-team-slots-v1',
] as const

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repo, path), 'utf8')) as T
}

function listTreeFiles(root: string, selector: PalTestOracleTreeFingerprintV1['selector']) {
  const absoluteRoot = resolve(repo, root)
  const files: string[] = []
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.isFile()) {
        if (
          selector === 'production-typescript' &&
          (!entry.name.endsWith('.ts') ||
            entry.name.endsWith('.test.ts') ||
            entry.name.endsWith('.d.ts'))
        )
          continue
        files.push(relative(absoluteRoot, absolute).split(sep).join('/'))
      } else {
        throw new Error(`PAL test oracle: ${relative(repo, absolute)} 不是普通文件`)
      }
    }
  }
  visit(absoluteRoot)
  return files.sort(stableStringCompare)
}

export function fingerprintPalTestOracleTree(
  tree: Pick<PalTestOracleTreeFingerprintV1, 'role' | 'root' | 'selector'>,
): PalTestOracleTreeFingerprintV1 {
  const hash = createHash('sha256')
  let bytes = 0
  const files = listTreeFiles(tree.root, tree.selector)
  for (const path of files) {
    const content = readFileSync(resolve(repo, tree.root, path))
    const contentDigest = sha256(content)
    bytes += content.byteLength
    hash.update(path)
    hash.update('\0')
    hash.update(String(content.byteLength))
    hash.update('\0')
    hash.update(contentDigest)
    hash.update('\n')
  }
  return { ...tree, files: files.length, bytes, sha256: hash.digest('hex') }
}

export function buildPalTestOracleManifest(
  projection: PalTestOracleProjectionV1 = buildPalTestOracleProjection(),
): PalTestOracleManifestV1 {
  const inputs = PAL_TEST_ORACLE_INPUT_PATHS.map((path) => {
    const content = readFileSync(resolve(repo, path))
    return { path, bytes: content.byteLength, sha256: sha256(content) }
  })
  return {
    kind: 'pal-test-oracle-manifest',
    version: 1,
    methodVersion: PAL_TEST_ORACLE_METHOD,
    cacheFormatVersion: 1,
    producerContractVersion: 'p2-p7-r13-6a-b10-v1',
    profiles: {
      historicalR13_4: 'pal-v9-projected-v8',
      historicalR13_5: 'pal-v10-r13-5',
      current: 'pal-v10-r13-6a',
    },
    projection: 'packages/migrate/test-fixtures/pal-oracle/v1/projection.json',
    projectionSha256: stableJsonSha256(projection),
    inputs,
    inputTrees: PAL_TEST_ORACLE_TREE_SPECS.map(fingerprintPalTestOracleTree),
  }
}

interface PublishedTransition {
  kind: string
  version: number
  digest: string
  parent?: { digest?: string }
  [key: string]: unknown
}

function transition(id: (typeof TRANSITION_IDS)[number]): PublishedTransition {
  return readJson<PublishedTransition>(`packages/migrate/baselines/pal/_transitions/${id}.json`)
}

function objectAt(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`PAL test oracle: ${label} 缺失`)
  return value as Record<string, unknown>
}

function stringAt(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`PAL test oracle: ${label} 缺失`)
  return value
}

function numberAt(value: unknown, label: string): number {
  if (typeof value !== 'number') throw new Error(`PAL test oracle: ${label} 缺失`)
  return value
}

/** Rebuilds only the compact projection from already-published canonical artifacts. */
export function buildPalTestOracleProjection(): PalTestOracleProjectionV1 {
  const state = readJson<{
    generatorEpoch: string
    managedFiles: string[]
    transitions: Record<string, string>
  }>('packages/migrate/baselines/pal/_state.json')
  const published = Object.fromEntries(TRANSITION_IDS.map((id) => [id, transition(id)]))
  const v4 = published['script-v4-v5']!
  const cadence = published['r13-cadence-v1']!
  const cross = published['r13-cross-activation-v1']!
  const itemThrow = published['r13-item-throw-v1']!
  const confirm = published['r13-confirm-v1']!
  const enemy = published['r13-enemy-script-v1']!
  const v4Previous = objectAt(v4.previousPhase, 'script-v4-v5.previousPhase')
  const v4SourceAudit = objectAt(v4.sourceAudit, 'script-v4-v5.sourceAudit')
  const v4To = objectAt(v4.to, 'script-v4-v5.to')
  const v4Compatibility = objectAt(v4.compatibility, 'script-v4-v5.compatibility')
  const cadenceEvidence = objectAt(cadence.evidence, 'r13-cadence.evidence')
  const crossEvidence = objectAt(cross.evidence, 'r13-cross.evidence')
  const crossSource = objectAt(crossEvidence.sourceControl, 'r13-cross.sourceControl')
  const crossGenerator = objectAt(
    crossSource.dispositionGenerator,
    'r13-cross.dispositionGenerator',
  )
  const itemEvidence = objectAt(itemThrow.evidence, 'r13-item-throw.evidence')
  const confirmEvidence = objectAt(confirm.evidence, 'r13-confirm.evidence')
  const confirmAudits = objectAt(confirm.audits, 'r13-confirm.audits')
  const confirmSource = objectAt(confirmAudits.sourceControl, 'r13-confirm.sourceControl')
  const confirmRuntime = objectAt(confirmAudits.runtimeExecution, 'r13-confirm.runtime')
  const enemyAugmentation = objectAt(enemy.augmentation, 'r13-enemy.augmentation')
  const enemyAudits = objectAt(enemy.audits, 'r13-enemy.audits')
  const enemySource = objectAt(enemyAudits.sourceControl, 'r13-enemy.sourceControl')
  const enemyRuntime = objectAt(enemyAudits.runtimeExecution, 'r13-enemy.runtime')
  const r13SourceSemantics = readJson<R13SourceSemanticsCanaryGoldenV1>(
    'packages/migrate/test-fixtures/pal-oracle/v1/r13-source-semantics.json',
  )
  const { digest: r13GoldenDigest, ...r13GoldenBody } = r13SourceSemantics
  if (stableJsonSha256(r13GoldenBody) !== r13GoldenDigest)
    throw new Error('PAL test oracle: R13-6A canary golden 自摘要不符')
  const crossSummary = objectAt(crossSource.summary, 'r13-cross.sourceControl.summary')
  const sceneIndex = readJson<unknown[]>('packages/migrate/baselines/pal/content/scenes/index.json')
  const items = readJson<unknown[]>('packages/migrate/baselines/pal/content/items.json')
  const enemies = readJson<unknown[]>('packages/migrate/baselines/pal/content/enemies.json')
  const locale = readJson<Record<string, unknown>>(
    'packages/migrate/baselines/pal/content/locale.json',
  )

  return {
    kind: 'pal-test-oracle-projection',
    version: 1,
    methodVersion: PAL_TEST_ORACLE_METHOD,
    generatorEpoch: state.generatorEpoch,
    managedFiles: state.managedFiles.length,
    transitions: Object.fromEntries(
      TRANSITION_IDS.map((id) => {
        const value = published[id]!
        return [
          id,
          {
            digest: value.digest,
            fileSha256: sha256(
              readFileSync(resolve(repo, `packages/migrate/baselines/pal/_transitions/${id}.json`)),
            ),
            parentDigest: value.parent?.digest ?? null,
            kind: value.kind,
            version: value.version,
          },
        ]
      }),
    ) as Record<string, PalTransitionProjectionV1>,
    scriptV4V5: {
      entries: (v4.entries as unknown[]).length,
      evidence: (v4.evidence as unknown[]).length,
      groups: (v4.groups as unknown[]).length,
      canonicalTargets: (v4.canonicalTargets as unknown[]).length,
      digest: v4.digest,
    },
    releaseCore: { ...RELEASE_CORE_DIGESTS },
    proofs: {
      p6Ir: stringAt(v4Previous.irDigest, 'p6.ir'),
      p6Ledger: stringAt(v4Previous.ledgerDigest, 'p6.ledger'),
      sourceAudit: stringAt(v4SourceAudit.digest, 'source.audit'),
      canonicalProject: stringAt(v4To.canonicalScriptProjectDigest, 'canonical.project'),
      compatibility: stringAt(v4Compatibility.digest, 'compatibility'),
      sourceCensus: stringAt(crossSource.censusDigest, 'source.census'),
      executionSites: numberAt(crossSummary.executionSites, 'source.executionSites'),
      crossDisposition: stringAt(crossSource.dispositionDigest, 'cross.disposition'),
      crossRawContent: stringAt(crossGenerator.rawDigest, 'cross.raw'),
      crossAugmentedContent: stringAt(crossGenerator.augmentedDigest, 'cross.augmented'),
      crossFinalContent: stringAt(crossGenerator.finalDigest, 'cross.final'),
      cadenceEvidence: stringAt(cadenceEvidence.digest, 'cadence.evidence'),
      cadenceLifecycle: stringAt(
        objectAt(cadenceEvidence.lifecycleReport, 'cadence.lifecycle').digest,
        'cadence.lifecycle.digest',
      ),
      itemThrowEvidence: stringAt(itemEvidence.digest, 'itemThrow.evidence'),
      confirmEvidence: stringAt(confirmEvidence.digest, 'confirm.evidence'),
      confirmDisposition: stringAt(confirmSource.reportDigest, 'confirm.disposition'),
      confirmRuntime: stringAt(confirmRuntime.reportDigest, 'confirm.runtime'),
      enemyAugmentation: stringAt(enemyAugmentation.digest, 'enemy.augmentation'),
      enemyDisposition: stringAt(enemySource.reportDigest, 'enemy.disposition'),
      enemyRuntime: stringAt(enemyRuntime.reportDigest, 'enemy.runtime'),
      r13SourceSemantics,
    },
    content: {
      scenes: sceneIndex.length,
      items: items.length,
      enemies: enemies.length,
      localeKeys: Object.keys(locale).length,
    },
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child, seen)
  return Object.freeze(value)
}

function assertHexDigest(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value))
    throw new Error(`PAL test oracle: ${label} digest 非法`)
}

export function assertPalTestOracle(value: PalTestOracleV1): void {
  const { manifest, projection } = value
  if (
    manifest.kind !== 'pal-test-oracle-manifest' ||
    manifest.version !== 1 ||
    manifest.methodVersion !== PAL_TEST_ORACLE_METHOD ||
    manifest.cacheFormatVersion !== 1 ||
    projection.kind !== 'pal-test-oracle-projection' ||
    projection.version !== 1 ||
    projection.methodVersion !== PAL_TEST_ORACLE_METHOD
  )
    throw new Error('PAL test oracle: header 漂移')
  if (!manifest.producerContractVersion) throw new Error('PAL test oracle: producer contract 缺失')
  if (
    manifest.profiles.historicalR13_4 !== 'pal-v9-projected-v8' ||
    manifest.profiles.historicalR13_5 !== 'pal-v10-r13-5' ||
    manifest.profiles.current !== 'pal-v10-r13-6a'
  )
    throw new Error('PAL test oracle: profile 身份漂移')
  if (
    manifest.inputs.map((input) => input.path).join('\n') !== PAL_TEST_ORACLE_INPUT_PATHS.join('\n')
  )
    throw new Error('PAL test oracle: input allowlist 漂移')
  const expectedTreeKeys = PAL_TEST_ORACLE_TREE_SPECS.map(
    (tree) => `${tree.role}\0${tree.root}\0${tree.selector}`,
  ).join('\n')
  const actualTreeKeys = manifest.inputTrees
    .map((tree) => `${tree.role}\0${tree.root}\0${tree.selector}`)
    .join('\n')
  if (actualTreeKeys !== expectedTreeKeys)
    throw new Error('PAL test oracle: input tree allowlist 漂移')
  assertHexDigest(manifest.projectionSha256, 'projection')
  if (stableJsonSha256(projection) !== manifest.projectionSha256)
    throw new Error('PAL test oracle: projection digest 漂移')
  const r13Golden = projection.proofs.r13SourceSemantics
  if (
    r13Golden.kind !== 'r13-source-semantics-canary-golden' ||
    r13Golden.version !== 1 ||
    r13Golden.transitionId !== 'r13-source-semantics-v1'
  )
    throw new Error('PAL test oracle: R13-6A canary golden header 漂移')
  const { digest: r13GoldenDigest, ...r13GoldenBody } = r13Golden
  assertHexDigest(r13GoldenDigest, 'r13-6a.golden')
  if (stableJsonSha256(r13GoldenBody) !== r13GoldenDigest)
    throw new Error('PAL test oracle: R13-6A canary golden digest 漂移')
  for (const [label, value] of Object.entries(r13Golden)) {
    if (label.endsWith('Digest') && label !== 'digest') assertHexDigest(value, `r13-6a.${label}`)
  }

  const inputPaths = manifest.inputs.map((input) => input.path)
  if (new Set(inputPaths).size !== inputPaths.length)
    throw new Error('PAL test oracle: input path 必须唯一')
  for (const input of manifest.inputs) {
    assertHexDigest(input.sha256, input.path)
    const absolute = resolve(repo, input.path)
    const bytes = statSync(absolute).size
    if (bytes !== input.bytes)
      throw new Error(`PAL test oracle: ${input.path} bytes 漂移 ${bytes} != ${input.bytes}`)
    const digest = sha256(readFileSync(absolute))
    if (digest !== input.sha256) throw new Error(`PAL test oracle: ${input.path} sha256 漂移`)
  }

  const treeKeys = manifest.inputTrees.map((tree) => `${tree.role}\0${tree.root}\0${tree.selector}`)
  if (new Set(treeKeys).size !== treeKeys.length)
    throw new Error('PAL test oracle: input tree 必须唯一')
  for (const expected of manifest.inputTrees) {
    assertHexDigest(expected.sha256, `${expected.root}.tree`)
    const actual = fingerprintPalTestOracleTree(expected)
    if (
      actual.files !== expected.files ||
      actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256
    )
      throw new Error(`PAL test oracle: ${expected.root} tree fingerprint 漂移`)
  }

  if (stableJsonSha256(buildPalTestOracleProjection()) !== manifest.projectionSha256)
    throw new Error('PAL test oracle: published projection 漂移')

  const state = readJson<{
    generatorEpoch: string
    managedFiles: string[]
    transitions: Record<string, string>
  }>('packages/migrate/baselines/pal/_state.json')
  if (
    state.generatorEpoch !== projection.generatorEpoch ||
    state.managedFiles.length !== projection.managedFiles
  )
    throw new Error('PAL test oracle: baseline state summary 漂移')
  if (
    Object.keys(state.transitions).sort(stableStringCompare).join('\n') !==
    Object.keys(projection.transitions).sort(stableStringCompare).join('\n')
  )
    throw new Error('PAL test oracle: transition 集合漂移')
  for (const [transitionId, expected] of Object.entries(projection.transitions)) {
    assertHexDigest(expected.digest, `${transitionId}.self`)
    assertHexDigest(expected.fileSha256, `${transitionId}.file`)
    if (expected.parentDigest !== null)
      assertHexDigest(expected.parentDigest, `${transitionId}.parent`)
    if (state.transitions[transitionId] !== expected.digest)
      throw new Error(`PAL test oracle: ${transitionId} state digest 漂移`)
    const transition = readJson<{
      kind: string
      version: number
      digest: string
      parent?: { digest?: string }
    }>(`packages/migrate/baselines/pal/_transitions/${transitionId}.json`)
    if (
      transition.kind !== expected.kind ||
      transition.version !== expected.version ||
      transition.digest !== expected.digest ||
      (transition.parent?.digest ?? null) !== expected.parentDigest
    )
      throw new Error(`PAL test oracle: ${transitionId} projection 漂移`)
  }
}

export function loadPalTestOracle(): PalTestOracleV1 {
  if (verifiedOracle) return verifiedOracle
  const manifest = readJson<PalTestOracleManifestV1>(PAL_TEST_ORACLE_MANIFEST)
  const projection = readJson<PalTestOracleProjectionV1>(manifest.projection)
  const value = { manifest, projection }
  assertPalTestOracle(value)
  verifiedOracle = deepFreeze(value)
  return verifiedOracle
}
