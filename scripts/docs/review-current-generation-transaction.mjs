// Shared physical transaction only. Semantic callers must validate their own closed admission.
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
import {
  currentLedgerStorageUpgrade,
  currentReviewStorageUpgrades,
  currentStructuralReviewStorageUpgrade,
} from './current-review-ledger-storage-admission.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { historicalVitestCohort } from './historical-vitest-cohort.mjs'
import {
  assertReviewRecordSourceUnchanged,
  loadReviewRecords,
  readReviewRecordObject,
  reviewDirRelative,
} from './review-record-storage.mjs'
import { checkOrdinaryPath, fileState, inspectShardInventory } from './review-record-storage-io.mjs'

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
const canonical = (value) => JSON.stringify(value)
function assertStates(root, states, parents) {
  for (const [path, expected] of parents) {
    const stat = lstatSync(path)
    demand(stat.isDirectory() && !stat.isSymbolicLink(), `parent not ordinary: ${path}`)
    equal({ dev: stat.dev, ino: stat.ino, mode: stat.mode }, expected, `parent changed: ${path}`)
  }
  for (const [path, expected] of states) {
    const actual = fileState(root, path, undefined, 'docs/')
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

function assertAllPins(records, readBuffer, expectedPins = 2434) {
  let count = 0
  for (const [owner, record] of records)
    for (const row of record.entries) {
      const bytes = readBuffer(row.path)
      demand(
        Buffer.isBuffer(bytes) && row.afterSha256 === sha(bytes),
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

function assertProtectedNative(readBuffer) {
  demand(
    historicalVitestCohort.protectedNative.length === 302,
    'exact302 protected native inputs required',
  )
  for (const entry of historicalVitestCohort.protectedNative)
    demand(sha(readBuffer(entry.path)) === entry.sha256, `protected native changed: ${entry.path}`)
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
  const readBuffer = (path) => fileState(root, path, undefined, 'docs/').buffer
  for (const [path, output] of plan.expected)
    demand(readBuffer(path)?.equals(output.bytes), `staged physical bytes differ: ${path}`)
  assertAllPins(group.records, readBuffer, plan.expectedPins)
  assertProtectedNative(readBuffer)
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
  assertAllPins(records, readBuffer, plan.expectedPins)
  assertTopLevelOwners(root, plan.expected)
  assertProtectedNative(readBuffer)
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
  demand(['legacy-current', 'native-artifact-v1'].includes(sourceProfile), 'unknown source profile')
  const nativeProfile = sourceProfile === 'native-artifact-v1'
  const expectedPins = nativeProfile ? 2435 : 2434
  demand(
    group.records.size === 114 &&
      records.size === 114 &&
      (nativeProfile
        ? [...group.storages.values()].filter(Boolean).length ===
            12 +
              currentReviewStorageUpgrades.filter((pin) => group.storages.get(pin.path)).length &&
          currentReviewStorageUpgrades.every(
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
  const states = new Map(),
    parents = new Map(),
    expected = new Map(),
    referenced = new Set()
  const readBuffer = (path) => {
    if (!states.has(path)) states.set(path, fileState(base, path, parents, 'docs/'))
    const bytes = states.get(path).buffer
    demand(Buffer.isBuffer(bytes), `ordinary input missing: ${path}`)
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
  for (const record of group.records.values())
    for (const row of record.entries) {
      referenced.add(row.path)
      readBuffer(row.path)
    }
  for (const entry of historicalVitestCohort.protectedNative) {
    referenced.add(entry.path)
    readBuffer(entry.path)
  }
  assertAllPins(group.records, readBuffer, expectedPins)
  assertProtectedNative(readBuffer)
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
    demand(
      (output.path.startsWith(`${reviewDirRelative}/`) && output.path.endsWith('.json')) ||
        (nativeProfile &&
          output.kind === 'control' &&
          /^docs\/phase-governance\/(routing|document-registry(?:\.(?:ops|lore|phase1|phase2|phase3|testing|phase-governance))?)\.json$/u.test(
            output.path,
          )),
      'review or exact native-candidate control output required',
    )
    if (output.kind === 'control') {
      const before = readBuffer(output.path)
      const fixed = readGitDocumentSnapshot(base, { revision: baseRevision, path: output.path })
      demand(
        fixed?.mode === '100644' && before.equals(fixed.buffer),
        'control input differs from base',
      )
    }
    const old = states.get(output.path) ?? fileState(base, output.path, parents)
    demand(
      output.kind === 'shard' ? !old.buffer : old.buffer,
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
  for (const pin of currentReviewStorageUpgrades) {
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
  assertAllPins(recordsCopy, afterReader, expectedPins)
  assertProtectedNative(afterReader)
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
    expectedPins,
    states,
    parents,
    expected,
    outputs: outputsCopy,
    retired: [...retired],
    records: recordsCopy,
    referenced,
    sourcePins,
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
    // The staging tree contains all144 review files plus the actual referenced
    // documents/protected native inputs, not a hash-only or read-cache surrogate.
    for (const path of plan.referenced)
      if (!expected.has(path) && !retired.includes(path)) stageWrite(path, states.get(path).buffer)
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
    protectedNative: 302,
    creditGranted: 0,
    lockReleased: true,
    sourcePinsPreserved: true,
    nestedExistingFieldsPreserved: true,
    cleanupPending,
    ...(cleanupPending ? { recoveryStage: stage, cleanupError } : {}),
  }
}
