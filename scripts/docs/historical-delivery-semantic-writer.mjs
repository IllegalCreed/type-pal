// S34 current-generation update. No legacy writer admission is widened.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { historicalDeliveryCohort } from './historical-document-delivery-cohort.mjs'
import {
  historicalDeliveryContract,
  historicalDocumentDeliveryIssues,
} from './historical-document-delivery-native.mjs'
import {
  prepareCurrentReviewTransaction,
  publishCurrentReviewTransaction,
} from './review-current-generation-transaction.mjs'
import {
  hasLossyJsonValue,
  loadReviewRecordFromGit,
  loadReviewRecords,
  reviewDirRelative,
} from './review-record-storage.mjs'
import { biomeFormat, packReviewStorageRecord } from './review-record-storage-packing.mjs'
import { canonicalTerminalJson, parseTerminalJson } from './terminal-json.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const hash = (value) => digest(canonicalTerminalJson(value))
const demand = (condition, message) => {
  if (!condition) throw new Error(`historical-delivery-writer: ${message}`)
}
const mutable = new Set([
  'docType',
  'templateId',
  'templateVariant',
  'templateVersion',
  'historyOverlay',
  'artifactOnly',
  'documentStatus',
  'historicalRole',
  'coreConclusion',
  'owner',
  'readMethod',
  'reviewedLines',
  'truthAnchors',
  'primarySource',
  'legalInputs',
  'businessOracle',
  'stopLine',
  'nextStep',
  'sourceGitRevision',
  'history',
  'revision',
  'evidence',
])
const review = (name) => `${reviewDirRelative}/20261017-${name}.json`
const r92 = review('r92-phase-governance-artifacts')
const r94 = review('r94-final-machine-artifacts')
const owners = [
  review('r89-ops-evidence-artifacts'),
  review('r90-ops-evidence-artifacts'),
  review('r91-ops-evidence-artifacts'),
  r94,
]
const capabilities = new WeakMap()

/** Reject any widening, fake promotion or erased history before touching the storage layer. */
export function validateHistoricalDeliveryChanges(changes, records) {
  demand(
    Array.isArray(changes) && changes.length === historicalDeliveryCohort.length,
    'exact212 changes required',
  )
  const byPath = new Map(changes.map((change) => [change.path, change]))
  demand(byPath.size === 212, 'duplicate target')
  let corrections = 0
  for (const binding of historicalDeliveryCohort) {
    const change = byPath.get(binding.path)
    demand(
      change?.reviewRecord === binding.reviewRecord && change.index === binding.reviewIndex,
      `exact fixed row binding required: ${binding.path}`,
    )
    const before = records.get(binding.reviewRecord)?.entries[binding.reviewIndex],
      after = change.after
    demand(
      before?.path === binding.path && change.beforeEntrySha256 === hash(before),
      `current before row differs: ${binding.path}`,
    )
    demand(
      after?.path === binding.path &&
        !hasLossyJsonValue(after) &&
        !isDeepStrictEqual(before, after),
      'nonempty lossless row delta required',
    )
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)]))
      if (!mutable.has(key))
        demand(
          isDeepStrictEqual(before[key], after[key]),
          `immutable field ${key}: ${binding.path}`,
        )
    for (const key of ['history', 'provenance'])
      if (before[key] !== undefined)
        demand(
          Array.isArray(after[key]) &&
            isDeepStrictEqual(after[key].slice(0, before[key].length), before[key]),
          'history/provenance prefix changed',
        )
    demand(
      after.revision &&
        isDeepStrictEqual(
          Object.fromEntries(
            Object.entries(before.revision).filter(([k]) => !['currentSha', 'history'].includes(k)),
          ),
          Object.fromEntries(
            Object.entries(after.revision).filter(([k]) => !['currentSha', 'history'].includes(k)),
          ),
        ),
      'revision immutable fields changed',
    )
    demand(
      Array.isArray(after.revision.history) &&
        isDeepStrictEqual(
          after.revision.history.slice(0, before.revision.history.length),
          before.revision.history,
        ),
      'revision history changed',
    )
    if (after.sourceGitRevision !== before.sourceGitRevision) {
      corrections++
      const errata = after.history
        ?.slice(before.history?.length ?? 0)
        .filter((e) => e.kind === 'historical-source-revision-erratum')
      demand(
        errata?.length === 1 &&
          errata[0].previousSourceGitRevision === before.sourceGitRevision &&
          errata[0].actualSourceGitRevision === binding.historicalSourceGitRevision &&
          errata[0].sourceSha256Unchanged === before.sourceSha256,
        'explicit old-source pointer erratum required',
      )
    }
  }
  return { targets: 212, sourceRevisionErrata: corrections, creditGranted: 0 }
}

function buildProposal(base, plan, group, readBuffer) {
  const validated = validateHistoricalDeliveryChanges(plan.changes, group.records)
  const records = new Map([...group.records].map(([p, v]) => [p, structuredClone(v)]))
  const gitCache = new Map(),
    git = (pin) => {
      const key = `${pin.revision}:${pin.path}`
      if (!gitCache.has(key)) gitCache.set(key, readGitDocumentSnapshot(base, pin))
      return gitCache.get(key)
    }
  const read = (p) => readBuffer(p).toString('utf8')
  const registry = parseTerminalJson(readBuffer('docs/phase-governance/templates/registry.json'))
  const template = registry.types.find(
      (t) => t.templateId === historicalDeliveryContract.templateId,
    ),
    contract = template?.variants[historicalDeliveryContract.variant]
  for (const change of plan.changes)
    records.get(change.reviewRecord).entries[change.index] = structuredClone(change.after)
  for (const binding of historicalDeliveryCohort) {
    const source = git({ path: binding.path, revision: binding.historicalSourceGitRevision })
    demand(
      source?.mode === '100644' &&
        source.gitObject === binding.historicalSourceGitObject &&
        digest(source.buffer) === binding.historicalSourceSha256,
      `actual historical Git source mismatch: ${binding.path}`,
    )
    const issues = historicalDocumentDeliveryIssues(
      {
        path: binding.path,
        templateId: historicalDeliveryContract.templateId,
        variant: historicalDeliveryContract.variant,
        historyOverlay: false,
      },
      template,
      contract,
      read,
      { readBuffer, readSourceBuffer: git, reviewReader: (p) => records.get(p) },
    )
    demand(issues?.length === 0, `current native contract: ${binding.path}: ${issues?.join('; ')}`)
  }
  const outputs = [],
    retired = []
  const pack = (path) => {
    const storage = group.storages.get(path)
    demand(storage && owners.includes(path), 'admitted current sharded source required')
    const result = packReviewStorageRecord({
      logicalPath: path,
      record: records.get(path),
      sourcePin: storage.source,
      context: { repoRoot: base },
    })
    outputs.push(...result.outputs)
    retired.push(...storage.shards.map((s) => `${reviewDirRelative}/${s.path}`))
  }
  const updateEdge = (owner, index, path, bytes) => {
    const row = records.get(owner).entries[index]
    demand(
      row?.path === path && row.afterSha256 === digest(readBuffer(path)),
      `original control before pin differs: ${owner}#${index}`,
    )
    const previous = row.afterSha256
    row.afterSha256 = digest(bytes)
    row.maintenanceDeltas ??= []
    row.maintenanceDeltas.push({
      date: '2026-10-24',
      task: 'DOCS-NATIVE-JSON-1/S34',
      beforeSha256: previous,
      afterSha256: row.afterSha256,
      scope:
        'Current-generation historical receipt governance body only; historical source pins unchanged',
      newSemanticCredit: 0,
      newTemplateMigrationCredit: 0,
      runtimeExecutionPerformed: false,
      historicClaimsReexecuted: false,
    })
  }
  for (const [i, path] of owners.slice(0, 3).entries()) {
    pack(path)
    updateEdge(r92, 20 + i, path, outputs.find((o) => o.path === path).bytes)
  }
  const controlBytes = biomeFormat(records.get(r92), r92, { repoRoot: base })
  demand(
    controlBytes.length < 1_048_576 &&
      isDeepStrictEqual(parseTerminalJson(controlBytes), records.get(r92)) &&
      JSON.stringify(parseTerminalJson(controlBytes)) === JSON.stringify(records.get(r92)),
    'control format/value mismatch',
  )
  outputs.push({ path: r92, kind: 'review', bytes: controlBytes })
  updateEdge(r94, 6, r92, controlBytes)
  pack(r94)
  const rank = (o) => (o.kind === 'shard' ? 0 : o.path === r94 ? 3 : o.path === r92 ? 2 : 1)
  outputs.sort((a, b) => rank(a) - rank(b))
  const seen = new Set(outputs.map((o) => o.path))
  demand(
    retired.every((p) => !seen.has(p)),
    'new immutable generation must differ',
  )
  return { validated, records, outputs, retired }
}

/** Read-only, exact current source group -> complete owned proposal. No status promotion. */
export function prepareHistoricalDeliveryUpdate({ root, plan, planSha256 }) {
  demand(
    plan?.kind === 'historical-delivery-semantic-plan/1.0.0' &&
      plan.creditGranted === 0 &&
      hash(plan) === planSha256,
    'exact zero-credit plan required',
  )
  const base = resolve(root)
  const group = loadReviewRecords({ root: base })
  const { validated, records, outputs, retired } = buildProposal(base, plan, group, (p) =>
    readFileSync(join(base, p)),
  )
  const transaction = prepareCurrentReviewTransaction({
    root: base,
    baseRevision: plan.baseRevision,
    group,
    records,
    outputs,
    retired,
  })
  const handle = {
    kind: 'historical-delivery-update/1.0.0',
    baseRevision: plan.baseRevision,
    planSha256,
    ...validated,
    physical: structuredClone(transaction),
  }
  capabilities.set(handle, { transaction, public: structuredClone(handle) })
  return handle
}

/** Exact whole-group reconstruction; mixed/foreign states never count as an idempotent publication. */
export function inspectPublishedHistoricalDeliveryUpdate({ root, plan, planSha256 }) {
  demand(
    plan?.kind === 'historical-delivery-semantic-plan/1.0.0' &&
      plan.creditGranted === 0 &&
      hash(plan) === planSha256,
    'exact zero-credit plan required',
  )
  const base = resolve(root),
    current = loadReviewRecords({ root: base }),
    before = { records: new Map(), storages: new Map() }
  const cache = new Map(),
    readBuffer = (path) => {
      if (!cache.has(path)) {
        const snapshot = readGitDocumentSnapshot(base, { path, revision: plan.baseRevision })
        demand(snapshot?.mode === '100644', `base JSON missing: ${path}`)
        cache.set(path, snapshot.buffer)
      }
      return cache.get(path)
    }
  for (const path of current.records.keys())
    before.records.set(
      path,
      loadReviewRecordFromGit({ root: base, revision: plan.baseRevision, logicalPath: path })
        .record,
    )
  for (const path of owners)
    before.storages.set(path, parseTerminalJson(readBuffer(path))._reviewStorage)
  const proposal = buildProposal(base, plan, before, readBuffer)
  for (const [path, record] of proposal.records)
    demand(
      isDeepStrictEqual(current.records.get(path), record) &&
        JSON.stringify(current.records.get(path)) === JSON.stringify(record),
      `published whole-group differs: ${path}`,
    )
  for (const output of proposal.outputs)
    demand(
      readFileSync(join(base, output.path)).equals(output.bytes),
      `published output differs: ${output.path}`,
    )
  for (const path of owners)
    demand(
      isDeepStrictEqual(current.storages.get(path)?.source, before.storages.get(path).source),
      'published historical source pin changed',
    )
  for (const record of current.records.values())
    for (const row of record.entries)
      demand(
        digest(readFileSync(join(base, row.path))) === row.afterSha256,
        `published after pin changed: ${row.path}`,
      )
  return { state: 'published', targets: 212, repositoryWrites: 0, creditGranted: 0 }
}

/** Owner write capability. The implementation round uses only isolated trees. */
export function publishHistoricalDeliveryUpdate(handle, { allowWrite = false } = {}) {
  const plan = capabilities.get(handle)
  demand(plan && isDeepStrictEqual(plan.public, handle), 'unmodified prepare capability required')
  const result = publishCurrentReviewTransaction(plan.transaction, { allowWrite })
  capabilities.delete(handle)
  return { ...result, targets: 212, newSemanticCredit: 0, newTemplateMigrationCredit: 0 }
}
