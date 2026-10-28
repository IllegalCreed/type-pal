// Author-only current-ledger metadata proposals. The shared transaction owns storage safety.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { currentReviewLedgerAdmissions } from './current-review-ledger-admission.mjs'
import { currentLedgerStorageUpgrade } from './current-review-ledger-storage-admission.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { summarizeDocumentRegistry } from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  prepareCurrentReviewTransaction,
  publishCurrentReviewTransaction,
} from './review-current-generation-transaction.mjs'
import { hasLossyJsonValue, loadReviewRecords } from './review-record-storage.mjs'
import { biomeFormat, packReviewStorageRecord } from './review-record-storage-packing.mjs'
import { canonicalTerminalJson, parseTerminalJson } from './terminal-json.mjs'

const demand = (value, reason) => {
  if (!value) throw new Error(`current-ledger-candidate: ${reason}`)
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const currentLedgerEntryHash = (value) => hash(canonicalTerminalJson(value))
const handles = new WeakMap()
const mutable = new Set([
  'docType',
  'templateId',
  'templateVariant',
  'templateVersion',
  'template',
  'historyOverlay',
  'artifactOnly',
  'artifactEnvelope',
  'documentStatus',
  'coreConclusion',
  'owner',
  'readMethod',
  'reviewDepth',
  'reviewedLines',
  'truthAnchors',
  'legalInputs',
  'businessOracle',
  'evidence',
  'readDomain',
  'fieldRoles',
  'historyBoundary',
  'publicCallers',
  'versionScope',
  'dedupe',
  'unresolved',
  'stopLine',
  'nextStep',
  'history',
  'provenance',
  'userVisibleBeforeAfter',
])

/** Status, acceptance, source identities, corrections and all existing history stay immutable. */
export function validateCurrentLedgerChanges(changes, records) {
  demand(
    Array.isArray(changes) && changes.length > 0 && changes.length <= 111,
    'bounded nonempty subset of111 required',
  )
  demand(new Set(changes.map((c) => c.path)).size === changes.length, 'duplicate path')
  for (const c of changes) {
    const b = currentReviewLedgerAdmissions.find((entry) => entry.path === c.path)
    demand(
      b && c.reviewRecord === b.reviewRecord && c.index === b.index,
      `unadmitted path or position: ${c.path}`,
    )
    const before = records.get(b.reviewRecord)?.entries[b.index]
    demand(
      before?.path === c.path && currentLedgerEntryHash(before) === c.beforeEntrySha256,
      `before row changed: ${c.path}`,
    )
    demand(c.after && !hasLossyJsonValue(c.after), 'lossless complete after row required')
    for (const key of new Set([...Object.keys(before), ...Object.keys(c.after)]))
      if (!mutable.has(key))
        demand(same(before[key], c.after[key]), `immutable field ${key}: ${c.path}`)
    for (const key of ['history', 'provenance']) {
      const previous = before[key] ?? []
      demand(
        Array.isArray(c.after[key]) && same(c.after[key].slice(0, previous.length), previous),
        `${key} prefix changed: ${c.path}`,
      )
    }
    if (!same(c.after, before))
      demand(
        c.after.history
          .slice(before.history?.length ?? 0)
          .some(
            (event) =>
              event.kind === 'current-ledger-candidate' &&
              event.priorEntrySha256 === c.beforeEntrySha256,
          ),
        'explicit prior row locator required',
      )
  }
  return { targets: changes.length, creditGranted: 0 }
}

function projectControls(root, changes, readBuffer) {
  const outputs = [],
    all = [],
    registryPath = 'docs/phase-governance/document-registry.json',
    manifest = parseTerminalJson(readBuffer(registryPath)),
    targets = new Map(changes.map((c) => [c.path, c.after]))
  for (const descriptor of manifest.shards) {
    const path = `docs/phase-governance/${descriptor.path}`,
      before = readBuffer(path),
      shard = parseTerminalJson(before)
    demand(hash(before) === descriptor.sha256, 'registry descriptor mismatch')
    for (const row of shard.entries) {
      const after = targets.get(row.path)
      if (after) {
        for (const key of [
          'docType',
          'templateId',
          'templateVariant',
          'templateVersion',
          'historyOverlay',
          'artifactOnly',
          'reviewDepth',
        ])
          row[key] = after[key]
        if (Object.hasOwn(row, 'artifactEnvelope')) row.artifactEnvelope = false
      }
      all.push(row)
    }
    const bytes = biomeFormat(shard, path, { repoRoot: root })
    demand(same(parseTerminalJson(bytes), shard), 'registry formatter changed value')
    if (!bytes.equals(before)) outputs.push({ path, kind: 'control', bytes })
    descriptor.sha256 = hash(bytes)
  }
  manifest.summary = summarizeDocumentRegistry(all)
  const bytes = biomeFormat(manifest, registryPath, { repoRoot: root })
  if (!bytes.equals(readBuffer(registryPath)))
    outputs.push({ path: registryPath, kind: 'control', bytes })
  const path = 'docs/phase-governance/routing.json',
    routing = parseTerminalJson(readBuffer(path))
  for (const c of changes) {
    const rows = routing.migratedDocuments.filter((r) => r.path === c.path)
    demand(rows.length <= 1, 'duplicate route')
    const route = {
      path: c.path,
      templateId: c.after.templateId,
      variant: c.after.templateVariant,
      historyOverlay: false,
    }
    if (rows.length) Object.assign(rows[0], route)
    else routing.migratedDocuments.push(route)
  }
  const routeBytes = biomeFormat(routing, path, { repoRoot: root })
  if (!routeBytes.equals(readBuffer(path)))
    outputs.push({ path, kind: 'control', bytes: routeBytes })
  return outputs
}

export function prepareCurrentLedgerCandidate({ root, plan, planSha256 }) {
  demand(
    plan?.kind === 'current-ledger-candidate/1.0.0' &&
      plan.creditGranted === 0 &&
      /^\d{4}-\d{2}-\d{2}$/u.test(plan.date ?? '') &&
      currentLedgerEntryHash(plan) === planSha256,
    'exact zero-credit plan fingerprint required',
  )
  root = resolve(root)
  const readBuffer = (path) => readFileSync(join(root, path)),
    group = loadReviewRecords({ root }),
    validated = validateCurrentLedgerChanges(plan.changes, group.records),
    records = new Map([...group.records].map(([path, record]) => [path, structuredClone(record)])),
    dirty = new Set(),
    retired = []
  for (const c of plan.changes) {
    if (!same(c.after, records.get(c.reviewRecord).entries[c.index])) dirty.add(c.reviewRecord)
    records.get(c.reviewRecord).entries[c.index] = structuredClone(c.after)
  }
  const outputs = projectControls(root, plan.changes, readBuffer)
  let previous = -1
  while (previous !== dirty.size) {
    previous = dirty.size
    for (const [owner, r] of records)
      if (
        r.entries.some(
          (entry) => dirty.has(entry.path) || outputs.some((o) => o.path === entry.path),
        )
      )
        dirty.add(owner)
  }
  const built = new Set(),
    building = new Set(),
    administrativeEdges = []
  function build(owner) {
    if (built.has(owner)) return
    demand(!building.has(owner), 'dependency cycle')
    building.add(owner)
    const record = records.get(owner)
    for (const [index, row] of record.entries.entries()) {
      if (dirty.has(row.path)) build(row.path)
      const output = outputs.find((o) => o.path === row.path)
      if (!output) continue
      const before = group.records.get(owner).entries[index]
      demand(
        before.afterSha256 === hash(readBuffer(row.path)),
        'original administrative pin mismatch',
      )
      const afterSha256 = hash(output.bytes)
      if (afterSha256 === before.afterSha256) continue
      row.afterSha256 = afterSha256
      row.maintenanceDeltas ??= []
      row.maintenanceDeltas.push({
        date: plan.date,
        task: 'DOCS-FULL-TEMPLATE-1/current-ledger-candidate',
        beforeSha256: before.afterSha256,
        afterSha256,
        newSemanticCredit: 0,
        newTemplateMigrationCredit: 0,
        runtimeCredit: false,
      })
      administrativeEdges.push({
        owner,
        index,
        path: row.path,
        beforeSha256: before.afterSha256,
        afterSha256,
      })
    }
    const storage = group.storages.get(owner),
      upgrade = !storage && owner === currentLedgerStorageUpgrade.path
    if (storage || upgrade) {
      outputs.push(
        ...packReviewStorageRecord({
          logicalPath: owner,
          record,
          sourcePin: storage?.source ?? currentLedgerStorageUpgrade,
          context: { repoRoot: root },
        }).outputs,
      )
      if (storage)
        retired.push(...storage.shards.map((s) => `docs/phase-governance/reviews/${s.path}`))
    } else {
      const bytes = biomeFormat(record, owner, { repoRoot: root })
      demand(same(parseTerminalJson(bytes), record), 'review formatter changed value')
      outputs.push({ path: owner, kind: 'review', bytes })
    }
    building.delete(owner)
    built.add(owner)
  }
  for (const owner of [...dirty].sort()) build(owner)
  const byPath = new Map(outputs.map((o) => [o.path, o.bytes])),
    view = (path) => byPath.get(path) ?? readBuffer(path),
    templates = parseTerminalJson(view('docs/phase-governance/templates/registry.json')),
    cache = new Map(),
    source = (pin) => {
      const key = `${pin.revision}:${pin.path}`
      if (!cache.has(key)) cache.set(key, readGitDocumentSnapshot(root, pin))
      return cache.get(key)
    },
    virtualGroup = { ...group, records }
  // Read planned manifests/shards through the real materializer before acquiring any write capability.
  for (const c of plan.changes) {
    const issues = checkMigratedDocument(
      {
        path: c.path,
        templateId: c.after.templateId,
        variant: c.after.templateVariant,
        historyOverlay: false,
      },
      templates,
      (path) => view(path).toString('utf8'),
      { readBuffer: view, readSourceBuffer: source, reviewGroupReader: () => virtualGroup },
    )
    demand(issues.length === 0, `${c.path}: ${issues.join('; ')}`)
  }
  const transaction = prepareCurrentReviewTransaction({
    root,
    baseRevision: plan.baseRevision,
    group,
    records,
    outputs,
    retired,
    sourceProfile: 'native-artifact-v1',
  })
  const handle = {
    kind: plan.kind,
    baseRevision: plan.baseRevision,
    planSha256,
    ...validated,
    administrativeEdges,
    transaction: structuredClone(transaction),
  }
  handles.set(handle, { transaction, public: structuredClone(handle) })
  return handle
}

export function writeCurrentLedgerCandidate(handle) {
  const state = handles.get(handle)
  demand(state && same(handle, state.public), 'unmodified in-process prepare capability required')
  const result = publishCurrentReviewTransaction(state.transaction, { allowWrite: true })
  handles.delete(handle)
  return { ...result, targets: handle.targets, newSemanticCredit: 0, newTemplateMigrationCredit: 0 }
}
