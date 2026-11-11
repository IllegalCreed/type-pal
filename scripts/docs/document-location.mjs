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
  assertTestingBattleEvidence,
  assertTestingBattlePublication,
  assertTestingBattleSessionSourceBridge,
  isTestingBattleEvidencePath,
  isTestingBattleSessionEvidencePath,
  testingBattlePublicationBase,
  testingBattleSessionMechanismBase,
  testingBattleSessionSourcePath,
} from './testing-battle-publication.mjs'
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
  const readSource = (sourcePath) => ordinaryBytes(root, sourcePath)
  const battleBridge = preBattle && {
    readSource,
    fixed: { revision: battlePublicationRevision, readSource: preBattle.read },
    mechanismFixed: {
      revision: testingBattleSessionMechanismBase,
      readSource: preBattleMechanisms.read,
    },
  }
  // The acquisition bridge replays the session caller it accepted before Q2.
  const readAcquisitionSource = (path) =>
    preBattle && path === testingBattleSessionSourcePath ? preBattle.read(path) : readSource(path)
  // Historical layers retain their original sources. Only the finite successor
  // sources may differ from this accepted predecessor in the live checkout.
  const readPredecessorSource = preAcquisition
    ? (sourcePath) => {
        const fixed = preAcquisition.read(sourcePath)
        if (!isTestingAcquisitionSourcePath(sourcePath)) {
          const live = readSource(sourcePath)
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
        const predecessor = acquisitionPrevious(path, current)
        assert(
          postPalace.read(path)?.equals(predecessor),
          `published stage differs from fixed 010 base: ${path}`,
        )
        assertAcquisitionSuccessor(path, predecessor, current)
      }
      assert.equal(hash(current), addition.afterSha256, `addition body drift: ${path}`)
      assert.equal(
        addition.review.reviewedLines,
        current.toString('utf8').split('\n').length,
        `candidate body line extent differs: ${path}`,
      )
      if (isTestingStageEvidencePath(path)) assertTestingStageEvidence(path, current)
      if (isTestingBattleEvidencePath(path)) assertTestingBattleEvidence(path, current)
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
      const acceptedCurrent =
        preBattle && (path === testingCatalogPath || isTestingBattleSessionEvidencePath(path))
          ? preBattle.read(path)
          : current
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
        assertTestingBattlePublication(acceptedCurrent, current, additions, battleBridge)
      if (preBattle && isTestingBattleSessionEvidencePath(path))
        assertTestingBattleSessionSourceBridge(path, acceptedCurrent, current, battleBridge)
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
      assertInventory()
    },
  }
}
