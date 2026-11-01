// Shared physical transaction only. Semantic callers must validate their own closed admission.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { currentNativeControlAdmissions } from './current-native-control-admission.mjs'
import {
  currentLedgerStorageUpgrade,
  currentReviewStorageUpgrades,
  currentStructuralReviewStorageUpgrade,
} from './current-review-ledger-storage-admission.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { loadDocumentRegistry } from './document-registry.mjs'
import { readPinnedGitDocuments } from './git-document-batch.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { nativeArtifactBindings } from './historical-native-artifact-bindings.mjs'
import { historicalVitestCohort } from './historical-vitest-cohort.mjs'
import { readIncrementalGitSource } from './incremental-git-source.mjs'
import { assertIncrementalOwnerSet, inspectIncrementalCohort } from './incremental-review.mjs'
import { incrementalReviewAdmission } from './incremental-review-admission.mjs'
import { incrementalReviewPath } from './incremental-review-content.mjs'
import { readNativeArtifactRetirements } from './native-artifact-retirements.mjs'
import {
  assertReviewRecordSourceUnchanged,
  loadReviewRecords,
  readReviewRecordObject,
  reviewDirRelative,
} from './review-record-storage.mjs'
import { checkOrdinaryPath, fileState, inspectShardInventory } from './review-record-storage-io.mjs'
import { rollforwardRegistryPartition } from './rollforward-control-plan.mjs'
import { readRollforwardGitSource } from './rollforward-git-source.mjs'
import { inspectRollforwardCohort } from './rollforward-review.mjs'
import {
  assertRollforwardNativeInputs,
  rollforwardInputRepairs,
  rollforwardRetirements,
} from './rollforward-transaction-boundary.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`current-review-transaction: ${message}`)
}
const equal = (a, b, label) =>
  demand(
    isDeepStrictEqual(a, b) && JSON.stringify(a) === JSON.stringify(b),
    `value/key order mismatch: ${label}`,
  )
const capabilities = new WeakMap()
const administrativePaths = new Set([
  'docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md',
  'docs/ops/board.md',
  'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/s22-validation.log.gz',
])
function readAdministrativeSource(root, revision, path) {
  demand(
    administrativePaths.has(path) && /^[a-f\d]{40}$/u.test(revision),
    'bounded administrative Git source required',
  )
  const run = (args, encoding) =>
    execFileSync('git', args, {
      cwd: root,
      encoding,
      maxBuffer: 128 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  demand(
    run(['cat-file', '-t', revision], 'utf8').trim() === 'commit',
    'real administrative commit required',
  )
  const rows = run(['ls-tree', '-z', '--full-tree', revision, '--', path], 'utf8')
    .split('\0')
    .filter(Boolean)
  const row = rows.length === 1 && /^100644 blob ([a-f\d]{40})\t(.+)$/u.exec(rows[0])
  demand(row && row[2] === path, 'regular administrative Git blob required')
  return { mode: '100644', buffer: run(['cat-file', 'blob', row[1]]) }
}
const canonical = (value) => JSON.stringify(value)
function assertStates(root, states, parents) {
  for (const [path, expected] of parents) {
    const stat = lstatSync(path)
    demand(stat.isDirectory() && !stat.isSymbolicLink(), `parent not ordinary: ${path}`)
    equal({ dev: stat.dev, ino: stat.ino, mode: stat.mode }, expected, `parent changed: ${path}`)
  }
  for (const [path, expected] of states) {
    const actual = fileState(
      root,
      path,
      undefined,
      ['AGENTS.md', 'CLAUDE.md'].includes(path) ? '' : 'docs/',
    )
    demand(
      isDeepStrictEqual(actual.identity, expected.identity) &&
        (expected.buffer ? actual.buffer?.equals(expected.buffer) : !actual.buffer),
      `input changed: ${path}`,
    )
  }
}

function assertRecordSet(actual, expected, label) {
  demand(
    actual.size === 114 && expected.size === 114,
    `${label}: exact114 logical records required`,
  )
  equal([...actual.keys()].sort(), [...expected.keys()].sort(), `${label}: paths`)
  for (const [path, record] of expected) equal(actual.get(path), record, `${label}: ${path}`)
}

function assertAllPins(records, readBuffer, expectedPins = 2434, repairs = [], retired = []) {
  let count = 0
  for (const [owner, record] of records)
    for (const [index, row] of record.entries.entries()) {
      const bytes = readBuffer(row.path)
      const actual = Buffer.isBuffer(bytes) && sha(bytes)
      const repair = repairs.find(
        (entry) =>
          entry.owner === owner &&
          entry.index === index &&
          entry.path === row.path &&
          entry.beforeSha256 === row.afterSha256 &&
          entry.afterSha256 === actual,
      )
      demand(
        (Buffer.isBuffer(bytes) && (row.afterSha256 === actual || repair)) ||
          (bytes === null &&
            retired.some((entry) => entry.path === row.path && entry.sha256 === row.afterSha256)),
        `after pin mismatch: ${owner} -> ${row.path}`,
      )
      count++
    }
  demand(count === expectedPins, `unexpected after-pin count: ${count}`)
}

function assertTopLevelOwners(root, expected) {
  const wanted = [...expected.keys()]
    .filter(
      (path) =>
        path.startsWith(`${reviewDirRelative}/`) &&
        !path.slice(reviewDirRelative.length + 1).includes('/'),
    )
    .map((path) => path.slice(reviewDirRelative.length + 1))
    .sort()
  const actual = readdirSync(join(root, reviewDirRelative))
    .filter((name) => name.endsWith('.json'))
    .sort()
  equal(actual, wanted, 'exact top-level review owner inventory')
  for (const name of actual) {
    const stat = lstatSync(join(root, reviewDirRelative, name))
    demand(
      stat.isFile() && !stat.isSymbolicLink(),
      `top-level review owner must be ordinary: ${name}`,
    )
  }
}

function assertProtectedNative(readBuffer, incrementalRecords) {
  demand(
    historicalVitestCohort.protectedNative.length === 302,
    'exact302 protected native inputs required',
  )
  for (const entry of historicalVitestCohort.protectedNative)
    demand(sha(readBuffer(entry.path)) === entry.sha256, `protected native changed: ${entry.path}`)
  if (incrementalRecords) {
    const cohort = inspectIncrementalCohort(incrementalRecords)
    demand(
      cohort && nativeArtifactBindings.length === 473,
      'exact old473 plus new1460 native inputs required',
    )
    for (const entry of nativeArtifactBindings)
      demand(
        sha(readBuffer(entry.path)) === entry.carrierSha256,
        `old473 native changed: ${entry.path}`,
      )
    for (const row of cohort.rows.filter((entry) => entry.path.endsWith('.json')))
      demand(sha(readBuffer(row.path)) === row.sourceSha256, `new native changed: ${row.path}`)
  }
}

function publicReadback(root, plan) {
  const group = loadReviewRecords({
    root,
    readSourceSnapshot: (pin) => readGitDocumentSnapshot(plan.root, pin),
  })
  assertRecordSet(group.records, plan.records, 'public staged readback')
  equal(
    group.loadedSource.files.map((x) => x.path).sort(),
    [...plan.expected.keys()].filter((p) => p.startsWith(`${reviewDirRelative}/`)).sort(),
    'public physical set',
  )
  for (const [path, pin] of plan.sourcePins)
    equal(group.storages.get(path)?.source, pin, `original source pin: ${path}`)
  const readBuffer = (path) =>
    fileState(
      root,
      path,
      undefined,
      plan.incremental && ['AGENTS.md', 'CLAUDE.md'].includes(path) ? '' : 'docs/',
    ).buffer
  for (const [path, output] of plan.expected)
    demand(readBuffer(path)?.equals(output.bytes), `staged physical bytes differ: ${path}`)
  const retired = plan.rollforward
    ? rollforwardRetirements(plan.root, group.records, readBuffer)
    : []
  assertAllPins(group.records, readBuffer, plan.expectedPins, [], retired)
  if (plan.rollforward) assertRollforwardNativeInputs(readBuffer, group.records, retired)
  else assertProtectedNative(readBuffer, plan.incremental ? group.records : undefined)
  if (plan.incremental) {
    const { registry } = loadDocumentRegistry({
      manifestPath: join(root, 'docs/phase-governance/document-registry.json'),
    })
    demand(
      registry.entries.length === plan.expectedPins &&
        registry.shards.length === (plan.rollforward ? 10 : 9),
      'staged registry requires the complete admitted projection',
    )
    equal(
      registry.entries.map((row) => row.path).sort(),
      [...group.records.values()].flatMap((record) => record.entries.map((row) => row.path)).sort(),
      'staged registry/review membership',
    )
    const templates = JSON.parse(readBuffer('docs/phase-governance/templates/registry.json'))
    const cohort = inspectIncrementalCohort(group.records)
    const targets = [
      ...cohort.rows,
      ...(plan.rollforward
        ? [...inspectRollforwardCohort(group.records).byPath.values()].map((entry) => entry.row)
        : []),
      ...currentNativeControlAdmissions
        .filter((entry) => plan.changedControlPaths.has(entry.path))
        .map((entry) => group.records.get(entry.reviewRecord).entries[entry.index]),
    ].filter((row) => !retired.some((entry) => entry.path === row.path))
    const sourceCache = new Map()
    const incrementalSourceCache = new Map()
    const pinnedSources = plan.rollforward
      ? readPinnedGitDocuments(plan.root, [
          ...cohort.rows.map((row) => row.primarySource[0]),
          ...[...inspectRollforwardCohort(group.records).byPath.values()].map(
            ({ row }) => row.primarySource[0],
          ),
        ])
      : undefined
    const readSourceBuffer = (pin) => {
      const key = `${pin.revision}:${pin.path}`
      if (!sourceCache.has(key)) sourceCache.set(key, readGitDocumentSnapshot(plan.root, pin))
      return sourceCache.get(key)
    }
    for (const row of targets) {
      const issues = checkMigratedDocument(
        {
          path: row.path,
          templateId: row.templateId,
          variant: row.templateVariant,
          historyOverlay: row.historyOverlay,
        },
        templates,
        (path) => readBuffer(path)?.toString('utf8'),
        {
          root,
          readBuffer,
          readSourceBuffer,
          readRollforwardSourceBuffer: (pin) =>
            pinnedSources ? pinnedSources(pin) : readRollforwardGitSource(plan.root, pin),
          readIncrementalSourceBuffer: (pin) => {
            if (pinnedSources) return pinnedSources(pin)
            const key = `${pin.revision}:${pin.path}`
            if (!incrementalSourceCache.has(key))
              incrementalSourceCache.set(key, readIncrementalGitSource(plan.root, pin))
            return incrementalSourceCache.get(key)
          },
          reviewGroupReader: () => group,
          reviewReader: (path) => group.records.get(path),
        },
      )
      demand(issues.length === 0, `staged contract: ${row.path}: ${issues.join('; ')}`)
    }
  }
  inspectShardInventory(root, plan.expected)
  assertReviewRecordSourceUnchanged(group.loadedSource)
}

function pureReadback(root, plan, inventory) {
  const readBuffer = (path) => fileState(root, path, undefined, 'docs/').buffer
  const records = new Map()
  for (const path of plan.records.keys())
    records.set(path, readReviewRecordObject(path, { readBuffer }))
  assertRecordSet(records, plan.records, 'locked pure readback')
  for (const [path, output] of plan.expected)
    demand(readBuffer(path)?.equals(output.bytes), `live physical bytes differ: ${path}`)
  const retired = plan.rollforward ? rollforwardRetirements(plan.root, records, readBuffer) : []
  assertAllPins(records, readBuffer, plan.expectedPins, [], retired)
  assertTopLevelOwners(root, plan.expected)
  if (plan.rollforward) assertRollforwardNativeInputs(readBuffer, records, retired)
  else assertProtectedNative(readBuffer, plan.incremental ? records : undefined)
  inspectShardInventory(root, inventory)
}

/** Capture a fully validated current-generation logical/output proposal without writing. */
export function prepareCurrentReviewTransaction({
  root,
  baseRevision,
  group,
  records,
  outputs,
  retired,
  sourceProfile = 'legacy-current',
}) {
  const base = resolve(root)
  demand(/^[a-f\d]{40}$/.test(baseRevision ?? ''), 'full base commit required')
  demand(!process.env.BIOME_BINARY, 'custom formatter not admitted')
  demand(
    ['legacy-current', 'native-artifact-v1', 'main-incremental-v1', 'main-rollforward-v1'].includes(
      sourceProfile,
    ),
    'unknown source profile',
  )
  const rollforward = sourceProfile === 'main-rollforward-v1'
  const incremental = sourceProfile === 'main-incremental-v1' || rollforward
  const nativeProfile = sourceProfile !== 'legacy-current'
  const expectedPins = rollforward
    ? 4530
    : incremental
      ? incrementalReviewAdmission.afterPins
      : nativeProfile
        ? 2435
        : 2434
  const upgrades = incremental
    ? [...currentReviewStorageUpgrades, incrementalReviewAdmission.sourcePin]
    : currentReviewStorageUpgrades
  if (incremental) {
    assertIncrementalOwnerSet(group.records)
    const cohort = inspectIncrementalCohort(records)
    demand(
      cohort?.rows.every(
        (row) =>
          row.contentReviewStatus === 'content-reviewed' &&
          row.templateCompliance === 'template-compliant',
      ),
      'exact qualified1916 publication required',
    )
  }
  demand(
    group.records.size === 114 &&
      records.size === 114 &&
      (nativeProfile
        ? [...group.storages.values()].filter(Boolean).length ===
            12 + upgrades.filter((pin) => group.storages.get(pin.path)).length &&
          upgrades.every(
            (pin) =>
              !group.storages.get(pin.path) ||
              isDeepStrictEqual(group.storages.get(pin.path).source, pin),
          ) &&
          (!group.storages.get(currentStructuralReviewStorageUpgrade.path) ||
            Boolean(group.storages.get(currentLedgerStorageUpgrade.path))) &&
          group.loadedSource.files.length === 114 + group.loadedSource.artifactSet.length
        : group.loadedSource.files.length === 144 && group.loadedSource.artifactSet.length === 30),
    'exact current group required',
  )
  equal([...records.keys()].sort(), [...group.records.keys()].sort(), 'logical owner set')
  const lifecycle = rollforward
    ? readNativeArtifactRetirements(
        base,
        loadDocumentRegistry({
          manifestPath: join(base, 'docs/phase-governance/document-registry.json'),
        }).registry,
        group,
      )
    : { entries: [], issues: [] }
  demand(lifecycle.issues.length === 0, lifecycle.issues.join('; '))
  const retiredNames = new Set(lifecycle.entries.map((entry) => entry.path))
  const states = new Map(),
    parents = new Map(),
    expected = new Map(),
    referenced = new Set()
  const readBuffer = (path) => {
    if (!states.has(path))
      states.set(
        path,
        fileState(
          base,
          path,
          parents,
          incremental && ['AGENTS.md', 'CLAUDE.md'].includes(path) ? '' : 'docs/',
        ),
      )
    const bytes = states.get(path).buffer
    demand(
      Buffer.isBuffer(bytes) || (rollforward && retiredNames.has(path) && bytes === null),
      `ordinary input missing: ${path}`,
    )
    return bytes
  }
  for (const file of group.loadedSource.files) {
    const bytes = readBuffer(file.path),
      fixed = readGitDocumentSnapshot(base, { revision: baseRevision, path: file.path })
    demand(
      fixed?.mode === '100644' && bytes.equals(fixed.buffer),
      `current review differs from base: ${file.path}`,
    )
    expected.set(file.path, {
      path: file.path,
      kind: file.path.includes('/shards/') ? 'shard' : 'review',
      bytes,
    })
  }
  inspectShardInventory(base, expected)
  assertTopLevelOwners(base, expected)
  for (const record of incremental
    ? [...group.records.values(), ...records.values()]
    : group.records.values())
    for (const row of record.entries) {
      referenced.add(row.path)
      readBuffer(row.path)
    }
  for (const entry of historicalVitestCohort.protectedNative) {
    referenced.add(entry.path)
    readBuffer(entry.path)
  }
  if (incremental)
    for (const path of [
      'AGENTS.md',
      'CLAUDE.md',
      ...(rollforward
        ? loadDocumentRegistry({
            manifestPath: join(base, 'docs/phase-governance/document-registry.json'),
          }).registry.shards.map((part) => `docs/phase-governance/${part.path}`)
        : []),
      // These parts are explicit physical artifacts rather than semantic rows.
      // After first publication, capture them as real inputs for every later
      // transaction; root descriptors alone do not guard prepare-to-write drift.
      ...(group.records.get(incrementalReviewPath).entries.length > 28
        ? incrementalReviewAdmission.registryPartitions.map(
            (part) => `docs/phase-governance/${part.path}`,
          )
        : []),
    ]) {
      referenced.add(path)
      readBuffer(path)
    }
  const inputPins = rollforward
    ? [...group.records.values()].reduce((n, record) => n + record.entries.length, 0)
    : incremental && group.records.get(incrementalReviewPath).entries.length === 28
      ? 2435
      : expectedPins
  assertAllPins(
    group.records,
    readBuffer,
    inputPins,
    rollforward
      ? rollforwardInputRepairs(group.records, records, readBuffer)
      : incremental && inputPins === 2435
        ? incrementalReviewAdmission.inputPinRepairs
        : [],
    lifecycle.entries,
  )
  if (rollforward) assertRollforwardNativeInputs(readBuffer, records, lifecycle.entries)
  else assertProtectedNative(readBuffer, incremental ? records : undefined)
  const seen = new Set()
  demand(
    Array.isArray(outputs) &&
      outputs.length > 0 &&
      Array.isArray(retired) &&
      new Set(retired).size === retired.length,
    'bounded distinct outputs/retirements required',
  )
  for (const output of outputs) {
    demand(!seen.has(output.path) && Buffer.isBuffer(output.bytes), 'duplicate/bad output')
    seen.add(output.path)
    const newRegistryPart =
      incremental &&
      (rollforward
        ? output.path === `docs/phase-governance/${rollforwardRegistryPartition.path}`
        : incrementalReviewAdmission.registryPartitions.some(
            (part) => output.path === `docs/phase-governance/${part.path}`,
          ))
    const oldPhysicalRegistryPart =
      rollforward &&
      incrementalReviewAdmission.registryPartitions.some(
        (part) => output.path === `docs/phase-governance/${part.path}`,
      )
    if (newRegistryPart || oldPhysicalRegistryPart)
      demand(
        output.kind === 'control' && output.bytes.length < 524288,
        `new registry part must be an exact bounded control artifact: ${output.path} (${output.bytes.length})`,
      )
    const administrativeDocument =
      incremental && output.kind === 'administrative' && administrativePaths.has(output.path)
    demand(
      (output.path.startsWith(`${reviewDirRelative}/`) && output.path.endsWith('.json')) ||
        newRegistryPart ||
        oldPhysicalRegistryPart ||
        administrativeDocument ||
        (nativeProfile &&
          output.kind === 'control' &&
          /^docs\/phase-governance\/(routing|document-registry(?:\.(?:ops|lore|phase1|phase2|phase3|testing|phase-governance))?)\.json$/u.test(
            output.path,
          )),
      'review or exact native-candidate control output required',
    )
    if ((output.kind === 'control' && !newRegistryPart) || administrativeDocument) {
      const before = readBuffer(output.path)
      const fixed = administrativeDocument
        ? readAdministrativeSource(base, baseRevision, output.path)
        : readGitDocumentSnapshot(base, { revision: baseRevision, path: output.path })
      demand(
        fixed?.mode === '100644' && before.equals(fixed.buffer),
        'control input differs from base',
      )
    }
    const old = states.get(output.path) ?? fileState(base, output.path, parents, 'docs/')
    demand(
      output.kind === 'shard' || newRegistryPart ? !old.buffer : old.buffer,
      `output generation collision or missing owner: ${output.path}`,
    )
    states.set(output.path, old)
    expected.set(output.path, { ...output, bytes: Buffer.from(output.bytes) })
  }
  for (const path of retired) {
    demand(
      path.includes('/shards/') && states.get(path)?.buffer && !seen.has(path),
      `exact prior shard retirement required: ${path}`,
    )
    expected.delete(path)
  }
  const sourcePins = new Map(
    [...group.storages].filter(([, v]) => v).map(([p, v]) => [p, structuredClone(v.source)]),
  )
  for (const pin of upgrades) {
    const upgradeOutput = outputs.find((o) => o.path === pin.path && o.kind === 'manifest')
    if (group.storages.get(pin.path) || !upgradeOutput) continue
    equal(
      JSON.parse(upgradeOutput.bytes)._reviewStorage.source,
      pin,
      'one exact admitted new review source pin',
    )
    const source = readGitDocumentSnapshot(base, pin)
    demand(
      source?.mode === '100644' &&
        source.gitObject === pin.gitObject &&
        sha(source.buffer) === pin.sha256,
      'new review source must resolve in real Git',
    )
    sourcePins.set(pin.path, structuredClone(pin))
  }
  const recordsCopy = new Map([...records].map(([p, v]) => [p, structuredClone(v)]))
  const outputsCopy = outputs.map((o) => ({ ...o, bytes: Buffer.from(o.bytes) }))
  const afterReader = (path) => expected.get(path)?.bytes ?? readBuffer(path)
  const afterRetired = rollforward ? rollforwardRetirements(base, recordsCopy, afterReader) : []
  assertAllPins(recordsCopy, afterReader, expectedPins, [], afterRetired)
  if (rollforward) assertRollforwardNativeInputs(afterReader, recordsCopy, afterRetired)
  else assertProtectedNative(afterReader, incremental ? recordsCopy : undefined)
  assertReviewRecordSourceUnchanged(group.loadedSource)
  assertStates(base, states, parents)
  const handle = {
    kind: 'current-review-transaction/1.0.0',
    base: baseRevision,
    outputs: outputsCopy.map((o) => ({
      path: o.path,
      kind: o.kind,
      sha256: sha(o.bytes),
      bytes: o.bytes.length,
    })),
    retired: retired.map((path) => ({ path, sha256: sha(states.get(path).buffer) })),
    finalPhysicalFiles: expected.size,
    creditGranted: 0,
  }
  capabilities.set(handle, {
    root: base,
    incremental,
    rollforward,
    expectedPins,
    states,
    parents,
    expected,
    outputs: outputsCopy,
    retired: [...retired],
    records: recordsCopy,
    referenced,
    sourcePins,
    changedControlPaths: new Set(
      currentNativeControlAdmissions
        .filter(
          (entry) =>
            outputsCopy.some((output) => output.path === entry.path) ||
            recordsCopy.get(entry.reviewRecord).entries[entry.index].afterSha256 !==
              group.records.get(entry.reviewRecord).entries[entry.index].afterSha256,
        )
        .map((entry) => entry.path),
    ),
    public: structuredClone(handle),
  })
  return handle
}
/** Explicit write mode and the original, unmodified in-process capability are mandatory. */
export function publishCurrentReviewTransaction(handle, { allowWrite = false } = {}) {
  const plan = capabilities.get(handle)
  demand(
    plan && isDeepStrictEqual(handle, plan.public),
    'actual unmodified prepare capability required',
  )
  demand(allowWrite === true, 'explicit Owner administrative-write mode required')
  const { root, states, parents, expected, outputs, retired } = plan
  const base = handle.base
  assertStates(root, states, parents)
  assertTopLevelOwners(root, expected)
  const oldInventory = new Map(
    [...states]
      .filter(([path, state]) => path.includes('/shards/') && state.buffer)
      .map(([path, state]) => [path, { path, kind: 'shard', bytes: state.buffer }]),
  )
  inspectShardInventory(root, oldInventory)
  const lockPath = `${reviewDirRelative}/.storage.lock`
  demand(!fileState(root, lockPath, parents).buffer, 'publication lock already present')
  const stage = mkdtempSync(join(root, reviewDirRelative, '.current-review-stage-'))
  try {
    writeFileSync(
      join(root, lockPath),
      `${canonical({ kind: handle.kind, stage, base, outputs: handle.outputs, retired: handle.retired })}\n`,
      { flag: 'wx' },
    )
  } catch (error) {
    rmSync(stage, { recursive: true })
    throw error
  }
  const ownedLock = new Map([[lockPath, fileState(root, lockPath, parents)]])
  const recovery = {
    kind: handle.kind,
    state: 'locked',
    base,
    before: [],
    written: [],
    retired: [],
  }
  const save = () =>
    writeFileSync(join(stage, 'recovery.json'), `${JSON.stringify(recovery, null, 2)}\n`)
  const liveInventory = new Map(oldInventory)
  const guard = () => {
    assertStates(root, ownedLock, parents)
    assertStates(root, states, parents)
    inspectShardInventory(root, liveInventory)
    assertTopLevelOwners(root, expected)
  }
  const stageWrite = (path, bytes) => {
    const dest = join(stage, 'after', path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, bytes, { flag: 'wx' })
  }
  try {
    save()
    guard()
    for (const path of new Set([...outputs.map((entry) => entry.path), ...retired])) {
      const bytes = states.get(path).buffer
      if (!bytes) continue
      const dest = join(stage, 'before', path)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, bytes, { flag: 'wx' })
      recovery.before.push({ path, sha256: sha(bytes) })
    }
    save()
    // Stage the complete captured review group and actual referenced documents /
    // protected native inputs, not a hash-only or read-cache surrogate.
    for (const path of plan.referenced)
      if (!expected.has(path) && !retired.includes(path) && states.get(path).buffer)
        stageWrite(path, states.get(path).buffer)
    for (const output of expected.values()) stageWrite(output.path, output.bytes)
    publicReadback(join(stage, 'after'), plan)
    guard()
    for (const output of outputs) {
      guard()
      const dest = join(stage, 'install', output.path)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, output.bytes, { flag: 'wx' })
      checkOrdinaryPath(root, dirname(output.path), 'directory', parents, 'docs/')
      mkdirSync(dirname(join(root, output.path)), { recursive: true })
      checkOrdinaryPath(root, dirname(output.path), 'directory', parents, 'docs/')
      renameSync(dest, join(root, output.path))
      states.set(output.path, fileState(root, output.path, parents, 'docs/'))
      if (output.kind === 'shard') liveInventory.set(output.path, output)
      recovery.written.push(output.path)
      save()
    }
    pureReadback(root, plan, liveInventory)
    guard()
    // Retire each complete generation as one directory rename. Removing its leaves
    // individually leaves an empty sibling that the next inventory guard must reject.
    for (const directory of new Set(retired.map((path) => dirname(path)))) {
      guard()
      checkOrdinaryPath(root, directory, 'directory', parents)
      const members = retired.filter((path) => dirname(path) === directory)
      equal(
        readdirSync(join(root, directory)).sort(),
        members.map((path) => path.split('/').at(-1)).sort(),
        'complete retired generation',
      )
      const destination = join(stage, 'retired', directory)
      mkdirSync(dirname(destination), { recursive: true })
      renameSync(join(root, directory), destination)
      for (const path of members) {
        states.set(path, { identity: null, buffer: null })
        liveInventory.delete(path)
        recovery.retired.push(path)
      }
      parents.delete(join(root, directory))
      save()
    }
    pureReadback(root, plan, expected)
    guard()
    assertStates(root, ownedLock, parents)
    assertStates(root, states, parents)
    inspectShardInventory(root, expected)
    recovery.state = 'verified'
    save()
  } catch (error) {
    throw new Error(
      `current-review-transaction: transaction failed; lock+before+staging retained at ${stage}: ${error.message}`,
    )
  }
  // The verified transaction retains recovery through lock removal. Cleanup after
  // release cannot turn a verified publication into a failed, unrecoverable write.
  assertStates(root, ownedLock, parents)
  rmSync(join(root, lockPath))
  capabilities.delete(handle)
  let cleanupPending = false,
    cleanupError
  try {
    rmSync(stage, { recursive: true })
  } catch (error) {
    cleanupPending = true
    cleanupError = error.message
  }
  return {
    kind: handle.kind,
    written: recovery.written.length,
    retired: recovery.retired.length,
    finalPhysicalFiles: expected.size,
    finalManifests: plan.sourcePins.size,
    finalShards: [...expected.values()].filter((o) => o.kind === 'shard').length,
    allAfterPinsExact: plan.expectedPins,
    protectedNative: plan.rollforward
      ? { oldNative1933: 1933, currentNative142: 142, retainedHistoricalRetirements: 6 }
      : plan.incremental
        ? 1933
        : 302,
    ...(plan.rollforward ? { activeAfterPinsExact: 4524, retainedHistoricalPins: 6 } : {}),
    creditGranted: 0,
    lockReleased: true,
    sourcePinsPreserved: true,
    nestedExistingFieldsPreserved: true,
    cleanupPending,
    ...(cleanupPending ? { recoveryStage: stage, cleanupError } : {}),
  }
}
