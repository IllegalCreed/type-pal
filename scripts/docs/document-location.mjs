import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { join, posix } from 'node:path'
import { loadCompressedArtifacts } from './artifact-compression.mjs'
import { loadArtifactContentAliases } from './artifact-content-alias.mjs'
import {
  artifactRetirementReplayRoots,
  loadArtifactRetirements,
  readArtifactRetirementRows,
} from './artifact-retirement.mjs'
import { documentLocationAdmission } from './document-location-admission.mjs'
import { markdownLinks } from './markdown.mjs'
import { preservedMarkdownRanges } from './markdown-source-spans.mjs'
import { rewriteLinks } from './relocate.mjs'
import { fileState } from './review-record-storage-io.mjs'
import {
  assertTestingAcquisitionSourceBridge,
  isTestingAcquisitionSourceBridgePath,
  isTestingAcquisitionSourcePath,
  testingAcquisitionSourceBase,
} from './testing-acquisition-source-bridge.mjs'
import {
  assertTestingBattleClosureAddition,
  assertTestingBattleEvidence,
  assertTestingBattlePublication,
  assertTestingBattleSessionSourceBridge,
  assertTestingProjectVictoryVersionSource,
  isTestingBattleCasualtyRosterSource,
  isTestingBattleClosureSource,
  isTestingBattleConditionalSpellSource,
  isTestingBattleCooperativeRosterSource,
  isTestingBattleDefeatSourcePath,
  isTestingBattleEnemyColorSource,
  isTestingBattleEnemyTransformSource,
  isTestingBattleEscapeSpellSource,
  isTestingBattleEvidencePath,
  isTestingBattleGuAndConfusionSource,
  isTestingBattleHandoffHistoricalSource,
  isTestingBattleHidingSource,
  isTestingBattleItemUseSource,
  isTestingBattleLearnedSkillsSource,
  isTestingBattleLifecycleSource,
  isTestingBattlePoisonNarrationSource,
  isTestingBattleQualitySource,
  isTestingBattleReviewSource,
  isTestingBattleSceneObserverSource,
  isTestingBattleSessionEvidencePath,
  isTestingBattleSpellCurrencySource,
  isTestingBattleSpellFeedbackSource,
  isTestingBattleSummonDivisionSource,
  isTestingBattleSummonSource,
  isTestingBattleThrowStatusSource,
  isTestingBattleWindBlowSource,
  isTestingCliffEntrySource,
  isTestingMenuIsolationSource,
  isTestingPartyPoseSource,
  isTestingQ2CoverageSource,
  isTestingQ2DaliRainSource,
  isTestingQ2DaliSource,
  isTestingQ2DisplaySource,
  isTestingQ2EntryAutoSource,
  isTestingQ2EscortsSource,
  isTestingQ2ForestInnSource,
  isTestingQ2GaiLuojiaoSource,
  isTestingQ2InnSource,
  isTestingQ2NoticeSource,
  isTestingQ2PalaceSource,
  isTestingQ2PeachSource,
  isTestingQ2PhoenixSource,
  isTestingQ2PlacementSource,
  isTestingQ2RingSource,
  isTestingQ2RooftopSource,
  isTestingQ2ShangshuSource,
  isTestingQ2StoneElderSource,
  isTestingQ2TianGhostSource,
  isTestingQ2TombSource,
  isTestingQ2TowerFoxSource,
  isTestingQ2TowerMingSource,
  isTestingReforgeBattleCloseoutSource,
  isTestingRuntimeOwnershipSource,
  isTestingSceneItemExitSource,
  isTestingStoryPresentationSource,
  isTestingWorldAwarenessSource,
  isTestingWorldItemTargetSource,
  restoreTestingBattleActionCadenceSourceBindings,
  restoreTestingBattleCasualtyRosterSourceBindings,
  restoreTestingBattleClosureSourceBindings,
  restoreTestingBattleConditionalSpellSourceBindings,
  restoreTestingBattleCooperativeRosterSourceBindings,
  restoreTestingBattleDefeatSourceBindings,
  restoreTestingBattleEnemyColorSourceBindings,
  restoreTestingBattleEnemySpellShakeSourceBindings,
  restoreTestingBattleEnemyTransformSourceBindings,
  restoreTestingBattleEscapeSpellSourceBindings,
  restoreTestingBattleGuAndConfusionSourceBindings,
  restoreTestingBattleHandoffSourceBindings,
  restoreTestingBattleHidingSourceBindings,
  restoreTestingBattleItemUseSourceBindings,
  restoreTestingBattleLearnedSkillsSourceBindings,
  restoreTestingBattleLifecycleSourceBindings,
  restoreTestingBattlePoisonNarrationSourceBindings,
  restoreTestingBattleQualitySourceBindings,
  restoreTestingBattleReviewSourceBindings,
  restoreTestingBattleSceneObserverSourceBindings,
  restoreTestingBattleScriptedShakeSourceBindings,
  restoreTestingBattleSpellCurrencySourceBindings,
  restoreTestingBattleSpellFeedbackSourceBindings,
  restoreTestingBattleSummonDivisionSourceBindings,
  restoreTestingBattleSummonPlaybackSourceBindings,
  restoreTestingBattleSummonSourceBindings,
  restoreTestingBattleThrowStatusSourceBindings,
  restoreTestingBattleVictorySourceBindings,
  restoreTestingBattleWindBlowSourceBindings,
  restoreTestingCliffEntrySourceBindings,
  restoreTestingMenuIsolationSourceBindings,
  restoreTestingPartyPoseSourceBindings,
  restoreTestingProjectVictoryVersionBindings,
  restoreTestingQ2CoverageSourceBindings,
  restoreTestingQ2DaliRainSourceBindings,
  restoreTestingQ2DaliSourceBindings,
  restoreTestingQ2DisplaySourceBindings,
  restoreTestingQ2EntryAutoSourceBindings,
  restoreTestingQ2EscortsSourceBindings,
  restoreTestingQ2ForestInnSourceBindings,
  restoreTestingQ2GaiLuojiaoSourceBindings,
  restoreTestingQ2InnSourceBindings,
  restoreTestingQ2NoticeSourceBindings,
  restoreTestingQ2PalaceSourceBindings,
  restoreTestingQ2PeachSourceBindings,
  restoreTestingQ2PhoenixSourceBindings,
  restoreTestingQ2PlacementSourceBindings,
  restoreTestingQ2RingSourceBindings,
  restoreTestingQ2RooftopSourceBindings,
  restoreTestingQ2ShangshuSourceBindings,
  restoreTestingQ2StoneElderSourceBindings,
  restoreTestingQ2TianGhostSourceBindings,
  restoreTestingQ2TombSourceBindings,
  restoreTestingQ2TowerFoxSourceBindings,
  restoreTestingQ2TowerMingSourceBindings,
  restoreTestingReforgeBattleCloseoutBindings,
  restoreTestingRuntimeOwnershipSourceBindings,
  restoreTestingSceneItemExitSourceBindings,
  restoreTestingStoryPresentationSourceBindings,
  restoreTestingWorldAwarenessSourceBindings,
  restoreTestingWorldItemTargetSourceBindings,
  testingBattleActionCadencePublicationBase,
  testingBattleCasualtyRosterPublicationBase,
  testingBattleClosurePublicationBase,
  testingBattleConditionalSpellPublicationBase,
  testingBattleCooperativeRosterPublicationBase,
  testingBattleDefeatSourceRevision,
  testingBattleEnemyColorPublicationBase,
  testingBattleEnemySpellShakePublicationBase,
  testingBattleEnemyTransformPublicationBase,
  testingBattleEscapeSpellPublicationBase,
  testingBattleGuAndConfusionPublicationBase,
  testingBattleHandoffPublicationBase,
  testingBattleHandoffSourceRevision,
  testingBattleHidingPublicationBase,
  testingBattleItemUsePublicationBase,
  testingBattleLearnedSkillsPublicationBase,
  testingBattleLifecyclePublicationBase,
  testingBattlePoisonNarrationPublicationBase,
  testingBattlePublicationBase,
  testingBattleQualityPublicationBase,
  testingBattleReviewPublicationBase,
  testingBattleSceneObserverPublicationBase,
  testingBattleScriptedShakePublicationBase,
  testingBattleSessionCadenceBase,
  testingBattleSessionCasualtyBase,
  testingBattleSessionCasualtyDialogueBase,
  testingBattleSessionCooperativeRecoveryBase,
  testingBattleSessionEnemyCastBase,
  testingBattleSessionItemEffectsBase,
  testingBattleSessionMechanismBase,
  testingBattleSessionPlayerActionsBase,
  testingBattleSessionPortraitBase,
  testingBattleSessionPresentationBase,
  testingBattleSessionSourcePath,
  testingBattleSessionSpecialStatusBase,
  testingBattleSessionThrowFeedbackBase,
  testingBattleSpellCurrencyPublicationBase,
  testingBattleSpellFeedbackPublicationBase,
  testingBattleSummonDivisionPublicationBase,
  testingBattleSummonPlaybackPublicationBase,
  testingBattleSummonPublicationBase,
  testingBattleThrowStatusPublicationBase,
  testingBattleVictoryPublicationBase,
  testingBattleVictorySourceRevision,
  testingBattleWindBlowPublicationBase,
  testingCliffEntryPublicationBase,
  testingMenuIsolationPublicationBase,
  testingPartyPosePublicationBase,
  testingProjectVictoryPublicationBase,
  testingProjectVictoryVersionPath,
  testingQ2CoveragePublicationBase,
  testingQ2DaliPublicationBase,
  testingQ2DaliRainPublicationBase,
  testingQ2DisplayPublicationBase,
  testingQ2EntryAutoPublicationBase,
  testingQ2EscortsPublicationBase,
  testingQ2ForestInnPublicationBase,
  testingQ2GaiLuojiaoPublicationBase,
  testingQ2InnPublicationBase,
  testingQ2NoticePublicationBase,
  testingQ2PalacePublicationBase,
  testingQ2PeachPublicationBase,
  testingQ2PhoenixPublicationBase,
  testingQ2PlacementPublicationBase,
  testingQ2RingPublicationBase,
  testingQ2RooftopPublicationBase,
  testingQ2ShangshuPublicationBase,
  testingQ2StoneElderPublicationBase,
  testingQ2TianGhostPublicationBase,
  testingQ2TombPublicationBase,
  testingQ2TowerFoxPublicationBase,
  testingQ2TowerMingPublicationBase,
  testingReforgeBattleCloseoutBase,
  testingRuntimeOwnershipPublicationBase,
  testingSceneItemExitPublicationBase,
  testingStoryPresentationPublicationBase,
  testingWorldAwarenessPublicationBase,
  testingWorldItemTargetPublicationBase,
} from './testing-battle-publication.mjs'
import { loadTestingContentVersionRebinding } from './testing-content-version-rebinding.mjs'
import {
  assertTestingChestSourceBridge,
  assertTestingPalaceStagePublication,
  assertTestingSourceBridge,
  assertTestingStageEvidence,
  assertTestingStagePublication,
  isPublishedTestingStagePath,
  isTestingChestSourceBridgePath,
  isTestingSourceBridgePath,
  isTestingStageEvidencePath,
  testingChestSourcePath,
} from './testing-source-bridge.mjs'
import { assertTestingSourceMaintenance } from './testing-source-maintenance.mjs'
import { testingSourceMaintenanceAdmissions } from './testing-source-maintenance-admission.mjs'

export const documentLocationManifest = 'docs/phase-governance/document-locations.json'
const testingCatalogPath = 'docs/testing/catalog.json'
export const fixedGitSourceUrl = (path, revision = documentLocationAdmission.baseRevision) =>
  `https://github.com/IllegalCreed/type-pal/blob/${revision}/${path.split('/').map(encodeURIComponent).join('/')}`
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const blobHash = (bytes) =>
  createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
const rules = [
  ['docs/ops/guides/README.md', 'docs/engineering/README.md'],
  ['docs/ops/archive/tasks/done', 'docs/tasks/archive/done'],
  ['docs/ops/archive/tasks/cancelled', 'docs/tasks/archive/cancelled'],
  ['docs/ops/archive/protocols', 'docs/engineering/archive/protocols'],
  ['docs/ops/archive/tasks/README.md', 'docs/tasks/archive/task-history.md'],
  ['docs/ops/archive/tasks', 'docs/tasks/archive'],
  ['docs/ops/archive', 'docs/tasks/archive'],
  ['docs/ops/tasks', 'docs/tasks/cards'],
  ['docs/ops/evidence', 'docs/tasks/evidence'],
  ['docs/ops/audits', 'docs/tasks/audits'],
  ['docs/ops/templates', 'docs/tasks/templates'],
  ['docs/ops/guides', 'docs/engineering/guides'],
  ['docs/ops/board.md', 'docs/tasks/board.md'],
  ['docs/ops/README.md', 'docs/tasks/README.md'],
  ...['agent-workflow', 'code-quality', 'document-quality'].map((name) => [
    `docs/ops/${name}.md`,
    `docs/engineering/guides/${name}.md`,
  ]),
]

/** A historical identity is stable; only its live checkout location changes. */
export function currentDocumentPath(path) {
  const rule = rules.find(([from]) => path === from || path.startsWith(`${from}/`))
  return rule ? rule[1] + path.slice(rule[0].length) : path
}

function preservedSpans(text) {
  return preservedMarkdownRanges(text).map((range) => range.text)
}

/** Only visible Markdown destinations change. Prose, fenced commands, native
 * artifacts, and explicitly preserved source spans remain byte-for-byte intact. */
export function transformDocument(
  text,
  from,
  to = currentDocumentPath(from),
  storagePath = (path) => path,
) {
  assert(from.endsWith('.md'), 'mechanical document transform requires Markdown')
  const mapping = {
    get: (path) =>
      path === 'CLAUDE.md' ? fixedGitSourceUrl(path) : storagePath(currentDocumentPath(path)),
  }
  return rewriteLinks(text, from, to, mapping, { protectedRanges: preservedMarkdownRanges(text) })
}

function safePath(path) {
  assert(
    typeof path === 'string' &&
      path.length > 0 &&
      !/[:\\]/u.test(path) &&
      [...path].every((character) => character.codePointAt(0) > 31) &&
      path.split('/').every((part) => part && !['.', '..', '.git'].includes(part)),
    `document location: unsafe path: ${path}`,
  )
  return path
}

function ordinaryBytes(root, path) {
  safePath(path)
  return fileState(root, path, undefined, '').buffer ?? undefined
}

function reviewValid(review, path) {
  // `reviewedLines` is retained as the manifest field name but measures only
  // candidate body extent. It proves neither reading nor independent review;
  // those claims belong to the Owner-admitted conclusion/acceptance scope.
  assert(
    review &&
      ['author', 'reviewer', 'conclusion'].every(
        (key) => typeof review[key] === 'string' && review[key].trim(),
      ) &&
      review.author !== review.reviewer &&
      /^\d{4}-\d{2}-\d{2}$/u.test(review.date ?? '') &&
      Number.isSafeInteger(review.reviewedLines) &&
      review.reviewedLines > 0,
    `document location: independent acceptance record missing: ${path}`,
  )
}

const managedRoots = [
  'docs/tasks',
  'docs/engineering',
  'docs/phase-governance',
  ...artifactRetirementReplayRoots,
]
const managedPath = (path) => managedRoots.some((root) => path.startsWith(`${root}/`))
function currentInventory(root, directories) {
  const paths = []
  const visit = (directory) => {
    let entries
    try {
      entries = readdirSync(join(root, directory), { withFileTypes: true })
    } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      const path = `${directory}/${entry.name}`
      assert(!entry.isSymbolicLink(), `nonordinary migration inventory: ${path}`)
      if (entry.isDirectory()) visit(path)
      else {
        assert(entry.isFile(), `nonordinary migration inventory: ${path}`)
        paths.push(path)
      }
    }
  }
  for (const directory of directories) visit(directory)
  return paths.sort()
}

function gitTree(root, revision, requiredPaths) {
  assert(/^[a-f\d]{40}$/u.test(revision), 'document location: fixed commit required')
  const run = (args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 })
  assert.equal(
    run(['cat-file', '-t', revision]).toString().trim(),
    'commit',
    'document location: source revision is not a commit',
  )
  const entries = new Map()
  for (const row of run(['ls-tree', '-rlz', '--full-tree', revision]).toString().split('\0')) {
    if (!row) continue
    const match = /^(\d{6}) (\w+) ([a-f\d]{40}) +(-|\d+)\t(.+)$/u.exec(row)
    assert(match, 'document location: invalid fixed tree')
    entries.set(match[5], {
      mode: match[1],
      type: match[2],
      object: match[3],
      bytes: match[4] === '-' ? undefined : Number(match[4]),
    })
  }
  const cache = new Map()
  const blobLimit = 32 * 1024 * 1024,
    cacheLimit = 128 * 1024 * 1024,
    cacheCountLimit = 4096,
    batchCountLimit = 512
  let cachedBytes = 0
  const remember = (object, bytes) => {
    while (cache.size >= cacheCountLimit || cachedBytes + bytes.length > cacheLimit) {
      const oldest = cache.keys().next().value
      cachedBytes -= cache.get(oldest).length
      cache.delete(oldest)
    }
    cache.set(object, bytes)
    cachedBytes += bytes.length
  }
  const batch = (wanted) => {
    if (!wanted.length) return
    const result = spawnSync('git', ['cat-file', '--batch'], {
      cwd: root,
      input: `${wanted.map((entry) => entry.object).join('\n')}\n`,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: blobLimit + batchCountLimit * 128,
    })
    assert(
      !result.error && !result.signal && result.status === 0 && result.stderr.length === 0,
      'document location: fixed Git batch failed or emitted diagnostics',
    )
    let offset = 0
    for (const entry of wanted) {
      const end = result.stdout.indexOf(10, offset)
      const header =
        end >= 0 &&
        /^([a-f\d]{40}) blob (0|[1-9]\d*)$/u.exec(result.stdout.subarray(offset, end).toString())
      assert(
        header && header[1] === entry.object,
        'document location: fixed Git batch framing/object differs',
      )
      const length = Number(header[2])
      assert(
        Number.isSafeInteger(length) && length <= blobLimit && length === entry.bytes,
        'document location: fixed Git batch extent differs',
      )
      const bytes = result.stdout.subarray(end + 1, end + 1 + length)
      assert(
        bytes.length === length && result.stdout[end + 1 + length] === 10,
        'document location: fixed Git batch payload truncated',
      )
      assert.equal(
        blobHash(bytes),
        entry.object,
        'document location: fixed Git batch content drift',
      )
      remember(entry.object, Buffer.from(bytes))
      offset = end + 2 + length
    }
    assert.equal(offset, result.stdout.length, 'document location: trailing Git batch payload')
  }
  // Only this admitted manifest's mandatory reads are prefetched. Bound both
  // retained bytes and each subprocess; unrelated paths still use the lazy read.
  const prefetch = (paths) => {
    const wanted = new Map()
    let prefetchedBytes = 0
    for (const path of paths) {
      const entry = entries.get(path)
      if (
        entry?.mode !== '100644' ||
        entry.type !== 'blob' ||
        wanted.has(entry.object) ||
        wanted.size >= cacheCountLimit ||
        !Number.isSafeInteger(entry.bytes) ||
        entry.bytes < 0 ||
        entry.bytes > blobLimit ||
        prefetchedBytes + entry.bytes > cacheLimit
      )
        continue
      wanted.set(entry.object, entry)
      prefetchedBytes += entry.bytes
    }
    let pending = [],
      pendingBytes = 0
    for (const entry of wanted.values()) {
      if (cache.has(entry.object)) {
        const bytes = cache.get(entry.object)
        cache.delete(entry.object)
        cache.set(entry.object, bytes)
        continue
      }
      if (pending.length === batchCountLimit || pendingBytes + entry.bytes > blobLimit) {
        batch(pending)
        pending = []
        pendingBytes = 0
      }
      pending.push(entry)
      pendingBytes += entry.bytes
    }
    batch(pending)
  }
  prefetch(requiredPaths)
  const read = (path) => {
    const entry = entries.get(path)
    if (!entry) return undefined
    assert(entry.mode === '100644' && entry.type === 'blob', `nonordinary source: ${path}`)
    if (!cache.has(entry.object)) {
      const bytes = run(['cat-file', 'blob', entry.object])
      assert.equal(blobHash(bytes), entry.object, `fixed source object drift: ${path}`)
      remember(entry.object, bytes)
    }
    return Buffer.from(cache.get(entry.object))
  }
  return { entries, read, prefetch }
}

/** The manifest is a bounded, separately admitted change set. It never rewrites
 * old registry/review identities, source pins, ownership, or semantic signatures. */
export function loadDocumentLocations(root, admission = documentLocationAdmission) {
  const manifestBytes = ordinaryBytes(root, documentLocationManifest)
  if (!manifestBytes) {
    assert(!admission.manifestSha256, 'document location: admitted manifest missing')
    return undefined
  }
  assert.equal(
    hash(manifestBytes),
    admission.manifestSha256,
    'document location: unaccepted manifest',
  )
  assert(manifestBytes.length <= 1_048_576, 'document location: root manifest exceeds 1 MiB')
  const manifest = JSON.parse(manifestBytes)
  assert(
    manifest.schemaVersion === 1 &&
      manifest.kind === 'document-location-migration' &&
      manifest.baseRevision === admission.baseRevision &&
      ['documents', 'additions', 'retired'].every((key) => Array.isArray(manifest[key])) &&
      (manifest.artifacts === undefined || Array.isArray(manifest.artifacts)) &&
      (manifest.artifactAliases === undefined || Array.isArray(manifest.artifactAliases)) &&
      (manifest.compressedArtifacts === undefined || Array.isArray(manifest.compressedArtifacts)) &&
      (manifest.retiredArtifacts === undefined ||
        Array.isArray(manifest.retiredArtifacts) ||
        (manifest.retiredArtifacts && typeof manifest.retiredArtifacts === 'object')),
    'document location: invalid contract or frozen source revision',
  )
  const physicalState = (path, parents) => fileState(root, safePath(path), parents, '')
  const retirementList = readArtifactRetirementRows({
    declaration: manifest.retiredArtifacts,
    artifacts: manifest.artifacts,
    readState: physicalState,
    safePath,
  })
  const requiredSourcePaths = [
    ...manifest.documents.map((row) => row.path),
    ...manifest.retired.map((row) => row.path),
    ...(manifest.compressedArtifacts ?? []).map((row) => row.path),
    ...(manifest.artifactAliases ?? []).flatMap((row) => [row.path, row.receipt]),
  ]
  const source = gitTree(root, manifest.baseRevision, requiredSourcePaths)
  const changes = new Map()
  const additions = new Map()
  const artifacts = new Map()
  const retired = new Map()
  const identities = new Map()
  const auditedPaths = new Set()
  for (const path of source.entries.keys()) {
    const target = currentDocumentPath(path)
    assert(!identities.has(target), `document location: path collision: ${target}`)
    identities.set(target, path)
  }
  for (const row of manifest.documents) {
    safePath(row.path)
    assert(source.entries.has(row.path), `document location: changed source missing: ${row.path}`)
    assert(!changes.has(row.path), `document location: duplicate change: ${row.path}`)
    assert(
      ((row.path.endsWith('.md') && ['links', 'reviewed'].includes(row.mode)) ||
        ((isTestingSourceBridgePath(row.path) ||
          (admission.testingAcquisitionSourceBaseRevision !== undefined &&
            isTestingAcquisitionSourceBridgePath(row.path))) &&
          row.mode === 'testing-source-bridge')) &&
        ((row.mode === 'links' && row.afterSha256 === undefined) ||
          /^[a-f\d]{64}$/u.test(row.afterSha256 ?? '')),
      `document location: unsupported body change: ${row.path}`,
    )
    if (row.mode !== 'links') reviewValid(row.review, row.path)
    else
      assert(
        !row.templateId &&
          !row.variant &&
          !row.review &&
          row.historyOverlay === undefined &&
          row.historyDisposition === undefined,
        'links cannot grant semantics',
      )
    assert(
      row.historyDisposition === undefined || row.historyDisposition === 'fixed-git-source',
      'unknown history disposition',
    )
    if (row.mode === 'testing-source-bridge')
      assert(
        !row.templateId &&
          !row.variant &&
          row.historyOverlay === undefined &&
          row.historyDisposition === undefined,
        'testing source bridge cannot override a native template or history role',
      )
    changes.set(row.path, { ...row })
  }
  const stagePublicationRevision = admission.testingCatalogStagePublicationBaseRevision
  if (stagePublicationRevision !== undefined) {
    assert(/^[a-f\d]{40}$/u.test(stagePublicationRevision), 'fixed stage publication base required')
    assert(
      changes.get(testingCatalogPath)?.mode === 'testing-source-bridge' &&
        /^[a-f\d]{40}$/u.test(admission.testingCatalogMaintenanceRevision ?? ''),
      'stage publication requires both fixed catalog source layers',
    )
  }
  const palacePublicationRevision = admission.testingCatalogPalacePublicationBaseRevision
  if (palacePublicationRevision !== undefined)
    assert(
      stagePublicationRevision !== undefined && /^[a-f\d]{40}$/u.test(palacePublicationRevision),
      '010 stage publication requires both fixed stage publication bases',
    )
  const postPalaceRevision = admission.testingCatalogPostPalaceBaseRevision
  if (postPalaceRevision !== undefined)
    assert(
      palacePublicationRevision !== undefined && /^[a-f\d]{40}$/u.test(postPalaceRevision),
      'chest source bridge requires the fixed 010 publication',
    )
  const postPalace =
    postPalaceRevision === undefined
      ? undefined
      : gitTree(root, postPalaceRevision, [testingCatalogPath])
  const acquisitionRevision = admission.testingAcquisitionSourceBaseRevision
  if (acquisitionRevision !== undefined)
    assert(
      postPalace && acquisitionRevision === testingAcquisitionSourceBase,
      'acquisition source bridge requires the fixed accepted predecessor after 010',
    )
  const preAcquisition =
    acquisitionRevision === undefined
      ? undefined
      : gitTree(root, acquisitionRevision, [testingCatalogPath])
  const battlePublicationRevision = admission.testingCatalogBattlePublicationBaseRevision
  if (battlePublicationRevision !== undefined)
    assert(
      preAcquisition && battlePublicationRevision === testingBattlePublicationBase,
      'battle publication requires the fixed accepted acquisition predecessor',
    )
  const preBattle =
    battlePublicationRevision === undefined
      ? undefined
      : gitTree(root, battlePublicationRevision, [testingCatalogPath])
  const preBattleMechanisms =
    preBattle && gitTree(root, testingBattleSessionMechanismBase, [testingCatalogPath])
  const preBattlePortrait =
    preBattle && gitTree(root, testingBattleSessionPortraitBase, [testingCatalogPath])
  const preBattlePresentation =
    preBattle && gitTree(root, testingBattleSessionPresentationBase, [testingCatalogPath])
  const preBattleCadence =
    preBattle && gitTree(root, testingBattleSessionCadenceBase, [testingCatalogPath])
  const preBattleCasualty =
    preBattle && gitTree(root, testingBattleSessionCasualtyBase, [testingCatalogPath])
  const preBattleCasualtyDialogue =
    preBattle && gitTree(root, testingBattleSessionCasualtyDialogueBase, [testingCatalogPath])
  const preBattlePlayerActions =
    preBattle && gitTree(root, testingBattleSessionPlayerActionsBase, [testingCatalogPath])
  const preBattleCooperativeRecovery =
    preBattle && gitTree(root, testingBattleSessionCooperativeRecoveryBase, [testingCatalogPath])
  const preBattleItemEffects =
    preBattle && gitTree(root, testingBattleSessionItemEffectsBase, [testingCatalogPath])
  const preBattleThrowFeedback =
    preBattle && gitTree(root, testingBattleSessionThrowFeedbackBase, [testingCatalogPath])
  const preBattleEnemyCast =
    preBattle && gitTree(root, testingBattleSessionEnemyCastBase, [testingCatalogPath])
  const preBattleSpecialStatus =
    preBattle && gitTree(root, testingBattleSessionSpecialStatusBase, [testingCatalogPath])
  const readCurrentSource = (sourcePath) => ordinaryBytes(root, sourcePath)
  // Apply source updates newest first for both document and metadata reads.
  function sourceApplicability({ readCurrent, revision, baseRevision, restoreBindings, isSource }) {
    if (!revision) return { read: readCurrent, restore: (_path, bytes) => bytes }
    const fixed = gitTree(root, revision, [])
    const base = gitTree(root, baseRevision, [])
    const restore = (path, bytes) =>
      restoreBindings(path, bytes, {
        readSource: readCurrent,
        readBase: base.read,
        readFixed: fixed.read,
      })
    return {
      restore,
      read(path) {
        const live = readCurrent(path)
        if (!isSource(path)) return live && restore(path, live)
        assert(
          live?.equals(fixed.read(path)),
          `source differs from its admitted candidate: ${path}`,
        )
        return base.read(path)
      },
    }
  }
  const menuIsolationRevision = admission.testingMenuIsolationSourceRevision
  if (menuIsolationRevision)
    assert(
      admission.testingQ2DisplaySourceRevision && /^[a-f0-9]{40}$/u.test(menuIsolationRevision),
    )
  const runtimeOwnershipRevision = admission.testingRuntimeOwnershipSourceRevision
  if (runtimeOwnershipRevision)
    assert(
      menuIsolationRevision && /^[a-f0-9]{40}$/u.test(runtimeOwnershipRevision),
      'runtime ownership source requires the admitted menu isolation stage',
    )
  const q2QuestReportRevision = admission.testingQ2QuestReportRevision
  if (q2QuestReportRevision !== undefined)
    assert(runtimeOwnershipRevision, 'Q2 quest report requires the runtime ownership source stage')
  const q2QuestReport = q2QuestReportRevision && gitTree(root, q2QuestReportRevision, [])
  const battleQualityRevision = admission.testingBattleQualitySourceRevision
  if (battleQualityRevision)
    assert(
      runtimeOwnershipRevision && /^[a-f0-9]{40}$/u.test(battleQualityRevision),
      'battle quality source requires the admitted runtime ownership stage',
    )
  const battleCloseoutRevision = admission.testingReforgeBattleCloseoutRevision
  if (battleCloseoutRevision)
    assert(battleQualityRevision && /^[a-f0-9]{40}$/u.test(battleCloseoutRevision))
  const battleCloseout = sourceApplicability({
    readCurrent: readCurrentSource,
    revision: battleCloseoutRevision,
    baseRevision: testingReforgeBattleCloseoutBase,
    restoreBindings: restoreTestingReforgeBattleCloseoutBindings,
    isSource: isTestingReforgeBattleCloseoutSource,
  })
  const battleQuality = sourceApplicability({
    readCurrent: battleCloseout.read,
    revision: battleQualityRevision,
    baseRevision: testingBattleQualityPublicationBase,
    restoreBindings: restoreTestingBattleQualitySourceBindings,
    isSource: isTestingBattleQualitySource,
  })
  const runtimeOwnership = sourceApplicability({
    readCurrent: battleQuality.read,
    revision: runtimeOwnershipRevision,
    baseRevision: testingRuntimeOwnershipPublicationBase,
    restoreBindings: (path, bytes, inputs) =>
      restoreTestingRuntimeOwnershipSourceBindings(path, bytes, {
        ...inputs,
        readQ2QuestReport: q2QuestReport?.read,
      }),
    isSource: isTestingRuntimeOwnershipSource,
  })
  const menuIsolation = sourceApplicability({
    readCurrent: runtimeOwnership.read,
    revision: menuIsolationRevision,
    baseRevision: testingMenuIsolationPublicationBase,
    restoreBindings: restoreTestingMenuIsolationSourceBindings,
    isSource: isTestingMenuIsolationSource,
  })
  const versionAdmission = admission.testingContentVersionRebinding
  const versionBase = versionAdmission && gitTree(root, versionAdmission.baseRevision, [])
  const versionPublicationBase = versionAdmission?.publicationBaseRevision
    ? gitTree(root, versionAdmission.publicationBaseRevision, [])
    : versionBase
  const versionRebinding =
    versionPublicationBase &&
    loadTestingContentVersionRebinding({
      admission: versionAdmission,
      readCurrent: menuIsolation.read,
      readPredecessor: versionPublicationBase.read,
      readAcceptedSource: versionBase.read,
    })
  const readSource = versionRebinding
    ? (path) => {
        const live = versionRebinding.readPredecessorSource(path)
        return live && versionRebinding.restore(path, live)
      }
    : menuIsolation.read
  const defeatRevision = admission.testingBattleDefeatSourceRevision
  if (defeatRevision !== undefined)
    assert(
      preBattleCasualtyDialogue && defeatRevision === testingBattleDefeatSourceRevision,
      'defeat source bridge requires the fixed Q2 battle lineage',
    )
  const defeatSource = defeatRevision && gitTree(root, defeatRevision, [])
  const victoryRevision = admission.testingBattleVictorySourceRevision
  if (victoryRevision !== undefined)
    assert(
      defeatSource && victoryRevision === testingBattleVictorySourceRevision,
      'victory source bridge requires the fixed post-defeat Q2 candidate',
    )
  const victorySource = victoryRevision && gitTree(root, victoryRevision, [])
  const preVictory = victorySource && gitTree(root, testingBattleVictoryPublicationBase, [])
  const handoffRevision = admission.testingBattleHandoffSourceRevision
  if (handoffRevision !== undefined)
    assert(
      victorySource && handoffRevision === testingBattleHandoffSourceRevision,
      'hostile handoff source bridge requires the fixed Q2 successor',
    )
  const handoffSource = handoffRevision && gitTree(root, handoffRevision, [])
  const preHandoff = handoffSource && gitTree(root, testingBattleHandoffPublicationBase, [])
  const lifecycleRevision = admission.testingBattleLifecycleSourceRevision
  if (lifecycleRevision !== undefined)
    assert(
      handoffSource && /^[a-f0-9]{40}$/u.test(lifecycleRevision),
      'battle lifecycle source bridge requires the fixed encounter lineage',
    )
  const lifecycleSource = lifecycleRevision && gitTree(root, lifecycleRevision, [])
  const preLifecycle = lifecycleSource && gitTree(root, testingBattleLifecyclePublicationBase, [])
  const battleReviewRevision = admission.testingBattleReviewSourceRevision
  if (battleReviewRevision !== undefined)
    assert(
      lifecycleSource && /^[a-f0-9]{40}$/u.test(battleReviewRevision),
      'battle review source bridge requires the fixed lifecycle lineage',
    )
  const battleReviewSource = battleReviewRevision && gitTree(root, battleReviewRevision, [])
  const preBattleReview =
    battleReviewSource && gitTree(root, testingBattleReviewPublicationBase, [])
  const closureRevision = admission.testingBattleClosureSourceRevision
  if (closureRevision !== undefined)
    assert(
      battleReviewSource && /^[a-f0-9]{40}$/u.test(closureRevision),
      'battle closure source bridge requires the fixed prior review',
    )
  const closureSource = closureRevision && gitTree(root, closureRevision, [])
  const preClosure = closureSource && gitTree(root, testingBattleClosurePublicationBase, [])
  const summonRevision = admission.testingBattleSummonSourceRevision
  if (summonRevision !== undefined)
    assert(
      closureSource && /^[a-f0-9]{40}$/u.test(summonRevision),
      'battle summon source bridge requires the fixed prior battle closure',
    )
  const summonSource = summonRevision && gitTree(root, summonRevision, [])
  const preSummon = summonSource && gitTree(root, testingBattleSummonPublicationBase, [])
  const summonDivisionRevision = admission.testingBattleSummonDivisionSourceRevision
  if (summonDivisionRevision !== undefined)
    assert(
      summonSource && /^[a-f0-9]{40}$/u.test(summonDivisionRevision),
      'battle summon and division source bridge requires the fixed summon predecessor',
    )
  const summonDivisionSource = summonDivisionRevision && gitTree(root, summonDivisionRevision, [])
  const preSummonDivision =
    summonDivisionSource && gitTree(root, testingBattleSummonDivisionPublicationBase, [])
  const enemyColorRevision = admission.testingBattleEnemyColorSourceRevision
  if (enemyColorRevision !== undefined)
    assert(
      summonDivisionSource && /^[a-f0-9]{40}$/u.test(enemyColorRevision),
      'enemy color observation bridge requires the fixed summon and division predecessor',
    )
  const enemyColorSource = enemyColorRevision && gitTree(root, enemyColorRevision, [])
  const preEnemyColor =
    enemyColorSource && gitTree(root, testingBattleEnemyColorPublicationBase, [])
  const summonPlaybackRevision = admission.testingBattleSummonPlaybackSourceRevision
  if (summonPlaybackRevision !== undefined)
    assert(
      enemyColorSource && /^[a-f0-9]{40}$/u.test(summonPlaybackRevision),
      'summon playback source bridge requires the fixed preceding observation revision',
    )
  const summonPlaybackSource = summonPlaybackRevision && gitTree(root, summonPlaybackRevision, [])
  const preSummonPlayback =
    summonPlaybackSource && gitTree(root, testingBattleSummonPlaybackPublicationBase, [])
  const spellFeedbackRevision = admission.testingBattleSpellFeedbackSourceRevision
  if (spellFeedbackRevision !== undefined)
    assert(
      summonPlaybackSource && /^[a-f0-9]{40}$/u.test(spellFeedbackRevision),
      'spell feedback source bridge requires the fixed preceding playback revision',
    )
  const spellFeedbackSource = spellFeedbackRevision && gitTree(root, spellFeedbackRevision, [])
  const preSpellFeedback =
    spellFeedbackSource && gitTree(root, testingBattleSpellFeedbackPublicationBase, [])
  const actionCadenceRevision = admission.testingBattleActionCadenceSourceRevision
  if (actionCadenceRevision !== undefined)
    assert(
      spellFeedbackSource && /^[a-f0-9]{40}$/u.test(actionCadenceRevision),
      'battle action cadence source bridge requires the fixed preceding spell feedback revision',
    )
  const actionCadenceSource = actionCadenceRevision && gitTree(root, actionCadenceRevision, [])
  const preActionCadence =
    actionCadenceSource && gitTree(root, testingBattleActionCadencePublicationBase, [])
  const enemyTransformRevision = admission.testingBattleEnemyTransformSourceRevision
  if (enemyTransformRevision !== undefined)
    assert(
      actionCadenceSource && /^[a-f0-9]{40}$/u.test(enemyTransformRevision),
      'battle enemy transform source bridge requires the fixed preceding cadence revision',
    )
  const enemyTransformSource = enemyTransformRevision && gitTree(root, enemyTransformRevision, [])
  const preEnemyTransform =
    enemyTransformSource && gitTree(root, testingBattleEnemyTransformPublicationBase, [])
  const sceneObserverRevision = admission.testingBattleSceneObserverSourceRevision
  if (sceneObserverRevision !== undefined)
    assert(
      enemyTransformSource && /^[a-f0-9]{40}$/u.test(sceneObserverRevision),
      'battle scene observer bridge requires the fixed preceding transform revision',
    )
  const sceneObserverSource = sceneObserverRevision && gitTree(root, sceneObserverRevision, [])
  const preSceneObserver =
    sceneObserverSource && gitTree(root, testingBattleSceneObserverPublicationBase, [])
  const cooperativeRosterRevision = admission.testingBattleCooperativeRosterSourceRevision
  if (cooperativeRosterRevision !== undefined)
    assert(
      sceneObserverSource && /^[a-f0-9]{40}$/u.test(cooperativeRosterRevision),
      'battle cooperative source bridge requires the fixed preceding scene observer revision',
    )
  const cooperativeRosterSource =
    cooperativeRosterRevision && gitTree(root, cooperativeRosterRevision, [])
  const preCooperativeRoster =
    cooperativeRosterSource && gitTree(root, testingBattleCooperativeRosterPublicationBase, [])
  const casualtyRosterRevision = admission.testingBattleCasualtyRosterSourceRevision
  if (casualtyRosterRevision !== undefined)
    assert(
      cooperativeRosterSource && /^[a-f0-9]{40}$/u.test(casualtyRosterRevision),
      'battle casualty source bridge requires the fixed preceding cooperative revision',
    )
  const casualtyRosterSource = casualtyRosterRevision && gitTree(root, casualtyRosterRevision, [])
  const preCasualtyRoster =
    casualtyRosterSource && gitTree(root, testingBattleCasualtyRosterPublicationBase, [])
  const learnedSkillsRevision = admission.testingBattleLearnedSkillsSourceRevision
  if (learnedSkillsRevision !== undefined)
    assert(
      casualtyRosterSource && /^[a-f0-9]{40}$/u.test(learnedSkillsRevision),
      'battle learned-skills source bridge requires the fixed preceding casualty revision',
    )
  const learnedSkillsSource = learnedSkillsRevision && gitTree(root, learnedSkillsRevision, [])
  const preLearnedSkills =
    learnedSkillsSource && gitTree(root, testingBattleLearnedSkillsPublicationBase, [])
  const scriptedShakeRevision = admission.testingBattleScriptedShakeSourceRevision
  if (scriptedShakeRevision !== undefined)
    assert(
      learnedSkillsSource && /^[a-f0-9]{40}$/u.test(scriptedShakeRevision),
      'battle scripted shake source bridge requires the fixed preceding learned-skills revision',
    )
  const scriptedShakeSource = scriptedShakeRevision && gitTree(root, scriptedShakeRevision, [])
  const preScriptedShake =
    scriptedShakeSource && gitTree(root, testingBattleScriptedShakePublicationBase, [])
  const windBlowRevision = admission.testingBattleWindBlowSourceRevision
  if (windBlowRevision !== undefined)
    assert(
      scriptedShakeSource && /^[a-f0-9]{40}$/u.test(windBlowRevision),
      'battle wind blow source bridge requires the fixed preceding scripted shake revision',
    )
  const windBlowSource = windBlowRevision && gitTree(root, windBlowRevision, [])
  const preWindBlow = windBlowSource && gitTree(root, testingBattleWindBlowPublicationBase, [])
  const conditionalSpellRevision = admission.testingBattleConditionalSpellSourceRevision
  if (conditionalSpellRevision !== undefined)
    assert(
      windBlowSource && /^[a-f0-9]{40}$/u.test(conditionalSpellRevision),
      'battle conditional spell source bridge requires the fixed preceding wind blow revision',
    )
  const conditionalSpellSource =
    conditionalSpellRevision && gitTree(root, conditionalSpellRevision, [])
  const preConditionalSpell =
    conditionalSpellSource && gitTree(root, testingBattleConditionalSpellPublicationBase, [])
  const guAndConfusionRevision = admission.testingBattleGuAndConfusionSourceRevision
  if (guAndConfusionRevision !== undefined)
    assert(
      conditionalSpellSource && /^[a-f0-9]{40}$/u.test(guAndConfusionRevision),
      'battle Gu and confusion source bridge requires the fixed preceding conditional spell revision',
    )
  const guAndConfusionSource = guAndConfusionRevision && gitTree(root, guAndConfusionRevision, [])
  const preGuAndConfusion =
    guAndConfusionSource && gitTree(root, testingBattleGuAndConfusionPublicationBase, [])
  const spellCurrencyRevision = admission.testingBattleSpellCurrencySourceRevision
  if (spellCurrencyRevision !== undefined)
    assert(
      guAndConfusionSource && /^[a-f0-9]{40}$/u.test(spellCurrencyRevision),
      'battle spell currency source bridge requires the fixed preceding Gu and confusion revision',
    )
  const spellCurrencySource = spellCurrencyRevision && gitTree(root, spellCurrencyRevision, [])
  const preSpellCurrency =
    spellCurrencySource && gitTree(root, testingBattleSpellCurrencyPublicationBase, [])
  const escapeSpellRevision = admission.testingBattleEscapeSpellSourceRevision
  if (escapeSpellRevision !== undefined)
    assert(
      spellCurrencySource && /^[a-f0-9]{40}$/u.test(escapeSpellRevision),
      'battle escape spell source bridge requires the fixed preceding spell currency revision',
    )
  const escapeSpellSource = escapeSpellRevision && gitTree(root, escapeSpellRevision, [])
  const preEscapeSpell =
    escapeSpellSource && gitTree(root, testingBattleEscapeSpellPublicationBase, [])
  const enemySpellShakeRevision = admission.testingBattleEnemySpellShakeSourceRevision
  if (enemySpellShakeRevision !== undefined)
    assert(
      escapeSpellSource && /^[a-f0-9]{40}$/u.test(enemySpellShakeRevision),
      'battle enemy spell shake source bridge requires the fixed preceding escape spell revision',
    )
  const enemySpellShakeSource =
    enemySpellShakeRevision && gitTree(root, enemySpellShakeRevision, [])
  const preEnemySpellShake =
    enemySpellShakeSource && gitTree(root, testingBattleEnemySpellShakePublicationBase, [])
  const itemUseRevision = admission.testingBattleItemUseSourceRevision
  if (itemUseRevision !== undefined)
    assert(
      enemySpellShakeSource && /^[a-f0-9]{40}$/u.test(itemUseRevision),
      'battle item use source bridge requires the fixed preceding enemy spell shake revision',
    )
  const itemUseSource = itemUseRevision && gitTree(root, itemUseRevision, [])
  const preItemUse = itemUseSource && gitTree(root, testingBattleItemUsePublicationBase, [])
  const hidingRevision = admission.testingBattleHidingSourceRevision
  if (hidingRevision !== undefined)
    assert(
      itemUseSource && /^[a-f0-9]{40}$/u.test(hidingRevision),
      'battle hiding source bridge requires the fixed preceding item use revision',
    )
  const hidingSource = hidingRevision && gitTree(root, hidingRevision, [])
  const preHiding = hidingSource && gitTree(root, testingBattleHidingPublicationBase, [])
  const throwStatusRevision = admission.testingBattleThrowStatusSourceRevision
  if (throwStatusRevision !== undefined)
    assert(
      hidingSource && /^[a-f0-9]{40}$/u.test(throwStatusRevision),
      'battle throw status source bridge requires the fixed preceding hiding revision',
    )
  const throwStatusSource = throwStatusRevision && gitTree(root, throwStatusRevision, [])
  const preThrowStatus =
    throwStatusSource && gitTree(root, testingBattleThrowStatusPublicationBase, [])
  const poisonNarrationRevision = admission.testingBattlePoisonNarrationSourceRevision
  if (poisonNarrationRevision !== undefined)
    assert(
      throwStatusSource && /^[a-f0-9]{40}$/u.test(poisonNarrationRevision),
      'battle poison narration source bridge requires the fixed preceding throw status revision',
    )
  const poisonNarrationSource =
    poisonNarrationRevision && gitTree(root, poisonNarrationRevision, [])
  const prePoisonNarration =
    poisonNarrationSource && gitTree(root, testingBattlePoisonNarrationPublicationBase, [])
  const worldItemTargetRevision = admission.testingWorldItemTargetSourceRevision
  if (worldItemTargetRevision !== undefined)
    assert(
      poisonNarrationSource && /^[a-f0-9]{40}$/u.test(worldItemTargetRevision),
      'world item target source bridge requires the fixed preceding poison narration revision',
    )
  const worldItemTargetSource =
    worldItemTargetRevision && gitTree(root, worldItemTargetRevision, [])
  const preWorldItemTarget =
    worldItemTargetSource && gitTree(root, testingWorldItemTargetPublicationBase, [])
  const worldAwarenessRevision = admission.testingWorldAwarenessSourceRevision
  if (worldAwarenessRevision !== undefined)
    assert(
      worldItemTargetSource && /^[a-f0-9]{40}$/u.test(worldAwarenessRevision),
      'world incense source bridge requires the fixed preceding item target revision',
    )
  const worldAwarenessSource = worldAwarenessRevision && gitTree(root, worldAwarenessRevision, [])
  const preWorldAwareness =
    worldAwarenessSource && gitTree(root, testingWorldAwarenessPublicationBase, [])
  const sceneItemExitRevision = admission.testingSceneItemExitSourceRevision
  if (sceneItemExitRevision !== undefined)
    assert(
      worldAwarenessSource && /^[a-f0-9]{40}$/u.test(sceneItemExitRevision),
      'scene item exit source bridge requires the fixed preceding world incense revision',
    )
  const sceneItemExitSource = sceneItemExitRevision && gitTree(root, sceneItemExitRevision, [])
  const preSceneItemExit =
    sceneItemExitSource && gitTree(root, testingSceneItemExitPublicationBase, [])
  const storyPresentationRevision = admission.testingStoryPresentationSourceRevision
  if (storyPresentationRevision !== undefined)
    assert(
      sceneItemExitSource && /^[a-f0-9]{40}$/u.test(storyPresentationRevision),
      'story presentation source bridge requires the fixed scene item exit revision',
    )
  const storyPresentationSource =
    storyPresentationRevision && gitTree(root, storyPresentationRevision, [])
  const preStoryPresentation =
    storyPresentationSource && gitTree(root, testingStoryPresentationPublicationBase, [])
  const cliffEntryRevision = admission.testingCliffEntrySourceRevision
  if (cliffEntryRevision)
    assert(
      storyPresentationRevision,
      'cliff entry bridge requires the fixed story presentation revision',
    )
  const cliffEntrySource = cliffEntryRevision && gitTree(root, cliffEntryRevision, [])
  const preCliffEntry = cliffEntrySource && gitTree(root, testingCliffEntryPublicationBase, [])
  const partyPoseRevision = admission.testingPartyPoseSourceRevision
  if (partyPoseRevision)
    assert(
      cliffEntryRevision && /^[a-f0-9]{40}$/u.test(partyPoseRevision),
      'party pose source needs the fixed cliff candidate',
    )
  const partyPoseSource = partyPoseRevision && gitTree(root, partyPoseRevision, [])
  const prePartyPose = partyPoseSource && gitTree(root, testingPartyPosePublicationBase, [])
  const q2CoverageRevision = admission.testingQ2CoverageSourceRevision
  if (q2CoverageRevision) assert(partyPoseRevision && /^[a-f0-9]{40}$/u.test(q2CoverageRevision))
  const q2CoverageSource = q2CoverageRevision && gitTree(root, q2CoverageRevision, [])
  const preQ2Coverage = q2CoverageSource && gitTree(root, testingQ2CoveragePublicationBase, [])
  const q2PlacementRevision = admission.testingQ2PlacementSourceRevision
  if (q2PlacementRevision) assert(q2CoverageRevision && /^[a-f0-9]{40}$/u.test(q2PlacementRevision))
  const q2PlacementSource = q2PlacementRevision && gitTree(root, q2PlacementRevision, [])
  const preQ2Placement = q2PlacementSource && gitTree(root, testingQ2PlacementPublicationBase, [])
  const q2PeachRevision = admission.testingQ2PeachSourceRevision
  if (q2PeachRevision) assert(q2PlacementRevision && /^[a-f0-9]{40}$/u.test(q2PeachRevision))
  const q2PeachSource = q2PeachRevision && gitTree(root, q2PeachRevision, [])
  const preQ2Peach = q2PeachSource && gitTree(root, testingQ2PeachPublicationBase, [])
  const q2NoticeRevision = admission.testingQ2NoticeSourceRevision
  if (q2NoticeRevision) assert(q2PeachRevision && /^[a-f0-9]{40}$/u.test(q2NoticeRevision))
  const q2NoticeSource = q2NoticeRevision && gitTree(root, q2NoticeRevision, [])
  const preQ2Notice = q2NoticeSource && gitTree(root, testingQ2NoticePublicationBase, [])
  const q2EntryAutoRevision = admission.testingQ2EntryAutoSourceRevision
  if (q2EntryAutoRevision) assert(q2NoticeRevision && /^[a-f0-9]{40}$/u.test(q2EntryAutoRevision))
  const q2EntryAutoSource = q2EntryAutoRevision && gitTree(root, q2EntryAutoRevision, [])
  const preQ2EntryAuto = q2EntryAutoSource && gitTree(root, testingQ2EntryAutoPublicationBase, [])
  const q2RooftopRevision = admission.testingQ2RooftopSourceRevision
  if (q2RooftopRevision) assert(q2EntryAutoRevision && /^[a-f0-9]{40}$/u.test(q2RooftopRevision))
  const q2RooftopSource = q2RooftopRevision && gitTree(root, q2RooftopRevision, [])
  const preQ2Rooftop = q2RooftopSource && gitTree(root, testingQ2RooftopPublicationBase, [])
  const q2RingRevision = admission.testingQ2RingSourceRevision
  if (q2RingRevision) assert(q2RooftopRevision && /^[a-f0-9]{40}$/u.test(q2RingRevision))
  const q2RingSource = q2RingRevision && gitTree(root, q2RingRevision, [])
  const preQ2Ring = q2RingSource && gitTree(root, testingQ2RingPublicationBase, [])
  const q2InnRevision = admission.testingQ2InnSourceRevision
  if (q2InnRevision) assert(q2RingRevision && /^[a-f0-9]{40}$/u.test(q2InnRevision))
  const q2InnSource = q2InnRevision && gitTree(root, q2InnRevision, [])
  const preQ2Inn = q2InnSource && gitTree(root, testingQ2InnPublicationBase, [])
  const q2EscortsRevision = admission.testingQ2EscortsSourceRevision
  if (q2EscortsRevision) assert(q2InnRevision && /^[a-f0-9]{40}$/u.test(q2EscortsRevision))
  const q2EscortsSource = q2EscortsRevision && gitTree(root, q2EscortsRevision, [])
  const preQ2Escorts = q2EscortsSource && gitTree(root, testingQ2EscortsPublicationBase, [])
  const q2TombRevision = admission.testingQ2TombSourceRevision
  if (q2TombRevision) assert(q2EscortsRevision && /^[a-f0-9]{40}$/u.test(q2TombRevision))
  const q2TombSource = q2TombRevision && gitTree(root, q2TombRevision, [])
  const preQ2Tomb = q2TombSource && gitTree(root, testingQ2TombPublicationBase, [])
  const q2TowerFoxRevision = admission.testingQ2TowerFoxSourceRevision
  if (q2TowerFoxRevision) assert(q2TombRevision && /^[a-f0-9]{40}$/u.test(q2TowerFoxRevision))
  const q2TowerFoxSource = q2TowerFoxRevision && gitTree(root, q2TowerFoxRevision, [])
  const preQ2TowerFox = q2TowerFoxSource && gitTree(root, testingQ2TowerFoxPublicationBase, [])
  const q2TianGhostRevision = admission.testingQ2TianGhostSourceRevision
  if (q2TianGhostRevision) assert(q2TowerFoxRevision && /^[a-f0-9]{40}$/u.test(q2TianGhostRevision))
  const q2TianGhostSource = q2TianGhostRevision && gitTree(root, q2TianGhostRevision, [])
  const preQ2TianGhost = q2TianGhostSource && gitTree(root, testingQ2TianGhostPublicationBase, [])
  const q2TowerMingRevision = admission.testingQ2TowerMingSourceRevision
  if (q2TowerMingRevision)
    assert(q2TianGhostRevision && /^[a-f0-9]{40}$/u.test(q2TowerMingRevision))
  const q2TowerMingSource = q2TowerMingRevision && gitTree(root, q2TowerMingRevision, [])
  const preQ2TowerMing = q2TowerMingSource && gitTree(root, testingQ2TowerMingPublicationBase, [])
  const q2GaiLuojiaoRevision = admission.testingQ2GaiLuojiaoSourceRevision
  if (q2GaiLuojiaoRevision)
    assert(q2TowerMingRevision && /^[a-f0-9]{40}$/u.test(q2GaiLuojiaoRevision))
  const q2GaiLuojiaoSource = q2GaiLuojiaoRevision && gitTree(root, q2GaiLuojiaoRevision, [])
  const preQ2GaiLuojiao =
    q2GaiLuojiaoSource && gitTree(root, testingQ2GaiLuojiaoPublicationBase, [])
  const q2PhoenixRevision = admission.testingQ2PhoenixSourceRevision
  if (q2PhoenixRevision) assert(q2GaiLuojiaoRevision && /^[a-f0-9]{40}$/u.test(q2PhoenixRevision))
  const q2PhoenixSource = q2PhoenixRevision && gitTree(root, q2PhoenixRevision, [])
  const preQ2Phoenix = q2PhoenixSource && gitTree(root, testingQ2PhoenixPublicationBase, [])
  const q2StoneElderRevision = admission.testingQ2StoneElderSourceRevision
  if (q2StoneElderRevision)
    assert(q2PhoenixRevision && /^[a-f0-9]{40}$/u.test(q2StoneElderRevision))
  const q2StoneElderSource = q2StoneElderRevision && gitTree(root, q2StoneElderRevision, [])
  const preQ2StoneElder =
    q2StoneElderSource && gitTree(root, testingQ2StoneElderPublicationBase, [])
  const forestInnRevision = admission.testingQ2ForestInnSourceRevision
  if (forestInnRevision) assert(q2StoneElderSource && /^[a-f0-9]{40}$/u.test(forestInnRevision))
  const forestInnSource = forestInnRevision && gitTree(root, forestInnRevision, [])
  const preForestInn = forestInnSource && gitTree(root, testingQ2ForestInnPublicationBase, [])
  const shangshuRevision = admission.testingQ2ShangshuSourceRevision
  if (shangshuRevision) assert(forestInnSource && /^[a-f0-9]{40}$/u.test(shangshuRevision))
  const shangshuSource = shangshuRevision && gitTree(root, shangshuRevision, [])
  const preShangshu = shangshuSource && gitTree(root, testingQ2ShangshuPublicationBase, [])
  const daliRevision = admission.testingQ2DaliSourceRevision
  if (daliRevision) assert(shangshuSource && /^[a-f0-9]{40}$/u.test(daliRevision))
  const daliSource = daliRevision && gitTree(root, daliRevision, [])
  const preDali = daliSource && gitTree(root, testingQ2DaliPublicationBase, [])
  const daliRainRevision = admission.testingQ2DaliRainSourceRevision
  if (daliRainRevision) assert(daliSource && /^[a-f0-9]{40}$/u.test(daliRainRevision))
  const daliRainSource = daliRainRevision && gitTree(root, daliRainRevision, [])
  const preDaliRain = daliRainSource && gitTree(root, testingQ2DaliRainPublicationBase, [])
  const palaceRevision = admission.testingQ2PalaceSourceRevision
  if (palaceRevision) assert(daliRainSource && /^[a-f0-9]{40}$/u.test(palaceRevision))
  const palaceSource = palaceRevision && gitTree(root, palaceRevision, [])
  const prePalace = palaceSource && gitTree(root, testingQ2PalacePublicationBase, [])
  const displayRevision = admission.testingQ2DisplaySourceRevision
  if (displayRevision) assert(palaceSource && /^[a-f0-9]{40}$/u.test(displayRevision))
  const displaySource = displayRevision && gitTree(root, displayRevision, [])
  const preDisplay = displaySource && gitTree(root, testingQ2DisplayPublicationBase, [])
  const readBeforeDisplay = (path) => {
    const live = readSource(path)
    if (!preDisplay || !isTestingQ2DisplaySource(path)) return live
    assert(live?.equals(displaySource.read(path)), 'Q2 display source differs from its candidate')
    return preDisplay.read(path)
  }
  const readBeforePalace = (path) => {
    const live = readBeforeDisplay(path)
    if (!prePalace || !isTestingQ2PalaceSource(path)) return live
    assert(
      live?.equals(palaceSource.read(path)),
      'palace presentation source differs from its candidate',
    )
    return prePalace.read(path)
  }
  const readBeforeDaliRain = (path) => {
    const live = readBeforePalace(path)
    if (!preDaliRain || !isTestingQ2DaliRainSource(path)) return live
    assert(
      live?.equals(daliRainSource.read(path)),
      'Dali rain split source differs from its candidate',
    )
    return preDaliRain.read(path)
  }
  const readBeforeDali = (path) => {
    const live = readBeforeDaliRain(path)
    if (!preDali || !isTestingQ2DaliSource(path)) return live
    assert(
      live?.equals(daliSource.read(path)),
      'Dali split source differs from the frozen candidate',
    )
    return preDali.read(path)
  }
  const readBeforeShangshu = (path) => {
    const live = readBeforeDali(path)
    if (!preShangshu || !isTestingQ2ShangshuSource(path)) return live
    assert(
      live?.equals(shangshuSource.read(path)),
      'Shangshu source differs from the frozen candidate',
    )
    return preShangshu.read(path)
  }
  const readBeforeForestInn = (path) => {
    const live = readBeforeShangshu(path)
    if (!preForestInn || !isTestingQ2ForestInnSource(path)) return live
    assert(
      live?.equals(forestInnSource.read(path)),
      'forest inn source differs from the frozen candidate',
    )
    return preForestInn.read(path)
  }
  const readBeforeQ2StoneElder = (path) => {
    const live = readBeforeForestInn(path)
    if (!preQ2StoneElder || !isTestingQ2StoneElderSource(path)) return live
    assert(
      live?.equals(q2StoneElderSource.read(path)),
      'Stone Elder source differs from the frozen candidate',
    )
    return preQ2StoneElder.read(path)
  }
  const readBeforeQ2Phoenix = (path) => {
    const live = readBeforeQ2StoneElder(path)
    if (!preQ2Phoenix || !isTestingQ2PhoenixSource(path)) return live
    assert(
      live?.equals(q2PhoenixSource.read(path)),
      'Phoenix source differs from the frozen candidate',
    )
    return preQ2Phoenix.read(path)
  }
  const readBeforeQ2GaiLuojiao = (path) => {
    const live = readBeforeQ2Phoenix(path)
    if (!preQ2GaiLuojiao || !isTestingQ2GaiLuojiaoSource(path)) return live
    assert(
      live?.equals(q2GaiLuojiaoSource.read(path)),
      'Gai Luojiao source differs from the frozen candidate',
    )
    return preQ2GaiLuojiao.read(path)
  }
  const readBeforeQ2TowerMing = (path) => {
    const live = readBeforeQ2GaiLuojiao(path)
    if (!preQ2TowerMing || !isTestingQ2TowerMingSource(path)) return live
    assert(
      live?.equals(q2TowerMingSource.read(path)),
      'Tower Ming source differs from the frozen candidate',
    )
    return preQ2TowerMing.read(path)
  }
  const readBeforeQ2TianGhost = (path) => {
    const live = readBeforeQ2TowerMing(path)
    if (!preQ2TianGhost || !isTestingQ2TianGhostSource(path)) return live
    assert(
      live?.equals(q2TianGhostSource.read(path)),
      'Tian Gui Huang source differs from the frozen candidate',
    )
    return preQ2TianGhost.read(path)
  }
  const readBeforeQ2TowerFox = (path) => {
    const live = readBeforeQ2TianGhost(path)
    if (!preQ2TowerFox || !isTestingQ2TowerFoxSource(path)) return live
    assert(
      live?.equals(q2TowerFoxSource.read(path)),
      'tower fox source differs from the frozen candidate',
    )
    return preQ2TowerFox.read(path)
  }
  const readBeforeQ2Tomb = (path) => {
    const live = readBeforeQ2TowerFox(path)
    if (!preQ2Tomb || !isTestingQ2TombSource(path)) return live
    assert(live?.equals(q2TombSource.read(path)), 'tomb source differs from the frozen candidate')
    return preQ2Tomb.read(path)
  }
  const readBeforeQ2Escorts = (path) => {
    const live = readBeforeQ2Tomb(path)
    if (!preQ2Escorts || !isTestingQ2EscortsSource(path)) return live
    assert(
      live?.equals(q2EscortsSource.read(path)),
      'inn escorts source differs from the frozen candidate',
    )
    return preQ2Escorts.read(path)
  }
  const readBeforeQ2Inn = (path) => {
    const live = readBeforeQ2Escorts(path)
    if (!preQ2Inn || !isTestingQ2InnSource(path)) return live
    assert(live?.equals(q2InnSource.read(path)), 'inn source differs from the frozen candidate')
    return preQ2Inn.read(path)
  }
  const readBeforeQ2Ring = (path) => {
    const live = readBeforeQ2Inn(path)
    if (!preQ2Ring || !isTestingQ2RingSource(path)) return live
    assert(live?.equals(q2RingSource.read(path)), 'ring source differs from the frozen candidate')
    return preQ2Ring.read(path)
  }
  const readBeforeQ2Rooftop = (path) => {
    const live = readBeforeQ2Ring(path)
    if (!preQ2Rooftop || !isTestingQ2RooftopSource(path)) return live
    assert(
      live?.equals(q2RooftopSource.read(path)),
      'rooftop source differs from the frozen candidate',
    )
    return preQ2Rooftop.read(path)
  }
  const readBeforeQ2EntryAuto = (path) => {
    const live = readBeforeQ2Rooftop(path)
    if (!preQ2EntryAuto || !isTestingQ2EntryAutoSource(path)) return live
    assert(
      live?.equals(q2EntryAutoSource.read(path)),
      'entry auto source differs from the frozen candidate',
    )
    return preQ2EntryAuto.read(path)
  }
  const readBeforeQ2Notice = (path) => {
    const live = readBeforeQ2EntryAuto(path)
    if (!preQ2Notice || !isTestingQ2NoticeSource(path)) return live
    assert(
      live?.equals(q2NoticeSource.read(path)),
      'world notice source differs from the frozen candidate',
    )
    return preQ2Notice.read(path)
  }
  const readBeforeQ2Peach = (path) => {
    const live = readBeforeQ2Notice(path)
    if (!preQ2Peach || !isTestingQ2PeachSource(path)) return live
    assert(
      live?.equals(q2PeachSource.read(path)),
      'peach grove source differs from the frozen candidate',
    )
    return preQ2Peach.read(path)
  }
  const readBeforeQ2Placement = (path) => {
    const live = readBeforeQ2Peach(path)
    if (!preQ2Placement || !isTestingQ2PlacementSource(path)) return live
    assert(
      live?.equals(q2PlacementSource.read(path)),
      'item placement source differs from the frozen candidate',
    )
    return preQ2Placement.read(path)
  }
  const readBeforeQ2Coverage = (path) => {
    const live = readBeforeQ2Placement(path)
    if (!preQ2Coverage || !isTestingQ2CoverageSource(path)) return live
    assert(
      live?.equals(q2CoverageSource.read(path)),
      `Q2 source differs from the fixed candidate: ${path}`,
    )
    return preQ2Coverage.read(path)
  }
  const readBeforePartyPose = (path) => {
    const live = readBeforeQ2Coverage(path)
    if (!prePartyPose || !isTestingPartyPoseSource(path)) return live
    assert(
      live?.equals(partyPoseSource.read(path)),
      'party pose source differs from the frozen candidate',
    )
    return prePartyPose.read(path)
  }
  const readBeforeCliffEntry = (path) => {
    const live = readBeforePartyPose(path)
    if (!preCliffEntry || !isTestingCliffEntrySource(path)) return live
    assert(
      live?.equals(cliffEntrySource.read(path)),
      'cliff entry source differs from the frozen candidate',
    )
    return preCliffEntry.read(path)
  }
  const readBeforeStoryPresentation = (path) => {
    const live = readBeforeCliffEntry(path)
    if (!preStoryPresentation || !isTestingStoryPresentationSource(path)) return live
    assert(
      live?.equals(storyPresentationSource.read(path)),
      'story presentation source differs from the frozen candidate',
    )
    return preStoryPresentation.read(path)
  }
  const readBeforeSceneItemExit = (path) => {
    const live = readBeforeStoryPresentation(path)
    if (!preSceneItemExit || !isTestingSceneItemExitSource(path)) return live
    assert(
      live?.equals(sceneItemExitSource.read(path)),
      'scene item exit source differs from the frozen candidate',
    )
    return preSceneItemExit.read(path)
  }
  const readBeforeWorldAwareness = (path) => {
    const live = readBeforeSceneItemExit(path)
    if (!preWorldAwareness || !isTestingWorldAwarenessSource(path)) return live
    assert(
      live?.equals(worldAwarenessSource.read(path)),
      'world incense source differs from the frozen candidate',
    )
    return preWorldAwareness.read(path)
  }
  const readBeforeWorldItemTarget = (path) => {
    const live = readBeforeWorldAwareness(path)
    if (!preWorldItemTarget || !isTestingWorldItemTargetSource(path)) return live
    assert(
      live?.equals(worldItemTargetSource.read(path)),
      'world item target source differs from the frozen candidate',
    )
    return preWorldItemTarget.read(path)
  }
  const readBeforeBattlePoisonNarration = (path) => {
    const live = readBeforeWorldItemTarget(path)
    if (!prePoisonNarration || !isTestingBattlePoisonNarrationSource(path)) return live
    assert(
      live?.equals(poisonNarrationSource.read(path)),
      'battle poison narration source differs from the frozen candidate',
    )
    return prePoisonNarration.read(path)
  }
  const readBeforeBattleThrowStatus = (path) => {
    const live = readBeforeBattlePoisonNarration(path)
    if (!preThrowStatus || !isTestingBattleThrowStatusSource(path)) return live
    assert(
      live?.equals(throwStatusSource.read(path)),
      'battle throw status source differs from the frozen candidate',
    )
    return preThrowStatus.read(path)
  }
  const readBeforeBattleHiding = (path) => {
    const live = readBeforeBattleThrowStatus(path)
    if (!preHiding || !isTestingBattleHidingSource(path)) return live
    assert(
      live?.equals(hidingSource.read(path)),
      'battle hiding source differs from the frozen candidate',
    )
    return preHiding.read(path)
  }
  const readBeforeBattleItemUse = (path) => {
    const live = readBeforeBattleHiding(path)
    if (!preItemUse || !isTestingBattleItemUseSource(path)) return live
    assert(
      live?.equals(itemUseSource.read(path)),
      'battle item use source differs from the frozen candidate',
    )
    return preItemUse.read(path)
  }
  const readBeforeBattleEnemySpellShake = (path) => {
    const live = readBeforeBattleItemUse(path)
    if (!preEnemySpellShake || path !== testingBattleSessionSourcePath) return live
    assert(
      live?.equals(enemySpellShakeSource.read(path)),
      'battle enemy spell shake source differs from the frozen candidate',
    )
    return preEnemySpellShake.read(path)
  }
  const readBeforeBattleEscapeSpell = (path) => {
    const live = readBeforeBattleEnemySpellShake(path)
    if (!preEscapeSpell || !isTestingBattleEscapeSpellSource(path)) return live
    assert(
      live?.equals(escapeSpellSource.read(path)),
      'battle escape spell source differs from the frozen candidate',
    )
    return preEscapeSpell.read(path)
  }
  const readBeforeBattleSpellCurrency = (path) => {
    const live = readBeforeBattleEscapeSpell(path)
    if (!preSpellCurrency || !isTestingBattleSpellCurrencySource(path)) return live
    assert(
      live?.equals(spellCurrencySource.read(path)),
      'battle spell currency source differs from the frozen candidate',
    )
    return preSpellCurrency.read(path)
  }
  const readBeforeBattleGuAndConfusion = (path) => {
    const live = readBeforeBattleSpellCurrency(path)
    if (!preGuAndConfusion || !isTestingBattleGuAndConfusionSource(path)) return live
    assert(
      live?.equals(guAndConfusionSource.read(path)),
      'battle Gu and confusion source differs from the frozen candidate',
    )
    return preGuAndConfusion.read(path)
  }
  const readBeforeBattleConditionalSpell = (path) => {
    const live = readBeforeBattleGuAndConfusion(path)
    if (!preConditionalSpell || !isTestingBattleConditionalSpellSource(path)) return live
    assert(
      live?.equals(conditionalSpellSource.read(path)),
      'battle conditional spell source differs from the frozen candidate',
    )
    return preConditionalSpell.read(path)
  }
  const readBeforeBattleWindBlow = (path) => {
    const live = readBeforeBattleConditionalSpell(path)
    if (!preWindBlow || !isTestingBattleWindBlowSource(path)) return live
    assert(
      live?.equals(windBlowSource.read(path)),
      'battle wind blow source differs from the frozen candidate',
    )
    return preWindBlow.read(path)
  }
  const readBeforeBattleScriptedShake = (path) => {
    const live = readBeforeBattleWindBlow(path)
    if (!preScriptedShake || path !== testingBattleSessionSourcePath) return live
    assert(
      live?.equals(scriptedShakeSource.read(path)),
      'battle scripted shake source differs from the frozen candidate',
    )
    return preScriptedShake.read(path)
  }
  const readBeforeBattleLearnedSkills = (path) => {
    const live = readBeforeBattleScriptedShake(path)
    if (!preLearnedSkills || !isTestingBattleLearnedSkillsSource(path)) return live
    assert(
      live?.equals(learnedSkillsSource.read(path)),
      'battle learned-skills source differs from the frozen candidate',
    )
    return preLearnedSkills.read(path)
  }
  const readBeforeBattleCasualtyRoster = (path) => {
    const live = readBeforeBattleLearnedSkills(path)
    if (!preCasualtyRoster || !isTestingBattleCasualtyRosterSource(path)) return live
    assert(
      live?.equals(casualtyRosterSource.read(path)),
      'battle casualty source differs from the frozen candidate',
    )
    return preCasualtyRoster.read(path)
  }
  const readBeforeBattleCooperativeRoster = (path) => {
    const live = readBeforeBattleCasualtyRoster(path)
    if (!preCooperativeRoster || !isTestingBattleCooperativeRosterSource(path)) return live
    assert(
      live?.equals(cooperativeRosterSource.read(path)),
      'battle cooperative source differs from the frozen candidate',
    )
    return preCooperativeRoster.read(path)
  }
  const readBeforeBattleSceneObserver = (path) => {
    const live = readBeforeBattleCooperativeRoster(path)
    if (!preSceneObserver || !isTestingBattleSceneObserverSource(path)) return live
    assert(
      live?.equals(sceneObserverSource.read(path)),
      'battle scene observer differs from the frozen candidate',
    )
    return preSceneObserver.read(path)
  }
  const readBeforeBattleEnemyTransform = (path) => {
    const live = readBeforeBattleSceneObserver(path)
    if (!preEnemyTransform || !isTestingBattleEnemyTransformSource(path)) return live
    assert(
      live?.equals(enemyTransformSource.read(path)),
      'battle transform source differs from the frozen candidate',
    )
    return preEnemyTransform.read(path)
  }
  const readBeforeBattleActionCadence = (path) => {
    const live = readBeforeBattleEnemyTransform(path)
    if (!preActionCadence || path !== testingBattleSessionSourcePath) return live
    assert(
      live?.equals(actionCadenceSource.read(path)),
      'battle action cadence source differs from its fixed candidate',
    )
    return preActionCadence.read(path)
  }
  const readBeforeBattleSpellFeedback = (path) => {
    const live = readBeforeBattleActionCadence(path)
    if (!preSpellFeedback || !isTestingBattleSpellFeedbackSource(path)) return live
    assert(
      live?.equals(spellFeedbackSource.read(path)),
      `enemy spell feedback source changed: ${path}`,
    )
    return preSpellFeedback.read(path)
  }
  const readBeforeBattleSummonPlayback = (path) => {
    const live = readBeforeBattleSpellFeedback(path)
    if (!preSummonPlayback || path !== testingBattleSessionSourcePath) return live
    assert(
      live?.equals(summonPlaybackSource.read(path)),
      `enemy summon playback source changed: ${path}`,
    )
    return preSummonPlayback.read(path)
  }
  const readBeforeBattleEnemyColor = (path) => {
    const live = readBeforeBattleSummonPlayback(path)
    if (!preEnemyColor || !isTestingBattleEnemyColorSource(path)) return live
    assert(
      live?.equals(enemyColorSource.read(path)),
      `enemy color observation source changed: ${path}`,
    )
    return preEnemyColor.read(path)
  }
  const readBeforeBattleSummonDivision = (path) => {
    const live = readBeforeBattleEnemyColor(path)
    if (!preSummonDivision || !isTestingBattleSummonDivisionSource(path)) return live
    assert(
      live?.equals(summonDivisionSource.read(path)),
      `battle summon and division source differs from its fixed candidate: ${path}`,
    )
    return preSummonDivision.read(path)
  }
  const readBeforeBattleSummon = (path) => {
    const live = readBeforeBattleSummonDivision(path)
    if (!preSummon || !isTestingBattleSummonSource(path)) return live
    assert(
      live?.equals(summonSource.read(path)),
      'battle summon source differs from its fixed candidate',
    )
    return preSummon.read(path)
  }
  const beforeQ2Coverage = (path, bytes) => {
    const priorDisplay = preDisplay
      ? restoreTestingQ2DisplaySourceBindings(path, bytes, {
          readSource: menuIsolation.read,
          readBase: preDisplay.read,
          readFixed: displaySource.read,
        })
      : bytes
    const priorPalace = prePalace
      ? restoreTestingQ2PalaceSourceBindings(path, priorDisplay, {
          readSource: readBeforeDisplay,
          readBase: prePalace.read,
          readFixed: palaceSource.read,
        })
      : priorDisplay
    const priorRain = preDaliRain
      ? restoreTestingQ2DaliRainSourceBindings(path, priorPalace, {
          readSource: readBeforePalace,
          readBase: preDaliRain.read,
          readFixed: daliRainSource.read,
        })
      : priorPalace
    const priorDali = preDali
      ? restoreTestingQ2DaliSourceBindings(path, priorRain, {
          readSource: readBeforeDaliRain,
          readBase: preDali.read,
          readFixed: daliSource.read,
        })
      : priorRain
    const priorShangshu = preShangshu
      ? restoreTestingQ2ShangshuSourceBindings(path, priorDali, {
          readSource: readBeforeDali,
          readBase: preShangshu.read,
          readFixed: shangshuSource.read,
        })
      : priorDali
    const priorForestInn = preForestInn
      ? restoreTestingQ2ForestInnSourceBindings(path, priorShangshu, {
          readSource: readBeforeShangshu,
          readBase: preForestInn.read,
          readFixed: forestInnSource.read,
        })
      : priorShangshu
    const priorStoneElder = preQ2StoneElder
      ? restoreTestingQ2StoneElderSourceBindings(path, priorForestInn, {
          readSource: readBeforeForestInn,
          readBase: preQ2StoneElder.read,
          readFixed: q2StoneElderSource.read,
        })
      : priorForestInn
    const priorPhoenix = preQ2Phoenix
      ? restoreTestingQ2PhoenixSourceBindings(path, priorStoneElder, {
          readSource: readBeforeQ2StoneElder,
          readBase: preQ2Phoenix.read,
          readFixed: q2PhoenixSource.read,
        })
      : priorStoneElder
    const priorGaiLuojiao = preQ2GaiLuojiao
      ? restoreTestingQ2GaiLuojiaoSourceBindings(path, priorPhoenix, {
          readSource: readBeforeQ2Phoenix,
          readBase: preQ2GaiLuojiao.read,
          readFixed: q2GaiLuojiaoSource.read,
        })
      : priorPhoenix
    const priorTowerMing = preQ2TowerMing
      ? restoreTestingQ2TowerMingSourceBindings(path, priorGaiLuojiao, {
          readSource: readBeforeQ2GaiLuojiao,
          readBase: preQ2TowerMing.read,
          readFixed: q2TowerMingSource.read,
        })
      : priorGaiLuojiao
    const priorTianGhost = preQ2TianGhost
      ? restoreTestingQ2TianGhostSourceBindings(path, priorTowerMing, {
          readSource: readBeforeQ2TowerMing,
          readBase: preQ2TianGhost.read,
          readFixed: q2TianGhostSource.read,
        })
      : priorTowerMing
    const priorTowerFox = preQ2TowerFox
      ? restoreTestingQ2TowerFoxSourceBindings(path, priorTianGhost, {
          readSource: readBeforeQ2TianGhost,
          readBase: preQ2TowerFox.read,
          readFixed: q2TowerFoxSource.read,
        })
      : priorTianGhost
    const priorTomb = preQ2Tomb
      ? restoreTestingQ2TombSourceBindings(path, priorTowerFox, {
          readSource: readBeforeQ2TowerFox,
          readBase: preQ2Tomb.read,
          readFixed: q2TombSource.read,
        })
      : priorTowerFox
    const priorEscorts = preQ2Escorts
      ? restoreTestingQ2EscortsSourceBindings(path, priorTomb, {
          readSource: readBeforeQ2Tomb,
          readBase: preQ2Escorts.read,
          readFixed: q2EscortsSource.read,
        })
      : priorTomb
    const priorInn = preQ2Inn
      ? restoreTestingQ2InnSourceBindings(path, priorEscorts, {
          readSource: readBeforeQ2Escorts,
          readBase: preQ2Inn.read,
          readFixed: q2InnSource.read,
        })
      : priorEscorts
    const priorRing = preQ2Ring
      ? restoreTestingQ2RingSourceBindings(path, priorInn, {
          readSource: readBeforeQ2Inn,
          readBase: preQ2Ring.read,
          readFixed: q2RingSource.read,
        })
      : priorInn
    const priorRooftop = preQ2Rooftop
      ? restoreTestingQ2RooftopSourceBindings(path, priorRing, {
          readSource: readBeforeQ2Ring,
          readBase: preQ2Rooftop.read,
          readFixed: q2RooftopSource.read,
        })
      : priorRing
    const priorEntryAuto = preQ2EntryAuto
      ? restoreTestingQ2EntryAutoSourceBindings(path, priorRooftop, {
          readSource: readBeforeQ2Rooftop,
          readBase: preQ2EntryAuto.read,
          readFixed: q2EntryAutoSource.read,
        })
      : priorRooftop
    const priorNotice = preQ2Notice
      ? restoreTestingQ2NoticeSourceBindings(path, priorEntryAuto, {
          readSource: readBeforeQ2EntryAuto,
          readBase: preQ2Notice.read,
          readFixed: q2NoticeSource.read,
        })
      : priorEntryAuto
    const priorPeach = preQ2Peach
      ? restoreTestingQ2PeachSourceBindings(path, priorNotice, {
          readSource: readBeforeQ2Notice,
          readBase: preQ2Peach.read,
          readFixed: q2PeachSource.read,
        })
      : priorNotice
    const priorPlacement = preQ2Placement
      ? restoreTestingQ2PlacementSourceBindings(path, priorPeach, {
          readSource: readBeforeQ2Peach,
          readBase: preQ2Placement.read,
          readFixed: q2PlacementSource.read,
        })
      : priorPeach
    return preQ2Coverage
      ? restoreTestingQ2CoverageSourceBindings(path, priorPlacement, {
          readSource: readBeforeQ2Placement,
          readBase: preQ2Coverage.read,
          readFixed: q2CoverageSource.read,
        })
      : priorPlacement
  }
  const beforePartyPose = (path, bytes) =>
    prePartyPose
      ? restoreTestingPartyPoseSourceBindings(path, bytes, {
          readSource: readBeforeQ2Coverage,
          readBase: prePartyPose.read,
          readFixed: partyPoseSource.read,
        })
      : bytes
  const beforeBattleSummon = (path, bytes) => {
    const priorPartyPose = beforePartyPose(path, beforeQ2Coverage(path, bytes))
    const priorCliffEntry = preCliffEntry
      ? restoreTestingCliffEntrySourceBindings(path, priorPartyPose, {
          readSource: readBeforePartyPose,
          readBase: preCliffEntry.read,
          readFixed: cliffEntrySource.read,
        })
      : priorPartyPose
    const priorStoryPresentation = preStoryPresentation
      ? restoreTestingStoryPresentationSourceBindings(path, priorCliffEntry, {
          readSource: readBeforeCliffEntry,
          readBase: preStoryPresentation.read,
          readFixed: storyPresentationSource.read,
        })
      : priorCliffEntry
    const priorSceneItemExit = preSceneItemExit
      ? restoreTestingSceneItemExitSourceBindings(path, priorStoryPresentation, {
          readSource: readBeforeStoryPresentation,
          readBase: preSceneItemExit.read,
          readFixed: sceneItemExitSource.read,
        })
      : priorStoryPresentation
    const priorWorldAwareness = preWorldAwareness
      ? restoreTestingWorldAwarenessSourceBindings(path, priorSceneItemExit, {
          readSource: readBeforeSceneItemExit,
          readBase: preWorldAwareness.read,
          readFixed: worldAwarenessSource.read,
        })
      : priorSceneItemExit
    const priorWorldItemTarget = preWorldItemTarget
      ? restoreTestingWorldItemTargetSourceBindings(path, priorWorldAwareness, {
          readSource: readBeforeWorldAwareness,
          readBase: preWorldItemTarget.read,
          readFixed: worldItemTargetSource.read,
        })
      : priorWorldAwareness
    const priorPoisonNarration = prePoisonNarration
      ? restoreTestingBattlePoisonNarrationSourceBindings(path, priorWorldItemTarget, {
          readSource: readBeforeWorldItemTarget,
          readBase: prePoisonNarration.read,
          readFixed: poisonNarrationSource.read,
        })
      : priorWorldItemTarget
    const priorThrowStatus = preThrowStatus
      ? restoreTestingBattleThrowStatusSourceBindings(path, priorPoisonNarration, {
          readSource: readBeforeBattlePoisonNarration,
          readBase: preThrowStatus.read,
          readFixed: throwStatusSource.read,
        })
      : priorPoisonNarration
    const priorHiding = preHiding
      ? restoreTestingBattleHidingSourceBindings(path, priorThrowStatus, {
          readSource: readBeforeBattleThrowStatus,
          readBase: preHiding.read,
          readFixed: hidingSource.read,
        })
      : priorThrowStatus
    const priorItemUse = preItemUse
      ? restoreTestingBattleItemUseSourceBindings(path, priorHiding, {
          readSource: readBeforeBattleHiding,
          readBase: preItemUse.read,
          readFixed: itemUseSource.read,
        })
      : priorHiding
    const priorEnemySpellShake = preEnemySpellShake
      ? restoreTestingBattleEnemySpellShakeSourceBindings(path, priorItemUse, {
          readSource: readBeforeBattleItemUse,
          readBase: preEnemySpellShake.read,
          readFixed: enemySpellShakeSource.read,
        })
      : priorItemUse
    const priorEscapeSpell = preEscapeSpell
      ? restoreTestingBattleEscapeSpellSourceBindings(path, priorEnemySpellShake, {
          readSource: readBeforeBattleEnemySpellShake,
          readBase: preEscapeSpell.read,
          readFixed: escapeSpellSource.read,
        })
      : priorEnemySpellShake
    const priorSpellCurrency = preSpellCurrency
      ? restoreTestingBattleSpellCurrencySourceBindings(path, priorEscapeSpell, {
          readSource: readBeforeBattleEscapeSpell,
          readBase: preSpellCurrency.read,
          readFixed: spellCurrencySource.read,
        })
      : priorEscapeSpell
    const priorGuAndConfusion = preGuAndConfusion
      ? restoreTestingBattleGuAndConfusionSourceBindings(path, priorSpellCurrency, {
          readSource: readBeforeBattleSpellCurrency,
          readBase: preGuAndConfusion.read,
          readFixed: guAndConfusionSource.read,
        })
      : priorSpellCurrency
    const priorConditionalSpell = preConditionalSpell
      ? restoreTestingBattleConditionalSpellSourceBindings(path, priorGuAndConfusion, {
          readSource: readBeforeBattleGuAndConfusion,
          readBase: preConditionalSpell.read,
          readFixed: conditionalSpellSource.read,
        })
      : priorGuAndConfusion
    const priorWindBlow = preWindBlow
      ? restoreTestingBattleWindBlowSourceBindings(path, priorConditionalSpell, {
          readSource: readBeforeBattleConditionalSpell,
          readBase: preWindBlow.read,
          readFixed: windBlowSource.read,
        })
      : priorConditionalSpell
    const priorScriptedShake = preScriptedShake
      ? restoreTestingBattleScriptedShakeSourceBindings(path, priorWindBlow, {
          readSource: readBeforeBattleWindBlow,
          readBase: preScriptedShake.read,
          readFixed: scriptedShakeSource.read,
        })
      : priorWindBlow
    const priorLearnedSkills = preLearnedSkills
      ? restoreTestingBattleLearnedSkillsSourceBindings(path, priorScriptedShake, {
          readSource: readBeforeBattleScriptedShake,
          readBase: preLearnedSkills.read,
          readFixed: learnedSkillsSource.read,
        })
      : priorScriptedShake
    const priorCasualtyRoster = preCasualtyRoster
      ? restoreTestingBattleCasualtyRosterSourceBindings(path, priorLearnedSkills, {
          readSource: readBeforeBattleLearnedSkills,
          readBase: preCasualtyRoster.read,
          readFixed: casualtyRosterSource.read,
        })
      : priorLearnedSkills
    const priorCooperativeRoster = preCooperativeRoster
      ? restoreTestingBattleCooperativeRosterSourceBindings(path, priorCasualtyRoster, {
          readSource: readBeforeBattleCasualtyRoster,
          readBase: preCooperativeRoster.read,
          readFixed: cooperativeRosterSource.read,
        })
      : priorCasualtyRoster
    const priorSceneObserver = preSceneObserver
      ? restoreTestingBattleSceneObserverSourceBindings(path, priorCooperativeRoster, {
          readSource: readBeforeBattleCooperativeRoster,
          readBase: preSceneObserver.read,
          readFixed: sceneObserverSource.read,
        })
      : priorCooperativeRoster
    const priorEnemyTransform = preEnemyTransform
      ? restoreTestingBattleEnemyTransformSourceBindings(path, priorSceneObserver, {
          readSource: readBeforeBattleSceneObserver,
          readBase: preEnemyTransform.read,
          readFixed: enemyTransformSource.read,
        })
      : priorSceneObserver
    const priorActionCadence = preActionCadence
      ? restoreTestingBattleActionCadenceSourceBindings(path, priorEnemyTransform, {
          readSource: readBeforeBattleEnemyTransform,
          readBase: preActionCadence.read,
          readFixed: actionCadenceSource.read,
        })
      : priorEnemyTransform
    const priorSpellFeedback = preSpellFeedback
      ? restoreTestingBattleSpellFeedbackSourceBindings(path, priorActionCadence, {
          readSource: readBeforeBattleActionCadence,
          readBase: preSpellFeedback.read,
          readFixed: spellFeedbackSource.read,
        })
      : priorActionCadence
    const priorSummonPlayback = preSummonPlayback
      ? restoreTestingBattleSummonPlaybackSourceBindings(path, priorSpellFeedback, {
          readSource: readBeforeBattleSpellFeedback,
          readBase: preSummonPlayback.read,
          readFixed: summonPlaybackSource.read,
        })
      : priorSpellFeedback
    const priorEnemyColor = preEnemyColor
      ? restoreTestingBattleEnemyColorSourceBindings(path, priorSummonPlayback, {
          readSource: readBeforeBattleSummonPlayback,
          readBase: preEnemyColor.read,
          readFixed: enemyColorSource.read,
        })
      : priorSummonPlayback
    const current = preSummonDivision
      ? restoreTestingBattleSummonDivisionSourceBindings(path, priorEnemyColor, {
          readSource: readBeforeBattleEnemyColor,
          readBase: preSummonDivision.read,
          readFixed: summonDivisionSource.read,
        })
      : priorEnemyColor
    return preSummon
      ? restoreTestingBattleSummonSourceBindings(path, current, {
          readSource: readBeforeBattleSummonDivision,
          readBase: preSummon.read,
          readFixed: summonSource.read,
        })
      : current
  }
  const closureInputs = preClosure && {
    revision: closureRevision,
    readSource: (path) => beforeBattleSummon(path, readBeforeBattleSummon(path)),
    readBase: preClosure.read,
    readFixed: closureSource.read,
  }
  const readBeforeBattleClosure = (path) => {
    const current = readBeforeBattleSummon(path)
    if (!preClosure || !isTestingBattleClosureSource(path)) return current
    assert(
      current?.equals(closureSource.read(path)),
      `source differs from frozen battle closure candidate: ${path}`,
    )
    return preClosure.read(path)
  }
  const beforeBattleClosure = (path, bytes) =>
    closureInputs ? restoreTestingBattleClosureSourceBindings(path, bytes, closureInputs) : bytes
  const readBeforeBattleReview = (path) => {
    const current = readBeforeBattleClosure(path)
    if (!preBattleReview || !isTestingBattleReviewSource(path)) return current
    assert(
      current?.equals(battleReviewSource.read(path)),
      `source differs from frozen battle review candidate: ${path}`,
    )
    return preBattleReview.read(path)
  }
  const beforeBattleReview = (path, bytes) =>
    preBattleReview
      ? restoreTestingBattleReviewSourceBindings(path, bytes, {
          readSource: readBeforeBattleClosure,
          readBase: preBattleReview.read,
          readFixed: battleReviewSource.read,
        })
      : bytes
  const readBeforeLifecycle = (path) => {
    const current = readBeforeBattleReview(path)
    if (!preLifecycle || !isTestingBattleLifecycleSource(path)) return current
    assert(
      current?.equals(lifecycleSource.read(path)),
      `source differs from frozen battle lifecycle candidate: ${path}`,
    )
    return preLifecycle.read(path)
  }
  const beforeBattleLifecycle = (path, bytes) =>
    preLifecycle
      ? restoreTestingBattleLifecycleSourceBindings(path, bytes, {
          readSource: readBeforeBattleReview,
          readBase: preLifecycle.read,
          readFixed: lifecycleSource.read,
        })
      : bytes
  const projectVictoryBase =
    handoffSource && gitTree(root, testingProjectVictoryPublicationBase, [])
  const projectVictoryInputs = projectVictoryBase && {
    readBase: projectVictoryBase.read,
    readFixed: handoffSource.read,
    readSource: readBeforeLifecycle,
  }
  const beforeProjectVictory = (path, bytes) =>
    projectVictoryInputs
      ? restoreTestingProjectVictoryVersionBindings(path, bytes, projectVictoryInputs)
      : bytes
  const priorEncounterBindings = (path, current) => {
    const beforeHandoff = handoffSource
      ? restoreTestingBattleHandoffSourceBindings(path, current, {
          readSource: readBeforeLifecycle,
          readBase: preHandoff.read,
          readFixed: handoffSource.read,
        })
      : current
    if (!defeatSource) return beforeHandoff
    const beforeVictory = victorySource
      ? restoreTestingBattleVictorySourceBindings(path, beforeHandoff, {
          readSource: preHandoff?.read ?? readSource,
          readBase: preVictory.read,
          readFixed: victorySource.read,
        })
      : beforeHandoff
    return restoreTestingBattleDefeatSourceBindings(path, beforeVictory, {
      readSource: preVictory?.read ?? readSource,
      readBase: preBattleCasualtyDialogue.read,
      readFixed: defeatSource.read,
    })
  }
  const battleBridge = preBattle && {
    readSource: preHandoff?.read ?? readSource,
    fixed: { revision: battlePublicationRevision, readSource: preBattle.read },
    mechanismFixed: {
      revision: testingBattleSessionMechanismBase,
      readSource: preBattleMechanisms.read,
    },
    portraitFixed: {
      revision: testingBattleSessionPortraitBase,
      readSource: preBattlePortrait.read,
    },
    presentationFixed: {
      revision: testingBattleSessionPresentationBase,
      readSource: preBattlePresentation.read,
    },
    cadenceFixed: {
      revision: testingBattleSessionCadenceBase,
      readSource: preBattleCadence.read,
    },
    casualtyFixed: {
      revision: testingBattleSessionCasualtyBase,
      readSource: preBattleCasualty.read,
    },
    casualtyDialogueFixed: {
      revision: testingBattleSessionCasualtyDialogueBase,
      readSource: preBattleCasualtyDialogue.read,
    },
    playerActionsFixed: {
      revision: testingBattleSessionPlayerActionsBase,
      readSource: preBattlePlayerActions.read,
    },
    cooperativeRecoveryFixed: {
      revision: testingBattleSessionCooperativeRecoveryBase,
      readSource: preBattleCooperativeRecovery.read,
    },
    itemEffectsFixed: {
      revision: testingBattleSessionItemEffectsBase,
      readSource: preBattleItemEffects.read,
    },
    throwFeedbackFixed: {
      revision: testingBattleSessionThrowFeedbackBase,
      readSource: preBattleThrowFeedback.read,
    },
    enemyCastFixed: {
      revision: testingBattleSessionEnemyCastBase,
      readSource: preBattleEnemyCast.read,
    },
    specialStatusFixed: {
      revision: testingBattleSessionSpecialStatusBase,
      readSource: preBattleSpecialStatus.read,
    },
  }
  // The acquisition bridge replays the session caller it accepted before Q2.
  const readAcquisitionSource = (path) => {
    if (preBattle && path === testingBattleSessionSourcePath) return preBattle.read(path)
    if (projectVictoryInputs && path === testingProjectVictoryVersionPath) {
      assertTestingProjectVictoryVersionSource(projectVictoryInputs)
      return projectVictoryBase.read(path)
    }
    return readBeforeLifecycle(path)
  }
  // Historical layers retain their original sources. Only the finite successor
  // sources may differ from this accepted predecessor in the live checkout.
  const readPredecessorSource = preAcquisition
    ? (sourcePath) => {
        const fixed = preAcquisition.read(sourcePath)
        if (handoffSource && isTestingBattleHandoffHistoricalSource(sourcePath)) {
          const live = readBeforeLifecycle(sourcePath)
          assert(
            live?.equals(handoffSource.read(sourcePath)),
            `source differs from frozen hostile handoff candidate: ${sourcePath}`,
          )
        } else if (
          !isTestingAcquisitionSourcePath(sourcePath) &&
          !(defeatSource && isTestingBattleDefeatSourcePath(sourcePath))
        ) {
          const live = readBeforeLifecycle(sourcePath)
          assert(
            live && fixed?.equals(live),
            `source outside acquisition bridge differs from fixed predecessor: ${sourcePath}`,
          )
        }
        return fixed
      }
    : readSource
  const acquisitionPrevious = (path, current) =>
    preAcquisition && isTestingAcquisitionSourceBridgePath(path)
      ? preAcquisition.read(path)
      : current
  const assertAcquisitionSuccessor = (path, previous, current) => {
    if (previous.equals(current)) return
    assert(preAcquisition, 'acquisition source snapshot missing')
    assertTestingAcquisitionSourceBridge(path, previous, current, readAcquisitionSource, {
      revision: acquisitionRevision,
      readSource: preAcquisition.read,
    })
  }
  for (const row of manifest.additions) {
    safePath(row.path)
    const nativeStage =
      stagePublicationRevision !== undefined &&
      isTestingStageEvidencePath(row.path) &&
      (row.path !== 'docs/testing/e2e/evidence/e2e-010.json' ||
        palacePublicationRevision !== undefined)
    const nativeBattle =
      battlePublicationRevision !== undefined && isTestingBattleEvidencePath(row.path)
    assert(
      row.path.startsWith('docs/') &&
        (row.path.endsWith('.md') ||
          ((nativeStage || nativeBattle) &&
            row.templateId === 'test-machine-evidence-v1' &&
            row.variant === undefined &&
            row.historyOverlay === undefined)) &&
        !identities.has(row.path) &&
        !additions.has(row.path) &&
        typeof row.templateId === 'string' &&
        /^[a-f\d]{64}$/u.test(row.afterSha256 ?? ''),
      `document location: invalid or colliding addition: ${row.path}`,
    )
    reviewValid(row.review, row.path)
    additions.set(row.path, row)
  }
  for (const row of manifest.artifacts ?? []) {
    safePath(row.path)
    assert(
      row.path.startsWith('docs/tasks/evidence/') &&
        !/\.(?:md|json|html)$/iu.test(row.path) &&
        !identities.has(row.path) &&
        !additions.has(row.path) &&
        !artifacts.has(row.path) &&
        /^[a-f\d]{64}$/u.test(row.sha256 ?? '') &&
        Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        typeof row.purpose === 'string' &&
        row.purpose.trim(),
      `document location: invalid, colliding or document artifact: ${row.path}`,
    )
    assert.deepEqual(
      Object.keys(row).sort(),
      ['bytes', 'path', 'purpose', 'sha256'],
      'unexpected artifact fields',
    )
    artifacts.set(row.path, row)
  }
  for (const row of manifest.retired) {
    assert(
      row.path === 'CLAUDE.md' &&
        !retired.has(row.path) &&
        source.entries.has(row.path) &&
        typeof row.replacement === 'string',
      'document location: unadmitted retirement',
    )
    safePath(row.replacement)
    source.read(row.path)
    assert(
      ordinaryBytes(root, row.path) === undefined,
      `retired document still exists: ${row.path}`,
    )
    assert(
      ordinaryBytes(root, row.replacement),
      `retirement replacement missing: ${row.replacement}`,
    )
    retired.set(row.path, row)
  }
  const reservedPaths = new Set([
    ...changes.keys(),
    ...additions.keys(),
    ...artifacts.keys(),
    ...retired.keys(),
    ...(manifest.artifactAliases ?? []).flatMap((row) => [row.path, row.retained, row.receipt]),
    ...(manifest.compressedArtifacts ?? []).flatMap((row) => [row.path, row.stored]),
  ])
  for (const path of [...reservedPaths])
    if (typeof path === 'string') reservedPaths.add(currentDocumentPath(path))
  const artifactRetirements = loadArtifactRetirements({
    rows: retirementList.rows,
    source,
    physicalPath: currentDocumentPath,
    readState: physicalState,
    safePath,
    reservedPaths,
  })
  // A large retired set must not strand ordinary mandatory source reads behind
  // its rolling cache window. Restore those reads through the same bounded batch.
  source.prefetch(requiredSourcePaths)
  const compressed = loadCompressedArtifacts({
    rows: manifest.compressedArtifacts,
    source,
    physicalPath: currentDocumentPath,
    readState: physicalState,
    safePath,
  })
  const currentState = (path) => compressed.readState(path) ?? physicalState(path)
  const aliases = loadArtifactContentAliases({
    rows: manifest.artifactAliases,
    source,
    physicalPath: currentDocumentPath,
    readCurrent: (path) => currentState(path).buffer ?? undefined,
    safePath,
  })
  for (const row of compressed.entries)
    assert(!aliases.get(row.path), 'compressed carrier cannot also be a content alias')
  const readBuffer = (identity) =>
    artifactRetirements.get(identity)
      ? undefined
      : (currentState(aliases.resolve(identity)).buffer ?? undefined)
  const read = (identity) => readBuffer(identity)?.toString('utf8')
  const assertCurrent = (path, expectedBeforeSha256) => {
    auditedPaths.add(path)
    assert(!retired.has(path), `retired identity has no current body: ${path}`)
    assert(
      !artifactRetirements.get(path),
      `retired artifact has no current body; recover the fixed Git source explicitly: ${path}`,
    )
    const state = currentState(aliases.resolve(path))
    const current = state.buffer
    assert(current, `document location: current file missing: ${currentDocumentPath(path)}`)
    const priorRuntimeBody = battleQuality.restore(path, battleCloseout.restore(path, current))
    const priorMenuBody = menuIsolation.restore(
      path,
      runtimeOwnership.restore(path, priorRuntimeBody),
    )
    const priorVersionBody = versionRebinding?.restore(path, priorMenuBody) ?? priorMenuBody
    const artifact = artifacts.get(path)
    if (artifact) {
      // New receipt attachments are ordinary non-executable checkout files;
      // unlike moved originals, they have no previous Git mode to inherit.
      assert.equal(
        state.identity.mode & 0o777,
        0o644,
        `artifact must retain regular 0644 mode: ${path}`,
      )
      assert.equal(current.length, artifact.bytes, `artifact byte extent drift: ${path}`)
      assert.equal(hash(current), artifact.sha256, `artifact bytes drift: ${path}`)
      return { current, artifact }
    }
    const addition = additions.get(path)
    if (addition) {
      if (postPalace && isPublishedTestingStagePath(path)) {
        const older = beforeProjectVictory(path, beforePartyPose(path, priorVersionBody))
        const predecessor = acquisitionPrevious(path, older)
        assert(
          postPalace.read(path)?.equals(predecessor),
          `published stage differs from fixed 010 base: ${path}`,
        )
        assertAcquisitionSuccessor(path, predecessor, older)
      }
      assert.equal(hash(current), addition.afterSha256, `addition body drift: ${path}`)
      assert.equal(
        addition.review.reviewedLines,
        current.toString('utf8').split('\n').length,
        `candidate body line extent differs: ${path}`,
      )
      if (isTestingStageEvidencePath(path)) assertTestingStageEvidence(path, current)
      if (isTestingBattleEvidencePath(path)) assertTestingBattleEvidence(path, current)
      if (closureInputs)
        assertTestingBattleClosureAddition(
          path,
          beforeBattleSummon(path, priorVersionBody),
          closureInputs,
        )
      return { current, change: addition }
    }
    const change = changes.get(path)
    const pin = source.entries.get(path)
    assert(
      ['100644', '100755'].includes(pin?.mode) && pin.type === 'blob',
      `document location: fixed source missing: ${path}`,
    )
    assert.equal(
      state.identity.mode & 0o777,
      Number.parseInt(pin.mode, 8) & 0o777,
      `file mode drift: ${path}`,
    )
    if (!change) {
      if (
        blobHash(current) !== pin.object &&
        testingSourceMaintenanceAdmissions.some((entry) => entry.path === path)
      ) {
        const previous = source.read(path)
        assertTestingSourceMaintenance({ path, before: previous, current, readBuffer })
        if (expectedBeforeSha256)
          assert.equal(
            hash(previous),
            expectedBeforeSha256,
            `historical review/source drift: ${path}`,
          )
        return { current, previous }
      }
      assert.equal(blobHash(current), pin.object, `unreviewed body drift: ${path}`)
      if (expectedBeforeSha256)
        assert.equal(hash(current), expectedBeforeSha256, `historical review/source drift: ${path}`)
      return { current }
    }
    const previous = source.read(path)
    if (expectedBeforeSha256)
      assert.equal(hash(previous), expectedBeforeSha256, `historical review/source drift: ${path}`)
    if (change.mode === 'testing-source-bridge') {
      assert.equal(hash(current), change.afterSha256, `current body drift: ${path}`)
      assert.equal(
        change.review.reviewedLines,
        current.toString('utf8').split('\n').length,
        `candidate body line extent differs: ${path}`,
      )
      let bridgeSource = previous
      const maintenanceRevision = admission.testingCatalogMaintenanceRevision
      if (
        maintenanceRevision !== undefined &&
        testingSourceMaintenanceAdmissions.some(
          (entry) => entry.kind === 'testing-catalog' && entry.path === path,
        )
      ) {
        assert(
          /^[a-f\d]{40}$/u.test(maintenanceRevision),
          'fixed catalog maintenance revision required',
        )
        bridgeSource = gitTree(root, maintenanceRevision, [path]).read(path)
        assertTestingSourceMaintenance({
          path,
          before: previous,
          current: bridgeSource,
          readBuffer: readPredecessorSource,
        })
      }
      const readPublishedSource = postPalace
        ? (sourcePath) => {
            const fixed = postPalace.read(sourcePath)
            if (sourcePath !== testingChestSourcePath) {
              const live = readPredecessorSource(sourcePath)
              assert(
                live && fixed?.equals(live),
                `published source differs from fixed 010 base: ${sourcePath}`,
              )
            }
            return fixed
          }
        : readPredecessorSource
      const currentBeforeEncounter = priorEncounterBindings(
        path,
        beforeProjectVictory(
          path,
          beforeBattleLifecycle(
            path,
            beforeBattleReview(
              path,
              beforeBattleClosure(path, beforeBattleSummon(path, priorVersionBody)),
            ),
          ),
        ),
      )
      const acceptedCurrent =
        preBattle && (path === testingCatalogPath || isTestingBattleSessionEvidencePath(path))
          ? preBattle.read(path)
          : currentBeforeEncounter
      const predecessor = acquisitionPrevious(path, acceptedCurrent)
      const chestBridge = postPalace && isTestingChestSourceBridgePath(path)
      const publication = chestBridge ? postPalace.read(path) : predecessor
      if (stagePublicationRevision !== undefined && path === testingCatalogPath) {
        const publicationBase = gitTree(root, stagePublicationRevision, [path]).read(path)
        assertTestingSourceBridge(path, bridgeSource, publicationBase, readPublishedSource)
        if (palacePublicationRevision !== undefined) {
          const palaceBase = gitTree(root, palacePublicationRevision, [path]).read(path)
          assertTestingStagePublication(publicationBase, palaceBase, additions)
          assertTestingPalaceStagePublication(palaceBase, publication, additions)
        } else {
          assertTestingStagePublication(publicationBase, publication, additions)
        }
      } else if (isTestingSourceBridgePath(path)) {
        assertTestingSourceBridge(path, bridgeSource, publication, readPublishedSource)
      } else if (testingSourceMaintenanceAdmissions.some((entry) => entry.path === path)) {
        assertTestingSourceMaintenance({
          path,
          before: bridgeSource,
          current: predecessor,
          readBuffer: readPredecessorSource,
        })
      } else {
        assert(
          bridgeSource.equals(predecessor),
          `acquisition predecessor changed unadmitted historical facts: ${path}`,
        )
      }
      if (chestBridge)
        assertTestingChestSourceBridge(path, publication, predecessor, readPredecessorSource, {
          revision: postPalaceRevision,
          readSource: postPalace.read,
        })
      assertAcquisitionSuccessor(path, predecessor, acceptedCurrent)
      if (preBattle && path === testingCatalogPath)
        assertTestingBattlePublication(
          acceptedCurrent,
          currentBeforeEncounter,
          additions,
          battleBridge,
        )
      if (preBattle && isTestingBattleSessionEvidencePath(path))
        assertTestingBattleSessionSourceBridge(
          path,
          acceptedCurrent,
          currentBeforeEncounter,
          battleBridge,
        )
      return { current, previous, change }
    }
    {
      if (change.mode === 'reviewed')
        assert.equal(hash(current), change.afterSha256, `current body drift: ${path}`)
      const currentSpans = preservedSpans(current.toString('utf8'))
      const previousSpans = preservedSpans(previous.toString('utf8'))
      if (change.historyDisposition === 'fixed-git-source') {
        assert.equal(change.mode, 'reviewed', 'history relocation requires independent review')
        const expected = fixedGitSourceUrl(path, manifest.baseRevision)
        assert(
          markdownLinks(current.toString('utf8')).some(
            ({ target }) => target.split('#', 1)[0] === expected,
          ),
          `fixed historical source link missing: ${path}`,
        )
        let offset = 0
        for (const span of currentSpans) {
          const index = previousSpans.indexOf(span, offset)
          assert(index >= 0, `preserved historical source changed: ${path}`)
          offset = index + 1
        }
      } else
        assert.deepEqual(
          currentSpans,
          previousSpans,
          `preserved historical source changed: ${path}`,
        )
      if (change.mode === 'links') {
        const expected = Buffer.from(
          transformDocument(
            previous.toString('utf8'),
            path,
            currentDocumentPath(path),
            (target) => compressed.get(target)?.stored ?? target,
          ),
        )
        const expectedHash = hash(expected)
        if (change.afterSha256 !== undefined)
          assert.equal(
            change.afterSha256,
            expectedHash,
            `nonmechanical document change: declared SHA differs from fixed transform: ${path}`,
          )
        assert(current.equals(expected), `nonmechanical document change: ${path}`)
        // Derived from the immutable source and algorithm, never current bytes.
        // The admitted manifest stays untouched; only this runtime view is filled.
        change.afterSha256 = expectedHash
      } else
        assert.equal(
          change.review.reviewedLines,
          current.toString('utf8').split('\n').length,
          `candidate body line extent differs: ${path}`,
        )
    }
    return { current, previous, change }
  }
  // Unretired originals keep exact current bytes; admitted duplicate TSVs may
  // share their baseline without merging executions. Explicitly retired inputs
  // have only their separately checked fixed Git source, never a current fallback.
  for (const [target, identity] of identities) {
    if (target === identity) {
      if (
        artifactRetirementReplayRoots.some((root) => identity.startsWith(`${root}/`)) &&
        !artifactRetirements.get(identity)
      )
        assertCurrent(identity)
      continue
    }
    assert(ordinaryBytes(root, identity) === undefined, `old location still exists: ${identity}`)
    if (!artifactRetirements.get(identity)) assertCurrent(identity)
  }
  for (const path of [
    ...changes.keys(),
    ...additions.keys(),
    ...artifacts.keys(),
    ...compressed.entries.map((row) => row.path),
  ])
    assertCurrent(path)
  // Immutable machine evidence and governance carriers cannot be edited through
  // this contract, even when a consumer happens not to visit them in this run.
  for (const path of source.entries.keys())
    if (path.startsWith('docs/phase-governance/') && /\.(?:md|json|html)$/u.test(path))
      assertCurrent(path)
  const expectedInventory = [
    ...new Set([
      ...[...identities.keys()].filter(
        (path) =>
          managedPath(path) &&
          !aliases.get(path) &&
          !compressed.get(path) &&
          !artifactRetirements.get(path),
      ),
      ...[...additions.keys()].filter(managedPath),
      ...artifacts.keys(),
      ...compressed.entries.map((row) => row.stored).filter(managedPath),
      documentLocationManifest,
    ]),
  ].sort()
  const assertInventory = () => {
    assert.deepEqual(
      currentInventory(root, managedRoots),
      expectedInventory,
      'migration target file set differs (unclassified addition or missing original)',
    )
    assert.deepEqual(currentInventory(root, ['docs/ops']), [], 'retired ops tree reappeared')
  }
  assertInventory()
  return {
    manifest,
    changes,
    additions,
    artifacts,
    retired,
    retiredArtifacts: artifactRetirements.entries,
    read,
    readBuffer,
    currentPath: (path) => compressed.get(aliases.resolve(path))?.stored ?? aliases.resolve(path),
    artifactAliases: aliases.entries,
    compressedArtifacts: compressed.entries,
    compressedArtifact: (path) => compressed.get(path),
    identity: (path) => compressed.get(path)?.path ?? identities.get(path) ?? path,
    sourceBuffer: source.read,
    assertCurrent,
    historicalLink: (file, text, link) => {
      const identity = identities.get(file) ?? file
      if (!source.entries.has(identity)) return false
      const spans = preservedSpans(source.read(identity).toString('utf8'))
      const span = preservedMarkdownRanges(text).find(
        (range) => link.start >= range.start && link.end <= range.end && spans.includes(range.text),
      )
      if (!span || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(link.target)) return false
      const path = decodeURIComponent(link.target.split(/[?#]/u, 1)[0])
      const target = (
        path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(identity), path)
      ).replace(/\/$/u, '')
      return (
        source.entries.has(target) ||
        [...source.entries.keys()].some((entry) => entry.startsWith(`${target}/`))
      )
    },
    assertUnchanged: () => {
      assert(
        ordinaryBytes(root, documentLocationManifest)?.equals(manifestBytes),
        'location contract changed during read',
      )
      source.prefetch(requiredSourcePaths)
      for (const path of auditedPaths) assertCurrent(path)
      aliases.assertUnchanged()
      compressed.assertUnchanged()
      artifactRetirements.assertUnchanged()
      retirementList.assertUnchanged()
      versionRebinding?.assertUnchanged()
      assertInventory()
    },
  }
}
